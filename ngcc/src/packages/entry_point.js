(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point", ["require", "exports", "tslib", "canonical-path", "path", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/host/umd_host", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var canonical_path_1 = require("canonical-path");
    var path_1 = require("path");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var umd_host_1 = require("@angular/compiler-cli/ngcc/src/host/umd_host");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    // We need to keep the elements of this const and the `EntryPointJsonProperty` type in sync.
    exports.SUPPORTED_FORMAT_PROPERTIES = ['fesm2015', 'fesm5', 'es2015', 'esm2015', 'esm5', 'main', 'module'];
    /**
     * The path does not represent an entry-point:
     * * there is no package.json at the path and there is no config to force an entry-point
     * * or the entrypoint is `ignored` by a config.
     */
    exports.NO_ENTRY_POINT = 'no-entry-point';
    /**
     * The path has a package.json, but it is not a valid entry-point for ngcc processing.
     */
    exports.INCOMPATIBLE_ENTRY_POINT = 'incompatible-entry-point';
    /**
     * Try to create an entry-point from the given paths and properties.
     *
     * @param packagePath the absolute path to the containing npm package
     * @param entryPointPath the absolute path to the potential entry-point.
     * @returns
     * - An entry-point if it is valid.
     * - `NO_ENTRY_POINT` when there is no package.json at the path and there is no config to force an
     * entry-point or the entrypoint is `ignored`.
     * - `INCOMPATIBLE_ENTRY_POINT` there is a package.json but it is not a valid Angular compiled
     * entry-point.
     */
    function getEntryPointInfo(fs, config, logger, packagePath, entryPointPath) {
        var packageJsonPath = file_system_1.resolve(entryPointPath, 'package.json');
        var packageVersion = getPackageVersion(fs, packageJsonPath);
        var entryPointConfig = config.getConfig(packagePath, packageVersion).entryPoints[entryPointPath];
        var hasConfig = entryPointConfig !== undefined;
        if (!hasConfig && !fs.exists(packageJsonPath)) {
            // No package.json and no config
            return exports.NO_ENTRY_POINT;
        }
        if (hasConfig && entryPointConfig.ignore === true) {
            // Explicitly ignored
            return exports.NO_ENTRY_POINT;
        }
        var loadedEntryPointPackageJson = loadEntryPointPackage(fs, logger, packageJsonPath, hasConfig);
        var entryPointPackageJson = hasConfig ?
            mergeConfigAndPackageJson(loadedEntryPointPackageJson, entryPointConfig, packagePath, entryPointPath) :
            loadedEntryPointPackageJson;
        if (entryPointPackageJson === null) {
            // package.json exists but could not be parsed and there was no redeeming config
            return exports.INCOMPATIBLE_ENTRY_POINT;
        }
        var typings = entryPointPackageJson.typings || entryPointPackageJson.types ||
            guessTypingsFromPackageJson(fs, entryPointPath, entryPointPackageJson);
        if (typeof typings !== 'string') {
            // Missing the required `typings` property
            return exports.INCOMPATIBLE_ENTRY_POINT;
        }
        // An entry-point is assumed to be compiled by Angular if there is either:
        // * a `metadata.json` file next to the typings entry-point
        // * a custom config for this entry-point
        var metadataPath = file_system_1.resolve(entryPointPath, typings.replace(/\.d\.ts$/, '') + '.metadata.json');
        var compiledByAngular = entryPointConfig !== undefined || fs.exists(metadataPath);
        var entryPointInfo = {
            name: entryPointPackageJson.name,
            packageJson: entryPointPackageJson,
            package: packagePath,
            path: entryPointPath,
            typings: file_system_1.resolve(entryPointPath, typings),
            compiledByAngular: compiledByAngular,
            ignoreMissingDependencies: entryPointConfig !== undefined ? !!entryPointConfig.ignoreMissingDependencies : false,
            generateDeepReexports: entryPointConfig !== undefined ? !!entryPointConfig.generateDeepReexports : false,
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
    function loadEntryPointPackage(fs, logger, packageJsonPath, hasConfig) {
        try {
            return JSON.parse(fs.readFile(packageJsonPath));
        }
        catch (e) {
            if (!hasConfig) {
                // We may have run into a package.json with unexpected symbols
                logger.warn("Failed to read entry point info from " + packageJsonPath + " with error " + e + ".");
            }
            return null;
        }
    }
    function isUmdModule(fs, sourceFilePath) {
        var resolvedPath = utils_1.resolveFileWithPostfixes(fs, sourceFilePath, ['', '.js', '/index.js']);
        if (resolvedPath === null) {
            return false;
        }
        var sourceFile = ts.createSourceFile(sourceFilePath, fs.readFile(resolvedPath), ts.ScriptTarget.ES5);
        return sourceFile.statements.length > 0 &&
            umd_host_1.parseStatementForUmdModule(sourceFile.statements[0]) !== null;
    }
    function mergeConfigAndPackageJson(entryPointPackageJson, entryPointConfig, packagePath, entryPointPath) {
        if (entryPointPackageJson !== null) {
            return tslib_1.__assign(tslib_1.__assign({}, entryPointPackageJson), entryPointConfig.override);
        }
        else {
            var name = path_1.basename(packagePath) + "/" + canonical_path_1.relative(packagePath, entryPointPath);
            return tslib_1.__assign({ name: name }, entryPointConfig.override);
        }
    }
    function guessTypingsFromPackageJson(fs, entryPointPath, entryPointPackageJson) {
        var e_1, _a;
        try {
            for (var SUPPORTED_FORMAT_PROPERTIES_1 = tslib_1.__values(exports.SUPPORTED_FORMAT_PROPERTIES), SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next(); !SUPPORTED_FORMAT_PROPERTIES_1_1.done; SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next()) {
                var prop = SUPPORTED_FORMAT_PROPERTIES_1_1.value;
                var field = entryPointPackageJson[prop];
                if (typeof field !== 'string') {
                    // Some crazy packages have things like arrays in these fields!
                    continue;
                }
                var relativeTypingsPath = field.replace(/\.js$/, '.d.ts');
                var typingsPath = file_system_1.resolve(entryPointPath, relativeTypingsPath);
                if (fs.exists(typingsPath)) {
                    return typingsPath;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (SUPPORTED_FORMAT_PROPERTIES_1_1 && !SUPPORTED_FORMAT_PROPERTIES_1_1.done && (_a = SUPPORTED_FORMAT_PROPERTIES_1.return)) _a.call(SUPPORTED_FORMAT_PROPERTIES_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return null;
    }
    /**
     * Find the version of the package at `packageJsonPath`.
     *
     * @returns the version string or `null` if the package.json does not exist or is invalid.
     */
    function getPackageVersion(fs, packageJsonPath) {
        try {
            if (fs.exists(packageJsonPath)) {
                var packageJson = JSON.parse(fs.readFile(packageJsonPath));
                return packageJson['version'] || null;
            }
        }
        catch (_a) {
            // Do nothing
        }
        return null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaURBQXdDO0lBQ3hDLDZCQUE4QjtJQUM5QiwrQkFBaUM7SUFDakMsMkVBQXlGO0lBQ3pGLHlFQUE0RDtJQUU1RCw4REFBa0Q7SUE4RGxELDRGQUE0RjtJQUMvRSxRQUFBLDJCQUEyQixHQUNwQyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBR3pFOzs7O09BSUc7SUFDVSxRQUFBLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQztJQUUvQzs7T0FFRztJQUNVLFFBQUEsd0JBQXdCLEdBQUcsMEJBQTBCLENBQUM7SUFjbkU7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsRUFBYyxFQUFFLE1BQXlCLEVBQUUsTUFBYyxFQUFFLFdBQTJCLEVBQ3RGLGNBQThCO1FBQ2hDLElBQU0sZUFBZSxHQUFHLHFCQUFPLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hFLElBQU0sY0FBYyxHQUFHLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM5RCxJQUFNLGdCQUFnQixHQUNsQixNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDOUUsSUFBTSxTQUFTLEdBQUcsZ0JBQWdCLEtBQUssU0FBUyxDQUFDO1FBRWpELElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQzdD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QUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO2dCQUM3RCxPQUFPLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUM7YUFDdkM7U0FDRjtRQUFDLFdBQU07WUFDTixhQUFhO1NBQ2Q7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge3JlbGF0aXZlfSBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQge2Jhc2VuYW1lfSBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgam9pbiwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7cGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGV9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7cmVzb2x2ZUZpbGVXaXRoUG9zdGZpeGVzfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9uLCBOZ2NjRW50cnlQb2ludENvbmZpZ30gZnJvbSAnLi9jb25maWd1cmF0aW9uJztcblxuLyoqXG4gKiBUaGUgcG9zc2libGUgdmFsdWVzIGZvciB0aGUgZm9ybWF0IG9mIGFuIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgdHlwZSBFbnRyeVBvaW50Rm9ybWF0ID0gJ2VzbTUnfCdlc20yMDE1J3wndW1kJ3wnY29tbW9uanMnO1xuXG4vKipcbiAqIEFuIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uIGFib3V0IGFuIGVudHJ5LXBvaW50LCBpbmNsdWRpbmcgcGF0aHNcbiAqIHRvIGVhY2ggb2YgdGhlIHBvc3NpYmxlIGVudHJ5LXBvaW50IGZvcm1hdHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRW50cnlQb2ludCBleHRlbmRzIEpzb25PYmplY3Qge1xuICAvKiogVGhlIG5hbWUgb2YgdGhlIHBhY2thZ2UgKGUuZy4gYEBhbmd1bGFyL2NvcmVgKS4gKi9cbiAgbmFtZTogc3RyaW5nO1xuICAvKiogVGhlIHBhcnNlZCBwYWNrYWdlLmpzb24gZmlsZSBmb3IgdGhpcyBlbnRyeS1wb2ludC4gKi9cbiAgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbjtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoZSBwYWNrYWdlIHRoYXQgY29udGFpbnMgdGhpcyBlbnRyeS1wb2ludC4gKi9cbiAgcGFja2FnZTogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBUaGUgcGF0aCB0byB0aGlzIGVudHJ5IHBvaW50LiAqL1xuICBwYXRoOiBBYnNvbHV0ZUZzUGF0aDtcbiAgLyoqIFRoZSBwYXRoIHRvIGEgdHlwaW5ncyAoLmQudHMpIGZpbGUgZm9yIHRoaXMgZW50cnktcG9pbnQuICovXG4gIHR5cGluZ3M6IEFic29sdXRlRnNQYXRoO1xuICAvKiogSXMgdGhpcyBFbnRyeVBvaW50IGNvbXBpbGVkIHdpdGggdGhlIEFuZ3VsYXIgVmlldyBFbmdpbmUgY29tcGlsZXI/ICovXG4gIGNvbXBpbGVkQnlBbmd1bGFyOiBib29sZWFuO1xuICAvKiogU2hvdWxkIG5nY2MgaWdub3JlIG1pc3NpbmcgZGVwZW5kZW5jaWVzIGFuZCBwcm9jZXNzIHRoaXMgZW50cnlwb2ludCBhbnl3YXk/ICovXG4gIGlnbm9yZU1pc3NpbmdEZXBlbmRlbmNpZXM6IGJvb2xlYW47XG4gIC8qKiBTaG91bGQgbmdjYyBnZW5lcmF0ZSBkZWVwIHJlLWV4cG9ydHMgZm9yIHRoaXMgZW50cnlwb2ludD8gKi9cbiAgZ2VuZXJhdGVEZWVwUmVleHBvcnRzOiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBKc29uUHJpbWl0aXZlID0gc3RyaW5nfG51bWJlcnxib29sZWFufG51bGw7XG5leHBvcnQgdHlwZSBKc29uVmFsdWUgPSBKc29uUHJpbWl0aXZlfEpzb25BcnJheXxKc29uT2JqZWN0fHVuZGVmaW5lZDtcbmV4cG9ydCBpbnRlcmZhY2UgSnNvbkFycmF5IGV4dGVuZHMgQXJyYXk8SnNvblZhbHVlPiB7fVxuZXhwb3J0IGludGVyZmFjZSBKc29uT2JqZWN0IHtcbiAgW2tleTogc3RyaW5nXTogSnNvblZhbHVlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcCB7XG4gIGZlc20yMDE1Pzogc3RyaW5nO1xuICBmZXNtNT86IHN0cmluZztcbiAgZXMyMDE1Pzogc3RyaW5nOyAgLy8gaWYgZXhpc3RzIHRoZW4gaXQgaXMgYWN0dWFsbHkgRkVTTTIwMTVcbiAgZXNtMjAxNT86IHN0cmluZztcbiAgZXNtNT86IHN0cmluZztcbiAgbWFpbj86IHN0cmluZzsgICAgIC8vIFVNRFxuICBtb2R1bGU/OiBzdHJpbmc7ICAgLy8gaWYgZXhpc3RzIHRoZW4gaXQgaXMgYWN0dWFsbHkgRkVTTTVcbiAgdHlwZXM/OiBzdHJpbmc7ICAgIC8vIFN5bm9ueW1vdXMgdG8gYHR5cGluZ3NgIHByb3BlcnR5IC0gc2VlIGh0dHBzOi8vYml0Lmx5LzJPZ1dwMkhcbiAgdHlwaW5ncz86IHN0cmluZzsgIC8vIFR5cGVTY3JpcHQgLmQudHMgZmlsZXNcbn1cblxuZXhwb3J0IHR5cGUgUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzID0ga2V5b2YgUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzTWFwO1xuXG4vKipcbiAqIFRoZSBwcm9wZXJ0aWVzIHRoYXQgbWF5IGJlIGxvYWRlZCBmcm9tIHRoZSBgcGFja2FnZS5qc29uYCBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiBleHRlbmRzIEpzb25PYmplY3QsIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcCB7XG4gIG5hbWU6IHN0cmluZztcbiAgc2NyaXB0cz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIF9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgdHlwZSBFbnRyeVBvaW50SnNvblByb3BlcnR5ID0gRXhjbHVkZTxQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXMsICd0eXBlcyd8J3R5cGluZ3MnPjtcbi8vIFdlIG5lZWQgdG8ga2VlcCB0aGUgZWxlbWVudHMgb2YgdGhpcyBjb25zdCBhbmQgdGhlIGBFbnRyeVBvaW50SnNvblByb3BlcnR5YCB0eXBlIGluIHN5bmMuXG5leHBvcnQgY29uc3QgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPVxuICAgIFsnZmVzbTIwMTUnLCAnZmVzbTUnLCAnZXMyMDE1JywgJ2VzbTIwMTUnLCAnZXNtNScsICdtYWluJywgJ21vZHVsZSddO1xuXG5cbi8qKlxuICogVGhlIHBhdGggZG9lcyBub3QgcmVwcmVzZW50IGFuIGVudHJ5LXBvaW50OlxuICogKiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gYXQgdGhlIHBhdGggYW5kIHRoZXJlIGlzIG5vIGNvbmZpZyB0byBmb3JjZSBhbiBlbnRyeS1wb2ludFxuICogKiBvciB0aGUgZW50cnlwb2ludCBpcyBgaWdub3JlZGAgYnkgYSBjb25maWcuXG4gKi9cbmV4cG9ydCBjb25zdCBOT19FTlRSWV9QT0lOVCA9ICduby1lbnRyeS1wb2ludCc7XG5cbi8qKlxuICogVGhlIHBhdGggaGFzIGEgcGFja2FnZS5qc29uLCBidXQgaXQgaXMgbm90IGEgdmFsaWQgZW50cnktcG9pbnQgZm9yIG5nY2MgcHJvY2Vzc2luZy5cbiAqL1xuZXhwb3J0IGNvbnN0IElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCA9ICdpbmNvbXBhdGlibGUtZW50cnktcG9pbnQnO1xuXG4vKipcbiAqIFRoZSByZXN1bHQgb2YgY2FsbGluZyBgZ2V0RW50cnlQb2ludEluZm8oKWAuXG4gKlxuICogVGhpcyB3aWxsIGJlIGFuIGBFbnRyeVBvaW50YCBvYmplY3QgaWYgYW4gQW5ndWxhciBlbnRyeS1wb2ludCB3YXMgaWRlbnRpZmllZDtcbiAqIE90aGVyd2lzZSBpdCB3aWxsIGJlIGEgZmxhZyBpbmRpY2F0aW5nIG9uZSBvZjpcbiAqICogTk9fRU5UUllfUE9JTlQgLSB0aGUgcGF0aCBpcyBub3QgYW4gZW50cnktcG9pbnQgb3IgbmdjYyBpcyBjb25maWd1cmVkIHRvIGlnbm9yZSBpdFxuICogKiBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQgLSB0aGUgcGF0aCB3YXMgYSBub24tcHJvY2Vzc2FibGUgZW50cnktcG9pbnQgdGhhdCBzaG91bGQgYmUgc2VhcmNoZWRcbiAqIGZvciBzdWItZW50cnktcG9pbnRzXG4gKi9cbmV4cG9ydCB0eXBlIEdldEVudHJ5UG9pbnRSZXN1bHQgPSBFbnRyeVBvaW50fHR5cGVvZiBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlR8dHlwZW9mIE5PX0VOVFJZX1BPSU5UO1xuXG5cbi8qKlxuICogVHJ5IHRvIGNyZWF0ZSBhbiBlbnRyeS1wb2ludCBmcm9tIHRoZSBnaXZlbiBwYXRocyBhbmQgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0gcGFja2FnZVBhdGggdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGNvbnRhaW5pbmcgbnBtIHBhY2thZ2VcbiAqIEBwYXJhbSBlbnRyeVBvaW50UGF0aCB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcG90ZW50aWFsIGVudHJ5LXBvaW50LlxuICogQHJldHVybnNcbiAqIC0gQW4gZW50cnktcG9pbnQgaWYgaXQgaXMgdmFsaWQuXG4gKiAtIGBOT19FTlRSWV9QT0lOVGAgd2hlbiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gYXQgdGhlIHBhdGggYW5kIHRoZXJlIGlzIG5vIGNvbmZpZyB0byBmb3JjZSBhblxuICogZW50cnktcG9pbnQgb3IgdGhlIGVudHJ5cG9pbnQgaXMgYGlnbm9yZWRgLlxuICogLSBgSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UYCB0aGVyZSBpcyBhIHBhY2thZ2UuanNvbiBidXQgaXQgaXMgbm90IGEgdmFsaWQgQW5ndWxhciBjb21waWxlZFxuICogZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnRyeVBvaW50SW5mbyhcbiAgICBmczogRmlsZVN5c3RlbSwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgbG9nZ2VyOiBMb2dnZXIsIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBHZXRFbnRyeVBvaW50UmVzdWx0IHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlVmVyc2lvbiA9IGdldFBhY2thZ2VWZXJzaW9uKGZzLCBwYWNrYWdlSnNvblBhdGgpO1xuICBjb25zdCBlbnRyeVBvaW50Q29uZmlnID1cbiAgICAgIGNvbmZpZy5nZXRDb25maWcocGFja2FnZVBhdGgsIHBhY2thZ2VWZXJzaW9uKS5lbnRyeVBvaW50c1tlbnRyeVBvaW50UGF0aF07XG4gIGNvbnN0IGhhc0NvbmZpZyA9IGVudHJ5UG9pbnRDb25maWcgIT09IHVuZGVmaW5lZDtcblxuICBpZiAoIWhhc0NvbmZpZyAmJiAhZnMuZXhpc3RzKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAvLyBObyBwYWNrYWdlLmpzb24gYW5kIG5vIGNvbmZpZ1xuICAgIHJldHVybiBOT19FTlRSWV9QT0lOVDtcbiAgfVxuXG4gIGlmIChoYXNDb25maWcgJiYgZW50cnlQb2ludENvbmZpZy5pZ25vcmUgPT09IHRydWUpIHtcbiAgICAvLyBFeHBsaWNpdGx5IGlnbm9yZWRcbiAgICByZXR1cm4gTk9fRU5UUllfUE9JTlQ7XG4gIH1cblxuICBjb25zdCBsb2FkZWRFbnRyeVBvaW50UGFja2FnZUpzb24gPSBsb2FkRW50cnlQb2ludFBhY2thZ2UoZnMsIGxvZ2dlciwgcGFja2FnZUpzb25QYXRoLCBoYXNDb25maWcpO1xuICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBoYXNDb25maWcgP1xuICAgICAgbWVyZ2VDb25maWdBbmRQYWNrYWdlSnNvbihcbiAgICAgICAgICBsb2FkZWRFbnRyeVBvaW50UGFja2FnZUpzb24sIGVudHJ5UG9pbnRDb25maWcsIHBhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCkgOlxuICAgICAgbG9hZGVkRW50cnlQb2ludFBhY2thZ2VKc29uO1xuXG4gIGlmIChlbnRyeVBvaW50UGFja2FnZUpzb24gPT09IG51bGwpIHtcbiAgICAvLyBwYWNrYWdlLmpzb24gZXhpc3RzIGJ1dCBjb3VsZCBub3QgYmUgcGFyc2VkIGFuZCB0aGVyZSB3YXMgbm8gcmVkZWVtaW5nIGNvbmZpZ1xuICAgIHJldHVybiBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQ7XG4gIH1cblxuICBjb25zdCB0eXBpbmdzID0gZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGluZ3MgfHwgZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGVzIHx8XG4gICAgICBndWVzc1R5cGluZ3NGcm9tUGFja2FnZUpzb24oZnMsIGVudHJ5UG9pbnRQYXRoLCBlbnRyeVBvaW50UGFja2FnZUpzb24pO1xuICBpZiAodHlwZW9mIHR5cGluZ3MgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gTWlzc2luZyB0aGUgcmVxdWlyZWQgYHR5cGluZ3NgIHByb3BlcnR5XG4gICAgcmV0dXJuIElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVDtcbiAgfVxuXG4gIC8vIEFuIGVudHJ5LXBvaW50IGlzIGFzc3VtZWQgdG8gYmUgY29tcGlsZWQgYnkgQW5ndWxhciBpZiB0aGVyZSBpcyBlaXRoZXI6XG4gIC8vICogYSBgbWV0YWRhdGEuanNvbmAgZmlsZSBuZXh0IHRvIHRoZSB0eXBpbmdzIGVudHJ5LXBvaW50XG4gIC8vICogYSBjdXN0b20gY29uZmlnIGZvciB0aGlzIGVudHJ5LXBvaW50XG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9IHJlc29sdmUoZW50cnlQb2ludFBhdGgsIHR5cGluZ3MucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcnKSArICcubWV0YWRhdGEuanNvbicpO1xuICBjb25zdCBjb21waWxlZEJ5QW5ndWxhciA9IGVudHJ5UG9pbnRDb25maWcgIT09IHVuZGVmaW5lZCB8fCBmcy5leGlzdHMobWV0YWRhdGFQYXRoKTtcblxuICBjb25zdCBlbnRyeVBvaW50SW5mbzogRW50cnlQb2ludCA9IHtcbiAgICBuYW1lOiBlbnRyeVBvaW50UGFja2FnZUpzb24ubmFtZSxcbiAgICBwYWNrYWdlSnNvbjogZW50cnlQb2ludFBhY2thZ2VKc29uLFxuICAgIHBhY2thZ2U6IHBhY2thZ2VQYXRoLFxuICAgIHBhdGg6IGVudHJ5UG9pbnRQYXRoLFxuICAgIHR5cGluZ3M6IHJlc29sdmUoZW50cnlQb2ludFBhdGgsIHR5cGluZ3MpLFxuICAgIGNvbXBpbGVkQnlBbmd1bGFyLFxuICAgIGlnbm9yZU1pc3NpbmdEZXBlbmRlbmNpZXM6XG4gICAgICAgIGVudHJ5UG9pbnRDb25maWcgIT09IHVuZGVmaW5lZCA/ICEhZW50cnlQb2ludENvbmZpZy5pZ25vcmVNaXNzaW5nRGVwZW5kZW5jaWVzIDogZmFsc2UsXG4gICAgZ2VuZXJhdGVEZWVwUmVleHBvcnRzOlxuICAgICAgICBlbnRyeVBvaW50Q29uZmlnICE9PSB1bmRlZmluZWQgPyAhIWVudHJ5UG9pbnRDb25maWcuZ2VuZXJhdGVEZWVwUmVleHBvcnRzIDogZmFsc2UsXG4gIH07XG5cbiAgcmV0dXJuIGVudHJ5UG9pbnRJbmZvO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBwYWNrYWdlLmpzb24gcHJvcGVydHkgaW50byBhbiBlbnRyeS1wb2ludCBmb3JtYXQuXG4gKlxuICogQHBhcmFtIHByb3BlcnR5IFRoZSBwcm9wZXJ0eSB0byBjb252ZXJ0IHRvIGEgZm9ybWF0LlxuICogQHJldHVybnMgQW4gZW50cnktcG9pbnQgZm9ybWF0IG9yIGB1bmRlZmluZWRgIGlmIG5vbmUgbWF0Y2ggdGhlIGdpdmVuIHByb3BlcnR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludEZvcm1hdChcbiAgICBmczogRmlsZVN5c3RlbSwgZW50cnlQb2ludDogRW50cnlQb2ludCwgcHJvcGVydHk6IEVudHJ5UG9pbnRKc29uUHJvcGVydHkpOiBFbnRyeVBvaW50Rm9ybWF0fFxuICAgIHVuZGVmaW5lZCB7XG4gIHN3aXRjaCAocHJvcGVydHkpIHtcbiAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICByZXR1cm4gJ2VzbTIwMTUnO1xuICAgIGNhc2UgJ2Zlc201JzpcbiAgICAgIHJldHVybiAnZXNtNSc7XG4gICAgY2FzZSAnZXMyMDE1JzpcbiAgICAgIHJldHVybiAnZXNtMjAxNSc7XG4gICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICByZXR1cm4gJ2VzbTIwMTUnO1xuICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgcmV0dXJuICdlc201JztcbiAgICBjYXNlICdtYWluJzpcbiAgICAgIGNvbnN0IG1haW5GaWxlID0gZW50cnlQb2ludC5wYWNrYWdlSnNvblsnbWFpbiddO1xuICAgICAgaWYgKG1haW5GaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhdGhUb01haW4gPSBqb2luKGVudHJ5UG9pbnQucGF0aCwgbWFpbkZpbGUpO1xuICAgICAgcmV0dXJuIGlzVW1kTW9kdWxlKGZzLCBwYXRoVG9NYWluKSA/ICd1bWQnIDogJ2NvbW1vbmpzJztcbiAgICBjYXNlICdtb2R1bGUnOlxuICAgICAgcmV0dXJuICdlc201JztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlcyB0aGUgSlNPTiBmcm9tIGEgcGFja2FnZS5qc29uIGZpbGUuXG4gKiBAcGFyYW0gcGFja2FnZUpzb25QYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlLmpzb24gZmlsZS5cbiAqIEByZXR1cm5zIEpTT04gZnJvbSB0aGUgcGFja2FnZS5qc29uIGZpbGUgaWYgaXQgaXMgdmFsaWQsIGBudWxsYCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGxvYWRFbnRyeVBvaW50UGFja2FnZShcbiAgICBmczogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgaGFzQ29uZmlnOiBib29sZWFuKTogRW50cnlQb2ludFBhY2thZ2VKc29ufG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKCFoYXNDb25maWcpIHtcbiAgICAgIC8vIFdlIG1heSBoYXZlIHJ1biBpbnRvIGEgcGFja2FnZS5qc29uIHdpdGggdW5leHBlY3RlZCBzeW1ib2xzXG4gICAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIHJlYWQgZW50cnkgcG9pbnQgaW5mbyBmcm9tICR7cGFja2FnZUpzb25QYXRofSB3aXRoIGVycm9yICR7ZX0uYCk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzVW1kTW9kdWxlKGZzOiBGaWxlU3lzdGVtLCBzb3VyY2VGaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcmVzb2x2ZUZpbGVXaXRoUG9zdGZpeGVzKGZzLCBzb3VyY2VGaWxlUGF0aCwgWycnLCAnLmpzJywgJy9pbmRleC5qcyddKTtcbiAgaWYgKHJlc29sdmVkUGF0aCA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBzb3VyY2VGaWxlID1cbiAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoc291cmNlRmlsZVBhdGgsIGZzLnJlYWRGaWxlKHJlc29sdmVkUGF0aCksIHRzLlNjcmlwdFRhcmdldC5FUzUpO1xuICByZXR1cm4gc291cmNlRmlsZS5zdGF0ZW1lbnRzLmxlbmd0aCA+IDAgJiZcbiAgICAgIHBhcnNlU3RhdGVtZW50Rm9yVW1kTW9kdWxlKHNvdXJjZUZpbGUuc3RhdGVtZW50c1swXSkgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIG1lcmdlQ29uZmlnQW5kUGFja2FnZUpzb24oXG4gICAgZW50cnlQb2ludFBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb258bnVsbCwgZW50cnlQb2ludENvbmZpZzogTmdjY0VudHJ5UG9pbnRDb25maWcsXG4gICAgcGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50UGFja2FnZUpzb24ge1xuICBpZiAoZW50cnlQb2ludFBhY2thZ2VKc29uICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIHsuLi5lbnRyeVBvaW50UGFja2FnZUpzb24sIC4uLmVudHJ5UG9pbnRDb25maWcub3ZlcnJpZGV9O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IG5hbWUgPSBgJHtiYXNlbmFtZShwYWNrYWdlUGF0aCl9LyR7cmVsYXRpdmUocGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoKX1gO1xuICAgIHJldHVybiB7bmFtZSwgLi4uZW50cnlQb2ludENvbmZpZy5vdmVycmlkZX07XG4gIH1cbn1cblxuZnVuY3Rpb24gZ3Vlc3NUeXBpbmdzRnJvbVBhY2thZ2VKc29uKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgZW50cnlQb2ludFBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24pOiBBYnNvbHV0ZUZzUGF0aHxudWxsIHtcbiAgZm9yIChjb25zdCBwcm9wIG9mIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykge1xuICAgIGNvbnN0IGZpZWxkID0gZW50cnlQb2ludFBhY2thZ2VKc29uW3Byb3BdO1xuICAgIGlmICh0eXBlb2YgZmllbGQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBTb21lIGNyYXp5IHBhY2thZ2VzIGhhdmUgdGhpbmdzIGxpa2UgYXJyYXlzIGluIHRoZXNlIGZpZWxkcyFcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCByZWxhdGl2ZVR5cGluZ3NQYXRoID0gZmllbGQucmVwbGFjZSgvXFwuanMkLywgJy5kLnRzJyk7XG4gICAgY29uc3QgdHlwaW5nc1BhdGggPSByZXNvbHZlKGVudHJ5UG9pbnRQYXRoLCByZWxhdGl2ZVR5cGluZ3NQYXRoKTtcbiAgICBpZiAoZnMuZXhpc3RzKHR5cGluZ3NQYXRoKSkge1xuICAgICAgcmV0dXJuIHR5cGluZ3NQYXRoO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIGF0IGBwYWNrYWdlSnNvblBhdGhgLlxuICpcbiAqIEByZXR1cm5zIHRoZSB2ZXJzaW9uIHN0cmluZyBvciBgbnVsbGAgaWYgdGhlIHBhY2thZ2UuanNvbiBkb2VzIG5vdCBleGlzdCBvciBpcyBpbnZhbGlkLlxuICovXG5mdW5jdGlvbiBnZXRQYWNrYWdlVmVyc2lvbihmczogRmlsZVN5c3RlbSwgcGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZ3xudWxsIHtcbiAgdHJ5IHtcbiAgICBpZiAoZnMuZXhpc3RzKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcbiAgICAgIHJldHVybiBwYWNrYWdlSnNvblsndmVyc2lvbiddIHx8IG51bGw7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=