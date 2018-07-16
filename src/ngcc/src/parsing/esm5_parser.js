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
        define("@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngcc/src/parsing/parsed_class", "@angular/compiler-cli/src/ngcc/src/parsing/parsed_file"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
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
            var getOriginalSymbol = function (symbol) {
                return ts.SymbolFlags.Alias & symbol.flags ? _this.checker.getAliasedSymbol(symbol) : symbol;
            };
            var getParsedClass = function (declaration) {
                var decorators = _this.host.getDecoratorsOfDeclaration(declaration);
                if (decorators) {
                    return new parsed_class_1.ParsedClass(declaration.name.getText(), declaration, decorators);
                }
            };
            if (moduleSymbol) {
                var classDeclarations = this.checker.getExportsOfModule(moduleSymbol)
                    .map(getOriginalSymbol)
                    .map(function (exportSymbol) { return exportSymbol.valueDeclaration; })
                    .filter(isVariableDeclaration);
                var decoratedClasses = classDeclarations.map(getParsedClass).filter(isDefined);
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
    function isVariableDeclaration(declaration) {
        return !!declaration && ts.isVariableDeclaration(declaration);
    }
    function isDefined(value) {
        return !!value;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvZXNtNV9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFLakMsd0ZBQTJDO0lBQzNDLHNGQUF5QztJQUd6Qzs7OztPQUlHO0lBQ0g7UUFHRSx3QkFBc0IsT0FBbUIsRUFBWSxJQUF3QjtZQUF2RCxZQUFPLEdBQVAsT0FBTyxDQUFZO1lBQVksU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFGN0UsWUFBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFd0MsQ0FBQztRQUVqRixrQ0FBUyxHQUFULFVBQVUsSUFBbUI7WUFBN0IsaUJBNkJDO1lBNUJDLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUQsSUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUM7WUFDakQsSUFBTSxpQkFBaUIsR0FBRyxVQUFDLE1BQWlCO2dCQUN4QyxPQUFBLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07WUFBcEYsQ0FBb0YsQ0FBQztZQUN6RixJQUFNLGNBQWMsR0FBRyxVQUFDLFdBQW1DO2dCQUN6RCxJQUFNLFVBQVUsR0FBRyxLQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUNyRSxJQUFJLFVBQVUsRUFBRTtvQkFDZCxPQUFPLElBQUksMEJBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztpQkFDN0U7WUFDSCxDQUFDLENBQUM7WUFFRixJQUFJLFlBQVksRUFBRTtnQkFDaEIsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQztxQkFDeEMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO3FCQUN0QixHQUFHLENBQUMsVUFBQSxZQUFZLElBQUksT0FBQSxZQUFZLENBQUMsZ0JBQWdCLEVBQTdCLENBQTZCLENBQUM7cUJBQ2xELE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUU3RCxJQUFNLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBRWpGLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7b0JBQzVCLElBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQy9DLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUNsQixHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLHdCQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDckM7b0JBQ0QsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQy9DLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFDRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQW5DRCxJQW1DQztJQW5DWSx3Q0FBYztJQXFDM0IsK0JBQStCLFdBQXVDO1FBRXBFLE9BQU8sQ0FBQyxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELG1CQUFzQixLQUFvQjtRQUN4QyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDakIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5cbmltcG9ydCB7RmlsZVBhcnNlcn0gZnJvbSAnLi9maWxlX3BhcnNlcic7XG5pbXBvcnQge1BhcnNlZENsYXNzfSBmcm9tICcuL3BhcnNlZF9jbGFzcyc7XG5pbXBvcnQge1BhcnNlZEZpbGV9IGZyb20gJy4vcGFyc2VkX2ZpbGUnO1xuXG5cbi8qKlxuICogUGFyc2VzIEVTTTUgcGFja2FnZSBmaWxlcyBmb3IgZGVjb3JhdHJzIGNsYXNzZXMuXG4gKiBFU001IFwiY2xhc3Nlc1wiIGFyZSBhY3R1YWxseSBmdW5jdGlvbnMgd3JhcHBlZCBieSBhbmQgcmV0dXJuZWRcbiAqIGZyb20gYW4gSUZFRS5cbiAqL1xuZXhwb3J0IGNsYXNzIEVzbTVGaWxlUGFyc2VyIGltcGxlbWVudHMgRmlsZVBhcnNlciB7XG4gIGNoZWNrZXIgPSB0aGlzLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJvdGVjdGVkIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCkge31cblxuICBwYXJzZUZpbGUoZmlsZTogdHMuU291cmNlRmlsZSk6IFBhcnNlZEZpbGVbXSB7XG4gICAgY29uc3QgbW9kdWxlU3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZmlsZSk7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBQYXJzZWRGaWxlPigpO1xuICAgIGNvbnN0IGdldE9yaWdpbmFsU3ltYm9sID0gKHN5bWJvbDogdHMuU3ltYm9sKSA9PlxuICAgICAgICB0cy5TeW1ib2xGbGFncy5BbGlhcyAmIHN5bWJvbC5mbGFncyA/IHRoaXMuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCkgOiBzeW1ib2w7XG4gICAgY29uc3QgZ2V0UGFyc2VkQ2xhc3MgPSAoZGVjbGFyYXRpb246IHRzLlZhcmlhYmxlRGVjbGFyYXRpb24pID0+IHtcbiAgICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLmhvc3QuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24oZGVjbGFyYXRpb24pO1xuICAgICAgaWYgKGRlY29yYXRvcnMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJzZWRDbGFzcyhkZWNsYXJhdGlvbi5uYW1lLmdldFRleHQoKSwgZGVjbGFyYXRpb24sIGRlY29yYXRvcnMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAobW9kdWxlU3ltYm9sKSB7XG4gICAgICBjb25zdCBjbGFzc0RlY2xhcmF0aW9ucyA9IHRoaXMuY2hlY2tlci5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlU3ltYm9sKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChnZXRPcmlnaW5hbFN5bWJvbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZXhwb3J0U3ltYm9sID0+IGV4cG9ydFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc1ZhcmlhYmxlRGVjbGFyYXRpb24pO1xuXG4gICAgICBjb25zdCBkZWNvcmF0ZWRDbGFzc2VzID0gY2xhc3NEZWNsYXJhdGlvbnMubWFwKGdldFBhcnNlZENsYXNzKS5maWx0ZXIoaXNEZWZpbmVkKTtcblxuICAgICAgZGVjb3JhdGVkQ2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgICAgY29uc3QgZmlsZSA9IGNsYXp6LmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgICAgaWYgKCFtYXAuaGFzKGZpbGUpKSB7XG4gICAgICAgICAgbWFwLnNldChmaWxlLCBuZXcgUGFyc2VkRmlsZShmaWxlKSk7XG4gICAgICAgIH1cbiAgICAgICAgbWFwLmdldChmaWxlKSAhLmRlY29yYXRlZENsYXNzZXMucHVzaChjbGF6eik7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIEFycmF5LmZyb20obWFwLnZhbHVlcygpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1ZhcmlhYmxlRGVjbGFyYXRpb24oZGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uIHwgdW5kZWZpbmVkKTpcbiAgICBkZWNsYXJhdGlvbiBpcyB0cy5WYXJpYWJsZURlY2xhcmF0aW9uIHtcbiAgcmV0dXJuICEhZGVjbGFyYXRpb24gJiYgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKGRlY2xhcmF0aW9uKTtcbn1cblxuZnVuY3Rpb24gaXNEZWZpbmVkPFQ+KHZhbHVlOiBUIHwgdW5kZWZpbmVkKTogdmFsdWUgaXMgVCB7XG4gIHJldHVybiAhIXZhbHVlO1xufVxuIl19