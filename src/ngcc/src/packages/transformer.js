(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/packages/transformer", ["require", "exports", "canonical-path", "fs", "shelljs", "@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", "@angular/compiler-cli/src/ngcc/src/analysis/ngcc_references_registry", "@angular/compiler-cli/src/ngcc/src/analysis/private_declarations_analyzer", "@angular/compiler-cli/src/ngcc/src/analysis/switch_marker_analyzer", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host", "@angular/compiler-cli/src/ngcc/src/host/esm5_host", "@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer", "@angular/compiler-cli/src/ngcc/src/rendering/esm_renderer"], factory);
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
            console.warn("Compiling " + entryPoint.name + " - " + bundle.format);
            var reflectionHost = this.getHost(isCore, bundle);
            // Parse and analyze the files.
            var _a = this.analyzeProgram(reflectionHost, isCore, bundle), decorationAnalyses = _a.decorationAnalyses, switchMarkerAnalyses = _a.switchMarkerAnalyses, privateDeclarationsAnalyses = _a.privateDeclarationsAnalyses;
            // Transform the source files and source maps.
            var renderer = this.getRenderer(reflectionHost, isCore, bundle);
            var renderedFiles = renderer.renderProgram(decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses);
            // Write out all the transformed files.
            renderedFiles.forEach(function (file) { return _this.writeFile(file); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4vLi4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhY2thZ2VzL3RyYW5zZm9ybWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaURBQXVDO0lBQ3ZDLHlCQUE2QztJQUM3QyxtQ0FBa0M7SUFFbEMsdUdBQW1FO0lBQ25FLGlIQUE0RTtJQUM1RSwySEFBc0Y7SUFDdEYsNkdBQXdFO0lBQ3hFLHFGQUEyRDtJQUMzRCwrRUFBcUQ7SUFFckQsNEZBQXdEO0lBQ3hELDBGQUFzRDtJQU10RDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FvQkc7SUFDSDtRQUNFLHFCQUFvQixVQUFrQixFQUFVLFVBQWtCO1lBQTlDLGVBQVUsR0FBVixVQUFVLENBQVE7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQUcsQ0FBQztRQUV0RTs7O1dBR0c7UUFDSCwrQkFBUyxHQUFULFVBQVUsVUFBc0IsRUFBRSxNQUFlLEVBQUUsTUFBd0I7WUFBM0UsaUJBZ0JDO1lBZkMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFhLFVBQVUsQ0FBQyxJQUFJLFdBQU0sTUFBTSxDQUFDLE1BQVEsQ0FBQyxDQUFDO1lBRWhFLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXBELCtCQUErQjtZQUN6QixJQUFBLHdEQUNpRCxFQURoRCwwQ0FBa0IsRUFBRSw4Q0FBb0IsRUFBRSw0REFDTSxDQUFDO1lBRXhELDhDQUE4QztZQUM5QyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDbEUsSUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FDeEMsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsMkJB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SSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7WUFDcEMsSUFBSSxlQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNsRCxZQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN6QjtZQUNELGtCQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUEzRUQsSUEyRUM7SUEzRVksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2Rpcm5hbWV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7ZXhpc3RzU3luYywgd3JpdGVGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpciwgbXZ9IGZyb20gJ3NoZWxsanMnO1xuXG5pbXBvcnQge0RlY29yYXRpb25BbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplcic7XG5pbXBvcnQge05nY2NSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4uL2FuYWx5c2lzL25nY2NfcmVmZXJlbmNlc19yZWdpc3RyeSc7XG5pbXBvcnQge1ByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtTd2l0Y2hNYXJrZXJBbmFseXplcn0gZnJvbSAnLi4vYW5hbHlzaXMvc3dpdGNoX21hcmtlcl9hbmFseXplcic7XG5pbXBvcnQge0VzbTIwMTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc20yMDE1X2hvc3QnO1xuaW1wb3J0IHtFc201UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtNV9ob3N0JztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge0VzbTVSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbTVfcmVuZGVyZXInO1xuaW1wb3J0IHtFc21SZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbV9yZW5kZXJlcic7XG5pbXBvcnQge0ZpbGVJbmZvLCBSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcblxuaW1wb3J0IHtFbnRyeVBvaW50fSBmcm9tICcuL2VudHJ5X3BvaW50JztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9lbnRyeV9wb2ludF9idW5kbGUnO1xuXG4vKipcbiAqIEEgUGFja2FnZSBpcyBzdG9yZWQgaW4gYSBkaXJlY3Rvcnkgb24gZGlzayBhbmQgdGhhdCBkaXJlY3RvcnkgY2FuIGNvbnRhaW4gb25lIG9yIG1vcmUgcGFja2FnZVxuICogZm9ybWF0cyAtIGUuZy4gZmVzbTIwMTUsIFVNRCwgZXRjLiBBZGRpdGlvbmFsbHksIGVhY2ggcGFja2FnZSBwcm92aWRlcyB0eXBpbmdzIChgLmQudHNgIGZpbGVzKS5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgcGFja2FnZS5qc29uYCB3aGljaCBjb250YWlucyBwcm9wZXJ0aWVzIHRoYXRcbiAqIGluZGljYXRlIHdoYXQgZm9ybWF0dGVkIGJ1bmRsZXMgYXJlIGFjY2Vzc2libGUgdmlhIHRoaXMgZW5kLXBvaW50LlxuICpcbiAqIEVhY2ggYnVuZGxlIGlzIGlkZW50aWZpZWQgYnkgYSByb290IGBTb3VyY2VGaWxlYCB0aGF0IGNhbiBiZSBwYXJzZWQgYW5kIGFuYWx5emVkIHRvXG4gKiBpZGVudGlmeSBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZDsgYW5kIHRoZW4gZmluYWxseSByZW5kZXJlZCBhbmQgd3JpdHRlbiB0byBkaXNrLlxuICpcbiAqIEFsb25nIHdpdGggdGhlIHNvdXJjZSBmaWxlcywgdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIG1hcHMgKGVpdGhlciBpbmxpbmUgb3IgZXh0ZXJuYWwpIGFuZFxuICogYC5kLnRzYCBmaWxlcyBhcmUgdHJhbnNmb3JtZWQgYWNjb3JkaW5nbHkuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzb3VyY2VQYXRoOiBzdHJpbmcsIHByaXZhdGUgdGFyZ2V0UGF0aDogc3RyaW5nKSB7fVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gdGhlIHNvdXJjZSAoYW5kIHR5cGluZ3MpIGZpbGVzIG9mIGEgYnVuZGxlLlxuICAgKiBAcGFyYW0gYnVuZGxlIHRoZSBidW5kbGUgdG8gdHJhbnNmb3JtLlxuICAgKi9cbiAgdHJhbnNmb3JtKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIGlzQ29yZTogYm9vbGVhbiwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKTogdm9pZCB7XG4gICAgY29uc29sZS53YXJuKGBDb21waWxpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IC0gJHtidW5kbGUuZm9ybWF0fWApO1xuXG4gICAgY29uc3QgcmVmbGVjdGlvbkhvc3QgPSB0aGlzLmdldEhvc3QoaXNDb3JlLCBidW5kbGUpO1xuXG4gICAgLy8gUGFyc2UgYW5kIGFuYWx5emUgdGhlIGZpbGVzLlxuICAgIGNvbnN0IHtkZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXN9ID1cbiAgICAgICAgdGhpcy5hbmFseXplUHJvZ3JhbShyZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMgYW5kIHNvdXJjZSBtYXBzLlxuICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5nZXRSZW5kZXJlcihyZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCBidW5kbGUpO1xuICAgIGNvbnN0IHJlbmRlcmVkRmlsZXMgPSByZW5kZXJlci5yZW5kZXJQcm9ncmFtKFxuICAgICAgICBkZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpO1xuXG4gICAgLy8gV3JpdGUgb3V0IGFsbCB0aGUgdHJhbnNmb3JtZWQgZmlsZXMuXG4gICAgcmVuZGVyZWRGaWxlcy5mb3JFYWNoKGZpbGUgPT4gdGhpcy53cml0ZUZpbGUoZmlsZSkpO1xuICB9XG5cbiAgZ2V0SG9zdChpc0NvcmU6IGJvb2xlYW4sIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSk6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBzd2l0Y2ggKGJ1bmRsZS5mb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZWZsZWN0aW9uSG9zdChpc0NvcmUsIHR5cGVDaGVja2VyLCBidW5kbGUuZHRzKTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgY2FzZSAnZmVzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZWZsZWN0aW9uSG9zdChpc0NvcmUsIHR5cGVDaGVja2VyKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVmbGVjdGlvbiBob3N0IGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmVyKGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLCBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpOiBSZW5kZXJlciB7XG4gICAgc3dpdGNoIChidW5kbGUuZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgIGNhc2UgJ2Zlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc21SZW5kZXJlcihob3N0LCBpc0NvcmUsIGJ1bmRsZSwgdGhpcy5zb3VyY2VQYXRoLCB0aGlzLnRhcmdldFBhdGgpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmVyKGhvc3QsIGlzQ29yZSwgYnVuZGxlLCB0aGlzLnNvdXJjZVBhdGgsIHRoaXMudGFyZ2V0UGF0aCk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbmRlcmVyIGZvciBcIiR7YnVuZGxlLmZvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emVQcm9ncmFtKHJlZmxlY3Rpb25Ib3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbiwgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKSB7XG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSBidW5kbGUuc3JjLnByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBjb25zdCByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTmdjY1JlZmVyZW5jZXNSZWdpc3RyeShyZWZsZWN0aW9uSG9zdCk7XG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5emVyID0gbmV3IERlY29yYXRpb25BbmFseXplcihcbiAgICAgICAgdHlwZUNoZWNrZXIsIHJlZmxlY3Rpb25Ib3N0LCByZWZlcmVuY2VzUmVnaXN0cnksIGJ1bmRsZS5yb290RGlycywgaXNDb3JlKTtcbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXplciA9IG5ldyBTd2l0Y2hNYXJrZXJBbmFseXplcihyZWZsZWN0aW9uSG9zdCk7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyID1cbiAgICAgICAgbmV3IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXplcihyZWZsZWN0aW9uSG9zdCwgcmVmZXJlbmNlc1JlZ2lzdHJ5KTtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHlzZXMgPSBkZWNvcmF0aW9uQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0oYnVuZGxlLnNyYy5wcm9ncmFtKTtcbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNlcyA9IHN3aXRjaE1hcmtlckFuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG4gICAgY29uc3QgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzID1cbiAgICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5emVyLmFuYWx5emVQcm9ncmFtKGJ1bmRsZS5zcmMucHJvZ3JhbSk7XG4gICAgcmV0dXJuIHtkZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXN9O1xuICB9XG5cbiAgd3JpdGVGaWxlKGZpbGU6IEZpbGVJbmZvKTogdm9pZCB7XG4gICAgbWtkaXIoJy1wJywgZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICBjb25zdCBiYWNrUGF0aCA9IGZpbGUucGF0aCArICcuYmFrJztcbiAgICBpZiAoZXhpc3RzU3luYyhmaWxlLnBhdGgpICYmICFleGlzdHNTeW5jKGJhY2tQYXRoKSkge1xuICAgICAgbXYoZmlsZS5wYXRoLCBiYWNrUGF0aCk7XG4gICAgfVxuICAgIHdyaXRlRmlsZVN5bmMoZmlsZS5wYXRoLCBmaWxlLmNvbnRlbnRzLCAndXRmOCcpO1xuICB9XG59XG4iXX0=