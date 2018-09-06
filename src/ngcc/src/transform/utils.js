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
    exports.NGCC_VERSION = '7.0.0-beta.5';
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
            return new EntryPoint(path_1.dirname(packageJsonPath), entryPointPath, dtsEntryPointPath);
        })
            .filter(utils_1.isDefined);
        return entryPoints;
    }
    exports.getEntryPoints = getEntryPoints;
    function getMarkerPath(packageJsonPath, format) {
        return path_1.resolve(path_1.dirname(packageJsonPath), "__modified_by_ngcc_for_" + format + "__");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3RyYW5zZm9ybS91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHlCQUEyRDtJQUMzRCw2QkFBc0M7SUFDdEMsbUNBQTZCO0lBRTdCLGtFQUFtQztJQUV0QixRQUFBLFlBQVksR0FBRyxtQkFBbUIsQ0FBQztJQUVoRDs7Ozs7O09BTUc7SUFDSDtRQUtFOzs7O1dBSUc7UUFDSCxvQkFBbUIsV0FBbUIsRUFBRSxpQkFBeUIsRUFBRSxvQkFBNEI7WUFBNUUsZ0JBQVcsR0FBWCxXQUFXLENBQVE7WUFDcEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxjQUFPLENBQUMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxjQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdDLElBQU0sZ0JBQWdCLEdBQUcsY0FBTyxDQUFDLFdBQVcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxZQUFZLEdBQUcsY0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUNILGlCQUFDO0lBQUQsQ0FBQyxBQWhCRCxJQWdCQztJQWhCWSxnQ0FBVTtJQWtCdkI7O09BRUc7SUFDSCxJQUFNLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDO0lBRTlDOztPQUVHO0lBQ0gsSUFBTSxrQkFBa0IsR0FBRyx3QkFBd0IsQ0FBQztJQUVwRDs7Ozs7T0FLRztJQUNILFNBQWdCLHVCQUF1QixDQUFDLGFBQXFCO1FBQzNELGlHQUFpRztRQUNqRywwRkFBMEY7UUFDMUYsSUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUM5QyxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQ2YsVUFBQSxJQUFJLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ2pDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBRHRELENBQ3NELENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBUEQsMERBT0M7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsU0FBZ0IsY0FBYyxDQUFDLGdCQUEwQixFQUFFLE1BQWM7UUFDdkUsSUFBTSxXQUFXLEdBQ2IsZ0JBQWdCO2FBQ1gsR0FBRyxDQUFDLFVBQUEsZUFBZTtZQUNsQixJQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQVksQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoRixJQUFNLGNBQWMsR0FBcUIscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDbkIsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxJQUFNLGlCQUFpQixHQUFHLHFCQUFxQixDQUFDLE9BQU8sSUFBSSxjQUFjLENBQUM7WUFDMUUsT0FBTyxJQUFJLFVBQVUsQ0FBQyxjQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDckYsQ0FBQyxDQUFDO2FBQ0QsTUFBTSxDQUFDLGlCQUFTLENBQUMsQ0FBQztRQUMzQixPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBZEQsd0NBY0M7SUFFRCxTQUFTLGFBQWEsQ0FBQyxlQUF1QixFQUFFLE1BQWM7UUFDNUQsT0FBTyxjQUFPLENBQUMsY0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLDRCQUEwQixNQUFNLE9BQUksQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRCxTQUFnQixlQUFlLENBQUMsZUFBdUIsRUFBRSxNQUFjO1FBQ3JFLElBQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUQsSUFBTSxZQUFZLEdBQUcsZUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVDLElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQU0sZUFBZSxHQUFHLGlCQUFZLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3pELElBQUksZUFBZSxLQUFLLG9CQUFZLEVBQUU7Z0JBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQ1gsNERBQTREO29CQUM1RCx3REFBd0QsQ0FBQyxDQUFDO2FBQy9EO1NBQ0Y7UUFDRCxPQUFPLFlBQVksQ0FBQztJQUN0QixDQUFDO0lBWkQsMENBWUM7SUFFRCxTQUFnQixlQUFlLENBQUMsZUFBdUIsRUFBRSxNQUFjO1FBQ3JFLElBQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUQsa0JBQWEsQ0FBQyxVQUFVLEVBQUUsb0JBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBSEQsMENBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7ZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge2Rpcm5hbWUsIHJlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtmaW5kfSBmcm9tICdzaGVsbGpzJztcblxuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGNvbnN0IE5HQ0NfVkVSU0lPTiA9ICcwLjAuMC1QTEFDRUhPTERFUic7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBlbnRyeSBwb2ludCB0byBhIHBhY2thZ2Ugb3Igc3ViLXBhY2thZ2UuXG4gKlxuICogSXQgZXhwb3NlcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgZW50cnkgcG9pbnQgZmlsZSBhbmQgYSBtZXRob2QgdG8gZ2V0IHRoZSBgLmQudHNgIGZpbGUgdGhhdFxuICogY29ycmVzcG9uZHMgdG8gYW55IHNvdXJjZSBmaWxlIHRoYXQgYmVsb25ncyB0byB0aGUgcGFja2FnZSAoYXNzdW1pbmcgc291cmNlIGZpbGVzIGFuZCBgLmQudHNgXG4gKiBmaWxlcyBoYXZlIHRoZSBzYW1lIGRpcmVjdG9yeSBsYXlvdXQpLlxuICovXG5leHBvcnQgY2xhc3MgRW50cnlQb2ludCB7XG4gIGVudHJ5RmlsZU5hbWU6IHN0cmluZztcbiAgZW50cnlSb290OiBzdHJpbmc7XG4gIGR0c0VudHJ5Um9vdDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBAcGFyYW0gcGFja2FnZVJvb3QgVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHJvb3QgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2UuXG4gICAqIEBwYXJhbSByZWxhdGl2ZUVudHJ5UGF0aCBUaGUgcmVsYXRpdmUgcGF0aCB0byB0aGUgZW50cnkgcG9pbnQgZmlsZS5cbiAgICogQHBhcmFtIHJlbGF0aXZlRHRzRW50cnlQYXRoIFRoZSByZWxhdGl2ZSBwYXRoIHRvIHRoZSBgLmQudHNgIGVudHJ5IHBvaW50IGZpbGUuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcGFja2FnZVJvb3Q6IHN0cmluZywgcmVsYXRpdmVFbnRyeVBhdGg6IHN0cmluZywgcmVsYXRpdmVEdHNFbnRyeVBhdGg6IHN0cmluZykge1xuICAgIHRoaXMuZW50cnlGaWxlTmFtZSA9IHJlc29sdmUocGFja2FnZVJvb3QsIHJlbGF0aXZlRW50cnlQYXRoKTtcbiAgICB0aGlzLmVudHJ5Um9vdCA9IGRpcm5hbWUodGhpcy5lbnRyeUZpbGVOYW1lKTtcbiAgICBjb25zdCBkdHNFbnRyeUZpbGVOYW1lID0gcmVzb2x2ZShwYWNrYWdlUm9vdCwgcmVsYXRpdmVEdHNFbnRyeVBhdGgpO1xuICAgIHRoaXMuZHRzRW50cnlSb290ID0gZGlybmFtZShkdHNFbnRyeUZpbGVOYW1lKTtcbiAgfVxufVxuXG4vKipcbiAqIE1hdGNoIHBhdGhzIHRvIGBwYWNrYWdlLmpzb25gIGZpbGVzLlxuICovXG5jb25zdCBQQUNLQUdFX0pTT05fUkVHRVggPSAvXFwvcGFja2FnZVxcLmpzb24kLztcblxuLyoqXG4gKiBNYXRjaCBwYXRocyB0aGF0IGhhdmUgYSBgbm9kZV9tb2R1bGVzYCBzZWdtZW50IGF0IHRoZSBzdGFydCBvciBpbiB0aGUgbWlkZGxlLlxuICovXG5jb25zdCBOT0RFX01PRFVMRVNfUkVHRVggPSAvKD86XnxcXC8pbm9kZV9tb2R1bGVzXFwvLztcblxuLyoqXG4gKiBTZWFyY2ggdGhlIGByb290RGlyZWN0b3J5YCBhbmQgaXRzIHN1YmRpcmVjdG9yaWVzIHRvIGZpbmQgYHBhY2thZ2UuanNvbmAgZmlsZXMuXG4gKiBJdCBpZ25vcmVzIG5vZGUgZGVwZW5kZW5jaWVzLCBpLmUuIHRob3NlIHVuZGVyIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yaWVzLlxuICpcbiAqIEBwYXJhbSByb290RGlyZWN0b3J5IFRoZSBkaXJlY3RvcnkgaW4gd2hpY2ggd2Ugc2hvdWxkIHNlYXJjaC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlSnNvbkZpbGVzKHJvb3REaXJlY3Rvcnk6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgLy8gVE9ETyhna2FscGFrKTogSW52ZXN0aWdhdGUgd2hldGhlciBza2lwcGluZyBgbm9kZV9tb2R1bGVzL2AgZGlyZWN0b3JpZXMgKGluc3RlYWQgb2YgdHJhdmVyc2luZ1xuICAvLyAgICAgICAgICAgICAgICB0aGVtIGFuZCBmaWx0ZXJpbmcgb3V0IHRoZSByZXN1bHRzIGxhdGVyKSBtYWtlcyBhIG5vdGljZWFibGUgZGlmZmVyZW5jZS5cbiAgY29uc3QgcGF0aHMgPSBBcnJheS5mcm9tKGZpbmQocm9vdERpcmVjdG9yeSkpO1xuICByZXR1cm4gcGF0aHMuZmlsdGVyKFxuICAgICAgcGF0aCA9PiBQQUNLQUdFX0pTT05fUkVHRVgudGVzdChwYXRoKSAmJlxuICAgICAgICAgICFOT0RFX01PRFVMRVNfUkVHRVgudGVzdChwYXRoLnNsaWNlKHJvb3REaXJlY3RvcnkubGVuZ3RoKSkpO1xufVxuXG4vKipcbiAqIElkZW50aWZ5IHRoZSBlbnRyeSBwb2ludHMgb2YgYSBjb2xsZWN0aW9uIG9mIHBhY2thZ2UuanNvbiBmaWxlcy5cbiAqXG4gKiBAcGFyYW0gcGFja2FnZUpzb25QYXRocyBBIGNvbGxlY3Rpb24gb2YgYWJzb2x1dGUgcGF0aHMgdG8gdGhlIHBhY2thZ2UuanNvbiBmaWxlcy5cbiAqIEBwYXJhbSBmb3JtYXQgVGhlIGZvcm1hdCBvZiB0aGUgZW50cnkgcG9pbnRzIHRvIGxvb2sgZm9yIHdpdGhpbiB0aGUgcGFja2FnZS5cbiAqXG4gKiBAcmV0dXJucyBBIGNvbGxlY3Rpb24gb2YgYEVudHJ5UG9pbnRgcyB0aGF0IGNvcnJlc3BvbmQgdG8gZW50cnkgcG9pbnRzIGZvciB0aGUgcGFja2FnZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudHJ5UG9pbnRzKHBhY2thZ2VKc29uUGF0aHM6IHN0cmluZ1tdLCBmb3JtYXQ6IHN0cmluZyk6IEVudHJ5UG9pbnRbXSB7XG4gIGNvbnN0IGVudHJ5UG9pbnRzID1cbiAgICAgIHBhY2thZ2VKc29uUGF0aHNcbiAgICAgICAgICAubWFwKHBhY2thZ2VKc29uUGF0aCA9PiB7XG4gICAgICAgICAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuICAgICAgICAgICAgY29uc3QgZW50cnlQb2ludFBhdGg6IHN0cmluZ3x1bmRlZmluZWQgPSBlbnRyeVBvaW50UGFja2FnZUpzb25bZm9ybWF0XTtcbiAgICAgICAgICAgIGlmICghZW50cnlQb2ludFBhdGgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGR0c0VudHJ5UG9pbnRQYXRoID0gZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGluZ3MgfHwgZW50cnlQb2ludFBhdGg7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEVudHJ5UG9pbnQoZGlybmFtZShwYWNrYWdlSnNvblBhdGgpLCBlbnRyeVBvaW50UGF0aCwgZHRzRW50cnlQb2ludFBhdGgpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpO1xuICByZXR1cm4gZW50cnlQb2ludHM7XG59XG5cbmZ1bmN0aW9uIGdldE1hcmtlclBhdGgocGFja2FnZUpzb25QYXRoOiBzdHJpbmcsIGZvcm1hdDogc3RyaW5nKSB7XG4gIHJldHVybiByZXNvbHZlKGRpcm5hbWUocGFja2FnZUpzb25QYXRoKSwgYF9fbW9kaWZpZWRfYnlfbmdjY19mb3JfJHtmb3JtYXR9X19gKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrTWFya2VyRmlsZShwYWNrYWdlSnNvblBhdGg6IHN0cmluZywgZm9ybWF0OiBzdHJpbmcpIHtcbiAgY29uc3QgbWFya2VyUGF0aCA9IGdldE1hcmtlclBhdGgocGFja2FnZUpzb25QYXRoLCBmb3JtYXQpO1xuICBjb25zdCBtYXJrZXJFeGlzdHMgPSBleGlzdHNTeW5jKG1hcmtlclBhdGgpO1xuICBpZiAobWFya2VyRXhpc3RzKSB7XG4gICAgY29uc3QgcHJldmlvdXNWZXJzaW9uID0gcmVhZEZpbGVTeW5jKG1hcmtlclBhdGgsICd1dGY4Jyk7XG4gICAgaWYgKHByZXZpb3VzVmVyc2lvbiAhPT0gTkdDQ19WRVJTSU9OKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1RoZSBuZ2NjIGNvbXBpbGVyIGhhcyBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IG5nY2MgYnVpbGQuXFxuJyArXG4gICAgICAgICAgJ1BsZWFzZSBjb21wbGV0ZWx5IHJlbW92ZSBgbm9kZV9tb2R1bGVzYCBhbmQgdHJ5IGFnYWluLicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbWFya2VyRXhpc3RzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVNYXJrZXJGaWxlKHBhY2thZ2VKc29uUGF0aDogc3RyaW5nLCBmb3JtYXQ6IHN0cmluZykge1xuICBjb25zdCBtYXJrZXJQYXRoID0gZ2V0TWFya2VyUGF0aChwYWNrYWdlSnNvblBhdGgsIGZvcm1hdCk7XG4gIHdyaXRlRmlsZVN5bmMobWFya2VyUGF0aCwgTkdDQ19WRVJTSU9OLCAndXRmOCcpO1xufSJdfQ==