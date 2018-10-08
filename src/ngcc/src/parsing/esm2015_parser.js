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
                var exportedSymbols = this.checker.getExportsOfModule(moduleSymbol).map(utils_1.getOriginalSymbol(this.checker));
                var exportedDeclarations = exportedSymbols.map(function (exportSymbol) { return exportSymbol.valueDeclaration; }).filter(utils_1.isDefined);
                var decoratedClasses = exportedDeclarations
                    .map(function (declaration) {
                    if (ts.isClassDeclaration(declaration) || ts.isVariableDeclaration(declaration)) {
                        var name_1 = declaration.name && ts.isIdentifier(declaration.name) ?
                            declaration.name.text :
                            undefined;
                        var decorators = _this.host.getDecoratorsOfDeclaration(declaration);
                        return decorators && utils_1.isDefined(name_1) ?
                            new parsed_class_1.ParsedClass(name_1, declaration, decorators) :
                            undefined;
                    }
                    return undefined;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvZXNtMjAxNV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakMsa0VBQXNEO0lBR3RELHdGQUEyQztJQUMzQyxzRkFBeUM7SUFFekM7UUFHRSwyQkFBc0IsT0FBbUIsRUFBWSxJQUF3QjtZQUF2RCxZQUFPLEdBQVAsT0FBTyxDQUFZO1lBQVksU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFGN0UsWUFBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFd0MsQ0FBQztRQUVqRixxQ0FBUyxHQUFULFVBQVUsSUFBbUI7WUFBN0IsaUJBa0NDO1lBakNDLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUQsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUM7WUFDakQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLElBQU0sZUFBZSxHQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyx5QkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDdkYsSUFBTSxvQkFBb0IsR0FDdEIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxVQUFBLFlBQVksSUFBSSxPQUFBLFlBQVksQ0FBQyxnQkFBZ0IsRUFBN0IsQ0FBNkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBUyxDQUFDLENBQUM7Z0JBRXpGLElBQU0sZ0JBQWdCLEdBQ2xCLG9CQUFvQjtxQkFDZixHQUFHLENBQUMsVUFBQSxXQUFXO29CQUNkLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsRUFBRTt3QkFDL0UsSUFBTSxNQUFJLEdBQUcsV0FBVyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUNoRSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUN2QixTQUFTLENBQUM7d0JBQ2QsSUFBTSxVQUFVLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFDckUsT0FBTyxVQUFVLElBQUksaUJBQVMsQ0FBQyxNQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLDBCQUFXLENBQUMsTUFBSSxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDOzRCQUNoRCxTQUFTLENBQUM7cUJBQ2Y7b0JBQ0QsT0FBTyxTQUFTLENBQUM7Z0JBQ25CLENBQUMsQ0FBQztxQkFDRCxNQUFNLENBQUMsaUJBQVMsQ0FBQyxDQUFDO2dCQUUzQixnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLO29CQUM1QixJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUMvQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDbEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSx3QkFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7cUJBQ3JDO29CQUNELEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMvQyxDQUFDLENBQUMsQ0FBQzthQUNKO1lBQ0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUF4Q0QsSUF3Q0M7SUF4Q1ksOENBQWlCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7Z2V0T3JpZ2luYWxTeW1ib2wsIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge0ZpbGVQYXJzZXJ9IGZyb20gJy4vZmlsZV9wYXJzZXInO1xuaW1wb3J0IHtQYXJzZWRDbGFzc30gZnJvbSAnLi9wYXJzZWRfY2xhc3MnO1xuaW1wb3J0IHtQYXJzZWRGaWxlfSBmcm9tICcuL3BhcnNlZF9maWxlJztcblxuZXhwb3J0IGNsYXNzIEVzbTIwMTVGaWxlUGFyc2VyIGltcGxlbWVudHMgRmlsZVBhcnNlciB7XG4gIGNoZWNrZXIgPSB0aGlzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJvdGVjdGVkIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCkge31cblxuICBwYXJzZUZpbGUoZmlsZTogdHMuU291cmNlRmlsZSk6IFBhcnNlZEZpbGVbXSB7XG4gICAgY29uc3QgbW9kdWxlU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZmlsZSk7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBQYXJzZWRGaWxlPigpO1xuICAgIGlmIChtb2R1bGVTeW1ib2wpIHtcbiAgICAgIGNvbnN0IGV4cG9ydGVkU3ltYm9scyA9XG4gICAgICAgICAgdGhpcy5jaGVja2VyLmdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGVTeW1ib2wpLm1hcChnZXRPcmlnaW5hbFN5bWJvbCh0aGlzLmNoZWNrZXIpKTtcbiAgICAgIGNvbnN0IGV4cG9ydGVkRGVjbGFyYXRpb25zID1cbiAgICAgICAgICBleHBvcnRlZFN5bWJvbHMubWFwKGV4cG9ydFN5bWJvbCA9PiBleHBvcnRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbikuZmlsdGVyKGlzRGVmaW5lZCk7XG5cbiAgICAgIGNvbnN0IGRlY29yYXRlZENsYXNzZXMgPVxuICAgICAgICAgIGV4cG9ydGVkRGVjbGFyYXRpb25zXG4gICAgICAgICAgICAgIC5tYXAoZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pIHx8IHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihkZWNsYXJhdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBkZWNsYXJhdGlvbi5uYW1lICYmIHRzLmlzSWRlbnRpZmllcihkZWNsYXJhdGlvbi5uYW1lKSA/XG4gICAgICAgICAgICAgICAgICAgICAgZGVjbGFyYXRpb24ubmFtZS50ZXh0IDpcbiAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5ob3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBkZWNvcmF0b3JzICYmIGlzRGVmaW5lZChuYW1lKSA/XG4gICAgICAgICAgICAgICAgICAgICAgbmV3IFBhcnNlZENsYXNzKG5hbWUsIGRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG5cbiAgICAgIGRlY29yYXRlZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBjbGF6ei5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgIGlmICghbWFwLmhhcyhmaWxlKSkge1xuICAgICAgICAgIG1hcC5zZXQoZmlsZSwgbmV3IFBhcnNlZEZpbGUoZmlsZSkpO1xuICAgICAgICB9XG4gICAgICAgIG1hcC5nZXQoZmlsZSkgIS5kZWNvcmF0ZWRDbGFzc2VzLnB1c2goY2xhenopO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBBcnJheS5mcm9tKG1hcC52YWx1ZXMoKSk7XG4gIH1cbn1cbiJdfQ==