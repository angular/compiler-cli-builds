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
        var options = tslib_1.__assign({ allowJs: true, maxNodeModuleJsDepth: Infinity, noLib: true, rootDir: entryPoint.path }, pathMappings);
        var srcHost = new ngcc_compiler_host_1.NgccSourcesCompilerHost(fs, options, entryPoint.path);
        var dtsHost = new file_system_1.NgtscCompilerHost(fs, options);
        var rootDirs = [file_system_1.absoluteFrom(entryPoint.path)];
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
        return { entryPoint: entryPoint, format: format, rootDirs: rootDirs, isCore: isCore,
            isFlatCore: isFlatCore, src: src, dts: dts, enableI18nLegacyMessageIdFormat: enableI18nLegacyMessageIdFormat };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfYnVuZGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFRQSwyRUFBMkc7SUFFM0cseUZBQWtFO0lBRWxFLGlHQUE2RDtJQWlCN0Q7Ozs7Ozs7Ozs7Ozs7T0FhRztJQUNILFNBQWdCLG9CQUFvQixDQUNoQyxFQUFjLEVBQUUsVUFBc0IsRUFBRSxVQUFrQixFQUFFLE1BQWUsRUFDM0UsTUFBd0IsRUFBRSxZQUFxQixFQUFFLFlBQTJCLEVBQzVFLGdCQUFpQyxFQUNqQywrQkFBK0M7UUFEL0MsaUNBQUEsRUFBQSx3QkFBaUM7UUFDakMsZ0RBQUEsRUFBQSxzQ0FBK0M7UUFDakQsK0NBQStDO1FBQy9DLElBQU0sT0FBTyxzQkFDWCxPQUFPLEVBQUUsSUFBSSxFQUNiLG9CQUFvQixFQUFFLFFBQVEsRUFDOUIsS0FBSyxFQUFFLElBQUksRUFDWCxPQUFPLEVBQUUsVUFBVSxDQUFDLElBQUksSUFBSyxZQUFZLENBQzFDLENBQUM7UUFDRixJQUFNLE9BQU8sR0FBRyxJQUFJLDRDQUF1QixDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFFLElBQU0sT0FBTyxHQUFHLElBQUksK0JBQWlCLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELElBQU0sUUFBUSxHQUFHLENBQUMsMEJBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVqRCw0Q0FBNEM7UUFDNUMsSUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzlELElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEUsSUFBTSxHQUFHLEdBQUcsa0NBQWlCLENBQ3pCLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RixJQUFNLGtCQUFrQixHQUFHLFlBQVksSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3pELG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ2xGLEVBQUUsQ0FBQztRQUNQLElBQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsa0NBQWlCLENBQ2IsRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDO1FBQ2hDLElBQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxHQUFHLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQztRQUV4RCxPQUFPLEVBQUMsVUFBVSxZQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUUsTUFBTSxRQUFBO1lBQ3BDLFVBQVUsWUFBQSxFQUFFLEdBQUcsS0FBQSxFQUFLLEdBQUcsS0FBQSxFQUFPLCtCQUErQixpQ0FBQSxFQUFDLENBQUM7SUFDekUsQ0FBQztJQWhDRCxvREFnQ0M7SUFFRCxTQUFTLG1DQUFtQyxDQUN4QyxFQUFjLEVBQUUsVUFBc0IsRUFBRSxVQUEwQixFQUNsRSxXQUEyQjs7UUFDN0IsSUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMxQyxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzVDLElBQU0sZUFBZSxHQUFxQixFQUFFLENBQUM7O1lBQzdDLEtBQWlCLElBQUEsS0FBQSxpQkFBQSxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7Z0JBQXpDLElBQU0sRUFBRSxXQUFBO2dCQUNYLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDaEMsU0FBUztpQkFDVjtnQkFFRCxxRkFBcUY7Z0JBQ3JGLDJFQUEyRTtnQkFDM0UsSUFBTSxlQUFlLEdBQ2pCLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVGLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFBRTtvQkFDOUIsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztpQkFDdkM7YUFDRjs7Ozs7Ozs7O1FBQ0QsT0FBTyxlQUFlLENBQUM7SUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgTmd0c2NDb21waWxlckhvc3QsIGFic29sdXRlRnJvbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge0J1bmRsZVByb2dyYW0sIG1ha2VCdW5kbGVQcm9ncmFtfSBmcm9tICcuL2J1bmRsZV9wcm9ncmFtJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5pbXBvcnQge05nY2NTb3VyY2VzQ29tcGlsZXJIb3N0fSBmcm9tICcuL25nY2NfY29tcGlsZXJfaG9zdCc7XG5cbi8qKlxuICogQSBidW5kbGUgb2YgZmlsZXMgYW5kIHBhdGhzIChhbmQgVFMgcHJvZ3JhbXMpIHRoYXQgY29ycmVzcG9uZCB0byBhIHBhcnRpY3VsYXJcbiAqIGZvcm1hdCBvZiBhIHBhY2thZ2UgZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRW50cnlQb2ludEJ1bmRsZSB7XG4gIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQ7XG4gIGZvcm1hdDogRW50cnlQb2ludEZvcm1hdDtcbiAgaXNDb3JlOiBib29sZWFuO1xuICBpc0ZsYXRDb3JlOiBib29sZWFuO1xuICByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXTtcbiAgc3JjOiBCdW5kbGVQcm9ncmFtO1xuICBkdHM6IEJ1bmRsZVByb2dyYW18bnVsbDtcbiAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBHZXQgYW4gb2JqZWN0IHRoYXQgZGVzY3JpYmVzIGEgZm9ybWF0dGVkIGJ1bmRsZSBmb3IgYW4gZW50cnktcG9pbnQuXG4gKiBAcGFyYW0gZnMgVGhlIGN1cnJlbnQgZmlsZS1zeXN0ZW0gYmVpbmcgdXNlZC5cbiAqIEBwYXJhbSBlbnRyeVBvaW50IFRoZSBlbnRyeS1wb2ludCB0aGF0IGNvbnRhaW5zIHRoZSBidW5kbGUuXG4gKiBAcGFyYW0gZm9ybWF0UGF0aCBUaGUgcGF0aCB0byB0aGUgc291cmNlIGZpbGVzIGZvciB0aGlzIGJ1bmRsZS5cbiAqIEBwYXJhbSBpc0NvcmUgVGhpcyBlbnRyeSBwb2ludCBpcyB0aGUgQW5ndWxhciBjb3JlIHBhY2thZ2UuXG4gKiBAcGFyYW0gZm9ybWF0IFRoZSB1bmRlcmx5aW5nIGZvcm1hdCBvZiB0aGUgYnVuZGxlLlxuICogQHBhcmFtIHRyYW5zZm9ybUR0cyBXaGV0aGVyIHRvIHRyYW5zZm9ybSB0aGUgdHlwaW5ncyBhbG9uZyB3aXRoIHRoaXMgYnVuZGxlLlxuICogQHBhcmFtIHBhdGhNYXBwaW5ncyBBbiBvcHRpb25hbCBzZXQgb2YgbWFwcGluZ3MgdG8gdXNlIHdoZW4gY29tcGlsaW5nIGZpbGVzLlxuICogQHBhcmFtIG1pcnJvckR0c0Zyb21TcmMgSWYgdHJ1ZSB0aGVuIHRoZSBgZHRzYCBwcm9ncmFtIHdpbGwgY29udGFpbiBhZGRpdGlvbmFsIGZpbGVzIHRoYXRcbiAqIHdlcmUgZ3Vlc3NlZCBieSBtYXBwaW5nIHRoZSBgc3JjYCBmaWxlcyB0byBgZHRzYCBmaWxlcy5cbiAqIEBwYXJhbSBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0IFdoZXRoZXIgdG8gcmVuZGVyIGxlZ2FjeSBtZXNzYWdlIGlkcyBmb3IgaTE4biBtZXNzYWdlcyBpblxuICogY29tcG9uZW50IHRlbXBsYXRlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ha2VFbnRyeVBvaW50QnVuZGxlKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBmb3JtYXRQYXRoOiBzdHJpbmcsIGlzQ29yZTogYm9vbGVhbixcbiAgICBmb3JtYXQ6IEVudHJ5UG9pbnRGb3JtYXQsIHRyYW5zZm9ybUR0czogYm9vbGVhbiwgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzLFxuICAgIG1pcnJvckR0c0Zyb21TcmM6IGJvb2xlYW4gPSBmYWxzZSxcbiAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuID0gdHJ1ZSk6IEVudHJ5UG9pbnRCdW5kbGUge1xuICAvLyBDcmVhdGUgdGhlIFRTIHByb2dyYW0gYW5kIG5lY2Vzc2FyeSBoZWxwZXJzLlxuICBjb25zdCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMgPSB7XG4gICAgYWxsb3dKczogdHJ1ZSxcbiAgICBtYXhOb2RlTW9kdWxlSnNEZXB0aDogSW5maW5pdHksXG4gICAgbm9MaWI6IHRydWUsXG4gICAgcm9vdERpcjogZW50cnlQb2ludC5wYXRoLCAuLi5wYXRoTWFwcGluZ3NcbiAgfTtcbiAgY29uc3Qgc3JjSG9zdCA9IG5ldyBOZ2NjU291cmNlc0NvbXBpbGVySG9zdChmcywgb3B0aW9ucywgZW50cnlQb2ludC5wYXRoKTtcbiAgY29uc3QgZHRzSG9zdCA9IG5ldyBOZ3RzY0NvbXBpbGVySG9zdChmcywgb3B0aW9ucyk7XG4gIGNvbnN0IHJvb3REaXJzID0gW2Fic29sdXRlRnJvbShlbnRyeVBvaW50LnBhdGgpXTtcblxuICAvLyBDcmVhdGUgdGhlIGJ1bmRsZSBwcm9ncmFtcywgYXMgbmVjZXNzYXJ5LlxuICBjb25zdCBhYnNGb3JtYXRQYXRoID0gZnMucmVzb2x2ZShlbnRyeVBvaW50LnBhdGgsIGZvcm1hdFBhdGgpO1xuICBjb25zdCB0eXBpbmdzUGF0aCA9IGZzLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBlbnRyeVBvaW50LnR5cGluZ3MpO1xuICBjb25zdCBzcmMgPSBtYWtlQnVuZGxlUHJvZ3JhbShcbiAgICAgIGZzLCBpc0NvcmUsIGVudHJ5UG9pbnQucGFja2FnZSwgYWJzRm9ybWF0UGF0aCwgJ3IzX3N5bWJvbHMuanMnLCBvcHRpb25zLCBzcmNIb3N0KTtcbiAgY29uc3QgYWRkaXRpb25hbER0c0ZpbGVzID0gdHJhbnNmb3JtRHRzICYmIG1pcnJvckR0c0Zyb21TcmMgP1xuICAgICAgY29tcHV0ZVBvdGVudGlhbER0c0ZpbGVzRnJvbUpzRmlsZXMoZnMsIHNyYy5wcm9ncmFtLCBhYnNGb3JtYXRQYXRoLCB0eXBpbmdzUGF0aCkgOlxuICAgICAgW107XG4gIGNvbnN0IGR0cyA9IHRyYW5zZm9ybUR0cyA/IG1ha2VCdW5kbGVQcm9ncmFtKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMsIGlzQ29yZSwgZW50cnlQb2ludC5wYWNrYWdlLCB0eXBpbmdzUGF0aCwgJ3IzX3N5bWJvbHMuZC50cycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLCBkdHNIb3N0LCBhZGRpdGlvbmFsRHRzRmlsZXMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbDtcbiAgY29uc3QgaXNGbGF0Q29yZSA9IGlzQ29yZSAmJiBzcmMucjNTeW1ib2xzRmlsZSA9PT0gbnVsbDtcblxuICByZXR1cm4ge2VudHJ5UG9pbnQsIGZvcm1hdCwgcm9vdERpcnMsIGlzQ29yZSxcbiAgICAgICAgICBpc0ZsYXRDb3JlLCBzcmMsICAgIGR0cywgICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0fTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZVBvdGVudGlhbER0c0ZpbGVzRnJvbUpzRmlsZXMoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHNyY1Byb2dyYW06IHRzLlByb2dyYW0sIGZvcm1hdFBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIHR5cGluZ3NQYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICBjb25zdCBmb3JtYXRSb290ID0gZnMuZGlybmFtZShmb3JtYXRQYXRoKTtcbiAgY29uc3QgdHlwaW5nc1Jvb3QgPSBmcy5kaXJuYW1lKHR5cGluZ3NQYXRoKTtcbiAgY29uc3QgYWRkaXRpb25hbEZpbGVzOiBBYnNvbHV0ZUZzUGF0aFtdID0gW107XG4gIGZvciAoY29uc3Qgc2Ygb2Ygc3JjUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgaWYgKCFzZi5maWxlTmFtZS5lbmRzV2l0aCgnLmpzJykpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIEdpdmVuIGEgc291cmNlIGZpbGUgYXQgZS5nLiBgZXNtMjAxNS9zcmMvc29tZS9uZXN0ZWQvaW5kZXguanNgLCB0cnkgdG8gcmVzb2x2ZSB0aGVcbiAgICAvLyBkZWNsYXJhdGlvbiBmaWxlIHVuZGVyIHRoZSB0eXBpbmdzIHJvb3QgaW4gYHNyYy9zb21lL25lc3RlZC9pbmRleC5kLnRzYC5cbiAgICBjb25zdCBtaXJyb3JlZER0c1BhdGggPVxuICAgICAgICBmcy5yZXNvbHZlKHR5cGluZ3NSb290LCBmcy5yZWxhdGl2ZShmb3JtYXRSb290LCBzZi5maWxlTmFtZS5yZXBsYWNlKC9cXC5qcyQvLCAnLmQudHMnKSkpO1xuICAgIGlmIChmcy5leGlzdHMobWlycm9yZWREdHNQYXRoKSkge1xuICAgICAgYWRkaXRpb25hbEZpbGVzLnB1c2gobWlycm9yZWREdHNQYXRoKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFkZGl0aW9uYWxGaWxlcztcbn1cbiJdfQ==