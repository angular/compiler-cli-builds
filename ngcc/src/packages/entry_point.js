(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point", ["require", "exports", "@angular/compiler-cli/src/ngtsc/path"], factory);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw2REFBdUQ7SUFpRHZELDRGQUE0RjtJQUMvRSxRQUFBLDJCQUEyQixHQUNwQyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBRXpFOzs7Ozs7T0FNRztJQUNILFNBQWdCLGlCQUFpQixDQUM3QixFQUFjLEVBQUUsTUFBYyxFQUFFLFdBQTJCLEVBQzNELGNBQThCO1FBQ2hDLElBQU0sZUFBZSxHQUFHLHFCQUFjLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMvRSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFBRTtZQUMvQixPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsSUFBTSxxQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtZQUMxQixPQUFPLElBQUksQ0FBQztTQUNiO1FBR0Qsa0NBQWtDO1FBQ2xDLElBQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDLE9BQU8sSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7UUFDN0UsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNaLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxnRkFBZ0Y7UUFDaEYsSUFBTSxZQUFZLEdBQ2QscUJBQWMsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUM7UUFFL0YsSUFBTSxjQUFjLEdBQWU7WUFDakMsSUFBSSxFQUFFLHFCQUFxQixDQUFDLElBQUk7WUFDaEMsV0FBVyxFQUFFLHFCQUFxQjtZQUNsQyxPQUFPLEVBQUUsV0FBVztZQUNwQixJQUFJLEVBQUUsY0FBYztZQUNwQixPQUFPLEVBQUUscUJBQWMsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQztZQUN4RCxpQkFBaUIsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztTQUMzQyxDQUFDO1FBRUYsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQWxDRCw4Q0FrQ0M7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLFFBQWdCO1FBQ2xELFFBQVEsUUFBUSxFQUFFO1lBQ2hCLEtBQUssVUFBVTtnQkFDYixPQUFPLFNBQVMsQ0FBQztZQUNuQixLQUFLLE9BQU87Z0JBQ1YsT0FBTyxNQUFNLENBQUM7WUFDaEIsS0FBSyxRQUFRO2dCQUNYLE9BQU8sU0FBUyxDQUFDO1lBQ25CLEtBQUssU0FBUztnQkFDWixPQUFPLFNBQVMsQ0FBQztZQUNuQixLQUFLLE1BQU07Z0JBQ1QsT0FBTyxNQUFNLENBQUM7WUFDaEIsS0FBSyxNQUFNO2dCQUNULE9BQU8sS0FBSyxDQUFDO1lBQ2YsS0FBSyxRQUFRO2dCQUNYLE9BQU8sTUFBTSxDQUFDO1lBQ2hCO2dCQUNFLE9BQU8sU0FBUyxDQUFDO1NBQ3BCO0lBQ0gsQ0FBQztJQW5CRCxrREFtQkM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxxQkFBcUIsQ0FDMUIsRUFBYyxFQUFFLE1BQWMsRUFBRSxlQUErQjtRQUNqRSxJQUFJO1lBQ0YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztTQUNqRDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsOERBQThEO1lBQzlELE1BQU0sQ0FBQyxJQUFJLENBQUMsMENBQXdDLGVBQWUsb0JBQWUsQ0FBQyxNQUFHLENBQUMsQ0FBQztZQUN4RixPQUFPLElBQUksQ0FBQztTQUNiO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXRoJztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vZmlsZV9zeXN0ZW0vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcblxuLyoqXG4gKiBUaGUgcG9zc2libGUgdmFsdWVzIGZvciB0aGUgZm9ybWF0IG9mIGFuIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgdHlwZSBFbnRyeVBvaW50Rm9ybWF0ID0gJ2VzbTUnIHwgJ2VzbTIwMTUnIHwgJ3VtZCc7XG5cbi8qKlxuICogQW4gb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24gYWJvdXQgYW4gZW50cnktcG9pbnQsIGluY2x1ZGluZyBwYXRoc1xuICogdG8gZWFjaCBvZiB0aGUgcG9zc2libGUgZW50cnktcG9pbnQgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50IHtcbiAgLyoqIFRoZSBuYW1lIG9mIHRoZSBwYWNrYWdlIChlLmcuIGBAYW5ndWxhci9jb3JlYCkuICovXG4gIG5hbWU6IHN0cmluZztcbiAgLyoqIFRoZSBwYXJzZWQgcGFja2FnZS5qc29uIGZpbGUgZm9yIHRoaXMgZW50cnktcG9pbnQuICovXG4gIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb247XG4gIC8qKiBUaGUgcGF0aCB0byB0aGUgcGFja2FnZSB0aGF0IGNvbnRhaW5zIHRoaXMgZW50cnktcG9pbnQuICovXG4gIHBhY2thZ2U6IEFic29sdXRlRnNQYXRoO1xuICAvKiogVGhlIHBhdGggdG8gdGhpcyBlbnRyeSBwb2ludC4gKi9cbiAgcGF0aDogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBUaGUgcGF0aCB0byBhIHR5cGluZ3MgKC5kLnRzKSBmaWxlIGZvciB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICB0eXBpbmdzOiBBYnNvbHV0ZUZzUGF0aDtcbiAgLyoqIElzIHRoaXMgRW50cnlQb2ludCBjb21waWxlZCB3aXRoIHRoZSBBbmd1bGFyIFZpZXcgRW5naW5lIGNvbXBpbGVyPyAqL1xuICBjb21waWxlZEJ5QW5ndWxhcjogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyB7XG4gIGZlc20yMDE1Pzogc3RyaW5nO1xuICBmZXNtNT86IHN0cmluZztcbiAgZXMyMDE1Pzogc3RyaW5nOyAgLy8gaWYgZXhpc3RzIHRoZW4gaXQgaXMgYWN0dWFsbHkgRkVTTTIwMTVcbiAgZXNtMjAxNT86IHN0cmluZztcbiAgZXNtNT86IHN0cmluZztcbiAgbWFpbj86IHN0cmluZzsgICAgIC8vIFVNRFxuICBtb2R1bGU/OiBzdHJpbmc7ICAgLy8gaWYgZXhpc3RzIHRoZW4gaXQgaXMgYWN0dWFsbHkgRkVTTTVcbiAgdHlwZXM/OiBzdHJpbmc7ICAgIC8vIFN5bm9ueW1vdXMgdG8gYHR5cGluZ3NgIHByb3BlcnR5IC0gc2VlIGh0dHBzOi8vYml0Lmx5LzJPZ1dwMkhcbiAgdHlwaW5ncz86IHN0cmluZzsgIC8vIFR5cGVTY3JpcHQgLmQudHMgZmlsZXNcbn1cblxuLyoqXG4gKiBUaGUgcHJvcGVydGllcyB0aGF0IG1heSBiZSBsb2FkZWQgZnJvbSB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50UGFja2FnZUpzb24gZXh0ZW5kcyBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXMge1xuICBuYW1lOiBzdHJpbmc7XG4gIF9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18/OiB7W2tleTogc3RyaW5nXTogc3RyaW5nfTtcbn1cblxuZXhwb3J0IHR5cGUgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSA9IGtleW9mKFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyk7XG4vLyBXZSBuZWVkIHRvIGtlZXAgdGhlIGVsZW1lbnRzIG9mIHRoaXMgY29uc3QgYW5kIHRoZSBgRW50cnlQb2ludEpzb25Qcm9wZXJ0eWAgdHlwZSBpbiBzeW5jLlxuZXhwb3J0IGNvbnN0IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUzogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID1cbiAgICBbJ2Zlc20yMDE1JywgJ2Zlc201JywgJ2VzMjAxNScsICdlc20yMDE1JywgJ2VzbTUnLCAnbWFpbicsICdtb2R1bGUnXTtcblxuLyoqXG4gKiBUcnkgdG8gY3JlYXRlIGFuIGVudHJ5LXBvaW50IGZyb20gdGhlIGdpdmVuIHBhdGhzIGFuZCBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSBwYWNrYWdlUGF0aCB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgY29udGFpbmluZyBucG0gcGFja2FnZVxuICogQHBhcmFtIGVudHJ5UG9pbnRQYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwb3RlbnRpYWwgZW50cnktcG9pbnQuXG4gKiBAcmV0dXJucyBBbiBlbnRyeS1wb2ludCBpZiBpdCBpcyB2YWxpZCwgYG51bGxgIG90aGVyd2lzZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudHJ5UG9pbnRJbmZvKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgcGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnR8bnVsbCB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IEFic29sdXRlRnNQYXRoLnJlc29sdmUoZW50cnlQb2ludFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgaWYgKCFmcy5leGlzdHMocGFja2FnZUpzb25QYXRoKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgZW50cnlQb2ludFBhY2thZ2VKc29uID0gbG9hZEVudHJ5UG9pbnRQYWNrYWdlKGZzLCBsb2dnZXIsIHBhY2thZ2VKc29uUGF0aCk7XG4gIGlmICghZW50cnlQb2ludFBhY2thZ2VKc29uKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIC8vIFdlIG11c3QgaGF2ZSBhIHR5cGluZ3MgcHJvcGVydHlcbiAgY29uc3QgdHlwaW5ncyA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi50eXBpbmdzIHx8IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi50eXBlcztcbiAgaWYgKCF0eXBpbmdzKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBBbHNvIHRoZXJlIG11c3QgZXhpc3QgYSBgbWV0YWRhdGEuanNvbmAgZmlsZSBuZXh0IHRvIHRoZSB0eXBpbmdzIGVudHJ5LXBvaW50LlxuICBjb25zdCBtZXRhZGF0YVBhdGggPVxuICAgICAgQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgdHlwaW5ncy5yZXBsYWNlKC9cXC5kXFwudHMkLywgJycpICsgJy5tZXRhZGF0YS5qc29uJyk7XG5cbiAgY29uc3QgZW50cnlQb2ludEluZm86IEVudHJ5UG9pbnQgPSB7XG4gICAgbmFtZTogZW50cnlQb2ludFBhY2thZ2VKc29uLm5hbWUsXG4gICAgcGFja2FnZUpzb246IGVudHJ5UG9pbnRQYWNrYWdlSnNvbixcbiAgICBwYWNrYWdlOiBwYWNrYWdlUGF0aCxcbiAgICBwYXRoOiBlbnRyeVBvaW50UGF0aCxcbiAgICB0eXBpbmdzOiBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKGVudHJ5UG9pbnRQYXRoLCB0eXBpbmdzKSxcbiAgICBjb21waWxlZEJ5QW5ndWxhcjogZnMuZXhpc3RzKG1ldGFkYXRhUGF0aCksXG4gIH07XG5cbiAgcmV0dXJuIGVudHJ5UG9pbnRJbmZvO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBwYWNrYWdlLmpzb24gcHJvcGVydHkgaW50byBhbiBlbnRyeS1wb2ludCBmb3JtYXQuXG4gKlxuICogQHBhcmFtIHByb3BlcnR5IFRoZSBwcm9wZXJ0eSB0byBjb252ZXJ0IHRvIGEgZm9ybWF0LlxuICogQHJldHVybnMgQW4gZW50cnktcG9pbnQgZm9ybWF0IG9yIGB1bmRlZmluZWRgIGlmIG5vbmUgbWF0Y2ggdGhlIGdpdmVuIHByb3BlcnR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludEZvcm1hdChwcm9wZXJ0eTogc3RyaW5nKTogRW50cnlQb2ludEZvcm1hdHx1bmRlZmluZWQge1xuICBzd2l0Y2ggKHByb3BlcnR5KSB7XG4gICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdmZXNtNSc6XG4gICAgICByZXR1cm4gJ2VzbTUnO1xuICAgIGNhc2UgJ2VzMjAxNSc6XG4gICAgICByZXR1cm4gJ2VzbTIwMTUnO1xuICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdlc201JzpcbiAgICAgIHJldHVybiAnZXNtNSc7XG4gICAgY2FzZSAnbWFpbic6XG4gICAgICByZXR1cm4gJ3VtZCc7XG4gICAgY2FzZSAnbW9kdWxlJzpcbiAgICAgIHJldHVybiAnZXNtNSc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZXMgdGhlIEpTT04gZnJvbSBhIHBhY2thZ2UuanNvbiBmaWxlLlxuICogQHBhcmFtIHBhY2thZ2VKc29uUGF0aCB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcGFja2FnZS5qc29uIGZpbGUuXG4gKiBAcmV0dXJucyBKU09OIGZyb20gdGhlIHBhY2thZ2UuanNvbiBmaWxlIGlmIGl0IGlzIHZhbGlkLCBgbnVsbGAgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBsb2FkRW50cnlQb2ludFBhY2thZ2UoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGxvZ2dlcjogTG9nZ2VyLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFBhY2thZ2VKc29ufG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gV2UgbWF5IGhhdmUgcnVuIGludG8gYSBwYWNrYWdlLmpzb24gd2l0aCB1bmV4cGVjdGVkIHN5bWJvbHNcbiAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIHJlYWQgZW50cnkgcG9pbnQgaW5mbyBmcm9tICR7cGFja2FnZUpzb25QYXRofSB3aXRoIGVycm9yICR7ZX0uYCk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==