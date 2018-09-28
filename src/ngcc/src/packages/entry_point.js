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
        define("@angular/compiler-cli/src/ngcc/src/packages/entry_point", ["require", "exports", "canonical-path", "fs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path = require("canonical-path");
    var fs = require("fs");
    /**
     * Try to get entry point info from the given path.
     * @param pkgPath the absolute path to the containing npm package
     * @param entryPoint the absolute path to the potential entry point.
     * @returns Info about the entry point if it is valid, `null` otherwise.
     */
    function getEntryPointInfo(pkgPath, entryPoint) {
        var packageJsonPath = path.resolve(entryPoint, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return null;
        }
        // According to https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html,
        // `types` and `typings` are interchangeable.
        var _a = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')), fesm2015 = _a.fesm2015, fesm5 = _a.fesm5, esm2015 = _a.esm2015, esm5 = _a.esm5, main = _a.main, types = _a.types, _b = _a.typings, typings = _b === void 0 ? types : _b;
        // Minimum requirement is that we have esm2015 format and typings.
        if (!typings || !esm2015) {
            return null;
        }
        // Also we need to have a metadata.json file
        var metadataPath = path.resolve(entryPoint, typings.replace(/\.d\.ts$/, '') + '.metadata.json');
        if (!fs.existsSync(metadataPath)) {
            return null;
        }
        var entryPointInfo = {
            package: pkgPath,
            path: entryPoint,
            typings: path.resolve(entryPoint, typings),
            esm2015: path.resolve(entryPoint, esm2015),
        };
        if (fesm2015) {
            entryPointInfo.fesm2015 = path.resolve(entryPoint, fesm2015);
        }
        if (fesm5) {
            entryPointInfo.fesm5 = path.resolve(entryPoint, fesm5);
        }
        if (esm5) {
            entryPointInfo.esm5 = path.resolve(entryPoint, esm5);
        }
        if (main) {
            entryPointInfo.umd = path.resolve(entryPoint, main);
        }
        return entryPointInfo;
    }
    exports.getEntryPointInfo = getEntryPointInfo;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgscUNBQXVDO0lBQ3ZDLHVCQUF5QjtJQXNDekI7Ozs7O09BS0c7SUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxPQUFlLEVBQUUsVUFBa0I7UUFDbkUsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDbkMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELCtGQUErRjtRQUMvRiw2Q0FBNkM7UUFDdkMsSUFBQSx5REFDa0QsRUFEakQsc0JBQVEsRUFBRSxnQkFBSyxFQUFFLG9CQUFPLEVBQUUsY0FBSSxFQUFFLGNBQUksRUFBRSxnQkFBSyxFQUFFLGVBQWUsRUFBZixvQ0FDSSxDQUFDO1FBRXpELGtFQUFrRTtRQUNsRSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3hCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCw0Q0FBNEM7UUFDNUMsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztRQUNsRyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUNoQyxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsSUFBTSxjQUFjLEdBQWU7WUFDakMsT0FBTyxFQUFFLE9BQU87WUFDaEIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQztZQUMxQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDO1NBQzNDLENBQUM7UUFFRixJQUFJLFFBQVEsRUFBRTtZQUNaLGNBQWMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDOUQ7UUFDRCxJQUFJLEtBQUssRUFBRTtZQUNULGNBQWMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDeEQ7UUFDRCxJQUFJLElBQUksRUFBRTtZQUNSLGNBQWMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDdEQ7UUFDRCxJQUFJLElBQUksRUFBRTtZQUNSLGNBQWMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDckQ7UUFFRCxPQUFPLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBM0NELDhDQTJDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cblxuLyoqXG4gKiBUaGUgcG9zc2libGUgdmFsdWVzIGZvciB0aGUgZm9ybWF0IG9mIGFuIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgdHlwZSBFbnRyeVBvaW50Rm9ybWF0ID0gJ2VzbTUnIHwgJ2Zlc201JyB8ICdlc20yMDE1JyB8ICdmZXNtMjAxNScgfCAndW1kJztcblxuLyoqXG4gKiBBbiBvYmplY3QgY29udGFpbmluZyBwYXRocyB0byB0aGUgZW50cnktcG9pbnRzIGZvciBlYWNoIGZvcm1hdC5cbiAqL1xuZXhwb3J0IHR5cGUgRW50cnlQb2ludFBhdGhzID0ge1xuICBbRm9ybWF0IGluIEVudHJ5UG9pbnRGb3JtYXRdPzogc3RyaW5nO1xufTtcblxuLyoqXG4gKiBBbiBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCBhbiBlbnRyeS1wb2ludCwgaW5jbHVkaW5nIHBhdGhzXG4gKiB0byBlYWNoIG9mIHRoZSBwb3NzaWJsZSBlbnRyeS1wb2ludCBmb3JtYXRzLlxuICovXG5leHBvcnQgdHlwZSBFbnRyeVBvaW50ID0gRW50cnlQb2ludFBhdGhzICYge1xuICAvKiogVGhlIHBhdGggdG8gdGhlIHBhY2thZ2UgdGhhdCBjb250YWlucyB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICBwYWNrYWdlOiBzdHJpbmc7XG4gIC8qKiBUaGUgcGF0aCB0byB0aGlzIGVudHJ5IHBvaW50LiAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIC8qKiBUaGUgcGF0aCB0byBhIHR5cGluZ3MgKC5kLnRzKSBmaWxlIGZvciB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICB0eXBpbmdzOiBzdHJpbmc7XG59O1xuXG5pbnRlcmZhY2UgRW50cnlQb2ludFBhY2thZ2VKc29uIHtcbiAgZmVzbTIwMTU/OiBzdHJpbmc7XG4gIGZlc201Pzogc3RyaW5nO1xuICBlc20yMDE1Pzogc3RyaW5nO1xuICBlc201Pzogc3RyaW5nO1xuICBtYWluPzogc3RyaW5nO1xuICB0eXBlcz86IHN0cmluZztcbiAgdHlwaW5ncz86IHN0cmluZztcbn1cblxuLyoqXG4gKiBUcnkgdG8gZ2V0IGVudHJ5IHBvaW50IGluZm8gZnJvbSB0aGUgZ2l2ZW4gcGF0aC5cbiAqIEBwYXJhbSBwa2dQYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBjb250YWluaW5nIG5wbSBwYWNrYWdlXG4gKiBAcGFyYW0gZW50cnlQb2ludCB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcG90ZW50aWFsIGVudHJ5IHBvaW50LlxuICogQHJldHVybnMgSW5mbyBhYm91dCB0aGUgZW50cnkgcG9pbnQgaWYgaXQgaXMgdmFsaWQsIGBudWxsYCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnRyeVBvaW50SW5mbyhwa2dQYXRoOiBzdHJpbmcsIGVudHJ5UG9pbnQ6IHN0cmluZyk6IEVudHJ5UG9pbnR8bnVsbCB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHBhdGgucmVzb2x2ZShlbnRyeVBvaW50LCAncGFja2FnZS5qc29uJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBBY2NvcmRpbmcgdG8gaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svZGVjbGFyYXRpb24tZmlsZXMvcHVibGlzaGluZy5odG1sLFxuICAvLyBgdHlwZXNgIGFuZCBgdHlwaW5nc2AgYXJlIGludGVyY2hhbmdlYWJsZS5cbiAgY29uc3Qge2Zlc20yMDE1LCBmZXNtNSwgZXNtMjAxNSwgZXNtNSwgbWFpbiwgdHlwZXMsIHR5cGluZ3MgPSB0eXBlc306IEVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9XG4gICAgICBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuXG4gIC8vIE1pbmltdW0gcmVxdWlyZW1lbnQgaXMgdGhhdCB3ZSBoYXZlIGVzbTIwMTUgZm9ybWF0IGFuZCB0eXBpbmdzLlxuICBpZiAoIXR5cGluZ3MgfHwgIWVzbTIwMTUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEFsc28gd2UgbmVlZCB0byBoYXZlIGEgbWV0YWRhdGEuanNvbiBmaWxlXG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9IHBhdGgucmVzb2x2ZShlbnRyeVBvaW50LCB0eXBpbmdzLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnJykgKyAnLm1ldGFkYXRhLmpzb24nKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKG1ldGFkYXRhUGF0aCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGVudHJ5UG9pbnRJbmZvOiBFbnRyeVBvaW50ID0ge1xuICAgIHBhY2thZ2U6IHBrZ1BhdGgsXG4gICAgcGF0aDogZW50cnlQb2ludCxcbiAgICB0eXBpbmdzOiBwYXRoLnJlc29sdmUoZW50cnlQb2ludCwgdHlwaW5ncyksXG4gICAgZXNtMjAxNTogcGF0aC5yZXNvbHZlKGVudHJ5UG9pbnQsIGVzbTIwMTUpLFxuICB9O1xuXG4gIGlmIChmZXNtMjAxNSkge1xuICAgIGVudHJ5UG9pbnRJbmZvLmZlc20yMDE1ID0gcGF0aC5yZXNvbHZlKGVudHJ5UG9pbnQsIGZlc20yMDE1KTtcbiAgfVxuICBpZiAoZmVzbTUpIHtcbiAgICBlbnRyeVBvaW50SW5mby5mZXNtNSA9IHBhdGgucmVzb2x2ZShlbnRyeVBvaW50LCBmZXNtNSk7XG4gIH1cbiAgaWYgKGVzbTUpIHtcbiAgICBlbnRyeVBvaW50SW5mby5lc201ID0gcGF0aC5yZXNvbHZlKGVudHJ5UG9pbnQsIGVzbTUpO1xuICB9XG4gIGlmIChtYWluKSB7XG4gICAgZW50cnlQb2ludEluZm8udW1kID0gcGF0aC5yZXNvbHZlKGVudHJ5UG9pbnQsIG1haW4pO1xuICB9XG5cbiAgcmV0dXJuIGVudHJ5UG9pbnRJbmZvO1xufVxuIl19