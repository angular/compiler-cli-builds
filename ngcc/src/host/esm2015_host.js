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
        function Esm2015ReflectionHost(logger, isCore, checker, dts) {
            var _this = _super.call(this, checker) || this;
            _this.logger = logger;
            _this.isCore = isCore;
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
            _this.dtsDeclarationMap =
                dts && _this.computeDtsDeclarationMap(dts.path, dts.program, dts.package) || null;
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
            if (superDeclaration !== null && superDeclaration.node !== null) {
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
            if (!this.dtsDeclarationMap) {
                return null;
            }
            if (!isNamedDeclaration(declaration)) {
                throw new Error("Cannot get the dts file for a declaration that has no name: " + declaration.getText() + " in " + declaration.getSourceFile().fileName);
            }
            return this.dtsDeclarationMap.has(declaration.name.text) ?
                this.dtsDeclarationMap.get(declaration.name.text) :
                null;
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
        ///////////// Protected Helpers /////////////
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
                    for (var _b = tslib_1.__values(sourceFile.statements), _c = _b.next(); !_c.done; _c = _b.next()) {
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
                !ts.isIdentifier(initializer.left) || !ts.isClassExpression(initializer.right)) {
                return;
            }
            var aliasedIdentifier = initializer.left;
            var aliasedDeclaration = this.getDeclarationOfIdentifier(aliasedIdentifier);
            if (aliasedDeclaration === null || aliasedDeclaration.node === null) {
                throw new Error("Unable to locate declaration of " + aliasedIdentifier.text + " in \"" + statement.getText() + "\"");
            }
            this.aliasedClassDeclarations.set(aliasedDeclaration.node, declaration.name);
        };
        /** Get the top level statements for a module.
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
            var helperCalls = this.getHelperCallsForClass(classSymbol, '__decorate');
            try {
                for (var helperCalls_1 = tslib_1.__values(helperCalls), helperCalls_1_1 = helperCalls_1.next(); !helperCalls_1_1.done; helperCalls_1_1 = helperCalls_1.next()) {
                    var helperCall = helperCalls_1_1.value;
                    if (isClassDecorateCall(helperCall, classSymbol.name)) {
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
                    else if (isMemberDecorateCall(helperCall, classSymbol.name)) {
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
         * Check the given statement to see if it is a call to the specified helper function or null if
         * not found.
         *
         * Matching statements will look like:  `tslib_1.__decorate(...);`.
         * @param statement the statement that may contain the call.
         * @param helperName the name of the helper we are looking for.
         * @returns the node that corresponds to the `__decorate(...)` call or null if the statement
         * does not match.
         */
        Esm2015ReflectionHost.prototype.getHelperCall = function (statement, helperName) {
            if (ts.isExpressionStatement(statement)) {
                var expression = statement.expression;
                while (isAssignment(expression)) {
                    expression = expression.right;
                }
                if (ts.isCallExpression(expression) && getCalleeName(expression) === helperName) {
                    return expression;
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
                                    import: _this.getImportOfIdentifier(decoratorIdentifier), node: node,
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
                implementation: node, kind: kind, type: type, name: name, nameNode: nameNode, value: value, isStatic: isStatic,
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
            var constructorParamInfo = this.acquireDecoratorInfo(classSymbol).constructorParamInfo;
            return parameterNodes.map(function (node, index) {
                var _a = constructorParamInfo[index] ?
                    constructorParamInfo[index] :
                    { decorators: null, typeExpression: null }, decorators = _a.decorators, typeExpression = _a.typeExpression;
                var nameNode = node.name;
                return {
                    name: utils_1.getNameText(nameNode),
                    nameNode: nameNode,
                    typeValueReference: typeExpression !== null ?
                        { local: true, expression: typeExpression, defaultImportStatement: null } :
                        null,
                    typeNode: null, decorators: decorators
                };
            });
        };
        /**
         * Get the parameter type and decorators for the constructor of a class,
         * where the information is stored on a static property of the class.
         *
         * Note that in ESM2015, the property is defined an array, or by an arrow function that returns an
         * array, of decorator and type information.
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
         * @param helperName the name of the helper (e.g. `__decorate`) whose calls we are interested
         * in.
         * @returns an array of CallExpression nodes for each matching helper call.
         */
        Esm2015ReflectionHost.prototype.getHelperCallsForClass = function (classSymbol, helperName) {
            var _this = this;
            return this.getStatementsForClass(classSymbol)
                .map(function (statement) { return _this.getHelperCall(statement, helperName); })
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
         * Extract all the class declarations from the dtsTypings program, storing them in a map
         * where the key is the declared name of the class and the value is the declaration itself.
         *
         * It is possible for there to be multiple class declarations with the same local name.
         * Only the first declaration with a given name is added to the map; subsequent classes will be
         * ignored.
         *
         * We are most interested in classes that are publicly exported from the entry point, so these
         * are added to the map first, to ensure that they are not ignored.
         *
         * @param dtsRootFileName The filename of the entry-point to the `dtsTypings` program.
         * @param dtsProgram The program containing all the typings files.
         * @returns a map of class names to class declarations.
         */
        Esm2015ReflectionHost.prototype.computeDtsDeclarationMap = function (dtsRootFileName, dtsProgram, dtsPackage) {
            var dtsDeclarationMap = new Map();
            var checker = dtsProgram.getTypeChecker();
            // First add all the classes that are publicly exported from the entry-point
            var rootFile = dtsProgram.getSourceFile(dtsRootFileName);
            if (!rootFile) {
                throw new Error("The given file " + dtsRootFileName + " is not part of the typings program.");
            }
            collectExportedDeclarations(checker, dtsDeclarationMap, rootFile);
            // Now add any additional classes that are exported from individual  dts files,
            // but are not publicly exported from the entry-point.
            dtsProgram.getSourceFiles().forEach(function (sourceFile) {
                if (!util_1.isWithinPackage(dtsPackage, sourceFile)) {
                    return;
                }
                collectExportedDeclarations(checker, dtsDeclarationMap, sourceFile);
            });
            return dtsDeclarationMap;
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
                ngModule: ngModuleDeclaration, declaration: declaration, container: container
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
     * @param className the name of the class that the call needs to correspond with.
     */
    function isClassDecorateCall(call, className) {
        var helperArgs = call.arguments[0];
        if (helperArgs === undefined || !ts.isArrayLiteralExpression(helperArgs)) {
            return false;
        }
        var target = call.arguments[1];
        return target !== undefined && ts.isIdentifier(target) && target.text === className;
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
     * @param className the name of the class that the call needs to correspond with.
     */
    function isMemberDecorateCall(call, className) {
        var helperArgs = call.arguments[0];
        if (helperArgs === undefined || !ts.isArrayLiteralExpression(helperArgs)) {
            return false;
        }
        var target = call.arguments[1];
        if (target === undefined || !ts.isPropertyAccessExpression(target) ||
            !ts.isIdentifier(target.expression) || target.expression.text !== className ||
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
     * Collect mappings between exported declarations in a source file and its associated
     * declaration in the typings program.
     */
    function collectExportedDeclarations(checker, dtsDeclarationMap, srcFile) {
        var srcModule = srcFile && checker.getSymbolAtLocation(srcFile);
        var moduleExports = srcModule && checker.getExportsOfModule(srcModule);
        if (moduleExports) {
            moduleExports.forEach(function (exportedSymbol) {
                if (exportedSymbol.flags & ts.SymbolFlags.Alias) {
                    exportedSymbol = checker.getAliasedSymbol(exportedSymbol);
                }
                var declaration = exportedSymbol.valueDeclaration;
                var name = exportedSymbol.name;
                if (declaration && !dtsDeclarationMap.has(name)) {
                    dtsDeclarationMap.set(name, declaration);
                }
            });
        }
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUdqQyx5RUFBZ087SUFDaE8scUVBQWlEO0lBR2pELDhEQUErRjtJQUUvRiwyRUFBeUw7SUFFNUssUUFBQSxVQUFVLEdBQUcsWUFBMkIsQ0FBQztJQUN6QyxRQUFBLGVBQWUsR0FBRyxnQkFBK0IsQ0FBQztJQUNsRCxRQUFBLFdBQVcsR0FBRyxlQUE4QixDQUFDO0lBQzdDLFFBQUEsa0JBQWtCLEdBQUcsZ0JBQStCLENBQUM7SUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BMEJHO0lBQ0g7UUFBMkMsaURBQXdCO1FBaUNqRSwrQkFDYyxNQUFjLEVBQVksTUFBZSxFQUFFLE9BQXVCLEVBQzVFLEdBQXdCO1lBRjVCLFlBR0Usa0JBQU0sT0FBTyxDQUFDLFNBR2Y7WUFMYSxZQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVksWUFBTSxHQUFOLE1BQU0sQ0FBUztZQS9CdkQ7O2VBRUc7WUFDTyw2QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUU3RDs7Ozs7Ozs7Ozs7Ozs7ZUFjRztZQUNPLDhCQUF3QixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1lBRTlFOzs7OztlQUtHO1lBQ08sb0JBQWMsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQU1wRSxLQUFJLENBQUMsaUJBQWlCO2dCQUNsQixHQUFHLElBQUksS0FBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDOztRQUN2RixDQUFDO1FBRUQ7Ozs7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S0FBSyxDQUFDO1FBRXBELElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztZQUN2RSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUM7SUFDL0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIENvbmNyZXRlRGVjbGFyYXRpb24sIEN0b3JQYXJhbWV0ZXIsIERlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCwgaXNEZWNvcmF0b3JJZGVudGlmaWVyLCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpc1dpdGhpblBhY2thZ2V9IGZyb20gJy4uL2FuYWx5c2lzL3V0aWwnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7QnVuZGxlUHJvZ3JhbX0gZnJvbSAnLi4vcGFja2FnZXMvYnVuZGxlX3Byb2dyYW0nO1xuaW1wb3J0IHtmaW5kQWxsLCBnZXROYW1lVGV4dCwgaGFzTmFtZUlkZW50aWZpZXIsIGlzRGVmaW5lZCwgc3RyaXBEb2xsYXJTdWZmaXh9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtDbGFzc1N5bWJvbCwgTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9uLCBOZ2NjQ2xhc3NTeW1ib2wsIE5nY2NSZWZsZWN0aW9uSG9zdCwgUFJFX1IzX01BUktFUiwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb24sIGlzU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4vbmdjY19ob3N0JztcblxuZXhwb3J0IGNvbnN0IERFQ09SQVRPUlMgPSAnZGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgUFJPUF9ERUNPUkFUT1JTID0gJ3Byb3BEZWNvcmF0b3JzJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBDT05TVFJVQ1RPUiA9ICdfX2NvbnN0cnVjdG9yJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBDT05TVFJVQ1RPUl9QQVJBTVMgPSAnY3RvclBhcmFtZXRlcnMnIGFzIHRzLl9fU3RyaW5nO1xuXG4vKipcbiAqIEVzbTIwMTUgcGFja2FnZXMgY29udGFpbiBFQ01BU2NyaXB0IDIwMTUgY2xhc3NlcywgZXRjLlxuICogRGVjb3JhdG9ycyBhcmUgZGVmaW5lZCB2aWEgc3RhdGljIHByb3BlcnRpZXMgb24gdGhlIGNsYXNzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGNsYXNzIFNvbWVEaXJlY3RpdmUge1xuICogfVxuICogU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzID0gW1xuICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gKiBdO1xuICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzID0ge1xuICogICBcImlucHV0MVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiAgIFwiaW5wdXQyXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqIH07XG4gKiBgYGBcbiAqXG4gKiAqIENsYXNzZXMgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqICogTWVtYmVycyBhcmUgZGVjb3JhdGVkIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcga2V5IG9uIGEgc3RhdGljIHByb3BlcnR5XG4gKiAgIGNhbGxlZCBgcHJvcERlY29yYXRvcnNgLlxuICogKiBDb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGRlY29yYXRvcnMgYXJlIGZvdW5kIG9uIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gKiAgIGEgc3RhdGljIG1ldGhvZCBjYWxsZWQgYGN0b3JQYXJhbWV0ZXJzYC5cbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCBpbXBsZW1lbnRzIE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gIHByb3RlY3RlZCBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+fG51bGw7XG5cbiAgLyoqXG4gICAqIFRoZSBzZXQgb2Ygc291cmNlIGZpbGVzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gcHJlcHJvY2Vzc2VkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHByZXByb2Nlc3NlZFNvdXJjZUZpbGVzID0gbmV3IFNldDx0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGNsYXNzIGRlY2xhcmF0aW9ucyBtYXkgaGF2ZSBiZWVuIGRvd24tbGV2ZWxlZCBpbnRvIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyxcbiAgICogaW5pdGlhbGl6ZWQgdXNpbmcgYSBjbGFzcyBleHByZXNzaW9uLiBJbiBjZXJ0YWluIHNjZW5hcmlvcywgYW4gYWRkaXRpb25hbCB2YXJpYWJsZVxuICAgKiBpcyBpbnRyb2R1Y2VkIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3Mgc28gdGhhdCByZXN1bHRzIGluIGNvZGUgc3VjaCBhczpcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBNeUNsYXNzXzE7IGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoaXMgbWFwIHRyYWNrcyB0aG9zZSBhbGlhc2VkIHZhcmlhYmxlcyB0byB0aGVpciBvcmlnaW5hbCBpZGVudGlmaWVyLCBpLmUuIHRoZSBrZXlcbiAgICogY29ycmVzcG9uZHMgd2l0aCB0aGUgZGVjbGFyYXRpb24gb2YgYE15Q2xhc3NfMWAgYW5kIGl0cyB2YWx1ZSBiZWNvbWVzIHRoZSBgTXlDbGFzc2AgaWRlbnRpZmllclxuICAgKiBvZiB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWFwIGlzIHBvcHVsYXRlZCBkdXJpbmcgdGhlIHByZXByb2Nlc3Npbmcgb2YgZWFjaCBzb3VyY2UgZmlsZS5cbiAgICovXG4gIHByb3RlY3RlZCBhbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCB0cy5JZGVudGlmaWVyPigpO1xuXG4gIC8qKlxuICAgKiBDYWNoZXMgdGhlIGluZm9ybWF0aW9uIG9mIHRoZSBkZWNvcmF0b3JzIG9uIGEgY2xhc3MsIGFzIHRoZSB3b3JrIGludm9sdmVkIHdpdGggZXh0cmFjdGluZ1xuICAgKiBkZWNvcmF0b3JzIGlzIGNvbXBsZXggYW5kIGZyZXF1ZW50bHkgdXNlZC5cbiAgICpcbiAgICogVGhpcyBtYXAgaXMgbGF6aWx5IHBvcHVsYXRlZCBkdXJpbmcgdGhlIGZpcnN0IGNhbGwgdG8gYGFjcXVpcmVEZWNvcmF0b3JJbmZvYCBmb3IgYSBnaXZlbiBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBkZWNvcmF0b3JDYWNoZSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9ySW5mbz4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBsb2dnZXI6IExvZ2dlciwgcHJvdGVjdGVkIGlzQ29yZTogYm9vbGVhbiwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBkdHM/OiBCdW5kbGVQcm9ncmFtfG51bGwpIHtcbiAgICBzdXBlcihjaGVja2VyKTtcbiAgICB0aGlzLmR0c0RlY2xhcmF0aW9uTWFwID1cbiAgICAgICAgZHRzICYmIHRoaXMuY29tcHV0ZUR0c0RlY2xhcmF0aW9uTWFwKGR0cy5wYXRoLCBkdHMucHJvZ3JhbSwgZHRzLnBhY2thZ2UpIHx8IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhIHN5bWJvbCBmb3IgYSBub2RlIHRoYXQgd2UgdGhpbmsgaXMgYSBjbGFzcy5cbiAgICogQ2xhc3NlcyBzaG91bGQgaGF2ZSBhIGBuYW1lYCBpZGVudGlmaWVyLCBiZWNhdXNlIHRoZXkgbWF5IG5lZWQgdG8gYmUgcmVmZXJlbmNlZCBpbiBvdGhlciBwYXJ0c1xuICAgKiBvZiB0aGUgcHJvZ3JhbS5cbiAgICpcbiAgICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogSGVyZSwgdGhlIGludGVybWVkaWF0ZSBgTXlDbGFzc18xYCBhc3NpZ25tZW50IGlzIG9wdGlvbmFsLiBJbiB0aGUgYWJvdmUgZXhhbXBsZSwgdGhlXG4gICAqIGBjbGFzcyBNeUNsYXNzIHt9YCBub2RlIGlzIHJldHVybmVkIGFzIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzYC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiBub2RlIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiIG9yIGhhcyBubyBzeW1ib2wuXG4gICAqL1xuICBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2xGcm9tT3V0ZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKHN5bWJvbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gc3ltYm9sO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluIEVTMjAxNSwgYSBjbGFzcyBtYXkgYmUgZGVjbGFyZWQgdXNpbmcgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGV4dHJhY3RzIHRoZSBgTmdjY0NsYXNzU3ltYm9sYCBmb3IgYE15Q2xhc3NgIHdoZW4gcHJvdmlkZWQgd2l0aCB0aGUgYHZhciBNeUNsYXNzYFxuICAgKiBkZWNsYXJhdGlvbiBub2RlLiBXaGVuIHRoZSBgY2xhc3MgTXlDbGFzcyB7fWAgbm9kZSBvciBhbnkgb3RoZXIgbm9kZSBpcyBnaXZlbiwgdGhpcyBtZXRob2Qgd2lsbFxuICAgKiByZXR1cm4gdW5kZWZpbmVkIGluc3RlYWQuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgZGVjbGFyYXRpb24gd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBkb2VzIG5vdCByZXByZXNlbnQgYW4gb3V0ZXIgZGVjbGFyYXRpb25cbiAgICogb2YgYSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbEZyb21PdXRlckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogTmdjY0NsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgLy8gQ3JlYXRlIGEgc3ltYm9sIHdpdGhvdXQgaW5uZXIgZGVjbGFyYXRpb24gaWYgdGhlIGRlY2xhcmF0aW9uIGlzIGEgcmVndWxhciBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSAmJiBoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUNsYXNzU3ltYm9sKGRlY2xhcmF0aW9uLCBudWxsKTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIHRoZSBkZWNsYXJhdGlvbiBtYXkgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiwgaW4gd2hpY2ggY2FzZSBpdCBtdXN0IGJlXG4gICAgLy8gaW5pdGlhbGl6ZWQgdXNpbmcgYSBjbGFzcyBleHByZXNzaW9uIGFzIGlubmVyIGRlY2xhcmF0aW9uLlxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pICYmIGhhc05hbWVJZGVudGlmaWVyKGRlY2xhcmF0aW9uKSkge1xuICAgICAgY29uc3QgaW5uZXJEZWNsYXJhdGlvbiA9IGdldElubmVyQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgICBpZiAoaW5uZXJEZWNsYXJhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChkZWNsYXJhdGlvbiwgaW5uZXJEZWNsYXJhdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIHVzaW5nIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBleHRyYWN0cyB0aGUgYE5nY2NDbGFzc1N5bWJvbGAgZm9yIGBNeUNsYXNzYCB3aGVuIHByb3ZpZGVkIHdpdGggdGhlXG4gICAqIGBjbGFzcyBNeUNsYXNzIHt9YCBkZWNsYXJhdGlvbiBub2RlLiBXaGVuIHRoZSBgdmFyIE15Q2xhc3NgIG5vZGUgb3IgYW55IG90aGVyIG5vZGUgaXMgZ2l2ZW4sXG4gICAqIHRoaXMgbWV0aG9kIHdpbGwgcmV0dXJuIHVuZGVmaW5lZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgZG9lcyBub3QgcmVwcmVzZW50IGFuIGlubmVyIGRlY2xhcmF0aW9uXG4gICAqIG9mIGEgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NTeW1ib2xGcm9tSW5uZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIGlmICghdHMuaXNDbGFzc0V4cHJlc3Npb24oZGVjbGFyYXRpb24pIHx8ICFoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ZXJEZWNsYXJhdGlvbiA9IGdldFZhcmlhYmxlRGVjbGFyYXRpb25PZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAob3V0ZXJEZWNsYXJhdGlvbiA9PT0gdW5kZWZpbmVkIHx8ICFoYXNOYW1lSWRlbnRpZmllcihvdXRlckRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChvdXRlckRlY2xhcmF0aW9uLCBkZWNsYXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBgTmdjY0NsYXNzU3ltYm9sYCBmcm9tIGFuIG91dGVyIGFuZCBpbm5lciBkZWNsYXJhdGlvbi4gSWYgYSBjbGFzcyBvbmx5IGhhcyBhbiBvdXRlclxuICAgKiBkZWNsYXJhdGlvbiwgdGhlIFwiaW1wbGVtZW50YXRpb25cIiBzeW1ib2wgb2YgdGhlIGNyZWF0ZWQgYE5nY2NDbGFzc1N5bWJvbGAgd2lsbCBiZSBzZXQgZXF1YWwgdG9cbiAgICogdGhlIFwiZGVjbGFyYXRpb25cIiBzeW1ib2wuXG4gICAqXG4gICAqIEBwYXJhbSBvdXRlckRlY2xhcmF0aW9uIFRoZSBvdXRlciBkZWNsYXJhdGlvbiBub2RlIG9mIHRoZSBjbGFzcy5cbiAgICogQHBhcmFtIGlubmVyRGVjbGFyYXRpb24gVGhlIGlubmVyIGRlY2xhcmF0aW9uIG5vZGUgb2YgdGhlIGNsYXNzLCBvciB1bmRlZmluZWQgaWYgbm8gaW5uZXJcbiAgICogZGVjbGFyYXRpb24gaXMgcHJlc2VudC5cbiAgICogQHJldHVybnMgdGhlIGBOZ2NjQ2xhc3NTeW1ib2xgIHJlcHJlc2VudGluZyB0aGUgY2xhc3MsIG9yIHVuZGVmaW5lZCBpZiBhIGB0cy5TeW1ib2xgIGZvciBhbnkgb2ZcbiAgICogdGhlIGRlY2xhcmF0aW9ucyBjb3VsZCBub3QgYmUgcmVzb2x2ZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgY3JlYXRlQ2xhc3NTeW1ib2woXG4gICAgICBvdXRlckRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uLCBpbm5lckRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9ufG51bGwpOiBOZ2NjQ2xhc3NTeW1ib2xcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGNvbnN0IGRlY2xhcmF0aW9uU3ltYm9sID1cbiAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24ob3V0ZXJEZWNsYXJhdGlvbi5uYW1lKSBhcyBDbGFzc1N5bWJvbCB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZGVjbGFyYXRpb25TeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBsZW1lbnRhdGlvblN5bWJvbCA9IGlubmVyRGVjbGFyYXRpb24gIT09IG51bGwgP1xuICAgICAgICB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpbm5lckRlY2xhcmF0aW9uLm5hbWUpIDpcbiAgICAgICAgZGVjbGFyYXRpb25TeW1ib2w7XG4gICAgaWYgKGltcGxlbWVudGF0aW9uU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY2xhcmF0aW9uU3ltYm9sLm5hbWUsXG4gICAgICBkZWNsYXJhdGlvbjogZGVjbGFyYXRpb25TeW1ib2wsXG4gICAgICBpbXBsZW1lbnRhdGlvbjogaW1wbGVtZW50YXRpb25TeW1ib2wsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gKGZvciBleGFtcGxlLCBvZiBhIGNsYXNzIG9yIGZ1bmN0aW9uKSBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGFueVxuICAgKiBkZWNvcmF0b3JzIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG9yIGZ1bmN0aW9uIG92ZXJcbiAgICogd2hpY2ggdG8gcmVmbGVjdC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBpbnRlbnQgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGFuZCB0aGVcbiAgICogc291cmNlIGlzIGluIEVTNiBmb3JtYXQsIHRoaXMgd2lsbCBiZSBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBub2RlLiBJZiB0aGUgc291cmNlIGlzIGluIEVTNVxuICAgKiBmb3JtYXQsIHRoaXMgbWlnaHQgYmUgYSBgdHMuVmFyaWFibGVEZWNsYXJhdGlvbmAgYXMgY2xhc3NlcyBpbiBFUzUgYXJlIHJlcHJlc2VudGVkIGFzIHRoZVxuICAgKiByZXN1bHQgb2YgYW4gSUlGRSBleGVjdXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBEZWNvcmF0b3JgIG1ldGFkYXRhIGlmIGRlY29yYXRvcnMgYXJlIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLCBvclxuICAgKiBgbnVsbGAgaWYgZWl0aGVyIG5vIGRlY29yYXRvcnMgd2VyZSBwcmVzZW50IG9yIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyBub3Qgb2YgYSBkZWNvcmF0YWJsZSB0eXBlLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgaWYgKCFzeW1ib2wpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBDbGFzc01lbWJlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBtZW1iZXJzIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldE1lbWJlcnNPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHRlZCB0byBnZXQgbWVtYmVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldE1lbWJlcnNPZlN5bWJvbChjbGFzc1N5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgaXRzIHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIG9ubHkgbG9va3MgYXQgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MgZGlyZWN0bHkgYW5kIG5vdCBhdCBhbnkgaW5oZXJpdGVkXG4gICAqIGNvbnN0cnVjdG9ycy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgUGFyYW1ldGVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIHBhcmFtZXRlcnMgb2YgdGhlIGNvbnN0cnVjdG9yLCBpZlxuICAgKiBhIGNvbnN0cnVjdG9yIGV4aXN0cy4gSWYgdGhlIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgaGFzIDAgcGFyYW1ldGVycywgdGhpcyBhcnJheSB3aWxsIGJlIGVtcHR5LlxuICAgKiBJZiB0aGUgY2xhc3MgaGFzIG5vIGNvbnN0cnVjdG9yLCB0aGlzIG1ldGhvZCByZXR1cm5zIGBudWxsYC5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IEN0b3JQYXJhbWV0ZXJbXXxudWxsIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQXR0ZW1wdGVkIHRvIGdldCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgbm9uLWNsYXNzOiBcIiR7Y2xhenouZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIGNvbnN0IHBhcmFtZXRlck5vZGVzID0gdGhpcy5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbCk7XG4gICAgaWYgKHBhcmFtZXRlck5vZGVzKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhjbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXMpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGhhc0Jhc2VDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHN1cGVySGFzQmFzZUNsYXNzID0gc3VwZXIuaGFzQmFzZUNsYXNzKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJIYXNCYXNlQ2xhc3MpIHtcbiAgICAgIHJldHVybiBzdXBlckhhc0Jhc2VDbGFzcztcbiAgICB9XG5cbiAgICBjb25zdCBpbm5lckNsYXNzRGVjbGFyYXRpb24gPSBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24oY2xhenopO1xuICAgIGlmIChpbm5lckNsYXNzRGVjbGFyYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIuaGFzQmFzZUNsYXNzKGlubmVyQ2xhc3NEZWNsYXJhdGlvbik7XG4gIH1cblxuICBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBGaXJzdCB0cnkgZ2V0dGluZyB0aGUgYmFzZSBjbGFzcyBmcm9tIHRoZSBcIm91dGVyXCIgZGVjbGFyYXRpb25cbiAgICBjb25zdCBzdXBlckJhc2VDbGFzc0lkZW50aWZpZXIgPSBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyKSB7XG4gICAgICByZXR1cm4gc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyO1xuICAgIH1cbiAgICAvLyBUaGF0IGRpZG4ndCB3b3JrIHNvIG5vdyB0cnkgZ2V0dGluZyBpdCBmcm9tIHRoZSBcImlubmVyXCIgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgaW5uZXJDbGFzc0RlY2xhcmF0aW9uID0gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoaW5uZXJDbGFzc0RlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmdldEJhc2VDbGFzc0V4cHJlc3Npb24oaW5uZXJDbGFzc0RlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBub2RlIGFjdHVhbGx5IHJlcHJlc2VudHMgYSBjbGFzcy5cbiAgICovXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgcmV0dXJuIHN1cGVyLmlzQ2xhc3Mobm9kZSkgfHwgdGhpcy5nZXRDbGFzc1N5bWJvbChub2RlKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyYWNlIGFuIGlkZW50aWZpZXIgdG8gaXRzIGRlY2xhcmF0aW9uLCBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYXR0ZW1wdHMgdG8gcmVzb2x2ZSB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGdpdmVuIGlkZW50aWZpZXIsIHRyYWNpbmcgYmFjayB0aHJvdWdoXG4gICAqIGltcG9ydHMgYW5kIHJlLWV4cG9ydHMgdW50aWwgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIHN0YXRlbWVudCBpcyBmb3VuZC4gQSBgRGVjbGFyYXRpb25gXG4gICAqIG9iamVjdCBpcyByZXR1cm5lZCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYCBpcyByZXR1cm5lZCBvdGhlcndpc2UuXG4gICAqXG4gICAqIEluIEVTMjAxNSwgd2UgbmVlZCB0byBhY2NvdW50IGZvciBpZGVudGlmaWVycyB0aGF0IHJlZmVyIHRvIGFsaWFzZWQgY2xhc3MgZGVjbGFyYXRpb25zIHN1Y2ggYXNcbiAgICogYE15Q2xhc3NfMWAuIFNpbmNlIHN1Y2ggZGVjbGFyYXRpb25zIGFyZSBvbmx5IGF2YWlsYWJsZSB3aXRoaW4gdGhlIG1vZHVsZSBpdHNlbGYsIHdlIG5lZWQgdG9cbiAgICogZmluZCB0aGUgb3JpZ2luYWwgY2xhc3MgZGVjbGFyYXRpb24sIGUuZy4gYE15Q2xhc3NgLCB0aGF0IGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgYWxpYXNlZCBvbmUuXG4gICAqXG4gICAqIEBwYXJhbSBpZCBhIFR5cGVTY3JpcHQgYHRzLklkZW50aWZpZXJgIHRvIHRyYWNlIGJhY2sgdG8gYSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgbWV0YWRhdGEgYWJvdXQgdGhlIGBEZWNsYXJhdGlvbmAgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQ6IHRzLklkZW50aWZpZXIpOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBjb25zdCBzdXBlckRlY2xhcmF0aW9uID0gc3VwZXIuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoaWQpO1xuXG4gICAgLy8gVGhlIGlkZW50aWZpZXIgbWF5IGhhdmUgYmVlbiBvZiBhbiBhZGRpdGlvbmFsIGNsYXNzIGFzc2lnbm1lbnQgc3VjaCBhcyBgTXlDbGFzc18xYCB0aGF0IHdhc1xuICAgIC8vIHByZXNlbnQgYXMgYWxpYXMgZm9yIGBNeUNsYXNzYC4gSWYgc28sIHJlc29sdmUgc3VjaCBhbGlhc2VzIHRvIHRoZWlyIG9yaWdpbmFsIGRlY2xhcmF0aW9uLlxuICAgIGlmIChzdXBlckRlY2xhcmF0aW9uICE9PSBudWxsICYmIHN1cGVyRGVjbGFyYXRpb24ubm9kZSAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgYWxpYXNlZElkZW50aWZpZXIgPSB0aGlzLnJlc29sdmVBbGlhc2VkQ2xhc3NJZGVudGlmaWVyKHN1cGVyRGVjbGFyYXRpb24ubm9kZSk7XG4gICAgICBpZiAoYWxpYXNlZElkZW50aWZpZXIgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoYWxpYXNlZElkZW50aWZpZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdXBlckRlY2xhcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGRlY29yYXRvcnMgb2YgdGhlIGdpdmVuIGNsYXNzIHN5bWJvbC4gQW55IGRlY29yYXRvciB0aGF0IGhhdmUgYmVlbiBzeW50aGV0aWNhbGx5XG4gICAqIGluamVjdGVkIGJ5IGEgbWlncmF0aW9uIHdpbGwgbm90IGJlIHByZXNlbnQgaW4gdGhlIHJldHVybmVkIGNvbGxlY3Rpb24uXG4gICAqL1xuICBnZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCB7Y2xhc3NEZWNvcmF0b3JzfSA9IHRoaXMuYWNxdWlyZURlY29yYXRvckluZm8oc3ltYm9sKTtcbiAgICBpZiAoY2xhc3NEZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gYSBjbG9uZSBvZiB0aGUgYXJyYXkgdG8gcHJldmVudCBjb25zdW1lcnMgZnJvbSBtdXRhdGluZyB0aGUgY2FjaGUuXG4gICAgcmV0dXJuIEFycmF5LmZyb20oY2xhc3NEZWNvcmF0b3JzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIG1vZHVsZSBmb3IgdmFyaWFibGUgZGVjbGFyYXRpb25zIGluIHdoaWNoIHRoZSBpbml0aWFsaXplclxuICAgKiBpcyBhbiBpZGVudGlmaWVyIG1hcmtlZCB3aXRoIHRoZSBgUFJFX1IzX01BUktFUmAuXG4gICAqIEBwYXJhbSBtb2R1bGUgdGhlIG1vZHVsZSBpbiB3aGljaCB0byBzZWFyY2ggZm9yIHN3aXRjaGFibGUgZGVjbGFyYXRpb25zLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgdGhhdCBtYXRjaC5cbiAgICovXG4gIGdldFN3aXRjaGFibGVEZWNsYXJhdGlvbnMobW9kdWxlOiB0cy5Ob2RlKTogU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb25bXSB7XG4gICAgLy8gRG9uJ3QgYm90aGVyIHRvIHdhbGsgdGhlIEFTVCBpZiB0aGUgbWFya2VyIGlzIG5vdCBmb3VuZCBpbiB0aGUgdGV4dFxuICAgIHJldHVybiBtb2R1bGUuZ2V0VGV4dCgpLmluZGV4T2YoUFJFX1IzX01BUktFUikgPj0gMCA/XG4gICAgICAgIGZpbmRBbGwobW9kdWxlLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uKSA6XG4gICAgICAgIFtdO1xuICB9XG5cbiAgZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdmFsdWUgPSBzdXBlci5nZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBXZSBoYXZlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCBoYXMgbm8gaW5pdGlhbGl6ZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gdmFyIEh0dHBDbGllbnRYc3JmTW9kdWxlXzE7XG4gICAgLy8gYGBgXG4gICAgLy9cbiAgICAvLyBTbyBsb29rIGZvciB0aGUgc3BlY2lhbCBzY2VuYXJpbyB3aGVyZSB0aGUgdmFyaWFibGUgaXMgYmVpbmcgYXNzaWduZWQgaW5cbiAgICAvLyBhIG5lYXJieSBzdGF0ZW1lbnQgdG8gdGhlIHJldHVybiB2YWx1ZSBvZiBhIGNhbGwgdG8gYF9fZGVjb3JhdGVgLlxuICAgIC8vIFRoZW4gZmluZCB0aGUgMm5kIGFyZ3VtZW50IG9mIHRoYXQgY2FsbCwgdGhlIFwidGFyZ2V0XCIsIHdoaWNoIHdpbGwgYmUgdGhlXG4gICAgLy8gYWN0dWFsIGNsYXNzIGlkZW50aWZpZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gSHR0cENsaWVudFhzcmZNb2R1bGUgPSBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xID0gdHNsaWJfMS5fX2RlY29yYXRlKFtcbiAgICAvLyAgIE5nTW9kdWxlKHtcbiAgICAvLyAgICAgcHJvdmlkZXJzOiBbXSxcbiAgICAvLyAgIH0pXG4gICAgLy8gXSwgSHR0cENsaWVudFhzcmZNb2R1bGUpO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gQW5kIGZpbmFsbHksIGZpbmQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBpZGVudGlmaWVyIGluIHRoYXQgYXJndW1lbnQuXG4gICAgLy8gTm90ZSBhbHNvIHRoYXQgdGhlIGFzc2lnbm1lbnQgY2FuIG9jY3VyIHdpdGhpbiBhbm90aGVyIGFzc2lnbm1lbnQuXG4gICAgLy9cbiAgICBjb25zdCBibG9jayA9IGRlY2xhcmF0aW9uLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgIGlmIChzeW1ib2wgJiYgKHRzLmlzQmxvY2soYmxvY2spIHx8IHRzLmlzU291cmNlRmlsZShibG9jaykpKSB7XG4gICAgICBjb25zdCBkZWNvcmF0ZUNhbGwgPSB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKGJsb2NrLCBzeW1ib2wpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZGVjb3JhdGVDYWxsICYmIGRlY29yYXRlQ2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodGFyZ2V0ICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHRhcmdldCk7XG4gICAgICAgIGNvbnN0IHRhcmdldERlY2xhcmF0aW9uID0gdGFyZ2V0U3ltYm9sICYmIHRhcmdldFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgICBpZiAodGFyZ2V0RGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSB8fFxuICAgICAgICAgICAgICB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGp1c3QgYSBmdW5jdGlvbiBvciBjbGFzcyBkZWNsYXJhdGlvblxuICAgICAgICAgICAgLy8gc28gcmV0dXJuIGl0cyBpZGVudGlmaWVyIGFzIHRoZSB2YXJpYWJsZSB2YWx1ZS5cbiAgICAgICAgICAgIHJldHVybiB0YXJnZXREZWNsYXJhdGlvbi5uYW1lIHx8IG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sIHNvIGZpbmQgdGhlIGZhciByaWdodCBleHByZXNzaW9uLFxuICAgICAgICAgICAgLy8gaW4gdGhlIGNhc2Ugb2YgbXVsdGlwbGUgYXNzaWdubWVudHMgKGUuZy4gYHZhcjEgPSB2YXIyID0gdmFsdWVgKS5cbiAgICAgICAgICAgIGxldCB0YXJnZXRWYWx1ZSA9IHRhcmdldERlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgd2hpbGUgKHRhcmdldFZhbHVlICYmIGlzQXNzaWdubWVudCh0YXJnZXRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgdGFyZ2V0VmFsdWUgPSB0YXJnZXRWYWx1ZS5yaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0YXJnZXRWYWx1ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRvcC1sZXZlbCBjbGFzcyBzeW1ib2xzIGluIHRoZSBnaXZlbiBmaWxlLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgc291cmNlIGZpbGUgdG8gc2VhcmNoIGZvciBjbGFzc2VzLlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBjbGFzcyBzeW1ib2xzLlxuICAgKi9cbiAgZmluZENsYXNzU3ltYm9scyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogTmdjY0NsYXNzU3ltYm9sW10ge1xuICAgIGNvbnN0IGNsYXNzZXM6IE5nY2NDbGFzc1N5bWJvbFtdID0gW107XG4gICAgdGhpcy5nZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGUpLmZvckVhY2goc3RhdGVtZW50ID0+IHtcbiAgICAgIGlmICh0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgICAgc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgICAgIGNsYXNzZXMucHVzaChjbGFzc1N5bWJvbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKHN0YXRlbWVudCk7XG4gICAgICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgICAgIGNsYXNzZXMucHVzaChjbGFzc1N5bWJvbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gY2xhc3NlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG51bWJlciBvZiBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZiBhIGdpdmVuIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIHRoZSBudW1iZXIgb2YgdHlwZSBwYXJhbWV0ZXJzIG9mIHRoZSBjbGFzcywgaWYga25vd24sIG9yIGBudWxsYCBpZiB0aGUgZGVjbGFyYXRpb25cbiAgICogaXMgbm90IGEgY2xhc3Mgb3IgaGFzIGFuIHVua25vd24gbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycy5cbiAgICovXG4gIGdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBudW1iZXJ8bnVsbCB7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb24gPSB0aGlzLmdldER0c0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoZHRzRGVjbGFyYXRpb24gJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c0RlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIGR0c0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzID8gZHRzRGVjbGFyYXRpb24udHlwZVBhcmFtZXRlcnMubGVuZ3RoIDogMDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVGFrZSBhbiBleHBvcnRlZCBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzIChtYXliZSBkb3duLWxldmVsZWQgdG8gYSB2YXJpYWJsZSkgYW5kIGxvb2sgdXAgdGhlXG4gICAqIGRlY2xhcmF0aW9uIG9mIGl0cyB0eXBlIGluIGEgc2VwYXJhdGUgLmQudHMgdHJlZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBpcyBhbGxvd2VkIHRvIHJldHVybiBgbnVsbGAgaWYgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCBkb2VzIG5vdCBoYXZlIGFcbiAgICogc2VwYXJhdGUgLmQudHMgdHJlZS4gV2hlbiBjb21waWxpbmcgVHlwZVNjcmlwdCBjb2RlIHRoaXMgaXMgYWx3YXlzIHRoZSBjYXNlLCBzaW5jZSAuZC50cyBmaWxlc1xuICAgKiBhcmUgcHJvZHVjZWQgb25seSBkdXJpbmcgdGhlIGVtaXQgb2Ygc3VjaCBhIGNvbXBpbGF0aW9uLiBXaGVuIGNvbXBpbGluZyAuanMgY29kZSwgaG93ZXZlcixcbiAgICogdGhlcmUgaXMgZnJlcXVlbnRseSBhIHBhcmFsbGVsIC5kLnRzIHRyZWUgd2hpY2ggdGhpcyBtZXRob2QgZXhwb3Nlcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgcmV0dXJuZWQgZnJvbSB0aGlzIGZ1bmN0aW9uIG1heSBub3QgYmUgZnJvbSB0aGUgc2FtZVxuICAgKiBgdHMuUHJvZ3JhbWAgYXMgdGhlIGlucHV0IGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0RHRzRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKCF0aGlzLmR0c0RlY2xhcmF0aW9uTWFwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKCFpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENhbm5vdCBnZXQgdGhlIGR0cyBmaWxlIGZvciBhIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIG5hbWU6ICR7ZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpbiAke2RlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZHRzRGVjbGFyYXRpb25NYXAuaGFzKGRlY2xhcmF0aW9uLm5hbWUudGV4dCkgP1xuICAgICAgICB0aGlzLmR0c0RlY2xhcmF0aW9uTWFwLmdldChkZWNsYXJhdGlvbi5uYW1lLnRleHQpICEgOlxuICAgICAgICBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCB0aGUgZ2l2ZW4gc291cmNlIGZpbGUgZm9yIGV4cG9ydGVkIGZ1bmN0aW9ucyBhbmQgc3RhdGljIGNsYXNzIG1ldGhvZHMgdGhhdCByZXR1cm5cbiAgICogTW9kdWxlV2l0aFByb3ZpZGVycyBvYmplY3RzLlxuICAgKiBAcGFyYW0gZiBUaGUgc291cmNlIGZpbGUgdG8gc2VhcmNoIGZvciB0aGVzZSBmdW5jdGlvbnNcbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgZnVuY3Rpb24gZGVjbGFyYXRpb25zIHRoYXQgbG9vayBsaWtlIHRoZXkgcmV0dXJuIE1vZHVsZVdpdGhQcm92aWRlcnNcbiAgICogb2JqZWN0cy5cbiAgICovXG4gIGdldE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbnMoZjogdHMuU291cmNlRmlsZSk6IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbltdIHtcbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUoZik7XG4gICAgaWYgKCFleHBvcnRzKSByZXR1cm4gW107XG4gICAgY29uc3QgaW5mb3M6IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbltdID0gW107XG4gICAgZXhwb3J0cy5mb3JFYWNoKChkZWNsYXJhdGlvbiwgbmFtZSkgPT4ge1xuICAgICAgaWYgKGRlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuaXNDbGFzcyhkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgICB0aGlzLmdldE1lbWJlcnNPZkNsYXNzKGRlY2xhcmF0aW9uLm5vZGUpLmZvckVhY2gobWVtYmVyID0+IHtcbiAgICAgICAgICBpZiAobWVtYmVyLmlzU3RhdGljKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0gdGhpcy5wYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoXG4gICAgICAgICAgICAgICAgbWVtYmVyLm5hbWUsIG1lbWJlci5ub2RlLCBtZW1iZXIuaW1wbGVtZW50YXRpb24sIGRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgICAgaW5mb3MucHVzaChpbmZvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGlzTmFtZWREZWNsYXJhdGlvbihkZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgICAgIGNvbnN0IGluZm8gPVxuICAgICAgICAgICAgICB0aGlzLnBhcnNlRm9yTW9kdWxlV2l0aFByb3ZpZGVycyhkZWNsYXJhdGlvbi5ub2RlLm5hbWUudGV4dCwgZGVjbGFyYXRpb24ubm9kZSk7XG4gICAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgIGluZm9zLnB1c2goaW5mbyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGluZm9zO1xuICB9XG5cbiAgLy8vLy8vLy8vLy8vLyBQcm90ZWN0ZWQgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBhY3R1YWwgY2xhc3MgZGVjbGFyYXRpb24gZm9yIGEgcG90ZW50aWFsbHkgYWxpYXNlZCBkZWNsYXJhdGlvbiBvZiBhXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBJZiB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gaXMgZm9yIGFuIGFsaWFzIG9mIGEgY2xhc3MsIHRoaXMgZnVuY3Rpb24gd2lsbCBkZXRlcm1pbmUgYW4gaWRlbnRpZmllclxuICAgKiB0byB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gdGhhdCByZXByZXNlbnRzIHRoaXMgY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gdG8gcmVzb2x2ZS5cbiAgICogQHJldHVybnMgVGhlIG9yaWdpbmFsIGlkZW50aWZpZXIgdGhhdCB0aGUgZ2l2ZW4gY2xhc3MgZGVjbGFyYXRpb24gcmVzb2x2ZXMgdG8sIG9yIGB1bmRlZmluZWRgXG4gICAqIGlmIHRoZSBkZWNsYXJhdGlvbiBkb2VzIG5vdCByZXByZXNlbnQgYW4gYWxpYXNlZCBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5JZGVudGlmaWVyfG51bGwge1xuICAgIHRoaXMuZW5zdXJlUHJlcHJvY2Vzc2VkKGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgcmV0dXJuIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLmhhcyhkZWNsYXJhdGlvbikgP1xuICAgICAgICB0aGlzLmFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucy5nZXQoZGVjbGFyYXRpb24pICEgOlxuICAgICAgICBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEVuc3VyZXMgdGhhdCB0aGUgc291cmNlIGZpbGUgdGhhdCBgbm9kZWAgaXMgcGFydCBvZiBoYXMgYmVlbiBwcmVwcm9jZXNzZWQuXG4gICAqXG4gICAqIER1cmluZyBwcmVwcm9jZXNzaW5nLCBhbGwgc3RhdGVtZW50cyBpbiB0aGUgc291cmNlIGZpbGUgd2lsbCBiZSB2aXNpdGVkIHN1Y2ggdGhhdCBjZXJ0YWluXG4gICAqIHByb2Nlc3Npbmcgc3RlcHMgY2FuIGJlIGRvbmUgdXAtZnJvbnQgYW5kIGNhY2hlZCBmb3Igc3Vic2VxdWVudCB1c2FnZXMuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBzb3VyY2UgZmlsZSB0aGF0IG5lZWRzIHRvIGhhdmUgZ29uZSB0aHJvdWdoIHByZXByb2Nlc3NpbmcuXG4gICAqL1xuICBwcm90ZWN0ZWQgZW5zdXJlUHJlcHJvY2Vzc2VkKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucHJlcHJvY2Vzc2VkU291cmNlRmlsZXMuaGFzKHNvdXJjZUZpbGUpKSB7XG4gICAgICB0aGlzLnByZXByb2Nlc3NlZFNvdXJjZUZpbGVzLmFkZChzb3VyY2VGaWxlKTtcblxuICAgICAgZm9yIChjb25zdCBzdGF0ZW1lbnQgb2Ygc291cmNlRmlsZS5zdGF0ZW1lbnRzKSB7XG4gICAgICAgIHRoaXMucHJlcHJvY2Vzc1N0YXRlbWVudChzdGF0ZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBbmFseXplcyB0aGUgZ2l2ZW4gc3RhdGVtZW50IHRvIHNlZSBpZiBpdCBjb3JyZXNwb25kcyB3aXRoIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gbGlrZVxuICAgKiBgbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O2AuIElmIHNvLCB0aGUgZGVjbGFyYXRpb24gb2YgYE15Q2xhc3NfMWBcbiAgICogaXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBgTXlDbGFzc2AgaWRlbnRpZmllci5cbiAgICpcbiAgICogQHBhcmFtIHN0YXRlbWVudCBUaGUgc3RhdGVtZW50IHRoYXQgbmVlZHMgdG8gYmUgcHJlcHJvY2Vzc2VkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHByZXByb2Nlc3NTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9IHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zO1xuICAgIGlmIChkZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBkZWNsYXJhdGlvbnNbMF07XG4gICAgY29uc3QgaW5pdGlhbGl6ZXIgPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNsYXJhdGlvbi5uYW1lKSB8fCAhaW5pdGlhbGl6ZXIgfHwgIWlzQXNzaWdubWVudChpbml0aWFsaXplcikgfHxcbiAgICAgICAgIXRzLmlzSWRlbnRpZmllcihpbml0aWFsaXplci5sZWZ0KSB8fCAhdHMuaXNDbGFzc0V4cHJlc3Npb24oaW5pdGlhbGl6ZXIucmlnaHQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWxpYXNlZElkZW50aWZpZXIgPSBpbml0aWFsaXplci5sZWZ0O1xuXG4gICAgY29uc3QgYWxpYXNlZERlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihhbGlhc2VkSWRlbnRpZmllcik7XG4gICAgaWYgKGFsaWFzZWREZWNsYXJhdGlvbiA9PT0gbnVsbCB8fCBhbGlhc2VkRGVjbGFyYXRpb24ubm9kZSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbmFibGUgdG8gbG9jYXRlIGRlY2xhcmF0aW9uIG9mICR7YWxpYXNlZElkZW50aWZpZXIudGV4dH0gaW4gXCIke3N0YXRlbWVudC5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG4gICAgdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuc2V0KGFsaWFzZWREZWNsYXJhdGlvbi5ub2RlLCBkZWNsYXJhdGlvbi5uYW1lKTtcbiAgfVxuXG4gIC8qKiBHZXQgdGhlIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciBhIG1vZHVsZS5cbiAgICpcbiAgICogSW4gRVM1IGFuZCBFUzIwMTUgdGhpcyBpcyBqdXN0IHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBvZiB0aGUgZmlsZS5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIG1vZHVsZSB3aG9zZSBzdGF0ZW1lbnRzIHdlIHdhbnQuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIGZvciB0aGUgZ2l2ZW4gbW9kdWxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1vZHVsZVN0YXRlbWVudHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzb3VyY2VGaWxlLnN0YXRlbWVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdhbGsgdGhlIEFTVCBsb29raW5nIGZvciBhbiBhc3NpZ25tZW50IHRvIHRoZSBzcGVjaWZpZWQgc3ltYm9sLlxuICAgKiBAcGFyYW0gbm9kZSBUaGUgY3VycmVudCBub2RlIHdlIGFyZSBzZWFyY2hpbmcuXG4gICAqIEByZXR1cm5zIGFuIGV4cHJlc3Npb24gdGhhdCByZXByZXNlbnRzIHRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUsIG9yIHVuZGVmaW5lZCBpZiBub25lIGNhbiBiZVxuICAgKiBmb3VuZC5cbiAgICovXG4gIHByb3RlY3RlZCBmaW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShub2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCwgc3ltYm9sOiB0cy5TeW1ib2wpOlxuICAgICAgdHMuQ2FsbEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiBub2RlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbikge1xuICAgICAgY29uc3QgbGVmdCA9IG5vZGUubGVmdDtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gbm9kZS5yaWdodDtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIobGVmdCkgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obGVmdCkgPT09IHN5bWJvbCkge1xuICAgICAgICByZXR1cm4gKHRzLmlzQ2FsbEV4cHJlc3Npb24ocmlnaHQpICYmIGdldENhbGxlZU5hbWUocmlnaHQpID09PSAnX19kZWNvcmF0ZScpID8gcmlnaHQgOiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUocmlnaHQsIHN5bWJvbCk7XG4gICAgfVxuICAgIHJldHVybiBub2RlLmZvckVhY2hDaGlsZChub2RlID0+IHRoaXMuZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUobm9kZSwgc3ltYm9sKSkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gcmV0cmlldmUgdGhlIHN5bWJvbCBvZiBhIHN0YXRpYyBwcm9wZXJ0eSBvbiBhIGNsYXNzLlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwcm9wZXJ0eSB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIHByb3BlcnR5TmFtZSB0aGUgbmFtZSBvZiBzdGF0aWMgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgaWYgaXQgaXMgZm91bmQgb3IgYHVuZGVmaW5lZGAgaWYgbm90LlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRpY1Byb3BlcnR5KHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sLCBwcm9wZXJ0eU5hbWU6IHRzLl9fU3RyaW5nKTogdHMuU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMgJiYgc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMuZ2V0KHByb3BlcnR5TmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeS1wb2ludCBmb3Igb2J0YWluaW5nIGluZm9ybWF0aW9uIG9uIHRoZSBkZWNvcmF0b3JzIG9mIGEgZ2l2ZW4gY2xhc3MuIFRoaXNcbiAgICogaW5mb3JtYXRpb24gaXMgY29tcHV0ZWQgZWl0aGVyIGZyb20gc3RhdGljIHByb3BlcnRpZXMgaWYgcHJlc2VudCwgb3IgdXNpbmcgYHRzbGliLl9fZGVjb3JhdGVgXG4gICAqIGhlbHBlciBjYWxscyBvdGhlcndpc2UuIFRoZSBjb21wdXRlZCByZXN1bHQgaXMgY2FjaGVkIHBlciBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyBmb3Igd2hpY2ggZGVjb3JhdG9ycyBzaG91bGQgYmUgYWNxdWlyZWQuXG4gICAqIEByZXR1cm5zIGFsbCBpbmZvcm1hdGlvbiBvZiB0aGUgZGVjb3JhdG9ycyBvbiB0aGUgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWNxdWlyZURlY29yYXRvckluZm8oY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IERlY29yYXRvckluZm8ge1xuICAgIGNvbnN0IGRlY2wgPSBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmICh0aGlzLmRlY29yYXRvckNhY2hlLmhhcyhkZWNsKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVjb3JhdG9yQ2FjaGUuZ2V0KGRlY2wpICE7XG4gICAgfVxuXG4gICAgLy8gRXh0cmFjdCBkZWNvcmF0b3JzIGZyb20gc3RhdGljIHByb3BlcnRpZXMgYW5kIGBfX2RlY29yYXRlYCBoZWxwZXIgY2FsbHMsIHRoZW4gbWVyZ2UgdGhlbVxuICAgIC8vIHRvZ2V0aGVyIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSBzdGF0aWMgcHJvcGVydGllcyBpcyBwcmVmZXJyZWQuXG4gICAgY29uc3Qgc3RhdGljUHJvcHMgPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbVN0YXRpY1Byb3BlcnRpZXMoY2xhc3NTeW1ib2wpO1xuICAgIGNvbnN0IGhlbHBlckNhbGxzID0gdGhpcy5jb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21IZWxwZXJDYWxscyhjbGFzc1N5bWJvbCk7XG5cbiAgICBjb25zdCBkZWNvcmF0b3JJbmZvOiBEZWNvcmF0b3JJbmZvID0ge1xuICAgICAgY2xhc3NEZWNvcmF0b3JzOiBzdGF0aWNQcm9wcy5jbGFzc0RlY29yYXRvcnMgfHwgaGVscGVyQ2FsbHMuY2xhc3NEZWNvcmF0b3JzLFxuICAgICAgbWVtYmVyRGVjb3JhdG9yczogc3RhdGljUHJvcHMubWVtYmVyRGVjb3JhdG9ycyB8fCBoZWxwZXJDYWxscy5tZW1iZXJEZWNvcmF0b3JzLFxuICAgICAgY29uc3RydWN0b3JQYXJhbUluZm86IHN0YXRpY1Byb3BzLmNvbnN0cnVjdG9yUGFyYW1JbmZvIHx8IGhlbHBlckNhbGxzLmNvbnN0cnVjdG9yUGFyYW1JbmZvLFxuICAgIH07XG5cbiAgICB0aGlzLmRlY29yYXRvckNhY2hlLnNldChkZWNsLCBkZWNvcmF0b3JJbmZvKTtcbiAgICByZXR1cm4gZGVjb3JhdG9ySW5mbztcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byBjb21wdXRlIGRlY29yYXRvciBpbmZvcm1hdGlvbiBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzIFwiZGVjb3JhdG9yc1wiLCBcInByb3BEZWNvcmF0b3JzXCJcbiAgICogYW5kIFwiY3RvclBhcmFtZXRlcnNcIiBvbiB0aGUgY2xhc3MuIElmIG5laXRoZXIgb2YgdGhlc2Ugc3RhdGljIHByb3BlcnRpZXMgaXMgcHJlc2VudCB0aGVcbiAgICogbGlicmFyeSBpcyBsaWtlbHkgbm90IGNvbXBpbGVkIHVzaW5nIHRzaWNrbGUgZm9yIHVzYWdlIHdpdGggQ2xvc3VyZSBjb21waWxlciwgaW4gd2hpY2ggY2FzZVxuICAgKiBgbnVsbGAgaXMgcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCBUaGUgY2xhc3Mgc3ltYm9sIHRvIGNvbXB1dGUgdGhlIGRlY29yYXRvcnMgaW5mb3JtYXRpb24gZm9yLlxuICAgKiBAcmV0dXJucyBBbGwgaW5mb3JtYXRpb24gb24gdGhlIGRlY29yYXRvcnMgYXMgZXh0cmFjdGVkIGZyb20gc3RhdGljIHByb3BlcnRpZXMsIG9yIGBudWxsYCBpZlxuICAgKiBub25lIG9mIHRoZSBzdGF0aWMgcHJvcGVydGllcyBleGlzdC5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21TdGF0aWNQcm9wZXJ0aWVzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiB7XG4gICAgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSB8IG51bGw7IG1lbWJlckRlY29yYXRvcnM6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPnwgbnVsbDtcbiAgICBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW10gfCBudWxsO1xuICB9IHtcbiAgICBsZXQgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsID0gbnVsbDtcbiAgICBsZXQgbWVtYmVyRGVjb3JhdG9yczogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+fG51bGwgPSBudWxsO1xuICAgIGxldCBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW118bnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCBkZWNvcmF0b3JzUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBERUNPUkFUT1JTKTtcbiAgICBpZiAoZGVjb3JhdG9yc1Byb3BlcnR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNsYXNzRGVjb3JhdG9ycyA9IHRoaXMuZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvcERlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIFBST1BfREVDT1JBVE9SUyk7XG4gICAgaWYgKHByb3BEZWNvcmF0b3JzUHJvcGVydHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgbWVtYmVyRGVjb3JhdG9ycyA9IHRoaXMuZ2V0TWVtYmVyRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShwcm9wRGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9XG5cbiAgICBjb25zdCBjb25zdHJ1Y3RvclBhcmFtc1Byb3BlcnR5ID0gdGhpcy5nZXRTdGF0aWNQcm9wZXJ0eShjbGFzc1N5bWJvbCwgQ09OU1RSVUNUT1JfUEFSQU1TKTtcbiAgICBpZiAoY29uc3RydWN0b3JQYXJhbXNQcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mbyA9IHRoaXMuZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KGNvbnN0cnVjdG9yUGFyYW1zUHJvcGVydHkpO1xuICAgIH1cblxuICAgIHJldHVybiB7Y2xhc3NEZWNvcmF0b3JzLCBtZW1iZXJEZWNvcmF0b3JzLCBjb25zdHJ1Y3RvclBhcmFtSW5mb307XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBjbGFzcyBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MsIHdoZXJlIHRoZSBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZFxuICAgKiB2aWEgYSBzdGF0aWMgcHJvcGVydHkuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNTeW1ib2wgdGhlIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGRlY29yYXRvcnMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgb3IgbnVsbCBpZiBub25lIHdoZXJlIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzU3ltYm9sOiB0cy5TeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzSWRlbnRpZmllciA9IGRlY29yYXRvcnNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoZGVjb3JhdG9yc0lkZW50aWZpZXIgJiYgZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSB7XG4gICAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkgJiZcbiAgICAgICAgICBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICAgIC8vIEFTVCBvZiB0aGUgYXJyYXkgb2YgZGVjb3JhdG9yIHZhbHVlc1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzQXJyYXkgPSBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQucmlnaHQ7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheSlcbiAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIHN5bWJvbCB3aGljaCBzaG91bGQgYmUgb2YgYSBjbGFzcywgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBpdHMgbWVtYmVycy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgYENsYXNzU3ltYm9sYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlcnNPZlN5bWJvbChzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcblxuICAgIC8vIFRoZSBkZWNvcmF0b3JzIG1hcCBjb250YWlucyBhbGwgdGhlIHByb3BlcnRpZXMgdGhhdCBhcmUgZGVjb3JhdGVkXG4gICAgY29uc3Qge21lbWJlckRlY29yYXRvcnN9ID0gdGhpcy5hY3F1aXJlRGVjb3JhdG9ySW5mbyhzeW1ib2wpO1xuXG4gICAgLy8gTWFrZSBhIGNvcHkgb2YgdGhlIGRlY29yYXRvcnMgYXMgc3VjY2Vzc2Z1bGx5IHJlZmxlY3RlZCBtZW1iZXJzIGRlbGV0ZSB0aGVtc2VsdmVzIGZyb20gdGhlXG4gICAgLy8gbWFwLCBzbyB0aGF0IGFueSBsZWZ0b3ZlcnMgY2FuIGJlIGVhc2lseSBkZWFsdCB3aXRoLlxuICAgIGNvbnN0IGRlY29yYXRvcnNNYXAgPSBuZXcgTWFwKG1lbWJlckRlY29yYXRvcnMpO1xuXG4gICAgLy8gVGhlIG1lbWJlciBtYXAgY29udGFpbnMgYWxsIHRoZSBtZXRob2QgKGluc3RhbmNlIGFuZCBzdGF0aWMpOyBhbmQgYW55IGluc3RhbmNlIHByb3BlcnRpZXNcbiAgICAvLyB0aGF0IGFyZSBpbml0aWFsaXplZCBpbiB0aGUgY2xhc3MuXG4gICAgaWYgKHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5tZW1iZXJzKSB7XG4gICAgICBzeW1ib2wuaW1wbGVtZW50YXRpb24ubWVtYmVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMpO1xuICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVGhlIHN0YXRpYyBwcm9wZXJ0eSBtYXAgY29udGFpbnMgYWxsIHRoZSBzdGF0aWMgcHJvcGVydGllc1xuICAgIGlmIChzeW1ib2wuaW1wbGVtZW50YXRpb24uZXhwb3J0cykge1xuICAgICAgc3ltYm9sLmltcGxlbWVudGF0aW9uLmV4cG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgIGNvbnN0IHJlZmxlY3RlZE1lbWJlcnMgPSB0aGlzLnJlZmxlY3RNZW1iZXJzKHZhbHVlLCBkZWNvcmF0b3JzLCB0cnVlKTtcbiAgICAgICAgaWYgKHJlZmxlY3RlZE1lbWJlcnMpIHtcbiAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICBtZW1iZXJzLnB1c2goLi4ucmVmbGVjdGVkTWVtYmVycyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoaXMgY2xhc3Mgd2FzIGRlY2xhcmVkIGFzIGEgVmFyaWFibGVEZWNsYXJhdGlvbiB0aGVuIGl0IG1heSBoYXZlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgLy8gYXR0YWNoZWQgdG8gdGhlIHZhcmlhYmxlIHJhdGhlciB0aGFuIHRoZSBjbGFzcyBpdHNlbGZcbiAgICAvLyBGb3IgZXhhbXBsZTpcbiAgICAvLyBgYGBcbiAgICAvLyBsZXQgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge1xuICAgIC8vICAgLy8gbm8gc3RhdGljIHByb3BlcnRpZXMgaGVyZSFcbiAgICAvLyB9XG4gICAgLy8gTXlDbGFzcy5zdGF0aWNQcm9wZXJ0eSA9IC4uLjtcbiAgICAvLyBgYGBcbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHN5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgaWYgKHN5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzKSB7XG4gICAgICAgIHN5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlYWwgd2l0aCBhbnkgZGVjb3JhdGVkIHByb3BlcnRpZXMgdGhhdCB3ZXJlIG5vdCBpbml0aWFsaXplZCBpbiB0aGUgY2xhc3NcbiAgICBkZWNvcmF0b3JzTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgIGltcGxlbWVudGF0aW9uOiBudWxsLFxuICAgICAgICBkZWNvcmF0b3JzOiB2YWx1ZSxcbiAgICAgICAgaXNTdGF0aWM6IGZhbHNlLFxuICAgICAgICBraW5kOiBDbGFzc01lbWJlcktpbmQuUHJvcGVydHksXG4gICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgbmFtZU5vZGU6IG51bGwsXG4gICAgICAgIG5vZGU6IG51bGwsXG4gICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgIHZhbHVlOiBudWxsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBtZW1iZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIE1lbWJlciBkZWNvcmF0b3JzIG1heSBiZSBkZWNsYXJlZCBhcyBzdGF0aWMgcHJvcGVydGllcyBvZiB0aGUgY2xhc3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzID0ge1xuICAgKiAgIFwibmdGb3JPZlwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRyYWNrQnlcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiAgIFwibmdGb3JUZW1wbGF0ZVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqIH07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc1Byb3BlcnR5IHRoZSBjbGFzcyB3aG9zZSBtZW1iZXIgZGVjb3JhdG9ycyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYSBtYXAgd2hvc2Uga2V5cyBhcmUgdGhlIG5hbWUgb2YgdGhlIG1lbWJlcnMgYW5kIHdob3NlIHZhbHVlcyBhcmUgY29sbGVjdGlvbnMgb2ZcbiAgICogZGVjb3JhdG9ycyBmb3IgdGhlIGdpdmVuIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNZW1iZXJEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTpcbiAgICAgIE1hcDxzdHJpbmcsIERlY29yYXRvcltdPiB7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICAvLyBTeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgZm9yIGBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzYC5cbiAgICBjb25zdCBwcm9wRGVjb3JhdG9yc01hcCA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKGRlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHByb3BEZWNvcmF0b3JzTWFwICYmIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocHJvcERlY29yYXRvcnNNYXApKSB7XG4gICAgICBjb25zdCBwcm9wZXJ0aWVzTWFwID0gcmVmbGVjdE9iamVjdExpdGVyYWwocHJvcERlY29yYXRvcnNNYXApO1xuICAgICAgcHJvcGVydGllc01hcC5mb3JFYWNoKCh2YWx1ZSwgbmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID1cbiAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnModmFsdWUpLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGgpIHtcbiAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLnNldChuYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXJEZWNvcmF0b3JzO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvciBhIGdpdmVuIGNsYXNzIHN5bWJvbCwgY29sbGVjdHMgYWxsIGRlY29yYXRvciBpbmZvcm1hdGlvbiBmcm9tIHRzbGliIGhlbHBlciBtZXRob2RzLCBhc1xuICAgKiBnZW5lcmF0ZWQgYnkgVHlwZVNjcmlwdCBpbnRvIGVtaXR0ZWQgSmF2YVNjcmlwdCBmaWxlcy5cbiAgICpcbiAgICogQ2xhc3MgZGVjb3JhdG9ycyBhcmUgZXh0cmFjdGVkIGZyb20gY2FsbHMgdG8gYHRzbGliLl9fZGVjb3JhdGVgIHRoYXQgbG9vayBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IFNvbWVEaXJlY3RpdmUgPSBjbGFzcyBTb21lRGlyZWN0aXZlIHt9XG4gICAqIFNvbWVEaXJlY3RpdmUgPSBfX2RlY29yYXRlKFtcbiAgICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGV4dHJhY3Rpb24gb2YgbWVtYmVyIGRlY29yYXRvcnMgaXMgc2ltaWxhciwgd2l0aCB0aGUgZGlzdGluY3Rpb24gdGhhdCBpdHMgMm5kIGFuZCAzcmRcbiAgICogYXJndW1lbnQgY29ycmVzcG9uZCB3aXRoIGEgXCJwcm90b3R5cGVcIiB0YXJnZXQgYW5kIHRoZSBuYW1lIG9mIHRoZSBtZW1iZXIgdG8gd2hpY2ggdGhlXG4gICAqIGRlY29yYXRvcnMgYXBwbHkuXG4gICAqXG4gICAqIGBgYFxuICAgKiBfX2RlY29yYXRlKFtcbiAgICogICAgIElucHV0KCksXG4gICAqICAgICBfX21ldGFkYXRhKFwiZGVzaWduOnR5cGVcIiwgU3RyaW5nKVxuICAgKiBdLCBTb21lRGlyZWN0aXZlLnByb3RvdHlwZSwgXCJpbnB1dDFcIiwgdm9pZCAwKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCBUaGUgY2xhc3Mgc3ltYm9sIGZvciB3aGljaCBkZWNvcmF0b3JzIHNob3VsZCBiZSBleHRyYWN0ZWQuXG4gICAqIEByZXR1cm5zIEFsbCBpbmZvcm1hdGlvbiBvbiB0aGUgZGVjb3JhdG9ycyBvZiB0aGUgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29tcHV0ZURlY29yYXRvckluZm9Gcm9tSGVscGVyQ2FsbHMoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IERlY29yYXRvckluZm8ge1xuICAgIGxldCBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG4gICAgY29uc3QgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdID0gW107XG5cbiAgICBjb25zdCBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyA9IChpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBsZXQgcGFyYW0gPSBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF07XG4gICAgICBpZiAocGFyYW0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwYXJhbSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XSA9IHtkZWNvcmF0b3JzOiBudWxsLCB0eXBlRXhwcmVzc2lvbjogbnVsbH07XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFyYW07XG4gICAgfTtcblxuICAgIC8vIEFsbCByZWxldmFudCBpbmZvcm1hdGlvbiBjYW4gYmUgZXh0cmFjdGVkIGZyb20gY2FsbHMgdG8gYF9fZGVjb3JhdGVgLCBvYnRhaW4gdGhlc2UgZmlyc3QuXG4gICAgLy8gTm90ZSB0aGF0IGFsdGhvdWdoIHRoZSBoZWxwZXIgY2FsbHMgYXJlIHJldHJpZXZlZCB1c2luZyB0aGUgY2xhc3Mgc3ltYm9sLCB0aGUgcmVzdWx0IG1heVxuICAgIC8vIGNvbnRhaW4gaGVscGVyIGNhbGxzIGNvcnJlc3BvbmRpbmcgd2l0aCB1bnJlbGF0ZWQgY2xhc3Nlcy4gVGhlcmVmb3JlLCBlYWNoIGhlbHBlciBjYWxsIHN0aWxsXG4gICAgLy8gaGFzIHRvIGJlIGNoZWNrZWQgdG8gYWN0dWFsbHkgY29ycmVzcG9uZCB3aXRoIHRoZSBjbGFzcyBzeW1ib2wuXG4gICAgY29uc3QgaGVscGVyQ2FsbHMgPSB0aGlzLmdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2wsICdfX2RlY29yYXRlJyk7XG5cbiAgICBmb3IgKGNvbnN0IGhlbHBlckNhbGwgb2YgaGVscGVyQ2FsbHMpIHtcbiAgICAgIGlmIChpc0NsYXNzRGVjb3JhdGVDYWxsKGhlbHBlckNhbGwsIGNsYXNzU3ltYm9sLm5hbWUpKSB7XG4gICAgICAgIC8vIFRoaXMgYF9fZGVjb3JhdGVgIGNhbGwgaXMgdGFyZ2V0aW5nIHRoZSBjbGFzcyBpdHNlbGYuXG4gICAgICAgIGNvbnN0IGhlbHBlckFyZ3MgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1swXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgaGVscGVyQXJncy5lbGVtZW50cykge1xuICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5yZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShlbGVtZW50KTtcbiAgICAgICAgICBpZiAoZW50cnkgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSAnZGVjb3JhdG9yJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgd2FzIHJlZmxlY3RlZCB0byByZXByZXNlbnQgYW4gYWN0dWFsIGRlY29yYXRvclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNGcm9tQ29yZShlbnRyeS5kZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICAgIChjbGFzc0RlY29yYXRvcnMgfHwgKGNsYXNzRGVjb3JhdG9ycyA9IFtdKSkucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkudHlwZSA9PT0gJ3BhcmFtOmRlY29yYXRvcnMnKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyByZXByZXNlbnRzIGEgZGVjb3JhdG9yIGZvciBhIHBhcmFtZXRlci4gU2luY2UgaXQncyBhcHBsaWVkIHRvIHRoZVxuICAgICAgICAgICAgLy8gY2xhc3MsIGl0IGNvcnJlc3BvbmRzIHdpdGggYSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgb2YgdGhlIGNsYXNzLlxuICAgICAgICAgICAgY29uc3QgcGFyYW0gPSBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhlbnRyeS5pbmRleCk7XG4gICAgICAgICAgICAocGFyYW0uZGVjb3JhdG9ycyB8fCAocGFyYW0uZGVjb3JhdG9ycyA9IFtdKSkucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkudHlwZSA9PT0gJ3BhcmFtcycpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHJlcHJlc2VudHMgdGhlIHR5cGVzIG9mIHRoZSBwYXJhbWV0ZXJzLiBTaW5jZSBpdCdzIGFwcGxpZWQgdG8gdGhlXG4gICAgICAgICAgICAvLyBjbGFzcywgaXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiB0aGUgY2xhc3MuXG4gICAgICAgICAgICBlbnRyeS50eXBlcy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICh0eXBlLCBpbmRleCkgPT4gZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oaW5kZXgpLnR5cGVFeHByZXNzaW9uID0gdHlwZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzTWVtYmVyRGVjb3JhdGVDYWxsKGhlbHBlckNhbGwsIGNsYXNzU3ltYm9sLm5hbWUpKSB7XG4gICAgICAgIC8vIFRoZSBgX19kZWNvcmF0ZWAgY2FsbCBpcyB0YXJnZXRpbmcgYSBtZW1iZXIgb2YgdGhlIGNsYXNzXG4gICAgICAgIGNvbnN0IGhlbHBlckFyZ3MgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgICAgY29uc3QgbWVtYmVyTmFtZSA9IGhlbHBlckNhbGwuYXJndW1lbnRzWzJdLnRleHQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGhlbHBlckFyZ3MuZWxlbWVudHMpIHtcbiAgICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMucmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZWxlbWVudCk7XG4gICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ2RlY29yYXRvcicpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHdhcyByZWZsZWN0ZWQgdG8gcmVwcmVzZW50IGFuIGFjdHVhbCBkZWNvcmF0b3IuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0Zyb21Db3JlKGVudHJ5LmRlY29yYXRvcikpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9XG4gICAgICAgICAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLmhhcyhtZW1iZXJOYW1lKSA/IG1lbWJlckRlY29yYXRvcnMuZ2V0KG1lbWJlck5hbWUpICEgOiBbXTtcbiAgICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKGVudHJ5LmRlY29yYXRvcik7XG4gICAgICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG1lbWJlck5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJbmZvcm1hdGlvbiBvbiBkZWNvcmF0ZWQgcGFyYW1ldGVycyBpcyBub3QgaW50ZXJlc3RpbmcgZm9yIG5nY2MsIHNvIGl0J3MgaWdub3JlZC5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge2NsYXNzRGVjb3JhdG9ycywgbWVtYmVyRGVjb3JhdG9ycywgY29uc3RydWN0b3JQYXJhbUluZm99O1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3QgdGhlIGRldGFpbHMgb2YgYW4gZW50cnkgd2l0aGluIGEgYF9fZGVjb3JhdGVgIGhlbHBlciBjYWxsLiBGb3IgZXhhbXBsZSwgZ2l2ZW4gdGhlXG4gICAqIGZvbGxvd2luZyBjb2RlOlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiAgIHRzbGliXzEuX19wYXJhbSgyLCBJbmplY3QoSU5KRUNURURfVE9LRU4pKSxcbiAgICogICB0c2xpYl8xLl9fbWV0YWRhdGEoXCJkZXNpZ246cGFyYW10eXBlc1wiLCBbVmlld0NvbnRhaW5lclJlZiwgVGVtcGxhdGVSZWYsIFN0cmluZ10pXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICAgKiBgYGBcbiAgICpcbiAgICogaXQgY2FuIGJlIHNlZW4gdGhhdCB0aGVyZSBhcmUgY2FsbHMgdG8gcmVndWxhciBkZWNvcmF0b3JzICh0aGUgYERpcmVjdGl2ZWApIGFuZCBjYWxscyBpbnRvXG4gICAqIGB0c2xpYmAgZnVuY3Rpb25zIHdoaWNoIGhhdmUgYmVlbiBpbnNlcnRlZCBieSBUeXBlU2NyaXB0LiBUaGVyZWZvcmUsIHRoaXMgZnVuY3Rpb24gY2xhc3NpZmllc1xuICAgKiBhIGNhbGwgdG8gY29ycmVzcG9uZCB3aXRoXG4gICAqICAgMS4gYSByZWFsIGRlY29yYXRvciBsaWtlIGBEaXJlY3RpdmVgIGFib3ZlLCBvclxuICAgKiAgIDIuIGEgZGVjb3JhdGVkIHBhcmFtZXRlciwgY29ycmVzcG9uZGluZyB3aXRoIGBfX3BhcmFtYCBjYWxscyBmcm9tIGB0c2xpYmAsIG9yXG4gICAqICAgMy4gdGhlIHR5cGUgaW5mb3JtYXRpb24gb2YgcGFyYW1ldGVycywgY29ycmVzcG9uZGluZyB3aXRoIGBfX21ldGFkYXRhYCBjYWxsIGZyb20gYHRzbGliYFxuICAgKlxuICAgKiBAcGFyYW0gZXhwcmVzc2lvbiB0aGUgZXhwcmVzc2lvbiB0aGF0IG5lZWRzIHRvIGJlIHJlZmxlY3RlZCBpbnRvIGEgYERlY29yYXRlSGVscGVyRW50cnlgXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCB0aGF0IGluZGljYXRlcyB3aGljaCBvZiB0aGUgdGhyZWUgY2F0ZWdvcmllcyB0aGUgY2FsbCByZXByZXNlbnRzLCB0b2dldGhlclxuICAgKiB3aXRoIHRoZSByZWZsZWN0ZWQgaW5mb3JtYXRpb24gb2YgdGhlIGNhbGwsIG9yIG51bGwgaWYgdGhlIGNhbGwgaXMgbm90IGEgdmFsaWQgZGVjb3JhdGUgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjb3JhdGVIZWxwZXJFbnRyeXxudWxsIHtcbiAgICAvLyBXZSBvbmx5IGNhcmUgYWJvdXQgdGhvc2UgZWxlbWVudHMgdGhhdCBhcmUgYWN0dWFsIGNhbGxzXG4gICAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY2FsbCA9IGV4cHJlc3Npb247XG5cbiAgICBjb25zdCBoZWxwZXJOYW1lID0gZ2V0Q2FsbGVlTmFtZShjYWxsKTtcbiAgICBpZiAoaGVscGVyTmFtZSA9PT0gJ19fbWV0YWRhdGEnKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgYHRzbGliLl9fbWV0YWRhdGFgIGNhbGwsIHJlZmxlY3QgdG8gYXJndW1lbnRzIGludG8gYSBgUGFyYW1ldGVyVHlwZXNgIG9iamVjdFxuICAgICAgLy8gaWYgdGhlIG1ldGFkYXRhIGtleSBpcyBcImRlc2lnbjpwYXJhbXR5cGVzXCIuXG4gICAgICBjb25zdCBrZXkgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKGtleSkgfHwga2V5LnRleHQgIT09ICdkZXNpZ246cGFyYW10eXBlcycpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHZhbHVlID0gY2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3BhcmFtcycsXG4gICAgICAgIHR5cGVzOiBBcnJheS5mcm9tKHZhbHVlLmVsZW1lbnRzKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGhlbHBlck5hbWUgPT09ICdfX3BhcmFtJykge1xuICAgICAgLy8gVGhpcyBpcyBhIGB0c2xpYi5fX3BhcmFtYCBjYWxsIHRoYXQgaXMgcmVmbGVjdGVkIGludG8gYSBgUGFyYW1ldGVyRGVjb3JhdG9yc2Agb2JqZWN0LlxuICAgICAgY29uc3QgaW5kZXhBcmcgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgIGNvbnN0IGluZGV4ID0gaW5kZXhBcmcgJiYgdHMuaXNOdW1lcmljTGl0ZXJhbChpbmRleEFyZykgPyBwYXJzZUludChpbmRleEFyZy50ZXh0LCAxMCkgOiBOYU47XG4gICAgICBpZiAoaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvcmF0b3JDYWxsID0gY2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAoZGVjb3JhdG9yQ2FsbCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckNhbGwpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvcmF0b3IgPSB0aGlzLnJlZmxlY3REZWNvcmF0b3JDYWxsKGRlY29yYXRvckNhbGwpO1xuICAgICAgaWYgKGRlY29yYXRvciA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3BhcmFtOmRlY29yYXRvcnMnLFxuICAgICAgICBpbmRleCxcbiAgICAgICAgZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgYXR0ZW1wdCB0byByZWZsZWN0IGl0IGFzIGEgcmVndWxhciBkZWNvcmF0b3IuXG4gICAgY29uc3QgZGVjb3JhdG9yID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChjYWxsKTtcbiAgICBpZiAoZGVjb3JhdG9yID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdkZWNvcmF0b3InLFxuICAgICAgZGVjb3JhdG9yLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRvckNhbGwoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pOiBEZWNvcmF0b3J8bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9yRXhwcmVzc2lvbiA9IGNhbGwuZXhwcmVzc2lvbjtcbiAgICBpZiAoIWlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JFeHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2UgZm91bmQgYSBkZWNvcmF0b3IhXG4gICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9XG4gICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByZXNzaW9uKSA/IGRlY29yYXRvckV4cHJlc3Npb24gOiBkZWNvcmF0b3JFeHByZXNzaW9uLm5hbWU7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgaWRlbnRpZmllcjogZGVjb3JhdG9yRXhwcmVzc2lvbixcbiAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjb3JhdG9ySWRlbnRpZmllciksXG4gICAgICBub2RlOiBjYWxsLFxuICAgICAgYXJnczogQXJyYXkuZnJvbShjYWxsLmFyZ3VtZW50cyksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB0aGUgZ2l2ZW4gc3RhdGVtZW50IHRvIHNlZSBpZiBpdCBpcyBhIGNhbGwgdG8gdGhlIHNwZWNpZmllZCBoZWxwZXIgZnVuY3Rpb24gb3IgbnVsbCBpZlxuICAgKiBub3QgZm91bmQuXG4gICAqXG4gICAqIE1hdGNoaW5nIHN0YXRlbWVudHMgd2lsbCBsb29rIGxpa2U6ICBgdHNsaWJfMS5fX2RlY29yYXRlKC4uLik7YC5cbiAgICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRoYXQgbWF5IGNvbnRhaW4gdGhlIGNhbGwuXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lIHRoZSBuYW1lIG9mIHRoZSBoZWxwZXIgd2UgYXJlIGxvb2tpbmcgZm9yLlxuICAgKiBAcmV0dXJucyB0aGUgbm9kZSB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSBgX19kZWNvcmF0ZSguLi4pYCBjYWxsIG9yIG51bGwgaWYgdGhlIHN0YXRlbWVudFxuICAgKiBkb2VzIG5vdCBtYXRjaC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsKHN0YXRlbWVudDogdHMuU3RhdGVtZW50LCBoZWxwZXJOYW1lOiBzdHJpbmcpOiB0cy5DYWxsRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIGxldCBleHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgICB3aGlsZSAoaXNBc3NpZ25tZW50KGV4cHJlc3Npb24pKSB7XG4gICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnJpZ2h0O1xuICAgICAgfVxuICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgZ2V0Q2FsbGVlTmFtZShleHByZXNzaW9uKSA9PT0gaGVscGVyTmFtZSkge1xuICAgICAgICByZXR1cm4gZXhwcmVzc2lvbjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgdGhlIGdpdmVuIGFycmF5IG5vZGUgYW5kIGV4dHJhY3QgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gZWFjaCBlbGVtZW50LlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgZm9yIGRlY29yYXRvcnMgdGhhdCBhcmUgZGVmaW5lZCBpbiBzdGF0aWMgcHJvcGVydGllcy4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNBcnJheSBhbiBleHByZXNzaW9uIHRoYXQgY29udGFpbnMgZGVjb3JhdG9yIGluZm9ybWF0aW9uLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBkZWNvcmF0b3IgaW5mbyB0aGF0IHdhcyByZWZsZWN0ZWQgZnJvbSB0aGUgYXJyYXkgbm9kZS5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXk6IHRzLkV4cHJlc3Npb24pOiBEZWNvcmF0b3JbXSB7XG4gICAgY29uc3QgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gPSBbXTtcblxuICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVjb3JhdG9yc0FycmF5KSkge1xuICAgICAgLy8gQWRkIGVhY2ggZGVjb3JhdG9yIHRoYXQgaXMgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWAgaW50byB0aGUgYGRlY29yYXRvcnNgIGFycmF5XG4gICAgICBkZWNvcmF0b3JzQXJyYXkuZWxlbWVudHMuZm9yRWFjaChub2RlID0+IHtcblxuICAgICAgICAvLyBJZiB0aGUgZGVjb3JhdG9yIGlzIG5vdCBhbiBvYmplY3QgbGl0ZXJhbCBleHByZXNzaW9uIHRoZW4gd2UgYXJlIG5vdCBpbnRlcmVzdGVkXG4gICAgICAgIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmhhcygndHlwZScpKSB7XG4gICAgICAgICAgICBsZXQgZGVjb3JhdG9yVHlwZSA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKSAhO1xuICAgICAgICAgICAgaWYgKGlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSkge1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JJZGVudGlmaWVyID1cbiAgICAgICAgICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSA/IGRlY29yYXRvclR5cGUgOiBkZWNvcmF0b3JUeXBlLm5hbWU7XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvclR5cGUsXG4gICAgICAgICAgICAgICAgaW1wb3J0OiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWNvcmF0b3JJZGVudGlmaWVyKSwgbm9kZSxcbiAgICAgICAgICAgICAgICBhcmdzOiBnZXREZWNvcmF0b3JBcmdzKG5vZGUpLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKlxuICAgKiBBIHNpbmdsZSBzeW1ib2wgbWF5IHJlcHJlc2VudCBtdWx0aXBsZSBjbGFzcyBtZW1iZXJzIGluIHRoZSBjYXNlIG9mIGFjY2Vzc29ycztcbiAgICogYW4gZXF1YWxseSBuYW1lZCBnZXR0ZXIvc2V0dGVyIGFjY2Vzc29yIHBhaXIgaXMgY29tYmluZWQgaW50byBhIHNpbmdsZSBzeW1ib2wuXG4gICAqIFdoZW4gdGhlIHN5bWJvbCBpcyByZWNvZ25pemVkIGFzIHJlcHJlc2VudGluZyBhbiBhY2Nlc3NvciwgaXRzIGRlY2xhcmF0aW9ucyBhcmVcbiAgICogYW5hbHl6ZWQgc3VjaCB0aGF0IGJvdGggdGhlIHNldHRlciBhbmQgZ2V0dGVyIGFjY2Vzc29yIGFyZSByZXR1cm5lZCBhcyBzZXBhcmF0ZVxuICAgKiBjbGFzcyBtZW1iZXJzLlxuICAgKlxuICAgKiBPbmUgZGlmZmVyZW5jZSB3cnQgdGhlIFR5cGVTY3JpcHQgaG9zdCBpcyB0aGF0IGluIEVTMjAxNSwgd2UgY2Fubm90IHNlZSB3aGljaFxuICAgKiBhY2Nlc3NvciBvcmlnaW5hbGx5IGhhZCBhbnkgZGVjb3JhdG9ycyBhcHBsaWVkIHRvIHRoZW0sIGFzIGRlY29yYXRvcnMgYXJlIGFwcGxpZWRcbiAgICogdG8gdGhlIHByb3BlcnR5IGRlc2NyaXB0b3IgaW4gZ2VuZXJhbCwgbm90IGEgc3BlY2lmaWMgYWNjZXNzb3IuIElmIGFuIGFjY2Vzc29yXG4gICAqIGhhcyBib3RoIGEgc2V0dGVyIGFuZCBnZXR0ZXIsIGFueSBkZWNvcmF0b3JzIGFyZSBvbmx5IGF0dGFjaGVkIHRvIHRoZSBzZXR0ZXIgbWVtYmVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVycyhzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJbXXxudWxsIHtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWNjZXNzb3IpIHtcbiAgICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICAgIGNvbnN0IHNldHRlciA9IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5maW5kKHRzLmlzU2V0QWNjZXNzb3IpO1xuICAgICAgY29uc3QgZ2V0dGVyID0gc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmZpbmQodHMuaXNHZXRBY2Nlc3Nvcik7XG5cbiAgICAgIGNvbnN0IHNldHRlck1lbWJlciA9XG4gICAgICAgICAgc2V0dGVyICYmIHRoaXMucmVmbGVjdE1lbWJlcihzZXR0ZXIsIENsYXNzTWVtYmVyS2luZC5TZXR0ZXIsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICAgIGlmIChzZXR0ZXJNZW1iZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKHNldHRlck1lbWJlcik7XG5cbiAgICAgICAgLy8gUHJldmVudCBhdHRhY2hpbmcgdGhlIGRlY29yYXRvcnMgdG8gYSBwb3RlbnRpYWwgZ2V0dGVyLiBJbiBFUzIwMTUsIHdlIGNhbid0IHRlbGwgd2hlcmVcbiAgICAgICAgLy8gdGhlIGRlY29yYXRvcnMgd2VyZSBvcmlnaW5hbGx5IGF0dGFjaGVkIHRvLCBob3dldmVyIHdlIG9ubHkgd2FudCB0byBhdHRhY2ggdGhlbSB0byBhXG4gICAgICAgIC8vIHNpbmdsZSBgQ2xhc3NNZW1iZXJgIGFzIG90aGVyd2lzZSBuZ3RzYyB3b3VsZCBoYW5kbGUgdGhlIHNhbWUgZGVjb3JhdG9ycyB0d2ljZS5cbiAgICAgICAgZGVjb3JhdG9ycyA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZ2V0dGVyTWVtYmVyID1cbiAgICAgICAgICBnZXR0ZXIgJiYgdGhpcy5yZWZsZWN0TWVtYmVyKGdldHRlciwgQ2xhc3NNZW1iZXJLaW5kLkdldHRlciwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgICAgaWYgKGdldHRlck1lbWJlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goZ2V0dGVyTWVtYmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1lbWJlcnM7XG4gICAgfVxuXG4gICAgbGV0IGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsID0gbnVsbDtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuTWV0aG9kKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZDtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLlByb3BlcnR5KSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGUgPSBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiB8fCBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICAvLyBJZiB0aGUgc3ltYm9sIGhhcyBiZWVuIGltcG9ydGVkIGZyb20gYSBUeXBlU2NyaXB0IHR5cGluZ3MgZmlsZSB0aGVuIHRoZSBjb21waWxlclxuICAgICAgLy8gbWF5IHBhc3MgdGhlIGBwcm90b3R5cGVgIHN5bWJvbCBhcyBhbiBleHBvcnQgb2YgdGhlIGNsYXNzLlxuICAgICAgLy8gQnV0IHRoaXMgaGFzIG5vIGRlY2xhcmF0aW9uLiBJbiB0aGlzIGNhc2Ugd2UganVzdCBxdWlldGx5IGlnbm9yZSBpdC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlciA9IHRoaXMucmVmbGVjdE1lbWJlcihub2RlLCBraW5kLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgaWYgKCFtZW1iZXIpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBbbWVtYmVyXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZGVjbGFyYXRpb24gbm9kZSBmb3IgdGhlIG1lbWJlciB0byByZWZsZWN0IG92ZXIuXG4gICAqIEBwYXJhbSBraW5kIHRoZSBhc3N1bWVkIGtpbmQgb2YgdGhlIG1lbWJlciwgbWF5IGJlY29tZSBtb3JlIGFjY3VyYXRlIGR1cmluZyByZWZsZWN0aW9uLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVyKFxuICAgICAgbm9kZTogdHMuRGVjbGFyYXRpb24sIGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sXG4gICAgICBpc1N0YXRpYz86IGJvb2xlYW4pOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQgdmFsdWU6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWU6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZU5vZGU6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoIWlzQ2xhc3NNZW1iZXJUeXBlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoaXNTdGF0aWMgJiYgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBraW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHkgPyBub2RlLnBhcmVudC5yaWdodCA6IG51bGw7XG4gICAgfSBlbHNlIGlmIChpc1RoaXNBc3NpZ25tZW50KG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgICAgbmFtZSA9IG5vZGUubGVmdC5uYW1lLnRleHQ7XG4gICAgICB2YWx1ZSA9IG5vZGUucmlnaHQ7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkNvbnN0cnVjdG9yO1xuICAgICAgbmFtZSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChraW5kID09PSBudWxsKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKGBVbmtub3duIG1lbWJlciB0eXBlOiBcIiR7bm9kZS5nZXRUZXh0KCl9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGlmIChpc05hbWVkRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgICBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHdlIGhhdmUgc3RpbGwgbm90IGRldGVybWluZWQgaWYgdGhpcyBpcyBhIHN0YXRpYyBvciBpbnN0YW5jZSBtZW1iZXIgdGhlblxuICAgIC8vIGxvb2sgZm9yIHRoZSBgc3RhdGljYCBrZXl3b3JkIG9uIHRoZSBkZWNsYXJhdGlvblxuICAgIGlmIChpc1N0YXRpYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpc1N0YXRpYyA9IG5vZGUubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICBub2RlLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlOiB0cy5UeXBlTm9kZSA9IChub2RlIGFzIGFueSkudHlwZSB8fCBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICBub2RlLFxuICAgICAgaW1wbGVtZW50YXRpb246IG5vZGUsIGtpbmQsIHR5cGUsIG5hbWUsIG5hbWVOb2RlLCB2YWx1ZSwgaXNTdGF0aWMsXG4gICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVycyB3ZSB3YW50IHRvIGZpbmQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbmAgb2JqZWN0cyByZXByZXNlbnRpbmcgZWFjaCBvZiB0aGUgcGFyYW1ldGVycyBpblxuICAgKiB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvciBvciBudWxsIGlmIHRoZXJlIGlzIG5vIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOlxuICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXXxudWxsIHtcbiAgICBjb25zdCBtZW1iZXJzID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24ubWVtYmVycztcbiAgICBpZiAobWVtYmVycyAmJiBtZW1iZXJzLmhhcyhDT05TVFJVQ1RPUikpIHtcbiAgICAgIGNvbnN0IGNvbnN0cnVjdG9yU3ltYm9sID0gbWVtYmVycy5nZXQoQ09OU1RSVUNUT1IpICE7XG4gICAgICAvLyBGb3Igc29tZSByZWFzb24gdGhlIGNvbnN0cnVjdG9yIGRvZXMgbm90IGhhdmUgYSBgdmFsdWVEZWNsYXJhdGlvbmAgPyE/XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9ucyAmJlxuICAgICAgICAgIGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9uc1swXSBhcyB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFjb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG4gICAgICBpZiAoY29uc3RydWN0b3IucGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgICAgfVxuICAgICAgaWYgKGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBjb25zdHJ1Y3Rvci5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIHBhcmFtZXRlck5vZGVzIHRoZSBhcnJheSBvZiBUeXBlU2NyaXB0IHBhcmFtZXRlciBub2RlcyBmb3IgdGhpcyBjbGFzcydzIGNvbnN0cnVjdG9yLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgaW5mbyBvYmplY3RzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKFxuICAgICAgY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXM6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW10pOiBDdG9yUGFyYW1ldGVyW10ge1xuICAgIGNvbnN0IHtjb25zdHJ1Y3RvclBhcmFtSW5mb30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKGNsYXNzU3ltYm9sKTtcblxuICAgIHJldHVybiBwYXJhbWV0ZXJOb2Rlcy5tYXAoKG5vZGUsIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCB7ZGVjb3JhdG9ycywgdHlwZUV4cHJlc3Npb259ID0gY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdID9cbiAgICAgICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF0gOlxuICAgICAgICAgIHtkZWNvcmF0b3JzOiBudWxsLCB0eXBlRXhwcmVzc2lvbjogbnVsbH07XG4gICAgICBjb25zdCBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IGdldE5hbWVUZXh0KG5hbWVOb2RlKSxcbiAgICAgICAgbmFtZU5vZGUsXG4gICAgICAgIHR5cGVWYWx1ZVJlZmVyZW5jZTogdHlwZUV4cHJlc3Npb24gIT09IG51bGwgP1xuICAgICAgICAgICAge2xvY2FsOiB0cnVlIGFzIHRydWUsIGV4cHJlc3Npb246IHR5cGVFeHByZXNzaW9uLCBkZWZhdWx0SW1wb3J0U3RhdGVtZW50OiBudWxsfSA6XG4gICAgICAgICAgICBudWxsLFxuICAgICAgICB0eXBlTm9kZTogbnVsbCwgZGVjb3JhdG9yc1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyxcbiAgICogd2hlcmUgdGhlIGluZm9ybWF0aW9uIGlzIHN0b3JlZCBvbiBhIHN0YXRpYyBwcm9wZXJ0eSBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpbiBFU00yMDE1LCB0aGUgcHJvcGVydHkgaXMgZGVmaW5lZCBhbiBhcnJheSwgb3IgYnkgYW4gYXJyb3cgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGFuXG4gICAqIGFycmF5LCBvZiBkZWNvcmF0b3IgYW5kIHR5cGUgaW5mb3JtYXRpb24uXG4gICAqXG4gICAqIEZvciBleGFtcGxlLFxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAgICogICB7dHlwZTogVmlld0NvbnRhaW5lclJlZn0sXG4gICAqICAge3R5cGU6IFRlbXBsYXRlUmVmfSxcbiAgICogICB7dHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTl19XX0sXG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBvclxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IFtcbiAgICogICB7dHlwZTogVmlld0NvbnRhaW5lclJlZn0sXG4gICAqICAge3R5cGU6IFRlbXBsYXRlUmVmfSxcbiAgICogICB7dHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbe3R5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOXX1dfSxcbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSB0aGUgcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyB0aGUgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgZWFjaCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOiBQYXJhbUluZm9bXXxudWxsIHtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnMgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHBhcmFtRGVjb3JhdG9ycykge1xuICAgICAgLy8gVGhlIGRlY29yYXRvcnMgYXJyYXkgbWF5IGJlIHdyYXBwZWQgaW4gYW4gYXJyb3cgZnVuY3Rpb24uIElmIHNvIHVud3JhcCBpdC5cbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9XG4gICAgICAgICAgdHMuaXNBcnJvd0Z1bmN0aW9uKHBhcmFtRGVjb3JhdG9ycykgPyBwYXJhbURlY29yYXRvcnMuYm9keSA6IHBhcmFtRGVjb3JhdG9ycztcbiAgICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oY29udGFpbmVyKSkge1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IGNvbnRhaW5lci5lbGVtZW50cztcbiAgICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbClcbiAgICAgICAgICAgIC5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgdHlwZUV4cHJlc3Npb24gPVxuICAgICAgICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ3R5cGUnKSA/IHBhcmFtSW5mby5nZXQoJ3R5cGUnKSAhIDogbnVsbDtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ySW5mbyA9XG4gICAgICAgICAgICAgICAgICBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmhhcygnZGVjb3JhdG9ycycpID8gcGFyYW1JbmZvLmdldCgnZGVjb3JhdG9ycycpICEgOiBudWxsO1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9ySW5mbyAmJlxuICAgICAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKVxuICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAocGFyYW1EZWNvcmF0b3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICdJbnZhbGlkIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBkZWNvcmF0b3IgaW4gJyArXG4gICAgICAgICAgICAgICAgcGFyYW1EZWNvcmF0b3JzLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSArICc6XFxuJyxcbiAgICAgICAgICAgIHBhcmFtRGVjb3JhdG9ycy5nZXRUZXh0KCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggc3RhdGVtZW50cyByZWxhdGVkIHRvIHRoZSBnaXZlbiBjbGFzcyBmb3IgY2FsbHMgdG8gdGhlIHNwZWNpZmllZCBoZWxwZXIuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZSB0aGUgbmFtZSBvZiB0aGUgaGVscGVyIChlLmcuIGBfX2RlY29yYXRlYCkgd2hvc2UgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWRcbiAgICogaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIENhbGxFeHByZXNzaW9uIG5vZGVzIGZvciBlYWNoIG1hdGNoaW5nIGhlbHBlciBjYWxsLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgaGVscGVyTmFtZTogc3RyaW5nKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9uW10ge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbClcbiAgICAgICAgLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5nZXRIZWxwZXJDYWxsKHN0YXRlbWVudCwgaGVscGVyTmFtZSkpXG4gICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNMjAxNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGluIHRoZSB0b3AgbGV2ZWwgbW9kdWxlLCBzbyB3ZSBoYXZlIHRvIGNvbnNpZGVyXG4gICAqIGFsbCB0aGUgc3RhdGVtZW50cyBpbiB0aGUgbW9kdWxlLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi52YWx1ZURlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5zdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZXN0IHdoZXRoZXIgYSBkZWNvcmF0b3Igd2FzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgLlxuICAgKlxuICAgKiBJcyB0aGUgZGVjb3JhdG9yOlxuICAgKiAqIGV4dGVybmFsbHkgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWA/XG4gICAqICogdGhlIGN1cnJlbnQgaG9zdGVkIHByb2dyYW0gaXMgYWN0dWFsbHkgYEBhbmd1bGFyL2NvcmVgIGFuZFxuICAgKiAgIC0gcmVsYXRpdmVseSBpbnRlcm5hbGx5IGltcG9ydGVkOyBvclxuICAgKiAgIC0gbm90IGltcG9ydGVkLCBmcm9tIHRoZSBjdXJyZW50IGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3IgdGhlIGRlY29yYXRvciB0byB0ZXN0LlxuICAgKi9cbiAgcHJvdGVjdGVkIGlzRnJvbUNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5pc0NvcmUpIHtcbiAgICAgIHJldHVybiAhZGVjb3JhdG9yLmltcG9ydCB8fCAvXlxcLi8udGVzdChkZWNvcmF0b3IuaW1wb3J0LmZyb20pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gISFkZWNvcmF0b3IuaW1wb3J0ICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGFsbCB0aGUgY2xhc3MgZGVjbGFyYXRpb25zIGZyb20gdGhlIGR0c1R5cGluZ3MgcHJvZ3JhbSwgc3RvcmluZyB0aGVtIGluIGEgbWFwXG4gICAqIHdoZXJlIHRoZSBrZXkgaXMgdGhlIGRlY2xhcmVkIG5hbWUgb2YgdGhlIGNsYXNzIGFuZCB0aGUgdmFsdWUgaXMgdGhlIGRlY2xhcmF0aW9uIGl0c2VsZi5cbiAgICpcbiAgICogSXQgaXMgcG9zc2libGUgZm9yIHRoZXJlIHRvIGJlIG11bHRpcGxlIGNsYXNzIGRlY2xhcmF0aW9ucyB3aXRoIHRoZSBzYW1lIGxvY2FsIG5hbWUuXG4gICAqIE9ubHkgdGhlIGZpcnN0IGRlY2xhcmF0aW9uIHdpdGggYSBnaXZlbiBuYW1lIGlzIGFkZGVkIHRvIHRoZSBtYXA7IHN1YnNlcXVlbnQgY2xhc3NlcyB3aWxsIGJlXG4gICAqIGlnbm9yZWQuXG4gICAqXG4gICAqIFdlIGFyZSBtb3N0IGludGVyZXN0ZWQgaW4gY2xhc3NlcyB0aGF0IGFyZSBwdWJsaWNseSBleHBvcnRlZCBmcm9tIHRoZSBlbnRyeSBwb2ludCwgc28gdGhlc2VcbiAgICogYXJlIGFkZGVkIHRvIHRoZSBtYXAgZmlyc3QsIHRvIGVuc3VyZSB0aGF0IHRoZXkgYXJlIG5vdCBpZ25vcmVkLlxuICAgKlxuICAgKiBAcGFyYW0gZHRzUm9vdEZpbGVOYW1lIFRoZSBmaWxlbmFtZSBvZiB0aGUgZW50cnktcG9pbnQgdG8gdGhlIGBkdHNUeXBpbmdzYCBwcm9ncmFtLlxuICAgKiBAcGFyYW0gZHRzUHJvZ3JhbSBUaGUgcHJvZ3JhbSBjb250YWluaW5nIGFsbCB0aGUgdHlwaW5ncyBmaWxlcy5cbiAgICogQHJldHVybnMgYSBtYXAgb2YgY2xhc3MgbmFtZXMgdG8gY2xhc3MgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEdHNEZWNsYXJhdGlvbk1hcChcbiAgICAgIGR0c1Jvb3RGaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgsIGR0c1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICBkdHNQYWNrYWdlOiBBYnNvbHV0ZUZzUGF0aCk6IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPiB7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb25NYXAgPSBuZXcgTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+KCk7XG4gICAgY29uc3QgY2hlY2tlciA9IGR0c1Byb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICAgIC8vIEZpcnN0IGFkZCBhbGwgdGhlIGNsYXNzZXMgdGhhdCBhcmUgcHVibGljbHkgZXhwb3J0ZWQgZnJvbSB0aGUgZW50cnktcG9pbnRcbiAgICBjb25zdCByb290RmlsZSA9IGR0c1Byb2dyYW0uZ2V0U291cmNlRmlsZShkdHNSb290RmlsZU5hbWUpO1xuICAgIGlmICghcm9vdEZpbGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGdpdmVuIGZpbGUgJHtkdHNSb290RmlsZU5hbWV9IGlzIG5vdCBwYXJ0IG9mIHRoZSB0eXBpbmdzIHByb2dyYW0uYCk7XG4gICAgfVxuICAgIGNvbGxlY3RFeHBvcnRlZERlY2xhcmF0aW9ucyhjaGVja2VyLCBkdHNEZWNsYXJhdGlvbk1hcCwgcm9vdEZpbGUpO1xuXG4gICAgLy8gTm93IGFkZCBhbnkgYWRkaXRpb25hbCBjbGFzc2VzIHRoYXQgYXJlIGV4cG9ydGVkIGZyb20gaW5kaXZpZHVhbCAgZHRzIGZpbGVzLFxuICAgIC8vIGJ1dCBhcmUgbm90IHB1YmxpY2x5IGV4cG9ydGVkIGZyb20gdGhlIGVudHJ5LXBvaW50LlxuICAgIGR0c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNvdXJjZUZpbGUgPT4ge1xuICAgICAgaWYgKCFpc1dpdGhpblBhY2thZ2UoZHRzUGFja2FnZSwgc291cmNlRmlsZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29sbGVjdEV4cG9ydGVkRGVjbGFyYXRpb25zKGNoZWNrZXIsIGR0c0RlY2xhcmF0aW9uTWFwLCBzb3VyY2VGaWxlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZHRzRGVjbGFyYXRpb25NYXA7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgYSBmdW5jdGlvbi9tZXRob2Qgbm9kZSAob3IgaXRzIGltcGxlbWVudGF0aW9uKSwgdG8gc2VlIGlmIGl0IHJldHVybnMgYVxuICAgKiBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agb2JqZWN0LlxuICAgKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24uXG4gICAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHRvIGNoZWNrIC0gdGhpcyBjb3VsZCBiZSBhIGZ1bmN0aW9uLCBhIG1ldGhvZCBvciBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKiBAcGFyYW0gaW1wbGVtZW50YXRpb24gdGhlIGFjdHVhbCBmdW5jdGlvbiBleHByZXNzaW9uIGlmIGBub2RlYCBpcyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKiBAcGFyYW0gY29udGFpbmVyIHRoZSBjbGFzcyB0aGF0IGNvbnRhaW5zIHRoZSBmdW5jdGlvbiwgaWYgaXQgaXMgYSBtZXRob2QuXG4gICAqIEByZXR1cm5zIGluZm8gYWJvdXQgdGhlIGZ1bmN0aW9uIGlmIGl0IGRvZXMgcmV0dXJuIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIG9iamVjdDsgYG51bGxgXG4gICAqIG90aGVyd2lzZS5cbiAgICovXG4gIHByb3RlY3RlZCBwYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoXG4gICAgICBuYW1lOiBzdHJpbmcsIG5vZGU6IHRzLk5vZGV8bnVsbCwgaW1wbGVtZW50YXRpb246IHRzLk5vZGV8bnVsbCA9IG5vZGUsXG4gICAgICBjb250YWluZXI6IHRzLkRlY2xhcmF0aW9ufG51bGwgPSBudWxsKTogTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9ufG51bGwge1xuICAgIGlmIChpbXBsZW1lbnRhdGlvbiA9PT0gbnVsbCB8fFxuICAgICAgICAoIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihpbXBsZW1lbnRhdGlvbikgJiYgIXRzLmlzTWV0aG9kRGVjbGFyYXRpb24oaW1wbGVtZW50YXRpb24pICYmXG4gICAgICAgICAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oaW1wbGVtZW50YXRpb24pKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gaW1wbGVtZW50YXRpb247XG4gICAgY29uc3QgZGVmaW5pdGlvbiA9IHRoaXMuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChkZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgYm9keSA9IGRlZmluaXRpb24uYm9keTtcbiAgICBjb25zdCBsYXN0U3RhdGVtZW50ID0gYm9keSAmJiBib2R5W2JvZHkubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgcmV0dXJuRXhwcmVzc2lvbiA9XG4gICAgICAgIGxhc3RTdGF0ZW1lbnQgJiYgdHMuaXNSZXR1cm5TdGF0ZW1lbnQobGFzdFN0YXRlbWVudCkgJiYgbGFzdFN0YXRlbWVudC5leHByZXNzaW9uIHx8IG51bGw7XG4gICAgY29uc3QgbmdNb2R1bGVQcm9wZXJ0eSA9IHJldHVybkV4cHJlc3Npb24gJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihyZXR1cm5FeHByZXNzaW9uKSAmJlxuICAgICAgICAgICAgcmV0dXJuRXhwcmVzc2lvbi5wcm9wZXJ0aWVzLmZpbmQoXG4gICAgICAgICAgICAgICAgcHJvcCA9PlxuICAgICAgICAgICAgICAgICAgICAhIXByb3AubmFtZSAmJiB0cy5pc0lkZW50aWZpZXIocHJvcC5uYW1lKSAmJiBwcm9wLm5hbWUudGV4dCA9PT0gJ25nTW9kdWxlJykgfHxcbiAgICAgICAgbnVsbDtcblxuICAgIGlmICghbmdNb2R1bGVQcm9wZXJ0eSB8fCAhdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQobmdNb2R1bGVQcm9wZXJ0eSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFRoZSBuZ01vZHVsZVZhbHVlIGNvdWxkIGJlIG9mIHRoZSBmb3JtIGBTb21lTW9kdWxlYCBvciBgbmFtZXNwYWNlXzEuU29tZU1vZHVsZWBcbiAgICBjb25zdCBuZ01vZHVsZVZhbHVlID0gbmdNb2R1bGVQcm9wZXJ0eS5pbml0aWFsaXplcjtcbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihuZ01vZHVsZVZhbHVlKSAmJiAhdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obmdNb2R1bGVWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5nTW9kdWxlRGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKG5nTW9kdWxlVmFsdWUpO1xuICAgIGlmICghbmdNb2R1bGVEZWNsYXJhdGlvbiB8fCBuZ01vZHVsZURlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQ2Fubm90IGZpbmQgYSBkZWNsYXJhdGlvbiBmb3IgTmdNb2R1bGUgJHtuZ01vZHVsZVZhbHVlLmdldFRleHQoKX0gcmVmZXJlbmNlZCBpbiBcIiR7ZGVjbGFyYXRpb24hLmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICBpZiAoIWhhc05hbWVJZGVudGlmaWVyKG5nTW9kdWxlRGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIG5nTW9kdWxlOiBuZ01vZHVsZURlY2xhcmF0aW9uIGFzIENvbmNyZXRlRGVjbGFyYXRpb248Q2xhc3NEZWNsYXJhdGlvbj4sIGRlY2xhcmF0aW9uLCBjb250YWluZXJcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihleHByZXNzaW9uKTtcbiAgICB9XG5cbiAgICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGV4cHJlc3Npb24pIHx8ICF0cy5pc0lkZW50aWZpZXIoZXhwcmVzc2lvbi5leHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZXNwYWNlRGVjbCA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZXhwcmVzc2lvbi5leHByZXNzaW9uKTtcbiAgICBpZiAoIW5hbWVzcGFjZURlY2wgfHwgbmFtZXNwYWNlRGVjbC5ub2RlID09PSBudWxsIHx8ICF0cy5pc1NvdXJjZUZpbGUobmFtZXNwYWNlRGVjbC5ub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZXNwYWNlRXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKG5hbWVzcGFjZURlY2wubm9kZSk7XG4gICAgaWYgKG5hbWVzcGFjZUV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghbmFtZXNwYWNlRXhwb3J0cy5oYXMoZXhwcmVzc2lvbi5uYW1lLnRleHQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnREZWNsID0gbmFtZXNwYWNlRXhwb3J0cy5nZXQoZXhwcmVzc2lvbi5uYW1lLnRleHQpICE7XG4gICAgcmV0dXJuIHsuLi5leHBvcnREZWNsLCB2aWFNb2R1bGU6IG5hbWVzcGFjZURlY2wudmlhTW9kdWxlfTtcbiAgfVxufVxuXG4vLy8vLy8vLy8vLy8vIEV4cG9ydGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG5leHBvcnQgdHlwZSBQYXJhbUluZm8gPSB7XG4gIGRlY29yYXRvcnM6IERlY29yYXRvcltdIHwgbnVsbCxcbiAgdHlwZUV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24gfCBudWxsXG59O1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjYWxsIHRvIGB0c2xpYi5fX21ldGFkYXRhYCBhcyBwcmVzZW50IGluIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy4gVGhpcyBpcyBhXG4gKiBzeW50aGV0aWMgZGVjb3JhdG9yIGluc2VydGVkIGJ5IFR5cGVTY3JpcHQgdGhhdCBjb250YWlucyByZWZsZWN0aW9uIGluZm9ybWF0aW9uIGFib3V0IHRoZVxuICogdGFyZ2V0IG9mIHRoZSBkZWNvcmF0b3IsIGkuZS4gdGhlIGNsYXNzIG9yIHByb3BlcnR5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlclR5cGVzIHtcbiAgdHlwZTogJ3BhcmFtcyc7XG4gIHR5cGVzOiB0cy5FeHByZXNzaW9uW107XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNhbGwgdG8gYHRzbGliLl9fcGFyYW1gIGFzIHByZXNlbnQgaW4gYHRzbGliLl9fZGVjb3JhdGVgIGNhbGxzLiBUaGlzIGNvbnRhaW5zXG4gKiBpbmZvcm1hdGlvbiBvbiBhbnkgZGVjb3JhdG9ycyB3ZXJlIGFwcGxpZWQgdG8gYSBjZXJ0YWluIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXJEZWNvcmF0b3JzIHtcbiAgdHlwZTogJ3BhcmFtOmRlY29yYXRvcnMnO1xuICBpbmRleDogbnVtYmVyO1xuICBkZWNvcmF0b3I6IERlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2FsbCB0byBhIGRlY29yYXRvciBhcyBpdCB3YXMgcHJlc2VudCBpbiB0aGUgb3JpZ2luYWwgc291cmNlIGNvZGUsIGFzIHByZXNlbnQgaW5cbiAqIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZWNvcmF0b3JDYWxsIHtcbiAgdHlwZTogJ2RlY29yYXRvcic7XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGRpZmZlcmVudCBraW5kcyBvZiBkZWNvcmF0ZSBoZWxwZXJzIHRoYXQgbWF5IGJlIHByZXNlbnQgYXMgZmlyc3QgYXJndW1lbnQgdG9cbiAqIGB0c2xpYi5fX2RlY29yYXRlYCwgYXMgZm9sbG93czpcbiAqXG4gKiBgYGBcbiAqIF9fZGVjb3JhdGUoW1xuICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gKiAgIHRzbGliXzEuX19wYXJhbSgyLCBJbmplY3QoSU5KRUNURURfVE9LRU4pKSxcbiAqICAgdHNsaWJfMS5fX21ldGFkYXRhKFwiZGVzaWduOnBhcmFtdHlwZXNcIiwgW1ZpZXdDb250YWluZXJSZWYsIFRlbXBsYXRlUmVmLCBTdHJpbmddKVxuICogXSwgU29tZURpcmVjdGl2ZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgRGVjb3JhdGVIZWxwZXJFbnRyeSA9IFBhcmFtZXRlclR5cGVzIHwgUGFyYW1ldGVyRGVjb3JhdG9ycyB8IERlY29yYXRvckNhbGw7XG5cbi8qKlxuICogVGhlIHJlY29yZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiBvZiBhIHNpbmdsZSBjbGFzcy4gVGhpcyBpbmZvcm1hdGlvbiBpcyBjYWNoZWQgaW4gdGhlIGhvc3QuXG4gKi9cbmludGVyZmFjZSBEZWNvcmF0b3JJbmZvIHtcbiAgLyoqXG4gICAqIEFsbCBkZWNvcmF0b3JzIHRoYXQgd2VyZSBwcmVzZW50IG9uIHRoZSBjbGFzcy4gSWYgbm8gZGVjb3JhdG9ycyB3ZXJlIHByZXNlbnQsIHRoaXMgaXMgYG51bGxgXG4gICAqL1xuICBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGw7XG5cbiAgLyoqXG4gICAqIEFsbCBkZWNvcmF0b3JzIHBlciBtZW1iZXIgb2YgdGhlIGNsYXNzIHRoZXkgd2VyZSBwcmVzZW50IG9uLlxuICAgKi9cbiAgbWVtYmVyRGVjb3JhdG9yczogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+O1xuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRzIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgaW5mb3JtYXRpb24sIHN1Y2ggYXMgdGhlIHR5cGUgb2YgYSBwYXJhbWV0ZXIgYW5kIGFsbFxuICAgKiBkZWNvcmF0b3JzIGZvciBhIGNlcnRhaW4gcGFyYW1ldGVyLiBJbmRpY2VzIGluIHRoaXMgYXJyYXkgY29ycmVzcG9uZCB3aXRoIHRoZSBwYXJhbWV0ZXIncyBpbmRleFxuICAgKiBpbiB0aGUgY29uc3RydWN0b3IuIE5vdGUgdGhhdCB0aGlzIGFycmF5IG1heSBiZSBzcGFyc2UsIGkuZS4gY2VydGFpbiBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG1heVxuICAgKiBub3QgaGF2ZSBhbnkgaW5mbyByZWNvcmRlZC5cbiAgICovXG4gIGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXTtcbn1cblxuLyoqXG4gKiBBIHN0YXRlbWVudCBub2RlIHRoYXQgcmVwcmVzZW50cyBhbiBhc3NpZ25tZW50LlxuICovXG5leHBvcnQgdHlwZSBBc3NpZ25tZW50U3RhdGVtZW50ID1cbiAgICB0cy5FeHByZXNzaW9uU3RhdGVtZW50ICYge2V4cHJlc3Npb246IHtsZWZ0OiB0cy5JZGVudGlmaWVyLCByaWdodDogdHMuRXhwcmVzc2lvbn19O1xuXG4vKipcbiAqIFRlc3Qgd2hldGhlciBhIHN0YXRlbWVudCBub2RlIGlzIGFuIGFzc2lnbm1lbnQgc3RhdGVtZW50LlxuICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRvIHRlc3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBzdGF0ZW1lbnQgaXMgQXNzaWdubWVudFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiBpc0Fzc2lnbm1lbnQoc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Fzc2lnbm1lbnQobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuQXNzaWdubWVudEV4cHJlc3Npb248dHMuRXF1YWxzVG9rZW4+IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiBub2RlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbjtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBwcm92aWRlZCBjYWxsIGV4cHJlc3Npb24gdGFyZ2V0cyBhIGNsYXNzLCBieSB2ZXJpZnlpbmcgaXRzIGFyZ3VtZW50cyBhcmVcbiAqIGFjY29yZGluZyB0byB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBfX2RlY29yYXRlKFtdLCBTb21lRGlyZWN0aXZlKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBjYWxsIHRoZSBjYWxsIGV4cHJlc3Npb24gdGhhdCBpcyB0ZXN0ZWQgdG8gcmVwcmVzZW50IGEgY2xhc3MgZGVjb3JhdG9yIGNhbGwuXG4gKiBAcGFyYW0gY2xhc3NOYW1lIHRoZSBuYW1lIG9mIHRoZSBjbGFzcyB0aGF0IHRoZSBjYWxsIG5lZWRzIHRvIGNvcnJlc3BvbmQgd2l0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ2xhc3NEZWNvcmF0ZUNhbGwoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24sIGNsYXNzTmFtZTogc3RyaW5nKTpcbiAgICBjYWxsIGlzIHRzLkNhbGxFeHByZXNzaW9uJnthcmd1bWVudHM6IFt0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uLCB0cy5FeHByZXNzaW9uXX0ge1xuICBjb25zdCBoZWxwZXJBcmdzID0gY2FsbC5hcmd1bWVudHNbMF07XG4gIGlmIChoZWxwZXJBcmdzID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihoZWxwZXJBcmdzKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHRhcmdldCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICByZXR1cm4gdGFyZ2V0ICE9PSB1bmRlZmluZWQgJiYgdHMuaXNJZGVudGlmaWVyKHRhcmdldCkgJiYgdGFyZ2V0LnRleHQgPT09IGNsYXNzTmFtZTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBwcm92aWRlZCBjYWxsIGV4cHJlc3Npb24gdGFyZ2V0cyBhIG1lbWJlciBvZiB0aGUgY2xhc3MsIGJ5IHZlcmlmeWluZyBpdHNcbiAqIGFyZ3VtZW50cyBhcmUgYWNjb3JkaW5nIHRvIHRoZSBmb2xsb3dpbmcgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIF9fZGVjb3JhdGUoW10sIFNvbWVEaXJlY3RpdmUucHJvdG90eXBlLCBcIm1lbWJlclwiLCB2b2lkIDApO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGNhbGwgdGhlIGNhbGwgZXhwcmVzc2lvbiB0aGF0IGlzIHRlc3RlZCB0byByZXByZXNlbnQgYSBtZW1iZXIgZGVjb3JhdG9yIGNhbGwuXG4gKiBAcGFyYW0gY2xhc3NOYW1lIHRoZSBuYW1lIG9mIHRoZSBjbGFzcyB0aGF0IHRoZSBjYWxsIG5lZWRzIHRvIGNvcnJlc3BvbmQgd2l0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTWVtYmVyRGVjb3JhdGVDYWxsKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uLCBjbGFzc05hbWU6IHN0cmluZyk6XG4gICAgY2FsbCBpcyB0cy5DYWxsRXhwcmVzc2lvbiZcbiAgICB7YXJndW1lbnRzOiBbdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgdHMuU3RyaW5nTGl0ZXJhbCwgdHMuU3RyaW5nTGl0ZXJhbF19IHtcbiAgY29uc3QgaGVscGVyQXJncyA9IGNhbGwuYXJndW1lbnRzWzBdO1xuICBpZiAoaGVscGVyQXJncyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oaGVscGVyQXJncykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCB0YXJnZXQgPSBjYWxsLmFyZ3VtZW50c1sxXTtcbiAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbih0YXJnZXQpIHx8XG4gICAgICAhdHMuaXNJZGVudGlmaWVyKHRhcmdldC5leHByZXNzaW9uKSB8fCB0YXJnZXQuZXhwcmVzc2lvbi50ZXh0ICE9PSBjbGFzc05hbWUgfHxcbiAgICAgIHRhcmdldC5uYW1lLnRleHQgIT09ICdwcm90b3R5cGUnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgbWVtYmVyTmFtZSA9IGNhbGwuYXJndW1lbnRzWzJdO1xuICByZXR1cm4gbWVtYmVyTmFtZSAhPT0gdW5kZWZpbmVkICYmIHRzLmlzU3RyaW5nTGl0ZXJhbChtZW1iZXJOYW1lKTtcbn1cblxuLyoqXG4gKiBIZWxwZXIgbWV0aG9kIHRvIGV4dHJhY3QgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgZ2l2ZW4gdGhlIHByb3BlcnR5J3MgXCJzeW1ib2xcIixcbiAqIHdoaWNoIGlzIGFjdHVhbGx5IHRoZSBzeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIHByb3BlcnR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocHJvcFN5bWJvbDogdHMuU3ltYm9sKTogdHMuRXhwcmVzc2lvbnx1bmRlZmluZWQge1xuICBjb25zdCBwcm9wSWRlbnRpZmllciA9IHByb3BTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgY29uc3QgcGFyZW50ID0gcHJvcElkZW50aWZpZXIgJiYgcHJvcElkZW50aWZpZXIucGFyZW50O1xuICByZXR1cm4gcGFyZW50ICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihwYXJlbnQpID8gcGFyZW50LnJpZ2h0IDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEEgY2FsbGVlIGNvdWxkIGJlIG9uZSBvZjogYF9fZGVjb3JhdGUoLi4uKWAgb3IgYHRzbGliXzEuX19kZWNvcmF0ZWAuXG4gKi9cbmZ1bmN0aW9uIGdldENhbGxlZU5hbWUoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pOiBzdHJpbmd8bnVsbCB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIoY2FsbC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBzdHJpcERvbGxhclN1ZmZpeChjYWxsLmV4cHJlc3Npb24udGV4dCk7XG4gIH1cbiAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gc3RyaXBEb2xsYXJTdWZmaXgoY2FsbC5leHByZXNzaW9uLm5hbWUudGV4dCk7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vLy8vLy8vLy8vLy8gSW50ZXJuYWwgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbi8qKlxuICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuICpcbiAqIGBgYFxuICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICogYGBgXG4gKlxuICogSGVyZSwgdGhlIGludGVybWVkaWF0ZSBgTXlDbGFzc18xYCBhc3NpZ25tZW50IGlzIG9wdGlvbmFsLiBJbiB0aGUgYWJvdmUgZXhhbXBsZSwgdGhlXG4gKiBgY2xhc3MgTXlDbGFzcyB7fWAgZXhwcmVzc2lvbiBpcyByZXR1cm5lZCBhcyBkZWNsYXJhdGlvbiBvZiBgdmFyIE15Q2xhc3NgLiBJZiB0aGUgdmFyaWFibGVcbiAqIGlzIG5vdCBpbml0aWFsaXplZCB1c2luZyBhIGNsYXNzIGV4cHJlc3Npb24sIG51bGwgaXMgcmV0dXJuZWQuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIG5vZGUgdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyB3aG9zZSBkZWNsYXJhdGlvbiB3ZSBhcmUgZmluZGluZy5cbiAqIEByZXR1cm5zIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3Mgb3IgYG51bGxgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIi5cbiAqL1xuZnVuY3Rpb24gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOiBDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRXhwcmVzc2lvbj58bnVsbCB7XG4gIGlmICghdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpIHx8IG5vZGUuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gUmVjb2duaXplIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvcm0gYHZhciBNeUNsYXNzID0gY2xhc3MgTXlDbGFzcyB7fWAgb3JcbiAgLy8gYHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtgXG4gIGxldCBleHByZXNzaW9uID0gbm9kZS5pbml0aWFsaXplcjtcbiAgd2hpbGUgKGlzQXNzaWdubWVudChleHByZXNzaW9uKSkge1xuICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnJpZ2h0O1xuICB9XG5cbiAgaWYgKCF0cy5pc0NsYXNzRXhwcmVzc2lvbihleHByZXNzaW9uKSB8fCAhaGFzTmFtZUlkZW50aWZpZXIoZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBleHByZXNzaW9uO1xufVxuXG5mdW5jdGlvbiBnZXREZWNvcmF0b3JBcmdzKG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbltdIHtcbiAgLy8gVGhlIGFyZ3VtZW50cyBvZiBhIGRlY29yYXRvciBhcmUgaGVsZCBpbiB0aGUgYGFyZ3NgIHByb3BlcnR5IG9mIGl0cyBkZWNsYXJhdGlvbiBvYmplY3QuXG4gIGNvbnN0IGFyZ3NQcm9wZXJ0eSA9IG5vZGUucHJvcGVydGllcy5maWx0ZXIodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuZmluZChwcm9wZXJ0eSA9PiBnZXROYW1lVGV4dChwcm9wZXJ0eS5uYW1lKSA9PT0gJ2FyZ3MnKTtcbiAgY29uc3QgYXJnc0V4cHJlc3Npb24gPSBhcmdzUHJvcGVydHkgJiYgYXJnc1Byb3BlcnR5LmluaXRpYWxpemVyO1xuICByZXR1cm4gYXJnc0V4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGFyZ3NFeHByZXNzaW9uKSA/XG4gICAgICBBcnJheS5mcm9tKGFyZ3NFeHByZXNzaW9uLmVsZW1lbnRzKSA6XG4gICAgICBbXTtcbn1cblxuZnVuY3Rpb24gaXNQcm9wZXJ0eUFjY2Vzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24mXG4gICAge3BhcmVudDogdHMuQmluYXJ5RXhwcmVzc2lvbn0ge1xuICByZXR1cm4gISFub2RlLnBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZS5wYXJlbnQpICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpc1RoaXNBc3NpZ25tZW50KG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5CaW5hcnlFeHByZXNzaW9uJlxuICAgIHtsZWZ0OiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpICYmXG4gICAgICBub2RlLmxlZnQuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkO1xufVxuXG5mdW5jdGlvbiBpc05hbWVkRGVjbGFyYXRpb24obm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLk5hbWVkRGVjbGFyYXRpb24mXG4gICAge25hbWU6IHRzLklkZW50aWZpZXJ9IHtcbiAgY29uc3QgYW55Tm9kZTogYW55ID0gbm9kZTtcbiAgcmV0dXJuICEhYW55Tm9kZS5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihhbnlOb2RlLm5hbWUpO1xufVxuXG5cbmZ1bmN0aW9uIGlzQ2xhc3NNZW1iZXJUeXBlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5DbGFzc0VsZW1lbnR8XG4gICAgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gKHRzLmlzQ2xhc3NFbGVtZW50KG5vZGUpIHx8IGlzUHJvcGVydHlBY2Nlc3Mobm9kZSkgfHwgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpKSAmJlxuICAgICAgLy8gQWRkaXRpb25hbGx5LCBlbnN1cmUgYG5vZGVgIGlzIG5vdCBhbiBpbmRleCBzaWduYXR1cmUsIGZvciBleGFtcGxlIG9uIGFuIGFic3RyYWN0IGNsYXNzOlxuICAgICAgLy8gYGFic3RyYWN0IGNsYXNzIEZvbyB7IFtrZXk6IHN0cmluZ106IGFueTsgfWBcbiAgICAgICF0cy5pc0luZGV4U2lnbmF0dXJlRGVjbGFyYXRpb24obm9kZSk7XG59XG5cbi8qKlxuICogQ29sbGVjdCBtYXBwaW5ncyBiZXR3ZWVuIGV4cG9ydGVkIGRlY2xhcmF0aW9ucyBpbiBhIHNvdXJjZSBmaWxlIGFuZCBpdHMgYXNzb2NpYXRlZFxuICogZGVjbGFyYXRpb24gaW4gdGhlIHR5cGluZ3MgcHJvZ3JhbS5cbiAqL1xuZnVuY3Rpb24gY29sbGVjdEV4cG9ydGVkRGVjbGFyYXRpb25zKFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+LFxuICAgIHNyY0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgY29uc3Qgc3JjTW9kdWxlID0gc3JjRmlsZSAmJiBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oc3JjRmlsZSk7XG4gIGNvbnN0IG1vZHVsZUV4cG9ydHMgPSBzcmNNb2R1bGUgJiYgY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUoc3JjTW9kdWxlKTtcbiAgaWYgKG1vZHVsZUV4cG9ydHMpIHtcbiAgICBtb2R1bGVFeHBvcnRzLmZvckVhY2goZXhwb3J0ZWRTeW1ib2wgPT4ge1xuICAgICAgaWYgKGV4cG9ydGVkU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgICAgZXhwb3J0ZWRTeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2woZXhwb3J0ZWRTeW1ib2wpO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSBleHBvcnRlZFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkU3ltYm9sLm5hbWU7XG4gICAgICBpZiAoZGVjbGFyYXRpb24gJiYgIWR0c0RlY2xhcmF0aW9uTWFwLmhhcyhuYW1lKSkge1xuICAgICAgICBkdHNEZWNsYXJhdGlvbk1hcC5zZXQobmFtZSwgZGVjbGFyYXRpb24pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQXR0ZW1wdCB0byByZXNvbHZlIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB0aGF0IHRoZSBnaXZlbiBkZWNsYXJhdGlvbiBpcyBhc3NpZ25lZCB0by5cbiAqIEZvciBleGFtcGxlLCBmb3IgdGhlIGZvbGxvd2luZyBjb2RlOlxuICpcbiAqIGBgYFxuICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICogYGBgXG4gKlxuICogYW5kIHRoZSBwcm92aWRlZCBkZWNsYXJhdGlvbiBiZWluZyBgY2xhc3MgTXlDbGFzcyB7fWAsIHRoaXMgd2lsbCByZXR1cm4gdGhlIGB2YXIgTXlDbGFzc2BcbiAqIGRlY2xhcmF0aW9uLlxuICpcbiAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gZm9yIHdoaWNoIGFueSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzaG91bGQgYmUgb2J0YWluZWQuXG4gKiBAcmV0dXJucyB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24gaWYgZm91bmQsIHVuZGVmaW5lZCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGdldFZhcmlhYmxlRGVjbGFyYXRpb25PZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLlZhcmlhYmxlRGVjbGFyYXRpb258XG4gICAgdW5kZWZpbmVkIHtcbiAgbGV0IG5vZGUgPSBkZWNsYXJhdGlvbi5wYXJlbnQ7XG5cbiAgLy8gRGV0ZWN0IGFuIGludGVybWVkaWFyeSB2YXJpYWJsZSBhc3NpZ25tZW50IGFuZCBza2lwIG92ZXIgaXQuXG4gIGlmIChpc0Fzc2lnbm1lbnQobm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUubGVmdCkpIHtcbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpID8gbm9kZSA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBBIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG1heSBoYXZlIGJlZW4gXCJzeW50aGVzaXplZFwiIGJ5IFR5cGVTY3JpcHQgZHVyaW5nIEphdmFTY3JpcHQgZW1pdCxcbiAqIGluIHRoZSBjYXNlIG5vIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGUuZy4gcHJvcGVydHkgaW5pdGlhbGl6ZXJzIGFyZSB1c2VkLlxuICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAqIGNvbXBpbGVyIGdlbmVyYXRlcyBhIHN5bnRoZXRpYyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gKiBvcmlnaW5hbGx5IGhhdmUgYSBjb25zdHJ1Y3RvciBpbiB0aGUgVHlwZVNjcmlwdCBzb3VyY2UuIFdoZW4gYSBjbGFzcyBoYXMgYSBzdXBlcmNsYXNzLFxuICogYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciBtdXN0IG5vdCBiZSBjb25zaWRlcmVkIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXRcbiAqIHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5IG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiB0aGF0IGRvZXMgbm90IGluamVjdCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0XG4gKiBzeW50aGVzaXplZCBzdXBlciBjYWxsIGluIHRoZSBjb25zdHJ1Y3RvciBib2R5LCBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHRcbiAqIGVtaXRzIGR1cmluZyBKYXZhU2NyaXB0IGVtaXQ6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi92My4yLjIvc3JjL2NvbXBpbGVyL3RyYW5zZm9ybWVycy90cy50cyNMMTA2OC1MMTA4MlxuICpcbiAqIEBwYXJhbSBjb25zdHJ1Y3RvciBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIHRlc3RcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGNvbnN0cnVjdG9yIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcjogdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGNvbnN0cnVjdG9yLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgaWYgKCFmaXJzdFN0YXRlbWVudCB8fCAhdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkU3VwZXJDYWxsKGZpcnN0U3RhdGVtZW50LmV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWQgYnkgVHlwZVNjcmlwdCwgaS5lLiB3aGV0aGVyXG4gKiBpdCBpcyBvZiB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBzdXBlciguLi5hcmd1bWVudHMpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBpcyB0byBiZSB0ZXN0ZWRcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5leHByZXNzaW9uLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuU3VwZXJLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICByZXR1cm4gdHMuaXNTcHJlYWRFbGVtZW50KGFyZ3VtZW50KSAmJiB0cy5pc0lkZW50aWZpZXIoYXJndW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIGFyZ3VtZW50LmV4cHJlc3Npb24udGV4dCA9PT0gJ2FyZ3VtZW50cyc7XG59XG4iXX0=