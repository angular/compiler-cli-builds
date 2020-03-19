(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/transformer", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", "@angular/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer", "@angular/compiler-cli/ngcc/src/analysis/ngcc_references_registry", "@angular/compiler-cli/ngcc/src/analysis/private_declarations_analyzer", "@angular/compiler-cli/ngcc/src/analysis/switch_marker_analyzer", "@angular/compiler-cli/ngcc/src/host/commonjs_host", "@angular/compiler-cli/ngcc/src/host/delegating_host", "@angular/compiler-cli/ngcc/src/host/esm2015_host", "@angular/compiler-cli/ngcc/src/host/esm5_host", "@angular/compiler-cli/ngcc/src/host/umd_host", "@angular/compiler-cli/ngcc/src/rendering/commonjs_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/dts_renderer", "@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/esm_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/renderer", "@angular/compiler-cli/ngcc/src/rendering/umd_rendering_formatter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var decoration_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer");
    var module_with_providers_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer");
    var ngcc_references_registry_1 = require("@angular/compiler-cli/ngcc/src/analysis/ngcc_references_registry");
    var private_declarations_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/private_declarations_analyzer");
    var switch_marker_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/switch_marker_analyzer");
    var commonjs_host_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_host");
    var delegating_host_1 = require("@angular/compiler-cli/ngcc/src/host/delegating_host");
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
            var ngccReflectionHost = this.getHost(bundle);
            var tsReflectionHost = new reflection_1.TypeScriptReflectionHost(bundle.src.program.getTypeChecker());
            var reflectionHost = new delegating_host_1.DelegatingReflectionHost(tsReflectionHost, ngccReflectionHost);
            // Parse and analyze the files.
            var _a = this.analyzeProgram(reflectionHost, bundle), decorationAnalyses = _a.decorationAnalyses, switchMarkerAnalyses = _a.switchMarkerAnalyses, privateDeclarationsAnalyses = _a.privateDeclarationsAnalyses, moduleWithProvidersAnalyses = _a.moduleWithProvidersAnalyses, diagnostics = _a.diagnostics;
            // Bail if the analysis produced any errors.
            if (hasErrors(diagnostics)) {
                return { success: false, diagnostics: diagnostics };
            }
            // Transform the source files and source maps.
            var srcFormatter = this.getRenderingFormatter(ngccReflectionHost, bundle);
            var renderer = new renderer_1.Renderer(reflectionHost, srcFormatter, this.fs, this.logger, bundle);
            var renderedFiles = renderer.renderProgram(decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses);
            if (bundle.dts) {
                var dtsFormatter = new esm_rendering_formatter_1.EsmRenderingFormatter(reflectionHost, bundle.isCore);
                var dtsRenderer = new dts_renderer_1.DtsRenderer(dtsFormatter, this.fs, this.logger, reflectionHost, bundle);
                var renderedDtsFiles = dtsRenderer.renderProgram(decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses);
                renderedFiles = renderedFiles.concat(renderedDtsFiles);
            }
            return { success: true, diagnostics: diagnostics, transformedFiles: renderedFiles };
        };
        Transformer.prototype.getHost = function (bundle) {
            switch (bundle.format) {
                case 'esm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
                case 'esm5':
                    return new esm5_host_1.Esm5ReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
                case 'umd':
                    return new umd_host_1.UmdReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
                case 'commonjs':
                    return new commonjs_host_1.CommonJsReflectionHost(this.logger, bundle.isCore, bundle.src, bundle.dts);
                default:
                    throw new Error("Reflection host for \"" + bundle.format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.getRenderingFormatter = function (host, bundle) {
            switch (bundle.format) {
                case 'esm2015':
                    return new esm_rendering_formatter_1.EsmRenderingFormatter(host, bundle.isCore);
                case 'esm5':
                    return new esm5_rendering_formatter_1.Esm5RenderingFormatter(host, bundle.isCore);
                case 'umd':
                    if (!(host instanceof umd_host_1.UmdReflectionHost)) {
                        throw new Error('UmdRenderer requires a UmdReflectionHost');
                    }
                    return new umd_rendering_formatter_1.UmdRenderingFormatter(host, bundle.isCore);
                case 'commonjs':
                    return new commonjs_rendering_formatter_1.CommonJsRenderingFormatter(host, bundle.isCore);
                default:
                    throw new Error("Renderer for \"" + bundle.format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.analyzeProgram = function (reflectionHost, bundle) {
            var referencesRegistry = new ngcc_references_registry_1.NgccReferencesRegistry(reflectionHost);
            var switchMarkerAnalyzer = new switch_marker_analyzer_1.SwitchMarkerAnalyzer(reflectionHost, bundle.entryPoint.package);
            var switchMarkerAnalyses = switchMarkerAnalyzer.analyzeProgram(bundle.src.program);
            var diagnostics = [];
            var decorationAnalyzer = new decoration_analyzer_1.DecorationAnalyzer(this.fs, bundle, reflectionHost, referencesRegistry, function (diagnostic) { return diagnostics.push(diagnostic); });
            var decorationAnalyses = decorationAnalyzer.analyzeProgram();
            var moduleWithProvidersAnalyzer = new module_with_providers_analyzer_1.ModuleWithProvidersAnalyzer(reflectionHost, referencesRegistry, bundle.dts !== null);
            var moduleWithProvidersAnalyses = moduleWithProvidersAnalyzer &&
                moduleWithProvidersAnalyzer.analyzeProgram(bundle.src.program);
            var privateDeclarationsAnalyzer = new private_declarations_analyzer_1.PrivateDeclarationsAnalyzer(reflectionHost, referencesRegistry);
            var privateDeclarationsAnalyses = privateDeclarationsAnalyzer.analyzeProgram(bundle.src.program);
            return { decorationAnalyses: decorationAnalyses, switchMarkerAnalyses: switchMarkerAnalyses, privateDeclarationsAnalyses: privateDeclarationsAnalyses,
                moduleWithProvidersAnalyses: moduleWithProvidersAnalyses, diagnostics: diagnostics };
        };
        return Transformer;
    }());
    exports.Transformer = Transformer;
    function hasErrors(diagnostics) {
        return diagnostics.some(function (d) { return d.category === ts.DiagnosticCategory.Error; });
    }
    exports.hasErrors = hasErrors;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFHakMseUVBQXVFO0lBQ3ZFLG1HQUFtRTtJQUNuRSx5SEFBb0g7SUFDcEgsNkdBQTRFO0lBQzVFLHVIQUFrRztJQUNsRyx5R0FBOEY7SUFFOUYsbUZBQTZEO0lBQzdELHVGQUFpRTtJQUNqRSxpRkFBMkQ7SUFDM0QsMkVBQXFEO0lBRXJELHlFQUFtRDtJQUVuRCxzSEFBcUY7SUFDckYsc0ZBQXNEO0lBQ3RELDhHQUE2RTtJQUM3RSw0R0FBMkU7SUFDM0UsOEVBQStDO0lBRS9DLDRHQUEyRTtJQWEzRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FvQkc7SUFDSDtRQUNFLHFCQUFvQixFQUFjLEVBQVUsTUFBYztZQUF0QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFHLENBQUM7UUFFOUQ7Ozs7V0FJRztRQUNILCtCQUFTLEdBQVQsVUFBVSxNQUF3QjtZQUNoQyxJQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDaEQsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLHFDQUF3QixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDM0YsSUFBTSxjQUFjLEdBQUcsSUFBSSwwQ0FBd0IsQ0FBQyxnQkFBZ0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBRTFGLCtCQUErQjtZQUN6QixJQUFBLGdEQUN3RixFQUR2RiwwQ0FBa0IsRUFBRSw4Q0FBb0IsRUFBRSw0REFBMkIsRUFDckUsNERBQTJCLEVBQUUsNEJBQTBE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RixJQUFNLDJCQUEyQixHQUFHLDJCQUEyQjtnQkFDM0QsMkJBQTJCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFbkUsSUFBTSwyQkFBMkIsR0FDN0IsSUFBSSwyREFBMkIsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUN4RSxJQUFNLDJCQUEyQixHQUM3QiwyQkFBMkIsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVuRSxPQUFPLEVBQUMsa0JBQWtCLG9CQUFBLEVBQUUsb0JBQW9CLHNCQUFBLEVBQUUsMkJBQTJCLDZCQUFBO2dCQUNyRSwyQkFBMkIsNkJBQUEsRUFBRSxXQUFXLGFBQUEsRUFBQyxDQUFDO1FBQ3BELENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUFwR0QsSUFvR0M7SUFwR1ksa0NBQVc7SUFzR3hCLFNBQWdCLFNBQVMsQ0FBQyxXQUE0QjtRQUNwRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsUUFBUSxLQUFLLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQTFDLENBQTBDLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRkQsOEJBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7RGVjb3JhdGlvbkFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLCBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplcic7XG5pbXBvcnQge05nY2NSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4uL2FuYWx5c2lzL25nY2NfcmVmZXJlbmNlc19yZWdpc3RyeSc7XG5pbXBvcnQge0V4cG9ydEluZm8sIFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtTd2l0Y2hNYXJrZXJBbmFseXNlcywgU3dpdGNoTWFya2VyQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtDb21waWxlZEZpbGV9IGZyb20gJy4uL2FuYWx5c2lzL3R5cGVzJztcbmltcG9ydCB7Q29tbW9uSnNSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9jb21tb25qc19ob3N0JztcbmltcG9ydCB7RGVsZWdhdGluZ1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2RlbGVnYXRpbmdfaG9zdCc7XG5pbXBvcnQge0VzbTIwMTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc20yMDE1X2hvc3QnO1xuaW1wb3J0IHtFc201UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtNV9ob3N0JztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge1VtZFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L3VtZF9ob3N0JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0NvbW1vbkpzUmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvY29tbW9uanNfcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge0R0c1JlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZHRzX3JlbmRlcmVyJztcbmltcG9ydCB7RXNtNVJlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbTVfcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge0VzbVJlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbV9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7UmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9yZW5kZXJlcic7XG5pbXBvcnQge1JlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtVbWRSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy91bWRfcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge0ZpbGVUb1dyaXRlfSBmcm9tICcuLi9yZW5kZXJpbmcvdXRpbHMnO1xuXG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4vZW50cnlfcG9pbnRfYnVuZGxlJztcblxuZXhwb3J0IHR5cGUgVHJhbnNmb3JtUmVzdWx0ID0ge1xuICBzdWNjZXNzOiB0cnVlOyBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdOyB0cmFuc2Zvcm1lZEZpbGVzOiBGaWxlVG9Xcml0ZVtdO1xufSB8XG57XG4gIHN1Y2Nlc3M6IGZhbHNlO1xuICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdO1xufTtcblxuLyoqXG4gKiBBIFBhY2thZ2UgaXMgc3RvcmVkIGluIGEgZGlyZWN0b3J5IG9uIGRpc2sgYW5kIHRoYXQgZGlyZWN0b3J5IGNhbiBjb250YWluIG9uZSBvciBtb3JlIHBhY2thZ2VcbiAqIGZvcm1hdHMgLSBlLmcuIGZlc20yMDE1LCBVTUQsIGV0Yy4gQWRkaXRpb25hbGx5LCBlYWNoIHBhY2thZ2UgcHJvdmlkZXMgdHlwaW5ncyAoYC5kLnRzYCBmaWxlcykuXG4gKlxuICogRWFjaCBvZiB0aGVzZSBmb3JtYXRzIGV4cG9zZXMgb25lIG9yIG1vcmUgZW50cnkgcG9pbnRzLCB3aGljaCBhcmUgc291cmNlIGZpbGVzIHRoYXQgbmVlZCB0byBiZVxuICogcGFyc2VkIHRvIGlkZW50aWZ5IHRoZSBkZWNvcmF0ZWQgZXhwb3J0ZWQgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgYW5hbHl6ZWQgYW5kIGNvbXBpbGVkIGJ5IG9uZSBvclxuICogbW9yZSBgRGVjb3JhdG9ySGFuZGxlcmAgb2JqZWN0cy5cbiAqXG4gKiBFYWNoIGVudHJ5IHBvaW50IHRvIGEgcGFja2FnZSBpcyBpZGVudGlmaWVkIGJ5IGEgYHBhY2thZ2UuanNvbmAgd2hpY2ggY29udGFpbnMgcHJvcGVydGllcyB0aGF0XG4gKiBpbmRpY2F0ZSB3aGF0IGZvcm1hdHRlZCBidW5kbGVzIGFyZSBhY2Nlc3NpYmxlIHZpYSB0aGlzIGVuZC1wb2ludC5cbiAqXG4gKiBFYWNoIGJ1bmRsZSBpcyBpZGVudGlmaWVkIGJ5IGEgcm9vdCBgU291cmNlRmlsZWAgdGhhdCBjYW4gYmUgcGFyc2VkIGFuZCBhbmFseXplZCB0b1xuICogaWRlbnRpZnkgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQ7IGFuZCB0aGVuIGZpbmFsbHkgcmVuZGVyZWQgYW5kIHdyaXR0ZW4gdG8gZGlzay5cbiAqXG4gKiBBbG9uZyB3aXRoIHRoZSBzb3VyY2UgZmlsZXMsIHRoZSBjb3JyZXNwb25kaW5nIHNvdXJjZSBtYXBzIChlaXRoZXIgaW5saW5lIG9yIGV4dGVybmFsKSBhbmRcbiAqIGAuZC50c2AgZmlsZXMgYXJlIHRyYW5zZm9ybWVkIGFjY29yZGluZ2x5LlxuICpcbiAqIC0gRmxhdCBmaWxlIHBhY2thZ2VzIGhhdmUgYWxsIHRoZSBjbGFzc2VzIGluIGEgc2luZ2xlIGZpbGUuXG4gKiAtIE90aGVyIHBhY2thZ2VzIG1heSByZS1leHBvcnQgY2xhc3NlcyBmcm9tIG90aGVyIG5vbi1lbnRyeSBwb2ludCBmaWxlcy5cbiAqIC0gU29tZSBmb3JtYXRzIG1heSBjb250YWluIG11bHRpcGxlIFwibW9kdWxlc1wiIGluIGEgc2luZ2xlIGZpbGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFuc2Zvcm1lciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIpIHt9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSB0aGUgc291cmNlIChhbmQgdHlwaW5ncykgZmlsZXMgb2YgYSBidW5kbGUuXG4gICAqIEBwYXJhbSBidW5kbGUgdGhlIGJ1bmRsZSB0byB0cmFuc2Zvcm0uXG4gICAqIEByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IHRoZSBmaWxlcyB0aGF0IHdlcmUgdHJhbnNmb3JtZWQuXG4gICAqL1xuICB0cmFuc2Zvcm0oYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogVHJhbnNmb3JtUmVzdWx0IHtcbiAgICBjb25zdCBuZ2NjUmVmbGVjdGlvbkhvc3QgPSB0aGlzLmdldEhvc3QoYnVuZGxlKTtcbiAgICBjb25zdCB0c1JlZmxlY3Rpb25Ib3N0ID0gbmV3IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdChidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgY29uc3QgcmVmbGVjdGlvbkhvc3QgPSBuZXcgRGVsZWdhdGluZ1JlZmxlY3Rpb25Ib3N0KHRzUmVmbGVjdGlvbkhvc3QsIG5nY2NSZWZsZWN0aW9uSG9zdCk7XG5cbiAgICAvLyBQYXJzZSBhbmQgYW5hbHl6ZSB0aGUgZmlsZXMuXG4gICAgY29uc3Qge2RlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLCBkaWFnbm9zdGljc30gPSB0aGlzLmFuYWx5emVQcm9ncmFtKHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUpO1xuXG4gICAgLy8gQmFpbCBpZiB0aGUgYW5hbHlzaXMgcHJvZHVjZWQgYW55IGVycm9ycy5cbiAgICBpZiAoaGFzRXJyb3JzKGRpYWdub3N0aWNzKSkge1xuICAgICAgcmV0dXJuIHtzdWNjZXNzOiBmYWxzZSwgZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICBjb25zdCBzcmNGb3JtYXR0ZXIgPSB0aGlzLmdldFJlbmRlcmluZ0Zvcm1hdHRlcihuZ2NjUmVmbGVjdGlvbkhvc3QsIGJ1bmRsZSk7XG5cbiAgICBjb25zdCByZW5kZXJlciA9IG5ldyBSZW5kZXJlcihyZWZsZWN0aW9uSG9zdCwgc3JjRm9ybWF0dGVyLCB0aGlzLmZzLCB0aGlzLmxvZ2dlciwgYnVuZGxlKTtcbiAgICBsZXQgcmVuZGVyZWRGaWxlcyA9IHJlbmRlcmVyLnJlbmRlclByb2dyYW0oXG4gICAgICAgIGRlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk7XG5cbiAgICBpZiAoYnVuZGxlLmR0cykge1xuICAgICAgY29uc3QgZHRzRm9ybWF0dGVyID0gbmV3IEVzbVJlbmRlcmluZ0Zvcm1hdHRlcihyZWZsZWN0aW9uSG9zdCwgYnVuZGxlLmlzQ29yZSk7XG4gICAgICBjb25zdCBkdHNSZW5kZXJlciA9XG4gICAgICAgICAgbmV3IER0c1JlbmRlcmVyKGR0c0Zvcm1hdHRlciwgdGhpcy5mcywgdGhpcy5sb2dnZXIsIHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUpO1xuICAgICAgY29uc3QgcmVuZGVyZWREdHNGaWxlcyA9IGR0c1JlbmRlcmVyLnJlbmRlclByb2dyYW0oXG4gICAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyk7XG4gICAgICByZW5kZXJlZEZpbGVzID0gcmVuZGVyZWRGaWxlcy5jb25jYXQocmVuZGVyZWREdHNGaWxlcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtzdWNjZXNzOiB0cnVlLCBkaWFnbm9zdGljcywgdHJhbnNmb3JtZWRGaWxlczogcmVuZGVyZWRGaWxlc307XG4gIH1cblxuICBnZXRIb3N0KGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgc3dpdGNoIChidW5kbGUuZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc20yMDE1UmVmbGVjdGlvbkhvc3QodGhpcy5sb2dnZXIsIGJ1bmRsZS5pc0NvcmUsIGJ1bmRsZS5zcmMsIGJ1bmRsZS5kdHMpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBidW5kbGUuaXNDb3JlLCBidW5kbGUuc3JjLCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ3VtZCc6XG4gICAgICAgIHJldHVybiBuZXcgVW1kUmVmbGVjdGlvbkhvc3QodGhpcy5sb2dnZXIsIGJ1bmRsZS5pc0NvcmUsIGJ1bmRsZS5zcmMsIGJ1bmRsZS5kdHMpO1xuICAgICAgY2FzZSAnY29tbW9uanMnOlxuICAgICAgICByZXR1cm4gbmV3IENvbW1vbkpzUmVmbGVjdGlvbkhvc3QodGhpcy5sb2dnZXIsIGJ1bmRsZS5pc0NvcmUsIGJ1bmRsZS5zcmMsIGJ1bmRsZS5kdHMpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWZsZWN0aW9uIGhvc3QgZm9yIFwiJHtidW5kbGUuZm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVuZGVyaW5nRm9ybWF0dGVyKGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogUmVuZGVyaW5nRm9ybWF0dGVyIHtcbiAgICBzd2l0Y2ggKGJ1bmRsZS5mb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbVJlbmRlcmluZ0Zvcm1hdHRlcihob3N0LCBidW5kbGUuaXNDb3JlKTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdCwgYnVuZGxlLmlzQ29yZSk7XG4gICAgICBjYXNlICd1bWQnOlxuICAgICAgICBpZiAoIShob3N0IGluc3RhbmNlb2YgVW1kUmVmbGVjdGlvbkhvc3QpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbWRSZW5kZXJlciByZXF1aXJlcyBhIFVtZFJlZmxlY3Rpb25Ib3N0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBVbWRSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdCwgYnVuZGxlLmlzQ29yZSk7XG4gICAgICBjYXNlICdjb21tb25qcyc6XG4gICAgICAgIHJldHVybiBuZXcgQ29tbW9uSnNSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdCwgYnVuZGxlLmlzQ29yZSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbmRlcmVyIGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emVQcm9ncmFtKHJlZmxlY3Rpb25Ib3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IFByb2dyYW1BbmFseXNlcyB7XG4gICAgY29uc3QgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IE5nY2NSZWZlcmVuY2VzUmVnaXN0cnkocmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHl6ZXIgPVxuICAgICAgICBuZXcgU3dpdGNoTWFya2VyQW5hbHl6ZXIocmVmbGVjdGlvbkhvc3QsIGJ1bmRsZS5lbnRyeVBvaW50LnBhY2thZ2UpO1xuICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5c2VzID0gc3dpdGNoTWFya2VyQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHl6ZXIgPSBuZXcgRGVjb3JhdGlvbkFuYWx5emVyKFxuICAgICAgICB0aGlzLmZzLCBidW5kbGUsIHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnksXG4gICAgICAgIGRpYWdub3N0aWMgPT4gZGlhZ25vc3RpY3MucHVzaChkaWFnbm9zdGljKSk7XG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5c2VzID0gZGVjb3JhdGlvbkFuYWx5emVyLmFuYWx5emVQcm9ncmFtKCk7XG5cbiAgICBjb25zdCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIgPVxuICAgICAgICBuZXcgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyKHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnksIGJ1bmRsZS5kdHMgIT09IG51bGwpO1xuICAgIGNvbnN0IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciAmJlxuICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcblxuICAgIGNvbnN0IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplciA9XG4gICAgICAgIG5ldyBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIocmVmbGVjdGlvbkhvc3QsIHJlZmVyZW5jZXNSZWdpc3RyeSk7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzID1cbiAgICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICByZXR1cm4ge2RlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgICAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcywgZGlhZ25vc3RpY3N9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNFcnJvcnMoZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSkge1xuICByZXR1cm4gZGlhZ25vc3RpY3Muc29tZShkID0+IGQuY2F0ZWdvcnkgPT09IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcik7XG59XG5cbmludGVyZmFjZSBQcm9ncmFtQW5hbHlzZXMge1xuICBkZWNvcmF0aW9uQW5hbHlzZXM6IE1hcDx0cy5Tb3VyY2VGaWxlLCBDb21waWxlZEZpbGU+O1xuICBzd2l0Y2hNYXJrZXJBbmFseXNlczogU3dpdGNoTWFya2VyQW5hbHlzZXM7XG4gIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogRXhwb3J0SW5mb1tdO1xuICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xudWxsO1xuICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdO1xufVxuIl19