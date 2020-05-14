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
    exports.hasErrors = exports.Transformer = void 0;
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
        function Transformer(fs, logger, tsConfig) {
            if (tsConfig === void 0) { tsConfig = null; }
            this.fs = fs;
            this.logger = logger;
            this.tsConfig = tsConfig;
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
            var decorationAnalyzer = new decoration_analyzer_1.DecorationAnalyzer(this.fs, bundle, reflectionHost, referencesRegistry, function (diagnostic) { return diagnostics.push(diagnostic); }, this.tsConfig);
            var decorationAnalyses = decorationAnalyzer.analyzeProgram();
            var moduleWithProvidersAnalyzer = new module_with_providers_analyzer_1.ModuleWithProvidersAnalyzer(reflectionHost, bundle.src.program.getTypeChecker(), referencesRegistry, bundle.dts !== null);
            var moduleWithProvidersAnalyses = moduleWithProvidersAnalyzer &&
                moduleWithProvidersAnalyzer.analyzeProgram(bundle.src.program);
            var privateDeclarationsAnalyzer = new private_declarations_analyzer_1.PrivateDeclarationsAnalyzer(reflectionHost, referencesRegistry);
            var privateDeclarationsAnalyses = privateDeclarationsAnalyzer.analyzeProgram(bundle.src.program);
            return {
                decorationAnalyses: decorationAnalyses,
                switchMarkerAnalyses: switchMarkerAnalyses,
                privateDeclarationsAnalyses: privateDeclarationsAnalyses,
                moduleWithProvidersAnalyses: moduleWithProvidersAnalyses,
                diagnostics: diagnostics
            };
        };
        return Transformer;
    }());
    exports.Transformer = Transformer;
    function hasErrors(diagnostics) {
        return diagnostics.some(function (d) { return d.category === ts.DiagnosticCategory.Error; });
    }
    exports.hasErrors = hasErrors;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBSWpDLHlFQUF1RTtJQUN2RSxtR0FBbUU7SUFDbkUseUhBQW9IO0lBQ3BILDZHQUE0RTtJQUM1RSx1SEFBa0c7SUFDbEcseUdBQThGO0lBRTlGLG1GQUE2RDtJQUM3RCx1RkFBaUU7SUFDakUsaUZBQTJEO0lBQzNELDJFQUFxRDtJQUVyRCx5RUFBbUQ7SUFFbkQsc0hBQXFGO0lBQ3JGLHNGQUFzRDtJQUN0RCw4R0FBNkU7SUFDN0UsNEdBQTJFO0lBQzNFLDhFQUErQztJQUUvQyw0R0FBMkU7SUFZM0U7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bb0JHO0lBQ0g7UUFDRSxxQkFDWSxFQUFjLEVBQVUsTUFBYyxFQUN0QyxRQUF5QztZQUF6Qyx5QkFBQSxFQUFBLGVBQXlDO1lBRHpDLE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ3RDLGFBQVEsR0FBUixRQUFRLENBQWlDO1FBQUcsQ0FBQztRQUV6RDs7OztXQUlHO1FBQ0gsK0JBQVMsR0FBVCxVQUFVLE1BQXdCO1lBQ2hDLElBQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoRCxJQUFNLGdCQUFnQixHQUFHLElBQUkscUNBQXdCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUMzRixJQUFNLGNBQWMsR0FBRyxJQUFJLDBDQUF3QixDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFFMUYsK0JBQStCO1lBQ3pCLElBQUEsS0FNRixJ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WUFDL0QsSUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUUvRCxJQUFNLDJCQUEyQixHQUFHLElBQUksNERBQTJCLENBQy9ELGNBQWMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxrQkFBa0IsRUFDdkUsTUFBTSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztZQUN6QixJQUFNLDJCQUEyQixHQUFHLDJCQUEyQjtnQkFDM0QsMkJBQTJCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFbkUsSUFBTSwyQkFBMkIsR0FDN0IsSUFBSSwyREFBMkIsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUN4RSxJQUFNLDJCQUEyQixHQUM3QiwyQkFBMkIsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVuRSxPQUFPO2dCQUNMLGtCQUFrQixvQkFBQTtnQkFDbEIsb0JBQW9CLHNCQUFBO2dCQUNwQiwyQkFBMkIsNkJBQUE7Z0JBQzNCLDJCQUEyQiw2QkFBQTtnQkFDM0IsV0FBVyxhQUFBO2FBQ1osQ0FBQztRQUNKLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUFqSEQsSUFpSEM7SUFqSFksa0NBQVc7SUFtSHhCLFNBQWdCLFNBQVMsQ0FBQyxXQUE0QjtRQUNwRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsUUFBUSxLQUFLLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQTFDLENBQTBDLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRkQsOEJBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtQYXJzZWRDb25maWd1cmF0aW9ufSBmcm9tICcuLi8uLi8uLic7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1R5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtEZWNvcmF0aW9uQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL2RlY29yYXRpb25fYW5hbHl6ZXInO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMsIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7TmdjY1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vYW5hbHlzaXMvbmdjY19yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7RXhwb3J0SW5mbywgUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge1N3aXRjaE1hcmtlckFuYWx5c2VzLCBTd2l0Y2hNYXJrZXJBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvc3dpdGNoX21hcmtlcl9hbmFseXplcic7XG5pbXBvcnQge0NvbXBpbGVkRmlsZX0gZnJvbSAnLi4vYW5hbHlzaXMvdHlwZXMnO1xuaW1wb3J0IHtDb21tb25Kc1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2NvbW1vbmpzX2hvc3QnO1xuaW1wb3J0IHtEZWxlZ2F0aW5nUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZGVsZWdhdGluZ19ob3N0JztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7VW1kUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7Q29tbW9uSnNSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9jb21tb25qc19yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7RHRzUmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9kdHNfcmVuZGVyZXInO1xuaW1wb3J0IHtFc201UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtNV9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7RXNtUmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcbmltcG9ydCB7UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge1VtZFJlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3VtZF9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7RmlsZVRvV3JpdGV9IGZyb20gJy4uL3JlbmRlcmluZy91dGlscyc7XG5cbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9lbnRyeV9wb2ludF9idW5kbGUnO1xuXG5leHBvcnQgdHlwZSBUcmFuc2Zvcm1SZXN1bHQgPSB7XG4gIHN1Y2Nlc3M6IHRydWU7IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW107IHRyYW5zZm9ybWVkRmlsZXM6IEZpbGVUb1dyaXRlW107XG59fHtcbiAgc3VjY2VzczogZmFsc2U7XG4gIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW107XG59O1xuXG4vKipcbiAqIEEgUGFja2FnZSBpcyBzdG9yZWQgaW4gYSBkaXJlY3Rvcnkgb24gZGlzayBhbmQgdGhhdCBkaXJlY3RvcnkgY2FuIGNvbnRhaW4gb25lIG9yIG1vcmUgcGFja2FnZVxuICogZm9ybWF0cyAtIGUuZy4gZmVzbTIwMTUsIFVNRCwgZXRjLiBBZGRpdGlvbmFsbHksIGVhY2ggcGFja2FnZSBwcm92aWRlcyB0eXBpbmdzIChgLmQudHNgIGZpbGVzKS5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgcGFja2FnZS5qc29uYCB3aGljaCBjb250YWlucyBwcm9wZXJ0aWVzIHRoYXRcbiAqIGluZGljYXRlIHdoYXQgZm9ybWF0dGVkIGJ1bmRsZXMgYXJlIGFjY2Vzc2libGUgdmlhIHRoaXMgZW5kLXBvaW50LlxuICpcbiAqIEVhY2ggYnVuZGxlIGlzIGlkZW50aWZpZWQgYnkgYSByb290IGBTb3VyY2VGaWxlYCB0aGF0IGNhbiBiZSBwYXJzZWQgYW5kIGFuYWx5emVkIHRvXG4gKiBpZGVudGlmeSBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZDsgYW5kIHRoZW4gZmluYWxseSByZW5kZXJlZCBhbmQgd3JpdHRlbiB0byBkaXNrLlxuICpcbiAqIEFsb25nIHdpdGggdGhlIHNvdXJjZSBmaWxlcywgdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIG1hcHMgKGVpdGhlciBpbmxpbmUgb3IgZXh0ZXJuYWwpIGFuZFxuICogYC5kLnRzYCBmaWxlcyBhcmUgdHJhbnNmb3JtZWQgYWNjb3JkaW5nbHkuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSB0c0NvbmZpZzogUGFyc2VkQ29uZmlndXJhdGlvbnxudWxsID0gbnVsbCkge31cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHRoZSBzb3VyY2UgKGFuZCB0eXBpbmdzKSBmaWxlcyBvZiBhIGJ1bmRsZS5cbiAgICogQHBhcmFtIGJ1bmRsZSB0aGUgYnVuZGxlIHRvIHRyYW5zZm9ybS5cbiAgICogQHJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGZpbGVzIHRoYXQgd2VyZSB0cmFuc2Zvcm1lZC5cbiAgICovXG4gIHRyYW5zZm9ybShidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBUcmFuc2Zvcm1SZXN1bHQge1xuICAgIGNvbnN0IG5nY2NSZWZsZWN0aW9uSG9zdCA9IHRoaXMuZ2V0SG9zdChidW5kbGUpO1xuICAgIGNvbnN0IHRzUmVmbGVjdGlvbkhvc3QgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KGJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpKTtcbiAgICBjb25zdCByZWZsZWN0aW9uSG9zdCA9IG5ldyBEZWxlZ2F0aW5nUmVmbGVjdGlvbkhvc3QodHNSZWZsZWN0aW9uSG9zdCwgbmdjY1JlZmxlY3Rpb25Ib3N0KTtcblxuICAgIC8vIFBhcnNlIGFuZCBhbmFseXplIHRoZSBmaWxlcy5cbiAgICBjb25zdCB7XG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXMsXG4gICAgICBzd2l0Y2hNYXJrZXJBbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyxcbiAgICAgIGRpYWdub3N0aWNzXG4gICAgfSA9IHRoaXMuYW5hbHl6ZVByb2dyYW0ocmVmbGVjdGlvbkhvc3QsIGJ1bmRsZSk7XG5cbiAgICAvLyBCYWlsIGlmIHRoZSBhbmFseXNpcyBwcm9kdWNlZCBhbnkgZXJyb3JzLlxuICAgIGlmIChoYXNFcnJvcnMoZGlhZ25vc3RpY3MpKSB7XG4gICAgICByZXR1cm4ge3N1Y2Nlc3M6IGZhbHNlLCBkaWFnbm9zdGljc307XG4gICAgfVxuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMgYW5kIHNvdXJjZSBtYXBzLlxuICAgIGNvbnN0IHNyY0Zvcm1hdHRlciA9IHRoaXMuZ2V0UmVuZGVyaW5nRm9ybWF0dGVyKG5nY2NSZWZsZWN0aW9uSG9zdCwgYnVuZGxlKTtcblxuICAgIGNvbnN0IHJlbmRlcmVyID0gbmV3IFJlbmRlcmVyKHJlZmxlY3Rpb25Ib3N0LCBzcmNGb3JtYXR0ZXIsIHRoaXMuZnMsIHRoaXMubG9nZ2VyLCBidW5kbGUpO1xuICAgIGxldCByZW5kZXJlZEZpbGVzID0gcmVuZGVyZXIucmVuZGVyUHJvZ3JhbShcbiAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTtcblxuICAgIGlmIChidW5kbGUuZHRzKSB7XG4gICAgICBjb25zdCBkdHNGb3JtYXR0ZXIgPSBuZXcgRXNtUmVuZGVyaW5nRm9ybWF0dGVyKHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUuaXNDb3JlKTtcbiAgICAgIGNvbnN0IGR0c1JlbmRlcmVyID1cbiAgICAgICAgICBuZXcgRHRzUmVuZGVyZXIoZHRzRm9ybWF0dGVyLCB0aGlzLmZzLCB0aGlzLmxvZ2dlciwgcmVmbGVjdGlvbkhvc3QsIGJ1bmRsZSk7XG4gICAgICBjb25zdCByZW5kZXJlZER0c0ZpbGVzID0gZHRzUmVuZGVyZXIucmVuZGVyUHJvZ3JhbShcbiAgICAgICAgICBkZWNvcmF0aW9uQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcywgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzKTtcbiAgICAgIHJlbmRlcmVkRmlsZXMgPSByZW5kZXJlZEZpbGVzLmNvbmNhdChyZW5kZXJlZER0c0ZpbGVzKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3N1Y2Nlc3M6IHRydWUsIGRpYWdub3N0aWNzLCB0cmFuc2Zvcm1lZEZpbGVzOiByZW5kZXJlZEZpbGVzfTtcbiAgfVxuXG4gIGdldEhvc3QoYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgICBzd2l0Y2ggKGJ1bmRsZS5mb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZWZsZWN0aW9uSG9zdCh0aGlzLmxvZ2dlciwgYnVuZGxlLmlzQ29yZSwgYnVuZGxlLnNyYywgYnVuZGxlLmR0cyk7XG4gICAgICBjYXNlICdlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVmbGVjdGlvbkhvc3QodGhpcy5sb2dnZXIsIGJ1bmRsZS5pc0NvcmUsIGJ1bmRsZS5zcmMsIGJ1bmRsZS5kdHMpO1xuICAgICAgY2FzZSAndW1kJzpcbiAgICAgICAgcmV0dXJuIG5ldyBVbWRSZWZsZWN0aW9uSG9zdCh0aGlzLmxvZ2dlciwgYnVuZGxlLmlzQ29yZSwgYnVuZGxlLnNyYywgYnVuZGxlLmR0cyk7XG4gICAgICBjYXNlICdjb21tb25qcyc6XG4gICAgICAgIHJldHVybiBuZXcgQ29tbW9uSnNSZWZsZWN0aW9uSG9zdCh0aGlzLmxvZ2dlciwgYnVuZGxlLmlzQ29yZSwgYnVuZGxlLnNyYywgYnVuZGxlLmR0cyk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlZmxlY3Rpb24gaG9zdCBmb3IgXCIke2J1bmRsZS5mb3JtYXR9XCIgbm90IHlldCBpbXBsZW1lbnRlZC5gKTtcbiAgICB9XG4gIH1cblxuICBnZXRSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBSZW5kZXJpbmdGb3JtYXR0ZXIge1xuICAgIHN3aXRjaCAoYnVuZGxlLmZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtUmVuZGVyaW5nRm9ybWF0dGVyKGhvc3QsIGJ1bmRsZS5pc0NvcmUpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmluZ0Zvcm1hdHRlcihob3N0LCBidW5kbGUuaXNDb3JlKTtcbiAgICAgIGNhc2UgJ3VtZCc6XG4gICAgICAgIGlmICghKGhvc3QgaW5zdGFuY2VvZiBVbWRSZWZsZWN0aW9uSG9zdCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VtZFJlbmRlcmVyIHJlcXVpcmVzIGEgVW1kUmVmbGVjdGlvbkhvc3QnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFVtZFJlbmRlcmluZ0Zvcm1hdHRlcihob3N0LCBidW5kbGUuaXNDb3JlKTtcbiAgICAgIGNhc2UgJ2NvbW1vbmpzJzpcbiAgICAgICAgcmV0dXJuIG5ldyBDb21tb25Kc1JlbmRlcmluZ0Zvcm1hdHRlcihob3N0LCBidW5kbGUuaXNDb3JlKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVuZGVyZXIgZm9yIFwiJHtidW5kbGUuZm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZVByb2dyYW0ocmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogUHJvZ3JhbUFuYWx5c2VzIHtcbiAgICBjb25zdCByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTmdjY1JlZmVyZW5jZXNSZWdpc3RyeShyZWZsZWN0aW9uSG9zdCk7XG5cbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXplciA9XG4gICAgICAgIG5ldyBTd2l0Y2hNYXJrZXJBbmFseXplcihyZWZsZWN0aW9uSG9zdCwgYnVuZGxlLmVudHJ5UG9pbnQucGFja2FnZSk7XG4gICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHlzZXMgPSBzd2l0Y2hNYXJrZXJBbmFseXplci5hbmFseXplUHJvZ3JhbShidW5kbGUuc3JjLnByb2dyYW0pO1xuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXplciA9IG5ldyBEZWNvcmF0aW9uQW5hbHl6ZXIoXG4gICAgICAgIHRoaXMuZnMsIGJ1bmRsZSwgcmVmbGVjdGlvbkhvc3QsIHJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgICAgZGlhZ25vc3RpYyA9PiBkaWFnbm9zdGljcy5wdXNoKGRpYWdub3N0aWMpLCB0aGlzLnRzQ29uZmlnKTtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBkZWNvcmF0aW9uQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oKTtcblxuICAgIGNvbnN0IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciA9IG5ldyBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIoXG4gICAgICAgIHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgcmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICBidW5kbGUuZHRzICE9PSBudWxsKTtcbiAgICBjb25zdCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgPSBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIgJiZcbiAgICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICBjb25zdCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIgPVxuICAgICAgICBuZXcgUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyKHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnkpO1xuICAgIGNvbnN0IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyA9XG4gICAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplci5hbmFseXplUHJvZ3JhbShidW5kbGUuc3JjLnByb2dyYW0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRlY29yYXRpb25BbmFseXNlcyxcbiAgICAgIHN3aXRjaE1hcmtlckFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLFxuICAgICAgZGlhZ25vc3RpY3NcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNFcnJvcnMoZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSkge1xuICByZXR1cm4gZGlhZ25vc3RpY3Muc29tZShkID0+IGQuY2F0ZWdvcnkgPT09IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcik7XG59XG5cbmludGVyZmFjZSBQcm9ncmFtQW5hbHlzZXMge1xuICBkZWNvcmF0aW9uQW5hbHlzZXM6IE1hcDx0cy5Tb3VyY2VGaWxlLCBDb21waWxlZEZpbGU+O1xuICBzd2l0Y2hNYXJrZXJBbmFseXNlczogU3dpdGNoTWFya2VyQW5hbHlzZXM7XG4gIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogRXhwb3J0SW5mb1tdO1xuICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xudWxsO1xuICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdO1xufVxuIl19