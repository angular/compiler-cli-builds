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
        define("angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    var DECORATORS = 'decorators';
    var PROP_DECORATORS = 'propDecorators';
    /**
     * Esm2015 packages contain ECMAScript 2015 classes, etc.
     * Decorators are static properties on the class. For example:
     *
     * ```
     * class NgForOf {
     * }
     * NgForOf.decorators = [
     *     { type: Directive, args: [{ selector: '[ngFor][ngForOf]' },] }
     * ];
     * NgForOf.ctorParameters = () => [
     *   { type: ViewContainerRef, },
     *   { type: TemplateRef, },
     *   { type: IterableDiffers, },
     * ];
     * NgForOf.propDecorators = {
     *   "ngForOf": [{ type: Input },],
     *   "ngForTrackBy": [{ type: Input },],
     *   "ngForTemplate": [{ type: Input },],
     * };
     * ```
     *
     * Items are decorated if they have a static property called `decorators`.
     *
     */
    var Esm2015ReflectionHost = /** @class */ (function (_super) {
        tslib_1.__extends(Esm2015ReflectionHost, _super);
        function Esm2015ReflectionHost(checker) {
            return _super.call(this, checker) || this;
        }
        /**
         * Parse the declaration and find the decorators that were attached to it.
         * @param declaration A declaration, whose decorators we want.
         */
        Esm2015ReflectionHost.prototype.getDecoratorsOfDeclaration = function (declaration) {
            if (ts.isClassDeclaration(declaration)) {
                if (declaration.name) {
                    var symbol = this.checker.getSymbolAtLocation(declaration.name);
                    if (symbol) {
                        return this.getClassDecorators(symbol);
                    }
                }
            }
            return null;
        };
        Esm2015ReflectionHost.prototype.isClass = function (node) {
            return ts.isClassDeclaration(node);
        };
        Esm2015ReflectionHost.prototype.getClassDecorators = function (classSymbol) {
            if (classSymbol.exports && classSymbol.exports.has(DECORATORS)) {
                // Symbol of the identifier for `SomeClass.decorators`.
                var decoratorsSymbol = classSymbol.exports.get(DECORATORS);
                var decoratorsIdentifier = decoratorsSymbol.valueDeclaration;
                if (decoratorsIdentifier && decoratorsIdentifier.parent) {
                    // AST of the array of decorator values
                    var decoratorsArray = decoratorsIdentifier.parent.right;
                    return this.getDecorators(decoratorsArray);
                }
            }
            return [];
        };
        Esm2015ReflectionHost.prototype.getMemberDecorators = function (classSymbol) {
            var _this = this;
            var memberDecorators = new Map();
            if (classSymbol.exports && classSymbol.exports.get(PROP_DECORATORS)) {
                // Symbol of the identifier for `SomeClass.propDecorators`.
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
        /**
         * Parse the declaration and find the decorators that were attached to the constructor.
         * @param declaration The declaration of the constructor, whose decorators we want.
         */
        Esm2015ReflectionHost.prototype.getConstructorParamDecorators = function (classSymbol) {
            throw new Error('Not implemented (GK)');
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
                            // Was the identifier was imported from `@angular/core`?
                            var importInfo = _this.getImportOfIdentifier(typeIdentifier);
                            // Get the args for the decorator
                            var argsProperty = node.properties.filter(ts.isPropertyAssignment).find(function (property) { return property.name.getText() === 'args'; });
                            var argsExpression = argsProperty && argsProperty.initializer;
                            var args = (argsExpression && ts.isArrayLiteralExpression(argsExpression)) ? Array.from(argsExpression.elements) : null;
                            var decorator_1 = { name: typeIdentifier.getText(), import: importInfo, node: node, args: args };
                            decorators_1.push(decorator_1);
                        }
                    }
                });
                return decorators_1;
            }
            return [];
        };
        return Esm2015ReflectionHost;
    }(reflector_1.TypeScriptReflectionHost));
    exports.Esm2015ReflectionHost = Esm2015ReflectionHost;
    function getPropertyValueFromSymbol(propSymbol) {
        var propIdentifier = propSymbol.valueDeclaration;
        if (propIdentifier && propIdentifier.parent) {
            return propIdentifier.parent.right;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9ob3N0L2VzbTIwMTVfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsb0ZBQXVHO0lBR3ZHLElBQU0sVUFBVSxHQUFHLFlBQTJCLENBQUM7SUFDL0MsSUFBTSxlQUFlLEdBQUcsZ0JBQStCLENBQUM7SUFFeEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXdCRztJQUNIO1FBQTJDLGlEQUF3QjtRQUNqRSwrQkFBWSxPQUF1QjttQkFDakMsa0JBQU0sT0FBTyxDQUFDO1FBQ2hCLENBQUM7UUFFRDs7O1dBR0c7UUFDSCwwREFBMEIsR0FBMUIsVUFBMkIsV0FBMkI7WUFDcEQsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQ3RDLElBQUksV0FBVyxDQUFDLElBQUksRUFBRTtvQkFDcEIsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2xFLElBQUksTUFBTSxFQUFFO3dCQUNWLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUN4QztpQkFDRjthQUNGO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsdUNBQU8sR0FBUCxVQUFRLElBQWE7WUFDbkIsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsQ0FBQztRQUVELGtEQUFrQixHQUFsQixVQUFtQixXQUFzQjtZQUN2QyxJQUFJLFdBQVcsQ0FBQyxPQUFPLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFD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QUFFLENBQUMsd0JBQXdCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQzs0QkFFMUgsSUFBTSxXQUFTLEdBQWMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsSUFBSSxNQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsQ0FBQzs0QkFDaEcsWUFBVSxDQUFDLElBQUksQ0FBQyxXQUFTLENBQUMsQ0FBQzt5QkFDNUI7cUJBQ0Y7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxZQUFVLENBQUM7YUFDbkI7WUFDRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUFuR0QsQ0FBMkMsb0NBQXdCLEdBbUdsRTtJQW5HWSxzREFBcUI7SUFxR2xDLG9DQUFvQyxVQUFxQjtRQUN2RCxJQUFNLGNBQWMsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7UUFDbkQsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRTtZQUMzQyxPQUFRLGNBQWMsQ0FBQyxNQUFrRCxDQUFDLEtBQUssQ0FBQztTQUNqRjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgRGVjb3JhdG9yIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvaG9zdCc7XG5pbXBvcnQgeyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsIH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvbWV0YWRhdGEvc3JjL3JlZmxlY3Rvcic7XG5pbXBvcnQgeyBOZ2NjUmVmbGVjdGlvbkhvc3QgfSBmcm9tICcuL25nY2NfaG9zdCc7XG5cbmNvbnN0IERFQ09SQVRPUlMgPSAnZGVjb3JhdG9ycycgYXMgdHMuX19TdHJpbmc7XG5jb25zdCBQUk9QX0RFQ09SQVRPUlMgPSAncHJvcERlY29yYXRvcnMnIGFzIHRzLl9fU3RyaW5nO1xuXG4vKipcbiAqIEVzbTIwMTUgcGFja2FnZXMgY29udGFpbiBFQ01BU2NyaXB0IDIwMTUgY2xhc3NlcywgZXRjLlxuICogRGVjb3JhdG9ycyBhcmUgc3RhdGljIHByb3BlcnRpZXMgb24gdGhlIGNsYXNzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGNsYXNzIE5nRm9yT2Yge1xuICogfVxuICogTmdGb3JPZi5kZWNvcmF0b3JzID0gW1xuICogICAgIHsgdHlwZTogRGlyZWN0aXZlLCBhcmdzOiBbeyBzZWxlY3RvcjogJ1tuZ0Zvcl1bbmdGb3JPZl0nIH0sXSB9XG4gKiBdO1xuICogTmdGb3JPZi5jdG9yUGFyYW1ldGVycyA9ICgpID0+IFtcbiAqICAgeyB0eXBlOiBWaWV3Q29udGFpbmVyUmVmLCB9LFxuICogICB7IHR5cGU6IFRlbXBsYXRlUmVmLCB9LFxuICogICB7IHR5cGU6IEl0ZXJhYmxlRGlmZmVycywgfSxcbiAqIF07XG4gKiBOZ0Zvck9mLnByb3BEZWNvcmF0b3JzID0ge1xuICogICBcIm5nRm9yT2ZcIjogW3sgdHlwZTogSW5wdXQgfSxdLFxuICogICBcIm5nRm9yVHJhY2tCeVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiAgIFwibmdGb3JUZW1wbGF0ZVwiOiBbeyB0eXBlOiBJbnB1dCB9LF0sXG4gKiB9O1xuICogYGBgXG4gKlxuICogSXRlbXMgYXJlIGRlY29yYXRlZCBpZiB0aGV5IGhhdmUgYSBzdGF0aWMgcHJvcGVydHkgY2FsbGVkIGBkZWNvcmF0b3JzYC5cbiAqXG4gKi9cbmV4cG9ydCBjbGFzcyBFc20yMDE1UmVmbGVjdGlvbkhvc3QgZXh0ZW5kcyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QgaW1wbGVtZW50cyBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICBjb25zdHJ1Y3RvcihjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcikge1xuICAgIHN1cGVyKGNoZWNrZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIHRoZSBkZWNsYXJhdGlvbiBhbmQgZmluZCB0aGUgZGVjb3JhdG9ycyB0aGF0IHdlcmUgYXR0YWNoZWQgdG8gaXQuXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBBIGRlY2xhcmF0aW9uLCB3aG9zZSBkZWNvcmF0b3JzIHdlIHdhbnQuXG4gICAqL1xuICBnZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb24pOiBEZWNvcmF0b3JbXXxudWxsIHtcbiAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKSkge1xuICAgICAgaWYgKGRlY2xhcmF0aW9uLm5hbWUpIHtcbiAgICAgICAgY29uc3Qgc3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZGVjbGFyYXRpb24ubmFtZSk7XG4gICAgICAgIGlmIChzeW1ib2wpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRDbGFzc0RlY29yYXRvcnMoc3ltYm9sKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlzQ2xhc3Mobm9kZTogdHMuTm9kZSk6IG5vZGUgaXMgdHMuRGVjbGFyYXRpb24ge1xuICAgIHJldHVybiB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSk7XG4gIH1cblxuICBnZXRDbGFzc0RlY29yYXRvcnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCkge1xuICAgIGlmIChjbGFzc1N5bWJvbC5leHBvcnRzICYmIGNsYXNzU3ltYm9sLmV4cG9ydHMuaGFzKERFQ09SQVRPUlMpKSB7XG5cbiAgICAgIC8vIFN5bWJvbCBvZiB0aGUgaWRlbnRpZmllciBmb3IgYFNvbWVDbGFzcy5kZWNvcmF0b3JzYC5cbiAgICAgIGNvbnN0IGRlY29yYXRvcnNTeW1ib2wgPSBjbGFzc1N5bWJvbC5leHBvcnRzLmdldChERUNPUkFUT1JTKSE7XG4gICAgICBjb25zdCBkZWNvcmF0b3JzSWRlbnRpZmllciA9IGRlY29yYXRvcnNTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcblxuICAgICAgaWYgKGRlY29yYXRvcnNJZGVudGlmaWVyICYmIGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCkge1xuICAgICAgICAvLyBBU1Qgb2YgdGhlIGFycmF5IG9mIGRlY29yYXRvciB2YWx1ZXNcbiAgICAgICAgY29uc3QgZGVjb3JhdG9yc0FycmF5ID0gKGRlY29yYXRvcnNJZGVudGlmaWVyLnBhcmVudCBhcyB0cy5Bc3NpZ25tZW50RXhwcmVzc2lvbjx0cy5FcXVhbHNUb2tlbj4pLnJpZ2h0O1xuICAgICAgICByZXR1cm4gdGhpcy5nZXREZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldE1lbWJlckRlY29yYXRvcnMoY2xhc3NTeW1ib2w6IHRzLlN5bWJvbCkge1xuICAgIGNvbnN0IG1lbWJlckRlY29yYXRvcnMgPSBuZXcgTWFwPHN0cmluZywgRGVjb3JhdG9yW10+KCk7XG4gICAgaWYgKGNsYXNzU3ltYm9sLmV4cG9ydHMgJiYgY2xhc3NTeW1ib2wuZXhwb3J0cy5nZXQoUFJPUF9ERUNPUkFUT1JTKSkge1xuXG4gICAgICAvLyBTeW1ib2wgb2YgdGhlIGlkZW50aWZpZXIgZm9yIGBTb21lQ2xhc3MucHJvcERlY29yYXRvcnNgLlxuICAgICAgY29uc3QgcHJvcERlY29yYXRvcnNNYXAgPSBnZXRQcm9wZXJ0eVZhbHVlRnJvbVN5bWJvbChjbGFzc1N5bWJvbC5leHBvcnRzLmdldChQUk9QX0RFQ09SQVRPUlMpISk7XG4gICAgICBpZiAocHJvcERlY29yYXRvcnNNYXAgJiYgdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihwcm9wRGVjb3JhdG9yc01hcCkpIHtcbiAgICAgICAgY29uc3QgcHJvcGVydGllc01hcCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKHByb3BEZWNvcmF0b3JzTWFwKTtcbiAgICAgICAgcHJvcGVydGllc01hcC5mb3JFYWNoKCh2YWx1ZSwgbmFtZSkgPT4ge1xuICAgICAgICAgIG1lbWJlckRlY29yYXRvcnMuc2V0KG5hbWUsIHRoaXMuZ2V0RGVjb3JhdG9ycyh2YWx1ZSkpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1lbWJlckRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgdGhlIGRlY2xhcmF0aW9uIGFuZCBmaW5kIHRoZSBkZWNvcmF0b3JzIHRoYXQgd2VyZSBhdHRhY2hlZCB0byB0aGUgY29uc3RydWN0b3IuXG4gICAqIEBwYXJhbSBkZWNsYXJhdGlvbiBUaGUgZGVjbGFyYXRpb24gb2YgdGhlIGNvbnN0cnVjdG9yLCB3aG9zZSBkZWNvcmF0b3JzIHdlIHdhbnQuXG4gICAqL1xuICBnZXRDb25zdHJ1Y3RvclBhcmFtRGVjb3JhdG9ycyhjbGFzc1N5bWJvbDogdHMuU3ltYm9sKTogTWFwPHN0cmluZywgRGVjb3JhdG9yW10+IHtcblxuICAgIHRocm93IG5ldyBFcnJvcignTm90IGltcGxlbWVudGVkIChHSyknKTtcbiAgfVxuXG5cbiAgcHJpdmF0ZSBnZXREZWNvcmF0b3JzKGRlY29yYXRvcnNBcnJheTogdHMuRXhwcmVzc2lvbikge1xuICAgIGlmIChkZWNvcmF0b3JzQXJyYXkgJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGRlY29yYXRvcnNBcnJheSkpIHtcbiAgICAgIGNvbnN0IGRlY29yYXRvcnM6IERlY29yYXRvcltdID0gW107XG5cbiAgICAgIC8vIEFkZCBlYWNoIGRlY29yYXRvciB0aGF0IGlzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgIGludG8gdGhlIGBkZWNvcmF0b3JzYCBhcnJheVxuICAgICAgZGVjb3JhdG9yc0FycmF5LmVsZW1lbnRzLmZvckVhY2gobm9kZSA9PiB7XG5cbiAgICAgICAgLy8gSWYgdGhlIGRlY29yYXRvciBpcyBub3QgYW4gb2JqZWN0IGxpdGVyYWwgZXhwcmVzc2lvbiB0aGVuIHdlIGFyZSBub3QgaW50ZXJlc3RlZFxuICAgICAgICBpZih0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG5vZGUpKSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBvYmplY3RzIG9mIHRoZSBmb3JtOiBgeyB0eXBlOiBEZWNvcmF0b3JUeXBlLCBhcmdzOiBbLi4uXSB9YFxuICAgICAgICAgIGNvbnN0IGRlY29yYXRvciA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG5vZGUpO1xuXG4gICAgICAgICAgLy8gSXMgdGhlIHZhbHVlIG9mIHRoZSBgdHlwZWAgcHJvcGVydHkgYW4gaWRlbnRpZmllcj9cbiAgICAgICAgICBjb25zdCB0eXBlSWRlbnRpZmllciA9IGRlY29yYXRvci5nZXQoJ3R5cGUnKTtcbiAgICAgICAgICBpZiAodHlwZUlkZW50aWZpZXIgJiYgdHMuaXNJZGVudGlmaWVyKHR5cGVJZGVudGlmaWVyKSkge1xuXG4gICAgICAgICAgICAvLyBXYXMgdGhlIGlkZW50aWZpZXIgd2FzIGltcG9ydGVkIGZyb20gYEBhbmd1bGFyL2NvcmVgP1xuICAgICAgICAgICAgY29uc3QgaW1wb3J0SW5mbyA9IHRoaXMuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVJZGVudGlmaWVyKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgYXJncyBmb3IgdGhlIGRlY29yYXRvclxuICAgICAgICAgICAgY29uc3QgYXJnc1Byb3BlcnR5ID0gbm9kZS5wcm9wZXJ0aWVzLmZpbHRlcih0cy5pc1Byb3BlcnR5QXNzaWdubWVudCkuZmluZChwcm9wZXJ0eSA9PiBwcm9wZXJ0eS5uYW1lLmdldFRleHQoKSA9PT0gJ2FyZ3MnKTtcbiAgICAgICAgICAgIGNvbnN0IGFyZ3NFeHByZXNzaW9uID0gYXJnc1Byb3BlcnR5ICYmIGFyZ3NQcm9wZXJ0eS5pbml0aWFsaXplcjtcbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSAoYXJnc0V4cHJlc3Npb24gJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKGFyZ3NFeHByZXNzaW9uKSkgPyBBcnJheS5mcm9tKGFyZ3NFeHByZXNzaW9uLmVsZW1lbnRzKSA6IG51bGw7XG5cbiAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcjogRGVjb3JhdG9yID0geyBuYW1lOiB0eXBlSWRlbnRpZmllci5nZXRUZXh0KCksIGltcG9ydDogaW1wb3J0SW5mbywgbm9kZSwgYXJncyB9O1xuICAgICAgICAgICAgZGVjb3JhdG9ycy5wdXNoKGRlY29yYXRvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBkZWNvcmF0b3JzO1xuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJvcGVydHlWYWx1ZUZyb21TeW1ib2wocHJvcFN5bWJvbDogdHMuU3ltYm9sKSB7XG4gIGNvbnN0IHByb3BJZGVudGlmaWVyID0gcHJvcFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICBpZiAocHJvcElkZW50aWZpZXIgJiYgcHJvcElkZW50aWZpZXIucGFyZW50KSB7XG4gICAgcmV0dXJuIChwcm9wSWRlbnRpZmllci5wYXJlbnQgYXMgdHMuQXNzaWdubWVudEV4cHJlc3Npb248dHMuRXF1YWxzVG9rZW4+KS5yaWdodDtcbiAgfVxufSJdfQ==