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
        define("@angular/compiler-cli/src/ngcc/src/parsing/utils", ["require", "exports", "fs", "path", "shelljs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs_1 = require("fs");
    var path_1 = require("path");
    var shelljs_1 = require("shelljs");
    /**
     * Search the `rootDirectory` and its subdirectories to find package.json files.
     * It ignores node dependencies, i.e. those under `node_modules` folders.
     * @param rootDirectory the directory in which we should search.
     */
    function findAllPackageJsonFiles(rootDirectory) {
        // TODO(gkalpak): Investigate whether skipping `node_modules/` directories (instead of traversing
        //                them and filtering out the results later) makes a noticeable difference.
        var paths = Array.from(shelljs_1.find(rootDirectory));
        return paths.filter(function (path) { return /\/package\.json$/.test(path) &&
            !/(?:^|\/)node_modules\//.test(path.slice(rootDirectory.length)); });
    }
    exports.findAllPackageJsonFiles = findAllPackageJsonFiles;
    /**
     * Identify the entry points of a package.
     * @param packageDirectory The absolute path to the root directory that contains this package.
     * @param format The format of the entry point within the package.
     * @returns A collection of paths that point to entry points for this package.
     */
    function getEntryPoints(packageDirectory, format) {
        var packageJsonPaths = findAllPackageJsonFiles(packageDirectory);
        return packageJsonPaths
            .map(function (packageJsonPath) {
            var entryPointPackageJson = JSON.parse(fs_1.readFileSync(packageJsonPath, 'utf8'));
            var relativeEntryPointPath = entryPointPackageJson[format];
            return relativeEntryPointPath && path_1.resolve(path_1.dirname(packageJsonPath), relativeEntryPointPath);
        })
            .filter(function (entryPointPath) { return entryPointPath; });
    }
    exports.getEntryPoints = getEntryPoints;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCx5QkFBZ0M7SUFDaEMsNkJBQXNDO0lBQ3RDLG1DQUE2QjtJQUU3Qjs7OztPQUlHO0lBQ0gsaUNBQXdDLGFBQXFCO1FBQzNELGlHQUFpRztRQUNqRywwRkFBMEY7UUFDMUYsSUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUM5QyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQ2YsVUFBQSxJQUFJLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ2pDLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBRDVELENBQzRELENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBUEQsMERBT0M7SUFFRDs7Ozs7T0FLRztJQUNILHdCQUErQixnQkFBd0IsRUFBRSxNQUFjO1FBQ3JFLElBQU0sZ0JBQWdCLEdBQUcsdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNuRSxPQUFPLGdCQUFnQjthQUNsQixHQUFHLENBQUMsVUFBQSxlQUFlO1lBQ2xCLElBQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBWSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLElBQU0sc0JBQXNCLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0QsT0FBTyxzQkFBc0IsSUFBSSxjQUFPLENBQUMsY0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDN0YsQ0FBQyxDQUFDO2FBQ0QsTUFBTSxDQUFDLFVBQUEsY0FBYyxJQUFJLE9BQUEsY0FBYyxFQUFkLENBQWMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFURCx3Q0FTQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7ZGlybmFtZSwgcmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQge2ZpbmR9IGZyb20gJ3NoZWxsanMnO1xuXG4vKipcbiAqIFNlYXJjaCB0aGUgYHJvb3REaXJlY3RvcnlgIGFuZCBpdHMgc3ViZGlyZWN0b3JpZXMgdG8gZmluZCBwYWNrYWdlLmpzb24gZmlsZXMuXG4gKiBJdCBpZ25vcmVzIG5vZGUgZGVwZW5kZW5jaWVzLCBpLmUuIHRob3NlIHVuZGVyIGBub2RlX21vZHVsZXNgIGZvbGRlcnMuXG4gKiBAcGFyYW0gcm9vdERpcmVjdG9yeSB0aGUgZGlyZWN0b3J5IGluIHdoaWNoIHdlIHNob3VsZCBzZWFyY2guXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsUGFja2FnZUpzb25GaWxlcyhyb290RGlyZWN0b3J5OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIC8vIFRPRE8oZ2thbHBhayk6IEludmVzdGlnYXRlIHdoZXRoZXIgc2tpcHBpbmcgYG5vZGVfbW9kdWxlcy9gIGRpcmVjdG9yaWVzIChpbnN0ZWFkIG9mIHRyYXZlcnNpbmdcbiAgLy8gICAgICAgICAgICAgICAgdGhlbSBhbmQgZmlsdGVyaW5nIG91dCB0aGUgcmVzdWx0cyBsYXRlcikgbWFrZXMgYSBub3RpY2VhYmxlIGRpZmZlcmVuY2UuXG4gIGNvbnN0IHBhdGhzID0gQXJyYXkuZnJvbShmaW5kKHJvb3REaXJlY3RvcnkpKTtcbiAgcmV0dXJuIHBhdGhzLmZpbHRlcihcbiAgICAgIHBhdGggPT4gL1xcL3BhY2thZ2VcXC5qc29uJC8udGVzdChwYXRoKSAmJlxuICAgICAgICAgICEvKD86XnxcXC8pbm9kZV9tb2R1bGVzXFwvLy50ZXN0KHBhdGguc2xpY2Uocm9vdERpcmVjdG9yeS5sZW5ndGgpKSk7XG59XG5cbi8qKlxuICogSWRlbnRpZnkgdGhlIGVudHJ5IHBvaW50cyBvZiBhIHBhY2thZ2UuXG4gKiBAcGFyYW0gcGFja2FnZURpcmVjdG9yeSBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBkaXJlY3RvcnkgdGhhdCBjb250YWlucyB0aGlzIHBhY2thZ2UuXG4gKiBAcGFyYW0gZm9ybWF0IFRoZSBmb3JtYXQgb2YgdGhlIGVudHJ5IHBvaW50IHdpdGhpbiB0aGUgcGFja2FnZS5cbiAqIEByZXR1cm5zIEEgY29sbGVjdGlvbiBvZiBwYXRocyB0aGF0IHBvaW50IHRvIGVudHJ5IHBvaW50cyBmb3IgdGhpcyBwYWNrYWdlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludHMocGFja2FnZURpcmVjdG9yeTogc3RyaW5nLCBmb3JtYXQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRocyA9IGZpbmRBbGxQYWNrYWdlSnNvbkZpbGVzKHBhY2thZ2VEaXJlY3RvcnkpO1xuICByZXR1cm4gcGFja2FnZUpzb25QYXRoc1xuICAgICAgLm1hcChwYWNrYWdlSnNvblBhdGggPT4ge1xuICAgICAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuICAgICAgICBjb25zdCByZWxhdGl2ZUVudHJ5UG9pbnRQYXRoID0gZW50cnlQb2ludFBhY2thZ2VKc29uW2Zvcm1hdF07XG4gICAgICAgIHJldHVybiByZWxhdGl2ZUVudHJ5UG9pbnRQYXRoICYmIHJlc29sdmUoZGlybmFtZShwYWNrYWdlSnNvblBhdGgpLCByZWxhdGl2ZUVudHJ5UG9pbnRQYXRoKTtcbiAgICAgIH0pXG4gICAgICAuZmlsdGVyKGVudHJ5UG9pbnRQYXRoID0+IGVudHJ5UG9pbnRQYXRoKTtcbn1cbiJdfQ==