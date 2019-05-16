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
            var renderer = this.getRenderer(reflectionHost, isCore, bundle);
            var renderedFiles = renderer.renderProgram(decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses);
            return renderedFiles;
        };
        Transformer.prototype.getHost = function (isCore, bundle) {
            var typeChecker = bundle.src.program.getTypeChecker();
            switch (bundle.format) {
                case 'esm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(this.logger, isCore, typeChecker, bundle.dts);
                case 'esm5':
                    return new esm5_host_1.Esm5ReflectionHost(this.logger, isCore, typeChecker, bundle.dts);
                default:
                    throw new Error("Reflection host for \"" + bundle.format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.getRenderer = function (host, isCore, bundle) {
            switch (bundle.format) {
                case 'esm2015':
                    return new esm_renderer_1.EsmRenderer(this.fs, this.logger, host, isCore, bundle);
                case 'esm5':
                    return new esm5_renderer_1.Esm5Renderer(this.fs, this.logger, host, isCore, bundle);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFTQSxtR0FBaUY7SUFDakYseUhBQW9IO0lBQ3BILDZHQUE0RTtJQUM1RSx1SEFBa0c7SUFDbEcseUdBQThGO0lBRTlGLGlGQUEyRDtJQUMzRCwyRUFBcUQ7SUFHckQsd0ZBQXdEO0lBQ3hELHNGQUFzRDtJQU90RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FvQkc7SUFDSDtRQUNFLHFCQUFvQixFQUFjLEVBQVUsTUFBYztZQUF0QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFHLENBQUM7UUFFOUQ7Ozs7V0FJRztRQUNILCtCQUFTLEdBQVQsVUFBVSxNQUF3QjtZQUNoQyxJQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQzdCLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXBELCtCQUErQjtZQUN6QixJQUFBLHdEQUNtRixFQURsRiwwQ0FBa0IsRUFBRSw4Q0FBb0IsRUFBRSw0REFBMkIsRUFDckUsNERBQWtGLENBQUM7WUFFMUYsOENBQThDO1lBQzlDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNsRSxJQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUN4QyxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSwyQkFBMkIsRUFDckUsMkJBQTJCLENBQUMsQ0FBQztZQUVqQyxPQUFPLGFBQWEsQ0FBQztRQUN2QixDQUFDO1FBRUQsNkJBQU8sR0FBUCxVQUFRLE1BQWUsRUFB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LDZCQUFBLEVBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0gsa0JBQUM7SUFBRCxDQUFDLEFBMUVELElBMEVDO0lBMUVZLGtDQUFXIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29tcGlsZWRGaWxlLCBEZWNvcmF0aW9uQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL2RlY29yYXRpb25fYW5hbHl6ZXInO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMsIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7TmdjY1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vYW5hbHlzaXMvbmdjY19yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7RXhwb3J0SW5mbywgUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge1N3aXRjaE1hcmtlckFuYWx5c2VzLCBTd2l0Y2hNYXJrZXJBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvc3dpdGNoX21hcmtlcl9hbmFseXplcic7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0VzbTVSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbTVfcmVuZGVyZXInO1xuaW1wb3J0IHtFc21SZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbV9yZW5kZXJlcic7XG5pbXBvcnQge0ZpbGVJbmZvLCBSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcblxuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5cblxuXG4vKipcbiAqIEEgUGFja2FnZSBpcyBzdG9yZWQgaW4gYSBkaXJlY3Rvcnkgb24gZGlzayBhbmQgdGhhdCBkaXJlY3RvcnkgY2FuIGNvbnRhaW4gb25lIG9yIG1vcmUgcGFja2FnZVxuICogZm9ybWF0cyAtIGUuZy4gZmVzbTIwMTUsIFVNRCwgZXRjLiBBZGRpdGlvbmFsbHksIGVhY2ggcGFja2FnZSBwcm92aWRlcyB0eXBpbmdzIChgLmQudHNgIGZpbGVzKS5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgcGFja2FnZS5qc29uYCB3aGljaCBjb250YWlucyBwcm9wZXJ0aWVzIHRoYXRcbiAqIGluZGljYXRlIHdoYXQgZm9ybWF0dGVkIGJ1bmRsZXMgYXJlIGFjY2Vzc2libGUgdmlhIHRoaXMgZW5kLXBvaW50LlxuICpcbiAqIEVhY2ggYnVuZGxlIGlzIGlkZW50aWZpZWQgYnkgYSByb290IGBTb3VyY2VGaWxlYCB0aGF0IGNhbiBiZSBwYXJzZWQgYW5kIGFuYWx5emVkIHRvXG4gKiBpZGVudGlmeSBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZDsgYW5kIHRoZW4gZmluYWxseSByZW5kZXJlZCBhbmQgd3JpdHRlbiB0byBkaXNrLlxuICpcbiAqIEFsb25nIHdpdGggdGhlIHNvdXJjZSBmaWxlcywgdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIG1hcHMgKGVpdGhlciBpbmxpbmUgb3IgZXh0ZXJuYWwpIGFuZFxuICogYC5kLnRzYCBmaWxlcyBhcmUgdHJhbnNmb3JtZWQgYWNjb3JkaW5nbHkuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcikge31cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHRoZSBzb3VyY2UgKGFuZCB0eXBpbmdzKSBmaWxlcyBvZiBhIGJ1bmRsZS5cbiAgICogQHBhcmFtIGJ1bmRsZSB0aGUgYnVuZGxlIHRvIHRyYW5zZm9ybS5cbiAgICogQHJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGZpbGVzIHRoYXQgd2VyZSB0cmFuc2Zvcm1lZC5cbiAgICovXG4gIHRyYW5zZm9ybShidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBpc0NvcmUgPSBidW5kbGUuaXNDb3JlO1xuICAgIGNvbnN0IHJlZmxlY3Rpb25Ib3N0ID0gdGhpcy5nZXRIb3N0KGlzQ29yZSwgYnVuZGxlKTtcblxuICAgIC8vIFBhcnNlIGFuZCBhbmFseXplIHRoZSBmaWxlcy5cbiAgICBjb25zdCB7ZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN9ID0gdGhpcy5hbmFseXplUHJvZ3JhbShyZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMgYW5kIHNvdXJjZSBtYXBzLlxuICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5nZXRSZW5kZXJlcihyZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuICAgIGNvbnN0IHJlbmRlcmVkRmlsZXMgPSByZW5kZXJlci5yZW5kZXJQcm9ncmFtKFxuICAgICAgICBkZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsXG4gICAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyk7XG5cbiAgICByZXR1cm4gcmVuZGVyZWRGaWxlcztcbiAgfVxuXG4gIGdldEhvc3QoaXNDb3JlOiBib29sZWFuLCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICAgIGNvbnN0IHR5cGVDaGVja2VyID0gYnVuZGxlLnNyYy5wcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gICAgc3dpdGNoIChidW5kbGUuZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc20yMDE1UmVmbGVjdGlvbkhvc3QodGhpcy5sb2dnZXIsIGlzQ29yZSwgdHlwZUNoZWNrZXIsIGJ1bmRsZS5kdHMpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlZmxlY3Rpb25Ib3N0KHRoaXMubG9nZ2VyLCBpc0NvcmUsIHR5cGVDaGVja2VyLCBidW5kbGUuZHRzKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVmbGVjdGlvbiBob3N0IGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmVyKGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBSZW5kZXJlciB7XG4gICAgc3dpdGNoIChidW5kbGUuZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc21SZW5kZXJlcih0aGlzLmZzLCB0aGlzLmxvZ2dlciwgaG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmVyKHRoaXMuZnMsIHRoaXMubG9nZ2VyLCBob3N0LCBpc0NvcmUsIGJ1bmRsZSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbmRlcmVyIGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emVQcm9ncmFtKHJlZmxlY3Rpb25Ib3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbiwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTpcbiAgICAgIFByb2dyYW1BbmFseXNlcyB7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBjb25zdCByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTmdjY1JlZmVyZW5jZXNSZWdpc3RyeShyZWZsZWN0aW9uSG9zdCk7XG5cbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXplciA9IG5ldyBTd2l0Y2hNYXJrZXJBbmFseXplcihyZWZsZWN0aW9uSG9zdCk7XG4gICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHlzZXMgPSBzd2l0Y2hNYXJrZXJBbmFseXplci5hbmFseXplUHJvZ3JhbShidW5kbGUuc3JjLnByb2dyYW0pO1xuXG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5emVyID0gbmV3IERlY29yYXRpb25BbmFseXplcihcbiAgICAgICAgdGhpcy5mcywgYnVuZGxlLnNyYy5wcm9ncmFtLCBidW5kbGUuc3JjLm9wdGlvbnMsIGJ1bmRsZS5zcmMuaG9zdCwgdHlwZUNoZWNrZXIsXG4gICAgICAgIHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnksIGJ1bmRsZS5yb290RGlycywgaXNDb3JlKTtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBkZWNvcmF0aW9uQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oKTtcblxuICAgIGNvbnN0IG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplciA9XG4gICAgICAgIGJ1bmRsZS5kdHMgJiYgbmV3IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXplcihyZWZsZWN0aW9uSG9zdCwgcmVmZXJlbmNlc1JlZ2lzdHJ5KTtcbiAgICBjb25zdCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgPSBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHl6ZXIgJiZcbiAgICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG5cbiAgICBjb25zdCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHl6ZXIgPVxuICAgICAgICBuZXcgUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyKHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnkpO1xuICAgIGNvbnN0IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyA9XG4gICAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplci5hbmFseXplUHJvZ3JhbShidW5kbGUuc3JjLnByb2dyYW0pO1xuXG4gICAgcmV0dXJuIHtkZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsXG4gICAgICAgICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN9O1xuICB9XG59XG5cblxuaW50ZXJmYWNlIFByb2dyYW1BbmFseXNlcyB7XG4gIGRlY29yYXRpb25BbmFseXNlczogTWFwPHRzLlNvdXJjZUZpbGUsIENvbXBpbGVkRmlsZT47XG4gIHN3aXRjaE1hcmtlckFuYWx5c2VzOiBTd2l0Y2hNYXJrZXJBbmFseXNlcztcbiAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBFeHBvcnRJbmZvW107XG4gIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlczogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfG51bGw7XG59XG4iXX0=