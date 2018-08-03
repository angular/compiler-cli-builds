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
        define("@angular/compiler-cli/src/ngtsc/factories/src/generator", ["require", "exports", "tslib", "path", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path = require("path");
    var ts = require("typescript");
    var TS_DTS_SUFFIX = /(\.d)?\.ts$/;
    /**
     * Generates ts.SourceFiles which contain variable declarations for NgFactories for every exported
     * class of an input ts.SourceFile.
     */
    var FactoryGenerator = /** @class */ (function () {
        function FactoryGenerator() {
        }
        FactoryGenerator.prototype.factoryFor = function (original, genFilePath) {
            var relativePathToSource = './' + path.posix.basename(original.fileName).replace(TS_DTS_SUFFIX, '');
            // Collect a list of classes that need to have factory types emitted for them.
            var symbolNames = original
                .statements
                // Pick out top level class declarations...
                .filter(ts.isClassDeclaration)
                // which are named, exported, and have decorators.
                .filter(function (decl) { return isExported(decl) && decl.decorators !== undefined &&
                decl.name !== undefined; })
                // Grab the symbol name.
                .map(function (decl) { return decl.name.text; });
            // For each symbol name, generate a constant export of the corresponding NgFactory.
            // This will encompass a lot of symbols which don't need factories, but that's okay
            // because it won't miss any that do.
            var varLines = symbolNames.map(function (name) { return "export const " + name + "NgFactory = new i0.\u0275NgModuleFactory(" + name + ");"; });
            var sourceText = tslib_1.__spread([
                // This might be incorrect if the current package being compiled is Angular core, but it's
                // okay to leave in at type checking time. TypeScript can handle this reference via its path
                // mapping, but downstream bundlers can't. If the current package is core itself, this will be
                // replaced in the factory transformer before emit.
                "import * as i0 from '@angular/core';",
                "import {" + symbolNames.join(', ') + "} from '" + relativePathToSource + "';"
            ], varLines).join('\n');
            return ts.createSourceFile(genFilePath, sourceText, original.languageVersion, true, ts.ScriptKind.TS);
        };
        FactoryGenerator.prototype.computeFactoryFileMap = function (files) {
            var map = new Map();
            files.filter(function (sourceFile) { return !sourceFile.endsWith('.d.ts'); })
                .forEach(function (sourceFile) { return map.set(sourceFile.replace(/\.ts$/, '.ngfactory.ts'), sourceFile); });
            return map;
        };
        return FactoryGenerator;
    }());
    exports.FactoryGenerator = FactoryGenerator;
    function isExported(decl) {
        return decl.modifiers !== undefined &&
            decl.modifiers.some(function (mod) { return mod.kind == ts.SyntaxKind.ExportKeyword; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9mYWN0b3JpZXMvc3JjL2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLElBQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQztJQUVwQzs7O09BR0c7SUFDSDtRQUFBO1FBd0NBLENBQUM7UUF2Q0MscUNBQVUsR0FBVixVQUFXLFFBQXVCLEVBQUUsV0FBbUI7WUFDckQsSUFBTSxvQkFBb0IsR0FDdEIsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdFLDhFQUE4RTtZQUM5RSxJQUFNLFdBQVcsR0FBRyxRQUFRO2lCQUNILFVBQVU7Z0JBQ1gsMkNBQTJDO2lCQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDO2dCQUM5QixrREFBa0Q7aUJBQ2pELE1BQU0sQ0FDSCxVQUFBLElBQUksSUFBSSxPQUFBLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFNBQVM7Z0JBQ3JELElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQURuQixDQUNtQixDQUFDO2dCQUNoQyx3QkFBd0I7aUJBQ3ZCLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksQ0FBQyxJQUFNLENBQUMsSUFBSSxFQUFoQixDQUFnQixDQUFDLENBQUM7WUFFdkQsbUZBQW1GO1lBQ25GLG1GQUFtRjtZQUNuRixxQ0FBcUM7WUFDckMsSUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsVUFBQSxJQUFJLElBQUksT0FBQSxrQkFBZ0IsSUFBSSxpREFBdUMsSUFBSSxPQUFJLEVBQW5FLENBQW1FLENBQUMsQ0FBQztZQUNqRixJQUFNLFVBQVUsR0FBRztnQkFDakIsMEZBQTBGO2dCQUMxRiw0RkFBNEY7Z0JBQzVGLDhGQUE4RjtnQkFDOUYsbURBQW1EO2dCQUNuRCxzQ0FBc0M7Z0JBQ3RDLGFBQVcsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQVcsb0JBQW9CLE9BQUk7ZUFDakUsUUFBUSxFQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNiLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUN0QixXQUFXLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDakYsQ0FBQztRQUVELGdEQUFxQixHQUFyQixVQUFzQixLQUE0QjtZQUNoRCxJQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUN0QyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQUEsVUFBVSxJQUFJLE9BQUEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUE3QixDQUE2QixDQUFDO2lCQUNwRCxPQUFPLENBQUMsVUFBQSxVQUFVLElBQUksT0FBQSxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxFQUFqRSxDQUFpRSxDQUFDLENBQUM7WUFDOUYsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBeENELElBd0NDO0lBeENZLDRDQUFnQjtJQTBDN0Isb0JBQW9CLElBQW9CO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBdkMsQ0FBdUMsQ0FBQyxDQUFDO0lBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuY29uc3QgVFNfRFRTX1NVRkZJWCA9IC8oXFwuZCk/XFwudHMkLztcblxuLyoqXG4gKiBHZW5lcmF0ZXMgdHMuU291cmNlRmlsZXMgd2hpY2ggY29udGFpbiB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgZm9yIE5nRmFjdG9yaWVzIGZvciBldmVyeSBleHBvcnRlZFxuICogY2xhc3Mgb2YgYW4gaW5wdXQgdHMuU291cmNlRmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEZhY3RvcnlHZW5lcmF0b3Ige1xuICBmYWN0b3J5Rm9yKG9yaWdpbmFsOiB0cy5Tb3VyY2VGaWxlLCBnZW5GaWxlUGF0aDogc3RyaW5nKTogdHMuU291cmNlRmlsZSB7XG4gICAgY29uc3QgcmVsYXRpdmVQYXRoVG9Tb3VyY2UgPVxuICAgICAgICAnLi8nICsgcGF0aC5wb3NpeC5iYXNlbmFtZShvcmlnaW5hbC5maWxlTmFtZSkucmVwbGFjZShUU19EVFNfU1VGRklYLCAnJyk7XG4gICAgLy8gQ29sbGVjdCBhIGxpc3Qgb2YgY2xhc3NlcyB0aGF0IG5lZWQgdG8gaGF2ZSBmYWN0b3J5IHR5cGVzIGVtaXR0ZWQgZm9yIHRoZW0uXG4gICAgY29uc3Qgc3ltYm9sTmFtZXMgPSBvcmlnaW5hbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZW1lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUGljayBvdXQgdG9wIGxldmVsIGNsYXNzIGRlY2xhcmF0aW9ucy4uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIodHMuaXNDbGFzc0RlY2xhcmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdoaWNoIGFyZSBuYW1lZCwgZXhwb3J0ZWQsIGFuZCBoYXZlIGRlY29yYXRvcnMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVjbCA9PiBpc0V4cG9ydGVkKGRlY2wpICYmIGRlY2wuZGVjb3JhdG9ycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNsLm5hbWUgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHcmFiIHRoZSBzeW1ib2wgbmFtZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGRlY2wgPT4gZGVjbC5uYW1lICEudGV4dCk7XG5cbiAgICAvLyBGb3IgZWFjaCBzeW1ib2wgbmFtZSwgZ2VuZXJhdGUgYSBjb25zdGFudCBleHBvcnQgb2YgdGhlIGNvcnJlc3BvbmRpbmcgTmdGYWN0b3J5LlxuICAgIC8vIFRoaXMgd2lsbCBlbmNvbXBhc3MgYSBsb3Qgb2Ygc3ltYm9scyB3aGljaCBkb24ndCBuZWVkIGZhY3RvcmllcywgYnV0IHRoYXQncyBva2F5XG4gICAgLy8gYmVjYXVzZSBpdCB3b24ndCBtaXNzIGFueSB0aGF0IGRvLlxuICAgIGNvbnN0IHZhckxpbmVzID0gc3ltYm9sTmFtZXMubWFwKFxuICAgICAgICBuYW1lID0+IGBleHBvcnQgY29uc3QgJHtuYW1lfU5nRmFjdG9yeSA9IG5ldyBpMC7JtU5nTW9kdWxlRmFjdG9yeSgke25hbWV9KTtgKTtcbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gW1xuICAgICAgLy8gVGhpcyBtaWdodCBiZSBpbmNvcnJlY3QgaWYgdGhlIGN1cnJlbnQgcGFja2FnZSBiZWluZyBjb21waWxlZCBpcyBBbmd1bGFyIGNvcmUsIGJ1dCBpdCdzXG4gICAgICAvLyBva2F5IHRvIGxlYXZlIGluIGF0IHR5cGUgY2hlY2tpbmcgdGltZS4gVHlwZVNjcmlwdCBjYW4gaGFuZGxlIHRoaXMgcmVmZXJlbmNlIHZpYSBpdHMgcGF0aFxuICAgICAgLy8gbWFwcGluZywgYnV0IGRvd25zdHJlYW0gYnVuZGxlcnMgY2FuJ3QuIElmIHRoZSBjdXJyZW50IHBhY2thZ2UgaXMgY29yZSBpdHNlbGYsIHRoaXMgd2lsbCBiZVxuICAgICAgLy8gcmVwbGFjZWQgaW4gdGhlIGZhY3RvcnkgdHJhbnNmb3JtZXIgYmVmb3JlIGVtaXQuXG4gICAgICBgaW1wb3J0ICogYXMgaTAgZnJvbSAnQGFuZ3VsYXIvY29yZSc7YCxcbiAgICAgIGBpbXBvcnQgeyR7c3ltYm9sTmFtZXMuam9pbignLCAnKX19IGZyb20gJyR7cmVsYXRpdmVQYXRoVG9Tb3VyY2V9JztgLFxuICAgICAgLi4udmFyTGluZXMsXG4gICAgXS5qb2luKCdcXG4nKTtcbiAgICByZXR1cm4gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZ2VuRmlsZVBhdGgsIHNvdXJjZVRleHQsIG9yaWdpbmFsLmxhbmd1YWdlVmVyc2lvbiwgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UUyk7XG4gIH1cblxuICBjb21wdXRlRmFjdG9yeUZpbGVNYXAoZmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPik6IE1hcDxzdHJpbmcsIHN0cmluZz4ge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZmlsZXMuZmlsdGVyKHNvdXJjZUZpbGUgPT4gIXNvdXJjZUZpbGUuZW5kc1dpdGgoJy5kLnRzJykpXG4gICAgICAgIC5mb3JFYWNoKHNvdXJjZUZpbGUgPT4gbWFwLnNldChzb3VyY2VGaWxlLnJlcGxhY2UoL1xcLnRzJC8sICcubmdmYWN0b3J5LnRzJyksIHNvdXJjZUZpbGUpKTtcbiAgICByZXR1cm4gbWFwO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRXhwb3J0ZWQoZGVjbDogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY2wubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIGRlY2wubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG59XG4iXX0=