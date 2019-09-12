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
        /** Gets all decorators of the given class symbol. */
        Esm2015ReflectionHost.prototype.getDecoratorsOfSymbol = function (symbol) {
            var classDecorators = this.acquireDecoratorInfo(symbol).classDecorators;
            return classDecorators;
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
            // First attempt extracting decorators from static properties.
            var decoratorInfo = this.computeDecoratorInfoFromStaticProperties(classSymbol);
            if (decoratorInfo === null) {
                // If none were present, use the `__decorate` helper calls instead.
                decoratorInfo = this.computeDecoratorInfoFromHelperCalls(classSymbol);
            }
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
            // If none of the static properties were present, no decorator info could be computed.
            if (classDecorators === null && memberDecorators === null && constructorParamInfo === null) {
                return null;
            }
            return {
                classDecorators: classDecorators,
                memberDecorators: memberDecorators || new Map(),
                constructorParamInfo: constructorParamInfo || [],
            };
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
            return tslib_1.__assign({}, exportDecl, { viaModule: namespaceDecl.viaModule });
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
        return ts.isClassElement(node) || isPropertyAccess(node) || ts.isBinaryExpression(node);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUdqQyx5RUFBZ087SUFDaE8scUVBQWlEO0lBR2pELDhEQUErRjtJQUUvRiwyRUFBeUw7SUFFNUssUUFBQSxVQUFVLEdBQUcsWUFBMkIsQ0FBQztJQUN6QyxRQUFBLGVBQWUsR0FBRyxnQkFBK0IsQ0FBQztJQUNsRCxRQUFBLFdBQVcsR0FBRyxlQUE4QixDQUFDO0lBQzdDLFFBQUEsa0JBQWtCLEdBQUcsZ0JBQStCLENBQUM7SUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BMEJHO0lBQ0g7UUFBMkMsaURBQXdCO1FBaUNqRSwrQkFDYyxNQUFjLEVBQVksTUFBZSxFQUFFLE9BQXVCLEVBQzVFLEdBQXdCO1lBRjVCLFlBR0Usa0JBQU0sT0FBTyxDQUFDLFNBR2Y7WUFMYSxZQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVksWUFBTSxHQUFOLE1BQU0sQ0FBUztZQS9CdkQ7O2VBRUc7WUFDTyw2QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUU3RDs7Ozs7Ozs7Ozs7Ozs7ZUFjRztZQUNPLDhCQUF3QixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1lBRTlFOzs7OztlQUtHO1lBQ08sb0JBQWMsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQU1wRSxLQUFJLENBQUMsaUJBQWlCO2dCQUNsQixHQUFHLElBQUksS0FBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDOztRQUN2RixDQUFDO1FBRUQ7Ozs7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QUFJLEtBQUssV0FBVyxDQUFDO0lBQy9DLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBDb25jcmV0ZURlY2xhcmF0aW9uLCBDdG9yUGFyYW1ldGVyLCBEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QsIGlzRGVjb3JhdG9ySWRlbnRpZmllciwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7aXNXaXRoaW5QYWNrYWdlfSBmcm9tICcuLi9hbmFseXNpcy91dGlsJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0J1bmRsZVByb2dyYW19IGZyb20gJy4uL3BhY2thZ2VzL2J1bmRsZV9wcm9ncmFtJztcbmltcG9ydCB7ZmluZEFsbCwgZ2V0TmFtZVRleHQsIGhhc05hbWVJZGVudGlmaWVyLCBpc0RlZmluZWQsIHN0cmlwRG9sbGFyU3VmZml4fSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7Q2xhc3NTeW1ib2wsIE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbiwgTmdjY0NsYXNzU3ltYm9sLCBOZ2NjUmVmbGVjdGlvbkhvc3QsIFBSRV9SM19NQVJLRVIsIFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9ufSBmcm9tICcuL25nY2NfaG9zdCc7XG5cbmV4cG9ydCBjb25zdCBERUNPUkFUT1JTID0gJ2RlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IFBST1BfREVDT1JBVE9SUyA9ICdwcm9wRGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1IgPSAnX19jb25zdHJ1Y3RvcicgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1JfUEFSQU1TID0gJ2N0b3JQYXJhbWV0ZXJzJyBhcyB0cy5fX1N0cmluZztcblxuLyoqXG4gKiBFc20yMDE1IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCAyMDE1IGNsYXNzZXMsIGV0Yy5cbiAqIERlY29yYXRvcnMgYXJlIGRlZmluZWQgdmlhIHN0YXRpYyBwcm9wZXJ0aWVzIG9uIHRoZSBjbGFzcy4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBjbGFzcyBTb21lRGlyZWN0aXZlIHtcbiAqIH1cbiAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gKiBdO1xuICogU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9ycyA9IHtcbiAqICAgXCJpbnB1dDFcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogICBcImlucHV0MlwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiB9O1xuICogYGBgXG4gKlxuICogKiBDbGFzc2VzIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICBwcm90ZWN0ZWQgZHRzRGVjbGFyYXRpb25NYXA6IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPnxudWxsO1xuXG4gIC8qKlxuICAgKiBUaGUgc2V0IG9mIHNvdXJjZSBmaWxlcyB0aGF0IGhhdmUgYWxyZWFkeSBiZWVuIHByZXByb2Nlc3NlZC5cbiAgICovXG4gIHByb3RlY3RlZCBwcmVwcm9jZXNzZWRTb3VyY2VGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcblxuICAvKipcbiAgICogSW4gRVMyMDE1LCBjbGFzcyBkZWNsYXJhdGlvbnMgbWF5IGhhdmUgYmVlbiBkb3duLWxldmVsZWQgaW50byB2YXJpYWJsZSBkZWNsYXJhdGlvbnMsXG4gICAqIGluaXRpYWxpemVkIHVzaW5nIGEgY2xhc3MgZXhwcmVzc2lvbi4gSW4gY2VydGFpbiBzY2VuYXJpb3MsIGFuIGFkZGl0aW9uYWwgdmFyaWFibGVcbiAgICogaXMgaW50cm9kdWNlZCB0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzIHNvIHRoYXQgcmVzdWx0cyBpbiBjb2RlIHN1Y2ggYXM6XG4gICAqXG4gICAqIGBgYFxuICAgKiBsZXQgTXlDbGFzc18xOyBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1hcCB0cmFja3MgdGhvc2UgYWxpYXNlZCB2YXJpYWJsZXMgdG8gdGhlaXIgb3JpZ2luYWwgaWRlbnRpZmllciwgaS5lLiB0aGUga2V5XG4gICAqIGNvcnJlc3BvbmRzIHdpdGggdGhlIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzXzFgIGFuZCBpdHMgdmFsdWUgYmVjb21lcyB0aGUgYE15Q2xhc3NgIGlkZW50aWZpZXJcbiAgICogb2YgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBUaGlzIG1hcCBpcyBwb3B1bGF0ZWQgZHVyaW5nIHRoZSBwcmVwcm9jZXNzaW5nIG9mIGVhY2ggc291cmNlIGZpbGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogQ2FjaGVzIHRoZSBpbmZvcm1hdGlvbiBvZiB0aGUgZGVjb3JhdG9ycyBvbiBhIGNsYXNzLCBhcyB0aGUgd29yayBpbnZvbHZlZCB3aXRoIGV4dHJhY3RpbmdcbiAgICogZGVjb3JhdG9ycyBpcyBjb21wbGV4IGFuZCBmcmVxdWVudGx5IHVzZWQuXG4gICAqXG4gICAqIFRoaXMgbWFwIGlzIGxhemlseSBwb3B1bGF0ZWQgZHVyaW5nIHRoZSBmaXJzdCBjYWxsIHRvIGBhY3F1aXJlRGVjb3JhdG9ySW5mb2AgZm9yIGEgZ2l2ZW4gY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZGVjb3JhdG9yQ2FjaGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvckluZm8+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgbG9nZ2VyOiBMb2dnZXIsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgZHRzPzogQnVuZGxlUHJvZ3JhbXxudWxsKSB7XG4gICAgc3VwZXIoY2hlY2tlcik7XG4gICAgdGhpcy5kdHNEZWNsYXJhdGlvbk1hcCA9XG4gICAgICAgIGR0cyAmJiB0aGlzLmNvbXB1dGVEdHNEZWNsYXJhdGlvbk1hcChkdHMucGF0aCwgZHRzLnByb2dyYW0sIGR0cy5wYWNrYWdlKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIENsYXNzZXMgc2hvdWxkIGhhdmUgYSBgbmFtZWAgaWRlbnRpZmllciwgYmVjYXVzZSB0aGV5IG1heSBuZWVkIHRvIGJlIHJlZmVyZW5jZWQgaW4gb3RoZXIgcGFydHNcbiAgICogb2YgdGhlIHByb2dyYW0uXG4gICAqXG4gICAqIEluIEVTMjAxNSwgYSBjbGFzcyBtYXkgYmUgZGVjbGFyZWQgdXNpbmcgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIEhlcmUsIHRoZSBpbnRlcm1lZGlhdGUgYE15Q2xhc3NfMWAgYXNzaWdubWVudCBpcyBvcHRpb25hbC4gSW4gdGhlIGFib3ZlIGV4YW1wbGUsIHRoZVxuICAgKiBgY2xhc3MgTXlDbGFzcyB7fWAgbm9kZSBpcyByZXR1cm5lZCBhcyBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc2AuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgZGVjbGFyYXRpb24gbm9kZSB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIiBvciBoYXMgbm8gc3ltYm9sLlxuICAgKi9cbiAgZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sRnJvbU91dGVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHN5bWJvbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRDbGFzc1N5bWJvbEZyb21Jbm5lckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIHVzaW5nIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBleHRyYWN0cyB0aGUgYE5nY2NDbGFzc1N5bWJvbGAgZm9yIGBNeUNsYXNzYCB3aGVuIHByb3ZpZGVkIHdpdGggdGhlIGB2YXIgTXlDbGFzc2BcbiAgICogZGVjbGFyYXRpb24gbm9kZS4gV2hlbiB0aGUgYGNsYXNzIE15Q2xhc3Mge31gIG5vZGUgb3IgYW55IG90aGVyIG5vZGUgaXMgZ2l2ZW4sIHRoaXMgbWV0aG9kIHdpbGxcbiAgICogcmV0dXJuIHVuZGVmaW5lZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgZG9lcyBub3QgcmVwcmVzZW50IGFuIG91dGVyIGRlY2xhcmF0aW9uXG4gICAqIG9mIGEgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NTeW1ib2xGcm9tT3V0ZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIC8vIENyZWF0ZSBhIHN5bWJvbCB3aXRob3V0IGlubmVyIGRlY2xhcmF0aW9uIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyBhIHJlZ3VsYXIgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChkZWNsYXJhdGlvbiwgbnVsbCk7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCB0aGUgZGVjbGFyYXRpb24gbWF5IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sIGluIHdoaWNoIGNhc2UgaXQgbXVzdCBiZVxuICAgIC8vIGluaXRpYWxpemVkIHVzaW5nIGEgY2xhc3MgZXhwcmVzc2lvbiBhcyBpbm5lciBkZWNsYXJhdGlvbi5cbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSAmJiBoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgICAgaWYgKGlubmVyRGVjbGFyYXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2woZGVjbGFyYXRpb24sIGlubmVyRGVjbGFyYXRpb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBtZXRob2QgZXh0cmFjdHMgdGhlIGBOZ2NjQ2xhc3NTeW1ib2xgIGZvciBgTXlDbGFzc2Agd2hlbiBwcm92aWRlZCB3aXRoIHRoZVxuICAgKiBgY2xhc3MgTXlDbGFzcyB7fWAgZGVjbGFyYXRpb24gbm9kZS4gV2hlbiB0aGUgYHZhciBNeUNsYXNzYCBub2RlIG9yIGFueSBvdGhlciBub2RlIGlzIGdpdmVuLFxuICAgKiB0aGlzIG1ldGhvZCB3aWxsIHJldHVybiB1bmRlZmluZWQgaW5zdGVhZC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGRvZXMgbm90IHJlcHJlc2VudCBhbiBpbm5lciBkZWNsYXJhdGlvblxuICAgKiBvZiBhIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NFeHByZXNzaW9uKGRlY2xhcmF0aW9uKSB8fCAhaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IG91dGVyRGVjbGFyYXRpb24gPSBnZXRWYXJpYWJsZURlY2xhcmF0aW9uT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKG91dGVyRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCAhaGFzTmFtZUlkZW50aWZpZXIob3V0ZXJEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2wob3V0ZXJEZWNsYXJhdGlvbiwgZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gYE5nY2NDbGFzc1N5bWJvbGAgZnJvbSBhbiBvdXRlciBhbmQgaW5uZXIgZGVjbGFyYXRpb24uIElmIGEgY2xhc3Mgb25seSBoYXMgYW4gb3V0ZXJcbiAgICogZGVjbGFyYXRpb24sIHRoZSBcImltcGxlbWVudGF0aW9uXCIgc3ltYm9sIG9mIHRoZSBjcmVhdGVkIGBOZ2NjQ2xhc3NTeW1ib2xgIHdpbGwgYmUgc2V0IGVxdWFsIHRvXG4gICAqIHRoZSBcImRlY2xhcmF0aW9uXCIgc3ltYm9sLlxuICAgKlxuICAgKiBAcGFyYW0gb3V0ZXJEZWNsYXJhdGlvbiBUaGUgb3V0ZXIgZGVjbGFyYXRpb24gbm9kZSBvZiB0aGUgY2xhc3MuXG4gICAqIEBwYXJhbSBpbm5lckRlY2xhcmF0aW9uIFRoZSBpbm5lciBkZWNsYXJhdGlvbiBub2RlIG9mIHRoZSBjbGFzcywgb3IgdW5kZWZpbmVkIGlmIG5vIGlubmVyXG4gICAqIGRlY2xhcmF0aW9uIGlzIHByZXNlbnQuXG4gICAqIEByZXR1cm5zIHRoZSBgTmdjY0NsYXNzU3ltYm9sYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzLCBvciB1bmRlZmluZWQgaWYgYSBgdHMuU3ltYm9sYCBmb3IgYW55IG9mXG4gICAqIHRoZSBkZWNsYXJhdGlvbnMgY291bGQgbm90IGJlIHJlc29sdmVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNyZWF0ZUNsYXNzU3ltYm9sKFxuICAgICAgb3V0ZXJEZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbiwgaW5uZXJEZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbnxudWxsKTogTmdjY0NsYXNzU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvblN5bWJvbCA9XG4gICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG91dGVyRGVjbGFyYXRpb24ubmFtZSkgYXMgQ2xhc3NTeW1ib2wgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGRlY2xhcmF0aW9uU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wbGVtZW50YXRpb25TeW1ib2wgPSBpbm5lckRlY2xhcmF0aW9uICE9PSBudWxsID9cbiAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaW5uZXJEZWNsYXJhdGlvbi5uYW1lKSA6XG4gICAgICAgIGRlY2xhcmF0aW9uU3ltYm9sO1xuICAgIGlmIChpbXBsZW1lbnRhdGlvblN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBkZWNsYXJhdGlvblN5bWJvbC5uYW1lLFxuICAgICAgZGVjbGFyYXRpb246IGRlY2xhcmF0aW9uU3ltYm9sLFxuICAgICAgaW1wbGVtZW50YXRpb246IGltcGxlbWVudGF0aW9uU3ltYm9sLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIChmb3IgZXhhbXBsZSwgb2YgYSBjbGFzcyBvciBmdW5jdGlvbikgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBhbnlcbiAgICogZGVjb3JhdG9ycyBwcmVzZW50IG9uIHRoZSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIGEgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gIG5vZGUgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvciBmdW5jdGlvbiBvdmVyXG4gICAqIHdoaWNoIHRvIHJlZmxlY3QuIEZvciBleGFtcGxlLCBpZiB0aGUgaW50ZW50IGlzIHRvIHJlZmxlY3QgdGhlIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBhbmQgdGhlXG4gICAqIHNvdXJjZSBpcyBpbiBFUzYgZm9ybWF0LCB0aGlzIHdpbGwgYmUgYSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgbm9kZS4gSWYgdGhlIHNvdXJjZSBpcyBpbiBFUzVcbiAgICogZm9ybWF0LCB0aGlzIG1pZ2h0IGJlIGEgYHRzLlZhcmlhYmxlRGVjbGFyYXRpb25gIGFzIGNsYXNzZXMgaW4gRVM1IGFyZSByZXByZXNlbnRlZCBhcyB0aGVcbiAgICogcmVzdWx0IG9mIGFuIElJRkUgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgRGVjb3JhdG9yYCBtZXRhZGF0YSBpZiBkZWNvcmF0b3JzIGFyZSBwcmVzZW50IG9uIHRoZSBkZWNsYXJhdGlvbiwgb3JcbiAgICogYG51bGxgIGlmIGVpdGhlciBubyBkZWNvcmF0b3JzIHdlcmUgcHJlc2VudCBvciBpZiB0aGUgZGVjbGFyYXRpb24gaXMgbm90IG9mIGEgZGVjb3JhdGFibGUgdHlwZS5cbiAgICovXG4gIGdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pO1xuICAgIGlmICghc3ltYm9sKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0ZWQgdG8gZ2V0IG1lbWJlcnMgb2YgYSBub24tY2xhc3M6IFwiJHtjbGF6ei5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRNZW1iZXJzT2ZTeW1ib2woY2xhc3NTeW1ib2wpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGl0cyBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBvbmx5IGxvb2tzIGF0IHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGRpcmVjdGx5IGFuZCBub3QgYXQgYW55IGluaGVyaXRlZFxuICAgKiBjb25zdHJ1Y3RvcnMuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYFBhcmFtZXRlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjb25zdHJ1Y3RvciwgaWZcbiAgICogYSBjb25zdHJ1Y3RvciBleGlzdHMuIElmIHRoZSBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGhhcyAwIHBhcmFtZXRlcnMsIHRoaXMgYXJyYXkgd2lsbCBiZSBlbXB0eS5cbiAgICogSWYgdGhlIGNsYXNzIGhhcyBubyBjb25zdHJ1Y3RvciwgdGhpcyBtZXRob2QgcmV0dXJucyBgbnVsbGAuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byBnZXQgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICBjb25zdCBwYXJhbWV0ZXJOb2RlcyA9IHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2wpO1xuICAgIGlmIChwYXJhbWV0ZXJOb2Rlcykge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oY2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBoYXNCYXNlQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBjb25zdCBzdXBlckhhc0Jhc2VDbGFzcyA9IHN1cGVyLmhhc0Jhc2VDbGFzcyhjbGF6eik7XG4gICAgaWYgKHN1cGVySGFzQmFzZUNsYXNzKSB7XG4gICAgICByZXR1cm4gc3VwZXJIYXNCYXNlQ2xhc3M7XG4gICAgfVxuXG4gICAgY29uc3QgaW5uZXJDbGFzc0RlY2xhcmF0aW9uID0gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoaW5uZXJDbGFzc0RlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1cGVyLmhhc0Jhc2VDbGFzcyhpbm5lckNsYXNzRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gRmlyc3QgdHJ5IGdldHRpbmcgdGhlIGJhc2UgY2xhc3MgZnJvbSB0aGUgXCJvdXRlclwiIGRlY2xhcmF0aW9uXG4gICAgY29uc3Qgc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyID0gc3VwZXIuZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGF6eik7XG4gICAgaWYgKHN1cGVyQmFzZUNsYXNzSWRlbnRpZmllcikge1xuICAgICAgcmV0dXJuIHN1cGVyQmFzZUNsYXNzSWRlbnRpZmllcjtcbiAgICB9XG4gICAgLy8gVGhhdCBkaWRuJ3Qgd29yayBzbyBub3cgdHJ5IGdldHRpbmcgaXQgZnJvbSB0aGUgXCJpbm5lclwiIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGlubmVyQ2xhc3NEZWNsYXJhdGlvbiA9IGdldElubmVyQ2xhc3NEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKGlubmVyQ2xhc3NEZWNsYXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGlubmVyQ2xhc3NEZWNsYXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gbm9kZSBhY3R1YWxseSByZXByZXNlbnRzIGEgY2xhc3MuXG4gICAqL1xuICBpc0NsYXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIENsYXNzRGVjbGFyYXRpb24ge1xuICAgIHJldHVybiBzdXBlci5pc0NsYXNzKG5vZGUpIHx8IHRoaXMuZ2V0Q2xhc3NTeW1ib2wobm9kZSkgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFjZSBhbiBpZGVudGlmaWVyIHRvIGl0cyBkZWNsYXJhdGlvbiwgaWYgcG9zc2libGUuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGF0dGVtcHRzIHRvIHJlc29sdmUgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBnaXZlbiBpZGVudGlmaWVyLCB0cmFjaW5nIGJhY2sgdGhyb3VnaFxuICAgKiBpbXBvcnRzIGFuZCByZS1leHBvcnRzIHVudGlsIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQgaXMgZm91bmQuIEEgYERlY2xhcmF0aW9uYFxuICAgKiBvYmplY3QgaXMgcmV0dXJuZWQgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGAgaXMgcmV0dXJuZWQgb3RoZXJ3aXNlLlxuICAgKlxuICAgKiBJbiBFUzIwMTUsIHdlIG5lZWQgdG8gYWNjb3VudCBmb3IgaWRlbnRpZmllcnMgdGhhdCByZWZlciB0byBhbGlhc2VkIGNsYXNzIGRlY2xhcmF0aW9ucyBzdWNoIGFzXG4gICAqIGBNeUNsYXNzXzFgLiBTaW5jZSBzdWNoIGRlY2xhcmF0aW9ucyBhcmUgb25seSBhdmFpbGFibGUgd2l0aGluIHRoZSBtb2R1bGUgaXRzZWxmLCB3ZSBuZWVkIHRvXG4gICAqIGZpbmQgdGhlIG9yaWdpbmFsIGNsYXNzIGRlY2xhcmF0aW9uLCBlLmcuIGBNeUNsYXNzYCwgdGhhdCBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGFsaWFzZWQgb25lLlxuICAgKlxuICAgKiBAcGFyYW0gaWQgYSBUeXBlU2NyaXB0IGB0cy5JZGVudGlmaWVyYCB0byB0cmFjZSBiYWNrIHRvIGEgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIG1ldGFkYXRhIGFib3V0IHRoZSBgRGVjbGFyYXRpb25gIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgXG4gICAqIG90aGVyd2lzZS5cbiAgICovXG4gIGdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc3VwZXJEZWNsYXJhdGlvbiA9IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkKTtcblxuICAgIC8vIFRoZSBpZGVudGlmaWVyIG1heSBoYXZlIGJlZW4gb2YgYW4gYWRkaXRpb25hbCBjbGFzcyBhc3NpZ25tZW50IHN1Y2ggYXMgYE15Q2xhc3NfMWAgdGhhdCB3YXNcbiAgICAvLyBwcmVzZW50IGFzIGFsaWFzIGZvciBgTXlDbGFzc2AuIElmIHNvLCByZXNvbHZlIHN1Y2ggYWxpYXNlcyB0byB0aGVpciBvcmlnaW5hbCBkZWNsYXJhdGlvbi5cbiAgICBpZiAoc3VwZXJEZWNsYXJhdGlvbiAhPT0gbnVsbCAmJiBzdXBlckRlY2xhcmF0aW9uLm5vZGUgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gdGhpcy5yZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihzdXBlckRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgaWYgKGFsaWFzZWRJZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGFsaWFzZWRJZGVudGlmaWVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcbiAgfVxuXG4gIC8qKiBHZXRzIGFsbCBkZWNvcmF0b3JzIG9mIHRoZSBnaXZlbiBjbGFzcyBzeW1ib2wuICovXG4gIGdldERlY29yYXRvcnNPZlN5bWJvbChzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IHtjbGFzc0RlY29yYXRvcnN9ID0gdGhpcy5hY3F1aXJlRGVjb3JhdG9ySW5mbyhzeW1ib2wpO1xuICAgIHJldHVybiBjbGFzc0RlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBtb2R1bGUgZm9yIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBpbiB3aGljaCB0aGUgaW5pdGlhbGl6ZXJcbiAgICogaXMgYW4gaWRlbnRpZmllciBtYXJrZWQgd2l0aCB0aGUgYFBSRV9SM19NQVJLRVJgLlxuICAgKiBAcGFyYW0gbW9kdWxlIHRoZSBtb2R1bGUgaW4gd2hpY2ggdG8gc2VhcmNoIGZvciBzd2l0Y2hhYmxlIGRlY2xhcmF0aW9ucy5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgdmFyaWFibGUgZGVjbGFyYXRpb25zIHRoYXQgbWF0Y2guXG4gICAqL1xuICBnZXRTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKG1vZHVsZTogdHMuTm9kZSk6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10ge1xuICAgIC8vIERvbid0IGJvdGhlciB0byB3YWxrIHRoZSBBU1QgaWYgdGhlIG1hcmtlciBpcyBub3QgZm91bmQgaW4gdGhlIHRleHRcbiAgICByZXR1cm4gbW9kdWxlLmdldFRleHQoKS5pbmRleE9mKFBSRV9SM19NQVJLRVIpID49IDAgP1xuICAgICAgICBmaW5kQWxsKG1vZHVsZSwgaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbikgOlxuICAgICAgICBbXTtcbiAgfVxuXG4gIGdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHZhbHVlID0gc3VwZXIuZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbik7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gV2UgaGF2ZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIGluaXRpYWxpemVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIHZhciBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gU28gbG9vayBmb3IgdGhlIHNwZWNpYWwgc2NlbmFyaW8gd2hlcmUgdGhlIHZhcmlhYmxlIGlzIGJlaW5nIGFzc2lnbmVkIGluXG4gICAgLy8gYSBuZWFyYnkgc3RhdGVtZW50IHRvIHRoZSByZXR1cm4gdmFsdWUgb2YgYSBjYWxsIHRvIGBfX2RlY29yYXRlYC5cbiAgICAvLyBUaGVuIGZpbmQgdGhlIDJuZCBhcmd1bWVudCBvZiB0aGF0IGNhbGwsIHRoZSBcInRhcmdldFwiLCB3aGljaCB3aWxsIGJlIHRoZVxuICAgIC8vIGFjdHVhbCBjbGFzcyBpZGVudGlmaWVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIEh0dHBDbGllbnRYc3JmTW9kdWxlID0gSHR0cENsaWVudFhzcmZNb2R1bGVfMSA9IHRzbGliXzEuX19kZWNvcmF0ZShbXG4gICAgLy8gICBOZ01vZHVsZSh7XG4gICAgLy8gICAgIHByb3ZpZGVyczogW10sXG4gICAgLy8gICB9KVxuICAgIC8vIF0sIEh0dHBDbGllbnRYc3JmTW9kdWxlKTtcbiAgICAvLyBgYGBcbiAgICAvL1xuICAgIC8vIEFuZCBmaW5hbGx5LCBmaW5kIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgaWRlbnRpZmllciBpbiB0aGF0IGFyZ3VtZW50LlxuICAgIC8vIE5vdGUgYWxzbyB0aGF0IHRoZSBhc3NpZ25tZW50IGNhbiBvY2N1ciB3aXRoaW4gYW5vdGhlciBhc3NpZ25tZW50LlxuICAgIC8vXG4gICAgY29uc3QgYmxvY2sgPSBkZWNsYXJhdGlvbi5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICBpZiAoc3ltYm9sICYmICh0cy5pc0Jsb2NrKGJsb2NrKSB8fCB0cy5pc1NvdXJjZUZpbGUoYmxvY2spKSkge1xuICAgICAgY29uc3QgZGVjb3JhdGVDYWxsID0gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShibG9jaywgc3ltYm9sKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGRlY29yYXRlQ2FsbCAmJiBkZWNvcmF0ZUNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHRhcmdldCAmJiB0cy5pc0lkZW50aWZpZXIodGFyZ2V0KSkge1xuICAgICAgICBjb25zdCB0YXJnZXRTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0YXJnZXQpO1xuICAgICAgICBjb25zdCB0YXJnZXREZWNsYXJhdGlvbiA9IHRhcmdldFN5bWJvbCAmJiB0YXJnZXRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKHRhcmdldERlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0YXJnZXREZWNsYXJhdGlvbikgfHxcbiAgICAgICAgICAgICAgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBqdXN0IGEgZnVuY3Rpb24gb3IgY2xhc3MgZGVjbGFyYXRpb25cbiAgICAgICAgICAgIC8vIHNvIHJldHVybiBpdHMgaWRlbnRpZmllciBhcyB0aGUgdmFyaWFibGUgdmFsdWUuXG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0RGVjbGFyYXRpb24ubmFtZSB8fCBudWxsO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLCBzbyBmaW5kIHRoZSBmYXIgcmlnaHQgZXhwcmVzc2lvbixcbiAgICAgICAgICAgIC8vIGluIHRoZSBjYXNlIG9mIG11bHRpcGxlIGFzc2lnbm1lbnRzIChlLmcuIGB2YXIxID0gdmFyMiA9IHZhbHVlYCkuXG4gICAgICAgICAgICBsZXQgdGFyZ2V0VmFsdWUgPSB0YXJnZXREZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICAgICAgICAgIHdoaWxlICh0YXJnZXRWYWx1ZSAmJiBpc0Fzc2lnbm1lbnQodGFyZ2V0VmFsdWUpKSB7XG4gICAgICAgICAgICAgIHRhcmdldFZhbHVlID0gdGFyZ2V0VmFsdWUucmlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFyZ2V0VmFsdWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGFsbCB0b3AtbGV2ZWwgY2xhc3Mgc3ltYm9scyBpbiB0aGUgZ2l2ZW4gZmlsZS5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgY2xhc3Nlcy5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgY2xhc3Mgc3ltYm9scy5cbiAgICovXG4gIGZpbmRDbGFzc1N5bWJvbHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE5nY2NDbGFzc1N5bWJvbFtdIHtcbiAgICBjb25zdCBjbGFzc2VzOiBOZ2NjQ2xhc3NTeW1ib2xbXSA9IFtdO1xuICAgIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKS5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NTeW1ib2wpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChzdGF0ZW1lbnQpO1xuICAgICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NTeW1ib2wpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGNsYXNzZXM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBudW1iZXIgb2YgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgb2YgYSBnaXZlbiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycyBvZiB0aGUgY2xhc3MsIGlmIGtub3duLCBvciBgbnVsbGAgaWYgdGhlIGRlY2xhcmF0aW9uXG4gICAqIGlzIG5vdCBhIGNsYXNzIG9yIGhhcyBhbiB1bmtub3duIG51bWJlciBvZiB0eXBlIHBhcmFtZXRlcnMuXG4gICAqL1xuICBnZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogbnVtYmVyfG51bGwge1xuICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5nZXREdHNEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKGR0c0RlY2xhcmF0aW9uICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkdHNEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiBkdHNEZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycyA/IGR0c0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzLmxlbmd0aCA6IDA7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRha2UgYW4gZXhwb3J0ZWQgZGVjbGFyYXRpb24gb2YgYSBjbGFzcyAobWF5YmUgZG93bi1sZXZlbGVkIHRvIGEgdmFyaWFibGUpIGFuZCBsb29rIHVwIHRoZVxuICAgKiBkZWNsYXJhdGlvbiBvZiBpdHMgdHlwZSBpbiBhIHNlcGFyYXRlIC5kLnRzIHRyZWUuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gaXMgYWxsb3dlZCB0byByZXR1cm4gYG51bGxgIGlmIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgZG9lcyBub3QgaGF2ZSBhXG4gICAqIHNlcGFyYXRlIC5kLnRzIHRyZWUuIFdoZW4gY29tcGlsaW5nIFR5cGVTY3JpcHQgY29kZSB0aGlzIGlzIGFsd2F5cyB0aGUgY2FzZSwgc2luY2UgLmQudHMgZmlsZXNcbiAgICogYXJlIHByb2R1Y2VkIG9ubHkgZHVyaW5nIHRoZSBlbWl0IG9mIHN1Y2ggYSBjb21waWxhdGlvbi4gV2hlbiBjb21waWxpbmcgLmpzIGNvZGUsIGhvd2V2ZXIsXG4gICAqIHRoZXJlIGlzIGZyZXF1ZW50bHkgYSBwYXJhbGxlbCAuZC50cyB0cmVlIHdoaWNoIHRoaXMgbWV0aG9kIGV4cG9zZXMuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgYHRzLkNsYXNzRGVjbGFyYXRpb25gIHJldHVybmVkIGZyb20gdGhpcyBmdW5jdGlvbiBtYXkgbm90IGJlIGZyb20gdGhlIHNhbWVcbiAgICogYHRzLlByb2dyYW1gIGFzIHRoZSBpbnB1dCBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldER0c0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY2xhcmF0aW9ufG51bGwge1xuICAgIGlmICghdGhpcy5kdHNEZWNsYXJhdGlvbk1hcCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICghaXNOYW1lZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgZ2V0IHRoZSBkdHMgZmlsZSBmb3IgYSBkZWNsYXJhdGlvbiB0aGF0IGhhcyBubyBuYW1lOiAke2RlY2xhcmF0aW9uLmdldFRleHQoKX0gaW4gJHtkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmR0c0RlY2xhcmF0aW9uTWFwLmhhcyhkZWNsYXJhdGlvbi5uYW1lLnRleHQpID9cbiAgICAgICAgdGhpcy5kdHNEZWNsYXJhdGlvbk1hcC5nZXQoZGVjbGFyYXRpb24ubmFtZS50ZXh0KSAhIDpcbiAgICAgICAgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIHNvdXJjZSBmaWxlIGZvciBleHBvcnRlZCBmdW5jdGlvbnMgYW5kIHN0YXRpYyBjbGFzcyBtZXRob2RzIHRoYXQgcmV0dXJuXG4gICAqIE1vZHVsZVdpdGhQcm92aWRlcnMgb2JqZWN0cy5cbiAgICogQHBhcmFtIGYgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgdGhlc2UgZnVuY3Rpb25zXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGZ1bmN0aW9uIGRlY2xhcmF0aW9ucyB0aGF0IGxvb2sgbGlrZSB0aGV5IHJldHVybiBNb2R1bGVXaXRoUHJvdmlkZXJzXG4gICAqIG9iamVjdHMuXG4gICAqL1xuICBnZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGY6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSB7XG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKGYpO1xuICAgIGlmICghZXhwb3J0cykgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGluZm9zOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSA9IFtdO1xuICAgIGV4cG9ydHMuZm9yRWFjaCgoZGVjbGFyYXRpb24sIG5hbWUpID0+IHtcbiAgICAgIGlmIChkZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmlzQ2xhc3MoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgdGhpcy5nZXRNZW1iZXJzT2ZDbGFzcyhkZWNsYXJhdGlvbi5ub2RlKS5mb3JFYWNoKG1lbWJlciA9PiB7XG4gICAgICAgICAgaWYgKG1lbWJlci5pc1N0YXRpYykge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHRoaXMucGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKFxuICAgICAgICAgICAgICAgIG1lbWJlci5uYW1lLCBtZW1iZXIubm9kZSwgbWVtYmVyLmltcGxlbWVudGF0aW9uLCBkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICAgIGluZm9zLnB1c2goaW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgICBjb25zdCBpbmZvID1cbiAgICAgICAgICAgICAgdGhpcy5wYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoZGVjbGFyYXRpb24ubm9kZS5uYW1lLnRleHQsIGRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICBpbmZvcy5wdXNoKGluZm8pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBpbmZvcztcbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8gUHJvdGVjdGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgaWRlbnRpZmllciBvZiB0aGUgYWN0dWFsIGNsYXNzIGRlY2xhcmF0aW9uIGZvciBhIHBvdGVudGlhbGx5IGFsaWFzZWQgZGVjbGFyYXRpb24gb2YgYVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogSWYgdGhlIGdpdmVuIGRlY2xhcmF0aW9uIGlzIGZvciBhbiBhbGlhcyBvZiBhIGNsYXNzLCB0aGlzIGZ1bmN0aW9uIHdpbGwgZGV0ZXJtaW5lIGFuIGlkZW50aWZpZXJcbiAgICogdG8gdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIHRoYXQgcmVwcmVzZW50cyB0aGlzIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIGRlY2xhcmF0aW9uIHRvIHJlc29sdmUuXG4gICAqIEByZXR1cm5zIFRoZSBvcmlnaW5hbCBpZGVudGlmaWVyIHRoYXQgdGhlIGdpdmVuIGNsYXNzIGRlY2xhcmF0aW9uIHJlc29sdmVzIHRvLCBvciBgdW5kZWZpbmVkYFxuICAgKiBpZiB0aGUgZGVjbGFyYXRpb24gZG9lcyBub3QgcmVwcmVzZW50IGFuIGFsaWFzZWQgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZUFsaWFzZWRDbGFzc0lkZW50aWZpZXIoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgICB0aGlzLmVuc3VyZVByZXByb2Nlc3NlZChkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIHJldHVybiB0aGlzLmFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucy5oYXMoZGVjbGFyYXRpb24pID9cbiAgICAgICAgdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuZ2V0KGRlY2xhcmF0aW9uKSAhIDpcbiAgICAgICAgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmVzIHRoYXQgdGhlIHNvdXJjZSBmaWxlIHRoYXQgYG5vZGVgIGlzIHBhcnQgb2YgaGFzIGJlZW4gcHJlcHJvY2Vzc2VkLlxuICAgKlxuICAgKiBEdXJpbmcgcHJlcHJvY2Vzc2luZywgYWxsIHN0YXRlbWVudHMgaW4gdGhlIHNvdXJjZSBmaWxlIHdpbGwgYmUgdmlzaXRlZCBzdWNoIHRoYXQgY2VydGFpblxuICAgKiBwcm9jZXNzaW5nIHN0ZXBzIGNhbiBiZSBkb25lIHVwLWZyb250IGFuZCBjYWNoZWQgZm9yIHN1YnNlcXVlbnQgdXNhZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgc291cmNlIGZpbGUgdGhhdCBuZWVkcyB0byBoYXZlIGdvbmUgdGhyb3VnaCBwcmVwcm9jZXNzaW5nLlxuICAgKi9cbiAgcHJvdGVjdGVkIGVuc3VyZVByZXByb2Nlc3NlZChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnByZXByb2Nlc3NlZFNvdXJjZUZpbGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgdGhpcy5wcmVwcm9jZXNzZWRTb3VyY2VGaWxlcy5hZGQoc291cmNlRmlsZSk7XG5cbiAgICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIHNvdXJjZUZpbGUuc3RhdGVtZW50cykge1xuICAgICAgICB0aGlzLnByZXByb2Nlc3NTdGF0ZW1lbnQoc3RhdGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbHl6ZXMgdGhlIGdpdmVuIHN0YXRlbWVudCB0byBzZWUgaWYgaXQgY29ycmVzcG9uZHMgd2l0aCBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGxpa2VcbiAgICogYGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtgLiBJZiBzbywgdGhlIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzXzFgXG4gICAqIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgYE15Q2xhc3NgIGlkZW50aWZpZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgVGhlIHN0YXRlbWVudCB0aGF0IG5lZWRzIHRvIGJlIHByZXByb2Nlc3NlZC5cbiAgICovXG4gIHByb3RlY3RlZCBwcmVwcm9jZXNzU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucztcbiAgICBpZiAoZGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gZGVjbGFyYXRpb25zWzBdO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbGFyYXRpb24ubmFtZSkgfHwgIWluaXRpYWxpemVyIHx8ICFpc0Fzc2lnbm1lbnQoaW5pdGlhbGl6ZXIpIHx8XG4gICAgICAgICF0cy5pc0lkZW50aWZpZXIoaW5pdGlhbGl6ZXIubGVmdCkgfHwgIXRzLmlzQ2xhc3NFeHByZXNzaW9uKGluaXRpYWxpemVyLnJpZ2h0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gaW5pdGlhbGl6ZXIubGVmdDtcblxuICAgIGNvbnN0IGFsaWFzZWREZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoYWxpYXNlZElkZW50aWZpZXIpO1xuICAgIGlmIChhbGlhc2VkRGVjbGFyYXRpb24gPT09IG51bGwgfHwgYWxpYXNlZERlY2xhcmF0aW9uLm5vZGUgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5hYmxlIHRvIGxvY2F0ZSBkZWNsYXJhdGlvbiBvZiAke2FsaWFzZWRJZGVudGlmaWVyLnRleHR9IGluIFwiJHtzdGF0ZW1lbnQuZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLnNldChhbGlhc2VkRGVjbGFyYXRpb24ubm9kZSwgZGVjbGFyYXRpb24ubmFtZSk7XG4gIH1cblxuICAvKiogR2V0IHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgYSBtb2R1bGUuXG4gICAqXG4gICAqIEluIEVTNSBhbmQgRVMyMDE1IHRoaXMgaXMganVzdCB0aGUgdG9wIGxldmVsIHN0YXRlbWVudHMgb2YgdGhlIGZpbGUuXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBtb2R1bGUgd2hvc2Ugc3RhdGVtZW50cyB3ZSB3YW50LlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgdGhlIGdpdmVuIG1vZHVsZS5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oc291cmNlRmlsZS5zdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXYWxrIHRoZSBBU1QgbG9va2luZyBmb3IgYW4gYXNzaWdubWVudCB0byB0aGUgc3BlY2lmaWVkIHN5bWJvbC5cbiAgICogQHBhcmFtIG5vZGUgVGhlIGN1cnJlbnQgbm9kZSB3ZSBhcmUgc2VhcmNoaW5nLlxuICAgKiBAcmV0dXJucyBhbiBleHByZXNzaW9uIHRoYXQgcmVwcmVzZW50cyB0aGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLCBvciB1bmRlZmluZWQgaWYgbm9uZSBjYW4gYmVcbiAgICogZm91bmQuXG4gICAqL1xuICBwcm90ZWN0ZWQgZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUobm9kZTogdHMuTm9kZXx1bmRlZmluZWQsIHN5bWJvbDogdHMuU3ltYm9sKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghbm9kZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgbm9kZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pIHtcbiAgICAgIGNvbnN0IGxlZnQgPSBub2RlLmxlZnQ7XG4gICAgICBjb25zdCByaWdodCA9IG5vZGUucmlnaHQ7XG4gICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGxlZnQpICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGxlZnQpID09PSBzeW1ib2wpIHtcbiAgICAgICAgcmV0dXJuICh0cy5pc0NhbGxFeHByZXNzaW9uKHJpZ2h0KSAmJiBnZXRDYWxsZWVOYW1lKHJpZ2h0KSA9PT0gJ19fZGVjb3JhdGUnKSA/IHJpZ2h0IDogbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKHJpZ2h0LCBzeW1ib2wpO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZS5mb3JFYWNoQ2hpbGQobm9kZSA9PiB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKG5vZGUsIHN5bWJvbCkpIHx8IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJldHJpZXZlIHRoZSBzeW1ib2wgb2YgYSBzdGF0aWMgcHJvcGVydHkgb24gYSBjbGFzcy5cbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcHJvcGVydHkgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEBwYXJhbSBwcm9wZXJ0eU5hbWUgdGhlIG5hbWUgb2Ygc3RhdGljIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGlmIGl0IGlzIGZvdW5kIG9yIGB1bmRlZmluZWRgIGlmIG5vdC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0aWNQcm9wZXJ0eShzeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgcHJvcGVydHlOYW1lOiB0cy5fX1N0cmluZyk6IHRzLlN5bWJvbFxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHN5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzICYmIHN5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzLmdldChwcm9wZXJ0eU5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgZm9yIG9idGFpbmluZyBpbmZvcm1hdGlvbiBvbiB0aGUgZGVjb3JhdG9ycyBvZiBhIGdpdmVuIGNsYXNzLiBUaGlzXG4gICAqIGluZm9ybWF0aW9uIGlzIGNvbXB1dGVkIGVpdGhlciBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzIGlmIHByZXNlbnQsIG9yIHVzaW5nIGB0c2xpYi5fX2RlY29yYXRlYFxuICAgKiBoZWxwZXIgY2FsbHMgb3RoZXJ3aXNlLiBUaGUgY29tcHV0ZWQgcmVzdWx0IGlzIGNhY2hlZCBwZXIgY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3MgZm9yIHdoaWNoIGRlY29yYXRvcnMgc2hvdWxkIGJlIGFjcXVpcmVkLlxuICAgKiBAcmV0dXJucyBhbGwgaW5mb3JtYXRpb24gb2YgdGhlIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFjcXVpcmVEZWNvcmF0b3JJbmZvKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBEZWNvcmF0b3JJbmZvIHtcbiAgICBjb25zdCBkZWNsID0gY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAodGhpcy5kZWNvcmF0b3JDYWNoZS5oYXMoZGVjbCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlY29yYXRvckNhY2hlLmdldChkZWNsKSAhO1xuICAgIH1cblxuICAgIC8vIEZpcnN0IGF0dGVtcHQgZXh0cmFjdGluZyBkZWNvcmF0b3JzIGZyb20gc3RhdGljIHByb3BlcnRpZXMuXG4gICAgbGV0IGRlY29yYXRvckluZm8gPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbVN0YXRpY1Byb3BlcnRpZXMoY2xhc3NTeW1ib2wpO1xuICAgIGlmIChkZWNvcmF0b3JJbmZvID09PSBudWxsKSB7XG4gICAgICAvLyBJZiBub25lIHdlcmUgcHJlc2VudCwgdXNlIHRoZSBgX19kZWNvcmF0ZWAgaGVscGVyIGNhbGxzIGluc3RlYWQuXG4gICAgICBkZWNvcmF0b3JJbmZvID0gdGhpcy5jb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21IZWxwZXJDYWxscyhjbGFzc1N5bWJvbCk7XG4gICAgfVxuXG4gICAgdGhpcy5kZWNvcmF0b3JDYWNoZS5zZXQoZGVjbCwgZGVjb3JhdG9ySW5mbyk7XG4gICAgcmV0dXJuIGRlY29yYXRvckluZm87XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gY29tcHV0ZSBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSBzdGF0aWMgcHJvcGVydGllcyBcImRlY29yYXRvcnNcIiwgXCJwcm9wRGVjb3JhdG9yc1wiXG4gICAqIGFuZCBcImN0b3JQYXJhbWV0ZXJzXCIgb24gdGhlIGNsYXNzLiBJZiBuZWl0aGVyIG9mIHRoZXNlIHN0YXRpYyBwcm9wZXJ0aWVzIGlzIHByZXNlbnQgdGhlXG4gICAqIGxpYnJhcnkgaXMgbGlrZWx5IG5vdCBjb21waWxlZCB1c2luZyB0c2lja2xlIGZvciB1c2FnZSB3aXRoIENsb3N1cmUgY29tcGlsZXIsIGluIHdoaWNoIGNhc2VcbiAgICogYG51bGxgIGlzIHJldHVybmVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgVGhlIGNsYXNzIHN5bWJvbCB0byBjb21wdXRlIHRoZSBkZWNvcmF0b3JzIGluZm9ybWF0aW9uIGZvci5cbiAgICogQHJldHVybnMgQWxsIGluZm9ybWF0aW9uIG9uIHRoZSBkZWNvcmF0b3JzIGFzIGV4dHJhY3RlZCBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzLCBvciBgbnVsbGAgaWZcbiAgICogbm9uZSBvZiB0aGUgc3RhdGljIHByb3BlcnRpZXMgZXhpc3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29tcHV0ZURlY29yYXRvckluZm9Gcm9tU3RhdGljUHJvcGVydGllcyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9ySW5mb1xuICAgICAgfG51bGwge1xuICAgIGxldCBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwgPSBudWxsO1xuICAgIGxldCBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT58bnVsbCA9IG51bGw7XG4gICAgbGV0IGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXXxudWxsID0gbnVsbDtcblxuICAgIGNvbnN0IGRlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIERFQ09SQVRPUlMpO1xuICAgIGlmIChkZWNvcmF0b3JzUHJvcGVydHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xhc3NEZWNvcmF0b3JzID0gdGhpcy5nZXRDbGFzc0RlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9wRGVjb3JhdG9yc1Byb3BlcnR5ID0gdGhpcy5nZXRTdGF0aWNQcm9wZXJ0eShjbGFzc1N5bWJvbCwgUFJPUF9ERUNPUkFUT1JTKTtcbiAgICBpZiAocHJvcERlY29yYXRvcnNQcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBtZW1iZXJEZWNvcmF0b3JzID0gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KHByb3BEZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnN0cnVjdG9yUGFyYW1zUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBDT05TVFJVQ1RPUl9QQVJBTVMpO1xuICAgIGlmIChjb25zdHJ1Y3RvclBhcmFtc1Byb3BlcnR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvID0gdGhpcy5nZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkoY29uc3RydWN0b3JQYXJhbXNQcm9wZXJ0eSk7XG4gICAgfVxuXG4gICAgLy8gSWYgbm9uZSBvZiB0aGUgc3RhdGljIHByb3BlcnRpZXMgd2VyZSBwcmVzZW50LCBubyBkZWNvcmF0b3IgaW5mbyBjb3VsZCBiZSBjb21wdXRlZC5cbiAgICBpZiAoY2xhc3NEZWNvcmF0b3JzID09PSBudWxsICYmIG1lbWJlckRlY29yYXRvcnMgPT09IG51bGwgJiYgY29uc3RydWN0b3JQYXJhbUluZm8gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBjbGFzc0RlY29yYXRvcnMsXG4gICAgICBtZW1iZXJEZWNvcmF0b3JzOiBtZW1iZXJEZWNvcmF0b3JzIHx8IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKSxcbiAgICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBjb25zdHJ1Y3RvclBhcmFtSW5mbyB8fCBbXSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgY2xhc3MgZGVjb3JhdG9ycyBmb3IgdGhlIGdpdmVuIGNsYXNzLCB3aGVyZSB0aGUgZGVjb3JhdG9ycyBhcmUgZGVjbGFyZWRcbiAgICogdmlhIGEgc3RhdGljIHByb3BlcnR5LiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIGNsYXNzIFNvbWVEaXJlY3RpdmUge31cbiAgICogU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzID0gW1xuICAgKiAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzU3ltYm9sIHRoZSBwcm9wZXJ0eSBjb250YWluaW5nIHRoZSBkZWNvcmF0b3JzIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIG9yIG51bGwgaWYgbm9uZSB3aGVyZSBmb3VuZC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDbGFzc0RlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1N5bWJvbDogdHMuU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9yc0lkZW50aWZpZXIgPSBkZWNvcmF0b3JzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gICAgaWYgKGRlY29yYXRvcnNJZGVudGlmaWVyICYmIGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkge1xuICAgICAgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQpICYmXG4gICAgICAgICAgZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50Lm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbikge1xuICAgICAgICAvLyBBU1Qgb2YgdGhlIGFycmF5IG9mIGRlY29yYXRvciB2YWx1ZXNcbiAgICAgICAgY29uc3QgZGVjb3JhdG9yc0FycmF5ID0gZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50LnJpZ2h0O1xuICAgICAgICByZXR1cm4gdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXkpXG4gICAgICAgICAgICAuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4YW1pbmUgYSBzeW1ib2wgd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgaXRzIG1lbWJlcnMuXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIGBDbGFzc1N5bWJvbGAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBDbGFzc01lbWJlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBtZW1iZXJzIG9mIHRoZSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNZW1iZXJzT2ZTeW1ib2woc3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBDbGFzc01lbWJlcltdIHtcbiAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG5cbiAgICAvLyBUaGUgZGVjb3JhdG9ycyBtYXAgY29udGFpbnMgYWxsIHRoZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIGRlY29yYXRlZFxuICAgIGNvbnN0IHttZW1iZXJEZWNvcmF0b3JzfSA9IHRoaXMuYWNxdWlyZURlY29yYXRvckluZm8oc3ltYm9sKTtcblxuICAgIC8vIE1ha2UgYSBjb3B5IG9mIHRoZSBkZWNvcmF0b3JzIGFzIHN1Y2Nlc3NmdWxseSByZWZsZWN0ZWQgbWVtYmVycyBkZWxldGUgdGhlbXNlbHZlcyBmcm9tIHRoZVxuICAgIC8vIG1hcCwgc28gdGhhdCBhbnkgbGVmdG92ZXJzIGNhbiBiZSBlYXNpbHkgZGVhbHQgd2l0aC5cbiAgICBjb25zdCBkZWNvcmF0b3JzTWFwID0gbmV3IE1hcChtZW1iZXJEZWNvcmF0b3JzKTtcblxuICAgIC8vIFRoZSBtZW1iZXIgbWFwIGNvbnRhaW5zIGFsbCB0aGUgbWV0aG9kIChpbnN0YW5jZSBhbmQgc3RhdGljKTsgYW5kIGFueSBpbnN0YW5jZSBwcm9wZXJ0aWVzXG4gICAgLy8gdGhhdCBhcmUgaW5pdGlhbGl6ZWQgaW4gdGhlIGNsYXNzLlxuICAgIGlmIChzeW1ib2wuaW1wbGVtZW50YXRpb24ubWVtYmVycykge1xuICAgICAgc3ltYm9sLmltcGxlbWVudGF0aW9uLm1lbWJlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgIGNvbnN0IHJlZmxlY3RlZE1lbWJlcnMgPSB0aGlzLnJlZmxlY3RNZW1iZXJzKHZhbHVlLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgaWYgKHJlZmxlY3RlZE1lbWJlcnMpIHtcbiAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICBtZW1iZXJzLnB1c2goLi4ucmVmbGVjdGVkTWVtYmVycyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFRoZSBzdGF0aWMgcHJvcGVydHkgbWFwIGNvbnRhaW5zIGFsbCB0aGUgc3RhdGljIHByb3BlcnRpZXNcbiAgICBpZiAoc3ltYm9sLmltcGxlbWVudGF0aW9uLmV4cG9ydHMpIHtcbiAgICAgIHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5leHBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycywgdHJ1ZSk7XG4gICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGlzIGNsYXNzIHdhcyBkZWNsYXJlZCBhcyBhIFZhcmlhYmxlRGVjbGFyYXRpb24gdGhlbiBpdCBtYXkgaGF2ZSBzdGF0aWMgcHJvcGVydGllc1xuICAgIC8vIGF0dGFjaGVkIHRvIHRoZSB2YXJpYWJsZSByYXRoZXIgdGhhbiB0aGUgY2xhc3MgaXRzZWxmXG4gICAgLy8gRm9yIGV4YW1wbGU6XG4gICAgLy8gYGBgXG4gICAgLy8gbGV0IE15Q2xhc3MgPSBjbGFzcyBNeUNsYXNzIHtcbiAgICAvLyAgIC8vIG5vIHN0YXRpYyBwcm9wZXJ0aWVzIGhlcmUhXG4gICAgLy8gfVxuICAgIC8vIE15Q2xhc3Muc3RhdGljUHJvcGVydHkgPSAuLi47XG4gICAgLy8gYGBgXG4gICAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihzeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbikpIHtcbiAgICAgIGlmIChzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cykge1xuICAgICAgICBzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIGNvbnN0IHJlZmxlY3RlZE1lbWJlcnMgPSB0aGlzLnJlZmxlY3RNZW1iZXJzKHZhbHVlLCBkZWNvcmF0b3JzLCB0cnVlKTtcbiAgICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgICBtZW1iZXJzLnB1c2goLi4ucmVmbGVjdGVkTWVtYmVycyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWFsIHdpdGggYW55IGRlY29yYXRlZCBwcm9wZXJ0aWVzIHRoYXQgd2VyZSBub3QgaW5pdGlhbGl6ZWQgaW4gdGhlIGNsYXNzXG4gICAgZGVjb3JhdG9yc01hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICBpbXBsZW1lbnRhdGlvbjogbnVsbCxcbiAgICAgICAgZGVjb3JhdG9yczogdmFsdWUsXG4gICAgICAgIGlzU3RhdGljOiBmYWxzZSxcbiAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5LFxuICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICBub2RlOiBudWxsLFxuICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICB2YWx1ZTogbnVsbFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBNZW1iZXIgZGVjb3JhdG9ycyBtYXkgYmUgZGVjbGFyZWQgYXMgc3RhdGljIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9ycyA9IHtcbiAgICogICBcIm5nRm9yT2ZcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiAgIFwibmdGb3JUcmFja0J5XCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVGVtcGxhdGVcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiB9O1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNQcm9wZXJ0eSB0aGUgY2xhc3Mgd2hvc2UgbWVtYmVyIGRlY29yYXRvcnMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGEgbWFwIHdob3NlIGtleXMgYXJlIHRoZSBuYW1lIG9mIHRoZSBtZW1iZXJzIGFuZCB3aG9zZSB2YWx1ZXMgYXJlIGNvbGxlY3Rpb25zIG9mXG4gICAqIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzUHJvcGVydHk6IHRzLlN5bWJvbCk6XG4gICAgICBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4ge1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG4gICAgLy8gU3ltYm9sIG9mIHRoZSBpZGVudGlmaWVyIGZvciBgU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9yc2AuXG4gICAgY29uc3QgcHJvcERlY29yYXRvcnNNYXAgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChkZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGlmIChwcm9wRGVjb3JhdG9yc01hcCAmJiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHByb3BEZWNvcmF0b3JzTWFwKSkge1xuICAgICAgY29uc3QgcHJvcGVydGllc01hcCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKHByb3BEZWNvcmF0b3JzTWFwKTtcbiAgICAgIHByb3BlcnRpZXNNYXAuZm9yRWFjaCgodmFsdWUsIG5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9XG4gICAgICAgICAgICB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKHZhbHVlKS5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgICAgaWYgKGRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5zZXQobmFtZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbWVtYmVyRGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgYSBnaXZlbiBjbGFzcyBzeW1ib2wsIGNvbGxlY3RzIGFsbCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSB0c2xpYiBoZWxwZXIgbWV0aG9kcywgYXNcbiAgICogZ2VuZXJhdGVkIGJ5IFR5cGVTY3JpcHQgaW50byBlbWl0dGVkIEphdmFTY3JpcHQgZmlsZXMuXG4gICAqXG4gICAqIENsYXNzIGRlY29yYXRvcnMgYXJlIGV4dHJhY3RlZCBmcm9tIGNhbGxzIHRvIGB0c2xpYi5fX2RlY29yYXRlYCB0aGF0IGxvb2sgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBTb21lRGlyZWN0aXZlID0gY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlID0gX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoZSBleHRyYWN0aW9uIG9mIG1lbWJlciBkZWNvcmF0b3JzIGlzIHNpbWlsYXIsIHdpdGggdGhlIGRpc3RpbmN0aW9uIHRoYXQgaXRzIDJuZCBhbmQgM3JkXG4gICAqIGFyZ3VtZW50IGNvcnJlc3BvbmQgd2l0aCBhIFwicHJvdG90eXBlXCIgdGFyZ2V0IGFuZCB0aGUgbmFtZSBvZiB0aGUgbWVtYmVyIHRvIHdoaWNoIHRoZVxuICAgKiBkZWNvcmF0b3JzIGFwcGx5LlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgICBJbnB1dCgpLFxuICAgKiAgICAgX19tZXRhZGF0YShcImRlc2lnbjp0eXBlXCIsIFN0cmluZylcbiAgICogXSwgU29tZURpcmVjdGl2ZS5wcm90b3R5cGUsIFwiaW5wdXQxXCIsIHZvaWQgMCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgVGhlIGNsYXNzIHN5bWJvbCBmb3Igd2hpY2ggZGVjb3JhdG9ycyBzaG91bGQgYmUgZXh0cmFjdGVkLlxuICAgKiBAcmV0dXJucyBBbGwgaW5mb3JtYXRpb24gb24gdGhlIGRlY29yYXRvcnMgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiBEZWNvcmF0b3JJbmZvIHtcbiAgICBsZXQgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsID0gbnVsbDtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXSA9IFtdO1xuXG4gICAgY29uc3QgZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8gPSAoaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgbGV0IHBhcmFtID0gY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdO1xuICAgICAgaWYgKHBhcmFtID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGFyYW0gPSBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF0gPSB7ZGVjb3JhdG9yczogbnVsbCwgdHlwZUV4cHJlc3Npb246IG51bGx9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhcmFtO1xuICAgIH07XG5cbiAgICAvLyBBbGwgcmVsZXZhbnQgaW5mb3JtYXRpb24gY2FuIGJlIGV4dHJhY3RlZCBmcm9tIGNhbGxzIHRvIGBfX2RlY29yYXRlYCwgb2J0YWluIHRoZXNlIGZpcnN0LlxuICAgIC8vIE5vdGUgdGhhdCBhbHRob3VnaCB0aGUgaGVscGVyIGNhbGxzIGFyZSByZXRyaWV2ZWQgdXNpbmcgdGhlIGNsYXNzIHN5bWJvbCwgdGhlIHJlc3VsdCBtYXlcbiAgICAvLyBjb250YWluIGhlbHBlciBjYWxscyBjb3JyZXNwb25kaW5nIHdpdGggdW5yZWxhdGVkIGNsYXNzZXMuIFRoZXJlZm9yZSwgZWFjaCBoZWxwZXIgY2FsbCBzdGlsbFxuICAgIC8vIGhhcyB0byBiZSBjaGVja2VkIHRvIGFjdHVhbGx5IGNvcnJlc3BvbmQgd2l0aCB0aGUgY2xhc3Mgc3ltYm9sLlxuICAgIGNvbnN0IGhlbHBlckNhbGxzID0gdGhpcy5nZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sLCAnX19kZWNvcmF0ZScpO1xuXG4gICAgZm9yIChjb25zdCBoZWxwZXJDYWxsIG9mIGhlbHBlckNhbGxzKSB7XG4gICAgICBpZiAoaXNDbGFzc0RlY29yYXRlQ2FsbChoZWxwZXJDYWxsLCBjbGFzc1N5bWJvbC5uYW1lKSkge1xuICAgICAgICAvLyBUaGlzIGBfX2RlY29yYXRlYCBjYWxsIGlzIHRhcmdldGluZyB0aGUgY2xhc3MgaXRzZWxmLlxuICAgICAgICBjb25zdCBoZWxwZXJBcmdzID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMF07XG5cbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGhlbHBlckFyZ3MuZWxlbWVudHMpIHtcbiAgICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMucmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZWxlbWVudCk7XG4gICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ2RlY29yYXRvcicpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHdhcyByZWZsZWN0ZWQgdG8gcmVwcmVzZW50IGFuIGFjdHVhbCBkZWNvcmF0b3JcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRnJvbUNvcmUoZW50cnkuZGVjb3JhdG9yKSkge1xuICAgICAgICAgICAgICAoY2xhc3NEZWNvcmF0b3JzIHx8IChjbGFzc0RlY29yYXRvcnMgPSBbXSkpLnB1c2goZW50cnkuZGVjb3JhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LnR5cGUgPT09ICdwYXJhbTpkZWNvcmF0b3JzJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgcmVwcmVzZW50cyBhIGRlY29yYXRvciBmb3IgYSBwYXJhbWV0ZXIuIFNpbmNlIGl0J3MgYXBwbGllZCB0byB0aGVcbiAgICAgICAgICAgIC8vIGNsYXNzLCBpdCBjb3JyZXNwb25kcyB3aXRoIGEgY29uc3RydWN0b3IgcGFyYW1ldGVyIG9mIHRoZSBjbGFzcy5cbiAgICAgICAgICAgIGNvbnN0IHBhcmFtID0gZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oZW50cnkuaW5kZXgpO1xuICAgICAgICAgICAgKHBhcmFtLmRlY29yYXRvcnMgfHwgKHBhcmFtLmRlY29yYXRvcnMgPSBbXSkpLnB1c2goZW50cnkuZGVjb3JhdG9yKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LnR5cGUgPT09ICdwYXJhbXMnKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyByZXByZXNlbnRzIHRoZSB0eXBlcyBvZiB0aGUgcGFyYW1ldGVycy4gU2luY2UgaXQncyBhcHBsaWVkIHRvIHRoZVxuICAgICAgICAgICAgLy8gY2xhc3MsIGl0IGNvcnJlc3BvbmRzIHdpdGggdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgdGhlIGNsYXNzLlxuICAgICAgICAgICAgZW50cnkudHlwZXMuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAodHlwZSwgaW5kZXgpID0+IGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKGluZGV4KS50eXBlRXhwcmVzc2lvbiA9IHR5cGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc01lbWJlckRlY29yYXRlQ2FsbChoZWxwZXJDYWxsLCBjbGFzc1N5bWJvbC5uYW1lKSkge1xuICAgICAgICAvLyBUaGUgYF9fZGVjb3JhdGVgIGNhbGwgaXMgdGFyZ2V0aW5nIGEgbWVtYmVyIG9mIHRoZSBjbGFzc1xuICAgICAgICBjb25zdCBoZWxwZXJBcmdzID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMF07XG4gICAgICAgIGNvbnN0IG1lbWJlck5hbWUgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1syXS50ZXh0O1xuXG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBoZWxwZXJBcmdzLmVsZW1lbnRzKSB7XG4gICAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLnJlZmxlY3REZWNvcmF0ZUhlbHBlckVudHJ5KGVsZW1lbnQpO1xuICAgICAgICAgIGlmIChlbnRyeSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09ICdkZWNvcmF0b3InKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyB3YXMgcmVmbGVjdGVkIHRvIHJlcHJlc2VudCBhbiBhY3R1YWwgZGVjb3JhdG9yLlxuICAgICAgICAgICAgaWYgKHRoaXMuaXNGcm9tQ29yZShlbnRyeS5kZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5oYXMobWVtYmVyTmFtZSkgPyBtZW1iZXJEZWNvcmF0b3JzLmdldChtZW1iZXJOYW1lKSAhIDogW107XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLnNldChtZW1iZXJOYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSW5mb3JtYXRpb24gb24gZGVjb3JhdGVkIHBhcmFtZXRlcnMgaXMgbm90IGludGVyZXN0aW5nIGZvciBuZ2NjLCBzbyBpdCdzIGlnbm9yZWQuXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtjbGFzc0RlY29yYXRvcnMsIG1lbWJlckRlY29yYXRvcnMsIGNvbnN0cnVjdG9yUGFyYW1JbmZvfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IHRoZSBkZXRhaWxzIG9mIGFuIGVudHJ5IHdpdGhpbiBhIGBfX2RlY29yYXRlYCBoZWxwZXIgY2FsbC4gRm9yIGV4YW1wbGUsIGdpdmVuIHRoZVxuICAgKiBmb2xsb3dpbmcgY29kZTpcbiAgICpcbiAgICogYGBgXG4gICAqIF9fZGVjb3JhdGUoW1xuICAgKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAgICogICB0c2xpYl8xLl9fcGFyYW0oMiwgSW5qZWN0KElOSkVDVEVEX1RPS0VOKSksXG4gICAqICAgdHNsaWJfMS5fX21ldGFkYXRhKFwiZGVzaWduOnBhcmFtdHlwZXNcIiwgW1ZpZXdDb250YWluZXJSZWYsIFRlbXBsYXRlUmVmLCBTdHJpbmddKVxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIGl0IGNhbiBiZSBzZWVuIHRoYXQgdGhlcmUgYXJlIGNhbGxzIHRvIHJlZ3VsYXIgZGVjb3JhdG9ycyAodGhlIGBEaXJlY3RpdmVgKSBhbmQgY2FsbHMgaW50b1xuICAgKiBgdHNsaWJgIGZ1bmN0aW9ucyB3aGljaCBoYXZlIGJlZW4gaW5zZXJ0ZWQgYnkgVHlwZVNjcmlwdC4gVGhlcmVmb3JlLCB0aGlzIGZ1bmN0aW9uIGNsYXNzaWZpZXNcbiAgICogYSBjYWxsIHRvIGNvcnJlc3BvbmQgd2l0aFxuICAgKiAgIDEuIGEgcmVhbCBkZWNvcmF0b3IgbGlrZSBgRGlyZWN0aXZlYCBhYm92ZSwgb3JcbiAgICogICAyLiBhIGRlY29yYXRlZCBwYXJhbWV0ZXIsIGNvcnJlc3BvbmRpbmcgd2l0aCBgX19wYXJhbWAgY2FsbHMgZnJvbSBgdHNsaWJgLCBvclxuICAgKiAgIDMuIHRoZSB0eXBlIGluZm9ybWF0aW9uIG9mIHBhcmFtZXRlcnMsIGNvcnJlc3BvbmRpbmcgd2l0aCBgX19tZXRhZGF0YWAgY2FsbCBmcm9tIGB0c2xpYmBcbiAgICpcbiAgICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBuZWVkcyB0byBiZSByZWZsZWN0ZWQgaW50byBhIGBEZWNvcmF0ZUhlbHBlckVudHJ5YFxuICAgKiBAcmV0dXJucyBhbiBvYmplY3QgdGhhdCBpbmRpY2F0ZXMgd2hpY2ggb2YgdGhlIHRocmVlIGNhdGVnb3JpZXMgdGhlIGNhbGwgcmVwcmVzZW50cywgdG9nZXRoZXJcbiAgICogd2l0aCB0aGUgcmVmbGVjdGVkIGluZm9ybWF0aW9uIG9mIHRoZSBjYWxsLCBvciBudWxsIGlmIHRoZSBjYWxsIGlzIG5vdCBhIHZhbGlkIGRlY29yYXRlIGNhbGwuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IERlY29yYXRlSGVscGVyRW50cnl8bnVsbCB7XG4gICAgLy8gV2Ugb25seSBjYXJlIGFib3V0IHRob3NlIGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbCBjYWxsc1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGNhbGwgPSBleHByZXNzaW9uO1xuXG4gICAgY29uc3QgaGVscGVyTmFtZSA9IGdldENhbGxlZU5hbWUoY2FsbCk7XG4gICAgaWYgKGhlbHBlck5hbWUgPT09ICdfX21ldGFkYXRhJykge1xuICAgICAgLy8gVGhpcyBpcyBhIGB0c2xpYi5fX21ldGFkYXRhYCBjYWxsLCByZWZsZWN0IHRvIGFyZ3VtZW50cyBpbnRvIGEgYFBhcmFtZXRlclR5cGVzYCBvYmplY3RcbiAgICAgIC8vIGlmIHRoZSBtZXRhZGF0YSBrZXkgaXMgXCJkZXNpZ246cGFyYW10eXBlc1wiLlxuICAgICAgY29uc3Qga2V5ID0gY2FsbC5hcmd1bWVudHNbMF07XG4gICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbChrZXkpIHx8IGtleS50ZXh0ICE9PSAnZGVzaWduOnBhcmFtdHlwZXMnKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdwYXJhbXMnLFxuICAgICAgICB0eXBlczogQXJyYXkuZnJvbSh2YWx1ZS5lbGVtZW50cyksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChoZWxwZXJOYW1lID09PSAnX19wYXJhbScpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBgdHNsaWIuX19wYXJhbWAgY2FsbCB0aGF0IGlzIHJlZmxlY3RlZCBpbnRvIGEgYFBhcmFtZXRlckRlY29yYXRvcnNgIG9iamVjdC5cbiAgICAgIGNvbnN0IGluZGV4QXJnID0gY2FsbC5hcmd1bWVudHNbMF07XG4gICAgICBjb25zdCBpbmRleCA9IGluZGV4QXJnICYmIHRzLmlzTnVtZXJpY0xpdGVyYWwoaW5kZXhBcmcpID8gcGFyc2VJbnQoaW5kZXhBcmcudGV4dCwgMTApIDogTmFOO1xuICAgICAgaWYgKGlzTmFOKGluZGV4KSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjb3JhdG9yQ2FsbCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGRlY29yYXRvckNhbGwgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihkZWNvcmF0b3JDYWxsKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjb3JhdG9yID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChkZWNvcmF0b3JDYWxsKTtcbiAgICAgIGlmIChkZWNvcmF0b3IgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdwYXJhbTpkZWNvcmF0b3JzJyxcbiAgICAgICAgaW5kZXgsXG4gICAgICAgIGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIGF0dGVtcHQgdG8gcmVmbGVjdCBpdCBhcyBhIHJlZ3VsYXIgZGVjb3JhdG9yLlxuICAgIGNvbnN0IGRlY29yYXRvciA9IHRoaXMucmVmbGVjdERlY29yYXRvckNhbGwoY2FsbCk7XG4gICAgaWYgKGRlY29yYXRvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnZGVjb3JhdG9yJyxcbiAgICAgIGRlY29yYXRvcixcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JDYWxsKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKTogRGVjb3JhdG9yfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvckV4cHJlc3Npb24gPSBjYWxsLmV4cHJlc3Npb247XG4gICAgaWYgKCFpc0RlY29yYXRvcklkZW50aWZpZXIoZGVjb3JhdG9yRXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdlIGZvdW5kIGEgZGVjb3JhdG9yIVxuICAgIGNvbnN0IGRlY29yYXRvcklkZW50aWZpZXIgPVxuICAgICAgICB0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yRXhwcmVzc2lvbikgPyBkZWNvcmF0b3JFeHByZXNzaW9uIDogZGVjb3JhdG9yRXhwcmVzc2lvbi5uYW1lO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvckV4cHJlc3Npb24sXG4gICAgICBpbXBvcnQ6IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpLFxuICAgICAgbm9kZTogY2FsbCxcbiAgICAgIGFyZ3M6IEFycmF5LmZyb20oY2FsbC5hcmd1bWVudHMpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIGdpdmVuIHN0YXRlbWVudCB0byBzZWUgaWYgaXQgaXMgYSBjYWxsIHRvIHRoZSBzcGVjaWZpZWQgaGVscGVyIGZ1bmN0aW9uIG9yIG51bGwgaWZcbiAgICogbm90IGZvdW5kLlxuICAgKlxuICAgKiBNYXRjaGluZyBzdGF0ZW1lbnRzIHdpbGwgbG9vayBsaWtlOiAgYHRzbGliXzEuX19kZWNvcmF0ZSguLi4pO2AuXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgdGhlIHN0YXRlbWVudCB0aGF0IG1heSBjb250YWluIHRoZSBjYWxsLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZSB0aGUgbmFtZSBvZiB0aGUgaGVscGVyIHdlIGFyZSBsb29raW5nIGZvci5cbiAgICogQHJldHVybnMgdGhlIG5vZGUgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgYF9fZGVjb3JhdGUoLi4uKWAgY2FsbCBvciBudWxsIGlmIHRoZSBzdGF0ZW1lbnRcbiAgICogZG9lcyBub3QgbWF0Y2guXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SGVscGVyQ2FsbChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCwgaGVscGVyTmFtZTogc3RyaW5nKTogdHMuQ2FsbEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICBsZXQgZXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uO1xuICAgICAgd2hpbGUgKGlzQXNzaWdubWVudChleHByZXNzaW9uKSkge1xuICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5yaWdodDtcbiAgICAgIH1cbiAgICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmIGdldENhbGxlZU5hbWUoZXhwcmVzc2lvbikgPT09IGhlbHBlck5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGV4cHJlc3Npb247XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIHRoZSBnaXZlbiBhcnJheSBub2RlIGFuZCBleHRyYWN0IGRlY29yYXRvciBpbmZvcm1hdGlvbiBmcm9tIGVhY2ggZWxlbWVudC5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIGZvciBkZWNvcmF0b3JzIHRoYXQgYXJlIGRlZmluZWQgaW4gc3RhdGljIHByb3BlcnRpZXMuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzID0gW1xuICAgKiAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzQXJyYXkgYW4gZXhwcmVzc2lvbiB0aGF0IGNvbnRhaW5zIGRlY29yYXRvciBpbmZvcm1hdGlvbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9yIGluZm8gdGhhdCB3YXMgcmVmbGVjdGVkIGZyb20gdGhlIGFycmF5IG5vZGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9yc0FycmF5OiB0cy5FeHByZXNzaW9uKTogRGVjb3JhdG9yW10ge1xuICAgIGNvbnN0IGRlY29yYXRvcnM6IERlY29yYXRvcltdID0gW107XG5cbiAgICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlY29yYXRvcnNBcnJheSkpIHtcbiAgICAgIC8vIEFkZCBlYWNoIGRlY29yYXRvciB0aGF0IGlzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgIGludG8gdGhlIGBkZWNvcmF0b3JzYCBhcnJheVxuICAgICAgZGVjb3JhdG9yc0FycmF5LmVsZW1lbnRzLmZvckVhY2gobm9kZSA9PiB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGRlY29yYXRvciBpcyBub3QgYW4gb2JqZWN0IGxpdGVyYWwgZXhwcmVzc2lvbiB0aGVuIHdlIGFyZSBub3QgaW50ZXJlc3RlZFxuICAgICAgICBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgICAgIC8vIFdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gb2JqZWN0cyBvZiB0aGUgZm9ybTogYHsgdHlwZTogRGVjb3JhdG9yVHlwZSwgYXJnczogWy4uLl0gfWBcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3IgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChub2RlKTtcblxuICAgICAgICAgIC8vIElzIHRoZSB2YWx1ZSBvZiB0aGUgYHR5cGVgIHByb3BlcnR5IGFuIGlkZW50aWZpZXI/XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5oYXMoJ3R5cGUnKSkge1xuICAgICAgICAgICAgbGV0IGRlY29yYXRvclR5cGUgPSBkZWNvcmF0b3IuZ2V0KCd0eXBlJykgITtcbiAgICAgICAgICAgIGlmIChpc0RlY29yYXRvcklkZW50aWZpZXIoZGVjb3JhdG9yVHlwZSkpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9XG4gICAgICAgICAgICAgICAgICB0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yVHlwZSkgPyBkZWNvcmF0b3JUeXBlIDogZGVjb3JhdG9yVHlwZS5uYW1lO1xuICAgICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBkZWNvcmF0b3JUeXBlLFxuICAgICAgICAgICAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjb3JhdG9ySWRlbnRpZmllciksIG5vZGUsXG4gICAgICAgICAgICAgICAgYXJnczogZ2V0RGVjb3JhdG9yQXJncyhub2RlKSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICpcbiAgICogQSBzaW5nbGUgc3ltYm9sIG1heSByZXByZXNlbnQgbXVsdGlwbGUgY2xhc3MgbWVtYmVycyBpbiB0aGUgY2FzZSBvZiBhY2Nlc3NvcnM7XG4gICAqIGFuIGVxdWFsbHkgbmFtZWQgZ2V0dGVyL3NldHRlciBhY2Nlc3NvciBwYWlyIGlzIGNvbWJpbmVkIGludG8gYSBzaW5nbGUgc3ltYm9sLlxuICAgKiBXaGVuIHRoZSBzeW1ib2wgaXMgcmVjb2duaXplZCBhcyByZXByZXNlbnRpbmcgYW4gYWNjZXNzb3IsIGl0cyBkZWNsYXJhdGlvbnMgYXJlXG4gICAqIGFuYWx5emVkIHN1Y2ggdGhhdCBib3RoIHRoZSBzZXR0ZXIgYW5kIGdldHRlciBhY2Nlc3NvciBhcmUgcmV0dXJuZWQgYXMgc2VwYXJhdGVcbiAgICogY2xhc3MgbWVtYmVycy5cbiAgICpcbiAgICogT25lIGRpZmZlcmVuY2Ugd3J0IHRoZSBUeXBlU2NyaXB0IGhvc3QgaXMgdGhhdCBpbiBFUzIwMTUsIHdlIGNhbm5vdCBzZWUgd2hpY2hcbiAgICogYWNjZXNzb3Igb3JpZ2luYWxseSBoYWQgYW55IGRlY29yYXRvcnMgYXBwbGllZCB0byB0aGVtLCBhcyBkZWNvcmF0b3JzIGFyZSBhcHBsaWVkXG4gICAqIHRvIHRoZSBwcm9wZXJ0eSBkZXNjcmlwdG9yIGluIGdlbmVyYWwsIG5vdCBhIHNwZWNpZmljIGFjY2Vzc29yLiBJZiBhbiBhY2Nlc3NvclxuICAgKiBoYXMgYm90aCBhIHNldHRlciBhbmQgZ2V0dGVyLCBhbnkgZGVjb3JhdG9ycyBhcmUgb25seSBhdHRhY2hlZCB0byB0aGUgc2V0dGVyIG1lbWJlci5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgc3ltYm9sIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcnMoc3ltYm9sOiB0cy5TeW1ib2wsIGRlY29yYXRvcnM/OiBEZWNvcmF0b3JbXSwgaXNTdGF0aWM/OiBib29sZWFuKTpcbiAgICAgIENsYXNzTWVtYmVyW118bnVsbCB7XG4gICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFjY2Vzc29yKSB7XG4gICAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gICAgICBjb25zdCBzZXR0ZXIgPSBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnMuZmluZCh0cy5pc1NldEFjY2Vzc29yKTtcbiAgICAgIGNvbnN0IGdldHRlciA9IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5maW5kKHRzLmlzR2V0QWNjZXNzb3IpO1xuXG4gICAgICBjb25zdCBzZXR0ZXJNZW1iZXIgPVxuICAgICAgICAgIHNldHRlciAmJiB0aGlzLnJlZmxlY3RNZW1iZXIoc2V0dGVyLCBDbGFzc01lbWJlcktpbmQuU2V0dGVyLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgICBpZiAoc2V0dGVyTWVtYmVyKSB7XG4gICAgICAgIG1lbWJlcnMucHVzaChzZXR0ZXJNZW1iZXIpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYXR0YWNoaW5nIHRoZSBkZWNvcmF0b3JzIHRvIGEgcG90ZW50aWFsIGdldHRlci4gSW4gRVMyMDE1LCB3ZSBjYW4ndCB0ZWxsIHdoZXJlXG4gICAgICAgIC8vIHRoZSBkZWNvcmF0b3JzIHdlcmUgb3JpZ2luYWxseSBhdHRhY2hlZCB0bywgaG93ZXZlciB3ZSBvbmx5IHdhbnQgdG8gYXR0YWNoIHRoZW0gdG8gYVxuICAgICAgICAvLyBzaW5nbGUgYENsYXNzTWVtYmVyYCBhcyBvdGhlcndpc2Ugbmd0c2Mgd291bGQgaGFuZGxlIHRoZSBzYW1lIGRlY29yYXRvcnMgdHdpY2UuXG4gICAgICAgIGRlY29yYXRvcnMgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGdldHRlck1lbWJlciA9XG4gICAgICAgICAgZ2V0dGVyICYmIHRoaXMucmVmbGVjdE1lbWJlcihnZXR0ZXIsIENsYXNzTWVtYmVyS2luZC5HZXR0ZXIsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICAgIGlmIChnZXR0ZXJNZW1iZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKGdldHRlck1lbWJlcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgIH1cblxuICAgIGxldCBraW5kOiBDbGFzc01lbWJlcktpbmR8bnVsbCA9IG51bGw7XG4gICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLk1ldGhvZCkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5NZXRob2Q7XG4gICAgfSBlbHNlIGlmIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5Qcm9wZXJ0eSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlID0gc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gfHwgc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zWzBdO1xuICAgIGlmICghbm9kZSkge1xuICAgICAgLy8gSWYgdGhlIHN5bWJvbCBoYXMgYmVlbiBpbXBvcnRlZCBmcm9tIGEgVHlwZVNjcmlwdCB0eXBpbmdzIGZpbGUgdGhlbiB0aGUgY29tcGlsZXJcbiAgICAgIC8vIG1heSBwYXNzIHRoZSBgcHJvdG90eXBlYCBzeW1ib2wgYXMgYW4gZXhwb3J0IG9mIHRoZSBjbGFzcy5cbiAgICAgIC8vIEJ1dCB0aGlzIGhhcyBubyBkZWNsYXJhdGlvbi4gSW4gdGhpcyBjYXNlIHdlIGp1c3QgcXVpZXRseSBpZ25vcmUgaXQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBtZW1iZXIgPSB0aGlzLnJlZmxlY3RNZW1iZXIobm9kZSwga2luZCwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgIGlmICghbWVtYmVyKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gW21lbWJlcl07XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICogQHBhcmFtIG5vZGUgdGhlIGRlY2xhcmF0aW9uIG5vZGUgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0ga2luZCB0aGUgYXNzdW1lZCBraW5kIG9mIHRoZSBtZW1iZXIsIG1heSBiZWNvbWUgbW9yZSBhY2N1cmF0ZSBkdXJpbmcgcmVmbGVjdGlvbi5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcihcbiAgICAgIG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBraW5kOiBDbGFzc01lbWJlcktpbmR8bnVsbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLFxuICAgICAgaXNTdGF0aWM/OiBib29sZWFuKTogQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gICAgbGV0IHZhbHVlOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWVOb2RlOiB0cy5JZGVudGlmaWVyfG51bGwgPSBudWxsO1xuXG4gICAgaWYgKCFpc0NsYXNzTWVtYmVyVHlwZShub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGlzU3RhdGljICYmIGlzUHJvcGVydHlBY2Nlc3Mobm9kZSkpIHtcbiAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgIHZhbHVlID0ga2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5ID8gbm9kZS5wYXJlbnQucmlnaHQgOiBudWxsO1xuICAgIH0gZWxzZSBpZiAoaXNUaGlzQXNzaWdubWVudChub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICAgIG5hbWUgPSBub2RlLmxlZnQubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBub2RlLnJpZ2h0O1xuICAgICAgaXNTdGF0aWMgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHRzLmlzQ29uc3RydWN0b3JEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Db25zdHJ1Y3RvcjtcbiAgICAgIG5hbWUgPSAnY29uc3RydWN0b3InO1xuICAgICAgaXNTdGF0aWMgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoa2luZCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihgVW5rbm93biBtZW1iZXIgdHlwZTogXCIke25vZGUuZ2V0VGV4dCgpfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBpZiAoaXNOYW1lZERlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgICAgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB3ZSBoYXZlIHN0aWxsIG5vdCBkZXRlcm1pbmVkIGlmIHRoaXMgaXMgYSBzdGF0aWMgb3IgaW5zdGFuY2UgbWVtYmVyIHRoZW5cbiAgICAvLyBsb29rIGZvciB0aGUgYHN0YXRpY2Aga2V5d29yZCBvbiB0aGUgZGVjbGFyYXRpb25cbiAgICBpZiAoaXNTdGF0aWMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaXNTdGF0aWMgPSBub2RlLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgbm9kZS5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZTogdHMuVHlwZU5vZGUgPSAobm9kZSBhcyBhbnkpLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgbm9kZSxcbiAgICAgIGltcGxlbWVudGF0aW9uOiBub2RlLCBraW5kLCB0eXBlLCBuYW1lLCBuYW1lTm9kZSwgdmFsdWUsIGlzU3RhdGljLFxuICAgICAgZGVjb3JhdG9yczogZGVjb3JhdG9ycyB8fCBbXVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlcnMgd2Ugd2FudCB0byBmaW5kLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25gIG9iamVjdHMgcmVwcmVzZW50aW5nIGVhY2ggb2YgdGhlIHBhcmFtZXRlcnMgaW5cbiAgICogdGhlIGNsYXNzJ3MgY29uc3RydWN0b3Igb3IgbnVsbCBpZiB0aGVyZSBpcyBubyBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTpcbiAgICAgIHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW118bnVsbCB7XG4gICAgY29uc3QgbWVtYmVycyA9IGNsYXNzU3ltYm9sLmltcGxlbWVudGF0aW9uLm1lbWJlcnM7XG4gICAgaWYgKG1lbWJlcnMgJiYgbWVtYmVycy5oYXMoQ09OU1RSVUNUT1IpKSB7XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvclN5bWJvbCA9IG1lbWJlcnMuZ2V0KENPTlNUUlVDVE9SKSAhO1xuICAgICAgLy8gRm9yIHNvbWUgcmVhc29uIHRoZSBjb25zdHJ1Y3RvciBkb2VzIG5vdCBoYXZlIGEgYHZhbHVlRGVjbGFyYXRpb25gID8hP1xuICAgICAgY29uc3QgY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnMgJiZcbiAgICAgICAgICBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnNbMF0gYXMgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbiB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghY29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgICAgaWYgKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbShjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciBkZWNvcmF0b3JzIG9mIGEgY2xhc3MgY29uc3RydWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEBwYXJhbSBwYXJhbWV0ZXJOb2RlcyB0aGUgYXJyYXkgb2YgVHlwZVNjcmlwdCBwYXJhbWV0ZXIgbm9kZXMgZm9yIHRoaXMgY2xhc3MncyBjb25zdHJ1Y3Rvci5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgY29uc3RydWN0b3IgcGFyYW1ldGVyIGluZm8gb2JqZWN0cy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhcbiAgICAgIGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdKTogQ3RvclBhcmFtZXRlcltdIHtcbiAgICBjb25zdCB7Y29uc3RydWN0b3JQYXJhbUluZm99ID0gdGhpcy5hY3F1aXJlRGVjb3JhdG9ySW5mbyhjbGFzc1N5bWJvbCk7XG5cbiAgICByZXR1cm4gcGFyYW1ldGVyTm9kZXMubWFwKChub2RlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3Qge2RlY29yYXRvcnMsIHR5cGVFeHByZXNzaW9ufSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XSA/XG4gICAgICAgICAgY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdIDpcbiAgICAgICAgICB7ZGVjb3JhdG9yczogbnVsbCwgdHlwZUV4cHJlc3Npb246IG51bGx9O1xuICAgICAgY29uc3QgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBnZXROYW1lVGV4dChuYW1lTm9kZSksXG4gICAgICAgIG5hbWVOb2RlLFxuICAgICAgICB0eXBlVmFsdWVSZWZlcmVuY2U6IHR5cGVFeHByZXNzaW9uICE9PSBudWxsID9cbiAgICAgICAgICAgIHtsb2NhbDogdHJ1ZSBhcyB0cnVlLCBleHByZXNzaW9uOiB0eXBlRXhwcmVzc2lvbiwgZGVmYXVsdEltcG9ydFN0YXRlbWVudDogbnVsbH0gOlxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgdHlwZU5vZGU6IG51bGwsIGRlY29yYXRvcnNcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MsXG4gICAqIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgb24gYSBzdGF0aWMgcHJvcGVydHkgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgaW4gRVNNMjAxNSwgdGhlIHByb3BlcnR5IGlzIGRlZmluZWQgYW4gYXJyYXksIG9yIGJ5IGFuIGFycm93IGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhblxuICAgKiBhcnJheSwgb2YgZGVjb3JhdG9yIGFuZCB0eXBlIGluZm9ybWF0aW9uLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSxcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gICAqICAge3R5cGU6IFZpZXdDb250YWluZXJSZWZ9LFxuICAgKiAgIHt0eXBlOiBUZW1wbGF0ZVJlZn0sXG4gICAqICAge3R5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU5dfV19LFxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogb3JcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSBbXG4gICAqICAge3R5cGU6IFZpZXdDb250YWluZXJSZWZ9LFxuICAgKiAgIHt0eXBlOiBUZW1wbGF0ZVJlZn0sXG4gICAqICAge3R5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3t0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTl19XX0sXG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgdGhlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbURlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTogUGFyYW1JbmZvW118bnVsbCB7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGlmIChwYXJhbURlY29yYXRvcnMpIHtcbiAgICAgIC8vIFRoZSBkZWNvcmF0b3JzIGFycmF5IG1heSBiZSB3cmFwcGVkIGluIGFuIGFycm93IGZ1bmN0aW9uLiBJZiBzbyB1bndyYXAgaXQuXG4gICAgICBjb25zdCBjb250YWluZXIgPVxuICAgICAgICAgIHRzLmlzQXJyb3dGdW5jdGlvbihwYXJhbURlY29yYXRvcnMpID8gcGFyYW1EZWNvcmF0b3JzLmJvZHkgOiBwYXJhbURlY29yYXRvcnM7XG4gICAgICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGNvbnRhaW5lcikpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSBjb250YWluZXIuZWxlbWVudHM7XG4gICAgICAgIHJldHVybiBlbGVtZW50c1xuICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0+XG4gICAgICAgICAgICAgICAgICAgIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZWxlbWVudCkgPyByZWZsZWN0T2JqZWN0TGl0ZXJhbChlbGVtZW50KSA6IG51bGwpXG4gICAgICAgICAgICAubWFwKHBhcmFtSW5mbyA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHR5cGVFeHByZXNzaW9uID1cbiAgICAgICAgICAgICAgICAgIHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uaGFzKCd0eXBlJykgPyBwYXJhbUluZm8uZ2V0KCd0eXBlJykgISA6IG51bGw7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPVxuICAgICAgICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ2RlY29yYXRvcnMnKSA/IHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSAhIDogbnVsbDtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiZcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9ySW5mbylcbiAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgICAgICAgIHJldHVybiB7dHlwZUV4cHJlc3Npb24sIGRlY29yYXRvcnN9O1xuICAgICAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHBhcmFtRGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAnSW52YWxpZCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgZGVjb3JhdG9yIGluICcgK1xuICAgICAgICAgICAgICAgIHBhcmFtRGVjb3JhdG9ycy5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUgKyAnOlxcbicsXG4gICAgICAgICAgICBwYXJhbURlY29yYXRvcnMuZ2V0VGV4dCgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgZm9yIGNhbGxzIHRvIHRoZSBzcGVjaWZpZWQgaGVscGVyLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIGhlbHBlck5hbWUgdGhlIG5hbWUgb2YgdGhlIGhlbHBlciAoZS5nLiBgX19kZWNvcmF0ZWApIHdob3NlIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkXG4gICAqIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBDYWxsRXhwcmVzc2lvbiBub2RlcyBmb3IgZWFjaCBtYXRjaGluZyBoZWxwZXIgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIGhlbHBlck5hbWU6IHN0cmluZyk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbltdIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2wpXG4gICAgICAgIC5tYXAoc3RhdGVtZW50ID0+IHRoaXMuZ2V0SGVscGVyQ2FsbChzdGF0ZW1lbnQsIGhlbHBlck5hbWUpKVxuICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIHRoYXQgbWF5IGNvbnRhaW4gY2FsbHMgdG8gYSBoZWxwZXIuXG4gICAqXG4gICAqIEluIEVTTTIwMTUgY29kZSB0aGUgaGVscGVyIGNhbGxzIGFyZSBpbiB0aGUgdG9wIGxldmVsIG1vZHVsZSwgc28gd2UgaGF2ZSB0byBjb25zaWRlclxuICAgKiBhbGwgdGhlIHN0YXRlbWVudHMgaW4gdGhlIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIHN0YXRlbWVudHMgdGhhdCBtYXkgY29udGFpbiBoZWxwZXIgY2FsbHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0U3RhdGVtZW50c0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuc3RhdGVtZW50cyk7XG4gIH1cblxuICAvKipcbiAgICogVGVzdCB3aGV0aGVyIGEgZGVjb3JhdG9yIHdhcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYC5cbiAgICpcbiAgICogSXMgdGhlIGRlY29yYXRvcjpcbiAgICogKiBleHRlcm5hbGx5IGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgP1xuICAgKiAqIHRoZSBjdXJyZW50IGhvc3RlZCBwcm9ncmFtIGlzIGFjdHVhbGx5IGBAYW5ndWxhci9jb3JlYCBhbmRcbiAgICogICAtIHJlbGF0aXZlbHkgaW50ZXJuYWxseSBpbXBvcnRlZDsgb3JcbiAgICogICAtIG5vdCBpbXBvcnRlZCwgZnJvbSB0aGUgY3VycmVudCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yIHRoZSBkZWNvcmF0b3IgdG8gdGVzdC5cbiAgICovXG4gIHByb3RlY3RlZCBpc0Zyb21Db3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuaXNDb3JlKSB7XG4gICAgICByZXR1cm4gIWRlY29yYXRvci5pbXBvcnQgfHwgL15cXC4vLnRlc3QoZGVjb3JhdG9yLmltcG9ydC5mcm9tKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICEhZGVjb3JhdG9yLmltcG9ydCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCBhbGwgdGhlIGNsYXNzIGRlY2xhcmF0aW9ucyBmcm9tIHRoZSBkdHNUeXBpbmdzIHByb2dyYW0sIHN0b3JpbmcgdGhlbSBpbiBhIG1hcFxuICAgKiB3aGVyZSB0aGUga2V5IGlzIHRoZSBkZWNsYXJlZCBuYW1lIG9mIHRoZSBjbGFzcyBhbmQgdGhlIHZhbHVlIGlzIHRoZSBkZWNsYXJhdGlvbiBpdHNlbGYuXG4gICAqXG4gICAqIEl0IGlzIHBvc3NpYmxlIGZvciB0aGVyZSB0byBiZSBtdWx0aXBsZSBjbGFzcyBkZWNsYXJhdGlvbnMgd2l0aCB0aGUgc2FtZSBsb2NhbCBuYW1lLlxuICAgKiBPbmx5IHRoZSBmaXJzdCBkZWNsYXJhdGlvbiB3aXRoIGEgZ2l2ZW4gbmFtZSBpcyBhZGRlZCB0byB0aGUgbWFwOyBzdWJzZXF1ZW50IGNsYXNzZXMgd2lsbCBiZVxuICAgKiBpZ25vcmVkLlxuICAgKlxuICAgKiBXZSBhcmUgbW9zdCBpbnRlcmVzdGVkIGluIGNsYXNzZXMgdGhhdCBhcmUgcHVibGljbHkgZXhwb3J0ZWQgZnJvbSB0aGUgZW50cnkgcG9pbnQsIHNvIHRoZXNlXG4gICAqIGFyZSBhZGRlZCB0byB0aGUgbWFwIGZpcnN0LCB0byBlbnN1cmUgdGhhdCB0aGV5IGFyZSBub3QgaWdub3JlZC5cbiAgICpcbiAgICogQHBhcmFtIGR0c1Jvb3RGaWxlTmFtZSBUaGUgZmlsZW5hbWUgb2YgdGhlIGVudHJ5LXBvaW50IHRvIHRoZSBgZHRzVHlwaW5nc2AgcHJvZ3JhbS5cbiAgICogQHBhcmFtIGR0c1Byb2dyYW0gVGhlIHByb2dyYW0gY29udGFpbmluZyBhbGwgdGhlIHR5cGluZ3MgZmlsZXMuXG4gICAqIEByZXR1cm5zIGEgbWFwIG9mIGNsYXNzIG5hbWVzIHRvIGNsYXNzIGRlY2xhcmF0aW9ucy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRHRzRGVjbGFyYXRpb25NYXAoXG4gICAgICBkdHNSb290RmlsZU5hbWU6IEFic29sdXRlRnNQYXRoLCBkdHNQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgZHRzUGFja2FnZTogQWJzb2x1dGVGc1BhdGgpOiBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uTWFwID0gbmV3IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPigpO1xuICAgIGNvbnN0IGNoZWNrZXIgPSBkdHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICAvLyBGaXJzdCBhZGQgYWxsIHRoZSBjbGFzc2VzIHRoYXQgYXJlIHB1YmxpY2x5IGV4cG9ydGVkIGZyb20gdGhlIGVudHJ5LXBvaW50XG4gICAgY29uc3Qgcm9vdEZpbGUgPSBkdHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZHRzUm9vdEZpbGVOYW1lKTtcbiAgICBpZiAoIXJvb3RGaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBnaXZlbiBmaWxlICR7ZHRzUm9vdEZpbGVOYW1lfSBpcyBub3QgcGFydCBvZiB0aGUgdHlwaW5ncyBwcm9ncmFtLmApO1xuICAgIH1cbiAgICBjb2xsZWN0RXhwb3J0ZWREZWNsYXJhdGlvbnMoY2hlY2tlciwgZHRzRGVjbGFyYXRpb25NYXAsIHJvb3RGaWxlKTtcblxuICAgIC8vIE5vdyBhZGQgYW55IGFkZGl0aW9uYWwgY2xhc3NlcyB0aGF0IGFyZSBleHBvcnRlZCBmcm9tIGluZGl2aWR1YWwgIGR0cyBmaWxlcyxcbiAgICAvLyBidXQgYXJlIG5vdCBwdWJsaWNseSBleHBvcnRlZCBmcm9tIHRoZSBlbnRyeS1wb2ludC5cbiAgICBkdHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzb3VyY2VGaWxlID0+IHtcbiAgICAgIGlmICghaXNXaXRoaW5QYWNrYWdlKGR0c1BhY2thZ2UsIHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbGxlY3RFeHBvcnRlZERlY2xhcmF0aW9ucyhjaGVja2VyLCBkdHNEZWNsYXJhdGlvbk1hcCwgc291cmNlRmlsZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGR0c0RlY2xhcmF0aW9uTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGEgZnVuY3Rpb24vbWV0aG9kIG5vZGUgKG9yIGl0cyBpbXBsZW1lbnRhdGlvbiksIHRvIHNlZSBpZiBpdCByZXR1cm5zIGFcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnNgIG9iamVjdC5cbiAgICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgbm9kZSB0byBjaGVjayAtIHRoaXMgY291bGQgYmUgYSBmdW5jdGlvbiwgYSBtZXRob2Qgb3IgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICogQHBhcmFtIGltcGxlbWVudGF0aW9uIHRoZSBhY3R1YWwgZnVuY3Rpb24gZXhwcmVzc2lvbiBpZiBgbm9kZWAgaXMgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICogQHBhcmFtIGNvbnRhaW5lciB0aGUgY2xhc3MgdGhhdCBjb250YWlucyB0aGUgZnVuY3Rpb24sIGlmIGl0IGlzIGEgbWV0aG9kLlxuICAgKiBAcmV0dXJucyBpbmZvIGFib3V0IHRoZSBmdW5jdGlvbiBpZiBpdCBkb2VzIHJldHVybiBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3Q7IGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKFxuICAgICAgbmFtZTogc3RyaW5nLCBub2RlOiB0cy5Ob2RlfG51bGwsIGltcGxlbWVudGF0aW9uOiB0cy5Ob2RlfG51bGwgPSBub2RlLFxuICAgICAgY29udGFpbmVyOiB0cy5EZWNsYXJhdGlvbnxudWxsID0gbnVsbCk6IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbnxudWxsIHtcbiAgICBpZiAoaW1wbGVtZW50YXRpb24gPT09IG51bGwgfHxcbiAgICAgICAgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oaW1wbGVtZW50YXRpb24pICYmICF0cy5pc01ldGhvZERlY2xhcmF0aW9uKGltcGxlbWVudGF0aW9uKSAmJlxuICAgICAgICAgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGltcGxlbWVudGF0aW9uKSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGltcGxlbWVudGF0aW9uO1xuICAgIGNvbnN0IGRlZmluaXRpb24gPSB0aGlzLmdldERlZmluaXRpb25PZkZ1bmN0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGJvZHkgPSBkZWZpbml0aW9uLmJvZHk7XG4gICAgY29uc3QgbGFzdFN0YXRlbWVudCA9IGJvZHkgJiYgYm9keVtib2R5Lmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IHJldHVybkV4cHJlc3Npb24gPVxuICAgICAgICBsYXN0U3RhdGVtZW50ICYmIHRzLmlzUmV0dXJuU3RhdGVtZW50KGxhc3RTdGF0ZW1lbnQpICYmIGxhc3RTdGF0ZW1lbnQuZXhwcmVzc2lvbiB8fCBudWxsO1xuICAgIGNvbnN0IG5nTW9kdWxlUHJvcGVydHkgPSByZXR1cm5FeHByZXNzaW9uICYmIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocmV0dXJuRXhwcmVzc2lvbikgJiZcbiAgICAgICAgICAgIHJldHVybkV4cHJlc3Npb24ucHJvcGVydGllcy5maW5kKFxuICAgICAgICAgICAgICAgIHByb3AgPT5cbiAgICAgICAgICAgICAgICAgICAgISFwcm9wLm5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKHByb3AubmFtZSkgJiYgcHJvcC5uYW1lLnRleHQgPT09ICduZ01vZHVsZScpIHx8XG4gICAgICAgIG51bGw7XG5cbiAgICBpZiAoIW5nTW9kdWxlUHJvcGVydHkgfHwgIXRzLmlzUHJvcGVydHlBc3NpZ25tZW50KG5nTW9kdWxlUHJvcGVydHkpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBUaGUgbmdNb2R1bGVWYWx1ZSBjb3VsZCBiZSBvZiB0aGUgZm9ybSBgU29tZU1vZHVsZWAgb3IgYG5hbWVzcGFjZV8xLlNvbWVNb2R1bGVgXG4gICAgY29uc3QgbmdNb2R1bGVWYWx1ZSA9IG5nTW9kdWxlUHJvcGVydHkuaW5pdGlhbGl6ZXI7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIobmdNb2R1bGVWYWx1ZSkgJiYgIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5nTW9kdWxlVmFsdWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuZ01vZHVsZURlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihuZ01vZHVsZVZhbHVlKTtcbiAgICBpZiAoIW5nTW9kdWxlRGVjbGFyYXRpb24gfHwgbmdNb2R1bGVEZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENhbm5vdCBmaW5kIGEgZGVjbGFyYXRpb24gZm9yIE5nTW9kdWxlICR7bmdNb2R1bGVWYWx1ZS5nZXRUZXh0KCl9IHJlZmVyZW5jZWQgaW4gXCIke2RlY2xhcmF0aW9uIS5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG4gICAgaWYgKCFoYXNOYW1lSWRlbnRpZmllcihuZ01vZHVsZURlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICBuZ01vZHVsZTogbmdNb2R1bGVEZWNsYXJhdGlvbiBhcyBDb25jcmV0ZURlY2xhcmF0aW9uPENsYXNzRGVjbGFyYXRpb24+LCBkZWNsYXJhdGlvbiwgY29udGFpbmVyXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZXhwcmVzc2lvbik7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihleHByZXNzaW9uKSB8fCAhdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZURlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG4gICAgaWYgKCFuYW1lc3BhY2VEZWNsIHx8IG5hbWVzcGFjZURlY2wubm9kZSA9PT0gbnVsbCB8fCAhdHMuaXNTb3VyY2VGaWxlKG5hbWVzcGFjZURlY2wubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZUV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShuYW1lc3BhY2VEZWNsLm5vZGUpO1xuICAgIGlmIChuYW1lc3BhY2VFeHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW5hbWVzcGFjZUV4cG9ydHMuaGFzKGV4cHJlc3Npb24ubmFtZS50ZXh0KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwb3J0RGVjbCA9IG5hbWVzcGFjZUV4cG9ydHMuZ2V0KGV4cHJlc3Npb24ubmFtZS50ZXh0KSAhO1xuICAgIHJldHVybiB7Li4uZXhwb3J0RGVjbCwgdmlhTW9kdWxlOiBuYW1lc3BhY2VEZWNsLnZpYU1vZHVsZX07XG4gIH1cbn1cblxuLy8vLy8vLy8vLy8vLyBFeHBvcnRlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuZXhwb3J0IHR5cGUgUGFyYW1JbmZvID0ge1xuICBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSB8IG51bGwsXG4gIHR5cGVFeHByZXNzaW9uOiB0cy5FeHByZXNzaW9uIHwgbnVsbFxufTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2FsbCB0byBgdHNsaWIuX19tZXRhZGF0YWAgYXMgcHJlc2VudCBpbiBgdHNsaWIuX19kZWNvcmF0ZWAgY2FsbHMuIFRoaXMgaXMgYVxuICogc3ludGhldGljIGRlY29yYXRvciBpbnNlcnRlZCBieSBUeXBlU2NyaXB0IHRoYXQgY29udGFpbnMgcmVmbGVjdGlvbiBpbmZvcm1hdGlvbiBhYm91dCB0aGVcbiAqIHRhcmdldCBvZiB0aGUgZGVjb3JhdG9yLCBpLmUuIHRoZSBjbGFzcyBvciBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXJUeXBlcyB7XG4gIHR5cGU6ICdwYXJhbXMnO1xuICB0eXBlczogdHMuRXhwcmVzc2lvbltdO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjYWxsIHRvIGB0c2xpYi5fX3BhcmFtYCBhcyBwcmVzZW50IGluIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy4gVGhpcyBjb250YWluc1xuICogaW5mb3JtYXRpb24gb24gYW55IGRlY29yYXRvcnMgd2VyZSBhcHBsaWVkIHRvIGEgY2VydGFpbiBwYXJhbWV0ZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyRGVjb3JhdG9ycyB7XG4gIHR5cGU6ICdwYXJhbTpkZWNvcmF0b3JzJztcbiAgaW5kZXg6IG51bWJlcjtcbiAgZGVjb3JhdG9yOiBEZWNvcmF0b3I7XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNhbGwgdG8gYSBkZWNvcmF0b3IgYXMgaXQgd2FzIHByZXNlbnQgaW4gdGhlIG9yaWdpbmFsIHNvdXJjZSBjb2RlLCBhcyBwcmVzZW50IGluXG4gKiBgdHNsaWIuX19kZWNvcmF0ZWAgY2FsbHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVjb3JhdG9yQ2FsbCB7XG4gIHR5cGU6ICdkZWNvcmF0b3InO1xuICBkZWNvcmF0b3I6IERlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBkaWZmZXJlbnQga2luZHMgb2YgZGVjb3JhdGUgaGVscGVycyB0aGF0IG1heSBiZSBwcmVzZW50IGFzIGZpcnN0IGFyZ3VtZW50IHRvXG4gKiBgdHNsaWIuX19kZWNvcmF0ZWAsIGFzIGZvbGxvd3M6XG4gKlxuICogYGBgXG4gKiBfX2RlY29yYXRlKFtcbiAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICogICB0c2xpYl8xLl9fcGFyYW0oMiwgSW5qZWN0KElOSkVDVEVEX1RPS0VOKSksXG4gKiAgIHRzbGliXzEuX19tZXRhZGF0YShcImRlc2lnbjpwYXJhbXR5cGVzXCIsIFtWaWV3Q29udGFpbmVyUmVmLCBUZW1wbGF0ZVJlZiwgU3RyaW5nXSlcbiAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIERlY29yYXRlSGVscGVyRW50cnkgPSBQYXJhbWV0ZXJUeXBlcyB8IFBhcmFtZXRlckRlY29yYXRvcnMgfCBEZWNvcmF0b3JDYWxsO1xuXG4vKipcbiAqIFRoZSByZWNvcmRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gb2YgYSBzaW5nbGUgY2xhc3MuIFRoaXMgaW5mb3JtYXRpb24gaXMgY2FjaGVkIGluIHRoZSBob3N0LlxuICovXG5pbnRlcmZhY2UgRGVjb3JhdG9ySW5mbyB7XG4gIC8qKlxuICAgKiBBbGwgZGVjb3JhdG9ycyB0aGF0IHdlcmUgcHJlc2VudCBvbiB0aGUgY2xhc3MuIElmIG5vIGRlY29yYXRvcnMgd2VyZSBwcmVzZW50LCB0aGlzIGlzIGBudWxsYFxuICAgKi9cbiAgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsO1xuXG4gIC8qKlxuICAgKiBBbGwgZGVjb3JhdG9ycyBwZXIgbWVtYmVyIG9mIHRoZSBjbGFzcyB0aGV5IHdlcmUgcHJlc2VudCBvbi5cbiAgICovXG4gIG1lbWJlckRlY29yYXRvcnM6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPjtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVyIGluZm9ybWF0aW9uLCBzdWNoIGFzIHRoZSB0eXBlIG9mIGEgcGFyYW1ldGVyIGFuZCBhbGxcbiAgICogZGVjb3JhdG9ycyBmb3IgYSBjZXJ0YWluIHBhcmFtZXRlci4gSW5kaWNlcyBpbiB0aGlzIGFycmF5IGNvcnJlc3BvbmQgd2l0aCB0aGUgcGFyYW1ldGVyJ3MgaW5kZXhcbiAgICogaW4gdGhlIGNvbnN0cnVjdG9yLiBOb3RlIHRoYXQgdGhpcyBhcnJheSBtYXkgYmUgc3BhcnNlLCBpLmUuIGNlcnRhaW4gY29uc3RydWN0b3IgcGFyYW1ldGVycyBtYXlcbiAgICogbm90IGhhdmUgYW55IGluZm8gcmVjb3JkZWQuXG4gICAqL1xuICBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW107XG59XG5cbi8qKlxuICogQSBzdGF0ZW1lbnQgbm9kZSB0aGF0IHJlcHJlc2VudHMgYW4gYXNzaWdubWVudC5cbiAqL1xuZXhwb3J0IHR5cGUgQXNzaWdubWVudFN0YXRlbWVudCA9XG4gICAgdHMuRXhwcmVzc2lvblN0YXRlbWVudCAmIHtleHByZXNzaW9uOiB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259fTtcblxuLyoqXG4gKiBUZXN0IHdoZXRoZXIgYSBzdGF0ZW1lbnQgbm9kZSBpcyBhbiBhc3NpZ25tZW50IHN0YXRlbWVudC5cbiAqIEBwYXJhbSBzdGF0ZW1lbnQgdGhlIHN0YXRlbWVudCB0byB0ZXN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBc3NpZ25tZW50U3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogc3RhdGVtZW50IGlzIEFzc2lnbm1lbnRTdGF0ZW1lbnQge1xuICByZXR1cm4gdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNBc3NpZ25tZW50KHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBc3NpZ25tZW50KG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLkFzc2lnbm1lbnRFeHByZXNzaW9uPHRzLkVxdWFsc1Rva2VuPiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgbm9kZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW47XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgcHJvdmlkZWQgY2FsbCBleHByZXNzaW9uIHRhcmdldHMgYSBjbGFzcywgYnkgdmVyaWZ5aW5nIGl0cyBhcmd1bWVudHMgYXJlXG4gKiBhY2NvcmRpbmcgdG8gdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogX19kZWNvcmF0ZShbXSwgU29tZURpcmVjdGl2ZSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gY2FsbCB0aGUgY2FsbCBleHByZXNzaW9uIHRoYXQgaXMgdGVzdGVkIHRvIHJlcHJlc2VudCBhIGNsYXNzIGRlY29yYXRvciBjYWxsLlxuICogQHBhcmFtIGNsYXNzTmFtZSB0aGUgbmFtZSBvZiB0aGUgY2xhc3MgdGhhdCB0aGUgY2FsbCBuZWVkcyB0byBjb3JyZXNwb25kIHdpdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0NsYXNzRGVjb3JhdGVDYWxsKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uLCBjbGFzc05hbWU6IHN0cmluZyk6XG4gICAgY2FsbCBpcyB0cy5DYWxsRXhwcmVzc2lvbiZ7YXJndW1lbnRzOiBbdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgdHMuRXhwcmVzc2lvbl19IHtcbiAgY29uc3QgaGVscGVyQXJncyA9IGNhbGwuYXJndW1lbnRzWzBdO1xuICBpZiAoaGVscGVyQXJncyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oaGVscGVyQXJncykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCB0YXJnZXQgPSBjYWxsLmFyZ3VtZW50c1sxXTtcbiAgcmV0dXJuIHRhcmdldCAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpICYmIHRhcmdldC50ZXh0ID09PSBjbGFzc05hbWU7XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgcHJvdmlkZWQgY2FsbCBleHByZXNzaW9uIHRhcmdldHMgYSBtZW1iZXIgb2YgdGhlIGNsYXNzLCBieSB2ZXJpZnlpbmcgaXRzXG4gKiBhcmd1bWVudHMgYXJlIGFjY29yZGluZyB0byB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBfX2RlY29yYXRlKFtdLCBTb21lRGlyZWN0aXZlLnByb3RvdHlwZSwgXCJtZW1iZXJcIiwgdm9pZCAwKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBjYWxsIHRoZSBjYWxsIGV4cHJlc3Npb24gdGhhdCBpcyB0ZXN0ZWQgdG8gcmVwcmVzZW50IGEgbWVtYmVyIGRlY29yYXRvciBjYWxsLlxuICogQHBhcmFtIGNsYXNzTmFtZSB0aGUgbmFtZSBvZiB0aGUgY2xhc3MgdGhhdCB0aGUgY2FsbCBuZWVkcyB0byBjb3JyZXNwb25kIHdpdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01lbWJlckRlY29yYXRlQ2FsbChjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbiwgY2xhc3NOYW1lOiBzdHJpbmcpOlxuICAgIGNhbGwgaXMgdHMuQ2FsbEV4cHJlc3Npb24mXG4gICAge2FyZ3VtZW50czogW3RzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24sIHRzLlN0cmluZ0xpdGVyYWwsIHRzLlN0cmluZ0xpdGVyYWxdfSB7XG4gIGNvbnN0IGhlbHBlckFyZ3MgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgaWYgKGhlbHBlckFyZ3MgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGhlbHBlckFyZ3MpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgdGFyZ2V0ID0gY2FsbC5hcmd1bWVudHNbMV07XG4gIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24odGFyZ2V0KSB8fFxuICAgICAgIXRzLmlzSWRlbnRpZmllcih0YXJnZXQuZXhwcmVzc2lvbikgfHwgdGFyZ2V0LmV4cHJlc3Npb24udGV4dCAhPT0gY2xhc3NOYW1lIHx8XG4gICAgICB0YXJnZXQubmFtZS50ZXh0ICE9PSAncHJvdG90eXBlJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IG1lbWJlck5hbWUgPSBjYWxsLmFyZ3VtZW50c1syXTtcbiAgcmV0dXJuIG1lbWJlck5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc1N0cmluZ0xpdGVyYWwobWVtYmVyTmFtZSk7XG59XG5cbi8qKlxuICogSGVscGVyIG1ldGhvZCB0byBleHRyYWN0IHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGdpdmVuIHRoZSBwcm9wZXJ0eSdzIFwic3ltYm9sXCIsXG4gKiB3aGljaCBpcyBhY3R1YWxseSB0aGUgc3ltYm9sIG9mIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHByb3BTeW1ib2w6IHRzLlN5bWJvbCk6IHRzLkV4cHJlc3Npb258dW5kZWZpbmVkIHtcbiAgY29uc3QgcHJvcElkZW50aWZpZXIgPSBwcm9wU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gIGNvbnN0IHBhcmVudCA9IHByb3BJZGVudGlmaWVyICYmIHByb3BJZGVudGlmaWVyLnBhcmVudDtcbiAgcmV0dXJuIHBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24ocGFyZW50KSA/IHBhcmVudC5yaWdodCA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBBIGNhbGxlZSBjb3VsZCBiZSBvbmUgb2Y6IGBfX2RlY29yYXRlKC4uLilgIG9yIGB0c2xpYl8xLl9fZGVjb3JhdGVgLlxuICovXG5mdW5jdGlvbiBnZXRDYWxsZWVOYW1lKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKGNhbGwuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gc3RyaXBEb2xsYXJTdWZmaXgoY2FsbC5leHByZXNzaW9uLnRleHQpO1xuICB9XG4gIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIHN0cmlwRG9sbGFyU3VmZml4KGNhbGwuZXhwcmVzc2lvbi5uYW1lLnRleHQpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vLy8vLy8vLy8vLy8vIEludGVybmFsIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4vKipcbiAqIEluIEVTMjAxNSwgYSBjbGFzcyBtYXkgYmUgZGVjbGFyZWQgdXNpbmcgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAqIGBgYFxuICpcbiAqIEhlcmUsIHRoZSBpbnRlcm1lZGlhdGUgYE15Q2xhc3NfMWAgYXNzaWdubWVudCBpcyBvcHRpb25hbC4gSW4gdGhlIGFib3ZlIGV4YW1wbGUsIHRoZVxuICogYGNsYXNzIE15Q2xhc3Mge31gIGV4cHJlc3Npb24gaXMgcmV0dXJuZWQgYXMgZGVjbGFyYXRpb24gb2YgYHZhciBNeUNsYXNzYC4gSWYgdGhlIHZhcmlhYmxlXG4gKiBpcyBub3QgaW5pdGlhbGl6ZWQgdXNpbmcgYSBjbGFzcyBleHByZXNzaW9uLCBudWxsIGlzIHJldHVybmVkLlxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3Mgd2hvc2UgZGVjbGFyYXRpb24gd2UgYXJlIGZpbmRpbmcuXG4gKiBAcmV0dXJucyB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGNsYXNzIG9yIGBudWxsYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIuXG4gKi9cbmZ1bmN0aW9uIGdldElubmVyQ2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0V4cHJlc3Npb24+fG51bGwge1xuICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJlY29nbml6ZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb3JtIGB2YXIgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge31gIG9yXG4gIC8vIGB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307YFxuICBsZXQgZXhwcmVzc2lvbiA9IG5vZGUuaW5pdGlhbGl6ZXI7XG4gIHdoaWxlIChpc0Fzc2lnbm1lbnQoZXhwcmVzc2lvbikpIHtcbiAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5yaWdodDtcbiAgfVxuXG4gIGlmICghdHMuaXNDbGFzc0V4cHJlc3Npb24oZXhwcmVzc2lvbikgfHwgIWhhc05hbWVJZGVudGlmaWVyKGV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gZXhwcmVzc2lvbjtcbn1cblxuZnVuY3Rpb24gZ2V0RGVjb3JhdG9yQXJncyhub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb25bXSB7XG4gIC8vIFRoZSBhcmd1bWVudHMgb2YgYSBkZWNvcmF0b3IgYXJlIGhlbGQgaW4gdGhlIGBhcmdzYCBwcm9wZXJ0eSBvZiBpdHMgZGVjbGFyYXRpb24gb2JqZWN0LlxuICBjb25zdCBhcmdzUHJvcGVydHkgPSBub2RlLnByb3BlcnRpZXMuZmlsdGVyKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQocHJvcGVydHkgPT4gZ2V0TmFtZVRleHQocHJvcGVydHkubmFtZSkgPT09ICdhcmdzJyk7XG4gIGNvbnN0IGFyZ3NFeHByZXNzaW9uID0gYXJnc1Byb3BlcnR5ICYmIGFyZ3NQcm9wZXJ0eS5pbml0aWFsaXplcjtcbiAgcmV0dXJuIGFyZ3NFeHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihhcmdzRXhwcmVzc2lvbikgP1xuICAgICAgQXJyYXkuZnJvbShhcmdzRXhwcmVzc2lvbi5lbGVtZW50cykgOlxuICAgICAgW107XG59XG5cbmZ1bmN0aW9uIGlzUHJvcGVydHlBY2Nlc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uJlxuICAgIHtwYXJlbnQ6IHRzLkJpbmFyeUV4cHJlc3Npb259IHtcbiAgcmV0dXJuICEhbm9kZS5wYXJlbnQgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUucGFyZW50KSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKTtcbn1cblxuZnVuY3Rpb24gaXNUaGlzQXNzaWdubWVudChub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufSB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0KSAmJlxuICAgICAgbm9kZS5sZWZ0LmV4cHJlc3Npb24ua2luZCA9PT0gdHMuU3ludGF4S2luZC5UaGlzS2V5d29yZDtcbn1cblxuZnVuY3Rpb24gaXNOYW1lZERlY2xhcmF0aW9uKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5OYW1lZERlY2xhcmF0aW9uJlxuICAgIHtuYW1lOiB0cy5JZGVudGlmaWVyfSB7XG4gIGNvbnN0IGFueU5vZGU6IGFueSA9IG5vZGU7XG4gIHJldHVybiAhIWFueU5vZGUubmFtZSAmJiB0cy5pc0lkZW50aWZpZXIoYW55Tm9kZS5uYW1lKTtcbn1cblxuXG5mdW5jdGlvbiBpc0NsYXNzTWVtYmVyVHlwZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXMgdHMuQ2xhc3NFbGVtZW50fFxuICAgIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbnx0cy5CaW5hcnlFeHByZXNzaW9uIHtcbiAgcmV0dXJuIHRzLmlzQ2xhc3NFbGVtZW50KG5vZGUpIHx8IGlzUHJvcGVydHlBY2Nlc3Mobm9kZSkgfHwgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpO1xufVxuXG4vKipcbiAqIENvbGxlY3QgbWFwcGluZ3MgYmV0d2VlbiBleHBvcnRlZCBkZWNsYXJhdGlvbnMgaW4gYSBzb3VyY2UgZmlsZSBhbmQgaXRzIGFzc29jaWF0ZWRcbiAqIGRlY2xhcmF0aW9uIGluIHRoZSB0eXBpbmdzIHByb2dyYW0uXG4gKi9cbmZ1bmN0aW9uIGNvbGxlY3RFeHBvcnRlZERlY2xhcmF0aW9ucyhcbiAgICBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgZHRzRGVjbGFyYXRpb25NYXA6IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPixcbiAgICBzcmNGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gIGNvbnN0IHNyY01vZHVsZSA9IHNyY0ZpbGUgJiYgY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHNyY0ZpbGUpO1xuICBjb25zdCBtb2R1bGVFeHBvcnRzID0gc3JjTW9kdWxlICYmIGNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKHNyY01vZHVsZSk7XG4gIGlmIChtb2R1bGVFeHBvcnRzKSB7XG4gICAgbW9kdWxlRXhwb3J0cy5mb3JFYWNoKGV4cG9ydGVkU3ltYm9sID0+IHtcbiAgICAgIGlmIChleHBvcnRlZFN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgICAgIGV4cG9ydGVkU3ltYm9sID0gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKGV4cG9ydGVkU3ltYm9sKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gZXhwb3J0ZWRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZFN5bWJvbC5uYW1lO1xuICAgICAgaWYgKGRlY2xhcmF0aW9uICYmICFkdHNEZWNsYXJhdGlvbk1hcC5oYXMobmFtZSkpIHtcbiAgICAgICAgZHRzRGVjbGFyYXRpb25NYXAuc2V0KG5hbWUsIGRlY2xhcmF0aW9uKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gaXMgYXNzaWduZWQgdG8uXG4gKiBGb3IgZXhhbXBsZSwgZm9yIHRoZSBmb2xsb3dpbmcgY29kZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAqIGBgYFxuICpcbiAqIGFuZCB0aGUgcHJvdmlkZWQgZGVjbGFyYXRpb24gYmVpbmcgYGNsYXNzIE15Q2xhc3Mge31gLCB0aGlzIHdpbGwgcmV0dXJuIHRoZSBgdmFyIE15Q2xhc3NgXG4gKiBkZWNsYXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIGRlY2xhcmF0aW9uIGZvciB3aGljaCBhbnkgdmFyaWFibGUgZGVjbGFyYXRpb24gc2hvdWxkIGJlIG9idGFpbmVkLlxuICogQHJldHVybnMgdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGlmIGZvdW5kLCB1bmRlZmluZWQgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBnZXRWYXJpYWJsZURlY2xhcmF0aW9uT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9ufFxuICAgIHVuZGVmaW5lZCB7XG4gIGxldCBub2RlID0gZGVjbGFyYXRpb24ucGFyZW50O1xuXG4gIC8vIERldGVjdCBhbiBpbnRlcm1lZGlhcnkgdmFyaWFibGUgYXNzaWdubWVudCBhbmQgc2tpcCBvdmVyIGl0LlxuICBpZiAoaXNBc3NpZ25tZW50KG5vZGUpICYmIHRzLmlzSWRlbnRpZmllcihub2RlLmxlZnQpKSB7XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG5cbiAgcmV0dXJuIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSA/IG5vZGUgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBtYXkgaGF2ZSBiZWVuIFwic3ludGhlc2l6ZWRcIiBieSBUeXBlU2NyaXB0IGR1cmluZyBKYXZhU2NyaXB0IGVtaXQsXG4gKiBpbiB0aGUgY2FzZSBubyB1c2VyLWRlZmluZWQgY29uc3RydWN0b3IgZXhpc3RzIGFuZCBlLmcuIHByb3BlcnR5IGluaXRpYWxpemVycyBhcmUgdXNlZC5cbiAqIFRob3NlIGluaXRpYWxpemVycyBuZWVkIHRvIGJlIGVtaXR0ZWQgaW50byBhIGNvbnN0cnVjdG9yIGluIEphdmFTY3JpcHQsIHNvIHRoZSBUeXBlU2NyaXB0XG4gKiBjb21waWxlciBnZW5lcmF0ZXMgYSBzeW50aGV0aWMgY29uc3RydWN0b3IuXG4gKlxuICogV2UgbmVlZCB0byBpZGVudGlmeSBzdWNoIGNvbnN0cnVjdG9ycyBhcyBuZ2NjIG5lZWRzIHRvIGJlIGFibGUgdG8gdGVsbCBpZiBhIGNsYXNzIGRpZFxuICogb3JpZ2luYWxseSBoYXZlIGEgY29uc3RydWN0b3IgaW4gdGhlIFR5cGVTY3JpcHQgc291cmNlLiBXaGVuIGEgY2xhc3MgaGFzIGEgc3VwZXJjbGFzcyxcbiAqIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IgbXVzdCBub3QgYmUgY29uc2lkZXJlZCBhcyBhIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBhcyB0aGF0XG4gKiBwcmV2ZW50cyBhIGJhc2UgZmFjdG9yeSBjYWxsIGZyb20gYmVpbmcgY3JlYXRlZCBieSBuZ3RzYywgcmVzdWx0aW5nIGluIGEgZmFjdG9yeSBmdW5jdGlvblxuICogdGhhdCBkb2VzIG5vdCBpbmplY3QgdGhlIGRlcGVuZGVuY2llcyBvZiB0aGUgc3VwZXJjbGFzcy4gSGVuY2UsIHdlIGlkZW50aWZ5IGEgZGVmYXVsdFxuICogc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBpbiB0aGUgY29uc3RydWN0b3IgYm9keSwgYWNjb3JkaW5nIHRvIHRoZSBzdHJ1Y3R1cmUgdGhhdCBUeXBlU2NyaXB0XG4gKiBlbWl0cyBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0OlxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvdHMudHMjTDEwNjgtTDEwODJcbiAqXG4gKiBAcGFyYW0gY29uc3RydWN0b3IgYSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0byB0ZXN0XG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBjb25zdHJ1Y3RvciBhcHBlYXJzIHRvIGhhdmUgYmVlbiBzeW50aGVzaXplZFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3I6IHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgaWYgKCFjb25zdHJ1Y3Rvci5ib2R5KSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgZmlyc3RTdGF0ZW1lbnQgPSBjb25zdHJ1Y3Rvci5ib2R5LnN0YXRlbWVudHNbMF07XG4gIGlmICghZmlyc3RTdGF0ZW1lbnQgfHwgIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChmaXJzdFN0YXRlbWVudCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTeW50aGVzaXplZFN1cGVyQ2FsbChmaXJzdFN0YXRlbWVudC5leHByZXNzaW9uKTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkIGJ5IFR5cGVTY3JpcHQsIGkuZS4gd2hldGhlclxuICogaXQgaXMgb2YgdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIHRoZSBleHByZXNzaW9uIHRoYXQgaXMgdG8gYmUgdGVzdGVkXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGFwcGVhcnMgdG8gYmUgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRTdXBlckNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHJldHVybiBmYWxzZTtcbiAgaWYgKGV4cHJlc3Npb24uZXhwcmVzc2lvbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLlN1cGVyS2V5d29yZCkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgYXJndW1lbnQgPSBleHByZXNzaW9uLmFyZ3VtZW50c1swXTtcbiAgcmV0dXJuIHRzLmlzU3ByZWFkRWxlbWVudChhcmd1bWVudCkgJiYgdHMuaXNJZGVudGlmaWVyKGFyZ3VtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICBhcmd1bWVudC5leHByZXNzaW9uLnRleHQgPT09ICdhcmd1bWVudHMnO1xufVxuIl19