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
        define("@angular/compiler-cli/src/ngcc/src/host/fesm2015_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/host", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngcc/src/utils", "@angular/compiler-cli/src/ngcc/src/host/decorated_class", "@angular/compiler-cli/src/ngcc/src/host/decorated_file", "@angular/compiler-cli/src/ngcc/src/host/ngcc_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/host");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    var decorated_class_1 = require("@angular/compiler-cli/src/ngcc/src/host/decorated_class");
    var decorated_file_1 = require("@angular/compiler-cli/src/ngcc/src/host/decorated_file");
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
    var Fesm2015ReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(Fesm2015ReflectionHost, _super);
        function Fesm2015ReflectionHost(isCore, checker) {
            var _this = _super.call(this, checker) || this;
            _this.isCore = isCore;
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
        Fesm2015ReflectionHost.prototype.getDecoratorsOfDeclaration = function (declaration) {
            var symbol = this.getClassSymbol(declaration);
            if (!symbol) {
                return null;
            }
            var decoratorsProperty = this.getStaticProperty(symbol, exports.DECORATORS);
            if (decoratorsProperty) {
                return this.getClassDecoratorsFromStaticProperty(decoratorsProperty);
            }
            else {
                return this.getClassDecoratorsFromHelperCall(symbol);
            }
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
        Fesm2015ReflectionHost.prototype.getMembersOfClass = function (clazz) {
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
                    kind: host_1.ClassMemberKind.Property,
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
        Fesm2015ReflectionHost.prototype.getConstructorParameters = function (clazz) {
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
        Fesm2015ReflectionHost.prototype.getClassSymbol = function (declaration) {
            if (ts.isClassDeclaration(declaration)) {
                return declaration.name && this.checker.getSymbolAtLocation(declaration.name);
            }
            if (ts.isVariableDeclaration(declaration) && declaration.initializer &&
                ts.isClassExpression(declaration.initializer)) {
                return declaration.initializer.name &&
                    this.checker.getSymbolAtLocation(declaration.initializer.name);
            }
            return undefined;
        };
        /**
         * Search the given module for variable declarations in which the initializer
         * is an identifier marked with the `PRE_NGCC_MARKER`.
         * @param module the module in which to search for switchable declarations.
         * @returns an array of variable declarations that match.
         */
        Fesm2015ReflectionHost.prototype.getSwitchableDeclarations = function (module) {
            // Don't bother to walk the AST if the marker is not found in the text
            return module.getText().indexOf(ngcc_host_1.PRE_NGCC_MARKER) >= 0 ?
                utils_1.findAll(module, ngcc_host_1.isSwitchableVariableDeclaration) :
                [];
        };
        Fesm2015ReflectionHost.prototype.getVariableValue = function (declaration) {
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
        Fesm2015ReflectionHost.prototype.getImportOfIdentifier = function (id) {
            return _super.prototype.getImportOfIdentifier.call(this, id) || this.getImportOfNamespacedIdentifier(id);
        };
        /*
         * Find all the files accessible via an entry-point, that contain decorated classes.
         * @param entryPoint The starting point file for finding files that contain decorated classes.
         * @returns A collection of files objects that hold info about the decorated classes and import
         * information.
         */
        Fesm2015ReflectionHost.prototype.findDecoratedFiles = function (entryPoint) {
            var _this = this;
            var moduleSymbol = this.checker.getSymbolAtLocation(entryPoint);
            var map = new Map();
            if (moduleSymbol) {
                var exportedSymbols = this.checker.getExportsOfModule(moduleSymbol).map(utils_1.getOriginalSymbol(this.checker));
                var exportedDeclarations = exportedSymbols.map(function (exportSymbol) { return exportSymbol.valueDeclaration; }).filter(utils_1.isDefined);
                var decoratedClasses = exportedDeclarations
                    .map(function (declaration) {
                    if (ts.isClassDeclaration(declaration) || ts.isVariableDeclaration(declaration)) {
                        var name_1 = declaration.name && ts.isIdentifier(declaration.name) ?
                            declaration.name.text :
                            undefined;
                        var decorators = _this.getDecoratorsOfDeclaration(declaration);
                        return decorators && utils_1.isDefined(name_1) ?
                            new decorated_class_1.DecoratedClass(name_1, declaration, decorators) :
                            undefined;
                    }
                    return undefined;
                })
                    .filter(utils_1.isDefined);
                decoratedClasses.forEach(function (clazz) {
                    var file = clazz.declaration.getSourceFile();
                    if (!map.has(file)) {
                        map.set(file, new decorated_file_1.DecoratedFile(file));
                    }
                    map.get(file).decoratedClasses.push(clazz);
                });
            }
            return map;
        };
        ///////////// Protected Helpers /////////////
        /**
         * Walk the AST looking for an assignment to the specified symbol.
         * @param node The current node we are searching.
         * @returns an expression that represents the value of the variable, or undefined if none can be
         * found.
         */
        Fesm2015ReflectionHost.prototype.findDecoratedVariableValue = function (node, symbol) {
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
        Fesm2015ReflectionHost.prototype.getStaticProperty = function (symbol, propertyName) {
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
        Fesm2015ReflectionHost.prototype.getClassDecoratorsFromStaticProperty = function (decoratorsSymbol) {
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
        Fesm2015ReflectionHost.prototype.getClassDecoratorsFromHelperCall = function (symbol) {
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
        Fesm2015ReflectionHost.prototype.getMemberDecorators = function (classSymbol) {
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
        Fesm2015ReflectionHost.prototype.getMemberDecoratorsFromStaticProperty = function (decoratorsProperty) {
            var _this = this;
            var memberDecorators = new Map();
            // Symbol of the identifier for `SomeDirective.propDecorators`.
            var propDecoratorsMap = getPropertyValueFromSymbol(decoratorsProperty);
            if (propDecoratorsMap && ts.isObjectLiteralExpression(propDecoratorsMap)) {
                var propertiesMap = metadata_1.reflectObjectLiteral(propDecoratorsMap);
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
        Fesm2015ReflectionHost.prototype.getMemberDecoratorsFromHelperCalls = function (classSymbol) {
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
        Fesm2015ReflectionHost.prototype.reflectDecoratorsFromHelperCall = function (helperCall, targetFilter) {
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
        Fesm2015ReflectionHost.prototype.reflectDecoratorCall = function (call) {
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
        Fesm2015ReflectionHost.prototype.getHelperCall = function (statement, helperName) {
            if (ts.isExpressionStatement(statement)) {
                var expression = isAssignmentStatement(statement) ? statement.expression.right : statement.expression;
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
        Fesm2015ReflectionHost.prototype.reflectDecorators = function (decoratorsArray) {
            var _this = this;
            var decorators = [];
            if (ts.isArrayLiteralExpression(decoratorsArray)) {
                // Add each decorator that is imported from `@angular/core` into the `decorators` array
                decoratorsArray.elements.forEach(function (node) {
                    // If the decorator is not an object literal expression then we are not interested
                    if (ts.isObjectLiteralExpression(node)) {
                        // We are only interested in objects of the form: `{ type: DecoratorType, args: [...] }`
                        var decorator = metadata_1.reflectObjectLiteral(node);
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
        Fesm2015ReflectionHost.prototype.reflectMember = function (symbol, decorators, isStatic) {
            var kind = null;
            var value = null;
            var name = null;
            var nameNode = null;
            var type = null;
            var node = symbol.valueDeclaration || symbol.declarations && symbol.declarations[0];
            if (!node || !isClassMemberType(node)) {
                return null;
            }
            if (symbol.flags & ts.SymbolFlags.Method) {
                kind = host_1.ClassMemberKind.Method;
            }
            else if (symbol.flags & ts.SymbolFlags.Property) {
                kind = host_1.ClassMemberKind.Property;
            }
            else if (symbol.flags & ts.SymbolFlags.GetAccessor) {
                kind = host_1.ClassMemberKind.Getter;
            }
            else if (symbol.flags & ts.SymbolFlags.SetAccessor) {
                kind = host_1.ClassMemberKind.Setter;
            }
            if (isStatic && isPropertyAccess(node)) {
                name = node.name.text;
                value = symbol.flags & ts.SymbolFlags.Property ? node.parent.right : null;
            }
            else if (isThisAssignment(node)) {
                kind = host_1.ClassMemberKind.Property;
                name = node.left.name.text;
                value = node.right;
                isStatic = false;
            }
            else if (ts.isConstructorDeclaration(node)) {
                kind = host_1.ClassMemberKind.Constructor;
                name = 'constructor';
                isStatic = false;
            }
            if (kind === null) {
                console.warn("Unknown member type: \"" + node.getText());
                return null;
            }
            if (!name) {
                if (isNamedDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
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
        Fesm2015ReflectionHost.prototype.getConstructorParameterDeclarations = function (classSymbol) {
            var constructorSymbol = classSymbol.members && classSymbol.members.get(exports.CONSTRUCTOR);
            if (constructorSymbol) {
                // For some reason the constructor does not have a `valueDeclaration` ?!?
                var constructor = constructorSymbol.declarations &&
                    constructorSymbol.declarations[0];
                if (constructor && constructor.parameters) {
                    return Array.from(constructor.parameters);
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
        Fesm2015ReflectionHost.prototype.getConstructorParamInfo = function (classSymbol, parameterNodes) {
            var paramsProperty = this.getStaticProperty(classSymbol, exports.CONSTRUCTOR_PARAMS);
            var paramInfo = paramsProperty ?
                this.getParamInfoFromStaticProperty(paramsProperty) :
                this.getParamInfoFromHelperCall(classSymbol, parameterNodes);
            return parameterNodes.map(function (node, index) {
                var _a = paramInfo && paramInfo[index] ? paramInfo[index] : { decorators: null, type: null }, decorators = _a.decorators, type = _a.type;
                var nameNode = node.name;
                return { name: utils_1.getNameText(nameNode), nameNode: nameNode, type: type, decorators: decorators };
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
        Fesm2015ReflectionHost.prototype.getParamInfoFromStaticProperty = function (paramDecoratorsProperty) {
            var _this = this;
            var paramDecorators = getPropertyValueFromSymbol(paramDecoratorsProperty);
            if (paramDecorators && ts.isArrowFunction(paramDecorators)) {
                if (ts.isArrayLiteralExpression(paramDecorators.body)) {
                    var elements = paramDecorators.body.elements;
                    return elements
                        .map(function (element) {
                        return ts.isObjectLiteralExpression(element) ? metadata_1.reflectObjectLiteral(element) : null;
                    })
                        .map(function (paramInfo) {
                        var type = paramInfo && paramInfo.get('type') || null;
                        var decoratorInfo = paramInfo && paramInfo.get('decorators') || null;
                        var decorators = decoratorInfo &&
                            _this.reflectDecorators(decoratorInfo)
                                .filter(function (decorator) { return _this.isFromCore(decorator); });
                        return { type: type, decorators: decorators };
                    });
                }
            }
            return null;
        };
        /**
         * Get the parmeter type and decorators for a class where the information is stored on
         * in calls to `__decorate` helpers.
         *
         * Reflect over the helpers to find the decorators and types about each of
         * the class's constructor parameters.
         *
         * @param classSymbol the class whose parameter info we want to get.
         * @param parameterNodes the array of TypeScript parameter nodes for this class's constructor.
         * @returns an array of objects containing the type and decorators for each parameter.
         */
        Fesm2015ReflectionHost.prototype.getParamInfoFromHelperCall = function (classSymbol, parameterNodes) {
            var _this = this;
            var parameters = parameterNodes.map(function () { return ({ type: null, decorators: null }); });
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
                                types.forEach(function (type, index) { return parameters[index].type = type; });
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
        Fesm2015ReflectionHost.prototype.getHelperCallsForClass = function (classSymbol, helperName) {
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
        Fesm2015ReflectionHost.prototype.getStatementsForClass = function (classSymbol) {
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
        Fesm2015ReflectionHost.prototype.getImportOfNamespacedIdentifier = function (id) {
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
         * * externally imported from `@angulare/core`?
         * * the current hosted program is actually `@angular/core` and
         *   - relatively internally imported; or
         *   - not imported, from the current file.
         *
         * @param decorator the decorator to test.
         */
        Fesm2015ReflectionHost.prototype.isFromCore = function (decorator) {
            if (this.isCore) {
                return !decorator.import || /^\./.test(decorator.import.from);
            }
            else {
                return !!decorator.import && decorator.import.from === '@angular/core';
            }
        };
        return Fesm2015ReflectionHost;
    }(metadata_1.TypeScriptReflectionHost));
    exports.Fesm2015ReflectionHost = Fesm2015ReflectionHost;
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
        return !!node.name;
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmVzbTIwMTVfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvaG9zdC9mZXNtMjAxNV9ob3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUVqQyw2REFBbUc7SUFDbkcscUVBQXVGO0lBQ3ZGLGtFQUE0RTtJQUU1RSwyRkFBaUQ7SUFDakQseUZBQStDO0lBQy9DLCtFQUFnSTtJQUVuSCxRQUFBLFVBQVUsR0FBRyxZQUEyQixDQUFDO0lBQ3pDLFFBQUEsZUFBZSxHQUFHLGdCQUErQixDQUFDO0lBQ2xELFFBQUEsV0FBVyxHQUFHLGVBQThCLENBQUM7SUFDN0MsUUFBQSxrQkFBa0IsR0FBRyxnQkFBK0IsQ0FBQztJQUVsRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0EwQkc7SUFDSDtRQUE0QyxrREFBd0I7UUFDbEUsZ0NBQXNCLE1BQWUsRUFBRSxPQUF1QjtZQUE5RCxZQUFrRSxrQkFBTSxPQUFPLENBQUMsU0FBRztZQUE3RCxZQUFNLEdBQU4sTUFBTSxDQUFTOztRQUE2QyxDQUFDO1FBRW5GOzs7Ozs7Ozs7Ozs7V0FZRztRQUNILDJEQUEwQixHQUExQixVQUEyQixXQUEyQjtZQUNwRCxJQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ1gsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxrQkFBVSxDQUFDLENBQUM7WUFDdEUsSUFBSSxrQkFBa0IsRUFBRTtnQkFDdEIsT0FBTyxJQUFJLENBQUMsb0NBQW9DLENBQUMsa0JBQWtCLENBQUMsQ0FBQzthQUN0RTtpQkFBTTtnQkFD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KiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge25vcm1hbGl6ZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgQ3RvclBhcmFtZXRlciwgRGVjb3JhdG9yLCBJbXBvcnR9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHtUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9tZXRhZGF0YSc7XG5pbXBvcnQge2ZpbmRBbGwsIGdldE5hbWVUZXh0LCBnZXRPcmlnaW5hbFN5bWJvbCwgaXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7RGVjb3JhdGVkQ2xhc3N9IGZyb20gJy4vZGVjb3JhdGVkX2NsYXNzJztcbmltcG9ydCB7RGVjb3JhdGVkRmlsZX0gZnJvbSAnLi9kZWNvcmF0ZWRfZmlsZSc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdCwgUFJFX05HQ0NfTUFSS0VSLCBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbiwgaXNTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbn0gZnJvbSAnLi9uZ2NjX2hvc3QnO1xuXG5leHBvcnQgY29uc3QgREVDT1JBVE9SUyA9ICdkZWNvcmF0b3JzJyBhcyB0cy5fX1N0cmluZztcbmV4cG9ydCBjb25zdCBQUk9QX0RFQ09SQVRPUlMgPSAncHJvcERlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IENPTlNUUlVDVE9SID0gJ19fY29uc3RydWN0b3InIGFzIHRzLl9fU3RyaW5nO1xuZXhwb3J0IGNvbnN0IENPTlNUUlVDVE9SX1BBUkFNUyA9ICdjdG9yUGFyYW1ldGVycycgYXMgdHMuX19TdHJpbmc7XG5cbi8qKlxuICogRXNtMjAxNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgMjAxNSBjbGFzc2VzLCBldGMuXG4gKiBEZWNvcmF0b3JzIGFyZSBkZWZpbmVkIHZpYSBzdGF0aWMgcHJvcGVydGllcyBvbiB0aGUgY2xhc3MuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogY2xhc3MgU29tZURpcmVjdGl2ZSB7XG4gKiB9XG4gKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gKiAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gKiAgIFwiaW5wdXQxXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqICAgXCJpbnB1dDJcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogfTtcbiAqIGBgYFxuICpcbiAqICogQ2xhc3NlcyBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICovXG5leHBvcnQgY2xhc3MgRmVzbTIwMTVSZWZsZWN0aW9uSG9zdCBleHRlbmRzIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCBpbXBsZW1lbnRzIE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7IHN1cGVyKGNoZWNrZXIpOyB9XG5cbiAgLyoqXG4gICAqIEV4YW1pbmUgYSBkZWNsYXJhdGlvbiAoZm9yIGV4YW1wbGUsIG9mIGEgY2xhc3Mgb3IgZnVuY3Rpb24pIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgYW55XG4gICAqIGRlY29yYXRvcnMgcHJlc2VudCBvbiB0aGUgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBhIFR5cGVTY3JpcHQgYHRzLkRlY2xhcmF0aW9uYCBub2RlIHJlcHJlc2VudGluZyB0aGUgY2xhc3Mgb3IgZnVuY3Rpb24gb3ZlclxuICAgKiB3aGljaCB0byByZWZsZWN0LiBGb3IgZXhhbXBsZSwgaWYgdGhlIGludGVudCBpcyB0byByZWZsZWN0IHRoZSBkZWNvcmF0b3JzIG9mIGEgY2xhc3MgYW5kIHRoZVxuICAgKiBzb3VyY2UgaXMgaW4gRVM2IGZvcm1hdCwgdGhpcyB3aWxsIGJlIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIG5vZGUuIElmIHRoZSBzb3VyY2UgaXMgaW4gRVM1XG4gICAqIGZvcm1hdCwgdGhpcyBtaWdodCBiZSBhIGB0cy5WYXJpYWJsZURlY2xhcmF0aW9uYCBhcyBjbGFzc2VzIGluIEVTNSBhcmUgcmVwcmVzZW50ZWQgYXMgdGhlXG4gICAqIHJlc3VsdCBvZiBhbiBJSUZFIGV4ZWN1dGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYERlY29yYXRvcmAgbWV0YWRhdGEgaWYgZGVjb3JhdG9ycyBhcmUgcHJlc2VudCBvbiB0aGUgZGVjbGFyYXRpb24sIG9yXG4gICAqIGBudWxsYCBpZiBlaXRoZXIgbm8gZGVjb3JhdG9ycyB3ZXJlIHByZXNlbnQgb3IgaWYgdGhlIGRlY2xhcmF0aW9uIGlzIG5vdCBvZiBhIGRlY29yYXRhYmxlIHR5cGUuXG4gICAqL1xuICBnZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoIXN5bWJvbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvcnNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoc3ltYm9sLCBERUNPUkFUT1JTKTtcbiAgICBpZiAoZGVjb3JhdG9yc1Byb3BlcnR5KSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRDbGFzc0RlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0Q2xhc3NEZWNvcmF0b3JzRnJvbUhlbHBlckNhbGwoc3ltYm9sKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXhhbWluZSBhIGRlY2xhcmF0aW9uIHdoaWNoIHNob3VsZCBiZSBvZiBhIGNsYXNzLCBhbmQgcmV0dXJuIG1ldGFkYXRhIGFib3V0IHRoZSBtZW1iZXJzIG9mIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIGEgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gIG5vZGUgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvXG4gICAqIHJlZmxlY3QuIElmIHRoZSBzb3VyY2UgaXMgaW4gRVM2IGZvcm1hdCwgdGhpcyB3aWxsIGJlIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIG5vZGUuIElmIHRoZVxuICAgKiBzb3VyY2UgaXMgaW4gRVM1IGZvcm1hdCwgdGhpcyBtaWdodCBiZSBhIGB0cy5WYXJpYWJsZURlY2xhcmF0aW9uYCBhcyBjbGFzc2VzIGluIEVTNSBhcmVcbiAgICogcmVwcmVzZW50ZWQgYXMgdGhlIHJlc3VsdCBvZiBhbiBJSUZFIGV4ZWN1dGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYENsYXNzTWVtYmVyYCBtZXRhZGF0YSByZXByZXNlbnRpbmcgdGhlIG1lbWJlcnMgb2YgdGhlIGNsYXNzLlxuICAgKlxuICAgKiBAdGhyb3dzIGlmIGBkZWNsYXJhdGlvbmAgZG9lcyBub3QgcmVzb2x2ZSB0byBhIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmICghc3ltYm9sKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0dGVtcHRlZCB0byBnZXQgbWVtYmVycyBvZiBhIG5vbi1jbGFzczogXCIke2NsYXp6LmdldFRleHQoKX1cImApO1xuICAgIH1cblxuICAgIC8vIFRoZSBkZWNvcmF0b3JzIG1hcCBjb250YWlucyBhbGwgdGhlIHByb3BlcnRpZXMgdGhhdCBhcmUgZGVjb3JhdGVkXG4gICAgY29uc3QgZGVjb3JhdG9yc01hcCA9IHRoaXMuZ2V0TWVtYmVyRGVjb3JhdG9ycyhzeW1ib2wpO1xuXG4gICAgLy8gVGhlIG1lbWJlciBtYXAgY29udGFpbnMgYWxsIHRoZSBtZXRob2QgKGluc3RhbmNlIGFuZCBzdGF0aWMpOyBhbmQgYW55IGluc3RhbmNlIHByb3BlcnRpZXNcbiAgICAvLyB0aGF0IGFyZSBpbml0aWFsaXplZCBpbiB0aGUgY2xhc3MuXG4gICAgaWYgKHN5bWJvbC5tZW1iZXJzKSB7XG4gICAgICBzeW1ib2wubWVtYmVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSByZW1vdmVGcm9tTWFwKGRlY29yYXRvcnNNYXAsIGtleSk7XG4gICAgICAgIGNvbnN0IG1lbWJlciA9IHRoaXMucmVmbGVjdE1lbWJlcih2YWx1ZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgIGlmIChtZW1iZXIpIHtcbiAgICAgICAgICBtZW1iZXJzLnB1c2gobWVtYmVyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVGhlIHN0YXRpYyBwcm9wZXJ0eSBtYXAgY29udGFpbnMgYWxsIHRoZSBzdGF0aWMgcHJvcGVydGllc1xuICAgIGlmIChzeW1ib2wuZXhwb3J0cykge1xuICAgICAgc3ltYm9sLmV4cG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gcmVtb3ZlRnJvbU1hcChkZWNvcmF0b3JzTWFwLCBrZXkpO1xuICAgICAgICBjb25zdCBtZW1iZXIgPSB0aGlzLnJlZmxlY3RNZW1iZXIodmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICBpZiAobWVtYmVyKSB7XG4gICAgICAgICAgbWVtYmVycy5wdXNoKG1lbWJlcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoaXMgY2xhc3Mgd2FzIGRlY2xhcmVkIGFzIGEgVmFyaWFibGVEZWNsYXJhdGlvbiB0aGVuIGl0IG1heSBoYXZlIHN0YXRpYyBwcm9wZXJ0aWVzXG4gICAgLy8gYXR0YWNoZWQgdG8gdGhlIHZhcmlhYmxlIHJhdGhlciB0aGFuIHRoZSBjbGFzcyBpdHNlbGZcbiAgICAvLyBGb3IgZXhhbXBsZTpcbiAgICAvLyBgYGBcbiAgICAvLyBsZXQgTXlDbGFzcyA9IGNsYXNzIE15Q2xhc3Mge1xuICAgIC8vICAgLy8gbm8gc3RhdGljIHByb3BlcnRpZXMgaGVyZSFcbiAgICAvLyB9XG4gICAgLy8gTXlDbGFzcy5zdGF0aWNQcm9wZXJ0eSA9IC4uLjtcbiAgICAvLyBgYGBcbiAgICBpZiAodHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHN5bWJvbC52YWx1ZURlY2xhcmF0aW9uLnBhcmVudCkpIHtcbiAgICAgIGNvbnN0IHZhcmlhYmxlU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24ucGFyZW50Lm5hbWUpO1xuICAgICAgaWYgKHZhcmlhYmxlU3ltYm9sICYmIHZhcmlhYmxlU3ltYm9sLmV4cG9ydHMpIHtcbiAgICAgICAgdmFyaWFibGVTeW1ib2wuZXhwb3J0cy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IHJlbW92ZUZyb21NYXAoZGVjb3JhdG9yc01hcCwga2V5KTtcbiAgICAgICAgICBjb25zdCBtZW1iZXIgPSB0aGlzLnJlZmxlY3RNZW1iZXIodmFsdWUsIGRlY29yYXRvcnMsIHRydWUpO1xuICAgICAgICAgIGlmIChtZW1iZXIpIHtcbiAgICAgICAgICAgIG1lbWJlcnMucHVzaChtZW1iZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGVhbCB3aXRoIGFueSBkZWNvcmF0ZWQgcHJvcGVydGllcyB0aGF0IHdlcmUgbm90IGluaXRpYWxpemVkIGluIHRoZSBjbGFzc1xuICAgIGRlY29yYXRvcnNNYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgaW1wbGVtZW50YXRpb246IG51bGwsXG4gICAgICAgIGRlY29yYXRvcnM6IHZhbHVlLFxuICAgICAgICBpc1N0YXRpYzogZmFsc2UsXG4gICAgICAgIGtpbmQ6IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eSxcbiAgICAgICAgbmFtZToga2V5LFxuICAgICAgICBuYW1lTm9kZTogbnVsbCxcbiAgICAgICAgbm9kZTogbnVsbCxcbiAgICAgICAgdHlwZTogbnVsbCxcbiAgICAgICAgdmFsdWU6IG51bGxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1lbWJlcnM7XG4gIH1cblxuICAvKipcbiAgICogUmVmbGVjdCBvdmVyIHRoZSBjb25zdHJ1Y3RvciBvZiBhIGNsYXNzIGFuZCByZXR1cm4gbWV0YWRhdGEgYWJvdXQgaXRzIHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIG9ubHkgbG9va3MgYXQgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MgZGlyZWN0bHkgYW5kIG5vdCBhdCBhbnkgaW5oZXJpdGVkXG4gICAqIGNvbnN0cnVjdG9ycy5cbiAgICpcbiAgICogQHBhcmFtIGRlY2xhcmF0aW9uIGEgVHlwZVNjcmlwdCBgdHMuRGVjbGFyYXRpb25gIG5vZGUgcmVwcmVzZW50aW5nIHRoZSBjbGFzcyBvdmVyIHdoaWNoIHRvXG4gICAqIHJlZmxlY3QuIElmIHRoZSBzb3VyY2UgaXMgaW4gRVM2IGZvcm1hdCwgdGhpcyB3aWxsIGJlIGEgYHRzLkNsYXNzRGVjbGFyYXRpb25gIG5vZGUuIElmIHRoZVxuICAgKiBzb3VyY2UgaXMgaW4gRVM1IGZvcm1hdCwgdGhpcyBtaWdodCBiZSBhIGB0cy5WYXJpYWJsZURlY2xhcmF0aW9uYCBhcyBjbGFzc2VzIGluIEVTNSBhcmVcbiAgICogcmVwcmVzZW50ZWQgYXMgdGhlIHJlc3VsdCBvZiBhbiBJSUZFIGV4ZWN1dGlvbi5cbiAgICpcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYFBhcmFtZXRlcmAgbWV0YWRhdGEgcmVwcmVzZW50aW5nIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjb25zdHJ1Y3RvciwgaWZcbiAgICogYSBjb25zdHJ1Y3RvciBleGlzdHMuIElmIHRoZSBjb25zdHJ1Y3RvciBleGlzdHMgYW5kIGhhcyAwIHBhcmFtZXRlcnMsIHRoaXMgYXJyYXkgd2lsbCBiZSBlbXB0eS5cbiAgICogSWYgdGhlIGNsYXNzIGhhcyBubyBjb25zdHJ1Y3RvciwgdGhpcyBtZXRob2QgcmV0dXJucyBgbnVsbGAuXG4gICAqXG4gICAqIEB0aHJvd3MgaWYgYGRlY2xhcmF0aW9uYCBkb2VzIG5vdCByZXNvbHZlIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogQ3RvclBhcmFtZXRlcltdfG51bGwge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKCFjbGFzc1N5bWJvbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBBdHRlbXB0ZWQgdG8gZ2V0IGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBub24tY2xhc3M6IFwiJHtjbGF6ei5nZXRUZXh0KCl9XCJgKTtcbiAgICB9XG4gICAgY29uc3QgcGFyYW1ldGVyTm9kZXMgPSB0aGlzLmdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sKTtcbiAgICBpZiAocGFyYW1ldGVyTm9kZXMpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldENvbnN0cnVjdG9yUGFyYW1JbmZvKGNsYXNzU3ltYm9sLCBwYXJhbWV0ZXJOb2Rlcyk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgYSBzeW1ib2wgZm9yIGEgbm9kZSB0aGF0IHdlIHRoaW5rIGlzIGEgY2xhc3MuXG4gICAqIEBwYXJhbSBub2RlIHRoZSBub2RlIHdob3NlIHN5bWJvbCB3ZSBhcmUgZmluZGluZy5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBmb3IgdGhlIG5vZGUgb3IgYHVuZGVmaW5lZGAgaWYgaXQgaXMgbm90IGEgXCJjbGFzc1wiIG9yIGhhcyBubyBzeW1ib2wuXG4gICAqL1xuICBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuTm9kZSk6IHRzLlN5bWJvbHx1bmRlZmluZWQge1xuICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pKSB7XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb24ubmFtZSAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihkZWNsYXJhdGlvbi5uYW1lKTtcbiAgICB9XG4gICAgaWYgKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgJiYgZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIgJiZcbiAgICAgICAgdHMuaXNDbGFzc0V4cHJlc3Npb24oZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpKSB7XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIubmFtZSAmJlxuICAgICAgICAgIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyLm5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCB0aGUgZ2l2ZW4gbW9kdWxlIGZvciB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgaW4gd2hpY2ggdGhlIGluaXRpYWxpemVyXG4gICAqIGlzIGFuIGlkZW50aWZpZXIgbWFya2VkIHdpdGggdGhlIGBQUkVfTkdDQ19NQVJLRVJgLlxuICAgKiBAcGFyYW0gbW9kdWxlIHRoZSBtb2R1bGUgaW4gd2hpY2ggdG8gc2VhcmNoIGZvciBzd2l0Y2hhYmxlIGRlY2xhcmF0aW9ucy5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgdmFyaWFibGUgZGVjbGFyYXRpb25zIHRoYXQgbWF0Y2guXG4gICAqL1xuICBnZXRTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKG1vZHVsZTogdHMuTm9kZSk6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10ge1xuICAgIC8vIERvbid0IGJvdGhlciB0byB3YWxrIHRoZSBBU1QgaWYgdGhlIG1hcmtlciBpcyBub3QgZm91bmQgaW4gdGhlIHRleHRcbiAgICByZXR1cm4gbW9kdWxlLmdldFRleHQoKS5pbmRleE9mKFBSRV9OR0NDX01BUktFUikgPj0gMCA/XG4gICAgICAgIGZpbmRBbGwobW9kdWxlLCBpc1N3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uKSA6XG4gICAgICAgIFtdO1xuICB9XG5cbiAgZ2V0VmFyaWFibGVWYWx1ZShkZWNsYXJhdGlvbjogdHMuVmFyaWFibGVEZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdmFsdWUgPSBzdXBlci5nZXRWYXJpYWJsZVZhbHVlKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBXZSBoYXZlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gdGhhdCBoYXMgbm8gaW5pdGlhbGl6ZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gdmFyIEh0dHBDbGllbnRYc3JmTW9kdWxlXzE7XG4gICAgLy8gYGBgXG4gICAgLy9cbiAgICAvLyBTbyBsb29rIGZvciB0aGUgc3BlY2lhbCBzY2VuYXJpbyB3aGVyZSB0aGUgdmFyaWFibGUgaXMgYmVpbmcgYXNzaWduZWQgaW5cbiAgICAvLyBhIG5lYXJieSBzdGF0ZW1lbnQgdG8gdGhlIHJldHVybiB2YWx1ZSBvZiBhIGNhbGwgdG8gYF9fZGVjb3JhdGVgLlxuICAgIC8vIFRoZW4gZmluZCB0aGUgMm5kIGFyZ3VtZW50IG9mIHRoYXQgY2FsbCwgdGhlIFwidGFyZ2V0XCIsIHdoaWNoIHdpbGwgYmUgdGhlXG4gICAgLy8gYWN0dWFsIGNsYXNzIGlkZW50aWZpZXIuIEZvciBleGFtcGxlOlxuICAgIC8vXG4gICAgLy8gYGBgXG4gICAgLy8gSHR0cENsaWVudFhzcmZNb2R1bGUgPSBIdHRwQ2xpZW50WHNyZk1vZHVsZV8xID0gdHNsaWJfMS5fX2RlY29yYXRlKFtcbiAgICAvLyAgIE5nTW9kdWxlKHtcbiAgICAvLyAgICAgcHJvdmlkZXJzOiBbXSxcbiAgICAvLyAgIH0pXG4gICAgLy8gXSwgSHR0cENsaWVudFhzcmZNb2R1bGUpO1xuICAgIC8vIGBgYFxuICAgIC8vXG4gICAgLy8gQW5kIGZpbmFsbHksIGZpbmQgdGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBpZGVudGlmaWVyIGluIHRoYXQgYXJndW1lbnQuXG4gICAgLy8gTm90ZSBhbHNvIHRoYXQgdGhlIGFzc2lnbm1lbnQgY2FuIG9jY3VyIHdpdGhpbiBhbm90aGVyIGFzc2lnbm1lbnQuXG4gICAgLy9cbiAgICBjb25zdCBibG9jayA9IGRlY2xhcmF0aW9uLnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgIGlmIChzeW1ib2wgJiYgKHRzLmlzQmxvY2soYmxvY2spIHx8IHRzLmlzU291cmNlRmlsZShibG9jaykpKSB7XG4gICAgICBjb25zdCBkZWNvcmF0ZUNhbGwgPSB0aGlzLmZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKGJsb2NrLCBzeW1ib2wpO1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZGVjb3JhdGVDYWxsICYmIGRlY29yYXRlQ2FsbC5hcmd1bWVudHNbMV07XG4gICAgICBpZiAodGFyZ2V0ICYmIHRzLmlzSWRlbnRpZmllcih0YXJnZXQpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHRhcmdldCk7XG4gICAgICAgIGNvbnN0IHRhcmdldERlY2xhcmF0aW9uID0gdGFyZ2V0U3ltYm9sICYmIHRhcmdldFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgICBpZiAodGFyZ2V0RGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHRhcmdldERlY2xhcmF0aW9uKSB8fFxuICAgICAgICAgICAgICB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGp1c3QgYSBmdW5jdGlvbiBvciBjbGFzcyBkZWNsYXJhdGlvblxuICAgICAgICAgICAgLy8gc28gcmV0dXJuIGl0cyBpZGVudGlmaWVyIGFzIHRoZSB2YXJpYWJsZSB2YWx1ZS5cbiAgICAgICAgICAgIHJldHVybiB0YXJnZXREZWNsYXJhdGlvbi5uYW1lIHx8IG51bGw7XG4gICAgICAgICAgfSBlbHNlIGlmICh0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24odGFyZ2V0RGVjbGFyYXRpb24pKSB7XG4gICAgICAgICAgICAvLyBUaGUgdGFyZ2V0IGlzIGEgdmFyaWFibGUgZGVjbGFyYXRpb24sIHNvIGZpbmQgdGhlIGZhciByaWdodCBleHByZXNzaW9uLFxuICAgICAgICAgICAgLy8gaW4gdGhlIGNhc2Ugb2YgbXVsdGlwbGUgYXNzaWdubWVudHMgKGUuZy4gYHZhcjEgPSB2YXIyID0gdmFsdWVgKS5cbiAgICAgICAgICAgIGxldCB0YXJnZXRWYWx1ZSA9IHRhcmdldERlY2xhcmF0aW9uLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgd2hpbGUgKHRhcmdldFZhbHVlICYmIGlzQXNzaWdubWVudCh0YXJnZXRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgdGFyZ2V0VmFsdWUgPSB0YXJnZXRWYWx1ZS5yaWdodDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0YXJnZXRWYWx1ZSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0VmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZSBpZiBhbiBpZGVudGlmaWVyIHdhcyBpbXBvcnRlZCBmcm9tIGFub3RoZXIgbW9kdWxlIGFuZCByZXR1cm4gYEltcG9ydGAgbWV0YWRhdGFcbiAgICogZGVzY3JpYmluZyBpdHMgb3JpZ2luLlxuICAgKlxuICAgKiBAcGFyYW0gaWQgYSBUeXBlU2NyaXB0IGB0cy5JZGVudGlmZXJgIHRvIHJlZmxlY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIG1ldGFkYXRhIGFib3V0IHRoZSBgSW1wb3J0YCBpZiB0aGUgaWRlbnRpZmllciB3YXMgaW1wb3J0ZWQgZnJvbSBhbm90aGVyIG1vZHVsZSwgb3JcbiAgICogYG51bGxgIGlmIHRoZSBpZGVudGlmaWVyIGRvZXNuJ3QgcmVzb2x2ZSB0byBhbiBpbXBvcnQgYnV0IGluc3RlYWQgaXMgbG9jYWxseSBkZWZpbmVkLlxuICAgKi9cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIHJldHVybiBzdXBlci5nZXRJbXBvcnRPZklkZW50aWZpZXIoaWQpIHx8IHRoaXMuZ2V0SW1wb3J0T2ZOYW1lc3BhY2VkSWRlbnRpZmllcihpZCk7XG4gIH1cblxuICAvKlxuICAgKiBGaW5kIGFsbCB0aGUgZmlsZXMgYWNjZXNzaWJsZSB2aWEgYW4gZW50cnktcG9pbnQsIHRoYXQgY29udGFpbiBkZWNvcmF0ZWQgY2xhc3Nlcy5cbiAgICogQHBhcmFtIGVudHJ5UG9pbnQgVGhlIHN0YXJ0aW5nIHBvaW50IGZpbGUgZm9yIGZpbmRpbmcgZmlsZXMgdGhhdCBjb250YWluIGRlY29yYXRlZCBjbGFzc2VzLlxuICAgKiBAcmV0dXJucyBBIGNvbGxlY3Rpb24gb2YgZmlsZXMgb2JqZWN0cyB0aGF0IGhvbGQgaW5mbyBhYm91dCB0aGUgZGVjb3JhdGVkIGNsYXNzZXMgYW5kIGltcG9ydFxuICAgKiBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGZpbmREZWNvcmF0ZWRGaWxlcyhlbnRyeVBvaW50OiB0cy5Tb3VyY2VGaWxlKTogTWFwPHRzLlNvdXJjZUZpbGUsIERlY29yYXRlZEZpbGU+IHtcbiAgICBjb25zdCBtb2R1bGVTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihlbnRyeVBvaW50KTtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIERlY29yYXRlZEZpbGU+KCk7XG4gICAgaWYgKG1vZHVsZVN5bWJvbCkge1xuICAgICAgY29uc3QgZXhwb3J0ZWRTeW1ib2xzID1cbiAgICAgICAgICB0aGlzLmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZVN5bWJvbCkubWFwKGdldE9yaWdpbmFsU3ltYm9sKHRoaXMuY2hlY2tlcikpO1xuICAgICAgY29uc3QgZXhwb3J0ZWREZWNsYXJhdGlvbnMgPVxuICAgICAgICAgIGV4cG9ydGVkU3ltYm9scy5tYXAoZXhwb3J0U3ltYm9sID0+IGV4cG9ydFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKS5maWx0ZXIoaXNEZWZpbmVkKTtcblxuICAgICAgY29uc3QgZGVjb3JhdGVkQ2xhc3NlcyA9XG4gICAgICAgICAgZXhwb3J0ZWREZWNsYXJhdGlvbnNcbiAgICAgICAgICAgICAgLm1hcChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikgfHwgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGRlY2xhcmF0aW9uLm5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKGRlY2xhcmF0aW9uLm5hbWUpID9cbiAgICAgICAgICAgICAgICAgICAgICBkZWNsYXJhdGlvbi5uYW1lLnRleHQgOlxuICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBkZWNvcmF0b3JzICYmIGlzRGVmaW5lZChuYW1lKSA/XG4gICAgICAgICAgICAgICAgICAgICAgbmV3IERlY29yYXRlZENsYXNzKG5hbWUsIGRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG5cbiAgICAgIGRlY29yYXRlZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBjbGF6ei5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgIGlmICghbWFwLmhhcyhmaWxlKSkge1xuICAgICAgICAgIG1hcC5zZXQoZmlsZSwgbmV3IERlY29yYXRlZEZpbGUoZmlsZSkpO1xuICAgICAgICB9XG4gICAgICAgIG1hcC5nZXQoZmlsZSkgIS5kZWNvcmF0ZWRDbGFzc2VzLnB1c2goY2xhenopO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtYXA7XG4gIH1cblxuICAvLy8vLy8vLy8vLy8vIFByb3RlY3RlZCBIZWxwZXJzIC8vLy8vLy8vLy8vLy9cblxuICAvKipcbiAgICogV2FsayB0aGUgQVNUIGxvb2tpbmcgZm9yIGFuIGFzc2lnbm1lbnQgdG8gdGhlIHNwZWNpZmllZCBzeW1ib2wuXG4gICAqIEBwYXJhbSBub2RlIFRoZSBjdXJyZW50IG5vZGUgd2UgYXJlIHNlYXJjaGluZy5cbiAgICogQHJldHVybnMgYW4gZXhwcmVzc2lvbiB0aGF0IHJlcHJlc2VudHMgdGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZSwgb3IgdW5kZWZpbmVkIGlmIG5vbmUgY2FuIGJlXG4gICAqIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGZpbmREZWNvcmF0ZWRWYXJpYWJsZVZhbHVlKG5vZGU6IHRzLk5vZGV8dW5kZWZpbmVkLCBzeW1ib2w6IHRzLlN5bWJvbCk6XG4gICAgICB0cy5DYWxsRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUpICYmIG5vZGUub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICBjb25zdCBsZWZ0ID0gbm9kZS5sZWZ0O1xuICAgICAgY29uc3QgcmlnaHQgPSBub2RlLnJpZ2h0O1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihsZWZ0KSAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihsZWZ0KSA9PT0gc3ltYm9sKSB7XG4gICAgICAgIHJldHVybiAodHMuaXNDYWxsRXhwcmVzc2lvbihyaWdodCkgJiYgZ2V0Q2FsbGVlTmFtZShyaWdodCkgPT09ICdfX2RlY29yYXRlJykgPyByaWdodCA6IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShyaWdodCwgc3ltYm9sKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGUuZm9yRWFjaENoaWxkKG5vZGUgPT4gdGhpcy5maW5kRGVjb3JhdGVkVmFyaWFibGVWYWx1ZShub2RlLCBzeW1ib2wpKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byByZXRyaWV2ZSB0aGUgc3ltYm9sIG9mIGEgc3RhdGljIHByb3BlcnR5IG9uIGEgY2xhc3MuXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIGNsYXNzIHdob3NlIHByb3BlcnR5IHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcGFyYW0gcHJvcGVydHlOYW1lIHRoZSBuYW1lIG9mIHN0YXRpYyBwcm9wZXJ0eS5cbiAgICogQHJldHVybnMgdGhlIHN5bWJvbCBpZiBpdCBpcyBmb3VuZCBvciBgdW5kZWZpbmVkYCBpZiBub3QuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0U3RhdGljUHJvcGVydHkoc3ltYm9sOiB0cy5TeW1ib2wsIHByb3BlcnR5TmFtZTogdHMuX19TdHJpbmcpOiB0cy5TeW1ib2x8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc3ltYm9sLmV4cG9ydHMgJiYgc3ltYm9sLmV4cG9ydHMuZ2V0KHByb3BlcnR5TmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBjbGFzcyBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MsIHdoZXJlIHRoZSBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZFxuICAgKiB2aWEgYSBzdGF0aWMgcHJvcGVydHkuIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gICAqICAgeyB0eXBlOiBEaXJlY3RpdmUsIGFyZ3M6IFt7IHNlbGVjdG9yOiAnW3NvbWVEaXJlY3RpdmVdJyB9LF0gfVxuICAgKiBdO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGRlY29yYXRvcnNTeW1ib2wgdGhlIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGRlY29yYXRvcnMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgb3IgbnVsbCBpZiBub25lIHdoZXJlIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzRGVjb3JhdG9yc0Zyb21TdGF0aWNQcm9wZXJ0eShkZWNvcmF0b3JzU3ltYm9sOiB0cy5TeW1ib2wpOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzSWRlbnRpZmllciA9IGRlY29yYXRvcnNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICBpZiAoZGVjb3JhdG9yc0lkZW50aWZpZXIgJiYgZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSB7XG4gICAgICBpZiAodHMuaXNCaW5hcnlFeHByZXNzaW9uKGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkgJiZcbiAgICAgICAgICBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuKSB7XG4gICAgICAgIC8vIEFTVCBvZiB0aGUgYXJyYXkgb2YgZGVjb3JhdG9yIHZhbHVlc1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzQXJyYXkgPSBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQucmlnaHQ7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheSlcbiAgICAgICAgICAgIC5maWx0ZXIoZGVjb3JhdG9yID0+IHRoaXMuaXNGcm9tQ29yZShkZWNvcmF0b3IpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBjbGFzcyBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MsIHdoZXJlIHRoZSBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZFxuICAgKiB2aWEgdGhlIGBfX2RlY29yYXRlYCBoZWxwZXIgbWV0aG9kLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIGxldCBTb21lRGlyZWN0aXZlID0gY2xhc3MgU29tZURpcmVjdGl2ZSB7fVxuICAgKiBTb21lRGlyZWN0aXZlID0gX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBzeW1ib2wgdGhlIGNsYXNzIHdob3NlIGRlY29yYXRvcnMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvcnMgb3IgbnVsbCBpZiBub25lIHdoZXJlIGZvdW5kLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENsYXNzRGVjb3JhdG9yc0Zyb21IZWxwZXJDYWxsKHN5bWJvbDogdHMuU3ltYm9sKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3QgZGVjb3JhdG9yczogRGVjb3JhdG9yW10gPSBbXTtcbiAgICBjb25zdCBoZWxwZXJDYWxscyA9IHRoaXMuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhzeW1ib2wsICdfX2RlY29yYXRlJyk7XG4gICAgaGVscGVyQ2FsbHMuZm9yRWFjaChoZWxwZXJDYWxsID0+IHtcbiAgICAgIGNvbnN0IHtjbGFzc0RlY29yYXRvcnN9ID1cbiAgICAgICAgICB0aGlzLnJlZmxlY3REZWNvcmF0b3JzRnJvbUhlbHBlckNhbGwoaGVscGVyQ2FsbCwgbWFrZUNsYXNzVGFyZ2V0RmlsdGVyKHN5bWJvbC5uYW1lKSk7XG4gICAgICBjbGFzc0RlY29yYXRvcnMuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSlcbiAgICAgICAgICAuZm9yRWFjaChkZWNvcmF0b3IgPT4gZGVjb3JhdG9ycy5wdXNoKGRlY29yYXRvcikpO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWNvcmF0b3JzLmxlbmd0aCA/IGRlY29yYXRvcnMgOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgdGhlIG1lbWJlciBkZWNvcmF0b3JzIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgbWVtYmVyIGRlY29yYXRvcnMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEByZXR1cm5zIGEgbWFwIHdob3NlIGtleXMgYXJlIHRoZSBuYW1lIG9mIHRoZSBtZW1iZXJzIGFuZCB3aG9zZSB2YWx1ZXMgYXJlIGNvbGxlY3Rpb25zIG9mXG4gICAqIGRlY29yYXRvcnMgZm9yIHRoZSBnaXZlbiBtZW1iZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyRGVjb3JhdG9ycyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKTogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+IHtcbiAgICBjb25zdCBkZWNvcmF0b3JzUHJvcGVydHkgPSB0aGlzLmdldFN0YXRpY1Byb3BlcnR5KGNsYXNzU3ltYm9sLCBQUk9QX0RFQ09SQVRPUlMpO1xuICAgIGlmIChkZWNvcmF0b3JzUHJvcGVydHkpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldE1lbWJlckRlY29yYXRvcnNGcm9tU3RhdGljUHJvcGVydHkoZGVjb3JhdG9yc1Byb3BlcnR5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0TWVtYmVyRGVjb3JhdG9yc0Zyb21IZWxwZXJDYWxscyhjbGFzc1N5bWJvbCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1lbWJlciBkZWNvcmF0b3JzIG1heSBiZSBkZWNsYXJlZCBhcyBzdGF0aWMgcHJvcGVydGllcyBvZiB0aGUgY2xhc3M6XG4gICAqXG4gICAqIGBgYFxuICAgKiBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzID0ge1xuICAgKiAgIFwibmdGb3JPZlwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRyYWNrQnlcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiAgIFwibmdGb3JUZW1wbGF0ZVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqIH07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc1Byb3BlcnR5IHRoZSBjbGFzcyB3aG9zZSBtZW1iZXIgZGVjb3JhdG9ycyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYSBtYXAgd2hvc2Uga2V5cyBhcmUgdGhlIG5hbWUgb2YgdGhlIG1lbWJlcnMgYW5kIHdob3NlIHZhbHVlcyBhcmUgY29sbGVjdGlvbnMgb2ZcbiAgICogZGVjb3JhdG9ycyBmb3IgdGhlIGdpdmVuIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNZW1iZXJEZWNvcmF0b3JzRnJvbVN0YXRpY1Byb3BlcnR5KGRlY29yYXRvcnNQcm9wZXJ0eTogdHMuU3ltYm9sKTpcbiAgICAgIE1hcDxzdHJpbmcsIERlY29yYXRvcltdPiB7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICAvLyBTeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgZm9yIGBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzYC5cbiAgICBjb25zdCBwcm9wRGVjb3JhdG9yc01hcCA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKGRlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHByb3BEZWNvcmF0b3JzTWFwICYmIHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocHJvcERlY29yYXRvcnNNYXApKSB7XG4gICAgICBjb25zdCBwcm9wZXJ0aWVzTWFwID0gcmVmbGVjdE9iamVjdExpdGVyYWwocHJvcERlY29yYXRvcnNNYXApO1xuICAgICAgcHJvcGVydGllc01hcC5mb3JFYWNoKCh2YWx1ZSwgbmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID1cbiAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnModmFsdWUpLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGgpIHtcbiAgICAgICAgICBtZW1iZXJEZWNvcmF0b3JzLnNldChuYW1lLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXJEZWNvcmF0b3JzO1xuICB9XG5cbiAgLyoqXG4gICAqIE1lbWJlciBkZWNvcmF0b3JzIG1heSBiZSBkZWNsYXJlZCB2aWEgaGVscGVyIGNhbGwgc3RhdGVtZW50cy5cbiAgICpcbiAgICogYGBgXG4gICAqIF9fZGVjb3JhdGUoW1xuICAgKiAgICAgSW5wdXQoKSxcbiAgICogICAgIF9fbWV0YWRhdGEoXCJkZXNpZ246dHlwZVwiLCBTdHJpbmcpXG4gICAqIF0sIFNvbWVEaXJlY3RpdmUucHJvdG90eXBlLCBcImlucHV0MVwiLCB2b2lkIDApO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBtZW1iZXIgZGVjb3JhdG9ycyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYSBtYXAgd2hvc2Uga2V5cyBhcmUgdGhlIG5hbWUgb2YgdGhlIG1lbWJlcnMgYW5kIHdob3NlIHZhbHVlcyBhcmUgY29sbGVjdGlvbnMgb2ZcbiAgICogZGVjb3JhdG9ycyBmb3IgdGhlIGdpdmVuIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRNZW1iZXJEZWNvcmF0b3JzRnJvbUhlbHBlckNhbGxzKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4ge1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvck1hcCA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICBjb25zdCBoZWxwZXJDYWxscyA9IHRoaXMuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbCwgJ19fZGVjb3JhdGUnKTtcbiAgICBoZWxwZXJDYWxscy5mb3JFYWNoKGhlbHBlckNhbGwgPT4ge1xuICAgICAgY29uc3Qge21lbWJlckRlY29yYXRvcnN9ID0gdGhpcy5yZWZsZWN0RGVjb3JhdG9yc0Zyb21IZWxwZXJDYWxsKFxuICAgICAgICAgIGhlbHBlckNhbGwsIG1ha2VNZW1iZXJUYXJnZXRGaWx0ZXIoY2xhc3NTeW1ib2wubmFtZSkpO1xuICAgICAgbWVtYmVyRGVjb3JhdG9ycy5mb3JFYWNoKChkZWNvcmF0b3JzLCBtZW1iZXJOYW1lKSA9PiB7XG4gICAgICAgIGlmIChtZW1iZXJOYW1lKSB7XG4gICAgICAgICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG1lbWJlckRlY29yYXRvck1hcC5nZXQobWVtYmVyTmFtZSkgfHwgW107XG4gICAgICAgICAgY29uc3QgY29yZURlY29yYXRvcnMgPSBkZWNvcmF0b3JzLmZpbHRlcihkZWNvcmF0b3IgPT4gdGhpcy5pc0Zyb21Db3JlKGRlY29yYXRvcikpO1xuICAgICAgICAgIG1lbWJlckRlY29yYXRvck1hcC5zZXQobWVtYmVyTmFtZSwgbWVtYmVyRGVjb3JhdG9ycy5jb25jYXQoY29yZURlY29yYXRvcnMpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG1lbWJlckRlY29yYXRvck1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGRlY29yYXRvciBpbmZvIGZyb20gYF9fZGVjb3JhdGVgIGhlbHBlciBmdW5jdGlvbiBjYWxscy5cbiAgICogQHBhcmFtIGhlbHBlckNhbGwgdGhlIGNhbGwgdG8gYSBoZWxwZXIgdGhhdCBtYXkgY29udGFpbiBkZWNvcmF0b3IgY2FsbHNcbiAgICogQHBhcmFtIHRhcmdldEZpbHRlciBhIGZ1bmN0aW9uIHRvIGZpbHRlciBvdXQgdGFyZ2V0cyB0aGF0IHdlIGFyZSBub3QgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYSBtYXBwaW5nIGZyb20gbWVtYmVyIG5hbWUgdG8gZGVjb3JhdG9ycywgd2hlcmUgdGhlIGtleSBpcyBlaXRoZXIgdGhlIG5hbWUgb2YgdGhlXG4gICAqIG1lbWJlciBvciBgdW5kZWZpbmVkYCBpZiBpdCByZWZlcnMgdG8gZGVjb3JhdG9ycyBvbiB0aGUgY2xhc3MgYXMgYSB3aG9sZS5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0RGVjb3JhdG9yc0Zyb21IZWxwZXJDYWxsKFxuICAgICAgaGVscGVyQ2FsbDogdHMuQ2FsbEV4cHJlc3Npb24sIHRhcmdldEZpbHRlcjogVGFyZ2V0RmlsdGVyKTpcbiAgICAgIHtjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdLCBtZW1iZXJEZWNvcmF0b3JzOiBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT59IHtcbiAgICBjb25zdCBjbGFzc0RlY29yYXRvcnM6IERlY29yYXRvcltdID0gW107XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcblxuICAgIC8vIEZpcnN0IGNoZWNrIHRoYXQgdGhlIGB0YXJnZXRgIGFyZ3VtZW50IGlzIGNvcnJlY3RcbiAgICBpZiAodGFyZ2V0RmlsdGVyKGhlbHBlckNhbGwuYXJndW1lbnRzWzFdKSkge1xuICAgICAgLy8gR3JhYiB0aGUgYGRlY29yYXRvcnNgIGFyZ3VtZW50IHdoaWNoIHNob3VsZCBiZSBhbiBhcnJheSBvZiBjYWxsc1xuICAgICAgY29uc3QgZGVjb3JhdG9yQ2FsbHMgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1swXTtcbiAgICAgIGlmIChkZWNvcmF0b3JDYWxscyAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVjb3JhdG9yQ2FsbHMpKSB7XG4gICAgICAgIGRlY29yYXRvckNhbGxzLmVsZW1lbnRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgLy8gV2Ugb25seSBjYXJlIGFib3V0IHRob3NlIGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbCBjYWxsc1xuICAgICAgICAgIGlmICh0cy5pc0NhbGxFeHByZXNzaW9uKGVsZW1lbnQpKSB7XG4gICAgICAgICAgICBjb25zdCBkZWNvcmF0b3IgPSB0aGlzLnJlZmxlY3REZWNvcmF0b3JDYWxsKGVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKGRlY29yYXRvcikge1xuICAgICAgICAgICAgICBjb25zdCBrZXlBcmcgPSBoZWxwZXJDYWxsLmFyZ3VtZW50c1syXTtcbiAgICAgICAgICAgICAgY29uc3Qga2V5TmFtZSA9IGtleUFyZyAmJiB0cy5pc1N0cmluZ0xpdGVyYWwoa2V5QXJnKSA/IGtleUFyZy50ZXh0IDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgICBpZiAoa2V5TmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2xhc3NEZWNvcmF0b3JzLnB1c2goZGVjb3JhdG9yKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gbWVtYmVyRGVjb3JhdG9ycy5nZXQoa2V5TmFtZSkgfHwgW107XG4gICAgICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKGRlY29yYXRvcik7XG4gICAgICAgICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5zZXQoa2V5TmFtZSwgZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge2NsYXNzRGVjb3JhdG9ycywgbWVtYmVyRGVjb3JhdG9yc307XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCB0aGUgZGVjb3JhdG9yIGluZm9ybWF0aW9uIGZyb20gYSBjYWxsIHRvIGEgZGVjb3JhdG9yIGFzIGEgZnVuY3Rpb24uXG4gICAqIFRoaXMgaGFwcGVucyB3aGVuIHRoZSBkZWNvcmF0b3JzIGhhcyBiZWVuIHVzZWQgaW4gYSBgX19kZWNvcmF0ZWAgaGVscGVyIGNhbGwuXG4gICAqIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogX19kZWNvcmF0ZShbXG4gICAqICAgRGlyZWN0aXZlKHsgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0pLFxuICAgKiBdLCBTb21lRGlyZWN0aXZlKTtcbiAgICogYGBgXG4gICAqXG4gICAqIEhlcmUgdGhlIGBEaXJlY3RpdmVgIGRlY29yYXRvciBpcyBkZWNvcmF0aW5nIGBTb21lRGlyZWN0aXZlYCBhbmQgdGhlIG9wdGlvbnMgZm9yXG4gICAqIHRoZSBkZWNvcmF0b3IgYXJlIHBhc3NlZCBhcyBhcmd1bWVudHMgdG8gdGhlIGBEaXJlY3RpdmUoKWAgY2FsbC5cbiAgICpcbiAgICogQHBhcmFtIGNhbGwgdGhlIGNhbGwgdG8gdGhlIGRlY29yYXRvci5cbiAgICogQHJldHVybnMgYSBkZWNvcmF0b3IgY29udGFpbmluZyB0aGUgcmVmbGVjdGVkIGluZm9ybWF0aW9uLCBvciBudWxsIGlmIHRoZSBjYWxsXG4gICAqIGlzIG5vdCBhIHZhbGlkIGRlY29yYXRvciBjYWxsLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JDYWxsKGNhbGw6IHRzLkNhbGxFeHByZXNzaW9uKTogRGVjb3JhdG9yfG51bGwge1xuICAgIC8vIFRoZSBjYWxsIGNvdWxkIGJlIG9mIHRoZSBmb3JtIGBEZWNvcmF0b3IoLi4uKWAgb3IgYG5hbWVzcGFjZV8xLkRlY29yYXRvciguLi4pYFxuICAgIGNvbnN0IGRlY29yYXRvckV4cHJlc3Npb24gPVxuICAgICAgICB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24pID8gY2FsbC5leHByZXNzaW9uLm5hbWUgOiBjYWxsLmV4cHJlc3Npb247XG4gICAgaWYgKHRzLmlzSWRlbnRpZmllcihkZWNvcmF0b3JFeHByZXNzaW9uKSkge1xuICAgICAgLy8gV2UgZm91bmQgYSBkZWNvcmF0b3IhXG4gICAgICBjb25zdCBkZWNvcmF0b3JJZGVudGlmaWVyID0gZGVjb3JhdG9yRXhwcmVzc2lvbjtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IGRlY29yYXRvcklkZW50aWZpZXIudGV4dCxcbiAgICAgICAgaWRlbnRpZmllcjogZGVjb3JhdG9ySWRlbnRpZmllcixcbiAgICAgICAgaW1wb3J0OiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWNvcmF0b3JJZGVudGlmaWVyKSxcbiAgICAgICAgbm9kZTogY2FsbCxcbiAgICAgICAgYXJnczogQXJyYXkuZnJvbShjYWxsLmFyZ3VtZW50cylcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHRoZSBnaXZlbiBzdGF0ZW1lbnQgdG8gc2VlIGlmIGl0IGlzIGEgY2FsbCB0byB0aGUgc3BlY2lmaWVkIGhlbHBlciBmdW5jdGlvbiBvciBudWxsIGlmXG4gICAqIG5vdCBmb3VuZC5cbiAgICpcbiAgICogTWF0Y2hpbmcgc3RhdGVtZW50cyB3aWxsIGxvb2sgbGlrZTogIGB0c2xpYl8xLl9fZGVjb3JhdGUoLi4uKTtgLlxuICAgKiBAcGFyYW0gc3RhdGVtZW50IHRoZSBzdGF0ZW1lbnQgdGhhdCBtYXkgY29udGFpbiB0aGUgY2FsbC5cbiAgICogQHBhcmFtIGhlbHBlck5hbWUgdGhlIG5hbWUgb2YgdGhlIGhlbHBlciB3ZSBhcmUgbG9va2luZyBmb3IuXG4gICAqIEByZXR1cm5zIHRoZSBub2RlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIGBfX2RlY29yYXRlKC4uLilgIGNhbGwgb3IgbnVsbCBpZiB0aGUgc3RhdGVtZW50IGRvZXNcbiAgICogbm90IG1hdGNoLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldEhlbHBlckNhbGwoc3RhdGVtZW50OiB0cy5TdGF0ZW1lbnQsIGhlbHBlck5hbWU6IHN0cmluZyk6IHRzLkNhbGxFeHByZXNzaW9ufG51bGwge1xuICAgIGlmICh0cy5pc0V4cHJlc3Npb25TdGF0ZW1lbnQoc3RhdGVtZW50KSkge1xuICAgICAgY29uc3QgZXhwcmVzc2lvbiA9XG4gICAgICAgICAgaXNBc3NpZ25tZW50U3RhdGVtZW50KHN0YXRlbWVudCkgPyBzdGF0ZW1lbnQuZXhwcmVzc2lvbi5yaWdodCA6IHN0YXRlbWVudC5leHByZXNzaW9uO1xuICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24oZXhwcmVzc2lvbikgJiYgZ2V0Q2FsbGVlTmFtZShleHByZXNzaW9uKSA9PT0gaGVscGVyTmFtZSkge1xuICAgICAgICByZXR1cm4gZXhwcmVzc2lvbjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgZ2l2ZW4gYXJyYXkgbm9kZSBhbmQgZXh0cmFjdCBkZWNvcmF0b3IgaW5mb3JtYXRpb24gZnJvbSBlYWNoIGVsZW1lbnQuXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCBmb3IgZGVjb3JhdG9ycyB0aGF0IGFyZSBkZWZpbmVkIGluIHN0YXRpYyBwcm9wZXJ0aWVzLiBGb3IgZXhhbXBsZTpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9ycyA9IFtcbiAgICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gICAqIF07XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yc0FycmF5IGFuIGV4cHJlc3Npb24gdGhhdCBjb250YWlucyBkZWNvcmF0b3IgaW5mb3JtYXRpb24uXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGRlY29yYXRvciBpbmZvIHRoYXQgd2FzIHJlZmxlY3RlZCBmcm9tIHRoZSBhcnJheSBub2RlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlZmxlY3REZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheTogdHMuRXhwcmVzc2lvbik6IERlY29yYXRvcltdIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSA9IFtdO1xuXG4gICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZWNvcmF0b3JzQXJyYXkpKSB7XG4gICAgICAvLyBBZGQgZWFjaCBkZWNvcmF0b3IgdGhhdCBpcyBpbXBvcnRlZCBmcm9tIGBAYW5ndWxhci9jb3JlYCBpbnRvIHRoZSBgZGVjb3JhdG9yc2AgYXJyYXlcbiAgICAgIGRlY29yYXRvcnNBcnJheS5lbGVtZW50cy5mb3JFYWNoKG5vZGUgPT4ge1xuXG4gICAgICAgIC8vIElmIHRoZSBkZWNvcmF0b3IgaXMgbm90IGFuIG9iamVjdCBsaXRlcmFsIGV4cHJlc3Npb24gdGhlbiB3ZSBhcmUgbm90IGludGVyZXN0ZWRcbiAgICAgICAgaWYgKHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgICAgICAvLyBXZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIG9iamVjdHMgb2YgdGhlIGZvcm06IGB7IHR5cGU6IERlY29yYXRvclR5cGUsIGFyZ3M6IFsuLi5dIH1gXG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9yID0gcmVmbGVjdE9iamVjdExpdGVyYWwobm9kZSk7XG5cbiAgICAgICAgICAvLyBJcyB0aGUgdmFsdWUgb2YgdGhlIGB0eXBlYCBwcm9wZXJ0eSBhbiBpZGVudGlmaWVyP1xuICAgICAgICAgIGNvbnN0IHR5cGVJZGVudGlmaWVyID0gZGVjb3JhdG9yLmdldCgndHlwZScpO1xuICAgICAgICAgIGlmICh0eXBlSWRlbnRpZmllciAmJiB0cy5pc0lkZW50aWZpZXIodHlwZUlkZW50aWZpZXIpKSB7XG4gICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goe1xuICAgICAgICAgICAgICBuYW1lOiB0eXBlSWRlbnRpZmllci50ZXh0LFxuICAgICAgICAgICAgICBpZGVudGlmaWVyOiB0eXBlSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgaW1wb3J0OiB0aGlzLmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlSWRlbnRpZmllciksIG5vZGUsXG4gICAgICAgICAgICAgIGFyZ3M6IGdldERlY29yYXRvckFyZ3Mobm9kZSksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWZsZWN0IG92ZXIgYSBzeW1ib2wgYW5kIGV4dHJhY3QgdGhlIG1lbWJlciBpbmZvcm1hdGlvbiwgY29tYmluaW5nIGl0IHdpdGggdGhlXG4gICAqIHByb3ZpZGVkIGRlY29yYXRvciBpbmZvcm1hdGlvbiwgYW5kIHdoZXRoZXIgaXQgaXMgYSBzdGF0aWMgbWVtYmVyLlxuICAgKiBAcGFyYW0gc3ltYm9sIHRoZSBzeW1ib2wgZm9yIHRoZSBtZW1iZXIgdG8gcmVmbGVjdCBvdmVyLlxuICAgKiBAcGFyYW0gZGVjb3JhdG9ycyBhbiBhcnJheSBvZiBkZWNvcmF0b3JzIGFzc29jaWF0ZWQgd2l0aCB0aGUgbWVtYmVyLlxuICAgKiBAcGFyYW0gaXNTdGF0aWMgdHJ1ZSBpZiB0aGlzIG1lbWJlciBpcyBzdGF0aWMsIGZhbHNlIGlmIGl0IGlzIGFuIGluc3RhbmNlIHByb3BlcnR5LlxuICAgKiBAcmV0dXJucyB0aGUgcmVmbGVjdGVkIG1lbWJlciBpbmZvcm1hdGlvbiwgb3IgbnVsbCBpZiB0aGUgc3ltYm9sIGlzIG5vdCBhIG1lbWJlci5cbiAgICovXG4gIHByb3RlY3RlZCByZWZsZWN0TWVtYmVyKHN5bWJvbDogdHMuU3ltYm9sLCBkZWNvcmF0b3JzPzogRGVjb3JhdG9yW10sIGlzU3RhdGljPzogYm9vbGVhbik6XG4gICAgICBDbGFzc01lbWJlcnxudWxsIHtcbiAgICBsZXQga2luZDogQ2xhc3NNZW1iZXJLaW5kfG51bGwgPSBudWxsO1xuICAgIGxldCB2YWx1ZTogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBsZXQgbmFtZTogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGxldCBuYW1lTm9kZTogdHMuSWRlbnRpZmllcnxudWxsID0gbnVsbDtcbiAgICBsZXQgdHlwZSA9IG51bGw7XG5cblxuICAgIGNvbnN0IG5vZGUgPSBzeW1ib2wudmFsdWVEZWNsYXJhdGlvbiB8fCBzeW1ib2wuZGVjbGFyYXRpb25zICYmIHN5bWJvbC5kZWNsYXJhdGlvbnNbMF07XG4gICAgaWYgKCFub2RlIHx8ICFpc0NsYXNzTWVtYmVyVHlwZShub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLk1ldGhvZCkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5NZXRob2Q7XG4gICAgfSBlbHNlIGlmIChzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5Qcm9wZXJ0eSkge1xuICAgICAga2luZCA9IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkdldEFjY2Vzc29yKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLkdldHRlcjtcbiAgICB9IGVsc2UgaWYgKHN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLlNldEFjY2Vzc29yKSB7XG4gICAgICBraW5kID0gQ2xhc3NNZW1iZXJLaW5kLlNldHRlcjtcbiAgICB9XG5cbiAgICBpZiAoaXNTdGF0aWMgJiYgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSkge1xuICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgdmFsdWUgPSBzeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5Qcm9wZXJ0eSA/IG5vZGUucGFyZW50LnJpZ2h0IDogbnVsbDtcbiAgICB9IGVsc2UgaWYgKGlzVGhpc0Fzc2lnbm1lbnQobm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG4gICAgICBuYW1lID0gbm9kZS5sZWZ0Lm5hbWUudGV4dDtcbiAgICAgIHZhbHVlID0gbm9kZS5yaWdodDtcbiAgICAgIGlzU3RhdGljID0gZmFsc2U7XG4gICAgfSBlbHNlIGlmICh0cy5pc0NvbnN0cnVjdG9yRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIGtpbmQgPSBDbGFzc01lbWJlcktpbmQuQ29uc3RydWN0b3I7XG4gICAgICBuYW1lID0gJ2NvbnN0cnVjdG9yJztcbiAgICAgIGlzU3RhdGljID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGtpbmQgPT09IG51bGwpIHtcbiAgICAgIGNvbnNvbGUud2FybihgVW5rbm93biBtZW1iZXIgdHlwZTogXCIke25vZGUuZ2V0VGV4dCgpfWApO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBpZiAoaXNOYW1lZERlY2xhcmF0aW9uKG5vZGUpICYmIG5vZGUubmFtZSAmJiB0cy5pc0lkZW50aWZpZXIobm9kZS5uYW1lKSkge1xuICAgICAgICBuYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgICAgIG5hbWVOb2RlID0gbm9kZS5uYW1lO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgaGF2ZSBzdGlsbCBub3QgZGV0ZXJtaW5lZCBpZiB0aGlzIGlzIGEgc3RhdGljIG9yIGluc3RhbmNlIG1lbWJlciB0aGVuXG4gICAgLy8gbG9vayBmb3IgdGhlIGBzdGF0aWNgIGtleXdvcmQgb24gdGhlIGRlY2xhcmF0aW9uXG4gICAgaWYgKGlzU3RhdGljID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlzU3RhdGljID0gbm9kZS5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIG5vZGUubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0YXRpY0tleXdvcmQpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBub2RlLFxuICAgICAgaW1wbGVtZW50YXRpb246IG5vZGUsIGtpbmQsIHR5cGUsIG5hbWUsIG5hbWVOb2RlLCB2YWx1ZSwgaXNTdGF0aWMsXG4gICAgICBkZWNvcmF0b3JzOiBkZWNvcmF0b3JzIHx8IFtdXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVycyB3ZSB3YW50IHRvIGZpbmQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbmAgb2JqZWN0cyByZXByZXNlbnRpbmcgZWFjaCBvZiB0aGUgcGFyYW1ldGVycyBpblxuICAgKiB0aGUgY2xhc3MncyBjb25zdHJ1Y3RvciBvciBudWxsIGlmIHRoZXJlIGlzIG5vIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpOlxuICAgICAgdHMuUGFyYW1ldGVyRGVjbGFyYXRpb25bXXxudWxsIHtcbiAgICBjb25zdCBjb25zdHJ1Y3RvclN5bWJvbCA9IGNsYXNzU3ltYm9sLm1lbWJlcnMgJiYgY2xhc3NTeW1ib2wubWVtYmVycy5nZXQoQ09OU1RSVUNUT1IpO1xuICAgIGlmIChjb25zdHJ1Y3RvclN5bWJvbCkge1xuICAgICAgLy8gRm9yIHNvbWUgcmVhc29uIHRoZSBjb25zdHJ1Y3RvciBkb2VzIG5vdCBoYXZlIGEgYHZhbHVlRGVjbGFyYXRpb25gID8hP1xuICAgICAgY29uc3QgY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnMgJiZcbiAgICAgICAgICBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnNbMF0gYXMgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbjtcbiAgICAgIGlmIChjb25zdHJ1Y3RvciAmJiBjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmFtZXRlciBkZWNvcmF0b3JzIG9mIGEgY2xhc3MgY29uc3RydWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEBwYXJhbSBwYXJhbWV0ZXJOb2RlcyB0aGUgYXJyYXkgb2YgVHlwZVNjcmlwdCBwYXJhbWV0ZXIgbm9kZXMgZm9yIHRoaXMgY2xhc3MncyBjb25zdHJ1Y3Rvci5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgY29uc3RydWN0b3IgcGFyYW1ldGVyIGluZm8gb2JqZWN0cy5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRDb25zdHJ1Y3RvclBhcmFtSW5mbyhcbiAgICAgIGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wsIHBhcmFtZXRlck5vZGVzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdKTogQ3RvclBhcmFtZXRlcltdIHtcbiAgICBjb25zdCBwYXJhbXNQcm9wZXJ0eSA9IHRoaXMuZ2V0U3RhdGljUHJvcGVydHkoY2xhc3NTeW1ib2wsIENPTlNUUlVDVE9SX1BBUkFNUyk7XG4gICAgY29uc3QgcGFyYW1JbmZvOiBQYXJhbUluZm9bXXxudWxsID0gcGFyYW1zUHJvcGVydHkgP1xuICAgICAgICB0aGlzLmdldFBhcmFtSW5mb0Zyb21TdGF0aWNQcm9wZXJ0eShwYXJhbXNQcm9wZXJ0eSkgOlxuICAgICAgICB0aGlzLmdldFBhcmFtSW5mb0Zyb21IZWxwZXJDYWxsKGNsYXNzU3ltYm9sLCBwYXJhbWV0ZXJOb2Rlcyk7XG5cbiAgICByZXR1cm4gcGFyYW1ldGVyTm9kZXMubWFwKChub2RlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3Qge2RlY29yYXRvcnMsIHR5cGV9ID1cbiAgICAgICAgICBwYXJhbUluZm8gJiYgcGFyYW1JbmZvW2luZGV4XSA/IHBhcmFtSW5mb1tpbmRleF0gOiB7ZGVjb3JhdG9yczogbnVsbCwgdHlwZTogbnVsbH07XG4gICAgICBjb25zdCBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgIHJldHVybiB7bmFtZTogZ2V0TmFtZVRleHQobmFtZU5vZGUpLCBuYW1lTm9kZSwgdHlwZSwgZGVjb3JhdG9yc307XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJhbWV0ZXIgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgdGhlIGNvbnN0cnVjdG9yIG9mIGEgY2xhc3MsXG4gICAqIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgb24gYSBzdGF0aWMgbWV0aG9kIG9mIHRoZSBjbGFzcy5cbiAgICpcbiAgICogTm90ZSB0aGF0IGluIEVTTTIwMTUsIHRoZSBtZXRob2QgaXMgZGVmaW5lZCBieSBhbiBhcnJvdyBmdW5jdGlvbiB0aGF0IHJldHVybnMgYW4gYXJyYXkgb2ZcbiAgICogZGVjb3JhdG9yIGFuZCB0eXBlIGluZm9ybWF0aW9uLlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAgICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gICAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAgICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAgICogXTtcbiAgICogYGBgXG4gICAqXG4gICAqIEBwYXJhbSBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSB0aGUgcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyB0aGUgdHlwZSBhbmQgZGVjb3JhdG9ycyBmb3IgZWFjaCBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0UGFyYW1JbmZvRnJvbVN0YXRpY1Byb3BlcnR5KHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5OiB0cy5TeW1ib2wpOiBQYXJhbUluZm9bXXxudWxsIHtcbiAgICBjb25zdCBwYXJhbURlY29yYXRvcnMgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSk7XG4gICAgaWYgKHBhcmFtRGVjb3JhdG9ycyAmJiB0cy5pc0Fycm93RnVuY3Rpb24ocGFyYW1EZWNvcmF0b3JzKSkge1xuICAgICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihwYXJhbURlY29yYXRvcnMuYm9keSkpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSBwYXJhbURlY29yYXRvcnMuYm9keS5lbGVtZW50cztcbiAgICAgICAgcmV0dXJuIGVsZW1lbnRzXG4gICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbClcbiAgICAgICAgICAgIC5tYXAocGFyYW1JbmZvID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgdHlwZSA9IHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uZ2V0KCd0eXBlJykgfHwgbnVsbDtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ySW5mbyA9IHBhcmFtSW5mbyAmJiBwYXJhbUluZm8uZ2V0KCdkZWNvcmF0b3JzJykgfHwgbnVsbDtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGRlY29yYXRvckluZm8gJiZcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnMoZGVjb3JhdG9ySW5mbylcbiAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGRlY29yYXRvciA9PiB0aGlzLmlzRnJvbUNvcmUoZGVjb3JhdG9yKSk7XG4gICAgICAgICAgICAgIHJldHVybiB7dHlwZSwgZGVjb3JhdG9yc307XG4gICAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJtZXRlciB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciBhIGNsYXNzIHdoZXJlIHRoZSBpbmZvcm1hdGlvbiBpcyBzdG9yZWQgb25cbiAgICogaW4gY2FsbHMgdG8gYF9fZGVjb3JhdGVgIGhlbHBlcnMuXG4gICAqXG4gICAqIFJlZmxlY3Qgb3ZlciB0aGUgaGVscGVycyB0byBmaW5kIHRoZSBkZWNvcmF0b3JzIGFuZCB0eXBlcyBhYm91dCBlYWNoIG9mXG4gICAqIHRoZSBjbGFzcydzIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgcGFyYW1ldGVyIGluZm8gd2Ugd2FudCB0byBnZXQuXG4gICAqIEBwYXJhbSBwYXJhbWV0ZXJOb2RlcyB0aGUgYXJyYXkgb2YgVHlwZVNjcmlwdCBwYXJhbWV0ZXIgbm9kZXMgZm9yIHRoaXMgY2xhc3MncyBjb25zdHJ1Y3Rvci5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIHRoZSB0eXBlIGFuZCBkZWNvcmF0b3JzIGZvciBlYWNoIHBhcmFtZXRlci5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRQYXJhbUluZm9Gcm9tSGVscGVyQ2FsbChcbiAgICAgIGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wsIHBhcmFtZXRlck5vZGVzOiB0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbltdKTogUGFyYW1JbmZvW10ge1xuICAgIGNvbnN0IHBhcmFtZXRlcnM6IFBhcmFtSW5mb1tdID0gcGFyYW1ldGVyTm9kZXMubWFwKCgpID0+ICh7dHlwZTogbnVsbCwgZGVjb3JhdG9yczogbnVsbH0pKTtcbiAgICBjb25zdCBoZWxwZXJDYWxscyA9IHRoaXMuZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbCwgJ19fZGVjb3JhdGUnKTtcbiAgICBoZWxwZXJDYWxscy5mb3JFYWNoKGhlbHBlckNhbGwgPT4ge1xuICAgICAgY29uc3Qge2NsYXNzRGVjb3JhdG9yc30gPVxuICAgICAgICAgIHRoaXMucmVmbGVjdERlY29yYXRvcnNGcm9tSGVscGVyQ2FsbChoZWxwZXJDYWxsLCBtYWtlQ2xhc3NUYXJnZXRGaWx0ZXIoY2xhc3NTeW1ib2wubmFtZSkpO1xuICAgICAgY2xhc3NEZWNvcmF0b3JzLmZvckVhY2goY2FsbCA9PiB7XG4gICAgICAgIHN3aXRjaCAoY2FsbC5uYW1lKSB7XG4gICAgICAgICAgY2FzZSAnX19tZXRhZGF0YSc6XG4gICAgICAgICAgICBjb25zdCBtZXRhZGF0YUFyZyA9IGNhbGwuYXJncyAmJiBjYWxsLmFyZ3NbMF07XG4gICAgICAgICAgICBjb25zdCB0eXBlc0FyZyA9IGNhbGwuYXJncyAmJiBjYWxsLmFyZ3NbMV07XG4gICAgICAgICAgICBjb25zdCBpc1BhcmFtVHlwZURlY29yYXRvciA9IG1ldGFkYXRhQXJnICYmIHRzLmlzU3RyaW5nTGl0ZXJhbChtZXRhZGF0YUFyZykgJiZcbiAgICAgICAgICAgICAgICBtZXRhZGF0YUFyZy50ZXh0ID09PSAnZGVzaWduOnBhcmFtdHlwZXMnO1xuICAgICAgICAgICAgY29uc3QgdHlwZXMgPSB0eXBlc0FyZyAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24odHlwZXNBcmcpICYmIHR5cGVzQXJnLmVsZW1lbnRzO1xuICAgICAgICAgICAgaWYgKGlzUGFyYW1UeXBlRGVjb3JhdG9yICYmIHR5cGVzKSB7XG4gICAgICAgICAgICAgIHR5cGVzLmZvckVhY2goKHR5cGUsIGluZGV4KSA9PiBwYXJhbWV0ZXJzW2luZGV4XS50eXBlID0gdHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdfX3BhcmFtJzpcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtSW5kZXhBcmcgPSBjYWxsLmFyZ3MgJiYgY2FsbC5hcmdzWzBdO1xuICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9yQ2FsbEFyZyA9IGNhbGwuYXJncyAmJiBjYWxsLmFyZ3NbMV07XG4gICAgICAgICAgICBjb25zdCBwYXJhbUluZGV4ID0gcGFyYW1JbmRleEFyZyAmJiB0cy5pc051bWVyaWNMaXRlcmFsKHBhcmFtSW5kZXhBcmcpID9cbiAgICAgICAgICAgICAgICBwYXJzZUludChwYXJhbUluZGV4QXJnLnRleHQsIDEwKSA6XG4gICAgICAgICAgICAgICAgTmFOO1xuICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9yID0gZGVjb3JhdG9yQ2FsbEFyZyAmJiB0cy5pc0NhbGxFeHByZXNzaW9uKGRlY29yYXRvckNhbGxBcmcpID9cbiAgICAgICAgICAgICAgICB0aGlzLnJlZmxlY3REZWNvcmF0b3JDYWxsKGRlY29yYXRvckNhbGxBcmcpIDpcbiAgICAgICAgICAgICAgICBudWxsO1xuICAgICAgICAgICAgaWYgKCFpc05hTihwYXJhbUluZGV4KSAmJiBkZWNvcmF0b3IpIHtcbiAgICAgICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IHBhcmFtZXRlcnNbcGFyYW1JbmRleF0uZGVjb3JhdG9ycyA9XG4gICAgICAgICAgICAgICAgICBwYXJhbWV0ZXJzW3BhcmFtSW5kZXhdLmRlY29yYXRvcnMgfHwgW107XG4gICAgICAgICAgICAgIGRlY29yYXRvcnMucHVzaChkZWNvcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBwYXJhbWV0ZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCBzdGF0ZW1lbnRzIHJlbGF0ZWQgdG8gdGhlIGdpdmVuIGNsYXNzIGZvciBjYWxscyB0byB0aGUgc3BlY2lmaWVkIGhlbHBlci5cbiAgICogQHBhcmFtIGNsYXNzU3ltYm9sIHRoZSBjbGFzcyB3aG9zZSBoZWxwZXIgY2FsbHMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqIEBwYXJhbSBoZWxwZXJOYW1lIHRoZSBuYW1lIG9mIHRoZSBoZWxwZXIgKGUuZy4gYF9fZGVjb3JhdGVgKSB3aG9zZSBjYWxscyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgQ2FsbEV4cHJlc3Npb24gbm9kZXMgZm9yIGVhY2ggbWF0Y2hpbmcgaGVscGVyIGNhbGwuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0SGVscGVyQ2FsbHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sLCBoZWxwZXJOYW1lOiBzdHJpbmcpOlxuICAgICAgdHMuQ2FsbEV4cHJlc3Npb25bXSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGVtZW50c0ZvckNsYXNzKGNsYXNzU3ltYm9sKVxuICAgICAgICAubWFwKHN0YXRlbWVudCA9PiB0aGlzLmdldEhlbHBlckNhbGwoc3RhdGVtZW50LCBoZWxwZXJOYW1lKSlcbiAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmQgc3RhdGVtZW50cyByZWxhdGVkIHRvIHRoZSBnaXZlbiBjbGFzcyB0aGF0IG1heSBjb250YWluIGNhbGxzIHRvIGEgaGVscGVyLlxuICAgKlxuICAgKiBJbiBFU00yMDE1IGNvZGUgdGhlIGhlbHBlciBjYWxscyBhcmUgaW4gdGhlIHRvcCBsZXZlbCBtb2R1bGUsIHNvIHdlIGhhdmUgdG8gY29uc2lkZXJcbiAgICogYWxsIHRoZSBzdGF0ZW1lbnRzIGluIHRoZSBtb2R1bGUuXG4gICAqXG4gICAqIEBwYXJhbSBjbGFzc1N5bWJvbCB0aGUgY2xhc3Mgd2hvc2UgaGVscGVyIGNhbGxzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBzdGF0ZW1lbnRzIHRoYXQgbWF5IGNvbnRhaW4gaGVscGVyIGNhbGxzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGdldFN0YXRlbWVudHNGb3JDbGFzcyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKTogdHMuU3RhdGVtZW50W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLnN0YXRlbWVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byBnZXQgdGhlIGltcG9ydCBpbmZvIGZvciB0aGlzIGlkZW50aWZpZXIgYXMgdGhvdWdoIGl0IGlzIGEgbmFtZXNwYWNlZCBpbXBvcnQuXG4gICAqIEZvciBleGFtcGxlLCBpZiB0aGUgaWRlbnRpZmllciBpcyB0aGUgYF9fbWV0YWRhdGFgIHBhcnQgb2YgYSBwcm9wZXJ0eSBhY2Nlc3MgY2hhaW4gbGlrZTpcbiAgICpcbiAgICogYGBgXG4gICAqIHRzbGliXzEuX19tZXRhZGF0YVxuICAgKiBgYGBcbiAgICpcbiAgICogdGhlbiBpdCBtaWdodCBiZSB0aGF0IGB0c2xpYl8xYCBpcyBhIG5hbWVzcGFjZSBpbXBvcnQgc3VjaCBhczpcbiAgICpcbiAgICogYGBgXG4gICAqIGltcG9ydCAqIGFzIHRzbGliXzEgZnJvbSAndHNsaWInO1xuICAgKiBgYGBcbiAgICogQHBhcmFtIGlkIHRoZSBUeXBlU2NyaXB0IGlkZW50aWZpZXIgdG8gZmluZCB0aGUgaW1wb3J0IGluZm8gZm9yLlxuICAgKiBAcmV0dXJucyBUaGUgaW1wb3J0IGluZm8gaWYgdGhpcyBpcyBhIG5hbWVzcGFjZWQgaW1wb3J0IG9yIGBudWxsYC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRJbXBvcnRPZk5hbWVzcGFjZWRJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIGlmICghKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGlkLnBhcmVudCkgJiYgaWQucGFyZW50Lm5hbWUgPT09IGlkKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZXNwYWNlSWRlbnRpZmllciA9IGdldEZhckxlZnRJZGVudGlmaWVyKGlkLnBhcmVudCk7XG4gICAgY29uc3QgbmFtZXNwYWNlU3ltYm9sID1cbiAgICAgICAgbmFtZXNwYWNlSWRlbnRpZmllciAmJiB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihuYW1lc3BhY2VJZGVudGlmaWVyKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbiA9IG5hbWVzcGFjZVN5bWJvbCAmJiBuYW1lc3BhY2VTeW1ib2wuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSA/XG4gICAgICAgIG5hbWVzcGFjZVN5bWJvbC5kZWNsYXJhdGlvbnNbMF0gOlxuICAgICAgICBudWxsO1xuICAgIGNvbnN0IG5hbWVzcGFjZURlY2xhcmF0aW9uID1cbiAgICAgICAgZGVjbGFyYXRpb24gJiYgdHMuaXNOYW1lc3BhY2VJbXBvcnQoZGVjbGFyYXRpb24pID8gZGVjbGFyYXRpb24gOiBudWxsO1xuICAgIGlmICghbmFtZXNwYWNlRGVjbGFyYXRpb24pIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydERlY2xhcmF0aW9uID0gbmFtZXNwYWNlRGVjbGFyYXRpb24ucGFyZW50LnBhcmVudDtcbiAgICBpZiAoIXRzLmlzU3RyaW5nTGl0ZXJhbChpbXBvcnREZWNsYXJhdGlvbi5tb2R1bGVTcGVjaWZpZXIpKSB7XG4gICAgICAvLyBTaG91bGQgbm90IGhhcHBlbiBhcyB0aGlzIHdvdWxkIGJlIGludmFsaWQgVHlwZXNTY3JpcHRcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBmcm9tOiBpbXBvcnREZWNsYXJhdGlvbi5tb2R1bGVTcGVjaWZpZXIudGV4dCxcbiAgICAgIG5hbWU6IGlkLnRleHQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZXN0IHdoZXRoZXIgYSBkZWNvcmF0b3Igd2FzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgLlxuICAgKlxuICAgKiBJcyB0aGUgZGVjb3JhdG9yOlxuICAgKiAqIGV4dGVybmFsbHkgaW1wb3J0ZWQgZnJvbSBgQGFuZ3VsYXJlL2NvcmVgP1xuICAgKiAqIHRoZSBjdXJyZW50IGhvc3RlZCBwcm9ncmFtIGlzIGFjdHVhbGx5IGBAYW5ndWxhci9jb3JlYCBhbmRcbiAgICogICAtIHJlbGF0aXZlbHkgaW50ZXJuYWxseSBpbXBvcnRlZDsgb3JcbiAgICogICAtIG5vdCBpbXBvcnRlZCwgZnJvbSB0aGUgY3VycmVudCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZGVjb3JhdG9yIHRoZSBkZWNvcmF0b3IgdG8gdGVzdC5cbiAgICovXG4gIGlzRnJvbUNvcmUoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5pc0NvcmUpIHtcbiAgICAgIHJldHVybiAhZGVjb3JhdG9yLmltcG9ydCB8fCAvXlxcLi8udGVzdChkZWNvcmF0b3IuaW1wb3J0LmZyb20pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gISFkZWNvcmF0b3IuaW1wb3J0ICYmIGRlY29yYXRvci5pbXBvcnQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xuICAgIH1cbiAgfVxufVxuXG4vLy8vLy8vLy8vLy8vIEV4cG9ydGVkIEhlbHBlcnMgLy8vLy8vLy8vLy8vL1xuXG5leHBvcnQgdHlwZSBQYXJhbUluZm8gPSB7XG4gIGRlY29yYXRvcnM6IERlY29yYXRvcltdIHwgbnVsbCxcbiAgdHlwZTogdHMuRXhwcmVzc2lvbiB8IG51bGxcbn07XG5cbi8qKlxuICogQSBzdGF0ZW1lbnQgbm9kZSB0aGF0IHJlcHJlc2VudHMgYW4gYXNzaWdubWVudC5cbiAqL1xuZXhwb3J0IHR5cGUgQXNzaWdubWVudFN0YXRlbWVudCA9XG4gICAgdHMuRXhwcmVzc2lvblN0YXRlbWVudCAmIHtleHByZXNzaW9uOiB7bGVmdDogdHMuSWRlbnRpZmllciwgcmlnaHQ6IHRzLkV4cHJlc3Npb259fTtcblxuLyoqXG4gKiBUZXN0IHdoZXRoZXIgYSBzdGF0ZW1lbnQgbm9kZSBpcyBhbiBhc3NpZ25tZW50IHN0YXRlbWVudC5cbiAqIEBwYXJhbSBzdGF0ZW1lbnQgdGhlIHN0YXRlbWVudCB0byB0ZXN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBc3NpZ25tZW50U3RhdGVtZW50KHN0YXRlbWVudDogdHMuU3RhdGVtZW50KTogc3RhdGVtZW50IGlzIEFzc2lnbm1lbnRTdGF0ZW1lbnQge1xuICByZXR1cm4gdHMuaXNFeHByZXNzaW9uU3RhdGVtZW50KHN0YXRlbWVudCkgJiYgaXNBc3NpZ25tZW50KHN0YXRlbWVudC5leHByZXNzaW9uKSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHN0YXRlbWVudC5leHByZXNzaW9uLmxlZnQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBc3NpZ25tZW50KGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb24pOlxuICAgIGV4cHJlc3Npb24gaXMgdHMuQXNzaWdubWVudEV4cHJlc3Npb248dHMuRXF1YWxzVG9rZW4+IHtcbiAgcmV0dXJuIHRzLmlzQmluYXJ5RXhwcmVzc2lvbihleHByZXNzaW9uKSAmJlxuICAgICAgZXhwcmVzc2lvbi5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW47XG59XG5cbi8qKlxuICogVGhlIHR5cGUgb2YgYSBmdW5jdGlvbiB0aGF0IGNhbiBiZSB1c2VkIHRvIGZpbHRlciBvdXQgaGVscGVycyBiYXNlZCBvbiB0aGVpciB0YXJnZXQuXG4gKiBUaGlzIGlzIHVzZWQgaW4gYHJlZmxlY3REZWNvcmF0b3JzRnJvbUhlbHBlckNhbGwoKWAuXG4gKi9cbmV4cG9ydCB0eXBlIFRhcmdldEZpbHRlciA9ICh0YXJnZXQ6IHRzLkV4cHJlc3Npb24pID0+IGJvb2xlYW47XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgdGVzdHMgd2hldGhlciB0aGUgZ2l2ZW4gZXhwcmVzc2lvbiBpcyBhIGNsYXNzIHRhcmdldC5cbiAqIEBwYXJhbSBjbGFzc05hbWUgdGhlIG5hbWUgb2YgdGhlIGNsYXNzIHdlIHdhbnQgdG8gdGFyZ2V0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZUNsYXNzVGFyZ2V0RmlsdGVyKGNsYXNzTmFtZTogc3RyaW5nKTogVGFyZ2V0RmlsdGVyIHtcbiAgcmV0dXJuICh0YXJnZXQ6IHRzLkV4cHJlc3Npb24pOiBib29sZWFuID0+IHRzLmlzSWRlbnRpZmllcih0YXJnZXQpICYmIHRhcmdldC50ZXh0ID09PSBjbGFzc05hbWU7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgdGVzdHMgd2hldGhlciB0aGUgZ2l2ZW4gZXhwcmVzc2lvbiBpcyBhIGNsYXNzIG1lbWJlciB0YXJnZXQuXG4gKiBAcGFyYW0gY2xhc3NOYW1lIHRoZSBuYW1lIG9mIHRoZSBjbGFzcyB3ZSB3YW50IHRvIHRhcmdldC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VNZW1iZXJUYXJnZXRGaWx0ZXIoY2xhc3NOYW1lOiBzdHJpbmcpOiBUYXJnZXRGaWx0ZXIge1xuICByZXR1cm4gKHRhcmdldDogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4gPT4gdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24odGFyZ2V0KSAmJlxuICAgICAgdHMuaXNJZGVudGlmaWVyKHRhcmdldC5leHByZXNzaW9uKSAmJiB0YXJnZXQuZXhwcmVzc2lvbi50ZXh0ID09PSBjbGFzc05hbWUgJiZcbiAgICAgIHRhcmdldC5uYW1lLnRleHQgPT09ICdwcm90b3R5cGUnO1xufVxuXG4vKipcbiAqIEhlbHBlciBtZXRob2QgdG8gZXh0cmFjdCB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBnaXZlbiB0aGUgcHJvcGVydHkncyBcInN5bWJvbFwiLFxuICogd2hpY2ggaXMgYWN0dWFsbHkgdGhlIHN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBvZiB0aGUgcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwcm9wU3ltYm9sOiB0cy5TeW1ib2wpOiB0cy5FeHByZXNzaW9ufHVuZGVmaW5lZCB7XG4gIGNvbnN0IHByb3BJZGVudGlmaWVyID0gcHJvcFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICBjb25zdCBwYXJlbnQgPSBwcm9wSWRlbnRpZmllciAmJiBwcm9wSWRlbnRpZmllci5wYXJlbnQ7XG4gIHJldHVybiBwYXJlbnQgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKHBhcmVudCkgPyBwYXJlbnQucmlnaHQgOiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQSBjYWxsZWUgY291bGQgYmUgb25lIG9mOiBgX19kZWNvcmF0ZSguLi4pYCBvciBgdHNsaWJfMS5fX2RlY29yYXRlYC5cbiAqL1xuZnVuY3Rpb24gZ2V0Q2FsbGVlTmFtZShjYWxsOiB0cy5DYWxsRXhwcmVzc2lvbik6IHN0cmluZ3xudWxsIHtcbiAgaWYgKHRzLmlzSWRlbnRpZmllcihjYWxsLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIGNhbGwuZXhwcmVzc2lvbi50ZXh0O1xuICB9XG4gIGlmICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihjYWxsLmV4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIGNhbGwuZXhwcmVzc2lvbi5uYW1lLnRleHQ7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vLy8vLy8vLy8vLy8gSW50ZXJuYWwgSGVscGVycyAvLy8vLy8vLy8vLy8vXG5cbmZ1bmN0aW9uIGdldERlY29yYXRvckFyZ3Mobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uW10ge1xuICAvLyBUaGUgYXJndW1lbnRzIG9mIGEgZGVjb3JhdG9yIGFyZSBoZWxkIGluIHRoZSBgYXJnc2AgcHJvcGVydHkgb2YgaXRzIGRlY2xhcmF0aW9uIG9iamVjdC5cbiAgY29uc3QgYXJnc1Byb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5kKHByb3BlcnR5ID0+IGdldE5hbWVUZXh0KHByb3BlcnR5Lm5hbWUpID09PSAnYXJncycpO1xuICBjb25zdCBhcmdzRXhwcmVzc2lvbiA9IGFyZ3NQcm9wZXJ0eSAmJiBhcmdzUHJvcGVydHkuaW5pdGlhbGl6ZXI7XG4gIHJldHVybiBhcmdzRXhwcmVzc2lvbiAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oYXJnc0V4cHJlc3Npb24pID9cbiAgICAgIEFycmF5LmZyb20oYXJnc0V4cHJlc3Npb24uZWxlbWVudHMpIDpcbiAgICAgIFtdO1xufVxuXG5mdW5jdGlvbiByZW1vdmVGcm9tTWFwPFQ+KG1hcDogTWFwPHN0cmluZywgVD4sIGtleTogdHMuX19TdHJpbmcpOiBUfHVuZGVmaW5lZCB7XG4gIGNvbnN0IG1hcEtleSA9IGtleSBhcyBzdHJpbmc7XG4gIGNvbnN0IHZhbHVlID0gbWFwLmdldChtYXBLZXkpO1xuICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIG1hcC5kZWxldGUobWFwS2V5KTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGlzUHJvcGVydHlBY2Nlc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uJlxuICAgIHtwYXJlbnQ6IHRzLkJpbmFyeUV4cHJlc3Npb259IHtcbiAgcmV0dXJuICEhbm9kZS5wYXJlbnQgJiYgdHMuaXNCaW5hcnlFeHByZXNzaW9uKG5vZGUucGFyZW50KSAmJiB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihub2RlKTtcbn1cblxuZnVuY3Rpb24gaXNUaGlzQXNzaWdubWVudChub2RlOiB0cy5EZWNsYXJhdGlvbik6IG5vZGUgaXMgdHMuQmluYXJ5RXhwcmVzc2lvbiZcbiAgICB7bGVmdDogdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufSB7XG4gIHJldHVybiB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSkgJiYgdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24obm9kZS5sZWZ0KSAmJlxuICAgICAgbm9kZS5sZWZ0LmV4cHJlc3Npb24ua2luZCA9PT0gdHMuU3ludGF4S2luZC5UaGlzS2V5d29yZDtcbn1cblxuZnVuY3Rpb24gaXNOYW1lZERlY2xhcmF0aW9uKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5OYW1lZERlY2xhcmF0aW9uIHtcbiAgcmV0dXJuICEhKG5vZGUgYXMgYW55KS5uYW1lO1xufVxuXG5cbmZ1bmN0aW9uIGlzQ2xhc3NNZW1iZXJUeXBlKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogbm9kZSBpcyB0cy5DbGFzc0VsZW1lbnR8XG4gICAgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9ufHRzLkJpbmFyeUV4cHJlc3Npb24ge1xuICByZXR1cm4gdHMuaXNDbGFzc0VsZW1lbnQobm9kZSkgfHwgaXNQcm9wZXJ0eUFjY2Vzcyhub2RlKSB8fCB0cy5pc0JpbmFyeUV4cHJlc3Npb24obm9kZSk7XG59XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gYSBwcm9wZXJ0eSBhY2Nlc3MgY2hhaW4uIEUuZy4gdGhlIGBhYCBvZiBgYS5iLmMuZGAuXG4gKiBAcGFyYW0gcHJvcGVydHlBY2Nlc3MgVGhlIHN0YXJ0aW5nIHByb3BlcnR5IGFjY2VzcyBleHByZXNzaW9uIGZyb20gd2hpY2ggd2Ugd2FudCB0byBjb21wdXRlXG4gKiB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIuXG4gKiBAcmV0dXJucyB0aGUgbGVmdCBtb3N0IGlkZW50aWZpZXIgaW4gdGhlIGNoYWluIG9yIGBudWxsYCBpZiBpdCBpcyBub3QgYW4gaWRlbnRpZmllci5cbiAqL1xuZnVuY3Rpb24gZ2V0RmFyTGVmdElkZW50aWZpZXIocHJvcGVydHlBY2Nlc3M6IHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbik6IHRzLklkZW50aWZpZXJ8bnVsbCB7XG4gIHdoaWxlICh0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihwcm9wZXJ0eUFjY2Vzcy5leHByZXNzaW9uKSkge1xuICAgIHByb3BlcnR5QWNjZXNzID0gcHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbjtcbiAgfVxuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKHByb3BlcnR5QWNjZXNzLmV4cHJlc3Npb24pID8gcHJvcGVydHlBY2Nlc3MuZXhwcmVzc2lvbiA6IG51bGw7XG59XG4iXX0=