(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/packages/transformer", ["require", "exports", "tslib", "canonical-path", "fs", "shelljs", "typescript", "@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", "@angular/compiler-cli/src/ngcc/src/analysis/switch_marker_analyzer", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host", "@angular/compiler-cli/src/ngcc/src/host/esm5_host", "@angular/compiler-cli/src/ngcc/src/rendering/esm_renderer", "@angular/compiler-cli/src/ngcc/src/packages/build_marker"], factory);
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
                case 'esm5':
                case 'fesm2015':
                case 'fesm5':
                    return new esm_renderer_1.EsmRenderer(host, isCore, rewriteCoreImportsTo, this.sourcePath, this.targetPath, transformDts);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhY2thZ2VzL3RyYW5zZm9ybWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlEQUFnRDtJQUNoRCx5QkFBcUU7SUFDckUsbUNBQWtDO0lBQ2xDLCtCQUFpQztJQUVqQyx1R0FBbUU7SUFDbkUsNkdBQXdFO0lBQ3hFLHFGQUEyRDtJQUMzRCwrRUFBcUQ7SUFFckQsMEZBQXNEO0lBR3RELHlGQUFnRTtJQUdoRTs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0g7UUFDRSxxQkFBb0IsVUFBa0IsRUFBVSxVQUFrQjtZQUE5QyxlQUFVLEdBQVYsVUFBVSxDQUFRO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUFHLENBQUM7UUFFdEUsK0JBQVMsR0FBVCxVQUFVLFVBQXNCLEVBQUUsTUFBd0IsRUFBRSxZQUFxQjtZQUFqRixpQkFxREM7WUFwREMsSUFBSSw4QkFBZSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFBRTtnQkFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFZLFVBQVUsQ0FBQyxJQUFJLFdBQU0sTUFBTSxzQkFBbUIsQ0FBQyxDQUFDO2dCQUN6RSxPQUFPO2FBQ1I7WUFFRCxJQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QyxJQUFJLENBQUMsa0JBQWtCLEVBQUU7Z0JBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQ1IsY0FBWSxVQUFVLENBQUMsSUFBSSxXQUFNLE1BQU0sNENBQXlDLENBQUMsQ0FBQztnQkFDdEYsT0FBTzthQUNSO1lBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFhLFVBQVUsQ0FBQyxJQUFJLFdBQU0sTUFBUSxDQUFDLENBQUM7WUFFekQsSUFBTSxP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QUFpQztpQkFDaEMsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFsQixDQUFrQixDQUFDO2dCQUNoQyxzQkFBc0I7aUJBQ3JCLE1BQU0sQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsS0FBSyxjQUFjLEVBQXBCLENBQW9CLENBQUM7Z0JBQ2xDLHdFQUF3RTtpQkFDdkUsTUFBTSxDQUFDLFVBQUEsQ0FBQztnQkFDUCxJQUFNLElBQUksR0FBRyxjQUFTLENBQUMsd0JBQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdEQsQ0FBQyxDQUFDLENBQUM7O2dCQUVYLEtBQTJCLElBQUEsbUJBQUEsaUJBQUEsY0FBYyxDQUFBLDhDQUFBLDBFQUFFO29CQUF0QyxJQUFNLFlBQVksMkJBQUE7b0JBQ3JCLElBQU0sbUJBQWlCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHdCQUFPLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQ25GLElBQUksbUJBQWlCLEVBQUU7d0JBQ3JCLE9BQU8sbUJBQWlCLENBQUM7cUJBQzFCO2lCQUNGOzs7Ozs7Ozs7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUFsSkQsSUFrSkM7SUFsSlksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2Rpcm5hbWUsIHJlc29sdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7ZXhpc3RzU3luYywgbHN0YXRTeW5jLCByZWFkZGlyU3luYywgd3JpdGVGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpciwgbXZ9IGZyb20gJ3NoZWxsanMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdGlvbkFuYWx5emVyfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7U3dpdGNoTWFya2VyQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTVfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtFc21SZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbV9yZW5kZXJlcic7XG5pbXBvcnQge0ZpbGVJbmZvLCBSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcblxuaW1wb3J0IHtjaGVja01hcmtlckZpbGUsIHdyaXRlTWFya2VyRmlsZX0gZnJvbSAnLi9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL2VudHJ5X3BvaW50JztcblxuLyoqXG4gKiBBIFBhY2thZ2UgaXMgc3RvcmVkIGluIGEgZGlyZWN0b3J5IG9uIGRpc2sgYW5kIHRoYXQgZGlyZWN0b3J5IGNhbiBjb250YWluIG9uZSBvciBtb3JlIHBhY2thZ2VcbiAqIGZvcm1hdHMgLSBlLmcuIGZlc20yMDE1LCBVTUQsIGV0Yy4gQWRkaXRpb25hbGx5LCBlYWNoIHBhY2thZ2UgcHJvdmlkZXMgdHlwaW5ncyAoYC5kLnRzYCBmaWxlcykuXG4gKlxuICogRWFjaCBvZiB0aGVzZSBmb3JtYXRzIGV4cG9zZXMgb25lIG9yIG1vcmUgZW50cnkgcG9pbnRzLCB3aGljaCBhcmUgc291cmNlIGZpbGVzIHRoYXQgbmVlZCB0byBiZVxuICogcGFyc2VkIHRvIGlkZW50aWZ5IHRoZSBkZWNvcmF0ZWQgZXhwb3J0ZWQgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgYW5hbHl6ZWQgYW5kIGNvbXBpbGVkIGJ5IG9uZSBvclxuICogbW9yZSBgRGVjb3JhdG9ySGFuZGxlcmAgb2JqZWN0cy5cbiAqXG4gKiBFYWNoIGVudHJ5IHBvaW50IHRvIGEgcGFja2FnZSBpcyBpZGVudGlmaWVkIGJ5IGEgYFNvdXJjZUZpbGVgIHRoYXQgY2FuIGJlIHBhcnNlZCBhbmQgYW5hbHl6ZWQgdG9cbiAqIGlkZW50aWZ5IGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkOyBhbmQgdGhlbiBmaW5hbGx5IHJlbmRlcmVkIGFuZCB3cml0dGVuIHRvIGRpc2suXG4gKiBUaGUgYWN0dWFsIGZpbGUgd2hpY2ggbmVlZHMgdG8gYmUgdHJhbnNmb3JtZWQgZGVwZW5kcyB1cG9uIHRoZSBwYWNrYWdlIGZvcm1hdC5cbiAqXG4gKiBBbG9uZyB3aXRoIHRoZSBzb3VyY2UgZmlsZXMsIHRoZSBjb3JyZXNwb25kaW5nIHNvdXJjZSBtYXBzIChlaXRoZXIgaW5saW5lIG9yIGV4dGVybmFsKSBhbmRcbiAqIGAuZC50c2AgZmlsZXMgYXJlIHRyYW5zZm9ybWVkIGFjY29yZGluZ2x5LlxuICpcbiAqIC0gRmxhdCBmaWxlIHBhY2thZ2VzIGhhdmUgYWxsIHRoZSBjbGFzc2VzIGluIGEgc2luZ2xlIGZpbGUuXG4gKiAtIE90aGVyIHBhY2thZ2VzIG1heSByZS1leHBvcnQgY2xhc3NlcyBmcm9tIG90aGVyIG5vbi1lbnRyeSBwb2ludCBmaWxlcy5cbiAqIC0gU29tZSBmb3JtYXRzIG1heSBjb250YWluIG11bHRpcGxlIFwibW9kdWxlc1wiIGluIGEgc2luZ2xlIGZpbGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFuc2Zvcm1lciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc291cmNlUGF0aDogc3RyaW5nLCBwcml2YXRlIHRhcmdldFBhdGg6IHN0cmluZykge31cblxuICB0cmFuc2Zvcm0oZW50cnlQb2ludDogRW50cnlQb2ludCwgZm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0LCB0cmFuc2Zvcm1EdHM6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICBpZiAoY2hlY2tNYXJrZXJGaWxlKGVudHJ5UG9pbnQsIGZvcm1hdCkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXR9IChhbHJlYWR5IGJ1aWx0KS5gKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBlbnRyeVBvaW50RmlsZVBhdGggPSBlbnRyeVBvaW50W2Zvcm1hdF07XG4gICAgaWYgKCFlbnRyeVBvaW50RmlsZVBhdGgpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXR9IChubyBlbnRyeSBwb2ludCBmaWxlIGZvciB0aGlzIGZvcm1hdCkuYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc29sZS53YXJuKGBDb21waWxpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IC0gJHtmb3JtYXR9YCk7XG5cbiAgICBjb25zdCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMgPSB7XG4gICAgICBhbGxvd0pzOiB0cnVlLFxuICAgICAgbWF4Tm9kZU1vZHVsZUpzRGVwdGg6IEluZmluaXR5LFxuICAgICAgcm9vdERpcjogZW50cnlQb2ludC5wYXRoLFxuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgdGhlIFRTIHByb2dyYW0gYW5kIG5lY2Vzc2FyeSBoZWxwZXJzLlxuICAgIC8vIFRPRE8gOiBjcmVhdGUgYSBjdXN0b20gY29tcGlsZXIgaG9zdCB0aGF0IHJlYWRzIGZyb20gLmJhayBmaWxlcyBpZiBhdmFpbGFibGUuXG4gICAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChvcHRpb25zKTtcbiAgICBjb25zdCByb290RGlycyA9IHRoaXMuZ2V0Um9vdERpcnMoaG9zdCwgb3B0aW9ucyk7XG4gICAgY29uc3QgaXNDb3JlID0gZW50cnlQb2ludC5uYW1lID09PSAnQGFuZ3VsYXIvY29yZSc7XG4gICAgY29uc3QgcjNTeW1ib2xzUGF0aCA9IGlzQ29yZSA/IHRoaXMuZmluZFIzU3ltYm9sc1BhdGgoZGlybmFtZShlbnRyeVBvaW50RmlsZVBhdGgpKSA6IG51bGw7XG4gICAgY29uc3Qgcm9vdFBhdGhzID0gcjNTeW1ib2xzUGF0aCA/IFtlbnRyeVBvaW50RmlsZVBhdGgsIHIzU3ltYm9sc1BhdGhdIDogW2VudHJ5UG9pbnRGaWxlUGF0aF07XG4gICAgY29uc3QgcGFja2FnZVByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHJvb3RQYXRocywgb3B0aW9ucywgaG9zdCk7XG4gICAgY29uc29sZS50aW1lKGVudHJ5UG9pbnQubmFtZSArICcoZHRzbWFwcHBlciBjcmVhdGlvbiknKTtcbiAgICBjb25zdCBkdHNGaWxlUGF0aCA9IGVudHJ5UG9pbnQudHlwaW5ncztcbiAgICBjb25zdCBkdHNQcm9ncmFtID0gdHJhbnNmb3JtRHRzID8gdHMuY3JlYXRlUHJvZ3JhbShbZW50cnlQb2ludC50eXBpbmdzXSwgb3B0aW9ucywgaG9zdCkgOiBudWxsO1xuICAgIGNvbnNvbGUudGltZUVuZChlbnRyeVBvaW50Lm5hbWUgKyAnKGR0c21hcHBwZXIgY3JlYXRpb24pJyk7XG4gICAgY29uc3QgcmVmbGVjdGlvbkhvc3QgPSB0aGlzLmdldEhvc3QoaXNDb3JlLCBmb3JtYXQsIHBhY2thZ2VQcm9ncmFtLCBkdHNGaWxlUGF0aCwgZHRzUHJvZ3JhbSk7XG4gICAgY29uc3QgcjNTeW1ib2xzRmlsZSA9IHIzU3ltYm9sc1BhdGggJiYgcGFja2FnZVByb2dyYW0uZ2V0U291cmNlRmlsZShyM1N5bWJvbHNQYXRoKSB8fCBudWxsO1xuXG4gICAgLy8gUGFyc2UgYW5kIGFuYWx5emUgdGhlIGZpbGVzLlxuICAgIGNvbnN0IHtkZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzfSA9XG4gICAgICAgIHRoaXMuYW5hbHl6ZVByb2dyYW0ocGFja2FnZVByb2dyYW0sIHJlZmxlY3Rpb25Ib3N0LCByb290RGlycywgaXNDb3JlKTtcblxuICAgIGNvbnNvbGUudGltZShlbnRyeVBvaW50Lm5hbWUgKyAnKHJlbmRlcmluZyknKTtcbiAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlcyBhbmQgc291cmNlIG1hcHMuXG4gICAgY29uc3QgcmVuZGVyZXIgPSB0aGlzLmdldFJlbmRlcmVyKFxuICAgICAgICBmb3JtYXQsIHBhY2thZ2VQcm9ncmFtLCByZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCByM1N5bWJvbHNGaWxlLCB0cmFuc2Zvcm1EdHMpO1xuICAgIGNvbnN0IHJlbmRlcmVkRmlsZXMgPVxuICAgICAgICByZW5kZXJlci5yZW5kZXJQcm9ncmFtKHBhY2thZ2VQcm9ncmFtLCBkZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoZW50cnlQb2ludC5uYW1lICsgJyhyZW5kZXJpbmcpJyk7XG5cbiAgICAvLyBXcml0ZSBvdXQgYWxsIHRoZSB0cmFuc2Zvcm1lZCBmaWxlcy5cbiAgICByZW5kZXJlZEZpbGVzLmZvckVhY2goZmlsZSA9PiB0aGlzLndyaXRlRmlsZShmaWxlKSk7XG5cbiAgICAvLyBXcml0ZSB0aGUgYnVpbHQtd2l0aC1uZ2NjIG1hcmtlclxuICAgIHdyaXRlTWFya2VyRmlsZShlbnRyeVBvaW50LCBmb3JtYXQpO1xuICB9XG5cbiAgZ2V0Um9vdERpcnMoaG9zdDogdHMuQ29tcGlsZXJIb3N0LCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5yb290RGlycztcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMucm9vdERpciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gW29wdGlvbnMucm9vdERpcl07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbaG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCldO1xuICAgIH1cbiAgfVxuXG4gIGdldEhvc3QoXG4gICAgICBpc0NvcmU6IGJvb2xlYW4sIGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkdHNGaWxlUGF0aDogc3RyaW5nLFxuICAgICAgZHRzUHJvZ3JhbTogdHMuUHJvZ3JhbXxudWxsKTogTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KGlzQ29yZSwgcHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCBkdHNGaWxlUGF0aCwgZHRzUHJvZ3JhbSk7XG4gICAgICBjYXNlICdlc201JzpcbiAgICAgIGNhc2UgJ2Zlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVmbGVjdGlvbkhvc3QoaXNDb3JlLCBwcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWxlY3Rpb24gaG9zdCBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmVyKFxuICAgICAgZm9ybWF0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcmV3cml0ZUNvcmVJbXBvcnRzVG86IHRzLlNvdXJjZUZpbGV8bnVsbCwgdHJhbnNmb3JtRHRzOiBib29sZWFuKTogUmVuZGVyZXIge1xuICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbVJlbmRlcmVyKFxuICAgICAgICAgICAgaG9zdCwgaXNDb3JlLCByZXdyaXRlQ29yZUltcG9ydHNUbywgdGhpcy5zb3VyY2VQYXRoLCB0aGlzLnRhcmdldFBhdGgsIHRyYW5zZm9ybUR0cyk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbmRlcmVyIGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZVByb2dyYW0oXG4gICAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCByb290RGlyczogc3RyaW5nW10sXG4gICAgICBpc0NvcmU6IGJvb2xlYW4pIHtcbiAgICBjb25zdCBkZWNvcmF0aW9uQW5hbHl6ZXIgPVxuICAgICAgICBuZXcgRGVjb3JhdGlvbkFuYWx5emVyKHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgcmVmbGVjdGlvbkhvc3QsIHJvb3REaXJzLCBpc0NvcmUpO1xuICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5emVyID0gbmV3IFN3aXRjaE1hcmtlckFuYWx5emVyKHJlZmxlY3Rpb25Ib3N0KTtcbiAgICByZXR1cm4ge1xuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBkZWNvcmF0aW9uQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0ocHJvZ3JhbSksXG4gICAgICBzd2l0Y2hNYXJrZXJBbmFseXNlczogc3dpdGNoTWFya2VyQW5hbHl6ZXIuYW5hbHl6ZVByb2dyYW0ocHJvZ3JhbSksXG4gICAgfTtcbiAgfVxuXG4gIHdyaXRlRmlsZShmaWxlOiBGaWxlSW5mbyk6IHZvaWQge1xuICAgIG1rZGlyKCctcCcsIGRpcm5hbWUoZmlsZS5wYXRoKSk7XG4gICAgY29uc3QgYmFja1BhdGggPSBmaWxlLnBhdGggKyAnLmJhayc7XG4gICAgaWYgKGV4aXN0c1N5bmMoZmlsZS5wYXRoKSAmJiAhZXhpc3RzU3luYyhiYWNrUGF0aCkpIHtcbiAgICAgIG12KGZpbGUucGF0aCwgYmFja1BhdGgpO1xuICAgIH1cbiAgICB3cml0ZUZpbGVTeW5jKGZpbGUucGF0aCwgZmlsZS5jb250ZW50cywgJ3V0ZjgnKTtcbiAgfVxuXG4gIGZpbmRSM1N5bWJvbHNQYXRoKGRpcmVjdG9yeTogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHIzU3ltYm9sc0ZpbGVQYXRoID0gcmVzb2x2ZShkaXJlY3RvcnksICdyM19zeW1ib2xzLmpzJyk7XG4gICAgaWYgKGV4aXN0c1N5bmMocjNTeW1ib2xzRmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4gcjNTeW1ib2xzRmlsZVBhdGg7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ViRGlyZWN0b3JpZXMgPVxuICAgICAgICByZWFkZGlyU3luYyhkaXJlY3RvcnkpXG4gICAgICAgICAgICAvLyBOb3QgaW50ZXJlc3RlZCBpbiBoaWRkZW4gZmlsZXNcbiAgICAgICAgICAgIC5maWx0ZXIocCA9PiAhcC5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgICAgICAvLyBJZ25vcmUgbm9kZV9tb2R1bGVzXG4gICAgICAgICAgICAuZmlsdGVyKHAgPT4gcCAhPT0gJ25vZGVfbW9kdWxlcycpXG4gICAgICAgICAgICAvLyBPbmx5IGludGVyZXN0ZWQgaW4gZGlyZWN0b3JpZXMgKGFuZCBvbmx5IHRob3NlIHRoYXQgYXJlIG5vdCBzeW1saW5rcylcbiAgICAgICAgICAgIC5maWx0ZXIocCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXQgPSBsc3RhdFN5bmMocmVzb2x2ZShkaXJlY3RvcnksIHApKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHN0YXQuaXNEaXJlY3RvcnkoKSAmJiAhc3RhdC5pc1N5bWJvbGljTGluaygpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICBmb3IgKGNvbnN0IHN1YkRpcmVjdG9yeSBvZiBzdWJEaXJlY3Rvcmllcykge1xuICAgICAgY29uc3QgcjNTeW1ib2xzRmlsZVBhdGggPSB0aGlzLmZpbmRSM1N5bWJvbHNQYXRoKHJlc29sdmUoZGlyZWN0b3J5LCBzdWJEaXJlY3RvcnkpKTtcbiAgICAgIGlmIChyM1N5bWJvbHNGaWxlUGF0aCkge1xuICAgICAgICByZXR1cm4gcjNTeW1ib2xzRmlsZVBhdGg7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiJdfQ==