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
            var decorators = [];
            if (ts.isArrayLiteralExpression(decoratorsArray)) {
                // Add each decorator that is imported from `@angular/core` into the `decorators` array
                decoratorsArray.elements.forEach(function (node) {
                    // If the decorator is not an object literal expression then we are not interested
                    if (ts.isObjectLiteralExpression(node)) {
                        // We are only interested in objects of the form: `{ type: DecoratorType, args: [...] }`
                        var decorator = reflector_1.reflectObjectLiteral(node);
                        // Is the value of the `type` property an identifier?
                        var typeIdentifier = decorator.get('type');
                        if (typeIdentifier && ts.isIdentifier(typeIdentifier)) {
                            decorators.push({
                                name: typeIdentifier.getText(),
                                import: _this.getImportOfIdentifier(typeIdentifier),
                                node: node,
                                args: getDecoratorArgs(node),
                            });
                        }
                    }
                });
            }
            return decorators;
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
            return [];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTIwMTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUNqQyw2REFBaUc7SUFDakcsb0ZBQWdHO0lBR2hHLElBQU0sVUFBVSxHQUFHLFlBQTJCLENBQUM7SUFDL0MsSUFBTSxlQUFlLEdBQUcsZ0JBQStCLENBQUM7SUFDeEQsSUFBTSxXQUFXLEdBQUcsZUFBOEIsQ0FBQztJQUNuRCxJQUFNLGtCQUFrQixHQUFHLGdCQUErQixDQUFDO0lBRTNEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTBCRztJQUNIO1FBQ0UsK0JBQXNCLE9BQXVCO1lBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO1FBQUcsQ0FBQztRQUVqRCwwREFBMEIsR0FBMUIsVUFBMkIsV0FBMkI7WUFDcEQsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNoRCxJQUFJLE1BQU0sRUFBRTtnQkFDVixJQUFJLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBRXBELDJEQUEyRDtvQkFDM0QsSUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUUsQ0FBQztvQkFDekQsSUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQztvQkFFL0QsSUFBSSxvQkFBb0IsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEVBQUU7d0JBQ3ZELHVDQUF1Qzt3QkFDdkMsSUFBTSxlQUFlLEdBQUksb0JBQW9CLENBQUMsTUFBa0QsQ0FBQyxLQUFLLENBQUM7d0JB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QUMsZ0JBQWdCLENBQUM7UUFDbkQsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRTtZQUMzQyxPQUFRLGNBQWMsQ0FBQyxNQUFrRCxDQUFDLEtBQUssQ0FBQztTQUNqRjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjb3JhdG9yLCBJbXBvcnQsIFBhcmFtZXRlciB9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHsgZ2V0SW1wb3J0T2ZTeW1ib2wsIHJlZmxlY3RPYmplY3RMaXRlcmFsIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvbWV0YWRhdGEvc3JjL3JlZmxlY3Rvcic7XG5pbXBvcnQgeyBOZ2NjUmVmbGVjdGlvbkhvc3QgfSBmcm9tICcuL25nY2NfaG9zdCc7XG5cbmNvbnN0IERFQ09SQVRPUlMgPSAnZGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5jb25zdCBQUk9QX0RFQ09SQVRPUlMgPSAncHJvcERlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuY29uc3QgQ09OU1RSVUNUT1IgPSAnX19jb25zdHJ1Y3RvcicgYXMgdHMuX19TdHJpbmc7XG5jb25zdCBDT05TVFJVQ1RPUl9QQVJBTVMgPSAnY3RvclBhcmFtZXRlcnMnIGFzIHRzLl9fU3RyaW5nO1xuXG4vKipcbiAqIEVzbTIwMTUgcGFja2FnZXMgY29udGFpbiBFQ01BU2NyaXB0IDIwMTUgY2xhc3NlcywgZXRjLlxuICogRGVjb3JhdG9ycyBhcmUgZGVmaW5lZCB2aWEgc3RhdGljIHByb3BlcnRpZXMgb24gdGhlIGNsYXNzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGNsYXNzIFNvbWVEaXJlY3RpdmUge1xuICogfVxuICogU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzID0gW1xuICogICB7IHR5cGU6IERpcmVjdGl2ZSwgYXJnczogW3sgc2VsZWN0b3I6ICdbc29tZURpcmVjdGl2ZV0nIH0sXSB9XG4gKiBdO1xuICogU29tZURpcmVjdGl2ZS5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLnByb3BEZWNvcmF0b3JzID0ge1xuICogICBcImlucHV0MVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiAgIFwiaW5wdXQyXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqIH07XG4gKiBgYGBcbiAqXG4gKiAqIENsYXNzZXMgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqICogTWVtYmVycyBhcmUgZGVjb3JhdGVkIGlmIHRoZXJlIGlzIGEgbWF0Y2hpbmcga2V5IG9uIGEgc3RhdGljIHByb3BlcnR5XG4gKiAgIGNhbGxlZCBgcHJvcERlY29yYXRvcnNgLlxuICogKiBDb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIGRlY29yYXRvcnMgYXJlIGZvdW5kIG9uIGFuIG9iamVjdCByZXR1cm5lZCBmcm9tXG4gKiAgIGEgc3RhdGljIG1ldGhvZCBjYWxsZWQgYGN0b3JQYXJhbWV0ZXJzYC5cbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTIwMTVSZWZsZWN0aW9uSG9zdCBpbXBsZW1lbnRzIE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcikge31cblxuICBnZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBjb25zdCBzeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGRlY2xhcmF0aW9uKTtcbiAgICBpZiAoc3ltYm9sKSB7XG4gICAgICBpZiAoc3ltYm9sLmV4cG9ydHMgJiYgc3ltYm9sLmV4cG9ydHMuaGFzKERFQ09SQVRPUlMpKSB7XG5cbiAgICAgICAgLy8gU3ltYm9sIG9mIHRoZSBpZGVudGlmaWVyIGZvciBgU29tZURpcmVjdGl2ZS5kZWNvcmF0b3JzYC5cbiAgICAgICAgY29uc3QgZGVjb3JhdG9yc1N5bWJvbCA9IHN5bWJvbC5leHBvcnRzLmdldChERUNPUkFUT1JTKSE7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnNJZGVudGlmaWVyID0gZGVjb3JhdG9yc1N5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuXG4gICAgICAgIGlmIChkZWNvcmF0b3JzSWRlbnRpZmllciAmJiBkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQpIHtcbiAgICAgICAgICAvLyBBU1Qgb2YgdGhlIGFycmF5IG9mIGRlY29yYXRvciB2YWx1ZXNcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzQXJyYXkgPSAoZGVjb3JhdG9yc0lkZW50aWZpZXIucGFyZW50IGFzIHRzLkFzc2lnbm1lbnRFeHByZXNzaW9uPHRzLkVxdWFsc1Rva2VuPikucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZ2V0TWVtYmVyc09mQ2xhc3MoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJbXSB7XG4gICAgY29uc3QgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSA9IFtdO1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmIChzeW1ib2wpIHtcbiAgICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSB0aGlzLmdldE1lbWJlckRlY29yYXRvcnMoc3ltYm9sKTtcbiAgICAgIG1lbWJlckRlY29yYXRvcnMuZm9yRWFjaCgoZGVjb3JhdG9ycywgbmFtZSkgPT4ge1xuICAgICAgICBtZW1iZXJzLnB1c2goe1xuICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgZGVjb3JhdG9ycyxcbiAgICAgICAgICAvLyBUT0RPOiBpdCBtYXkgYmUgcG9zc2libGUgdG8gZGV0ZXJtaW5lIGlmIHRoZSBtZW1iZXIgaXMgYWN0dWFsbHkgYSBtZXRob2QvYWNjZXNzb3JcbiAgICAgICAgICAvLyBieSBjaGVja2luZyB0aGUgY2xhc3MgcHJvdG90eXBlXG4gICAgICAgICAga2luZDogQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5LFxuICAgICAgICAgIC8vIFRPRE86IGlzIGl0IHBvc3NpYmxlIHRvIGhhdmUgYSBzdGF0aWMgZGVjb3JhdGVkIHByb3BlcnR5PyBEbyB3ZSBjYXJlP1xuICAgICAgICAgIGlzU3RhdGljOiBmYWxzZSxcbiAgICAgICAgICBub2RlOiBudWxsLFxuICAgICAgICAgIHR5cGU6IG51bGwsXG4gICAgICAgICAgbmFtZU5vZGU6IG51bGwsXG4gICAgICAgICAgaW5pdGlhbGl6ZXI6IG51bGwsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtZW1iZXJzO1xuICB9XG5cbiAgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IFBhcmFtZXRlcltdfG51bGwge1xuICAgIGNvbnN0IHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdID0gW107XG4gICAgY29uc3QgY2xhc3NTeW1ib2wgPSB0aGlzLmdldENsYXNzU3ltYm9sKGNsYXp6KTtcbiAgICBpZiAoY2xhc3NTeW1ib2wpIHtcbiAgICAgIGNvbnN0IHBhcmFtZXRlck5vZGVzID0gZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXNzU3ltYm9sKTtcbiAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPSBnZXRDb25zdHJ1Y3RvckRlY29yYXRvcnMoY2xhc3NTeW1ib2wpO1xuICAgICAgcGFyYW1ldGVyTm9kZXMuZm9yRWFjaCgobm9kZSwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGRlY29yYXRvckluZm9baW5kZXhdO1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gaW5mbyAmJiBpbmZvLmhhcygnZGVjb3JhdG9ycycpICYmIHRoaXMuZ2V0RGVjb3JhdG9ycyhpbmZvLmdldCgnZGVjb3JhdG9ycycpISkgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgdHlwZSA9IGluZm8gJiYgaW5mby5nZXQoJ3R5cGUnKSB8fCBudWxsO1xuICAgICAgICBjb25zdCBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgICAgcGFyYW1ldGVycy5wdXNoKHsgbmFtZTogbmFtZU5vZGUuZ2V0VGV4dCgpLCBuYW1lTm9kZSwgdHlwZSwgZGVjb3JhdG9yc30pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbWV0ZXJzO1xuICB9XG5cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKTtcbiAgICByZXR1cm4gZ2V0SW1wb3J0T2ZTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZW1iZXIgZGVjb3JhdG9ycyBhcmUgZGVjbGFyZWQgYXMgc3RhdGljIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzIGluIEVTMjAxNTpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gICAqICAgXCJuZ0Zvck9mXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVHJhY2tCeVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRlbXBsYXRlXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogfTtcbiAgICogYGBgXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyRGVjb3JhdG9ycyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKSB7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICBpZiAoY2xhc3NTeW1ib2wuZXhwb3J0cyAmJiBjbGFzc1N5bWJvbC5leHBvcnRzLmhhcyhQUk9QX0RFQ09SQVRPUlMpKSB7XG5cbiAgICAgIC8vIFN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBmb3IgYFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnNgLlxuICAgICAgY29uc3QgcHJvcERlY29yYXRvcnNNYXAgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChjbGFzc1N5bWJvbC5leHBvcnRzLmdldChQUk9QX0RFQ09SQVRPUlMpISk7XG4gICAgICBpZiAocHJvcERlY29yYXRvcnNNYXAgJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wRGVjb3JhdG9yc01hcCkpIHtcbiAgICAgICAgY29uc3QgcHJvcGVydGllc01hcCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKHByb3BEZWNvcmF0b3JzTWFwKTtcbiAgICAgICAgcHJvcGVydGllc01hcC5mb3JFYWNoKCh2YWx1ZSwgbmFtZSkgPT4ge1xuICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG5hbWUsIHRoaXMuZ2V0RGVjb3JhdG9ycyh2YWx1ZSkpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlckRlY29yYXRvcnM7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXk6IHRzLkV4cHJlc3Npb24pIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSA9IFtdO1xuXG4gICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZWNvcmF0b3JzQXJyYXkpKSB7XG5cbiAgICAgIC8vIEFkZCBlYWNoIGRlY29yYXRvciB0aGF0IGlzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgIGludG8gdGhlIGBkZWNvcmF0b3JzYCBhcnJheVxuICAgICAgZGVjb3JhdG9yc0FycmF5LmVsZW1lbnRzLmZvckVhY2gobm9kZSA9PiB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGRlY29yYXRvciBpcyBub3QgYW4gb2JqZWN0IGxpdGVyYWwgZXhwcmVzc2lvbiB0aGVuIHdlIGFyZSBub3QgaW50ZXJlc3RlZFxuICAgICAgICBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuXG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBjb25zdCB0eXBlSWRlbnRpZmllciA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKTtcbiAgICAgICAgICBpZiAodHlwZUlkZW50aWZpZXIgJiYgdHMuaXNJZGVudGlmaWVyKHR5cGVJZGVudGlmaWVyKSkge1xuXG4gICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goe1xuICAgICAgICAgICAgICBuYW1lOiB0eXBlSWRlbnRpZmllci5nZXRUZXh0KCksXG4gICAgICAgICAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZUlkZW50aWZpZXIpLFxuICAgICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgICBhcmdzOiBnZXREZWNvcmF0b3JBcmdzKG5vZGUpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pIHtcbiAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgaWYgKGRlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5cbi8qKlxuICogRmluZCB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBjb25zdHJ1Y3RvciBwYXJhbWV0ZXJzIG9mIGEgY2xhc3MgaWRlbnRpZmllZCBieSBpdHMgc3ltYm9sLlxuICovXG5mdW5jdGlvbiBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCkge1xuICBjb25zdCBjb25zdHJ1Y3RvclN5bWJvbCA9IGNsYXNzU3ltYm9sLm1lbWJlcnMgJiYgY2xhc3NTeW1ib2wubWVtYmVycy5nZXQoQ09OU1RSVUNUT1IpO1xuICBpZiAoY29uc3RydWN0b3JTeW1ib2wpIHtcbiAgICAvLyBGb3Igc29tZSByZWFzb24gdGhlIGNvbnN0cnVjdG9yIGRvZXMgbm90IGhhdmUgYSBgdmFsdWVEZWNsYXJhdGlvbmAgPyE/XG4gICAgY29uc3QgY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnMgJiYgY29uc3RydWN0b3JTeW1ib2wuZGVjbGFyYXRpb25zWzBdIGFzIHRzLkNvbnN0cnVjdG9yRGVjbGFyYXRpb247XG4gICAgaWYgKGNvbnN0cnVjdG9yICYmIGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gW107XG59XG5cblxuLyoqXG4gKiBDb25zdHJ1Y3RvcnMgcGFyYW1ldGVyIGRlY29yYXRvcnMgYXJlIGRlY2xhcmVkIGluIHRoZSBib2R5IG9mIHN0YXRpYyBtZXRob2Qgb2YgdGhlIGNsYXNzIGluIEVTMjAxNTpcbiAqXG4gKiBgYGBcbiAqIFNvbWVEaXJlY3RpdmUuY3RvclBhcmFtZXRlcnMgPSAoKSA9PiBbXG4gKiAgIHsgdHlwZTogVmlld0NvbnRhaW5lclJlZiwgfSxcbiAqICAgeyB0eXBlOiBUZW1wbGF0ZVJlZiwgfSxcbiAqICAgeyB0eXBlOiBJdGVyYWJsZURpZmZlcnMsIH0sXG4gKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICogXTtcbiAqIGBgYFxuICovXG5mdW5jdGlvbiBnZXRDb25zdHJ1Y3RvckRlY29yYXRvcnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCkge1xuICBpZiAoY2xhc3NTeW1ib2wuZXhwb3J0cyAmJiBjbGFzc1N5bWJvbC5leHBvcnRzLmhhcyhDT05TVFJVQ1RPUl9QQVJBTVMpKSB7XG4gICAgY29uc3QgcGFyYW1EZWNvcmF0b3JzUHJvcGVydHkgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChjbGFzc1N5bWJvbC5leHBvcnRzLmdldChDT05TVFJVQ1RPUl9QQVJBTVMpISk7XG4gICAgaWYgKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5ICYmIHRzLmlzQXJyb3dGdW5jdGlvbihwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSkpIHtcbiAgICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24ocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkuYm9keSkpIHtcbiAgICAgICAgcmV0dXJuIHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5LmJvZHkuZWxlbWVudHMubWFwKGVsZW1lbnQgPT4gdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihlbGVtZW50KSA/IHJlZmxlY3RPYmplY3RMaXRlcmFsKGVsZW1lbnQpIDogbnVsbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBbXTtcbn1cblxuLyoqXG4gKiBUaGUgYXJndW1lbnRzIG9mIGEgZGVjb3JhdG9yIGFyZSBoZWxkIGluIHRoZSBgYXJnc2AgcHJvcGVydHkgb2YgaXRzIGRlY2xhcmF0aW9uIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gZ2V0RGVjb3JhdG9yQXJncyhub2RlOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbikge1xuICBjb25zdCBhcmdzUHJvcGVydHkgPSBub2RlLnByb3BlcnRpZXNcbiAgICAuZmlsdGVyKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KVxuICAgIC5maW5kKHByb3BlcnR5ID0+IHByb3BlcnR5Lm5hbWUuZ2V0VGV4dCgpID09PSAnYXJncycpO1xuICBjb25zdCBhcmdzRXhwcmVzc2lvbiA9IGFyZ3NQcm9wZXJ0eSAmJiBhcmdzUHJvcGVydHkuaW5pdGlhbGl6ZXI7XG4gIGlmIChhcmdzRXhwcmVzc2lvbiAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oYXJnc0V4cHJlc3Npb24pKSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oYXJnc0V4cHJlc3Npb24uZWxlbWVudHMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciBtZXRob2QgdG8gZXh0cmFjdCB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBnaXZlbiB0aGUgcHJvcGVydHkncyBcInN5bWJvbFwiLFxuICogd2hpY2ggaXMgYWN0dWFsbHkgdGhlIHN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBvZiB0aGUgcHJvcGVydHkuXG4gKi9cbmZ1bmN0aW9uIGdldFByb3BlcnR5VmFsdWVGcm9tU3ltYm9sKHByb3BTeW1ib2w6IHRzLlN5bWJvbCkge1xuICBjb25zdCBwcm9wSWRlbnRpZmllciA9IHByb3BTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgaWYgKHByb3BJZGVudGlmaWVyICYmIHByb3BJZGVudGlmaWVyLnBhcmVudCkge1xuICAgIHJldHVybiAocHJvcElkZW50aWZpZXIucGFyZW50IGFzIHRzLkFzc2lnbm1lbnRFeHByZXNzaW9uPHRzLkVxdWFsc1Rva2VuPikucmlnaHQ7XG4gIH1cbn1cbiJdfQ==