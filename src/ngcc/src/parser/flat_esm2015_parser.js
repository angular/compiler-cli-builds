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
        define("angular/packages/compiler-cli/src/ngcc/src/parser/flat_esm2015_parser", ["require", "exports", "typescript", "angular/packages/compiler-cli/src/ngcc/src/parser/parser"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var parser_1 = require("angular/packages/compiler-cli/src/ngcc/src/parser/parser");
    var FlatEsm2015PackageParser = /** @class */ (function () {
        function FlatEsm2015PackageParser(checker, host) {
            this.checker = checker;
            this.host = host;
        }
        FlatEsm2015PackageParser.prototype.getDecoratedClasses = function (sourceFile) {
            var _this = this;
            var moduleSymbol = this.checker.getSymbolAtLocation(sourceFile);
            if (moduleSymbol) {
                var exportClasses = this.checker.getExportsOfModule(moduleSymbol)
                    .map(function (exportSymbol) { return _this.checker.getAliasedSymbol(exportSymbol); })
                    .filter(function (exportSymbol) { return exportSymbol.flags & ts.SymbolFlags.Class; });
                var classDeclarations = exportClasses
                    .map(function (exportSymbol) { return exportSymbol.valueDeclaration; });
                var decoratedClasses = classDeclarations
                    .map(function (declaration) {
                    var decorators = _this.host.getDecoratorsOfDeclaration(declaration);
                    if (decorators) {
                        return new parser_1.DecoratedClass(declaration.name.getText(), declaration, decorators);
                    }
                })
                    .filter(function (decoratedClass) { return decoratedClass; });
                return decoratedClasses;
            }
            return [];
        };
        return FlatEsm2015PackageParser;
    }());
    exports.FlatEsm2015PackageParser = FlatEsm2015PackageParser;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhdF9lc20yMDE1X3BhcnNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvcGFyc2VyL2ZsYXRfZXNtMjAxNV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsbUZBQXlEO0lBRXpEO1FBRUUsa0NBQ1ksT0FBdUIsRUFDdkIsSUFBd0I7WUFEeEIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFDdkIsU0FBSSxHQUFKLElBQUksQ0FBb0I7UUFBRyxDQUFDO1FBRXhDLHNEQUFtQixHQUFuQixVQUFvQixVQUF5QjtZQUE3QyxpQkF1QkM7WUF0QkMsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNsRSxJQUFJLFlBQVksRUFBRTtnQkFFaEIsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7cUJBQ2hFLEdBQUcsQ0FBQyxVQUFBLFlBQVksSUFBSSxPQUFBLEtBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEVBQTNDLENBQTJDLENBQUM7cUJBQ2hFLE1BQU0sQ0FBQyxVQUFBLFlBQVksSUFBSSxPQUFBLFlBQVksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQXpDLENBQXlDLENBQUMsQ0FBQztnQkFFckUsSUFBTSxpQkFBaUIsR0FBRyxhQUFhO3FCQUNwQyxHQUFHLENBQUMsVUFBQSxZQUFZLElBQUksT0FBQSxZQUFZLENBQUMsZ0JBQWdCLEVBQTdCLENBQTZCLENBQXFCLENBQUM7Z0JBRTFFLElBQU0sZ0JBQWdCLEdBQUcsaUJBQWlCO3FCQUN2QyxHQUFHLENBQUMsVUFBQyxXQUFnQztvQkFDcEMsSUFBTSxVQUFVLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDckUsSUFBSSxVQUFVLEVBQUU7d0JBQ2QsT0FBTyxJQUFJLHVCQUFjLENBQUMsV0FBVyxDQUFDLElBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7cUJBQ2pGO2dCQUNILENBQUMsQ0FBQztxQkFDRCxNQUFNLENBQUMsVUFBQSxjQUFjLElBQUksT0FBQSxjQUFjLEVBQWQsQ0FBYyxDQUFxQixDQUFDO2dCQUVoRSxPQUFPLGdCQUFnQixDQUFDO2FBQ3pCO1lBQ0QsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBQ0gsK0JBQUM7SUFBRCxDQUFDLEFBOUJELElBOEJDO0lBOUJZLDREQUF3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBOZ2NjUmVmbGVjdGlvbkhvc3QgfSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQgeyBEZWNvcmF0ZWRDbGFzcywgUGFja2FnZVBhcnNlciB9IGZyb20gJy4vcGFyc2VyJztcblxuZXhwb3J0IGNsYXNzIEZsYXRFc20yMDE1UGFja2FnZVBhcnNlciBpbXBsZW1lbnRzIFBhY2thZ2VQYXJzZXIge1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByb3RlY3RlZCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICBwcm90ZWN0ZWQgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIGdldERlY29yYXRlZENsYXNzZXMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSk6IERlY29yYXRlZENsYXNzW10ge1xuICAgIGNvbnN0IG1vZHVsZVN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHNvdXJjZUZpbGUpO1xuICAgIGlmIChtb2R1bGVTeW1ib2wpIHtcblxuICAgICAgY29uc3QgZXhwb3J0Q2xhc3NlcyA9IHRoaXMuY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlU3ltYm9sKVxuICAgICAgICAubWFwKGV4cG9ydFN5bWJvbCA9PiB0aGlzLmNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChleHBvcnRTeW1ib2wpKVxuICAgICAgICAuZmlsdGVyKGV4cG9ydFN5bWJvbCA9PiBleHBvcnRTeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5DbGFzcyk7XG5cbiAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb25zID0gZXhwb3J0Q2xhc3Nlc1xuICAgICAgICAubWFwKGV4cG9ydFN5bWJvbCA9PiBleHBvcnRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbikgYXMgdHMuRGVjbGFyYXRpb25bXTtcblxuICAgICAgY29uc3QgZGVjb3JhdGVkQ2xhc3NlcyA9IGNsYXNzRGVjbGFyYXRpb25zXG4gICAgICAgIC5tYXAoKGRlY2xhcmF0aW9uOiB0cy5DbGFzc0RlY2xhcmF0aW9uKSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMuaG9zdC5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihkZWNsYXJhdGlvbik7XG4gICAgICAgICAgaWYgKGRlY29yYXRvcnMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGVjb3JhdGVkQ2xhc3MoZGVjbGFyYXRpb24ubmFtZSEuZ2V0VGV4dCgpLCBkZWNsYXJhdGlvbiwgZGVjb3JhdG9ycyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuZmlsdGVyKGRlY29yYXRlZENsYXNzID0+IGRlY29yYXRlZENsYXNzKSBhcyBEZWNvcmF0ZWRDbGFzc1tdO1xuXG4gICAgICByZXR1cm4gZGVjb3JhdGVkQ2xhc3NlcztcbiAgICB9XG4gICAgcmV0dXJuIFtdO1xuICB9XG59Il19