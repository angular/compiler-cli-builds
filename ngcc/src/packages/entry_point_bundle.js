(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/execution/tasks/api", "@angular/compiler-cli/ngcc/src/packages/adjust_cjs_umd_exports", "@angular/compiler-cli/ngcc/src/packages/bundle_program", "@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host", "@angular/compiler-cli/ngcc/src/packages/source_file_cache"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.makeEntryPointBundle = void 0;
    var tslib_1 = require("tslib");
    var api_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/api");
    var adjust_cjs_umd_exports_1 = require("@angular/compiler-cli/ngcc/src/packages/adjust_cjs_umd_exports");
    var bundle_program_1 = require("@angular/compiler-cli/ngcc/src/packages/bundle_program");
    var ngcc_compiler_host_1 = require("@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host");
    var source_file_cache_1 = require("@angular/compiler-cli/ngcc/src/packages/source_file_cache");
    /**
     * When processing UMD or CommonJS bundles the source text is preprocessed to transform export
     * declarations using element access expressions into property access expressions, as otherwise ngcc
     * would not recognize these export declarations. See `adjustElementAccessExports` for more
     * information.
     */
    function createSourceTextProcessor(format) {
        if (format === 'umd' || format === 'commonjs') {
            return adjust_cjs_umd_exports_1.adjustElementAccessExports;
        }
        else {
            return function (sourceText) { return sourceText; };
        }
    }
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
        var options = tslib_1.__assign({ allowJs: true, maxNodeModuleJsDepth: Infinity, rootDir: rootDir }, pathMappings);
        var processSourceText = createSourceTextProcessor(format);
        var entryPointCache = new source_file_cache_1.EntryPointFileCache(fs, sharedFileCache, processSourceText);
        var dtsHost = new ngcc_compiler_host_1.NgccDtsCompilerHost(fs, options, entryPointCache, moduleResolutionCache);
        var srcHost = new ngcc_compiler_host_1.NgccSourcesCompilerHost(fs, options, entryPointCache, moduleResolutionCache, entryPoint.packagePath);
        // Create the bundle programs, as necessary.
        var absFormatPath = fs.resolve(entryPoint.path, formatPath);
        var typingsPath = fs.resolve(entryPoint.path, entryPoint.typings);
        var src = bundle_program_1.makeBundleProgram(fs, isCore, entryPoint.packagePath, absFormatPath, 'r3_symbols.js', options, srcHost);
        var additionalDtsFiles = dtsProcessing !== api_1.DtsProcessing.No && mirrorDtsFromSrc ?
            computePotentialDtsFilesFromJsFiles(fs, src.program, absFormatPath, typingsPath) :
            [];
        var dts = dtsProcessing !== api_1.DtsProcessing.No ?
            bundle_program_1.makeBundleProgram(fs, isCore, entryPoint.packagePath, typingsPath, 'r3_symbols.d.ts', tslib_1.__assign(tslib_1.__assign({}, options), { allowJs: false }), dtsHost, additionalDtsFiles) :
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
            for (var _b = tslib_1.__values(srcProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfYnVuZGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBVUEsMEVBQXFEO0lBR3JELHlHQUFvRTtJQUNwRSx5RkFBa0U7SUFFbEUsaUdBQWtGO0lBQ2xGLCtGQUF5RTtJQWtCekU7Ozs7O09BS0c7SUFDSCxTQUFTLHlCQUF5QixDQUFDLE1BQXdCO1FBQ3pELElBQUksTUFBTSxLQUFLLEtBQUssSUFBSSxNQUFNLEtBQUssVUFBVSxFQUFFO1lBQzdDLE9BQU8sbURBQTBCLENBQUM7U0FDbkM7YUFBTTtZQUNMLE9BQU8sVUFBQSxVQUFVLElBQUksT0FBQSxVQUFVLEVBQVYsQ0FBVSxDQUFDO1NBQ2pDO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7Ozs7T0FlRztJQUNILFNBQWdCLG9CQUFvQixDQUNoQyxFQUFjLEVBQUUsVUFBc0IsRUFBRSxlQUFnQyxFQUN4RSxxQkFBK0MsRUFBRSxVQUFrQixFQUFFLE1BQWUsRUFDcEYsTUFBd0IsRUFBRSxhQUE0QixFQUFFLFlBQTJCLEVBQ25GLGdCQUFpQyxFQUNqQywrQkFBK0M7UUFEL0MsaUNBQUEsRUFBQSx3QkFBaUM7UUFDakMsZ0RBQUEsRUFBQSxzQ0FBK0M7UUFDakQsK0NBQStDO1FBQy9DLElBQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7UUFDdkMsSUFBTSxPQUFPLHNCQUNXLE9BQU8sRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE9BQU8sU0FBQSxJQUFLLFlBQVksQ0FBQyxDQUFDO1FBQ2pHLElBQU0saUJBQWlCLEdBQUcseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUQsSUFBTSxlQUFlLEdBQUcsSUFBSSx1Q0FB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QUFDLENBQUM7aUJBQ3ZDO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sZUFBZSxDQUFDO0lBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBSZWFkb25seUZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0R0c1Byb2Nlc3Npbmd9IGZyb20gJy4uL2V4ZWN1dGlvbi90YXNrcy9hcGknO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3BhdGhfbWFwcGluZ3MnO1xuXG5pbXBvcnQge2FkanVzdEVsZW1lbnRBY2Nlc3NFeHBvcnRzfSBmcm9tICcuL2FkanVzdF9janNfdW1kX2V4cG9ydHMnO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtLCBtYWtlQnVuZGxlUHJvZ3JhbX0gZnJvbSAnLi9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtOZ2NjRHRzQ29tcGlsZXJIb3N0LCBOZ2NjU291cmNlc0NvbXBpbGVySG9zdH0gZnJvbSAnLi9uZ2NjX2NvbXBpbGVyX2hvc3QnO1xuaW1wb3J0IHtFbnRyeVBvaW50RmlsZUNhY2hlLCBTaGFyZWRGaWxlQ2FjaGV9IGZyb20gJy4vc291cmNlX2ZpbGVfY2FjaGUnO1xuXG4vKipcbiAqIEEgYnVuZGxlIG9mIGZpbGVzIGFuZCBwYXRocyAoYW5kIFRTIHByb2dyYW1zKSB0aGF0IGNvcnJlc3BvbmQgdG8gYSBwYXJ0aWN1bGFyXG4gKiBmb3JtYXQgb2YgYSBwYWNrYWdlIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnRCdW5kbGUge1xuICBlbnRyeVBvaW50OiBFbnRyeVBvaW50O1xuICBmb3JtYXQ6IEVudHJ5UG9pbnRGb3JtYXQ7XG4gIGlzQ29yZTogYm9vbGVhbjtcbiAgaXNGbGF0Q29yZTogYm9vbGVhbjtcbiAgcm9vdERpcnM6IEFic29sdXRlRnNQYXRoW107XG4gIHNyYzogQnVuZGxlUHJvZ3JhbTtcbiAgZHRzOiBCdW5kbGVQcm9ncmFtfG51bGw7XG4gIGR0c1Byb2Nlc3Npbmc6IER0c1Byb2Nlc3Npbmc7XG4gIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IGJvb2xlYW47XG59XG5cbi8qKlxuICogV2hlbiBwcm9jZXNzaW5nIFVNRCBvciBDb21tb25KUyBidW5kbGVzIHRoZSBzb3VyY2UgdGV4dCBpcyBwcmVwcm9jZXNzZWQgdG8gdHJhbnNmb3JtIGV4cG9ydFxuICogZGVjbGFyYXRpb25zIHVzaW5nIGVsZW1lbnQgYWNjZXNzIGV4cHJlc3Npb25zIGludG8gcHJvcGVydHkgYWNjZXNzIGV4cHJlc3Npb25zLCBhcyBvdGhlcndpc2UgbmdjY1xuICogd291bGQgbm90IHJlY29nbml6ZSB0aGVzZSBleHBvcnQgZGVjbGFyYXRpb25zLiBTZWUgYGFkanVzdEVsZW1lbnRBY2Nlc3NFeHBvcnRzYCBmb3IgbW9yZVxuICogaW5mb3JtYXRpb24uXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVNvdXJjZVRleHRQcm9jZXNzb3IoZm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0KTogKHNvdXJjZVRleHQ6IHN0cmluZykgPT4gc3RyaW5nIHtcbiAgaWYgKGZvcm1hdCA9PT0gJ3VtZCcgfHwgZm9ybWF0ID09PSAnY29tbW9uanMnKSB7XG4gICAgcmV0dXJuIGFkanVzdEVsZW1lbnRBY2Nlc3NFeHBvcnRzO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzb3VyY2VUZXh0ID0+IHNvdXJjZVRleHQ7XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgYW4gb2JqZWN0IHRoYXQgZGVzY3JpYmVzIGEgZm9ybWF0dGVkIGJ1bmRsZSBmb3IgYW4gZW50cnktcG9pbnQuXG4gKiBAcGFyYW0gZnMgVGhlIGN1cnJlbnQgZmlsZS1zeXN0ZW0gYmVpbmcgdXNlZC5cbiAqIEBwYXJhbSBlbnRyeVBvaW50IFRoZSBlbnRyeS1wb2ludCB0aGF0IGNvbnRhaW5zIHRoZSBidW5kbGUuXG4gKiBAcGFyYW0gc2hhcmVkRmlsZUNhY2hlIFRoZSBjYWNoZSB0byB1c2UgZm9yIHNvdXJjZSBmaWxlcyB0aGF0IGFyZSBzaGFyZWQgYWNyb3NzIGFsbCBlbnRyeS1wb2ludHMuXG4gKiBAcGFyYW0gbW9kdWxlUmVzb2x1dGlvbkNhY2hlIFRoZSBtb2R1bGUgcmVzb2x1dGlvbiBjYWNoZSB0byB1c2UuXG4gKiBAcGFyYW0gZm9ybWF0UGF0aCBUaGUgcGF0aCB0byB0aGUgc291cmNlIGZpbGVzIGZvciB0aGlzIGJ1bmRsZS5cbiAqIEBwYXJhbSBpc0NvcmUgVGhpcyBlbnRyeSBwb2ludCBpcyB0aGUgQW5ndWxhciBjb3JlIHBhY2thZ2UuXG4gKiBAcGFyYW0gZm9ybWF0IFRoZSB1bmRlcmx5aW5nIGZvcm1hdCBvZiB0aGUgYnVuZGxlLlxuICogQHBhcmFtIGR0c1Byb2Nlc3NpbmcgV2hldGhlciB0byB0cmFuc2Zvcm0gdGhlIHR5cGluZ3MgYWxvbmcgd2l0aCB0aGlzIGJ1bmRsZS5cbiAqIEBwYXJhbSBwYXRoTWFwcGluZ3MgQW4gb3B0aW9uYWwgc2V0IG9mIG1hcHBpbmdzIHRvIHVzZSB3aGVuIGNvbXBpbGluZyBmaWxlcy5cbiAqIEBwYXJhbSBtaXJyb3JEdHNGcm9tU3JjIElmIHRydWUgdGhlbiB0aGUgYGR0c2AgcHJvZ3JhbSB3aWxsIGNvbnRhaW4gYWRkaXRpb25hbCBmaWxlcyB0aGF0XG4gKiB3ZXJlIGd1ZXNzZWQgYnkgbWFwcGluZyB0aGUgYHNyY2AgZmlsZXMgdG8gYGR0c2AgZmlsZXMuXG4gKiBAcGFyYW0gZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCBXaGV0aGVyIHRvIHJlbmRlciBsZWdhY3kgbWVzc2FnZSBpZHMgZm9yIGkxOG4gbWVzc2FnZXMgaW5cbiAqIGNvbXBvbmVudCB0ZW1wbGF0ZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICBmczogRmlsZVN5c3RlbSwgZW50cnlQb2ludDogRW50cnlQb2ludCwgc2hhcmVkRmlsZUNhY2hlOiBTaGFyZWRGaWxlQ2FjaGUsXG4gICAgbW9kdWxlUmVzb2x1dGlvbkNhY2hlOiB0cy5Nb2R1bGVSZXNvbHV0aW9uQ2FjaGUsIGZvcm1hdFBhdGg6IHN0cmluZywgaXNDb3JlOiBib29sZWFuLFxuICAgIGZvcm1hdDogRW50cnlQb2ludEZvcm1hdCwgZHRzUHJvY2Vzc2luZzogRHRzUHJvY2Vzc2luZywgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzLFxuICAgIG1pcnJvckR0c0Zyb21TcmM6IGJvb2xlYW4gPSBmYWxzZSxcbiAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuID0gdHJ1ZSk6IEVudHJ5UG9pbnRCdW5kbGUge1xuICAvLyBDcmVhdGUgdGhlIFRTIHByb2dyYW0gYW5kIG5lY2Vzc2FyeSBoZWxwZXJzLlxuICBjb25zdCByb290RGlyID0gZW50cnlQb2ludC5wYWNrYWdlUGF0aDtcbiAgY29uc3Qgb3B0aW9uczogdHNcbiAgICAgIC5Db21waWxlck9wdGlvbnMgPSB7YWxsb3dKczogdHJ1ZSwgbWF4Tm9kZU1vZHVsZUpzRGVwdGg6IEluZmluaXR5LCByb290RGlyLCAuLi5wYXRoTWFwcGluZ3N9O1xuICBjb25zdCBwcm9jZXNzU291cmNlVGV4dCA9IGNyZWF0ZVNvdXJjZVRleHRQcm9jZXNzb3IoZm9ybWF0KTtcbiAgY29uc3QgZW50cnlQb2ludENhY2hlID0gbmV3IEVudHJ5UG9pbnRGaWxlQ2FjaGUoZnMsIHNoYXJlZEZpbGVDYWNoZSwgcHJvY2Vzc1NvdXJjZVRleHQpO1xuICBjb25zdCBkdHNIb3N0ID0gbmV3IE5nY2NEdHNDb21waWxlckhvc3QoZnMsIG9wdGlvbnMsIGVudHJ5UG9pbnRDYWNoZSwgbW9kdWxlUmVzb2x1dGlvbkNhY2hlKTtcbiAgY29uc3Qgc3JjSG9zdCA9IG5ldyBOZ2NjU291cmNlc0NvbXBpbGVySG9zdChcbiAgICAgIGZzLCBvcHRpb25zLCBlbnRyeVBvaW50Q2FjaGUsIG1vZHVsZVJlc29sdXRpb25DYWNoZSwgZW50cnlQb2ludC5wYWNrYWdlUGF0aCk7XG5cbiAgLy8gQ3JlYXRlIHRoZSBidW5kbGUgcHJvZ3JhbXMsIGFzIG5lY2Vzc2FyeS5cbiAgY29uc3QgYWJzRm9ybWF0UGF0aCA9IGZzLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoKTtcbiAgY29uc3QgdHlwaW5nc1BhdGggPSBmcy5yZXNvbHZlKGVudHJ5UG9pbnQucGF0aCwgZW50cnlQb2ludC50eXBpbmdzKTtcbiAgY29uc3Qgc3JjID0gbWFrZUJ1bmRsZVByb2dyYW0oXG4gICAgICBmcywgaXNDb3JlLCBlbnRyeVBvaW50LnBhY2thZ2VQYXRoLCBhYnNGb3JtYXRQYXRoLCAncjNfc3ltYm9scy5qcycsIG9wdGlvbnMsIHNyY0hvc3QpO1xuICBjb25zdCBhZGRpdGlvbmFsRHRzRmlsZXMgPSBkdHNQcm9jZXNzaW5nICE9PSBEdHNQcm9jZXNzaW5nLk5vICYmIG1pcnJvckR0c0Zyb21TcmMgP1xuICAgICAgY29tcHV0ZVBvdGVudGlhbER0c0ZpbGVzRnJvbUpzRmlsZXMoZnMsIHNyYy5wcm9ncmFtLCBhYnNGb3JtYXRQYXRoLCB0eXBpbmdzUGF0aCkgOlxuICAgICAgW107XG4gIGNvbnN0IGR0cyA9IGR0c1Byb2Nlc3NpbmcgIT09IER0c1Byb2Nlc3NpbmcuTm8gP1xuICAgICAgbWFrZUJ1bmRsZVByb2dyYW0oXG4gICAgICAgICAgZnMsIGlzQ29yZSwgZW50cnlQb2ludC5wYWNrYWdlUGF0aCwgdHlwaW5nc1BhdGgsICdyM19zeW1ib2xzLmQudHMnLFxuICAgICAgICAgIHsuLi5vcHRpb25zLCBhbGxvd0pzOiBmYWxzZX0sIGR0c0hvc3QsIGFkZGl0aW9uYWxEdHNGaWxlcykgOlxuICAgICAgbnVsbDtcbiAgY29uc3QgaXNGbGF0Q29yZSA9IGlzQ29yZSAmJiBzcmMucjNTeW1ib2xzRmlsZSA9PT0gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIGVudHJ5UG9pbnQsXG4gICAgZm9ybWF0LFxuICAgIHJvb3REaXJzOiBbcm9vdERpcl0sXG4gICAgaXNDb3JlLFxuICAgIGlzRmxhdENvcmUsXG4gICAgc3JjLFxuICAgIGR0cyxcbiAgICBkdHNQcm9jZXNzaW5nLFxuICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXRcbiAgfTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZVBvdGVudGlhbER0c0ZpbGVzRnJvbUpzRmlsZXMoXG4gICAgZnM6IFJlYWRvbmx5RmlsZVN5c3RlbSwgc3JjUHJvZ3JhbTogdHMuUHJvZ3JhbSwgZm9ybWF0UGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgdHlwaW5nc1BhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gIGNvbnN0IGZvcm1hdFJvb3QgPSBmcy5kaXJuYW1lKGZvcm1hdFBhdGgpO1xuICBjb25zdCB0eXBpbmdzUm9vdCA9IGZzLmRpcm5hbWUodHlwaW5nc1BhdGgpO1xuICBjb25zdCBhZGRpdGlvbmFsRmlsZXM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgZm9yIChjb25zdCBzZiBvZiBzcmNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICBpZiAoIXNmLmZpbGVOYW1lLmVuZHNXaXRoKCcuanMnKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gR2l2ZW4gYSBzb3VyY2UgZmlsZSBhdCBlLmcuIGBlc20yMDE1L3NyYy9zb21lL25lc3RlZC9pbmRleC5qc2AsIHRyeSB0byByZXNvbHZlIHRoZVxuICAgIC8vIGRlY2xhcmF0aW9uIGZpbGUgdW5kZXIgdGhlIHR5cGluZ3Mgcm9vdCBpbiBgc3JjL3NvbWUvbmVzdGVkL2luZGV4LmQudHNgLlxuICAgIGNvbnN0IG1pcnJvcmVkRHRzUGF0aCA9XG4gICAgICAgIGZzLnJlc29sdmUodHlwaW5nc1Jvb3QsIGZzLnJlbGF0aXZlKGZvcm1hdFJvb3QsIHNmLmZpbGVOYW1lLnJlcGxhY2UoL1xcLmpzJC8sICcuZC50cycpKSk7XG4gICAgaWYgKGZzLmV4aXN0cyhtaXJyb3JlZER0c1BhdGgpKSB7XG4gICAgICBhZGRpdGlvbmFsRmlsZXMucHVzaChtaXJyb3JlZER0c1BhdGgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYWRkaXRpb25hbEZpbGVzO1xufVxuIl19