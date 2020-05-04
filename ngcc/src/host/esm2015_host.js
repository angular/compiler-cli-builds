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
         * This method extracts the `NgccClassSymbol` for `MyClass` when provided with the `var MyClass`
         * declaration node. When the `class MyClass {}` node or any other node is given, this method will
         * return undefined instead.
         *
         * @param declaration the declaration whose symbol we are finding.
         * @returns the symbol for the node or `undefined` if it does not represent an outer declaration
         * of a class.
         */
        Esm2015ReflectionHost.prototype.getClassSymbolFromOuterDeclaration = function (declaration) {
            // Create a symbol without inner declaration if it is a regular "top level" class declaration.
            if (reflection_1.isNamedClassDeclaration(declaration) && isTopLevel(declaration)) {
                return this.createClassSymbol(declaration, null);
            }
            // Otherwise, the declaration may be a variable declaration, in which case it must be
            // initialized using a class expression as inner declaration.
            if (ts.isVariableDeclaration(declaration) && utils_1.hasNameIdentifier(declaration)) {
                var innerDeclaration = getInnerClassDeclaration(declaration);
                if (innerDeclaration !== null) {
                    return this.createClassSymbol(declaration, innerDeclaration);
                }
            }
            return undefined;
        };
        /**
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
            if (reflection_1.isNamedClassDeclaration(declaration) && !isTopLevel(declaration)) {
                var node = declaration.parent;
                while (node !== undefined && !ts.isVariableDeclaration(node)) {
                    node = node.parent;
                }
                outerDeclaration = node;
            }
            else if (ts.isClassExpression(declaration) && utils_1.hasNameIdentifier(declaration)) {
                outerDeclaration = getVariableDeclarationOfDeclaration(declaration);
            }
            else {
                return undefined;
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
            var implementationSymbol = innerDeclaration !== null ?
                this.checker.getSymbolAtLocation(innerDeclaration.name) :
                declarationSymbol;
            if (implementationSymbol === undefined) {
                return undefined;
            }
            return {
                name: declarationSymbol.name,
                declaration: declarationSymbol,
                implementation: implementationSymbol,
            };
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
        Esm2015ReflectionHost.prototype.hasBaseClass = function (clazz) {
            var superHasBaseClass = _super.prototype.hasBaseClass.call(this, clazz);
            if (superHasBaseClass) {
                return superHasBaseClass;
            }
            var innerClassDeclaration = getInnerClassDeclaration(clazz);
            if (innerClassDeclaration === null) {
                return false;
            }
            return _super.prototype.hasBaseClass.call(this, innerClassDeclaration);
        };
        Esm2015ReflectionHost.prototype.getBaseClassExpression = function (clazz) {
            // First try getting the base class from the "outer" declaration
            var superBaseClassIdentifier = _super.prototype.getBaseClassExpression.call(this, clazz);
            if (superBaseClassIdentifier) {
                return superBaseClassIdentifier;
            }
            // That didn't work so now try getting it from the "inner" declaration.
            var innerClassDeclaration = getInnerClassDeclaration(clazz);
            if (innerClassDeclaration === null) {
                return null;
            }
            return _super.prototype.getBaseClassExpression.call(this, innerClassDeclaration);
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
            // The identifier may have been of an additional class assignment such as `MyClass_1` that was
            // present as alias for `MyClass`. If so, resolve such aliases to their original declaration.
            var aliasedIdentifier = this.resolveAliasedClassIdentifier(superDeclaration.node);
            if (aliasedIdentifier !== null) {
                return this.getDeclarationOfIdentifier(aliasedIdentifier);
            }
            // Variable declarations may represent an enum declaration, so attempt to resolve its members.
            if (ts.isVariableDeclaration(superDeclaration.node)) {
                var enumMembers = this.resolveEnumMembers(superDeclaration.node);
                if (enumMembers !== null) {
                    superDeclaration.identity = { kind: 0 /* DownleveledEnum */, enumMembers: enumMembers };
                }
            }
            return superDeclaration;
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
        /**
         * Search the given source file for exported functions and static class methods that return
         * ModuleWithProviders objects.
         * @param f The source file to search for these functions
         * @returns An array of function declarations that look like they return ModuleWithProviders
         * objects.
         */
        Esm2015ReflectionHost.prototype.getModuleWithProvidersFunctions = function (f) {
            var _this = this;
            var exports = this.getExportsOfModule(f);
            if (!exports)
                return [];
            var infos = [];
            exports.forEach(function (declaration, name) {
                if (declaration.node === null) {
                    return;
                }
                if (_this.isClass(declaration.node)) {
                    _this.getMembersOfClass(declaration.node).forEach(function (member) {
                        if (member.isStatic) {
                            var info = _this.parseForModuleWithProviders(member.name, member.node, member.implementation, declaration.node);
                            if (info) {
                                infos.push(info);
                            }
                        }
                    });
                }
                else {
                    if (isNamedDeclaration(declaration.node)) {
                        var info = _this.parseForModuleWithProviders(declaration.node.name.text, declaration.node);
                        if (info) {
                            infos.push(info);
                        }
                    }
                }
            });
            return infos;
        };
        Esm2015ReflectionHost.prototype.getEndOfClass = function (classSymbol) {
            var last = classSymbol.declaration.valueDeclaration;
            // If there are static members on this class then find the last one
            if (classSymbol.declaration.exports !== undefined) {
                classSymbol.declaration.exports.forEach(function (exportSymbol) {
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
            return last;
        };
        Esm2015ReflectionHost.prototype.detectKnownDeclaration = function (decl) {
            if (decl !== null && decl.known === null && this.isJavaScriptObjectDeclaration(decl)) {
                // If the identifier resolves to the global JavaScript `Object`, update the declaration to
                // denote it as the known `JsGlobalObject` declaration.
                decl.known = reflection_1.KnownDeclaration.JsGlobalObject;
            }
            return decl;
        };
        ///////////// Protected Helpers /////////////
        /**
         * Resolve a `ts.Symbol` to its declaration and detect whether it corresponds with a known
         * declaration.
         */
        Esm2015ReflectionHost.prototype.getDeclarationOfSymbol = function (symbol, originalId) {
            return this.detectKnownDeclaration(_super.prototype.getDeclarationOfSymbol.call(this, symbol, originalId));
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
            var matchesClass = function (identifier) {
                var decl = _this.getDeclarationOfIdentifier(identifier);
                if (decl === null) {
                    return false;
                }
                // The identifier corresponds with the class if its declaration is either the outer or inner
                // declaration.
                return decl.node === outerDeclaration || decl.node === innerDeclaration;
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
            else if (ts.isBlock(classNode.parent)) {
                return Array.from(classNode.parent.statements);
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
        /**
         * Parse a function/method node (or its implementation), to see if it returns a
         * `ModuleWithProviders` object.
         * @param name The name of the function.
         * @param node the node to check - this could be a function, a method or a variable declaration.
         * @param implementation the actual function expression if `node` is a variable declaration.
         * @param container the class that contains the function, if it is a method.
         * @returns info about the function if it does return a `ModuleWithProviders` object; `null`
         * otherwise.
         */
        Esm2015ReflectionHost.prototype.parseForModuleWithProviders = function (name, node, implementation, container) {
            if (implementation === void 0) { implementation = node; }
            if (container === void 0) { container = null; }
            if (implementation === null ||
                (!ts.isFunctionDeclaration(implementation) && !ts.isMethodDeclaration(implementation) &&
                    !ts.isFunctionExpression(implementation))) {
                return null;
            }
            var declaration = implementation;
            var definition = this.getDefinitionOfFunction(declaration);
            if (definition === null) {
                return null;
            }
            var body = definition.body;
            var lastStatement = body && body[body.length - 1];
            var returnExpression = lastStatement && ts.isReturnStatement(lastStatement) && lastStatement.expression || null;
            var ngModuleProperty = returnExpression && ts.isObjectLiteralExpression(returnExpression) &&
                returnExpression.properties.find(function (prop) {
                    return !!prop.name && ts.isIdentifier(prop.name) && prop.name.text === 'ngModule';
                }) ||
                null;
            if (!ngModuleProperty || !ts.isPropertyAssignment(ngModuleProperty)) {
                return null;
            }
            // The ngModuleValue could be of the form `SomeModule` or `namespace_1.SomeModule`
            var ngModuleValue = ngModuleProperty.initializer;
            if (!ts.isIdentifier(ngModuleValue) && !ts.isPropertyAccessExpression(ngModuleValue)) {
                return null;
            }
            var ngModuleDeclaration = this.getDeclarationOfExpression(ngModuleValue);
            if (!ngModuleDeclaration || ngModuleDeclaration.node === null) {
                throw new Error("Cannot find a declaration for NgModule " + ngModuleValue.getText() + " referenced in \"" + declaration.getText() + "\"");
            }
            if (!utils_1.hasNameIdentifier(ngModuleDeclaration.node)) {
                return null;
            }
            return {
                name: name,
                ngModule: ngModuleDeclaration,
                declaration: declaration,
                container: container
            };
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
    function getIifeConciseBody(expression) {
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
    exports.getIifeConciseBody = getIifeConciseBody;
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
    ///////////// Internal Helpers /////////////
    /**
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
     * `class MyClass {}` expression is returned as declaration of `var MyClass`. If the variable
     * is not initialized using a class expression, null is returned.
     *
     * @param node the node that represents the class whose declaration we are finding.
     * @returns the declaration of the class or `null` if it is not a "class".
     */
    function getInnerClassDeclaration(node) {
        if (!ts.isVariableDeclaration(node) || node.initializer === undefined) {
            return null;
        }
        // Recognize a variable declaration of the form `var MyClass = class MyClass {}` or
        // `var MyClass = MyClass_1 = class MyClass {};`
        var expression = node.initializer;
        while (isAssignment(expression)) {
            expression = expression.right;
        }
        if (ts.isClassExpression(expression) && utils_1.hasNameIdentifier(expression)) {
            return expression;
        }
        // Try to parse out a class declaration wrapped in an IIFE (as generated by TS 3.9)
        // e.g.
        // /* @class */ = (() => {
        //   class MyClass {}
        //   ...
        //   return MyClass;
        // })();
        var iifeBody = getIifeConciseBody(expression);
        if (iifeBody === undefined) {
            return null;
        }
        // Extract the class declaration from inside the IIFE.
        var innerDeclaration = ts.isBlock(iifeBody) ?
            iifeBody.statements.find(ts.isClassDeclaration) :
            ts.isClassExpression(iifeBody) ? iifeBody : undefined;
        if (innerDeclaration === undefined || !utils_1.hasNameIdentifier(innerDeclaration)) {
            return null;
        }
        return innerDeclaration;
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
    function getVariableDeclarationOfDeclaration(declaration) {
        var node = declaration.parent;
        // Detect an intermediary variable assignment and skip over it.
        if (isAssignment(node) && ts.isIdentifier(node.left)) {
            node = node.parent;
        }
        return ts.isVariableDeclaration(node) ? node : undefined;
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
        while (node) {
            if (ts.isExpressionStatement(node)) {
                break;
            }
            node = node.parent;
        }
        return node || null;
    }
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyx5RUFBbVU7SUFDblUscUVBQWlEO0lBR2pELDhEQUErRjtJQUUvRiwyRUFBeUw7SUFDekwsbUVBQXlDO0lBRTVCLFFBQUEsVUFBVSxHQUFHLFlBQTJCLENBQUM7SUFDekMsUUFBQSxlQUFlLEdBQUcsZ0JBQStCLENBQUM7SUFDbEQsUUFBQSxXQUFXLEdBQUcsZUFBOEIsQ0FBQztJQUM3QyxRQUFBLGtCQUFrQixHQUFHLGdCQUErQixDQUFDO0lBRWxFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTBCRztJQUNIO1FBQTJDLGlEQUF3QjtRQWdEakUsK0JBQ2MsTUFBYyxFQUFZLE1BQWUsRUFBWSxHQUFrQixFQUN2RSxHQUE4QjtZQUE5QixvQkFBQSxFQUFBLFVBQThCO1lBRjVDLFlBR0Usa0JBQU0sR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxTQUNwQztZQUhhLFlBQU0sR0FBTixNQUFNLENBQVE7WUFBWSxZQUFNLEdBQU4sTUFBTSxDQUFTO1lBQVksU0FBRyxHQUFILEdBQUcsQ0FBZTtZQUN2RSxTQUFHLEdBQUgsR0FBRyxDQUEyQjtZQWpENUM7Ozs7OztlQU1HO1lBQ08sNkJBQXVCLEdBQTZDLElBQUksQ0FBQztZQUNuRjs7Ozs7O2VBTUc7WUFDTyw4QkFBd0IsR0FBNkMsSUFBSSxDQUFDO1lBRXBGOztlQUVHO1lBQ08sNkJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQWlCLENBQUM7WUFFN0Q7Ozs7Ozs7Ozs7Ozs7O2VBY0c7WUFDTyw4QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQztZQUU5RTs7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QUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxJQUFJLHNCQUFlLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBdEQsQ0FBc0QsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCxTQUFTLFVBQVUsQ0FBQyxJQUFhO1FBQy9CLE9BQU8sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDekIsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNwQixPQUFPLEtBQUssQ0FBQzthQUNkO1NBQ0Y7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIENvbmNyZXRlRGVjbGFyYXRpb24sIEN0b3JQYXJhbWV0ZXIsIERlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIEVudW1NZW1iZXIsIGlzRGVjb3JhdG9ySWRlbnRpZmllciwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIEtub3duRGVjbGFyYXRpb24sIHJlZmxlY3RPYmplY3RMaXRlcmFsLCBTcGVjaWFsRGVjbGFyYXRpb25LaW5kLCBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QsIFR5cGVWYWx1ZVJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4uL2FuYWx5c2lzL3V0aWwnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7QnVuZGxlUHJvZ3JhbX0gZnJvbSAnLi4vcGFja2FnZXMvYnVuZGxlX3Byb2dyYW0nO1xuaW1wb3J0IHtmaW5kQWxsLCBnZXROYW1lVGV4dCwgaGFzTmFtZUlkZW50aWZpZXIsIGlzRGVmaW5lZCwgc3RyaXBEb2xsYXJTdWZmaXh9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtDbGFzc1N5bWJvbCwgaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbiwgTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uLCBOZ2NjQ2xhc3NTeW1ib2wsIE5nY2NSZWZsZWN0aW9uSG9zdCwgUFJFX1IzX01BUktFUiwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4vbmdjY19ob3N0JztcbmltcG9ydCB7c3RyaXBQYXJlbnRoZXNlc30gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBjb25zdCBERUNPUkFUT1JTID0gJ2RlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IFBST1BfREVDT1JBVE9SUyA9ICdwcm9wRGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1IgPSAnX19jb25zdHJ1Y3RvcicgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1JfUEFSQU1TID0gJ2N0b3JQYXJhbWV0ZXJzJyBhcyB0cy5fX1N0cmluZztcblxuLyoqXG4gKiBFc20yMDE1IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCAyMDE1IGNsYXNzZXMsIGV0Yy5cbiAqIERlY29yYXRvcnMgYXJlIGRlZmluZWQgdmlhIHN0YXRpYyBwcm9wZXJ0aWVzIG9uIHRoZSBjbGFzcy4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBjbGFzcyBTb21lRGlyZWN0aXZlIHtcbiAqIH1cbiAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gKiBdO1xuICogU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9ycyA9IHtcbiAqICAgXCJpbnB1dDFcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogICBcImlucHV0MlwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiB9O1xuICogYGBgXG4gKlxuICogKiBDbGFzc2VzIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICAvKipcbiAgICogQSBtYXBwaW5nIGZyb20gc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucywgd2hpY2ggYXJlIGJvdGggcHVibGljbHkgZXhwb3J0ZWQuXG4gICAqXG4gICAqIFRoZXJlIHNob3VsZCBiZSBvbmUgZW50cnkgZm9yIGV2ZXJ5IHB1YmxpYyBleHBvcnQgdmlzaWJsZSBmcm9tIHRoZSByb290IGZpbGUgb2YgdGhlIHNvdXJjZVxuICAgKiB0cmVlLiBOb3RlIHRoYXQgYnkgZGVmaW5pdGlvbiB0aGUga2V5IGFuZCB2YWx1ZSBkZWNsYXJhdGlvbnMgd2lsbCBub3QgYmUgaW4gdGhlIHNhbWUgVFNcbiAgICogcHJvZ3JhbS5cbiAgICovXG4gIHByb3RlY3RlZCBwdWJsaWNEdHNEZWNsYXJhdGlvbk1hcDogTWFwPHRzLkRlY2xhcmF0aW9uLCB0cy5EZWNsYXJhdGlvbj58bnVsbCA9IG51bGw7XG4gIC8qKlxuICAgKiBBIG1hcHBpbmcgZnJvbSBzb3VyY2UgZGVjbGFyYXRpb25zIHRvIHR5cGluZ3MgZGVjbGFyYXRpb25zLCB3aGljaCBhcmUgbm90IHB1YmxpY2x5IGV4cG9ydGVkLlxuICAgKlxuICAgKiBUaGlzIG1hcHBpbmcgaXMgYSBiZXN0IGd1ZXNzIGJldHdlZW4gZGVjbGFyYXRpb25zIHRoYXQgaGFwcGVuIHRvIGJlIGV4cG9ydGVkIGZyb20gdGhlaXIgZmlsZSBieVxuICAgKiB0aGUgc2FtZSBuYW1lIGluIGJvdGggdGhlIHNvdXJjZSBhbmQgdGhlIGR0cyBmaWxlLiBOb3RlIHRoYXQgYnkgZGVmaW5pdGlvbiB0aGUga2V5IGFuZCB2YWx1ZVxuICAgKiBkZWNsYXJhdGlvbnMgd2lsbCBub3QgYmUgaW4gdGhlIHNhbWUgVFMgcHJvZ3JhbS5cbiAgICovXG4gIHByb3RlY3RlZCBwcml2YXRlRHRzRGVjbGFyYXRpb25NYXA6IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+fG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBUaGUgc2V0IG9mIHNvdXJjZSBmaWxlcyB0aGF0IGhhdmUgYWxyZWFkeSBiZWVuIHByZXByb2Nlc3NlZC5cbiAgICovXG4gIHByb3RlY3RlZCBwcmVwcm9jZXNzZWRTb3VyY2VGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcblxuICAvKipcbiAgICogSW4gRVMyMDE1LCBjbGFzcyBkZWNsYXJhdGlvbnMgbWF5IGhhdmUgYmVlbiBkb3duLWxldmVsZWQgaW50byB2YXJpYWJsZSBkZWNsYXJhdGlvbnMsXG4gICAqIGluaXRpYWxpemVkIHVzaW5nIGEgY2xhc3MgZXhwcmVzc2lvbi4gSW4gY2VydGFpbiBzY2VuYXJpb3MsIGFuIGFkZGl0aW9uYWwgdmFyaWFibGVcbiAgICogaXMgaW50cm9kdWNlZCB0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzIHNvIHRoYXQgcmVzdWx0cyBpbiBjb2RlIHN1Y2ggYXM6XG4gICAqXG4gICAqIGBgYFxuICAgKiBsZXQgTXlDbGFzc18xOyBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1hcCB0cmFja3MgdGhvc2UgYWxpYXNlZCB2YXJpYWJsZXMgdG8gdGhlaXIgb3JpZ2luYWwgaWRlbnRpZmllciwgaS5lLiB0aGUga2V5XG4gICAqIGNvcnJlc3BvbmRzIHdpdGggdGhlIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzXzFgIGFuZCBpdHMgdmFsdWUgYmVjb21lcyB0aGUgYE15Q2xhc3NgIGlkZW50aWZpZXJcbiAgICogb2YgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBUaGlzIG1hcCBpcyBwb3B1bGF0ZWQgZHVyaW5nIHRoZSBwcmVwcm9jZXNzaW5nIG9mIGVhY2ggc291cmNlIGZpbGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogQ2FjaGVzIHRoZSBpbmZvcm1hdGlvbiBvZiB0aGUgZGVjb3JhdG9ycyBvbiBhIGNsYXNzLCBhcyB0aGUgd29yayBpbnZvbHZlZCB3aXRoIGV4dHJhY3RpbmdcbiAgICogZGVjb3JhdG9ycyBpcyBjb21wbGV4IGFuZCBmcmVxdWVudGx5IHVzZWQuXG4gICAqXG4gICAqIFRoaXMgbWFwIGlzIGxhemlseSBwb3B1bGF0ZWQgZHVyaW5nIHRoZSBmaXJzdCBjYWxsIHRvIGBhY3F1aXJlRGVjb3JhdG9ySW5mb2AgZm9yIGEgZ2l2ZW4gY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZGVjb3JhdG9yQ2FjaGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvckluZm8+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgbG9nZ2VyOiBMb2dnZXIsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sIHByb3RlY3RlZCBzcmM6IEJ1bmRsZVByb2dyYW0sXG4gICAgICBwcm90ZWN0ZWQgZHRzOiBCdW5kbGVQcm9ncmFtfG51bGwgPSBudWxsKSB7XG4gICAgc3VwZXIoc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhIHN5bWJvbCBmb3IgYSBub2RlIHRoYXQgd2UgdGhpbmsgaXMgYSBjbGFzcy5cbiAgICogQ2xhc3NlcyBzaG91bGQgaGF2ZSBhIGBuYW1lYCBpZGVudGlmaWVyLCBiZWNhdXNlIHRoZXkgbWF5IG5lZWQgdG8gYmUgcmVmZXJlbmNlZCBpbiBvdGhlciBwYXJ0c1xuICAgKiBvZiB0aGUgcHJvZ3JhbS5cbiAgICpcbiAgICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlczpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIG9yXG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9ICgoKSA9PiB7IGNsYXNzIE15Q2xhc3Mge30gLi4uIHJldHVybiBNeUNsYXNzOyB9KSgpXG4gICAqIGBgYFxuICAgKlxuICAgKiBIZXJlLCB0aGUgaW50ZXJtZWRpYXRlIGBNeUNsYXNzXzFgIGFzc2lnbm1lbnQgaXMgb3B0aW9uYWwuIEluIHRoZSBhYm92ZSBleGFtcGxlLCB0aGVcbiAgICogYGNsYXNzIE15Q2xhc3Mge31gIG5vZGUgaXMgcmV0dXJuZWQgYXMgZGVjbGFyYXRpb24gb2YgYE15Q2xhc3NgLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIG5vZGUgd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIgb3IgaGFzIG5vIHN5bWJvbC5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbEZyb21PdXRlckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBzeW1ib2w7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0Q2xhc3NTeW1ib2xGcm9tSW5uZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlczpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIG9yXG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9ICgoKSA9PiB7IGNsYXNzIE15Q2xhc3Mge30gLi4uIHJldHVybiBNeUNsYXNzOyB9KSgpXG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBleHRyYWN0cyB0aGUgYE5nY2NDbGFzc1N5bWJvbGAgZm9yIGBNeUNsYXNzYCB3aGVuIHByb3ZpZGVkIHdpdGggdGhlIGB2YXIgTXlDbGFzc2BcbiAgICogZGVjbGFyYXRpb24gbm9kZS4gV2hlbiB0aGUgYGNsYXNzIE15Q2xhc3Mge31gIG5vZGUgb3IgYW55IG90aGVyIG5vZGUgaXMgZ2l2ZW4sIHRoaXMgbWV0aG9kIHdpbGxcbiAgICogcmV0dXJuIHVuZGVmaW5lZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgZG9lcyBub3QgcmVwcmVzZW50IGFuIG91dGVyIGRlY2xhcmF0aW9uXG4gICAqIG9mIGEgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NTeW1ib2xGcm9tT3V0ZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIC8vIENyZWF0ZSBhIHN5bWJvbCB3aXRob3V0IGlubmVyIGRlY2xhcmF0aW9uIGlmIGl0IGlzIGEgcmVndWxhciBcInRvcCBsZXZlbFwiIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgIGlmIChpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgaXNUb3BMZXZlbChkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUNsYXNzU3ltYm9sKGRlY2xhcmF0aW9uLCBudWxsKTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIHRoZSBkZWNsYXJhdGlvbiBtYXkgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiwgaW4gd2hpY2ggY2FzZSBpdCBtdXN0IGJlXG4gICAgLy8gaW5pdGlhbGl6ZWQgdXNpbmcgYSBjbGFzcyBleHByZXNzaW9uIGFzIGlubmVyIGRlY2xhcmF0aW9uLlxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pICYmIGhhc05hbWVJZGVudGlmaWVyKGRlY2xhcmF0aW9uKSkge1xuICAgICAgY29uc3QgaW5uZXJEZWNsYXJhdGlvbiA9IGdldElubmVyQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgICBpZiAoaW5uZXJEZWNsYXJhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChkZWNsYXJhdGlvbiwgaW5uZXJEZWNsYXJhdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIHVzaW5nIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVzOlxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogb3JcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gKCgpID0+IHsgY2xhc3MgTXlDbGFzcyB7fSAuLi4gcmV0dXJuIE15Q2xhc3M7IH0pKClcbiAgICogYGBgXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGV4dHJhY3RzIHRoZSBgTmdjY0NsYXNzU3ltYm9sYCBmb3IgYE15Q2xhc3NgIHdoZW4gcHJvdmlkZWQgd2l0aCB0aGVcbiAgICogYGNsYXNzIE15Q2xhc3Mge31gIGRlY2xhcmF0aW9uIG5vZGUuIFdoZW4gdGhlIGB2YXIgTXlDbGFzc2Agbm9kZSBvciBhbnkgb3RoZXIgbm9kZSBpcyBnaXZlbixcbiAgICogdGhpcyBtZXRob2Qgd2lsbCByZXR1cm4gdW5kZWZpbmVkIGluc3RlYWQuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgZGVjbGFyYXRpb24gd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBkb2VzIG5vdCByZXByZXNlbnQgYW4gaW5uZXIgZGVjbGFyYXRpb25cbiAgICogb2YgYSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbEZyb21Jbm5lckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgbGV0IG91dGVyRGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb258dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSAmJiAhaXNUb3BMZXZlbChkZWNsYXJhdGlvbikpIHtcbiAgICAgIGxldCBub2RlID0gZGVjbGFyYXRpb24ucGFyZW50O1xuICAgICAgd2hpbGUgKG5vZGUgIT09IHVuZGVmaW5lZCAmJiAhdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgICAgIH1cbiAgICAgIG91dGVyRGVjbGFyYXRpb24gPSBub2RlO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDbGFzc0V4cHJlc3Npb24oZGVjbGFyYXRpb24pICYmIGhhc05hbWVJZGVudGlmaWVyKGRlY2xhcmF0aW9uKSkge1xuICAgICAgb3V0ZXJEZWNsYXJhdGlvbiA9IGdldFZhcmlhYmxlRGVjbGFyYXRpb25PZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAob3V0ZXJEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8ICFoYXNOYW1lSWRlbnRpZmllcihvdXRlckRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChvdXRlckRlY2xhcmF0aW9uLCBkZWNsYXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBgTmdjY0NsYXNzU3ltYm9sYCBmcm9tIGFuIG91dGVyIGFuZCBpbm5lciBkZWNsYXJhdGlvbi4gSWYgYSBjbGFzcyBvbmx5IGhhcyBhbiBvdXRlclxuICAgKiBkZWNsYXJhdGlvbiwgdGhlIFwiaW1wbGVtZW50YXRpb25cIiBzeW1ib2wgb2YgdGhlIGNyZWF0ZWQgYE5nY2NDbGFzc1N5bWJvbGAgd2lsbCBiZSBzZXQgZXF1YWwgdG9cbiAgICogdGhlIFwiZGVjbGFyYXRpb25cIiBzeW1ib2wuXG4gICAqXG4gICAqIEBwYXJhbSBvdXRlckRlY2xhcmF0aW9uIFRoZSBvdXRlciBkZWNsYXJhdGlvbiBub2RlIG9mIHRoZSBjbGFzcy5cbiAgICogQHBhcmFtIGlubmVyRGVjbGFyYXRpb24gVGhlIGlubmVyIGRlY2xhcmF0aW9uIG5vZGUgb2YgdGhlIGNsYXNzLCBvciB1bmRlZmluZWQgaWYgbm8gaW5uZXJcbiAgICogZGVjbGFyYXRpb24gaXMgcHJlc2VudC5cbiAgICogQHJldHVybnMgdGhlIGBOZ2NjQ2xhc3NTeW1ib2xgIHJlcHJlc2VudGluZyB0aGUgY2xhc3MsIG9yIHVuZGVmaW5lZCBpZiBhIGB0cy5TeW1ib2xgIGZvciBhbnkgb2ZcbiAgICogdGhlIGRlY2xhcmF0aW9ucyBjb3VsZCBub3QgYmUgcmVzb2x2ZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgY3JlYXRlQ2xhc3NTeW1ib2woXG4gICAgICBvdXRlckRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uLCBpbm5lckRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9ufG51bGwpOiBOZ2NjQ2xhc3NTeW1ib2xcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uU3ltYm9sID1cbiAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24ob3V0ZXJEZWNsYXJhdGlvbi5uYW1lKSBhcyBDbGFzc1N5bWJvbCB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZGVjbGFyYXRpb25TeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBsZW1lbnRhdGlvblN5bWJvbCA9IGlubmVyRGVjbGFyYXRpb24gIT09IG51bGwgP1xuICAgICAgICB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpbm5lckRlY2xhcmF0aW9uLm5hbWUpIDpcbiAgICAgICAgZGVjbGFyYXRpb25TeW1ib2w7XG4gICAgaWYgKGltcGxlbWVudGF0aW9uU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY2xhcmF0aW9uU3ltYm9sLm5hbWUsXG4gICAgICBkZWNsYXJhdGlvbjogZGVjbGFyYXRpb25TeW1ib2wsXG4gICAgICBpbXBsZW1lbnRhdGlvbjogaW1wbGVtZW50YXRpb25TeW1ib2wsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gKGZvciBleGFtcGxlLCBvZiBhIGNsYXNzIG9yIGZ1bmN0aW9uKSBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGFueVxuICAgKiBkZWNvcmF0b3JzIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG9yIGZ1bmN0aW9uIG92ZXJcbiAgICogd2hpY2ggdG8gcmVmbGVjdC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBpbnRlbnQgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGFuZCB0aGVcbiAgICogc291cmNlIGlzIGluIEVTNiBmb3JtYXQsIHRoaXMgd2lsbCBiZSBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBub2RlLiBJZiB0aGUgc291cmNlIGlzIGluIEVTNVxuICAgKiBmb3JtYXQsIHRoaXMgbWlnaHQgYmUgYSBgdHMuVmFyaWFibGVEZWNsYXJhdGlvbmAgYXMgY2xhc3NlcyBpbiBFUzUgYXJlIHJlcHJlc2VudGVkIGFzIHRoZVxuICAgKiByZXN1bHQgb2YgYW4gSUlGRSBleGVjdXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBEZWNvcmF0b3JgIG1ldGFkYXRhIGlmIGRlY29yYXRvcnMgYXJlIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLCBvclxuICAgKiBgbnVsbGAgaWYgZWl0aGVyIG5vIGRlY29yYXRvcnMgd2VyZSBwcmVzZW50IG9yIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyBub3Qgb2YgYSBkZWNvcmF0YWJsZSB0eXBlLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgaWYgKCFzeW1ib2wpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBDbGFzc01lbWJlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBtZW1iZXJzIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldE1lbWJlcnNPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHRlZCB0byBnZXQgbWVtYmVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldE1lbWJlcnNPZlN5bWJvbChjbGFzc1N5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgaXRzIHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIG9ubHkgbG9va3MgYXQgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MgZGlyZWN0bHkgYW5kIG5vdCBhdCBhbnkgaW5oZXJpdGVkXG4gICAqIGNvbnN0cnVjdG9ycy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgUGFyYW1ldGVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIHBhcmFtZXRlcnMgb2YgdGhlIGNvbnN0cnVjdG9yLCBpZlxuICAgKiBhIGNvbnN0cnVjdG9yIGV4aXN0cy4gSWYgdGhlIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgaGFzIDAgcGFyYW1ldGVycywgdGhpcyBhcnJheSB3aWxsIGJlIGVtcHR5LlxuICAgKiBJZiB0aGUgY2xhc3MgaGFzIG5vIGNvbnN0cnVjdG9yLCB0aGlzIG1ldGhvZCByZXR1cm5zIGBudWxsYC5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IEN0b3JQYXJhbWV0ZXJbXXxudWxsIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQXR0ZW1wdGVkIHRvIGdldCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgbm9uLWNsYXNzOiBcIiR7Y2xhenouZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIGNvbnN0IHBhcmFtZXRlck5vZGVzID0gdGhpcy5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbCk7XG4gICAgaWYgKHBhcmFtZXRlck5vZGVzKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhjbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXMpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGhhc0Jhc2VDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHN1cGVySGFzQmFzZUNsYXNzID0gc3VwZXIuaGFzQmFzZUNsYXNzKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJIYXNCYXNlQ2xhc3MpIHtcbiAgICAgIHJldHVybiBzdXBlckhhc0Jhc2VDbGFzcztcbiAgICB9XG5cbiAgICBjb25zdCBpbm5lckNsYXNzRGVjbGFyYXRpb24gPSBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24oY2xhenopO1xuICAgIGlmIChpbm5lckNsYXNzRGVjbGFyYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIuaGFzQmFzZUNsYXNzKGlubmVyQ2xhc3NEZWNsYXJhdGlvbik7XG4gIH1cblxuICBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBGaXJzdCB0cnkgZ2V0dGluZyB0aGUgYmFzZSBjbGFzcyBmcm9tIHRoZSBcIm91dGVyXCIgZGVjbGFyYXRpb25cbiAgICBjb25zdCBzdXBlckJhc2VDbGFzc0lkZW50aWZpZXIgPSBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyKSB7XG4gICAgICByZXR1cm4gc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyO1xuICAgIH1cbiAgICAvLyBUaGF0IGRpZG4ndCB3b3JrIHNvIG5vdyB0cnkgZ2V0dGluZyBpdCBmcm9tIHRoZSBcImlubmVyXCIgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgaW5uZXJDbGFzc0RlY2xhcmF0aW9uID0gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoaW5uZXJDbGFzc0RlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmdldEJhc2VDbGFzc0V4cHJlc3Npb24oaW5uZXJDbGFzc0RlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBub2RlIGFjdHVhbGx5IHJlcHJlc2VudHMgYSBjbGFzcy5cbiAgICovXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgcmV0dXJuIHN1cGVyLmlzQ2xhc3Mobm9kZSkgfHwgdGhpcy5nZXRDbGFzc1N5bWJvbChub2RlKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWNlIGFuIGlkZW50aWZpZXIgdG8gaXRzIGRlY2xhcmF0aW9uLCBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYXR0ZW1wdHMgdG8gcmVzb2x2ZSB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGdpdmVuIGlkZW50aWZpZXIsIHRyYWNpbmcgYmFjayB0aHJvdWdoXG4gICAqIGltcG9ydHMgYW5kIHJlLWV4cG9ydHMgdW50aWwgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIHN0YXRlbWVudCBpcyBmb3VuZC4gQSBgRGVjbGFyYXRpb25gXG4gICAqIG9iamVjdCBpcyByZXR1cm5lZCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYCBpcyByZXR1cm5lZCBvdGhlcndpc2UuXG4gICAqXG4gICAqIEluIEVTMjAxNSwgd2UgbmVlZCB0byBhY2NvdW50IGZvciBpZGVudGlmaWVycyB0aGF0IHJlZmVyIHRvIGFsaWFzZWQgY2xhc3MgZGVjbGFyYXRpb25zIHN1Y2ggYXNcbiAgICogYE15Q2xhc3NfMWAuIFNpbmNlIHN1Y2ggZGVjbGFyYXRpb25zIGFyZSBvbmx5IGF2YWlsYWJsZSB3aXRoaW4gdGhlIG1vZHVsZSBpdHNlbGYsIHdlIG5lZWQgdG9cbiAgICogZmluZCB0aGUgb3JpZ2luYWwgY2xhc3MgZGVjbGFyYXRpb24sIGUuZy4gYE15Q2xhc3NgLCB0aGF0IGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgYWxpYXNlZCBvbmUuXG4gICAqXG4gICAqIEBwYXJhbSBpZCBhIFR5cGVTY3JpcHQgYHRzLklkZW50aWZpZXJgIHRvIHRyYWNlIGJhY2sgdG8gYSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgbWV0YWRhdGEgYWJvdXQgdGhlIGBEZWNsYXJhdGlvbmAgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBzdXBlckRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuXG4gICAgLy8gSWYgbm8gZGVjbGFyYXRpb24gd2FzIGZvdW5kIG9yIGl0J3MgYW4gaW5saW5lIGRlY2xhcmF0aW9uLCByZXR1cm4gYXMgaXMuXG4gICAgaWYgKHN1cGVyRGVjbGFyYXRpb24gPT09IG51bGwgfHwgc3VwZXJEZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgZGVjbGFyYXRpb24gYWxyZWFkeSBoYXMgdHJhaXRzIGFzc2lnbmVkIHRvIGl0LCByZXR1cm4gYXMgaXMuXG4gICAgaWYgKHN1cGVyRGVjbGFyYXRpb24ua25vd24gIT09IG51bGwgfHwgc3VwZXJEZWNsYXJhdGlvbi5pZGVudGl0eSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHN1cGVyRGVjbGFyYXRpb247XG4gICAgfVxuXG4gICAgLy8gVGhlIGlkZW50aWZpZXIgbWF5IGhhdmUgYmVlbiBvZiBhbiBhZGRpdGlvbmFsIGNsYXNzIGFzc2lnbm1lbnQgc3VjaCBhcyBgTXlDbGFzc18xYCB0aGF0IHdhc1xuICAgIC8vIHByZXNlbnQgYXMgYWxpYXMgZm9yIGBNeUNsYXNzYC4gSWYgc28sIHJlc29sdmUgc3VjaCBhbGlhc2VzIHRvIHRoZWlyIG9yaWdpbmFsIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gdGhpcy5yZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihzdXBlckRlY2xhcmF0aW9uLm5vZGUpO1xuICAgIGlmIChhbGlhc2VkSWRlbnRpZmllciAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoYWxpYXNlZElkZW50aWZpZXIpO1xuICAgIH1cblxuICAgIC8vIFZhcmlhYmxlIGRlY2xhcmF0aW9ucyBtYXkgcmVwcmVzZW50IGFuIGVudW0gZGVjbGFyYXRpb24sIHNvIGF0dGVtcHQgdG8gcmVzb2x2ZSBpdHMgbWVtYmVycy5cbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHN1cGVyRGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgIGNvbnN0IGVudW1NZW1iZXJzID0gdGhpcy5yZXNvbHZlRW51bU1lbWJlcnMoc3VwZXJEZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgIGlmIChlbnVtTWVtYmVycyAhPT0gbnVsbCkge1xuICAgICAgICBzdXBlckRlY2xhcmF0aW9uLmlkZW50aXR5ID0ge2tpbmQ6IFNwZWNpYWxEZWNsYXJhdGlvbktpbmQuRG93bmxldmVsZWRFbnVtLCBlbnVtTWVtYmVyc307XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1cGVyRGVjbGFyYXRpb247XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhbGwgZGVjb3JhdG9ycyBvZiB0aGUgZ2l2ZW4gY2xhc3Mgc3ltYm9sLiBBbnkgZGVjb3JhdG9yIHRoYXQgaGF2ZSBiZWVuIHN5bnRoZXRpY2FsbHlcbiAgICogaW5qZWN0ZWQgYnkgYSBtaWdyYXRpb24gd2lsbCBub3QgYmUgcHJlc2VudCBpbiB0aGUgcmV0dXJuZWQgY29sbGVjdGlvbi5cbiAgICovXG4gIGdldERlY29yYXRvcnNPZlN5bWJvbChzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IHtjbGFzc0RlY29yYXRvcnN9ID0gdGhpcy5hY3F1aXJlRGVjb3JhdG9ySW5mbyhzeW1ib2wpO1xuICAgIGlmIChjbGFzc0RlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFJldHVybiBhIGNsb25lIG9mIHRoZSBhcnJheSB0byBwcmV2ZW50IGNvbnN1bWVycyBmcm9tIG11dGF0aW5nIHRoZSBjYWNoZS5cbiAgICByZXR1cm4gQXJyYXkuZnJvbShjbGFzc0RlY29yYXRvcnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCB0aGUgZ2l2ZW4gbW9kdWxlIGZvciB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgaW4gd2hpY2ggdGhlIGluaXRpYWxpemVyXG4gICAqIGlzIGFuIGlkZW50aWZpZXIgbWFya2VkIHdpdGggdGhlIGBQUkVfUjNfTUFSS0VSYC5cbiAgICogQHBhcmFtIG1vZHVsZSB0aGUgbW9kdWxlIGluIHdoaWNoIHRvIHNlYXJjaCBmb3Igc3dpdGNoYWJsZSBkZWNsYXJhdGlvbnMuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyB0aGF0IG1hdGNoLlxuICAgKi9cbiAgZ2V0U3dpdGNoYWJsZURlY2xhcmF0aW9ucyhtb2R1bGU6IHRzLk5vZGUpOiBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbltdIHtcbiAgICAvLyBEb24ndCBib3RoZXIgdG8gd2FsayB0aGUgQVNUIGlmIHRoZSBtYXJrZXIgaXMgbm90IGZvdW5kIGluIHRoZSB0ZXh0XG4gICAgcmV0dXJuIG1vZHVsZS5nZXRUZXh0KCkuaW5kZXhPZihQUkVfUjNfTUFSS0VSKSA+PSAwID9cbiAgICAgICAgZmluZEFsbChtb2R1bGUsIGlzU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb24pIDpcbiAgICAgICAgW107XG4gIH1cblxuICBnZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCB2YWx1ZSA9IHN1cGVyLmdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb24pO1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIC8vIFdlIGhhdmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB0aGF0IGhhcyBubyBpbml0aWFsaXplci4gRm9yIGV4YW1wbGU6XG4gICAgLy9cbiAgICAvLyBgYGBcbiAgICAvLyB2YXIgSHR0cENsaWVudFhzcmZNb2R1bGVfMTtcbiAgICAvLyBgYGBcbiAgICAvL1xuICAgIC8vIFNvIGxvb2sgZm9yIHRoZSBzcGVjaWFsIHNjZW5hcmlvIHdoZXJlIHRoZSB2YXJpYWJsZSBpcyBiZWluZyBhc3NpZ25lZCBpblxuICAgIC8vIGEgbmVhcmJ5IHN0YXRlbWVudCB0byB0aGUgcmV0dXJuIHZhbHVlIG9mIGEgY2FsbCB0byBgX19kZWNvcmF0ZWAuXG4gICAgLy8gVGhlbiBmaW5kIHRoZSAybmQgYXJndW1lbnQgb2YgdGhhdCBjYWxsLCB0aGUgXCJ0YXJnZXRcIiwgd2hpY2ggd2lsbCBiZSB0aGVcbiAgICAvLyBhY3R1YWwgY2xhc3MgaWRlbnRpZmllci4gRm9yIGV4YW1wbGU6XG4gICAgLy9cbiAgICAvLyBgYGBcbiAgICAvLyBIdHRwQ2xpZW50WHNyZk1vZHVsZSA9IEh0dHBDbGllbnRYc3JmTW9kdWxlXzEgPSB0c2xpYl8xLl9fZGVjb3JhdGUoW1xuICAgIC8vICAgTmdNb2R1bGUoe1xuICAgIC8vICAgICBwcm92aWRlcnM6IFtdLFxuICAgIC8vICAgfSlcbiAgICAvLyBdLCBIdHRwQ2xpZW50WHNyZk1vZHVsZSk7XG4gICAgLy8gYGBgXG4gICAgLy9cbiAgICAvLyBBbmQgZmluYWxseSwgZmluZCB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGlkZW50aWZpZXIgaW4gdGhhdCBhcmd1bWVudC5cbiAgICAvLyBOb3RlIGFsc28gdGhhdCB0aGUgYXNzaWdubWVudCBjYW4gb2NjdXIgd2l0aGluIGFub3RoZXIgYXNzaWdubWVudC5cbiAgICAvL1xuICAgIGNvbnN0IGJsb2NrID0gZGVjbGFyYXRpb24ucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZGVjbGFyYXRpb24ubmFtZSk7XG4gICAgaWYgKHN5bWJvbCAmJiAodHMuaXNCbG9jayhibG9jaykgfHwgdHMuaXNTb3VyY2VGaWxlKGJsb2NrKSkpIHtcbiAgICAgIGNvbnN0IGRlY29yYXRlQ2FsbCA9IHRoaXMuZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUoYmxvY2ssIHN5bWJvbCk7XG4gICAgICBjb25zdCB0YXJnZXQgPSBkZWNvcmF0ZUNhbGwgJiYgZGVjb3JhdGVDYWxsLmFyZ3VtZW50c1sxXTtcbiAgICAgIGlmICh0YXJnZXQgJiYgdHMuaXNJZGVudGlmaWVyKHRhcmdldCkpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0U3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24odGFyZ2V0KTtcbiAgICAgICAgY29uc3QgdGFyZ2V0RGVjbGFyYXRpb24gPSB0YXJnZXRTeW1ib2wgJiYgdGFyZ2V0U3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgICAgIGlmICh0YXJnZXREZWNsYXJhdGlvbikge1xuICAgICAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pIHx8XG4gICAgICAgICAgICAgIHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbih0YXJnZXREZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIC8vIFRoZSB0YXJnZXQgaXMganVzdCBhIGZ1bmN0aW9uIG9yIGNsYXNzIGRlY2xhcmF0aW9uXG4gICAgICAgICAgICAvLyBzbyByZXR1cm4gaXRzIGlkZW50aWZpZXIgYXMgdGhlIHZhcmlhYmxlIHZhbHVlLlxuICAgICAgICAgICAgcmV0dXJuIHRhcmdldERlY2xhcmF0aW9uLm5hbWUgfHwgbnVsbDtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbih0YXJnZXREZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgIC8vIFRoZSB0YXJnZXQgaXMgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiwgc28gZmluZCB0aGUgZmFyIHJpZ2h0IGV4cHJlc3Npb24sXG4gICAgICAgICAgICAvLyBpbiB0aGUgY2FzZSBvZiBtdWx0aXBsZSBhc3NpZ25tZW50cyAoZS5nLiBgdmFyMSA9IHZhcjIgPSB2YWx1ZWApLlxuICAgICAgICAgICAgbGV0IHRhcmdldFZhbHVlID0gdGFyZ2V0RGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgICB3aGlsZSAodGFyZ2V0VmFsdWUgJiYgaXNBc3NpZ25tZW50KHRhcmdldFZhbHVlKSkge1xuICAgICAgICAgICAgICB0YXJnZXRWYWx1ZSA9IHRhcmdldFZhbHVlLnJpZ2h0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRhcmdldFZhbHVlKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0YXJnZXRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdG9wLWxldmVsIGNsYXNzIHN5bWJvbHMgaW4gdGhlIGdpdmVuIGZpbGUuXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBzb3VyY2UgZmlsZSB0byBzZWFyY2ggZm9yIGNsYXNzZXMuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGNsYXNzIHN5bWJvbHMuXG4gICAqL1xuICBmaW5kQ2xhc3NTeW1ib2xzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBOZ2NjQ2xhc3NTeW1ib2xbXSB7XG4gICAgY29uc3QgY2xhc3NlczogTmdjY0NsYXNzU3ltYm9sW10gPSBbXTtcbiAgICB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSkuZm9yRWFjaChzdGF0ZW1lbnQgPT4ge1xuICAgICAgaWYgKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pO1xuICAgICAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKGNsYXNzU3ltYm9sKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RhdGVtZW50KSkge1xuICAgICAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woc3RhdGVtZW50KTtcbiAgICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgICAgY2xhc3Nlcy5wdXNoKGNsYXNzU3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBjbGFzc2VzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbnVtYmVyIG9mIGdlbmVyaWMgdHlwZSBwYXJhbWV0ZXJzIG9mIGEgZ2l2ZW4gY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgdGhlIG51bWJlciBvZiB0eXBlIHBhcmFtZXRlcnMgb2YgdGhlIGNsYXNzLCBpZiBrbm93biwgb3IgYG51bGxgIGlmIHRoZSBkZWNsYXJhdGlvblxuICAgKiBpcyBub3QgYSBjbGFzcyBvciBoYXMgYW4gdW5rbm93biBudW1iZXIgb2YgdHlwZSBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IG51bWJlcnxudWxsIHtcbiAgICBjb25zdCBkdHNEZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RHRzRGVjbGFyYXRpb24oY2xhenopO1xuICAgIGlmIChkdHNEZWNsYXJhdGlvbiAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24oZHRzRGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gZHRzRGVjbGFyYXRpb24udHlwZVBhcmFtZXRlcnMgPyBkdHNEZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycy5sZW5ndGggOiAwO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlIGFuIGV4cG9ydGVkIGRlY2xhcmF0aW9uIG9mIGEgY2xhc3MgKG1heWJlIGRvd24tbGV2ZWxlZCB0byBhIHZhcmlhYmxlKSBhbmQgbG9vayB1cCB0aGVcbiAgICogZGVjbGFyYXRpb24gb2YgaXRzIHR5cGUgaW4gYSBzZXBhcmF0ZSAuZC50cyB0cmVlLlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIGlzIGFsbG93ZWQgdG8gcmV0dXJuIGBudWxsYCBpZiB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IGRvZXMgbm90IGhhdmUgYVxuICAgKiBzZXBhcmF0ZSAuZC50cyB0cmVlLiBXaGVuIGNvbXBpbGluZyBUeXBlU2NyaXB0IGNvZGUgdGhpcyBpcyBhbHdheXMgdGhlIGNhc2UsIHNpbmNlIC5kLnRzIGZpbGVzXG4gICAqIGFyZSBwcm9kdWNlZCBvbmx5IGR1cmluZyB0aGUgZW1pdCBvZiBzdWNoIGEgY29tcGlsYXRpb24uIFdoZW4gY29tcGlsaW5nIC5qcyBjb2RlLCBob3dldmVyLFxuICAgKiB0aGVyZSBpcyBmcmVxdWVudGx5IGEgcGFyYWxsZWwgLmQudHMgdHJlZSB3aGljaCB0aGlzIG1ldGhvZCBleHBvc2VzLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgdGhlIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCByZXR1cm5lZCBmcm9tIHRoaXMgZnVuY3Rpb24gbWF5IG5vdCBiZSBmcm9tIHRoZSBzYW1lXG4gICAqIGB0cy5Qcm9ncmFtYCBhcyB0aGUgaW5wdXQgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXREdHNEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNsYXJhdGlvbnxudWxsIHtcbiAgICBpZiAodGhpcy5kdHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAoIWlzTmFtZWREZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGdldCB0aGUgZHRzIGZpbGUgZm9yIGEgZGVjbGFyYXRpb24gdGhhdCBoYXMgbm8gbmFtZTogJHtcbiAgICAgICAgICBkZWNsYXJhdGlvbi5nZXRUZXh0KCl9IGluICR7ZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfWApO1xuICAgIH1cblxuICAgIC8vIFRyeSB0byByZXRyaWV2ZSB0aGUgZHRzIGRlY2xhcmF0aW9uIGZyb20gdGhlIHB1YmxpYyBtYXBcbiAgICBpZiAodGhpcy5wdWJsaWNEdHNEZWNsYXJhdGlvbk1hcCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5wdWJsaWNEdHNEZWNsYXJhdGlvbk1hcCA9IHRoaXMuY29tcHV0ZVB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwKHRoaXMuc3JjLCB0aGlzLmR0cyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwLmhhcyhkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0R0c0RlY2xhcmF0aW9uTWFwLmdldChkZWNsYXJhdGlvbikhO1xuICAgIH1cblxuICAgIC8vIE5vIHB1YmxpYyBleHBvcnQsIHRyeSB0aGUgcHJpdmF0ZSBtYXBcbiAgICBpZiAodGhpcy5wcml2YXRlRHRzRGVjbGFyYXRpb25NYXAgPT09IG51bGwpIHtcbiAgICAgIHRoaXMucHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwID0gdGhpcy5jb21wdXRlUHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwKHRoaXMuc3JjLCB0aGlzLmR0cyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnByaXZhdGVEdHNEZWNsYXJhdGlvbk1hcC5oYXMoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5wcml2YXRlRHRzRGVjbGFyYXRpb25NYXAuZ2V0KGRlY2xhcmF0aW9uKSE7XG4gICAgfVxuXG4gICAgLy8gTm8gZGVjbGFyYXRpb24gZm91bmQgYXQgYWxsXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBzb3VyY2UgZmlsZSBmb3IgZXhwb3J0ZWQgZnVuY3Rpb25zIGFuZCBzdGF0aWMgY2xhc3MgbWV0aG9kcyB0aGF0IHJldHVyblxuICAgKiBNb2R1bGVXaXRoUHJvdmlkZXJzIG9iamVjdHMuXG4gICAqIEBwYXJhbSBmIFRoZSBzb3VyY2UgZmlsZSB0byBzZWFyY2ggZm9yIHRoZXNlIGZ1bmN0aW9uc1xuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBmdW5jdGlvbiBkZWNsYXJhdGlvbnMgdGhhdCBsb29rIGxpa2UgdGhleSByZXR1cm4gTW9kdWxlV2l0aFByb3ZpZGVyc1xuICAgKiBvYmplY3RzLlxuICAgKi9cbiAgZ2V0TW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9ucyhmOiB0cy5Tb3VyY2VGaWxlKTogTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uW10ge1xuICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShmKTtcbiAgICBpZiAoIWV4cG9ydHMpIHJldHVybiBbXTtcbiAgICBjb25zdCBpbmZvczogTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uW10gPSBbXTtcbiAgICBleHBvcnRzLmZvckVhY2goKGRlY2xhcmF0aW9uLCBuYW1lKSA9PiB7XG4gICAgICBpZiAoZGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5pc0NsYXNzKGRlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICAgIHRoaXMuZ2V0TWVtYmVyc09mQ2xhc3MoZGVjbGFyYXRpb24ubm9kZSkuZm9yRWFjaChtZW1iZXIgPT4ge1xuICAgICAgICAgIGlmIChtZW1iZXIuaXNTdGF0aWMpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSB0aGlzLnBhcnNlRm9yTW9kdWxlV2l0aFByb3ZpZGVycyhcbiAgICAgICAgICAgICAgICBtZW1iZXIubmFtZSwgbWVtYmVyLm5vZGUsIG1lbWJlci5pbXBsZW1lbnRhdGlvbiwgZGVjbGFyYXRpb24ubm9kZSk7XG4gICAgICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgICAgICBpbmZvcy5wdXNoKGluZm8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaXNOYW1lZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICAgICAgY29uc3QgaW5mbyA9XG4gICAgICAgICAgICAgIHRoaXMucGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKGRlY2xhcmF0aW9uLm5vZGUubmFtZS50ZXh0LCBkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgICAgaW5mb3MucHVzaChpbmZvKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gaW5mb3M7XG4gIH1cblxuICBnZXRFbmRPZkNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiB0cy5Ob2RlIHtcbiAgICBsZXQgbGFzdDogdHMuTm9kZSA9IGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG5cbiAgICAvLyBJZiB0aGVyZSBhcmUgc3RhdGljIG1lbWJlcnMgb24gdGhpcyBjbGFzcyB0aGVuIGZpbmQgdGhlIGxhc3Qgb25lXG4gICAgaWYgKGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cy5mb3JFYWNoKGV4cG9ydFN5bWJvbCA9PiB7XG4gICAgICAgIGlmIChleHBvcnRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGdldENvbnRhaW5pbmdTdGF0ZW1lbnQoZXhwb3J0U3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICBpZiAoZXhwb3J0U3RhdGVtZW50ICE9PSBudWxsICYmIGxhc3QuZ2V0RW5kKCkgPCBleHBvcnRTdGF0ZW1lbnQuZ2V0RW5kKCkpIHtcbiAgICAgICAgICBsYXN0ID0gZXhwb3J0U3RhdGVtZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBhcmUgaGVscGVyIGNhbGxzIGZvciB0aGlzIGNsYXNzIHRoZW4gZmluZCB0aGUgbGFzdCBvbmVcbiAgICBjb25zdCBoZWxwZXJzID0gdGhpcy5nZXRIZWxwZXJDYWxsc0ZvckNsYXNzKFxuICAgICAgICBjbGFzc1N5bWJvbCwgWydfX2RlY29yYXRlJywgJ19fZXh0ZW5kcycsICdfX3BhcmFtJywgJ19fbWV0YWRhdGEnXSk7XG4gICAgaGVscGVycy5mb3JFYWNoKGhlbHBlciA9PiB7XG4gICAgICBjb25zdCBoZWxwZXJTdGF0ZW1lbnQgPSBnZXRDb250YWluaW5nU3RhdGVtZW50KGhlbHBlcik7XG4gICAgICBpZiAoaGVscGVyU3RhdGVtZW50ICE9PSBudWxsICYmIGxhc3QuZ2V0RW5kKCkgPCBoZWxwZXJTdGF0ZW1lbnQuZ2V0RW5kKCkpIHtcbiAgICAgICAgbGFzdCA9IGhlbHBlclN0YXRlbWVudDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBsYXN0O1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYSBgRGVjbGFyYXRpb25gIGNvcnJlc3BvbmRzIHdpdGggYSBrbm93biBkZWNsYXJhdGlvbiwgc3VjaCBhcyBgT2JqZWN0YCwgYW5kIHNldFxuICAgKiBpdHMgYGtub3duYCBwcm9wZXJ0eSB0byB0aGUgYXBwcm9wcmlhdGUgYEtub3duRGVjbGFyYXRpb25gLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbCBUaGUgYERlY2xhcmF0aW9uYCB0byBjaGVjay5cbiAgICogQHJldHVybiBUaGUgcGFzc2VkIGluIGBEZWNsYXJhdGlvbmAgKHBvdGVudGlhbGx5IGVuaGFuY2VkIHdpdGggYSBgS25vd25EZWNsYXJhdGlvbmApLlxuICAgKi9cbiAgZGV0ZWN0S25vd25EZWNsYXJhdGlvbihkZWNsOiBudWxsKTogbnVsbDtcbiAgZGV0ZWN0S25vd25EZWNsYXJhdGlvbjxUIGV4dGVuZHMgRGVjbGFyYXRpb24+KGRlY2w6IFQpOiBUO1xuICBkZXRlY3RLbm93bkRlY2xhcmF0aW9uPFQgZXh0ZW5kcyBEZWNsYXJhdGlvbj4oZGVjbDogVHxudWxsKTogVHxudWxsO1xuICBkZXRlY3RLbm93bkRlY2xhcmF0aW9uPFQgZXh0ZW5kcyBEZWNsYXJhdGlvbj4oZGVjbDogVHxudWxsKTogVHxudWxsIHtcbiAgICBpZiAoZGVjbCAhPT0gbnVsbCAmJiBkZWNsLmtub3duID09PSBudWxsICYmIHRoaXMuaXNKYXZhU2NyaXB0T2JqZWN0RGVjbGFyYXRpb24oZGVjbCkpIHtcbiAgICAgIC8vIElmIHRoZSBpZGVudGlmaWVyIHJlc29sdmVzIHRvIHRoZSBnbG9iYWwgSmF2YVNjcmlwdCBgT2JqZWN0YCwgdXBkYXRlIHRoZSBkZWNsYXJhdGlvbiB0b1xuICAgICAgLy8gZGVub3RlIGl0IGFzIHRoZSBrbm93biBgSnNHbG9iYWxPYmplY3RgIGRlY2xhcmF0aW9uLlxuICAgICAgZGVjbC5rbm93biA9IEtub3duRGVjbGFyYXRpb24uSnNHbG9iYWxPYmplY3Q7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY2w7XG4gIH1cblxuXG4gIC8vLy8vLy8vLy8vLy8gUHJvdGVjdGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGEgYHRzLlN5bWJvbGAgdG8gaXRzIGRlY2xhcmF0aW9uIGFuZCBkZXRlY3Qgd2hldGhlciBpdCBjb3JyZXNwb25kcyB3aXRoIGEga25vd25cbiAgICogZGVjbGFyYXRpb24uXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0RGVjbGFyYXRpb25PZlN5bWJvbChzeW1ib2w6IHRzLlN5bWJvbCwgb3JpZ2luYWxJZDogdHMuSWRlbnRpZmllcnxudWxsKTogRGVjbGFyYXRpb25cbiAgICAgIHxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5kZXRlY3RLbm93bkRlY2xhcmF0aW9uKHN1cGVyLmdldERlY2xhcmF0aW9uT2ZTeW1ib2woc3ltYm9sLCBvcmlnaW5hbElkKSk7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgdGhlIGlkZW50aWZpZXIgb2YgdGhlIGFjdHVhbCBjbGFzcyBkZWNsYXJhdGlvbiBmb3IgYSBwb3RlbnRpYWxseSBhbGlhc2VkIGRlY2xhcmF0aW9uIG9mIGFcbiAgICogY2xhc3MuXG4gICAqXG4gICAqIElmIHRoZSBnaXZlbiBkZWNsYXJhdGlvbiBpcyBmb3IgYW4gYWxpYXMgb2YgYSBjbGFzcywgdGhpcyBmdW5jdGlvbiB3aWxsIGRldGVybWluZSBhbiBpZGVudGlmaWVyXG4gICAqIHRvIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiB0aGF0IHJlcHJlc2VudHMgdGhpcyBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIFRoZSBkZWNsYXJhdGlvbiB0byByZXNvbHZlLlxuICAgKiBAcmV0dXJucyBUaGUgb3JpZ2luYWwgaWRlbnRpZmllciB0aGF0IHRoZSBnaXZlbiBjbGFzcyBkZWNsYXJhdGlvbiByZXNvbHZlcyB0bywgb3IgYHVuZGVmaW5lZGBcbiAgICogaWYgdGhlIGRlY2xhcmF0aW9uIGRvZXMgbm90IHJlcHJlc2VudCBhbiBhbGlhc2VkIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmVBbGlhc2VkQ2xhc3NJZGVudGlmaWVyKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gICAgdGhpcy5lbnN1cmVQcmVwcm9jZXNzZWQoZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpKTtcbiAgICByZXR1cm4gdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuaGFzKGRlY2xhcmF0aW9uKSA/XG4gICAgICAgIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLmdldChkZWNsYXJhdGlvbikhIDpcbiAgICAgICAgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmVzIHRoYXQgdGhlIHNvdXJjZSBmaWxlIHRoYXQgYG5vZGVgIGlzIHBhcnQgb2YgaGFzIGJlZW4gcHJlcHJvY2Vzc2VkLlxuICAgKlxuICAgKiBEdXJpbmcgcHJlcHJvY2Vzc2luZywgYWxsIHN0YXRlbWVudHMgaW4gdGhlIHNvdXJjZSBmaWxlIHdpbGwgYmUgdmlzaXRlZCBzdWNoIHRoYXQgY2VydGFpblxuICAgKiBwcm9jZXNzaW5nIHN0ZXBzIGNhbiBiZSBkb25lIHVwLWZyb250IGFuZCBjYWNoZWQgZm9yIHN1YnNlcXVlbnQgdXNhZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgc291cmNlIGZpbGUgdGhhdCBuZWVkcyB0byBoYXZlIGdvbmUgdGhyb3VnaCBwcmVwcm9jZXNzaW5nLlxuICAgKi9cbiAgcHJvdGVjdGVkIGVuc3VyZVByZXByb2Nlc3NlZChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnByZXByb2Nlc3NlZFNvdXJjZUZpbGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgdGhpcy5wcmVwcm9jZXNzZWRTb3VyY2VGaWxlcy5hZGQoc291cmNlRmlsZSk7XG5cbiAgICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKSkge1xuICAgICAgICB0aGlzLnByZXByb2Nlc3NTdGF0ZW1lbnQoc3RhdGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbHl6ZXMgdGhlIGdpdmVuIHN0YXRlbWVudCB0byBzZWUgaWYgaXQgY29ycmVzcG9uZHMgd2l0aCBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGxpa2VcbiAgICogYGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtgLiBJZiBzbywgdGhlIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzXzFgXG4gICAqIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgYE15Q2xhc3NgIGlkZW50aWZpZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgVGhlIHN0YXRlbWVudCB0aGF0IG5lZWRzIHRvIGJlIHByZXByb2Nlc3NlZC5cbiAgICovXG4gIHByb3RlY3RlZCBwcmVwcm9jZXNzU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucztcbiAgICBpZiAoZGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gZGVjbGFyYXRpb25zWzBdO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbGFyYXRpb24ubmFtZSkgfHwgIWluaXRpYWxpemVyIHx8ICFpc0Fzc2lnbm1lbnQoaW5pdGlhbGl6ZXIpIHx8XG4gICAgICAgICF0cy5pc0lkZW50aWZpZXIoaW5pdGlhbGl6ZXIubGVmdCkgfHwgIXRoaXMuaXNDbGFzcyhkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhbGlhc2VkSWRlbnRpZmllciA9IGluaXRpYWxpemVyLmxlZnQ7XG5cbiAgICBjb25zdCBhbGlhc2VkRGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGFsaWFzZWRJZGVudGlmaWVyKTtcbiAgICBpZiAoYWxpYXNlZERlY2xhcmF0aW9uID09PSBudWxsIHx8IGFsaWFzZWREZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVuYWJsZSB0byBsb2NhdGUgZGVjbGFyYXRpb24gb2YgJHthbGlhc2VkSWRlbnRpZmllci50ZXh0fSBpbiBcIiR7c3RhdGVtZW50LmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICB0aGlzLmFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucy5zZXQoYWxpYXNlZERlY2xhcmF0aW9uLm5vZGUsIGRlY2xhcmF0aW9uLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIGEgbW9kdWxlLlxuICAgKlxuICAgKiBJbiBFUzUgYW5kIEVTMjAxNSB0aGlzIGlzIGp1c3QgdGhlIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIG9mIHRoZSBmaWxlLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgbW9kdWxlIHdob3NlIHN0YXRlbWVudHMgd2Ugd2FudC5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIHRoZSBnaXZlbiBtb2R1bGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHNvdXJjZUZpbGUuc3RhdGVtZW50cyk7XG4gIH1cblxuICAvKipcbiAgICogV2FsayB0aGUgQVNUIGxvb2tpbmcgZm9yIGFuIGFzc2lnbm1lbnQgdG8gdGhlIHNwZWNpZmllZCBzeW1ib2wuXG4gICAqIEBwYXJhbSBub2RlIFRoZSBjdXJyZW50IG5vZGUgd2UgYXJlIHNlYXJjaGluZy5cbiAgICogQHJldHVybnMgYW4gZXhwcmVzc2lvbiB0aGF0IHJlcHJlc2VudHMgdGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZSwgb3IgdW5kZWZpbmVkIGlmIG5vbmUgY2FuIGJlXG4gICAqIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKG5vZGU6IHRzLk5vZGV8dW5kZWZpbmVkLCBzeW1ib2w6IHRzLlN5bWJvbCk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIG5vZGUub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICBjb25zdCBsZWZ0ID0gbm9kZS5sZWZ0O1xuICAgICAgY29uc3QgcmlnaHQgPSBub2RlLnJpZ2h0O1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihsZWZ0KSAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihsZWZ0KSA9PT0gc3ltYm9sKSB7XG4gICAgICAgIHJldHVybiAodHMuaXNDYWxsRXhwcmVzc2lvbihyaWdodCkgJiYgZ2V0Q2FsbGVlTmFtZShyaWdodCkgPT09ICdfX2RlY29yYXRlJykgPyByaWdodCA6IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShyaWdodCwgc3ltYm9sKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGUuZm9yRWFjaENoaWxkKG5vZGUgPT4gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShub2RlLCBzeW1ib2wpKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byByZXRyaWV2ZSB0aGUgc3ltYm9sIG9mIGEgc3RhdGljIHByb3BlcnR5IG9uIGEgY2xhc3MuXG4gICAqXG4gICAqIEluIHNvbWUgY2FzZXMsIGEgc3RhdGljIHByb3BlcnR5IGNhbiBlaXRoZXIgYmUgc2V0IG9uIHRoZSBpbm5lciBkZWNsYXJhdGlvbiBpbnNpZGUgdGhlIGNsYXNzJ1xuICAgKiBJSUZFLCBvciBpdCBjYW4gYmUgc2V0IG9uIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbi4gVGhlcmVmb3JlLCB0aGUgaG9zdCBjaGVja3MgYm90aFxuICAgKiBwbGFjZXMsIGZpcnN0IGxvb2tpbmcgdXAgdGhlIHByb3BlcnR5IG9uIHRoZSBpbm5lciBzeW1ib2wsIGFuZCBpZiB0aGUgcHJvcGVydHkgaXMgbm90IGZvdW5kIGl0XG4gICAqIHdpbGwgZmFsbCBiYWNrIHRvIGxvb2tpbmcgdXAgdGhlIHByb3BlcnR5IG9uIHRoZSBvdXRlciBzeW1ib2wuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIGNsYXNzIHdob3NlIHByb3BlcnR5IHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gcHJvcGVydHlOYW1lIHRoZSBuYW1lIG9mIHN0YXRpYyBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBpZiBpdCBpcyBmb3VuZCBvciBgdW5kZWZpbmVkYCBpZiBub3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0U3RhdGljUHJvcGVydHkoc3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIHByb3BlcnR5TmFtZTogdHMuX19TdHJpbmcpOiB0cy5TeW1ib2xcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIHJldHVybiBzeW1ib2wuaW1wbGVtZW50YXRpb24uZXhwb3J0cyAmJiBzeW1ib2wuaW1wbGVtZW50YXRpb24uZXhwb3J0cy5nZXQocHJvcGVydHlOYW1lKSB8fFxuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cyAmJiBzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cy5nZXQocHJvcGVydHlOYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGZvciBvYnRhaW5pbmcgaW5mb3JtYXRpb24gb24gdGhlIGRlY29yYXRvcnMgb2YgYSBnaXZlbiBjbGFzcy4gVGhpc1xuICAgKiBpbmZvcm1hdGlvbiBpcyBjb21wdXRlZCBlaXRoZXIgZnJvbSBzdGF0aWMgcHJvcGVydGllcyBpZiBwcmVzZW50LCBvciB1c2luZyBgdHNsaWIuX19kZWNvcmF0ZWBcbiAgICogaGVscGVyIGNhbGxzIG90aGVyd2lzZS4gVGhlIGNvbXB1dGVkIHJlc3VsdCBpcyBjYWNoZWQgcGVyIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIGZvciB3aGljaCBkZWNvcmF0b3JzIHNob3VsZCBiZSBhY3F1aXJlZC5cbiAgICogQHJldHVybnMgYWxsIGluZm9ybWF0aW9uIG9mIHRoZSBkZWNvcmF0b3JzIG9uIHRoZSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBhY3F1aXJlRGVjb3JhdG9ySW5mbyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9ySW5mbyB7XG4gICAgY29uc3QgZGVjbCA9IGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgaWYgKHRoaXMuZGVjb3JhdG9yQ2FjaGUuaGFzKGRlY2wpKSB7XG4gICAgICByZXR1cm4gdGhpcy5kZWNvcmF0b3JDYWNoZS5nZXQoZGVjbCkhO1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgZGVjb3JhdG9ycyBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzIGFuZCBgX19kZWNvcmF0ZWAgaGVscGVyIGNhbGxzLCB0aGVuIG1lcmdlIHRoZW1cbiAgICAvLyB0b2dldGhlciB3aGVyZSB0aGUgaW5mb3JtYXRpb24gZnJvbSB0aGUgc3RhdGljIHByb3BlcnRpZXMgaXMgcHJlZmVycmVkLlxuICAgIGNvbnN0IHN0YXRpY1Byb3BzID0gdGhpcy5jb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21TdGF0aWNQcm9wZXJ0aWVzKGNsYXNzU3ltYm9sKTtcbiAgICBjb25zdCBoZWxwZXJDYWxscyA9IHRoaXMuY29tcHV0ZURlY29yYXRvckluZm9Gcm9tSGVscGVyQ2FsbHMoY2xhc3NTeW1ib2wpO1xuXG4gICAgY29uc3QgZGVjb3JhdG9ySW5mbzogRGVjb3JhdG9ySW5mbyA9IHtcbiAgICAgIGNsYXNzRGVjb3JhdG9yczogc3RhdGljUHJvcHMuY2xhc3NEZWNvcmF0b3JzIHx8IGhlbHBlckNhbGxzLmNsYXNzRGVjb3JhdG9ycyxcbiAgICAgIG1lbWJlckRlY29yYXRvcnM6IHN0YXRpY1Byb3BzLm1lbWJlckRlY29yYXRvcnMgfHwgaGVscGVyQ2FsbHMubWVtYmVyRGVjb3JhdG9ycyxcbiAgICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBzdGF0aWNQcm9wcy5jb25zdHJ1Y3RvclBhcmFtSW5mbyB8fCBoZWxwZXJDYWxscy5jb25zdHJ1Y3RvclBhcmFtSW5mbyxcbiAgICB9O1xuXG4gICAgdGhpcy5kZWNvcmF0b3JDYWNoZS5zZXQoZGVjbCwgZGVjb3JhdG9ySW5mbyk7XG4gICAgcmV0dXJuIGRlY29yYXRvckluZm87XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gY29tcHV0ZSBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSBzdGF0aWMgcHJvcGVydGllcyBcImRlY29yYXRvcnNcIiwgXCJwcm9wRGVjb3JhdG9yc1wiXG4gICAqIGFuZCBcImN0b3JQYXJhbWV0ZXJzXCIgb24gdGhlIGNsYXNzLiBJZiBuZWl0aGVyIG9mIHRoZXNlIHN0YXRpYyBwcm9wZXJ0aWVzIGlzIHByZXNlbnQgdGhlXG4gICAqIGxpYnJhcnkgaXMgbGlrZWx5IG5vdCBjb21waWxlZCB1c2luZyB0c2lja2xlIGZvciB1c2FnZSB3aXRoIENsb3N1cmUgY29tcGlsZXIsIGluIHdoaWNoIGNhc2VcbiAgICogYG51bGxgIGlzIHJldHVybmVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgVGhlIGNsYXNzIHN5bWJvbCB0byBjb21wdXRlIHRoZSBkZWNvcmF0b3JzIGluZm9ybWF0aW9uIGZvci5cbiAgICogQHJldHVybnMgQWxsIGluZm9ybWF0aW9uIG9uIHRoZSBkZWNvcmF0b3JzIGFzIGV4dHJhY3RlZCBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzLCBvciBgbnVsbGAgaWZcbiAgICogbm9uZSBvZiB0aGUgc3RhdGljIHByb3BlcnRpZXMgZXhpc3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29tcHV0ZURlY29yYXRvckluZm9Gcm9tU3RhdGljUHJvcGVydGllcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKToge1xuICAgIGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbDsgbWVtYmVyRGVjb3JhdG9yczogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+fCBudWxsO1xuICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXSB8IG51bGw7XG4gIH0ge1xuICAgIGxldCBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwgPSBudWxsO1xuICAgIGxldCBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT58bnVsbCA9IG51bGw7XG4gICAgbGV0IGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXXxudWxsID0gbnVsbDtcblxuICAgIGNvbnN0IGRlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIERFQ09SQVRPUlMpO1xuICAgIGlmIChkZWNvcmF0b3JzUHJvcGVydHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xhc3NEZWNvcmF0b3JzID0gdGhpcy5nZXRDbGFzc0RlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9wRGVjb3JhdG9yc1Byb3BlcnR5ID0gdGhpcy5nZXRTdGF0aWNQcm9wZXJ0eShjbGFzc1N5bWJvbCwgUFJPUF9ERUNPUkFUT1JTKTtcbiAgICBpZiAocHJvcERlY29yYXRvcnNQcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBtZW1iZXJEZWNvcmF0b3JzID0gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KHByb3BEZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnN0cnVjdG9yUGFyYW1zUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBDT05TVFJVQ1RPUl9QQVJBTVMpO1xuICAgIGlmIChjb25zdHJ1Y3RvclBhcmFtc1Byb3BlcnR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvID0gdGhpcy5nZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkoY29uc3RydWN0b3JQYXJhbXNQcm9wZXJ0eSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtjbGFzc0RlY29yYXRvcnMsIG1lbWJlckRlY29yYXRvcnMsIGNvbnN0cnVjdG9yUGFyYW1JbmZvfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGNsYXNzIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBjbGFzcywgd2hlcmUgdGhlIGRlY29yYXRvcnMgYXJlIGRlY2xhcmVkXG4gICAqIHZpYSBhIHN0YXRpYyBwcm9wZXJ0eS4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBjbGFzcyBTb21lRGlyZWN0aXZlIHt9XG4gICAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAgICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc1N5bWJvbCB0aGUgcHJvcGVydHkgY29udGFpbmluZyB0aGUgZGVjb3JhdG9ycyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBvciBudWxsIGlmIG5vbmUgd2hlcmUgZm91bmQuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNTeW1ib2w6IHRzLlN5bWJvbCk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvcnNJZGVudGlmaWVyID0gZGVjb3JhdG9yc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmIChkZWNvcmF0b3JzSWRlbnRpZmllciAmJiBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQpIHtcbiAgICAgIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24oZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSAmJlxuICAgICAgICAgIGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudC5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pIHtcbiAgICAgICAgLy8gQVNUIG9mIHRoZSBhcnJheSBvZiBkZWNvcmF0b3IgdmFsdWVzXG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnNBcnJheSA9IGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudC5yaWdodDtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9yc0FycmF5KVxuICAgICAgICAgICAgLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgc3ltYm9sIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGl0cyBtZW1iZXJzLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBgQ2xhc3NTeW1ib2xgIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyc09mU3ltYm9sKHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuXG4gICAgLy8gVGhlIGRlY29yYXRvcnMgbWFwIGNvbnRhaW5zIGFsbCB0aGUgcHJvcGVydGllcyB0aGF0IGFyZSBkZWNvcmF0ZWRcbiAgICBjb25zdCB7bWVtYmVyRGVjb3JhdG9yc30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKHN5bWJvbCk7XG5cbiAgICAvLyBNYWtlIGEgY29weSBvZiB0aGUgZGVjb3JhdG9ycyBhcyBzdWNjZXNzZnVsbHkgcmVmbGVjdGVkIG1lbWJlcnMgZGVsZXRlIHRoZW1zZWx2ZXMgZnJvbSB0aGVcbiAgICAvLyBtYXAsIHNvIHRoYXQgYW55IGxlZnRvdmVycyBjYW4gYmUgZWFzaWx5IGRlYWx0IHdpdGguXG4gICAgY29uc3QgZGVjb3JhdG9yc01hcCA9IG5ldyBNYXAobWVtYmVyRGVjb3JhdG9ycyk7XG5cbiAgICAvLyBUaGUgbWVtYmVyIG1hcCBjb250YWlucyBhbGwgdGhlIG1ldGhvZCAoaW5zdGFuY2UgYW5kIHN0YXRpYyk7IGFuZCBhbnkgaW5zdGFuY2UgcHJvcGVydGllc1xuICAgIC8vIHRoYXQgYXJlIGluaXRpYWxpemVkIGluIHRoZSBjbGFzcy5cbiAgICBpZiAoc3ltYm9sLmltcGxlbWVudGF0aW9uLm1lbWJlcnMpIHtcbiAgICAgIHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5tZW1iZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgc3RhdGljIHByb3BlcnR5IG1hcCBjb250YWlucyBhbGwgdGhlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgaWYgKHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5leHBvcnRzKSB7XG4gICAgICBzeW1ib2wuaW1wbGVtZW50YXRpb24uZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBjbGFzcyB3YXMgZGVjbGFyZWQgYXMgYSBWYXJpYWJsZURlY2xhcmF0aW9uIHRoZW4gaXQgbWF5IGhhdmUgc3RhdGljIHByb3BlcnRpZXNcbiAgICAvLyBhdHRhY2hlZCB0byB0aGUgdmFyaWFibGUgcmF0aGVyIHRoYW4gdGhlIGNsYXNzIGl0c2VsZlxuICAgIC8vIEZvciBleGFtcGxlOlxuICAgIC8vIGBgYFxuICAgIC8vIGxldCBNeUNsYXNzID0gY2xhc3MgTXlDbGFzcyB7XG4gICAgLy8gICAvLyBubyBzdGF0aWMgcHJvcGVydGllcyBoZXJlIVxuICAgIC8vIH1cbiAgICAvLyBNeUNsYXNzLnN0YXRpY1Byb3BlcnR5ID0gLi4uO1xuICAgIC8vIGBgYFxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oc3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICBpZiAoc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMpIHtcbiAgICAgICAgc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycywgdHJ1ZSk7XG4gICAgICAgICAgaWYgKHJlZmxlY3RlZE1lbWJlcnMpIHtcbiAgICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVhbCB3aXRoIGFueSBkZWNvcmF0ZWQgcHJvcGVydGllcyB0aGF0IHdlcmUgbm90IGluaXRpYWxpemVkIGluIHRoZSBjbGFzc1xuICAgIGRlY29yYXRvcnNNYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgaW1wbGVtZW50YXRpb246IG51bGwsXG4gICAgICAgIGRlY29yYXRvcnM6IHZhbHVlLFxuICAgICAgICBpc1N0YXRpYzogZmFsc2UsXG4gICAgICAgIGtpbmQ6IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eSxcbiAgICAgICAgbmFtZToga2V5LFxuICAgICAgICBuYW1lTm9kZTogbnVsbCxcbiAgICAgICAgbm9kZTogbnVsbCxcbiAgICAgICAgdHlwZTogbnVsbCxcbiAgICAgICAgdmFsdWU6IG51bGxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogTWVtYmVyIGRlY29yYXRvcnMgbWF5IGJlIGRlY2xhcmVkIGFzIHN0YXRpYyBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzczpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gICAqICAgXCJuZ0Zvck9mXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVHJhY2tCeVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRlbXBsYXRlXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogfTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzUHJvcGVydHkgdGhlIGNsYXNzIHdob3NlIG1lbWJlciBkZWNvcmF0b3JzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhIG1hcCB3aG9zZSBrZXlzIGFyZSB0aGUgbmFtZSBvZiB0aGUgbWVtYmVycyBhbmQgd2hvc2UgdmFsdWVzIGFyZSBjb2xsZWN0aW9ucyBvZlxuICAgKiBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlckRlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOlxuICAgICAgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+IHtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuICAgIC8vIFN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBmb3IgYFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnNgLlxuICAgIGNvbnN0IHByb3BEZWNvcmF0b3JzTWFwID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2woZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBpZiAocHJvcERlY29yYXRvcnNNYXAgJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wRGVjb3JhdG9yc01hcCkpIHtcbiAgICAgIGNvbnN0IHByb3BlcnRpZXNNYXAgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChwcm9wRGVjb3JhdG9yc01hcCk7XG4gICAgICBwcm9wZXJ0aWVzTWFwLmZvckVhY2goKHZhbHVlLCBuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyh2YWx1ZSkuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlckRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogRm9yIGEgZ2l2ZW4gY2xhc3Mgc3ltYm9sLCBjb2xsZWN0cyBhbGwgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gdHNsaWIgaGVscGVyIG1ldGhvZHMsIGFzXG4gICAqIGdlbmVyYXRlZCBieSBUeXBlU2NyaXB0IGludG8gZW1pdHRlZCBKYXZhU2NyaXB0IGZpbGVzLlxuICAgKlxuICAgKiBDbGFzcyBkZWNvcmF0b3JzIGFyZSBleHRyYWN0ZWQgZnJvbSBjYWxscyB0byBgdHNsaWIuX19kZWNvcmF0ZWAgdGhhdCBsb29rIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBsZXQgU29tZURpcmVjdGl2ZSA9IGNsYXNzIFNvbWVEaXJlY3RpdmUge31cbiAgICogU29tZURpcmVjdGl2ZSA9IF9fZGVjb3JhdGUoW1xuICAgKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAgICogXSwgU29tZURpcmVjdGl2ZSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGUgZXh0cmFjdGlvbiBvZiBtZW1iZXIgZGVjb3JhdG9ycyBpcyBzaW1pbGFyLCB3aXRoIHRoZSBkaXN0aW5jdGlvbiB0aGF0IGl0cyAybmQgYW5kIDNyZFxuICAgKiBhcmd1bWVudCBjb3JyZXNwb25kIHdpdGggYSBcInByb3RvdHlwZVwiIHRhcmdldCBhbmQgdGhlIG5hbWUgb2YgdGhlIG1lbWJlciB0byB3aGljaCB0aGVcbiAgICogZGVjb3JhdG9ycyBhcHBseS5cbiAgICpcbiAgICogYGBgXG4gICAqIF9fZGVjb3JhdGUoW1xuICAgKiAgICAgSW5wdXQoKSxcbiAgICogICAgIF9fbWV0YWRhdGEoXCJkZXNpZ246dHlwZVwiLCBTdHJpbmcpXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUucHJvdG90eXBlLCBcImlucHV0MVwiLCB2b2lkIDApO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIFRoZSBjbGFzcyBzeW1ib2wgZm9yIHdoaWNoIGRlY29yYXRvcnMgc2hvdWxkIGJlIGV4dHJhY3RlZC5cbiAgICogQHJldHVybnMgQWxsIGluZm9ybWF0aW9uIG9uIHRoZSBkZWNvcmF0b3JzIG9mIHRoZSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21IZWxwZXJDYWxscyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9ySW5mbyB7XG4gICAgbGV0IGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCA9IG51bGw7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICBjb25zdCBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW10gPSBbXTtcblxuICAgIGNvbnN0IGdldENvbnN0cnVjdG9yUGFyYW1JbmZvID0gKGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgIGxldCBwYXJhbSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XTtcbiAgICAgIGlmIChwYXJhbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhcmFtID0gY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdID0ge2RlY29yYXRvcnM6IG51bGwsIHR5cGVFeHByZXNzaW9uOiBudWxsfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYXJhbTtcbiAgICB9O1xuXG4gICAgLy8gQWxsIHJlbGV2YW50IGluZm9ybWF0aW9uIGNhbiBiZSBleHRyYWN0ZWQgZnJvbSBjYWxscyB0byBgX19kZWNvcmF0ZWAsIG9idGFpbiB0aGVzZSBmaXJzdC5cbiAgICAvLyBOb3RlIHRoYXQgYWx0aG91Z2ggdGhlIGhlbHBlciBjYWxscyBhcmUgcmV0cmlldmVkIHVzaW5nIHRoZSBjbGFzcyBzeW1ib2wsIHRoZSByZXN1bHQgbWF5XG4gICAgLy8gY29udGFpbiBoZWxwZXIgY2FsbHMgY29ycmVzcG9uZGluZyB3aXRoIHVucmVsYXRlZCBjbGFzc2VzLiBUaGVyZWZvcmUsIGVhY2ggaGVscGVyIGNhbGwgc3RpbGxcbiAgICAvLyBoYXMgdG8gYmUgY2hlY2tlZCB0byBhY3R1YWxseSBjb3JyZXNwb25kIHdpdGggdGhlIGNsYXNzIHN5bWJvbC5cbiAgICBjb25zdCBoZWxwZXJDYWxscyA9IHRoaXMuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbCwgWydfX2RlY29yYXRlJ10pO1xuXG4gICAgY29uc3Qgb3V0ZXJEZWNsYXJhdGlvbiA9IGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgY29uc3QgaW5uZXJEZWNsYXJhdGlvbiA9IGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgY29uc3QgbWF0Y2hlc0NsYXNzID0gKGlkZW50aWZpZXI6IHRzLklkZW50aWZpZXIpID0+IHtcbiAgICAgIGNvbnN0IGRlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgICAgaWYgKGRlY2wgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgaWRlbnRpZmllciBjb3JyZXNwb25kcyB3aXRoIHRoZSBjbGFzcyBpZiBpdHMgZGVjbGFyYXRpb24gaXMgZWl0aGVyIHRoZSBvdXRlciBvciBpbm5lclxuICAgICAgLy8gZGVjbGFyYXRpb24uXG4gICAgICByZXR1cm4gZGVjbC5ub2RlID09PSBvdXRlckRlY2xhcmF0aW9uIHx8IGRlY2wubm9kZSA9PT0gaW5uZXJEZWNsYXJhdGlvbjtcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCBoZWxwZXJDYWxsIG9mIGhlbHBlckNhbGxzKSB7XG4gICAgICBpZiAoaXNDbGFzc0RlY29yYXRlQ2FsbChoZWxwZXJDYWxsLCBtYXRjaGVzQ2xhc3MpKSB7XG4gICAgICAgIC8vIFRoaXMgYF9fZGVjb3JhdGVgIGNhbGwgaXMgdGFyZ2V0aW5nIHRoZSBjbGFzcyBpdHNlbGYuXG4gICAgICAgIGNvbnN0IGhlbHBlckFyZ3MgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1swXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgaGVscGVyQXJncy5lbGVtZW50cykge1xuICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5yZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShlbGVtZW50KTtcbiAgICAgICAgICBpZiAoZW50cnkgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSAnZGVjb3JhdG9yJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgd2FzIHJlZmxlY3RlZCB0byByZXByZXNlbnQgYW4gYWN0dWFsIGRlY29yYXRvclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNGcm9tQ29yZShlbnRyeS5kZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICAgIChjbGFzc0RlY29yYXRvcnMgfHwgKGNsYXNzRGVjb3JhdG9ycyA9IFtdKSkucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkudHlwZSA9PT0gJ3BhcmFtOmRlY29yYXRvcnMnKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyByZXByZXNlbnRzIGEgZGVjb3JhdG9yIGZvciBhIHBhcmFtZXRlci4gU2luY2UgaXQncyBhcHBsaWVkIHRvIHRoZVxuICAgICAgICAgICAgLy8gY2xhc3MsIGl0IGNvcnJlc3BvbmRzIHdpdGggYSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgb2YgdGhlIGNsYXNzLlxuICAgICAgICAgICAgY29uc3QgcGFyYW0gPSBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhlbnRyeS5pbmRleCk7XG4gICAgICAgICAgICAocGFyYW0uZGVjb3JhdG9ycyB8fCAocGFyYW0uZGVjb3JhdG9ycyA9IFtdKSkucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkudHlwZSA9PT0gJ3BhcmFtcycpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHJlcHJlc2VudHMgdGhlIHR5cGVzIG9mIHRoZSBwYXJhbWV0ZXJzLiBTaW5jZSBpdCdzIGFwcGxpZWQgdG8gdGhlXG4gICAgICAgICAgICAvLyBjbGFzcywgaXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiB0aGUgY2xhc3MuXG4gICAgICAgICAgICBlbnRyeS50eXBlcy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICh0eXBlLCBpbmRleCkgPT4gZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oaW5kZXgpLnR5cGVFeHByZXNzaW9uID0gdHlwZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzTWVtYmVyRGVjb3JhdGVDYWxsKGhlbHBlckNhbGwsIG1hdGNoZXNDbGFzcykpIHtcbiAgICAgICAgLy8gVGhlIGBfX2RlY29yYXRlYCBjYWxsIGlzIHRhcmdldGluZyBhIG1lbWJlciBvZiB0aGUgY2xhc3NcbiAgICAgICAgY29uc3QgaGVscGVyQXJncyA9IGhlbHBlckNhbGwuYXJndW1lbnRzWzBdO1xuICAgICAgICBjb25zdCBtZW1iZXJOYW1lID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMl0udGV4dDtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgaGVscGVyQXJncy5lbGVtZW50cykge1xuICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5yZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShlbGVtZW50KTtcbiAgICAgICAgICBpZiAoZW50cnkgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSAnZGVjb3JhdG9yJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgd2FzIHJlZmxlY3RlZCB0byByZXByZXNlbnQgYW4gYWN0dWFsIGRlY29yYXRvci5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzRnJvbUNvcmUoZW50cnkuZGVjb3JhdG9yKSkge1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID1cbiAgICAgICAgICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuaGFzKG1lbWJlck5hbWUpID8gbWVtYmVyRGVjb3JhdG9ycy5nZXQobWVtYmVyTmFtZSkhIDogW107XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLnNldChtZW1iZXJOYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSW5mb3JtYXRpb24gb24gZGVjb3JhdGVkIHBhcmFtZXRlcnMgaXMgbm90IGludGVyZXN0aW5nIGZvciBuZ2NjLCBzbyBpdCdzIGlnbm9yZWQuXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtjbGFzc0RlY29yYXRvcnMsIG1lbWJlckRlY29yYXRvcnMsIGNvbnN0cnVjdG9yUGFyYW1JbmZvfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IHRoZSBkZXRhaWxzIG9mIGFuIGVudHJ5IHdpdGhpbiBhIGBfX2RlY29yYXRlYCBoZWxwZXIgY2FsbC4gRm9yIGV4YW1wbGUsIGdpdmVuIHRoZVxuICAgKiBmb2xsb3dpbmcgY29kZTpcbiAgICpcbiAgICogYGBgXG4gICAqIF9fZGVjb3JhdGUoW1xuICAgKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAgICogICB0c2xpYl8xLl9fcGFyYW0oMiwgSW5qZWN0KElOSkVDVEVEX1RPS0VOKSksXG4gICAqICAgdHNsaWJfMS5fX21ldGFkYXRhKFwiZGVzaWduOnBhcmFtdHlwZXNcIiwgW1ZpZXdDb250YWluZXJSZWYsIFRlbXBsYXRlUmVmLCBTdHJpbmddKVxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIGl0IGNhbiBiZSBzZWVuIHRoYXQgdGhlcmUgYXJlIGNhbGxzIHRvIHJlZ3VsYXIgZGVjb3JhdG9ycyAodGhlIGBEaXJlY3RpdmVgKSBhbmQgY2FsbHMgaW50b1xuICAgKiBgdHNsaWJgIGZ1bmN0aW9ucyB3aGljaCBoYXZlIGJlZW4gaW5zZXJ0ZWQgYnkgVHlwZVNjcmlwdC4gVGhlcmVmb3JlLCB0aGlzIGZ1bmN0aW9uIGNsYXNzaWZpZXNcbiAgICogYSBjYWxsIHRvIGNvcnJlc3BvbmQgd2l0aFxuICAgKiAgIDEuIGEgcmVhbCBkZWNvcmF0b3IgbGlrZSBgRGlyZWN0aXZlYCBhYm92ZSwgb3JcbiAgICogICAyLiBhIGRlY29yYXRlZCBwYXJhbWV0ZXIsIGNvcnJlc3BvbmRpbmcgd2l0aCBgX19wYXJhbWAgY2FsbHMgZnJvbSBgdHNsaWJgLCBvclxuICAgKiAgIDMuIHRoZSB0eXBlIGluZm9ybWF0aW9uIG9mIHBhcmFtZXRlcnMsIGNvcnJlc3BvbmRpbmcgd2l0aCBgX19tZXRhZGF0YWAgY2FsbCBmcm9tIGB0c2xpYmBcbiAgICpcbiAgICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBuZWVkcyB0byBiZSByZWZsZWN0ZWQgaW50byBhIGBEZWNvcmF0ZUhlbHBlckVudHJ5YFxuICAgKiBAcmV0dXJucyBhbiBvYmplY3QgdGhhdCBpbmRpY2F0ZXMgd2hpY2ggb2YgdGhlIHRocmVlIGNhdGVnb3JpZXMgdGhlIGNhbGwgcmVwcmVzZW50cywgdG9nZXRoZXJcbiAgICogd2l0aCB0aGUgcmVmbGVjdGVkIGluZm9ybWF0aW9uIG9mIHRoZSBjYWxsLCBvciBudWxsIGlmIHRoZSBjYWxsIGlzIG5vdCBhIHZhbGlkIGRlY29yYXRlIGNhbGwuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IERlY29yYXRlSGVscGVyRW50cnl8bnVsbCB7XG4gICAgLy8gV2Ugb25seSBjYXJlIGFib3V0IHRob3NlIGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbCBjYWxsc1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGNhbGwgPSBleHByZXNzaW9uO1xuXG4gICAgY29uc3QgaGVscGVyTmFtZSA9IGdldENhbGxlZU5hbWUoY2FsbCk7XG4gICAgaWYgKGhlbHBlck5hbWUgPT09ICdfX21ldGFkYXRhJykge1xuICAgICAgLy8gVGhpcyBpcyBhIGB0c2xpYi5fX21ldGFkYXRhYCBjYWxsLCByZWZsZWN0IHRvIGFyZ3VtZW50cyBpbnRvIGEgYFBhcmFtZXRlclR5cGVzYCBvYmplY3RcbiAgICAgIC8vIGlmIHRoZSBtZXRhZGF0YSBrZXkgaXMgXCJkZXNpZ246cGFyYW10eXBlc1wiLlxuICAgICAgY29uc3Qga2V5ID0gY2FsbC5hcmd1bWVudHNbMF07XG4gICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbChrZXkpIHx8IGtleS50ZXh0ICE9PSAnZGVzaWduOnBhcmFtdHlwZXMnKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdwYXJhbXMnLFxuICAgICAgICB0eXBlczogQXJyYXkuZnJvbSh2YWx1ZS5lbGVtZW50cyksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChoZWxwZXJOYW1lID09PSAnX19wYXJhbScpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBgdHNsaWIuX19wYXJhbWAgY2FsbCB0aGF0IGlzIHJlZmxlY3RlZCBpbnRvIGEgYFBhcmFtZXRlckRlY29yYXRvcnNgIG9iamVjdC5cbiAgICAgIGNvbnN0IGluZGV4QXJnID0gY2FsbC5hcmd1bWVudHNbMF07XG4gICAgICBjb25zdCBpbmRleCA9IGluZGV4QXJnICYmIHRzLmlzTnVtZXJpY0xpdGVyYWwoaW5kZXhBcmcpID8gcGFyc2VJbnQoaW5kZXhBcmcudGV4dCwgMTApIDogTmFOO1xuICAgICAgaWYgKGlzTmFOKGluZGV4KSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjb3JhdG9yQ2FsbCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGRlY29yYXRvckNhbGwgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihkZWNvcmF0b3JDYWxsKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjb3JhdG9yID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChkZWNvcmF0b3JDYWxsKTtcbiAgICAgIGlmIChkZWNvcmF0b3IgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdwYXJhbTpkZWNvcmF0b3JzJyxcbiAgICAgICAgaW5kZXgsXG4gICAgICAgIGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIGF0dGVtcHQgdG8gcmVmbGVjdCBpdCBhcyBhIHJlZ3VsYXIgZGVjb3JhdG9yLlxuICAgIGNvbnN0IGRlY29yYXRvciA9IHRoaXMucmVmbGVjdERlY29yYXRvckNhbGwoY2FsbCk7XG4gICAgaWYgKGRlY29yYXRvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnZGVjb3JhdG9yJyxcbiAgICAgIGRlY29yYXRvcixcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JDYWxsKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKTogRGVjb3JhdG9yfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvckV4cHJlc3Npb24gPSBjYWxsLmV4cHJlc3Npb247XG4gICAgaWYgKCFpc0RlY29yYXRvcklkZW50aWZpZXIoZGVjb3JhdG9yRXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdlIGZvdW5kIGEgZGVjb3JhdG9yIVxuICAgIGNvbnN0IGRlY29yYXRvcklkZW50aWZpZXIgPVxuICAgICAgICB0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yRXhwcmVzc2lvbikgPyBkZWNvcmF0b3JFeHByZXNzaW9uIDogZGVjb3JhdG9yRXhwcmVzc2lvbi5uYW1lO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvckV4cHJlc3Npb24sXG4gICAgICBpbXBvcnQ6IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpLFxuICAgICAgbm9kZTogY2FsbCxcbiAgICAgIGFyZ3M6IEFycmF5LmZyb20oY2FsbC5hcmd1bWVudHMpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIGdpdmVuIHN0YXRlbWVudCB0byBzZWUgaWYgaXQgaXMgYSBjYWxsIHRvIGFueSBvZiB0aGUgc3BlY2lmaWVkIGhlbHBlciBmdW5jdGlvbnMgb3JcbiAgICogbnVsbCBpZiBub3QgZm91bmQuXG4gICAqXG4gICAqIE1hdGNoaW5nIHN0YXRlbWVudHMgd2lsbCBsb29rIGxpa2U6ICBgdHNsaWJfMS5fX2RlY29yYXRlKC4uLik7YC5cbiAgICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRoYXQgbWF5IGNvbnRhaW4gdGhlIGNhbGwuXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lcyB0aGUgbmFtZXMgb2YgdGhlIGhlbHBlciB3ZSBhcmUgbG9va2luZyBmb3IuXG4gICAqIEByZXR1cm5zIHRoZSBub2RlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGBfX2RlY29yYXRlKC4uLilgIGNhbGwgb3IgbnVsbCBpZiB0aGUgc3RhdGVtZW50XG4gICAqIGRvZXMgbm90IG1hdGNoLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEhlbHBlckNhbGwoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIGhlbHBlck5hbWVzOiBzdHJpbmdbXSk6IHRzLkNhbGxFeHByZXNzaW9ufG51bGwge1xuICAgIGlmICgodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgfHwgdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgJiZcbiAgICAgICAgc3RhdGVtZW50LmV4cHJlc3Npb24pIHtcbiAgICAgIGxldCBleHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgICB3aGlsZSAoaXNBc3NpZ25tZW50KGV4cHJlc3Npb24pKSB7XG4gICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnJpZ2h0O1xuICAgICAgfVxuICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHtcbiAgICAgICAgY29uc3QgY2FsbGVlTmFtZSA9IGdldENhbGxlZU5hbWUoZXhwcmVzc2lvbik7XG4gICAgICAgIGlmIChjYWxsZWVOYW1lICE9PSBudWxsICYmIGhlbHBlck5hbWVzLmluY2x1ZGVzKGNhbGxlZU5hbWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGV4cHJlc3Npb247XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgdGhlIGdpdmVuIGFycmF5IG5vZGUgYW5kIGV4dHJhY3QgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gZWFjaCBlbGVtZW50LlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgZm9yIGRlY29yYXRvcnMgdGhhdCBhcmUgZGVmaW5lZCBpbiBzdGF0aWMgcHJvcGVydGllcy4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNBcnJheSBhbiBleHByZXNzaW9uIHRoYXQgY29udGFpbnMgZGVjb3JhdG9yIGluZm9ybWF0aW9uLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBkZWNvcmF0b3IgaW5mbyB0aGF0IHdhcyByZWZsZWN0ZWQgZnJvbSB0aGUgYXJyYXkgbm9kZS5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXk6IHRzLkV4cHJlc3Npb24pOiBEZWNvcmF0b3JbXSB7XG4gICAgY29uc3QgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gPSBbXTtcblxuICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVjb3JhdG9yc0FycmF5KSkge1xuICAgICAgLy8gQWRkIGVhY2ggZGVjb3JhdG9yIHRoYXQgaXMgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWAgaW50byB0aGUgYGRlY29yYXRvcnNgIGFycmF5XG4gICAgICBkZWNvcmF0b3JzQXJyYXkuZWxlbWVudHMuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgLy8gSWYgdGhlIGRlY29yYXRvciBpcyBub3QgYW4gb2JqZWN0IGxpdGVyYWwgZXhwcmVzc2lvbiB0aGVuIHdlIGFyZSBub3QgaW50ZXJlc3RlZFxuICAgICAgICBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgICAgIC8vIFdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gb2JqZWN0cyBvZiB0aGUgZm9ybTogYHsgdHlwZTogRGVjb3JhdG9yVHlwZSwgYXJnczogWy4uLl0gfWBcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3IgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChub2RlKTtcblxuICAgICAgICAgIC8vIElzIHRoZSB2YWx1ZSBvZiB0aGUgYHR5cGVgIHByb3BlcnR5IGFuIGlkZW50aWZpZXI/XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5oYXMoJ3R5cGUnKSkge1xuICAgICAgICAgICAgbGV0IGRlY29yYXRvclR5cGUgPSBkZWNvcmF0b3IuZ2V0KCd0eXBlJykhO1xuICAgICAgICAgICAgaWYgKGlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSkge1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JJZGVudGlmaWVyID1cbiAgICAgICAgICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSA/IGRlY29yYXRvclR5cGUgOiBkZWNvcmF0b3JUeXBlLm5hbWU7XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvclR5cGUsXG4gICAgICAgICAgICAgICAgaW1wb3J0OiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWNvcmF0b3JJZGVudGlmaWVyKSxcbiAgICAgICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgICAgIGFyZ3M6IGdldERlY29yYXRvckFyZ3Mobm9kZSksXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBkZWNvcmF0b3JzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciBhIHN5bWJvbCBhbmQgZXh0cmFjdCB0aGUgbWVtYmVyIGluZm9ybWF0aW9uLCBjb21iaW5pbmcgaXQgd2l0aCB0aGVcbiAgICogcHJvdmlkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uLCBhbmQgd2hldGhlciBpdCBpcyBhIHN0YXRpYyBtZW1iZXIuXG4gICAqXG4gICAqIEEgc2luZ2xlIHN5bWJvbCBtYXkgcmVwcmVzZW50IG11bHRpcGxlIGNsYXNzIG1lbWJlcnMgaW4gdGhlIGNhc2Ugb2YgYWNjZXNzb3JzO1xuICAgKiBhbiBlcXVhbGx5IG5hbWVkIGdldHRlci9zZXR0ZXIgYWNjZXNzb3IgcGFpciBpcyBjb21iaW5lZCBpbnRvIGEgc2luZ2xlIHN5bWJvbC5cbiAgICogV2hlbiB0aGUgc3ltYm9sIGlzIHJlY29nbml6ZWQgYXMgcmVwcmVzZW50aW5nIGFuIGFjY2Vzc29yLCBpdHMgZGVjbGFyYXRpb25zIGFyZVxuICAgKiBhbmFseXplZCBzdWNoIHRoYXQgYm90aCB0aGUgc2V0dGVyIGFuZCBnZXR0ZXIgYWNjZXNzb3IgYXJlIHJldHVybmVkIGFzIHNlcGFyYXRlXG4gICAqIGNsYXNzIG1lbWJlcnMuXG4gICAqXG4gICAqIE9uZSBkaWZmZXJlbmNlIHdydCB0aGUgVHlwZVNjcmlwdCBob3N0IGlzIHRoYXQgaW4gRVMyMDE1LCB3ZSBjYW5ub3Qgc2VlIHdoaWNoXG4gICAqIGFjY2Vzc29yIG9yaWdpbmFsbHkgaGFkIGFueSBkZWNvcmF0b3JzIGFwcGxpZWQgdG8gdGhlbSwgYXMgZGVjb3JhdG9ycyBhcmUgYXBwbGllZFxuICAgKiB0byB0aGUgcHJvcGVydHkgZGVzY3JpcHRvciBpbiBnZW5lcmFsLCBub3QgYSBzcGVjaWZpYyBhY2Nlc3Nvci4gSWYgYW4gYWNjZXNzb3JcbiAgICogaGFzIGJvdGggYSBzZXR0ZXIgYW5kIGdldHRlciwgYW55IGRlY29yYXRvcnMgYXJlIG9ubHkgYXR0YWNoZWQgdG8gdGhlIHNldHRlciBtZW1iZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIHN5bWJvbCBmb3IgdGhlIG1lbWJlciB0byByZWZsZWN0IG92ZXIuXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBtZW1iZXIuXG4gICAqIEBwYXJhbSBpc1N0YXRpYyB0cnVlIGlmIHRoaXMgbWVtYmVyIGlzIHN0YXRpYywgZmFsc2UgaWYgaXQgaXMgYW4gaW5zdGFuY2UgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSByZWZsZWN0ZWQgbWVtYmVyIGluZm9ybWF0aW9uLCBvciBudWxsIGlmIHRoZSBzeW1ib2wgaXMgbm90IGEgbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3RNZW1iZXJzKHN5bWJvbDogdHMuU3ltYm9sLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sIGlzU3RhdGljPzogYm9vbGVhbik6XG4gICAgICBDbGFzc01lbWJlcltdfG51bGwge1xuICAgIGlmIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BY2Nlc3Nvcikge1xuICAgICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuICAgICAgY29uc3Qgc2V0dGVyID0gc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmZpbmQodHMuaXNTZXRBY2Nlc3Nvcik7XG4gICAgICBjb25zdCBnZXR0ZXIgPSBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMuZmluZCh0cy5pc0dldEFjY2Vzc29yKTtcblxuICAgICAgY29uc3Qgc2V0dGVyTWVtYmVyID1cbiAgICAgICAgICBzZXR0ZXIgJiYgdGhpcy5yZWZsZWN0TWVtYmVyKHNldHRlciwgQ2xhc3NNZW1iZXJLaW5kLlNldHRlciwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgICAgaWYgKHNldHRlck1lbWJlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goc2V0dGVyTWVtYmVyKTtcblxuICAgICAgICAvLyBQcmV2ZW50IGF0dGFjaGluZyB0aGUgZGVjb3JhdG9ycyB0byBhIHBvdGVudGlhbCBnZXR0ZXIuIEluIEVTMjAxNSwgd2UgY2FuJ3QgdGVsbCB3aGVyZVxuICAgICAgICAvLyB0aGUgZGVjb3JhdG9ycyB3ZXJlIG9yaWdpbmFsbHkgYXR0YWNoZWQgdG8sIGhvd2V2ZXIgd2Ugb25seSB3YW50IHRvIGF0dGFjaCB0aGVtIHRvIGFcbiAgICAgICAgLy8gc2luZ2xlIGBDbGFzc01lbWJlcmAgYXMgb3RoZXJ3aXNlIG5ndHNjIHdvdWxkIGhhbmRsZSB0aGUgc2FtZSBkZWNvcmF0b3JzIHR3aWNlLlxuICAgICAgICBkZWNvcmF0b3JzID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBnZXR0ZXJNZW1iZXIgPVxuICAgICAgICAgIGdldHRlciAmJiB0aGlzLnJlZmxlY3RNZW1iZXIoZ2V0dGVyLCBDbGFzc01lbWJlcktpbmQuR2V0dGVyLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgICBpZiAoZ2V0dGVyTWVtYmVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaChnZXR0ZXJNZW1iZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbWVtYmVycztcbiAgICB9XG5cbiAgICBsZXQga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwgPSBudWxsO1xuICAgIGlmIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5NZXRob2QpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuTWV0aG9kO1xuICAgIH0gZWxzZSBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuUHJvcGVydHkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZSA9IHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uIHx8IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9uc1swXTtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIC8vIElmIHRoZSBzeW1ib2wgaGFzIGJlZW4gaW1wb3J0ZWQgZnJvbSBhIFR5cGVTY3JpcHQgdHlwaW5ncyBmaWxlIHRoZW4gdGhlIGNvbXBpbGVyXG4gICAgICAvLyBtYXkgcGFzcyB0aGUgYHByb3RvdHlwZWAgc3ltYm9sIGFzIGFuIGV4cG9ydCBvZiB0aGUgY2xhc3MuXG4gICAgICAvLyBCdXQgdGhpcyBoYXMgbm8gZGVjbGFyYXRpb24uIEluIHRoaXMgY2FzZSB3ZSBqdXN0IHF1aWV0bHkgaWdub3JlIGl0LlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbWVtYmVyID0gdGhpcy5yZWZsZWN0TWVtYmVyKG5vZGUsIGtpbmQsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICBpZiAoIW1lbWJlcikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIFttZW1iZXJdO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciBhIHN5bWJvbCBhbmQgZXh0cmFjdCB0aGUgbWVtYmVyIGluZm9ybWF0aW9uLCBjb21iaW5pbmcgaXQgd2l0aCB0aGVcbiAgICogcHJvdmlkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uLCBhbmQgd2hldGhlciBpdCBpcyBhIHN0YXRpYyBtZW1iZXIuXG4gICAqIEBwYXJhbSBub2RlIHRoZSBkZWNsYXJhdGlvbiBub2RlIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGtpbmQgdGhlIGFzc3VtZWQga2luZCBvZiB0aGUgbWVtYmVyLCBtYXkgYmVjb21lIG1vcmUgYWNjdXJhdGUgZHVyaW5nIHJlZmxlY3Rpb24uXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBtZW1iZXIuXG4gICAqIEBwYXJhbSBpc1N0YXRpYyB0cnVlIGlmIHRoaXMgbWVtYmVyIGlzIHN0YXRpYywgZmFsc2UgaWYgaXQgaXMgYW4gaW5zdGFuY2UgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSByZWZsZWN0ZWQgbWVtYmVyIGluZm9ybWF0aW9uLCBvciBudWxsIGlmIHRoZSBzeW1ib2wgaXMgbm90IGEgbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3RNZW1iZXIoXG4gICAgICBub2RlOiB0cy5EZWNsYXJhdGlvbiwga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSxcbiAgICAgIGlzU3RhdGljPzogYm9vbGVhbik6IENsYXNzTWVtYmVyfG51bGwge1xuICAgIGxldCB2YWx1ZTogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lTm9kZTogdHMuSWRlbnRpZmllcnxudWxsID0gbnVsbDtcblxuICAgIGlmICghaXNDbGFzc01lbWJlclR5cGUobm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChpc1N0YXRpYyAmJiBpc1Byb3BlcnR5QWNjZXNzKG5vZGUpKSB7XG4gICAgICBuYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgICB2YWx1ZSA9IGtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eSA/IG5vZGUucGFyZW50LnJpZ2h0IDogbnVsbDtcbiAgICB9IGVsc2UgaWYgKGlzVGhpc0Fzc2lnbm1lbnQobm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG4gICAgICBuYW1lID0gbm9kZS5sZWZ0Lm5hbWUudGV4dDtcbiAgICAgIHZhbHVlID0gbm9kZS5yaWdodDtcbiAgICAgIGlzU3RhdGljID0gZmFsc2U7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuQ29uc3RydWN0b3I7XG4gICAgICBuYW1lID0gJ2NvbnN0cnVjdG9yJztcbiAgICAgIGlzU3RhdGljID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGtpbmQgPT09IG51bGwpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oYFVua25vd24gbWVtYmVyIHR5cGU6IFwiJHtub2RlLmdldFRleHQoKX1gKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghbmFtZSkge1xuICAgICAgaWYgKGlzTmFtZWREZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICBuYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgICAgIG5hbWVOb2RlID0gbm9kZS5uYW1lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgaGF2ZSBzdGlsbCBub3QgZGV0ZXJtaW5lZCBpZiB0aGlzIGlzIGEgc3RhdGljIG9yIGluc3RhbmNlIG1lbWJlciB0aGVuXG4gICAgLy8gbG9vayBmb3IgdGhlIGBzdGF0aWNgIGtleXdvcmQgb24gdGhlIGRlY2xhcmF0aW9uXG4gICAgaWYgKGlzU3RhdGljID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlzU3RhdGljID0gbm9kZS5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIG5vZGUubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGU6IHRzLlR5cGVOb2RlID0gKG5vZGUgYXMgYW55KS50eXBlIHx8IG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5vZGUsXG4gICAgICBpbXBsZW1lbnRhdGlvbjogbm9kZSxcbiAgICAgIGtpbmQsXG4gICAgICB0eXBlLFxuICAgICAgbmFtZSxcbiAgICAgIG5hbWVOb2RlLFxuICAgICAgdmFsdWUsXG4gICAgICBpc1N0YXRpYyxcbiAgICAgIGRlY29yYXRvcnM6IGRlY29yYXRvcnMgfHwgW11cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwYXJhbWV0ZXJzIHdlIHdhbnQgdG8gZmluZC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uYCBvYmplY3RzIHJlcHJlc2VudGluZyBlYWNoIG9mIHRoZSBwYXJhbWV0ZXJzIGluXG4gICAqIHRoZSBjbGFzcydzIGNvbnN0cnVjdG9yIG9yIG51bGwgaWYgdGhlcmUgaXMgbm8gY29uc3RydWN0b3IuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6XG4gICAgICB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdfG51bGwge1xuICAgIGNvbnN0IG1lbWJlcnMgPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi5tZW1iZXJzO1xuICAgIGlmIChtZW1iZXJzICYmIG1lbWJlcnMuaGFzKENPTlNUUlVDVE9SKSkge1xuICAgICAgY29uc3QgY29uc3RydWN0b3JTeW1ib2wgPSBtZW1iZXJzLmdldChDT05TVFJVQ1RPUikhO1xuICAgICAgLy8gRm9yIHNvbWUgcmVhc29uIHRoZSBjb25zdHJ1Y3RvciBkb2VzIG5vdCBoYXZlIGEgYHZhbHVlRGVjbGFyYXRpb25gID8hP1xuICAgICAgY29uc3QgY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnMgJiZcbiAgICAgICAgICBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnNbMF0gYXMgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbiB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghY29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgICAgaWYgKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbShjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciBkZWNvcmF0b3JzIG9mIGEgY2xhc3MgY29uc3RydWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEBwYXJhbSBwYXJhbWV0ZXJOb2RlcyB0aGUgYXJyYXkgb2YgVHlwZVNjcmlwdCBwYXJhbWV0ZXIgbm9kZXMgZm9yIHRoaXMgY2xhc3MncyBjb25zdHJ1Y3Rvci5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgY29uc3RydWN0b3IgcGFyYW1ldGVyIGluZm8gb2JqZWN0cy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhcbiAgICAgIGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdKTogQ3RvclBhcmFtZXRlcltdIHtcbiAgICBjb25zdCB7Y29uc3RydWN0b3JQYXJhbUluZm99ID0gdGhpcy5hY3F1aXJlRGVjb3JhdG9ySW5mbyhjbGFzc1N5bWJvbCk7XG5cbiAgICByZXR1cm4gcGFyYW1ldGVyTm9kZXMubWFwKChub2RlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3Qge2RlY29yYXRvcnMsIHR5cGVFeHByZXNzaW9ufSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XSA/XG4gICAgICAgICAgY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdIDpcbiAgICAgICAgICB7ZGVjb3JhdG9yczogbnVsbCwgdHlwZUV4cHJlc3Npb246IG51bGx9O1xuICAgICAgY29uc3QgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG5cbiAgICAgIGxldCB0eXBlVmFsdWVSZWZlcmVuY2U6IFR5cGVWYWx1ZVJlZmVyZW5jZXxudWxsID0gbnVsbDtcbiAgICAgIGlmICh0eXBlRXhwcmVzc2lvbiAhPT0gbnVsbCkge1xuICAgICAgICAvLyBgdHlwZUV4cHJlc3Npb25gIGlzIGFuIGV4cHJlc3Npb24gaW4gYSBcInR5cGVcIiBjb250ZXh0LiBSZXNvbHZlIGl0IHRvIGEgZGVjbGFyZWQgdmFsdWUuXG4gICAgICAgIC8vIEVpdGhlciBpdCdzIGEgcmVmZXJlbmNlIHRvIGFuIGltcG9ydGVkIHR5cGUsIG9yIGEgdHlwZSBkZWNsYXJlZCBsb2NhbGx5LiBEaXN0aW5ndWlzaCB0aGVcbiAgICAgICAgLy8gdHdvIGNhc2VzIHdpdGggYGdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uYC5cbiAgICAgICAgY29uc3QgZGVjbCA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb24odHlwZUV4cHJlc3Npb24pO1xuICAgICAgICBpZiAoZGVjbCAhPT0gbnVsbCAmJiBkZWNsLm5vZGUgIT09IG51bGwgJiYgZGVjbC52aWFNb2R1bGUgIT09IG51bGwgJiZcbiAgICAgICAgICAgIGlzTmFtZWREZWNsYXJhdGlvbihkZWNsLm5vZGUpKSB7XG4gICAgICAgICAgdHlwZVZhbHVlUmVmZXJlbmNlID0ge1xuICAgICAgICAgICAgbG9jYWw6IGZhbHNlLFxuICAgICAgICAgICAgdmFsdWVEZWNsYXJhdGlvbjogZGVjbC5ub2RlLFxuICAgICAgICAgICAgbW9kdWxlTmFtZTogZGVjbC52aWFNb2R1bGUsXG4gICAgICAgICAgICBpbXBvcnRlZE5hbWU6IGRlY2wubm9kZS5uYW1lLnRleHQsXG4gICAgICAgICAgICBuZXN0ZWRQYXRoOiBudWxsLFxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHlwZVZhbHVlUmVmZXJlbmNlID0ge1xuICAgICAgICAgICAgbG9jYWw6IHRydWUsXG4gICAgICAgICAgICBleHByZXNzaW9uOiB0eXBlRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGRlZmF1bHRJbXBvcnRTdGF0ZW1lbnQ6IG51bGwsXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBnZXROYW1lVGV4dChuYW1lTm9kZSksXG4gICAgICAgIG5hbWVOb2RlLFxuICAgICAgICB0eXBlVmFsdWVSZWZlcmVuY2UsXG4gICAgICAgIHR5cGVOb2RlOiBudWxsLFxuICAgICAgICBkZWNvcmF0b3JzXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzLFxuICAgKiB3aGVyZSB0aGUgaW5mb3JtYXRpb24gaXMgc3RvcmVkIG9uIGEgc3RhdGljIHByb3BlcnR5IG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IGluIEVTTTIwMTUsIHRoZSBwcm9wZXJ0eSBpcyBkZWZpbmVkIGFuIGFycmF5LCBvciBieSBhbiBhcnJvdyBmdW5jdGlvbiB0aGF0IHJldHVybnNcbiAgICogYW4gYXJyYXksIG9mIGRlY29yYXRvciBhbmQgdHlwZSBpbmZvcm1hdGlvbi5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsXG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICAgKiAgIHt0eXBlOiBWaWV3Q29udGFpbmVyUmVmfSxcbiAgICogICB7dHlwZTogVGVtcGxhdGVSZWZ9LFxuICAgKiAgIHt0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOXX1dfSxcbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIG9yXG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gW1xuICAgKiAgIHt0eXBlOiBWaWV3Q29udGFpbmVyUmVmfSxcbiAgICogICB7dHlwZTogVGVtcGxhdGVSZWZ9LFxuICAgKiAgIHt0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7dHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU5dfV19LFxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5IHRoZSBwcm9wZXJ0eSB0aGF0IGhvbGRzIHRoZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIHRoZSB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciBlYWNoIHBhcmFtZXRlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkocGFyYW1EZWNvcmF0b3JzUHJvcGVydHk6IHRzLlN5bWJvbCk6IFBhcmFtSW5mb1tdfG51bGwge1xuICAgIGNvbnN0IHBhcmFtRGVjb3JhdG9ycyA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBpZiAocGFyYW1EZWNvcmF0b3JzKSB7XG4gICAgICAvLyBUaGUgZGVjb3JhdG9ycyBhcnJheSBtYXkgYmUgd3JhcHBlZCBpbiBhbiBhcnJvdyBmdW5jdGlvbi4gSWYgc28gdW53cmFwIGl0LlxuICAgICAgY29uc3QgY29udGFpbmVyID1cbiAgICAgICAgICB0cy5pc0Fycm93RnVuY3Rpb24ocGFyYW1EZWNvcmF0b3JzKSA/IHBhcmFtRGVjb3JhdG9ycy5ib2R5IDogcGFyYW1EZWNvcmF0b3JzO1xuICAgICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihjb250YWluZXIpKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gY29udGFpbmVyLmVsZW1lbnRzO1xuICAgICAgICByZXR1cm4gZWxlbWVudHNcbiAgICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgICAgZWxlbWVudCA9PlxuICAgICAgICAgICAgICAgICAgICB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKGVsZW1lbnQpID8gcmVmbGVjdE9iamVjdExpdGVyYWwoZWxlbWVudCkgOiBudWxsKVxuICAgICAgICAgICAgLm1hcChwYXJhbUluZm8gPT4ge1xuICAgICAgICAgICAgICBjb25zdCB0eXBlRXhwcmVzc2lvbiA9XG4gICAgICAgICAgICAgICAgICBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmhhcygndHlwZScpID8gcGFyYW1JbmZvLmdldCgndHlwZScpISA6IG51bGw7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPVxuICAgICAgICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ2RlY29yYXRvcnMnKSA/IHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSEgOiBudWxsO1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9ySW5mbyAmJlxuICAgICAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKVxuICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAocGFyYW1EZWNvcmF0b3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICdJbnZhbGlkIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBkZWNvcmF0b3IgaW4gJyArXG4gICAgICAgICAgICAgICAgcGFyYW1EZWNvcmF0b3JzLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSArICc6XFxuJyxcbiAgICAgICAgICAgIHBhcmFtRGVjb3JhdG9ycy5nZXRUZXh0KCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggc3RhdGVtZW50cyByZWxhdGVkIHRvIHRoZSBnaXZlbiBjbGFzcyBmb3IgY2FsbHMgdG8gdGhlIHNwZWNpZmllZCBoZWxwZXIuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZXMgdGhlIG5hbWVzIG9mIHRoZSBoZWxwZXJzIChlLmcuIGBfX2RlY29yYXRlYCkgd2hvc2UgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWRcbiAgICogaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIENhbGxFeHByZXNzaW9uIG5vZGVzIGZvciBlYWNoIG1hdGNoaW5nIGhlbHBlciBjYWxsLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgaGVscGVyTmFtZXM6IHN0cmluZ1tdKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9uW10ge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbClcbiAgICAgICAgLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5nZXRIZWxwZXJDYWxsKHN0YXRlbWVudCwgaGVscGVyTmFtZXMpKVxuICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIHRoYXQgbWF5IGNvbnRhaW4gY2FsbHMgdG8gYSBoZWxwZXIuXG4gICAqXG4gICAqIEluIEVTTTIwMTUgY29kZSB0aGUgaGVscGVyIGNhbGxzIGFyZSBpbiB0aGUgdG9wIGxldmVsIG1vZHVsZSwgc28gd2UgaGF2ZSB0byBjb25zaWRlclxuICAgKiBhbGwgdGhlIHN0YXRlbWVudHMgaW4gdGhlIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIHN0YXRlbWVudHMgdGhhdCBtYXkgY29udGFpbiBoZWxwZXIgY2FsbHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0U3RhdGVtZW50c0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgY29uc3QgY2xhc3NOb2RlID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24udmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoaXNUb3BMZXZlbChjbGFzc05vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRNb2R1bGVTdGF0ZW1lbnRzKGNsYXNzTm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIH0gZWxzZSBpZiAodHMuaXNCbG9jayhjbGFzc05vZGUucGFyZW50KSkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oY2xhc3NOb2RlLnBhcmVudC5zdGF0ZW1lbnRzKTtcbiAgICB9XG4gICAgLy8gV2Ugc2hvdWxkIG5ldmVyIGFycml2ZSBoZXJlXG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZmluZCBhZGphY2VudCBzdGF0ZW1lbnRzIGZvciAke2NsYXNzU3ltYm9sLm5hbWV9YCk7XG4gIH1cblxuICAvKipcbiAgICogVGVzdCB3aGV0aGVyIGEgZGVjb3JhdG9yIHdhcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYC5cbiAgICpcbiAgICogSXMgdGhlIGRlY29yYXRvcjpcbiAgICogKiBleHRlcm5hbGx5IGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgP1xuICAgKiAqIHRoZSBjdXJyZW50IGhvc3RlZCBwcm9ncmFtIGlzIGFjdHVhbGx5IGBAYW5ndWxhci9jb3JlYCBhbmRcbiAgICogICAtIHJlbGF0aXZlbHkgaW50ZXJuYWxseSBpbXBvcnRlZDsgb3JcbiAgICogICAtIG5vdCBpbXBvcnRlZCwgZnJvbSB0aGUgY3VycmVudCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yIHRoZSBkZWNvcmF0b3IgdG8gdGVzdC5cbiAgICovXG4gIHByb3RlY3RlZCBpc0Zyb21Db3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuaXNDb3JlKSB7XG4gICAgICByZXR1cm4gIWRlY29yYXRvci5pbXBvcnQgfHwgL15cXC4vLnRlc3QoZGVjb3JhdG9yLmltcG9ydC5mcm9tKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICEhZGVjb3JhdG9yLmltcG9ydCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbWFwcGluZyBiZXR3ZWVuIHRoZSBwdWJsaWMgZXhwb3J0cyBpbiBhIHNyYyBwcm9ncmFtIGFuZCB0aGUgcHVibGljIGV4cG9ydHMgb2YgYSBkdHNcbiAgICogcHJvZ3JhbS5cbiAgICpcbiAgICogQHBhcmFtIHNyYyB0aGUgcHJvZ3JhbSBidW5kbGUgY29udGFpbmluZyB0aGUgc291cmNlIGZpbGVzLlxuICAgKiBAcGFyYW0gZHRzIHRoZSBwcm9ncmFtIGJ1bmRsZSBjb250YWluaW5nIHRoZSB0eXBpbmdzIGZpbGVzLlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiBzb3VyY2UgZGVjbGFyYXRpb25zIHRvIHR5cGluZ3MgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVQdWJsaWNEdHNEZWNsYXJhdGlvbk1hcChzcmM6IEJ1bmRsZVByb2dyYW0sIGR0czogQnVuZGxlUHJvZ3JhbSk6XG4gICAgICBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLkRlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgZGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCBkdHNEZWNsYXJhdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCByb290RHRzID0gZ2V0Um9vdEZpbGVPckZhaWwoZHRzKTtcbiAgICB0aGlzLmNvbGxlY3REdHNFeHBvcnRlZERlY2xhcmF0aW9ucyhkdHNEZWNsYXJhdGlvbk1hcCwgcm9vdER0cywgZHRzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgY29uc3Qgcm9vdFNyYyA9IGdldFJvb3RGaWxlT3JGYWlsKHNyYyk7XG4gICAgdGhpcy5jb2xsZWN0U3JjRXhwb3J0ZWREZWNsYXJhdGlvbnMoZGVjbGFyYXRpb25NYXAsIGR0c0RlY2xhcmF0aW9uTWFwLCByb290U3JjKTtcbiAgICByZXR1cm4gZGVjbGFyYXRpb25NYXA7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbWFwcGluZyBiZXR3ZWVuIHRoZSBcInByaXZhdGVcIiBleHBvcnRzIGluIGEgc3JjIHByb2dyYW0gYW5kIHRoZSBcInByaXZhdGVcIiBleHBvcnRzIG9mIGFcbiAgICogZHRzIHByb2dyYW0uIFRoZXNlIGV4cG9ydHMgbWF5IGJlIGV4cG9ydGVkIGZyb20gaW5kaXZpZHVhbCBmaWxlcyBpbiB0aGUgc3JjIG9yIGR0cyBwcm9ncmFtcyxcbiAgICogYnV0IG5vdCBleHBvcnRlZCBmcm9tIHRoZSByb290IGZpbGUgKGkuZSBwdWJsaWNseSBmcm9tIHRoZSBlbnRyeS1wb2ludCkuXG4gICAqXG4gICAqIFRoaXMgbWFwcGluZyBpcyBhIFwiYmVzdCBndWVzc1wiIHNpbmNlIHdlIGNhbm5vdCBndWFyYW50ZWUgdGhhdCB0d28gZGVjbGFyYXRpb25zIHRoYXQgaGFwcGVuIHRvXG4gICAqIGJlIGV4cG9ydGVkIGZyb20gYSBmaWxlIHdpdGggdGhlIHNhbWUgbmFtZSBhcmUgYWN0dWFsbHkgZXF1aXZhbGVudC4gQnV0IHRoaXMgaXMgYSByZWFzb25hYmxlXG4gICAqIGVzdGltYXRlIGZvciB0aGUgcHVycG9zZXMgb2YgbmdjYy5cbiAgICpcbiAgICogQHBhcmFtIHNyYyB0aGUgcHJvZ3JhbSBidW5kbGUgY29udGFpbmluZyB0aGUgc291cmNlIGZpbGVzLlxuICAgKiBAcGFyYW0gZHRzIHRoZSBwcm9ncmFtIGJ1bmRsZSBjb250YWluaW5nIHRoZSB0eXBpbmdzIGZpbGVzLlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiBzb3VyY2UgZGVjbGFyYXRpb25zIHRvIHR5cGluZ3MgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVQcml2YXRlRHRzRGVjbGFyYXRpb25NYXAoc3JjOiBCdW5kbGVQcm9ncmFtLCBkdHM6IEJ1bmRsZVByb2dyYW0pOlxuICAgICAgTWFwPHRzLkRlY2xhcmF0aW9uLCB0cy5EZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uTWFwID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBkdHMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgZHRzRmlsZXMgPSBnZXROb25Sb290UGFja2FnZUZpbGVzKGR0cyk7XG4gICAgZm9yIChjb25zdCBkdHNGaWxlIG9mIGR0c0ZpbGVzKSB7XG4gICAgICB0aGlzLmNvbGxlY3REdHNFeHBvcnRlZERlY2xhcmF0aW9ucyhkdHNEZWNsYXJhdGlvbk1hcCwgZHRzRmlsZSwgdHlwZUNoZWNrZXIpO1xuICAgIH1cblxuICAgIGNvbnN0IHNyY0ZpbGVzID0gZ2V0Tm9uUm9vdFBhY2thZ2VGaWxlcyhzcmMpO1xuICAgIGZvciAoY29uc3Qgc3JjRmlsZSBvZiBzcmNGaWxlcykge1xuICAgICAgdGhpcy5jb2xsZWN0U3JjRXhwb3J0ZWREZWNsYXJhdGlvbnMoZGVjbGFyYXRpb25NYXAsIGR0c0RlY2xhcmF0aW9uTWFwLCBzcmNGaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgbWFwcGluZ3MgYmV0d2VlbiBuYW1lcyBvZiBleHBvcnRlZCBkZWNsYXJhdGlvbnMgaW4gYSBmaWxlIGFuZCBpdHMgYWN0dWFsIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBBbnkgbmV3IG1hcHBpbmdzIGFyZSBhZGRlZCB0byB0aGUgYGR0c0RlY2xhcmF0aW9uTWFwYC5cbiAgICovXG4gIHByb3RlY3RlZCBjb2xsZWN0RHRzRXhwb3J0ZWREZWNsYXJhdGlvbnMoXG4gICAgICBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+LCBzcmNGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiB2b2lkIHtcbiAgICBjb25zdCBzcmNNb2R1bGUgPSBzcmNGaWxlICYmIGNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihzcmNGaWxlKTtcbiAgICBjb25zdCBtb2R1bGVFeHBvcnRzID0gc3JjTW9kdWxlICYmIGNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKHNyY01vZHVsZSk7XG4gICAgaWYgKG1vZHVsZUV4cG9ydHMpIHtcbiAgICAgIG1vZHVsZUV4cG9ydHMuZm9yRWFjaChleHBvcnRlZFN5bWJvbCA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZFN5bWJvbC5uYW1lO1xuICAgICAgICBpZiAoZXhwb3J0ZWRTeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcykge1xuICAgICAgICAgIGV4cG9ydGVkU3ltYm9sID0gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKGV4cG9ydGVkU3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGV4cG9ydGVkU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgICAgIGlmIChkZWNsYXJhdGlvbiAmJiAhZHRzRGVjbGFyYXRpb25NYXAuaGFzKG5hbWUpKSB7XG4gICAgICAgICAgZHRzRGVjbGFyYXRpb25NYXAuc2V0KG5hbWUsIGRlY2xhcmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cblxuICBwcm90ZWN0ZWQgY29sbGVjdFNyY0V4cG9ydGVkRGVjbGFyYXRpb25zKFxuICAgICAgZGVjbGFyYXRpb25NYXA6IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+LFxuICAgICAgZHRzRGVjbGFyYXRpb25NYXA6IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPiwgc3JjRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGZpbGVFeHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUoc3JjRmlsZSk7XG4gICAgaWYgKGZpbGVFeHBvcnRzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IFtleHBvcnROYW1lLCB7bm9kZTogZGVjbGFyYXRpb259XSBvZiBmaWxlRXhwb3J0cykge1xuICAgICAgICBpZiAoZGVjbGFyYXRpb24gIT09IG51bGwgJiYgZHRzRGVjbGFyYXRpb25NYXAuaGFzKGV4cG9ydE5hbWUpKSB7XG4gICAgICAgICAgZGVjbGFyYXRpb25NYXAuc2V0KGRlY2xhcmF0aW9uLCBkdHNEZWNsYXJhdGlvbk1hcC5nZXQoZXhwb3J0TmFtZSkhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBhIGZ1bmN0aW9uL21ldGhvZCBub2RlIChvciBpdHMgaW1wbGVtZW50YXRpb24pLCB0byBzZWUgaWYgaXQgcmV0dXJucyBhXG4gICAqIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3QuXG4gICAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbi5cbiAgICogQHBhcmFtIG5vZGUgdGhlIG5vZGUgdG8gY2hlY2sgLSB0aGlzIGNvdWxkIGJlIGEgZnVuY3Rpb24sIGEgbWV0aG9kIG9yIGEgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqIEBwYXJhbSBpbXBsZW1lbnRhdGlvbiB0aGUgYWN0dWFsIGZ1bmN0aW9uIGV4cHJlc3Npb24gaWYgYG5vZGVgIGlzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqIEBwYXJhbSBjb250YWluZXIgdGhlIGNsYXNzIHRoYXQgY29udGFpbnMgdGhlIGZ1bmN0aW9uLCBpZiBpdCBpcyBhIG1ldGhvZC5cbiAgICogQHJldHVybnMgaW5mbyBhYm91dCB0aGUgZnVuY3Rpb24gaWYgaXQgZG9lcyByZXR1cm4gYSBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agb2JqZWN0OyBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHBhcnNlRm9yTW9kdWxlV2l0aFByb3ZpZGVycyhcbiAgICAgIG5hbWU6IHN0cmluZywgbm9kZTogdHMuTm9kZXxudWxsLCBpbXBsZW1lbnRhdGlvbjogdHMuTm9kZXxudWxsID0gbm9kZSxcbiAgICAgIGNvbnRhaW5lcjogdHMuRGVjbGFyYXRpb258bnVsbCA9IG51bGwpOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb258bnVsbCB7XG4gICAgaWYgKGltcGxlbWVudGF0aW9uID09PSBudWxsIHx8XG4gICAgICAgICghdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKGltcGxlbWVudGF0aW9uKSAmJiAhdHMuaXNNZXRob2REZWNsYXJhdGlvbihpbXBsZW1lbnRhdGlvbikgJiZcbiAgICAgICAgICF0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihpbXBsZW1lbnRhdGlvbikpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBpbXBsZW1lbnRhdGlvbjtcbiAgICBjb25zdCBkZWZpbml0aW9uID0gdGhpcy5nZXREZWZpbml0aW9uT2ZGdW5jdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKGRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBib2R5ID0gZGVmaW5pdGlvbi5ib2R5O1xuICAgIGNvbnN0IGxhc3RTdGF0ZW1lbnQgPSBib2R5ICYmIGJvZHlbYm9keS5sZW5ndGggLSAxXTtcbiAgICBjb25zdCByZXR1cm5FeHByZXNzaW9uID1cbiAgICAgICAgbGFzdFN0YXRlbWVudCAmJiB0cy5pc1JldHVyblN0YXRlbWVudChsYXN0U3RhdGVtZW50KSAmJiBsYXN0U3RhdGVtZW50LmV4cHJlc3Npb24gfHwgbnVsbDtcbiAgICBjb25zdCBuZ01vZHVsZVByb3BlcnR5ID0gcmV0dXJuRXhwcmVzc2lvbiAmJiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHJldHVybkV4cHJlc3Npb24pICYmXG4gICAgICAgICAgICByZXR1cm5FeHByZXNzaW9uLnByb3BlcnRpZXMuZmluZChcbiAgICAgICAgICAgICAgICBwcm9wID0+XG4gICAgICAgICAgICAgICAgICAgICEhcHJvcC5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihwcm9wLm5hbWUpICYmIHByb3AubmFtZS50ZXh0ID09PSAnbmdNb2R1bGUnKSB8fFxuICAgICAgICBudWxsO1xuXG4gICAgaWYgKCFuZ01vZHVsZVByb3BlcnR5IHx8ICF0cy5pc1Byb3BlcnR5QXNzaWdubWVudChuZ01vZHVsZVByb3BlcnR5KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gVGhlIG5nTW9kdWxlVmFsdWUgY291bGQgYmUgb2YgdGhlIGZvcm0gYFNvbWVNb2R1bGVgIG9yIGBuYW1lc3BhY2VfMS5Tb21lTW9kdWxlYFxuICAgIGNvbnN0IG5nTW9kdWxlVmFsdWUgPSBuZ01vZHVsZVByb3BlcnR5LmluaXRpYWxpemVyO1xuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKG5nTW9kdWxlVmFsdWUpICYmICF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihuZ01vZHVsZVZhbHVlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGVEZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb24obmdNb2R1bGVWYWx1ZSk7XG4gICAgaWYgKCFuZ01vZHVsZURlY2xhcmF0aW9uIHx8IG5nTW9kdWxlRGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgZmluZCBhIGRlY2xhcmF0aW9uIGZvciBOZ01vZHVsZSAke1xuICAgICAgICAgIG5nTW9kdWxlVmFsdWUuZ2V0VGV4dCgpfSByZWZlcmVuY2VkIGluIFwiJHtkZWNsYXJhdGlvbiEuZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIGlmICghaGFzTmFtZUlkZW50aWZpZXIobmdNb2R1bGVEZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgbmdNb2R1bGU6IG5nTW9kdWxlRGVjbGFyYXRpb24gYXMgQ29uY3JldGVEZWNsYXJhdGlvbjxDbGFzc0RlY2xhcmF0aW9uPixcbiAgICAgIGRlY2xhcmF0aW9uLFxuICAgICAgY29udGFpbmVyXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZXhwcmVzc2lvbik7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihleHByZXNzaW9uKSB8fCAhdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZURlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG4gICAgaWYgKCFuYW1lc3BhY2VEZWNsIHx8IG5hbWVzcGFjZURlY2wubm9kZSA9PT0gbnVsbCB8fCAhdHMuaXNTb3VyY2VGaWxlKG5hbWVzcGFjZURlY2wubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZUV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShuYW1lc3BhY2VEZWNsLm5vZGUpO1xuICAgIGlmIChuYW1lc3BhY2VFeHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW5hbWVzcGFjZUV4cG9ydHMuaGFzKGV4cHJlc3Npb24ubmFtZS50ZXh0KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwb3J0RGVjbCA9IG5hbWVzcGFjZUV4cG9ydHMuZ2V0KGV4cHJlc3Npb24ubmFtZS50ZXh0KSE7XG4gICAgcmV0dXJuIHsuLi5leHBvcnREZWNsLCB2aWFNb2R1bGU6IG5hbWVzcGFjZURlY2wudmlhTW9kdWxlfTtcbiAgfVxuXG4gIC8qKiBDaGVja3MgaWYgdGhlIHNwZWNpZmllZCBkZWNsYXJhdGlvbiByZXNvbHZlcyB0byB0aGUga25vd24gSmF2YVNjcmlwdCBnbG9iYWwgYE9iamVjdGAuICovXG4gIHByb3RlY3RlZCBpc0phdmFTY3JpcHRPYmplY3REZWNsYXJhdGlvbihkZWNsOiBEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGlmIChkZWNsLm5vZGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3Qgbm9kZSA9IGRlY2wubm9kZTtcbiAgICAvLyBUaGUgZGVmYXVsdCBUeXBlU2NyaXB0IGxpYnJhcnkgdHlwZXMgdGhlIGdsb2JhbCBgT2JqZWN0YCB2YXJpYWJsZSB0aHJvdWdoXG4gICAgLy8gYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB3aXRoIGEgdHlwZSByZWZlcmVuY2UgcmVzb2x2aW5nIHRvIGBPYmplY3RDb25zdHJ1Y3RvcmAuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgfHwgIXRzLmlzSWRlbnRpZmllcihub2RlLm5hbWUpIHx8XG4gICAgICAgIG5vZGUubmFtZS50ZXh0ICE9PSAnT2JqZWN0JyB8fCBub2RlLnR5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCB0eXBlTm9kZSA9IG5vZGUudHlwZTtcbiAgICAvLyBJZiB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gZG9lcyBub3QgaGF2ZSBhIHR5cGUgcmVzb2x2aW5nIHRvIGBPYmplY3RDb25zdHJ1Y3RvcmAsXG4gICAgLy8gd2UgY2Fubm90IGd1YXJhbnRlZSB0aGF0IHRoZSBkZWNsYXJhdGlvbiByZXNvbHZlcyB0byB0aGUgZ2xvYmFsIGBPYmplY3RgIHZhcmlhYmxlLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlTm9kZSkgfHwgIXRzLmlzSWRlbnRpZmllcih0eXBlTm9kZS50eXBlTmFtZSkgfHxcbiAgICAgICAgdHlwZU5vZGUudHlwZU5hbWUudGV4dCAhPT0gJ09iamVjdENvbnN0cnVjdG9yJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgdHlwZSBkZWZpbml0aW9uIGZvciBgT2JqZWN0YCBvcmlnaW5hdGVzIGZyb20gYSBkZWZhdWx0IGxpYnJhcnlcbiAgICAvLyBkZWZpbml0aW9uIGZpbGUuIFRoaXMgcmVxdWlyZXMgZGVmYXVsdCB0eXBlcyB0byBiZSBlbmFibGVkIGZvciB0aGUgaG9zdCBwcm9ncmFtLlxuICAgIHJldHVybiB0aGlzLnNyYy5wcm9ncmFtLmlzU291cmNlRmlsZURlZmF1bHRMaWJyYXJ5KG5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBKYXZhU2NyaXB0LCBlbnVtIGRlY2xhcmF0aW9ucyBhcmUgZW1pdHRlZCBhcyBhIHJlZ3VsYXIgdmFyaWFibGUgZGVjbGFyYXRpb24gZm9sbG93ZWQgYnkgYW5cbiAgICogSUlGRSBpbiB3aGljaCB0aGUgZW51bSBtZW1iZXJzIGFyZSBhc3NpZ25lZC5cbiAgICpcbiAgICogICBleHBvcnQgdmFyIEVudW07XG4gICAqICAgKGZ1bmN0aW9uIChFbnVtKSB7XG4gICAqICAgICBFbnVtW1wiYVwiXSA9IFwiQVwiO1xuICAgKiAgICAgRW51bVtcImJcIl0gPSBcIkJcIjtcbiAgICogICB9KShFbnVtIHx8IChFbnVtID0ge30pKTtcbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIEEgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCBtYXkgcmVwcmVzZW50IGFuIGVudW1cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgZW51bSBtZW1iZXJzIGlmIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBpcyBmb2xsb3dlZCBieSBhbiBJSUZFIHRoYXRcbiAgICogZGVjbGFyZXMgdGhlIGVudW0gbWVtYmVycywgb3IgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZUVudW1NZW1iZXJzKGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKTogRW51bU1lbWJlcltdfG51bGwge1xuICAgIC8vIEluaXRpYWxpemVkIHZhcmlhYmxlcyBkb24ndCByZXByZXNlbnQgZW51bSBkZWNsYXJhdGlvbnMuXG4gICAgaWYgKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyICE9PSB1bmRlZmluZWQpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgdmFyaWFibGVTdG10ID0gZGVjbGFyYXRpb24ucGFyZW50LnBhcmVudDtcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQodmFyaWFibGVTdG10KSkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBibG9jayA9IHZhcmlhYmxlU3RtdC5wYXJlbnQ7XG4gICAgaWYgKCF0cy5pc0Jsb2NrKGJsb2NrKSAmJiAhdHMuaXNTb3VyY2VGaWxlKGJsb2NrKSkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbkluZGV4ID0gYmxvY2suc3RhdGVtZW50cy5maW5kSW5kZXgoc3RhdGVtZW50ID0+IHN0YXRlbWVudCA9PT0gdmFyaWFibGVTdG10KTtcbiAgICBpZiAoZGVjbGFyYXRpb25JbmRleCA9PT0gLTEgfHwgZGVjbGFyYXRpb25JbmRleCA9PT0gYmxvY2suc3RhdGVtZW50cy5sZW5ndGggLSAxKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHN1YnNlcXVlbnRTdG10ID0gYmxvY2suc3RhdGVtZW50c1tkZWNsYXJhdGlvbkluZGV4ICsgMV07XG4gICAgaWYgKCF0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3Vic2VxdWVudFN0bXQpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGlpZmUgPSBzdHJpcFBhcmVudGhlc2VzKHN1YnNlcXVlbnRTdG10LmV4cHJlc3Npb24pO1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihpaWZlKSB8fCAhaXNFbnVtRGVjbGFyYXRpb25JaWZlKGlpZmUpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGZuID0gc3RyaXBQYXJlbnRoZXNlcyhpaWZlLmV4cHJlc3Npb24pO1xuICAgIGlmICghdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oZm4pKSByZXR1cm4gbnVsbDtcblxuICAgIHJldHVybiB0aGlzLnJlZmxlY3RFbnVtTWVtYmVycyhmbik7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gZXh0cmFjdCBhbGwgYEVudW1NZW1iZXJgcyBmcm9tIGEgZnVuY3Rpb24gdGhhdCBpcyBhY2NvcmRpbmcgdG8gdGhlIEphdmFTY3JpcHQgZW1pdFxuICAgKiBmb3JtYXQgZm9yIGVudW1zOlxuICAgKlxuICAgKiAgIGZ1bmN0aW9uIChFbnVtKSB7XG4gICAqICAgICBFbnVtW1wiTWVtYmVyQVwiXSA9IFwiYVwiO1xuICAgKiAgICAgRW51bVtcIk1lbWJlckJcIl0gPSBcImJcIjtcbiAgICogICB9XG4gICAqXG4gICAqIEBwYXJhbSBmbiBUaGUgZnVuY3Rpb24gZXhwcmVzc2lvbiB0aGF0IGlzIGFzc3VtZWQgdG8gY29udGFpbiBlbnVtIG1lbWJlcnMuXG4gICAqIEByZXR1cm5zIEFsbCBlbnVtIG1lbWJlcnMgaWYgdGhlIGZ1bmN0aW9uIGlzIGFjY29yZGluZyB0byB0aGUgY29ycmVjdCBzeW50YXgsIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSByZWZsZWN0RW51bU1lbWJlcnMoZm46IHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IEVudW1NZW1iZXJbXXxudWxsIHtcbiAgICBpZiAoZm4ucGFyYW1ldGVycy5sZW5ndGggIT09IDEpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgZW51bU5hbWUgPSBmbi5wYXJhbWV0ZXJzWzBdLm5hbWU7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZW51bU5hbWUpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGVudW1NZW1iZXJzOiBFbnVtTWVtYmVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiBmbi5ib2R5LnN0YXRlbWVudHMpIHtcbiAgICAgIGNvbnN0IGVudW1NZW1iZXIgPSB0aGlzLnJlZmxlY3RFbnVtTWVtYmVyKGVudW1OYW1lLCBzdGF0ZW1lbnQpO1xuICAgICAgaWYgKGVudW1NZW1iZXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBlbnVtTWVtYmVycy5wdXNoKGVudW1NZW1iZXIpO1xuICAgIH1cbiAgICByZXR1cm4gZW51bU1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gZXh0cmFjdCBhIHNpbmdsZSBgRW51bU1lbWJlcmAgZnJvbSBhIHN0YXRlbWVudCBpbiB0aGUgZm9sbG93aW5nIHN5bnRheDpcbiAgICpcbiAgICogICBFbnVtW1wiTWVtYmVyQVwiXSA9IFwiYVwiO1xuICAgKlxuICAgKiBvciwgZm9yIGVudW0gbWVtYmVyIHdpdGggbnVtZXJpYyB2YWx1ZXM6XG4gICAqXG4gICAqICAgRW51bVtFbnVtW1wiTWVtYmVyQVwiXSA9IDBdID0gXCJNZW1iZXJBXCI7XG4gICAqXG4gICAqIEBwYXJhbSBlbnVtTmFtZSBUaGUgaWRlbnRpZmllciBvZiB0aGUgZW51bSB0aGF0IHRoZSBtZW1iZXJzIHNob3VsZCBiZSBzZXQgb24uXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgVGhlIHN0YXRlbWVudCB0byBpbnNwZWN0LlxuICAgKiBAcmV0dXJucyBBbiBgRW51bU1lbWJlcmAgaWYgdGhlIHN0YXRlbWVudCBpcyBhY2NvcmRpbmcgdG8gdGhlIGV4cGVjdGVkIHN5bnRheCwgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdEVudW1NZW1iZXIoZW51bU5hbWU6IHRzLklkZW50aWZpZXIsIHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogRW51bU1lbWJlcnxudWxsIHtcbiAgICBpZiAoIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGV4cHJlc3Npb24gPSBzdGF0ZW1lbnQuZXhwcmVzc2lvbjtcblxuICAgIC8vIENoZWNrIGZvciB0aGUgYEVudW1bWF0gPSBZO2AgY2FzZS5cbiAgICBpZiAoIWlzRW51bUFzc2lnbm1lbnQoZW51bU5hbWUsIGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgYXNzaWdubWVudCA9IHJlZmxlY3RFbnVtQXNzaWdubWVudChleHByZXNzaW9uKTtcbiAgICBpZiAoYXNzaWdubWVudCAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gYXNzaWdubWVudDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgdGhlIGBFbnVtW0VudW1bWF0gPSBZXSA9IC4uLjtgIGNhc2UuXG4gICAgY29uc3QgaW5uZXJFeHByZXNzaW9uID0gZXhwcmVzc2lvbi5sZWZ0LmFyZ3VtZW50RXhwcmVzc2lvbjtcbiAgICBpZiAoIWlzRW51bUFzc2lnbm1lbnQoZW51bU5hbWUsIGlubmVyRXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcmVmbGVjdEVudW1Bc3NpZ25tZW50KGlubmVyRXhwcmVzc2lvbik7XG4gIH1cbn1cblxuLy8vLy8vLy8vLy8vLyBFeHBvcnRlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciB0aGUgaWlmZSBoYXMgdGhlIGZvbGxvd2luZyBjYWxsIHNpZ25hdHVyZTpcbiAqXG4gKiAgIChFbnVtIHx8IChFbnVtID0ge30pXG4gKlxuICogTm90ZSB0aGF0IHRoZSBgRW51bWAgaWRlbnRpZmllciBpcyBub3QgY2hlY2tlZCwgYXMgaXQgY291bGQgYWxzbyBiZSBzb21ldGhpbmdcbiAqIGxpa2UgYGV4cG9ydHMuRW51bWAuIEluc3RlYWQsIG9ubHkgdGhlIHN0cnVjdHVyZSBvZiBiaW5hcnkgb3BlcmF0b3JzIGlzIGNoZWNrZWQuXG4gKlxuICogQHBhcmFtIGlpZmUgVGhlIGNhbGwgZXhwcmVzc2lvbiB0byBjaGVjay5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGlpZmUgaGFzIGEgY2FsbCBzaWduYXR1cmUgdGhhdCBjb3JyZXNwb25kcyB3aXRoIGEgcG90ZW50aWFsXG4gKiBlbnVtIGRlY2xhcmF0aW9uLlxuICovXG5mdW5jdGlvbiBpc0VudW1EZWNsYXJhdGlvbklpZmUoaWlmZTogdHMuQ2FsbEV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgaWYgKGlpZmUuYXJndW1lbnRzLmxlbmd0aCAhPT0gMSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGFyZyA9IGlpZmUuYXJndW1lbnRzWzBdO1xuICBpZiAoIXRzLmlzQmluYXJ5RXhwcmVzc2lvbihhcmcpIHx8IGFyZy5vcGVyYXRvclRva2VuLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuQmFyQmFyVG9rZW4gfHxcbiAgICAgICF0cy5pc1BhcmVudGhlc2l6ZWRFeHByZXNzaW9uKGFyZy5yaWdodCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCByaWdodCA9IGFyZy5yaWdodC5leHByZXNzaW9uO1xuICBpZiAoIXRzLmlzQmluYXJ5RXhwcmVzc2lvbihyaWdodCkgfHwgcmlnaHQub3BlcmF0b3JUb2tlbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHJpZ2h0LnJpZ2h0KSB8fCByaWdodC5yaWdodC5wcm9wZXJ0aWVzLmxlbmd0aCAhPT0gMCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEFuIGVudW0gbWVtYmVyIGFzc2lnbm1lbnQgdGhhdCBsb29rcyBsaWtlIGBFbnVtW1hdID0gWTtgLlxuICovXG5leHBvcnQgdHlwZSBFbnVtTWVtYmVyQXNzaWdubWVudCA9IHRzLkJpbmFyeUV4cHJlc3Npb24me2xlZnQ6IHRzLkVsZW1lbnRBY2Nlc3NFeHByZXNzaW9ufTtcblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciB0aGUgZXhwcmVzc2lvbiBsb29rcyBsaWtlIGFuIGVudW0gbWVtYmVyIGFzc2lnbm1lbnQgdGFyZ2V0aW5nIGBFbnVtYDpcbiAqXG4gKiAgIEVudW1bWF0gPSBZO1xuICpcbiAqIEhlcmUsIFggYW5kIFkgY2FuIGJlIGFueSBleHByZXNzaW9uLlxuICpcbiAqIEBwYXJhbSBlbnVtTmFtZSBUaGUgaWRlbnRpZmllciBvZiB0aGUgZW51bSB0aGF0IHRoZSBtZW1iZXJzIHNob3VsZCBiZSBzZXQgb24uXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiBUaGUgZXhwcmVzc2lvbiB0aGF0IHNob3VsZCBiZSBjaGVja2VkIHRvIGNvbmZvcm0gdG8gdGhlIGFib3ZlIGZvcm0uXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGlzIG9mIHRoZSBjb3JyZWN0IGZvcm0sIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gaXNFbnVtQXNzaWdubWVudChcbiAgICBlbnVtTmFtZTogdHMuSWRlbnRpZmllciwgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGV4cHJlc3Npb24gaXMgRW51bU1lbWJlckFzc2lnbm1lbnQge1xuICBpZiAoIXRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSB8fFxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4gfHxcbiAgICAgICF0cy5pc0VsZW1lbnRBY2Nlc3NFeHByZXNzaW9uKGV4cHJlc3Npb24ubGVmdCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBWZXJpZnkgdGhhdCB0aGUgb3V0ZXIgYXNzaWdubWVudCBjb3JyZXNwb25kcyB3aXRoIHRoZSBlbnVtIGRlY2xhcmF0aW9uLlxuICBjb25zdCBlbnVtSWRlbnRpZmllciA9IGV4cHJlc3Npb24ubGVmdC5leHByZXNzaW9uO1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKGVudW1JZGVudGlmaWVyKSAmJiBlbnVtSWRlbnRpZmllci50ZXh0ID09PSBlbnVtTmFtZS50ZXh0O1xufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIGNyZWF0ZSBhbiBgRW51bU1lbWJlcmAgZnJvbSBhbiBleHByZXNzaW9uIHRoYXQgaXMgYmVsaWV2ZWQgdG8gcmVwcmVzZW50IGFuIGVudW1cbiAqIGFzc2lnbm1lbnQuXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gVGhlIGV4cHJlc3Npb24gdGhhdCBpcyBiZWxpZXZlZCB0byBiZSBhbiBlbnVtIGFzc2lnbm1lbnQuXG4gKiBAcmV0dXJucyBBbiBgRW51bU1lbWJlcmAgb3IgbnVsbCBpZiB0aGUgZXhwcmVzc2lvbiBkaWQgbm90IHJlcHJlc2VudCBhbiBlbnVtIG1lbWJlciBhZnRlciBhbGwuXG4gKi9cbmZ1bmN0aW9uIHJlZmxlY3RFbnVtQXNzaWdubWVudChleHByZXNzaW9uOiBFbnVtTWVtYmVyQXNzaWdubWVudCk6IEVudW1NZW1iZXJ8bnVsbCB7XG4gIGNvbnN0IG1lbWJlck5hbWUgPSBleHByZXNzaW9uLmxlZnQuYXJndW1lbnRFeHByZXNzaW9uO1xuICBpZiAoIXRzLmlzUHJvcGVydHlOYW1lKG1lbWJlck5hbWUpKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge25hbWU6IG1lbWJlck5hbWUsIGluaXRpYWxpemVyOiBleHByZXNzaW9uLnJpZ2h0fTtcbn1cblxuZXhwb3J0IHR5cGUgUGFyYW1JbmZvID0ge1xuICBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsLFxuICB0eXBlRXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbnxudWxsXG59O1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjYWxsIHRvIGB0c2xpYi5fX21ldGFkYXRhYCBhcyBwcmVzZW50IGluIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy4gVGhpcyBpcyBhXG4gKiBzeW50aGV0aWMgZGVjb3JhdG9yIGluc2VydGVkIGJ5IFR5cGVTY3JpcHQgdGhhdCBjb250YWlucyByZWZsZWN0aW9uIGluZm9ybWF0aW9uIGFib3V0IHRoZVxuICogdGFyZ2V0IG9mIHRoZSBkZWNvcmF0b3IsIGkuZS4gdGhlIGNsYXNzIG9yIHByb3BlcnR5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlclR5cGVzIHtcbiAgdHlwZTogJ3BhcmFtcyc7XG4gIHR5cGVzOiB0cy5FeHByZXNzaW9uW107XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNhbGwgdG8gYHRzbGliLl9fcGFyYW1gIGFzIHByZXNlbnQgaW4gYHRzbGliLl9fZGVjb3JhdGVgIGNhbGxzLiBUaGlzIGNvbnRhaW5zXG4gKiBpbmZvcm1hdGlvbiBvbiBhbnkgZGVjb3JhdG9ycyB3ZXJlIGFwcGxpZWQgdG8gYSBjZXJ0YWluIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXJEZWNvcmF0b3JzIHtcbiAgdHlwZTogJ3BhcmFtOmRlY29yYXRvcnMnO1xuICBpbmRleDogbnVtYmVyO1xuICBkZWNvcmF0b3I6IERlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2FsbCB0byBhIGRlY29yYXRvciBhcyBpdCB3YXMgcHJlc2VudCBpbiB0aGUgb3JpZ2luYWwgc291cmNlIGNvZGUsIGFzIHByZXNlbnQgaW5cbiAqIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZWNvcmF0b3JDYWxsIHtcbiAgdHlwZTogJ2RlY29yYXRvcic7XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGRpZmZlcmVudCBraW5kcyBvZiBkZWNvcmF0ZSBoZWxwZXJzIHRoYXQgbWF5IGJlIHByZXNlbnQgYXMgZmlyc3QgYXJndW1lbnQgdG9cbiAqIGB0c2xpYi5fX2RlY29yYXRlYCwgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBcbiAqIF9fZGVjb3JhdGUoW1xuICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gKiAgIHRzbGliXzEuX19wYXJhbSgyLCBJbmplY3QoSU5KRUNURURfVE9LRU4pKSxcbiAqICAgdHNsaWJfMS5fX21ldGFkYXRhKFwiZGVzaWduOnBhcmFtdHlwZXNcIiwgW1ZpZXdDb250YWluZXJSZWYsIFRlbXBsYXRlUmVmLCBTdHJpbmddKVxuICogXSwgU29tZURpcmVjdGl2ZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgRGVjb3JhdGVIZWxwZXJFbnRyeSA9IFBhcmFtZXRlclR5cGVzfFBhcmFtZXRlckRlY29yYXRvcnN8RGVjb3JhdG9yQ2FsbDtcblxuLyoqXG4gKiBUaGUgcmVjb3JkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uIG9mIGEgc2luZ2xlIGNsYXNzLiBUaGlzIGluZm9ybWF0aW9uIGlzIGNhY2hlZCBpbiB0aGUgaG9zdC5cbiAqL1xuaW50ZXJmYWNlIERlY29yYXRvckluZm8ge1xuICAvKipcbiAgICogQWxsIGRlY29yYXRvcnMgdGhhdCB3ZXJlIHByZXNlbnQgb24gdGhlIGNsYXNzLiBJZiBubyBkZWNvcmF0b3JzIHdlcmUgcHJlc2VudCwgdGhpcyBpcyBgbnVsbGBcbiAgICovXG4gIGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbDtcblxuICAvKipcbiAgICogQWxsIGRlY29yYXRvcnMgcGVyIG1lbWJlciBvZiB0aGUgY2xhc3MgdGhleSB3ZXJlIHByZXNlbnQgb24uXG4gICAqL1xuICBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT47XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBpbmZvcm1hdGlvbiwgc3VjaCBhcyB0aGUgdHlwZSBvZiBhIHBhcmFtZXRlciBhbmQgYWxsXG4gICAqIGRlY29yYXRvcnMgZm9yIGEgY2VydGFpbiBwYXJhbWV0ZXIuIEluZGljZXMgaW4gdGhpcyBhcnJheSBjb3JyZXNwb25kIHdpdGggdGhlIHBhcmFtZXRlcidzXG4gICAqIGluZGV4IGluIHRoZSBjb25zdHJ1Y3Rvci4gTm90ZSB0aGF0IHRoaXMgYXJyYXkgbWF5IGJlIHNwYXJzZSwgaS5lLiBjZXJ0YWluIGNvbnN0cnVjdG9yXG4gICAqIHBhcmFtZXRlcnMgbWF5IG5vdCBoYXZlIGFueSBpbmZvIHJlY29yZGVkLlxuICAgKi9cbiAgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdO1xufVxuXG4vKipcbiAqIEEgc3RhdGVtZW50IG5vZGUgdGhhdCByZXByZXNlbnRzIGFuIGFzc2lnbm1lbnQuXG4gKi9cbmV4cG9ydCB0eXBlIEFzc2lnbm1lbnRTdGF0ZW1lbnQgPVxuICAgIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQme2V4cHJlc3Npb246IHtsZWZ0OiB0cy5JZGVudGlmaWVyLCByaWdodDogdHMuRXhwcmVzc2lvbn19O1xuXG4vKipcbiAqIFRlc3Qgd2hldGhlciBhIHN0YXRlbWVudCBub2RlIGlzIGFuIGFzc2lnbm1lbnQgc3RhdGVtZW50LlxuICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRvIHRlc3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBzdGF0ZW1lbnQgaXMgQXNzaWdubWVudFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiBpc0Fzc2lnbm1lbnQoc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdCk7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGBleHByZXNzaW9uYCB0aGF0IGlzIGJlbGlldmVkIHRvIGJlIGFuIElJRkUgYW5kIHJldHVybiB0aGUgQVNUIG5vZGUgdGhhdCBjb3JyZXNwb25kcyB0b1xuICogdGhlIGJvZHkgb2YgdGhlIElJRkUuXG4gKlxuICogVGhlIGV4cHJlc3Npb24gbWF5IGJlIHdyYXBwZWQgaW4gcGFyZW50aGVzZXMsIHdoaWNoIGFyZSBzdHJpcHBlZCBvZmYuXG4gKlxuICogSWYgdGhlIElJRkUgaXMgYW4gYXJyb3cgZnVuY3Rpb24gdGhlbiBpdHMgYm9keSBjb3VsZCBiZSBhIGB0cy5FeHByZXNzaW9uYCByYXRoZXIgdGhhbiBhXG4gKiBgdHMuRnVuY3Rpb25Cb2R5YC5cbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiB0aGUgZXhwcmVzc2lvbiB0byBwYXJzZS5cbiAqIEByZXR1cm5zIHRoZSBgdHMuRXhwcmVzc2lvbmAgb3IgYHRzLkZ1bmN0aW9uQm9keWAgdGhhdCBob2xkcyB0aGUgYm9keSBvZiB0aGUgSUlGRSBvciBgdW5kZWZpbmVkYFxuICogICAgIGlmIHRoZSBgZXhwcmVzc2lvbmAgZGlkIG5vdCBoYXZlIHRoZSBjb3JyZWN0IHNoYXBlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SWlmZUNvbmNpc2VCb2R5KGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiB0cy5Db25jaXNlQm9keXx1bmRlZmluZWQge1xuICBjb25zdCBjYWxsID0gc3RyaXBQYXJlbnRoZXNlcyhleHByZXNzaW9uKTtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGNhbGwpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IGZuID0gc3RyaXBQYXJlbnRoZXNlcyhjYWxsLmV4cHJlc3Npb24pO1xuICBpZiAoIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGZuKSAmJiAhdHMuaXNBcnJvd0Z1bmN0aW9uKGZuKSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICByZXR1cm4gZm4uYm9keTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGBub2RlYCBpcyBhbiBhc3NpZ25tZW50IG9mIHRoZSBmb3JtIGBhID0gYmAuXG4gKlxuICogQHBhcmFtIG5vZGUgVGhlIEFTVCBub2RlIHRvIGNoZWNrLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBc3NpZ25tZW50KG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLkFzc2lnbm1lbnRFeHByZXNzaW9uPHRzLkVxdWFsc1Rva2VuPiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgbm9kZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW47XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgcHJvdmlkZWQgY2FsbCBleHByZXNzaW9uIHRhcmdldHMgYSBjbGFzcywgYnkgdmVyaWZ5aW5nIGl0cyBhcmd1bWVudHMgYXJlXG4gKiBhY2NvcmRpbmcgdG8gdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogX19kZWNvcmF0ZShbXSwgU29tZURpcmVjdGl2ZSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gY2FsbCB0aGUgY2FsbCBleHByZXNzaW9uIHRoYXQgaXMgdGVzdGVkIHRvIHJlcHJlc2VudCBhIGNsYXNzIGRlY29yYXRvciBjYWxsLlxuICogQHBhcmFtIG1hdGNoZXMgcHJlZGljYXRlIGZ1bmN0aW9uIHRvIHRlc3Qgd2hldGhlciB0aGUgY2FsbCBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGRlc2lyZWQgY2xhc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0NsYXNzRGVjb3JhdGVDYWxsKFxuICAgIGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uLCBtYXRjaGVzOiAoaWRlbnRpZmllcjogdHMuSWRlbnRpZmllcikgPT4gYm9vbGVhbik6XG4gICAgY2FsbCBpcyB0cy5DYWxsRXhwcmVzc2lvbiZ7YXJndW1lbnRzOiBbdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgdHMuRXhwcmVzc2lvbl19IHtcbiAgY29uc3QgaGVscGVyQXJncyA9IGNhbGwuYXJndW1lbnRzWzBdO1xuICBpZiAoaGVscGVyQXJncyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oaGVscGVyQXJncykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCB0YXJnZXQgPSBjYWxsLmFyZ3VtZW50c1sxXTtcbiAgcmV0dXJuIHRhcmdldCAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpICYmIG1hdGNoZXModGFyZ2V0KTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBwcm92aWRlZCBjYWxsIGV4cHJlc3Npb24gdGFyZ2V0cyBhIG1lbWJlciBvZiB0aGUgY2xhc3MsIGJ5IHZlcmlmeWluZyBpdHNcbiAqIGFyZ3VtZW50cyBhcmUgYWNjb3JkaW5nIHRvIHRoZSBmb2xsb3dpbmcgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIF9fZGVjb3JhdGUoW10sIFNvbWVEaXJlY3RpdmUucHJvdG90eXBlLCBcIm1lbWJlclwiLCB2b2lkIDApO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGNhbGwgdGhlIGNhbGwgZXhwcmVzc2lvbiB0aGF0IGlzIHRlc3RlZCB0byByZXByZXNlbnQgYSBtZW1iZXIgZGVjb3JhdG9yIGNhbGwuXG4gKiBAcGFyYW0gbWF0Y2hlcyBwcmVkaWNhdGUgZnVuY3Rpb24gdG8gdGVzdCB3aGV0aGVyIHRoZSBjYWxsIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGVzaXJlZCBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTWVtYmVyRGVjb3JhdGVDYWxsKFxuICAgIGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uLCBtYXRjaGVzOiAoaWRlbnRpZmllcjogdHMuSWRlbnRpZmllcikgPT4gYm9vbGVhbik6XG4gICAgY2FsbCBpcyB0cy5DYWxsRXhwcmVzc2lvbiZcbiAgICB7YXJndW1lbnRzOiBbdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgdHMuU3RyaW5nTGl0ZXJhbCwgdHMuU3RyaW5nTGl0ZXJhbF19IHtcbiAgY29uc3QgaGVscGVyQXJncyA9IGNhbGwuYXJndW1lbnRzWzBdO1xuICBpZiAoaGVscGVyQXJncyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oaGVscGVyQXJncykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCB0YXJnZXQgPSBjYWxsLmFyZ3VtZW50c1sxXTtcbiAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbih0YXJnZXQpIHx8XG4gICAgICAhdHMuaXNJZGVudGlmaWVyKHRhcmdldC5leHByZXNzaW9uKSB8fCAhbWF0Y2hlcyh0YXJnZXQuZXhwcmVzc2lvbikgfHxcbiAgICAgIHRhcmdldC5uYW1lLnRleHQgIT09ICdwcm90b3R5cGUnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgbWVtYmVyTmFtZSA9IGNhbGwuYXJndW1lbnRzWzJdO1xuICByZXR1cm4gbWVtYmVyTmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzU3RyaW5nTGl0ZXJhbChtZW1iZXJOYW1lKTtcbn1cblxuLyoqXG4gKiBIZWxwZXIgbWV0aG9kIHRvIGV4dHJhY3QgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgZ2l2ZW4gdGhlIHByb3BlcnR5J3MgXCJzeW1ib2xcIixcbiAqIHdoaWNoIGlzIGFjdHVhbGx5IHRoZSBzeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIHByb3BlcnR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocHJvcFN5bWJvbDogdHMuU3ltYm9sKTogdHMuRXhwcmVzc2lvbnx1bmRlZmluZWQge1xuICBjb25zdCBwcm9wSWRlbnRpZmllciA9IHByb3BTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgY29uc3QgcGFyZW50ID0gcHJvcElkZW50aWZpZXIgJiYgcHJvcElkZW50aWZpZXIucGFyZW50O1xuICByZXR1cm4gcGFyZW50ICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihwYXJlbnQpID8gcGFyZW50LnJpZ2h0IDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEEgY2FsbGVlIGNvdWxkIGJlIG9uZSBvZjogYF9fZGVjb3JhdGUoLi4uKWAgb3IgYHRzbGliXzEuX19kZWNvcmF0ZWAuXG4gKi9cbmZ1bmN0aW9uIGdldENhbGxlZU5hbWUoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pOiBzdHJpbmd8bnVsbCB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIoY2FsbC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBzdHJpcERvbGxhclN1ZmZpeChjYWxsLmV4cHJlc3Npb24udGV4dCk7XG4gIH1cbiAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gc3RyaXBEb2xsYXJTdWZmaXgoY2FsbC5leHByZXNzaW9uLm5hbWUudGV4dCk7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vLy8vLy8vLy8vLy8gSW50ZXJuYWwgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlczpcbiAqXG4gKiBgYGBcbiAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAqIGBgYFxuICpcbiAqIG9yXG4gKlxuICogYGBgXG4gKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9ICgoKSA9PiB7IGNsYXNzIE15Q2xhc3Mge30gLi4uIHJldHVybiBNeUNsYXNzOyB9KSgpXG4gKiBgYGBcbiAqXG4gKiBIZXJlLCB0aGUgaW50ZXJtZWRpYXRlIGBNeUNsYXNzXzFgIGFzc2lnbm1lbnQgaXMgb3B0aW9uYWwuIEluIHRoZSBhYm92ZSBleGFtcGxlLCB0aGVcbiAqIGBjbGFzcyBNeUNsYXNzIHt9YCBleHByZXNzaW9uIGlzIHJldHVybmVkIGFzIGRlY2xhcmF0aW9uIG9mIGB2YXIgTXlDbGFzc2AuIElmIHRoZSB2YXJpYWJsZVxuICogaXMgbm90IGluaXRpYWxpemVkIHVzaW5nIGEgY2xhc3MgZXhwcmVzc2lvbiwgbnVsbCBpcyByZXR1cm5lZC5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgbm9kZSB0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzIHdob3NlIGRlY2xhcmF0aW9uIHdlIGFyZSBmaW5kaW5nLlxuICogQHJldHVybnMgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBjbGFzcyBvciBgbnVsbGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiLlxuICovXG5mdW5jdGlvbiBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6XG4gICAgQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0V4cHJlc3Npb258dHMuQ2xhc3NEZWNsYXJhdGlvbj58bnVsbCB7XG4gIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpIHx8IG5vZGUuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIC8vIFJlY29nbml6ZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb3JtIGB2YXIgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge31gIG9yXG4gIC8vIGB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307YFxuICBsZXQgZXhwcmVzc2lvbiA9IG5vZGUuaW5pdGlhbGl6ZXI7XG4gIHdoaWxlIChpc0Fzc2lnbm1lbnQoZXhwcmVzc2lvbikpIHtcbiAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5yaWdodDtcbiAgfVxuICBpZiAodHMuaXNDbGFzc0V4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgaGFzTmFtZUlkZW50aWZpZXIoZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gZXhwcmVzc2lvbjtcbiAgfVxuXG4gIC8vIFRyeSB0byBwYXJzZSBvdXQgYSBjbGFzcyBkZWNsYXJhdGlvbiB3cmFwcGVkIGluIGFuIElJRkUgKGFzIGdlbmVyYXRlZCBieSBUUyAzLjkpXG4gIC8vIGUuZy5cbiAgLy8gLyogQGNsYXNzICovID0gKCgpID0+IHtcbiAgLy8gICBjbGFzcyBNeUNsYXNzIHt9XG4gIC8vICAgLi4uXG4gIC8vICAgcmV0dXJuIE15Q2xhc3M7XG4gIC8vIH0pKCk7XG4gIGNvbnN0IGlpZmVCb2R5ID0gZ2V0SWlmZUNvbmNpc2VCb2R5KGV4cHJlc3Npb24pO1xuICBpZiAoaWlmZUJvZHkgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIC8vIEV4dHJhY3QgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIGZyb20gaW5zaWRlIHRoZSBJSUZFLlxuICBjb25zdCBpbm5lckRlY2xhcmF0aW9uID0gdHMuaXNCbG9jayhpaWZlQm9keSkgP1xuICAgICAgaWlmZUJvZHkuc3RhdGVtZW50cy5maW5kKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbikgOlxuICAgICAgdHMuaXNDbGFzc0V4cHJlc3Npb24oaWlmZUJvZHkpID8gaWlmZUJvZHkgOiB1bmRlZmluZWQ7XG4gIGlmIChpbm5lckRlY2xhcmF0aW9uID09PSB1bmRlZmluZWQgfHwgIWhhc05hbWVJZGVudGlmaWVyKGlubmVyRGVjbGFyYXRpb24pKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIGlubmVyRGVjbGFyYXRpb247XG59XG5cbmZ1bmN0aW9uIGdldERlY29yYXRvckFyZ3Mobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uW10ge1xuICAvLyBUaGUgYXJndW1lbnRzIG9mIGEgZGVjb3JhdG9yIGFyZSBoZWxkIGluIHRoZSBgYXJnc2AgcHJvcGVydHkgb2YgaXRzIGRlY2xhcmF0aW9uIG9iamVjdC5cbiAgY29uc3QgYXJnc1Byb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKHByb3BlcnR5ID0+IGdldE5hbWVUZXh0KHByb3BlcnR5Lm5hbWUpID09PSAnYXJncycpO1xuICBjb25zdCBhcmdzRXhwcmVzc2lvbiA9IGFyZ3NQcm9wZXJ0eSAmJiBhcmdzUHJvcGVydHkuaW5pdGlhbGl6ZXI7XG4gIHJldHVybiBhcmdzRXhwcmVzc2lvbiAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oYXJnc0V4cHJlc3Npb24pID9cbiAgICAgIEFycmF5LmZyb20oYXJnc0V4cHJlc3Npb24uZWxlbWVudHMpIDpcbiAgICAgIFtdO1xufVxuXG5mdW5jdGlvbiBpc1Byb3BlcnR5QWNjZXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiZcbiAgICB7cGFyZW50OiB0cy5CaW5hcnlFeHByZXNzaW9ufSB7XG4gIHJldHVybiAhIW5vZGUucGFyZW50ICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlLnBhcmVudCkgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGlzVGhpc0Fzc2lnbm1lbnQobm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLkJpbmFyeUV4cHJlc3Npb24mXG4gICAge2xlZnQ6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbn0ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUubGVmdCkgJiZcbiAgICAgIG5vZGUubGVmdC5leHByZXNzaW9uLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQ7XG59XG5cbmZ1bmN0aW9uIGlzTmFtZWREZWNsYXJhdGlvbihub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXMgdHMuTmFtZWREZWNsYXJhdGlvbiZcbiAgICB7bmFtZTogdHMuSWRlbnRpZmllcn0ge1xuICBjb25zdCBhbnlOb2RlOiBhbnkgPSBub2RlO1xuICByZXR1cm4gISFhbnlOb2RlLm5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKGFueU5vZGUubmFtZSk7XG59XG5cblxuZnVuY3Rpb24gaXNDbGFzc01lbWJlclR5cGUobm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLkNsYXNzRWxlbWVudHxcbiAgICB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb258dHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIHJldHVybiAodHMuaXNDbGFzc0VsZW1lbnQobm9kZSkgfHwgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSB8fCB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkpICYmXG4gICAgICAvLyBBZGRpdGlvbmFsbHksIGVuc3VyZSBgbm9kZWAgaXMgbm90IGFuIGluZGV4IHNpZ25hdHVyZSwgZm9yIGV4YW1wbGUgb24gYW4gYWJzdHJhY3QgY2xhc3M6XG4gICAgICAvLyBgYWJzdHJhY3QgY2xhc3MgRm9vIHsgW2tleTogc3RyaW5nXTogYW55OyB9YFxuICAgICAgIXRzLmlzSW5kZXhTaWduYXR1cmVEZWNsYXJhdGlvbihub2RlKTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRoYXQgdGhlIGdpdmVuIGRlY2xhcmF0aW9uIGlzIGFzc2lnbmVkIHRvLlxuICogRm9yIGV4YW1wbGUsIGZvciB0aGUgZm9sbG93aW5nIGNvZGU6XG4gKlxuICogYGBgXG4gKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gKiBgYGBcbiAqXG4gKiBvclxuICpcbiAqIGBgYFxuICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSAoKCkgPT4ge1xuICogICBjbGFzcyBNeUNsYXNzIHt9XG4gKiAgIC4uLlxuICogICByZXR1cm4gTXlDbGFzcztcbiAqIH0pKClcbiAgYGBgXG4gKlxuICogYW5kIHRoZSBwcm92aWRlZCBkZWNsYXJhdGlvbiBiZWluZyBgY2xhc3MgTXlDbGFzcyB7fWAsIHRoaXMgd2lsbCByZXR1cm4gdGhlIGB2YXIgTXlDbGFzc2BcbiAqIGRlY2xhcmF0aW9uLlxuICpcbiAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gZm9yIHdoaWNoIGFueSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzaG91bGQgYmUgb2J0YWluZWQuXG4gKiBAcmV0dXJucyB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24gaWYgZm91bmQsIHVuZGVmaW5lZCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGdldFZhcmlhYmxlRGVjbGFyYXRpb25PZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLlZhcmlhYmxlRGVjbGFyYXRpb258XG4gICAgdW5kZWZpbmVkIHtcbiAgbGV0IG5vZGUgPSBkZWNsYXJhdGlvbi5wYXJlbnQ7XG5cbiAgLy8gRGV0ZWN0IGFuIGludGVybWVkaWFyeSB2YXJpYWJsZSBhc3NpZ25tZW50IGFuZCBza2lwIG92ZXIgaXQuXG4gIGlmIChpc0Fzc2lnbm1lbnQobm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUubGVmdCkpIHtcbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpID8gbm9kZSA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBBIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG1heSBoYXZlIGJlZW4gXCJzeW50aGVzaXplZFwiIGJ5IFR5cGVTY3JpcHQgZHVyaW5nIEphdmFTY3JpcHQgZW1pdCxcbiAqIGluIHRoZSBjYXNlIG5vIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGUuZy4gcHJvcGVydHkgaW5pdGlhbGl6ZXJzIGFyZSB1c2VkLlxuICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAqIGNvbXBpbGVyIGdlbmVyYXRlcyBhIHN5bnRoZXRpYyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gKiBvcmlnaW5hbGx5IGhhdmUgYSBjb25zdHJ1Y3RvciBpbiB0aGUgVHlwZVNjcmlwdCBzb3VyY2UuIFdoZW4gYSBjbGFzcyBoYXMgYSBzdXBlcmNsYXNzLFxuICogYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciBtdXN0IG5vdCBiZSBjb25zaWRlcmVkIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXRcbiAqIHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5IG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiB0aGF0IGRvZXMgbm90IGluamVjdCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0XG4gKiBzeW50aGVzaXplZCBzdXBlciBjYWxsIGluIHRoZSBjb25zdHJ1Y3RvciBib2R5LCBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHRcbiAqIGVtaXRzIGR1cmluZyBKYXZhU2NyaXB0IGVtaXQ6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi92My4yLjIvc3JjL2NvbXBpbGVyL3RyYW5zZm9ybWVycy90cy50cyNMMTA2OC1MMTA4MlxuICpcbiAqIEBwYXJhbSBjb25zdHJ1Y3RvciBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIHRlc3RcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGNvbnN0cnVjdG9yIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcjogdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGNvbnN0cnVjdG9yLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgaWYgKCFmaXJzdFN0YXRlbWVudCB8fCAhdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkU3VwZXJDYWxsKGZpcnN0U3RhdGVtZW50LmV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWQgYnkgVHlwZVNjcmlwdCwgaS5lLiB3aGV0aGVyXG4gKiBpdCBpcyBvZiB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBzdXBlciguLi5hcmd1bWVudHMpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBpcyB0byBiZSB0ZXN0ZWRcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5leHByZXNzaW9uLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuU3VwZXJLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICByZXR1cm4gdHMuaXNTcHJlYWRFbGVtZW50KGFyZ3VtZW50KSAmJiB0cy5pc0lkZW50aWZpZXIoYXJndW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIGFyZ3VtZW50LmV4cHJlc3Npb24udGV4dCA9PT0gJ2FyZ3VtZW50cyc7XG59XG5cbi8qKlxuICogRmluZCB0aGUgc3RhdGVtZW50IHRoYXQgY29udGFpbnMgdGhlIGdpdmVuIG5vZGVcbiAqIEBwYXJhbSBub2RlIGEgbm9kZSB3aG9zZSBjb250YWluaW5nIHN0YXRlbWVudCB3ZSB3aXNoIHRvIGZpbmRcbiAqL1xuZnVuY3Rpb24gZ2V0Q29udGFpbmluZ1N0YXRlbWVudChub2RlOiB0cy5Ob2RlKTogdHMuRXhwcmVzc2lvblN0YXRlbWVudHxudWxsIHtcbiAgd2hpbGUgKG5vZGUpIHtcbiAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KG5vZGUpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG4gIHJldHVybiBub2RlIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldFJvb3RGaWxlT3JGYWlsKGJ1bmRsZTogQnVuZGxlUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCByb290RmlsZSA9IGJ1bmRsZS5wcm9ncmFtLmdldFNvdXJjZUZpbGUoYnVuZGxlLnBhdGgpO1xuICBpZiAocm9vdEZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGdpdmVuIHJvb3RQYXRoICR7cm9vdEZpbGV9IGlzIG5vdCBhIGZpbGUgb2YgdGhlIHByb2dyYW0uYCk7XG4gIH1cbiAgcmV0dXJuIHJvb3RGaWxlO1xufVxuXG5mdW5jdGlvbiBnZXROb25Sb290UGFja2FnZUZpbGVzKGJ1bmRsZTogQnVuZGxlUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGVbXSB7XG4gIGNvbnN0IHJvb3RGaWxlID0gYnVuZGxlLnByb2dyYW0uZ2V0U291cmNlRmlsZShidW5kbGUucGF0aCk7XG4gIHJldHVybiBidW5kbGUucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbHRlcihcbiAgICAgIGYgPT4gKGYgIT09IHJvb3RGaWxlKSAmJiBpc1dpdGhpblBhY2thZ2UoYnVuZGxlLnBhY2thZ2UsIGYpKTtcbn1cblxuZnVuY3Rpb24gaXNUb3BMZXZlbChub2RlOiB0cy5Ob2RlKTogYm9vbGVhbiB7XG4gIHdoaWxlIChub2RlID0gbm9kZS5wYXJlbnQpIHtcbiAgICBpZiAodHMuaXNCbG9jayhub2RlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cbiJdfQ==