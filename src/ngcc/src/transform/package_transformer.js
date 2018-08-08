(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/transform/package_transformer", ["require", "exports", "tslib", "fs", "path", "shelljs", "typescript", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngcc/src/analyzer", "@angular/compiler-cli/src/ngcc/src/constants", "@angular/compiler-cli/src/ngcc/src/host/dts_mapper", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host", "@angular/compiler-cli/src/ngcc/src/host/fesm2015_host", "@angular/compiler-cli/src/ngcc/src/host/esm5_host", "@angular/compiler-cli/src/ngcc/src/parsing/esm2015_parser", "@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser", "@angular/compiler-cli/src/ngcc/src/transform/utils", "@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer", "@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer"], factory);
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
    var fs_1 = require("fs");
    var path_1 = require("path");
    var shelljs_1 = require("shelljs");
    var ts = require("typescript");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var analyzer_1 = require("@angular/compiler-cli/src/ngcc/src/analyzer");
    var constants_1 = require("@angular/compiler-cli/src/ngcc/src/constants");
    var dts_mapper_1 = require("@angular/compiler-cli/src/ngcc/src/host/dts_mapper");
    var esm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/esm2015_host");
    var fesm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/fesm2015_host");
    var esm5_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/esm5_host");
    var esm2015_parser_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/esm2015_parser");
    var esm5_parser_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/transform/utils");
    var esm2015_renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer");
    var esm5_renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer");
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
    var PackageTransformer = /** @class */ (function () {
        function PackageTransformer() {
        }
        PackageTransformer.prototype.transform = function (packagePath, format) {
            var _this = this;
            var sourceNodeModules = this.findNodeModulesPath(packagePath);
            var targetNodeModules = sourceNodeModules.replace(/node_modules$/, 'node_modules_ngtsc');
            var entryPoints = utils_1.getEntryPoints(packagePath, format);
            entryPoints.forEach(function (entryPoint) {
                var outputFiles = [];
                var options = {
                    allowJs: true,
                    maxNodeModuleJsDepth: Infinity,
                    rootDir: entryPoint.entryFileName,
                };
                // Create the TS program and necessary helpers.
                var host = ts.createCompilerHost(options);
                var packageProgram = ts.createProgram([entryPoint.entryFileName], options, host);
                var typeChecker = packageProgram.getTypeChecker();
                var dtsMapper = new dts_mapper_1.DtsMapper(entryPoint.entryRoot, entryPoint.dtsEntryRoot);
                var reflectionHost = _this.getHost(format, packageProgram, dtsMapper);
                var parser = _this.getFileParser(format, packageProgram, reflectionHost);
                var analyzer = new analyzer_1.Analyzer(typeChecker, reflectionHost);
                var renderer = _this.getRenderer(format, packageProgram, reflectionHost);
                // Parse and analyze the files.
                var entryPointFile = packageProgram.getSourceFile(entryPoint.entryFileName);
                var parsedFiles = parser.parseFile(entryPointFile);
                var analyzedFiles = parsedFiles.map(function (parsedFile) { return analyzer.analyzeFile(parsedFile); });
                // Transform the source files and source maps.
                outputFiles.push.apply(outputFiles, tslib_1.__spread(_this.transformSourceFiles(analyzedFiles, sourceNodeModules, targetNodeModules, renderer)));
                // Transform the `.d.ts` files (if necessary).
                // TODO(gkalpak): What about `.d.ts` source maps? (See
                // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-9.html#new---declarationmap.)
                if (format === 'esm2015') {
                    outputFiles.push.apply(outputFiles, tslib_1.__spread(_this.transformDtsFiles(analyzedFiles, sourceNodeModules, targetNodeModules, dtsMapper)));
                }
                // Write out all the transformed files.
                outputFiles.forEach(function (file) { return _this.writeFile(file); });
            });
        };
        PackageTransformer.prototype.getHost = function (format, program, dtsMapper) {
            switch (format) {
                case 'esm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(program.getTypeChecker(), dtsMapper);
                case 'fesm2015':
                    return new fesm2015_host_1.Fesm2015ReflectionHost(program.getTypeChecker());
                case 'esm5':
                case 'fesm5':
                    return new esm5_host_1.Esm5ReflectionHost(program.getTypeChecker());
                default:
                    throw new Error("Relection host for \"" + format + "\" not yet implemented.");
            }
        };
        PackageTransformer.prototype.getFileParser = function (format, program, host) {
            switch (format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm2015_parser_1.Esm2015FileParser(program, host);
                case 'esm5':
                case 'fesm5':
                    return new esm5_parser_1.Esm5FileParser(program, host);
                default:
                    throw new Error("File parser for \"" + format + "\" not yet implemented.");
            }
        };
        PackageTransformer.prototype.getRenderer = function (format, program, host) {
            switch (format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm2015_renderer_1.Esm2015Renderer(host);
                case 'esm5':
                case 'fesm5':
                    return new esm5_renderer_1.Esm5Renderer(host);
                default:
                    throw new Error("Renderer for \"" + format + "\" not yet implemented.");
            }
        };
        PackageTransformer.prototype.findNodeModulesPath = function (src) {
            while (src && !/node_modules$/.test(src)) {
                src = path_1.dirname(src);
            }
            return src;
        };
        PackageTransformer.prototype.transformDtsFiles = function (analyzedFiles, sourceNodeModules, targetNodeModules, dtsMapper) {
            var outputFiles = [];
            analyzedFiles.forEach(function (analyzedFile) {
                // Create a `DtsFileTransformer` for the source file and record the generated fields, which
                // will allow the corresponding `.d.ts` file to be transformed later.
                var dtsTransformer = new transform_1.DtsFileTransformer(null, constants_1.IMPORT_PREFIX);
                analyzedFile.analyzedClasses.forEach(function (analyzedClass) {
                    return dtsTransformer.recordStaticField(analyzedClass.name, analyzedClass.compilation);
                });
                // Find the corresponding `.d.ts` file.
                var sourceFileName = analyzedFile.sourceFile.fileName;
                var originalDtsFileName = dtsMapper.getDtsFileNameFor(sourceFileName);
                var originalDtsContents = fs_1.readFileSync(originalDtsFileName, 'utf8');
                // Tranform the `.d.ts` file based on the recorded source file changes.
                var transformedDtsFileName = path_1.resolve(targetNodeModules, path_1.relative(sourceNodeModules, originalDtsFileName));
                var transformedDtsContents = dtsTransformer.transform(originalDtsContents, sourceFileName);
                // Add the transformed `.d.ts` file to the list of output files.
                outputFiles.push({ path: transformedDtsFileName, contents: transformedDtsContents });
            });
            return outputFiles;
        };
        PackageTransformer.prototype.transformSourceFiles = function (analyzedFiles, sourceNodeModules, targetNodeModules, renderer) {
            var outputFiles = [];
            analyzedFiles.forEach(function (analyzedFile) {
                // Tranform the source file based on the recorded changes.
                var targetPath = path_1.resolve(targetNodeModules, path_1.relative(sourceNodeModules, analyzedFile.sourceFile.fileName));
                var _a = renderer.renderFile(analyzedFile, targetPath), source = _a.source, map = _a.map;
                // Add the transformed file (and source map, if available) to the list of output files.
                outputFiles.push(source);
                if (map) {
                    outputFiles.push(map);
                }
            });
            return outputFiles;
        };
        PackageTransformer.prototype.writeFile = function (file) {
            shelljs_1.mkdir('-p', path_1.dirname(file.path));
            fs_1.writeFileSync(file.path, file.contents, 'utf8');
        };
        return PackageTransformer;
    }());
    exports.PackageTransformer = PackageTransformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV90cmFuc2Zvcm1lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvdHJhbnNmb3JtL3BhY2thZ2VfdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseUJBQStDO0lBQy9DLDZCQUFnRDtJQUNoRCxtQ0FBOEI7SUFDOUIsK0JBQWlDO0lBRWpDLHVFQUE0RDtJQUU1RCx3RUFBbUQ7SUFDbkQsMEVBQTJDO0lBQzNDLGlGQUE2QztJQUM3QyxxRkFBMkQ7SUFDM0QsdUZBQTZEO0lBQzdELCtFQUFxRDtJQUVyRCw0RkFBNEQ7SUFDNUQsc0ZBQXNEO0lBRXRELDRFQUF1QztJQUN2QyxrR0FBOEQ7SUFDOUQsNEZBQXdEO0lBS3hEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSDtRQUFBO1FBcUpBLENBQUM7UUFwSkMsc0NBQVMsR0FBVCxVQUFVLFdBQW1CLEVBQUUsTUFBYztZQUE3QyxpQkE0Q0M7WUEzQ0MsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEUsSUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDM0YsSUFBTSxXQUFXLEdBQUcsc0JBQWMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFeEQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFBLFVBQVU7Z0JBQzVCLElBQU0sV0FBVyxHQUFlLEVBQUUsQ0FBQztnQkFDbkMsSUFBTSxPQUFPLEdBQXVCO29CQUNsQyxPQUFPLEVBQUUsSUFBSTtvQkFDYixvQkFBb0IsRUFBRSxRQUFRO29CQUM5QixPQUFPLEVBQUUsVUFBVSxDQUFDLGFBQWE7aUJBQ2xDLENBQUM7Z0JB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QUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN4RixJQUFBLGtEQUE2RCxFQUE1RCxrQkFBTSxFQUFFLFlBQUcsQ0FBa0Q7Z0JBRXBFLHVGQUF1RjtnQkFDdkYsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekIsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdkI7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRCxzQ0FBUyxHQUFULFVBQVUsSUFBYztZQUN0QixlQUFLLENBQUMsSUFBSSxFQUFFLGNBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoQyxrQkFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBckpELElBcUpDO0lBckpZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7cmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge2Rpcm5hbWUsIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICdwYXRoJztcbmltcG9ydCB7bWtkaXJ9IGZyb20gJ3NoZWxsanMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RHRzRmlsZVRyYW5zZm9ybWVyfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge0FuYWx5emVkRmlsZSwgQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5emVyJztcbmltcG9ydCB7SU1QT1JUX1BSRUZJWH0gZnJvbSAnLi4vY29uc3RhbnRzJztcbmltcG9ydCB7RHRzTWFwcGVyfSBmcm9tICcuLi9ob3N0L2R0c19tYXBwZXInO1xuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RmVzbTIwMTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9mZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTVfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtFc20yMDE1RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9lc20yMDE1X3BhcnNlcic7XG5pbXBvcnQge0VzbTVGaWxlUGFyc2VyfSBmcm9tICcuLi9wYXJzaW5nL2VzbTVfcGFyc2VyJztcbmltcG9ydCB7RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9maWxlX3BhcnNlcic7XG5pbXBvcnQge2dldEVudHJ5UG9pbnRzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7RXNtMjAxNVJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtMjAxNV9yZW5kZXJlcic7XG5pbXBvcnQge0VzbTVSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbTVfcmVuZGVyZXInO1xuaW1wb3J0IHtGaWxlSW5mbywgUmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9yZW5kZXJlcic7XG5pbXBvcnQge2lzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5cbi8qKlxuICogQSBQYWNrYWdlIGlzIHN0b3JlZCBpbiBhIGRpcmVjdG9yeSBvbiBkaXNrIGFuZCB0aGF0IGRpcmVjdG9yeSBjYW4gY29udGFpbiBvbmUgb3IgbW9yZSBwYWNrYWdlXG4gKiBmb3JtYXRzIC0gZS5nLiBmZXNtMjAxNSwgVU1ELCBldGMuIEFkZGl0aW9uYWxseSwgZWFjaCBwYWNrYWdlIHByb3ZpZGVzIHR5cGluZ3MgKGAuZC50c2AgZmlsZXMpLlxuICpcbiAqIEVhY2ggb2YgdGhlc2UgZm9ybWF0cyBleHBvc2VzIG9uZSBvciBtb3JlIGVudHJ5IHBvaW50cywgd2hpY2ggYXJlIHNvdXJjZSBmaWxlcyB0aGF0IG5lZWQgdG8gYmVcbiAqIHBhcnNlZCB0byBpZGVudGlmeSB0aGUgZGVjb3JhdGVkIGV4cG9ydGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGFuYWx5emVkIGFuZCBjb21waWxlZCBieSBvbmUgb3JcbiAqIG1vcmUgYERlY29yYXRvckhhbmRsZXJgIG9iamVjdHMuXG4gKlxuICogRWFjaCBlbnRyeSBwb2ludCB0byBhIHBhY2thZ2UgaXMgaWRlbnRpZmllZCBieSBhIGBTb3VyY2VGaWxlYCB0aGF0IGNhbiBiZSBwYXJzZWQgYW5kIGFuYWx5emVkIHRvXG4gKiBpZGVudGlmeSBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZDsgYW5kIHRoZW4gZmluYWxseSByZW5kZXJlZCBhbmQgd3JpdHRlbiB0byBkaXNrLlxuICogVGhlIGFjdHVhbCBmaWxlIHdoaWNoIG5lZWRzIHRvIGJlIHRyYW5zZm9ybWVkIGRlcGVuZHMgdXBvbiB0aGUgcGFja2FnZSBmb3JtYXQuXG4gKlxuICogQWxvbmcgd2l0aCB0aGUgc291cmNlIGZpbGVzLCB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgbWFwcyAoZWl0aGVyIGlubGluZSBvciBleHRlcm5hbCkgYW5kXG4gKiBgLmQudHNgIGZpbGVzIGFyZSB0cmFuc2Zvcm1lZCBhY2NvcmRpbmdseS5cbiAqXG4gKiAtIEZsYXQgZmlsZSBwYWNrYWdlcyBoYXZlIGFsbCB0aGUgY2xhc3NlcyBpbiBhIHNpbmdsZSBmaWxlLlxuICogLSBPdGhlciBwYWNrYWdlcyBtYXkgcmUtZXhwb3J0IGNsYXNzZXMgZnJvbSBvdGhlciBub24tZW50cnkgcG9pbnQgZmlsZXMuXG4gKiAtIFNvbWUgZm9ybWF0cyBtYXkgY29udGFpbiBtdWx0aXBsZSBcIm1vZHVsZXNcIiBpbiBhIHNpbmdsZSBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgUGFja2FnZVRyYW5zZm9ybWVyIHtcbiAgdHJhbnNmb3JtKHBhY2thZ2VQYXRoOiBzdHJpbmcsIGZvcm1hdDogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3Qgc291cmNlTm9kZU1vZHVsZXMgPSB0aGlzLmZpbmROb2RlTW9kdWxlc1BhdGgocGFja2FnZVBhdGgpO1xuICAgIGNvbnN0IHRhcmdldE5vZGVNb2R1bGVzID0gc291cmNlTm9kZU1vZHVsZXMucmVwbGFjZSgvbm9kZV9tb2R1bGVzJC8sICdub2RlX21vZHVsZXNfbmd0c2MnKTtcbiAgICBjb25zdCBlbnRyeVBvaW50cyA9IGdldEVudHJ5UG9pbnRzKHBhY2thZ2VQYXRoLCBmb3JtYXQpO1xuXG4gICAgZW50cnlQb2ludHMuZm9yRWFjaChlbnRyeVBvaW50ID0+IHtcbiAgICAgIGNvbnN0IG91dHB1dEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG4gICAgICBjb25zdCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMgPSB7XG4gICAgICAgIGFsbG93SnM6IHRydWUsXG4gICAgICAgIG1heE5vZGVNb2R1bGVKc0RlcHRoOiBJbmZpbml0eSxcbiAgICAgICAgcm9vdERpcjogZW50cnlQb2ludC5lbnRyeUZpbGVOYW1lLFxuICAgICAgfTtcblxuICAgICAgLy8gQ3JlYXRlIHRoZSBUUyBwcm9ncmFtIGFuZCBuZWNlc3NhcnkgaGVscGVycy5cbiAgICAgIGNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3Qob3B0aW9ucyk7XG4gICAgICBjb25zdCBwYWNrYWdlUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oW2VudHJ5UG9pbnQuZW50cnlGaWxlTmFtZV0sIG9wdGlvbnMsIGhvc3QpO1xuICAgICAgY29uc3QgdHlwZUNoZWNrZXIgPSBwYWNrYWdlUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgICAgY29uc3QgZHRzTWFwcGVyID0gbmV3IER0c01hcHBlcihlbnRyeVBvaW50LmVudHJ5Um9vdCwgZW50cnlQb2ludC5kdHNFbnRyeVJvb3QpO1xuICAgICAgY29uc3QgcmVmbGVjdGlvbkhvc3QgPSB0aGlzLmdldEhvc3QoZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgZHRzTWFwcGVyKTtcblxuICAgICAgY29uc3QgcGFyc2VyID0gdGhpcy5nZXRGaWxlUGFyc2VyKGZvcm1hdCwgcGFja2FnZVByb2dyYW0sIHJlZmxlY3Rpb25Ib3N0KTtcbiAgICAgIGNvbnN0IGFuYWx5emVyID0gbmV3IEFuYWx5emVyKHR5cGVDaGVja2VyLCByZWZsZWN0aW9uSG9zdCk7XG4gICAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuZ2V0UmVuZGVyZXIoZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgICAvLyBQYXJzZSBhbmQgYW5hbHl6ZSB0aGUgZmlsZXMuXG4gICAgICBjb25zdCBlbnRyeVBvaW50RmlsZSA9IHBhY2thZ2VQcm9ncmFtLmdldFNvdXJjZUZpbGUoZW50cnlQb2ludC5lbnRyeUZpbGVOYW1lKSAhO1xuICAgICAgY29uc3QgcGFyc2VkRmlsZXMgPSBwYXJzZXIucGFyc2VGaWxlKGVudHJ5UG9pbnRGaWxlKTtcbiAgICAgIGNvbnN0IGFuYWx5emVkRmlsZXMgPSBwYXJzZWRGaWxlcy5tYXAocGFyc2VkRmlsZSA9PiBhbmFseXplci5hbmFseXplRmlsZShwYXJzZWRGaWxlKSk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICAgIG91dHB1dEZpbGVzLnB1c2goLi4udGhpcy50cmFuc2Zvcm1Tb3VyY2VGaWxlcyhcbiAgICAgICAgICBhbmFseXplZEZpbGVzLCBzb3VyY2VOb2RlTW9kdWxlcywgdGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbmRlcmVyKSk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSB0aGUgYC5kLnRzYCBmaWxlcyAoaWYgbmVjZXNzYXJ5KS5cbiAgICAgIC8vIFRPRE8oZ2thbHBhayk6IFdoYXQgYWJvdXQgYC5kLnRzYCBzb3VyY2UgbWFwcz8gKFNlZVxuICAgICAgLy8gaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svcmVsZWFzZS1ub3Rlcy90eXBlc2NyaXB0LTItOS5odG1sI25ldy0tLWRlY2xhcmF0aW9ubWFwLilcbiAgICAgIGlmIChmb3JtYXQgPT09ICdlc20yMDE1Jykge1xuICAgICAgICBvdXRwdXRGaWxlcy5wdXNoKC4uLnRoaXMudHJhbnNmb3JtRHRzRmlsZXMoXG4gICAgICAgICAgICBhbmFseXplZEZpbGVzLCBzb3VyY2VOb2RlTW9kdWxlcywgdGFyZ2V0Tm9kZU1vZHVsZXMsIGR0c01hcHBlcikpO1xuICAgICAgfVxuXG4gICAgICAvLyBXcml0ZSBvdXQgYWxsIHRoZSB0cmFuc2Zvcm1lZCBmaWxlcy5cbiAgICAgIG91dHB1dEZpbGVzLmZvckVhY2goZmlsZSA9PiB0aGlzLndyaXRlRmlsZShmaWxlKSk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRIb3N0KGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkdHNNYXBwZXI6IER0c01hcHBlcik6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZWZsZWN0aW9uSG9zdChwcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGR0c01hcHBlcik7XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRmVzbTIwMTVSZWZsZWN0aW9uSG9zdChwcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlZmxlY3Rpb25Ib3N0KHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbGVjdGlvbiBob3N0IGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RmlsZVBhcnNlcihmb3JtYXQ6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KTogRmlsZVBhcnNlciB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVGaWxlUGFyc2VyKHByb2dyYW0sIGhvc3QpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNUZpbGVQYXJzZXIocHJvZ3JhbSwgaG9zdCk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgcGFyc2VyIGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVuZGVyZXIoZm9ybWF0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCk6IFJlbmRlcmVyIHtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlbmRlcmVyKGhvc3QpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmVyKGhvc3QpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZW5kZXJlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGZpbmROb2RlTW9kdWxlc1BhdGgoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHdoaWxlIChzcmMgJiYgIS9ub2RlX21vZHVsZXMkLy50ZXN0KHNyYykpIHtcbiAgICAgIHNyYyA9IGRpcm5hbWUoc3JjKTtcbiAgICB9XG4gICAgcmV0dXJuIHNyYztcbiAgfVxuXG4gIHRyYW5zZm9ybUR0c0ZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICBkdHNNYXBwZXI6IER0c01hcHBlcik6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IG91dHB1dEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG5cbiAgICBhbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgIC8vIENyZWF0ZSBhIGBEdHNGaWxlVHJhbnNmb3JtZXJgIGZvciB0aGUgc291cmNlIGZpbGUgYW5kIHJlY29yZCB0aGUgZ2VuZXJhdGVkIGZpZWxkcywgd2hpY2hcbiAgICAgIC8vIHdpbGwgYWxsb3cgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgICAgY29uc3QgZHRzVHJhbnNmb3JtZXIgPSBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKG51bGwsIElNUE9SVF9QUkVGSVgpO1xuICAgICAgYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5mb3JFYWNoKFxuICAgICAgICAgIGFuYWx5emVkQ2xhc3MgPT5cbiAgICAgICAgICAgICAgZHRzVHJhbnNmb3JtZXIucmVjb3JkU3RhdGljRmllbGQoYW5hbHl6ZWRDbGFzcy5uYW1lLCBhbmFseXplZENsYXNzLmNvbXBpbGF0aW9uKSk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlLlxuICAgICAgY29uc3Qgc291cmNlRmlsZU5hbWUgPSBhbmFseXplZEZpbGUuc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsRHRzRmlsZU5hbWUgPSBkdHNNYXBwZXIuZ2V0RHRzRmlsZU5hbWVGb3Ioc291cmNlRmlsZU5hbWUpO1xuICAgICAgY29uc3Qgb3JpZ2luYWxEdHNDb250ZW50cyA9IHJlYWRGaWxlU3luYyhvcmlnaW5hbER0c0ZpbGVOYW1lLCAndXRmOCcpO1xuXG4gICAgICAvLyBUcmFuZm9ybSB0aGUgYC5kLnRzYCBmaWxlIGJhc2VkIG9uIHRoZSByZWNvcmRlZCBzb3VyY2UgZmlsZSBjaGFuZ2VzLlxuICAgICAgY29uc3QgdHJhbnNmb3JtZWREdHNGaWxlTmFtZSA9XG4gICAgICAgICAgcmVzb2x2ZSh0YXJnZXROb2RlTW9kdWxlcywgcmVsYXRpdmUoc291cmNlTm9kZU1vZHVsZXMsIG9yaWdpbmFsRHRzRmlsZU5hbWUpKTtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVkRHRzQ29udGVudHMgPSBkdHNUcmFuc2Zvcm1lci50cmFuc2Zvcm0ob3JpZ2luYWxEdHNDb250ZW50cywgc291cmNlRmlsZU5hbWUpO1xuXG4gICAgICAvLyBBZGQgdGhlIHRyYW5zZm9ybWVkIGAuZC50c2AgZmlsZSB0byB0aGUgbGlzdCBvZiBvdXRwdXQgZmlsZXMuXG4gICAgICBvdXRwdXRGaWxlcy5wdXNoKHtwYXRoOiB0cmFuc2Zvcm1lZER0c0ZpbGVOYW1lLCBjb250ZW50czogdHJhbnNmb3JtZWREdHNDb250ZW50c30pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG91dHB1dEZpbGVzO1xuICB9XG5cbiAgdHJhbnNmb3JtU291cmNlRmlsZXMoXG4gICAgICBhbmFseXplZEZpbGVzOiBBbmFseXplZEZpbGVbXSwgc291cmNlTm9kZU1vZHVsZXM6IHN0cmluZywgdGFyZ2V0Tm9kZU1vZHVsZXM6IHN0cmluZyxcbiAgICAgIHJlbmRlcmVyOiBSZW5kZXJlcik6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IG91dHB1dEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG5cbiAgICBhbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgIC8vIFRyYW5mb3JtIHRoZSBzb3VyY2UgZmlsZSBiYXNlZCBvbiB0aGUgcmVjb3JkZWQgY2hhbmdlcy5cbiAgICAgIGNvbnN0IHRhcmdldFBhdGggPVxuICAgICAgICAgIHJlc29sdmUodGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbGF0aXZlKHNvdXJjZU5vZGVNb2R1bGVzLCBhbmFseXplZEZpbGUuc291cmNlRmlsZS5maWxlTmFtZSkpO1xuICAgICAgY29uc3Qge3NvdXJjZSwgbWFwfSA9IHJlbmRlcmVyLnJlbmRlckZpbGUoYW5hbHl6ZWRGaWxlLCB0YXJnZXRQYXRoKTtcblxuICAgICAgLy8gQWRkIHRoZSB0cmFuc2Zvcm1lZCBmaWxlIChhbmQgc291cmNlIG1hcCwgaWYgYXZhaWxhYmxlKSB0byB0aGUgbGlzdCBvZiBvdXRwdXQgZmlsZXMuXG4gICAgICBvdXRwdXRGaWxlcy5wdXNoKHNvdXJjZSk7XG4gICAgICBpZiAobWFwKSB7XG4gICAgICAgIG91dHB1dEZpbGVzLnB1c2gobWFwKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBvdXRwdXRGaWxlcztcbiAgfVxuXG4gIHdyaXRlRmlsZShmaWxlOiBGaWxlSW5mbyk6IHZvaWQge1xuICAgIG1rZGlyKCctcCcsIGRpcm5hbWUoZmlsZS5wYXRoKSk7XG4gICAgd3JpdGVGaWxlU3luYyhmaWxlLnBhdGgsIGZpbGUuY29udGVudHMsICd1dGY4Jyk7XG4gIH1cbn1cbiJdfQ==