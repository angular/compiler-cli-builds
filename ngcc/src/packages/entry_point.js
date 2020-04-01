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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaURBQXdDO0lBQ3hDLDZCQUE4QjtJQUM5QiwrQkFBaUM7SUFDakMsMkVBQXlGO0lBQ3pGLHlFQUE0RDtJQUU1RCw4REFBa0Q7SUE0RGxELDRGQUE0RjtJQUMvRSxRQUFBLDJCQUEyQixHQUNwQyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBR3pFOzs7O09BSUc7SUFDVSxRQUFBLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQztJQUUvQzs7T0FFRztJQUNVLFFBQUEsd0JBQXdCLEdBQUcsMEJBQTBCLENBQUM7SUFlbkU7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsRUFBYyxFQUFFLE1BQXlCLEVBQUUsTUFBYyxFQUFFLFdBQTJCLEVBQ3RGLGNBQThCO1FBQ2hDLElBQU0sZUFBZSxHQUFHLHFCQUFPLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hFLElBQU0sY0FBYyxHQUFHLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM5RCxJQUFNLGdCQUFnQixHQUNsQixNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDOUUsSUFBTSxTQUFTLEdBQUcsZ0JBQWdCLEtBQUssU0FBUyxDQUFDO1FBRWpELElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQzdD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QUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQzdELE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQzthQUN2QztTQUNGO1FBQUMsV0FBTTtZQUNOLGFBQWE7U0FDZDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7cmVsYXRpdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7YmFzZW5hbWV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBqb2luLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtwYXJzZVN0YXRlbWVudEZvclVtZE1vZHVsZX0gZnJvbSAnLi4vaG9zdC91bWRfaG9zdCc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtyZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXN9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb24sIE5nY2NFbnRyeVBvaW50Q29uZmlnfSBmcm9tICcuL2NvbmZpZ3VyYXRpb24nO1xuXG4vKipcbiAqIFRoZSBwb3NzaWJsZSB2YWx1ZXMgZm9yIHRoZSBmb3JtYXQgb2YgYW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCB0eXBlIEVudHJ5UG9pbnRGb3JtYXQgPSAnZXNtNScgfCAnZXNtMjAxNScgfCAndW1kJyB8ICdjb21tb25qcyc7XG5cbi8qKlxuICogQW4gb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24gYWJvdXQgYW4gZW50cnktcG9pbnQsIGluY2x1ZGluZyBwYXRoc1xuICogdG8gZWFjaCBvZiB0aGUgcG9zc2libGUgZW50cnktcG9pbnQgZm9ybWF0cy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50IGV4dGVuZHMgSnNvbk9iamVjdCB7XG4gIC8qKiBUaGUgbmFtZSBvZiB0aGUgcGFja2FnZSAoZS5nLiBgQGFuZ3VsYXIvY29yZWApLiAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKiBUaGUgcGFyc2VkIHBhY2thZ2UuanNvbiBmaWxlIGZvciB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uO1xuICAvKiogVGhlIHBhdGggdG8gdGhlIHBhY2thZ2UgdGhhdCBjb250YWlucyB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICBwYWNrYWdlOiBBYnNvbHV0ZUZzUGF0aDtcbiAgLyoqIFRoZSBwYXRoIHRvIHRoaXMgZW50cnkgcG9pbnQuICovXG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuICAvKiogVGhlIHBhdGggdG8gYSB0eXBpbmdzICguZC50cykgZmlsZSBmb3IgdGhpcyBlbnRyeS1wb2ludC4gKi9cbiAgdHlwaW5nczogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBJcyB0aGlzIEVudHJ5UG9pbnQgY29tcGlsZWQgd2l0aCB0aGUgQW5ndWxhciBWaWV3IEVuZ2luZSBjb21waWxlcj8gKi9cbiAgY29tcGlsZWRCeUFuZ3VsYXI6IGJvb2xlYW47XG4gIC8qKiBTaG91bGQgbmdjYyBpZ25vcmUgbWlzc2luZyBkZXBlbmRlbmNpZXMgYW5kIHByb2Nlc3MgdGhpcyBlbnRyeXBvaW50IGFueXdheT8gKi9cbiAgaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llczogYm9vbGVhbjtcbiAgLyoqIFNob3VsZCBuZ2NjIGdlbmVyYXRlIGRlZXAgcmUtZXhwb3J0cyBmb3IgdGhpcyBlbnRyeXBvaW50PyAqL1xuICBnZW5lcmF0ZURlZXBSZWV4cG9ydHM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIEpzb25QcmltaXRpdmUgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbDtcbmV4cG9ydCB0eXBlIEpzb25WYWx1ZSA9IEpzb25QcmltaXRpdmUgfCBKc29uQXJyYXkgfCBKc29uT2JqZWN0IHwgdW5kZWZpbmVkO1xuZXhwb3J0IGludGVyZmFjZSBKc29uQXJyYXkgZXh0ZW5kcyBBcnJheTxKc29uVmFsdWU+IHt9XG5leHBvcnQgaW50ZXJmYWNlIEpzb25PYmplY3QgeyBba2V5OiBzdHJpbmddOiBKc29uVmFsdWU7IH1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXAge1xuICBmZXNtMjAxNT86IHN0cmluZztcbiAgZmVzbTU/OiBzdHJpbmc7XG4gIGVzMjAxNT86IHN0cmluZzsgIC8vIGlmIGV4aXN0cyB0aGVuIGl0IGlzIGFjdHVhbGx5IEZFU00yMDE1XG4gIGVzbTIwMTU/OiBzdHJpbmc7XG4gIGVzbTU/OiBzdHJpbmc7XG4gIG1haW4/OiBzdHJpbmc7ICAgICAvLyBVTURcbiAgbW9kdWxlPzogc3RyaW5nOyAgIC8vIGlmIGV4aXN0cyB0aGVuIGl0IGlzIGFjdHVhbGx5IEZFU001XG4gIHR5cGVzPzogc3RyaW5nOyAgICAvLyBTeW5vbnltb3VzIHRvIGB0eXBpbmdzYCBwcm9wZXJ0eSAtIHNlZSBodHRwczovL2JpdC5seS8yT2dXcDJIXG4gIHR5cGluZ3M/OiBzdHJpbmc7ICAvLyBUeXBlU2NyaXB0IC5kLnRzIGZpbGVzXG59XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyA9IGtleW9mIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcDtcblxuLyoqXG4gKiBUaGUgcHJvcGVydGllcyB0aGF0IG1heSBiZSBsb2FkZWQgZnJvbSB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50UGFja2FnZUpzb24gZXh0ZW5kcyBKc29uT2JqZWN0LCBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXAge1xuICBuYW1lOiBzdHJpbmc7XG4gIHNjcmlwdHM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBfX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuZXhwb3J0IHR5cGUgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSA9IEV4Y2x1ZGU8UGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzLCAndHlwZXMnfCd0eXBpbmdzJz47XG4vLyBXZSBuZWVkIHRvIGtlZXAgdGhlIGVsZW1lbnRzIG9mIHRoaXMgY29uc3QgYW5kIHRoZSBgRW50cnlQb2ludEpzb25Qcm9wZXJ0eWAgdHlwZSBpbiBzeW5jLlxuZXhwb3J0IGNvbnN0IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUzogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID1cbiAgICBbJ2Zlc20yMDE1JywgJ2Zlc201JywgJ2VzMjAxNScsICdlc20yMDE1JywgJ2VzbTUnLCAnbWFpbicsICdtb2R1bGUnXTtcblxuXG4vKipcbiAqIFRoZSBwYXRoIGRvZXMgbm90IHJlcHJlc2VudCBhbiBlbnRyeS1wb2ludDpcbiAqICogdGhlcmUgaXMgbm8gcGFja2FnZS5qc29uIGF0IHRoZSBwYXRoIGFuZCB0aGVyZSBpcyBubyBjb25maWcgdG8gZm9yY2UgYW4gZW50cnktcG9pbnRcbiAqICogb3IgdGhlIGVudHJ5cG9pbnQgaXMgYGlnbm9yZWRgIGJ5IGEgY29uZmlnLlxuICovXG5leHBvcnQgY29uc3QgTk9fRU5UUllfUE9JTlQgPSAnbm8tZW50cnktcG9pbnQnO1xuXG4vKipcbiAqIFRoZSBwYXRoIGhhcyBhIHBhY2thZ2UuanNvbiwgYnV0IGl0IGlzIG5vdCBhIHZhbGlkIGVudHJ5LXBvaW50IGZvciBuZ2NjIHByb2Nlc3NpbmcuXG4gKi9cbmV4cG9ydCBjb25zdCBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQgPSAnaW5jb21wYXRpYmxlLWVudHJ5LXBvaW50JztcblxuLyoqXG4gKiBUaGUgcmVzdWx0IG9mIGNhbGxpbmcgYGdldEVudHJ5UG9pbnRJbmZvKClgLlxuICpcbiAqIFRoaXMgd2lsbCBiZSBhbiBgRW50cnlQb2ludGAgb2JqZWN0IGlmIGFuIEFuZ3VsYXIgZW50cnktcG9pbnQgd2FzIGlkZW50aWZpZWQ7XG4gKiBPdGhlcndpc2UgaXQgd2lsbCBiZSBhIGZsYWcgaW5kaWNhdGluZyBvbmUgb2Y6XG4gKiAqIE5PX0VOVFJZX1BPSU5UIC0gdGhlIHBhdGggaXMgbm90IGFuIGVudHJ5LXBvaW50IG9yIG5nY2MgaXMgY29uZmlndXJlZCB0byBpZ25vcmUgaXRcbiAqICogSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UIC0gdGhlIHBhdGggd2FzIGEgbm9uLXByb2Nlc3NhYmxlIGVudHJ5LXBvaW50IHRoYXQgc2hvdWxkIGJlIHNlYXJjaGVkXG4gKiBmb3Igc3ViLWVudHJ5LXBvaW50c1xuICovXG5leHBvcnQgdHlwZSBHZXRFbnRyeVBvaW50UmVzdWx0ID1cbiAgICBFbnRyeVBvaW50IHwgdHlwZW9mIElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCB8IHR5cGVvZiBOT19FTlRSWV9QT0lOVDtcblxuXG4vKipcbiAqIFRyeSB0byBjcmVhdGUgYW4gZW50cnktcG9pbnQgZnJvbSB0aGUgZ2l2ZW4gcGF0aHMgYW5kIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHBhY2thZ2VQYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBjb250YWluaW5nIG5wbSBwYWNrYWdlXG4gKiBAcGFyYW0gZW50cnlQb2ludFBhdGggdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBvdGVudGlhbCBlbnRyeS1wb2ludC5cbiAqIEByZXR1cm5zXG4gKiAtIEFuIGVudHJ5LXBvaW50IGlmIGl0IGlzIHZhbGlkLlxuICogLSBgTk9fRU5UUllfUE9JTlRgIHdoZW4gdGhlcmUgaXMgbm8gcGFja2FnZS5qc29uIGF0IHRoZSBwYXRoIGFuZCB0aGVyZSBpcyBubyBjb25maWcgdG8gZm9yY2UgYW5cbiAqIGVudHJ5LXBvaW50IG9yIHRoZSBlbnRyeXBvaW50IGlzIGBpZ25vcmVkYC5cbiAqIC0gYElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVGAgdGhlcmUgaXMgYSBwYWNrYWdlLmpzb24gYnV0IGl0IGlzIG5vdCBhIHZhbGlkIEFuZ3VsYXIgY29tcGlsZWRcbiAqIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW50cnlQb2ludEluZm8oXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIGxvZ2dlcjogTG9nZ2VyLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogR2V0RW50cnlQb2ludFJlc3VsdCB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUoZW50cnlQb2ludFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGFja2FnZVZlcnNpb24gPSBnZXRQYWNrYWdlVmVyc2lvbihmcywgcGFja2FnZUpzb25QYXRoKTtcbiAgY29uc3QgZW50cnlQb2ludENvbmZpZyA9XG4gICAgICBjb25maWcuZ2V0Q29uZmlnKHBhY2thZ2VQYXRoLCBwYWNrYWdlVmVyc2lvbikuZW50cnlQb2ludHNbZW50cnlQb2ludFBhdGhdO1xuICBjb25zdCBoYXNDb25maWcgPSBlbnRyeVBvaW50Q29uZmlnICE9PSB1bmRlZmluZWQ7XG5cbiAgaWYgKCFoYXNDb25maWcgJiYgIWZzLmV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgLy8gTm8gcGFja2FnZS5qc29uIGFuZCBubyBjb25maWdcbiAgICByZXR1cm4gTk9fRU5UUllfUE9JTlQ7XG4gIH1cblxuICBpZiAoaGFzQ29uZmlnICYmIGVudHJ5UG9pbnRDb25maWcuaWdub3JlID09PSB0cnVlKSB7XG4gICAgLy8gRXhwbGljaXRseSBpZ25vcmVkXG4gICAgcmV0dXJuIE5PX0VOVFJZX1BPSU5UO1xuICB9XG5cbiAgY29uc3QgbG9hZGVkRW50cnlQb2ludFBhY2thZ2VKc29uID0gbG9hZEVudHJ5UG9pbnRQYWNrYWdlKGZzLCBsb2dnZXIsIHBhY2thZ2VKc29uUGF0aCwgaGFzQ29uZmlnKTtcbiAgY29uc3QgZW50cnlQb2ludFBhY2thZ2VKc29uID0gaGFzQ29uZmlnID9cbiAgICAgIG1lcmdlQ29uZmlnQW5kUGFja2FnZUpzb24oXG4gICAgICAgICAgbG9hZGVkRW50cnlQb2ludFBhY2thZ2VKc29uLCBlbnRyeVBvaW50Q29uZmlnLCBwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpIDpcbiAgICAgIGxvYWRlZEVudHJ5UG9pbnRQYWNrYWdlSnNvbjtcblxuICBpZiAoZW50cnlQb2ludFBhY2thZ2VKc29uID09PSBudWxsKSB7XG4gICAgLy8gcGFja2FnZS5qc29uIGV4aXN0cyBidXQgY291bGQgbm90IGJlIHBhcnNlZCBhbmQgdGhlcmUgd2FzIG5vIHJlZGVlbWluZyBjb25maWdcbiAgICByZXR1cm4gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UO1xuICB9XG5cbiAgY29uc3QgdHlwaW5ncyA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi50eXBpbmdzIHx8IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi50eXBlcyB8fFxuICAgICAgZ3Vlc3NUeXBpbmdzRnJvbVBhY2thZ2VKc29uKGZzLCBlbnRyeVBvaW50UGF0aCwgZW50cnlQb2ludFBhY2thZ2VKc29uKTtcbiAgaWYgKHR5cGVvZiB0eXBpbmdzICE9PSAnc3RyaW5nJykge1xuICAgIC8vIE1pc3NpbmcgdGhlIHJlcXVpcmVkIGB0eXBpbmdzYCBwcm9wZXJ0eVxuICAgIHJldHVybiBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQ7XG4gIH1cblxuICAvLyBBbiBlbnRyeS1wb2ludCBpcyBhc3N1bWVkIHRvIGJlIGNvbXBpbGVkIGJ5IEFuZ3VsYXIgaWYgdGhlcmUgaXMgZWl0aGVyOlxuICAvLyAqIGEgYG1ldGFkYXRhLmpzb25gIGZpbGUgbmV4dCB0byB0aGUgdHlwaW5ncyBlbnRyeS1wb2ludFxuICAvLyAqIGEgY3VzdG9tIGNvbmZpZyBmb3IgdGhpcyBlbnRyeS1wb2ludFxuICBjb25zdCBtZXRhZGF0YVBhdGggPSByZXNvbHZlKGVudHJ5UG9pbnRQYXRoLCB0eXBpbmdzLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnJykgKyAnLm1ldGFkYXRhLmpzb24nKTtcbiAgY29uc3QgY29tcGlsZWRCeUFuZ3VsYXIgPSBlbnRyeVBvaW50Q29uZmlnICE9PSB1bmRlZmluZWQgfHwgZnMuZXhpc3RzKG1ldGFkYXRhUGF0aCk7XG5cbiAgY29uc3QgZW50cnlQb2ludEluZm86IEVudHJ5UG9pbnQgPSB7XG4gICAgbmFtZTogZW50cnlQb2ludFBhY2thZ2VKc29uLm5hbWUsXG4gICAgcGFja2FnZUpzb246IGVudHJ5UG9pbnRQYWNrYWdlSnNvbixcbiAgICBwYWNrYWdlOiBwYWNrYWdlUGF0aCxcbiAgICBwYXRoOiBlbnRyeVBvaW50UGF0aCxcbiAgICB0eXBpbmdzOiByZXNvbHZlKGVudHJ5UG9pbnRQYXRoLCB0eXBpbmdzKSwgY29tcGlsZWRCeUFuZ3VsYXIsXG4gICAgaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llczpcbiAgICAgICAgZW50cnlQb2ludENvbmZpZyAhPT0gdW5kZWZpbmVkID8gISFlbnRyeVBvaW50Q29uZmlnLmlnbm9yZU1pc3NpbmdEZXBlbmRlbmNpZXMgOiBmYWxzZSxcbiAgICBnZW5lcmF0ZURlZXBSZWV4cG9ydHM6XG4gICAgICAgIGVudHJ5UG9pbnRDb25maWcgIT09IHVuZGVmaW5lZCA/ICEhZW50cnlQb2ludENvbmZpZy5nZW5lcmF0ZURlZXBSZWV4cG9ydHMgOiBmYWxzZSxcbiAgfTtcblxuICByZXR1cm4gZW50cnlQb2ludEluZm87XG59XG5cbi8qKlxuICogQ29udmVydCBhIHBhY2thZ2UuanNvbiBwcm9wZXJ0eSBpbnRvIGFuIGVudHJ5LXBvaW50IGZvcm1hdC5cbiAqXG4gKiBAcGFyYW0gcHJvcGVydHkgVGhlIHByb3BlcnR5IHRvIGNvbnZlcnQgdG8gYSBmb3JtYXQuXG4gKiBAcmV0dXJucyBBbiBlbnRyeS1wb2ludCBmb3JtYXQgb3IgYHVuZGVmaW5lZGAgaWYgbm9uZSBtYXRjaCB0aGUgZ2l2ZW4gcHJvcGVydHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnRyeVBvaW50Rm9ybWF0KFxuICAgIGZzOiBGaWxlU3lzdGVtLCBlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBwcm9wZXJ0eTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eSk6IEVudHJ5UG9pbnRGb3JtYXR8XG4gICAgdW5kZWZpbmVkIHtcbiAgc3dpdGNoIChwcm9wZXJ0eSkge1xuICAgIGNhc2UgJ2Zlc20yMDE1JzpcbiAgICAgIHJldHVybiAnZXNtMjAxNSc7XG4gICAgY2FzZSAnZmVzbTUnOlxuICAgICAgcmV0dXJuICdlc201JztcbiAgICBjYXNlICdlczIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgIHJldHVybiAnZXNtMjAxNSc7XG4gICAgY2FzZSAnZXNtNSc6XG4gICAgICByZXR1cm4gJ2VzbTUnO1xuICAgIGNhc2UgJ21haW4nOlxuICAgICAgY29uc3QgbWFpbkZpbGUgPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uWydtYWluJ107XG4gICAgICBpZiAobWFpbkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgY29uc3QgcGF0aFRvTWFpbiA9IGpvaW4oZW50cnlQb2ludC5wYXRoLCBtYWluRmlsZSk7XG4gICAgICByZXR1cm4gaXNVbWRNb2R1bGUoZnMsIHBhdGhUb01haW4pID8gJ3VtZCcgOiAnY29tbW9uanMnO1xuICAgIGNhc2UgJ21vZHVsZSc6XG4gICAgICByZXR1cm4gJ2VzbTUnO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbi8qKlxuICogUGFyc2VzIHRoZSBKU09OIGZyb20gYSBwYWNrYWdlLmpzb24gZmlsZS5cbiAqIEBwYXJhbSBwYWNrYWdlSnNvblBhdGggdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2UuanNvbiBmaWxlLlxuICogQHJldHVybnMgSlNPTiBmcm9tIHRoZSBwYWNrYWdlLmpzb24gZmlsZSBpZiBpdCBpcyB2YWxpZCwgYG51bGxgIG90aGVyd2lzZS5cbiAqL1xuZnVuY3Rpb24gbG9hZEVudHJ5UG9pbnRQYWNrYWdlKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgcGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBoYXNDb25maWc6IGJvb2xlYW4pOiBFbnRyeVBvaW50UGFja2FnZUpzb258bnVsbCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoIWhhc0NvbmZpZykge1xuICAgICAgLy8gV2UgbWF5IGhhdmUgcnVuIGludG8gYSBwYWNrYWdlLmpzb24gd2l0aCB1bmV4cGVjdGVkIHN5bWJvbHNcbiAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gcmVhZCBlbnRyeSBwb2ludCBpbmZvIGZyb20gJHtwYWNrYWdlSnNvblBhdGh9IHdpdGggZXJyb3IgJHtlfS5gKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNVbWRNb2R1bGUoZnM6IEZpbGVTeXN0ZW0sIHNvdXJjZUZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICBjb25zdCByZXNvbHZlZFBhdGggPSByZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXMoZnMsIHNvdXJjZUZpbGVQYXRoLCBbJycsICcuanMnLCAnL2luZGV4LmpzJ10pO1xuICBpZiAocmVzb2x2ZWRQYXRoID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHNvdXJjZUZpbGUgPVxuICAgICAgdHMuY3JlYXRlU291cmNlRmlsZShzb3VyY2VGaWxlUGF0aCwgZnMucmVhZEZpbGUocmVzb2x2ZWRQYXRoKSwgdHMuU2NyaXB0VGFyZ2V0LkVTNSk7XG4gIHJldHVybiBzb3VyY2VGaWxlLnN0YXRlbWVudHMubGVuZ3RoID4gMCAmJlxuICAgICAgcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc291cmNlRmlsZS5zdGF0ZW1lbnRzWzBdKSAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gbWVyZ2VDb25maWdBbmRQYWNrYWdlSnNvbihcbiAgICBlbnRyeVBvaW50UGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbiB8IG51bGwsIGVudHJ5UG9pbnRDb25maWc6IE5nY2NFbnRyeVBvaW50Q29uZmlnLFxuICAgIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFBhY2thZ2VKc29uIHtcbiAgaWYgKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiAhPT0gbnVsbCkge1xuICAgIHJldHVybiB7Li4uZW50cnlQb2ludFBhY2thZ2VKc29uLCAuLi5lbnRyeVBvaW50Q29uZmlnLm92ZXJyaWRlfTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBuYW1lID0gYCR7YmFzZW5hbWUocGFja2FnZVBhdGgpfS8ke3JlbGF0aXZlKHBhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCl9YDtcbiAgICByZXR1cm4ge25hbWUsIC4uLmVudHJ5UG9pbnRDb25maWcub3ZlcnJpZGV9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGd1ZXNzVHlwaW5nc0Zyb21QYWNrYWdlSnNvbihcbiAgICBmczogRmlsZVN5c3RlbSwgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIGVudHJ5UG9pbnRQYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uKTogQWJzb2x1dGVGc1BhdGh8bnVsbCB7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHtcbiAgICBjb25zdCBmaWVsZCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltwcm9wXTtcbiAgICBpZiAodHlwZW9mIGZpZWxkICE9PSAnc3RyaW5nJykge1xuICAgICAgLy8gU29tZSBjcmF6eSBwYWNrYWdlcyBoYXZlIHRoaW5ncyBsaWtlIGFycmF5cyBpbiB0aGVzZSBmaWVsZHMhXG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgcmVsYXRpdmVUeXBpbmdzUGF0aCA9IGZpZWxkLnJlcGxhY2UoL1xcLmpzJC8sICcuZC50cycpO1xuICAgIGNvbnN0IHR5cGluZ3NQYXRoID0gcmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgcmVsYXRpdmVUeXBpbmdzUGF0aCk7XG4gICAgaWYgKGZzLmV4aXN0cyh0eXBpbmdzUGF0aCkpIHtcbiAgICAgIHJldHVybiB0eXBpbmdzUGF0aDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogRmluZCB0aGUgdmVyc2lvbiBvZiB0aGUgcGFja2FnZSBhdCBgcGFja2FnZUpzb25QYXRoYC5cbiAqXG4gKiBAcmV0dXJucyB0aGUgdmVyc2lvbiBzdHJpbmcgb3IgYG51bGxgIGlmIHRoZSBwYWNrYWdlLmpzb24gZG9lcyBub3QgZXhpc3Qgb3IgaXMgaW52YWxpZC5cbiAqL1xuZnVuY3Rpb24gZ2V0UGFja2FnZVZlcnNpb24oZnM6IEZpbGVTeXN0ZW0sIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBzdHJpbmd8bnVsbCB7XG4gIHRyeSB7XG4gICAgaWYgKGZzLmV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG4gICAgICByZXR1cm4gcGFja2FnZUpzb25bJ3ZlcnNpb24nXSB8fCBudWxsO1xuICAgIH1cbiAgfSBjYXRjaCB7XG4gICAgLy8gRG8gbm90aGluZ1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuIl19