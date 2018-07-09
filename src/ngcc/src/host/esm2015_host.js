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
                var parameterNodes = this.getConstructorParameterDeclarations(classSymbol);
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
        /**
         * Find the declarations of the constructor parameters of a class identified by its symbol.
         */
        Esm2015ReflectionHost.prototype.getConstructorParameterDeclarations = function (classSymbol) {
            var constructorSymbol = classSymbol.members && classSymbol.members.get(CONSTRUCTOR);
            if (constructorSymbol) {
                // For some reason the constructor does not have a `valueDeclaration` ?!?
                var constructor = constructorSymbol.declarations && constructorSymbol.declarations[0];
                if (constructor && constructor.parameters) {
                    return Array.from(constructor.parameters);
                }
            }
            return [];
        };
        return Esm2015ReflectionHost;
    }());
    exports.Esm2015ReflectionHost = Esm2015ReflectionHost;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTIwMTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUNqQyw2REFBaUc7SUFDakcsb0ZBQWdHO0lBR2hHLElBQU0sVUFBVSxHQUFHLFlBQTJCLENBQUM7SUFDL0MsSUFBTSxlQUFlLEdBQUcsZ0JBQStCLENBQUM7SUFDeEQsSUFBTSxXQUFXLEdBQUcsZUFBOEIsQ0FBQztJQUNuRCxJQUFNLGtCQUFrQixHQUFHLGdCQUErQixDQUFDO0lBRTNEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTBCRztJQUNIO1FBQ0UsK0JBQXNCLE9BQXVCO1lBQXZCLFlBQU8sR0FBUCxPQUFPLENBQWdCO1FBQUcsQ0FBQztRQUVqRCwwREFBMEIsR0FBMUIsVUFBMkIsV0FBMkI7WUFDcEQsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNoRCxJQUFJLE1BQU0sRUFBRTtnQkFDVixJQUFJLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBRXBELDJEQUEyRDtvQkFDM0QsSUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUUsQ0FBQztvQkFDekQsSUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQztvQkFFL0QsSUFBSSxvQkFBb0IsSUFBSSxvQkFBb0IsQ0FBQyxNQUFNLEVBQUU7d0JBQ3ZELHVDQUF1Qzt3QkFDdkMsSUFBTSxlQUFlLEdBQUksb0JBQW9CLENBQUMsTUFBa0QsQ0FBQyxLQUFLLENBQUM7d0JB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Q3ZELElBQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztRQUNuRCxJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFO1lBQzNDLE9BQVEsY0FBYyxDQUFDLE1BQWtELENBQUMsS0FBSyxDQUFDO1NBQ2pGO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBEZWNvcmF0b3IsIEltcG9ydCwgUGFyYW1ldGVyIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQgeyBnZXRJbXBvcnRPZlN5bWJvbCwgcmVmbGVjdE9iamVjdExpdGVyYWwgfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9tZXRhZGF0YS9zcmMvcmVmbGVjdG9yJztcbmltcG9ydCB7IE5nY2NSZWZsZWN0aW9uSG9zdCB9IGZyb20gJy4vbmdjY19ob3N0JztcblxuY29uc3QgREVDT1JBVE9SUyA9ICdkZWNvcmF0b3JzJyBhcyB0cy5fX1N0cmluZztcbmNvbnN0IFBST1BfREVDT1JBVE9SUyA9ICdwcm9wRGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5jb25zdCBDT05TVFJVQ1RPUiA9ICdfX2NvbnN0cnVjdG9yJyBhcyB0cy5fX1N0cmluZztcbmNvbnN0IENPTlNUUlVDVE9SX1BBUkFNUyA9ICdjdG9yUGFyYW1ldGVycycgYXMgdHMuX19TdHJpbmc7XG5cbi8qKlxuICogRXNtMjAxNSBwYWNrYWdlcyBjb250YWluIEVDTUFTY3JpcHQgMjAxNSBjbGFzc2VzLCBldGMuXG4gKiBEZWNvcmF0b3JzIGFyZSBkZWZpbmVkIHZpYSBzdGF0aWMgcHJvcGVydGllcyBvbiB0aGUgY2xhc3MuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogY2xhc3MgU29tZURpcmVjdGl2ZSB7XG4gKiB9XG4gKiBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnMgPSBbXG4gKiAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tzb21lRGlyZWN0aXZlXScgfSxdIH1cbiAqIF07XG4gKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gKiAgIHsgdHlwZTogdW5kZWZpbmVkLCBkZWNvcmF0b3JzOiBbeyB0eXBlOiBJbmplY3QsIGFyZ3M6IFtJTkpFQ1RFRF9UT0tFTixdIH0sXSB9LFxuICogXTtcbiAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gKiAgIFwiaW5wdXQxXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAqICAgXCJpbnB1dDJcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogfTtcbiAqIGBgYFxuICpcbiAqICogQ2xhc3NlcyBhcmUgZGVjb3JhdGVkIGlmIHRoZXkgaGF2ZSBhIHN0YXRpYyBwcm9wZXJ0eSBjYWxsZWQgYGRlY29yYXRvcnNgLlxuICogKiBNZW1iZXJzIGFyZSBkZWNvcmF0ZWQgaWYgdGhlcmUgaXMgYSBtYXRjaGluZyBrZXkgb24gYSBzdGF0aWMgcHJvcGVydHlcbiAqICAgY2FsbGVkIGBwcm9wRGVjb3JhdG9yc2AuXG4gKiAqIENvbnN0cnVjdG9yIHBhcmFtZXRlcnMgZGVjb3JhdG9ycyBhcmUgZm91bmQgb24gYW4gb2JqZWN0IHJldHVybmVkIGZyb21cbiAqICAgYSBzdGF0aWMgbWV0aG9kIGNhbGxlZCBgY3RvclBhcmFtZXRlcnNgLlxuICovXG5leHBvcnQgY2xhc3MgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IGltcGxlbWVudHMgTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKSB7fVxuXG4gIGdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcltdfG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woZGVjbGFyYXRpb24pO1xuICAgIGlmIChzeW1ib2wpIHtcbiAgICAgIGlmIChzeW1ib2wuZXhwb3J0cyAmJiBzeW1ib2wuZXhwb3J0cy5oYXMoREVDT1JBVE9SUykpIHtcblxuICAgICAgICAvLyBTeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgZm9yIGBTb21lRGlyZWN0aXZlLmRlY29yYXRvcnNgLlxuICAgICAgICBjb25zdCBkZWNvcmF0b3JzU3ltYm9sID0gc3ltYm9sLmV4cG9ydHMuZ2V0KERFQ09SQVRPUlMpITtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9yc0lkZW50aWZpZXIgPSBkZWNvcmF0b3JzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG5cbiAgICAgICAgaWYgKGRlY29yYXRvcnNJZGVudGlmaWVyICYmIGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkge1xuICAgICAgICAgIC8vIEFTVCBvZiB0aGUgYXJyYXkgb2YgZGVjb3JhdG9yIHZhbHVlc1xuICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnNBcnJheSA9IChkZWNvcmF0b3JzSWRlbnRpZmllci5wYXJlbnQgYXMgdHMuQXNzaWdubWVudEV4cHJlc3Npb248dHMuRXF1YWxzVG9rZW4+KS5yaWdodDtcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXREZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBnZXRNZW1iZXJzT2ZDbGFzcyhjbGF6ejogdHMuRGVjbGFyYXRpb24pOiBDbGFzc01lbWJlcltdIHtcbiAgICBjb25zdCBtZW1iZXJzOiBDbGFzc01lbWJlcltdID0gW107XG4gICAgY29uc3Qgc3ltYm9sID0gdGhpcy5nZXRDbGFzc1N5bWJvbChjbGF6eik7XG4gICAgaWYgKHN5bWJvbCkge1xuICAgICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IHRoaXMuZ2V0TWVtYmVyRGVjb3JhdG9ycyhzeW1ib2wpO1xuICAgICAgbWVtYmVyRGVjb3JhdG9ycy5mb3JFYWNoKChkZWNvcmF0b3JzLCBuYW1lKSA9PiB7XG4gICAgICAgIG1lbWJlcnMucHVzaCh7XG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICBkZWNvcmF0b3JzLFxuICAgICAgICAgIC8vIFRPRE86IGl0IG1heSBiZSBwb3NzaWJsZSB0byBkZXRlcm1pbmUgaWYgdGhlIG1lbWJlciBpcyBhY3R1YWxseSBhIG1ldGhvZC9hY2Nlc3NvclxuICAgICAgICAgIC8vIGJ5IGNoZWNraW5nIHRoZSBjbGFzcyBwcm90b3R5cGVcbiAgICAgICAgICBraW5kOiBDbGFzc01lbWJlcktpbmQuUHJvcGVydHksXG4gICAgICAgICAgLy8gVE9ETzogaXMgaXQgcG9zc2libGUgdG8gaGF2ZSBhIHN0YXRpYyBkZWNvcmF0ZWQgcHJvcGVydHk/IERvIHdlIGNhcmU/XG4gICAgICAgICAgaXNTdGF0aWM6IGZhbHNlLFxuICAgICAgICAgIG5vZGU6IG51bGwsXG4gICAgICAgICAgdHlwZTogbnVsbCxcbiAgICAgICAgICBuYW1lTm9kZTogbnVsbCxcbiAgICAgICAgICBpbml0aWFsaXplcjogbnVsbCxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlcnM7XG4gIH1cblxuICBnZXRDb25zdHJ1Y3RvclBhcmFtZXRlcnMoY2xheno6IHRzLkRlY2xhcmF0aW9uKTogUGFyYW1ldGVyW118bnVsbCB7XG4gICAgY29uc3QgcGFyYW1ldGVyczogUGFyYW1ldGVyW10gPSBbXTtcbiAgICBjb25zdCBjbGFzc1N5bWJvbCA9IHRoaXMuZ2V0Q2xhc3NTeW1ib2woY2xhenopO1xuICAgIGlmIChjbGFzc1N5bWJvbCkge1xuICAgICAgY29uc3QgcGFyYW1ldGVyTm9kZXMgPSB0aGlzLmdldENvbnN0cnVjdG9yUGFyYW1ldGVyRGVjbGFyYXRpb25zKGNsYXNzU3ltYm9sKTtcbiAgICAgIGNvbnN0IGRlY29yYXRvckluZm8gPSBnZXRDb25zdHJ1Y3RvckRlY29yYXRvcnMoY2xhc3NTeW1ib2wpO1xuICAgICAgcGFyYW1ldGVyTm9kZXMuZm9yRWFjaCgobm9kZSwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgaW5mbyA9IGRlY29yYXRvckluZm9baW5kZXhdO1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gaW5mbyAmJiBpbmZvLmhhcygnZGVjb3JhdG9ycycpICYmIHRoaXMuZ2V0RGVjb3JhdG9ycyhpbmZvLmdldCgnZGVjb3JhdG9ycycpISkgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgdHlwZSA9IGluZm8gJiYgaW5mby5nZXQoJ3R5cGUnKSB8fCBudWxsO1xuICAgICAgICBjb25zdCBuYW1lTm9kZSA9IG5vZGUubmFtZTtcbiAgICAgICAgcGFyYW1ldGVycy5wdXNoKHsgbmFtZTogbmFtZU5vZGUuZ2V0VGV4dCgpLCBuYW1lTm9kZSwgdHlwZSwgZGVjb3JhdG9yc30pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbWV0ZXJzO1xuICB9XG5cbiAgZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKGlkOiB0cy5JZGVudGlmaWVyKTogSW1wb3J0fG51bGwge1xuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGlkKTtcbiAgICByZXR1cm4gZ2V0SW1wb3J0T2ZTeW1ib2woc3ltYm9sKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZW1iZXIgZGVjb3JhdG9ycyBhcmUgZGVjbGFyZWQgYXMgc3RhdGljIHByb3BlcnRpZXMgb2YgdGhlIGNsYXNzIGluIEVTMjAxNTpcbiAgICpcbiAgICogYGBgXG4gICAqIFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnMgPSB7XG4gICAqICAgXCJuZ0Zvck9mXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogICBcIm5nRm9yVHJhY2tCeVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gICAqICAgXCJuZ0ZvclRlbXBsYXRlXCI6IFt7IHR5cGU6IElucHV0IH0sXSxcbiAgICogfTtcbiAgICogYGBgXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0TWVtYmVyRGVjb3JhdG9ycyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKSB7XG4gICAgY29uc3QgbWVtYmVyRGVjb3JhdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBEZWNvcmF0b3JbXT4oKTtcbiAgICBpZiAoY2xhc3NTeW1ib2wuZXhwb3J0cyAmJiBjbGFzc1N5bWJvbC5leHBvcnRzLmhhcyhQUk9QX0RFQ09SQVRPUlMpKSB7XG5cbiAgICAgIC8vIFN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBmb3IgYFNvbWVEaXJlY3RpdmUucHJvcERlY29yYXRvcnNgLlxuICAgICAgY29uc3QgcHJvcERlY29yYXRvcnNNYXAgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChjbGFzc1N5bWJvbC5leHBvcnRzLmdldChQUk9QX0RFQ09SQVRPUlMpISk7XG4gICAgICBpZiAocHJvcERlY29yYXRvcnNNYXAgJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wRGVjb3JhdG9yc01hcCkpIHtcbiAgICAgICAgY29uc3QgcHJvcGVydGllc01hcCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKHByb3BEZWNvcmF0b3JzTWFwKTtcbiAgICAgICAgcHJvcGVydGllc01hcC5mb3JFYWNoKCh2YWx1ZSwgbmFtZSkgPT4ge1xuICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG5hbWUsIHRoaXMuZ2V0RGVjb3JhdG9ycyh2YWx1ZSkpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlckRlY29yYXRvcnM7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0RGVjb3JhdG9ycyhkZWNvcmF0b3JzQXJyYXk6IHRzLkV4cHJlc3Npb24pIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSA9IFtdO1xuXG4gICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZWNvcmF0b3JzQXJyYXkpKSB7XG5cbiAgICAgIC8vIEFkZCBlYWNoIGRlY29yYXRvciB0aGF0IGlzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgIGludG8gdGhlIGBkZWNvcmF0b3JzYCBhcnJheVxuICAgICAgZGVjb3JhdG9yc0FycmF5LmVsZW1lbnRzLmZvckVhY2gobm9kZSA9PiB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGRlY29yYXRvciBpcyBub3QgYW4gb2JqZWN0IGxpdGVyYWwgZXhwcmVzc2lvbiB0aGVuIHdlIGFyZSBub3QgaW50ZXJlc3RlZFxuICAgICAgICBpZiAodHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihub2RlKSkge1xuXG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBjb25zdCB0eXBlSWRlbnRpZmllciA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKTtcbiAgICAgICAgICBpZiAodHlwZUlkZW50aWZpZXIgJiYgdHMuaXNJZGVudGlmaWVyKHR5cGVJZGVudGlmaWVyKSkge1xuXG4gICAgICAgICAgICBkZWNvcmF0b3JzLnB1c2goe1xuICAgICAgICAgICAgICBuYW1lOiB0eXBlSWRlbnRpZmllci5nZXRUZXh0KCksXG4gICAgICAgICAgICAgIGltcG9ydDogdGhpcy5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZUlkZW50aWZpZXIpLFxuICAgICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgICBhcmdzOiBnZXREZWNvcmF0b3JBcmdzKG5vZGUpLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRDbGFzc1N5bWJvbChkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pIHtcbiAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgaWYgKGRlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRlY2xhcmF0aW9uLm5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBkZWNsYXJhdGlvbnMgb2YgdGhlIGNvbnN0cnVjdG9yIHBhcmFtZXRlcnMgb2YgYSBjbGFzcyBpZGVudGlmaWVkIGJ5IGl0cyBzeW1ib2wuXG4gICAqL1xuICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJEZWNsYXJhdGlvbnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCkge1xuICAgIGNvbnN0IGNvbnN0cnVjdG9yU3ltYm9sID0gY2xhc3NTeW1ib2wubWVtYmVycyAmJiBjbGFzc1N5bWJvbC5tZW1iZXJzLmdldChDT05TVFJVQ1RPUik7XG4gICAgaWYgKGNvbnN0cnVjdG9yU3ltYm9sKSB7XG4gICAgICAvLyBGb3Igc29tZSByZWFzb24gdGhlIGNvbnN0cnVjdG9yIGRvZXMgbm90IGhhdmUgYSBgdmFsdWVEZWNsYXJhdGlvbmAgPyE/XG4gICAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yU3ltYm9sLmRlY2xhcmF0aW9ucyAmJiBjb25zdHJ1Y3RvclN5bWJvbC5kZWNsYXJhdGlvbnNbMF0gYXMgdHMuQ29uc3RydWN0b3JEZWNsYXJhdGlvbjtcbiAgICAgIGlmIChjb25zdHJ1Y3RvciAmJiBjb25zdHJ1Y3Rvci5wYXJhbWV0ZXJzKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKGNvbnN0cnVjdG9yLnBhcmFtZXRlcnMpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cblxufVxuXG5cbi8qKlxuICogQ29uc3RydWN0b3JzIHBhcmFtZXRlciBkZWNvcmF0b3JzIGFyZSBkZWNsYXJlZCBpbiB0aGUgYm9keSBvZiBzdGF0aWMgbWV0aG9kIG9mIHRoZSBjbGFzcyBpbiBFUzIwMTU6XG4gKlxuICogYGBgXG4gKiBTb21lRGlyZWN0aXZlLmN0b3JQYXJhbWV0ZXJzID0gKCkgPT4gW1xuICogICB7IHR5cGU6IFZpZXdDb250YWluZXJSZWYsIH0sXG4gKiAgIHsgdHlwZTogVGVtcGxhdGVSZWYsIH0sXG4gKiAgIHsgdHlwZTogSXRlcmFibGVEaWZmZXJzLCB9LFxuICogICB7IHR5cGU6IHVuZGVmaW5lZCwgZGVjb3JhdG9yczogW3sgdHlwZTogSW5qZWN0LCBhcmdzOiBbSU5KRUNURURfVE9LRU4sXSB9LF0gfSxcbiAqIF07XG4gKiBgYGBcbiAqL1xuZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3JEZWNvcmF0b3JzKGNsYXNzU3ltYm9sOiB0cy5TeW1ib2wpIHtcbiAgaWYgKGNsYXNzU3ltYm9sLmV4cG9ydHMgJiYgY2xhc3NTeW1ib2wuZXhwb3J0cy5oYXMoQ09OU1RSVUNUT1JfUEFSQU1TKSkge1xuICAgIGNvbnN0IHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5ID0gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2woY2xhc3NTeW1ib2wuZXhwb3J0cy5nZXQoQ09OU1RSVUNUT1JfUEFSQU1TKSEpO1xuICAgIGlmIChwYXJhbURlY29yYXRvcnNQcm9wZXJ0eSAmJiB0cy5pc0Fycm93RnVuY3Rpb24ocGFyYW1EZWNvcmF0b3JzUHJvcGVydHkpKSB7XG4gICAgICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHBhcmFtRGVjb3JhdG9yc1Byb3BlcnR5LmJvZHkpKSB7XG4gICAgICAgIHJldHVybiBwYXJhbURlY29yYXRvcnNQcm9wZXJ0eS5ib2R5LmVsZW1lbnRzLm1hcChlbGVtZW50ID0+IHRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24oZWxlbWVudCkgPyByZWZsZWN0T2JqZWN0TGl0ZXJhbChlbGVtZW50KSA6IG51bGwpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gW107XG59XG5cbi8qKlxuICogVGhlIGFyZ3VtZW50cyBvZiBhIGRlY29yYXRvciBhcmUgaGVsZCBpbiB0aGUgYGFyZ3NgIHByb3BlcnR5IG9mIGl0cyBkZWNsYXJhdGlvbiBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGdldERlY29yYXRvckFyZ3Mobm9kZTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24pIHtcbiAgY29uc3QgYXJnc1Byb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzXG4gICAgLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudClcbiAgICAuZmluZChwcm9wZXJ0eSA9PiBwcm9wZXJ0eS5uYW1lLmdldFRleHQoKSA9PT0gJ2FyZ3MnKTtcbiAgY29uc3QgYXJnc0V4cHJlc3Npb24gPSBhcmdzUHJvcGVydHkgJiYgYXJnc1Byb3BlcnR5LmluaXRpYWxpemVyO1xuICBpZiAoYXJnc0V4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGFyZ3NFeHByZXNzaW9uKSkge1xuICAgIHJldHVybiBBcnJheS5mcm9tKGFyZ3NFeHByZXNzaW9uLmVsZW1lbnRzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gW107XG4gIH1cbn1cblxuLyoqXG4gKiBIZWxwZXIgbWV0aG9kIHRvIGV4dHJhY3QgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgZ2l2ZW4gdGhlIHByb3BlcnR5J3MgXCJzeW1ib2xcIixcbiAqIHdoaWNoIGlzIGFjdHVhbGx5IHRoZSBzeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgb2YgdGhlIHByb3BlcnR5LlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChwcm9wU3ltYm9sOiB0cy5TeW1ib2wpIHtcbiAgY29uc3QgcHJvcElkZW50aWZpZXIgPSBwcm9wU3ltYm9sLnZhbHVlRGVjbGFyYXRpb247XG4gIGlmIChwcm9wSWRlbnRpZmllciAmJiBwcm9wSWRlbnRpZmllci5wYXJlbnQpIHtcbiAgICByZXR1cm4gKHByb3BJZGVudGlmaWVyLnBhcmVudCBhcyB0cy5Bc3NpZ25tZW50RXhwcmVzc2lvbjx0cy5FcXVhbHNUb2tlbj4pLnJpZ2h0O1xuICB9XG59XG4iXX0=