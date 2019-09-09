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
     */
    function makeEntryPointBundle(fs, entryPoint, formatPath, isCore, format, transformDts, pathMappings, mirrorDtsFromSrc) {
        if (mirrorDtsFromSrc === void 0) { mirrorDtsFromSrc = false; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfYnVuZGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFRQSwyRUFBMkc7SUFFM0cseUZBQWtFO0lBRWxFLGlHQUE2RDtJQWdCN0Q7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxTQUFnQixvQkFBb0IsQ0FDaEMsRUFBYyxFQUFFLFVBQXNCLEVBQUUsVUFBa0IsRUFBRSxNQUFlLEVBQzNFLE1BQXdCLEVBQUUsWUFBcUIsRUFBRSxZQUEyQixFQUM1RSxnQkFBaUM7UUFBakMsaUNBQUEsRUFBQSx3QkFBaUM7UUFDbkMsK0NBQStDO1FBQy9DLElBQU0sT0FBTyxzQkFDWCxPQUFPLEVBQUUsSUFBSSxFQUNiLG9CQUFvQixFQUFFLFFBQVEsRUFDOUIsS0FBSyxFQUFFLElBQUksRUFDWCxPQUFPLEVBQUUsVUFBVSxDQUFDLElBQUksSUFBSyxZQUFZLENBQzFDLENBQUM7UUFDRixJQUFNLE9BQU8sR0FBRyxJQUFJLDRDQUF1QixDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFFLElBQU0sT0FBTyxHQUFHLElBQUksK0JBQWlCLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25ELElBQU0sUUFBUSxHQUFHLENBQUMsMEJBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVqRCw0Q0FBNEM7UUFDNUMsSUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzlELElBQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEUsSUFBTSxHQUFHLEdBQUcsa0NBQWlCLENBQ3pCLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RixJQUFNLGtCQUFrQixHQUFHLFlBQVksSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3pELG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ2xGLEVBQUUsQ0FBQztRQUNQLElBQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsa0NBQWlCLENBQ2IsRUFBRSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDO1FBQ2hDLElBQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxHQUFHLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQztRQUV4RCxPQUFPLEVBQUMsVUFBVSxZQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUUsVUFBVSxZQUFBLEVBQUUsR0FBRyxLQUFBLEVBQUUsR0FBRyxLQUFBLEVBQUMsQ0FBQztJQUN0RSxDQUFDO0lBOUJELG9EQThCQztJQUVELFNBQVMsbUNBQW1DLENBQ3hDLEVBQWMsRUFBRSxVQUFzQixFQUFFLFVBQTBCLEVBQ2xFLFdBQTJCOztRQUM3QixJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLElBQU0sZUFBZSxHQUFxQixFQUFFLENBQUM7O1lBQzdDLEtBQWlCLElBQUEsS0FBQSxpQkFBQSxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7Z0JBQXpDLElBQU0sRUFBRSxXQUFBO2dCQUNYLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDaEMsU0FBUztpQkFDVjtnQkFDRCxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUN0QixFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO2dCQUN0RixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ3RCLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQy9CO2FBQ0Y7Ozs7Ozs7OztRQUNELE9BQU8sZUFBZSxDQUFDO0lBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIE5ndHNjQ29tcGlsZXJIb3N0LCBhYnNvbHV0ZUZyb219IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtCdW5kbGVQcm9ncmFtLCBtYWtlQnVuZGxlUHJvZ3JhbX0gZnJvbSAnLi9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtOZ2NjU291cmNlc0NvbXBpbGVySG9zdH0gZnJvbSAnLi9uZ2NjX2NvbXBpbGVyX2hvc3QnO1xuXG4vKipcbiAqIEEgYnVuZGxlIG9mIGZpbGVzIGFuZCBwYXRocyAoYW5kIFRTIHByb2dyYW1zKSB0aGF0IGNvcnJlc3BvbmQgdG8gYSBwYXJ0aWN1bGFyXG4gKiBmb3JtYXQgb2YgYSBwYWNrYWdlIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnRCdW5kbGUge1xuICBlbnRyeVBvaW50OiBFbnRyeVBvaW50O1xuICBmb3JtYXQ6IEVudHJ5UG9pbnRGb3JtYXQ7XG4gIGlzQ29yZTogYm9vbGVhbjtcbiAgaXNGbGF0Q29yZTogYm9vbGVhbjtcbiAgcm9vdERpcnM6IEFic29sdXRlRnNQYXRoW107XG4gIHNyYzogQnVuZGxlUHJvZ3JhbTtcbiAgZHRzOiBCdW5kbGVQcm9ncmFtfG51bGw7XG59XG5cbi8qKlxuICogR2V0IGFuIG9iamVjdCB0aGF0IGRlc2NyaWJlcyBhIGZvcm1hdHRlZCBidW5kbGUgZm9yIGFuIGVudHJ5LXBvaW50LlxuICogQHBhcmFtIGZzIFRoZSBjdXJyZW50IGZpbGUtc3lzdGVtIGJlaW5nIHVzZWQuXG4gKiBAcGFyYW0gZW50cnlQb2ludCBUaGUgZW50cnktcG9pbnQgdGhhdCBjb250YWlucyB0aGUgYnVuZGxlLlxuICogQHBhcmFtIGZvcm1hdFBhdGggVGhlIHBhdGggdG8gdGhlIHNvdXJjZSBmaWxlcyBmb3IgdGhpcyBidW5kbGUuXG4gKiBAcGFyYW0gaXNDb3JlIFRoaXMgZW50cnkgcG9pbnQgaXMgdGhlIEFuZ3VsYXIgY29yZSBwYWNrYWdlLlxuICogQHBhcmFtIGZvcm1hdCBUaGUgdW5kZXJseWluZyBmb3JtYXQgb2YgdGhlIGJ1bmRsZS5cbiAqIEBwYXJhbSB0cmFuc2Zvcm1EdHMgV2hldGhlciB0byB0cmFuc2Zvcm0gdGhlIHR5cGluZ3MgYWxvbmcgd2l0aCB0aGlzIGJ1bmRsZS5cbiAqIEBwYXJhbSBwYXRoTWFwcGluZ3MgQW4gb3B0aW9uYWwgc2V0IG9mIG1hcHBpbmdzIHRvIHVzZSB3aGVuIGNvbXBpbGluZyBmaWxlcy5cbiAqIEBwYXJhbSBtaXJyb3JEdHNGcm9tU3JjIElmIHRydWUgdGhlbiB0aGUgYGR0c2AgcHJvZ3JhbSB3aWxsIGNvbnRhaW4gYWRkaXRpb25hbCBmaWxlcyB0aGF0XG4gKiB3ZXJlIGd1ZXNzZWQgYnkgbWFwcGluZyB0aGUgYHNyY2AgZmlsZXMgdG8gYGR0c2AgZmlsZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICBmczogRmlsZVN5c3RlbSwgZW50cnlQb2ludDogRW50cnlQb2ludCwgZm9ybWF0UGF0aDogc3RyaW5nLCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgZm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0LCB0cmFuc2Zvcm1EdHM6IGJvb2xlYW4sIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncyxcbiAgICBtaXJyb3JEdHNGcm9tU3JjOiBib29sZWFuID0gZmFsc2UpOiBFbnRyeVBvaW50QnVuZGxlIHtcbiAgLy8gQ3JlYXRlIHRoZSBUUyBwcm9ncmFtIGFuZCBuZWNlc3NhcnkgaGVscGVycy5cbiAgY29uc3Qgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zID0ge1xuICAgIGFsbG93SnM6IHRydWUsXG4gICAgbWF4Tm9kZU1vZHVsZUpzRGVwdGg6IEluZmluaXR5LFxuICAgIG5vTGliOiB0cnVlLFxuICAgIHJvb3REaXI6IGVudHJ5UG9pbnQucGF0aCwgLi4ucGF0aE1hcHBpbmdzXG4gIH07XG4gIGNvbnN0IHNyY0hvc3QgPSBuZXcgTmdjY1NvdXJjZXNDb21waWxlckhvc3QoZnMsIG9wdGlvbnMsIGVudHJ5UG9pbnQucGF0aCk7XG4gIGNvbnN0IGR0c0hvc3QgPSBuZXcgTmd0c2NDb21waWxlckhvc3QoZnMsIG9wdGlvbnMpO1xuICBjb25zdCByb290RGlycyA9IFthYnNvbHV0ZUZyb20oZW50cnlQb2ludC5wYXRoKV07XG5cbiAgLy8gQ3JlYXRlIHRoZSBidW5kbGUgcHJvZ3JhbXMsIGFzIG5lY2Vzc2FyeS5cbiAgY29uc3QgYWJzRm9ybWF0UGF0aCA9IGZzLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoKTtcbiAgY29uc3QgdHlwaW5nc1BhdGggPSBmcy5yZXNvbHZlKGVudHJ5UG9pbnQucGF0aCwgZW50cnlQb2ludC50eXBpbmdzKTtcbiAgY29uc3Qgc3JjID0gbWFrZUJ1bmRsZVByb2dyYW0oXG4gICAgICBmcywgaXNDb3JlLCBlbnRyeVBvaW50LnBhY2thZ2UsIGFic0Zvcm1hdFBhdGgsICdyM19zeW1ib2xzLmpzJywgb3B0aW9ucywgc3JjSG9zdCk7XG4gIGNvbnN0IGFkZGl0aW9uYWxEdHNGaWxlcyA9IHRyYW5zZm9ybUR0cyAmJiBtaXJyb3JEdHNGcm9tU3JjID9cbiAgICAgIGNvbXB1dGVQb3RlbnRpYWxEdHNGaWxlc0Zyb21Kc0ZpbGVzKGZzLCBzcmMucHJvZ3JhbSwgYWJzRm9ybWF0UGF0aCwgdHlwaW5nc1BhdGgpIDpcbiAgICAgIFtdO1xuICBjb25zdCBkdHMgPSB0cmFuc2Zvcm1EdHMgPyBtYWtlQnVuZGxlUHJvZ3JhbShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLCBpc0NvcmUsIGVudHJ5UG9pbnQucGFja2FnZSwgdHlwaW5nc1BhdGgsICdyM19zeW1ib2xzLmQudHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucywgZHRzSG9zdCwgYWRkaXRpb25hbER0c0ZpbGVzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGw7XG4gIGNvbnN0IGlzRmxhdENvcmUgPSBpc0NvcmUgJiYgc3JjLnIzU3ltYm9sc0ZpbGUgPT09IG51bGw7XG5cbiAgcmV0dXJuIHtlbnRyeVBvaW50LCBmb3JtYXQsIHJvb3REaXJzLCBpc0NvcmUsIGlzRmxhdENvcmUsIHNyYywgZHRzfTtcbn1cblxuZnVuY3Rpb24gY29tcHV0ZVBvdGVudGlhbER0c0ZpbGVzRnJvbUpzRmlsZXMoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHNyY1Byb2dyYW06IHRzLlByb2dyYW0sIGZvcm1hdFBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIHR5cGluZ3NQYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICBjb25zdCByZWxhdGl2ZVBhdGggPSBmcy5yZWxhdGl2ZShmcy5kaXJuYW1lKGZvcm1hdFBhdGgpLCBmcy5kaXJuYW1lKHR5cGluZ3NQYXRoKSk7XG4gIGNvbnN0IGFkZGl0aW9uYWxGaWxlczogQWJzb2x1dGVGc1BhdGhbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHNmIG9mIHNyY1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgIGlmICghc2YuZmlsZU5hbWUuZW5kc1dpdGgoJy5qcycpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZHRzUGF0aCA9IGZzLnJlc29sdmUoXG4gICAgICAgIGZzLmRpcm5hbWUoc2YuZmlsZU5hbWUpLCByZWxhdGl2ZVBhdGgsIGZzLmJhc2VuYW1lKHNmLmZpbGVOYW1lLCAnLmpzJykgKyAnLmQudHMnKTtcbiAgICBpZiAoZnMuZXhpc3RzKGR0c1BhdGgpKSB7XG4gICAgICBhZGRpdGlvbmFsRmlsZXMucHVzaChkdHNQYXRoKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGFkZGl0aW9uYWxGaWxlcztcbn1cbiJdfQ==