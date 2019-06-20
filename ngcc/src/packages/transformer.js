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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFTQSxtR0FBaUY7SUFDakYseUhBQW9IO0lBQ3BILDZHQUE0RTtJQUM1RSx1SEFBa0c7SUFDbEcseUdBQThGO0lBRTlGLG1GQUE2RDtJQUM3RCxpRkFBMkQ7SUFDM0QsMkVBQXFEO0lBRXJELHlFQUFtRDtJQUVuRCxzSEFBcUY7SUFDckYsc0ZBQXNEO0lBQ3RELDhHQUE2RTtJQUM3RSw0R0FBMkU7SUFDM0UsOEVBQStDO0lBRS9DLDRHQUEyRTtJQU8zRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FvQkc7SUFDSDtRQUNFLHFCQUFvQixFQUFjLEVBQVUsTUFBYztZQUF0QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFHLENBQUM7UUFFOUQ7Ozs7V0FJRztRQUNILCtCQUFTLEdBQVQsVUFBVSxNQUF3QjtZQUNoQyxJQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXBELCtCQUErQjtZQUN6QixJQUFBLHdEQUNtRixFQURsRiwwQ0FBa0IsRUFBRSw4Q0FBb0IsRUFBRSw0REFBMkIsRUFDckUsNERBQWtGLENBQUM7WUFFMUYsOENBQThDO1lBQzlDLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRWhGLElBQU0sUUFBUSxHQUNWLElBQUksbUJBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMs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QUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFbkUsT0FBTyxFQUFDLGtCQUFrQixvQkFBQSxFQUFFLG9CQUFvQixzQkFBQSxFQUFFLDJCQUEyQiw2QkFBQTtnQkFDckUsMkJBQTJCLDZCQUFBLEVBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0gsa0JBQUM7SUFBRCxDQUFDLEFBbkdELElBbUdDO0lBbkdZLGtDQUFXIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29tcGlsZWRGaWxlLCBEZWNvcmF0aW9uQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL2RlY29yYXRpb25fYW5hbHl6ZXInO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMsIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7TmdjY1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vYW5hbHlzaXMvbmdjY19yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7RXhwb3J0SW5mbywgUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge1N3aXRjaE1hcmtlckFuYWx5c2VzLCBTd2l0Y2hNYXJrZXJBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvc3dpdGNoX21hcmtlcl9hbmFseXplcic7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q29tbW9uSnNSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9jb21tb25qc19ob3N0JztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7VW1kUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7Q29tbW9uSnNSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9jb21tb25qc19yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7RHRzUmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9kdHNfcmVuZGVyZXInO1xuaW1wb3J0IHtFc201UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtNV9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7RXNtUmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcbmltcG9ydCB7UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge1VtZFJlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3VtZF9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7RmlsZVRvV3JpdGV9IGZyb20gJy4uL3JlbmRlcmluZy91dGlscyc7XG5cbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9lbnRyeV9wb2ludF9idW5kbGUnO1xuXG5cblxuLyoqXG4gKiBBIFBhY2thZ2UgaXMgc3RvcmVkIGluIGEgZGlyZWN0b3J5IG9uIGRpc2sgYW5kIHRoYXQgZGlyZWN0b3J5IGNhbiBjb250YWluIG9uZSBvciBtb3JlIHBhY2thZ2VcbiAqIGZvcm1hdHMgLSBlLmcuIGZlc20yMDE1LCBVTUQsIGV0Yy4gQWRkaXRpb25hbGx5LCBlYWNoIHBhY2thZ2UgcHJvdmlkZXMgdHlwaW5ncyAoYC5kLnRzYCBmaWxlcykuXG4gKlxuICogRWFjaCBvZiB0aGVzZSBmb3JtYXRzIGV4cG9zZXMgb25lIG9yIG1vcmUgZW50cnkgcG9pbnRzLCB3aGljaCBhcmUgc291cmNlIGZpbGVzIHRoYXQgbmVlZCB0byBiZVxuICogcGFyc2VkIHRvIGlkZW50aWZ5IHRoZSBkZWNvcmF0ZWQgZXhwb3J0ZWQgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgYW5hbHl6ZWQgYW5kIGNvbXBpbGVkIGJ5IG9uZSBvclxuICogbW9yZSBgRGVjb3JhdG9ySGFuZGxlcmAgb2JqZWN0cy5cbiAqXG4gKiBFYWNoIGVudHJ5IHBvaW50IHRvIGEgcGFja2FnZSBpcyBpZGVudGlmaWVkIGJ5IGEgYHBhY2thZ2UuanNvbmAgd2hpY2ggY29udGFpbnMgcHJvcGVydGllcyB0aGF0XG4gKiBpbmRpY2F0ZSB3aGF0IGZvcm1hdHRlZCBidW5kbGVzIGFyZSBhY2Nlc3NpYmxlIHZpYSB0aGlzIGVuZC1wb2ludC5cbiAqXG4gKiBFYWNoIGJ1bmRsZSBpcyBpZGVudGlmaWVkIGJ5IGEgcm9vdCBgU291cmNlRmlsZWAgdGhhdCBjYW4gYmUgcGFyc2VkIGFuZCBhbmFseXplZCB0b1xuICogaWRlbnRpZnkgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQ7IGFuZCB0aGVuIGZpbmFsbHkgcmVuZGVyZWQgYW5kIHdyaXR0ZW4gdG8gZGlzay5cbiAqXG4gKiBBbG9uZyB3aXRoIHRoZSBzb3VyY2UgZmlsZXMsIHRoZSBjb3JyZXNwb25kaW5nIHNvdXJjZSBtYXBzIChlaXRoZXIgaW5saW5lIG9yIGV4dGVybmFsKSBhbmRcbiAqIGAuZC50c2AgZmlsZXMgYXJlIHRyYW5zZm9ybWVkIGFjY29yZGluZ2x5LlxuICpcbiAqIC0gRmxhdCBmaWxlIHBhY2thZ2VzIGhhdmUgYWxsIHRoZSBjbGFzc2VzIGluIGEgc2luZ2xlIGZpbGUuXG4gKiAtIE90aGVyIHBhY2thZ2VzIG1heSByZS1leHBvcnQgY2xhc3NlcyBmcm9tIG90aGVyIG5vbi1lbnRyeSBwb2ludCBmaWxlcy5cbiAqIC0gU29tZSBmb3JtYXRzIG1heSBjb250YWluIG11bHRpcGxlIFwibW9kdWxlc1wiIGluIGEgc2luZ2xlIGZpbGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFuc2Zvcm1lciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIpIHt9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSB0aGUgc291cmNlIChhbmQgdHlwaW5ncykgZmlsZXMgb2YgYSBidW5kbGUuXG4gICAqIEBwYXJhbSBidW5kbGUgdGhlIGJ1bmRsZSB0byB0cmFuc2Zvcm0uXG4gICAqIEByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IHRoZSBmaWxlcyB0aGF0IHdlcmUgdHJhbnNmb3JtZWQuXG4gICAqL1xuICB0cmFuc2Zvcm0oYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogRmlsZVRvV3JpdGVbXSB7XG4gICAgY29uc3QgaXNDb3JlID0gYnVuZGxlLmlzQ29yZTtcbiAgICBjb25zdCByZWZsZWN0aW9uSG9zdCA9IHRoaXMuZ2V0SG9zdChpc0NvcmUsIGJ1bmRsZSk7XG5cbiAgICAvLyBQYXJzZSBhbmQgYW5hbHl6ZSB0aGUgZmlsZXMuXG4gICAgY29uc3Qge2RlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfSA9IHRoaXMuYW5hbHl6ZVByb2dyYW0ocmVmbGVjdGlvbkhvc3QsIGlzQ29yZSwgYnVuZGxlKTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICBjb25zdCBzcmNGb3JtYXR0ZXIgPSB0aGlzLmdldFJlbmRlcmluZ0Zvcm1hdHRlcihyZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuXG4gICAgY29uc3QgcmVuZGVyZXIgPVxuICAgICAgICBuZXcgUmVuZGVyZXIoc3JjRm9ybWF0dGVyLCB0aGlzLmZzLCB0aGlzLmxvZ2dlciwgcmVmbGVjdGlvbkhvc3QsIGlzQ29yZSwgYnVuZGxlKTtcbiAgICBsZXQgcmVuZGVyZWRGaWxlcyA9IHJlbmRlcmVyLnJlbmRlclByb2dyYW0oXG4gICAgICAgIGRlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk7XG5cbiAgICBpZiAoYnVuZGxlLmR0cykge1xuICAgICAgY29uc3QgZHRzRm9ybWF0dGVyID0gbmV3IEVzbVJlbmRlcmluZ0Zvcm1hdHRlcihyZWZsZWN0aW9uSG9zdCwgaXNDb3JlKTtcbiAgICAgIGNvbnN0IGR0c1JlbmRlcmVyID1cbiAgICAgICAgICBuZXcgRHRzUmVuZGVyZXIoZHRzRm9ybWF0dGVyLCB0aGlzLmZzLCB0aGlzLmxvZ2dlciwgcmVmbGVjdGlvbkhvc3QsIGlzQ29yZSwgYnVuZGxlKTtcbiAgICAgIGNvbnN0IHJlbmRlcmVkRHRzRmlsZXMgPSBkdHNSZW5kZXJlci5yZW5kZXJQcm9ncmFtKFxuICAgICAgICAgIGRlY29yYXRpb25BbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMpO1xuICAgICAgcmVuZGVyZWRGaWxlcyA9IHJlbmRlcmVkRmlsZXMuY29uY2F0KHJlbmRlcmVkRHRzRmlsZXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJlZEZpbGVzO1xuICB9XG5cbiAgZ2V0SG9zdChpc0NvcmU6IGJvb2xlYW4sIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBzd2l0Y2ggKGJ1bmRsZS5mb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZWZsZWN0aW9uSG9zdCh0aGlzLmxvZ2dlciwgaXNDb3JlLCB0eXBlQ2hlY2tlciwgYnVuZGxlLmR0cyk7XG4gICAgICBjYXNlICdlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVmbGVjdGlvbkhvc3QodGhpcy5sb2dnZXIsIGlzQ29yZSwgdHlwZUNoZWNrZXIsIGJ1bmRsZS5kdHMpO1xuICAgICAgY2FzZSAndW1kJzpcbiAgICAgICAgcmV0dXJuIG5ldyBVbWRSZWZsZWN0aW9uSG9zdChcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLCBpc0NvcmUsIGJ1bmRsZS5zcmMucHJvZ3JhbSwgYnVuZGxlLnNyYy5ob3N0LCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ2NvbW1vbmpzJzpcbiAgICAgICAgcmV0dXJuIG5ldyBDb21tb25Kc1JlZmxlY3Rpb25Ib3N0KFxuICAgICAgICAgICAgdGhpcy5sb2dnZXIsIGlzQ29yZSwgYnVuZGxlLnNyYy5wcm9ncmFtLCBidW5kbGUuc3JjLmhvc3QsIGJ1bmRsZS5kdHMpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWZsZWN0aW9uIGhvc3QgZm9yIFwiJHtidW5kbGUuZm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVuZGVyaW5nRm9ybWF0dGVyKGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOlxuICAgICAgUmVuZGVyaW5nRm9ybWF0dGVyIHtcbiAgICBzd2l0Y2ggKGJ1bmRsZS5mb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbVJlbmRlcmluZ0Zvcm1hdHRlcihob3N0LCBpc0NvcmUpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmluZ0Zvcm1hdHRlcihob3N0LCBpc0NvcmUpO1xuICAgICAgY2FzZSAndW1kJzpcbiAgICAgICAgaWYgKCEoaG9zdCBpbnN0YW5jZW9mIFVtZFJlZmxlY3Rpb25Ib3N0KSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW1kUmVuZGVyZXIgcmVxdWlyZXMgYSBVbWRSZWZsZWN0aW9uSG9zdCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgVW1kUmVuZGVyaW5nRm9ybWF0dGVyKGhvc3QsIGlzQ29yZSk7XG4gICAgICBjYXNlICdjb21tb25qcyc6XG4gICAgICAgIHJldHVybiBuZXcgQ29tbW9uSnNSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdCwgaXNDb3JlKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVuZGVyZXIgZm9yIFwiJHtidW5kbGUuZm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZVByb2dyYW0ocmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOlxuICAgICAgUHJvZ3JhbUFuYWx5c2VzIHtcbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IGJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOZ2NjUmVmZXJlbmNlc1JlZ2lzdHJ5KHJlZmxlY3Rpb25Ib3N0KTtcblxuICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5emVyID0gbmV3IFN3aXRjaE1hcmtlckFuYWx5emVyKHJlZmxlY3Rpb25Ib3N0KTtcbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNlcyA9IHN3aXRjaE1hcmtlckFuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHl6ZXIgPSBuZXcgRGVjb3JhdGlvbkFuYWx5emVyKFxuICAgICAgICB0aGlzLmZzLCBidW5kbGUuc3JjLnByb2dyYW0sIGJ1bmRsZS5zcmMub3B0aW9ucywgYnVuZGxlLnNyYy5ob3N0LCB0eXBlQ2hlY2tlcixcbiAgICAgICAgcmVmbGVjdGlvbkhvc3QsIHJlZmVyZW5jZXNSZWdpc3RyeSwgYnVuZGxlLnJvb3REaXJzLCBpc0NvcmUpO1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXNlcyA9IGRlY29yYXRpb25BbmFseXplci5hbmFseXplUHJvZ3JhbSgpO1xuXG4gICAgY29uc3QgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyID1cbiAgICAgICAgYnVuZGxlLmR0cyAmJiBuZXcgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyKHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnkpO1xuICAgIGNvbnN0IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciAmJlxuICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcblxuICAgIGNvbnN0IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplciA9XG4gICAgICAgIG5ldyBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIocmVmbGVjdGlvbkhvc3QsIHJlZmVyZW5jZXNSZWdpc3RyeSk7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzID1cbiAgICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICByZXR1cm4ge2RlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgICAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc307XG4gIH1cbn1cblxuXG5pbnRlcmZhY2UgUHJvZ3JhbUFuYWx5c2VzIHtcbiAgZGVjb3JhdGlvbkFuYWx5c2VzOiBNYXA8dHMuU291cmNlRmlsZSwgQ29tcGlsZWRGaWxlPjtcbiAgc3dpdGNoTWFya2VyQW5hbHlzZXM6IFN3aXRjaE1hcmtlckFuYWx5c2VzO1xuICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IEV4cG9ydEluZm9bXTtcbiAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8bnVsbDtcbn1cbiJdfQ==