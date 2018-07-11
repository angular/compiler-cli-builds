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
        define("@angular/compiler-cli/src/ngcc/src/parsing/utils", ["require", "exports", "path", "fs", "shelljs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path_1 = require("path");
    var fs_1 = require("fs");
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
        return paths.filter(function (path) {
            return /\/package\.json$/.test(path) &&
                !/(?:^|\/)node_modules\//.test(path.slice(rootDirectory.length));
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhcnNpbmcvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw2QkFBd0M7SUFDeEMseUJBQWtDO0lBQ2xDLG1DQUErQjtJQUUvQjs7OztPQUlHO0lBQ0gsaUNBQXdDLGFBQXFCO1FBQzNELGlHQUFpRztRQUNqRywwRkFBMEY7UUFDMUYsSUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUM5QyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBQSxJQUFJO1lBQ3RCLE9BQUEsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDN0IsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7UUFEaEUsQ0FDZ0UsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFQRCwwREFPQztJQUVEOzs7OztPQUtHO0lBQ0gsd0JBQStCLGdCQUF3QixFQUFFLE1BQWM7UUFDckUsSUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLE9BQU8sZ0JBQWdCO2FBQ3BCLEdBQUcsQ0FBQyxVQUFBLGVBQWU7WUFDbEIsSUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEYsSUFBTSxzQkFBc0IsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3RCxPQUFPLHNCQUFzQixJQUFJLGNBQU8sQ0FBQyxjQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUM3RixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsVUFBQSxjQUFjLElBQUksT0FBQSxjQUFjLEVBQWQsQ0FBYyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQVRELHdDQVNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBkaXJuYW1lLCByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBmaW5kIH0gZnJvbSAnc2hlbGxqcyc7XG5cbi8qKlxuICogU2VhcmNoIHRoZSBgcm9vdERpcmVjdG9yeWAgYW5kIGl0cyBzdWJkaXJlY3RvcmllcyB0byBmaW5kIHBhY2thZ2UuanNvbiBmaWxlcy5cbiAqIEl0IGlnbm9yZXMgbm9kZSBkZXBlbmRlbmNpZXMsIGkuZS4gdGhvc2UgdW5kZXIgYG5vZGVfbW9kdWxlc2AgZm9sZGVycy5cbiAqIEBwYXJhbSByb290RGlyZWN0b3J5IHRoZSBkaXJlY3RvcnkgaW4gd2hpY2ggd2Ugc2hvdWxkIHNlYXJjaC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlSnNvbkZpbGVzKHJvb3REaXJlY3Rvcnk6IHN0cmluZykge1xuICAvLyBUT0RPKGdrYWxwYWspOiBJbnZlc3RpZ2F0ZSB3aGV0aGVyIHNraXBwaW5nIGBub2RlX21vZHVsZXMvYCBkaXJlY3RvcmllcyAoaW5zdGVhZCBvZiB0cmF2ZXJzaW5nXG4gIC8vICAgICAgICAgICAgICAgIHRoZW0gYW5kIGZpbHRlcmluZyBvdXQgdGhlIHJlc3VsdHMgbGF0ZXIpIG1ha2VzIGEgbm90aWNlYWJsZSBkaWZmZXJlbmNlLlxuICBjb25zdCBwYXRocyA9IEFycmF5LmZyb20oZmluZChyb290RGlyZWN0b3J5KSk7XG4gIHJldHVybiBwYXRocy5maWx0ZXIocGF0aCA9PlxuICAgIC9cXC9wYWNrYWdlXFwuanNvbiQvLnRlc3QocGF0aCkgJiZcbiAgICAhLyg/Ol58XFwvKW5vZGVfbW9kdWxlc1xcLy8udGVzdChwYXRoLnNsaWNlKHJvb3REaXJlY3RvcnkubGVuZ3RoKSkpO1xufVxuXG4vKipcbiAqIElkZW50aWZ5IHRoZSBlbnRyeSBwb2ludHMgb2YgYSBwYWNrYWdlLlxuICogQHBhcmFtIHBhY2thZ2VEaXJlY3RvcnkgVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHJvb3QgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgdGhpcyBwYWNrYWdlLlxuICogQHBhcmFtIGZvcm1hdCBUaGUgZm9ybWF0IG9mIHRoZSBlbnRyeSBwb2ludCB3aXRoaW4gdGhlIHBhY2thZ2UuXG4gKiBAcmV0dXJucyBBIGNvbGxlY3Rpb24gb2YgcGF0aHMgdGhhdCBwb2ludCB0byBlbnRyeSBwb2ludHMgZm9yIHRoaXMgcGFja2FnZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudHJ5UG9pbnRzKHBhY2thZ2VEaXJlY3Rvcnk6IHN0cmluZywgZm9ybWF0OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aHMgPSBmaW5kQWxsUGFja2FnZUpzb25GaWxlcyhwYWNrYWdlRGlyZWN0b3J5KTtcbiAgcmV0dXJuIHBhY2thZ2VKc29uUGF0aHNcbiAgICAubWFwKHBhY2thZ2VKc29uUGF0aCA9PiB7XG4gICAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuICAgICAgY29uc3QgcmVsYXRpdmVFbnRyeVBvaW50UGF0aCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltmb3JtYXRdO1xuICAgICAgcmV0dXJuIHJlbGF0aXZlRW50cnlQb2ludFBhdGggJiYgcmVzb2x2ZShkaXJuYW1lKHBhY2thZ2VKc29uUGF0aCksIHJlbGF0aXZlRW50cnlQb2ludFBhdGgpO1xuICAgIH0pXG4gICAgLmZpbHRlcihlbnRyeVBvaW50UGF0aCA9PiBlbnRyeVBvaW50UGF0aCk7XG59Il19