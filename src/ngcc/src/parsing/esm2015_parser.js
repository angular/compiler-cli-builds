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
        define("@angular/compiler-cli/src/ngcc/src/parsing/esm2015_parser", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngcc/src/parsing/parsed_class", "@angular/compiler-cli/src/ngcc/src/parsing/parsed_file"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var parsed_class_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/parsed_class");
    var parsed_file_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/parsed_file");
    var Esm2015FileParser = /** @class */ (function () {
        function Esm2015FileParser(program, host) {
            this.program = program;
            this.host = host;
            this.checker = this.program.getTypeChecker();
        }
        Esm2015FileParser.prototype.parseFile = function (file) {
            var _this = this;
            var moduleSymbol = this.checker.getSymbolAtLocation(file);
            var map = new Map();
            if (moduleSymbol) {
                var exportClasses = this.checker.getExportsOfModule(moduleSymbol)
                    .map(function (exportSymbol) { return ts.SymbolFlags.Alias & exportSymbol.flags ? _this.checker.getAliasedSymbol(exportSymbol) : exportSymbol; })
                    .filter(function (exportSymbol) { return exportSymbol.flags & ts.SymbolFlags.Class; });
                var classDeclarations = exportClasses
                    .map(function (exportSymbol) { return exportSymbol.valueDeclaration; });
                var decoratedClasses = classDeclarations
                    .map(function (declaration) {
                    var decorators = _this.host.getDecoratorsOfDeclaration(declaration);
                    if (decorators) {
                        return new parsed_class_1.ParsedClass(declaration.name.text, declaration, decorators);
                    }
                })
                    .filter(function (decoratedClass) { return decoratedClass; });
                decoratedClasses.forEach(function (clazz) {
                    var file = clazz.declaration.getSourceFile();
                    if (!map.has(file)) {
                        map.set(file, new parsed_file_1.ParsedFile(file));
                    }
                    map.get(file).decoratedClasses.push(clazz);
                });
            }
            return Array.from(map.values());
        };
        return Esm2015FileParser;
    }());
    exports.Esm2015FileParser = Esm2015FileParser;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvZXNtMjAxNV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsd0ZBQTRDO0lBQzVDLHNGQUEyQztJQUczQztRQUlFLDJCQUNZLE9BQW1CLEVBQ25CLElBQXdCO1lBRHhCLFlBQU8sR0FBUCxPQUFPLENBQVk7WUFDbkIsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFKcEMsWUFBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFJRCxDQUFDO1FBRXhDLHFDQUFTLEdBQVQsVUFBVSxJQUFtQjtZQUE3QixpQkErQkM7WUE5QkMsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1RCxJQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztZQUNqRCxJQUFJLFlBQVksRUFBRTtnQkFFaEIsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7cUJBQ2hFLEdBQUcsQ0FBQyxVQUFBLFlBQVksSUFBSSxPQUFBLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBdEcsQ0FBc0csQ0FBQztxQkFDM0gsTUFBTSxDQUFDLFVBQUEsWUFBWSxJQUFJLE9BQUEsWUFBWSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBekMsQ0FBeUMsQ0FBQyxDQUFDO2dCQUVyRSxJQUFNLGlCQUFpQixHQUFHLGFBQWE7cUJBQ3BDLEdBQUcsQ0FBQyxVQUFBLFlBQVksSUFBSSxPQUFBLFlBQVksQ0FBQyxnQkFBdUMsRUFBcEQsQ0FBb0QsQ0FBQyxDQUFDO2dCQUc3RSxJQUFNLGdCQUFnQixHQUFHLGlCQUFpQjtxQkFDdkMsR0FBRyxDQUFDLFVBQUEsV0FBVztvQkFDZCxJQUFNLFVBQVUsR0FBRyxLQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNyRSxJQUFJLFVBQVUsRUFBRTt3QkFDZCxPQUFPLElBQUksMEJBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7cUJBQ3pFO2dCQUNILENBQUMsQ0FBQztxQkFDRCxNQUFNLENBQUMsVUFBQSxjQUFjLElBQUksT0FBQSxjQUFjLEVBQWQsQ0FBYyxDQUFrQixDQUFDO2dCQUU3RCxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLO29CQUM1QixJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUMvQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDbEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSx3QkFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7cUJBQ3JDO29CQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM5QyxDQUFDLENBQUMsQ0FBQzthQUNKO1lBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUF4Q0QsSUF3Q0M7SUF4Q1ksOENBQWlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IE5nY2NSZWZsZWN0aW9uSG9zdCB9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7IFBhcnNlZENsYXNzfSBmcm9tICcuL3BhcnNlZF9jbGFzcyc7XG5pbXBvcnQgeyBQYXJzZWRGaWxlIH0gZnJvbSAnLi9wYXJzZWRfZmlsZSc7XG5pbXBvcnQgeyBGaWxlUGFyc2VyIH0gZnJvbSAnLi9maWxlX3BhcnNlcic7XG5cbmV4cG9ydCBjbGFzcyBFc20yMDE1RmlsZVBhcnNlciBpbXBsZW1lbnRzIEZpbGVQYXJzZXIge1xuXG4gIGNoZWNrZXIgPSB0aGlzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICBwcm90ZWN0ZWQgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIHBhcnNlRmlsZShmaWxlOiB0cy5Tb3VyY2VGaWxlKTogUGFyc2VkRmlsZVtdIHtcbiAgICBjb25zdCBtb2R1bGVTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihmaWxlKTtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFBhcnNlZEZpbGU+KCk7XG4gICAgaWYgKG1vZHVsZVN5bWJvbCkge1xuXG4gICAgICBjb25zdCBleHBvcnRDbGFzc2VzID0gdGhpcy5jaGVja2VyLmdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGVTeW1ib2wpXG4gICAgICAgIC5tYXAoZXhwb3J0U3ltYm9sID0+IHRzLlN5bWJvbEZsYWdzLkFsaWFzICYgZXhwb3J0U3ltYm9sLmZsYWdzID8gdGhpcy5jaGVja2VyLmdldEFsaWFzZWRTeW1ib2woZXhwb3J0U3ltYm9sKSA6IGV4cG9ydFN5bWJvbClcbiAgICAgICAgLmZpbHRlcihleHBvcnRTeW1ib2wgPT4gZXhwb3J0U3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQ2xhc3MpO1xuXG4gICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9ucyA9IGV4cG9ydENsYXNzZXNcbiAgICAgICAgLm1hcChleHBvcnRTeW1ib2wgPT4gZXhwb3J0U3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbik7XG5cblxuICAgICAgY29uc3QgZGVjb3JhdGVkQ2xhc3NlcyA9IGNsYXNzRGVjbGFyYXRpb25zXG4gICAgICAgIC5tYXAoZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmhvc3QuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgICAgICAgIGlmIChkZWNvcmF0b3JzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFBhcnNlZENsYXNzKGRlY2xhcmF0aW9uLm5hbWUhLnRleHQsIGRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5maWx0ZXIoZGVjb3JhdGVkQ2xhc3MgPT4gZGVjb3JhdGVkQ2xhc3MpIGFzIFBhcnNlZENsYXNzW107XG5cbiAgICAgIGRlY29yYXRlZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBjbGF6ei5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgIGlmICghbWFwLmhhcyhmaWxlKSkge1xuICAgICAgICAgIG1hcC5zZXQoZmlsZSwgbmV3IFBhcnNlZEZpbGUoZmlsZSkpO1xuICAgICAgICB9XG4gICAgICAgIG1hcC5nZXQoZmlsZSkhLmRlY29yYXRlZENsYXNzZXMucHVzaChjbGF6eik7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIEFycmF5LmZyb20obWFwLnZhbHVlcygpKTtcbiAgfVxufVxuIl19