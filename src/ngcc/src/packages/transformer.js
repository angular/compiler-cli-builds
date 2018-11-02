(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/packages/transformer", ["require", "exports", "tslib", "canonical-path", "fs", "shelljs", "typescript", "@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", "@angular/compiler-cli/src/ngcc/src/analysis/switch_marker_analyzer", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host", "@angular/compiler-cli/src/ngcc/src/host/esm5_host", "@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer", "@angular/compiler-cli/src/ngcc/src/rendering/esm_renderer", "@angular/compiler-cli/src/ngcc/src/packages/build_marker"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
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
    var ts = require("typescript");
    var decoration_analyzer_1 = require("@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer");
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
     * Each entry point to a package is identified by a `SourceFile` that can be parsed and analyzed to
     * identify classes that need to be transformed; and then finally rendered and written to disk.
     * The actual file which needs to be transformed depends upon the package format.
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
        Transformer.prototype.transform = function (entryPoint, format, transformDts) {
            var _this = this;
            if (build_marker_1.checkMarkerFile(entryPoint, format)) {
                console.warn("Skipping " + entryPoint.name + " : " + format + " (already built).");
                return;
            }
            var entryPointFilePath = entryPoint[format];
            if (!entryPointFilePath) {
                console.warn("Skipping " + entryPoint.name + " : " + format + " (no entry point file for this format).");
                return;
            }
            console.warn("Compiling " + entryPoint.name + " - " + format);
            var options = {
                allowJs: true,
                maxNodeModuleJsDepth: Infinity,
                rootDir: entryPoint.path,
            };
            // Create the TS program and necessary helpers.
            // TODO : create a custom compiler host that reads from .bak files if available.
            var host = ts.createCompilerHost(options);
            var rootDirs = this.getRootDirs(host, options);
            var isCore = entryPoint.name === '@angular/core';
            var r3SymbolsPath = isCore ? this.findR3SymbolsPath(canonical_path_1.dirname(entryPointFilePath)) : null;
            var rootPaths = r3SymbolsPath ? [entryPointFilePath, r3SymbolsPath] : [entryPointFilePath];
            var packageProgram = ts.createProgram(rootPaths, options, host);
            console.time(entryPoint.name + '(dtsmappper creation)');
            var dtsFilePath = entryPoint.typings;
            var dtsProgram = transformDts ? ts.createProgram([entryPoint.typings], options, host) : null;
            console.timeEnd(entryPoint.name + '(dtsmappper creation)');
            var reflectionHost = this.getHost(isCore, format, packageProgram, dtsFilePath, dtsProgram);
            var r3SymbolsFile = r3SymbolsPath && packageProgram.getSourceFile(r3SymbolsPath) || null;
            // Parse and analyze the files.
            var _a = this.analyzeProgram(packageProgram, reflectionHost, rootDirs, isCore), decorationAnalyses = _a.decorationAnalyses, switchMarkerAnalyses = _a.switchMarkerAnalyses;
            console.time(entryPoint.name + '(rendering)');
            // Transform the source files and source maps.
            var renderer = this.getRenderer(format, packageProgram, reflectionHost, isCore, r3SymbolsFile, transformDts);
            var renderedFiles = renderer.renderProgram(packageProgram, decorationAnalyses, switchMarkerAnalyses);
            console.timeEnd(entryPoint.name + '(rendering)');
            // Write out all the transformed files.
            renderedFiles.forEach(function (file) { return _this.writeFile(file); });
            // Write the built-with-ngcc marker
            build_marker_1.writeMarkerFile(entryPoint, format);
        };
        Transformer.prototype.getRootDirs = function (host, options) {
            if (options.rootDirs !== undefined) {
                return options.rootDirs;
            }
            else if (options.rootDir !== undefined) {
                return [options.rootDir];
            }
            else {
                return [host.getCurrentDirectory()];
            }
        };
        Transformer.prototype.getHost = function (isCore, format, program, dtsFilePath, dtsProgram) {
            switch (format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(isCore, program.getTypeChecker(), dtsFilePath, dtsProgram);
                case 'esm5':
                case 'fesm5':
                    return new esm5_host_1.Esm5ReflectionHost(isCore, program.getTypeChecker());
                default:
                    throw new Error("Relection host for \"" + format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.getRenderer = function (format, program, host, isCore, rewriteCoreImportsTo, transformDts) {
            switch (format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm_renderer_1.EsmRenderer(host, isCore, rewriteCoreImportsTo, this.sourcePath, this.targetPath, transformDts);
                case 'esm5':
                case 'fesm5':
                    return new esm5_renderer_1.Esm5Renderer(host, isCore, rewriteCoreImportsTo, this.sourcePath, this.targetPath, transformDts);
                default:
                    throw new Error("Renderer for \"" + format + "\" not yet implemented.");
            }
        };
        Transformer.prototype.analyzeProgram = function (program, reflectionHost, rootDirs, isCore) {
            var decorationAnalyzer = new decoration_analyzer_1.DecorationAnalyzer(program.getTypeChecker(), reflectionHost, rootDirs, isCore);
            var switchMarkerAnalyzer = new switch_marker_analyzer_1.SwitchMarkerAnalyzer(reflectionHost);
            return {
                decorationAnalyses: decorationAnalyzer.analyzeProgram(program),
                switchMarkerAnalyses: switchMarkerAnalyzer.analyzeProgram(program),
            };
        };
        Transformer.prototype.writeFile = function (file) {
            shelljs_1.mkdir('-p', canonical_path_1.dirname(file.path));
            var backPath = file.path + '.bak';
            if (fs_1.existsSync(file.path) && !fs_1.existsSync(backPath)) {
                shelljs_1.mv(file.path, backPath);
            }
            fs_1.writeFileSync(file.path, file.contents, 'utf8');
        };
        Transformer.prototype.findR3SymbolsPath = function (directory) {
            var e_1, _a;
            var r3SymbolsFilePath = canonical_path_1.resolve(directory, 'r3_symbols.js');
            if (fs_1.existsSync(r3SymbolsFilePath)) {
                return r3SymbolsFilePath;
            }
            var subDirectories = fs_1.readdirSync(directory)
                // Not interested in hidden files
                .filter(function (p) { return !p.startsWith('.'); })
                // Ignore node_modules
                .filter(function (p) { return p !== 'node_modules'; })
                // Only interested in directories (and only those that are not symlinks)
                .filter(function (p) {
                var stat = fs_1.lstatSync(canonical_path_1.resolve(directory, p));
                return stat.isDirectory() && !stat.isSymbolicLink();
            });
            try {
                for (var subDirectories_1 = tslib_1.__values(subDirectories), subDirectories_1_1 = subDirectories_1.next(); !subDirectories_1_1.done; subDirectories_1_1 = subDirectories_1.next()) {
                    var subDirectory = subDirectories_1_1.value;
                    var r3SymbolsFilePath_1 = this.findR3SymbolsPath(canonical_path_1.resolve(directory, subDirectory));
                    if (r3SymbolsFilePath_1) {
                        return r3SymbolsFilePath_1;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (subDirectories_1_1 && !subDirectories_1_1.done && (_a = subDirectories_1.return)) _a.call(subDirectories_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
        return Transformer;
    }());
    exports.Transformer = Transformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhY2thZ2VzL3RyYW5zZm9ybWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlEQUFnRDtJQUNoRCx5QkFBcUU7SUFDckUsbUNBQWtDO0lBQ2xDLCtCQUFpQztJQUVqQyx1R0FBbUU7SUFDbkUsNkdBQXdFO0lBQ3hFLHFGQUEyRDtJQUMzRCwrRUFBcUQ7SUFFckQsNEZBQXdEO0lBQ3hELDBGQUFzRDtJQUd0RCx5RkFBZ0U7SUFHaEU7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQWtCRztJQUNIO1FBQ0UscUJBQW9CLFVBQWtCLEVBQVUsVUFBa0I7WUFBOUMsZUFBVSxHQUFWLFVBQVUsQ0FBUTtZQUFVLGVBQVUsR0FBVixVQUFVLENBQVE7UUFBRyxDQUFDO1FBRXRFLCtCQUFTLEdBQVQsVUFBVSxVQUFzQixFQUFFLE1BQXdCLEVBQUUsWUFBcUI7WUFBakYsaUJBcURDO1lBcERDLElBQUksOEJBQWUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBWSxVQUFVLENBQUMsSUFBSSxXQUFNLE1BQU0sc0JBQW1CLENBQUMsQ0FBQztnQkFDekUsT0FBTzthQUNSO1lBRUQsSUFBTSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFO2dCQUN2QixPQUFPLENBQUMsSUFBSSxDQUNSLGNBQVksVUFBVSxDQUFDLElBQUksV0FBTSxNQUFNLDRDQUF5QyxDQUFDLENBQUM7Z0JBQ3RGLE9BQU87YUFDUjtZQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBYSxVQUFVLENBQUMsSUFBSSxXQUFNLE1BQVEsQ0FBQyxDQUFD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QUFDO1lBQzlELElBQUksZUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7Z0JBQ2pDLE9BQU8saUJBQWlCLENBQUM7YUFDMUI7WUFFRCxJQUFNLGNBQWMsR0FDaEIsZ0JBQVcsQ0FBQyxTQUFTLENBQUM7Z0JBQ2xCLGlDQUFpQztpQkFDaEMsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFsQixDQUFrQixDQUFDO2dCQUNoQyxzQkFBc0I7aUJBQ3JCLE1BQU0sQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsS0FBSyxjQUFjLEVBQXBCLENBQW9CLENBQUM7Z0JBQ2xDLHdFQUF3RTtpQkFDdkUsTUFBTSxDQUFDLFVBQUEsQ0FBQztnQkFDUCxJQUFNLElBQUksR0FBRyxjQUFTLENBQUMsd0JBQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdEQsQ0FBQyxDQUFDLENBQUM7O2dCQUVYLEtBQTJCLElBQUEsbUJBQUEsaUJBQUEsY0FBYyxDQUFBLDhDQUFBLDBFQUFFO29CQUF0QyxJQUFNLFlBQVksMkJBQUE7b0JBQ3JCLElBQU0sbUJBQWlCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHdCQUFPLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQ25GLElBQUksbUJBQWlCLEVBQUU7d0JBQ3JCLE9BQU8sbUJBQWlCLENBQUM7cUJBQzFCO2lCQUNGOzs7Ozs7Ozs7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUFwSkQsSUFvSkM7SUFwSlksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2Rpcm5hbWUsIHJlc29sdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7ZXhpc3RzU3luYywgbHN0YXRTeW5jLCByZWFkZGlyU3luYywgd3JpdGVGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpciwgbXZ9IGZyb20gJ3NoZWxsanMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdGlvbkFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7U3dpdGNoTWFya2VyQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTVfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtFc201UmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc201X3JlbmRlcmVyJztcbmltcG9ydCB7RXNtUmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc21fcmVuZGVyZXInO1xuaW1wb3J0IHtGaWxlSW5mbywgUmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9yZW5kZXJlcic7XG5cbmltcG9ydCB7Y2hlY2tNYXJrZXJGaWxlLCB3cml0ZU1hcmtlckZpbGV9IGZyb20gJy4vYnVpbGRfbWFya2VyJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cbi8qKlxuICogQSBQYWNrYWdlIGlzIHN0b3JlZCBpbiBhIGRpcmVjdG9yeSBvbiBkaXNrIGFuZCB0aGF0IGRpcmVjdG9yeSBjYW4gY29udGFpbiBvbmUgb3IgbW9yZSBwYWNrYWdlXG4gKiBmb3JtYXRzIC0gZS5nLiBmZXNtMjAxNSwgVU1ELCBldGMuIEFkZGl0aW9uYWxseSwgZWFjaCBwYWNrYWdlIHByb3ZpZGVzIHR5cGluZ3MgKGAuZC50c2AgZmlsZXMpLlxuICpcbiAqIEVhY2ggb2YgdGhlc2UgZm9ybWF0cyBleHBvc2VzIG9uZSBvciBtb3JlIGVudHJ5IHBvaW50cywgd2hpY2ggYXJlIHNvdXJjZSBmaWxlcyB0aGF0IG5lZWQgdG8gYmVcbiAqIHBhcnNlZCB0byBpZGVudGlmeSB0aGUgZGVjb3JhdGVkIGV4cG9ydGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGFuYWx5emVkIGFuZCBjb21waWxlZCBieSBvbmUgb3JcbiAqIG1vcmUgYERlY29yYXRvckhhbmRsZXJgIG9iamVjdHMuXG4gKlxuICogRWFjaCBlbnRyeSBwb2ludCB0byBhIHBhY2thZ2UgaXMgaWRlbnRpZmllZCBieSBhIGBTb3VyY2VGaWxlYCB0aGF0IGNhbiBiZSBwYXJzZWQgYW5kIGFuYWx5emVkIHRvXG4gKiBpZGVudGlmeSBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZDsgYW5kIHRoZW4gZmluYWxseSByZW5kZXJlZCBhbmQgd3JpdHRlbiB0byBkaXNrLlxuICogVGhlIGFjdHVhbCBmaWxlIHdoaWNoIG5lZWRzIHRvIGJlIHRyYW5zZm9ybWVkIGRlcGVuZHMgdXBvbiB0aGUgcGFja2FnZSBmb3JtYXQuXG4gKlxuICogQWxvbmcgd2l0aCB0aGUgc291cmNlIGZpbGVzLCB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgbWFwcyAoZWl0aGVyIGlubGluZSBvciBleHRlcm5hbCkgYW5kXG4gKiBgLmQudHNgIGZpbGVzIGFyZSB0cmFuc2Zvcm1lZCBhY2NvcmRpbmdseS5cbiAqXG4gKiAtIEZsYXQgZmlsZSBwYWNrYWdlcyBoYXZlIGFsbCB0aGUgY2xhc3NlcyBpbiBhIHNpbmdsZSBmaWxlLlxuICogLSBPdGhlciBwYWNrYWdlcyBtYXkgcmUtZXhwb3J0IGNsYXNzZXMgZnJvbSBvdGhlciBub24tZW50cnkgcG9pbnQgZmlsZXMuXG4gKiAtIFNvbWUgZm9ybWF0cyBtYXkgY29udGFpbiBtdWx0aXBsZSBcIm1vZHVsZXNcIiBpbiBhIHNpbmdsZSBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgVHJhbnNmb3JtZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNvdXJjZVBhdGg6IHN0cmluZywgcHJpdmF0ZSB0YXJnZXRQYXRoOiBzdHJpbmcpIHt9XG5cbiAgdHJhbnNmb3JtKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIGZvcm1hdDogRW50cnlQb2ludEZvcm1hdCwgdHJhbnNmb3JtRHRzOiBib29sZWFuKTogdm9pZCB7XG4gICAgaWYgKGNoZWNrTWFya2VyRmlsZShlbnRyeVBvaW50LCBmb3JtYXQpKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0fSAoYWxyZWFkeSBidWlsdCkuYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZW50cnlQb2ludEZpbGVQYXRoID0gZW50cnlQb2ludFtmb3JtYXRdO1xuICAgIGlmICghZW50cnlQb2ludEZpbGVQYXRoKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0fSAobm8gZW50cnkgcG9pbnQgZmlsZSBmb3IgdGhpcyBmb3JtYXQpLmApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUud2FybihgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSAtICR7Zm9ybWF0fWApO1xuXG4gICAgY29uc3Qgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zID0ge1xuICAgICAgYWxsb3dKczogdHJ1ZSxcbiAgICAgIG1heE5vZGVNb2R1bGVKc0RlcHRoOiBJbmZpbml0eSxcbiAgICAgIHJvb3REaXI6IGVudHJ5UG9pbnQucGF0aCxcbiAgICB9O1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBUUyBwcm9ncmFtIGFuZCBuZWNlc3NhcnkgaGVscGVycy5cbiAgICAvLyBUT0RPIDogY3JlYXRlIGEgY3VzdG9tIGNvbXBpbGVyIGhvc3QgdGhhdCByZWFkcyBmcm9tIC5iYWsgZmlsZXMgaWYgYXZhaWxhYmxlLlxuICAgIGNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3Qob3B0aW9ucyk7XG4gICAgY29uc3Qgcm9vdERpcnMgPSB0aGlzLmdldFJvb3REaXJzKGhvc3QsIG9wdGlvbnMpO1xuICAgIGNvbnN0IGlzQ29yZSA9IGVudHJ5UG9pbnQubmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xuICAgIGNvbnN0IHIzU3ltYm9sc1BhdGggPSBpc0NvcmUgPyB0aGlzLmZpbmRSM1N5bWJvbHNQYXRoKGRpcm5hbWUoZW50cnlQb2ludEZpbGVQYXRoKSkgOiBudWxsO1xuICAgIGNvbnN0IHJvb3RQYXRocyA9IHIzU3ltYm9sc1BhdGggPyBbZW50cnlQb2ludEZpbGVQYXRoLCByM1N5bWJvbHNQYXRoXSA6IFtlbnRyeVBvaW50RmlsZVBhdGhdO1xuICAgIGNvbnN0IHBhY2thZ2VQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290UGF0aHMsIG9wdGlvbnMsIGhvc3QpO1xuICAgIGNvbnNvbGUudGltZShlbnRyeVBvaW50Lm5hbWUgKyAnKGR0c21hcHBwZXIgY3JlYXRpb24pJyk7XG4gICAgY29uc3QgZHRzRmlsZVBhdGggPSBlbnRyeVBvaW50LnR5cGluZ3M7XG4gICAgY29uc3QgZHRzUHJvZ3JhbSA9IHRyYW5zZm9ybUR0cyA/IHRzLmNyZWF0ZVByb2dyYW0oW2VudHJ5UG9pbnQudHlwaW5nc10sIG9wdGlvbnMsIGhvc3QpIDogbnVsbDtcbiAgICBjb25zb2xlLnRpbWVFbmQoZW50cnlQb2ludC5uYW1lICsgJyhkdHNtYXBwcGVyIGNyZWF0aW9uKScpO1xuICAgIGNvbnN0IHJlZmxlY3Rpb25Ib3N0ID0gdGhpcy5nZXRIb3N0KGlzQ29yZSwgZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgZHRzRmlsZVBhdGgsIGR0c1Byb2dyYW0pO1xuICAgIGNvbnN0IHIzU3ltYm9sc0ZpbGUgPSByM1N5bWJvbHNQYXRoICYmIHBhY2thZ2VQcm9ncmFtLmdldFNvdXJjZUZpbGUocjNTeW1ib2xzUGF0aCkgfHwgbnVsbDtcblxuICAgIC8vIFBhcnNlIGFuZCBhbmFseXplIHRoZSBmaWxlcy5cbiAgICBjb25zdCB7ZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlc30gPVxuICAgICAgICB0aGlzLmFuYWx5emVQcm9ncmFtKHBhY2thZ2VQcm9ncmFtLCByZWZsZWN0aW9uSG9zdCwgcm9vdERpcnMsIGlzQ29yZSk7XG5cbiAgICBjb25zb2xlLnRpbWUoZW50cnlQb2ludC5uYW1lICsgJyhyZW5kZXJpbmcpJyk7XG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMgYW5kIHNvdXJjZSBtYXBzLlxuICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5nZXRSZW5kZXJlcihcbiAgICAgICAgZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3QsIGlzQ29yZSwgcjNTeW1ib2xzRmlsZSwgdHJhbnNmb3JtRHRzKTtcbiAgICBjb25zdCByZW5kZXJlZEZpbGVzID1cbiAgICAgICAgcmVuZGVyZXIucmVuZGVyUHJvZ3JhbShwYWNrYWdlUHJvZ3JhbSwgZGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlcyk7XG4gICAgY29uc29sZS50aW1lRW5kKGVudHJ5UG9pbnQubmFtZSArICcocmVuZGVyaW5nKScpO1xuXG4gICAgLy8gV3JpdGUgb3V0IGFsbCB0aGUgdHJhbnNmb3JtZWQgZmlsZXMuXG4gICAgcmVuZGVyZWRGaWxlcy5mb3JFYWNoKGZpbGUgPT4gdGhpcy53cml0ZUZpbGUoZmlsZSkpO1xuXG4gICAgLy8gV3JpdGUgdGhlIGJ1aWx0LXdpdGgtbmdjYyBtYXJrZXJcbiAgICB3cml0ZU1hcmtlckZpbGUoZW50cnlQb2ludCwgZm9ybWF0KTtcbiAgfVxuXG4gIGdldFJvb3REaXJzKGhvc3Q6IHRzLkNvbXBpbGVySG9zdCwgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMucm9vdERpcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMucm9vdERpcnM7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLnJvb3REaXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIFtvcHRpb25zLnJvb3REaXJdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW2hvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpXTtcbiAgICB9XG4gIH1cblxuICBnZXRIb3N0KFxuICAgICAgaXNDb3JlOiBib29sZWFuLCBmb3JtYXQ6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgZHRzRmlsZVBhdGg6IHN0cmluZyxcbiAgICAgIGR0c1Byb2dyYW06IHRzLlByb2dyYW18bnVsbCk6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZWZsZWN0aW9uSG9zdChpc0NvcmUsIHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgZHRzRmlsZVBhdGgsIGR0c1Byb2dyYW0pO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlZmxlY3Rpb25Ib3N0KGlzQ29yZSwgcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVsZWN0aW9uIGhvc3QgZm9yIFwiJHtmb3JtYXR9XCIgbm90IHlldCBpbXBsZW1lbnRlZC5gKTtcbiAgICB9XG4gIH1cblxuICBnZXRSZW5kZXJlcihcbiAgICAgIGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHJld3JpdGVDb3JlSW1wb3J0c1RvOiB0cy5Tb3VyY2VGaWxlfG51bGwsIHRyYW5zZm9ybUR0czogYm9vbGVhbik6IFJlbmRlcmVyIHtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtUmVuZGVyZXIoXG4gICAgICAgICAgICBob3N0LCBpc0NvcmUsIHJld3JpdGVDb3JlSW1wb3J0c1RvLCB0aGlzLnNvdXJjZVBhdGgsIHRoaXMudGFyZ2V0UGF0aCwgdHJhbnNmb3JtRHRzKTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgY2FzZSAnZmVzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZW5kZXJlcihcbiAgICAgICAgICAgIGhvc3QsIGlzQ29yZSwgcmV3cml0ZUNvcmVJbXBvcnRzVG8sIHRoaXMuc291cmNlUGF0aCwgdGhpcy50YXJnZXRQYXRoLCB0cmFuc2Zvcm1EdHMpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZW5kZXJlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emVQcm9ncmFtKFxuICAgICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcm9vdERpcnM6IHN0cmluZ1tdLFxuICAgICAgaXNDb3JlOiBib29sZWFuKSB7XG4gICAgY29uc3QgZGVjb3JhdGlvbkFuYWx5emVyID1cbiAgICAgICAgbmV3IERlY29yYXRpb25BbmFseXplcihwcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIHJlZmxlY3Rpb25Ib3N0LCByb290RGlycywgaXNDb3JlKTtcbiAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXplciA9IG5ldyBTd2l0Y2hNYXJrZXJBbmFseXplcihyZWZsZWN0aW9uSG9zdCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRlY29yYXRpb25BbmFseXNlczogZGVjb3JhdGlvbkFuYWx5emVyLmFuYWx5emVQcm9ncmFtKHByb2dyYW0pLFxuICAgICAgc3dpdGNoTWFya2VyQW5hbHlzZXM6IHN3aXRjaE1hcmtlckFuYWx5emVyLmFuYWx5emVQcm9ncmFtKHByb2dyYW0pLFxuICAgIH07XG4gIH1cblxuICB3cml0ZUZpbGUoZmlsZTogRmlsZUluZm8pOiB2b2lkIHtcbiAgICBta2RpcignLXAnLCBkaXJuYW1lKGZpbGUucGF0aCkpO1xuICAgIGNvbnN0IGJhY2tQYXRoID0gZmlsZS5wYXRoICsgJy5iYWsnO1xuICAgIGlmIChleGlzdHNTeW5jKGZpbGUucGF0aCkgJiYgIWV4aXN0c1N5bmMoYmFja1BhdGgpKSB7XG4gICAgICBtdihmaWxlLnBhdGgsIGJhY2tQYXRoKTtcbiAgICB9XG4gICAgd3JpdGVGaWxlU3luYyhmaWxlLnBhdGgsIGZpbGUuY29udGVudHMsICd1dGY4Jyk7XG4gIH1cblxuICBmaW5kUjNTeW1ib2xzUGF0aChkaXJlY3Rvcnk6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCByM1N5bWJvbHNGaWxlUGF0aCA9IHJlc29sdmUoZGlyZWN0b3J5LCAncjNfc3ltYm9scy5qcycpO1xuICAgIGlmIChleGlzdHNTeW5jKHIzU3ltYm9sc0ZpbGVQYXRoKSkge1xuICAgICAgcmV0dXJuIHIzU3ltYm9sc0ZpbGVQYXRoO1xuICAgIH1cblxuICAgIGNvbnN0IHN1YkRpcmVjdG9yaWVzID1cbiAgICAgICAgcmVhZGRpclN5bmMoZGlyZWN0b3J5KVxuICAgICAgICAgICAgLy8gTm90IGludGVyZXN0ZWQgaW4gaGlkZGVuIGZpbGVzXG4gICAgICAgICAgICAuZmlsdGVyKHAgPT4gIXAuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICAgICAgLy8gSWdub3JlIG5vZGVfbW9kdWxlc1xuICAgICAgICAgICAgLmZpbHRlcihwID0+IHAgIT09ICdub2RlX21vZHVsZXMnKVxuICAgICAgICAgICAgLy8gT25seSBpbnRlcmVzdGVkIGluIGRpcmVjdG9yaWVzIChhbmQgb25seSB0aG9zZSB0aGF0IGFyZSBub3Qgc3ltbGlua3MpXG4gICAgICAgICAgICAuZmlsdGVyKHAgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gbHN0YXRTeW5jKHJlc29sdmUoZGlyZWN0b3J5LCBwKSk7XG4gICAgICAgICAgICAgIHJldHVybiBzdGF0LmlzRGlyZWN0b3J5KCkgJiYgIXN0YXQuaXNTeW1ib2xpY0xpbmsoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgZm9yIChjb25zdCBzdWJEaXJlY3Rvcnkgb2Ygc3ViRGlyZWN0b3JpZXMpIHtcbiAgICAgIGNvbnN0IHIzU3ltYm9sc0ZpbGVQYXRoID0gdGhpcy5maW5kUjNTeW1ib2xzUGF0aChyZXNvbHZlKGRpcmVjdG9yeSwgc3ViRGlyZWN0b3J5KSk7XG4gICAgICBpZiAocjNTeW1ib2xzRmlsZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuIHIzU3ltYm9sc0ZpbGVQYXRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iXX0=