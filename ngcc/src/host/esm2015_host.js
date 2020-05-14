/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/ngcc/src/host/esm2015_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/ngcc/src/analysis/util", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/ngcc_host", "@angular/compiler-cli/ngcc/src/host/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getClassDeclarationFromInnerDeclaration = exports.getContainingStatement = exports.skipClassAliases = exports.getPropertyValueFromSymbol = exports.isMemberDecorateCall = exports.isClassDecorateCall = exports.isAssignment = exports.getIifeBody = exports.isAssignmentStatement = exports.Esm2015ReflectionHost = exports.CONSTRUCTOR_PARAMS = exports.CONSTRUCTOR = exports.PROP_DECORATORS = exports.DECORATORS = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
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
        tslib_1.__extends(Esm2015ReflectionHost, _super);
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
            return this.getClassSymbolFromInnerDeclaration(declaration);
        };
        /**
         * Examine a declaration (for example, of a class or function) and return metadata about any
         * decorators present on the declaration.
         *
         * @param declaration a TypeScript `ts.Declaration` node representing the class or function over
         * which to reflect. For example, if the intent is to reflect the decorators of a class and the
         * source is in ES6 format, this will be a `ts.ClassDeclaration` node. If the source is in ES5
         * format, this might be a `ts.VariableDeclaration` as classes in ES5 are represented as the
         * result of an IIFE execution.
         *
         * @returns an array of `Decorator` metadata if decorators are present on the declaration, or
         * `null` if either no decorators were present or if the declaration is not of a decoratable type.
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
            if (classSymbol === undefined ||
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
            if (classSymbol.adjacent !== undefined) {
                return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.adjacent.valueDeclaration);
            }
            else {
                return this.getNameFromClassSymbolDeclaration(classSymbol, classSymbol.implementation.valueDeclaration);
            }
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
            // If no declaration was found or it's an inline declaration, return as is.
            if (superDeclaration === null || superDeclaration.node === null) {
                return superDeclaration;
            }
            // If the declaration already has traits assigned to it, return as is.
            if (superDeclaration.known !== null || superDeclaration.identity !== null) {
                return superDeclaration;
            }
            var outerClassNode = getClassDeclarationFromInnerDeclaration(superDeclaration.node);
            var declaration = outerClassNode !== null ?
                this.getDeclarationOfIdentifier(outerClassNode.name) :
                superDeclaration;
            if (declaration === null || declaration.node === null || declaration.known !== null) {
                return declaration;
            }
            // The identifier may have been of an additional class assignment such as `MyClass_1` that was
            // present as alias for `MyClass`. If so, resolve such aliases to their original declaration.
            var aliasedIdentifier = this.resolveAliasedClassIdentifier(declaration.node);
            if (aliasedIdentifier !== null) {
                return this.getDeclarationOfIdentifier(aliasedIdentifier);
            }
            // Variable declarations may represent an enum declaration, so attempt to resolve its members.
            if (ts.isVariableDeclaration(declaration.node)) {
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
                utils_1.findAll(module, ngcc_host_1.isSwitchableVariableDeclaration) :
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
            var classes = [];
            this.getModuleStatements(sourceFile).forEach(function (statement) {
                if (ts.isVariableStatement(statement)) {
                    statement.declarationList.declarations.forEach(function (declaration) {
                        var classSymbol = _this.getClassSymbol(declaration);
                        if (classSymbol) {
                            classes.push(classSymbol);
                        }
                    });
                }
                else if (ts.isClassDeclaration(statement)) {
                    var classSymbol = _this.getClassSymbol(statement);
                    if (classSymbol) {
                        classes.push(classSymbol);
                    }
                }
            });
            return classes;
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
            // Try to retrieve the dts declaration from the public map
            if (this.publicDtsDeclarationMap === null) {
                this.publicDtsDeclarationMap = this.computePublicDtsDeclarationMap(this.src, this.dts);
            }
            if (this.publicDtsDeclarationMap.has(declaration)) {
                return this.publicDtsDeclarationMap.get(declaration);
            }
            // No public export, try the private map
            if (this.privateDtsDeclarationMap === null) {
                this.privateDtsDeclarationMap = this.computePrivateDtsDeclarationMap(this.src, this.dts);
            }
            if (this.privateDtsDeclarationMap.has(declaration)) {
                return this.privateDtsDeclarationMap.get(declaration);
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
            if (reflection_1.isNamedClassDeclaration(declaration) && isTopLevel(declaration)) {
                return this.createClassSymbol(declaration, null);
            }
            // Otherwise, an outer class declaration must be an initialized variable declaration:
            if (!isInitializedVariableClassDeclaration(declaration)) {
                return undefined;
            }
            var innerDeclaration = getInnerClassDeclaration(skipClassAliases(declaration));
            if (innerDeclaration !== null) {
                return this.createClassSymbol(declaration, innerDeclaration);
            }
            return undefined;
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
            if (ts.isClassExpression(declaration) && utils_1.hasNameIdentifier(declaration)) {
                // Handle `let MyClass = MyClass_1 = class MyClass {};`
                outerDeclaration = getFarLeftHandSideOfAssignment(declaration);
                // Handle this being in an IIFE
                if (outerDeclaration !== undefined && !isTopLevel(outerDeclaration)) {
                    outerDeclaration = getContainingVariableDeclaration(outerDeclaration);
                }
            }
            else if (reflection_1.isNamedClassDeclaration(declaration)) {
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
            if (outerDeclaration === undefined || !utils_1.hasNameIdentifier(outerDeclaration)) {
                return undefined;
            }
            return this.createClassSymbol(outerDeclaration, declaration);
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
            var declarationSymbol = this.checker.getSymbolAtLocation(outerDeclaration.name);
            if (declarationSymbol === undefined) {
                return undefined;
            }
            var implementationSymbol = declarationSymbol;
            if (innerDeclaration !== null && isNamedDeclaration(innerDeclaration)) {
                implementationSymbol = this.checker.getSymbolAtLocation(innerDeclaration.name);
            }
            if (implementationSymbol === undefined) {
                return undefined;
            }
            var classSymbol = {
                name: declarationSymbol.name,
                declaration: declarationSymbol,
                implementation: implementationSymbol,
            };
            var adjacent = this.getAdjacentSymbol(declarationSymbol, implementationSymbol);
            if (adjacent !== null) {
                classSymbol.adjacent = adjacent;
            }
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
            if (adjacentDeclaration === undefined || !reflection_1.isNamedVariableDeclaration(adjacentDeclaration)) {
                return undefined;
            }
            var adjacentSymbol = this.checker.getSymbolAtLocation(adjacentDeclaration.name);
            if (adjacentSymbol === declarationSymbol || adjacentSymbol === implementationSymbol) {
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
                    for (var _b = tslib_1.__values(this.getModuleStatements(sourceFile)), _c = _b.next(); !_c.done; _c = _b.next()) {
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
            if (aliasedDeclaration === null || aliasedDeclaration.node === null) {
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
         * In some cases, a static property can either be set on the inner declaration inside the class'
         * IIFE, or it can be set on the outer variable declaration. Therefore, the host checks both
         * places, first looking up the property on the inner symbol, and if the property is not found it
         * will fall back to looking up the property on the outer symbol.
         *
         * @param symbol the class whose property we are interested in.
         * @param propertyName the name of static property.
         * @returns the symbol if it is found or `undefined` if not.
         */
        Esm2015ReflectionHost.prototype.getStaticProperty = function (symbol, propertyName) {
            return symbol.implementation.exports && symbol.implementation.exports.get(propertyName) ||
                symbol.declaration.exports && symbol.declaration.exports.get(propertyName);
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
                        members.push.apply(members, tslib_1.__spread(reflectedMembers));
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
                        members.push.apply(members, tslib_1.__spread(reflectedMembers));
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
                            members.push.apply(members, tslib_1.__spread(reflectedMembers));
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
                                members.push.apply(members, tslib_1.__spread(reflectedMembers));
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
                var propertiesMap = reflection_1.reflectObjectLiteral(propDecoratorsMap);
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
            var adjacentDeclaration = this.getAdjacentNameOfClass((classSymbol.declaration.valueDeclaration)).parent;
            var matchesClass = function (identifier) {
                var decl = _this.getDeclarationOfIdentifier(identifier);
                return decl !== null &&
                    (decl.node === adjacentDeclaration || decl.node === outerDeclaration ||
                        decl.node === innerDeclaration);
            };
            try {
                for (var helperCalls_1 = tslib_1.__values(helperCalls), helperCalls_1_1 = helperCalls_1.next(); !helperCalls_1_1.done; helperCalls_1_1 = helperCalls_1.next()) {
                    var helperCall = helperCalls_1_1.value;
                    if (isClassDecorateCall(helperCall, matchesClass)) {
                        // This `__decorate` call is targeting the class itself.
                        var helperArgs = helperCall.arguments[0];
                        try {
                            for (var _d = (e_3 = void 0, tslib_1.__values(helperArgs.elements)), _e = _d.next(); !_e.done; _e = _d.next()) {
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
                            for (var _f = (e_4 = void 0, tslib_1.__values(helperArgs.elements)), _g = _f.next(); !_g.done; _g = _f.next()) {
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
            if (!reflection_1.isDecoratorIdentifier(decoratorExpression)) {
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
                        var decorator = reflection_1.reflectObjectLiteral(node);
                        // Is the value of the `type` property an identifier?
                        if (decorator.has('type')) {
                            var decoratorType = decorator.get('type');
                            if (reflection_1.isDecoratorIdentifier(decoratorType)) {
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
                var typeValueReference = null;
                if (typeExpression !== null) {
                    // `typeExpression` is an expression in a "type" context. Resolve it to a declared value.
                    // Either it's a reference to an imported type, or a type declared locally. Distinguish the
                    // two cases with `getDeclarationOfExpression`.
                    var decl = _this.getDeclarationOfExpression(typeExpression);
                    if (decl !== null && decl.node !== null && decl.viaModule !== null &&
                        isNamedDeclaration(decl.node)) {
                        typeValueReference = {
                            local: false,
                            valueDeclaration: decl.node,
                            moduleName: decl.viaModule,
                            importedName: decl.node.name.text,
                            nestedPath: null,
                        };
                    }
                    else {
                        typeValueReference = {
                            local: true,
                            expression: typeExpression,
                            defaultImportStatement: null,
                        };
                    }
                }
                return {
                    name: utils_1.getNameText(nameNode),
                    nameNode: nameNode,
                    typeValueReference: typeValueReference,
                    typeNode: null,
                    decorators: decorators
                };
            });
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
                        return ts.isObjectLiteralExpression(element) ? reflection_1.reflectObjectLiteral(element) : null;
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
                for (var dtsFiles_1 = tslib_1.__values(dtsFiles), dtsFiles_1_1 = dtsFiles_1.next(); !dtsFiles_1_1.done; dtsFiles_1_1 = dtsFiles_1.next()) {
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
                for (var srcFiles_1 = tslib_1.__values(srcFiles), srcFiles_1_1 = srcFiles_1.next(); !srcFiles_1_1.done; srcFiles_1_1 = srcFiles_1.next()) {
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
                    for (var fileExports_1 = tslib_1.__values(fileExports), fileExports_1_1 = fileExports_1.next(); !fileExports_1_1.done; fileExports_1_1 = fileExports_1.next()) {
                        var _b = tslib_1.__read(fileExports_1_1.value, 2), exportName = _b[0], declaration = _b[1].node;
                        if (declaration !== null && dtsDeclarationMap.has(exportName)) {
                            declarationMap.set(declaration, dtsDeclarationMap.get(exportName));
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
            if (!namespaceDecl || namespaceDecl.node === null || !ts.isSourceFile(namespaceDecl.node)) {
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
            return tslib_1.__assign(tslib_1.__assign({}, exportDecl), { viaModule: namespaceDecl.viaModule });
        };
        /** Checks if the specified declaration resolves to the known JavaScript global `Object`. */
        Esm2015ReflectionHost.prototype.isJavaScriptObjectDeclaration = function (decl) {
            if (decl.node === null) {
                return false;
            }
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
            var iife = utils_2.stripParentheses(subsequentStmt.expression);
            if (!ts.isCallExpression(iife) || !isEnumDeclarationIife(iife))
                return null;
            var fn = utils_2.stripParentheses(iife.expression);
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
                for (var _b = tslib_1.__values(fn.body.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
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
        var call = utils_2.stripParentheses(expression);
        if (!ts.isCallExpression(call)) {
            return undefined;
        }
        var fn = utils_2.stripParentheses(call.expression);
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
            return utils_1.stripDollarSuffix(call.expression.text);
        }
        if (ts.isPropertyAccessExpression(call.expression)) {
            return utils_1.stripDollarSuffix(call.expression.name.text);
        }
        return null;
    }
    function isInitializedVariableClassDeclaration(node) {
        return reflection_1.isNamedVariableDeclaration(node) && node.initializer !== undefined;
    }
    /**
     * Handle a variable declaration of the form
     *
     * ```
     * var MyClass = alias1 = alias2 = <<declaration>>
     * ```
     *
     * @node the LHS of a variable declaration.
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
        if (ts.isClassExpression(expression) && utils_1.hasNameIdentifier(expression)) {
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
                for (var _c = tslib_1.__values(iifeBody.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var statement = _d.value;
                    if (reflection_1.isNamedClassDeclaration(statement) || reflection_1.isNamedFunctionDeclaration(statement)) {
                        return statement;
                    }
                    if (ts.isVariableStatement(statement)) {
                        try {
                            for (var _e = (e_10 = void 0, tslib_1.__values(statement.declarationList.declarations)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var declaration = _f.value;
                                if (isInitializedVariableClassDeclaration(declaration)) {
                                    var expression_1 = skipClassAliases(declaration);
                                    if (ts.isClassExpression(expression_1) && utils_1.hasNameIdentifier(expression_1)) {
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
    function getDecoratorArgs(node) {
        // The arguments of a decorator are held in the `args` property of its declaration object.
        var argsProperty = node.properties.filter(ts.isPropertyAssignment)
            .find(function (property) { return utils_1.getNameText(property.name) === 'args'; });
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
            if (reflection_1.isNamedVariableDeclaration(node)) {
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
        return bundle.program.getSourceFiles().filter(function (f) { return (f !== rootFile) && util_1.isWithinPackage(bundle.package, f); });
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
     * Get the actual (outer) declaration of a class.
     *
     * In ES5, the implementation of a class is a function expression that is hidden inside an IIFE and
     * returned to be assigned to a variable outside the IIFE, which is what the rest of the program
     * interacts with.
     *
     * Given the inner function declaration, we want to get to the declaration of the outer variable
     * that represents the class.
     *
     * @param node a node that could be the function expression inside an ES5 class IIFE.
     * @returns the outer variable declaration or `undefined` if it is not a "class".
     */
    function getClassDeclarationFromInnerDeclaration(node) {
        if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
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
            // - Outer variable declaration.
            if (!outerNode || !ts.isVariableDeclaration(outerNode))
                return null;
            // Finally, ensure that the variable declaration has a `name` identifier.
            return utils_1.hasNameIdentifier(outerNode) ? outerNode : null;
        }
        return null;
    }
    exports.getClassDeclarationFromInnerDeclaration = getClassDeclarationFromInnerDeclaration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMseUVBQXNXO0lBQ3RXLHFFQUFpRDtJQUdqRCw4REFBK0Y7SUFFL0YsMkVBQTRKO0lBQzVKLG1FQUF5QztJQUU1QixRQUFBLFVBQVUsR0FBRyxZQUEyQixDQUFDO0lBQ3pDLFFBQUEsZUFBZSxHQUFHLGdCQUErQixDQUFDO0lBQ2xELFFBQUEsV0FBVyxHQUFHLGVBQThCLENBQUM7SUFDN0MsUUFBQSxrQkFBa0IsR0FBRyxnQkFBK0IsQ0FBQztJQUVsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0EwQkc7SUFDSDtRQUEyQyxpREFBd0I7UUFnRGpFLCtCQUNjLE1BQWMsRUFBWSxNQUFlLEVBQVksR0FBa0IsRUFDdkUsR0FBOEI7WUFBOUIsb0JBQUEsRUFBQSxVQUE4QjtZQUY1QyxZQUdFLGtCQUFNLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsU0FDcEM7WUFIYSxZQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVksWUFBTSxHQUFOLE1BQU0sQ0FBUztZQUFZLFNBQUcsR0FBSCxHQUFHLENBQWU7WUFDdkUsU0FBRyxHQUFILEdBQUcsQ0FBMkI7WUFqRDVDOzs7Ozs7ZUFNRztZQUNPLDZCQUF1QixHQUE2QyxJQUFJLENBQUM7WUFDbkY7Ozs7OztlQU1HO1lBQ08sOEJBQXdCLEdBQTZDLElBQUksQ0FBQztZQUVwRjs7ZUFFRztZQUNPLDZCQUF1QixHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBRTdEOzs7Ozs7Ozs7Ozs7OztlQWNHO1lBQ08sOEJBQXdCLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFOUU7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O1lBQ0QsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFFN0IsNkJBQTZCO1lBQzdCLElBQUksU0FBUyxJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUM7Z0JBQUUsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFFdkYsMEJBQTBCO1lBQzFCLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBQy9ELFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBRTdCLDZCQUE2QjtZQUM3QixJQUFJLFNBQVMsSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDO2dCQUFFLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBRXZGLGdDQUFnQztZQUNoQyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUVwRSx5RUFBeUU7WUFDekUsT0FBTyx5QkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7U0FDeEQ7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFsQ0QsMEZBa0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBDdG9yUGFyYW1ldGVyLCBEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBFbnVtTWVtYmVyLCBpc0RlY29yYXRvcklkZW50aWZpZXIsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBpc05hbWVkRnVuY3Rpb25EZWNsYXJhdGlvbiwgaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24sIEtub3duRGVjbGFyYXRpb24sIHJlZmxlY3RPYmplY3RMaXRlcmFsLCBTcGVjaWFsRGVjbGFyYXRpb25LaW5kLCBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QsIFR5cGVWYWx1ZVJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4uL2FuYWx5c2lzL3V0aWwnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7QnVuZGxlUHJvZ3JhbX0gZnJvbSAnLi4vcGFja2FnZXMvYnVuZGxlX3Byb2dyYW0nO1xuaW1wb3J0IHtmaW5kQWxsLCBnZXROYW1lVGV4dCwgaGFzTmFtZUlkZW50aWZpZXIsIGlzRGVmaW5lZCwgc3RyaXBEb2xsYXJTdWZmaXh9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtDbGFzc1N5bWJvbCwgaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbiwgTmdjY0NsYXNzU3ltYm9sLCBOZ2NjUmVmbGVjdGlvbkhvc3QsIFBSRV9SM19NQVJLRVIsIFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9ufSBmcm9tICcuL25nY2NfaG9zdCc7XG5pbXBvcnQge3N0cmlwUGFyZW50aGVzZXN9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgY29uc3QgREVDT1JBVE9SUyA9ICdkZWNvcmF0b3JzJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBQUk9QX0RFQ09SQVRPUlMgPSAncHJvcERlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IENPTlNUUlVDVE9SID0gJ19fY29uc3RydWN0b3InIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IENPTlNUUlVDVE9SX1BBUkFNUyA9ICdjdG9yUGFyYW1ldGVycycgYXMgdHMuX19TdHJpbmc7XG5cbi8qKlxuICogRXNtMjAxNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgMjAxNSBjbGFzc2VzLCBldGMuXG4gKiBEZWNvcmF0b3JzIGFyZSBkZWZpbmVkIHZpYSBzdGF0aWMgcHJvcGVydGllcyBvbiB0aGUgY2xhc3MuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogY2xhc3MgU29tZURpcmVjdGl2ZSB7XG4gKiB9XG4gKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gKiAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gKiAgIFwiaW5wdXQxXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqICAgXCJpbnB1dDJcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogfTtcbiAqIGBgYFxuICpcbiAqICogQ2xhc3NlcyBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICovXG5leHBvcnQgY2xhc3MgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IGltcGxlbWVudHMgTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgLyoqXG4gICAqIEEgbWFwcGluZyBmcm9tIHNvdXJjZSBkZWNsYXJhdGlvbnMgdG8gdHlwaW5ncyBkZWNsYXJhdGlvbnMsIHdoaWNoIGFyZSBib3RoIHB1YmxpY2x5IGV4cG9ydGVkLlxuICAgKlxuICAgKiBUaGVyZSBzaG91bGQgYmUgb25lIGVudHJ5IGZvciBldmVyeSBwdWJsaWMgZXhwb3J0IHZpc2libGUgZnJvbSB0aGUgcm9vdCBmaWxlIG9mIHRoZSBzb3VyY2VcbiAgICogdHJlZS4gTm90ZSB0aGF0IGJ5IGRlZmluaXRpb24gdGhlIGtleSBhbmQgdmFsdWUgZGVjbGFyYXRpb25zIHdpbGwgbm90IGJlIGluIHRoZSBzYW1lIFRTXG4gICAqIHByb2dyYW0uXG4gICAqL1xuICBwcm90ZWN0ZWQgcHVibGljRHRzRGVjbGFyYXRpb25NYXA6IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+fG51bGwgPSBudWxsO1xuICAvKipcbiAgICogQSBtYXBwaW5nIGZyb20gc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucywgd2hpY2ggYXJlIG5vdCBwdWJsaWNseSBleHBvcnRlZC5cbiAgICpcbiAgICogVGhpcyBtYXBwaW5nIGlzIGEgYmVzdCBndWVzcyBiZXR3ZWVuIGRlY2xhcmF0aW9ucyB0aGF0IGhhcHBlbiB0byBiZSBleHBvcnRlZCBmcm9tIHRoZWlyIGZpbGUgYnlcbiAgICogdGhlIHNhbWUgbmFtZSBpbiBib3RoIHRoZSBzb3VyY2UgYW5kIHRoZSBkdHMgZmlsZS4gTm90ZSB0aGF0IGJ5IGRlZmluaXRpb24gdGhlIGtleSBhbmQgdmFsdWVcbiAgICogZGVjbGFyYXRpb25zIHdpbGwgbm90IGJlIGluIHRoZSBzYW1lIFRTIHByb2dyYW0uXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwOiBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLkRlY2xhcmF0aW9uPnxudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogVGhlIHNldCBvZiBzb3VyY2UgZmlsZXMgdGhhdCBoYXZlIGFscmVhZHkgYmVlbiBwcmVwcm9jZXNzZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJlcHJvY2Vzc2VkU291cmNlRmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgLyoqXG4gICAqIEluIEVTMjAxNSwgY2xhc3MgZGVjbGFyYXRpb25zIG1heSBoYXZlIGJlZW4gZG93bi1sZXZlbGVkIGludG8gdmFyaWFibGUgZGVjbGFyYXRpb25zLFxuICAgKiBpbml0aWFsaXplZCB1c2luZyBhIGNsYXNzIGV4cHJlc3Npb24uIEluIGNlcnRhaW4gc2NlbmFyaW9zLCBhbiBhZGRpdGlvbmFsIHZhcmlhYmxlXG4gICAqIGlzIGludHJvZHVjZWQgdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyBzbyB0aGF0IHJlc3VsdHMgaW4gY29kZSBzdWNoIGFzOlxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IE15Q2xhc3NfMTsgbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBtYXAgdHJhY2tzIHRob3NlIGFsaWFzZWQgdmFyaWFibGVzIHRvIHRoZWlyIG9yaWdpbmFsIGlkZW50aWZpZXIsIGkuZS4gdGhlIGtleVxuICAgKiBjb3JyZXNwb25kcyB3aXRoIHRoZSBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc18xYCBhbmQgaXRzIHZhbHVlIGJlY29tZXMgdGhlIGBNeUNsYXNzYCBpZGVudGlmaWVyXG4gICAqIG9mIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogVGhpcyBtYXAgaXMgcG9wdWxhdGVkIGR1cmluZyB0aGUgcHJlcHJvY2Vzc2luZyBvZiBlYWNoIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLklkZW50aWZpZXI+KCk7XG5cbiAgLyoqXG4gICAqIENhY2hlcyB0aGUgaW5mb3JtYXRpb24gb2YgdGhlIGRlY29yYXRvcnMgb24gYSBjbGFzcywgYXMgdGhlIHdvcmsgaW52b2x2ZWQgd2l0aCBleHRyYWN0aW5nXG4gICAqIGRlY29yYXRvcnMgaXMgY29tcGxleCBhbmQgZnJlcXVlbnRseSB1c2VkLlxuICAgKlxuICAgKiBUaGlzIG1hcCBpcyBsYXppbHkgcG9wdWxhdGVkIGR1cmluZyB0aGUgZmlyc3QgY2FsbCB0byBgYWNxdWlyZURlY29yYXRvckluZm9gIGZvciBhIGdpdmVuIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGRlY29yYXRvckNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3JJbmZvPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIGxvZ2dlcjogTG9nZ2VyLCBwcm90ZWN0ZWQgaXNDb3JlOiBib29sZWFuLCBwcm90ZWN0ZWQgc3JjOiBCdW5kbGVQcm9ncmFtLFxuICAgICAgcHJvdGVjdGVkIGR0czogQnVuZGxlUHJvZ3JhbXxudWxsID0gbnVsbCkge1xuICAgIHN1cGVyKHNyYy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIENsYXNzZXMgc2hvdWxkIGhhdmUgYSBgbmFtZWAgaWRlbnRpZmllciwgYmVjYXVzZSB0aGV5IG1heSBuZWVkIHRvIGJlIHJlZmVyZW5jZWQgaW4gb3RoZXIgcGFydHNcbiAgICogb2YgdGhlIHByb2dyYW0uXG4gICAqXG4gICAqIEluIEVTMjAxNSwgYSBjbGFzcyBtYXkgYmUgZGVjbGFyZWQgdXNpbmcgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZXM6XG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBvclxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSAoKCkgPT4geyBjbGFzcyBNeUNsYXNzIHt9IC4uLiByZXR1cm4gTXlDbGFzczsgfSkoKVxuICAgKiBgYGBcbiAgICpcbiAgICogSGVyZSwgdGhlIGludGVybWVkaWF0ZSBgTXlDbGFzc18xYCBhc3NpZ25tZW50IGlzIG9wdGlvbmFsLiBJbiB0aGUgYWJvdmUgZXhhbXBsZSwgdGhlXG4gICAqIGBjbGFzcyBNeUNsYXNzIHt9YCBub2RlIGlzIHJldHVybmVkIGFzIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzYC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiBub2RlIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiIG9yIGhhcyBubyBzeW1ib2wuXG4gICAqL1xuICBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2xGcm9tT3V0ZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKHN5bWJvbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gc3ltYm9sO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4YW1pbmUgYSBkZWNsYXJhdGlvbiAoZm9yIGV4YW1wbGUsIG9mIGEgY2xhc3Mgb3IgZnVuY3Rpb24pIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgYW55XG4gICAqIGRlY29yYXRvcnMgcHJlc2VudCBvbiB0aGUgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBhIFR5cGVTY3JpcHQgYHRzLkRlY2xhcmF0aW9uYCBub2RlIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3IgZnVuY3Rpb24gb3ZlclxuICAgKiB3aGljaCB0byByZWZsZWN0LiBGb3IgZXhhbXBsZSwgaWYgdGhlIGludGVudCBpcyB0byByZWZsZWN0IHRoZSBkZWNvcmF0b3JzIG9mIGEgY2xhc3MgYW5kIHRoZVxuICAgKiBzb3VyY2UgaXMgaW4gRVM2IGZvcm1hdCwgdGhpcyB3aWxsIGJlIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIG5vZGUuIElmIHRoZSBzb3VyY2UgaXMgaW4gRVM1XG4gICAqIGZvcm1hdCwgdGhpcyBtaWdodCBiZSBhIGB0cy5WYXJpYWJsZURlY2xhcmF0aW9uYCBhcyBjbGFzc2VzIGluIEVTNSBhcmUgcmVwcmVzZW50ZWQgYXMgdGhlXG4gICAqIHJlc3VsdCBvZiBhbiBJSUZFIGV4ZWN1dGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYERlY29yYXRvcmAgbWV0YWRhdGEgaWYgZGVjb3JhdG9ycyBhcmUgcHJlc2VudCBvbiB0aGUgZGVjbGFyYXRpb24sIG9yXG4gICAqIGBudWxsYCBpZiBlaXRoZXIgbm8gZGVjb3JhdG9ycyB3ZXJlIHByZXNlbnQgb3IgaWYgdGhlIGRlY2xhcmF0aW9uIGlzIG5vdCBvZiBhIGRlY29yYXRhYmxlIHR5cGUuXG4gICAqL1xuICBnZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoIXN5bWJvbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldERlY29yYXRvcnNPZlN5bWJvbChzeW1ib2wpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4YW1pbmUgYSBkZWNsYXJhdGlvbiB3aGljaCBzaG91bGQgYmUgb2YgYSBjbGFzcywgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCB0aGUgbWVtYmVycyBvZiB0aGVcbiAgICogY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBAdGhyb3dzIGlmIGBkZWNsYXJhdGlvbmAgZG9lcyBub3QgcmVzb2x2ZSB0byBhIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDbGFzc01lbWJlcltdIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXR0ZW1wdGVkIHRvIGdldCBtZW1iZXJzIG9mIGEgbm9uLWNsYXNzOiBcIiR7Y2xhenouZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0TWVtYmVyc09mU3ltYm9sKGNsYXNzU3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBpdHMgcGFyYW1ldGVycy5cbiAgICpcbiAgICogVGhpcyBtZXRob2Qgb25seSBsb29rcyBhdCB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyBkaXJlY3RseSBhbmQgbm90IGF0IGFueSBpbmhlcml0ZWRcbiAgICogY29uc3RydWN0b3JzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBQYXJhbWV0ZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgcGFyYW1ldGVycyBvZiB0aGUgY29uc3RydWN0b3IsIGlmXG4gICAqIGEgY29uc3RydWN0b3IgZXhpc3RzLiBJZiB0aGUgY29uc3RydWN0b3IgZXhpc3RzIGFuZCBoYXMgMCBwYXJhbWV0ZXJzLCB0aGlzIGFycmF5IHdpbGwgYmUgZW1wdHkuXG4gICAqIElmIHRoZSBjbGFzcyBoYXMgbm8gY29uc3RydWN0b3IsIHRoaXMgbWV0aG9kIHJldHVybnMgYG51bGxgLlxuICAgKlxuICAgKiBAdGhyb3dzIGlmIGBkZWNsYXJhdGlvbmAgZG9lcyBub3QgcmVzb2x2ZSB0byBhIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ3RvclBhcmFtZXRlcltdfG51bGwge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBBdHRlbXB0ZWQgdG8gZ2V0IGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBub24tY2xhc3M6IFwiJHtjbGF6ei5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG4gICAgY29uc3QgcGFyYW1ldGVyTm9kZXMgPSB0aGlzLmdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sKTtcbiAgICBpZiAocGFyYW1ldGVyTm9kZXMpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldENvbnN0cnVjdG9yUGFyYW1JbmZvKGNsYXNzU3ltYm9sLCBwYXJhbWV0ZXJOb2Rlcyk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gRmlyc3QgdHJ5IGdldHRpbmcgdGhlIGJhc2UgY2xhc3MgZnJvbSBhbiBFUzIwMTUgY2xhc3MgZGVjbGFyYXRpb25cbiAgICBjb25zdCBzdXBlckJhc2VDbGFzc0lkZW50aWZpZXIgPSBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyKSB7XG4gICAgICByZXR1cm4gc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyO1xuICAgIH1cblxuICAgIC8vIFRoYXQgZGlkbid0IHdvcmsgc28gbm93IHRyeSBnZXR0aW5nIGl0IGZyb20gdGhlIFwiaW5uZXJcIiBkZWNsYXJhdGlvbi5cbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmIChjbGFzc1N5bWJvbCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICFpc05hbWVkRGVjbGFyYXRpb24oY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gc3VwZXIuZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIGdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmIChjbGFzc1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGdldEludGVybmFsTmFtZU9mQ2xhc3MoKSBjYWxsZWQgb24gYSBub24tY2xhc3M6IGV4cGVjdGVkICR7XG4gICAgICAgICAgY2xhenoubmFtZS50ZXh0fSB0byBiZSBhIGNsYXNzIGRlY2xhcmF0aW9uLmApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXROYW1lRnJvbUNsYXNzU3ltYm9sRGVjbGFyYXRpb24oXG4gICAgICAgIGNsYXNzU3ltYm9sLCBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIGdldEFkamFjZW50TmFtZU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmIChjbGFzc1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGdldEFkamFjZW50TmFtZU9mQ2xhc3MoKSBjYWxsZWQgb24gYSBub24tY2xhc3M6IGV4cGVjdGVkICR7XG4gICAgICAgICAgY2xhenoubmFtZS50ZXh0fSB0byBiZSBhIGNsYXNzIGRlY2xhcmF0aW9uLmApO1xuICAgIH1cblxuICAgIGlmIChjbGFzc1N5bWJvbC5hZGphY2VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXROYW1lRnJvbUNsYXNzU3ltYm9sRGVjbGFyYXRpb24oXG4gICAgICAgICAgY2xhc3NTeW1ib2wsIGNsYXNzU3ltYm9sLmFkamFjZW50LnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXROYW1lRnJvbUNsYXNzU3ltYm9sRGVjbGFyYXRpb24oXG4gICAgICAgICAgY2xhc3NTeW1ib2wsIGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0TmFtZUZyb21DbGFzc1N5bWJvbERlY2xhcmF0aW9uKFxuICAgICAgY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuSWRlbnRpZmllciB7XG4gICAgaWYgKGRlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcygpIGNhbGxlZCBvbiBhIGNsYXNzIHdpdGggYW4gdW5kZWZpbmVkIGludGVybmFsIGRlY2xhcmF0aW9uLiBFeHRlcm5hbCBjbGFzcyBuYW1lOiAke1xuICAgICAgICAgICAgICBjbGFzc1N5bWJvbC5uYW1lfTsgaW50ZXJuYWwgY2xhc3MgbmFtZTogJHtjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi5uYW1lfS5gKTtcbiAgICB9XG4gICAgaWYgKCFpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYGdldEludGVybmFsTmFtZU9mQ2xhc3MoKSBjYWxsZWQgb24gYSBjbGFzcyB3aXRoIGFuIGFub255bW91cyBpbm5lciBkZWNsYXJhdGlvbjogZXhwZWN0ZWQgYSBuYW1lIG9uOlxcbiR7XG4gICAgICAgICAgICAgIGRlY2xhcmF0aW9uLmdldFRleHQoKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uLm5hbWU7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gbm9kZSBhY3R1YWxseSByZXByZXNlbnRzIGEgY2xhc3MuXG4gICAqL1xuICBpc0NsYXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIENsYXNzRGVjbGFyYXRpb24ge1xuICAgIHJldHVybiBzdXBlci5pc0NsYXNzKG5vZGUpIHx8IHRoaXMuZ2V0Q2xhc3NTeW1ib2wobm9kZSkgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFjZSBhbiBpZGVudGlmaWVyIHRvIGl0cyBkZWNsYXJhdGlvbiwgaWYgcG9zc2libGUuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGF0dGVtcHRzIHRvIHJlc29sdmUgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBnaXZlbiBpZGVudGlmaWVyLCB0cmFjaW5nIGJhY2sgdGhyb3VnaFxuICAgKiBpbXBvcnRzIGFuZCByZS1leHBvcnRzIHVudGlsIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQgaXMgZm91bmQuIEEgYERlY2xhcmF0aW9uYFxuICAgKiBvYmplY3QgaXMgcmV0dXJuZWQgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGAgaXMgcmV0dXJuZWQgb3RoZXJ3aXNlLlxuICAgKlxuICAgKiBJbiBFUzIwMTUsIHdlIG5lZWQgdG8gYWNjb3VudCBmb3IgaWRlbnRpZmllcnMgdGhhdCByZWZlciB0byBhbGlhc2VkIGNsYXNzIGRlY2xhcmF0aW9ucyBzdWNoIGFzXG4gICAqIGBNeUNsYXNzXzFgLiBTaW5jZSBzdWNoIGRlY2xhcmF0aW9ucyBhcmUgb25seSBhdmFpbGFibGUgd2l0aGluIHRoZSBtb2R1bGUgaXRzZWxmLCB3ZSBuZWVkIHRvXG4gICAqIGZpbmQgdGhlIG9yaWdpbmFsIGNsYXNzIGRlY2xhcmF0aW9uLCBlLmcuIGBNeUNsYXNzYCwgdGhhdCBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGFsaWFzZWQgb25lLlxuICAgKlxuICAgKiBAcGFyYW0gaWQgYSBUeXBlU2NyaXB0IGB0cy5JZGVudGlmaWVyYCB0byB0cmFjZSBiYWNrIHRvIGEgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIG1ldGFkYXRhIGFib3V0IHRoZSBgRGVjbGFyYXRpb25gIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgXG4gICAqIG90aGVyd2lzZS5cbiAgICovXG4gIGdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc3VwZXJEZWNsYXJhdGlvbiA9IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkKTtcblxuICAgIC8vIElmIG5vIGRlY2xhcmF0aW9uIHdhcyBmb3VuZCBvciBpdCdzIGFuIGlubGluZSBkZWNsYXJhdGlvbiwgcmV0dXJuIGFzIGlzLlxuICAgIGlmIChzdXBlckRlY2xhcmF0aW9uID09PSBudWxsIHx8IHN1cGVyRGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHN1cGVyRGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGRlY2xhcmF0aW9uIGFscmVhZHkgaGFzIHRyYWl0cyBhc3NpZ25lZCB0byBpdCwgcmV0dXJuIGFzIGlzLlxuICAgIGlmIChzdXBlckRlY2xhcmF0aW9uLmtub3duICE9PSBudWxsIHx8IHN1cGVyRGVjbGFyYXRpb24uaWRlbnRpdHkgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBzdXBlckRlY2xhcmF0aW9uO1xuICAgIH1cblxuICAgIGNvbnN0IG91dGVyQ2xhc3NOb2RlID0gZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckRlY2xhcmF0aW9uKHN1cGVyRGVjbGFyYXRpb24ubm9kZSk7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBvdXRlckNsYXNzTm9kZSAhPT0gbnVsbCA/XG4gICAgICAgIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIob3V0ZXJDbGFzc05vZGUubmFtZSkgOlxuICAgICAgICBzdXBlckRlY2xhcmF0aW9uO1xuICAgIGlmIChkZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBkZWNsYXJhdGlvbi5ub2RlID09PSBudWxsIHx8IGRlY2xhcmF0aW9uLmtub3duICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLy8gVGhlIGlkZW50aWZpZXIgbWF5IGhhdmUgYmVlbiBvZiBhbiBhZGRpdGlvbmFsIGNsYXNzIGFzc2lnbm1lbnQgc3VjaCBhcyBgTXlDbGFzc18xYCB0aGF0IHdhc1xuICAgIC8vIHByZXNlbnQgYXMgYWxpYXMgZm9yIGBNeUNsYXNzYC4gSWYgc28sIHJlc29sdmUgc3VjaCBhbGlhc2VzIHRvIHRoZWlyIG9yaWdpbmFsIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gdGhpcy5yZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICBpZiAoYWxpYXNlZElkZW50aWZpZXIgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGFsaWFzZWRJZGVudGlmaWVyKTtcbiAgICB9XG5cbiAgICAvLyBWYXJpYWJsZSBkZWNsYXJhdGlvbnMgbWF5IHJlcHJlc2VudCBhbiBlbnVtIGRlY2xhcmF0aW9uLCBzbyBhdHRlbXB0IHRvIHJlc29sdmUgaXRzIG1lbWJlcnMuXG4gICAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgY29uc3QgZW51bU1lbWJlcnMgPSB0aGlzLnJlc29sdmVFbnVtTWVtYmVycyhkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgIGlmIChlbnVtTWVtYmVycyAhPT0gbnVsbCkge1xuICAgICAgICBkZWNsYXJhdGlvbi5pZGVudGl0eSA9IHtraW5kOiBTcGVjaWFsRGVjbGFyYXRpb25LaW5kLkRvd25sZXZlbGVkRW51bSwgZW51bU1lbWJlcnN9O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWNsYXJhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBkZWNvcmF0b3JzIG9mIHRoZSBnaXZlbiBjbGFzcyBzeW1ib2wuIEFueSBkZWNvcmF0b3IgdGhhdCBoYXZlIGJlZW4gc3ludGhldGljYWxseVxuICAgKiBpbmplY3RlZCBieSBhIG1pZ3JhdGlvbiB3aWxsIG5vdCBiZSBwcmVzZW50IGluIHRoZSByZXR1cm5lZCBjb2xsZWN0aW9uLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qge2NsYXNzRGVjb3JhdG9yc30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKHN5bWJvbCk7XG4gICAgaWYgKGNsYXNzRGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIGFycmF5IHRvIHByZXZlbnQgY29uc3VtZXJzIGZyb20gbXV0YXRpbmcgdGhlIGNhY2hlLlxuICAgIHJldHVybiBBcnJheS5mcm9tKGNsYXNzRGVjb3JhdG9ycyk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBtb2R1bGUgZm9yIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBpbiB3aGljaCB0aGUgaW5pdGlhbGl6ZXJcbiAgICogaXMgYW4gaWRlbnRpZmllciBtYXJrZWQgd2l0aCB0aGUgYFBSRV9SM19NQVJLRVJgLlxuICAgKiBAcGFyYW0gbW9kdWxlIHRoZSBtb2R1bGUgaW4gd2hpY2ggdG8gc2VhcmNoIGZvciBzd2l0Y2hhYmxlIGRlY2xhcmF0aW9ucy5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgdmFyaWFibGUgZGVjbGFyYXRpb25zIHRoYXQgbWF0Y2guXG4gICAqL1xuICBnZXRTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKG1vZHVsZTogdHMuTm9kZSk6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10ge1xuICAgIC8vIERvbid0IGJvdGhlciB0byB3YWxrIHRoZSBBU1QgaWYgdGhlIG1hcmtlciBpcyBub3QgZm91bmQgaW4gdGhlIHRleHRcbiAgICByZXR1cm4gbW9kdWxlLmdldFRleHQoKS5pbmRleE9mKFBSRV9SM19NQVJLRVIpID49IDAgP1xuICAgICAgICBmaW5kQWxsKG1vZHVsZSwgaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbikgOlxuICAgICAgICBbXTtcbiAgfVxuXG4gIGdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHZhbHVlID0gc3VwZXIuZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbik7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gV2UgaGF2ZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIGluaXRpYWxpemVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIHZhciBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gU28gbG9vayBmb3IgdGhlIHNwZWNpYWwgc2NlbmFyaW8gd2hlcmUgdGhlIHZhcmlhYmxlIGlzIGJlaW5nIGFzc2lnbmVkIGluXG4gICAgLy8gYSBuZWFyYnkgc3RhdGVtZW50IHRvIHRoZSByZXR1cm4gdmFsdWUgb2YgYSBjYWxsIHRvIGBfX2RlY29yYXRlYC5cbiAgICAvLyBUaGVuIGZpbmQgdGhlIDJuZCBhcmd1bWVudCBvZiB0aGF0IGNhbGwsIHRoZSBcInRhcmdldFwiLCB3aGljaCB3aWxsIGJlIHRoZVxuICAgIC8vIGFjdHVhbCBjbGFzcyBpZGVudGlmaWVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIEh0dHBDbGllbnRYc3JmTW9kdWxlID0gSHR0cENsaWVudFhzcmZNb2R1bGVfMSA9IHRzbGliXzEuX19kZWNvcmF0ZShbXG4gICAgLy8gICBOZ01vZHVsZSh7XG4gICAgLy8gICAgIHByb3ZpZGVyczogW10sXG4gICAgLy8gICB9KVxuICAgIC8vIF0sIEh0dHBDbGllbnRYc3JmTW9kdWxlKTtcbiAgICAvLyBgYGBcbiAgICAvL1xuICAgIC8vIEFuZCBmaW5hbGx5LCBmaW5kIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgaWRlbnRpZmllciBpbiB0aGF0IGFyZ3VtZW50LlxuICAgIC8vIE5vdGUgYWxzbyB0aGF0IHRoZSBhc3NpZ25tZW50IGNhbiBvY2N1ciB3aXRoaW4gYW5vdGhlciBhc3NpZ25tZW50LlxuICAgIC8vXG4gICAgY29uc3QgYmxvY2sgPSBkZWNsYXJhdGlvbi5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICBpZiAoc3ltYm9sICYmICh0cy5pc0Jsb2NrKGJsb2NrKSB8fCB0cy5pc1NvdXJjZUZpbGUoYmxvY2spKSkge1xuICAgICAgY29uc3QgZGVjb3JhdGVDYWxsID0gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShibG9jaywgc3ltYm9sKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGRlY29yYXRlQ2FsbCAmJiBkZWNvcmF0ZUNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHRhcmdldCAmJiB0cy5pc0lkZW50aWZpZXIodGFyZ2V0KSkge1xuICAgICAgICBjb25zdCB0YXJnZXRTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0YXJnZXQpO1xuICAgICAgICBjb25zdCB0YXJnZXREZWNsYXJhdGlvbiA9IHRhcmdldFN5bWJvbCAmJiB0YXJnZXRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKHRhcmdldERlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0YXJnZXREZWNsYXJhdGlvbikgfHxcbiAgICAgICAgICAgICAgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBqdXN0IGEgZnVuY3Rpb24gb3IgY2xhc3MgZGVjbGFyYXRpb25cbiAgICAgICAgICAgIC8vIHNvIHJldHVybiBpdHMgaWRlbnRpZmllciBhcyB0aGUgdmFyaWFibGUgdmFsdWUuXG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0RGVjbGFyYXRpb24ubmFtZSB8fCBudWxsO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLCBzbyBmaW5kIHRoZSBmYXIgcmlnaHQgZXhwcmVzc2lvbixcbiAgICAgICAgICAgIC8vIGluIHRoZSBjYXNlIG9mIG11bHRpcGxlIGFzc2lnbm1lbnRzIChlLmcuIGB2YXIxID0gdmFyMiA9IHZhbHVlYCkuXG4gICAgICAgICAgICBsZXQgdGFyZ2V0VmFsdWUgPSB0YXJnZXREZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICAgICAgICAgIHdoaWxlICh0YXJnZXRWYWx1ZSAmJiBpc0Fzc2lnbm1lbnQodGFyZ2V0VmFsdWUpKSB7XG4gICAgICAgICAgICAgIHRhcmdldFZhbHVlID0gdGFyZ2V0VmFsdWUucmlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFyZ2V0VmFsdWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGFsbCB0b3AtbGV2ZWwgY2xhc3Mgc3ltYm9scyBpbiB0aGUgZ2l2ZW4gZmlsZS5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgY2xhc3Nlcy5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgY2xhc3Mgc3ltYm9scy5cbiAgICovXG4gIGZpbmRDbGFzc1N5bWJvbHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE5nY2NDbGFzc1N5bWJvbFtdIHtcbiAgICBjb25zdCBjbGFzc2VzOiBOZ2NjQ2xhc3NTeW1ib2xbXSA9IFtdO1xuICAgIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKS5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NTeW1ib2wpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChzdGF0ZW1lbnQpO1xuICAgICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NTeW1ib2wpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGNsYXNzZXM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBudW1iZXIgb2YgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgb2YgYSBnaXZlbiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycyBvZiB0aGUgY2xhc3MsIGlmIGtub3duLCBvciBgbnVsbGAgaWYgdGhlIGRlY2xhcmF0aW9uXG4gICAqIGlzIG5vdCBhIGNsYXNzIG9yIGhhcyBhbiB1bmtub3duIG51bWJlciBvZiB0eXBlIHBhcmFtZXRlcnMuXG4gICAqL1xuICBnZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogbnVtYmVyfG51bGwge1xuICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5nZXREdHNEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKGR0c0RlY2xhcmF0aW9uICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkdHNEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiBkdHNEZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycyA/IGR0c0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzLmxlbmd0aCA6IDA7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRha2UgYW4gZXhwb3J0ZWQgZGVjbGFyYXRpb24gb2YgYSBjbGFzcyAobWF5YmUgZG93bi1sZXZlbGVkIHRvIGEgdmFyaWFibGUpIGFuZCBsb29rIHVwIHRoZVxuICAgKiBkZWNsYXJhdGlvbiBvZiBpdHMgdHlwZSBpbiBhIHNlcGFyYXRlIC5kLnRzIHRyZWUuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gaXMgYWxsb3dlZCB0byByZXR1cm4gYG51bGxgIGlmIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgZG9lcyBub3QgaGF2ZSBhXG4gICAqIHNlcGFyYXRlIC5kLnRzIHRyZWUuIFdoZW4gY29tcGlsaW5nIFR5cGVTY3JpcHQgY29kZSB0aGlzIGlzIGFsd2F5cyB0aGUgY2FzZSwgc2luY2UgLmQudHMgZmlsZXNcbiAgICogYXJlIHByb2R1Y2VkIG9ubHkgZHVyaW5nIHRoZSBlbWl0IG9mIHN1Y2ggYSBjb21waWxhdGlvbi4gV2hlbiBjb21waWxpbmcgLmpzIGNvZGUsIGhvd2V2ZXIsXG4gICAqIHRoZXJlIGlzIGZyZXF1ZW50bHkgYSBwYXJhbGxlbCAuZC50cyB0cmVlIHdoaWNoIHRoaXMgbWV0aG9kIGV4cG9zZXMuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgYHRzLkNsYXNzRGVjbGFyYXRpb25gIHJldHVybmVkIGZyb20gdGhpcyBmdW5jdGlvbiBtYXkgbm90IGJlIGZyb20gdGhlIHNhbWVcbiAgICogYHRzLlByb2dyYW1gIGFzIHRoZSBpbnB1dCBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldER0c0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY2xhcmF0aW9ufG51bGwge1xuICAgIGlmICh0aGlzLmR0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICghaXNOYW1lZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgZ2V0IHRoZSBkdHMgZmlsZSBmb3IgYSBkZWNsYXJhdGlvbiB0aGF0IGhhcyBubyBuYW1lOiAke1xuICAgICAgICAgIGRlY2xhcmF0aW9uLmdldFRleHQoKX0gaW4gJHtkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9YCk7XG4gICAgfVxuXG4gICAgLy8gVHJ5IHRvIHJldHJpZXZlIHRoZSBkdHMgZGVjbGFyYXRpb24gZnJvbSB0aGUgcHVibGljIG1hcFxuICAgIGlmICh0aGlzLnB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwID09PSBudWxsKSB7XG4gICAgICB0aGlzLnB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwID0gdGhpcy5jb21wdXRlUHVibGljRHRzRGVjbGFyYXRpb25NYXAodGhpcy5zcmMsIHRoaXMuZHRzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucHVibGljRHRzRGVjbGFyYXRpb25NYXAuaGFzKGRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljRHRzRGVjbGFyYXRpb25NYXAuZ2V0KGRlY2xhcmF0aW9uKSE7XG4gICAgfVxuXG4gICAgLy8gTm8gcHVibGljIGV4cG9ydCwgdHJ5IHRoZSBwcml2YXRlIG1hcFxuICAgIGlmICh0aGlzLnByaXZhdGVEdHNEZWNsYXJhdGlvbk1hcCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5wcml2YXRlRHRzRGVjbGFyYXRpb25NYXAgPSB0aGlzLmNvbXB1dGVQcml2YXRlRHRzRGVjbGFyYXRpb25NYXAodGhpcy5zcmMsIHRoaXMuZHRzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwLmhhcyhkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB0aGlzLnByaXZhdGVEdHNEZWNsYXJhdGlvbk1hcC5nZXQoZGVjbGFyYXRpb24pITtcbiAgICB9XG5cbiAgICAvLyBObyBkZWNsYXJhdGlvbiBmb3VuZCBhdCBhbGxcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldEVuZE9mQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLk5vZGUge1xuICAgIGNvbnN0IGltcGxlbWVudGF0aW9uID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb247XG4gICAgbGV0IGxhc3Q6IHRzLk5vZGUgPSBpbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGNvbnN0IGltcGxlbWVudGF0aW9uU3RhdGVtZW50ID0gZ2V0Q29udGFpbmluZ1N0YXRlbWVudChsYXN0KTtcbiAgICBpZiAoaW1wbGVtZW50YXRpb25TdGF0ZW1lbnQgPT09IG51bGwpIHJldHVybiBsYXN0O1xuXG4gICAgY29uc3QgY29udGFpbmVyID0gaW1wbGVtZW50YXRpb25TdGF0ZW1lbnQucGFyZW50O1xuICAgIGlmICh0cy5pc0Jsb2NrKGNvbnRhaW5lcikpIHtcbiAgICAgIC8vIEFzc3VtZSB0aGF0IHRoZSBpbXBsZW1lbnRhdGlvbiBpcyBpbnNpZGUgYW4gSUlGRVxuICAgICAgY29uc3QgcmV0dXJuU3RhdGVtZW50SW5kZXggPSBjb250YWluZXIuc3RhdGVtZW50cy5maW5kSW5kZXgodHMuaXNSZXR1cm5TdGF0ZW1lbnQpO1xuICAgICAgaWYgKHJldHVyblN0YXRlbWVudEluZGV4ID09PSAtMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgQ29tcGlsZWQgY2xhc3Mgd3JhcHBlciBJSUZFIGRvZXMgbm90IGhhdmUgYSByZXR1cm4gc3RhdGVtZW50OiAke2NsYXNzU3ltYm9sLm5hbWV9IGluICR7XG4gICAgICAgICAgICAgICAgY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9YCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJldHVybiB0aGUgc3RhdGVtZW50IGJlZm9yZSB0aGUgSUlGRSByZXR1cm4gc3RhdGVtZW50XG4gICAgICBsYXN0ID0gY29udGFpbmVyLnN0YXRlbWVudHNbcmV0dXJuU3RhdGVtZW50SW5kZXggLSAxXTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzU291cmNlRmlsZShjb250YWluZXIpKSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgc3RhdGljIG1lbWJlcnMgb24gdGhpcyBjbGFzcyB0aGVuIGZpbmQgdGhlIGxhc3Qgb25lXG4gICAgICBpZiAoaW1wbGVtZW50YXRpb24uZXhwb3J0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGltcGxlbWVudGF0aW9uLmV4cG9ydHMuZm9yRWFjaChleHBvcnRTeW1ib2wgPT4ge1xuICAgICAgICAgIGlmIChleHBvcnRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGdldENvbnRhaW5pbmdTdGF0ZW1lbnQoZXhwb3J0U3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICAgIGlmIChleHBvcnRTdGF0ZW1lbnQgIT09IG51bGwgJiYgbGFzdC5nZXRFbmQoKSA8IGV4cG9ydFN0YXRlbWVudC5nZXRFbmQoKSkge1xuICAgICAgICAgICAgbGFzdCA9IGV4cG9ydFN0YXRlbWVudDtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGVyZSBhcmUgaGVscGVyIGNhbGxzIGZvciB0aGlzIGNsYXNzIHRoZW4gZmluZCB0aGUgbGFzdCBvbmVcbiAgICAgIGNvbnN0IGhlbHBlcnMgPSB0aGlzLmdldEhlbHBlckNhbGxzRm9yQ2xhc3MoXG4gICAgICAgICAgY2xhc3NTeW1ib2wsIFsnX19kZWNvcmF0ZScsICdfX2V4dGVuZHMnLCAnX19wYXJhbScsICdfX21ldGFkYXRhJ10pO1xuICAgICAgaGVscGVycy5mb3JFYWNoKGhlbHBlciA9PiB7XG4gICAgICAgIGNvbnN0IGhlbHBlclN0YXRlbWVudCA9IGdldENvbnRhaW5pbmdTdGF0ZW1lbnQoaGVscGVyKTtcbiAgICAgICAgaWYgKGhlbHBlclN0YXRlbWVudCAhPT0gbnVsbCAmJiBsYXN0LmdldEVuZCgpIDwgaGVscGVyU3RhdGVtZW50LmdldEVuZCgpKSB7XG4gICAgICAgICAgbGFzdCA9IGhlbHBlclN0YXRlbWVudDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBsYXN0O1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYSBgRGVjbGFyYXRpb25gIGNvcnJlc3BvbmRzIHdpdGggYSBrbm93biBkZWNsYXJhdGlvbiwgc3VjaCBhcyBgT2JqZWN0YCwgYW5kIHNldFxuICAgKiBpdHMgYGtub3duYCBwcm9wZXJ0eSB0byB0aGUgYXBwcm9wcmlhdGUgYEtub3duRGVjbGFyYXRpb25gLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbCBUaGUgYERlY2xhcmF0aW9uYCB0byBjaGVjay5cbiAgICogQHJldHVybiBUaGUgcGFzc2VkIGluIGBEZWNsYXJhdGlvbmAgKHBvdGVudGlhbGx5IGVuaGFuY2VkIHdpdGggYSBgS25vd25EZWNsYXJhdGlvbmApLlxuICAgKi9cbiAgZGV0ZWN0S25vd25EZWNsYXJhdGlvbjxUIGV4dGVuZHMgRGVjbGFyYXRpb24+KGRlY2w6IFQpOiBUIHtcbiAgICBpZiAoZGVjbC5rbm93biA9PT0gbnVsbCAmJiB0aGlzLmlzSmF2YVNjcmlwdE9iamVjdERlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgICAvLyBJZiB0aGUgaWRlbnRpZmllciByZXNvbHZlcyB0byB0aGUgZ2xvYmFsIEphdmFTY3JpcHQgYE9iamVjdGAsIHVwZGF0ZSB0aGUgZGVjbGFyYXRpb24gdG9cbiAgICAgIC8vIGRlbm90ZSBpdCBhcyB0aGUga25vd24gYEpzR2xvYmFsT2JqZWN0YCBkZWNsYXJhdGlvbi5cbiAgICAgIGRlY2wua25vd24gPSBLbm93bkRlY2xhcmF0aW9uLkpzR2xvYmFsT2JqZWN0O1xuICAgIH1cbiAgICByZXR1cm4gZGVjbDtcbiAgfVxuXG5cbiAgLy8vLy8vLy8vLy8vLyBQcm90ZWN0ZWQgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbiAgLyoqXG4gICAqIEEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIGFzIGEgdG9wIGxldmVsIGNsYXNzIGRlY2xhcmF0aW9uOlxuICAgKlxuICAgKiBgYGBcbiAgICogY2xhc3MgT3V0ZXJDbGFzcyB7IC4uLiB9XG4gICAqIGBgYFxuICAgKlxuICAgKiBvciBpbiBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRvIGEgY2xhc3MgZXhwcmVzc2lvbjpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBPdXRlckNsYXNzID0gQ2xhc3NBbGlhcyA9IGNsYXNzIElubmVyQ2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBvciBpbiBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRvIGFuIElJRkUgY29udGFpbmluZyBhIGNsYXNzIGRlY2xhcmF0aW9uXG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgT3V0ZXJDbGFzcyA9IENsYXNzQWxpYXMgPSAoKCkgPT4ge1xuICAgKiAgIGNsYXNzIElubmVyQ2xhc3Mge31cbiAgICogICAuLi5cbiAgICogICByZXR1cm4gSW5uZXJDbGFzcztcbiAgICogfSkoKVxuICAgKiBgYGBcbiAgICpcbiAgICogb3IgaW4gYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB0byBhbiBJSUZFIGNvbnRhaW5pbmcgYSBmdW5jdGlvbiBkZWNsYXJhdGlvblxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIE91dGVyQ2xhc3MgPSBDbGFzc0FsaWFzID0gKCgpID0+IHtcbiAgICogICBmdW5jdGlvbiBJbm5lckNsYXNzKCkge31cbiAgICogICAuLi5cbiAgICogICByZXR1cm4gSW5uZXJDbGFzcztcbiAgICogfSkoKVxuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBtZXRob2QgcmV0dXJucyBhbiBgTmdjY0NsYXNzU3ltYm9sYCB3aGVuIHByb3ZpZGVkIHdpdGggb25lIG9mIHRoZXNlIGNhc2VzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIGNsYXNzIG9yIGB1bmRlZmluZWRgIGlmIGBkZWNsYXJhdGlvbmAgZG9lcyBub3QgcmVwcmVzZW50IGFuIG91dGVyXG4gICAqICAgICBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sRnJvbU91dGVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICAvLyBSZXR1cm4gYSBjbGFzcyBzeW1ib2wgd2l0aG91dCBhbiBpbm5lciBkZWNsYXJhdGlvbiBpZiBpdCBpcyBhIHJlZ3VsYXIgXCJ0b3AgbGV2ZWxcIiBjbGFzc1xuICAgIGlmIChpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgaXNUb3BMZXZlbChkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUNsYXNzU3ltYm9sKGRlY2xhcmF0aW9uLCBudWxsKTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIGFuIG91dGVyIGNsYXNzIGRlY2xhcmF0aW9uIG11c3QgYmUgYW4gaW5pdGlhbGl6ZWQgdmFyaWFibGUgZGVjbGFyYXRpb246XG4gICAgaWYgKCFpc0luaXRpYWxpemVkVmFyaWFibGVDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBpbm5lckRlY2xhcmF0aW9uID0gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKHNraXBDbGFzc0FsaWFzZXMoZGVjbGFyYXRpb24pKTtcbiAgICBpZiAoaW5uZXJEZWNsYXJhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2woZGVjbGFyYXRpb24sIGlubmVyRGVjbGFyYXRpb24pO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIHVzaW5nIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVzOlxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogb3JcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gKCgpID0+IHsgY2xhc3MgTXlDbGFzcyB7fSAuLi4gcmV0dXJuIE15Q2xhc3M7IH0pKClcbiAgICogYGBgXG4gICAqXG4gICAqIG9yXG4gICAqXG4gICAqIGBgYFxuICAgKiBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9ICgoKSA9PiB7IGxldCBNeUNsYXNzID0gY2xhc3MgTXlDbGFzcyB7fTsgLi4uIHJldHVybiBNeUNsYXNzOyB9KSgpXG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBleHRyYWN0cyB0aGUgYE5nY2NDbGFzc1N5bWJvbGAgZm9yIGBNeUNsYXNzYCB3aGVuIHByb3ZpZGVkIHdpdGggdGhlXG4gICAqIGBjbGFzcyBNeUNsYXNzIHt9YCBkZWNsYXJhdGlvbiBub2RlLiBXaGVuIHRoZSBgdmFyIE15Q2xhc3NgIG5vZGUgb3IgYW55IG90aGVyIG5vZGUgaXMgZ2l2ZW4sXG4gICAqIHRoaXMgbWV0aG9kIHdpbGwgcmV0dXJuIHVuZGVmaW5lZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgZG9lcyBub3QgcmVwcmVzZW50IGFuIGlubmVyIGRlY2xhcmF0aW9uXG4gICAqIG9mIGEgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NTeW1ib2xGcm9tSW5uZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIGxldCBvdXRlckRlY2xhcmF0aW9uOiB0cy5DbGFzc0RlY2xhcmF0aW9ufHRzLlZhcmlhYmxlRGVjbGFyYXRpb258dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKHRzLmlzQ2xhc3NFeHByZXNzaW9uKGRlY2xhcmF0aW9uKSAmJiBoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICAgIC8vIEhhbmRsZSBgbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O2BcbiAgICAgIG91dGVyRGVjbGFyYXRpb24gPSBnZXRGYXJMZWZ0SGFuZFNpZGVPZkFzc2lnbm1lbnQoZGVjbGFyYXRpb24pO1xuXG4gICAgICAvLyBIYW5kbGUgdGhpcyBiZWluZyBpbiBhbiBJSUZFXG4gICAgICBpZiAob3V0ZXJEZWNsYXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmICFpc1RvcExldmVsKG91dGVyRGVjbGFyYXRpb24pKSB7XG4gICAgICAgIG91dGVyRGVjbGFyYXRpb24gPSBnZXRDb250YWluaW5nVmFyaWFibGVEZWNsYXJhdGlvbihvdXRlckRlY2xhcmF0aW9uKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgLy8gSGFuZGxlIGBjbGFzcyBNeUNsYXNzIHt9YCBzdGF0ZW1lbnRcbiAgICAgIGlmIChpc1RvcExldmVsKGRlY2xhcmF0aW9uKSkge1xuICAgICAgICAvLyBBdCB0aGUgdG9wIGxldmVsXG4gICAgICAgIG91dGVyRGVjbGFyYXRpb24gPSBkZWNsYXJhdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE9yIGluc2lkZSBhbiBJSUZFXG4gICAgICAgIG91dGVyRGVjbGFyYXRpb24gPSBnZXRDb250YWluaW5nVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG91dGVyRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCAhaGFzTmFtZUlkZW50aWZpZXIob3V0ZXJEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2wob3V0ZXJEZWNsYXJhdGlvbiwgZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gYE5nY2NDbGFzc1N5bWJvbGAgZnJvbSBhbiBvdXRlciBhbmQgaW5uZXIgZGVjbGFyYXRpb24uIElmIGEgY2xhc3Mgb25seSBoYXMgYW4gb3V0ZXJcbiAgICogZGVjbGFyYXRpb24sIHRoZSBcImltcGxlbWVudGF0aW9uXCIgc3ltYm9sIG9mIHRoZSBjcmVhdGVkIGBOZ2NjQ2xhc3NTeW1ib2xgIHdpbGwgYmUgc2V0IGVxdWFsIHRvXG4gICAqIHRoZSBcImRlY2xhcmF0aW9uXCIgc3ltYm9sLlxuICAgKlxuICAgKiBAcGFyYW0gb3V0ZXJEZWNsYXJhdGlvbiBUaGUgb3V0ZXIgZGVjbGFyYXRpb24gbm9kZSBvZiB0aGUgY2xhc3MuXG4gICAqIEBwYXJhbSBpbm5lckRlY2xhcmF0aW9uIFRoZSBpbm5lciBkZWNsYXJhdGlvbiBub2RlIG9mIHRoZSBjbGFzcywgb3IgdW5kZWZpbmVkIGlmIG5vIGlubmVyXG4gICAqIGRlY2xhcmF0aW9uIGlzIHByZXNlbnQuXG4gICAqIEByZXR1cm5zIHRoZSBgTmdjY0NsYXNzU3ltYm9sYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzLCBvciB1bmRlZmluZWQgaWYgYSBgdHMuU3ltYm9sYCBmb3IgYW55IG9mXG4gICAqIHRoZSBkZWNsYXJhdGlvbnMgY291bGQgbm90IGJlIHJlc29sdmVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNyZWF0ZUNsYXNzU3ltYm9sKG91dGVyRGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb24sIGlubmVyRGVjbGFyYXRpb246IHRzLk5vZGV8bnVsbCk6XG4gICAgICBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvblN5bWJvbCA9XG4gICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG91dGVyRGVjbGFyYXRpb24ubmFtZSkgYXMgQ2xhc3NTeW1ib2wgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGRlY2xhcmF0aW9uU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgbGV0IGltcGxlbWVudGF0aW9uU3ltYm9sID0gZGVjbGFyYXRpb25TeW1ib2w7XG4gICAgaWYgKGlubmVyRGVjbGFyYXRpb24gIT09IG51bGwgJiYgaXNOYW1lZERlY2xhcmF0aW9uKGlubmVyRGVjbGFyYXRpb24pKSB7XG4gICAgICBpbXBsZW1lbnRhdGlvblN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlubmVyRGVjbGFyYXRpb24ubmFtZSkgYXMgQ2xhc3NTeW1ib2w7XG4gICAgfVxuXG4gICAgaWYgKGltcGxlbWVudGF0aW9uU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCA9IHtcbiAgICAgIG5hbWU6IGRlY2xhcmF0aW9uU3ltYm9sLm5hbWUsXG4gICAgICBkZWNsYXJhdGlvbjogZGVjbGFyYXRpb25TeW1ib2wsXG4gICAgICBpbXBsZW1lbnRhdGlvbjogaW1wbGVtZW50YXRpb25TeW1ib2wsXG4gICAgfTtcblxuICAgIGxldCBhZGphY2VudCA9IHRoaXMuZ2V0QWRqYWNlbnRTeW1ib2woZGVjbGFyYXRpb25TeW1ib2wsIGltcGxlbWVudGF0aW9uU3ltYm9sKTtcbiAgICBpZiAoYWRqYWNlbnQgIT09IG51bGwpIHtcbiAgICAgIGNsYXNzU3ltYm9sLmFkamFjZW50ID0gYWRqYWNlbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzU3ltYm9sO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRBZGphY2VudFN5bWJvbChkZWNsYXJhdGlvblN5bWJvbDogQ2xhc3NTeW1ib2wsIGltcGxlbWVudGF0aW9uU3ltYm9sOiBDbGFzc1N5bWJvbCk6XG4gICAgICBDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIGlmIChkZWNsYXJhdGlvblN5bWJvbCA9PT0gaW1wbGVtZW50YXRpb25TeW1ib2wpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSBpbXBsZW1lbnRhdGlvblN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmICghdHMuaXNDbGFzc0V4cHJlc3Npb24oaW5uZXJEZWNsYXJhdGlvbikgJiYgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGlubmVyRGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvLyBEZWFsIHdpdGggdGhlIGlubmVyIGNsYXNzIGxvb2tpbmcgbGlrZSB0aGlzIGluc2lkZSBhbiBJSUZFOlxuICAgIC8vIGBsZXQgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge307YCBvciBgdmFyIE15Q2xhc3MgPSBmdW5jdGlvbiBNeUNsYXNzKCkge307YFxuICAgIGNvbnN0IGFkamFjZW50RGVjbGFyYXRpb24gPSBnZXRGYXJMZWZ0SGFuZFNpZGVPZkFzc2lnbm1lbnQoaW5uZXJEZWNsYXJhdGlvbik7XG4gICAgaWYgKGFkamFjZW50RGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCAhaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24oYWRqYWNlbnREZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGFkamFjZW50U3ltYm9sID1cbiAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oYWRqYWNlbnREZWNsYXJhdGlvbi5uYW1lKSBhcyBDbGFzc1N5bWJvbDtcbiAgICBpZiAoYWRqYWNlbnRTeW1ib2wgPT09IGRlY2xhcmF0aW9uU3ltYm9sIHx8IGFkamFjZW50U3ltYm9sID09PSBpbXBsZW1lbnRhdGlvblN5bWJvbCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGFkamFjZW50U3ltYm9sO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc29sdmUgYSBgdHMuU3ltYm9sYCB0byBpdHMgZGVjbGFyYXRpb24gYW5kIGRldGVjdCB3aGV0aGVyIGl0IGNvcnJlc3BvbmRzIHdpdGggYSBrbm93blxuICAgKiBkZWNsYXJhdGlvbi5cbiAgICovXG4gIHByb3RlY3RlZCBnZXREZWNsYXJhdGlvbk9mU3ltYm9sKHN5bWJvbDogdHMuU3ltYm9sLCBvcmlnaW5hbElkOiB0cy5JZGVudGlmaWVyfG51bGwpOiBEZWNsYXJhdGlvblxuICAgICAgfG51bGwge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzeW1ib2wsIG9yaWdpbmFsSWQpO1xuICAgIGlmIChkZWNsYXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRldGVjdEtub3duRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBhY3R1YWwgY2xhc3MgZGVjbGFyYXRpb24gZm9yIGEgcG90ZW50aWFsbHkgYWxpYXNlZCBkZWNsYXJhdGlvbiBvZiBhXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBJZiB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gaXMgZm9yIGFuIGFsaWFzIG9mIGEgY2xhc3MsIHRoaXMgZnVuY3Rpb24gd2lsbCBkZXRlcm1pbmUgYW4gaWRlbnRpZmllclxuICAgKiB0byB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gdGhhdCByZXByZXNlbnRzIHRoaXMgY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gdG8gcmVzb2x2ZS5cbiAgICogQHJldHVybnMgVGhlIG9yaWdpbmFsIGlkZW50aWZpZXIgdGhhdCB0aGUgZ2l2ZW4gY2xhc3MgZGVjbGFyYXRpb24gcmVzb2x2ZXMgdG8sIG9yIGB1bmRlZmluZWRgXG4gICAqIGlmIHRoZSBkZWNsYXJhdGlvbiBkb2VzIG5vdCByZXByZXNlbnQgYW4gYWxpYXNlZCBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIHRoaXMuZW5zdXJlUHJlcHJvY2Vzc2VkKGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgcmV0dXJuIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLmhhcyhkZWNsYXJhdGlvbikgP1xuICAgICAgICB0aGlzLmFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucy5nZXQoZGVjbGFyYXRpb24pISA6XG4gICAgICAgIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlcyB0aGF0IHRoZSBzb3VyY2UgZmlsZSB0aGF0IGBub2RlYCBpcyBwYXJ0IG9mIGhhcyBiZWVuIHByZXByb2Nlc3NlZC5cbiAgICpcbiAgICogRHVyaW5nIHByZXByb2Nlc3NpbmcsIGFsbCBzdGF0ZW1lbnRzIGluIHRoZSBzb3VyY2UgZmlsZSB3aWxsIGJlIHZpc2l0ZWQgc3VjaCB0aGF0IGNlcnRhaW5cbiAgICogcHJvY2Vzc2luZyBzdGVwcyBjYW4gYmUgZG9uZSB1cC1mcm9udCBhbmQgY2FjaGVkIGZvciBzdWJzZXF1ZW50IHVzYWdlcy5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIHRoYXQgbmVlZHMgdG8gaGF2ZSBnb25lIHRocm91Z2ggcHJlcHJvY2Vzc2luZy5cbiAgICovXG4gIHByb3RlY3RlZCBlbnN1cmVQcmVwcm9jZXNzZWQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVwcm9jZXNzZWRTb3VyY2VGaWxlcy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgIHRoaXMucHJlcHJvY2Vzc2VkU291cmNlRmlsZXMuYWRkKHNvdXJjZUZpbGUpO1xuXG4gICAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSkpIHtcbiAgICAgICAgdGhpcy5wcmVwcm9jZXNzU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFuYWx5emVzIHRoZSBnaXZlbiBzdGF0ZW1lbnQgdG8gc2VlIGlmIGl0IGNvcnJlc3BvbmRzIHdpdGggYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBsaWtlXG4gICAqIGBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307YC4gSWYgc28sIHRoZSBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc18xYFxuICAgKiBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGBNeUNsYXNzYCBpZGVudGlmaWVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3RhdGVtZW50IFRoZSBzdGF0ZW1lbnQgdGhhdCBuZWVkcyB0byBiZSBwcmVwcm9jZXNzZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJlcHJvY2Vzc1N0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb25zID0gc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnM7XG4gICAgaWYgKGRlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGRlY2xhcmF0aW9uc1swXTtcbiAgICBjb25zdCBpbml0aWFsaXplciA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2xhcmF0aW9uLm5hbWUpIHx8ICFpbml0aWFsaXplciB8fCAhaXNBc3NpZ25tZW50KGluaXRpYWxpemVyKSB8fFxuICAgICAgICAhdHMuaXNJZGVudGlmaWVyKGluaXRpYWxpemVyLmxlZnQpIHx8ICF0aGlzLmlzQ2xhc3MoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWxpYXNlZElkZW50aWZpZXIgPSBpbml0aWFsaXplci5sZWZ0O1xuXG4gICAgY29uc3QgYWxpYXNlZERlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihhbGlhc2VkSWRlbnRpZmllcik7XG4gICAgaWYgKGFsaWFzZWREZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBhbGlhc2VkRGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbmFibGUgdG8gbG9jYXRlIGRlY2xhcmF0aW9uIG9mICR7YWxpYXNlZElkZW50aWZpZXIudGV4dH0gaW4gXCIke3N0YXRlbWVudC5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG4gICAgdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuc2V0KGFsaWFzZWREZWNsYXJhdGlvbi5ub2RlLCBkZWNsYXJhdGlvbi5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciBhIG1vZHVsZS5cbiAgICpcbiAgICogSW4gRVM1IGFuZCBFUzIwMTUgdGhpcyBpcyBqdXN0IHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBvZiB0aGUgZmlsZS5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIG1vZHVsZSB3aG9zZSBzdGF0ZW1lbnRzIHdlIHdhbnQuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciB0aGUgZ2l2ZW4gbW9kdWxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzb3VyY2VGaWxlLnN0YXRlbWVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdhbGsgdGhlIEFTVCBsb29raW5nIGZvciBhbiBhc3NpZ25tZW50IHRvIHRoZSBzcGVjaWZpZWQgc3ltYm9sLlxuICAgKiBAcGFyYW0gbm9kZSBUaGUgY3VycmVudCBub2RlIHdlIGFyZSBzZWFyY2hpbmcuXG4gICAqIEByZXR1cm5zIGFuIGV4cHJlc3Npb24gdGhhdCByZXByZXNlbnRzIHRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUsIG9yIHVuZGVmaW5lZCBpZiBub25lIGNhbiBiZVxuICAgKiBmb3VuZC5cbiAgICovXG4gIHByb3RlY3RlZCBmaW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShub2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCwgc3ltYm9sOiB0cy5TeW1ib2wpOlxuICAgICAgdHMuQ2FsbEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiBub2RlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbikge1xuICAgICAgY29uc3QgbGVmdCA9IG5vZGUubGVmdDtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gbm9kZS5yaWdodDtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIobGVmdCkgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obGVmdCkgPT09IHN5bWJvbCkge1xuICAgICAgICByZXR1cm4gKHRzLmlzQ2FsbEV4cHJlc3Npb24ocmlnaHQpICYmIGdldENhbGxlZU5hbWUocmlnaHQpID09PSAnX19kZWNvcmF0ZScpID8gcmlnaHQgOiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUocmlnaHQsIHN5bWJvbCk7XG4gICAgfVxuICAgIHJldHVybiBub2RlLmZvckVhY2hDaGlsZChub2RlID0+IHRoaXMuZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUobm9kZSwgc3ltYm9sKSkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gcmV0cmlldmUgdGhlIHN5bWJvbCBvZiBhIHN0YXRpYyBwcm9wZXJ0eSBvbiBhIGNsYXNzLlxuICAgKlxuICAgKiBJbiBzb21lIGNhc2VzLCBhIHN0YXRpYyBwcm9wZXJ0eSBjYW4gZWl0aGVyIGJlIHNldCBvbiB0aGUgaW5uZXIgZGVjbGFyYXRpb24gaW5zaWRlIHRoZSBjbGFzcydcbiAgICogSUlGRSwgb3IgaXQgY2FuIGJlIHNldCBvbiB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24uIFRoZXJlZm9yZSwgdGhlIGhvc3QgY2hlY2tzIGJvdGhcbiAgICogcGxhY2VzLCBmaXJzdCBsb29raW5nIHVwIHRoZSBwcm9wZXJ0eSBvbiB0aGUgaW5uZXIgc3ltYm9sLCBhbmQgaWYgdGhlIHByb3BlcnR5IGlzIG5vdCBmb3VuZCBpdFxuICAgKiB3aWxsIGZhbGwgYmFjayB0byBsb29raW5nIHVwIHRoZSBwcm9wZXJ0eSBvbiB0aGUgb3V0ZXIgc3ltYm9sLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwcm9wZXJ0eSB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIHByb3BlcnR5TmFtZSB0aGUgbmFtZSBvZiBzdGF0aWMgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgaWYgaXQgaXMgZm91bmQgb3IgYHVuZGVmaW5lZGAgaWYgbm90LlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRpY1Byb3BlcnR5KHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sLCBwcm9wZXJ0eU5hbWU6IHRzLl9fU3RyaW5nKTogdHMuU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc3ltYm9sLmltcGxlbWVudGF0aW9uLmV4cG9ydHMgJiYgc3ltYm9sLmltcGxlbWVudGF0aW9uLmV4cG9ydHMuZ2V0KHByb3BlcnR5TmFtZSkgfHxcbiAgICAgICAgc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMgJiYgc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMuZ2V0KHByb3BlcnR5TmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeS1wb2ludCBmb3Igb2J0YWluaW5nIGluZm9ybWF0aW9uIG9uIHRoZSBkZWNvcmF0b3JzIG9mIGEgZ2l2ZW4gY2xhc3MuIFRoaXNcbiAgICogaW5mb3JtYXRpb24gaXMgY29tcHV0ZWQgZWl0aGVyIGZyb20gc3RhdGljIHByb3BlcnRpZXMgaWYgcHJlc2VudCwgb3IgdXNpbmcgYHRzbGliLl9fZGVjb3JhdGVgXG4gICAqIGhlbHBlciBjYWxscyBvdGhlcndpc2UuIFRoZSBjb21wdXRlZCByZXN1bHQgaXMgY2FjaGVkIHBlciBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyBmb3Igd2hpY2ggZGVjb3JhdG9ycyBzaG91bGQgYmUgYWNxdWlyZWQuXG4gICAqIEByZXR1cm5zIGFsbCBpbmZvcm1hdGlvbiBvZiB0aGUgZGVjb3JhdG9ycyBvbiB0aGUgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWNxdWlyZURlY29yYXRvckluZm8oY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IERlY29yYXRvckluZm8ge1xuICAgIGNvbnN0IGRlY2wgPSBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmICh0aGlzLmRlY29yYXRvckNhY2hlLmhhcyhkZWNsKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVjb3JhdG9yQ2FjaGUuZ2V0KGRlY2wpITtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IGRlY29yYXRvcnMgZnJvbSBzdGF0aWMgcHJvcGVydGllcyBhbmQgYF9fZGVjb3JhdGVgIGhlbHBlciBjYWxscywgdGhlbiBtZXJnZSB0aGVtXG4gICAgLy8gdG9nZXRoZXIgd2hlcmUgdGhlIGluZm9ybWF0aW9uIGZyb20gdGhlIHN0YXRpYyBwcm9wZXJ0aWVzIGlzIHByZWZlcnJlZC5cbiAgICBjb25zdCBzdGF0aWNQcm9wcyA9IHRoaXMuY29tcHV0ZURlY29yYXRvckluZm9Gcm9tU3RhdGljUHJvcGVydGllcyhjbGFzc1N5bWJvbCk7XG4gICAgY29uc3QgaGVscGVyQ2FsbHMgPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sKTtcblxuICAgIGNvbnN0IGRlY29yYXRvckluZm86IERlY29yYXRvckluZm8gPSB7XG4gICAgICBjbGFzc0RlY29yYXRvcnM6IHN0YXRpY1Byb3BzLmNsYXNzRGVjb3JhdG9ycyB8fCBoZWxwZXJDYWxscy5jbGFzc0RlY29yYXRvcnMsXG4gICAgICBtZW1iZXJEZWNvcmF0b3JzOiBzdGF0aWNQcm9wcy5tZW1iZXJEZWNvcmF0b3JzIHx8IGhlbHBlckNhbGxzLm1lbWJlckRlY29yYXRvcnMsXG4gICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mbzogc3RhdGljUHJvcHMuY29uc3RydWN0b3JQYXJhbUluZm8gfHwgaGVscGVyQ2FsbHMuY29uc3RydWN0b3JQYXJhbUluZm8sXG4gICAgfTtcblxuICAgIHRoaXMuZGVjb3JhdG9yQ2FjaGUuc2V0KGRlY2wsIGRlY29yYXRvckluZm8pO1xuICAgIHJldHVybiBkZWNvcmF0b3JJbmZvO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHRzIHRvIGNvbXB1dGUgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gc3RhdGljIHByb3BlcnRpZXMgXCJkZWNvcmF0b3JzXCIsIFwicHJvcERlY29yYXRvcnNcIlxuICAgKiBhbmQgXCJjdG9yUGFyYW1ldGVyc1wiIG9uIHRoZSBjbGFzcy4gSWYgbmVpdGhlciBvZiB0aGVzZSBzdGF0aWMgcHJvcGVydGllcyBpcyBwcmVzZW50IHRoZVxuICAgKiBsaWJyYXJ5IGlzIGxpa2VseSBub3QgY29tcGlsZWQgdXNpbmcgdHNpY2tsZSBmb3IgdXNhZ2Ugd2l0aCBDbG9zdXJlIGNvbXBpbGVyLCBpbiB3aGljaCBjYXNlXG4gICAqIGBudWxsYCBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIFRoZSBjbGFzcyBzeW1ib2wgdG8gY29tcHV0ZSB0aGUgZGVjb3JhdG9ycyBpbmZvcm1hdGlvbiBmb3IuXG4gICAqIEByZXR1cm5zIEFsbCBpbmZvcm1hdGlvbiBvbiB0aGUgZGVjb3JhdG9ycyBhcyBleHRyYWN0ZWQgZnJvbSBzdGF0aWMgcHJvcGVydGllcywgb3IgYG51bGxgIGlmXG4gICAqIG5vbmUgb2YgdGhlIHN0YXRpYyBwcm9wZXJ0aWVzIGV4aXN0LlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbVN0YXRpY1Byb3BlcnRpZXMoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHtcbiAgICBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGw7IG1lbWJlckRlY29yYXRvcnM6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPnwgbnVsbDtcbiAgICBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW10gfCBudWxsO1xuICB9IHtcbiAgICBsZXQgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsID0gbnVsbDtcbiAgICBsZXQgbWVtYmVyRGVjb3JhdG9yczogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+fG51bGwgPSBudWxsO1xuICAgIGxldCBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW118bnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCBkZWNvcmF0b3JzUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBERUNPUkFUT1JTKTtcbiAgICBpZiAoZGVjb3JhdG9yc1Byb3BlcnR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsYXNzRGVjb3JhdG9ycyA9IHRoaXMuZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvcERlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIFBST1BfREVDT1JBVE9SUyk7XG4gICAgaWYgKHByb3BEZWNvcmF0b3JzUHJvcGVydHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbWVtYmVyRGVjb3JhdG9ycyA9IHRoaXMuZ2V0TWVtYmVyRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShwcm9wRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9XG5cbiAgICBjb25zdCBjb25zdHJ1Y3RvclBhcmFtc1Byb3BlcnR5ID0gdGhpcy5nZXRTdGF0aWNQcm9wZXJ0eShjbGFzc1N5bWJvbCwgQ09OU1RSVUNUT1JfUEFSQU1TKTtcbiAgICBpZiAoY29uc3RydWN0b3JQYXJhbXNQcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mbyA9IHRoaXMuZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KGNvbnN0cnVjdG9yUGFyYW1zUHJvcGVydHkpO1xuICAgIH1cblxuICAgIHJldHVybiB7Y2xhc3NEZWNvcmF0b3JzLCBtZW1iZXJEZWNvcmF0b3JzLCBjb25zdHJ1Y3RvclBhcmFtSW5mb307XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBjbGFzcyBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MsIHdoZXJlIHRoZSBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZFxuICAgKiB2aWEgYSBzdGF0aWMgcHJvcGVydHkuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNTeW1ib2wgdGhlIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGRlY29yYXRvcnMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgb3IgbnVsbCBpZiBub25lIHdoZXJlIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzU3ltYm9sOiB0cy5TeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzSWRlbnRpZmllciA9IGRlY29yYXRvcnNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoZGVjb3JhdG9yc0lkZW50aWZpZXIgJiYgZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSB7XG4gICAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkgJiZcbiAgICAgICAgICBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICAgIC8vIEFTVCBvZiB0aGUgYXJyYXkgb2YgZGVjb3JhdG9yIHZhbHVlc1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzQXJyYXkgPSBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQucmlnaHQ7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheSlcbiAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIHN5bWJvbCB3aGljaCBzaG91bGQgYmUgb2YgYSBjbGFzcywgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBpdHMgbWVtYmVycy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgYENsYXNzU3ltYm9sYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlcnNPZlN5bWJvbChzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcblxuICAgIC8vIFRoZSBkZWNvcmF0b3JzIG1hcCBjb250YWlucyBhbGwgdGhlIHByb3BlcnRpZXMgdGhhdCBhcmUgZGVjb3JhdGVkXG4gICAgY29uc3Qge21lbWJlckRlY29yYXRvcnN9ID0gdGhpcy5hY3F1aXJlRGVjb3JhdG9ySW5mbyhzeW1ib2wpO1xuXG4gICAgLy8gTWFrZSBhIGNvcHkgb2YgdGhlIGRlY29yYXRvcnMgYXMgc3VjY2Vzc2Z1bGx5IHJlZmxlY3RlZCBtZW1iZXJzIGRlbGV0ZSB0aGVtc2VsdmVzIGZyb20gdGhlXG4gICAgLy8gbWFwLCBzbyB0aGF0IGFueSBsZWZ0b3ZlcnMgY2FuIGJlIGVhc2lseSBkZWFsdCB3aXRoLlxuICAgIGNvbnN0IGRlY29yYXRvcnNNYXAgPSBuZXcgTWFwKG1lbWJlckRlY29yYXRvcnMpO1xuXG4gICAgLy8gVGhlIG1lbWJlciBtYXAgY29udGFpbnMgYWxsIHRoZSBtZXRob2QgKGluc3RhbmNlIGFuZCBzdGF0aWMpOyBhbmQgYW55IGluc3RhbmNlIHByb3BlcnRpZXNcbiAgICAvLyB0aGF0IGFyZSBpbml0aWFsaXplZCBpbiB0aGUgY2xhc3MuXG4gICAgaWYgKHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5tZW1iZXJzKSB7XG4gICAgICBzeW1ib2wuaW1wbGVtZW50YXRpb24ubWVtYmVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMpO1xuICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVGhlIHN0YXRpYyBwcm9wZXJ0eSBtYXAgY29udGFpbnMgYWxsIHRoZSBzdGF0aWMgcHJvcGVydGllc1xuICAgIGlmIChzeW1ib2wuaW1wbGVtZW50YXRpb24uZXhwb3J0cykge1xuICAgICAgc3ltYm9sLmltcGxlbWVudGF0aW9uLmV4cG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgIGNvbnN0IHJlZmxlY3RlZE1lbWJlcnMgPSB0aGlzLnJlZmxlY3RNZW1iZXJzKHZhbHVlLCBkZWNvcmF0b3JzLCB0cnVlKTtcbiAgICAgICAgaWYgKHJlZmxlY3RlZE1lbWJlcnMpIHtcbiAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICBtZW1iZXJzLnB1c2goLi4ucmVmbGVjdGVkTWVtYmVycyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoaXMgY2xhc3Mgd2FzIGRlY2xhcmVkIGFzIGEgVmFyaWFibGVEZWNsYXJhdGlvbiB0aGVuIGl0IG1heSBoYXZlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgLy8gYXR0YWNoZWQgdG8gdGhlIHZhcmlhYmxlIHJhdGhlciB0aGFuIHRoZSBjbGFzcyBpdHNlbGZcbiAgICAvLyBGb3IgZXhhbXBsZTpcbiAgICAvLyBgYGBcbiAgICAvLyBsZXQgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge1xuICAgIC8vICAgLy8gbm8gc3RhdGljIHByb3BlcnRpZXMgaGVyZSFcbiAgICAvLyB9XG4gICAgLy8gTXlDbGFzcy5zdGF0aWNQcm9wZXJ0eSA9IC4uLjtcbiAgICAvLyBgYGBcbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHN5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgaWYgKHN5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzKSB7XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHRoaXMgY2xhc3Mgd2FzIGRlY2xhcmVkIGFzIGEgVmFyaWFibGVEZWNsYXJhdGlvbiBpbnNpZGUgYW4gSUlGRSwgdGhlbiBpdCBtYXkgaGF2ZSBzdGF0aWNcbiAgICAvLyBwcm9wZXJ0aWVzIGF0dGFjaGVkIHRvIHRoZSB2YXJpYWJsZSByYXRoZXIgdGhhbiB0aGUgY2xhc3MgaXRzZWxmLlxuICAgIC8vXG4gICAgLy8gRm9yIGV4YW1wbGU6XG4gICAgLy8gYGBgXG4gICAgLy8gbGV0IE91dGVyQ2xhc3MgPSAoKCkgPT4ge1xuICAgIC8vICAgbGV0IEFkamFjZW50Q2xhc3MgPSBjbGFzcyBJbnRlcm5hbENsYXNzIHtcbiAgICAvLyAgICAgLy8gbm8gc3RhdGljIHByb3BlcnRpZXMgaGVyZSFcbiAgICAvLyAgIH1cbiAgICAvLyAgIEFkamFjZW50Q2xhc3Muc3RhdGljUHJvcGVydHkgPSAuLi47XG4gICAgLy8gfSkoKTtcbiAgICAvLyBgYGBcbiAgICBpZiAoc3ltYm9sLmFkamFjZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oc3ltYm9sLmFkamFjZW50LnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICAgIGlmIChzeW1ib2wuYWRqYWNlbnQuZXhwb3J0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgc3ltYm9sLmFkamFjZW50LmV4cG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICAgICAgaWYgKHJlZmxlY3RlZE1lbWJlcnMpIHtcbiAgICAgICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlYWwgd2l0aCBhbnkgZGVjb3JhdGVkIHByb3BlcnRpZXMgdGhhdCB3ZXJlIG5vdCBpbml0aWFsaXplZCBpbiB0aGUgY2xhc3NcbiAgICBkZWNvcmF0b3JzTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgIGltcGxlbWVudGF0aW9uOiBudWxsLFxuICAgICAgICBkZWNvcmF0b3JzOiB2YWx1ZSxcbiAgICAgICAgaXNTdGF0aWM6IGZhbHNlLFxuICAgICAgICBraW5kOiBDbGFzc01lbWJlcktpbmQuUHJvcGVydHksXG4gICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgbmFtZU5vZGU6IG51bGwsXG4gICAgICAgIG5vZGU6IG51bGwsXG4gICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgIHZhbHVlOiBudWxsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBtZW1iZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIE1lbWJlciBkZWNvcmF0b3JzIG1heSBiZSBkZWNsYXJlZCBhcyBzdGF0aWMgcHJvcGVydGllcyBvZiB0aGUgY2xhc3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzID0ge1xuICAgKiAgIFwibmdGb3JPZlwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRyYWNrQnlcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiAgIFwibmdGb3JUZW1wbGF0ZVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqIH07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc1Byb3BlcnR5IHRoZSBjbGFzcyB3aG9zZSBtZW1iZXIgZGVjb3JhdG9ycyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYSBtYXAgd2hvc2Uga2V5cyBhcmUgdGhlIG5hbWUgb2YgdGhlIG1lbWJlcnMgYW5kIHdob3NlIHZhbHVlcyBhcmUgY29sbGVjdGlvbnMgb2ZcbiAgICogZGVjb3JhdG9ycyBmb3IgdGhlIGdpdmVuIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNZW1iZXJEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTpcbiAgICAgIE1hcDxzdHJpbmcsIERlY29yYXRvcltdPiB7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICAvLyBTeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgZm9yIGBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzYC5cbiAgICBjb25zdCBwcm9wRGVjb3JhdG9yc01hcCA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKGRlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHByb3BEZWNvcmF0b3JzTWFwICYmIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocHJvcERlY29yYXRvcnNNYXApKSB7XG4gICAgICBjb25zdCBwcm9wZXJ0aWVzTWFwID0gcmVmbGVjdE9iamVjdExpdGVyYWwocHJvcERlY29yYXRvcnNNYXApO1xuICAgICAgcHJvcGVydGllc01hcC5mb3JFYWNoKCh2YWx1ZSwgbmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID1cbiAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnModmFsdWUpLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGgpIHtcbiAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLnNldChuYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXJEZWNvcmF0b3JzO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvciBhIGdpdmVuIGNsYXNzIHN5bWJvbCwgY29sbGVjdHMgYWxsIGRlY29yYXRvciBpbmZvcm1hdGlvbiBmcm9tIHRzbGliIGhlbHBlciBtZXRob2RzLCBhc1xuICAgKiBnZW5lcmF0ZWQgYnkgVHlwZVNjcmlwdCBpbnRvIGVtaXR0ZWQgSmF2YVNjcmlwdCBmaWxlcy5cbiAgICpcbiAgICogQ2xhc3MgZGVjb3JhdG9ycyBhcmUgZXh0cmFjdGVkIGZyb20gY2FsbHMgdG8gYHRzbGliLl9fZGVjb3JhdGVgIHRoYXQgbG9vayBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IFNvbWVEaXJlY3RpdmUgPSBjbGFzcyBTb21lRGlyZWN0aXZlIHt9XG4gICAqIFNvbWVEaXJlY3RpdmUgPSBfX2RlY29yYXRlKFtcbiAgICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGV4dHJhY3Rpb24gb2YgbWVtYmVyIGRlY29yYXRvcnMgaXMgc2ltaWxhciwgd2l0aCB0aGUgZGlzdGluY3Rpb24gdGhhdCBpdHMgMm5kIGFuZCAzcmRcbiAgICogYXJndW1lbnQgY29ycmVzcG9uZCB3aXRoIGEgXCJwcm90b3R5cGVcIiB0YXJnZXQgYW5kIHRoZSBuYW1lIG9mIHRoZSBtZW1iZXIgdG8gd2hpY2ggdGhlXG4gICAqIGRlY29yYXRvcnMgYXBwbHkuXG4gICAqXG4gICAqIGBgYFxuICAgKiBfX2RlY29yYXRlKFtcbiAgICogICAgIElucHV0KCksXG4gICAqICAgICBfX21ldGFkYXRhKFwiZGVzaWduOnR5cGVcIiwgU3RyaW5nKVxuICAgKiBdLCBTb21lRGlyZWN0aXZlLnByb3RvdHlwZSwgXCJpbnB1dDFcIiwgdm9pZCAwKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCBUaGUgY2xhc3Mgc3ltYm9sIGZvciB3aGljaCBkZWNvcmF0b3JzIHNob3VsZCBiZSBleHRyYWN0ZWQuXG4gICAqIEByZXR1cm5zIEFsbCBpbmZvcm1hdGlvbiBvbiB0aGUgZGVjb3JhdG9ycyBvZiB0aGUgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29tcHV0ZURlY29yYXRvckluZm9Gcm9tSGVscGVyQ2FsbHMoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IERlY29yYXRvckluZm8ge1xuICAgIGxldCBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG4gICAgY29uc3QgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdID0gW107XG5cbiAgICBjb25zdCBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyA9IChpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBsZXQgcGFyYW0gPSBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF07XG4gICAgICBpZiAocGFyYW0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwYXJhbSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XSA9IHtkZWNvcmF0b3JzOiBudWxsLCB0eXBlRXhwcmVzc2lvbjogbnVsbH07XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFyYW07XG4gICAgfTtcblxuICAgIC8vIEFsbCByZWxldmFudCBpbmZvcm1hdGlvbiBjYW4gYmUgZXh0cmFjdGVkIGZyb20gY2FsbHMgdG8gYF9fZGVjb3JhdGVgLCBvYnRhaW4gdGhlc2UgZmlyc3QuXG4gICAgLy8gTm90ZSB0aGF0IGFsdGhvdWdoIHRoZSBoZWxwZXIgY2FsbHMgYXJlIHJldHJpZXZlZCB1c2luZyB0aGUgY2xhc3Mgc3ltYm9sLCB0aGUgcmVzdWx0IG1heVxuICAgIC8vIGNvbnRhaW4gaGVscGVyIGNhbGxzIGNvcnJlc3BvbmRpbmcgd2l0aCB1bnJlbGF0ZWQgY2xhc3Nlcy4gVGhlcmVmb3JlLCBlYWNoIGhlbHBlciBjYWxsIHN0aWxsXG4gICAgLy8gaGFzIHRvIGJlIGNoZWNrZWQgdG8gYWN0dWFsbHkgY29ycmVzcG9uZCB3aXRoIHRoZSBjbGFzcyBzeW1ib2wuXG4gICAgY29uc3QgaGVscGVyQ2FsbHMgPSB0aGlzLmdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2wsIFsnX19kZWNvcmF0ZSddKTtcblxuICAgIGNvbnN0IG91dGVyRGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGNvbnN0IGFkamFjZW50RGVjbGFyYXRpb24gPVxuICAgICAgICB0aGlzLmdldEFkamFjZW50TmFtZU9mQ2xhc3MoKGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pKS5wYXJlbnQ7XG4gICAgY29uc3QgbWF0Y2hlc0NsYXNzID0gKGlkZW50aWZpZXI6IHRzLklkZW50aWZpZXIpID0+IHtcbiAgICAgIGNvbnN0IGRlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgICAgcmV0dXJuIGRlY2wgIT09IG51bGwgJiZcbiAgICAgICAgICAoZGVjbC5ub2RlID09PSBhZGphY2VudERlY2xhcmF0aW9uIHx8IGRlY2wubm9kZSA9PT0gb3V0ZXJEZWNsYXJhdGlvbiB8fFxuICAgICAgICAgICBkZWNsLm5vZGUgPT09IGlubmVyRGVjbGFyYXRpb24pO1xuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IGhlbHBlckNhbGwgb2YgaGVscGVyQ2FsbHMpIHtcbiAgICAgIGlmIChpc0NsYXNzRGVjb3JhdGVDYWxsKGhlbHBlckNhbGwsIG1hdGNoZXNDbGFzcykpIHtcbiAgICAgICAgLy8gVGhpcyBgX19kZWNvcmF0ZWAgY2FsbCBpcyB0YXJnZXRpbmcgdGhlIGNsYXNzIGl0c2VsZi5cbiAgICAgICAgY29uc3QgaGVscGVyQXJncyA9IGhlbHBlckNhbGwuYXJndW1lbnRzWzBdO1xuXG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBoZWxwZXJBcmdzLmVsZW1lbnRzKSB7XG4gICAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLnJlZmxlY3REZWNvcmF0ZUhlbHBlckVudHJ5KGVsZW1lbnQpO1xuICAgICAgICAgIGlmIChlbnRyeSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09ICdkZWNvcmF0b3InKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyB3YXMgcmVmbGVjdGVkIHRvIHJlcHJlc2VudCBhbiBhY3R1YWwgZGVjb3JhdG9yXG4gICAgICAgICAgICBpZiAodGhpcy5pc0Zyb21Db3JlKGVudHJ5LmRlY29yYXRvcikpIHtcbiAgICAgICAgICAgICAgKGNsYXNzRGVjb3JhdG9ycyB8fCAoY2xhc3NEZWNvcmF0b3JzID0gW10pKS5wdXNoKGVudHJ5LmRlY29yYXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChlbnRyeS50eXBlID09PSAncGFyYW06ZGVjb3JhdG9ycycpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHJlcHJlc2VudHMgYSBkZWNvcmF0b3IgZm9yIGEgcGFyYW1ldGVyLiBTaW5jZSBpdCdzIGFwcGxpZWQgdG8gdGhlXG4gICAgICAgICAgICAvLyBjbGFzcywgaXQgY29ycmVzcG9uZHMgd2l0aCBhIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBvZiB0aGUgY2xhc3MuXG4gICAgICAgICAgICBjb25zdCBwYXJhbSA9IGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKGVudHJ5LmluZGV4KTtcbiAgICAgICAgICAgIChwYXJhbS5kZWNvcmF0b3JzIHx8IChwYXJhbS5kZWNvcmF0b3JzID0gW10pKS5wdXNoKGVudHJ5LmRlY29yYXRvcik7XG4gICAgICAgICAgfSBlbHNlIGlmIChlbnRyeS50eXBlID09PSAncGFyYW1zJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgcmVwcmVzZW50cyB0aGUgdHlwZXMgb2YgdGhlIHBhcmFtZXRlcnMuIFNpbmNlIGl0J3MgYXBwbGllZCB0byB0aGVcbiAgICAgICAgICAgIC8vIGNsYXNzLCBpdCBjb3JyZXNwb25kcyB3aXRoIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIHRoZSBjbGFzcy5cbiAgICAgICAgICAgIGVudHJ5LnR5cGVzLmZvckVhY2goXG4gICAgICAgICAgICAgICAgKHR5cGUsIGluZGV4KSA9PiBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhpbmRleCkudHlwZUV4cHJlc3Npb24gPSB0eXBlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNNZW1iZXJEZWNvcmF0ZUNhbGwoaGVscGVyQ2FsbCwgbWF0Y2hlc0NsYXNzKSkge1xuICAgICAgICAvLyBUaGUgYF9fZGVjb3JhdGVgIGNhbGwgaXMgdGFyZ2V0aW5nIGEgbWVtYmVyIG9mIHRoZSBjbGFzc1xuICAgICAgICBjb25zdCBoZWxwZXJBcmdzID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMF07XG4gICAgICAgIGNvbnN0IG1lbWJlck5hbWUgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1syXS50ZXh0O1xuXG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBoZWxwZXJBcmdzLmVsZW1lbnRzKSB7XG4gICAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLnJlZmxlY3REZWNvcmF0ZUhlbHBlckVudHJ5KGVsZW1lbnQpO1xuICAgICAgICAgIGlmIChlbnRyeSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09ICdkZWNvcmF0b3InKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyB3YXMgcmVmbGVjdGVkIHRvIHJlcHJlc2VudCBhbiBhY3R1YWwgZGVjb3JhdG9yLlxuICAgICAgICAgICAgaWYgKHRoaXMuaXNGcm9tQ29yZShlbnRyeS5kZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5oYXMobWVtYmVyTmFtZSkgPyBtZW1iZXJEZWNvcmF0b3JzLmdldChtZW1iZXJOYW1lKSEgOiBbXTtcbiAgICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKGVudHJ5LmRlY29yYXRvcik7XG4gICAgICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG1lbWJlck5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJbmZvcm1hdGlvbiBvbiBkZWNvcmF0ZWQgcGFyYW1ldGVycyBpcyBub3QgaW50ZXJlc3RpbmcgZm9yIG5nY2MsIHNvIGl0J3MgaWdub3JlZC5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge2NsYXNzRGVjb3JhdG9ycywgbWVtYmVyRGVjb3JhdG9ycywgY29uc3RydWN0b3JQYXJhbUluZm99O1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3QgdGhlIGRldGFpbHMgb2YgYW4gZW50cnkgd2l0aGluIGEgYF9fZGVjb3JhdGVgIGhlbHBlciBjYWxsLiBGb3IgZXhhbXBsZSwgZ2l2ZW4gdGhlXG4gICAqIGZvbGxvd2luZyBjb2RlOlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiAgIHRzbGliXzEuX19wYXJhbSgyLCBJbmplY3QoSU5KRUNURURfVE9LRU4pKSxcbiAgICogICB0c2xpYl8xLl9fbWV0YWRhdGEoXCJkZXNpZ246cGFyYW10eXBlc1wiLCBbVmlld0NvbnRhaW5lclJlZiwgVGVtcGxhdGVSZWYsIFN0cmluZ10pXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICAgKiBgYGBcbiAgICpcbiAgICogaXQgY2FuIGJlIHNlZW4gdGhhdCB0aGVyZSBhcmUgY2FsbHMgdG8gcmVndWxhciBkZWNvcmF0b3JzICh0aGUgYERpcmVjdGl2ZWApIGFuZCBjYWxscyBpbnRvXG4gICAqIGB0c2xpYmAgZnVuY3Rpb25zIHdoaWNoIGhhdmUgYmVlbiBpbnNlcnRlZCBieSBUeXBlU2NyaXB0LiBUaGVyZWZvcmUsIHRoaXMgZnVuY3Rpb24gY2xhc3NpZmllc1xuICAgKiBhIGNhbGwgdG8gY29ycmVzcG9uZCB3aXRoXG4gICAqICAgMS4gYSByZWFsIGRlY29yYXRvciBsaWtlIGBEaXJlY3RpdmVgIGFib3ZlLCBvclxuICAgKiAgIDIuIGEgZGVjb3JhdGVkIHBhcmFtZXRlciwgY29ycmVzcG9uZGluZyB3aXRoIGBfX3BhcmFtYCBjYWxscyBmcm9tIGB0c2xpYmAsIG9yXG4gICAqICAgMy4gdGhlIHR5cGUgaW5mb3JtYXRpb24gb2YgcGFyYW1ldGVycywgY29ycmVzcG9uZGluZyB3aXRoIGBfX21ldGFkYXRhYCBjYWxsIGZyb20gYHRzbGliYFxuICAgKlxuICAgKiBAcGFyYW0gZXhwcmVzc2lvbiB0aGUgZXhwcmVzc2lvbiB0aGF0IG5lZWRzIHRvIGJlIHJlZmxlY3RlZCBpbnRvIGEgYERlY29yYXRlSGVscGVyRW50cnlgXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCB0aGF0IGluZGljYXRlcyB3aGljaCBvZiB0aGUgdGhyZWUgY2F0ZWdvcmllcyB0aGUgY2FsbCByZXByZXNlbnRzLCB0b2dldGhlclxuICAgKiB3aXRoIHRoZSByZWZsZWN0ZWQgaW5mb3JtYXRpb24gb2YgdGhlIGNhbGwsIG9yIG51bGwgaWYgdGhlIGNhbGwgaXMgbm90IGEgdmFsaWQgZGVjb3JhdGUgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjb3JhdGVIZWxwZXJFbnRyeXxudWxsIHtcbiAgICAvLyBXZSBvbmx5IGNhcmUgYWJvdXQgdGhvc2UgZWxlbWVudHMgdGhhdCBhcmUgYWN0dWFsIGNhbGxzXG4gICAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY2FsbCA9IGV4cHJlc3Npb247XG5cbiAgICBjb25zdCBoZWxwZXJOYW1lID0gZ2V0Q2FsbGVlTmFtZShjYWxsKTtcbiAgICBpZiAoaGVscGVyTmFtZSA9PT0gJ19fbWV0YWRhdGEnKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgYHRzbGliLl9fbWV0YWRhdGFgIGNhbGwsIHJlZmxlY3QgdG8gYXJndW1lbnRzIGludG8gYSBgUGFyYW1ldGVyVHlwZXNgIG9iamVjdFxuICAgICAgLy8gaWYgdGhlIG1ldGFkYXRhIGtleSBpcyBcImRlc2lnbjpwYXJhbXR5cGVzXCIuXG4gICAgICBjb25zdCBrZXkgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKGtleSkgfHwga2V5LnRleHQgIT09ICdkZXNpZ246cGFyYW10eXBlcycpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHZhbHVlID0gY2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3BhcmFtcycsXG4gICAgICAgIHR5cGVzOiBBcnJheS5mcm9tKHZhbHVlLmVsZW1lbnRzKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGhlbHBlck5hbWUgPT09ICdfX3BhcmFtJykge1xuICAgICAgLy8gVGhpcyBpcyBhIGB0c2xpYi5fX3BhcmFtYCBjYWxsIHRoYXQgaXMgcmVmbGVjdGVkIGludG8gYSBgUGFyYW1ldGVyRGVjb3JhdG9yc2Agb2JqZWN0LlxuICAgICAgY29uc3QgaW5kZXhBcmcgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgIGNvbnN0IGluZGV4ID0gaW5kZXhBcmcgJiYgdHMuaXNOdW1lcmljTGl0ZXJhbChpbmRleEFyZykgPyBwYXJzZUludChpbmRleEFyZy50ZXh0LCAxMCkgOiBOYU47XG4gICAgICBpZiAoaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvcmF0b3JDYWxsID0gY2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAoZGVjb3JhdG9yQ2FsbCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckNhbGwpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvcmF0b3IgPSB0aGlzLnJlZmxlY3REZWNvcmF0b3JDYWxsKGRlY29yYXRvckNhbGwpO1xuICAgICAgaWYgKGRlY29yYXRvciA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3BhcmFtOmRlY29yYXRvcnMnLFxuICAgICAgICBpbmRleCxcbiAgICAgICAgZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgYXR0ZW1wdCB0byByZWZsZWN0IGl0IGFzIGEgcmVndWxhciBkZWNvcmF0b3IuXG4gICAgY29uc3QgZGVjb3JhdG9yID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChjYWxsKTtcbiAgICBpZiAoZGVjb3JhdG9yID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdkZWNvcmF0b3InLFxuICAgICAgZGVjb3JhdG9yLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRvckNhbGwoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pOiBEZWNvcmF0b3J8bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9yRXhwcmVzc2lvbiA9IGNhbGwuZXhwcmVzc2lvbjtcbiAgICBpZiAoIWlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JFeHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2UgZm91bmQgYSBkZWNvcmF0b3IhXG4gICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9XG4gICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByZXNzaW9uKSA/IGRlY29yYXRvckV4cHJlc3Npb24gOiBkZWNvcmF0b3JFeHByZXNzaW9uLm5hbWU7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgaWRlbnRpZmllcjogZGVjb3JhdG9yRXhwcmVzc2lvbixcbiAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjb3JhdG9ySWRlbnRpZmllciksXG4gICAgICBub2RlOiBjYWxsLFxuICAgICAgYXJnczogQXJyYXkuZnJvbShjYWxsLmFyZ3VtZW50cyksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB0aGUgZ2l2ZW4gc3RhdGVtZW50IHRvIHNlZSBpZiBpdCBpcyBhIGNhbGwgdG8gYW55IG9mIHRoZSBzcGVjaWZpZWQgaGVscGVyIGZ1bmN0aW9ucyBvclxuICAgKiBudWxsIGlmIG5vdCBmb3VuZC5cbiAgICpcbiAgICogTWF0Y2hpbmcgc3RhdGVtZW50cyB3aWxsIGxvb2sgbGlrZTogIGB0c2xpYl8xLl9fZGVjb3JhdGUoLi4uKTtgLlxuICAgKiBAcGFyYW0gc3RhdGVtZW50IHRoZSBzdGF0ZW1lbnQgdGhhdCBtYXkgY29udGFpbiB0aGUgY2FsbC5cbiAgICogQHBhcmFtIGhlbHBlck5hbWVzIHRoZSBuYW1lcyBvZiB0aGUgaGVscGVyIHdlIGFyZSBsb29raW5nIGZvci5cbiAgICogQHJldHVybnMgdGhlIG5vZGUgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgYF9fZGVjb3JhdGUoLi4uKWAgY2FsbCBvciBudWxsIGlmIHRoZSBzdGF0ZW1lbnRcbiAgICogZG9lcyBub3QgbWF0Y2guXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SGVscGVyQ2FsbChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCwgaGVscGVyTmFtZXM6IHN0cmluZ1tdKTogdHMuQ2FsbEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCh0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSB8fCB0cy5pc1JldHVyblN0YXRlbWVudChzdGF0ZW1lbnQpKSAmJlxuICAgICAgICBzdGF0ZW1lbnQuZXhwcmVzc2lvbikge1xuICAgICAgbGV0IGV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjtcbiAgICAgIHdoaWxlIChpc0Fzc2lnbm1lbnQoZXhwcmVzc2lvbikpIHtcbiAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24ucmlnaHQ7XG4gICAgICB9XG4gICAgICBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgICBjb25zdCBjYWxsZWVOYW1lID0gZ2V0Q2FsbGVlTmFtZShleHByZXNzaW9uKTtcbiAgICAgICAgaWYgKGNhbGxlZU5hbWUgIT09IG51bGwgJiYgaGVscGVyTmFtZXMuaW5jbHVkZXMoY2FsbGVlTmFtZSkpIHtcbiAgICAgICAgICByZXR1cm4gZXhwcmVzc2lvbjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgZ2l2ZW4gYXJyYXkgbm9kZSBhbmQgZXh0cmFjdCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSBlYWNoIGVsZW1lbnQuXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCBmb3IgZGVjb3JhdG9ycyB0aGF0IGFyZSBkZWZpbmVkIGluIHN0YXRpYyBwcm9wZXJ0aWVzLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAgICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc0FycmF5IGFuIGV4cHJlc3Npb24gdGhhdCBjb250YWlucyBkZWNvcmF0b3IgaW5mb3JtYXRpb24uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvciBpbmZvIHRoYXQgd2FzIHJlZmxlY3RlZCBmcm9tIHRoZSBhcnJheSBub2RlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheTogdHMuRXhwcmVzc2lvbik6IERlY29yYXRvcltdIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSA9IFtdO1xuXG4gICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZWNvcmF0b3JzQXJyYXkpKSB7XG4gICAgICAvLyBBZGQgZWFjaCBkZWNvcmF0b3IgdGhhdCBpcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYCBpbnRvIHRoZSBgZGVjb3JhdG9yc2AgYXJyYXlcbiAgICAgIGRlY29yYXRvcnNBcnJheS5lbGVtZW50cy5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICAvLyBJZiB0aGUgZGVjb3JhdG9yIGlzIG5vdCBhbiBvYmplY3QgbGl0ZXJhbCBleHByZXNzaW9uIHRoZW4gd2UgYXJlIG5vdCBpbnRlcmVzdGVkXG4gICAgICAgIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmhhcygndHlwZScpKSB7XG4gICAgICAgICAgICBsZXQgZGVjb3JhdG9yVHlwZSA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKSE7XG4gICAgICAgICAgICBpZiAoaXNEZWNvcmF0b3JJZGVudGlmaWVyKGRlY29yYXRvclR5cGUpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcklkZW50aWZpZXIgPVxuICAgICAgICAgICAgICAgICAgdHMuaXNJZGVudGlmaWVyKGRlY29yYXRvclR5cGUpID8gZGVjb3JhdG9yVHlwZSA6IGRlY29yYXRvclR5cGUubmFtZTtcbiAgICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiBkZWNvcmF0b3JJZGVudGlmaWVyLnRleHQsXG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogZGVjb3JhdG9yVHlwZSxcbiAgICAgICAgICAgICAgICBpbXBvcnQ6IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpLFxuICAgICAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICAgICAgYXJnczogZ2V0RGVjb3JhdG9yQXJncyhub2RlKSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICpcbiAgICogQSBzaW5nbGUgc3ltYm9sIG1heSByZXByZXNlbnQgbXVsdGlwbGUgY2xhc3MgbWVtYmVycyBpbiB0aGUgY2FzZSBvZiBhY2Nlc3NvcnM7XG4gICAqIGFuIGVxdWFsbHkgbmFtZWQgZ2V0dGVyL3NldHRlciBhY2Nlc3NvciBwYWlyIGlzIGNvbWJpbmVkIGludG8gYSBzaW5nbGUgc3ltYm9sLlxuICAgKiBXaGVuIHRoZSBzeW1ib2wgaXMgcmVjb2duaXplZCBhcyByZXByZXNlbnRpbmcgYW4gYWNjZXNzb3IsIGl0cyBkZWNsYXJhdGlvbnMgYXJlXG4gICAqIGFuYWx5emVkIHN1Y2ggdGhhdCBib3RoIHRoZSBzZXR0ZXIgYW5kIGdldHRlciBhY2Nlc3NvciBhcmUgcmV0dXJuZWQgYXMgc2VwYXJhdGVcbiAgICogY2xhc3MgbWVtYmVycy5cbiAgICpcbiAgICogT25lIGRpZmZlcmVuY2Ugd3J0IHRoZSBUeXBlU2NyaXB0IGhvc3QgaXMgdGhhdCBpbiBFUzIwMTUsIHdlIGNhbm5vdCBzZWUgd2hpY2hcbiAgICogYWNjZXNzb3Igb3JpZ2luYWxseSBoYWQgYW55IGRlY29yYXRvcnMgYXBwbGllZCB0byB0aGVtLCBhcyBkZWNvcmF0b3JzIGFyZSBhcHBsaWVkXG4gICAqIHRvIHRoZSBwcm9wZXJ0eSBkZXNjcmlwdG9yIGluIGdlbmVyYWwsIG5vdCBhIHNwZWNpZmljIGFjY2Vzc29yLiBJZiBhbiBhY2Nlc3NvclxuICAgKiBoYXMgYm90aCBhIHNldHRlciBhbmQgZ2V0dGVyLCBhbnkgZGVjb3JhdG9ycyBhcmUgb25seSBhdHRhY2hlZCB0byB0aGUgc2V0dGVyIG1lbWJlci5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgc3ltYm9sIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcnMoc3ltYm9sOiB0cy5TeW1ib2wsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSwgaXNTdGF0aWM/OiBib29sZWFuKTpcbiAgICAgIENsYXNzTWVtYmVyW118bnVsbCB7XG4gICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFjY2Vzc29yKSB7XG4gICAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gICAgICBjb25zdCBzZXR0ZXIgPSBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMuZmluZCh0cy5pc1NldEFjY2Vzc29yKTtcbiAgICAgIGNvbnN0IGdldHRlciA9IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5maW5kKHRzLmlzR2V0QWNjZXNzb3IpO1xuXG4gICAgICBjb25zdCBzZXR0ZXJNZW1iZXIgPVxuICAgICAgICAgIHNldHRlciAmJiB0aGlzLnJlZmxlY3RNZW1iZXIoc2V0dGVyLCBDbGFzc01lbWJlcktpbmQuU2V0dGVyLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgICBpZiAoc2V0dGVyTWVtYmVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaChzZXR0ZXJNZW1iZXIpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYXR0YWNoaW5nIHRoZSBkZWNvcmF0b3JzIHRvIGEgcG90ZW50aWFsIGdldHRlci4gSW4gRVMyMDE1LCB3ZSBjYW4ndCB0ZWxsIHdoZXJlXG4gICAgICAgIC8vIHRoZSBkZWNvcmF0b3JzIHdlcmUgb3JpZ2luYWxseSBhdHRhY2hlZCB0bywgaG93ZXZlciB3ZSBvbmx5IHdhbnQgdG8gYXR0YWNoIHRoZW0gdG8gYVxuICAgICAgICAvLyBzaW5nbGUgYENsYXNzTWVtYmVyYCBhcyBvdGhlcndpc2Ugbmd0c2Mgd291bGQgaGFuZGxlIHRoZSBzYW1lIGRlY29yYXRvcnMgdHdpY2UuXG4gICAgICAgIGRlY29yYXRvcnMgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGdldHRlck1lbWJlciA9XG4gICAgICAgICAgZ2V0dGVyICYmIHRoaXMucmVmbGVjdE1lbWJlcihnZXR0ZXIsIENsYXNzTWVtYmVyS2luZC5HZXR0ZXIsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICAgIGlmIChnZXR0ZXJNZW1iZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKGdldHRlck1lbWJlcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgIH1cblxuICAgIGxldCBraW5kOiBDbGFzc01lbWJlcktpbmR8bnVsbCA9IG51bGw7XG4gICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLk1ldGhvZCkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5NZXRob2Q7XG4gICAgfSBlbHNlIGlmIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5Qcm9wZXJ0eSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlID0gc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGlmICghbm9kZSkge1xuICAgICAgLy8gSWYgdGhlIHN5bWJvbCBoYXMgYmVlbiBpbXBvcnRlZCBmcm9tIGEgVHlwZVNjcmlwdCB0eXBpbmdzIGZpbGUgdGhlbiB0aGUgY29tcGlsZXJcbiAgICAgIC8vIG1heSBwYXNzIHRoZSBgcHJvdG90eXBlYCBzeW1ib2wgYXMgYW4gZXhwb3J0IG9mIHRoZSBjbGFzcy5cbiAgICAgIC8vIEJ1dCB0aGlzIGhhcyBubyBkZWNsYXJhdGlvbi4gSW4gdGhpcyBjYXNlIHdlIGp1c3QgcXVpZXRseSBpZ25vcmUgaXQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBtZW1iZXIgPSB0aGlzLnJlZmxlY3RNZW1iZXIobm9kZSwga2luZCwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgIGlmICghbWVtYmVyKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gW21lbWJlcl07XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICogQHBhcmFtIG5vZGUgdGhlIGRlY2xhcmF0aW9uIG5vZGUgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0ga2luZCB0aGUgYXNzdW1lZCBraW5kIG9mIHRoZSBtZW1iZXIsIG1heSBiZWNvbWUgbW9yZSBhY2N1cmF0ZSBkdXJpbmcgcmVmbGVjdGlvbi5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcihcbiAgICAgIG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBraW5kOiBDbGFzc01lbWJlcktpbmR8bnVsbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLFxuICAgICAgaXNTdGF0aWM/OiBib29sZWFuKTogQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gICAgbGV0IHZhbHVlOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWVOb2RlOiB0cy5JZGVudGlmaWVyfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKCFpc0NsYXNzTWVtYmVyVHlwZShub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGlzU3RhdGljICYmIGlzUHJvcGVydHlBY2Nlc3Mobm9kZSkpIHtcbiAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgIHZhbHVlID0ga2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5ID8gbm9kZS5wYXJlbnQucmlnaHQgOiBudWxsO1xuICAgIH0gZWxzZSBpZiAoaXNUaGlzQXNzaWdubWVudChub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICAgIG5hbWUgPSBub2RlLmxlZnQubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBub2RlLnJpZ2h0O1xuICAgICAgaXNTdGF0aWMgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Db25zdHJ1Y3RvcjtcbiAgICAgIG5hbWUgPSAnY29uc3RydWN0b3InO1xuICAgICAgaXNTdGF0aWMgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoa2luZCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihgVW5rbm93biBtZW1iZXIgdHlwZTogXCIke25vZGUuZ2V0VGV4dCgpfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBpZiAoaXNOYW1lZERlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgICAgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB3ZSBoYXZlIHN0aWxsIG5vdCBkZXRlcm1pbmVkIGlmIHRoaXMgaXMgYSBzdGF0aWMgb3IgaW5zdGFuY2UgbWVtYmVyIHRoZW5cbiAgICAvLyBsb29rIGZvciB0aGUgYHN0YXRpY2Aga2V5d29yZCBvbiB0aGUgZGVjbGFyYXRpb25cbiAgICBpZiAoaXNTdGF0aWMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaXNTdGF0aWMgPSBub2RlLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgbm9kZS5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZTogdHMuVHlwZU5vZGUgPSAobm9kZSBhcyBhbnkpLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgbm9kZSxcbiAgICAgIGltcGxlbWVudGF0aW9uOiBub2RlLFxuICAgICAga2luZCxcbiAgICAgIHR5cGUsXG4gICAgICBuYW1lLFxuICAgICAgbmFtZU5vZGUsXG4gICAgICB2YWx1ZSxcbiAgICAgIGlzU3RhdGljLFxuICAgICAgZGVjb3JhdG9yczogZGVjb3JhdG9ycyB8fCBbXVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlcnMgd2Ugd2FudCB0byBmaW5kLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25gIG9iamVjdHMgcmVwcmVzZW50aW5nIGVhY2ggb2YgdGhlIHBhcmFtZXRlcnMgaW5cbiAgICogdGhlIGNsYXNzJ3MgY29uc3RydWN0b3Igb3IgbnVsbCBpZiB0aGVyZSBpcyBubyBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTpcbiAgICAgIHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW118bnVsbCB7XG4gICAgY29uc3QgbWVtYmVycyA9IGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLm1lbWJlcnM7XG4gICAgaWYgKG1lbWJlcnMgJiYgbWVtYmVycy5oYXMoQ09OU1RSVUNUT1IpKSB7XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvclN5bWJvbCA9IG1lbWJlcnMuZ2V0KENPTlNUUlVDVE9SKSE7XG4gICAgICAvLyBGb3Igc29tZSByZWFzb24gdGhlIGNvbnN0cnVjdG9yIGRvZXMgbm90IGhhdmUgYSBgdmFsdWVEZWNsYXJhdGlvbmAgPyE/XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9ucyAmJlxuICAgICAgICAgIGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9uc1swXSBhcyB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFjb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG4gICAgICBpZiAoY29uc3RydWN0b3IucGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgICAgfVxuICAgICAgaWYgKGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBjb25zdHJ1Y3Rvci5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIHBhcmFtZXRlck5vZGVzIHRoZSBhcnJheSBvZiBUeXBlU2NyaXB0IHBhcmFtZXRlciBub2RlcyBmb3IgdGhpcyBjbGFzcydzIGNvbnN0cnVjdG9yLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgaW5mbyBvYmplY3RzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKFxuICAgICAgY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXM6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW10pOiBDdG9yUGFyYW1ldGVyW10ge1xuICAgIGNvbnN0IHtjb25zdHJ1Y3RvclBhcmFtSW5mb30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKGNsYXNzU3ltYm9sKTtcblxuICAgIHJldHVybiBwYXJhbWV0ZXJOb2Rlcy5tYXAoKG5vZGUsIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCB7ZGVjb3JhdG9ycywgdHlwZUV4cHJlc3Npb259ID0gY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdID9cbiAgICAgICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF0gOlxuICAgICAgICAgIHtkZWNvcmF0b3JzOiBudWxsLCB0eXBlRXhwcmVzc2lvbjogbnVsbH07XG4gICAgICBjb25zdCBuYW1lTm9kZSA9IG5vZGUubmFtZTtcblxuICAgICAgbGV0IHR5cGVWYWx1ZVJlZmVyZW5jZTogVHlwZVZhbHVlUmVmZXJlbmNlfG51bGwgPSBudWxsO1xuICAgICAgaWYgKHR5cGVFeHByZXNzaW9uICE9PSBudWxsKSB7XG4gICAgICAgIC8vIGB0eXBlRXhwcmVzc2lvbmAgaXMgYW4gZXhwcmVzc2lvbiBpbiBhIFwidHlwZVwiIGNvbnRleHQuIFJlc29sdmUgaXQgdG8gYSBkZWNsYXJlZCB2YWx1ZS5cbiAgICAgICAgLy8gRWl0aGVyIGl0J3MgYSByZWZlcmVuY2UgdG8gYW4gaW1wb3J0ZWQgdHlwZSwgb3IgYSB0eXBlIGRlY2xhcmVkIGxvY2FsbHkuIERpc3Rpbmd1aXNoIHRoZVxuICAgICAgICAvLyB0d28gY2FzZXMgd2l0aCBgZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb25gLlxuICAgICAgICBjb25zdCBkZWNsID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbih0eXBlRXhwcmVzc2lvbik7XG4gICAgICAgIGlmIChkZWNsICE9PSBudWxsICYmIGRlY2wubm9kZSAhPT0gbnVsbCAmJiBkZWNsLnZpYU1vZHVsZSAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgaXNOYW1lZERlY2xhcmF0aW9uKGRlY2wubm9kZSkpIHtcbiAgICAgICAgICB0eXBlVmFsdWVSZWZlcmVuY2UgPSB7XG4gICAgICAgICAgICBsb2NhbDogZmFsc2UsXG4gICAgICAgICAgICB2YWx1ZURlY2xhcmF0aW9uOiBkZWNsLm5vZGUsXG4gICAgICAgICAgICBtb2R1bGVOYW1lOiBkZWNsLnZpYU1vZHVsZSxcbiAgICAgICAgICAgIGltcG9ydGVkTmFtZTogZGVjbC5ub2RlLm5hbWUudGV4dCxcbiAgICAgICAgICAgIG5lc3RlZFBhdGg6IG51bGwsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0eXBlVmFsdWVSZWZlcmVuY2UgPSB7XG4gICAgICAgICAgICBsb2NhbDogdHJ1ZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IHR5cGVFeHByZXNzaW9uLFxuICAgICAgICAgICAgZGVmYXVsdEltcG9ydFN0YXRlbWVudDogbnVsbCxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IGdldE5hbWVUZXh0KG5hbWVOb2RlKSxcbiAgICAgICAgbmFtZU5vZGUsXG4gICAgICAgIHR5cGVWYWx1ZVJlZmVyZW5jZSxcbiAgICAgICAgdHlwZU5vZGU6IG51bGwsXG4gICAgICAgIGRlY29yYXRvcnNcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MsXG4gICAqIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgb24gYSBzdGF0aWMgcHJvcGVydHkgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgaW4gRVNNMjAxNSwgdGhlIHByb3BlcnR5IGlzIGRlZmluZWQgYW4gYXJyYXksIG9yIGJ5IGFuIGFycm93IGZ1bmN0aW9uIHRoYXQgcmV0dXJuc1xuICAgKiBhbiBhcnJheSwgb2YgZGVjb3JhdG9yIGFuZCB0eXBlIGluZm9ybWF0aW9uLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSxcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gICAqICAge3R5cGU6IFZpZXdDb250YWluZXJSZWZ9LFxuICAgKiAgIHt0eXBlOiBUZW1wbGF0ZVJlZn0sXG4gICAqICAge3R5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU5dfV19LFxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogb3JcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSBbXG4gICAqICAge3R5cGU6IFZpZXdDb250YWluZXJSZWZ9LFxuICAgKiAgIHt0eXBlOiBUZW1wbGF0ZVJlZn0sXG4gICAqICAge3R5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3t0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTl19XX0sXG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgdGhlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbURlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTogUGFyYW1JbmZvW118bnVsbCB7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGlmIChwYXJhbURlY29yYXRvcnMpIHtcbiAgICAgIC8vIFRoZSBkZWNvcmF0b3JzIGFycmF5IG1heSBiZSB3cmFwcGVkIGluIGFuIGFycm93IGZ1bmN0aW9uLiBJZiBzbyB1bndyYXAgaXQuXG4gICAgICBjb25zdCBjb250YWluZXIgPVxuICAgICAgICAgIHRzLmlzQXJyb3dGdW5jdGlvbihwYXJhbURlY29yYXRvcnMpID8gcGFyYW1EZWNvcmF0b3JzLmJvZHkgOiBwYXJhbURlY29yYXRvcnM7XG4gICAgICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGNvbnRhaW5lcikpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSBjb250YWluZXIuZWxlbWVudHM7XG4gICAgICAgIHJldHVybiBlbGVtZW50c1xuICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0+XG4gICAgICAgICAgICAgICAgICAgIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZWxlbWVudCkgPyByZWZsZWN0T2JqZWN0TGl0ZXJhbChlbGVtZW50KSA6IG51bGwpXG4gICAgICAgICAgICAubWFwKHBhcmFtSW5mbyA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHR5cGVFeHByZXNzaW9uID1cbiAgICAgICAgICAgICAgICAgIHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uaGFzKCd0eXBlJykgPyBwYXJhbUluZm8uZ2V0KCd0eXBlJykhIDogbnVsbDtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ySW5mbyA9XG4gICAgICAgICAgICAgICAgICBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmhhcygnZGVjb3JhdG9ycycpID8gcGFyYW1JbmZvLmdldCgnZGVjb3JhdG9ycycpISA6IG51bGw7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JJbmZvICYmXG4gICAgICAgICAgICAgICAgICB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvckluZm8pXG4gICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgICAgICAgICByZXR1cm4ge3R5cGVFeHByZXNzaW9uLCBkZWNvcmF0b3JzfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChwYXJhbURlY29yYXRvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgJ0ludmFsaWQgY29uc3RydWN0b3IgcGFyYW1ldGVyIGRlY29yYXRvciBpbiAnICtcbiAgICAgICAgICAgICAgICBwYXJhbURlY29yYXRvcnMuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lICsgJzpcXG4nLFxuICAgICAgICAgICAgcGFyYW1EZWNvcmF0b3JzLmdldFRleHQoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIGZvciBjYWxscyB0byB0aGUgc3BlY2lmaWVkIGhlbHBlci5cbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lcyB0aGUgbmFtZXMgb2YgdGhlIGhlbHBlcnMgKGUuZy4gYF9fZGVjb3JhdGVgKSB3aG9zZSBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZFxuICAgKiBpbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgQ2FsbEV4cHJlc3Npb24gbm9kZXMgZm9yIGVhY2ggbWF0Y2hpbmcgaGVscGVyIGNhbGwuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sLCBoZWxwZXJOYW1lczogc3RyaW5nW10pOlxuICAgICAgdHMuQ2FsbEV4cHJlc3Npb25bXSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGVtZW50c0ZvckNsYXNzKGNsYXNzU3ltYm9sKVxuICAgICAgICAubWFwKHN0YXRlbWVudCA9PiB0aGlzLmdldEhlbHBlckNhbGwoc3RhdGVtZW50LCBoZWxwZXJOYW1lcykpXG4gICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNMjAxNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGluIHRoZSB0b3AgbGV2ZWwgbW9kdWxlLCBzbyB3ZSBoYXZlIHRvIGNvbnNpZGVyXG4gICAqIGFsbCB0aGUgc3RhdGVtZW50cyBpbiB0aGUgbW9kdWxlLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICBjb25zdCBjbGFzc05vZGUgPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmIChpc1RvcExldmVsKGNsYXNzTm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoY2xhc3NOb2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgfVxuICAgIGNvbnN0IHN0YXRlbWVudCA9IGdldENvbnRhaW5pbmdTdGF0ZW1lbnQoY2xhc3NOb2RlKTtcbiAgICBpZiAodHMuaXNCbG9jayhzdGF0ZW1lbnQucGFyZW50KSkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oc3RhdGVtZW50LnBhcmVudC5zdGF0ZW1lbnRzKTtcbiAgICB9XG4gICAgLy8gV2Ugc2hvdWxkIG5ldmVyIGFycml2ZSBoZXJlXG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZmluZCBhZGphY2VudCBzdGF0ZW1lbnRzIGZvciAke2NsYXNzU3ltYm9sLm5hbWV9YCk7XG4gIH1cblxuICAvKipcbiAgICogVGVzdCB3aGV0aGVyIGEgZGVjb3JhdG9yIHdhcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYC5cbiAgICpcbiAgICogSXMgdGhlIGRlY29yYXRvcjpcbiAgICogKiBleHRlcm5hbGx5IGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgP1xuICAgKiAqIHRoZSBjdXJyZW50IGhvc3RlZCBwcm9ncmFtIGlzIGFjdHVhbGx5IGBAYW5ndWxhci9jb3JlYCBhbmRcbiAgICogICAtIHJlbGF0aXZlbHkgaW50ZXJuYWxseSBpbXBvcnRlZDsgb3JcbiAgICogICAtIG5vdCBpbXBvcnRlZCwgZnJvbSB0aGUgY3VycmVudCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yIHRoZSBkZWNvcmF0b3IgdG8gdGVzdC5cbiAgICovXG4gIHByb3RlY3RlZCBpc0Zyb21Db3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuaXNDb3JlKSB7XG4gICAgICByZXR1cm4gIWRlY29yYXRvci5pbXBvcnQgfHwgL15cXC4vLnRlc3QoZGVjb3JhdG9yLmltcG9ydC5mcm9tKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICEhZGVjb3JhdG9yLmltcG9ydCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbWFwcGluZyBiZXR3ZWVuIHRoZSBwdWJsaWMgZXhwb3J0cyBpbiBhIHNyYyBwcm9ncmFtIGFuZCB0aGUgcHVibGljIGV4cG9ydHMgb2YgYSBkdHNcbiAgICogcHJvZ3JhbS5cbiAgICpcbiAgICogQHBhcmFtIHNyYyB0aGUgcHJvZ3JhbSBidW5kbGUgY29udGFpbmluZyB0aGUgc291cmNlIGZpbGVzLlxuICAgKiBAcGFyYW0gZHRzIHRoZSBwcm9ncmFtIGJ1bmRsZSBjb250YWluaW5nIHRoZSB0eXBpbmdzIGZpbGVzLlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiBzb3VyY2UgZGVjbGFyYXRpb25zIHRvIHR5cGluZ3MgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVQdWJsaWNEdHNEZWNsYXJhdGlvbk1hcChzcmM6IEJ1bmRsZVByb2dyYW0sIGR0czogQnVuZGxlUHJvZ3JhbSk6XG4gICAgICBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLkRlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgZGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCBkdHNEZWNsYXJhdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCByb290RHRzID0gZ2V0Um9vdEZpbGVPckZhaWwoZHRzKTtcbiAgICB0aGlzLmNvbGxlY3REdHNFeHBvcnRlZERlY2xhcmF0aW9ucyhkdHNEZWNsYXJhdGlvbk1hcCwgcm9vdER0cywgZHRzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgY29uc3Qgcm9vdFNyYyA9IGdldFJvb3RGaWxlT3JGYWlsKHNyYyk7XG4gICAgdGhpcy5jb2xsZWN0U3JjRXhwb3J0ZWREZWNsYXJhdGlvbnMoZGVjbGFyYXRpb25NYXAsIGR0c0RlY2xhcmF0aW9uTWFwLCByb290U3JjKTtcbiAgICByZXR1cm4gZGVjbGFyYXRpb25NYXA7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbWFwcGluZyBiZXR3ZWVuIHRoZSBcInByaXZhdGVcIiBleHBvcnRzIGluIGEgc3JjIHByb2dyYW0gYW5kIHRoZSBcInByaXZhdGVcIiBleHBvcnRzIG9mIGFcbiAgICogZHRzIHByb2dyYW0uIFRoZXNlIGV4cG9ydHMgbWF5IGJlIGV4cG9ydGVkIGZyb20gaW5kaXZpZHVhbCBmaWxlcyBpbiB0aGUgc3JjIG9yIGR0cyBwcm9ncmFtcyxcbiAgICogYnV0IG5vdCBleHBvcnRlZCBmcm9tIHRoZSByb290IGZpbGUgKGkuZSBwdWJsaWNseSBmcm9tIHRoZSBlbnRyeS1wb2ludCkuXG4gICAqXG4gICAqIFRoaXMgbWFwcGluZyBpcyBhIFwiYmVzdCBndWVzc1wiIHNpbmNlIHdlIGNhbm5vdCBndWFyYW50ZWUgdGhhdCB0d28gZGVjbGFyYXRpb25zIHRoYXQgaGFwcGVuIHRvXG4gICAqIGJlIGV4cG9ydGVkIGZyb20gYSBmaWxlIHdpdGggdGhlIHNhbWUgbmFtZSBhcmUgYWN0dWFsbHkgZXF1aXZhbGVudC4gQnV0IHRoaXMgaXMgYSByZWFzb25hYmxlXG4gICAqIGVzdGltYXRlIGZvciB0aGUgcHVycG9zZXMgb2YgbmdjYy5cbiAgICpcbiAgICogQHBhcmFtIHNyYyB0aGUgcHJvZ3JhbSBidW5kbGUgY29udGFpbmluZyB0aGUgc291cmNlIGZpbGVzLlxuICAgKiBAcGFyYW0gZHRzIHRoZSBwcm9ncmFtIGJ1bmRsZSBjb250YWluaW5nIHRoZSB0eXBpbmdzIGZpbGVzLlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiBzb3VyY2UgZGVjbGFyYXRpb25zIHRvIHR5cGluZ3MgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVQcml2YXRlRHRzRGVjbGFyYXRpb25NYXAoc3JjOiBCdW5kbGVQcm9ncmFtLCBkdHM6IEJ1bmRsZVByb2dyYW0pOlxuICAgICAgTWFwPHRzLkRlY2xhcmF0aW9uLCB0cy5EZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uTWFwID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBkdHMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgZHRzRmlsZXMgPSBnZXROb25Sb290UGFja2FnZUZpbGVzKGR0cyk7XG4gICAgZm9yIChjb25zdCBkdHNGaWxlIG9mIGR0c0ZpbGVzKSB7XG4gICAgICB0aGlzLmNvbGxlY3REdHNFeHBvcnRlZERlY2xhcmF0aW9ucyhkdHNEZWNsYXJhdGlvbk1hcCwgZHRzRmlsZSwgdHlwZUNoZWNrZXIpO1xuICAgIH1cblxuICAgIGNvbnN0IHNyY0ZpbGVzID0gZ2V0Tm9uUm9vdFBhY2thZ2VGaWxlcyhzcmMpO1xuICAgIGZvciAoY29uc3Qgc3JjRmlsZSBvZiBzcmNGaWxlcykge1xuICAgICAgdGhpcy5jb2xsZWN0U3JjRXhwb3J0ZWREZWNsYXJhdGlvbnMoZGVjbGFyYXRpb25NYXAsIGR0c0RlY2xhcmF0aW9uTWFwLCBzcmNGaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgbWFwcGluZ3MgYmV0d2VlbiBuYW1lcyBvZiBleHBvcnRlZCBkZWNsYXJhdGlvbnMgaW4gYSBmaWxlIGFuZCBpdHMgYWN0dWFsIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBBbnkgbmV3IG1hcHBpbmdzIGFyZSBhZGRlZCB0byB0aGUgYGR0c0RlY2xhcmF0aW9uTWFwYC5cbiAgICovXG4gIHByb3RlY3RlZCBjb2xsZWN0RHRzRXhwb3J0ZWREZWNsYXJhdGlvbnMoXG4gICAgICBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+LCBzcmNGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiB2b2lkIHtcbiAgICBjb25zdCBzcmNNb2R1bGUgPSBzcmNGaWxlICYmIGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihzcmNGaWxlKTtcbiAgICBjb25zdCBtb2R1bGVFeHBvcnRzID0gc3JjTW9kdWxlICYmIGNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKHNyY01vZHVsZSk7XG4gICAgaWYgKG1vZHVsZUV4cG9ydHMpIHtcbiAgICAgIG1vZHVsZUV4cG9ydHMuZm9yRWFjaChleHBvcnRlZFN5bWJvbCA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZFN5bWJvbC5uYW1lO1xuICAgICAgICBpZiAoZXhwb3J0ZWRTeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcykge1xuICAgICAgICAgIGV4cG9ydGVkU3ltYm9sID0gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKGV4cG9ydGVkU3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGV4cG9ydGVkU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgICAgIGlmIChkZWNsYXJhdGlvbiAmJiAhZHRzRGVjbGFyYXRpb25NYXAuaGFzKG5hbWUpKSB7XG4gICAgICAgICAgZHRzRGVjbGFyYXRpb25NYXAuc2V0KG5hbWUsIGRlY2xhcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cblxuICBwcm90ZWN0ZWQgY29sbGVjdFNyY0V4cG9ydGVkRGVjbGFyYXRpb25zKFxuICAgICAgZGVjbGFyYXRpb25NYXA6IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+LFxuICAgICAgZHRzRGVjbGFyYXRpb25NYXA6IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPiwgc3JjRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGZpbGVFeHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUoc3JjRmlsZSk7XG4gICAgaWYgKGZpbGVFeHBvcnRzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IFtleHBvcnROYW1lLCB7bm9kZTogZGVjbGFyYXRpb259XSBvZiBmaWxlRXhwb3J0cykge1xuICAgICAgICBpZiAoZGVjbGFyYXRpb24gIT09IG51bGwgJiYgZHRzRGVjbGFyYXRpb25NYXAuaGFzKGV4cG9ydE5hbWUpKSB7XG4gICAgICAgICAgZGVjbGFyYXRpb25NYXAuc2V0KGRlY2xhcmF0aW9uLCBkdHNEZWNsYXJhdGlvbk1hcC5nZXQoZXhwb3J0TmFtZSkhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBnZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZXhwcmVzc2lvbik7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihleHByZXNzaW9uKSB8fCAhdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZURlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG4gICAgaWYgKCFuYW1lc3BhY2VEZWNsIHx8IG5hbWVzcGFjZURlY2wubm9kZSA9PT0gbnVsbCB8fCAhdHMuaXNTb3VyY2VGaWxlKG5hbWVzcGFjZURlY2wubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZUV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShuYW1lc3BhY2VEZWNsLm5vZGUpO1xuICAgIGlmIChuYW1lc3BhY2VFeHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW5hbWVzcGFjZUV4cG9ydHMuaGFzKGV4cHJlc3Npb24ubmFtZS50ZXh0KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwb3J0RGVjbCA9IG5hbWVzcGFjZUV4cG9ydHMuZ2V0KGV4cHJlc3Npb24ubmFtZS50ZXh0KSE7XG4gICAgcmV0dXJuIHsuLi5leHBvcnREZWNsLCB2aWFNb2R1bGU6IG5hbWVzcGFjZURlY2wudmlhTW9kdWxlfTtcbiAgfVxuXG4gIC8qKiBDaGVja3MgaWYgdGhlIHNwZWNpZmllZCBkZWNsYXJhdGlvbiByZXNvbHZlcyB0byB0aGUga25vd24gSmF2YVNjcmlwdCBnbG9iYWwgYE9iamVjdGAuICovXG4gIHByb3RlY3RlZCBpc0phdmFTY3JpcHRPYmplY3REZWNsYXJhdGlvbihkZWNsOiBEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGlmIChkZWNsLm5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3Qgbm9kZSA9IGRlY2wubm9kZTtcbiAgICAvLyBUaGUgZGVmYXVsdCBUeXBlU2NyaXB0IGxpYnJhcnkgdHlwZXMgdGhlIGdsb2JhbCBgT2JqZWN0YCB2YXJpYWJsZSB0aHJvdWdoXG4gICAgLy8gYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB3aXRoIGEgdHlwZSByZWZlcmVuY2UgcmVzb2x2aW5nIHRvIGBPYmplY3RDb25zdHJ1Y3RvcmAuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgfHwgIXRzLmlzSWRlbnRpZmllcihub2RlLm5hbWUpIHx8XG4gICAgICAgIG5vZGUubmFtZS50ZXh0ICE9PSAnT2JqZWN0JyB8fCBub2RlLnR5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCB0eXBlTm9kZSA9IG5vZGUudHlwZTtcbiAgICAvLyBJZiB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gZG9lcyBub3QgaGF2ZSBhIHR5cGUgcmVzb2x2aW5nIHRvIGBPYmplY3RDb25zdHJ1Y3RvcmAsXG4gICAgLy8gd2UgY2Fubm90IGd1YXJhbnRlZSB0aGF0IHRoZSBkZWNsYXJhdGlvbiByZXNvbHZlcyB0byB0aGUgZ2xvYmFsIGBPYmplY3RgIHZhcmlhYmxlLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTm9kZSkgfHwgIXRzLmlzSWRlbnRpZmllcih0eXBlTm9kZS50eXBlTmFtZSkgfHxcbiAgICAgICAgdHlwZU5vZGUudHlwZU5hbWUudGV4dCAhPT0gJ09iamVjdENvbnN0cnVjdG9yJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgdHlwZSBkZWZpbml0aW9uIGZvciBgT2JqZWN0YCBvcmlnaW5hdGVzIGZyb20gYSBkZWZhdWx0IGxpYnJhcnlcbiAgICAvLyBkZWZpbml0aW9uIGZpbGUuIFRoaXMgcmVxdWlyZXMgZGVmYXVsdCB0eXBlcyB0byBiZSBlbmFibGVkIGZvciB0aGUgaG9zdCBwcm9ncmFtLlxuICAgIHJldHVybiB0aGlzLnNyYy5wcm9ncmFtLmlzU291cmNlRmlsZURlZmF1bHRMaWJyYXJ5KG5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBKYXZhU2NyaXB0LCBlbnVtIGRlY2xhcmF0aW9ucyBhcmUgZW1pdHRlZCBhcyBhIHJlZ3VsYXIgdmFyaWFibGUgZGVjbGFyYXRpb24gZm9sbG93ZWQgYnkgYW5cbiAgICogSUlGRSBpbiB3aGljaCB0aGUgZW51bSBtZW1iZXJzIGFyZSBhc3NpZ25lZC5cbiAgICpcbiAgICogICBleHBvcnQgdmFyIEVudW07XG4gICAqICAgKGZ1bmN0aW9uIChFbnVtKSB7XG4gICAqICAgICBFbnVtW1wiYVwiXSA9IFwiQVwiO1xuICAgKiAgICAgRW51bVtcImJcIl0gPSBcIkJcIjtcbiAgICogICB9KShFbnVtIHx8IChFbnVtID0ge30pKTtcbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIEEgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCBtYXkgcmVwcmVzZW50IGFuIGVudW1cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgZW51bSBtZW1iZXJzIGlmIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBpcyBmb2xsb3dlZCBieSBhbiBJSUZFIHRoYXRcbiAgICogZGVjbGFyZXMgdGhlIGVudW0gbWVtYmVycywgb3IgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZUVudW1NZW1iZXJzKGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogRW51bU1lbWJlcltdfG51bGwge1xuICAgIC8vIEluaXRpYWxpemVkIHZhcmlhYmxlcyBkb24ndCByZXByZXNlbnQgZW51bSBkZWNsYXJhdGlvbnMuXG4gICAgaWYgKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyICE9PSB1bmRlZmluZWQpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgdmFyaWFibGVTdG10ID0gZGVjbGFyYXRpb24ucGFyZW50LnBhcmVudDtcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQodmFyaWFibGVTdG10KSkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBibG9jayA9IHZhcmlhYmxlU3RtdC5wYXJlbnQ7XG4gICAgaWYgKCF0cy5pc0Jsb2NrKGJsb2NrKSAmJiAhdHMuaXNTb3VyY2VGaWxlKGJsb2NrKSkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbkluZGV4ID0gYmxvY2suc3RhdGVtZW50cy5maW5kSW5kZXgoc3RhdGVtZW50ID0+IHN0YXRlbWVudCA9PT0gdmFyaWFibGVTdG10KTtcbiAgICBpZiAoZGVjbGFyYXRpb25JbmRleCA9PT0gLTEgfHwgZGVjbGFyYXRpb25JbmRleCA9PT0gYmxvY2suc3RhdGVtZW50cy5sZW5ndGggLSAxKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHN1YnNlcXVlbnRTdG10ID0gYmxvY2suc3RhdGVtZW50c1tkZWNsYXJhdGlvbkluZGV4ICsgMV07XG4gICAgaWYgKCF0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3Vic2VxdWVudFN0bXQpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGlpZmUgPSBzdHJpcFBhcmVudGhlc2VzKHN1YnNlcXVlbnRTdG10LmV4cHJlc3Npb24pO1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihpaWZlKSB8fCAhaXNFbnVtRGVjbGFyYXRpb25JaWZlKGlpZmUpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGZuID0gc3RyaXBQYXJlbnRoZXNlcyhpaWZlLmV4cHJlc3Npb24pO1xuICAgIGlmICghdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZm4pKSByZXR1cm4gbnVsbDtcblxuICAgIHJldHVybiB0aGlzLnJlZmxlY3RFbnVtTWVtYmVycyhmbik7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gZXh0cmFjdCBhbGwgYEVudW1NZW1iZXJgcyBmcm9tIGEgZnVuY3Rpb24gdGhhdCBpcyBhY2NvcmRpbmcgdG8gdGhlIEphdmFTY3JpcHQgZW1pdFxuICAgKiBmb3JtYXQgZm9yIGVudW1zOlxuICAgKlxuICAgKiAgIGZ1bmN0aW9uIChFbnVtKSB7XG4gICAqICAgICBFbnVtW1wiTWVtYmVyQVwiXSA9IFwiYVwiO1xuICAgKiAgICAgRW51bVtcIk1lbWJlckJcIl0gPSBcImJcIjtcbiAgICogICB9XG4gICAqXG4gICAqIEBwYXJhbSBmbiBUaGUgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGFzc3VtZWQgdG8gY29udGFpbiBlbnVtIG1lbWJlcnMuXG4gICAqIEByZXR1cm5zIEFsbCBlbnVtIG1lbWJlcnMgaWYgdGhlIGZ1bmN0aW9uIGlzIGFjY29yZGluZyB0byB0aGUgY29ycmVjdCBzeW50YXgsIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSByZWZsZWN0RW51bU1lbWJlcnMoZm46IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IEVudW1NZW1iZXJbXXxudWxsIHtcbiAgICBpZiAoZm4ucGFyYW1ldGVycy5sZW5ndGggIT09IDEpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgZW51bU5hbWUgPSBmbi5wYXJhbWV0ZXJzWzBdLm5hbWU7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZW51bU5hbWUpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGVudW1NZW1iZXJzOiBFbnVtTWVtYmVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiBmbi5ib2R5LnN0YXRlbWVudHMpIHtcbiAgICAgIGNvbnN0IGVudW1NZW1iZXIgPSB0aGlzLnJlZmxlY3RFbnVtTWVtYmVyKGVudW1OYW1lLCBzdGF0ZW1lbnQpO1xuICAgICAgaWYgKGVudW1NZW1iZXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBlbnVtTWVtYmVycy5wdXNoKGVudW1NZW1iZXIpO1xuICAgIH1cbiAgICByZXR1cm4gZW51bU1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gZXh0cmFjdCBhIHNpbmdsZSBgRW51bU1lbWJlcmAgZnJvbSBhIHN0YXRlbWVudCBpbiB0aGUgZm9sbG93aW5nIHN5bnRheDpcbiAgICpcbiAgICogICBFbnVtW1wiTWVtYmVyQVwiXSA9IFwiYVwiO1xuICAgKlxuICAgKiBvciwgZm9yIGVudW0gbWVtYmVyIHdpdGggbnVtZXJpYyB2YWx1ZXM6XG4gICAqXG4gICAqICAgRW51bVtFbnVtW1wiTWVtYmVyQVwiXSA9IDBdID0gXCJNZW1iZXJBXCI7XG4gICAqXG4gICAqIEBwYXJhbSBlbnVtTmFtZSBUaGUgaWRlbnRpZmllciBvZiB0aGUgZW51bSB0aGF0IHRoZSBtZW1iZXJzIHNob3VsZCBiZSBzZXQgb24uXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgVGhlIHN0YXRlbWVudCB0byBpbnNwZWN0LlxuICAgKiBAcmV0dXJucyBBbiBgRW51bU1lbWJlcmAgaWYgdGhlIHN0YXRlbWVudCBpcyBhY2NvcmRpbmcgdG8gdGhlIGV4cGVjdGVkIHN5bnRheCwgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdEVudW1NZW1iZXIoZW51bU5hbWU6IHRzLklkZW50aWZpZXIsIHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogRW51bU1lbWJlcnxudWxsIHtcbiAgICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjtcblxuICAgIC8vIENoZWNrIGZvciB0aGUgYEVudW1bWF0gPSBZO2AgY2FzZS5cbiAgICBpZiAoIWlzRW51bUFzc2lnbm1lbnQoZW51bU5hbWUsIGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgYXNzaWdubWVudCA9IHJlZmxlY3RFbnVtQXNzaWdubWVudChleHByZXNzaW9uKTtcbiAgICBpZiAoYXNzaWdubWVudCAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gYXNzaWdubWVudDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgdGhlIGBFbnVtW0VudW1bWF0gPSBZXSA9IC4uLjtgIGNhc2UuXG4gICAgY29uc3QgaW5uZXJFeHByZXNzaW9uID0gZXhwcmVzc2lvbi5sZWZ0LmFyZ3VtZW50RXhwcmVzc2lvbjtcbiAgICBpZiAoIWlzRW51bUFzc2lnbm1lbnQoZW51bU5hbWUsIGlubmVyRXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcmVmbGVjdEVudW1Bc3NpZ25tZW50KGlubmVyRXhwcmVzc2lvbik7XG4gIH1cbn1cblxuLy8vLy8vLy8vLy8vLyBFeHBvcnRlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciB0aGUgaWlmZSBoYXMgdGhlIGZvbGxvd2luZyBjYWxsIHNpZ25hdHVyZTpcbiAqXG4gKiAgIChFbnVtIHx8IChFbnVtID0ge30pXG4gKlxuICogTm90ZSB0aGF0IHRoZSBgRW51bWAgaWRlbnRpZmllciBpcyBub3QgY2hlY2tlZCwgYXMgaXQgY291bGQgYWxzbyBiZSBzb21ldGhpbmdcbiAqIGxpa2UgYGV4cG9ydHMuRW51bWAuIEluc3RlYWQsIG9ubHkgdGhlIHN0cnVjdHVyZSBvZiBiaW5hcnkgb3BlcmF0b3JzIGlzIGNoZWNrZWQuXG4gKlxuICogQHBhcmFtIGlpZmUgVGhlIGNhbGwgZXhwcmVzc2lvbiB0byBjaGVjay5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGlpZmUgaGFzIGEgY2FsbCBzaWduYXR1cmUgdGhhdCBjb3JyZXNwb25kcyB3aXRoIGEgcG90ZW50aWFsXG4gKiBlbnVtIGRlY2xhcmF0aW9uLlxuICovXG5mdW5jdGlvbiBpc0VudW1EZWNsYXJhdGlvbklpZmUoaWlmZTogdHMuQ2FsbEV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgaWYgKGlpZmUuYXJndW1lbnRzLmxlbmd0aCAhPT0gMSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGFyZyA9IGlpZmUuYXJndW1lbnRzWzBdO1xuICBpZiAoIXRzLmlzQmluYXJ5RXhwcmVzc2lvbihhcmcpIHx8IGFyZy5vcGVyYXRvclRva2VuLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4gfHxcbiAgICAgICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKGFyZy5yaWdodCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCByaWdodCA9IGFyZy5yaWdodC5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzQmluYXJ5RXhwcmVzc2lvbihyaWdodCkgfHwgcmlnaHQub3BlcmF0b3JUb2tlbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHJpZ2h0LnJpZ2h0KSB8fCByaWdodC5yaWdodC5wcm9wZXJ0aWVzLmxlbmd0aCAhPT0gMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEFuIGVudW0gbWVtYmVyIGFzc2lnbm1lbnQgdGhhdCBsb29rcyBsaWtlIGBFbnVtW1hdID0gWTtgLlxuICovXG5leHBvcnQgdHlwZSBFbnVtTWVtYmVyQXNzaWdubWVudCA9IHRzLkJpbmFyeUV4cHJlc3Npb24me2xlZnQ6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9ufTtcblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciB0aGUgZXhwcmVzc2lvbiBsb29rcyBsaWtlIGFuIGVudW0gbWVtYmVyIGFzc2lnbm1lbnQgdGFyZ2V0aW5nIGBFbnVtYDpcbiAqXG4gKiAgIEVudW1bWF0gPSBZO1xuICpcbiAqIEhlcmUsIFggYW5kIFkgY2FuIGJlIGFueSBleHByZXNzaW9uLlxuICpcbiAqIEBwYXJhbSBlbnVtTmFtZSBUaGUgaWRlbnRpZmllciBvZiB0aGUgZW51bSB0aGF0IHRoZSBtZW1iZXJzIHNob3VsZCBiZSBzZXQgb24uXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBUaGUgZXhwcmVzc2lvbiB0aGF0IHNob3VsZCBiZSBjaGVja2VkIHRvIGNvbmZvcm0gdG8gdGhlIGFib3ZlIGZvcm0uXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGlzIG9mIHRoZSBjb3JyZWN0IGZvcm0sIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gaXNFbnVtQXNzaWdubWVudChcbiAgICBlbnVtTmFtZTogdHMuSWRlbnRpZmllciwgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGV4cHJlc3Npb24gaXMgRW51bU1lbWJlckFzc2lnbm1lbnQge1xuICBpZiAoIXRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSB8fFxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4gfHxcbiAgICAgICF0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKGV4cHJlc3Npb24ubGVmdCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBWZXJpZnkgdGhhdCB0aGUgb3V0ZXIgYXNzaWdubWVudCBjb3JyZXNwb25kcyB3aXRoIHRoZSBlbnVtIGRlY2xhcmF0aW9uLlxuICBjb25zdCBlbnVtSWRlbnRpZmllciA9IGV4cHJlc3Npb24ubGVmdC5leHByZXNzaW9uO1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKGVudW1JZGVudGlmaWVyKSAmJiBlbnVtSWRlbnRpZmllci50ZXh0ID09PSBlbnVtTmFtZS50ZXh0O1xufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIGNyZWF0ZSBhbiBgRW51bU1lbWJlcmAgZnJvbSBhbiBleHByZXNzaW9uIHRoYXQgaXMgYmVsaWV2ZWQgdG8gcmVwcmVzZW50IGFuIGVudW1cbiAqIGFzc2lnbm1lbnQuXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gVGhlIGV4cHJlc3Npb24gdGhhdCBpcyBiZWxpZXZlZCB0byBiZSBhbiBlbnVtIGFzc2lnbm1lbnQuXG4gKiBAcmV0dXJucyBBbiBgRW51bU1lbWJlcmAgb3IgbnVsbCBpZiB0aGUgZXhwcmVzc2lvbiBkaWQgbm90IHJlcHJlc2VudCBhbiBlbnVtIG1lbWJlciBhZnRlciBhbGwuXG4gKi9cbmZ1bmN0aW9uIHJlZmxlY3RFbnVtQXNzaWdubWVudChleHByZXNzaW9uOiBFbnVtTWVtYmVyQXNzaWdubWVudCk6IEVudW1NZW1iZXJ8bnVsbCB7XG4gIGNvbnN0IG1lbWJlck5hbWUgPSBleHByZXNzaW9uLmxlZnQuYXJndW1lbnRFeHByZXNzaW9uO1xuICBpZiAoIXRzLmlzUHJvcGVydHlOYW1lKG1lbWJlck5hbWUpKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge25hbWU6IG1lbWJlck5hbWUsIGluaXRpYWxpemVyOiBleHByZXNzaW9uLnJpZ2h0fTtcbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1JbmZvID0ge1xuICBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsLFxuICB0eXBlRXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbnxudWxsXG59O1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjYWxsIHRvIGB0c2xpYi5fX21ldGFkYXRhYCBhcyBwcmVzZW50IGluIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy4gVGhpcyBpcyBhXG4gKiBzeW50aGV0aWMgZGVjb3JhdG9yIGluc2VydGVkIGJ5IFR5cGVTY3JpcHQgdGhhdCBjb250YWlucyByZWZsZWN0aW9uIGluZm9ybWF0aW9uIGFib3V0IHRoZVxuICogdGFyZ2V0IG9mIHRoZSBkZWNvcmF0b3IsIGkuZS4gdGhlIGNsYXNzIG9yIHByb3BlcnR5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlclR5cGVzIHtcbiAgdHlwZTogJ3BhcmFtcyc7XG4gIHR5cGVzOiB0cy5FeHByZXNzaW9uW107XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNhbGwgdG8gYHRzbGliLl9fcGFyYW1gIGFzIHByZXNlbnQgaW4gYHRzbGliLl9fZGVjb3JhdGVgIGNhbGxzLiBUaGlzIGNvbnRhaW5zXG4gKiBpbmZvcm1hdGlvbiBvbiBhbnkgZGVjb3JhdG9ycyB3ZXJlIGFwcGxpZWQgdG8gYSBjZXJ0YWluIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXJEZWNvcmF0b3JzIHtcbiAgdHlwZTogJ3BhcmFtOmRlY29yYXRvcnMnO1xuICBpbmRleDogbnVtYmVyO1xuICBkZWNvcmF0b3I6IERlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2FsbCB0byBhIGRlY29yYXRvciBhcyBpdCB3YXMgcHJlc2VudCBpbiB0aGUgb3JpZ2luYWwgc291cmNlIGNvZGUsIGFzIHByZXNlbnQgaW5cbiAqIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZWNvcmF0b3JDYWxsIHtcbiAgdHlwZTogJ2RlY29yYXRvcic7XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGRpZmZlcmVudCBraW5kcyBvZiBkZWNvcmF0ZSBoZWxwZXJzIHRoYXQgbWF5IGJlIHByZXNlbnQgYXMgZmlyc3QgYXJndW1lbnQgdG9cbiAqIGB0c2xpYi5fX2RlY29yYXRlYCwgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBcbiAqIF9fZGVjb3JhdGUoW1xuICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gKiAgIHRzbGliXzEuX19wYXJhbSgyLCBJbmplY3QoSU5KRUNURURfVE9LRU4pKSxcbiAqICAgdHNsaWJfMS5fX21ldGFkYXRhKFwiZGVzaWduOnBhcmFtdHlwZXNcIiwgW1ZpZXdDb250YWluZXJSZWYsIFRlbXBsYXRlUmVmLCBTdHJpbmddKVxuICogXSwgU29tZURpcmVjdGl2ZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgRGVjb3JhdGVIZWxwZXJFbnRyeSA9IFBhcmFtZXRlclR5cGVzfFBhcmFtZXRlckRlY29yYXRvcnN8RGVjb3JhdG9yQ2FsbDtcblxuLyoqXG4gKiBUaGUgcmVjb3JkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uIG9mIGEgc2luZ2xlIGNsYXNzLiBUaGlzIGluZm9ybWF0aW9uIGlzIGNhY2hlZCBpbiB0aGUgaG9zdC5cbiAqL1xuaW50ZXJmYWNlIERlY29yYXRvckluZm8ge1xuICAvKipcbiAgICogQWxsIGRlY29yYXRvcnMgdGhhdCB3ZXJlIHByZXNlbnQgb24gdGhlIGNsYXNzLiBJZiBubyBkZWNvcmF0b3JzIHdlcmUgcHJlc2VudCwgdGhpcyBpcyBgbnVsbGBcbiAgICovXG4gIGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbDtcblxuICAvKipcbiAgICogQWxsIGRlY29yYXRvcnMgcGVyIG1lbWJlciBvZiB0aGUgY2xhc3MgdGhleSB3ZXJlIHByZXNlbnQgb24uXG4gICAqL1xuICBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT47XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBpbmZvcm1hdGlvbiwgc3VjaCBhcyB0aGUgdHlwZSBvZiBhIHBhcmFtZXRlciBhbmQgYWxsXG4gICAqIGRlY29yYXRvcnMgZm9yIGEgY2VydGFpbiBwYXJhbWV0ZXIuIEluZGljZXMgaW4gdGhpcyBhcnJheSBjb3JyZXNwb25kIHdpdGggdGhlIHBhcmFtZXRlcidzXG4gICAqIGluZGV4IGluIHRoZSBjb25zdHJ1Y3Rvci4gTm90ZSB0aGF0IHRoaXMgYXJyYXkgbWF5IGJlIHNwYXJzZSwgaS5lLiBjZXJ0YWluIGNvbnN0cnVjdG9yXG4gICAqIHBhcmFtZXRlcnMgbWF5IG5vdCBoYXZlIGFueSBpbmZvIHJlY29yZGVkLlxuICAgKi9cbiAgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdO1xufVxuXG4vKipcbiAqIEEgc3RhdGVtZW50IG5vZGUgdGhhdCByZXByZXNlbnRzIGFuIGFzc2lnbm1lbnQuXG4gKi9cbmV4cG9ydCB0eXBlIEFzc2lnbm1lbnRTdGF0ZW1lbnQgPVxuICAgIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQme2V4cHJlc3Npb246IHtsZWZ0OiB0cy5JZGVudGlmaWVyLCByaWdodDogdHMuRXhwcmVzc2lvbn19O1xuXG4vKipcbiAqIFRlc3Qgd2hldGhlciBhIHN0YXRlbWVudCBub2RlIGlzIGFuIGFzc2lnbm1lbnQgc3RhdGVtZW50LlxuICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRvIHRlc3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBzdGF0ZW1lbnQgaXMgQXNzaWdubWVudFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiBpc0Fzc2lnbm1lbnQoc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdCk7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGBleHByZXNzaW9uYCB0aGF0IGlzIGJlbGlldmVkIHRvIGJlIGFuIElJRkUgYW5kIHJldHVybiB0aGUgQVNUIG5vZGUgdGhhdCBjb3JyZXNwb25kcyB0b1xuICogdGhlIGJvZHkgb2YgdGhlIElJRkUuXG4gKlxuICogVGhlIGV4cHJlc3Npb24gbWF5IGJlIHdyYXBwZWQgaW4gcGFyZW50aGVzZXMsIHdoaWNoIGFyZSBzdHJpcHBlZCBvZmYuXG4gKlxuICogSWYgdGhlIElJRkUgaXMgYW4gYXJyb3cgZnVuY3Rpb24gdGhlbiBpdHMgYm9keSBjb3VsZCBiZSBhIGB0cy5FeHByZXNzaW9uYCByYXRoZXIgdGhhbiBhXG4gKiBgdHMuRnVuY3Rpb25Cb2R5YC5cbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiB0aGUgZXhwcmVzc2lvbiB0byBwYXJzZS5cbiAqIEByZXR1cm5zIHRoZSBgdHMuRXhwcmVzc2lvbmAgb3IgYHRzLkZ1bmN0aW9uQm9keWAgdGhhdCBob2xkcyB0aGUgYm9keSBvZiB0aGUgSUlGRSBvciBgdW5kZWZpbmVkYFxuICogICAgIGlmIHRoZSBgZXhwcmVzc2lvbmAgZGlkIG5vdCBoYXZlIHRoZSBjb3JyZWN0IHNoYXBlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SWlmZUJvZHkoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IHRzLkNvbmNpc2VCb2R5fHVuZGVmaW5lZCB7XG4gIGNvbnN0IGNhbGwgPSBzdHJpcFBhcmVudGhlc2VzKGV4cHJlc3Npb24pO1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oY2FsbCkpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgZm4gPSBzdHJpcFBhcmVudGhlc2VzKGNhbGwuZXhwcmVzc2lvbik7XG4gIGlmICghdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZm4pICYmICF0cy5pc0Fycm93RnVuY3Rpb24oZm4pKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiBmbi5ib2R5O1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgYG5vZGVgIGlzIGFuIGFzc2lnbm1lbnQgb2YgdGhlIGZvcm0gYGEgPSBiYC5cbiAqXG4gKiBAcGFyYW0gbm9kZSBUaGUgQVNUIG5vZGUgdG8gY2hlY2suXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fzc2lnbm1lbnQobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuQXNzaWdubWVudEV4cHJlc3Npb248dHMuRXF1YWxzVG9rZW4+IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiBub2RlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbjtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBwcm92aWRlZCBjYWxsIGV4cHJlc3Npb24gdGFyZ2V0cyBhIGNsYXNzLCBieSB2ZXJpZnlpbmcgaXRzIGFyZ3VtZW50cyBhcmVcbiAqIGFjY29yZGluZyB0byB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBfX2RlY29yYXRlKFtdLCBTb21lRGlyZWN0aXZlKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBjYWxsIHRoZSBjYWxsIGV4cHJlc3Npb24gdGhhdCBpcyB0ZXN0ZWQgdG8gcmVwcmVzZW50IGEgY2xhc3MgZGVjb3JhdG9yIGNhbGwuXG4gKiBAcGFyYW0gbWF0Y2hlcyBwcmVkaWNhdGUgZnVuY3Rpb24gdG8gdGVzdCB3aGV0aGVyIHRoZSBjYWxsIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGVzaXJlZCBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2xhc3NEZWNvcmF0ZUNhbGwoXG4gICAgY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24sIG1hdGNoZXM6IChpZGVudGlmaWVyOiB0cy5JZGVudGlmaWVyKSA9PiBib29sZWFuKTpcbiAgICBjYWxsIGlzIHRzLkNhbGxFeHByZXNzaW9uJnthcmd1bWVudHM6IFt0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uLCB0cy5FeHByZXNzaW9uXX0ge1xuICBjb25zdCBoZWxwZXJBcmdzID0gY2FsbC5hcmd1bWVudHNbMF07XG4gIGlmIChoZWxwZXJBcmdzID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihoZWxwZXJBcmdzKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHRhcmdldCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICByZXR1cm4gdGFyZ2V0ICE9PSB1bmRlZmluZWQgJiYgdHMuaXNJZGVudGlmaWVyKHRhcmdldCkgJiYgbWF0Y2hlcyh0YXJnZXQpO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIHByb3ZpZGVkIGNhbGwgZXhwcmVzc2lvbiB0YXJnZXRzIGEgbWVtYmVyIG9mIHRoZSBjbGFzcywgYnkgdmVyaWZ5aW5nIGl0c1xuICogYXJndW1lbnRzIGFyZSBhY2NvcmRpbmcgdG8gdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogX19kZWNvcmF0ZShbXSwgU29tZURpcmVjdGl2ZS5wcm90b3R5cGUsIFwibWVtYmVyXCIsIHZvaWQgMCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gY2FsbCB0aGUgY2FsbCBleHByZXNzaW9uIHRoYXQgaXMgdGVzdGVkIHRvIHJlcHJlc2VudCBhIG1lbWJlciBkZWNvcmF0b3IgY2FsbC5cbiAqIEBwYXJhbSBtYXRjaGVzIHByZWRpY2F0ZSBmdW5jdGlvbiB0byB0ZXN0IHdoZXRoZXIgdGhlIGNhbGwgaXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkZXNpcmVkIGNsYXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNZW1iZXJEZWNvcmF0ZUNhbGwoXG4gICAgY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24sIG1hdGNoZXM6IChpZGVudGlmaWVyOiB0cy5JZGVudGlmaWVyKSA9PiBib29sZWFuKTpcbiAgICBjYWxsIGlzIHRzLkNhbGxFeHByZXNzaW9uJlxuICAgIHthcmd1bWVudHM6IFt0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uLCB0cy5TdHJpbmdMaXRlcmFsLCB0cy5TdHJpbmdMaXRlcmFsXX0ge1xuICBjb25zdCBoZWxwZXJBcmdzID0gY2FsbC5hcmd1bWVudHNbMF07XG4gIGlmIChoZWxwZXJBcmdzID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihoZWxwZXJBcmdzKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHRhcmdldCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHRhcmdldCkgfHxcbiAgICAgICF0cy5pc0lkZW50aWZpZXIodGFyZ2V0LmV4cHJlc3Npb24pIHx8ICFtYXRjaGVzKHRhcmdldC5leHByZXNzaW9uKSB8fFxuICAgICAgdGFyZ2V0Lm5hbWUudGV4dCAhPT0gJ3Byb3RvdHlwZScpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBtZW1iZXJOYW1lID0gY2FsbC5hcmd1bWVudHNbMl07XG4gIHJldHVybiBtZW1iZXJOYW1lICE9PSB1bmRlZmluZWQgJiYgdHMuaXNTdHJpbmdMaXRlcmFsKG1lbWJlck5hbWUpO1xufVxuXG4vKipcbiAqIEhlbHBlciBtZXRob2QgdG8gZXh0cmFjdCB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBnaXZlbiB0aGUgcHJvcGVydHkncyBcInN5bWJvbFwiLFxuICogd2hpY2ggaXMgYWN0dWFsbHkgdGhlIHN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBvZiB0aGUgcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwcm9wU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5FeHByZXNzaW9ufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHByb3BJZGVudGlmaWVyID0gcHJvcFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICBjb25zdCBwYXJlbnQgPSBwcm9wSWRlbnRpZmllciAmJiBwcm9wSWRlbnRpZmllci5wYXJlbnQ7XG4gIHJldHVybiBwYXJlbnQgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKHBhcmVudCkgPyBwYXJlbnQucmlnaHQgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQSBjYWxsZWUgY291bGQgYmUgb25lIG9mOiBgX19kZWNvcmF0ZSguLi4pYCBvciBgdHNsaWJfMS5fX2RlY29yYXRlYC5cbiAqL1xuZnVuY3Rpb24gZ2V0Q2FsbGVlTmFtZShjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbik6IHN0cmluZ3xudWxsIHtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihjYWxsLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIHN0cmlwRG9sbGFyU3VmZml4KGNhbGwuZXhwcmVzc2lvbi50ZXh0KTtcbiAgfVxuICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBzdHJpcERvbGxhclN1ZmZpeChjYWxsLmV4cHJlc3Npb24ubmFtZS50ZXh0KTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLy8vLy8vLy8vLy8vLyBJbnRlcm5hbCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxudHlwZSBJbml0aWFsaXplZFZhcmlhYmxlQ2xhc3NEZWNsYXJhdGlvbiA9XG4gICAgQ2xhc3NEZWNsYXJhdGlvbjx0cy5WYXJpYWJsZURlY2xhcmF0aW9uPiZ7aW5pdGlhbGl6ZXI6IHRzLkV4cHJlc3Npb259O1xuXG5mdW5jdGlvbiBpc0luaXRpYWxpemVkVmFyaWFibGVDbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIG5vZGUgaXMgSW5pdGlhbGl6ZWRWYXJpYWJsZUNsYXNzRGVjbGFyYXRpb24ge1xuICByZXR1cm4gaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgJiYgbm9kZS5pbml0aWFsaXplciAhPT0gdW5kZWZpbmVkO1xufVxuLyoqXG4gKiBIYW5kbGUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9ybVxuICpcbiAqIGBgYFxuICogdmFyIE15Q2xhc3MgPSBhbGlhczEgPSBhbGlhczIgPSA8PGRlY2xhcmF0aW9uPj5cbiAqIGBgYFxuICpcbiAqIEBub2RlIHRoZSBMSFMgb2YgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAqIEByZXR1cm5zIHRoZSBvcmlnaW5hbCBBU1Qgbm9kZSBvciB0aGUgUkhTIG9mIGEgc2VyaWVzIG9mIGFzc2lnbm1lbnRzIGluIGEgdmFyaWFibGVcbiAqICAgICBkZWNsYXJhdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNraXBDbGFzc0FsaWFzZXMobm9kZTogSW5pdGlhbGl6ZWRWYXJpYWJsZUNsYXNzRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgbGV0IGV4cHJlc3Npb24gPSBub2RlLmluaXRpYWxpemVyO1xuICB3aGlsZSAoaXNBc3NpZ25tZW50KGV4cHJlc3Npb24pKSB7XG4gICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24ucmlnaHQ7XG4gIH1cbiAgcmV0dXJuIGV4cHJlc3Npb247XG59XG5cbi8qKlxuICogVGhpcyBleHByZXNzaW9uIGNvdWxkIGVpdGhlciBiZSBhIGNsYXNzIGV4cHJlc3Npb25cbiAqXG4gKiBgYGBcbiAqIGNsYXNzIE15Q2xhc3Mge307XG4gKiBgYGBcbiAqXG4gKiBvciBhbiBJSUZFIHdyYXBwZWQgY2xhc3MgZXhwcmVzc2lvblxuICpcbiAqIGBgYFxuICogKCgpID0+IHtcbiAqICAgY2xhc3MgTXlDbGFzcyB7fVxuICogICAuLi5cbiAqICAgcmV0dXJuIE15Q2xhc3M7XG4gKiB9KSgpXG4gKiBgYGBcbiAqXG4gKiBvciBhbiBJSUZFIHdyYXBwZWQgYWxpYXNlZCBjbGFzcyBleHByZXNzaW9uXG4gKlxuICogYGBgXG4gKiAoKCkgPT4ge1xuICogICBsZXQgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge31cbiAqICAgLi4uXG4gKiAgIHJldHVybiBNeUNsYXNzO1xuICogfSkoKVxuICogYGBgXG4gKlxuICogb3IgYW4gSUZGRSB3cmFwcGVkIEVTNSBjbGFzcyBmdW5jdGlvblxuICpcbiAqIGBgYFxuICogKGZ1bmN0aW9uICgpIHtcbiAqICBmdW5jdGlvbiBNeUNsYXNzKCkge31cbiAqICAuLi5cbiAqICByZXR1cm4gTXlDbGFzc1xuICogfSkoKVxuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIG5vZGUgdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyB3aG9zZSBkZWNsYXJhdGlvbiB3ZSBhcmUgZmluZGluZy5cbiAqIEByZXR1cm5zIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3Mgb3IgYG51bGxgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIi5cbiAqL1xuZnVuY3Rpb24gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOlxuICAgIENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NFeHByZXNzaW9ufHRzLkNsYXNzRGVjbGFyYXRpb258dHMuRnVuY3Rpb25EZWNsYXJhdGlvbj58bnVsbCB7XG4gIGlmICh0cy5pc0NsYXNzRXhwcmVzc2lvbihleHByZXNzaW9uKSAmJiBoYXNOYW1lSWRlbnRpZmllcihleHByZXNzaW9uKSkge1xuICAgIHJldHVybiBleHByZXNzaW9uO1xuICB9XG5cbiAgY29uc3QgaWlmZUJvZHkgPSBnZXRJaWZlQm9keShleHByZXNzaW9uKTtcbiAgaWYgKGlpZmVCb2R5ID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmICghdHMuaXNCbG9jayhpaWZlQm9keSkpIHtcbiAgICAvLyBIYW5kbGUgdGhlIGZhdCBhcnJvdyBleHByZXNzaW9uIGNhc2U6IGAoKSA9PiBDbGFzc0V4cHJlc3Npb25gXG4gICAgcmV0dXJuIHRzLmlzQ2xhc3NFeHByZXNzaW9uKGlpZmVCb2R5KSAmJiBpc05hbWVkRGVjbGFyYXRpb24oaWlmZUJvZHkpID8gaWlmZUJvZHkgOiBudWxsO1xuICB9IGVsc2Uge1xuICAgIC8vIEhhbmRsZSB0aGUgY2FzZSBvZiBhIG5vcm1hbCBvciBmYXQtYXJyb3cgZnVuY3Rpb24gd2l0aCBhIGJvZHkuXG4gICAgLy8gUmV0dXJuIHRoZSBmaXJzdCBDbGFzc0RlY2xhcmF0aW9uL1ZhcmlhYmxlRGVjbGFyYXRpb24gaW5zaWRlIHRoZSBib2R5XG4gICAgZm9yIChjb25zdCBzdGF0ZW1lbnQgb2YgaWlmZUJvZHkuc3RhdGVtZW50cykge1xuICAgICAgaWYgKGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKHN0YXRlbWVudCkgfHwgaXNOYW1lZEZ1bmN0aW9uRGVjbGFyYXRpb24oc3RhdGVtZW50KSkge1xuICAgICAgICByZXR1cm4gc3RhdGVtZW50O1xuICAgICAgfVxuICAgICAgaWYgKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBmb3IgKGNvbnN0IGRlY2xhcmF0aW9uIG9mIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zKSB7XG4gICAgICAgICAgaWYgKGlzSW5pdGlhbGl6ZWRWYXJpYWJsZUNsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICBjb25zdCBleHByZXNzaW9uID0gc2tpcENsYXNzQWxpYXNlcyhkZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBpZiAodHMuaXNDbGFzc0V4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgaGFzTmFtZUlkZW50aWZpZXIoZXhwcmVzc2lvbikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGV4cHJlc3Npb247XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldERlY29yYXRvckFyZ3Mobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uW10ge1xuICAvLyBUaGUgYXJndW1lbnRzIG9mIGEgZGVjb3JhdG9yIGFyZSBoZWxkIGluIHRoZSBgYXJnc2AgcHJvcGVydHkgb2YgaXRzIGRlY2xhcmF0aW9uIG9iamVjdC5cbiAgY29uc3QgYXJnc1Byb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKHByb3BlcnR5ID0+IGdldE5hbWVUZXh0KHByb3BlcnR5Lm5hbWUpID09PSAnYXJncycpO1xuICBjb25zdCBhcmdzRXhwcmVzc2lvbiA9IGFyZ3NQcm9wZXJ0eSAmJiBhcmdzUHJvcGVydHkuaW5pdGlhbGl6ZXI7XG4gIHJldHVybiBhcmdzRXhwcmVzc2lvbiAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oYXJnc0V4cHJlc3Npb24pID9cbiAgICAgIEFycmF5LmZyb20oYXJnc0V4cHJlc3Npb24uZWxlbWVudHMpIDpcbiAgICAgIFtdO1xufVxuXG5mdW5jdGlvbiBpc1Byb3BlcnR5QWNjZXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiZcbiAgICB7cGFyZW50OiB0cy5CaW5hcnlFeHByZXNzaW9ufSB7XG4gIHJldHVybiAhIW5vZGUucGFyZW50ICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlLnBhcmVudCkgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGlzVGhpc0Fzc2lnbm1lbnQobm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLkJpbmFyeUV4cHJlc3Npb24mXG4gICAge2xlZnQ6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbn0ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUubGVmdCkgJiZcbiAgICAgIG5vZGUubGVmdC5leHByZXNzaW9uLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQ7XG59XG5cbmZ1bmN0aW9uIGlzTmFtZWREZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5OYW1lZERlY2xhcmF0aW9uJntuYW1lOiB0cy5JZGVudGlmaWVyfSB7XG4gIGNvbnN0IGFueU5vZGU6IGFueSA9IG5vZGU7XG4gIHJldHVybiAhIWFueU5vZGUubmFtZSAmJiB0cy5pc0lkZW50aWZpZXIoYW55Tm9kZS5uYW1lKTtcbn1cblxuXG5mdW5jdGlvbiBpc0NsYXNzTWVtYmVyVHlwZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXMgdHMuQ2xhc3NFbGVtZW50fFxuICAgIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbnx0cy5CaW5hcnlFeHByZXNzaW9uIHtcbiAgcmV0dXJuICh0cy5pc0NsYXNzRWxlbWVudChub2RlKSB8fCBpc1Byb3BlcnR5QWNjZXNzKG5vZGUpIHx8IHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSkgJiZcbiAgICAgIC8vIEFkZGl0aW9uYWxseSwgZW5zdXJlIGBub2RlYCBpcyBub3QgYW4gaW5kZXggc2lnbmF0dXJlLCBmb3IgZXhhbXBsZSBvbiBhbiBhYnN0cmFjdCBjbGFzczpcbiAgICAgIC8vIGBhYnN0cmFjdCBjbGFzcyBGb28geyBba2V5OiBzdHJpbmddOiBhbnk7IH1gXG4gICAgICAhdHMuaXNJbmRleFNpZ25hdHVyZURlY2xhcmF0aW9uKG5vZGUpO1xufVxuXG4vKipcbiAqIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gaXMgYXNzaWduZWQgdG8uXG4gKiBGb3IgZXhhbXBsZSwgZm9yIHRoZSBmb2xsb3dpbmcgY29kZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgXG4gKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9ICgoKSA9PiB7XG4gKiAgIGNsYXNzIE15Q2xhc3Mge31cbiAqICAgLi4uXG4gKiAgIHJldHVybiBNeUNsYXNzO1xuICogfSkoKVxuICBgYGBcbiAqXG4gKiBhbmQgdGhlIHByb3ZpZGVkIGRlY2xhcmF0aW9uIGJlaW5nIGBjbGFzcyBNeUNsYXNzIHt9YCwgdGhpcyB3aWxsIHJldHVybiB0aGUgYHZhciBNeUNsYXNzYFxuICogZGVjbGFyYXRpb24uXG4gKlxuICogQHBhcmFtIGRlY2xhcmF0aW9uIFRoZSBkZWNsYXJhdGlvbiBmb3Igd2hpY2ggYW55IHZhcmlhYmxlIGRlY2xhcmF0aW9uIHNob3VsZCBiZSBvYnRhaW5lZC5cbiAqIEByZXR1cm5zIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbiBpZiBmb3VuZCwgdW5kZWZpbmVkIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gZ2V0RmFyTGVmdEhhbmRTaWRlT2ZBc3NpZ25tZW50KGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLlZhcmlhYmxlRGVjbGFyYXRpb258XG4gICAgdW5kZWZpbmVkIHtcbiAgbGV0IG5vZGUgPSBkZWNsYXJhdGlvbi5wYXJlbnQ7XG5cbiAgLy8gRGV0ZWN0IGFuIGludGVybWVkaWFyeSB2YXJpYWJsZSBhc3NpZ25tZW50IGFuZCBza2lwIG92ZXIgaXQuXG4gIGlmIChpc0Fzc2lnbm1lbnQobm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUubGVmdCkpIHtcbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpID8gbm9kZSA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZ2V0Q29udGFpbmluZ1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6IENsYXNzRGVjbGFyYXRpb248dHMuVmFyaWFibGVEZWNsYXJhdGlvbj58XG4gICAgdW5kZWZpbmVkIHtcbiAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB3aGlsZSAobm9kZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGlzTmFtZWRWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBtYXkgaGF2ZSBiZWVuIFwic3ludGhlc2l6ZWRcIiBieSBUeXBlU2NyaXB0IGR1cmluZyBKYXZhU2NyaXB0IGVtaXQsXG4gKiBpbiB0aGUgY2FzZSBubyB1c2VyLWRlZmluZWQgY29uc3RydWN0b3IgZXhpc3RzIGFuZCBlLmcuIHByb3BlcnR5IGluaXRpYWxpemVycyBhcmUgdXNlZC5cbiAqIFRob3NlIGluaXRpYWxpemVycyBuZWVkIHRvIGJlIGVtaXR0ZWQgaW50byBhIGNvbnN0cnVjdG9yIGluIEphdmFTY3JpcHQsIHNvIHRoZSBUeXBlU2NyaXB0XG4gKiBjb21waWxlciBnZW5lcmF0ZXMgYSBzeW50aGV0aWMgY29uc3RydWN0b3IuXG4gKlxuICogV2UgbmVlZCB0byBpZGVudGlmeSBzdWNoIGNvbnN0cnVjdG9ycyBhcyBuZ2NjIG5lZWRzIHRvIGJlIGFibGUgdG8gdGVsbCBpZiBhIGNsYXNzIGRpZFxuICogb3JpZ2luYWxseSBoYXZlIGEgY29uc3RydWN0b3IgaW4gdGhlIFR5cGVTY3JpcHQgc291cmNlLiBXaGVuIGEgY2xhc3MgaGFzIGEgc3VwZXJjbGFzcyxcbiAqIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IgbXVzdCBub3QgYmUgY29uc2lkZXJlZCBhcyBhIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBhcyB0aGF0XG4gKiBwcmV2ZW50cyBhIGJhc2UgZmFjdG9yeSBjYWxsIGZyb20gYmVpbmcgY3JlYXRlZCBieSBuZ3RzYywgcmVzdWx0aW5nIGluIGEgZmFjdG9yeSBmdW5jdGlvblxuICogdGhhdCBkb2VzIG5vdCBpbmplY3QgdGhlIGRlcGVuZGVuY2llcyBvZiB0aGUgc3VwZXJjbGFzcy4gSGVuY2UsIHdlIGlkZW50aWZ5IGEgZGVmYXVsdFxuICogc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBpbiB0aGUgY29uc3RydWN0b3IgYm9keSwgYWNjb3JkaW5nIHRvIHRoZSBzdHJ1Y3R1cmUgdGhhdCBUeXBlU2NyaXB0XG4gKiBlbWl0cyBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0OlxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvdHMudHMjTDEwNjgtTDEwODJcbiAqXG4gKiBAcGFyYW0gY29uc3RydWN0b3IgYSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0byB0ZXN0XG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBjb25zdHJ1Y3RvciBhcHBlYXJzIHRvIGhhdmUgYmVlbiBzeW50aGVzaXplZFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3I6IHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgaWYgKCFjb25zdHJ1Y3Rvci5ib2R5KSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgZmlyc3RTdGF0ZW1lbnQgPSBjb25zdHJ1Y3Rvci5ib2R5LnN0YXRlbWVudHNbMF07XG4gIGlmICghZmlyc3RTdGF0ZW1lbnQgfHwgIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChmaXJzdFN0YXRlbWVudCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTeW50aGVzaXplZFN1cGVyQ2FsbChmaXJzdFN0YXRlbWVudC5leHByZXNzaW9uKTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkIGJ5IFR5cGVTY3JpcHQsIGkuZS4gd2hldGhlclxuICogaXQgaXMgb2YgdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIHRoZSBleHByZXNzaW9uIHRoYXQgaXMgdG8gYmUgdGVzdGVkXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGFwcGVhcnMgdG8gYmUgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRTdXBlckNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHJldHVybiBmYWxzZTtcbiAgaWYgKGV4cHJlc3Npb24uZXhwcmVzc2lvbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLlN1cGVyS2V5d29yZCkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgYXJndW1lbnQgPSBleHByZXNzaW9uLmFyZ3VtZW50c1swXTtcbiAgcmV0dXJuIHRzLmlzU3ByZWFkRWxlbWVudChhcmd1bWVudCkgJiYgdHMuaXNJZGVudGlmaWVyKGFyZ3VtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICBhcmd1bWVudC5leHByZXNzaW9uLnRleHQgPT09ICdhcmd1bWVudHMnO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlIHN0YXRlbWVudCB0aGF0IGNvbnRhaW5zIHRoZSBnaXZlbiBub2RlXG4gKiBAcGFyYW0gbm9kZSBhIG5vZGUgd2hvc2UgY29udGFpbmluZyBzdGF0ZW1lbnQgd2Ugd2lzaCB0byBmaW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250YWluaW5nU3RhdGVtZW50KG5vZGU6IHRzLk5vZGUpOiB0cy5TdGF0ZW1lbnQge1xuICB3aGlsZSAobm9kZS5wYXJlbnQpIHtcbiAgICBpZiAodHMuaXNCbG9jayhub2RlLnBhcmVudCkgfHwgdHMuaXNTb3VyY2VGaWxlKG5vZGUucGFyZW50KSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgfVxuICByZXR1cm4gbm9kZSBhcyB0cy5TdGF0ZW1lbnQ7XG59XG5cbmZ1bmN0aW9uIGdldFJvb3RGaWxlT3JGYWlsKGJ1bmRsZTogQnVuZGxlUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCByb290RmlsZSA9IGJ1bmRsZS5wcm9ncmFtLmdldFNvdXJjZUZpbGUoYnVuZGxlLnBhdGgpO1xuICBpZiAocm9vdEZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGdpdmVuIHJvb3RQYXRoICR7cm9vdEZpbGV9IGlzIG5vdCBhIGZpbGUgb2YgdGhlIHByb2dyYW0uYCk7XG4gIH1cbiAgcmV0dXJuIHJvb3RGaWxlO1xufVxuXG5mdW5jdGlvbiBnZXROb25Sb290UGFja2FnZUZpbGVzKGJ1bmRsZTogQnVuZGxlUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGVbXSB7XG4gIGNvbnN0IHJvb3RGaWxlID0gYnVuZGxlLnByb2dyYW0uZ2V0U291cmNlRmlsZShidW5kbGUucGF0aCk7XG4gIHJldHVybiBidW5kbGUucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbHRlcihcbiAgICAgIGYgPT4gKGYgIT09IHJvb3RGaWxlKSAmJiBpc1dpdGhpblBhY2thZ2UoYnVuZGxlLnBhY2thZ2UsIGYpKTtcbn1cblxuZnVuY3Rpb24gaXNUb3BMZXZlbChub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7XG4gIHdoaWxlIChub2RlID0gbm9kZS5wYXJlbnQpIHtcbiAgICBpZiAodHMuaXNCbG9jayhub2RlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGFjdHVhbCAob3V0ZXIpIGRlY2xhcmF0aW9uIG9mIGEgY2xhc3MuXG4gKlxuICogSW4gRVM1LCB0aGUgaW1wbGVtZW50YXRpb24gb2YgYSBjbGFzcyBpcyBhIGZ1bmN0aW9uIGV4cHJlc3Npb24gdGhhdCBpcyBoaWRkZW4gaW5zaWRlIGFuIElJRkUgYW5kXG4gKiByZXR1cm5lZCB0byBiZSBhc3NpZ25lZCB0byBhIHZhcmlhYmxlIG91dHNpZGUgdGhlIElJRkUsIHdoaWNoIGlzIHdoYXQgdGhlIHJlc3Qgb2YgdGhlIHByb2dyYW1cbiAqIGludGVyYWN0cyB3aXRoLlxuICpcbiAqIEdpdmVuIHRoZSBpbm5lciBmdW5jdGlvbiBkZWNsYXJhdGlvbiwgd2Ugd2FudCB0byBnZXQgdG8gdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBvdXRlciB2YXJpYWJsZVxuICogdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcy5cbiAqXG4gKiBAcGFyYW0gbm9kZSBhIG5vZGUgdGhhdCBjb3VsZCBiZSB0aGUgZnVuY3Rpb24gZXhwcmVzc2lvbiBpbnNpZGUgYW4gRVM1IGNsYXNzIElJRkUuXG4gKiBAcmV0dXJucyB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24gb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xhc3NEZWNsYXJhdGlvbkZyb21Jbm5lckRlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIENsYXNzRGVjbGFyYXRpb248dHMuVmFyaWFibGVEZWNsYXJhdGlvbj58bnVsbCB7XG4gIGlmICh0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkgfHwgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgLy8gSXQgbWlnaHQgYmUgdGhlIGZ1bmN0aW9uIGV4cHJlc3Npb24gaW5zaWRlIHRoZSBJSUZFLiBXZSBuZWVkIHRvIGdvIDUgbGV2ZWxzIHVwLi4uXG5cbiAgICAvLyAtIElJRkUgYm9keS5cbiAgICBsZXQgb3V0ZXJOb2RlID0gbm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFvdXRlck5vZGUgfHwgIXRzLmlzQmxvY2sob3V0ZXJOb2RlKSkgcmV0dXJuIG51bGw7XG5cbiAgICAvLyAtIElJRkUgZnVuY3Rpb24gZXhwcmVzc2lvbi5cbiAgICBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuICAgIGlmICghb3V0ZXJOb2RlIHx8ICghdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ob3V0ZXJOb2RlKSAmJiAhdHMuaXNBcnJvd0Z1bmN0aW9uKG91dGVyTm9kZSkpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgb3V0ZXJOb2RlID0gb3V0ZXJOb2RlLnBhcmVudDtcblxuICAgIC8vIC0gUGFyZW50aGVzaXMgaW5zaWRlIElJRkUuXG4gICAgaWYgKG91dGVyTm9kZSAmJiB0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKG91dGVyTm9kZSkpIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG5cbiAgICAvLyAtIElJRkUgY2FsbCBleHByZXNzaW9uLlxuICAgIGlmICghb3V0ZXJOb2RlIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKG91dGVyTm9kZSkpIHJldHVybiBudWxsO1xuICAgIG91dGVyTm9kZSA9IG91dGVyTm9kZS5wYXJlbnQ7XG5cbiAgICAvLyAtIFBhcmVudGhlc2lzIGFyb3VuZCBJSUZFLlxuICAgIGlmIChvdXRlck5vZGUgJiYgdHMuaXNQYXJlbnRoZXNpemVkRXhwcmVzc2lvbihvdXRlck5vZGUpKSBvdXRlck5vZGUgPSBvdXRlck5vZGUucGFyZW50O1xuXG4gICAgLy8gLSBPdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICBpZiAoIW91dGVyTm9kZSB8fCAhdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG91dGVyTm9kZSkpIHJldHVybiBudWxsO1xuXG4gICAgLy8gRmluYWxseSwgZW5zdXJlIHRoYXQgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGhhcyBhIGBuYW1lYCBpZGVudGlmaWVyLlxuICAgIHJldHVybiBoYXNOYW1lSWRlbnRpZmllcihvdXRlck5vZGUpID8gb3V0ZXJOb2RlIDogbnVsbDtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIl19