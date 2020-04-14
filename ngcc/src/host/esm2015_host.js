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
        define("@angular/compiler-cli/ngcc/src/host/esm2015_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/ngcc/src/analysis/util", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/ngcc_host"], factory);
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
         * In ES2015, a class may be declared using a variable declaration of the following structure:
         *
         * ```
         * var MyClass = MyClass_1 = class MyClass {};
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
         * In ES2015, a class may be declared using a variable declaration of the following structure:
         *
         * ```
         * var MyClass = MyClass_1 = class MyClass {};
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
            // Create a symbol without inner declaration if the declaration is a regular class declaration.
            if (ts.isClassDeclaration(declaration) && utils_1.hasNameIdentifier(declaration)) {
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
         * In ES2015, a class may be declared using a variable declaration of the following structure:
         *
         * ```
         * var MyClass = MyClass_1 = class MyClass {};
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
            if (!ts.isClassExpression(declaration) || !utils_1.hasNameIdentifier(declaration)) {
                return undefined;
            }
            var outerDeclaration = getVariableDeclarationOfDeclaration(declaration);
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
            // The identifier may have been of an additional class assignment such as `MyClass_1` that was
            // present as alias for `MyClass`. If so, resolve such aliases to their original declaration.
            if (superDeclaration !== null && superDeclaration.node !== null &&
                superDeclaration.known === null) {
                var aliasedIdentifier = this.resolveAliasedClassIdentifier(superDeclaration.node);
                if (aliasedIdentifier !== null) {
                    return this.getDeclarationOfIdentifier(aliasedIdentifier);
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
         * @param symbol the class whose property we are interested in.
         * @param propertyName the name of static property.
         * @returns the symbol if it is found or `undefined` if not.
         */
        Esm2015ReflectionHost.prototype.getStaticProperty = function (symbol, propertyName) {
            return symbol.declaration.exports && symbol.declaration.exports.get(propertyName);
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
            return Array.from(classSymbol.declaration.valueDeclaration.getSourceFile().statements);
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
        return Esm2015ReflectionHost;
    }(reflection_1.TypeScriptReflectionHost));
    exports.Esm2015ReflectionHost = Esm2015ReflectionHost;
    /**
     * Test whether a statement node is an assignment statement.
     * @param statement the statement to test.
     */
    function isAssignmentStatement(statement) {
        return ts.isExpressionStatement(statement) && isAssignment(statement.expression) &&
            ts.isIdentifier(statement.expression.left);
    }
    exports.isAssignmentStatement = isAssignmentStatement;
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
     * In ES2015, a class may be declared using a variable declaration of the following structure:
     *
     * ```
     * var MyClass = MyClass_1 = class MyClass {};
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
        if (!ts.isClassExpression(expression) || !utils_1.hasNameIdentifier(expression)) {
            return null;
        }
        return expression;
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyx5RUFBdVE7SUFDdlEscUVBQWlEO0lBR2pELDhEQUErRjtJQUUvRiwyRUFBeUw7SUFFNUssUUFBQSxVQUFVLEdBQUcsWUFBMkIsQ0FBQztJQUN6QyxRQUFBLGVBQWUsR0FBRyxnQkFBK0IsQ0FBQztJQUNsRCxRQUFBLFdBQVcsR0FBRyxlQUE4QixDQUFDO0lBQzdDLFFBQUEsa0JBQWtCLEdBQUcsZ0JBQStCLENBQUM7SUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BMEJHO0lBQ0g7UUFBMkMsaURBQXdCO1FBZ0RqRSwrQkFDYyxNQUFjLEVBQVksTUFBZSxFQUFZLEdBQWtCLEVBQ3ZFLEdBQThCO1lBQTlCLG9CQUFBLEVBQUEsVUFBOEI7WUFGNUMsWUFHRSxrQkFBTSxHQUFHLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLFNBQ3BDO1lBSGEsWUFBTSxHQUFOLE1BQU0sQ0FBUTtZQUFZLFlBQU0sR0FBTixNQUFNLENBQVM7WUFBWSxTQUFHLEdBQUgsR0FBRyxDQUFlO1lBQ3ZFLFNBQUcsR0FBSCxHQUFHLENBQTJCO1lBakQ1Qzs7Ozs7O2VBTUc7WUFDTyw2QkFBdUIsR0FBNkMsSUFBSSxDQUFDO1lBQ25GOzs7Ozs7ZUFNRztZQUNPLDhCQUF3QixHQUE2QyxJQUFJLENBQUM7WUFFcEY7O2VBRUc7WUFDTyw2QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUU3RDs7Ozs7Ozs7Ozs7Ozs7ZUFjRztZQUNPLDhCQUF3QixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1lBRTlFOzs7OztlQUtHO1lBQ08s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Q0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1lBQ3ZFLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQztJQUMvQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyxzQkFBc0IsQ0FBQyxJQUFhO1FBQzNDLE9BQU8sSUFBSSxFQUFFO1lBQ1gsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xDLE1BQU07YUFDUDtZQUNELElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1NBQ3BCO1FBQ0QsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxTQUFTLGlCQUFpQixDQUFDLE1BQXFCO1FBQzlDLElBQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRCxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7WUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBc0IsUUFBUSxtQ0FBZ0MsQ0FBQyxDQUFDO1NBQ2pGO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUVELFNBQVMsc0JBQXNCLENBQUMsTUFBcUI7UUFDbkQsSUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNELE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQ3pDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLElBQUksc0JBQWUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUF0RCxDQUFzRCxDQUFDLENBQUM7SUFDbkUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgQ29uY3JldGVEZWNsYXJhdGlvbiwgQ3RvclBhcmFtZXRlciwgRGVjbGFyYXRpb24sIERlY29yYXRvciwgaXNEZWNvcmF0b3JJZGVudGlmaWVyLCBLbm93bkRlY2xhcmF0aW9uLCByZWZsZWN0T2JqZWN0TGl0ZXJhbCwgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0LCBUeXBlVmFsdWVSZWZlcmVuY2UsfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge2lzV2l0aGluUGFja2FnZX0gZnJvbSAnLi4vYW5hbHlzaXMvdXRpbCc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtfSBmcm9tICcuLi9wYWNrYWdlcy9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge2ZpbmRBbGwsIGdldE5hbWVUZXh0LCBoYXNOYW1lSWRlbnRpZmllciwgaXNEZWZpbmVkLCBzdHJpcERvbGxhclN1ZmZpeH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0NsYXNzU3ltYm9sLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uLCBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb24sIE5nY2NDbGFzc1N5bWJvbCwgTmdjY1JlZmxlY3Rpb25Ib3N0LCBQUkVfUjNfTUFSS0VSLCBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbn0gZnJvbSAnLi9uZ2NjX2hvc3QnO1xuXG5leHBvcnQgY29uc3QgREVDT1JBVE9SUyA9ICdkZWNvcmF0b3JzJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBQUk9QX0RFQ09SQVRPUlMgPSAncHJvcERlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IENPTlNUUlVDVE9SID0gJ19fY29uc3RydWN0b3InIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IENPTlNUUlVDVE9SX1BBUkFNUyA9ICdjdG9yUGFyYW1ldGVycycgYXMgdHMuX19TdHJpbmc7XG5cbi8qKlxuICogRXNtMjAxNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgMjAxNSBjbGFzc2VzLCBldGMuXG4gKiBEZWNvcmF0b3JzIGFyZSBkZWZpbmVkIHZpYSBzdGF0aWMgcHJvcGVydGllcyBvbiB0aGUgY2xhc3MuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogY2xhc3MgU29tZURpcmVjdGl2ZSB7XG4gKiB9XG4gKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gKiAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gKiAgIFwiaW5wdXQxXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqICAgXCJpbnB1dDJcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogfTtcbiAqIGBgYFxuICpcbiAqICogQ2xhc3NlcyBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICovXG5leHBvcnQgY2xhc3MgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IGltcGxlbWVudHMgTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgLyoqXG4gICAqIEEgbWFwcGluZyBmcm9tIHNvdXJjZSBkZWNsYXJhdGlvbnMgdG8gdHlwaW5ncyBkZWNsYXJhdGlvbnMsIHdoaWNoIGFyZSBib3RoIHB1YmxpY2x5IGV4cG9ydGVkLlxuICAgKlxuICAgKiBUaGVyZSBzaG91bGQgYmUgb25lIGVudHJ5IGZvciBldmVyeSBwdWJsaWMgZXhwb3J0IHZpc2libGUgZnJvbSB0aGUgcm9vdCBmaWxlIG9mIHRoZSBzb3VyY2VcbiAgICogdHJlZS4gTm90ZSB0aGF0IGJ5IGRlZmluaXRpb24gdGhlIGtleSBhbmQgdmFsdWUgZGVjbGFyYXRpb25zIHdpbGwgbm90IGJlIGluIHRoZSBzYW1lIFRTXG4gICAqIHByb2dyYW0uXG4gICAqL1xuICBwcm90ZWN0ZWQgcHVibGljRHRzRGVjbGFyYXRpb25NYXA6IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+fG51bGwgPSBudWxsO1xuICAvKipcbiAgICogQSBtYXBwaW5nIGZyb20gc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucywgd2hpY2ggYXJlIG5vdCBwdWJsaWNseSBleHBvcnRlZC5cbiAgICpcbiAgICogVGhpcyBtYXBwaW5nIGlzIGEgYmVzdCBndWVzcyBiZXR3ZWVuIGRlY2xhcmF0aW9ucyB0aGF0IGhhcHBlbiB0byBiZSBleHBvcnRlZCBmcm9tIHRoZWlyIGZpbGUgYnlcbiAgICogdGhlIHNhbWUgbmFtZSBpbiBib3RoIHRoZSBzb3VyY2UgYW5kIHRoZSBkdHMgZmlsZS4gTm90ZSB0aGF0IGJ5IGRlZmluaXRpb24gdGhlIGtleSBhbmQgdmFsdWVcbiAgICogZGVjbGFyYXRpb25zIHdpbGwgbm90IGJlIGluIHRoZSBzYW1lIFRTIHByb2dyYW0uXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwOiBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLkRlY2xhcmF0aW9uPnxudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogVGhlIHNldCBvZiBzb3VyY2UgZmlsZXMgdGhhdCBoYXZlIGFscmVhZHkgYmVlbiBwcmVwcm9jZXNzZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJlcHJvY2Vzc2VkU291cmNlRmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgLyoqXG4gICAqIEluIEVTMjAxNSwgY2xhc3MgZGVjbGFyYXRpb25zIG1heSBoYXZlIGJlZW4gZG93bi1sZXZlbGVkIGludG8gdmFyaWFibGUgZGVjbGFyYXRpb25zLFxuICAgKiBpbml0aWFsaXplZCB1c2luZyBhIGNsYXNzIGV4cHJlc3Npb24uIEluIGNlcnRhaW4gc2NlbmFyaW9zLCBhbiBhZGRpdGlvbmFsIHZhcmlhYmxlXG4gICAqIGlzIGludHJvZHVjZWQgdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyBzbyB0aGF0IHJlc3VsdHMgaW4gY29kZSBzdWNoIGFzOlxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IE15Q2xhc3NfMTsgbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBtYXAgdHJhY2tzIHRob3NlIGFsaWFzZWQgdmFyaWFibGVzIHRvIHRoZWlyIG9yaWdpbmFsIGlkZW50aWZpZXIsIGkuZS4gdGhlIGtleVxuICAgKiBjb3JyZXNwb25kcyB3aXRoIHRoZSBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc18xYCBhbmQgaXRzIHZhbHVlIGJlY29tZXMgdGhlIGBNeUNsYXNzYCBpZGVudGlmaWVyXG4gICAqIG9mIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogVGhpcyBtYXAgaXMgcG9wdWxhdGVkIGR1cmluZyB0aGUgcHJlcHJvY2Vzc2luZyBvZiBlYWNoIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLklkZW50aWZpZXI+KCk7XG5cbiAgLyoqXG4gICAqIENhY2hlcyB0aGUgaW5mb3JtYXRpb24gb2YgdGhlIGRlY29yYXRvcnMgb24gYSBjbGFzcywgYXMgdGhlIHdvcmsgaW52b2x2ZWQgd2l0aCBleHRyYWN0aW5nXG4gICAqIGRlY29yYXRvcnMgaXMgY29tcGxleCBhbmQgZnJlcXVlbnRseSB1c2VkLlxuICAgKlxuICAgKiBUaGlzIG1hcCBpcyBsYXppbHkgcG9wdWxhdGVkIGR1cmluZyB0aGUgZmlyc3QgY2FsbCB0byBgYWNxdWlyZURlY29yYXRvckluZm9gIGZvciBhIGdpdmVuIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGRlY29yYXRvckNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3JJbmZvPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIGxvZ2dlcjogTG9nZ2VyLCBwcm90ZWN0ZWQgaXNDb3JlOiBib29sZWFuLCBwcm90ZWN0ZWQgc3JjOiBCdW5kbGVQcm9ncmFtLFxuICAgICAgcHJvdGVjdGVkIGR0czogQnVuZGxlUHJvZ3JhbXxudWxsID0gbnVsbCkge1xuICAgIHN1cGVyKHNyYy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIENsYXNzZXMgc2hvdWxkIGhhdmUgYSBgbmFtZWAgaWRlbnRpZmllciwgYmVjYXVzZSB0aGV5IG1heSBuZWVkIHRvIGJlIHJlZmVyZW5jZWQgaW4gb3RoZXIgcGFydHNcbiAgICogb2YgdGhlIHByb2dyYW0uXG4gICAqXG4gICAqIEluIEVTMjAxNSwgYSBjbGFzcyBtYXkgYmUgZGVjbGFyZWQgdXNpbmcgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIEhlcmUsIHRoZSBpbnRlcm1lZGlhdGUgYE15Q2xhc3NfMWAgYXNzaWdubWVudCBpcyBvcHRpb25hbC4gSW4gdGhlIGFib3ZlIGV4YW1wbGUsIHRoZVxuICAgKiBgY2xhc3MgTXlDbGFzcyB7fWAgbm9kZSBpcyByZXR1cm5lZCBhcyBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc2AuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgZGVjbGFyYXRpb24gbm9kZSB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIiBvciBoYXMgbm8gc3ltYm9sLlxuICAgKi9cbiAgZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sRnJvbU91dGVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHN5bWJvbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRDbGFzc1N5bWJvbEZyb21Jbm5lckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIHVzaW5nIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBleHRyYWN0cyB0aGUgYE5nY2NDbGFzc1N5bWJvbGAgZm9yIGBNeUNsYXNzYCB3aGVuIHByb3ZpZGVkIHdpdGggdGhlIGB2YXIgTXlDbGFzc2BcbiAgICogZGVjbGFyYXRpb24gbm9kZS4gV2hlbiB0aGUgYGNsYXNzIE15Q2xhc3Mge31gIG5vZGUgb3IgYW55IG90aGVyIG5vZGUgaXMgZ2l2ZW4sIHRoaXMgbWV0aG9kIHdpbGxcbiAgICogcmV0dXJuIHVuZGVmaW5lZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgZG9lcyBub3QgcmVwcmVzZW50IGFuIG91dGVyIGRlY2xhcmF0aW9uXG4gICAqIG9mIGEgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NTeW1ib2xGcm9tT3V0ZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIC8vIENyZWF0ZSBhIHN5bWJvbCB3aXRob3V0IGlubmVyIGRlY2xhcmF0aW9uIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyBhIHJlZ3VsYXIgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChkZWNsYXJhdGlvbiwgbnVsbCk7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCB0aGUgZGVjbGFyYXRpb24gbWF5IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sIGluIHdoaWNoIGNhc2UgaXQgbXVzdCBiZVxuICAgIC8vIGluaXRpYWxpemVkIHVzaW5nIGEgY2xhc3MgZXhwcmVzc2lvbiBhcyBpbm5lciBkZWNsYXJhdGlvbi5cbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSAmJiBoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgICAgaWYgKGlubmVyRGVjbGFyYXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2woZGVjbGFyYXRpb24sIGlubmVyRGVjbGFyYXRpb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBtZXRob2QgZXh0cmFjdHMgdGhlIGBOZ2NjQ2xhc3NTeW1ib2xgIGZvciBgTXlDbGFzc2Agd2hlbiBwcm92aWRlZCB3aXRoIHRoZVxuICAgKiBgY2xhc3MgTXlDbGFzcyB7fWAgZGVjbGFyYXRpb24gbm9kZS4gV2hlbiB0aGUgYHZhciBNeUNsYXNzYCBub2RlIG9yIGFueSBvdGhlciBub2RlIGlzIGdpdmVuLFxuICAgKiB0aGlzIG1ldGhvZCB3aWxsIHJldHVybiB1bmRlZmluZWQgaW5zdGVhZC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGRvZXMgbm90IHJlcHJlc2VudCBhbiBpbm5lciBkZWNsYXJhdGlvblxuICAgKiBvZiBhIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NFeHByZXNzaW9uKGRlY2xhcmF0aW9uKSB8fCAhaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IG91dGVyRGVjbGFyYXRpb24gPSBnZXRWYXJpYWJsZURlY2xhcmF0aW9uT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKG91dGVyRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCAhaGFzTmFtZUlkZW50aWZpZXIob3V0ZXJEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2wob3V0ZXJEZWNsYXJhdGlvbiwgZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gYE5nY2NDbGFzc1N5bWJvbGAgZnJvbSBhbiBvdXRlciBhbmQgaW5uZXIgZGVjbGFyYXRpb24uIElmIGEgY2xhc3Mgb25seSBoYXMgYW4gb3V0ZXJcbiAgICogZGVjbGFyYXRpb24sIHRoZSBcImltcGxlbWVudGF0aW9uXCIgc3ltYm9sIG9mIHRoZSBjcmVhdGVkIGBOZ2NjQ2xhc3NTeW1ib2xgIHdpbGwgYmUgc2V0IGVxdWFsIHRvXG4gICAqIHRoZSBcImRlY2xhcmF0aW9uXCIgc3ltYm9sLlxuICAgKlxuICAgKiBAcGFyYW0gb3V0ZXJEZWNsYXJhdGlvbiBUaGUgb3V0ZXIgZGVjbGFyYXRpb24gbm9kZSBvZiB0aGUgY2xhc3MuXG4gICAqIEBwYXJhbSBpbm5lckRlY2xhcmF0aW9uIFRoZSBpbm5lciBkZWNsYXJhdGlvbiBub2RlIG9mIHRoZSBjbGFzcywgb3IgdW5kZWZpbmVkIGlmIG5vIGlubmVyXG4gICAqIGRlY2xhcmF0aW9uIGlzIHByZXNlbnQuXG4gICAqIEByZXR1cm5zIHRoZSBgTmdjY0NsYXNzU3ltYm9sYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzLCBvciB1bmRlZmluZWQgaWYgYSBgdHMuU3ltYm9sYCBmb3IgYW55IG9mXG4gICAqIHRoZSBkZWNsYXJhdGlvbnMgY291bGQgbm90IGJlIHJlc29sdmVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNyZWF0ZUNsYXNzU3ltYm9sKFxuICAgICAgb3V0ZXJEZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbiwgaW5uZXJEZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbnxudWxsKTogTmdjY0NsYXNzU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvblN5bWJvbCA9XG4gICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG91dGVyRGVjbGFyYXRpb24ubmFtZSkgYXMgQ2xhc3NTeW1ib2wgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGRlY2xhcmF0aW9uU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wbGVtZW50YXRpb25TeW1ib2wgPSBpbm5lckRlY2xhcmF0aW9uICE9PSBudWxsID9cbiAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaW5uZXJEZWNsYXJhdGlvbi5uYW1lKSA6XG4gICAgICAgIGRlY2xhcmF0aW9uU3ltYm9sO1xuICAgIGlmIChpbXBsZW1lbnRhdGlvblN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBkZWNsYXJhdGlvblN5bWJvbC5uYW1lLFxuICAgICAgZGVjbGFyYXRpb246IGRlY2xhcmF0aW9uU3ltYm9sLFxuICAgICAgaW1wbGVtZW50YXRpb246IGltcGxlbWVudGF0aW9uU3ltYm9sLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIChmb3IgZXhhbXBsZSwgb2YgYSBjbGFzcyBvciBmdW5jdGlvbikgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBhbnlcbiAgICogZGVjb3JhdG9ycyBwcmVzZW50IG9uIHRoZSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIGEgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gIG5vZGUgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvciBmdW5jdGlvbiBvdmVyXG4gICAqIHdoaWNoIHRvIHJlZmxlY3QuIEZvciBleGFtcGxlLCBpZiB0aGUgaW50ZW50IGlzIHRvIHJlZmxlY3QgdGhlIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBhbmQgdGhlXG4gICAqIHNvdXJjZSBpcyBpbiBFUzYgZm9ybWF0LCB0aGlzIHdpbGwgYmUgYSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgbm9kZS4gSWYgdGhlIHNvdXJjZSBpcyBpbiBFUzVcbiAgICogZm9ybWF0LCB0aGlzIG1pZ2h0IGJlIGEgYHRzLlZhcmlhYmxlRGVjbGFyYXRpb25gIGFzIGNsYXNzZXMgaW4gRVM1IGFyZSByZXByZXNlbnRlZCBhcyB0aGVcbiAgICogcmVzdWx0IG9mIGFuIElJRkUgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgRGVjb3JhdG9yYCBtZXRhZGF0YSBpZiBkZWNvcmF0b3JzIGFyZSBwcmVzZW50IG9uIHRoZSBkZWNsYXJhdGlvbiwgb3JcbiAgICogYG51bGxgIGlmIGVpdGhlciBubyBkZWNvcmF0b3JzIHdlcmUgcHJlc2VudCBvciBpZiB0aGUgZGVjbGFyYXRpb24gaXMgbm90IG9mIGEgZGVjb3JhdGFibGUgdHlwZS5cbiAgICovXG4gIGdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pO1xuICAgIGlmICghc3ltYm9sKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0ZWQgdG8gZ2V0IG1lbWJlcnMgb2YgYSBub24tY2xhc3M6IFwiJHtjbGF6ei5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRNZW1iZXJzT2ZTeW1ib2woY2xhc3NTeW1ib2wpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGl0cyBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBvbmx5IGxvb2tzIGF0IHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGRpcmVjdGx5IGFuZCBub3QgYXQgYW55IGluaGVyaXRlZFxuICAgKiBjb25zdHJ1Y3RvcnMuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYFBhcmFtZXRlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjb25zdHJ1Y3RvciwgaWZcbiAgICogYSBjb25zdHJ1Y3RvciBleGlzdHMuIElmIHRoZSBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGhhcyAwIHBhcmFtZXRlcnMsIHRoaXMgYXJyYXkgd2lsbCBiZSBlbXB0eS5cbiAgICogSWYgdGhlIGNsYXNzIGhhcyBubyBjb25zdHJ1Y3RvciwgdGhpcyBtZXRob2QgcmV0dXJucyBgbnVsbGAuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byBnZXQgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICBjb25zdCBwYXJhbWV0ZXJOb2RlcyA9IHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2wpO1xuICAgIGlmIChwYXJhbWV0ZXJOb2Rlcykge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oY2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBoYXNCYXNlQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBjb25zdCBzdXBlckhhc0Jhc2VDbGFzcyA9IHN1cGVyLmhhc0Jhc2VDbGFzcyhjbGF6eik7XG4gICAgaWYgKHN1cGVySGFzQmFzZUNsYXNzKSB7XG4gICAgICByZXR1cm4gc3VwZXJIYXNCYXNlQ2xhc3M7XG4gICAgfVxuXG4gICAgY29uc3QgaW5uZXJDbGFzc0RlY2xhcmF0aW9uID0gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoaW5uZXJDbGFzc0RlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1cGVyLmhhc0Jhc2VDbGFzcyhpbm5lckNsYXNzRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gRmlyc3QgdHJ5IGdldHRpbmcgdGhlIGJhc2UgY2xhc3MgZnJvbSB0aGUgXCJvdXRlclwiIGRlY2xhcmF0aW9uXG4gICAgY29uc3Qgc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyID0gc3VwZXIuZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGF6eik7XG4gICAgaWYgKHN1cGVyQmFzZUNsYXNzSWRlbnRpZmllcikge1xuICAgICAgcmV0dXJuIHN1cGVyQmFzZUNsYXNzSWRlbnRpZmllcjtcbiAgICB9XG4gICAgLy8gVGhhdCBkaWRuJ3Qgd29yayBzbyBub3cgdHJ5IGdldHRpbmcgaXQgZnJvbSB0aGUgXCJpbm5lclwiIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGlubmVyQ2xhc3NEZWNsYXJhdGlvbiA9IGdldElubmVyQ2xhc3NEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKGlubmVyQ2xhc3NEZWNsYXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGlubmVyQ2xhc3NEZWNsYXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gbm9kZSBhY3R1YWxseSByZXByZXNlbnRzIGEgY2xhc3MuXG4gICAqL1xuICBpc0NsYXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIENsYXNzRGVjbGFyYXRpb24ge1xuICAgIHJldHVybiBzdXBlci5pc0NsYXNzKG5vZGUpIHx8IHRoaXMuZ2V0Q2xhc3NTeW1ib2wobm9kZSkgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFjZSBhbiBpZGVudGlmaWVyIHRvIGl0cyBkZWNsYXJhdGlvbiwgaWYgcG9zc2libGUuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGF0dGVtcHRzIHRvIHJlc29sdmUgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBnaXZlbiBpZGVudGlmaWVyLCB0cmFjaW5nIGJhY2sgdGhyb3VnaFxuICAgKiBpbXBvcnRzIGFuZCByZS1leHBvcnRzIHVudGlsIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQgaXMgZm91bmQuIEEgYERlY2xhcmF0aW9uYFxuICAgKiBvYmplY3QgaXMgcmV0dXJuZWQgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGAgaXMgcmV0dXJuZWQgb3RoZXJ3aXNlLlxuICAgKlxuICAgKiBJbiBFUzIwMTUsIHdlIG5lZWQgdG8gYWNjb3VudCBmb3IgaWRlbnRpZmllcnMgdGhhdCByZWZlciB0byBhbGlhc2VkIGNsYXNzIGRlY2xhcmF0aW9ucyBzdWNoIGFzXG4gICAqIGBNeUNsYXNzXzFgLiBTaW5jZSBzdWNoIGRlY2xhcmF0aW9ucyBhcmUgb25seSBhdmFpbGFibGUgd2l0aGluIHRoZSBtb2R1bGUgaXRzZWxmLCB3ZSBuZWVkIHRvXG4gICAqIGZpbmQgdGhlIG9yaWdpbmFsIGNsYXNzIGRlY2xhcmF0aW9uLCBlLmcuIGBNeUNsYXNzYCwgdGhhdCBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGFsaWFzZWQgb25lLlxuICAgKlxuICAgKiBAcGFyYW0gaWQgYSBUeXBlU2NyaXB0IGB0cy5JZGVudGlmaWVyYCB0byB0cmFjZSBiYWNrIHRvIGEgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIG1ldGFkYXRhIGFib3V0IHRoZSBgRGVjbGFyYXRpb25gIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgXG4gICAqIG90aGVyd2lzZS5cbiAgICovXG4gIGdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc3VwZXJEZWNsYXJhdGlvbiA9IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkKTtcblxuICAgIC8vIFRoZSBpZGVudGlmaWVyIG1heSBoYXZlIGJlZW4gb2YgYW4gYWRkaXRpb25hbCBjbGFzcyBhc3NpZ25tZW50IHN1Y2ggYXMgYE15Q2xhc3NfMWAgdGhhdCB3YXNcbiAgICAvLyBwcmVzZW50IGFzIGFsaWFzIGZvciBgTXlDbGFzc2AuIElmIHNvLCByZXNvbHZlIHN1Y2ggYWxpYXNlcyB0byB0aGVpciBvcmlnaW5hbCBkZWNsYXJhdGlvbi5cbiAgICBpZiAoc3VwZXJEZWNsYXJhdGlvbiAhPT0gbnVsbCAmJiBzdXBlckRlY2xhcmF0aW9uLm5vZGUgIT09IG51bGwgJiZcbiAgICAgICAgc3VwZXJEZWNsYXJhdGlvbi5rbm93biA9PT0gbnVsbCkge1xuICAgICAgY29uc3QgYWxpYXNlZElkZW50aWZpZXIgPSB0aGlzLnJlc29sdmVBbGlhc2VkQ2xhc3NJZGVudGlmaWVyKHN1cGVyRGVjbGFyYXRpb24ubm9kZSk7XG4gICAgICBpZiAoYWxpYXNlZElkZW50aWZpZXIgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoYWxpYXNlZElkZW50aWZpZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdXBlckRlY2xhcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGRlY29yYXRvcnMgb2YgdGhlIGdpdmVuIGNsYXNzIHN5bWJvbC4gQW55IGRlY29yYXRvciB0aGF0IGhhdmUgYmVlbiBzeW50aGV0aWNhbGx5XG4gICAqIGluamVjdGVkIGJ5IGEgbWlncmF0aW9uIHdpbGwgbm90IGJlIHByZXNlbnQgaW4gdGhlIHJldHVybmVkIGNvbGxlY3Rpb24uXG4gICAqL1xuICBnZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCB7Y2xhc3NEZWNvcmF0b3JzfSA9IHRoaXMuYWNxdWlyZURlY29yYXRvckluZm8oc3ltYm9sKTtcbiAgICBpZiAoY2xhc3NEZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgYXJyYXkgdG8gcHJldmVudCBjb25zdW1lcnMgZnJvbSBtdXRhdGluZyB0aGUgY2FjaGUuXG4gICAgcmV0dXJuIEFycmF5LmZyb20oY2xhc3NEZWNvcmF0b3JzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIG1vZHVsZSBmb3IgdmFyaWFibGUgZGVjbGFyYXRpb25zIGluIHdoaWNoIHRoZSBpbml0aWFsaXplclxuICAgKiBpcyBhbiBpZGVudGlmaWVyIG1hcmtlZCB3aXRoIHRoZSBgUFJFX1IzX01BUktFUmAuXG4gICAqIEBwYXJhbSBtb2R1bGUgdGhlIG1vZHVsZSBpbiB3aGljaCB0byBzZWFyY2ggZm9yIHN3aXRjaGFibGUgZGVjbGFyYXRpb25zLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgdGhhdCBtYXRjaC5cbiAgICovXG4gIGdldFN3aXRjaGFibGVEZWNsYXJhdGlvbnMobW9kdWxlOiB0cy5Ob2RlKTogU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb25bXSB7XG4gICAgLy8gRG9uJ3QgYm90aGVyIHRvIHdhbGsgdGhlIEFTVCBpZiB0aGUgbWFya2VyIGlzIG5vdCBmb3VuZCBpbiB0aGUgdGV4dFxuICAgIHJldHVybiBtb2R1bGUuZ2V0VGV4dCgpLmluZGV4T2YoUFJFX1IzX01BUktFUikgPj0gMCA/XG4gICAgICAgIGZpbmRBbGwobW9kdWxlLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uKSA6XG4gICAgICAgIFtdO1xuICB9XG5cbiAgZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdmFsdWUgPSBzdXBlci5nZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBXZSBoYXZlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCBoYXMgbm8gaW5pdGlhbGl6ZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gdmFyIEh0dHBDbGllbnRYc3JmTW9kdWxlXzE7XG4gICAgLy8gYGBgXG4gICAgLy9cbiAgICAvLyBTbyBsb29rIGZvciB0aGUgc3BlY2lhbCBzY2VuYXJpbyB3aGVyZSB0aGUgdmFyaWFibGUgaXMgYmVpbmcgYXNzaWduZWQgaW5cbiAgICAvLyBhIG5lYXJieSBzdGF0ZW1lbnQgdG8gdGhlIHJldHVybiB2YWx1ZSBvZiBhIGNhbGwgdG8gYF9fZGVjb3JhdGVgLlxuICAgIC8vIFRoZW4gZmluZCB0aGUgMm5kIGFyZ3VtZW50IG9mIHRoYXQgY2FsbCwgdGhlIFwidGFyZ2V0XCIsIHdoaWNoIHdpbGwgYmUgdGhlXG4gICAgLy8gYWN0dWFsIGNsYXNzIGlkZW50aWZpZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gSHR0cENsaWVudFhzcmZNb2R1bGUgPSBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xID0gdHNsaWJfMS5fX2RlY29yYXRlKFtcbiAgICAvLyAgIE5nTW9kdWxlKHtcbiAgICAvLyAgICAgcHJvdmlkZXJzOiBbXSxcbiAgICAvLyAgIH0pXG4gICAgLy8gXSwgSHR0cENsaWVudFhzcmZNb2R1bGUpO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gQW5kIGZpbmFsbHksIGZpbmQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBpZGVudGlmaWVyIGluIHRoYXQgYXJndW1lbnQuXG4gICAgLy8gTm90ZSBhbHNvIHRoYXQgdGhlIGFzc2lnbm1lbnQgY2FuIG9jY3VyIHdpdGhpbiBhbm90aGVyIGFzc2lnbm1lbnQuXG4gICAgLy9cbiAgICBjb25zdCBibG9jayA9IGRlY2xhcmF0aW9uLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgIGlmIChzeW1ib2wgJiYgKHRzLmlzQmxvY2soYmxvY2spIHx8IHRzLmlzU291cmNlRmlsZShibG9jaykpKSB7XG4gICAgICBjb25zdCBkZWNvcmF0ZUNhbGwgPSB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKGJsb2NrLCBzeW1ib2wpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZGVjb3JhdGVDYWxsICYmIGRlY29yYXRlQ2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodGFyZ2V0ICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHRhcmdldCk7XG4gICAgICAgIGNvbnN0IHRhcmdldERlY2xhcmF0aW9uID0gdGFyZ2V0U3ltYm9sICYmIHRhcmdldFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgICBpZiAodGFyZ2V0RGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSB8fFxuICAgICAgICAgICAgICB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGp1c3QgYSBmdW5jdGlvbiBvciBjbGFzcyBkZWNsYXJhdGlvblxuICAgICAgICAgICAgLy8gc28gcmV0dXJuIGl0cyBpZGVudGlmaWVyIGFzIHRoZSB2YXJpYWJsZSB2YWx1ZS5cbiAgICAgICAgICAgIHJldHVybiB0YXJnZXREZWNsYXJhdGlvbi5uYW1lIHx8IG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sIHNvIGZpbmQgdGhlIGZhciByaWdodCBleHByZXNzaW9uLFxuICAgICAgICAgICAgLy8gaW4gdGhlIGNhc2Ugb2YgbXVsdGlwbGUgYXNzaWdubWVudHMgKGUuZy4gYHZhcjEgPSB2YXIyID0gdmFsdWVgKS5cbiAgICAgICAgICAgIGxldCB0YXJnZXRWYWx1ZSA9IHRhcmdldERlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgd2hpbGUgKHRhcmdldFZhbHVlICYmIGlzQXNzaWdubWVudCh0YXJnZXRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgdGFyZ2V0VmFsdWUgPSB0YXJnZXRWYWx1ZS5yaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0YXJnZXRWYWx1ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRvcC1sZXZlbCBjbGFzcyBzeW1ib2xzIGluIHRoZSBnaXZlbiBmaWxlLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgc291cmNlIGZpbGUgdG8gc2VhcmNoIGZvciBjbGFzc2VzLlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBjbGFzcyBzeW1ib2xzLlxuICAgKi9cbiAgZmluZENsYXNzU3ltYm9scyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTmdjY0NsYXNzU3ltYm9sW10ge1xuICAgIGNvbnN0IGNsYXNzZXM6IE5nY2NDbGFzc1N5bWJvbFtdID0gW107XG4gICAgdGhpcy5nZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGUpLmZvckVhY2goc3RhdGVtZW50ID0+IHtcbiAgICAgIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgICAgIGNsYXNzZXMucHVzaChjbGFzc1N5bWJvbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKHN0YXRlbWVudCk7XG4gICAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICAgIGNsYXNzZXMucHVzaChjbGFzc1N5bWJvbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gY2xhc3NlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG51bWJlciBvZiBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZiBhIGdpdmVuIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIHRoZSBudW1iZXIgb2YgdHlwZSBwYXJhbWV0ZXJzIG9mIHRoZSBjbGFzcywgaWYga25vd24sIG9yIGBudWxsYCBpZiB0aGUgZGVjbGFyYXRpb25cbiAgICogaXMgbm90IGEgY2xhc3Mgb3IgaGFzIGFuIHVua25vd24gbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycy5cbiAgICovXG4gIGdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBudW1iZXJ8bnVsbCB7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb24gPSB0aGlzLmdldER0c0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoZHRzRGVjbGFyYXRpb24gJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c0RlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIGR0c0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzID8gZHRzRGVjbGFyYXRpb24udHlwZVBhcmFtZXRlcnMubGVuZ3RoIDogMDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVGFrZSBhbiBleHBvcnRlZCBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzIChtYXliZSBkb3duLWxldmVsZWQgdG8gYSB2YXJpYWJsZSkgYW5kIGxvb2sgdXAgdGhlXG4gICAqIGRlY2xhcmF0aW9uIG9mIGl0cyB0eXBlIGluIGEgc2VwYXJhdGUgLmQudHMgdHJlZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBpcyBhbGxvd2VkIHRvIHJldHVybiBgbnVsbGAgaWYgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCBkb2VzIG5vdCBoYXZlIGFcbiAgICogc2VwYXJhdGUgLmQudHMgdHJlZS4gV2hlbiBjb21waWxpbmcgVHlwZVNjcmlwdCBjb2RlIHRoaXMgaXMgYWx3YXlzIHRoZSBjYXNlLCBzaW5jZSAuZC50cyBmaWxlc1xuICAgKiBhcmUgcHJvZHVjZWQgb25seSBkdXJpbmcgdGhlIGVtaXQgb2Ygc3VjaCBhIGNvbXBpbGF0aW9uLiBXaGVuIGNvbXBpbGluZyAuanMgY29kZSwgaG93ZXZlcixcbiAgICogdGhlcmUgaXMgZnJlcXVlbnRseSBhIHBhcmFsbGVsIC5kLnRzIHRyZWUgd2hpY2ggdGhpcyBtZXRob2QgZXhwb3Nlcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgcmV0dXJuZWQgZnJvbSB0aGlzIGZ1bmN0aW9uIG1heSBub3QgYmUgZnJvbSB0aGUgc2FtZVxuICAgKiBgdHMuUHJvZ3JhbWAgYXMgdGhlIGlucHV0IGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0RHRzRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKHRoaXMuZHRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKCFpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBnZXQgdGhlIGR0cyBmaWxlIGZvciBhIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIG5hbWU6ICR7XG4gICAgICAgICAgZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpbiAke2RlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX1gKTtcbiAgICB9XG5cbiAgICAvLyBUcnkgdG8gcmV0cmlldmUgdGhlIGR0cyBkZWNsYXJhdGlvbiBmcm9tIHRoZSBwdWJsaWMgbWFwXG4gICAgaWYgKHRoaXMucHVibGljRHRzRGVjbGFyYXRpb25NYXAgPT09IG51bGwpIHtcbiAgICAgIHRoaXMucHVibGljRHRzRGVjbGFyYXRpb25NYXAgPSB0aGlzLmNvbXB1dGVQdWJsaWNEdHNEZWNsYXJhdGlvbk1hcCh0aGlzLnNyYywgdGhpcy5kdHMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wdWJsaWNEdHNEZWNsYXJhdGlvbk1hcC5oYXMoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNEdHNEZWNsYXJhdGlvbk1hcC5nZXQoZGVjbGFyYXRpb24pITtcbiAgICB9XG5cbiAgICAvLyBObyBwdWJsaWMgZXhwb3J0LCB0cnkgdGhlIHByaXZhdGUgbWFwXG4gICAgaWYgKHRoaXMucHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwID09PSBudWxsKSB7XG4gICAgICB0aGlzLnByaXZhdGVEdHNEZWNsYXJhdGlvbk1hcCA9IHRoaXMuY29tcHV0ZVByaXZhdGVEdHNEZWNsYXJhdGlvbk1hcCh0aGlzLnNyYywgdGhpcy5kdHMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wcml2YXRlRHRzRGVjbGFyYXRpb25NYXAuaGFzKGRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHRoaXMucHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwLmdldChkZWNsYXJhdGlvbikhO1xuICAgIH1cblxuICAgIC8vIE5vIGRlY2xhcmF0aW9uIGZvdW5kIGF0IGFsbFxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCB0aGUgZ2l2ZW4gc291cmNlIGZpbGUgZm9yIGV4cG9ydGVkIGZ1bmN0aW9ucyBhbmQgc3RhdGljIGNsYXNzIG1ldGhvZHMgdGhhdCByZXR1cm5cbiAgICogTW9kdWxlV2l0aFByb3ZpZGVycyBvYmplY3RzLlxuICAgKiBAcGFyYW0gZiBUaGUgc291cmNlIGZpbGUgdG8gc2VhcmNoIGZvciB0aGVzZSBmdW5jdGlvbnNcbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgZnVuY3Rpb24gZGVjbGFyYXRpb25zIHRoYXQgbG9vayBsaWtlIHRoZXkgcmV0dXJuIE1vZHVsZVdpdGhQcm92aWRlcnNcbiAgICogb2JqZWN0cy5cbiAgICovXG4gIGdldE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbnMoZjogdHMuU291cmNlRmlsZSk6IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbltdIHtcbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUoZik7XG4gICAgaWYgKCFleHBvcnRzKSByZXR1cm4gW107XG4gICAgY29uc3QgaW5mb3M6IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbltdID0gW107XG4gICAgZXhwb3J0cy5mb3JFYWNoKChkZWNsYXJhdGlvbiwgbmFtZSkgPT4ge1xuICAgICAgaWYgKGRlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuaXNDbGFzcyhkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgICB0aGlzLmdldE1lbWJlcnNPZkNsYXNzKGRlY2xhcmF0aW9uLm5vZGUpLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgICAgICBpZiAobWVtYmVyLmlzU3RhdGljKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0gdGhpcy5wYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoXG4gICAgICAgICAgICAgICAgbWVtYmVyLm5hbWUsIG1lbWJlci5ub2RlLCBtZW1iZXIuaW1wbGVtZW50YXRpb24sIGRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgICAgaW5mb3MucHVzaChpbmZvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGlzTmFtZWREZWNsYXJhdGlvbihkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgICAgIGNvbnN0IGluZm8gPVxuICAgICAgICAgICAgICB0aGlzLnBhcnNlRm9yTW9kdWxlV2l0aFByb3ZpZGVycyhkZWNsYXJhdGlvbi5ub2RlLm5hbWUudGV4dCwgZGVjbGFyYXRpb24ubm9kZSk7XG4gICAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgIGluZm9zLnB1c2goaW5mbyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGluZm9zO1xuICB9XG5cbiAgZ2V0RW5kT2ZDbGFzcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogdHMuTm9kZSB7XG4gICAgbGV0IGxhc3Q6IHRzLk5vZGUgPSBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIHN0YXRpYyBtZW1iZXJzIG9uIHRoaXMgY2xhc3MgdGhlbiBmaW5kIHRoZSBsYXN0IG9uZVxuICAgIGlmIChjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMuZm9yRWFjaChleHBvcnRTeW1ib2wgPT4ge1xuICAgICAgICBpZiAoZXhwb3J0U3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBleHBvcnRTdGF0ZW1lbnQgPSBnZXRDb250YWluaW5nU3RhdGVtZW50KGV4cG9ydFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKTtcbiAgICAgICAgaWYgKGV4cG9ydFN0YXRlbWVudCAhPT0gbnVsbCAmJiBsYXN0LmdldEVuZCgpIDwgZXhwb3J0U3RhdGVtZW50LmdldEVuZCgpKSB7XG4gICAgICAgICAgbGFzdCA9IGV4cG9ydFN0YXRlbWVudDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGhlbHBlciBjYWxscyBmb3IgdGhpcyBjbGFzcyB0aGVuIGZpbmQgdGhlIGxhc3Qgb25lXG4gICAgY29uc3QgaGVscGVycyA9IHRoaXMuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhcbiAgICAgICAgY2xhc3NTeW1ib2wsIFsnX19kZWNvcmF0ZScsICdfX2V4dGVuZHMnLCAnX19wYXJhbScsICdfX21ldGFkYXRhJ10pO1xuICAgIGhlbHBlcnMuZm9yRWFjaChoZWxwZXIgPT4ge1xuICAgICAgY29uc3QgaGVscGVyU3RhdGVtZW50ID0gZ2V0Q29udGFpbmluZ1N0YXRlbWVudChoZWxwZXIpO1xuICAgICAgaWYgKGhlbHBlclN0YXRlbWVudCAhPT0gbnVsbCAmJiBsYXN0LmdldEVuZCgpIDwgaGVscGVyU3RhdGVtZW50LmdldEVuZCgpKSB7XG4gICAgICAgIGxhc3QgPSBoZWxwZXJTdGF0ZW1lbnQ7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbGFzdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGEgYERlY2xhcmF0aW9uYCBjb3JyZXNwb25kcyB3aXRoIGEga25vd24gZGVjbGFyYXRpb24sIHN1Y2ggYXMgYE9iamVjdGAsIGFuZCBzZXRcbiAgICogaXRzIGBrbm93bmAgcHJvcGVydHkgdG8gdGhlIGFwcHJvcHJpYXRlIGBLbm93bkRlY2xhcmF0aW9uYC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2wgVGhlIGBEZWNsYXJhdGlvbmAgdG8gY2hlY2suXG4gICAqIEByZXR1cm4gVGhlIHBhc3NlZCBpbiBgRGVjbGFyYXRpb25gIChwb3RlbnRpYWxseSBlbmhhbmNlZCB3aXRoIGEgYEtub3duRGVjbGFyYXRpb25gKS5cbiAgICovXG4gIGRldGVjdEtub3duRGVjbGFyYXRpb24oZGVjbDogbnVsbCk6IG51bGw7XG4gIGRldGVjdEtub3duRGVjbGFyYXRpb248VCBleHRlbmRzIERlY2xhcmF0aW9uPihkZWNsOiBUKTogVDtcbiAgZGV0ZWN0S25vd25EZWNsYXJhdGlvbjxUIGV4dGVuZHMgRGVjbGFyYXRpb24+KGRlY2w6IFR8bnVsbCk6IFR8bnVsbDtcbiAgZGV0ZWN0S25vd25EZWNsYXJhdGlvbjxUIGV4dGVuZHMgRGVjbGFyYXRpb24+KGRlY2w6IFR8bnVsbCk6IFR8bnVsbCB7XG4gICAgaWYgKGRlY2wgIT09IG51bGwgJiYgZGVjbC5rbm93biA9PT0gbnVsbCAmJiB0aGlzLmlzSmF2YVNjcmlwdE9iamVjdERlY2xhcmF0aW9uKGRlY2wpKSB7XG4gICAgICAvLyBJZiB0aGUgaWRlbnRpZmllciByZXNvbHZlcyB0byB0aGUgZ2xvYmFsIEphdmFTY3JpcHQgYE9iamVjdGAsIHVwZGF0ZSB0aGUgZGVjbGFyYXRpb24gdG9cbiAgICAgIC8vIGRlbm90ZSBpdCBhcyB0aGUga25vd24gYEpzR2xvYmFsT2JqZWN0YCBkZWNsYXJhdGlvbi5cbiAgICAgIGRlY2wua25vd24gPSBLbm93bkRlY2xhcmF0aW9uLkpzR2xvYmFsT2JqZWN0O1xuICAgIH1cblxuICAgIHJldHVybiBkZWNsO1xuICB9XG5cblxuICAvLy8vLy8vLy8vLy8vIFByb3RlY3RlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgICogUmVzb2x2ZSBhIGB0cy5TeW1ib2xgIHRvIGl0cyBkZWNsYXJhdGlvbiBhbmQgZGV0ZWN0IHdoZXRoZXIgaXQgY29ycmVzcG9uZHMgd2l0aCBhIGtub3duXG4gICAqIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldERlY2xhcmF0aW9uT2ZTeW1ib2woc3ltYm9sOiB0cy5TeW1ib2wsIG9yaWdpbmFsSWQ6IHRzLklkZW50aWZpZXJ8bnVsbCk6IERlY2xhcmF0aW9uXG4gICAgICB8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZGV0ZWN0S25vd25EZWNsYXJhdGlvbihzdXBlci5nZXREZWNsYXJhdGlvbk9mU3ltYm9sKHN5bWJvbCwgb3JpZ2luYWxJZCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBhY3R1YWwgY2xhc3MgZGVjbGFyYXRpb24gZm9yIGEgcG90ZW50aWFsbHkgYWxpYXNlZCBkZWNsYXJhdGlvbiBvZiBhXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBJZiB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gaXMgZm9yIGFuIGFsaWFzIG9mIGEgY2xhc3MsIHRoaXMgZnVuY3Rpb24gd2lsbCBkZXRlcm1pbmUgYW4gaWRlbnRpZmllclxuICAgKiB0byB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gdGhhdCByZXByZXNlbnRzIHRoaXMgY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gdG8gcmVzb2x2ZS5cbiAgICogQHJldHVybnMgVGhlIG9yaWdpbmFsIGlkZW50aWZpZXIgdGhhdCB0aGUgZ2l2ZW4gY2xhc3MgZGVjbGFyYXRpb24gcmVzb2x2ZXMgdG8sIG9yIGB1bmRlZmluZWRgXG4gICAqIGlmIHRoZSBkZWNsYXJhdGlvbiBkb2VzIG5vdCByZXByZXNlbnQgYW4gYWxpYXNlZCBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIHRoaXMuZW5zdXJlUHJlcHJvY2Vzc2VkKGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgcmV0dXJuIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLmhhcyhkZWNsYXJhdGlvbikgP1xuICAgICAgICB0aGlzLmFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucy5nZXQoZGVjbGFyYXRpb24pISA6XG4gICAgICAgIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlcyB0aGF0IHRoZSBzb3VyY2UgZmlsZSB0aGF0IGBub2RlYCBpcyBwYXJ0IG9mIGhhcyBiZWVuIHByZXByb2Nlc3NlZC5cbiAgICpcbiAgICogRHVyaW5nIHByZXByb2Nlc3NpbmcsIGFsbCBzdGF0ZW1lbnRzIGluIHRoZSBzb3VyY2UgZmlsZSB3aWxsIGJlIHZpc2l0ZWQgc3VjaCB0aGF0IGNlcnRhaW5cbiAgICogcHJvY2Vzc2luZyBzdGVwcyBjYW4gYmUgZG9uZSB1cC1mcm9udCBhbmQgY2FjaGVkIGZvciBzdWJzZXF1ZW50IHVzYWdlcy5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIHRoYXQgbmVlZHMgdG8gaGF2ZSBnb25lIHRocm91Z2ggcHJlcHJvY2Vzc2luZy5cbiAgICovXG4gIHByb3RlY3RlZCBlbnN1cmVQcmVwcm9jZXNzZWQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVwcm9jZXNzZWRTb3VyY2VGaWxlcy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgIHRoaXMucHJlcHJvY2Vzc2VkU291cmNlRmlsZXMuYWRkKHNvdXJjZUZpbGUpO1xuXG4gICAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiB0aGlzLmdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZSkpIHtcbiAgICAgICAgdGhpcy5wcmVwcm9jZXNzU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFuYWx5emVzIHRoZSBnaXZlbiBzdGF0ZW1lbnQgdG8gc2VlIGlmIGl0IGNvcnJlc3BvbmRzIHdpdGggYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBsaWtlXG4gICAqIGBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307YC4gSWYgc28sIHRoZSBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc18xYFxuICAgKiBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGBNeUNsYXNzYCBpZGVudGlmaWVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3RhdGVtZW50IFRoZSBzdGF0ZW1lbnQgdGhhdCBuZWVkcyB0byBiZSBwcmVwcm9jZXNzZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJlcHJvY2Vzc1N0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb25zID0gc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnM7XG4gICAgaWYgKGRlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGRlY2xhcmF0aW9uc1swXTtcbiAgICBjb25zdCBpbml0aWFsaXplciA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2xhcmF0aW9uLm5hbWUpIHx8ICFpbml0aWFsaXplciB8fCAhaXNBc3NpZ25tZW50KGluaXRpYWxpemVyKSB8fFxuICAgICAgICAhdHMuaXNJZGVudGlmaWVyKGluaXRpYWxpemVyLmxlZnQpIHx8ICF0aGlzLmlzQ2xhc3MoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWxpYXNlZElkZW50aWZpZXIgPSBpbml0aWFsaXplci5sZWZ0O1xuXG4gICAgY29uc3QgYWxpYXNlZERlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihhbGlhc2VkSWRlbnRpZmllcik7XG4gICAgaWYgKGFsaWFzZWREZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBhbGlhc2VkRGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbmFibGUgdG8gbG9jYXRlIGRlY2xhcmF0aW9uIG9mICR7YWxpYXNlZElkZW50aWZpZXIudGV4dH0gaW4gXCIke3N0YXRlbWVudC5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG4gICAgdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuc2V0KGFsaWFzZWREZWNsYXJhdGlvbi5ub2RlLCBkZWNsYXJhdGlvbi5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciBhIG1vZHVsZS5cbiAgICpcbiAgICogSW4gRVM1IGFuZCBFUzIwMTUgdGhpcyBpcyBqdXN0IHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBvZiB0aGUgZmlsZS5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIG1vZHVsZSB3aG9zZSBzdGF0ZW1lbnRzIHdlIHdhbnQuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciB0aGUgZ2l2ZW4gbW9kdWxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzb3VyY2VGaWxlLnN0YXRlbWVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdhbGsgdGhlIEFTVCBsb29raW5nIGZvciBhbiBhc3NpZ25tZW50IHRvIHRoZSBzcGVjaWZpZWQgc3ltYm9sLlxuICAgKiBAcGFyYW0gbm9kZSBUaGUgY3VycmVudCBub2RlIHdlIGFyZSBzZWFyY2hpbmcuXG4gICAqIEByZXR1cm5zIGFuIGV4cHJlc3Npb24gdGhhdCByZXByZXNlbnRzIHRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUsIG9yIHVuZGVmaW5lZCBpZiBub25lIGNhbiBiZVxuICAgKiBmb3VuZC5cbiAgICovXG4gIHByb3RlY3RlZCBmaW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShub2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCwgc3ltYm9sOiB0cy5TeW1ib2wpOlxuICAgICAgdHMuQ2FsbEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiBub2RlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbikge1xuICAgICAgY29uc3QgbGVmdCA9IG5vZGUubGVmdDtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gbm9kZS5yaWdodDtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIobGVmdCkgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obGVmdCkgPT09IHN5bWJvbCkge1xuICAgICAgICByZXR1cm4gKHRzLmlzQ2FsbEV4cHJlc3Npb24ocmlnaHQpICYmIGdldENhbGxlZU5hbWUocmlnaHQpID09PSAnX19kZWNvcmF0ZScpID8gcmlnaHQgOiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUocmlnaHQsIHN5bWJvbCk7XG4gICAgfVxuICAgIHJldHVybiBub2RlLmZvckVhY2hDaGlsZChub2RlID0+IHRoaXMuZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUobm9kZSwgc3ltYm9sKSkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gcmV0cmlldmUgdGhlIHN5bWJvbCBvZiBhIHN0YXRpYyBwcm9wZXJ0eSBvbiBhIGNsYXNzLlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwcm9wZXJ0eSB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIHByb3BlcnR5TmFtZSB0aGUgbmFtZSBvZiBzdGF0aWMgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgaWYgaXQgaXMgZm91bmQgb3IgYHVuZGVmaW5lZGAgaWYgbm90LlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRpY1Byb3BlcnR5KHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sLCBwcm9wZXJ0eU5hbWU6IHRzLl9fU3RyaW5nKTogdHMuU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMgJiYgc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMuZ2V0KHByb3BlcnR5TmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeS1wb2ludCBmb3Igb2J0YWluaW5nIGluZm9ybWF0aW9uIG9uIHRoZSBkZWNvcmF0b3JzIG9mIGEgZ2l2ZW4gY2xhc3MuIFRoaXNcbiAgICogaW5mb3JtYXRpb24gaXMgY29tcHV0ZWQgZWl0aGVyIGZyb20gc3RhdGljIHByb3BlcnRpZXMgaWYgcHJlc2VudCwgb3IgdXNpbmcgYHRzbGliLl9fZGVjb3JhdGVgXG4gICAqIGhlbHBlciBjYWxscyBvdGhlcndpc2UuIFRoZSBjb21wdXRlZCByZXN1bHQgaXMgY2FjaGVkIHBlciBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyBmb3Igd2hpY2ggZGVjb3JhdG9ycyBzaG91bGQgYmUgYWNxdWlyZWQuXG4gICAqIEByZXR1cm5zIGFsbCBpbmZvcm1hdGlvbiBvZiB0aGUgZGVjb3JhdG9ycyBvbiB0aGUgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWNxdWlyZURlY29yYXRvckluZm8oY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IERlY29yYXRvckluZm8ge1xuICAgIGNvbnN0IGRlY2wgPSBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmICh0aGlzLmRlY29yYXRvckNhY2hlLmhhcyhkZWNsKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVjb3JhdG9yQ2FjaGUuZ2V0KGRlY2wpITtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IGRlY29yYXRvcnMgZnJvbSBzdGF0aWMgcHJvcGVydGllcyBhbmQgYF9fZGVjb3JhdGVgIGhlbHBlciBjYWxscywgdGhlbiBtZXJnZSB0aGVtXG4gICAgLy8gdG9nZXRoZXIgd2hlcmUgdGhlIGluZm9ybWF0aW9uIGZyb20gdGhlIHN0YXRpYyBwcm9wZXJ0aWVzIGlzIHByZWZlcnJlZC5cbiAgICBjb25zdCBzdGF0aWNQcm9wcyA9IHRoaXMuY29tcHV0ZURlY29yYXRvckluZm9Gcm9tU3RhdGljUHJvcGVydGllcyhjbGFzc1N5bWJvbCk7XG4gICAgY29uc3QgaGVscGVyQ2FsbHMgPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sKTtcblxuICAgIGNvbnN0IGRlY29yYXRvckluZm86IERlY29yYXRvckluZm8gPSB7XG4gICAgICBjbGFzc0RlY29yYXRvcnM6IHN0YXRpY1Byb3BzLmNsYXNzRGVjb3JhdG9ycyB8fCBoZWxwZXJDYWxscy5jbGFzc0RlY29yYXRvcnMsXG4gICAgICBtZW1iZXJEZWNvcmF0b3JzOiBzdGF0aWNQcm9wcy5tZW1iZXJEZWNvcmF0b3JzIHx8IGhlbHBlckNhbGxzLm1lbWJlckRlY29yYXRvcnMsXG4gICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mbzogc3RhdGljUHJvcHMuY29uc3RydWN0b3JQYXJhbUluZm8gfHwgaGVscGVyQ2FsbHMuY29uc3RydWN0b3JQYXJhbUluZm8sXG4gICAgfTtcblxuICAgIHRoaXMuZGVjb3JhdG9yQ2FjaGUuc2V0KGRlY2wsIGRlY29yYXRvckluZm8pO1xuICAgIHJldHVybiBkZWNvcmF0b3JJbmZvO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHRzIHRvIGNvbXB1dGUgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gc3RhdGljIHByb3BlcnRpZXMgXCJkZWNvcmF0b3JzXCIsIFwicHJvcERlY29yYXRvcnNcIlxuICAgKiBhbmQgXCJjdG9yUGFyYW1ldGVyc1wiIG9uIHRoZSBjbGFzcy4gSWYgbmVpdGhlciBvZiB0aGVzZSBzdGF0aWMgcHJvcGVydGllcyBpcyBwcmVzZW50IHRoZVxuICAgKiBsaWJyYXJ5IGlzIGxpa2VseSBub3QgY29tcGlsZWQgdXNpbmcgdHNpY2tsZSBmb3IgdXNhZ2Ugd2l0aCBDbG9zdXJlIGNvbXBpbGVyLCBpbiB3aGljaCBjYXNlXG4gICAqIGBudWxsYCBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIFRoZSBjbGFzcyBzeW1ib2wgdG8gY29tcHV0ZSB0aGUgZGVjb3JhdG9ycyBpbmZvcm1hdGlvbiBmb3IuXG4gICAqIEByZXR1cm5zIEFsbCBpbmZvcm1hdGlvbiBvbiB0aGUgZGVjb3JhdG9ycyBhcyBleHRyYWN0ZWQgZnJvbSBzdGF0aWMgcHJvcGVydGllcywgb3IgYG51bGxgIGlmXG4gICAqIG5vbmUgb2YgdGhlIHN0YXRpYyBwcm9wZXJ0aWVzIGV4aXN0LlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbVN0YXRpY1Byb3BlcnRpZXMoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHtcbiAgICBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGw7IG1lbWJlckRlY29yYXRvcnM6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPnwgbnVsbDtcbiAgICBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW10gfCBudWxsO1xuICB9IHtcbiAgICBsZXQgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsID0gbnVsbDtcbiAgICBsZXQgbWVtYmVyRGVjb3JhdG9yczogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+fG51bGwgPSBudWxsO1xuICAgIGxldCBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW118bnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCBkZWNvcmF0b3JzUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBERUNPUkFUT1JTKTtcbiAgICBpZiAoZGVjb3JhdG9yc1Byb3BlcnR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsYXNzRGVjb3JhdG9ycyA9IHRoaXMuZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvcERlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIFBST1BfREVDT1JBVE9SUyk7XG4gICAgaWYgKHByb3BEZWNvcmF0b3JzUHJvcGVydHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbWVtYmVyRGVjb3JhdG9ycyA9IHRoaXMuZ2V0TWVtYmVyRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShwcm9wRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9XG5cbiAgICBjb25zdCBjb25zdHJ1Y3RvclBhcmFtc1Byb3BlcnR5ID0gdGhpcy5nZXRTdGF0aWNQcm9wZXJ0eShjbGFzc1N5bWJvbCwgQ09OU1RSVUNUT1JfUEFSQU1TKTtcbiAgICBpZiAoY29uc3RydWN0b3JQYXJhbXNQcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mbyA9IHRoaXMuZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KGNvbnN0cnVjdG9yUGFyYW1zUHJvcGVydHkpO1xuICAgIH1cblxuICAgIHJldHVybiB7Y2xhc3NEZWNvcmF0b3JzLCBtZW1iZXJEZWNvcmF0b3JzLCBjb25zdHJ1Y3RvclBhcmFtSW5mb307XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBjbGFzcyBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MsIHdoZXJlIHRoZSBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZFxuICAgKiB2aWEgYSBzdGF0aWMgcHJvcGVydHkuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNTeW1ib2wgdGhlIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGRlY29yYXRvcnMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgb3IgbnVsbCBpZiBub25lIHdoZXJlIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzU3ltYm9sOiB0cy5TeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzSWRlbnRpZmllciA9IGRlY29yYXRvcnNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoZGVjb3JhdG9yc0lkZW50aWZpZXIgJiYgZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSB7XG4gICAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkgJiZcbiAgICAgICAgICBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICAgIC8vIEFTVCBvZiB0aGUgYXJyYXkgb2YgZGVjb3JhdG9yIHZhbHVlc1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzQXJyYXkgPSBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQucmlnaHQ7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheSlcbiAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIHN5bWJvbCB3aGljaCBzaG91bGQgYmUgb2YgYSBjbGFzcywgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBpdHMgbWVtYmVycy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgYENsYXNzU3ltYm9sYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlcnNPZlN5bWJvbChzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcblxuICAgIC8vIFRoZSBkZWNvcmF0b3JzIG1hcCBjb250YWlucyBhbGwgdGhlIHByb3BlcnRpZXMgdGhhdCBhcmUgZGVjb3JhdGVkXG4gICAgY29uc3Qge21lbWJlckRlY29yYXRvcnN9ID0gdGhpcy5hY3F1aXJlRGVjb3JhdG9ySW5mbyhzeW1ib2wpO1xuXG4gICAgLy8gTWFrZSBhIGNvcHkgb2YgdGhlIGRlY29yYXRvcnMgYXMgc3VjY2Vzc2Z1bGx5IHJlZmxlY3RlZCBtZW1iZXJzIGRlbGV0ZSB0aGVtc2VsdmVzIGZyb20gdGhlXG4gICAgLy8gbWFwLCBzbyB0aGF0IGFueSBsZWZ0b3ZlcnMgY2FuIGJlIGVhc2lseSBkZWFsdCB3aXRoLlxuICAgIGNvbnN0IGRlY29yYXRvcnNNYXAgPSBuZXcgTWFwKG1lbWJlckRlY29yYXRvcnMpO1xuXG4gICAgLy8gVGhlIG1lbWJlciBtYXAgY29udGFpbnMgYWxsIHRoZSBtZXRob2QgKGluc3RhbmNlIGFuZCBzdGF0aWMpOyBhbmQgYW55IGluc3RhbmNlIHByb3BlcnRpZXNcbiAgICAvLyB0aGF0IGFyZSBpbml0aWFsaXplZCBpbiB0aGUgY2xhc3MuXG4gICAgaWYgKHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5tZW1iZXJzKSB7XG4gICAgICBzeW1ib2wuaW1wbGVtZW50YXRpb24ubWVtYmVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMpO1xuICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVGhlIHN0YXRpYyBwcm9wZXJ0eSBtYXAgY29udGFpbnMgYWxsIHRoZSBzdGF0aWMgcHJvcGVydGllc1xuICAgIGlmIChzeW1ib2wuaW1wbGVtZW50YXRpb24uZXhwb3J0cykge1xuICAgICAgc3ltYm9sLmltcGxlbWVudGF0aW9uLmV4cG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgIGNvbnN0IHJlZmxlY3RlZE1lbWJlcnMgPSB0aGlzLnJlZmxlY3RNZW1iZXJzKHZhbHVlLCBkZWNvcmF0b3JzLCB0cnVlKTtcbiAgICAgICAgaWYgKHJlZmxlY3RlZE1lbWJlcnMpIHtcbiAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICBtZW1iZXJzLnB1c2goLi4ucmVmbGVjdGVkTWVtYmVycyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoaXMgY2xhc3Mgd2FzIGRlY2xhcmVkIGFzIGEgVmFyaWFibGVEZWNsYXJhdGlvbiB0aGVuIGl0IG1heSBoYXZlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgLy8gYXR0YWNoZWQgdG8gdGhlIHZhcmlhYmxlIHJhdGhlciB0aGFuIHRoZSBjbGFzcyBpdHNlbGZcbiAgICAvLyBGb3IgZXhhbXBsZTpcbiAgICAvLyBgYGBcbiAgICAvLyBsZXQgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge1xuICAgIC8vICAgLy8gbm8gc3RhdGljIHByb3BlcnRpZXMgaGVyZSFcbiAgICAvLyB9XG4gICAgLy8gTXlDbGFzcy5zdGF0aWNQcm9wZXJ0eSA9IC4uLjtcbiAgICAvLyBgYGBcbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHN5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgaWYgKHN5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzKSB7XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlYWwgd2l0aCBhbnkgZGVjb3JhdGVkIHByb3BlcnRpZXMgdGhhdCB3ZXJlIG5vdCBpbml0aWFsaXplZCBpbiB0aGUgY2xhc3NcbiAgICBkZWNvcmF0b3JzTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgIGltcGxlbWVudGF0aW9uOiBudWxsLFxuICAgICAgICBkZWNvcmF0b3JzOiB2YWx1ZSxcbiAgICAgICAgaXNTdGF0aWM6IGZhbHNlLFxuICAgICAgICBraW5kOiBDbGFzc01lbWJlcktpbmQuUHJvcGVydHksXG4gICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgbmFtZU5vZGU6IG51bGwsXG4gICAgICAgIG5vZGU6IG51bGwsXG4gICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgIHZhbHVlOiBudWxsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBtZW1iZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIE1lbWJlciBkZWNvcmF0b3JzIG1heSBiZSBkZWNsYXJlZCBhcyBzdGF0aWMgcHJvcGVydGllcyBvZiB0aGUgY2xhc3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzID0ge1xuICAgKiAgIFwibmdGb3JPZlwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRyYWNrQnlcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiAgIFwibmdGb3JUZW1wbGF0ZVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqIH07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc1Byb3BlcnR5IHRoZSBjbGFzcyB3aG9zZSBtZW1iZXIgZGVjb3JhdG9ycyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYSBtYXAgd2hvc2Uga2V5cyBhcmUgdGhlIG5hbWUgb2YgdGhlIG1lbWJlcnMgYW5kIHdob3NlIHZhbHVlcyBhcmUgY29sbGVjdGlvbnMgb2ZcbiAgICogZGVjb3JhdG9ycyBmb3IgdGhlIGdpdmVuIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNZW1iZXJEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTpcbiAgICAgIE1hcDxzdHJpbmcsIERlY29yYXRvcltdPiB7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICAvLyBTeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgZm9yIGBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzYC5cbiAgICBjb25zdCBwcm9wRGVjb3JhdG9yc01hcCA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKGRlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHByb3BEZWNvcmF0b3JzTWFwICYmIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocHJvcERlY29yYXRvcnNNYXApKSB7XG4gICAgICBjb25zdCBwcm9wZXJ0aWVzTWFwID0gcmVmbGVjdE9iamVjdExpdGVyYWwocHJvcERlY29yYXRvcnNNYXApO1xuICAgICAgcHJvcGVydGllc01hcC5mb3JFYWNoKCh2YWx1ZSwgbmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID1cbiAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnModmFsdWUpLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGgpIHtcbiAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLnNldChuYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXJEZWNvcmF0b3JzO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvciBhIGdpdmVuIGNsYXNzIHN5bWJvbCwgY29sbGVjdHMgYWxsIGRlY29yYXRvciBpbmZvcm1hdGlvbiBmcm9tIHRzbGliIGhlbHBlciBtZXRob2RzLCBhc1xuICAgKiBnZW5lcmF0ZWQgYnkgVHlwZVNjcmlwdCBpbnRvIGVtaXR0ZWQgSmF2YVNjcmlwdCBmaWxlcy5cbiAgICpcbiAgICogQ2xhc3MgZGVjb3JhdG9ycyBhcmUgZXh0cmFjdGVkIGZyb20gY2FsbHMgdG8gYHRzbGliLl9fZGVjb3JhdGVgIHRoYXQgbG9vayBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IFNvbWVEaXJlY3RpdmUgPSBjbGFzcyBTb21lRGlyZWN0aXZlIHt9XG4gICAqIFNvbWVEaXJlY3RpdmUgPSBfX2RlY29yYXRlKFtcbiAgICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGV4dHJhY3Rpb24gb2YgbWVtYmVyIGRlY29yYXRvcnMgaXMgc2ltaWxhciwgd2l0aCB0aGUgZGlzdGluY3Rpb24gdGhhdCBpdHMgMm5kIGFuZCAzcmRcbiAgICogYXJndW1lbnQgY29ycmVzcG9uZCB3aXRoIGEgXCJwcm90b3R5cGVcIiB0YXJnZXQgYW5kIHRoZSBuYW1lIG9mIHRoZSBtZW1iZXIgdG8gd2hpY2ggdGhlXG4gICAqIGRlY29yYXRvcnMgYXBwbHkuXG4gICAqXG4gICAqIGBgYFxuICAgKiBfX2RlY29yYXRlKFtcbiAgICogICAgIElucHV0KCksXG4gICAqICAgICBfX21ldGFkYXRhKFwiZGVzaWduOnR5cGVcIiwgU3RyaW5nKVxuICAgKiBdLCBTb21lRGlyZWN0aXZlLnByb3RvdHlwZSwgXCJpbnB1dDFcIiwgdm9pZCAwKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCBUaGUgY2xhc3Mgc3ltYm9sIGZvciB3aGljaCBkZWNvcmF0b3JzIHNob3VsZCBiZSBleHRyYWN0ZWQuXG4gICAqIEByZXR1cm5zIEFsbCBpbmZvcm1hdGlvbiBvbiB0aGUgZGVjb3JhdG9ycyBvZiB0aGUgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29tcHV0ZURlY29yYXRvckluZm9Gcm9tSGVscGVyQ2FsbHMoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IERlY29yYXRvckluZm8ge1xuICAgIGxldCBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG4gICAgY29uc3QgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdID0gW107XG5cbiAgICBjb25zdCBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyA9IChpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBsZXQgcGFyYW0gPSBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF07XG4gICAgICBpZiAocGFyYW0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwYXJhbSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XSA9IHtkZWNvcmF0b3JzOiBudWxsLCB0eXBlRXhwcmVzc2lvbjogbnVsbH07XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFyYW07XG4gICAgfTtcblxuICAgIC8vIEFsbCByZWxldmFudCBpbmZvcm1hdGlvbiBjYW4gYmUgZXh0cmFjdGVkIGZyb20gY2FsbHMgdG8gYF9fZGVjb3JhdGVgLCBvYnRhaW4gdGhlc2UgZmlyc3QuXG4gICAgLy8gTm90ZSB0aGF0IGFsdGhvdWdoIHRoZSBoZWxwZXIgY2FsbHMgYXJlIHJldHJpZXZlZCB1c2luZyB0aGUgY2xhc3Mgc3ltYm9sLCB0aGUgcmVzdWx0IG1heVxuICAgIC8vIGNvbnRhaW4gaGVscGVyIGNhbGxzIGNvcnJlc3BvbmRpbmcgd2l0aCB1bnJlbGF0ZWQgY2xhc3Nlcy4gVGhlcmVmb3JlLCBlYWNoIGhlbHBlciBjYWxsIHN0aWxsXG4gICAgLy8gaGFzIHRvIGJlIGNoZWNrZWQgdG8gYWN0dWFsbHkgY29ycmVzcG9uZCB3aXRoIHRoZSBjbGFzcyBzeW1ib2wuXG4gICAgY29uc3QgaGVscGVyQ2FsbHMgPSB0aGlzLmdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2wsIFsnX19kZWNvcmF0ZSddKTtcblxuICAgIGNvbnN0IG91dGVyRGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSBjbGFzc1N5bWJvbC5pbXBsZW1lbnRhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGNvbnN0IG1hdGNoZXNDbGFzcyA9IChpZGVudGlmaWVyOiB0cy5JZGVudGlmaWVyKSA9PiB7XG4gICAgICBjb25zdCBkZWNsID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICAgIGlmIChkZWNsID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGlkZW50aWZpZXIgY29ycmVzcG9uZHMgd2l0aCB0aGUgY2xhc3MgaWYgaXRzIGRlY2xhcmF0aW9uIGlzIGVpdGhlciB0aGUgb3V0ZXIgb3IgaW5uZXJcbiAgICAgIC8vIGRlY2xhcmF0aW9uLlxuICAgICAgcmV0dXJuIGRlY2wubm9kZSA9PT0gb3V0ZXJEZWNsYXJhdGlvbiB8fCBkZWNsLm5vZGUgPT09IGlubmVyRGVjbGFyYXRpb247XG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgaGVscGVyQ2FsbCBvZiBoZWxwZXJDYWxscykge1xuICAgICAgaWYgKGlzQ2xhc3NEZWNvcmF0ZUNhbGwoaGVscGVyQ2FsbCwgbWF0Y2hlc0NsYXNzKSkge1xuICAgICAgICAvLyBUaGlzIGBfX2RlY29yYXRlYCBjYWxsIGlzIHRhcmdldGluZyB0aGUgY2xhc3MgaXRzZWxmLlxuICAgICAgICBjb25zdCBoZWxwZXJBcmdzID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMF07XG5cbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGhlbHBlckFyZ3MuZWxlbWVudHMpIHtcbiAgICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMucmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZWxlbWVudCk7XG4gICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ2RlY29yYXRvcicpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHdhcyByZWZsZWN0ZWQgdG8gcmVwcmVzZW50IGFuIGFjdHVhbCBkZWNvcmF0b3JcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRnJvbUNvcmUoZW50cnkuZGVjb3JhdG9yKSkge1xuICAgICAgICAgICAgICAoY2xhc3NEZWNvcmF0b3JzIHx8IChjbGFzc0RlY29yYXRvcnMgPSBbXSkpLnB1c2goZW50cnkuZGVjb3JhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LnR5cGUgPT09ICdwYXJhbTpkZWNvcmF0b3JzJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgcmVwcmVzZW50cyBhIGRlY29yYXRvciBmb3IgYSBwYXJhbWV0ZXIuIFNpbmNlIGl0J3MgYXBwbGllZCB0byB0aGVcbiAgICAgICAgICAgIC8vIGNsYXNzLCBpdCBjb3JyZXNwb25kcyB3aXRoIGEgY29uc3RydWN0b3IgcGFyYW1ldGVyIG9mIHRoZSBjbGFzcy5cbiAgICAgICAgICAgIGNvbnN0IHBhcmFtID0gZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oZW50cnkuaW5kZXgpO1xuICAgICAgICAgICAgKHBhcmFtLmRlY29yYXRvcnMgfHwgKHBhcmFtLmRlY29yYXRvcnMgPSBbXSkpLnB1c2goZW50cnkuZGVjb3JhdG9yKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LnR5cGUgPT09ICdwYXJhbXMnKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyByZXByZXNlbnRzIHRoZSB0eXBlcyBvZiB0aGUgcGFyYW1ldGVycy4gU2luY2UgaXQncyBhcHBsaWVkIHRvIHRoZVxuICAgICAgICAgICAgLy8gY2xhc3MsIGl0IGNvcnJlc3BvbmRzIHdpdGggdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgdGhlIGNsYXNzLlxuICAgICAgICAgICAgZW50cnkudHlwZXMuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAodHlwZSwgaW5kZXgpID0+IGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKGluZGV4KS50eXBlRXhwcmVzc2lvbiA9IHR5cGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc01lbWJlckRlY29yYXRlQ2FsbChoZWxwZXJDYWxsLCBtYXRjaGVzQ2xhc3MpKSB7XG4gICAgICAgIC8vIFRoZSBgX19kZWNvcmF0ZWAgY2FsbCBpcyB0YXJnZXRpbmcgYSBtZW1iZXIgb2YgdGhlIGNsYXNzXG4gICAgICAgIGNvbnN0IGhlbHBlckFyZ3MgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgICAgY29uc3QgbWVtYmVyTmFtZSA9IGhlbHBlckNhbGwuYXJndW1lbnRzWzJdLnRleHQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGhlbHBlckFyZ3MuZWxlbWVudHMpIHtcbiAgICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMucmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZWxlbWVudCk7XG4gICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ2RlY29yYXRvcicpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHdhcyByZWZsZWN0ZWQgdG8gcmVwcmVzZW50IGFuIGFjdHVhbCBkZWNvcmF0b3IuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0Zyb21Db3JlKGVudHJ5LmRlY29yYXRvcikpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9XG4gICAgICAgICAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLmhhcyhtZW1iZXJOYW1lKSA/IG1lbWJlckRlY29yYXRvcnMuZ2V0KG1lbWJlck5hbWUpISA6IFtdO1xuICAgICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goZW50cnkuZGVjb3JhdG9yKTtcbiAgICAgICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5zZXQobWVtYmVyTmFtZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEluZm9ybWF0aW9uIG9uIGRlY29yYXRlZCBwYXJhbWV0ZXJzIGlzIG5vdCBpbnRlcmVzdGluZyBmb3IgbmdjYywgc28gaXQncyBpZ25vcmVkLlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7Y2xhc3NEZWNvcmF0b3JzLCBtZW1iZXJEZWNvcmF0b3JzLCBjb25zdHJ1Y3RvclBhcmFtSW5mb307XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCB0aGUgZGV0YWlscyBvZiBhbiBlbnRyeSB3aXRoaW4gYSBgX19kZWNvcmF0ZWAgaGVscGVyIGNhbGwuIEZvciBleGFtcGxlLCBnaXZlbiB0aGVcbiAgICogZm9sbG93aW5nIGNvZGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBfX2RlY29yYXRlKFtcbiAgICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gICAqICAgdHNsaWJfMS5fX3BhcmFtKDIsIEluamVjdChJTkpFQ1RFRF9UT0tFTikpLFxuICAgKiAgIHRzbGliXzEuX19tZXRhZGF0YShcImRlc2lnbjpwYXJhbXR5cGVzXCIsIFtWaWV3Q29udGFpbmVyUmVmLCBUZW1wbGF0ZVJlZiwgU3RyaW5nXSlcbiAgICogXSwgU29tZURpcmVjdGl2ZSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBpdCBjYW4gYmUgc2VlbiB0aGF0IHRoZXJlIGFyZSBjYWxscyB0byByZWd1bGFyIGRlY29yYXRvcnMgKHRoZSBgRGlyZWN0aXZlYCkgYW5kIGNhbGxzIGludG9cbiAgICogYHRzbGliYCBmdW5jdGlvbnMgd2hpY2ggaGF2ZSBiZWVuIGluc2VydGVkIGJ5IFR5cGVTY3JpcHQuIFRoZXJlZm9yZSwgdGhpcyBmdW5jdGlvbiBjbGFzc2lmaWVzXG4gICAqIGEgY2FsbCB0byBjb3JyZXNwb25kIHdpdGhcbiAgICogICAxLiBhIHJlYWwgZGVjb3JhdG9yIGxpa2UgYERpcmVjdGl2ZWAgYWJvdmUsIG9yXG4gICAqICAgMi4gYSBkZWNvcmF0ZWQgcGFyYW1ldGVyLCBjb3JyZXNwb25kaW5nIHdpdGggYF9fcGFyYW1gIGNhbGxzIGZyb20gYHRzbGliYCwgb3JcbiAgICogICAzLiB0aGUgdHlwZSBpbmZvcm1hdGlvbiBvZiBwYXJhbWV0ZXJzLCBjb3JyZXNwb25kaW5nIHdpdGggYF9fbWV0YWRhdGFgIGNhbGwgZnJvbSBgdHNsaWJgXG4gICAqXG4gICAqIEBwYXJhbSBleHByZXNzaW9uIHRoZSBleHByZXNzaW9uIHRoYXQgbmVlZHMgdG8gYmUgcmVmbGVjdGVkIGludG8gYSBgRGVjb3JhdGVIZWxwZXJFbnRyeWBcbiAgICogQHJldHVybnMgYW4gb2JqZWN0IHRoYXQgaW5kaWNhdGVzIHdoaWNoIG9mIHRoZSB0aHJlZSBjYXRlZ29yaWVzIHRoZSBjYWxsIHJlcHJlc2VudHMsIHRvZ2V0aGVyXG4gICAqIHdpdGggdGhlIHJlZmxlY3RlZCBpbmZvcm1hdGlvbiBvZiB0aGUgY2FsbCwgb3IgbnVsbCBpZiB0aGUgY2FsbCBpcyBub3QgYSB2YWxpZCBkZWNvcmF0ZSBjYWxsLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0ZUhlbHBlckVudHJ5KGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBEZWNvcmF0ZUhlbHBlckVudHJ5fG51bGwge1xuICAgIC8vIFdlIG9ubHkgY2FyZSBhYm91dCB0aG9zZSBlbGVtZW50cyB0aGF0IGFyZSBhY3R1YWwgY2FsbHNcbiAgICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjYWxsID0gZXhwcmVzc2lvbjtcblxuICAgIGNvbnN0IGhlbHBlck5hbWUgPSBnZXRDYWxsZWVOYW1lKGNhbGwpO1xuICAgIGlmIChoZWxwZXJOYW1lID09PSAnX19tZXRhZGF0YScpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBgdHNsaWIuX19tZXRhZGF0YWAgY2FsbCwgcmVmbGVjdCB0byBhcmd1bWVudHMgaW50byBhIGBQYXJhbWV0ZXJUeXBlc2Agb2JqZWN0XG4gICAgICAvLyBpZiB0aGUgbWV0YWRhdGEga2V5IGlzIFwiZGVzaWduOnBhcmFtdHlwZXNcIi5cbiAgICAgIGNvbnN0IGtleSA9IGNhbGwuYXJndW1lbnRzWzBdO1xuICAgICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1N0cmluZ0xpdGVyYWwoa2V5KSB8fCBrZXkudGV4dCAhPT0gJ2Rlc2lnbjpwYXJhbXR5cGVzJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdmFsdWUgPSBjYWxsLmFyZ3VtZW50c1sxXTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24odmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAncGFyYW1zJyxcbiAgICAgICAgdHlwZXM6IEFycmF5LmZyb20odmFsdWUuZWxlbWVudHMpLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoaGVscGVyTmFtZSA9PT0gJ19fcGFyYW0nKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgYHRzbGliLl9fcGFyYW1gIGNhbGwgdGhhdCBpcyByZWZsZWN0ZWQgaW50byBhIGBQYXJhbWV0ZXJEZWNvcmF0b3JzYCBvYmplY3QuXG4gICAgICBjb25zdCBpbmRleEFyZyA9IGNhbGwuYXJndW1lbnRzWzBdO1xuICAgICAgY29uc3QgaW5kZXggPSBpbmRleEFyZyAmJiB0cy5pc051bWVyaWNMaXRlcmFsKGluZGV4QXJnKSA/IHBhcnNlSW50KGluZGV4QXJnLnRleHQsIDEwKSA6IE5hTjtcbiAgICAgIGlmIChpc05hTihpbmRleCkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRlY29yYXRvckNhbGwgPSBjYWxsLmFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChkZWNvcmF0b3JDYWxsID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQ2FsbEV4cHJlc3Npb24oZGVjb3JhdG9yQ2FsbCkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRlY29yYXRvciA9IHRoaXMucmVmbGVjdERlY29yYXRvckNhbGwoZGVjb3JhdG9yQ2FsbCk7XG4gICAgICBpZiAoZGVjb3JhdG9yID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAncGFyYW06ZGVjb3JhdG9ycycsXG4gICAgICAgIGluZGV4LFxuICAgICAgICBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSBhdHRlbXB0IHRvIHJlZmxlY3QgaXQgYXMgYSByZWd1bGFyIGRlY29yYXRvci5cbiAgICBjb25zdCBkZWNvcmF0b3IgPSB0aGlzLnJlZmxlY3REZWNvcmF0b3JDYWxsKGNhbGwpO1xuICAgIGlmIChkZWNvcmF0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2RlY29yYXRvcicsXG4gICAgICBkZWNvcmF0b3IsXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdG9yQ2FsbChjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbik6IERlY29yYXRvcnxudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JFeHByZXNzaW9uID0gY2FsbC5leHByZXNzaW9uO1xuICAgIGlmICghaXNEZWNvcmF0b3JJZGVudGlmaWVyKGRlY29yYXRvckV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBXZSBmb3VuZCBhIGRlY29yYXRvciFcbiAgICBjb25zdCBkZWNvcmF0b3JJZGVudGlmaWVyID1cbiAgICAgICAgdHMuaXNJZGVudGlmaWVyKGRlY29yYXRvckV4cHJlc3Npb24pID8gZGVjb3JhdG9yRXhwcmVzc2lvbiA6IGRlY29yYXRvckV4cHJlc3Npb24ubmFtZTtcblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBkZWNvcmF0b3JJZGVudGlmaWVyLnRleHQsXG4gICAgICBpZGVudGlmaWVyOiBkZWNvcmF0b3JFeHByZXNzaW9uLFxuICAgICAgaW1wb3J0OiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWNvcmF0b3JJZGVudGlmaWVyKSxcbiAgICAgIG5vZGU6IGNhbGwsXG4gICAgICBhcmdzOiBBcnJheS5mcm9tKGNhbGwuYXJndW1lbnRzKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHRoZSBnaXZlbiBzdGF0ZW1lbnQgdG8gc2VlIGlmIGl0IGlzIGEgY2FsbCB0byBhbnkgb2YgdGhlIHNwZWNpZmllZCBoZWxwZXIgZnVuY3Rpb25zIG9yXG4gICAqIG51bGwgaWYgbm90IGZvdW5kLlxuICAgKlxuICAgKiBNYXRjaGluZyBzdGF0ZW1lbnRzIHdpbGwgbG9vayBsaWtlOiAgYHRzbGliXzEuX19kZWNvcmF0ZSguLi4pO2AuXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgdGhlIHN0YXRlbWVudCB0aGF0IG1heSBjb250YWluIHRoZSBjYWxsLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZXMgdGhlIG5hbWVzIG9mIHRoZSBoZWxwZXIgd2UgYXJlIGxvb2tpbmcgZm9yLlxuICAgKiBAcmV0dXJucyB0aGUgbm9kZSB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSBgX19kZWNvcmF0ZSguLi4pYCBjYWxsIG9yIG51bGwgaWYgdGhlIHN0YXRlbWVudFxuICAgKiBkb2VzIG5vdCBtYXRjaC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsKHN0YXRlbWVudDogdHMuU3RhdGVtZW50LCBoZWxwZXJOYW1lczogc3RyaW5nW10pOiB0cy5DYWxsRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpIHx8IHRzLmlzUmV0dXJuU3RhdGVtZW50KHN0YXRlbWVudCkpICYmXG4gICAgICAgIHN0YXRlbWVudC5leHByZXNzaW9uKSB7XG4gICAgICBsZXQgZXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uO1xuICAgICAgd2hpbGUgKGlzQXNzaWdubWVudChleHByZXNzaW9uKSkge1xuICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5yaWdodDtcbiAgICAgIH1cbiAgICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICAgIGNvbnN0IGNhbGxlZU5hbWUgPSBnZXRDYWxsZWVOYW1lKGV4cHJlc3Npb24pO1xuICAgICAgICBpZiAoY2FsbGVlTmFtZSAhPT0gbnVsbCAmJiBoZWxwZXJOYW1lcy5pbmNsdWRlcyhjYWxsZWVOYW1lKSkge1xuICAgICAgICAgIHJldHVybiBleHByZXNzaW9uO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIHRoZSBnaXZlbiBhcnJheSBub2RlIGFuZCBleHRyYWN0IGRlY29yYXRvciBpbmZvcm1hdGlvbiBmcm9tIGVhY2ggZWxlbWVudC5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIGZvciBkZWNvcmF0b3JzIHRoYXQgYXJlIGRlZmluZWQgaW4gc3RhdGljIHByb3BlcnRpZXMuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzID0gW1xuICAgKiAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzQXJyYXkgYW4gZXhwcmVzc2lvbiB0aGF0IGNvbnRhaW5zIGRlY29yYXRvciBpbmZvcm1hdGlvbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9yIGluZm8gdGhhdCB3YXMgcmVmbGVjdGVkIGZyb20gdGhlIGFycmF5IG5vZGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9yc0FycmF5OiB0cy5FeHByZXNzaW9uKTogRGVjb3JhdG9yW10ge1xuICAgIGNvbnN0IGRlY29yYXRvcnM6IERlY29yYXRvcltdID0gW107XG5cbiAgICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlY29yYXRvcnNBcnJheSkpIHtcbiAgICAgIC8vIEFkZCBlYWNoIGRlY29yYXRvciB0aGF0IGlzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgIGludG8gdGhlIGBkZWNvcmF0b3JzYCBhcnJheVxuICAgICAgZGVjb3JhdG9yc0FycmF5LmVsZW1lbnRzLmZvckVhY2gobm9kZSA9PiB7XG4gICAgICAgIC8vIElmIHRoZSBkZWNvcmF0b3IgaXMgbm90IGFuIG9iamVjdCBsaXRlcmFsIGV4cHJlc3Npb24gdGhlbiB3ZSBhcmUgbm90IGludGVyZXN0ZWRcbiAgICAgICAgaWYgKHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgICAgICAvLyBXZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIG9iamVjdHMgb2YgdGhlIGZvcm06IGB7IHR5cGU6IERlY29yYXRvclR5cGUsIGFyZ3M6IFsuLi5dIH1gXG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9yID0gcmVmbGVjdE9iamVjdExpdGVyYWwobm9kZSk7XG5cbiAgICAgICAgICAvLyBJcyB0aGUgdmFsdWUgb2YgdGhlIGB0eXBlYCBwcm9wZXJ0eSBhbiBpZGVudGlmaWVyP1xuICAgICAgICAgIGlmIChkZWNvcmF0b3IuaGFzKCd0eXBlJykpIHtcbiAgICAgICAgICAgIGxldCBkZWNvcmF0b3JUeXBlID0gZGVjb3JhdG9yLmdldCgndHlwZScpITtcbiAgICAgICAgICAgIGlmIChpc0RlY29yYXRvcklkZW50aWZpZXIoZGVjb3JhdG9yVHlwZSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9XG4gICAgICAgICAgICAgICAgICB0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yVHlwZSkgPyBkZWNvcmF0b3JUeXBlIDogZGVjb3JhdG9yVHlwZS5uYW1lO1xuICAgICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBkZWNvcmF0b3JUeXBlLFxuICAgICAgICAgICAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjb3JhdG9ySWRlbnRpZmllciksXG4gICAgICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgICAgICBhcmdzOiBnZXREZWNvcmF0b3JBcmdzKG5vZGUpLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKlxuICAgKiBBIHNpbmdsZSBzeW1ib2wgbWF5IHJlcHJlc2VudCBtdWx0aXBsZSBjbGFzcyBtZW1iZXJzIGluIHRoZSBjYXNlIG9mIGFjY2Vzc29ycztcbiAgICogYW4gZXF1YWxseSBuYW1lZCBnZXR0ZXIvc2V0dGVyIGFjY2Vzc29yIHBhaXIgaXMgY29tYmluZWQgaW50byBhIHNpbmdsZSBzeW1ib2wuXG4gICAqIFdoZW4gdGhlIHN5bWJvbCBpcyByZWNvZ25pemVkIGFzIHJlcHJlc2VudGluZyBhbiBhY2Nlc3NvciwgaXRzIGRlY2xhcmF0aW9ucyBhcmVcbiAgICogYW5hbHl6ZWQgc3VjaCB0aGF0IGJvdGggdGhlIHNldHRlciBhbmQgZ2V0dGVyIGFjY2Vzc29yIGFyZSByZXR1cm5lZCBhcyBzZXBhcmF0ZVxuICAgKiBjbGFzcyBtZW1iZXJzLlxuICAgKlxuICAgKiBPbmUgZGlmZmVyZW5jZSB3cnQgdGhlIFR5cGVTY3JpcHQgaG9zdCBpcyB0aGF0IGluIEVTMjAxNSwgd2UgY2Fubm90IHNlZSB3aGljaFxuICAgKiBhY2Nlc3NvciBvcmlnaW5hbGx5IGhhZCBhbnkgZGVjb3JhdG9ycyBhcHBsaWVkIHRvIHRoZW0sIGFzIGRlY29yYXRvcnMgYXJlIGFwcGxpZWRcbiAgICogdG8gdGhlIHByb3BlcnR5IGRlc2NyaXB0b3IgaW4gZ2VuZXJhbCwgbm90IGEgc3BlY2lmaWMgYWNjZXNzb3IuIElmIGFuIGFjY2Vzc29yXG4gICAqIGhhcyBib3RoIGEgc2V0dGVyIGFuZCBnZXR0ZXIsIGFueSBkZWNvcmF0b3JzIGFyZSBvbmx5IGF0dGFjaGVkIHRvIHRoZSBzZXR0ZXIgbWVtYmVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVycyhzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJbXXxudWxsIHtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWNjZXNzb3IpIHtcbiAgICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICAgIGNvbnN0IHNldHRlciA9IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5maW5kKHRzLmlzU2V0QWNjZXNzb3IpO1xuICAgICAgY29uc3QgZ2V0dGVyID0gc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmZpbmQodHMuaXNHZXRBY2Nlc3Nvcik7XG5cbiAgICAgIGNvbnN0IHNldHRlck1lbWJlciA9XG4gICAgICAgICAgc2V0dGVyICYmIHRoaXMucmVmbGVjdE1lbWJlcihzZXR0ZXIsIENsYXNzTWVtYmVyS2luZC5TZXR0ZXIsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICAgIGlmIChzZXR0ZXJNZW1iZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKHNldHRlck1lbWJlcik7XG5cbiAgICAgICAgLy8gUHJldmVudCBhdHRhY2hpbmcgdGhlIGRlY29yYXRvcnMgdG8gYSBwb3RlbnRpYWwgZ2V0dGVyLiBJbiBFUzIwMTUsIHdlIGNhbid0IHRlbGwgd2hlcmVcbiAgICAgICAgLy8gdGhlIGRlY29yYXRvcnMgd2VyZSBvcmlnaW5hbGx5IGF0dGFjaGVkIHRvLCBob3dldmVyIHdlIG9ubHkgd2FudCB0byBhdHRhY2ggdGhlbSB0byBhXG4gICAgICAgIC8vIHNpbmdsZSBgQ2xhc3NNZW1iZXJgIGFzIG90aGVyd2lzZSBuZ3RzYyB3b3VsZCBoYW5kbGUgdGhlIHNhbWUgZGVjb3JhdG9ycyB0d2ljZS5cbiAgICAgICAgZGVjb3JhdG9ycyA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZ2V0dGVyTWVtYmVyID1cbiAgICAgICAgICBnZXR0ZXIgJiYgdGhpcy5yZWZsZWN0TWVtYmVyKGdldHRlciwgQ2xhc3NNZW1iZXJLaW5kLkdldHRlciwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgICAgaWYgKGdldHRlck1lbWJlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goZ2V0dGVyTWVtYmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1lbWJlcnM7XG4gICAgfVxuXG4gICAgbGV0IGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsID0gbnVsbDtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuTWV0aG9kKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZDtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLlByb3BlcnR5KSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGUgPSBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiB8fCBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICAvLyBJZiB0aGUgc3ltYm9sIGhhcyBiZWVuIGltcG9ydGVkIGZyb20gYSBUeXBlU2NyaXB0IHR5cGluZ3MgZmlsZSB0aGVuIHRoZSBjb21waWxlclxuICAgICAgLy8gbWF5IHBhc3MgdGhlIGBwcm90b3R5cGVgIHN5bWJvbCBhcyBhbiBleHBvcnQgb2YgdGhlIGNsYXNzLlxuICAgICAgLy8gQnV0IHRoaXMgaGFzIG5vIGRlY2xhcmF0aW9uLiBJbiB0aGlzIGNhc2Ugd2UganVzdCBxdWlldGx5IGlnbm9yZSBpdC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlciA9IHRoaXMucmVmbGVjdE1lbWJlcihub2RlLCBraW5kLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgaWYgKCFtZW1iZXIpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBbbWVtYmVyXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZGVjbGFyYXRpb24gbm9kZSBmb3IgdGhlIG1lbWJlciB0byByZWZsZWN0IG92ZXIuXG4gICAqIEBwYXJhbSBraW5kIHRoZSBhc3N1bWVkIGtpbmQgb2YgdGhlIG1lbWJlciwgbWF5IGJlY29tZSBtb3JlIGFjY3VyYXRlIGR1cmluZyByZWZsZWN0aW9uLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVyKFxuICAgICAgbm9kZTogdHMuRGVjbGFyYXRpb24sIGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sXG4gICAgICBpc1N0YXRpYz86IGJvb2xlYW4pOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQgdmFsdWU6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWU6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZU5vZGU6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoIWlzQ2xhc3NNZW1iZXJUeXBlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoaXNTdGF0aWMgJiYgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBraW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHkgPyBub2RlLnBhcmVudC5yaWdodCA6IG51bGw7XG4gICAgfSBlbHNlIGlmIChpc1RoaXNBc3NpZ25tZW50KG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgICAgbmFtZSA9IG5vZGUubGVmdC5uYW1lLnRleHQ7XG4gICAgICB2YWx1ZSA9IG5vZGUucmlnaHQ7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkNvbnN0cnVjdG9yO1xuICAgICAgbmFtZSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChraW5kID09PSBudWxsKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKGBVbmtub3duIG1lbWJlciB0eXBlOiBcIiR7bm9kZS5nZXRUZXh0KCl9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGlmIChpc05hbWVkRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgICBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHdlIGhhdmUgc3RpbGwgbm90IGRldGVybWluZWQgaWYgdGhpcyBpcyBhIHN0YXRpYyBvciBpbnN0YW5jZSBtZW1iZXIgdGhlblxuICAgIC8vIGxvb2sgZm9yIHRoZSBgc3RhdGljYCBrZXl3b3JkIG9uIHRoZSBkZWNsYXJhdGlvblxuICAgIGlmIChpc1N0YXRpYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpc1N0YXRpYyA9IG5vZGUubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICBub2RlLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlOiB0cy5UeXBlTm9kZSA9IChub2RlIGFzIGFueSkudHlwZSB8fCBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICBub2RlLFxuICAgICAgaW1wbGVtZW50YXRpb246IG5vZGUsXG4gICAgICBraW5kLFxuICAgICAgdHlwZSxcbiAgICAgIG5hbWUsXG4gICAgICBuYW1lTm9kZSxcbiAgICAgIHZhbHVlLFxuICAgICAgaXNTdGF0aWMsXG4gICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVycyB3ZSB3YW50IHRvIGZpbmQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbmAgb2JqZWN0cyByZXByZXNlbnRpbmcgZWFjaCBvZiB0aGUgcGFyYW1ldGVycyBpblxuICAgKiB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvciBvciBudWxsIGlmIHRoZXJlIGlzIG5vIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOlxuICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXXxudWxsIHtcbiAgICBjb25zdCBtZW1iZXJzID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24ubWVtYmVycztcbiAgICBpZiAobWVtYmVycyAmJiBtZW1iZXJzLmhhcyhDT05TVFJVQ1RPUikpIHtcbiAgICAgIGNvbnN0IGNvbnN0cnVjdG9yU3ltYm9sID0gbWVtYmVycy5nZXQoQ09OU1RSVUNUT1IpITtcbiAgICAgIC8vIEZvciBzb21lIHJlYXNvbiB0aGUgY29uc3RydWN0b3IgZG9lcyBub3QgaGF2ZSBhIGB2YWx1ZURlY2xhcmF0aW9uYCA/IT9cbiAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zICYmXG4gICAgICAgICAgY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zWzBdIGFzIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24gfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoIWNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cbiAgICAgIGlmIChjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgICB9XG4gICAgICBpZiAoaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcGFyYW0gcGFyYW1ldGVyTm9kZXMgdGhlIGFycmF5IG9mIFR5cGVTY3JpcHQgcGFyYW1ldGVyIG5vZGVzIGZvciB0aGlzIGNsYXNzJ3MgY29uc3RydWN0b3IuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBpbmZvIG9iamVjdHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oXG4gICAgICBjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sLCBwYXJhbWV0ZXJOb2RlczogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXSk6IEN0b3JQYXJhbWV0ZXJbXSB7XG4gICAgY29uc3Qge2NvbnN0cnVjdG9yUGFyYW1JbmZvfSA9IHRoaXMuYWNxdWlyZURlY29yYXRvckluZm8oY2xhc3NTeW1ib2wpO1xuXG4gICAgcmV0dXJuIHBhcmFtZXRlck5vZGVzLm1hcCgobm9kZSwgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IHtkZWNvcmF0b3JzLCB0eXBlRXhwcmVzc2lvbn0gPSBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF0gP1xuICAgICAgICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XSA6XG4gICAgICAgICAge2RlY29yYXRvcnM6IG51bGwsIHR5cGVFeHByZXNzaW9uOiBudWxsfTtcbiAgICAgIGNvbnN0IG5hbWVOb2RlID0gbm9kZS5uYW1lO1xuXG4gICAgICBsZXQgdHlwZVZhbHVlUmVmZXJlbmNlOiBUeXBlVmFsdWVSZWZlcmVuY2V8bnVsbCA9IG51bGw7XG4gICAgICBpZiAodHlwZUV4cHJlc3Npb24gIT09IG51bGwpIHtcbiAgICAgICAgLy8gYHR5cGVFeHByZXNzaW9uYCBpcyBhbiBleHByZXNzaW9uIGluIGEgXCJ0eXBlXCIgY29udGV4dC4gUmVzb2x2ZSBpdCB0byBhIGRlY2xhcmVkIHZhbHVlLlxuICAgICAgICAvLyBFaXRoZXIgaXQncyBhIHJlZmVyZW5jZSB0byBhbiBpbXBvcnRlZCB0eXBlLCBvciBhIHR5cGUgZGVjbGFyZWQgbG9jYWxseS4gRGlzdGluZ3Vpc2ggdGhlXG4gICAgICAgIC8vIHR3byBjYXNlcyB3aXRoIGBnZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbmAuXG4gICAgICAgIGNvbnN0IGRlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKHR5cGVFeHByZXNzaW9uKTtcbiAgICAgICAgaWYgKGRlY2wgIT09IG51bGwgJiYgZGVjbC5ub2RlICE9PSBudWxsICYmIGRlY2wudmlhTW9kdWxlICE9PSBudWxsICYmXG4gICAgICAgICAgICBpc05hbWVkRGVjbGFyYXRpb24oZGVjbC5ub2RlKSkge1xuICAgICAgICAgIHR5cGVWYWx1ZVJlZmVyZW5jZSA9IHtcbiAgICAgICAgICAgIGxvY2FsOiBmYWxzZSxcbiAgICAgICAgICAgIHZhbHVlRGVjbGFyYXRpb246IGRlY2wubm9kZSxcbiAgICAgICAgICAgIG1vZHVsZU5hbWU6IGRlY2wudmlhTW9kdWxlLFxuICAgICAgICAgICAgaW1wb3J0ZWROYW1lOiBkZWNsLm5vZGUubmFtZS50ZXh0LFxuICAgICAgICAgICAgbmVzdGVkUGF0aDogbnVsbCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHR5cGVWYWx1ZVJlZmVyZW5jZSA9IHtcbiAgICAgICAgICAgIGxvY2FsOiB0cnVlLFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogdHlwZUV4cHJlc3Npb24sXG4gICAgICAgICAgICBkZWZhdWx0SW1wb3J0U3RhdGVtZW50OiBudWxsLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogZ2V0TmFtZVRleHQobmFtZU5vZGUpLFxuICAgICAgICBuYW1lTm9kZSxcbiAgICAgICAgdHlwZVZhbHVlUmVmZXJlbmNlLFxuICAgICAgICB0eXBlTm9kZTogbnVsbCxcbiAgICAgICAgZGVjb3JhdG9yc1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyxcbiAgICogd2hlcmUgdGhlIGluZm9ybWF0aW9uIGlzIHN0b3JlZCBvbiBhIHN0YXRpYyBwcm9wZXJ0eSBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpbiBFU00yMDE1LCB0aGUgcHJvcGVydHkgaXMgZGVmaW5lZCBhbiBhcnJheSwgb3IgYnkgYW4gYXJyb3cgZnVuY3Rpb24gdGhhdCByZXR1cm5zXG4gICAqIGFuIGFycmF5LCBvZiBkZWNvcmF0b3IgYW5kIHR5cGUgaW5mb3JtYXRpb24uXG4gICAqXG4gICAqIEZvciBleGFtcGxlLFxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAgICogICB7dHlwZTogVmlld0NvbnRhaW5lclJlZn0sXG4gICAqICAge3R5cGU6IFRlbXBsYXRlUmVmfSxcbiAgICogICB7dHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTl19XX0sXG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBvclxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IFtcbiAgICogICB7dHlwZTogVmlld0NvbnRhaW5lclJlZn0sXG4gICAqICAge3R5cGU6IFRlbXBsYXRlUmVmfSxcbiAgICogICB7dHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbe3R5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOXX1dfSxcbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSB0aGUgcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyB0aGUgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgZWFjaCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOiBQYXJhbUluZm9bXXxudWxsIHtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnMgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHBhcmFtRGVjb3JhdG9ycykge1xuICAgICAgLy8gVGhlIGRlY29yYXRvcnMgYXJyYXkgbWF5IGJlIHdyYXBwZWQgaW4gYW4gYXJyb3cgZnVuY3Rpb24uIElmIHNvIHVud3JhcCBpdC5cbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9XG4gICAgICAgICAgdHMuaXNBcnJvd0Z1bmN0aW9uKHBhcmFtRGVjb3JhdG9ycykgPyBwYXJhbURlY29yYXRvcnMuYm9keSA6IHBhcmFtRGVjb3JhdG9ycztcbiAgICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oY29udGFpbmVyKSkge1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IGNvbnRhaW5lci5lbGVtZW50cztcbiAgICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbClcbiAgICAgICAgICAgIC5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgdHlwZUV4cHJlc3Npb24gPVxuICAgICAgICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ3R5cGUnKSA/IHBhcmFtSW5mby5nZXQoJ3R5cGUnKSEgOiBudWxsO1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JJbmZvID1cbiAgICAgICAgICAgICAgICAgIHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uaGFzKCdkZWNvcmF0b3JzJykgPyBwYXJhbUluZm8uZ2V0KCdkZWNvcmF0b3JzJykhIDogbnVsbDtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiZcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9ySW5mbylcbiAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgICAgICAgIHJldHVybiB7dHlwZUV4cHJlc3Npb24sIGRlY29yYXRvcnN9O1xuICAgICAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHBhcmFtRGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAnSW52YWxpZCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgZGVjb3JhdG9yIGluICcgK1xuICAgICAgICAgICAgICAgIHBhcmFtRGVjb3JhdG9ycy5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUgKyAnOlxcbicsXG4gICAgICAgICAgICBwYXJhbURlY29yYXRvcnMuZ2V0VGV4dCgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgZm9yIGNhbGxzIHRvIHRoZSBzcGVjaWZpZWQgaGVscGVyLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIGhlbHBlck5hbWVzIHRoZSBuYW1lcyBvZiB0aGUgaGVscGVycyAoZS5nLiBgX19kZWNvcmF0ZWApIHdob3NlIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkXG4gICAqIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBDYWxsRXhwcmVzc2lvbiBub2RlcyBmb3IgZWFjaCBtYXRjaGluZyBoZWxwZXIgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIGhlbHBlck5hbWVzOiBzdHJpbmdbXSk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbltdIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2wpXG4gICAgICAgIC5tYXAoc3RhdGVtZW50ID0+IHRoaXMuZ2V0SGVscGVyQ2FsbChzdGF0ZW1lbnQsIGhlbHBlck5hbWVzKSlcbiAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgc3RhdGVtZW50cyByZWxhdGVkIHRvIHRoZSBnaXZlbiBjbGFzcyB0aGF0IG1heSBjb250YWluIGNhbGxzIHRvIGEgaGVscGVyLlxuICAgKlxuICAgKiBJbiBFU00yMDE1IGNvZGUgdGhlIGhlbHBlciBjYWxscyBhcmUgaW4gdGhlIHRvcCBsZXZlbCBtb2R1bGUsIHNvIHdlIGhhdmUgdG8gY29uc2lkZXJcbiAgICogYWxsIHRoZSBzdGF0ZW1lbnRzIGluIHRoZSBtb2R1bGUuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLnN0YXRlbWVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlc3Qgd2hldGhlciBhIGRlY29yYXRvciB3YXMgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWAuXG4gICAqXG4gICAqIElzIHRoZSBkZWNvcmF0b3I6XG4gICAqICogZXh0ZXJuYWxseSBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYD9cbiAgICogKiB0aGUgY3VycmVudCBob3N0ZWQgcHJvZ3JhbSBpcyBhY3R1YWxseSBgQGFuZ3VsYXIvY29yZWAgYW5kXG4gICAqICAgLSByZWxhdGl2ZWx5IGludGVybmFsbHkgaW1wb3J0ZWQ7IG9yXG4gICAqICAgLSBub3QgaW1wb3J0ZWQsIGZyb20gdGhlIGN1cnJlbnQgZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvciB0aGUgZGVjb3JhdG9yIHRvIHRlc3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgaXNGcm9tQ29yZShkZWNvcmF0b3I6IERlY29yYXRvcik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLmlzQ29yZSkge1xuICAgICAgcmV0dXJuICFkZWNvcmF0b3IuaW1wb3J0IHx8IC9eXFwuLy50ZXN0KGRlY29yYXRvci5pbXBvcnQuZnJvbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAhIWRlY29yYXRvci5pbXBvcnQgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG1hcHBpbmcgYmV0d2VlbiB0aGUgcHVibGljIGV4cG9ydHMgaW4gYSBzcmMgcHJvZ3JhbSBhbmQgdGhlIHB1YmxpYyBleHBvcnRzIG9mIGEgZHRzXG4gICAqIHByb2dyYW0uXG4gICAqXG4gICAqIEBwYXJhbSBzcmMgdGhlIHByb2dyYW0gYnVuZGxlIGNvbnRhaW5pbmcgdGhlIHNvdXJjZSBmaWxlcy5cbiAgICogQHBhcmFtIGR0cyB0aGUgcHJvZ3JhbSBidW5kbGUgY29udGFpbmluZyB0aGUgdHlwaW5ncyBmaWxlcy5cbiAgICogQHJldHVybnMgYSBtYXAgb2Ygc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlUHVibGljRHRzRGVjbGFyYXRpb25NYXAoc3JjOiBCdW5kbGVQcm9ncmFtLCBkdHM6IEJ1bmRsZVByb2dyYW0pOlxuICAgICAgTWFwPHRzLkRlY2xhcmF0aW9uLCB0cy5EZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uTWFwID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3Qgcm9vdER0cyA9IGdldFJvb3RGaWxlT3JGYWlsKGR0cyk7XG4gICAgdGhpcy5jb2xsZWN0RHRzRXhwb3J0ZWREZWNsYXJhdGlvbnMoZHRzRGVjbGFyYXRpb25NYXAsIHJvb3REdHMsIGR0cy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgIGNvbnN0IHJvb3RTcmMgPSBnZXRSb290RmlsZU9yRmFpbChzcmMpO1xuICAgIHRoaXMuY29sbGVjdFNyY0V4cG9ydGVkRGVjbGFyYXRpb25zKGRlY2xhcmF0aW9uTWFwLCBkdHNEZWNsYXJhdGlvbk1hcCwgcm9vdFNyYyk7XG4gICAgcmV0dXJuIGRlY2xhcmF0aW9uTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG1hcHBpbmcgYmV0d2VlbiB0aGUgXCJwcml2YXRlXCIgZXhwb3J0cyBpbiBhIHNyYyBwcm9ncmFtIGFuZCB0aGUgXCJwcml2YXRlXCIgZXhwb3J0cyBvZiBhXG4gICAqIGR0cyBwcm9ncmFtLiBUaGVzZSBleHBvcnRzIG1heSBiZSBleHBvcnRlZCBmcm9tIGluZGl2aWR1YWwgZmlsZXMgaW4gdGhlIHNyYyBvciBkdHMgcHJvZ3JhbXMsXG4gICAqIGJ1dCBub3QgZXhwb3J0ZWQgZnJvbSB0aGUgcm9vdCBmaWxlIChpLmUgcHVibGljbHkgZnJvbSB0aGUgZW50cnktcG9pbnQpLlxuICAgKlxuICAgKiBUaGlzIG1hcHBpbmcgaXMgYSBcImJlc3QgZ3Vlc3NcIiBzaW5jZSB3ZSBjYW5ub3QgZ3VhcmFudGVlIHRoYXQgdHdvIGRlY2xhcmF0aW9ucyB0aGF0IGhhcHBlbiB0b1xuICAgKiBiZSBleHBvcnRlZCBmcm9tIGEgZmlsZSB3aXRoIHRoZSBzYW1lIG5hbWUgYXJlIGFjdHVhbGx5IGVxdWl2YWxlbnQuIEJ1dCB0aGlzIGlzIGEgcmVhc29uYWJsZVxuICAgKiBlc3RpbWF0ZSBmb3IgdGhlIHB1cnBvc2VzIG9mIG5nY2MuXG4gICAqXG4gICAqIEBwYXJhbSBzcmMgdGhlIHByb2dyYW0gYnVuZGxlIGNvbnRhaW5pbmcgdGhlIHNvdXJjZSBmaWxlcy5cbiAgICogQHBhcmFtIGR0cyB0aGUgcHJvZ3JhbSBidW5kbGUgY29udGFpbmluZyB0aGUgdHlwaW5ncyBmaWxlcy5cbiAgICogQHJldHVybnMgYSBtYXAgb2Ygc291cmNlIGRlY2xhcmF0aW9ucyB0byB0eXBpbmdzIGRlY2xhcmF0aW9ucy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlUHJpdmF0ZUR0c0RlY2xhcmF0aW9uTWFwKHNyYzogQnVuZGxlUHJvZ3JhbSwgZHRzOiBCdW5kbGVQcm9ncmFtKTpcbiAgICAgIE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuRGVjbGFyYXRpb24+IHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbk1hcCA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLkRlY2xhcmF0aW9uPigpO1xuICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uTWFwID0gbmV3IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPigpO1xuICAgIGNvbnN0IHR5cGVDaGVja2VyID0gZHRzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICAgIGNvbnN0IGR0c0ZpbGVzID0gZ2V0Tm9uUm9vdFBhY2thZ2VGaWxlcyhkdHMpO1xuICAgIGZvciAoY29uc3QgZHRzRmlsZSBvZiBkdHNGaWxlcykge1xuICAgICAgdGhpcy5jb2xsZWN0RHRzRXhwb3J0ZWREZWNsYXJhdGlvbnMoZHRzRGVjbGFyYXRpb25NYXAsIGR0c0ZpbGUsIHR5cGVDaGVja2VyKTtcbiAgICB9XG5cbiAgICBjb25zdCBzcmNGaWxlcyA9IGdldE5vblJvb3RQYWNrYWdlRmlsZXMoc3JjKTtcbiAgICBmb3IgKGNvbnN0IHNyY0ZpbGUgb2Ygc3JjRmlsZXMpIHtcbiAgICAgIHRoaXMuY29sbGVjdFNyY0V4cG9ydGVkRGVjbGFyYXRpb25zKGRlY2xhcmF0aW9uTWFwLCBkdHNEZWNsYXJhdGlvbk1hcCwgc3JjRmlsZSk7XG4gICAgfVxuICAgIHJldHVybiBkZWNsYXJhdGlvbk1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsZWN0IG1hcHBpbmdzIGJldHdlZW4gbmFtZXMgb2YgZXhwb3J0ZWQgZGVjbGFyYXRpb25zIGluIGEgZmlsZSBhbmQgaXRzIGFjdHVhbCBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQW55IG5ldyBtYXBwaW5ncyBhcmUgYWRkZWQgdG8gdGhlIGBkdHNEZWNsYXJhdGlvbk1hcGAuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29sbGVjdER0c0V4cG9ydGVkRGVjbGFyYXRpb25zKFxuICAgICAgZHRzRGVjbGFyYXRpb25NYXA6IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPiwgc3JjRmlsZTogdHMuU291cmNlRmlsZSxcbiAgICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogdm9pZCB7XG4gICAgY29uc3Qgc3JjTW9kdWxlID0gc3JjRmlsZSAmJiBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oc3JjRmlsZSk7XG4gICAgY29uc3QgbW9kdWxlRXhwb3J0cyA9IHNyY01vZHVsZSAmJiBjaGVja2VyLmdldEV4cG9ydHNPZk1vZHVsZShzcmNNb2R1bGUpO1xuICAgIGlmIChtb2R1bGVFeHBvcnRzKSB7XG4gICAgICBtb2R1bGVFeHBvcnRzLmZvckVhY2goZXhwb3J0ZWRTeW1ib2wgPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gZXhwb3J0ZWRTeW1ib2wubmFtZTtcbiAgICAgICAgaWYgKGV4cG9ydGVkU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgICAgICBleHBvcnRlZFN5bWJvbCA9IGNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChleHBvcnRlZFN5bWJvbCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSBleHBvcnRlZFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgICBpZiAoZGVjbGFyYXRpb24gJiYgIWR0c0RlY2xhcmF0aW9uTWFwLmhhcyhuYW1lKSkge1xuICAgICAgICAgIGR0c0RlY2xhcmF0aW9uTWFwLnNldChuYW1lLCBkZWNsYXJhdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG5cbiAgcHJvdGVjdGVkIGNvbGxlY3RTcmNFeHBvcnRlZERlY2xhcmF0aW9ucyhcbiAgICAgIGRlY2xhcmF0aW9uTWFwOiBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLkRlY2xhcmF0aW9uPixcbiAgICAgIGR0c0RlY2xhcmF0aW9uTWFwOiBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4sIHNyY0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBmaWxlRXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKHNyY0ZpbGUpO1xuICAgIGlmIChmaWxlRXhwb3J0cyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBbZXhwb3J0TmFtZSwge25vZGU6IGRlY2xhcmF0aW9ufV0gb2YgZmlsZUV4cG9ydHMpIHtcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uICE9PSBudWxsICYmIGR0c0RlY2xhcmF0aW9uTWFwLmhhcyhleHBvcnROYW1lKSkge1xuICAgICAgICAgIGRlY2xhcmF0aW9uTWFwLnNldChkZWNsYXJhdGlvbiwgZHRzRGVjbGFyYXRpb25NYXAuZ2V0KGV4cG9ydE5hbWUpISk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgYSBmdW5jdGlvbi9tZXRob2Qgbm9kZSAob3IgaXRzIGltcGxlbWVudGF0aW9uKSwgdG8gc2VlIGlmIGl0IHJldHVybnMgYVxuICAgKiBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agb2JqZWN0LlxuICAgKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24uXG4gICAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHRvIGNoZWNrIC0gdGhpcyBjb3VsZCBiZSBhIGZ1bmN0aW9uLCBhIG1ldGhvZCBvciBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKiBAcGFyYW0gaW1wbGVtZW50YXRpb24gdGhlIGFjdHVhbCBmdW5jdGlvbiBleHByZXNzaW9uIGlmIGBub2RlYCBpcyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKiBAcGFyYW0gY29udGFpbmVyIHRoZSBjbGFzcyB0aGF0IGNvbnRhaW5zIHRoZSBmdW5jdGlvbiwgaWYgaXQgaXMgYSBtZXRob2QuXG4gICAqIEByZXR1cm5zIGluZm8gYWJvdXQgdGhlIGZ1bmN0aW9uIGlmIGl0IGRvZXMgcmV0dXJuIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIG9iamVjdDsgYG51bGxgXG4gICAqIG90aGVyd2lzZS5cbiAgICovXG4gIHByb3RlY3RlZCBwYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoXG4gICAgICBuYW1lOiBzdHJpbmcsIG5vZGU6IHRzLk5vZGV8bnVsbCwgaW1wbGVtZW50YXRpb246IHRzLk5vZGV8bnVsbCA9IG5vZGUsXG4gICAgICBjb250YWluZXI6IHRzLkRlY2xhcmF0aW9ufG51bGwgPSBudWxsKTogTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9ufG51bGwge1xuICAgIGlmIChpbXBsZW1lbnRhdGlvbiA9PT0gbnVsbCB8fFxuICAgICAgICAoIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihpbXBsZW1lbnRhdGlvbikgJiYgIXRzLmlzTWV0aG9kRGVjbGFyYXRpb24oaW1wbGVtZW50YXRpb24pICYmXG4gICAgICAgICAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oaW1wbGVtZW50YXRpb24pKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gaW1wbGVtZW50YXRpb247XG4gICAgY29uc3QgZGVmaW5pdGlvbiA9IHRoaXMuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChkZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgYm9keSA9IGRlZmluaXRpb24uYm9keTtcbiAgICBjb25zdCBsYXN0U3RhdGVtZW50ID0gYm9keSAmJiBib2R5W2JvZHkubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgcmV0dXJuRXhwcmVzc2lvbiA9XG4gICAgICAgIGxhc3RTdGF0ZW1lbnQgJiYgdHMuaXNSZXR1cm5TdGF0ZW1lbnQobGFzdFN0YXRlbWVudCkgJiYgbGFzdFN0YXRlbWVudC5leHByZXNzaW9uIHx8IG51bGw7XG4gICAgY29uc3QgbmdNb2R1bGVQcm9wZXJ0eSA9IHJldHVybkV4cHJlc3Npb24gJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihyZXR1cm5FeHByZXNzaW9uKSAmJlxuICAgICAgICAgICAgcmV0dXJuRXhwcmVzc2lvbi5wcm9wZXJ0aWVzLmZpbmQoXG4gICAgICAgICAgICAgICAgcHJvcCA9PlxuICAgICAgICAgICAgICAgICAgICAhIXByb3AubmFtZSAmJiB0cy5pc0lkZW50aWZpZXIocHJvcC5uYW1lKSAmJiBwcm9wLm5hbWUudGV4dCA9PT0gJ25nTW9kdWxlJykgfHxcbiAgICAgICAgbnVsbDtcblxuICAgIGlmICghbmdNb2R1bGVQcm9wZXJ0eSB8fCAhdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQobmdNb2R1bGVQcm9wZXJ0eSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFRoZSBuZ01vZHVsZVZhbHVlIGNvdWxkIGJlIG9mIHRoZSBmb3JtIGBTb21lTW9kdWxlYCBvciBgbmFtZXNwYWNlXzEuU29tZU1vZHVsZWBcbiAgICBjb25zdCBuZ01vZHVsZVZhbHVlID0gbmdNb2R1bGVQcm9wZXJ0eS5pbml0aWFsaXplcjtcbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihuZ01vZHVsZVZhbHVlKSAmJiAhdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obmdNb2R1bGVWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5nTW9kdWxlRGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKG5nTW9kdWxlVmFsdWUpO1xuICAgIGlmICghbmdNb2R1bGVEZWNsYXJhdGlvbiB8fCBuZ01vZHVsZURlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGZpbmQgYSBkZWNsYXJhdGlvbiBmb3IgTmdNb2R1bGUgJHtcbiAgICAgICAgICBuZ01vZHVsZVZhbHVlLmdldFRleHQoKX0gcmVmZXJlbmNlZCBpbiBcIiR7ZGVjbGFyYXRpb24hLmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICBpZiAoIWhhc05hbWVJZGVudGlmaWVyKG5nTW9kdWxlRGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIG5nTW9kdWxlOiBuZ01vZHVsZURlY2xhcmF0aW9uIGFzIENvbmNyZXRlRGVjbGFyYXRpb248Q2xhc3NEZWNsYXJhdGlvbj4sXG4gICAgICBkZWNsYXJhdGlvbixcbiAgICAgIGNvbnRhaW5lclxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RGVjbGFyYXRpb25PZkV4cHJlc3Npb24oZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGV4cHJlc3Npb24pO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oZXhwcmVzc2lvbikgfHwgIXRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uLmV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lc3BhY2VEZWNsID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihleHByZXNzaW9uLmV4cHJlc3Npb24pO1xuICAgIGlmICghbmFtZXNwYWNlRGVjbCB8fCBuYW1lc3BhY2VEZWNsLm5vZGUgPT09IG51bGwgfHwgIXRzLmlzU291cmNlRmlsZShuYW1lc3BhY2VEZWNsLm5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lc3BhY2VFeHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUobmFtZXNwYWNlRGVjbC5ub2RlKTtcbiAgICBpZiAobmFtZXNwYWNlRXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFuYW1lc3BhY2VFeHBvcnRzLmhhcyhleHByZXNzaW9uLm5hbWUudGV4dCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cG9ydERlY2wgPSBuYW1lc3BhY2VFeHBvcnRzLmdldChleHByZXNzaW9uLm5hbWUudGV4dCkhO1xuICAgIHJldHVybiB7Li4uZXhwb3J0RGVjbCwgdmlhTW9kdWxlOiBuYW1lc3BhY2VEZWNsLnZpYU1vZHVsZX07XG4gIH1cblxuICAvKiogQ2hlY2tzIGlmIHRoZSBzcGVjaWZpZWQgZGVjbGFyYXRpb24gcmVzb2x2ZXMgdG8gdGhlIGtub3duIEphdmFTY3JpcHQgZ2xvYmFsIGBPYmplY3RgLiAqL1xuICBwcm90ZWN0ZWQgaXNKYXZhU2NyaXB0T2JqZWN0RGVjbGFyYXRpb24oZGVjbDogRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBpZiAoZGVjbC5ub2RlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IG5vZGUgPSBkZWNsLm5vZGU7XG4gICAgLy8gVGhlIGRlZmF1bHQgVHlwZVNjcmlwdCBsaWJyYXJ5IHR5cGVzIHRoZSBnbG9iYWwgYE9iamVjdGAgdmFyaWFibGUgdGhyb3VnaFxuICAgIC8vIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gd2l0aCBhIHR5cGUgcmVmZXJlbmNlIHJlc29sdmluZyB0byBgT2JqZWN0Q29uc3RydWN0b3JgLlxuICAgIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpIHx8ICF0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSB8fFxuICAgICAgICBub2RlLm5hbWUudGV4dCAhPT0gJ09iamVjdCcgfHwgbm9kZS50eXBlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgdHlwZU5vZGUgPSBub2RlLnR5cGU7XG4gICAgLy8gSWYgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGRvZXMgbm90IGhhdmUgYSB0eXBlIHJlc29sdmluZyB0byBgT2JqZWN0Q29uc3RydWN0b3JgLFxuICAgIC8vIHdlIGNhbm5vdCBndWFyYW50ZWUgdGhhdCB0aGUgZGVjbGFyYXRpb24gcmVzb2x2ZXMgdG8gdGhlIGdsb2JhbCBgT2JqZWN0YCB2YXJpYWJsZS5cbiAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUodHlwZU5vZGUpIHx8ICF0cy5pc0lkZW50aWZpZXIodHlwZU5vZGUudHlwZU5hbWUpIHx8XG4gICAgICAgIHR5cGVOb2RlLnR5cGVOYW1lLnRleHQgIT09ICdPYmplY3RDb25zdHJ1Y3RvcicpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gRmluYWxseSwgY2hlY2sgaWYgdGhlIHR5cGUgZGVmaW5pdGlvbiBmb3IgYE9iamVjdGAgb3JpZ2luYXRlcyBmcm9tIGEgZGVmYXVsdCBsaWJyYXJ5XG4gICAgLy8gZGVmaW5pdGlvbiBmaWxlLiBUaGlzIHJlcXVpcmVzIGRlZmF1bHQgdHlwZXMgdG8gYmUgZW5hYmxlZCBmb3IgdGhlIGhvc3QgcHJvZ3JhbS5cbiAgICByZXR1cm4gdGhpcy5zcmMucHJvZ3JhbS5pc1NvdXJjZUZpbGVEZWZhdWx0TGlicmFyeShub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gIH1cbn1cblxuLy8vLy8vLy8vLy8vLyBFeHBvcnRlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuZXhwb3J0IHR5cGUgUGFyYW1JbmZvID0ge1xuICBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsLFxuICB0eXBlRXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbnxudWxsXG59O1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjYWxsIHRvIGB0c2xpYi5fX21ldGFkYXRhYCBhcyBwcmVzZW50IGluIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy4gVGhpcyBpcyBhXG4gKiBzeW50aGV0aWMgZGVjb3JhdG9yIGluc2VydGVkIGJ5IFR5cGVTY3JpcHQgdGhhdCBjb250YWlucyByZWZsZWN0aW9uIGluZm9ybWF0aW9uIGFib3V0IHRoZVxuICogdGFyZ2V0IG9mIHRoZSBkZWNvcmF0b3IsIGkuZS4gdGhlIGNsYXNzIG9yIHByb3BlcnR5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlclR5cGVzIHtcbiAgdHlwZTogJ3BhcmFtcyc7XG4gIHR5cGVzOiB0cy5FeHByZXNzaW9uW107XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNhbGwgdG8gYHRzbGliLl9fcGFyYW1gIGFzIHByZXNlbnQgaW4gYHRzbGliLl9fZGVjb3JhdGVgIGNhbGxzLiBUaGlzIGNvbnRhaW5zXG4gKiBpbmZvcm1hdGlvbiBvbiBhbnkgZGVjb3JhdG9ycyB3ZXJlIGFwcGxpZWQgdG8gYSBjZXJ0YWluIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXJEZWNvcmF0b3JzIHtcbiAgdHlwZTogJ3BhcmFtOmRlY29yYXRvcnMnO1xuICBpbmRleDogbnVtYmVyO1xuICBkZWNvcmF0b3I6IERlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2FsbCB0byBhIGRlY29yYXRvciBhcyBpdCB3YXMgcHJlc2VudCBpbiB0aGUgb3JpZ2luYWwgc291cmNlIGNvZGUsIGFzIHByZXNlbnQgaW5cbiAqIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZWNvcmF0b3JDYWxsIHtcbiAgdHlwZTogJ2RlY29yYXRvcic7XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGRpZmZlcmVudCBraW5kcyBvZiBkZWNvcmF0ZSBoZWxwZXJzIHRoYXQgbWF5IGJlIHByZXNlbnQgYXMgZmlyc3QgYXJndW1lbnQgdG9cbiAqIGB0c2xpYi5fX2RlY29yYXRlYCwgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBcbiAqIF9fZGVjb3JhdGUoW1xuICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gKiAgIHRzbGliXzEuX19wYXJhbSgyLCBJbmplY3QoSU5KRUNURURfVE9LRU4pKSxcbiAqICAgdHNsaWJfMS5fX21ldGFkYXRhKFwiZGVzaWduOnBhcmFtdHlwZXNcIiwgW1ZpZXdDb250YWluZXJSZWYsIFRlbXBsYXRlUmVmLCBTdHJpbmddKVxuICogXSwgU29tZURpcmVjdGl2ZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgRGVjb3JhdGVIZWxwZXJFbnRyeSA9IFBhcmFtZXRlclR5cGVzfFBhcmFtZXRlckRlY29yYXRvcnN8RGVjb3JhdG9yQ2FsbDtcblxuLyoqXG4gKiBUaGUgcmVjb3JkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uIG9mIGEgc2luZ2xlIGNsYXNzLiBUaGlzIGluZm9ybWF0aW9uIGlzIGNhY2hlZCBpbiB0aGUgaG9zdC5cbiAqL1xuaW50ZXJmYWNlIERlY29yYXRvckluZm8ge1xuICAvKipcbiAgICogQWxsIGRlY29yYXRvcnMgdGhhdCB3ZXJlIHByZXNlbnQgb24gdGhlIGNsYXNzLiBJZiBubyBkZWNvcmF0b3JzIHdlcmUgcHJlc2VudCwgdGhpcyBpcyBgbnVsbGBcbiAgICovXG4gIGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbDtcblxuICAvKipcbiAgICogQWxsIGRlY29yYXRvcnMgcGVyIG1lbWJlciBvZiB0aGUgY2xhc3MgdGhleSB3ZXJlIHByZXNlbnQgb24uXG4gICAqL1xuICBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT47XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBpbmZvcm1hdGlvbiwgc3VjaCBhcyB0aGUgdHlwZSBvZiBhIHBhcmFtZXRlciBhbmQgYWxsXG4gICAqIGRlY29yYXRvcnMgZm9yIGEgY2VydGFpbiBwYXJhbWV0ZXIuIEluZGljZXMgaW4gdGhpcyBhcnJheSBjb3JyZXNwb25kIHdpdGggdGhlIHBhcmFtZXRlcidzXG4gICAqIGluZGV4IGluIHRoZSBjb25zdHJ1Y3Rvci4gTm90ZSB0aGF0IHRoaXMgYXJyYXkgbWF5IGJlIHNwYXJzZSwgaS5lLiBjZXJ0YWluIGNvbnN0cnVjdG9yXG4gICAqIHBhcmFtZXRlcnMgbWF5IG5vdCBoYXZlIGFueSBpbmZvIHJlY29yZGVkLlxuICAgKi9cbiAgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdO1xufVxuXG4vKipcbiAqIEEgc3RhdGVtZW50IG5vZGUgdGhhdCByZXByZXNlbnRzIGFuIGFzc2lnbm1lbnQuXG4gKi9cbmV4cG9ydCB0eXBlIEFzc2lnbm1lbnRTdGF0ZW1lbnQgPVxuICAgIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQme2V4cHJlc3Npb246IHtsZWZ0OiB0cy5JZGVudGlmaWVyLCByaWdodDogdHMuRXhwcmVzc2lvbn19O1xuXG4vKipcbiAqIFRlc3Qgd2hldGhlciBhIHN0YXRlbWVudCBub2RlIGlzIGFuIGFzc2lnbm1lbnQgc3RhdGVtZW50LlxuICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRvIHRlc3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBzdGF0ZW1lbnQgaXMgQXNzaWdubWVudFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiBpc0Fzc2lnbm1lbnQoc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Fzc2lnbm1lbnQobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuQXNzaWdubWVudEV4cHJlc3Npb248dHMuRXF1YWxzVG9rZW4+IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiBub2RlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbjtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBwcm92aWRlZCBjYWxsIGV4cHJlc3Npb24gdGFyZ2V0cyBhIGNsYXNzLCBieSB2ZXJpZnlpbmcgaXRzIGFyZ3VtZW50cyBhcmVcbiAqIGFjY29yZGluZyB0byB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBfX2RlY29yYXRlKFtdLCBTb21lRGlyZWN0aXZlKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBjYWxsIHRoZSBjYWxsIGV4cHJlc3Npb24gdGhhdCBpcyB0ZXN0ZWQgdG8gcmVwcmVzZW50IGEgY2xhc3MgZGVjb3JhdG9yIGNhbGwuXG4gKiBAcGFyYW0gbWF0Y2hlcyBwcmVkaWNhdGUgZnVuY3Rpb24gdG8gdGVzdCB3aGV0aGVyIHRoZSBjYWxsIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGVzaXJlZCBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2xhc3NEZWNvcmF0ZUNhbGwoXG4gICAgY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24sIG1hdGNoZXM6IChpZGVudGlmaWVyOiB0cy5JZGVudGlmaWVyKSA9PiBib29sZWFuKTpcbiAgICBjYWxsIGlzIHRzLkNhbGxFeHByZXNzaW9uJnthcmd1bWVudHM6IFt0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uLCB0cy5FeHByZXNzaW9uXX0ge1xuICBjb25zdCBoZWxwZXJBcmdzID0gY2FsbC5hcmd1bWVudHNbMF07XG4gIGlmIChoZWxwZXJBcmdzID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihoZWxwZXJBcmdzKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHRhcmdldCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICByZXR1cm4gdGFyZ2V0ICE9PSB1bmRlZmluZWQgJiYgdHMuaXNJZGVudGlmaWVyKHRhcmdldCkgJiYgbWF0Y2hlcyh0YXJnZXQpO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIHByb3ZpZGVkIGNhbGwgZXhwcmVzc2lvbiB0YXJnZXRzIGEgbWVtYmVyIG9mIHRoZSBjbGFzcywgYnkgdmVyaWZ5aW5nIGl0c1xuICogYXJndW1lbnRzIGFyZSBhY2NvcmRpbmcgdG8gdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogX19kZWNvcmF0ZShbXSwgU29tZURpcmVjdGl2ZS5wcm90b3R5cGUsIFwibWVtYmVyXCIsIHZvaWQgMCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gY2FsbCB0aGUgY2FsbCBleHByZXNzaW9uIHRoYXQgaXMgdGVzdGVkIHRvIHJlcHJlc2VudCBhIG1lbWJlciBkZWNvcmF0b3IgY2FsbC5cbiAqIEBwYXJhbSBtYXRjaGVzIHByZWRpY2F0ZSBmdW5jdGlvbiB0byB0ZXN0IHdoZXRoZXIgdGhlIGNhbGwgaXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkZXNpcmVkIGNsYXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNZW1iZXJEZWNvcmF0ZUNhbGwoXG4gICAgY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24sIG1hdGNoZXM6IChpZGVudGlmaWVyOiB0cy5JZGVudGlmaWVyKSA9PiBib29sZWFuKTpcbiAgICBjYWxsIGlzIHRzLkNhbGxFeHByZXNzaW9uJlxuICAgIHthcmd1bWVudHM6IFt0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uLCB0cy5TdHJpbmdMaXRlcmFsLCB0cy5TdHJpbmdMaXRlcmFsXX0ge1xuICBjb25zdCBoZWxwZXJBcmdzID0gY2FsbC5hcmd1bWVudHNbMF07XG4gIGlmIChoZWxwZXJBcmdzID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihoZWxwZXJBcmdzKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHRhcmdldCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHRhcmdldCkgfHxcbiAgICAgICF0cy5pc0lkZW50aWZpZXIodGFyZ2V0LmV4cHJlc3Npb24pIHx8ICFtYXRjaGVzKHRhcmdldC5leHByZXNzaW9uKSB8fFxuICAgICAgdGFyZ2V0Lm5hbWUudGV4dCAhPT0gJ3Byb3RvdHlwZScpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBtZW1iZXJOYW1lID0gY2FsbC5hcmd1bWVudHNbMl07XG4gIHJldHVybiBtZW1iZXJOYW1lICE9PSB1bmRlZmluZWQgJiYgdHMuaXNTdHJpbmdMaXRlcmFsKG1lbWJlck5hbWUpO1xufVxuXG4vKipcbiAqIEhlbHBlciBtZXRob2QgdG8gZXh0cmFjdCB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBnaXZlbiB0aGUgcHJvcGVydHkncyBcInN5bWJvbFwiLFxuICogd2hpY2ggaXMgYWN0dWFsbHkgdGhlIHN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBvZiB0aGUgcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwcm9wU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5FeHByZXNzaW9ufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHByb3BJZGVudGlmaWVyID0gcHJvcFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICBjb25zdCBwYXJlbnQgPSBwcm9wSWRlbnRpZmllciAmJiBwcm9wSWRlbnRpZmllci5wYXJlbnQ7XG4gIHJldHVybiBwYXJlbnQgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKHBhcmVudCkgPyBwYXJlbnQucmlnaHQgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQSBjYWxsZWUgY291bGQgYmUgb25lIG9mOiBgX19kZWNvcmF0ZSguLi4pYCBvciBgdHNsaWJfMS5fX2RlY29yYXRlYC5cbiAqL1xuZnVuY3Rpb24gZ2V0Q2FsbGVlTmFtZShjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbik6IHN0cmluZ3xudWxsIHtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihjYWxsLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIHN0cmlwRG9sbGFyU3VmZml4KGNhbGwuZXhwcmVzc2lvbi50ZXh0KTtcbiAgfVxuICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBzdHJpcERvbGxhclN1ZmZpeChjYWxsLmV4cHJlc3Npb24ubmFtZS50ZXh0KTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLy8vLy8vLy8vLy8vLyBJbnRlcm5hbCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuLyoqXG4gKiBJbiBFUzIwMTUsIGEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIHVzaW5nIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG4gKlxuICogYGBgXG4gKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gKiBgYGBcbiAqXG4gKiBIZXJlLCB0aGUgaW50ZXJtZWRpYXRlIGBNeUNsYXNzXzFgIGFzc2lnbm1lbnQgaXMgb3B0aW9uYWwuIEluIHRoZSBhYm92ZSBleGFtcGxlLCB0aGVcbiAqIGBjbGFzcyBNeUNsYXNzIHt9YCBleHByZXNzaW9uIGlzIHJldHVybmVkIGFzIGRlY2xhcmF0aW9uIG9mIGB2YXIgTXlDbGFzc2AuIElmIHRoZSB2YXJpYWJsZVxuICogaXMgbm90IGluaXRpYWxpemVkIHVzaW5nIGEgY2xhc3MgZXhwcmVzc2lvbiwgbnVsbCBpcyByZXR1cm5lZC5cbiAqXG4gKiBAcGFyYW0gbm9kZSB0aGUgbm9kZSB0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzIHdob3NlIGRlY2xhcmF0aW9uIHdlIGFyZSBmaW5kaW5nLlxuICogQHJldHVybnMgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBjbGFzcyBvciBgbnVsbGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiLlxuICovXG5mdW5jdGlvbiBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6IENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NFeHByZXNzaW9uPnxudWxsIHtcbiAgaWYgKCF0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgfHwgbm9kZS5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBSZWNvZ25pemUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9ybSBgdmFyIE15Q2xhc3MgPSBjbGFzcyBNeUNsYXNzIHt9YCBvclxuICAvLyBgdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O2BcbiAgbGV0IGV4cHJlc3Npb24gPSBub2RlLmluaXRpYWxpemVyO1xuICB3aGlsZSAoaXNBc3NpZ25tZW50KGV4cHJlc3Npb24pKSB7XG4gICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24ucmlnaHQ7XG4gIH1cblxuICBpZiAoIXRzLmlzQ2xhc3NFeHByZXNzaW9uKGV4cHJlc3Npb24pIHx8ICFoYXNOYW1lSWRlbnRpZmllcihleHByZXNzaW9uKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIGV4cHJlc3Npb247XG59XG5cbmZ1bmN0aW9uIGdldERlY29yYXRvckFyZ3Mobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uW10ge1xuICAvLyBUaGUgYXJndW1lbnRzIG9mIGEgZGVjb3JhdG9yIGFyZSBoZWxkIGluIHRoZSBgYXJnc2AgcHJvcGVydHkgb2YgaXRzIGRlY2xhcmF0aW9uIG9iamVjdC5cbiAgY29uc3QgYXJnc1Byb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKHByb3BlcnR5ID0+IGdldE5hbWVUZXh0KHByb3BlcnR5Lm5hbWUpID09PSAnYXJncycpO1xuICBjb25zdCBhcmdzRXhwcmVzc2lvbiA9IGFyZ3NQcm9wZXJ0eSAmJiBhcmdzUHJvcGVydHkuaW5pdGlhbGl6ZXI7XG4gIHJldHVybiBhcmdzRXhwcmVzc2lvbiAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oYXJnc0V4cHJlc3Npb24pID9cbiAgICAgIEFycmF5LmZyb20oYXJnc0V4cHJlc3Npb24uZWxlbWVudHMpIDpcbiAgICAgIFtdO1xufVxuXG5mdW5jdGlvbiBpc1Byb3BlcnR5QWNjZXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiZcbiAgICB7cGFyZW50OiB0cy5CaW5hcnlFeHByZXNzaW9ufSB7XG4gIHJldHVybiAhIW5vZGUucGFyZW50ICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlLnBhcmVudCkgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZSk7XG59XG5cbmZ1bmN0aW9uIGlzVGhpc0Fzc2lnbm1lbnQobm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLkJpbmFyeUV4cHJlc3Npb24mXG4gICAge2xlZnQ6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbn0ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUubGVmdCkgJiZcbiAgICAgIG5vZGUubGVmdC5leHByZXNzaW9uLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuVGhpc0tleXdvcmQ7XG59XG5cbmZ1bmN0aW9uIGlzTmFtZWREZWNsYXJhdGlvbihub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXMgdHMuTmFtZWREZWNsYXJhdGlvbiZcbiAgICB7bmFtZTogdHMuSWRlbnRpZmllcn0ge1xuICBjb25zdCBhbnlOb2RlOiBhbnkgPSBub2RlO1xuICByZXR1cm4gISFhbnlOb2RlLm5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKGFueU5vZGUubmFtZSk7XG59XG5cblxuZnVuY3Rpb24gaXNDbGFzc01lbWJlclR5cGUobm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLkNsYXNzRWxlbWVudHxcbiAgICB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb258dHMuQmluYXJ5RXhwcmVzc2lvbiB7XG4gIHJldHVybiAodHMuaXNDbGFzc0VsZW1lbnQobm9kZSkgfHwgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSB8fCB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkpICYmXG4gICAgICAvLyBBZGRpdGlvbmFsbHksIGVuc3VyZSBgbm9kZWAgaXMgbm90IGFuIGluZGV4IHNpZ25hdHVyZSwgZm9yIGV4YW1wbGUgb24gYW4gYWJzdHJhY3QgY2xhc3M6XG4gICAgICAvLyBgYWJzdHJhY3QgY2xhc3MgRm9vIHsgW2tleTogc3RyaW5nXTogYW55OyB9YFxuICAgICAgIXRzLmlzSW5kZXhTaWduYXR1cmVEZWNsYXJhdGlvbihub2RlKTtcbn1cblxuLyoqXG4gKiBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRoYXQgdGhlIGdpdmVuIGRlY2xhcmF0aW9uIGlzIGFzc2lnbmVkIHRvLlxuICogRm9yIGV4YW1wbGUsIGZvciB0aGUgZm9sbG93aW5nIGNvZGU6XG4gKlxuICogYGBgXG4gKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gKiBgYGBcbiAqXG4gKiBhbmQgdGhlIHByb3ZpZGVkIGRlY2xhcmF0aW9uIGJlaW5nIGBjbGFzcyBNeUNsYXNzIHt9YCwgdGhpcyB3aWxsIHJldHVybiB0aGUgYHZhciBNeUNsYXNzYFxuICogZGVjbGFyYXRpb24uXG4gKlxuICogQHBhcmFtIGRlY2xhcmF0aW9uIFRoZSBkZWNsYXJhdGlvbiBmb3Igd2hpY2ggYW55IHZhcmlhYmxlIGRlY2xhcmF0aW9uIHNob3VsZCBiZSBvYnRhaW5lZC5cbiAqIEByZXR1cm5zIHRoZSBvdXRlciB2YXJpYWJsZSBkZWNsYXJhdGlvbiBpZiBmb3VuZCwgdW5kZWZpbmVkIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gZ2V0VmFyaWFibGVEZWNsYXJhdGlvbk9mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuVmFyaWFibGVEZWNsYXJhdGlvbnxcbiAgICB1bmRlZmluZWQge1xuICBsZXQgbm9kZSA9IGRlY2xhcmF0aW9uLnBhcmVudDtcblxuICAvLyBEZXRlY3QgYW4gaW50ZXJtZWRpYXJ5IHZhcmlhYmxlIGFzc2lnbm1lbnQgYW5kIHNraXAgb3ZlciBpdC5cbiAgaWYgKGlzQXNzaWdubWVudChub2RlKSAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5sZWZ0KSkge1xuICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgfVxuXG4gIHJldHVybiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgPyBub2RlIDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEEgY29uc3RydWN0b3IgZnVuY3Rpb24gbWF5IGhhdmUgYmVlbiBcInN5bnRoZXNpemVkXCIgYnkgVHlwZVNjcmlwdCBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0LFxuICogaW4gdGhlIGNhc2Ugbm8gdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgZS5nLiBwcm9wZXJ0eSBpbml0aWFsaXplcnMgYXJlIHVzZWQuXG4gKiBUaG9zZSBpbml0aWFsaXplcnMgbmVlZCB0byBiZSBlbWl0dGVkIGludG8gYSBjb25zdHJ1Y3RvciBpbiBKYXZhU2NyaXB0LCBzbyB0aGUgVHlwZVNjcmlwdFxuICogY29tcGlsZXIgZ2VuZXJhdGVzIGEgc3ludGhldGljIGNvbnN0cnVjdG9yLlxuICpcbiAqIFdlIG5lZWQgdG8gaWRlbnRpZnkgc3VjaCBjb25zdHJ1Y3RvcnMgYXMgbmdjYyBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgYSBjbGFzcyBkaWRcbiAqIG9yaWdpbmFsbHkgaGF2ZSBhIGNvbnN0cnVjdG9yIGluIHRoZSBUeXBlU2NyaXB0IHNvdXJjZS4gV2hlbiBhIGNsYXNzIGhhcyBhIHN1cGVyY2xhc3MsXG4gKiBhIHN5bnRoZXNpemVkIGNvbnN0cnVjdG9yIG11c3Qgbm90IGJlIGNvbnNpZGVyZWQgYXMgYSB1c2VyLWRlZmluZWQgY29uc3RydWN0b3IgYXMgdGhhdFxuICogcHJldmVudHMgYSBiYXNlIGZhY3RvcnkgY2FsbCBmcm9tIGJlaW5nIGNyZWF0ZWQgYnkgbmd0c2MsIHJlc3VsdGluZyBpbiBhIGZhY3RvcnkgZnVuY3Rpb25cbiAqIHRoYXQgZG9lcyBub3QgaW5qZWN0IHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlIHN1cGVyY2xhc3MuIEhlbmNlLCB3ZSBpZGVudGlmeSBhIGRlZmF1bHRcbiAqIHN5bnRoZXNpemVkIHN1cGVyIGNhbGwgaW4gdGhlIGNvbnN0cnVjdG9yIGJvZHksIGFjY29yZGluZyB0byB0aGUgc3RydWN0dXJlIHRoYXQgVHlwZVNjcmlwdFxuICogZW1pdHMgZHVyaW5nIEphdmFTY3JpcHQgZW1pdDpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iL3YzLjIuMi9zcmMvY29tcGlsZXIvdHJhbnNmb3JtZXJzL3RzLnRzI0wxMDY4LUwxMDgyXG4gKlxuICogQHBhcmFtIGNvbnN0cnVjdG9yIGEgY29uc3RydWN0b3IgZnVuY3Rpb24gdG8gdGVzdFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgY29uc3RydWN0b3IgYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWRcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yOiB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIGlmICghY29uc3RydWN0b3IuYm9keSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGZpcnN0U3RhdGVtZW50ID0gY29uc3RydWN0b3IuYm9keS5zdGF0ZW1lbnRzWzBdO1xuICBpZiAoIWZpcnN0U3RhdGVtZW50IHx8ICF0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoZmlyc3RTdGF0ZW1lbnQpKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIGlzU3ludGhlc2l6ZWRTdXBlckNhbGwoZmlyc3RTdGF0ZW1lbnQuZXhwcmVzc2lvbik7XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgZXhwcmVzc2lvbiBhcHBlYXJzIHRvIGhhdmUgYmVlbiBzeW50aGVzaXplZCBieSBUeXBlU2NyaXB0LCBpLmUuIHdoZXRoZXJcbiAqIGl0IGlzIG9mIHRoZSBmb2xsb3dpbmcgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhwcmVzc2lvbiB0aGUgZXhwcmVzc2lvbiB0aGF0IGlzIHRvIGJlIHRlc3RlZFxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZXhwcmVzc2lvbiBhcHBlYXJzIHRvIGJlIGEgc3ludGhlc2l6ZWQgc3VwZXIgY2FsbFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkU3VwZXJDYWxsKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBib29sZWFuIHtcbiAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLmV4cHJlc3Npb24ua2luZCAhPT0gdHMuU3ludGF4S2luZC5TdXBlcktleXdvcmQpIHJldHVybiBmYWxzZTtcbiAgaWYgKGV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCAhPT0gMSkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGFyZ3VtZW50ID0gZXhwcmVzc2lvbi5hcmd1bWVudHNbMF07XG4gIHJldHVybiB0cy5pc1NwcmVhZEVsZW1lbnQoYXJndW1lbnQpICYmIHRzLmlzSWRlbnRpZmllcihhcmd1bWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgYXJndW1lbnQuZXhwcmVzc2lvbi50ZXh0ID09PSAnYXJndW1lbnRzJztcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSBzdGF0ZW1lbnQgdGhhdCBjb250YWlucyB0aGUgZ2l2ZW4gbm9kZVxuICogQHBhcmFtIG5vZGUgYSBub2RlIHdob3NlIGNvbnRhaW5pbmcgc3RhdGVtZW50IHdlIHdpc2ggdG8gZmluZFxuICovXG5mdW5jdGlvbiBnZXRDb250YWluaW5nU3RhdGVtZW50KG5vZGU6IHRzLk5vZGUpOiB0cy5FeHByZXNzaW9uU3RhdGVtZW50fG51bGwge1xuICB3aGlsZSAobm9kZSkge1xuICAgIGlmICh0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQobm9kZSkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIG5vZGUgfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0Um9vdEZpbGVPckZhaWwoYnVuZGxlOiBCdW5kbGVQcm9ncmFtKTogdHMuU291cmNlRmlsZSB7XG4gIGNvbnN0IHJvb3RGaWxlID0gYnVuZGxlLnByb2dyYW0uZ2V0U291cmNlRmlsZShidW5kbGUucGF0aCk7XG4gIGlmIChyb290RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZ2l2ZW4gcm9vdFBhdGggJHtyb290RmlsZX0gaXMgbm90IGEgZmlsZSBvZiB0aGUgcHJvZ3JhbS5gKTtcbiAgfVxuICByZXR1cm4gcm9vdEZpbGU7XG59XG5cbmZ1bmN0aW9uIGdldE5vblJvb3RQYWNrYWdlRmlsZXMoYnVuZGxlOiBCdW5kbGVQcm9ncmFtKTogdHMuU291cmNlRmlsZVtdIHtcbiAgY29uc3Qgcm9vdEZpbGUgPSBidW5kbGUucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGJ1bmRsZS5wYXRoKTtcbiAgcmV0dXJuIGJ1bmRsZS5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKFxuICAgICAgZiA9PiAoZiAhPT0gcm9vdEZpbGUpICYmIGlzV2l0aGluUGFja2FnZShidW5kbGUucGFja2FnZSwgZikpO1xufVxuIl19