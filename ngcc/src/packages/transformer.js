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
     * Copyright Google LLC All Rights Reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBSWpDLHlFQUF1RTtJQUN2RSxtR0FBbUU7SUFDbkUseUhBQW9IO0lBQ3BILDZHQUE0RTtJQUM1RSx1SEFBa0c7SUFDbEcseUdBQThGO0lBRTlGLG1GQUE2RDtJQUM3RCx1RkFBaUU7SUFDakUsaUZBQTJEO0lBQzNELDJFQUFxRDtJQUVyRCx5RUFBbUQ7SUFFbkQsc0hBQXFGO0lBQ3JGLHNGQUFzRDtJQUN0RCw4R0FBNkU7SUFDN0UsNEdBQTJFO0lBQzNFLDhFQUErQztJQUUvQyw0R0FBMkU7SUFZM0U7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bb0JHO0lBQ0g7UUFDRSxxQkFDWSxFQUFjLEVBQVUsTUFBYyxFQUN0QyxRQUF5QztZQUF6Qyx5QkFBQSxFQUFBLGVBQXlDO1lBRHpDLE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ3RDLGFBQVEsR0FBUixRQUFRLENBQWlDO1FBQUcsQ0FBQztRQUV6RDs7OztXQUlHO1FBQ0gsK0JBQVMsR0FBVCxVQUFVLE1BQXdCO1lBQ2hDLElBQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoRCxJQUFNLGdCQUFnQixHQUFHLElBQUkscUNBQXdCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUMzRixJQUFNLGNBQWMsR0FBRyxJQUFJLDBDQUF3QixDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFFMUYsK0JBQStCO1lBQ3pCLElBQUEsS0FNRixJ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WUFDL0QsSUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUUvRCxJQUFNLDJCQUEyQixHQUFHLElBQUksNERBQTJCLENBQy9ELGNBQWMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxrQkFBa0IsRUFDdkUsTUFBTSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQztZQUN6QixJQUFNLDJCQUEyQixHQUFHLDJCQUEyQjtnQkFDM0QsMkJBQTJCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFbkUsSUFBTSwyQkFBMkIsR0FDN0IsSUFBSSwyREFBMkIsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUN4RSxJQUFNLDJCQUEyQixHQUM3QiwyQkFBMkIsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVuRSxPQUFPO2dCQUNMLGtCQUFrQixvQkFBQTtnQkFDbEIsb0JBQW9CLHNCQUFBO2dCQUNwQiwyQkFBMkIsNkJBQUE7Z0JBQzNCLDJCQUEyQiw2QkFBQTtnQkFDM0IsV0FBVyxhQUFBO2FBQ1osQ0FBQztRQUNKLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUFqSEQsSUFpSEM7SUFqSFksa0NBQVc7SUFtSHhCLFNBQWdCLFNBQVMsQ0FBQyxXQUE0QjtRQUNwRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsUUFBUSxLQUFLLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQTFDLENBQTBDLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRkQsOEJBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1BhcnNlZENvbmZpZ3VyYXRpb259IGZyb20gJy4uLy4uLy4uJztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7VHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcmVmbGVjdGlvbic7XG5pbXBvcnQge0RlY29yYXRpb25BbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplcic7XG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcywgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9tb2R1bGVfd2l0aF9wcm92aWRlcnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtOZ2NjUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi9hbmFseXNpcy9uZ2NjX3JlZmVyZW5jZXNfcmVnaXN0cnknO1xuaW1wb3J0IHtFeHBvcnRJbmZvLCBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7U3dpdGNoTWFya2VyQW5hbHlzZXMsIFN3aXRjaE1hcmtlckFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9zd2l0Y2hfbWFya2VyX2FuYWx5emVyJztcbmltcG9ydCB7Q29tcGlsZWRGaWxlfSBmcm9tICcuLi9hbmFseXNpcy90eXBlcyc7XG5pbXBvcnQge0NvbW1vbkpzUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvY29tbW9uanNfaG9zdCc7XG5pbXBvcnQge0RlbGVnYXRpbmdSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9kZWxlZ2F0aW5nX2hvc3QnO1xuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTVfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtVbWRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC91bWRfaG9zdCc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtDb21tb25Kc1JlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2NvbW1vbmpzX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtEdHNSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2R0c19yZW5kZXJlcic7XG5pbXBvcnQge0VzbTVSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc201X3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtFc21SZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc21fcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge1JlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuaW1wb3J0IHtSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7VW1kUmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvdW1kX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi4vcmVuZGVyaW5nL3V0aWxzJztcblxuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5cbmV4cG9ydCB0eXBlIFRyYW5zZm9ybVJlc3VsdCA9IHtcbiAgc3VjY2VzczogdHJ1ZTsgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXTsgdHJhbnNmb3JtZWRGaWxlczogRmlsZVRvV3JpdGVbXTtcbn18e1xuICBzdWNjZXNzOiBmYWxzZTtcbiAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXTtcbn07XG5cbi8qKlxuICogQSBQYWNrYWdlIGlzIHN0b3JlZCBpbiBhIGRpcmVjdG9yeSBvbiBkaXNrIGFuZCB0aGF0IGRpcmVjdG9yeSBjYW4gY29udGFpbiBvbmUgb3IgbW9yZSBwYWNrYWdlXG4gKiBmb3JtYXRzIC0gZS5nLiBmZXNtMjAxNSwgVU1ELCBldGMuIEFkZGl0aW9uYWxseSwgZWFjaCBwYWNrYWdlIHByb3ZpZGVzIHR5cGluZ3MgKGAuZC50c2AgZmlsZXMpLlxuICpcbiAqIEVhY2ggb2YgdGhlc2UgZm9ybWF0cyBleHBvc2VzIG9uZSBvciBtb3JlIGVudHJ5IHBvaW50cywgd2hpY2ggYXJlIHNvdXJjZSBmaWxlcyB0aGF0IG5lZWQgdG8gYmVcbiAqIHBhcnNlZCB0byBpZGVudGlmeSB0aGUgZGVjb3JhdGVkIGV4cG9ydGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGFuYWx5emVkIGFuZCBjb21waWxlZCBieSBvbmUgb3JcbiAqIG1vcmUgYERlY29yYXRvckhhbmRsZXJgIG9iamVjdHMuXG4gKlxuICogRWFjaCBlbnRyeSBwb2ludCB0byBhIHBhY2thZ2UgaXMgaWRlbnRpZmllZCBieSBhIGBwYWNrYWdlLmpzb25gIHdoaWNoIGNvbnRhaW5zIHByb3BlcnRpZXMgdGhhdFxuICogaW5kaWNhdGUgd2hhdCBmb3JtYXR0ZWQgYnVuZGxlcyBhcmUgYWNjZXNzaWJsZSB2aWEgdGhpcyBlbmQtcG9pbnQuXG4gKlxuICogRWFjaCBidW5kbGUgaXMgaWRlbnRpZmllZCBieSBhIHJvb3QgYFNvdXJjZUZpbGVgIHRoYXQgY2FuIGJlIHBhcnNlZCBhbmQgYW5hbHl6ZWQgdG9cbiAqIGlkZW50aWZ5IGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkOyBhbmQgdGhlbiBmaW5hbGx5IHJlbmRlcmVkIGFuZCB3cml0dGVuIHRvIGRpc2suXG4gKlxuICogQWxvbmcgd2l0aCB0aGUgc291cmNlIGZpbGVzLCB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgbWFwcyAoZWl0aGVyIGlubGluZSBvciBleHRlcm5hbCkgYW5kXG4gKiBgLmQudHNgIGZpbGVzIGFyZSB0cmFuc2Zvcm1lZCBhY2NvcmRpbmdseS5cbiAqXG4gKiAtIEZsYXQgZmlsZSBwYWNrYWdlcyBoYXZlIGFsbCB0aGUgY2xhc3NlcyBpbiBhIHNpbmdsZSBmaWxlLlxuICogLSBPdGhlciBwYWNrYWdlcyBtYXkgcmUtZXhwb3J0IGNsYXNzZXMgZnJvbSBvdGhlciBub24tZW50cnkgcG9pbnQgZmlsZXMuXG4gKiAtIFNvbWUgZm9ybWF0cyBtYXkgY29udGFpbiBtdWx0aXBsZSBcIm1vZHVsZXNcIiBpbiBhIHNpbmdsZSBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgVHJhbnNmb3JtZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIHRzQ29uZmlnOiBQYXJzZWRDb25maWd1cmF0aW9ufG51bGwgPSBudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gdGhlIHNvdXJjZSAoYW5kIHR5cGluZ3MpIGZpbGVzIG9mIGEgYnVuZGxlLlxuICAgKiBAcGFyYW0gYnVuZGxlIHRoZSBidW5kbGUgdG8gdHJhbnNmb3JtLlxuICAgKiBAcmV0dXJucyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZmlsZXMgdGhhdCB3ZXJlIHRyYW5zZm9ybWVkLlxuICAgKi9cbiAgdHJhbnNmb3JtKGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IFRyYW5zZm9ybVJlc3VsdCB7XG4gICAgY29uc3QgbmdjY1JlZmxlY3Rpb25Ib3N0ID0gdGhpcy5nZXRIb3N0KGJ1bmRsZSk7XG4gICAgY29uc3QgdHNSZWZsZWN0aW9uSG9zdCA9IG5ldyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QoYnVuZGxlLnNyYy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgIGNvbnN0IHJlZmxlY3Rpb25Ib3N0ID0gbmV3IERlbGVnYXRpbmdSZWZsZWN0aW9uSG9zdCh0c1JlZmxlY3Rpb25Ib3N0LCBuZ2NjUmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgLy8gUGFyc2UgYW5kIGFuYWx5emUgdGhlIGZpbGVzLlxuICAgIGNvbnN0IHtcbiAgICAgIGRlY29yYXRpb25BbmFseXNlcyxcbiAgICAgIHN3aXRjaE1hcmtlckFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLFxuICAgICAgZGlhZ25vc3RpY3NcbiAgICB9ID0gdGhpcy5hbmFseXplUHJvZ3JhbShyZWZsZWN0aW9uSG9zdCwgYnVuZGxlKTtcblxuICAgIC8vIEJhaWwgaWYgdGhlIGFuYWx5c2lzIHByb2R1Y2VkIGFueSBlcnJvcnMuXG4gICAgaWYgKGhhc0Vycm9ycyhkaWFnbm9zdGljcykpIHtcbiAgICAgIHJldHVybiB7c3VjY2VzczogZmFsc2UsIGRpYWdub3N0aWNzfTtcbiAgICB9XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlcyBhbmQgc291cmNlIG1hcHMuXG4gICAgY29uc3Qgc3JjRm9ybWF0dGVyID0gdGhpcy5nZXRSZW5kZXJpbmdGb3JtYXR0ZXIobmdjY1JlZmxlY3Rpb25Ib3N0LCBidW5kbGUpO1xuXG4gICAgY29uc3QgcmVuZGVyZXIgPSBuZXcgUmVuZGVyZXIocmVmbGVjdGlvbkhvc3QsIHNyY0Zvcm1hdHRlciwgdGhpcy5mcywgdGhpcy5sb2dnZXIsIGJ1bmRsZSk7XG4gICAgbGV0IHJlbmRlcmVkRmlsZXMgPSByZW5kZXJlci5yZW5kZXJQcm9ncmFtKFxuICAgICAgICBkZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpO1xuXG4gICAgaWYgKGJ1bmRsZS5kdHMpIHtcbiAgICAgIGNvbnN0IGR0c0Zvcm1hdHRlciA9IG5ldyBFc21SZW5kZXJpbmdGb3JtYXR0ZXIocmVmbGVjdGlvbkhvc3QsIGJ1bmRsZS5pc0NvcmUpO1xuICAgICAgY29uc3QgZHRzUmVuZGVyZXIgPVxuICAgICAgICAgIG5ldyBEdHNSZW5kZXJlcihkdHNGb3JtYXR0ZXIsIHRoaXMuZnMsIHRoaXMubG9nZ2VyLCByZWZsZWN0aW9uSG9zdCwgYnVuZGxlKTtcbiAgICAgIGNvbnN0IHJlbmRlcmVkRHRzRmlsZXMgPSBkdHNSZW5kZXJlci5yZW5kZXJQcm9ncmFtKFxuICAgICAgICAgIGRlY29yYXRpb25BbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMpO1xuICAgICAgcmVuZGVyZWRGaWxlcyA9IHJlbmRlcmVkRmlsZXMuY29uY2F0KHJlbmRlcmVkRHRzRmlsZXMpO1xuICAgIH1cblxuICAgIHJldHVybiB7c3VjY2VzczogdHJ1ZSwgZGlhZ25vc3RpY3MsIHRyYW5zZm9ybWVkRmlsZXM6IHJlbmRlcmVkRmlsZXN9O1xuICB9XG5cbiAgZ2V0SG9zdChidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICAgIHN3aXRjaCAoYnVuZGxlLmZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBidW5kbGUuaXNDb3JlLCBidW5kbGUuc3JjLCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZWZsZWN0aW9uSG9zdCh0aGlzLmxvZ2dlciwgYnVuZGxlLmlzQ29yZSwgYnVuZGxlLnNyYywgYnVuZGxlLmR0cyk7XG4gICAgICBjYXNlICd1bWQnOlxuICAgICAgICByZXR1cm4gbmV3IFVtZFJlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBidW5kbGUuaXNDb3JlLCBidW5kbGUuc3JjLCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ2NvbW1vbmpzJzpcbiAgICAgICAgcmV0dXJuIG5ldyBDb21tb25Kc1JlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBidW5kbGUuaXNDb3JlLCBidW5kbGUuc3JjLCBidW5kbGUuZHRzKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVmbGVjdGlvbiBob3N0IGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmluZ0Zvcm1hdHRlcihob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IFJlbmRlcmluZ0Zvcm1hdHRlciB7XG4gICAgc3dpdGNoIChidW5kbGUuZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc21SZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdCwgYnVuZGxlLmlzQ29yZSk7XG4gICAgICBjYXNlICdlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVuZGVyaW5nRm9ybWF0dGVyKGhvc3QsIGJ1bmRsZS5pc0NvcmUpO1xuICAgICAgY2FzZSAndW1kJzpcbiAgICAgICAgaWYgKCEoaG9zdCBpbnN0YW5jZW9mIFVtZFJlZmxlY3Rpb25Ib3N0KSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW1kUmVuZGVyZXIgcmVxdWlyZXMgYSBVbWRSZWZsZWN0aW9uSG9zdCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgVW1kUmVuZGVyaW5nRm9ybWF0dGVyKGhvc3QsIGJ1bmRsZS5pc0NvcmUpO1xuICAgICAgY2FzZSAnY29tbW9uanMnOlxuICAgICAgICByZXR1cm4gbmV3IENvbW1vbkpzUmVuZGVyaW5nRm9ybWF0dGVyKGhvc3QsIGJ1bmRsZS5pc0NvcmUpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZW5kZXJlciBmb3IgXCIke2J1bmRsZS5mb3JtYXR9XCIgbm90IHlldCBpbXBsZW1lbnRlZC5gKTtcbiAgICB9XG4gIH1cblxuICBhbmFseXplUHJvZ3JhbShyZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBQcm9ncmFtQW5hbHlzZXMge1xuICAgIGNvbnN0IHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOZ2NjUmVmZXJlbmNlc1JlZ2lzdHJ5KHJlZmxlY3Rpb25Ib3N0KTtcblxuICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5emVyID1cbiAgICAgICAgbmV3IFN3aXRjaE1hcmtlckFuYWx5emVyKHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUuZW50cnlQb2ludC5wYWNrYWdlKTtcbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNlcyA9IHN3aXRjaE1hcmtlckFuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5emVyID0gbmV3IERlY29yYXRpb25BbmFseXplcihcbiAgICAgICAgdGhpcy5mcywgYnVuZGxlLCByZWZsZWN0aW9uSG9zdCwgcmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICBkaWFnbm9zdGljID0+IGRpYWdub3N0aWNzLnB1c2goZGlhZ25vc3RpYyksIHRoaXMudHNDb25maWcpO1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXNlcyA9IGRlY29yYXRpb25BbmFseXplci5hbmFseXplUHJvZ3JhbSgpO1xuXG4gICAgY29uc3QgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyID0gbmV3IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplcihcbiAgICAgICAgcmVmbGVjdGlvbkhvc3QsIGJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCByZWZlcmVuY2VzUmVnaXN0cnksXG4gICAgICAgIGJ1bmRsZS5kdHMgIT09IG51bGwpO1xuICAgIGNvbnN0IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciAmJlxuICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcblxuICAgIGNvbnN0IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplciA9XG4gICAgICAgIG5ldyBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIocmVmbGVjdGlvbkhvc3QsIHJlZmVyZW5jZXNSZWdpc3RyeSk7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzID1cbiAgICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLFxuICAgICAgc3dpdGNoTWFya2VyQW5hbHlzZXMsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsXG4gICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMsXG4gICAgICBkaWFnbm9zdGljc1xuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhc0Vycm9ycyhkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKSB7XG4gIHJldHVybiBkaWFnbm9zdGljcy5zb21lKGQgPT4gZC5jYXRlZ29yeSA9PT0gdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yKTtcbn1cblxuaW50ZXJmYWNlIFByb2dyYW1BbmFseXNlcyB7XG4gIGRlY29yYXRpb25BbmFseXNlczogTWFwPHRzLlNvdXJjZUZpbGUsIENvbXBpbGVkRmlsZT47XG4gIHN3aXRjaE1hcmtlckFuYWx5c2VzOiBTd2l0Y2hNYXJrZXJBbmFseXNlcztcbiAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBFeHBvcnRJbmZvW107XG4gIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlczogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfG51bGw7XG4gIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW107XG59XG4iXX0=