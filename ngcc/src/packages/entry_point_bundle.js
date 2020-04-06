(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/bundle_program", "@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var bundle_program_1 = require("@angular/compiler-cli/ngcc/src/packages/bundle_program");
    var ngcc_compiler_host_1 = require("@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host");
    /**
     * Get an object that describes a formatted bundle for an entry-point.
     * @param fs The current file-system being used.
     * @param entryPoint The entry-point that contains the bundle.
     * @param formatPath The path to the source files for this bundle.
     * @param isCore This entry point is the Angular core package.
     * @param format The underlying format of the bundle.
     * @param transformDts Whether to transform the typings along with this bundle.
     * @param pathMappings An optional set of mappings to use when compiling files.
     * @param mirrorDtsFromSrc If true then the `dts` program will contain additional files that
     * were guessed by mapping the `src` files to `dts` files.
     * @param enableI18nLegacyMessageIdFormat Whether to render legacy message ids for i18n messages in
     * component templates.
     */
    function makeEntryPointBundle(fs, entryPoint, formatPath, isCore, format, transformDts, pathMappings, mirrorDtsFromSrc, enableI18nLegacyMessageIdFormat) {
        if (mirrorDtsFromSrc === void 0) { mirrorDtsFromSrc = false; }
        if (enableI18nLegacyMessageIdFormat === void 0) { enableI18nLegacyMessageIdFormat = true; }
        // Create the TS program and necessary helpers.
        var rootDir = entryPoint.package;
        var options = tslib_1.__assign({ allowJs: true, maxNodeModuleJsDepth: Infinity, rootDir: rootDir }, pathMappings);
        var srcHost = new ngcc_compiler_host_1.NgccSourcesCompilerHost(fs, options, entryPoint.path);
        var dtsHost = new file_system_1.NgtscCompilerHost(fs, options);
        // Create the bundle programs, as necessary.
        var absFormatPath = fs.resolve(entryPoint.path, formatPath);
        var typingsPath = fs.resolve(entryPoint.path, entryPoint.typings);
        var src = bundle_program_1.makeBundleProgram(fs, isCore, entryPoint.package, absFormatPath, 'r3_symbols.js', options, srcHost);
        var additionalDtsFiles = transformDts && mirrorDtsFromSrc ?
            computePotentialDtsFilesFromJsFiles(fs, src.program, absFormatPath, typingsPath) :
            [];
        var dts = transformDts ? bundle_program_1.makeBundleProgram(fs, isCore, entryPoint.package, typingsPath, 'r3_symbols.d.ts', options, dtsHost, additionalDtsFiles) :
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfYnVuZGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFRQSwyRUFBNkY7SUFFN0YseUZBQWtFO0lBRWxFLGlHQUE2RDtJQWlCN0Q7Ozs7Ozs7Ozs7Ozs7T0FhRztJQUNILFNBQWdCLG9CQUFvQixDQUNoQyxFQUFjLEVBQUUsVUFBc0IsRUFBRSxVQUFrQixFQUFFLE1BQWUsRUFDM0UsTUFBd0IsRUFBRSxZQUFxQixFQUFFLFlBQTJCLEVBQzVFLGdCQUFpQyxFQUNqQywrQkFBK0M7UUFEL0MsaUNBQUEsRUFBQSx3QkFBaUM7UUFDakMsZ0RBQUEsRUFBQSxzQ0FBK0M7UUFDakQsK0NBQStDO1FBQy9DLElBQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUM7UUFDbkMsSUFBTSxPQUFPLHNCQUNXLE9BQU8sRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE9BQU8sU0FBQSxJQUFLLFlBQVksQ0FBQyxDQUFDO1FBQ2pHLElBQU0sT0FBTyxHQUFHLElBQUksNENBQXVCLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUUsSUFBTSxPQUFPLEdBQUcsSUFBSSwrQkFBaUIsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbkQsNENBQTRDO1FBQzVDLElBQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM5RCxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BFLElBQU0sR0FBRyxHQUFHLGtDQUFpQixDQUN6QixFQUFFLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEYsSUFBTSxrQkFBa0IsR0FBRyxZQUFZLElBQUksZ0JBQWdCLENBQUMsQ0FBQztZQUN6RCxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNsRixFQUFFLENBQUM7UUFDUCxJQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLGtDQUFpQixDQUNiLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQztRQUNoQyxJQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksR0FBRyxDQUFDLGFBQWEsS0FBSyxJQUFJLENBQUM7UUFFeEQsT0FBTztZQUNMLFVBQVUsWUFBQTtZQUNWLE1BQU0sUUFBQTtZQUNOLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUNuQixNQUFNLFFBQUE7WUFDTixVQUFVLFlBQUE7WUFDVixHQUFHLEtBQUE7WUFDSCxHQUFHLEtBQUE7WUFDSCwrQkFBK0IsaUNBQUE7U0FDaEMsQ0FBQztJQUNKLENBQUM7SUFwQ0Qsb0RBb0NDO0lBRUQsU0FBUyxtQ0FBbUMsQ0FDeEMsRUFBYyxFQUFFLFVBQXNCLEVBQUUsVUFBMEIsRUFDbEUsV0FBMkI7O1FBQzdCLElBQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUMsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1QyxJQUFNLGVBQWUsR0FBcUIsRUFBRSxDQUFDOztZQUM3QyxLQUFpQixJQUFBLEtBQUEsaUJBQUEsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFBLGdCQUFBLDRCQUFFO2dCQUF6QyxJQUFNLEVBQUUsV0FBQTtnQkFDWCxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2hDLFNBQVM7aUJBQ1Y7Z0JBRUQscUZBQXFGO2dCQUNyRiwyRUFBMkU7Z0JBQzNFLElBQU0sZUFBZSxHQUNqQixFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1RixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEVBQUU7b0JBQzlCLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7aUJBQ3ZDO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sZUFBZSxDQUFDO0lBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIE5ndHNjQ29tcGlsZXJIb3N0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7QnVuZGxlUHJvZ3JhbSwgbWFrZUJ1bmRsZVByb2dyYW19IGZyb20gJy4vYnVuZGxlX3Byb2dyYW0nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL2VudHJ5X3BvaW50JztcbmltcG9ydCB7TmdjY1NvdXJjZXNDb21waWxlckhvc3R9IGZyb20gJy4vbmdjY19jb21waWxlcl9ob3N0JztcblxuLyoqXG4gKiBBIGJ1bmRsZSBvZiBmaWxlcyBhbmQgcGF0aHMgKGFuZCBUUyBwcm9ncmFtcykgdGhhdCBjb3JyZXNwb25kIHRvIGEgcGFydGljdWxhclxuICogZm9ybWF0IG9mIGEgcGFja2FnZSBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50QnVuZGxlIHtcbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcbiAgZm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0O1xuICBpc0NvcmU6IGJvb2xlYW47XG4gIGlzRmxhdENvcmU6IGJvb2xlYW47XG4gIHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuICBzcmM6IEJ1bmRsZVByb2dyYW07XG4gIGR0czogQnVuZGxlUHJvZ3JhbXxudWxsO1xuICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEdldCBhbiBvYmplY3QgdGhhdCBkZXNjcmliZXMgYSBmb3JtYXR0ZWQgYnVuZGxlIGZvciBhbiBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBmcyBUaGUgY3VycmVudCBmaWxlLXN5c3RlbSBiZWluZyB1c2VkLlxuICogQHBhcmFtIGVudHJ5UG9pbnQgVGhlIGVudHJ5LXBvaW50IHRoYXQgY29udGFpbnMgdGhlIGJ1bmRsZS5cbiAqIEBwYXJhbSBmb3JtYXRQYXRoIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UgZmlsZXMgZm9yIHRoaXMgYnVuZGxlLlxuICogQHBhcmFtIGlzQ29yZSBUaGlzIGVudHJ5IHBvaW50IGlzIHRoZSBBbmd1bGFyIGNvcmUgcGFja2FnZS5cbiAqIEBwYXJhbSBmb3JtYXQgVGhlIHVuZGVybHlpbmcgZm9ybWF0IG9mIHRoZSBidW5kbGUuXG4gKiBAcGFyYW0gdHJhbnNmb3JtRHRzIFdoZXRoZXIgdG8gdHJhbnNmb3JtIHRoZSB0eXBpbmdzIGFsb25nIHdpdGggdGhpcyBidW5kbGUuXG4gKiBAcGFyYW0gcGF0aE1hcHBpbmdzIEFuIG9wdGlvbmFsIHNldCBvZiBtYXBwaW5ncyB0byB1c2Ugd2hlbiBjb21waWxpbmcgZmlsZXMuXG4gKiBAcGFyYW0gbWlycm9yRHRzRnJvbVNyYyBJZiB0cnVlIHRoZW4gdGhlIGBkdHNgIHByb2dyYW0gd2lsbCBjb250YWluIGFkZGl0aW9uYWwgZmlsZXMgdGhhdFxuICogd2VyZSBndWVzc2VkIGJ5IG1hcHBpbmcgdGhlIGBzcmNgIGZpbGVzIHRvIGBkdHNgIGZpbGVzLlxuICogQHBhcmFtIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQgV2hldGhlciB0byByZW5kZXIgbGVnYWN5IG1lc3NhZ2UgaWRzIGZvciBpMThuIG1lc3NhZ2VzIGluXG4gKiBjb21wb25lbnQgdGVtcGxhdGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZUVudHJ5UG9pbnRCdW5kbGUoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIGZvcm1hdFBhdGg6IHN0cmluZywgaXNDb3JlOiBib29sZWFuLFxuICAgIGZvcm1hdDogRW50cnlQb2ludEZvcm1hdCwgdHJhbnNmb3JtRHRzOiBib29sZWFuLCBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3MsXG4gICAgbWlycm9yRHRzRnJvbVNyYzogYm9vbGVhbiA9IGZhbHNlLFxuICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IGJvb2xlYW4gPSB0cnVlKTogRW50cnlQb2ludEJ1bmRsZSB7XG4gIC8vIENyZWF0ZSB0aGUgVFMgcHJvZ3JhbSBhbmQgbmVjZXNzYXJ5IGhlbHBlcnMuXG4gIGNvbnN0IHJvb3REaXIgPSBlbnRyeVBvaW50LnBhY2thZ2U7XG4gIGNvbnN0IG9wdGlvbnM6IHRzXG4gICAgICAuQ29tcGlsZXJPcHRpb25zID0ge2FsbG93SnM6IHRydWUsIG1heE5vZGVNb2R1bGVKc0RlcHRoOiBJbmZpbml0eSwgcm9vdERpciwgLi4ucGF0aE1hcHBpbmdzfTtcbiAgY29uc3Qgc3JjSG9zdCA9IG5ldyBOZ2NjU291cmNlc0NvbXBpbGVySG9zdChmcywgb3B0aW9ucywgZW50cnlQb2ludC5wYXRoKTtcbiAgY29uc3QgZHRzSG9zdCA9IG5ldyBOZ3RzY0NvbXBpbGVySG9zdChmcywgb3B0aW9ucyk7XG5cbiAgLy8gQ3JlYXRlIHRoZSBidW5kbGUgcHJvZ3JhbXMsIGFzIG5lY2Vzc2FyeS5cbiAgY29uc3QgYWJzRm9ybWF0UGF0aCA9IGZzLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoKTtcbiAgY29uc3QgdHlwaW5nc1BhdGggPSBmcy5yZXNvbHZlKGVudHJ5UG9pbnQucGF0aCwgZW50cnlQb2ludC50eXBpbmdzKTtcbiAgY29uc3Qgc3JjID0gbWFrZUJ1bmRsZVByb2dyYW0oXG4gICAgICBmcywgaXNDb3JlLCBlbnRyeVBvaW50LnBhY2thZ2UsIGFic0Zvcm1hdFBhdGgsICdyM19zeW1ib2xzLmpzJywgb3B0aW9ucywgc3JjSG9zdCk7XG4gIGNvbnN0IGFkZGl0aW9uYWxEdHNGaWxlcyA9IHRyYW5zZm9ybUR0cyAmJiBtaXJyb3JEdHNGcm9tU3JjID9cbiAgICAgIGNvbXB1dGVQb3RlbnRpYWxEdHNGaWxlc0Zyb21Kc0ZpbGVzKGZzLCBzcmMucHJvZ3JhbSwgYWJzRm9ybWF0UGF0aCwgdHlwaW5nc1BhdGgpIDpcbiAgICAgIFtdO1xuICBjb25zdCBkdHMgPSB0cmFuc2Zvcm1EdHMgPyBtYWtlQnVuZGxlUHJvZ3JhbShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLCBpc0NvcmUsIGVudHJ5UG9pbnQucGFja2FnZSwgdHlwaW5nc1BhdGgsICdyM19zeW1ib2xzLmQudHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucywgZHRzSG9zdCwgYWRkaXRpb25hbER0c0ZpbGVzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGw7XG4gIGNvbnN0IGlzRmxhdENvcmUgPSBpc0NvcmUgJiYgc3JjLnIzU3ltYm9sc0ZpbGUgPT09IG51bGw7XG5cbiAgcmV0dXJuIHtcbiAgICBlbnRyeVBvaW50LFxuICAgIGZvcm1hdCxcbiAgICByb290RGlyczogW3Jvb3REaXJdLFxuICAgIGlzQ29yZSxcbiAgICBpc0ZsYXRDb3JlLFxuICAgIHNyYyxcbiAgICBkdHMsXG4gICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdFxuICB9O1xufVxuXG5mdW5jdGlvbiBjb21wdXRlUG90ZW50aWFsRHRzRmlsZXNGcm9tSnNGaWxlcyhcbiAgICBmczogRmlsZVN5c3RlbSwgc3JjUHJvZ3JhbTogdHMuUHJvZ3JhbSwgZm9ybWF0UGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgdHlwaW5nc1BhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gIGNvbnN0IGZvcm1hdFJvb3QgPSBmcy5kaXJuYW1lKGZvcm1hdFBhdGgpO1xuICBjb25zdCB0eXBpbmdzUm9vdCA9IGZzLmRpcm5hbWUodHlwaW5nc1BhdGgpO1xuICBjb25zdCBhZGRpdGlvbmFsRmlsZXM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgZm9yIChjb25zdCBzZiBvZiBzcmNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICBpZiAoIXNmLmZpbGVOYW1lLmVuZHNXaXRoKCcuanMnKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gR2l2ZW4gYSBzb3VyY2UgZmlsZSBhdCBlLmcuIGBlc20yMDE1L3NyYy9zb21lL25lc3RlZC9pbmRleC5qc2AsIHRyeSB0byByZXNvbHZlIHRoZVxuICAgIC8vIGRlY2xhcmF0aW9uIGZpbGUgdW5kZXIgdGhlIHR5cGluZ3Mgcm9vdCBpbiBgc3JjL3NvbWUvbmVzdGVkL2luZGV4LmQudHNgLlxuICAgIGNvbnN0IG1pcnJvcmVkRHRzUGF0aCA9XG4gICAgICAgIGZzLnJlc29sdmUodHlwaW5nc1Jvb3QsIGZzLnJlbGF0aXZlKGZvcm1hdFJvb3QsIHNmLmZpbGVOYW1lLnJlcGxhY2UoL1xcLmpzJC8sICcuZC50cycpKSk7XG4gICAgaWYgKGZzLmV4aXN0cyhtaXJyb3JlZER0c1BhdGgpKSB7XG4gICAgICBhZGRpdGlvbmFsRmlsZXMucHVzaChtaXJyb3JlZER0c1BhdGgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYWRkaXRpb25hbEZpbGVzO1xufVxuIl19