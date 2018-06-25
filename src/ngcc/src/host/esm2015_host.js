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
        define("angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/host", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/host");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    var DECORATORS = 'decorators';
    var PROP_DECORATORS = 'propDecorators';
    var CONSTRUCTOR = '__constructor';
    var CONSTRUCTOR_PARAMS = 'ctorParameters';
    /**
     * Esm2015 packages contain ECMAScript 2015 classes, etc.
     * Decorators are defined via static properties on the class. For example:
     *
     * ```
     * class SomeDirective {
     * }
     * SomeDirective.decorators = [
     *     { type: Directive, args: [{ selector: '[someDirective]' },] }
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
     *   a static method called `ctrParameters`.
     */
    var Esm2015ReflectionHost = /** @class */ (function () {
        function Esm2015ReflectionHost(checker) {
            this.checker = checker;
        }
        Esm2015ReflectionHost.prototype.getDecoratorsOfDeclaration = function (declaration) {
            var symbol = this.getClassSymbol(declaration);
            if (symbol) {
                if (symbol.exports && symbol.exports.has(DECORATORS)) {
                    // Symbol of the identifier for `SomeDirective.decorators`.
                    var decoratorsSymbol = symbol.exports.get(DECORATORS);
                    var decoratorsIdentifier = decoratorsSymbol.valueDeclaration;
                    if (decoratorsIdentifier && decoratorsIdentifier.parent) {
                        // AST of the array of decorator values
                        var decoratorsArray = decoratorsIdentifier.parent.right;
                        return this.getDecorators(decoratorsArray);
                    }
                }
            }
            return null;
        };
        Esm2015ReflectionHost.prototype.getMembersOfClass = function (clazz) {
            var members = [];
            var symbol = this.getClassSymbol(clazz);
            if (symbol) {
                var memberDecorators = this.getMemberDecorators(symbol);
                memberDecorators.forEach(function (decorators, name) {
                    members.push({
                        name: name,
                        decorators: decorators,
                        // TODO: it may be possible to determine if the member is actually a method/accessor
                        // by checking the class prototype
                        kind: host_1.ClassMemberKind.Property,
                        // TODO: is it possible to have a static decorated property? Do we care?
                        isStatic: false,
                        node: null,
                        type: null,
                        nameNode: null,
                        initializer: null,
                    });
                });
            }
            return members;
        };
        Esm2015ReflectionHost.prototype.getConstructorParameters = function (clazz) {
            var _this = this;
            var parameters = [];
            var classSymbol = this.getClassSymbol(clazz);
            if (classSymbol) {
                var parameterNodes = getConstructorParameters(classSymbol);
                var decoratorInfo_1 = getConstructorDecorators(classSymbol);
                parameterNodes.forEach(function (node, index) {
                    var info = decoratorInfo_1[index];
                    var decorators = info && info.has('decorators') && _this.getDecorators(info.get('decorators')) || null;
                    var type = info && info.get('type') || null;
                    var nameNode = node.name;
                    parameters.push({ name: nameNode.getText(), nameNode: nameNode, type: type, decorators: decorators });
                });
            }
            return parameters;
        };
        Esm2015ReflectionHost.prototype.getImportOfIdentifier = function (id) {
            var symbol = this.checker.getSymbolAtLocation(id);
            return reflector_1.getImportOfSymbol(symbol);
        };
        Esm2015ReflectionHost.prototype.isClass = function (node) {
            return ts.isClassDeclaration(node);
        };
        /**
         * Member decorators are declared as static properties of the class in ES2015:
         *
         * ```
         * SomeDirective.propDecorators = {
         *   "ngForOf": [{ type: Input },],
         *   "ngForTrackBy": [{ type: Input },],
         *   "ngForTemplate": [{ type: Input },],
         * };
         * ```
         */
        Esm2015ReflectionHost.prototype.getMemberDecorators = function (classSymbol) {
            var _this = this;
            var memberDecorators = new Map();
            if (classSymbol.exports && classSymbol.exports.has(PROP_DECORATORS)) {
                // Symbol of the identifier for `SomeDirective.propDecorators`.
                var propDecoratorsMap = getPropertyValueFromSymbol(classSymbol.exports.get(PROP_DECORATORS));
                if (propDecoratorsMap && ts.isObjectLiteralExpression(propDecoratorsMap)) {
                    var propertiesMap = reflector_1.reflectObjectLiteral(propDecoratorsMap);
                    propertiesMap.forEach(function (value, name) {
                        memberDecorators.set(name, _this.getDecorators(value));
                    });
                }
            }
            return memberDecorators;
        };
        Esm2015ReflectionHost.prototype.getDecorators = function (decoratorsArray) {
            var _this = this;
            if (decoratorsArray && ts.isArrayLiteralExpression(decoratorsArray)) {
                var decorators_1 = [];
                // Add each decorator that is imported from `@angular/core` into the `decorators` array
                decoratorsArray.elements.forEach(function (node) {
                    // If the decorator is not an object literal expression then we are not interested
                    if (ts.isObjectLiteralExpression(node)) {
                        // We are only interested in objects of the form: `{ type: DecoratorType, args: [...] }`
                        var decorator = reflector_1.reflectObjectLiteral(node);
                        // Is the value of the `type` property an identifier?
                        var typeIdentifier = decorator.get('type');
                        if (typeIdentifier && ts.isIdentifier(typeIdentifier)) {
                            decorators_1.push({
                                name: typeIdentifier.getText(),
                                import: _this.getImportOfIdentifier(typeIdentifier),
                                node: node,
                                args: getDecoratorArgs(node),
                            });
                        }
                    }
                });
                return decorators_1;
            }
            return [];
        };
        Esm2015ReflectionHost.prototype.getClassSymbol = function (declaration) {
            if (ts.isClassDeclaration(declaration)) {
                if (declaration.name) {
                    return this.checker.getSymbolAtLocation(declaration.name);
                }
            }
        };
        return Esm2015ReflectionHost;
    }());
    exports.Esm2015ReflectionHost = Esm2015ReflectionHost;
    /**
     * Find the declarations of the constructor parameters of a class identified by its symbol.
     */
    function getConstructorParameters(classSymbol) {
        var constructorSymbol = classSymbol.members && classSymbol.members.get(CONSTRUCTOR);
        if (constructorSymbol) {
            // For some reason the constructor does not have a `valueDeclaration` ?!?
            var constructor = constructorSymbol.declarations && constructorSymbol.declarations[0];
            if (constructor && constructor.parameters) {
                return Array.from(constructor.parameters);
            }
        }
        return [];
    }
    /**
     * Constructors parameter decorators are declared in the body of static method of the class in ES2015:
     *
     * ```
     * SomeDirective.ctorParameters = () => [
     *   { type: ViewContainerRef, },
     *   { type: TemplateRef, },
     *   { type: IterableDiffers, },
     *   { type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN,] },] },
     * ];
     * ```
     */
    function getConstructorDecorators(classSymbol) {
        if (classSymbol.exports && classSymbol.exports.has(CONSTRUCTOR_PARAMS)) {
            var paramDecoratorsProperty = getPropertyValueFromSymbol(classSymbol.exports.get(CONSTRUCTOR_PARAMS));
            if (paramDecoratorsProperty && ts.isArrowFunction(paramDecoratorsProperty)) {
                if (ts.isArrayLiteralExpression(paramDecoratorsProperty.body)) {
                    return paramDecoratorsProperty.body.elements.map(function (element) { return ts.isObjectLiteralExpression(element) ? reflector_1.reflectObjectLiteral(element) : null; });
                }
            }
        }
        return [];
    }
    /**
     * The arguments of a decorator are held in the `args` property of its declaration object.
     */
    function getDecoratorArgs(node) {
        var argsProperty = node.properties
            .filter(ts.isPropertyAssignment)
            .find(function (property) { return property.name.getText() === 'args'; });
        var argsExpression = argsProperty && argsProperty.initializer;
        if (argsExpression && ts.isArrayLiteralExpression(argsExpression)) {
            return Array.from(argsExpression.elements);
        }
        else {
            return null;
        }
    }
    /**
     * Helper method to extract the value of a property given the property's "symbol",
     * which is actually the symbol of the identifier of the property.
     */
    function getPropertyValueFromSymbol(propSymbol) {
        var propIdentifier = propSymbol.valueDeclaration;
        if (propIdentifier && propIdentifier.parent) {
            return propIdentifier.parent.right;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTIwMTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUNqQyw2REFBaUc7SUFDakcsb0ZBQWdHO0lBR2hHLElBQU0sVUFBVSxHQUFHLFlBQTJCLENBQUM7SUFDL0MsSUFBTSxlQUFlLEdBQUcsZ0JBQStCLENBQUM7SUFDeEQsSUFBTSxXQUFXLEdBQUcsZUFBOEIsQ0FBQztJQUNuRCxJQUFNLGtCQUFrQixHQUFHLGdCQUErQixDQUFDO0lBRTNEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTBCRztJQUNIO1FBQ0UsK0JBQXNCLE9BQXVCO1lBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO1FBQUcsQ0FBQztRQUVqRCwwREFBMEIsR0FBMUIsVUFBMkIsV0FBMkI7WUFDcEQsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNoRCxJQUFJLE1BQU0sRUFBRTtnQkFDVixJQUFJLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBRXBELDJEQUEyRDtvQkFDM0QsSUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUUsQ0FBQztvQkFDekQsSUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQztvQkFFL0QsSUFBSSxvQkFBb0IsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEVBQUU7d0JBQ3ZELHVDQUF1Qzt3QkFDdkMsSUFBTSxlQUFlLEdBQUksb0JBQW9CLENBQUMsTUFBa0QsQ0FBQyxLQUFLLENBQUM7d0JB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QVEsQ0FBQyxDQUFDO1NBQzVDO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNILG9DQUFvQyxVQUFxQjtRQUN2RCxJQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7UUFDbkQsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRTtZQUMzQyxPQUFRLGNBQWMsQ0FBQyxNQUFrRCxDQUFDLEtBQUssQ0FBQztTQUNqRjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjb3JhdG9yLCBJbXBvcnQsIFBhcmFtZXRlciB9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHsgZ2V0SW1wb3J0T2ZTeW1ib2wsIHJlZmxlY3RPYmplY3RMaXRlcmFsIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvbWV0YWRhdGEvc3JjL3JlZmxlY3Rvcic7XG5pbXBvcnQgeyBOZ2NjUmVmbGVjdGlvbkhvc3QgfSBmcm9tICcuL25nY2NfaG9zdCc7XG5cbmNvbnN0IERFQ09SQVRPUlMgPSAnZGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5jb25zdCBQUk9QX0RFQ09SQVRPUlMgPSAncHJvcERlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuY29uc3QgQ09OU1RSVUNUT1IgPSAnX19jb25zdHJ1Y3RvcicgYXMgdHMuX19TdHJpbmc7XG5jb25zdCBDT05TVFJVQ1RPUl9QQVJBTVMgPSAnY3RvclBhcmFtZXRlcnMnIGFzIHRzLl9fU3RyaW5nO1xuXG4vKipcbiAqIEVzbTIwMTUgcGFja2FnZXMgY29udGFpbiBFQ01BU2NyaXB0IDIwMTUgY2xhc3NlcywgZXRjLlxuICogRGVjb3JhdG9ycyBhcmUgZGVmaW5lZCB2aWEgc3RhdGljIHByb3BlcnRpZXMgb24gdGhlIGNsYXNzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGNsYXNzIFNvbWVEaXJlY3RpdmUge1xuICogfVxuICogU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzID0gW1xuICogICAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gKiAgIFwiaW5wdXQxXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqICAgXCJpbnB1dDJcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogfTtcbiAqIGBgYFxuICpcbiAqICogQ2xhc3NlcyBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RyUGFyYW1ldGVyc2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpIHt9XG5cbiAgZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uKTogRGVjb3JhdG9yW118bnVsbCB7XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbik7XG4gICAgaWYgKHN5bWJvbCkge1xuICAgICAgaWYgKHN5bWJvbC5leHBvcnRzICYmIHN5bWJvbC5leHBvcnRzLmhhcyhERUNPUkFUT1JTKSkge1xuXG4gICAgICAgIC8vIFN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBmb3IgYFNvbWVEaXJlY3RpdmUuZGVjb3JhdG9yc2AuXG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnNTeW1ib2wgPSBzeW1ib2wuZXhwb3J0cy5nZXQoREVDT1JBVE9SUykhO1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzSWRlbnRpZmllciA9IGRlY29yYXRvcnNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcblxuICAgICAgICBpZiAoZGVjb3JhdG9yc0lkZW50aWZpZXIgJiYgZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50KSB7XG4gICAgICAgICAgLy8gQVNUIG9mIHRoZSBhcnJheSBvZiBkZWNvcmF0b3IgdmFsdWVzXG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9yc0FycmF5ID0gKGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCBhcyB0cy5Bc3NpZ25tZW50RXhwcmVzc2lvbjx0cy5FcXVhbHNUb2tlbj4pLnJpZ2h0O1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldERlY29yYXRvcnMoZGVjb3JhdG9yc0FycmF5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldE1lbWJlcnNPZkNsYXNzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyW10ge1xuICAgIGNvbnN0IG1lbWJlcnM6IENsYXNzTWVtYmVyW10gPSBbXTtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoc3ltYm9sKSB7XG4gICAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gdGhpcy5nZXRNZW1iZXJEZWNvcmF0b3JzKHN5bWJvbCk7XG4gICAgICBtZW1iZXJEZWNvcmF0b3JzLmZvckVhY2goKGRlY29yYXRvcnMsIG5hbWUpID0+IHtcbiAgICAgICAgbWVtYmVycy5wdXNoKHtcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgIGRlY29yYXRvcnMsXG4gICAgICAgICAgLy8gVE9ETzogaXQgbWF5IGJlIHBvc3NpYmxlIHRvIGRldGVybWluZSBpZiB0aGUgbWVtYmVyIGlzIGFjdHVhbGx5IGEgbWV0aG9kL2FjY2Vzc29yXG4gICAgICAgICAgLy8gYnkgY2hlY2tpbmcgdGhlIGNsYXNzIHByb3RvdHlwZVxuICAgICAgICAgIGtpbmQ6IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eSxcbiAgICAgICAgICAvLyBUT0RPOiBpcyBpdCBwb3NzaWJsZSB0byBoYXZlIGEgc3RhdGljIGRlY29yYXRlZCBwcm9wZXJ0eT8gRG8gd2UgY2FyZT9cbiAgICAgICAgICBpc1N0YXRpYzogZmFsc2UsXG4gICAgICAgICAgbm9kZTogbnVsbCxcbiAgICAgICAgICB0eXBlOiBudWxsLFxuICAgICAgICAgIG5hbWVOb2RlOiBudWxsLFxuICAgICAgICAgIGluaXRpYWxpemVyOiBudWxsLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbWVtYmVycztcbiAgfVxuXG4gIGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBQYXJhbWV0ZXJbXXxudWxsIHtcbiAgICBjb25zdCBwYXJhbWV0ZXJzOiBQYXJhbWV0ZXJbXSA9IFtdO1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKGNsYXNzU3ltYm9sKSB7XG4gICAgICBjb25zdCBwYXJhbWV0ZXJOb2RlcyA9IGdldENvbnN0cnVjdG9yUGFyYW1ldGVycyhjbGFzc1N5bWJvbCk7XG4gICAgICBjb25zdCBkZWNvcmF0b3JJbmZvID0gZ2V0Q29uc3RydWN0b3JEZWNvcmF0b3JzKGNsYXNzU3ltYm9sKTtcbiAgICAgIHBhcmFtZXRlck5vZGVzLmZvckVhY2goKG5vZGUsIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBkZWNvcmF0b3JJbmZvW2luZGV4XTtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGluZm8gJiYgaW5mby5oYXMoJ2RlY29yYXRvcnMnKSAmJiB0aGlzLmdldERlY29yYXRvcnMoaW5mby5nZXQoJ2RlY29yYXRvcnMnKSEpIHx8IG51bGw7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBpbmZvICYmIGluZm8uZ2V0KCd0eXBlJykgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgbmFtZU5vZGUgPSBub2RlLm5hbWU7XG4gICAgICAgIHBhcmFtZXRlcnMucHVzaCh7IG5hbWU6IG5hbWVOb2RlLmdldFRleHQoKSwgbmFtZU5vZGUsIHR5cGUsIGRlY29yYXRvcnN9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcGFyYW1ldGVycztcbiAgfVxuXG4gIGdldEltcG9ydE9mSWRlbnRpZmllcihpZDogdHMuSWRlbnRpZmllcik6IEltcG9ydHxudWxsIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihpZCk7XG4gICAgcmV0dXJuIGdldEltcG9ydE9mU3ltYm9sKHN5bWJvbCk7XG4gIH1cblxuICBpc0NsYXNzKG5vZGU6IHRzLk5vZGUpOiBub2RlIGlzIHRzLkRlY2xhcmF0aW9uIHtcbiAgICByZXR1cm4gdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1lbWJlciBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZCBhcyBzdGF0aWMgcHJvcGVydGllcyBvZiB0aGUgY2xhc3MgaW4gRVMyMDE1OlxuICAgKlxuICAgKiBgYGBcbiAgICogU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9ycyA9IHtcbiAgICogICBcIm5nRm9yT2ZcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiAgIFwibmdGb3JUcmFja0J5XCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVGVtcGxhdGVcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICAgKiB9O1xuICAgKiBgYGBcbiAgICovXG4gIHByb3RlY3RlZCBnZXRNZW1iZXJEZWNvcmF0b3JzKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpIHtcbiAgICBjb25zdCBtZW1iZXJEZWNvcmF0b3JzID0gbmV3IE1hcDxzdHJpbmcsIERlY29yYXRvcltdPigpO1xuICAgIGlmIChjbGFzc1N5bWJvbC5leHBvcnRzICYmIGNsYXNzU3ltYm9sLmV4cG9ydHMuaGFzKFBST1BfREVDT1JBVE9SUykpIHtcblxuICAgICAgLy8gU3ltYm9sIG9mIHRoZSBpZGVudGlmaWVyIGZvciBgU29tZURpcmVjdGl2ZS5wcm9wRGVjb3JhdG9yc2AuXG4gICAgICBjb25zdCBwcm9wRGVjb3JhdG9yc01hcCA9IGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKGNsYXNzU3ltYm9sLmV4cG9ydHMuZ2V0KFBST1BfREVDT1JBVE9SUykhKTtcbiAgICAgIGlmIChwcm9wRGVjb3JhdG9yc01hcCAmJiB0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHByb3BEZWNvcmF0b3JzTWFwKSkge1xuICAgICAgICBjb25zdCBwcm9wZXJ0aWVzTWFwID0gcmVmbGVjdE9iamVjdExpdGVyYWwocHJvcERlY29yYXRvcnNNYXApO1xuICAgICAgICBwcm9wZXJ0aWVzTWFwLmZvckVhY2goKHZhbHVlLCBuYW1lKSA9PiB7XG4gICAgICAgICAgbWVtYmVyRGVjb3JhdG9ycy5zZXQobmFtZSwgdGhpcy5nZXREZWNvcmF0b3JzKHZhbHVlKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWVtYmVyRGVjb3JhdG9ycztcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXREZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheTogdHMuRXhwcmVzc2lvbikge1xuICAgIGlmIChkZWNvcmF0b3JzQXJyYXkgJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlY29yYXRvcnNBcnJheSkpIHtcbiAgICAgIGNvbnN0IGRlY29yYXRvcnM6IERlY29yYXRvcltdID0gW107XG5cbiAgICAgIC8vIEFkZCBlYWNoIGRlY29yYXRvciB0aGF0IGlzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgIGludG8gdGhlIGBkZWNvcmF0b3JzYCBhcnJheVxuICAgICAgZGVjb3JhdG9yc0FycmF5LmVsZW1lbnRzLmZvckVhY2gobm9kZSA9PiB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGRlY29yYXRvciBpcyBub3QgYW4gb2JqZWN0IGxpdGVyYWwgZXhwcmVzc2lvbiB0aGVuIHdlIGFyZSBub3QgaW50ZXJlc3RlZFxuICAgICAgICBpZih0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBjb25zdCB0eXBlSWRlbnRpZmllciA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKTtcbiAgICAgICAgICBpZiAodHlwZUlkZW50aWZpZXIgJiYgdHMuaXNJZGVudGlmaWVyKHR5cGVJZGVudGlmaWVyKSkge1xuXG4gICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goe1xuICAgICAgICAgICAgICBuYW1lOiB0eXBlSWRlbnRpZmllci5nZXRUZXh0KCksXG4gICAgICAgICAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZUlkZW50aWZpZXIpLFxuICAgICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgICBhcmdzOiBnZXREZWNvcmF0b3JBcmdzKG5vZGUpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIGRlY29yYXRvcnM7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pIHtcbiAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgaWYgKGRlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5cbi8qKlxuICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICovXG5mdW5jdGlvbiBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCkge1xuICBjb25zdCBjb25zdHJ1Y3RvclN5bWJvbCA9IGNsYXNzU3ltYm9sLm1lbWJlcnMgJiYgY2xhc3NTeW1ib2wubWVtYmVycy5nZXQoQ09OU1RSVUNUT1IpITtcbiAgaWYgKGNvbnN0cnVjdG9yU3ltYm9sKSB7XG4gICAgLy8gRm9yIHNvbWUgcmVhc29uIHRoZSBjb25zdHJ1Y3RvciBkb2VzIG5vdCBoYXZlIGEgYHZhbHVlRGVjbGFyYXRpb25gID8hP1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yID0gY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zICYmIGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9uc1swXSBhcyB0cy5Db25zdHJ1Y3RvckRlY2xhcmF0aW9uO1xuICAgIGlmIChjb25zdHJ1Y3RvciAmJiBjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtdO1xufVxuXG5cbi8qKlxuICogQ29uc3RydWN0b3JzIHBhcmFtZXRlciBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZCBpbiB0aGUgYm9keSBvZiBzdGF0aWMgbWV0aG9kIG9mIHRoZSBjbGFzcyBpbiBFUzIwMTU6XG4gKlxuICogYGBgXG4gKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gKiAgIHsgdHlwZTogSXRlcmFibGVEaWZmZXJzLCB9LFxuICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAqIF07XG4gKiBgYGBcbiAqL1xuZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3JEZWNvcmF0b3JzKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpIHtcbiAgaWYgKGNsYXNzU3ltYm9sLmV4cG9ydHMgJiYgY2xhc3NTeW1ib2wuZXhwb3J0cy5oYXMoQ09OU1RSVUNUT1JfUEFSQU1TKSkge1xuICAgIGNvbnN0IHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5ID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2woY2xhc3NTeW1ib2wuZXhwb3J0cy5nZXQoQ09OU1RSVUNUT1JfUEFSQU1TKSEpO1xuICAgIGlmIChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSAmJiB0cy5pc0Fycm93RnVuY3Rpb24ocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpKSB7XG4gICAgICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5LmJvZHkpKSB7XG4gICAgICAgIHJldHVybiBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eS5ib2R5LmVsZW1lbnRzLm1hcChlbGVtZW50ID0+IHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZWxlbWVudCkgPyByZWZsZWN0T2JqZWN0TGl0ZXJhbChlbGVtZW50KSA6IG51bGwpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gW107XG59XG5cbi8qKlxuICogVGhlIGFyZ3VtZW50cyBvZiBhIGRlY29yYXRvciBhcmUgaGVsZCBpbiB0aGUgYGFyZ3NgIHByb3BlcnR5IG9mIGl0cyBkZWNsYXJhdGlvbiBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGdldERlY29yYXRvckFyZ3Mobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pIHtcbiAgY29uc3QgYXJnc1Byb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzXG4gICAgLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudClcbiAgICAuZmluZChwcm9wZXJ0eSA9PiBwcm9wZXJ0eS5uYW1lLmdldFRleHQoKSA9PT0gJ2FyZ3MnKTtcbiAgY29uc3QgYXJnc0V4cHJlc3Npb24gPSBhcmdzUHJvcGVydHkgJiYgYXJnc1Byb3BlcnR5LmluaXRpYWxpemVyO1xuICBpZiAoYXJnc0V4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGFyZ3NFeHByZXNzaW9uKSkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKGFyZ3NFeHByZXNzaW9uLmVsZW1lbnRzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciBtZXRob2QgdG8gZXh0cmFjdCB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBnaXZlbiB0aGUgcHJvcGVydHkncyBcInN5bWJvbFwiLFxuICogd2hpY2ggaXMgYWN0dWFsbHkgdGhlIHN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBvZiB0aGUgcHJvcGVydHkuXG4gKi9cbmZ1bmN0aW9uIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHByb3BTeW1ib2w6IHRzLlN5bWJvbCkge1xuICBjb25zdCBwcm9wSWRlbnRpZmllciA9IHByb3BTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgaWYgKHByb3BJZGVudGlmaWVyICYmIHByb3BJZGVudGlmaWVyLnBhcmVudCkge1xuICAgIHJldHVybiAocHJvcElkZW50aWZpZXIucGFyZW50IGFzIHRzLkFzc2lnbm1lbnRFeHByZXNzaW9uPHRzLkVxdWFsc1Rva2VuPikucmlnaHQ7XG4gIH1cbn1cbiJdfQ==