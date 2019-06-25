(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/host/umd_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var umd_host_1 = require("@angular/compiler-cli/ngcc/src/host/umd_host");
    // We need to keep the elements of this const and the `EntryPointJsonProperty` type in sync.
    exports.SUPPORTED_FORMAT_PROPERTIES = ['fesm2015', 'fesm5', 'es2015', 'esm2015', 'esm5', 'main', 'module'];
    /**
     * Try to create an entry-point from the given paths and properties.
     *
     * @param packagePath the absolute path to the containing npm package
     * @param entryPointPath the absolute path to the potential entry-point.
     * @returns An entry-point if it is valid, `null` otherwise.
     */
    function getEntryPointInfo(fs, logger, packagePath, entryPointPath) {
        var packageJsonPath = file_system_1.resolve(entryPointPath, 'package.json');
        if (!fs.exists(packageJsonPath)) {
            return null;
        }
        var entryPointPackageJson = loadEntryPointPackage(fs, logger, packageJsonPath);
        if (!entryPointPackageJson) {
            return null;
        }
        // We must have a typings property
        var typings = entryPointPackageJson.typings || entryPointPackageJson.types;
        if (!typings) {
            return null;
        }
        // Also there must exist a `metadata.json` file next to the typings entry-point.
        var metadataPath = file_system_1.resolve(entryPointPath, typings.replace(/\.d\.ts$/, '') + '.metadata.json');
        var entryPointInfo = {
            name: entryPointPackageJson.name,
            packageJson: entryPointPackageJson,
            package: packagePath,
            path: entryPointPath,
            typings: file_system_1.resolve(entryPointPath, typings),
            compiledByAngular: fs.exists(metadataPath),
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
    function getEntryPointFormat(fs, entryPoint, property) {
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
                var mainFile = entryPoint.packageJson['main'];
                if (mainFile === undefined) {
                    return undefined;
                }
                var pathToMain = file_system_1.join(entryPoint.path, mainFile);
                return isUmdModule(fs, pathToMain) ? 'umd' : 'commonjs';
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
    function loadEntryPointPackage(fs, logger, packageJsonPath) {
        try {
            return JSON.parse(fs.readFile(packageJsonPath));
        }
        catch (e) {
            // We may have run into a package.json with unexpected symbols
            logger.warn("Failed to read entry point info from " + packageJsonPath + " with error " + e + ".");
            return null;
        }
    }
    function isUmdModule(fs, sourceFilePath) {
        var sourceFile = ts.createSourceFile(sourceFilePath, fs.readFile(sourceFilePath), ts.ScriptTarget.ES5);
        return sourceFile.statements.length > 0 &&
            umd_host_1.parseStatementForUmdModule(sourceFile.statements[0]) !== null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFDakMsMkVBQXlGO0lBQ3pGLHlFQUE0RDtJQWdENUQsNEZBQTRGO0lBQy9FLFFBQUEsMkJBQTJCLEdBQ3BDLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFekU7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLEVBQWMsRUFBRSxNQUFjLEVBQUUsV0FBMkIsRUFDM0QsY0FBOEI7UUFDaEMsSUFBTSxlQUFlLEdBQUcscUJBQU8sQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEVBQUU7WUFDL0IsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQU0scUJBQXFCLEdBQUcscUJBQXFCLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNqRixJQUFJLENBQUMscUJBQXFCLEVBQUU7WUFDMUIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUdELGtDQUFrQztRQUNsQyxJQUFNLE9BQU8sR0FBRyxxQkFBcUIsQ0FBQyxPQUFPLElBQUkscUJBQXFCLENBQUMsS0FBSyxDQUFDO1FBQzdFLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDWixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsZ0ZBQWdGO1FBQ2hGLElBQU0sWUFBWSxHQUFHLHFCQUFPLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUM7UUFFakcsSUFBTSxjQUFjLEdBQWU7WUFDakMsSUFBSSxFQUFFLHFCQUFxQixDQUFDLElBQUk7WUFDaEMsV0FBVyxFQUFFLHFCQUFxQjtZQUNsQyxPQUFPLEVBQUUsV0FBVztZQUNwQixJQUFJLEVBQUUsY0FBYztZQUNwQixPQUFPLEVBQUUscUJBQU8sQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDO1lBQ3pDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO1NBQzNDLENBQUM7UUFFRixPQUFPLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBakNELDhDQWlDQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBZ0IsbUJBQW1CLENBQy9CLEVBQWMsRUFBRSxVQUFzQixFQUFFLFFBQWdCO1FBQzFELFFBQVEsUUFBUSxFQUFFO1lBQ2hCLEtBQUssVUFBVTtnQkFDYixPQUFPLFNBQVMsQ0FBQztZQUNuQixLQUFLLE9BQU87Z0JBQ1YsT0FBTyxNQUFNLENBQUM7WUFDaEIsS0FBSyxRQUFRO2dCQUNYLE9BQU8sU0FBUyxDQUFDO1lBQ25CLEtBQUssU0FBUztnQkFDWixPQUFPLFNBQVMsQ0FBQztZQUNuQixLQUFLLE1BQU07Z0JBQ1QsT0FBTyxNQUFNLENBQUM7WUFDaEIsS0FBSyxNQUFNO2dCQUNULElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2hELElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtvQkFDMUIsT0FBTyxTQUFTLENBQUM7aUJBQ2xCO2dCQUNELElBQU0sVUFBVSxHQUFHLGtCQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDbkQsT0FBTyxXQUFXLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztZQUMxRCxLQUFLLFFBQVE7Z0JBQ1gsT0FBTyxNQUFNLENBQUM7WUFDaEI7Z0JBQ0UsT0FBTyxTQUFTLENBQUM7U0FDcEI7SUFDSCxDQUFDO0lBekJELGtEQXlCQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLHFCQUFxQixDQUMxQixFQUFjLEVBQUUsTUFBYyxFQUFFLGVBQStCO1FBQ2pFLElBQUk7WUFDRixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1NBQ2pEO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDViw4REFBOEQ7WUFDOUQsTUFBTSxDQUFDLElBQUksQ0FBQywwQ0FBd0MsZUFBZSxvQkFBZSxDQUFDLE1BQUcsQ0FBQyxDQUFDO1lBQ3hGLE9BQU8sSUFBSSxDQUFDO1NBQ2I7SUFDSCxDQUFDO0lBRUQsU0FBUyxXQUFXLENBQUMsRUFBYyxFQUFFLGNBQThCO1FBQ2pFLElBQU0sVUFBVSxHQUNaLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFGLE9BQU8sVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNuQyxxQ0FBMEIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDO0lBQ3BFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGpvaW4sIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge3BhcnNlU3RhdGVtZW50Rm9yVW1kTW9kdWxlfSBmcm9tICcuLi9ob3N0L3VtZF9ob3N0JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5cbi8qKlxuICogVGhlIHBvc3NpYmxlIHZhbHVlcyBmb3IgdGhlIGZvcm1hdCBvZiBhbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IHR5cGUgRW50cnlQb2ludEZvcm1hdCA9ICdlc201JyB8ICdlc20yMDE1JyB8ICd1bWQnIHwgJ2NvbW1vbmpzJztcblxuLyoqXG4gKiBBbiBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCBhbiBlbnRyeS1wb2ludCwgaW5jbHVkaW5nIHBhdGhzXG4gKiB0byBlYWNoIG9mIHRoZSBwb3NzaWJsZSBlbnRyeS1wb2ludCBmb3JtYXRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnQge1xuICAvKiogVGhlIG5hbWUgb2YgdGhlIHBhY2thZ2UgKGUuZy4gYEBhbmd1bGFyL2NvcmVgKS4gKi9cbiAgbmFtZTogc3RyaW5nO1xuICAvKiogVGhlIHBhcnNlZCBwYWNrYWdlLmpzb24gZmlsZSBmb3IgdGhpcyBlbnRyeS1wb2ludC4gKi9cbiAgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbjtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoZSBwYWNrYWdlIHRoYXQgY29udGFpbnMgdGhpcyBlbnRyeS1wb2ludC4gKi9cbiAgcGFja2FnZTogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBUaGUgcGF0aCB0byB0aGlzIGVudHJ5IHBvaW50LiAqL1xuICBwYXRoOiBBYnNvbHV0ZUZzUGF0aDtcbiAgLyoqIFRoZSBwYXRoIHRvIGEgdHlwaW5ncyAoLmQudHMpIGZpbGUgZm9yIHRoaXMgZW50cnktcG9pbnQuICovXG4gIHR5cGluZ3M6IEFic29sdXRlRnNQYXRoO1xuICAvKiogSXMgdGhpcyBFbnRyeVBvaW50IGNvbXBpbGVkIHdpdGggdGhlIEFuZ3VsYXIgVmlldyBFbmdpbmUgY29tcGlsZXI/ICovXG4gIGNvbXBpbGVkQnlBbmd1bGFyOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzIHtcbiAgZmVzbTIwMTU/OiBzdHJpbmc7XG4gIGZlc201Pzogc3RyaW5nO1xuICBlczIwMTU/OiBzdHJpbmc7ICAvLyBpZiBleGlzdHMgdGhlbiBpdCBpcyBhY3R1YWxseSBGRVNNMjAxNVxuICBlc20yMDE1Pzogc3RyaW5nO1xuICBlc201Pzogc3RyaW5nO1xuICBtYWluPzogc3RyaW5nOyAgICAgLy8gVU1EXG4gIG1vZHVsZT86IHN0cmluZzsgICAvLyBpZiBleGlzdHMgdGhlbiBpdCBpcyBhY3R1YWxseSBGRVNNNVxuICB0eXBlcz86IHN0cmluZzsgICAgLy8gU3lub255bW91cyB0byBgdHlwaW5nc2AgcHJvcGVydHkgLSBzZWUgaHR0cHM6Ly9iaXQubHkvMk9nV3AySFxuICB0eXBpbmdzPzogc3RyaW5nOyAgLy8gVHlwZVNjcmlwdCAuZC50cyBmaWxlc1xufVxuXG4vKipcbiAqIFRoZSBwcm9wZXJ0aWVzIHRoYXQgbWF5IGJlIGxvYWRlZCBmcm9tIHRoZSBgcGFja2FnZS5qc29uYCBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiBleHRlbmRzIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyB7XG4gIG5hbWU6IHN0cmluZztcbiAgX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfXz86IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9O1xufVxuXG5leHBvcnQgdHlwZSBFbnRyeVBvaW50SnNvblByb3BlcnR5ID0ga2V5b2YoUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzKTtcbi8vIFdlIG5lZWQgdG8ga2VlcCB0aGUgZWxlbWVudHMgb2YgdGhpcyBjb25zdCBhbmQgdGhlIGBFbnRyeVBvaW50SnNvblByb3BlcnR5YCB0eXBlIGluIHN5bmMuXG5leHBvcnQgY29uc3QgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPVxuICAgIFsnZmVzbTIwMTUnLCAnZmVzbTUnLCAnZXMyMDE1JywgJ2VzbTIwMTUnLCAnZXNtNScsICdtYWluJywgJ21vZHVsZSddO1xuXG4vKipcbiAqIFRyeSB0byBjcmVhdGUgYW4gZW50cnktcG9pbnQgZnJvbSB0aGUgZ2l2ZW4gcGF0aHMgYW5kIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHBhY2thZ2VQYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBjb250YWluaW5nIG5wbSBwYWNrYWdlXG4gKiBAcGFyYW0gZW50cnlQb2ludFBhdGggdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBvdGVudGlhbCBlbnRyeS1wb2ludC5cbiAqIEByZXR1cm5zIEFuIGVudHJ5LXBvaW50IGlmIGl0IGlzIHZhbGlkLCBgbnVsbGAgb3RoZXJ3aXNlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludEluZm8oXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGxvZ2dlcjogTG9nZ2VyLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludHxudWxsIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBpZiAoIWZzLmV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBsb2FkRW50cnlQb2ludFBhY2thZ2UoZnMsIGxvZ2dlciwgcGFja2FnZUpzb25QYXRoKTtcbiAgaWYgKCFlbnRyeVBvaW50UGFja2FnZUpzb24pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG5cbiAgLy8gV2UgbXVzdCBoYXZlIGEgdHlwaW5ncyBwcm9wZXJ0eVxuICBjb25zdCB0eXBpbmdzID0gZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGluZ3MgfHwgZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGVzO1xuICBpZiAoIXR5cGluZ3MpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEFsc28gdGhlcmUgbXVzdCBleGlzdCBhIGBtZXRhZGF0YS5qc29uYCBmaWxlIG5leHQgdG8gdGhlIHR5cGluZ3MgZW50cnktcG9pbnQuXG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9IHJlc29sdmUoZW50cnlQb2ludFBhdGgsIHR5cGluZ3MucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcnKSArICcubWV0YWRhdGEuanNvbicpO1xuXG4gIGNvbnN0IGVudHJ5UG9pbnRJbmZvOiBFbnRyeVBvaW50ID0ge1xuICAgIG5hbWU6IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi5uYW1lLFxuICAgIHBhY2thZ2VKc29uOiBlbnRyeVBvaW50UGFja2FnZUpzb24sXG4gICAgcGFja2FnZTogcGFja2FnZVBhdGgsXG4gICAgcGF0aDogZW50cnlQb2ludFBhdGgsXG4gICAgdHlwaW5nczogcmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgdHlwaW5ncyksXG4gICAgY29tcGlsZWRCeUFuZ3VsYXI6IGZzLmV4aXN0cyhtZXRhZGF0YVBhdGgpLFxuICB9O1xuXG4gIHJldHVybiBlbnRyeVBvaW50SW5mbztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcGFja2FnZS5qc29uIHByb3BlcnR5IGludG8gYW4gZW50cnktcG9pbnQgZm9ybWF0LlxuICpcbiAqIEBwYXJhbSBwcm9wZXJ0eSBUaGUgcHJvcGVydHkgdG8gY29udmVydCB0byBhIGZvcm1hdC5cbiAqIEByZXR1cm5zIEFuIGVudHJ5LXBvaW50IGZvcm1hdCBvciBgdW5kZWZpbmVkYCBpZiBub25lIG1hdGNoIHRoZSBnaXZlbiBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudHJ5UG9pbnRGb3JtYXQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIHByb3BlcnR5OiBzdHJpbmcpOiBFbnRyeVBvaW50Rm9ybWF0fHVuZGVmaW5lZCB7XG4gIHN3aXRjaCAocHJvcGVydHkpIHtcbiAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICByZXR1cm4gJ2VzbTIwMTUnO1xuICAgIGNhc2UgJ2Zlc201JzpcbiAgICAgIHJldHVybiAnZXNtNSc7XG4gICAgY2FzZSAnZXMyMDE1JzpcbiAgICAgIHJldHVybiAnZXNtMjAxNSc7XG4gICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICByZXR1cm4gJ2VzbTIwMTUnO1xuICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgcmV0dXJuICdlc201JztcbiAgICBjYXNlICdtYWluJzpcbiAgICAgIGNvbnN0IG1haW5GaWxlID0gZW50cnlQb2ludC5wYWNrYWdlSnNvblsnbWFpbiddO1xuICAgICAgaWYgKG1haW5GaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhdGhUb01haW4gPSBqb2luKGVudHJ5UG9pbnQucGF0aCwgbWFpbkZpbGUpO1xuICAgICAgcmV0dXJuIGlzVW1kTW9kdWxlKGZzLCBwYXRoVG9NYWluKSA/ICd1bWQnIDogJ2NvbW1vbmpzJztcbiAgICBjYXNlICdtb2R1bGUnOlxuICAgICAgcmV0dXJuICdlc201JztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlcyB0aGUgSlNPTiBmcm9tIGEgcGFja2FnZS5qc29uIGZpbGUuXG4gKiBAcGFyYW0gcGFja2FnZUpzb25QYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlLmpzb24gZmlsZS5cbiAqIEByZXR1cm5zIEpTT04gZnJvbSB0aGUgcGFja2FnZS5qc29uIGZpbGUgaWYgaXQgaXMgdmFsaWQsIGBudWxsYCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGxvYWRFbnRyeVBvaW50UGFja2FnZShcbiAgICBmczogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50UGFja2FnZUpzb258bnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBXZSBtYXkgaGF2ZSBydW4gaW50byBhIHBhY2thZ2UuanNvbiB3aXRoIHVuZXhwZWN0ZWQgc3ltYm9sc1xuICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gcmVhZCBlbnRyeSBwb2ludCBpbmZvIGZyb20gJHtwYWNrYWdlSnNvblBhdGh9IHdpdGggZXJyb3IgJHtlfS5gKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1VtZE1vZHVsZShmczogRmlsZVN5c3RlbSwgc291cmNlRmlsZVBhdGg6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7XG4gIGNvbnN0IHNvdXJjZUZpbGUgPVxuICAgICAgdHMuY3JlYXRlU291cmNlRmlsZShzb3VyY2VGaWxlUGF0aCwgZnMucmVhZEZpbGUoc291cmNlRmlsZVBhdGgpLCB0cy5TY3JpcHRUYXJnZXQuRVM1KTtcbiAgcmV0dXJuIHNvdXJjZUZpbGUuc3RhdGVtZW50cy5sZW5ndGggPiAwICYmXG4gICAgICBwYXJzZVN0YXRlbWVudEZvclVtZE1vZHVsZShzb3VyY2VGaWxlLnN0YXRlbWVudHNbMF0pICE9PSBudWxsO1xufVxuIl19