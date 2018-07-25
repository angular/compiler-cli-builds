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
     * Match paths to package.json files.
     */
    var PACKAGE_JSON_REGEX = /\/package\.json$/;
    /**
     * Match paths that have a `node_modules` segment at the start or in the middle.
     */
    var NODE_MODULES_REGEX = /(?:^|\/)node_modules\//;
    /**
     * Search the `rootDirectory` and its subdirectories to find package.json files.
     * It ignores node dependencies, i.e. those under `node_modules` folders.
     * @param rootDirectory the directory in which we should search.
     */
    function findAllPackageJsonFiles(rootDirectory) {
        // TODO(gkalpak): Investigate whether skipping `node_modules/` directories (instead of traversing
        //                them and filtering out the results later) makes a noticeable difference.
        var paths = Array.from(shelljs_1.find(rootDirectory));
        return paths.filter(function (path) { return PACKAGE_JSON_REGEX.test(path) &&
            !NODE_MODULES_REGEX.test(path.slice(rootDirectory.length)); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCx5QkFBZ0M7SUFDaEMsNkJBQXNDO0lBQ3RDLG1DQUE2QjtJQUU3Qjs7T0FFRztJQUNILElBQU0sa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7SUFFOUM7O09BRUc7SUFDSCxJQUFNLGtCQUFrQixHQUFHLHdCQUF3QixDQUFDO0lBRXBEOzs7O09BSUc7SUFDSCxpQ0FBd0MsYUFBcUI7UUFDM0QsaUdBQWlHO1FBQ2pHLDBGQUEwRjtRQUMxRixJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FDZixVQUFBLElBQUksSUFBSSxPQUFBLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDakMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsRUFEdEQsQ0FDc0QsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFQRCwwREFPQztJQUVEOzs7OztPQUtHO0lBQ0gsd0JBQStCLGdCQUF3QixFQUFFLE1BQWM7UUFDckUsSUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLE9BQU8sZ0JBQWdCO2FBQ2xCLEdBQUcsQ0FBQyxVQUFBLGVBQWU7WUFDbEIsSUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEYsSUFBTSxzQkFBc0IsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3RCxPQUFPLHNCQUFzQixJQUFJLGNBQU8sQ0FBQyxjQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUM3RixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsVUFBQSxjQUFjLElBQUksT0FBQSxjQUFjLEVBQWQsQ0FBYyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQVRELHdDQVNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge3JlYWRGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtkaXJuYW1lLCByZXNvbHZlfSBmcm9tICdwYXRoJztcbmltcG9ydCB7ZmluZH0gZnJvbSAnc2hlbGxqcyc7XG5cbi8qKlxuICogTWF0Y2ggcGF0aHMgdG8gcGFja2FnZS5qc29uIGZpbGVzLlxuICovXG5jb25zdCBQQUNLQUdFX0pTT05fUkVHRVggPSAvXFwvcGFja2FnZVxcLmpzb24kLztcblxuLyoqXG4gKiBNYXRjaCBwYXRocyB0aGF0IGhhdmUgYSBgbm9kZV9tb2R1bGVzYCBzZWdtZW50IGF0IHRoZSBzdGFydCBvciBpbiB0aGUgbWlkZGxlLlxuICovXG5jb25zdCBOT0RFX01PRFVMRVNfUkVHRVggPSAvKD86XnxcXC8pbm9kZV9tb2R1bGVzXFwvLztcblxuLyoqXG4gKiBTZWFyY2ggdGhlIGByb290RGlyZWN0b3J5YCBhbmQgaXRzIHN1YmRpcmVjdG9yaWVzIHRvIGZpbmQgcGFja2FnZS5qc29uIGZpbGVzLlxuICogSXQgaWdub3JlcyBub2RlIGRlcGVuZGVuY2llcywgaS5lLiB0aG9zZSB1bmRlciBgbm9kZV9tb2R1bGVzYCBmb2xkZXJzLlxuICogQHBhcmFtIHJvb3REaXJlY3RvcnkgdGhlIGRpcmVjdG9yeSBpbiB3aGljaCB3ZSBzaG91bGQgc2VhcmNoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbFBhY2thZ2VKc29uRmlsZXMocm9vdERpcmVjdG9yeTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAvLyBUT0RPKGdrYWxwYWspOiBJbnZlc3RpZ2F0ZSB3aGV0aGVyIHNraXBwaW5nIGBub2RlX21vZHVsZXMvYCBkaXJlY3RvcmllcyAoaW5zdGVhZCBvZiB0cmF2ZXJzaW5nXG4gIC8vICAgICAgICAgICAgICAgIHRoZW0gYW5kIGZpbHRlcmluZyBvdXQgdGhlIHJlc3VsdHMgbGF0ZXIpIG1ha2VzIGEgbm90aWNlYWJsZSBkaWZmZXJlbmNlLlxuICBjb25zdCBwYXRocyA9IEFycmF5LmZyb20oZmluZChyb290RGlyZWN0b3J5KSk7XG4gIHJldHVybiBwYXRocy5maWx0ZXIoXG4gICAgICBwYXRoID0+IFBBQ0tBR0VfSlNPTl9SRUdFWC50ZXN0KHBhdGgpICYmXG4gICAgICAgICAgIU5PREVfTU9EVUxFU19SRUdFWC50ZXN0KHBhdGguc2xpY2Uocm9vdERpcmVjdG9yeS5sZW5ndGgpKSk7XG59XG5cbi8qKlxuICogSWRlbnRpZnkgdGhlIGVudHJ5IHBvaW50cyBvZiBhIHBhY2thZ2UuXG4gKiBAcGFyYW0gcGFja2FnZURpcmVjdG9yeSBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBkaXJlY3RvcnkgdGhhdCBjb250YWlucyB0aGlzIHBhY2thZ2UuXG4gKiBAcGFyYW0gZm9ybWF0IFRoZSBmb3JtYXQgb2YgdGhlIGVudHJ5IHBvaW50IHdpdGhpbiB0aGUgcGFja2FnZS5cbiAqIEByZXR1cm5zIEEgY29sbGVjdGlvbiBvZiBwYXRocyB0aGF0IHBvaW50IHRvIGVudHJ5IHBvaW50cyBmb3IgdGhpcyBwYWNrYWdlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludHMocGFja2FnZURpcmVjdG9yeTogc3RyaW5nLCBmb3JtYXQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRocyA9IGZpbmRBbGxQYWNrYWdlSnNvbkZpbGVzKHBhY2thZ2VEaXJlY3RvcnkpO1xuICByZXR1cm4gcGFja2FnZUpzb25QYXRoc1xuICAgICAgLm1hcChwYWNrYWdlSnNvblBhdGggPT4ge1xuICAgICAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuICAgICAgICBjb25zdCByZWxhdGl2ZUVudHJ5UG9pbnRQYXRoID0gZW50cnlQb2ludFBhY2thZ2VKc29uW2Zvcm1hdF07XG4gICAgICAgIHJldHVybiByZWxhdGl2ZUVudHJ5UG9pbnRQYXRoICYmIHJlc29sdmUoZGlybmFtZShwYWNrYWdlSnNvblBhdGgpLCByZWxhdGl2ZUVudHJ5UG9pbnRQYXRoKTtcbiAgICAgIH0pXG4gICAgICAuZmlsdGVyKGVudHJ5UG9pbnRQYXRoID0+IGVudHJ5UG9pbnRQYXRoKTtcbn1cbiJdfQ==