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
            typings: file_system_1.resolve(entryPointPath, typings), compiledByAngular: compiledByAngular,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaURBQXdDO0lBQ3hDLDZCQUE4QjtJQUM5QiwrQkFBaUM7SUFDakMsMkVBQXlGO0lBQ3pGLHlFQUE0RDtJQUU1RCw4REFBa0Q7SUE2RGxELDRGQUE0RjtJQUMvRSxRQUFBLDJCQUEyQixHQUNwQyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUdwRjs7OztPQUlHO0lBQ1UsUUFBQSxjQUFjLEdBQUcsZ0JBQWdCLENBQUM7SUFFL0M7O09BRUc7SUFDVSxRQUFBLHdCQUF3QixHQUFHLDBCQUEwQixDQUFDO0lBZW5FOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLEVBQWMsRUFBRSxNQUF5QixFQUFFLE1BQWMsRUFBRSxXQUEyQixFQUN0RixjQUE4QjtRQUNoQyxJQUFNLGVBQWUsR0FBRyxxQkFBTyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNoRSxJQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDOUQsSUFBTSxnQkFBZ0IsR0FDbEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzlFLElBQU0sU0FBUyxHQUFHLGdCQUFnQixLQUFLLFNBQVMsQ0FBQztRQUVqRCxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMs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T0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUM1RCxJQUFNLFdBQVcsR0FBRyxxQkFBTyxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNqRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUU7b0JBQzFCLE9BQU8sV0FBVyxDQUFDO2lCQUNwQjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxFQUFjLEVBQUUsZUFBK0I7UUFDeEUsSUFBSTtZQUNGLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFBRTtnQkFDOUIsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQzdELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQzthQUN2QztTQUNGO1FBQUMsV0FBTTtZQUNOLGFBQWE7U0FDZDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7cmVsYXRpdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7YmFzZW5hbWV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBqb2luLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtwYXJzZVN0YXRlbWVudEZvclVtZE1vZHVsZX0gZnJvbSAnLi4vaG9zdC91bWRfaG9zdCc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtyZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXN9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb24sIE5nY2NFbnRyeVBvaW50Q29uZmlnfSBmcm9tICcuL2NvbmZpZ3VyYXRpb24nO1xuXG4vKipcbiAqIFRoZSBwb3NzaWJsZSB2YWx1ZXMgZm9yIHRoZSBmb3JtYXQgb2YgYW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCB0eXBlIEVudHJ5UG9pbnRGb3JtYXQgPSAnZXNtNScgfCAnZXNtMjAxNScgfCAndW1kJyB8ICdjb21tb25qcyc7XG5cbi8qKlxuICogQW4gb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24gYWJvdXQgYW4gZW50cnktcG9pbnQsIGluY2x1ZGluZyBwYXRoc1xuICogdG8gZWFjaCBvZiB0aGUgcG9zc2libGUgZW50cnktcG9pbnQgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50IGV4dGVuZHMgSnNvbk9iamVjdCB7XG4gIC8qKiBUaGUgbmFtZSBvZiB0aGUgcGFja2FnZSAoZS5nLiBgQGFuZ3VsYXIvY29yZWApLiAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKiBUaGUgcGFyc2VkIHBhY2thZ2UuanNvbiBmaWxlIGZvciB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uO1xuICAvKiogVGhlIHBhdGggdG8gdGhlIHBhY2thZ2UgdGhhdCBjb250YWlucyB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICBwYWNrYWdlOiBBYnNvbHV0ZUZzUGF0aDtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoaXMgZW50cnkgcG9pbnQuICovXG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuICAvKiogVGhlIHBhdGggdG8gYSB0eXBpbmdzICguZC50cykgZmlsZSBmb3IgdGhpcyBlbnRyeS1wb2ludC4gKi9cbiAgdHlwaW5nczogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBJcyB0aGlzIEVudHJ5UG9pbnQgY29tcGlsZWQgd2l0aCB0aGUgQW5ndWxhciBWaWV3IEVuZ2luZSBjb21waWxlcj8gKi9cbiAgY29tcGlsZWRCeUFuZ3VsYXI6IGJvb2xlYW47XG4gIC8qKiBTaG91bGQgbmdjYyBpZ25vcmUgbWlzc2luZyBkZXBlbmRlbmNpZXMgYW5kIHByb2Nlc3MgdGhpcyBlbnRyeXBvaW50IGFueXdheT8gKi9cbiAgaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llczogYm9vbGVhbjtcbiAgLyoqIFNob3VsZCBuZ2NjIGdlbmVyYXRlIGRlZXAgcmUtZXhwb3J0cyBmb3IgdGhpcyBlbnRyeXBvaW50PyAqL1xuICBnZW5lcmF0ZURlZXBSZWV4cG9ydHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIEpzb25QcmltaXRpdmUgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbDtcbmV4cG9ydCB0eXBlIEpzb25WYWx1ZSA9IEpzb25QcmltaXRpdmUgfCBKc29uQXJyYXkgfCBKc29uT2JqZWN0IHwgdW5kZWZpbmVkO1xuZXhwb3J0IGludGVyZmFjZSBKc29uQXJyYXkgZXh0ZW5kcyBBcnJheTxKc29uVmFsdWU+IHt9XG5leHBvcnQgaW50ZXJmYWNlIEpzb25PYmplY3QgeyBba2V5OiBzdHJpbmddOiBKc29uVmFsdWU7IH1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXAge1xuICBicm93c2VyPzogc3RyaW5nO1xuICBmZXNtMjAxNT86IHN0cmluZztcbiAgZmVzbTU/OiBzdHJpbmc7XG4gIGVzMjAxNT86IHN0cmluZzsgIC8vIGlmIGV4aXN0cyB0aGVuIGl0IGlzIGFjdHVhbGx5IEZFU00yMDE1XG4gIGVzbTIwMTU/OiBzdHJpbmc7XG4gIGVzbTU/OiBzdHJpbmc7XG4gIG1haW4/OiBzdHJpbmc7ICAgICAvLyBVTURcbiAgbW9kdWxlPzogc3RyaW5nOyAgIC8vIGlmIGV4aXN0cyB0aGVuIGl0IGlzIGFjdHVhbGx5IEZFU001XG4gIHR5cGVzPzogc3RyaW5nOyAgICAvLyBTeW5vbnltb3VzIHRvIGB0eXBpbmdzYCBwcm9wZXJ0eSAtIHNlZSBodHRwczovL2JpdC5seS8yT2dXcDJIXG4gIHR5cGluZ3M/OiBzdHJpbmc7ICAvLyBUeXBlU2NyaXB0IC5kLnRzIGZpbGVzXG59XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyA9IGtleW9mIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcDtcblxuLyoqXG4gKiBUaGUgcHJvcGVydGllcyB0aGF0IG1heSBiZSBsb2FkZWQgZnJvbSB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50UGFja2FnZUpzb24gZXh0ZW5kcyBKc29uT2JqZWN0LCBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXAge1xuICBuYW1lOiBzdHJpbmc7XG4gIHNjcmlwdHM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBfX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuZXhwb3J0IHR5cGUgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSA9IEV4Y2x1ZGU8UGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzLCAndHlwZXMnfCd0eXBpbmdzJz47XG4vLyBXZSBuZWVkIHRvIGtlZXAgdGhlIGVsZW1lbnRzIG9mIHRoaXMgY29uc3QgYW5kIHRoZSBgRW50cnlQb2ludEpzb25Qcm9wZXJ0eWAgdHlwZSBpbiBzeW5jLlxuZXhwb3J0IGNvbnN0IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUzogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID1cbiAgICBbJ2Zlc20yMDE1JywgJ2Zlc201JywgJ2VzMjAxNScsICdlc20yMDE1JywgJ2VzbTUnLCAnbWFpbicsICdtb2R1bGUnLCAnYnJvd3NlciddO1xuXG5cbi8qKlxuICogVGhlIHBhdGggZG9lcyBub3QgcmVwcmVzZW50IGFuIGVudHJ5LXBvaW50OlxuICogKiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gYXQgdGhlIHBhdGggYW5kIHRoZXJlIGlzIG5vIGNvbmZpZyB0byBmb3JjZSBhbiBlbnRyeS1wb2ludFxuICogKiBvciB0aGUgZW50cnlwb2ludCBpcyBgaWdub3JlZGAgYnkgYSBjb25maWcuXG4gKi9cbmV4cG9ydCBjb25zdCBOT19FTlRSWV9QT0lOVCA9ICduby1lbnRyeS1wb2ludCc7XG5cbi8qKlxuICogVGhlIHBhdGggaGFzIGEgcGFja2FnZS5qc29uLCBidXQgaXQgaXMgbm90IGEgdmFsaWQgZW50cnktcG9pbnQgZm9yIG5nY2MgcHJvY2Vzc2luZy5cbiAqL1xuZXhwb3J0IGNvbnN0IElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCA9ICdpbmNvbXBhdGlibGUtZW50cnktcG9pbnQnO1xuXG4vKipcbiAqIFRoZSByZXN1bHQgb2YgY2FsbGluZyBgZ2V0RW50cnlQb2ludEluZm8oKWAuXG4gKlxuICogVGhpcyB3aWxsIGJlIGFuIGBFbnRyeVBvaW50YCBvYmplY3QgaWYgYW4gQW5ndWxhciBlbnRyeS1wb2ludCB3YXMgaWRlbnRpZmllZDtcbiAqIE90aGVyd2lzZSBpdCB3aWxsIGJlIGEgZmxhZyBpbmRpY2F0aW5nIG9uZSBvZjpcbiAqICogTk9fRU5UUllfUE9JTlQgLSB0aGUgcGF0aCBpcyBub3QgYW4gZW50cnktcG9pbnQgb3IgbmdjYyBpcyBjb25maWd1cmVkIHRvIGlnbm9yZSBpdFxuICogKiBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQgLSB0aGUgcGF0aCB3YXMgYSBub24tcHJvY2Vzc2FibGUgZW50cnktcG9pbnQgdGhhdCBzaG91bGQgYmUgc2VhcmNoZWRcbiAqIGZvciBzdWItZW50cnktcG9pbnRzXG4gKi9cbmV4cG9ydCB0eXBlIEdldEVudHJ5UG9pbnRSZXN1bHQgPVxuICAgIEVudHJ5UG9pbnQgfCB0eXBlb2YgSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UIHwgdHlwZW9mIE5PX0VOVFJZX1BPSU5UO1xuXG5cbi8qKlxuICogVHJ5IHRvIGNyZWF0ZSBhbiBlbnRyeS1wb2ludCBmcm9tIHRoZSBnaXZlbiBwYXRocyBhbmQgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0gcGFja2FnZVBhdGggdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGNvbnRhaW5pbmcgbnBtIHBhY2thZ2VcbiAqIEBwYXJhbSBlbnRyeVBvaW50UGF0aCB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcG90ZW50aWFsIGVudHJ5LXBvaW50LlxuICogQHJldHVybnNcbiAqIC0gQW4gZW50cnktcG9pbnQgaWYgaXQgaXMgdmFsaWQuXG4gKiAtIGBOT19FTlRSWV9QT0lOVGAgd2hlbiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gYXQgdGhlIHBhdGggYW5kIHRoZXJlIGlzIG5vIGNvbmZpZyB0byBmb3JjZSBhblxuICogZW50cnktcG9pbnQgb3IgdGhlIGVudHJ5cG9pbnQgaXMgYGlnbm9yZWRgLlxuICogLSBgSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UYCB0aGVyZSBpcyBhIHBhY2thZ2UuanNvbiBidXQgaXQgaXMgbm90IGEgdmFsaWQgQW5ndWxhciBjb21waWxlZFxuICogZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnRyeVBvaW50SW5mbyhcbiAgICBmczogRmlsZVN5c3RlbSwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgbG9nZ2VyOiBMb2dnZXIsIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBHZXRFbnRyeVBvaW50UmVzdWx0IHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlVmVyc2lvbiA9IGdldFBhY2thZ2VWZXJzaW9uKGZzLCBwYWNrYWdlSnNvblBhdGgpO1xuICBjb25zdCBlbnRyeVBvaW50Q29uZmlnID1cbiAgICAgIGNvbmZpZy5nZXRDb25maWcocGFja2FnZVBhdGgsIHBhY2thZ2VWZXJzaW9uKS5lbnRyeVBvaW50c1tlbnRyeVBvaW50UGF0aF07XG4gIGNvbnN0IGhhc0NvbmZpZyA9IGVudHJ5UG9pbnRDb25maWcgIT09IHVuZGVmaW5lZDtcblxuICBpZiAoIWhhc0NvbmZpZyAmJiAhZnMuZXhpc3RzKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAvLyBObyBwYWNrYWdlLmpzb24gYW5kIG5vIGNvbmZpZ1xuICAgIHJldHVybiBOT19FTlRSWV9QT0lOVDtcbiAgfVxuXG4gIGlmIChoYXNDb25maWcgJiYgZW50cnlQb2ludENvbmZpZy5pZ25vcmUgPT09IHRydWUpIHtcbiAgICAvLyBFeHBsaWNpdGx5IGlnbm9yZWRcbiAgICByZXR1cm4gTk9fRU5UUllfUE9JTlQ7XG4gIH1cblxuICBjb25zdCBsb2FkZWRFbnRyeVBvaW50UGFja2FnZUpzb24gPSBsb2FkRW50cnlQb2ludFBhY2thZ2UoZnMsIGxvZ2dlciwgcGFja2FnZUpzb25QYXRoLCBoYXNDb25maWcpO1xuICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBoYXNDb25maWcgP1xuICAgICAgbWVyZ2VDb25maWdBbmRQYWNrYWdlSnNvbihcbiAgICAgICAgICBsb2FkZWRFbnRyeVBvaW50UGFja2FnZUpzb24sIGVudHJ5UG9pbnRDb25maWcsIHBhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCkgOlxuICAgICAgbG9hZGVkRW50cnlQb2ludFBhY2thZ2VKc29uO1xuXG4gIGlmIChlbnRyeVBvaW50UGFja2FnZUpzb24gPT09IG51bGwpIHtcbiAgICAvLyBwYWNrYWdlLmpzb24gZXhpc3RzIGJ1dCBjb3VsZCBub3QgYmUgcGFyc2VkIGFuZCB0aGVyZSB3YXMgbm8gcmVkZWVtaW5nIGNvbmZpZ1xuICAgIHJldHVybiBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQ7XG4gIH1cblxuICBjb25zdCB0eXBpbmdzID0gZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGluZ3MgfHwgZW50cnlQb2ludFBhY2thZ2VKc29uLnR5cGVzIHx8XG4gICAgICBndWVzc1R5cGluZ3NGcm9tUGFja2FnZUpzb24oZnMsIGVudHJ5UG9pbnRQYXRoLCBlbnRyeVBvaW50UGFja2FnZUpzb24pO1xuICBpZiAodHlwZW9mIHR5cGluZ3MgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gTWlzc2luZyB0aGUgcmVxdWlyZWQgYHR5cGluZ3NgIHByb3BlcnR5XG4gICAgcmV0dXJuIElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVDtcbiAgfVxuXG4gIC8vIEFuIGVudHJ5LXBvaW50IGlzIGFzc3VtZWQgdG8gYmUgY29tcGlsZWQgYnkgQW5ndWxhciBpZiB0aGVyZSBpcyBlaXRoZXI6XG4gIC8vICogYSBgbWV0YWRhdGEuanNvbmAgZmlsZSBuZXh0IHRvIHRoZSB0eXBpbmdzIGVudHJ5LXBvaW50XG4gIC8vICogYSBjdXN0b20gY29uZmlnIGZvciB0aGlzIGVudHJ5LXBvaW50XG4gIGNvbnN0IG1ldGFkYXRhUGF0aCA9IHJlc29sdmUoZW50cnlQb2ludFBhdGgsIHR5cGluZ3MucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcnKSArICcubWV0YWRhdGEuanNvbicpO1xuICBjb25zdCBjb21waWxlZEJ5QW5ndWxhciA9IGVudHJ5UG9pbnRDb25maWcgIT09IHVuZGVmaW5lZCB8fCBmcy5leGlzdHMobWV0YWRhdGFQYXRoKTtcblxuICBjb25zdCBlbnRyeVBvaW50SW5mbzogRW50cnlQb2ludCA9IHtcbiAgICBuYW1lOiBlbnRyeVBvaW50UGFja2FnZUpzb24ubmFtZSxcbiAgICBwYWNrYWdlSnNvbjogZW50cnlQb2ludFBhY2thZ2VKc29uLFxuICAgIHBhY2thZ2U6IHBhY2thZ2VQYXRoLFxuICAgIHBhdGg6IGVudHJ5UG9pbnRQYXRoLFxuICAgIHR5cGluZ3M6IHJlc29sdmUoZW50cnlQb2ludFBhdGgsIHR5cGluZ3MpLCBjb21waWxlZEJ5QW5ndWxhcixcbiAgICBpZ25vcmVNaXNzaW5nRGVwZW5kZW5jaWVzOlxuICAgICAgICBlbnRyeVBvaW50Q29uZmlnICE9PSB1bmRlZmluZWQgPyAhIWVudHJ5UG9pbnRDb25maWcuaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llcyA6IGZhbHNlLFxuICAgIGdlbmVyYXRlRGVlcFJlZXhwb3J0czpcbiAgICAgICAgZW50cnlQb2ludENvbmZpZyAhPT0gdW5kZWZpbmVkID8gISFlbnRyeVBvaW50Q29uZmlnLmdlbmVyYXRlRGVlcFJlZXhwb3J0cyA6IGZhbHNlLFxuICB9O1xuXG4gIHJldHVybiBlbnRyeVBvaW50SW5mbztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcGFja2FnZS5qc29uIHByb3BlcnR5IGludG8gYW4gZW50cnktcG9pbnQgZm9ybWF0LlxuICpcbiAqIEBwYXJhbSBwcm9wZXJ0eSBUaGUgcHJvcGVydHkgdG8gY29udmVydCB0byBhIGZvcm1hdC5cbiAqIEByZXR1cm5zIEFuIGVudHJ5LXBvaW50IGZvcm1hdCBvciBgdW5kZWZpbmVkYCBpZiBub25lIG1hdGNoIHRoZSBnaXZlbiBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudHJ5UG9pbnRGb3JtYXQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIHByb3BlcnR5OiBFbnRyeVBvaW50SnNvblByb3BlcnR5KTogRW50cnlQb2ludEZvcm1hdHxcbiAgICB1bmRlZmluZWQge1xuICBzd2l0Y2ggKHByb3BlcnR5KSB7XG4gICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdmZXNtNSc6XG4gICAgICByZXR1cm4gJ2VzbTUnO1xuICAgIGNhc2UgJ2VzMjAxNSc6XG4gICAgICByZXR1cm4gJ2VzbTIwMTUnO1xuICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdlc201JzpcbiAgICAgIHJldHVybiAnZXNtNSc7XG4gICAgY2FzZSAnYnJvd3Nlcic6XG4gICAgICBjb25zdCBicm93c2VyRmlsZSA9IGVudHJ5UG9pbnQucGFja2FnZUpzb25bJ2Jyb3dzZXInXTtcbiAgICAgIGlmICh0eXBlb2YgYnJvd3NlckZpbGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gc25pZmZNb2R1bGVGb3JtYXQoZnMsIGpvaW4oZW50cnlQb2ludC5wYXRoLCBicm93c2VyRmlsZSkpO1xuICAgIGNhc2UgJ21haW4nOlxuICAgICAgY29uc3QgbWFpbkZpbGUgPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uWydtYWluJ107XG4gICAgICBpZiAobWFpbkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNuaWZmTW9kdWxlRm9ybWF0KGZzLCBqb2luKGVudHJ5UG9pbnQucGF0aCwgbWFpbkZpbGUpKTtcbiAgICBjYXNlICdtb2R1bGUnOlxuICAgICAgcmV0dXJuICdlc201JztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlcyB0aGUgSlNPTiBmcm9tIGEgcGFja2FnZS5qc29uIGZpbGUuXG4gKiBAcGFyYW0gcGFja2FnZUpzb25QYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlLmpzb24gZmlsZS5cbiAqIEByZXR1cm5zIEpTT04gZnJvbSB0aGUgcGFja2FnZS5qc29uIGZpbGUgaWYgaXQgaXMgdmFsaWQsIGBudWxsYCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGxvYWRFbnRyeVBvaW50UGFja2FnZShcbiAgICBmczogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgaGFzQ29uZmlnOiBib29sZWFuKTogRW50cnlQb2ludFBhY2thZ2VKc29ufG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKCFoYXNDb25maWcpIHtcbiAgICAgIC8vIFdlIG1heSBoYXZlIHJ1biBpbnRvIGEgcGFja2FnZS5qc29uIHdpdGggdW5leHBlY3RlZCBzeW1ib2xzXG4gICAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIHJlYWQgZW50cnkgcG9pbnQgaW5mbyBmcm9tICR7cGFja2FnZUpzb25QYXRofSB3aXRoIGVycm9yICR7ZX0uYCk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNuaWZmTW9kdWxlRm9ybWF0KGZzOiBGaWxlU3lzdGVtLCBzb3VyY2VGaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50Rm9ybWF0fFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IHJlc29sdmVkUGF0aCA9IHJlc29sdmVGaWxlV2l0aFBvc3RmaXhlcyhmcywgc291cmNlRmlsZVBhdGgsIFsnJywgJy5qcycsICcvaW5kZXguanMnXSk7XG4gIGlmIChyZXNvbHZlZFBhdGggPT09IG51bGwpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3Qgc291cmNlRmlsZSA9XG4gICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKHNvdXJjZUZpbGVQYXRoLCBmcy5yZWFkRmlsZShyZXNvbHZlZFBhdGgpLCB0cy5TY3JpcHRUYXJnZXQuRVM1KTtcbiAgaWYgKHNvdXJjZUZpbGUuc3RhdGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGlmICh0cy5pc0V4dGVybmFsTW9kdWxlKHNvdXJjZUZpbGUpKSB7XG4gICAgcmV0dXJuICdlc201JztcbiAgfSBlbHNlIGlmIChwYXJzZVN0YXRlbWVudEZvclVtZE1vZHVsZShzb3VyY2VGaWxlLnN0YXRlbWVudHNbMF0pICE9PSBudWxsKSB7XG4gICAgcmV0dXJuICd1bWQnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnY29tbW9uanMnO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1lcmdlQ29uZmlnQW5kUGFja2FnZUpzb24oXG4gICAgZW50cnlQb2ludFBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24gfCBudWxsLCBlbnRyeVBvaW50Q29uZmlnOiBOZ2NjRW50cnlQb2ludENvbmZpZyxcbiAgICBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnRQYWNrYWdlSnNvbiB7XG4gIGlmIChlbnRyeVBvaW50UGFja2FnZUpzb24gIT09IG51bGwpIHtcbiAgICByZXR1cm4gey4uLmVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgLi4uZW50cnlQb2ludENvbmZpZy5vdmVycmlkZX07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgbmFtZSA9IGAke2Jhc2VuYW1lKHBhY2thZ2VQYXRoKX0vJHtyZWxhdGl2ZShwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpfWA7XG4gICAgcmV0dXJuIHtuYW1lLCAuLi5lbnRyeVBvaW50Q29uZmlnLm92ZXJyaWRlfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBndWVzc1R5cGluZ3NGcm9tUGFja2FnZUpzb24oXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBlbnRyeVBvaW50UGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbik6IEFic29sdXRlRnNQYXRofG51bGwge1xuICBmb3IgKGNvbnN0IHByb3Agb2YgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSB7XG4gICAgY29uc3QgZmllbGQgPSBlbnRyeVBvaW50UGFja2FnZUpzb25bcHJvcF07XG4gICAgaWYgKHR5cGVvZiBmaWVsZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIFNvbWUgY3JhenkgcGFja2FnZXMgaGF2ZSB0aGluZ3MgbGlrZSBhcnJheXMgaW4gdGhlc2UgZmllbGRzIVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHJlbGF0aXZlVHlwaW5nc1BhdGggPSBmaWVsZC5yZXBsYWNlKC9cXC5qcyQvLCAnLmQudHMnKTtcbiAgICBjb25zdCB0eXBpbmdzUGF0aCA9IHJlc29sdmUoZW50cnlQb2ludFBhdGgsIHJlbGF0aXZlVHlwaW5nc1BhdGgpO1xuICAgIGlmIChmcy5leGlzdHModHlwaW5nc1BhdGgpKSB7XG4gICAgICByZXR1cm4gdHlwaW5nc1BhdGg7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlIHZlcnNpb24gb2YgdGhlIHBhY2thZ2UgYXQgYHBhY2thZ2VKc29uUGF0aGAuXG4gKlxuICogQHJldHVybnMgdGhlIHZlcnNpb24gc3RyaW5nIG9yIGBudWxsYCBpZiB0aGUgcGFja2FnZS5qc29uIGRvZXMgbm90IGV4aXN0IG9yIGlzIGludmFsaWQuXG4gKi9cbmZ1bmN0aW9uIGdldFBhY2thZ2VWZXJzaW9uKGZzOiBGaWxlU3lzdGVtLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoKTogc3RyaW5nfG51bGwge1xuICB0cnkge1xuICAgIGlmIChmcy5leGlzdHMocGFja2FnZUpzb25QYXRoKSkge1xuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuICAgICAgcmV0dXJuIHBhY2thZ2VKc29uWyd2ZXJzaW9uJ10gfHwgbnVsbDtcbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIC8vIERvIG5vdGhpbmdcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbiJdfQ==