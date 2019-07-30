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
        define("@angular/compiler-cli/ngcc/src/host/esm2015_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/ngcc_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
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
            _this.dtsDeclarationMap = dts && _this.computeDtsDeclarationMap(dts.path, dts.program) || null;
            return _this;
        }
        /**
         * Find the declaration of a node that we think is a class.
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
         * @param node the node that represents the class whose declaration we are finding.
         * @returns the declaration of the class or `undefined` if it is not a "class".
         */
        Esm2015ReflectionHost.prototype.getClassDeclaration = function (node) {
            return getInnerClassDeclaration(node) || undefined;
        };
        /**
         * Find a symbol for a node that we think is a class.
         * @param node the node whose symbol we are finding.
         * @returns the symbol for the node or `undefined` if it is not a "class" or has no symbol.
         */
        Esm2015ReflectionHost.prototype.getClassSymbol = function (declaration) {
            var classDeclaration = this.getClassDeclaration(declaration);
            return classDeclaration &&
                this.checker.getSymbolAtLocation(classDeclaration.name);
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
            return _super.prototype.isClass.call(this, node) || !!this.getClassDeclaration(node);
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
            if (superDeclaration !== null) {
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
            if (aliasedDeclaration === null) {
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
            return symbol.exports && symbol.exports.get(propertyName);
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
            if (this.decoratorCache.has(classSymbol.valueDeclaration)) {
                return this.decoratorCache.get(classSymbol.valueDeclaration);
            }
            // First attempt extracting decorators from static properties.
            var decoratorInfo = this.computeDecoratorInfoFromStaticProperties(classSymbol);
            if (decoratorInfo === null) {
                // If none were present, use the `__decorate` helper calls instead.
                decoratorInfo = this.computeDecoratorInfoFromHelperCalls(classSymbol);
            }
            this.decoratorCache.set(classSymbol.valueDeclaration, decoratorInfo);
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
            if (symbol.members) {
                symbol.members.forEach(function (value, key) {
                    var decorators = decoratorsMap.get(key);
                    var reflectedMembers = _this.reflectMembers(value, decorators);
                    if (reflectedMembers) {
                        decoratorsMap.delete(key);
                        members.push.apply(members, tslib_1.__spread(reflectedMembers));
                    }
                });
            }
            // The static property map contains all the static properties
            if (symbol.exports) {
                symbol.exports.forEach(function (value, key) {
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
            var variableDeclaration = getVariableDeclarationOfDeclaration(symbol.valueDeclaration);
            if (variableDeclaration !== undefined) {
                var variableSymbol = this.checker.getSymbolAtLocation(variableDeclaration.name);
                if (variableSymbol && variableSymbol.exports) {
                    variableSymbol.exports.forEach(function (value, key) {
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
            if (classSymbol.members && classSymbol.members.has(exports.CONSTRUCTOR)) {
                var constructorSymbol = classSymbol.members.get(exports.CONSTRUCTOR);
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
            return Array.from(classSymbol.valueDeclaration.getSourceFile().statements);
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
        Esm2015ReflectionHost.prototype.computeDtsDeclarationMap = function (dtsRootFileName, dtsProgram) {
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
            dtsProgram.getSourceFiles().forEach(function (sourceFile) { collectExportedDeclarations(checker, dtsDeclarationMap, sourceFile); });
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
            if (!ngModuleDeclaration) {
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
     * `class MyClass {}` expression is returned as declaration of `MyClass`. Note that if `node`
     * represents a regular class declaration, it will be returned as-is.
     *
     * @param node the node that represents the class whose declaration we are finding.
     * @returns the declaration of the class or `null` if it is not a "class".
     */
    function getInnerClassDeclaration(node) {
        // Recognize a variable declaration of the form `var MyClass = class MyClass {}` or
        // `var MyClass = MyClass_1 = class MyClass {};`
        if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
            node = node.initializer;
            while (isAssignment(node)) {
                node = node.right;
            }
        }
        if (!ts.isClassDeclaration(node) && !ts.isClassExpression(node)) {
            return null;
        }
        return utils_1.hasNameIdentifier(node) ? node : null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUdqQyx5RUFBd047SUFHeE4sOERBQStGO0lBRS9GLDJFQUEySjtJQUU5SSxRQUFBLFVBQVUsR0FBRyxZQUEyQixDQUFDO0lBQ3pDLFFBQUEsZUFBZSxHQUFHLGdCQUErQixDQUFDO0lBQ2xELFFBQUEsV0FBVyxHQUFHLGVBQThCLENBQUM7SUFDN0MsUUFBQSxrQkFBa0IsR0FBRyxnQkFBK0IsQ0FBQztJQUVsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0EwQkc7SUFDSDtRQUEyQyxpREFBd0I7UUFpQ2pFLCtCQUNjLE1BQWMsRUFBWSxNQUFlLEVBQUUsT0FBdUIsRUFDNUUsR0FBd0I7WUFGNUIsWUFHRSxrQkFBTSxPQUFPLENBQUMsU0FFZjtZQUphLFlBQU0sR0FBTixNQUFNLENBQVE7WUFBWSxZQUFNLEdBQU4sTUFBTSxDQUFTO1lBL0J2RDs7ZUFFRztZQUNPLDZCQUF1QixHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBRTdEOzs7Ozs7Ozs7Ozs7OztlQWNHO1lBQ08sOEJBQXdCLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFOUU7Ozs7O2VBS0c7WUFDTyxvQkFBYyxHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFDO1lBTXBFLEtBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLElBQUksS0FBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQzs7UUFDL0YsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7Ozs7O1dBZ0JHO1FBQ0gsbURBQW1CLEdBQW5C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QyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUVwRCxJQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sRUFBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7WUFDdkUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDO0lBQy9DLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBDbGFzc1N5bWJvbCwgQ3RvclBhcmFtZXRlciwgRGVjbGFyYXRpb24sIERlY29yYXRvciwgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0LCBpc0RlY29yYXRvcklkZW50aWZpZXIsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtfSBmcm9tICcuLi9wYWNrYWdlcy9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge2ZpbmRBbGwsIGdldE5hbWVUZXh0LCBoYXNOYW1lSWRlbnRpZmllciwgaXNEZWZpbmVkLCBzdHJpcERvbGxhclN1ZmZpeH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbiwgTmdjY1JlZmxlY3Rpb25Ib3N0LCBQUkVfUjNfTUFSS0VSLCBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbiwgaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbn0gZnJvbSAnLi9uZ2NjX2hvc3QnO1xuXG5leHBvcnQgY29uc3QgREVDT1JBVE9SUyA9ICdkZWNvcmF0b3JzJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBQUk9QX0RFQ09SQVRPUlMgPSAncHJvcERlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IENPTlNUUlVDVE9SID0gJ19fY29uc3RydWN0b3InIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IENPTlNUUlVDVE9SX1BBUkFNUyA9ICdjdG9yUGFyYW1ldGVycycgYXMgdHMuX19TdHJpbmc7XG5cbi8qKlxuICogRXNtMjAxNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgMjAxNSBjbGFzc2VzLCBldGMuXG4gKiBEZWNvcmF0b3JzIGFyZSBkZWZpbmVkIHZpYSBzdGF0aWMgcHJvcGVydGllcyBvbiB0aGUgY2xhc3MuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogY2xhc3MgU29tZURpcmVjdGl2ZSB7XG4gKiB9XG4gKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gKiAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gKiAgIFwiaW5wdXQxXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqICAgXCJpbnB1dDJcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogfTtcbiAqIGBgYFxuICpcbiAqICogQ2xhc3NlcyBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICovXG5leHBvcnQgY2xhc3MgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IGV4dGVuZHMgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IGltcGxlbWVudHMgTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgcHJvdGVjdGVkIGR0c0RlY2xhcmF0aW9uTWFwOiBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj58bnVsbDtcblxuICAvKipcbiAgICogVGhlIHNldCBvZiBzb3VyY2UgZmlsZXMgdGhhdCBoYXZlIGFscmVhZHkgYmVlbiBwcmVwcm9jZXNzZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJlcHJvY2Vzc2VkU291cmNlRmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgLyoqXG4gICAqIEluIEVTMjAxNSwgY2xhc3MgZGVjbGFyYXRpb25zIG1heSBoYXZlIGJlZW4gZG93bi1sZXZlbGVkIGludG8gdmFyaWFibGUgZGVjbGFyYXRpb25zLFxuICAgKiBpbml0aWFsaXplZCB1c2luZyBhIGNsYXNzIGV4cHJlc3Npb24uIEluIGNlcnRhaW4gc2NlbmFyaW9zLCBhbiBhZGRpdGlvbmFsIHZhcmlhYmxlXG4gICAqIGlzIGludHJvZHVjZWQgdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyBzbyB0aGF0IHJlc3VsdHMgaW4gY29kZSBzdWNoIGFzOlxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IE15Q2xhc3NfMTsgbGV0IE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhpcyBtYXAgdHJhY2tzIHRob3NlIGFsaWFzZWQgdmFyaWFibGVzIHRvIHRoZWlyIG9yaWdpbmFsIGlkZW50aWZpZXIsIGkuZS4gdGhlIGtleVxuICAgKiBjb3JyZXNwb25kcyB3aXRoIHRoZSBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc18xYCBhbmQgaXRzIHZhbHVlIGJlY29tZXMgdGhlIGBNeUNsYXNzYCBpZGVudGlmaWVyXG4gICAqIG9mIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogVGhpcyBtYXAgaXMgcG9wdWxhdGVkIGR1cmluZyB0aGUgcHJlcHJvY2Vzc2luZyBvZiBlYWNoIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHRzLklkZW50aWZpZXI+KCk7XG5cbiAgLyoqXG4gICAqIENhY2hlcyB0aGUgaW5mb3JtYXRpb24gb2YgdGhlIGRlY29yYXRvcnMgb24gYSBjbGFzcywgYXMgdGhlIHdvcmsgaW52b2x2ZWQgd2l0aCBleHRyYWN0aW5nXG4gICAqIGRlY29yYXRvcnMgaXMgY29tcGxleCBhbmQgZnJlcXVlbnRseSB1c2VkLlxuICAgKlxuICAgKiBUaGlzIG1hcCBpcyBsYXppbHkgcG9wdWxhdGVkIGR1cmluZyB0aGUgZmlyc3QgY2FsbCB0byBgYWNxdWlyZURlY29yYXRvckluZm9gIGZvciBhIGdpdmVuIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGRlY29yYXRvckNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3JJbmZvPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIGxvZ2dlcjogTG9nZ2VyLCBwcm90ZWN0ZWQgaXNDb3JlOiBib29sZWFuLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIGR0cz86IEJ1bmRsZVByb2dyYW18bnVsbCkge1xuICAgIHN1cGVyKGNoZWNrZXIpO1xuICAgIHRoaXMuZHRzRGVjbGFyYXRpb25NYXAgPSBkdHMgJiYgdGhpcy5jb21wdXRlRHRzRGVjbGFyYXRpb25NYXAoZHRzLnBhdGgsIGR0cy5wcm9ncmFtKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9uIG9mIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIENsYXNzZXMgc2hvdWxkIGhhdmUgYSBgbmFtZWAgaWRlbnRpZmllciwgYmVjYXVzZSB0aGV5IG1heSBuZWVkIHRvIGJlIHJlZmVyZW5jZWQgaW4gb3RoZXIgcGFydHNcbiAgICogb2YgdGhlIHByb2dyYW0uXG4gICAqXG4gICAqIEluIEVTMjAxNSwgYSBjbGFzcyBtYXkgYmUgZGVjbGFyZWQgdXNpbmcgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZTpcbiAgICpcbiAgICogYGBgXG4gICAqIHZhciBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtcbiAgICogYGBgXG4gICAqXG4gICAqIEhlcmUsIHRoZSBpbnRlcm1lZGlhdGUgYE15Q2xhc3NfMWAgYXNzaWdubWVudCBpcyBvcHRpb25hbC4gSW4gdGhlIGFib3ZlIGV4YW1wbGUsIHRoZVxuICAgKiBgY2xhc3MgTXlDbGFzcyB7fWAgbm9kZSBpcyByZXR1cm5lZCBhcyBkZWNsYXJhdGlvbiBvZiBgTXlDbGFzc2AuXG4gICAqXG4gICAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHRoYXQgcmVwcmVzZW50cyB0aGUgY2xhc3Mgd2hvc2UgZGVjbGFyYXRpb24gd2UgYXJlIGZpbmRpbmcuXG4gICAqIEByZXR1cm5zIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3Mgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiLlxuICAgKi9cbiAgZ2V0Q2xhc3NEZWNsYXJhdGlvbihub2RlOiB0cy5Ob2RlKTogQ2xhc3NEZWNsYXJhdGlvbnx1bmRlZmluZWQge1xuICAgIHJldHVybiBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24obm9kZSkgfHwgdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiIG9yIGhhcyBubyBzeW1ib2wuXG4gICAqL1xuICBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuTm9kZSk6IENsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IHRoaXMuZ2V0Q2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgcmV0dXJuIGNsYXNzRGVjbGFyYXRpb24gJiZcbiAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oY2xhc3NEZWNsYXJhdGlvbi5uYW1lKSBhcyBDbGFzc1N5bWJvbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gKGZvciBleGFtcGxlLCBvZiBhIGNsYXNzIG9yIGZ1bmN0aW9uKSBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGFueVxuICAgKiBkZWNvcmF0b3JzIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG9yIGZ1bmN0aW9uIG92ZXJcbiAgICogd2hpY2ggdG8gcmVmbGVjdC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBpbnRlbnQgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGFuZCB0aGVcbiAgICogc291cmNlIGlzIGluIEVTNiBmb3JtYXQsIHRoaXMgd2lsbCBiZSBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBub2RlLiBJZiB0aGUgc291cmNlIGlzIGluIEVTNVxuICAgKiBmb3JtYXQsIHRoaXMgbWlnaHQgYmUgYSBgdHMuVmFyaWFibGVEZWNsYXJhdGlvbmAgYXMgY2xhc3NlcyBpbiBFUzUgYXJlIHJlcHJlc2VudGVkIGFzIHRoZVxuICAgKiByZXN1bHQgb2YgYW4gSUlGRSBleGVjdXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBEZWNvcmF0b3JgIG1ldGFkYXRhIGlmIGRlY29yYXRvcnMgYXJlIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLCBvclxuICAgKiBgbnVsbGAgaWYgZWl0aGVyIG5vIGRlY29yYXRvcnMgd2VyZSBwcmVzZW50IG9yIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyBub3Qgb2YgYSBkZWNvcmF0YWJsZSB0eXBlLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgaWYgKCFzeW1ib2wpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBDbGFzc01lbWJlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBtZW1iZXJzIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldE1lbWJlcnNPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHRlZCB0byBnZXQgbWVtYmVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldE1lbWJlcnNPZlN5bWJvbChjbGFzc1N5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgaXRzIHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIG9ubHkgbG9va3MgYXQgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MgZGlyZWN0bHkgYW5kIG5vdCBhdCBhbnkgaW5oZXJpdGVkXG4gICAqIGNvbnN0cnVjdG9ycy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgUGFyYW1ldGVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIHBhcmFtZXRlcnMgb2YgdGhlIGNvbnN0cnVjdG9yLCBpZlxuICAgKiBhIGNvbnN0cnVjdG9yIGV4aXN0cy4gSWYgdGhlIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgaGFzIDAgcGFyYW1ldGVycywgdGhpcyBhcnJheSB3aWxsIGJlIGVtcHR5LlxuICAgKiBJZiB0aGUgY2xhc3MgaGFzIG5vIGNvbnN0cnVjdG9yLCB0aGlzIG1ldGhvZCByZXR1cm5zIGBudWxsYC5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IEN0b3JQYXJhbWV0ZXJbXXxudWxsIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQXR0ZW1wdGVkIHRvIGdldCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgbm9uLWNsYXNzOiBcIiR7Y2xhenouZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIGNvbnN0IHBhcmFtZXRlck5vZGVzID0gdGhpcy5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbCk7XG4gICAgaWYgKHBhcmFtZXRlck5vZGVzKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhjbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXMpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGhhc0Jhc2VDbGFzcyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHN1cGVySGFzQmFzZUNsYXNzID0gc3VwZXIuaGFzQmFzZUNsYXNzKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJIYXNCYXNlQ2xhc3MpIHtcbiAgICAgIHJldHVybiBzdXBlckhhc0Jhc2VDbGFzcztcbiAgICB9XG5cbiAgICBjb25zdCBpbm5lckNsYXNzRGVjbGFyYXRpb24gPSBnZXRJbm5lckNsYXNzRGVjbGFyYXRpb24oY2xhenopO1xuICAgIGlmIChpbm5lckNsYXNzRGVjbGFyYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXIuaGFzQmFzZUNsYXNzKGlubmVyQ2xhc3NEZWNsYXJhdGlvbik7XG4gIH1cblxuICBnZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBGaXJzdCB0cnkgZ2V0dGluZyB0aGUgYmFzZSBjbGFzcyBmcm9tIHRoZSBcIm91dGVyXCIgZGVjbGFyYXRpb25cbiAgICBjb25zdCBzdXBlckJhc2VDbGFzc0lkZW50aWZpZXIgPSBzdXBlci5nZXRCYXNlQ2xhc3NFeHByZXNzaW9uKGNsYXp6KTtcbiAgICBpZiAoc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyKSB7XG4gICAgICByZXR1cm4gc3VwZXJCYXNlQ2xhc3NJZGVudGlmaWVyO1xuICAgIH1cbiAgICAvLyBUaGF0IGRpZG4ndCB3b3JrIHNvIG5vdyB0cnkgZ2V0dGluZyBpdCBmcm9tIHRoZSBcImlubmVyXCIgZGVjbGFyYXRpb24uXG4gICAgY29uc3QgaW5uZXJDbGFzc0RlY2xhcmF0aW9uID0gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoaW5uZXJDbGFzc0RlY2xhcmF0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyLmdldEJhc2VDbGFzc0V4cHJlc3Npb24oaW5uZXJDbGFzc0RlY2xhcmF0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiBub2RlIGFjdHVhbGx5IHJlcHJlc2VudHMgYSBjbGFzcy5cbiAgICovXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbiB7XG4gICAgcmV0dXJuIHN1cGVyLmlzQ2xhc3Mobm9kZSkgfHwgISF0aGlzLmdldENsYXNzRGVjbGFyYXRpb24obm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogVHJhY2UgYW4gaWRlbnRpZmllciB0byBpdHMgZGVjbGFyYXRpb24sIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhdHRlbXB0cyB0byByZXNvbHZlIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgZ2l2ZW4gaWRlbnRpZmllciwgdHJhY2luZyBiYWNrIHRocm91Z2hcbiAgICogaW1wb3J0cyBhbmQgcmUtZXhwb3J0cyB1bnRpbCB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gc3RhdGVtZW50IGlzIGZvdW5kLiBBIGBEZWNsYXJhdGlvbmBcbiAgICogb2JqZWN0IGlzIHJldHVybmVkIGlmIHRoZSBvcmlnaW5hbCBkZWNsYXJhdGlvbiBpcyBmb3VuZCwgb3IgYG51bGxgIGlzIHJldHVybmVkIG90aGVyd2lzZS5cbiAgICpcbiAgICogSW4gRVMyMDE1LCB3ZSBuZWVkIHRvIGFjY291bnQgZm9yIGlkZW50aWZpZXJzIHRoYXQgcmVmZXIgdG8gYWxpYXNlZCBjbGFzcyBkZWNsYXJhdGlvbnMgc3VjaCBhc1xuICAgKiBgTXlDbGFzc18xYC4gU2luY2Ugc3VjaCBkZWNsYXJhdGlvbnMgYXJlIG9ubHkgYXZhaWxhYmxlIHdpdGhpbiB0aGUgbW9kdWxlIGl0c2VsZiwgd2UgbmVlZCB0b1xuICAgKiBmaW5kIHRoZSBvcmlnaW5hbCBjbGFzcyBkZWNsYXJhdGlvbiwgZS5nLiBgTXlDbGFzc2AsIHRoYXQgaXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBhbGlhc2VkIG9uZS5cbiAgICpcbiAgICogQHBhcmFtIGlkIGEgVHlwZVNjcmlwdCBgdHMuSWRlbnRpZmllcmAgdG8gdHJhY2UgYmFjayB0byBhIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBtZXRhZGF0YSBhYm91dCB0aGUgYERlY2xhcmF0aW9uYCBpZiB0aGUgb3JpZ2luYWwgZGVjbGFyYXRpb24gaXMgZm91bmQsIG9yIGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBnZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IERlY2xhcmF0aW9ufG51bGwge1xuICAgIGNvbnN0IHN1cGVyRGVjbGFyYXRpb24gPSBzdXBlci5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihpZCk7XG5cbiAgICAvLyBUaGUgaWRlbnRpZmllciBtYXkgaGF2ZSBiZWVuIG9mIGFuIGFkZGl0aW9uYWwgY2xhc3MgYXNzaWdubWVudCBzdWNoIGFzIGBNeUNsYXNzXzFgIHRoYXQgd2FzXG4gICAgLy8gcHJlc2VudCBhcyBhbGlhcyBmb3IgYE15Q2xhc3NgLiBJZiBzbywgcmVzb2x2ZSBzdWNoIGFsaWFzZXMgdG8gdGhlaXIgb3JpZ2luYWwgZGVjbGFyYXRpb24uXG4gICAgaWYgKHN1cGVyRGVjbGFyYXRpb24gIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gdGhpcy5yZXNvbHZlQWxpYXNlZENsYXNzSWRlbnRpZmllcihzdXBlckRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgaWYgKGFsaWFzZWRJZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldERlY2xhcmF0aW9uT2ZJZGVudGlmaWVyKGFsaWFzZWRJZGVudGlmaWVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VwZXJEZWNsYXJhdGlvbjtcbiAgfVxuXG4gIC8qKiBHZXRzIGFsbCBkZWNvcmF0b3JzIG9mIHRoZSBnaXZlbiBjbGFzcyBzeW1ib2wuICovXG4gIGdldERlY29yYXRvcnNPZlN5bWJvbChzeW1ib2w6IENsYXNzU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qge2NsYXNzRGVjb3JhdG9yc30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKHN5bWJvbCk7XG4gICAgcmV0dXJuIGNsYXNzRGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIG1vZHVsZSBmb3IgdmFyaWFibGUgZGVjbGFyYXRpb25zIGluIHdoaWNoIHRoZSBpbml0aWFsaXplclxuICAgKiBpcyBhbiBpZGVudGlmaWVyIG1hcmtlZCB3aXRoIHRoZSBgUFJFX1IzX01BUktFUmAuXG4gICAqIEBwYXJhbSBtb2R1bGUgdGhlIG1vZHVsZSBpbiB3aGljaCB0byBzZWFyY2ggZm9yIHN3aXRjaGFibGUgZGVjbGFyYXRpb25zLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgdGhhdCBtYXRjaC5cbiAgICovXG4gIGdldFN3aXRjaGFibGVEZWNsYXJhdGlvbnMobW9kdWxlOiB0cy5Ob2RlKTogU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb25bXSB7XG4gICAgLy8gRG9uJ3QgYm90aGVyIHRvIHdhbGsgdGhlIEFTVCBpZiB0aGUgbWFya2VyIGlzIG5vdCBmb3VuZCBpbiB0aGUgdGV4dFxuICAgIHJldHVybiBtb2R1bGUuZ2V0VGV4dCgpLmluZGV4T2YoUFJFX1IzX01BUktFUikgPj0gMCA/XG4gICAgICAgIGZpbmRBbGwobW9kdWxlLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uKSA6XG4gICAgICAgIFtdO1xuICB9XG5cbiAgZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdmFsdWUgPSBzdXBlci5nZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBXZSBoYXZlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCBoYXMgbm8gaW5pdGlhbGl6ZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gdmFyIEh0dHBDbGllbnRYc3JmTW9kdWxlXzE7XG4gICAgLy8gYGBgXG4gICAgLy9cbiAgICAvLyBTbyBsb29rIGZvciB0aGUgc3BlY2lhbCBzY2VuYXJpbyB3aGVyZSB0aGUgdmFyaWFibGUgaXMgYmVpbmcgYXNzaWduZWQgaW5cbiAgICAvLyBhIG5lYXJieSBzdGF0ZW1lbnQgdG8gdGhlIHJldHVybiB2YWx1ZSBvZiBhIGNhbGwgdG8gYF9fZGVjb3JhdGVgLlxuICAgIC8vIFRoZW4gZmluZCB0aGUgMm5kIGFyZ3VtZW50IG9mIHRoYXQgY2FsbCwgdGhlIFwidGFyZ2V0XCIsIHdoaWNoIHdpbGwgYmUgdGhlXG4gICAgLy8gYWN0dWFsIGNsYXNzIGlkZW50aWZpZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gSHR0cENsaWVudFhzcmZNb2R1bGUgPSBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xID0gdHNsaWJfMS5fX2RlY29yYXRlKFtcbiAgICAvLyAgIE5nTW9kdWxlKHtcbiAgICAvLyAgICAgcHJvdmlkZXJzOiBbXSxcbiAgICAvLyAgIH0pXG4gICAgLy8gXSwgSHR0cENsaWVudFhzcmZNb2R1bGUpO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gQW5kIGZpbmFsbHksIGZpbmQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBpZGVudGlmaWVyIGluIHRoYXQgYXJndW1lbnQuXG4gICAgLy8gTm90ZSBhbHNvIHRoYXQgdGhlIGFzc2lnbm1lbnQgY2FuIG9jY3VyIHdpdGhpbiBhbm90aGVyIGFzc2lnbm1lbnQuXG4gICAgLy9cbiAgICBjb25zdCBibG9jayA9IGRlY2xhcmF0aW9uLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgIGlmIChzeW1ib2wgJiYgKHRzLmlzQmxvY2soYmxvY2spIHx8IHRzLmlzU291cmNlRmlsZShibG9jaykpKSB7XG4gICAgICBjb25zdCBkZWNvcmF0ZUNhbGwgPSB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKGJsb2NrLCBzeW1ib2wpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZGVjb3JhdGVDYWxsICYmIGRlY29yYXRlQ2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodGFyZ2V0ICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHRhcmdldCk7XG4gICAgICAgIGNvbnN0IHRhcmdldERlY2xhcmF0aW9uID0gdGFyZ2V0U3ltYm9sICYmIHRhcmdldFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgICBpZiAodGFyZ2V0RGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSB8fFxuICAgICAgICAgICAgICB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGp1c3QgYSBmdW5jdGlvbiBvciBjbGFzcyBkZWNsYXJhdGlvblxuICAgICAgICAgICAgLy8gc28gcmV0dXJuIGl0cyBpZGVudGlmaWVyIGFzIHRoZSB2YXJpYWJsZSB2YWx1ZS5cbiAgICAgICAgICAgIHJldHVybiB0YXJnZXREZWNsYXJhdGlvbi5uYW1lIHx8IG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sIHNvIGZpbmQgdGhlIGZhciByaWdodCBleHByZXNzaW9uLFxuICAgICAgICAgICAgLy8gaW4gdGhlIGNhc2Ugb2YgbXVsdGlwbGUgYXNzaWdubWVudHMgKGUuZy4gYHZhcjEgPSB2YXIyID0gdmFsdWVgKS5cbiAgICAgICAgICAgIGxldCB0YXJnZXRWYWx1ZSA9IHRhcmdldERlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgd2hpbGUgKHRhcmdldFZhbHVlICYmIGlzQXNzaWdubWVudCh0YXJnZXRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgdGFyZ2V0VmFsdWUgPSB0YXJnZXRWYWx1ZS5yaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0YXJnZXRWYWx1ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRvcC1sZXZlbCBjbGFzcyBzeW1ib2xzIGluIHRoZSBnaXZlbiBmaWxlLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgc291cmNlIGZpbGUgdG8gc2VhcmNoIGZvciBjbGFzc2VzLlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBjbGFzcyBzeW1ib2xzLlxuICAgKi9cbiAgZmluZENsYXNzU3ltYm9scyhzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogQ2xhc3NTeW1ib2xbXSB7XG4gICAgY29uc3QgY2xhc3NlczogQ2xhc3NTeW1ib2xbXSA9IFtdO1xuICAgIHRoaXMuZ2V0TW9kdWxlU3RhdGVtZW50cyhzb3VyY2VGaWxlKS5mb3JFYWNoKHN0YXRlbWVudCA9PiB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NTeW1ib2wpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdGF0ZW1lbnQpKSB7XG4gICAgICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChzdGF0ZW1lbnQpO1xuICAgICAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NTeW1ib2wpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGNsYXNzZXM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBudW1iZXIgb2YgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgb2YgYSBnaXZlbiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycyBvZiB0aGUgY2xhc3MsIGlmIGtub3duLCBvciBgbnVsbGAgaWYgdGhlIGRlY2xhcmF0aW9uXG4gICAqIGlzIG5vdCBhIGNsYXNzIG9yIGhhcyBhbiB1bmtub3duIG51bWJlciBvZiB0eXBlIHBhcmFtZXRlcnMuXG4gICAqL1xuICBnZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogbnVtYmVyfG51bGwge1xuICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5nZXREdHNEZWNsYXJhdGlvbihjbGF6eik7XG4gICAgaWYgKGR0c0RlY2xhcmF0aW9uICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkdHNEZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiBkdHNEZWNsYXJhdGlvbi50eXBlUGFyYW1ldGVycyA/IGR0c0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzLmxlbmd0aCA6IDA7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRha2UgYW4gZXhwb3J0ZWQgZGVjbGFyYXRpb24gb2YgYSBjbGFzcyAobWF5YmUgZG93bi1sZXZlbGVkIHRvIGEgdmFyaWFibGUpIGFuZCBsb29rIHVwIHRoZVxuICAgKiBkZWNsYXJhdGlvbiBvZiBpdHMgdHlwZSBpbiBhIHNlcGFyYXRlIC5kLnRzIHRyZWUuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gaXMgYWxsb3dlZCB0byByZXR1cm4gYG51bGxgIGlmIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgZG9lcyBub3QgaGF2ZSBhXG4gICAqIHNlcGFyYXRlIC5kLnRzIHRyZWUuIFdoZW4gY29tcGlsaW5nIFR5cGVTY3JpcHQgY29kZSB0aGlzIGlzIGFsd2F5cyB0aGUgY2FzZSwgc2luY2UgLmQudHMgZmlsZXNcbiAgICogYXJlIHByb2R1Y2VkIG9ubHkgZHVyaW5nIHRoZSBlbWl0IG9mIHN1Y2ggYSBjb21waWxhdGlvbi4gV2hlbiBjb21waWxpbmcgLmpzIGNvZGUsIGhvd2V2ZXIsXG4gICAqIHRoZXJlIGlzIGZyZXF1ZW50bHkgYSBwYXJhbGxlbCAuZC50cyB0cmVlIHdoaWNoIHRoaXMgbWV0aG9kIGV4cG9zZXMuXG4gICAqXG4gICAqIE5vdGUgdGhhdCB0aGUgYHRzLkNsYXNzRGVjbGFyYXRpb25gIHJldHVybmVkIGZyb20gdGhpcyBmdW5jdGlvbiBtYXkgbm90IGJlIGZyb20gdGhlIHNhbWVcbiAgICogYHRzLlByb2dyYW1gIGFzIHRoZSBpbnB1dCBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldER0c0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY2xhcmF0aW9ufG51bGwge1xuICAgIGlmICghdGhpcy5kdHNEZWNsYXJhdGlvbk1hcCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICghaXNOYW1lZERlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgZ2V0IHRoZSBkdHMgZmlsZSBmb3IgYSBkZWNsYXJhdGlvbiB0aGF0IGhhcyBubyBuYW1lOiAke2RlY2xhcmF0aW9uLmdldFRleHQoKX0gaW4gJHtkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmR0c0RlY2xhcmF0aW9uTWFwLmhhcyhkZWNsYXJhdGlvbi5uYW1lLnRleHQpID9cbiAgICAgICAgdGhpcy5kdHNEZWNsYXJhdGlvbk1hcC5nZXQoZGVjbGFyYXRpb24ubmFtZS50ZXh0KSAhIDpcbiAgICAgICAgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIHNvdXJjZSBmaWxlIGZvciBleHBvcnRlZCBmdW5jdGlvbnMgYW5kIHN0YXRpYyBjbGFzcyBtZXRob2RzIHRoYXQgcmV0dXJuXG4gICAqIE1vZHVsZVdpdGhQcm92aWRlcnMgb2JqZWN0cy5cbiAgICogQHBhcmFtIGYgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgdGhlc2UgZnVuY3Rpb25zXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGZ1bmN0aW9uIGRlY2xhcmF0aW9ucyB0aGF0IGxvb2sgbGlrZSB0aGV5IHJldHVybiBNb2R1bGVXaXRoUHJvdmlkZXJzXG4gICAqIG9iamVjdHMuXG4gICAqL1xuICBnZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGY6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSB7XG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKGYpO1xuICAgIGlmICghZXhwb3J0cykgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGluZm9zOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSA9IFtdO1xuICAgIGV4cG9ydHMuZm9yRWFjaCgoZGVjbGFyYXRpb24sIG5hbWUpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzQ2xhc3MoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgdGhpcy5nZXRNZW1iZXJzT2ZDbGFzcyhkZWNsYXJhdGlvbi5ub2RlKS5mb3JFYWNoKG1lbWJlciA9PiB7XG4gICAgICAgICAgaWYgKG1lbWJlci5pc1N0YXRpYykge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHRoaXMucGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKFxuICAgICAgICAgICAgICAgIG1lbWJlci5uYW1lLCBtZW1iZXIubm9kZSwgbWVtYmVyLmltcGxlbWVudGF0aW9uLCBkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICAgIGluZm9zLnB1c2goaW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgICBjb25zdCBpbmZvID1cbiAgICAgICAgICAgICAgdGhpcy5wYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoZGVjbGFyYXRpb24ubm9kZS5uYW1lLnRleHQsIGRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICBpbmZvcy5wdXNoKGluZm8pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBpbmZvcztcbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8gUHJvdGVjdGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgaWRlbnRpZmllciBvZiB0aGUgYWN0dWFsIGNsYXNzIGRlY2xhcmF0aW9uIGZvciBhIHBvdGVudGlhbGx5IGFsaWFzZWQgZGVjbGFyYXRpb24gb2YgYVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogSWYgdGhlIGdpdmVuIGRlY2xhcmF0aW9uIGlzIGZvciBhbiBhbGlhcyBvZiBhIGNsYXNzLCB0aGlzIGZ1bmN0aW9uIHdpbGwgZGV0ZXJtaW5lIGFuIGlkZW50aWZpZXJcbiAgICogdG8gdGhlIG9yaWdpbmFsIGRlY2xhcmF0aW9uIHRoYXQgcmVwcmVzZW50cyB0aGlzIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gVGhlIGRlY2xhcmF0aW9uIHRvIHJlc29sdmUuXG4gICAqIEByZXR1cm5zIFRoZSBvcmlnaW5hbCBpZGVudGlmaWVyIHRoYXQgdGhlIGdpdmVuIGNsYXNzIGRlY2xhcmF0aW9uIHJlc29sdmVzIHRvLCBvciBgdW5kZWZpbmVkYFxuICAgKiBpZiB0aGUgZGVjbGFyYXRpb24gZG9lcyBub3QgcmVwcmVzZW50IGFuIGFsaWFzZWQgY2xhc3MuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZUFsaWFzZWRDbGFzc0lkZW50aWZpZXIoZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuSWRlbnRpZmllcnxudWxsIHtcbiAgICB0aGlzLmVuc3VyZVByZXByb2Nlc3NlZChkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIHJldHVybiB0aGlzLmFsaWFzZWRDbGFzc0RlY2xhcmF0aW9ucy5oYXMoZGVjbGFyYXRpb24pID9cbiAgICAgICAgdGhpcy5hbGlhc2VkQ2xhc3NEZWNsYXJhdGlvbnMuZ2V0KGRlY2xhcmF0aW9uKSAhIDpcbiAgICAgICAgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmVzIHRoYXQgdGhlIHNvdXJjZSBmaWxlIHRoYXQgYG5vZGVgIGlzIHBhcnQgb2YgaGFzIGJlZW4gcHJlcHJvY2Vzc2VkLlxuICAgKlxuICAgKiBEdXJpbmcgcHJlcHJvY2Vzc2luZywgYWxsIHN0YXRlbWVudHMgaW4gdGhlIHNvdXJjZSBmaWxlIHdpbGwgYmUgdmlzaXRlZCBzdWNoIHRoYXQgY2VydGFpblxuICAgKiBwcm9jZXNzaW5nIHN0ZXBzIGNhbiBiZSBkb25lIHVwLWZyb250IGFuZCBjYWNoZWQgZm9yIHN1YnNlcXVlbnQgdXNhZ2VzLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgc291cmNlIGZpbGUgdGhhdCBuZWVkcyB0byBoYXZlIGdvbmUgdGhyb3VnaCBwcmVwcm9jZXNzaW5nLlxuICAgKi9cbiAgcHJvdGVjdGVkIGVuc3VyZVByZXByb2Nlc3NlZChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnByZXByb2Nlc3NlZFNvdXJjZUZpbGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgdGhpcy5wcmVwcm9jZXNzZWRTb3VyY2VGaWxlcy5hZGQoc291cmNlRmlsZSk7XG5cbiAgICAgIGZvciAoY29uc3Qgc3RhdGVtZW50IG9mIHNvdXJjZUZpbGUuc3RhdGVtZW50cykge1xuICAgICAgICB0aGlzLnByZXByb2Nlc3NTdGF0ZW1lbnQoc3RhdGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQW5hbHl6ZXMgdGhlIGdpdmVuIHN0YXRlbWVudCB0byBzZWUgaWYgaXQgY29ycmVzcG9uZHMgd2l0aCBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIGxpa2VcbiAgICogYGxldCBNeUNsYXNzID0gTXlDbGFzc18xID0gY2xhc3MgTXlDbGFzcyB7fTtgLiBJZiBzbywgdGhlIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzXzFgXG4gICAqIGlzIGFzc29jaWF0ZWQgd2l0aCB0aGUgYE15Q2xhc3NgIGlkZW50aWZpZXIuXG4gICAqXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgVGhlIHN0YXRlbWVudCB0aGF0IG5lZWRzIHRvIGJlIHByZXByb2Nlc3NlZC5cbiAgICovXG4gIHByb3RlY3RlZCBwcmVwcm9jZXNzU3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogdm9pZCB7XG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPSBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucztcbiAgICBpZiAoZGVjbGFyYXRpb25zLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gZGVjbGFyYXRpb25zWzBdO1xuICAgIGNvbnN0IGluaXRpYWxpemVyID0gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXI7XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbGFyYXRpb24ubmFtZSkgfHwgIWluaXRpYWxpemVyIHx8ICFpc0Fzc2lnbm1lbnQoaW5pdGlhbGl6ZXIpIHx8XG4gICAgICAgICF0cy5pc0lkZW50aWZpZXIoaW5pdGlhbGl6ZXIubGVmdCkgfHwgIXRzLmlzQ2xhc3NFeHByZXNzaW9uKGluaXRpYWxpemVyLnJpZ2h0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFsaWFzZWRJZGVudGlmaWVyID0gaW5pdGlhbGl6ZXIubGVmdDtcblxuICAgIGNvbnN0IGFsaWFzZWREZWNsYXJhdGlvbiA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoYWxpYXNlZElkZW50aWZpZXIpO1xuICAgIGlmIChhbGlhc2VkRGVjbGFyYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVW5hYmxlIHRvIGxvY2F0ZSBkZWNsYXJhdGlvbiBvZiAke2FsaWFzZWRJZGVudGlmaWVyLnRleHR9IGluIFwiJHtzdGF0ZW1lbnQuZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIHRoaXMuYWxpYXNlZENsYXNzRGVjbGFyYXRpb25zLnNldChhbGlhc2VkRGVjbGFyYXRpb24ubm9kZSwgZGVjbGFyYXRpb24ubmFtZSk7XG4gIH1cblxuICAvKiogR2V0IHRoZSB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgYSBtb2R1bGUuXG4gICAqXG4gICAqIEluIEVTNSBhbmQgRVMyMDE1IHRoaXMgaXMganVzdCB0aGUgdG9wIGxldmVsIHN0YXRlbWVudHMgb2YgdGhlIGZpbGUuXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBtb2R1bGUgd2hvc2Ugc3RhdGVtZW50cyB3ZSB3YW50LlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiB0b3AgbGV2ZWwgc3RhdGVtZW50cyBmb3IgdGhlIGdpdmVuIG1vZHVsZS5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNb2R1bGVTdGF0ZW1lbnRzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5TdGF0ZW1lbnRbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oc291cmNlRmlsZS5zdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXYWxrIHRoZSBBU1QgbG9va2luZyBmb3IgYW4gYXNzaWdubWVudCB0byB0aGUgc3BlY2lmaWVkIHN5bWJvbC5cbiAgICogQHBhcmFtIG5vZGUgVGhlIGN1cnJlbnQgbm9kZSB3ZSBhcmUgc2VhcmNoaW5nLlxuICAgKiBAcmV0dXJucyBhbiBleHByZXNzaW9uIHRoYXQgcmVwcmVzZW50cyB0aGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLCBvciB1bmRlZmluZWQgaWYgbm9uZSBjYW4gYmVcbiAgICogZm91bmQuXG4gICAqL1xuICBwcm90ZWN0ZWQgZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUobm9kZTogdHMuTm9kZXx1bmRlZmluZWQsIHN5bWJvbDogdHMuU3ltYm9sKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghbm9kZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgbm9kZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pIHtcbiAgICAgIGNvbnN0IGxlZnQgPSBub2RlLmxlZnQ7XG4gICAgICBjb25zdCByaWdodCA9IG5vZGUucmlnaHQ7XG4gICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGxlZnQpICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGxlZnQpID09PSBzeW1ib2wpIHtcbiAgICAgICAgcmV0dXJuICh0cy5pc0NhbGxFeHByZXNzaW9uKHJpZ2h0KSAmJiBnZXRDYWxsZWVOYW1lKHJpZ2h0KSA9PT0gJ19fZGVjb3JhdGUnKSA/IHJpZ2h0IDogbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKHJpZ2h0LCBzeW1ib2wpO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZS5mb3JFYWNoQ2hpbGQobm9kZSA9PiB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKG5vZGUsIHN5bWJvbCkpIHx8IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJldHJpZXZlIHRoZSBzeW1ib2wgb2YgYSBzdGF0aWMgcHJvcGVydHkgb24gYSBjbGFzcy5cbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcHJvcGVydHkgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEBwYXJhbSBwcm9wZXJ0eU5hbWUgdGhlIG5hbWUgb2Ygc3RhdGljIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGlmIGl0IGlzIGZvdW5kIG9yIGB1bmRlZmluZWRgIGlmIG5vdC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0aWNQcm9wZXJ0eShzeW1ib2w6IENsYXNzU3ltYm9sLCBwcm9wZXJ0eU5hbWU6IHRzLl9fU3RyaW5nKTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHN5bWJvbC5leHBvcnRzICYmIHN5bWJvbC5leHBvcnRzLmdldChwcm9wZXJ0eU5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgZm9yIG9idGFpbmluZyBpbmZvcm1hdGlvbiBvbiB0aGUgZGVjb3JhdG9ycyBvZiBhIGdpdmVuIGNsYXNzLiBUaGlzXG4gICAqIGluZm9ybWF0aW9uIGlzIGNvbXB1dGVkIGVpdGhlciBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzIGlmIHByZXNlbnQsIG9yIHVzaW5nIGB0c2xpYi5fX2RlY29yYXRlYFxuICAgKiBoZWxwZXIgY2FsbHMgb3RoZXJ3aXNlLiBUaGUgY29tcHV0ZWQgcmVzdWx0IGlzIGNhY2hlZCBwZXIgY2xhc3MuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3MgZm9yIHdoaWNoIGRlY29yYXRvcnMgc2hvdWxkIGJlIGFjcXVpcmVkLlxuICAgKiBAcmV0dXJucyBhbGwgaW5mb3JtYXRpb24gb2YgdGhlIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFjcXVpcmVEZWNvcmF0b3JJbmZvKGNsYXNzU3ltYm9sOiBDbGFzc1N5bWJvbCk6IERlY29yYXRvckluZm8ge1xuICAgIGlmICh0aGlzLmRlY29yYXRvckNhY2hlLmhhcyhjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVjb3JhdG9yQ2FjaGUuZ2V0KGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pICE7XG4gICAgfVxuXG4gICAgLy8gRmlyc3QgYXR0ZW1wdCBleHRyYWN0aW5nIGRlY29yYXRvcnMgZnJvbSBzdGF0aWMgcHJvcGVydGllcy5cbiAgICBsZXQgZGVjb3JhdG9ySW5mbyA9IHRoaXMuY29tcHV0ZURlY29yYXRvckluZm9Gcm9tU3RhdGljUHJvcGVydGllcyhjbGFzc1N5bWJvbCk7XG4gICAgaWYgKGRlY29yYXRvckluZm8gPT09IG51bGwpIHtcbiAgICAgIC8vIElmIG5vbmUgd2VyZSBwcmVzZW50LCB1c2UgdGhlIGBfX2RlY29yYXRlYCBoZWxwZXIgY2FsbHMgaW5zdGVhZC5cbiAgICAgIGRlY29yYXRvckluZm8gPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sKTtcbiAgICB9XG5cbiAgICB0aGlzLmRlY29yYXRvckNhY2hlLnNldChjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uLCBkZWNvcmF0b3JJbmZvKTtcbiAgICByZXR1cm4gZGVjb3JhdG9ySW5mbztcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0cyB0byBjb21wdXRlIGRlY29yYXRvciBpbmZvcm1hdGlvbiBmcm9tIHN0YXRpYyBwcm9wZXJ0aWVzIFwiZGVjb3JhdG9yc1wiLCBcInByb3BEZWNvcmF0b3JzXCJcbiAgICogYW5kIFwiY3RvclBhcmFtZXRlcnNcIiBvbiB0aGUgY2xhc3MuIElmIG5laXRoZXIgb2YgdGhlc2Ugc3RhdGljIHByb3BlcnRpZXMgaXMgcHJlc2VudCB0aGVcbiAgICogbGlicmFyeSBpcyBsaWtlbHkgbm90IGNvbXBpbGVkIHVzaW5nIHRzaWNrbGUgZm9yIHVzYWdlIHdpdGggQ2xvc3VyZSBjb21waWxlciwgaW4gd2hpY2ggY2FzZVxuICAgKiBgbnVsbGAgaXMgcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCBUaGUgY2xhc3Mgc3ltYm9sIHRvIGNvbXB1dGUgdGhlIGRlY29yYXRvcnMgaW5mb3JtYXRpb24gZm9yLlxuICAgKiBAcmV0dXJucyBBbGwgaW5mb3JtYXRpb24gb24gdGhlIGRlY29yYXRvcnMgYXMgZXh0cmFjdGVkIGZyb20gc3RhdGljIHByb3BlcnRpZXMsIG9yIGBudWxsYCBpZlxuICAgKiBub25lIG9mIHRoZSBzdGF0aWMgcHJvcGVydGllcyBleGlzdC5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRGVjb3JhdG9ySW5mb0Zyb21TdGF0aWNQcm9wZXJ0aWVzKGNsYXNzU3ltYm9sOiBDbGFzc1N5bWJvbCk6IERlY29yYXRvckluZm98bnVsbCB7XG4gICAgbGV0IGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCA9IG51bGw7XG4gICAgbGV0IG1lbWJlckRlY29yYXRvcnM6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPnxudWxsID0gbnVsbDtcbiAgICBsZXQgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdfG51bGwgPSBudWxsO1xuXG4gICAgY29uc3QgZGVjb3JhdG9yc1Byb3BlcnR5ID0gdGhpcy5nZXRTdGF0aWNQcm9wZXJ0eShjbGFzc1N5bWJvbCwgREVDT1JBVE9SUyk7XG4gICAgaWYgKGRlY29yYXRvcnNQcm9wZXJ0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjbGFzc0RlY29yYXRvcnMgPSB0aGlzLmdldENsYXNzRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIH1cblxuICAgIGNvbnN0IHByb3BEZWNvcmF0b3JzUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBQUk9QX0RFQ09SQVRPUlMpO1xuICAgIGlmIChwcm9wRGVjb3JhdG9yc1Byb3BlcnR5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG1lbWJlckRlY29yYXRvcnMgPSB0aGlzLmdldE1lbWJlckRlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkocHJvcERlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgfVxuXG4gICAgY29uc3QgY29uc3RydWN0b3JQYXJhbXNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIENPTlNUUlVDVE9SX1BBUkFNUyk7XG4gICAgaWYgKGNvbnN0cnVjdG9yUGFyYW1zUHJvcGVydHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3RydWN0b3JQYXJhbUluZm8gPSB0aGlzLmdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShjb25zdHJ1Y3RvclBhcmFtc1Byb3BlcnR5KTtcbiAgICB9XG5cbiAgICAvLyBJZiBub25lIG9mIHRoZSBzdGF0aWMgcHJvcGVydGllcyB3ZXJlIHByZXNlbnQsIG5vIGRlY29yYXRvciBpbmZvIGNvdWxkIGJlIGNvbXB1dGVkLlxuICAgIGlmIChjbGFzc0RlY29yYXRvcnMgPT09IG51bGwgJiYgbWVtYmVyRGVjb3JhdG9ycyA9PT0gbnVsbCAmJiBjb25zdHJ1Y3RvclBhcmFtSW5mbyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNsYXNzRGVjb3JhdG9ycyxcbiAgICAgIG1lbWJlckRlY29yYXRvcnM6IG1lbWJlckRlY29yYXRvcnMgfHwgbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpLFxuICAgICAgY29uc3RydWN0b3JQYXJhbUluZm86IGNvbnN0cnVjdG9yUGFyYW1JbmZvIHx8IFtdLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBjbGFzcyBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MsIHdoZXJlIHRoZSBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZFxuICAgKiB2aWEgYSBzdGF0aWMgcHJvcGVydHkuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNTeW1ib2wgdGhlIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGRlY29yYXRvcnMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgb3IgbnVsbCBpZiBub25lIHdoZXJlIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzU3ltYm9sOiB0cy5TeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzSWRlbnRpZmllciA9IGRlY29yYXRvcnNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoZGVjb3JhdG9yc0lkZW50aWZpZXIgJiYgZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSB7XG4gICAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkgJiZcbiAgICAgICAgICBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICAgIC8vIEFTVCBvZiB0aGUgYXJyYXkgb2YgZGVjb3JhdG9yIHZhbHVlc1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzQXJyYXkgPSBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQucmlnaHQ7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheSlcbiAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIHN5bWJvbCB3aGljaCBzaG91bGQgYmUgb2YgYSBjbGFzcywgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBpdHMgbWVtYmVycy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgYENsYXNzU3ltYm9sYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlcnNPZlN5bWJvbChzeW1ib2w6IENsYXNzU3ltYm9sKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuXG4gICAgLy8gVGhlIGRlY29yYXRvcnMgbWFwIGNvbnRhaW5zIGFsbCB0aGUgcHJvcGVydGllcyB0aGF0IGFyZSBkZWNvcmF0ZWRcbiAgICBjb25zdCB7bWVtYmVyRGVjb3JhdG9yc30gPSB0aGlzLmFjcXVpcmVEZWNvcmF0b3JJbmZvKHN5bWJvbCk7XG5cbiAgICAvLyBNYWtlIGEgY29weSBvZiB0aGUgZGVjb3JhdG9ycyBhcyBzdWNjZXNzZnVsbHkgcmVmbGVjdGVkIG1lbWJlcnMgZGVsZXRlIHRoZW1zZWx2ZXMgZnJvbSB0aGVcbiAgICAvLyBtYXAsIHNvIHRoYXQgYW55IGxlZnRvdmVycyBjYW4gYmUgZWFzaWx5IGRlYWx0IHdpdGguXG4gICAgY29uc3QgZGVjb3JhdG9yc01hcCA9IG5ldyBNYXAobWVtYmVyRGVjb3JhdG9ycyk7XG5cbiAgICAvLyBUaGUgbWVtYmVyIG1hcCBjb250YWlucyBhbGwgdGhlIG1ldGhvZCAoaW5zdGFuY2UgYW5kIHN0YXRpYyk7IGFuZCBhbnkgaW5zdGFuY2UgcHJvcGVydGllc1xuICAgIC8vIHRoYXQgYXJlIGluaXRpYWxpemVkIGluIHRoZSBjbGFzcy5cbiAgICBpZiAoc3ltYm9sLm1lbWJlcnMpIHtcbiAgICAgIHN5bWJvbC5tZW1iZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgc3RhdGljIHByb3BlcnR5IG1hcCBjb250YWlucyBhbGwgdGhlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgaWYgKHN5bWJvbC5leHBvcnRzKSB7XG4gICAgICBzeW1ib2wuZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBjbGFzcyB3YXMgZGVjbGFyZWQgYXMgYSBWYXJpYWJsZURlY2xhcmF0aW9uIHRoZW4gaXQgbWF5IGhhdmUgc3RhdGljIHByb3BlcnRpZXNcbiAgICAvLyBhdHRhY2hlZCB0byB0aGUgdmFyaWFibGUgcmF0aGVyIHRoYW4gdGhlIGNsYXNzIGl0c2VsZlxuICAgIC8vIEZvciBleGFtcGxlOlxuICAgIC8vIGBgYFxuICAgIC8vIGxldCBNeUNsYXNzID0gY2xhc3MgTXlDbGFzcyB7XG4gICAgLy8gICAvLyBubyBzdGF0aWMgcHJvcGVydGllcyBoZXJlIVxuICAgIC8vIH1cbiAgICAvLyBNeUNsYXNzLnN0YXRpY1Byb3BlcnR5ID0gLi4uO1xuICAgIC8vIGBgYFxuICAgIGNvbnN0IHZhcmlhYmxlRGVjbGFyYXRpb24gPSBnZXRWYXJpYWJsZURlY2xhcmF0aW9uT2ZEZWNsYXJhdGlvbihzeW1ib2wudmFsdWVEZWNsYXJhdGlvbik7XG4gICAgaWYgKHZhcmlhYmxlRGVjbGFyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgdmFyaWFibGVTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih2YXJpYWJsZURlY2xhcmF0aW9uLm5hbWUpO1xuICAgICAgaWYgKHZhcmlhYmxlU3ltYm9sICYmIHZhcmlhYmxlU3ltYm9sLmV4cG9ydHMpIHtcbiAgICAgICAgdmFyaWFibGVTeW1ib2wuZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIGNvbnN0IHJlZmxlY3RlZE1lbWJlcnMgPSB0aGlzLnJlZmxlY3RNZW1iZXJzKHZhbHVlLCBkZWNvcmF0b3JzLCB0cnVlKTtcbiAgICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgICBtZW1iZXJzLnB1c2goLi4ucmVmbGVjdGVkTWVtYmVycyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWFsIHdpdGggYW55IGRlY29yYXRlZCBwcm9wZXJ0aWVzIHRoYXQgd2VyZSBub3QgaW5pdGlhbGl6ZWQgaW4gdGhlIGNsYXNzXG4gICAgZGVjb3JhdG9yc01hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICBpbXBsZW1lbnRhdGlvbjogbnVsbCxcbiAgICAgICAgZGVjb3JhdG9yczogdmFsdWUsXG4gICAgICAgIGlzU3RhdGljOiBmYWxzZSxcbiAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5LFxuICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICBub2RlOiBudWxsLFxuICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICB2YWx1ZTogbnVsbFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBNZW1iZXIgZGVjb3JhdG9ycyBtYXkgYmUgZGVjbGFyZWQgYXMgc3RhdGljIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzOlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9ycyA9IHtcbiAgICogICBcIm5nRm9yT2ZcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiAgIFwibmdGb3JUcmFja0J5XCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVGVtcGxhdGVcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiB9O1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNQcm9wZXJ0eSB0aGUgY2xhc3Mgd2hvc2UgbWVtYmVyIGRlY29yYXRvcnMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGEgbWFwIHdob3NlIGtleXMgYXJlIHRoZSBuYW1lIG9mIHRoZSBtZW1iZXJzIGFuZCB3aG9zZSB2YWx1ZXMgYXJlIGNvbGxlY3Rpb25zIG9mXG4gICAqIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzUHJvcGVydHk6IHRzLlN5bWJvbCk6XG4gICAgICBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4ge1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG4gICAgLy8gU3ltYm9sIG9mIHRoZSBpZGVudGlmaWVyIGZvciBgU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9yc2AuXG4gICAgY29uc3QgcHJvcERlY29yYXRvcnNNYXAgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChkZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGlmIChwcm9wRGVjb3JhdG9yc01hcCAmJiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHByb3BEZWNvcmF0b3JzTWFwKSkge1xuICAgICAgY29uc3QgcHJvcGVydGllc01hcCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKHByb3BEZWNvcmF0b3JzTWFwKTtcbiAgICAgIHByb3BlcnRpZXNNYXAuZm9yRWFjaCgodmFsdWUsIG5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9XG4gICAgICAgICAgICB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKHZhbHVlKS5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgICAgaWYgKGRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5zZXQobmFtZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbWVtYmVyRGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3IgYSBnaXZlbiBjbGFzcyBzeW1ib2wsIGNvbGxlY3RzIGFsbCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSB0c2xpYiBoZWxwZXIgbWV0aG9kcywgYXNcbiAgICogZ2VuZXJhdGVkIGJ5IFR5cGVTY3JpcHQgaW50byBlbWl0dGVkIEphdmFTY3JpcHQgZmlsZXMuXG4gICAqXG4gICAqIENsYXNzIGRlY29yYXRvcnMgYXJlIGV4dHJhY3RlZCBmcm9tIGNhbGxzIHRvIGB0c2xpYi5fX2RlY29yYXRlYCB0aGF0IGxvb2sgYXMgZm9sbG93czpcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBTb21lRGlyZWN0aXZlID0gY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlID0gX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIFRoZSBleHRyYWN0aW9uIG9mIG1lbWJlciBkZWNvcmF0b3JzIGlzIHNpbWlsYXIsIHdpdGggdGhlIGRpc3RpbmN0aW9uIHRoYXQgaXRzIDJuZCBhbmQgM3JkXG4gICAqIGFyZ3VtZW50IGNvcnJlc3BvbmQgd2l0aCBhIFwicHJvdG90eXBlXCIgdGFyZ2V0IGFuZCB0aGUgbmFtZSBvZiB0aGUgbWVtYmVyIHRvIHdoaWNoIHRoZVxuICAgKiBkZWNvcmF0b3JzIGFwcGx5LlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgICBJbnB1dCgpLFxuICAgKiAgICAgX19tZXRhZGF0YShcImRlc2lnbjp0eXBlXCIsIFN0cmluZylcbiAgICogXSwgU29tZURpcmVjdGl2ZS5wcm90b3R5cGUsIFwiaW5wdXQxXCIsIHZvaWQgMCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgVGhlIGNsYXNzIHN5bWJvbCBmb3Igd2hpY2ggZGVjb3JhdG9ycyBzaG91bGQgYmUgZXh0cmFjdGVkLlxuICAgKiBAcmV0dXJucyBBbGwgaW5mb3JtYXRpb24gb24gdGhlIGRlY29yYXRvcnMgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEZWNvcmF0b3JJbmZvRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sOiBDbGFzc1N5bWJvbCk6IERlY29yYXRvckluZm8ge1xuICAgIGxldCBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG4gICAgY29uc3QgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdID0gW107XG5cbiAgICBjb25zdCBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyA9IChpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICBsZXQgcGFyYW0gPSBjb25zdHJ1Y3RvclBhcmFtSW5mb1tpbmRleF07XG4gICAgICBpZiAocGFyYW0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwYXJhbSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XSA9IHtkZWNvcmF0b3JzOiBudWxsLCB0eXBlRXhwcmVzc2lvbjogbnVsbH07XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFyYW07XG4gICAgfTtcblxuICAgIC8vIEFsbCByZWxldmFudCBpbmZvcm1hdGlvbiBjYW4gYmUgZXh0cmFjdGVkIGZyb20gY2FsbHMgdG8gYF9fZGVjb3JhdGVgLCBvYnRhaW4gdGhlc2UgZmlyc3QuXG4gICAgLy8gTm90ZSB0aGF0IGFsdGhvdWdoIHRoZSBoZWxwZXIgY2FsbHMgYXJlIHJldHJpZXZlZCB1c2luZyB0aGUgY2xhc3Mgc3ltYm9sLCB0aGUgcmVzdWx0IG1heVxuICAgIC8vIGNvbnRhaW4gaGVscGVyIGNhbGxzIGNvcnJlc3BvbmRpbmcgd2l0aCB1bnJlbGF0ZWQgY2xhc3Nlcy4gVGhlcmVmb3JlLCBlYWNoIGhlbHBlciBjYWxsIHN0aWxsXG4gICAgLy8gaGFzIHRvIGJlIGNoZWNrZWQgdG8gYWN0dWFsbHkgY29ycmVzcG9uZCB3aXRoIHRoZSBjbGFzcyBzeW1ib2wuXG4gICAgY29uc3QgaGVscGVyQ2FsbHMgPSB0aGlzLmdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2wsICdfX2RlY29yYXRlJyk7XG5cbiAgICBmb3IgKGNvbnN0IGhlbHBlckNhbGwgb2YgaGVscGVyQ2FsbHMpIHtcbiAgICAgIGlmIChpc0NsYXNzRGVjb3JhdGVDYWxsKGhlbHBlckNhbGwsIGNsYXNzU3ltYm9sLm5hbWUpKSB7XG4gICAgICAgIC8vIFRoaXMgYF9fZGVjb3JhdGVgIGNhbGwgaXMgdGFyZ2V0aW5nIHRoZSBjbGFzcyBpdHNlbGYuXG4gICAgICAgIGNvbnN0IGhlbHBlckFyZ3MgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1swXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgaGVscGVyQXJncy5lbGVtZW50cykge1xuICAgICAgICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5yZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShlbGVtZW50KTtcbiAgICAgICAgICBpZiAoZW50cnkgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChlbnRyeS50eXBlID09PSAnZGVjb3JhdG9yJykge1xuICAgICAgICAgICAgLy8gVGhlIGhlbHBlciBhcmcgd2FzIHJlZmxlY3RlZCB0byByZXByZXNlbnQgYW4gYWN0dWFsIGRlY29yYXRvclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNGcm9tQ29yZShlbnRyeS5kZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICAgIChjbGFzc0RlY29yYXRvcnMgfHwgKGNsYXNzRGVjb3JhdG9ycyA9IFtdKSkucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkudHlwZSA9PT0gJ3BhcmFtOmRlY29yYXRvcnMnKSB7XG4gICAgICAgICAgICAvLyBUaGUgaGVscGVyIGFyZyByZXByZXNlbnRzIGEgZGVjb3JhdG9yIGZvciBhIHBhcmFtZXRlci4gU2luY2UgaXQncyBhcHBsaWVkIHRvIHRoZVxuICAgICAgICAgICAgLy8gY2xhc3MsIGl0IGNvcnJlc3BvbmRzIHdpdGggYSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgb2YgdGhlIGNsYXNzLlxuICAgICAgICAgICAgY29uc3QgcGFyYW0gPSBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhlbnRyeS5pbmRleCk7XG4gICAgICAgICAgICAocGFyYW0uZGVjb3JhdG9ycyB8fCAocGFyYW0uZGVjb3JhdG9ycyA9IFtdKSkucHVzaChlbnRyeS5kZWNvcmF0b3IpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkudHlwZSA9PT0gJ3BhcmFtcycpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHJlcHJlc2VudHMgdGhlIHR5cGVzIG9mIHRoZSBwYXJhbWV0ZXJzLiBTaW5jZSBpdCdzIGFwcGxpZWQgdG8gdGhlXG4gICAgICAgICAgICAvLyBjbGFzcywgaXQgY29ycmVzcG9uZHMgd2l0aCB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiB0aGUgY2xhc3MuXG4gICAgICAgICAgICBlbnRyeS50eXBlcy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICh0eXBlLCBpbmRleCkgPT4gZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oaW5kZXgpLnR5cGVFeHByZXNzaW9uID0gdHlwZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzTWVtYmVyRGVjb3JhdGVDYWxsKGhlbHBlckNhbGwsIGNsYXNzU3ltYm9sLm5hbWUpKSB7XG4gICAgICAgIC8vIFRoZSBgX19kZWNvcmF0ZWAgY2FsbCBpcyB0YXJnZXRpbmcgYSBtZW1iZXIgb2YgdGhlIGNsYXNzXG4gICAgICAgIGNvbnN0IGhlbHBlckFyZ3MgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgICAgY29uc3QgbWVtYmVyTmFtZSA9IGhlbHBlckNhbGwuYXJndW1lbnRzWzJdLnRleHQ7XG5cbiAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGhlbHBlckFyZ3MuZWxlbWVudHMpIHtcbiAgICAgICAgICBjb25zdCBlbnRyeSA9IHRoaXMucmVmbGVjdERlY29yYXRlSGVscGVyRW50cnkoZWxlbWVudCk7XG4gICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZW50cnkudHlwZSA9PT0gJ2RlY29yYXRvcicpIHtcbiAgICAgICAgICAgIC8vIFRoZSBoZWxwZXIgYXJnIHdhcyByZWZsZWN0ZWQgdG8gcmVwcmVzZW50IGFuIGFjdHVhbCBkZWNvcmF0b3IuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0Zyb21Db3JlKGVudHJ5LmRlY29yYXRvcikpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9XG4gICAgICAgICAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLmhhcyhtZW1iZXJOYW1lKSA/IG1lbWJlckRlY29yYXRvcnMuZ2V0KG1lbWJlck5hbWUpICEgOiBbXTtcbiAgICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKGVudHJ5LmRlY29yYXRvcik7XG4gICAgICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG1lbWJlck5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJbmZvcm1hdGlvbiBvbiBkZWNvcmF0ZWQgcGFyYW1ldGVycyBpcyBub3QgaW50ZXJlc3RpbmcgZm9yIG5nY2MsIHNvIGl0J3MgaWdub3JlZC5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge2NsYXNzRGVjb3JhdG9ycywgbWVtYmVyRGVjb3JhdG9ycywgY29uc3RydWN0b3JQYXJhbUluZm99O1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3QgdGhlIGRldGFpbHMgb2YgYW4gZW50cnkgd2l0aGluIGEgYF9fZGVjb3JhdGVgIGhlbHBlciBjYWxsLiBGb3IgZXhhbXBsZSwgZ2l2ZW4gdGhlXG4gICAqIGZvbGxvd2luZyBjb2RlOlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiAgIHRzbGliXzEuX19wYXJhbSgyLCBJbmplY3QoSU5KRUNURURfVE9LRU4pKSxcbiAgICogICB0c2xpYl8xLl9fbWV0YWRhdGEoXCJkZXNpZ246cGFyYW10eXBlc1wiLCBbVmlld0NvbnRhaW5lclJlZiwgVGVtcGxhdGVSZWYsIFN0cmluZ10pXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICAgKiBgYGBcbiAgICpcbiAgICogaXQgY2FuIGJlIHNlZW4gdGhhdCB0aGVyZSBhcmUgY2FsbHMgdG8gcmVndWxhciBkZWNvcmF0b3JzICh0aGUgYERpcmVjdGl2ZWApIGFuZCBjYWxscyBpbnRvXG4gICAqIGB0c2xpYmAgZnVuY3Rpb25zIHdoaWNoIGhhdmUgYmVlbiBpbnNlcnRlZCBieSBUeXBlU2NyaXB0LiBUaGVyZWZvcmUsIHRoaXMgZnVuY3Rpb24gY2xhc3NpZmllc1xuICAgKiBhIGNhbGwgdG8gY29ycmVzcG9uZCB3aXRoXG4gICAqICAgMS4gYSByZWFsIGRlY29yYXRvciBsaWtlIGBEaXJlY3RpdmVgIGFib3ZlLCBvclxuICAgKiAgIDIuIGEgZGVjb3JhdGVkIHBhcmFtZXRlciwgY29ycmVzcG9uZGluZyB3aXRoIGBfX3BhcmFtYCBjYWxscyBmcm9tIGB0c2xpYmAsIG9yXG4gICAqICAgMy4gdGhlIHR5cGUgaW5mb3JtYXRpb24gb2YgcGFyYW1ldGVycywgY29ycmVzcG9uZGluZyB3aXRoIGBfX21ldGFkYXRhYCBjYWxsIGZyb20gYHRzbGliYFxuICAgKlxuICAgKiBAcGFyYW0gZXhwcmVzc2lvbiB0aGUgZXhwcmVzc2lvbiB0aGF0IG5lZWRzIHRvIGJlIHJlZmxlY3RlZCBpbnRvIGEgYERlY29yYXRlSGVscGVyRW50cnlgXG4gICAqIEByZXR1cm5zIGFuIG9iamVjdCB0aGF0IGluZGljYXRlcyB3aGljaCBvZiB0aGUgdGhyZWUgY2F0ZWdvcmllcyB0aGUgY2FsbCByZXByZXNlbnRzLCB0b2dldGhlclxuICAgKiB3aXRoIHRoZSByZWZsZWN0ZWQgaW5mb3JtYXRpb24gb2YgdGhlIGNhbGwsIG9yIG51bGwgaWYgdGhlIGNhbGwgaXMgbm90IGEgdmFsaWQgZGVjb3JhdGUgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdGVIZWxwZXJFbnRyeShleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogRGVjb3JhdGVIZWxwZXJFbnRyeXxudWxsIHtcbiAgICAvLyBXZSBvbmx5IGNhcmUgYWJvdXQgdGhvc2UgZWxlbWVudHMgdGhhdCBhcmUgYWN0dWFsIGNhbGxzXG4gICAgaWYgKCF0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgY2FsbCA9IGV4cHJlc3Npb247XG5cbiAgICBjb25zdCBoZWxwZXJOYW1lID0gZ2V0Q2FsbGVlTmFtZShjYWxsKTtcbiAgICBpZiAoaGVscGVyTmFtZSA9PT0gJ19fbWV0YWRhdGEnKSB7XG4gICAgICAvLyBUaGlzIGlzIGEgYHRzbGliLl9fbWV0YWRhdGFgIGNhbGwsIHJlZmxlY3QgdG8gYXJndW1lbnRzIGludG8gYSBgUGFyYW1ldGVyVHlwZXNgIG9iamVjdFxuICAgICAgLy8gaWYgdGhlIG1ldGFkYXRhIGtleSBpcyBcImRlc2lnbjpwYXJhbXR5cGVzXCIuXG4gICAgICBjb25zdCBrZXkgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNTdHJpbmdMaXRlcmFsKGtleSkgfHwga2V5LnRleHQgIT09ICdkZXNpZ246cGFyYW10eXBlcycpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHZhbHVlID0gY2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3BhcmFtcycsXG4gICAgICAgIHR5cGVzOiBBcnJheS5mcm9tKHZhbHVlLmVsZW1lbnRzKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGhlbHBlck5hbWUgPT09ICdfX3BhcmFtJykge1xuICAgICAgLy8gVGhpcyBpcyBhIGB0c2xpYi5fX3BhcmFtYCBjYWxsIHRoYXQgaXMgcmVmbGVjdGVkIGludG8gYSBgUGFyYW1ldGVyRGVjb3JhdG9yc2Agb2JqZWN0LlxuICAgICAgY29uc3QgaW5kZXhBcmcgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgIGNvbnN0IGluZGV4ID0gaW5kZXhBcmcgJiYgdHMuaXNOdW1lcmljTGl0ZXJhbChpbmRleEFyZykgPyBwYXJzZUludChpbmRleEFyZy50ZXh0LCAxMCkgOiBOYU47XG4gICAgICBpZiAoaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvcmF0b3JDYWxsID0gY2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAoZGVjb3JhdG9yQ2FsbCA9PT0gdW5kZWZpbmVkIHx8ICF0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckNhbGwpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvcmF0b3IgPSB0aGlzLnJlZmxlY3REZWNvcmF0b3JDYWxsKGRlY29yYXRvckNhbGwpO1xuICAgICAgaWYgKGRlY29yYXRvciA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3BhcmFtOmRlY29yYXRvcnMnLFxuICAgICAgICBpbmRleCxcbiAgICAgICAgZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgYXR0ZW1wdCB0byByZWZsZWN0IGl0IGFzIGEgcmVndWxhciBkZWNvcmF0b3IuXG4gICAgY29uc3QgZGVjb3JhdG9yID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChjYWxsKTtcbiAgICBpZiAoZGVjb3JhdG9yID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdkZWNvcmF0b3InLFxuICAgICAgZGVjb3JhdG9yLFxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRvckNhbGwoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pOiBEZWNvcmF0b3J8bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9yRXhwcmVzc2lvbiA9IGNhbGwuZXhwcmVzc2lvbjtcbiAgICBpZiAoIWlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JFeHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2UgZm91bmQgYSBkZWNvcmF0b3IhXG4gICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9XG4gICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByZXNzaW9uKSA/IGRlY29yYXRvckV4cHJlc3Npb24gOiBkZWNvcmF0b3JFeHByZXNzaW9uLm5hbWU7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgaWRlbnRpZmllcjogZGVjb3JhdG9yRXhwcmVzc2lvbixcbiAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjb3JhdG9ySWRlbnRpZmllciksXG4gICAgICBub2RlOiBjYWxsLFxuICAgICAgYXJnczogQXJyYXkuZnJvbShjYWxsLmFyZ3VtZW50cyksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB0aGUgZ2l2ZW4gc3RhdGVtZW50IHRvIHNlZSBpZiBpdCBpcyBhIGNhbGwgdG8gdGhlIHNwZWNpZmllZCBoZWxwZXIgZnVuY3Rpb24gb3IgbnVsbCBpZlxuICAgKiBub3QgZm91bmQuXG4gICAqXG4gICAqIE1hdGNoaW5nIHN0YXRlbWVudHMgd2lsbCBsb29rIGxpa2U6ICBgdHNsaWJfMS5fX2RlY29yYXRlKC4uLik7YC5cbiAgICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRoYXQgbWF5IGNvbnRhaW4gdGhlIGNhbGwuXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lIHRoZSBuYW1lIG9mIHRoZSBoZWxwZXIgd2UgYXJlIGxvb2tpbmcgZm9yLlxuICAgKiBAcmV0dXJucyB0aGUgbm9kZSB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSBgX19kZWNvcmF0ZSguLi4pYCBjYWxsIG9yIG51bGwgaWYgdGhlIHN0YXRlbWVudFxuICAgKiBkb2VzIG5vdCBtYXRjaC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsKHN0YXRlbWVudDogdHMuU3RhdGVtZW50LCBoZWxwZXJOYW1lOiBzdHJpbmcpOiB0cy5DYWxsRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIGxldCBleHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgICB3aGlsZSAoaXNBc3NpZ25tZW50KGV4cHJlc3Npb24pKSB7XG4gICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnJpZ2h0O1xuICAgICAgfVxuICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgZ2V0Q2FsbGVlTmFtZShleHByZXNzaW9uKSA9PT0gaGVscGVyTmFtZSkge1xuICAgICAgICByZXR1cm4gZXhwcmVzc2lvbjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgdGhlIGdpdmVuIGFycmF5IG5vZGUgYW5kIGV4dHJhY3QgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gZWFjaCBlbGVtZW50LlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgZm9yIGRlY29yYXRvcnMgdGhhdCBhcmUgZGVmaW5lZCBpbiBzdGF0aWMgcHJvcGVydGllcy4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNBcnJheSBhbiBleHByZXNzaW9uIHRoYXQgY29udGFpbnMgZGVjb3JhdG9yIGluZm9ybWF0aW9uLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBkZWNvcmF0b3IgaW5mbyB0aGF0IHdhcyByZWZsZWN0ZWQgZnJvbSB0aGUgYXJyYXkgbm9kZS5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXk6IHRzLkV4cHJlc3Npb24pOiBEZWNvcmF0b3JbXSB7XG4gICAgY29uc3QgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gPSBbXTtcblxuICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVjb3JhdG9yc0FycmF5KSkge1xuICAgICAgLy8gQWRkIGVhY2ggZGVjb3JhdG9yIHRoYXQgaXMgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWAgaW50byB0aGUgYGRlY29yYXRvcnNgIGFycmF5XG4gICAgICBkZWNvcmF0b3JzQXJyYXkuZWxlbWVudHMuZm9yRWFjaChub2RlID0+IHtcblxuICAgICAgICAvLyBJZiB0aGUgZGVjb3JhdG9yIGlzIG5vdCBhbiBvYmplY3QgbGl0ZXJhbCBleHByZXNzaW9uIHRoZW4gd2UgYXJlIG5vdCBpbnRlcmVzdGVkXG4gICAgICAgIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmhhcygndHlwZScpKSB7XG4gICAgICAgICAgICBsZXQgZGVjb3JhdG9yVHlwZSA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKSAhO1xuICAgICAgICAgICAgaWYgKGlzRGVjb3JhdG9ySWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSkge1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JJZGVudGlmaWVyID1cbiAgICAgICAgICAgICAgICAgIHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JUeXBlKSA/IGRlY29yYXRvclR5cGUgOiBkZWNvcmF0b3JUeXBlLm5hbWU7XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvclR5cGUsXG4gICAgICAgICAgICAgICAgaW1wb3J0OiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWNvcmF0b3JJZGVudGlmaWVyKSwgbm9kZSxcbiAgICAgICAgICAgICAgICBhcmdzOiBnZXREZWNvcmF0b3JBcmdzKG5vZGUpLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKlxuICAgKiBBIHNpbmdsZSBzeW1ib2wgbWF5IHJlcHJlc2VudCBtdWx0aXBsZSBjbGFzcyBtZW1iZXJzIGluIHRoZSBjYXNlIG9mIGFjY2Vzc29ycztcbiAgICogYW4gZXF1YWxseSBuYW1lZCBnZXR0ZXIvc2V0dGVyIGFjY2Vzc29yIHBhaXIgaXMgY29tYmluZWQgaW50byBhIHNpbmdsZSBzeW1ib2wuXG4gICAqIFdoZW4gdGhlIHN5bWJvbCBpcyByZWNvZ25pemVkIGFzIHJlcHJlc2VudGluZyBhbiBhY2Nlc3NvciwgaXRzIGRlY2xhcmF0aW9ucyBhcmVcbiAgICogYW5hbHl6ZWQgc3VjaCB0aGF0IGJvdGggdGhlIHNldHRlciBhbmQgZ2V0dGVyIGFjY2Vzc29yIGFyZSByZXR1cm5lZCBhcyBzZXBhcmF0ZVxuICAgKiBjbGFzcyBtZW1iZXJzLlxuICAgKlxuICAgKiBPbmUgZGlmZmVyZW5jZSB3cnQgdGhlIFR5cGVTY3JpcHQgaG9zdCBpcyB0aGF0IGluIEVTMjAxNSwgd2UgY2Fubm90IHNlZSB3aGljaFxuICAgKiBhY2Nlc3NvciBvcmlnaW5hbGx5IGhhZCBhbnkgZGVjb3JhdG9ycyBhcHBsaWVkIHRvIHRoZW0sIGFzIGRlY29yYXRvcnMgYXJlIGFwcGxpZWRcbiAgICogdG8gdGhlIHByb3BlcnR5IGRlc2NyaXB0b3IgaW4gZ2VuZXJhbCwgbm90IGEgc3BlY2lmaWMgYWNjZXNzb3IuIElmIGFuIGFjY2Vzc29yXG4gICAqIGhhcyBib3RoIGEgc2V0dGVyIGFuZCBnZXR0ZXIsIGFueSBkZWNvcmF0b3JzIGFyZSBvbmx5IGF0dGFjaGVkIHRvIHRoZSBzZXR0ZXIgbWVtYmVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVycyhzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJbXXxudWxsIHtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWNjZXNzb3IpIHtcbiAgICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICAgIGNvbnN0IHNldHRlciA9IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5maW5kKHRzLmlzU2V0QWNjZXNzb3IpO1xuICAgICAgY29uc3QgZ2V0dGVyID0gc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmZpbmQodHMuaXNHZXRBY2Nlc3Nvcik7XG5cbiAgICAgIGNvbnN0IHNldHRlck1lbWJlciA9XG4gICAgICAgICAgc2V0dGVyICYmIHRoaXMucmVmbGVjdE1lbWJlcihzZXR0ZXIsIENsYXNzTWVtYmVyS2luZC5TZXR0ZXIsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICAgIGlmIChzZXR0ZXJNZW1iZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKHNldHRlck1lbWJlcik7XG5cbiAgICAgICAgLy8gUHJldmVudCBhdHRhY2hpbmcgdGhlIGRlY29yYXRvcnMgdG8gYSBwb3RlbnRpYWwgZ2V0dGVyLiBJbiBFUzIwMTUsIHdlIGNhbid0IHRlbGwgd2hlcmVcbiAgICAgICAgLy8gdGhlIGRlY29yYXRvcnMgd2VyZSBvcmlnaW5hbGx5IGF0dGFjaGVkIHRvLCBob3dldmVyIHdlIG9ubHkgd2FudCB0byBhdHRhY2ggdGhlbSB0byBhXG4gICAgICAgIC8vIHNpbmdsZSBgQ2xhc3NNZW1iZXJgIGFzIG90aGVyd2lzZSBuZ3RzYyB3b3VsZCBoYW5kbGUgdGhlIHNhbWUgZGVjb3JhdG9ycyB0d2ljZS5cbiAgICAgICAgZGVjb3JhdG9ycyA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZ2V0dGVyTWVtYmVyID1cbiAgICAgICAgICBnZXR0ZXIgJiYgdGhpcy5yZWZsZWN0TWVtYmVyKGdldHRlciwgQ2xhc3NNZW1iZXJLaW5kLkdldHRlciwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgICAgaWYgKGdldHRlck1lbWJlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goZ2V0dGVyTWVtYmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1lbWJlcnM7XG4gICAgfVxuXG4gICAgbGV0IGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsID0gbnVsbDtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuTWV0aG9kKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZDtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLlByb3BlcnR5KSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGUgPSBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiB8fCBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICAvLyBJZiB0aGUgc3ltYm9sIGhhcyBiZWVuIGltcG9ydGVkIGZyb20gYSBUeXBlU2NyaXB0IHR5cGluZ3MgZmlsZSB0aGVuIHRoZSBjb21waWxlclxuICAgICAgLy8gbWF5IHBhc3MgdGhlIGBwcm90b3R5cGVgIHN5bWJvbCBhcyBhbiBleHBvcnQgb2YgdGhlIGNsYXNzLlxuICAgICAgLy8gQnV0IHRoaXMgaGFzIG5vIGRlY2xhcmF0aW9uLiBJbiB0aGlzIGNhc2Ugd2UganVzdCBxdWlldGx5IGlnbm9yZSBpdC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlciA9IHRoaXMucmVmbGVjdE1lbWJlcihub2RlLCBraW5kLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgaWYgKCFtZW1iZXIpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBbbWVtYmVyXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZGVjbGFyYXRpb24gbm9kZSBmb3IgdGhlIG1lbWJlciB0byByZWZsZWN0IG92ZXIuXG4gICAqIEBwYXJhbSBraW5kIHRoZSBhc3N1bWVkIGtpbmQgb2YgdGhlIG1lbWJlciwgbWF5IGJlY29tZSBtb3JlIGFjY3VyYXRlIGR1cmluZyByZWZsZWN0aW9uLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVyKFxuICAgICAgbm9kZTogdHMuRGVjbGFyYXRpb24sIGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sXG4gICAgICBpc1N0YXRpYz86IGJvb2xlYW4pOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQgdmFsdWU6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWU6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZU5vZGU6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoIWlzQ2xhc3NNZW1iZXJUeXBlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoaXNTdGF0aWMgJiYgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBraW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHkgPyBub2RlLnBhcmVudC5yaWdodCA6IG51bGw7XG4gICAgfSBlbHNlIGlmIChpc1RoaXNBc3NpZ25tZW50KG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgICAgbmFtZSA9IG5vZGUubGVmdC5uYW1lLnRleHQ7XG4gICAgICB2YWx1ZSA9IG5vZGUucmlnaHQ7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkNvbnN0cnVjdG9yO1xuICAgICAgbmFtZSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChraW5kID09PSBudWxsKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKGBVbmtub3duIG1lbWJlciB0eXBlOiBcIiR7bm9kZS5nZXRUZXh0KCl9YCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGlmIChpc05hbWVkRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgICBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHdlIGhhdmUgc3RpbGwgbm90IGRldGVybWluZWQgaWYgdGhpcyBpcyBhIHN0YXRpYyBvciBpbnN0YW5jZSBtZW1iZXIgdGhlblxuICAgIC8vIGxvb2sgZm9yIHRoZSBgc3RhdGljYCBrZXl3b3JkIG9uIHRoZSBkZWNsYXJhdGlvblxuICAgIGlmIChpc1N0YXRpYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpc1N0YXRpYyA9IG5vZGUubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICBub2RlLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5TdGF0aWNLZXl3b3JkKTtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlOiB0cy5UeXBlTm9kZSA9IChub2RlIGFzIGFueSkudHlwZSB8fCBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICBub2RlLFxuICAgICAgaW1wbGVtZW50YXRpb246IG5vZGUsIGtpbmQsIHR5cGUsIG5hbWUsIG5hbWVOb2RlLCB2YWx1ZSwgaXNTdGF0aWMsXG4gICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVycyB3ZSB3YW50IHRvIGZpbmQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbmAgb2JqZWN0cyByZXByZXNlbnRpbmcgZWFjaCBvZiB0aGUgcGFyYW1ldGVycyBpblxuICAgKiB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvciBvciBudWxsIGlmIHRoZXJlIGlzIG5vIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiBDbGFzc1N5bWJvbCk6XG4gICAgICB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdfG51bGwge1xuICAgIGlmIChjbGFzc1N5bWJvbC5tZW1iZXJzICYmIGNsYXNzU3ltYm9sLm1lbWJlcnMuaGFzKENPTlNUUlVDVE9SKSkge1xuICAgICAgY29uc3QgY29uc3RydWN0b3JTeW1ib2wgPSBjbGFzc1N5bWJvbC5tZW1iZXJzLmdldChDT05TVFJVQ1RPUikgITtcbiAgICAgIC8vIEZvciBzb21lIHJlYXNvbiB0aGUgY29uc3RydWN0b3IgZG9lcyBub3QgaGF2ZSBhIGB2YWx1ZURlY2xhcmF0aW9uYCA/IT9cbiAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zICYmXG4gICAgICAgICAgY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zWzBdIGFzIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24gfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoIWNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cbiAgICAgIGlmIChjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgICB9XG4gICAgICBpZiAoaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcGFyYW0gcGFyYW1ldGVyTm9kZXMgdGhlIGFycmF5IG9mIFR5cGVTY3JpcHQgcGFyYW1ldGVyIG5vZGVzIGZvciB0aGlzIGNsYXNzJ3MgY29uc3RydWN0b3IuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBpbmZvIG9iamVjdHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oXG4gICAgICBjbGFzc1N5bWJvbDogQ2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdKTogQ3RvclBhcmFtZXRlcltdIHtcbiAgICBjb25zdCB7Y29uc3RydWN0b3JQYXJhbUluZm99ID0gdGhpcy5hY3F1aXJlRGVjb3JhdG9ySW5mbyhjbGFzc1N5bWJvbCk7XG5cbiAgICByZXR1cm4gcGFyYW1ldGVyTm9kZXMubWFwKChub2RlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3Qge2RlY29yYXRvcnMsIHR5cGVFeHByZXNzaW9ufSA9IGNvbnN0cnVjdG9yUGFyYW1JbmZvW2luZGV4XSA/XG4gICAgICAgICAgY29uc3RydWN0b3JQYXJhbUluZm9baW5kZXhdIDpcbiAgICAgICAgICB7ZGVjb3JhdG9yczogbnVsbCwgdHlwZUV4cHJlc3Npb246IG51bGx9O1xuICAgICAgY29uc3QgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBnZXROYW1lVGV4dChuYW1lTm9kZSksXG4gICAgICAgIG5hbWVOb2RlLFxuICAgICAgICB0eXBlVmFsdWVSZWZlcmVuY2U6IHR5cGVFeHByZXNzaW9uICE9PSBudWxsID9cbiAgICAgICAgICAgIHtsb2NhbDogdHJ1ZSBhcyB0cnVlLCBleHByZXNzaW9uOiB0eXBlRXhwcmVzc2lvbiwgZGVmYXVsdEltcG9ydFN0YXRlbWVudDogbnVsbH0gOlxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgdHlwZU5vZGU6IG51bGwsIGRlY29yYXRvcnNcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MsXG4gICAqIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgb24gYSBzdGF0aWMgcHJvcGVydHkgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgaW4gRVNNMjAxNSwgdGhlIHByb3BlcnR5IGlzIGRlZmluZWQgYW4gYXJyYXksIG9yIGJ5IGFuIGFycm93IGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhblxuICAgKiBhcnJheSwgb2YgZGVjb3JhdG9yIGFuZCB0eXBlIGluZm9ybWF0aW9uLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSxcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gICAqICAge3R5cGU6IFZpZXdDb250YWluZXJSZWZ9LFxuICAgKiAgIHt0eXBlOiBUZW1wbGF0ZVJlZn0sXG4gICAqICAge3R5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU5dfV19LFxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogb3JcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSBbXG4gICAqICAge3R5cGU6IFZpZXdDb250YWluZXJSZWZ9LFxuICAgKiAgIHt0eXBlOiBUZW1wbGF0ZVJlZn0sXG4gICAqICAge3R5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3t0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTl19XX0sXG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgdGhlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbURlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTogUGFyYW1JbmZvW118bnVsbCB7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGlmIChwYXJhbURlY29yYXRvcnMpIHtcbiAgICAgIC8vIFRoZSBkZWNvcmF0b3JzIGFycmF5IG1heSBiZSB3cmFwcGVkIGluIGFuIGFycm93IGZ1bmN0aW9uLiBJZiBzbyB1bndyYXAgaXQuXG4gICAgICBjb25zdCBjb250YWluZXIgPVxuICAgICAgICAgIHRzLmlzQXJyb3dGdW5jdGlvbihwYXJhbURlY29yYXRvcnMpID8gcGFyYW1EZWNvcmF0b3JzLmJvZHkgOiBwYXJhbURlY29yYXRvcnM7XG4gICAgICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGNvbnRhaW5lcikpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSBjb250YWluZXIuZWxlbWVudHM7XG4gICAgICAgIHJldHVybiBlbGVtZW50c1xuICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0+XG4gICAgICAgICAgICAgICAgICAgIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZWxlbWVudCkgPyByZWZsZWN0T2JqZWN0TGl0ZXJhbChlbGVtZW50KSA6IG51bGwpXG4gICAgICAgICAgICAubWFwKHBhcmFtSW5mbyA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHR5cGVFeHByZXNzaW9uID1cbiAgICAgICAgICAgICAgICAgIHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uaGFzKCd0eXBlJykgPyBwYXJhbUluZm8uZ2V0KCd0eXBlJykgISA6IG51bGw7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPVxuICAgICAgICAgICAgICAgICAgcGFyYW1JbmZvICYmIHBhcmFtSW5mby5oYXMoJ2RlY29yYXRvcnMnKSA/IHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSAhIDogbnVsbDtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiZcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9ySW5mbylcbiAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgICAgICAgIHJldHVybiB7dHlwZUV4cHJlc3Npb24sIGRlY29yYXRvcnN9O1xuICAgICAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHBhcmFtRGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAnSW52YWxpZCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXIgZGVjb3JhdG9yIGluICcgK1xuICAgICAgICAgICAgICAgIHBhcmFtRGVjb3JhdG9ycy5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUgKyAnOlxcbicsXG4gICAgICAgICAgICBwYXJhbURlY29yYXRvcnMuZ2V0VGV4dCgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgZm9yIGNhbGxzIHRvIHRoZSBzcGVjaWZpZWQgaGVscGVyLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIGhlbHBlck5hbWUgdGhlIG5hbWUgb2YgdGhlIGhlbHBlciAoZS5nLiBgX19kZWNvcmF0ZWApIHdob3NlIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkXG4gICAqIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBDYWxsRXhwcmVzc2lvbiBub2RlcyBmb3IgZWFjaCBtYXRjaGluZyBoZWxwZXIgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBDbGFzc1N5bWJvbCwgaGVscGVyTmFtZTogc3RyaW5nKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9uW10ge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbClcbiAgICAgICAgLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5nZXRIZWxwZXJDYWxsKHN0YXRlbWVudCwgaGVscGVyTmFtZSkpXG4gICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNMjAxNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGluIHRoZSB0b3AgbGV2ZWwgbW9kdWxlLCBzbyB3ZSBoYXZlIHRvIGNvbnNpZGVyXG4gICAqIGFsbCB0aGUgc3RhdGVtZW50cyBpbiB0aGUgbW9kdWxlLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IENsYXNzU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLnN0YXRlbWVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRlc3Qgd2hldGhlciBhIGRlY29yYXRvciB3YXMgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWAuXG4gICAqXG4gICAqIElzIHRoZSBkZWNvcmF0b3I6XG4gICAqICogZXh0ZXJuYWxseSBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYD9cbiAgICogKiB0aGUgY3VycmVudCBob3N0ZWQgcHJvZ3JhbSBpcyBhY3R1YWxseSBgQGFuZ3VsYXIvY29yZWAgYW5kXG4gICAqICAgLSByZWxhdGl2ZWx5IGludGVybmFsbHkgaW1wb3J0ZWQ7IG9yXG4gICAqICAgLSBub3QgaW1wb3J0ZWQsIGZyb20gdGhlIGN1cnJlbnQgZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvciB0aGUgZGVjb3JhdG9yIHRvIHRlc3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgaXNGcm9tQ29yZShkZWNvcmF0b3I6IERlY29yYXRvcik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLmlzQ29yZSkge1xuICAgICAgcmV0dXJuICFkZWNvcmF0b3IuaW1wb3J0IHx8IC9eXFwuLy50ZXN0KGRlY29yYXRvci5pbXBvcnQuZnJvbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAhIWRlY29yYXRvci5pbXBvcnQgJiYgZGVjb3JhdG9yLmltcG9ydC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZSc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3QgYWxsIHRoZSBjbGFzcyBkZWNsYXJhdGlvbnMgZnJvbSB0aGUgZHRzVHlwaW5ncyBwcm9ncmFtLCBzdG9yaW5nIHRoZW0gaW4gYSBtYXBcbiAgICogd2hlcmUgdGhlIGtleSBpcyB0aGUgZGVjbGFyZWQgbmFtZSBvZiB0aGUgY2xhc3MgYW5kIHRoZSB2YWx1ZSBpcyB0aGUgZGVjbGFyYXRpb24gaXRzZWxmLlxuICAgKlxuICAgKiBJdCBpcyBwb3NzaWJsZSBmb3IgdGhlcmUgdG8gYmUgbXVsdGlwbGUgY2xhc3MgZGVjbGFyYXRpb25zIHdpdGggdGhlIHNhbWUgbG9jYWwgbmFtZS5cbiAgICogT25seSB0aGUgZmlyc3QgZGVjbGFyYXRpb24gd2l0aCBhIGdpdmVuIG5hbWUgaXMgYWRkZWQgdG8gdGhlIG1hcDsgc3Vic2VxdWVudCBjbGFzc2VzIHdpbGwgYmVcbiAgICogaWdub3JlZC5cbiAgICpcbiAgICogV2UgYXJlIG1vc3QgaW50ZXJlc3RlZCBpbiBjbGFzc2VzIHRoYXQgYXJlIHB1YmxpY2x5IGV4cG9ydGVkIGZyb20gdGhlIGVudHJ5IHBvaW50LCBzbyB0aGVzZVxuICAgKiBhcmUgYWRkZWQgdG8gdGhlIG1hcCBmaXJzdCwgdG8gZW5zdXJlIHRoYXQgdGhleSBhcmUgbm90IGlnbm9yZWQuXG4gICAqXG4gICAqIEBwYXJhbSBkdHNSb290RmlsZU5hbWUgVGhlIGZpbGVuYW1lIG9mIHRoZSBlbnRyeS1wb2ludCB0byB0aGUgYGR0c1R5cGluZ3NgIHByb2dyYW0uXG4gICAqIEBwYXJhbSBkdHNQcm9ncmFtIFRoZSBwcm9ncmFtIGNvbnRhaW5pbmcgYWxsIHRoZSB0eXBpbmdzIGZpbGVzLlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiBjbGFzcyBuYW1lcyB0byBjbGFzcyBkZWNsYXJhdGlvbnMuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29tcHV0ZUR0c0RlY2xhcmF0aW9uTWFwKGR0c1Jvb3RGaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgsIGR0c1Byb2dyYW06IHRzLlByb2dyYW0pOlxuICAgICAgTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+IHtcbiAgICBjb25zdCBkdHNEZWNsYXJhdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCBjaGVja2VyID0gZHRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgLy8gRmlyc3QgYWRkIGFsbCB0aGUgY2xhc3NlcyB0aGF0IGFyZSBwdWJsaWNseSBleHBvcnRlZCBmcm9tIHRoZSBlbnRyeS1wb2ludFxuICAgIGNvbnN0IHJvb3RGaWxlID0gZHRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGR0c1Jvb3RGaWxlTmFtZSk7XG4gICAgaWYgKCFyb290RmlsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZ2l2ZW4gZmlsZSAke2R0c1Jvb3RGaWxlTmFtZX0gaXMgbm90IHBhcnQgb2YgdGhlIHR5cGluZ3MgcHJvZ3JhbS5gKTtcbiAgICB9XG4gICAgY29sbGVjdEV4cG9ydGVkRGVjbGFyYXRpb25zKGNoZWNrZXIsIGR0c0RlY2xhcmF0aW9uTWFwLCByb290RmlsZSk7XG5cbiAgICAvLyBOb3cgYWRkIGFueSBhZGRpdGlvbmFsIGNsYXNzZXMgdGhhdCBhcmUgZXhwb3J0ZWQgZnJvbSBpbmRpdmlkdWFsICBkdHMgZmlsZXMsXG4gICAgLy8gYnV0IGFyZSBub3QgcHVibGljbHkgZXhwb3J0ZWQgZnJvbSB0aGUgZW50cnktcG9pbnQuXG4gICAgZHRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goXG4gICAgICAgIHNvdXJjZUZpbGUgPT4geyBjb2xsZWN0RXhwb3J0ZWREZWNsYXJhdGlvbnMoY2hlY2tlciwgZHRzRGVjbGFyYXRpb25NYXAsIHNvdXJjZUZpbGUpOyB9KTtcbiAgICByZXR1cm4gZHRzRGVjbGFyYXRpb25NYXA7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgYSBmdW5jdGlvbi9tZXRob2Qgbm9kZSAob3IgaXRzIGltcGxlbWVudGF0aW9uKSwgdG8gc2VlIGlmIGl0IHJldHVybnMgYVxuICAgKiBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agb2JqZWN0LlxuICAgKiBAcGFyYW0gbmFtZSBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24uXG4gICAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHRvIGNoZWNrIC0gdGhpcyBjb3VsZCBiZSBhIGZ1bmN0aW9uLCBhIG1ldGhvZCBvciBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKiBAcGFyYW0gaW1wbGVtZW50YXRpb24gdGhlIGFjdHVhbCBmdW5jdGlvbiBleHByZXNzaW9uIGlmIGBub2RlYCBpcyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLlxuICAgKiBAcGFyYW0gY29udGFpbmVyIHRoZSBjbGFzcyB0aGF0IGNvbnRhaW5zIHRoZSBmdW5jdGlvbiwgaWYgaXQgaXMgYSBtZXRob2QuXG4gICAqIEByZXR1cm5zIGluZm8gYWJvdXQgdGhlIGZ1bmN0aW9uIGlmIGl0IGRvZXMgcmV0dXJuIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIG9iamVjdDsgYG51bGxgXG4gICAqIG90aGVyd2lzZS5cbiAgICovXG4gIHByb3RlY3RlZCBwYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoXG4gICAgICBuYW1lOiBzdHJpbmcsIG5vZGU6IHRzLk5vZGV8bnVsbCwgaW1wbGVtZW50YXRpb246IHRzLk5vZGV8bnVsbCA9IG5vZGUsXG4gICAgICBjb250YWluZXI6IHRzLkRlY2xhcmF0aW9ufG51bGwgPSBudWxsKTogTW9kdWxlV2l0aFByb3ZpZGVyc0Z1bmN0aW9ufG51bGwge1xuICAgIGlmIChpbXBsZW1lbnRhdGlvbiA9PT0gbnVsbCB8fFxuICAgICAgICAoIXRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihpbXBsZW1lbnRhdGlvbikgJiYgIXRzLmlzTWV0aG9kRGVjbGFyYXRpb24oaW1wbGVtZW50YXRpb24pICYmXG4gICAgICAgICAhdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24oaW1wbGVtZW50YXRpb24pKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRlY2xhcmF0aW9uID0gaW1wbGVtZW50YXRpb247XG4gICAgY29uc3QgZGVmaW5pdGlvbiA9IHRoaXMuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24oZGVjbGFyYXRpb24pO1xuICAgIGlmIChkZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgYm9keSA9IGRlZmluaXRpb24uYm9keTtcbiAgICBjb25zdCBsYXN0U3RhdGVtZW50ID0gYm9keSAmJiBib2R5W2JvZHkubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgcmV0dXJuRXhwcmVzc2lvbiA9XG4gICAgICAgIGxhc3RTdGF0ZW1lbnQgJiYgdHMuaXNSZXR1cm5TdGF0ZW1lbnQobGFzdFN0YXRlbWVudCkgJiYgbGFzdFN0YXRlbWVudC5leHByZXNzaW9uIHx8IG51bGw7XG4gICAgY29uc3QgbmdNb2R1bGVQcm9wZXJ0eSA9IHJldHVybkV4cHJlc3Npb24gJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihyZXR1cm5FeHByZXNzaW9uKSAmJlxuICAgICAgICAgICAgcmV0dXJuRXhwcmVzc2lvbi5wcm9wZXJ0aWVzLmZpbmQoXG4gICAgICAgICAgICAgICAgcHJvcCA9PlxuICAgICAgICAgICAgICAgICAgICAhIXByb3AubmFtZSAmJiB0cy5pc0lkZW50aWZpZXIocHJvcC5uYW1lKSAmJiBwcm9wLm5hbWUudGV4dCA9PT0gJ25nTW9kdWxlJykgfHxcbiAgICAgICAgbnVsbDtcblxuICAgIGlmICghbmdNb2R1bGVQcm9wZXJ0eSB8fCAhdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQobmdNb2R1bGVQcm9wZXJ0eSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFRoZSBuZ01vZHVsZVZhbHVlIGNvdWxkIGJlIG9mIHRoZSBmb3JtIGBTb21lTW9kdWxlYCBvciBgbmFtZXNwYWNlXzEuU29tZU1vZHVsZWBcbiAgICBjb25zdCBuZ01vZHVsZVZhbHVlID0gbmdNb2R1bGVQcm9wZXJ0eS5pbml0aWFsaXplcjtcbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihuZ01vZHVsZVZhbHVlKSAmJiAhdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obmdNb2R1bGVWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5nTW9kdWxlRGVjbGFyYXRpb24gPSB0aGlzLmdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKG5nTW9kdWxlVmFsdWUpO1xuICAgIGlmICghbmdNb2R1bGVEZWNsYXJhdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDYW5ub3QgZmluZCBhIGRlY2xhcmF0aW9uIGZvciBOZ01vZHVsZSAke25nTW9kdWxlVmFsdWUuZ2V0VGV4dCgpfSByZWZlcmVuY2VkIGluIFwiJHtkZWNsYXJhdGlvbiEuZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIGlmICghaGFzTmFtZUlkZW50aWZpZXIobmdNb2R1bGVEZWNsYXJhdGlvbi5ub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgbmdNb2R1bGU6IG5nTW9kdWxlRGVjbGFyYXRpb24gYXMgRGVjbGFyYXRpb248Q2xhc3NEZWNsYXJhdGlvbj4sIGRlY2xhcmF0aW9uLCBjb250YWluZXJcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldERlY2xhcmF0aW9uT2ZFeHByZXNzaW9uKGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOiBEZWNsYXJhdGlvbnxudWxsIHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGV4cHJlc3Npb24pKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXREZWNsYXJhdGlvbk9mSWRlbnRpZmllcihleHByZXNzaW9uKTtcbiAgICB9XG5cbiAgICBpZiAoIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGV4cHJlc3Npb24pIHx8ICF0cy5pc0lkZW50aWZpZXIoZXhwcmVzc2lvbi5leHByZXNzaW9uKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZXNwYWNlRGVjbCA9IHRoaXMuZ2V0RGVjbGFyYXRpb25PZklkZW50aWZpZXIoZXhwcmVzc2lvbi5leHByZXNzaW9uKTtcbiAgICBpZiAoIW5hbWVzcGFjZURlY2wgfHwgIXRzLmlzU291cmNlRmlsZShuYW1lc3BhY2VEZWNsLm5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lc3BhY2VFeHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUobmFtZXNwYWNlRGVjbC5ub2RlKTtcbiAgICBpZiAobmFtZXNwYWNlRXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFuYW1lc3BhY2VFeHBvcnRzLmhhcyhleHByZXNzaW9uLm5hbWUudGV4dCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cG9ydERlY2wgPSBuYW1lc3BhY2VFeHBvcnRzLmdldChleHByZXNzaW9uLm5hbWUudGV4dCkgITtcbiAgICByZXR1cm4gey4uLmV4cG9ydERlY2wsIHZpYU1vZHVsZTogbmFtZXNwYWNlRGVjbC52aWFNb2R1bGV9O1xuICB9XG59XG5cbi8vLy8vLy8vLy8vLy8gRXhwb3J0ZWQgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbmV4cG9ydCB0eXBlIFBhcmFtSW5mbyA9IHtcbiAgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gfCBudWxsLFxuICB0eXBlRXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbiB8IG51bGxcbn07XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIGNhbGwgdG8gYHRzbGliLl9fbWV0YWRhdGFgIGFzIHByZXNlbnQgaW4gYHRzbGliLl9fZGVjb3JhdGVgIGNhbGxzLiBUaGlzIGlzIGFcbiAqIHN5bnRoZXRpYyBkZWNvcmF0b3IgaW5zZXJ0ZWQgYnkgVHlwZVNjcmlwdCB0aGF0IGNvbnRhaW5zIHJlZmxlY3Rpb24gaW5mb3JtYXRpb24gYWJvdXQgdGhlXG4gKiB0YXJnZXQgb2YgdGhlIGRlY29yYXRvciwgaS5lLiB0aGUgY2xhc3Mgb3IgcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyVHlwZXMge1xuICB0eXBlOiAncGFyYW1zJztcbiAgdHlwZXM6IHRzLkV4cHJlc3Npb25bXTtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2FsbCB0byBgdHNsaWIuX19wYXJhbWAgYXMgcHJlc2VudCBpbiBgdHNsaWIuX19kZWNvcmF0ZWAgY2FsbHMuIFRoaXMgY29udGFpbnNcbiAqIGluZm9ybWF0aW9uIG9uIGFueSBkZWNvcmF0b3JzIHdlcmUgYXBwbGllZCB0byBhIGNlcnRhaW4gcGFyYW1ldGVyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlckRlY29yYXRvcnMge1xuICB0eXBlOiAncGFyYW06ZGVjb3JhdG9ycyc7XG4gIGluZGV4OiBudW1iZXI7XG4gIGRlY29yYXRvcjogRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBjYWxsIHRvIGEgZGVjb3JhdG9yIGFzIGl0IHdhcyBwcmVzZW50IGluIHRoZSBvcmlnaW5hbCBzb3VyY2UgY29kZSwgYXMgcHJlc2VudCBpblxuICogYHRzbGliLl9fZGVjb3JhdGVgIGNhbGxzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlY29yYXRvckNhbGwge1xuICB0eXBlOiAnZGVjb3JhdG9yJztcbiAgZGVjb3JhdG9yOiBEZWNvcmF0b3I7XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZGlmZmVyZW50IGtpbmRzIG9mIGRlY29yYXRlIGhlbHBlcnMgdGhhdCBtYXkgYmUgcHJlc2VudCBhcyBmaXJzdCBhcmd1bWVudCB0b1xuICogYHRzbGliLl9fZGVjb3JhdGVgLCBhcyBmb2xsb3dzOlxuICpcbiAqIGBgYFxuICogX19kZWNvcmF0ZShbXG4gKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAqICAgdHNsaWJfMS5fX3BhcmFtKDIsIEluamVjdChJTkpFQ1RFRF9UT0tFTikpLFxuICogICB0c2xpYl8xLl9fbWV0YWRhdGEoXCJkZXNpZ246cGFyYW10eXBlc1wiLCBbVmlld0NvbnRhaW5lclJlZiwgVGVtcGxhdGVSZWYsIFN0cmluZ10pXG4gKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBEZWNvcmF0ZUhlbHBlckVudHJ5ID0gUGFyYW1ldGVyVHlwZXMgfCBQYXJhbWV0ZXJEZWNvcmF0b3JzIHwgRGVjb3JhdG9yQ2FsbDtcblxuLyoqXG4gKiBUaGUgcmVjb3JkZWQgZGVjb3JhdG9yIGluZm9ybWF0aW9uIG9mIGEgc2luZ2xlIGNsYXNzLiBUaGlzIGluZm9ybWF0aW9uIGlzIGNhY2hlZCBpbiB0aGUgaG9zdC5cbiAqL1xuaW50ZXJmYWNlIERlY29yYXRvckluZm8ge1xuICAvKipcbiAgICogQWxsIGRlY29yYXRvcnMgdGhhdCB3ZXJlIHByZXNlbnQgb24gdGhlIGNsYXNzLiBJZiBubyBkZWNvcmF0b3JzIHdlcmUgcHJlc2VudCwgdGhpcyBpcyBgbnVsbGBcbiAgICovXG4gIGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbDtcblxuICAvKipcbiAgICogQWxsIGRlY29yYXRvcnMgcGVyIG1lbWJlciBvZiB0aGUgY2xhc3MgdGhleSB3ZXJlIHByZXNlbnQgb24uXG4gICAqL1xuICBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT47XG5cbiAgLyoqXG4gICAqIFJlcHJlc2VudHMgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBpbmZvcm1hdGlvbiwgc3VjaCBhcyB0aGUgdHlwZSBvZiBhIHBhcmFtZXRlciBhbmQgYWxsXG4gICAqIGRlY29yYXRvcnMgZm9yIGEgY2VydGFpbiBwYXJhbWV0ZXIuIEluZGljZXMgaW4gdGhpcyBhcnJheSBjb3JyZXNwb25kIHdpdGggdGhlIHBhcmFtZXRlcidzIGluZGV4XG4gICAqIGluIHRoZSBjb25zdHJ1Y3Rvci4gTm90ZSB0aGF0IHRoaXMgYXJyYXkgbWF5IGJlIHNwYXJzZSwgaS5lLiBjZXJ0YWluIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgbWF5XG4gICAqIG5vdCBoYXZlIGFueSBpbmZvIHJlY29yZGVkLlxuICAgKi9cbiAgY29uc3RydWN0b3JQYXJhbUluZm86IFBhcmFtSW5mb1tdO1xufVxuXG4vKipcbiAqIEEgc3RhdGVtZW50IG5vZGUgdGhhdCByZXByZXNlbnRzIGFuIGFzc2lnbm1lbnQuXG4gKi9cbmV4cG9ydCB0eXBlIEFzc2lnbm1lbnRTdGF0ZW1lbnQgPVxuICAgIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQgJiB7ZXhwcmVzc2lvbjoge2xlZnQ6IHRzLklkZW50aWZpZXIsIHJpZ2h0OiB0cy5FeHByZXNzaW9ufX07XG5cbi8qKlxuICogVGVzdCB3aGV0aGVyIGEgc3RhdGVtZW50IG5vZGUgaXMgYW4gYXNzaWdubWVudCBzdGF0ZW1lbnQuXG4gKiBAcGFyYW0gc3RhdGVtZW50IHRoZSBzdGF0ZW1lbnQgdG8gdGVzdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQXNzaWdubWVudFN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHN0YXRlbWVudCBpcyBBc3NpZ25tZW50U3RhdGVtZW50IHtcbiAgcmV0dXJuIHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzQXNzaWdubWVudChzdGF0ZW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQXNzaWdubWVudChub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Bc3NpZ25tZW50RXhwcmVzc2lvbjx0cy5FcXVhbHNUb2tlbj4ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIG5vZGUub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIHByb3ZpZGVkIGNhbGwgZXhwcmVzc2lvbiB0YXJnZXRzIGEgY2xhc3MsIGJ5IHZlcmlmeWluZyBpdHMgYXJndW1lbnRzIGFyZVxuICogYWNjb3JkaW5nIHRvIHRoZSBmb2xsb3dpbmcgZm9ybTpcbiAqXG4gKiBgYGBcbiAqIF9fZGVjb3JhdGUoW10sIFNvbWVEaXJlY3RpdmUpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGNhbGwgdGhlIGNhbGwgZXhwcmVzc2lvbiB0aGF0IGlzIHRlc3RlZCB0byByZXByZXNlbnQgYSBjbGFzcyBkZWNvcmF0b3IgY2FsbC5cbiAqIEBwYXJhbSBjbGFzc05hbWUgdGhlIG5hbWUgb2YgdGhlIGNsYXNzIHRoYXQgdGhlIGNhbGwgbmVlZHMgdG8gY29ycmVzcG9uZCB3aXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNDbGFzc0RlY29yYXRlQ2FsbChjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbiwgY2xhc3NOYW1lOiBzdHJpbmcpOlxuICAgIGNhbGwgaXMgdHMuQ2FsbEV4cHJlc3Npb24me2FyZ3VtZW50czogW3RzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24sIHRzLkV4cHJlc3Npb25dfSB7XG4gIGNvbnN0IGhlbHBlckFyZ3MgPSBjYWxsLmFyZ3VtZW50c1swXTtcbiAgaWYgKGhlbHBlckFyZ3MgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGhlbHBlckFyZ3MpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgdGFyZ2V0ID0gY2FsbC5hcmd1bWVudHNbMV07XG4gIHJldHVybiB0YXJnZXQgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0lkZW50aWZpZXIodGFyZ2V0KSAmJiB0YXJnZXQudGV4dCA9PT0gY2xhc3NOYW1lO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIHByb3ZpZGVkIGNhbGwgZXhwcmVzc2lvbiB0YXJnZXRzIGEgbWVtYmVyIG9mIHRoZSBjbGFzcywgYnkgdmVyaWZ5aW5nIGl0c1xuICogYXJndW1lbnRzIGFyZSBhY2NvcmRpbmcgdG8gdGhlIGZvbGxvd2luZyBmb3JtOlxuICpcbiAqIGBgYFxuICogX19kZWNvcmF0ZShbXSwgU29tZURpcmVjdGl2ZS5wcm90b3R5cGUsIFwibWVtYmVyXCIsIHZvaWQgMCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gY2FsbCB0aGUgY2FsbCBleHByZXNzaW9uIHRoYXQgaXMgdGVzdGVkIHRvIHJlcHJlc2VudCBhIG1lbWJlciBkZWNvcmF0b3IgY2FsbC5cbiAqIEBwYXJhbSBjbGFzc05hbWUgdGhlIG5hbWUgb2YgdGhlIGNsYXNzIHRoYXQgdGhlIGNhbGwgbmVlZHMgdG8gY29ycmVzcG9uZCB3aXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNZW1iZXJEZWNvcmF0ZUNhbGwoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24sIGNsYXNzTmFtZTogc3RyaW5nKTpcbiAgICBjYWxsIGlzIHRzLkNhbGxFeHByZXNzaW9uJlxuICAgIHthcmd1bWVudHM6IFt0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uLCB0cy5TdHJpbmdMaXRlcmFsLCB0cy5TdHJpbmdMaXRlcmFsXX0ge1xuICBjb25zdCBoZWxwZXJBcmdzID0gY2FsbC5hcmd1bWVudHNbMF07XG4gIGlmIChoZWxwZXJBcmdzID09PSB1bmRlZmluZWQgfHwgIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihoZWxwZXJBcmdzKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IHRhcmdldCA9IGNhbGwuYXJndW1lbnRzWzFdO1xuICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQgfHwgIXRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHRhcmdldCkgfHxcbiAgICAgICF0cy5pc0lkZW50aWZpZXIodGFyZ2V0LmV4cHJlc3Npb24pIHx8IHRhcmdldC5leHByZXNzaW9uLnRleHQgIT09IGNsYXNzTmFtZSB8fFxuICAgICAgdGFyZ2V0Lm5hbWUudGV4dCAhPT0gJ3Byb3RvdHlwZScpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBjb25zdCBtZW1iZXJOYW1lID0gY2FsbC5hcmd1bWVudHNbMl07XG4gIHJldHVybiBtZW1iZXJOYW1lICE9PSB1bmRlZmluZWQgJiYgdHMuaXNTdHJpbmdMaXRlcmFsKG1lbWJlck5hbWUpO1xufVxuXG4vKipcbiAqIEhlbHBlciBtZXRob2QgdG8gZXh0cmFjdCB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBnaXZlbiB0aGUgcHJvcGVydHkncyBcInN5bWJvbFwiLFxuICogd2hpY2ggaXMgYWN0dWFsbHkgdGhlIHN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBvZiB0aGUgcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwcm9wU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5FeHByZXNzaW9ufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHByb3BJZGVudGlmaWVyID0gcHJvcFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICBjb25zdCBwYXJlbnQgPSBwcm9wSWRlbnRpZmllciAmJiBwcm9wSWRlbnRpZmllci5wYXJlbnQ7XG4gIHJldHVybiBwYXJlbnQgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKHBhcmVudCkgPyBwYXJlbnQucmlnaHQgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQSBjYWxsZWUgY291bGQgYmUgb25lIG9mOiBgX19kZWNvcmF0ZSguLi4pYCBvciBgdHNsaWJfMS5fX2RlY29yYXRlYC5cbiAqL1xuZnVuY3Rpb24gZ2V0Q2FsbGVlTmFtZShjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbik6IHN0cmluZ3xudWxsIHtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihjYWxsLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIHN0cmlwRG9sbGFyU3VmZml4KGNhbGwuZXhwcmVzc2lvbi50ZXh0KTtcbiAgfVxuICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBzdHJpcERvbGxhclN1ZmZpeChjYWxsLmV4cHJlc3Npb24ubmFtZS50ZXh0KTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLy8vLy8vLy8vLy8vLyBJbnRlcm5hbCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuLyoqXG4gKiBJbiBFUzIwMTUsIGEgY2xhc3MgbWF5IGJlIGRlY2xhcmVkIHVzaW5nIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gb2YgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmU6XG4gKlxuICogYGBgXG4gKiB2YXIgTXlDbGFzcyA9IE15Q2xhc3NfMSA9IGNsYXNzIE15Q2xhc3Mge307XG4gKiBgYGBcbiAqXG4gKiBIZXJlLCB0aGUgaW50ZXJtZWRpYXRlIGBNeUNsYXNzXzFgIGFzc2lnbm1lbnQgaXMgb3B0aW9uYWwuIEluIHRoZSBhYm92ZSBleGFtcGxlLCB0aGVcbiAqIGBjbGFzcyBNeUNsYXNzIHt9YCBleHByZXNzaW9uIGlzIHJldHVybmVkIGFzIGRlY2xhcmF0aW9uIG9mIGBNeUNsYXNzYC4gTm90ZSB0aGF0IGlmIGBub2RlYFxuICogcmVwcmVzZW50cyBhIHJlZ3VsYXIgY2xhc3MgZGVjbGFyYXRpb24sIGl0IHdpbGwgYmUgcmV0dXJuZWQgYXMtaXMuXG4gKlxuICogQHBhcmFtIG5vZGUgdGhlIG5vZGUgdGhhdCByZXByZXNlbnRzIHRoZSBjbGFzcyB3aG9zZSBkZWNsYXJhdGlvbiB3ZSBhcmUgZmluZGluZy5cbiAqIEByZXR1cm5zIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgY2xhc3Mgb3IgYG51bGxgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIi5cbiAqL1xuZnVuY3Rpb24gZ2V0SW5uZXJDbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbnx0cy5DbGFzc0V4cHJlc3Npb24+fG51bGwge1xuICAvLyBSZWNvZ25pemUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBvZiB0aGUgZm9ybSBgdmFyIE15Q2xhc3MgPSBjbGFzcyBNeUNsYXNzIHt9YCBvclxuICAvLyBgdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O2BcbiAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSAmJiBub2RlLmluaXRpYWxpemVyICE9PSB1bmRlZmluZWQpIHtcbiAgICBub2RlID0gbm9kZS5pbml0aWFsaXplcjtcbiAgICB3aGlsZSAoaXNBc3NpZ25tZW50KG5vZGUpKSB7XG4gICAgICBub2RlID0gbm9kZS5yaWdodDtcbiAgICB9XG4gIH1cblxuICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSAmJiAhdHMuaXNDbGFzc0V4cHJlc3Npb24obm9kZSkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBoYXNOYW1lSWRlbnRpZmllcihub2RlKSA/IG5vZGUgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXREZWNvcmF0b3JBcmdzKG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbltdIHtcbiAgLy8gVGhlIGFyZ3VtZW50cyBvZiBhIGRlY29yYXRvciBhcmUgaGVsZCBpbiB0aGUgYGFyZ3NgIHByb3BlcnR5IG9mIGl0cyBkZWNsYXJhdGlvbiBvYmplY3QuXG4gIGNvbnN0IGFyZ3NQcm9wZXJ0eSA9IG5vZGUucHJvcGVydGllcy5maWx0ZXIodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuZmluZChwcm9wZXJ0eSA9PiBnZXROYW1lVGV4dChwcm9wZXJ0eS5uYW1lKSA9PT0gJ2FyZ3MnKTtcbiAgY29uc3QgYXJnc0V4cHJlc3Npb24gPSBhcmdzUHJvcGVydHkgJiYgYXJnc1Byb3BlcnR5LmluaXRpYWxpemVyO1xuICByZXR1cm4gYXJnc0V4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGFyZ3NFeHByZXNzaW9uKSA/XG4gICAgICBBcnJheS5mcm9tKGFyZ3NFeHByZXNzaW9uLmVsZW1lbnRzKSA6XG4gICAgICBbXTtcbn1cblxuZnVuY3Rpb24gaXNQcm9wZXJ0eUFjY2Vzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24mXG4gICAge3BhcmVudDogdHMuQmluYXJ5RXhwcmVzc2lvbn0ge1xuICByZXR1cm4gISFub2RlLnBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZS5wYXJlbnQpICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpc1RoaXNBc3NpZ25tZW50KG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5CaW5hcnlFeHByZXNzaW9uJlxuICAgIHtsZWZ0OiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpICYmXG4gICAgICBub2RlLmxlZnQuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkO1xufVxuXG5mdW5jdGlvbiBpc05hbWVkRGVjbGFyYXRpb24obm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLk5hbWVkRGVjbGFyYXRpb24mXG4gICAge25hbWU6IHRzLklkZW50aWZpZXJ9IHtcbiAgY29uc3QgYW55Tm9kZTogYW55ID0gbm9kZTtcbiAgcmV0dXJuICEhYW55Tm9kZS5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihhbnlOb2RlLm5hbWUpO1xufVxuXG5cbmZ1bmN0aW9uIGlzQ2xhc3NNZW1iZXJUeXBlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5DbGFzc0VsZW1lbnR8XG4gICAgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuaXNDbGFzc0VsZW1lbnQobm9kZSkgfHwgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSB8fCB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSk7XG59XG5cbi8qKlxuICogQ29sbGVjdCBtYXBwaW5ncyBiZXR3ZWVuIGV4cG9ydGVkIGRlY2xhcmF0aW9ucyBpbiBhIHNvdXJjZSBmaWxlIGFuZCBpdHMgYXNzb2NpYXRlZFxuICogZGVjbGFyYXRpb24gaW4gdGhlIHR5cGluZ3MgcHJvZ3JhbS5cbiAqL1xuZnVuY3Rpb24gY29sbGVjdEV4cG9ydGVkRGVjbGFyYXRpb25zKFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+LFxuICAgIHNyY0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgY29uc3Qgc3JjTW9kdWxlID0gc3JjRmlsZSAmJiBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oc3JjRmlsZSk7XG4gIGNvbnN0IG1vZHVsZUV4cG9ydHMgPSBzcmNNb2R1bGUgJiYgY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUoc3JjTW9kdWxlKTtcbiAgaWYgKG1vZHVsZUV4cG9ydHMpIHtcbiAgICBtb2R1bGVFeHBvcnRzLmZvckVhY2goZXhwb3J0ZWRTeW1ib2wgPT4ge1xuICAgICAgaWYgKGV4cG9ydGVkU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgICAgZXhwb3J0ZWRTeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2woZXhwb3J0ZWRTeW1ib2wpO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSBleHBvcnRlZFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkU3ltYm9sLm5hbWU7XG4gICAgICBpZiAoZGVjbGFyYXRpb24gJiYgIWR0c0RlY2xhcmF0aW9uTWFwLmhhcyhuYW1lKSkge1xuICAgICAgICBkdHNEZWNsYXJhdGlvbk1hcC5zZXQobmFtZSwgZGVjbGFyYXRpb24pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQXR0ZW1wdCB0byByZXNvbHZlIHRoZSB2YXJpYWJsZSBkZWNsYXJhdGlvbiB0aGF0IHRoZSBnaXZlbiBkZWNsYXJhdGlvbiBpcyBhc3NpZ25lZCB0by5cbiAqIEZvciBleGFtcGxlLCBmb3IgdGhlIGZvbGxvd2luZyBjb2RlOlxuICpcbiAqIGBgYFxuICogdmFyIE15Q2xhc3MgPSBNeUNsYXNzXzEgPSBjbGFzcyBNeUNsYXNzIHt9O1xuICogYGBgXG4gKlxuICogYW5kIHRoZSBwcm92aWRlZCBkZWNsYXJhdGlvbiBiZWluZyBgY2xhc3MgTXlDbGFzcyB7fWAsIHRoaXMgd2lsbCByZXR1cm4gdGhlIGB2YXIgTXlDbGFzc2BcbiAqIGRlY2xhcmF0aW9uLlxuICpcbiAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gZm9yIHdoaWNoIGFueSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzaG91bGQgYmUgb2J0YWluZWQuXG4gKiBAcmV0dXJucyB0aGUgb3V0ZXIgdmFyaWFibGUgZGVjbGFyYXRpb24gaWYgZm91bmQsIHVuZGVmaW5lZCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGdldFZhcmlhYmxlRGVjbGFyYXRpb25PZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IHRzLlZhcmlhYmxlRGVjbGFyYXRpb258XG4gICAgdW5kZWZpbmVkIHtcbiAgbGV0IG5vZGUgPSBkZWNsYXJhdGlvbi5wYXJlbnQ7XG5cbiAgLy8gRGV0ZWN0IGFuIGludGVybWVkaWFyeSB2YXJpYWJsZSBhc3NpZ25tZW50IGFuZCBza2lwIG92ZXIgaXQuXG4gIGlmIChpc0Fzc2lnbm1lbnQobm9kZSkgJiYgdHMuaXNJZGVudGlmaWVyKG5vZGUubGVmdCkpIHtcbiAgICBub2RlID0gbm9kZS5wYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpID8gbm9kZSA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBBIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG1heSBoYXZlIGJlZW4gXCJzeW50aGVzaXplZFwiIGJ5IFR5cGVTY3JpcHQgZHVyaW5nIEphdmFTY3JpcHQgZW1pdCxcbiAqIGluIHRoZSBjYXNlIG5vIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGUuZy4gcHJvcGVydHkgaW5pdGlhbGl6ZXJzIGFyZSB1c2VkLlxuICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAqIGNvbXBpbGVyIGdlbmVyYXRlcyBhIHN5bnRoZXRpYyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gKiBvcmlnaW5hbGx5IGhhdmUgYSBjb25zdHJ1Y3RvciBpbiB0aGUgVHlwZVNjcmlwdCBzb3VyY2UuIFdoZW4gYSBjbGFzcyBoYXMgYSBzdXBlcmNsYXNzLFxuICogYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciBtdXN0IG5vdCBiZSBjb25zaWRlcmVkIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXRcbiAqIHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5IG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiB0aGF0IGRvZXMgbm90IGluamVjdCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0XG4gKiBzeW50aGVzaXplZCBzdXBlciBjYWxsIGluIHRoZSBjb25zdHJ1Y3RvciBib2R5LCBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHRcbiAqIGVtaXRzIGR1cmluZyBKYXZhU2NyaXB0IGVtaXQ6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi92My4yLjIvc3JjL2NvbXBpbGVyL3RyYW5zZm9ybWVycy90cy50cyNMMTA2OC1MMTA4MlxuICpcbiAqIEBwYXJhbSBjb25zdHJ1Y3RvciBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIHRlc3RcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGNvbnN0cnVjdG9yIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcjogdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGNvbnN0cnVjdG9yLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgaWYgKCFmaXJzdFN0YXRlbWVudCB8fCAhdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkU3VwZXJDYWxsKGZpcnN0U3RhdGVtZW50LmV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWQgYnkgVHlwZVNjcmlwdCwgaS5lLiB3aGV0aGVyXG4gKiBpdCBpcyBvZiB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBzdXBlciguLi5hcmd1bWVudHMpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBpcyB0byBiZSB0ZXN0ZWRcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5leHByZXNzaW9uLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuU3VwZXJLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICByZXR1cm4gdHMuaXNTcHJlYWRFbGVtZW50KGFyZ3VtZW50KSAmJiB0cy5pc0lkZW50aWZpZXIoYXJndW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIGFyZ3VtZW50LmV4cHJlc3Npb24udGV4dCA9PT0gJ2FyZ3VtZW50cyc7XG59XG4iXX0=