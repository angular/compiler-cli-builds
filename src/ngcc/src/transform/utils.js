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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3RyYW5zZm9ybS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHlCQUFnQztJQUNoQyw2QkFBZ0Q7SUFDaEQsbUNBQTZCO0lBRTdCLGtFQUFtQztJQUVuQzs7Ozs7O09BTUc7SUFDSDtRQUtFOzs7O1dBSUc7UUFDSCxvQkFBWSxXQUFtQixFQUFFLGlCQUF5QixFQUFFLG9CQUE0QjtZQUN0RixJQUFJLENBQUMsYUFBYSxHQUFHLGNBQU8sQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsU0FBUyxHQUFHLGNBQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDN0MsSUFBTSxnQkFBZ0IsR0FBRyxjQUFPLENBQUMsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLFlBQVksR0FBRyxjQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQ0gsaUJBQUM7SUFBRCxDQUFDLEFBaEJELElBZ0JDO0lBaEJZLGdDQUFVO0lBa0J2Qjs7T0FFRztJQUNILElBQU0sa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7SUFFOUM7O09BRUc7SUFDSCxJQUFNLGtCQUFrQixHQUFHLHdCQUF3QixDQUFDO0lBRXBEOzs7OztPQUtHO0lBQ0gsaUNBQXdDLGFBQXFCO1FBQzNELGlHQUFpRztRQUNqRywwRkFBMEY7UUFDMUYsSUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUM5QyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQ2YsVUFBQSxJQUFJLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ2pDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBRHRELENBQ3NELENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBUEQsMERBT0M7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsd0JBQStCLGdCQUF3QixFQUFFLE1BQWM7UUFDckUsSUFBTSxnQkFBZ0IsR0FBRyx1QkFBdUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ25FLElBQU0sV0FBVyxHQUFHLGdCQUFnQjthQUMvQixHQUFHLENBQUMsVUFBQSxlQUFlO1lBQ2xCLElBQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBWSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLElBQU0sY0FBYyxHQUFxQixxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUNuQixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELElBQU0saUJBQWlCLEdBQUcscUJBQXFCLENBQUMsT0FBTyxJQUFJLGNBQWMsQ0FBQztZQUMxRSxPQUFPLElBQUksVUFBVSxDQUFDLGNBQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNyRixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsaUJBQVMsQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sV0FBVyxDQUFDO0lBQ3ZCLENBQUM7SUFkRCx3Q0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7ZGlybmFtZSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtmaW5kfSBmcm9tICdzaGVsbGpzJztcblxuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGVudHJ5IHBvaW50IHRvIGEgcGFja2FnZSBvciBzdWItcGFja2FnZS5cbiAqXG4gKiBJdCBleHBvc2VzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBlbnRyeSBwb2ludCBmaWxlIGFuZCBhIG1ldGhvZCB0byBnZXQgdGhlIGAuZC50c2AgZmlsZSB0aGF0XG4gKiBjb3JyZXNwb25kcyB0byBhbnkgc291cmNlIGZpbGUgdGhhdCBiZWxvbmdzIHRvIHRoZSBwYWNrYWdlIChhc3N1bWluZyBzb3VyY2UgZmlsZXMgYW5kIGAuZC50c2BcbiAqIGZpbGVzIGhhdmUgdGhlIHNhbWUgZGlyZWN0b3J5IGxheW91dCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbnRyeVBvaW50IHtcbiAgZW50cnlGaWxlTmFtZTogc3RyaW5nO1xuICBlbnRyeVJvb3Q6IHN0cmluZztcbiAgZHRzRW50cnlSb290OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBwYWNrYWdlUm9vdCBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBkaXJlY3RvcnkgdGhhdCBjb250YWlucyB0aGUgcGFja2FnZS5cbiAgICogQHBhcmFtIHJlbGF0aXZlRW50cnlQYXRoIFRoZSByZWxhdGl2ZSBwYXRoIHRvIHRoZSBlbnRyeSBwb2ludCBmaWxlLlxuICAgKiBAcGFyYW0gcmVsYXRpdmVEdHNFbnRyeVBhdGggVGhlIHJlbGF0aXZlIHBhdGggdG8gdGhlIGAuZC50c2AgZW50cnkgcG9pbnQgZmlsZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHBhY2thZ2VSb290OiBzdHJpbmcsIHJlbGF0aXZlRW50cnlQYXRoOiBzdHJpbmcsIHJlbGF0aXZlRHRzRW50cnlQYXRoOiBzdHJpbmcpIHtcbiAgICB0aGlzLmVudHJ5RmlsZU5hbWUgPSByZXNvbHZlKHBhY2thZ2VSb290LCByZWxhdGl2ZUVudHJ5UGF0aCk7XG4gICAgdGhpcy5lbnRyeVJvb3QgPSBkaXJuYW1lKHRoaXMuZW50cnlGaWxlTmFtZSk7XG4gICAgY29uc3QgZHRzRW50cnlGaWxlTmFtZSA9IHJlc29sdmUocGFja2FnZVJvb3QsIHJlbGF0aXZlRHRzRW50cnlQYXRoKTtcbiAgICB0aGlzLmR0c0VudHJ5Um9vdCA9IGRpcm5hbWUoZHRzRW50cnlGaWxlTmFtZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBNYXRjaCBwYXRocyB0byBgcGFja2FnZS5qc29uYCBmaWxlcy5cbiAqL1xuY29uc3QgUEFDS0FHRV9KU09OX1JFR0VYID0gL1xcL3BhY2thZ2VcXC5qc29uJC87XG5cbi8qKlxuICogTWF0Y2ggcGF0aHMgdGhhdCBoYXZlIGEgYG5vZGVfbW9kdWxlc2Agc2VnbWVudCBhdCB0aGUgc3RhcnQgb3IgaW4gdGhlIG1pZGRsZS5cbiAqL1xuY29uc3QgTk9ERV9NT0RVTEVTX1JFR0VYID0gLyg/Ol58XFwvKW5vZGVfbW9kdWxlc1xcLy87XG5cbi8qKlxuICogU2VhcmNoIHRoZSBgcm9vdERpcmVjdG9yeWAgYW5kIGl0cyBzdWJkaXJlY3RvcmllcyB0byBmaW5kIGBwYWNrYWdlLmpzb25gIGZpbGVzLlxuICogSXQgaWdub3JlcyBub2RlIGRlcGVuZGVuY2llcywgaS5lLiB0aG9zZSB1bmRlciBgbm9kZV9tb2R1bGVzYCBkaXJlY3Rvcmllcy5cbiAqXG4gKiBAcGFyYW0gcm9vdERpcmVjdG9yeSBUaGUgZGlyZWN0b3J5IGluIHdoaWNoIHdlIHNob3VsZCBzZWFyY2guXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsUGFja2FnZUpzb25GaWxlcyhyb290RGlyZWN0b3J5OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIC8vIFRPRE8oZ2thbHBhayk6IEludmVzdGlnYXRlIHdoZXRoZXIgc2tpcHBpbmcgYG5vZGVfbW9kdWxlcy9gIGRpcmVjdG9yaWVzIChpbnN0ZWFkIG9mIHRyYXZlcnNpbmdcbiAgLy8gICAgICAgICAgICAgICAgdGhlbSBhbmQgZmlsdGVyaW5nIG91dCB0aGUgcmVzdWx0cyBsYXRlcikgbWFrZXMgYSBub3RpY2VhYmxlIGRpZmZlcmVuY2UuXG4gIGNvbnN0IHBhdGhzID0gQXJyYXkuZnJvbShmaW5kKHJvb3REaXJlY3RvcnkpKTtcbiAgcmV0dXJuIHBhdGhzLmZpbHRlcihcbiAgICAgIHBhdGggPT4gUEFDS0FHRV9KU09OX1JFR0VYLnRlc3QocGF0aCkgJiZcbiAgICAgICAgICAhTk9ERV9NT0RVTEVTX1JFR0VYLnRlc3QocGF0aC5zbGljZShyb290RGlyZWN0b3J5Lmxlbmd0aCkpKTtcbn1cblxuLyoqXG4gKiBJZGVudGlmeSB0aGUgZW50cnkgcG9pbnRzIG9mIGEgcGFja2FnZS5cbiAqXG4gKiBAcGFyYW0gcGFja2FnZURpcmVjdG9yeSBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBkaXJlY3RvcnkgdGhhdCBjb250YWlucyB0aGUgcGFja2FnZS5cbiAqIEBwYXJhbSBmb3JtYXQgVGhlIGZvcm1hdCBvZiB0aGUgZW50cnkgcG9pbnRzIHRvIGxvb2sgZm9yIHdpdGhpbiB0aGUgcGFja2FnZS5cbiAqXG4gKiBAcmV0dXJucyBBIGNvbGxlY3Rpb24gb2YgYEVudHJ5UG9pbnRgcyB0aGF0IGNvcnJlc3BvbmQgdG8gZW50cnkgcG9pbnRzIGZvciB0aGUgcGFja2FnZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudHJ5UG9pbnRzKHBhY2thZ2VEaXJlY3Rvcnk6IHN0cmluZywgZm9ybWF0OiBzdHJpbmcpOiBFbnRyeVBvaW50W10ge1xuICBjb25zdCBwYWNrYWdlSnNvblBhdGhzID0gZmluZEFsbFBhY2thZ2VKc29uRmlsZXMocGFja2FnZURpcmVjdG9yeSk7XG4gIGNvbnN0IGVudHJ5UG9pbnRzID0gcGFja2FnZUpzb25QYXRoc1xuICAgICAgLm1hcChwYWNrYWdlSnNvblBhdGggPT4ge1xuICAgICAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuICAgICAgICBjb25zdCBlbnRyeVBvaW50UGF0aDogc3RyaW5nfHVuZGVmaW5lZCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltmb3JtYXRdO1xuICAgICAgICBpZiAoIWVudHJ5UG9pbnRQYXRoKSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkdHNFbnRyeVBvaW50UGF0aCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi50eXBpbmdzIHx8IGVudHJ5UG9pbnRQYXRoO1xuICAgICAgICByZXR1cm4gbmV3IEVudHJ5UG9pbnQoZGlybmFtZShwYWNrYWdlSnNvblBhdGgpLCBlbnRyeVBvaW50UGF0aCwgZHRzRW50cnlQb2ludFBhdGgpO1xuICAgICAgfSlcbiAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgICByZXR1cm4gZW50cnlQb2ludHM7XG59XG4iXX0=