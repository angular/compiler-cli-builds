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
        define("@angular/compiler-cli/ngcc/src/host/esm2015_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/host/decorated_class", "@angular/compiler-cli/ngcc/src/host/ngcc_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var decorated_class_1 = require("@angular/compiler-cli/ngcc/src/host/decorated_class");
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
        function Esm2015ReflectionHost(isCore, checker, dts) {
            var _this = _super.call(this, checker) || this;
            _this.isCore = isCore;
            _this.dtsDeclarationMap = dts && _this.computeDtsDeclarationMap(dts.path, dts.program) || null;
            return _this;
        }
        /**
         * Find the declaration of a node that we think is a class.
         * Classes should have a `name` identifier, because they may need to be referenced in other parts
         * of the program.
         *
         * @param node the node that represents the class whose declaration we are finding.
         * @returns the declaration of the class or `undefined` if it is not a "class".
         */
        Esm2015ReflectionHost.prototype.getClassDeclaration = function (node) {
            if (ts.isVariableDeclaration(node) && node.initializer) {
                node = node.initializer;
            }
            if (!ts.isClassDeclaration(node) && !ts.isClassExpression(node)) {
                return undefined;
            }
            return utils_1.hasNameIdentifier(node) ? node : undefined;
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
         * Examine a symbol which should be of a class, and return metadata about its members.
         *
         * @param symbol the `ClassSymbol` representing the class over which to reflect.
         * @returns an array of `ClassMember` metadata representing the members of the class.
         */
        Esm2015ReflectionHost.prototype.getMembersOfSymbol = function (symbol) {
            var _this = this;
            var members = [];
            // The decorators map contains all the properties that are decorated
            var decoratorsMap = this.getMemberDecorators(symbol);
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
            if (ts.isVariableDeclaration(symbol.valueDeclaration.parent)) {
                var variableSymbol = this.checker.getSymbolAtLocation(symbol.valueDeclaration.parent.name);
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
            var declaration = implementation &&
                (ts.isFunctionDeclaration(implementation) || ts.isMethodDeclaration(implementation) ||
                    ts.isFunctionExpression(implementation)) ?
                implementation :
                null;
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
            return ngModule && declaration && { name: name, ngModule: ngModule, declaration: declaration, container: container };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2hvc3QvZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyx5RUFBNEw7SUFFNUwsOERBQTRFO0lBRTVFLHVGQUFpRDtJQUNqRCwyRUFBMko7SUFFOUksUUFBQSxVQUFVLEdBQUcsWUFBMkIsQ0FBQztJQUN6QyxRQUFBLGVBQWUsR0FBRyxnQkFBK0IsQ0FBQztJQUNsRCxRQUFBLFdBQVcsR0FBRyxlQUE4QixDQUFDO0lBQzdDLFFBQUEsa0JBQWtCLEdBQUcsZ0JBQStCLENBQUM7SUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BMEJHO0lBQ0g7UUFBMkMsaURBQXdCO1FBRWpFLCtCQUFzQixNQUFlLEVBQUUsT0FBdUIsRUFBRSxHQUF3QjtZQUF4RixZQUNFLGtCQUFNLE9BQU8sQ0FBQyxTQUVmO1lBSHFCLFlBQU0sR0FBTixNQUFNLENBQVM7WUFFbkMsS0FBSSxDQUFDLGlCQUFpQixHQUFHLEdBQUcsSUFBSSxLQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDOztRQUMvRixDQUFDO1FBRUQ7Ozs7Ozs7V0FPRztRQUNILG1EQUFtQixHQUFuQixVQUFvQixJQUFhO1lBQy9CLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ3RELElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2FBQ3pCO1lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIs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Q0FBQztRQUNuRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWTtZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQzVFLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXBELElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsT0FBTyxFQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztZQUN2RSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUM7SUFDL0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgQ2xhc3NTeW1ib2wsIEN0b3JQYXJhbWV0ZXIsIERlY29yYXRvciwgSW1wb3J0LCBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0J1bmRsZVByb2dyYW19IGZyb20gJy4uL3BhY2thZ2VzL2J1bmRsZV9wcm9ncmFtJztcbmltcG9ydCB7ZmluZEFsbCwgZ2V0TmFtZVRleHQsIGhhc05hbWVJZGVudGlmaWVyLCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtEZWNvcmF0ZWRDbGFzc30gZnJvbSAnLi9kZWNvcmF0ZWRfY2xhc3MnO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb24sIE5nY2NSZWZsZWN0aW9uSG9zdCwgUFJFX1IzX01BUktFUiwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb24sIGlzU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4vbmdjY19ob3N0JztcblxuZXhwb3J0IGNvbnN0IERFQ09SQVRPUlMgPSAnZGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5leHBvcnQgY29uc3QgUFJPUF9ERUNPUkFUT1JTID0gJ3Byb3BEZWNvcmF0b3JzJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBDT05TVFJVQ1RPUiA9ICdfX2NvbnN0cnVjdG9yJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBDT05TVFJVQ1RPUl9QQVJBTVMgPSAnY3RvclBhcmFtZXRlcnMnIGFzIHRzLl9fU3RyaW5nO1xuXG4vKipcbiAqIEVzbTIwMTUgcGFja2FnZXMgY29udGFpbiBFQ01BU2NyaXB0IDIwMTUgY2xhc3NlcywgZXRjLlxuICogRGVjb3JhdG9ycyBhcmUgZGVmaW5lZCB2aWEgc3RhdGljIHByb3BlcnRpZXMgb24gdGhlIGNsYXNzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGNsYXNzIFNvbWVEaXJlY3RpdmUge1xuICogfVxuICogU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzID0gW1xuICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gKiBdO1xuICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzID0ge1xuICogICBcImlucHV0MVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiAgIFwiaW5wdXQyXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqIH07XG4gKiBgYGBcbiAqXG4gKiAqIENsYXNzZXMgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqICogTWVtYmVycyBhcmUgZGVjb3JhdGVkIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcga2V5IG9uIGEgc3RhdGljIHByb3BlcnR5XG4gKiAgIGNhbGxlZCBgcHJvcERlY29yYXRvcnNgLlxuICogKiBDb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGRlY29yYXRvcnMgYXJlIGZvdW5kIG9uIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gKiAgIGEgc3RhdGljIG1ldGhvZCBjYWxsZWQgYGN0b3JQYXJhbWV0ZXJzYC5cbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCBpbXBsZW1lbnRzIE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gIHByb3RlY3RlZCBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+fG51bGw7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBkdHM/OiBCdW5kbGVQcm9ncmFtfG51bGwpIHtcbiAgICBzdXBlcihjaGVja2VyKTtcbiAgICB0aGlzLmR0c0RlY2xhcmF0aW9uTWFwID0gZHRzICYmIHRoaXMuY29tcHV0ZUR0c0RlY2xhcmF0aW9uTWFwKGR0cy5wYXRoLCBkdHMucHJvZ3JhbSkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbiBvZiBhIG5vZGUgdGhhdCB3ZSB0aGluayBpcyBhIGNsYXNzLlxuICAgKiBDbGFzc2VzIHNob3VsZCBoYXZlIGEgYG5hbWVgIGlkZW50aWZpZXIsIGJlY2F1c2UgdGhleSBtYXkgbmVlZCB0byBiZSByZWZlcmVuY2VkIGluIG90aGVyIHBhcnRzXG4gICAqIG9mIHRoZSBwcm9ncmFtLlxuICAgKlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgbm9kZSB0aGF0IHJlcHJlc2VudHMgdGhlIGNsYXNzIHdob3NlIGRlY2xhcmF0aW9uIHdlIGFyZSBmaW5kaW5nLlxuICAgKiBAcmV0dXJucyB0aGUgZGVjbGFyYXRpb24gb2YgdGhlIGNsYXNzIG9yIGB1bmRlZmluZWRgIGlmIGl0IGlzIG5vdCBhIFwiY2xhc3NcIi5cbiAgICovXG4gIGdldENsYXNzRGVjbGFyYXRpb24obm9kZTogdHMuTm9kZSk6IENsYXNzRGVjbGFyYXRpb258dW5kZWZpbmVkIHtcbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUuaW5pdGlhbGl6ZXIpIHtcbiAgICAgIG5vZGUgPSBub2RlLmluaXRpYWxpemVyO1xuICAgIH1cblxuICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpICYmICF0cy5pc0NsYXNzRXhwcmVzc2lvbihub2RlKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFzTmFtZUlkZW50aWZpZXIobm9kZSkgPyBub2RlIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiIG9yIGhhcyBubyBzeW1ib2wuXG4gICAqL1xuICBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuTm9kZSk6IENsYXNzU3ltYm9sfHVuZGVmaW5lZCB7XG4gICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbiA9IHRoaXMuZ2V0Q2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgcmV0dXJuIGNsYXNzRGVjbGFyYXRpb24gJiZcbiAgICAgICAgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oY2xhc3NEZWNsYXJhdGlvbi5uYW1lKSBhcyBDbGFzc1N5bWJvbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gKGZvciBleGFtcGxlLCBvZiBhIGNsYXNzIG9yIGZ1bmN0aW9uKSBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IGFueVxuICAgKiBkZWNvcmF0b3JzIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjbGFyYXRpb24gYSBUeXBlU2NyaXB0IGB0cy5EZWNsYXJhdGlvbmAgbm9kZSByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG9yIGZ1bmN0aW9uIG92ZXJcbiAgICogd2hpY2ggdG8gcmVmbGVjdC4gRm9yIGV4YW1wbGUsIGlmIHRoZSBpbnRlbnQgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGFuZCB0aGVcbiAgICogc291cmNlIGlzIGluIEVTNiBmb3JtYXQsIHRoaXMgd2lsbCBiZSBhIGB0cy5DbGFzc0RlY2xhcmF0aW9uYCBub2RlLiBJZiB0aGUgc291cmNlIGlzIGluIEVTNVxuICAgKiBmb3JtYXQsIHRoaXMgbWlnaHQgYmUgYSBgdHMuVmFyaWFibGVEZWNsYXJhdGlvbmAgYXMgY2xhc3NlcyBpbiBFUzUgYXJlIHJlcHJlc2VudGVkIGFzIHRoZVxuICAgKiByZXN1bHQgb2YgYW4gSUlGRSBleGVjdXRpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBEZWNvcmF0b3JgIG1ldGFkYXRhIGlmIGRlY29yYXRvcnMgYXJlIHByZXNlbnQgb24gdGhlIGRlY2xhcmF0aW9uLCBvclxuICAgKiBgbnVsbGAgaWYgZWl0aGVyIG5vIGRlY29yYXRvcnMgd2VyZSBwcmVzZW50IG9yIGlmIHRoZSBkZWNsYXJhdGlvbiBpcyBub3Qgb2YgYSBkZWNvcmF0YWJsZSB0eXBlLlxuICAgKi9cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgaWYgKCFzeW1ib2wpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5nZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGFtaW5lIGEgZGVjbGFyYXRpb24gd2hpY2ggc2hvdWxkIGJlIG9mIGEgY2xhc3MsIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgdGhlIG1lbWJlcnMgb2YgdGhlXG4gICAqIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBDbGFzc01lbWJlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBtZW1iZXJzIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldE1lbWJlcnNPZkNsYXNzKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoIWNsYXNzU3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHRlZCB0byBnZXQgbWVtYmVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldE1lbWJlcnNPZlN5bWJvbChjbGFzc1N5bWJvbCk7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgaXRzIHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIG9ubHkgbG9va3MgYXQgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MgZGlyZWN0bHkgYW5kIG5vdCBhdCBhbnkgaW5oZXJpdGVkXG4gICAqIGNvbnN0cnVjdG9ycy5cbiAgICpcbiAgICogQHBhcmFtIGNsYXp6IGEgYENsYXNzRGVjbGFyYXRpb25gIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3ZlciB3aGljaCB0byByZWZsZWN0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgUGFyYW1ldGVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIHBhcmFtZXRlcnMgb2YgdGhlIGNvbnN0cnVjdG9yLCBpZlxuICAgKiBhIGNvbnN0cnVjdG9yIGV4aXN0cy4gSWYgdGhlIGNvbnN0cnVjdG9yIGV4aXN0cyBhbmQgaGFzIDAgcGFyYW1ldGVycywgdGhpcyBhcnJheSB3aWxsIGJlIGVtcHR5LlxuICAgKiBJZiB0aGUgY2xhc3MgaGFzIG5vIGNvbnN0cnVjdG9yLCB0aGlzIG1ldGhvZCByZXR1cm5zIGBudWxsYC5cbiAgICpcbiAgICogQHRocm93cyBpZiBgZGVjbGFyYXRpb25gIGRvZXMgbm90IHJlc29sdmUgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IEN0b3JQYXJhbWV0ZXJbXXxudWxsIHtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQXR0ZW1wdGVkIHRvIGdldCBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgbm9uLWNsYXNzOiBcIiR7Y2xhenouZ2V0VGV4dCgpfVwiYCk7XG4gICAgfVxuICAgIGNvbnN0IHBhcmFtZXRlck5vZGVzID0gdGhpcy5nZXRDb25zdHJ1Y3RvclBhcmFtZXRlckRlY2xhcmF0aW9ucyhjbGFzc1N5bWJvbCk7XG4gICAgaWYgKHBhcmFtZXRlck5vZGVzKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhjbGFzc1N5bWJvbCwgcGFyYW1ldGVyTm9kZXMpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIG1vZHVsZSBmb3IgdmFyaWFibGUgZGVjbGFyYXRpb25zIGluIHdoaWNoIHRoZSBpbml0aWFsaXplclxuICAgKiBpcyBhbiBpZGVudGlmaWVyIG1hcmtlZCB3aXRoIHRoZSBgUFJFX1IzX01BUktFUmAuXG4gICAqIEBwYXJhbSBtb2R1bGUgdGhlIG1vZHVsZSBpbiB3aGljaCB0byBzZWFyY2ggZm9yIHN3aXRjaGFibGUgZGVjbGFyYXRpb25zLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgdGhhdCBtYXRjaC5cbiAgICovXG4gIGdldFN3aXRjaGFibGVEZWNsYXJhdGlvbnMobW9kdWxlOiB0cy5Ob2RlKTogU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb25bXSB7XG4gICAgLy8gRG9uJ3QgYm90aGVyIHRvIHdhbGsgdGhlIEFTVCBpZiB0aGUgbWFya2VyIGlzIG5vdCBmb3VuZCBpbiB0aGUgdGV4dFxuICAgIHJldHVybiBtb2R1bGUuZ2V0VGV4dCgpLmluZGV4T2YoUFJFX1IzX01BUktFUikgPj0gMCA/XG4gICAgICAgIGZpbmRBbGwobW9kdWxlLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uKSA6XG4gICAgICAgIFtdO1xuICB9XG5cbiAgZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdmFsdWUgPSBzdXBlci5nZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBXZSBoYXZlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCBoYXMgbm8gaW5pdGlhbGl6ZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gdmFyIEh0dHBDbGllbnRYc3JmTW9kdWxlXzE7XG4gICAgLy8gYGBgXG4gICAgLy9cbiAgICAvLyBTbyBsb29rIGZvciB0aGUgc3BlY2lhbCBzY2VuYXJpbyB3aGVyZSB0aGUgdmFyaWFibGUgaXMgYmVpbmcgYXNzaWduZWQgaW5cbiAgICAvLyBhIG5lYXJieSBzdGF0ZW1lbnQgdG8gdGhlIHJldHVybiB2YWx1ZSBvZiBhIGNhbGwgdG8gYF9fZGVjb3JhdGVgLlxuICAgIC8vIFRoZW4gZmluZCB0aGUgMm5kIGFyZ3VtZW50IG9mIHRoYXQgY2FsbCwgdGhlIFwidGFyZ2V0XCIsIHdoaWNoIHdpbGwgYmUgdGhlXG4gICAgLy8gYWN0dWFsIGNsYXNzIGlkZW50aWZpZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gSHR0cENsaWVudFhzcmZNb2R1bGUgPSBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xID0gdHNsaWJfMS5fX2RlY29yYXRlKFtcbiAgICAvLyAgIE5nTW9kdWxlKHtcbiAgICAvLyAgICAgcHJvdmlkZXJzOiBbXSxcbiAgICAvLyAgIH0pXG4gICAgLy8gXSwgSHR0cENsaWVudFhzcmZNb2R1bGUpO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gQW5kIGZpbmFsbHksIGZpbmQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBpZGVudGlmaWVyIGluIHRoYXQgYXJndW1lbnQuXG4gICAgLy8gTm90ZSBhbHNvIHRoYXQgdGhlIGFzc2lnbm1lbnQgY2FuIG9jY3VyIHdpdGhpbiBhbm90aGVyIGFzc2lnbm1lbnQuXG4gICAgLy9cbiAgICBjb25zdCBibG9jayA9IGRlY2xhcmF0aW9uLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgIGlmIChzeW1ib2wgJiYgKHRzLmlzQmxvY2soYmxvY2spIHx8IHRzLmlzU291cmNlRmlsZShibG9jaykpKSB7XG4gICAgICBjb25zdCBkZWNvcmF0ZUNhbGwgPSB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKGJsb2NrLCBzeW1ib2wpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZGVjb3JhdGVDYWxsICYmIGRlY29yYXRlQ2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodGFyZ2V0ICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHRhcmdldCk7XG4gICAgICAgIGNvbnN0IHRhcmdldERlY2xhcmF0aW9uID0gdGFyZ2V0U3ltYm9sICYmIHRhcmdldFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgICBpZiAodGFyZ2V0RGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSB8fFxuICAgICAgICAgICAgICB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGp1c3QgYSBmdW5jdGlvbiBvciBjbGFzcyBkZWNsYXJhdGlvblxuICAgICAgICAgICAgLy8gc28gcmV0dXJuIGl0cyBpZGVudGlmaWVyIGFzIHRoZSB2YXJpYWJsZSB2YWx1ZS5cbiAgICAgICAgICAgIHJldHVybiB0YXJnZXREZWNsYXJhdGlvbi5uYW1lIHx8IG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sIHNvIGZpbmQgdGhlIGZhciByaWdodCBleHByZXNzaW9uLFxuICAgICAgICAgICAgLy8gaW4gdGhlIGNhc2Ugb2YgbXVsdGlwbGUgYXNzaWdubWVudHMgKGUuZy4gYHZhcjEgPSB2YXIyID0gdmFsdWVgKS5cbiAgICAgICAgICAgIGxldCB0YXJnZXRWYWx1ZSA9IHRhcmdldERlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgd2hpbGUgKHRhcmdldFZhbHVlICYmIGlzQXNzaWdubWVudCh0YXJnZXRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgdGFyZ2V0VmFsdWUgPSB0YXJnZXRWYWx1ZS5yaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0YXJnZXRWYWx1ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZSBpZiBhbiBpZGVudGlmaWVyIHdhcyBpbXBvcnRlZCBmcm9tIGFub3RoZXIgbW9kdWxlIGFuZCByZXR1cm4gYEltcG9ydGAgbWV0YWRhdGFcbiAgICogZGVzY3JpYmluZyBpdHMgb3JpZ2luLlxuICAgKlxuICAgKiBAcGFyYW0gaWQgYSBUeXBlU2NyaXB0IGB0cy5JZGVudGlmZXJgIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIG1ldGFkYXRhIGFib3V0IHRoZSBgSW1wb3J0YCBpZiB0aGUgaWRlbnRpZmllciB3YXMgaW1wb3J0ZWQgZnJvbSBhbm90aGVyIG1vZHVsZSwgb3JcbiAgICogYG51bGxgIGlmIHRoZSBpZGVudGlmaWVyIGRvZXNuJ3QgcmVzb2x2ZSB0byBhbiBpbXBvcnQgYnV0IGluc3RlYWQgaXMgbG9jYWxseSBkZWZpbmVkLlxuICAgKi9cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIHJldHVybiBzdXBlci5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpIHx8IHRoaXMuZ2V0SW1wb3J0T2ZOYW1lc3BhY2VkSWRlbnRpZmllcihpZCk7XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdGhlIGNsYXNzZXMgdGhhdCBjb250YWluIGRlY29yYXRpb25zIGluIGEgZ2l2ZW4gZmlsZS5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgZGVjb3JhdGVkIGNsYXNzZXMuXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGRlY29yYXRlZCBjbGFzc2VzLlxuICAgKi9cbiAgZmluZERlY29yYXRlZENsYXNzZXMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IERlY29yYXRlZENsYXNzW10ge1xuICAgIGNvbnN0IGNsYXNzZXM6IERlY29yYXRlZENsYXNzW10gPSBbXTtcbiAgICBzb3VyY2VGaWxlLnN0YXRlbWVudHMubWFwKHN0YXRlbWVudCA9PiB7XG4gICAgICBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdGF0ZW1lbnQpKSB7XG4gICAgICAgIHN0YXRlbWVudC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGRlY29yYXRlZENsYXNzID0gdGhpcy5nZXREZWNvcmF0ZWRDbGFzc0Zyb21TeW1ib2wodGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbikpO1xuICAgICAgICAgIGlmIChkZWNvcmF0ZWRDbGFzcykge1xuICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKGRlY29yYXRlZENsYXNzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RhdGVtZW50KSkge1xuICAgICAgICBjb25zdCBkZWNvcmF0ZWRDbGFzcyA9IHRoaXMuZ2V0RGVjb3JhdGVkQ2xhc3NGcm9tU3ltYm9sKHRoaXMuZ2V0Q2xhc3NTeW1ib2woc3RhdGVtZW50KSk7XG4gICAgICAgIGlmIChkZWNvcmF0ZWRDbGFzcykge1xuICAgICAgICAgIGNsYXNzZXMucHVzaChkZWNvcmF0ZWRDbGFzcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gY2xhc3NlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG51bWJlciBvZiBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZiBhIGdpdmVuIGNsYXNzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhenogYSBgQ2xhc3NEZWNsYXJhdGlvbmAgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIHRoZSBudW1iZXIgb2YgdHlwZSBwYXJhbWV0ZXJzIG9mIHRoZSBjbGFzcywgaWYga25vd24sIG9yIGBudWxsYCBpZiB0aGUgZGVjbGFyYXRpb25cbiAgICogaXMgbm90IGEgY2xhc3Mgb3IgaGFzIGFuIHVua25vd24gbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycy5cbiAgICovXG4gIGdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBudW1iZXJ8bnVsbCB7XG4gICAgY29uc3QgZHRzRGVjbGFyYXRpb24gPSB0aGlzLmdldER0c0RlY2xhcmF0aW9uKGNsYXp6KTtcbiAgICBpZiAoZHRzRGVjbGFyYXRpb24gJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGR0c0RlY2xhcmF0aW9uKSkge1xuICAgICAgcmV0dXJuIGR0c0RlY2xhcmF0aW9uLnR5cGVQYXJhbWV0ZXJzID8gZHRzRGVjbGFyYXRpb24udHlwZVBhcmFtZXRlcnMubGVuZ3RoIDogMDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVGFrZSBhbiBleHBvcnRlZCBkZWNsYXJhdGlvbiBvZiBhIGNsYXNzIChtYXliZSBkb3duLWxldmVsZWQgdG8gYSB2YXJpYWJsZSkgYW5kIGxvb2sgdXAgdGhlXG4gICAqIGRlY2xhcmF0aW9uIG9mIGl0cyB0eXBlIGluIGEgc2VwYXJhdGUgLmQudHMgdHJlZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBpcyBhbGxvd2VkIHRvIHJldHVybiBgbnVsbGAgaWYgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCBkb2VzIG5vdCBoYXZlIGFcbiAgICogc2VwYXJhdGUgLmQudHMgdHJlZS4gV2hlbiBjb21waWxpbmcgVHlwZVNjcmlwdCBjb2RlIHRoaXMgaXMgYWx3YXlzIHRoZSBjYXNlLCBzaW5jZSAuZC50cyBmaWxlc1xuICAgKiBhcmUgcHJvZHVjZWQgb25seSBkdXJpbmcgdGhlIGVtaXQgb2Ygc3VjaCBhIGNvbXBpbGF0aW9uLiBXaGVuIGNvbXBpbGluZyAuanMgY29kZSwgaG93ZXZlcixcbiAgICogdGhlcmUgaXMgZnJlcXVlbnRseSBhIHBhcmFsbGVsIC5kLnRzIHRyZWUgd2hpY2ggdGhpcyBtZXRob2QgZXhwb3Nlcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgcmV0dXJuZWQgZnJvbSB0aGlzIGZ1bmN0aW9uIG1heSBub3QgYmUgZnJvbSB0aGUgc2FtZVxuICAgKiBgdHMuUHJvZ3JhbWAgYXMgdGhlIGlucHV0IGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0RHRzRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogdHMuRGVjbGFyYXRpb258bnVsbCB7XG4gICAgaWYgKCF0aGlzLmR0c0RlY2xhcmF0aW9uTWFwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKCFpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENhbm5vdCBnZXQgdGhlIGR0cyBmaWxlIGZvciBhIGRlY2xhcmF0aW9uIHRoYXQgaGFzIG5vIG5hbWU6ICR7ZGVjbGFyYXRpb24uZ2V0VGV4dCgpfSBpbiAke2RlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZHRzRGVjbGFyYXRpb25NYXAuZ2V0KGRlY2xhcmF0aW9uLm5hbWUudGV4dCkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGdpdmVuIHNvdXJjZSBmaWxlIGZvciBleHBvcnRlZCBmdW5jdGlvbnMgYW5kIHN0YXRpYyBjbGFzcyBtZXRob2RzIHRoYXQgcmV0dXJuXG4gICAqIE1vZHVsZVdpdGhQcm92aWRlcnMgb2JqZWN0cy5cbiAgICogQHBhcmFtIGYgVGhlIHNvdXJjZSBmaWxlIHRvIHNlYXJjaCBmb3IgdGhlc2UgZnVuY3Rpb25zXG4gICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGZ1bmN0aW9uIGRlY2xhcmF0aW9ucyB0aGF0IGxvb2sgbGlrZSB0aGV5IHJldHVybiBNb2R1bGVXaXRoUHJvdmlkZXJzXG4gICAqIG9iamVjdHMuXG4gICAqL1xuICBnZXRNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25zKGY6IHRzLlNvdXJjZUZpbGUpOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSB7XG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKGYpO1xuICAgIGlmICghZXhwb3J0cykgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGluZm9zOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb25bXSA9IFtdO1xuICAgIGV4cG9ydHMuZm9yRWFjaCgoZGVjbGFyYXRpb24sIG5hbWUpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzQ2xhc3MoZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgdGhpcy5nZXRNZW1iZXJzT2ZDbGFzcyhkZWNsYXJhdGlvbi5ub2RlKS5mb3JFYWNoKG1lbWJlciA9PiB7XG4gICAgICAgICAgaWYgKG1lbWJlci5pc1N0YXRpYykge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHRoaXMucGFyc2VGb3JNb2R1bGVXaXRoUHJvdmlkZXJzKFxuICAgICAgICAgICAgICAgIG1lbWJlci5uYW1lLCBtZW1iZXIubm9kZSwgbWVtYmVyLmltcGxlbWVudGF0aW9uLCBkZWNsYXJhdGlvbi5ub2RlKTtcbiAgICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICAgIGluZm9zLnB1c2goaW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc05hbWVkRGVjbGFyYXRpb24oZGVjbGFyYXRpb24ubm9kZSkpIHtcbiAgICAgICAgICBjb25zdCBpbmZvID1cbiAgICAgICAgICAgICAgdGhpcy5wYXJzZUZvck1vZHVsZVdpdGhQcm92aWRlcnMoZGVjbGFyYXRpb24ubm9kZS5uYW1lLnRleHQsIGRlY2xhcmF0aW9uLm5vZGUpO1xuICAgICAgICAgIGlmIChpbmZvKSB7XG4gICAgICAgICAgICBpbmZvcy5wdXNoKGluZm8pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBpbmZvcztcbiAgfVxuXG4gIC8vLy8vLy8vLy8vLy8gUHJvdGVjdGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG4gIHByb3RlY3RlZCBnZXREZWNvcmF0b3JzT2ZTeW1ib2woc3ltYm9sOiBDbGFzc1N5bWJvbCk6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IGRlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoc3ltYm9sLCBERUNPUkFUT1JTKTtcbiAgICBpZiAoZGVjb3JhdG9yc1Byb3BlcnR5KSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDbGFzc0RlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbUhlbHBlckNhbGwoc3ltYm9sKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RGVjb3JhdGVkQ2xhc3NGcm9tU3ltYm9sKHN5bWJvbDogQ2xhc3NTeW1ib2x8dW5kZWZpbmVkKTogRGVjb3JhdGVkQ2xhc3N8bnVsbCB7XG4gICAgaWYgKHN5bWJvbCkge1xuICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMuZ2V0RGVjb3JhdG9yc09mU3ltYm9sKHN5bWJvbCk7XG4gICAgICBpZiAoZGVjb3JhdG9ycyAmJiBkZWNvcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gbmV3IERlY29yYXRlZENsYXNzKHN5bWJvbC5uYW1lLCBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiwgZGVjb3JhdG9ycyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFdhbGsgdGhlIEFTVCBsb29raW5nIGZvciBhbiBhc3NpZ25tZW50IHRvIHRoZSBzcGVjaWZpZWQgc3ltYm9sLlxuICAgKiBAcGFyYW0gbm9kZSBUaGUgY3VycmVudCBub2RlIHdlIGFyZSBzZWFyY2hpbmcuXG4gICAqIEByZXR1cm5zIGFuIGV4cHJlc3Npb24gdGhhdCByZXByZXNlbnRzIHRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUsIG9yIHVuZGVmaW5lZCBpZiBub25lIGNhbiBiZVxuICAgKiBmb3VuZC5cbiAgICovXG4gIHByb3RlY3RlZCBmaW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShub2RlOiB0cy5Ob2RlfHVuZGVmaW5lZCwgc3ltYm9sOiB0cy5TeW1ib2wpOlxuICAgICAgdHMuQ2FsbEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiBub2RlLm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNUb2tlbikge1xuICAgICAgY29uc3QgbGVmdCA9IG5vZGUubGVmdDtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gbm9kZS5yaWdodDtcbiAgICAgIGlmICh0cy5pc0lkZW50aWZpZXIobGVmdCkgJiYgdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24obGVmdCkgPT09IHN5bWJvbCkge1xuICAgICAgICByZXR1cm4gKHRzLmlzQ2FsbEV4cHJlc3Npb24ocmlnaHQpICYmIGdldENhbGxlZU5hbWUocmlnaHQpID09PSAnX19kZWNvcmF0ZScpID8gcmlnaHQgOiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUocmlnaHQsIHN5bWJvbCk7XG4gICAgfVxuICAgIHJldHVybiBub2RlLmZvckVhY2hDaGlsZChub2RlID0+IHRoaXMuZmluZERlY29yYXRlZFZhcmlhYmxlVmFsdWUobm9kZSwgc3ltYm9sKSkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gcmV0cmlldmUgdGhlIHN5bWJvbCBvZiBhIHN0YXRpYyBwcm9wZXJ0eSBvbiBhIGNsYXNzLlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwcm9wZXJ0eSB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIHByb3BlcnR5TmFtZSB0aGUgbmFtZSBvZiBzdGF0aWMgcHJvcGVydHkuXG4gICAqIEByZXR1cm5zIHRoZSBzeW1ib2wgaWYgaXQgaXMgZm91bmQgb3IgYHVuZGVmaW5lZGAgaWYgbm90LlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRpY1Byb3BlcnR5KHN5bWJvbDogQ2xhc3NTeW1ib2wsIHByb3BlcnR5TmFtZTogdHMuX19TdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc3ltYm9sLmV4cG9ydHMgJiYgc3ltYm9sLmV4cG9ydHMuZ2V0KHByb3BlcnR5TmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBjbGFzcyBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MsIHdoZXJlIHRoZSBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZFxuICAgKiB2aWEgYSBzdGF0aWMgcHJvcGVydHkuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNTeW1ib2wgdGhlIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGRlY29yYXRvcnMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgb3IgbnVsbCBpZiBub25lIHdoZXJlIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzU3ltYm9sOiB0cy5TeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzSWRlbnRpZmllciA9IGRlY29yYXRvcnNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoZGVjb3JhdG9yc0lkZW50aWZpZXIgJiYgZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSB7XG4gICAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkgJiZcbiAgICAgICAgICBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICAgIC8vIEFTVCBvZiB0aGUgYXJyYXkgb2YgZGVjb3JhdG9yIHZhbHVlc1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzQXJyYXkgPSBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQucmlnaHQ7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheSlcbiAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBjbGFzcyBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MsIHdoZXJlIHRoZSBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZFxuICAgKiB2aWEgdGhlIGBfX2RlY29yYXRlYCBoZWxwZXIgbWV0aG9kLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBTb21lRGlyZWN0aXZlID0gY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlID0gX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIGNsYXNzIHdob3NlIGRlY29yYXRvcnMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgb3IgbnVsbCBpZiBub25lIHdoZXJlIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzRGVjb3JhdG9yc0Zyb21IZWxwZXJDYWxsKHN5bWJvbDogQ2xhc3NTeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSA9IFtdO1xuICAgIGNvbnN0IGhlbHBlckNhbGxzID0gdGhpcy5nZXRIZWxwZXJDYWxsc0ZvckNsYXNzKHN5bWJvbCwgJ19fZGVjb3JhdGUnKTtcbiAgICBoZWxwZXJDYWxscy5mb3JFYWNoKGhlbHBlckNhbGwgPT4ge1xuICAgICAgY29uc3Qge2NsYXNzRGVjb3JhdG9yc30gPVxuICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnNGcm9tSGVscGVyQ2FsbChoZWxwZXJDYWxsLCBtYWtlQ2xhc3NUYXJnZXRGaWx0ZXIoc3ltYm9sLm5hbWUpKTtcbiAgICAgIGNsYXNzRGVjb3JhdG9ycy5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKVxuICAgICAgICAgIC5mb3JFYWNoKGRlY29yYXRvciA9PiBkZWNvcmF0b3JzLnB1c2goZGVjb3JhdG9yKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlY29yYXRvcnMubGVuZ3RoID8gZGVjb3JhdG9ycyA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIHN5bWJvbCB3aGljaCBzaG91bGQgYmUgb2YgYSBjbGFzcywgYW5kIHJldHVybiBtZXRhZGF0YSBhYm91dCBpdHMgbWVtYmVycy5cbiAgICpcbiAgICogQHBhcmFtIHN5bWJvbCB0aGUgYENsYXNzU3ltYm9sYCByZXByZXNlbnRpbmcgdGhlIGNsYXNzIG92ZXIgd2hpY2ggdG8gcmVmbGVjdC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlcnNPZlN5bWJvbChzeW1ib2w6IENsYXNzU3ltYm9sKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuXG4gICAgLy8gVGhlIGRlY29yYXRvcnMgbWFwIGNvbnRhaW5zIGFsbCB0aGUgcHJvcGVydGllcyB0aGF0IGFyZSBkZWNvcmF0ZWRcbiAgICBjb25zdCBkZWNvcmF0b3JzTWFwID0gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzKHN5bWJvbCk7XG5cbiAgICAvLyBUaGUgbWVtYmVyIG1hcCBjb250YWlucyBhbGwgdGhlIG1ldGhvZCAoaW5zdGFuY2UgYW5kIHN0YXRpYyk7IGFuZCBhbnkgaW5zdGFuY2UgcHJvcGVydGllc1xuICAgIC8vIHRoYXQgYXJlIGluaXRpYWxpemVkIGluIHRoZSBjbGFzcy5cbiAgICBpZiAoc3ltYm9sLm1lbWJlcnMpIHtcbiAgICAgIHN5bWJvbC5tZW1iZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvcnNNYXAuZ2V0KGtleSBhcyBzdHJpbmcpO1xuICAgICAgICBjb25zdCByZWZsZWN0ZWRNZW1iZXJzID0gdGhpcy5yZWZsZWN0TWVtYmVycyh2YWx1ZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc01hcC5kZWxldGUoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgbWVtYmVycy5wdXNoKC4uLnJlZmxlY3RlZE1lbWJlcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBUaGUgc3RhdGljIHByb3BlcnR5IG1hcCBjb250YWlucyBhbGwgdGhlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgaWYgKHN5bWJvbC5leHBvcnRzKSB7XG4gICAgICBzeW1ib2wuZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JzTWFwLmdldChrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICBpZiAocmVmbGVjdGVkTWVtYmVycykge1xuICAgICAgICAgIGRlY29yYXRvcnNNYXAuZGVsZXRlKGtleSBhcyBzdHJpbmcpO1xuICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBjbGFzcyB3YXMgZGVjbGFyZWQgYXMgYSBWYXJpYWJsZURlY2xhcmF0aW9uIHRoZW4gaXQgbWF5IGhhdmUgc3RhdGljIHByb3BlcnRpZXNcbiAgICAvLyBhdHRhY2hlZCB0byB0aGUgdmFyaWFibGUgcmF0aGVyIHRoYW4gdGhlIGNsYXNzIGl0c2VsZlxuICAgIC8vIEZvciBleGFtcGxlOlxuICAgIC8vIGBgYFxuICAgIC8vIGxldCBNeUNsYXNzID0gY2xhc3MgTXlDbGFzcyB7XG4gICAgLy8gICAvLyBubyBzdGF0aWMgcHJvcGVydGllcyBoZXJlIVxuICAgIC8vIH1cbiAgICAvLyBNeUNsYXNzLnN0YXRpY1Byb3BlcnR5ID0gLi4uO1xuICAgIC8vIGBgYFxuICAgIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24ucGFyZW50KSkge1xuICAgICAgY29uc3QgdmFyaWFibGVTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihzeW1ib2wudmFsdWVEZWNsYXJhdGlvbi5wYXJlbnQubmFtZSk7XG4gICAgICBpZiAodmFyaWFibGVTeW1ib2wgJiYgdmFyaWFibGVTeW1ib2wuZXhwb3J0cykge1xuICAgICAgICB2YXJpYWJsZVN5bWJvbC5leHBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gZGVjb3JhdG9yc01hcC5nZXQoa2V5IGFzIHN0cmluZyk7XG4gICAgICAgICAgY29uc3QgcmVmbGVjdGVkTWVtYmVycyA9IHRoaXMucmVmbGVjdE1lbWJlcnModmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICAgIGlmIChyZWZsZWN0ZWRNZW1iZXJzKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3JzTWFwLmRlbGV0ZShrZXkgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIG1lbWJlcnMucHVzaCguLi5yZWZsZWN0ZWRNZW1iZXJzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERlYWwgd2l0aCBhbnkgZGVjb3JhdGVkIHByb3BlcnRpZXMgdGhhdCB3ZXJlIG5vdCBpbml0aWFsaXplZCBpbiB0aGUgY2xhc3NcbiAgICBkZWNvcmF0b3JzTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgIGltcGxlbWVudGF0aW9uOiBudWxsLFxuICAgICAgICBkZWNvcmF0b3JzOiB2YWx1ZSxcbiAgICAgICAgaXNTdGF0aWM6IGZhbHNlLFxuICAgICAgICBraW5kOiBDbGFzc01lbWJlcktpbmQuUHJvcGVydHksXG4gICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgbmFtZU5vZGU6IG51bGwsXG4gICAgICAgIG5vZGU6IG51bGwsXG4gICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgIHZhbHVlOiBudWxsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBtZW1iZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgdGhlIG1lbWJlciBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgbWVtYmVyIGRlY29yYXRvcnMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGEgbWFwIHdob3NlIGtleXMgYXJlIHRoZSBuYW1lIG9mIHRoZSBtZW1iZXJzIGFuZCB3aG9zZSB2YWx1ZXMgYXJlIGNvbGxlY3Rpb25zIG9mXG4gICAqIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyRGVjb3JhdG9ycyhjbGFzc1N5bWJvbDogQ2xhc3NTeW1ib2wpOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4ge1xuICAgIGNvbnN0IGRlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIFBST1BfREVDT1JBVE9SUyk7XG4gICAgaWYgKGRlY29yYXRvcnNQcm9wZXJ0eSkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0TWVtYmVyRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzUHJvcGVydHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWVtYmVyIGRlY29yYXRvcnMgbWF5IGJlIGRlY2xhcmVkIGFzIHN0YXRpYyBwcm9wZXJ0aWVzIG9mIHRoZSBjbGFzczpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gICAqICAgXCJuZ0Zvck9mXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVHJhY2tCeVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRlbXBsYXRlXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogfTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3JzUHJvcGVydHkgdGhlIGNsYXNzIHdob3NlIG1lbWJlciBkZWNvcmF0b3JzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhIG1hcCB3aG9zZSBrZXlzIGFyZSB0aGUgbmFtZSBvZiB0aGUgbWVtYmVycyBhbmQgd2hvc2UgdmFsdWVzIGFyZSBjb2xsZWN0aW9ucyBvZlxuICAgKiBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlckRlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOlxuICAgICAgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+IHtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuICAgIC8vIFN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBmb3IgYFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnNgLlxuICAgIGNvbnN0IHByb3BEZWNvcmF0b3JzTWFwID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2woZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICBpZiAocHJvcERlY29yYXRvcnNNYXAgJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wRGVjb3JhdG9yc01hcCkpIHtcbiAgICAgIGNvbnN0IHByb3BlcnRpZXNNYXAgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChwcm9wRGVjb3JhdG9yc01hcCk7XG4gICAgICBwcm9wZXJ0aWVzTWFwLmZvckVhY2goKHZhbHVlLCBuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgdGhpcy5yZWZsZWN0RGVjb3JhdG9ycyh2YWx1ZSkuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCkge1xuICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlckRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogTWVtYmVyIGRlY29yYXRvcnMgbWF5IGJlIGRlY2xhcmVkIHZpYSBoZWxwZXIgY2FsbCBzdGF0ZW1lbnRzLlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgICBJbnB1dCgpLFxuICAgKiAgICAgX19tZXRhZGF0YShcImRlc2lnbjp0eXBlXCIsIFN0cmluZylcbiAgICogXSwgU29tZURpcmVjdGl2ZS5wcm90b3R5cGUsIFwiaW5wdXQxXCIsIHZvaWQgMCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIG1lbWJlciBkZWNvcmF0b3JzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhIG1hcCB3aG9zZSBrZXlzIGFyZSB0aGUgbmFtZSBvZiB0aGUgbWVtYmVycyBhbmQgd2hvc2UgdmFsdWVzIGFyZSBjb2xsZWN0aW9ucyBvZlxuICAgKiBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gbWVtYmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldE1lbWJlckRlY29yYXRvcnNGcm9tSGVscGVyQ2FsbHMoY2xhc3NTeW1ib2w6IENsYXNzU3ltYm9sKTogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+IHtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JNYXAgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG4gICAgY29uc3QgaGVscGVyQ2FsbHMgPSB0aGlzLmdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2wsICdfX2RlY29yYXRlJyk7XG4gICAgaGVscGVyQ2FsbHMuZm9yRWFjaChoZWxwZXJDYWxsID0+IHtcbiAgICAgIGNvbnN0IHttZW1iZXJEZWNvcmF0b3JzfSA9IHRoaXMucmVmbGVjdERlY29yYXRvcnNGcm9tSGVscGVyQ2FsbChcbiAgICAgICAgICBoZWxwZXJDYWxsLCBtYWtlTWVtYmVyVGFyZ2V0RmlsdGVyKGNsYXNzU3ltYm9sLm5hbWUpKTtcbiAgICAgIG1lbWJlckRlY29yYXRvcnMuZm9yRWFjaCgoZGVjb3JhdG9ycywgbWVtYmVyTmFtZSkgPT4ge1xuICAgICAgICBpZiAobWVtYmVyTmFtZSkge1xuICAgICAgICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBtZW1iZXJEZWNvcmF0b3JNYXAuZ2V0KG1lbWJlck5hbWUpIHx8IFtdO1xuICAgICAgICAgIGNvbnN0IGNvcmVEZWNvcmF0b3JzID0gZGVjb3JhdG9ycy5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JNYXAuc2V0KG1lbWJlck5hbWUsIG1lbWJlckRlY29yYXRvcnMuY29uY2F0KGNvcmVEZWNvcmF0b3JzKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBtZW1iZXJEZWNvcmF0b3JNYXA7XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCBkZWNvcmF0b3IgaW5mbyBmcm9tIGBfX2RlY29yYXRlYCBoZWxwZXIgZnVuY3Rpb24gY2FsbHMuXG4gICAqIEBwYXJhbSBoZWxwZXJDYWxsIHRoZSBjYWxsIHRvIGEgaGVscGVyIHRoYXQgbWF5IGNvbnRhaW4gZGVjb3JhdG9yIGNhbGxzXG4gICAqIEBwYXJhbSB0YXJnZXRGaWx0ZXIgYSBmdW5jdGlvbiB0byBmaWx0ZXIgb3V0IHRhcmdldHMgdGhhdCB3ZSBhcmUgbm90IGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGEgbWFwcGluZyBmcm9tIG1lbWJlciBuYW1lIHRvIGRlY29yYXRvcnMsIHdoZXJlIHRoZSBrZXkgaXMgZWl0aGVyIHRoZSBuYW1lIG9mIHRoZVxuICAgKiBtZW1iZXIgb3IgYHVuZGVmaW5lZGAgaWYgaXQgcmVmZXJzIHRvIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzIGFzIGEgd2hvbGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVmbGVjdERlY29yYXRvcnNGcm9tSGVscGVyQ2FsbChcbiAgICAgIGhlbHBlckNhbGw6IHRzLkNhbGxFeHByZXNzaW9uLCB0YXJnZXRGaWx0ZXI6IFRhcmdldEZpbHRlcik6XG4gICAgICB7Y2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSwgbWVtYmVyRGVjb3JhdG9yczogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+fSB7XG4gICAgY29uc3QgY2xhc3NEZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSA9IFtdO1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG5cbiAgICAvLyBGaXJzdCBjaGVjayB0aGF0IHRoZSBgdGFyZ2V0YCBhcmd1bWVudCBpcyBjb3JyZWN0XG4gICAgaWYgKHRhcmdldEZpbHRlcihoZWxwZXJDYWxsLmFyZ3VtZW50c1sxXSkpIHtcbiAgICAgIC8vIEdyYWIgdGhlIGBkZWNvcmF0b3JzYCBhcmd1bWVudCB3aGljaCBzaG91bGQgYmUgYW4gYXJyYXkgb2YgY2FsbHNcbiAgICAgIGNvbnN0IGRlY29yYXRvckNhbGxzID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMF07XG4gICAgICBpZiAoZGVjb3JhdG9yQ2FsbHMgJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlY29yYXRvckNhbGxzKSkge1xuICAgICAgICBkZWNvcmF0b3JDYWxscy5lbGVtZW50cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICAgIC8vIFdlIG9ubHkgY2FyZSBhYm91dCB0aG9zZSBlbGVtZW50cyB0aGF0IGFyZSBhY3R1YWwgY2FsbHNcbiAgICAgICAgICBpZiAodHMuaXNDYWxsRXhwcmVzc2lvbihlbGVtZW50KSkge1xuICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9yID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yQ2FsbChlbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IpIHtcbiAgICAgICAgICAgICAgY29uc3Qga2V5QXJnID0gaGVscGVyQ2FsbC5hcmd1bWVudHNbMl07XG4gICAgICAgICAgICAgIGNvbnN0IGtleU5hbWUgPSBrZXlBcmcgJiYgdHMuaXNTdHJpbmdMaXRlcmFsKGtleUFyZykgPyBrZXlBcmcudGV4dCA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgaWYgKGtleU5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNsYXNzRGVjb3JhdG9ycy5wdXNoKGRlY29yYXRvcik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IG1lbWJlckRlY29yYXRvcnMuZ2V0KGtleU5hbWUpIHx8IFtdO1xuICAgICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KGtleU5hbWUsIGRlY29yYXRvcnMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtjbGFzc0RlY29yYXRvcnMsIG1lbWJlckRlY29yYXRvcnN9O1xuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3QgdGhlIGRlY29yYXRvciBpbmZvcm1hdGlvbiBmcm9tIGEgY2FsbCB0byBhIGRlY29yYXRvciBhcyBhIGZ1bmN0aW9uLlxuICAgKiBUaGlzIGhhcHBlbnMgd2hlbiB0aGUgZGVjb3JhdG9ycyBoYXMgYmVlbiB1c2VkIGluIGEgYF9fZGVjb3JhdGVgIGhlbHBlciBjYWxsLlxuICAgKiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIF9fZGVjb3JhdGUoW1xuICAgKiAgIERpcmVjdGl2ZSh7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9KSxcbiAgICogXSwgU29tZURpcmVjdGl2ZSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBIZXJlIHRoZSBgRGlyZWN0aXZlYCBkZWNvcmF0b3IgaXMgZGVjb3JhdGluZyBgU29tZURpcmVjdGl2ZWAgYW5kIHRoZSBvcHRpb25zIGZvclxuICAgKiB0aGUgZGVjb3JhdG9yIGFyZSBwYXNzZWQgYXMgYXJndW1lbnRzIHRvIHRoZSBgRGlyZWN0aXZlKClgIGNhbGwuXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsIHRoZSBjYWxsIHRvIHRoZSBkZWNvcmF0b3IuXG4gICAqIEByZXR1cm5zIGEgZGVjb3JhdG9yIGNvbnRhaW5pbmcgdGhlIHJlZmxlY3RlZCBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgY2FsbFxuICAgKiBpcyBub3QgYSB2YWxpZCBkZWNvcmF0b3IgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdG9yQ2FsbChjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbik6IERlY29yYXRvcnxudWxsIHtcbiAgICAvLyBUaGUgY2FsbCBjb3VsZCBiZSBvZiB0aGUgZm9ybSBgRGVjb3JhdG9yKC4uLilgIG9yIGBuYW1lc3BhY2VfMS5EZWNvcmF0b3IoLi4uKWBcbiAgICBjb25zdCBkZWNvcmF0b3JFeHByZXNzaW9uID1cbiAgICAgICAgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSA/IGNhbGwuZXhwcmVzc2lvbi5uYW1lIDogY2FsbC5leHByZXNzaW9uO1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZGVjb3JhdG9yRXhwcmVzc2lvbikpIHtcbiAgICAgIC8vIFdlIGZvdW5kIGEgZGVjb3JhdG9yIVxuICAgICAgY29uc3QgZGVjb3JhdG9ySWRlbnRpZmllciA9IGRlY29yYXRvckV4cHJlc3Npb247XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBkZWNvcmF0b3JJZGVudGlmaWVyLnRleHQsXG4gICAgICAgIGlkZW50aWZpZXI6IGRlY29yYXRvcklkZW50aWZpZXIsXG4gICAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjb3JhdG9ySWRlbnRpZmllciksXG4gICAgICAgIG5vZGU6IGNhbGwsXG4gICAgICAgIGFyZ3M6IEFycmF5LmZyb20oY2FsbC5hcmd1bWVudHMpXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB0aGUgZ2l2ZW4gc3RhdGVtZW50IHRvIHNlZSBpZiBpdCBpcyBhIGNhbGwgdG8gdGhlIHNwZWNpZmllZCBoZWxwZXIgZnVuY3Rpb24gb3IgbnVsbCBpZlxuICAgKiBub3QgZm91bmQuXG4gICAqXG4gICAqIE1hdGNoaW5nIHN0YXRlbWVudHMgd2lsbCBsb29rIGxpa2U6ICBgdHNsaWJfMS5fX2RlY29yYXRlKC4uLik7YC5cbiAgICogQHBhcmFtIHN0YXRlbWVudCB0aGUgc3RhdGVtZW50IHRoYXQgbWF5IGNvbnRhaW4gdGhlIGNhbGwuXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lIHRoZSBuYW1lIG9mIHRoZSBoZWxwZXIgd2UgYXJlIGxvb2tpbmcgZm9yLlxuICAgKiBAcmV0dXJucyB0aGUgbm9kZSB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSBgX19kZWNvcmF0ZSguLi4pYCBjYWxsIG9yIG51bGwgaWYgdGhlIHN0YXRlbWVudFxuICAgKiBkb2VzIG5vdCBtYXRjaC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsKHN0YXRlbWVudDogdHMuU3RhdGVtZW50LCBoZWxwZXJOYW1lOiBzdHJpbmcpOiB0cy5DYWxsRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAodHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkpIHtcbiAgICAgIGxldCBleHByZXNzaW9uID0gc3RhdGVtZW50LmV4cHJlc3Npb247XG4gICAgICB3aGlsZSAoaXNBc3NpZ25tZW50KGV4cHJlc3Npb24pKSB7XG4gICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnJpZ2h0O1xuICAgICAgfVxuICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgZ2V0Q2FsbGVlTmFtZShleHByZXNzaW9uKSA9PT0gaGVscGVyTmFtZSkge1xuICAgICAgICByZXR1cm4gZXhwcmVzc2lvbjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgZ2l2ZW4gYXJyYXkgbm9kZSBhbmQgZXh0cmFjdCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSBlYWNoIGVsZW1lbnQuXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCBmb3IgZGVjb3JhdG9ycyB0aGF0IGFyZSBkZWZpbmVkIGluIHN0YXRpYyBwcm9wZXJ0aWVzLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAgICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc0FycmF5IGFuIGV4cHJlc3Npb24gdGhhdCBjb250YWlucyBkZWNvcmF0b3IgaW5mb3JtYXRpb24uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvciBpbmZvIHRoYXQgd2FzIHJlZmxlY3RlZCBmcm9tIHRoZSBhcnJheSBub2RlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheTogdHMuRXhwcmVzc2lvbik6IERlY29yYXRvcltdIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSA9IFtdO1xuXG4gICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZWNvcmF0b3JzQXJyYXkpKSB7XG4gICAgICAvLyBBZGQgZWFjaCBkZWNvcmF0b3IgdGhhdCBpcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYCBpbnRvIHRoZSBgZGVjb3JhdG9yc2AgYXJyYXlcbiAgICAgIGRlY29yYXRvcnNBcnJheS5lbGVtZW50cy5mb3JFYWNoKG5vZGUgPT4ge1xuXG4gICAgICAgIC8vIElmIHRoZSBkZWNvcmF0b3IgaXMgbm90IGFuIG9iamVjdCBsaXRlcmFsIGV4cHJlc3Npb24gdGhlbiB3ZSBhcmUgbm90IGludGVyZXN0ZWRcbiAgICAgICAgaWYgKHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgICAgICAvLyBXZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIG9iamVjdHMgb2YgdGhlIGZvcm06IGB7IHR5cGU6IERlY29yYXRvclR5cGUsIGFyZ3M6IFsuLi5dIH1gXG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9yID0gcmVmbGVjdE9iamVjdExpdGVyYWwobm9kZSk7XG5cbiAgICAgICAgICAvLyBJcyB0aGUgdmFsdWUgb2YgdGhlIGB0eXBlYCBwcm9wZXJ0eSBhbiBpZGVudGlmaWVyP1xuICAgICAgICAgIGNvbnN0IHR5cGVJZGVudGlmaWVyID0gZGVjb3JhdG9yLmdldCgndHlwZScpO1xuICAgICAgICAgIGlmICh0eXBlSWRlbnRpZmllciAmJiB0cy5pc0lkZW50aWZpZXIodHlwZUlkZW50aWZpZXIpKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goe1xuICAgICAgICAgICAgICBuYW1lOiB0eXBlSWRlbnRpZmllci50ZXh0LFxuICAgICAgICAgICAgICBpZGVudGlmaWVyOiB0eXBlSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgaW1wb3J0OiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlSWRlbnRpZmllciksIG5vZGUsXG4gICAgICAgICAgICAgIGFyZ3M6IGdldERlY29yYXRvckFyZ3Mobm9kZSksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKlxuICAgKiBBIHNpbmdsZSBzeW1ib2wgbWF5IHJlcHJlc2VudCBtdWx0aXBsZSBjbGFzcyBtZW1iZXJzIGluIHRoZSBjYXNlIG9mIGFjY2Vzc29ycztcbiAgICogYW4gZXF1YWxseSBuYW1lZCBnZXR0ZXIvc2V0dGVyIGFjY2Vzc29yIHBhaXIgaXMgY29tYmluZWQgaW50byBhIHNpbmdsZSBzeW1ib2wuXG4gICAqIFdoZW4gdGhlIHN5bWJvbCBpcyByZWNvZ25pemVkIGFzIHJlcHJlc2VudGluZyBhbiBhY2Nlc3NvciwgaXRzIGRlY2xhcmF0aW9ucyBhcmVcbiAgICogYW5hbHl6ZWQgc3VjaCB0aGF0IGJvdGggdGhlIHNldHRlciBhbmQgZ2V0dGVyIGFjY2Vzc29yIGFyZSByZXR1cm5lZCBhcyBzZXBhcmF0ZVxuICAgKiBjbGFzcyBtZW1iZXJzLlxuICAgKlxuICAgKiBPbmUgZGlmZmVyZW5jZSB3cnQgdGhlIFR5cGVTY3JpcHQgaG9zdCBpcyB0aGF0IGluIEVTMjAxNSwgd2UgY2Fubm90IHNlZSB3aGljaFxuICAgKiBhY2Nlc3NvciBvcmlnaW5hbGx5IGhhZCBhbnkgZGVjb3JhdG9ycyBhcHBsaWVkIHRvIHRoZW0sIGFzIGRlY29yYXRvcnMgYXJlIGFwcGxpZWRcbiAgICogdG8gdGhlIHByb3BlcnR5IGRlc2NyaXB0b3IgaW4gZ2VuZXJhbCwgbm90IGEgc3BlY2lmaWMgYWNjZXNzb3IuIElmIGFuIGFjY2Vzc29yXG4gICAqIGhhcyBib3RoIGEgc2V0dGVyIGFuZCBnZXR0ZXIsIGFueSBkZWNvcmF0b3JzIGFyZSBvbmx5IGF0dGFjaGVkIHRvIHRoZSBzZXR0ZXIgbWVtYmVyLlxuICAgKlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVycyhzeW1ib2w6IHRzLlN5bWJvbCwgZGVjb3JhdG9ycz86IERlY29yYXRvcltdLCBpc1N0YXRpYz86IGJvb2xlYW4pOlxuICAgICAgQ2xhc3NNZW1iZXJbXXxudWxsIHtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWNjZXNzb3IpIHtcbiAgICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICAgIGNvbnN0IHNldHRlciA9IHN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgc3ltYm9sLmRlY2xhcmF0aW9ucy5maW5kKHRzLmlzU2V0QWNjZXNzb3IpO1xuICAgICAgY29uc3QgZ2V0dGVyID0gc3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBzeW1ib2wuZGVjbGFyYXRpb25zLmZpbmQodHMuaXNHZXRBY2Nlc3Nvcik7XG5cbiAgICAgIGNvbnN0IHNldHRlck1lbWJlciA9XG4gICAgICAgICAgc2V0dGVyICYmIHRoaXMucmVmbGVjdE1lbWJlcihzZXR0ZXIsIENsYXNzTWVtYmVyS2luZC5TZXR0ZXIsIGRlY29yYXRvcnMsIGlzU3RhdGljKTtcbiAgICAgIGlmIChzZXR0ZXJNZW1iZXIpIHtcbiAgICAgICAgbWVtYmVycy5wdXNoKHNldHRlck1lbWJlcik7XG5cbiAgICAgICAgLy8gUHJldmVudCBhdHRhY2hpbmcgdGhlIGRlY29yYXRvcnMgdG8gYSBwb3RlbnRpYWwgZ2V0dGVyLiBJbiBFUzIwMTUsIHdlIGNhbid0IHRlbGwgd2hlcmVcbiAgICAgICAgLy8gdGhlIGRlY29yYXRvcnMgd2VyZSBvcmlnaW5hbGx5IGF0dGFjaGVkIHRvLCBob3dldmVyIHdlIG9ubHkgd2FudCB0byBhdHRhY2ggdGhlbSB0byBhXG4gICAgICAgIC8vIHNpbmdsZSBgQ2xhc3NNZW1iZXJgIGFzIG90aGVyd2lzZSBuZ3RzYyB3b3VsZCBoYW5kbGUgdGhlIHNhbWUgZGVjb3JhdG9ycyB0d2ljZS5cbiAgICAgICAgZGVjb3JhdG9ycyA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZ2V0dGVyTWVtYmVyID1cbiAgICAgICAgICBnZXR0ZXIgJiYgdGhpcy5yZWZsZWN0TWVtYmVyKGdldHRlciwgQ2xhc3NNZW1iZXJLaW5kLkdldHRlciwgZGVjb3JhdG9ycywgaXNTdGF0aWMpO1xuICAgICAgaWYgKGdldHRlck1lbWJlcikge1xuICAgICAgICBtZW1iZXJzLnB1c2goZ2V0dGVyTWVtYmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1lbWJlcnM7XG4gICAgfVxuXG4gICAgbGV0IGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsID0gbnVsbDtcbiAgICBpZiAoc3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuTWV0aG9kKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZDtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLlByb3BlcnR5KSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGUgPSBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiB8fCBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICAvLyBJZiB0aGUgc3ltYm9sIGhhcyBiZWVuIGltcG9ydGVkIGZyb20gYSBUeXBlU2NyaXB0IHR5cGluZ3MgZmlsZSB0aGVuIHRoZSBjb21waWxlclxuICAgICAgLy8gbWF5IHBhc3MgdGhlIGBwcm90b3R5cGVgIHN5bWJvbCBhcyBhbiBleHBvcnQgb2YgdGhlIGNsYXNzLlxuICAgICAgLy8gQnV0IHRoaXMgaGFzIG5vIGRlY2xhcmF0aW9uLiBJbiB0aGlzIGNhc2Ugd2UganVzdCBxdWlldGx5IGlnbm9yZSBpdC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbWJlciA9IHRoaXMucmVmbGVjdE1lbWJlcihub2RlLCBraW5kLCBkZWNvcmF0b3JzLCBpc1N0YXRpYyk7XG4gICAgaWYgKCFtZW1iZXIpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBbbWVtYmVyXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKiBAcGFyYW0gbm9kZSB0aGUgZGVjbGFyYXRpb24gbm9kZSBmb3IgdGhlIG1lbWJlciB0byByZWZsZWN0IG92ZXIuXG4gICAqIEBwYXJhbSBraW5kIHRoZSBhc3N1bWVkIGtpbmQgb2YgdGhlIG1lbWJlciwgbWF5IGJlY29tZSBtb3JlIGFjY3VyYXRlIGR1cmluZyByZWZsZWN0aW9uLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVyKFxuICAgICAgbm9kZTogdHMuRGVjbGFyYXRpb24sIGtpbmQ6IENsYXNzTWVtYmVyS2luZHxudWxsLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sXG4gICAgICBpc1N0YXRpYz86IGJvb2xlYW4pOiBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQgdmFsdWU6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgbGV0IG5hbWU6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZU5vZGU6IHRzLklkZW50aWZpZXJ8bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoIWlzQ2xhc3NNZW1iZXJUeXBlKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoaXNTdGF0aWMgJiYgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBraW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHkgPyBub2RlLnBhcmVudC5yaWdodCA6IG51bGw7XG4gICAgfSBlbHNlIGlmIChpc1RoaXNBc3NpZ25tZW50KG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xuICAgICAgbmFtZSA9IG5vZGUubGVmdC5uYW1lLnRleHQ7XG4gICAgICB2YWx1ZSA9IG5vZGUucmlnaHQ7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkNvbnN0cnVjdG9yO1xuICAgICAgbmFtZSA9ICdjb25zdHJ1Y3Rvcic7XG4gICAgICBpc1N0YXRpYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChraW5kID09PSBudWxsKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFVua25vd24gbWVtYmVyIHR5cGU6IFwiJHtub2RlLmdldFRleHQoKX1gKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICghbmFtZSkge1xuICAgICAgaWYgKGlzTmFtZWREZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICBuYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgICAgIG5hbWVOb2RlID0gbm9kZS5uYW1lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgaGF2ZSBzdGlsbCBub3QgZGV0ZXJtaW5lZCBpZiB0aGlzIGlzIGEgc3RhdGljIG9yIGluc3RhbmNlIG1lbWJlciB0aGVuXG4gICAgLy8gbG9vayBmb3IgdGhlIGBzdGF0aWNgIGtleXdvcmQgb24gdGhlIGRlY2xhcmF0aW9uXG4gICAgaWYgKGlzU3RhdGljID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlzU3RhdGljID0gbm9kZS5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIG5vZGUubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGU6IHRzLlR5cGVOb2RlID0gKG5vZGUgYXMgYW55KS50eXBlIHx8IG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5vZGUsXG4gICAgICBpbXBsZW1lbnRhdGlvbjogbm9kZSwga2luZCwgdHlwZSwgbmFtZSwgbmFtZU5vZGUsIHZhbHVlLCBpc1N0YXRpYyxcbiAgICAgIGRlY29yYXRvcnM6IGRlY29yYXRvcnMgfHwgW11cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgdGhlIGRlY2xhcmF0aW9ucyBvZiB0aGUgY29uc3RydWN0b3IgcGFyYW1ldGVycyBvZiBhIGNsYXNzIGlkZW50aWZpZWQgYnkgaXRzIHN5bWJvbC5cbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBwYXJhbWV0ZXJzIHdlIHdhbnQgdG8gZmluZC5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uYCBvYmplY3RzIHJlcHJlc2VudGluZyBlYWNoIG9mIHRoZSBwYXJhbWV0ZXJzIGluXG4gICAqIHRoZSBjbGFzcydzIGNvbnN0cnVjdG9yIG9yIG51bGwgaWYgdGhlcmUgaXMgbm8gY29uc3RydWN0b3IuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2w6IENsYXNzU3ltYm9sKTpcbiAgICAgIHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uW118bnVsbCB7XG4gICAgY29uc3QgY29uc3RydWN0b3JTeW1ib2wgPSBjbGFzc1N5bWJvbC5tZW1iZXJzICYmIGNsYXNzU3ltYm9sLm1lbWJlcnMuZ2V0KENPTlNUUlVDVE9SKTtcbiAgICBpZiAoY29uc3RydWN0b3JTeW1ib2wpIHtcbiAgICAgIC8vIEZvciBzb21lIHJlYXNvbiB0aGUgY29uc3RydWN0b3IgZG9lcyBub3QgaGF2ZSBhIGB2YWx1ZURlY2xhcmF0aW9uYCA/IT9cbiAgICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zICYmXG4gICAgICAgICAgY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zWzBdIGFzIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb24gfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoIWNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cbiAgICAgIGlmIChjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20oY29uc3RydWN0b3IucGFyYW1ldGVycyk7XG4gICAgICB9XG4gICAgICBpZiAoaXNTeW50aGVzaXplZENvbnN0cnVjdG9yKGNvbnN0cnVjdG9yKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgZGVjb3JhdG9ycyBvZiBhIGNsYXNzIGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcGFyYW0gcGFyYW1ldGVyTm9kZXMgdGhlIGFycmF5IG9mIFR5cGVTY3JpcHQgcGFyYW1ldGVyIG5vZGVzIGZvciB0aGlzIGNsYXNzJ3MgY29uc3RydWN0b3IuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGNvbnN0cnVjdG9yIHBhcmFtZXRlciBpbmZvIG9iamVjdHMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbUluZm8oXG4gICAgICBjbGFzc1N5bWJvbDogQ2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdKTogQ3RvclBhcmFtZXRlcltdIHtcbiAgICBjb25zdCBwYXJhbXNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIENPTlNUUlVDVE9SX1BBUkFNUyk7XG4gICAgY29uc3QgcGFyYW1JbmZvOiBQYXJhbUluZm9bXXxudWxsID0gcGFyYW1zUHJvcGVydHkgP1xuICAgICAgICB0aGlzLmdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbXNQcm9wZXJ0eSkgOlxuICAgICAgICB0aGlzLmdldFBhcmFtSW5mb0Zyb21IZWxwZXJDYWxsKGNsYXNzU3ltYm9sLCBwYXJhbWV0ZXJOb2Rlcyk7XG5cbiAgICByZXR1cm4gcGFyYW1ldGVyTm9kZXMubWFwKChub2RlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3Qge2RlY29yYXRvcnMsIHR5cGVFeHByZXNzaW9ufSA9IHBhcmFtSW5mbyAmJiBwYXJhbUluZm9baW5kZXhdID9cbiAgICAgICAgICBwYXJhbUluZm9baW5kZXhdIDpcbiAgICAgICAgICB7ZGVjb3JhdG9yczogbnVsbCwgdHlwZUV4cHJlc3Npb246IG51bGx9O1xuICAgICAgY29uc3QgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBnZXROYW1lVGV4dChuYW1lTm9kZSksXG4gICAgICAgIG5hbWVOb2RlLFxuICAgICAgICB0eXBlVmFsdWVSZWZlcmVuY2U6IHR5cGVFeHByZXNzaW9uICE9PSBudWxsID9cbiAgICAgICAgICAgIHtsb2NhbDogdHJ1ZSBhcyB0cnVlLCBleHByZXNzaW9uOiB0eXBlRXhwcmVzc2lvbiwgZGVmYXVsdEltcG9ydFN0YXRlbWVudDogbnVsbH0gOlxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgdHlwZU5vZGU6IG51bGwsIGRlY29yYXRvcnNcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MsXG4gICAqIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgb24gYSBzdGF0aWMgbWV0aG9kIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IGluIEVTTTIwMTUsIHRoZSBtZXRob2QgaXMgZGVmaW5lZCBieSBhbiBhcnJvdyBmdW5jdGlvbiB0aGF0IHJldHVybnMgYW4gYXJyYXkgb2ZcbiAgICogZGVjb3JhdG9yIGFuZCB0eXBlIGluZm9ybWF0aW9uLlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAgICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAgICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSB0aGUgcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyB0aGUgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgZWFjaCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOiBQYXJhbUluZm9bXXxudWxsIHtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnMgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHBhcmFtRGVjb3JhdG9ycyAmJiB0cy5pc0Fycm93RnVuY3Rpb24ocGFyYW1EZWNvcmF0b3JzKSkge1xuICAgICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihwYXJhbURlY29yYXRvcnMuYm9keSkpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSBwYXJhbURlY29yYXRvcnMuYm9keS5lbGVtZW50cztcbiAgICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbClcbiAgICAgICAgICAgIC5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgdHlwZUV4cHJlc3Npb24gPSBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmdldCgndHlwZScpIHx8IG51bGw7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPSBwYXJhbUluZm8gJiYgcGFyYW1JbmZvLmdldCgnZGVjb3JhdG9ycycpIHx8IG51bGw7XG4gICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSBkZWNvcmF0b3JJbmZvICYmXG4gICAgICAgICAgICAgICAgICB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvckluZm8pXG4gICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgICAgICAgICByZXR1cm4ge3R5cGVFeHByZXNzaW9uLCBkZWNvcmF0b3JzfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciBhIGNsYXNzIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgdmlhXG4gICAqIGNhbGxzIHRvIGBfX2RlY29yYXRlYCBoZWxwZXJzLlxuICAgKlxuICAgKiBSZWZsZWN0IG92ZXIgdGhlIGhlbHBlcnMgdG8gZmluZCB0aGUgZGVjb3JhdG9ycyBhbmQgdHlwZXMgYWJvdXQgZWFjaCBvZlxuICAgKiB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIHBhcmFtZXRlciBpbmZvIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcGFyYW0gcGFyYW1ldGVyTm9kZXMgdGhlIGFycmF5IG9mIFR5cGVTY3JpcHQgcGFyYW1ldGVyIG5vZGVzIGZvciB0aGlzIGNsYXNzJ3MgY29uc3RydWN0b3IuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyB0aGUgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgZWFjaCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0UGFyYW1JbmZvRnJvbUhlbHBlckNhbGwoXG4gICAgICBjbGFzc1N5bWJvbDogQ2xhc3NTeW1ib2wsIHBhcmFtZXRlck5vZGVzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdKTogUGFyYW1JbmZvW10ge1xuICAgIGNvbnN0IHBhcmFtZXRlcnM6IFBhcmFtSW5mb1tdID1cbiAgICAgICAgcGFyYW1ldGVyTm9kZXMubWFwKCgpID0+ICh7dHlwZUV4cHJlc3Npb246IG51bGwsIGRlY29yYXRvcnM6IG51bGx9KSk7XG4gICAgY29uc3QgaGVscGVyQ2FsbHMgPSB0aGlzLmdldEhlbHBlckNhbGxzRm9yQ2xhc3MoY2xhc3NTeW1ib2wsICdfX2RlY29yYXRlJyk7XG4gICAgaGVscGVyQ2FsbHMuZm9yRWFjaChoZWxwZXJDYWxsID0+IHtcbiAgICAgIGNvbnN0IHtjbGFzc0RlY29yYXRvcnN9ID1cbiAgICAgICAgICB0aGlzLnJlZmxlY3REZWNvcmF0b3JzRnJvbUhlbHBlckNhbGwoaGVscGVyQ2FsbCwgbWFrZUNsYXNzVGFyZ2V0RmlsdGVyKGNsYXNzU3ltYm9sLm5hbWUpKTtcbiAgICAgIGNsYXNzRGVjb3JhdG9ycy5mb3JFYWNoKGNhbGwgPT4ge1xuICAgICAgICBzd2l0Y2ggKGNhbGwubmFtZSkge1xuICAgICAgICAgIGNhc2UgJ19fbWV0YWRhdGEnOlxuICAgICAgICAgICAgY29uc3QgbWV0YWRhdGFBcmcgPSBjYWxsLmFyZ3MgJiYgY2FsbC5hcmdzWzBdO1xuICAgICAgICAgICAgY29uc3QgdHlwZXNBcmcgPSBjYWxsLmFyZ3MgJiYgY2FsbC5hcmdzWzFdO1xuICAgICAgICAgICAgY29uc3QgaXNQYXJhbVR5cGVEZWNvcmF0b3IgPSBtZXRhZGF0YUFyZyAmJiB0cy5pc1N0cmluZ0xpdGVyYWwobWV0YWRhdGFBcmcpICYmXG4gICAgICAgICAgICAgICAgbWV0YWRhdGFBcmcudGV4dCA9PT0gJ2Rlc2lnbjpwYXJhbXR5cGVzJztcbiAgICAgICAgICAgIGNvbnN0IHR5cGVzID0gdHlwZXNBcmcgJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHR5cGVzQXJnKSAmJiB0eXBlc0FyZy5lbGVtZW50cztcbiAgICAgICAgICAgIGlmIChpc1BhcmFtVHlwZURlY29yYXRvciAmJiB0eXBlcykge1xuICAgICAgICAgICAgICB0eXBlcy5mb3JFYWNoKCh0eXBlLCBpbmRleCkgPT4gcGFyYW1ldGVyc1tpbmRleF0udHlwZUV4cHJlc3Npb24gPSB0eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ19fcGFyYW0nOlxuICAgICAgICAgICAgY29uc3QgcGFyYW1JbmRleEFyZyA9IGNhbGwuYXJncyAmJiBjYWxsLmFyZ3NbMF07XG4gICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JDYWxsQXJnID0gY2FsbC5hcmdzICYmIGNhbGwuYXJnc1sxXTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtSW5kZXggPSBwYXJhbUluZGV4QXJnICYmIHRzLmlzTnVtZXJpY0xpdGVyYWwocGFyYW1JbmRleEFyZykgP1xuICAgICAgICAgICAgICAgIHBhcnNlSW50KHBhcmFtSW5kZXhBcmcudGV4dCwgMTApIDpcbiAgICAgICAgICAgICAgICBOYU47XG4gICAgICAgICAgICBjb25zdCBkZWNvcmF0b3IgPSBkZWNvcmF0b3JDYWxsQXJnICYmIHRzLmlzQ2FsbEV4cHJlc3Npb24oZGVjb3JhdG9yQ2FsbEFyZykgP1xuICAgICAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvckNhbGwoZGVjb3JhdG9yQ2FsbEFyZykgOlxuICAgICAgICAgICAgICAgIG51bGw7XG4gICAgICAgICAgICBpZiAoIWlzTmFOKHBhcmFtSW5kZXgpICYmIGRlY29yYXRvcikge1xuICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gcGFyYW1ldGVyc1twYXJhbUluZGV4XS5kZWNvcmF0b3JzID1cbiAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnNbcGFyYW1JbmRleF0uZGVjb3JhdG9ycyB8fCBbXTtcbiAgICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKGRlY29yYXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHBhcmFtZXRlcnM7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgZm9yIGNhbGxzIHRvIHRoZSBzcGVjaWZpZWQgaGVscGVyLlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHBhcmFtIGhlbHBlck5hbWUgdGhlIG5hbWUgb2YgdGhlIGhlbHBlciAoZS5nLiBgX19kZWNvcmF0ZWApIHdob3NlIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkXG4gICAqIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBDYWxsRXhwcmVzc2lvbiBub2RlcyBmb3IgZWFjaCBtYXRjaGluZyBoZWxwZXIgY2FsbC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRIZWxwZXJDYWxsc0ZvckNsYXNzKGNsYXNzU3ltYm9sOiBDbGFzc1N5bWJvbCwgaGVscGVyTmFtZTogc3RyaW5nKTpcbiAgICAgIHRzLkNhbGxFeHByZXNzaW9uW10ge1xuICAgIHJldHVybiB0aGlzLmdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbClcbiAgICAgICAgLm1hcChzdGF0ZW1lbnQgPT4gdGhpcy5nZXRIZWxwZXJDYWxsKHN0YXRlbWVudCwgaGVscGVyTmFtZSkpXG4gICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHN0YXRlbWVudHMgcmVsYXRlZCB0byB0aGUgZ2l2ZW4gY2xhc3MgdGhhdCBtYXkgY29udGFpbiBjYWxscyB0byBhIGhlbHBlci5cbiAgICpcbiAgICogSW4gRVNNMjAxNSBjb2RlIHRoZSBoZWxwZXIgY2FsbHMgYXJlIGluIHRoZSB0b3AgbGV2ZWwgbW9kdWxlLCBzbyB3ZSBoYXZlIHRvIGNvbnNpZGVyXG4gICAqIGFsbCB0aGUgc3RhdGVtZW50cyBpbiB0aGUgbW9kdWxlLlxuICAgKlxuICAgKiBAcGFyYW0gY2xhc3NTeW1ib2wgdGhlIGNsYXNzIHdob3NlIGhlbHBlciBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygc3RhdGVtZW50cyB0aGF0IG1heSBjb250YWluIGhlbHBlciBjYWxscy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRTdGF0ZW1lbnRzRm9yQ2xhc3MoY2xhc3NTeW1ib2w6IENsYXNzU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLnN0YXRlbWVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byBnZXQgdGhlIGltcG9ydCBpbmZvIGZvciB0aGlzIGlkZW50aWZpZXIgYXMgdGhvdWdoIGl0IGlzIGEgbmFtZXNwYWNlZCBpbXBvcnQuXG4gICAqIEZvciBleGFtcGxlLCBpZiB0aGUgaWRlbnRpZmllciBpcyB0aGUgYF9fbWV0YWRhdGFgIHBhcnQgb2YgYSBwcm9wZXJ0eSBhY2Nlc3MgY2hhaW4gbGlrZTpcbiAgICpcbiAgICogYGBgXG4gICAqIHRzbGliXzEuX19tZXRhZGF0YVxuICAgKiBgYGBcbiAgICpcbiAgICogdGhlbiBpdCBtaWdodCBiZSB0aGF0IGB0c2xpYl8xYCBpcyBhIG5hbWVzcGFjZSBpbXBvcnQgc3VjaCBhczpcbiAgICpcbiAgICogYGBgXG4gICAqIGltcG9ydCAqIGFzIHRzbGliXzEgZnJvbSAndHNsaWInO1xuICAgKiBgYGBcbiAgICogQHBhcmFtIGlkIHRoZSBUeXBlU2NyaXB0IGlkZW50aWZpZXIgdG8gZmluZCB0aGUgaW1wb3J0IGluZm8gZm9yLlxuICAgKiBAcmV0dXJucyBUaGUgaW1wb3J0IGluZm8gaWYgdGhpcyBpcyBhIG5hbWVzcGFjZWQgaW1wb3J0IG9yIGBudWxsYC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRJbXBvcnRPZk5hbWVzcGFjZWRJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIGlmICghKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGlkLnBhcmVudCkgJiYgaWQucGFyZW50Lm5hbWUgPT09IGlkKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZXNwYWNlSWRlbnRpZmllciA9IGdldEZhckxlZnRJZGVudGlmaWVyKGlkLnBhcmVudCk7XG4gICAgY29uc3QgbmFtZXNwYWNlU3ltYm9sID1cbiAgICAgICAgbmFtZXNwYWNlSWRlbnRpZmllciAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihuYW1lc3BhY2VJZGVudGlmaWVyKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IG5hbWVzcGFjZVN5bWJvbCAmJiBuYW1lc3BhY2VTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSA/XG4gICAgICAgIG5hbWVzcGFjZVN5bWJvbC5kZWNsYXJhdGlvbnNbMF0gOlxuICAgICAgICBudWxsO1xuICAgIGNvbnN0IG5hbWVzcGFjZURlY2xhcmF0aW9uID1cbiAgICAgICAgZGVjbGFyYXRpb24gJiYgdHMuaXNOYW1lc3BhY2VJbXBvcnQoZGVjbGFyYXRpb24pID8gZGVjbGFyYXRpb24gOiBudWxsO1xuICAgIGlmICghbmFtZXNwYWNlRGVjbGFyYXRpb24pIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydERlY2xhcmF0aW9uID0gbmFtZXNwYWNlRGVjbGFyYXRpb24ucGFyZW50LnBhcmVudDtcbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsYXJhdGlvbi5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAvLyBTaG91bGQgbm90IGhhcHBlbiBhcyB0aGlzIHdvdWxkIGJlIGludmFsaWQgVHlwZXNTY3JpcHRcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBmcm9tOiBpbXBvcnREZWNsYXJhdGlvbi5tb2R1bGVTcGVjaWZpZXIudGV4dCxcbiAgICAgIG5hbWU6IGlkLnRleHQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZXN0IHdoZXRoZXIgYSBkZWNvcmF0b3Igd2FzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgLlxuICAgKlxuICAgKiBJcyB0aGUgZGVjb3JhdG9yOlxuICAgKiAqIGV4dGVybmFsbHkgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXIvY29yZWA/XG4gICAqICogdGhlIGN1cnJlbnQgaG9zdGVkIHByb2dyYW0gaXMgYWN0dWFsbHkgYEBhbmd1bGFyL2NvcmVgIGFuZFxuICAgKiAgIC0gcmVsYXRpdmVseSBpbnRlcm5hbGx5IGltcG9ydGVkOyBvclxuICAgKiAgIC0gbm90IGltcG9ydGVkLCBmcm9tIHRoZSBjdXJyZW50IGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBkZWNvcmF0b3IgdGhlIGRlY29yYXRvciB0byB0ZXN0LlxuICAgKi9cbiAgcHJvdGVjdGVkIGlzRnJvbUNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5pc0NvcmUpIHtcbiAgICAgIHJldHVybiAhZGVjb3JhdG9yLmltcG9ydCB8fCAvXlxcLi8udGVzdChkZWNvcmF0b3IuaW1wb3J0LmZyb20pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gISFkZWNvcmF0b3IuaW1wb3J0ICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGFsbCB0aGUgY2xhc3MgZGVjbGFyYXRpb25zIGZyb20gdGhlIGR0c1R5cGluZ3MgcHJvZ3JhbSwgc3RvcmluZyB0aGVtIGluIGEgbWFwXG4gICAqIHdoZXJlIHRoZSBrZXkgaXMgdGhlIGRlY2xhcmVkIG5hbWUgb2YgdGhlIGNsYXNzIGFuZCB0aGUgdmFsdWUgaXMgdGhlIGRlY2xhcmF0aW9uIGl0c2VsZi5cbiAgICpcbiAgICogSXQgaXMgcG9zc2libGUgZm9yIHRoZXJlIHRvIGJlIG11bHRpcGxlIGNsYXNzIGRlY2xhcmF0aW9ucyB3aXRoIHRoZSBzYW1lIGxvY2FsIG5hbWUuXG4gICAqIE9ubHkgdGhlIGZpcnN0IGRlY2xhcmF0aW9uIHdpdGggYSBnaXZlbiBuYW1lIGlzIGFkZGVkIHRvIHRoZSBtYXA7IHN1YnNlcXVlbnQgY2xhc3NlcyB3aWxsIGJlXG4gICAqIGlnbm9yZWQuXG4gICAqXG4gICAqIFdlIGFyZSBtb3N0IGludGVyZXN0ZWQgaW4gY2xhc3NlcyB0aGF0IGFyZSBwdWJsaWNseSBleHBvcnRlZCBmcm9tIHRoZSBlbnRyeSBwb2ludCwgc28gdGhlc2VcbiAgICogYXJlIGFkZGVkIHRvIHRoZSBtYXAgZmlyc3QsIHRvIGVuc3VyZSB0aGF0IHRoZXkgYXJlIG5vdCBpZ25vcmVkLlxuICAgKlxuICAgKiBAcGFyYW0gZHRzUm9vdEZpbGVOYW1lIFRoZSBmaWxlbmFtZSBvZiB0aGUgZW50cnktcG9pbnQgdG8gdGhlIGBkdHNUeXBpbmdzYCBwcm9ncmFtLlxuICAgKiBAcGFyYW0gZHRzUHJvZ3JhbSBUaGUgcHJvZ3JhbSBjb250YWluaW5nIGFsbCB0aGUgdHlwaW5ncyBmaWxlcy5cbiAgICogQHJldHVybnMgYSBtYXAgb2YgY2xhc3MgbmFtZXMgdG8gY2xhc3MgZGVjbGFyYXRpb25zLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEdHNEZWNsYXJhdGlvbk1hcChkdHNSb290RmlsZU5hbWU6IHN0cmluZywgZHRzUHJvZ3JhbTogdHMuUHJvZ3JhbSk6XG4gICAgICBNYXA8c3RyaW5nLCB0cy5EZWNsYXJhdGlvbj4ge1xuICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uTWFwID0gbmV3IE1hcDxzdHJpbmcsIHRzLkRlY2xhcmF0aW9uPigpO1xuICAgIGNvbnN0IGNoZWNrZXIgPSBkdHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICAvLyBGaXJzdCBhZGQgYWxsIHRoZSBjbGFzc2VzIHRoYXQgYXJlIHB1YmxpY2x5IGV4cG9ydGVkIGZyb20gdGhlIGVudHJ5LXBvaW50XG4gICAgY29uc3Qgcm9vdEZpbGUgPSBkdHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZHRzUm9vdEZpbGVOYW1lKTtcbiAgICBpZiAoIXJvb3RGaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBnaXZlbiBmaWxlICR7ZHRzUm9vdEZpbGVOYW1lfSBpcyBub3QgcGFydCBvZiB0aGUgdHlwaW5ncyBwcm9ncmFtLmApO1xuICAgIH1cbiAgICBjb2xsZWN0RXhwb3J0ZWREZWNsYXJhdGlvbnMoY2hlY2tlciwgZHRzRGVjbGFyYXRpb25NYXAsIHJvb3RGaWxlKTtcblxuICAgIC8vIE5vdyBhZGQgYW55IGFkZGl0aW9uYWwgY2xhc3NlcyB0aGF0IGFyZSBleHBvcnRlZCBmcm9tIGluZGl2aWR1YWwgIGR0cyBmaWxlcyxcbiAgICAvLyBidXQgYXJlIG5vdCBwdWJsaWNseSBleHBvcnRlZCBmcm9tIHRoZSBlbnRyeS1wb2ludC5cbiAgICBkdHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChcbiAgICAgICAgc291cmNlRmlsZSA9PiB7IGNvbGxlY3RFeHBvcnRlZERlY2xhcmF0aW9ucyhjaGVja2VyLCBkdHNEZWNsYXJhdGlvbk1hcCwgc291cmNlRmlsZSk7IH0pO1xuICAgIHJldHVybiBkdHNEZWNsYXJhdGlvbk1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBhIGZ1bmN0aW9uL21ldGhvZCBub2RlIChvciBpdHMgaW1wbGVtZW50YXRpb24pLCB0byBzZWUgaWYgaXQgcmV0dXJucyBhXG4gICAqIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBvYmplY3QuXG4gICAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbi5cbiAgICogQHBhcmFtIG5vZGUgdGhlIG5vZGUgdG8gY2hlY2sgLSB0aGlzIGNvdWxkIGJlIGEgZnVuY3Rpb24sIGEgbWV0aG9kIG9yIGEgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqIEBwYXJhbSBpbXBsZW1lbnRhdGlvbiB0aGUgYWN0dWFsIGZ1bmN0aW9uIGV4cHJlc3Npb24gaWYgYG5vZGVgIGlzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqIEBwYXJhbSBjb250YWluZXIgdGhlIGNsYXNzIHRoYXQgY29udGFpbnMgdGhlIGZ1bmN0aW9uLCBpZiBpdCBpcyBhIG1ldGhvZC5cbiAgICogQHJldHVybnMgaW5mbyBhYm91dCB0aGUgZnVuY3Rpb24gaWYgaXQgZG9lcyByZXR1cm4gYSBgTW9kdWxlV2l0aFByb3ZpZGVyc2Agb2JqZWN0OyBgbnVsbGBcbiAgICogb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHBhcnNlRm9yTW9kdWxlV2l0aFByb3ZpZGVycyhcbiAgICAgIG5hbWU6IHN0cmluZywgbm9kZTogdHMuTm9kZXxudWxsLCBpbXBsZW1lbnRhdGlvbjogdHMuTm9kZXxudWxsID0gbm9kZSxcbiAgICAgIGNvbnRhaW5lcjogdHMuRGVjbGFyYXRpb258bnVsbCA9IG51bGwpOiBNb2R1bGVXaXRoUHJvdmlkZXJzRnVuY3Rpb258bnVsbCB7XG4gICAgY29uc3QgZGVjbGFyYXRpb24gPSBpbXBsZW1lbnRhdGlvbiAmJlxuICAgICAgICAgICAgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihpbXBsZW1lbnRhdGlvbikgfHwgdHMuaXNNZXRob2REZWNsYXJhdGlvbihpbXBsZW1lbnRhdGlvbikgfHxcbiAgICAgICAgICAgICB0cy5pc0Z1bmN0aW9uRXhwcmVzc2lvbihpbXBsZW1lbnRhdGlvbikpID9cbiAgICAgICAgaW1wbGVtZW50YXRpb24gOlxuICAgICAgICBudWxsO1xuICAgIGNvbnN0IGJvZHkgPSBkZWNsYXJhdGlvbiA/IHRoaXMuZ2V0RGVmaW5pdGlvbk9mRnVuY3Rpb24oZGVjbGFyYXRpb24pLmJvZHkgOiBudWxsO1xuICAgIGNvbnN0IGxhc3RTdGF0ZW1lbnQgPSBib2R5ICYmIGJvZHlbYm9keS5sZW5ndGggLSAxXTtcbiAgICBjb25zdCByZXR1cm5FeHByZXNzaW9uID1cbiAgICAgICAgbGFzdFN0YXRlbWVudCAmJiB0cy5pc1JldHVyblN0YXRlbWVudChsYXN0U3RhdGVtZW50KSAmJiBsYXN0U3RhdGVtZW50LmV4cHJlc3Npb24gfHwgbnVsbDtcbiAgICBjb25zdCBuZ01vZHVsZVByb3BlcnR5ID0gcmV0dXJuRXhwcmVzc2lvbiAmJiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHJldHVybkV4cHJlc3Npb24pICYmXG4gICAgICAgICAgICByZXR1cm5FeHByZXNzaW9uLnByb3BlcnRpZXMuZmluZChcbiAgICAgICAgICAgICAgICBwcm9wID0+XG4gICAgICAgICAgICAgICAgICAgICEhcHJvcC5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihwcm9wLm5hbWUpICYmIHByb3AubmFtZS50ZXh0ID09PSAnbmdNb2R1bGUnKSB8fFxuICAgICAgICBudWxsO1xuICAgIGNvbnN0IG5nTW9kdWxlID0gbmdNb2R1bGVQcm9wZXJ0eSAmJiB0cy5pc1Byb3BlcnR5QXNzaWdubWVudChuZ01vZHVsZVByb3BlcnR5KSAmJlxuICAgICAgICAgICAgdHMuaXNJZGVudGlmaWVyKG5nTW9kdWxlUHJvcGVydHkuaW5pdGlhbGl6ZXIpICYmIG5nTW9kdWxlUHJvcGVydHkuaW5pdGlhbGl6ZXIgfHxcbiAgICAgICAgbnVsbDtcbiAgICByZXR1cm4gbmdNb2R1bGUgJiYgZGVjbGFyYXRpb24gJiYge25hbWUsIG5nTW9kdWxlLCBkZWNsYXJhdGlvbiwgY29udGFpbmVyfTtcbiAgfVxufVxuXG4vLy8vLy8vLy8vLy8vIEV4cG9ydGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG5leHBvcnQgdHlwZSBQYXJhbUluZm8gPSB7XG4gIGRlY29yYXRvcnM6IERlY29yYXRvcltdIHwgbnVsbCxcbiAgdHlwZUV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24gfCBudWxsXG59O1xuXG4vKipcbiAqIEEgc3RhdGVtZW50IG5vZGUgdGhhdCByZXByZXNlbnRzIGFuIGFzc2lnbm1lbnQuXG4gKi9cbmV4cG9ydCB0eXBlIEFzc2lnbm1lbnRTdGF0ZW1lbnQgPVxuICAgIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQgJiB7ZXhwcmVzc2lvbjoge2xlZnQ6IHRzLklkZW50aWZpZXIsIHJpZ2h0OiB0cy5FeHByZXNzaW9ufX07XG5cbi8qKlxuICogVGVzdCB3aGV0aGVyIGEgc3RhdGVtZW50IG5vZGUgaXMgYW4gYXNzaWdubWVudCBzdGF0ZW1lbnQuXG4gKiBAcGFyYW0gc3RhdGVtZW50IHRoZSBzdGF0ZW1lbnQgdG8gdGVzdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQXNzaWdubWVudFN0YXRlbWVudChzdGF0ZW1lbnQ6IHRzLlN0YXRlbWVudCk6IHN0YXRlbWVudCBpcyBBc3NpZ25tZW50U3RhdGVtZW50IHtcbiAgcmV0dXJuIHRzLmlzRXhwcmVzc2lvblN0YXRlbWVudChzdGF0ZW1lbnQpICYmIGlzQXNzaWdubWVudChzdGF0ZW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcihzdGF0ZW1lbnQuZXhwcmVzc2lvbi5sZWZ0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQXNzaWdubWVudChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTpcbiAgICBleHByZXNzaW9uIGlzIHRzLkFzc2lnbm1lbnRFeHByZXNzaW9uPHRzLkVxdWFsc1Rva2VuPiB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiZcbiAgICAgIGV4cHJlc3Npb24ub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuO1xufVxuXG4vKipcbiAqIFRoZSB0eXBlIG9mIGEgZnVuY3Rpb24gdGhhdCBjYW4gYmUgdXNlZCB0byBmaWx0ZXIgb3V0IGhlbHBlcnMgYmFzZWQgb24gdGhlaXIgdGFyZ2V0LlxuICogVGhpcyBpcyB1c2VkIGluIGByZWZsZWN0RGVjb3JhdG9yc0Zyb21IZWxwZXJDYWxsKClgLlxuICovXG5leHBvcnQgdHlwZSBUYXJnZXRGaWx0ZXIgPSAodGFyZ2V0OiB0cy5FeHByZXNzaW9uKSA9PiBib29sZWFuO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHRlc3RzIHdoZXRoZXIgdGhlIGdpdmVuIGV4cHJlc3Npb24gaXMgYSBjbGFzcyB0YXJnZXQuXG4gKiBAcGFyYW0gY2xhc3NOYW1lIHRoZSBuYW1lIG9mIHRoZSBjbGFzcyB3ZSB3YW50IHRvIHRhcmdldC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VDbGFzc1RhcmdldEZpbHRlcihjbGFzc05hbWU6IHN0cmluZyk6IFRhcmdldEZpbHRlciB7XG4gIHJldHVybiAodGFyZ2V0OiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiA9PiB0cy5pc0lkZW50aWZpZXIodGFyZ2V0KSAmJiB0YXJnZXQudGV4dCA9PT0gY2xhc3NOYW1lO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHRlc3RzIHdoZXRoZXIgdGhlIGdpdmVuIGV4cHJlc3Npb24gaXMgYSBjbGFzcyBtZW1iZXIgdGFyZ2V0LlxuICogQHBhcmFtIGNsYXNzTmFtZSB0aGUgbmFtZSBvZiB0aGUgY2xhc3Mgd2Ugd2FudCB0byB0YXJnZXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlTWVtYmVyVGFyZ2V0RmlsdGVyKGNsYXNzTmFtZTogc3RyaW5nKTogVGFyZ2V0RmlsdGVyIHtcbiAgcmV0dXJuICh0YXJnZXQ6IHRzLkV4cHJlc3Npb24pOiBib29sZWFuID0+IHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHRhcmdldCkgJiZcbiAgICAgIHRzLmlzSWRlbnRpZmllcih0YXJnZXQuZXhwcmVzc2lvbikgJiYgdGFyZ2V0LmV4cHJlc3Npb24udGV4dCA9PT0gY2xhc3NOYW1lICYmXG4gICAgICB0YXJnZXQubmFtZS50ZXh0ID09PSAncHJvdG90eXBlJztcbn1cblxuLyoqXG4gKiBIZWxwZXIgbWV0aG9kIHRvIGV4dHJhY3QgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgZ2l2ZW4gdGhlIHByb3BlcnR5J3MgXCJzeW1ib2xcIixcbiAqIHdoaWNoIGlzIGFjdHVhbGx5IHRoZSBzeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIHByb3BlcnR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocHJvcFN5bWJvbDogdHMuU3ltYm9sKTogdHMuRXhwcmVzc2lvbnx1bmRlZmluZWQge1xuICBjb25zdCBwcm9wSWRlbnRpZmllciA9IHByb3BTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgY29uc3QgcGFyZW50ID0gcHJvcElkZW50aWZpZXIgJiYgcHJvcElkZW50aWZpZXIucGFyZW50O1xuICByZXR1cm4gcGFyZW50ICYmIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihwYXJlbnQpID8gcGFyZW50LnJpZ2h0IDogdW5kZWZpbmVkO1xufVxuXG4vKipcbiAqIEEgY2FsbGVlIGNvdWxkIGJlIG9uZSBvZjogYF9fZGVjb3JhdGUoLi4uKWAgb3IgYHRzbGliXzEuX19kZWNvcmF0ZWAuXG4gKi9cbmZ1bmN0aW9uIGdldENhbGxlZU5hbWUoY2FsbDogdHMuQ2FsbEV4cHJlc3Npb24pOiBzdHJpbmd8bnVsbCB7XG4gIGlmICh0cy5pc0lkZW50aWZpZXIoY2FsbC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBjYWxsLmV4cHJlc3Npb24udGV4dDtcbiAgfVxuICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24oY2FsbC5leHByZXNzaW9uKSkge1xuICAgIHJldHVybiBjYWxsLmV4cHJlc3Npb24ubmFtZS50ZXh0O1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vLy8vLy8vLy8vLy8vIEludGVybmFsIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBnZXREZWNvcmF0b3JBcmdzKG5vZGU6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbltdIHtcbiAgLy8gVGhlIGFyZ3VtZW50cyBvZiBhIGRlY29yYXRvciBhcmUgaGVsZCBpbiB0aGUgYGFyZ3NgIHByb3BlcnR5IG9mIGl0cyBkZWNsYXJhdGlvbiBvYmplY3QuXG4gIGNvbnN0IGFyZ3NQcm9wZXJ0eSA9IG5vZGUucHJvcGVydGllcy5maWx0ZXIodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuZmluZChwcm9wZXJ0eSA9PiBnZXROYW1lVGV4dChwcm9wZXJ0eS5uYW1lKSA9PT0gJ2FyZ3MnKTtcbiAgY29uc3QgYXJnc0V4cHJlc3Npb24gPSBhcmdzUHJvcGVydHkgJiYgYXJnc1Byb3BlcnR5LmluaXRpYWxpemVyO1xuICByZXR1cm4gYXJnc0V4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGFyZ3NFeHByZXNzaW9uKSA/XG4gICAgICBBcnJheS5mcm9tKGFyZ3NFeHByZXNzaW9uLmVsZW1lbnRzKSA6XG4gICAgICBbXTtcbn1cblxuZnVuY3Rpb24gaXNQcm9wZXJ0eUFjY2Vzcyhub2RlOiB0cy5Ob2RlKTogbm9kZSBpcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24mXG4gICAge3BhcmVudDogdHMuQmluYXJ5RXhwcmVzc2lvbn0ge1xuICByZXR1cm4gISFub2RlLnBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZS5wYXJlbnQpICYmIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpc1RoaXNBc3NpZ25tZW50KG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5CaW5hcnlFeHByZXNzaW9uJlxuICAgIHtsZWZ0OiB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb259IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihub2RlKSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlLmxlZnQpICYmXG4gICAgICBub2RlLmxlZnQuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkO1xufVxuXG5mdW5jdGlvbiBpc05hbWVkRGVjbGFyYXRpb24obm9kZTogdHMuRGVjbGFyYXRpb24pOiBub2RlIGlzIHRzLk5hbWVkRGVjbGFyYXRpb24mXG4gICAge25hbWU6IHRzLklkZW50aWZpZXJ9IHtcbiAgY29uc3QgYW55Tm9kZTogYW55ID0gbm9kZTtcbiAgcmV0dXJuICEhYW55Tm9kZS5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihhbnlOb2RlLm5hbWUpO1xufVxuXG5cbmZ1bmN0aW9uIGlzQ2xhc3NNZW1iZXJUeXBlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5DbGFzc0VsZW1lbnR8XG4gICAgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuaXNDbGFzc0VsZW1lbnQobm9kZSkgfHwgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSB8fCB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSk7XG59XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gYSBwcm9wZXJ0eSBhY2Nlc3MgY2hhaW4uIEUuZy4gdGhlIGBhYCBvZiBgYS5iLmMuZGAuXG4gKiBAcGFyYW0gcHJvcGVydHlBY2Nlc3MgVGhlIHN0YXJ0aW5nIHByb3BlcnR5IGFjY2VzcyBleHByZXNzaW9uIGZyb20gd2hpY2ggd2Ugd2FudCB0byBjb21wdXRlXG4gKiB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIuXG4gKiBAcmV0dXJucyB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gdGhlIGNoYWluIG9yIGBudWxsYCBpZiBpdCBpcyBub3QgYW4gaWRlbnRpZmllci5cbiAqL1xuZnVuY3Rpb24gZ2V0RmFyTGVmdElkZW50aWZpZXIocHJvcGVydHlBY2Nlc3M6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIHdoaWxlICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihwcm9wZXJ0eUFjY2Vzcy5leHByZXNzaW9uKSkge1xuICAgIHByb3BlcnR5QWNjZXNzID0gcHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbjtcbiAgfVxuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKHByb3BlcnR5QWNjZXNzLmV4cHJlc3Npb24pID8gcHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbiA6IG51bGw7XG59XG5cbi8qKlxuICogQ29sbGVjdCBtYXBwaW5ncyBiZXR3ZWVuIGV4cG9ydGVkIGRlY2xhcmF0aW9ucyBpbiBhIHNvdXJjZSBmaWxlIGFuZCBpdHMgYXNzb2NpYXRlZFxuICogZGVjbGFyYXRpb24gaW4gdGhlIHR5cGluZ3MgcHJvZ3JhbS5cbiAqL1xuZnVuY3Rpb24gY29sbGVjdEV4cG9ydGVkRGVjbGFyYXRpb25zKFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBkdHNEZWNsYXJhdGlvbk1hcDogTWFwPHN0cmluZywgdHMuRGVjbGFyYXRpb24+LFxuICAgIHNyY0ZpbGU6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgY29uc3Qgc3JjTW9kdWxlID0gc3JjRmlsZSAmJiBjaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oc3JjRmlsZSk7XG4gIGNvbnN0IG1vZHVsZUV4cG9ydHMgPSBzcmNNb2R1bGUgJiYgY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUoc3JjTW9kdWxlKTtcbiAgaWYgKG1vZHVsZUV4cG9ydHMpIHtcbiAgICBtb2R1bGVFeHBvcnRzLmZvckVhY2goZXhwb3J0ZWRTeW1ib2wgPT4ge1xuICAgICAgaWYgKGV4cG9ydGVkU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMpIHtcbiAgICAgICAgZXhwb3J0ZWRTeW1ib2wgPSBjaGVja2VyLmdldEFsaWFzZWRTeW1ib2woZXhwb3J0ZWRTeW1ib2wpO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVjbGFyYXRpb24gPSBleHBvcnRlZFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgY29uc3QgbmFtZSA9IGV4cG9ydGVkU3ltYm9sLm5hbWU7XG4gICAgICBpZiAoZGVjbGFyYXRpb24gJiYgIWR0c0RlY2xhcmF0aW9uTWFwLmhhcyhuYW1lKSkge1xuICAgICAgICBkdHNEZWNsYXJhdGlvbk1hcC5zZXQobmFtZSwgZGVjbGFyYXRpb24pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cblxuLyoqXG4gKiBBIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG1heSBoYXZlIGJlZW4gXCJzeW50aGVzaXplZFwiIGJ5IFR5cGVTY3JpcHQgZHVyaW5nIEphdmFTY3JpcHQgZW1pdCxcbiAqIGluIHRoZSBjYXNlIG5vIHVzZXItZGVmaW5lZCBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGUuZy4gcHJvcGVydHkgaW5pdGlhbGl6ZXJzIGFyZSB1c2VkLlxuICogVGhvc2UgaW5pdGlhbGl6ZXJzIG5lZWQgdG8gYmUgZW1pdHRlZCBpbnRvIGEgY29uc3RydWN0b3IgaW4gSmF2YVNjcmlwdCwgc28gdGhlIFR5cGVTY3JpcHRcbiAqIGNvbXBpbGVyIGdlbmVyYXRlcyBhIHN5bnRoZXRpYyBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBXZSBuZWVkIHRvIGlkZW50aWZ5IHN1Y2ggY29uc3RydWN0b3JzIGFzIG5nY2MgbmVlZHMgdG8gYmUgYWJsZSB0byB0ZWxsIGlmIGEgY2xhc3MgZGlkXG4gKiBvcmlnaW5hbGx5IGhhdmUgYSBjb25zdHJ1Y3RvciBpbiB0aGUgVHlwZVNjcmlwdCBzb3VyY2UuIFdoZW4gYSBjbGFzcyBoYXMgYSBzdXBlcmNsYXNzLFxuICogYSBzeW50aGVzaXplZCBjb25zdHJ1Y3RvciBtdXN0IG5vdCBiZSBjb25zaWRlcmVkIGFzIGEgdXNlci1kZWZpbmVkIGNvbnN0cnVjdG9yIGFzIHRoYXRcbiAqIHByZXZlbnRzIGEgYmFzZSBmYWN0b3J5IGNhbGwgZnJvbSBiZWluZyBjcmVhdGVkIGJ5IG5ndHNjLCByZXN1bHRpbmcgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiB0aGF0IGRvZXMgbm90IGluamVjdCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBzdXBlcmNsYXNzLiBIZW5jZSwgd2UgaWRlbnRpZnkgYSBkZWZhdWx0XG4gKiBzeW50aGVzaXplZCBzdXBlciBjYWxsIGluIHRoZSBjb25zdHJ1Y3RvciBib2R5LCBhY2NvcmRpbmcgdG8gdGhlIHN0cnVjdHVyZSB0aGF0IFR5cGVTY3JpcHRcbiAqIGVtaXRzIGR1cmluZyBKYXZhU2NyaXB0IGVtaXQ6XG4gKiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvYmxvYi92My4yLjIvc3JjL2NvbXBpbGVyL3RyYW5zZm9ybWVycy90cy50cyNMMTA2OC1MMTA4MlxuICpcbiAqIEBwYXJhbSBjb25zdHJ1Y3RvciBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIHRlc3RcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGNvbnN0cnVjdG9yIGFwcGVhcnMgdG8gaGF2ZSBiZWVuIHN5bnRoZXNpemVkXG4gKi9cbmZ1bmN0aW9uIGlzU3ludGhlc2l6ZWRDb25zdHJ1Y3Rvcihjb25zdHJ1Y3RvcjogdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBpZiAoIWNvbnN0cnVjdG9yLmJvZHkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBmaXJzdFN0YXRlbWVudCA9IGNvbnN0cnVjdG9yLmJvZHkuc3RhdGVtZW50c1swXTtcbiAgaWYgKCFmaXJzdFN0YXRlbWVudCB8fCAhdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KGZpcnN0U3RhdGVtZW50KSkgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiBpc1N5bnRoZXNpemVkU3VwZXJDYWxsKGZpcnN0U3RhdGVtZW50LmV4cHJlc3Npb24pO1xufVxuXG4vKipcbiAqIFRlc3RzIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBoYXZlIGJlZW4gc3ludGhlc2l6ZWQgYnkgVHlwZVNjcmlwdCwgaS5lLiB3aGV0aGVyXG4gKiBpdCBpcyBvZiB0aGUgZm9sbG93aW5nIGZvcm06XG4gKlxuICogYGBgXG4gKiBzdXBlciguLi5hcmd1bWVudHMpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHJlc3Npb24gdGhlIGV4cHJlc3Npb24gdGhhdCBpcyB0byBiZSB0ZXN0ZWRcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGV4cHJlc3Npb24gYXBwZWFycyB0byBiZSBhIHN5bnRoZXNpemVkIHN1cGVyIGNhbGxcbiAqL1xuZnVuY3Rpb24gaXNTeW50aGVzaXplZFN1cGVyQ2FsbChleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gIGlmICghdHMuaXNDYWxsRXhwcmVzc2lvbihleHByZXNzaW9uKSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZXhwcmVzc2lvbi5leHByZXNzaW9uLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuU3VwZXJLZXl3b3JkKSByZXR1cm4gZmFsc2U7XG4gIGlmIChleHByZXNzaW9uLmFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBhcmd1bWVudCA9IGV4cHJlc3Npb24uYXJndW1lbnRzWzBdO1xuICByZXR1cm4gdHMuaXNTcHJlYWRFbGVtZW50KGFyZ3VtZW50KSAmJiB0cy5pc0lkZW50aWZpZXIoYXJndW1lbnQuZXhwcmVzc2lvbikgJiZcbiAgICAgIGFyZ3VtZW50LmV4cHJlc3Npb24udGV4dCA9PT0gJ2FyZ3VtZW50cyc7XG59XG4iXX0=