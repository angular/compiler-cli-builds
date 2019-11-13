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
            var helperCalls = this.getHelperCallsForClass(classSymbol, ['__decorate']);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUdqQyx5RUFBZ087SUFDaE8scUVBQWlEO0lBR2pELDhEQUErRjtJQUUvRiwyRUFBeUw7SUFFNUssUUFBQSxVQUFVLEdBQUcsWUFBMkIsQ0FBQztJQUN6QyxRQUFBLGVBQWUsR0FBRyxnQkFBK0IsQ0FBQztJQUNsRCxRQUFBLFdBQVcsR0FBRyxlQUE4QixDQUFDO0lBQzdDLFFBQUEsa0JBQWtCLEdBQUcsZ0JBQStCLENBQUM7SUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BMEJHO0lBQ0g7UUFBMkMsaURBQXdCO1FBaUNqRSwrQkFDYyxNQUFjLEVBQVksTUFBZSxFQUFFLE9BQXVCLEVBQzVFLEdBQXdCO1lBRjVCLFlBR0Usa0JBQU0sT0FBTyxDQUFDLFNBR2Y7WUFMYSxZQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVksWUFBTSxHQUFOLE1BQU0sQ0FBUztZQS9CdkQ7O2VBRUc7WUFDTyw2QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUU3RDs7Ozs7Ozs7Ozs7Ozs7ZUFjRztZQUNPLDhCQUF3QixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1lBRTlFOzs7OztlQUtHO1lBQ08sb0JBQWMsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQU1wRSxLQUFJLENBQUMsaUJBQWlCO2dCQUNsQixHQUFHLElBQUksS0FBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDOztRQUN2RixDQUFDO1FBRUQ7Ozs7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RUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFDNUUsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFcEQsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6QyxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1lBQ3ZFLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQztJQUMvQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUyxzQkFBc0IsQ0FBQyxJQUFhO1FBQzNDLE9BQU8sSUFBSSxFQUFFO1lBQ1gsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xDLE1BQU07YUFDUDtZQUNELElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1NBQ3BCO1FBQ0QsT0FBTyxJQUFJLElBQUksSUFBSSxDQUFDO0lBQ3RCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBDb25jcmV0ZURlY2xhcmF0aW9uLCBDdG9yUGFyYW1ldGVyLCBEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QsIGlzRGVjb3JhdG9ySWRlbnRpZmllciwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7aXNXaXRoaW5QYWNrYWdlfSBmcm9tICcuLi9hbmFseXNpcy91dGlsJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0J1bmRsZVByb2dyYW19IGZyb20gJy4uL3BhY2thZ2VzL2J1bmRsZV9wcm9ncmFtJztcbmltcG9ydCB7ZmluZEFsbCwgZ2V0TmFtZVRleHQsIGhhc05hbWVJZGVudGlmaWVyLCBpc0RlZmluZWQsIHN0cmlwRG9sbGFyU3VmZml4fSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7Q2xhc3NTeW1ib2wsIE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbiwgTmdjY0NsYXNzU3ltYm9sLCBOZ2NjUmVmbGVjdGlvbkhvc3QsIFBSRV9SM19NQVJLRVIsIFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9ufSBmcm9tICcuL25nY2NfaG9zdCc7XG5cbmV4cG9ydCBjb25zdCBERUNPUkFUT1JTID0gJ2RlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IFBST1BfREVDT1JBVE9SUyA9ICdwcm9wRGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1IgPSAnX19jb25zdHJ1Y3RvcicgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgQ09OU1RSVUNUT1JfUEFSQU1TID0gJ2N0b3JQYXJhbWV0ZXJzJyBhcyB0cy5fX1N0cmluZztcblxuLyoqXG4gKiBFc20yMDE1IHBhY2thZ2VzIGNvbnRhaW4gRUNNQVNjcmlwdCAyMDE1IGNsYXNzZXMsIGV0Yy5cbiAqIERlY29yYXRvcnMgYXJlIGRlZmluZWQgdmlhIHN0YXRpYyBwcm9wZXJ0aWVzIG9uIHRoZSBjbGFzcy4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBjbGFzcyBTb21lRGlyZWN0aXZlIHtcbiAqIH1cbiAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gKiBdO1xuICogU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9ycyA9IHtcbiAqICAgXCJpbnB1dDFcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogICBcImlucHV0MlwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiB9O1xuICogYGBgXG4gKlxuICogKiBDbGFzc2VzIGFyZSBkZWNvcmF0ZWQgaWYgdGhleSBoYXZlIGEgc3RhdGljIHByb3BlcnR5IGNhbGxlZCBgZGVjb3JhdG9yc2AuXG4gKiAqIE1lbWJlcnMgYXJlIGRlY29yYXRlZCBpZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGtleSBvbiBhIHN0YXRpYyBwcm9wZXJ0eVxuICogICBjYWxsZWQgYHByb3BEZWNvcmF0b3JzYC5cbiAqICogQ29uc3RydWN0b3IgcGFyYW1ldGVycyBkZWNvcmF0b3JzIGFyZSBmb3VuZCBvbiBhbiBvYmplY3QgcmV0dXJuZWQgZnJvbVxuICogICBhIHN0YXRpYyBtZXRob2QgY2FsbGVkIGBjdG9yUGFyYW1ldGVyc2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICBwcm90ZWN0ZWQgZHRzRGVjbGFyYXRpb25NYXA6IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPnxudWxsO1xuXG4gIC8qKlxuICAgKiBUaGUgc2V0IG9mIHNvdXJjZSBmaWxlcyB0aGF0IGhhdmUgYWxyZWFkeSBiZWVuIHByZXByb2Nlc3NlZC5cbiAgICovXG4gIHByb3RlY3RlZCBwcmVwcm9jZXNzZWRTb3VyY2VGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcblxuICAvKipcbiAgICogSW4gRVMyMDE1LCBjbGFzcyBkZWNsYXJhdGlvbnMgbWF5IGhhdmUgYmVlbiBkb3duLWxldmVsZWQgaW50byB2YXJpYWJsZSBkZWNsYXJhdGlvbnMsXG4gICAqIGluaXRpYWxpemVkIHVzaW5nIGEgY2xhc3MgZXhwcmVzc2lvbi4gSW4gY2VydGFpbiBzY2VuYXJpb3MsIGFuIGFkZGl0aW9uYWwgdmFyaWFibGVcbiAgICogaXMgaW50cm9kdWNlZCB0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzIHNvIHRoYXQgcmVzdWx0cyBpbiBjb2RlIHN1Y2ggYXM6XG4gICAqXG4gICAqIGBgYFxuICAgKiBsZXQgTXlDbGFzc18xOyBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1hcCB0cmFja3MgdGhvc2UgYWxpYXNlZCB2YXJpYWJsZXMgdG8gdGhlaXIgb3JpZ2luYWwgaWRlbnRpZmllciwgaS5lLiB0aGUga2V5XG4gICAqIGNvcnJlc3BvbmRzIHdpdGggdGhlIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzXzFgIGFuZCBpdHMgdmFsdWUgYmVjb21lcyB0aGUgYE15Q2xhc3NgIGlkZW50aWZpZXJcbiAgICogb2YgdGhlIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBUaGlzIG1hcCBpcyBwb3B1bGF0ZWQgZHVyaW5nIHRoZSBwcmVwcm9jZXNzaW5nIG9mIGVhY2ggc291cmNlIGZpbGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgdHMuSWRlbnRpZmllcj4oKTtcblxuICAvKipcbiAgICogQ2FjaGVzIHRoZSBpbmZvcm1hdGlvbiBvZiB0aGUgZGVjb3JhdG9ycyBvbiBhIGNsYXNzLCBhcyB0aGUgd29yayBpbnZvbHZlZCB3aXRoIGV4dHJhY3RpbmdcbiAgICogZGVjb3JhdG9ycyBpcyBjb21wbGV4IGFuZCBmcmVxdWVudGx5IHVzZWQuXG4gICAqXG4gICAqIFRoaXMgbWFwIGlzIGxhemlseSBwb3B1bGF0ZWQgZHVyaW5nIHRoZSBmaXJzdCBjYWxsIHRvIGBhY3F1aXJlRGVjb3JhdG9ySW5mb2AgZm9yIGEgZ2l2ZW4gY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZGVjb3JhdG9yQ2FjaGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvckluZm8+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgbG9nZ2VyOiBMb2dnZXIsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgZHRzPzogQnVuZGxlUHJvZ3JhbXxudWxsKSB7XG4gICAgc3VwZXIoY2hlY2tlcik7XG4gICAgdGhpcy5kdHNEZWNsYXJhdGlvbk1hcCA9XG4gICAgICAgIGR0cyAmJiB0aGlzLmNvbXB1dGVEdHNEZWNsYXJhdGlvbk1hcChkdHMucGF0aCwgZHRzLnByb2dyYW0sIGR0cy5wYWNrYWdlKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIENsYXNzZXMgc2hvdWxkIGhhdmUgYSBgbmFtZWAgaWRlbnRpZmllciwgYmVjYXVzZSB0aGV5IG1heSBuZWVkIHRvIGJlIHJlZmVyZW5jZWQgaW4gb3RoZXIgcGFydHNcbiAgICogb2YgdGhlIHByb2dyYW0uXG4gICAqXG4gICAqIEluIEVTMjAxNSwgYSBjbGFzcyBtYXkgYmUgZGVjbGFyZWQgdXNpbmcgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIEhlcmUsIHRoZSBpbnRlcm1lZGlhdGUgYE15Q2xhc3NfMWAgYXNzaWdubWVudCBpcyBvcHRpb25hbC4gSW4gdGhlIGFib3ZlIGV4YW1wbGUsIHRoZVxuICAgKiBgY2xhc3MgTXlDbGFzcyB7fWAgbm9kZSBpcyByZXR1cm5lZCBhcyBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc2AuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiB0aGUgZGVjbGFyYXRpb24gbm9kZSB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIiBvciBoYXMgbm8gc3ltYm9sLlxuICAgKi9cbiAgZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sRnJvbU91dGVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHN5bWJvbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRDbGFzc1N5bWJvbEZyb21Jbm5lckRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiBFUzIwMTUsIGEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIHVzaW5nIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG4gICAqXG4gICAqIGBgYFxuICAgKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBleHRyYWN0cyB0aGUgYE5nY2NDbGFzc1N5bWJvbGAgZm9yIGBNeUNsYXNzYCB3aGVuIHByb3ZpZGVkIHdpdGggdGhlIGB2YXIgTXlDbGFzc2BcbiAgICogZGVjbGFyYXRpb24gbm9kZS4gV2hlbiB0aGUgYGNsYXNzIE15Q2xhc3Mge31gIG5vZGUgb3IgYW55IG90aGVyIG5vZGUgaXMgZ2l2ZW4sIHRoaXMgbWV0aG9kIHdpbGxcbiAgICogcmV0dXJuIHVuZGVmaW5lZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gdGhlIGRlY2xhcmF0aW9uIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgZG9lcyBub3QgcmVwcmVzZW50IGFuIG91dGVyIGRlY2xhcmF0aW9uXG4gICAqIG9mIGEgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NTeW1ib2xGcm9tT3V0ZXJEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuTm9kZSk6IE5nY2NDbGFzc1N5bWJvbHx1bmRlZmluZWQge1xuICAgIC8vIENyZWF0ZSBhIHN5bWJvbCB3aXRob3V0IGlubmVyIGRlY2xhcmF0aW9uIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyBhIHJlZ3VsYXIgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5jcmVhdGVDbGFzc1N5bWJvbChkZWNsYXJhdGlvbiwgbnVsbCk7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCB0aGUgZGVjbGFyYXRpb24gbWF5IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sIGluIHdoaWNoIGNhc2UgaXQgbXVzdCBiZVxuICAgIC8vIGluaXRpYWxpemVkIHVzaW5nIGEgY2xhc3MgZXhwcmVzc2lvbiBhcyBpbm5lciBkZWNsYXJhdGlvbi5cbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSAmJiBoYXNOYW1lSWRlbnRpZmllcihkZWNsYXJhdGlvbikpIHtcbiAgICAgIGNvbnN0IGlubmVyRGVjbGFyYXRpb24gPSBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgICAgaWYgKGlubmVyRGVjbGFyYXRpb24gIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2woZGVjbGFyYXRpb24sIGlubmVyRGVjbGFyYXRpb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogSW4gRVMyMDE1LCBhIGNsYXNzIG1heSBiZSBkZWNsYXJlZCB1c2luZyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxuICAgKlxuICAgKiBgYGBcbiAgICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBtZXRob2QgZXh0cmFjdHMgdGhlIGBOZ2NjQ2xhc3NTeW1ib2xgIGZvciBgTXlDbGFzc2Agd2hlbiBwcm92aWRlZCB3aXRoIHRoZVxuICAgKiBgY2xhc3MgTXlDbGFzcyB7fWAgZGVjbGFyYXRpb24gbm9kZS4gV2hlbiB0aGUgYHZhciBNeUNsYXNzYCBub2RlIG9yIGFueSBvdGhlciBub2RlIGlzIGdpdmVuLFxuICAgKiB0aGlzIG1ldGhvZCB3aWxsIHJldHVybiB1bmRlZmluZWQgaW5zdGVhZC5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIHRoZSBkZWNsYXJhdGlvbiB3aG9zZSBzeW1ib2wgd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgZm9yIHRoZSBub2RlIG9yIGB1bmRlZmluZWRgIGlmIGl0IGRvZXMgbm90IHJlcHJlc2VudCBhbiBpbm5lciBkZWNsYXJhdGlvblxuICAgKiBvZiBhIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzU3ltYm9sRnJvbUlubmVyRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLk5vZGUpOiBOZ2NjQ2xhc3NTeW1ib2x8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NFeHByZXNzaW9uKGRlY2xhcmF0aW9uKSB8fCAhaGFzTmFtZUlkZW50aWZpZXIoZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IG91dGVyRGVjbGFyYXRpb24gPSBnZXRWYXJpYWJsZURlY2xhcmF0aW9uT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgaWYgKG91dGVyRGVjbGFyYXRpb24gPT09IHVuZGVmaW5lZCB8fCAhaGFzTmFtZUlkZW50aWZpZXIob3V0ZXJEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlQ2xhc3NTeW1ib2wob3V0ZXJEZWNsYXJhdGlvbiwgZGVjbGFyYXRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gYE5nY2NDbGFzc1N5bWJvbGAgZnJvbSBhbiBvdXRlciBhbmQgaW5uZXIgZGVjbGFyYXRpb24uIElmIGEgY2xhc3Mgb25seSBoYXMgYW4gb3V0ZXJcbiAgICogZGVjbGFyYXRpb24sIHRoZSBcImltcGxlbWVudGF0aW9uXCIgc3ltYm9sIG9mIHRoZSBjcmVhdGVkIGBOZ2NjQ2xhc3NTeW1ib2xgIHdpbGwgYmUgc2V0IGVxdWFsIHRvXG4gICAqIHRoZSBcImRlY2xhcmF0aW9uXCIgc3ltYm9sLlxuICAgKlxuICAgKiBAcGFyYW0gb3V0ZXJEZWNsYXJhdGlvbiBUaGUgb3V0ZXIgZGVjbGFyYXRpb24gbm9kZSBvZiB0aGUgY2xhc3MuXG4gICAqIEBwYXJhbSBpbm5lckRlY2xhcmF0aW9uIFRoZSBpbm5lciBkZWNsYXJhdGlvbiBub2RlIG9mIHRoZSBjbGFzcywgb3IgdW5kZWZpbmVkIGlmIG5vIGlubmVyXG4gICAqIGRlY2xhcmF0aW9uIGlzIHByZXNlbnQuXG4gICAqIEByZXR1cm5zIHRoZSBgTmdjY0NsYXNzU3ltYm9sYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzLCBvciB1bmRlZmluZWQgaWYgYSBgdHMuU3ltYm9sYCBmb3IgYW55IG9mXG4gICAqIHRoZSBkZWNsYXJhdGlvbnMgY291bGQgbm90IGJlIHJlc29sdmVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNyZWF0ZUNsYXNzU3ltYm9sKFxuICAgICAgb3V0ZXJEZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbiwgaW5uZXJEZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbnxudWxsKTogTmdjY0NsYXNzU3ltYm9sXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvblN5bWJvbCA9XG4gICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKG91dGVyRGVjbGFyYXRpb24ubmFtZSkgYXMgQ2xhc3NTeW1ib2wgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGRlY2xhcmF0aW9uU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wbGVtZW50YXRpb25TeW1ib2wgPSBpbm5lckRlY2xhcmF0aW9uICE9PSBudWxsID9cbiAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oaW5uZXJEZWNsYXJhdGlvbi5uYW1lKSA6XG4gICAgICAgIGRlY2xhcmF0aW9uU3ltYm9sO1xuICAgIGlmIChpbXBsZW1lbnRhdGlvblN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBkZWNsYXJhdGlvblN5bWJvbC5uYW1lLFxuICAgICAgZGVjbGFyYXRpb246IGRlY2xhcmF0aW9uU3ltYm9sLFxuICAgICAgaW1wbGVtZW50YXRpb246IGltcGxlbWVudGF0aW9uU3ltYm9sLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIChmb3IgZXhhbXBsZSwgb2YgYSBjbGFzcyBvciBmdW5jdGlvbikgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBhbnlcbiAgICogZGVjb3JhdG9ycyBwcmVzZW50IG9uIHRoZSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIGEgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gIG5vZGUgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvciBmdW5jdGlvbiBvdmVyXG4gICAqIHdoaWNoIHRvIHJlZmxlY3QuIEZvciBleGFtcGxlLCBpZiB0aGUgaW50ZW50IGlzIHRvIHJlZmxlY3QgdGhlIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBhbmQgdGhlXG4gICAqIHNvdXJjZSBpcyBpbiBFUzYgZm9ybWF0LCB0aGlzIHdpbGwgYmUgYSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgbm9kZS4gSWYgdGhlIHNvdXJjZSBpcyBpbiBFUzVcbiAgICogZm9ybWF0LCB0aGlzIG1pZ2h0IGJlIGEgYHRzLlZhcmlhYmxlRGVjbGFyYXRpb25gIGFzIGNsYXNzZXMgaW4gRVM1IGFyZSByZXByZXNlbnRlZCBhcyB0aGVcbiAgICogcmVzdWx0IG9mIGFuIElJRkUgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgRGVjb3JhdG9yYCBtZXRhZGF0YSBpZiBkZWNvcmF0b3JzIGFyZSBwcmVzZW50IG9uIHRoZSBkZWNsYXJhdGlvbiwgb3JcbiAgICogYG51bGxgIGlmIGVpdGhlciBubyBkZWNvcmF0b3JzIHdlcmUgcHJlc2VudCBvciBpZiB0aGUgZGVjbGFyYXRpb24gaXMgbm90IG9mIGEgZGVjb3JhdGFibGUgdHlwZS5cbiAgICovXG4gIGdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pO1xuICAgIGlmICghc3ltYm9sKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBdHRlbXB0ZWQgdG8gZ2V0IG1lbWJlcnMgb2YgYSBub24tY2xhc3M6IFwiJHtjbGF6ei5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRNZW1iZXJzT2ZTeW1ib2woY2xhc3NTeW1ib2wpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGl0cyBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBvbmx5IGxvb2tzIGF0IHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGRpcmVjdGx5IGFuZCBub3QgYXQgYW55IGluaGVyaXRlZFxuICAgKiBjb25zdHJ1Y3RvcnMuXG4gICAqXG4gICAqIEBwYXJhbSBjbGF6eiBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYFBhcmFtZXRlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjb25zdHJ1Y3RvciwgaWZcbiAgICogYSBjb25zdHJ1Y3RvciBleGlzdHMuIElmIHRoZSBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGhhcyAwIHBhcmFtZXRlcnMsIHRoaXMgYXJyYXkgd2lsbCBiZSBlbXB0eS5cbiAgICogSWYgdGhlIGNsYXNzIGhhcyBubyBjb25zdHJ1Y3RvciwgdGhpcyBtZXRob2QgcmV0dXJucyBgbnVsbGAuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byBnZXQgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICBjb25zdCBwYXJhbWV0ZXJOb2RlcyA9IHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2wpO1xuICAgIGlmIChwYXJhbWV0ZXJOb2Rlcykge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oY2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBoYXNCYXNlQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBjb25zdCBzdXBlckhhc0Jhc2VDbGFzcyA9IHN1cGVyLmhhc0Jhc2VDbGFzcyhjbGF6eik7XG4gICAgaWYgKHN1cGVySGFzQmFzZUNsYXNzKSB7XG4gICAgICByZXR1cm4gc3VwZXJIYXNCYXNlQ2xhc3M7XG4gICAgfVxuXG4gICAgY29uc3QgaW5uZXJDbGFzc0RlY2xhcmF0aW9uID0gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoaW5uZXJDbGFzc0RlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1cGVyLmhhc0Jhc2VDbGFzcyhpbm5lckNsYXNzRGVjbGFyYXRpb24pO1xuICB9XG5cbiAgZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gRmlyc3QgdHJ5IGdldHRpbmcgdGhlIGJhc2UgY2xhc3MgZnJvbSB0aGUgXCJvdXRlclwiIGRlY2xhcmF0aW9uXG4gICAgY29uc3Qgc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyID0gc3VwZXIuZ2V0QmFzZUNsYXNzRXhwcmVzc2lvbihjbGF6eik7XG4gICAgaWYgKHN1cGVyQmFzZUNsYXNzSWRlbnRpZmllcikge1xuICAgICAgcmV0dXJuIHN1cGVyQmFzZUNsYXNzSWRlbnRpZmllcjtcbiAgICB9XG4gICAgLy8gVGhhdCBkaWRuJ3Qgd29yayBzbyBub3cgdHJ5IGdldHRpbmcgaXQgZnJvbSB0aGUgXCJpbm5lclwiIGRlY2xhcmF0aW9uLlxuICAgIGNvbnN0IGlubmVyQ2xhc3NEZWNsYXJhdGlvbiA9IGdldElubmVyQ2xhc3NEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKGlubmVyQ2xhc3NEZWNsYXJhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGlubmVyQ2xhc3NEZWNsYXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gbm9kZSBhY3R1YWxseSByZXByZXNlbnRzIGEgY2xhc3MuXG4gICAqL1xuICBpc0NsYXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIENsYXNzRGVjbGFyYXRpb24ge1xuICAgIHJldHVybiBzdXBlci5pc0NsYXNzKG5vZGUpIHx8IHRoaXMuZ2V0Q2xhc3NTeW1ib2wobm9kZSkgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFjZSBhbiBpZGVudGlmaWVyIHRvIGl0cyBkZWNsYXJhdGlvbiwgaWYgcG9zc2libGUuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGF0dGVtcHRzIHRvIHJlc29sdmUgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBnaXZlbiBpZGVudGlmaWVyLCB0cmFjaW5nIGJhY2sgdGhyb3VnaFxuICAgKiBpbXBvcnRzIGFuZCByZS1leHBvcnRzIHVudGlsIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQgaXMgZm91bmQuIEEgYERlY2xhcmF0aW9uYFxuICAgKiBvYmplY3QgaXMgcmV0dXJuZWQgaWYgdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIGlzIGZvdW5kLCBvciBgbnVsbGAgaXMgcmV0dXJuZWQgb3RoZXJ3aXNlLlxuICAgKlxuICAgKiBJbiBFUzIwMTUsIHdlIG5lZWQgdG8gYWNjb3VudCBmb3IgaWRlbnRpZmllcnMgdGhhdCByZWZlciB0byBhbGlhc2VkIGNsYXNzIGRlY2xhcmF0aW9ucyBzdWNoIGFzXG4gICAqIGBNeUNsYXNzXzFgLiBTaW5jZSBzdWNoIGRlY2xhcmF0aW9ucyBhcmUgb25seSBhdmFpbGFibGUgd2l0aGluIHRoZSBtb2R1bGUgaXRzZWxmLCB3ZSBuZWVkIHRvXG4gICAqIGZpbmQgdGhlIG9yaWdpbmFsIGNsYXNzIGRlY2xhcmF0aW9uLCBlLmcuIGBNeUNsYXNzYCwgdGhhdCBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGFsaWFzZWQgb25lLlxuICAgKlxuICAgKiBAcGFyYW0gaWQgYSBUeXBlU2NyaXB0IGB0cy5JZGVudGlmaWVyYCB0byB0cmFjZSBiYWNrIHRvIGEgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIG1ldGFkYXRhIGFib3V0IHRoZSBgRGVjbGFyYXRpb25gIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgXG4gICAqIG90aGVyd2lzZS5cbiAgICovXG4gIGdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgY29uc3Qgc3VwZXJEZWNsYXJhdGlvbiA9IHN1cGVyLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGlkKTtcblxuICAgIC8vIFRoZSBpZGVudGlmaWVyIG1heSBoYXZlIGJlZW4gb2YgYW4gYWRkaXRpb25hbCBjbGFzcyBhc3NpZ25tZW50IHN1Y2ggYXMgYE15Q2xhc3NfMWAgdGhhdCB3YXNcbiAgICAvLyBwcmVzZW50IGFzIGFsaWFzIGZvciBgTXlDbGFzc2AuIElmIHNvLCByZXNvbHZlIHN1Y2ggYWxpYXNlcyB0byB0aGVpciBvcmlnaW5hbCBkZWNsYXJhdGlvbi5cbiAgICBpZiAoc3VwZXJEZWNsYXJhdGlvbiAhPT0gbnVsbCAmJiBzdXBlckRlY2xhcmF0aW9uLm5vZGUgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gdGhpcy5yZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihzdXBlckRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgaWYgKGFsaWFzZWRJZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGFsaWFzZWRJZGVudGlmaWVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBkZWNvcmF0b3JzIG9mIHRoZSBnaXZlbiBjbGFzcyBzeW1ib2wuIEFueSBkZWNvcmF0b3IgdGhhdCBoYXZlIGJlZW4gc3ludGhldGljYWxseVxuICAgKiBpbmplY3RlZCBieSBhIG1pZ3JhdGlvbiB3aWxsIG5vdCBiZSBwcmVzZW50IGluIHRoZSByZXR1cm5lZCBjb2xsZWN0aW9uLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qge2NsYXNzRGVjb3JhdG9yc30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKHN5bWJvbCk7XG4gICAgaWYgKGNsYXNzRGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIGEgY2xvbmUgb2YgdGhlIGFycmF5IHRvIHByZXZlbnQgY29uc3VtZXJzIGZyb20gbXV0YXRpbmcgdGhlIGNhY2hlLlxuICAgIHJldHVybiBBcnJheS5mcm9tKGNsYXNzRGVjb3JhdG9ycyk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBtb2R1bGUgZm9yIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBpbiB3aGljaCB0aGUgaW5pdGlhbGl6ZXJcbiAgICogaXMgYW4gaWRlbnRpZmllciBtYXJrZWQgd2l0aCB0aGUgYFBSRV9SM19NQVJLRVJgLlxuICAgKiBAcGFyYW0gbW9kdWxlIHRoZSBtb2R1bGUgaW4gd2hpY2ggdG8gc2VhcmNoIGZvciBzd2l0Y2hhYmxlIGRlY2xhcmF0aW9ucy5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgdmFyaWFibGUgZGVjbGFyYXRpb25zIHRoYXQgbWF0Y2guXG4gICAqL1xuICBnZXRTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKG1vZHVsZTogdHMuTm9kZSk6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10ge1xuICAgIC8vIERvbid0IGJvdGhlciB0byB3YWxrIHRoZSBBU1QgaWYgdGhlIG1hcmtlciBpcyBub3QgZm91bmQgaW4gdGhlIHRleHRcbiAgICByZXR1cm4gbW9kdWxlLmdldFRleHQoKS5pbmRleE9mKFBSRV9SM19NQVJLRVIpID49IDAgP1xuICAgICAgICBmaW5kQWxsKG1vZHVsZSwgaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbikgOlxuICAgICAgICBbXTtcbiAgfVxuXG4gIGdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHZhbHVlID0gc3VwZXIuZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbik7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gV2UgaGF2ZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIGluaXRpYWxpemVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIHZhciBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gU28gbG9vayBmb3IgdGhlIHNwZWNpYWwgc2NlbmFyaW8gd2hlcmUgdGhlIHZhcmlhYmxlIGlzIGJlaW5nIGFzc2lnbmVkIGluXG4gICAgLy8gYSBuZWFyYnkgc3RhdGVtZW50IHRvIHRoZSByZXR1cm4gdmFsdWUgb2YgYSBjYWxsIHRvIGBfX2RlY29yYXRlYC5cbiAgICAvLyBUaGVuIGZpbmQgdGhlIDJuZCBhcmd1bWVudCBvZiB0aGF0IGNhbGwsIHRoZSBcInRhcmdldFwiLCB3aGljaCB3aWxsIGJlIHRoZVxuICAgIC8vIGFjdHVhbCBjbGFzcyBpZGVudGlmaWVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIEh0dHBDbGllbnRYc3JmTW9kdWxlID0gSHR0cENsaWVudFhzcmZNb2R1bGVfMSA9IHRzbGliXzEuX19kZWNvcmF0ZShbXG4gICAgLy8gICBOZ01vZHVsZSh7XG4gICAgLy8gICAgIHByb3ZpZGVyczogW10sXG4gICAgLy8gICB9KVxuICAgIC8vIF0sIEh0dHBDbGllbnRYc3JmTW9kdWxlKTtcbiAgICAvLyBgYGBcbiAgICAvL1xuICAgIC8vIEFuZCBmaW5hbGx5LCBmaW5kIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgaWRlbnRpZmllciBpbiB0aGF0IGFyZ3VtZW50LlxuICAgIC8vIE5vdGUgYWxzbyB0aGF0IHRoZSBhc3NpZ25tZW50IGNhbiBvY2N1ciB3aXRoaW4gYW5vdGhlciBhc3NpZ25tZW50LlxuICAgIC8vXG4gICAgY29uc3QgYmxvY2sgPSBkZWNsYXJhdGlvbi5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICBpZiAoc3ltYm9sICYmICh0cy5pc0Jsb2NrKGJsb2NrKSB8fCB0cy5pc1NvdXJjZUZpbGUoYmxvY2spKSkge1xuICAgICAgY29uc3QgZGVjb3JhdGVDYWxsID0gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShibG9jaywgc3ltYm9sKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGRlY29yYXRlQ2FsbCAmJiBkZWNvcmF0ZUNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHRhcmdldCAmJiB0cy5pc0lkZW50aWZpZXIodGFyZ2V0KSkge1xuICAgICAgICBjb25zdCB0YXJnZXRTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0YXJnZXQpO1xuICAgICAgICBjb25zdCB0YXJnZXREZWNsYXJhdGlvbiA9IHRhcmdldFN5bWJvbCAmJiB0YXJnZXRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKHRhcmdldERlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0YXJnZXREZWNsYXJhdGlvbikgfHxcbiAgICAgICAgICAgICAgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBqdXN0IGEgZnVuY3Rpb24gb3IgY2xhc3MgZGVjbGFyYXRpb25cbiAgICAgICAgICAgIC8vIHNvIHJldHVybiBpdHMgaWRlbnRpZmllciBhcyB0aGUgdmFyaWFibGUgdmFsdWUuXG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0RGVjbGFyYXRpb24ubmFtZSB8fCBudWxsO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLCBzbyBmaW5kIHRoZSBmYXIgcmlnaHQgZXhwcmVzc2lvbixcbiAgICAgICAgICAgIC8vIGluIHRoZSBjYXNlIG9mIG11bHRpcGxlIGFzc2lnbm1lbnRzIChlLmcuIGB2YXIxID0gdmFyMiA9IHZhbHVlYCkuXG4gICAgICAgICAgICBsZXQgdGFyZ2V0VmFsdWUgPSB0YXJnZXREZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICAgICAgICAgIHdoaWxlICh0YXJnZXRWYWx1ZSAmJiBpc0Fzc2lnbm1lbnQodGFyZ2V0VmFsdWUpKSB7XG4gICAgICAgICAgICAgIHRhcmdldFZhbHVlID0gdGFyZ2V0VmFsdWUucmlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFyZ2V0VmFsdWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIGFsbCB0b3AtbGV2ZWwgY2xhc3Mgc3ltYm9scyBpbiB0aGUgZ2l2ZW4gZmlsZS5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgY2xhc3Nlcy5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgY2xhc3Mgc3ltYm9scy5cbiAgICovXG4gIGZpbmRDbGFzc1N5bWJvbHMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IE5nY2NDbGFzc1N5bWJvbFtdIHtcbiAgICBjb25zdCBjbGFzc2VzOiBOZ2NjQ2xhc3NTeW1ib2xbXSA9IFtdO1xuICAgIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKS5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NTeW1ib2wpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChzdGF0ZW1lbnQpO1xuICAgICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NTeW1ib2wpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGNsYXNzZXM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBudW1iZXIgb2YgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgb2YgYSBnaXZlbiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycyBvZiB0aGUgY2xhc3MsIGlmIGtub3duLCBvciBgbnVsbGAgaWYgdGhlIGRlY2xhcmF0aW9uXG4gICAqIGlzIG5vdCBhIGNsYXNzIG9yIGhhcyBhbiB1bmtub3duIG51bWJlciBvZiB0eXBlIHBhcmFtZXRlcnMuXG4gICAqL1xuICBnZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogbnVtYmVyfG51bGwge1xuICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5nZXREdHNEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKGR0c0RlY2xhcmF0aW9uICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkdHNEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiBkdHNEZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycyA/IGR0c0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzLmxlbmd0aCA6IDA7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRha2UgYW4gZXhwb3J0ZWQgZGVjbGFyYXRpb24gb2YgYSBjbGFzcyAobWF5YmUgZG93bi1sZXZlbGVkIHRvIGEgdmFyaWFibGUpIGFuZCBsb29rIHVwIHRoZVxuICAgKiBkZWNsYXJhdGlvbiBvZiBpdHMgdHlwZSBpbiBhIHNlcGFyYXRlIC5kLnRzIHRyZWUuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gaXMgYWxsb3dlZCB0byByZXR1cm4gYG51bGxgIGlmIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgZG9lcyBub3QgaGF2ZSBhXG4gICAqIHNlcGFyYXRlIC5kLnRzIHRyZWUuIFdoZW4gY29tcGlsaW5nIFR5cGVTY3JpcHQgY29kZSB0aGlzIGlzIGFsd2F5cyB0aGUgY2FzZSwgc2luY2UgLmQudHMgZmlsZXNcbiAgICogYXJlIHByb2R1Y2VkIG9ubHkgZHVyaW5nIHRoZSBlbWl0IG9mIHN1Y2ggYSBjb21waWxhdGlvbi4gV2hlbiBjb21waWxpbmcgLmpzIGNvZGUsIGhvd2V2ZXIsXG4gICAqIHRoZXJlIGlzIGZyZXF1ZW50bHkgYSBwYXJhbGxlbCAuZC50cyB0cmVlIHdoaWNoIHRoaXMgbWV0aG9kIGV4cG9zZXMuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgYHRzLkNsYXNzRGVjbGFyYXRpb25gIHJldHVybmVkIGZyb20gdGhpcyBmdW5jdGlvbiBtYXkgbm90IGJlIGZyb20gdGhlIHNhbWVcbiAgICogYHRzLlByb2dyYW1gIGFzIHRoZSBpbnB1dCBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldER0c0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY2xhcmF0aW9ufG51bGwge1xuICAgIGlmICghdGhpcy5kdHNEZWNsYXJhdGlvbk1hcCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICghaXNOYW1lZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgZ2V0IHRoZSBkdHMgZmlsZSBmb3IgYSBkZWNsYXJhdGlvbiB0aGF0IGhhcyBubyBuYW1lOiAke2RlY2xhcmF0aW9uLmdldFRleHQoKX0gaW4gJHtkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmR0c0RlY2xhcmF0aW9uTWFwLmhhcyhkZWNsYXJhdGlvbi5uYW1lLnRleHQpID9cbiAgICAgICAgdGhpcy5kdHNEZWNsYXJhdGlvbk1hcC5nZXQoZGVjbGFyYXRpb24ubmFtZS50ZXh0KSAhIDpcbiAgICAgICAgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIHNvdXJjZSBmaWxlIGZvciBleHBvcnRlZCBmdW5jdGlvbnMgYW5kIHN0YXRpYyBjbGFzcyBtZXRob2RzIHRoYXQgcmV0dXJuXG4gICAqIE1vZHVsZVdpdGhQcm92aWRlcnMgb2JqZWN0cy5cbiAgICogQHBhcmFtIGYgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgdGhlc2UgZnVuY3Rpb25zXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGZ1bmN0aW9uIGRlY2xhcmF0aW9ucyB0aGF0IGxvb2sgbGlrZSB0aGV5IHJldHVybiBNb2R1bGVXaXRoUHJvdmlkZXJzXG4gICAqIG9iamVjdHMuXG4gICAqL1xuICBnZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGY6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSB7XG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKGYpO1xuICAgIGlmICghZXhwb3J0cykgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGluZm9zOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSA9IFtdO1xuICAgIGV4cG9ydHMuZm9yRWFjaCgoZGVjbGFyYXRpb24sIG5hbWUpID0+IHtcbiAgICAgIGlmIChkZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmlzQ2xhc3MoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgdGhpcy5nZXRNZW1iZXJzT2ZDbGFzcyhkZWNsYXJhdGlvbi5ub2RlKS5mb3JFYWNoKG1lbWJlciA9PiB7XG4gICAgICAgICAgaWYgKG1lbWJlci5pc1N0YXRpYykge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHRoaXMucGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKFxuICAgICAgICAgICAgICAgIG1lbWJlci5uYW1lLCBtZW1iZXIubm9kZSwgbWVtYmVyLmltcGxlbWVudGF0aW9uLCBkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICAgIGluZm9zLnB1c2goaW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgICBjb25zdCBpbmZvID1cbiAgICAgICAgICAgICAgdGhpcy5wYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoZGVjbGFyYXRpb24ubm9kZS5uYW1lLnRleHQsIGRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICBpbmZvcy5wdXNoKGluZm8pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBpbmZvcztcbiAgfVxuXG4gIGdldEVuZE9mQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHRzLk5vZGUge1xuICAgIGxldCBsYXN0OiB0cy5Ob2RlID0gY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbjtcblxuICAgIC8vIElmIHRoZXJlIGFyZSBzdGF0aWMgbWVtYmVycyBvbiB0aGlzIGNsYXNzIHRoZW4gZmluZCB0aGUgbGFzdCBvbmVcbiAgICBpZiAoY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjbGFzc1N5bWJvbC5kZWNsYXJhdGlvbi5leHBvcnRzLmZvckVhY2goZXhwb3J0U3ltYm9sID0+IHtcbiAgICAgICAgaWYgKGV4cG9ydFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gZ2V0Q29udGFpbmluZ1N0YXRlbWVudChleHBvcnRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgICAgIGlmIChleHBvcnRTdGF0ZW1lbnQgIT09IG51bGwgJiYgbGFzdC5nZXRFbmQoKSA8IGV4cG9ydFN0YXRlbWVudC5nZXRFbmQoKSkge1xuICAgICAgICAgIGxhc3QgPSBleHBvcnRTdGF0ZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGFyZSBoZWxwZXIgY2FsbHMgZm9yIHRoaXMgY2xhc3MgdGhlbiBmaW5kIHRoZSBsYXN0IG9uZVxuICAgIGNvbnN0IGhlbHBlcnMgPSB0aGlzLmdldEhlbHBlckNhbGxzRm9yQ2xhc3MoXG4gICAgICAgIGNsYXNzU3ltYm9sLCBbJ19fZGVjb3JhdGUnLCAnX19leHRlbmRzJywgJ19fcGFyYW0nLCAnX19tZXRhZGF0YSddKTtcbiAgICBoZWxwZXJzLmZvckVhY2goaGVscGVyID0+IHtcbiAgICAgIGNvbnN0IGhlbHBlclN0YXRlbWVudCA9IGdldENvbnRhaW5pbmdTdGF0ZW1lbnQoaGVscGVyKTtcbiAgICAgIGlmIChoZWxwZXJTdGF0ZW1lbnQgIT09IG51bGwgJiYgbGFzdC5nZXRFbmQoKSA8IGhlbHBlclN0YXRlbWVudC5nZXRFbmQoKSkge1xuICAgICAgICBsYXN0ID0gaGVscGVyU3RhdGVtZW50O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGxhc3Q7XG4gIH1cblxuICAvLy8vLy8vLy8vLy8vIFByb3RlY3RlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgICogRmluZHMgdGhlIGlkZW50aWZpZXIgb2YgdGhlIGFjdHVhbCBjbGFzcyBkZWNsYXJhdGlvbiBmb3IgYSBwb3RlbnRpYWxseSBhbGlhc2VkIGRlY2xhcmF0aW9uIG9mIGFcbiAgICogY2xhc3MuXG4gICAqXG4gICAqIElmIHRoZSBnaXZlbiBkZWNsYXJhdGlvbiBpcyBmb3IgYW4gYWxpYXMgb2YgYSBjbGFzcywgdGhpcyBmdW5jdGlvbiB3aWxsIGRldGVybWluZSBhbiBpZGVudGlmaWVyXG4gICAqIHRvIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiB0aGF0IHJlcHJlc2VudHMgdGhpcyBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIFRoZSBkZWNsYXJhdGlvbiB0byByZXNvbHZlLlxuICAgKiBAcmV0dXJucyBUaGUgb3JpZ2luYWwgaWRlbnRpZmllciB0aGF0IHRoZSBnaXZlbiBjbGFzcyBkZWNsYXJhdGlvbiByZXNvbHZlcyB0bywgb3IgYHVuZGVmaW5lZGBcbiAgICogaWYgdGhlIGRlY2xhcmF0aW9uIGRvZXMgbm90IHJlcHJlc2VudCBhbiBhbGlhc2VkIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmVBbGlhc2VkQ2xhc3NJZGVudGlmaWVyKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gICAgdGhpcy5lbnN1cmVQcmVwcm9jZXNzZWQoZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpKTtcbiAgICByZXR1cm4gdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuaGFzKGRlY2xhcmF0aW9uKSA/XG4gICAgICAgIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLmdldChkZWNsYXJhdGlvbikgISA6XG4gICAgICAgIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlcyB0aGF0IHRoZSBzb3VyY2UgZmlsZSB0aGF0IGBub2RlYCBpcyBwYXJ0IG9mIGhhcyBiZWVuIHByZXByb2Nlc3NlZC5cbiAgICpcbiAgICogRHVyaW5nIHByZXByb2Nlc3NpbmcsIGFsbCBzdGF0ZW1lbnRzIGluIHRoZSBzb3VyY2UgZmlsZSB3aWxsIGJlIHZpc2l0ZWQgc3VjaCB0aGF0IGNlcnRhaW5cbiAgICogcHJvY2Vzc2luZyBzdGVwcyBjYW4gYmUgZG9uZSB1cC1mcm9udCBhbmQgY2FjaGVkIGZvciBzdWJzZXF1ZW50IHVzYWdlcy5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIHRoYXQgbmVlZHMgdG8gaGF2ZSBnb25lIHRocm91Z2ggcHJlcHJvY2Vzc2luZy5cbiAgICovXG4gIHByb3RlY3RlZCBlbnN1cmVQcmVwcm9jZXNzZWQoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmICghdGhpcy5wcmVwcm9jZXNzZWRTb3VyY2VGaWxlcy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgIHRoaXMucHJlcHJvY2Vzc2VkU291cmNlRmlsZXMuYWRkKHNvdXJjZUZpbGUpO1xuXG4gICAgICBmb3IgKGNvbnN0IHN0YXRlbWVudCBvZiBzb3VyY2VGaWxlLnN0YXRlbWVudHMpIHtcbiAgICAgICAgdGhpcy5wcmVwcm9jZXNzU3RhdGVtZW50KHN0YXRlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFuYWx5emVzIHRoZSBnaXZlbiBzdGF0ZW1lbnQgdG8gc2VlIGlmIGl0IGNvcnJlc3BvbmRzIHdpdGggYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBsaWtlXG4gICAqIGBsZXQgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307YC4gSWYgc28sIHRoZSBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc18xYFxuICAgKiBpcyBhc3NvY2lhdGVkIHdpdGggdGhlIGBNeUNsYXNzYCBpZGVudGlmaWVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3RhdGVtZW50IFRoZSBzdGF0ZW1lbnQgdGhhdCBuZWVkcyB0byBiZSBwcmVwcm9jZXNzZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJlcHJvY2Vzc1N0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHZvaWQge1xuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZGVjbGFyYXRpb25zID0gc3RhdGVtZW50LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnM7XG4gICAgaWYgKGRlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGRlY2xhcmF0aW9uc1swXTtcbiAgICBjb25zdCBpbml0aWFsaXplciA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2xhcmF0aW9uLm5hbWUpIHx8ICFpbml0aWFsaXplciB8fCAhaXNBc3NpZ25tZW50KGluaXRpYWxpemVyKSB8fFxuICAgICAgICAhdHMuaXNJZGVudGlmaWVyKGluaXRpYWxpemVyLmxlZnQpIHx8ICF0cy5pc0NsYXNzRXhwcmVzc2lvbihpbml0aWFsaXplci5yaWdodCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhbGlhc2VkSWRlbnRpZmllciA9IGluaXRpYWxpemVyLmxlZnQ7XG5cbiAgICBjb25zdCBhbGlhc2VkRGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGFsaWFzZWRJZGVudGlmaWVyKTtcbiAgICBpZiAoYWxpYXNlZERlY2xhcmF0aW9uID09PSBudWxsIHx8IGFsaWFzZWREZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFVuYWJsZSB0byBsb2NhdGUgZGVjbGFyYXRpb24gb2YgJHthbGlhc2VkSWRlbnRpZmllci50ZXh0fSBpbiBcIiR7c3RhdGVtZW50LmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICB0aGlzLmFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucy5zZXQoYWxpYXNlZERlY2xhcmF0aW9uLm5vZGUsIGRlY2xhcmF0aW9uLm5hbWUpO1xuICB9XG5cbiAgLyoqIEdldCB0aGUgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIGEgbW9kdWxlLlxuICAgKlxuICAgKiBJbiBFUzUgYW5kIEVTMjAxNSB0aGlzIGlzIGp1c3QgdGhlIHRvcCBsZXZlbCBzdGF0ZW1lbnRzIG9mIHRoZSBmaWxlLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgbW9kdWxlIHdob3NlIHN0YXRlbWVudHMgd2Ugd2FudC5cbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgdG9wIGxldmVsIHN0YXRlbWVudHMgZm9yIHRoZSBnaXZlbiBtb2R1bGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHNvdXJjZUZpbGUuc3RhdGVtZW50cyk7XG4gIH1cblxuICAvKipcbiAgICogV2FsayB0aGUgQVNUIGxvb2tpbmcgZm9yIGFuIGFzc2lnbm1lbnQgdG8gdGhlIHNwZWNpZmllZCBzeW1ib2wuXG4gICAqIEBwYXJhbSBub2RlIFRoZSBjdXJyZW50IG5vZGUgd2UgYXJlIHNlYXJjaGluZy5cbiAgICogQHJldHVybnMgYW4gZXhwcmVzc2lvbiB0aGF0IHJlcHJlc2VudHMgdGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZSwgb3IgdW5kZWZpbmVkIGlmIG5vbmUgY2FuIGJlXG4gICAqIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKG5vZGU6IHRzLk5vZGV8dW5kZWZpbmVkLCBzeW1ib2w6IHRzLlN5bWJvbCk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIG5vZGUub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICBjb25zdCBsZWZ0ID0gbm9kZS5sZWZ0O1xuICAgICAgY29uc3QgcmlnaHQgPSBub2RlLnJpZ2h0O1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihsZWZ0KSAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihsZWZ0KSA9PT0gc3ltYm9sKSB7XG4gICAgICAgIHJldHVybiAodHMuaXNDYWxsRXhwcmVzc2lvbihyaWdodCkgJiYgZ2V0Q2FsbGVlTmFtZShyaWdodCkgPT09ICdfX2RlY29yYXRlJykgPyByaWdodCA6IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShyaWdodCwgc3ltYm9sKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGUuZm9yRWFjaENoaWxkKG5vZGUgPT4gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShub2RlLCBzeW1ib2wpKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byByZXRyaWV2ZSB0aGUgc3ltYm9sIG9mIGEgc3RhdGljIHByb3BlcnR5IG9uIGEgY2xhc3MuXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIGNsYXNzIHdob3NlIHByb3BlcnR5IHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gcHJvcGVydHlOYW1lIHRoZSBuYW1lIG9mIHN0YXRpYyBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBpZiBpdCBpcyBmb3VuZCBvciBgdW5kZWZpbmVkYCBpZiBub3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0U3RhdGljUHJvcGVydHkoc3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wsIHByb3BlcnR5TmFtZTogdHMuX19TdHJpbmcpOiB0cy5TeW1ib2xcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIHJldHVybiBzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cyAmJiBzeW1ib2wuZGVjbGFyYXRpb24uZXhwb3J0cy5nZXQocHJvcGVydHlOYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGZvciBvYnRhaW5pbmcgaW5mb3JtYXRpb24gb24gdGhlIGRlY29yYXRvcnMgb2YgYSBnaXZlbiBjbGFzcy4gVGhpc1xuICAgKiBpbmZvcm1hdGlvbiBpcyBjb21wdXRlZCBlaXRoZXIgZnJvbSBzdGF0aWMgcHJvcGVydGllcyBpZiBwcmVzZW50LCBvciB1c2luZyBgdHNsaWIuX19kZWNvcmF0ZWBcbiAgICogaGVscGVyIGNhbGxzIG90aGVyd2lzZS4gVGhlIGNvbXB1dGVkIHJlc3VsdCBpcyBjYWNoZWQgcGVyIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIGZvciB3aGljaCBkZWNvcmF0b3JzIHNob3VsZCBiZSBhY3F1aXJlZC5cbiAgICogQHJldHVybnMgYWxsIGluZm9ybWF0aW9uIG9mIHRoZSBkZWNvcmF0b3JzIG9uIHRoZSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBhY3F1aXJlRGVjb3JhdG9ySW5mbyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9ySW5mbyB7XG4gICAgY29uc3QgZGVjbCA9IGNsYXNzU3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb247XG4gICAgaWYgKHRoaXMuZGVjb3JhdG9yQ2FjaGUuaGFzKGRlY2wpKSB7XG4gICAgICByZXR1cm4gdGhpcy5kZWNvcmF0b3JDYWNoZS5nZXQoZGVjbCkgITtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IGRlY29yYXRvcnMgZnJvbSBzdGF0aWMgcHJvcGVydGllcyBhbmQgYF9fZGVjb3JhdGVgIGhlbHBlciBjYWxscywgdGhlbiBtZXJnZSB0aGVtXG4gICAgLy8gdG9nZXRoZXIgd2hlcmUgdGhlIGluZm9ybWF0aW9uIGZyb20gdGhlIHN0YXRpYyBwcm9wZXJ0aWVzIGlzIHByZWZlcnJlZC5cbiAgICBjb25zdCBzdGF0aWNQcm9wcyA9IHRoaXMuY29tcHV0ZURlY29yYXRvckluZm9Gcm9tU3RhdGljUHJvcGVydGllcyhjbGFzc1N5bWJvbCk7XG4gICAgY29uc3QgaGVscGVyQ2FsbHMgPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sKTtcblxuICAgIGNvbnN0IGRlY29yYXRvckluZm86IERlY29yYXRvckluZm8gPSB7XG4gICAgICBjbGFzc0RlY29yYXRvcnM6IHN0YXRpY1Byb3BzLmNsYXNzRGVjb3JhdG9ycyB8fCBoZWxwZXJDYWxscy5jbGFzc0RlY29yYXRvcnMsXG4gICAgICBtZW1iZXJEZWNvcmF0b3JzOiBzdGF0aWNQcm9wcy5tZW1iZXJEZWNvcmF0b3JzIHx8IGhlbHBlckNhbGxzLm1lbWJlckRlY29yYXRvcnMsXG4gICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mbzogc3RhdGljUHJvcHMuY29uc3RydWN0b3JQYXJhbUluZm8gfHwgaGVscGVyQ2FsbHMuY29uc3RydWN0b3JQYXJhbUluZm8sXG4gICAgfTtcblxuICAgIHRoaXMuZGVjb3JhdG9yQ2FjaGUuc2V0KGRlY2wsIGRlY29yYXRvckluZm8pO1xuICAgIHJldHVybiBkZWNvcmF0b3JJbmZvO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHRzIHRvIGNvbXB1dGUgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gc3RhdGljIHByb3BlcnRpZXMgXCJkZWNvcmF0b3JzXCIsIFwicHJvcERlY29yYXRvcnNcIlxuICAgKiBhbmQgXCJjdG9yUGFyYW1ldGVyc1wiIG9uIHRoZSBjbGFzcy4gSWYgbmVpdGhlciBvZiB0aGVzZSBzdGF0aWMgcHJvcGVydGllcyBpcyBwcmVzZW50IHRoZVxuICAgKiBsaWJyYXJ5IGlzIGxpa2VseSBub3QgY29tcGlsZWQgdXNpbmcgdHNpY2tsZSBmb3IgdXNhZ2Ugd2l0aCBDbG9zdXJlIGNvbXBpbGVyLCBpbiB3aGljaCBjYXNlXG4gICAqIGBudWxsYCBpcyByZXR1cm5lZC5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIFRoZSBjbGFzcyBzeW1ib2wgdG8gY29tcHV0ZSB0aGUgZGVjb3JhdG9ycyBpbmZvcm1hdGlvbiBmb3IuXG4gICAqIEByZXR1cm5zIEFsbCBpbmZvcm1hdGlvbiBvbiB0aGUgZGVjb3JhdG9ycyBhcyBleHRyYWN0ZWQgZnJvbSBzdGF0aWMgcHJvcGVydGllcywgb3IgYG51bGxgIGlmXG4gICAqIG5vbmUgb2YgdGhlIHN0YXRpYyBwcm9wZXJ0aWVzIGV4aXN0LlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbVN0YXRpY1Byb3BlcnRpZXMoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCk6IHtcbiAgICBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdIHwgbnVsbDsgbWVtYmVyRGVjb3JhdG9yczogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+fCBudWxsO1xuICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXSB8IG51bGw7XG4gIH0ge1xuICAgIGxldCBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwgPSBudWxsO1xuICAgIGxldCBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT58bnVsbCA9IG51bGw7XG4gICAgbGV0IGNvbnN0cnVjdG9yUGFyYW1JbmZvOiBQYXJhbUluZm9bXXxudWxsID0gbnVsbDtcblxuICAgIGNvbnN0IGRlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIERFQ09SQVRPUlMpO1xuICAgIGlmIChkZWNvcmF0b3JzUHJvcGVydHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY2xhc3NEZWNvcmF0b3JzID0gdGhpcy5nZXRDbGFzc0RlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9wRGVjb3JhdG9yc1Byb3BlcnR5ID0gdGhpcy5nZXRTdGF0aWNQcm9wZXJ0eShjbGFzc1N5bWJvbCwgUFJPUF9ERUNPUkFUT1JTKTtcbiAgICBpZiAocHJvcERlY29yYXRvcnNQcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBtZW1iZXJEZWNvcmF0b3JzID0gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KHByb3BEZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnN0cnVjdG9yUGFyYW1zUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBDT05TVFJVQ1RPUl9QQVJBTVMpO1xuICAgIGlmIChjb25zdHJ1Y3RvclBhcmFtc1Byb3BlcnR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0cnVjdG9yUGFyYW1JbmZvID0gdGhpcy5nZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkoY29uc3RydWN0b3JQYXJhbXNQcm9wZXJ0eSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtjbGFzc0RlY29yYXRvcnMsIG1lbWJlckRlY29yYXRvcnMsIGNvbnN0cnVjdG9yUGFyYW1JbmZvfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGNsYXNzIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBjbGFzcywgd2hlcmUgdGhlIGRlY29yYXRvcnMgYXJlIGRlY2xhcmVkXG4gICAqIHZpYSBhIHN0YXRpYyBwcm9wZXJ0eS4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBjbGFzcyBTb21lRGlyZWN0aXZlIHt9XG4gICAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAgICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc1N5bWJvbCB0aGUgcHJvcGVydHkgY29udGFpbmluZyB0aGUgZGVjb3JhdG9ycyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBvciBudWxsIGlmIG5vbmUgd2hlcmUgZm91bmQuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNTeW1ib2w6IHRzLlN5bWJvbCk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvcnNJZGVudGlmaWVyID0gZGVjb3JhdG9yc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmIChkZWNvcmF0b3JzSWRlbnRpZmllciAmJiBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQpIHtcbiAgICAgIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24oZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSAmJlxuICAgICAgICAgIGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudC5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pIHtcbiAgICAgICAgLy8gQVNUIG9mIHRoZSBhcnJheSBvZiBkZWNvcmF0b3IgdmFsdWVzXG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnNBcnJheSA9IGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudC5yaWdodDtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9yc0FycmF5KVxuICAgICAgICAgICAgLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgc3ltYm9sIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGl0cyBtZW1iZXJzLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBgQ2xhc3NTeW1ib2xgIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyc09mU3ltYm9sKHN5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuXG4gICAgLy8gVGhlIGRlY29yYXRvcnMgbWFwIGNvbnRhaW5zIGFsbCB0aGUgcHJvcGVydGllcyB0aGF0IGFyZSBkZWNvcmF0ZWRcbiAgICBjb25zdCB7bWVtYmVyRGVjb3JhdG9yc30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKHN5bWJvbCk7XG5cbiAgICAvLyBNYWtlIGEgY29weSBvZiB0aGUgZGVjb3JhdG9ycyBhcyBzdWNjZXNzZnVsbHkgcmVmbGVjdGVkIG1lbWJlcnMgZGVsZXRlIHRoZW1zZWx2ZXMgZnJvbSB0aGVcbiAgICAvLyBtYXAsIHNvIHRoYXQgYW55IGxlZnRvdmVycyBjYW4gYmUgZWFzaWx5IGRlYWx0IHdpdGguXG4gICAgY29uc3QgZGVjb3JhdG9yc01hcCA9IG5ldyBNYXAobWVtYmVyRGVjb3JhdG9ycyk7XG5cbiAgICAvLyBUaGUgbWVtYmVyIG1hcCBjb250YWlucyBhbGwgdGhlIG1ldGhvZCAoaW5zdGFuY2UgYW5kIHN0YXRpYyk7IGFuZCBhbnkgaW5zdGFuY2UgcHJvcGVydGllc1xuICAgIC8vIHRoYXQgYXJlIGluaXRpYWxpemVkIGluIHRoZSBjbGFzcy5cbiAgICBpZiAoc3ltYm9sLmltcGxlbWVudGF0aW9uLm1lbWJlcnMpIHtcbiAgICAgIHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5tZW1iZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgc3RhdGljIHByb3BlcnR5IG1hcCBjb250YWlucyBhbGwgdGhlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgaWYgKHN5bWJvbC5pbXBsZW1lbnRhdGlvbi5leHBvcnRzKSB7XG4gICAgICBzeW1ib2wuaW1wbGVtZW50YXRpb24uZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBjbGFzcyB3YXMgZGVjbGFyZWQgYXMgYSBWYXJpYWJsZURlY2xhcmF0aW9uIHRoZW4gaXQgbWF5IGhhdmUgc3RhdGljIHByb3BlcnRpZXNcbiAgICAvLyBhdHRhY2hlZCB0byB0aGUgdmFyaWFibGUgcmF0aGVyIHRoYW4gdGhlIGNsYXNzIGl0c2VsZlxuICAgIC8vIEZvciBleGFtcGxlOlxuICAgIC8vIGBgYFxuICAgIC8vIGxldCBNeUNsYXNzID0gY2xhc3MgTXlDbGFzcyB7XG4gICAgLy8gICAvLyBubyBzdGF0aWMgcHJvcGVydGllcyBoZXJlIVxuICAgIC8vIH1cbiAgICAvLyBNeUNsYXNzLnN0YXRpY1Byb3BlcnR5ID0gLi4uO1xuICAgIC8vIGBgYFxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oc3ltYm9sLmRlY2xhcmF0aW9uLnZhbHVlRGVjbGFyYXRpb24pKSB7XG4gICAgICBpZiAoc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMpIHtcbiAgICAgICAgc3ltYm9sLmRlY2xhcmF0aW9uLmV4cG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycywgdHJ1ZSk7XG4gICAgICAgICAgaWYgKHJlZmxlY3RlZE1lbWJlcnMpIHtcbiAgICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVhbCB3aXRoIGFueSBkZWNvcmF0ZWQgcHJvcGVydGllcyB0aGF0IHdlcmUgbm90IGluaXRpYWxpemVkIGluIHRoZSBjbGFzc1xuICAgIGRlY29yYXRvcnNNYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgaW1wbGVtZW50YXRpb246IG51bGwsXG4gICAgICAgIGRlY29yYXRvcnM6IHZhbHVlLFxuICAgICAgICBpc1N0YXRpYzogZmFsc2UsXG4gICAgICAgIGtpbmQ6IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eSxcbiAgICAgICAgbmFtZToga2V5LFxuICAgICAgICBuYW1lTm9kZTogbnVsbCxcbiAgICAgICAgbm9kZTogbnVsbCxcbiAgICAgICAgdHlwZTogbnVsbCxcbiAgICAgICAgdmFsdWU6IG51bGxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogTWVtYmVyIGRlY29yYXRvcnMgbWF5IGJlIGRlY2xhcmVkIGFzIHN0YXRpYyBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzczpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gICAqICAgXCJuZ0Zvck9mXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVHJhY2tCeVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRlbXBsYXRlXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogfTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzUHJvcGVydHkgdGhlIGNsYXNzIHdob3NlIG1lbWJlciBkZWNvcmF0b3JzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhIG1hcCB3aG9zZSBrZXlzIGFyZSB0aGUgbmFtZSBvZiB0aGUgbWVtYmVycyBhbmQgd2hvc2UgdmFsdWVzIGFyZSBjb2xsZWN0aW9ucyBvZlxuICAgKiBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlckRlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOlxuICAgICAgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+IHtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuICAgIC8vIFN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBmb3IgYFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnNgLlxuICAgIGNvbnN0IHByb3BEZWNvcmF0b3JzTWFwID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2woZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBpZiAocHJvcERlY29yYXRvcnNNYXAgJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wRGVjb3JhdG9yc01hcCkpIHtcbiAgICAgIGNvbnN0IHByb3BlcnRpZXNNYXAgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChwcm9wRGVjb3JhdG9yc01hcCk7XG4gICAgICBwcm9wZXJ0aWVzTWFwLmZvckVhY2goKHZhbHVlLCBuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyh2YWx1ZSkuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlckRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogRm9yIGEgZ2l2ZW4gY2xhc3Mgc3ltYm9sLCBjb2xsZWN0cyBhbGwgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gdHNsaWIgaGVscGVyIG1ldGhvZHMsIGFzXG4gICAqIGdlbmVyYXRlZCBieSBUeXBlU2NyaXB0IGludG8gZW1pdHRlZCBKYXZhU2NyaXB0IGZpbGVzLlxuICAgKlxuICAgKiBDbGFzcyBkZWNvcmF0b3JzIGFyZSBleHRyYWN0ZWQgZnJvbSBjYWxscyB0byBgdHNsaWIuX19kZWNvcmF0ZWAgdGhhdCBsb29rIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBsZXQgU29tZURpcmVjdGl2ZSA9IGNsYXNzIFNvbWVEaXJlY3RpdmUge31cbiAgICogU29tZURpcmVjdGl2ZSA9IF9fZGVjb3JhdGUoW1xuICAgKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAgICogXSwgU29tZURpcmVjdGl2ZSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBUaGUgZXh0cmFjdGlvbiBvZiBtZW1iZXIgZGVjb3JhdG9ycyBpcyBzaW1pbGFyLCB3aXRoIHRoZSBkaXN0aW5jdGlvbiB0aGF0IGl0cyAybmQgYW5kIDNyZFxuICAgKiBhcmd1bWVudCBjb3JyZXNwb25kIHdpdGggYSBcInByb3RvdHlwZVwiIHRhcmdldCBhbmQgdGhlIG5hbWUgb2YgdGhlIG1lbWJlciB0byB3aGljaCB0aGVcbiAgICogZGVjb3JhdG9ycyBhcHBseS5cbiAgICpcbiAgICogYGBgXG4gICAqIF9fZGVjb3JhdGUoW1xuICAgKiAgICAgSW5wdXQoKSxcbiAgICogICAgIF9fbWV0YWRhdGEoXCJkZXNpZ246dHlwZVwiLCBTdHJpbmcpXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUucHJvdG90eXBlLCBcImlucHV0MVwiLCB2b2lkIDApO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIFRoZSBjbGFzcyBzeW1ib2wgZm9yIHdoaWNoIGRlY29yYXRvcnMgc2hvdWxkIGJlIGV4dHJhY3RlZC5cbiAgICogQHJldHVybnMgQWxsIGluZm9ybWF0aW9uIG9uIHRoZSBkZWNvcmF0b3JzIG9mIHRoZSBjbGFzcy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21IZWxwZXJDYWxscyhjbGFzc1N5bWJvbDogTmdjY0NsYXNzU3ltYm9sKTogRGVjb3JhdG9ySW5mbyB7XG4gICAgbGV0IGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCA9IG51bGw7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICBjb25zdCBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW10gPSBbXTtcblxuICAgIGNvbnN0IGdldENvbnN0cnVjdG9yUGFyYW1JbmZvID0gKGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgIGxldCBwYXJhbSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XTtcbiAgICAgIGlmIChwYXJhbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhcmFtID0gY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdID0ge2RlY29yYXRvcnM6IG51bGwsIHR5cGVFeHByZXNzaW9uOiBudWxsfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYXJhbTtcbiAgICB9O1xuXG4gICAgLy8gQWxsIHJlbGV2YW50IGluZm9ybWF0aW9uIGNhbiBiZSBleHRyYWN0ZWQgZnJvbSBjYWxscyB0byBgX19kZWNvcmF0ZWAsIG9idGFpbiB0aGVzZSBmaXJzdC5cbiAgICAvLyBOb3RlIHRoYXQgYWx0aG91Z2ggdGhlIGhlbHBlciBjYWxscyBhcmUgcmV0cmlldmVkIHVzaW5nIHRoZSBjbGFzcyBzeW1ib2wsIHRoZSByZXN1bHQgbWF5XG4gICAgLy8gY29udGFpbiBoZWxwZXIgY2FsbHMgY29ycmVzcG9uZGluZyB3aXRoIHVucmVsYXRlZCBjbGFzc2VzLiBUaGVyZWZvcmUsIGVhY2ggaGVscGVyIGNhbGwgc3RpbGxcbiAgICAvLyBoYXMgdG8gYmUgY2hlY2tlZCB0byBhY3R1YWxseSBjb3JyZXNwb25kIHdpdGggdGhlIGNsYXNzIHN5bWJvbC5cbiAgICBjb25zdCBoZWxwZXJDYWxscyA9IHRoaXMuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbCwgWydfX2RlY29yYXRlJ10pO1xuXG4gICAgZm9yIChjb25zdCBoZWxwZXJDYWxsIG9mIGhlbHBlckNhbGxzKSB7XG4gICAgICBpZiAoaXNDbGFzc0RlY29yYXRlQ2FsbChoZWxwZXJDYWxsLCBjbGFzc1N5bWJvbC5uYW1lKSkge1xuICAgICAgICAvLyBUaGlzIGBfX2RlY29yYXRlYCBjYWxsIGlzIHRhcmdldGluZyB0aGUgY2xhc3MgaXRzZWxmLlxuICAgICAgICBjb25zdCBoZWxwZXJBcmdzID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMF07XG5cbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGhlbHBlckFyZ3MuZWxlbWVudHMpIHtcbiAgICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMucmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZWxlbWVudCk7XG4gICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ2RlY29yYXRvcicpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHdhcyByZWZsZWN0ZWQgdG8gcmVwcmVzZW50IGFuIGFjdHVhbCBkZWNvcmF0b3JcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRnJvbUNvcmUoZW50cnkuZGVjb3JhdG9yKSkge1xuICAgICAgICAgICAgICAoY2xhc3NEZWNvcmF0b3JzIHx8IChjbGFzc0RlY29yYXRvcnMgPSBbXSkpLnB1c2goZW50cnkuZGVjb3JhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LnR5cGUgPT09ICdwYXJhbTpkZWNvcmF0b3JzJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgcmVwcmVzZW50cyBhIGRlY29yYXRvciBmb3IgYSBwYXJhbWV0ZXIuIFNpbmNlIGl0J3MgYXBwbGllZCB0byB0aGVcbiAgICAgICAgICAgIC8vIGNsYXNzLCBpdCBjb3JyZXNwb25kcyB3aXRoIGEgY29uc3RydWN0b3IgcGFyYW1ldGVyIG9mIHRoZSBjbGFzcy5cbiAgICAgICAgICAgIGNvbnN0IHBhcmFtID0gZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oZW50cnkuaW5kZXgpO1xuICAgICAgICAgICAgKHBhcmFtLmRlY29yYXRvcnMgfHwgKHBhcmFtLmRlY29yYXRvcnMgPSBbXSkpLnB1c2goZW50cnkuZGVjb3JhdG9yKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LnR5cGUgPT09ICdwYXJhbXMnKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyByZXByZXNlbnRzIHRoZSB0eXBlcyBvZiB0aGUgcGFyYW1ldGVycy4gU2luY2UgaXQncyBhcHBsaWVkIHRvIHRoZVxuICAgICAgICAgICAgLy8gY2xhc3MsIGl0IGNvcnJlc3BvbmRzIHdpdGggdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgdGhlIGNsYXNzLlxuICAgICAgICAgICAgZW50cnkudHlwZXMuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAodHlwZSwgaW5kZXgpID0+IGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKGluZGV4KS50eXBlRXhwcmVzc2lvbiA9IHR5cGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc01lbWJlckRlY29yYXRlQ2FsbChoZWxwZXJDYWxsLCBjbGFzc1N5bWJvbC5uYW1lKSkge1xuICAgICAgICAvLyBUaGUgYF9fZGVjb3JhdGVgIGNhbGwgaXMgdGFyZ2V0aW5nIGEgbWVtYmVyIG9mIHRoZSBjbGFzc1xuICAgICAgICBjb25zdCBoZWxwZXJBcmdzID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMF07XG4gICAgICAgIGNvbnN0IG1lbWJlck5hbWUgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1syXS50ZXh0O1xuXG4gICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBoZWxwZXJBcmdzLmVsZW1lbnRzKSB7XG4gICAgICAgICAgY29uc3QgZW50cnkgPSB0aGlzLnJlZmxlY3REZWNvcmF0ZUhlbHBlckVudHJ5KGVsZW1lbnQpO1xuICAgICAgICAgIGlmIChlbnRyeSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGVudHJ5LnR5cGUgPT09ICdkZWNvcmF0b3InKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyB3YXMgcmVmbGVjdGVkIHRvIHJlcHJlc2VudCBhbiBhY3R1YWwgZGVjb3JhdG9yLlxuICAgICAgICAgICAgaWYgKHRoaXMuaXNGcm9tQ29yZShlbnRyeS5kZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5oYXMobWVtYmVyTmFtZSkgPyBtZW1iZXJEZWNvcmF0b3JzLmdldChtZW1iZXJOYW1lKSAhIDogW107XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLnNldChtZW1iZXJOYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSW5mb3JtYXRpb24gb24gZGVjb3JhdGVkIHBhcmFtZXRlcnMgaXMgbm90IGludGVyZXN0aW5nIGZvciBuZ2NjLCBzbyBpdCdzIGlnbm9yZWQuXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtjbGFzc0RlY29yYXRvcnMsIG1lbWJlckRlY29yYXRvcnMsIGNvbnN0cnVjdG9yUGFyYW1JbmZvfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IHRoZSBkZXRhaWxzIG9mIGFuIGVudHJ5IHdpdGhpbiBhIGBfX2RlY29yYXRlYCBoZWxwZXIgY2FsbC4gRm9yIGV4YW1wbGUsIGdpdmVuIHRoZVxuICAgKiBmb2xsb3dpbmcgY29kZTpcbiAgICpcbiAgICogYGBgXG4gICAqIF9fZGVjb3JhdGUoW1xuICAgKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAgICogICB0c2xpYl8xLl9fcGFyYW0oMiwgSW5qZWN0KElOSkVDVEVEX1RPS0VOKSksXG4gICAqICAgdHNsaWJfMS5fX21ldGFkYXRhKFwiZGVzaWduOnBhcmFtdHlwZXNcIiwgW1ZpZXdDb250YWluZXJSZWYsIFRlbXBsYXRlUmVmLCBTdHJpbmddKVxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIGl0IGNhbiBiZSBzZWVuIHRoYXQgdGhlcmUgYXJlIGNhbGxzIHRvIHJlZ3VsYXIgZGVjb3JhdG9ycyAodGhlIGBEaXJlY3RpdmVgKSBhbmQgY2FsbHMgaW50b1xuICAgKiBgdHNsaWJgIGZ1bmN0aW9ucyB3aGljaCBoYXZlIGJlZW4gaW5zZXJ0ZWQgYnkgVHlwZVNjcmlwdC4gVGhlcmVmb3JlLCB0aGlzIGZ1bmN0aW9uIGNsYXNzaWZpZXNcbiAgICogYSBjYWxsIHRvIGNvcnJlc3BvbmQgd2l0aFxuICAgKiAgIDEuIGEgcmVhbCBkZWNvcmF0b3IgbGlrZSBgRGlyZWN0aXZlYCBhYm92ZSwgb3JcbiAgICogICAyLiBhIGRlY29yYXRlZCBwYXJhbWV0ZXIsIGNvcnJlc3BvbmRpbmcgd2l0aCBgX19wYXJhbWAgY2FsbHMgZnJvbSBgdHNsaWJgLCBvclxuICAgKiAgIDMuIHRoZSB0eXBlIGluZm9ybWF0aW9uIG9mIHBhcmFtZXRlcnMsIGNvcnJlc3BvbmRpbmcgd2l0aCBgX19tZXRhZGF0YWAgY2FsbCBmcm9tIGB0c2xpYmBcbiAgICpcbiAgICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBuZWVkcyB0byBiZSByZWZsZWN0ZWQgaW50byBhIGBEZWNvcmF0ZUhlbHBlckVudHJ5YFxuICAgKiBAcmV0dXJucyBhbiBvYmplY3QgdGhhdCBpbmRpY2F0ZXMgd2hpY2ggb2YgdGhlIHRocmVlIGNhdGVnb3JpZXMgdGhlIGNhbGwgcmVwcmVzZW50cywgdG9nZXRoZXJcbiAgICogd2l0aCB0aGUgcmVmbGVjdGVkIGluZm9ybWF0aW9uIG9mIHRoZSBjYWxsLCBvciBudWxsIGlmIHRoZSBjYWxsIGlzIG5vdCBhIHZhbGlkIGRlY29yYXRlIGNhbGwuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IERlY29yYXRlSGVscGVyRW50cnl8bnVsbCB7XG4gICAgLy8gV2Ugb25seSBjYXJlIGFib3V0IHRob3NlIGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbCBjYWxsc1xuICAgIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGNhbGwgPSBleHByZXNzaW9uO1xuXG4gICAgY29uc3QgaGVscGVyTmFtZSA9IGdldENhbGxlZU5hbWUoY2FsbCk7XG4gICAgaWYgKGhlbHBlck5hbWUgPT09ICdfX21ldGFkYXRhJykge1xuICAgICAgLy8gVGhpcyBpcyBhIGB0c2xpYi5fX21ldGFkYXRhYCBjYWxsLCByZWZsZWN0IHRvIGFyZ3VtZW50cyBpbnRvIGEgYFBhcmFtZXRlclR5cGVzYCBvYmplY3RcbiAgICAgIC8vIGlmIHRoZSBtZXRhZGF0YSBrZXkgaXMgXCJkZXNpZ246cGFyYW10eXBlc1wiLlxuICAgICAgY29uc3Qga2V5ID0gY2FsbC5hcmd1bWVudHNbMF07XG4gICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzU3RyaW5nTGl0ZXJhbChrZXkpIHx8IGtleS50ZXh0ICE9PSAnZGVzaWduOnBhcmFtdHlwZXMnKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbih2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdwYXJhbXMnLFxuICAgICAgICB0eXBlczogQXJyYXkuZnJvbSh2YWx1ZS5lbGVtZW50cyksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChoZWxwZXJOYW1lID09PSAnX19wYXJhbScpIHtcbiAgICAgIC8vIFRoaXMgaXMgYSBgdHNsaWIuX19wYXJhbWAgY2FsbCB0aGF0IGlzIHJlZmxlY3RlZCBpbnRvIGEgYFBhcmFtZXRlckRlY29yYXRvcnNgIG9iamVjdC5cbiAgICAgIGNvbnN0IGluZGV4QXJnID0gY2FsbC5hcmd1bWVudHNbMF07XG4gICAgICBjb25zdCBpbmRleCA9IGluZGV4QXJnICYmIHRzLmlzTnVtZXJpY0xpdGVyYWwoaW5kZXhBcmcpID8gcGFyc2VJbnQoaW5kZXhBcmcudGV4dCwgMTApIDogTmFOO1xuICAgICAgaWYgKGlzTmFOKGluZGV4KSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjb3JhdG9yQ2FsbCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGRlY29yYXRvckNhbGwgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihkZWNvcmF0b3JDYWxsKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjb3JhdG9yID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChkZWNvcmF0b3JDYWxsKTtcbiAgICAgIGlmIChkZWNvcmF0b3IgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdwYXJhbTpkZWNvcmF0b3JzJyxcbiAgICAgICAgaW5kZXgsXG4gICAgICAgIGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIGF0dGVtcHQgdG8gcmVmbGVjdCBpdCBhcyBhIHJlZ3VsYXIgZGVjb3JhdG9yLlxuICAgIGNvbnN0IGRlY29yYXRvciA9IHRoaXMucmVmbGVjdERlY29yYXRvckNhbGwoY2FsbCk7XG4gICAgaWYgKGRlY29yYXRvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnZGVjb3JhdG9yJyxcbiAgICAgIGRlY29yYXRvcixcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JDYWxsKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKTogRGVjb3JhdG9yfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvckV4cHJlc3Npb24gPSBjYWxsLmV4cHJlc3Npb247XG4gICAgaWYgKCFpc0RlY29yYXRvcklkZW50aWZpZXIoZGVjb3JhdG9yRXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdlIGZvdW5kIGEgZGVjb3JhdG9yIVxuICAgIGNvbnN0IGRlY29yYXRvcklkZW50aWZpZXIgPVxuICAgICAgICB0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yRXhwcmVzc2lvbikgPyBkZWNvcmF0b3JFeHByZXNzaW9uIDogZGVjb3JhdG9yRXhwcmVzc2lvbi5uYW1lO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvckV4cHJlc3Npb24sXG4gICAgICBpbXBvcnQ6IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpLFxuICAgICAgbm9kZTogY2FsbCxcbiAgICAgIGFyZ3M6IEFycmF5LmZyb20oY2FsbC5hcmd1bWVudHMpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIGdpdmVuIHN0YXRlbWVudCB0byBzZWUgaWYgaXQgaXMgYSBjYWxsIHRvIGFueSBvZiB0aGUgc3BlY2lmaWVkIGhlbHBlciBmdW5jdGlvbnMgb3JcbiAgICogbnVsbCBpZiBub3QgZm91bmQuXG4gICAqXG4gICAqIE1hdGNoaW5nIHN0YXRlbWVudHMgd2lsbCBsb29rIGxpa2U6ICBgdHNsaWJfMS5fX2RlY29yYXRlKC4uLik7YC5cbiAgICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRoYXQgbWF5IGNvbnRhaW4gdGhlIGNhbGwuXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lcyB0aGUgbmFtZXMgb2YgdGhlIGhlbHBlciB3ZSBhcmUgbG9va2luZyBmb3IuXG4gICAqIEByZXR1cm5zIHRoZSBub2RlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGBfX2RlY29yYXRlKC4uLilgIGNhbGwgb3IgbnVsbCBpZiB0aGUgc3RhdGVtZW50XG4gICAqIGRvZXMgbm90IG1hdGNoLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEhlbHBlckNhbGwoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIGhlbHBlck5hbWVzOiBzdHJpbmdbXSk6IHRzLkNhbGxFeHByZXNzaW9ufG51bGwge1xuICAgIGlmICgodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgfHwgdHMuaXNSZXR1cm5TdGF0ZW1lbnQoc3RhdGVtZW50KSkgJiZcbiAgICAgICAgc3RhdGVtZW50LmV4cHJlc3Npb24pIHtcbiAgICAgIGxldCBleHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgICB3aGlsZSAoaXNBc3NpZ25tZW50KGV4cHJlc3Npb24pKSB7XG4gICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnJpZ2h0O1xuICAgICAgfVxuICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHtcbiAgICAgICAgY29uc3QgY2FsbGVlTmFtZSA9IGdldENhbGxlZU5hbWUoZXhwcmVzc2lvbik7XG4gICAgICAgIGlmIChjYWxsZWVOYW1lICE9PSBudWxsICYmIGhlbHBlck5hbWVzLmluY2x1ZGVzKGNhbGxlZU5hbWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGV4cHJlc3Npb247XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgdGhlIGdpdmVuIGFycmF5IG5vZGUgYW5kIGV4dHJhY3QgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gZWFjaCBlbGVtZW50LlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgZm9yIGRlY29yYXRvcnMgdGhhdCBhcmUgZGVmaW5lZCBpbiBzdGF0aWMgcHJvcGVydGllcy4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNBcnJheSBhbiBleHByZXNzaW9uIHRoYXQgY29udGFpbnMgZGVjb3JhdG9yIGluZm9ybWF0aW9uLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBkZWNvcmF0b3IgaW5mbyB0aGF0IHdhcyByZWZsZWN0ZWQgZnJvbSB0aGUgYXJyYXkgbm9kZS5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXk6IHRzLkV4cHJlc3Npb24pOiBEZWNvcmF0b3JbXSB7XG4gICAgY29uc3QgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gPSBbXTtcblxuICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVjb3JhdG9yc0FycmF5KSkge1xuICAgICAgLy8gQWRkIGVhY2ggZGVjb3JhdG9yIHRoYXQgaXMgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWAgaW50byB0aGUgYGRlY29yYXRvcnNgIGFycmF5XG4gICAgICBkZWNvcmF0b3JzQXJyYXkuZWxlbWVudHMuZm9yRWFjaChub2RlID0+IHtcblxuICAgICAgICAvLyBJZiB0aGUgZGVjb3JhdG9yIGlzIG5vdCBhbiBvYmplY3QgbGl0ZXJhbCBleHByZXNzaW9uIHRoZW4gd2UgYXJlIG5vdCBpbnRlcmVzdGVkXG4gICAgICAgIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmhhcygndHlwZScpKSB7XG4gICAgICAgICAgICBsZXQgZGVjb3JhdG9yVHlwZSA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKSAhO1xuICAgICAgICAgICAgaWYgKGlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSkge1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JJZGVudGlmaWVyID1cbiAgICAgICAgICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSA/IGRlY29yYXRvclR5cGUgOiBkZWNvcmF0b3JUeXBlLm5hbWU7XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvclR5cGUsXG4gICAgICAgICAgICAgICAgaW1wb3J0OiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWNvcmF0b3JJZGVudGlmaWVyKSwgbm9kZSxcbiAgICAgICAgICAgICAgICBhcmdzOiBnZXREZWNvcmF0b3JBcmdzKG5vZGUpLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKlxuICAgKiBBIHNpbmdsZSBzeW1ib2wgbWF5IHJlcHJlc2VudCBtdWx0aXBsZSBjbGFzcyBtZW1iZXJzIGluIHRoZSBjYXNlIG9mIGFjY2Vzc29ycztcbiAgICogYW4gZXF1YWxseSBuYW1lZCBnZXR0ZXIvc2V0dGVyIGFjY2Vzc29yIHBhaXIgaXMgY29tYmluZWQgaW50byBhIHNpbmdsZSBzeW1ib2wuXG4gICAqIFdoZW4gdGhlIHN5bWJvbCBpcyByZWNvZ25pemVkIGFzIHJlcHJlc2VudGluZyBhbiBhY2Nlc3NvciwgaXRzIGRlY2xhcmF0aW9ucyBhcmVcbiAgICogYW5hbHl6ZWQgc3VjaCB0aGF0IGJvdGggdGhlIHNldHRlciBhbmQgZ2V0dGVyIGFjY2Vzc29yIGFyZSByZXR1cm5lZCBhcyBzZXBhcmF0ZVxuICAgKiBjbGFzcyBtZW1iZXJzLlxuICAgKlxuICAgKiBPbmUgZGlmZmVyZW5jZSB3cnQgdGhlIFR5cGVTY3JpcHQgaG9zdCBpcyB0aGF0IGluIEVTMjAxNSwgd2UgY2Fubm90IHNlZSB3aGljaFxuICAgKiBhY2Nlc3NvciBvcmlnaW5hbGx5IGhhZCBhbnkgZGVjb3JhdG9ycyBhcHBsaWVkIHRvIHRoZW0sIGFzIGRlY29yYXRvcnMgYXJlIGFwcGxpZWRcbiAgICogdG8gdGhlIHByb3BlcnR5IGRlc2NyaXB0b3IgaW4gZ2VuZXJhbCwgbm90IGEgc3BlY2lmaWMgYWNjZXNzb3IuIElmIGFuIGFjY2Vzc29yXG4gICAqIGhhcyBib3RoIGEgc2V0dGVyIGFuZCBnZXR0ZXIsIGFueSBkZWNvcmF0b3JzIGFyZSBvbmx5IGF0dGFjaGVkIHRvIHRoZSBzZXR0ZXIgbWVtYmVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVycyhzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJbXXxudWxsIHtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWNjZXNzb3IpIHtcbiAgICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICAgIGNvbnN0IHNldHRlciA9IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5maW5kKHRzLmlzU2V0QWNjZXNzb3IpO1xuICAgICAgY29uc3QgZ2V0dGVyID0gc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmZpbmQodHMuaXNHZXRBY2Nlc3Nvcik7XG5cbiAgICAgIGNvbnN0IHNldHRlck1lbWJlciA9XG4gICAgICAgICAgc2V0dGVyICYmIHRoaXMucmVmbGVjdE1lbWJlcihzZXR0ZXIsIENsYXNzTWVtYmVyS2luZC5TZXR0ZXIsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICAgIGlmIChzZXR0ZXJNZW1iZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKHNldHRlck1lbWJlcik7XG5cbiAgICAgICAgLy8gUHJldmVudCBhdHRhY2hpbmcgdGhlIGRlY29yYXRvcnMgdG8gYSBwb3RlbnRpYWwgZ2V0dGVyLiBJbiBFUzIwMTUsIHdlIGNhbid0IHRlbGwgd2hlcmVcbiAgICAgICAgLy8gdGhlIGRlY29yYXRvcnMgd2VyZSBvcmlnaW5hbGx5IGF0dGFjaGVkIHRvLCBob3dldmVyIHdlIG9ubHkgd2FudCB0byBhdHRhY2ggdGhlbSB0byBhXG4gICAgICAgIC8vIHNpbmdsZSBgQ2xhc3NNZW1iZXJgIGFzIG90aGVyd2lzZSBuZ3RzYyB3b3VsZCBoYW5kbGUgdGhlIHNhbWUgZGVjb3JhdG9ycyB0d2ljZS5cbiAgICAgICAgZGVjb3JhdG9ycyA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZ2V0dGVyTWVtYmVyID1cbiAgICAgICAgICBnZXR0ZXIgJiYgdGhpcy5yZWZsZWN0TWVtYmVyKGdldHRlciwgQ2xhc3NNZW1iZXJLaW5kLkdldHRlciwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgICAgaWYgKGdldHRlck1lbWJlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goZ2V0dGVyTWVtYmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1lbWJlcnM7XG4gICAgfVxuXG4gICAgbGV0IGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsID0gbnVsbDtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuTWV0aG9kKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZDtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLlByb3BlcnR5KSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGUgPSBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiB8fCBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICAvLyBJZiB0aGUgc3ltYm9sIGhhcyBiZWVuIGltcG9ydGVkIGZyb20gYSBUeXBlU2NyaXB0IHR5cGluZ3MgZmlsZSB0aGVuIHRoZSBjb21waWxlclxuICAgICAgLy8gbWF5IHBhc3MgdGhlIGBwcm90b3R5cGVgIHN5bWJvbCBhcyBhbiBleHBvcnQgb2YgdGhlIGNsYXNzLlxuICAgICAgLy8gQnV0IHRoaXMgaGFzIG5vIGRlY2xhcmF0aW9uLiBJbiB0aGlzIGNhc2Ugd2UganVzdCBxdWlldGx5IGlnbm9yZSBpdC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlciA9IHRoaXMucmVmbGVjdE1lbWJlcihub2RlLCBraW5kLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgaWYgKCFtZW1iZXIpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBbbWVtYmVyXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZGVjbGFyYXRpb24gbm9kZSBmb3IgdGhlIG1lbWJlciB0byByZWZsZWN0IG92ZXIuXG4gICAqIEBwYXJhbSBraW5kIHRoZSBhc3N1bWVkIGtpbmQgb2YgdGhlIG1lbWJlciwgbWF5IGJlY29tZSBtb3JlIGFjY3VyYXRlIGR1cmluZyByZWZsZWN0aW9uLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVyKFxuICAgICAgbm9kZTogdHMuRGVjbGFyYXRpb24sIGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sXG4gICAgICBpc1N0YXRpYz86IGJvb2xlYW4pOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQgdmFsdWU6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWU6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZU5vZGU6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoIWlzQ2xhc3NNZW1iZXJUeXBlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoaXNTdGF0aWMgJiYgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBraW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHkgPyBub2RlLnBhcmVudC5yaWdodCA6IG51bGw7XG4gICAgfSBlbHNlIGlmIChpc1RoaXNBc3NpZ25tZW50KG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgICAgbmFtZSA9IG5vZGUubGVmdC5uYW1lLnRleHQ7XG4gICAgICB2YWx1ZSA9IG5vZGUucmlnaHQ7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkNvbnN0cnVjdG9yO1xuICAgICAgbmFtZSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChraW5kID09PSBudWxsKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKGBVbmtub3duIG1lbWJlciB0eXBlOiBcIiR7bm9kZS5nZXRUZXh0KCl9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGlmIChpc05hbWVkRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgICBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHdlIGhhdmUgc3RpbGwgbm90IGRldGVybWluZWQgaWYgdGhpcyBpcyBhIHN0YXRpYyBvciBpbnN0YW5jZSBtZW1iZXIgdGhlblxuICAgIC8vIGxvb2sgZm9yIHRoZSBgc3RhdGljYCBrZXl3b3JkIG9uIHRoZSBkZWNsYXJhdGlvblxuICAgIGlmIChpc1N0YXRpYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpc1N0YXRpYyA9IG5vZGUubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICBub2RlLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlOiB0cy5UeXBlTm9kZSA9IChub2RlIGFzIGFueSkudHlwZSB8fCBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICBub2RlLFxuICAgICAgaW1wbGVtZW50YXRpb246IG5vZGUsIGtpbmQsIHR5cGUsIG5hbWUsIG5hbWVOb2RlLCB2YWx1ZSwgaXNTdGF0aWMsXG4gICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVycyB3ZSB3YW50IHRvIGZpbmQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbmAgb2JqZWN0cyByZXByZXNlbnRpbmcgZWFjaCBvZiB0aGUgcGFyYW1ldGVycyBpblxuICAgKiB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvciBvciBudWxsIGlmIHRoZXJlIGlzIG5vIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOlxuICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXXxudWxsIHtcbiAgICBjb25zdCBtZW1iZXJzID0gY2xhc3NTeW1ib2wuaW1wbGVtZW50YXRpb24ubWVtYmVycztcbiAgICBpZiAobWVtYmVycyAmJiBtZW1iZXJzLmhhcyhDT05TVFJVQ1RPUikpIHtcbiAgICAgIGNvbnN0IGNvbnN0cnVjdG9yU3ltYm9sID0gbWVtYmVycy5nZXQoQ09OU1RSVUNUT1IpICE7XG4gICAgICAvLyBGb3Igc29tZSByZWFzb24gdGhlIGNvbnN0cnVjdG9yIGRvZXMgbm90IGhhdmUgYSBgdmFsdWVEZWNsYXJhdGlvbmAgPyE/XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9ucyAmJlxuICAgICAgICAgIGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9uc1swXSBhcyB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFjb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG4gICAgICBpZiAoY29uc3RydWN0b3IucGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgICAgfVxuICAgICAgaWYgKGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcikpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIGRlY29yYXRvcnMgb2YgYSBjbGFzcyBjb25zdHJ1Y3Rvci5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIHBhcmFtZXRlck5vZGVzIHRoZSBhcnJheSBvZiBUeXBlU2NyaXB0IHBhcmFtZXRlciBub2RlcyBmb3IgdGhpcyBjbGFzcydzIGNvbnN0cnVjdG9yLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgaW5mbyBvYmplY3RzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1JbmZvKFxuICAgICAgY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXM6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW10pOiBDdG9yUGFyYW1ldGVyW10ge1xuICAgIGNvbnN0IHtjb25zdHJ1Y3RvclBhcmFtSW5mb30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKGNsYXNzU3ltYm9sKTtcblxuICAgIHJldHVybiBwYXJhbWV0ZXJOb2Rlcy5tYXAoKG5vZGUsIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCB7ZGVjb3JhdG9ycywgdHlwZUV4cHJlc3Npb259ID0gY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdID9cbiAgICAgICAgICBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF0gOlxuICAgICAgICAgIHtkZWNvcmF0b3JzOiBudWxsLCB0eXBlRXhwcmVzc2lvbjogbnVsbH07XG4gICAgICBjb25zdCBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IGdldE5hbWVUZXh0KG5hbWVOb2RlKSxcbiAgICAgICAgbmFtZU5vZGUsXG4gICAgICAgIHR5cGVWYWx1ZVJlZmVyZW5jZTogdHlwZUV4cHJlc3Npb24gIT09IG51bGwgP1xuICAgICAgICAgICAge2xvY2FsOiB0cnVlIGFzIHRydWUsIGV4cHJlc3Npb246IHR5cGVFeHByZXNzaW9uLCBkZWZhdWx0SW1wb3J0U3RhdGVtZW50OiBudWxsfSA6XG4gICAgICAgICAgICBudWxsLFxuICAgICAgICB0eXBlTm9kZTogbnVsbCwgZGVjb3JhdG9yc1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyxcbiAgICogd2hlcmUgdGhlIGluZm9ybWF0aW9uIGlzIHN0b3JlZCBvbiBhIHN0YXRpYyBwcm9wZXJ0eSBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpbiBFU00yMDE1LCB0aGUgcHJvcGVydHkgaXMgZGVmaW5lZCBhbiBhcnJheSwgb3IgYnkgYW4gYXJyb3cgZnVuY3Rpb24gdGhhdCByZXR1cm5zXG4gICAqIGFuIGFycmF5LCBvZiBkZWNvcmF0b3IgYW5kIHR5cGUgaW5mb3JtYXRpb24uXG4gICAqXG4gICAqIEZvciBleGFtcGxlLFxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAgICogICB7dHlwZTogVmlld0NvbnRhaW5lclJlZn0sXG4gICAqICAge3R5cGU6IFRlbXBsYXRlUmVmfSxcbiAgICogICB7dHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTl19XX0sXG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBvclxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9IFtcbiAgICogICB7dHlwZTogVmlld0NvbnRhaW5lclJlZn0sXG4gICAqICAge3R5cGU6IFRlbXBsYXRlUmVmfSxcbiAgICogICB7dHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbe3R5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOXX1dfSxcbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSB0aGUgcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyB0aGUgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgZWFjaCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOiBQYXJhbUluZm9bXXxudWxsIHtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnMgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHBhcmFtRGVjb3JhdG9ycykge1xuICAgICAgLy8gVGhlIGRlY29yYXRvcnMgYXJyYXkgbWF5IGJlIHdyYXBwZWQgaW4gYW4gYXJyb3cgZnVuY3Rpb24uIElmIHNvIHVud3JhcCBpdC5cbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9XG4gICAgICAgICAgdHMuaXNBcnJvd0Z1bmN0aW9uKHBhcmFtRGVjb3JhdG9ycykgPyBwYXJhbURlY29yYXRvcnMuYm9keSA6IHBhcmFtRGVjb3JhdG9ycztcbiAgICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oY29udGFpbmVyKSkge1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IGNvbnRhaW5lci5lbGVtZW50cztcbiAgICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbClcbiAgICAgICAgICAgIC5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgdHlwZUV4cHJlc3Npb24gPVxuICAgICAgICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ3R5cGUnKSA/IHBhcmFtSW5mby5nZXQoJ3R5cGUnKSAhIDogbnVsbDtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ySW5mbyA9XG4gICAgICAgICAgICAgICAgICBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmhhcygnZGVjb3JhdG9ycycpID8gcGFyYW1JbmZvLmdldCgnZGVjb3JhdG9ycycpICEgOiBudWxsO1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9ySW5mbyAmJlxuICAgICAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKVxuICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAocGFyYW1EZWNvcmF0b3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICdJbnZhbGlkIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBkZWNvcmF0b3IgaW4gJyArXG4gICAgICAgICAgICAgICAgcGFyYW1EZWNvcmF0b3JzLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSArICc6XFxuJyxcbiAgICAgICAgICAgIHBhcmFtRGVjb3JhdG9ycy5nZXRUZXh0KCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggc3RhdGVtZW50cyByZWxhdGVkIHRvIHRoZSBnaXZlbiBjbGFzcyBmb3IgY2FsbHMgdG8gdGhlIHNwZWNpZmllZCBoZWxwZXIuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZXMgdGhlIG5hbWVzIG9mIHRoZSBoZWxwZXJzIChlLmcuIGBfX2RlY29yYXRlYCkgd2hvc2UgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWRcbiAgICogaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIENhbGxFeHByZXNzaW9uIG5vZGVzIGZvciBlYWNoIG1hdGNoaW5nIGhlbHBlciBjYWxsLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IE5nY2NDbGFzc1N5bWJvbCwgaGVscGVyTmFtZXM6IHN0cmluZ1tdKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9uW10ge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbClcbiAgICAgICAgLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5nZXRIZWxwZXJDYWxsKHN0YXRlbWVudCwgaGVscGVyTmFtZXMpKVxuICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIHRoYXQgbWF5IGNvbnRhaW4gY2FsbHMgdG8gYSBoZWxwZXIuXG4gICAqXG4gICAqIEluIEVTTTIwMTUgY29kZSB0aGUgaGVscGVyIGNhbGxzIGFyZSBpbiB0aGUgdG9wIGxldmVsIG1vZHVsZSwgc28gd2UgaGF2ZSB0byBjb25zaWRlclxuICAgKiBhbGwgdGhlIHN0YXRlbWVudHMgaW4gdGhlIG1vZHVsZS5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIHN0YXRlbWVudHMgdGhhdCBtYXkgY29udGFpbiBoZWxwZXIgY2FsbHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0U3RhdGVtZW50c0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBOZ2NjQ2xhc3NTeW1ib2wpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oY2xhc3NTeW1ib2wuZGVjbGFyYXRpb24udmFsdWVEZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuc3RhdGVtZW50cyk7XG4gIH1cblxuICAvKipcbiAgICogVGVzdCB3aGV0aGVyIGEgZGVjb3JhdG9yIHdhcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYC5cbiAgICpcbiAgICogSXMgdGhlIGRlY29yYXRvcjpcbiAgICogKiBleHRlcm5hbGx5IGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgP1xuICAgKiAqIHRoZSBjdXJyZW50IGhvc3RlZCBwcm9ncmFtIGlzIGFjdHVhbGx5IGBAYW5ndWxhci9jb3JlYCBhbmRcbiAgICogICAtIHJlbGF0aXZlbHkgaW50ZXJuYWxseSBpbXBvcnRlZDsgb3JcbiAgICogICAtIG5vdCBpbXBvcnRlZCwgZnJvbSB0aGUgY3VycmVudCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yIHRoZSBkZWNvcmF0b3IgdG8gdGVzdC5cbiAgICovXG4gIHByb3RlY3RlZCBpc0Zyb21Db3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuaXNDb3JlKSB7XG4gICAgICByZXR1cm4gIWRlY29yYXRvci5pbXBvcnQgfHwgL15cXC4vLnRlc3QoZGVjb3JhdG9yLmltcG9ydC5mcm9tKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICEhZGVjb3JhdG9yLmltcG9ydCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCBhbGwgdGhlIGNsYXNzIGRlY2xhcmF0aW9ucyBmcm9tIHRoZSBkdHNUeXBpbmdzIHByb2dyYW0sIHN0b3JpbmcgdGhlbSBpbiBhIG1hcFxuICAgKiB3aGVyZSB0aGUga2V5IGlzIHRoZSBkZWNsYXJlZCBuYW1lIG9mIHRoZSBjbGFzcyBhbmQgdGhlIHZhbHVlIGlzIHRoZSBkZWNsYXJhdGlvbiBpdHNlbGYuXG4gICAqXG4gICAqIEl0IGlzIHBvc3NpYmxlIGZvciB0aGVyZSB0byBiZSBtdWx0aXBsZSBjbGFzcyBkZWNsYXJhdGlvbnMgd2l0aCB0aGUgc2FtZSBsb2NhbCBuYW1lLlxuICAgKiBPbmx5IHRoZSBmaXJzdCBkZWNsYXJhdGlvbiB3aXRoIGEgZ2l2ZW4gbmFtZSBpcyBhZGRlZCB0byB0aGUgbWFwOyBzdWJzZXF1ZW50IGNsYXNzZXMgd2lsbCBiZVxuICAgKiBpZ25vcmVkLlxuICAgKlxuICAgKiBXZSBhcmUgbW9zdCBpbnRlcmVzdGVkIGluIGNsYXNzZXMgdGhhdCBhcmUgcHVibGljbHkgZXhwb3J0ZWQgZnJvbSB0aGUgZW50cnkgcG9pbnQsIHNvIHRoZXNlXG4gICAqIGFyZSBhZGRlZCB0byB0aGUgbWFwIGZpcnN0LCB0byBlbnN1cmUgdGhhdCB0aGV5IGFyZSBub3QgaWdub3JlZC5cbiAgICpcbiAgICogQHBhcmFtIGR0c1Jvb3RGaWxlTmFtZSBUaGUgZmlsZW5hbWUgb2YgdGhlIGVudHJ5LXBvaW50IHRvIHRoZSBgZHRzVHlwaW5nc2AgcHJvZ3JhbS5cbiAgICogQHBhcmFtIGR0c1Byb2dyYW0gVGhlIHByb2dyYW0gY29udGFpbmluZyBhbGwgdGhlIHR5cGluZ3MgZmlsZXMuXG4gICAqIEByZXR1cm5zIGEgbWFwIG9mIGNsYXNzIG5hbWVzIHRvIGNsYXNzIGRlY2xhcmF0aW9ucy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRHRzRGVjbGFyYXRpb25NYXAoXG4gICAgICBkdHNSb290RmlsZU5hbWU6IEFic29sdXRlRnNQYXRoLCBkdHNQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgZHRzUGFja2FnZTogQWJzb2x1dGVGc1BhdGgpOiBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uTWFwID0gbmV3IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPigpO1xuICAgIGNvbnN0IGNoZWNrZXIgPSBkdHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICAvLyBGaXJzdCBhZGQgYWxsIHRoZSBjbGFzc2VzIHRoYXQgYXJlIHB1YmxpY2x5IGV4cG9ydGVkIGZyb20gdGhlIGVudHJ5LXBvaW50XG4gICAgY29uc3Qgcm9vdEZpbGUgPSBkdHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZHRzUm9vdEZpbGVOYW1lKTtcbiAgICBpZiAoIXJvb3RGaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBnaXZlbiBmaWxlICR7ZHRzUm9vdEZpbGVOYW1lfSBpcyBub3QgcGFydCBvZiB0aGUgdHlwaW5ncyBwcm9ncmFtLmApO1xuICAgIH1cbiAgICBjb2xsZWN0RXhwb3J0ZWREZWNsYXJhdGlvbnMoY2hlY2tlciwgZHRzRGVjbGFyYXRpb25NYXAsIHJvb3RGaWxlKTtcblxuICAgIC8vIE5vdyBhZGQgYW55IGFkZGl0aW9uYWwgY2xhc3NlcyB0aGF0IGFyZSBleHBvcnRlZCBmcm9tIGluZGl2aWR1YWwgIGR0cyBmaWxlcyxcbiAgICAvLyBidXQgYXJlIG5vdCBwdWJsaWNseSBleHBvcnRlZCBmcm9tIHRoZSBlbnRyeS1wb2ludC5cbiAgICBkdHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzb3VyY2VGaWxlID0+IHtcbiAgICAgIGlmICghaXNXaXRoaW5QYWNrYWdlKGR0c1BhY2thZ2UsIHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbGxlY3RFeHBvcnRlZERlY2xhcmF0aW9ucyhjaGVja2VyLCBkdHNEZWNsYXJhdGlvbk1hcCwgc291cmNlRmlsZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGR0c0RlY2xhcmF0aW9uTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGEgZnVuY3Rpb24vbWV0aG9kIG5vZGUgKG9yIGl0cyBpbXBsZW1lbnRhdGlvbiksIHRvIHNlZSBpZiBpdCByZXR1cm5zIGFcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnNgIG9iamVjdC5cbiAgICogQHBhcmFtIG5hbWUgVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uLlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgbm9kZSB0byBjaGVjayAtIHRoaXMgY291bGQgYmUgYSBmdW5jdGlvbiwgYSBtZXRob2Qgb3IgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICogQHBhcmFtIGltcGxlbWVudGF0aW9uIHRoZSBhY3R1YWwgZnVuY3Rpb24gZXhwcmVzc2lvbiBpZiBgbm9kZWAgaXMgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICogQHBhcmFtIGNvbnRhaW5lciB0aGUgY2xhc3MgdGhhdCBjb250YWlucyB0aGUgZnVuY3Rpb24sIGlmIGl0IGlzIGEgbWV0aG9kLlxuICAgKiBAcmV0dXJucyBpbmZvIGFib3V0IHRoZSBmdW5jdGlvbiBpZiBpdCBkb2VzIHJldHVybiBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3Q7IGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKFxuICAgICAgbmFtZTogc3RyaW5nLCBub2RlOiB0cy5Ob2RlfG51bGwsIGltcGxlbWVudGF0aW9uOiB0cy5Ob2RlfG51bGwgPSBub2RlLFxuICAgICAgY29udGFpbmVyOiB0cy5EZWNsYXJhdGlvbnxudWxsID0gbnVsbCk6IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbnxudWxsIHtcbiAgICBpZiAoaW1wbGVtZW50YXRpb24gPT09IG51bGwgfHxcbiAgICAgICAgKCF0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24oaW1wbGVtZW50YXRpb24pICYmICF0cy5pc01ldGhvZERlY2xhcmF0aW9uKGltcGxlbWVudGF0aW9uKSAmJlxuICAgICAgICAgIXRzLmlzRnVuY3Rpb25FeHByZXNzaW9uKGltcGxlbWVudGF0aW9uKSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IGltcGxlbWVudGF0aW9uO1xuICAgIGNvbnN0IGRlZmluaXRpb24gPSB0aGlzLmdldERlZmluaXRpb25PZkZ1bmN0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGJvZHkgPSBkZWZpbml0aW9uLmJvZHk7XG4gICAgY29uc3QgbGFzdFN0YXRlbWVudCA9IGJvZHkgJiYgYm9keVtib2R5Lmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IHJldHVybkV4cHJlc3Npb24gPVxuICAgICAgICBsYXN0U3RhdGVtZW50ICYmIHRzLmlzUmV0dXJuU3RhdGVtZW50KGxhc3RTdGF0ZW1lbnQpICYmIGxhc3RTdGF0ZW1lbnQuZXhwcmVzc2lvbiB8fCBudWxsO1xuICAgIGNvbnN0IG5nTW9kdWxlUHJvcGVydHkgPSByZXR1cm5FeHByZXNzaW9uICYmIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocmV0dXJuRXhwcmVzc2lvbikgJiZcbiAgICAgICAgICAgIHJldHVybkV4cHJlc3Npb24ucHJvcGVydGllcy5maW5kKFxuICAgICAgICAgICAgICAgIHByb3AgPT5cbiAgICAgICAgICAgICAgICAgICAgISFwcm9wLm5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKHByb3AubmFtZSkgJiYgcHJvcC5uYW1lLnRleHQgPT09ICduZ01vZHVsZScpIHx8XG4gICAgICAgIG51bGw7XG5cbiAgICBpZiAoIW5nTW9kdWxlUHJvcGVydHkgfHwgIXRzLmlzUHJvcGVydHlBc3NpZ25tZW50KG5nTW9kdWxlUHJvcGVydHkpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBUaGUgbmdNb2R1bGVWYWx1ZSBjb3VsZCBiZSBvZiB0aGUgZm9ybSBgU29tZU1vZHVsZWAgb3IgYG5hbWVzcGFjZV8xLlNvbWVNb2R1bGVgXG4gICAgY29uc3QgbmdNb2R1bGVWYWx1ZSA9IG5nTW9kdWxlUHJvcGVydHkuaW5pdGlhbGl6ZXI7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIobmdNb2R1bGVWYWx1ZSkgJiYgIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5nTW9kdWxlVmFsdWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuZ01vZHVsZURlY2xhcmF0aW9uID0gdGhpcy5nZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihuZ01vZHVsZVZhbHVlKTtcbiAgICBpZiAoIW5nTW9kdWxlRGVjbGFyYXRpb24gfHwgbmdNb2R1bGVEZWNsYXJhdGlvbi5ub2RlID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENhbm5vdCBmaW5kIGEgZGVjbGFyYXRpb24gZm9yIE5nTW9kdWxlICR7bmdNb2R1bGVWYWx1ZS5nZXRUZXh0KCl9IHJlZmVyZW5jZWQgaW4gXCIke2RlY2xhcmF0aW9uIS5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG4gICAgaWYgKCFoYXNOYW1lSWRlbnRpZmllcihuZ01vZHVsZURlY2xhcmF0aW9uLm5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICBuZ01vZHVsZTogbmdNb2R1bGVEZWNsYXJhdGlvbiBhcyBDb25jcmV0ZURlY2xhcmF0aW9uPENsYXNzRGVjbGFyYXRpb24+LCBkZWNsYXJhdGlvbiwgY29udGFpbmVyXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXREZWNsYXJhdGlvbk9mRXhwcmVzc2lvbihleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihleHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZXhwcmVzc2lvbik7XG4gICAgfVxuXG4gICAgaWYgKCF0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihleHByZXNzaW9uKSB8fCAhdHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZURlY2wgPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGV4cHJlc3Npb24uZXhwcmVzc2lvbik7XG4gICAgaWYgKCFuYW1lc3BhY2VEZWNsIHx8IG5hbWVzcGFjZURlY2wubm9kZSA9PT0gbnVsbCB8fCAhdHMuaXNTb3VyY2VGaWxlKG5hbWVzcGFjZURlY2wubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZUV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShuYW1lc3BhY2VEZWNsLm5vZGUpO1xuICAgIGlmIChuYW1lc3BhY2VFeHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW5hbWVzcGFjZUV4cG9ydHMuaGFzKGV4cHJlc3Npb24ubmFtZS50ZXh0KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwb3J0RGVjbCA9IG5hbWVzcGFjZUV4cG9ydHMuZ2V0KGV4cHJlc3Npb24ubmFtZS50ZXh0KSAhO1xuICAgIHJldHVybiB7Li4uZXhwb3J0RGVjbCwgdmlhTW9kdWxlOiBuYW1lc3BhY2VEZWNsLnZpYU1vZHVsZX07XG4gIH1cbn1cblxuLy8vLy8vLy8vLy8vLyBFeHBvcnRlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuZXhwb3J0IHR5cGUgUGFyYW1JbmZvID0ge1xuICBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSB8IG51bGwsXG4gIHR5cGVFeHByZXNzaW9uOiB0cy5FeHByZXNzaW9uIHwgbnVsbFxufTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2FsbCB0byBgdHNsaWIuX19tZXRhZGF0YWAgYXMgcHJlc2VudCBpbiBgdHNsaWIuX19kZWNvcmF0ZWAgY2FsbHMuIFRoaXMgaXMgYVxuICogc3ludGhldGljIGRlY29yYXRvciBpbnNlcnRlZCBieSBUeXBlU2NyaXB0IHRoYXQgY29udGFpbnMgcmVmbGVjdGlvbiBpbmZvcm1hdGlvbiBhYm91dCB0aGVcbiAqIHRhcmdldCBvZiB0aGUgZGVjb3JhdG9yLCBpLmUuIHRoZSBjbGFzcyBvciBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJhbWV0ZXJUeXBlcyB7XG4gIHR5cGU6ICdwYXJhbXMnO1xuICB0eXBlczogdHMuRXhwcmVzc2lvbltdO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjYWxsIHRvIGB0c2xpYi5fX3BhcmFtYCBhcyBwcmVzZW50IGluIGB0c2xpYi5fX2RlY29yYXRlYCBjYWxscy4gVGhpcyBjb250YWluc1xuICogaW5mb3JtYXRpb24gb24gYW55IGRlY29yYXRvcnMgd2VyZSBhcHBsaWVkIHRvIGEgY2VydGFpbiBwYXJhbWV0ZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyRGVjb3JhdG9ycyB7XG4gIHR5cGU6ICdwYXJhbTpkZWNvcmF0b3JzJztcbiAgaW5kZXg6IG51bWJlcjtcbiAgZGVjb3JhdG9yOiBEZWNvcmF0b3I7XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNhbGwgdG8gYSBkZWNvcmF0b3IgYXMgaXQgd2FzIHByZXNlbnQgaW4gdGhlIG9yaWdpbmFsIHNvdXJjZSBjb2RlLCBhcyBwcmVzZW50IGluXG4gKiBgdHNsaWIuX19kZWNvcmF0ZWAgY2FsbHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVjb3JhdG9yQ2FsbCB7XG4gIHR5cGU6ICdkZWNvcmF0b3InO1xuICBkZWNvcmF0b3I6IERlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBkaWZmZXJlbnQga2luZHMgb2YgZGVjb3JhdGUgaGVscGVycyB0aGF0IG1heSBiZSBwcmVzZW50IGFzIGZpcnN0IGFyZ3VtZW50IHRvXG4gKiBgdHNsaWIuX19kZWNvcmF0ZWAsIGFzIGZvbGxvd3M6XG4gKlxuICogYGBgXG4gKiBfX2RlY29yYXRlKFtcbiAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICogICB0c2xpYl8xLl9fcGFyYW0oMiwgSW5qZWN0KElOSkVDVEVEX1RPS0VOKSksXG4gKiAgIHRzbGliXzEuX19tZXRhZGF0YShcImRlc2lnbjpwYXJhbXR5cGVzXCIsIFtWaWV3Q29udGFpbmVyUmVmLCBUZW1wbGF0ZVJlZiwgU3RyaW5nXSlcbiAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIERlY29yYXRlSGVscGVyRW50cnkgPSBQYXJhbWV0ZXJUeXBlcyB8IFBhcmFtZXRlckRlY29yYXRvcnMgfCBEZWNvcmF0b3JDYWxsO1xuXG4vKipcbiAqIFRoZSByZWNvcmRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gb2YgYSBzaW5nbGUgY2xhc3MuIFRoaXMgaW5mb3JtYXRpb24gaXMgY2FjaGVkIGluIHRoZSBob3N0LlxuICovXG5pbnRlcmZhY2UgRGVjb3JhdG9ySW5mbyB7XG4gIC8qKlxuICAgKiBBbGwgZGVjb3JhdG9ycyB0aGF0IHdlcmUgcHJlc2VudCBvbiB0aGUgY2xhc3MuIElmIG5vIGRlY29yYXRvcnMgd2VyZSBwcmVzZW50LCB0aGlzIGlzIGBudWxsYFxuICAgKi9cbiAgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsO1xuXG4gIC8qKlxuICAgKiBBbGwgZGVjb3JhdG9ycyBwZXIgbWVtYmVyIG9mIHRoZSBjbGFzcyB0aGV5IHdlcmUgcHJlc2VudCBvbi5cbiAgICovXG4gIG1lbWJlckRlY29yYXRvcnM6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPjtcblxuICAvKipcbiAgICogUmVwcmVzZW50cyB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVyIGluZm9ybWF0aW9uLCBzdWNoIGFzIHRoZSB0eXBlIG9mIGEgcGFyYW1ldGVyIGFuZCBhbGxcbiAgICogZGVjb3JhdG9ycyBmb3IgYSBjZXJ0YWluIHBhcmFtZXRlci4gSW5kaWNlcyBpbiB0aGlzIGFycmF5IGNvcnJlc3BvbmQgd2l0aCB0aGUgcGFyYW1ldGVyJ3NcbiAgICogaW5kZXggaW4gdGhlIGNvbnN0cnVjdG9yLiBOb3RlIHRoYXQgdGhpcyBhcnJheSBtYXkgYmUgc3BhcnNlLCBpLmUuIGNlcnRhaW4gY29uc3RydWN0b3JcbiAgICogcGFyYW1ldGVycyBtYXkgbm90IGhhdmUgYW55IGluZm8gcmVjb3JkZWQuXG4gICAqL1xuICBjb25zdHJ1Y3RvclBhcmFtSW5mbzogUGFyYW1JbmZvW107XG59XG5cbi8qKlxuICogQSBzdGF0ZW1lbnQgbm9kZSB0aGF0IHJlcHJlc2VudHMgYW4gYXNzaWdubWVudC5cbiAqL1xuZXhwb3J0IHR5cGUgQXNzaWdubWVudFN0YXRlbWVudCA9XG4gICAgdHMuRXhwcmVzc2lvblN0YXRlbWVudCAmIHtleHByZXNzaW9uOiB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259fTtcblxuLyoqXG4gKiBUZXN0IHdoZXRoZXIgYSBzdGF0ZW1lbnQgbm9kZSBpcyBhbiBhc3NpZ25tZW50IHN0YXRlbWVudC5cbiAqIEBwYXJhbSBzdGF0ZW1lbnQgdGhlIHN0YXRlbWVudCB0byB0ZXN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBc3NpZ25tZW50U3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogc3RhdGVtZW50IGlzIEFzc2lnbm1lbnRTdGF0ZW1lbnQge1xuICByZXR1cm4gdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNBc3NpZ25tZW50KHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBc3NpZ25tZW50KG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLkFzc2lnbm1lbnRFeHByZXNzaW9uPHRzLkVxdWFsc1Rva2VuPiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgbm9kZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW47XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgcHJvdmlkZWQgY2FsbCBleHByZXNzaW9uIHRhcmdldHMgYSBjbGFzcywgYnkgdmVyaWZ5aW5nIGl0cyBhcmd1bWVudHMgYXJlXG4gKiBhY2NvcmRpbmcgdG8gdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogX19kZWNvcmF0ZShbXSwgU29tZURpcmVjdGl2ZSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gY2FsbCB0aGUgY2FsbCBleHByZXNzaW9uIHRoYXQgaXMgdGVzdGVkIHRvIHJlcHJlc2VudCBhIGNsYXNzIGRlY29yYXRvciBjYWxsLlxuICogQHBhcmFtIGNsYXNzTmFtZSB0aGUgbmFtZSBvZiB0aGUgY2xhc3MgdGhhdCB0aGUgY2FsbCBuZWVkcyB0byBjb3JyZXNwb25kIHdpdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0NsYXNzRGVjb3JhdGVDYWxsKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uLCBjbGFzc05hbWU6IHN0cmluZyk6XG4gICAgY2FsbCBpcyB0cy5DYWxsRXhwcmVzc2lvbiZ7YXJndW1lbnRzOiBbdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbiwgdHMuRXhwcmVzc2lvbl19IHtcbiAgY29uc3QgaGVscGVyQXJncyA9IGNhbGwuYXJndW1lbnRzWzBdO1xuICBpZiAoaGVscGVyQXJncyA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oaGVscGVyQXJncykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCB0YXJnZXQgPSBjYWxsLmFyZ3VtZW50c1sxXTtcbiAgcmV0dXJuIHRhcmdldCAhPT0gdW5kZWZpbmVkICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpICYmIHRhcmdldC50ZXh0ID09PSBjbGFzc05hbWU7XG59XG5cbi8qKlxuICogVGVzdHMgd2hldGhlciB0aGUgcHJvdmlkZWQgY2FsbCBleHByZXNzaW9uIHRhcmdldHMgYSBtZW1iZXIgb2YgdGhlIGNsYXNzLCBieSB2ZXJpZnlpbmcgaXRzXG4gKiBhcmd1bWVudHMgYXJlIGFjY29yZGluZyB0byB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBfX2RlY29yYXRlKFtdLCBTb21lRGlyZWN0aXZlLnByb3RvdHlwZSwgXCJtZW1iZXJcIiwgdm9pZCAwKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBjYWxsIHRoZSBjYWxsIGV4cHJlc3Npb24gdGhhdCBpcyB0ZXN0ZWQgdG8gcmVwcmVzZW50IGEgbWVtYmVyIGRlY29yYXRvciBjYWxsLlxuICogQHBhcmFtIGNsYXNzTmFtZSB0aGUgbmFtZSBvZiB0aGUgY2xhc3MgdGhhdCB0aGUgY2FsbCBuZWVkcyB0byBjb3JyZXNwb25kIHdpdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01lbWJlckRlY29yYXRlQ2FsbChjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbiwgY2xhc3NOYW1lOiBzdHJpbmcpOlxuICAgIGNhbGwgaXMgdHMuQ2FsbEV4cHJlc3Npb24mXG4gICAge2FyZ3VtZW50czogW3RzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24sIHRzLlN0cmluZ0xpdGVyYWwsIHRzLlN0cmluZ0xpdGVyYWxdfSB7XG4gIGNvbnN0IGhlbHBlckFyZ3MgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgaWYgKGhlbHBlckFyZ3MgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGhlbHBlckFyZ3MpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgdGFyZ2V0ID0gY2FsbC5hcmd1bWVudHNbMV07XG4gIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24odGFyZ2V0KSB8fFxuICAgICAgIXRzLmlzSWRlbnRpZmllcih0YXJnZXQuZXhwcmVzc2lvbikgfHwgdGFyZ2V0LmV4cHJlc3Npb24udGV4dCAhPT0gY2xhc3NOYW1lIHx8XG4gICAgICB0YXJnZXQubmFtZS50ZXh0ICE9PSAncHJvdG90eXBlJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IG1lbWJlck5hbWUgPSBjYWxsLmFyZ3VtZW50c1syXTtcbiAgcmV0dXJuIG1lbWJlck5hbWUgIT09IHVuZGVmaW5lZCAmJiB0cy5pc1N0cmluZ0xpdGVyYWwobWVtYmVyTmFtZSk7XG59XG5cbi8qKlxuICogSGVscGVyIG1ldGhvZCB0byBleHRyYWN0IHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGdpdmVuIHRoZSBwcm9wZXJ0eSdzIFwic3ltYm9sXCIsXG4gKiB3aGljaCBpcyBhY3R1YWxseSB0aGUgc3ltYm9sIG9mIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHByb3BTeW1ib2w6IHRzLlN5bWJvbCk6IHRzLkV4cHJlc3Npb258dW5kZWZpbmVkIHtcbiAgY29uc3QgcHJvcElkZW50aWZpZXIgPSBwcm9wU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gIGNvbnN0IHBhcmVudCA9IHByb3BJZGVudGlmaWVyICYmIHByb3BJZGVudGlmaWVyLnBhcmVudDtcbiAgcmV0dXJuIHBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24ocGFyZW50KSA/IHBhcmVudC5yaWdodCA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBBIGNhbGxlZSBjb3VsZCBiZSBvbmUgb2Y6IGBfX2RlY29yYXRlKC4uLilgIG9yIGB0c2xpYl8xLl9fZGVjb3JhdGVgLlxuICovXG5mdW5jdGlvbiBnZXRDYWxsZWVOYW1lKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKGNhbGwuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gc3RyaXBEb2xsYXJTdWZmaXgoY2FsbC5leHByZXNzaW9uLnRleHQpO1xuICB9XG4gIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIHN0cmlwRG9sbGFyU3VmZml4KGNhbGwuZXhwcmVzc2lvbi5uYW1lLnRleHQpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vLy8vLy8vLy8vLy8vIEludGVybmFsIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4vKipcbiAqIEluIEVTMjAxNSwgYSBjbGFzcyBtYXkgYmUgZGVjbGFyZWQgdXNpbmcgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAqIGBgYFxuICpcbiAqIEhlcmUsIHRoZSBpbnRlcm1lZGlhdGUgYE15Q2xhc3NfMWAgYXNzaWdubWVudCBpcyBvcHRpb25hbC4gSW4gdGhlIGFib3ZlIGV4YW1wbGUsIHRoZVxuICogYGNsYXNzIE15Q2xhc3Mge31gIGV4cHJlc3Npb24gaXMgcmV0dXJuZWQgYXMgZGVjbGFyYXRpb24gb2YgYHZhciBNeUNsYXNzYC4gSWYgdGhlIHZhcmlhYmxlXG4gKiBpcyBub3QgaW5pdGlhbGl6ZWQgdXNpbmcgYSBjbGFzcyBleHByZXNzaW9uLCBudWxsIGlzIHJldHVybmVkLlxuICpcbiAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3Mgd2hvc2UgZGVjbGFyYXRpb24gd2UgYXJlIGZpbmRpbmcuXG4gKiBAcmV0dXJucyB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGNsYXNzIG9yIGBudWxsYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIuXG4gKi9cbmZ1bmN0aW9uIGdldElubmVyQ2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0V4cHJlc3Npb24+fG51bGwge1xuICBpZiAoIXRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSB8fCBub2RlLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJlY29nbml6ZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIG9mIHRoZSBmb3JtIGB2YXIgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge31gIG9yXG4gIC8vIGB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307YFxuICBsZXQgZXhwcmVzc2lvbiA9IG5vZGUuaW5pdGlhbGl6ZXI7XG4gIHdoaWxlIChpc0Fzc2lnbm1lbnQoZXhwcmVzc2lvbikpIHtcbiAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5yaWdodDtcbiAgfVxuXG4gIGlmICghdHMuaXNDbGFzc0V4cHJlc3Npb24oZXhwcmVzc2lvbikgfHwgIWhhc05hbWVJZGVudGlmaWVyKGV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gZXhwcmVzc2lvbjtcbn1cblxuZnVuY3Rpb24gZ2V0RGVjb3JhdG9yQXJncyhub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb25bXSB7XG4gIC8vIFRoZSBhcmd1bWVudHMgb2YgYSBkZWNvcmF0b3IgYXJlIGhlbGQgaW4gdGhlIGBhcmdzYCBwcm9wZXJ0eSBvZiBpdHMgZGVjbGFyYXRpb24gb2JqZWN0LlxuICBjb25zdCBhcmdzUHJvcGVydHkgPSBub2RlLnByb3BlcnRpZXMuZmlsdGVyKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQocHJvcGVydHkgPT4gZ2V0TmFtZVRleHQocHJvcGVydHkubmFtZSkgPT09ICdhcmdzJyk7XG4gIGNvbnN0IGFyZ3NFeHByZXNzaW9uID0gYXJnc1Byb3BlcnR5ICYmIGFyZ3NQcm9wZXJ0eS5pbml0aWFsaXplcjtcbiAgcmV0dXJuIGFyZ3NFeHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihhcmdzRXhwcmVzc2lvbikgP1xuICAgICAgQXJyYXkuZnJvbShhcmdzRXhwcmVzc2lvbi5lbGVtZW50cykgOlxuICAgICAgW107XG59XG5cbmZ1bmN0aW9uIGlzUHJvcGVydHlBY2Nlc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uJlxuICAgIHtwYXJlbnQ6IHRzLkJpbmFyeUV4cHJlc3Npb259IHtcbiAgcmV0dXJuICEhbm9kZS5wYXJlbnQgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUucGFyZW50KSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKTtcbn1cblxuZnVuY3Rpb24gaXNUaGlzQXNzaWdubWVudChub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufSB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0KSAmJlxuICAgICAgbm9kZS5sZWZ0LmV4cHJlc3Npb24ua2luZCA9PT0gdHMuU3ludGF4S2luZC5UaGlzS2V5d29yZDtcbn1cblxuZnVuY3Rpb24gaXNOYW1lZERlY2xhcmF0aW9uKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5OYW1lZERlY2xhcmF0aW9uJlxuICAgIHtuYW1lOiB0cy5JZGVudGlmaWVyfSB7XG4gIGNvbnN0IGFueU5vZGU6IGFueSA9IG5vZGU7XG4gIHJldHVybiAhIWFueU5vZGUubmFtZSAmJiB0cy5pc0lkZW50aWZpZXIoYW55Tm9kZS5uYW1lKTtcbn1cblxuXG5mdW5jdGlvbiBpc0NsYXNzTWVtYmVyVHlwZShub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXMgdHMuQ2xhc3NFbGVtZW50fFxuICAgIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbnx0cy5CaW5hcnlFeHByZXNzaW9uIHtcbiAgcmV0dXJuICh0cy5pc0NsYXNzRWxlbWVudChub2RlKSB8fCBpc1Byb3BlcnR5QWNjZXNzKG5vZGUpIHx8IHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSkgJiZcbiAgICAgIC8vIEFkZGl0aW9uYWxseSwgZW5zdXJlIGBub2RlYCBpcyBub3QgYW4gaW5kZXggc2lnbmF0dXJlLCBmb3IgZXhhbXBsZSBvbiBhbiBhYnN0cmFjdCBjbGFzczpcbiAgICAgIC8vIGBhYnN0cmFjdCBjbGFzcyBGb28geyBba2V5OiBzdHJpbmddOiBhbnk7IH1gXG4gICAgICAhdHMuaXNJbmRleFNpZ25hdHVyZURlY2xhcmF0aW9uKG5vZGUpO1xufVxuXG4vKipcbiAqIENvbGxlY3QgbWFwcGluZ3MgYmV0d2VlbiBleHBvcnRlZCBkZWNsYXJhdGlvbnMgaW4gYSBzb3VyY2UgZmlsZSBhbmQgaXRzIGFzc29jaWF0ZWRcbiAqIGRlY2xhcmF0aW9uIGluIHRoZSB0eXBpbmdzIHByb2dyYW0uXG4gKi9cbmZ1bmN0aW9uIGNvbGxlY3RFeHBvcnRlZERlY2xhcmF0aW9ucyhcbiAgICBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgZHRzRGVjbGFyYXRpb25NYXA6IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPixcbiAgICBzcmNGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gIGNvbnN0IHNyY01vZHVsZSA9IHNyY0ZpbGUgJiYgY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHNyY0ZpbGUpO1xuICBjb25zdCBtb2R1bGVFeHBvcnRzID0gc3JjTW9kdWxlICYmIGNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKHNyY01vZHVsZSk7XG4gIGlmIChtb2R1bGVFeHBvcnRzKSB7XG4gICAgbW9kdWxlRXhwb3J0cy5mb3JFYWNoKGV4cG9ydGVkU3ltYm9sID0+IHtcbiAgICAgIGlmIChleHBvcnRlZFN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkFsaWFzKSB7XG4gICAgICAgIGV4cG9ydGVkU3ltYm9sID0gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKGV4cG9ydGVkU3ltYm9sKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gZXhwb3J0ZWRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgIGNvbnN0IG5hbWUgPSBleHBvcnRlZFN5bWJvbC5uYW1lO1xuICAgICAgaWYgKGRlY2xhcmF0aW9uICYmICFkdHNEZWNsYXJhdGlvbk1hcC5oYXMobmFtZSkpIHtcbiAgICAgICAgZHRzRGVjbGFyYXRpb25NYXAuc2V0KG5hbWUsIGRlY2xhcmF0aW9uKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCB0aGUgZ2l2ZW4gZGVjbGFyYXRpb24gaXMgYXNzaWduZWQgdG8uXG4gKiBGb3IgZXhhbXBsZSwgZm9yIHRoZSBmb2xsb3dpbmcgY29kZTpcbiAqXG4gKiBgYGBcbiAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAqIGBgYFxuICpcbiAqIGFuZCB0aGUgcHJvdmlkZWQgZGVjbGFyYXRpb24gYmVpbmcgYGNsYXNzIE15Q2xhc3Mge31gLCB0aGlzIHdpbGwgcmV0dXJuIHRoZSBgdmFyIE15Q2xhc3NgXG4gKiBkZWNsYXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIGRlY2xhcmF0aW9uIGZvciB3aGljaCBhbnkgdmFyaWFibGUgZGVjbGFyYXRpb24gc2hvdWxkIGJlIG9idGFpbmVkLlxuICogQHJldHVybnMgdGhlIG91dGVyIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGlmIGZvdW5kLCB1bmRlZmluZWQgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBnZXRWYXJpYWJsZURlY2xhcmF0aW9uT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9ufFxuICAgIHVuZGVmaW5lZCB7XG4gIGxldCBub2RlID0gZGVjbGFyYXRpb24ucGFyZW50O1xuXG4gIC8vIERldGVjdCBhbiBpbnRlcm1lZGlhcnkgdmFyaWFibGUgYXNzaWdubWVudCBhbmQgc2tpcCBvdmVyIGl0LlxuICBpZiAoaXNBc3NpZ25tZW50KG5vZGUpICYmIHRzLmlzSWRlbnRpZmllcihub2RlLmxlZnQpKSB7XG4gICAgbm9kZSA9IG5vZGUucGFyZW50O1xuICB9XG5cbiAgcmV0dXJuIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSA/IG5vZGUgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBtYXkgaGF2ZSBiZWVuIFwic3ludGhlc2l6ZWRcIiBieSBUeXBlU2NyaXB0IGR1cmluZyBKYXZhU2NyaXB0IGVtaXQsXG4gKiBpbiB0aGUgY2FzZSBubyB1c2VyLWRlZmluZWQgY29uc3RydWN0b3IgZXhpc3RzIGFuZCBlLmcuIHByb3BlcnR5IGluaXRpYWxpemVycyBhcmUgdXNlZC5cbiAqIFRob3NlIGluaXRpYWxpemVycyBuZWVkIHRvIGJlIGVtaXR0ZWQgaW50byBhIGNvbnN0cnVjdG9yIGluIEphdmFTY3JpcHQsIHNvIHRoZSBUeXBlU2NyaXB0XG4gKiBjb21waWxlciBnZW5lcmF0ZXMgYSBzeW50aGV0aWMgY29uc3RydWN0b3IuXG4gKlxuICogV2UgbmVlZCB0byBpZGVudGlmeSBzdWNoIGNvbnN0cnVjdG9ycyBhcyBuZ2NjIG5lZWRzIHRvIGJlIGFibGUgdG8gdGVsbCBpZiBhIGNsYXNzIGRpZFxuICogb3JpZ2luYWxseSBoYXZlIGEgY29uc3RydWN0b3IgaW4gdGhlIFR5cGVTY3JpcHQgc291cmNlLiBXaGVuIGEgY2xhc3MgaGFzIGEgc3VwZXJjbGFzcyxcbiAqIGEgc3ludGhlc2l6ZWQgY29uc3RydWN0b3IgbXVzdCBub3QgYmUgY29uc2lkZXJlZCBhcyBhIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBhcyB0aGF0XG4gKiBwcmV2ZW50cyBhIGJhc2UgZmFjdG9yeSBjYWxsIGZyb20gYmVpbmcgY3JlYXRlZCBieSBuZ3RzYywgcmVzdWx0aW5nIGluIGEgZmFjdG9yeSBmdW5jdGlvblxuICogdGhhdCBkb2VzIG5vdCBpbmplY3QgdGhlIGRlcGVuZGVuY2llcyBvZiB0aGUgc3VwZXJjbGFzcy4gSGVuY2UsIHdlIGlkZW50aWZ5IGEgZGVmYXVsdFxuICogc3ludGhlc2l6ZWQgc3VwZXIgY2FsbCBpbiB0aGUgY29uc3RydWN0b3IgYm9keSwgYWNjb3JkaW5nIHRvIHRoZSBzdHJ1Y3R1cmUgdGhhdCBUeXBlU2NyaXB0XG4gKiBlbWl0cyBkdXJpbmcgSmF2YVNjcmlwdCBlbWl0OlxuICogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvdjMuMi4yL3NyYy9jb21waWxlci90cmFuc2Zvcm1lcnMvdHMudHMjTDEwNjgtTDEwODJcbiAqXG4gKiBAcGFyYW0gY29uc3RydWN0b3IgYSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB0byB0ZXN0XG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBjb25zdHJ1Y3RvciBhcHBlYXJzIHRvIGhhdmUgYmVlbiBzeW50aGVzaXplZFxuICovXG5mdW5jdGlvbiBpc1N5bnRoZXNpemVkQ29uc3RydWN0b3IoY29uc3RydWN0b3I6IHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgaWYgKCFjb25zdHJ1Y3Rvci5ib2R5KSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgZmlyc3RTdGF0ZW1lbnQgPSBjb25zdHJ1Y3Rvci5ib2R5LnN0YXRlbWVudHNbMF07XG4gIGlmICghZmlyc3RTdGF0ZW1lbnQgfHwgIXRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChmaXJzdFN0YXRlbWVudCkpIHJldHVybiBmYWxzZTtcblxuICByZXR1cm4gaXNTeW50aGVzaXplZFN1cGVyQ2FsbChmaXJzdFN0YXRlbWVudC5leHByZXNzaW9uKTtcbn1cblxuLyoqXG4gKiBUZXN0cyB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkIGJ5IFR5cGVTY3JpcHQsIGkuZS4gd2hldGhlclxuICogaXQgaXMgb2YgdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleHByZXNzaW9uIHRoZSBleHByZXNzaW9uIHRoYXQgaXMgdG8gYmUgdGVzdGVkXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBleHByZXNzaW9uIGFwcGVhcnMgdG8gYmUgYSBzeW50aGVzaXplZCBzdXBlciBjYWxsXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRTdXBlckNhbGwoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICBpZiAoIXRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikpIHJldHVybiBmYWxzZTtcbiAgaWYgKGV4cHJlc3Npb24uZXhwcmVzc2lvbi5raW5kICE9PSB0cy5TeW50YXhLaW5kLlN1cGVyS2V5d29yZCkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5hcmd1bWVudHMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgYXJndW1lbnQgPSBleHByZXNzaW9uLmFyZ3VtZW50c1swXTtcbiAgcmV0dXJuIHRzLmlzU3ByZWFkRWxlbWVudChhcmd1bWVudCkgJiYgdHMuaXNJZGVudGlmaWVyKGFyZ3VtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICBhcmd1bWVudC5leHByZXNzaW9uLnRleHQgPT09ICdhcmd1bWVudHMnO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlIHN0YXRlbWVudCB0aGF0IGNvbnRhaW5zIHRoZSBnaXZlbiBub2RlXG4gKiBAcGFyYW0gbm9kZSBhIG5vZGUgd2hvc2UgY29udGFpbmluZyBzdGF0ZW1lbnQgd2Ugd2lzaCB0byBmaW5kXG4gKi9cbmZ1bmN0aW9uIGdldENvbnRhaW5pbmdTdGF0ZW1lbnQobm9kZTogdHMuTm9kZSk6IHRzLkV4cHJlc3Npb25TdGF0ZW1lbnR8bnVsbCB7XG4gIHdoaWxlIChub2RlKSB7XG4gICAgaWYgKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChub2RlKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIG5vZGUgPSBub2RlLnBhcmVudDtcbiAgfVxuICByZXR1cm4gbm9kZSB8fCBudWxsO1xufVxuIl19