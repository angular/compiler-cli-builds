(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/transformer", ["require", "exports", "@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer", "@angular/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer", "@angular/compiler-cli/ngcc/src/analysis/ngcc_references_registry", "@angular/compiler-cli/ngcc/src/analysis/private_declarations_analyzer", "@angular/compiler-cli/ngcc/src/analysis/switch_marker_analyzer", "@angular/compiler-cli/ngcc/src/host/esm2015_host", "@angular/compiler-cli/ngcc/src/host/esm5_host", "@angular/compiler-cli/ngcc/src/rendering/esm5_renderer", "@angular/compiler-cli/ngcc/src/rendering/esm_renderer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var decoration_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/decoration_analyzer");
    var module_with_providers_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/module_with_providers_analyzer");
    var ngcc_references_registry_1 = require("@angular/compiler-cli/ngcc/src/analysis/ngcc_references_registry");
    var private_declarations_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/private_declarations_analyzer");
    var switch_marker_analyzer_1 = require("@angular/compiler-cli/ngcc/src/analysis/switch_marker_analyzer");
    var esm2015_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm2015_host");
    var esm5_host_1 = require("@angular/compiler-cli/ngcc/src/host/esm5_host");
    var esm5_renderer_1 = require("@angular/compiler-cli/ngcc/src/rendering/esm5_renderer");
    var esm_renderer_1 = require("@angular/compiler-cli/ngcc/src/rendering/esm_renderer");
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
        function Transformer(sourcePath, targetPath) {
            this.sourcePath = sourcePath;
            this.targetPath = targetPath;
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
            var renderer = this.getRenderer(reflectionHost, isCore, bundle);
            var renderedFiles = renderer.renderProgram(decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses);
            return renderedFiles;
        };
        Transformer.prototype.getHost = function (isCore, bundle) {
            var typeChecker = bundle.src.program.getTypeChecker();
            switch (bundle.format) {
                case 'esm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(isCore, typeChecker, bundle.dts);
                case 'esm5':
                    return new esm5_host_1.Esm5ReflectionHost(isCore, typeChecker, bundle.dts);
                default:
                    throw new Error("Reflection host for \"" + bundle.format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.getRenderer = function (host, isCore, bundle) {
            switch (bundle.format) {
                case 'esm2015':
                    return new esm_renderer_1.EsmRenderer(host, isCore, bundle, this.sourcePath, this.targetPath);
                case 'esm5':
                    return new esm5_renderer_1.Esm5Renderer(host, isCore, bundle, this.sourcePath, this.targetPath);
                default:
                    throw new Error("Renderer for \"" + bundle.format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.analyzeProgram = function (reflectionHost, isCore, bundle) {
            var typeChecker = bundle.src.program.getTypeChecker();
            var referencesRegistry = new ngcc_references_registry_1.NgccReferencesRegistry(reflectionHost);
            var switchMarkerAnalyzer = new switch_marker_analyzer_1.SwitchMarkerAnalyzer(reflectionHost);
            var switchMarkerAnalyses = switchMarkerAnalyzer.analyzeProgram(bundle.src.program);
            var decorationAnalyzer = new decoration_analyzer_1.DecorationAnalyzer(bundle.src.program, bundle.src.options, bundle.src.host, typeChecker, reflectionHost, referencesRegistry, bundle.rootDirs, isCore);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFTQSxtR0FBaUY7SUFDakYseUhBQW9IO0lBQ3BILDZHQUE0RTtJQUM1RSx1SEFBa0c7SUFDbEcseUdBQThGO0lBQzlGLGlGQUEyRDtJQUMzRCwyRUFBcUQ7SUFFckQsd0ZBQXdEO0lBQ3hELHNGQUFzRDtJQU90RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FvQkc7SUFDSDtRQUNFLHFCQUFvQixVQUFrQixFQUFVLFVBQWtCO1lBQTlDLGVBQVUsR0FBVixVQUFVLENBQVE7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQUcsQ0FBQztRQUV0RTs7OztXQUlHO1FBQ0gsK0JBQVMsR0FBVCxVQUFVLE1BQXdCO1lBQ2hDLElBQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDN0IsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFcEQsK0JBQStCO1lBQ3pCLElBQUEsd0RBQ21GLEVBRGxGLDBDQUFrQixFQUFFLDhDQUFvQixFQUFFLDREQUEyQixFQUNyRSw0REFBa0YsQ0FBQztZQUUxRiw4Q0FBOEM7WUFDOUMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2xFLElBQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQ3hDLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLDJCQUEyQixFQUNyRSwyQkFBMkIsQ0FBQyxDQUFDO1lBRWpDLE9BQU8sYUFBYSxDQUFDO1FBQ3ZCLENBQUM7UUFFRCw2QkFBTyxHQUFQLFVBQVEsTUFBZSxF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RUM7SUExRVksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplcic7XG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcywgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9tb2R1bGVfd2l0aF9wcm92aWRlcnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtOZ2NjUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi9hbmFseXNpcy9uZ2NjX3JlZmVyZW5jZXNfcmVnaXN0cnknO1xuaW1wb3J0IHtFeHBvcnRJbmZvLCBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7U3dpdGNoTWFya2VyQW5hbHlzZXMsIFN3aXRjaE1hcmtlckFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9zd2l0Y2hfbWFya2VyX2FuYWx5emVyJztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7RXNtNVJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtNV9yZW5kZXJlcic7XG5pbXBvcnQge0VzbVJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtX3JlbmRlcmVyJztcbmltcG9ydCB7RmlsZUluZm8sIFJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuXG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4vZW50cnlfcG9pbnRfYnVuZGxlJztcblxuXG5cbi8qKlxuICogQSBQYWNrYWdlIGlzIHN0b3JlZCBpbiBhIGRpcmVjdG9yeSBvbiBkaXNrIGFuZCB0aGF0IGRpcmVjdG9yeSBjYW4gY29udGFpbiBvbmUgb3IgbW9yZSBwYWNrYWdlXG4gKiBmb3JtYXRzIC0gZS5nLiBmZXNtMjAxNSwgVU1ELCBldGMuIEFkZGl0aW9uYWxseSwgZWFjaCBwYWNrYWdlIHByb3ZpZGVzIHR5cGluZ3MgKGAuZC50c2AgZmlsZXMpLlxuICpcbiAqIEVhY2ggb2YgdGhlc2UgZm9ybWF0cyBleHBvc2VzIG9uZSBvciBtb3JlIGVudHJ5IHBvaW50cywgd2hpY2ggYXJlIHNvdXJjZSBmaWxlcyB0aGF0IG5lZWQgdG8gYmVcbiAqIHBhcnNlZCB0byBpZGVudGlmeSB0aGUgZGVjb3JhdGVkIGV4cG9ydGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGFuYWx5emVkIGFuZCBjb21waWxlZCBieSBvbmUgb3JcbiAqIG1vcmUgYERlY29yYXRvckhhbmRsZXJgIG9iamVjdHMuXG4gKlxuICogRWFjaCBlbnRyeSBwb2ludCB0byBhIHBhY2thZ2UgaXMgaWRlbnRpZmllZCBieSBhIGBwYWNrYWdlLmpzb25gIHdoaWNoIGNvbnRhaW5zIHByb3BlcnRpZXMgdGhhdFxuICogaW5kaWNhdGUgd2hhdCBmb3JtYXR0ZWQgYnVuZGxlcyBhcmUgYWNjZXNzaWJsZSB2aWEgdGhpcyBlbmQtcG9pbnQuXG4gKlxuICogRWFjaCBidW5kbGUgaXMgaWRlbnRpZmllZCBieSBhIHJvb3QgYFNvdXJjZUZpbGVgIHRoYXQgY2FuIGJlIHBhcnNlZCBhbmQgYW5hbHl6ZWQgdG9cbiAqIGlkZW50aWZ5IGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkOyBhbmQgdGhlbiBmaW5hbGx5IHJlbmRlcmVkIGFuZCB3cml0dGVuIHRvIGRpc2suXG4gKlxuICogQWxvbmcgd2l0aCB0aGUgc291cmNlIGZpbGVzLCB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgbWFwcyAoZWl0aGVyIGlubGluZSBvciBleHRlcm5hbCkgYW5kXG4gKiBgLmQudHNgIGZpbGVzIGFyZSB0cmFuc2Zvcm1lZCBhY2NvcmRpbmdseS5cbiAqXG4gKiAtIEZsYXQgZmlsZSBwYWNrYWdlcyBoYXZlIGFsbCB0aGUgY2xhc3NlcyBpbiBhIHNpbmdsZSBmaWxlLlxuICogLSBPdGhlciBwYWNrYWdlcyBtYXkgcmUtZXhwb3J0IGNsYXNzZXMgZnJvbSBvdGhlciBub24tZW50cnkgcG9pbnQgZmlsZXMuXG4gKiAtIFNvbWUgZm9ybWF0cyBtYXkgY29udGFpbiBtdWx0aXBsZSBcIm1vZHVsZXNcIiBpbiBhIHNpbmdsZSBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgVHJhbnNmb3JtZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNvdXJjZVBhdGg6IHN0cmluZywgcHJpdmF0ZSB0YXJnZXRQYXRoOiBzdHJpbmcpIHt9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSB0aGUgc291cmNlIChhbmQgdHlwaW5ncykgZmlsZXMgb2YgYSBidW5kbGUuXG4gICAqIEBwYXJhbSBidW5kbGUgdGhlIGJ1bmRsZSB0byB0cmFuc2Zvcm0uXG4gICAqIEByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IHRoZSBmaWxlcyB0aGF0IHdlcmUgdHJhbnNmb3JtZWQuXG4gICAqL1xuICB0cmFuc2Zvcm0oYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3QgaXNDb3JlID0gYnVuZGxlLmlzQ29yZTtcbiAgICBjb25zdCByZWZsZWN0aW9uSG9zdCA9IHRoaXMuZ2V0SG9zdChpc0NvcmUsIGJ1bmRsZSk7XG5cbiAgICAvLyBQYXJzZSBhbmQgYW5hbHl6ZSB0aGUgZmlsZXMuXG4gICAgY29uc3Qge2RlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfSA9IHRoaXMuYW5hbHl6ZVByb2dyYW0ocmVmbGVjdGlvbkhvc3QsIGlzQ29yZSwgYnVuZGxlKTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuZ2V0UmVuZGVyZXIocmVmbGVjdGlvbkhvc3QsIGlzQ29yZSwgYnVuZGxlKTtcbiAgICBjb25zdCByZW5kZXJlZEZpbGVzID0gcmVuZGVyZXIucmVuZGVyUHJvZ3JhbShcbiAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMpO1xuXG4gICAgcmV0dXJuIHJlbmRlcmVkRmlsZXM7XG4gIH1cblxuICBnZXRIb3N0KGlzQ29yZTogYm9vbGVhbiwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IGJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIHN3aXRjaCAoYnVuZGxlLmZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KGlzQ29yZSwgdHlwZUNoZWNrZXIsIGJ1bmRsZS5kdHMpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlZmxlY3Rpb25Ib3N0KGlzQ29yZSwgdHlwZUNoZWNrZXIsIGJ1bmRsZS5kdHMpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWZsZWN0aW9uIGhvc3QgZm9yIFwiJHtidW5kbGUuZm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVuZGVyZXIoaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBpc0NvcmU6IGJvb2xlYW4sIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IFJlbmRlcmVyIHtcbiAgICBzd2l0Y2ggKGJ1bmRsZS5mb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbVJlbmRlcmVyKGhvc3QsIGlzQ29yZSwgYnVuZGxlLCB0aGlzLnNvdXJjZVBhdGgsIHRoaXMudGFyZ2V0UGF0aCk7XG4gICAgICBjYXNlICdlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVuZGVyZXIoaG9zdCwgaXNDb3JlLCBidW5kbGUsIHRoaXMuc291cmNlUGF0aCwgdGhpcy50YXJnZXRQYXRoKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVuZGVyZXIgZm9yIFwiJHtidW5kbGUuZm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZVByb2dyYW0ocmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOlxuICAgICAgUHJvZ3JhbUFuYWx5c2VzIHtcbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IGJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIGNvbnN0IHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOZ2NjUmVmZXJlbmNlc1JlZ2lzdHJ5KHJlZmxlY3Rpb25Ib3N0KTtcblxuICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5emVyID0gbmV3IFN3aXRjaE1hcmtlckFuYWx5emVyKHJlZmxlY3Rpb25Ib3N0KTtcbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNlcyA9IHN3aXRjaE1hcmtlckFuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHl6ZXIgPSBuZXcgRGVjb3JhdGlvbkFuYWx5emVyKFxuICAgICAgICBidW5kbGUuc3JjLnByb2dyYW0sIGJ1bmRsZS5zcmMub3B0aW9ucywgYnVuZGxlLnNyYy5ob3N0LCB0eXBlQ2hlY2tlciwgcmVmbGVjdGlvbkhvc3QsXG4gICAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSwgYnVuZGxlLnJvb3REaXJzLCBpc0NvcmUpO1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXNlcyA9IGRlY29yYXRpb25BbmFseXplci5hbmFseXplUHJvZ3JhbSgpO1xuXG4gICAgY29uc3QgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyID1cbiAgICAgICAgYnVuZGxlLmR0cyAmJiBuZXcgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyKHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnkpO1xuICAgIGNvbnN0IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyA9IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciAmJlxuICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcblxuICAgIGNvbnN0IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplciA9XG4gICAgICAgIG5ldyBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIocmVmbGVjdGlvbkhvc3QsIHJlZmVyZW5jZXNSZWdpc3RyeSk7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzID1cbiAgICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICByZXR1cm4ge2RlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgICAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc307XG4gIH1cbn1cblxuXG5pbnRlcmZhY2UgUHJvZ3JhbUFuYWx5c2VzIHtcbiAgZGVjb3JhdGlvbkFuYWx5c2VzOiBNYXA8dHMuU291cmNlRmlsZSwgQ29tcGlsZWRGaWxlPjtcbiAgc3dpdGNoTWFya2VyQW5hbHlzZXM6IFN3aXRjaE1hcmtlckFuYWx5c2VzO1xuICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IEV4cG9ydEluZm9bXTtcbiAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8bnVsbDtcbn1cbiJdfQ==