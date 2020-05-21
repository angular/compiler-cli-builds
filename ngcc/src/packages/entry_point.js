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
    exports.getEntryPointFormat = exports.getEntryPointInfo = exports.INCOMPATIBLE_ENTRY_POINT = exports.NO_ENTRY_POINT = exports.SUPPORTED_FORMAT_PROPERTIES = void 0;
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
    exports.SUPPORTED_FORMAT_PROPERTIES = ['fesm2015', 'fesm5', 'es2015', 'esm2015', 'esm5', 'main', 'module', 'browser'];
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
        var entryPointConfig = config.getPackageConfig(packagePath, packageVersion).entryPoints[entryPointPath];
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
            case 'browser':
                var browserFile = entryPoint.packageJson['browser'];
                if (typeof browserFile !== 'string') {
                    return undefined;
                }
                return sniffModuleFormat(fs, file_system_1.join(entryPoint.path, browserFile));
            case 'main':
                var mainFile = entryPoint.packageJson['main'];
                if (mainFile === undefined) {
                    return undefined;
                }
                return sniffModuleFormat(fs, file_system_1.join(entryPoint.path, mainFile));
            case 'module':
                var moduleFilePath = entryPoint.packageJson['module'];
                // As of version 10, the `module` property in `package.json` should point to
                // the ESM2015 format output as per Angular Package format specification. This
                // means that the `module` property captures multiple formats, as old libraries
                // built with the old APF can still be processed. We detect the format by checking
                // the paths that should be used as per APF specification.
                if (typeof moduleFilePath === 'string' && moduleFilePath.includes('esm2015')) {
                    return "esm2015";
                }
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
    function sniffModuleFormat(fs, sourceFilePath) {
        var resolvedPath = utils_1.resolveFileWithPostfixes(fs, sourceFilePath, ['', '.js', '/index.js']);
        if (resolvedPath === null) {
            return undefined;
        }
        var sourceFile = ts.createSourceFile(sourceFilePath, fs.readFile(resolvedPath), ts.ScriptTarget.ES5);
        if (sourceFile.statements.length === 0) {
            return undefined;
        }
        if (ts.isExternalModule(sourceFile)) {
            return 'esm5';
        }
        else if (umd_host_1.parseStatementForUmdModule(sourceFile.statements[0]) !== null) {
            return 'umd';
        }
        else {
            return 'commonjs';
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlEQUF3QztJQUN4Qyw2QkFBOEI7SUFDOUIsK0JBQWlDO0lBQ2pDLDJFQUF5RjtJQUN6Rix5RUFBNEQ7SUFFNUQsOERBQWtEO0lBK0RsRCw0RkFBNEY7SUFDL0UsUUFBQSwyQkFBMkIsR0FDcEMsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFHcEY7Ozs7T0FJRztJQUNVLFFBQUEsY0FBYyxHQUFHLGdCQUFnQixDQUFDO0lBRS9DOztPQUVHO0lBQ1UsUUFBQSx3QkFBd0IsR0FBRywwQkFBMEIsQ0FBQztJQWNuRTs7Ozs7Ozs7Ozs7T0FXRztJQUNILFNBQWdCLGlCQUFpQixDQUM3QixFQUFjLEVBQUUsTUFBeUIsRUFBRSxNQUFjLEVBQUUsV0FBMkIsRUFDdEYsY0FBOEI7UUFDaEMsSUFBTSxlQUFlLEdBQUcscUJBQU8sQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDaEUsSUFBTSxjQUFjLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzlELElBQU0sZ0JBQWdCLEdBQ2xCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3JGLElBQU0sU0FBUyxHQUFHLGdCQUFnQixLQUFLLFNBQVMsQ0FBQztRQUVqRCxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENB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LEtBQW1CLElBQUEsZ0NBQUEsaUJBQUEsbUNBQTJCLENBQUEsd0VBQUEsaUhBQUU7Z0JBQTNDLElBQU0sSUFBSSx3Q0FBQTtnQkFDYixJQUFNLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7b0JBQzdCLCtEQUErRDtvQkFDL0QsU0FBUztpQkFDVjtnQkFDRCxJQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUM1RCxJQUFNLFdBQVcsR0FBRyxxQkFBTyxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNqRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUU7b0JBQzFCLE9BQU8sV0FBVyxDQUFDO2lCQUNwQjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxFQUFjLEVBQUUsZUFBK0I7UUFDeEUsSUFBSTtZQUNGLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDOUIsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQzdELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQzthQUN2QztTQUNGO1FBQUMsV0FBTTtZQUNOLGFBQWE7U0FDZDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7cmVsYXRpdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7YmFzZW5hbWV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBqb2luLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtwYXJzZVN0YXRlbWVudEZvclVtZE1vZHVsZX0gZnJvbSAnLi4vaG9zdC91bWRfaG9zdCc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtyZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXN9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb24sIE5nY2NFbnRyeVBvaW50Q29uZmlnfSBmcm9tICcuL2NvbmZpZ3VyYXRpb24nO1xuXG4vKipcbiAqIFRoZSBwb3NzaWJsZSB2YWx1ZXMgZm9yIHRoZSBmb3JtYXQgb2YgYW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCB0eXBlIEVudHJ5UG9pbnRGb3JtYXQgPSAnZXNtNSd8J2VzbTIwMTUnfCd1bWQnfCdjb21tb25qcyc7XG5cbi8qKlxuICogQW4gb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24gYWJvdXQgYW4gZW50cnktcG9pbnQsIGluY2x1ZGluZyBwYXRoc1xuICogdG8gZWFjaCBvZiB0aGUgcG9zc2libGUgZW50cnktcG9pbnQgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50IGV4dGVuZHMgSnNvbk9iamVjdCB7XG4gIC8qKiBUaGUgbmFtZSBvZiB0aGUgcGFja2FnZSAoZS5nLiBgQGFuZ3VsYXIvY29yZWApLiAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKiBUaGUgcGFyc2VkIHBhY2thZ2UuanNvbiBmaWxlIGZvciB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uO1xuICAvKiogVGhlIHBhdGggdG8gdGhlIHBhY2thZ2UgdGhhdCBjb250YWlucyB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICBwYWNrYWdlOiBBYnNvbHV0ZUZzUGF0aDtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoaXMgZW50cnkgcG9pbnQuICovXG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuICAvKiogVGhlIHBhdGggdG8gYSB0eXBpbmdzICguZC50cykgZmlsZSBmb3IgdGhpcyBlbnRyeS1wb2ludC4gKi9cbiAgdHlwaW5nczogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBJcyB0aGlzIEVudHJ5UG9pbnQgY29tcGlsZWQgd2l0aCB0aGUgQW5ndWxhciBWaWV3IEVuZ2luZSBjb21waWxlcj8gKi9cbiAgY29tcGlsZWRCeUFuZ3VsYXI6IGJvb2xlYW47XG4gIC8qKiBTaG91bGQgbmdjYyBpZ25vcmUgbWlzc2luZyBkZXBlbmRlbmNpZXMgYW5kIHByb2Nlc3MgdGhpcyBlbnRyeXBvaW50IGFueXdheT8gKi9cbiAgaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llczogYm9vbGVhbjtcbiAgLyoqIFNob3VsZCBuZ2NjIGdlbmVyYXRlIGRlZXAgcmUtZXhwb3J0cyBmb3IgdGhpcyBlbnRyeXBvaW50PyAqL1xuICBnZW5lcmF0ZURlZXBSZWV4cG9ydHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIEpzb25QcmltaXRpdmUgPSBzdHJpbmd8bnVtYmVyfGJvb2xlYW58bnVsbDtcbmV4cG9ydCB0eXBlIEpzb25WYWx1ZSA9IEpzb25QcmltaXRpdmV8SnNvbkFycmF5fEpzb25PYmplY3R8dW5kZWZpbmVkO1xuZXhwb3J0IGludGVyZmFjZSBKc29uQXJyYXkgZXh0ZW5kcyBBcnJheTxKc29uVmFsdWU+IHt9XG5leHBvcnQgaW50ZXJmYWNlIEpzb25PYmplY3Qge1xuICBba2V5OiBzdHJpbmddOiBKc29uVmFsdWU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzTWFwIHtcbiAgYnJvd3Nlcj86IHN0cmluZztcbiAgZmVzbTIwMTU/OiBzdHJpbmc7XG4gIGZlc201Pzogc3RyaW5nO1xuICBlczIwMTU/OiBzdHJpbmc7ICAvLyBpZiBleGlzdHMgdGhlbiBpdCBpcyBhY3R1YWxseSBGRVNNMjAxNVxuICBlc20yMDE1Pzogc3RyaW5nO1xuICBlc201Pzogc3RyaW5nO1xuICBtYWluPzogc3RyaW5nOyAgICAgLy8gVU1EXG4gIG1vZHVsZT86IHN0cmluZzsgICAvLyBpZiBleGlzdHMgdGhlbiBpdCBpcyBhY3R1YWxseSBGRVNNNVxuICB0eXBlcz86IHN0cmluZzsgICAgLy8gU3lub255bW91cyB0byBgdHlwaW5nc2AgcHJvcGVydHkgLSBzZWUgaHR0cHM6Ly9iaXQubHkvMk9nV3AySFxuICB0eXBpbmdzPzogc3RyaW5nOyAgLy8gVHlwZVNjcmlwdCAuZC50cyBmaWxlc1xufVxuXG5leHBvcnQgdHlwZSBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXMgPSBrZXlvZiBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXA7XG5cbi8qKlxuICogVGhlIHByb3BlcnRpZXMgdGhhdCBtYXkgYmUgbG9hZGVkIGZyb20gdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRW50cnlQb2ludFBhY2thZ2VKc29uIGV4dGVuZHMgSnNvbk9iamVjdCwgUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzTWFwIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY3JpcHRzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfXz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCB0eXBlIEVudHJ5UG9pbnRKc29uUHJvcGVydHkgPSBFeGNsdWRlPFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcywgJ3R5cGVzJ3wndHlwaW5ncyc+O1xuLy8gV2UgbmVlZCB0byBrZWVwIHRoZSBlbGVtZW50cyBvZiB0aGlzIGNvbnN0IGFuZCB0aGUgYEVudHJ5UG9pbnRKc29uUHJvcGVydHlgIHR5cGUgaW4gc3luYy5cbmV4cG9ydCBjb25zdCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVM6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9XG4gICAgWydmZXNtMjAxNScsICdmZXNtNScsICdlczIwMTUnLCAnZXNtMjAxNScsICdlc201JywgJ21haW4nLCAnbW9kdWxlJywgJ2Jyb3dzZXInXTtcblxuXG4vKipcbiAqIFRoZSBwYXRoIGRvZXMgbm90IHJlcHJlc2VudCBhbiBlbnRyeS1wb2ludDpcbiAqICogdGhlcmUgaXMgbm8gcGFja2FnZS5qc29uIGF0IHRoZSBwYXRoIGFuZCB0aGVyZSBpcyBubyBjb25maWcgdG8gZm9yY2UgYW4gZW50cnktcG9pbnRcbiAqICogb3IgdGhlIGVudHJ5cG9pbnQgaXMgYGlnbm9yZWRgIGJ5IGEgY29uZmlnLlxuICovXG5leHBvcnQgY29uc3QgTk9fRU5UUllfUE9JTlQgPSAnbm8tZW50cnktcG9pbnQnO1xuXG4vKipcbiAqIFRoZSBwYXRoIGhhcyBhIHBhY2thZ2UuanNvbiwgYnV0IGl0IGlzIG5vdCBhIHZhbGlkIGVudHJ5LXBvaW50IGZvciBuZ2NjIHByb2Nlc3NpbmcuXG4gKi9cbmV4cG9ydCBjb25zdCBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQgPSAnaW5jb21wYXRpYmxlLWVudHJ5LXBvaW50JztcblxuLyoqXG4gKiBUaGUgcmVzdWx0IG9mIGNhbGxpbmcgYGdldEVudHJ5UG9pbnRJbmZvKClgLlxuICpcbiAqIFRoaXMgd2lsbCBiZSBhbiBgRW50cnlQb2ludGAgb2JqZWN0IGlmIGFuIEFuZ3VsYXIgZW50cnktcG9pbnQgd2FzIGlkZW50aWZpZWQ7XG4gKiBPdGhlcndpc2UgaXQgd2lsbCBiZSBhIGZsYWcgaW5kaWNhdGluZyBvbmUgb2Y6XG4gKiAqIE5PX0VOVFJZX1BPSU5UIC0gdGhlIHBhdGggaXMgbm90IGFuIGVudHJ5LXBvaW50IG9yIG5nY2MgaXMgY29uZmlndXJlZCB0byBpZ25vcmUgaXRcbiAqICogSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UIC0gdGhlIHBhdGggd2FzIGEgbm9uLXByb2Nlc3NhYmxlIGVudHJ5LXBvaW50IHRoYXQgc2hvdWxkIGJlIHNlYXJjaGVkXG4gKiBmb3Igc3ViLWVudHJ5LXBvaW50c1xuICovXG5leHBvcnQgdHlwZSBHZXRFbnRyeVBvaW50UmVzdWx0ID0gRW50cnlQb2ludHx0eXBlb2YgSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UfHR5cGVvZiBOT19FTlRSWV9QT0lOVDtcblxuXG4vKipcbiAqIFRyeSB0byBjcmVhdGUgYW4gZW50cnktcG9pbnQgZnJvbSB0aGUgZ2l2ZW4gcGF0aHMgYW5kIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHBhY2thZ2VQYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBjb250YWluaW5nIG5wbSBwYWNrYWdlXG4gKiBAcGFyYW0gZW50cnlQb2ludFBhdGggdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBvdGVudGlhbCBlbnRyeS1wb2ludC5cbiAqIEByZXR1cm5zXG4gKiAtIEFuIGVudHJ5LXBvaW50IGlmIGl0IGlzIHZhbGlkLlxuICogLSBgTk9fRU5UUllfUE9JTlRgIHdoZW4gdGhlcmUgaXMgbm8gcGFja2FnZS5qc29uIGF0IHRoZSBwYXRoIGFuZCB0aGVyZSBpcyBubyBjb25maWcgdG8gZm9yY2UgYW5cbiAqIGVudHJ5LXBvaW50IG9yIHRoZSBlbnRyeXBvaW50IGlzIGBpZ25vcmVkYC5cbiAqIC0gYElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVGAgdGhlcmUgaXMgYSBwYWNrYWdlLmpzb24gYnV0IGl0IGlzIG5vdCBhIHZhbGlkIEFuZ3VsYXIgY29tcGlsZWRcbiAqIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludEluZm8oXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIGxvZ2dlcjogTG9nZ2VyLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogR2V0RW50cnlQb2ludFJlc3VsdCB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUoZW50cnlQb2ludFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGFja2FnZVZlcnNpb24gPSBnZXRQYWNrYWdlVmVyc2lvbihmcywgcGFja2FnZUpzb25QYXRoKTtcbiAgY29uc3QgZW50cnlQb2ludENvbmZpZyA9XG4gICAgICBjb25maWcuZ2V0UGFja2FnZUNvbmZpZyhwYWNrYWdlUGF0aCwgcGFja2FnZVZlcnNpb24pLmVudHJ5UG9pbnRzW2VudHJ5UG9pbnRQYXRoXTtcbiAgY29uc3QgaGFzQ29uZmlnID0gZW50cnlQb2ludENvbmZpZyAhPT0gdW5kZWZpbmVkO1xuXG4gIGlmICghaGFzQ29uZmlnICYmICFmcy5leGlzdHMocGFja2FnZUpzb25QYXRoKSkge1xuICAgIC8vIE5vIHBhY2thZ2UuanNvbiBhbmQgbm8gY29uZmlnXG4gICAgcmV0dXJuIE5PX0VOVFJZX1BPSU5UO1xuICB9XG5cbiAgaWYgKGhhc0NvbmZpZyAmJiBlbnRyeVBvaW50Q29uZmlnLmlnbm9yZSA9PT0gdHJ1ZSkge1xuICAgIC8vIEV4cGxpY2l0bHkgaWdub3JlZFxuICAgIHJldHVybiBOT19FTlRSWV9QT0lOVDtcbiAgfVxuXG4gIGNvbnN0IGxvYWRlZEVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9IGxvYWRFbnRyeVBvaW50UGFja2FnZShmcywgbG9nZ2VyLCBwYWNrYWdlSnNvblBhdGgsIGhhc0NvbmZpZyk7XG4gIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9IGhhc0NvbmZpZyA/XG4gICAgICBtZXJnZUNvbmZpZ0FuZFBhY2thZ2VKc29uKFxuICAgICAgICAgIGxvYWRlZEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgZW50cnlQb2ludENvbmZpZywgcGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoKSA6XG4gICAgICBsb2FkZWRFbnRyeVBvaW50UGFja2FnZUpzb247XG5cbiAgaWYgKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9PT0gbnVsbCkge1xuICAgIC8vIHBhY2thZ2UuanNvbiBleGlzdHMgYnV0IGNvdWxkIG5vdCBiZSBwYXJzZWQgYW5kIHRoZXJlIHdhcyBubyByZWRlZW1pbmcgY29uZmlnXG4gICAgcmV0dXJuIElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVDtcbiAgfVxuXG4gIGNvbnN0IHR5cGluZ3MgPSBlbnRyeVBvaW50UGFja2FnZUpzb24udHlwaW5ncyB8fCBlbnRyeVBvaW50UGFja2FnZUpzb24udHlwZXMgfHxcbiAgICAgIGd1ZXNzVHlwaW5nc0Zyb21QYWNrYWdlSnNvbihmcywgZW50cnlQb2ludFBhdGgsIGVudHJ5UG9pbnRQYWNrYWdlSnNvbik7XG4gIGlmICh0eXBlb2YgdHlwaW5ncyAhPT0gJ3N0cmluZycpIHtcbiAgICAvLyBNaXNzaW5nIHRoZSByZXF1aXJlZCBgdHlwaW5nc2AgcHJvcGVydHlcbiAgICByZXR1cm4gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UO1xuICB9XG5cbiAgLy8gQW4gZW50cnktcG9pbnQgaXMgYXNzdW1lZCB0byBiZSBjb21waWxlZCBieSBBbmd1bGFyIGlmIHRoZXJlIGlzIGVpdGhlcjpcbiAgLy8gKiBhIGBtZXRhZGF0YS5qc29uYCBmaWxlIG5leHQgdG8gdGhlIHR5cGluZ3MgZW50cnktcG9pbnRcbiAgLy8gKiBhIGN1c3RvbSBjb25maWcgZm9yIHRoaXMgZW50cnktcG9pbnRcbiAgY29uc3QgbWV0YWRhdGFQYXRoID0gcmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgdHlwaW5ncy5yZXBsYWNlKC9cXC5kXFwudHMkLywgJycpICsgJy5tZXRhZGF0YS5qc29uJyk7XG4gIGNvbnN0IGNvbXBpbGVkQnlBbmd1bGFyID0gZW50cnlQb2ludENvbmZpZyAhPT0gdW5kZWZpbmVkIHx8IGZzLmV4aXN0cyhtZXRhZGF0YVBhdGgpO1xuXG4gIGNvbnN0IGVudHJ5UG9pbnRJbmZvOiBFbnRyeVBvaW50ID0ge1xuICAgIG5hbWU6IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi5uYW1lLFxuICAgIHBhY2thZ2VKc29uOiBlbnRyeVBvaW50UGFja2FnZUpzb24sXG4gICAgcGFja2FnZTogcGFja2FnZVBhdGgsXG4gICAgcGF0aDogZW50cnlQb2ludFBhdGgsXG4gICAgdHlwaW5nczogcmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgdHlwaW5ncyksXG4gICAgY29tcGlsZWRCeUFuZ3VsYXIsXG4gICAgaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llczpcbiAgICAgICAgZW50cnlQb2ludENvbmZpZyAhPT0gdW5kZWZpbmVkID8gISFlbnRyeVBvaW50Q29uZmlnLmlnbm9yZU1pc3NpbmdEZXBlbmRlbmNpZXMgOiBmYWxzZSxcbiAgICBnZW5lcmF0ZURlZXBSZWV4cG9ydHM6XG4gICAgICAgIGVudHJ5UG9pbnRDb25maWcgIT09IHVuZGVmaW5lZCA/ICEhZW50cnlQb2ludENvbmZpZy5nZW5lcmF0ZURlZXBSZWV4cG9ydHMgOiBmYWxzZSxcbiAgfTtcblxuICByZXR1cm4gZW50cnlQb2ludEluZm87XG59XG5cbi8qKlxuICogQ29udmVydCBhIHBhY2thZ2UuanNvbiBwcm9wZXJ0eSBpbnRvIGFuIGVudHJ5LXBvaW50IGZvcm1hdC5cbiAqXG4gKiBAcGFyYW0gcHJvcGVydHkgVGhlIHByb3BlcnR5IHRvIGNvbnZlcnQgdG8gYSBmb3JtYXQuXG4gKiBAcmV0dXJucyBBbiBlbnRyeS1wb2ludCBmb3JtYXQgb3IgYHVuZGVmaW5lZGAgaWYgbm9uZSBtYXRjaCB0aGUgZ2l2ZW4gcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnRyeVBvaW50Rm9ybWF0KFxuICAgIGZzOiBGaWxlU3lzdGVtLCBlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBwcm9wZXJ0eTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eSk6IEVudHJ5UG9pbnRGb3JtYXR8XG4gICAgdW5kZWZpbmVkIHtcbiAgc3dpdGNoIChwcm9wZXJ0eSkge1xuICAgIGNhc2UgJ2Zlc20yMDE1JzpcbiAgICAgIHJldHVybiAnZXNtMjAxNSc7XG4gICAgY2FzZSAnZmVzbTUnOlxuICAgICAgcmV0dXJuICdlc201JztcbiAgICBjYXNlICdlczIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgIHJldHVybiAnZXNtMjAxNSc7XG4gICAgY2FzZSAnZXNtNSc6XG4gICAgICByZXR1cm4gJ2VzbTUnO1xuICAgIGNhc2UgJ2Jyb3dzZXInOlxuICAgICAgY29uc3QgYnJvd3NlckZpbGUgPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uWydicm93c2VyJ107XG4gICAgICBpZiAodHlwZW9mIGJyb3dzZXJGaWxlICE9PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNuaWZmTW9kdWxlRm9ybWF0KGZzLCBqb2luKGVudHJ5UG9pbnQucGF0aCwgYnJvd3NlckZpbGUpKTtcbiAgICBjYXNlICdtYWluJzpcbiAgICAgIGNvbnN0IG1haW5GaWxlID0gZW50cnlQb2ludC5wYWNrYWdlSnNvblsnbWFpbiddO1xuICAgICAgaWYgKG1haW5GaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzbmlmZk1vZHVsZUZvcm1hdChmcywgam9pbihlbnRyeVBvaW50LnBhdGgsIG1haW5GaWxlKSk7XG4gICAgY2FzZSAnbW9kdWxlJzpcbiAgICAgIGNvbnN0IG1vZHVsZUZpbGVQYXRoID0gZW50cnlQb2ludC5wYWNrYWdlSnNvblsnbW9kdWxlJ107XG4gICAgICAvLyBBcyBvZiB2ZXJzaW9uIDEwLCB0aGUgYG1vZHVsZWAgcHJvcGVydHkgaW4gYHBhY2thZ2UuanNvbmAgc2hvdWxkIHBvaW50IHRvXG4gICAgICAvLyB0aGUgRVNNMjAxNSBmb3JtYXQgb3V0cHV0IGFzIHBlciBBbmd1bGFyIFBhY2thZ2UgZm9ybWF0IHNwZWNpZmljYXRpb24uIFRoaXNcbiAgICAgIC8vIG1lYW5zIHRoYXQgdGhlIGBtb2R1bGVgIHByb3BlcnR5IGNhcHR1cmVzIG11bHRpcGxlIGZvcm1hdHMsIGFzIG9sZCBsaWJyYXJpZXNcbiAgICAgIC8vIGJ1aWx0IHdpdGggdGhlIG9sZCBBUEYgY2FuIHN0aWxsIGJlIHByb2Nlc3NlZC4gV2UgZGV0ZWN0IHRoZSBmb3JtYXQgYnkgY2hlY2tpbmdcbiAgICAgIC8vIHRoZSBwYXRocyB0aGF0IHNob3VsZCBiZSB1c2VkIGFzIHBlciBBUEYgc3BlY2lmaWNhdGlvbi5cbiAgICAgIGlmICh0eXBlb2YgbW9kdWxlRmlsZVBhdGggPT09ICdzdHJpbmcnICYmIG1vZHVsZUZpbGVQYXRoLmluY2x1ZGVzKCdlc20yMDE1JykpIHtcbiAgICAgICAgcmV0dXJuIGBlc20yMDE1YDtcbiAgICAgIH1cbiAgICAgIHJldHVybiAnZXNtNSc7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZXMgdGhlIEpTT04gZnJvbSBhIHBhY2thZ2UuanNvbiBmaWxlLlxuICogQHBhcmFtIHBhY2thZ2VKc29uUGF0aCB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcGFja2FnZS5qc29uIGZpbGUuXG4gKiBAcmV0dXJucyBKU09OIGZyb20gdGhlIHBhY2thZ2UuanNvbiBmaWxlIGlmIGl0IGlzIHZhbGlkLCBgbnVsbGAgb3RoZXJ3aXNlLlxuICovXG5mdW5jdGlvbiBsb2FkRW50cnlQb2ludFBhY2thZ2UoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGxvZ2dlcjogTG9nZ2VyLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIGhhc0NvbmZpZzogYm9vbGVhbik6IEVudHJ5UG9pbnRQYWNrYWdlSnNvbnxudWxsIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmICghaGFzQ29uZmlnKSB7XG4gICAgICAvLyBXZSBtYXkgaGF2ZSBydW4gaW50byBhIHBhY2thZ2UuanNvbiB3aXRoIHVuZXhwZWN0ZWQgc3ltYm9sc1xuICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byByZWFkIGVudHJ5IHBvaW50IGluZm8gZnJvbSAke3BhY2thZ2VKc29uUGF0aH0gd2l0aCBlcnJvciAke2V9LmApO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBzbmlmZk1vZHVsZUZvcm1hdChmczogRmlsZVN5c3RlbSwgc291cmNlRmlsZVBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludEZvcm1hdHxcbiAgICB1bmRlZmluZWQge1xuICBjb25zdCByZXNvbHZlZFBhdGggPSByZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXMoZnMsIHNvdXJjZUZpbGVQYXRoLCBbJycsICcuanMnLCAnL2luZGV4LmpzJ10pO1xuICBpZiAocmVzb2x2ZWRQYXRoID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IHNvdXJjZUZpbGUgPVxuICAgICAgdHMuY3JlYXRlU291cmNlRmlsZShzb3VyY2VGaWxlUGF0aCwgZnMucmVhZEZpbGUocmVzb2x2ZWRQYXRoKSwgdHMuU2NyaXB0VGFyZ2V0LkVTNSk7XG4gIGlmIChzb3VyY2VGaWxlLnN0YXRlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBpZiAodHMuaXNFeHRlcm5hbE1vZHVsZShzb3VyY2VGaWxlKSkge1xuICAgIHJldHVybiAnZXNtNSc7XG4gIH0gZWxzZSBpZiAocGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc291cmNlRmlsZS5zdGF0ZW1lbnRzWzBdKSAhPT0gbnVsbCkge1xuICAgIHJldHVybiAndW1kJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJ2NvbW1vbmpzJztcbiAgfVxufVxuXG5mdW5jdGlvbiBtZXJnZUNvbmZpZ0FuZFBhY2thZ2VKc29uKFxuICAgIGVudHJ5UG9pbnRQYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29ufG51bGwsIGVudHJ5UG9pbnRDb25maWc6IE5nY2NFbnRyeVBvaW50Q29uZmlnLFxuICAgIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFBhY2thZ2VKc29uIHtcbiAgaWYgKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiAhPT0gbnVsbCkge1xuICAgIHJldHVybiB7Li4uZW50cnlQb2ludFBhY2thZ2VKc29uLCAuLi5lbnRyeVBvaW50Q29uZmlnLm92ZXJyaWRlfTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBuYW1lID0gYCR7YmFzZW5hbWUocGFja2FnZVBhdGgpfS8ke3JlbGF0aXZlKHBhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCl9YDtcbiAgICByZXR1cm4ge25hbWUsIC4uLmVudHJ5UG9pbnRDb25maWcub3ZlcnJpZGV9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGd1ZXNzVHlwaW5nc0Zyb21QYWNrYWdlSnNvbihcbiAgICBmczogRmlsZVN5c3RlbSwgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIGVudHJ5UG9pbnRQYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uKTogQWJzb2x1dGVGc1BhdGh8bnVsbCB7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHtcbiAgICBjb25zdCBmaWVsZCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltwcm9wXTtcbiAgICBpZiAodHlwZW9mIGZpZWxkICE9PSAnc3RyaW5nJykge1xuICAgICAgLy8gU29tZSBjcmF6eSBwYWNrYWdlcyBoYXZlIHRoaW5ncyBsaWtlIGFycmF5cyBpbiB0aGVzZSBmaWVsZHMhXG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgcmVsYXRpdmVUeXBpbmdzUGF0aCA9IGZpZWxkLnJlcGxhY2UoL1xcLmpzJC8sICcuZC50cycpO1xuICAgIGNvbnN0IHR5cGluZ3NQYXRoID0gcmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgcmVsYXRpdmVUeXBpbmdzUGF0aCk7XG4gICAgaWYgKGZzLmV4aXN0cyh0eXBpbmdzUGF0aCkpIHtcbiAgICAgIHJldHVybiB0eXBpbmdzUGF0aDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogRmluZCB0aGUgdmVyc2lvbiBvZiB0aGUgcGFja2FnZSBhdCBgcGFja2FnZUpzb25QYXRoYC5cbiAqXG4gKiBAcmV0dXJucyB0aGUgdmVyc2lvbiBzdHJpbmcgb3IgYG51bGxgIGlmIHRoZSBwYWNrYWdlLmpzb24gZG9lcyBub3QgZXhpc3Qgb3IgaXMgaW52YWxpZC5cbiAqL1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZlcnNpb24oZnM6IEZpbGVTeXN0ZW0sIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBzdHJpbmd8bnVsbCB7XG4gIHRyeSB7XG4gICAgaWYgKGZzLmV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG4gICAgICByZXR1cm4gcGFja2FnZUpzb25bJ3ZlcnNpb24nXSB8fCBudWxsO1xuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gRG8gbm90aGluZ1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuIl19