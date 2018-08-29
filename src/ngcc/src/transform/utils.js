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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3RyYW5zZm9ybS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHlCQUFnQztJQUNoQyw2QkFBZ0Q7SUFDaEQsbUNBQTZCO0lBRTdCLGtFQUFtQztJQUVuQzs7Ozs7O09BTUc7SUFDSDtRQUtFOzs7O1dBSUc7UUFDSCxvQkFBWSxXQUFtQixFQUFFLGlCQUF5QixFQUFFLG9CQUE0QjtZQUN0RixJQUFJLENBQUMsYUFBYSxHQUFHLGNBQU8sQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsU0FBUyxHQUFHLGNBQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDN0MsSUFBTSxnQkFBZ0IsR0FBRyxjQUFPLENBQUMsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLFlBQVksR0FBRyxjQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQ0gsaUJBQUM7SUFBRCxDQUFDLEFBaEJELElBZ0JDO0lBaEJZLGdDQUFVO0lBa0J2Qjs7T0FFRztJQUNILElBQU0sa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7SUFFOUM7O09BRUc7SUFDSCxJQUFNLGtCQUFrQixHQUFHLHdCQUF3QixDQUFDO0lBRXBEOzs7OztPQUtHO0lBQ0gsU0FBZ0IsdUJBQXVCLENBQUMsYUFBcUI7UUFDM0QsaUdBQWlHO1FBQ2pHLDBGQUEwRjtRQUMxRixJQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FDZixVQUFBLElBQUksSUFBSSxPQUFBLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDakMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsRUFEdEQsQ0FDc0QsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFQRCwwREFPQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixjQUFjLENBQUMsZ0JBQXdCLEVBQUUsTUFBYztRQUNyRSxJQUFNLGdCQUFnQixHQUFHLHVCQUF1QixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbkUsSUFBTSxXQUFXLEdBQ2IsZ0JBQWdCO2FBQ1gsR0FBRyxDQUFDLFVBQUEsZUFBZTtZQUNsQixJQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQVksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoRixJQUFNLGNBQWMsR0FBcUIscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDbkIsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxJQUFNLGlCQUFpQixHQUFHLHFCQUFxQixDQUFDLE9BQU8sSUFBSSxjQUFjLENBQUM7WUFDMUUsT0FBTyxJQUFJLFVBQVUsQ0FBQyxjQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDckYsQ0FBQyxDQUFDO2FBQ0QsTUFBTSxDQUFDLGlCQUFTLENBQUMsQ0FBQztRQUMzQixPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBZkQsd0NBZUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge2Rpcm5hbWUsIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICdwYXRoJztcbmltcG9ydCB7ZmluZH0gZnJvbSAnc2hlbGxqcyc7XG5cbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBlbnRyeSBwb2ludCB0byBhIHBhY2thZ2Ugb3Igc3ViLXBhY2thZ2UuXG4gKlxuICogSXQgZXhwb3NlcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgZW50cnkgcG9pbnQgZmlsZSBhbmQgYSBtZXRob2QgdG8gZ2V0IHRoZSBgLmQudHNgIGZpbGUgdGhhdFxuICogY29ycmVzcG9uZHMgdG8gYW55IHNvdXJjZSBmaWxlIHRoYXQgYmVsb25ncyB0byB0aGUgcGFja2FnZSAoYXNzdW1pbmcgc291cmNlIGZpbGVzIGFuZCBgLmQudHNgXG4gKiBmaWxlcyBoYXZlIHRoZSBzYW1lIGRpcmVjdG9yeSBsYXlvdXQpLlxuICovXG5leHBvcnQgY2xhc3MgRW50cnlQb2ludCB7XG4gIGVudHJ5RmlsZU5hbWU6IHN0cmluZztcbiAgZW50cnlSb290OiBzdHJpbmc7XG4gIGR0c0VudHJ5Um9vdDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gcGFja2FnZVJvb3QgVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHJvb3QgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2UuXG4gICAqIEBwYXJhbSByZWxhdGl2ZUVudHJ5UGF0aCBUaGUgcmVsYXRpdmUgcGF0aCB0byB0aGUgZW50cnkgcG9pbnQgZmlsZS5cbiAgICogQHBhcmFtIHJlbGF0aXZlRHRzRW50cnlQYXRoIFRoZSByZWxhdGl2ZSBwYXRoIHRvIHRoZSBgLmQudHNgIGVudHJ5IHBvaW50IGZpbGUuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihwYWNrYWdlUm9vdDogc3RyaW5nLCByZWxhdGl2ZUVudHJ5UGF0aDogc3RyaW5nLCByZWxhdGl2ZUR0c0VudHJ5UGF0aDogc3RyaW5nKSB7XG4gICAgdGhpcy5lbnRyeUZpbGVOYW1lID0gcmVzb2x2ZShwYWNrYWdlUm9vdCwgcmVsYXRpdmVFbnRyeVBhdGgpO1xuICAgIHRoaXMuZW50cnlSb290ID0gZGlybmFtZSh0aGlzLmVudHJ5RmlsZU5hbWUpO1xuICAgIGNvbnN0IGR0c0VudHJ5RmlsZU5hbWUgPSByZXNvbHZlKHBhY2thZ2VSb290LCByZWxhdGl2ZUR0c0VudHJ5UGF0aCk7XG4gICAgdGhpcy5kdHNFbnRyeVJvb3QgPSBkaXJuYW1lKGR0c0VudHJ5RmlsZU5hbWUpO1xuICB9XG59XG5cbi8qKlxuICogTWF0Y2ggcGF0aHMgdG8gYHBhY2thZ2UuanNvbmAgZmlsZXMuXG4gKi9cbmNvbnN0IFBBQ0tBR0VfSlNPTl9SRUdFWCA9IC9cXC9wYWNrYWdlXFwuanNvbiQvO1xuXG4vKipcbiAqIE1hdGNoIHBhdGhzIHRoYXQgaGF2ZSBhIGBub2RlX21vZHVsZXNgIHNlZ21lbnQgYXQgdGhlIHN0YXJ0IG9yIGluIHRoZSBtaWRkbGUuXG4gKi9cbmNvbnN0IE5PREVfTU9EVUxFU19SRUdFWCA9IC8oPzpefFxcLylub2RlX21vZHVsZXNcXC8vO1xuXG4vKipcbiAqIFNlYXJjaCB0aGUgYHJvb3REaXJlY3RvcnlgIGFuZCBpdHMgc3ViZGlyZWN0b3JpZXMgdG8gZmluZCBgcGFja2FnZS5qc29uYCBmaWxlcy5cbiAqIEl0IGlnbm9yZXMgbm9kZSBkZXBlbmRlbmNpZXMsIGkuZS4gdGhvc2UgdW5kZXIgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3JpZXMuXG4gKlxuICogQHBhcmFtIHJvb3REaXJlY3RvcnkgVGhlIGRpcmVjdG9yeSBpbiB3aGljaCB3ZSBzaG91bGQgc2VhcmNoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbFBhY2thZ2VKc29uRmlsZXMocm9vdERpcmVjdG9yeTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAvLyBUT0RPKGdrYWxwYWspOiBJbnZlc3RpZ2F0ZSB3aGV0aGVyIHNraXBwaW5nIGBub2RlX21vZHVsZXMvYCBkaXJlY3RvcmllcyAoaW5zdGVhZCBvZiB0cmF2ZXJzaW5nXG4gIC8vICAgICAgICAgICAgICAgIHRoZW0gYW5kIGZpbHRlcmluZyBvdXQgdGhlIHJlc3VsdHMgbGF0ZXIpIG1ha2VzIGEgbm90aWNlYWJsZSBkaWZmZXJlbmNlLlxuICBjb25zdCBwYXRocyA9IEFycmF5LmZyb20oZmluZChyb290RGlyZWN0b3J5KSk7XG4gIHJldHVybiBwYXRocy5maWx0ZXIoXG4gICAgICBwYXRoID0+IFBBQ0tBR0VfSlNPTl9SRUdFWC50ZXN0KHBhdGgpICYmXG4gICAgICAgICAgIU5PREVfTU9EVUxFU19SRUdFWC50ZXN0KHBhdGguc2xpY2Uocm9vdERpcmVjdG9yeS5sZW5ndGgpKSk7XG59XG5cbi8qKlxuICogSWRlbnRpZnkgdGhlIGVudHJ5IHBvaW50cyBvZiBhIHBhY2thZ2UuXG4gKlxuICogQHBhcmFtIHBhY2thZ2VEaXJlY3RvcnkgVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHJvb3QgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2UuXG4gKiBAcGFyYW0gZm9ybWF0IFRoZSBmb3JtYXQgb2YgdGhlIGVudHJ5IHBvaW50cyB0byBsb29rIGZvciB3aXRoaW4gdGhlIHBhY2thZ2UuXG4gKlxuICogQHJldHVybnMgQSBjb2xsZWN0aW9uIG9mIGBFbnRyeVBvaW50YHMgdGhhdCBjb3JyZXNwb25kIHRvIGVudHJ5IHBvaW50cyBmb3IgdGhlIHBhY2thZ2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnRyeVBvaW50cyhwYWNrYWdlRGlyZWN0b3J5OiBzdHJpbmcsIGZvcm1hdDogc3RyaW5nKTogRW50cnlQb2ludFtdIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRocyA9IGZpbmRBbGxQYWNrYWdlSnNvbkZpbGVzKHBhY2thZ2VEaXJlY3RvcnkpO1xuICBjb25zdCBlbnRyeVBvaW50cyA9XG4gICAgICBwYWNrYWdlSnNvblBhdGhzXG4gICAgICAgICAgLm1hcChwYWNrYWdlSnNvblBhdGggPT4ge1xuICAgICAgICAgICAgY29uc3QgZW50cnlQb2ludFBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGFja2FnZUpzb25QYXRoLCAndXRmOCcpKTtcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5UG9pbnRQYXRoOiBzdHJpbmd8dW5kZWZpbmVkID0gZW50cnlQb2ludFBhY2thZ2VKc29uW2Zvcm1hdF07XG4gICAgICAgICAgICBpZiAoIWVudHJ5UG9pbnRQYXRoKSB7XG4gICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBkdHNFbnRyeVBvaW50UGF0aCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi50eXBpbmdzIHx8IGVudHJ5UG9pbnRQYXRoO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBFbnRyeVBvaW50KGRpcm5hbWUocGFja2FnZUpzb25QYXRoKSwgZW50cnlQb2ludFBhdGgsIGR0c0VudHJ5UG9pbnRQYXRoKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5maWx0ZXIoaXNEZWZpbmVkKTtcbiAgcmV0dXJuIGVudHJ5UG9pbnRzO1xufVxuIl19