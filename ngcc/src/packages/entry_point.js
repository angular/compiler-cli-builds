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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaURBQXdDO0lBQ3hDLDZCQUE4QjtJQUM5QiwrQkFBaUM7SUFDakMsMkVBQXlGO0lBQ3pGLHlFQUE0RDtJQUU1RCw4REFBa0Q7SUErRGxELDRGQUE0RjtJQUMvRSxRQUFBLDJCQUEyQixHQUNwQyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUdwRjs7OztPQUlHO0lBQ1UsUUFBQSxjQUFjLEdBQUcsZ0JBQWdCLENBQUM7SUFFL0M7O09BRUc7SUFDVSxRQUFBLHdCQUF3QixHQUFHLDBCQUEwQixDQUFDO0lBY25FOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsU0FBZ0IsaUJBQWlCLENBQzdCLEVBQWMsRUFBRSxNQUF5QixFQUFFLE1BQWMsRUFBRSxXQUEyQixFQUN0RixjQUE4QjtRQUNoQyxJQUFNLGVBQWUsR0FBRyxxQkFBTyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNoRSxJQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDOUQsSUFBTSxnQkFBZ0IsR0FDbEIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDckYsSUFBTSxTQUFTLEdBQUcsZ0JBQWdCLEtBQUssU0FBUyxDQUFDO1FBRWpELElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FB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S0FBbUIsSUFBQSxnQ0FBQSxpQkFBQSxtQ0FBMkIsQ0FBQSx3RUFBQSxpSEFBRTtnQkFBM0MsSUFBTSxJQUFJLHdDQUFBO2dCQUNiLElBQU0sS0FBSyxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtvQkFDN0IsK0RBQStEO29CQUMvRCxTQUFTO2lCQUNWO2dCQUNELElBQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQzVELElBQU0sV0FBVyxHQUFHLHFCQUFPLENBQUMsY0FBYyxFQUFFLG1CQUFtQixDQUFDLENBQUM7Z0JBQ2pFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRTtvQkFDMUIsT0FBTyxXQUFXLENBQUM7aUJBQ3BCO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLGlCQUFpQixDQUFDLEVBQWMsRUFBRSxlQUErQjtRQUN4RSxJQUFJO1lBQ0YsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxFQUFFO2dCQUM5QixJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQkFDN0QsT0FBTyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDO2FBQ3ZDO1NBQ0Y7UUFBQyxXQUFNO1lBQ04sYUFBYTtTQUNkO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtyZWxhdGl2ZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0IHtiYXNlbmFtZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGpvaW4sIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge3BhcnNlU3RhdGVtZW50Rm9yVW1kTW9kdWxlfSBmcm9tICcuLi9ob3N0L3VtZF9ob3N0JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge3Jlc29sdmVGaWxlV2l0aFBvc3RmaXhlc30gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbiwgTmdjY0VudHJ5UG9pbnRDb25maWd9IGZyb20gJy4vY29uZmlndXJhdGlvbic7XG5cbi8qKlxuICogVGhlIHBvc3NpYmxlIHZhbHVlcyBmb3IgdGhlIGZvcm1hdCBvZiBhbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IHR5cGUgRW50cnlQb2ludEZvcm1hdCA9ICdlc201J3wnZXNtMjAxNSd8J3VtZCd8J2NvbW1vbmpzJztcblxuLyoqXG4gKiBBbiBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCBhbiBlbnRyeS1wb2ludCwgaW5jbHVkaW5nIHBhdGhzXG4gKiB0byBlYWNoIG9mIHRoZSBwb3NzaWJsZSBlbnRyeS1wb2ludCBmb3JtYXRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnQgZXh0ZW5kcyBKc29uT2JqZWN0IHtcbiAgLyoqIFRoZSBuYW1lIG9mIHRoZSBwYWNrYWdlIChlLmcuIGBAYW5ndWxhci9jb3JlYCkuICovXG4gIG5hbWU6IHN0cmluZztcbiAgLyoqIFRoZSBwYXJzZWQgcGFja2FnZS5qc29uIGZpbGUgZm9yIHRoaXMgZW50cnktcG9pbnQuICovXG4gIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb247XG4gIC8qKiBUaGUgcGF0aCB0byB0aGUgcGFja2FnZSB0aGF0IGNvbnRhaW5zIHRoaXMgZW50cnktcG9pbnQuICovXG4gIHBhY2thZ2U6IEFic29sdXRlRnNQYXRoO1xuICAvKiogVGhlIHBhdGggdG8gdGhpcyBlbnRyeSBwb2ludC4gKi9cbiAgcGF0aDogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBUaGUgcGF0aCB0byBhIHR5cGluZ3MgKC5kLnRzKSBmaWxlIGZvciB0aGlzIGVudHJ5LXBvaW50LiAqL1xuICB0eXBpbmdzOiBBYnNvbHV0ZUZzUGF0aDtcbiAgLyoqIElzIHRoaXMgRW50cnlQb2ludCBjb21waWxlZCB3aXRoIHRoZSBBbmd1bGFyIFZpZXcgRW5naW5lIGNvbXBpbGVyPyAqL1xuICBjb21waWxlZEJ5QW5ndWxhcjogYm9vbGVhbjtcbiAgLyoqIFNob3VsZCBuZ2NjIGlnbm9yZSBtaXNzaW5nIGRlcGVuZGVuY2llcyBhbmQgcHJvY2VzcyB0aGlzIGVudHJ5cG9pbnQgYW55d2F5PyAqL1xuICBpZ25vcmVNaXNzaW5nRGVwZW5kZW5jaWVzOiBib29sZWFuO1xuICAvKiogU2hvdWxkIG5nY2MgZ2VuZXJhdGUgZGVlcCByZS1leHBvcnRzIGZvciB0aGlzIGVudHJ5cG9pbnQ/ICovXG4gIGdlbmVyYXRlRGVlcFJlZXhwb3J0czogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgSnNvblByaW1pdGl2ZSA9IHN0cmluZ3xudW1iZXJ8Ym9vbGVhbnxudWxsO1xuZXhwb3J0IHR5cGUgSnNvblZhbHVlID0gSnNvblByaW1pdGl2ZXxKc29uQXJyYXl8SnNvbk9iamVjdHx1bmRlZmluZWQ7XG5leHBvcnQgaW50ZXJmYWNlIEpzb25BcnJheSBleHRlbmRzIEFycmF5PEpzb25WYWx1ZT4ge31cbmV4cG9ydCBpbnRlcmZhY2UgSnNvbk9iamVjdCB7XG4gIFtrZXk6IHN0cmluZ106IEpzb25WYWx1ZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXAge1xuICBicm93c2VyPzogc3RyaW5nO1xuICBmZXNtMjAxNT86IHN0cmluZztcbiAgZmVzbTU/OiBzdHJpbmc7XG4gIGVzMjAxNT86IHN0cmluZzsgIC8vIGlmIGV4aXN0cyB0aGVuIGl0IGlzIGFjdHVhbGx5IEZFU00yMDE1XG4gIGVzbTIwMTU/OiBzdHJpbmc7XG4gIGVzbTU/OiBzdHJpbmc7XG4gIG1haW4/OiBzdHJpbmc7ICAgICAvLyBVTURcbiAgbW9kdWxlPzogc3RyaW5nOyAgIC8vIGlmIGV4aXN0cyB0aGVuIGl0IGlzIGFjdHVhbGx5IEZFU001XG4gIHR5cGVzPzogc3RyaW5nOyAgICAvLyBTeW5vbnltb3VzIHRvIGB0eXBpbmdzYCBwcm9wZXJ0eSAtIHNlZSBodHRwczovL2JpdC5seS8yT2dXcDJIXG4gIHR5cGluZ3M/OiBzdHJpbmc7ICAvLyBUeXBlU2NyaXB0IC5kLnRzIGZpbGVzXG59XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyA9IGtleW9mIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcDtcblxuLyoqXG4gKiBUaGUgcHJvcGVydGllcyB0aGF0IG1heSBiZSBsb2FkZWQgZnJvbSB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50UGFja2FnZUpzb24gZXh0ZW5kcyBKc29uT2JqZWN0LCBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXAge1xuICBuYW1lOiBzdHJpbmc7XG4gIHNjcmlwdHM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBfX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuZXhwb3J0IHR5cGUgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSA9IEV4Y2x1ZGU8UGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzLCAndHlwZXMnfCd0eXBpbmdzJz47XG4vLyBXZSBuZWVkIHRvIGtlZXAgdGhlIGVsZW1lbnRzIG9mIHRoaXMgY29uc3QgYW5kIHRoZSBgRW50cnlQb2ludEpzb25Qcm9wZXJ0eWAgdHlwZSBpbiBzeW5jLlxuZXhwb3J0IGNvbnN0IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUzogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID1cbiAgICBbJ2Zlc20yMDE1JywgJ2Zlc201JywgJ2VzMjAxNScsICdlc20yMDE1JywgJ2VzbTUnLCAnbWFpbicsICdtb2R1bGUnLCAnYnJvd3NlciddO1xuXG5cbi8qKlxuICogVGhlIHBhdGggZG9lcyBub3QgcmVwcmVzZW50IGFuIGVudHJ5LXBvaW50OlxuICogKiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gYXQgdGhlIHBhdGggYW5kIHRoZXJlIGlzIG5vIGNvbmZpZyB0byBmb3JjZSBhbiBlbnRyeS1wb2ludFxuICogKiBvciB0aGUgZW50cnlwb2ludCBpcyBgaWdub3JlZGAgYnkgYSBjb25maWcuXG4gKi9cbmV4cG9ydCBjb25zdCBOT19FTlRSWV9QT0lOVCA9ICduby1lbnRyeS1wb2ludCc7XG5cbi8qKlxuICogVGhlIHBhdGggaGFzIGEgcGFja2FnZS5qc29uLCBidXQgaXQgaXMgbm90IGEgdmFsaWQgZW50cnktcG9pbnQgZm9yIG5nY2MgcHJvY2Vzc2luZy5cbiAqL1xuZXhwb3J0IGNvbnN0IElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCA9ICdpbmNvbXBhdGlibGUtZW50cnktcG9pbnQnO1xuXG4vKipcbiAqIFRoZSByZXN1bHQgb2YgY2FsbGluZyBgZ2V0RW50cnlQb2ludEluZm8oKWAuXG4gKlxuICogVGhpcyB3aWxsIGJlIGFuIGBFbnRyeVBvaW50YCBvYmplY3QgaWYgYW4gQW5ndWxhciBlbnRyeS1wb2ludCB3YXMgaWRlbnRpZmllZDtcbiAqIE90aGVyd2lzZSBpdCB3aWxsIGJlIGEgZmxhZyBpbmRpY2F0aW5nIG9uZSBvZjpcbiAqICogTk9fRU5UUllfUE9JTlQgLSB0aGUgcGF0aCBpcyBub3QgYW4gZW50cnktcG9pbnQgb3IgbmdjYyBpcyBjb25maWd1cmVkIHRvIGlnbm9yZSBpdFxuICogKiBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQgLSB0aGUgcGF0aCB3YXMgYSBub24tcHJvY2Vzc2FibGUgZW50cnktcG9pbnQgdGhhdCBzaG91bGQgYmUgc2VhcmNoZWRcbiAqIGZvciBzdWItZW50cnktcG9pbnRzXG4gKi9cbmV4cG9ydCB0eXBlIEdldEVudHJ5UG9pbnRSZXN1bHQgPSBFbnRyeVBvaW50fHR5cGVvZiBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlR8dHlwZW9mIE5PX0VOVFJZX1BPSU5UO1xuXG5cbi8qKlxuICogVHJ5IHRvIGNyZWF0ZSBhbiBlbnRyeS1wb2ludCBmcm9tIHRoZSBnaXZlbiBwYXRocyBhbmQgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0gcGFja2FnZVBhdGggdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGNvbnRhaW5pbmcgbnBtIHBhY2thZ2VcbiAqIEBwYXJhbSBlbnRyeVBvaW50UGF0aCB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcG90ZW50aWFsIGVudHJ5LXBvaW50LlxuICogQHJldHVybnNcbiAqIC0gQW4gZW50cnktcG9pbnQgaWYgaXQgaXMgdmFsaWQuXG4gKiAtIGBOT19FTlRSWV9QT0lOVGAgd2hlbiB0aGVyZSBpcyBubyBwYWNrYWdlLmpzb24gYXQgdGhlIHBhdGggYW5kIHRoZXJlIGlzIG5vIGNvbmZpZyB0byBmb3JjZSBhblxuICogZW50cnktcG9pbnQgb3IgdGhlIGVudHJ5cG9pbnQgaXMgYGlnbm9yZWRgLlxuICogLSBgSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UYCB0aGVyZSBpcyBhIHBhY2thZ2UuanNvbiBidXQgaXQgaXMgbm90IGEgdmFsaWQgQW5ndWxhciBjb21waWxlZFxuICogZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnRyeVBvaW50SW5mbyhcbiAgICBmczogRmlsZVN5c3RlbSwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgbG9nZ2VyOiBMb2dnZXIsIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBHZXRFbnRyeVBvaW50UmVzdWx0IHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZShlbnRyeVBvaW50UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlVmVyc2lvbiA9IGdldFBhY2thZ2VWZXJzaW9uKGZzLCBwYWNrYWdlSnNvblBhdGgpO1xuICBjb25zdCBlbnRyeVBvaW50Q29uZmlnID1cbiAgICAgIGNvbmZpZy5nZXRQYWNrYWdlQ29uZmlnKHBhY2thZ2VQYXRoLCBwYWNrYWdlVmVyc2lvbikuZW50cnlQb2ludHNbZW50cnlQb2ludFBhdGhdO1xuICBjb25zdCBoYXNDb25maWcgPSBlbnRyeVBvaW50Q29uZmlnICE9PSB1bmRlZmluZWQ7XG5cbiAgaWYgKCFoYXNDb25maWcgJiYgIWZzLmV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgLy8gTm8gcGFja2FnZS5qc29uIGFuZCBubyBjb25maWdcbiAgICByZXR1cm4gTk9fRU5UUllfUE9JTlQ7XG4gIH1cblxuICBpZiAoaGFzQ29uZmlnICYmIGVudHJ5UG9pbnRDb25maWcuaWdub3JlID09PSB0cnVlKSB7XG4gICAgLy8gRXhwbGljaXRseSBpZ25vcmVkXG4gICAgcmV0dXJuIE5PX0VOVFJZX1BPSU5UO1xuICB9XG5cbiAgY29uc3QgbG9hZGVkRW50cnlQb2ludFBhY2thZ2VKc29uID0gbG9hZEVudHJ5UG9pbnRQYWNrYWdlKGZzLCBsb2dnZXIsIHBhY2thZ2VKc29uUGF0aCwgaGFzQ29uZmlnKTtcbiAgY29uc3QgZW50cnlQb2ludFBhY2thZ2VKc29uID0gaGFzQ29uZmlnID9cbiAgICAgIG1lcmdlQ29uZmlnQW5kUGFja2FnZUpzb24oXG4gICAgICAgICAgbG9hZGVkRW50cnlQb2ludFBhY2thZ2VKc29uLCBlbnRyeVBvaW50Q29uZmlnLCBwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpIDpcbiAgICAgIGxvYWRlZEVudHJ5UG9pbnRQYWNrYWdlSnNvbjtcblxuICBpZiAoZW50cnlQb2ludFBhY2thZ2VKc29uID09PSBudWxsKSB7XG4gICAgLy8gcGFja2FnZS5qc29uIGV4aXN0cyBidXQgY291bGQgbm90IGJlIHBhcnNlZCBhbmQgdGhlcmUgd2FzIG5vIHJlZGVlbWluZyBjb25maWdcbiAgICByZXR1cm4gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UO1xuICB9XG5cbiAgY29uc3QgdHlwaW5ncyA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi50eXBpbmdzIHx8IGVudHJ5UG9pbnRQYWNrYWdlSnNvbi50eXBlcyB8fFxuICAgICAgZ3Vlc3NUeXBpbmdzRnJvbVBhY2thZ2VKc29uKGZzLCBlbnRyeVBvaW50UGF0aCwgZW50cnlQb2ludFBhY2thZ2VKc29uKTtcbiAgaWYgKHR5cGVvZiB0eXBpbmdzICE9PSAnc3RyaW5nJykge1xuICAgIC8vIE1pc3NpbmcgdGhlIHJlcXVpcmVkIGB0eXBpbmdzYCBwcm9wZXJ0eVxuICAgIHJldHVybiBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQ7XG4gIH1cblxuICAvLyBBbiBlbnRyeS1wb2ludCBpcyBhc3N1bWVkIHRvIGJlIGNvbXBpbGVkIGJ5IEFuZ3VsYXIgaWYgdGhlcmUgaXMgZWl0aGVyOlxuICAvLyAqIGEgYG1ldGFkYXRhLmpzb25gIGZpbGUgbmV4dCB0byB0aGUgdHlwaW5ncyBlbnRyeS1wb2ludFxuICAvLyAqIGEgY3VzdG9tIGNvbmZpZyBmb3IgdGhpcyBlbnRyeS1wb2ludFxuICBjb25zdCBtZXRhZGF0YVBhdGggPSByZXNvbHZlKGVudHJ5UG9pbnRQYXRoLCB0eXBpbmdzLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnJykgKyAnLm1ldGFkYXRhLmpzb24nKTtcbiAgY29uc3QgY29tcGlsZWRCeUFuZ3VsYXIgPSBlbnRyeVBvaW50Q29uZmlnICE9PSB1bmRlZmluZWQgfHwgZnMuZXhpc3RzKG1ldGFkYXRhUGF0aCk7XG5cbiAgY29uc3QgZW50cnlQb2ludEluZm86IEVudHJ5UG9pbnQgPSB7XG4gICAgbmFtZTogZW50cnlQb2ludFBhY2thZ2VKc29uLm5hbWUsXG4gICAgcGFja2FnZUpzb246IGVudHJ5UG9pbnRQYWNrYWdlSnNvbixcbiAgICBwYWNrYWdlOiBwYWNrYWdlUGF0aCxcbiAgICBwYXRoOiBlbnRyeVBvaW50UGF0aCxcbiAgICB0eXBpbmdzOiByZXNvbHZlKGVudHJ5UG9pbnRQYXRoLCB0eXBpbmdzKSxcbiAgICBjb21waWxlZEJ5QW5ndWxhcixcbiAgICBpZ25vcmVNaXNzaW5nRGVwZW5kZW5jaWVzOlxuICAgICAgICBlbnRyeVBvaW50Q29uZmlnICE9PSB1bmRlZmluZWQgPyAhIWVudHJ5UG9pbnRDb25maWcuaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llcyA6IGZhbHNlLFxuICAgIGdlbmVyYXRlRGVlcFJlZXhwb3J0czpcbiAgICAgICAgZW50cnlQb2ludENvbmZpZyAhPT0gdW5kZWZpbmVkID8gISFlbnRyeVBvaW50Q29uZmlnLmdlbmVyYXRlRGVlcFJlZXhwb3J0cyA6IGZhbHNlLFxuICB9O1xuXG4gIHJldHVybiBlbnRyeVBvaW50SW5mbztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgcGFja2FnZS5qc29uIHByb3BlcnR5IGludG8gYW4gZW50cnktcG9pbnQgZm9ybWF0LlxuICpcbiAqIEBwYXJhbSBwcm9wZXJ0eSBUaGUgcHJvcGVydHkgdG8gY29udmVydCB0byBhIGZvcm1hdC5cbiAqIEByZXR1cm5zIEFuIGVudHJ5LXBvaW50IGZvcm1hdCBvciBgdW5kZWZpbmVkYCBpZiBub25lIG1hdGNoIHRoZSBnaXZlbiBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudHJ5UG9pbnRGb3JtYXQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIHByb3BlcnR5OiBFbnRyeVBvaW50SnNvblByb3BlcnR5KTogRW50cnlQb2ludEZvcm1hdHxcbiAgICB1bmRlZmluZWQge1xuICBzd2l0Y2ggKHByb3BlcnR5KSB7XG4gICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdmZXNtNSc6XG4gICAgICByZXR1cm4gJ2VzbTUnO1xuICAgIGNhc2UgJ2VzMjAxNSc6XG4gICAgICByZXR1cm4gJ2VzbTIwMTUnO1xuICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgcmV0dXJuICdlc20yMDE1JztcbiAgICBjYXNlICdlc201JzpcbiAgICAgIHJldHVybiAnZXNtNSc7XG4gICAgY2FzZSAnYnJvd3Nlcic6XG4gICAgICBjb25zdCBicm93c2VyRmlsZSA9IGVudHJ5UG9pbnQucGFja2FnZUpzb25bJ2Jyb3dzZXInXTtcbiAgICAgIGlmICh0eXBlb2YgYnJvd3NlckZpbGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gc25pZmZNb2R1bGVGb3JtYXQoZnMsIGpvaW4oZW50cnlQb2ludC5wYXRoLCBicm93c2VyRmlsZSkpO1xuICAgIGNhc2UgJ21haW4nOlxuICAgICAgY29uc3QgbWFpbkZpbGUgPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uWydtYWluJ107XG4gICAgICBpZiAobWFpbkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNuaWZmTW9kdWxlRm9ybWF0KGZzLCBqb2luKGVudHJ5UG9pbnQucGF0aCwgbWFpbkZpbGUpKTtcbiAgICBjYXNlICdtb2R1bGUnOlxuICAgICAgY29uc3QgbW9kdWxlRmlsZVBhdGggPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uWydtb2R1bGUnXTtcbiAgICAgIC8vIEFzIG9mIHZlcnNpb24gMTAsIHRoZSBgbW9kdWxlYCBwcm9wZXJ0eSBpbiBgcGFja2FnZS5qc29uYCBzaG91bGQgcG9pbnQgdG9cbiAgICAgIC8vIHRoZSBFU00yMDE1IGZvcm1hdCBvdXRwdXQgYXMgcGVyIEFuZ3VsYXIgUGFja2FnZSBmb3JtYXQgc3BlY2lmaWNhdGlvbi4gVGhpc1xuICAgICAgLy8gbWVhbnMgdGhhdCB0aGUgYG1vZHVsZWAgcHJvcGVydHkgY2FwdHVyZXMgbXVsdGlwbGUgZm9ybWF0cywgYXMgb2xkIGxpYnJhcmllc1xuICAgICAgLy8gYnVpbHQgd2l0aCB0aGUgb2xkIEFQRiBjYW4gc3RpbGwgYmUgcHJvY2Vzc2VkLiBXZSBkZXRlY3QgdGhlIGZvcm1hdCBieSBjaGVja2luZ1xuICAgICAgLy8gdGhlIHBhdGhzIHRoYXQgc2hvdWxkIGJlIHVzZWQgYXMgcGVyIEFQRiBzcGVjaWZpY2F0aW9uLlxuICAgICAgaWYgKHR5cGVvZiBtb2R1bGVGaWxlUGF0aCA9PT0gJ3N0cmluZycgJiYgbW9kdWxlRmlsZVBhdGguaW5jbHVkZXMoJ2VzbTIwMTUnKSkge1xuICAgICAgICByZXR1cm4gYGVzbTIwMTVgO1xuICAgICAgfVxuICAgICAgcmV0dXJuICdlc201JztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlcyB0aGUgSlNPTiBmcm9tIGEgcGFja2FnZS5qc29uIGZpbGUuXG4gKiBAcGFyYW0gcGFja2FnZUpzb25QYXRoIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlLmpzb24gZmlsZS5cbiAqIEByZXR1cm5zIEpTT04gZnJvbSB0aGUgcGFja2FnZS5qc29uIGZpbGUgaWYgaXQgaXMgdmFsaWQsIGBudWxsYCBvdGhlcndpc2UuXG4gKi9cbmZ1bmN0aW9uIGxvYWRFbnRyeVBvaW50UGFja2FnZShcbiAgICBmczogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIHBhY2thZ2VKc29uUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgaGFzQ29uZmlnOiBib29sZWFuKTogRW50cnlQb2ludFBhY2thZ2VKc29ufG51bGwge1xuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKCFoYXNDb25maWcpIHtcbiAgICAgIC8vIFdlIG1heSBoYXZlIHJ1biBpbnRvIGEgcGFja2FnZS5qc29uIHdpdGggdW5leHBlY3RlZCBzeW1ib2xzXG4gICAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIHJlYWQgZW50cnkgcG9pbnQgaW5mbyBmcm9tICR7cGFja2FnZUpzb25QYXRofSB3aXRoIGVycm9yICR7ZX0uYCk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNuaWZmTW9kdWxlRm9ybWF0KGZzOiBGaWxlU3lzdGVtLCBzb3VyY2VGaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50Rm9ybWF0fFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IHJlc29sdmVkUGF0aCA9IHJlc29sdmVGaWxlV2l0aFBvc3RmaXhlcyhmcywgc291cmNlRmlsZVBhdGgsIFsnJywgJy5qcycsICcvaW5kZXguanMnXSk7XG4gIGlmIChyZXNvbHZlZFBhdGggPT09IG51bGwpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3Qgc291cmNlRmlsZSA9XG4gICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKHNvdXJjZUZpbGVQYXRoLCBmcy5yZWFkRmlsZShyZXNvbHZlZFBhdGgpLCB0cy5TY3JpcHRUYXJnZXQuRVM1KTtcbiAgaWYgKHNvdXJjZUZpbGUuc3RhdGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGlmICh0cy5pc0V4dGVybmFsTW9kdWxlKHNvdXJjZUZpbGUpKSB7XG4gICAgcmV0dXJuICdlc201JztcbiAgfSBlbHNlIGlmIChwYXJzZVN0YXRlbWVudEZvclVtZE1vZHVsZShzb3VyY2VGaWxlLnN0YXRlbWVudHNbMF0pICE9PSBudWxsKSB7XG4gICAgcmV0dXJuICd1bWQnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnY29tbW9uanMnO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1lcmdlQ29uZmlnQW5kUGFja2FnZUpzb24oXG4gICAgZW50cnlQb2ludFBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb258bnVsbCwgZW50cnlQb2ludENvbmZpZzogTmdjY0VudHJ5UG9pbnRDb25maWcsXG4gICAgcGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50UGFja2FnZUpzb24ge1xuICBpZiAoZW50cnlQb2ludFBhY2thZ2VKc29uICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIHsuLi5lbnRyeVBvaW50UGFja2FnZUpzb24sIC4uLmVudHJ5UG9pbnRDb25maWcub3ZlcnJpZGV9O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IG5hbWUgPSBgJHtiYXNlbmFtZShwYWNrYWdlUGF0aCl9LyR7cmVsYXRpdmUocGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoKX1gO1xuICAgIHJldHVybiB7bmFtZSwgLi4uZW50cnlQb2ludENvbmZpZy5vdmVycmlkZX07XG4gIH1cbn1cblxuZnVuY3Rpb24gZ3Vlc3NUeXBpbmdzRnJvbVBhY2thZ2VKc29uKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgZW50cnlQb2ludFBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24pOiBBYnNvbHV0ZUZzUGF0aHxudWxsIHtcbiAgZm9yIChjb25zdCBwcm9wIG9mIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykge1xuICAgIGNvbnN0IGZpZWxkID0gZW50cnlQb2ludFBhY2thZ2VKc29uW3Byb3BdO1xuICAgIGlmICh0eXBlb2YgZmllbGQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBTb21lIGNyYXp5IHBhY2thZ2VzIGhhdmUgdGhpbmdzIGxpa2UgYXJyYXlzIGluIHRoZXNlIGZpZWxkcyFcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCByZWxhdGl2ZVR5cGluZ3NQYXRoID0gZmllbGQucmVwbGFjZSgvXFwuanMkLywgJy5kLnRzJyk7XG4gICAgY29uc3QgdHlwaW5nc1BhdGggPSByZXNvbHZlKGVudHJ5UG9pbnRQYXRoLCByZWxhdGl2ZVR5cGluZ3NQYXRoKTtcbiAgICBpZiAoZnMuZXhpc3RzKHR5cGluZ3NQYXRoKSkge1xuICAgICAgcmV0dXJuIHR5cGluZ3NQYXRoO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIGF0IGBwYWNrYWdlSnNvblBhdGhgLlxuICpcbiAqIEByZXR1cm5zIHRoZSB2ZXJzaW9uIHN0cmluZyBvciBgbnVsbGAgaWYgdGhlIHBhY2thZ2UuanNvbiBkb2VzIG5vdCBleGlzdCBvciBpcyBpbnZhbGlkLlxuICovXG5mdW5jdGlvbiBnZXRQYWNrYWdlVmVyc2lvbihmczogRmlsZVN5c3RlbSwgcGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZ3xudWxsIHtcbiAgdHJ5IHtcbiAgICBpZiAoZnMuZXhpc3RzKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcbiAgICAgIHJldHVybiBwYWNrYWdlSnNvblsndmVyc2lvbiddIHx8IG51bGw7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBEbyBub3RoaW5nXG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=