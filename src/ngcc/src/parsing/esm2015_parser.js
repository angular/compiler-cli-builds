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
                    .map(function (exportSymbol) { return ts.SymbolFlags.Alias & exportSymbol.flags ?
                    _this.checker.getAliasedSymbol(exportSymbol) :
                    exportSymbol; })
                    .filter(function (exportSymbol) { return exportSymbol.flags & ts.SymbolFlags.Class; });
                var classDeclarations = exportClasses.map(function (exportSymbol) { return exportSymbol.valueDeclaration; });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtMjAxNV9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvZXNtMjAxNV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFLakMsd0ZBQTJDO0lBQzNDLHNGQUF5QztJQUV6QztRQUdFLDJCQUFzQixPQUFtQixFQUFZLElBQXdCO1lBQXZELFlBQU8sR0FBUCxPQUFPLENBQVk7WUFBWSxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUY3RSxZQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUV3QyxDQUFDO1FBRWpGLHFDQUFTLEdBQVQsVUFBVSxJQUFtQjtZQUE3QixpQkFrQ0M7WUFqQ0MsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1RCxJQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztZQUNqRCxJQUFJLFlBQVksRUFBRTtnQkFDaEIsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7cUJBQ3hDLEdBQUcsQ0FDQSxVQUFBLFlBQVksSUFBSSxPQUFBLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDdkQsS0FBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO29CQUM3QyxZQUFZLEVBRkEsQ0FFQSxDQUFDO3FCQUNwQixNQUFNLENBQUMsVUFBQSxZQUFZLElBQUksT0FBQSxZQUFZLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUF6QyxDQUF5QyxDQUFDLENBQUM7Z0JBRTdGLElBQU0saUJBQWlCLEdBQ25CLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBQSxZQUFZLElBQUksT0FBQSxZQUFZLENBQUMsZ0JBQXVDLEVBQXBELENBQW9ELENBQUMsQ0FBQztnQkFHNUYsSUFBTSxnQkFBZ0IsR0FDbEIsaUJBQWlCO3FCQUNaLEdBQUcsQ0FBQyxVQUFBLFdBQVc7b0JBQ2QsSUFBTSxVQUFVLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDckUsSUFBSSxVQUFVLEVBQUU7d0JBQ2QsT0FBTyxJQUFJLDBCQUFXLENBQUMsV0FBVyxDQUFDLElBQU0sQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO3FCQUMxRTtnQkFDSCxDQUFDLENBQUM7cUJBQ0QsTUFBTSxDQUFDLFVBQUEsY0FBYyxJQUFJLE9BQUEsY0FBYyxFQUFkLENBQWMsQ0FBa0IsQ0FBQztnQkFFbkUsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSztvQkFDNUIsSUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDL0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ2xCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksd0JBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3FCQUNyQztvQkFDRCxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDL0MsQ0FBQyxDQUFDLENBQUM7YUFDSjtZQUNELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBeENELElBd0NDO0lBeENZLDhDQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5cbmltcG9ydCB7RmlsZVBhcnNlcn0gZnJvbSAnLi9maWxlX3BhcnNlcic7XG5pbXBvcnQge1BhcnNlZENsYXNzfSBmcm9tICcuL3BhcnNlZF9jbGFzcyc7XG5pbXBvcnQge1BhcnNlZEZpbGV9IGZyb20gJy4vcGFyc2VkX2ZpbGUnO1xuXG5leHBvcnQgY2xhc3MgRXNtMjAxNUZpbGVQYXJzZXIgaW1wbGVtZW50cyBGaWxlUGFyc2VyIHtcbiAgY2hlY2tlciA9IHRoaXMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcm90ZWN0ZWQgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIHBhcnNlRmlsZShmaWxlOiB0cy5Tb3VyY2VGaWxlKTogUGFyc2VkRmlsZVtdIHtcbiAgICBjb25zdCBtb2R1bGVTeW1ib2wgPSB0aGlzLmNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihmaWxlKTtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIFBhcnNlZEZpbGU+KCk7XG4gICAgaWYgKG1vZHVsZVN5bWJvbCkge1xuICAgICAgY29uc3QgZXhwb3J0Q2xhc3NlcyA9IHRoaXMuY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlU3ltYm9sKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0U3ltYm9sID0+IHRzLlN5bWJvbEZsYWdzLkFsaWFzICYgZXhwb3J0U3ltYm9sLmZsYWdzID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoZWNrZXIuZ2V0QWxpYXNlZFN5bWJvbChleHBvcnRTeW1ib2wpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRTeW1ib2wpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZXhwb3J0U3ltYm9sID0+IGV4cG9ydFN5bWJvbC5mbGFncyAmIHRzLlN5bWJvbEZsYWdzLkNsYXNzKTtcblxuICAgICAgY29uc3QgY2xhc3NEZWNsYXJhdGlvbnMgPVxuICAgICAgICAgIGV4cG9ydENsYXNzZXMubWFwKGV4cG9ydFN5bWJvbCA9PiBleHBvcnRTeW1ib2wudmFsdWVEZWNsYXJhdGlvbiBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uKTtcblxuXG4gICAgICBjb25zdCBkZWNvcmF0ZWRDbGFzc2VzID1cbiAgICAgICAgICBjbGFzc0RlY2xhcmF0aW9uc1xuICAgICAgICAgICAgICAubWFwKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWNvcmF0b3JzID0gdGhpcy5ob3N0LmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoZGVjb3JhdG9ycykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQYXJzZWRDbGFzcyhkZWNsYXJhdGlvbi5uYW1lICEudGV4dCwgZGVjbGFyYXRpb24sIGRlY29yYXRvcnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmZpbHRlcihkZWNvcmF0ZWRDbGFzcyA9PiBkZWNvcmF0ZWRDbGFzcykgYXMgUGFyc2VkQ2xhc3NbXTtcblxuICAgICAgZGVjb3JhdGVkQ2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgICAgY29uc3QgZmlsZSA9IGNsYXp6LmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgICAgaWYgKCFtYXAuaGFzKGZpbGUpKSB7XG4gICAgICAgICAgbWFwLnNldChmaWxlLCBuZXcgUGFyc2VkRmlsZShmaWxlKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFwLmdldChmaWxlKSAhLmRlY29yYXRlZENsYXNzZXMucHVzaChjbGF6eik7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIEFycmF5LmZyb20obWFwLnZhbHVlcygpKTtcbiAgfVxufVxuIl19