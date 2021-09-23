(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/execution/tasks/api", "@angular/compiler-cli/ngcc/src/packages/bundle_program", "@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host", "@angular/compiler-cli/ngcc/src/packages/source_file_cache"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.makeEntryPointBundle = void 0;
    var tslib_1 = require("tslib");
    var api_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/api");
    var bundle_program_1 = require("@angular/compiler-cli/ngcc/src/packages/bundle_program");
    var ngcc_compiler_host_1 = require("@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host");
    var source_file_cache_1 = require("@angular/compiler-cli/ngcc/src/packages/source_file_cache");
    /**
     * Get an object that describes a formatted bundle for an entry-point.
     * @param fs The current file-system being used.
     * @param entryPoint The entry-point that contains the bundle.
     * @param sharedFileCache The cache to use for source files that are shared across all entry-points.
     * @param moduleResolutionCache The module resolution cache to use.
     * @param formatPath The path to the source files for this bundle.
     * @param isCore This entry point is the Angular core package.
     * @param format The underlying format of the bundle.
     * @param dtsProcessing Whether to transform the typings along with this bundle.
     * @param pathMappings An optional set of mappings to use when compiling files.
     * @param mirrorDtsFromSrc If true then the `dts` program will contain additional files that
     * were guessed by mapping the `src` files to `dts` files.
     * @param enableI18nLegacyMessageIdFormat Whether to render legacy message ids for i18n messages in
     * component templates.
     */
    function makeEntryPointBundle(fs, entryPoint, sharedFileCache, moduleResolutionCache, formatPath, isCore, format, dtsProcessing, pathMappings, mirrorDtsFromSrc, enableI18nLegacyMessageIdFormat) {
        if (mirrorDtsFromSrc === void 0) { mirrorDtsFromSrc = false; }
        if (enableI18nLegacyMessageIdFormat === void 0) { enableI18nLegacyMessageIdFormat = true; }
        // Create the TS program and necessary helpers.
        var rootDir = entryPoint.packagePath;
        var options = (0, tslib_1.__assign)({ allowJs: true, maxNodeModuleJsDepth: Infinity, rootDir: rootDir }, pathMappings);
        var entryPointCache = new source_file_cache_1.EntryPointFileCache(fs, sharedFileCache);
        var dtsHost = new ngcc_compiler_host_1.NgccDtsCompilerHost(fs, options, entryPointCache, moduleResolutionCache);
        var srcHost = new ngcc_compiler_host_1.NgccSourcesCompilerHost(fs, options, entryPointCache, moduleResolutionCache, entryPoint.packagePath);
        // Create the bundle programs, as necessary.
        var absFormatPath = fs.resolve(entryPoint.path, formatPath);
        var typingsPath = fs.resolve(entryPoint.path, entryPoint.typings);
        var src = (0, bundle_program_1.makeBundleProgram)(fs, isCore, entryPoint.packagePath, absFormatPath, 'r3_symbols.js', options, srcHost);
        var additionalDtsFiles = dtsProcessing !== api_1.DtsProcessing.No && mirrorDtsFromSrc ?
            computePotentialDtsFilesFromJsFiles(fs, src.program, absFormatPath, typingsPath) :
            [];
        var dts = dtsProcessing !== api_1.DtsProcessing.No ?
            (0, bundle_program_1.makeBundleProgram)(fs, isCore, entryPoint.packagePath, typingsPath, 'r3_symbols.d.ts', (0, tslib_1.__assign)((0, tslib_1.__assign)({}, options), { allowJs: false }), dtsHost, additionalDtsFiles) :
            null;
        var isFlatCore = isCore && src.r3SymbolsFile === null;
        return {
            entryPoint: entryPoint,
            format: format,
            rootDirs: [rootDir],
            isCore: isCore,
            isFlatCore: isFlatCore,
            src: src,
            dts: dts,
            dtsProcessing: dtsProcessing,
            enableI18nLegacyMessageIdFormat: enableI18nLegacyMessageIdFormat
        };
    }
    exports.makeEntryPointBundle = makeEntryPointBundle;
    function computePotentialDtsFilesFromJsFiles(fs, srcProgram, formatPath, typingsPath) {
        var e_1, _a;
        var formatRoot = fs.dirname(formatPath);
        var typingsRoot = fs.dirname(typingsPath);
        var additionalFiles = [];
        try {
            for (var _b = (0, tslib_1.__values)(srcProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var sf = _c.value;
                if (!sf.fileName.endsWith('.js')) {
                    continue;
                }
                // Given a source file at e.g. `esm2015/src/some/nested/index.js`, try to resolve the
                // declaration file under the typings root in `src/some/nested/index.d.ts`.
                var mirroredDtsPath = fs.resolve(typingsRoot, fs.relative(formatRoot, sf.fileName.replace(/\.js$/, '.d.ts')));
                if (fs.exists(mirroredDtsPath)) {
                    additionalFiles.push(mirroredDtsPath);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return additionalFiles;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfYnVuZGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBU0EsMEVBQXFEO0lBRXJELHlGQUFrRTtJQUVsRSxpR0FBa0Y7SUFDbEYsK0ZBQXlFO0lBa0J6RTs7Ozs7Ozs7Ozs7Ozs7O09BZUc7SUFDSCxTQUFnQixvQkFBb0IsQ0FDaEMsRUFBYyxFQUFFLFVBQXNCLEVBQUUsZUFBZ0MsRUFDeEUscUJBQStDLEVBQUUsVUFBa0IsRUFBRSxNQUFlLEVBQ3BGLE1BQXdCLEVBQUUsYUFBNEIsRUFBRSxZQUEyQixFQUNuRixnQkFBaUMsRUFDakMsK0JBQStDO1FBRC9DLGlDQUFBLEVBQUEsd0JBQWlDO1FBQ2pDLGdEQUFBLEVBQUEsc0NBQStDO1FBQ2pELCtDQUErQztRQUMvQyxJQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1FBQ3ZDLElBQU0sT0FBTywyQkFDVyxPQUFPLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxPQUFPLFNBQUEsSUFBSyxZQUFZLENBQUMsQ0FBQztRQUNqRyxJQUFNLGVBQWUsR0FBRyxJQUFJLHVDQUFtQixDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNyRSxJQUFNLE9BQU8sR0FBRyxJQUFJLHdDQUFtQixDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDN0YsSUFBTSxPQUFPLEdBQUcsSUFBSSw0Q0FBdUIsQ0FDdkMsRUFBRSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRWpGLDRDQUE0QztRQUM1QyxJQUFNLGFBQWEsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUQsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwRSxJQUFNLEdBQUcsR0FBRyxJQUFBLGtDQUFpQixFQUN6QixFQUFFLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUYsSUFBTSxrQkFBa0IsR0FBRyxhQUFhLEtBQUssbUJBQWEsQ0FBQyxFQUFFLElBQUksZ0JBQWdCLENBQUMsQ0FBQztZQUMvRSxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNsRixFQUFFLENBQUM7UUFDUCxJQUFNLEdBQUcsR0FBRyxhQUFhLEtBQUssbUJBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1QyxJQUFBLGtDQUFpQixFQUNiLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLGtEQUM5RCxPQUFPLEtBQUUsT0FBTyxFQUFFLEtBQUssS0FBRyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLElBQUksQ0FBQztRQUNULElBQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxHQUFHLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQztRQUV4RCxPQUFPO1lBQ0wsVUFBVSxZQUFBO1lBQ1YsTUFBTSxRQUFBO1lBQ04sUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDO1lBQ25CLE1BQU0sUUFBQTtZQUNOLFVBQVUsWUFBQTtZQUNWLEdBQUcsS0FBQTtZQUNILEdBQUcsS0FBQTtZQUNILGFBQWEsZUFBQTtZQUNiLCtCQUErQixpQ0FBQTtTQUNoQyxDQUFDO0lBQ0osQ0FBQztJQXpDRCxvREF5Q0M7SUFFRCxTQUFTLG1DQUFtQyxDQUN4QyxFQUFzQixFQUFFLFVBQXNCLEVBQUUsVUFBMEIsRUFDMUUsV0FBMkI7O1FBQzdCLElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUMsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1QyxJQUFNLGVBQWUsR0FBcUIsRUFBRSxDQUFDOztZQUM3QyxLQUFpQixJQUFBLEtBQUEsc0JBQUEsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFBLGdCQUFBLDRCQUFFO2dCQUF6QyxJQUFNLEVBQUUsV0FBQTtnQkFDWCxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2hDLFNBQVM7aUJBQ1Y7Z0JBRUQscUZBQXFGO2dCQUNyRiwyRUFBMkU7Z0JBQzNFLElBQU0sZUFBZSxHQUNqQixFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1RixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEVBQUU7b0JBQzlCLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7aUJBQ3ZDO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sZUFBZSxDQUFDO0lBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgUmVhZG9ubHlGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEdHNQcm9jZXNzaW5nfSBmcm9tICcuLi9leGVjdXRpb24vdGFza3MvYXBpJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuLi9wYXRoX21hcHBpbmdzJztcbmltcG9ydCB7QnVuZGxlUHJvZ3JhbSwgbWFrZUJ1bmRsZVByb2dyYW19IGZyb20gJy4vYnVuZGxlX3Byb2dyYW0nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL2VudHJ5X3BvaW50JztcbmltcG9ydCB7TmdjY0R0c0NvbXBpbGVySG9zdCwgTmdjY1NvdXJjZXNDb21waWxlckhvc3R9IGZyb20gJy4vbmdjY19jb21waWxlcl9ob3N0JztcbmltcG9ydCB7RW50cnlQb2ludEZpbGVDYWNoZSwgU2hhcmVkRmlsZUNhY2hlfSBmcm9tICcuL3NvdXJjZV9maWxlX2NhY2hlJztcblxuLyoqXG4gKiBBIGJ1bmRsZSBvZiBmaWxlcyBhbmQgcGF0aHMgKGFuZCBUUyBwcm9ncmFtcykgdGhhdCBjb3JyZXNwb25kIHRvIGEgcGFydGljdWxhclxuICogZm9ybWF0IG9mIGEgcGFja2FnZSBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50QnVuZGxlIHtcbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcbiAgZm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0O1xuICBpc0NvcmU6IGJvb2xlYW47XG4gIGlzRmxhdENvcmU6IGJvb2xlYW47XG4gIHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuICBzcmM6IEJ1bmRsZVByb2dyYW07XG4gIGR0czogQnVuZGxlUHJvZ3JhbXxudWxsO1xuICBkdHNQcm9jZXNzaW5nOiBEdHNQcm9jZXNzaW5nO1xuICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEdldCBhbiBvYmplY3QgdGhhdCBkZXNjcmliZXMgYSBmb3JtYXR0ZWQgYnVuZGxlIGZvciBhbiBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBmcyBUaGUgY3VycmVudCBmaWxlLXN5c3RlbSBiZWluZyB1c2VkLlxuICogQHBhcmFtIGVudHJ5UG9pbnQgVGhlIGVudHJ5LXBvaW50IHRoYXQgY29udGFpbnMgdGhlIGJ1bmRsZS5cbiAqIEBwYXJhbSBzaGFyZWRGaWxlQ2FjaGUgVGhlIGNhY2hlIHRvIHVzZSBmb3Igc291cmNlIGZpbGVzIHRoYXQgYXJlIHNoYXJlZCBhY3Jvc3MgYWxsIGVudHJ5LXBvaW50cy5cbiAqIEBwYXJhbSBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUgVGhlIG1vZHVsZSByZXNvbHV0aW9uIGNhY2hlIHRvIHVzZS5cbiAqIEBwYXJhbSBmb3JtYXRQYXRoIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UgZmlsZXMgZm9yIHRoaXMgYnVuZGxlLlxuICogQHBhcmFtIGlzQ29yZSBUaGlzIGVudHJ5IHBvaW50IGlzIHRoZSBBbmd1bGFyIGNvcmUgcGFja2FnZS5cbiAqIEBwYXJhbSBmb3JtYXQgVGhlIHVuZGVybHlpbmcgZm9ybWF0IG9mIHRoZSBidW5kbGUuXG4gKiBAcGFyYW0gZHRzUHJvY2Vzc2luZyBXaGV0aGVyIHRvIHRyYW5zZm9ybSB0aGUgdHlwaW5ncyBhbG9uZyB3aXRoIHRoaXMgYnVuZGxlLlxuICogQHBhcmFtIHBhdGhNYXBwaW5ncyBBbiBvcHRpb25hbCBzZXQgb2YgbWFwcGluZ3MgdG8gdXNlIHdoZW4gY29tcGlsaW5nIGZpbGVzLlxuICogQHBhcmFtIG1pcnJvckR0c0Zyb21TcmMgSWYgdHJ1ZSB0aGVuIHRoZSBgZHRzYCBwcm9ncmFtIHdpbGwgY29udGFpbiBhZGRpdGlvbmFsIGZpbGVzIHRoYXRcbiAqIHdlcmUgZ3Vlc3NlZCBieSBtYXBwaW5nIHRoZSBgc3JjYCBmaWxlcyB0byBgZHRzYCBmaWxlcy5cbiAqIEBwYXJhbSBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0IFdoZXRoZXIgdG8gcmVuZGVyIGxlZ2FjeSBtZXNzYWdlIGlkcyBmb3IgaTE4biBtZXNzYWdlcyBpblxuICogY29tcG9uZW50IHRlbXBsYXRlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VFbnRyeVBvaW50QnVuZGxlKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBzaGFyZWRGaWxlQ2FjaGU6IFNoYXJlZEZpbGVDYWNoZSxcbiAgICBtb2R1bGVSZXNvbHV0aW9uQ2FjaGU6IHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZSwgZm9ybWF0UGF0aDogc3RyaW5nLCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgZm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0LCBkdHNQcm9jZXNzaW5nOiBEdHNQcm9jZXNzaW5nLCBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3MsXG4gICAgbWlycm9yRHRzRnJvbVNyYzogYm9vbGVhbiA9IGZhbHNlLFxuICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IGJvb2xlYW4gPSB0cnVlKTogRW50cnlQb2ludEJ1bmRsZSB7XG4gIC8vIENyZWF0ZSB0aGUgVFMgcHJvZ3JhbSBhbmQgbmVjZXNzYXJ5IGhlbHBlcnMuXG4gIGNvbnN0IHJvb3REaXIgPSBlbnRyeVBvaW50LnBhY2thZ2VQYXRoO1xuICBjb25zdCBvcHRpb25zOiB0c1xuICAgICAgLkNvbXBpbGVyT3B0aW9ucyA9IHthbGxvd0pzOiB0cnVlLCBtYXhOb2RlTW9kdWxlSnNEZXB0aDogSW5maW5pdHksIHJvb3REaXIsIC4uLnBhdGhNYXBwaW5nc307XG4gIGNvbnN0IGVudHJ5UG9pbnRDYWNoZSA9IG5ldyBFbnRyeVBvaW50RmlsZUNhY2hlKGZzLCBzaGFyZWRGaWxlQ2FjaGUpO1xuICBjb25zdCBkdHNIb3N0ID0gbmV3IE5nY2NEdHNDb21waWxlckhvc3QoZnMsIG9wdGlvbnMsIGVudHJ5UG9pbnRDYWNoZSwgbW9kdWxlUmVzb2x1dGlvbkNhY2hlKTtcbiAgY29uc3Qgc3JjSG9zdCA9IG5ldyBOZ2NjU291cmNlc0NvbXBpbGVySG9zdChcbiAgICAgIGZzLCBvcHRpb25zLCBlbnRyeVBvaW50Q2FjaGUsIG1vZHVsZVJlc29sdXRpb25DYWNoZSwgZW50cnlQb2ludC5wYWNrYWdlUGF0aCk7XG5cbiAgLy8gQ3JlYXRlIHRoZSBidW5kbGUgcHJvZ3JhbXMsIGFzIG5lY2Vzc2FyeS5cbiAgY29uc3QgYWJzRm9ybWF0UGF0aCA9IGZzLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoKTtcbiAgY29uc3QgdHlwaW5nc1BhdGggPSBmcy5yZXNvbHZlKGVudHJ5UG9pbnQucGF0aCwgZW50cnlQb2ludC50eXBpbmdzKTtcbiAgY29uc3Qgc3JjID0gbWFrZUJ1bmRsZVByb2dyYW0oXG4gICAgICBmcywgaXNDb3JlLCBlbnRyeVBvaW50LnBhY2thZ2VQYXRoLCBhYnNGb3JtYXRQYXRoLCAncjNfc3ltYm9scy5qcycsIG9wdGlvbnMsIHNyY0hvc3QpO1xuICBjb25zdCBhZGRpdGlvbmFsRHRzRmlsZXMgPSBkdHNQcm9jZXNzaW5nICE9PSBEdHNQcm9jZXNzaW5nLk5vICYmIG1pcnJvckR0c0Zyb21TcmMgP1xuICAgICAgY29tcHV0ZVBvdGVudGlhbER0c0ZpbGVzRnJvbUpzRmlsZXMoZnMsIHNyYy5wcm9ncmFtLCBhYnNGb3JtYXRQYXRoLCB0eXBpbmdzUGF0aCkgOlxuICAgICAgW107XG4gIGNvbnN0IGR0cyA9IGR0c1Byb2Nlc3NpbmcgIT09IER0c1Byb2Nlc3NpbmcuTm8gP1xuICAgICAgbWFrZUJ1bmRsZVByb2dyYW0oXG4gICAgICAgICAgZnMsIGlzQ29yZSwgZW50cnlQb2ludC5wYWNrYWdlUGF0aCwgdHlwaW5nc1BhdGgsICdyM19zeW1ib2xzLmQudHMnLFxuICAgICAgICAgIHsuLi5vcHRpb25zLCBhbGxvd0pzOiBmYWxzZX0sIGR0c0hvc3QsIGFkZGl0aW9uYWxEdHNGaWxlcykgOlxuICAgICAgbnVsbDtcbiAgY29uc3QgaXNGbGF0Q29yZSA9IGlzQ29yZSAmJiBzcmMucjNTeW1ib2xzRmlsZSA9PT0gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIGVudHJ5UG9pbnQsXG4gICAgZm9ybWF0LFxuICAgIHJvb3REaXJzOiBbcm9vdERpcl0sXG4gICAgaXNDb3JlLFxuICAgIGlzRmxhdENvcmUsXG4gICAgc3JjLFxuICAgIGR0cyxcbiAgICBkdHNQcm9jZXNzaW5nLFxuICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXRcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZVBvdGVudGlhbER0c0ZpbGVzRnJvbUpzRmlsZXMoXG4gICAgZnM6IFJlYWRvbmx5RmlsZVN5c3RlbSwgc3JjUHJvZ3JhbTogdHMuUHJvZ3JhbSwgZm9ybWF0UGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgdHlwaW5nc1BhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gIGNvbnN0IGZvcm1hdFJvb3QgPSBmcy5kaXJuYW1lKGZvcm1hdFBhdGgpO1xuICBjb25zdCB0eXBpbmdzUm9vdCA9IGZzLmRpcm5hbWUodHlwaW5nc1BhdGgpO1xuICBjb25zdCBhZGRpdGlvbmFsRmlsZXM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgZm9yIChjb25zdCBzZiBvZiBzcmNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICBpZiAoIXNmLmZpbGVOYW1lLmVuZHNXaXRoKCcuanMnKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gR2l2ZW4gYSBzb3VyY2UgZmlsZSBhdCBlLmcuIGBlc20yMDE1L3NyYy9zb21lL25lc3RlZC9pbmRleC5qc2AsIHRyeSB0byByZXNvbHZlIHRoZVxuICAgIC8vIGRlY2xhcmF0aW9uIGZpbGUgdW5kZXIgdGhlIHR5cGluZ3Mgcm9vdCBpbiBgc3JjL3NvbWUvbmVzdGVkL2luZGV4LmQudHNgLlxuICAgIGNvbnN0IG1pcnJvcmVkRHRzUGF0aCA9XG4gICAgICAgIGZzLnJlc29sdmUodHlwaW5nc1Jvb3QsIGZzLnJlbGF0aXZlKGZvcm1hdFJvb3QsIHNmLmZpbGVOYW1lLnJlcGxhY2UoL1xcLmpzJC8sICcuZC50cycpKSk7XG4gICAgaWYgKGZzLmV4aXN0cyhtaXJyb3JlZER0c1BhdGgpKSB7XG4gICAgICBhZGRpdGlvbmFsRmlsZXMucHVzaChtaXJyb3JlZER0c1BhdGgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYWRkaXRpb25hbEZpbGVzO1xufVxuIl19