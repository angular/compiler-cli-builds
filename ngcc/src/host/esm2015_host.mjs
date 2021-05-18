/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { absoluteFromSourceFile } from '../../../src/ngtsc/file_system';
import { ClassMemberKind, isConcreteDeclaration, isDecoratorIdentifier, isNamedClassDeclaration, isNamedFunctionDeclaration, isNamedVariableDeclaration, KnownDeclaration, reflectObjectLiteral, TypeScriptReflectionHost } from '../../../src/ngtsc/reflection';
import { isWithinPackage } from '../analysis/util';
import { findAll, getNameText, hasNameIdentifier, isDefined, stripDollarSuffix } from '../utils';
import { isSwitchableVariableDeclaration, PRE_R3_MARKER } from './ngcc_host';
import { stripParentheses } from './utils';
export const DECORATORS = 'decorators';
export const PROP_DECORATORS = 'propDecorators';
export const CONSTRUCTOR = '__constructor';
export const CONSTRUCTOR_PARAMS = 'ctorParameters';
/**
 * Esm2015 packages contain ECMAScript 2015 classes, etc.
 * Decorators are defined via static properties on the class. For example:
 *
 * ```
 * class SomeDirective {
 * }
 * SomeDirective.decorators = [
 *   { type: Directive, args: [{ selector: '[someDirective]' },] }
 * ];
 * SomeDirective.ctorParameters = () => [
 *   { type: ViewContainerRef, },
 *   { type: TemplateRef, },
 *   { type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN,] },] },
 * ];
 * SomeDirective.propDecorators = {
 *   "input1": [{ type: Input },],
 *   "input2": [{ type: Input },],
 * };
 * ```
 *
 * * Classes are decorated if they have a static property called `decorators`.
 * * Members are decorated if there is a matching key on a static property
 *   called `propDecorators`.
 * * Constructor parameters decorators are found on an object returned from
 *   a static method called `ctorParameters`.
 */
export class Esm2015ReflectionHost extends TypeScriptReflectionHost {
    constructor(logger, isCore, src, dts = null) {
        super(src.program.getTypeChecker());
        this.logger = logger;
        this.isCore = isCore;
        this.src = src;
        this.dts = dts;
        /**
         * A mapping from source declarations to typings declarations, which are both publicly exported.
         *
         * There should be one entry for every public export visible from the root file of the source
         * tree. Note that by definition the key and value declarations will not be in the same TS
         * program.
         */
        this.publicDtsDeclarationMap = null;
        /**
         * A mapping from source declarations to typings declarations, which are not publicly exported.
         *
         * This mapping is a best guess between declarations that happen to be exported from their file by
         * the same name in both the source and the dts file. Note that by definition the key and value
         * declarations will not be in the same TS program.
         */
        this.privateDtsDeclarationMap = null;
        /**
         * The set of source files that have already been preprocessed.
         */
        this.preprocessedSourceFiles = new Set();
        /**
         * In ES2015, class declarations may have been down-leveled into variable declarations,
         * initialized using a class expression. In certain scenarios, an additional variable
         * is introduced that represents the class so that results in code such as:
         *
         * ```
         * let MyClass_1; let MyClass = MyClass_1 = class MyClass {};
         * ```
         *
         * This map tracks those aliased variables to their original identifier, i.e. the key
         * corresponds with the declaration of `MyClass_1` and its value becomes the `MyClass` identifier
         * of the variable declaration.
         *
         * This map is populated during the preprocessing of each source file.
         */
        this.aliasedClassDeclarations = new Map();
        /**
         * Caches the information of the decorators on a class, as the work involved with extracting
         * decorators is complex and frequently used.
         *
         * This map is lazily populated during the first call to `acquireDecoratorInfo` for a given class.
         */
        this.decoratorCache = new Map();
    }
    /**
     * Find a symbol for a node that we think is a class.
     * Classes should have a `name` identifier, because they may need to be referenced in other parts
     * of the program.
     *
     * In ES2015, a class may be declared using a variable declaration of the following structures:
     *
     * ```
     * var MyClass = MyClass_1 = class MyClass {};
     * ```
     *
     * or
     *
     * ```
     * var MyClass = MyClass_1 = (() => { class MyClass {} ... return MyClass; })()
     * ```
     *
     * Here, the intermediate `MyClass_1` assignment is optional. In the above example, the
     * `class MyClass {}` node is returned as declaration of `MyClass`.
     *
     * @param declaration the declaration node whose symbol we are finding.
     * @returns the symbol for the node or `undefined` if it is not a "class" or has no symbol.
     */
    getClassSymbol(declaration) {
        const symbol = this.getClassSymbolFromOuterDeclaration(declaration);
        if (symbol !== undefined) {
            return symbol;
        }
        const innerDeclaration = this.getInnerDeclarationFromAliasOrInner(declaration);
        return this.getClassSymbolFromInnerDeclaration(innerDeclaration);
    }
    /**
     * Examine a declaration (for example, of a class or function) and return metadata about any
     * decorators present on the declaration.
     *
     * @param declaration a TypeScript node representing the class or function over which to reflect.
     *     For example, if the intent is to reflect the decorators of a class and the source is in ES6
     *     format, this will be a `ts.ClassDeclaration` node. If the source is in ES5 format, this
     *     might be a `ts.VariableDeclaration` as classes in ES5 are represented as the result of an
     *     IIFE execution.
     *
     * @returns an array of `Decorator` metadata if decorators are present on the declaration, or
     *     `null` if either no decorators were present or if the declaration is not of a decoratable
     *     type.
     */
    getDecoratorsOfDeclaration(declaration) {
        const symbol = this.getClassSymbol(declaration);
        if (!symbol) {
            return null;
        }
        return this.getDecoratorsOfSymbol(symbol);
    }
    /**
     * Examine a declaration which should be of a class, and return metadata about the members of the
     * class.
     *
     * @param clazz a `ClassDeclaration` representing the class over which to reflect.
     *
     * @returns an array of `ClassMember` metadata representing the members of the class.
     *
     * @throws if `declaration` does not resolve to a class declaration.
     */
    getMembersOfClass(clazz) {
        const classSymbol = this.getClassSymbol(clazz);
        if (!classSymbol) {
            throw new Error(`Attempted to get members of a non-class: "${clazz.getText()}"`);
        }
        return this.getMembersOfSymbol(classSymbol);
    }
    /**
     * Reflect over the constructor of a class and return metadata about its parameters.
     *
     * This method only looks at the constructor of a class directly and not at any inherited
     * constructors.
     *
     * @param clazz a `ClassDeclaration` representing the class over which to reflect.
     *
     * @returns an array of `Parameter` metadata representing the parameters of the constructor, if
     * a constructor exists. If the constructor exists and has 0 parameters, this array will be empty.
     * If the class has no constructor, this method returns `null`.
     *
     * @throws if `declaration` does not resolve to a class declaration.
     */
    getConstructorParameters(clazz) {
        const classSymbol = this.getClassSymbol(clazz);
        if (!classSymbol) {
            throw new Error(`Attempted to get constructor parameters of a non-class: "${clazz.getText()}"`);
        }
        const parameterNodes = this.getConstructorParameterDeclarations(classSymbol);
        if (parameterNodes) {
            return this.getConstructorParamInfo(classSymbol, parameterNodes);
        }
        return null;
    }
    getBaseClassExpression(clazz) {
        // First try getting the base class from an ES2015 class declaration
        const superBaseClassIdentifier = super.getBaseClassExpression(clazz);
        if (superBaseClassIdentifier) {
            return superBaseClassIdentifier;
        }
        // That didn't work so now try getting it from the "inner" declaration.
        const classSymbol = this.getClassSymbol(clazz);
        if (classSymbol === undefined ||
            !isNamedDeclaration(classSymbol.implementation.valueDeclaration)) {
            return null;
        }
        return super.getBaseClassExpression(classSymbol.implementation.valueDeclaration);
    }
    getInternalNameOfClass(clazz) {
        const classSymbol = this.getClassSymbol(clazz);
        if (classSymbol === undefined) {
            throw new Error(`getInternalNameOfClass() called on a non-class: expected ${clazz.name.text} to be a class declaration.`);
        }
        return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.implementation.valueDeclaration);
    }
    getAdjacentNameOfClass(clazz) {
        const classSymbol = this.getClassSymbol(clazz);
        if (classSymbol === undefined) {
            throw new Error(`getAdjacentNameOfClass() called on a non-class: expected ${clazz.name.text} to be a class declaration.`);
        }
        return this.getAdjacentNameOfClassSymbol(classSymbol);
    }
    getNameFromClassSymbolDeclaration(classSymbol, declaration) {
        if (declaration === undefined) {
            throw new Error(`getInternalNameOfClass() called on a class with an undefined internal declaration. External class name: ${classSymbol.name}; internal class name: ${classSymbol.implementation.name}.`);
        }
        if (!isNamedDeclaration(declaration)) {
            throw new Error(`getInternalNameOfClass() called on a class with an anonymous inner declaration: expected a name on:\n${declaration.getText()}`);
        }
        return declaration.name;
    }
    /**
     * Check whether the given node actually represents a class.
     */
    isClass(node) {
        return super.isClass(node) || this.getClassSymbol(node) !== undefined;
    }
    /**
     * Trace an identifier to its declaration, if possible.
     *
     * This method attempts to resolve the declaration of the given identifier, tracing back through
     * imports and re-exports until the original declaration statement is found. A `Declaration`
     * object is returned if the original declaration is found, or `null` is returned otherwise.
     *
     * In ES2015, we need to account for identifiers that refer to aliased class declarations such as
     * `MyClass_1`. Since such declarations are only available within the module itself, we need to
     * find the original class declaration, e.g. `MyClass`, that is associated with the aliased one.
     *
     * @param id a TypeScript `ts.Identifier` to trace back to a declaration.
     *
     * @returns metadata about the `Declaration` if the original declaration is found, or `null`
     * otherwise.
     */
    getDeclarationOfIdentifier(id) {
        const superDeclaration = super.getDeclarationOfIdentifier(id);
        // If no declaration was found, return.
        if (superDeclaration === null) {
            return superDeclaration;
        }
        // If the declaration already has traits assigned to it, return as is.
        if (superDeclaration.known !== null ||
            isConcreteDeclaration(superDeclaration) && superDeclaration.identity !== null) {
            return superDeclaration;
        }
        let declarationNode = superDeclaration.node;
        if (isNamedVariableDeclaration(superDeclaration.node) && !isTopLevel(superDeclaration.node)) {
            const variableValue = this.getVariableValue(superDeclaration.node);
            if (variableValue !== null && ts.isClassExpression(variableValue)) {
                declarationNode = getContainingStatement(variableValue);
            }
        }
        const outerNode = getOuterNodeFromInnerDeclaration(declarationNode);
        const declaration = outerNode !== null && isNamedVariableDeclaration(outerNode) ?
            this.getDeclarationOfIdentifier(outerNode.name) :
            superDeclaration;
        if (declaration === null || declaration.known !== null ||
            isConcreteDeclaration(declaration) && declaration.identity !== null) {
            return declaration;
        }
        // The identifier may have been of an additional class assignment such as `MyClass_1` that was
        // present as alias for `MyClass`. If so, resolve such aliases to their original declaration.
        const aliasedIdentifier = this.resolveAliasedClassIdentifier(declaration.node);
        if (aliasedIdentifier !== null) {
            return this.getDeclarationOfIdentifier(aliasedIdentifier);
        }
        // Variable declarations may represent an enum declaration, so attempt to resolve its members.
        if (isConcreteDeclaration(declaration) && ts.isVariableDeclaration(declaration.node)) {
            const enumMembers = this.resolveEnumMembers(declaration.node);
            if (enumMembers !== null) {
                declaration.identity = { kind: 0 /* DownleveledEnum */, enumMembers };
            }
        }
        return declaration;
    }
    /**
     * Gets all decorators of the given class symbol. Any decorator that have been synthetically
     * injected by a migration will not be present in the returned collection.
     */
    getDecoratorsOfSymbol(symbol) {
        const { classDecorators } = this.acquireDecoratorInfo(symbol);
        if (classDecorators === null) {
            return null;
        }
        // Return a clone of the array to prevent consumers from mutating the cache.
        return Array.from(classDecorators);
    }
    /**
     * Search the given module for variable declarations in which the initializer
     * is an identifier marked with the `PRE_R3_MARKER`.
     * @param module the module in which to search for switchable declarations.
     * @returns an array of variable declarations that match.
     */
    getSwitchableDeclarations(module) {
        // Don't bother to walk the AST if the marker is not found in the text
        return module.getText().indexOf(PRE_R3_MARKER) >= 0 ?
            findAll(module, isSwitchableVariableDeclaration) :
            [];
    }
    getVariableValue(declaration) {
        const value = super.getVariableValue(declaration);
        if (value) {
            return value;
        }
        // We have a variable declaration that has no initializer. For example:
        //
        // ```
        // var HttpClientXsrfModule_1;
        // ```
        //
        // So look for the special scenario where the variable is being assigned in
        // a nearby statement to the return value of a call to `__decorate`.
        // Then find the 2nd argument of that call, the "target", which will be the
        // actual class identifier. For example:
        //
        // ```
        // HttpClientXsrfModule = HttpClientXsrfModule_1 = tslib_1.__decorate([
        //   NgModule({
        //     providers: [],
        //   })
        // ], HttpClientXsrfModule);
        // ```
        //
        // And finally, find the declaration of the identifier in that argument.
        // Note also that the assignment can occur within another assignment.
        //
        const block = declaration.parent.parent.parent;
        const symbol = this.checker.getSymbolAtLocation(declaration.name);
        if (symbol && (ts.isBlock(block) || ts.isSourceFile(block))) {
            const decorateCall = this.findDecoratedVariableValue(block, symbol);
            const target = decorateCall && decorateCall.arguments[1];
            if (target && ts.isIdentifier(target)) {
                const targetSymbol = this.checker.getSymbolAtLocation(target);
                const targetDeclaration = targetSymbol && targetSymbol.valueDeclaration;
                if (targetDeclaration) {
                    if (ts.isClassDeclaration(targetDeclaration) ||
                        ts.isFunctionDeclaration(targetDeclaration)) {
                        // The target is just a function or class declaration
                        // so return its identifier as the variable value.
                        return targetDeclaration.name || null;
                    }
                    else if (ts.isVariableDeclaration(targetDeclaration)) {
                        // The target is a variable declaration, so find the far right expression,
                        // in the case of multiple assignments (e.g. `var1 = var2 = value`).
                        let targetValue = targetDeclaration.initializer;
                        while (targetValue && isAssignment(targetValue)) {
                            targetValue = targetValue.right;
                        }
                        if (targetValue) {
                            return targetValue;
                        }
                    }
                }
            }
        }
        return null;
    }
    /**
     * Find all top-level class symbols in the given file.
     * @param sourceFile The source file to search for classes.
     * @returns An array of class symbols.
     */
    findClassSymbols(sourceFile) {
        const classes = new Map();
        this.getModuleStatements(sourceFile)
            .forEach(statement => this.addClassSymbolsFromStatement(classes, statement));
        return Array.from(classes.values());
    }
    /**
     * Get the number of generic type parameters of a given class.
     *
     * @param clazz a `ClassDeclaration` representing the class over which to reflect.
     *
     * @returns the number of type parameters of the class, if known, or `null` if the declaration
     * is not a class or has an unknown number of type parameters.
     */
    getGenericArityOfClass(clazz) {
        const dtsDeclaration = this.getDtsDeclaration(clazz);
        if (dtsDeclaration && ts.isClassDeclaration(dtsDeclaration)) {
            return dtsDeclaration.typeParameters ? dtsDeclaration.typeParameters.length : 0;
        }
        return null;
    }
    /**
     * Take an exported declaration of a class (maybe down-leveled to a variable) and look up the
     * declaration of its type in a separate .d.ts tree.
     *
     * This function is allowed to return `null` if the current compilation unit does not have a
     * separate .d.ts tree. When compiling TypeScript code this is always the case, since .d.ts files
     * are produced only during the emit of such a compilation. When compiling .js code, however,
     * there is frequently a parallel .d.ts tree which this method exposes.
     *
     * Note that the `ts.ClassDeclaration` returned from this function may not be from the same
     * `ts.Program` as the input declaration.
     */
    getDtsDeclaration(declaration) {
        if (this.dts === null) {
            return null;
        }
        if (!isNamedDeclaration(declaration)) {
            throw new Error(`Cannot get the dts file for a declaration that has no name: ${declaration.getText()} in ${declaration.getSourceFile().fileName}`);
        }
        const decl = this.getDeclarationOfIdentifier(declaration.name);
        if (decl === null) {
            throw new Error(`Cannot get the dts file for a node that cannot be associated with a declaration ${declaration.getText()} in ${declaration.getSourceFile().fileName}`);
        }
        // Try to retrieve the dts declaration from the public map
        if (this.publicDtsDeclarationMap === null) {
            this.publicDtsDeclarationMap = this.computePublicDtsDeclarationMap(this.src, this.dts);
        }
        if (this.publicDtsDeclarationMap.has(decl.node)) {
            return this.publicDtsDeclarationMap.get(decl.node);
        }
        // No public export, try the private map
        if (this.privateDtsDeclarationMap === null) {
            this.privateDtsDeclarationMap = this.computePrivateDtsDeclarationMap(this.src, this.dts);
        }
        if (this.privateDtsDeclarationMap.has(decl.node)) {
            return this.privateDtsDeclarationMap.get(decl.node);
        }
        // No declaration found at all
        return null;
    }
    getEndOfClass(classSymbol) {
        const implementation = classSymbol.implementation;
        let last = implementation.valueDeclaration;
        const implementationStatement = getContainingStatement(last);
        if (implementationStatement === null)
            return last;
        const container = implementationStatement.parent;
        if (ts.isBlock(container)) {
            // Assume that the implementation is inside an IIFE
            const returnStatementIndex = container.statements.findIndex(ts.isReturnStatement);
            if (returnStatementIndex === -1) {
                throw new Error(`Compiled class wrapper IIFE does not have a return statement: ${classSymbol.name} in ${classSymbol.declaration.valueDeclaration.getSourceFile().fileName}`);
            }
            // Return the statement before the IIFE return statement
            last = container.statements[returnStatementIndex - 1];
        }
        else if (ts.isSourceFile(container)) {
            // If there are static members on this class then find the last one
            if (implementation.exports !== undefined) {
                implementation.exports.forEach(exportSymbol => {
                    if (exportSymbol.valueDeclaration === undefined) {
                        return;
                    }
                    const exportStatement = getContainingStatement(exportSymbol.valueDeclaration);
                    if (exportStatement !== null && last.getEnd() < exportStatement.getEnd()) {
                        last = exportStatement;
                    }
                });
            }
            // If there are helper calls for this class then find the last one
            const helpers = this.getHelperCallsForClass(classSymbol, ['__decorate', '__extends', '__param', '__metadata']);
            helpers.forEach(helper => {
                const helperStatement = getContainingStatement(helper);
                if (helperStatement !== null && last.getEnd() < helperStatement.getEnd()) {
                    last = helperStatement;
                }
            });
        }
        return last;
    }
    /**
     * Check whether a `Declaration` corresponds with a known declaration, such as `Object`, and set
     * its `known` property to the appropriate `KnownDeclaration`.
     *
     * @param decl The `Declaration` to check.
     * @return The passed in `Declaration` (potentially enhanced with a `KnownDeclaration`).
     */
    detectKnownDeclaration(decl) {
        if (decl.known === null && this.isJavaScriptObjectDeclaration(decl)) {
            // If the identifier resolves to the global JavaScript `Object`, update the declaration to
            // denote it as the known `JsGlobalObject` declaration.
            decl.known = KnownDeclaration.JsGlobalObject;
        }
        return decl;
    }
    ///////////// Protected Helpers /////////////
    /**
     * Extract all the "classes" from the `statement` and add them to the `classes` map.
     */
    addClassSymbolsFromStatement(classes, statement) {
        if (ts.isVariableStatement(statement)) {
            statement.declarationList.declarations.forEach(declaration => {
                const classSymbol = this.getClassSymbol(declaration);
                if (classSymbol) {
                    classes.set(classSymbol.implementation, classSymbol);
                }
            });
        }
        else if (ts.isClassDeclaration(statement)) {
            const classSymbol = this.getClassSymbol(statement);
            if (classSymbol) {
                classes.set(classSymbol.implementation, classSymbol);
            }
        }
    }
    /**
     * Compute the inner declaration node of a "class" from the given `declaration` node.
     *
     * @param declaration a node that is either an inner declaration or an alias of a class.
     */
    getInnerDeclarationFromAliasOrInner(declaration) {
        if (declaration.parent !== undefined && isNamedVariableDeclaration(declaration.parent)) {
            const variableValue = this.getVariableValue(declaration.parent);
            if (variableValue !== null) {
                declaration = variableValue;
            }
        }
        return declaration;
    }
    /**
     * A class may be declared as a top level class declaration:
     *
     * ```
     * class OuterClass { ... }
     * ```
     *
     * or in a variable declaration to a class expression:
     *
     * ```
     * var OuterClass = ClassAlias = class InnerClass {};
     * ```
     *
     * or in a variable declaration to an IIFE containing a class declaration
     *
     * ```
     * var OuterClass = ClassAlias = (() => {
     *   class InnerClass {}
     *   ...
     *   return InnerClass;
     * })()
     * ```
     *
     * or in a variable declaration to an IIFE containing a function declaration
     *
     * ```
     * var OuterClass = ClassAlias = (() => {
     *   function InnerClass() {}
     *   ...
     *   return InnerClass;
     * })()
     * ```
     *
     * This method returns an `NgccClassSymbol` when provided with one of these cases.
     *
     * @param declaration the declaration whose symbol we are finding.
     * @returns the symbol for the class or `undefined` if `declaration` does not represent an outer
     *     declaration of a class.
     */
    getClassSymbolFromOuterDeclaration(declaration) {
        // Return a class symbol without an inner declaration if it is a regular "top level" class
        if (isNamedClassDeclaration(declaration) && isTopLevel(declaration)) {
            return this.createClassSymbol(declaration.name, null);
        }
        // Otherwise, an outer class declaration must be an initialized variable declaration:
        if (!isInitializedVariableClassDeclaration(declaration)) {
            return undefined;
        }
        const innerDeclaration = getInnerClassDeclaration(skipClassAliases(declaration));
        if (innerDeclaration === null) {
            return undefined;
        }
        return this.createClassSymbol(declaration.name, innerDeclaration);
    }
    /**
     * In ES2015, a class may be declared using a variable declaration of the following structures:
     *
     * ```
     * let MyClass = MyClass_1 = class MyClass {};
     * ```
     *
     * or
     *
     * ```
     * let MyClass = MyClass_1 = (() => { class MyClass {} ... return MyClass; })()
     * ```
     *
     * or
     *
     * ```
     * let MyClass = MyClass_1 = (() => { let MyClass = class MyClass {}; ... return MyClass; })()
     * ```
     *
     * This method extracts the `NgccClassSymbol` for `MyClass` when provided with the
     * `class MyClass {}` declaration node. When the `var MyClass` node or any other node is given,
     * this method will return undefined instead.
     *
     * @param declaration the declaration whose symbol we are finding.
     * @returns the symbol for the node or `undefined` if it does not represent an inner declaration
     * of a class.
     */
    getClassSymbolFromInnerDeclaration(declaration) {
        let outerDeclaration = undefined;
        if (ts.isClassExpression(declaration) && hasNameIdentifier(declaration)) {
            // Handle `let MyClass = MyClass_1 = class MyClass {};`
            outerDeclaration = getFarLeftHandSideOfAssignment(declaration);
            // Handle this being in an IIFE
            if (outerDeclaration !== undefined && !isTopLevel(outerDeclaration)) {
                outerDeclaration = getContainingVariableDeclaration(outerDeclaration);
            }
        }
        else if (isNamedClassDeclaration(declaration)) {
            // Handle `class MyClass {}` statement
            if (isTopLevel(declaration)) {
                // At the top level
                outerDeclaration = declaration;
            }
            else {
                // Or inside an IIFE
                outerDeclaration = getContainingVariableDeclaration(declaration);
            }
        }
        if (outerDeclaration === undefined || !hasNameIdentifier(outerDeclaration)) {
            return undefined;
        }
        return this.createClassSymbol(outerDeclaration.name, declaration);
    }
    /**
     * Creates an `NgccClassSymbol` from an outer and inner declaration. If a class only has an outer
     * declaration, the "implementation" symbol of the created `NgccClassSymbol` will be set equal to
     * the "declaration" symbol.
     *
     * @param outerDeclaration The outer declaration node of the class.
     * @param innerDeclaration The inner declaration node of the class, or undefined if no inner
     * declaration is present.
     * @returns the `NgccClassSymbol` representing the class, or undefined if a `ts.Symbol` for any of
     * the declarations could not be resolved.
     */
    createClassSymbol(outerDeclaration, innerDeclaration) {
        const declarationSymbol = this.checker.getSymbolAtLocation(outerDeclaration);
        if (declarationSymbol === undefined) {
            return undefined;
        }
        let implementationSymbol = declarationSymbol;
        if (innerDeclaration !== null && isNamedDeclaration(innerDeclaration)) {
            implementationSymbol = this.checker.getSymbolAtLocation(innerDeclaration.name);
        }
        if (implementationSymbol === undefined) {
            return undefined;
        }
        const classSymbol = {
            name: declarationSymbol.name,
            declaration: declarationSymbol,
            implementation: implementationSymbol,
            adjacent: this.getAdjacentSymbol(declarationSymbol, implementationSymbol),
        };
        return classSymbol;
    }
    getAdjacentSymbol(declarationSymbol, implementationSymbol) {
        if (declarationSymbol === implementationSymbol) {
            return undefined;
        }
        const innerDeclaration = implementationSymbol.valueDeclaration;
        if (!ts.isClassExpression(innerDeclaration) && !ts.isFunctionExpression(innerDeclaration)) {
            return undefined;
        }
        // Deal with the inner class looking like this inside an IIFE:
        // `let MyClass = class MyClass {};` or `var MyClass = function MyClass() {};`
        const adjacentDeclaration = getFarLeftHandSideOfAssignment(innerDeclaration);
        if (adjacentDeclaration === undefined || !isNamedVariableDeclaration(adjacentDeclaration)) {
            return undefined;
        }
        const adjacentSymbol = this.checker.getSymbolAtLocation(adjacentDeclaration.name);
        if (adjacentSymbol === declarationSymbol || adjacentSymbol === implementationSymbol) {
            return undefined;
        }
        return adjacentSymbol;
    }
    /**
     * Resolve a `ts.Symbol` to its declaration and detect whether it corresponds with a known
     * declaration.
     */
    getDeclarationOfSymbol(symbol, originalId) {
        const declaration = super.getDeclarationOfSymbol(symbol, originalId);
        if (declaration === null) {
            return null;
        }
        return this.detectKnownDeclaration(declaration);
    }
    /**
     * Finds the identifier of the actual class declaration for a potentially aliased declaration of a
     * class.
     *
     * If the given declaration is for an alias of a class, this function will determine an identifier
     * to the original declaration that represents this class.
     *
     * @param declaration The declaration to resolve.
     * @returns The original identifier that the given class declaration resolves to, or `undefined`
     * if the declaration does not represent an aliased class.
     */
    resolveAliasedClassIdentifier(declaration) {
        this.ensurePreprocessed(declaration.getSourceFile());
        return this.aliasedClassDeclarations.has(declaration) ?
            this.aliasedClassDeclarations.get(declaration) :
            null;
    }
    /**
     * Ensures that the source file that `node` is part of has been preprocessed.
     *
     * During preprocessing, all statements in the source file will be visited such that certain
     * processing steps can be done up-front and cached for subsequent usages.
     *
     * @param sourceFile The source file that needs to have gone through preprocessing.
     */
    ensurePreprocessed(sourceFile) {
        if (!this.preprocessedSourceFiles.has(sourceFile)) {
            this.preprocessedSourceFiles.add(sourceFile);
            for (const statement of this.getModuleStatements(sourceFile)) {
                this.preprocessStatement(statement);
            }
        }
    }
    /**
     * Analyzes the given statement to see if it corresponds with a variable declaration like
     * `let MyClass = MyClass_1 = class MyClass {};`. If so, the declaration of `MyClass_1`
     * is associated with the `MyClass` identifier.
     *
     * @param statement The statement that needs to be preprocessed.
     */
    preprocessStatement(statement) {
        if (!ts.isVariableStatement(statement)) {
            return;
        }
        const declarations = statement.declarationList.declarations;
        if (declarations.length !== 1) {
            return;
        }
        const declaration = declarations[0];
        const initializer = declaration.initializer;
        if (!ts.isIdentifier(declaration.name) || !initializer || !isAssignment(initializer) ||
            !ts.isIdentifier(initializer.left) || !this.isClass(declaration)) {
            return;
        }
        const aliasedIdentifier = initializer.left;
        const aliasedDeclaration = this.getDeclarationOfIdentifier(aliasedIdentifier);
        if (aliasedDeclaration === null) {
            throw new Error(`Unable to locate declaration of ${aliasedIdentifier.text} in "${statement.getText()}"`);
        }
        this.aliasedClassDeclarations.set(aliasedDeclaration.node, declaration.name);
    }
    /**
     * Get the top level statements for a module.
     *
     * In ES5 and ES2015 this is just the top level statements of the file.
     * @param sourceFile The module whose statements we want.
     * @returns An array of top level statements for the given module.
     */
    getModuleStatements(sourceFile) {
        return Array.from(sourceFile.statements);
    }
    /**
     * Walk the AST looking for an assignment to the specified symbol.
     * @param node The current node we are searching.
     * @returns an expression that represents the value of the variable, or undefined if none can be
     * found.
     */
    findDecoratedVariableValue(node, symbol) {
        if (!node) {
            return null;
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            const left = node.left;
            const right = node.right;
            if (ts.isIdentifier(left) && this.checker.getSymbolAtLocation(left) === symbol) {
                return (ts.isCallExpression(right) && getCalleeName(right) === '__decorate') ? right : null;
            }
            return this.findDecoratedVariableValue(right, symbol);
        }
        return node.forEachChild(node => this.findDecoratedVariableValue(node, symbol)) || null;
    }
    /**
     * Try to retrieve the symbol of a static property on a class.
     *
     * In some cases, a static property can either be set on the inner (implementation or adjacent)
     * declaration inside the class' IIFE, or it can be set on the outer variable declaration.
     * Therefore, the host checks all places, first looking up the property on the inner symbols, and
     * if the property is not found it will fall back to looking up the property on the outer symbol.
     *
     * @param symbol the class whose property we are interested in.
     * @param propertyName the name of static property.
     * @returns the symbol if it is found or `undefined` if not.
     */
    getStaticProperty(symbol, propertyName) {
        var _a, _b, _c, _d;
        return ((_a = symbol.implementation.exports) === null || _a === void 0 ? void 0 : _a.get(propertyName)) ||
            ((_c = (_b = symbol.adjacent) === null || _b === void 0 ? void 0 : _b.exports) === null || _c === void 0 ? void 0 : _c.get(propertyName)) ||
            ((_d = symbol.declaration.exports) === null || _d === void 0 ? void 0 : _d.get(propertyName));
    }
    /**
     * This is the main entry-point for obtaining information on the decorators of a given class. This
     * information is computed either from static properties if present, or using `tslib.__decorate`
     * helper calls otherwise. The computed result is cached per class.
     *
     * @param classSymbol the class for which decorators should be acquired.
     * @returns all information of the decorators on the class.
     */
    acquireDecoratorInfo(classSymbol) {
        const decl = classSymbol.declaration.valueDeclaration;
        if (this.decoratorCache.has(decl)) {
            return this.decoratorCache.get(decl);
        }
        // Extract decorators from static properties and `__decorate` helper calls, then merge them
        // together where the information from the static properties is preferred.
        const staticProps = this.computeDecoratorInfoFromStaticProperties(classSymbol);
        const helperCalls = this.computeDecoratorInfoFromHelperCalls(classSymbol);
        const decoratorInfo = {
            classDecorators: staticProps.classDecorators || helperCalls.classDecorators,
            memberDecorators: staticProps.memberDecorators || helperCalls.memberDecorators,
            constructorParamInfo: staticProps.constructorParamInfo || helperCalls.constructorParamInfo,
        };
        this.decoratorCache.set(decl, decoratorInfo);
        return decoratorInfo;
    }
    /**
     * Attempts to compute decorator information from static properties "decorators", "propDecorators"
     * and "ctorParameters" on the class. If neither of these static properties is present the
     * library is likely not compiled using tsickle for usage with Closure compiler, in which case
     * `null` is returned.
     *
     * @param classSymbol The class symbol to compute the decorators information for.
     * @returns All information on the decorators as extracted from static properties, or `null` if
     * none of the static properties exist.
     */
    computeDecoratorInfoFromStaticProperties(classSymbol) {
        let classDecorators = null;
        let memberDecorators = null;
        let constructorParamInfo = null;
        const decoratorsProperty = this.getStaticProperty(classSymbol, DECORATORS);
        if (decoratorsProperty !== undefined) {
            classDecorators = this.getClassDecoratorsFromStaticProperty(decoratorsProperty);
        }
        const propDecoratorsProperty = this.getStaticProperty(classSymbol, PROP_DECORATORS);
        if (propDecoratorsProperty !== undefined) {
            memberDecorators = this.getMemberDecoratorsFromStaticProperty(propDecoratorsProperty);
        }
        const constructorParamsProperty = this.getStaticProperty(classSymbol, CONSTRUCTOR_PARAMS);
        if (constructorParamsProperty !== undefined) {
            constructorParamInfo = this.getParamInfoFromStaticProperty(constructorParamsProperty);
        }
        return { classDecorators, memberDecorators, constructorParamInfo };
    }
    /**
     * Get all class decorators for the given class, where the decorators are declared
     * via a static property. For example:
     *
     * ```
     * class SomeDirective {}
     * SomeDirective.decorators = [
     *   { type: Directive, args: [{ selector: '[someDirective]' },] }
     * ];
     * ```
     *
     * @param decoratorsSymbol the property containing the decorators we want to get.
     * @returns an array of decorators or null if none where found.
     */
    getClassDecoratorsFromStaticProperty(decoratorsSymbol) {
        const decoratorsIdentifier = decoratorsSymbol.valueDeclaration;
        if (decoratorsIdentifier && decoratorsIdentifier.parent) {
            if (ts.isBinaryExpression(decoratorsIdentifier.parent) &&
                decoratorsIdentifier.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                // AST of the array of decorator values
                const decoratorsArray = decoratorsIdentifier.parent.right;
                return this.reflectDecorators(decoratorsArray)
                    .filter(decorator => this.isFromCore(decorator));
            }
        }
        return null;
    }
    /**
     * Examine a symbol which should be of a class, and return metadata about its members.
     *
     * @param symbol the `ClassSymbol` representing the class over which to reflect.
     * @returns an array of `ClassMember` metadata representing the members of the class.
     */
    getMembersOfSymbol(symbol) {
        const members = [];
        // The decorators map contains all the properties that are decorated
        const { memberDecorators } = this.acquireDecoratorInfo(symbol);
        // Make a copy of the decorators as successfully reflected members delete themselves from the
        // map, so that any leftovers can be easily dealt with.
        const decoratorsMap = new Map(memberDecorators);
        // The member map contains all the method (instance and static); and any instance properties
        // that are initialized in the class.
        if (symbol.implementation.members) {
            symbol.implementation.members.forEach((value, key) => {
                const decorators = decoratorsMap.get(key);
                const reflectedMembers = this.reflectMembers(value, decorators);
                if (reflectedMembers) {
                    decoratorsMap.delete(key);
                    members.push(...reflectedMembers);
                }
            });
        }
        // The static property map contains all the static properties
        if (symbol.implementation.exports) {
            symbol.implementation.exports.forEach((value, key) => {
                const decorators = decoratorsMap.get(key);
                const reflectedMembers = this.reflectMembers(value, decorators, true);
                if (reflectedMembers) {
                    decoratorsMap.delete(key);
                    members.push(...reflectedMembers);
                }
            });
        }
        // If this class was declared as a VariableDeclaration then it may have static properties
        // attached to the variable rather than the class itself
        // For example:
        // ```
        // let MyClass = class MyClass {
        //   // no static properties here!
        // }
        // MyClass.staticProperty = ...;
        // ```
        if (ts.isVariableDeclaration(symbol.declaration.valueDeclaration)) {
            if (symbol.declaration.exports) {
                symbol.declaration.exports.forEach((value, key) => {
                    const decorators = decoratorsMap.get(key);
                    const reflectedMembers = this.reflectMembers(value, decorators, true);
                    if (reflectedMembers) {
                        decoratorsMap.delete(key);
                        members.push(...reflectedMembers);
                    }
                });
            }
        }
        // If this class was declared as a VariableDeclaration inside an IIFE, then it may have static
        // properties attached to the variable rather than the class itself.
        //
        // For example:
        // ```
        // let OuterClass = (() => {
        //   let AdjacentClass = class InternalClass {
        //     // no static properties here!
        //   }
        //   AdjacentClass.staticProperty = ...;
        // })();
        // ```
        if (symbol.adjacent !== undefined) {
            if (ts.isVariableDeclaration(symbol.adjacent.valueDeclaration)) {
                if (symbol.adjacent.exports !== undefined) {
                    symbol.adjacent.exports.forEach((value, key) => {
                        const decorators = decoratorsMap.get(key);
                        const reflectedMembers = this.reflectMembers(value, decorators, true);
                        if (reflectedMembers) {
                            decoratorsMap.delete(key);
                            members.push(...reflectedMembers);
                        }
                    });
                }
            }
        }
        // Deal with any decorated properties that were not initialized in the class
        decoratorsMap.forEach((value, key) => {
            members.push({
                implementation: null,
                decorators: value,
                isStatic: false,
                kind: ClassMemberKind.Property,
                name: key,
                nameNode: null,
                node: null,
                type: null,
                value: null
            });
        });
        return members;
    }
    /**
     * Member decorators may be declared as static properties of the class:
     *
     * ```
     * SomeDirective.propDecorators = {
     *   "ngForOf": [{ type: Input },],
     *   "ngForTrackBy": [{ type: Input },],
     *   "ngForTemplate": [{ type: Input },],
     * };
     * ```
     *
     * @param decoratorsProperty the class whose member decorators we are interested in.
     * @returns a map whose keys are the name of the members and whose values are collections of
     * decorators for the given member.
     */
    getMemberDecoratorsFromStaticProperty(decoratorsProperty) {
        const memberDecorators = new Map();
        // Symbol of the identifier for `SomeDirective.propDecorators`.
        const propDecoratorsMap = getPropertyValueFromSymbol(decoratorsProperty);
        if (propDecoratorsMap && ts.isObjectLiteralExpression(propDecoratorsMap)) {
            const propertiesMap = reflectObjectLiteral(propDecoratorsMap);
            propertiesMap.forEach((value, name) => {
                const decorators = this.reflectDecorators(value).filter(decorator => this.isFromCore(decorator));
                if (decorators.length) {
                    memberDecorators.set(name, decorators);
                }
            });
        }
        return memberDecorators;
    }
    /**
     * For a given class symbol, collects all decorator information from tslib helper methods, as
     * generated by TypeScript into emitted JavaScript files.
     *
     * Class decorators are extracted from calls to `tslib.__decorate` that look as follows:
     *
     * ```
     * let SomeDirective = class SomeDirective {}
     * SomeDirective = __decorate([
     *   Directive({ selector: '[someDirective]' }),
     * ], SomeDirective);
     * ```
     *
     * The extraction of member decorators is similar, with the distinction that its 2nd and 3rd
     * argument correspond with a "prototype" target and the name of the member to which the
     * decorators apply.
     *
     * ```
     * __decorate([
     *     Input(),
     *     __metadata("design:type", String)
     * ], SomeDirective.prototype, "input1", void 0);
     * ```
     *
     * @param classSymbol The class symbol for which decorators should be extracted.
     * @returns All information on the decorators of the class.
     */
    computeDecoratorInfoFromHelperCalls(classSymbol) {
        let classDecorators = null;
        const memberDecorators = new Map();
        const constructorParamInfo = [];
        const getConstructorParamInfo = (index) => {
            let param = constructorParamInfo[index];
            if (param === undefined) {
                param = constructorParamInfo[index] = { decorators: null, typeExpression: null };
            }
            return param;
        };
        // All relevant information can be extracted from calls to `__decorate`, obtain these first.
        // Note that although the helper calls are retrieved using the class symbol, the result may
        // contain helper calls corresponding with unrelated classes. Therefore, each helper call still
        // has to be checked to actually correspond with the class symbol.
        const helperCalls = this.getHelperCallsForClass(classSymbol, ['__decorate']);
        const outerDeclaration = classSymbol.declaration.valueDeclaration;
        const innerDeclaration = classSymbol.implementation.valueDeclaration;
        const adjacentDeclaration = this.getAdjacentNameOfClassSymbol(classSymbol).parent;
        const matchesClass = (identifier) => {
            const decl = this.getDeclarationOfIdentifier(identifier);
            return decl !== null &&
                (decl.node === adjacentDeclaration || decl.node === outerDeclaration ||
                    decl.node === innerDeclaration);
        };
        for (const helperCall of helperCalls) {
            if (isClassDecorateCall(helperCall, matchesClass)) {
                // This `__decorate` call is targeting the class itself.
                const helperArgs = helperCall.arguments[0];
                for (const element of helperArgs.elements) {
                    const entry = this.reflectDecorateHelperEntry(element);
                    if (entry === null) {
                        continue;
                    }
                    if (entry.type === 'decorator') {
                        // The helper arg was reflected to represent an actual decorator
                        if (this.isFromCore(entry.decorator)) {
                            (classDecorators || (classDecorators = [])).push(entry.decorator);
                        }
                    }
                    else if (entry.type === 'param:decorators') {
                        // The helper arg represents a decorator for a parameter. Since it's applied to the
                        // class, it corresponds with a constructor parameter of the class.
                        const param = getConstructorParamInfo(entry.index);
                        (param.decorators || (param.decorators = [])).push(entry.decorator);
                    }
                    else if (entry.type === 'params') {
                        // The helper arg represents the types of the parameters. Since it's applied to the
                        // class, it corresponds with the constructor parameters of the class.
                        entry.types.forEach((type, index) => getConstructorParamInfo(index).typeExpression = type);
                    }
                }
            }
            else if (isMemberDecorateCall(helperCall, matchesClass)) {
                // The `__decorate` call is targeting a member of the class
                const helperArgs = helperCall.arguments[0];
                const memberName = helperCall.arguments[2].text;
                for (const element of helperArgs.elements) {
                    const entry = this.reflectDecorateHelperEntry(element);
                    if (entry === null) {
                        continue;
                    }
                    if (entry.type === 'decorator') {
                        // The helper arg was reflected to represent an actual decorator.
                        if (this.isFromCore(entry.decorator)) {
                            const decorators = memberDecorators.has(memberName) ? memberDecorators.get(memberName) : [];
                            decorators.push(entry.decorator);
                            memberDecorators.set(memberName, decorators);
                        }
                    }
                    else {
                        // Information on decorated parameters is not interesting for ngcc, so it's ignored.
                    }
                }
            }
        }
        return { classDecorators, memberDecorators, constructorParamInfo };
    }
    /**
     * Extract the details of an entry within a `__decorate` helper call. For example, given the
     * following code:
     *
     * ```
     * __decorate([
     *   Directive({ selector: '[someDirective]' }),
     *   tslib_1.__param(2, Inject(INJECTED_TOKEN)),
     *   tslib_1.__metadata("design:paramtypes", [ViewContainerRef, TemplateRef, String])
     * ], SomeDirective);
     * ```
     *
     * it can be seen that there are calls to regular decorators (the `Directive`) and calls into
     * `tslib` functions which have been inserted by TypeScript. Therefore, this function classifies
     * a call to correspond with
     *   1. a real decorator like `Directive` above, or
     *   2. a decorated parameter, corresponding with `__param` calls from `tslib`, or
     *   3. the type information of parameters, corresponding with `__metadata` call from `tslib`
     *
     * @param expression the expression that needs to be reflected into a `DecorateHelperEntry`
     * @returns an object that indicates which of the three categories the call represents, together
     * with the reflected information of the call, or null if the call is not a valid decorate call.
     */
    reflectDecorateHelperEntry(expression) {
        // We only care about those elements that are actual calls
        if (!ts.isCallExpression(expression)) {
            return null;
        }
        const call = expression;
        const helperName = getCalleeName(call);
        if (helperName === '__metadata') {
            // This is a `tslib.__metadata` call, reflect to arguments into a `ParameterTypes` object
            // if the metadata key is "design:paramtypes".
            const key = call.arguments[0];
            if (key === undefined || !ts.isStringLiteral(key) || key.text !== 'design:paramtypes') {
                return null;
            }
            const value = call.arguments[1];
            if (value === undefined || !ts.isArrayLiteralExpression(value)) {
                return null;
            }
            return {
                type: 'params',
                types: Array.from(value.elements),
            };
        }
        if (helperName === '__param') {
            // This is a `tslib.__param` call that is reflected into a `ParameterDecorators` object.
            const indexArg = call.arguments[0];
            const index = indexArg && ts.isNumericLiteral(indexArg) ? parseInt(indexArg.text, 10) : NaN;
            if (isNaN(index)) {
                return null;
            }
            const decoratorCall = call.arguments[1];
            if (decoratorCall === undefined || !ts.isCallExpression(decoratorCall)) {
                return null;
            }
            const decorator = this.reflectDecoratorCall(decoratorCall);
            if (decorator === null) {
                return null;
            }
            return {
                type: 'param:decorators',
                index,
                decorator,
            };
        }
        // Otherwise attempt to reflect it as a regular decorator.
        const decorator = this.reflectDecoratorCall(call);
        if (decorator === null) {
            return null;
        }
        return {
            type: 'decorator',
            decorator,
        };
    }
    reflectDecoratorCall(call) {
        const decoratorExpression = call.expression;
        if (!isDecoratorIdentifier(decoratorExpression)) {
            return null;
        }
        // We found a decorator!
        const decoratorIdentifier = ts.isIdentifier(decoratorExpression) ? decoratorExpression : decoratorExpression.name;
        return {
            name: decoratorIdentifier.text,
            identifier: decoratorExpression,
            import: this.getImportOfIdentifier(decoratorIdentifier),
            node: call,
            args: Array.from(call.arguments),
        };
    }
    /**
     * Check the given statement to see if it is a call to any of the specified helper functions or
     * null if not found.
     *
     * Matching statements will look like:  `tslib_1.__decorate(...);`.
     * @param statement the statement that may contain the call.
     * @param helperNames the names of the helper we are looking for.
     * @returns the node that corresponds to the `__decorate(...)` call or null if the statement
     * does not match.
     */
    getHelperCall(statement, helperNames) {
        if ((ts.isExpressionStatement(statement) || ts.isReturnStatement(statement)) &&
            statement.expression) {
            let expression = statement.expression;
            while (isAssignment(expression)) {
                expression = expression.right;
            }
            if (ts.isCallExpression(expression)) {
                const calleeName = getCalleeName(expression);
                if (calleeName !== null && helperNames.includes(calleeName)) {
                    return expression;
                }
            }
        }
        return null;
    }
    /**
     * Reflect over the given array node and extract decorator information from each element.
     *
     * This is used for decorators that are defined in static properties. For example:
     *
     * ```
     * SomeDirective.decorators = [
     *   { type: Directive, args: [{ selector: '[someDirective]' },] }
     * ];
     * ```
     *
     * @param decoratorsArray an expression that contains decorator information.
     * @returns an array of decorator info that was reflected from the array node.
     */
    reflectDecorators(decoratorsArray) {
        const decorators = [];
        if (ts.isArrayLiteralExpression(decoratorsArray)) {
            // Add each decorator that is imported from `@angular/core` into the `decorators` array
            decoratorsArray.elements.forEach(node => {
                // If the decorator is not an object literal expression then we are not interested
                if (ts.isObjectLiteralExpression(node)) {
                    // We are only interested in objects of the form: `{ type: DecoratorType, args: [...] }`
                    const decorator = reflectObjectLiteral(node);
                    // Is the value of the `type` property an identifier?
                    if (decorator.has('type')) {
                        let decoratorType = decorator.get('type');
                        if (isDecoratorIdentifier(decoratorType)) {
                            const decoratorIdentifier = ts.isIdentifier(decoratorType) ? decoratorType : decoratorType.name;
                            decorators.push({
                                name: decoratorIdentifier.text,
                                identifier: decoratorType,
                                import: this.getImportOfIdentifier(decoratorIdentifier),
                                node,
                                args: getDecoratorArgs(node),
                            });
                        }
                    }
                }
            });
        }
        return decorators;
    }
    /**
     * Reflect over a symbol and extract the member information, combining it with the
     * provided decorator information, and whether it is a static member.
     *
     * A single symbol may represent multiple class members in the case of accessors;
     * an equally named getter/setter accessor pair is combined into a single symbol.
     * When the symbol is recognized as representing an accessor, its declarations are
     * analyzed such that both the setter and getter accessor are returned as separate
     * class members.
     *
     * One difference wrt the TypeScript host is that in ES2015, we cannot see which
     * accessor originally had any decorators applied to them, as decorators are applied
     * to the property descriptor in general, not a specific accessor. If an accessor
     * has both a setter and getter, any decorators are only attached to the setter member.
     *
     * @param symbol the symbol for the member to reflect over.
     * @param decorators an array of decorators associated with the member.
     * @param isStatic true if this member is static, false if it is an instance property.
     * @returns the reflected member information, or null if the symbol is not a member.
     */
    reflectMembers(symbol, decorators, isStatic) {
        if (symbol.flags & ts.SymbolFlags.Accessor) {
            const members = [];
            const setter = symbol.declarations && symbol.declarations.find(ts.isSetAccessor);
            const getter = symbol.declarations && symbol.declarations.find(ts.isGetAccessor);
            const setterMember = setter && this.reflectMember(setter, ClassMemberKind.Setter, decorators, isStatic);
            if (setterMember) {
                members.push(setterMember);
                // Prevent attaching the decorators to a potential getter. In ES2015, we can't tell where
                // the decorators were originally attached to, however we only want to attach them to a
                // single `ClassMember` as otherwise ngtsc would handle the same decorators twice.
                decorators = undefined;
            }
            const getterMember = getter && this.reflectMember(getter, ClassMemberKind.Getter, decorators, isStatic);
            if (getterMember) {
                members.push(getterMember);
            }
            return members;
        }
        let kind = null;
        if (symbol.flags & ts.SymbolFlags.Method) {
            kind = ClassMemberKind.Method;
        }
        else if (symbol.flags & ts.SymbolFlags.Property) {
            kind = ClassMemberKind.Property;
        }
        const node = symbol.valueDeclaration || symbol.declarations && symbol.declarations[0];
        if (!node) {
            // If the symbol has been imported from a TypeScript typings file then the compiler
            // may pass the `prototype` symbol as an export of the class.
            // But this has no declaration. In this case we just quietly ignore it.
            return null;
        }
        const member = this.reflectMember(node, kind, decorators, isStatic);
        if (!member) {
            return null;
        }
        return [member];
    }
    /**
     * Reflect over a symbol and extract the member information, combining it with the
     * provided decorator information, and whether it is a static member.
     * @param node the declaration node for the member to reflect over.
     * @param kind the assumed kind of the member, may become more accurate during reflection.
     * @param decorators an array of decorators associated with the member.
     * @param isStatic true if this member is static, false if it is an instance property.
     * @returns the reflected member information, or null if the symbol is not a member.
     */
    reflectMember(node, kind, decorators, isStatic) {
        let value = null;
        let name = null;
        let nameNode = null;
        if (!isClassMemberType(node)) {
            return null;
        }
        if (isStatic && isPropertyAccess(node)) {
            name = node.name.text;
            value = kind === ClassMemberKind.Property ? node.parent.right : null;
        }
        else if (isThisAssignment(node)) {
            kind = ClassMemberKind.Property;
            name = node.left.name.text;
            value = node.right;
            isStatic = false;
        }
        else if (ts.isConstructorDeclaration(node)) {
            kind = ClassMemberKind.Constructor;
            name = 'constructor';
            isStatic = false;
        }
        if (kind === null) {
            this.logger.warn(`Unknown member type: "${node.getText()}`);
            return null;
        }
        if (!name) {
            if (isNamedDeclaration(node)) {
                name = node.name.text;
                nameNode = node.name;
            }
            else {
                return null;
            }
        }
        // If we have still not determined if this is a static or instance member then
        // look for the `static` keyword on the declaration
        if (isStatic === undefined) {
            isStatic = node.modifiers !== undefined &&
                node.modifiers.some(mod => mod.kind === ts.SyntaxKind.StaticKeyword);
        }
        const type = node.type || null;
        return {
            node,
            implementation: node,
            kind,
            type,
            name,
            nameNode,
            value,
            isStatic,
            decorators: decorators || []
        };
    }
    /**
     * Find the declarations of the constructor parameters of a class identified by its symbol.
     * @param classSymbol the class whose parameters we want to find.
     * @returns an array of `ts.ParameterDeclaration` objects representing each of the parameters in
     * the class's constructor or null if there is no constructor.
     */
    getConstructorParameterDeclarations(classSymbol) {
        const members = classSymbol.implementation.members;
        if (members && members.has(CONSTRUCTOR)) {
            const constructorSymbol = members.get(CONSTRUCTOR);
            // For some reason the constructor does not have a `valueDeclaration` ?!?
            const constructor = constructorSymbol.declarations &&
                constructorSymbol.declarations[0];
            if (!constructor) {
                return [];
            }
            if (constructor.parameters.length > 0) {
                return Array.from(constructor.parameters);
            }
            if (isSynthesizedConstructor(constructor)) {
                return null;
            }
            return [];
        }
        return null;
    }
    /**
     * Get the parameter decorators of a class constructor.
     *
     * @param classSymbol the class whose parameter info we want to get.
     * @param parameterNodes the array of TypeScript parameter nodes for this class's constructor.
     * @returns an array of constructor parameter info objects.
     */
    getConstructorParamInfo(classSymbol, parameterNodes) {
        const { constructorParamInfo } = this.acquireDecoratorInfo(classSymbol);
        return parameterNodes.map((node, index) => {
            const { decorators, typeExpression } = constructorParamInfo[index] ?
                constructorParamInfo[index] :
                { decorators: null, typeExpression: null };
            const nameNode = node.name;
            const typeValueReference = this.typeToValue(typeExpression);
            return {
                name: getNameText(nameNode),
                nameNode,
                typeValueReference,
                typeNode: null,
                decorators
            };
        });
    }
    /**
     * Compute the `TypeValueReference` for the given `typeExpression`.
     *
     * Although `typeExpression` is a valid `ts.Expression` that could be emitted directly into the
     * generated code, ngcc still needs to resolve the declaration and create an `IMPORTED` type
     * value reference as the compiler has specialized handling for some symbols, for example
     * `ChangeDetectorRef` from `@angular/core`. Such an `IMPORTED` type value reference will result
     * in a newly generated namespace import, instead of emitting the original `typeExpression` as is.
     */
    typeToValue(typeExpression) {
        if (typeExpression === null) {
            return {
                kind: 2 /* UNAVAILABLE */,
                reason: { kind: 0 /* MISSING_TYPE */ },
            };
        }
        const imp = this.getImportOfExpression(typeExpression);
        const decl = this.getDeclarationOfExpression(typeExpression);
        if (imp === null || decl === null) {
            return {
                kind: 0 /* LOCAL */,
                expression: typeExpression,
                defaultImportStatement: null,
            };
        }
        return {
            kind: 1 /* IMPORTED */,
            valueDeclaration: decl.node,
            moduleName: imp.from,
            importedName: imp.name,
            nestedPath: null,
        };
    }
    /**
     * Determines where the `expression` is imported from.
     *
     * @param expression the expression to determine the import details for.
     * @returns the `Import` for the expression, or `null` if the expression is not imported or the
     * expression syntax is not supported.
     */
    getImportOfExpression(expression) {
        if (ts.isIdentifier(expression)) {
            return this.getImportOfIdentifier(expression);
        }
        else if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.name)) {
            return this.getImportOfIdentifier(expression.name);
        }
        else {
            return null;
        }
    }
    /**
     * Get the parameter type and decorators for the constructor of a class,
     * where the information is stored on a static property of the class.
     *
     * Note that in ESM2015, the property is defined an array, or by an arrow function that returns
     * an array, of decorator and type information.
     *
     * For example,
     *
     * ```
     * SomeDirective.ctorParameters = () => [
     *   {type: ViewContainerRef},
     *   {type: TemplateRef},
     *   {type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN]}]},
     * ];
     * ```
     *
     * or
     *
     * ```
     * SomeDirective.ctorParameters = [
     *   {type: ViewContainerRef},
     *   {type: TemplateRef},
     *   {type: undefined, decorators: [{type: Inject, args: [INJECTED_TOKEN]}]},
     * ];
     * ```
     *
     * @param paramDecoratorsProperty the property that holds the parameter info we want to get.
     * @returns an array of objects containing the type and decorators for each parameter.
     */
    getParamInfoFromStaticProperty(paramDecoratorsProperty) {
        const paramDecorators = getPropertyValueFromSymbol(paramDecoratorsProperty);
        if (paramDecorators) {
            // The decorators array may be wrapped in an arrow function. If so unwrap it.
            const container = ts.isArrowFunction(paramDecorators) ? paramDecorators.body : paramDecorators;
            if (ts.isArrayLiteralExpression(container)) {
                const elements = container.elements;
                return elements
                    .map(element => ts.isObjectLiteralExpression(element) ? reflectObjectLiteral(element) : null)
                    .map(paramInfo => {
                    const typeExpression = paramInfo && paramInfo.has('type') ? paramInfo.get('type') : null;
                    const decoratorInfo = paramInfo && paramInfo.has('decorators') ? paramInfo.get('decorators') : null;
                    const decorators = decoratorInfo &&
                        this.reflectDecorators(decoratorInfo)
                            .filter(decorator => this.isFromCore(decorator));
                    return { typeExpression, decorators };
                });
            }
            else if (paramDecorators !== undefined) {
                this.logger.warn('Invalid constructor parameter decorator in ' +
                    paramDecorators.getSourceFile().fileName + ':\n', paramDecorators.getText());
            }
        }
        return null;
    }
    /**
     * Search statements related to the given class for calls to the specified helper.
     * @param classSymbol the class whose helper calls we are interested in.
     * @param helperNames the names of the helpers (e.g. `__decorate`) whose calls we are interested
     * in.
     * @returns an array of CallExpression nodes for each matching helper call.
     */
    getHelperCallsForClass(classSymbol, helperNames) {
        return this.getStatementsForClass(classSymbol)
            .map(statement => this.getHelperCall(statement, helperNames))
            .filter(isDefined);
    }
    /**
     * Find statements related to the given class that may contain calls to a helper.
     *
     * In ESM2015 code the helper calls are in the top level module, so we have to consider
     * all the statements in the module.
     *
     * @param classSymbol the class whose helper calls we are interested in.
     * @returns an array of statements that may contain helper calls.
     */
    getStatementsForClass(classSymbol) {
        const classNode = classSymbol.implementation.valueDeclaration;
        if (isTopLevel(classNode)) {
            return this.getModuleStatements(classNode.getSourceFile());
        }
        const statement = getContainingStatement(classNode);
        if (ts.isBlock(statement.parent)) {
            return Array.from(statement.parent.statements);
        }
        // We should never arrive here
        throw new Error(`Unable to find adjacent statements for ${classSymbol.name}`);
    }
    /**
     * Test whether a decorator was imported from `@angular/core`.
     *
     * Is the decorator:
     * * externally imported from `@angular/core`?
     * * the current hosted program is actually `@angular/core` and
     *   - relatively internally imported; or
     *   - not imported, from the current file.
     *
     * @param decorator the decorator to test.
     */
    isFromCore(decorator) {
        if (this.isCore) {
            return !decorator.import || /^\./.test(decorator.import.from);
        }
        else {
            return !!decorator.import && decorator.import.from === '@angular/core';
        }
    }
    /**
     * Create a mapping between the public exports in a src program and the public exports of a dts
     * program.
     *
     * @param src the program bundle containing the source files.
     * @param dts the program bundle containing the typings files.
     * @returns a map of source declarations to typings declarations.
     */
    computePublicDtsDeclarationMap(src, dts) {
        const declarationMap = new Map();
        const dtsDeclarationMap = new Map();
        const rootDts = getRootFileOrFail(dts);
        this.collectDtsExportedDeclarations(dtsDeclarationMap, rootDts, dts.program.getTypeChecker());
        const rootSrc = getRootFileOrFail(src);
        this.collectSrcExportedDeclarations(declarationMap, dtsDeclarationMap, rootSrc);
        return declarationMap;
    }
    /**
     * Create a mapping between the "private" exports in a src program and the "private" exports of a
     * dts program. These exports may be exported from individual files in the src or dts programs,
     * but not exported from the root file (i.e publicly from the entry-point).
     *
     * This mapping is a "best guess" since we cannot guarantee that two declarations that happen to
     * be exported from a file with the same name are actually equivalent. But this is a reasonable
     * estimate for the purposes of ngcc.
     *
     * @param src the program bundle containing the source files.
     * @param dts the program bundle containing the typings files.
     * @returns a map of source declarations to typings declarations.
     */
    computePrivateDtsDeclarationMap(src, dts) {
        const declarationMap = new Map();
        const dtsDeclarationMap = new Map();
        const typeChecker = dts.program.getTypeChecker();
        const dtsFiles = getNonRootPackageFiles(dts);
        for (const dtsFile of dtsFiles) {
            this.collectDtsExportedDeclarations(dtsDeclarationMap, dtsFile, typeChecker);
        }
        const srcFiles = getNonRootPackageFiles(src);
        for (const srcFile of srcFiles) {
            this.collectSrcExportedDeclarations(declarationMap, dtsDeclarationMap, srcFile);
        }
        return declarationMap;
    }
    /**
     * Collect mappings between names of exported declarations in a file and its actual declaration.
     *
     * Any new mappings are added to the `dtsDeclarationMap`.
     */
    collectDtsExportedDeclarations(dtsDeclarationMap, srcFile, checker) {
        const srcModule = srcFile && checker.getSymbolAtLocation(srcFile);
        const moduleExports = srcModule && checker.getExportsOfModule(srcModule);
        if (moduleExports) {
            moduleExports.forEach(exportedSymbol => {
                const name = exportedSymbol.name;
                if (exportedSymbol.flags & ts.SymbolFlags.Alias) {
                    exportedSymbol = checker.getAliasedSymbol(exportedSymbol);
                }
                const declaration = exportedSymbol.valueDeclaration;
                if (declaration && !dtsDeclarationMap.has(name)) {
                    dtsDeclarationMap.set(name, declaration);
                }
            });
        }
    }
    collectSrcExportedDeclarations(declarationMap, dtsDeclarationMap, srcFile) {
        const fileExports = this.getExportsOfModule(srcFile);
        if (fileExports !== null) {
            for (const [exportName, { node: declarationNode }] of fileExports) {
                if (dtsDeclarationMap.has(exportName)) {
                    declarationMap.set(declarationNode, dtsDeclarationMap.get(exportName));
                }
            }
        }
    }
    getDeclarationOfExpression(expression) {
        if (ts.isIdentifier(expression)) {
            return this.getDeclarationOfIdentifier(expression);
        }
        if (!ts.isPropertyAccessExpression(expression) || !ts.isIdentifier(expression.expression)) {
            return null;
        }
        const namespaceDecl = this.getDeclarationOfIdentifier(expression.expression);
        if (!namespaceDecl || !ts.isSourceFile(namespaceDecl.node)) {
            return null;
        }
        const namespaceExports = this.getExportsOfModule(namespaceDecl.node);
        if (namespaceExports === null) {
            return null;
        }
        if (!namespaceExports.has(expression.name.text)) {
            return null;
        }
        const exportDecl = namespaceExports.get(expression.name.text);
        return Object.assign(Object.assign({}, exportDecl), { viaModule: namespaceDecl.viaModule });
    }
    /** Checks if the specified declaration resolves to the known JavaScript global `Object`. */
    isJavaScriptObjectDeclaration(decl) {
        const node = decl.node;
        // The default TypeScript library types the global `Object` variable through
        // a variable declaration with a type reference resolving to `ObjectConstructor`.
        if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) ||
            node.name.text !== 'Object' || node.type === undefined) {
            return false;
        }
        const typeNode = node.type;
        // If the variable declaration does not have a type resolving to `ObjectConstructor`,
        // we cannot guarantee that the declaration resolves to the global `Object` variable.
        if (!ts.isTypeReferenceNode(typeNode) || !ts.isIdentifier(typeNode.typeName) ||
            typeNode.typeName.text !== 'ObjectConstructor') {
            return false;
        }
        // Finally, check if the type definition for `Object` originates from a default library
        // definition file. This requires default types to be enabled for the host program.
        return this.src.program.isSourceFileDefaultLibrary(node.getSourceFile());
    }
    /**
     * In JavaScript, enum declarations are emitted as a regular variable declaration followed by an
     * IIFE in which the enum members are assigned.
     *
     *   export var Enum;
     *   (function (Enum) {
     *     Enum["a"] = "A";
     *     Enum["b"] = "B";
     *   })(Enum || (Enum = {}));
     *
     * @param declaration A variable declaration that may represent an enum
     * @returns An array of enum members if the variable declaration is followed by an IIFE that
     * declares the enum members, or null otherwise.
     */
    resolveEnumMembers(declaration) {
        // Initialized variables don't represent enum declarations.
        if (declaration.initializer !== undefined)
            return null;
        const variableStmt = declaration.parent.parent;
        if (!ts.isVariableStatement(variableStmt))
            return null;
        const block = variableStmt.parent;
        if (!ts.isBlock(block) && !ts.isSourceFile(block))
            return null;
        const declarationIndex = block.statements.findIndex(statement => statement === variableStmt);
        if (declarationIndex === -1 || declarationIndex === block.statements.length - 1)
            return null;
        const subsequentStmt = block.statements[declarationIndex + 1];
        if (!ts.isExpressionStatement(subsequentStmt))
            return null;
        const iife = stripParentheses(subsequentStmt.expression);
        if (!ts.isCallExpression(iife) || !isEnumDeclarationIife(iife))
            return null;
        const fn = stripParentheses(iife.expression);
        if (!ts.isFunctionExpression(fn))
            return null;
        return this.reflectEnumMembers(fn);
    }
    /**
     * Attempts to extract all `EnumMember`s from a function that is according to the JavaScript emit
     * format for enums:
     *
     *   function (Enum) {
     *     Enum["MemberA"] = "a";
     *     Enum["MemberB"] = "b";
     *   }
     *
     * @param fn The function expression that is assumed to contain enum members.
     * @returns All enum members if the function is according to the correct syntax, null otherwise.
     */
    reflectEnumMembers(fn) {
        if (fn.parameters.length !== 1)
            return null;
        const enumName = fn.parameters[0].name;
        if (!ts.isIdentifier(enumName))
            return null;
        const enumMembers = [];
        for (const statement of fn.body.statements) {
            const enumMember = this.reflectEnumMember(enumName, statement);
            if (enumMember === null) {
                return null;
            }
            enumMembers.push(enumMember);
        }
        return enumMembers;
    }
    /**
     * Attempts to extract a single `EnumMember` from a statement in the following syntax:
     *
     *   Enum["MemberA"] = "a";
     *
     * or, for enum member with numeric values:
     *
     *   Enum[Enum["MemberA"] = 0] = "MemberA";
     *
     * @param enumName The identifier of the enum that the members should be set on.
     * @param statement The statement to inspect.
     * @returns An `EnumMember` if the statement is according to the expected syntax, null otherwise.
     */
    reflectEnumMember(enumName, statement) {
        if (!ts.isExpressionStatement(statement))
            return null;
        const expression = statement.expression;
        // Check for the `Enum[X] = Y;` case.
        if (!isEnumAssignment(enumName, expression)) {
            return null;
        }
        const assignment = reflectEnumAssignment(expression);
        if (assignment != null) {
            return assignment;
        }
        // Check for the `Enum[Enum[X] = Y] = ...;` case.
        const innerExpression = expression.left.argumentExpression;
        if (!isEnumAssignment(enumName, innerExpression)) {
            return null;
        }
        return reflectEnumAssignment(innerExpression);
    }
    getAdjacentNameOfClassSymbol(classSymbol) {
        if (classSymbol.adjacent !== undefined) {
            return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.adjacent.valueDeclaration);
        }
        else {
            return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.implementation.valueDeclaration);
        }
    }
}
///////////// Exported Helpers /////////////
/**
 * Checks whether the iife has the following call signature:
 *
 *   (Enum || (Enum = {})
 *
 * Note that the `Enum` identifier is not checked, as it could also be something
 * like `exports.Enum`. Instead, only the structure of binary operators is checked.
 *
 * @param iife The call expression to check.
 * @returns true if the iife has a call signature that corresponds with a potential
 * enum declaration.
 */
function isEnumDeclarationIife(iife) {
    if (iife.arguments.length !== 1)
        return false;
    const arg = iife.arguments[0];
    if (!ts.isBinaryExpression(arg) || arg.operatorToken.kind !== ts.SyntaxKind.BarBarToken ||
        !ts.isParenthesizedExpression(arg.right)) {
        return false;
    }
    const right = arg.right.expression;
    if (!ts.isBinaryExpression(right) || right.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
        return false;
    }
    if (!ts.isObjectLiteralExpression(right.right) || right.right.properties.length !== 0) {
        return false;
    }
    return true;
}
/**
 * Checks whether the expression looks like an enum member assignment targeting `Enum`:
 *
 *   Enum[X] = Y;
 *
 * Here, X and Y can be any expression.
 *
 * @param enumName The identifier of the enum that the members should be set on.
 * @param expression The expression that should be checked to conform to the above form.
 * @returns true if the expression is of the correct form, false otherwise.
 */
function isEnumAssignment(enumName, expression) {
    if (!ts.isBinaryExpression(expression) ||
        expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
        !ts.isElementAccessExpression(expression.left)) {
        return false;
    }
    // Verify that the outer assignment corresponds with the enum declaration.
    const enumIdentifier = expression.left.expression;
    return ts.isIdentifier(enumIdentifier) && enumIdentifier.text === enumName.text;
}
/**
 * Attempts to create an `EnumMember` from an expression that is believed to represent an enum
 * assignment.
 *
 * @param expression The expression that is believed to be an enum assignment.
 * @returns An `EnumMember` or null if the expression did not represent an enum member after all.
 */
function reflectEnumAssignment(expression) {
    const memberName = expression.left.argumentExpression;
    if (!ts.isPropertyName(memberName))
        return null;
    return { name: memberName, initializer: expression.right };
}
/**
 * Test whether a statement node is an assignment statement.
 * @param statement the statement to test.
 */
export function isAssignmentStatement(statement) {
    return ts.isExpressionStatement(statement) && isAssignment(statement.expression) &&
        ts.isIdentifier(statement.expression.left);
}
/**
 * Parse the `expression` that is believed to be an IIFE and return the AST node that corresponds to
 * the body of the IIFE.
 *
 * The expression may be wrapped in parentheses, which are stripped off.
 *
 * If the IIFE is an arrow function then its body could be a `ts.Expression` rather than a
 * `ts.FunctionBody`.
 *
 * @param expression the expression to parse.
 * @returns the `ts.Expression` or `ts.FunctionBody` that holds the body of the IIFE or `undefined`
 *     if the `expression` did not have the correct shape.
 */
export function getIifeBody(expression) {
    const call = stripParentheses(expression);
    if (!ts.isCallExpression(call)) {
        return undefined;
    }
    const fn = stripParentheses(call.expression);
    if (!ts.isFunctionExpression(fn) && !ts.isArrowFunction(fn)) {
        return undefined;
    }
    return fn.body;
}
/**
 * Returns true if the `node` is an assignment of the form `a = b`.
 *
 * @param node The AST node to check.
 */
export function isAssignment(node) {
    return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken;
}
/**
 * Tests whether the provided call expression targets a class, by verifying its arguments are
 * according to the following form:
 *
 * ```
 * __decorate([], SomeDirective);
 * ```
 *
 * @param call the call expression that is tested to represent a class decorator call.
 * @param matches predicate function to test whether the call is associated with the desired class.
 */
export function isClassDecorateCall(call, matches) {
    const helperArgs = call.arguments[0];
    if (helperArgs === undefined || !ts.isArrayLiteralExpression(helperArgs)) {
        return false;
    }
    const target = call.arguments[1];
    return target !== undefined && ts.isIdentifier(target) && matches(target);
}
/**
 * Tests whether the provided call expression targets a member of the class, by verifying its
 * arguments are according to the following form:
 *
 * ```
 * __decorate([], SomeDirective.prototype, "member", void 0);
 * ```
 *
 * @param call the call expression that is tested to represent a member decorator call.
 * @param matches predicate function to test whether the call is associated with the desired class.
 */
export function isMemberDecorateCall(call, matches) {
    const helperArgs = call.arguments[0];
    if (helperArgs === undefined || !ts.isArrayLiteralExpression(helperArgs)) {
        return false;
    }
    const target = call.arguments[1];
    if (target === undefined || !ts.isPropertyAccessExpression(target) ||
        !ts.isIdentifier(target.expression) || !matches(target.expression) ||
        target.name.text !== 'prototype') {
        return false;
    }
    const memberName = call.arguments[2];
    return memberName !== undefined && ts.isStringLiteral(memberName);
}
/**
 * Helper method to extract the value of a property given the property's "symbol",
 * which is actually the symbol of the identifier of the property.
 */
export function getPropertyValueFromSymbol(propSymbol) {
    const propIdentifier = propSymbol.valueDeclaration;
    const parent = propIdentifier && propIdentifier.parent;
    return parent && ts.isBinaryExpression(parent) ? parent.right : undefined;
}
/**
 * A callee could be one of: `__decorate(...)` or `tslib_1.__decorate`.
 */
function getCalleeName(call) {
    if (ts.isIdentifier(call.expression)) {
        return stripDollarSuffix(call.expression.text);
    }
    if (ts.isPropertyAccessExpression(call.expression)) {
        return stripDollarSuffix(call.expression.name.text);
    }
    return null;
}
function isInitializedVariableClassDeclaration(node) {
    return isNamedVariableDeclaration(node) && node.initializer !== undefined;
}
/**
 * Handle a variable declaration of the form
 *
 * ```
 * var MyClass = alias1 = alias2 = <<declaration>>
 * ```
 *
 * @param node the LHS of a variable declaration.
 * @returns the original AST node or the RHS of a series of assignments in a variable
 *     declaration.
 */
export function skipClassAliases(node) {
    let expression = node.initializer;
    while (isAssignment(expression)) {
        expression = expression.right;
    }
    return expression;
}
/**
 * This expression could either be a class expression
 *
 * ```
 * class MyClass {};
 * ```
 *
 * or an IIFE wrapped class expression
 *
 * ```
 * (() => {
 *   class MyClass {}
 *   ...
 *   return MyClass;
 * })()
 * ```
 *
 * or an IIFE wrapped aliased class expression
 *
 * ```
 * (() => {
 *   let MyClass = class MyClass {}
 *   ...
 *   return MyClass;
 * })()
 * ```
 *
 * or an IFFE wrapped ES5 class function
 *
 * ```
 * (function () {
 *  function MyClass() {}
 *  ...
 *  return MyClass
 * })()
 * ```
 *
 * @param expression the node that represents the class whose declaration we are finding.
 * @returns the declaration of the class or `null` if it is not a "class".
 */
export function getInnerClassDeclaration(expression) {
    if (ts.isClassExpression(expression) && hasNameIdentifier(expression)) {
        return expression;
    }
    const iifeBody = getIifeBody(expression);
    if (iifeBody === undefined) {
        return null;
    }
    if (!ts.isBlock(iifeBody)) {
        // Handle the fat arrow expression case: `() => ClassExpression`
        return ts.isClassExpression(iifeBody) && isNamedDeclaration(iifeBody) ? iifeBody : null;
    }
    else {
        // Handle the case of a normal or fat-arrow function with a body.
        // Return the first ClassDeclaration/VariableDeclaration inside the body
        for (const statement of iifeBody.statements) {
            if (isNamedClassDeclaration(statement) || isNamedFunctionDeclaration(statement)) {
                return statement;
            }
            if (ts.isVariableStatement(statement)) {
                for (const declaration of statement.declarationList.declarations) {
                    if (isInitializedVariableClassDeclaration(declaration)) {
                        const expression = skipClassAliases(declaration);
                        if (ts.isClassExpression(expression) && hasNameIdentifier(expression)) {
                            return expression;
                        }
                    }
                }
            }
        }
    }
    return null;
}
function getDecoratorArgs(node) {
    // The arguments of a decorator are held in the `args` property of its declaration object.
    const argsProperty = node.properties.filter(ts.isPropertyAssignment)
        .find(property => getNameText(property.name) === 'args');
    const argsExpression = argsProperty && argsProperty.initializer;
    return argsExpression && ts.isArrayLiteralExpression(argsExpression) ?
        Array.from(argsExpression.elements) :
        [];
}
function isPropertyAccess(node) {
    return !!node.parent && ts.isBinaryExpression(node.parent) && ts.isPropertyAccessExpression(node);
}
function isThisAssignment(node) {
    return ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left) &&
        node.left.expression.kind === ts.SyntaxKind.ThisKeyword;
}
function isNamedDeclaration(node) {
    const anyNode = node;
    return !!anyNode.name && ts.isIdentifier(anyNode.name);
}
function isClassMemberType(node) {
    return (ts.isClassElement(node) || isPropertyAccess(node) || ts.isBinaryExpression(node)) &&
        // Additionally, ensure `node` is not an index signature, for example on an abstract class:
        // `abstract class Foo { [key: string]: any; }`
        !ts.isIndexSignatureDeclaration(node);
}
/**
 * Attempt to resolve the variable declaration that the given declaration is assigned to.
 * For example, for the following code:
 *
 * ```
 * var MyClass = MyClass_1 = class MyClass {};
 * ```
 *
 * or
 *
 * ```
 * var MyClass = MyClass_1 = (() => {
 *   class MyClass {}
 *   ...
 *   return MyClass;
 * })()
  ```
 *
 * and the provided declaration being `class MyClass {}`, this will return the `var MyClass`
 * declaration.
 *
 * @param declaration The declaration for which any variable declaration should be obtained.
 * @returns the outer variable declaration if found, undefined otherwise.
 */
function getFarLeftHandSideOfAssignment(declaration) {
    let node = declaration.parent;
    // Detect an intermediary variable assignment and skip over it.
    if (isAssignment(node) && ts.isIdentifier(node.left)) {
        node = node.parent;
    }
    return ts.isVariableDeclaration(node) ? node : undefined;
}
function getContainingVariableDeclaration(node) {
    node = node.parent;
    while (node !== undefined) {
        if (isNamedVariableDeclaration(node)) {
            return node;
        }
        node = node.parent;
    }
    return undefined;
}
/**
 * A constructor function may have been "synthesized" by TypeScript during JavaScript emit,
 * in the case no user-defined constructor exists and e.g. property initializers are used.
 * Those initializers need to be emitted into a constructor in JavaScript, so the TypeScript
 * compiler generates a synthetic constructor.
 *
 * We need to identify such constructors as ngcc needs to be able to tell if a class did
 * originally have a constructor in the TypeScript source. When a class has a superclass,
 * a synthesized constructor must not be considered as a user-defined constructor as that
 * prevents a base factory call from being created by ngtsc, resulting in a factory function
 * that does not inject the dependencies of the superclass. Hence, we identify a default
 * synthesized super call in the constructor body, according to the structure that TypeScript
 * emits during JavaScript emit:
 * https://github.com/Microsoft/TypeScript/blob/v3.2.2/src/compiler/transformers/ts.ts#L1068-L1082
 *
 * @param constructor a constructor function to test
 * @returns true if the constructor appears to have been synthesized
 */
function isSynthesizedConstructor(constructor) {
    if (!constructor.body)
        return false;
    const firstStatement = constructor.body.statements[0];
    if (!firstStatement || !ts.isExpressionStatement(firstStatement))
        return false;
    return isSynthesizedSuperCall(firstStatement.expression);
}
/**
 * Tests whether the expression appears to have been synthesized by TypeScript, i.e. whether
 * it is of the following form:
 *
 * ```
 * super(...arguments);
 * ```
 *
 * @param expression the expression that is to be tested
 * @returns true if the expression appears to be a synthesized super call
 */
function isSynthesizedSuperCall(expression) {
    if (!ts.isCallExpression(expression))
        return false;
    if (expression.expression.kind !== ts.SyntaxKind.SuperKeyword)
        return false;
    if (expression.arguments.length !== 1)
        return false;
    const argument = expression.arguments[0];
    return ts.isSpreadElement(argument) && ts.isIdentifier(argument.expression) &&
        argument.expression.text === 'arguments';
}
/**
 * Find the statement that contains the given node
 * @param node a node whose containing statement we wish to find
 */
export function getContainingStatement(node) {
    while (node.parent) {
        if (ts.isBlock(node.parent) || ts.isSourceFile(node.parent)) {
            break;
        }
        node = node.parent;
    }
    return node;
}
function getRootFileOrFail(bundle) {
    const rootFile = bundle.program.getSourceFile(bundle.path);
    if (rootFile === undefined) {
        throw new Error(`The given rootPath ${rootFile} is not a file of the program.`);
    }
    return rootFile;
}
function getNonRootPackageFiles(bundle) {
    const rootFile = bundle.program.getSourceFile(bundle.path);
    return bundle.program.getSourceFiles().filter(f => (f !== rootFile) && isWithinPackage(bundle.package, absoluteFromSourceFile(f)));
}
function isTopLevel(node) {
    while (node = node.parent) {
        if (ts.isBlock(node)) {
            return false;
        }
    }
    return true;
}
/**
 * Get a node that represents the actual (outer) declaration of a class from its implementation.
 *
 * Sometimes, the implementation of a class is an expression that is hidden inside an IIFE and
 * assigned to a variable outside the IIFE, which is what the rest of the program interacts with.
 * For example,
 *
 * ```
 * OuterNode = Alias = (function() { function InnerNode() {} return InnerNode; })();
 * ```
 *
 * @param node a node that could be the implementation inside an IIFE.
 * @returns a node that represents the outer declaration, or `null` if it is does not match the IIFE
 *     format shown above.
 */
export function getOuterNodeFromInnerDeclaration(node) {
    if (!ts.isFunctionDeclaration(node) && !ts.isClassDeclaration(node) &&
        !ts.isVariableStatement(node)) {
        return null;
    }
    // It might be the function expression inside the IIFE. We need to go 5 levels up...
    // - IIFE body.
    let outerNode = node.parent;
    if (!outerNode || !ts.isBlock(outerNode))
        return null;
    // - IIFE function expression.
    outerNode = outerNode.parent;
    if (!outerNode || (!ts.isFunctionExpression(outerNode) && !ts.isArrowFunction(outerNode))) {
        return null;
    }
    outerNode = outerNode.parent;
    // - Parenthesis inside IIFE.
    if (outerNode && ts.isParenthesizedExpression(outerNode))
        outerNode = outerNode.parent;
    // - IIFE call expression.
    if (!outerNode || !ts.isCallExpression(outerNode))
        return null;
    outerNode = outerNode.parent;
    // - Parenthesis around IIFE.
    if (outerNode && ts.isParenthesizedExpression(outerNode))
        outerNode = outerNode.parent;
    // - Skip any aliases between the IIFE and the far left hand side of any assignments.
    while (isAssignment(outerNode.parent)) {
        outerNode = outerNode.parent;
    }
    return outerNode;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRWpDLE9BQU8sRUFBQyxzQkFBc0IsRUFBQyxNQUFNLGdDQUFnQyxDQUFDO0FBRXRFLE9BQU8sRUFBZ0MsZUFBZSxFQUE4RSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSwwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBMEIsd0JBQXdCLEVBQW1FLE1BQU0sK0JBQStCLENBQUM7QUFDcGMsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBRWpELE9BQU8sRUFBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUUvRixPQUFPLEVBQWMsK0JBQStCLEVBQXVDLGFBQWEsRUFBZ0MsTUFBTSxhQUFhLENBQUM7QUFDNUosT0FBTyxFQUFDLGdCQUFnQixFQUFDLE1BQU0sU0FBUyxDQUFDO0FBRXpDLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxZQUEyQixDQUFDO0FBQ3RELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxnQkFBK0IsQ0FBQztBQUMvRCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsZUFBOEIsQ0FBQztBQUMxRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxnQkFBK0IsQ0FBQztBQUVsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0EwQkc7QUFDSCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsd0JBQXdCO0lBZ0RqRSxZQUNjLE1BQWMsRUFBWSxNQUFl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b3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvbG9nZ2luZyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIEN0b3JQYXJhbWV0ZXIsIERlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbk5vZGUsIERlY29yYXRvciwgRW51bU1lbWJlciwgSW1wb3J0LCBpc0NvbmNyZXRlRGVjbGFyYXRpb24sIGlzRGVjb3JhdG9ySWRlbnRpZmllciwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uLCBpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbiwgS25vd25EZWNsYXJhdGlvbiwgcmVmbGVjdE9iamVjdExpdGVyYWwsIFNwZWNpYWxEZWNsYXJhdGlvbktpbmQsIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCwgVHlwZVZhbHVlUmVmZXJlbmNlLCBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLCBWYWx1ZVVuYXZhaWxhYmxlS2luZH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4uL2FuYWx5c2lzL3V0aWwnO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtfSBmcm9tICcuLi9wYWNrYWdlcy9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge2ZpbmRBbGwsIGdldE5hbWVUZXh0LCBoYXNOYW1lSWRlbnRpZmllciwgaXNEZWZpbmVkLCBzdHJpcERvbGxhclN1ZmZpeH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0NsYXNzU3ltYm9sLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uLCBOZ2NjQ2xhc3NTeW1ib2wsIE5nY2NSZWZsZWN0aW9uSG9zdCwgUFJFX1IzX01BUktFUiwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4vbmdjY19ob3N0JztcbmltcG9ydCB7c3RyaXBQYXJlbnRoZXNlc30gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjb25zdCBERUNPUkFUT1JTID0gJ2RlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IFBST1BfREVDT1JBVE9SUyA9ICdwcm9wRGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1IgPSAnX19jb25zdHJ1Y3RvcicgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1JfUEFSQU1TID0gJ2N0b3JQYXJhbWV0ZXJzJyBhcyB0cy5fX1N0cmluZztcblxuLyoqXG4gKiBFc20yMDE1IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCAyMDE1IGNsYXNzZXMsIGV0Yy5cbiAqIERlY29yYXRvcnMgYXJlIGRlZmluZWQgdmlhIHN0YXRpYyBwcm9wZXJ0aWVzIG9uIHRoZSBjbGFzcy4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBjbGFzcyBTb21lRGlyZWN0aXZlIHtcbiAqIH1cbiAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gKiBdO1xuICogU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9ycyA9IHtcbiAqICAgXCJpbnB1dDFcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogICBcImlucHV0MlwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiB9O1xuICogYGBgXG4gKlxuICogKiBDbGFzc2VzIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICAvKipcbiAgICogQSBtYXBwaW5nIGZyb20gc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucywgd2hpY2ggYXJlIGJvdGggcHVibGljbHkgZXhwb3J0ZWQuXG4gICAqXG4gICAqIFRoZXJlIHNob3VsZCBiZSBvbmUgZW50cnkgZm9yIGV2ZXJ5IHB1YmxpYyBleHBvcnQgdmlzaWJsZSBmcm9tIHRoZSByb290IGZpbGUgb2YgdGhlIHNvdXJjZVxuICAgKiB0cmVlLiBOb3RlIHRoYXQgYnkgZGVmaW5pdGlvbiB0aGUga2V5IGFuZCB2YWx1ZSBkZWNsYXJhdGlvbnMgd2lsbCBub3QgYmUgaW4gdGhlIHNhbWUgVFNcbiAgICogcHJvZ3JhbS5cbiAgICovXG4gIHByb3RlY3RlZCBwdWJsaWNEdHNEZWNsYXJhdGlvbk1hcDogTWFwPERlY2xhcmF0aW9uTm9kZSwgdHMuRGVjbGFyYXRpb24+fG51bGwgPSBudWxsO1xuICAvKipcbiAgICogQSBtYXBwaW5nIGZyb20gc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucywgd2hpY2ggYXJlIG5vdCBwdWJsaWNseSBleHBvcnRlZC5cbiAgICpcbiAgICogVGhpcyBtYXBwaW5nIGlzIGEgYmVzdCBndWVzcyBiZXR3ZWVuIGRlY2xhcmF0aW9ucyB0aGF0IGhhcHBlbiB0byBiZSBleHBvcnRlZCBmcm9tIHRoZWlyIGZpbGUgYnlcbiAgICogdGhlIHNhbWUgbmFtZSBpbiBib3RoIHRoZSBzb3VyY2UgYW5kIHRoZSBkdHMgZmlsZS4gTm90ZSB0aGF0IGJ5IGRlZmluaXRpb24gdGhlIGtleSBhbmQgdmFsdWVcbiAgICogZGVjbGFyYXRpb25zIHdpbGwgbm90IGJlIGluIHRoZSBzYW1lIFRTIHByb2dyYW0uXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwOiBNYXA8RGVjbGFyYXRpb25Ob2RlLCB0cy5EZWNsYXJhdGlvbj58bnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBzZXQgb2Ygc291cmNlIGZpbGVzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gcHJlcHJvY2Vzc2VkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHByZXByb2Nlc3NlZFNvdXJjZUZpbGVzID0gbmV3IFNldDx0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGNsYXNzIGRlY2xhcmF0aW9ucyBtYXkgaGF2ZSBiZWVuIGRvd24tbGV2ZWxlZCBpbnRvIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyxcbiAgICogaW5pdGlhbGl6ZWQgdXNpbmcgYSBjbGFzcyBleHByZXNzaW9uLiBJbiBjZXJ0YWluIHNjZW5hcmlvcywgYW4gYWRkaXRpb25hbCB2YXJpYWJsZVxuICAgKiBpcyBpbnRyb2R1Y2VkIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3Mgc28gdGhhdCByZXN1bHRzIGluIGNvZGUgc3VjaCBhczpcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBNeUNsYXNzXzE7IGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoaXMgbWFwIHRyYWNrcyB0aG9zZSBhbGlhc2VkIHZhcmlhYmxlcyB0byB0aGVpciBvcmlnaW5hbCBpZGVudGlmaWVyLCBpLmUuIHRoZSBrZXlcbiAgICogY29ycmVzcG9uZHMgd2l0aCB0aGUgZGVjbGFyYXRpb24gb2YgYE15Q2xhc3NfMWAgYW5kIGl0cyB2YWx1ZSBiZWNvbWVzIHRoZSBgTXlDbGFzc2AgaWRlbnRpZmllclxuICAgKiBvZiB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWFwIGlzIHBvcHVsYXRlZCBkdXJpbmcgdGhlIHByZXByb2Nlc3Npbmcgb2YgZWFjaCBzb3VyY2UgZmlsZS5cbiAgICovXG4gIHByb3RlY3RlZCBhbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogQ2FjaGVzIHRoZSBpbmZvcm1hdGlvbiBvZiB0aGUgZGVjb3JhdG9ycyBvbiBhIGNsYXNzLCBhcyB0aGUgd29yayBpbnZvbHZlZCB3aXRoIGV4dHJhY3RpbmdcbiAgICogZGVjb3JhdG9ycyBpcyBjb21wbGV4IGFuZCBmcmVxdWVudGx5IHVzZWQuXG4gICAqXG4gICAqIFRoaXMgbWFwIGlzIGxhemlseSBwb3B1bGF0ZWQgZHVyaW5nIHRoZSBmaXJzdCBjYWxsIHRvIGBhY3F1aXJlRGVjb3JhdG9ySW5mb2AgZm9yIGEgZ2l2ZW4gY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZGVjb3JhdG9yQ2FjaGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvckluZm8+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgbG9nZ2VyOiBMb2dnZXIsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sIHByb3RlY3RlZCBzcmM6IEJ1bmRsZVByb2dyYW0sXG4gICAgICBwcm90ZWN0ZWQgZHRzOiBCdW5kbGVQcm9ncmFtfG51bGwgPSBudWxsKSB7XG4gICAgc3VwZXIoc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhIHN5bWJvbCBmb3IgYSBub2RlIHRoYXQgd2UgdGhpbmsgaXMgYSBjbGFzcy5cbiAgICogQ2xhc3NlcyBzaG91bGQgaGF2ZSBhIGBuYW1lYCBpZGVudGlmaWVyLCBiZWNhdXNlIHRoZXkgbWF5IG5lZWQgdG8gYmUgcmVmZXJlbmNlZCBpbiBvdGhlciBwYXJ0c1xuICAgKiBvZiB0aGUgcHJvZ3JhbS5cbiAgICpcbiAgICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlczpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIG9yXG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9ICgoKSA9PiB7IGNsYXNzIE15Q2xhc3Mge30gLi4uIHJldHVybiBNeUNsYXNzOyB9KSgpXG4gICAqIGBgYFxuICAgKlxuICAgKiBIZXJlLCB0aGUgaW50ZXJtZWRpYXRlIGBNeUNsYXNzXzFgIGFzc2lnbm1lbnQgaXMgb3B0aW9uYWwuIEluIHRoZSBhYm92ZSBleGFtcGxlLCB0aGVcbiAgICogYGNsYXNzIE15Q2xhc3Mge31gIG5vZGUgaXMgcmV0dXJuZWQgYXMgZGVjbGFyYXRpb24gb2YgYE15Q2xhc3NgLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIG5vZGUgd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIgb3IgaGFzIG5vIHN5bWJvbC5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbEZyb21PdXRlckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBzeW1ib2w7XG4gICAgfVxuICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSB0aGlzLmdldElubmVyRGVjbGFyYXRpb25Gcm9tQWxpYXNPcklubmVyKGRlY2xhcmF0aW9uKTtcbiAgICByZXR1cm4gdGhpcy5nZXRDbGFzc1N5bWJvbEZyb21Jbm5lckRlY2xhcmF0aW9uKGlubmVyRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4YW1pbmUgYSBkZWNsYXJhdGlvbiAoZm9yIGV4YW1wbGUsIG9mIGEgY2xhc3Mgb3IgZnVuY3Rpb24pIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgYW55XG4gICAqIGRlY29yYXRvcnMgcHJlc2VudCBvbiB0aGUgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBhIFR5cGVTY3JpcHQgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG9yIGZ1bmN0aW9uIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICogICAgIEZvciBleGFtcGxlLCBpZiB0aGUgaW50ZW50IGlzIHRvIHJlZmxlY3QgdGhlIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBhbmQgdGhlIHNvdXJjZSBpcyBpbiBFUzZcbiAgICogICAgIGZvcm1hdCwgdGhpcyB3aWxsIGJlIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIG5vZGUuIElmIHRoZSBzb3VyY2UgaXMgaW4gRVM1IGZvcm1hdCwgdGhpc1xuICAgKiAgICAgbWlnaHQgYmUgYSBgdHMuVmFyaWFibGVEZWNsYXJhdGlvbmAgYXMgY2xhc3NlcyBpbiBFUzUgYXJlIHJlcHJlc2VudGVkIGFzIHRoZSByZXN1bHQgb2YgYW5cbiAgICogICAgIElJRkUgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgRGVjb3JhdG9yYCBtZXRhZGF0YSBpZiBkZWNvcmF0b3JzIGFyZSBwcmVzZW50IG9uIHRoZSBkZWNsYXJhdGlvbiwgb3JcbiAgICogICAgIGBudWxsYCBpZiBlaXRoZXIgbm8gZGVjb3JhdG9ycyB3ZXJlIHByZXNlbnQgb3IgaWYgdGhlIGRlY2xhcmF0aW9uIGlzIG5vdCBvZiBhIGRlY29yYXRhYmxlXG4gICAqICAgICB0eXBlLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IERlY2xhcmF0aW9uTm9kZSk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pO1xuICAgIGlmICghc3ltYm9sKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0ZWQgdG8gZ2V0IG1lbWJlcnMgb2YgYSBub24tY2xhc3M6IFwiJHtjbGF6ei5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRNZW1iZXJzT2ZTeW1ib2woY2xhc3NTeW1ib2wpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGl0cyBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBvbmx5IGxvb2tzIGF0IHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGRpcmVjdGx5IGFuZCBub3QgYXQgYW55IGluaGVyaXRlZFxuICAgKiBjb25zdHJ1Y3RvcnMuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYFBhcmFtZXRlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjb25zdHJ1Y3RvciwgaWZcbiAgICogYSBjb25zdHJ1Y3RvciBleGlzdHMuIElmIHRoZSBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGhhcyAwIHBhcmFtZXRlcnMsIHRoaXMgYXJyYXkgd2lsbCBiZSBlbXB0eS5cbiAgICogSWYgdGhlIGNsYXNzIGhhcyBubyBjb25zdHJ1Y3RvciwgdGhpcyBtZXRob2QgcmV0dXJucyBgbnVsbGAuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byBnZXQgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICBjb25zdCBwYXJhbWV0ZXJOb2RlcyA9IHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2wpO1xuICAgIGlmIChwYXJhbWV0ZXJOb2Rlcykge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oY2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBGaXJzdCB0cnkgZ2V0dGluZyB0aGUgYmFzZSBjbGFzcyBmcm9tIGFuIEVTMjAxNSBjbGFzcyBkZWNsYXJhdGlvblxuICAgIGNvbnN0IHN1cGVyQmFzZUNsYXNzSWRlbnRpZmllciA9IHN1cGVyLmdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xhenopO1xuICAgIGlmIChzdXBlckJhc2VDbGFzc0lkZW50aWZpZXIpIHtcbiAgICAgIHJldHVybiBzdXBlckJhc2VDbGFzc0lkZW50aWZpZXI7XG4gICAgfVxuXG4gICAgLy8gVGhhdCBkaWRuJ3Qgd29yayBzbyBub3cgdHJ5IGdldHRpbmcgaXQgZnJvbSB0aGUgXCJpbm5lclwiIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKGNsYXNzU3ltYm9sID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIWlzTmFtZWREZWNsYXJhdGlvbihjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKGNsYXNzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcygpIGNhbGxlZCBvbiBhIG5vbi1jbGFzczogZXhwZWN0ZWQgJHtcbiAgICAgICAgICBjbGF6ei5uYW1lLnRleHR9IHRvIGJlIGEgY2xhc3MgZGVjbGFyYXRpb24uYCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldE5hbWVGcm9tQ2xhc3NTeW1ib2xEZWNsYXJhdGlvbihcbiAgICAgICAgY2xhc3NTeW1ib2wsIGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKGNsYXNzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcygpIGNhbGxlZCBvbiBhIG5vbi1jbGFzczogZXhwZWN0ZWQgJHtcbiAgICAgICAgICBjbGF6ei5uYW1lLnRleHR9IHRvIGJlIGEgY2xhc3MgZGVjbGFyYXRpb24uYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0QWRqYWNlbnROYW1lT2ZDbGFzc1N5bWJvbChjbGFzc1N5bWJvbCk7XG4gIH1cblxuICBwcml2YXRlIGdldE5hbWVGcm9tQ2xhc3NTeW1ib2xEZWNsYXJhdGlvbihcbiAgICAgIGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXIge1xuICAgIGlmIChkZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYGdldEludGVybmFsTmFtZU9mQ2xhc3MoKSBjYWxsZWQgb24gYSBjbGFzcyB3aXRoIGFuIHVuZGVmaW5lZCBpbnRlcm5hbCBkZWNsYXJhdGlvbi4gRXh0ZXJuYWwgY2xhc3MgbmFtZTogJHtcbiAgICAgICAgICAgICAgY2xhc3NTeW1ib2wubmFtZX07IGludGVybmFsIGNsYXNzIG5hbWU6ICR7Y2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24ubmFtZX0uYCk7XG4gICAgfVxuICAgIGlmICghaXNOYW1lZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBnZXRJbnRlcm5hbE5hbWVPZkNsYXNzKCkgY2FsbGVkIG9uIGEgY2xhc3Mgd2l0aCBhbiBhbm9ueW1vdXMgaW5uZXIgZGVjbGFyYXRpb246IGV4cGVjdGVkIGEgbmFtZSBvbjpcXG4ke1xuICAgICAgICAgICAgICBkZWNsYXJhdGlvbi5nZXRUZXh0KCl9YCk7XG4gICAgfVxuICAgIHJldHVybiBkZWNsYXJhdGlvbi5uYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIG5vZGUgYWN0dWFsbHkgcmVwcmVzZW50cyBhIGNsYXNzLlxuICAgKi9cbiAgaXNDbGFzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyBDbGFzc0RlY2xhcmF0aW9uIHtcbiAgICByZXR1cm4gc3VwZXIuaXNDbGFzcyhub2RlKSB8fCB0aGlzLmdldENsYXNzU3ltYm9sKG5vZGUpICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogVHJhY2UgYW4gaWRlbnRpZmllciB0byBpdHMgZGVjbGFyYXRpb24sIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZ2l2ZW4gaWRlbnRpZmllciwgdHJhY2luZyBiYWNrIHRocm91Z2hcbiAgICogaW1wb3J0cyBhbmQgcmUtZXhwb3J0cyB1bnRpbCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gc3RhdGVtZW50IGlzIGZvdW5kLiBBIGBEZWNsYXJhdGlvbmBcbiAgICogb2JqZWN0IGlzIHJldHVybmVkIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgIGlzIHJldHVybmVkIG90aGVyd2lzZS5cbiAgICpcbiAgICogSW4gRVMyMDE1LCB3ZSBuZWVkIHRvIGFjY291bnQgZm9yIGlkZW50aWZpZXJzIHRoYXQgcmVmZXIgdG8gYWxpYXNlZCBjbGFzcyBkZWNsYXJhdGlvbnMgc3VjaCBhc1xuICAgKiBgTXlDbGFzc18xYC4gU2luY2Ugc3VjaCBkZWNsYXJhdGlvbnMgYXJlIG9ubHkgYXZhaWxhYmxlIHdpdGhpbiB0aGUgbW9kdWxlIGl0c2VsZiwgd2UgbmVlZCB0b1xuICAgKiBmaW5kIHRoZSBvcmlnaW5hbCBjbGFzcyBkZWNsYXJhdGlvbiwgZS5nLiBgTXlDbGFzc2AsIHRoYXQgaXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBhbGlhc2VkIG9uZS5cbiAgICpcbiAgICogQHBhcmFtIGlkIGEgVHlwZVNjcmlwdCBgdHMuSWRlbnRpZmllcmAgdG8gdHJhY2UgYmFjayB0byBhIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBtZXRhZGF0YSBhYm91dCB0aGUgYERlY2xhcmF0aW9uYCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IHN1cGVyRGVjbGFyYXRpb24gPSBzdXBlci5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZCk7XG5cbiAgICAvLyBJZiBubyBkZWNsYXJhdGlvbiB3YXMgZm91bmQsIHJldHVybi5cbiAgICBpZiAoc3VwZXJEZWNsYXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHN1cGVyRGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGRlY2xhcmF0aW9uIGFscmVhZHkgaGFzIHRyYWl0cyBhc3NpZ25lZCB0byBpdCwgcmV0dXJuIGFzIGlzLlxuICAgIGlmIChzdXBlckRlY2xhcmF0aW9uLmtub3duICE9PSBudWxsIHx8XG4gICAgICAgIGlzQ29uY3JldGVEZWNsYXJhdGlvbihzdXBlckRlY2xhcmF0aW9uKSAmJiBzdXBlckRlY2xhcmF0aW9uLmlkZW50aXR5ICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICBsZXQgZGVjbGFyYXRpb25Ob2RlOiB0cy5Ob2RlID0gc3VwZXJEZWNsYXJhdGlvbi5ub2RlO1xuICAgIGlmIChpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbihzdXBlckRlY2xhcmF0aW9uLm5vZGUpICYmICFpc1RvcExldmVsKHN1cGVyRGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgIGNvbnN0IHZhcmlhYmxlVmFsdWUgPSB0aGlzLmdldFZhcmlhYmxlVmFsdWUoc3VwZXJEZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgIGlmICh2YXJpYWJsZVZhbHVlICE9PSBudWxsICYmIHRzLmlzQ2xhc3NFeHByZXNzaW9uKHZhcmlhYmxlVmFsdWUpKSB7XG4gICAgICAgIGRlY2xhcmF0aW9uTm9kZSA9IGdldENvbnRhaW5pbmdTdGF0ZW1lbnQodmFyaWFibGVWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ZXJOb2RlID0gZ2V0T3V0ZXJOb2RlRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb25Ob2RlKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IG91dGVyTm9kZSAhPT0gbnVsbCAmJiBpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbihvdXRlck5vZGUpID9cbiAgICAgICAgdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihvdXRlck5vZGUubmFtZSkgOlxuICAgICAgICBzdXBlckRlY2xhcmF0aW9uO1xuICAgIGlmIChkZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBkZWNsYXJhdGlvbi5rbm93biAhPT0gbnVsbCB8fFxuICAgICAgICBpc0NvbmNyZXRlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pICYmIGRlY2xhcmF0aW9uLmlkZW50aXR5ICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLy8gVGhlIGlkZW50aWZpZXIgbWF5IGhhdmUgYmVlbiBvZiBhbiBhZGRpdGlvbmFsIGNsYXNzIGFzc2lnbm1lbnQgc3VjaCBhcyBgTXlDbGFzc18xYCB0aGF0IHdhc1xuICAgIC8vIHByZXNlbnQgYXMgYWxpYXMgZm9yIGBNeUNsYXNzYC4gSWYgc28sIHJlc29sdmUgc3VjaCBhbGlhc2VzIHRvIHRoZWlyIG9yaWdpbmFsIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gdGhpcy5yZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICBpZiAoYWxpYXNlZElkZW50aWZpZXIgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGFsaWFzZWRJZGVudGlmaWVyKTtcbiAgICB9XG5cbiAgICAvLyBWYXJpYWJsZSBkZWNsYXJhdGlvbnMgbWF5IHJlcHJlc2VudCBhbiBlbnVtIGRlY2xhcmF0aW9uLCBzbyBhdHRlbXB0IHRvIHJlc29sdmUgaXRzIG1lbWJlcnMuXG4gICAgaWYgKGlzQ29uY3JldGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICBjb25zdCBlbnVtTWVtYmVycyA9IHRoaXMucmVzb2x2ZUVudW1NZW1iZXJzKGRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgaWYgKGVudW1NZW1iZXJzICE9PSBudWxsKSB7XG4gICAgICAgIGRlY2xhcmF0aW9uLmlkZW50aXR5ID0ge2tpbmQ6IFNwZWNpYWxEZWNsYXJhdGlvbktpbmQuRG93bmxldmVsZWRFbnVtLCBlbnVtTWVtYmVyc307XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGRlY29yYXRvcnMgb2YgdGhlIGdpdmVuIGNsYXNzIHN5bWJvbC4gQW55IGRlY29yYXRvciB0aGF0IGhhdmUgYmVlbiBzeW50aGV0aWNhbGx5XG4gICAqIGluamVjdGVkIGJ5IGEgbWlncmF0aW9uIHdpbGwgbm90IGJlIHByZXNlbnQgaW4gdGhlIHJldHVybmVkIGNvbGxlY3Rpb24uXG4gICAqL1xuICBnZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCB7Y2xhc3NEZWNvcmF0b3JzfSA9IHRoaXMuYWNxdWlyZURlY29yYXRvckluZm8oc3ltYm9sKTtcbiAgICBpZiAoY2xhc3NEZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgYXJyYXkgdG8gcHJldmVudCBjb25zdW1lcnMgZnJvbSBtdXRhdGluZyB0aGUgY2FjaGUuXG4gICAgcmV0dXJuIEFycmF5LmZyb20oY2xhc3NEZWNvcmF0b3JzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIG1vZHVsZSBmb3IgdmFyaWFibGUgZGVjbGFyYXRpb25zIGluIHdoaWNoIHRoZSBpbml0aWFsaXplclxuICAgKiBpcyBhbiBpZGVudGlmaWVyIG1hcmtlZCB3aXRoIHRoZSBgUFJFX1IzX01BUktFUmAuXG4gICAqIEBwYXJhbSBtb2R1bGUgdGhlIG1vZHVsZSBpbiB3aGljaCB0byBzZWFyY2ggZm9yIHN3aXRjaGFibGUgZGVjbGFyYXRpb25zLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgdGhhdCBtYXRjaC5cbiAgICovXG4gIGdldFN3aXRjaGFibGVEZWNsYXJhdGlvbnMobW9kdWxlOiB0cy5Ob2RlKTogU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb25bXSB7XG4gICAgLy8gRG9uJ3QgYm90aGVyIHRvIHdhbGsgdGhlIEFTVCBpZiB0aGUgbWFya2VyIGlzIG5vdCBmb3VuZCBpbiB0aGUgdGV4dFxuICAgIHJldHVybiBtb2R1bGUuZ2V0VGV4dCgpLmluZGV4T2YoUFJFX1IzX01BUktFUikgPj0gMCA/XG4gICAgICAgIGZpbmRBbGwobW9kdWxlLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uKSA6XG4gICAgICAgIFtdO1xuICB9XG5cbiAgZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdmFsdWUgPSBzdXBlci5nZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBXZSBoYXZlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCBoYXMgbm8gaW5pdGlhbGl6ZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gdmFyIEh0dHBDbGllbnRYc3JmTW9kdWxlXzE7XG4gICAgLy8gYGBgXG4gICAgLy9cbiAgICAvLyBTbyBsb29rIGZvciB0aGUgc3BlY2lhbCBzY2VuYXJpbyB3aGVyZSB0aGUgdmFyaWFibGUgaXMgYmVpbmcgYXNzaWduZWQgaW5cbiAgICAvLyBhIG5lYXJieSBzdGF0ZW1lbnQgdG8gdGhlIHJldHVybiB2YWx1ZSBvZiBhIGNhbGwgdG8gYF9fZGVjb3JhdGVgLlxuICAgIC8vIFRoZW4gZmluZCB0aGUgMm5kIGFyZ3VtZW50IG9mIHRoYXQgY2FsbCwgdGhlIFwidGFyZ2V0XCIsIHdoaWNoIHdpbGwgYmUgdGhlXG4gICAgLy8gYWN0dWFsIGNsYXNzIGlkZW50aWZpZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gSHR0cENsaWVudFhzcmZNb2R1bGUgPSBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xID0gdHNsaWJfMS5fX2RlY29yYXRlKFtcbiAgICAvLyAgIE5nTW9kdWxlKHtcbiAgICAvLyAgICAgcHJvdmlkZXJzOiBbXSxcbiAgICAvLyAgIH0pXG4gICAgLy8gXSwgSHR0cENsaWVudFhzcmZNb2R1bGUpO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gQW5kIGZpbmFsbHksIGZpbmQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBpZGVudGlmaWVyIGluIHRoYXQgYXJndW1lbnQuXG4gICAgLy8gTm90ZSBhbHNvIHRoYXQgdGhlIGFzc2lnbm1lbnQgY2FuIG9jY3VyIHdpdGhpbiBhbm90aGVyIGFzc2lnbm1lbnQuXG4gICAgLy9cbiAgICBjb25zdCBibG9jayA9IGRlY2xhcmF0aW9uLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgIGlmIChzeW1ib2wgJiYgKHRzLmlzQmxvY2soYmxvY2spIHx8IHRzLmlzU291cmNlRmlsZShibG9jaykpKSB7XG4gICAgICBjb25zdCBkZWNvcmF0ZUNhbGwgPSB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKGJsb2NrLCBzeW1ib2wpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZGVjb3JhdGVDYWxsICYmIGRlY29yYXRlQ2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodGFyZ2V0ICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHRhcmdldCk7XG4gICAgICAgIGNvbnN0IHRhcmdldERlY2xhcmF0aW9uID0gdGFyZ2V0U3ltYm9sICYmIHRhcmdldFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgICBpZiAodGFyZ2V0RGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSB8fFxuICAgICAgICAgICAgICB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGp1c3QgYSBmdW5jdGlvbiBvciBjbGFzcyBkZWNsYXJhdGlvblxuICAgICAgICAgICAgLy8gc28gcmV0dXJuIGl0cyBpZGVudGlmaWVyIGFzIHRoZSB2YXJpYWJsZSB2YWx1ZS5cbiAgICAgICAgICAgIHJldHVybiB0YXJnZXREZWNsYXJhdGlvbi5uYW1lIHx8IG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sIHNvIGZpbmQgdGhlIGZhciByaWdodCBleHByZXNzaW9uLFxuICAgICAgICAgICAgLy8gaW4gdGhlIGNhc2Ugb2YgbXVsdGlwbGUgYXNzaWdubWVudHMgKGUuZy4gYHZhcjEgPSB2YXIyID0gdmFsdWVgKS5cbiAgICAgICAgICAgIGxldCB0YXJnZXRWYWx1ZSA9IHRhcmdldERlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgd2hpbGUgKHRhcmdldFZhbHVlICYmIGlzQXNzaWdubWVudCh0YXJnZXRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgdGFyZ2V0VmFsdWUgPSB0YXJnZXRWYWx1ZS5yaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0YXJnZXRWYWx1ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRvcC1sZXZlbCBjbGFzcyBzeW1ib2xzIGluIHRoZSBnaXZlbiBmaWxlLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgc291cmNlIGZpbGUgdG8gc2VhcmNoIGZvciBjbGFzc2VzLlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBjbGFzcyBzeW1ib2xzLlxuICAgKi9cbiAgZmluZENsYXNzU3ltYm9scyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTmdjY0NsYXNzU3ltYm9sW10ge1xuICAgIGNvbnN0IGNsYXNzZXMgPSBuZXcgTWFwPHRzLlN5bWJvbCwgTmdjY0NsYXNzU3ltYm9sPigpO1xuICAgIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKVxuICAgICAgICAuZm9yRWFjaChzdGF0ZW1lbnQgPT4gdGhpcy5hZGRDbGFzc1N5bWJvbHNGcm9tU3RhdGVtZW50KGNsYXNzZXMsIHN0YXRlbWVudCkpO1xuICAgIHJldHVybiBBcnJheS5mcm9tKGNsYXNzZXMudmFsdWVzKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbnVtYmVyIG9mIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIG9mIGEgZ2l2ZW4gY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgdGhlIG51bWJlciBvZiB0eXBlIHBhcmFtZXRlcnMgb2YgdGhlIGNsYXNzLCBpZiBrbm93biwgb3IgYG51bGxgIGlmIHRoZSBkZWNsYXJhdGlvblxuICAgKiBpcyBub3QgYSBjbGFzcyBvciBoYXMgYW4gdW5rbm93biBudW1iZXIgb2YgdHlwZSBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IG51bWJlcnxudWxsIHtcbiAgICBjb25zdCBkdHNEZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RHRzRGVjbGFyYXRpb24oY2xhenopO1xuICAgIGlmIChkdHNEZWNsYXJhdGlvbiAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24oZHRzRGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gZHRzRGVjbGFyYXRpb24udHlwZVBhcmFtZXRlcnMgPyBkdHNEZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycy5sZW5ndGggOiAwO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlIGFuIGV4cG9ydGVkIGRlY2xhcmF0aW9uIG9mIGEgY2xhc3MgKG1heWJlIGRvd24tbGV2ZWxlZCB0byBhIHZhcmlhYmxlKSBhbmQgbG9vayB1cCB0aGVcbiAgICogZGVjbGFyYXRpb24gb2YgaXRzIHR5cGUgaW4gYSBzZXBhcmF0ZSAuZC50cyB0cmVlLlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIGlzIGFsbG93ZWQgdG8gcmV0dXJuIGBudWxsYCBpZiB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IGRvZXMgbm90IGhhdmUgYVxuICAgKiBzZXBhcmF0ZSAuZC50cyB0cmVlLiBXaGVuIGNvbXBpbGluZyBUeXBlU2NyaXB0IGNvZGUgdGhpcyBpcyBhbHdheXMgdGhlIGNhc2UsIHNpbmNlIC5kLnRzIGZpbGVzXG4gICAqIGFyZSBwcm9kdWNlZCBvbmx5IGR1cmluZyB0aGUgZW1pdCBvZiBzdWNoIGEgY29tcGlsYXRpb24uIFdoZW4gY29tcGlsaW5nIC5qcyBjb2RlLCBob3dldmVyLFxuICAgKiB0aGVyZSBpcyBmcmVxdWVudGx5IGEgcGFyYWxsZWwgLmQudHMgdHJlZSB3aGljaCB0aGlzIG1ldGhvZCBleHBvc2VzLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhlIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCByZXR1cm5lZCBmcm9tIHRoaXMgZnVuY3Rpb24gbWF5IG5vdCBiZSBmcm9tIHRoZSBzYW1lXG4gICAqIGB0cy5Qcm9ncmFtYCBhcyB0aGUgaW5wdXQgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXREdHNEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogRGVjbGFyYXRpb25Ob2RlKTogdHMuRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKHRoaXMuZHRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKCFpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBnZXQgdGhlIGR0cyBmaWxlIGZvciBhIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIG5hbWU6ICR7XG4gICAgICAgICAgZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpbiAke2RlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX1gKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICBpZiAoZGVjbCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgZ2V0IHRoZSBkdHMgZmlsZSBmb3IgYSBub2RlIHRoYXQgY2Fubm90IGJlIGFzc29jaWF0ZWQgd2l0aCBhIGRlY2xhcmF0aW9uICR7XG4gICAgICAgICAgICAgIGRlY2xhcmF0aW9uLmdldFRleHQoKX0gaW4gJHtkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9YCk7XG4gICAgfVxuXG4gICAgLy8gVHJ5IHRvIHJldHJpZXZlIHRoZSBkdHMgZGVjbGFyYXRpb24gZnJvbSB0aGUgcHVibGljIG1hcFxuICAgIGlmICh0aGlzLnB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwID09PSBudWxsKSB7XG4gICAgICB0aGlzLnB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwID0gdGhpcy5jb21wdXRlUHVibGljRHRzRGVjbGFyYXRpb25NYXAodGhpcy5zcmMsIHRoaXMuZHRzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucHVibGljRHRzRGVjbGFyYXRpb25NYXAuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwLmdldChkZWNsLm5vZGUpITtcbiAgICB9XG5cbiAgICAvLyBObyBwdWJsaWMgZXhwb3J0LCB0cnkgdGhlIHByaXZhdGUgbWFwXG4gICAgaWYgKHRoaXMucHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwID09PSBudWxsKSB7XG4gICAgICB0aGlzLnByaXZhdGVEdHNEZWNsYXJhdGlvbk1hcCA9IHRoaXMuY29tcHV0ZVByaXZhdGVEdHNEZWNsYXJhdGlvbk1hcCh0aGlzLnNyYywgdGhpcy5kdHMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wcml2YXRlRHRzRGVjbGFyYXRpb25NYXAuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnByaXZhdGVEdHNEZWNsYXJhdGlvbk1hcC5nZXQoZGVjbC5ub2RlKSE7XG4gICAgfVxuXG4gICAgLy8gTm8gZGVjbGFyYXRpb24gZm91bmQgYXQgYWxsXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBnZXRFbmRPZkNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiB0cy5Ob2RlIHtcbiAgICBjb25zdCBpbXBsZW1lbnRhdGlvbiA9IGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uO1xuICAgIGxldCBsYXN0OiB0cy5Ob2RlID0gaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbjtcbiAgICBjb25zdCBpbXBsZW1lbnRhdGlvblN0YXRlbWVudCA9IGdldENvbnRhaW5pbmdTdGF0ZW1lbnQobGFzdCk7XG4gICAgaWYgKGltcGxlbWVudGF0aW9uU3RhdGVtZW50ID09PSBudWxsKSByZXR1cm4gbGFzdDtcblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IGltcGxlbWVudGF0aW9uU3RhdGVtZW50LnBhcmVudDtcbiAgICBpZiAodHMuaXNCbG9jayhjb250YWluZXIpKSB7XG4gICAgICAvLyBBc3N1bWUgdGhhdCB0aGUgaW1wbGVtZW50YXRpb24gaXMgaW5zaWRlIGFuIElJRkVcbiAgICAgIGNvbnN0IHJldHVyblN0YXRlbWVudEluZGV4ID0gY29udGFpbmVyLnN0YXRlbWVudHMuZmluZEluZGV4KHRzLmlzUmV0dXJuU3RhdGVtZW50KTtcbiAgICAgIGlmIChyZXR1cm5TdGF0ZW1lbnRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYENvbXBpbGVkIGNsYXNzIHdyYXBwZXIgSUlGRSBkb2VzIG5vdCBoYXZlIGEgcmV0dXJuIHN0YXRlbWVudDogJHtjbGFzc1N5bWJvbC5uYW1lfSBpbiAke1xuICAgICAgICAgICAgICAgIGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfWApO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXR1cm4gdGhlIHN0YXRlbWVudCBiZWZvcmUgdGhlIElJRkUgcmV0dXJuIHN0YXRlbWVudFxuICAgICAgbGFzdCA9IGNvbnRhaW5lci5zdGF0ZW1lbnRzW3JldHVyblN0YXRlbWVudEluZGV4IC0gMV07XG4gICAgfSBlbHNlIGlmICh0cy5pc1NvdXJjZUZpbGUoY29udGFpbmVyKSkge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIHN0YXRpYyBtZW1iZXJzIG9uIHRoaXMgY2xhc3MgdGhlbiBmaW5kIHRoZSBsYXN0IG9uZVxuICAgICAgaWYgKGltcGxlbWVudGF0aW9uLmV4cG9ydHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpbXBsZW1lbnRhdGlvbi5leHBvcnRzLmZvckVhY2goZXhwb3J0U3ltYm9sID0+IHtcbiAgICAgICAgICBpZiAoZXhwb3J0U3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBleHBvcnRTdGF0ZW1lbnQgPSBnZXRDb250YWluaW5nU3RhdGVtZW50KGV4cG9ydFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAoZXhwb3J0U3RhdGVtZW50ICE9PSBudWxsICYmIGxhc3QuZ2V0RW5kKCkgPCBleHBvcnRTdGF0ZW1lbnQuZ2V0RW5kKCkpIHtcbiAgICAgICAgICAgIGxhc3QgPSBleHBvcnRTdGF0ZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlcmUgYXJlIGhlbHBlciBjYWxscyBmb3IgdGhpcyBjbGFzcyB0aGVuIGZpbmQgdGhlIGxhc3Qgb25lXG4gICAgICBjb25zdCBoZWxwZXJzID0gdGhpcy5nZXRIZWxwZXJDYWxsc0ZvckNsYXNzKFxuICAgICAgICAgIGNsYXNzU3ltYm9sLCBbJ19fZGVjb3JhdGUnLCAnX19leHRlbmRzJywgJ19fcGFyYW0nLCAnX19tZXRhZGF0YSddKTtcbiAgICAgIGhlbHBlcnMuZm9yRWFjaChoZWxwZXIgPT4ge1xuICAgICAgICBjb25zdCBoZWxwZXJTdGF0ZW1lbnQgPSBnZXRDb250YWluaW5nU3RhdGVtZW50KGhlbHBlcik7XG4gICAgICAgIGlmIChoZWxwZXJTdGF0ZW1lbnQgIT09IG51bGwgJiYgbGFzdC5nZXRFbmQoKSA8IGhlbHBlclN0YXRlbWVudC5nZXRFbmQoKSkge1xuICAgICAgICAgIGxhc3QgPSBoZWxwZXJTdGF0ZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbGFzdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGEgYERlY2xhcmF0aW9uYCBjb3JyZXNwb25kcyB3aXRoIGEga25vd24gZGVjbGFyYXRpb24sIHN1Y2ggYXMgYE9iamVjdGAsIGFuZCBzZXRcbiAgICogaXRzIGBrbm93bmAgcHJvcGVydHkgdG8gdGhlIGFwcHJvcHJpYXRlIGBLbm93bkRlY2xhcmF0aW9uYC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2wgVGhlIGBEZWNsYXJhdGlvbmAgdG8gY2hlY2suXG4gICAqIEByZXR1cm4gVGhlIHBhc3NlZCBpbiBgRGVjbGFyYXRpb25gIChwb3RlbnRpYWxseSBlbmhhbmNlZCB3aXRoIGEgYEtub3duRGVjbGFyYXRpb25gKS5cbiAgICovXG4gIGRldGVjdEtub3duRGVjbGFyYXRpb248VCBleHRlbmRzIERlY2xhcmF0aW9uPihkZWNsOiBUKTogVCB7XG4gICAgaWYgKGRlY2wua25vd24gPT09IG51bGwgJiYgdGhpcy5pc0phdmFTY3JpcHRPYmplY3REZWNsYXJhdGlvbihkZWNsKSkge1xuICAgICAgLy8gSWYgdGhlIGlkZW50aWZpZXIgcmVzb2x2ZXMgdG8gdGhlIGdsb2JhbCBKYXZhU2NyaXB0IGBPYmplY3RgLCB1cGRhdGUgdGhlIGRlY2xhcmF0aW9uIHRvXG4gICAgICAvLyBkZW5vdGUgaXQgYXMgdGhlIGtub3duIGBKc0dsb2JhbE9iamVjdGAgZGVjbGFyYXRpb24uXG4gICAgICBkZWNsLmtub3duID0gS25vd25EZWNsYXJhdGlvbi5Kc0dsb2JhbE9iamVjdDtcbiAgICB9XG4gICAgcmV0dXJuIGRlY2w7XG4gIH1cblxuXG4gIC8vLy8vLy8vLy8vLy8gUHJvdGVjdGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGFsbCB0aGUgXCJjbGFzc2VzXCIgZnJvbSB0aGUgYHN0YXRlbWVudGAgYW5kIGFkZCB0aGVtIHRvIHRoZSBgY2xhc3Nlc2AgbWFwLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFkZENsYXNzU3ltYm9sc0Zyb21TdGF0ZW1lbnQoXG4gICAgICBjbGFzc2VzOiBNYXA8dHMuU3ltYm9sLCBOZ2NjQ2xhc3NTeW1ib2w+LCBzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pO1xuICAgICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgICBjbGFzc2VzLnNldChjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbiwgY2xhc3NTeW1ib2wpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdGF0ZW1lbnQpKSB7XG4gICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woc3RhdGVtZW50KTtcbiAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICBjbGFzc2VzLnNldChjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbiwgY2xhc3NTeW1ib2wpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIHRoZSBpbm5lciBkZWNsYXJhdGlvbiBub2RlIG9mIGEgXCJjbGFzc1wiIGZyb20gdGhlIGdpdmVuIGBkZWNsYXJhdGlvbmAgbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIGEgbm9kZSB0aGF0IGlzIGVpdGhlciBhbiBpbm5lciBkZWNsYXJhdGlvbiBvciBhbiBhbGlhcyBvZiBhIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldElubmVyRGVjbGFyYXRpb25Gcm9tQWxpYXNPcklubmVyKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogdHMuTm9kZSB7XG4gICAgaWYgKGRlY2xhcmF0aW9uLnBhcmVudCAhPT0gdW5kZWZpbmVkICYmIGlzTmFtZWRWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uLnBhcmVudCkpIHtcbiAgICAgIGNvbnN0IHZhcmlhYmxlVmFsdWUgPSB0aGlzLmdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb24ucGFyZW50KTtcbiAgICAgIGlmICh2YXJpYWJsZVZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgIGRlY2xhcmF0aW9uID0gdmFyaWFibGVWYWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIGFzIGEgdG9wIGxldmVsIGNsYXNzIGRlY2xhcmF0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogY2xhc3MgT3V0ZXJDbGFzcyB7IC4uLiB9XG4gICAqIGBgYFxuICAgKlxuICAgKiBvciBpbiBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRvIGEgY2xhc3MgZXhwcmVzc2lvbjpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBPdXRlckNsYXNzID0gQ2xhc3NBbGlhcyA9IGNsYXNzIElubmVyQ2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBvciBpbiBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRvIGFuIElJRkUgY29udGFpbmluZyBhIGNsYXNzIGRlY2xhcmF0aW9uXG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgT3V0ZXJDbGFzcyA9IENsYXNzQWxpYXMgPSAoKCkgPT4ge1xuICAgKiAgIGNsYXNzIElubmVyQ2xhc3Mge31cbiAgICogICAuLi5cbiAgICogICByZXR1cm4gSW5uZXJDbGFzcztcbiAgICogfSkoKVxuICAgKiBgYGBcbiAgICpcbiAgICogb3IgaW4gYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB0byBhbiBJSUZFIGNvbnRhaW5pbmcgYSBmdW5jdGlvbiBkZWNsYXJhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIE91dGVyQ2xhc3MgPSBDbGFzc0FsaWFzID0gKCgpID0+IHtcbiAgICogICBmdW5jdGlvbiBJbm5lckNsYXNzKCkge31cbiAgICogICAuLi5cbiAgICogICByZXR1cm4gSW5uZXJDbGFzcztcbiAgICogfSkoKVxuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBtZXRob2QgcmV0dXJucyBhbiBgTmdjY0NsYXNzU3ltYm9sYCB3aGVuIHByb3ZpZGVkIHdpdGggb25lIG9mIHRoZXNlIGNhc2VzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIGNsYXNzIG9yIGB1bmRlZmluZWRgIGlmIGBkZWNsYXJhdGlvbmAgZG9lcyBub3QgcmVwcmVzZW50IGFuIG91dGVyXG4gICAqICAgICBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sRnJvbU91dGVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICAvLyBSZXR1cm4gYSBjbGFzcyBzeW1ib2wgd2l0aG91dCBhbiBpbm5lciBkZWNsYXJhdGlvbiBpZiBpdCBpcyBhIHJlZ3VsYXIgXCJ0b3AgbGV2ZWxcIiBjbGFzc1xuICAgIGlmIChpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgaXNUb3BMZXZlbChkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUNsYXNzU3ltYm9sKGRlY2xhcmF0aW9uLm5hbWUsIG51bGwpO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSwgYW4gb3V0ZXIgY2xhc3MgZGVjbGFyYXRpb24gbXVzdCBiZSBhbiBpbml0aWFsaXplZCB2YXJpYWJsZSBkZWNsYXJhdGlvbjpcbiAgICBpZiAoIWlzSW5pdGlhbGl6ZWRWYXJpYWJsZUNsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24oc2tpcENsYXNzQWxpYXNlcyhkZWNsYXJhdGlvbikpO1xuICAgIGlmIChpbm5lckRlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmNyZWF0ZUNsYXNzU3ltYm9sKGRlY2xhcmF0aW9uLm5hbWUsIGlubmVyRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluIEVTMjAxNSwgYSBjbGFzcyBtYXkgYmUgZGVjbGFyZWQgdXNpbmcgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZXM6XG4gICAqXG4gICAqIGBgYFxuICAgKiBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBvclxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSAoKCkgPT4geyBjbGFzcyBNeUNsYXNzIHt9IC4uLiByZXR1cm4gTXlDbGFzczsgfSkoKVxuICAgKiBgYGBcbiAgICpcbiAgICogb3JcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gKCgpID0+IHsgbGV0IE15Q2xhc3MgPSBjbGFzcyBNeUNsYXNzIHt9OyAuLi4gcmV0dXJuIE15Q2xhc3M7IH0pKClcbiAgICogYGBgXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGV4dHJhY3RzIHRoZSBgTmdjY0NsYXNzU3ltYm9sYCBmb3IgYE15Q2xhc3NgIHdoZW4gcHJvdmlkZWQgd2l0aCB0aGVcbiAgICogYGNsYXNzIE15Q2xhc3Mge31gIGRlY2xhcmF0aW9uIG5vZGUuIFdoZW4gdGhlIGB2YXIgTXlDbGFzc2Agbm9kZSBvciBhbnkgb3RoZXIgbm9kZSBpcyBnaXZlbixcbiAgICogdGhpcyBtZXRob2Qgd2lsbCByZXR1cm4gdW5kZWZpbmVkIGluc3RlYWQuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgZGVjbGFyYXRpb24gd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBkb2VzIG5vdCByZXByZXNlbnQgYW4gaW5uZXIgZGVjbGFyYXRpb25cbiAgICogb2YgYSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbEZyb21Jbm5lckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgbGV0IG91dGVyRGVjbGFyYXRpb246IHRzLkNsYXNzRGVjbGFyYXRpb258dHMuVmFyaWFibGVEZWNsYXJhdGlvbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAodHMuaXNDbGFzc0V4cHJlc3Npb24oZGVjbGFyYXRpb24pICYmIGhhc05hbWVJZGVudGlmaWVyKGRlY2xhcmF0aW9uKSkge1xuICAgICAgLy8gSGFuZGxlIGBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307YFxuICAgICAgb3V0ZXJEZWNsYXJhdGlvbiA9IGdldEZhckxlZnRIYW5kU2lkZU9mQXNzaWdubWVudChkZWNsYXJhdGlvbik7XG5cbiAgICAgIC8vIEhhbmRsZSB0aGlzIGJlaW5nIGluIGFuIElJRkVcbiAgICAgIGlmIChvdXRlckRlY2xhcmF0aW9uICE9PSB1bmRlZmluZWQgJiYgIWlzVG9wTGV2ZWwob3V0ZXJEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgb3V0ZXJEZWNsYXJhdGlvbiA9IGdldENvbnRhaW5pbmdWYXJpYWJsZURlY2xhcmF0aW9uKG91dGVyRGVjbGFyYXRpb24pO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICAvLyBIYW5kbGUgYGNsYXNzIE15Q2xhc3Mge31gIHN0YXRlbWVudFxuICAgICAgaWYgKGlzVG9wTGV2ZWwoZGVjbGFyYXRpb24pKSB7XG4gICAgICAgIC8vIEF0IHRoZSB0b3AgbGV2ZWxcbiAgICAgICAgb3V0ZXJEZWNsYXJhdGlvbiA9IGRlY2xhcmF0aW9uO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gT3IgaW5zaWRlIGFuIElJRkVcbiAgICAgICAgb3V0ZXJEZWNsYXJhdGlvbiA9IGdldENvbnRhaW5pbmdWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3V0ZXJEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8ICFoYXNOYW1lSWRlbnRpZmllcihvdXRlckRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChvdXRlckRlY2xhcmF0aW9uLm5hbWUsIGRlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGBOZ2NjQ2xhc3NTeW1ib2xgIGZyb20gYW4gb3V0ZXIgYW5kIGlubmVyIGRlY2xhcmF0aW9uLiBJZiBhIGNsYXNzIG9ubHkgaGFzIGFuIG91dGVyXG4gICAqIGRlY2xhcmF0aW9uLCB0aGUgXCJpbXBsZW1lbnRhdGlvblwiIHN5bWJvbCBvZiB0aGUgY3JlYXRlZCBgTmdjY0NsYXNzU3ltYm9sYCB3aWxsIGJlIHNldCBlcXVhbCB0b1xuICAgKiB0aGUgXCJkZWNsYXJhdGlvblwiIHN5bWJvbC5cbiAgICpcbiAgICogQHBhcmFtIG91dGVyRGVjbGFyYXRpb24gVGhlIG91dGVyIGRlY2xhcmF0aW9uIG5vZGUgb2YgdGhlIGNsYXNzLlxuICAgKiBAcGFyYW0gaW5uZXJEZWNsYXJhdGlvbiBUaGUgaW5uZXIgZGVjbGFyYXRpb24gbm9kZSBvZiB0aGUgY2xhc3MsIG9yIHVuZGVmaW5lZCBpZiBubyBpbm5lclxuICAgKiBkZWNsYXJhdGlvbiBpcyBwcmVzZW50LlxuICAgKiBAcmV0dXJucyB0aGUgYE5nY2NDbGFzc1N5bWJvbGAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcywgb3IgdW5kZWZpbmVkIGlmIGEgYHRzLlN5bWJvbGAgZm9yIGFueSBvZlxuICAgKiB0aGUgZGVjbGFyYXRpb25zIGNvdWxkIG5vdCBiZSByZXNvbHZlZC5cbiAgICovXG4gIHByb3RlY3RlZCBjcmVhdGVDbGFzc1N5bWJvbChvdXRlckRlY2xhcmF0aW9uOiB0cy5JZGVudGlmaWVyLCBpbm5lckRlY2xhcmF0aW9uOiB0cy5Ob2RlfG51bGwpOlxuICAgICAgTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZGVjbGFyYXRpb25TeW1ib2wgPVxuICAgICAgICB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihvdXRlckRlY2xhcmF0aW9uKSBhcyBDbGFzc1N5bWJvbCB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZGVjbGFyYXRpb25TeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBsZXQgaW1wbGVtZW50YXRpb25TeW1ib2wgPSBkZWNsYXJhdGlvblN5bWJvbDtcbiAgICBpZiAoaW5uZXJEZWNsYXJhdGlvbiAhPT0gbnVsbCAmJiBpc05hbWVkRGVjbGFyYXRpb24oaW5uZXJEZWNsYXJhdGlvbikpIHtcbiAgICAgIGltcGxlbWVudGF0aW9uU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaW5uZXJEZWNsYXJhdGlvbi5uYW1lKSBhcyBDbGFzc1N5bWJvbDtcbiAgICB9XG5cbiAgICBpZiAoaW1wbGVtZW50YXRpb25TeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sID0ge1xuICAgICAgbmFtZTogZGVjbGFyYXRpb25TeW1ib2wubmFtZSxcbiAgICAgIGRlY2xhcmF0aW9uOiBkZWNsYXJhdGlvblN5bWJvbCxcbiAgICAgIGltcGxlbWVudGF0aW9uOiBpbXBsZW1lbnRhdGlvblN5bWJvbCxcbiAgICAgIGFkamFjZW50OiB0aGlzLmdldEFkamFjZW50U3ltYm9sKGRlY2xhcmF0aW9uU3ltYm9sLCBpbXBsZW1lbnRhdGlvblN5bWJvbCksXG4gICAgfTtcblxuICAgIHJldHVybiBjbGFzc1N5bWJvbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QWRqYWNlbnRTeW1ib2woZGVjbGFyYXRpb25TeW1ib2w6IENsYXNzU3ltYm9sLCBpbXBsZW1lbnRhdGlvblN5bWJvbDogQ2xhc3NTeW1ib2wpOlxuICAgICAgQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAoZGVjbGFyYXRpb25TeW1ib2wgPT09IGltcGxlbWVudGF0aW9uU3ltYm9sKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBpbm5lckRlY2xhcmF0aW9uID0gaW1wbGVtZW50YXRpb25TeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRzLmlzQ2xhc3NFeHByZXNzaW9uKGlubmVyRGVjbGFyYXRpb24pICYmICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihpbm5lckRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy8gRGVhbCB3aXRoIHRoZSBpbm5lciBjbGFzcyBsb29raW5nIGxpa2UgdGhpcyBpbnNpZGUgYW4gSUlGRTpcbiAgICAvLyBgbGV0IE15Q2xhc3MgPSBjbGFzcyBNeUNsYXNzIHt9O2Agb3IgYHZhciBNeUNsYXNzID0gZnVuY3Rpb24gTXlDbGFzcygpIHt9O2BcbiAgICBjb25zdCBhZGphY2VudERlY2xhcmF0aW9uID0gZ2V0RmFyTGVmdEhhbmRTaWRlT2ZBc3NpZ25tZW50KGlubmVyRGVjbGFyYXRpb24pO1xuICAgIGlmIChhZGphY2VudERlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHwgIWlzTmFtZWRWYXJpYWJsZURlY2xhcmF0aW9uKGFkamFjZW50RGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBhZGphY2VudFN5bWJvbCA9XG4gICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGFkamFjZW50RGVjbGFyYXRpb24ubmFtZSkgYXMgQ2xhc3NTeW1ib2w7XG4gICAgaWYgKGFkamFjZW50U3ltYm9sID09PSBkZWNsYXJhdGlvblN5bWJvbCB8fCBhZGphY2VudFN5bWJvbCA9PT0gaW1wbGVtZW50YXRpb25TeW1ib2wpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBhZGphY2VudFN5bWJvbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgYHRzLlN5bWJvbGAgdG8gaXRzIGRlY2xhcmF0aW9uIGFuZCBkZXRlY3Qgd2hldGhlciBpdCBjb3JyZXNwb25kcyB3aXRoIGEga25vd25cbiAgICogZGVjbGFyYXRpb24uXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzeW1ib2w6IHRzLlN5bWJvbCwgb3JpZ2luYWxJZDogdHMuSWRlbnRpZmllcnxudWxsKTogRGVjbGFyYXRpb25cbiAgICAgIHxudWxsIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZTeW1ib2woc3ltYm9sLCBvcmlnaW5hbElkKTtcbiAgICBpZiAoZGVjbGFyYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kZXRlY3RLbm93bkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgaWRlbnRpZmllciBvZiB0aGUgYWN0dWFsIGNsYXNzIGRlY2xhcmF0aW9uIGZvciBhIHBvdGVudGlhbGx5IGFsaWFzZWQgZGVjbGFyYXRpb24gb2YgYVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogSWYgdGhlIGdpdmVuIGRlY2xhcmF0aW9uIGlzIGZvciBhbiBhbGlhcyBvZiBhIGNsYXNzLCB0aGlzIGZ1bmN0aW9uIHdpbGwgZGV0ZXJtaW5lIGFuIGlkZW50aWZpZXJcbiAgICogdG8gdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIHRoYXQgcmVwcmVzZW50cyB0aGlzIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIGRlY2xhcmF0aW9uIHRvIHJlc29sdmUuXG4gICAqIEByZXR1cm5zIFRoZSBvcmlnaW5hbCBpZGVudGlmaWVyIHRoYXQgdGhlIGdpdmVuIGNsYXNzIGRlY2xhcmF0aW9uIHJlc29sdmVzIHRvLCBvciBgdW5kZWZpbmVkYFxuICAgKiBpZiB0aGUgZGVjbGFyYXRpb24gZG9lcyBub3QgcmVwcmVzZW50IGFuIGFsaWFzZWQgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZUFsaWFzZWRDbGFzc0lkZW50aWZpZXIoZGVjbGFyYXRpb246IERlY2xhcmF0aW9uTm9kZSk6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gICAgdGhpcy5lbnN1cmVQcmVwcm9jZXNzZWQoZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpKTtcbiAgICByZXR1cm4gdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuaGFzKGRlY2xhcmF0aW9uKSA/XG4gICAgICAgIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLmdldChkZWNsYXJhdGlvbikhIDpcbiAgICAgICAgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmVzIHRoYXQgdGhlIHNvdXJjZSBmaWxlIHRoYXQgYG5vZGVgIGlzIHBhcnQgb2YgaGFzIGJlZW4gcHJlcHJvY2Vzc2VkLlxuICAgKlxuICAgKiBEdXJpbmcgcHJlcHJvY2Vzc2luZywgYWxsIHN0YXRlbWVudHMgaW4gdGhlIHNvdXJjZSBmaWxlIHdpbGwgYmUgdmlzaXRlZCBzdWNoIHRoYXQgY2VydGFpblxuICAgKiBwcm9jZXNzaW5nIHN0ZXBzIGNhbiBiZSBkb25lIHVwLWZyb250IGFuZCBjYWNoZWQgZm9yIHN1YnNlcXVlbnQgdXNhZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgc291cmNlIGZpbGUgdGhhdCBuZWVkcyB0byBoYXZlIGdvbmUgdGhyb3VnaCBwcmVwcm9jZXNzaW5nLlxuICAgKi9cbiAgcHJvdGVjdGVkIGVuc3VyZVByZXByb2Nlc3NlZChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnByZXByb2Nlc3NlZFNvdXJjZUZpbGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgdGhpcy5wcmVwcm9jZXNzZWRTb3VyY2VGaWxlcy5hZGQoc291cmNlRmlsZSk7XG5cbiAgICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKSkge1xuICAgICAgICB0aGlzLnByZXByb2Nlc3NTdGF0ZW1lbnQoc3RhdGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbHl6ZXMgdGhlIGdpdmVuIHN0YXRlbWVudCB0byBzZWUgaWYgaXQgY29ycmVzcG9uZHMgd2l0aCBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGxpa2VcbiAgICogYGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtgLiBJZiBzbywgdGhlIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzXzFgXG4gICAqIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgYE15Q2xhc3NgIGlkZW50aWZpZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgVGhlIHN0YXRlbWVudCB0aGF0IG5lZWRzIHRvIGJlIHByZXByb2Nlc3NlZC5cbiAgICovXG4gIHByb3RlY3RlZCBwcmVwcm9jZXNzU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucztcbiAgICBpZiAoZGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gZGVjbGFyYXRpb25zWzBdO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbGFyYXRpb24ubmFtZSkgfHwgIWluaXRpYWxpemVyIHx8ICFpc0Fzc2lnbm1lbnQoaW5pdGlhbGl6ZXIpIHx8XG4gICAgICAgICF0cy5pc0lkZW50aWZpZXIoaW5pdGlhbGl6ZXIubGVmdCkgfHwgIXRoaXMuaXNDbGFzcyhkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhbGlhc2VkSWRlbnRpZmllciA9IGluaXRpYWxpemVyLmxlZnQ7XG5cbiAgICBjb25zdCBhbGlhc2VkRGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGFsaWFzZWRJZGVudGlmaWVyKTtcbiAgICBpZiAoYWxpYXNlZERlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVuYWJsZSB0byBsb2NhdGUgZGVjbGFyYXRpb24gb2YgJHthbGlhc2VkSWRlbnRpZmllci50ZXh0fSBpbiBcIiR7c3RhdGVtZW50LmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICB0aGlzLmFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucy5zZXQoYWxpYXNlZERlY2xhcmF0aW9uLm5vZGUsIGRlY2xhcmF0aW9uLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIGEgbW9kdWxlLlxuICAgKlxuICAgKiBJbiBFUzUgYW5kIEVTMjAxNSB0aGlzIGlzIGp1c3QgdGhlIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIG9mIHRoZSBmaWxlLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgbW9kdWxlIHdob3NlIHN0YXRlbWVudHMgd2Ugd2FudC5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIHRoZSBnaXZlbiBtb2R1bGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHNvdXJjZUZpbGUuc3RhdGVtZW50cyk7XG4gIH1cblxuICAvKipcbiAgICogV2FsayB0aGUgQVNUIGxvb2tpbmcgZm9yIGFuIGFzc2lnbm1lbnQgdG8gdGhlIHNwZWNpZmllZCBzeW1ib2wuXG4gICAqIEBwYXJhbSBub2RlIFRoZSBjdXJyZW50IG5vZGUgd2UgYXJlIHNlYXJjaGluZy5cbiAgICogQHJldHVybnMgYW4gZXhwcmVzc2lvbiB0aGF0IHJlcHJlc2VudHMgdGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZSwgb3IgdW5kZWZpbmVkIGlmIG5vbmUgY2FuIGJlXG4gICAqIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKG5vZGU6IHRzLk5vZGV8dW5kZWZpbmVkLCBzeW1ib2w6IHRzLlN5bWJvbCk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIG5vZGUub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICBjb25zdCBsZWZ0ID0gbm9kZS5sZWZ0O1xuICAgICAgY29uc3QgcmlnaHQgPSBub2RlLnJpZ2h0O1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihsZWZ0KSAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihsZWZ0KSA9PT0gc3ltYm9sKSB7XG4gICAgICAgIHJldHVybiAodHMuaXNDYWxsRXhwcmVzc2lvbihyaWdodCkgJiYgZ2V0Q2FsbGVlTmFtZShyaWdodCkgPT09ICdfX2RlY29yYXRlJykgPyByaWdodCA6IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShyaWdodCwgc3ltYm9sKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGUuZm9yRWFjaENoaWxkKG5vZGUgPT4gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShub2RlLCBzeW1ib2wpKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byByZXRyaWV2ZSB0aGUgc3ltYm9sIG9mIGEgc3RhdGljIHByb3BlcnR5IG9uIGEgY2xhc3MuXG4gICAqXG4gICAqIEluIHNvbWUgY2FzZXMsIGEgc3RhdGljIHByb3BlcnR5IGNhbiBlaXRoZXIgYmUgc2V0IG9uIHRoZSBpbm5lciAoaW1wbGVtZW50YXRpb24gb3IgYWRqYWNlbnQpXG4gICAqIGRlY2xhcmF0aW9uIGluc2lkZSB0aGUgY2xhc3MnIElJRkUsIG9yIGl0IGNhbiBiZSBzZXQgb24gdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKiBUaGVyZWZvcmUsIHRoZSBob3N0IGNoZWNrcyBhbGwgcGxhY2VzLCBmaXJzdCBsb29raW5nIHVwIHRoZSBwcm9wZXJ0eSBvbiB0aGUgaW5uZXIgc3ltYm9scywgYW5kXG4gICAqIGlmIHRoZSBwcm9wZXJ0eSBpcyBub3QgZm91bmQgaXQgd2lsbCBmYWxsIGJhY2sgdG8gbG9va2luZyB1cCB0aGUgcHJvcGVydHkgb24gdGhlIG91dGVyIHN5bWJvbC5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcHJvcGVydHkgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEBwYXJhbSBwcm9wZXJ0eU5hbWUgdGhlIG5hbWUgb2Ygc3RhdGljIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGlmIGl0IGlzIGZvdW5kIG9yIGB1bmRlZmluZWRgIGlmIG5vdC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0aWNQcm9wZXJ0eShzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgcHJvcGVydHlOYW1lOiB0cy5fX1N0cmluZyk6IHRzLlN5bWJvbFxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5leHBvcnRzPy5nZXQocHJvcGVydHlOYW1lKSB8fFxuICAgICAgICBzeW1ib2wuYWRqYWNlbnQ/LmV4cG9ydHM/LmdldChwcm9wZXJ0eU5hbWUpIHx8XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzPy5nZXQocHJvcGVydHlOYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGZvciBvYnRhaW5pbmcgaW5mb3JtYXRpb24gb24gdGhlIGRlY29yYXRvcnMgb2YgYSBnaXZlbiBjbGFzcy4gVGhpc1xuICAgKiBpbmZvcm1hdGlvbiBpcyBjb21wdXRlZCBlaXRoZXIgZnJvbSBzdGF0aWMgcHJvcGVydGllcyBpZiBwcmVzZW50LCBvciB1c2luZyBgdHNsaWIuX19kZWNvcmF0ZWBcbiAgICogaGVscGVyIGNhbGxzIG90aGVyd2lzZS4gVGhlIGNvbXB1dGVkIHJlc3VsdCBpcyBjYWNoZWQgcGVyIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIGZvciB3aGljaCBkZWNvcmF0b3JzIHNob3VsZCBiZSBhY3F1aXJlZC5cbiAgICogQHJldHVybnMgYWxsIGluZm9ybWF0aW9uIG9mIHRoZSBkZWNvcmF0b3JzIG9uIHRoZSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBhY3F1aXJlRGVjb3JhdG9ySW5mbyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9ySW5mbyB7XG4gICAgY29uc3QgZGVjbCA9IGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgaWYgKHRoaXMuZGVjb3JhdG9yQ2FjaGUuaGFzKGRlY2wpKSB7XG4gICAgICByZXR1cm4gdGhpcy5kZWNvcmF0b3JDYWNoZS5nZXQoZGVjbCkhO1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgZGVjb3JhdG9ycyBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzIGFuZCBgX19kZWNvcmF0ZWAgaGVscGVyIGNhbGxzLCB0aGVuIG1lcmdlIHRoZW1cbiAgICAvLyB0b2dldGhlciB3aGVyZSB0aGUgaW5mb3JtYXRpb24gZnJvbSB0aGUgc3RhdGljIHByb3BlcnRpZXMgaXMgcHJlZmVycmVkLlxuICAgIGNvbnN0IHN0YXRpY1Byb3BzID0gdGhpcy5jb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21TdGF0aWNQcm9wZXJ0aWVzKGNsYXNzU3ltYm9sKTtcbiAgICBjb25zdCBoZWxwZXJDYWxscyA9IHRoaXMuY29tcHV0ZURlY29yYXRvckluZm9Gcm9tSGVscGVyQ2FsbHMoY2xhc3NTeW1ib2wpO1xuXG4gICAgY29uc3QgZGVjb3JhdG9ySW5mbzogRGVjb3JhdG9ySW5mbyA9IHtcbiAgICAgIGNsYXNzRGVjb3JhdG9yczogc3RhdGljUHJvcHMuY2xhc3NEZWNvcmF0b3JzIHx8IGhlbHBlckNhbGxzLmNsYXNzRGVjb3JhdG9ycyxcbiAgICAgIG1lbWJlckRlY29yYXRvcnM6IHN0YXRpY1Byb3BzLm1lbWJlckRlY29yYXRvcnMgfHwgaGVscGVyQ2FsbHMubWVtYmVyRGVjb3JhdG9ycyxcbiAgICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBzdGF0aWNQcm9wcy5jb25zdHJ1Y3RvclBhcmFtSW5mbyB8fCBoZWxwZXJDYWxscy5jb25zdHJ1Y3RvclBhcmFtSW5mbyxcbiAgICB9O1xuXG4gICAgdGhpcy5kZWNvcmF0b3JDYWNoZS5zZXQoZGVjbCwgZGVjb3JhdG9ySW5mbyk7XG4gICAgcmV0dXJuIGRlY29yYXRvckluZm87XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gY29tcHV0ZSBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSBzdGF0aWMgcHJvcGVydGllcyBcImRlY29yYXRvcnNcIiwgXCJwcm9wRGVjb3JhdG9yc1wiXG4gICAqIGFuZCBcImN0b3JQYXJhbWV0ZXJzXCIgb24gdGhlIGNsYXNzLiBJZiBuZWl0aGVyIG9mIHRoZXNlIHN0YXRpYyBwcm9wZXJ0aWVzIGlzIHByZXNlbnQgdGhlXG4gICAqIGxpYnJhcnkgaXMgbGlrZWx5IG5vdCBjb21waWxlZCB1c2luZyB0c2lja2xlIGZvciB1c2FnZSB3aXRoIENsb3N1cmUgY29tcGlsZXIsIGluIHdoaWNoIGNhc2VcbiAgICogYG51bGxgIGlzIHJldHVybmVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgVGhlIGNsYXNzIHN5bWJvbCB0byBjb21wdXRlIHRoZSBkZWNvcmF0b3JzIGluZm9ybWF0aW9uIGZvci5cbiAgICogQHJldHVybnMgQWxsIGluZm9ybWF0aW9uIG9uIHRoZSBkZWNvcmF0b3JzIGFzIGV4dHJhY3RlZCBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzLCBvciBgbnVsbGAgaWZcbiAgICogbm9uZSBvZiB0aGUgc3RhdGljIHByb3BlcnRpZXMgZXhpc3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29tcHV0ZURlY29yYXRvckluZm9Gcm9tU3RhdGljUHJvcGVydGllcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKToge1xuICAgIGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbDsgbWVtYmVyRGVjb3JhdG9yczogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+fCBudWxsO1xuICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXSB8IG51bGw7XG4gIH0ge1xuICAgIGxldCBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwgPSBudWxsO1xuICAgIGxldCBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT58bnVsbCA9IG51bGw7XG4gICAgbGV0IGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXXxudWxsID0gbnVsbDtcblxuICAgIGNvbnN0IGRlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIERFQ09SQVRPUlMpO1xuICAgIGlmIChkZWNvcmF0b3JzUHJvcGVydHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xhc3NEZWNvcmF0b3JzID0gdGhpcy5nZXRDbGFzc0RlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9wRGVjb3JhdG9yc1Byb3BlcnR5ID0gdGhpcy5nZXRTdGF0aWNQcm9wZXJ0eShjbGFzc1N5bWJvbCwgUFJPUF9ERUNPUkFUT1JTKTtcbiAgICBpZiAocHJvcERlY29yYXRvcnNQcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBtZW1iZXJEZWNvcmF0b3JzID0gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KHByb3BEZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnN0cnVjdG9yUGFyYW1zUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBDT05TVFJVQ1RPUl9QQVJBTVMpO1xuICAgIGlmIChjb25zdHJ1Y3RvclBhcmFtc1Byb3BlcnR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvID0gdGhpcy5nZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkoY29uc3RydWN0b3JQYXJhbXNQcm9wZXJ0eSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtjbGFzc0RlY29yYXRvcnMsIG1lbWJlckRlY29yYXRvcnMsIGNvbnN0cnVjdG9yUGFyYW1JbmZvfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGNsYXNzIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBjbGFzcywgd2hlcmUgdGhlIGRlY29yYXRvcnMgYXJlIGRlY2xhcmVkXG4gICAqIHZpYSBhIHN0YXRpYyBwcm9wZXJ0eS4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBjbGFzcyBTb21lRGlyZWN0aXZlIHt9XG4gICAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAgICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc1N5bWJvbCB0aGUgcHJvcGVydHkgY29udGFpbmluZyB0aGUgZGVjb3JhdG9ycyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBvciBudWxsIGlmIG5vbmUgd2hlcmUgZm91bmQuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNTeW1ib2w6IHRzLlN5bWJvbCk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvcnNJZGVudGlmaWVyID0gZGVjb3JhdG9yc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmIChkZWNvcmF0b3JzSWRlbnRpZmllciAmJiBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQpIHtcbiAgICAgIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24oZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSAmJlxuICAgICAgICAgIGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudC5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pIHtcbiAgICAgICAgLy8gQVNUIG9mIHRoZSBhcnJheSBvZiBkZWNvcmF0b3IgdmFsdWVzXG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnNBcnJheSA9IGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudC5yaWdodDtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9yc0FycmF5KVxuICAgICAgICAgICAgLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgc3ltYm9sIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGl0cyBtZW1iZXJzLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBgQ2xhc3NTeW1ib2xgIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyc09mU3ltYm9sKHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuXG4gICAgLy8gVGhlIGRlY29yYXRvcnMgbWFwIGNvbnRhaW5zIGFsbCB0aGUgcHJvcGVydGllcyB0aGF0IGFyZSBkZWNvcmF0ZWRcbiAgICBjb25zdCB7bWVtYmVyRGVjb3JhdG9yc30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKHN5bWJvbCk7XG5cbiAgICAvLyBNYWtlIGEgY29weSBvZiB0aGUgZGVjb3JhdG9ycyBhcyBzdWNjZXNzZnVsbHkgcmVmbGVjdGVkIG1lbWJlcnMgZGVsZXRlIHRoZW1zZWx2ZXMgZnJvbSB0aGVcbiAgICAvLyBtYXAsIHNvIHRoYXQgYW55IGxlZnRvdmVycyBjYW4gYmUgZWFzaWx5IGRlYWx0IHdpdGguXG4gICAgY29uc3QgZGVjb3JhdG9yc01hcCA9IG5ldyBNYXAobWVtYmVyRGVjb3JhdG9ycyk7XG5cbiAgICAvLyBUaGUgbWVtYmVyIG1hcCBjb250YWlucyBhbGwgdGhlIG1ldGhvZCAoaW5zdGFuY2UgYW5kIHN0YXRpYyk7IGFuZCBhbnkgaW5zdGFuY2UgcHJvcGVydGllc1xuICAgIC8vIHRoYXQgYXJlIGluaXRpYWxpemVkIGluIHRoZSBjbGFzcy5cbiAgICBpZiAoc3ltYm9sLmltcGxlbWVudGF0aW9uLm1lbWJlcnMpIHtcbiAgICAgIHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5tZW1iZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgc3RhdGljIHByb3BlcnR5IG1hcCBjb250YWlucyBhbGwgdGhlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgaWYgKHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5leHBvcnRzKSB7XG4gICAgICBzeW1ib2wuaW1wbGVtZW50YXRpb24uZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBjbGFzcyB3YXMgZGVjbGFyZWQgYXMgYSBWYXJpYWJsZURlY2xhcmF0aW9uIHRoZW4gaXQgbWF5IGhhdmUgc3RhdGljIHByb3BlcnRpZXNcbiAgICAvLyBhdHRhY2hlZCB0byB0aGUgdmFyaWFibGUgcmF0aGVyIHRoYW4gdGhlIGNsYXNzIGl0c2VsZlxuICAgIC8vIEZvciBleGFtcGxlOlxuICAgIC8vIGBgYFxuICAgIC8vIGxldCBNeUNsYXNzID0gY2xhc3MgTXlDbGFzcyB7XG4gICAgLy8gICAvLyBubyBzdGF0aWMgcHJvcGVydGllcyBoZXJlIVxuICAgIC8vIH1cbiAgICAvLyBNeUNsYXNzLnN0YXRpY1Byb3BlcnR5ID0gLi4uO1xuICAgIC8vIGBgYFxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oc3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICBpZiAoc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMpIHtcbiAgICAgICAgc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycywgdHJ1ZSk7XG4gICAgICAgICAgaWYgKHJlZmxlY3RlZE1lbWJlcnMpIHtcbiAgICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBjbGFzcyB3YXMgZGVjbGFyZWQgYXMgYSBWYXJpYWJsZURlY2xhcmF0aW9uIGluc2lkZSBhbiBJSUZFLCB0aGVuIGl0IG1heSBoYXZlIHN0YXRpY1xuICAgIC8vIHByb3BlcnRpZXMgYXR0YWNoZWQgdG8gdGhlIHZhcmlhYmxlIHJhdGhlciB0aGFuIHRoZSBjbGFzcyBpdHNlbGYuXG4gICAgLy9cbiAgICAvLyBGb3IgZXhhbXBsZTpcbiAgICAvLyBgYGBcbiAgICAvLyBsZXQgT3V0ZXJDbGFzcyA9ICgoKSA9PiB7XG4gICAgLy8gICBsZXQgQWRqYWNlbnRDbGFzcyA9IGNsYXNzIEludGVybmFsQ2xhc3Mge1xuICAgIC8vICAgICAvLyBubyBzdGF0aWMgcHJvcGVydGllcyBoZXJlIVxuICAgIC8vICAgfVxuICAgIC8vICAgQWRqYWNlbnRDbGFzcy5zdGF0aWNQcm9wZXJ0eSA9IC4uLjtcbiAgICAvLyB9KSgpO1xuICAgIC8vIGBgYFxuICAgIGlmIChzeW1ib2wuYWRqYWNlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihzeW1ib2wuYWRqYWNlbnQudmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgICAgaWYgKHN5bWJvbC5hZGphY2VudC5leHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBzeW1ib2wuYWRqYWNlbnQuZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycywgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVhbCB3aXRoIGFueSBkZWNvcmF0ZWQgcHJvcGVydGllcyB0aGF0IHdlcmUgbm90IGluaXRpYWxpemVkIGluIHRoZSBjbGFzc1xuICAgIGRlY29yYXRvcnNNYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgaW1wbGVtZW50YXRpb246IG51bGwsXG4gICAgICAgIGRlY29yYXRvcnM6IHZhbHVlLFxuICAgICAgICBpc1N0YXRpYzogZmFsc2UsXG4gICAgICAgIGtpbmQ6IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eSxcbiAgICAgICAgbmFtZToga2V5LFxuICAgICAgICBuYW1lTm9kZTogbnVsbCxcbiAgICAgICAgbm9kZTogbnVsbCxcbiAgICAgICAgdHlwZTogbnVsbCxcbiAgICAgICAgdmFsdWU6IG51bGxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogTWVtYmVyIGRlY29yYXRvcnMgbWF5IGJlIGRlY2xhcmVkIGFzIHN0YXRpYyBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzczpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gICAqICAgXCJuZ0Zvck9mXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVHJhY2tCeVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRlbXBsYXRlXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogfTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzUHJvcGVydHkgdGhlIGNsYXNzIHdob3NlIG1lbWJlciBkZWNvcmF0b3JzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhIG1hcCB3aG9zZSBrZXlzIGFyZSB0aGUgbmFtZSBvZiB0aGUgbWVtYmVycyBhbmQgd2hvc2UgdmFsdWVzIGFyZSBjb2xsZWN0aW9ucyBvZlxuICAgKiBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlckRlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOlxuICAgICAgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+IHtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuICAgIC8vIFN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBmb3IgYFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnNgLlxuICAgIGNvbnN0IHByb3BEZWNvcmF0b3JzTWFwID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2woZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBpZiAocHJvcERlY29yYXRvcnNNYXAgJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wRGVjb3JhdG9yc01hcCkpIHtcbiAgICAgIGNvbnN0IHByb3BlcnRpZXNNYXAgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChwcm9wRGVjb3JhdG9yc01hcCk7XG4gICAgICBwcm9wZXJ0aWVzTWFwLmZvckVhY2goKHZhbHVlLCBuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyh2YWx1ZSkuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlckRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogRm9yIGEgZ2l2ZW4gY2xhc3Mgc3ltYm9sLCBjb2xsZWN0cyBhbGwgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gdHNsaWIgaGVscGVyIG1ldGhvZHMsIGFzXG4gICAqIGdlbmVyYXRlZCBieSBUeXBlU2NyaXB0IGludG8gZW1pdHRlZCBKYXZhU2NyaXB0IGZpbGVzLlxuICAgKlxuICAgKiBDbGFzcyBkZWNvcmF0b3JzIGFyZSBleHRyYWN0ZWQgZnJvbSBjYWxscyB0byBgdHNsaWIuX19kZWNvcmF0ZWAgdGhhdCBsb29rIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBsZXQgU29tZURpcmVjdGl2ZSA9IGNsYXNzIFNvbWVEaXJlY3RpdmUge31cbiAgICogU29tZURpcmVjdGl2ZSA9IF9fZGVjb3JhdGUoW1xuICAgKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAgICogXSwgU29tZURpcmVjdGl2ZSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGUgZXh0cmFjdGlvbiBvZiBtZW1iZXIgZGVjb3JhdG9ycyBpcyBzaW1pbGFyLCB3aXRoIHRoZSBkaXN0aW5jdGlvbiB0aGF0IGl0cyAybmQgYW5kIDNyZFxuICAgKiBhcmd1bWVudCBjb3JyZXNwb25kIHdpdGggYSBcInByb3RvdHlwZVwiIHRhcmdldCBhbmQgdGhlIG5hbWUgb2YgdGhlIG1lbWJlciB0byB3aGljaCB0aGVcbiAgICogZGVjb3JhdG9ycyBhcHBseS5cbiAgICpcbiAgICogYGBgXG4gICAqIF9fZGVjb3JhdGUoW1xuICAgKiAgICAgSW5wdXQoKSxcbiAgICogICAgIF9fbWV0YWRhdGEoXCJkZXNpZ246dHlwZVwiLCBTdHJpbmcpXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUucHJvdG90eXBlLCBcImlucHV0MVwiLCB2b2lkIDApO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIFRoZSBjbGFzcyBzeW1ib2wgZm9yIHdoaWNoIGRlY29yYXRvcnMgc2hvdWxkIGJlIGV4dHJhY3RlZC5cbiAgICogQHJldHVybnMgQWxsIGluZm9ybWF0aW9uIG9uIHRoZSBkZWNvcmF0b3JzIG9mIHRoZSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21IZWxwZXJDYWxscyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9ySW5mbyB7XG4gICAgbGV0IGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCA9IG51bGw7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICBjb25zdCBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW10gPSBbXTtcblxuICAgIGNvbnN0IGdldENvbnN0cnVjdG9yUGFyYW1JbmZvID0gKGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgIGxldCBwYXJhbSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XTtcbiAgICAgIGlmIChwYXJhbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhcmFtID0gY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdID0ge2RlY29yYXRvcnM6IG51bGwsIHR5cGVFeHByZXNzaW9uOiBudWxsfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYXJhbTtcbiAgICB9O1xuXG4gICAgLy8gQWxsIHJlbGV2YW50IGluZm9ybWF0aW9uIGNhbiBiZSBleHRyYWN0ZWQgZnJvbSBjYWxscyB0byBgX19kZWNvcmF0ZWAsIG9idGFpbiB0aGVzZSBmaXJzdC5cbiAgICAvLyBOb3RlIHRoYXQgYWx0aG91Z2ggdGhlIGhlbHBlciBjYWxscyBhcmUgcmV0cmlldmVkIHVzaW5nIHRoZSBjbGFzcyBzeW1ib2wsIHRoZSByZXN1bHQgbWF5XG4gICAgLy8gY29udGFpbiBoZWxwZXIgY2FsbHMgY29ycmVzcG9uZGluZyB3aXRoIHVucmVsYXRlZCBjbGFzc2VzLiBUaGVyZWZvcmUsIGVhY2ggaGVscGVyIGNhbGwgc3RpbGxcbiAgICAvLyBoYXMgdG8gYmUgY2hlY2tlZCB0byBhY3R1YWxseSBjb3JyZXNwb25kIHdpdGggdGhlIGNsYXNzIHN5bWJvbC5cbiAgICBjb25zdCBoZWxwZXJDYWxscyA9IHRoaXMuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbCwgWydfX2RlY29yYXRlJ10pO1xuXG4gICAgY29uc3Qgb3V0ZXJEZWNsYXJhdGlvbiA9IGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgY29uc3QgaW5uZXJEZWNsYXJhdGlvbiA9IGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgY29uc3QgYWRqYWNlbnREZWNsYXJhdGlvbiA9IHRoaXMuZ2V0QWRqYWNlbnROYW1lT2ZDbGFzc1N5bWJvbChjbGFzc1N5bWJvbCkucGFyZW50O1xuICAgIGNvbnN0IG1hdGNoZXNDbGFzcyA9IChpZGVudGlmaWVyOiB0cy5JZGVudGlmaWVyKSA9PiB7XG4gICAgICBjb25zdCBkZWNsID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICAgIHJldHVybiBkZWNsICE9PSBudWxsICYmXG4gICAgICAgICAgKGRlY2wubm9kZSA9PT0gYWRqYWNlbnREZWNsYXJhdGlvbiB8fCBkZWNsLm5vZGUgPT09IG91dGVyRGVjbGFyYXRpb24gfHxcbiAgICAgICAgICAgZGVjbC5ub2RlID09PSBpbm5lckRlY2xhcmF0aW9uKTtcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCBoZWxwZXJDYWxsIG9mIGhlbHBlckNhbGxzKSB7XG4gICAgICBpZiAoaXNDbGFzc0RlY29yYXRlQ2FsbChoZWxwZXJDYWxsLCBtYXRjaGVzQ2xhc3MpKSB7XG4gICAgICAgIC8vIFRoaXMgYF9fZGVjb3JhdGVgIGNhbGwgaXMgdGFyZ2V0aW5nIHRoZSBjbGFzcyBpdHNlbGYuXG4gICAgICAgIGNvbnN0IGhlbHBlckFyZ3MgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1swXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgaGVscGVyQXJncy5lbGVtZW50cykge1xuICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5yZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShlbGVtZW50KTtcbiAgICAgICAgICBpZiAoZW50cnkgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSAnZGVjb3JhdG9yJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgd2FzIHJlZmxlY3RlZCB0byByZXByZXNlbnQgYW4gYWN0dWFsIGRlY29yYXRvclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNGcm9tQ29yZShlbnRyeS5kZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICAgIChjbGFzc0RlY29yYXRvcnMgfHwgKGNsYXNzRGVjb3JhdG9ycyA9IFtdKSkucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkudHlwZSA9PT0gJ3BhcmFtOmRlY29yYXRvcnMnKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyByZXByZXNlbnRzIGEgZGVjb3JhdG9yIGZvciBhIHBhcmFtZXRlci4gU2luY2UgaXQncyBhcHBsaWVkIHRvIHRoZVxuICAgICAgICAgICAgLy8gY2xhc3MsIGl0IGNvcnJlc3BvbmRzIHdpdGggYSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgb2YgdGhlIGNsYXNzLlxuICAgICAgICAgICAgY29uc3QgcGFyYW0gPSBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhlbnRyeS5pbmRleCk7XG4gICAgICAgICAgICAocGFyYW0uZGVjb3JhdG9ycyB8fCAocGFyYW0uZGVjb3JhdG9ycyA9IFtdKSkucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkudHlwZSA9PT0gJ3BhcmFtcycpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHJlcHJlc2VudHMgdGhlIHR5cGVzIG9mIHRoZSBwYXJhbWV0ZXJzLiBTaW5jZSBpdCdzIGFwcGxpZWQgdG8gdGhlXG4gICAgICAgICAgICAvLyBjbGFzcywgaXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiB0aGUgY2xhc3MuXG4gICAgICAgICAgICBlbnRyeS50eXBlcy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICh0eXBlLCBpbmRleCkgPT4gZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oaW5kZXgpLnR5cGVFeHByZXNzaW9uID0gdHlwZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzTWVtYmVyRGVjb3JhdGVDYWxsKGhlbHBlckNhbGwsIG1hdGNoZXNDbGFzcykpIHtcbiAgICAgICAgLy8gVGhlIGBfX2RlY29yYXRlYCBjYWxsIGlzIHRhcmdldGluZyBhIG1lbWJlciBvZiB0aGUgY2xhc3NcbiAgICAgICAgY29uc3QgaGVscGVyQXJncyA9IGhlbHBlckNhbGwuYXJndW1lbnRzWzBdO1xuICAgICAgICBjb25zdCBtZW1iZXJOYW1lID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMl0udGV4dDtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgaGVscGVyQXJncy5lbGVtZW50cykge1xuICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5yZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShlbGVtZW50KTtcbiAgICAgICAgICBpZiAoZW50cnkgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSAnZGVjb3JhdG9yJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgd2FzIHJlZmxlY3RlZCB0byByZXByZXNlbnQgYW4gYWN0dWFsIGRlY29yYXRvci5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzRnJvbUNvcmUoZW50cnkuZGVjb3JhdG9yKSkge1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID1cbiAgICAgICAgICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuaGFzKG1lbWJlck5hbWUpID8gbWVtYmVyRGVjb3JhdG9ycy5nZXQobWVtYmVyTmFtZSkhIDogW107XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLnNldChtZW1iZXJOYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSW5mb3JtYXRpb24gb24gZGVjb3JhdGVkIHBhcmFtZXRlcnMgaXMgbm90IGludGVyZXN0aW5nIGZvciBuZ2NjLCBzbyBpdCdzIGlnbm9yZWQuXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtjbGFzc0RlY29yYXRvcnMsIG1lbWJlckRlY29yYXRvcnMsIGNvbnN0cnVjdG9yUGFyYW1JbmZvfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IHRoZSBkZXRhaWxzIG9mIGFuIGVudHJ5IHdpdGhpbiBhIGBfX2RlY29yYXRlYCBoZWxwZXIgY2FsbC4gRm9yIGV4YW1wbGUsIGdpdmVuIHRoZVxuICAgKiBmb2xsb3dpbmcgY29kZTpcbiAgICpcbiAgICogYGBgXG4gICAqIF9fZGVjb3JhdGUoW1xuICAgKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAgICogICB0c2xpYl8xLl9fcGFyYW0oMiwgSW5qZWN0KElOSkVDVEVEX1RPS0VOKSksXG4gICAqICAgdHNsaWJfMS5fX21ldGFkYXRhKFwiZGVzaWduOnBhcmFtdHlwZXNcIiwgW1ZpZXdDb250YWluZXJSZWYsIFRlbXBsYXRlUmVmLCBTdHJpbmddKVxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIGl0IGNhbiBiZSBzZWVuIHRoYXQgdGhlcmUgYXJlIGNhbGxzIHRvIHJlZ3VsYXIgZGVjb3JhdG9ycyAodGhlIGBEaXJlY3RpdmVgKSBhbmQgY2FsbHMgaW50b1xuICAgKiBgdHNsaWJgIGZ1bmN0aW9ucyB3aGljaCBoYXZlIGJlZW4gaW5zZXJ0ZWQgYnkgVHlwZVNjcmlwdC4gVGhlcmVmb3JlLCB0aGlzIGZ1bmN0aW9uIGNsYXNzaWZpZXNcbiAgICogYSBjYWxsIHRvIGNvcnJlc3BvbmQgd2l0aFxuICAgKiAgIDEuIGEgcmVhbCBkZWNvcmF0b3IgbGlrZSBgRGlyZWN0aXZlYCBhYm92ZSwgb3JcbiAgICogICAyLiBhIGRlY29yYXRlZCBwYXJhbWV0ZXIsIGNvcnJlc3BvbmRpbmcgd2l0aCBgX19wYXJhbWAgY2FsbHMgZnJvbSBgdHNsaWJgLCBvclxuICAgKiAgIDMuIHRoZSB0eXBlIGluZm9ybWF0aW9uIG9mIHBhcmFtZXRlcnMsIGNvcnJlc3BvbmRpbmcgd2l0aCBgX19tZXRhZGF0YWAgY2FsbCBmcm9tIGB0c2xpYmBcbiAgICpcbiAgICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBuZWVkcyB0byBiZSByZWZsZWN0ZWQgaW50byBhIGBEZWNvcmF0ZUhlbHBlckVudHJ5YFxuICAgKiBAcmV0dXJucyBhbiBvYmplY3QgdGhhdCBpbmRpY2F0ZXMgd2hpY2ggb2YgdGhlIHRocmVlIGNhdGVnb3JpZXMgdGhlIGNhbGwgcmVwcmVzZW50cywgdG9nZXRoZXJcbiAgICogd2l0aCB0aGUgcmVmbGVjdGVkIGluZm9ybWF0aW9uIG9mIHRoZSBjYWxsLCBvciBudWxsIGlmIHRoZSBjYWxsIGlzIG5vdCBhIHZhbGlkIGRlY29yYXRlIGNhbGwuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IERlY29yYXRlSGVscGVyRW50cnl8bnVsbCB7XG4gICAgLy8gV2Ugb25seSBjYXJlIGFib3V0IHRob3NlIGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbCBjYWxsc1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGNhbGwgPSBleHByZXNzaW9uO1xuXG4gICAgY29uc3QgaGVscGVyTmFtZSA9IGdldENhbGxlZU5hbWUoY2FsbCk7XG4gICAgaWYgKGhlbHBlck5hbWUgPT09ICdfX21ldGFkYXRhJykge1xuICAgICAgLy8gVGhpcyBpcyBhIGB0c2xpYi5fX21ldGFkYXRhYCBjYWxsLCByZWZsZWN0IHRvIGFyZ3VtZW50cyBpbnRvIGEgYFBhcmFtZXRlclR5cGVzYCBvYmplY3RcbiAgICAgIC8vIGlmIHRoZSBtZXRhZGF0YSBrZXkgaXMgXCJkZXNpZ246cGFyYW10eXBlc1wiLlxuICAgICAgY29uc3Qga2V5ID0gY2FsbC5hcmd1bWVudHNbMF07XG4gICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbChrZXkpIHx8IGtleS50ZXh0ICE9PSAnZGVzaWduOnBhcmFtdHlwZXMnKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdwYXJhbXMnLFxuICAgICAgICB0eXBlczogQXJyYXkuZnJvbSh2YWx1ZS5lbGVtZW50cyksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChoZWxwZXJOYW1lID09PSAnX19wYXJhbScpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBgdHNsaWIuX19wYXJhbWAgY2FsbCB0aGF0IGlzIHJlZmxlY3RlZCBpbnRvIGEgYFBhcmFtZXRlckRlY29yYXRvcnNgIG9iamVjdC5cbiAgICAgIGNvbnN0IGluZGV4QXJnID0gY2FsbC5hcmd1bWVudHNbMF07XG4gICAgICBjb25zdCBpbmRleCA9IGluZGV4QXJnICYmIHRzLmlzTnVtZXJpY0xpdGVyYWwoaW5kZXhBcmcpID8gcGFyc2VJbnQoaW5kZXhBcmcudGV4dCwgMTApIDogTmFOO1xuICAgICAgaWYgKGlzTmFOKGluZGV4KSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjb3JhdG9yQ2FsbCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGRlY29yYXRvckNhbGwgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihkZWNvcmF0b3JDYWxsKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjb3JhdG9yID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChkZWNvcmF0b3JDYWxsKTtcbiAgICAgIGlmIChkZWNvcmF0b3IgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdwYXJhbTpkZWNvcmF0b3JzJyxcbiAgICAgICAgaW5kZXgsXG4gICAgICAgIGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIGF0dGVtcHQgdG8gcmVmbGVjdCBpdCBhcyBhIHJlZ3VsYXIgZGVjb3JhdG9yLlxuICAgIGNvbnN0IGRlY29yYXRvciA9IHRoaXMucmVmbGVjdERlY29yYXRvckNhbGwoY2FsbCk7XG4gICAgaWYgKGRlY29yYXRvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnZGVjb3JhdG9yJyxcbiAgICAgIGRlY29yYXRvcixcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JDYWxsKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKTogRGVjb3JhdG9yfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvckV4cHJlc3Npb24gPSBjYWxsLmV4cHJlc3Npb247XG4gICAgaWYgKCFpc0RlY29yYXRvcklkZW50aWZpZXIoZGVjb3JhdG9yRXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdlIGZvdW5kIGEgZGVjb3JhdG9yIVxuICAgIGNvbnN0IGRlY29yYXRvcklkZW50aWZpZXIgPVxuICAgICAgICB0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yRXhwcmVzc2lvbikgPyBkZWNvcmF0b3JFeHByZXNzaW9uIDogZGVjb3JhdG9yRXhwcmVzc2lvbi5uYW1lO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvckV4cHJlc3Npb24sXG4gICAgICBpbXBvcnQ6IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpLFxuICAgICAgbm9kZTogY2FsbCxcbiAgICAgIGFyZ3M6IEFycmF5LmZyb20oY2FsbC5hcmd1bWVudHMpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIGdpdmVuIHN0YXRlbWVudCB0byBzZWUgaWYgaXQgaXMgYSBjYWxsIHRvIGFueSBvZiB0aGUgc3BlY2lmaWVkIGhlbHBlciBmdW5jdGlvbnMgb3JcbiAgICogbnVsbCBpZiBub3QgZm91bmQuXG4gICAqXG4gICAqIE1hdGNoaW5nIHN0YXRlbWVudHMgd2lsbCBsb29rIGxpa2U6ICBgdHNsaWJfMS5fX2RlY29yYXRlKC4uLik7YC5cbiAgICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRoYXQgbWF5IGNvbnRhaW4gdGhlIGNhbGwuXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lcyB0aGUgbmFtZXMgb2YgdGhlIGhlbHBlciB3ZSBhcmUgbG9va2luZyBmb3IuXG4gICAqIEByZXR1cm5zIHRoZSBub2RlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGBfX2RlY29yYXRlKC4uLilgIGNhbGwgb3IgbnVsbCBpZiB0aGUgc3RhdGVtZW50XG4gICAqIGRvZXMgbm90IG1hdGNoLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEhlbHBlckNhbGwoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIGhlbHBlck5hbWVzOiBzdHJpbmdbXSk6IHRzLkNhbGxFeHByZXNzaW9ufG51bGwge1xuICAgIGlmICgodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgfHwgdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgJiZcbiAgICAgICAgc3RhdGVtZW50LmV4cHJlc3Npb24pIHtcbiAgICAgIGxldCBleHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgICB3aGlsZSAoaXNBc3NpZ25tZW50KGV4cHJlc3Npb24pKSB7XG4gICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnJpZ2h0O1xuICAgICAgfVxuICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHtcbiAgICAgICAgY29uc3QgY2FsbGVlTmFtZSA9IGdldENhbGxlZU5hbWUoZXhwcmVzc2lvbik7XG4gICAgICAgIGlmIChjYWxsZWVOYW1lICE9PSBudWxsICYmIGhlbHBlck5hbWVzLmluY2x1ZGVzKGNhbGxlZU5hbWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGV4cHJlc3Npb247XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgdGhlIGdpdmVuIGFycmF5IG5vZGUgYW5kIGV4dHJhY3QgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gZWFjaCBlbGVtZW50LlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgZm9yIGRlY29yYXRvcnMgdGhhdCBhcmUgZGVmaW5lZCBpbiBzdGF0aWMgcHJvcGVydGllcy4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNBcnJheSBhbiBleHByZXNzaW9uIHRoYXQgY29udGFpbnMgZGVjb3JhdG9yIGluZm9ybWF0aW9uLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBkZWNvcmF0b3IgaW5mbyB0aGF0IHdhcyByZWZsZWN0ZWQgZnJvbSB0aGUgYXJyYXkgbm9kZS5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXk6IHRzLkV4cHJlc3Npb24pOiBEZWNvcmF0b3JbXSB7XG4gICAgY29uc3QgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gPSBbXTtcblxuICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVjb3JhdG9yc0FycmF5KSkge1xuICAgICAgLy8gQWRkIGVhY2ggZGVjb3JhdG9yIHRoYXQgaXMgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWAgaW50byB0aGUgYGRlY29yYXRvcnNgIGFycmF5XG4gICAgICBkZWNvcmF0b3JzQXJyYXkuZWxlbWVudHMuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgLy8gSWYgdGhlIGRlY29yYXRvciBpcyBub3QgYW4gb2JqZWN0IGxpdGVyYWwgZXhwcmVzc2lvbiB0aGVuIHdlIGFyZSBub3QgaW50ZXJlc3RlZFxuICAgICAgICBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgICAgIC8vIFdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gb2JqZWN0cyBvZiB0aGUgZm9ybTogYHsgdHlwZTogRGVjb3JhdG9yVHlwZSwgYXJnczogWy4uLl0gfWBcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3IgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChub2RlKTtcblxuICAgICAgICAgIC8vIElzIHRoZSB2YWx1ZSBvZiB0aGUgYHR5cGVgIHByb3BlcnR5IGFuIGlkZW50aWZpZXI/XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5oYXMoJ3R5cGUnKSkge1xuICAgICAgICAgICAgbGV0IGRlY29yYXRvclR5cGUgPSBkZWNvcmF0b3IuZ2V0KCd0eXBlJykhO1xuICAgICAgICAgICAgaWYgKGlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSkge1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JJZGVudGlmaWVyID1cbiAgICAgICAgICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSA/IGRlY29yYXRvclR5cGUgOiBkZWNvcmF0b3JUeXBlLm5hbWU7XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvclR5cGUsXG4gICAgICAgICAgICAgICAgaW1wb3J0OiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWNvcmF0b3JJZGVudGlmaWVyKSxcbiAgICAgICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgICAgIGFyZ3M6IGdldERlY29yYXRvckFyZ3Mobm9kZSksXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBkZWNvcmF0b3JzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciBhIHN5bWJvbCBhbmQgZXh0cmFjdCB0aGUgbWVtYmVyIGluZm9ybWF0aW9uLCBjb21iaW5pbmcgaXQgd2l0aCB0aGVcbiAgICogcHJvdmlkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uLCBhbmQgd2hldGhlciBpdCBpcyBhIHN0YXRpYyBtZW1iZXIuXG4gICAqXG4gICAqIEEgc2luZ2xlIHN5bWJvbCBtYXkgcmVwcmVzZW50IG11bHRpcGxlIGNsYXNzIG1lbWJlcnMgaW4gdGhlIGNhc2Ugb2YgYWNjZXNzb3JzO1xuICAgKiBhbiBlcXVhbGx5IG5hbWVkIGdldHRlci9zZXR0ZXIgYWNjZXNzb3IgcGFpciBpcyBjb21iaW5lZCBpbnRvIGEgc2luZ2xlIHN5bWJvbC5cbiAgICogV2hlbiB0aGUgc3ltYm9sIGlzIHJlY29nbml6ZWQgYXMgcmVwcmVzZW50aW5nIGFuIGFjY2Vzc29yLCBpdHMgZGVjbGFyYXRpb25zIGFyZVxuICAgKiBhbmFseXplZCBzdWNoIHRoYXQgYm90aCB0aGUgc2V0dGVyIGFuZCBnZXR0ZXIgYWNjZXNzb3IgYXJlIHJldHVybmVkIGFzIHNlcGFyYXRlXG4gICAqIGNsYXNzIG1lbWJlcnMuXG4gICAqXG4gICAqIE9uZSBkaWZmZXJlbmNlIHdydCB0aGUgVHlwZVNjcmlwdCBob3N0IGlzIHRoYXQgaW4gRVMyMDE1LCB3ZSBjYW5ub3Qgc2VlIHdoaWNoXG4gICAqIGFjY2Vzc29yIG9yaWdpbmFsbHkgaGFkIGFueSBkZWNvcmF0b3JzIGFwcGxpZWQgdG8gdGhlbSwgYXMgZGVjb3JhdG9ycyBhcmUgYXBwbGllZFxuICAgKiB0byB0aGUgcHJvcGVydHkgZGVzY3JpcHRvciBpbiBnZW5lcmFsLCBub3QgYSBzcGVjaWZpYyBhY2Nlc3Nvci4gSWYgYW4gYWNjZXNzb3JcbiAgICogaGFzIGJvdGggYSBzZXR0ZXIgYW5kIGdldHRlciwgYW55IGRlY29yYXRvcnMgYXJlIG9ubHkgYXR0YWNoZWQgdG8gdGhlIHNldHRlciBtZW1iZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIHN5bWJvbCBmb3IgdGhlIG1lbWJlciB0byByZWZsZWN0IG92ZXIuXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBtZW1iZXIuXG4gICAqIEBwYXJhbSBpc1N0YXRpYyB0cnVlIGlmIHRoaXMgbWVtYmVyIGlzIHN0YXRpYywgZmFsc2UgaWYgaXQgaXMgYW4gaW5zdGFuY2UgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSByZWZsZWN0ZWQgbWVtYmVyIGluZm9ybWF0aW9uLCBvciBudWxsIGlmIHRoZSBzeW1ib2wgaXMgbm90IGEgbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3RNZW1iZXJzKHN5bWJvbDogdHMuU3ltYm9sLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sIGlzU3RhdGljPzogYm9vbGVhbik6XG4gICAgICBDbGFzc01lbWJlcltdfG51bGwge1xuICAgIGlmIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BY2Nlc3Nvcikge1xuICAgICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuICAgICAgY29uc3Qgc2V0dGVyID0gc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmZpbmQodHMuaXNTZXRBY2Nlc3Nvcik7XG4gICAgICBjb25zdCBnZXR0ZXIgPSBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMuZmluZCh0cy5pc0dldEFjY2Vzc29yKTtcblxuICAgICAgY29uc3Qgc2V0dGVyTWVtYmVyID1cbiAgICAgICAgICBzZXR0ZXIgJiYgdGhpcy5yZWZsZWN0TWVtYmVyKHNldHRlciwgQ2xhc3NNZW1iZXJLaW5kLlNldHRlciwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgICAgaWYgKHNldHRlck1lbWJlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goc2V0dGVyTWVtYmVyKTtcblxuICAgICAgICAvLyBQcmV2ZW50IGF0dGFjaGluZyB0aGUgZGVjb3JhdG9ycyB0byBhIHBvdGVudGlhbCBnZXR0ZXIuIEluIEVTMjAxNSwgd2UgY2FuJ3QgdGVsbCB3aGVyZVxuICAgICAgICAvLyB0aGUgZGVjb3JhdG9ycyB3ZXJlIG9yaWdpbmFsbHkgYXR0YWNoZWQgdG8sIGhvd2V2ZXIgd2Ugb25seSB3YW50IHRvIGF0dGFjaCB0aGVtIHRvIGFcbiAgICAgICAgLy8gc2luZ2xlIGBDbGFzc01lbWJlcmAgYXMgb3RoZXJ3aXNlIG5ndHNjIHdvdWxkIGhhbmRsZSB0aGUgc2FtZSBkZWNvcmF0b3JzIHR3aWNlLlxuICAgICAgICBkZWNvcmF0b3JzID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBnZXR0ZXJNZW1iZXIgPVxuICAgICAgICAgIGdldHRlciAmJiB0aGlzLnJlZmxlY3RNZW1iZXIoZ2V0dGVyLCBDbGFzc01lbWJlcktpbmQuR2V0dGVyLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgICBpZiAoZ2V0dGVyTWVtYmVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaChnZXR0ZXJNZW1iZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbWVtYmVycztcbiAgICB9XG5cbiAgICBsZXQga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwgPSBudWxsO1xuICAgIGlmIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5NZXRob2QpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuTWV0aG9kO1xuICAgIH0gZWxzZSBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuUHJvcGVydHkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZSA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIC8vIElmIHRoZSBzeW1ib2wgaGFzIGJlZW4gaW1wb3J0ZWQgZnJvbSBhIFR5cGVTY3JpcHQgdHlwaW5ncyBmaWxlIHRoZW4gdGhlIGNvbXBpbGVyXG4gICAgICAvLyBtYXkgcGFzcyB0aGUgYHByb3RvdHlwZWAgc3ltYm9sIGFzIGFuIGV4cG9ydCBvZiB0aGUgY2xhc3MuXG4gICAgICAvLyBCdXQgdGhpcyBoYXMgbm8gZGVjbGFyYXRpb24uIEluIHRoaXMgY2FzZSB3ZSBqdXN0IHF1aWV0bHkgaWdub3JlIGl0LlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbWVtYmVyID0gdGhpcy5yZWZsZWN0TWVtYmVyKG5vZGUsIGtpbmQsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBpZiAoIW1lbWJlcikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIFttZW1iZXJdO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciBhIHN5bWJvbCBhbmQgZXh0cmFjdCB0aGUgbWVtYmVyIGluZm9ybWF0aW9uLCBjb21iaW5pbmcgaXQgd2l0aCB0aGVcbiAgICogcHJvdmlkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uLCBhbmQgd2hldGhlciBpdCBpcyBhIHN0YXRpYyBtZW1iZXIuXG4gICAqIEBwYXJhbSBub2RlIHRoZSBkZWNsYXJhdGlvbiBub2RlIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGtpbmQgdGhlIGFzc3VtZWQga2luZCBvZiB0aGUgbWVtYmVyLCBtYXkgYmVjb21lIG1vcmUgYWNjdXJhdGUgZHVyaW5nIHJlZmxlY3Rpb24uXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBtZW1iZXIuXG4gICAqIEBwYXJhbSBpc1N0YXRpYyB0cnVlIGlmIHRoaXMgbWVtYmVyIGlzIHN0YXRpYywgZmFsc2UgaWYgaXQgaXMgYW4gaW5zdGFuY2UgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSByZWZsZWN0ZWQgbWVtYmVyIGluZm9ybWF0aW9uLCBvciBudWxsIGlmIHRoZSBzeW1ib2wgaXMgbm90IGEgbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3RNZW1iZXIoXG4gICAgICBub2RlOiB0cy5EZWNsYXJhdGlvbiwga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSxcbiAgICAgIGlzU3RhdGljPzogYm9vbGVhbik6IENsYXNzTWVtYmVyfG51bGwge1xuICAgIGxldCB2YWx1ZTogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lTm9kZTogdHMuSWRlbnRpZmllcnxudWxsID0gbnVsbDtcblxuICAgIGlmICghaXNDbGFzc01lbWJlclR5cGUobm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChpc1N0YXRpYyAmJiBpc1Byb3BlcnR5QWNjZXNzKG5vZGUpKSB7XG4gICAgICBuYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgICB2YWx1ZSA9IGtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eSA/IG5vZGUucGFyZW50LnJpZ2h0IDogbnVsbDtcbiAgICB9IGVsc2UgaWYgKGlzVGhpc0Fzc2lnbm1lbnQobm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG4gICAgICBuYW1lID0gbm9kZS5sZWZ0Lm5hbWUudGV4dDtcbiAgICAgIHZhbHVlID0gbm9kZS5yaWdodDtcbiAgICAgIGlzU3RhdGljID0gZmFsc2U7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuQ29uc3RydWN0b3I7XG4gICAgICBuYW1lID0gJ2NvbnN0cnVjdG9yJztcbiAgICAgIGlzU3RhdGljID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGtpbmQgPT09IG51bGwpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oYFVua25vd24gbWVtYmVyIHR5cGU6IFwiJHtub2RlLmdldFRleHQoKX1gKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghbmFtZSkge1xuICAgICAgaWYgKGlzTmFtZWREZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICBuYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgICAgIG5hbWVOb2RlID0gbm9kZS5uYW1lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgaGF2ZSBzdGlsbCBub3QgZGV0ZXJtaW5lZCBpZiB0aGlzIGlzIGEgc3RhdGljIG9yIGluc3RhbmNlIG1lbWJlciB0aGVuXG4gICAgLy8gbG9vayBmb3IgdGhlIGBzdGF0aWNgIGtleXdvcmQgb24gdGhlIGRlY2xhcmF0aW9uXG4gICAgaWYgKGlzU3RhdGljID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlzU3RhdGljID0gbm9kZS5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIG5vZGUubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGU6IHRzLlR5cGVOb2RlID0gKG5vZGUgYXMgYW55KS50eXBlIHx8IG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5vZGUsXG4gICAgICBpbXBsZW1lbnRhdGlvbjogbm9kZSxcbiAgICAgIGtpbmQsXG4gICAgICB0eXBlLFxuICAgICAgbmFtZSxcbiAgICAgIG5hbWVOb2RlLFxuICAgICAgdmFsdWUsXG4gICAgICBpc1N0YXRpYyxcbiAgICAgIGRlY29yYXRvcnM6IGRlY29yYXRvcnMgfHwgW11cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwYXJhbWV0ZXJzIHdlIHdhbnQgdG8gZmluZC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uYCBvYmplY3RzIHJlcHJlc2VudGluZyBlYWNoIG9mIHRoZSBwYXJhbWV0ZXJzIGluXG4gICAqIHRoZSBjbGFzcydzIGNvbnN0cnVjdG9yIG9yIG51bGwgaWYgdGhlcmUgaXMgbm8gY29uc3RydWN0b3IuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6XG4gICAgICB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdfG51bGwge1xuICAgIGNvbnN0IG1lbWJlcnMgPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi5tZW1iZXJzO1xuICAgIGlmIChtZW1iZXJzICYmIG1lbWJlcnMuaGFzKENPTlNUUlVDVE9SKSkge1xuICAgICAgY29uc3QgY29uc3RydWN0b3JTeW1ib2wgPSBtZW1iZXJzLmdldChDT05TVFJVQ1RPUikhO1xuICAgICAgLy8gRm9yIHNvbWUgcmVhc29uIHRoZSBjb25zdHJ1Y3RvciBkb2VzIG5vdCBoYXZlIGEgYHZhbHVlRGVjbGFyYXRpb25gID8hP1xuICAgICAgY29uc3QgY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnMgJiZcbiAgICAgICAgICBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnNbMF0gYXMgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbiB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghY29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgICAgaWYgKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbShjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciBkZWNvcmF0b3JzIG9mIGEgY2xhc3MgY29uc3RydWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEBwYXJhbSBwYXJhbWV0ZXJOb2RlcyB0aGUgYXJyYXkgb2YgVHlwZVNjcmlwdCBwYXJhbWV0ZXIgbm9kZXMgZm9yIHRoaXMgY2xhc3MncyBjb25zdHJ1Y3Rvci5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgY29uc3RydWN0b3IgcGFyYW1ldGVyIGluZm8gb2JqZWN0cy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhcbiAgICAgIGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdKTogQ3RvclBhcmFtZXRlcltdIHtcbiAgICBjb25zdCB7Y29uc3RydWN0b3JQYXJhbUluZm99ID0gdGhpcy5hY3F1aXJlRGVjb3JhdG9ySW5mbyhjbGFzc1N5bWJvbCk7XG5cbiAgICByZXR1cm4gcGFyYW1ldGVyTm9kZXMubWFwKChub2RlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3Qge2RlY29yYXRvcnMsIHR5cGVFeHByZXNzaW9ufSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XSA/XG4gICAgICAgICAgY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdIDpcbiAgICAgICAgICB7ZGVjb3JhdG9yczogbnVsbCwgdHlwZUV4cHJlc3Npb246IG51bGx9O1xuICAgICAgY29uc3QgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgICBjb25zdCB0eXBlVmFsdWVSZWZlcmVuY2UgPSB0aGlzLnR5cGVUb1ZhbHVlKHR5cGVFeHByZXNzaW9uKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogZ2V0TmFtZVRleHQobmFtZU5vZGUpLFxuICAgICAgICBuYW1lTm9kZSxcbiAgICAgICAgdHlwZVZhbHVlUmVmZXJlbmNlLFxuICAgICAgICB0eXBlTm9kZTogbnVsbCxcbiAgICAgICAgZGVjb3JhdG9yc1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIHRoZSBgVHlwZVZhbHVlUmVmZXJlbmNlYCBmb3IgdGhlIGdpdmVuIGB0eXBlRXhwcmVzc2lvbmAuXG4gICAqXG4gICAqIEFsdGhvdWdoIGB0eXBlRXhwcmVzc2lvbmAgaXMgYSB2YWxpZCBgdHMuRXhwcmVzc2lvbmAgdGhhdCBjb3VsZCBiZSBlbWl0dGVkIGRpcmVjdGx5IGludG8gdGhlXG4gICAqIGdlbmVyYXRlZCBjb2RlLCBuZ2NjIHN0aWxsIG5lZWRzIHRvIHJlc29sdmUgdGhlIGRlY2xhcmF0aW9uIGFuZCBjcmVhdGUgYW4gYElNUE9SVEVEYCB0eXBlXG4gICAqIHZhbHVlIHJlZmVyZW5jZSBhcyB0aGUgY29tcGlsZXIgaGFzIHNwZWNpYWxpemVkIGhhbmRsaW5nIGZvciBzb21lIHN5bWJvbHMsIGZvciBleGFtcGxlXG4gICAqIGBDaGFuZ2VEZXRlY3RvclJlZmAgZnJvbSBgQGFuZ3VsYXIvY29yZWAuIFN1Y2ggYW4gYElNUE9SVEVEYCB0eXBlIHZhbHVlIHJlZmVyZW5jZSB3aWxsIHJlc3VsdFxuICAgKiBpbiBhIG5ld2x5IGdlbmVyYXRlZCBuYW1lc3BhY2UgaW1wb3J0LCBpbnN0ZWFkIG9mIGVtaXR0aW5nIHRoZSBvcmlnaW5hbCBgdHlwZUV4cHJlc3Npb25gIGFzIGlzLlxuICAgKi9cbiAgcHJpdmF0ZSB0eXBlVG9WYWx1ZSh0eXBlRXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbnxudWxsKTogVHlwZVZhbHVlUmVmZXJlbmNlIHtcbiAgICBpZiAodHlwZUV4cHJlc3Npb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuVU5BVkFJTEFCTEUsXG4gICAgICAgIHJlYXNvbjoge2tpbmQ6IFZhbHVlVW5hdmFpbGFibGVLaW5kLk1JU1NJTkdfVFlQRX0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IGltcCA9IHRoaXMuZ2V0SW1wb3J0T2ZFeHByZXNzaW9uKHR5cGVFeHByZXNzaW9uKTtcbiAgICBjb25zdCBkZWNsID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbih0eXBlRXhwcmVzc2lvbik7XG4gICAgaWYgKGltcCA9PT0gbnVsbCB8fCBkZWNsID09PSBudWxsKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBraW5kOiBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLkxPQ0FMLFxuICAgICAgICBleHByZXNzaW9uOiB0eXBlRXhwcmVzc2lvbixcbiAgICAgICAgZGVmYXVsdEltcG9ydFN0YXRlbWVudDogbnVsbCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtpbmQ6IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuSU1QT1JURUQsXG4gICAgICB2YWx1ZURlY2xhcmF0aW9uOiBkZWNsLm5vZGUsXG4gICAgICBtb2R1bGVOYW1lOiBpbXAuZnJvbSxcbiAgICAgIGltcG9ydGVkTmFtZTogaW1wLm5hbWUsXG4gICAgICBuZXN0ZWRQYXRoOiBudWxsLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGVyZSB0aGUgYGV4cHJlc3Npb25gIGlzIGltcG9ydGVkIGZyb20uXG4gICAqXG4gICAqIEBwYXJhbSBleHByZXNzaW9uIHRoZSBleHByZXNzaW9uIHRvIGRldGVybWluZSB0aGUgaW1wb3J0IGRldGFpbHMgZm9yLlxuICAgKiBAcmV0dXJucyB0aGUgYEltcG9ydGAgZm9yIHRoZSBleHByZXNzaW9uLCBvciBgbnVsbGAgaWYgdGhlIGV4cHJlc3Npb24gaXMgbm90IGltcG9ydGVkIG9yIHRoZVxuICAgKiBleHByZXNzaW9uIHN5bnRheCBpcyBub3Qgc3VwcG9ydGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRJbXBvcnRPZkV4cHJlc3Npb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IEltcG9ydHxudWxsIHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihleHByZXNzaW9uKSAmJiB0cy5pc0lkZW50aWZpZXIoZXhwcmVzc2lvbi5uYW1lKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGV4cHJlc3Npb24ubmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyxcbiAgICogd2hlcmUgdGhlIGluZm9ybWF0aW9uIGlzIHN0b3JlZCBvbiBhIHN0YXRpYyBwcm9wZXJ0eSBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpbiBFU00yMDE1LCB0aGUgcHJvcGVydHkgaXMgZGVmaW5lZCBhbiBhcnJheSwgb3IgYnkgYW4gYXJyb3cgZnVuY3Rpb24gdGhhdCByZXR1cm5zXG4gICAqIGFuIGFycmF5LCBvZiBkZWNvcmF0b3IgYW5kIHR5cGUgaW5mb3JtYXRpb24uXG4gICAqXG4gICAqIEZvciBleGFtcGxlLFxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAgICogICB7dHlwZTogVmlld0NvbnRhaW5lclJlZn0sXG4gICAqICAge3R5cGU6IFRlbXBsYXRlUmVmfSxcbiAgICogICB7dHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTl19XX0sXG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBvclxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IFtcbiAgICogICB7dHlwZTogVmlld0NvbnRhaW5lclJlZn0sXG4gICAqICAge3R5cGU6IFRlbXBsYXRlUmVmfSxcbiAgICogICB7dHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbe3R5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOXX1dfSxcbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSB0aGUgcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyB0aGUgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgZWFjaCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOiBQYXJhbUluZm9bXXxudWxsIHtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnMgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHBhcmFtRGVjb3JhdG9ycykge1xuICAgICAgLy8gVGhlIGRlY29yYXRvcnMgYXJyYXkgbWF5IGJlIHdyYXBwZWQgaW4gYW4gYXJyb3cgZnVuY3Rpb24uIElmIHNvIHVud3JhcCBpdC5cbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9XG4gICAgICAgICAgdHMuaXNBcnJvd0Z1bmN0aW9uKHBhcmFtRGVjb3JhdG9ycykgPyBwYXJhbURlY29yYXRvcnMuYm9keSA6IHBhcmFtRGVjb3JhdG9ycztcbiAgICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oY29udGFpbmVyKSkge1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IGNvbnRhaW5lci5lbGVtZW50cztcbiAgICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbClcbiAgICAgICAgICAgIC5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgdHlwZUV4cHJlc3Npb24gPVxuICAgICAgICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ3R5cGUnKSA/IHBhcmFtSW5mby5nZXQoJ3R5cGUnKSEgOiBudWxsO1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JJbmZvID1cbiAgICAgICAgICAgICAgICAgIHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uaGFzKCdkZWNvcmF0b3JzJykgPyBwYXJhbUluZm8uZ2V0KCdkZWNvcmF0b3JzJykhIDogbnVsbDtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiZcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9ySW5mbylcbiAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgICAgICAgIHJldHVybiB7dHlwZUV4cHJlc3Npb24sIGRlY29yYXRvcnN9O1xuICAgICAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHBhcmFtRGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAnSW52YWxpZCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgZGVjb3JhdG9yIGluICcgK1xuICAgICAgICAgICAgICAgIHBhcmFtRGVjb3JhdG9ycy5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUgKyAnOlxcbicsXG4gICAgICAgICAgICBwYXJhbURlY29yYXRvcnMuZ2V0VGV4dCgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgZm9yIGNhbGxzIHRvIHRoZSBzcGVjaWZpZWQgaGVscGVyLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIGhlbHBlck5hbWVzIHRoZSBuYW1lcyBvZiB0aGUgaGVscGVycyAoZS5nLiBgX19kZWNvcmF0ZWApIHdob3NlIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkXG4gICAqIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBDYWxsRXhwcmVzc2lvbiBub2RlcyBmb3IgZWFjaCBtYXRjaGluZyBoZWxwZXIgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIGhlbHBlck5hbWVzOiBzdHJpbmdbXSk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbltdIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2wpXG4gICAgICAgIC5tYXAoc3RhdGVtZW50ID0+IHRoaXMuZ2V0SGVscGVyQ2FsbChzdGF0ZW1lbnQsIGhlbHBlck5hbWVzKSlcbiAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgc3RhdGVtZW50cyByZWxhdGVkIHRvIHRoZSBnaXZlbiBjbGFzcyB0aGF0IG1heSBjb250YWluIGNhbGxzIHRvIGEgaGVscGVyLlxuICAgKlxuICAgKiBJbiBFU00yMDE1IGNvZGUgdGhlIGhlbHBlciBjYWxscyBhcmUgaW4gdGhlIHRvcCBsZXZlbCBtb2R1bGUsIHNvIHdlIGhhdmUgdG8gY29uc2lkZXJcbiAgICogYWxsIHRoZSBzdGF0ZW1lbnRzIGluIHRoZSBtb2R1bGUuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIGNvbnN0IGNsYXNzTm9kZSA9IGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgaWYgKGlzVG9wTGV2ZWwoY2xhc3NOb2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhjbGFzc05vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICB9XG4gICAgY29uc3Qgc3RhdGVtZW50ID0gZ2V0Q29udGFpbmluZ1N0YXRlbWVudChjbGFzc05vZGUpO1xuICAgIGlmICh0cy5pc0Jsb2NrKHN0YXRlbWVudC5wYXJlbnQpKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShzdGF0ZW1lbnQucGFyZW50LnN0YXRlbWVudHMpO1xuICAgIH1cbiAgICAvLyBXZSBzaG91bGQgbmV2ZXIgYXJyaXZlIGhlcmVcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBmaW5kIGFkamFjZW50IHN0YXRlbWVudHMgZm9yICR7Y2xhc3NTeW1ib2wubmFtZX1gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZXN0IHdoZXRoZXIgYSBkZWNvcmF0b3Igd2FzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgLlxuICAgKlxuICAgKiBJcyB0aGUgZGVjb3JhdG9yOlxuICAgKiAqIGV4dGVybmFsbHkgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWA/XG4gICAqICogdGhlIGN1cnJlbnQgaG9zdGVkIHByb2dyYW0gaXMgYWN0dWFsbHkgYEBhbmd1bGFyL2NvcmVgIGFuZFxuICAgKiAgIC0gcmVsYXRpdmVseSBpbnRlcm5hbGx5IGltcG9ydGVkOyBvclxuICAgKiAgIC0gbm90IGltcG9ydGVkLCBmcm9tIHRoZSBjdXJyZW50IGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3IgdGhlIGRlY29yYXRvciB0byB0ZXN0LlxuICAgKi9cbiAgcHJvdGVjdGVkIGlzRnJvbUNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5pc0NvcmUpIHtcbiAgICAgIHJldHVybiAhZGVjb3JhdG9yLmltcG9ydCB8fCAvXlxcLi8udGVzdChkZWNvcmF0b3IuaW1wb3J0LmZyb20pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gISFkZWNvcmF0b3IuaW1wb3J0ICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBtYXBwaW5nIGJldHdlZW4gdGhlIHB1YmxpYyBleHBvcnRzIGluIGEgc3JjIHByb2dyYW0gYW5kIHRoZSBwdWJsaWMgZXhwb3J0cyBvZiBhIGR0c1xuICAgKiBwcm9ncmFtLlxuICAgKlxuICAgKiBAcGFyYW0gc3JjIHRoZSBwcm9ncmFtIGJ1bmRsZSBjb250YWluaW5nIHRoZSBzb3VyY2UgZmlsZXMuXG4gICAqIEBwYXJhbSBkdHMgdGhlIHByb2dyYW0gYnVuZGxlIGNvbnRhaW5pbmcgdGhlIHR5cGluZ3MgZmlsZXMuXG4gICAqIEByZXR1cm5zIGEgbWFwIG9mIHNvdXJjZSBkZWNsYXJhdGlvbnMgdG8gdHlwaW5ncyBkZWNsYXJhdGlvbnMuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29tcHV0ZVB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwKHNyYzogQnVuZGxlUHJvZ3JhbSwgZHRzOiBCdW5kbGVQcm9ncmFtKTpcbiAgICAgIE1hcDxEZWNsYXJhdGlvbk5vZGUsIHRzLkRlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgZGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3Qgcm9vdER0cyA9IGdldFJvb3RGaWxlT3JGYWlsKGR0cyk7XG4gICAgdGhpcy5jb2xsZWN0RHRzRXhwb3J0ZWREZWNsYXJhdGlvbnMoZHRzRGVjbGFyYXRpb25NYXAsIHJvb3REdHMsIGR0cy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgIGNvbnN0IHJvb3RTcmMgPSBnZXRSb290RmlsZU9yRmFpbChzcmMpO1xuICAgIHRoaXMuY29sbGVjdFNyY0V4cG9ydGVkRGVjbGFyYXRpb25zKGRlY2xhcmF0aW9uTWFwLCBkdHNEZWNsYXJhdGlvbk1hcCwgcm9vdFNyYyk7XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG1hcHBpbmcgYmV0d2VlbiB0aGUgXCJwcml2YXRlXCIgZXhwb3J0cyBpbiBhIHNyYyBwcm9ncmFtIGFuZCB0aGUgXCJwcml2YXRlXCIgZXhwb3J0cyBvZiBhXG4gICAqIGR0cyBwcm9ncmFtLiBUaGVzZSBleHBvcnRzIG1heSBiZSBleHBvcnRlZCBmcm9tIGluZGl2aWR1YWwgZmlsZXMgaW4gdGhlIHNyYyBvciBkdHMgcHJvZ3JhbXMsXG4gICAqIGJ1dCBub3QgZXhwb3J0ZWQgZnJvbSB0aGUgcm9vdCBmaWxlIChpLmUgcHVibGljbHkgZnJvbSB0aGUgZW50cnktcG9pbnQpLlxuICAgKlxuICAgKiBUaGlzIG1hcHBpbmcgaXMgYSBcImJlc3QgZ3Vlc3NcIiBzaW5jZSB3ZSBjYW5ub3QgZ3VhcmFudGVlIHRoYXQgdHdvIGRlY2xhcmF0aW9ucyB0aGF0IGhhcHBlbiB0b1xuICAgKiBiZSBleHBvcnRlZCBmcm9tIGEgZmlsZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXJlIGFjdHVhbGx5IGVxdWl2YWxlbnQuIEJ1dCB0aGlzIGlzIGEgcmVhc29uYWJsZVxuICAgKiBlc3RpbWF0ZSBmb3IgdGhlIHB1cnBvc2VzIG9mIG5nY2MuXG4gICAqXG4gICAqIEBwYXJhbSBzcmMgdGhlIHByb2dyYW0gYnVuZGxlIGNvbnRhaW5pbmcgdGhlIHNvdXJjZSBmaWxlcy5cbiAgICogQHBhcmFtIGR0cyB0aGUgcHJvZ3JhbSBidW5kbGUgY29udGFpbmluZyB0aGUgdHlwaW5ncyBmaWxlcy5cbiAgICogQHJldHVybnMgYSBtYXAgb2Ygc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlUHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwKHNyYzogQnVuZGxlUHJvZ3JhbSwgZHRzOiBCdW5kbGVQcm9ncmFtKTpcbiAgICAgIE1hcDxEZWNsYXJhdGlvbk5vZGUsIHRzLkRlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgZGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBkdHMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgZHRzRmlsZXMgPSBnZXROb25Sb290UGFja2FnZUZpbGVzKGR0cyk7XG4gICAgZm9yIChjb25zdCBkdHNGaWxlIG9mIGR0c0ZpbGVzKSB7XG4gICAgICB0aGlzLmNvbGxlY3REdHNFeHBvcnRlZERlY2xhcmF0aW9ucyhkdHNEZWNsYXJhdGlvbk1hcCwgZHRzRmlsZSwgdHlwZUNoZWNrZXIpO1xuICAgIH1cblxuICAgIGNvbnN0IHNyY0ZpbGVzID0gZ2V0Tm9uUm9vdFBhY2thZ2VGaWxlcyhzcmMpO1xuICAgIGZvciAoY29uc3Qgc3JjRmlsZSBvZiBzcmNGaWxlcykge1xuICAgICAgdGhpcy5jb2xsZWN0U3JjRXhwb3J0ZWREZWNsYXJhdGlvbnMoZGVjbGFyYXRpb25NYXAsIGR0c0RlY2xhcmF0aW9uTWFwLCBzcmNGaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgbWFwcGluZ3MgYmV0d2VlbiBuYW1lcyBvZiBleHBvcnRlZCBkZWNsYXJhdGlvbnMgaW4gYSBmaWxlIGFuZCBpdHMgYWN0dWFsIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBBbnkgbmV3IG1hcHBpbmdzIGFyZSBhZGRlZCB0byB0aGUgYGR0c0RlY2xhcmF0aW9uTWFwYC5cbiAgICovXG4gIHByb3RlY3RlZCBjb2xsZWN0RHRzRXhwb3J0ZWREZWNsYXJhdGlvbnMoXG4gICAgICBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+LCBzcmNGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiB2b2lkIHtcbiAgICBjb25zdCBzcmNNb2R1bGUgPSBzcmNGaWxlICYmIGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihzcmNGaWxlKTtcbiAgICBjb25zdCBtb2R1bGVFeHBvcnRzID0gc3JjTW9kdWxlICYmIGNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKHNyY01vZHVsZSk7XG4gICAgaWYgKG1vZHVsZUV4cG9ydHMpIHtcbiAgICAgIG1vZHVsZUV4cG9ydHMuZm9yRWFjaChleHBvcnRlZFN5bWJvbCA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZFN5bWJvbC5uYW1lO1xuICAgICAgICBpZiAoZXhwb3J0ZWRTeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcykge1xuICAgICAgICAgIGV4cG9ydGVkU3ltYm9sID0gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKGV4cG9ydGVkU3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGV4cG9ydGVkU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgICAgIGlmIChkZWNsYXJhdGlvbiAmJiAhZHRzRGVjbGFyYXRpb25NYXAuaGFzKG5hbWUpKSB7XG4gICAgICAgICAgZHRzRGVjbGFyYXRpb25NYXAuc2V0KG5hbWUsIGRlY2xhcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cblxuICBwcm90ZWN0ZWQgY29sbGVjdFNyY0V4cG9ydGVkRGVjbGFyYXRpb25zKFxuICAgICAgZGVjbGFyYXRpb25NYXA6IE1hcDxEZWNsYXJhdGlvbk5vZGUsIHRzLkRlY2xhcmF0aW9uPixcbiAgICAgIGR0c0RlY2xhcmF0aW9uTWFwOiBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4sIHNyY0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBmaWxlRXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKHNyY0ZpbGUpO1xuICAgIGlmIChmaWxlRXhwb3J0cyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBbZXhwb3J0TmFtZSwge25vZGU6IGRlY2xhcmF0aW9uTm9kZX1dIG9mIGZpbGVFeHBvcnRzKSB7XG4gICAgICAgIGlmIChkdHNEZWNsYXJhdGlvbk1hcC5oYXMoZXhwb3J0TmFtZSkpIHtcbiAgICAgICAgICBkZWNsYXJhdGlvbk1hcC5zZXQoZGVjbGFyYXRpb25Ob2RlLCBkdHNEZWNsYXJhdGlvbk1hcC5nZXQoZXhwb3J0TmFtZSkhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBnZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZXhwcmVzc2lvbik7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihleHByZXNzaW9uKSB8fCAhdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZURlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG4gICAgaWYgKCFuYW1lc3BhY2VEZWNsIHx8ICF0cy5pc1NvdXJjZUZpbGUobmFtZXNwYWNlRGVjbC5ub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZXNwYWNlRXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKG5hbWVzcGFjZURlY2wubm9kZSk7XG4gICAgaWYgKG5hbWVzcGFjZUV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghbmFtZXNwYWNlRXhwb3J0cy5oYXMoZXhwcmVzc2lvbi5uYW1lLnRleHQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnREZWNsID0gbmFtZXNwYWNlRXhwb3J0cy5nZXQoZXhwcmVzc2lvbi5uYW1lLnRleHQpITtcbiAgICByZXR1cm4gey4uLmV4cG9ydERlY2wsIHZpYU1vZHVsZTogbmFtZXNwYWNlRGVjbC52aWFNb2R1bGV9O1xuICB9XG5cbiAgLyoqIENoZWNrcyBpZiB0aGUgc3BlY2lmaWVkIGRlY2xhcmF0aW9uIHJlc29sdmVzIHRvIHRoZSBrbm93biBKYXZhU2NyaXB0IGdsb2JhbCBgT2JqZWN0YC4gKi9cbiAgcHJvdGVjdGVkIGlzSmF2YVNjcmlwdE9iamVjdERlY2xhcmF0aW9uKGRlY2w6IERlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgbm9kZSA9IGRlY2wubm9kZTtcbiAgICAvLyBUaGUgZGVmYXVsdCBUeXBlU2NyaXB0IGxpYnJhcnkgdHlwZXMgdGhlIGdsb2JhbCBgT2JqZWN0YCB2YXJpYWJsZSB0aHJvdWdoXG4gICAgLy8gYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB3aXRoIGEgdHlwZSByZWZlcmVuY2UgcmVzb2x2aW5nIHRvIGBPYmplY3RDb25zdHJ1Y3RvcmAuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgfHwgIXRzLmlzSWRlbnRpZmllcihub2RlLm5hbWUpIHx8XG4gICAgICAgIG5vZGUubmFtZS50ZXh0ICE9PSAnT2JqZWN0JyB8fCBub2RlLnR5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCB0eXBlTm9kZSA9IG5vZGUudHlwZTtcbiAgICAvLyBJZiB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gZG9lcyBub3QgaGF2ZSBhIHR5cGUgcmVzb2x2aW5nIHRvIGBPYmplY3RDb25zdHJ1Y3RvcmAsXG4gICAgLy8gd2UgY2Fubm90IGd1YXJhbnRlZSB0aGF0IHRoZSBkZWNsYXJhdGlvbiByZXNvbHZlcyB0byB0aGUgZ2xvYmFsIGBPYmplY3RgIHZhcmlhYmxlLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTm9kZSkgfHwgIXRzLmlzSWRlbnRpZmllcih0eXBlTm9kZS50eXBlTmFtZSkgfHxcbiAgICAgICAgdHlwZU5vZGUudHlwZU5hbWUudGV4dCAhPT0gJ09iamVjdENvbnN0cnVjdG9yJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgdHlwZSBkZWZpbml0aW9uIGZvciBgT2JqZWN0YCBvcmlnaW5hdGVzIGZyb20gYSBkZWZhdWx0IGxpYnJhcnlcbiAgICAvLyBkZWZpbml0aW9uIGZpbGUuIFRoaXMgcmVxdWlyZXMgZGVmYXVsdCB0eXBlcyB0byBiZSBlbmFibGVkIGZvciB0aGUgaG9zdCBwcm9ncmFtLlxuICAgIHJldHVybiB0aGlzLnNyYy5wcm9ncmFtLmlzU291cmNlRmlsZURlZmF1bHRMaWJyYXJ5KG5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBKYXZhU2NyaXB0LCBlbnVtIGRlY2xhcmF0aW9ucyBhcmUgZW1pdHRlZCBhcyBhIHJlZ3VsYXIgdmFyaWFibGUgZGVjbGFyYXRpb24gZm9sbG93ZWQgYnkgYW5cbiAgICogSUlGRSBpbiB3aGljaCB0aGUgZW51bSBtZW1iZXJzIGFyZSBhc3NpZ25lZC5cbiAgICpcbiAgICogICBleHBvcnQgdmFyIEVudW07XG4gICAqICAgKGZ1bmN0aW9uIChFbnVtKSB7XG4gICAqICAgICBFbnVtW1wiYVwiXSA9IFwiQVwiO1xuICAgKiAgICAgRW51bVtcImJcIl0gPSBcIkJcIjtcbiAgICogICB9KShFbnVtIHx8IChFbnVtID0ge30pKTtcbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIEEgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCBtYXkgcmVwcmVzZW50IGFuIGVudW1cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgZW51bSBtZW1iZXJzIGlmIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBpcyBmb2xsb3dlZCBieSBhbiBJSUZFIHRoYXRcbiAgICogZGVjbGFyZXMgdGhlIGVudW0gbWVtYmVycywgb3IgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZUVudW1NZW1iZXJzKGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogRW51bU1lbWJlcltdfG51bGwge1xuICAgIC8vIEluaXRpYWxpemVkIHZhcmlhYmxlcyBkb24ndCByZXByZXNlbnQgZW51bSBkZWNsYXJhdGlvbnMuXG4gICAgaWYgKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyICE9PSB1bmRlZmluZWQpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgdmFyaWFibGVTdG10ID0gZGVjbGFyYXRpb24ucGFyZW50LnBhcmVudDtcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQodmFyaWFibGVTdG10KSkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBibG9jayA9IHZhcmlhYmxlU3RtdC5wYXJlbnQ7XG4gICAgaWYgKCF0cy5pc0Jsb2NrKGJsb2NrKSAmJiAhdHMuaXNTb3VyY2VGaWxlKGJsb2NrKSkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbkluZGV4ID0gYmxvY2suc3RhdGVtZW50cy5maW5kSW5kZXgoc3RhdGVtZW50ID0+IHN0YXRlbWVudCA9PT0gdmFyaWFibGVTdG10KTtcbiAgICBpZiAoZGVjbGFyYXRpb25JbmRleCA9PT0gLTEgfHwgZGVjbGFyYXRpb25JbmRleCA9PT0gYmxvY2suc3RhdGVtZW50cy5sZW5ndGggLSAxKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHN1YnNlcXVlbnRTdG10ID0gYmxvY2suc3RhdGVtZW50c1tkZWNsYXJhdGlvbkluZGV4ICsgMV07XG4gICAgaWYgKCF0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3Vic2VxdWVudFN0bXQpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGlpZmUgPSBzdHJpcFBhcmVudGhlc2VzKHN1YnNlcXVlbnRTdG10LmV4cHJlc3Npb24pO1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihpaWZlKSB8fCAhaXNFbnVtRGVjbGFyYXRpb25JaWZlKGlpZmUpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGZuID0gc3RyaXBQYXJlbnRoZXNlcyhpaWZlLmV4cHJlc3Npb24pO1xuICAgIGlmICghdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZm4pKSByZXR1cm4gbnVsbDtcblxuICAgIHJldHVybiB0aGlzLnJlZmxlY3RFbnVtTWVtYmVycyhmbik7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gZXh0cmFjdCBhbGwgYEVudW1NZW1iZXJgcyBmcm9tIGEgZnVuY3Rpb24gdGhhdCBpcyBhY2NvcmRpbmcgdG8gdGhlIEphdmFTY3JpcHQgZW1pdFxuICAgKiBmb3JtYXQgZm9yIGVudW1zOlxuICAgKlxuICAgKiAgIGZ1bmN0aW9uIChFbnVtKSB7XG4gICAqICAgICBFbnVtW1wiTWVtYmVyQVwiXSA9IFwiYVwiO1xuICAgKiAgICAgRW51bVtcIk1lbWJlckJcIl0gPSBcImJcIjtcbiAgICogICB9XG4gICAqXG4gICAqIEBwYXJhbSBmbiBUaGUgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGFzc3VtZWQgdG8gY29udGFpbiBlbnVtIG1lbWJlcnMuXG4gICAqIEByZXR1cm5zIEFsbCBlbnVtIG1lbWJlcnMgaWYgdGhlIGZ1bmN0aW9uIGlzIGFjY29yZGluZyB0byB0aGUgY29ycmVjdCBzeW50YXgsIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSByZWZsZWN0RW51bU1lbWJlcnMoZm46IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IEVudW1NZW1iZXJbXXxudWxsIHtcbiAgICBpZiAoZm4ucGFyYW1ldGVycy5sZW5ndGggIT09IDEpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgZW51bU5hbWUgPSBmbi5wYXJhbWV0ZXJzWzBdLm5hbWU7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZW51bU5hbWUpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGVudW1NZW1iZXJzOiBFbnVtTWVtYmVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiBmbi5ib2R5LnN0YXRlbWVudHMpIHtcbiAgICAgIGNvbnN0IGVudW1NZW1iZXIgPSB0aGlzLnJlZmxlY3RFbnVtTWVtYmVyKGVudW1OYW1lLCBzdGF0ZW1lbnQpO1xuICAgICAgaWYgKGVudW1NZW1iZXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBlbnVtTWVtYmVycy5wdXNoKGVudW1NZW1iZXIpO1xuICAgIH1cbiAgICByZXR1cm4gZW51bU1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gZXh0cmFjdCBhIHNpbmdsZSBgRW51bU1lbWJlcmAgZnJvbSBhIHN0YXRlbWVudCBpbiB0aGUgZm9sbG93aW5nIHN5bnRheDpcbiAgICpcbiAgICogICBFbnVtW1wiTWVtYmVyQVwiXSA9IFwiYVwiO1xuICAgKlxuICAgKiBvciwgZm9yIGVudW0gbWVtYmVyIHdpdGggbnVtZXJpYyB2YWx1ZXM6XG4gICAqXG4gICAqICAgRW51bVtFbnVtW1wiTWVtYmVyQVwiXSA9IDBdID0gXCJNZW1iZXJBXCI7XG4gICAqXG4gICAqIEBwYXJhbSBlbnVtTmFtZSBUaGUgaWRlbnRpZmllciBvZiB0aGUgZW51bSB0aGF0IHRoZSBtZW1iZXJzIHNob3VsZCBiZSBzZXQgb24uXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgVGhlIHN0YXRlbWVudCB0byBpbnNwZWN0LlxuICAgKiBAcmV0dXJucyBBbiBgRW51bU1lbWJlcmAgaWYgdGhlIHN0YXRlbWVudCBpcyBhY2NvcmRpbmcgdG8gdGhlIGV4cGVjdGVkIHN5bnRheCwgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdEVudW1NZW1iZXIoZW51bU5hbWU6IHRzLklkZW50aWZpZXIsIHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogRW51bU1lbWJlcnxudWxsIHtcbiAgICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjtcblxuICAgIC8vIENoZWNrIGZvciB0aGUgYEVudW1bWF0gPSBZO2AgY2FzZS5cbiAgICBpZiAoIWlzRW51bUFzc2lnbm1lbnQoZW51bU5hbWUsIGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgYXNzaWdubWVudCA9IHJlZmxlY3RFbnVtQXNzaWdubWVudChleHByZXNzaW9uKTtcbiAgICBpZiAoYXNzaWdubWVudCAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gYXNzaWdubWVudDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgdGhlIGBFbnVtW0VudW1bWF0gPSBZXSA9IC4uLjtgIGNhc2UuXG4gICAgY29uc3QgaW5uZXJFeHByZXNzaW9uID0gZXhwcmVzc2lvbi5sZWZ0LmFyZ3VtZW50RXhwcmVzc2lvbjtcbiAgICBpZiAoIWlzRW51bUFzc2lnbm1lbnQoZW51bU5hbWUsIGlubmVyRXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcmVmbGVjdEVudW1Bc3NpZ25tZW50KGlubmVyRXhwcmVzc2lvbik7XG4gIH1cblxuICBwcml2YXRlIGdldEFkamFjZW50TmFtZU9mQ2xhc3NTeW1ib2woY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLklkZW50aWZpZXIge1xuICAgIGlmIChjbGFzc1N5bWJvbC5hZGphY2VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXROYW1lRnJvbUNsYXNzU3ltYm9sRGVjbGFyYXRpb24oXG4gICAgICAgICAgY2xhc3NTeW1ib2wsIGNsYXNzU3ltYm9sLmFkamFjZW50LnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXROYW1lRnJvbUNsYXNzU3ltYm9sRGVjbGFyYXRpb24oXG4gICAgICAgICAgY2xhc3NTeW1ib2wsIGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIH1cbiAgfVxufVxuXG4vLy8vLy8vLy8vLy8vIEV4cG9ydGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIHRoZSBpaWZlIGhhcyB0aGUgZm9sbG93aW5nIGNhbGwgc2lnbmF0dXJlOlxuICpcbiAqICAgKEVudW0gfHwgKEVudW0gPSB7fSlcbiAqXG4gKiBOb3RlIHRoYXQgdGhlIGBFbnVtYCBpZGVudGlmaWVyIGlzIG5vdCBjaGVja2VkLCBhcyBpdCBjb3VsZCBhbHNvIGJlIHNvbWV0aGluZ1xuICogbGlrZSBgZXhwb3J0cy5FbnVtYC4gSW5zdGVhZCwgb25seSB0aGUgc3RydWN0dXJlIG9mIGJpbmFyeSBvcGVyYXRvcnMgaXMgY2hlY2tlZC5cbiAqXG4gKiBAcGFyYW0gaWlmZSBUaGUgY2FsbCBleHByZXNzaW9uIHRvIGNoZWNrLlxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgaWlmZSBoYXMgYSBjYWxsIHNpZ25hdHVyZSB0aGF0IGNvcnJlc3BvbmRzIHdpdGggYSBwb3RlbnRpYWxcbiAqIGVudW0gZGVjbGFyYXRpb24uXG4gKi9cbmZ1bmN0aW9uIGlzRW51bURlY2xhcmF0aW9uSWlmZShpaWZlOiB0cy5DYWxsRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoaWlmZS5hcmd1bWVudHMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgYXJnID0gaWlmZS5hcmd1bWVudHNbMF07XG4gIGlmICghdHMuaXNCaW5hcnlFeHByZXNzaW9uKGFyZykgfHwgYXJnLm9wZXJhdG9yVG9rZW4ua2luZCAhPT0gdHMuU3ludGF4S2luZC5CYXJCYXJUb2tlbiB8fFxuICAgICAgIXRzLmlzUGFyZW50aGVzaXplZEV4cHJlc3Npb24oYXJnLnJpZ2h0KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHJpZ2h0ID0gYXJnLnJpZ2h0LmV4cHJlc3Npb247XG4gIGlmICghdHMuaXNCaW5hcnlFeHByZXNzaW9uKHJpZ2h0KSB8fCByaWdodC5vcGVyYXRvclRva2VuLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocmlnaHQucmlnaHQpIHx8IHJpZ2h0LnJpZ2h0LnByb3BlcnRpZXMubGVuZ3RoICE9PSAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQW4gZW51bSBtZW1iZXIgYXNzaWdubWVudCB0aGF0IGxvb2tzIGxpa2UgYEVudW1bWF0gPSBZO2AuXG4gKi9cbmV4cG9ydCB0eXBlIEVudW1NZW1iZXJBc3NpZ25tZW50ID0gdHMuQmluYXJ5RXhwcmVzc2lvbiZ7bGVmdDogdHMuRWxlbWVudEFjY2Vzc0V4cHJlc3Npb259O1xuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGxvb2tzIGxpa2UgYW4gZW51bSBtZW1iZXIgYXNzaWdubWVudCB0YXJnZXRpbmcgYEVudW1gOlxuICpcbiAqICAgRW51bVtYXSA9IFk7XG4gKlxuICogSGVyZSwgWCBhbmQgWSBjYW4gYmUgYW55IGV4cHJlc3Npb24uXG4gKlxuICogQHBhcmFtIGVudW1OYW1lIFRoZSBpZGVudGlmaWVyIG9mIHRoZSBlbnVtIHRoYXQgdGhlIG1lbWJlcnMgc2hvdWxkIGJlIHNldCBvbi5cbiAqIEBwYXJhbSBleHByZXNzaW9uIFRoZSBleHByZXNzaW9uIHRoYXQgc2hvdWxkIGJlIGNoZWNrZWQgdG8gY29uZm9ybSB0byB0aGUgYWJvdmUgZm9ybS5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gaXMgb2YgdGhlIGNvcnJlY3QgZm9ybSwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBpc0VudW1Bc3NpZ25tZW50KFxuICAgIGVudW1OYW1lOiB0cy5JZGVudGlmaWVyLCBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogZXhwcmVzc2lvbiBpcyBFbnVtTWVtYmVyQXNzaWdubWVudCB7XG4gIGlmICghdHMuaXNCaW5hcnlFeHByZXNzaW9uKGV4cHJlc3Npb24pIHx8XG4gICAgICBleHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCAhPT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbiB8fFxuICAgICAgIXRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24oZXhwcmVzc2lvbi5sZWZ0KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFZlcmlmeSB0aGF0IHRoZSBvdXRlciBhc3NpZ25tZW50IGNvcnJlc3BvbmRzIHdpdGggdGhlIGVudW0gZGVjbGFyYXRpb24uXG4gIGNvbnN0IGVudW1JZGVudGlmaWVyID0gZXhwcmVzc2lvbi5sZWZ0LmV4cHJlc3Npb247XG4gIHJldHVybiB0cy5pc0lkZW50aWZpZXIoZW51bUlkZW50aWZpZXIpICYmIGVudW1JZGVudGlmaWVyLnRleHQgPT09IGVudW1OYW1lLnRleHQ7XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gY3JlYXRlIGFuIGBFbnVtTWVtYmVyYCBmcm9tIGFuIGV4cHJlc3Npb24gdGhhdCBpcyBiZWxpZXZlZCB0byByZXByZXNlbnQgYW4gZW51bVxuICogYXNzaWdubWVudC5cbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBUaGUgZXhwcmVzc2lvbiB0aGF0IGlzIGJlbGlldmVkIHRvIGJlIGFuIGVudW0gYXNzaWdubWVudC5cbiAqIEByZXR1cm5zIEFuIGBFbnVtTWVtYmVyYCBvciBudWxsIGlmIHRoZSBleHByZXNzaW9uIGRpZCBub3QgcmVwcmVzZW50IGFuIGVudW0gbWVtYmVyIGFmdGVyIGFsbC5cbiAqL1xuZnVuY3Rpb24gcmVmbGVjdEVudW1Bc3NpZ25tZW50KGV4cHJlc3Npb246IEVudW1NZW1iZXJBc3NpZ25tZW50KTogRW51bU1lbWJlcnxudWxsIHtcbiAgY29uc3QgbWVtYmVyTmFtZSA9IGV4cHJlc3Npb24ubGVmdC5hcmd1bWVudEV4cHJlc3Npb247XG4gIGlmICghdHMuaXNQcm9wZXJ0eU5hbWUobWVtYmVyTmFtZSkpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiB7bmFtZTogbWVtYmVyTmFtZSwgaW5pdGlhbGl6ZXI6IGV4cHJlc3Npb24ucmlnaHR9O1xufVxuXG5leHBvcnQgdHlwZSBQYXJhbUluZm8gPSB7XG4gIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwsXG4gIHR5cGVFeHByZXNzaW9uOiB0cy5FeHByZXNzaW9ufG51bGxcbn07XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNhbGwgdG8gYHRzbGliLl9fbWV0YWRhdGFgIGFzIHByZXNlbnQgaW4gYHRzbGliLl9fZGVjb3JhdGVgIGNhbGxzLiBUaGlzIGlzIGFcbiAqIHN5bnRoZXRpYyBkZWNvcmF0b3IgaW5zZXJ0ZWQgYnkgVHlwZVNjcmlwdCB0aGF0IGNvbnRhaW5zIHJlZmxlY3Rpb24gaW5mb3JtYXRpb24gYWJvdXQgdGhlXG4gKiB0YXJnZXQgb2YgdGhlIGRlY29yYXRvciwgaS5lLiB0aGUgY2xhc3Mgb3IgcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyVHlwZXMge1xuICB0eXBlOiAncGFyYW1zJztcbiAgdHlwZXM6IHRzLkV4cHJlc3Npb25bXTtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2FsbCB0byBgdHNsaWIuX19wYXJhbWAgYXMgcHJlc2VudCBpbiBgdHNsaWIuX19kZWNvcmF0ZWAgY2FsbHMuIFRoaXMgY29udGFpbnNcbiAqIGluZm9ybWF0aW9uIG9uIGFueSBkZWNvcmF0b3JzIHdlcmUgYXBwbGllZCB0byBhIGNlcnRhaW4gcGFyYW1ldGVyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlckRlY29yYXRvcnMge1xuICB0eXBlOiAncGFyYW06ZGVjb3JhdG9ycyc7XG4gIGluZGV4OiBudW1iZXI7XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjYWxsIHRvIGEgZGVjb3JhdG9yIGFzIGl0IHdhcyBwcmVzZW50IGluIHRoZSBvcmlnaW5hbCBzb3VyY2UgY29kZSwgYXMgcHJlc2VudCBpblxuICogYHRzbGliLl9fZGVjb3JhdGVgIGNhbGxzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlY29yYXRvckNhbGwge1xuICB0eXBlOiAnZGVjb3JhdG9yJztcbiAgZGVjb3JhdG9yOiBEZWNvcmF0b3I7XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZGlmZmVyZW50IGtpbmRzIG9mIGRlY29yYXRlIGhlbHBlcnMgdGhhdCBtYXkgYmUgcHJlc2VudCBhcyBmaXJzdCBhcmd1bWVudCB0b1xuICogYHRzbGliLl9fZGVjb3JhdGVgLCBhcyBmb2xsb3dzOlxuICpcbiAqIGBgYFxuICogX19kZWNvcmF0ZShbXG4gKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAqICAgdHNsaWJfMS5fX3BhcmFtKDIsIEluamVjdChJTkpFQ1RFRF9UT0tFTikpLFxuICogICB0c2xpYl8xLl9fbWV0YWRhdGEoXCJkZXNpZ246cGFyYW10eXBlc1wiLCBbVmlld0NvbnRhaW5lclJlZiwgVGVtcGxhdGVSZWYsIFN0cmluZ10pXG4gKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBEZWNvcmF0ZUhlbHBlckVudHJ5ID0gUGFyYW1ldGVyVHlwZXN8UGFyYW1ldGVyRGVjb3JhdG9yc3xEZWNvcmF0b3JDYWxsO1xuXG4vKipcbiAqIFRoZSByZWNvcmRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gb2YgYSBzaW5nbGUgY2xhc3MuIFRoaXMgaW5mb3JtYXRpb24gaXMgY2FjaGVkIGluIHRoZSBob3N0LlxuICovXG5pbnRlcmZhY2UgRGVjb3JhdG9ySW5mbyB7XG4gIC8qKlxuICAgKiBBbGwgZGVjb3JhdG9ycyB0aGF0IHdlcmUgcHJlc2VudCBvbiB0aGUgY2xhc3MuIElmIG5vIGRlY29yYXRvcnMgd2VyZSBwcmVzZW50LCB0aGlzIGlzIGBudWxsYFxuICAgKi9cbiAgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsO1xuXG4gIC8qKlxuICAgKiBBbGwgZGVjb3JhdG9ycyBwZXIgbWVtYmVyIG9mIHRoZSBjbGFzcyB0aGV5IHdlcmUgcHJlc2VudCBvbi5cbiAgICovXG4gIG1lbWJlckRlY29yYXRvcnM6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPjtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVyIGluZm9ybWF0aW9uLCBzdWNoIGFzIHRoZSB0eXBlIG9mIGEgcGFyYW1ldGVyIGFuZCBhbGxcbiAgICogZGVjb3JhdG9ycyBmb3IgYSBjZXJ0YWluIHBhcmFtZXRlci4gSW5kaWNlcyBpbiB0aGlzIGFycmF5IGNvcnJlc3BvbmQgd2l0aCB0aGUgcGFyYW1ldGVyJ3NcbiAgICogaW5kZXggaW4gdGhlIGNvbnN0cnVjdG9yLiBOb3RlIHRoYXQgdGhpcyBhcnJheSBtYXkgYmUgc3BhcnNlLCBpLmUuIGNlcnRhaW4gY29uc3RydWN0b3JcbiAgICogcGFyYW1ldGVycyBtYXkgbm90IGhhdmUgYW55IGluZm8gcmVjb3JkZWQuXG4gICAqL1xuICBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW107XG59XG5cbi8qKlxuICogQSBzdGF0ZW1lbnQgbm9kZSB0aGF0IHJlcHJlc2VudHMgYW4gYXNzaWdubWVudC5cbiAqL1xuZXhwb3J0IHR5cGUgQXNzaWdubWVudFN0YXRlbWVudCA9XG4gICAgdHMuRXhwcmVzc2lvblN0YXRlbWVudCZ7ZXhwcmVzc2lvbjoge2xlZnQ6IHRzLklkZW50aWZpZXIsIHJpZ2h0OiB0cy5FeHByZXNzaW9ufX07XG5cbi8qKlxuICogVGVzdCB3aGV0aGVyIGEgc3RhdGVtZW50IG5vZGUgaXMgYW4gYXNzaWdubWVudCBzdGF0ZW1lbnQuXG4gKiBAcGFyYW0gc3RhdGVtZW50IHRoZSBzdGF0ZW1lbnQgdG8gdGVzdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQXNzaWdubWVudFN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHN0YXRlbWVudCBpcyBBc3NpZ25tZW50U3RhdGVtZW50IHtcbiAgcmV0dXJuIHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzQXNzaWdubWVudChzdGF0ZW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0KTtcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgYGV4cHJlc3Npb25gIHRoYXQgaXMgYmVsaWV2ZWQgdG8gYmUgYW4gSUlGRSBhbmQgcmV0dXJuIHRoZSBBU1Qgbm9kZSB0aGF0IGNvcnJlc3BvbmRzIHRvXG4gKiB0aGUgYm9keSBvZiB0aGUgSUlGRS5cbiAqXG4gKiBUaGUgZXhwcmVzc2lvbiBtYXkgYmUgd3JhcHBlZCBpbiBwYXJlbnRoZXNlcywgd2hpY2ggYXJlIHN0cmlwcGVkIG9mZi5cbiAqXG4gKiBJZiB0aGUgSUlGRSBpcyBhbiBhcnJvdyBmdW5jdGlvbiB0aGVuIGl0cyBib2R5IGNvdWxkIGJlIGEgYHRzLkV4cHJlc3Npb25gIHJhdGhlciB0aGFuIGFcbiAqIGB0cy5GdW5jdGlvbkJvZHlgLlxuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIHRoZSBleHByZXNzaW9uIHRvIHBhcnNlLlxuICogQHJldHVybnMgdGhlIGB0cy5FeHByZXNzaW9uYCBvciBgdHMuRnVuY3Rpb25Cb2R5YCB0aGF0IGhvbGRzIHRoZSBib2R5IG9mIHRoZSBJSUZFIG9yIGB1bmRlZmluZWRgXG4gKiAgICAgaWYgdGhlIGBleHByZXNzaW9uYCBkaWQgbm90IGhhdmUgdGhlIGNvcnJlY3Qgc2hhcGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRJaWZlQm9keShleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogdHMuQ29uY2lzZUJvZHl8dW5kZWZpbmVkIHtcbiAgY29uc3QgY2FsbCA9IHN0cmlwUGFyZW50aGVzZXMoZXhwcmVzc2lvbik7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihjYWxsKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBmbiA9IHN0cmlwUGFyZW50aGVzZXMoY2FsbC5leHByZXNzaW9uKTtcbiAgaWYgKCF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihmbikgJiYgIXRzLmlzQXJyb3dGdW5jdGlvbihmbikpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIGZuLmJvZHk7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBgbm9kZWAgaXMgYW4gYXNzaWdubWVudCBvZiB0aGUgZm9ybSBgYSA9IGJgLlxuICpcbiAqIEBwYXJhbSBub2RlIFRoZSBBU1Qgbm9kZSB0byBjaGVjay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQXNzaWdubWVudChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Bc3NpZ25tZW50RXhwcmVzc2lvbjx0cy5FcXVhbHNUb2tlbj4ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIG5vZGUub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIHByb3ZpZGVkIGNhbGwgZXhwcmVzc2lvbiB0YXJnZXRzIGEgY2xhc3MsIGJ5IHZlcmlmeWluZyBpdHMgYXJndW1lbnRzIGFyZVxuICogYWNjb3JkaW5nIHRvIHRoZSBmb2xsb3dpbmcgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIF9fZGVjb3JhdGUoW10sIFNvbWVEaXJlY3RpdmUpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGNhbGwgdGhlIGNhbGwgZXhwcmVzc2lvbiB0aGF0IGlzIHRlc3RlZCB0byByZXByZXNlbnQgYSBjbGFzcyBkZWNvcmF0b3IgY2FsbC5cbiAqIEBwYXJhbSBtYXRjaGVzIHByZWRpY2F0ZSBmdW5jdGlvbiB0byB0ZXN0IHdoZXRoZXIgdGhlIGNhbGwgaXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkZXNpcmVkIGNsYXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNDbGFzc0RlY29yYXRlQ2FsbChcbiAgICBjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbiwgbWF0Y2hlczogKGlkZW50aWZpZXI6IHRzLklkZW50aWZpZXIpID0+IGJvb2xlYW4pOlxuICAgIGNhbGwgaXMgdHMuQ2FsbEV4cHJlc3Npb24me2FyZ3VtZW50czogW3RzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24sIHRzLkV4cHJlc3Npb25dfSB7XG4gIGNvbnN0IGhlbHBlckFyZ3MgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgaWYgKGhlbHBlckFyZ3MgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGhlbHBlckFyZ3MpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgdGFyZ2V0ID0gY2FsbC5hcmd1bWVudHNbMV07XG4gIHJldHVybiB0YXJnZXQgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIodGFyZ2V0KSAmJiBtYXRjaGVzKHRhcmdldCk7XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgcHJvdmlkZWQgY2FsbCBleHByZXNzaW9uIHRhcmdldHMgYSBtZW1iZXIgb2YgdGhlIGNsYXNzLCBieSB2ZXJpZnlpbmcgaXRzXG4gKiBhcmd1bWVudHMgYXJlIGFjY29yZGluZyB0byB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBfX2RlY29yYXRlKFtdLCBTb21lRGlyZWN0aXZlLnByb3RvdHlwZSwgXCJtZW1iZXJcIiwgdm9pZCAwKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBjYWxsIHRoZSBjYWxsIGV4cHJlc3Npb24gdGhhdCBpcyB0ZXN0ZWQgdG8gcmVwcmVzZW50IGEgbWVtYmVyIGRlY29yYXRvciBjYWxsLlxuICogQHBhcmFtIG1hdGNoZXMgcHJlZGljYXRlIGZ1bmN0aW9uIHRvIHRlc3Qgd2hldGhlciB0aGUgY2FsbCBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGRlc2lyZWQgY2xhc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01lbWJlckRlY29yYXRlQ2FsbChcbiAgICBjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbiwgbWF0Y2hlczogKGlkZW50aWZpZXI6IHRzLklkZW50aWZpZXIpID0+IGJvb2xlYW4pOlxuICAgIGNhbGwgaXMgdHMuQ2FsbEV4cHJlc3Npb24mXG4gICAge2FyZ3VtZW50czogW3RzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24sIHRzLlN0cmluZ0xpdGVyYWwsIHRzLlN0cmluZ0xpdGVyYWxdfSB7XG4gIGNvbnN0IGhlbHBlckFyZ3MgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgaWYgKGhlbHBlckFyZ3MgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGhlbHBlckFyZ3MpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgdGFyZ2V0ID0gY2FsbC5hcmd1bWVudHNbMV07XG4gIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24odGFyZ2V0KSB8fFxuICAgICAgIXRzLmlzSWRlbnRpZmllcih0YXJnZXQuZXhwcmVzc2lvbikgfHwgIW1hdGNoZXModGFyZ2V0LmV4cHJlc3Npb24pIHx8XG4gICAgICB0YXJnZXQubmFtZS50ZXh0ICE9PSAncHJvdG90eXBlJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IG1lbWJlck5hbWUgPSBjYWxsLmFyZ3VtZW50c1syXTtcbiAgcmV0dXJuIG1lbWJlck5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc1N0cmluZ0xpdGVyYWwobWVtYmVyTmFtZSk7XG59XG5cbi8qKlxuICogSGVscGVyIG1ldGhvZCB0byBleHRyYWN0IHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGdpdmVuIHRoZSBwcm9wZXJ0eSdzIFwic3ltYm9sXCIsXG4gKiB3aGljaCBpcyBhY3R1YWxseSB0aGUgc3ltYm9sIG9mIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHByb3BTeW1ib2w6IHRzLlN5bWJvbCk6IHRzLkV4cHJlc3Npb258dW5kZWZpbmVkIHtcbiAgY29uc3QgcHJvcElkZW50aWZpZXIgPSBwcm9wU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gIGNvbnN0IHBhcmVudCA9IHByb3BJZGVudGlmaWVyICYmIHByb3BJZGVudGlmaWVyLnBhcmVudDtcbiAgcmV0dXJuIHBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24ocGFyZW50KSA/IHBhcmVudC5yaWdodCA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBBIGNhbGxlZSBjb3VsZCBiZSBvbmUgb2Y6IGBfX2RlY29yYXRlKC4uLilgIG9yIGB0c2xpYl8xLl9fZGVjb3JhdGVgLlxuICovXG5mdW5jdGlvbiBnZXRDYWxsZWVOYW1lKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKGNhbGwuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gc3RyaXBEb2xsYXJTdWZmaXgoY2FsbC5leHByZXNzaW9uLnRleHQpO1xuICB9XG4gIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIHN0cmlwRG9sbGFyU3VmZml4KGNhbGwuZXhwcmVzc2lvbi5uYW1lLnRleHQpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vLy8vLy8vLy8vLy8vIEludGVybmFsIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG50eXBlIEluaXRpYWxpemVkVmFyaWFibGVDbGFzc0RlY2xhcmF0aW9uID1cbiAgICBDbGFzc0RlY2xhcmF0aW9uPHRzLlZhcmlhYmxlRGVjbGFyYXRpb24+Jntpbml0aWFsaXplcjogdHMuRXhwcmVzc2lvbn07XG5cbmZ1bmN0aW9uIGlzSW5pdGlhbGl6ZWRWYXJpYWJsZUNsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6XG4gICAgbm9kZSBpcyBJbml0aWFsaXplZFZhcmlhYmxlQ2xhc3NEZWNsYXJhdGlvbiB7XG4gIHJldHVybiBpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSAmJiBub2RlLmluaXRpYWxpemVyICE9PSB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogSGFuZGxlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvcm1cbiAqXG4gKiBgYGBcbiAqIHZhciBNeUNsYXNzID0gYWxpYXMxID0gYWxpYXMyID0gPDxkZWNsYXJhdGlvbj4+XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgTEhTIG9mIGEgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gKiBAcmV0dXJucyB0aGUgb3JpZ2luYWwgQVNUIG5vZGUgb3IgdGhlIFJIUyBvZiBhIHNlcmllcyBvZiBhc3NpZ25tZW50cyBpbiBhIHZhcmlhYmxlXG4gKiAgICAgZGVjbGFyYXRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBza2lwQ2xhc3NBbGlhc2VzKG5vZGU6IEluaXRpYWxpemVkVmFyaWFibGVDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIGxldCBleHByZXNzaW9uID0gbm9kZS5pbml0aWFsaXplcjtcbiAgd2hpbGUgKGlzQXNzaWdubWVudChleHByZXNzaW9uKSkge1xuICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnJpZ2h0O1xuICB9XG4gIHJldHVybiBleHByZXNzaW9uO1xufVxuXG4vKipcbiAqIFRoaXMgZXhwcmVzc2lvbiBjb3VsZCBlaXRoZXIgYmUgYSBjbGFzcyBleHByZXNzaW9uXG4gKlxuICogYGBgXG4gKiBjbGFzcyBNeUNsYXNzIHt9O1xuICogYGBgXG4gKlxuICogb3IgYW4gSUlGRSB3cmFwcGVkIGNsYXNzIGV4cHJlc3Npb25cbiAqXG4gKiBgYGBcbiAqICgoKSA9PiB7XG4gKiAgIGNsYXNzIE15Q2xhc3Mge31cbiAqICAgLi4uXG4gKiAgIHJldHVybiBNeUNsYXNzO1xuICogfSkoKVxuICogYGBgXG4gKlxuICogb3IgYW4gSUlGRSB3cmFwcGVkIGFsaWFzZWQgY2xhc3MgZXhwcmVzc2lvblxuICpcbiAqIGBgYFxuICogKCgpID0+IHtcbiAqICAgbGV0IE15Q2xhc3MgPSBjbGFzcyBNeUNsYXNzIHt9XG4gKiAgIC4uLlxuICogICByZXR1cm4gTXlDbGFzcztcbiAqIH0pKClcbiAqIGBgYFxuICpcbiAqIG9yIGFuIElGRkUgd3JhcHBlZCBFUzUgY2xhc3MgZnVuY3Rpb25cbiAqXG4gKiBgYGBcbiAqIChmdW5jdGlvbiAoKSB7XG4gKiAgZnVuY3Rpb24gTXlDbGFzcygpIHt9XG4gKiAgLi4uXG4gKiAgcmV0dXJuIE15Q2xhc3NcbiAqIH0pKClcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIHRoZSBub2RlIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3Mgd2hvc2UgZGVjbGFyYXRpb24gd2UgYXJlIGZpbmRpbmcuXG4gKiBAcmV0dXJucyB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGNsYXNzIG9yIGBudWxsYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6XG4gICAgQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0V4cHJlc3Npb258dHMuQ2xhc3NEZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uPnxudWxsIHtcbiAgaWYgKHRzLmlzQ2xhc3NFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmIGhhc05hbWVJZGVudGlmaWVyKGV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIGV4cHJlc3Npb247XG4gIH1cblxuICBjb25zdCBpaWZlQm9keSA9IGdldElpZmVCb2R5KGV4cHJlc3Npb24pO1xuICBpZiAoaWlmZUJvZHkgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKCF0cy5pc0Jsb2NrKGlpZmVCb2R5KSkge1xuICAgIC8vIEhhbmRsZSB0aGUgZmF0IGFycm93IGV4cHJlc3Npb24gY2FzZTogYCgpID0+IENsYXNzRXhwcmVzc2lvbmBcbiAgICByZXR1cm4gdHMuaXNDbGFzc0V4cHJlc3Npb24oaWlmZUJvZHkpICYmIGlzTmFtZWREZWNsYXJhdGlvbihpaWZlQm9keSkgPyBpaWZlQm9keSA6IG51bGw7XG4gIH0gZWxzZSB7XG4gICAgLy8gSGFuZGxlIHRoZSBjYXNlIG9mIGEgbm9ybWFsIG9yIGZhdC1hcnJvdyBmdW5jdGlvbiB3aXRoIGEgYm9keS5cbiAgICAvLyBSZXR1cm4gdGhlIGZpcnN0IENsYXNzRGVjbGFyYXRpb24vVmFyaWFibGVEZWNsYXJhdGlvbiBpbnNpZGUgdGhlIGJvZHlcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiBpaWZlQm9keS5zdGF0ZW1lbnRzKSB7XG4gICAgICBpZiAoaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oc3RhdGVtZW50KSB8fCBpc05hbWVkRnVuY3Rpb25EZWNsYXJhdGlvbihzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZW1lbnQ7XG4gICAgICB9XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGVjbGFyYXRpb24gb2Ygc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgICBpZiAoaXNJbml0aWFsaXplZFZhcmlhYmxlQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBza2lwQ2xhc3NBbGlhc2VzKGRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIGlmICh0cy5pc0NsYXNzRXhwcmVzc2lvbihleHByZXNzaW9uKSAmJiBoYXNOYW1lSWRlbnRpZmllcihleHByZXNzaW9uKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZXhwcmVzc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0RGVjb3JhdG9yQXJncyhub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb25bXSB7XG4gIC8vIFRoZSBhcmd1bWVudHMgb2YgYSBkZWNvcmF0b3IgYXJlIGhlbGQgaW4gdGhlIGBhcmdzYCBwcm9wZXJ0eSBvZiBpdHMgZGVjbGFyYXRpb24gb2JqZWN0LlxuICBjb25zdCBhcmdzUHJvcGVydHkgPSBub2RlLnByb3BlcnRpZXMuZmlsdGVyKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQocHJvcGVydHkgPT4gZ2V0TmFtZVRleHQocHJvcGVydHkubmFtZSkgPT09ICdhcmdzJyk7XG4gIGNvbnN0IGFyZ3NFeHByZXNzaW9uID0gYXJnc1Byb3BlcnR5ICYmIGFyZ3NQcm9wZXJ0eS5pbml0aWFsaXplcjtcbiAgcmV0dXJuIGFyZ3NFeHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihhcmdzRXhwcmVzc2lvbikgP1xuICAgICAgQXJyYXkuZnJvbShhcmdzRXhwcmVzc2lvbi5lbGVtZW50cykgOlxuICAgICAgW107XG59XG5cbmZ1bmN0aW9uIGlzUHJvcGVydHlBY2Nlc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uJlxuICAgIHtwYXJlbnQ6IHRzLkJpbmFyeUV4cHJlc3Npb259IHtcbiAgcmV0dXJuICEhbm9kZS5wYXJlbnQgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUucGFyZW50KSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKTtcbn1cblxuZnVuY3Rpb24gaXNUaGlzQXNzaWdubWVudChub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufSB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0KSAmJlxuICAgICAgbm9kZS5sZWZ0LmV4cHJlc3Npb24ua2luZCA9PT0gdHMuU3ludGF4S2luZC5UaGlzS2V5d29yZDtcbn1cblxuZnVuY3Rpb24gaXNOYW1lZERlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLk5hbWVkRGVjbGFyYXRpb24me25hbWU6IHRzLklkZW50aWZpZXJ9IHtcbiAgY29uc3QgYW55Tm9kZTogYW55ID0gbm9kZTtcbiAgcmV0dXJuICEhYW55Tm9kZS5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihhbnlOb2RlLm5hbWUpO1xufVxuXG5cbmZ1bmN0aW9uIGlzQ2xhc3NNZW1iZXJUeXBlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5DbGFzc0VsZW1lbnR8XG4gICAgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gKHRzLmlzQ2xhc3NFbGVtZW50KG5vZGUpIHx8IGlzUHJvcGVydHlBY2Nlc3Mobm9kZSkgfHwgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpKSAmJlxuICAgICAgLy8gQWRkaXRpb25hbGx5LCBlbnN1cmUgYG5vZGVgIGlzIG5vdCBhbiBpbmRleCBzaWduYXR1cmUsIGZvciBleGFtcGxlIG9uIGFuIGFic3RyYWN0IGNsYXNzOlxuICAgICAgLy8gYGFic3RyYWN0IGNsYXNzIEZvbyB7IFtrZXk6IHN0cmluZ106IGFueTsgfWBcbiAgICAgICF0cy5pc0luZGV4U2lnbmF0dXJlRGVjbGFyYXRpb24obm9kZSk7XG59XG5cbi8qKlxuICogQXR0ZW1wdCB0byByZXNvbHZlIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB0aGF0IHRoZSBnaXZlbiBkZWNsYXJhdGlvbiBpcyBhc3NpZ25lZCB0by5cbiAqIEZvciBleGFtcGxlLCBmb3IgdGhlIGZvbGxvd2luZyBjb2RlOlxuICpcbiAqIGBgYFxuICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICogYGBgXG4gKlxuICogb3JcbiAqXG4gKiBgYGBcbiAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gKCgpID0+IHtcbiAqICAgY2xhc3MgTXlDbGFzcyB7fVxuICogICAuLi5cbiAqICAgcmV0dXJuIE15Q2xhc3M7XG4gKiB9KSgpXG4gIGBgYFxuICpcbiAqIGFuZCB0aGUgcHJvdmlkZWQgZGVjbGFyYXRpb24gYmVpbmcgYGNsYXNzIE15Q2xhc3Mge31gLCB0aGlzIHdpbGwgcmV0dXJuIHRoZSBgdmFyIE15Q2xhc3NgXG4gKiBkZWNsYXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIGRlY2xhcmF0aW9uIGZvciB3aGljaCBhbnkgdmFyaWFibGUgZGVjbGFyYXRpb24gc2hvdWxkIGJlIG9idGFpbmVkLlxuICogQHJldHVybnMgdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGlmIGZvdW5kLCB1bmRlZmluZWQgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBnZXRGYXJMZWZ0SGFuZFNpZGVPZkFzc2lnbm1lbnQoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuVmFyaWFibGVEZWNsYXJhdGlvbnxcbiAgICB1bmRlZmluZWQge1xuICBsZXQgbm9kZSA9IGRlY2xhcmF0aW9uLnBhcmVudDtcblxuICAvLyBEZXRlY3QgYW4gaW50ZXJtZWRpYXJ5IHZhcmlhYmxlIGFzc2lnbm1lbnQgYW5kIHNraXAgb3ZlciBpdC5cbiAgaWYgKGlzQXNzaWdubWVudChub2RlKSAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5sZWZ0KSkge1xuICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgfVxuXG4gIHJldHVybiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgPyBub2RlIDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBnZXRDb250YWluaW5nVmFyaWFibGVEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5WYXJpYWJsZURlY2xhcmF0aW9uPnxcbiAgICB1bmRlZmluZWQge1xuICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIHdoaWxlIChub2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBBIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG1heSBoYXZlIGJlZW4gXCJzeW50aGVzaXplZFwiIGJ5IFR5cGVTY3JpcHQgZHVyaW5nIEphdmFTY3JpcHQgZW1pdCxcbiAqIGluIHRoZSBjYXNlIG5vIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGUuZy4gcHJvcGVydHkgaW5pdGlhbGl6ZXJzIGFyZSB1c2VkLlxuICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAqIGNvbXBpbGVyIGdlbmVyYXRlcyBhIHN5bnRoZXRpYyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gKiBvcmlnaW5hbGx5IGhhdmUgYSBjb25zdHJ1Y3RvciBpbiB0aGUgVHlwZVNjcmlwdCBzb3VyY2UuIFdoZW4gYSBjbGFzcyBoYXMgYSBzdXBlcmNsYXNzLFxuICogYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciBtdXN0IG5vdCBiZSBjb25zaWRlcmVkIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXRcbiAqIHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5IG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiB0aGF0IGRvZXMgbm90IGluamVjdCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0XG4gKiBzeW50aGVzaXplZCBzdXBlciBjYWxsIGluIHRoZSBjb25zdHJ1Y3RvciBib2R5LCBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHRcbiAqIGVtaXRzIGR1cmluZyBKYXZhU2NyaXB0IGVtaXQ6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi92My4yLjIvc3JjL2NvbXBpbGVyL3RyYW5zZm9ybWVycy90cy50cyNMMTA2OC1MMTA4MlxuICpcbiAqIEBwYXJhbSBjb25zdHJ1Y3RvciBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIHRlc3RcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGNvbnN0cnVjdG9yIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcjogdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGNvbnN0cnVjdG9yLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgaWYgKCFmaXJzdFN0YXRlbWVudCB8fCAhdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkU3VwZXJDYWxsKGZpcnN0U3RhdGVtZW50LmV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWQgYnkgVHlwZVNjcmlwdCwgaS5lLiB3aGV0aGVyXG4gKiBpdCBpcyBvZiB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBzdXBlciguLi5hcmd1bWVudHMpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBpcyB0byBiZSB0ZXN0ZWRcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5leHByZXNzaW9uLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuU3VwZXJLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICByZXR1cm4gdHMuaXNTcHJlYWRFbGVtZW50KGFyZ3VtZW50KSAmJiB0cy5pc0lkZW50aWZpZXIoYXJndW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIGFyZ3VtZW50LmV4cHJlc3Npb24udGV4dCA9PT0gJ2FyZ3VtZW50cyc7XG59XG5cbi8qKlxuICogRmluZCB0aGUgc3RhdGVtZW50IHRoYXQgY29udGFpbnMgdGhlIGdpdmVuIG5vZGVcbiAqIEBwYXJhbSBub2RlIGEgbm9kZSB3aG9zZSBjb250YWluaW5nIHN0YXRlbWVudCB3ZSB3aXNoIHRvIGZpbmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRhaW5pbmdTdGF0ZW1lbnQobm9kZTogdHMuTm9kZSk6IHRzLlN0YXRlbWVudCB7XG4gIHdoaWxlIChub2RlLnBhcmVudCkge1xuICAgIGlmICh0cy5pc0Jsb2NrKG5vZGUucGFyZW50KSB8fCB0cy5pc1NvdXJjZUZpbGUobm9kZS5wYXJlbnQpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG4gIHJldHVybiBub2RlIGFzIHRzLlN0YXRlbWVudDtcbn1cblxuZnVuY3Rpb24gZ2V0Um9vdEZpbGVPckZhaWwoYnVuZGxlOiBCdW5kbGVQcm9ncmFtKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IHJvb3RGaWxlID0gYnVuZGxlLnByb2dyYW0uZ2V0U291cmNlRmlsZShidW5kbGUucGF0aCk7XG4gIGlmIChyb290RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZ2l2ZW4gcm9vdFBhdGggJHtyb290RmlsZX0gaXMgbm90IGEgZmlsZSBvZiB0aGUgcHJvZ3JhbS5gKTtcbiAgfVxuICByZXR1cm4gcm9vdEZpbGU7XG59XG5cbmZ1bmN0aW9uIGdldE5vblJvb3RQYWNrYWdlRmlsZXMoYnVuZGxlOiBCdW5kbGVQcm9ncmFtKTogdHMuU291cmNlRmlsZVtdIHtcbiAgY29uc3Qgcm9vdEZpbGUgPSBidW5kbGUucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGJ1bmRsZS5wYXRoKTtcbiAgcmV0dXJuIGJ1bmRsZS5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKFxuICAgICAgZiA9PiAoZiAhPT0gcm9vdEZpbGUpICYmIGlzV2l0aGluUGFja2FnZShidW5kbGUucGFja2FnZSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZShmKSkpO1xufVxuXG5mdW5jdGlvbiBpc1RvcExldmVsKG5vZGU6IHRzLk5vZGUpOiBib29sZWFuIHtcbiAgd2hpbGUgKG5vZGUgPSBub2RlLnBhcmVudCkge1xuICAgIGlmICh0cy5pc0Jsb2NrKG5vZGUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEdldCBhIG5vZGUgdGhhdCByZXByZXNlbnRzIHRoZSBhY3R1YWwgKG91dGVyKSBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzIGZyb20gaXRzIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIFNvbWV0aW1lcywgdGhlIGltcGxlbWVudGF0aW9uIG9mIGEgY2xhc3MgaXMgYW4gZXhwcmVzc2lvbiB0aGF0IGlzIGhpZGRlbiBpbnNpZGUgYW4gSUlGRSBhbmRcbiAqIGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgb3V0c2lkZSB0aGUgSUlGRSwgd2hpY2ggaXMgd2hhdCB0aGUgcmVzdCBvZiB0aGUgcHJvZ3JhbSBpbnRlcmFjdHMgd2l0aC5cbiAqIEZvciBleGFtcGxlLFxuICpcbiAqIGBgYFxuICogT3V0ZXJOb2RlID0gQWxpYXMgPSAoZnVuY3Rpb24oKSB7IGZ1bmN0aW9uIElubmVyTm9kZSgpIHt9IHJldHVybiBJbm5lck5vZGU7IH0pKCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gbm9kZSBhIG5vZGUgdGhhdCBjb3VsZCBiZSB0aGUgaW1wbGVtZW50YXRpb24gaW5zaWRlIGFuIElJRkUuXG4gKiBAcmV0dXJucyBhIG5vZGUgdGhhdCByZXByZXNlbnRzIHRoZSBvdXRlciBkZWNsYXJhdGlvbiwgb3IgYG51bGxgIGlmIGl0IGlzIGRvZXMgbm90IG1hdGNoIHRoZSBJSUZFXG4gKiAgICAgZm9ybWF0IHNob3duIGFib3ZlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0T3V0ZXJOb2RlRnJvbUlubmVyRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6IHRzLk5vZGV8bnVsbCB7XG4gIGlmICghdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUpICYmICF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgJiZcbiAgICAgICF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KG5vZGUpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBJdCBtaWdodCBiZSB0aGUgZnVuY3Rpb24gZXhwcmVzc2lvbiBpbnNpZGUgdGhlIElJRkUuIFdlIG5lZWQgdG8gZ28gNSBsZXZlbHMgdXAuLi5cblxuICAvLyAtIElJRkUgYm9keS5cbiAgbGV0IG91dGVyTm9kZSA9IG5vZGUucGFyZW50O1xuICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNCbG9jayhvdXRlck5vZGUpKSByZXR1cm4gbnVsbDtcblxuICAvLyAtIElJRkUgZnVuY3Rpb24gZXhwcmVzc2lvbi5cbiAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgaWYgKCFvdXRlck5vZGUgfHwgKCF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihvdXRlck5vZGUpICYmICF0cy5pc0Fycm93RnVuY3Rpb24ob3V0ZXJOb2RlKSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuXG4gIC8vIC0gUGFyZW50aGVzaXMgaW5zaWRlIElJRkUuXG4gIGlmIChvdXRlck5vZGUgJiYgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihvdXRlck5vZGUpKSBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuXG4gIC8vIC0gSUlGRSBjYWxsIGV4cHJlc3Npb24uXG4gIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKG91dGVyTm9kZSkpIHJldHVybiBudWxsO1xuICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuXG4gIC8vIC0gUGFyZW50aGVzaXMgYXJvdW5kIElJRkUuXG4gIGlmIChvdXRlck5vZGUgJiYgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihvdXRlck5vZGUpKSBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuXG4gIC8vIC0gU2tpcCBhbnkgYWxpYXNlcyBiZXR3ZWVuIHRoZSBJSUZFIGFuZCB0aGUgZmFyIGxlZnQgaGFuZCBzaWRlIG9mIGFueSBhc3NpZ25tZW50cy5cbiAgd2hpbGUgKGlzQXNzaWdubWVudChvdXRlck5vZGUucGFyZW50KSkge1xuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gb3V0ZXJOb2RlO1xufVxuIl19