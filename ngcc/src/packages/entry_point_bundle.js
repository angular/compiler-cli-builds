(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/file_system/src/compiler_host", "@angular/compiler-cli/ngcc/src/packages/bundle_program", "@angular/compiler-cli/ngcc/src/packages/ngcc_compiler_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var compiler_host_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/compiler_host");
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
     */
    function makeEntryPointBundle(fs, entryPoint, formatPath, isCore, format, transformDts, pathMappings, mirrorDtsFromSrc) {
        if (mirrorDtsFromSrc === void 0) { mirrorDtsFromSrc = false; }
        // Create the TS program and necessary helpers.
        var options = tslib_1.__assign({ allowJs: true, maxNodeModuleJsDepth: Infinity, noLib: true, rootDir: entryPoint.path }, pathMappings);
        var srcHost = new ngcc_compiler_host_1.NgccSourcesCompilerHost(fs, options, entryPoint.path);
        var dtsHost = new compiler_host_1.NgtscCompilerHost(fs, options);
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
        return { entryPoint: entryPoint, format: format, rootDirs: rootDirs, isCore: isCore, isFlatCore: isFlatCore, src: src, dts: dts };
    }
    exports.makeEntryPointBundle = makeEntryPointBundle;
    function computePotentialDtsFilesFromJsFiles(fs, srcProgram, formatPath, typingsPath) {
        var e_1, _a;
        var relativePath = fs.relative(fs.dirname(formatPath), fs.dirname(typingsPath));
        var additionalFiles = [];
        try {
            for (var _b = tslib_1.__values(srcProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var sf = _c.value;
                if (!sf.fileName.endsWith('.js')) {
                    continue;
                }
                var dtsPath = fs.resolve(fs.dirname(sf.fileName), relativePath, fs.basename(sf.fileName, '.js') + '.d.ts');
                if (fs.exists(dtsPath)) {
                    additionalFiles.push(dtsPath);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfYnVuZGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFRQSwyRUFBd0Y7SUFDeEYsK0ZBQW1GO0lBRW5GLHlGQUFrRTtJQUVsRSxpR0FBNkQ7SUFnQjdEOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsU0FBZ0Isb0JBQW9CLENBQ2hDLEVBQWMsRUFBRSxVQUFzQixFQUFFLFVBQWtCLEVBQUUsTUFBZSxFQUMzRSxNQUF3QixFQUFFLFlBQXFCLEVBQUUsWUFBMkIsRUFDNUUsZ0JBQWlDO1FBQWpDLGlDQUFBLEVBQUEsd0JBQWlDO1FBQ25DLCtDQUErQztRQUMvQyxJQUFNLE9BQU8sc0JBQ1gsT0FBTyxFQUFFLElBQUksRUFDYixvQkFBb0IsRUFBRSxRQUFRLEVBQzlCLEtBQUssRUFBRSxJQUFJLEVBQ1gsT0FBTyxFQUFFLFVBQVUsQ0FBQyxJQUFJLElBQUssWUFBWSxDQUMxQyxDQUFDO1FBQ0YsSUFBTSxPQUFPLEdBQUcsSUFBSSw0Q0FBdUIsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxRSxJQUFNLE9BQU8sR0FBRyxJQUFJLGlDQUFpQixDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRCxJQUFNLFFBQVEsR0FBRyxDQUFDLDBCQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFakQsNENBQTRDO1FBQzVDLElBQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM5RCxJQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BFLElBQU0sR0FBRyxHQUFHLGtDQUFpQixDQUN6QixFQUFFLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdEYsSUFBTSxrQkFBa0IsR0FBRyxZQUFZLElBQUksZ0JBQWdCLENBQUMsQ0FBQztZQUN6RCxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNsRixFQUFFLENBQUM7UUFDUCxJQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLGtDQUFpQixDQUNiLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQztRQUNoQyxJQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksR0FBRyxDQUFDLGFBQWEsS0FBSyxJQUFJLENBQUM7UUFFeEQsT0FBTyxFQUFDLFVBQVUsWUFBQSxFQUFFLE1BQU0sUUFBQSxFQUFFLFFBQVEsVUFBQSxFQUFFLE1BQU0sUUFBQSxFQUFFLFVBQVUsWUFBQSxFQUFFLEdBQUcsS0FBQSxFQUFFLEdBQUcsS0FBQSxFQUFDLENBQUM7SUFDdEUsQ0FBQztJQTlCRCxvREE4QkM7SUFFRCxTQUFTLG1DQUFtQyxDQUN4QyxFQUFjLEVBQUUsVUFBc0IsRUFBRSxVQUEwQixFQUNsRSxXQUEyQjs7UUFDN0IsSUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUNsRixJQUFNLGVBQWUsR0FBcUIsRUFBRSxDQUFDOztZQUM3QyxLQUFpQixJQUFBLEtBQUEsaUJBQUEsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFBLGdCQUFBLDRCQUFFO2dCQUF6QyxJQUFNLEVBQUUsV0FBQTtnQkFDWCxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2hDLFNBQVM7aUJBQ1Y7Z0JBQ0QsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FDdEIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztnQkFDdEYsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUN0QixlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUMvQjthQUNGOzs7Ozs7Ozs7UUFDRCxPQUFPLGVBQWUsQ0FBQztJQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb219IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge05ndHNjQ29tcGlsZXJIb3N0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2NvbXBpbGVyX2hvc3QnO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7QnVuZGxlUHJvZ3JhbSwgbWFrZUJ1bmRsZVByb2dyYW19IGZyb20gJy4vYnVuZGxlX3Byb2dyYW0nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL2VudHJ5X3BvaW50JztcbmltcG9ydCB7TmdjY1NvdXJjZXNDb21waWxlckhvc3R9IGZyb20gJy4vbmdjY19jb21waWxlcl9ob3N0JztcblxuLyoqXG4gKiBBIGJ1bmRsZSBvZiBmaWxlcyBhbmQgcGF0aHMgKGFuZCBUUyBwcm9ncmFtcykgdGhhdCBjb3JyZXNwb25kIHRvIGEgcGFydGljdWxhclxuICogZm9ybWF0IG9mIGEgcGFja2FnZSBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50QnVuZGxlIHtcbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcbiAgZm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0O1xuICBpc0NvcmU6IGJvb2xlYW47XG4gIGlzRmxhdENvcmU6IGJvb2xlYW47XG4gIHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuICBzcmM6IEJ1bmRsZVByb2dyYW07XG4gIGR0czogQnVuZGxlUHJvZ3JhbXxudWxsO1xufVxuXG4vKipcbiAqIEdldCBhbiBvYmplY3QgdGhhdCBkZXNjcmliZXMgYSBmb3JtYXR0ZWQgYnVuZGxlIGZvciBhbiBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBmcyBUaGUgY3VycmVudCBmaWxlLXN5c3RlbSBiZWluZyB1c2VkLlxuICogQHBhcmFtIGVudHJ5UG9pbnQgVGhlIGVudHJ5LXBvaW50IHRoYXQgY29udGFpbnMgdGhlIGJ1bmRsZS5cbiAqIEBwYXJhbSBmb3JtYXRQYXRoIFRoZSBwYXRoIHRvIHRoZSBzb3VyY2UgZmlsZXMgZm9yIHRoaXMgYnVuZGxlLlxuICogQHBhcmFtIGlzQ29yZSBUaGlzIGVudHJ5IHBvaW50IGlzIHRoZSBBbmd1bGFyIGNvcmUgcGFja2FnZS5cbiAqIEBwYXJhbSBmb3JtYXQgVGhlIHVuZGVybHlpbmcgZm9ybWF0IG9mIHRoZSBidW5kbGUuXG4gKiBAcGFyYW0gdHJhbnNmb3JtRHRzIFdoZXRoZXIgdG8gdHJhbnNmb3JtIHRoZSB0eXBpbmdzIGFsb25nIHdpdGggdGhpcyBidW5kbGUuXG4gKiBAcGFyYW0gcGF0aE1hcHBpbmdzIEFuIG9wdGlvbmFsIHNldCBvZiBtYXBwaW5ncyB0byB1c2Ugd2hlbiBjb21waWxpbmcgZmlsZXMuXG4gKiBAcGFyYW0gbWlycm9yRHRzRnJvbVNyYyBJZiB0cnVlIHRoZW4gdGhlIGBkdHNgIHByb2dyYW0gd2lsbCBjb250YWluIGFkZGl0aW9uYWwgZmlsZXMgdGhhdFxuICogd2VyZSBndWVzc2VkIGJ5IG1hcHBpbmcgdGhlIGBzcmNgIGZpbGVzIHRvIGBkdHNgIGZpbGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZUVudHJ5UG9pbnRCdW5kbGUoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIGZvcm1hdFBhdGg6IHN0cmluZywgaXNDb3JlOiBib29sZWFuLFxuICAgIGZvcm1hdDogRW50cnlQb2ludEZvcm1hdCwgdHJhbnNmb3JtRHRzOiBib29sZWFuLCBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3MsXG4gICAgbWlycm9yRHRzRnJvbVNyYzogYm9vbGVhbiA9IGZhbHNlKTogRW50cnlQb2ludEJ1bmRsZSB7XG4gIC8vIENyZWF0ZSB0aGUgVFMgcHJvZ3JhbSBhbmQgbmVjZXNzYXJ5IGhlbHBlcnMuXG4gIGNvbnN0IG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICBhbGxvd0pzOiB0cnVlLFxuICAgIG1heE5vZGVNb2R1bGVKc0RlcHRoOiBJbmZpbml0eSxcbiAgICBub0xpYjogdHJ1ZSxcbiAgICByb290RGlyOiBlbnRyeVBvaW50LnBhdGgsIC4uLnBhdGhNYXBwaW5nc1xuICB9O1xuICBjb25zdCBzcmNIb3N0ID0gbmV3IE5nY2NTb3VyY2VzQ29tcGlsZXJIb3N0KGZzLCBvcHRpb25zLCBlbnRyeVBvaW50LnBhdGgpO1xuICBjb25zdCBkdHNIb3N0ID0gbmV3IE5ndHNjQ29tcGlsZXJIb3N0KGZzLCBvcHRpb25zKTtcbiAgY29uc3Qgcm9vdERpcnMgPSBbYWJzb2x1dGVGcm9tKGVudHJ5UG9pbnQucGF0aCldO1xuXG4gIC8vIENyZWF0ZSB0aGUgYnVuZGxlIHByb2dyYW1zLCBhcyBuZWNlc3NhcnkuXG4gIGNvbnN0IGFic0Zvcm1hdFBhdGggPSBmcy5yZXNvbHZlKGVudHJ5UG9pbnQucGF0aCwgZm9ybWF0UGF0aCk7XG4gIGNvbnN0IHR5cGluZ3NQYXRoID0gZnMucmVzb2x2ZShlbnRyeVBvaW50LnBhdGgsIGVudHJ5UG9pbnQudHlwaW5ncyk7XG4gIGNvbnN0IHNyYyA9IG1ha2VCdW5kbGVQcm9ncmFtKFxuICAgICAgZnMsIGlzQ29yZSwgZW50cnlQb2ludC5wYWNrYWdlLCBhYnNGb3JtYXRQYXRoLCAncjNfc3ltYm9scy5qcycsIG9wdGlvbnMsIHNyY0hvc3QpO1xuICBjb25zdCBhZGRpdGlvbmFsRHRzRmlsZXMgPSB0cmFuc2Zvcm1EdHMgJiYgbWlycm9yRHRzRnJvbVNyYyA/XG4gICAgICBjb21wdXRlUG90ZW50aWFsRHRzRmlsZXNGcm9tSnNGaWxlcyhmcywgc3JjLnByb2dyYW0sIGFic0Zvcm1hdFBhdGgsIHR5cGluZ3NQYXRoKSA6XG4gICAgICBbXTtcbiAgY29uc3QgZHRzID0gdHJhbnNmb3JtRHRzID8gbWFrZUJ1bmRsZVByb2dyYW0oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcywgaXNDb3JlLCBlbnRyeVBvaW50LnBhY2thZ2UsIHR5cGluZ3NQYXRoLCAncjNfc3ltYm9scy5kLnRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMsIGR0c0hvc3QsIGFkZGl0aW9uYWxEdHNGaWxlcykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsO1xuICBjb25zdCBpc0ZsYXRDb3JlID0gaXNDb3JlICYmIHNyYy5yM1N5bWJvbHNGaWxlID09PSBudWxsO1xuXG4gIHJldHVybiB7ZW50cnlQb2ludCwgZm9ybWF0LCByb290RGlycywgaXNDb3JlLCBpc0ZsYXRDb3JlLCBzcmMsIGR0c307XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVQb3RlbnRpYWxEdHNGaWxlc0Zyb21Kc0ZpbGVzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBzcmNQcm9ncmFtOiB0cy5Qcm9ncmFtLCBmb3JtYXRQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICB0eXBpbmdzUGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgY29uc3QgcmVsYXRpdmVQYXRoID0gZnMucmVsYXRpdmUoZnMuZGlybmFtZShmb3JtYXRQYXRoKSwgZnMuZGlybmFtZSh0eXBpbmdzUGF0aCkpO1xuICBjb25zdCBhZGRpdGlvbmFsRmlsZXM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgZm9yIChjb25zdCBzZiBvZiBzcmNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICBpZiAoIXNmLmZpbGVOYW1lLmVuZHNXaXRoKCcuanMnKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGR0c1BhdGggPSBmcy5yZXNvbHZlKFxuICAgICAgICBmcy5kaXJuYW1lKHNmLmZpbGVOYW1lKSwgcmVsYXRpdmVQYXRoLCBmcy5iYXNlbmFtZShzZi5maWxlTmFtZSwgJy5qcycpICsgJy5kLnRzJyk7XG4gICAgaWYgKGZzLmV4aXN0cyhkdHNQYXRoKSkge1xuICAgICAgYWRkaXRpb25hbEZpbGVzLnB1c2goZHRzUGF0aCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBhZGRpdGlvbmFsRmlsZXM7XG59XG4iXX0=