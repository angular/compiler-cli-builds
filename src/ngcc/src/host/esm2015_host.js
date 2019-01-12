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
        define("@angular/compiler-cli/src/ngcc/src/host/esm2015_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngcc/src/utils", "@angular/compiler-cli/src/ngcc/src/host/decorated_class", "@angular/compiler-cli/src/ngcc/src/host/ngcc_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    var decorated_class_1 = require("@angular/compiler-cli/src/ngcc/src/host/decorated_class");
    var ngcc_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/ngcc_host");
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
        function Esm2015ReflectionHost(isCore, checker, dts) {
            var _this = _super.call(this, checker) || this;
            _this.isCore = isCore;
            _this.dtsDeclarationMap = dts && _this.computeDtsDeclarationMap(dts.path, dts.program) || null;
            return _this;
        }
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
         * @param declaration a TypeScript `ts.Declaration` node representing the class over which to
         * reflect. If the source is in ES6 format, this will be a `ts.ClassDeclaration` node. If the
         * source is in ES5 format, this might be a `ts.VariableDeclaration` as classes in ES5 are
         * represented as the result of an IIFE execution.
         *
         * @returns an array of `ClassMember` metadata representing the members of the class.
         *
         * @throws if `declaration` does not resolve to a class declaration.
         */
        Esm2015ReflectionHost.prototype.getMembersOfClass = function (clazz) {
            var _this = this;
            var members = [];
            var symbol = this.getClassSymbol(clazz);
            if (!symbol) {
                throw new Error("Attempted to get members of a non-class: \"" + clazz.getText() + "\"");
            }
            // The decorators map contains all the properties that are decorated
            var decoratorsMap = this.getMemberDecorators(symbol);
            // The member map contains all the method (instance and static); and any instance properties
            // that are initialized in the class.
            if (symbol.members) {
                symbol.members.forEach(function (value, key) {
                    var decorators = removeFromMap(decoratorsMap, key);
                    var member = _this.reflectMember(value, decorators);
                    if (member) {
                        members.push(member);
                    }
                });
            }
            // The static property map contains all the static properties
            if (symbol.exports) {
                symbol.exports.forEach(function (value, key) {
                    var decorators = removeFromMap(decoratorsMap, key);
                    var member = _this.reflectMember(value, decorators, true);
                    if (member) {
                        members.push(member);
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
            if (ts.isVariableDeclaration(symbol.valueDeclaration.parent)) {
                var variableSymbol = this.checker.getSymbolAtLocation(symbol.valueDeclaration.parent.name);
                if (variableSymbol && variableSymbol.exports) {
                    variableSymbol.exports.forEach(function (value, key) {
                        var decorators = removeFromMap(decoratorsMap, key);
                        var member = _this.reflectMember(value, decorators, true);
                        if (member) {
                            members.push(member);
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
         * Reflect over the constructor of a class and return metadata about its parameters.
         *
         * This method only looks at the constructor of a class directly and not at any inherited
         * constructors.
         *
         * @param declaration a TypeScript `ts.Declaration` node representing the class over which to
         * reflect. If the source is in ES6 format, this will be a `ts.ClassDeclaration` node. If the
         * source is in ES5 format, this might be a `ts.VariableDeclaration` as classes in ES5 are
         * represented as the result of an IIFE execution.
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
        /**
         * Find a symbol for a node that we think is a class.
         * @param node the node whose symbol we are finding.
         * @returns the symbol for the node or `undefined` if it is not a "class" or has no symbol.
         */
        Esm2015ReflectionHost.prototype.getClassSymbol = function (declaration) {
            if (ts.isClassDeclaration(declaration)) {
                return declaration.name && this.checker.getSymbolAtLocation(declaration.name);
            }
            if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
                declaration = declaration.initializer;
            }
            if (ts.isClassExpression(declaration)) {
                return declaration.name && this.checker.getSymbolAtLocation(declaration.name);
            }
            return undefined;
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
         * Determine if an identifier was imported from another module and return `Import` metadata
         * describing its origin.
         *
         * @param id a TypeScript `ts.Identifer` to reflect.
         *
         * @returns metadata about the `Import` if the identifier was imported from another module, or
         * `null` if the identifier doesn't resolve to an import but instead is locally defined.
         */
        Esm2015ReflectionHost.prototype.getImportOfIdentifier = function (id) {
            return _super.prototype.getImportOfIdentifier.call(this, id) || this.getImportOfNamespacedIdentifier(id);
        };
        /**
         * Find all the classes that contain decorations in a given file.
         * @param sourceFile The source file to search for decorated classes.
         * @returns An array of decorated classes.
         */
        Esm2015ReflectionHost.prototype.findDecoratedClasses = function (sourceFile) {
            var _this = this;
            var classes = [];
            sourceFile.statements.map(function (statement) {
                if (ts.isVariableStatement(statement)) {
                    statement.declarationList.declarations.forEach(function (declaration) {
                        var decoratedClass = _this.getDecoratedClassFromSymbol(_this.getClassSymbol(declaration));
                        if (decoratedClass) {
                            classes.push(decoratedClass);
                        }
                    });
                }
                else if (ts.isClassDeclaration(statement)) {
                    var decoratedClass = _this.getDecoratedClassFromSymbol(_this.getClassSymbol(statement));
                    if (decoratedClass) {
                        classes.push(decoratedClass);
                    }
                }
            });
            return classes;
        };
        /**
         * Get the number of generic type parameters of a given class.
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
            return this.dtsDeclarationMap.get(declaration.name.text) || null;
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
                            var info = _this.parseForModuleWithProviders(member.node);
                            if (info) {
                                infos.push(info);
                            }
                        }
                    });
                }
                else {
                    var info = _this.parseForModuleWithProviders(declaration.node);
                    if (info) {
                        infos.push(info);
                    }
                }
            });
            return infos;
        };
        ///////////// Protected Helpers /////////////
        Esm2015ReflectionHost.prototype.getDecoratorsOfSymbol = function (symbol) {
            var decoratorsProperty = this.getStaticProperty(symbol, exports.DECORATORS);
            if (decoratorsProperty) {
                return this.getClassDecoratorsFromStaticProperty(decoratorsProperty);
            }
            else {
                return this.getClassDecoratorsFromHelperCall(symbol);
            }
        };
        Esm2015ReflectionHost.prototype.getDecoratedClassFromSymbol = function (symbol) {
            if (symbol) {
                var decorators = this.getDecoratorsOfSymbol(symbol);
                if (decorators && decorators.length) {
                    return new decorated_class_1.DecoratedClass(symbol.name, symbol.valueDeclaration, decorators);
                }
            }
            return null;
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
         * Get all class decorators for the given class, where the decorators are declared
         * via the `__decorate` helper method. For example:
         *
         * ```
         * let SomeDirective = class SomeDirective {}
         * SomeDirective = __decorate([
         *   Directive({ selector: '[someDirective]' }),
         * ], SomeDirective);
         * ```
         *
         * @param symbol the class whose decorators we want to get.
         * @returns an array of decorators or null if none where found.
         */
        Esm2015ReflectionHost.prototype.getClassDecoratorsFromHelperCall = function (symbol) {
            var _this = this;
            var decorators = [];
            var helperCalls = this.getHelperCallsForClass(symbol, '__decorate');
            helperCalls.forEach(function (helperCall) {
                var classDecorators = _this.reflectDecoratorsFromHelperCall(helperCall, makeClassTargetFilter(symbol.name)).classDecorators;
                classDecorators.filter(function (decorator) { return _this.isFromCore(decorator); })
                    .forEach(function (decorator) { return decorators.push(decorator); });
            });
            return decorators.length ? decorators : null;
        };
        /**
         * Get all the member decorators for the given class.
         * @param classSymbol the class whose member decorators we are interested in.
         * @returns a map whose keys are the name of the members and whose values are collections of
         * decorators for the given member.
         */
        Esm2015ReflectionHost.prototype.getMemberDecorators = function (classSymbol) {
            var decoratorsProperty = this.getStaticProperty(classSymbol, exports.PROP_DECORATORS);
            if (decoratorsProperty) {
                return this.getMemberDecoratorsFromStaticProperty(decoratorsProperty);
            }
            else {
                return this.getMemberDecoratorsFromHelperCalls(classSymbol);
            }
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
         * Member decorators may be declared via helper call statements.
         *
         * ```
         * __decorate([
         *     Input(),
         *     __metadata("design:type", String)
         * ], SomeDirective.prototype, "input1", void 0);
         * ```
         *
         * @param classSymbol the class whose member decorators we are interested in.
         * @returns a map whose keys are the name of the members and whose values are collections of
         * decorators for the given member.
         */
        Esm2015ReflectionHost.prototype.getMemberDecoratorsFromHelperCalls = function (classSymbol) {
            var _this = this;
            var memberDecoratorMap = new Map();
            var helperCalls = this.getHelperCallsForClass(classSymbol, '__decorate');
            helperCalls.forEach(function (helperCall) {
                var memberDecorators = _this.reflectDecoratorsFromHelperCall(helperCall, makeMemberTargetFilter(classSymbol.name)).memberDecorators;
                memberDecorators.forEach(function (decorators, memberName) {
                    if (memberName) {
                        var memberDecorators_1 = memberDecoratorMap.get(memberName) || [];
                        var coreDecorators = decorators.filter(function (decorator) { return _this.isFromCore(decorator); });
                        memberDecoratorMap.set(memberName, memberDecorators_1.concat(coreDecorators));
                    }
                });
            });
            return memberDecoratorMap;
        };
        /**
         * Extract decorator info from `__decorate` helper function calls.
         * @param helperCall the call to a helper that may contain decorator calls
         * @param targetFilter a function to filter out targets that we are not interested in.
         * @returns a mapping from member name to decorators, where the key is either the name of the
         * member or `undefined` if it refers to decorators on the class as a whole.
         */
        Esm2015ReflectionHost.prototype.reflectDecoratorsFromHelperCall = function (helperCall, targetFilter) {
            var _this = this;
            var classDecorators = [];
            var memberDecorators = new Map();
            // First check that the `target` argument is correct
            if (targetFilter(helperCall.arguments[1])) {
                // Grab the `decorators` argument which should be an array of calls
                var decoratorCalls = helperCall.arguments[0];
                if (decoratorCalls && ts.isArrayLiteralExpression(decoratorCalls)) {
                    decoratorCalls.elements.forEach(function (element) {
                        // We only care about those elements that are actual calls
                        if (ts.isCallExpression(element)) {
                            var decorator = _this.reflectDecoratorCall(element);
                            if (decorator) {
                                var keyArg = helperCall.arguments[2];
                                var keyName = keyArg && ts.isStringLiteral(keyArg) ? keyArg.text : undefined;
                                if (keyName === undefined) {
                                    classDecorators.push(decorator);
                                }
                                else {
                                    var decorators = memberDecorators.get(keyName) || [];
                                    decorators.push(decorator);
                                    memberDecorators.set(keyName, decorators);
                                }
                            }
                        }
                    });
                }
            }
            return { classDecorators: classDecorators, memberDecorators: memberDecorators };
        };
        /**
         * Extract the decorator information from a call to a decorator as a function.
         * This happens when the decorators has been used in a `__decorate` helper call.
         * For example:
         *
         * ```
         * __decorate([
         *   Directive({ selector: '[someDirective]' }),
         * ], SomeDirective);
         * ```
         *
         * Here the `Directive` decorator is decorating `SomeDirective` and the options for
         * the decorator are passed as arguments to the `Directive()` call.
         *
         * @param call the call to the decorator.
         * @returns a decorator containing the reflected information, or null if the call
         * is not a valid decorator call.
         */
        Esm2015ReflectionHost.prototype.reflectDecoratorCall = function (call) {
            // The call could be of the form `Decorator(...)` or `namespace_1.Decorator(...)`
            var decoratorExpression = ts.isPropertyAccessExpression(call.expression) ? call.expression.name : call.expression;
            if (ts.isIdentifier(decoratorExpression)) {
                // We found a decorator!
                var decoratorIdentifier = decoratorExpression;
                return {
                    name: decoratorIdentifier.text,
                    identifier: decoratorIdentifier,
                    import: this.getImportOfIdentifier(decoratorIdentifier),
                    node: call,
                    args: Array.from(call.arguments)
                };
            }
            return null;
        };
        /**
         * Check the given statement to see if it is a call to the specified helper function or null if
         * not found.
         *
         * Matching statements will look like:  `tslib_1.__decorate(...);`.
         * @param statement the statement that may contain the call.
         * @param helperName the name of the helper we are looking for.
         * @returns the node that corresponds to the `__decorate(...)` call or null if the statement does
         * not match.
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
                        var typeIdentifier = decorator.get('type');
                        if (typeIdentifier && ts.isIdentifier(typeIdentifier)) {
                            decorators.push({
                                name: typeIdentifier.text,
                                identifier: typeIdentifier,
                                import: _this.getImportOfIdentifier(typeIdentifier), node: node,
                                args: getDecoratorArgs(node),
                            });
                        }
                    }
                });
            }
            return decorators;
        };
        /**
         * Reflect over a symbol and extract the member information, combining it with the
         * provided decorator information, and whether it is a static member.
         * @param symbol the symbol for the member to reflect over.
         * @param decorators an array of decorators associated with the member.
         * @param isStatic true if this member is static, false if it is an instance property.
         * @returns the reflected member information, or null if the symbol is not a member.
         */
        Esm2015ReflectionHost.prototype.reflectMember = function (symbol, decorators, isStatic) {
            var kind = null;
            var value = null;
            var name = null;
            var nameNode = null;
            var node = symbol.valueDeclaration || symbol.declarations && symbol.declarations[0];
            if (!node || !isClassMemberType(node)) {
                return null;
            }
            if (symbol.flags & ts.SymbolFlags.Method) {
                kind = reflection_1.ClassMemberKind.Method;
            }
            else if (symbol.flags & ts.SymbolFlags.Property) {
                kind = reflection_1.ClassMemberKind.Property;
            }
            else if (symbol.flags & ts.SymbolFlags.GetAccessor) {
                kind = reflection_1.ClassMemberKind.Getter;
            }
            else if (symbol.flags & ts.SymbolFlags.SetAccessor) {
                kind = reflection_1.ClassMemberKind.Setter;
            }
            if (isStatic && isPropertyAccess(node)) {
                name = node.name.text;
                value = symbol.flags & ts.SymbolFlags.Property ? node.parent.right : null;
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
                console.warn("Unknown member type: \"" + node.getText());
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
            var constructorSymbol = classSymbol.members && classSymbol.members.get(exports.CONSTRUCTOR);
            if (constructorSymbol) {
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
            var paramsProperty = this.getStaticProperty(classSymbol, exports.CONSTRUCTOR_PARAMS);
            var paramInfo = paramsProperty ?
                this.getParamInfoFromStaticProperty(paramsProperty) :
                this.getParamInfoFromHelperCall(classSymbol, parameterNodes);
            return parameterNodes.map(function (node, index) {
                var _a = paramInfo && paramInfo[index] ?
                    paramInfo[index] :
                    { decorators: null, typeExpression: null }, decorators = _a.decorators, typeExpression = _a.typeExpression;
                var nameNode = node.name;
                return { name: utils_1.getNameText(nameNode), nameNode: nameNode, typeExpression: typeExpression, typeNode: null, decorators: decorators };
            });
        };
        /**
         * Get the parameter type and decorators for the constructor of a class,
         * where the information is stored on a static method of the class.
         *
         * Note that in ESM2015, the method is defined by an arrow function that returns an array of
         * decorator and type information.
         *
         * ```
         * SomeDirective.ctorParameters = () => [
         *   { type: ViewContainerRef, },
         *   { type: TemplateRef, },
         *   { type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN,] },] },
         * ];
         * ```
         *
         * @param paramDecoratorsProperty the property that holds the parameter info we want to get.
         * @returns an array of objects containing the type and decorators for each parameter.
         */
        Esm2015ReflectionHost.prototype.getParamInfoFromStaticProperty = function (paramDecoratorsProperty) {
            var _this = this;
            var paramDecorators = getPropertyValueFromSymbol(paramDecoratorsProperty);
            if (paramDecorators && ts.isArrowFunction(paramDecorators)) {
                if (ts.isArrayLiteralExpression(paramDecorators.body)) {
                    var elements = paramDecorators.body.elements;
                    return elements
                        .map(function (element) {
                        return ts.isObjectLiteralExpression(element) ? reflection_1.reflectObjectLiteral(element) : null;
                    })
                        .map(function (paramInfo) {
                        var typeExpression = paramInfo && paramInfo.get('type') || null;
                        var decoratorInfo = paramInfo && paramInfo.get('decorators') || null;
                        var decorators = decoratorInfo &&
                            _this.reflectDecorators(decoratorInfo)
                                .filter(function (decorator) { return _this.isFromCore(decorator); });
                        return { typeExpression: typeExpression, decorators: decorators };
                    });
                }
            }
            return null;
        };
        /**
         * Get the parameter type and decorators for a class where the information is stored via
         * calls to `__decorate` helpers.
         *
         * Reflect over the helpers to find the decorators and types about each of
         * the class's constructor parameters.
         *
         * @param classSymbol the class whose parameter info we want to get.
         * @param parameterNodes the array of TypeScript parameter nodes for this class's constructor.
         * @returns an array of objects containing the type and decorators for each parameter.
         */
        Esm2015ReflectionHost.prototype.getParamInfoFromHelperCall = function (classSymbol, parameterNodes) {
            var _this = this;
            var parameters = parameterNodes.map(function () { return ({ typeExpression: null, decorators: null }); });
            var helperCalls = this.getHelperCallsForClass(classSymbol, '__decorate');
            helperCalls.forEach(function (helperCall) {
                var classDecorators = _this.reflectDecoratorsFromHelperCall(helperCall, makeClassTargetFilter(classSymbol.name)).classDecorators;
                classDecorators.forEach(function (call) {
                    switch (call.name) {
                        case '__metadata':
                            var metadataArg = call.args && call.args[0];
                            var typesArg = call.args && call.args[1];
                            var isParamTypeDecorator = metadataArg && ts.isStringLiteral(metadataArg) &&
                                metadataArg.text === 'design:paramtypes';
                            var types = typesArg && ts.isArrayLiteralExpression(typesArg) && typesArg.elements;
                            if (isParamTypeDecorator && types) {
                                types.forEach(function (type, index) { return parameters[index].typeExpression = type; });
                            }
                            break;
                        case '__param':
                            var paramIndexArg = call.args && call.args[0];
                            var decoratorCallArg = call.args && call.args[1];
                            var paramIndex = paramIndexArg && ts.isNumericLiteral(paramIndexArg) ?
                                parseInt(paramIndexArg.text, 10) :
                                NaN;
                            var decorator = decoratorCallArg && ts.isCallExpression(decoratorCallArg) ?
                                _this.reflectDecoratorCall(decoratorCallArg) :
                                null;
                            if (!isNaN(paramIndex) && decorator) {
                                var decorators = parameters[paramIndex].decorators =
                                    parameters[paramIndex].decorators || [];
                                decorators.push(decorator);
                            }
                            break;
                    }
                });
            });
            return parameters;
        };
        /**
         * Search statements related to the given class for calls to the specified helper.
         * @param classSymbol the class whose helper calls we are interested in.
         * @param helperName the name of the helper (e.g. `__decorate`) whose calls we are interested in.
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
         * Try to get the import info for this identifier as though it is a namespaced import.
         * For example, if the identifier is the `__metadata` part of a property access chain like:
         *
         * ```
         * tslib_1.__metadata
         * ```
         *
         * then it might be that `tslib_1` is a namespace import such as:
         *
         * ```
         * import * as tslib_1 from 'tslib';
         * ```
         * @param id the TypeScript identifier to find the import info for.
         * @returns The import info if this is a namespaced import or `null`.
         */
        Esm2015ReflectionHost.prototype.getImportOfNamespacedIdentifier = function (id) {
            if (!(ts.isPropertyAccessExpression(id.parent) && id.parent.name === id)) {
                return null;
            }
            var namespaceIdentifier = getFarLeftIdentifier(id.parent);
            var namespaceSymbol = namespaceIdentifier && this.checker.getSymbolAtLocation(namespaceIdentifier);
            var declaration = namespaceSymbol && namespaceSymbol.declarations.length === 1 ?
                namespaceSymbol.declarations[0] :
                null;
            var namespaceDeclaration = declaration && ts.isNamespaceImport(declaration) ? declaration : null;
            if (!namespaceDeclaration) {
                return null;
            }
            var importDeclaration = namespaceDeclaration.parent.parent;
            if (!ts.isStringLiteral(importDeclaration.moduleSpecifier)) {
                // Should not happen as this would be invalid TypesScript
                return null;
            }
            return {
                from: importDeclaration.moduleSpecifier.text,
                name: id.text,
            };
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
         * We are most interested in classes that are publicly exported from the entry point, so these are
         * added to the map first, to ensure that they are not ignored.
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
         * Parse the given node, to see if it is a function that returns a `ModuleWithProviders` object.
         * @param node a node to check to see if it is a function that returns a `ModuleWithProviders`
         * object.
         * @returns info about the function if it does return a `ModuleWithProviders` object; `null`
         * otherwise.
         */
        Esm2015ReflectionHost.prototype.parseForModuleWithProviders = function (node) {
            var declaration = node && (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) ? node : null;
            var body = declaration ? this.getDefinitionOfFunction(declaration).body : null;
            var lastStatement = body && body[body.length - 1];
            var returnExpression = lastStatement && ts.isReturnStatement(lastStatement) && lastStatement.expression || null;
            var ngModuleProperty = returnExpression && ts.isObjectLiteralExpression(returnExpression) &&
                returnExpression.properties.find(function (prop) {
                    return !!prop.name && ts.isIdentifier(prop.name) && prop.name.text === 'ngModule';
                }) ||
                null;
            var ngModule = ngModuleProperty && ts.isPropertyAssignment(ngModuleProperty) &&
                ts.isIdentifier(ngModuleProperty.initializer) && ngModuleProperty.initializer ||
                null;
            return ngModule && declaration && { ngModule: ngModule, declaration: declaration };
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
    function isAssignment(expression) {
        return ts.isBinaryExpression(expression) &&
            expression.operatorToken.kind === ts.SyntaxKind.EqualsToken;
    }
    exports.isAssignment = isAssignment;
    /**
     * Creates a function that tests whether the given expression is a class target.
     * @param className the name of the class we want to target.
     */
    function makeClassTargetFilter(className) {
        return function (target) { return ts.isIdentifier(target) && target.text === className; };
    }
    exports.makeClassTargetFilter = makeClassTargetFilter;
    /**
     * Creates a function that tests whether the given expression is a class member target.
     * @param className the name of the class we want to target.
     */
    function makeMemberTargetFilter(className) {
        return function (target) { return ts.isPropertyAccessExpression(target) &&
            ts.isIdentifier(target.expression) && target.expression.text === className &&
            target.name.text === 'prototype'; };
    }
    exports.makeMemberTargetFilter = makeMemberTargetFilter;
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
            return call.expression.text;
        }
        if (ts.isPropertyAccessExpression(call.expression)) {
            return call.expression.name.text;
        }
        return null;
    }
    ///////////// Internal Helpers /////////////
    function getDecoratorArgs(node) {
        // The arguments of a decorator are held in the `args` property of its declaration object.
        var argsProperty = node.properties.filter(ts.isPropertyAssignment)
            .find(function (property) { return utils_1.getNameText(property.name) === 'args'; });
        var argsExpression = argsProperty && argsProperty.initializer;
        return argsExpression && ts.isArrayLiteralExpression(argsExpression) ?
            Array.from(argsExpression.elements) :
            [];
    }
    function removeFromMap(map, key) {
        var mapKey = key;
        var value = map.get(mapKey);
        if (value !== undefined) {
            map.delete(mapKey);
        }
        return value;
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
     * Compute the left most identifier in a property access chain. E.g. the `a` of `a.b.c.d`.
     * @param propertyAccess The starting property access expression from which we want to compute
     * the left most identifier.
     * @returns the left most identifier in the chain or `null` if it is not an identifier.
     */
    function getFarLeftIdentifier(propertyAccess) {
        while (ts.isPropertyAccessExpression(propertyAccess.expression)) {
            propertyAccess = propertyAccess.expression;
        }
        return ts.isIdentifier(propertyAccess.expression) ? propertyAccess.expression : null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTIwMTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMseUVBQXlKO0lBRXpKLGtFQUF5RDtJQUV6RCwyRkFBaUQ7SUFDakQsK0VBQTJKO0lBRTlJLFFBQUEsVUFBVSxHQUFHLFlBQTJCLENBQUM7SUFDekMsUUFBQSxlQUFlLEdBQUcsZ0JBQStCLENBQUM7SUFDbEQsUUFBQSxXQUFXLEdBQUcsZUFBOEIsQ0FBQztJQUM3QyxRQUFBLGtCQUFrQixHQUFHLGdCQUErQixDQUFDO0lBRWxFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTBCRztJQUNIO1FBQTJDLGlEQUF3QjtRQUVqRSwrQkFBc0IsTUFBZSxFQUFFLE9BQXVCLEVBQUUsR0FBd0I7WUFBeEYsWUFDRSxrQkFBTSxPQUFPLENBQUMsU0FFZjtZQUhxQixZQUFNLEdBQU4sTUFBTSxDQUFTO1lBRW5DLEtBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLElBQUksS0FBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQzs7UUFDL0YsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7V0FZRztRQUNILDBEQUEwQixHQUExQixVQUEyQixXQUEyQjtZQUNwRCxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ1gsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFFRDs7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QUMsV0FBc0M7UUFDdEUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFcEMsSUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLGNBQWMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUUvRSxPQUFPLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNILFNBQVMsc0JBQXNCLENBQUMsVUFBeUI7UUFDdkQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUNuRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWTtZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQzVFLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXBELElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztZQUN2RSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUM7SUFDL0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgQ3RvclBhcmFtZXRlciwgRGVjb3JhdG9yLCBJbXBvcnQsIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uLy4uL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtfSBmcm9tICcuLi9wYWNrYWdlcy9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge2ZpbmRBbGwsIGdldE5hbWVUZXh0LCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtEZWNvcmF0ZWRDbGFzc30gZnJvbSAnLi9kZWNvcmF0ZWRfY2xhc3MnO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb24sIE5nY2NSZWZsZWN0aW9uSG9zdCwgUFJFX1IzX01BUktFUiwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb24sIGlzU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4vbmdjY19ob3N0JztcblxuZXhwb3J0IGNvbnN0IERFQ09SQVRPUlMgPSAnZGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgUFJPUF9ERUNPUkFUT1JTID0gJ3Byb3BEZWNvcmF0b3JzJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBDT05TVFJVQ1RPUiA9ICdfX2NvbnN0cnVjdG9yJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBDT05TVFJVQ1RPUl9QQVJBTVMgPSAnY3RvclBhcmFtZXRlcnMnIGFzIHRzLl9fU3RyaW5nO1xuXG4vKipcbiAqIEVzbTIwMTUgcGFja2FnZXMgY29udGFpbiBFQ01BU2NyaXB0IDIwMTUgY2xhc3NlcywgZXRjLlxuICogRGVjb3JhdG9ycyBhcmUgZGVmaW5lZCB2aWEgc3RhdGljIHByb3BlcnRpZXMgb24gdGhlIGNsYXNzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGNsYXNzIFNvbWVEaXJlY3RpdmUge1xuICogfVxuICogU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzID0gW1xuICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gKiBdO1xuICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzID0ge1xuICogICBcImlucHV0MVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiAgIFwiaW5wdXQyXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqIH07XG4gKiBgYGBcbiAqXG4gKiAqIENsYXNzZXMgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqICogTWVtYmVycyBhcmUgZGVjb3JhdGVkIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcga2V5IG9uIGEgc3RhdGljIHByb3BlcnR5XG4gKiAgIGNhbGxlZCBgcHJvcERlY29yYXRvcnNgLlxuICogKiBDb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGRlY29yYXRvcnMgYXJlIGZvdW5kIG9uIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gKiAgIGEgc3RhdGljIG1ldGhvZCBjYWxsZWQgYGN0b3JQYXJhbWV0ZXJzYC5cbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCBpbXBsZW1lbnRzIE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gIHByb3RlY3RlZCBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+fG51bGw7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBkdHM/OiBCdW5kbGVQcm9ncmFtfG51bGwpIHtcbiAgICBzdXBlcihjaGVja2VyKTtcbiAgICB0aGlzLmR0c0RlY2xhcmF0aW9uTWFwID0gZHRzICYmIHRoaXMuY29tcHV0ZUR0c0RlY2xhcmF0aW9uTWFwKGR0cy5wYXRoLCBkdHMucHJvZ3JhbSkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gKGZvciBleGFtcGxlLCBvZiBhIGNsYXNzIG9yIGZ1bmN0aW9uKSBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGFueVxuICAgKiBkZWNvcmF0b3JzIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG9yIGZ1bmN0aW9uIG92ZXJcbiAgICogd2hpY2ggdG8gcmVmbGVjdC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBpbnRlbnQgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGFuZCB0aGVcbiAgICogc291cmNlIGlzIGluIEVTNiBmb3JtYXQsIHRoaXMgd2lsbCBiZSBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBub2RlLiBJZiB0aGUgc291cmNlIGlzIGluIEVTNVxuICAgKiBmb3JtYXQsIHRoaXMgbWlnaHQgYmUgYSBgdHMuVmFyaWFibGVEZWNsYXJhdGlvbmAgYXMgY2xhc3NlcyBpbiBFUzUgYXJlIHJlcHJlc2VudGVkIGFzIHRoZVxuICAgKiByZXN1bHQgb2YgYW4gSUlGRSBleGVjdXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBEZWNvcmF0b3JgIG1ldGFkYXRhIGlmIGRlY29yYXRvcnMgYXJlIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLCBvclxuICAgKiBgbnVsbGAgaWYgZWl0aGVyIG5vIGRlY29yYXRvcnMgd2VyZSBwcmVzZW50IG9yIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyBub3Qgb2YgYSBkZWNvcmF0YWJsZSB0eXBlLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgaWYgKCFzeW1ib2wpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG9cbiAgICogcmVmbGVjdC4gSWYgdGhlIHNvdXJjZSBpcyBpbiBFUzYgZm9ybWF0LCB0aGlzIHdpbGwgYmUgYSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgbm9kZS4gSWYgdGhlXG4gICAqIHNvdXJjZSBpcyBpbiBFUzUgZm9ybWF0LCB0aGlzIG1pZ2h0IGJlIGEgYHRzLlZhcmlhYmxlRGVjbGFyYXRpb25gIGFzIGNsYXNzZXMgaW4gRVM1IGFyZVxuICAgKiByZXByZXNlbnRlZCBhcyB0aGUgcmVzdWx0IG9mIGFuIElJRkUgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgQ2xhc3NNZW1iZXJgIG1ldGFkYXRhIHJlcHJlc2VudGluZyB0aGUgbWVtYmVycyBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBDbGFzc01lbWJlcltdIHtcbiAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKCFzeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXR0ZW1wdGVkIHRvIGdldCBtZW1iZXJzIG9mIGEgbm9uLWNsYXNzOiBcIiR7Y2xhenouZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuXG4gICAgLy8gVGhlIGRlY29yYXRvcnMgbWFwIGNvbnRhaW5zIGFsbCB0aGUgcHJvcGVydGllcyB0aGF0IGFyZSBkZWNvcmF0ZWRcbiAgICBjb25zdCBkZWNvcmF0b3JzTWFwID0gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzKHN5bWJvbCk7XG5cbiAgICAvLyBUaGUgbWVtYmVyIG1hcCBjb250YWlucyBhbGwgdGhlIG1ldGhvZCAoaW5zdGFuY2UgYW5kIHN0YXRpYyk7IGFuZCBhbnkgaW5zdGFuY2UgcHJvcGVydGllc1xuICAgIC8vIHRoYXQgYXJlIGluaXRpYWxpemVkIGluIHRoZSBjbGFzcy5cbiAgICBpZiAoc3ltYm9sLm1lbWJlcnMpIHtcbiAgICAgIHN5bWJvbC5tZW1iZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IHJlbW92ZUZyb21NYXAoZGVjb3JhdG9yc01hcCwga2V5KTtcbiAgICAgICAgY29uc3QgbWVtYmVyID0gdGhpcy5yZWZsZWN0TWVtYmVyKHZhbHVlLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgaWYgKG1lbWJlcikge1xuICAgICAgICAgIG1lbWJlcnMucHVzaChtZW1iZXIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgc3RhdGljIHByb3BlcnR5IG1hcCBjb250YWlucyBhbGwgdGhlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgaWYgKHN5bWJvbC5leHBvcnRzKSB7XG4gICAgICBzeW1ib2wuZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSByZW1vdmVGcm9tTWFwKGRlY29yYXRvcnNNYXAsIGtleSk7XG4gICAgICAgIGNvbnN0IG1lbWJlciA9IHRoaXMucmVmbGVjdE1lbWJlcih2YWx1ZSwgZGVjb3JhdG9ycywgdHJ1ZSk7XG4gICAgICAgIGlmIChtZW1iZXIpIHtcbiAgICAgICAgICBtZW1iZXJzLnB1c2gobWVtYmVyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBjbGFzcyB3YXMgZGVjbGFyZWQgYXMgYSBWYXJpYWJsZURlY2xhcmF0aW9uIHRoZW4gaXQgbWF5IGhhdmUgc3RhdGljIHByb3BlcnRpZXNcbiAgICAvLyBhdHRhY2hlZCB0byB0aGUgdmFyaWFibGUgcmF0aGVyIHRoYW4gdGhlIGNsYXNzIGl0c2VsZlxuICAgIC8vIEZvciBleGFtcGxlOlxuICAgIC8vIGBgYFxuICAgIC8vIGxldCBNeUNsYXNzID0gY2xhc3MgTXlDbGFzcyB7XG4gICAgLy8gICAvLyBubyBzdGF0aWMgcHJvcGVydGllcyBoZXJlIVxuICAgIC8vIH1cbiAgICAvLyBNeUNsYXNzLnN0YXRpY1Byb3BlcnR5ID0gLi4uO1xuICAgIC8vIGBgYFxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24ucGFyZW50KSkge1xuICAgICAgY29uc3QgdmFyaWFibGVTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihzeW1ib2wudmFsdWVEZWNsYXJhdGlvbi5wYXJlbnQubmFtZSk7XG4gICAgICBpZiAodmFyaWFibGVTeW1ib2wgJiYgdmFyaWFibGVTeW1ib2wuZXhwb3J0cykge1xuICAgICAgICB2YXJpYWJsZVN5bWJvbC5leHBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gcmVtb3ZlRnJvbU1hcChkZWNvcmF0b3JzTWFwLCBrZXkpO1xuICAgICAgICAgIGNvbnN0IG1lbWJlciA9IHRoaXMucmVmbGVjdE1lbWJlcih2YWx1ZSwgZGVjb3JhdG9ycywgdHJ1ZSk7XG4gICAgICAgICAgaWYgKG1lbWJlcikge1xuICAgICAgICAgICAgbWVtYmVycy5wdXNoKG1lbWJlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZWFsIHdpdGggYW55IGRlY29yYXRlZCBwcm9wZXJ0aWVzIHRoYXQgd2VyZSBub3QgaW5pdGlhbGl6ZWQgaW4gdGhlIGNsYXNzXG4gICAgZGVjb3JhdG9yc01hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICBpbXBsZW1lbnRhdGlvbjogbnVsbCxcbiAgICAgICAgZGVjb3JhdG9yczogdmFsdWUsXG4gICAgICAgIGlzU3RhdGljOiBmYWxzZSxcbiAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5LFxuICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICBub2RlOiBudWxsLFxuICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICB2YWx1ZTogbnVsbFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBpdHMgcGFyYW1ldGVycy5cbiAgICpcbiAgICogVGhpcyBtZXRob2Qgb25seSBsb29rcyBhdCB0aGUgY29uc3RydWN0b3Igb2YgYSBjbGFzcyBkaXJlY3RseSBhbmQgbm90IGF0IGFueSBpbmhlcml0ZWRcbiAgICogY29uc3RydWN0b3JzLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG9cbiAgICogcmVmbGVjdC4gSWYgdGhlIHNvdXJjZSBpcyBpbiBFUzYgZm9ybWF0LCB0aGlzIHdpbGwgYmUgYSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgbm9kZS4gSWYgdGhlXG4gICAqIHNvdXJjZSBpcyBpbiBFUzUgZm9ybWF0LCB0aGlzIG1pZ2h0IGJlIGEgYHRzLlZhcmlhYmxlRGVjbGFyYXRpb25gIGFzIGNsYXNzZXMgaW4gRVM1IGFyZVxuICAgKiByZXByZXNlbnRlZCBhcyB0aGUgcmVzdWx0IG9mIGFuIElJRkUgZXhlY3V0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgUGFyYW1ldGVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIHBhcmFtZXRlcnMgb2YgdGhlIGNvbnN0cnVjdG9yLCBpZlxuICAgKiBhIGNvbnN0cnVjdG9yIGV4aXN0cy4gSWYgdGhlIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgaGFzIDAgcGFyYW1ldGVycywgdGhpcyBhcnJheSB3aWxsIGJlIGVtcHR5LlxuICAgKiBJZiB0aGUgY2xhc3MgaGFzIG5vIGNvbnN0cnVjdG9yLCB0aGlzIG1ldGhvZCByZXR1cm5zIGBudWxsYC5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBDdG9yUGFyYW1ldGVyW118bnVsbCB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEF0dGVtcHRlZCB0byBnZXQgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cbiAgICBjb25zdCBwYXJhbWV0ZXJOb2RlcyA9IHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2wpO1xuICAgIGlmIChwYXJhbWV0ZXJOb2Rlcykge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oY2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhIHN5bWJvbCBmb3IgYSBub2RlIHRoYXQgd2UgdGhpbmsgaXMgYSBjbGFzcy5cbiAgICogQHBhcmFtIG5vZGUgdGhlIG5vZGUgd2hvc2Ugc3ltYm9sIHdlIGFyZSBmaW5kaW5nLlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGZvciB0aGUgbm9kZSBvciBgdW5kZWZpbmVkYCBpZiBpdCBpcyBub3QgYSBcImNsYXNzXCIgb3IgaGFzIG5vIHN5bWJvbC5cbiAgICovXG4gIGdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uOiB0cy5Ob2RlKTogdHMuU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbi5uYW1lICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgIH1cbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSAmJiBkZWNsYXJhdGlvbi5pbml0aWFsaXplcikge1xuICAgICAgZGVjbGFyYXRpb24gPSBkZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICB9XG4gICAgaWYgKHRzLmlzQ2xhc3NFeHByZXNzaW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIGRlY2xhcmF0aW9uLm5hbWUgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZGVjbGFyYXRpb24ubmFtZSk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBtb2R1bGUgZm9yIHZhcmlhYmxlIGRlY2xhcmF0aW9ucyBpbiB3aGljaCB0aGUgaW5pdGlhbGl6ZXJcbiAgICogaXMgYW4gaWRlbnRpZmllciBtYXJrZWQgd2l0aCB0aGUgYFBSRV9SM19NQVJLRVJgLlxuICAgKiBAcGFyYW0gbW9kdWxlIHRoZSBtb2R1bGUgaW4gd2hpY2ggdG8gc2VhcmNoIGZvciBzd2l0Y2hhYmxlIGRlY2xhcmF0aW9ucy5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgdmFyaWFibGUgZGVjbGFyYXRpb25zIHRoYXQgbWF0Y2guXG4gICAqL1xuICBnZXRTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKG1vZHVsZTogdHMuTm9kZSk6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10ge1xuICAgIC8vIERvbid0IGJvdGhlciB0byB3YWxrIHRoZSBBU1QgaWYgdGhlIG1hcmtlciBpcyBub3QgZm91bmQgaW4gdGhlIHRleHRcbiAgICByZXR1cm4gbW9kdWxlLmdldFRleHQoKS5pbmRleE9mKFBSRV9SM19NQVJLRVIpID49IDAgP1xuICAgICAgICBmaW5kQWxsKG1vZHVsZSwgaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbikgOlxuICAgICAgICBbXTtcbiAgfVxuXG4gIGdldFZhcmlhYmxlVmFsdWUoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHZhbHVlID0gc3VwZXIuZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbik7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gV2UgaGF2ZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIGluaXRpYWxpemVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIHZhciBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gU28gbG9vayBmb3IgdGhlIHNwZWNpYWwgc2NlbmFyaW8gd2hlcmUgdGhlIHZhcmlhYmxlIGlzIGJlaW5nIGFzc2lnbmVkIGluXG4gICAgLy8gYSBuZWFyYnkgc3RhdGVtZW50IHRvIHRoZSByZXR1cm4gdmFsdWUgb2YgYSBjYWxsIHRvIGBfX2RlY29yYXRlYC5cbiAgICAvLyBUaGVuIGZpbmQgdGhlIDJuZCBhcmd1bWVudCBvZiB0aGF0IGNhbGwsIHRoZSBcInRhcmdldFwiLCB3aGljaCB3aWxsIGJlIHRoZVxuICAgIC8vIGFjdHVhbCBjbGFzcyBpZGVudGlmaWVyLiBGb3IgZXhhbXBsZTpcbiAgICAvL1xuICAgIC8vIGBgYFxuICAgIC8vIEh0dHBDbGllbnRYc3JmTW9kdWxlID0gSHR0cENsaWVudFhzcmZNb2R1bGVfMSA9IHRzbGliXzEuX19kZWNvcmF0ZShbXG4gICAgLy8gICBOZ01vZHVsZSh7XG4gICAgLy8gICAgIHByb3ZpZGVyczogW10sXG4gICAgLy8gICB9KVxuICAgIC8vIF0sIEh0dHBDbGllbnRYc3JmTW9kdWxlKTtcbiAgICAvLyBgYGBcbiAgICAvL1xuICAgIC8vIEFuZCBmaW5hbGx5LCBmaW5kIHRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgaWRlbnRpZmllciBpbiB0aGF0IGFyZ3VtZW50LlxuICAgIC8vIE5vdGUgYWxzbyB0aGF0IHRoZSBhc3NpZ25tZW50IGNhbiBvY2N1ciB3aXRoaW4gYW5vdGhlciBhc3NpZ25tZW50LlxuICAgIC8vXG4gICAgY29uc3QgYmxvY2sgPSBkZWNsYXJhdGlvbi5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICBpZiAoc3ltYm9sICYmICh0cy5pc0Jsb2NrKGJsb2NrKSB8fCB0cy5pc1NvdXJjZUZpbGUoYmxvY2spKSkge1xuICAgICAgY29uc3QgZGVjb3JhdGVDYWxsID0gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShibG9jaywgc3ltYm9sKTtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGRlY29yYXRlQ2FsbCAmJiBkZWNvcmF0ZUNhbGwuYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHRhcmdldCAmJiB0cy5pc0lkZW50aWZpZXIodGFyZ2V0KSkge1xuICAgICAgICBjb25zdCB0YXJnZXRTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbih0YXJnZXQpO1xuICAgICAgICBjb25zdCB0YXJnZXREZWNsYXJhdGlvbiA9IHRhcmdldFN5bWJvbCAmJiB0YXJnZXRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgICAgaWYgKHRhcmdldERlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0YXJnZXREZWNsYXJhdGlvbikgfHxcbiAgICAgICAgICAgICAgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBqdXN0IGEgZnVuY3Rpb24gb3IgY2xhc3MgZGVjbGFyYXRpb25cbiAgICAgICAgICAgIC8vIHNvIHJldHVybiBpdHMgaWRlbnRpZmllciBhcyB0aGUgdmFyaWFibGUgdmFsdWUuXG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0RGVjbGFyYXRpb24ubmFtZSB8fCBudWxsO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgLy8gVGhlIHRhcmdldCBpcyBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uLCBzbyBmaW5kIHRoZSBmYXIgcmlnaHQgZXhwcmVzc2lvbixcbiAgICAgICAgICAgIC8vIGluIHRoZSBjYXNlIG9mIG11bHRpcGxlIGFzc2lnbm1lbnRzIChlLmcuIGB2YXIxID0gdmFyMiA9IHZhbHVlYCkuXG4gICAgICAgICAgICBsZXQgdGFyZ2V0VmFsdWUgPSB0YXJnZXREZWNsYXJhdGlvbi5pbml0aWFsaXplcjtcbiAgICAgICAgICAgIHdoaWxlICh0YXJnZXRWYWx1ZSAmJiBpc0Fzc2lnbm1lbnQodGFyZ2V0VmFsdWUpKSB7XG4gICAgICAgICAgICAgIHRhcmdldFZhbHVlID0gdGFyZ2V0VmFsdWUucmlnaHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFyZ2V0VmFsdWUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRhcmdldFZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgYW4gaWRlbnRpZmllciB3YXMgaW1wb3J0ZWQgZnJvbSBhbm90aGVyIG1vZHVsZSBhbmQgcmV0dXJuIGBJbXBvcnRgIG1ldGFkYXRhXG4gICAqIGRlc2NyaWJpbmcgaXRzIG9yaWdpbi5cbiAgICpcbiAgICogQHBhcmFtIGlkIGEgVHlwZVNjcmlwdCBgdHMuSWRlbnRpZmVyYCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBtZXRhZGF0YSBhYm91dCB0aGUgYEltcG9ydGAgaWYgdGhlIGlkZW50aWZpZXIgd2FzIGltcG9ydGVkIGZyb20gYW5vdGhlciBtb2R1bGUsIG9yXG4gICAqIGBudWxsYCBpZiB0aGUgaWRlbnRpZmllciBkb2Vzbid0IHJlc29sdmUgdG8gYW4gaW1wb3J0IGJ1dCBpbnN0ZWFkIGlzIGxvY2FsbHkgZGVmaW5lZC5cbiAgICovXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICByZXR1cm4gc3VwZXIuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkKSB8fCB0aGlzLmdldEltcG9ydE9mTmFtZXNwYWNlZElkZW50aWZpZXIoaWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRoZSBjbGFzc2VzIHRoYXQgY29udGFpbiBkZWNvcmF0aW9ucyBpbiBhIGdpdmVuIGZpbGUuXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBzb3VyY2UgZmlsZSB0byBzZWFyY2ggZm9yIGRlY29yYXRlZCBjbGFzc2VzLlxuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBkZWNvcmF0ZWQgY2xhc3Nlcy5cbiAgICovXG4gIGZpbmREZWNvcmF0ZWRDbGFzc2VzKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBEZWNvcmF0ZWRDbGFzc1tdIHtcbiAgICBjb25zdCBjbGFzc2VzOiBEZWNvcmF0ZWRDbGFzc1tdID0gW107XG4gICAgc291cmNlRmlsZS5zdGF0ZW1lbnRzLm1hcChzdGF0ZW1lbnQgPT4ge1xuICAgICAgaWYgKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgICBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgICBjb25zdCBkZWNvcmF0ZWRDbGFzcyA9IHRoaXMuZ2V0RGVjb3JhdGVkQ2xhc3NGcm9tU3ltYm9sKHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pKTtcbiAgICAgICAgICBpZiAoZGVjb3JhdGVkQ2xhc3MpIHtcbiAgICAgICAgICAgIGNsYXNzZXMucHVzaChkZWNvcmF0ZWRDbGFzcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0YXRlbWVudCkpIHtcbiAgICAgICAgY29uc3QgZGVjb3JhdGVkQ2xhc3MgPSB0aGlzLmdldERlY29yYXRlZENsYXNzRnJvbVN5bWJvbCh0aGlzLmdldENsYXNzU3ltYm9sKHN0YXRlbWVudCkpO1xuICAgICAgICBpZiAoZGVjb3JhdGVkQ2xhc3MpIHtcbiAgICAgICAgICBjbGFzc2VzLnB1c2goZGVjb3JhdGVkQ2xhc3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGNsYXNzZXM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBudW1iZXIgb2YgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgb2YgYSBnaXZlbiBjbGFzcy5cbiAgICpcbiAgICogQHJldHVybnMgdGhlIG51bWJlciBvZiB0eXBlIHBhcmFtZXRlcnMgb2YgdGhlIGNsYXNzLCBpZiBrbm93biwgb3IgYG51bGxgIGlmIHRoZSBkZWNsYXJhdGlvblxuICAgKiBpcyBub3QgYSBjbGFzcyBvciBoYXMgYW4gdW5rbm93biBudW1iZXIgb2YgdHlwZSBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBudW1iZXJ8bnVsbCB7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb24gPSB0aGlzLmdldER0c0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoZHRzRGVjbGFyYXRpb24gJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c0RlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIGR0c0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzID8gZHRzRGVjbGFyYXRpb24udHlwZVBhcmFtZXRlcnMubGVuZ3RoIDogMDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVGFrZSBhbiBleHBvcnRlZCBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzIChtYXliZSBkb3duLWxldmVsZWQgdG8gYSB2YXJpYWJsZSkgYW5kIGxvb2sgdXAgdGhlXG4gICAqIGRlY2xhcmF0aW9uIG9mIGl0cyB0eXBlIGluIGEgc2VwYXJhdGUgLmQudHMgdHJlZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBpcyBhbGxvd2VkIHRvIHJldHVybiBgbnVsbGAgaWYgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCBkb2VzIG5vdCBoYXZlIGFcbiAgICogc2VwYXJhdGUgLmQudHMgdHJlZS4gV2hlbiBjb21waWxpbmcgVHlwZVNjcmlwdCBjb2RlIHRoaXMgaXMgYWx3YXlzIHRoZSBjYXNlLCBzaW5jZSAuZC50cyBmaWxlc1xuICAgKiBhcmUgcHJvZHVjZWQgb25seSBkdXJpbmcgdGhlIGVtaXQgb2Ygc3VjaCBhIGNvbXBpbGF0aW9uLiBXaGVuIGNvbXBpbGluZyAuanMgY29kZSwgaG93ZXZlcixcbiAgICogdGhlcmUgaXMgZnJlcXVlbnRseSBhIHBhcmFsbGVsIC5kLnRzIHRyZWUgd2hpY2ggdGhpcyBtZXRob2QgZXhwb3Nlcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgcmV0dXJuZWQgZnJvbSB0aGlzIGZ1bmN0aW9uIG1heSBub3QgYmUgZnJvbSB0aGUgc2FtZVxuICAgKiBgdHMuUHJvZ3JhbWAgYXMgdGhlIGlucHV0IGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0RHRzRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKCF0aGlzLmR0c0RlY2xhcmF0aW9uTWFwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKCFpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENhbm5vdCBnZXQgdGhlIGR0cyBmaWxlIGZvciBhIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIG5hbWU6ICR7ZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpbiAke2RlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZHRzRGVjbGFyYXRpb25NYXAuZ2V0KGRlY2xhcmF0aW9uLm5hbWUudGV4dCkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIHNvdXJjZSBmaWxlIGZvciBleHBvcnRlZCBmdW5jdGlvbnMgYW5kIHN0YXRpYyBjbGFzcyBtZXRob2RzIHRoYXQgcmV0dXJuXG4gICAqIE1vZHVsZVdpdGhQcm92aWRlcnMgb2JqZWN0cy5cbiAgICogQHBhcmFtIGYgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgdGhlc2UgZnVuY3Rpb25zXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGZ1bmN0aW9uIGRlY2xhcmF0aW9ucyB0aGF0IGxvb2sgbGlrZSB0aGV5IHJldHVybiBNb2R1bGVXaXRoUHJvdmlkZXJzXG4gICAqIG9iamVjdHMuXG4gICAqL1xuICBnZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGY6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSB7XG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKGYpO1xuICAgIGlmICghZXhwb3J0cykgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGluZm9zOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSA9IFtdO1xuICAgIGV4cG9ydHMuZm9yRWFjaCgoZGVjbGFyYXRpb24sIG5hbWUpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzQ2xhc3MoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgdGhpcy5nZXRNZW1iZXJzT2ZDbGFzcyhkZWNsYXJhdGlvbi5ub2RlKS5mb3JFYWNoKG1lbWJlciA9PiB7XG4gICAgICAgICAgaWYgKG1lbWJlci5pc1N0YXRpYykge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHRoaXMucGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKG1lbWJlci5ub2RlKTtcbiAgICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICAgIGluZm9zLnB1c2goaW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGluZm8gPSB0aGlzLnBhcnNlRm9yTW9kdWxlV2l0aFByb3ZpZGVycyhkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICBpbmZvcy5wdXNoKGluZm8pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGluZm9zO1xuICB9XG5cbiAgLy8vLy8vLy8vLy8vLyBQcm90ZWN0ZWQgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbiAgcHJvdGVjdGVkIGdldERlY29yYXRvcnNPZlN5bWJvbChzeW1ib2w6IHRzLlN5bWJvbCk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoc3ltYm9sLCBERUNPUkFUT1JTKTtcbiAgICBpZiAoZGVjb3JhdG9yc1Byb3BlcnR5KSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDbGFzc0RlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbUhlbHBlckNhbGwoc3ltYm9sKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RGVjb3JhdGVkQ2xhc3NGcm9tU3ltYm9sKHN5bWJvbDogdHMuU3ltYm9sfHVuZGVmaW5lZCk6IERlY29yYXRlZENsYXNzfG51bGwge1xuICAgIGlmIChzeW1ib2wpIHtcbiAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmdldERlY29yYXRvcnNPZlN5bWJvbChzeW1ib2wpO1xuICAgICAgaWYgKGRlY29yYXRvcnMgJiYgZGVjb3JhdG9ycy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEZWNvcmF0ZWRDbGFzcyhzeW1ib2wubmFtZSwgc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24sIGRlY29yYXRvcnMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBXYWxrIHRoZSBBU1QgbG9va2luZyBmb3IgYW4gYXNzaWdubWVudCB0byB0aGUgc3BlY2lmaWVkIHN5bWJvbC5cbiAgICogQHBhcmFtIG5vZGUgVGhlIGN1cnJlbnQgbm9kZSB3ZSBhcmUgc2VhcmNoaW5nLlxuICAgKiBAcmV0dXJucyBhbiBleHByZXNzaW9uIHRoYXQgcmVwcmVzZW50cyB0aGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLCBvciB1bmRlZmluZWQgaWYgbm9uZSBjYW4gYmVcbiAgICogZm91bmQuXG4gICAqL1xuICBwcm90ZWN0ZWQgZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUobm9kZTogdHMuTm9kZXx1bmRlZmluZWQsIHN5bWJvbDogdHMuU3ltYm9sKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghbm9kZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgbm9kZS5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pIHtcbiAgICAgIGNvbnN0IGxlZnQgPSBub2RlLmxlZnQ7XG4gICAgICBjb25zdCByaWdodCA9IG5vZGUucmlnaHQ7XG4gICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGxlZnQpICYmIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGxlZnQpID09PSBzeW1ib2wpIHtcbiAgICAgICAgcmV0dXJuICh0cy5pc0NhbGxFeHByZXNzaW9uKHJpZ2h0KSAmJiBnZXRDYWxsZWVOYW1lKHJpZ2h0KSA9PT0gJ19fZGVjb3JhdGUnKSA/IHJpZ2h0IDogbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKHJpZ2h0LCBzeW1ib2wpO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZS5mb3JFYWNoQ2hpbGQobm9kZSA9PiB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKG5vZGUsIHN5bWJvbCkpIHx8IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJldHJpZXZlIHRoZSBzeW1ib2wgb2YgYSBzdGF0aWMgcHJvcGVydHkgb24gYSBjbGFzcy5cbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcHJvcGVydHkgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEBwYXJhbSBwcm9wZXJ0eU5hbWUgdGhlIG5hbWUgb2Ygc3RhdGljIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgc3ltYm9sIGlmIGl0IGlzIGZvdW5kIG9yIGB1bmRlZmluZWRgIGlmIG5vdC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0aWNQcm9wZXJ0eShzeW1ib2w6IHRzLlN5bWJvbCwgcHJvcGVydHlOYW1lOiB0cy5fX1N0cmluZyk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIHJldHVybiBzeW1ib2wuZXhwb3J0cyAmJiBzeW1ib2wuZXhwb3J0cy5nZXQocHJvcGVydHlOYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGNsYXNzIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBjbGFzcywgd2hlcmUgdGhlIGRlY29yYXRvcnMgYXJlIGRlY2xhcmVkXG4gICAqIHZpYSBhIHN0YXRpYyBwcm9wZXJ0eS4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBjbGFzcyBTb21lRGlyZWN0aXZlIHt9XG4gICAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAgICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc1N5bWJvbCB0aGUgcHJvcGVydHkgY29udGFpbmluZyB0aGUgZGVjb3JhdG9ycyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBvciBudWxsIGlmIG5vbmUgd2hlcmUgZm91bmQuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNTeW1ib2w6IHRzLlN5bWJvbCk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvcnNJZGVudGlmaWVyID0gZGVjb3JhdG9yc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgIGlmIChkZWNvcmF0b3JzSWRlbnRpZmllciAmJiBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQpIHtcbiAgICAgIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24oZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSAmJlxuICAgICAgICAgIGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudC5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4pIHtcbiAgICAgICAgLy8gQVNUIG9mIHRoZSBhcnJheSBvZiBkZWNvcmF0b3IgdmFsdWVzXG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnNBcnJheSA9IGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudC5yaWdodDtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9yc0FycmF5KVxuICAgICAgICAgICAgLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGNsYXNzIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBjbGFzcywgd2hlcmUgdGhlIGRlY29yYXRvcnMgYXJlIGRlY2xhcmVkXG4gICAqIHZpYSB0aGUgYF9fZGVjb3JhdGVgIGhlbHBlciBtZXRob2QuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogbGV0IFNvbWVEaXJlY3RpdmUgPSBjbGFzcyBTb21lRGlyZWN0aXZlIHt9XG4gICAqIFNvbWVEaXJlY3RpdmUgPSBfX2RlY29yYXRlKFtcbiAgICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgZGVjb3JhdG9ycyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBvciBudWxsIGlmIG5vbmUgd2hlcmUgZm91bmQuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbUhlbHBlckNhbGwoc3ltYm9sOiB0cy5TeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSA9IFtdO1xuICAgIGNvbnN0IGhlbHBlckNhbGxzID0gdGhpcy5nZXRIZWxwZXJDYWxsc0ZvckNsYXNzKHN5bWJvbCwgJ19fZGVjb3JhdGUnKTtcbiAgICBoZWxwZXJDYWxscy5mb3JFYWNoKGhlbHBlckNhbGwgPT4ge1xuICAgICAgY29uc3Qge2NsYXNzRGVjb3JhdG9yc30gPVxuICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnNGcm9tSGVscGVyQ2FsbChoZWxwZXJDYWxsLCBtYWtlQ2xhc3NUYXJnZXRGaWx0ZXIoc3ltYm9sLm5hbWUpKTtcbiAgICAgIGNsYXNzRGVjb3JhdG9ycy5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKVxuICAgICAgICAgIC5mb3JFYWNoKGRlY29yYXRvciA9PiBkZWNvcmF0b3JzLnB1c2goZGVjb3JhdG9yKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlY29yYXRvcnMubGVuZ3RoID8gZGVjb3JhdG9ycyA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCB0aGUgbWVtYmVyIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBtZW1iZXIgZGVjb3JhdG9ycyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYSBtYXAgd2hvc2Uga2V5cyBhcmUgdGhlIG5hbWUgb2YgdGhlIG1lbWJlcnMgYW5kIHdob3NlIHZhbHVlcyBhcmUgY29sbGVjdGlvbnMgb2ZcbiAgICogZGVjb3JhdG9ycyBmb3IgdGhlIGdpdmVuIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNZW1iZXJEZWNvcmF0b3JzKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4ge1xuICAgIGNvbnN0IGRlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIFBST1BfREVDT1JBVE9SUyk7XG4gICAgaWYgKGRlY29yYXRvcnNQcm9wZXJ0eSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0TWVtYmVyRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWVtYmVyIGRlY29yYXRvcnMgbWF5IGJlIGRlY2xhcmVkIGFzIHN0YXRpYyBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzczpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gICAqICAgXCJuZ0Zvck9mXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVHJhY2tCeVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRlbXBsYXRlXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogfTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzUHJvcGVydHkgdGhlIGNsYXNzIHdob3NlIG1lbWJlciBkZWNvcmF0b3JzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhIG1hcCB3aG9zZSBrZXlzIGFyZSB0aGUgbmFtZSBvZiB0aGUgbWVtYmVycyBhbmQgd2hvc2UgdmFsdWVzIGFyZSBjb2xsZWN0aW9ucyBvZlxuICAgKiBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlckRlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOlxuICAgICAgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+IHtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuICAgIC8vIFN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBmb3IgYFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnNgLlxuICAgIGNvbnN0IHByb3BEZWNvcmF0b3JzTWFwID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2woZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBpZiAocHJvcERlY29yYXRvcnNNYXAgJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wRGVjb3JhdG9yc01hcCkpIHtcbiAgICAgIGNvbnN0IHByb3BlcnRpZXNNYXAgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChwcm9wRGVjb3JhdG9yc01hcCk7XG4gICAgICBwcm9wZXJ0aWVzTWFwLmZvckVhY2goKHZhbHVlLCBuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyh2YWx1ZSkuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlckRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogTWVtYmVyIGRlY29yYXRvcnMgbWF5IGJlIGRlY2xhcmVkIHZpYSBoZWxwZXIgY2FsbCBzdGF0ZW1lbnRzLlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgICBJbnB1dCgpLFxuICAgKiAgICAgX19tZXRhZGF0YShcImRlc2lnbjp0eXBlXCIsIFN0cmluZylcbiAgICogXSwgU29tZURpcmVjdGl2ZS5wcm90b3R5cGUsIFwiaW5wdXQxXCIsIHZvaWQgMCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIG1lbWJlciBkZWNvcmF0b3JzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhIG1hcCB3aG9zZSBrZXlzIGFyZSB0aGUgbmFtZSBvZiB0aGUgbWVtYmVycyBhbmQgd2hvc2UgdmFsdWVzIGFyZSBjb2xsZWN0aW9ucyBvZlxuICAgKiBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlckRlY29yYXRvcnNGcm9tSGVscGVyQ2FsbHMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCk6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPiB7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9yTWFwID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuICAgIGNvbnN0IGhlbHBlckNhbGxzID0gdGhpcy5nZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sLCAnX19kZWNvcmF0ZScpO1xuICAgIGhlbHBlckNhbGxzLmZvckVhY2goaGVscGVyQ2FsbCA9PiB7XG4gICAgICBjb25zdCB7bWVtYmVyRGVjb3JhdG9yc30gPSB0aGlzLnJlZmxlY3REZWNvcmF0b3JzRnJvbUhlbHBlckNhbGwoXG4gICAgICAgICAgaGVscGVyQ2FsbCwgbWFrZU1lbWJlclRhcmdldEZpbHRlcihjbGFzc1N5bWJvbC5uYW1lKSk7XG4gICAgICBtZW1iZXJEZWNvcmF0b3JzLmZvckVhY2goKGRlY29yYXRvcnMsIG1lbWJlck5hbWUpID0+IHtcbiAgICAgICAgaWYgKG1lbWJlck5hbWUpIHtcbiAgICAgICAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbWVtYmVyRGVjb3JhdG9yTWFwLmdldChtZW1iZXJOYW1lKSB8fCBbXTtcbiAgICAgICAgICBjb25zdCBjb3JlRGVjb3JhdG9ycyA9IGRlY29yYXRvcnMuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgICAgbWVtYmVyRGVjb3JhdG9yTWFwLnNldChtZW1iZXJOYW1lLCBtZW1iZXJEZWNvcmF0b3JzLmNvbmNhdChjb3JlRGVjb3JhdG9ycykpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gbWVtYmVyRGVjb3JhdG9yTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3QgZGVjb3JhdG9yIGluZm8gZnJvbSBgX19kZWNvcmF0ZWAgaGVscGVyIGZ1bmN0aW9uIGNhbGxzLlxuICAgKiBAcGFyYW0gaGVscGVyQ2FsbCB0aGUgY2FsbCB0byBhIGhlbHBlciB0aGF0IG1heSBjb250YWluIGRlY29yYXRvciBjYWxsc1xuICAgKiBAcGFyYW0gdGFyZ2V0RmlsdGVyIGEgZnVuY3Rpb24gdG8gZmlsdGVyIG91dCB0YXJnZXRzIHRoYXQgd2UgYXJlIG5vdCBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhIG1hcHBpbmcgZnJvbSBtZW1iZXIgbmFtZSB0byBkZWNvcmF0b3JzLCB3aGVyZSB0aGUga2V5IGlzIGVpdGhlciB0aGUgbmFtZSBvZiB0aGVcbiAgICogbWVtYmVyIG9yIGB1bmRlZmluZWRgIGlmIGl0IHJlZmVycyB0byBkZWNvcmF0b3JzIG9uIHRoZSBjbGFzcyBhcyBhIHdob2xlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JzRnJvbUhlbHBlckNhbGwoXG4gICAgICBoZWxwZXJDYWxsOiB0cy5DYWxsRXhwcmVzc2lvbiwgdGFyZ2V0RmlsdGVyOiBUYXJnZXRGaWx0ZXIpOlxuICAgICAge2NsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW10sIG1lbWJlckRlY29yYXRvcnM6IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPn0ge1xuICAgIGNvbnN0IGNsYXNzRGVjb3JhdG9yczogRGVjb3JhdG9yW10gPSBbXTtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuXG4gICAgLy8gRmlyc3QgY2hlY2sgdGhhdCB0aGUgYHRhcmdldGAgYXJndW1lbnQgaXMgY29ycmVjdFxuICAgIGlmICh0YXJnZXRGaWx0ZXIoaGVscGVyQ2FsbC5hcmd1bWVudHNbMV0pKSB7XG4gICAgICAvLyBHcmFiIHRoZSBgZGVjb3JhdG9yc2AgYXJndW1lbnQgd2hpY2ggc2hvdWxkIGJlIGFuIGFycmF5IG9mIGNhbGxzXG4gICAgICBjb25zdCBkZWNvcmF0b3JDYWxscyA9IGhlbHBlckNhbGwuYXJndW1lbnRzWzBdO1xuICAgICAgaWYgKGRlY29yYXRvckNhbGxzICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZWNvcmF0b3JDYWxscykpIHtcbiAgICAgICAgZGVjb3JhdG9yQ2FsbHMuZWxlbWVudHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAvLyBXZSBvbmx5IGNhcmUgYWJvdXQgdGhvc2UgZWxlbWVudHMgdGhhdCBhcmUgYWN0dWFsIGNhbGxzXG4gICAgICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oZWxlbWVudCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHRoaXMucmVmbGVjdERlY29yYXRvckNhbGwoZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoZGVjb3JhdG9yKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGtleUFyZyA9IGhlbHBlckNhbGwuYXJndW1lbnRzWzJdO1xuICAgICAgICAgICAgICBjb25zdCBrZXlOYW1lID0ga2V5QXJnICYmIHRzLmlzU3RyaW5nTGl0ZXJhbChrZXlBcmcpID8ga2V5QXJnLnRleHQgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIGlmIChrZXlOYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjbGFzc0RlY29yYXRvcnMucHVzaChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBtZW1iZXJEZWNvcmF0b3JzLmdldChrZXlOYW1lKSB8fCBbXTtcbiAgICAgICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goZGVjb3JhdG9yKTtcbiAgICAgICAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLnNldChrZXlOYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7Y2xhc3NEZWNvcmF0b3JzLCBtZW1iZXJEZWNvcmF0b3JzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IHRoZSBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSBhIGNhbGwgdG8gYSBkZWNvcmF0b3IgYXMgYSBmdW5jdGlvbi5cbiAgICogVGhpcyBoYXBwZW5zIHdoZW4gdGhlIGRlY29yYXRvcnMgaGFzIGJlZW4gdXNlZCBpbiBhIGBfX2RlY29yYXRlYCBoZWxwZXIgY2FsbC5cbiAgICogRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBfX2RlY29yYXRlKFtcbiAgICogICBEaXJlY3RpdmUoeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSksXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUpO1xuICAgKiBgYGBcbiAgICpcbiAgICogSGVyZSB0aGUgYERpcmVjdGl2ZWAgZGVjb3JhdG9yIGlzIGRlY29yYXRpbmcgYFNvbWVEaXJlY3RpdmVgIGFuZCB0aGUgb3B0aW9ucyBmb3JcbiAgICogdGhlIGRlY29yYXRvciBhcmUgcGFzc2VkIGFzIGFyZ3VtZW50cyB0byB0aGUgYERpcmVjdGl2ZSgpYCBjYWxsLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbCB0aGUgY2FsbCB0byB0aGUgZGVjb3JhdG9yLlxuICAgKiBAcmV0dXJucyBhIGRlY29yYXRvciBjb250YWluaW5nIHRoZSByZWZsZWN0ZWQgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIGNhbGxcbiAgICogaXMgbm90IGEgdmFsaWQgZGVjb3JhdG9yIGNhbGwuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRvckNhbGwoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pOiBEZWNvcmF0b3J8bnVsbCB7XG4gICAgLy8gVGhlIGNhbGwgY291bGQgYmUgb2YgdGhlIGZvcm0gYERlY29yYXRvciguLi4pYCBvciBgbmFtZXNwYWNlXzEuRGVjb3JhdG9yKC4uLilgXG4gICAgY29uc3QgZGVjb3JhdG9yRXhwcmVzc2lvbiA9XG4gICAgICAgIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbikgPyBjYWxsLmV4cHJlc3Npb24ubmFtZSA6IGNhbGwuZXhwcmVzc2lvbjtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKGRlY29yYXRvckV4cHJlc3Npb24pKSB7XG4gICAgICAvLyBXZSBmb3VuZCBhIGRlY29yYXRvciFcbiAgICAgIGNvbnN0IGRlY29yYXRvcklkZW50aWZpZXIgPSBkZWNvcmF0b3JFeHByZXNzaW9uO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogZGVjb3JhdG9ySWRlbnRpZmllci50ZXh0LFxuICAgICAgICBpZGVudGlmaWVyOiBkZWNvcmF0b3JJZGVudGlmaWVyLFxuICAgICAgICBpbXBvcnQ6IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGRlY29yYXRvcklkZW50aWZpZXIpLFxuICAgICAgICBub2RlOiBjYWxsLFxuICAgICAgICBhcmdzOiBBcnJheS5mcm9tKGNhbGwuYXJndW1lbnRzKVxuICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgdGhlIGdpdmVuIHN0YXRlbWVudCB0byBzZWUgaWYgaXQgaXMgYSBjYWxsIHRvIHRoZSBzcGVjaWZpZWQgaGVscGVyIGZ1bmN0aW9uIG9yIG51bGwgaWZcbiAgICogbm90IGZvdW5kLlxuICAgKlxuICAgKiBNYXRjaGluZyBzdGF0ZW1lbnRzIHdpbGwgbG9vayBsaWtlOiAgYHRzbGliXzEuX19kZWNvcmF0ZSguLi4pO2AuXG4gICAqIEBwYXJhbSBzdGF0ZW1lbnQgdGhlIHN0YXRlbWVudCB0aGF0IG1heSBjb250YWluIHRoZSBjYWxsLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZSB0aGUgbmFtZSBvZiB0aGUgaGVscGVyIHdlIGFyZSBsb29raW5nIGZvci5cbiAgICogQHJldHVybnMgdGhlIG5vZGUgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgYF9fZGVjb3JhdGUoLi4uKWAgY2FsbCBvciBudWxsIGlmIHRoZSBzdGF0ZW1lbnQgZG9lc1xuICAgKiBub3QgbWF0Y2guXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SGVscGVyQ2FsbChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCwgaGVscGVyTmFtZTogc3RyaW5nKTogdHMuQ2FsbEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICBsZXQgZXhwcmVzc2lvbiA9IHN0YXRlbWVudC5leHByZXNzaW9uO1xuICAgICAgd2hpbGUgKGlzQXNzaWdubWVudChleHByZXNzaW9uKSkge1xuICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5yaWdodDtcbiAgICAgIH1cbiAgICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmIGdldENhbGxlZU5hbWUoZXhwcmVzc2lvbikgPT09IGhlbHBlck5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGV4cHJlc3Npb247XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgdGhlIGdpdmVuIGFycmF5IG5vZGUgYW5kIGV4dHJhY3QgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gZWFjaCBlbGVtZW50LlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgZm9yIGRlY29yYXRvcnMgdGhhdCBhcmUgZGVmaW5lZCBpbiBzdGF0aWMgcHJvcGVydGllcy4gRm9yIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNBcnJheSBhbiBleHByZXNzaW9uIHRoYXQgY29udGFpbnMgZGVjb3JhdG9yIGluZm9ybWF0aW9uLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBkZWNvcmF0b3IgaW5mbyB0aGF0IHdhcyByZWZsZWN0ZWQgZnJvbSB0aGUgYXJyYXkgbm9kZS5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXk6IHRzLkV4cHJlc3Npb24pOiBEZWNvcmF0b3JbXSB7XG4gICAgY29uc3QgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gPSBbXTtcblxuICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVjb3JhdG9yc0FycmF5KSkge1xuICAgICAgLy8gQWRkIGVhY2ggZGVjb3JhdG9yIHRoYXQgaXMgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWAgaW50byB0aGUgYGRlY29yYXRvcnNgIGFycmF5XG4gICAgICBkZWNvcmF0b3JzQXJyYXkuZWxlbWVudHMuZm9yRWFjaChub2RlID0+IHtcblxuICAgICAgICAvLyBJZiB0aGUgZGVjb3JhdG9yIGlzIG5vdCBhbiBvYmplY3QgbGl0ZXJhbCBleHByZXNzaW9uIHRoZW4gd2UgYXJlIG5vdCBpbnRlcmVzdGVkXG4gICAgICAgIGlmICh0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBjb25zdCB0eXBlSWRlbnRpZmllciA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKTtcbiAgICAgICAgICBpZiAodHlwZUlkZW50aWZpZXIgJiYgdHMuaXNJZGVudGlmaWVyKHR5cGVJZGVudGlmaWVyKSkge1xuICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKHtcbiAgICAgICAgICAgICAgbmFtZTogdHlwZUlkZW50aWZpZXIudGV4dCxcbiAgICAgICAgICAgICAgaWRlbnRpZmllcjogdHlwZUlkZW50aWZpZXIsXG4gICAgICAgICAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZUlkZW50aWZpZXIpLCBub2RlLFxuICAgICAgICAgICAgICBhcmdzOiBnZXREZWNvcmF0b3JBcmdzKG5vZGUpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIGEgc3ltYm9sIGFuZCBleHRyYWN0IHRoZSBtZW1iZXIgaW5mb3JtYXRpb24sIGNvbWJpbmluZyBpdCB3aXRoIHRoZVxuICAgKiBwcm92aWRlZCBkZWNvcmF0b3IgaW5mb3JtYXRpb24sIGFuZCB3aGV0aGVyIGl0IGlzIGEgc3RhdGljIG1lbWJlci5cbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgc3ltYm9sIGZvciB0aGUgbWVtYmVyIHRvIHJlZmxlY3Qgb3Zlci5cbiAgICogQHBhcmFtIGRlY29yYXRvcnMgYW4gYXJyYXkgb2YgZGVjb3JhdG9ycyBhc3NvY2lhdGVkIHdpdGggdGhlIG1lbWJlci5cbiAgICogQHBhcmFtIGlzU3RhdGljIHRydWUgaWYgdGhpcyBtZW1iZXIgaXMgc3RhdGljLCBmYWxzZSBpZiBpdCBpcyBhbiBpbnN0YW5jZSBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHJlZmxlY3RlZCBtZW1iZXIgaW5mb3JtYXRpb24sIG9yIG51bGwgaWYgdGhlIHN5bWJvbCBpcyBub3QgYSBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdE1lbWJlcihzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJ8bnVsbCB7XG4gICAgbGV0IGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsID0gbnVsbDtcbiAgICBsZXQgdmFsdWU6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWU6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZU5vZGU6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG5cblxuICAgIGNvbnN0IG5vZGUgPSBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiB8fCBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCFub2RlIHx8ICFpc0NsYXNzTWVtYmVyVHlwZShub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLk1ldGhvZCkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5NZXRob2Q7XG4gICAgfSBlbHNlIGlmIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5Qcm9wZXJ0eSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkdldEFjY2Vzc29yKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkdldHRlcjtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLlNldEFjY2Vzc29yKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlNldHRlcjtcbiAgICB9XG5cbiAgICBpZiAoaXNTdGF0aWMgJiYgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5Qcm9wZXJ0eSA/IG5vZGUucGFyZW50LnJpZ2h0IDogbnVsbDtcbiAgICB9IGVsc2UgaWYgKGlzVGhpc0Fzc2lnbm1lbnQobm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG4gICAgICBuYW1lID0gbm9kZS5sZWZ0Lm5hbWUudGV4dDtcbiAgICAgIHZhbHVlID0gbm9kZS5yaWdodDtcbiAgICAgIGlzU3RhdGljID0gZmFsc2U7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuQ29uc3RydWN0b3I7XG4gICAgICBuYW1lID0gJ2NvbnN0cnVjdG9yJztcbiAgICAgIGlzU3RhdGljID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGtpbmQgPT09IG51bGwpIHtcbiAgICAgIGNvbnNvbGUud2FybihgVW5rbm93biBtZW1iZXIgdHlwZTogXCIke25vZGUuZ2V0VGV4dCgpfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBpZiAoaXNOYW1lZERlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICAgICAgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB3ZSBoYXZlIHN0aWxsIG5vdCBkZXRlcm1pbmVkIGlmIHRoaXMgaXMgYSBzdGF0aWMgb3IgaW5zdGFuY2UgbWVtYmVyIHRoZW5cbiAgICAvLyBsb29rIGZvciB0aGUgYHN0YXRpY2Aga2V5d29yZCBvbiB0aGUgZGVjbGFyYXRpb25cbiAgICBpZiAoaXNTdGF0aWMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaXNTdGF0aWMgPSBub2RlLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgbm9kZS5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RhdGljS2V5d29yZCk7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZTogdHMuVHlwZU5vZGUgPSAobm9kZSBhcyBhbnkpLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgbm9kZSxcbiAgICAgIGltcGxlbWVudGF0aW9uOiBub2RlLCBraW5kLCB0eXBlLCBuYW1lLCBuYW1lTm9kZSwgdmFsdWUsIGlzU3RhdGljLFxuICAgICAgZGVjb3JhdG9yczogZGVjb3JhdG9ycyB8fCBbXVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlcnMgd2Ugd2FudCB0byBmaW5kLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25gIG9iamVjdHMgcmVwcmVzZW50aW5nIGVhY2ggb2YgdGhlIHBhcmFtZXRlcnMgaW5cbiAgICogdGhlIGNsYXNzJ3MgY29uc3RydWN0b3Igb3IgbnVsbCBpZiB0aGVyZSBpcyBubyBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKTpcbiAgICAgIHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW118bnVsbCB7XG4gICAgY29uc3QgY29uc3RydWN0b3JTeW1ib2wgPSBjbGFzc1N5bWJvbC5tZW1iZXJzICYmIGNsYXNzU3ltYm9sLm1lbWJlcnMuZ2V0KENPTlNUUlVDVE9SKTtcbiAgICBpZiAoY29uc3RydWN0b3JTeW1ib2wpIHtcbiAgICAgIC8vIEZvciBzb21lIHJlYXNvbiB0aGUgY29uc3RydWN0b3IgZG9lcyBub3QgaGF2ZSBhIGB2YWx1ZURlY2xhcmF0aW9uYCA/IT9cbiAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zICYmXG4gICAgICAgICAgY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zWzBdIGFzIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24gfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoIWNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cbiAgICAgIGlmIChjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgICB9XG4gICAgICBpZiAoaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcGFyYW0gcGFyYW1ldGVyTm9kZXMgdGhlIGFycmF5IG9mIFR5cGVTY3JpcHQgcGFyYW1ldGVyIG5vZGVzIGZvciB0aGlzIGNsYXNzJ3MgY29uc3RydWN0b3IuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBpbmZvIG9iamVjdHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oXG4gICAgICBjbGFzc1N5bWJvbDogdHMuU3ltYm9sLCBwYXJhbWV0ZXJOb2RlczogdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXSk6IEN0b3JQYXJhbWV0ZXJbXSB7XG4gICAgY29uc3QgcGFyYW1zUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBDT05TVFJVQ1RPUl9QQVJBTVMpO1xuICAgIGNvbnN0IHBhcmFtSW5mbzogUGFyYW1JbmZvW118bnVsbCA9IHBhcmFtc1Byb3BlcnR5ID9cbiAgICAgICAgdGhpcy5nZXRQYXJhbUluZm9Gcm9tU3RhdGljUHJvcGVydHkocGFyYW1zUHJvcGVydHkpIDpcbiAgICAgICAgdGhpcy5nZXRQYXJhbUluZm9Gcm9tSGVscGVyQ2FsbChjbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXMpO1xuXG4gICAgcmV0dXJuIHBhcmFtZXRlck5vZGVzLm1hcCgobm9kZSwgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IHtkZWNvcmF0b3JzLCB0eXBlRXhwcmVzc2lvbn0gPSBwYXJhbUluZm8gJiYgcGFyYW1JbmZvW2luZGV4XSA/XG4gICAgICAgICAgcGFyYW1JbmZvW2luZGV4XSA6XG4gICAgICAgICAge2RlY29yYXRvcnM6IG51bGwsIHR5cGVFeHByZXNzaW9uOiBudWxsfTtcbiAgICAgIGNvbnN0IG5hbWVOb2RlID0gbm9kZS5uYW1lO1xuICAgICAgcmV0dXJuIHtuYW1lOiBnZXROYW1lVGV4dChuYW1lTm9kZSksIG5hbWVOb2RlLCB0eXBlRXhwcmVzc2lvbiwgdHlwZU5vZGU6IG51bGwsIGRlY29yYXRvcnN9O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyYW1ldGVyIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzLFxuICAgKiB3aGVyZSB0aGUgaW5mb3JtYXRpb24gaXMgc3RvcmVkIG9uIGEgc3RhdGljIG1ldGhvZCBvZiB0aGUgY2xhc3MuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpbiBFU00yMDE1LCB0aGUgbWV0aG9kIGlzIGRlZmluZWQgYnkgYW4gYXJyb3cgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGFuIGFycmF5IG9mXG4gICAqIGRlY29yYXRvciBhbmQgdHlwZSBpbmZvcm1hdGlvbi5cbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gICAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICAgKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gICAqICAgeyB0eXBlOiB1bmRlZmluZWQsIGRlY29yYXRvcnM6IFt7IHR5cGU6IEluamVjdCwgYXJnczogW0lOSkVDVEVEX1RPS0VOLF0gfSxdIH0sXG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgdGhlIHByb3BlcnR5IHRoYXQgaG9sZHMgdGhlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbURlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTogUGFyYW1JbmZvW118bnVsbCB7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIGlmIChwYXJhbURlY29yYXRvcnMgJiYgdHMuaXNBcnJvd0Z1bmN0aW9uKHBhcmFtRGVjb3JhdG9ycykpIHtcbiAgICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24ocGFyYW1EZWNvcmF0b3JzLmJvZHkpKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gcGFyYW1EZWNvcmF0b3JzLmJvZHkuZWxlbWVudHM7XG4gICAgICAgIHJldHVybiBlbGVtZW50c1xuICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0+XG4gICAgICAgICAgICAgICAgICAgIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZWxlbWVudCkgPyByZWZsZWN0T2JqZWN0TGl0ZXJhbChlbGVtZW50KSA6IG51bGwpXG4gICAgICAgICAgICAubWFwKHBhcmFtSW5mbyA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHR5cGVFeHByZXNzaW9uID0gcGFyYW1JbmZvICYmIHBhcmFtSW5mby5nZXQoJ3R5cGUnKSB8fCBudWxsO1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JJbmZvID0gcGFyYW1JbmZvICYmIHBhcmFtSW5mby5nZXQoJ2RlY29yYXRvcnMnKSB8fCBudWxsO1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9ySW5mbyAmJlxuICAgICAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyhkZWNvcmF0b3JJbmZvKVxuICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHt0eXBlRXhwcmVzc2lvbiwgZGVjb3JhdG9yc307XG4gICAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgYSBjbGFzcyB3aGVyZSB0aGUgaW5mb3JtYXRpb24gaXMgc3RvcmVkIHZpYVxuICAgKiBjYWxscyB0byBgX19kZWNvcmF0ZWAgaGVscGVycy5cbiAgICpcbiAgICogUmVmbGVjdCBvdmVyIHRoZSBoZWxwZXJzIHRvIGZpbmQgdGhlIGRlY29yYXRvcnMgYW5kIHR5cGVzIGFib3V0IGVhY2ggb2ZcbiAgICogdGhlIGNsYXNzJ3MgY29uc3RydWN0b3IgcGFyYW1ldGVycy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwYXJhbWV0ZXIgaW5mbyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIHBhcmFtZXRlck5vZGVzIHRoZSBhcnJheSBvZiBUeXBlU2NyaXB0IHBhcmFtZXRlciBub2RlcyBmb3IgdGhpcyBjbGFzcydzIGNvbnN0cnVjdG9yLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgdGhlIHR5cGUgYW5kIGRlY29yYXRvcnMgZm9yIGVhY2ggcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFBhcmFtSW5mb0Zyb21IZWxwZXJDYWxsKFxuICAgICAgY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCwgcGFyYW1ldGVyTm9kZXM6IHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW10pOiBQYXJhbUluZm9bXSB7XG4gICAgY29uc3QgcGFyYW1ldGVyczogUGFyYW1JbmZvW10gPVxuICAgICAgICBwYXJhbWV0ZXJOb2Rlcy5tYXAoKCkgPT4gKHt0eXBlRXhwcmVzc2lvbjogbnVsbCwgZGVjb3JhdG9yczogbnVsbH0pKTtcbiAgICBjb25zdCBoZWxwZXJDYWxscyA9IHRoaXMuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbCwgJ19fZGVjb3JhdGUnKTtcbiAgICBoZWxwZXJDYWxscy5mb3JFYWNoKGhlbHBlckNhbGwgPT4ge1xuICAgICAgY29uc3Qge2NsYXNzRGVjb3JhdG9yc30gPVxuICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnNGcm9tSGVscGVyQ2FsbChoZWxwZXJDYWxsLCBtYWtlQ2xhc3NUYXJnZXRGaWx0ZXIoY2xhc3NTeW1ib2wubmFtZSkpO1xuICAgICAgY2xhc3NEZWNvcmF0b3JzLmZvckVhY2goY2FsbCA9PiB7XG4gICAgICAgIHN3aXRjaCAoY2FsbC5uYW1lKSB7XG4gICAgICAgICAgY2FzZSAnX19tZXRhZGF0YSc6XG4gICAgICAgICAgICBjb25zdCBtZXRhZGF0YUFyZyA9IGNhbGwuYXJncyAmJiBjYWxsLmFyZ3NbMF07XG4gICAgICAgICAgICBjb25zdCB0eXBlc0FyZyA9IGNhbGwuYXJncyAmJiBjYWxsLmFyZ3NbMV07XG4gICAgICAgICAgICBjb25zdCBpc1BhcmFtVHlwZURlY29yYXRvciA9IG1ldGFkYXRhQXJnICYmIHRzLmlzU3RyaW5nTGl0ZXJhbChtZXRhZGF0YUFyZykgJiZcbiAgICAgICAgICAgICAgICBtZXRhZGF0YUFyZy50ZXh0ID09PSAnZGVzaWduOnBhcmFtdHlwZXMnO1xuICAgICAgICAgICAgY29uc3QgdHlwZXMgPSB0eXBlc0FyZyAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24odHlwZXNBcmcpICYmIHR5cGVzQXJnLmVsZW1lbnRzO1xuICAgICAgICAgICAgaWYgKGlzUGFyYW1UeXBlRGVjb3JhdG9yICYmIHR5cGVzKSB7XG4gICAgICAgICAgICAgIHR5cGVzLmZvckVhY2goKHR5cGUsIGluZGV4KSA9PiBwYXJhbWV0ZXJzW2luZGV4XS50eXBlRXhwcmVzc2lvbiA9IHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnX19wYXJhbSc6XG4gICAgICAgICAgICBjb25zdCBwYXJhbUluZGV4QXJnID0gY2FsbC5hcmdzICYmIGNhbGwuYXJnc1swXTtcbiAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvckNhbGxBcmcgPSBjYWxsLmFyZ3MgJiYgY2FsbC5hcmdzWzFdO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1JbmRleCA9IHBhcmFtSW5kZXhBcmcgJiYgdHMuaXNOdW1lcmljTGl0ZXJhbChwYXJhbUluZGV4QXJnKSA/XG4gICAgICAgICAgICAgICAgcGFyc2VJbnQocGFyYW1JbmRleEFyZy50ZXh0LCAxMCkgOlxuICAgICAgICAgICAgICAgIE5hTjtcbiAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IGRlY29yYXRvckNhbGxBcmcgJiYgdHMuaXNDYWxsRXhwcmVzc2lvbihkZWNvcmF0b3JDYWxsQXJnKSA/XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChkZWNvcmF0b3JDYWxsQXJnKSA6XG4gICAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgICAgIGlmICghaXNOYU4ocGFyYW1JbmRleCkgJiYgZGVjb3JhdG9yKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBwYXJhbWV0ZXJzW3BhcmFtSW5kZXhdLmRlY29yYXRvcnMgPVxuICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyc1twYXJhbUluZGV4XS5kZWNvcmF0b3JzIHx8IFtdO1xuICAgICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goZGVjb3JhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcGFyYW1ldGVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggc3RhdGVtZW50cyByZWxhdGVkIHRvIHRoZSBnaXZlbiBjbGFzcyBmb3IgY2FsbHMgdG8gdGhlIHNwZWNpZmllZCBoZWxwZXIuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gaGVscGVyTmFtZSB0aGUgbmFtZSBvZiB0aGUgaGVscGVyIChlLmcuIGBfX2RlY29yYXRlYCkgd2hvc2UgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIENhbGxFeHByZXNzaW9uIG5vZGVzIGZvciBlYWNoIG1hdGNoaW5nIGhlbHBlciBjYWxsLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCwgaGVscGVyTmFtZTogc3RyaW5nKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9uW10ge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbClcbiAgICAgICAgLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5nZXRIZWxwZXJDYWxsKHN0YXRlbWVudCwgaGVscGVyTmFtZSkpXG4gICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNMjAxNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGluIHRoZSB0b3AgbGV2ZWwgbW9kdWxlLCBzbyB3ZSBoYXZlIHRvIGNvbnNpZGVyXG4gICAqIGFsbCB0aGUgc3RhdGVtZW50cyBpbiB0aGUgbW9kdWxlLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCk6IHRzLlN0YXRlbWVudFtdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShjbGFzc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5zdGF0ZW1lbnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gZ2V0IHRoZSBpbXBvcnQgaW5mbyBmb3IgdGhpcyBpZGVudGlmaWVyIGFzIHRob3VnaCBpdCBpcyBhIG5hbWVzcGFjZWQgaW1wb3J0LlxuICAgKiBGb3IgZXhhbXBsZSwgaWYgdGhlIGlkZW50aWZpZXIgaXMgdGhlIGBfX21ldGFkYXRhYCBwYXJ0IG9mIGEgcHJvcGVydHkgYWNjZXNzIGNoYWluIGxpa2U6XG4gICAqXG4gICAqIGBgYFxuICAgKiB0c2xpYl8xLl9fbWV0YWRhdGFcbiAgICogYGBgXG4gICAqXG4gICAqIHRoZW4gaXQgbWlnaHQgYmUgdGhhdCBgdHNsaWJfMWAgaXMgYSBuYW1lc3BhY2UgaW1wb3J0IHN1Y2ggYXM6XG4gICAqXG4gICAqIGBgYFxuICAgKiBpbXBvcnQgKiBhcyB0c2xpYl8xIGZyb20gJ3RzbGliJztcbiAgICogYGBgXG4gICAqIEBwYXJhbSBpZCB0aGUgVHlwZVNjcmlwdCBpZGVudGlmaWVyIHRvIGZpbmQgdGhlIGltcG9ydCBpbmZvIGZvci5cbiAgICogQHJldHVybnMgVGhlIGltcG9ydCBpbmZvIGlmIHRoaXMgaXMgYSBuYW1lc3BhY2VkIGltcG9ydCBvciBgbnVsbGAuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SW1wb3J0T2ZOYW1lc3BhY2VkSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBpZiAoISh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihpZC5wYXJlbnQpICYmIGlkLnBhcmVudC5uYW1lID09PSBpZCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWVzcGFjZUlkZW50aWZpZXIgPSBnZXRGYXJMZWZ0SWRlbnRpZmllcihpZC5wYXJlbnQpO1xuICAgIGNvbnN0IG5hbWVzcGFjZVN5bWJvbCA9XG4gICAgICAgIG5hbWVzcGFjZUlkZW50aWZpZXIgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obmFtZXNwYWNlSWRlbnRpZmllcik7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBuYW1lc3BhY2VTeW1ib2wgJiYgbmFtZXNwYWNlU3ltYm9sLmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDEgP1xuICAgICAgICBuYW1lc3BhY2VTeW1ib2wuZGVjbGFyYXRpb25zWzBdIDpcbiAgICAgICAgbnVsbDtcbiAgICBjb25zdCBuYW1lc3BhY2VEZWNsYXJhdGlvbiA9XG4gICAgICAgIGRlY2xhcmF0aW9uICYmIHRzLmlzTmFtZXNwYWNlSW1wb3J0KGRlY2xhcmF0aW9uKSA/IGRlY2xhcmF0aW9uIDogbnVsbDtcbiAgICBpZiAoIW5hbWVzcGFjZURlY2xhcmF0aW9uKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnREZWNsYXJhdGlvbiA9IG5hbWVzcGFjZURlY2xhcmF0aW9uLnBhcmVudC5wYXJlbnQ7XG4gICAgaWYgKCF0cy5pc1N0cmluZ0xpdGVyYWwoaW1wb3J0RGVjbGFyYXRpb24ubW9kdWxlU3BlY2lmaWVyKSkge1xuICAgICAgLy8gU2hvdWxkIG5vdCBoYXBwZW4gYXMgdGhpcyB3b3VsZCBiZSBpbnZhbGlkIFR5cGVzU2NyaXB0XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZnJvbTogaW1wb3J0RGVjbGFyYXRpb24ubW9kdWxlU3BlY2lmaWVyLnRleHQsXG4gICAgICBuYW1lOiBpZC50ZXh0LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVGVzdCB3aGV0aGVyIGEgZGVjb3JhdG9yIHdhcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYC5cbiAgICpcbiAgICogSXMgdGhlIGRlY29yYXRvcjpcbiAgICogKiBleHRlcm5hbGx5IGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgP1xuICAgKiAqIHRoZSBjdXJyZW50IGhvc3RlZCBwcm9ncmFtIGlzIGFjdHVhbGx5IGBAYW5ndWxhci9jb3JlYCBhbmRcbiAgICogICAtIHJlbGF0aXZlbHkgaW50ZXJuYWxseSBpbXBvcnRlZDsgb3JcbiAgICogICAtIG5vdCBpbXBvcnRlZCwgZnJvbSB0aGUgY3VycmVudCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yIHRoZSBkZWNvcmF0b3IgdG8gdGVzdC5cbiAgICovXG4gIHByb3RlY3RlZCBpc0Zyb21Db3JlKGRlY29yYXRvcjogRGVjb3JhdG9yKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuaXNDb3JlKSB7XG4gICAgICByZXR1cm4gIWRlY29yYXRvci5pbXBvcnQgfHwgL15cXC4vLnRlc3QoZGVjb3JhdG9yLmltcG9ydC5mcm9tKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICEhZGVjb3JhdG9yLmltcG9ydCAmJiBkZWNvcmF0b3IuaW1wb3J0LmZyb20gPT09ICdAYW5ndWxhci9jb3JlJztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCBhbGwgdGhlIGNsYXNzIGRlY2xhcmF0aW9ucyBmcm9tIHRoZSBkdHNUeXBpbmdzIHByb2dyYW0sIHN0b3JpbmcgdGhlbSBpbiBhIG1hcFxuICAgKiB3aGVyZSB0aGUga2V5IGlzIHRoZSBkZWNsYXJlZCBuYW1lIG9mIHRoZSBjbGFzcyBhbmQgdGhlIHZhbHVlIGlzIHRoZSBkZWNsYXJhdGlvbiBpdHNlbGYuXG4gICAqXG4gICAqIEl0IGlzIHBvc3NpYmxlIGZvciB0aGVyZSB0byBiZSBtdWx0aXBsZSBjbGFzcyBkZWNsYXJhdGlvbnMgd2l0aCB0aGUgc2FtZSBsb2NhbCBuYW1lLlxuICAgKiBPbmx5IHRoZSBmaXJzdCBkZWNsYXJhdGlvbiB3aXRoIGEgZ2l2ZW4gbmFtZSBpcyBhZGRlZCB0byB0aGUgbWFwOyBzdWJzZXF1ZW50IGNsYXNzZXMgd2lsbCBiZVxuICAgKiBpZ25vcmVkLlxuICAgKlxuICAgKiBXZSBhcmUgbW9zdCBpbnRlcmVzdGVkIGluIGNsYXNzZXMgdGhhdCBhcmUgcHVibGljbHkgZXhwb3J0ZWQgZnJvbSB0aGUgZW50cnkgcG9pbnQsIHNvIHRoZXNlIGFyZVxuICAgKiBhZGRlZCB0byB0aGUgbWFwIGZpcnN0LCB0byBlbnN1cmUgdGhhdCB0aGV5IGFyZSBub3QgaWdub3JlZC5cbiAgICpcbiAgICogQHBhcmFtIGR0c1Jvb3RGaWxlTmFtZSBUaGUgZmlsZW5hbWUgb2YgdGhlIGVudHJ5LXBvaW50IHRvIHRoZSBgZHRzVHlwaW5nc2AgcHJvZ3JhbS5cbiAgICogQHBhcmFtIGR0c1Byb2dyYW0gVGhlIHByb2dyYW0gY29udGFpbmluZyBhbGwgdGhlIHR5cGluZ3MgZmlsZXMuXG4gICAqIEByZXR1cm5zIGEgbWFwIG9mIGNsYXNzIG5hbWVzIHRvIGNsYXNzIGRlY2xhcmF0aW9ucy5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRHRzRGVjbGFyYXRpb25NYXAoZHRzUm9vdEZpbGVOYW1lOiBzdHJpbmcsIGR0c1Byb2dyYW06IHRzLlByb2dyYW0pOlxuICAgICAgTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+IHtcbiAgICBjb25zdCBkdHNEZWNsYXJhdGlvbk1hcCA9IG5ldyBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCBjaGVja2VyID0gZHRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgLy8gRmlyc3QgYWRkIGFsbCB0aGUgY2xhc3NlcyB0aGF0IGFyZSBwdWJsaWNseSBleHBvcnRlZCBmcm9tIHRoZSBlbnRyeS1wb2ludFxuICAgIGNvbnN0IHJvb3RGaWxlID0gZHRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGR0c1Jvb3RGaWxlTmFtZSk7XG4gICAgaWYgKCFyb290RmlsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZ2l2ZW4gZmlsZSAke2R0c1Jvb3RGaWxlTmFtZX0gaXMgbm90IHBhcnQgb2YgdGhlIHR5cGluZ3MgcHJvZ3JhbS5gKTtcbiAgICB9XG4gICAgY29sbGVjdEV4cG9ydGVkRGVjbGFyYXRpb25zKGNoZWNrZXIsIGR0c0RlY2xhcmF0aW9uTWFwLCByb290RmlsZSk7XG5cbiAgICAvLyBOb3cgYWRkIGFueSBhZGRpdGlvbmFsIGNsYXNzZXMgdGhhdCBhcmUgZXhwb3J0ZWQgZnJvbSBpbmRpdmlkdWFsICBkdHMgZmlsZXMsXG4gICAgLy8gYnV0IGFyZSBub3QgcHVibGljbHkgZXhwb3J0ZWQgZnJvbSB0aGUgZW50cnktcG9pbnQuXG4gICAgZHRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goXG4gICAgICAgIHNvdXJjZUZpbGUgPT4geyBjb2xsZWN0RXhwb3J0ZWREZWNsYXJhdGlvbnMoY2hlY2tlciwgZHRzRGVjbGFyYXRpb25NYXAsIHNvdXJjZUZpbGUpOyB9KTtcbiAgICByZXR1cm4gZHRzRGVjbGFyYXRpb25NYXA7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgdGhlIGdpdmVuIG5vZGUsIHRvIHNlZSBpZiBpdCBpcyBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3QuXG4gICAqIEBwYXJhbSBub2RlIGEgbm9kZSB0byBjaGVjayB0byBzZWUgaWYgaXQgaXMgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBgTW9kdWxlV2l0aFByb3ZpZGVyc2BcbiAgICogb2JqZWN0LlxuICAgKiBAcmV0dXJucyBpbmZvIGFib3V0IHRoZSBmdW5jdGlvbiBpZiBpdCBkb2VzIHJldHVybiBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3Q7IGBudWxsYFxuICAgKiBvdGhlcndpc2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgcGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKG5vZGU6IHRzLk5vZGV8bnVsbCk6IE1vZHVsZVdpdGhQcm92aWRlcnNGdW5jdGlvbnxudWxsIHtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9XG4gICAgICAgIG5vZGUgJiYgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSB8fCB0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpKSA/IG5vZGUgOiBudWxsO1xuICAgIGNvbnN0IGJvZHkgPSBkZWNsYXJhdGlvbiA/IHRoaXMuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24oZGVjbGFyYXRpb24pLmJvZHkgOiBudWxsO1xuICAgIGNvbnN0IGxhc3RTdGF0ZW1lbnQgPSBib2R5ICYmIGJvZHlbYm9keS5sZW5ndGggLSAxXTtcbiAgICBjb25zdCByZXR1cm5FeHByZXNzaW9uID1cbiAgICAgICAgbGFzdFN0YXRlbWVudCAmJiB0cy5pc1JldHVyblN0YXRlbWVudChsYXN0U3RhdGVtZW50KSAmJiBsYXN0U3RhdGVtZW50LmV4cHJlc3Npb24gfHwgbnVsbDtcbiAgICBjb25zdCBuZ01vZHVsZVByb3BlcnR5ID0gcmV0dXJuRXhwcmVzc2lvbiAmJiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHJldHVybkV4cHJlc3Npb24pICYmXG4gICAgICAgICAgICByZXR1cm5FeHByZXNzaW9uLnByb3BlcnRpZXMuZmluZChcbiAgICAgICAgICAgICAgICBwcm9wID0+XG4gICAgICAgICAgICAgICAgICAgICEhcHJvcC5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihwcm9wLm5hbWUpICYmIHByb3AubmFtZS50ZXh0ID09PSAnbmdNb2R1bGUnKSB8fFxuICAgICAgICBudWxsO1xuICAgIGNvbnN0IG5nTW9kdWxlID0gbmdNb2R1bGVQcm9wZXJ0eSAmJiB0cy5pc1Byb3BlcnR5QXNzaWdubWVudChuZ01vZHVsZVByb3BlcnR5KSAmJlxuICAgICAgICAgICAgdHMuaXNJZGVudGlmaWVyKG5nTW9kdWxlUHJvcGVydHkuaW5pdGlhbGl6ZXIpICYmIG5nTW9kdWxlUHJvcGVydHkuaW5pdGlhbGl6ZXIgfHxcbiAgICAgICAgbnVsbDtcbiAgICByZXR1cm4gbmdNb2R1bGUgJiYgZGVjbGFyYXRpb24gJiYge25nTW9kdWxlLCBkZWNsYXJhdGlvbn07XG4gIH1cbn1cblxuLy8vLy8vLy8vLy8vLyBFeHBvcnRlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuZXhwb3J0IHR5cGUgUGFyYW1JbmZvID0ge1xuICBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSB8IG51bGwsXG4gIHR5cGVFeHByZXNzaW9uOiB0cy5FeHByZXNzaW9uIHwgbnVsbFxufTtcblxuLyoqXG4gKiBBIHN0YXRlbWVudCBub2RlIHRoYXQgcmVwcmVzZW50cyBhbiBhc3NpZ25tZW50LlxuICovXG5leHBvcnQgdHlwZSBBc3NpZ25tZW50U3RhdGVtZW50ID1cbiAgICB0cy5FeHByZXNzaW9uU3RhdGVtZW50ICYge2V4cHJlc3Npb246IHtsZWZ0OiB0cy5JZGVudGlmaWVyLCByaWdodDogdHMuRXhwcmVzc2lvbn19O1xuXG4vKipcbiAqIFRlc3Qgd2hldGhlciBhIHN0YXRlbWVudCBub2RlIGlzIGFuIGFzc2lnbm1lbnQgc3RhdGVtZW50LlxuICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRvIHRlc3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Fzc2lnbm1lbnRTdGF0ZW1lbnQoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQpOiBzdGF0ZW1lbnQgaXMgQXNzaWdubWVudFN0YXRlbWVudCB7XG4gIHJldHVybiB0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSAmJiBpc0Fzc2lnbm1lbnQoc3RhdGVtZW50LmV4cHJlc3Npb24pICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIoc3RhdGVtZW50LmV4cHJlc3Npb24ubGVmdCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Fzc2lnbm1lbnQoZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbik6XG4gICAgZXhwcmVzc2lvbiBpcyB0cy5Bc3NpZ25tZW50RXhwcmVzc2lvbjx0cy5FcXVhbHNUb2tlbj4ge1xuICByZXR1cm4gdHMuaXNCaW5hcnlFeHByZXNzaW9uKGV4cHJlc3Npb24pICYmXG4gICAgICBleHByZXNzaW9uLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbjtcbn1cblxuLyoqXG4gKiBUaGUgdHlwZSBvZiBhIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIHVzZWQgdG8gZmlsdGVyIG91dCBoZWxwZXJzIGJhc2VkIG9uIHRoZWlyIHRhcmdldC5cbiAqIFRoaXMgaXMgdXNlZCBpbiBgcmVmbGVjdERlY29yYXRvcnNGcm9tSGVscGVyQ2FsbCgpYC5cbiAqL1xuZXhwb3J0IHR5cGUgVGFyZ2V0RmlsdGVyID0gKHRhcmdldDogdHMuRXhwcmVzc2lvbikgPT4gYm9vbGVhbjtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCB0ZXN0cyB3aGV0aGVyIHRoZSBnaXZlbiBleHByZXNzaW9uIGlzIGEgY2xhc3MgdGFyZ2V0LlxuICogQHBhcmFtIGNsYXNzTmFtZSB0aGUgbmFtZSBvZiB0aGUgY2xhc3Mgd2Ugd2FudCB0byB0YXJnZXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlQ2xhc3NUYXJnZXRGaWx0ZXIoY2xhc3NOYW1lOiBzdHJpbmcpOiBUYXJnZXRGaWx0ZXIge1xuICByZXR1cm4gKHRhcmdldDogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4gPT4gdHMuaXNJZGVudGlmaWVyKHRhcmdldCkgJiYgdGFyZ2V0LnRleHQgPT09IGNsYXNzTmFtZTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCB0ZXN0cyB3aGV0aGVyIHRoZSBnaXZlbiBleHByZXNzaW9uIGlzIGEgY2xhc3MgbWVtYmVyIHRhcmdldC5cbiAqIEBwYXJhbSBjbGFzc05hbWUgdGhlIG5hbWUgb2YgdGhlIGNsYXNzIHdlIHdhbnQgdG8gdGFyZ2V0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZU1lbWJlclRhcmdldEZpbHRlcihjbGFzc05hbWU6IHN0cmluZyk6IFRhcmdldEZpbHRlciB7XG4gIHJldHVybiAodGFyZ2V0OiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiA9PiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbih0YXJnZXQpICYmXG4gICAgICB0cy5pc0lkZW50aWZpZXIodGFyZ2V0LmV4cHJlc3Npb24pICYmIHRhcmdldC5leHByZXNzaW9uLnRleHQgPT09IGNsYXNzTmFtZSAmJlxuICAgICAgdGFyZ2V0Lm5hbWUudGV4dCA9PT0gJ3Byb3RvdHlwZSc7XG59XG5cbi8qKlxuICogSGVscGVyIG1ldGhvZCB0byBleHRyYWN0IHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGdpdmVuIHRoZSBwcm9wZXJ0eSdzIFwic3ltYm9sXCIsXG4gKiB3aGljaCBpcyBhY3R1YWxseSB0aGUgc3ltYm9sIG9mIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHByb3BTeW1ib2w6IHRzLlN5bWJvbCk6IHRzLkV4cHJlc3Npb258dW5kZWZpbmVkIHtcbiAgY29uc3QgcHJvcElkZW50aWZpZXIgPSBwcm9wU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gIGNvbnN0IHBhcmVudCA9IHByb3BJZGVudGlmaWVyICYmIHByb3BJZGVudGlmaWVyLnBhcmVudDtcbiAgcmV0dXJuIHBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24ocGFyZW50KSA/IHBhcmVudC5yaWdodCA6IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBBIGNhbGxlZSBjb3VsZCBiZSBvbmUgb2Y6IGBfX2RlY29yYXRlKC4uLilgIG9yIGB0c2xpYl8xLl9fZGVjb3JhdGVgLlxuICovXG5mdW5jdGlvbiBnZXRDYWxsZWVOYW1lKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKTogc3RyaW5nfG51bGwge1xuICBpZiAodHMuaXNJZGVudGlmaWVyKGNhbGwuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gY2FsbC5leHByZXNzaW9uLnRleHQ7XG4gIH1cbiAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGNhbGwuZXhwcmVzc2lvbikpIHtcbiAgICByZXR1cm4gY2FsbC5leHByZXNzaW9uLm5hbWUudGV4dDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLy8vLy8vLy8vLy8vLyBJbnRlcm5hbCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gZ2V0RGVjb3JhdG9yQXJncyhub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb25bXSB7XG4gIC8vIFRoZSBhcmd1bWVudHMgb2YgYSBkZWNvcmF0b3IgYXJlIGhlbGQgaW4gdGhlIGBhcmdzYCBwcm9wZXJ0eSBvZiBpdHMgZGVjbGFyYXRpb24gb2JqZWN0LlxuICBjb25zdCBhcmdzUHJvcGVydHkgPSBub2RlLnByb3BlcnRpZXMuZmlsdGVyKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmQocHJvcGVydHkgPT4gZ2V0TmFtZVRleHQocHJvcGVydHkubmFtZSkgPT09ICdhcmdzJyk7XG4gIGNvbnN0IGFyZ3NFeHByZXNzaW9uID0gYXJnc1Byb3BlcnR5ICYmIGFyZ3NQcm9wZXJ0eS5pbml0aWFsaXplcjtcbiAgcmV0dXJuIGFyZ3NFeHByZXNzaW9uICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihhcmdzRXhwcmVzc2lvbikgP1xuICAgICAgQXJyYXkuZnJvbShhcmdzRXhwcmVzc2lvbi5lbGVtZW50cykgOlxuICAgICAgW107XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUZyb21NYXA8VD4obWFwOiBNYXA8c3RyaW5nLCBUPiwga2V5OiB0cy5fX1N0cmluZyk6IFR8dW5kZWZpbmVkIHtcbiAgY29uc3QgbWFwS2V5ID0ga2V5IGFzIHN0cmluZztcbiAgY29uc3QgdmFsdWUgPSBtYXAuZ2V0KG1hcEtleSk7XG4gIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbWFwLmRlbGV0ZShtYXBLZXkpO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gaXNQcm9wZXJ0eUFjY2Vzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24mXG4gICAge3BhcmVudDogdHMuQmluYXJ5RXhwcmVzc2lvbn0ge1xuICByZXR1cm4gISFub2RlLnBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZS5wYXJlbnQpICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpc1RoaXNBc3NpZ25tZW50KG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5CaW5hcnlFeHByZXNzaW9uJlxuICAgIHtsZWZ0OiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpICYmXG4gICAgICBub2RlLmxlZnQuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkO1xufVxuXG5mdW5jdGlvbiBpc05hbWVkRGVjbGFyYXRpb24obm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLk5hbWVkRGVjbGFyYXRpb24mXG4gICAge25hbWU6IHRzLklkZW50aWZpZXJ9IHtcbiAgY29uc3QgYW55Tm9kZTogYW55ID0gbm9kZTtcbiAgcmV0dXJuICEhYW55Tm9kZS5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihhbnlOb2RlLm5hbWUpO1xufVxuXG5cbmZ1bmN0aW9uIGlzQ2xhc3NNZW1iZXJUeXBlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5DbGFzc0VsZW1lbnR8XG4gICAgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuaXNDbGFzc0VsZW1lbnQobm9kZSkgfHwgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSB8fCB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSk7XG59XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gYSBwcm9wZXJ0eSBhY2Nlc3MgY2hhaW4uIEUuZy4gdGhlIGBhYCBvZiBgYS5iLmMuZGAuXG4gKiBAcGFyYW0gcHJvcGVydHlBY2Nlc3MgVGhlIHN0YXJ0aW5nIHByb3BlcnR5IGFjY2VzcyBleHByZXNzaW9uIGZyb20gd2hpY2ggd2Ugd2FudCB0byBjb21wdXRlXG4gKiB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIuXG4gKiBAcmV0dXJucyB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gdGhlIGNoYWluIG9yIGBudWxsYCBpZiBpdCBpcyBub3QgYW4gaWRlbnRpZmllci5cbiAqL1xuZnVuY3Rpb24gZ2V0RmFyTGVmdElkZW50aWZpZXIocHJvcGVydHlBY2Nlc3M6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIHdoaWxlICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihwcm9wZXJ0eUFjY2Vzcy5leHByZXNzaW9uKSkge1xuICAgIHByb3BlcnR5QWNjZXNzID0gcHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbjtcbiAgfVxuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKHByb3BlcnR5QWNjZXNzLmV4cHJlc3Npb24pID8gcHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbiA6IG51bGw7XG59XG5cbi8qKlxuICogQ29sbGVjdCBtYXBwaW5ncyBiZXR3ZWVuIGV4cG9ydGVkIGRlY2xhcmF0aW9ucyBpbiBhIHNvdXJjZSBmaWxlIGFuZCBpdHMgYXNzb2NpYXRlZFxuICogZGVjbGFyYXRpb24gaW4gdGhlIHR5cGluZ3MgcHJvZ3JhbS5cbiAqL1xuZnVuY3Rpb24gY29sbGVjdEV4cG9ydGVkRGVjbGFyYXRpb25zKFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+LFxuICAgIHNyY0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgY29uc3Qgc3JjTW9kdWxlID0gc3JjRmlsZSAmJiBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oc3JjRmlsZSk7XG4gIGNvbnN0IG1vZHVsZUV4cG9ydHMgPSBzcmNNb2R1bGUgJiYgY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUoc3JjTW9kdWxlKTtcbiAgaWYgKG1vZHVsZUV4cG9ydHMpIHtcbiAgICBtb2R1bGVFeHBvcnRzLmZvckVhY2goZXhwb3J0ZWRTeW1ib2wgPT4ge1xuICAgICAgaWYgKGV4cG9ydGVkU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgICAgZXhwb3J0ZWRTeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2woZXhwb3J0ZWRTeW1ib2wpO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSBleHBvcnRlZFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkU3ltYm9sLm5hbWU7XG4gICAgICBpZiAoZGVjbGFyYXRpb24gJiYgIWR0c0RlY2xhcmF0aW9uTWFwLmhhcyhuYW1lKSkge1xuICAgICAgICBkdHNEZWNsYXJhdGlvbk1hcC5zZXQobmFtZSwgZGVjbGFyYXRpb24pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cblxuLyoqXG4gKiBBIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG1heSBoYXZlIGJlZW4gXCJzeW50aGVzaXplZFwiIGJ5IFR5cGVTY3JpcHQgZHVyaW5nIEphdmFTY3JpcHQgZW1pdCxcbiAqIGluIHRoZSBjYXNlIG5vIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGUuZy4gcHJvcGVydHkgaW5pdGlhbGl6ZXJzIGFyZSB1c2VkLlxuICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAqIGNvbXBpbGVyIGdlbmVyYXRlcyBhIHN5bnRoZXRpYyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gKiBvcmlnaW5hbGx5IGhhdmUgYSBjb25zdHJ1Y3RvciBpbiB0aGUgVHlwZVNjcmlwdCBzb3VyY2UuIFdoZW4gYSBjbGFzcyBoYXMgYSBzdXBlcmNsYXNzLFxuICogYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciBtdXN0IG5vdCBiZSBjb25zaWRlcmVkIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXRcbiAqIHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5IG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiB0aGF0IGRvZXMgbm90IGluamVjdCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0XG4gKiBzeW50aGVzaXplZCBzdXBlciBjYWxsIGluIHRoZSBjb25zdHJ1Y3RvciBib2R5LCBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHRcbiAqIGVtaXRzIGR1cmluZyBKYXZhU2NyaXB0IGVtaXQ6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi92My4yLjIvc3JjL2NvbXBpbGVyL3RyYW5zZm9ybWVycy90cy50cyNMMTA2OC1MMTA4MlxuICpcbiAqIEBwYXJhbSBjb25zdHJ1Y3RvciBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIHRlc3RcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGNvbnN0cnVjdG9yIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcjogdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGNvbnN0cnVjdG9yLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgaWYgKCFmaXJzdFN0YXRlbWVudCB8fCAhdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkU3VwZXJDYWxsKGZpcnN0U3RhdGVtZW50LmV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWQgYnkgVHlwZVNjcmlwdCwgaS5lLiB3aGV0aGVyXG4gKiBpdCBpcyBvZiB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBzdXBlciguLi5hcmd1bWVudHMpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBpcyB0byBiZSB0ZXN0ZWRcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5leHByZXNzaW9uLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuU3VwZXJLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICByZXR1cm4gdHMuaXNTcHJlYWRFbGVtZW50KGFyZ3VtZW50KSAmJiB0cy5pc0lkZW50aWZpZXIoYXJndW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIGFyZ3VtZW50LmV4cHJlc3Npb24udGV4dCA9PT0gJ2FyZ3VtZW50cyc7XG59XG4iXX0=