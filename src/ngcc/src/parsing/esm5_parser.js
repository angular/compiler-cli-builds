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
        define("angular/packages/compiler-cli/src/ngcc/src/parsing/esm5_parser", ["require", "exports", "typescript", "angular/packages/compiler-cli/src/ngcc/src/parsing/parsed_class", "angular/packages/compiler-cli/src/ngcc/src/parsing/parsed_file"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var parsed_class_1 = require("angular/packages/compiler-cli/src/ngcc/src/parsing/parsed_class");
    var parsed_file_1 = require("angular/packages/compiler-cli/src/ngcc/src/parsing/parsed_file");
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
            if (moduleSymbol) {
                var classDeclarations = this.checker.getExportsOfModule(moduleSymbol)
                    .map(function (exportSymbol) { return ts.SymbolFlags.Alias & exportSymbol.flags ? _this.checker.getAliasedSymbol(exportSymbol) : exportSymbol; })
                    .map(function (exportSymbol) { return exportSymbol.valueDeclaration; })
                    .filter(function (exportDeclaration) { return exportDeclaration && ts.isVariableDeclaration(exportDeclaration); });
                var decoratedClasses = classDeclarations
                    .map(function (declaration) {
                    var decorators = _this.host.getDecoratorsOfDeclaration(declaration);
                    if (decorators) {
                        return new parsed_class_1.ParsedClass(declaration.name.getText(), declaration, decorators);
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
        return Esm5FileParser;
    }());
    exports.Esm5FileParser = Esm5FileParser;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvZXNtNV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsZ0dBQTRDO0lBQzVDLDhGQUEyQztJQUczQzs7OztPQUlHO0lBQ0g7UUFJRSx3QkFDWSxPQUFtQixFQUNuQixJQUF3QjtZQUR4QixZQUFPLEdBQVAsT0FBTyxDQUFZO1lBQ25CLFNBQUksR0FBSixJQUFJLENBQW9CO1lBSnBDLFlBQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBSUQsQ0FBQztRQUV4QyxrQ0FBUyxHQUFULFVBQVUsSUFBbUI7WUFBN0IsaUJBNEJDO1lBM0JDLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUQsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUM7WUFDakQsSUFBSSxZQUFZLEVBQUU7Z0JBRWhCLElBQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7cUJBQ3BFLEdBQUcsQ0FBQyxVQUFBLFlBQVksSUFBSSxPQUFBLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBdEcsQ0FBc0csQ0FBQztxQkFDM0gsR0FBRyxDQUFDLFVBQUEsWUFBWSxJQUFJLE9BQUEsWUFBWSxDQUFDLGdCQUFnQixFQUE3QixDQUE2QixDQUFDO3FCQUNsRCxNQUFNLENBQUMsVUFBQSxpQkFBaUIsSUFBSyxPQUFBLGlCQUFpQixJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFoRSxDQUFnRSxDQUE2QixDQUFDO2dCQUU5SCxJQUFNLGdCQUFnQixHQUFHLGlCQUFpQjtxQkFDdkMsR0FBRyxDQUFDLFVBQUEsV0FBVztvQkFDZCxJQUFNLFVBQVUsR0FBRyxLQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNyRSxJQUFJLFVBQVUsRUFBRTt3QkFDZCxPQUFPLElBQUksMEJBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztxQkFDN0U7Z0JBQ0gsQ0FBQyxDQUFDO3FCQUNELE1BQU0sQ0FBQyxVQUFBLGNBQWMsSUFBSSxPQUFBLGNBQWMsRUFBZCxDQUFjLENBQWtCLENBQUM7Z0JBRTdELGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7b0JBQzVCLElBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQy9DLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUNsQixHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLHdCQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDckM7b0JBQ0QsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzlDLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFDRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQXJDRCxJQXFDQztJQXJDWSx3Q0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBOZ2NjUmVmbGVjdGlvbkhvc3QgfSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQgeyBQYXJzZWRDbGFzc30gZnJvbSAnLi9wYXJzZWRfY2xhc3MnO1xuaW1wb3J0IHsgUGFyc2VkRmlsZSB9IGZyb20gJy4vcGFyc2VkX2ZpbGUnO1xuaW1wb3J0IHsgRmlsZVBhcnNlciB9IGZyb20gJy4vZmlsZV9wYXJzZXInO1xuXG4vKipcbiAqIFBhcnNlcyBFU001IHBhY2thZ2UgZmlsZXMgZm9yIGRlY29yYXRycyBjbGFzc2VzLlxuICogRVNNNSBcImNsYXNzZXNcIiBhcmUgYWN0dWFsbHkgZnVuY3Rpb25zIHdyYXBwZWQgYnkgYW5kIHJldHVybmVkXG4gKiBmcm9tIGFuIElGRUUuXG4gKi9cbmV4cG9ydCBjbGFzcyBFc201RmlsZVBhcnNlciBpbXBsZW1lbnRzIEZpbGVQYXJzZXIge1xuXG4gIGNoZWNrZXIgPSB0aGlzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICBwcm90ZWN0ZWQgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIHBhcnNlRmlsZShmaWxlOiB0cy5Tb3VyY2VGaWxlKTogUGFyc2VkRmlsZVtdIHtcbiAgICBjb25zdCBtb2R1bGVTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihmaWxlKTtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFBhcnNlZEZpbGU+KCk7XG4gICAgaWYgKG1vZHVsZVN5bWJvbCkge1xuXG4gICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9ucyA9IHRoaXMuY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlU3ltYm9sKVxuICAgICAgICAubWFwKGV4cG9ydFN5bWJvbCA9PiB0cy5TeW1ib2xGbGFncy5BbGlhcyAmIGV4cG9ydFN5bWJvbC5mbGFncyA/IHRoaXMuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKGV4cG9ydFN5bWJvbCkgOiBleHBvcnRTeW1ib2wpXG4gICAgICAgIC5tYXAoZXhwb3J0U3ltYm9sID0+IGV4cG9ydFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKVxuICAgICAgICAuZmlsdGVyKGV4cG9ydERlY2xhcmF0aW9uID0+ICBleHBvcnREZWNsYXJhdGlvbiAmJiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24oZXhwb3J0RGVjbGFyYXRpb24pKSBhcyB0cy5WYXJpYWJsZURlY2xhcmF0aW9uW107XG5cbiAgICAgIGNvbnN0IGRlY29yYXRlZENsYXNzZXMgPSBjbGFzc0RlY2xhcmF0aW9uc1xuICAgICAgICAubWFwKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5ob3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICAgICAgICBpZiAoZGVjb3JhdG9ycykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQYXJzZWRDbGFzcyhkZWNsYXJhdGlvbi5uYW1lLmdldFRleHQoKSwgZGVjbGFyYXRpb24sIGRlY29yYXRvcnMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmZpbHRlcihkZWNvcmF0ZWRDbGFzcyA9PiBkZWNvcmF0ZWRDbGFzcykgYXMgUGFyc2VkQ2xhc3NbXTtcblxuICAgICAgZGVjb3JhdGVkQ2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgICAgY29uc3QgZmlsZSA9IGNsYXp6LmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgICAgaWYgKCFtYXAuaGFzKGZpbGUpKSB7XG4gICAgICAgICAgbWFwLnNldChmaWxlLCBuZXcgUGFyc2VkRmlsZShmaWxlKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFwLmdldChmaWxlKSEuZGVjb3JhdGVkQ2xhc3Nlcy5wdXNoKGNsYXp6KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gQXJyYXkuZnJvbShtYXAudmFsdWVzKCkpO1xuICB9XG59XG4iXX0=