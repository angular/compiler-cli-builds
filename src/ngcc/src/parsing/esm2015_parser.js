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
        define("@angular/compiler-cli/src/ngcc/src/parsing/esm2015_parser", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngcc/src/utils", "@angular/compiler-cli/src/ngcc/src/parsing/parsed_class", "@angular/compiler-cli/src/ngcc/src/parsing/parsed_file"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
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
                    .map(utils_1.getOriginalSymbol(this.checker))
                    .filter(function (exportSymbol) { return exportSymbol.flags & ts.SymbolFlags.Class; });
                var classDeclarations = exportClasses.map(function (exportSymbol) { return exportSymbol.valueDeclaration; })
                    .filter(utils_1.isDefined)
                    .filter(ts.isClassDeclaration);
                var decoratedClasses = classDeclarations
                    .map(function (declaration) {
                    var decorators = _this.host.getDecoratorsOfDeclaration(declaration);
                    return decorators && declaration.name &&
                        new parsed_class_1.ParsedClass(declaration.name.text, declaration, decorators);
                })
                    .filter(utils_1.isDefined);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvZXNtMjAxNV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakMsa0VBQXNEO0lBR3RELHdGQUEyQztJQUMzQyxzRkFBeUM7SUFFekM7UUFHRSwyQkFBc0IsT0FBbUIsRUFBWSxJQUF3QjtZQUF2RCxZQUFPLEdBQVAsT0FBTyxDQUFZO1lBQVksU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFGN0UsWUFBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFd0MsQ0FBQztRQUVqRixxQ0FBUyxHQUFULFVBQVUsSUFBbUI7WUFBN0IsaUJBOEJDO1lBN0JDLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUQsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUM7WUFDakQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDO3FCQUN4QyxHQUFHLENBQUMseUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3FCQUNwQyxNQUFNLENBQUMsVUFBQSxZQUFZLElBQUksT0FBQSxZQUFZLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUF6QyxDQUF5QyxDQUFDLENBQUM7Z0JBRTdGLElBQU0saUJBQWlCLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxVQUFBLFlBQVksSUFBSSxPQUFBLFlBQVksQ0FBQyxnQkFBZ0IsRUFBN0IsQ0FBNkIsQ0FBQztxQkFDM0QsTUFBTSxDQUFDLGlCQUFTLENBQUM7cUJBQ2pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFFN0QsSUFBTSxnQkFBZ0IsR0FDbEIsaUJBQWlCO3FCQUNaLEdBQUcsQ0FBQyxVQUFBLFdBQVc7b0JBQ2QsSUFBTSxVQUFVLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDckUsT0FBTyxVQUFVLElBQUksV0FBVyxDQUFDLElBQUk7d0JBQ2pDLElBQUksMEJBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ3RFLENBQUMsQ0FBQztxQkFDRCxNQUFNLENBQUMsaUJBQVMsQ0FBQyxDQUFDO2dCQUUzQixnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLO29CQUM1QixJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUMvQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDbEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSx3QkFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7cUJBQ3JDO29CQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMvQyxDQUFDLENBQUMsQ0FBQzthQUNKO1lBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUFwQ0QsSUFvQ0M7SUFwQ1ksOENBQWlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7Z2V0T3JpZ2luYWxTeW1ib2wsIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0ZpbGVQYXJzZXJ9IGZyb20gJy4vZmlsZV9wYXJzZXInO1xuaW1wb3J0IHtQYXJzZWRDbGFzc30gZnJvbSAnLi9wYXJzZWRfY2xhc3MnO1xuaW1wb3J0IHtQYXJzZWRGaWxlfSBmcm9tICcuL3BhcnNlZF9maWxlJztcblxuZXhwb3J0IGNsYXNzIEVzbTIwMTVGaWxlUGFyc2VyIGltcGxlbWVudHMgRmlsZVBhcnNlciB7XG4gIGNoZWNrZXIgPSB0aGlzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJvdGVjdGVkIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCkge31cblxuICBwYXJzZUZpbGUoZmlsZTogdHMuU291cmNlRmlsZSk6IFBhcnNlZEZpbGVbXSB7XG4gICAgY29uc3QgbW9kdWxlU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZmlsZSk7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBQYXJzZWRGaWxlPigpO1xuICAgIGlmIChtb2R1bGVTeW1ib2wpIHtcbiAgICAgIGNvbnN0IGV4cG9ydENsYXNzZXMgPSB0aGlzLmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZVN5bWJvbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChnZXRPcmlnaW5hbFN5bWJvbCh0aGlzLmNoZWNrZXIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGV4cG9ydFN5bWJvbCA9PiBleHBvcnRTeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5DbGFzcyk7XG5cbiAgICAgIGNvbnN0IGNsYXNzRGVjbGFyYXRpb25zID0gZXhwb3J0Q2xhc3Nlcy5tYXAoZXhwb3J0U3ltYm9sID0+IGV4cG9ydFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbik7XG5cbiAgICAgIGNvbnN0IGRlY29yYXRlZENsYXNzZXMgPVxuICAgICAgICAgIGNsYXNzRGVjbGFyYXRpb25zXG4gICAgICAgICAgICAgIC5tYXAoZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmhvc3QuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWNvcmF0b3JzICYmIGRlY2xhcmF0aW9uLm5hbWUgJiZcbiAgICAgICAgICAgICAgICAgICAgbmV3IFBhcnNlZENsYXNzKGRlY2xhcmF0aW9uLm5hbWUudGV4dCwgZGVjbGFyYXRpb24sIGRlY29yYXRvcnMpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG5cbiAgICAgIGRlY29yYXRlZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBjbGF6ei5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgIGlmICghbWFwLmhhcyhmaWxlKSkge1xuICAgICAgICAgIG1hcC5zZXQoZmlsZSwgbmV3IFBhcnNlZEZpbGUoZmlsZSkpO1xuICAgICAgICB9XG4gICAgICAgIG1hcC5nZXQoZmlsZSkgIS5kZWNvcmF0ZWRDbGFzc2VzLnB1c2goY2xhenopO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBBcnJheS5mcm9tKG1hcC52YWx1ZXMoKSk7XG4gIH1cbn1cbiJdfQ==