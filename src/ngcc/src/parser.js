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
        define("angular/packages/compiler-cli/src/ngcc/src/parser", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var PackageParser = /** @class */ (function () {
        function PackageParser(reflectionHost) {
            this.reflectionHost = reflectionHost;
        }
        /**
         * Search the AST of the specified source file, looking for classes that have been decorated.
         * @param entryPoint The source file containing the exports to find.
         * @returns an array containing the decorated classes found in this file.
         */
        PackageParser.prototype.getDecoratedClasses = function (entryPoint) {
            var _this = this;
            var decoratedClasses = [];
            var walk = function (node) {
                ts.forEachChild(node, function (node) {
                    if (_this.reflectionHost.isClass(node)) {
                        var decorators = _this.reflectionHost.getDecoratorsOfDeclaration(node);
                        if (decorators && decorators.length) {
                            decoratedClasses.push({ classNode: node, decorators: decorators });
                        }
                    }
                    else {
                        walk(node);
                    }
                });
            };
            walk(entryPoint);
            return decoratedClasses;
        };
        return PackageParser;
    }());
    exports.PackageParser = PackageParser;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFTakM7UUFDRSx1QkFBb0IsY0FBa0M7WUFBbEMsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1FBQUcsQ0FBQztRQUUxRDs7OztXQUlHO1FBQ0gsMkNBQW1CLEdBQW5CLFVBQW9CLFVBQXlCO1lBQTdDLGlCQWlCQztZQWhCQyxJQUFNLGdCQUFnQixHQUFxQixFQUFFLENBQUM7WUFDOUMsSUFBTSxJQUFJLEdBQUcsVUFBQyxJQUFhO2dCQUN6QixFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxVQUFBLElBQUk7b0JBQ3hCLElBQUksS0FBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ3JDLElBQU0sVUFBVSxHQUFHLEtBQUksQ0FBQyxjQUFjLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3hFLElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUU7NEJBQ25DLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsVUFBVSxZQUFBLEVBQUUsQ0FBQyxDQUFDO3lCQUN4RDtxQkFDRjt5QkFBTTt3QkFDTCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ1o7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUM7WUFFRixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDakIsT0FBTyxnQkFBZ0IsQ0FBQztRQUMxQixDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBMUJELElBMEJDO0lBMUJZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IERlY29yYXRvciB9IGZyb20gJy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHsgTmdjY1JlZmxlY3Rpb25Ib3N0IH0gZnJvbSAnLi9ob3N0L25nY2NfaG9zdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVjb3JhdGVkQ2xhc3Mge1xuICBjbGFzc05vZGU6IHRzLk5vZGU7XG4gIGRlY29yYXRvcnM6IERlY29yYXRvcltdO1xufVxuXG5leHBvcnQgY2xhc3MgUGFja2FnZVBhcnNlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCkge31cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBBU1Qgb2YgdGhlIHNwZWNpZmllZCBzb3VyY2UgZmlsZSwgbG9va2luZyBmb3IgY2xhc3NlcyB0aGF0IGhhdmUgYmVlbiBkZWNvcmF0ZWQuXG4gICAqIEBwYXJhbSBlbnRyeVBvaW50IFRoZSBzb3VyY2UgZmlsZSBjb250YWluaW5nIHRoZSBleHBvcnRzIHRvIGZpbmQuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGRlY29yYXRlZCBjbGFzc2VzIGZvdW5kIGluIHRoaXMgZmlsZS5cbiAgICovXG4gIGdldERlY29yYXRlZENsYXNzZXMoZW50cnlQb2ludDogdHMuU291cmNlRmlsZSk6IERlY29yYXRlZENsYXNzW10ge1xuICAgIGNvbnN0IGRlY29yYXRlZENsYXNzZXM6IERlY29yYXRlZENsYXNzW10gPSBbXTtcbiAgICBjb25zdCB3YWxrID0gKG5vZGU6IHRzLk5vZGUpID0+IHtcbiAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCBub2RlID0+IHtcbiAgICAgICAgaWYgKHRoaXMucmVmbGVjdGlvbkhvc3QuaXNDbGFzcyhub2RlKSkge1xuICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rpb25Ib3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuICAgICAgICAgIGlmIChkZWNvcmF0b3JzICYmIGRlY29yYXRvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBkZWNvcmF0ZWRDbGFzc2VzLnB1c2goeyBjbGFzc05vZGU6IG5vZGUsIGRlY29yYXRvcnMgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdhbGsobm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB3YWxrKGVudHJ5UG9pbnQpO1xuICAgIHJldHVybiBkZWNvcmF0ZWRDbGFzc2VzO1xuICB9XG59XG4iXX0=