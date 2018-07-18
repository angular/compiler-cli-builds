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
        define("@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngcc/src/utils", "@angular/compiler-cli/src/ngcc/src/parsing/parsed_class", "@angular/compiler-cli/src/ngcc/src/parsing/parsed_file"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    var parsed_class_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/parsed_class");
    var parsed_file_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/parsed_file");
    /**
     * Parses ESM5 package files for decoratrs classes.
     * ESM5 "classes" are actually functions wrapped by and returned
     * from an IFEE.
     */
    var Esm5FileParser = /** @class */ (function () {
        function Esm5FileParser(program, host) {
            this.program = program;
            this.host = host;
            this.checker = this.program.getTypeChecker();
        }
        Esm5FileParser.prototype.parseFile = function (file) {
            var _this = this;
            var moduleSymbol = this.checker.getSymbolAtLocation(file);
            var map = new Map();
            var getParsedClass = function (declaration) {
                var decorators = _this.host.getDecoratorsOfDeclaration(declaration);
                if (decorators) {
                    return new parsed_class_1.ParsedClass(utils_1.getNameText(declaration.name), declaration, decorators);
                }
            };
            if (moduleSymbol) {
                var classDeclarations = this.checker.getExportsOfModule(moduleSymbol)
                    .map(utils_1.getOriginalSymbol(this.checker))
                    .map(function (exportSymbol) { return exportSymbol.valueDeclaration; })
                    .filter(utils_1.isDefined)
                    .filter(ts.isVariableDeclaration);
                var decoratedClasses = classDeclarations.map(getParsedClass).filter(utils_1.isDefined);
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
        return Esm5FileParser;
    }());
    exports.Esm5FileParser = Esm5FileParser;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvZXNtNV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakMsa0VBQW1FO0lBR25FLHdGQUEyQztJQUMzQyxzRkFBeUM7SUFJekM7Ozs7T0FJRztJQUNIO1FBR0Usd0JBQXNCLE9BQW1CLEVBQVksSUFBd0I7WUFBdkQsWUFBTyxHQUFQLE9BQU8sQ0FBWTtZQUFZLFNBQUksR0FBSixJQUFJLENBQW9CO1lBRjdFLFlBQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXdDLENBQUM7UUFFakYsa0NBQVMsR0FBVCxVQUFVLElBQW1CO1lBQTdCLGlCQTRCQztZQTNCQyxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVELElBQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFDO1lBQ2pELElBQU0sY0FBYyxHQUFHLFVBQUMsV0FBbUM7Z0JBQ3pELElBQU0sVUFBVSxHQUFHLEtBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3JFLElBQUksVUFBVSxFQUFFO29CQUNkLE9BQU8sSUFBSSwwQkFBVyxDQUFDLG1CQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztpQkFDaEY7WUFDSCxDQUFDLENBQUM7WUFFRixJQUFJLFlBQVksRUFBRTtnQkFDaEIsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQztxQkFDeEMsR0FBRyxDQUFDLHlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDcEMsR0FBRyxDQUFDLFVBQUEsWUFBWSxJQUFJLE9BQUEsWUFBWSxDQUFDLGdCQUFnQixFQUE3QixDQUE2QixDQUFDO3FCQUNsRCxNQUFNLENBQUMsaUJBQVMsQ0FBQztxQkFDakIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUVoRSxJQUFNLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQVMsQ0FBQyxDQUFDO2dCQUVqRixnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLO29CQUM1QixJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUMvQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDbEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSx3QkFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7cUJBQ3JDO29CQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMvQyxDQUFDLENBQUMsQ0FBQzthQUNKO1lBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUFsQ0QsSUFrQ0M7SUFsQ1ksd0NBQWMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtnZXROYW1lVGV4dCwgZ2V0T3JpZ2luYWxTeW1ib2wsIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0ZpbGVQYXJzZXJ9IGZyb20gJy4vZmlsZV9wYXJzZXInO1xuaW1wb3J0IHtQYXJzZWRDbGFzc30gZnJvbSAnLi9wYXJzZWRfY2xhc3MnO1xuaW1wb3J0IHtQYXJzZWRGaWxlfSBmcm9tICcuL3BhcnNlZF9maWxlJztcblxuXG5cbi8qKlxuICogUGFyc2VzIEVTTTUgcGFja2FnZSBmaWxlcyBmb3IgZGVjb3JhdHJzIGNsYXNzZXMuXG4gKiBFU001IFwiY2xhc3Nlc1wiIGFyZSBhY3R1YWxseSBmdW5jdGlvbnMgd3JhcHBlZCBieSBhbmQgcmV0dXJuZWRcbiAqIGZyb20gYW4gSUZFRS5cbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTVGaWxlUGFyc2VyIGltcGxlbWVudHMgRmlsZVBhcnNlciB7XG4gIGNoZWNrZXIgPSB0aGlzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJvdGVjdGVkIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCkge31cblxuICBwYXJzZUZpbGUoZmlsZTogdHMuU291cmNlRmlsZSk6IFBhcnNlZEZpbGVbXSB7XG4gICAgY29uc3QgbW9kdWxlU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZmlsZSk7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBQYXJzZWRGaWxlPigpO1xuICAgIGNvbnN0IGdldFBhcnNlZENsYXNzID0gKGRlY2xhcmF0aW9uOiB0cy5WYXJpYWJsZURlY2xhcmF0aW9uKSA9PiB7XG4gICAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5ob3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICAgIGlmIChkZWNvcmF0b3JzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUGFyc2VkQ2xhc3MoZ2V0TmFtZVRleHQoZGVjbGFyYXRpb24ubmFtZSksIGRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKG1vZHVsZVN5bWJvbCkge1xuICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbnMgPSB0aGlzLmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZVN5bWJvbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZ2V0T3JpZ2luYWxTeW1ib2wodGhpcy5jaGVja2VyKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZXhwb3J0U3ltYm9sID0+IGV4cG9ydFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbik7XG5cbiAgICAgIGNvbnN0IGRlY29yYXRlZENsYXNzZXMgPSBjbGFzc0RlY2xhcmF0aW9ucy5tYXAoZ2V0UGFyc2VkQ2xhc3MpLmZpbHRlcihpc0RlZmluZWQpO1xuXG4gICAgICBkZWNvcmF0ZWRDbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgICBjb25zdCBmaWxlID0gY2xhenouZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgICBpZiAoIW1hcC5oYXMoZmlsZSkpIHtcbiAgICAgICAgICBtYXAuc2V0KGZpbGUsIG5ldyBQYXJzZWRGaWxlKGZpbGUpKTtcbiAgICAgICAgfVxuICAgICAgICBtYXAuZ2V0KGZpbGUpICEuZGVjb3JhdGVkQ2xhc3Nlcy5wdXNoKGNsYXp6KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gQXJyYXkuZnJvbShtYXAudmFsdWVzKCkpO1xuICB9XG59XG4iXX0=