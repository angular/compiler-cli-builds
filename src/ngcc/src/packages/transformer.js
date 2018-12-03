(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/packages/transformer", ["require", "exports", "canonical-path", "fs", "shelljs", "@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", "@angular/compiler-cli/src/ngcc/src/analysis/ngcc_references_registry", "@angular/compiler-cli/src/ngcc/src/analysis/private_declarations_analyzer", "@angular/compiler-cli/src/ngcc/src/analysis/switch_marker_analyzer", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host", "@angular/compiler-cli/src/ngcc/src/host/esm5_host", "@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer", "@angular/compiler-cli/src/ngcc/src/rendering/esm_renderer", "@angular/compiler-cli/src/ngcc/src/packages/build_marker"], factory);
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
    var canonical_path_1 = require("canonical-path");
    var fs_1 = require("fs");
    var shelljs_1 = require("shelljs");
    var decoration_analyzer_1 = require("@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer");
    var ngcc_references_registry_1 = require("@angular/compiler-cli/src/ngcc/src/analysis/ngcc_references_registry");
    var private_declarations_analyzer_1 = require("@angular/compiler-cli/src/ngcc/src/analysis/private_declarations_analyzer");
    var switch_marker_analyzer_1 = require("@angular/compiler-cli/src/ngcc/src/analysis/switch_marker_analyzer");
    var esm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/esm2015_host");
    var esm5_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/esm5_host");
    var esm5_renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer");
    var esm_renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/esm_renderer");
    var build_marker_1 = require("@angular/compiler-cli/src/ngcc/src/packages/build_marker");
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
         */
        Transformer.prototype.transform = function (entryPoint, isCore, bundle) {
            var _this = this;
            if (build_marker_1.checkMarkerFile(entryPoint, bundle.format)) {
                console.warn("Skipping " + entryPoint.name + " : " + bundle.format + " (already built).");
                return;
            }
            console.warn("Compiling " + entryPoint.name + " - " + bundle.format);
            var reflectionHost = this.getHost(isCore, bundle);
            // Parse and analyze the files.
            var _a = this.analyzeProgram(reflectionHost, isCore, bundle), decorationAnalyses = _a.decorationAnalyses, switchMarkerAnalyses = _a.switchMarkerAnalyses, privateDeclarationsAnalyses = _a.privateDeclarationsAnalyses;
            // Transform the source files and source maps.
            var renderer = this.getRenderer(reflectionHost, isCore, bundle);
            var renderedFiles = renderer.renderProgram(decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses);
            // Write out all the transformed files.
            renderedFiles.forEach(function (file) { return _this.writeFile(file); });
            // Write the built-with-ngcc marker
            build_marker_1.writeMarkerFile(entryPoint, bundle.format);
        };
        Transformer.prototype.getHost = function (isCore, bundle) {
            var typeChecker = bundle.src.program.getTypeChecker();
            switch (bundle.format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(isCore, typeChecker, bundle.dts);
                case 'esm5':
                case 'fesm5':
                    return new esm5_host_1.Esm5ReflectionHost(isCore, typeChecker);
                default:
                    throw new Error("Reflection host for \"" + bundle.format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.getRenderer = function (host, isCore, bundle) {
            switch (bundle.format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm_renderer_1.EsmRenderer(host, isCore, bundle, this.sourcePath, this.targetPath);
                case 'esm5':
                case 'fesm5':
                    return new esm5_renderer_1.Esm5Renderer(host, isCore, bundle, this.sourcePath, this.targetPath);
                default:
                    throw new Error("Renderer for \"" + bundle.format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.analyzeProgram = function (reflectionHost, isCore, bundle) {
            var typeChecker = bundle.src.program.getTypeChecker();
            var referencesRegistry = new ngcc_references_registry_1.NgccReferencesRegistry(reflectionHost);
            var decorationAnalyzer = new decoration_analyzer_1.DecorationAnalyzer(typeChecker, reflectionHost, referencesRegistry, bundle.rootDirs, isCore);
            var switchMarkerAnalyzer = new switch_marker_analyzer_1.SwitchMarkerAnalyzer(reflectionHost);
            var privateDeclarationsAnalyzer = new private_declarations_analyzer_1.PrivateDeclarationsAnalyzer(reflectionHost, referencesRegistry);
            var decorationAnalyses = decorationAnalyzer.analyzeProgram(bundle.src.program);
            var switchMarkerAnalyses = switchMarkerAnalyzer.analyzeProgram(bundle.src.program);
            var privateDeclarationsAnalyses = privateDeclarationsAnalyzer.analyzeProgram(bundle.src.program);
            return { decorationAnalyses: decorationAnalyses, switchMarkerAnalyses: switchMarkerAnalyses, privateDeclarationsAnalyses: privateDeclarationsAnalyses };
        };
        Transformer.prototype.writeFile = function (file) {
            shelljs_1.mkdir('-p', canonical_path_1.dirname(file.path));
            var backPath = file.path + '.bak';
            if (fs_1.existsSync(file.path) && !fs_1.existsSync(backPath)) {
                shelljs_1.mv(file.path, backPath);
            }
            fs_1.writeFileSync(file.path, file.contents, 'utf8');
        };
        return Transformer;
    }());
    exports.Transformer = Transformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhY2thZ2VzL3RyYW5zZm9ybWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaURBQXVDO0lBQ3ZDLHlCQUE2QztJQUM3QyxtQ0FBa0M7SUFFbEMsdUdBQW1FO0lBQ25FLGlIQUE0RTtJQUM1RSwySEFBc0Y7SUFDdEYsNkdBQXdFO0lBQ3hFLHFGQUEyRDtJQUMzRCwrRUFBcUQ7SUFFckQsNEZBQXdEO0lBQ3hELDBGQUFzRDtJQUd0RCx5RkFBZ0U7SUFJaEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bb0JHO0lBQ0g7UUFDRSxxQkFBb0IsVUFBa0IsRUFBVSxVQUFrQjtZQUE5QyxlQUFVLEdBQVYsVUFBVSxDQUFRO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUFHLENBQUM7UUFFdEU7OztXQUdHO1FBQ0gsK0JBQVMsR0FBVCxVQUFVLFVBQXNCLEVBQUUsTUFBZSxFQUFFLE1BQXdCO1lBQTNFLGlCQXdCQztZQXZCQyxJQUFJLDhCQUFlLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDOUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFZLFVBQVUsQ0FBQyxJQUFJLFdBQU0sTUFBTSxDQUFDLE1BQU0sc0JBQW1CLENBQUMsQ0FBQztnQkFDaEYsT0FBTzthQUNSO1lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFhLFVBQVUsQ0FBQyxJQUFJLFdBQU0sTUFBTSxDQUFDLE1BQVEsQ0FBQyxDQUFDO1lBRWhFLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXBELCtCQUErQjtZQUN6QixJQUFBLHdEQUNpRCxFQURoRCwwQ0FBa0Is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QUMsT0FBTyxDQUFDLENBQUM7WUFDckYsSUFBTSwyQkFBMkIsR0FDN0IsMkJBQTJCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkUsT0FBTyxFQUFDLGtCQUFrQixvQkFBQSxFQUFFLG9CQUFvQixzQkFBQSxFQUFFLDJCQUEyQiw2QkFBQSxFQUFDLENBQUM7UUFDakYsQ0FBQztRQUVELCtCQUFTLEdBQVQsVUFBVSxJQUFjO1lBQ3RCLGVBQUssQ0FBQyxJQUFJLEVBQUUsd0JBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoQyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztZQUNwQyxJQUFJLGVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ2xELFlBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3pCO1lBQ0Qsa0JBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQW5GRCxJQW1GQztJQW5GWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7ZGlybmFtZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0IHtleGlzdHNTeW5jLCB3cml0ZUZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge21rZGlyLCBtdn0gZnJvbSAnc2hlbGxqcyc7XG5cbmltcG9ydCB7RGVjb3JhdGlvbkFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7TmdjY1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vYW5hbHlzaXMvbmdjY19yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7UHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge1N3aXRjaE1hcmtlckFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9zd2l0Y2hfbWFya2VyX2FuYWx5emVyJztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc201X2hvc3QnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7RXNtNVJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtNV9yZW5kZXJlcic7XG5pbXBvcnQge0VzbVJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtX3JlbmRlcmVyJztcbmltcG9ydCB7RmlsZUluZm8sIFJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuXG5pbXBvcnQge2NoZWNrTWFya2VyRmlsZSwgd3JpdGVNYXJrZXJGaWxlfSBmcm9tICcuL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge0VudHJ5UG9pbnR9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5cbi8qKlxuICogQSBQYWNrYWdlIGlzIHN0b3JlZCBpbiBhIGRpcmVjdG9yeSBvbiBkaXNrIGFuZCB0aGF0IGRpcmVjdG9yeSBjYW4gY29udGFpbiBvbmUgb3IgbW9yZSBwYWNrYWdlXG4gKiBmb3JtYXRzIC0gZS5nLiBmZXNtMjAxNSwgVU1ELCBldGMuIEFkZGl0aW9uYWxseSwgZWFjaCBwYWNrYWdlIHByb3ZpZGVzIHR5cGluZ3MgKGAuZC50c2AgZmlsZXMpLlxuICpcbiAqIEVhY2ggb2YgdGhlc2UgZm9ybWF0cyBleHBvc2VzIG9uZSBvciBtb3JlIGVudHJ5IHBvaW50cywgd2hpY2ggYXJlIHNvdXJjZSBmaWxlcyB0aGF0IG5lZWQgdG8gYmVcbiAqIHBhcnNlZCB0byBpZGVudGlmeSB0aGUgZGVjb3JhdGVkIGV4cG9ydGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGFuYWx5emVkIGFuZCBjb21waWxlZCBieSBvbmUgb3JcbiAqIG1vcmUgYERlY29yYXRvckhhbmRsZXJgIG9iamVjdHMuXG4gKlxuICogRWFjaCBlbnRyeSBwb2ludCB0byBhIHBhY2thZ2UgaXMgaWRlbnRpZmllZCBieSBhIGBwYWNrYWdlLmpzb25gIHdoaWNoIGNvbnRhaW5zIHByb3BlcnRpZXMgdGhhdFxuICogaW5kaWNhdGUgd2hhdCBmb3JtYXR0ZWQgYnVuZGxlcyBhcmUgYWNjZXNzaWJsZSB2aWEgdGhpcyBlbmQtcG9pbnQuXG4gKlxuICogRWFjaCBidW5kbGUgaXMgaWRlbnRpZmllZCBieSBhIHJvb3QgYFNvdXJjZUZpbGVgIHRoYXQgY2FuIGJlIHBhcnNlZCBhbmQgYW5hbHl6ZWQgdG9cbiAqIGlkZW50aWZ5IGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkOyBhbmQgdGhlbiBmaW5hbGx5IHJlbmRlcmVkIGFuZCB3cml0dGVuIHRvIGRpc2suXG4gKlxuICogQWxvbmcgd2l0aCB0aGUgc291cmNlIGZpbGVzLCB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgbWFwcyAoZWl0aGVyIGlubGluZSBvciBleHRlcm5hbCkgYW5kXG4gKiBgLmQudHNgIGZpbGVzIGFyZSB0cmFuc2Zvcm1lZCBhY2NvcmRpbmdseS5cbiAqXG4gKiAtIEZsYXQgZmlsZSBwYWNrYWdlcyBoYXZlIGFsbCB0aGUgY2xhc3NlcyBpbiBhIHNpbmdsZSBmaWxlLlxuICogLSBPdGhlciBwYWNrYWdlcyBtYXkgcmUtZXhwb3J0IGNsYXNzZXMgZnJvbSBvdGhlciBub24tZW50cnkgcG9pbnQgZmlsZXMuXG4gKiAtIFNvbWUgZm9ybWF0cyBtYXkgY29udGFpbiBtdWx0aXBsZSBcIm1vZHVsZXNcIiBpbiBhIHNpbmdsZSBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgVHJhbnNmb3JtZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNvdXJjZVBhdGg6IHN0cmluZywgcHJpdmF0ZSB0YXJnZXRQYXRoOiBzdHJpbmcpIHt9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybSB0aGUgc291cmNlIChhbmQgdHlwaW5ncykgZmlsZXMgb2YgYSBidW5kbGUuXG4gICAqIEBwYXJhbSBidW5kbGUgdGhlIGJ1bmRsZSB0byB0cmFuc2Zvcm0uXG4gICAqL1xuICB0cmFuc2Zvcm0oZW50cnlQb2ludDogRW50cnlQb2ludCwgaXNDb3JlOiBib29sZWFuLCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiB2b2lkIHtcbiAgICBpZiAoY2hlY2tNYXJrZXJGaWxlKGVudHJ5UG9pbnQsIGJ1bmRsZS5mb3JtYXQpKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7YnVuZGxlLmZvcm1hdH0gKGFscmVhZHkgYnVpbHQpLmApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUud2FybihgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSAtICR7YnVuZGxlLmZvcm1hdH1gKTtcblxuICAgIGNvbnN0IHJlZmxlY3Rpb25Ib3N0ID0gdGhpcy5nZXRIb3N0KGlzQ29yZSwgYnVuZGxlKTtcblxuICAgIC8vIFBhcnNlIGFuZCBhbmFseXplIHRoZSBmaWxlcy5cbiAgICBjb25zdCB7ZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzfSA9XG4gICAgICAgIHRoaXMuYW5hbHl6ZVByb2dyYW0ocmVmbGVjdGlvbkhvc3QsIGlzQ29yZSwgYnVuZGxlKTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuZ2V0UmVuZGVyZXIocmVmbGVjdGlvbkhvc3QsIGlzQ29yZSwgYnVuZGxlKTtcbiAgICBjb25zdCByZW5kZXJlZEZpbGVzID0gcmVuZGVyZXIucmVuZGVyUHJvZ3JhbShcbiAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTtcblxuICAgIC8vIFdyaXRlIG91dCBhbGwgdGhlIHRyYW5zZm9ybWVkIGZpbGVzLlxuICAgIHJlbmRlcmVkRmlsZXMuZm9yRWFjaChmaWxlID0+IHRoaXMud3JpdGVGaWxlKGZpbGUpKTtcblxuICAgIC8vIFdyaXRlIHRoZSBidWlsdC13aXRoLW5nY2MgbWFya2VyXG4gICAgd3JpdGVNYXJrZXJGaWxlKGVudHJ5UG9pbnQsIGJ1bmRsZS5mb3JtYXQpO1xuICB9XG5cbiAgZ2V0SG9zdChpc0NvcmU6IGJvb2xlYW4sIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBzd2l0Y2ggKGJ1bmRsZS5mb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZWZsZWN0aW9uSG9zdChpc0NvcmUsIHR5cGVDaGVja2VyLCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgY2FzZSAnZmVzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZWZsZWN0aW9uSG9zdChpc0NvcmUsIHR5cGVDaGVja2VyKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVmbGVjdGlvbiBob3N0IGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmVyKGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBSZW5kZXJlciB7XG4gICAgc3dpdGNoIChidW5kbGUuZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgIGNhc2UgJ2Zlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc21SZW5kZXJlcihob3N0LCBpc0NvcmUsIGJ1bmRsZSwgdGhpcy5zb3VyY2VQYXRoLCB0aGlzLnRhcmdldFBhdGgpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmVyKGhvc3QsIGlzQ29yZSwgYnVuZGxlLCB0aGlzLnNvdXJjZVBhdGgsIHRoaXMudGFyZ2V0UGF0aCk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbmRlcmVyIGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emVQcm9ncmFtKHJlZmxlY3Rpb25Ib3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbiwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKSB7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBjb25zdCByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTmdjY1JlZmVyZW5jZXNSZWdpc3RyeShyZWZsZWN0aW9uSG9zdCk7XG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5emVyID0gbmV3IERlY29yYXRpb25BbmFseXplcihcbiAgICAgICAgdHlwZUNoZWNrZXIsIHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnksIGJ1bmRsZS5yb290RGlycywgaXNDb3JlKTtcbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXplciA9IG5ldyBTd2l0Y2hNYXJrZXJBbmFseXplcihyZWZsZWN0aW9uSG9zdCk7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyID1cbiAgICAgICAgbmV3IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplcihyZWZsZWN0aW9uSG9zdCwgcmVmZXJlbmNlc1JlZ2lzdHJ5KTtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBkZWNvcmF0aW9uQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNlcyA9IHN3aXRjaE1hcmtlckFuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzID1cbiAgICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG4gICAgcmV0dXJuIHtkZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXN9O1xuICB9XG5cbiAgd3JpdGVGaWxlKGZpbGU6IEZpbGVJbmZvKTogdm9pZCB7XG4gICAgbWtkaXIoJy1wJywgZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICBjb25zdCBiYWNrUGF0aCA9IGZpbGUucGF0aCArICcuYmFrJztcbiAgICBpZiAoZXhpc3RzU3luYyhmaWxlLnBhdGgpICYmICFleGlzdHNTeW5jKGJhY2tQYXRoKSkge1xuICAgICAgbXYoZmlsZS5wYXRoLCBiYWNrUGF0aCk7XG4gICAgfVxuICAgIHdyaXRlRmlsZVN5bmMoZmlsZS5wYXRoLCBmaWxlLmNvbnRlbnRzLCAndXRmOCcpO1xuICB9XG59XG4iXX0=