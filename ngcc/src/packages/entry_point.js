(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/host/umd_host"], factory);
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
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
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
        var packageJsonPath = path_1.AbsoluteFsPath.resolve(entryPointPath, 'package.json');
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
        var metadataPath = path_1.AbsoluteFsPath.resolve(entryPointPath, typings.replace(/\.d\.ts$/, '') + '.metadata.json');
        var entryPointInfo = {
            name: entryPointPackageJson.name,
            packageJson: entryPointPackageJson,
            package: packagePath,
            path: entryPointPath,
            typings: path_1.AbsoluteFsPath.resolve(entryPointPath, typings),
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
                var pathToMain = path_1.AbsoluteFsPath.join(entryPoint.path, entryPoint.packageJson['main']);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFDakMsNkRBQXVEO0lBRXZELHlFQUE0RDtJQWdENUQsNEZBQTRGO0lBQy9FLFFBQUEsMkJBQTJCLEdBQ3BDLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFekU7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLEVBQWMsRUFBRSxNQUFjLEVBQUUsV0FBMkIsRUFDM0QsY0FBOEI7UUFDaEMsSUFBTSxlQUFlLEdBQUcscUJBQWMsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQy9CLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLHFCQUFxQixHQUFHLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDakYsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1lBQzFCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFHRCxrQ0FBa0M7UUFDbEMsSUFBTSxPQUFPLEdBQUcscUJBQXFCLENBQUMsT0FBTyxJQUFJLHFCQUFxQixDQUFDLEtBQUssQ0FBQztRQUM3RSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELGdGQUFnRjtRQUNoRixJQUFNLFlBQVksR0FDZCxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQztRQUUvRixJQUFNLGNBQWMsR0FBZTtZQUNqQyxJQUFJLEVBQUUscUJBQXFCLENBQUMsSUFBSTtZQUNoQyxXQUFXLEVBQUUscUJBQXFCO1lBQ2xDLE9BQU8sRUFBRSxXQUFXO1lBQ3BCLElBQUksRUFBRSxjQUFjO1lBQ3BCLE9BQU8sRUFBRSxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDO1lBQ3hELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO1NBQzNDLENBQUM7UUFFRixPQUFPLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBbENELDhDQWtDQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBZ0IsbUJBQW1CLENBQy9CLEVBQWMsRUFBRSxVQUFzQixFQUFFLFFBQWdCO1FBQzFELFFBQVEsUUFBUSxFQUFFO1lBQ2hCLEtBQUssVUFBVTtnQkFDYixPQUFPLFNBQVMsQ0FBQztZQUNuQixLQUFLLE9BQU87Z0JBQ1YsT0FBTyxNQUFNLENBQUM7WUFDaEIsS0FBSyxRQUFRO2dCQUNYLE9BQU8sU0FBUyxDQUFDO1lBQ25CLEtBQUssU0FBUztnQkFDWixPQUFPLFNBQVMsQ0FBQztZQUNuQixLQUFLLE1BQU07Z0JBQ1QsT0FBTyxNQUFNLENBQUM7WUFDaEIsS0FBSyxNQUFNO2dCQUNULElBQU0sVUFBVSxHQUFHLHFCQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUcsQ0FBQyxDQUFDO2dCQUMxRixPQUFPLFdBQVcsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1lBQzFELEtBQUssUUFBUTtnQkFDWCxPQUFPLE1BQU0sQ0FBQztZQUNoQjtnQkFDRSxPQUFPLFNBQVMsQ0FBQztTQUNwQjtJQUNILENBQUM7SUFyQkQsa0RBcUJDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMscUJBQXFCLENBQzFCLEVBQWMsRUFBRSxNQUFjLEVBQUUsZUFBK0I7UUFDakUsSUFBSTtZQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7U0FDakQ7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLDhEQUE4RDtZQUM5RCxNQUFNLENBQUMsSUFBSSxDQUFDLDBDQUF3QyxlQUFlLG9CQUFlLENBQUMsTUFBRyxDQUFDLENBQUM7WUFDeEYsT0FBTyxJQUFJLENBQUM7U0FDYjtJQUNILENBQUM7SUFFRCxTQUFTLFdBQVcsQ0FBQyxFQUFjLEVBQUUsY0FBOEI7UUFDakUsSUFBTSxVQUFVLEdBQ1osRUFBRSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUYsT0FBTyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ25DLHFDQUEwQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUM7SUFDcEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi9maWxlX3N5c3RlbS9maWxlX3N5c3RlbSc7XG5pbXBvcnQge3BhcnNlU3RhdGVtZW50Rm9yVW1kTW9kdWxlfSBmcm9tICcuLi9ob3N0L3VtZF9ob3N0JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5cbi8qKlxuICogVGhlIHBvc3NpYmxlIHZhbHVlcyBmb3IgdGhlIGZvcm1hdCBvZiBhbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IHR5cGUgRW50cnlQb2ludEZvcm1hdCA9ICdlc201JyB8ICdlc20yMDE1JyB8ICd1bWQnIHwgJ2NvbW1vbmpzJztcblxuLyoqXG4gKiBBbiBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCBhbiBlbnRyeS1wb2ludCwgaW5jbHVkaW5nIHBhdGhzXG4gKiB0byBlYWNoIG9mIHRoZSBwb3NzaWJsZSBlbnRyeS1wb2ludCBmb3JtYXRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnQge1xuICAvKiogVGhlIG5hbWUgb2YgdGhlIHBhY2thZ2UgKGUuZy4gYEBhbmd1bGFyL2NvcmVgKS4gKi9cbiAgbmFtZTogc3RyaW5nO1xuICAvKiogVGhlIHBhcnNlZCBwYWNrYWdlLmpzb24gZmlsZSBmb3IgdGhpcyBlbnRyeS1wb2ludC4gKi9cbiAgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbjtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoZSBwYWNrYWdlIHRoYXQgY29udGFpbnMgdGhpcyBlbnRyeS1wb2ludC4gKi9cbiAgcGFja2FnZTogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBUaGUgcGF0aCB0byB0aGlzIGVudHJ5IHBvaW50LiAqL1xuICBwYXRoOiBBYnNvbHV0ZUZzUGF0aDtcbiAgLyoqIFRoZSBwYXRoIHRvIGEgdHlwaW5ncyAoLmQudHMpIGZpbGUgZm9yIHRoaXMgZW50cnktcG9pbnQuICovXG4gIHR5cGluZ3M6IEFic29sdXRlRnNQYXRoO1xuICAvKiogSXMgdGhpcyBFbnRyeVBvaW50IGNvbXBpbGVkIHdpdGggdGhlIEFuZ3VsYXIgVmlldyBFbmdpbmUgY29tcGlsZXI/ICovXG4gIGNvbXBpbGVkQnlBbmd1bGFyOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzIHtcbiAgZmVzbTIwMTU/OiBzdHJpbmc7XG4gIGZlc201Pzogc3RyaW5nO1xuICBlczIwMTU/OiBzdHJpbmc7ICAvLyBpZiBleGlzdHMgdGhlbiBpdCBpcyBhY3R1YWxseSBGRVNNMjAxNVxuICBlc20yMDE1Pzogc3RyaW5nO1xuICBlc201Pzogc3RyaW5nO1xuICBtYWluPzogc3RyaW5nOyAgICAgLy8gVU1EXG4gIG1vZHVsZT86IHN0cmluZzsgICAvLyBpZiBleGlzdHMgdGhlbiBpdCBpcyBhY3R1YWxseSBGRVNNNVxuICB0eXBlcz86IHN0cmluZzsgICAgLy8gU3lub255bW91cyB0byBgdHlwaW5nc2AgcHJvcGVydHkgLSBzZWUgaHR0cHM6Ly9iaXQubHkvMk9nV3AySFxuICB0eXBpbmdzPzogc3RyaW5nOyAgLy8gVHlwZVNjcmlwdCAuZC50cyBmaWxlc1xufVxuXG4vKipcbiAqIFRoZSBwcm9wZXJ0aWVzIHRoYXQgbWF5IGJlIGxvYWRlZCBmcm9tIHRoZSBgcGFja2FnZS5qc29uYCBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiBleHRlbmRzIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyB7XG4gIG5hbWU6IHN0cmluZztcbiAgX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfXz86IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9O1xufVxuXG5leHBvcnQgdHlwZSBFbnRyeVBvaW50SnNvblByb3BlcnR5ID0ga2V5b2YoUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzKTtcbi8vIFdlIG5lZWQgdG8ga2VlcCB0aGUgZWxlbWVudHMgb2YgdGhpcyBjb25zdCBhbmQgdGhlIGBFbnRyeVBvaW50SnNvblByb3BlcnR5YCB0eXBlIGluIHN5bmMuXG5leHBvcnQgY29uc3QgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPVxuICAgIFsnZmVzbTIwMTUnLCAnZmVzbTUnLCAnZXMyMDE1JywgJ2VzbTIwMTUnLCAnZXNtNScsICdtYWluJywgJ21vZHVsZSddO1xuXG4vKipcbiAqIFRyeSB0byBjcmVhdGUgYW4gZW50cnktcG9pbnQgZnJvbSB0aGUgZ2l2ZW4gcGF0aHMgYW5kIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHBhY2thZ2VQYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBjb250YWluaW5nIG5wbSBwYWNrYWdlXG4gKiBAcGFyYW0gZW50cnlQb2ludFBhdGggdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBvdGVudGlhbCBlbnRyeS1wb2ludC5cbiAqIEByZXR1cm5zIEFuIGVudHJ5LXBvaW50IGlmIGl0IGlzIHZhbGlkLCBgbnVsbGAgb3RoZXJ3aXNlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludEluZm8oXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGxvZ2dlcjogTG9nZ2VyLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludHxudWxsIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBpZiAoIWZzLmV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBsb2FkRW50cnlQb2ludFBhY2thZ2UoZnMsIGxvZ2dlciwgcGFja2FnZUpzb25QYXRoKTtcbiAgaWYgKCFlbnRyeVBvaW50UGFja2FnZUpzb24pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG5cbiAgLy8gV2UgbXVzdCBoYXZlIGEgdHlwaW5ncyBwcm9wZXJ0eVxuICBjb25zdCB0eXBpbmdzID0gZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGluZ3MgfHwgZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGVzO1xuICBpZiAoIXR5cGluZ3MpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEFsc28gdGhlcmUgbXVzdCBleGlzdCBhIGBtZXRhZGF0YS5qc29uYCBmaWxlIG5leHQgdG8gdGhlIHR5cGluZ3MgZW50cnktcG9pbnQuXG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9XG4gICAgICBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKGVudHJ5UG9pbnRQYXRoLCB0eXBpbmdzLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnJykgKyAnLm1ldGFkYXRhLmpzb24nKTtcblxuICBjb25zdCBlbnRyeVBvaW50SW5mbzogRW50cnlQb2ludCA9IHtcbiAgICBuYW1lOiBlbnRyeVBvaW50UGFja2FnZUpzb24ubmFtZSxcbiAgICBwYWNrYWdlSnNvbjogZW50cnlQb2ludFBhY2thZ2VKc29uLFxuICAgIHBhY2thZ2U6IHBhY2thZ2VQYXRoLFxuICAgIHBhdGg6IGVudHJ5UG9pbnRQYXRoLFxuICAgIHR5cGluZ3M6IEFic29sdXRlRnNQYXRoLnJlc29sdmUoZW50cnlQb2ludFBhdGgsIHR5cGluZ3MpLFxuICAgIGNvbXBpbGVkQnlBbmd1bGFyOiBmcy5leGlzdHMobWV0YWRhdGFQYXRoKSxcbiAgfTtcblxuICByZXR1cm4gZW50cnlQb2ludEluZm87XG59XG5cbi8qKlxuICogQ29udmVydCBhIHBhY2thZ2UuanNvbiBwcm9wZXJ0eSBpbnRvIGFuIGVudHJ5LXBvaW50IGZvcm1hdC5cbiAqXG4gKiBAcGFyYW0gcHJvcGVydHkgVGhlIHByb3BlcnR5IHRvIGNvbnZlcnQgdG8gYSBmb3JtYXQuXG4gKiBAcmV0dXJucyBBbiBlbnRyeS1wb2ludCBmb3JtYXQgb3IgYHVuZGVmaW5lZGAgaWYgbm9uZSBtYXRjaCB0aGUgZ2l2ZW4gcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnRyeVBvaW50Rm9ybWF0KFxuICAgIGZzOiBGaWxlU3lzdGVtLCBlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBwcm9wZXJ0eTogc3RyaW5nKTogRW50cnlQb2ludEZvcm1hdHx1bmRlZmluZWQge1xuICBzd2l0Y2ggKHByb3BlcnR5KSB7XG4gICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdmZXNtNSc6XG4gICAgICByZXR1cm4gJ2VzbTUnO1xuICAgIGNhc2UgJ2VzMjAxNSc6XG4gICAgICByZXR1cm4gJ2VzbTIwMTUnO1xuICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdlc201JzpcbiAgICAgIHJldHVybiAnZXNtNSc7XG4gICAgY2FzZSAnbWFpbic6XG4gICAgICBjb25zdCBwYXRoVG9NYWluID0gQWJzb2x1dGVGc1BhdGguam9pbihlbnRyeVBvaW50LnBhdGgsIGVudHJ5UG9pbnQucGFja2FnZUpzb25bJ21haW4nXSAhKTtcbiAgICAgIHJldHVybiBpc1VtZE1vZHVsZShmcywgcGF0aFRvTWFpbikgPyAndW1kJyA6ICdjb21tb25qcyc7XG4gICAgY2FzZSAnbW9kdWxlJzpcbiAgICAgIHJldHVybiAnZXNtNSc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZXMgdGhlIEpTT04gZnJvbSBhIHBhY2thZ2UuanNvbiBmaWxlLlxuICogQHBhcmFtIHBhY2thZ2VKc29uUGF0aCB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcGFja2FnZS5qc29uIGZpbGUuXG4gKiBAcmV0dXJucyBKU09OIGZyb20gdGhlIHBhY2thZ2UuanNvbiBmaWxlIGlmIGl0IGlzIHZhbGlkLCBgbnVsbGAgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBsb2FkRW50cnlQb2ludFBhY2thZ2UoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGxvZ2dlcjogTG9nZ2VyLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFBhY2thZ2VKc29ufG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gV2UgbWF5IGhhdmUgcnVuIGludG8gYSBwYWNrYWdlLmpzb24gd2l0aCB1bmV4cGVjdGVkIHN5bWJvbHNcbiAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIHJlYWQgZW50cnkgcG9pbnQgaW5mbyBmcm9tICR7cGFja2FnZUpzb25QYXRofSB3aXRoIGVycm9yICR7ZX0uYCk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNVbWRNb2R1bGUoZnM6IEZpbGVTeXN0ZW0sIHNvdXJjZUZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICBjb25zdCBzb3VyY2VGaWxlID1cbiAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoc291cmNlRmlsZVBhdGgsIGZzLnJlYWRGaWxlKHNvdXJjZUZpbGVQYXRoKSwgdHMuU2NyaXB0VGFyZ2V0LkVTNSk7XG4gIHJldHVybiBzb3VyY2VGaWxlLnN0YXRlbWVudHMubGVuZ3RoID4gMCAmJlxuICAgICAgcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc291cmNlRmlsZS5zdGF0ZW1lbnRzWzBdKSAhPT0gbnVsbDtcbn1cbiJdfQ==