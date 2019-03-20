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
        define("@angular/compiler-cli/ngcc/src/packages/entry_point", ["require", "exports", "canonical-path", "fs", "@angular/compiler-cli/src/ngtsc/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path = require("canonical-path");
    var fs = require("fs");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    // We need to keep the elements of this const and the `EntryPointJsonProperty` type in sync.
    exports.SUPPORTED_FORMAT_PROPERTIES = ['fesm2015', 'fesm5', 'es2015', 'esm2015', 'esm5', 'main', 'module'];
    /**
     * Try to create an entry-point from the given paths and properties.
     *
     * @param packagePath the absolute path to the containing npm package
     * @param entryPointPath the absolute path to the potential entry-point.
     * @returns An entry-point if it is valid, `null` otherwise.
     */
    function getEntryPointInfo(packagePath, entryPointPath) {
        var packageJsonPath = path.resolve(entryPointPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return null;
        }
        var entryPointPackageJson = loadEntryPointPackage(packageJsonPath);
        if (!entryPointPackageJson) {
            return null;
        }
        // We must have a typings property
        var typings = entryPointPackageJson.typings || entryPointPackageJson.types;
        if (!typings) {
            return null;
        }
        // Also there must exist a `metadata.json` file next to the typings entry-point.
        var metadataPath = path.resolve(entryPointPath, typings.replace(/\.d\.ts$/, '') + '.metadata.json');
        if (!fs.existsSync(metadataPath)) {
            return null;
        }
        var entryPointInfo = {
            name: entryPointPackageJson.name,
            packageJson: entryPointPackageJson,
            package: packagePath,
            path: entryPointPath,
            typings: path_1.AbsoluteFsPath.from(path.resolve(entryPointPath, typings)),
        };
        return entryPointInfo;
    }
    exports.getEntryPointInfo = getEntryPointInfo;
    /**
     * Convert a package.json property into an entry-point format.
     *
     * @param property The property to convert to a format.
     * @returns An entry-point format or `undefined` if none match the given property.
     */
    function getEntryPointFormat(property) {
        switch (property) {
            case 'fesm2015':
                return 'esm2015';
            case 'fesm5':
                return 'esm5';
            case 'es2015':
                return 'esm2015';
            case 'esm2015':
                return 'esm2015';
            case 'esm5':
                return 'esm5';
            case 'main':
                return 'umd';
            case 'module':
                return 'esm5';
            default:
                return undefined;
        }
    }
    exports.getEntryPointFormat = getEntryPointFormat;
    /**
     * Parses the JSON from a package.json file.
     * @param packageJsonPath the absolute path to the package.json file.
     * @returns JSON from the package.json file if it is valid, `null` otherwise.
     */
    function loadEntryPointPackage(packageJsonPath) {
        try {
            return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        }
        catch (e) {
            // We may have run into a package.json with unexpected symbols
            console.warn("Failed to read entry point info from " + packageJsonPath + " with error " + e + ".");
            return null;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCxxQ0FBdUM7SUFDdkMsdUJBQXlCO0lBRXpCLDZEQUF1RDtJQThDdkQsNEZBQTRGO0lBQy9FLFFBQUEsMkJBQTJCLEdBQ3BDLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFekU7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLFdBQTJCLEVBQUUsY0FBOEI7UUFDN0QsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDbkMsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQU0scUJBQXFCLEdBQUcscUJBQXFCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1lBQzFCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFHRCxrQ0FBa0M7UUFDbEMsSUFBTSxPQUFPLEdBQUcscUJBQXFCLENBQUMsT0FBTyxJQUFJLHFCQUFxQixDQUFDLEtBQUssQ0FBQztRQUM3RSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELGdGQUFnRjtRQUNoRixJQUFNLFlBQVksR0FDZCxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3JGLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQ2hDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLGNBQWMsR0FBZTtZQUNqQyxJQUFJLEVBQUUscUJBQXFCLENBQUMsSUFBSTtZQUNoQyxXQUFXLEVBQUUscUJBQXFCO1lBQ2xDLE9BQU8sRUFBRSxXQUFXO1lBQ3BCLElBQUksRUFBRSxjQUFjO1lBQ3BCLE9BQU8sRUFBRSxxQkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUNwRSxDQUFDO1FBRUYsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQW5DRCw4Q0FtQ0M7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLFFBQWdCO1FBQ2xELFFBQVEsUUFBUSxFQUFFO1lBQ2hCLEtBQUssVUFBVTtnQkFDYixPQUFPLFNBQVMsQ0FBQztZQUNuQixLQUFLLE9BQU87Z0JBQ1YsT0FBTyxNQUFNLENBQUM7WUFDaEIsS0FBSyxRQUFRO2dCQUNYLE9BQU8sU0FBUyxDQUFDO1lBQ25CLEtBQUssU0FBUztnQkFDWixPQUFPLFNBQVMsQ0FBQztZQUNuQixLQUFLLE1BQU07Z0JBQ1QsT0FBTyxNQUFNLENBQUM7WUFDaEIsS0FBSyxNQUFNO2dCQUNULE9BQU8sS0FBSyxDQUFDO1lBQ2YsS0FBSyxRQUFRO2dCQUNYLE9BQU8sTUFBTSxDQUFDO1lBQ2hCO2dCQUNFLE9BQU8sU0FBUyxDQUFDO1NBQ3BCO0lBQ0gsQ0FBQztJQW5CRCxrREFtQkM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxxQkFBcUIsQ0FBQyxlQUF1QjtRQUNwRCxJQUFJO1lBQ0YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDN0Q7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLDhEQUE4RDtZQUM5RCxPQUFPLENBQUMsSUFBSSxDQUFDLDBDQUF3QyxlQUFlLG9CQUFlLENBQUMsTUFBRyxDQUFDLENBQUM7WUFDekYsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5cblxuLyoqXG4gKiBUaGUgcG9zc2libGUgdmFsdWVzIGZvciB0aGUgZm9ybWF0IG9mIGFuIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgdHlwZSBFbnRyeVBvaW50Rm9ybWF0ID0gJ2VzbTUnIHwgJ2VzbTIwMTUnIHwgJ3VtZCc7XG5cbi8qKlxuICogQW4gb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24gYWJvdXQgYW4gZW50cnktcG9pbnQsIGluY2x1ZGluZyBwYXRoc1xuICogdG8gZWFjaCBvZiB0aGUgcG9zc2libGUgZW50cnktcG9pbnQgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50IHtcbiAgLyoqIFRoZSBuYW1lIG9mIHRoZSBwYWNrYWdlIChlLmcuIGBAYW5ndWxhci9jb3JlYCkuICovXG4gIG5hbWU6IHN0cmluZztcbiAgLyoqIFRoZSBwYXJzZWQgcGFja2FnZS5qc29uIGZpbGUgZm9yIHRoaXMgZW50cnktcG9pbnQuICovXG4gIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb247XG4gIC8qKiBUaGUgcGF0aCB0byB0aGUgcGFja2FnZSB0aGF0IGNvbnRhaW5zIHRoaXMgZW50cnktcG9pbnQuICovXG4gIHBhY2thZ2U6IEFic29sdXRlRnNQYXRoO1xuICAvKiogVGhlIHBhdGggdG8gdGhpcyBlbnRyeSBwb2ludC4gKi9cbiAgcGF0aDogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBUaGUgcGF0aCB0byBhIHR5cGluZ3MgKC5kLnRzKSBmaWxlIGZvciB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICB0eXBpbmdzOiBBYnNvbHV0ZUZzUGF0aDtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyB7XG4gIGZlc20yMDE1Pzogc3RyaW5nO1xuICBmZXNtNT86IHN0cmluZztcbiAgZXMyMDE1Pzogc3RyaW5nOyAgLy8gaWYgZXhpc3RzIHRoZW4gaXQgaXMgYWN0dWFsbHkgRkVTTTIwMTVcbiAgZXNtMjAxNT86IHN0cmluZztcbiAgZXNtNT86IHN0cmluZztcbiAgbWFpbj86IHN0cmluZzsgICAgIC8vIFVNRFxuICBtb2R1bGU/OiBzdHJpbmc7ICAgLy8gaWYgZXhpc3RzIHRoZW4gaXQgaXMgYWN0dWFsbHkgRkVTTTVcbiAgdHlwZXM/OiBzdHJpbmc7ICAgIC8vIFN5bm9ueW1vdXMgdG8gYHR5cGluZ3NgIHByb3BlcnR5IC0gc2VlIGh0dHBzOi8vYml0Lmx5LzJPZ1dwMkhcbiAgdHlwaW5ncz86IHN0cmluZzsgIC8vIFR5cGVTY3JpcHQgLmQudHMgZmlsZXNcbn1cblxuLyoqXG4gKiBUaGUgcHJvcGVydGllcyB0aGF0IG1heSBiZSBsb2FkZWQgZnJvbSB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50UGFja2FnZUpzb24gZXh0ZW5kcyBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXMge1xuICBuYW1lOiBzdHJpbmc7XG4gIF9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18/OiB7W2tleTogc3RyaW5nXTogc3RyaW5nfTtcbn1cblxuZXhwb3J0IHR5cGUgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSA9IGtleW9mKFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyk7XG4vLyBXZSBuZWVkIHRvIGtlZXAgdGhlIGVsZW1lbnRzIG9mIHRoaXMgY29uc3QgYW5kIHRoZSBgRW50cnlQb2ludEpzb25Qcm9wZXJ0eWAgdHlwZSBpbiBzeW5jLlxuZXhwb3J0IGNvbnN0IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUzogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID1cbiAgICBbJ2Zlc20yMDE1JywgJ2Zlc201JywgJ2VzMjAxNScsICdlc20yMDE1JywgJ2VzbTUnLCAnbWFpbicsICdtb2R1bGUnXTtcblxuLyoqXG4gKiBUcnkgdG8gY3JlYXRlIGFuIGVudHJ5LXBvaW50IGZyb20gdGhlIGdpdmVuIHBhdGhzIGFuZCBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSBwYWNrYWdlUGF0aCB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgY29udGFpbmluZyBucG0gcGFja2FnZVxuICogQHBhcmFtIGVudHJ5UG9pbnRQYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwb3RlbnRpYWwgZW50cnktcG9pbnQuXG4gKiBAcmV0dXJucyBBbiBlbnRyeS1wb2ludCBpZiBpdCBpcyB2YWxpZCwgYG51bGxgIG90aGVyd2lzZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudHJ5UG9pbnRJbmZvKFxuICAgIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludHxudWxsIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcGF0aC5yZXNvbHZlKGVudHJ5UG9pbnRQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBsb2FkRW50cnlQb2ludFBhY2thZ2UocGFja2FnZUpzb25QYXRoKTtcbiAgaWYgKCFlbnRyeVBvaW50UGFja2FnZUpzb24pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG5cbiAgLy8gV2UgbXVzdCBoYXZlIGEgdHlwaW5ncyBwcm9wZXJ0eVxuICBjb25zdCB0eXBpbmdzID0gZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGluZ3MgfHwgZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGVzO1xuICBpZiAoIXR5cGluZ3MpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEFsc28gdGhlcmUgbXVzdCBleGlzdCBhIGBtZXRhZGF0YS5qc29uYCBmaWxlIG5leHQgdG8gdGhlIHR5cGluZ3MgZW50cnktcG9pbnQuXG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9XG4gICAgICBwYXRoLnJlc29sdmUoZW50cnlQb2ludFBhdGgsIHR5cGluZ3MucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcnKSArICcubWV0YWRhdGEuanNvbicpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMobWV0YWRhdGFQYXRoKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgZW50cnlQb2ludEluZm86IEVudHJ5UG9pbnQgPSB7XG4gICAgbmFtZTogZW50cnlQb2ludFBhY2thZ2VKc29uLm5hbWUsXG4gICAgcGFja2FnZUpzb246IGVudHJ5UG9pbnRQYWNrYWdlSnNvbixcbiAgICBwYWNrYWdlOiBwYWNrYWdlUGF0aCxcbiAgICBwYXRoOiBlbnRyeVBvaW50UGF0aCxcbiAgICB0eXBpbmdzOiBBYnNvbHV0ZUZzUGF0aC5mcm9tKHBhdGgucmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgdHlwaW5ncykpLFxuICB9O1xuXG4gIHJldHVybiBlbnRyeVBvaW50SW5mbztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcGFja2FnZS5qc29uIHByb3BlcnR5IGludG8gYW4gZW50cnktcG9pbnQgZm9ybWF0LlxuICpcbiAqIEBwYXJhbSBwcm9wZXJ0eSBUaGUgcHJvcGVydHkgdG8gY29udmVydCB0byBhIGZvcm1hdC5cbiAqIEByZXR1cm5zIEFuIGVudHJ5LXBvaW50IGZvcm1hdCBvciBgdW5kZWZpbmVkYCBpZiBub25lIG1hdGNoIHRoZSBnaXZlbiBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudHJ5UG9pbnRGb3JtYXQocHJvcGVydHk6IHN0cmluZyk6IEVudHJ5UG9pbnRGb3JtYXR8dW5kZWZpbmVkIHtcbiAgc3dpdGNoIChwcm9wZXJ0eSkge1xuICAgIGNhc2UgJ2Zlc20yMDE1JzpcbiAgICAgIHJldHVybiAnZXNtMjAxNSc7XG4gICAgY2FzZSAnZmVzbTUnOlxuICAgICAgcmV0dXJuICdlc201JztcbiAgICBjYXNlICdlczIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgIHJldHVybiAnZXNtMjAxNSc7XG4gICAgY2FzZSAnZXNtNSc6XG4gICAgICByZXR1cm4gJ2VzbTUnO1xuICAgIGNhc2UgJ21haW4nOlxuICAgICAgcmV0dXJuICd1bWQnO1xuICAgIGNhc2UgJ21vZHVsZSc6XG4gICAgICByZXR1cm4gJ2VzbTUnO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogUGFyc2VzIHRoZSBKU09OIGZyb20gYSBwYWNrYWdlLmpzb24gZmlsZS5cbiAqIEBwYXJhbSBwYWNrYWdlSnNvblBhdGggdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2UuanNvbiBmaWxlLlxuICogQHJldHVybnMgSlNPTiBmcm9tIHRoZSBwYWNrYWdlLmpzb24gZmlsZSBpZiBpdCBpcyB2YWxpZCwgYG51bGxgIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gbG9hZEVudHJ5UG9pbnRQYWNrYWdlKHBhY2thZ2VKc29uUGF0aDogc3RyaW5nKTogRW50cnlQb2ludFBhY2thZ2VKc29ufG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gV2UgbWF5IGhhdmUgcnVuIGludG8gYSBwYWNrYWdlLmpzb24gd2l0aCB1bmV4cGVjdGVkIHN5bWJvbHNcbiAgICBjb25zb2xlLndhcm4oYEZhaWxlZCB0byByZWFkIGVudHJ5IHBvaW50IGluZm8gZnJvbSAke3BhY2thZ2VKc29uUGF0aH0gd2l0aCBlcnJvciAke2V9LmApO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=