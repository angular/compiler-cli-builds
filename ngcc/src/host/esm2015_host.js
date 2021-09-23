/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/host/esm2015_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/ngcc/src/analysis/util", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/ngcc_host", "@angular/compiler-cli/ngcc/src/host/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getOuterNodeFromInnerDeclaration = exports.getContainingStatement = exports.getInnerClassDeclaration = exports.skipClassAliases = exports.getPropertyValueFromSymbol = exports.isMemberDecorateCall = exports.isClassDecorateCall = exports.isAssignment = exports.getIifeBody = exports.isAssignmentStatement = exports.Esm2015ReflectionHost = exports.CONSTRUCTOR_PARAMS = exports.CONSTRUCTOR = exports.PROP_DECORATORS = exports.DECORATORS = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var util_1 = require("@angular/compiler-cli/ngcc/src/analysis/util");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var ngcc_host_1 = require("@angular/compiler-cli/ngcc/src/host/ngcc_host");
    var utils_2 = require("@angular/compiler-cli/ngcc/src/host/utils");
    exports.DECORATORS = 'decorators';
    exports.PROP_DECORATORS = 'propDecorators';
    exports.CONSTRUCTOR = '__constructor';
    exports.CONSTRUCTOR_PARAMS = 'ctorParameters';
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
    var Esm2015ReflectionHost = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(Esm2015ReflectionHost, _super);
        function Esm2015ReflectionHost(logger, isCore, src, dts) {
            if (dts === void 0) { dts = null; }
            var _this = _super.call(this, src.program.getTypeChecker()) || this;
            _this.logger = logger;
            _this.isCore = isCore;
            _this.src = src;
            _this.dts = dts;
            /**
             * A mapping from source declarations to typings declarations, which are both publicly exported.
             *
             * There should be one entry for every public export visible from the root file of the source
             * tree. Note that by definition the key and value declarations will not be in the same TS
             * program.
             */
            _this.publicDtsDeclarationMap = null;
            /**
             * A mapping from source declarations to typings declarations, which are not publicly exported.
             *
             * This mapping is a best guess between declarations that happen to be exported from their file by
             * the same name in both the source and the dts file. Note that by definition the key and value
             * declarations will not be in the same TS program.
             */
            _this.privateDtsDeclarationMap = null;
            /**
             * The set of source files that have already been preprocessed.
             */
            _this.preprocessedSourceFiles = new Set();
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
            _this.aliasedClassDeclarations = new Map();
            /**
             * Caches the information of the decorators on a class, as the work involved with extracting
             * decorators is complex and frequently used.
             *
             * This map is lazily populated during the first call to `acquireDecoratorInfo` for a given class.
             */
            _this.decoratorCache = new Map();
            return _this;
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
        Esm2015ReflectionHost.prototype.getClassSymbol = function (declaration) {
            var symbol = this.getClassSymbolFromOuterDeclaration(declaration);
            if (symbol !== undefined) {
                return symbol;
            }
            var innerDeclaration = this.getInnerDeclarationFromAliasOrInner(declaration);
            return this.getClassSymbolFromInnerDeclaration(innerDeclaration);
        };
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
        Esm2015ReflectionHost.prototype.getDecoratorsOfDeclaration = function (declaration) {
            var symbol = this.getClassSymbol(declaration);
            if (!symbol) {
                return null;
            }
            return this.getDecoratorsOfSymbol(symbol);
        };
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
        Esm2015ReflectionHost.prototype.getMembersOfClass = function (clazz) {
            var classSymbol = this.getClassSymbol(clazz);
            if (!classSymbol) {
                throw new Error("Attempted to get members of a non-class: \"" + clazz.getText() + "\"");
            }
            return this.getMembersOfSymbol(classSymbol);
        };
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
        Esm2015ReflectionHost.prototype.getConstructorParameters = function (clazz) {
            var classSymbol = this.getClassSymbol(clazz);
            if (!classSymbol) {
                throw new Error("Attempted to get constructor parameters of a non-class: \"" + clazz.getText() + "\"");
            }
            var parameterNodes = this.getConstructorParameterDeclarations(classSymbol);
            if (parameterNodes) {
                return this.getConstructorParamInfo(classSymbol, parameterNodes);
            }
            return null;
        };
        Esm2015ReflectionHost.prototype.getBaseClassExpression = function (clazz) {
            // First try getting the base class from an ES2015 class declaration
            var superBaseClassIdentifier = _super.prototype.getBaseClassExpression.call(this, clazz);
            if (superBaseClassIdentifier) {
                return superBaseClassIdentifier;
            }
            // That didn't work so now try getting it from the "inner" declaration.
            var classSymbol = this.getClassSymbol(clazz);
            if ((classSymbol === null || classSymbol === void 0 ? void 0 : classSymbol.implementation.valueDeclaration) === undefined ||
                !isNamedDeclaration(classSymbol.implementation.valueDeclaration)) {
                return null;
            }
            return _super.prototype.getBaseClassExpression.call(this, classSymbol.implementation.valueDeclaration);
        };
        Esm2015ReflectionHost.prototype.getInternalNameOfClass = function (clazz) {
            var classSymbol = this.getClassSymbol(clazz);
            if (classSymbol === undefined) {
                throw new Error("getInternalNameOfClass() called on a non-class: expected " + clazz.name.text + " to be a class declaration.");
            }
            return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.implementation.valueDeclaration);
        };
        Esm2015ReflectionHost.prototype.getAdjacentNameOfClass = function (clazz) {
            var classSymbol = this.getClassSymbol(clazz);
            if (classSymbol === undefined) {
                throw new Error("getAdjacentNameOfClass() called on a non-class: expected " + clazz.name.text + " to be a class declaration.");
            }
            return this.getAdjacentNameOfClassSymbol(classSymbol);
        };
        Esm2015ReflectionHost.prototype.getNameFromClassSymbolDeclaration = function (classSymbol, declaration) {
            if (declaration === undefined) {
                throw new Error("getInternalNameOfClass() called on a class with an undefined internal declaration. External class name: " + classSymbol.name + "; internal class name: " + classSymbol.implementation.name + ".");
            }
            if (!isNamedDeclaration(declaration)) {
                throw new Error("getInternalNameOfClass() called on a class with an anonymous inner declaration: expected a name on:\n" + declaration.getText());
            }
            return declaration.name;
        };
        /**
         * Check whether the given node actually represents a class.
         */
        Esm2015ReflectionHost.prototype.isClass = function (node) {
            return _super.prototype.isClass.call(this, node) || this.getClassSymbol(node) !== undefined;
        };
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
        Esm2015ReflectionHost.prototype.getDeclarationOfIdentifier = function (id) {
            var superDeclaration = _super.prototype.getDeclarationOfIdentifier.call(this, id);
            // If no declaration was found, return.
            if (superDeclaration === null) {
                return superDeclaration;
            }
            // If the declaration already has traits assigned to it, return as is.
            if (superDeclaration.known !== null ||
                (0, reflection_1.isConcreteDeclaration)(superDeclaration) && superDeclaration.identity !== null) {
                return superDeclaration;
            }
            var declarationNode = superDeclaration.node;
            if ((0, reflection_1.isNamedVariableDeclaration)(superDeclaration.node) && !isTopLevel(superDeclaration.node)) {
                var variableValue = this.getVariableValue(superDeclaration.node);
                if (variableValue !== null && ts.isClassExpression(variableValue)) {
                    declarationNode = getContainingStatement(variableValue);
                }
            }
            var outerNode = getOuterNodeFromInnerDeclaration(declarationNode);
            var declaration = outerNode !== null && (0, reflection_1.isNamedVariableDeclaration)(outerNode) ?
                this.getDeclarationOfIdentifier(outerNode.name) :
                superDeclaration;
            if (declaration === null || declaration.known !== null ||
                (0, reflection_1.isConcreteDeclaration)(declaration) && declaration.identity !== null) {
                return declaration;
            }
            // The identifier may have been of an additional class assignment such as `MyClass_1` that was
            // present as alias for `MyClass`. If so, resolve such aliases to their original declaration.
            var aliasedIdentifier = this.resolveAliasedClassIdentifier(declaration.node);
            if (aliasedIdentifier !== null) {
                return this.getDeclarationOfIdentifier(aliasedIdentifier);
            }
            // Variable declarations may represent an enum declaration, so attempt to resolve its members.
            if ((0, reflection_1.isConcreteDeclaration)(declaration) && ts.isVariableDeclaration(declaration.node)) {
                var enumMembers = this.resolveEnumMembers(declaration.node);
                if (enumMembers !== null) {
                    declaration.identity = { kind: 0 /* DownleveledEnum */, enumMembers: enumMembers };
                }
            }
            return declaration;
        };
        /**
         * Gets all decorators of the given class symbol. Any decorator that have been synthetically
         * injected by a migration will not be present in the returned collection.
         */
        Esm2015ReflectionHost.prototype.getDecoratorsOfSymbol = function (symbol) {
            var classDecorators = this.acquireDecoratorInfo(symbol).classDecorators;
            if (classDecorators === null) {
                return null;
            }
            // Return a clone of the array to prevent consumers from mutating the cache.
            return Array.from(classDecorators);
        };
        /**
         * Search the given module for variable declarations in which the initializer
         * is an identifier marked with the `PRE_R3_MARKER`.
         * @param module the module in which to search for switchable declarations.
         * @returns an array of variable declarations that match.
         */
        Esm2015ReflectionHost.prototype.getSwitchableDeclarations = function (module) {
            // Don't bother to walk the AST if the marker is not found in the text
            return module.getText().indexOf(ngcc_host_1.PRE_R3_MARKER) >= 0 ?
                (0, utils_1.findAll)(module, ngcc_host_1.isSwitchableVariableDeclaration) :
                [];
        };
        Esm2015ReflectionHost.prototype.getVariableValue = function (declaration) {
            var value = _super.prototype.getVariableValue.call(this, declaration);
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
            var block = declaration.parent.parent.parent;
            var symbol = this.checker.getSymbolAtLocation(declaration.name);
            if (symbol && (ts.isBlock(block) || ts.isSourceFile(block))) {
                var decorateCall = this.findDecoratedVariableValue(block, symbol);
                var target = decorateCall && decorateCall.arguments[1];
                if (target && ts.isIdentifier(target)) {
                    var targetSymbol = this.checker.getSymbolAtLocation(target);
                    var targetDeclaration = targetSymbol && targetSymbol.valueDeclaration;
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
                            var targetValue = targetDeclaration.initializer;
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
        };
        /**
         * Find all top-level class symbols in the given file.
         * @param sourceFile The source file to search for classes.
         * @returns An array of class symbols.
         */
        Esm2015ReflectionHost.prototype.findClassSymbols = function (sourceFile) {
            var _this = this;
            var classes = new Map();
            this.getModuleStatements(sourceFile)
                .forEach(function (statement) { return _this.addClassSymbolsFromStatement(classes, statement); });
            return Array.from(classes.values());
        };
        /**
         * Get the number of generic type parameters of a given class.
         *
         * @param clazz a `ClassDeclaration` representing the class over which to reflect.
         *
         * @returns the number of type parameters of the class, if known, or `null` if the declaration
         * is not a class or has an unknown number of type parameters.
         */
        Esm2015ReflectionHost.prototype.getGenericArityOfClass = function (clazz) {
            var dtsDeclaration = this.getDtsDeclaration(clazz);
            if (dtsDeclaration && ts.isClassDeclaration(dtsDeclaration)) {
                return dtsDeclaration.typeParameters ? dtsDeclaration.typeParameters.length : 0;
            }
            return null;
        };
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
        Esm2015ReflectionHost.prototype.getDtsDeclaration = function (declaration) {
            if (this.dts === null) {
                return null;
            }
            if (!isNamedDeclaration(declaration)) {
                throw new Error("Cannot get the dts file for a declaration that has no name: " + declaration.getText() + " in " + declaration.getSourceFile().fileName);
            }
            var decl = this.getDeclarationOfIdentifier(declaration.name);
            if (decl === null) {
                throw new Error("Cannot get the dts file for a node that cannot be associated with a declaration " + declaration.getText() + " in " + declaration.getSourceFile().fileName);
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
        };
        Esm2015ReflectionHost.prototype.getEndOfClass = function (classSymbol) {
            var implementation = classSymbol.implementation;
            var last = implementation.valueDeclaration;
            var implementationStatement = getContainingStatement(last);
            if (implementationStatement === null)
                return last;
            var container = implementationStatement.parent;
            if (ts.isBlock(container)) {
                // Assume that the implementation is inside an IIFE
                var returnStatementIndex = container.statements.findIndex(ts.isReturnStatement);
                if (returnStatementIndex === -1) {
                    throw new Error("Compiled class wrapper IIFE does not have a return statement: " + classSymbol.name + " in " + classSymbol.declaration.valueDeclaration.getSourceFile().fileName);
                }
                // Return the statement before the IIFE return statement
                last = container.statements[returnStatementIndex - 1];
            }
            else if (ts.isSourceFile(container)) {
                // If there are static members on this class then find the last one
                if (implementation.exports !== undefined) {
                    implementation.exports.forEach(function (exportSymbol) {
                        if (exportSymbol.valueDeclaration === undefined) {
                            return;
                        }
                        var exportStatement = getContainingStatement(exportSymbol.valueDeclaration);
                        if (exportStatement !== null && last.getEnd() < exportStatement.getEnd()) {
                            last = exportStatement;
                        }
                    });
                }
                // If there are helper calls for this class then find the last one
                var helpers = this.getHelperCallsForClass(classSymbol, ['__decorate', '__extends', '__param', '__metadata']);
                helpers.forEach(function (helper) {
                    var helperStatement = getContainingStatement(helper);
                    if (helperStatement !== null && last.getEnd() < helperStatement.getEnd()) {
                        last = helperStatement;
                    }
                });
            }
            return last;
        };
        /**
         * Check whether a `Declaration` corresponds with a known declaration, such as `Object`, and set
         * its `known` property to the appropriate `KnownDeclaration`.
         *
         * @param decl The `Declaration` to check.
         * @return The passed in `Declaration` (potentially enhanced with a `KnownDeclaration`).
         */
        Esm2015ReflectionHost.prototype.detectKnownDeclaration = function (decl) {
            if (decl.known === null && this.isJavaScriptObjectDeclaration(decl)) {
                // If the identifier resolves to the global JavaScript `Object`, update the declaration to
                // denote it as the known `JsGlobalObject` declaration.
                decl.known = reflection_1.KnownDeclaration.JsGlobalObject;
            }
            return decl;
        };
        ///////////// Protected Helpers /////////////
        /**
         * Extract all the "classes" from the `statement` and add them to the `classes` map.
         */
        Esm2015ReflectionHost.prototype.addClassSymbolsFromStatement = function (classes, statement) {
            var _this = this;
            if (ts.isVariableStatement(statement)) {
                statement.declarationList.declarations.forEach(function (declaration) {
                    var classSymbol = _this.getClassSymbol(declaration);
                    if (classSymbol) {
                        classes.set(classSymbol.implementation, classSymbol);
                    }
                });
            }
            else if (ts.isClassDeclaration(statement)) {
                var classSymbol = this.getClassSymbol(statement);
                if (classSymbol) {
                    classes.set(classSymbol.implementation, classSymbol);
                }
            }
        };
        /**
         * Compute the inner declaration node of a "class" from the given `declaration` node.
         *
         * @param declaration a node that is either an inner declaration or an alias of a class.
         */
        Esm2015ReflectionHost.prototype.getInnerDeclarationFromAliasOrInner = function (declaration) {
            if (declaration.parent !== undefined && (0, reflection_1.isNamedVariableDeclaration)(declaration.parent)) {
                var variableValue = this.getVariableValue(declaration.parent);
                if (variableValue !== null) {
                    declaration = variableValue;
                }
            }
            return declaration;
        };
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
        Esm2015ReflectionHost.prototype.getClassSymbolFromOuterDeclaration = function (declaration) {
            // Return a class symbol without an inner declaration if it is a regular "top level" class
            if ((0, reflection_1.isNamedClassDeclaration)(declaration) && isTopLevel(declaration)) {
                return this.createClassSymbol(declaration.name, null);
            }
            // Otherwise, an outer class declaration must be an initialized variable declaration:
            if (!isInitializedVariableClassDeclaration(declaration)) {
                return undefined;
            }
            var innerDeclaration = getInnerClassDeclaration(skipClassAliases(declaration));
            if (innerDeclaration === null) {
                return undefined;
            }
            return this.createClassSymbol(declaration.name, innerDeclaration);
        };
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
        Esm2015ReflectionHost.prototype.getClassSymbolFromInnerDeclaration = function (declaration) {
            var outerDeclaration = undefined;
            if (ts.isClassExpression(declaration) && (0, utils_1.hasNameIdentifier)(declaration)) {
                // Handle `let MyClass = MyClass_1 = class MyClass {};`
                outerDeclaration = getFarLeftHandSideOfAssignment(declaration);
                // Handle this being in an IIFE
                if (outerDeclaration !== undefined && !isTopLevel(outerDeclaration)) {
                    outerDeclaration = getContainingVariableDeclaration(outerDeclaration);
                }
            }
            else if ((0, reflection_1.isNamedClassDeclaration)(declaration)) {
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
            if (outerDeclaration === undefined || !(0, utils_1.hasNameIdentifier)(outerDeclaration)) {
                return undefined;
            }
            return this.createClassSymbol(outerDeclaration.name, declaration);
        };
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
        Esm2015ReflectionHost.prototype.createClassSymbol = function (outerDeclaration, innerDeclaration) {
            var declarationSymbol = this.checker.getSymbolAtLocation(outerDeclaration);
            if (declarationSymbol === undefined) {
                return undefined;
            }
            var implementationSymbol = declarationSymbol;
            if (innerDeclaration !== null && isNamedDeclaration(innerDeclaration)) {
                implementationSymbol = this.checker.getSymbolAtLocation(innerDeclaration.name);
            }
            if (!(0, typescript_1.isSymbolWithValueDeclaration)(implementationSymbol)) {
                return undefined;
            }
            var classSymbol = {
                name: declarationSymbol.name,
                declaration: declarationSymbol,
                implementation: implementationSymbol,
                adjacent: this.getAdjacentSymbol(declarationSymbol, implementationSymbol),
            };
            return classSymbol;
        };
        Esm2015ReflectionHost.prototype.getAdjacentSymbol = function (declarationSymbol, implementationSymbol) {
            if (declarationSymbol === implementationSymbol) {
                return undefined;
            }
            var innerDeclaration = implementationSymbol.valueDeclaration;
            if (!ts.isClassExpression(innerDeclaration) && !ts.isFunctionExpression(innerDeclaration)) {
                return undefined;
            }
            // Deal with the inner class looking like this inside an IIFE:
            // `let MyClass = class MyClass {};` or `var MyClass = function MyClass() {};`
            var adjacentDeclaration = getFarLeftHandSideOfAssignment(innerDeclaration);
            if (adjacentDeclaration === undefined || !(0, reflection_1.isNamedVariableDeclaration)(adjacentDeclaration)) {
                return undefined;
            }
            var adjacentSymbol = this.checker.getSymbolAtLocation(adjacentDeclaration.name);
            if (adjacentSymbol === declarationSymbol || adjacentSymbol === implementationSymbol ||
                !(0, typescript_1.isSymbolWithValueDeclaration)(adjacentSymbol)) {
                return undefined;
            }
            return adjacentSymbol;
        };
        /**
         * Resolve a `ts.Symbol` to its declaration and detect whether it corresponds with a known
         * declaration.
         */
        Esm2015ReflectionHost.prototype.getDeclarationOfSymbol = function (symbol, originalId) {
            var declaration = _super.prototype.getDeclarationOfSymbol.call(this, symbol, originalId);
            if (declaration === null) {
                return null;
            }
            return this.detectKnownDeclaration(declaration);
        };
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
        Esm2015ReflectionHost.prototype.resolveAliasedClassIdentifier = function (declaration) {
            this.ensurePreprocessed(declaration.getSourceFile());
            return this.aliasedClassDeclarations.has(declaration) ?
                this.aliasedClassDeclarations.get(declaration) :
                null;
        };
        /**
         * Ensures that the source file that `node` is part of has been preprocessed.
         *
         * During preprocessing, all statements in the source file will be visited such that certain
         * processing steps can be done up-front and cached for subsequent usages.
         *
         * @param sourceFile The source file that needs to have gone through preprocessing.
         */
        Esm2015ReflectionHost.prototype.ensurePreprocessed = function (sourceFile) {
            var e_1, _a;
            if (!this.preprocessedSourceFiles.has(sourceFile)) {
                this.preprocessedSourceFiles.add(sourceFile);
                try {
                    for (var _b = (0, tslib_1.__values)(this.getModuleStatements(sourceFile)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var statement = _c.value;
                        this.preprocessStatement(statement);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        };
        /**
         * Analyzes the given statement to see if it corresponds with a variable declaration like
         * `let MyClass = MyClass_1 = class MyClass {};`. If so, the declaration of `MyClass_1`
         * is associated with the `MyClass` identifier.
         *
         * @param statement The statement that needs to be preprocessed.
         */
        Esm2015ReflectionHost.prototype.preprocessStatement = function (statement) {
            if (!ts.isVariableStatement(statement)) {
                return;
            }
            var declarations = statement.declarationList.declarations;
            if (declarations.length !== 1) {
                return;
            }
            var declaration = declarations[0];
            var initializer = declaration.initializer;
            if (!ts.isIdentifier(declaration.name) || !initializer || !isAssignment(initializer) ||
                !ts.isIdentifier(initializer.left) || !this.isClass(declaration)) {
                return;
            }
            var aliasedIdentifier = initializer.left;
            var aliasedDeclaration = this.getDeclarationOfIdentifier(aliasedIdentifier);
            if (aliasedDeclaration === null) {
                throw new Error("Unable to locate declaration of " + aliasedIdentifier.text + " in \"" + statement.getText() + "\"");
            }
            this.aliasedClassDeclarations.set(aliasedDeclaration.node, declaration.name);
        };
        /**
         * Get the top level statements for a module.
         *
         * In ES5 and ES2015 this is just the top level statements of the file.
         * @param sourceFile The module whose statements we want.
         * @returns An array of top level statements for the given module.
         */
        Esm2015ReflectionHost.prototype.getModuleStatements = function (sourceFile) {
            return Array.from(sourceFile.statements);
        };
        /**
         * Walk the AST looking for an assignment to the specified symbol.
         * @param node The current node we are searching.
         * @returns an expression that represents the value of the variable, or undefined if none can be
         * found.
         */
        Esm2015ReflectionHost.prototype.findDecoratedVariableValue = function (node, symbol) {
            var _this = this;
            if (!node) {
                return null;
            }
            if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                var left = node.left;
                var right = node.right;
                if (ts.isIdentifier(left) && this.checker.getSymbolAtLocation(left) === symbol) {
                    return (ts.isCallExpression(right) && getCalleeName(right) === '__decorate') ? right : null;
                }
                return this.findDecoratedVariableValue(right, symbol);
            }
            return node.forEachChild(function (node) { return _this.findDecoratedVariableValue(node, symbol); }) || null;
        };
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
        Esm2015ReflectionHost.prototype.getStaticProperty = function (symbol, propertyName) {
            var _a, _b, _c, _d;
            return ((_a = symbol.implementation.exports) === null || _a === void 0 ? void 0 : _a.get(propertyName)) ||
                ((_c = (_b = symbol.adjacent) === null || _b === void 0 ? void 0 : _b.exports) === null || _c === void 0 ? void 0 : _c.get(propertyName)) ||
                ((_d = symbol.declaration.exports) === null || _d === void 0 ? void 0 : _d.get(propertyName));
        };
        /**
         * This is the main entry-point for obtaining information on the decorators of a given class. This
         * information is computed either from static properties if present, or using `tslib.__decorate`
         * helper calls otherwise. The computed result is cached per class.
         *
         * @param classSymbol the class for which decorators should be acquired.
         * @returns all information of the decorators on the class.
         */
        Esm2015ReflectionHost.prototype.acquireDecoratorInfo = function (classSymbol) {
            var decl = classSymbol.declaration.valueDeclaration;
            if (this.decoratorCache.has(decl)) {
                return this.decoratorCache.get(decl);
            }
            // Extract decorators from static properties and `__decorate` helper calls, then merge them
            // together where the information from the static properties is preferred.
            var staticProps = this.computeDecoratorInfoFromStaticProperties(classSymbol);
            var helperCalls = this.computeDecoratorInfoFromHelperCalls(classSymbol);
            var decoratorInfo = {
                classDecorators: staticProps.classDecorators || helperCalls.classDecorators,
                memberDecorators: staticProps.memberDecorators || helperCalls.memberDecorators,
                constructorParamInfo: staticProps.constructorParamInfo || helperCalls.constructorParamInfo,
            };
            this.decoratorCache.set(decl, decoratorInfo);
            return decoratorInfo;
        };
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
        Esm2015ReflectionHost.prototype.computeDecoratorInfoFromStaticProperties = function (classSymbol) {
            var classDecorators = null;
            var memberDecorators = null;
            var constructorParamInfo = null;
            var decoratorsProperty = this.getStaticProperty(classSymbol, exports.DECORATORS);
            if (decoratorsProperty !== undefined) {
                classDecorators = this.getClassDecoratorsFromStaticProperty(decoratorsProperty);
            }
            var propDecoratorsProperty = this.getStaticProperty(classSymbol, exports.PROP_DECORATORS);
            if (propDecoratorsProperty !== undefined) {
                memberDecorators = this.getMemberDecoratorsFromStaticProperty(propDecoratorsProperty);
            }
            var constructorParamsProperty = this.getStaticProperty(classSymbol, exports.CONSTRUCTOR_PARAMS);
            if (constructorParamsProperty !== undefined) {
                constructorParamInfo = this.getParamInfoFromStaticProperty(constructorParamsProperty);
            }
            return { classDecorators: classDecorators, memberDecorators: memberDecorators, constructorParamInfo: constructorParamInfo };
        };
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
        Esm2015ReflectionHost.prototype.getClassDecoratorsFromStaticProperty = function (decoratorsSymbol) {
            var _this = this;
            var decoratorsIdentifier = decoratorsSymbol.valueDeclaration;
            if (decoratorsIdentifier && decoratorsIdentifier.parent) {
                if (ts.isBinaryExpression(decoratorsIdentifier.parent) &&
                    decoratorsIdentifier.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                    // AST of the array of decorator values
                    var decoratorsArray = decoratorsIdentifier.parent.right;
                    return this.reflectDecorators(decoratorsArray)
                        .filter(function (decorator) { return _this.isFromCore(decorator); });
                }
            }
            return null;
        };
        /**
         * Examine a symbol which should be of a class, and return metadata about its members.
         *
         * @param symbol the `ClassSymbol` representing the class over which to reflect.
         * @returns an array of `ClassMember` metadata representing the members of the class.
         */
        Esm2015ReflectionHost.prototype.getMembersOfSymbol = function (symbol) {
            var _this = this;
            var members = [];
            // The decorators map contains all the properties that are decorated
            var memberDecorators = this.acquireDecoratorInfo(symbol).memberDecorators;
            // Make a copy of the decorators as successfully reflected members delete themselves from the
            // map, so that any leftovers can be easily dealt with.
            var decoratorsMap = new Map(memberDecorators);
            // The member map contains all the method (instance and static); and any instance properties
            // that are initialized in the class.
            if (symbol.implementation.members) {
                symbol.implementation.members.forEach(function (value, key) {
                    var decorators = decoratorsMap.get(key);
                    var reflectedMembers = _this.reflectMembers(value, decorators);
                    if (reflectedMembers) {
                        decoratorsMap.delete(key);
                        members.push.apply(members, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(reflectedMembers), false));
                    }
                });
            }
            // The static property map contains all the static properties
            if (symbol.implementation.exports) {
                symbol.implementation.exports.forEach(function (value, key) {
                    var decorators = decoratorsMap.get(key);
                    var reflectedMembers = _this.reflectMembers(value, decorators, true);
                    if (reflectedMembers) {
                        decoratorsMap.delete(key);
                        members.push.apply(members, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(reflectedMembers), false));
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
                    symbol.declaration.exports.forEach(function (value, key) {
                        var decorators = decoratorsMap.get(key);
                        var reflectedMembers = _this.reflectMembers(value, decorators, true);
                        if (reflectedMembers) {
                            decoratorsMap.delete(key);
                            members.push.apply(members, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(reflectedMembers), false));
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
                        symbol.adjacent.exports.forEach(function (value, key) {
                            var decorators = decoratorsMap.get(key);
                            var reflectedMembers = _this.reflectMembers(value, decorators, true);
                            if (reflectedMembers) {
                                decoratorsMap.delete(key);
                                members.push.apply(members, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(reflectedMembers), false));
                            }
                        });
                    }
                }
            }
            // Deal with any decorated properties that were not initialized in the class
            decoratorsMap.forEach(function (value, key) {
                members.push({
                    implementation: null,
                    decorators: value,
                    isStatic: false,
                    kind: reflection_1.ClassMemberKind.Property,
                    name: key,
                    nameNode: null,
                    node: null,
                    type: null,
                    value: null
                });
            });
            return members;
        };
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
        Esm2015ReflectionHost.prototype.getMemberDecoratorsFromStaticProperty = function (decoratorsProperty) {
            var _this = this;
            var memberDecorators = new Map();
            // Symbol of the identifier for `SomeDirective.propDecorators`.
            var propDecoratorsMap = getPropertyValueFromSymbol(decoratorsProperty);
            if (propDecoratorsMap && ts.isObjectLiteralExpression(propDecoratorsMap)) {
                var propertiesMap = (0, reflection_1.reflectObjectLiteral)(propDecoratorsMap);
                propertiesMap.forEach(function (value, name) {
                    var decorators = _this.reflectDecorators(value).filter(function (decorator) { return _this.isFromCore(decorator); });
                    if (decorators.length) {
                        memberDecorators.set(name, decorators);
                    }
                });
            }
            return memberDecorators;
        };
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
        Esm2015ReflectionHost.prototype.computeDecoratorInfoFromHelperCalls = function (classSymbol) {
            var e_2, _a, e_3, _b, e_4, _c;
            var _this = this;
            var classDecorators = null;
            var memberDecorators = new Map();
            var constructorParamInfo = [];
            var getConstructorParamInfo = function (index) {
                var param = constructorParamInfo[index];
                if (param === undefined) {
                    param = constructorParamInfo[index] = { decorators: null, typeExpression: null };
                }
                return param;
            };
            // All relevant information can be extracted from calls to `__decorate`, obtain these first.
            // Note that although the helper calls are retrieved using the class symbol, the result may
            // contain helper calls corresponding with unrelated classes. Therefore, each helper call still
            // has to be checked to actually correspond with the class symbol.
            var helperCalls = this.getHelperCallsForClass(classSymbol, ['__decorate']);
            var outerDeclaration = classSymbol.declaration.valueDeclaration;
            var innerDeclaration = classSymbol.implementation.valueDeclaration;
            var adjacentDeclaration = this.getAdjacentNameOfClassSymbol(classSymbol).parent;
            var matchesClass = function (identifier) {
                var decl = _this.getDeclarationOfIdentifier(identifier);
                return decl !== null &&
                    (decl.node === adjacentDeclaration || decl.node === outerDeclaration ||
                        decl.node === innerDeclaration);
            };
            try {
                for (var helperCalls_1 = (0, tslib_1.__values)(helperCalls), helperCalls_1_1 = helperCalls_1.next(); !helperCalls_1_1.done; helperCalls_1_1 = helperCalls_1.next()) {
                    var helperCall = helperCalls_1_1.value;
                    if (isClassDecorateCall(helperCall, matchesClass)) {
                        // This `__decorate` call is targeting the class itself.
                        var helperArgs = helperCall.arguments[0];
                        try {
                            for (var _d = (e_3 = void 0, (0, tslib_1.__values)(helperArgs.elements)), _e = _d.next(); !_e.done; _e = _d.next()) {
                                var element = _e.value;
                                var entry = this.reflectDecorateHelperEntry(element);
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
                                    var param = getConstructorParamInfo(entry.index);
                                    (param.decorators || (param.decorators = [])).push(entry.decorator);
                                }
                                else if (entry.type === 'params') {
                                    // The helper arg represents the types of the parameters. Since it's applied to the
                                    // class, it corresponds with the constructor parameters of the class.
                                    entry.types.forEach(function (type, index) { return getConstructorParamInfo(index).typeExpression = type; });
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                    else if (isMemberDecorateCall(helperCall, matchesClass)) {
                        // The `__decorate` call is targeting a member of the class
                        var helperArgs = helperCall.arguments[0];
                        var memberName = helperCall.arguments[2].text;
                        try {
                            for (var _f = (e_4 = void 0, (0, tslib_1.__values)(helperArgs.elements)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                var element = _g.value;
                                var entry = this.reflectDecorateHelperEntry(element);
                                if (entry === null) {
                                    continue;
                                }
                                if (entry.type === 'decorator') {
                                    // The helper arg was reflected to represent an actual decorator.
                                    if (this.isFromCore(entry.decorator)) {
                                        var decorators = memberDecorators.has(memberName) ? memberDecorators.get(memberName) : [];
                                        decorators.push(entry.decorator);
                                        memberDecorators.set(memberName, decorators);
                                    }
                                }
                                else {
                                    // Information on decorated parameters is not interesting for ngcc, so it's ignored.
                                }
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (helperCalls_1_1 && !helperCalls_1_1.done && (_a = helperCalls_1.return)) _a.call(helperCalls_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return { classDecorators: classDecorators, memberDecorators: memberDecorators, constructorParamInfo: constructorParamInfo };
        };
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
        Esm2015ReflectionHost.prototype.reflectDecorateHelperEntry = function (expression) {
            // We only care about those elements that are actual calls
            if (!ts.isCallExpression(expression)) {
                return null;
            }
            var call = expression;
            var helperName = getCalleeName(call);
            if (helperName === '__metadata') {
                // This is a `tslib.__metadata` call, reflect to arguments into a `ParameterTypes` object
                // if the metadata key is "design:paramtypes".
                var key = call.arguments[0];
                if (key === undefined || !ts.isStringLiteral(key) || key.text !== 'design:paramtypes') {
                    return null;
                }
                var value = call.arguments[1];
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
                var indexArg = call.arguments[0];
                var index = indexArg && ts.isNumericLiteral(indexArg) ? parseInt(indexArg.text, 10) : NaN;
                if (isNaN(index)) {
                    return null;
                }
                var decoratorCall = call.arguments[1];
                if (decoratorCall === undefined || !ts.isCallExpression(decoratorCall)) {
                    return null;
                }
                var decorator_1 = this.reflectDecoratorCall(decoratorCall);
                if (decorator_1 === null) {
                    return null;
                }
                return {
                    type: 'param:decorators',
                    index: index,
                    decorator: decorator_1,
                };
            }
            // Otherwise attempt to reflect it as a regular decorator.
            var decorator = this.reflectDecoratorCall(call);
            if (decorator === null) {
                return null;
            }
            return {
                type: 'decorator',
                decorator: decorator,
            };
        };
        Esm2015ReflectionHost.prototype.reflectDecoratorCall = function (call) {
            var decoratorExpression = call.expression;
            if (!(0, reflection_1.isDecoratorIdentifier)(decoratorExpression)) {
                return null;
            }
            // We found a decorator!
            var decoratorIdentifier = ts.isIdentifier(decoratorExpression) ? decoratorExpression : decoratorExpression.name;
            return {
                name: decoratorIdentifier.text,
                identifier: decoratorExpression,
                import: this.getImportOfIdentifier(decoratorIdentifier),
                node: call,
                args: Array.from(call.arguments),
            };
        };
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
        Esm2015ReflectionHost.prototype.getHelperCall = function (statement, helperNames) {
            if ((ts.isExpressionStatement(statement) || ts.isReturnStatement(statement)) &&
                statement.expression) {
                var expression = statement.expression;
                while (isAssignment(expression)) {
                    expression = expression.right;
                }
                if (ts.isCallExpression(expression)) {
                    var calleeName = getCalleeName(expression);
                    if (calleeName !== null && helperNames.includes(calleeName)) {
                        return expression;
                    }
                }
            }
            return null;
        };
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
        Esm2015ReflectionHost.prototype.reflectDecorators = function (decoratorsArray) {
            var _this = this;
            var decorators = [];
            if (ts.isArrayLiteralExpression(decoratorsArray)) {
                // Add each decorator that is imported from `@angular/core` into the `decorators` array
                decoratorsArray.elements.forEach(function (node) {
                    // If the decorator is not an object literal expression then we are not interested
                    if (ts.isObjectLiteralExpression(node)) {
                        // We are only interested in objects of the form: `{ type: DecoratorType, args: [...] }`
                        var decorator = (0, reflection_1.reflectObjectLiteral)(node);
                        // Is the value of the `type` property an identifier?
                        if (decorator.has('type')) {
                            var decoratorType = decorator.get('type');
                            if ((0, reflection_1.isDecoratorIdentifier)(decoratorType)) {
                                var decoratorIdentifier = ts.isIdentifier(decoratorType) ? decoratorType : decoratorType.name;
                                decorators.push({
                                    name: decoratorIdentifier.text,
                                    identifier: decoratorType,
                                    import: _this.getImportOfIdentifier(decoratorIdentifier),
                                    node: node,
                                    args: getDecoratorArgs(node),
                                });
                            }
                        }
                    }
                });
            }
            return decorators;
        };
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
        Esm2015ReflectionHost.prototype.reflectMembers = function (symbol, decorators, isStatic) {
            if (symbol.flags & ts.SymbolFlags.Accessor) {
                var members = [];
                var setter = symbol.declarations && symbol.declarations.find(ts.isSetAccessor);
                var getter = symbol.declarations && symbol.declarations.find(ts.isGetAccessor);
                var setterMember = setter && this.reflectMember(setter, reflection_1.ClassMemberKind.Setter, decorators, isStatic);
                if (setterMember) {
                    members.push(setterMember);
                    // Prevent attaching the decorators to a potential getter. In ES2015, we can't tell where
                    // the decorators were originally attached to, however we only want to attach them to a
                    // single `ClassMember` as otherwise ngtsc would handle the same decorators twice.
                    decorators = undefined;
                }
                var getterMember = getter && this.reflectMember(getter, reflection_1.ClassMemberKind.Getter, decorators, isStatic);
                if (getterMember) {
                    members.push(getterMember);
                }
                return members;
            }
            var kind = null;
            if (symbol.flags & ts.SymbolFlags.Method) {
                kind = reflection_1.ClassMemberKind.Method;
            }
            else if (symbol.flags & ts.SymbolFlags.Property) {
                kind = reflection_1.ClassMemberKind.Property;
            }
            var node = symbol.valueDeclaration || symbol.declarations && symbol.declarations[0];
            if (!node) {
                // If the symbol has been imported from a TypeScript typings file then the compiler
                // may pass the `prototype` symbol as an export of the class.
                // But this has no declaration. In this case we just quietly ignore it.
                return null;
            }
            var member = this.reflectMember(node, kind, decorators, isStatic);
            if (!member) {
                return null;
            }
            return [member];
        };
        /**
         * Reflect over a symbol and extract the member information, combining it with the
         * provided decorator information, and whether it is a static member.
         * @param node the declaration node for the member to reflect over.
         * @param kind the assumed kind of the member, may become more accurate during reflection.
         * @param decorators an array of decorators associated with the member.
         * @param isStatic true if this member is static, false if it is an instance property.
         * @returns the reflected member information, or null if the symbol is not a member.
         */
        Esm2015ReflectionHost.prototype.reflectMember = function (node, kind, decorators, isStatic) {
            var value = null;
            var name = null;
            var nameNode = null;
            if (!isClassMemberType(node)) {
                return null;
            }
            if (isStatic && isPropertyAccess(node)) {
                name = node.name.text;
                value = kind === reflection_1.ClassMemberKind.Property ? node.parent.right : null;
            }
            else if (isThisAssignment(node)) {
                kind = reflection_1.ClassMemberKind.Property;
                name = node.left.name.text;
                value = node.right;
                isStatic = false;
            }
            else if (ts.isConstructorDeclaration(node)) {
                kind = reflection_1.ClassMemberKind.Constructor;
                name = 'constructor';
                isStatic = false;
            }
            if (kind === null) {
                this.logger.warn("Unknown member type: \"" + node.getText());
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
                    node.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.StaticKeyword; });
            }
            var type = node.type || null;
            return {
                node: node,
                implementation: node,
                kind: kind,
                type: type,
                name: name,
                nameNode: nameNode,
                value: value,
                isStatic: isStatic,
                decorators: decorators || []
            };
        };
        /**
         * Find the declarations of the constructor parameters of a class identified by its symbol.
         * @param classSymbol the class whose parameters we want to find.
         * @returns an array of `ts.ParameterDeclaration` objects representing each of the parameters in
         * the class's constructor or null if there is no constructor.
         */
        Esm2015ReflectionHost.prototype.getConstructorParameterDeclarations = function (classSymbol) {
            var members = classSymbol.implementation.members;
            if (members && members.has(exports.CONSTRUCTOR)) {
                var constructorSymbol = members.get(exports.CONSTRUCTOR);
                // For some reason the constructor does not have a `valueDeclaration` ?!?
                var constructor = constructorSymbol.declarations &&
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
        };
        /**
         * Get the parameter decorators of a class constructor.
         *
         * @param classSymbol the class whose parameter info we want to get.
         * @param parameterNodes the array of TypeScript parameter nodes for this class's constructor.
         * @returns an array of constructor parameter info objects.
         */
        Esm2015ReflectionHost.prototype.getConstructorParamInfo = function (classSymbol, parameterNodes) {
            var _this = this;
            var constructorParamInfo = this.acquireDecoratorInfo(classSymbol).constructorParamInfo;
            return parameterNodes.map(function (node, index) {
                var _a = constructorParamInfo[index] ?
                    constructorParamInfo[index] :
                    { decorators: null, typeExpression: null }, decorators = _a.decorators, typeExpression = _a.typeExpression;
                var nameNode = node.name;
                var typeValueReference = _this.typeToValue(typeExpression);
                return {
                    name: (0, utils_1.getNameText)(nameNode),
                    nameNode: nameNode,
                    typeValueReference: typeValueReference,
                    typeNode: null,
                    decorators: decorators
                };
            });
        };
        /**
         * Compute the `TypeValueReference` for the given `typeExpression`.
         *
         * Although `typeExpression` is a valid `ts.Expression` that could be emitted directly into the
         * generated code, ngcc still needs to resolve the declaration and create an `IMPORTED` type
         * value reference as the compiler has specialized handling for some symbols, for example
         * `ChangeDetectorRef` from `@angular/core`. Such an `IMPORTED` type value reference will result
         * in a newly generated namespace import, instead of emitting the original `typeExpression` as is.
         */
        Esm2015ReflectionHost.prototype.typeToValue = function (typeExpression) {
            if (typeExpression === null) {
                return {
                    kind: 2 /* UNAVAILABLE */,
                    reason: { kind: 0 /* MISSING_TYPE */ },
                };
            }
            var imp = this.getImportOfExpression(typeExpression);
            var decl = this.getDeclarationOfExpression(typeExpression);
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
        };
        /**
         * Determines where the `expression` is imported from.
         *
         * @param expression the expression to determine the import details for.
         * @returns the `Import` for the expression, or `null` if the expression is not imported or the
         * expression syntax is not supported.
         */
        Esm2015ReflectionHost.prototype.getImportOfExpression = function (expression) {
            if (ts.isIdentifier(expression)) {
                return this.getImportOfIdentifier(expression);
            }
            else if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.name)) {
                return this.getImportOfIdentifier(expression.name);
            }
            else {
                return null;
            }
        };
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
        Esm2015ReflectionHost.prototype.getParamInfoFromStaticProperty = function (paramDecoratorsProperty) {
            var _this = this;
            var paramDecorators = getPropertyValueFromSymbol(paramDecoratorsProperty);
            if (paramDecorators) {
                // The decorators array may be wrapped in an arrow function. If so unwrap it.
                var container = ts.isArrowFunction(paramDecorators) ? paramDecorators.body : paramDecorators;
                if (ts.isArrayLiteralExpression(container)) {
                    var elements = container.elements;
                    return elements
                        .map(function (element) {
                        return ts.isObjectLiteralExpression(element) ? (0, reflection_1.reflectObjectLiteral)(element) : null;
                    })
                        .map(function (paramInfo) {
                        var typeExpression = paramInfo && paramInfo.has('type') ? paramInfo.get('type') : null;
                        var decoratorInfo = paramInfo && paramInfo.has('decorators') ? paramInfo.get('decorators') : null;
                        var decorators = decoratorInfo &&
                            _this.reflectDecorators(decoratorInfo)
                                .filter(function (decorator) { return _this.isFromCore(decorator); });
                        return { typeExpression: typeExpression, decorators: decorators };
                    });
                }
                else if (paramDecorators !== undefined) {
                    this.logger.warn('Invalid constructor parameter decorator in ' +
                        paramDecorators.getSourceFile().fileName + ':\n', paramDecorators.getText());
                }
            }
            return null;
        };
        /**
         * Search statements related to the given class for calls to the specified helper.
         * @param classSymbol the class whose helper calls we are interested in.
         * @param helperNames the names of the helpers (e.g. `__decorate`) whose calls we are interested
         * in.
         * @returns an array of CallExpression nodes for each matching helper call.
         */
        Esm2015ReflectionHost.prototype.getHelperCallsForClass = function (classSymbol, helperNames) {
            var _this = this;
            return this.getStatementsForClass(classSymbol)
                .map(function (statement) { return _this.getHelperCall(statement, helperNames); })
                .filter(utils_1.isDefined);
        };
        /**
         * Find statements related to the given class that may contain calls to a helper.
         *
         * In ESM2015 code the helper calls are in the top level module, so we have to consider
         * all the statements in the module.
         *
         * @param classSymbol the class whose helper calls we are interested in.
         * @returns an array of statements that may contain helper calls.
         */
        Esm2015ReflectionHost.prototype.getStatementsForClass = function (classSymbol) {
            var classNode = classSymbol.implementation.valueDeclaration;
            if (isTopLevel(classNode)) {
                return this.getModuleStatements(classNode.getSourceFile());
            }
            var statement = getContainingStatement(classNode);
            if (ts.isBlock(statement.parent)) {
                return Array.from(statement.parent.statements);
            }
            // We should never arrive here
            throw new Error("Unable to find adjacent statements for " + classSymbol.name);
        };
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
        Esm2015ReflectionHost.prototype.isFromCore = function (decorator) {
            if (this.isCore) {
                return !decorator.import || /^\./.test(decorator.import.from);
            }
            else {
                return !!decorator.import && decorator.import.from === '@angular/core';
            }
        };
        /**
         * Create a mapping between the public exports in a src program and the public exports of a dts
         * program.
         *
         * @param src the program bundle containing the source files.
         * @param dts the program bundle containing the typings files.
         * @returns a map of source declarations to typings declarations.
         */
        Esm2015ReflectionHost.prototype.computePublicDtsDeclarationMap = function (src, dts) {
            var declarationMap = new Map();
            var dtsDeclarationMap = new Map();
            var rootDts = getRootFileOrFail(dts);
            this.collectDtsExportedDeclarations(dtsDeclarationMap, rootDts, dts.program.getTypeChecker());
            var rootSrc = getRootFileOrFail(src);
            this.collectSrcExportedDeclarations(declarationMap, dtsDeclarationMap, rootSrc);
            return declarationMap;
        };
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
        Esm2015ReflectionHost.prototype.computePrivateDtsDeclarationMap = function (src, dts) {
            var e_5, _a, e_6, _b;
            var declarationMap = new Map();
            var dtsDeclarationMap = new Map();
            var typeChecker = dts.program.getTypeChecker();
            var dtsFiles = getNonRootPackageFiles(dts);
            try {
                for (var dtsFiles_1 = (0, tslib_1.__values)(dtsFiles), dtsFiles_1_1 = dtsFiles_1.next(); !dtsFiles_1_1.done; dtsFiles_1_1 = dtsFiles_1.next()) {
                    var dtsFile = dtsFiles_1_1.value;
                    this.collectDtsExportedDeclarations(dtsDeclarationMap, dtsFile, typeChecker);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (dtsFiles_1_1 && !dtsFiles_1_1.done && (_a = dtsFiles_1.return)) _a.call(dtsFiles_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
            var srcFiles = getNonRootPackageFiles(src);
            try {
                for (var srcFiles_1 = (0, tslib_1.__values)(srcFiles), srcFiles_1_1 = srcFiles_1.next(); !srcFiles_1_1.done; srcFiles_1_1 = srcFiles_1.next()) {
                    var srcFile = srcFiles_1_1.value;
                    this.collectSrcExportedDeclarations(declarationMap, dtsDeclarationMap, srcFile);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (srcFiles_1_1 && !srcFiles_1_1.done && (_b = srcFiles_1.return)) _b.call(srcFiles_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
            return declarationMap;
        };
        /**
         * Collect mappings between names of exported declarations in a file and its actual declaration.
         *
         * Any new mappings are added to the `dtsDeclarationMap`.
         */
        Esm2015ReflectionHost.prototype.collectDtsExportedDeclarations = function (dtsDeclarationMap, srcFile, checker) {
            var srcModule = srcFile && checker.getSymbolAtLocation(srcFile);
            var moduleExports = srcModule && checker.getExportsOfModule(srcModule);
            if (moduleExports) {
                moduleExports.forEach(function (exportedSymbol) {
                    var name = exportedSymbol.name;
                    if (exportedSymbol.flags & ts.SymbolFlags.Alias) {
                        exportedSymbol = checker.getAliasedSymbol(exportedSymbol);
                    }
                    var declaration = exportedSymbol.valueDeclaration;
                    if (declaration && !dtsDeclarationMap.has(name)) {
                        dtsDeclarationMap.set(name, declaration);
                    }
                });
            }
        };
        Esm2015ReflectionHost.prototype.collectSrcExportedDeclarations = function (declarationMap, dtsDeclarationMap, srcFile) {
            var e_7, _a;
            var fileExports = this.getExportsOfModule(srcFile);
            if (fileExports !== null) {
                try {
                    for (var fileExports_1 = (0, tslib_1.__values)(fileExports), fileExports_1_1 = fileExports_1.next(); !fileExports_1_1.done; fileExports_1_1 = fileExports_1.next()) {
                        var _b = (0, tslib_1.__read)(fileExports_1_1.value, 2), exportName = _b[0], declarationNode = _b[1].node;
                        if (dtsDeclarationMap.has(exportName)) {
                            declarationMap.set(declarationNode, dtsDeclarationMap.get(exportName));
                        }
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (fileExports_1_1 && !fileExports_1_1.done && (_a = fileExports_1.return)) _a.call(fileExports_1);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
            }
        };
        Esm2015ReflectionHost.prototype.getDeclarationOfExpression = function (expression) {
            if (ts.isIdentifier(expression)) {
                return this.getDeclarationOfIdentifier(expression);
            }
            if (!ts.isPropertyAccessExpression(expression) || !ts.isIdentifier(expression.expression)) {
                return null;
            }
            var namespaceDecl = this.getDeclarationOfIdentifier(expression.expression);
            if (!namespaceDecl || !ts.isSourceFile(namespaceDecl.node)) {
                return null;
            }
            var namespaceExports = this.getExportsOfModule(namespaceDecl.node);
            if (namespaceExports === null) {
                return null;
            }
            if (!namespaceExports.has(expression.name.text)) {
                return null;
            }
            var exportDecl = namespaceExports.get(expression.name.text);
            return (0, tslib_1.__assign)((0, tslib_1.__assign)({}, exportDecl), { viaModule: namespaceDecl.viaModule });
        };
        /** Checks if the specified declaration resolves to the known JavaScript global `Object`. */
        Esm2015ReflectionHost.prototype.isJavaScriptObjectDeclaration = function (decl) {
            var node = decl.node;
            // The default TypeScript library types the global `Object` variable through
            // a variable declaration with a type reference resolving to `ObjectConstructor`.
            if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) ||
                node.name.text !== 'Object' || node.type === undefined) {
                return false;
            }
            var typeNode = node.type;
            // If the variable declaration does not have a type resolving to `ObjectConstructor`,
            // we cannot guarantee that the declaration resolves to the global `Object` variable.
            if (!ts.isTypeReferenceNode(typeNode) || !ts.isIdentifier(typeNode.typeName) ||
                typeNode.typeName.text !== 'ObjectConstructor') {
                return false;
            }
            // Finally, check if the type definition for `Object` originates from a default library
            // definition file. This requires default types to be enabled for the host program.
            return this.src.program.isSourceFileDefaultLibrary(node.getSourceFile());
        };
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
        Esm2015ReflectionHost.prototype.resolveEnumMembers = function (declaration) {
            // Initialized variables don't represent enum declarations.
            if (declaration.initializer !== undefined)
                return null;
            var variableStmt = declaration.parent.parent;
            if (!ts.isVariableStatement(variableStmt))
                return null;
            var block = variableStmt.parent;
            if (!ts.isBlock(block) && !ts.isSourceFile(block))
                return null;
            var declarationIndex = block.statements.findIndex(function (statement) { return statement === variableStmt; });
            if (declarationIndex === -1 || declarationIndex === block.statements.length - 1)
                return null;
            var subsequentStmt = block.statements[declarationIndex + 1];
            if (!ts.isExpressionStatement(subsequentStmt))
                return null;
            var iife = (0, utils_2.stripParentheses)(subsequentStmt.expression);
            if (!ts.isCallExpression(iife) || !isEnumDeclarationIife(iife))
                return null;
            var fn = (0, utils_2.stripParentheses)(iife.expression);
            if (!ts.isFunctionExpression(fn))
                return null;
            return this.reflectEnumMembers(fn);
        };
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
        Esm2015ReflectionHost.prototype.reflectEnumMembers = function (fn) {
            var e_8, _a;
            if (fn.parameters.length !== 1)
                return null;
            var enumName = fn.parameters[0].name;
            if (!ts.isIdentifier(enumName))
                return null;
            var enumMembers = [];
            try {
                for (var _b = (0, tslib_1.__values)(fn.body.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var statement = _c.value;
                    var enumMember = this.reflectEnumMember(enumName, statement);
                    if (enumMember === null) {
                        return null;
                    }
                    enumMembers.push(enumMember);
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_8) throw e_8.error; }
            }
            return enumMembers;
        };
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
        Esm2015ReflectionHost.prototype.reflectEnumMember = function (enumName, statement) {
            if (!ts.isExpressionStatement(statement))
                return null;
            var expression = statement.expression;
            // Check for the `Enum[X] = Y;` case.
            if (!isEnumAssignment(enumName, expression)) {
                return null;
            }
            var assignment = reflectEnumAssignment(expression);
            if (assignment != null) {
                return assignment;
            }
            // Check for the `Enum[Enum[X] = Y] = ...;` case.
            var innerExpression = expression.left.argumentExpression;
            if (!isEnumAssignment(enumName, innerExpression)) {
                return null;
            }
            return reflectEnumAssignment(innerExpression);
        };
        Esm2015ReflectionHost.prototype.getAdjacentNameOfClassSymbol = function (classSymbol) {
            if (classSymbol.adjacent !== undefined) {
                return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.adjacent.valueDeclaration);
            }
            else {
                return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.implementation.valueDeclaration);
            }
        };
        return Esm2015ReflectionHost;
    }(reflection_1.TypeScriptReflectionHost));
    exports.Esm2015ReflectionHost = Esm2015ReflectionHost;
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
        var arg = iife.arguments[0];
        if (!ts.isBinaryExpression(arg) || arg.operatorToken.kind !== ts.SyntaxKind.BarBarToken ||
            !ts.isParenthesizedExpression(arg.right)) {
            return false;
        }
        var right = arg.right.expression;
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
        var enumIdentifier = expression.left.expression;
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
        var memberName = expression.left.argumentExpression;
        if (!ts.isPropertyName(memberName))
            return null;
        return { name: memberName, initializer: expression.right };
    }
    /**
     * Test whether a statement node is an assignment statement.
     * @param statement the statement to test.
     */
    function isAssignmentStatement(statement) {
        return ts.isExpressionStatement(statement) && isAssignment(statement.expression) &&
            ts.isIdentifier(statement.expression.left);
    }
    exports.isAssignmentStatement = isAssignmentStatement;
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
    function getIifeBody(expression) {
        var call = (0, utils_2.stripParentheses)(expression);
        if (!ts.isCallExpression(call)) {
            return undefined;
        }
        var fn = (0, utils_2.stripParentheses)(call.expression);
        if (!ts.isFunctionExpression(fn) && !ts.isArrowFunction(fn)) {
            return undefined;
        }
        return fn.body;
    }
    exports.getIifeBody = getIifeBody;
    /**
     * Returns true if the `node` is an assignment of the form `a = b`.
     *
     * @param node The AST node to check.
     */
    function isAssignment(node) {
        return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken;
    }
    exports.isAssignment = isAssignment;
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
    function isClassDecorateCall(call, matches) {
        var helperArgs = call.arguments[0];
        if (helperArgs === undefined || !ts.isArrayLiteralExpression(helperArgs)) {
            return false;
        }
        var target = call.arguments[1];
        return target !== undefined && ts.isIdentifier(target) && matches(target);
    }
    exports.isClassDecorateCall = isClassDecorateCall;
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
    function isMemberDecorateCall(call, matches) {
        var helperArgs = call.arguments[0];
        if (helperArgs === undefined || !ts.isArrayLiteralExpression(helperArgs)) {
            return false;
        }
        var target = call.arguments[1];
        if (target === undefined || !ts.isPropertyAccessExpression(target) ||
            !ts.isIdentifier(target.expression) || !matches(target.expression) ||
            target.name.text !== 'prototype') {
            return false;
        }
        var memberName = call.arguments[2];
        return memberName !== undefined && ts.isStringLiteral(memberName);
    }
    exports.isMemberDecorateCall = isMemberDecorateCall;
    /**
     * Helper method to extract the value of a property given the property's "symbol",
     * which is actually the symbol of the identifier of the property.
     */
    function getPropertyValueFromSymbol(propSymbol) {
        var propIdentifier = propSymbol.valueDeclaration;
        var parent = propIdentifier && propIdentifier.parent;
        return parent && ts.isBinaryExpression(parent) ? parent.right : undefined;
    }
    exports.getPropertyValueFromSymbol = getPropertyValueFromSymbol;
    /**
     * A callee could be one of: `__decorate(...)` or `tslib_1.__decorate`.
     */
    function getCalleeName(call) {
        if (ts.isIdentifier(call.expression)) {
            return (0, utils_1.stripDollarSuffix)(call.expression.text);
        }
        if (ts.isPropertyAccessExpression(call.expression)) {
            return (0, utils_1.stripDollarSuffix)(call.expression.name.text);
        }
        return null;
    }
    function isInitializedVariableClassDeclaration(node) {
        return (0, reflection_1.isNamedVariableDeclaration)(node) && node.initializer !== undefined;
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
    function skipClassAliases(node) {
        var expression = node.initializer;
        while (isAssignment(expression)) {
            expression = expression.right;
        }
        return expression;
    }
    exports.skipClassAliases = skipClassAliases;
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
    function getInnerClassDeclaration(expression) {
        var e_9, _a, e_10, _b;
        if (ts.isClassExpression(expression) && (0, utils_1.hasNameIdentifier)(expression)) {
            return expression;
        }
        var iifeBody = getIifeBody(expression);
        if (iifeBody === undefined) {
            return null;
        }
        if (!ts.isBlock(iifeBody)) {
            // Handle the fat arrow expression case: `() => ClassExpression`
            return ts.isClassExpression(iifeBody) && isNamedDeclaration(iifeBody) ? iifeBody : null;
        }
        else {
            try {
                // Handle the case of a normal or fat-arrow function with a body.
                // Return the first ClassDeclaration/VariableDeclaration inside the body
                for (var _c = (0, tslib_1.__values)(iifeBody.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var statement = _d.value;
                    if ((0, reflection_1.isNamedClassDeclaration)(statement) || (0, reflection_1.isNamedFunctionDeclaration)(statement)) {
                        return statement;
                    }
                    if (ts.isVariableStatement(statement)) {
                        try {
                            for (var _e = (e_10 = void 0, (0, tslib_1.__values)(statement.declarationList.declarations)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var declaration = _f.value;
                                if (isInitializedVariableClassDeclaration(declaration)) {
                                    var expression_1 = skipClassAliases(declaration);
                                    if (ts.isClassExpression(expression_1) && (0, utils_1.hasNameIdentifier)(expression_1)) {
                                        return expression_1;
                                    }
                                }
                            }
                        }
                        catch (e_10_1) { e_10 = { error: e_10_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_10) throw e_10.error; }
                        }
                    }
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_9) throw e_9.error; }
            }
        }
        return null;
    }
    exports.getInnerClassDeclaration = getInnerClassDeclaration;
    function getDecoratorArgs(node) {
        // The arguments of a decorator are held in the `args` property of its declaration object.
        var argsProperty = node.properties.filter(ts.isPropertyAssignment)
            .find(function (property) { return (0, utils_1.getNameText)(property.name) === 'args'; });
        var argsExpression = argsProperty && argsProperty.initializer;
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
        var anyNode = node;
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
        var node = declaration.parent;
        // Detect an intermediary variable assignment and skip over it.
        if (isAssignment(node) && ts.isIdentifier(node.left)) {
            node = node.parent;
        }
        return ts.isVariableDeclaration(node) ? node : undefined;
    }
    function getContainingVariableDeclaration(node) {
        node = node.parent;
        while (node !== undefined) {
            if ((0, reflection_1.isNamedVariableDeclaration)(node)) {
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
        var firstStatement = constructor.body.statements[0];
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
        var argument = expression.arguments[0];
        return ts.isSpreadElement(argument) && ts.isIdentifier(argument.expression) &&
            argument.expression.text === 'arguments';
    }
    /**
     * Find the statement that contains the given node
     * @param node a node whose containing statement we wish to find
     */
    function getContainingStatement(node) {
        while (node.parent) {
            if (ts.isBlock(node.parent) || ts.isSourceFile(node.parent)) {
                break;
            }
            node = node.parent;
        }
        return node;
    }
    exports.getContainingStatement = getContainingStatement;
    function getRootFileOrFail(bundle) {
        var rootFile = bundle.program.getSourceFile(bundle.path);
        if (rootFile === undefined) {
            throw new Error("The given rootPath " + rootFile + " is not a file of the program.");
        }
        return rootFile;
    }
    function getNonRootPackageFiles(bundle) {
        var rootFile = bundle.program.getSourceFile(bundle.path);
        return bundle.program.getSourceFiles().filter(function (f) { return (f !== rootFile) && (0, util_1.isWithinPackage)(bundle.package, (0, file_system_1.absoluteFromSourceFile)(f)); });
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
    function getOuterNodeFromInnerDeclaration(node) {
        if (!ts.isFunctionDeclaration(node) && !ts.isClassDeclaration(node) &&
            !ts.isVariableStatement(node)) {
            return null;
        }
        // It might be the function expression inside the IIFE. We need to go 5 levels up...
        // - IIFE body.
        var outerNode = node.parent;
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
    exports.getOuterNodeFromInnerDeclaration = getOuterNodeFromInnerDeclaration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsMkVBQXNFO0lBRXRFLHlFQUFvYztJQUNwYyxrRkFBZ0g7SUFDaEgscUVBQWlEO0lBRWpELDhEQUErRjtJQUUvRiwyRUFBNEo7SUFDNUosbUVBQXlDO0lBRTVCLFFBQUEsVUFBVSxHQUFHLFlBQTJCLENBQUM7SUFDekMsUUFBQSxlQUFlLEdBQUcsZ0JBQStCLENBQUM7SUFDbEQsUUFBQSxXQUFXLEdBQUcsZUFBOEIsQ0FBQztJQUM3QyxRQUFBLGtCQUFrQixHQUFHLGdCQUErQixDQUFDO0lBRWxFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTBCRztJQUNIO1FBQTJDLHNEQUF3QjtRQWdEakUsK0JBQ2MsTUFBYyxFQUFZLE1BQWUsRUFBWSxHQUFrQixFQUN2RSxHQUE4QjtZQUE5QixvQkFBQSxFQUFBLFVBQThCO1lBRjVDLFlBR0Usa0JBQU0sR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxTQUNwQztZQUhhLFlBQU0sR0FBTixNQUFNLENBQVE7WUFBWSxZQUFNLEdBQU4sTUFBTSxDQUFTO1lBQVksU0FBRyxHQUFILEdBQUcsQ0FBZTtZQUN2RSxTQUFHLEdBQUgsR0FBRyxDQUEyQjtZQWpENUM7Ozs7OztlQU1HO1lBQ08sNkJBQXVCLEdBQThDLElBQUksQ0FBQztZQUNwRjs7Ozs7O2VBTUc7WUFDTyw4QkFBd0IsR0FBOEMsSUFBSSxDQUFDO1lBRXJGOztlQUVHO1lBQ08sNkJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQWlCLENBQUM7WUFFN0Q7Ozs7Ozs7Ozs7Ozs7O2VBY0c7WUFDTyw4QkFBd0IsR0FBRyxJ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UyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUU7WUFDekYsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1FBRTdCLDZCQUE2QjtRQUM3QixJQUFJLFNBQVMsSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDO1lBQUUsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7UUFFdkYsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDL0QsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7UUFFN0IsNkJBQTZCO1FBQzdCLElBQUksU0FBUyxJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUM7WUFBRSxTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUV2RixxRkFBcUY7UUFDckYsT0FBTyxZQUFZLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3JDLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1NBQzlCO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQW5DRCw0RUFtQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvbG9nZ2luZyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIEN0b3JQYXJhbWV0ZXIsIERlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbk5vZGUsIERlY29yYXRvciwgRW51bU1lbWJlciwgSW1wb3J0LCBpc0NvbmNyZXRlRGVjbGFyYXRpb24sIGlzRGVjb3JhdG9ySWRlbnRpZmllciwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uLCBpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbiwgS25vd25EZWNsYXJhdGlvbiwgcmVmbGVjdE9iamVjdExpdGVyYWwsIFNwZWNpYWxEZWNsYXJhdGlvbktpbmQsIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCwgVHlwZVZhbHVlUmVmZXJlbmNlLCBUeXBlVmFsdWVSZWZlcmVuY2VLaW5kLCBWYWx1ZVVuYXZhaWxhYmxlS2luZH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpc1N5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9uLCBTeW1ib2xXaXRoVmFsdWVEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4uL2FuYWx5c2lzL3V0aWwnO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtfSBmcm9tICcuLi9wYWNrYWdlcy9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge2ZpbmRBbGwsIGdldE5hbWVUZXh0LCBoYXNOYW1lSWRlbnRpZmllciwgaXNEZWZpbmVkLCBzdHJpcERvbGxhclN1ZmZpeH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0NsYXNzU3ltYm9sLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uLCBOZ2NjQ2xhc3NTeW1ib2wsIE5nY2NSZWZsZWN0aW9uSG9zdCwgUFJFX1IzX01BUktFUiwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4vbmdjY19ob3N0JztcbmltcG9ydCB7c3RyaXBQYXJlbnRoZXNlc30gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjb25zdCBERUNPUkFUT1JTID0gJ2RlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IFBST1BfREVDT1JBVE9SUyA9ICdwcm9wRGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1IgPSAnX19jb25zdHJ1Y3RvcicgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1JfUEFSQU1TID0gJ2N0b3JQYXJhbWV0ZXJzJyBhcyB0cy5fX1N0cmluZztcblxuLyoqXG4gKiBFc20yMDE1IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCAyMDE1IGNsYXNzZXMsIGV0Yy5cbiAqIERlY29yYXRvcnMgYXJlIGRlZmluZWQgdmlhIHN0YXRpYyBwcm9wZXJ0aWVzIG9uIHRoZSBjbGFzcy4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBjbGFzcyBTb21lRGlyZWN0aXZlIHtcbiAqIH1cbiAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gKiBdO1xuICogU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9ycyA9IHtcbiAqICAgXCJpbnB1dDFcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogICBcImlucHV0MlwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiB9O1xuICogYGBgXG4gKlxuICogKiBDbGFzc2VzIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICAvKipcbiAgICogQSBtYXBwaW5nIGZyb20gc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucywgd2hpY2ggYXJlIGJvdGggcHVibGljbHkgZXhwb3J0ZWQuXG4gICAqXG4gICAqIFRoZXJlIHNob3VsZCBiZSBvbmUgZW50cnkgZm9yIGV2ZXJ5IHB1YmxpYyBleHBvcnQgdmlzaWJsZSBmcm9tIHRoZSByb290IGZpbGUgb2YgdGhlIHNvdXJjZVxuICAgKiB0cmVlLiBOb3RlIHRoYXQgYnkgZGVmaW5pdGlvbiB0aGUga2V5IGFuZCB2YWx1ZSBkZWNsYXJhdGlvbnMgd2lsbCBub3QgYmUgaW4gdGhlIHNhbWUgVFNcbiAgICogcHJvZ3JhbS5cbiAgICovXG4gIHByb3RlY3RlZCBwdWJsaWNEdHNEZWNsYXJhdGlvbk1hcDogTWFwPERlY2xhcmF0aW9uTm9kZSwgdHMuRGVjbGFyYXRpb24+fG51bGwgPSBudWxsO1xuICAvKipcbiAgICogQSBtYXBwaW5nIGZyb20gc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucywgd2hpY2ggYXJlIG5vdCBwdWJsaWNseSBleHBvcnRlZC5cbiAgICpcbiAgICogVGhpcyBtYXBwaW5nIGlzIGEgYmVzdCBndWVzcyBiZXR3ZWVuIGRlY2xhcmF0aW9ucyB0aGF0IGhhcHBlbiB0byBiZSBleHBvcnRlZCBmcm9tIHRoZWlyIGZpbGUgYnlcbiAgICogdGhlIHNhbWUgbmFtZSBpbiBib3RoIHRoZSBzb3VyY2UgYW5kIHRoZSBkdHMgZmlsZS4gTm90ZSB0aGF0IGJ5IGRlZmluaXRpb24gdGhlIGtleSBhbmQgdmFsdWVcbiAgICogZGVjbGFyYXRpb25zIHdpbGwgbm90IGJlIGluIHRoZSBzYW1lIFRTIHByb2dyYW0uXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwOiBNYXA8RGVjbGFyYXRpb25Ob2RlLCB0cy5EZWNsYXJhdGlvbj58bnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBzZXQgb2Ygc291cmNlIGZpbGVzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gcHJlcHJvY2Vzc2VkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHByZXByb2Nlc3NlZFNvdXJjZUZpbGVzID0gbmV3IFNldDx0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGNsYXNzIGRlY2xhcmF0aW9ucyBtYXkgaGF2ZSBiZWVuIGRvd24tbGV2ZWxlZCBpbnRvIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyxcbiAgICogaW5pdGlhbGl6ZWQgdXNpbmcgYSBjbGFzcyBleHByZXNzaW9uLiBJbiBjZXJ0YWluIHNjZW5hcmlvcywgYW4gYWRkaXRpb25hbCB2YXJpYWJsZVxuICAgKiBpcyBpbnRyb2R1Y2VkIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3Mgc28gdGhhdCByZXN1bHRzIGluIGNvZGUgc3VjaCBhczpcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBNeUNsYXNzXzE7IGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoaXMgbWFwIHRyYWNrcyB0aG9zZSBhbGlhc2VkIHZhcmlhYmxlcyB0byB0aGVpciBvcmlnaW5hbCBpZGVudGlmaWVyLCBpLmUuIHRoZSBrZXlcbiAgICogY29ycmVzcG9uZHMgd2l0aCB0aGUgZGVjbGFyYXRpb24gb2YgYE15Q2xhc3NfMWAgYW5kIGl0cyB2YWx1ZSBiZWNvbWVzIHRoZSBgTXlDbGFzc2AgaWRlbnRpZmllclxuICAgKiBvZiB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWFwIGlzIHBvcHVsYXRlZCBkdXJpbmcgdGhlIHByZXByb2Nlc3Npbmcgb2YgZWFjaCBzb3VyY2UgZmlsZS5cbiAgICovXG4gIHByb3RlY3RlZCBhbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogQ2FjaGVzIHRoZSBpbmZvcm1hdGlvbiBvZiB0aGUgZGVjb3JhdG9ycyBvbiBhIGNsYXNzLCBhcyB0aGUgd29yayBpbnZvbHZlZCB3aXRoIGV4dHJhY3RpbmdcbiAgICogZGVjb3JhdG9ycyBpcyBjb21wbGV4IGFuZCBmcmVxdWVudGx5IHVzZWQuXG4gICAqXG4gICAqIFRoaXMgbWFwIGlzIGxhemlseSBwb3B1bGF0ZWQgZHVyaW5nIHRoZSBmaXJzdCBjYWxsIHRvIGBhY3F1aXJlRGVjb3JhdG9ySW5mb2AgZm9yIGEgZ2l2ZW4gY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZGVjb3JhdG9yQ2FjaGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvckluZm8+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgbG9nZ2VyOiBMb2dnZXIsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sIHByb3RlY3RlZCBzcmM6IEJ1bmRsZVByb2dyYW0sXG4gICAgICBwcm90ZWN0ZWQgZHRzOiBCdW5kbGVQcm9ncmFtfG51bGwgPSBudWxsKSB7XG4gICAgc3VwZXIoc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhIHN5bWJvbCBmb3IgYSBub2RlIHRoYXQgd2UgdGhpbmsgaXMgYSBjbGFzcy5cbiAgICogQ2xhc3NlcyBzaG91bGQgaGF2ZSBhIGBuYW1lYCBpZGVudGlmaWVyLCBiZWNhdXNlIHRoZXkgbWF5IG5lZWQgdG8gYmUgcmVmZXJlbmNlZCBpbiBvdGhlciBwYXJ0c1xuICAgKiBvZiB0aGUgcHJvZ3JhbS5cbiAgICpcbiAgICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlczpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIG9yXG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9ICgoKSA9PiB7IGNsYXNzIE15Q2xhc3Mge30gLi4uIHJldHVybiBNeUNsYXNzOyB9KSgpXG4gICAqIGBgYFxuICAgKlxuICAgKiBIZXJlLCB0aGUgaW50ZXJtZWRpYXRlIGBNeUNsYXNzXzFgIGFzc2lnbm1lbnQgaXMgb3B0aW9uYWwuIEluIHRoZSBhYm92ZSBleGFtcGxlLCB0aGVcbiAgICogYGNsYXNzIE15Q2xhc3Mge31gIG5vZGUgaXMgcmV0dXJuZWQgYXMgZGVjbGFyYXRpb24gb2YgYE15Q2xhc3NgLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIG5vZGUgd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIgb3IgaGFzIG5vIHN5bWJvbC5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbEZyb21PdXRlckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBzeW1ib2w7XG4gICAgfVxuICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSB0aGlzLmdldElubmVyRGVjbGFyYXRpb25Gcm9tQWxpYXNPcklubmVyKGRlY2xhcmF0aW9uKTtcbiAgICByZXR1cm4gdGhpcy5nZXRDbGFzc1N5bWJvbEZyb21Jbm5lckRlY2xhcmF0aW9uKGlubmVyRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4YW1pbmUgYSBkZWNsYXJhdGlvbiAoZm9yIGV4YW1wbGUsIG9mIGEgY2xhc3Mgb3IgZnVuY3Rpb24pIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgYW55XG4gICAqIGRlY29yYXRvcnMgcHJlc2VudCBvbiB0aGUgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBhIFR5cGVTY3JpcHQgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG9yIGZ1bmN0aW9uIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICogICAgIEZvciBleGFtcGxlLCBpZiB0aGUgaW50ZW50IGlzIHRvIHJlZmxlY3QgdGhlIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBhbmQgdGhlIHNvdXJjZSBpcyBpbiBFUzZcbiAgICogICAgIGZvcm1hdCwgdGhpcyB3aWxsIGJlIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIG5vZGUuIElmIHRoZSBzb3VyY2UgaXMgaW4gRVM1IGZvcm1hdCwgdGhpc1xuICAgKiAgICAgbWlnaHQgYmUgYSBgdHMuVmFyaWFibGVEZWNsYXJhdGlvbmAgYXMgY2xhc3NlcyBpbiBFUzUgYXJlIHJlcHJlc2VudGVkIGFzIHRoZSByZXN1bHQgb2YgYW5cbiAgICogICAgIElJRkUgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgRGVjb3JhdG9yYCBtZXRhZGF0YSBpZiBkZWNvcmF0b3JzIGFyZSBwcmVzZW50IG9uIHRoZSBkZWNsYXJhdGlvbiwgb3JcbiAgICogICAgIGBudWxsYCBpZiBlaXRoZXIgbm8gZGVjb3JhdG9ycyB3ZXJlIHByZXNlbnQgb3IgaWYgdGhlIGRlY2xhcmF0aW9uIGlzIG5vdCBvZiBhIGRlY29yYXRhYmxlXG4gICAqICAgICB0eXBlLlxuICAgKi9cbiAgb3ZlcnJpZGUgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IERlY2xhcmF0aW9uTm9kZSk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pO1xuICAgIGlmICghc3ltYm9sKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBvdmVycmlkZSBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0ZWQgdG8gZ2V0IG1lbWJlcnMgb2YgYSBub24tY2xhc3M6IFwiJHtjbGF6ei5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRNZW1iZXJzT2ZTeW1ib2woY2xhc3NTeW1ib2wpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGl0cyBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBvbmx5IGxvb2tzIGF0IHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGRpcmVjdGx5IGFuZCBub3QgYXQgYW55IGluaGVyaXRlZFxuICAgKiBjb25zdHJ1Y3RvcnMuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYFBhcmFtZXRlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjb25zdHJ1Y3RvciwgaWZcbiAgICogYSBjb25zdHJ1Y3RvciBleGlzdHMuIElmIHRoZSBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGhhcyAwIHBhcmFtZXRlcnMsIHRoaXMgYXJyYXkgd2lsbCBiZSBlbXB0eS5cbiAgICogSWYgdGhlIGNsYXNzIGhhcyBubyBjb25zdHJ1Y3RvciwgdGhpcyBtZXRob2QgcmV0dXJucyBgbnVsbGAuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBvdmVycmlkZSBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byBnZXQgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICBjb25zdCBwYXJhbWV0ZXJOb2RlcyA9IHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2wpO1xuICAgIGlmIChwYXJhbWV0ZXJOb2Rlcykge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oY2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBvdmVycmlkZSBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBGaXJzdCB0cnkgZ2V0dGluZyB0aGUgYmFzZSBjbGFzcyBmcm9tIGFuIEVTMjAxNSBjbGFzcyBkZWNsYXJhdGlvblxuICAgIGNvbnN0IHN1cGVyQmFzZUNsYXNzSWRlbnRpZmllciA9IHN1cGVyLmdldEJhc2VDbGFzc0V4cHJlc3Npb24oY2xhenopO1xuICAgIGlmIChzdXBlckJhc2VDbGFzc0lkZW50aWZpZXIpIHtcbiAgICAgIHJldHVybiBzdXBlckJhc2VDbGFzc0lkZW50aWZpZXI7XG4gICAgfVxuXG4gICAgLy8gVGhhdCBkaWRuJ3Qgd29yayBzbyBub3cgdHJ5IGdldHRpbmcgaXQgZnJvbSB0aGUgXCJpbm5lclwiIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKGNsYXNzU3ltYm9sPy5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIWlzTmFtZWREZWNsYXJhdGlvbihjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKGNsYXNzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcygpIGNhbGxlZCBvbiBhIG5vbi1jbGFzczogZXhwZWN0ZWQgJHtcbiAgICAgICAgICBjbGF6ei5uYW1lLnRleHR9IHRvIGJlIGEgY2xhc3MgZGVjbGFyYXRpb24uYCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldE5hbWVGcm9tQ2xhc3NTeW1ib2xEZWNsYXJhdGlvbihcbiAgICAgICAgY2xhc3NTeW1ib2wsIGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXIge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKGNsYXNzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcygpIGNhbGxlZCBvbiBhIG5vbi1jbGFzczogZXhwZWN0ZWQgJHtcbiAgICAgICAgICBjbGF6ei5uYW1lLnRleHR9IHRvIGJlIGEgY2xhc3MgZGVjbGFyYXRpb24uYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0QWRqYWNlbnROYW1lT2ZDbGFzc1N5bWJvbChjbGFzc1N5bWJvbCk7XG4gIH1cblxuICBwcml2YXRlIGdldE5hbWVGcm9tQ2xhc3NTeW1ib2xEZWNsYXJhdGlvbihcbiAgICAgIGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbnx1bmRlZmluZWQpOiB0cy5JZGVudGlmaWVyIHtcbiAgICBpZiAoZGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBnZXRJbnRlcm5hbE5hbWVPZkNsYXNzKCkgY2FsbGVkIG9uIGEgY2xhc3Mgd2l0aCBhbiB1bmRlZmluZWQgaW50ZXJuYWwgZGVjbGFyYXRpb24uIEV4dGVybmFsIGNsYXNzIG5hbWU6ICR7XG4gICAgICAgICAgICAgIGNsYXNzU3ltYm9sLm5hbWV9OyBpbnRlcm5hbCBjbGFzcyBuYW1lOiAke2NsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLm5hbWV9LmApO1xuICAgIH1cbiAgICBpZiAoIWlzTmFtZWREZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcygpIGNhbGxlZCBvbiBhIGNsYXNzIHdpdGggYW4gYW5vbnltb3VzIGlubmVyIGRlY2xhcmF0aW9uOiBleHBlY3RlZCBhIG5hbWUgb246XFxuJHtcbiAgICAgICAgICAgICAgZGVjbGFyYXRpb24uZ2V0VGV4dCgpfWApO1xuICAgIH1cbiAgICByZXR1cm4gZGVjbGFyYXRpb24ubmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBub2RlIGFjdHVhbGx5IHJlcHJlc2VudHMgYSBjbGFzcy5cbiAgICovXG4gIG92ZXJyaWRlIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgcmV0dXJuIHN1cGVyLmlzQ2xhc3Mobm9kZSkgfHwgdGhpcy5nZXRDbGFzc1N5bWJvbChub2RlKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWNlIGFuIGlkZW50aWZpZXIgdG8gaXRzIGRlY2xhcmF0aW9uLCBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYXR0ZW1wdHMgdG8gcmVzb2x2ZSB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGdpdmVuIGlkZW50aWZpZXIsIHRyYWNpbmcgYmFjayB0aHJvdWdoXG4gICAqIGltcG9ydHMgYW5kIHJlLWV4cG9ydHMgdW50aWwgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIHN0YXRlbWVudCBpcyBmb3VuZC4gQSBgRGVjbGFyYXRpb25gXG4gICAqIG9iamVjdCBpcyByZXR1cm5lZCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYCBpcyByZXR1cm5lZCBvdGhlcndpc2UuXG4gICAqXG4gICAqIEluIEVTMjAxNSwgd2UgbmVlZCB0byBhY2NvdW50IGZvciBpZGVudGlmaWVycyB0aGF0IHJlZmVyIHRvIGFsaWFzZWQgY2xhc3MgZGVjbGFyYXRpb25zIHN1Y2ggYXNcbiAgICogYE15Q2xhc3NfMWAuIFNpbmNlIHN1Y2ggZGVjbGFyYXRpb25zIGFyZSBvbmx5IGF2YWlsYWJsZSB3aXRoaW4gdGhlIG1vZHVsZSBpdHNlbGYsIHdlIG5lZWQgdG9cbiAgICogZmluZCB0aGUgb3JpZ2luYWwgY2xhc3MgZGVjbGFyYXRpb24sIGUuZy4gYE15Q2xhc3NgLCB0aGF0IGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgYWxpYXNlZCBvbmUuXG4gICAqXG4gICAqIEBwYXJhbSBpZCBhIFR5cGVTY3JpcHQgYHRzLklkZW50aWZpZXJgIHRvIHRyYWNlIGJhY2sgdG8gYSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgbWV0YWRhdGEgYWJvdXQgdGhlIGBEZWNsYXJhdGlvbmAgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgb3ZlcnJpZGUgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBzdXBlckRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuXG4gICAgLy8gSWYgbm8gZGVjbGFyYXRpb24gd2FzIGZvdW5kLCByZXR1cm4uXG4gICAgaWYgKHN1cGVyRGVjbGFyYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBzdXBlckRlY2xhcmF0aW9uO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBkZWNsYXJhdGlvbiBhbHJlYWR5IGhhcyB0cmFpdHMgYXNzaWduZWQgdG8gaXQsIHJldHVybiBhcyBpcy5cbiAgICBpZiAoc3VwZXJEZWNsYXJhdGlvbi5rbm93biAhPT0gbnVsbCB8fFxuICAgICAgICBpc0NvbmNyZXRlRGVjbGFyYXRpb24oc3VwZXJEZWNsYXJhdGlvbikgJiYgc3VwZXJEZWNsYXJhdGlvbi5pZGVudGl0eSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHN1cGVyRGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgbGV0IGRlY2xhcmF0aW9uTm9kZTogdHMuTm9kZSA9IHN1cGVyRGVjbGFyYXRpb24ubm9kZTtcbiAgICBpZiAoaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24oc3VwZXJEZWNsYXJhdGlvbi5ub2RlKSAmJiAhaXNUb3BMZXZlbChzdXBlckRlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICBjb25zdCB2YXJpYWJsZVZhbHVlID0gdGhpcy5nZXRWYXJpYWJsZVZhbHVlKHN1cGVyRGVjbGFyYXRpb24ubm9kZSk7XG4gICAgICBpZiAodmFyaWFibGVWYWx1ZSAhPT0gbnVsbCAmJiB0cy5pc0NsYXNzRXhwcmVzc2lvbih2YXJpYWJsZVZhbHVlKSkge1xuICAgICAgICBkZWNsYXJhdGlvbk5vZGUgPSBnZXRDb250YWluaW5nU3RhdGVtZW50KHZhcmlhYmxlVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG91dGVyTm9kZSA9IGdldE91dGVyTm9kZUZyb21Jbm5lckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uTm9kZSk7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBvdXRlck5vZGUgIT09IG51bGwgJiYgaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24ob3V0ZXJOb2RlKSA/XG4gICAgICAgIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIob3V0ZXJOb2RlLm5hbWUpIDpcbiAgICAgICAgc3VwZXJEZWNsYXJhdGlvbjtcbiAgICBpZiAoZGVjbGFyYXRpb24gPT09IG51bGwgfHwgZGVjbGFyYXRpb24ua25vd24gIT09IG51bGwgfHxcbiAgICAgICAgaXNDb25jcmV0ZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSAmJiBkZWNsYXJhdGlvbi5pZGVudGl0eSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGRlY2xhcmF0aW9uO1xuICAgIH1cblxuICAgIC8vIFRoZSBpZGVudGlmaWVyIG1heSBoYXZlIGJlZW4gb2YgYW4gYWRkaXRpb25hbCBjbGFzcyBhc3NpZ25tZW50IHN1Y2ggYXMgYE15Q2xhc3NfMWAgdGhhdCB3YXNcbiAgICAvLyBwcmVzZW50IGFzIGFsaWFzIGZvciBgTXlDbGFzc2AuIElmIHNvLCByZXNvbHZlIHN1Y2ggYWxpYXNlcyB0byB0aGVpciBvcmlnaW5hbCBkZWNsYXJhdGlvbi5cbiAgICBjb25zdCBhbGlhc2VkSWRlbnRpZmllciA9IHRoaXMucmVzb2x2ZUFsaWFzZWRDbGFzc0lkZW50aWZpZXIoZGVjbGFyYXRpb24ubm9kZSk7XG4gICAgaWYgKGFsaWFzZWRJZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihhbGlhc2VkSWRlbnRpZmllcik7XG4gICAgfVxuXG4gICAgLy8gVmFyaWFibGUgZGVjbGFyYXRpb25zIG1heSByZXByZXNlbnQgYW4gZW51bSBkZWNsYXJhdGlvbiwgc28gYXR0ZW1wdCB0byByZXNvbHZlIGl0cyBtZW1iZXJzLlxuICAgIGlmIChpc0NvbmNyZXRlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pICYmIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgY29uc3QgZW51bU1lbWJlcnMgPSB0aGlzLnJlc29sdmVFbnVtTWVtYmVycyhkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgIGlmIChlbnVtTWVtYmVycyAhPT0gbnVsbCkge1xuICAgICAgICBkZWNsYXJhdGlvbi5pZGVudGl0eSA9IHtraW5kOiBTcGVjaWFsRGVjbGFyYXRpb25LaW5kLkRvd25sZXZlbGVkRW51bSwgZW51bU1lbWJlcnN9O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBkZWNvcmF0b3JzIG9mIHRoZSBnaXZlbiBjbGFzcyBzeW1ib2wuIEFueSBkZWNvcmF0b3IgdGhhdCBoYXZlIGJlZW4gc3ludGhldGljYWxseVxuICAgKiBpbmplY3RlZCBieSBhIG1pZ3JhdGlvbiB3aWxsIG5vdCBiZSBwcmVzZW50IGluIHRoZSByZXR1cm5lZCBjb2xsZWN0aW9uLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qge2NsYXNzRGVjb3JhdG9yc30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKHN5bWJvbCk7XG4gICAgaWYgKGNsYXNzRGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIGFycmF5IHRvIHByZXZlbnQgY29uc3VtZXJzIGZyb20gbXV0YXRpbmcgdGhlIGNhY2hlLlxuICAgIHJldHVybiBBcnJheS5mcm9tKGNsYXNzRGVjb3JhdG9ycyk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBtb2R1bGUgZm9yIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBpbiB3aGljaCB0aGUgaW5pdGlhbGl6ZXJcbiAgICogaXMgYW4gaWRlbnRpZmllciBtYXJrZWQgd2l0aCB0aGUgYFBSRV9SM19NQVJLRVJgLlxuICAgKiBAcGFyYW0gbW9kdWxlIHRoZSBtb2R1bGUgaW4gd2hpY2ggdG8gc2VhcmNoIGZvciBzd2l0Y2hhYmxlIGRlY2xhcmF0aW9ucy5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgdmFyaWFibGUgZGVjbGFyYXRpb25zIHRoYXQgbWF0Y2guXG4gICAqL1xuICBnZXRTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKG1vZHVsZTogdHMuTm9kZSk6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10ge1xuICAgIC8vIERvbid0IGJvdGhlciB0byB3YWxrIHRoZSBBU1QgaWYgdGhlIG1hcmtlciBpcyBub3QgZm91bmQgaW4gdGhlIHRleHRcbiAgICByZXR1cm4gbW9kdWxlLmdldFRleHQoKS5pbmRleE9mKFBSRV9SM19NQVJLRVIpID49IDAgP1xuICAgICAgICBmaW5kQWxsKG1vZHVsZSwgaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbikgOlxuICAgICAgICBbXTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHZhbHVlID0gc3VwZXIuZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbik7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gV2UgaGF2ZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIGluaXRpYWxpemVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIHZhciBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gU28gbG9vayBmb3IgdGhlIHNwZWNpYWwgc2NlbmFyaW8gd2hlcmUgdGhlIHZhcmlhYmxlIGlzIGJlaW5nIGFzc2lnbmVkIGluXG4gICAgLy8gYSBuZWFyYnkgc3RhdGVtZW50IHRvIHRoZSByZXR1cm4gdmFsdWUgb2YgYSBjYWxsIHRvIGBfX2RlY29yYXRlYC5cbiAgICAvLyBUaGVuIGZpbmQgdGhlIDJuZCBhcmd1bWVudCBvZiB0aGF0IGNhbGwsIHRoZSBcInRhcmdldFwiLCB3aGljaCB3aWxsIGJlIHRoZVxuICAgIC8vIGFjdHVhbCBjbGFzcyBpZGVudGlmaWVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIEh0dHBDbGllbnRYc3JmTW9kdWxlID0gSHR0cENsaWVudFhzcmZNb2R1bGVfMSA9IHRzbGliXzEuX19kZWNvcmF0ZShbXG4gICAgLy8gICBOZ01vZHVsZSh7XG4gICAgLy8gICAgIHByb3ZpZGVyczogW10sXG4gICAgLy8gICB9KVxuICAgIC8vIF0sIEh0dHBDbGllbnRYc3JmTW9kdWxlKTtcbiAgICAvLyBgYGBcbiAgICAvL1xuICAgIC8vIEFuZCBmaW5hbGx5LCBmaW5kIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgaWRlbnRpZmllciBpbiB0aGF0IGFyZ3VtZW50LlxuICAgIC8vIE5vdGUgYWxzbyB0aGF0IHRoZSBhc3NpZ25tZW50IGNhbiBvY2N1ciB3aXRoaW4gYW5vdGhlciBhc3NpZ25tZW50LlxuICAgIC8vXG4gICAgY29uc3QgYmxvY2sgPSBkZWNsYXJhdGlvbi5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICBpZiAoc3ltYm9sICYmICh0cy5pc0Jsb2NrKGJsb2NrKSB8fCB0cy5pc1NvdXJjZUZpbGUoYmxvY2spKSkge1xuICAgICAgY29uc3QgZGVjb3JhdGVDYWxsID0gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShibG9jaywgc3ltYm9sKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGRlY29yYXRlQ2FsbCAmJiBkZWNvcmF0ZUNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHRhcmdldCAmJiB0cy5pc0lkZW50aWZpZXIodGFyZ2V0KSkge1xuICAgICAgICBjb25zdCB0YXJnZXRTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0YXJnZXQpO1xuICAgICAgICBjb25zdCB0YXJnZXREZWNsYXJhdGlvbiA9IHRhcmdldFN5bWJvbCAmJiB0YXJnZXRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKHRhcmdldERlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0YXJnZXREZWNsYXJhdGlvbikgfHxcbiAgICAgICAgICAgICAgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBqdXN0IGEgZnVuY3Rpb24gb3IgY2xhc3MgZGVjbGFyYXRpb25cbiAgICAgICAgICAgIC8vIHNvIHJldHVybiBpdHMgaWRlbnRpZmllciBhcyB0aGUgdmFyaWFibGUgdmFsdWUuXG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0RGVjbGFyYXRpb24ubmFtZSB8fCBudWxsO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLCBzbyBmaW5kIHRoZSBmYXIgcmlnaHQgZXhwcmVzc2lvbixcbiAgICAgICAgICAgIC8vIGluIHRoZSBjYXNlIG9mIG11bHRpcGxlIGFzc2lnbm1lbnRzIChlLmcuIGB2YXIxID0gdmFyMiA9IHZhbHVlYCkuXG4gICAgICAgICAgICBsZXQgdGFyZ2V0VmFsdWUgPSB0YXJnZXREZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICAgICAgICAgIHdoaWxlICh0YXJnZXRWYWx1ZSAmJiBpc0Fzc2lnbm1lbnQodGFyZ2V0VmFsdWUpKSB7XG4gICAgICAgICAgICAgIHRhcmdldFZhbHVlID0gdGFyZ2V0VmFsdWUucmlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFyZ2V0VmFsdWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGFsbCB0b3AtbGV2ZWwgY2xhc3Mgc3ltYm9scyBpbiB0aGUgZ2l2ZW4gZmlsZS5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgY2xhc3Nlcy5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgY2xhc3Mgc3ltYm9scy5cbiAgICovXG4gIGZpbmRDbGFzc1N5bWJvbHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE5nY2NDbGFzc1N5bWJvbFtdIHtcbiAgICBjb25zdCBjbGFzc2VzID0gbmV3IE1hcDx0cy5TeW1ib2wsIE5nY2NDbGFzc1N5bWJvbD4oKTtcbiAgICB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSlcbiAgICAgICAgLmZvckVhY2goc3RhdGVtZW50ID0+IHRoaXMuYWRkQ2xhc3NTeW1ib2xzRnJvbVN0YXRlbWVudChjbGFzc2VzLCBzdGF0ZW1lbnQpKTtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShjbGFzc2VzLnZhbHVlcygpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG51bWJlciBvZiBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZiBhIGdpdmVuIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIHRoZSBudW1iZXIgb2YgdHlwZSBwYXJhbWV0ZXJzIG9mIHRoZSBjbGFzcywgaWYga25vd24sIG9yIGBudWxsYCBpZiB0aGUgZGVjbGFyYXRpb25cbiAgICogaXMgbm90IGEgY2xhc3Mgb3IgaGFzIGFuIHVua25vd24gbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycy5cbiAgICovXG4gIG92ZXJyaWRlIGdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBudW1iZXJ8bnVsbCB7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb24gPSB0aGlzLmdldER0c0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoZHRzRGVjbGFyYXRpb24gJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c0RlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIGR0c0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzID8gZHRzRGVjbGFyYXRpb24udHlwZVBhcmFtZXRlcnMubGVuZ3RoIDogMDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVGFrZSBhbiBleHBvcnRlZCBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzIChtYXliZSBkb3duLWxldmVsZWQgdG8gYSB2YXJpYWJsZSkgYW5kIGxvb2sgdXAgdGhlXG4gICAqIGRlY2xhcmF0aW9uIG9mIGl0cyB0eXBlIGluIGEgc2VwYXJhdGUgLmQudHMgdHJlZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBpcyBhbGxvd2VkIHRvIHJldHVybiBgbnVsbGAgaWYgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCBkb2VzIG5vdCBoYXZlIGFcbiAgICogc2VwYXJhdGUgLmQudHMgdHJlZS4gV2hlbiBjb21waWxpbmcgVHlwZVNjcmlwdCBjb2RlIHRoaXMgaXMgYWx3YXlzIHRoZSBjYXNlLCBzaW5jZSAuZC50cyBmaWxlc1xuICAgKiBhcmUgcHJvZHVjZWQgb25seSBkdXJpbmcgdGhlIGVtaXQgb2Ygc3VjaCBhIGNvbXBpbGF0aW9uLiBXaGVuIGNvbXBpbGluZyAuanMgY29kZSwgaG93ZXZlcixcbiAgICogdGhlcmUgaXMgZnJlcXVlbnRseSBhIHBhcmFsbGVsIC5kLnRzIHRyZWUgd2hpY2ggdGhpcyBtZXRob2QgZXhwb3Nlcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgcmV0dXJuZWQgZnJvbSB0aGlzIGZ1bmN0aW9uIG1heSBub3QgYmUgZnJvbSB0aGUgc2FtZVxuICAgKiBgdHMuUHJvZ3JhbWAgYXMgdGhlIGlucHV0IGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgb3ZlcnJpZGUgZ2V0RHRzRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IERlY2xhcmF0aW9uTm9kZSk6IHRzLkRlY2xhcmF0aW9ufG51bGwge1xuICAgIGlmICh0aGlzLmR0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICghaXNOYW1lZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgZ2V0IHRoZSBkdHMgZmlsZSBmb3IgYSBkZWNsYXJhdGlvbiB0aGF0IGhhcyBubyBuYW1lOiAke1xuICAgICAgICAgIGRlY2xhcmF0aW9uLmdldFRleHQoKX0gaW4gJHtkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbCA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZGVjbGFyYXRpb24ubmFtZSk7XG4gICAgaWYgKGRlY2wgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQ2Fubm90IGdldCB0aGUgZHRzIGZpbGUgZm9yIGEgbm9kZSB0aGF0IGNhbm5vdCBiZSBhc3NvY2lhdGVkIHdpdGggYSBkZWNsYXJhdGlvbiAke1xuICAgICAgICAgICAgICBkZWNsYXJhdGlvbi5nZXRUZXh0KCl9IGluICR7ZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfWApO1xuICAgIH1cblxuICAgIC8vIFRyeSB0byByZXRyaWV2ZSB0aGUgZHRzIGRlY2xhcmF0aW9uIGZyb20gdGhlIHB1YmxpYyBtYXBcbiAgICBpZiAodGhpcy5wdWJsaWNEdHNEZWNsYXJhdGlvbk1hcCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5wdWJsaWNEdHNEZWNsYXJhdGlvbk1hcCA9IHRoaXMuY29tcHV0ZVB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwKHRoaXMuc3JjLCB0aGlzLmR0cyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNEdHNEZWNsYXJhdGlvbk1hcC5nZXQoZGVjbC5ub2RlKSE7XG4gICAgfVxuXG4gICAgLy8gTm8gcHVibGljIGV4cG9ydCwgdHJ5IHRoZSBwcml2YXRlIG1hcFxuICAgIGlmICh0aGlzLnByaXZhdGVEdHNEZWNsYXJhdGlvbk1hcCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5wcml2YXRlRHRzRGVjbGFyYXRpb25NYXAgPSB0aGlzLmNvbXB1dGVQcml2YXRlRHRzRGVjbGFyYXRpb25NYXAodGhpcy5zcmMsIHRoaXMuZHRzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5wcml2YXRlRHRzRGVjbGFyYXRpb25NYXAuZ2V0KGRlY2wubm9kZSkhO1xuICAgIH1cblxuICAgIC8vIE5vIGRlY2xhcmF0aW9uIGZvdW5kIGF0IGFsbFxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZ2V0RW5kT2ZDbGFzcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogdHMuTm9kZSB7XG4gICAgY29uc3QgaW1wbGVtZW50YXRpb24gPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbjtcbiAgICBsZXQgbGFzdDogdHMuTm9kZSA9IGltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgY29uc3QgaW1wbGVtZW50YXRpb25TdGF0ZW1lbnQgPSBnZXRDb250YWluaW5nU3RhdGVtZW50KGxhc3QpO1xuICAgIGlmIChpbXBsZW1lbnRhdGlvblN0YXRlbWVudCA9PT0gbnVsbCkgcmV0dXJuIGxhc3Q7XG5cbiAgICBjb25zdCBjb250YWluZXIgPSBpbXBsZW1lbnRhdGlvblN0YXRlbWVudC5wYXJlbnQ7XG4gICAgaWYgKHRzLmlzQmxvY2soY29udGFpbmVyKSkge1xuICAgICAgLy8gQXNzdW1lIHRoYXQgdGhlIGltcGxlbWVudGF0aW9uIGlzIGluc2lkZSBhbiBJSUZFXG4gICAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnRJbmRleCA9IGNvbnRhaW5lci5zdGF0ZW1lbnRzLmZpbmRJbmRleCh0cy5pc1JldHVyblN0YXRlbWVudCk7XG4gICAgICBpZiAocmV0dXJuU3RhdGVtZW50SW5kZXggPT09IC0xKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBDb21waWxlZCBjbGFzcyB3cmFwcGVyIElJRkUgZG9lcyBub3QgaGF2ZSBhIHJldHVybiBzdGF0ZW1lbnQ6ICR7Y2xhc3NTeW1ib2wubmFtZX0gaW4gJHtcbiAgICAgICAgICAgICAgICBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX1gKTtcbiAgICAgIH1cblxuICAgICAgLy8gUmV0dXJuIHRoZSBzdGF0ZW1lbnQgYmVmb3JlIHRoZSBJSUZFIHJldHVybiBzdGF0ZW1lbnRcbiAgICAgIGxhc3QgPSBjb250YWluZXIuc3RhdGVtZW50c1tyZXR1cm5TdGF0ZW1lbnRJbmRleCAtIDFdO1xuICAgIH0gZWxzZSBpZiAodHMuaXNTb3VyY2VGaWxlKGNvbnRhaW5lcikpIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBzdGF0aWMgbWVtYmVycyBvbiB0aGlzIGNsYXNzIHRoZW4gZmluZCB0aGUgbGFzdCBvbmVcbiAgICAgIGlmIChpbXBsZW1lbnRhdGlvbi5leHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaW1wbGVtZW50YXRpb24uZXhwb3J0cy5mb3JFYWNoKGV4cG9ydFN5bWJvbCA9PiB7XG4gICAgICAgICAgaWYgKGV4cG9ydFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gZ2V0Q29udGFpbmluZ1N0YXRlbWVudChleHBvcnRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKGV4cG9ydFN0YXRlbWVudCAhPT0gbnVsbCAmJiBsYXN0LmdldEVuZCgpIDwgZXhwb3J0U3RhdGVtZW50LmdldEVuZCgpKSB7XG4gICAgICAgICAgICBsYXN0ID0gZXhwb3J0U3RhdGVtZW50O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZXJlIGFyZSBoZWxwZXIgY2FsbHMgZm9yIHRoaXMgY2xhc3MgdGhlbiBmaW5kIHRoZSBsYXN0IG9uZVxuICAgICAgY29uc3QgaGVscGVycyA9IHRoaXMuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhcbiAgICAgICAgICBjbGFzc1N5bWJvbCwgWydfX2RlY29yYXRlJywgJ19fZXh0ZW5kcycsICdfX3BhcmFtJywgJ19fbWV0YWRhdGEnXSk7XG4gICAgICBoZWxwZXJzLmZvckVhY2goaGVscGVyID0+IHtcbiAgICAgICAgY29uc3QgaGVscGVyU3RhdGVtZW50ID0gZ2V0Q29udGFpbmluZ1N0YXRlbWVudChoZWxwZXIpO1xuICAgICAgICBpZiAoaGVscGVyU3RhdGVtZW50ICE9PSBudWxsICYmIGxhc3QuZ2V0RW5kKCkgPCBoZWxwZXJTdGF0ZW1lbnQuZ2V0RW5kKCkpIHtcbiAgICAgICAgICBsYXN0ID0gaGVscGVyU3RhdGVtZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGxhc3Q7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhIGBEZWNsYXJhdGlvbmAgY29ycmVzcG9uZHMgd2l0aCBhIGtub3duIGRlY2xhcmF0aW9uLCBzdWNoIGFzIGBPYmplY3RgLCBhbmQgc2V0XG4gICAqIGl0cyBga25vd25gIHByb3BlcnR5IHRvIHRoZSBhcHByb3ByaWF0ZSBgS25vd25EZWNsYXJhdGlvbmAuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsIFRoZSBgRGVjbGFyYXRpb25gIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJuIFRoZSBwYXNzZWQgaW4gYERlY2xhcmF0aW9uYCAocG90ZW50aWFsbHkgZW5oYW5jZWQgd2l0aCBhIGBLbm93bkRlY2xhcmF0aW9uYCkuXG4gICAqL1xuICBkZXRlY3RLbm93bkRlY2xhcmF0aW9uPFQgZXh0ZW5kcyBEZWNsYXJhdGlvbj4oZGVjbDogVCk6IFQge1xuICAgIGlmIChkZWNsLmtub3duID09PSBudWxsICYmIHRoaXMuaXNKYXZhU2NyaXB0T2JqZWN0RGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICAgIC8vIElmIHRoZSBpZGVudGlmaWVyIHJlc29sdmVzIHRvIHRoZSBnbG9iYWwgSmF2YVNjcmlwdCBgT2JqZWN0YCwgdXBkYXRlIHRoZSBkZWNsYXJhdGlvbiB0b1xuICAgICAgLy8gZGVub3RlIGl0IGFzIHRoZSBrbm93biBgSnNHbG9iYWxPYmplY3RgIGRlY2xhcmF0aW9uLlxuICAgICAgZGVjbC5rbm93biA9IEtub3duRGVjbGFyYXRpb24uSnNHbG9iYWxPYmplY3Q7XG4gICAgfVxuICAgIHJldHVybiBkZWNsO1xuICB9XG5cblxuICAvLy8vLy8vLy8vLy8vIFByb3RlY3RlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgICogRXh0cmFjdCBhbGwgdGhlIFwiY2xhc3Nlc1wiIGZyb20gdGhlIGBzdGF0ZW1lbnRgIGFuZCBhZGQgdGhlbSB0byB0aGUgYGNsYXNzZXNgIG1hcC5cbiAgICovXG4gIHByb3RlY3RlZCBhZGRDbGFzc1N5bWJvbHNGcm9tU3RhdGVtZW50KFxuICAgICAgY2xhc3NlczogTWFwPHRzLlN5bWJvbCwgTmdjY0NsYXNzU3ltYm9sPiwgc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uKTtcbiAgICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgICAgY2xhc3Nlcy5zZXQoY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24sIGNsYXNzU3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RhdGVtZW50KSkge1xuICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKHN0YXRlbWVudCk7XG4gICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgY2xhc3Nlcy5zZXQoY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24sIGNsYXNzU3ltYm9sKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSB0aGUgaW5uZXIgZGVjbGFyYXRpb24gbm9kZSBvZiBhIFwiY2xhc3NcIiBmcm9tIHRoZSBnaXZlbiBgZGVjbGFyYXRpb25gIG5vZGUuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBhIG5vZGUgdGhhdCBpcyBlaXRoZXIgYW4gaW5uZXIgZGVjbGFyYXRpb24gb3IgYW4gYWxpYXMgb2YgYSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRJbm5lckRlY2xhcmF0aW9uRnJvbUFsaWFzT3JJbm5lcihkZWNsYXJhdGlvbjogdHMuTm9kZSk6IHRzLk5vZGUge1xuICAgIGlmIChkZWNsYXJhdGlvbi5wYXJlbnQgIT09IHVuZGVmaW5lZCAmJiBpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbi5wYXJlbnQpKSB7XG4gICAgICBjb25zdCB2YXJpYWJsZVZhbHVlID0gdGhpcy5nZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uLnBhcmVudCk7XG4gICAgICBpZiAodmFyaWFibGVWYWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICBkZWNsYXJhdGlvbiA9IHZhcmlhYmxlVmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGNsYXNzIG1heSBiZSBkZWNsYXJlZCBhcyBhIHRvcCBsZXZlbCBjbGFzcyBkZWNsYXJhdGlvbjpcbiAgICpcbiAgICogYGBgXG4gICAqIGNsYXNzIE91dGVyQ2xhc3MgeyAuLi4gfVxuICAgKiBgYGBcbiAgICpcbiAgICogb3IgaW4gYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB0byBhIGNsYXNzIGV4cHJlc3Npb246XG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgT3V0ZXJDbGFzcyA9IENsYXNzQWxpYXMgPSBjbGFzcyBJbm5lckNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogb3IgaW4gYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB0byBhbiBJSUZFIGNvbnRhaW5pbmcgYSBjbGFzcyBkZWNsYXJhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIE91dGVyQ2xhc3MgPSBDbGFzc0FsaWFzID0gKCgpID0+IHtcbiAgICogICBjbGFzcyBJbm5lckNsYXNzIHt9XG4gICAqICAgLi4uXG4gICAqICAgcmV0dXJuIElubmVyQ2xhc3M7XG4gICAqIH0pKClcbiAgICogYGBgXG4gICAqXG4gICAqIG9yIGluIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gdG8gYW4gSUlGRSBjb250YWluaW5nIGEgZnVuY3Rpb24gZGVjbGFyYXRpb25cbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBPdXRlckNsYXNzID0gQ2xhc3NBbGlhcyA9ICgoKSA9PiB7XG4gICAqICAgZnVuY3Rpb24gSW5uZXJDbGFzcygpIHt9XG4gICAqICAgLi4uXG4gICAqICAgcmV0dXJuIElubmVyQ2xhc3M7XG4gICAqIH0pKClcbiAgICogYGBgXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHJldHVybnMgYW4gYE5nY2NDbGFzc1N5bWJvbGAgd2hlbiBwcm92aWRlZCB3aXRoIG9uZSBvZiB0aGVzZSBjYXNlcy5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBjbGFzcyBvciBgdW5kZWZpbmVkYCBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlcHJlc2VudCBhbiBvdXRlclxuICAgKiAgICAgZGVjbGFyYXRpb24gb2YgYSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbEZyb21PdXRlckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgLy8gUmV0dXJuIGEgY2xhc3Mgc3ltYm9sIHdpdGhvdXQgYW4gaW5uZXIgZGVjbGFyYXRpb24gaWYgaXQgaXMgYSByZWd1bGFyIFwidG9wIGxldmVsXCIgY2xhc3NcbiAgICBpZiAoaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pICYmIGlzVG9wTGV2ZWwoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChkZWNsYXJhdGlvbi5uYW1lLCBudWxsKTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIGFuIG91dGVyIGNsYXNzIGRlY2xhcmF0aW9uIG11c3QgYmUgYW4gaW5pdGlhbGl6ZWQgdmFyaWFibGUgZGVjbGFyYXRpb246XG4gICAgaWYgKCFpc0luaXRpYWxpemVkVmFyaWFibGVDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBpbm5lckRlY2xhcmF0aW9uID0gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKHNraXBDbGFzc0FsaWFzZXMoZGVjbGFyYXRpb24pKTtcbiAgICBpZiAoaW5uZXJEZWNsYXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChkZWNsYXJhdGlvbi5uYW1lLCBpbm5lckRlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIHVzaW5nIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVzOlxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogb3JcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gKCgpID0+IHsgY2xhc3MgTXlDbGFzcyB7fSAuLi4gcmV0dXJuIE15Q2xhc3M7IH0pKClcbiAgICogYGBgXG4gICAqXG4gICAqIG9yXG4gICAqXG4gICAqIGBgYFxuICAgKiBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9ICgoKSA9PiB7IGxldCBNeUNsYXNzID0gY2xhc3MgTXlDbGFzcyB7fTsgLi4uIHJldHVybiBNeUNsYXNzOyB9KSgpXG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBleHRyYWN0cyB0aGUgYE5nY2NDbGFzc1N5bWJvbGAgZm9yIGBNeUNsYXNzYCB3aGVuIHByb3ZpZGVkIHdpdGggdGhlXG4gICAqIGBjbGFzcyBNeUNsYXNzIHt9YCBkZWNsYXJhdGlvbiBub2RlLiBXaGVuIHRoZSBgdmFyIE15Q2xhc3NgIG5vZGUgb3IgYW55IG90aGVyIG5vZGUgaXMgZ2l2ZW4sXG4gICAqIHRoaXMgbWV0aG9kIHdpbGwgcmV0dXJuIHVuZGVmaW5lZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgZG9lcyBub3QgcmVwcmVzZW50IGFuIGlubmVyIGRlY2xhcmF0aW9uXG4gICAqIG9mIGEgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NTeW1ib2xGcm9tSW5uZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIGxldCBvdXRlckRlY2xhcmF0aW9uOiB0cy5DbGFzc0RlY2xhcmF0aW9ufHRzLlZhcmlhYmxlRGVjbGFyYXRpb258dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKHRzLmlzQ2xhc3NFeHByZXNzaW9uKGRlY2xhcmF0aW9uKSAmJiBoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICAgIC8vIEhhbmRsZSBgbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O2BcbiAgICAgIG91dGVyRGVjbGFyYXRpb24gPSBnZXRGYXJMZWZ0SGFuZFNpZGVPZkFzc2lnbm1lbnQoZGVjbGFyYXRpb24pO1xuXG4gICAgICAvLyBIYW5kbGUgdGhpcyBiZWluZyBpbiBhbiBJSUZFXG4gICAgICBpZiAob3V0ZXJEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmICFpc1RvcExldmVsKG91dGVyRGVjbGFyYXRpb24pKSB7XG4gICAgICAgIG91dGVyRGVjbGFyYXRpb24gPSBnZXRDb250YWluaW5nVmFyaWFibGVEZWNsYXJhdGlvbihvdXRlckRlY2xhcmF0aW9uKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgLy8gSGFuZGxlIGBjbGFzcyBNeUNsYXNzIHt9YCBzdGF0ZW1lbnRcbiAgICAgIGlmIChpc1RvcExldmVsKGRlY2xhcmF0aW9uKSkge1xuICAgICAgICAvLyBBdCB0aGUgdG9wIGxldmVsXG4gICAgICAgIG91dGVyRGVjbGFyYXRpb24gPSBkZWNsYXJhdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE9yIGluc2lkZSBhbiBJSUZFXG4gICAgICAgIG91dGVyRGVjbGFyYXRpb24gPSBnZXRDb250YWluaW5nVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG91dGVyRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCAhaGFzTmFtZUlkZW50aWZpZXIob3V0ZXJEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2wob3V0ZXJEZWNsYXJhdGlvbi5uYW1lLCBkZWNsYXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBgTmdjY0NsYXNzU3ltYm9sYCBmcm9tIGFuIG91dGVyIGFuZCBpbm5lciBkZWNsYXJhdGlvbi4gSWYgYSBjbGFzcyBvbmx5IGhhcyBhbiBvdXRlclxuICAgKiBkZWNsYXJhdGlvbiwgdGhlIFwiaW1wbGVtZW50YXRpb25cIiBzeW1ib2wgb2YgdGhlIGNyZWF0ZWQgYE5nY2NDbGFzc1N5bWJvbGAgd2lsbCBiZSBzZXQgZXF1YWwgdG9cbiAgICogdGhlIFwiZGVjbGFyYXRpb25cIiBzeW1ib2wuXG4gICAqXG4gICAqIEBwYXJhbSBvdXRlckRlY2xhcmF0aW9uIFRoZSBvdXRlciBkZWNsYXJhdGlvbiBub2RlIG9mIHRoZSBjbGFzcy5cbiAgICogQHBhcmFtIGlubmVyRGVjbGFyYXRpb24gVGhlIGlubmVyIGRlY2xhcmF0aW9uIG5vZGUgb2YgdGhlIGNsYXNzLCBvciB1bmRlZmluZWQgaWYgbm8gaW5uZXJcbiAgICogZGVjbGFyYXRpb24gaXMgcHJlc2VudC5cbiAgICogQHJldHVybnMgdGhlIGBOZ2NjQ2xhc3NTeW1ib2xgIHJlcHJlc2VudGluZyB0aGUgY2xhc3MsIG9yIHVuZGVmaW5lZCBpZiBhIGB0cy5TeW1ib2xgIGZvciBhbnkgb2ZcbiAgICogdGhlIGRlY2xhcmF0aW9ucyBjb3VsZCBub3QgYmUgcmVzb2x2ZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgY3JlYXRlQ2xhc3NTeW1ib2wob3V0ZXJEZWNsYXJhdGlvbjogdHMuSWRlbnRpZmllciwgaW5uZXJEZWNsYXJhdGlvbjogdHMuTm9kZXxudWxsKTpcbiAgICAgIE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uU3ltYm9sID1cbiAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24ob3V0ZXJEZWNsYXJhdGlvbikgYXMgQ2xhc3NTeW1ib2wgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGRlY2xhcmF0aW9uU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgbGV0IGltcGxlbWVudGF0aW9uU3ltYm9sOiB0cy5TeW1ib2x8dW5kZWZpbmVkID0gZGVjbGFyYXRpb25TeW1ib2w7XG4gICAgaWYgKGlubmVyRGVjbGFyYXRpb24gIT09IG51bGwgJiYgaXNOYW1lZERlY2xhcmF0aW9uKGlubmVyRGVjbGFyYXRpb24pKSB7XG4gICAgICBpbXBsZW1lbnRhdGlvblN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlubmVyRGVjbGFyYXRpb24ubmFtZSk7XG4gICAgfVxuXG4gICAgaWYgKCFpc1N5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9uKGltcGxlbWVudGF0aW9uU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sID0ge1xuICAgICAgbmFtZTogZGVjbGFyYXRpb25TeW1ib2wubmFtZSxcbiAgICAgIGRlY2xhcmF0aW9uOiBkZWNsYXJhdGlvblN5bWJvbCxcbiAgICAgIGltcGxlbWVudGF0aW9uOiBpbXBsZW1lbnRhdGlvblN5bWJvbCxcbiAgICAgIGFkamFjZW50OiB0aGlzLmdldEFkamFjZW50U3ltYm9sKGRlY2xhcmF0aW9uU3ltYm9sLCBpbXBsZW1lbnRhdGlvblN5bWJvbCksXG4gICAgfTtcblxuICAgIHJldHVybiBjbGFzc1N5bWJvbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QWRqYWNlbnRTeW1ib2woXG4gICAgICBkZWNsYXJhdGlvblN5bWJvbDogQ2xhc3NTeW1ib2wsXG4gICAgICBpbXBsZW1lbnRhdGlvblN5bWJvbDogU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb24pOiBTeW1ib2xXaXRoVmFsdWVEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICAgIGlmIChkZWNsYXJhdGlvblN5bWJvbCA9PT0gaW1wbGVtZW50YXRpb25TeW1ib2wpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSBpbXBsZW1lbnRhdGlvblN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmICghdHMuaXNDbGFzc0V4cHJlc3Npb24oaW5uZXJEZWNsYXJhdGlvbikgJiYgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGlubmVyRGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvLyBEZWFsIHdpdGggdGhlIGlubmVyIGNsYXNzIGxvb2tpbmcgbGlrZSB0aGlzIGluc2lkZSBhbiBJSUZFOlxuICAgIC8vIGBsZXQgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge307YCBvciBgdmFyIE15Q2xhc3MgPSBmdW5jdGlvbiBNeUNsYXNzKCkge307YFxuICAgIGNvbnN0IGFkamFjZW50RGVjbGFyYXRpb24gPSBnZXRGYXJMZWZ0SGFuZFNpZGVPZkFzc2lnbm1lbnQoaW5uZXJEZWNsYXJhdGlvbik7XG4gICAgaWYgKGFkamFjZW50RGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCAhaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24oYWRqYWNlbnREZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGFkamFjZW50U3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oYWRqYWNlbnREZWNsYXJhdGlvbi5uYW1lKTtcbiAgICBpZiAoYWRqYWNlbnRTeW1ib2wgPT09IGRlY2xhcmF0aW9uU3ltYm9sIHx8IGFkamFjZW50U3ltYm9sID09PSBpbXBsZW1lbnRhdGlvblN5bWJvbCB8fFxuICAgICAgICAhaXNTeW1ib2xXaXRoVmFsdWVEZWNsYXJhdGlvbihhZGphY2VudFN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBhZGphY2VudFN5bWJvbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgYHRzLlN5bWJvbGAgdG8gaXRzIGRlY2xhcmF0aW9uIGFuZCBkZXRlY3Qgd2hldGhlciBpdCBjb3JyZXNwb25kcyB3aXRoIGEga25vd25cbiAgICogZGVjbGFyYXRpb24uXG4gICAqL1xuICBwcm90ZWN0ZWQgb3ZlcnJpZGUgZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzeW1ib2w6IHRzLlN5bWJvbCwgb3JpZ2luYWxJZDogdHMuSWRlbnRpZmllcnxudWxsKTpcbiAgICAgIERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzeW1ib2wsIG9yaWdpbmFsSWQpO1xuICAgIGlmIChkZWNsYXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRldGVjdEtub3duRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBhY3R1YWwgY2xhc3MgZGVjbGFyYXRpb24gZm9yIGEgcG90ZW50aWFsbHkgYWxpYXNlZCBkZWNsYXJhdGlvbiBvZiBhXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBJZiB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gaXMgZm9yIGFuIGFsaWFzIG9mIGEgY2xhc3MsIHRoaXMgZnVuY3Rpb24gd2lsbCBkZXRlcm1pbmUgYW4gaWRlbnRpZmllclxuICAgKiB0byB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gdGhhdCByZXByZXNlbnRzIHRoaXMgY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gdG8gcmVzb2x2ZS5cbiAgICogQHJldHVybnMgVGhlIG9yaWdpbmFsIGlkZW50aWZpZXIgdGhhdCB0aGUgZ2l2ZW4gY2xhc3MgZGVjbGFyYXRpb24gcmVzb2x2ZXMgdG8sIG9yIGB1bmRlZmluZWRgXG4gICAqIGlmIHRoZSBkZWNsYXJhdGlvbiBkb2VzIG5vdCByZXByZXNlbnQgYW4gYWxpYXNlZCBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihkZWNsYXJhdGlvbjogRGVjbGFyYXRpb25Ob2RlKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgICB0aGlzLmVuc3VyZVByZXByb2Nlc3NlZChkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIHJldHVybiB0aGlzLmFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucy5oYXMoZGVjbGFyYXRpb24pID9cbiAgICAgICAgdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuZ2V0KGRlY2xhcmF0aW9uKSEgOlxuICAgICAgICBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEVuc3VyZXMgdGhhdCB0aGUgc291cmNlIGZpbGUgdGhhdCBgbm9kZWAgaXMgcGFydCBvZiBoYXMgYmVlbiBwcmVwcm9jZXNzZWQuXG4gICAqXG4gICAqIER1cmluZyBwcmVwcm9jZXNzaW5nLCBhbGwgc3RhdGVtZW50cyBpbiB0aGUgc291cmNlIGZpbGUgd2lsbCBiZSB2aXNpdGVkIHN1Y2ggdGhhdCBjZXJ0YWluXG4gICAqIHByb2Nlc3Npbmcgc3RlcHMgY2FuIGJlIGRvbmUgdXAtZnJvbnQgYW5kIGNhY2hlZCBmb3Igc3Vic2VxdWVudCB1c2FnZXMuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBzb3VyY2UgZmlsZSB0aGF0IG5lZWRzIHRvIGhhdmUgZ29uZSB0aHJvdWdoIHByZXByb2Nlc3NpbmcuXG4gICAqL1xuICBwcm90ZWN0ZWQgZW5zdXJlUHJlcHJvY2Vzc2VkKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucHJlcHJvY2Vzc2VkU291cmNlRmlsZXMuaGFzKHNvdXJjZUZpbGUpKSB7XG4gICAgICB0aGlzLnByZXByb2Nlc3NlZFNvdXJjZUZpbGVzLmFkZChzb3VyY2VGaWxlKTtcblxuICAgICAgZm9yIChjb25zdCBzdGF0ZW1lbnQgb2YgdGhpcy5nZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIHRoaXMucHJlcHJvY2Vzc1N0YXRlbWVudChzdGF0ZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFseXplcyB0aGUgZ2l2ZW4gc3RhdGVtZW50IHRvIHNlZSBpZiBpdCBjb3JyZXNwb25kcyB3aXRoIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gbGlrZVxuICAgKiBgbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O2AuIElmIHNvLCB0aGUgZGVjbGFyYXRpb24gb2YgYE15Q2xhc3NfMWBcbiAgICogaXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBgTXlDbGFzc2AgaWRlbnRpZmllci5cbiAgICpcbiAgICogQHBhcmFtIHN0YXRlbWVudCBUaGUgc3RhdGVtZW50IHRoYXQgbmVlZHMgdG8gYmUgcHJlcHJvY2Vzc2VkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHByZXByb2Nlc3NTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9IHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zO1xuICAgIGlmIChkZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBkZWNsYXJhdGlvbnNbMF07XG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNsYXJhdGlvbi5uYW1lKSB8fCAhaW5pdGlhbGl6ZXIgfHwgIWlzQXNzaWdubWVudChpbml0aWFsaXplcikgfHxcbiAgICAgICAgIXRzLmlzSWRlbnRpZmllcihpbml0aWFsaXplci5sZWZ0KSB8fCAhdGhpcy5pc0NsYXNzKGRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gaW5pdGlhbGl6ZXIubGVmdDtcblxuICAgIGNvbnN0IGFsaWFzZWREZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoYWxpYXNlZElkZW50aWZpZXIpO1xuICAgIGlmIChhbGlhc2VkRGVjbGFyYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5hYmxlIHRvIGxvY2F0ZSBkZWNsYXJhdGlvbiBvZiAke2FsaWFzZWRJZGVudGlmaWVyLnRleHR9IGluIFwiJHtzdGF0ZW1lbnQuZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLnNldChhbGlhc2VkRGVjbGFyYXRpb24ubm9kZSwgZGVjbGFyYXRpb24ubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgYSBtb2R1bGUuXG4gICAqXG4gICAqIEluIEVTNSBhbmQgRVMyMDE1IHRoaXMgaXMganVzdCB0aGUgdG9wIGxldmVsIHN0YXRlbWVudHMgb2YgdGhlIGZpbGUuXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBtb2R1bGUgd2hvc2Ugc3RhdGVtZW50cyB3ZSB3YW50LlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgdGhlIGdpdmVuIG1vZHVsZS5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oc291cmNlRmlsZS5zdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXYWxrIHRoZSBBU1QgbG9va2luZyBmb3IgYW4gYXNzaWdubWVudCB0byB0aGUgc3BlY2lmaWVkIHN5bWJvbC5cbiAgICogQHBhcmFtIG5vZGUgVGhlIGN1cnJlbnQgbm9kZSB3ZSBhcmUgc2VhcmNoaW5nLlxuICAgKiBAcmV0dXJucyBhbiBleHByZXNzaW9uIHRoYXQgcmVwcmVzZW50cyB0aGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLCBvciB1bmRlZmluZWQgaWYgbm9uZSBjYW4gYmVcbiAgICogZm91bmQuXG4gICAqL1xuICBwcm90ZWN0ZWQgZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUobm9kZTogdHMuTm9kZXx1bmRlZmluZWQsIHN5bWJvbDogdHMuU3ltYm9sKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghbm9kZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgbm9kZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pIHtcbiAgICAgIGNvbnN0IGxlZnQgPSBub2RlLmxlZnQ7XG4gICAgICBjb25zdCByaWdodCA9IG5vZGUucmlnaHQ7XG4gICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGxlZnQpICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGxlZnQpID09PSBzeW1ib2wpIHtcbiAgICAgICAgcmV0dXJuICh0cy5pc0NhbGxFeHByZXNzaW9uKHJpZ2h0KSAmJiBnZXRDYWxsZWVOYW1lKHJpZ2h0KSA9PT0gJ19fZGVjb3JhdGUnKSA/IHJpZ2h0IDogbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKHJpZ2h0LCBzeW1ib2wpO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZS5mb3JFYWNoQ2hpbGQobm9kZSA9PiB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKG5vZGUsIHN5bWJvbCkpIHx8IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJldHJpZXZlIHRoZSBzeW1ib2wgb2YgYSBzdGF0aWMgcHJvcGVydHkgb24gYSBjbGFzcy5cbiAgICpcbiAgICogSW4gc29tZSBjYXNlcywgYSBzdGF0aWMgcHJvcGVydHkgY2FuIGVpdGhlciBiZSBzZXQgb24gdGhlIGlubmVyIChpbXBsZW1lbnRhdGlvbiBvciBhZGphY2VudClcbiAgICogZGVjbGFyYXRpb24gaW5zaWRlIHRoZSBjbGFzcycgSUlGRSwgb3IgaXQgY2FuIGJlIHNldCBvbiB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqIFRoZXJlZm9yZSwgdGhlIGhvc3QgY2hlY2tzIGFsbCBwbGFjZXMsIGZpcnN0IGxvb2tpbmcgdXAgdGhlIHByb3BlcnR5IG9uIHRoZSBpbm5lciBzeW1ib2xzLCBhbmRcbiAgICogaWYgdGhlIHByb3BlcnR5IGlzIG5vdCBmb3VuZCBpdCB3aWxsIGZhbGwgYmFjayB0byBsb29raW5nIHVwIHRoZSBwcm9wZXJ0eSBvbiB0aGUgb3V0ZXIgc3ltYm9sLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwcm9wZXJ0eSB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIHByb3BlcnR5TmFtZSB0aGUgbmFtZSBvZiBzdGF0aWMgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgaWYgaXQgaXMgZm91bmQgb3IgYHVuZGVmaW5lZGAgaWYgbm90LlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRpY1Byb3BlcnR5KHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sLCBwcm9wZXJ0eU5hbWU6IHRzLl9fU3RyaW5nKTogdHMuU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc3ltYm9sLmltcGxlbWVudGF0aW9uLmV4cG9ydHM/LmdldChwcm9wZXJ0eU5hbWUpIHx8XG4gICAgICAgIHN5bWJvbC5hZGphY2VudD8uZXhwb3J0cz8uZ2V0KHByb3BlcnR5TmFtZSkgfHxcbiAgICAgICAgc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHM/LmdldChwcm9wZXJ0eU5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgZm9yIG9idGFpbmluZyBpbmZvcm1hdGlvbiBvbiB0aGUgZGVjb3JhdG9ycyBvZiBhIGdpdmVuIGNsYXNzLiBUaGlzXG4gICAqIGluZm9ybWF0aW9uIGlzIGNvbXB1dGVkIGVpdGhlciBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzIGlmIHByZXNlbnQsIG9yIHVzaW5nIGB0c2xpYi5fX2RlY29yYXRlYFxuICAgKiBoZWxwZXIgY2FsbHMgb3RoZXJ3aXNlLiBUaGUgY29tcHV0ZWQgcmVzdWx0IGlzIGNhY2hlZCBwZXIgY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3MgZm9yIHdoaWNoIGRlY29yYXRvcnMgc2hvdWxkIGJlIGFjcXVpcmVkLlxuICAgKiBAcmV0dXJucyBhbGwgaW5mb3JtYXRpb24gb2YgdGhlIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFjcXVpcmVEZWNvcmF0b3JJbmZvKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBEZWNvcmF0b3JJbmZvIHtcbiAgICBjb25zdCBkZWNsID0gY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAodGhpcy5kZWNvcmF0b3JDYWNoZS5oYXMoZGVjbCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlY29yYXRvckNhY2hlLmdldChkZWNsKSE7XG4gICAgfVxuXG4gICAgLy8gRXh0cmFjdCBkZWNvcmF0b3JzIGZyb20gc3RhdGljIHByb3BlcnRpZXMgYW5kIGBfX2RlY29yYXRlYCBoZWxwZXIgY2FsbHMsIHRoZW4gbWVyZ2UgdGhlbVxuICAgIC8vIHRvZ2V0aGVyIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSBzdGF0aWMgcHJvcGVydGllcyBpcyBwcmVmZXJyZWQuXG4gICAgY29uc3Qgc3RhdGljUHJvcHMgPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbVN0YXRpY1Byb3BlcnRpZXMoY2xhc3NTeW1ib2wpO1xuICAgIGNvbnN0IGhlbHBlckNhbGxzID0gdGhpcy5jb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21IZWxwZXJDYWxscyhjbGFzc1N5bWJvbCk7XG5cbiAgICBjb25zdCBkZWNvcmF0b3JJbmZvOiBEZWNvcmF0b3JJbmZvID0ge1xuICAgICAgY2xhc3NEZWNvcmF0b3JzOiBzdGF0aWNQcm9wcy5jbGFzc0RlY29yYXRvcnMgfHwgaGVscGVyQ2FsbHMuY2xhc3NEZWNvcmF0b3JzLFxuICAgICAgbWVtYmVyRGVjb3JhdG9yczogc3RhdGljUHJvcHMubWVtYmVyRGVjb3JhdG9ycyB8fCBoZWxwZXJDYWxscy5tZW1iZXJEZWNvcmF0b3JzLFxuICAgICAgY29uc3RydWN0b3JQYXJhbUluZm86IHN0YXRpY1Byb3BzLmNvbnN0cnVjdG9yUGFyYW1JbmZvIHx8IGhlbHBlckNhbGxzLmNvbnN0cnVjdG9yUGFyYW1JbmZvLFxuICAgIH07XG5cbiAgICB0aGlzLmRlY29yYXRvckNhY2hlLnNldChkZWNsLCBkZWNvcmF0b3JJbmZvKTtcbiAgICByZXR1cm4gZGVjb3JhdG9ySW5mbztcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byBjb21wdXRlIGRlY29yYXRvciBpbmZvcm1hdGlvbiBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzIFwiZGVjb3JhdG9yc1wiLCBcInByb3BEZWNvcmF0b3JzXCJcbiAgICogYW5kIFwiY3RvclBhcmFtZXRlcnNcIiBvbiB0aGUgY2xhc3MuIElmIG5laXRoZXIgb2YgdGhlc2Ugc3RhdGljIHByb3BlcnRpZXMgaXMgcHJlc2VudCB0aGVcbiAgICogbGlicmFyeSBpcyBsaWtlbHkgbm90IGNvbXBpbGVkIHVzaW5nIHRzaWNrbGUgZm9yIHVzYWdlIHdpdGggQ2xvc3VyZSBjb21waWxlciwgaW4gd2hpY2ggY2FzZVxuICAgKiBgbnVsbGAgaXMgcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCBUaGUgY2xhc3Mgc3ltYm9sIHRvIGNvbXB1dGUgdGhlIGRlY29yYXRvcnMgaW5mb3JtYXRpb24gZm9yLlxuICAgKiBAcmV0dXJucyBBbGwgaW5mb3JtYXRpb24gb24gdGhlIGRlY29yYXRvcnMgYXMgZXh0cmFjdGVkIGZyb20gc3RhdGljIHByb3BlcnRpZXMsIG9yIGBudWxsYCBpZlxuICAgKiBub25lIG9mIHRoZSBzdGF0aWMgcHJvcGVydGllcyBleGlzdC5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21TdGF0aWNQcm9wZXJ0aWVzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiB7XG4gICAgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsOyBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT58IG51bGw7XG4gICAgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdIHwgbnVsbDtcbiAgfSB7XG4gICAgbGV0IGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCA9IG51bGw7XG4gICAgbGV0IG1lbWJlckRlY29yYXRvcnM6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPnxudWxsID0gbnVsbDtcbiAgICBsZXQgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdfG51bGwgPSBudWxsO1xuXG4gICAgY29uc3QgZGVjb3JhdG9yc1Byb3BlcnR5ID0gdGhpcy5nZXRTdGF0aWNQcm9wZXJ0eShjbGFzc1N5bWJvbCwgREVDT1JBVE9SUyk7XG4gICAgaWYgKGRlY29yYXRvcnNQcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjbGFzc0RlY29yYXRvcnMgPSB0aGlzLmdldENsYXNzRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIH1cblxuICAgIGNvbnN0IHByb3BEZWNvcmF0b3JzUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBQUk9QX0RFQ09SQVRPUlMpO1xuICAgIGlmIChwcm9wRGVjb3JhdG9yc1Byb3BlcnR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG1lbWJlckRlY29yYXRvcnMgPSB0aGlzLmdldE1lbWJlckRlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkocHJvcERlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgfVxuXG4gICAgY29uc3QgY29uc3RydWN0b3JQYXJhbXNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIENPTlNUUlVDVE9SX1BBUkFNUyk7XG4gICAgaWYgKGNvbnN0cnVjdG9yUGFyYW1zUHJvcGVydHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3RydWN0b3JQYXJhbUluZm8gPSB0aGlzLmdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShjb25zdHJ1Y3RvclBhcmFtc1Byb3BlcnR5KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge2NsYXNzRGVjb3JhdG9ycywgbWVtYmVyRGVjb3JhdG9ycywgY29uc3RydWN0b3JQYXJhbUluZm99O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgY2xhc3MgZGVjb3JhdG9ycyBmb3IgdGhlIGdpdmVuIGNsYXNzLCB3aGVyZSB0aGUgZGVjb3JhdG9ycyBhcmUgZGVjbGFyZWRcbiAgICogdmlhIGEgc3RhdGljIHByb3BlcnR5LiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIGNsYXNzIFNvbWVEaXJlY3RpdmUge31cbiAgICogU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzID0gW1xuICAgKiAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzU3ltYm9sIHRoZSBwcm9wZXJ0eSBjb250YWluaW5nIHRoZSBkZWNvcmF0b3JzIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIG9yIG51bGwgaWYgbm9uZSB3aGVyZSBmb3VuZC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDbGFzc0RlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1N5bWJvbDogdHMuU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9yc0lkZW50aWZpZXIgPSBkZWNvcmF0b3JzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgaWYgKGRlY29yYXRvcnNJZGVudGlmaWVyICYmIGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkge1xuICAgICAgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQpICYmXG4gICAgICAgICAgZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50Lm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbikge1xuICAgICAgICAvLyBBU1Qgb2YgdGhlIGFycmF5IG9mIGRlY29yYXRvciB2YWx1ZXNcbiAgICAgICAgY29uc3QgZGVjb3JhdG9yc0FycmF5ID0gZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50LnJpZ2h0O1xuICAgICAgICByZXR1cm4gdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXkpXG4gICAgICAgICAgICAuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4YW1pbmUgYSBzeW1ib2wgd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgaXRzIG1lbWJlcnMuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIGBDbGFzc1N5bWJvbGAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBDbGFzc01lbWJlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBtZW1iZXJzIG9mIHRoZSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNZW1iZXJzT2ZTeW1ib2woc3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBDbGFzc01lbWJlcltdIHtcbiAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG5cbiAgICAvLyBUaGUgZGVjb3JhdG9ycyBtYXAgY29udGFpbnMgYWxsIHRoZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIGRlY29yYXRlZFxuICAgIGNvbnN0IHttZW1iZXJEZWNvcmF0b3JzfSA9IHRoaXMuYWNxdWlyZURlY29yYXRvckluZm8oc3ltYm9sKTtcblxuICAgIC8vIE1ha2UgYSBjb3B5IG9mIHRoZSBkZWNvcmF0b3JzIGFzIHN1Y2Nlc3NmdWxseSByZWZsZWN0ZWQgbWVtYmVycyBkZWxldGUgdGhlbXNlbHZlcyBmcm9tIHRoZVxuICAgIC8vIG1hcCwgc28gdGhhdCBhbnkgbGVmdG92ZXJzIGNhbiBiZSBlYXNpbHkgZGVhbHQgd2l0aC5cbiAgICBjb25zdCBkZWNvcmF0b3JzTWFwID0gbmV3IE1hcChtZW1iZXJEZWNvcmF0b3JzKTtcblxuICAgIC8vIFRoZSBtZW1iZXIgbWFwIGNvbnRhaW5zIGFsbCB0aGUgbWV0aG9kIChpbnN0YW5jZSBhbmQgc3RhdGljKTsgYW5kIGFueSBpbnN0YW5jZSBwcm9wZXJ0aWVzXG4gICAgLy8gdGhhdCBhcmUgaW5pdGlhbGl6ZWQgaW4gdGhlIGNsYXNzLlxuICAgIGlmIChzeW1ib2wuaW1wbGVtZW50YXRpb24ubWVtYmVycykge1xuICAgICAgc3ltYm9sLmltcGxlbWVudGF0aW9uLm1lbWJlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgIGNvbnN0IHJlZmxlY3RlZE1lbWJlcnMgPSB0aGlzLnJlZmxlY3RNZW1iZXJzKHZhbHVlLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgaWYgKHJlZmxlY3RlZE1lbWJlcnMpIHtcbiAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICBtZW1iZXJzLnB1c2goLi4ucmVmbGVjdGVkTWVtYmVycyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFRoZSBzdGF0aWMgcHJvcGVydHkgbWFwIGNvbnRhaW5zIGFsbCB0aGUgc3RhdGljIHByb3BlcnRpZXNcbiAgICBpZiAoc3ltYm9sLmltcGxlbWVudGF0aW9uLmV4cG9ydHMpIHtcbiAgICAgIHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5leHBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycywgdHJ1ZSk7XG4gICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGlzIGNsYXNzIHdhcyBkZWNsYXJlZCBhcyBhIFZhcmlhYmxlRGVjbGFyYXRpb24gdGhlbiBpdCBtYXkgaGF2ZSBzdGF0aWMgcHJvcGVydGllc1xuICAgIC8vIGF0dGFjaGVkIHRvIHRoZSB2YXJpYWJsZSByYXRoZXIgdGhhbiB0aGUgY2xhc3MgaXRzZWxmXG4gICAgLy8gRm9yIGV4YW1wbGU6XG4gICAgLy8gYGBgXG4gICAgLy8gbGV0IE15Q2xhc3MgPSBjbGFzcyBNeUNsYXNzIHtcbiAgICAvLyAgIC8vIG5vIHN0YXRpYyBwcm9wZXJ0aWVzIGhlcmUhXG4gICAgLy8gfVxuICAgIC8vIE15Q2xhc3Muc3RhdGljUHJvcGVydHkgPSAuLi47XG4gICAgLy8gYGBgXG4gICAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihzeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIGlmIChzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cykge1xuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIGNvbnN0IHJlZmxlY3RlZE1lbWJlcnMgPSB0aGlzLnJlZmxlY3RNZW1iZXJzKHZhbHVlLCBkZWNvcmF0b3JzLCB0cnVlKTtcbiAgICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgICBtZW1iZXJzLnB1c2goLi4ucmVmbGVjdGVkTWVtYmVycyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB0aGlzIGNsYXNzIHdhcyBkZWNsYXJlZCBhcyBhIFZhcmlhYmxlRGVjbGFyYXRpb24gaW5zaWRlIGFuIElJRkUsIHRoZW4gaXQgbWF5IGhhdmUgc3RhdGljXG4gICAgLy8gcHJvcGVydGllcyBhdHRhY2hlZCB0byB0aGUgdmFyaWFibGUgcmF0aGVyIHRoYW4gdGhlIGNsYXNzIGl0c2VsZi5cbiAgICAvL1xuICAgIC8vIEZvciBleGFtcGxlOlxuICAgIC8vIGBgYFxuICAgIC8vIGxldCBPdXRlckNsYXNzID0gKCgpID0+IHtcbiAgICAvLyAgIGxldCBBZGphY2VudENsYXNzID0gY2xhc3MgSW50ZXJuYWxDbGFzcyB7XG4gICAgLy8gICAgIC8vIG5vIHN0YXRpYyBwcm9wZXJ0aWVzIGhlcmUhXG4gICAgLy8gICB9XG4gICAgLy8gICBBZGphY2VudENsYXNzLnN0YXRpY1Byb3BlcnR5ID0gLi4uO1xuICAgIC8vIH0pKCk7XG4gICAgLy8gYGBgXG4gICAgaWYgKHN5bWJvbC5hZGphY2VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHN5bWJvbC5hZGphY2VudC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgICBpZiAoc3ltYm9sLmFkamFjZW50LmV4cG9ydHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHN5bWJvbC5hZGphY2VudC5leHBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIGNvbnN0IHJlZmxlY3RlZE1lbWJlcnMgPSB0aGlzLnJlZmxlY3RNZW1iZXJzKHZhbHVlLCBkZWNvcmF0b3JzLCB0cnVlKTtcbiAgICAgICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgICBtZW1iZXJzLnB1c2goLi4ucmVmbGVjdGVkTWVtYmVycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWFsIHdpdGggYW55IGRlY29yYXRlZCBwcm9wZXJ0aWVzIHRoYXQgd2VyZSBub3QgaW5pdGlhbGl6ZWQgaW4gdGhlIGNsYXNzXG4gICAgZGVjb3JhdG9yc01hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICBpbXBsZW1lbnRhdGlvbjogbnVsbCxcbiAgICAgICAgZGVjb3JhdG9yczogdmFsdWUsXG4gICAgICAgIGlzU3RhdGljOiBmYWxzZSxcbiAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5LFxuICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICBub2RlOiBudWxsLFxuICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICB2YWx1ZTogbnVsbFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBNZW1iZXIgZGVjb3JhdG9ycyBtYXkgYmUgZGVjbGFyZWQgYXMgc3RhdGljIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9ycyA9IHtcbiAgICogICBcIm5nRm9yT2ZcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiAgIFwibmdGb3JUcmFja0J5XCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVGVtcGxhdGVcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiB9O1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNQcm9wZXJ0eSB0aGUgY2xhc3Mgd2hvc2UgbWVtYmVyIGRlY29yYXRvcnMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGEgbWFwIHdob3NlIGtleXMgYXJlIHRoZSBuYW1lIG9mIHRoZSBtZW1iZXJzIGFuZCB3aG9zZSB2YWx1ZXMgYXJlIGNvbGxlY3Rpb25zIG9mXG4gICAqIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzUHJvcGVydHk6IHRzLlN5bWJvbCk6XG4gICAgICBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4ge1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG4gICAgLy8gU3ltYm9sIG9mIHRoZSBpZGVudGlmaWVyIGZvciBgU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9yc2AuXG4gICAgY29uc3QgcHJvcERlY29yYXRvcnNNYXAgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChkZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGlmIChwcm9wRGVjb3JhdG9yc01hcCAmJiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHByb3BEZWNvcmF0b3JzTWFwKSkge1xuICAgICAgY29uc3QgcHJvcGVydGllc01hcCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKHByb3BEZWNvcmF0b3JzTWFwKTtcbiAgICAgIHByb3BlcnRpZXNNYXAuZm9yRWFjaCgodmFsdWUsIG5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9XG4gICAgICAgICAgICB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKHZhbHVlKS5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgICAgaWYgKGRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5zZXQobmFtZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbWVtYmVyRGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgYSBnaXZlbiBjbGFzcyBzeW1ib2wsIGNvbGxlY3RzIGFsbCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSB0c2xpYiBoZWxwZXIgbWV0aG9kcywgYXNcbiAgICogZ2VuZXJhdGVkIGJ5IFR5cGVTY3JpcHQgaW50byBlbWl0dGVkIEphdmFTY3JpcHQgZmlsZXMuXG4gICAqXG4gICAqIENsYXNzIGRlY29yYXRvcnMgYXJlIGV4dHJhY3RlZCBmcm9tIGNhbGxzIHRvIGB0c2xpYi5fX2RlY29yYXRlYCB0aGF0IGxvb2sgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBTb21lRGlyZWN0aXZlID0gY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlID0gX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoZSBleHRyYWN0aW9uIG9mIG1lbWJlciBkZWNvcmF0b3JzIGlzIHNpbWlsYXIsIHdpdGggdGhlIGRpc3RpbmN0aW9uIHRoYXQgaXRzIDJuZCBhbmQgM3JkXG4gICAqIGFyZ3VtZW50IGNvcnJlc3BvbmQgd2l0aCBhIFwicHJvdG90eXBlXCIgdGFyZ2V0IGFuZCB0aGUgbmFtZSBvZiB0aGUgbWVtYmVyIHRvIHdoaWNoIHRoZVxuICAgKiBkZWNvcmF0b3JzIGFwcGx5LlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgICBJbnB1dCgpLFxuICAgKiAgICAgX19tZXRhZGF0YShcImRlc2lnbjp0eXBlXCIsIFN0cmluZylcbiAgICogXSwgU29tZURpcmVjdGl2ZS5wcm90b3R5cGUsIFwiaW5wdXQxXCIsIHZvaWQgMCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgVGhlIGNsYXNzIHN5bWJvbCBmb3Igd2hpY2ggZGVjb3JhdG9ycyBzaG91bGQgYmUgZXh0cmFjdGVkLlxuICAgKiBAcmV0dXJucyBBbGwgaW5mb3JtYXRpb24gb24gdGhlIGRlY29yYXRvcnMgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBEZWNvcmF0b3JJbmZvIHtcbiAgICBsZXQgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsID0gbnVsbDtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXSA9IFtdO1xuXG4gICAgY29uc3QgZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8gPSAoaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgbGV0IHBhcmFtID0gY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdO1xuICAgICAgaWYgKHBhcmFtID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGFyYW0gPSBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF0gPSB7ZGVjb3JhdG9yczogbnVsbCwgdHlwZUV4cHJlc3Npb246IG51bGx9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhcmFtO1xuICAgIH07XG5cbiAgICAvLyBBbGwgcmVsZXZhbnQgaW5mb3JtYXRpb24gY2FuIGJlIGV4dHJhY3RlZCBmcm9tIGNhbGxzIHRvIGBfX2RlY29yYXRlYCwgb2J0YWluIHRoZXNlIGZpcnN0LlxuICAgIC8vIE5vdGUgdGhhdCBhbHRob3VnaCB0aGUgaGVscGVyIGNhbGxzIGFyZSByZXRyaWV2ZWQgdXNpbmcgdGhlIGNsYXNzIHN5bWJvbCwgdGhlIHJlc3VsdCBtYXlcbiAgICAvLyBjb250YWluIGhlbHBlciBjYWxscyBjb3JyZXNwb25kaW5nIHdpdGggdW5yZWxhdGVkIGNsYXNzZXMuIFRoZXJlZm9yZSwgZWFjaCBoZWxwZXIgY2FsbCBzdGlsbFxuICAgIC8vIGhhcyB0byBiZSBjaGVja2VkIHRvIGFjdHVhbGx5IGNvcnJlc3BvbmQgd2l0aCB0aGUgY2xhc3Mgc3ltYm9sLlxuICAgIGNvbnN0IGhlbHBlckNhbGxzID0gdGhpcy5nZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sLCBbJ19fZGVjb3JhdGUnXSk7XG5cbiAgICBjb25zdCBvdXRlckRlY2xhcmF0aW9uID0gY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbjtcbiAgICBjb25zdCBpbm5lckRlY2xhcmF0aW9uID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbjtcbiAgICBjb25zdCBhZGphY2VudERlY2xhcmF0aW9uID0gdGhpcy5nZXRBZGphY2VudE5hbWVPZkNsYXNzU3ltYm9sKGNsYXNzU3ltYm9sKS5wYXJlbnQ7XG4gICAgY29uc3QgbWF0Y2hlc0NsYXNzID0gKGlkZW50aWZpZXI6IHRzLklkZW50aWZpZXIpID0+IHtcbiAgICAgIGNvbnN0IGRlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgICAgcmV0dXJuIGRlY2wgIT09IG51bGwgJiZcbiAgICAgICAgICAoZGVjbC5ub2RlID09PSBhZGphY2VudERlY2xhcmF0aW9uIHx8IGRlY2wubm9kZSA9PT0gb3V0ZXJEZWNsYXJhdGlvbiB8fFxuICAgICAgICAgICBkZWNsLm5vZGUgPT09IGlubmVyRGVjbGFyYXRpb24pO1xuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IGhlbHBlckNhbGwgb2YgaGVscGVyQ2FsbHMpIHtcbiAgICAgIGlmIChpc0NsYXNzRGVjb3JhdGVDYWxsKGhlbHBlckNhbGwsIG1hdGNoZXNDbGFzcykpIHtcbiAgICAgICAgLy8gVGhpcyBgX19kZWNvcmF0ZWAgY2FsbCBpcyB0YXJnZXRpbmcgdGhlIGNsYXNzIGl0c2VsZi5cbiAgICAgICAgY29uc3QgaGVscGVyQXJncyA9IGhlbHBlckNhbGwuYXJndW1lbnRzWzBdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBoZWxwZXJBcmdzLmVsZW1lbnRzKSB7XG4gICAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLnJlZmxlY3REZWNvcmF0ZUhlbHBlckVudHJ5KGVsZW1lbnQpO1xuICAgICAgICAgIGlmIChlbnRyeSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09ICdkZWNvcmF0b3InKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyB3YXMgcmVmbGVjdGVkIHRvIHJlcHJlc2VudCBhbiBhY3R1YWwgZGVjb3JhdG9yXG4gICAgICAgICAgICBpZiAodGhpcy5pc0Zyb21Db3JlKGVudHJ5LmRlY29yYXRvcikpIHtcbiAgICAgICAgICAgICAgKGNsYXNzRGVjb3JhdG9ycyB8fCAoY2xhc3NEZWNvcmF0b3JzID0gW10pKS5wdXNoKGVudHJ5LmRlY29yYXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChlbnRyeS50eXBlID09PSAncGFyYW06ZGVjb3JhdG9ycycpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHJlcHJlc2VudHMgYSBkZWNvcmF0b3IgZm9yIGEgcGFyYW1ldGVyLiBTaW5jZSBpdCdzIGFwcGxpZWQgdG8gdGhlXG4gICAgICAgICAgICAvLyBjbGFzcywgaXQgY29ycmVzcG9uZHMgd2l0aCBhIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBvZiB0aGUgY2xhc3MuXG4gICAgICAgICAgICBjb25zdCBwYXJhbSA9IGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKGVudHJ5LmluZGV4KTtcbiAgICAgICAgICAgIChwYXJhbS5kZWNvcmF0b3JzIHx8IChwYXJhbS5kZWNvcmF0b3JzID0gW10pKS5wdXNoKGVudHJ5LmRlY29yYXRvcik7XG4gICAgICAgICAgfSBlbHNlIGlmIChlbnRyeS50eXBlID09PSAncGFyYW1zJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgcmVwcmVzZW50cyB0aGUgdHlwZXMgb2YgdGhlIHBhcmFtZXRlcnMuIFNpbmNlIGl0J3MgYXBwbGllZCB0byB0aGVcbiAgICAgICAgICAgIC8vIGNsYXNzLCBpdCBjb3JyZXNwb25kcyB3aXRoIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIHRoZSBjbGFzcy5cbiAgICAgICAgICAgIGVudHJ5LnR5cGVzLmZvckVhY2goXG4gICAgICAgICAgICAgICAgKHR5cGUsIGluZGV4KSA9PiBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhpbmRleCkudHlwZUV4cHJlc3Npb24gPSB0eXBlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNNZW1iZXJEZWNvcmF0ZUNhbGwoaGVscGVyQ2FsbCwgbWF0Y2hlc0NsYXNzKSkge1xuICAgICAgICAvLyBUaGUgYF9fZGVjb3JhdGVgIGNhbGwgaXMgdGFyZ2V0aW5nIGEgbWVtYmVyIG9mIHRoZSBjbGFzc1xuICAgICAgICBjb25zdCBoZWxwZXJBcmdzID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMF07XG4gICAgICAgIGNvbnN0IG1lbWJlck5hbWUgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1syXS50ZXh0O1xuXG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBoZWxwZXJBcmdzLmVsZW1lbnRzKSB7XG4gICAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLnJlZmxlY3REZWNvcmF0ZUhlbHBlckVudHJ5KGVsZW1lbnQpO1xuICAgICAgICAgIGlmIChlbnRyeSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09ICdkZWNvcmF0b3InKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyB3YXMgcmVmbGVjdGVkIHRvIHJlcHJlc2VudCBhbiBhY3R1YWwgZGVjb3JhdG9yLlxuICAgICAgICAgICAgaWYgKHRoaXMuaXNGcm9tQ29yZShlbnRyeS5kZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5oYXMobWVtYmVyTmFtZSkgPyBtZW1iZXJEZWNvcmF0b3JzLmdldChtZW1iZXJOYW1lKSEgOiBbXTtcbiAgICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKGVudHJ5LmRlY29yYXRvcik7XG4gICAgICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG1lbWJlck5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJbmZvcm1hdGlvbiBvbiBkZWNvcmF0ZWQgcGFyYW1ldGVycyBpcyBub3QgaW50ZXJlc3RpbmcgZm9yIG5nY2MsIHNvIGl0J3MgaWdub3JlZC5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge2NsYXNzRGVjb3JhdG9ycywgbWVtYmVyRGVjb3JhdG9ycywgY29uc3RydWN0b3JQYXJhbUluZm99O1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3QgdGhlIGRldGFpbHMgb2YgYW4gZW50cnkgd2l0aGluIGEgYF9fZGVjb3JhdGVgIGhlbHBlciBjYWxsLiBGb3IgZXhhbXBsZSwgZ2l2ZW4gdGhlXG4gICAqIGZvbGxvd2luZyBjb2RlOlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiAgIHRzbGliXzEuX19wYXJhbSgyLCBJbmplY3QoSU5KRUNURURfVE9LRU4pKSxcbiAgICogICB0c2xpYl8xLl9fbWV0YWRhdGEoXCJkZXNpZ246cGFyYW10eXBlc1wiLCBbVmlld0NvbnRhaW5lclJlZiwgVGVtcGxhdGVSZWYsIFN0cmluZ10pXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICAgKiBgYGBcbiAgICpcbiAgICogaXQgY2FuIGJlIHNlZW4gdGhhdCB0aGVyZSBhcmUgY2FsbHMgdG8gcmVndWxhciBkZWNvcmF0b3JzICh0aGUgYERpcmVjdGl2ZWApIGFuZCBjYWxscyBpbnRvXG4gICAqIGB0c2xpYmAgZnVuY3Rpb25zIHdoaWNoIGhhdmUgYmVlbiBpbnNlcnRlZCBieSBUeXBlU2NyaXB0LiBUaGVyZWZvcmUsIHRoaXMgZnVuY3Rpb24gY2xhc3NpZmllc1xuICAgKiBhIGNhbGwgdG8gY29ycmVzcG9uZCB3aXRoXG4gICAqICAgMS4gYSByZWFsIGRlY29yYXRvciBsaWtlIGBEaXJlY3RpdmVgIGFib3ZlLCBvclxuICAgKiAgIDIuIGEgZGVjb3JhdGVkIHBhcmFtZXRlciwgY29ycmVzcG9uZGluZyB3aXRoIGBfX3BhcmFtYCBjYWxscyBmcm9tIGB0c2xpYmAsIG9yXG4gICAqICAgMy4gdGhlIHR5cGUgaW5mb3JtYXRpb24gb2YgcGFyYW1ldGVycywgY29ycmVzcG9uZGluZyB3aXRoIGBfX21ldGFkYXRhYCBjYWxsIGZyb20gYHRzbGliYFxuICAgKlxuICAgKiBAcGFyYW0gZXhwcmVzc2lvbiB0aGUgZXhwcmVzc2lvbiB0aGF0IG5lZWRzIHRvIGJlIHJlZmxlY3RlZCBpbnRvIGEgYERlY29yYXRlSGVscGVyRW50cnlgXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCB0aGF0IGluZGljYXRlcyB3aGljaCBvZiB0aGUgdGhyZWUgY2F0ZWdvcmllcyB0aGUgY2FsbCByZXByZXNlbnRzLCB0b2dldGhlclxuICAgKiB3aXRoIHRoZSByZWZsZWN0ZWQgaW5mb3JtYXRpb24gb2YgdGhlIGNhbGwsIG9yIG51bGwgaWYgdGhlIGNhbGwgaXMgbm90IGEgdmFsaWQgZGVjb3JhdGUgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjb3JhdGVIZWxwZXJFbnRyeXxudWxsIHtcbiAgICAvLyBXZSBvbmx5IGNhcmUgYWJvdXQgdGhvc2UgZWxlbWVudHMgdGhhdCBhcmUgYWN0dWFsIGNhbGxzXG4gICAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY2FsbCA9IGV4cHJlc3Npb247XG5cbiAgICBjb25zdCBoZWxwZXJOYW1lID0gZ2V0Q2FsbGVlTmFtZShjYWxsKTtcbiAgICBpZiAoaGVscGVyTmFtZSA9PT0gJ19fbWV0YWRhdGEnKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgYHRzbGliLl9fbWV0YWRhdGFgIGNhbGwsIHJlZmxlY3QgdG8gYXJndW1lbnRzIGludG8gYSBgUGFyYW1ldGVyVHlwZXNgIG9iamVjdFxuICAgICAgLy8gaWYgdGhlIG1ldGFkYXRhIGtleSBpcyBcImRlc2lnbjpwYXJhbXR5cGVzXCIuXG4gICAgICBjb25zdCBrZXkgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKGtleSkgfHwga2V5LnRleHQgIT09ICdkZXNpZ246cGFyYW10eXBlcycpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHZhbHVlID0gY2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3BhcmFtcycsXG4gICAgICAgIHR5cGVzOiBBcnJheS5mcm9tKHZhbHVlLmVsZW1lbnRzKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGhlbHBlck5hbWUgPT09ICdfX3BhcmFtJykge1xuICAgICAgLy8gVGhpcyBpcyBhIGB0c2xpYi5fX3BhcmFtYCBjYWxsIHRoYXQgaXMgcmVmbGVjdGVkIGludG8gYSBgUGFyYW1ldGVyRGVjb3JhdG9yc2Agb2JqZWN0LlxuICAgICAgY29uc3QgaW5kZXhBcmcgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgIGNvbnN0IGluZGV4ID0gaW5kZXhBcmcgJiYgdHMuaXNOdW1lcmljTGl0ZXJhbChpbmRleEFyZykgPyBwYXJzZUludChpbmRleEFyZy50ZXh0LCAxMCkgOiBOYU47XG4gICAgICBpZiAoaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvcmF0b3JDYWxsID0gY2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAoZGVjb3JhdG9yQ2FsbCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckNhbGwpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvcmF0b3IgPSB0aGlzLnJlZmxlY3REZWNvcmF0b3JDYWxsKGRlY29yYXRvckNhbGwpO1xuICAgICAgaWYgKGRlY29yYXRvciA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3BhcmFtOmRlY29yYXRvcnMnLFxuICAgICAgICBpbmRleCxcbiAgICAgICAgZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgYXR0ZW1wdCB0byByZWZsZWN0IGl0IGFzIGEgcmVndWxhciBkZWNvcmF0b3IuXG4gICAgY29uc3QgZGVjb3JhdG9yID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChjYWxsKTtcbiAgICBpZiAoZGVjb3JhdG9yID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdkZWNvcmF0b3InLFxuICAgICAgZGVjb3JhdG9yLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRvckNhbGwoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pOiBEZWNvcmF0b3J8bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9yRXhwcmVzc2lvbiA9IGNhbGwuZXhwcmVzc2lvbjtcbiAgICBpZiAoIWlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JFeHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2UgZm91bmQgYSBkZWNvcmF0b3IhXG4gICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9XG4gICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByZXNzaW9uKSA/IGRlY29yYXRvckV4cHJlc3Npb24gOiBkZWNvcmF0b3JFeHByZXNzaW9uLm5hbWU7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgaWRlbnRpZmllcjogZGVjb3JhdG9yRXhwcmVzc2lvbixcbiAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjb3JhdG9ySWRlbnRpZmllciksXG4gICAgICBub2RlOiBjYWxsLFxuICAgICAgYXJnczogQXJyYXkuZnJvbShjYWxsLmFyZ3VtZW50cyksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB0aGUgZ2l2ZW4gc3RhdGVtZW50IHRvIHNlZSBpZiBpdCBpcyBhIGNhbGwgdG8gYW55IG9mIHRoZSBzcGVjaWZpZWQgaGVscGVyIGZ1bmN0aW9ucyBvclxuICAgKiBudWxsIGlmIG5vdCBmb3VuZC5cbiAgICpcbiAgICogTWF0Y2hpbmcgc3RhdGVtZW50cyB3aWxsIGxvb2sgbGlrZTogIGB0c2xpYl8xLl9fZGVjb3JhdGUoLi4uKTtgLlxuICAgKiBAcGFyYW0gc3RhdGVtZW50IHRoZSBzdGF0ZW1lbnQgdGhhdCBtYXkgY29udGFpbiB0aGUgY2FsbC5cbiAgICogQHBhcmFtIGhlbHBlck5hbWVzIHRoZSBuYW1lcyBvZiB0aGUgaGVscGVyIHdlIGFyZSBsb29raW5nIGZvci5cbiAgICogQHJldHVybnMgdGhlIG5vZGUgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgYF9fZGVjb3JhdGUoLi4uKWAgY2FsbCBvciBudWxsIGlmIHRoZSBzdGF0ZW1lbnRcbiAgICogZG9lcyBub3QgbWF0Y2guXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SGVscGVyQ2FsbChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCwgaGVscGVyTmFtZXM6IHN0cmluZ1tdKTogdHMuQ2FsbEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCh0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSB8fCB0cy5pc1JldHVyblN0YXRlbWVudChzdGF0ZW1lbnQpKSAmJlxuICAgICAgICBzdGF0ZW1lbnQuZXhwcmVzc2lvbikge1xuICAgICAgbGV0IGV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjtcbiAgICAgIHdoaWxlIChpc0Fzc2lnbm1lbnQoZXhwcmVzc2lvbikpIHtcbiAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24ucmlnaHQ7XG4gICAgICB9XG4gICAgICBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgICBjb25zdCBjYWxsZWVOYW1lID0gZ2V0Q2FsbGVlTmFtZShleHByZXNzaW9uKTtcbiAgICAgICAgaWYgKGNhbGxlZU5hbWUgIT09IG51bGwgJiYgaGVscGVyTmFtZXMuaW5jbHVkZXMoY2FsbGVlTmFtZSkpIHtcbiAgICAgICAgICByZXR1cm4gZXhwcmVzc2lvbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgZ2l2ZW4gYXJyYXkgbm9kZSBhbmQgZXh0cmFjdCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSBlYWNoIGVsZW1lbnQuXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCBmb3IgZGVjb3JhdG9ycyB0aGF0IGFyZSBkZWZpbmVkIGluIHN0YXRpYyBwcm9wZXJ0aWVzLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAgICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc0FycmF5IGFuIGV4cHJlc3Npb24gdGhhdCBjb250YWlucyBkZWNvcmF0b3IgaW5mb3JtYXRpb24uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvciBpbmZvIHRoYXQgd2FzIHJlZmxlY3RlZCBmcm9tIHRoZSBhcnJheSBub2RlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheTogdHMuRXhwcmVzc2lvbik6IERlY29yYXRvcltdIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSA9IFtdO1xuXG4gICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZWNvcmF0b3JzQXJyYXkpKSB7XG4gICAgICAvLyBBZGQgZWFjaCBkZWNvcmF0b3IgdGhhdCBpcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYCBpbnRvIHRoZSBgZGVjb3JhdG9yc2AgYXJyYXlcbiAgICAgIGRlY29yYXRvcnNBcnJheS5lbGVtZW50cy5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICAvLyBJZiB0aGUgZGVjb3JhdG9yIGlzIG5vdCBhbiBvYmplY3QgbGl0ZXJhbCBleHByZXNzaW9uIHRoZW4gd2UgYXJlIG5vdCBpbnRlcmVzdGVkXG4gICAgICAgIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmhhcygndHlwZScpKSB7XG4gICAgICAgICAgICBsZXQgZGVjb3JhdG9yVHlwZSA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKSE7XG4gICAgICAgICAgICBpZiAoaXNEZWNvcmF0b3JJZGVudGlmaWVyKGRlY29yYXRvclR5cGUpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcklkZW50aWZpZXIgPVxuICAgICAgICAgICAgICAgICAgdHMuaXNJZGVudGlmaWVyKGRlY29yYXRvclR5cGUpID8gZGVjb3JhdG9yVHlwZSA6IGRlY29yYXRvclR5cGUubmFtZTtcbiAgICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiBkZWNvcmF0b3JJZGVudGlmaWVyLnRleHQsXG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogZGVjb3JhdG9yVHlwZSxcbiAgICAgICAgICAgICAgICBpbXBvcnQ6IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpLFxuICAgICAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICAgICAgYXJnczogZ2V0RGVjb3JhdG9yQXJncyhub2RlKSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICpcbiAgICogQSBzaW5nbGUgc3ltYm9sIG1heSByZXByZXNlbnQgbXVsdGlwbGUgY2xhc3MgbWVtYmVycyBpbiB0aGUgY2FzZSBvZiBhY2Nlc3NvcnM7XG4gICAqIGFuIGVxdWFsbHkgbmFtZWQgZ2V0dGVyL3NldHRlciBhY2Nlc3NvciBwYWlyIGlzIGNvbWJpbmVkIGludG8gYSBzaW5nbGUgc3ltYm9sLlxuICAgKiBXaGVuIHRoZSBzeW1ib2wgaXMgcmVjb2duaXplZCBhcyByZXByZXNlbnRpbmcgYW4gYWNjZXNzb3IsIGl0cyBkZWNsYXJhdGlvbnMgYXJlXG4gICAqIGFuYWx5emVkIHN1Y2ggdGhhdCBib3RoIHRoZSBzZXR0ZXIgYW5kIGdldHRlciBhY2Nlc3NvciBhcmUgcmV0dXJuZWQgYXMgc2VwYXJhdGVcbiAgICogY2xhc3MgbWVtYmVycy5cbiAgICpcbiAgICogT25lIGRpZmZlcmVuY2Ugd3J0IHRoZSBUeXBlU2NyaXB0IGhvc3QgaXMgdGhhdCBpbiBFUzIwMTUsIHdlIGNhbm5vdCBzZWUgd2hpY2hcbiAgICogYWNjZXNzb3Igb3JpZ2luYWxseSBoYWQgYW55IGRlY29yYXRvcnMgYXBwbGllZCB0byB0aGVtLCBhcyBkZWNvcmF0b3JzIGFyZSBhcHBsaWVkXG4gICAqIHRvIHRoZSBwcm9wZXJ0eSBkZXNjcmlwdG9yIGluIGdlbmVyYWwsIG5vdCBhIHNwZWNpZmljIGFjY2Vzc29yLiBJZiBhbiBhY2Nlc3NvclxuICAgKiBoYXMgYm90aCBhIHNldHRlciBhbmQgZ2V0dGVyLCBhbnkgZGVjb3JhdG9ycyBhcmUgb25seSBhdHRhY2hlZCB0byB0aGUgc2V0dGVyIG1lbWJlci5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgc3ltYm9sIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcnMoc3ltYm9sOiB0cy5TeW1ib2wsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSwgaXNTdGF0aWM/OiBib29sZWFuKTpcbiAgICAgIENsYXNzTWVtYmVyW118bnVsbCB7XG4gICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFjY2Vzc29yKSB7XG4gICAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gICAgICBjb25zdCBzZXR0ZXIgPSBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMuZmluZCh0cy5pc1NldEFjY2Vzc29yKTtcbiAgICAgIGNvbnN0IGdldHRlciA9IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5maW5kKHRzLmlzR2V0QWNjZXNzb3IpO1xuXG4gICAgICBjb25zdCBzZXR0ZXJNZW1iZXIgPVxuICAgICAgICAgIHNldHRlciAmJiB0aGlzLnJlZmxlY3RNZW1iZXIoc2V0dGVyLCBDbGFzc01lbWJlcktpbmQuU2V0dGVyLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgICBpZiAoc2V0dGVyTWVtYmVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaChzZXR0ZXJNZW1iZXIpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYXR0YWNoaW5nIHRoZSBkZWNvcmF0b3JzIHRvIGEgcG90ZW50aWFsIGdldHRlci4gSW4gRVMyMDE1LCB3ZSBjYW4ndCB0ZWxsIHdoZXJlXG4gICAgICAgIC8vIHRoZSBkZWNvcmF0b3JzIHdlcmUgb3JpZ2luYWxseSBhdHRhY2hlZCB0bywgaG93ZXZlciB3ZSBvbmx5IHdhbnQgdG8gYXR0YWNoIHRoZW0gdG8gYVxuICAgICAgICAvLyBzaW5nbGUgYENsYXNzTWVtYmVyYCBhcyBvdGhlcndpc2Ugbmd0c2Mgd291bGQgaGFuZGxlIHRoZSBzYW1lIGRlY29yYXRvcnMgdHdpY2UuXG4gICAgICAgIGRlY29yYXRvcnMgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGdldHRlck1lbWJlciA9XG4gICAgICAgICAgZ2V0dGVyICYmIHRoaXMucmVmbGVjdE1lbWJlcihnZXR0ZXIsIENsYXNzTWVtYmVyS2luZC5HZXR0ZXIsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICAgIGlmIChnZXR0ZXJNZW1iZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKGdldHRlck1lbWJlcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgIH1cblxuICAgIGxldCBraW5kOiBDbGFzc01lbWJlcktpbmR8bnVsbCA9IG51bGw7XG4gICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLk1ldGhvZCkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5NZXRob2Q7XG4gICAgfSBlbHNlIGlmIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5Qcm9wZXJ0eSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlID0gc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGlmICghbm9kZSkge1xuICAgICAgLy8gSWYgdGhlIHN5bWJvbCBoYXMgYmVlbiBpbXBvcnRlZCBmcm9tIGEgVHlwZVNjcmlwdCB0eXBpbmdzIGZpbGUgdGhlbiB0aGUgY29tcGlsZXJcbiAgICAgIC8vIG1heSBwYXNzIHRoZSBgcHJvdG90eXBlYCBzeW1ib2wgYXMgYW4gZXhwb3J0IG9mIHRoZSBjbGFzcy5cbiAgICAgIC8vIEJ1dCB0aGlzIGhhcyBubyBkZWNsYXJhdGlvbi4gSW4gdGhpcyBjYXNlIHdlIGp1c3QgcXVpZXRseSBpZ25vcmUgaXQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBtZW1iZXIgPSB0aGlzLnJlZmxlY3RNZW1iZXIobm9kZSwga2luZCwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgIGlmICghbWVtYmVyKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gW21lbWJlcl07XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICogQHBhcmFtIG5vZGUgdGhlIGRlY2xhcmF0aW9uIG5vZGUgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0ga2luZCB0aGUgYXNzdW1lZCBraW5kIG9mIHRoZSBtZW1iZXIsIG1heSBiZWNvbWUgbW9yZSBhY2N1cmF0ZSBkdXJpbmcgcmVmbGVjdGlvbi5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcihcbiAgICAgIG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBraW5kOiBDbGFzc01lbWJlcktpbmR8bnVsbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLFxuICAgICAgaXNTdGF0aWM/OiBib29sZWFuKTogQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gICAgbGV0IHZhbHVlOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWVOb2RlOiB0cy5JZGVudGlmaWVyfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKCFpc0NsYXNzTWVtYmVyVHlwZShub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGlzU3RhdGljICYmIGlzUHJvcGVydHlBY2Nlc3Mobm9kZSkpIHtcbiAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgIHZhbHVlID0ga2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5ID8gbm9kZS5wYXJlbnQucmlnaHQgOiBudWxsO1xuICAgIH0gZWxzZSBpZiAoaXNUaGlzQXNzaWdubWVudChub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICAgIG5hbWUgPSBub2RlLmxlZnQubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBub2RlLnJpZ2h0O1xuICAgICAgaXNTdGF0aWMgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Db25zdHJ1Y3RvcjtcbiAgICAgIG5hbWUgPSAnY29uc3RydWN0b3InO1xuICAgICAgaXNTdGF0aWMgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoa2luZCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihgVW5rbm93biBtZW1iZXIgdHlwZTogXCIke25vZGUuZ2V0VGV4dCgpfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBpZiAoaXNOYW1lZERlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgICAgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB3ZSBoYXZlIHN0aWxsIG5vdCBkZXRlcm1pbmVkIGlmIHRoaXMgaXMgYSBzdGF0aWMgb3IgaW5zdGFuY2UgbWVtYmVyIHRoZW5cbiAgICAvLyBsb29rIGZvciB0aGUgYHN0YXRpY2Aga2V5d29yZCBvbiB0aGUgZGVjbGFyYXRpb25cbiAgICBpZiAoaXNTdGF0aWMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaXNTdGF0aWMgPSBub2RlLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgbm9kZS5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZTogdHMuVHlwZU5vZGUgPSAobm9kZSBhcyBhbnkpLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgbm9kZSxcbiAgICAgIGltcGxlbWVudGF0aW9uOiBub2RlLFxuICAgICAga2luZCxcbiAgICAgIHR5cGUsXG4gICAgICBuYW1lLFxuICAgICAgbmFtZU5vZGUsXG4gICAgICB2YWx1ZSxcbiAgICAgIGlzU3RhdGljLFxuICAgICAgZGVjb3JhdG9yczogZGVjb3JhdG9ycyB8fCBbXVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlcnMgd2Ugd2FudCB0byBmaW5kLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25gIG9iamVjdHMgcmVwcmVzZW50aW5nIGVhY2ggb2YgdGhlIHBhcmFtZXRlcnMgaW5cbiAgICogdGhlIGNsYXNzJ3MgY29uc3RydWN0b3Igb3IgbnVsbCBpZiB0aGVyZSBpcyBubyBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTpcbiAgICAgIHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW118bnVsbCB7XG4gICAgY29uc3QgbWVtYmVycyA9IGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLm1lbWJlcnM7XG4gICAgaWYgKG1lbWJlcnMgJiYgbWVtYmVycy5oYXMoQ09OU1RSVUNUT1IpKSB7XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvclN5bWJvbCA9IG1lbWJlcnMuZ2V0KENPTlNUUlVDVE9SKSE7XG4gICAgICAvLyBGb3Igc29tZSByZWFzb24gdGhlIGNvbnN0cnVjdG9yIGRvZXMgbm90IGhhdmUgYSBgdmFsdWVEZWNsYXJhdGlvbmAgPyE/XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9ucyAmJlxuICAgICAgICAgIGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9uc1swXSBhcyB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFjb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG4gICAgICBpZiAoY29uc3RydWN0b3IucGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgICAgfVxuICAgICAgaWYgKGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBjb25zdHJ1Y3Rvci5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIHBhcmFtZXRlck5vZGVzIHRoZSBhcnJheSBvZiBUeXBlU2NyaXB0IHBhcmFtZXRlciBub2RlcyBmb3IgdGhpcyBjbGFzcydzIGNvbnN0cnVjdG9yLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgaW5mbyBvYmplY3RzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKFxuICAgICAgY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXM6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW10pOiBDdG9yUGFyYW1ldGVyW10ge1xuICAgIGNvbnN0IHtjb25zdHJ1Y3RvclBhcmFtSW5mb30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKGNsYXNzU3ltYm9sKTtcblxuICAgIHJldHVybiBwYXJhbWV0ZXJOb2Rlcy5tYXAoKG5vZGUsIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCB7ZGVjb3JhdG9ycywgdHlwZUV4cHJlc3Npb259ID0gY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdID9cbiAgICAgICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF0gOlxuICAgICAgICAgIHtkZWNvcmF0b3JzOiBudWxsLCB0eXBlRXhwcmVzc2lvbjogbnVsbH07XG4gICAgICBjb25zdCBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgIGNvbnN0IHR5cGVWYWx1ZVJlZmVyZW5jZSA9IHRoaXMudHlwZVRvVmFsdWUodHlwZUV4cHJlc3Npb24pO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBnZXROYW1lVGV4dChuYW1lTm9kZSksXG4gICAgICAgIG5hbWVOb2RlLFxuICAgICAgICB0eXBlVmFsdWVSZWZlcmVuY2UsXG4gICAgICAgIHR5cGVOb2RlOiBudWxsLFxuICAgICAgICBkZWNvcmF0b3JzXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGUgdGhlIGBUeXBlVmFsdWVSZWZlcmVuY2VgIGZvciB0aGUgZ2l2ZW4gYHR5cGVFeHByZXNzaW9uYC5cbiAgICpcbiAgICogQWx0aG91Z2ggYHR5cGVFeHByZXNzaW9uYCBpcyBhIHZhbGlkIGB0cy5FeHByZXNzaW9uYCB0aGF0IGNvdWxkIGJlIGVtaXR0ZWQgZGlyZWN0bHkgaW50byB0aGVcbiAgICogZ2VuZXJhdGVkIGNvZGUsIG5nY2Mgc3RpbGwgbmVlZHMgdG8gcmVzb2x2ZSB0aGUgZGVjbGFyYXRpb24gYW5kIGNyZWF0ZSBhbiBgSU1QT1JURURgIHR5cGVcbiAgICogdmFsdWUgcmVmZXJlbmNlIGFzIHRoZSBjb21waWxlciBoYXMgc3BlY2lhbGl6ZWQgaGFuZGxpbmcgZm9yIHNvbWUgc3ltYm9scywgZm9yIGV4YW1wbGVcbiAgICogYENoYW5nZURldGVjdG9yUmVmYCBmcm9tIGBAYW5ndWxhci9jb3JlYC4gU3VjaCBhbiBgSU1QT1JURURgIHR5cGUgdmFsdWUgcmVmZXJlbmNlIHdpbGwgcmVzdWx0XG4gICAqIGluIGEgbmV3bHkgZ2VuZXJhdGVkIG5hbWVzcGFjZSBpbXBvcnQsIGluc3RlYWQgb2YgZW1pdHRpbmcgdGhlIG9yaWdpbmFsIGB0eXBlRXhwcmVzc2lvbmAgYXMgaXMuXG4gICAqL1xuICBwcml2YXRlIHR5cGVUb1ZhbHVlKHR5cGVFeHByZXNzaW9uOiB0cy5FeHByZXNzaW9ufG51bGwpOiBUeXBlVmFsdWVSZWZlcmVuY2Uge1xuICAgIGlmICh0eXBlRXhwcmVzc2lvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2luZDogVHlwZVZhbHVlUmVmZXJlbmNlS2luZC5VTkFWQUlMQUJMRSxcbiAgICAgICAgcmVhc29uOiB7a2luZDogVmFsdWVVbmF2YWlsYWJsZUtpbmQuTUlTU0lOR19UWVBFfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgaW1wID0gdGhpcy5nZXRJbXBvcnRPZkV4cHJlc3Npb24odHlwZUV4cHJlc3Npb24pO1xuICAgIGNvbnN0IGRlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKHR5cGVFeHByZXNzaW9uKTtcbiAgICBpZiAoaW1wID09PSBudWxsIHx8IGRlY2wgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGtpbmQ6IFR5cGVWYWx1ZVJlZmVyZW5jZUtpbmQuTE9DQUwsXG4gICAgICAgIGV4cHJlc3Npb246IHR5cGVFeHByZXNzaW9uLFxuICAgICAgICBkZWZhdWx0SW1wb3J0U3RhdGVtZW50OiBudWxsLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2luZDogVHlwZVZhbHVlUmVmZXJlbmNlS2luZC5JTVBPUlRFRCxcbiAgICAgIHZhbHVlRGVjbGFyYXRpb246IGRlY2wubm9kZSxcbiAgICAgIG1vZHVsZU5hbWU6IGltcC5mcm9tLFxuICAgICAgaW1wb3J0ZWROYW1lOiBpbXAubmFtZSxcbiAgICAgIG5lc3RlZFBhdGg6IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXJlIHRoZSBgZXhwcmVzc2lvbmAgaXMgaW1wb3J0ZWQgZnJvbS5cbiAgICpcbiAgICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdG8gZGV0ZXJtaW5lIHRoZSBpbXBvcnQgZGV0YWlscyBmb3IuXG4gICAqIEByZXR1cm5zIHRoZSBgSW1wb3J0YCBmb3IgdGhlIGV4cHJlc3Npb24sIG9yIGBudWxsYCBpZiB0aGUgZXhwcmVzc2lvbiBpcyBub3QgaW1wb3J0ZWQgb3IgdGhlXG4gICAqIGV4cHJlc3Npb24gc3ludGF4IGlzIG5vdCBzdXBwb3J0ZWQuXG4gICAqL1xuICBwcml2YXRlIGdldEltcG9ydE9mRXhwcmVzc2lvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogSW1wb3J0fG51bGwge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihleHByZXNzaW9uKTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmIHRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uLm5hbWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZXhwcmVzc2lvbi5uYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzLFxuICAgKiB3aGVyZSB0aGUgaW5mb3JtYXRpb24gaXMgc3RvcmVkIG9uIGEgc3RhdGljIHByb3BlcnR5IG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IGluIEVTTTIwMTUsIHRoZSBwcm9wZXJ0eSBpcyBkZWZpbmVkIGFuIGFycmF5LCBvciBieSBhbiBhcnJvdyBmdW5jdGlvbiB0aGF0IHJldHVybnNcbiAgICogYW4gYXJyYXksIG9mIGRlY29yYXRvciBhbmQgdHlwZSBpbmZvcm1hdGlvbi5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsXG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICAgKiAgIHt0eXBlOiBWaWV3Q29udGFpbmVyUmVmfSxcbiAgICogICB7dHlwZTogVGVtcGxhdGVSZWZ9LFxuICAgKiAgIHt0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOXX1dfSxcbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIG9yXG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gW1xuICAgKiAgIHt0eXBlOiBWaWV3Q29udGFpbmVyUmVmfSxcbiAgICogICB7dHlwZTogVGVtcGxhdGVSZWZ9LFxuICAgKiAgIHt0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7dHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU5dfV19LFxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5IHRoZSBwcm9wZXJ0eSB0aGF0IGhvbGRzIHRoZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIHRoZSB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciBlYWNoIHBhcmFtZXRlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkocGFyYW1EZWNvcmF0b3JzUHJvcGVydHk6IHRzLlN5bWJvbCk6IFBhcmFtSW5mb1tdfG51bGwge1xuICAgIGNvbnN0IHBhcmFtRGVjb3JhdG9ycyA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBpZiAocGFyYW1EZWNvcmF0b3JzKSB7XG4gICAgICAvLyBUaGUgZGVjb3JhdG9ycyBhcnJheSBtYXkgYmUgd3JhcHBlZCBpbiBhbiBhcnJvdyBmdW5jdGlvbi4gSWYgc28gdW53cmFwIGl0LlxuICAgICAgY29uc3QgY29udGFpbmVyID1cbiAgICAgICAgICB0cy5pc0Fycm93RnVuY3Rpb24ocGFyYW1EZWNvcmF0b3JzKSA/IHBhcmFtRGVjb3JhdG9ycy5ib2R5IDogcGFyYW1EZWNvcmF0b3JzO1xuICAgICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihjb250YWluZXIpKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gY29udGFpbmVyLmVsZW1lbnRzO1xuICAgICAgICByZXR1cm4gZWxlbWVudHNcbiAgICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgICAgZWxlbWVudCA9PlxuICAgICAgICAgICAgICAgICAgICB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGVsZW1lbnQpID8gcmVmbGVjdE9iamVjdExpdGVyYWwoZWxlbWVudCkgOiBudWxsKVxuICAgICAgICAgICAgLm1hcChwYXJhbUluZm8gPT4ge1xuICAgICAgICAgICAgICBjb25zdCB0eXBlRXhwcmVzc2lvbiA9XG4gICAgICAgICAgICAgICAgICBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmhhcygndHlwZScpID8gcGFyYW1JbmZvLmdldCgndHlwZScpISA6IG51bGw7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPVxuICAgICAgICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ2RlY29yYXRvcnMnKSA/IHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSEgOiBudWxsO1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9ySW5mbyAmJlxuICAgICAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKVxuICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAocGFyYW1EZWNvcmF0b3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICdJbnZhbGlkIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBkZWNvcmF0b3IgaW4gJyArXG4gICAgICAgICAgICAgICAgcGFyYW1EZWNvcmF0b3JzLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSArICc6XFxuJyxcbiAgICAgICAgICAgIHBhcmFtRGVjb3JhdG9ycy5nZXRUZXh0KCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggc3RhdGVtZW50cyByZWxhdGVkIHRvIHRoZSBnaXZlbiBjbGFzcyBmb3IgY2FsbHMgdG8gdGhlIHNwZWNpZmllZCBoZWxwZXIuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZXMgdGhlIG5hbWVzIG9mIHRoZSBoZWxwZXJzIChlLmcuIGBfX2RlY29yYXRlYCkgd2hvc2UgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWRcbiAgICogaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIENhbGxFeHByZXNzaW9uIG5vZGVzIGZvciBlYWNoIG1hdGNoaW5nIGhlbHBlciBjYWxsLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgaGVscGVyTmFtZXM6IHN0cmluZ1tdKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9uW10ge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbClcbiAgICAgICAgLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5nZXRIZWxwZXJDYWxsKHN0YXRlbWVudCwgaGVscGVyTmFtZXMpKVxuICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIHRoYXQgbWF5IGNvbnRhaW4gY2FsbHMgdG8gYSBoZWxwZXIuXG4gICAqXG4gICAqIEluIEVTTTIwMTUgY29kZSB0aGUgaGVscGVyIGNhbGxzIGFyZSBpbiB0aGUgdG9wIGxldmVsIG1vZHVsZSwgc28gd2UgaGF2ZSB0byBjb25zaWRlclxuICAgKiBhbGwgdGhlIHN0YXRlbWVudHMgaW4gdGhlIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIHN0YXRlbWVudHMgdGhhdCBtYXkgY29udGFpbiBoZWxwZXIgY2FsbHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0U3RhdGVtZW50c0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgY29uc3QgY2xhc3NOb2RlID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoaXNUb3BMZXZlbChjbGFzc05vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRNb2R1bGVTdGF0ZW1lbnRzKGNsYXNzTm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIH1cbiAgICBjb25zdCBzdGF0ZW1lbnQgPSBnZXRDb250YWluaW5nU3RhdGVtZW50KGNsYXNzTm9kZSk7XG4gICAgaWYgKHRzLmlzQmxvY2soc3RhdGVtZW50LnBhcmVudCkpIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKHN0YXRlbWVudC5wYXJlbnQuc3RhdGVtZW50cyk7XG4gICAgfVxuICAgIC8vIFdlIHNob3VsZCBuZXZlciBhcnJpdmUgaGVyZVxuICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGZpbmQgYWRqYWNlbnQgc3RhdGVtZW50cyBmb3IgJHtjbGFzc1N5bWJvbC5uYW1lfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlc3Qgd2hldGhlciBhIGRlY29yYXRvciB3YXMgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWAuXG4gICAqXG4gICAqIElzIHRoZSBkZWNvcmF0b3I6XG4gICAqICogZXh0ZXJuYWxseSBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYD9cbiAgICogKiB0aGUgY3VycmVudCBob3N0ZWQgcHJvZ3JhbSBpcyBhY3R1YWxseSBgQGFuZ3VsYXIvY29yZWAgYW5kXG4gICAqICAgLSByZWxhdGl2ZWx5IGludGVybmFsbHkgaW1wb3J0ZWQ7IG9yXG4gICAqICAgLSBub3QgaW1wb3J0ZWQsIGZyb20gdGhlIGN1cnJlbnQgZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvciB0aGUgZGVjb3JhdG9yIHRvIHRlc3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgaXNGcm9tQ29yZShkZWNvcmF0b3I6IERlY29yYXRvcik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLmlzQ29yZSkge1xuICAgICAgcmV0dXJuICFkZWNvcmF0b3IuaW1wb3J0IHx8IC9eXFwuLy50ZXN0KGRlY29yYXRvci5pbXBvcnQuZnJvbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAhIWRlY29yYXRvci5pbXBvcnQgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG1hcHBpbmcgYmV0d2VlbiB0aGUgcHVibGljIGV4cG9ydHMgaW4gYSBzcmMgcHJvZ3JhbSBhbmQgdGhlIHB1YmxpYyBleHBvcnRzIG9mIGEgZHRzXG4gICAqIHByb2dyYW0uXG4gICAqXG4gICAqIEBwYXJhbSBzcmMgdGhlIHByb2dyYW0gYnVuZGxlIGNvbnRhaW5pbmcgdGhlIHNvdXJjZSBmaWxlcy5cbiAgICogQHBhcmFtIGR0cyB0aGUgcHJvZ3JhbSBidW5kbGUgY29udGFpbmluZyB0aGUgdHlwaW5ncyBmaWxlcy5cbiAgICogQHJldHVybnMgYSBtYXAgb2Ygc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlUHVibGljRHRzRGVjbGFyYXRpb25NYXAoc3JjOiBCdW5kbGVQcm9ncmFtLCBkdHM6IEJ1bmRsZVByb2dyYW0pOlxuICAgICAgTWFwPERlY2xhcmF0aW9uTm9kZSwgdHMuRGVjbGFyYXRpb24+IHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbk1hcCA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCBkdHNEZWNsYXJhdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCByb290RHRzID0gZ2V0Um9vdEZpbGVPckZhaWwoZHRzKTtcbiAgICB0aGlzLmNvbGxlY3REdHNFeHBvcnRlZERlY2xhcmF0aW9ucyhkdHNEZWNsYXJhdGlvbk1hcCwgcm9vdER0cywgZHRzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgY29uc3Qgcm9vdFNyYyA9IGdldFJvb3RGaWxlT3JGYWlsKHNyYyk7XG4gICAgdGhpcy5jb2xsZWN0U3JjRXhwb3J0ZWREZWNsYXJhdGlvbnMoZGVjbGFyYXRpb25NYXAsIGR0c0RlY2xhcmF0aW9uTWFwLCByb290U3JjKTtcbiAgICByZXR1cm4gZGVjbGFyYXRpb25NYXA7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbWFwcGluZyBiZXR3ZWVuIHRoZSBcInByaXZhdGVcIiBleHBvcnRzIGluIGEgc3JjIHByb2dyYW0gYW5kIHRoZSBcInByaXZhdGVcIiBleHBvcnRzIG9mIGFcbiAgICogZHRzIHByb2dyYW0uIFRoZXNlIGV4cG9ydHMgbWF5IGJlIGV4cG9ydGVkIGZyb20gaW5kaXZpZHVhbCBmaWxlcyBpbiB0aGUgc3JjIG9yIGR0cyBwcm9ncmFtcyxcbiAgICogYnV0IG5vdCBleHBvcnRlZCBmcm9tIHRoZSByb290IGZpbGUgKGkuZSBwdWJsaWNseSBmcm9tIHRoZSBlbnRyeS1wb2ludCkuXG4gICAqXG4gICAqIFRoaXMgbWFwcGluZyBpcyBhIFwiYmVzdCBndWVzc1wiIHNpbmNlIHdlIGNhbm5vdCBndWFyYW50ZWUgdGhhdCB0d28gZGVjbGFyYXRpb25zIHRoYXQgaGFwcGVuIHRvXG4gICAqIGJlIGV4cG9ydGVkIGZyb20gYSBmaWxlIHdpdGggdGhlIHNhbWUgbmFtZSBhcmUgYWN0dWFsbHkgZXF1aXZhbGVudC4gQnV0IHRoaXMgaXMgYSByZWFzb25hYmxlXG4gICAqIGVzdGltYXRlIGZvciB0aGUgcHVycG9zZXMgb2YgbmdjYy5cbiAgICpcbiAgICogQHBhcmFtIHNyYyB0aGUgcHJvZ3JhbSBidW5kbGUgY29udGFpbmluZyB0aGUgc291cmNlIGZpbGVzLlxuICAgKiBAcGFyYW0gZHRzIHRoZSBwcm9ncmFtIGJ1bmRsZSBjb250YWluaW5nIHRoZSB0eXBpbmdzIGZpbGVzLlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiBzb3VyY2UgZGVjbGFyYXRpb25zIHRvIHR5cGluZ3MgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVQcml2YXRlRHRzRGVjbGFyYXRpb25NYXAoc3JjOiBCdW5kbGVQcm9ncmFtLCBkdHM6IEJ1bmRsZVByb2dyYW0pOlxuICAgICAgTWFwPERlY2xhcmF0aW9uTm9kZSwgdHMuRGVjbGFyYXRpb24+IHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbk1hcCA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCBkdHNEZWNsYXJhdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IGR0cy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICBjb25zdCBkdHNGaWxlcyA9IGdldE5vblJvb3RQYWNrYWdlRmlsZXMoZHRzKTtcbiAgICBmb3IgKGNvbnN0IGR0c0ZpbGUgb2YgZHRzRmlsZXMpIHtcbiAgICAgIHRoaXMuY29sbGVjdER0c0V4cG9ydGVkRGVjbGFyYXRpb25zKGR0c0RlY2xhcmF0aW9uTWFwLCBkdHNGaWxlLCB0eXBlQ2hlY2tlcik7XG4gICAgfVxuXG4gICAgY29uc3Qgc3JjRmlsZXMgPSBnZXROb25Sb290UGFja2FnZUZpbGVzKHNyYyk7XG4gICAgZm9yIChjb25zdCBzcmNGaWxlIG9mIHNyY0ZpbGVzKSB7XG4gICAgICB0aGlzLmNvbGxlY3RTcmNFeHBvcnRlZERlY2xhcmF0aW9ucyhkZWNsYXJhdGlvbk1hcCwgZHRzRGVjbGFyYXRpb25NYXAsIHNyY0ZpbGUpO1xuICAgIH1cbiAgICByZXR1cm4gZGVjbGFyYXRpb25NYXA7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdCBtYXBwaW5ncyBiZXR3ZWVuIG5hbWVzIG9mIGV4cG9ydGVkIGRlY2xhcmF0aW9ucyBpbiBhIGZpbGUgYW5kIGl0cyBhY3R1YWwgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEFueSBuZXcgbWFwcGluZ3MgYXJlIGFkZGVkIHRvIHRoZSBgZHRzRGVjbGFyYXRpb25NYXBgLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbGxlY3REdHNFeHBvcnRlZERlY2xhcmF0aW9ucyhcbiAgICAgIGR0c0RlY2xhcmF0aW9uTWFwOiBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4sIHNyY0ZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gICAgICBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IHZvaWQge1xuICAgIGNvbnN0IHNyY01vZHVsZSA9IHNyY0ZpbGUgJiYgY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHNyY0ZpbGUpO1xuICAgIGNvbnN0IG1vZHVsZUV4cG9ydHMgPSBzcmNNb2R1bGUgJiYgY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUoc3JjTW9kdWxlKTtcbiAgICBpZiAobW9kdWxlRXhwb3J0cykge1xuICAgICAgbW9kdWxlRXhwb3J0cy5mb3JFYWNoKGV4cG9ydGVkU3ltYm9sID0+IHtcbiAgICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkU3ltYm9sLm5hbWU7XG4gICAgICAgIGlmIChleHBvcnRlZFN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgICAgICAgZXhwb3J0ZWRTeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2woZXhwb3J0ZWRTeW1ib2wpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gZXhwb3J0ZWRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uICYmICFkdHNEZWNsYXJhdGlvbk1hcC5oYXMobmFtZSkpIHtcbiAgICAgICAgICBkdHNEZWNsYXJhdGlvbk1hcC5zZXQobmFtZSwgZGVjbGFyYXRpb24pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuXG4gIHByb3RlY3RlZCBjb2xsZWN0U3JjRXhwb3J0ZWREZWNsYXJhdGlvbnMoXG4gICAgICBkZWNsYXJhdGlvbk1hcDogTWFwPERlY2xhcmF0aW9uTm9kZSwgdHMuRGVjbGFyYXRpb24+LFxuICAgICAgZHRzRGVjbGFyYXRpb25NYXA6IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPiwgc3JjRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGZpbGVFeHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUoc3JjRmlsZSk7XG4gICAgaWYgKGZpbGVFeHBvcnRzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IFtleHBvcnROYW1lLCB7bm9kZTogZGVjbGFyYXRpb25Ob2RlfV0gb2YgZmlsZUV4cG9ydHMpIHtcbiAgICAgICAgaWYgKGR0c0RlY2xhcmF0aW9uTWFwLmhhcyhleHBvcnROYW1lKSkge1xuICAgICAgICAgIGRlY2xhcmF0aW9uTWFwLnNldChkZWNsYXJhdGlvbk5vZGUsIGR0c0RlY2xhcmF0aW9uTWFwLmdldChleHBvcnROYW1lKSEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihleHByZXNzaW9uKTtcbiAgICB9XG5cbiAgICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGV4cHJlc3Npb24pIHx8ICF0cy5pc0lkZW50aWZpZXIoZXhwcmVzc2lvbi5leHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZXNwYWNlRGVjbCA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZXhwcmVzc2lvbi5leHByZXNzaW9uKTtcbiAgICBpZiAoIW5hbWVzcGFjZURlY2wgfHwgIXRzLmlzU291cmNlRmlsZShuYW1lc3BhY2VEZWNsLm5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lc3BhY2VFeHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUobmFtZXNwYWNlRGVjbC5ub2RlKTtcbiAgICBpZiAobmFtZXNwYWNlRXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFuYW1lc3BhY2VFeHBvcnRzLmhhcyhleHByZXNzaW9uLm5hbWUudGV4dCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cG9ydERlY2wgPSBuYW1lc3BhY2VFeHBvcnRzLmdldChleHByZXNzaW9uLm5hbWUudGV4dCkhO1xuICAgIHJldHVybiB7Li4uZXhwb3J0RGVjbCwgdmlhTW9kdWxlOiBuYW1lc3BhY2VEZWNsLnZpYU1vZHVsZX07XG4gIH1cblxuICAvKiogQ2hlY2tzIGlmIHRoZSBzcGVjaWZpZWQgZGVjbGFyYXRpb24gcmVzb2x2ZXMgdG8gdGhlIGtub3duIEphdmFTY3JpcHQgZ2xvYmFsIGBPYmplY3RgLiAqL1xuICBwcm90ZWN0ZWQgaXNKYXZhU2NyaXB0T2JqZWN0RGVjbGFyYXRpb24oZGVjbDogRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBjb25zdCBub2RlID0gZGVjbC5ub2RlO1xuICAgIC8vIFRoZSBkZWZhdWx0IFR5cGVTY3JpcHQgbGlicmFyeSB0eXBlcyB0aGUgZ2xvYmFsIGBPYmplY3RgIHZhcmlhYmxlIHRocm91Z2hcbiAgICAvLyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHdpdGggYSB0eXBlIHJlZmVyZW5jZSByZXNvbHZpbmcgdG8gYE9iamVjdENvbnN0cnVjdG9yYC5cbiAgICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSB8fCAhdHMuaXNJZGVudGlmaWVyKG5vZGUubmFtZSkgfHxcbiAgICAgICAgbm9kZS5uYW1lLnRleHQgIT09ICdPYmplY3QnIHx8IG5vZGUudHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHR5cGVOb2RlID0gbm9kZS50eXBlO1xuICAgIC8vIElmIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBkb2VzIG5vdCBoYXZlIGEgdHlwZSByZXNvbHZpbmcgdG8gYE9iamVjdENvbnN0cnVjdG9yYCxcbiAgICAvLyB3ZSBjYW5ub3QgZ3VhcmFudGVlIHRoYXQgdGhlIGRlY2xhcmF0aW9uIHJlc29sdmVzIHRvIHRoZSBnbG9iYWwgYE9iamVjdGAgdmFyaWFibGUuXG4gICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKHR5cGVOb2RlKSB8fCAhdHMuaXNJZGVudGlmaWVyKHR5cGVOb2RlLnR5cGVOYW1lKSB8fFxuICAgICAgICB0eXBlTm9kZS50eXBlTmFtZS50ZXh0ICE9PSAnT2JqZWN0Q29uc3RydWN0b3InKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEZpbmFsbHksIGNoZWNrIGlmIHRoZSB0eXBlIGRlZmluaXRpb24gZm9yIGBPYmplY3RgIG9yaWdpbmF0ZXMgZnJvbSBhIGRlZmF1bHQgbGlicmFyeVxuICAgIC8vIGRlZmluaXRpb24gZmlsZS4gVGhpcyByZXF1aXJlcyBkZWZhdWx0IHR5cGVzIHRvIGJlIGVuYWJsZWQgZm9yIHRoZSBob3N0IHByb2dyYW0uXG4gICAgcmV0dXJuIHRoaXMuc3JjLnByb2dyYW0uaXNTb3VyY2VGaWxlRGVmYXVsdExpYnJhcnkobm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluIEphdmFTY3JpcHQsIGVudW0gZGVjbGFyYXRpb25zIGFyZSBlbWl0dGVkIGFzIGEgcmVndWxhciB2YXJpYWJsZSBkZWNsYXJhdGlvbiBmb2xsb3dlZCBieSBhblxuICAgKiBJSUZFIGluIHdoaWNoIHRoZSBlbnVtIG1lbWJlcnMgYXJlIGFzc2lnbmVkLlxuICAgKlxuICAgKiAgIGV4cG9ydCB2YXIgRW51bTtcbiAgICogICAoZnVuY3Rpb24gKEVudW0pIHtcbiAgICogICAgIEVudW1bXCJhXCJdID0gXCJBXCI7XG4gICAqICAgICBFbnVtW1wiYlwiXSA9IFwiQlwiO1xuICAgKiAgIH0pKEVudW0gfHwgKEVudW0gPSB7fSkpO1xuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gQSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB0aGF0IG1heSByZXByZXNlbnQgYW4gZW51bVxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBlbnVtIG1lbWJlcnMgaWYgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGlzIGZvbGxvd2VkIGJ5IGFuIElJRkUgdGhhdFxuICAgKiBkZWNsYXJlcyB0aGUgZW51bSBtZW1iZXJzLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlRW51bU1lbWJlcnMoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiBFbnVtTWVtYmVyW118bnVsbCB7XG4gICAgLy8gSW5pdGlhbGl6ZWQgdmFyaWFibGVzIGRvbid0IHJlcHJlc2VudCBlbnVtIGRlY2xhcmF0aW9ucy5cbiAgICBpZiAoZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgIT09IHVuZGVmaW5lZCkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCB2YXJpYWJsZVN0bXQgPSBkZWNsYXJhdGlvbi5wYXJlbnQucGFyZW50O1xuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudCh2YXJpYWJsZVN0bXQpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGJsb2NrID0gdmFyaWFibGVTdG10LnBhcmVudDtcbiAgICBpZiAoIXRzLmlzQmxvY2soYmxvY2spICYmICF0cy5pc1NvdXJjZUZpbGUoYmxvY2spKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGRlY2xhcmF0aW9uSW5kZXggPSBibG9jay5zdGF0ZW1lbnRzLmZpbmRJbmRleChzdGF0ZW1lbnQgPT4gc3RhdGVtZW50ID09PSB2YXJpYWJsZVN0bXQpO1xuICAgIGlmIChkZWNsYXJhdGlvbkluZGV4ID09PSAtMSB8fCBkZWNsYXJhdGlvbkluZGV4ID09PSBibG9jay5zdGF0ZW1lbnRzLmxlbmd0aCAtIDEpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3Qgc3Vic2VxdWVudFN0bXQgPSBibG9jay5zdGF0ZW1lbnRzW2RlY2xhcmF0aW9uSW5kZXggKyAxXTtcbiAgICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdWJzZXF1ZW50U3RtdCkpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgaWlmZSA9IHN0cmlwUGFyZW50aGVzZXMoc3Vic2VxdWVudFN0bXQuZXhwcmVzc2lvbik7XG4gICAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGlpZmUpIHx8ICFpc0VudW1EZWNsYXJhdGlvbklpZmUoaWlmZSkpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgZm4gPSBzdHJpcFBhcmVudGhlc2VzKGlpZmUuZXhwcmVzc2lvbik7XG4gICAgaWYgKCF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihmbikpIHJldHVybiBudWxsO1xuXG4gICAgcmV0dXJuIHRoaXMucmVmbGVjdEVudW1NZW1iZXJzKGZuKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byBleHRyYWN0IGFsbCBgRW51bU1lbWJlcmBzIGZyb20gYSBmdW5jdGlvbiB0aGF0IGlzIGFjY29yZGluZyB0byB0aGUgSmF2YVNjcmlwdCBlbWl0XG4gICAqIGZvcm1hdCBmb3IgZW51bXM6XG4gICAqXG4gICAqICAgZnVuY3Rpb24gKEVudW0pIHtcbiAgICogICAgIEVudW1bXCJNZW1iZXJBXCJdID0gXCJhXCI7XG4gICAqICAgICBFbnVtW1wiTWVtYmVyQlwiXSA9IFwiYlwiO1xuICAgKiAgIH1cbiAgICpcbiAgICogQHBhcmFtIGZuIFRoZSBmdW5jdGlvbiBleHByZXNzaW9uIHRoYXQgaXMgYXNzdW1lZCB0byBjb250YWluIGVudW0gbWVtYmVycy5cbiAgICogQHJldHVybnMgQWxsIGVudW0gbWVtYmVycyBpZiB0aGUgZnVuY3Rpb24gaXMgYWNjb3JkaW5nIHRvIHRoZSBjb3JyZWN0IHN5bnRheCwgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcml2YXRlIHJlZmxlY3RFbnVtTWVtYmVycyhmbjogdHMuRnVuY3Rpb25FeHByZXNzaW9uKTogRW51bU1lbWJlcltdfG51bGwge1xuICAgIGlmIChmbi5wYXJhbWV0ZXJzLmxlbmd0aCAhPT0gMSkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBlbnVtTmFtZSA9IGZuLnBhcmFtZXRlcnNbMF0ubmFtZTtcbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihlbnVtTmFtZSkpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgZW51bU1lbWJlcnM6IEVudW1NZW1iZXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIGZuLmJvZHkuc3RhdGVtZW50cykge1xuICAgICAgY29uc3QgZW51bU1lbWJlciA9IHRoaXMucmVmbGVjdEVudW1NZW1iZXIoZW51bU5hbWUsIHN0YXRlbWVudCk7XG4gICAgICBpZiAoZW51bU1lbWJlciA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGVudW1NZW1iZXJzLnB1c2goZW51bU1lbWJlcik7XG4gICAgfVxuICAgIHJldHVybiBlbnVtTWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byBleHRyYWN0IGEgc2luZ2xlIGBFbnVtTWVtYmVyYCBmcm9tIGEgc3RhdGVtZW50IGluIHRoZSBmb2xsb3dpbmcgc3ludGF4OlxuICAgKlxuICAgKiAgIEVudW1bXCJNZW1iZXJBXCJdID0gXCJhXCI7XG4gICAqXG4gICAqIG9yLCBmb3IgZW51bSBtZW1iZXIgd2l0aCBudW1lcmljIHZhbHVlczpcbiAgICpcbiAgICogICBFbnVtW0VudW1bXCJNZW1iZXJBXCJdID0gMF0gPSBcIk1lbWJlckFcIjtcbiAgICpcbiAgICogQHBhcmFtIGVudW1OYW1lIFRoZSBpZGVudGlmaWVyIG9mIHRoZSBlbnVtIHRoYXQgdGhlIG1lbWJlcnMgc2hvdWxkIGJlIHNldCBvbi5cbiAgICogQHBhcmFtIHN0YXRlbWVudCBUaGUgc3RhdGVtZW50IHRvIGluc3BlY3QuXG4gICAqIEByZXR1cm5zIEFuIGBFbnVtTWVtYmVyYCBpZiB0aGUgc3RhdGVtZW50IGlzIGFjY29yZGluZyB0byB0aGUgZXhwZWN0ZWQgc3ludGF4LCBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RW51bU1lbWJlcihlbnVtTmFtZTogdHMuSWRlbnRpZmllciwgc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBFbnVtTWVtYmVyfG51bGwge1xuICAgIGlmICghdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uO1xuXG4gICAgLy8gQ2hlY2sgZm9yIHRoZSBgRW51bVtYXSA9IFk7YCBjYXNlLlxuICAgIGlmICghaXNFbnVtQXNzaWdubWVudChlbnVtTmFtZSwgZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBhc3NpZ25tZW50ID0gcmVmbGVjdEVudW1Bc3NpZ25tZW50KGV4cHJlc3Npb24pO1xuICAgIGlmIChhc3NpZ25tZW50ICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBhc3NpZ25tZW50O1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciB0aGUgYEVudW1bRW51bVtYXSA9IFldID0gLi4uO2AgY2FzZS5cbiAgICBjb25zdCBpbm5lckV4cHJlc3Npb24gPSBleHByZXNzaW9uLmxlZnQuYXJndW1lbnRFeHByZXNzaW9uO1xuICAgIGlmICghaXNFbnVtQXNzaWdubWVudChlbnVtTmFtZSwgaW5uZXJFeHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiByZWZsZWN0RW51bUFzc2lnbm1lbnQoaW5uZXJFeHByZXNzaW9uKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0QWRqYWNlbnROYW1lT2ZDbGFzc1N5bWJvbChjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogdHMuSWRlbnRpZmllciB7XG4gICAgaWYgKGNsYXNzU3ltYm9sLmFkamFjZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldE5hbWVGcm9tQ2xhc3NTeW1ib2xEZWNsYXJhdGlvbihcbiAgICAgICAgICBjbGFzc1N5bWJvbCwgY2xhc3NTeW1ib2wuYWRqYWNlbnQudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmdldE5hbWVGcm9tQ2xhc3NTeW1ib2xEZWNsYXJhdGlvbihcbiAgICAgICAgICBjbGFzc1N5bWJvbCwgY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbik7XG4gICAgfVxuICB9XG59XG5cbi8vLy8vLy8vLy8vLy8gRXhwb3J0ZWQgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgdGhlIGlpZmUgaGFzIHRoZSBmb2xsb3dpbmcgY2FsbCBzaWduYXR1cmU6XG4gKlxuICogICAoRW51bSB8fCAoRW51bSA9IHt9KVxuICpcbiAqIE5vdGUgdGhhdCB0aGUgYEVudW1gIGlkZW50aWZpZXIgaXMgbm90IGNoZWNrZWQsIGFzIGl0IGNvdWxkIGFsc28gYmUgc29tZXRoaW5nXG4gKiBsaWtlIGBleHBvcnRzLkVudW1gLiBJbnN0ZWFkLCBvbmx5IHRoZSBzdHJ1Y3R1cmUgb2YgYmluYXJ5IG9wZXJhdG9ycyBpcyBjaGVja2VkLlxuICpcbiAqIEBwYXJhbSBpaWZlIFRoZSBjYWxsIGV4cHJlc3Npb24gdG8gY2hlY2suXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBpaWZlIGhhcyBhIGNhbGwgc2lnbmF0dXJlIHRoYXQgY29ycmVzcG9uZHMgd2l0aCBhIHBvdGVudGlhbFxuICogZW51bSBkZWNsYXJhdGlvbi5cbiAqL1xuZnVuY3Rpb24gaXNFbnVtRGVjbGFyYXRpb25JaWZlKGlpZmU6IHRzLkNhbGxFeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmIChpaWZlLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmcgPSBpaWZlLmFyZ3VtZW50c1swXTtcbiAgaWYgKCF0cy5pc0JpbmFyeUV4cHJlc3Npb24oYXJnKSB8fCBhcmcub3BlcmF0b3JUb2tlbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLkJhckJhclRva2VuIHx8XG4gICAgICAhdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihhcmcucmlnaHQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgcmlnaHQgPSBhcmcucmlnaHQuZXhwcmVzc2lvbjtcbiAgaWYgKCF0cy5pc0JpbmFyeUV4cHJlc3Npb24ocmlnaHQpIHx8IHJpZ2h0Lm9wZXJhdG9yVG9rZW4ua2luZCAhPT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihyaWdodC5yaWdodCkgfHwgcmlnaHQucmlnaHQucHJvcGVydGllcy5sZW5ndGggIT09IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBBbiBlbnVtIG1lbWJlciBhc3NpZ25tZW50IHRoYXQgbG9va3MgbGlrZSBgRW51bVtYXSA9IFk7YC5cbiAqL1xuZXhwb3J0IHR5cGUgRW51bU1lbWJlckFzc2lnbm1lbnQgPSB0cy5CaW5hcnlFeHByZXNzaW9uJntsZWZ0OiB0cy5FbGVtZW50QWNjZXNzRXhwcmVzc2lvbn07XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gbG9va3MgbGlrZSBhbiBlbnVtIG1lbWJlciBhc3NpZ25tZW50IHRhcmdldGluZyBgRW51bWA6XG4gKlxuICogICBFbnVtW1hdID0gWTtcbiAqXG4gKiBIZXJlLCBYIGFuZCBZIGNhbiBiZSBhbnkgZXhwcmVzc2lvbi5cbiAqXG4gKiBAcGFyYW0gZW51bU5hbWUgVGhlIGlkZW50aWZpZXIgb2YgdGhlIGVudW0gdGhhdCB0aGUgbWVtYmVycyBzaG91bGQgYmUgc2V0IG9uLlxuICogQHBhcmFtIGV4cHJlc3Npb24gVGhlIGV4cHJlc3Npb24gdGhhdCBzaG91bGQgYmUgY2hlY2tlZCB0byBjb25mb3JtIHRvIHRoZSBhYm92ZSBmb3JtLlxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBpcyBvZiB0aGUgY29ycmVjdCBmb3JtLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGlzRW51bUFzc2lnbm1lbnQoXG4gICAgZW51bU5hbWU6IHRzLklkZW50aWZpZXIsIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBleHByZXNzaW9uIGlzIEVudW1NZW1iZXJBc3NpZ25tZW50IHtcbiAgaWYgKCF0cy5pc0JpbmFyeUV4cHJlc3Npb24oZXhwcmVzc2lvbikgfHxcbiAgICAgIGV4cHJlc3Npb24ub3BlcmF0b3JUb2tlbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuIHx8XG4gICAgICAhdHMuaXNFbGVtZW50QWNjZXNzRXhwcmVzc2lvbihleHByZXNzaW9uLmxlZnQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVmVyaWZ5IHRoYXQgdGhlIG91dGVyIGFzc2lnbm1lbnQgY29ycmVzcG9uZHMgd2l0aCB0aGUgZW51bSBkZWNsYXJhdGlvbi5cbiAgY29uc3QgZW51bUlkZW50aWZpZXIgPSBleHByZXNzaW9uLmxlZnQuZXhwcmVzc2lvbjtcbiAgcmV0dXJuIHRzLmlzSWRlbnRpZmllcihlbnVtSWRlbnRpZmllcikgJiYgZW51bUlkZW50aWZpZXIudGV4dCA9PT0gZW51bU5hbWUudGV4dDtcbn1cblxuLyoqXG4gKiBBdHRlbXB0cyB0byBjcmVhdGUgYW4gYEVudW1NZW1iZXJgIGZyb20gYW4gZXhwcmVzc2lvbiB0aGF0IGlzIGJlbGlldmVkIHRvIHJlcHJlc2VudCBhbiBlbnVtXG4gKiBhc3NpZ25tZW50LlxuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIFRoZSBleHByZXNzaW9uIHRoYXQgaXMgYmVsaWV2ZWQgdG8gYmUgYW4gZW51bSBhc3NpZ25tZW50LlxuICogQHJldHVybnMgQW4gYEVudW1NZW1iZXJgIG9yIG51bGwgaWYgdGhlIGV4cHJlc3Npb24gZGlkIG5vdCByZXByZXNlbnQgYW4gZW51bSBtZW1iZXIgYWZ0ZXIgYWxsLlxuICovXG5mdW5jdGlvbiByZWZsZWN0RW51bUFzc2lnbm1lbnQoZXhwcmVzc2lvbjogRW51bU1lbWJlckFzc2lnbm1lbnQpOiBFbnVtTWVtYmVyfG51bGwge1xuICBjb25zdCBtZW1iZXJOYW1lID0gZXhwcmVzc2lvbi5sZWZ0LmFyZ3VtZW50RXhwcmVzc2lvbjtcbiAgaWYgKCF0cy5pc1Byb3BlcnR5TmFtZShtZW1iZXJOYW1lKSkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHtuYW1lOiBtZW1iZXJOYW1lLCBpbml0aWFsaXplcjogZXhwcmVzc2lvbi5yaWdodH07XG59XG5cbmV4cG9ydCB0eXBlIFBhcmFtSW5mbyA9IHtcbiAgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCxcbiAgdHlwZUV4cHJlc3Npb246IHRzLkV4cHJlc3Npb258bnVsbFxufTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2FsbCB0byBgdHNsaWIuX19tZXRhZGF0YWAgYXMgcHJlc2VudCBpbiBgdHNsaWIuX19kZWNvcmF0ZWAgY2FsbHMuIFRoaXMgaXMgYVxuICogc3ludGhldGljIGRlY29yYXRvciBpbnNlcnRlZCBieSBUeXBlU2NyaXB0IHRoYXQgY29udGFpbnMgcmVmbGVjdGlvbiBpbmZvcm1hdGlvbiBhYm91dCB0aGVcbiAqIHRhcmdldCBvZiB0aGUgZGVjb3JhdG9yLCBpLmUuIHRoZSBjbGFzcyBvciBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXJUeXBlcyB7XG4gIHR5cGU6ICdwYXJhbXMnO1xuICB0eXBlczogdHMuRXhwcmVzc2lvbltdO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjYWxsIHRvIGB0c2xpYi5fX3BhcmFtYCBhcyBwcmVzZW50IGluIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy4gVGhpcyBjb250YWluc1xuICogaW5mb3JtYXRpb24gb24gYW55IGRlY29yYXRvcnMgd2VyZSBhcHBsaWVkIHRvIGEgY2VydGFpbiBwYXJhbWV0ZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyRGVjb3JhdG9ycyB7XG4gIHR5cGU6ICdwYXJhbTpkZWNvcmF0b3JzJztcbiAgaW5kZXg6IG51bWJlcjtcbiAgZGVjb3JhdG9yOiBEZWNvcmF0b3I7XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNhbGwgdG8gYSBkZWNvcmF0b3IgYXMgaXQgd2FzIHByZXNlbnQgaW4gdGhlIG9yaWdpbmFsIHNvdXJjZSBjb2RlLCBhcyBwcmVzZW50IGluXG4gKiBgdHNsaWIuX19kZWNvcmF0ZWAgY2FsbHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVjb3JhdG9yQ2FsbCB7XG4gIHR5cGU6ICdkZWNvcmF0b3InO1xuICBkZWNvcmF0b3I6IERlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBkaWZmZXJlbnQga2luZHMgb2YgZGVjb3JhdGUgaGVscGVycyB0aGF0IG1heSBiZSBwcmVzZW50IGFzIGZpcnN0IGFyZ3VtZW50IHRvXG4gKiBgdHNsaWIuX19kZWNvcmF0ZWAsIGFzIGZvbGxvd3M6XG4gKlxuICogYGBgXG4gKiBfX2RlY29yYXRlKFtcbiAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICogICB0c2xpYl8xLl9fcGFyYW0oMiwgSW5qZWN0KElOSkVDVEVEX1RPS0VOKSksXG4gKiAgIHRzbGliXzEuX19tZXRhZGF0YShcImRlc2lnbjpwYXJhbXR5cGVzXCIsIFtWaWV3Q29udGFpbmVyUmVmLCBUZW1wbGF0ZVJlZiwgU3RyaW5nXSlcbiAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIERlY29yYXRlSGVscGVyRW50cnkgPSBQYXJhbWV0ZXJUeXBlc3xQYXJhbWV0ZXJEZWNvcmF0b3JzfERlY29yYXRvckNhbGw7XG5cbi8qKlxuICogVGhlIHJlY29yZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiBvZiBhIHNpbmdsZSBjbGFzcy4gVGhpcyBpbmZvcm1hdGlvbiBpcyBjYWNoZWQgaW4gdGhlIGhvc3QuXG4gKi9cbmludGVyZmFjZSBEZWNvcmF0b3JJbmZvIHtcbiAgLyoqXG4gICAqIEFsbCBkZWNvcmF0b3JzIHRoYXQgd2VyZSBwcmVzZW50IG9uIHRoZSBjbGFzcy4gSWYgbm8gZGVjb3JhdG9ycyB3ZXJlIHByZXNlbnQsIHRoaXMgaXMgYG51bGxgXG4gICAqL1xuICBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGw7XG5cbiAgLyoqXG4gICAqIEFsbCBkZWNvcmF0b3JzIHBlciBtZW1iZXIgb2YgdGhlIGNsYXNzIHRoZXkgd2VyZSBwcmVzZW50IG9uLlxuICAgKi9cbiAgbWVtYmVyRGVjb3JhdG9yczogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+O1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgaW5mb3JtYXRpb24sIHN1Y2ggYXMgdGhlIHR5cGUgb2YgYSBwYXJhbWV0ZXIgYW5kIGFsbFxuICAgKiBkZWNvcmF0b3JzIGZvciBhIGNlcnRhaW4gcGFyYW1ldGVyLiBJbmRpY2VzIGluIHRoaXMgYXJyYXkgY29ycmVzcG9uZCB3aXRoIHRoZSBwYXJhbWV0ZXInc1xuICAgKiBpbmRleCBpbiB0aGUgY29uc3RydWN0b3IuIE5vdGUgdGhhdCB0aGlzIGFycmF5IG1heSBiZSBzcGFyc2UsIGkuZS4gY2VydGFpbiBjb25zdHJ1Y3RvclxuICAgKiBwYXJhbWV0ZXJzIG1heSBub3QgaGF2ZSBhbnkgaW5mbyByZWNvcmRlZC5cbiAgICovXG4gIGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXTtcbn1cblxuLyoqXG4gKiBBIHN0YXRlbWVudCBub2RlIHRoYXQgcmVwcmVzZW50cyBhbiBhc3NpZ25tZW50LlxuICovXG5leHBvcnQgdHlwZSBBc3NpZ25tZW50U3RhdGVtZW50ID1cbiAgICB0cy5FeHByZXNzaW9uU3RhdGVtZW50JntleHByZXNzaW9uOiB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259fTtcblxuLyoqXG4gKiBUZXN0IHdoZXRoZXIgYSBzdGF0ZW1lbnQgbm9kZSBpcyBhbiBhc3NpZ25tZW50IHN0YXRlbWVudC5cbiAqIEBwYXJhbSBzdGF0ZW1lbnQgdGhlIHN0YXRlbWVudCB0byB0ZXN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBc3NpZ25tZW50U3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogc3RhdGVtZW50IGlzIEFzc2lnbm1lbnRTdGF0ZW1lbnQge1xuICByZXR1cm4gdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNBc3NpZ25tZW50KHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBgZXhwcmVzc2lvbmAgdGhhdCBpcyBiZWxpZXZlZCB0byBiZSBhbiBJSUZFIGFuZCByZXR1cm4gdGhlIEFTVCBub2RlIHRoYXQgY29ycmVzcG9uZHMgdG9cbiAqIHRoZSBib2R5IG9mIHRoZSBJSUZFLlxuICpcbiAqIFRoZSBleHByZXNzaW9uIG1heSBiZSB3cmFwcGVkIGluIHBhcmVudGhlc2VzLCB3aGljaCBhcmUgc3RyaXBwZWQgb2ZmLlxuICpcbiAqIElmIHRoZSBJSUZFIGlzIGFuIGFycm93IGZ1bmN0aW9uIHRoZW4gaXRzIGJvZHkgY291bGQgYmUgYSBgdHMuRXhwcmVzc2lvbmAgcmF0aGVyIHRoYW4gYVxuICogYHRzLkZ1bmN0aW9uQm9keWAuXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdG8gcGFyc2UuXG4gKiBAcmV0dXJucyB0aGUgYHRzLkV4cHJlc3Npb25gIG9yIGB0cy5GdW5jdGlvbkJvZHlgIHRoYXQgaG9sZHMgdGhlIGJvZHkgb2YgdGhlIElJRkUgb3IgYHVuZGVmaW5lZGBcbiAqICAgICBpZiB0aGUgYGV4cHJlc3Npb25gIGRpZCBub3QgaGF2ZSB0aGUgY29ycmVjdCBzaGFwZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldElpZmVCb2R5KGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiB0cy5Db25jaXNlQm9keXx1bmRlZmluZWQge1xuICBjb25zdCBjYWxsID0gc3RyaXBQYXJlbnRoZXNlcyhleHByZXNzaW9uKTtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGNhbGwpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IGZuID0gc3RyaXBQYXJlbnRoZXNlcyhjYWxsLmV4cHJlc3Npb24pO1xuICBpZiAoIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGZuKSAmJiAhdHMuaXNBcnJvd0Z1bmN0aW9uKGZuKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4gZm4uYm9keTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGBub2RlYCBpcyBhbiBhc3NpZ25tZW50IG9mIHRoZSBmb3JtIGBhID0gYmAuXG4gKlxuICogQHBhcmFtIG5vZGUgVGhlIEFTVCBub2RlIHRvIGNoZWNrLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBc3NpZ25tZW50KG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLkFzc2lnbm1lbnRFeHByZXNzaW9uPHRzLkVxdWFsc1Rva2VuPiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgbm9kZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW47XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgcHJvdmlkZWQgY2FsbCBleHByZXNzaW9uIHRhcmdldHMgYSBjbGFzcywgYnkgdmVyaWZ5aW5nIGl0cyBhcmd1bWVudHMgYXJlXG4gKiBhY2NvcmRpbmcgdG8gdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogX19kZWNvcmF0ZShbXSwgU29tZURpcmVjdGl2ZSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gY2FsbCB0aGUgY2FsbCBleHByZXNzaW9uIHRoYXQgaXMgdGVzdGVkIHRvIHJlcHJlc2VudCBhIGNsYXNzIGRlY29yYXRvciBjYWxsLlxuICogQHBhcmFtIG1hdGNoZXMgcHJlZGljYXRlIGZ1bmN0aW9uIHRvIHRlc3Qgd2hldGhlciB0aGUgY2FsbCBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGRlc2lyZWQgY2xhc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0NsYXNzRGVjb3JhdGVDYWxsKFxuICAgIGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uLCBtYXRjaGVzOiAoaWRlbnRpZmllcjogdHMuSWRlbnRpZmllcikgPT4gYm9vbGVhbik6XG4gICAgY2FsbCBpcyB0cy5DYWxsRXhwcmVzc2lvbiZ7YXJndW1lbnRzOiBbdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgdHMuRXhwcmVzc2lvbl19IHtcbiAgY29uc3QgaGVscGVyQXJncyA9IGNhbGwuYXJndW1lbnRzWzBdO1xuICBpZiAoaGVscGVyQXJncyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oaGVscGVyQXJncykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCB0YXJnZXQgPSBjYWxsLmFyZ3VtZW50c1sxXTtcbiAgcmV0dXJuIHRhcmdldCAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpICYmIG1hdGNoZXModGFyZ2V0KTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBwcm92aWRlZCBjYWxsIGV4cHJlc3Npb24gdGFyZ2V0cyBhIG1lbWJlciBvZiB0aGUgY2xhc3MsIGJ5IHZlcmlmeWluZyBpdHNcbiAqIGFyZ3VtZW50cyBhcmUgYWNjb3JkaW5nIHRvIHRoZSBmb2xsb3dpbmcgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIF9fZGVjb3JhdGUoW10sIFNvbWVEaXJlY3RpdmUucHJvdG90eXBlLCBcIm1lbWJlclwiLCB2b2lkIDApO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGNhbGwgdGhlIGNhbGwgZXhwcmVzc2lvbiB0aGF0IGlzIHRlc3RlZCB0byByZXByZXNlbnQgYSBtZW1iZXIgZGVjb3JhdG9yIGNhbGwuXG4gKiBAcGFyYW0gbWF0Y2hlcyBwcmVkaWNhdGUgZnVuY3Rpb24gdG8gdGVzdCB3aGV0aGVyIHRoZSBjYWxsIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGVzaXJlZCBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTWVtYmVyRGVjb3JhdGVDYWxsKFxuICAgIGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uLCBtYXRjaGVzOiAoaWRlbnRpZmllcjogdHMuSWRlbnRpZmllcikgPT4gYm9vbGVhbik6XG4gICAgY2FsbCBpcyB0cy5DYWxsRXhwcmVzc2lvbiZcbiAgICB7YXJndW1lbnRzOiBbdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgdHMuU3RyaW5nTGl0ZXJhbCwgdHMuU3RyaW5nTGl0ZXJhbF19IHtcbiAgY29uc3QgaGVscGVyQXJncyA9IGNhbGwuYXJndW1lbnRzWzBdO1xuICBpZiAoaGVscGVyQXJncyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oaGVscGVyQXJncykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCB0YXJnZXQgPSBjYWxsLmFyZ3VtZW50c1sxXTtcbiAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbih0YXJnZXQpIHx8XG4gICAgICAhdHMuaXNJZGVudGlmaWVyKHRhcmdldC5leHByZXNzaW9uKSB8fCAhbWF0Y2hlcyh0YXJnZXQuZXhwcmVzc2lvbikgfHxcbiAgICAgIHRhcmdldC5uYW1lLnRleHQgIT09ICdwcm90b3R5cGUnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgbWVtYmVyTmFtZSA9IGNhbGwuYXJndW1lbnRzWzJdO1xuICByZXR1cm4gbWVtYmVyTmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzU3RyaW5nTGl0ZXJhbChtZW1iZXJOYW1lKTtcbn1cblxuLyoqXG4gKiBIZWxwZXIgbWV0aG9kIHRvIGV4dHJhY3QgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgZ2l2ZW4gdGhlIHByb3BlcnR5J3MgXCJzeW1ib2xcIixcbiAqIHdoaWNoIGlzIGFjdHVhbGx5IHRoZSBzeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIHByb3BlcnR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocHJvcFN5bWJvbDogdHMuU3ltYm9sKTogdHMuRXhwcmVzc2lvbnx1bmRlZmluZWQge1xuICBjb25zdCBwcm9wSWRlbnRpZmllciA9IHByb3BTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgY29uc3QgcGFyZW50ID0gcHJvcElkZW50aWZpZXIgJiYgcHJvcElkZW50aWZpZXIucGFyZW50O1xuICByZXR1cm4gcGFyZW50ICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihwYXJlbnQpID8gcGFyZW50LnJpZ2h0IDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEEgY2FsbGVlIGNvdWxkIGJlIG9uZSBvZjogYF9fZGVjb3JhdGUoLi4uKWAgb3IgYHRzbGliXzEuX19kZWNvcmF0ZWAuXG4gKi9cbmZ1bmN0aW9uIGdldENhbGxlZU5hbWUoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pOiBzdHJpbmd8bnVsbCB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIoY2FsbC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBzdHJpcERvbGxhclN1ZmZpeChjYWxsLmV4cHJlc3Npb24udGV4dCk7XG4gIH1cbiAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gc3RyaXBEb2xsYXJTdWZmaXgoY2FsbC5leHByZXNzaW9uLm5hbWUudGV4dCk7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vLy8vLy8vLy8vLy8gSW50ZXJuYWwgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbnR5cGUgSW5pdGlhbGl6ZWRWYXJpYWJsZUNsYXNzRGVjbGFyYXRpb24gPVxuICAgIENsYXNzRGVjbGFyYXRpb248dHMuVmFyaWFibGVEZWNsYXJhdGlvbj4me2luaXRpYWxpemVyOiB0cy5FeHByZXNzaW9ufTtcblxuZnVuY3Rpb24gaXNJbml0aWFsaXplZFZhcmlhYmxlQ2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTpcbiAgICBub2RlIGlzIEluaXRpYWxpemVkVmFyaWFibGVDbGFzc0RlY2xhcmF0aW9uIHtcbiAgcmV0dXJuIGlzTmFtZWRWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuaW5pdGlhbGl6ZXIgIT09IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBIYW5kbGUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9ybVxuICpcbiAqIGBgYFxuICogdmFyIE15Q2xhc3MgPSBhbGlhczEgPSBhbGlhczIgPSA8PGRlY2xhcmF0aW9uPj5cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBMSFMgb2YgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAqIEByZXR1cm5zIHRoZSBvcmlnaW5hbCBBU1Qgbm9kZSBvciB0aGUgUkhTIG9mIGEgc2VyaWVzIG9mIGFzc2lnbm1lbnRzIGluIGEgdmFyaWFibGVcbiAqICAgICBkZWNsYXJhdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNraXBDbGFzc0FsaWFzZXMobm9kZTogSW5pdGlhbGl6ZWRWYXJpYWJsZUNsYXNzRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgbGV0IGV4cHJlc3Npb24gPSBub2RlLmluaXRpYWxpemVyO1xuICB3aGlsZSAoaXNBc3NpZ25tZW50KGV4cHJlc3Npb24pKSB7XG4gICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24ucmlnaHQ7XG4gIH1cbiAgcmV0dXJuIGV4cHJlc3Npb247XG59XG5cbi8qKlxuICogVGhpcyBleHByZXNzaW9uIGNvdWxkIGVpdGhlciBiZSBhIGNsYXNzIGV4cHJlc3Npb25cbiAqXG4gKiBgYGBcbiAqIGNsYXNzIE15Q2xhc3Mge307XG4gKiBgYGBcbiAqXG4gKiBvciBhbiBJSUZFIHdyYXBwZWQgY2xhc3MgZXhwcmVzc2lvblxuICpcbiAqIGBgYFxuICogKCgpID0+IHtcbiAqICAgY2xhc3MgTXlDbGFzcyB7fVxuICogICAuLi5cbiAqICAgcmV0dXJuIE15Q2xhc3M7XG4gKiB9KSgpXG4gKiBgYGBcbiAqXG4gKiBvciBhbiBJSUZFIHdyYXBwZWQgYWxpYXNlZCBjbGFzcyBleHByZXNzaW9uXG4gKlxuICogYGBgXG4gKiAoKCkgPT4ge1xuICogICBsZXQgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge31cbiAqICAgLi4uXG4gKiAgIHJldHVybiBNeUNsYXNzO1xuICogfSkoKVxuICogYGBgXG4gKlxuICogb3IgYW4gSUZGRSB3cmFwcGVkIEVTNSBjbGFzcyBmdW5jdGlvblxuICpcbiAqIGBgYFxuICogKGZ1bmN0aW9uICgpIHtcbiAqICBmdW5jdGlvbiBNeUNsYXNzKCkge31cbiAqICAuLi5cbiAqICByZXR1cm4gTXlDbGFzc1xuICogfSkoKVxuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIG5vZGUgdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyB3aG9zZSBkZWNsYXJhdGlvbiB3ZSBhcmUgZmluZGluZy5cbiAqIEByZXR1cm5zIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3Mgb3IgYG51bGxgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldElubmVyQ2xhc3NEZWNsYXJhdGlvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTpcbiAgICBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRXhwcmVzc2lvbnx0cy5DbGFzc0RlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRGVjbGFyYXRpb24+fG51bGwge1xuICBpZiAodHMuaXNDbGFzc0V4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgaGFzTmFtZUlkZW50aWZpZXIoZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gZXhwcmVzc2lvbjtcbiAgfVxuXG4gIGNvbnN0IGlpZmVCb2R5ID0gZ2V0SWlmZUJvZHkoZXhwcmVzc2lvbik7XG4gIGlmIChpaWZlQm9keSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoIXRzLmlzQmxvY2soaWlmZUJvZHkpKSB7XG4gICAgLy8gSGFuZGxlIHRoZSBmYXQgYXJyb3cgZXhwcmVzc2lvbiBjYXNlOiBgKCkgPT4gQ2xhc3NFeHByZXNzaW9uYFxuICAgIHJldHVybiB0cy5pc0NsYXNzRXhwcmVzc2lvbihpaWZlQm9keSkgJiYgaXNOYW1lZERlY2xhcmF0aW9uKGlpZmVCb2R5KSA/IGlpZmVCb2R5IDogbnVsbDtcbiAgfSBlbHNlIHtcbiAgICAvLyBIYW5kbGUgdGhlIGNhc2Ugb2YgYSBub3JtYWwgb3IgZmF0LWFycm93IGZ1bmN0aW9uIHdpdGggYSBib2R5LlxuICAgIC8vIFJldHVybiB0aGUgZmlyc3QgQ2xhc3NEZWNsYXJhdGlvbi9WYXJpYWJsZURlY2xhcmF0aW9uIGluc2lkZSB0aGUgYm9keVxuICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIGlpZmVCb2R5LnN0YXRlbWVudHMpIHtcbiAgICAgIGlmIChpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihzdGF0ZW1lbnQpIHx8IGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uKHN0YXRlbWVudCkpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlbWVudDtcbiAgICAgIH1cbiAgICAgIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucykge1xuICAgICAgICAgIGlmIChpc0luaXRpYWxpemVkVmFyaWFibGVDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IHNraXBDbGFzc0FsaWFzZXMoZGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgaWYgKHRzLmlzQ2xhc3NFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmIGhhc05hbWVJZGVudGlmaWVyKGV4cHJlc3Npb24pKSB7XG4gICAgICAgICAgICAgIHJldHVybiBleHByZXNzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXREZWNvcmF0b3JBcmdzKG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbltdIHtcbiAgLy8gVGhlIGFyZ3VtZW50cyBvZiBhIGRlY29yYXRvciBhcmUgaGVsZCBpbiB0aGUgYGFyZ3NgIHByb3BlcnR5IG9mIGl0cyBkZWNsYXJhdGlvbiBvYmplY3QuXG4gIGNvbnN0IGFyZ3NQcm9wZXJ0eSA9IG5vZGUucHJvcGVydGllcy5maWx0ZXIodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuZmluZChwcm9wZXJ0eSA9PiBnZXROYW1lVGV4dChwcm9wZXJ0eS5uYW1lKSA9PT0gJ2FyZ3MnKTtcbiAgY29uc3QgYXJnc0V4cHJlc3Npb24gPSBhcmdzUHJvcGVydHkgJiYgYXJnc1Byb3BlcnR5LmluaXRpYWxpemVyO1xuICByZXR1cm4gYXJnc0V4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGFyZ3NFeHByZXNzaW9uKSA/XG4gICAgICBBcnJheS5mcm9tKGFyZ3NFeHByZXNzaW9uLmVsZW1lbnRzKSA6XG4gICAgICBbXTtcbn1cblxuZnVuY3Rpb24gaXNQcm9wZXJ0eUFjY2Vzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24mXG4gICAge3BhcmVudDogdHMuQmluYXJ5RXhwcmVzc2lvbn0ge1xuICByZXR1cm4gISFub2RlLnBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZS5wYXJlbnQpICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpc1RoaXNBc3NpZ25tZW50KG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5CaW5hcnlFeHByZXNzaW9uJlxuICAgIHtsZWZ0OiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpICYmXG4gICAgICBub2RlLmxlZnQuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkO1xufVxuXG5mdW5jdGlvbiBpc05hbWVkRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuTmFtZWREZWNsYXJhdGlvbiZ7bmFtZTogdHMuSWRlbnRpZmllcn0ge1xuICBjb25zdCBhbnlOb2RlOiBhbnkgPSBub2RlO1xuICByZXR1cm4gISFhbnlOb2RlLm5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKGFueU5vZGUubmFtZSk7XG59XG5cblxuZnVuY3Rpb24gaXNDbGFzc01lbWJlclR5cGUobm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLkNsYXNzRWxlbWVudHxcbiAgICB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb258dHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIHJldHVybiAodHMuaXNDbGFzc0VsZW1lbnQobm9kZSkgfHwgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSB8fCB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkpICYmXG4gICAgICAvLyBBZGRpdGlvbmFsbHksIGVuc3VyZSBgbm9kZWAgaXMgbm90IGFuIGluZGV4IHNpZ25hdHVyZSwgZm9yIGV4YW1wbGUgb24gYW4gYWJzdHJhY3QgY2xhc3M6XG4gICAgICAvLyBgYWJzdHJhY3QgY2xhc3MgRm9vIHsgW2tleTogc3RyaW5nXTogYW55OyB9YFxuICAgICAgIXRzLmlzSW5kZXhTaWduYXR1cmVEZWNsYXJhdGlvbihub2RlKTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRoYXQgdGhlIGdpdmVuIGRlY2xhcmF0aW9uIGlzIGFzc2lnbmVkIHRvLlxuICogRm9yIGV4YW1wbGUsIGZvciB0aGUgZm9sbG93aW5nIGNvZGU6XG4gKlxuICogYGBgXG4gKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYFxuICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSAoKCkgPT4ge1xuICogICBjbGFzcyBNeUNsYXNzIHt9XG4gKiAgIC4uLlxuICogICByZXR1cm4gTXlDbGFzcztcbiAqIH0pKClcbiAgYGBgXG4gKlxuICogYW5kIHRoZSBwcm92aWRlZCBkZWNsYXJhdGlvbiBiZWluZyBgY2xhc3MgTXlDbGFzcyB7fWAsIHRoaXMgd2lsbCByZXR1cm4gdGhlIGB2YXIgTXlDbGFzc2BcbiAqIGRlY2xhcmF0aW9uLlxuICpcbiAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gZm9yIHdoaWNoIGFueSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzaG91bGQgYmUgb2J0YWluZWQuXG4gKiBAcmV0dXJucyB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24gaWYgZm91bmQsIHVuZGVmaW5lZCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGdldEZhckxlZnRIYW5kU2lkZU9mQXNzaWdubWVudChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9ufFxuICAgIHVuZGVmaW5lZCB7XG4gIGxldCBub2RlID0gZGVjbGFyYXRpb24ucGFyZW50O1xuXG4gIC8vIERldGVjdCBhbiBpbnRlcm1lZGlhcnkgdmFyaWFibGUgYXNzaWdubWVudCBhbmQgc2tpcCBvdmVyIGl0LlxuICBpZiAoaXNBc3NpZ25tZW50KG5vZGUpICYmIHRzLmlzSWRlbnRpZmllcihub2RlLmxlZnQpKSB7XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG5cbiAgcmV0dXJuIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSA/IG5vZGUgOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGdldENvbnRhaW5pbmdWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiBDbGFzc0RlY2xhcmF0aW9uPHRzLlZhcmlhYmxlRGVjbGFyYXRpb24+fFxuICAgIHVuZGVmaW5lZCB7XG4gIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgd2hpbGUgKG5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChpc05hbWVkVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEEgY29uc3RydWN0b3IgZnVuY3Rpb24gbWF5IGhhdmUgYmVlbiBcInN5bnRoZXNpemVkXCIgYnkgVHlwZVNjcmlwdCBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0LFxuICogaW4gdGhlIGNhc2Ugbm8gdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgZS5nLiBwcm9wZXJ0eSBpbml0aWFsaXplcnMgYXJlIHVzZWQuXG4gKiBUaG9zZSBpbml0aWFsaXplcnMgbmVlZCB0byBiZSBlbWl0dGVkIGludG8gYSBjb25zdHJ1Y3RvciBpbiBKYXZhU2NyaXB0LCBzbyB0aGUgVHlwZVNjcmlwdFxuICogY29tcGlsZXIgZ2VuZXJhdGVzIGEgc3ludGhldGljIGNvbnN0cnVjdG9yLlxuICpcbiAqIFdlIG5lZWQgdG8gaWRlbnRpZnkgc3VjaCBjb25zdHJ1Y3RvcnMgYXMgbmdjYyBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgYSBjbGFzcyBkaWRcbiAqIG9yaWdpbmFsbHkgaGF2ZSBhIGNvbnN0cnVjdG9yIGluIHRoZSBUeXBlU2NyaXB0IHNvdXJjZS4gV2hlbiBhIGNsYXNzIGhhcyBhIHN1cGVyY2xhc3MsXG4gKiBhIHN5bnRoZXNpemVkIGNvbnN0cnVjdG9yIG11c3Qgbm90IGJlIGNvbnNpZGVyZWQgYXMgYSB1c2VyLWRlZmluZWQgY29uc3RydWN0b3IgYXMgdGhhdFxuICogcHJldmVudHMgYSBiYXNlIGZhY3RvcnkgY2FsbCBmcm9tIGJlaW5nIGNyZWF0ZWQgYnkgbmd0c2MsIHJlc3VsdGluZyBpbiBhIGZhY3RvcnkgZnVuY3Rpb25cbiAqIHRoYXQgZG9lcyBub3QgaW5qZWN0IHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlIHN1cGVyY2xhc3MuIEhlbmNlLCB3ZSBpZGVudGlmeSBhIGRlZmF1bHRcbiAqIHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgaW4gdGhlIGNvbnN0cnVjdG9yIGJvZHksIGFjY29yZGluZyB0byB0aGUgc3RydWN0dXJlIHRoYXQgVHlwZVNjcmlwdFxuICogZW1pdHMgZHVyaW5nIEphdmFTY3JpcHQgZW1pdDpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YzLjIuMi9zcmMvY29tcGlsZXIvdHJhbnNmb3JtZXJzL3RzLnRzI0wxMDY4LUwxMDgyXG4gKlxuICogQHBhcmFtIGNvbnN0cnVjdG9yIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gdG8gdGVzdFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgY29uc3RydWN0b3IgYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWRcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yOiB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGlmICghY29uc3RydWN0b3IuYm9keSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gY29uc3RydWN0b3IuYm9keS5zdGF0ZW1lbnRzWzBdO1xuICBpZiAoIWZpcnN0U3RhdGVtZW50IHx8ICF0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoZmlyc3RTdGF0ZW1lbnQpKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWRTdXBlckNhbGwoZmlyc3RTdGF0ZW1lbnQuZXhwcmVzc2lvbik7XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgZXhwcmVzc2lvbiBhcHBlYXJzIHRvIGhhdmUgYmVlbiBzeW50aGVzaXplZCBieSBUeXBlU2NyaXB0LCBpLmUuIHdoZXRoZXJcbiAqIGl0IGlzIG9mIHRoZSBmb2xsb3dpbmcgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiB0aGUgZXhwcmVzc2lvbiB0aGF0IGlzIHRvIGJlIHRlc3RlZFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBhcHBlYXJzIHRvIGJlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkU3VwZXJDYWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLmV4cHJlc3Npb24ua2luZCAhPT0gdHMuU3ludGF4S2luZC5TdXBlcktleXdvcmQpIHJldHVybiBmYWxzZTtcbiAgaWYgKGV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCAhPT0gMSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGFyZ3VtZW50ID0gZXhwcmVzc2lvbi5hcmd1bWVudHNbMF07XG4gIHJldHVybiB0cy5pc1NwcmVhZEVsZW1lbnQoYXJndW1lbnQpICYmIHRzLmlzSWRlbnRpZmllcihhcmd1bWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgYXJndW1lbnQuZXhwcmVzc2lvbi50ZXh0ID09PSAnYXJndW1lbnRzJztcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSBzdGF0ZW1lbnQgdGhhdCBjb250YWlucyB0aGUgZ2l2ZW4gbm9kZVxuICogQHBhcmFtIG5vZGUgYSBub2RlIHdob3NlIGNvbnRhaW5pbmcgc3RhdGVtZW50IHdlIHdpc2ggdG8gZmluZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGFpbmluZ1N0YXRlbWVudChub2RlOiB0cy5Ob2RlKTogdHMuU3RhdGVtZW50IHtcbiAgd2hpbGUgKG5vZGUucGFyZW50KSB7XG4gICAgaWYgKHRzLmlzQmxvY2sobm9kZS5wYXJlbnQpIHx8IHRzLmlzU291cmNlRmlsZShub2RlLnBhcmVudCkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIG5vZGUgYXMgdHMuU3RhdGVtZW50O1xufVxuXG5mdW5jdGlvbiBnZXRSb290RmlsZU9yRmFpbChidW5kbGU6IEJ1bmRsZVByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlIHtcbiAgY29uc3Qgcm9vdEZpbGUgPSBidW5kbGUucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGJ1bmRsZS5wYXRoKTtcbiAgaWYgKHJvb3RGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBnaXZlbiByb290UGF0aCAke3Jvb3RGaWxlfSBpcyBub3QgYSBmaWxlIG9mIHRoZSBwcm9ncmFtLmApO1xuICB9XG4gIHJldHVybiByb290RmlsZTtcbn1cblxuZnVuY3Rpb24gZ2V0Tm9uUm9vdFBhY2thZ2VGaWxlcyhidW5kbGU6IEJ1bmRsZVByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlW10ge1xuICBjb25zdCByb290RmlsZSA9IGJ1bmRsZS5wcm9ncmFtLmdldFNvdXJjZUZpbGUoYnVuZGxlLnBhdGgpO1xuICByZXR1cm4gYnVuZGxlLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoXG4gICAgICBmID0+IChmICE9PSByb290RmlsZSkgJiYgaXNXaXRoaW5QYWNrYWdlKGJ1bmRsZS5wYWNrYWdlLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGYpKSk7XG59XG5cbmZ1bmN0aW9uIGlzVG9wTGV2ZWwobm9kZTogdHMuTm9kZSk6IGJvb2xlYW4ge1xuICB3aGlsZSAobm9kZSA9IG5vZGUucGFyZW50KSB7XG4gICAgaWYgKHRzLmlzQmxvY2sobm9kZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogR2V0IGEgbm9kZSB0aGF0IHJlcHJlc2VudHMgdGhlIGFjdHVhbCAob3V0ZXIpIGRlY2xhcmF0aW9uIG9mIGEgY2xhc3MgZnJvbSBpdHMgaW1wbGVtZW50YXRpb24uXG4gKlxuICogU29tZXRpbWVzLCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhbiBleHByZXNzaW9uIHRoYXQgaXMgaGlkZGVuIGluc2lkZSBhbiBJSUZFIGFuZFxuICogYXNzaWduZWQgdG8gYSB2YXJpYWJsZSBvdXRzaWRlIHRoZSBJSUZFLCB3aGljaCBpcyB3aGF0IHRoZSByZXN0IG9mIHRoZSBwcm9ncmFtIGludGVyYWN0cyB3aXRoLlxuICogRm9yIGV4YW1wbGUsXG4gKlxuICogYGBgXG4gKiBPdXRlck5vZGUgPSBBbGlhcyA9IChmdW5jdGlvbigpIHsgZnVuY3Rpb24gSW5uZXJOb2RlKCkge30gcmV0dXJuIElubmVyTm9kZTsgfSkoKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBub2RlIGEgbm9kZSB0aGF0IGNvdWxkIGJlIHRoZSBpbXBsZW1lbnRhdGlvbiBpbnNpZGUgYW4gSUlGRS5cbiAqIEByZXR1cm5zIGEgbm9kZSB0aGF0IHJlcHJlc2VudHMgdGhlIG91dGVyIGRlY2xhcmF0aW9uLCBvciBgbnVsbGAgaWYgaXQgaXMgZG9lcyBub3QgbWF0Y2ggdGhlIElJRkVcbiAqICAgICBmb3JtYXQgc2hvd24gYWJvdmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPdXRlck5vZGVGcm9tSW5uZXJEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogdHMuTm9kZXxudWxsIHtcbiAgaWYgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkgJiYgIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSAmJlxuICAgICAgIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQobm9kZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEl0IG1pZ2h0IGJlIHRoZSBmdW5jdGlvbiBleHByZXNzaW9uIGluc2lkZSB0aGUgSUlGRS4gV2UgbmVlZCB0byBnbyA1IGxldmVscyB1cC4uLlxuXG4gIC8vIC0gSUlGRSBib2R5LlxuICBsZXQgb3V0ZXJOb2RlID0gbm9kZS5wYXJlbnQ7XG4gIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0Jsb2NrKG91dGVyTm9kZSkpIHJldHVybiBudWxsO1xuXG4gIC8vIC0gSUlGRSBmdW5jdGlvbiBleHByZXNzaW9uLlxuICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICBpZiAoIW91dGVyTm9kZSB8fCAoIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKG91dGVyTm9kZSkgJiYgIXRzLmlzQXJyb3dGdW5jdGlvbihvdXRlck5vZGUpKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG5cbiAgLy8gLSBQYXJlbnRoZXNpcyBpbnNpZGUgSUlGRS5cbiAgaWYgKG91dGVyTm9kZSAmJiB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG91dGVyTm9kZSkpIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG5cbiAgLy8gLSBJSUZFIGNhbGwgZXhwcmVzc2lvbi5cbiAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzQ2FsbEV4cHJlc3Npb24ob3V0ZXJOb2RlKSkgcmV0dXJuIG51bGw7XG4gIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG5cbiAgLy8gLSBQYXJlbnRoZXNpcyBhcm91bmQgSUlGRS5cbiAgaWYgKG91dGVyTm9kZSAmJiB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG91dGVyTm9kZSkpIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG5cbiAgLy8gLSBTa2lwIGFueSBhbGlhc2VzIGJldHdlZW4gdGhlIElJRkUgYW5kIHRoZSBmYXIgbGVmdCBoYW5kIHNpZGUgb2YgYW55IGFzc2lnbm1lbnRzLlxuICB3aGlsZSAoaXNBc3NpZ25tZW50KG91dGVyTm9kZS5wYXJlbnQpKSB7XG4gICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcbiAgfVxuXG4gIHJldHVybiBvdXRlck5vZGU7XG59XG4iXX0=