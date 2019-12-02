(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/transformer", ["require", "exports", "typescript", "@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", "@angular/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer", "@angular/compiler-cli/ngcc/src/analysis/ngcc_references_registry", "@angular/compiler-cli/ngcc/src/analysis/private_declarations_analyzer", "@angular/compiler-cli/ngcc/src/analysis/switch_marker_analyzer", "@angular/compiler-cli/ngcc/src/host/commonjs_host", "@angular/compiler-cli/ngcc/src/host/esm2015_host", "@angular/compiler-cli/ngcc/src/host/esm5_host", "@angular/compiler-cli/ngcc/src/host/umd_host", "@angular/compiler-cli/ngcc/src/rendering/commonjs_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/dts_renderer", "@angular/compiler-cli/ngcc/src/rendering/esm5_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/esm_rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/renderer", "@angular/compiler-cli/ngcc/src/rendering/umd_rendering_formatter"], factory);
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
            var reflectionHost = this.getHost(bundle);
            // Parse and analyze the files.
            var _a = this.analyzeProgram(reflectionHost, bundle), decorationAnalyses = _a.decorationAnalyses, switchMarkerAnalyses = _a.switchMarkerAnalyses, privateDeclarationsAnalyses = _a.privateDeclarationsAnalyses, moduleWithProvidersAnalyses = _a.moduleWithProvidersAnalyses, diagnostics = _a.diagnostics;
            // Bail if the analysis produced any errors.
            if (hasErrors(diagnostics)) {
                return { success: false, diagnostics: diagnostics };
            }
            // Transform the source files and source maps.
            var srcFormatter = this.getRenderingFormatter(reflectionHost, bundle);
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
            var typeChecker = bundle.src.program.getTypeChecker();
            switch (bundle.format) {
                case 'esm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(this.logger, bundle.isCore, typeChecker, bundle.dts);
                case 'esm5':
                    return new esm5_host_1.Esm5ReflectionHost(this.logger, bundle.isCore, typeChecker, bundle.dts);
                case 'umd':
                    return new umd_host_1.UmdReflectionHost(this.logger, bundle.isCore, bundle.src.program, bundle.src.host, bundle.dts);
                case 'commonjs':
                    return new commonjs_host_1.CommonJsReflectionHost(this.logger, bundle.isCore, bundle.src.program, bundle.src.host, bundle.dts);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFHakMsbUdBQW1FO0lBQ25FLHlIQUFvSDtJQUNwSCw2R0FBNEU7SUFDNUUsdUhBQWtHO0lBQ2xHLHlHQUE4RjtJQUU5RixtRkFBNkQ7SUFDN0QsaUZBQTJEO0lBQzNELDJFQUFxRDtJQUVyRCx5RUFBbUQ7SUFFbkQsc0hBQXFGO0lBQ3JGLHNGQUFzRDtJQUN0RCw4R0FBNkU7SUFDN0UsNEdBQTJFO0lBQzNFLDhFQUErQztJQUUvQyw0R0FBMkU7SUFhM0U7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bb0JHO0lBQ0g7UUFDRSxxQkFBb0IsRUFBYyxFQUFVLE1BQWM7WUFBdEMsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7UUFBRyxDQUFDO1FBRTlEOzs7O1dBSUc7UUFDSCwrQkFBUyxHQUFULFVBQVUsTUFBd0I7WUFDaEMsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUU1QywrQkFBK0I7WUFDekIsSUFBQSxnREFDd0YsRUFEdkYsMENBQWtCLEVBQUUsOENBQW9CLEVBQUUsNERBQTJCLEVBQ3JFLDREQUEyQixFQUFFLDRCQUEwRCxDQUFDO1lBRS9GLDRDQUE0QztZQUM1QyxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDMUIsT0FBTyxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxhQUFBLEVBQUMsQ0FBQzthQUN0QztZQUVELDhDQUE4QztZQUM5QyxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXhFLElBQU0sUUFBUSxHQUFHLElBQUksbUJBQVEsQ0FBQyxjQUFjLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxRixJQUFJLGFBQWEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUN0QyxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBRTNFLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtnQkFDZCxJQUFNLFlBQVksR0FBRyxJQUFJLCtDQUFxQixDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzlFLElBQU0sV0FBVyxHQUNiLElBQUksMEJBQVcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDaEYsSUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUM5QyxrQkFBa0IsRUFBRSwyQkFBMkIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO2dCQUNsRixhQUFhLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ3hEO1lBRUQsT0FBTyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxhQUFBLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELDZCQUFPLEdBQVAsVUFBUSxNQUF3QjtZQUM5QixJQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN4RCxRQUFRLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQ3JCLEtBQUssU0FBUztvQkFDWixPQUFPLElBQUksb0NBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3hGLEtBQUssTUFBTTtvQkFDVCxPQUFPLElBQUksOEJBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JGLEtBQUssS0FBSztvQkFDUixPQUFPLElBQUksNEJBQWlCLENBQ3hCLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25GLEtBQUssVUFBVTtvQkFDYixPQUFPLElBQUksc0NBQXNCLENBQzdCLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25GO29CQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQXdCLE1BQU0sQ0FBQyxNQUFNLDRCQUF3QixDQUFDLENBQUM7YUFDbEY7UUFDSCxDQUFDO1FBRUQsMkNBQXFCLEdBQXJCLFVBQXNCLElBQXdCLEVBQUUsTUFBd0I7WUFDdEUsUUFBUSxNQUFNLENBQUMsTUFBTSxFQUFFO2dCQUNyQixLQUFLLFNBQVM7b0JBQ1osT0FBTyxJQUFJLCtDQUFxQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3hELEtBQUssTUFBTTtvQkFDVCxPQUFPLElBQUksaURBQXNCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekQsS0FBSyxLQUFLO29CQUNSLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSw0QkFBaUIsQ0FBQyxFQUFFO3dCQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7cUJBQzdEO29CQUNELE9BQU8sSUFBSSwrQ0FBcUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN4RCxLQUFLLFVBQVU7b0JBQ2IsT0FBTyxJQUFJLHlEQUEwQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzdEO29CQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQWlCLE1BQU0sQ0FBQyxNQUFNLDRCQUF3QixDQUFDLENBQUM7YUFDM0U7UUFDSCxDQUFDO1FBRUQsb0NBQWMsR0FBZCxVQUFlLGNBQWtDLEVBQUUsTUFBd0I7WUFDekUsSUFBTSxrQkFBa0IsR0FBRyxJQUFJLGlEQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRXRFLElBQU0sb0JBQW9CLEdBQ3RCLElBQUksNkNBQW9CLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDeEUsSUFBTSxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVyRixJQUFNLFdBQVcsR0FBb0IsRUFBRSxDQUFDO1lBQ3hDLElBQU0sa0JBQWtCLEdBQUcsSUFBSSx3Q0FBa0IsQ0FDN0MsSUFBSSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUNuRCxVQUFBLFVBQVUsSUFBSSxPQUFBLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQTVCLENBQTRCLENBQUMsQ0FBQztZQUNoRCxJQUFNLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxDQUFDO1lBRS9ELElBQU0sMkJBQTJCLEdBQzdCLElBQUksNERBQTJCLENBQUMsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUM7WUFDN0YsSUFBTSwyQkFBMkIsR0FBRywyQkFBMkI7Z0JBQzNELDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRW5FLElBQU0sMkJBQTJCLEdBQzdCLElBQUksMkRBQTJCLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDeEUsSUFBTSwyQkFBMkIsR0FDN0IsMkJBQTJCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFbkUsT0FBTyxFQUFDLGtCQUFrQixvQkFBQSxFQUFFLG9CQUFvQixzQkFBQSxFQUFFLDJCQUEyQiw2QkFBQTtnQkFDckUsMkJBQTJCLDZCQUFBLEVBQUUsV0FBVyxhQUFBLEVBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0gsa0JBQUM7SUFBRCxDQUFDLEFBckdELElBcUdDO0lBckdZLGtDQUFXO0lBdUd4QixTQUFnQixTQUFTLENBQUMsV0FBNEI7UUFDcEQsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUExQyxDQUEwQyxDQUFDLENBQUM7SUFDM0UsQ0FBQztJQUZELDhCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVjb3JhdGlvbkFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLCBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplcic7XG5pbXBvcnQge05nY2NSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4uL2FuYWx5c2lzL25nY2NfcmVmZXJlbmNlc19yZWdpc3RyeSc7XG5pbXBvcnQge0V4cG9ydEluZm8sIFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtTd2l0Y2hNYXJrZXJBbmFseXNlcywgU3dpdGNoTWFya2VyQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtDb21waWxlZEZpbGV9IGZyb20gJy4uL2FuYWx5c2lzL3R5cGVzJztcbmltcG9ydCB7Q29tbW9uSnNSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9jb21tb25qc19ob3N0JztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7VW1kUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7Q29tbW9uSnNSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9jb21tb25qc19yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7RHRzUmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9kdHNfcmVuZGVyZXInO1xuaW1wb3J0IHtFc201UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtNV9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7RXNtUmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtX3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcbmltcG9ydCB7UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge1VtZFJlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3VtZF9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7RmlsZVRvV3JpdGV9IGZyb20gJy4uL3JlbmRlcmluZy91dGlscyc7XG5cbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9lbnRyeV9wb2ludF9idW5kbGUnO1xuXG5leHBvcnQgdHlwZSBUcmFuc2Zvcm1SZXN1bHQgPSB7XG4gIHN1Y2Nlc3M6IHRydWU7IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW107IHRyYW5zZm9ybWVkRmlsZXM6IEZpbGVUb1dyaXRlW107XG59IHxcbntcbiAgc3VjY2VzczogZmFsc2U7XG4gIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW107XG59O1xuXG4vKipcbiAqIEEgUGFja2FnZSBpcyBzdG9yZWQgaW4gYSBkaXJlY3Rvcnkgb24gZGlzayBhbmQgdGhhdCBkaXJlY3RvcnkgY2FuIGNvbnRhaW4gb25lIG9yIG1vcmUgcGFja2FnZVxuICogZm9ybWF0cyAtIGUuZy4gZmVzbTIwMTUsIFVNRCwgZXRjLiBBZGRpdGlvbmFsbHksIGVhY2ggcGFja2FnZSBwcm92aWRlcyB0eXBpbmdzIChgLmQudHNgIGZpbGVzKS5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgcGFja2FnZS5qc29uYCB3aGljaCBjb250YWlucyBwcm9wZXJ0aWVzIHRoYXRcbiAqIGluZGljYXRlIHdoYXQgZm9ybWF0dGVkIGJ1bmRsZXMgYXJlIGFjY2Vzc2libGUgdmlhIHRoaXMgZW5kLXBvaW50LlxuICpcbiAqIEVhY2ggYnVuZGxlIGlzIGlkZW50aWZpZWQgYnkgYSByb290IGBTb3VyY2VGaWxlYCB0aGF0IGNhbiBiZSBwYXJzZWQgYW5kIGFuYWx5emVkIHRvXG4gKiBpZGVudGlmeSBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZDsgYW5kIHRoZW4gZmluYWxseSByZW5kZXJlZCBhbmQgd3JpdHRlbiB0byBkaXNrLlxuICpcbiAqIEFsb25nIHdpdGggdGhlIHNvdXJjZSBmaWxlcywgdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIG1hcHMgKGVpdGhlciBpbmxpbmUgb3IgZXh0ZXJuYWwpIGFuZFxuICogYC5kLnRzYCBmaWxlcyBhcmUgdHJhbnNmb3JtZWQgYWNjb3JkaW5nbHkuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcikge31cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHRoZSBzb3VyY2UgKGFuZCB0eXBpbmdzKSBmaWxlcyBvZiBhIGJ1bmRsZS5cbiAgICogQHBhcmFtIGJ1bmRsZSB0aGUgYnVuZGxlIHRvIHRyYW5zZm9ybS5cbiAgICogQHJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGZpbGVzIHRoYXQgd2VyZSB0cmFuc2Zvcm1lZC5cbiAgICovXG4gIHRyYW5zZm9ybShidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBUcmFuc2Zvcm1SZXN1bHQge1xuICAgIGNvbnN0IHJlZmxlY3Rpb25Ib3N0ID0gdGhpcy5nZXRIb3N0KGJ1bmRsZSk7XG5cbiAgICAvLyBQYXJzZSBhbmQgYW5hbHl6ZSB0aGUgZmlsZXMuXG4gICAgY29uc3Qge2RlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLCBkaWFnbm9zdGljc30gPSB0aGlzLmFuYWx5emVQcm9ncmFtKHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUpO1xuXG4gICAgLy8gQmFpbCBpZiB0aGUgYW5hbHlzaXMgcHJvZHVjZWQgYW55IGVycm9ycy5cbiAgICBpZiAoaGFzRXJyb3JzKGRpYWdub3N0aWNzKSkge1xuICAgICAgcmV0dXJuIHtzdWNjZXNzOiBmYWxzZSwgZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICBjb25zdCBzcmNGb3JtYXR0ZXIgPSB0aGlzLmdldFJlbmRlcmluZ0Zvcm1hdHRlcihyZWZsZWN0aW9uSG9zdCwgYnVuZGxlKTtcblxuICAgIGNvbnN0IHJlbmRlcmVyID0gbmV3IFJlbmRlcmVyKHJlZmxlY3Rpb25Ib3N0LCBzcmNGb3JtYXR0ZXIsIHRoaXMuZnMsIHRoaXMubG9nZ2VyLCBidW5kbGUpO1xuICAgIGxldCByZW5kZXJlZEZpbGVzID0gcmVuZGVyZXIucmVuZGVyUHJvZ3JhbShcbiAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTtcblxuICAgIGlmIChidW5kbGUuZHRzKSB7XG4gICAgICBjb25zdCBkdHNGb3JtYXR0ZXIgPSBuZXcgRXNtUmVuZGVyaW5nRm9ybWF0dGVyKHJlZmxlY3Rpb25Ib3N0LCBidW5kbGUuaXNDb3JlKTtcbiAgICAgIGNvbnN0IGR0c1JlbmRlcmVyID1cbiAgICAgICAgICBuZXcgRHRzUmVuZGVyZXIoZHRzRm9ybWF0dGVyLCB0aGlzLmZzLCB0aGlzLmxvZ2dlciwgcmVmbGVjdGlvbkhvc3QsIGJ1bmRsZSk7XG4gICAgICBjb25zdCByZW5kZXJlZER0c0ZpbGVzID0gZHRzUmVuZGVyZXIucmVuZGVyUHJvZ3JhbShcbiAgICAgICAgICBkZWNvcmF0aW9uQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcywgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzKTtcbiAgICAgIHJlbmRlcmVkRmlsZXMgPSByZW5kZXJlZEZpbGVzLmNvbmNhdChyZW5kZXJlZER0c0ZpbGVzKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3N1Y2Nlc3M6IHRydWUsIGRpYWdub3N0aWNzLCB0cmFuc2Zvcm1lZEZpbGVzOiByZW5kZXJlZEZpbGVzfTtcbiAgfVxuXG4gIGdldEhvc3QoYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IGJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIHN3aXRjaCAoYnVuZGxlLmZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBidW5kbGUuaXNDb3JlLCB0eXBlQ2hlY2tlciwgYnVuZGxlLmR0cyk7XG4gICAgICBjYXNlICdlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVmbGVjdGlvbkhvc3QodGhpcy5sb2dnZXIsIGJ1bmRsZS5pc0NvcmUsIHR5cGVDaGVja2VyLCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ3VtZCc6XG4gICAgICAgIHJldHVybiBuZXcgVW1kUmVmbGVjdGlvbkhvc3QoXG4gICAgICAgICAgICB0aGlzLmxvZ2dlciwgYnVuZGxlLmlzQ29yZSwgYnVuZGxlLnNyYy5wcm9ncmFtLCBidW5kbGUuc3JjLmhvc3QsIGJ1bmRsZS5kdHMpO1xuICAgICAgY2FzZSAnY29tbW9uanMnOlxuICAgICAgICByZXR1cm4gbmV3IENvbW1vbkpzUmVmbGVjdGlvbkhvc3QoXG4gICAgICAgICAgICB0aGlzLmxvZ2dlciwgYnVuZGxlLmlzQ29yZSwgYnVuZGxlLnNyYy5wcm9ncmFtLCBidW5kbGUuc3JjLmhvc3QsIGJ1bmRsZS5kdHMpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWZsZWN0aW9uIGhvc3QgZm9yIFwiJHtidW5kbGUuZm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVuZGVyaW5nRm9ybWF0dGVyKGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogUmVuZGVyaW5nRm9ybWF0dGVyIHtcbiAgICBzd2l0Y2ggKGJ1bmRsZS5mb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbVJlbmRlcmluZ0Zvcm1hdHRlcihob3N0LCBidW5kbGUuaXNDb3JlKTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdCwgYnVuZGxlLmlzQ29yZSk7XG4gICAgICBjYXNlICd1bWQnOlxuICAgICAgICBpZiAoIShob3N0IGluc3RhbmNlb2YgVW1kUmVmbGVjdGlvbkhvc3QpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbWRSZW5kZXJlciByZXF1aXJlcyBhIFVtZFJlZmxlY3Rpb25Ib3N0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBVbWRSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdCwgYnVuZGxlLmlzQ29yZSk7XG4gICAgICBjYXNlICdjb21tb25qcyc6XG4gICAgICAgIHJldHVybiBuZXcgQ29tbW9uSnNSZW5kZXJpbmdGb3JtYXR0ZXIoaG9zdCwgYnVuZGxlLmlzQ29yZSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbmRlcmVyIGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emVQcm9ncmFtKHJlZmxlY3Rpb25Ib3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IFByb2dyYW1BbmFseXNlcyB7XG4gICAgY29uc3QgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IE5nY2NSZWZlcmVuY2VzUmVnaXN0cnkocmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHl6ZXIgPVxuICAgICAgICBuZXcgU3dpdGNoTWFya2VyQW5hbHl6ZXIocmVmbGVjdGlvbkhvc3QsIGJ1bmRsZS5lbnRyeVBvaW50LnBhY2thZ2UpO1xuICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5c2VzID0gc3dpdGNoTWFya2VyQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHl6ZXIgPSBuZXcgRGVjb3JhdGlvbkFuYWx5emVyKFxuICAgICAgICB0aGlzLmZzLCBidW5kbGUsIHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnksXG4gICAgICAgIGRpYWdub3N0aWMgPT4gZGlhZ25vc3RpY3MucHVzaChkaWFnbm9zdGljKSk7XG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5c2VzID0gZGVjb3JhdGlvbkFuYWx5emVyLmFuYWx5emVQcm9ncmFtKCk7XG5cbiAgICBjb25zdCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIgPVxuICAgICAgICBuZXcgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyKHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnksIGJ1bmRsZS5kdHMgIT09IG51bGwpO1xuICAgIGNvbnN0IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciAmJlxuICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcblxuICAgIGNvbnN0IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplciA9XG4gICAgICAgIG5ldyBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIocmVmbGVjdGlvbkhvc3QsIHJlZmVyZW5jZXNSZWdpc3RyeSk7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzID1cbiAgICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICByZXR1cm4ge2RlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgICAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcywgZGlhZ25vc3RpY3N9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYXNFcnJvcnMoZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSkge1xuICByZXR1cm4gZGlhZ25vc3RpY3Muc29tZShkID0+IGQuY2F0ZWdvcnkgPT09IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcik7XG59XG5cbmludGVyZmFjZSBQcm9ncmFtQW5hbHlzZXMge1xuICBkZWNvcmF0aW9uQW5hbHlzZXM6IE1hcDx0cy5Tb3VyY2VGaWxlLCBDb21waWxlZEZpbGU+O1xuICBzd2l0Y2hNYXJrZXJBbmFseXNlczogU3dpdGNoTWFya2VyQW5hbHlzZXM7XG4gIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogRXhwb3J0SW5mb1tdO1xuICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xudWxsO1xuICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdO1xufVxuIl19