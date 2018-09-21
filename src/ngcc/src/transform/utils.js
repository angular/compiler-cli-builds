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
        define("@angular/compiler-cli/src/ngcc/src/transform/utils", ["require", "exports", "canonical-path", "fs", "shelljs", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var canonical_path_1 = require("canonical-path");
    var fs_1 = require("fs");
    var shelljs_1 = require("shelljs");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    exports.NGCC_VERSION = '7.0.0-beta.6+33.sha-026b60c';
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
            this.packageRoot = packageRoot;
            this.entryFileName = canonical_path_1.resolve(packageRoot, relativeEntryPath);
            this.entryRoot = canonical_path_1.dirname(this.entryFileName);
            var dtsEntryFileName = canonical_path_1.resolve(packageRoot, relativeDtsEntryPath);
            this.dtsEntryRoot = canonical_path_1.dirname(dtsEntryFileName);
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
     * Identify the entry points of a collection of package.json files.
     *
     * @param packageJsonPaths A collection of absolute paths to the package.json files.
     * @param format The format of the entry points to look for within the package.
     *
     * @returns A collection of `EntryPoint`s that correspond to entry points for the package.
     */
    function getEntryPoints(packageJsonPaths, format) {
        var entryPoints = packageJsonPaths
            .map(function (packageJsonPath) {
            var entryPointPackageJson = JSON.parse(fs_1.readFileSync(packageJsonPath, 'utf8'));
            var entryPointPath = entryPointPackageJson[format];
            if (!entryPointPath) {
                return undefined;
            }
            var dtsEntryPointPath = entryPointPackageJson.typings || entryPointPath;
            return new EntryPoint(canonical_path_1.dirname(packageJsonPath), entryPointPath, dtsEntryPointPath);
        })
            .filter(utils_1.isDefined);
        return entryPoints;
    }
    exports.getEntryPoints = getEntryPoints;
    function getMarkerPath(packageJsonPath, format) {
        return canonical_path_1.resolve(canonical_path_1.dirname(packageJsonPath), "__modified_by_ngcc_for_" + format + "__");
    }
    function checkMarkerFile(packageJsonPath, format) {
        var markerPath = getMarkerPath(packageJsonPath, format);
        var markerExists = fs_1.existsSync(markerPath);
        if (markerExists) {
            var previousVersion = fs_1.readFileSync(markerPath, 'utf8');
            if (previousVersion !== exports.NGCC_VERSION) {
                throw new Error('The ngcc compiler has changed since the last ngcc build.\n' +
                    'Please completely remove `node_modules` and try again.');
            }
        }
        return markerExists;
    }
    exports.checkMarkerFile = checkMarkerFile;
    function writeMarkerFile(packageJsonPath, format) {
        var markerPath = getMarkerPath(packageJsonPath, format);
        fs_1.writeFileSync(markerPath, exports.NGCC_VERSION, 'utf8');
    }
    exports.writeMarkerFile = writeMarkerFile;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3RyYW5zZm9ybS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILGlEQUFnRDtJQUNoRCx5QkFBMkQ7SUFDM0QsbUNBQTZCO0lBRTdCLGtFQUFtQztJQUV0QixRQUFBLFlBQVksR0FBRyxtQkFBbUIsQ0FBQztJQUVoRDs7Ozs7O09BTUc7SUFDSDtRQUtFOzs7O1dBSUc7UUFDSCxvQkFBbUIsV0FBbUIsRUFBRSxpQkFBeUIsRUFBRSxvQkFBNEI7WUFBNUUsZ0JBQVcsR0FBWCxXQUFXLENBQVE7WUFDcEMsSUFBSSxDQUFDLGFBQWEsR0FBRyx3QkFBTyxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLEdBQUcsd0JBQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDN0MsSUFBTSxnQkFBZ0IsR0FBRyx3QkFBTyxDQUFDLFdBQVcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxZQUFZLEdBQUcsd0JBQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFDSCxpQkFBQztJQUFELENBQUMsQUFoQkQsSUFnQkM7SUFoQlksZ0NBQVU7SUFrQnZCOztPQUVHO0lBQ0gsSUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztJQUU5Qzs7T0FFRztJQUNILElBQU0sa0JBQWtCLEdBQUcsd0JBQXdCLENBQUM7SUFFcEQ7Ozs7O09BS0c7SUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxhQUFxQjtRQUMzRCxpR0FBaUc7UUFDakcsMEZBQTBGO1FBQzFGLElBQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDOUMsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUNmLFVBQUEsSUFBSSxJQUFJLE9BQUEsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNqQyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUR0RCxDQUNzRCxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQVBELDBEQU9DO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLGNBQWMsQ0FBQyxnQkFBMEIsRUFBRSxNQUFjO1FBQ3ZFLElBQU0sV0FBVyxHQUNiLGdCQUFnQjthQUNYLEdBQUcsQ0FBQyxVQUFBLGVBQWU7WUFDbEIsSUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEYsSUFBTSxjQUFjLEdBQXFCLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ25CLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxpQkFBaUIsR0FBRyxxQkFBcUIsQ0FBQyxPQUFPLElBQUksY0FBYyxDQUFDO1lBQzFFLE9BQU8sSUFBSSxVQUFVLENBQUMsd0JBQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNyRixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsaUJBQVMsQ0FBQyxDQUFDO1FBQzNCLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFkRCx3Q0FjQztJQUVELFNBQVMsYUFBYSxDQUFDLGVBQXVCLEVBQUUsTUFBYztRQUM1RCxPQUFPLHdCQUFPLENBQUMsd0JBQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSw0QkFBMEIsTUFBTSxPQUFJLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBRUQsU0FBZ0IsZUFBZSxDQUFDLGVBQXVCLEVBQUUsTUFBYztRQUNyRSxJQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFELElBQU0sWUFBWSxHQUFHLGVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QyxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFNLGVBQWUsR0FBRyxpQkFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN6RCxJQUFJLGVBQWUsS0FBSyxvQkFBWSxFQUFFO2dCQUNwQyxNQUFNLElBQUksS0FBSyxDQUNYLDREQUE0RDtvQkFDNUQsd0RBQXdELENBQUMsQ0FBQzthQUMvRDtTQUNGO1FBQ0QsT0FBTyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQVpELDBDQVlDO0lBRUQsU0FBZ0IsZUFBZSxDQUFDLGVBQXVCLEVBQUUsTUFBYztRQUNyRSxJQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFELGtCQUFhLENBQUMsVUFBVSxFQUFFLG9CQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUhELDBDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2Rpcm5hbWUsIHJlc29sdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7ZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge2ZpbmR9IGZyb20gJ3NoZWxsanMnO1xuXG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgY29uc3QgTkdDQ19WRVJTSU9OID0gJzAuMC4wLVBMQUNFSE9MREVSJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGVudHJ5IHBvaW50IHRvIGEgcGFja2FnZSBvciBzdWItcGFja2FnZS5cbiAqXG4gKiBJdCBleHBvc2VzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBlbnRyeSBwb2ludCBmaWxlIGFuZCBhIG1ldGhvZCB0byBnZXQgdGhlIGAuZC50c2AgZmlsZSB0aGF0XG4gKiBjb3JyZXNwb25kcyB0byBhbnkgc291cmNlIGZpbGUgdGhhdCBiZWxvbmdzIHRvIHRoZSBwYWNrYWdlIChhc3N1bWluZyBzb3VyY2UgZmlsZXMgYW5kIGAuZC50c2BcbiAqIGZpbGVzIGhhdmUgdGhlIHNhbWUgZGlyZWN0b3J5IGxheW91dCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbnRyeVBvaW50IHtcbiAgZW50cnlGaWxlTmFtZTogc3RyaW5nO1xuICBlbnRyeVJvb3Q6IHN0cmluZztcbiAgZHRzRW50cnlSb290OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBwYWNrYWdlUm9vdCBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBkaXJlY3RvcnkgdGhhdCBjb250YWlucyB0aGUgcGFja2FnZS5cbiAgICogQHBhcmFtIHJlbGF0aXZlRW50cnlQYXRoIFRoZSByZWxhdGl2ZSBwYXRoIHRvIHRoZSBlbnRyeSBwb2ludCBmaWxlLlxuICAgKiBAcGFyYW0gcmVsYXRpdmVEdHNFbnRyeVBhdGggVGhlIHJlbGF0aXZlIHBhdGggdG8gdGhlIGAuZC50c2AgZW50cnkgcG9pbnQgZmlsZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYWNrYWdlUm9vdDogc3RyaW5nLCByZWxhdGl2ZUVudHJ5UGF0aDogc3RyaW5nLCByZWxhdGl2ZUR0c0VudHJ5UGF0aDogc3RyaW5nKSB7XG4gICAgdGhpcy5lbnRyeUZpbGVOYW1lID0gcmVzb2x2ZShwYWNrYWdlUm9vdCwgcmVsYXRpdmVFbnRyeVBhdGgpO1xuICAgIHRoaXMuZW50cnlSb290ID0gZGlybmFtZSh0aGlzLmVudHJ5RmlsZU5hbWUpO1xuICAgIGNvbnN0IGR0c0VudHJ5RmlsZU5hbWUgPSByZXNvbHZlKHBhY2thZ2VSb290LCByZWxhdGl2ZUR0c0VudHJ5UGF0aCk7XG4gICAgdGhpcy5kdHNFbnRyeVJvb3QgPSBkaXJuYW1lKGR0c0VudHJ5RmlsZU5hbWUpO1xuICB9XG59XG5cbi8qKlxuICogTWF0Y2ggcGF0aHMgdG8gYHBhY2thZ2UuanNvbmAgZmlsZXMuXG4gKi9cbmNvbnN0IFBBQ0tBR0VfSlNPTl9SRUdFWCA9IC9cXC9wYWNrYWdlXFwuanNvbiQvO1xuXG4vKipcbiAqIE1hdGNoIHBhdGhzIHRoYXQgaGF2ZSBhIGBub2RlX21vZHVsZXNgIHNlZ21lbnQgYXQgdGhlIHN0YXJ0IG9yIGluIHRoZSBtaWRkbGUuXG4gKi9cbmNvbnN0IE5PREVfTU9EVUxFU19SRUdFWCA9IC8oPzpefFxcLylub2RlX21vZHVsZXNcXC8vO1xuXG4vKipcbiAqIFNlYXJjaCB0aGUgYHJvb3REaXJlY3RvcnlgIGFuZCBpdHMgc3ViZGlyZWN0b3JpZXMgdG8gZmluZCBgcGFja2FnZS5qc29uYCBmaWxlcy5cbiAqIEl0IGlnbm9yZXMgbm9kZSBkZXBlbmRlbmNpZXMsIGkuZS4gdGhvc2UgdW5kZXIgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3JpZXMuXG4gKlxuICogQHBhcmFtIHJvb3REaXJlY3RvcnkgVGhlIGRpcmVjdG9yeSBpbiB3aGljaCB3ZSBzaG91bGQgc2VhcmNoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbFBhY2thZ2VKc29uRmlsZXMocm9vdERpcmVjdG9yeTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAvLyBUT0RPKGdrYWxwYWspOiBJbnZlc3RpZ2F0ZSB3aGV0aGVyIHNraXBwaW5nIGBub2RlX21vZHVsZXMvYCBkaXJlY3RvcmllcyAoaW5zdGVhZCBvZiB0cmF2ZXJzaW5nXG4gIC8vICAgICAgICAgICAgICAgIHRoZW0gYW5kIGZpbHRlcmluZyBvdXQgdGhlIHJlc3VsdHMgbGF0ZXIpIG1ha2VzIGEgbm90aWNlYWJsZSBkaWZmZXJlbmNlLlxuICBjb25zdCBwYXRocyA9IEFycmF5LmZyb20oZmluZChyb290RGlyZWN0b3J5KSk7XG4gIHJldHVybiBwYXRocy5maWx0ZXIoXG4gICAgICBwYXRoID0+IFBBQ0tBR0VfSlNPTl9SRUdFWC50ZXN0KHBhdGgpICYmXG4gICAgICAgICAgIU5PREVfTU9EVUxFU19SRUdFWC50ZXN0KHBhdGguc2xpY2Uocm9vdERpcmVjdG9yeS5sZW5ndGgpKSk7XG59XG5cbi8qKlxuICogSWRlbnRpZnkgdGhlIGVudHJ5IHBvaW50cyBvZiBhIGNvbGxlY3Rpb24gb2YgcGFja2FnZS5qc29uIGZpbGVzLlxuICpcbiAqIEBwYXJhbSBwYWNrYWdlSnNvblBhdGhzIEEgY29sbGVjdGlvbiBvZiBhYnNvbHV0ZSBwYXRocyB0byB0aGUgcGFja2FnZS5qc29uIGZpbGVzLlxuICogQHBhcmFtIGZvcm1hdCBUaGUgZm9ybWF0IG9mIHRoZSBlbnRyeSBwb2ludHMgdG8gbG9vayBmb3Igd2l0aGluIHRoZSBwYWNrYWdlLlxuICpcbiAqIEByZXR1cm5zIEEgY29sbGVjdGlvbiBvZiBgRW50cnlQb2ludGBzIHRoYXQgY29ycmVzcG9uZCB0byBlbnRyeSBwb2ludHMgZm9yIHRoZSBwYWNrYWdlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludHMocGFja2FnZUpzb25QYXRoczogc3RyaW5nW10sIGZvcm1hdDogc3RyaW5nKTogRW50cnlQb2ludFtdIHtcbiAgY29uc3QgZW50cnlQb2ludHMgPVxuICAgICAgcGFja2FnZUpzb25QYXRoc1xuICAgICAgICAgIC5tYXAocGFja2FnZUpzb25QYXRoID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uUGF0aCwgJ3V0ZjgnKSk7XG4gICAgICAgICAgICBjb25zdCBlbnRyeVBvaW50UGF0aDogc3RyaW5nfHVuZGVmaW5lZCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltmb3JtYXRdO1xuICAgICAgICAgICAgaWYgKCFlbnRyeVBvaW50UGF0aCkge1xuICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZHRzRW50cnlQb2ludFBhdGggPSBlbnRyeVBvaW50UGFja2FnZUpzb24udHlwaW5ncyB8fCBlbnRyeVBvaW50UGF0aDtcbiAgICAgICAgICAgIHJldHVybiBuZXcgRW50cnlQb2ludChkaXJuYW1lKHBhY2thZ2VKc29uUGF0aCksIGVudHJ5UG9pbnRQYXRoLCBkdHNFbnRyeVBvaW50UGF0aCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZmlsdGVyKGlzRGVmaW5lZCk7XG4gIHJldHVybiBlbnRyeVBvaW50cztcbn1cblxuZnVuY3Rpb24gZ2V0TWFya2VyUGF0aChwYWNrYWdlSnNvblBhdGg6IHN0cmluZywgZm9ybWF0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIHJlc29sdmUoZGlybmFtZShwYWNrYWdlSnNvblBhdGgpLCBgX19tb2RpZmllZF9ieV9uZ2NjX2Zvcl8ke2Zvcm1hdH1fX2ApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tNYXJrZXJGaWxlKHBhY2thZ2VKc29uUGF0aDogc3RyaW5nLCBmb3JtYXQ6IHN0cmluZykge1xuICBjb25zdCBtYXJrZXJQYXRoID0gZ2V0TWFya2VyUGF0aChwYWNrYWdlSnNvblBhdGgsIGZvcm1hdCk7XG4gIGNvbnN0IG1hcmtlckV4aXN0cyA9IGV4aXN0c1N5bmMobWFya2VyUGF0aCk7XG4gIGlmIChtYXJrZXJFeGlzdHMpIHtcbiAgICBjb25zdCBwcmV2aW91c1ZlcnNpb24gPSByZWFkRmlsZVN5bmMobWFya2VyUGF0aCwgJ3V0ZjgnKTtcbiAgICBpZiAocHJldmlvdXNWZXJzaW9uICE9PSBOR0NDX1ZFUlNJT04pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnVGhlIG5nY2MgY29tcGlsZXIgaGFzIGNoYW5nZWQgc2luY2UgdGhlIGxhc3QgbmdjYyBidWlsZC5cXG4nICtcbiAgICAgICAgICAnUGxlYXNlIGNvbXBsZXRlbHkgcmVtb3ZlIGBub2RlX21vZHVsZXNgIGFuZCB0cnkgYWdhaW4uJyk7XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXJrZXJFeGlzdHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZU1hcmtlckZpbGUocGFja2FnZUpzb25QYXRoOiBzdHJpbmcsIGZvcm1hdDogc3RyaW5nKSB7XG4gIGNvbnN0IG1hcmtlclBhdGggPSBnZXRNYXJrZXJQYXRoKHBhY2thZ2VKc29uUGF0aCwgZm9ybWF0KTtcbiAgd3JpdGVGaWxlU3luYyhtYXJrZXJQYXRoLCBOR0NDX1ZFUlNJT04sICd1dGY4Jyk7XG59Il19