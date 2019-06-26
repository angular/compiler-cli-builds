(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/transformer", ["require", "exports", "@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", "@angular/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer", "@angular/compiler-cli/ngcc/src/analysis/ngcc_references_registry", "@angular/compiler-cli/ngcc/src/analysis/private_declarations_analyzer", "@angular/compiler-cli/ngcc/src/analysis/switch_marker_analyzer", "@angular/compiler-cli/ngcc/src/host/commonjs_host", "@angular/compiler-cli/ngcc/src/host/esm2015_host", "@angular/compiler-cli/ngcc/src/host/esm5_host", "@angular/compiler-cli/ngcc/src/host/umd_host", "@angular/compiler-cli/ngcc/src/rendering/commonjs_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/dts_renderer", "@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/esm_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/renderer", "@angular/compiler-cli/ngcc/src/rendering/umd_rendering_formatter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var decoration_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer");
    var module_with_providers_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer");
    var ngcc_references_registry_1 = require("@angular/compiler-cli/ngcc/src/analysis/ngcc_references_registry");
    var private_declarations_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/private_declarations_analyzer");
    var switch_marker_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/switch_marker_analyzer");
    var commonjs_host_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_host");
    var esm2015_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm2015_host");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
    var umd_host_1 = require("@angular/compiler-cli/ngcc/src/host/umd_host");
    var commonjs_rendering_formatter_1 = require("@angular/compiler-cli/ngcc/src/rendering/commonjs_rendering_formatter");
    var dts_renderer_1 = require("@angular/compiler-cli/ngcc/src/rendering/dts_renderer");
    var esm5_rendering_formatter_1 = require("@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter");
    var esm_rendering_formatter_1 = require("@angular/compiler-cli/ngcc/src/rendering/esm_rendering_formatter");
    var renderer_1 = require("@angular/compiler-cli/ngcc/src/rendering/renderer");
    var umd_rendering_formatter_1 = require("@angular/compiler-cli/ngcc/src/rendering/umd_rendering_formatter");
    /**
     * A Package is stored in a directory on disk and that directory can contain one or more package
     * formats - e.g. fesm2015, UMD, etc. Additionally, each package provides typings (`.d.ts` files).
     *
     * Each of these formats exposes one or more entry points, which are source files that need to be
     * parsed to identify the decorated exported classes that need to be analyzed and compiled by one or
     * more `DecoratorHandler` objects.
     *
     * Each entry point to a package is identified by a `package.json` which contains properties that
     * indicate what formatted bundles are accessible via this end-point.
     *
     * Each bundle is identified by a root `SourceFile` that can be parsed and analyzed to
     * identify classes that need to be transformed; and then finally rendered and written to disk.
     *
     * Along with the source files, the corresponding source maps (either inline or external) and
     * `.d.ts` files are transformed accordingly.
     *
     * - Flat file packages have all the classes in a single file.
     * - Other packages may re-export classes from other non-entry point files.
     * - Some formats may contain multiple "modules" in a single file.
     */
    var Transformer = /** @class */ (function () {
        function Transformer(fs, logger) {
            this.fs = fs;
            this.logger = logger;
        }
        /**
         * Transform the source (and typings) files of a bundle.
         * @param bundle the bundle to transform.
         * @returns information about the files that were transformed.
         */
        Transformer.prototype.transform = function (bundle) {
            var isCore = bundle.isCore;
            var reflectionHost = this.getHost(isCore, bundle);
            // Parse and analyze the files.
            var _a = this.analyzeProgram(reflectionHost, isCore, bundle), decorationAnalyses = _a.decorationAnalyses, switchMarkerAnalyses = _a.switchMarkerAnalyses, privateDeclarationsAnalyses = _a.privateDeclarationsAnalyses, moduleWithProvidersAnalyses = _a.moduleWithProvidersAnalyses;
            // Transform the source files and source maps.
            var srcFormatter = this.getRenderingFormatter(reflectionHost, isCore, bundle);
            var renderer = new renderer_1.Renderer(srcFormatter, this.fs, this.logger, reflectionHost, isCore, bundle);
            var renderedFiles = renderer.renderProgram(decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses);
            if (bundle.dts) {
                var dtsFormatter = new esm_rendering_formatter_1.EsmRenderingFormatter(reflectionHost, isCore);
                var dtsRenderer = new dts_renderer_1.DtsRenderer(dtsFormatter, this.fs, this.logger, reflectionHost, isCore, bundle);
                var renderedDtsFiles = dtsRenderer.renderProgram(decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses);
                renderedFiles = renderedFiles.concat(renderedDtsFiles);
            }
            return renderedFiles;
        };
        Transformer.prototype.getHost = function (isCore, bundle) {
            var typeChecker = bundle.src.program.getTypeChecker();
            switch (bundle.format) {
                case 'esm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(this.logger, isCore, typeChecker, bundle.dts);
                case 'esm5':
                    return new esm5_host_1.Esm5ReflectionHost(this.logger, isCore, typeChecker, bundle.dts);
                case 'umd':
                    return new umd_host_1.UmdReflectionHost(this.logger, isCore, bundle.src.program, bundle.src.host, bundle.dts);
                case 'commonjs':
                    return new commonjs_host_1.CommonJsReflectionHost(this.logger, isCore, bundle.src.program, bundle.src.host, bundle.dts);
                default:
                    throw new Error("Reflection host for \"" + bundle.format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.getRenderingFormatter = function (host, isCore, bundle) {
            switch (bundle.format) {
                case 'esm2015':
                    return new esm_rendering_formatter_1.EsmRenderingFormatter(host, isCore);
                case 'esm5':
                    return new esm5_rendering_formatter_1.Esm5RenderingFormatter(host, isCore);
                case 'umd':
                    if (!(host instanceof umd_host_1.UmdReflectionHost)) {
                        throw new Error('UmdRenderer requires a UmdReflectionHost');
                    }
                    return new umd_rendering_formatter_1.UmdRenderingFormatter(host, isCore);
                case 'commonjs':
                    return new commonjs_rendering_formatter_1.CommonJsRenderingFormatter(host, isCore);
                default:
                    throw new Error("Renderer for \"" + bundle.format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.analyzeProgram = function (reflectionHost, isCore, bundle) {
            var typeChecker = bundle.src.program.getTypeChecker();
            var referencesRegistry = new ngcc_references_registry_1.NgccReferencesRegistry(reflectionHost);
            var switchMarkerAnalyzer = new switch_marker_analyzer_1.SwitchMarkerAnalyzer(reflectionHost);
            var switchMarkerAnalyses = switchMarkerAnalyzer.analyzeProgram(bundle.src.program);
            var decorationAnalyzer = new decoration_analyzer_1.DecorationAnalyzer(this.fs, bundle.src.program, bundle.src.options, bundle.src.host, typeChecker, reflectionHost, referencesRegistry, bundle.rootDirs, isCore);
            var decorationAnalyses = decorationAnalyzer.analyzeProgram();
            var moduleWithProvidersAnalyzer = bundle.dts && new module_with_providers_analyzer_1.ModuleWithProvidersAnalyzer(reflectionHost, referencesRegistry);
            var moduleWithProvidersAnalyses = moduleWithProvidersAnalyzer &&
                moduleWithProvidersAnalyzer.analyzeProgram(bundle.src.program);
            var privateDeclarationsAnalyzer = new private_declarations_analyzer_1.PrivateDeclarationsAnalyzer(reflectionHost, referencesRegistry);
            var privateDeclarationsAnalyses = privateDeclarationsAnalyzer.analyzeProgram(bundle.src.program);
            return { decorationAnalyses: decorationAnalyses, switchMarkerAnalyses: switchMarkerAnalyses, privateDeclarationsAnalyses: privateDeclarationsAnalyses,
                moduleWithProvidersAnalyses: moduleWithProvidersAnalyses };
        };
        return Transformer;
    }());
    exports.Transformer = Transformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFTQSxtR0FBaUY7SUFDakYseUhBQW9IO0lBQ3BILDZHQUE0RTtJQUM1RSx1SEFBa0c7SUFDbEcseUdBQThGO0lBQzlGLG1GQUE2RDtJQUM3RCxpRkFBMkQ7SUFDM0QsMkVBQXFEO0lBRXJELHlFQUFtRDtJQUVuRCxzSEFBcUY7SUFDckYsc0ZBQXNEO0lBQ3RELDhHQUE2RTtJQUM3RSw0R0FBMkU7SUFDM0UsOEVBQStDO0lBRS9DLDRHQUEyRTtJQUkzRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FvQkc7SUFDSDtRQUNFLHFCQUFvQixFQUFjLEVBQVUsTUFBYztZQUF0QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFHLENBQUM7UUFFOUQ7Ozs7V0FJRztRQUNILCtCQUFTLEdBQVQsVUFBVSxNQUF3QjtZQUNoQyxJQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXBELCtCQUErQjtZQUN6QixJQUFBLHdEQUNtRixFQURsRiwwQ0FBa0IsRUFBRSw4Q0FBb0IsRUFBRSw0REFBMkIsRUFDckUsNERBQWtGLENBQUM7WUFFMUYsOENBQThDO1lBQzlDLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRWhGLElBQU0sUUFBUSxHQUNWLElBQUksbUJBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMs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QUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFbkUsT0FBTyxFQUFDLGtCQUFrQixvQkFBQSxFQUFFLG9CQUFvQixzQkFBQSxFQUFFLDJCQUEyQiw2QkFBQTtnQkFDckUsMkJBQTJCLDZCQUFBLEVBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0gsa0JBQUM7SUFBRCxDQUFDLEFBbkdELElBbUdDO0lBbkdZLGtDQUFXIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0NvbXBpbGVkRmlsZSwgRGVjb3JhdGlvbkFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLCBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplcic7XG5pbXBvcnQge05nY2NSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4uL2FuYWx5c2lzL25nY2NfcmVmZXJlbmNlc19yZWdpc3RyeSc7XG5pbXBvcnQge0V4cG9ydEluZm8sIFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtTd2l0Y2hNYXJrZXJBbmFseXNlcywgU3dpdGNoTWFya2VyQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtDb21tb25Kc1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2NvbW1vbmpzX2hvc3QnO1xuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTVfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtVbWRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC91bWRfaG9zdCc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtDb21tb25Kc1JlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2NvbW1vbmpzX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtEdHNSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2R0c19yZW5kZXJlcic7XG5pbXBvcnQge0VzbTVSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc201X3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtFc21SZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc21fcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge1JlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuaW1wb3J0IHtSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7VW1kUmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvdW1kX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi4vcmVuZGVyaW5nL3V0aWxzJztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9lbnRyeV9wb2ludF9idW5kbGUnO1xuXG4vKipcbiAqIEEgUGFja2FnZSBpcyBzdG9yZWQgaW4gYSBkaXJlY3Rvcnkgb24gZGlzayBhbmQgdGhhdCBkaXJlY3RvcnkgY2FuIGNvbnRhaW4gb25lIG9yIG1vcmUgcGFja2FnZVxuICogZm9ybWF0cyAtIGUuZy4gZmVzbTIwMTUsIFVNRCwgZXRjLiBBZGRpdGlvbmFsbHksIGVhY2ggcGFja2FnZSBwcm92aWRlcyB0eXBpbmdzIChgLmQudHNgIGZpbGVzKS5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgcGFja2FnZS5qc29uYCB3aGljaCBjb250YWlucyBwcm9wZXJ0aWVzIHRoYXRcbiAqIGluZGljYXRlIHdoYXQgZm9ybWF0dGVkIGJ1bmRsZXMgYXJlIGFjY2Vzc2libGUgdmlhIHRoaXMgZW5kLXBvaW50LlxuICpcbiAqIEVhY2ggYnVuZGxlIGlzIGlkZW50aWZpZWQgYnkgYSByb290IGBTb3VyY2VGaWxlYCB0aGF0IGNhbiBiZSBwYXJzZWQgYW5kIGFuYWx5emVkIHRvXG4gKiBpZGVudGlmeSBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZDsgYW5kIHRoZW4gZmluYWxseSByZW5kZXJlZCBhbmQgd3JpdHRlbiB0byBkaXNrLlxuICpcbiAqIEFsb25nIHdpdGggdGhlIHNvdXJjZSBmaWxlcywgdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIG1hcHMgKGVpdGhlciBpbmxpbmUgb3IgZXh0ZXJuYWwpIGFuZFxuICogYC5kLnRzYCBmaWxlcyBhcmUgdHJhbnNmb3JtZWQgYWNjb3JkaW5nbHkuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcikge31cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHRoZSBzb3VyY2UgKGFuZCB0eXBpbmdzKSBmaWxlcyBvZiBhIGJ1bmRsZS5cbiAgICogQHBhcmFtIGJ1bmRsZSB0aGUgYnVuZGxlIHRvIHRyYW5zZm9ybS5cbiAgICogQHJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGZpbGVzIHRoYXQgd2VyZSB0cmFuc2Zvcm1lZC5cbiAgICovXG4gIHRyYW5zZm9ybShidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBGaWxlVG9Xcml0ZVtdIHtcbiAgICBjb25zdCBpc0NvcmUgPSBidW5kbGUuaXNDb3JlO1xuICAgIGNvbnN0IHJlZmxlY3Rpb25Ib3N0ID0gdGhpcy5nZXRIb3N0KGlzQ29yZSwgYnVuZGxlKTtcblxuICAgIC8vIFBhcnNlIGFuZCBhbmFseXplIHRoZSBmaWxlcy5cbiAgICBjb25zdCB7ZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN9ID0gdGhpcy5hbmFseXplUHJvZ3JhbShyZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMgYW5kIHNvdXJjZSBtYXBzLlxuICAgIGNvbnN0IHNyY0Zvcm1hdHRlciA9IHRoaXMuZ2V0UmVuZGVyaW5nRm9ybWF0dGVyKHJlZmxlY3Rpb25Ib3N0LCBpc0NvcmUsIGJ1bmRsZSk7XG5cbiAgICBjb25zdCByZW5kZXJlciA9XG4gICAgICAgIG5ldyBSZW5kZXJlcihzcmNGb3JtYXR0ZXIsIHRoaXMuZnMsIHRoaXMubG9nZ2VyLCByZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuICAgIGxldCByZW5kZXJlZEZpbGVzID0gcmVuZGVyZXIucmVuZGVyUHJvZ3JhbShcbiAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTtcblxuICAgIGlmIChidW5kbGUuZHRzKSB7XG4gICAgICBjb25zdCBkdHNGb3JtYXR0ZXIgPSBuZXcgRXNtUmVuZGVyaW5nRm9ybWF0dGVyKHJlZmxlY3Rpb25Ib3N0LCBpc0NvcmUpO1xuICAgICAgY29uc3QgZHRzUmVuZGVyZXIgPVxuICAgICAgICAgIG5ldyBEdHNSZW5kZXJlcihkdHNGb3JtYXR0ZXIsIHRoaXMuZnMsIHRoaXMubG9nZ2VyLCByZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuICAgICAgY29uc3QgcmVuZGVyZWREdHNGaWxlcyA9IGR0c1JlbmRlcmVyLnJlbmRlclByb2dyYW0oXG4gICAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyk7XG4gICAgICByZW5kZXJlZEZpbGVzID0gcmVuZGVyZWRGaWxlcy5jb25jYXQocmVuZGVyZWREdHNGaWxlcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbmRlcmVkRmlsZXM7XG4gIH1cblxuICBnZXRIb3N0KGlzQ29yZTogYm9vbGVhbiwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IGJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIHN3aXRjaCAoYnVuZGxlLmZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBpc0NvcmUsIHR5cGVDaGVja2VyLCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZWZsZWN0aW9uSG9zdCh0aGlzLmxvZ2dlciwgaXNDb3JlLCB0eXBlQ2hlY2tlciwgYnVuZGxlLmR0cyk7XG4gICAgICBjYXNlICd1bWQnOlxuICAgICAgICByZXR1cm4gbmV3IFVtZFJlZmxlY3Rpb25Ib3N0KFxuICAgICAgICAgICAgdGhpcy5sb2dnZXIsIGlzQ29yZSwgYnVuZGxlLnNyYy5wcm9ncmFtLCBidW5kbGUuc3JjLmhvc3QsIGJ1bmRsZS5kdHMpO1xuICAgICAgY2FzZSAnY29tbW9uanMnOlxuICAgICAgICByZXR1cm4gbmV3IENvbW1vbkpzUmVmbGVjdGlvbkhvc3QoXG4gICAgICAgICAgICB0aGlzLmxvZ2dlciwgaXNDb3JlLCBidW5kbGUuc3JjLnByb2dyYW0sIGJ1bmRsZS5zcmMuaG9zdCwgYnVuZGxlLmR0cyk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlZmxlY3Rpb24gaG9zdCBmb3IgXCIke2J1bmRsZS5mb3JtYXR9XCIgbm90IHlldCBpbXBsZW1lbnRlZC5gKTtcbiAgICB9XG4gIH1cblxuICBnZXRSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBpc0NvcmU6IGJvb2xlYW4sIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6XG4gICAgICBSZW5kZXJpbmdGb3JtYXR0ZXIge1xuICAgIHN3aXRjaCAoYnVuZGxlLmZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtUmVuZGVyaW5nRm9ybWF0dGVyKGhvc3QsIGlzQ29yZSk7XG4gICAgICBjYXNlICdlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVuZGVyaW5nRm9ybWF0dGVyKGhvc3QsIGlzQ29yZSk7XG4gICAgICBjYXNlICd1bWQnOlxuICAgICAgICBpZiAoIShob3N0IGluc3RhbmNlb2YgVW1kUmVmbGVjdGlvbkhvc3QpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbWRSZW5kZXJlciByZXF1aXJlcyBhIFVtZFJlZmxlY3Rpb25Ib3N0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBVbWRSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdCwgaXNDb3JlKTtcbiAgICAgIGNhc2UgJ2NvbW1vbmpzJzpcbiAgICAgICAgcmV0dXJuIG5ldyBDb21tb25Kc1JlbmRlcmluZ0Zvcm1hdHRlcihob3N0LCBpc0NvcmUpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZW5kZXJlciBmb3IgXCIke2J1bmRsZS5mb3JtYXR9XCIgbm90IHlldCBpbXBsZW1lbnRlZC5gKTtcbiAgICB9XG4gIH1cblxuICBhbmFseXplUHJvZ3JhbShyZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBpc0NvcmU6IGJvb2xlYW4sIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6XG4gICAgICBQcm9ncmFtQW5hbHlzZXMge1xuICAgIGNvbnN0IHR5cGVDaGVja2VyID0gYnVuZGxlLnNyYy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gICAgY29uc3QgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IE5nY2NSZWZlcmVuY2VzUmVnaXN0cnkocmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHl6ZXIgPSBuZXcgU3dpdGNoTWFya2VyQW5hbHl6ZXIocmVmbGVjdGlvbkhvc3QpO1xuICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5c2VzID0gc3dpdGNoTWFya2VyQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcblxuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXplciA9IG5ldyBEZWNvcmF0aW9uQW5hbHl6ZXIoXG4gICAgICAgIHRoaXMuZnMsIGJ1bmRsZS5zcmMucHJvZ3JhbSwgYnVuZGxlLnNyYy5vcHRpb25zLCBidW5kbGUuc3JjLmhvc3QsIHR5cGVDaGVja2VyLFxuICAgICAgICByZWZsZWN0aW9uSG9zdCwgcmVmZXJlbmNlc1JlZ2lzdHJ5LCBidW5kbGUucm9vdERpcnMsIGlzQ29yZSk7XG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5c2VzID0gZGVjb3JhdGlvbkFuYWx5emVyLmFuYWx5emVQcm9ncmFtKCk7XG5cbiAgICBjb25zdCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIgPVxuICAgICAgICBidW5kbGUuZHRzICYmIG5ldyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIocmVmbGVjdGlvbkhvc3QsIHJlZmVyZW5jZXNSZWdpc3RyeSk7XG4gICAgY29uc3QgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzID0gbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyICYmXG4gICAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplci5hbmFseXplUHJvZ3JhbShidW5kbGUuc3JjLnByb2dyYW0pO1xuXG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyID1cbiAgICAgICAgbmV3IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplcihyZWZsZWN0aW9uSG9zdCwgcmVmZXJlbmNlc1JlZ2lzdHJ5KTtcbiAgICBjb25zdCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMgPVxuICAgICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcblxuICAgIHJldHVybiB7ZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfTtcbiAgfVxufVxuXG5cbmludGVyZmFjZSBQcm9ncmFtQW5hbHlzZXMge1xuICBkZWNvcmF0aW9uQW5hbHlzZXM6IE1hcDx0cy5Tb3VyY2VGaWxlLCBDb21waWxlZEZpbGU+O1xuICBzd2l0Y2hNYXJrZXJBbmFseXNlczogU3dpdGNoTWFya2VyQW5hbHlzZXM7XG4gIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogRXhwb3J0SW5mb1tdO1xuICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xudWxsO1xufVxuIl19