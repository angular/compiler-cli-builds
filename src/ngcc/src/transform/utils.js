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
        define("@angular/compiler-cli/src/ngcc/src/transform/utils", ["require", "exports", "fs", "path", "shelljs", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs_1 = require("fs");
    var path_1 = require("path");
    var shelljs_1 = require("shelljs");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    /**
     * Represents an entry point to a package or sub-package.
     *
     * It exposes the absolute path to the entry point file and a method to get the `.d.ts` file that
     * corresponds to any source file that belongs to the package (assuming source files and `.d.ts`
     * files have the same directory layout).
     */
    var EntryPoint = /** @class */ (function () {
        /**
         * @param packageRoot The absolute path to the root directory that contains the package.
         * @param relativeEntryPath The relative path to the entry point file.
         * @param relativeDtsEntryPath The relative path to the `.d.ts` entry point file.
         */
        function EntryPoint(packageRoot, relativeEntryPath, relativeDtsEntryPath) {
            this.entryFileName = path_1.resolve(packageRoot, relativeEntryPath);
            this.entryRoot = path_1.dirname(this.entryFileName);
            var dtsEntryFileName = path_1.resolve(packageRoot, relativeDtsEntryPath);
            this.dtsEntryRoot = path_1.dirname(dtsEntryFileName);
        }
        return EntryPoint;
    }());
    exports.EntryPoint = EntryPoint;
    /**
     * Match paths to `package.json` files.
     */
    var PACKAGE_JSON_REGEX = /\/package\.json$/;
    /**
     * Match paths that have a `node_modules` segment at the start or in the middle.
     */
    var NODE_MODULES_REGEX = /(?:^|\/)node_modules\//;
    /**
     * Search the `rootDirectory` and its subdirectories to find `package.json` files.
     * It ignores node dependencies, i.e. those under `node_modules` directories.
     *
     * @param rootDirectory The directory in which we should search.
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
     *
     * @param packageDirectory The absolute path to the root directory that contains the package.
     * @param format The format of the entry points to look for within the package.
     *
     * @returns A collection of `EntryPoint`s that correspond to entry points for the package.
     */
    function getEntryPoints(packageDirectory, format) {
        var packageJsonPaths = findAllPackageJsonFiles(packageDirectory);
        var entryPoints = packageJsonPaths
            .map(function (packageJsonPath) {
            var entryPointPackageJson = JSON.parse(fs_1.readFileSync(packageJsonPath, 'utf8'));
            var entryPointPath = entryPointPackageJson[format];
            if (!entryPointPath) {
                return undefined;
            }
            var dtsEntryPointPath = entryPointPackageJson.typings || entryPointPath;
            return new EntryPoint(path_1.dirname(packageJsonPath), entryPointPath, dtsEntryPointPath);
        })
            .filter(utils_1.isDefined);
        return entryPoints;
    }
    exports.getEntryPoints = getEntryPoints;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3RyYW5zZm9ybS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHlCQUFnQztJQUNoQyw2QkFBZ0Q7SUFDaEQsbUNBQTZCO0lBRTdCLGtFQUFtQztJQUVuQzs7Ozs7O09BTUc7SUFDSDtRQUtFOzs7O1dBSUc7UUFDSCxvQkFBWSxXQUFtQixFQUFFLGlCQUF5QixFQUFFLG9CQUE0QjtZQUN0RixJQUFJLENBQUMsYUFBYSxHQUFHLGNBQU8sQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsU0FBUyxHQUFHLGNBQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDN0MsSUFBTSxnQkFBZ0IsR0FBRyxjQUFPLENBQUMsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLFlBQVksR0FBRyxjQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQ0gsaUJBQUM7SUFBRCxDQUFDLEFBaEJELElBZ0JDO0lBaEJZLGdDQUFVO0lBa0J2Qjs7T0FFRztJQUNILElBQU0sa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7SUFFOUM7O09BRUc7SUFDSCxJQUFNLGtCQUFrQixHQUFHLHdCQUF3QixDQUFDO0lBRXBEOzs7OztPQUtHO0lBQ0gsaUNBQXdDLGFBQXFCO1FBQzNELGlHQUFpRztRQUNqRywwRkFBMEY7UUFDMUYsSUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUM5QyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQ2YsVUFBQSxJQUFJLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ2pDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBRHRELENBQ3NELENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBUEQsMERBT0M7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsd0JBQStCLGdCQUF3QixFQUFFLE1BQWM7UUFDckUsSUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLElBQU0sV0FBVyxHQUNiLGdCQUFnQjthQUNYLEdBQUcsQ0FBQyxVQUFBLGVBQWU7WUFDbEIsSUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEYsSUFBTSxjQUFjLEdBQXFCLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ25CLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxpQkFBaUIsR0FBRyxxQkFBcUIsQ0FBQyxPQUFPLElBQUksY0FBYyxDQUFDO1lBQzFFLE9BQU8sSUFBSSxVQUFVLENBQUMsY0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3JGLENBQUMsQ0FBQzthQUNELE1BQU0sQ0FBQyxpQkFBUyxDQUFDLENBQUM7UUFDM0IsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztJQWZELHdDQWVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge3JlYWRGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtkaXJuYW1lLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQge2ZpbmR9IGZyb20gJ3NoZWxsanMnO1xuXG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIG9yIHN1Yi1wYWNrYWdlLlxuICpcbiAqIEl0IGV4cG9zZXMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGVudHJ5IHBvaW50IGZpbGUgYW5kIGEgbWV0aG9kIHRvIGdldCB0aGUgYC5kLnRzYCBmaWxlIHRoYXRcbiAqIGNvcnJlc3BvbmRzIHRvIGFueSBzb3VyY2UgZmlsZSB0aGF0IGJlbG9uZ3MgdG8gdGhlIHBhY2thZ2UgKGFzc3VtaW5nIHNvdXJjZSBmaWxlcyBhbmQgYC5kLnRzYFxuICogZmlsZXMgaGF2ZSB0aGUgc2FtZSBkaXJlY3RvcnkgbGF5b3V0KS5cbiAqL1xuZXhwb3J0IGNsYXNzIEVudHJ5UG9pbnQge1xuICBlbnRyeUZpbGVOYW1lOiBzdHJpbmc7XG4gIGVudHJ5Um9vdDogc3RyaW5nO1xuICBkdHNFbnRyeVJvb3Q6IHN0cmluZztcblxuICAvKipcbiAgICogQHBhcmFtIHBhY2thZ2VSb290IFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSByb290IGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlLlxuICAgKiBAcGFyYW0gcmVsYXRpdmVFbnRyeVBhdGggVGhlIHJlbGF0aXZlIHBhdGggdG8gdGhlIGVudHJ5IHBvaW50IGZpbGUuXG4gICAqIEBwYXJhbSByZWxhdGl2ZUR0c0VudHJ5UGF0aCBUaGUgcmVsYXRpdmUgcGF0aCB0byB0aGUgYC5kLnRzYCBlbnRyeSBwb2ludCBmaWxlLlxuICAgKi9cbiAgY29uc3RydWN0b3IocGFja2FnZVJvb3Q6IHN0cmluZywgcmVsYXRpdmVFbnRyeVBhdGg6IHN0cmluZywgcmVsYXRpdmVEdHNFbnRyeVBhdGg6IHN0cmluZykge1xuICAgIHRoaXMuZW50cnlGaWxlTmFtZSA9IHJlc29sdmUocGFja2FnZVJvb3QsIHJlbGF0aXZlRW50cnlQYXRoKTtcbiAgICB0aGlzLmVudHJ5Um9vdCA9IGRpcm5hbWUodGhpcy5lbnRyeUZpbGVOYW1lKTtcbiAgICBjb25zdCBkdHNFbnRyeUZpbGVOYW1lID0gcmVzb2x2ZShwYWNrYWdlUm9vdCwgcmVsYXRpdmVEdHNFbnRyeVBhdGgpO1xuICAgIHRoaXMuZHRzRW50cnlSb290ID0gZGlybmFtZShkdHNFbnRyeUZpbGVOYW1lKTtcbiAgfVxufVxuXG4vKipcbiAqIE1hdGNoIHBhdGhzIHRvIGBwYWNrYWdlLmpzb25gIGZpbGVzLlxuICovXG5jb25zdCBQQUNLQUdFX0pTT05fUkVHRVggPSAvXFwvcGFja2FnZVxcLmpzb24kLztcblxuLyoqXG4gKiBNYXRjaCBwYXRocyB0aGF0IGhhdmUgYSBgbm9kZV9tb2R1bGVzYCBzZWdtZW50IGF0IHRoZSBzdGFydCBvciBpbiB0aGUgbWlkZGxlLlxuICovXG5jb25zdCBOT0RFX01PRFVMRVNfUkVHRVggPSAvKD86XnxcXC8pbm9kZV9tb2R1bGVzXFwvLztcblxuLyoqXG4gKiBTZWFyY2ggdGhlIGByb290RGlyZWN0b3J5YCBhbmQgaXRzIHN1YmRpcmVjdG9yaWVzIHRvIGZpbmQgYHBhY2thZ2UuanNvbmAgZmlsZXMuXG4gKiBJdCBpZ25vcmVzIG5vZGUgZGVwZW5kZW5jaWVzLCBpLmUuIHRob3NlIHVuZGVyIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yaWVzLlxuICpcbiAqIEBwYXJhbSByb290RGlyZWN0b3J5IFRoZSBkaXJlY3RvcnkgaW4gd2hpY2ggd2Ugc2hvdWxkIHNlYXJjaC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlSnNvbkZpbGVzKHJvb3REaXJlY3Rvcnk6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgLy8gVE9ETyhna2FscGFrKTogSW52ZXN0aWdhdGUgd2hldGhlciBza2lwcGluZyBgbm9kZV9tb2R1bGVzL2AgZGlyZWN0b3JpZXMgKGluc3RlYWQgb2YgdHJhdmVyc2luZ1xuICAvLyAgICAgICAgICAgICAgICB0aGVtIGFuZCBmaWx0ZXJpbmcgb3V0IHRoZSByZXN1bHRzIGxhdGVyKSBtYWtlcyBhIG5vdGljZWFibGUgZGlmZmVyZW5jZS5cbiAgY29uc3QgcGF0aHMgPSBBcnJheS5mcm9tKGZpbmQocm9vdERpcmVjdG9yeSkpO1xuICByZXR1cm4gcGF0aHMuZmlsdGVyKFxuICAgICAgcGF0aCA9PiBQQUNLQUdFX0pTT05fUkVHRVgudGVzdChwYXRoKSAmJlxuICAgICAgICAgICFOT0RFX01PRFVMRVNfUkVHRVgudGVzdChwYXRoLnNsaWNlKHJvb3REaXJlY3RvcnkubGVuZ3RoKSkpO1xufVxuXG4vKipcbiAqIElkZW50aWZ5IHRoZSBlbnRyeSBwb2ludHMgb2YgYSBwYWNrYWdlLlxuICpcbiAqIEBwYXJhbSBwYWNrYWdlRGlyZWN0b3J5IFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSByb290IGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlLlxuICogQHBhcmFtIGZvcm1hdCBUaGUgZm9ybWF0IG9mIHRoZSBlbnRyeSBwb2ludHMgdG8gbG9vayBmb3Igd2l0aGluIHRoZSBwYWNrYWdlLlxuICpcbiAqIEByZXR1cm5zIEEgY29sbGVjdGlvbiBvZiBgRW50cnlQb2ludGBzIHRoYXQgY29ycmVzcG9uZCB0byBlbnRyeSBwb2ludHMgZm9yIHRoZSBwYWNrYWdlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludHMocGFja2FnZURpcmVjdG9yeTogc3RyaW5nLCBmb3JtYXQ6IHN0cmluZyk6IEVudHJ5UG9pbnRbXSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aHMgPSBmaW5kQWxsUGFja2FnZUpzb25GaWxlcyhwYWNrYWdlRGlyZWN0b3J5KTtcbiAgY29uc3QgZW50cnlQb2ludHMgPVxuICAgICAgcGFja2FnZUpzb25QYXRoc1xuICAgICAgICAgIC5tYXAocGFja2FnZUpzb25QYXRoID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uUGF0aCwgJ3V0ZjgnKSk7XG4gICAgICAgICAgICBjb25zdCBlbnRyeVBvaW50UGF0aDogc3RyaW5nfHVuZGVmaW5lZCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltmb3JtYXRdO1xuICAgICAgICAgICAgaWYgKCFlbnRyeVBvaW50UGF0aCkge1xuICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHRzRW50cnlQb2ludFBhdGggPSBlbnRyeVBvaW50UGFja2FnZUpzb24udHlwaW5ncyB8fCBlbnRyeVBvaW50UGF0aDtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRW50cnlQb2ludChkaXJuYW1lKHBhY2thZ2VKc29uUGF0aCksIGVudHJ5UG9pbnRQYXRoLCBkdHNFbnRyeVBvaW50UGF0aCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIHJldHVybiBlbnRyeVBvaW50cztcbn1cbiJdfQ==