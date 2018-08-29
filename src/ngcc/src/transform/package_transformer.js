(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/transform/package_transformer", ["require", "exports", "tslib", "fs", "path", "shelljs", "typescript", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngcc/src/analyzer", "@angular/compiler-cli/src/ngcc/src/constants", "@angular/compiler-cli/src/ngcc/src/host/dts_mapper", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host", "@angular/compiler-cli/src/ngcc/src/host/esm5_host", "@angular/compiler-cli/src/ngcc/src/host/fesm2015_host", "@angular/compiler-cli/src/ngcc/src/parsing/esm2015_parser", "@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser", "@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer", "@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer", "@angular/compiler-cli/src/ngcc/src/transform/utils"], factory);
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
    var esm5_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/esm5_host");
    var fesm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/fesm2015_host");
    var esm2015_parser_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/esm2015_parser");
    var esm5_parser_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser");
    var esm2015_renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer");
    var esm5_renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/transform/utils");
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
        PackageTransformer.prototype.transform = function (packagePath, format, targetPath) {
            var _this = this;
            if (targetPath === void 0) { targetPath = 'node_modules'; }
            var sourceNodeModules = this.findNodeModulesPath(packagePath);
            var targetNodeModules = path_1.resolve(sourceNodeModules, '..', targetPath);
            var entryPoints = utils_1.getEntryPoints(packagePath, format);
            entryPoints.forEach(function (entryPoint) {
                var outputFiles = [];
                var options = {
                    allowJs: true,
                    maxNodeModuleJsDepth: Infinity,
                    rootDir: entryPoint.entryFileName,
                };
                // Create the TS program and necessary helpers.
                // TODO : create a custom compiler host that reads from .bak files if available.
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
                // Transform the `.d.ts` file based on the recorded source file changes.
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
                // Transform the source file based on the recorded changes.
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
            var backPath = file.path + '.bak';
            if (fs_1.existsSync(file.path) && !fs_1.existsSync(backPath)) {
                shelljs_1.mv(file.path, backPath);
            }
            fs_1.writeFileSync(file.path, file.contents, 'utf8');
        };
        return PackageTransformer;
    }());
    exports.PackageTransformer = PackageTransformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV90cmFuc2Zvcm1lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvdHJhbnNmb3JtL3BhY2thZ2VfdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseUJBQTJEO0lBQzNELDZCQUFnRDtJQUNoRCxtQ0FBa0M7SUFDbEMsK0JBQWlDO0lBRWpDLHVFQUE0RDtJQUM1RCx3RUFBbUQ7SUFDbkQsMEVBQTJDO0lBQzNDLGlGQUE2QztJQUM3QyxxRkFBMkQ7SUFDM0QsK0VBQXFEO0lBQ3JELHVGQUE2RDtJQUU3RCw0RkFBNEQ7SUFDNUQsc0ZBQXNEO0lBRXRELGtHQUE4RDtJQUM5RCw0RkFBd0Q7SUFHeEQsNEVBQXVDO0lBSXZDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSDtRQUFBO1FBMEpBLENBQUM7UUF6SkMsc0NBQVMsR0FBVCxVQUFVLFdBQW1CLEVBQUUsTUFBYyxFQUFFLFVBQW1DO1lBQWxGLGlCQTZDQztZQTdDOEMsMkJBQUEsRUFBQSwyQkFBbUM7WUFDaEYsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEUsSUFBTSxpQkFBaUIsR0FBRyxjQUFPLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZFLElBQU0sV0FBVyxHQUFHLHNCQUFjLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXhELFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBQSxVQUFVO2dCQUM1QixJQUFNLFdBQVcsR0FBZSxFQUFFLENBQUM7Z0JBQ25DLElBQU0sT0FBTyxHQUF1QjtvQkFDbEMsT0FBTyxFQUFFLElBQUk7b0JBQ2Isb0JBQW9CLEVBQUUsUUFBUTtvQkFDOUIsT0FBTyxF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VSxHQUNaLGNBQU8sQ0FBQyxpQkFBaUIsRUFBRSxlQUFRLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN4RixJQUFBLGtEQUE2RCxFQUE1RCxrQkFBTSxFQUFFLFlBQUcsQ0FBa0Q7Z0JBRXBFLHVGQUF1RjtnQkFDdkYsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekIsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdkI7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRCxzQ0FBUyxHQUFULFVBQVUsSUFBYztZQUN0QixlQUFLLENBQUMsSUFBSSxFQUFFLGNBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoQyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztZQUNwQyxJQUFJLGVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ2xELFlBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3pCO1lBQ0Qsa0JBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQTFKRCxJQTBKQztJQTFKWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2V4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtkaXJuYW1lLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQge21rZGlyLCBtdn0gZnJvbSAnc2hlbGxqcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEdHNGaWxlVHJhbnNmb3JtZXJ9IGZyb20gJy4uLy4uLy4uL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge0FuYWx5emVkRmlsZSwgQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5emVyJztcbmltcG9ydCB7SU1QT1JUX1BSRUZJWH0gZnJvbSAnLi4vY29uc3RhbnRzJztcbmltcG9ydCB7RHRzTWFwcGVyfSBmcm9tICcuLi9ob3N0L2R0c19tYXBwZXInO1xuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTVfaG9zdCc7XG5pbXBvcnQge0Zlc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZmVzbTIwMTVfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtFc20yMDE1RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9lc20yMDE1X3BhcnNlcic7XG5pbXBvcnQge0VzbTVGaWxlUGFyc2VyfSBmcm9tICcuLi9wYXJzaW5nL2VzbTVfcGFyc2VyJztcbmltcG9ydCB7RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9maWxlX3BhcnNlcic7XG5pbXBvcnQge0VzbTIwMTVSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbTIwMTVfcmVuZGVyZXInO1xuaW1wb3J0IHtFc201UmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc201X3JlbmRlcmVyJztcbmltcG9ydCB7RmlsZUluZm8sIFJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuXG5pbXBvcnQge2dldEVudHJ5UG9pbnRzfSBmcm9tICcuL3V0aWxzJztcblxuXG5cbi8qKlxuICogQSBQYWNrYWdlIGlzIHN0b3JlZCBpbiBhIGRpcmVjdG9yeSBvbiBkaXNrIGFuZCB0aGF0IGRpcmVjdG9yeSBjYW4gY29udGFpbiBvbmUgb3IgbW9yZSBwYWNrYWdlXG4gKiBmb3JtYXRzIC0gZS5nLiBmZXNtMjAxNSwgVU1ELCBldGMuIEFkZGl0aW9uYWxseSwgZWFjaCBwYWNrYWdlIHByb3ZpZGVzIHR5cGluZ3MgKGAuZC50c2AgZmlsZXMpLlxuICpcbiAqIEVhY2ggb2YgdGhlc2UgZm9ybWF0cyBleHBvc2VzIG9uZSBvciBtb3JlIGVudHJ5IHBvaW50cywgd2hpY2ggYXJlIHNvdXJjZSBmaWxlcyB0aGF0IG5lZWQgdG8gYmVcbiAqIHBhcnNlZCB0byBpZGVudGlmeSB0aGUgZGVjb3JhdGVkIGV4cG9ydGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGFuYWx5emVkIGFuZCBjb21waWxlZCBieSBvbmUgb3JcbiAqIG1vcmUgYERlY29yYXRvckhhbmRsZXJgIG9iamVjdHMuXG4gKlxuICogRWFjaCBlbnRyeSBwb2ludCB0byBhIHBhY2thZ2UgaXMgaWRlbnRpZmllZCBieSBhIGBTb3VyY2VGaWxlYCB0aGF0IGNhbiBiZSBwYXJzZWQgYW5kIGFuYWx5emVkIHRvXG4gKiBpZGVudGlmeSBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSB0cmFuc2Zvcm1lZDsgYW5kIHRoZW4gZmluYWxseSByZW5kZXJlZCBhbmQgd3JpdHRlbiB0byBkaXNrLlxuICogVGhlIGFjdHVhbCBmaWxlIHdoaWNoIG5lZWRzIHRvIGJlIHRyYW5zZm9ybWVkIGRlcGVuZHMgdXBvbiB0aGUgcGFja2FnZSBmb3JtYXQuXG4gKlxuICogQWxvbmcgd2l0aCB0aGUgc291cmNlIGZpbGVzLCB0aGUgY29ycmVzcG9uZGluZyBzb3VyY2UgbWFwcyAoZWl0aGVyIGlubGluZSBvciBleHRlcm5hbCkgYW5kXG4gKiBgLmQudHNgIGZpbGVzIGFyZSB0cmFuc2Zvcm1lZCBhY2NvcmRpbmdseS5cbiAqXG4gKiAtIEZsYXQgZmlsZSBwYWNrYWdlcyBoYXZlIGFsbCB0aGUgY2xhc3NlcyBpbiBhIHNpbmdsZSBmaWxlLlxuICogLSBPdGhlciBwYWNrYWdlcyBtYXkgcmUtZXhwb3J0IGNsYXNzZXMgZnJvbSBvdGhlciBub24tZW50cnkgcG9pbnQgZmlsZXMuXG4gKiAtIFNvbWUgZm9ybWF0cyBtYXkgY29udGFpbiBtdWx0aXBsZSBcIm1vZHVsZXNcIiBpbiBhIHNpbmdsZSBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgUGFja2FnZVRyYW5zZm9ybWVyIHtcbiAgdHJhbnNmb3JtKHBhY2thZ2VQYXRoOiBzdHJpbmcsIGZvcm1hdDogc3RyaW5nLCB0YXJnZXRQYXRoOiBzdHJpbmcgPSAnbm9kZV9tb2R1bGVzJyk6IHZvaWQge1xuICAgIGNvbnN0IHNvdXJjZU5vZGVNb2R1bGVzID0gdGhpcy5maW5kTm9kZU1vZHVsZXNQYXRoKHBhY2thZ2VQYXRoKTtcbiAgICBjb25zdCB0YXJnZXROb2RlTW9kdWxlcyA9IHJlc29sdmUoc291cmNlTm9kZU1vZHVsZXMsICcuLicsIHRhcmdldFBhdGgpO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gZ2V0RW50cnlQb2ludHMocGFja2FnZVBhdGgsIGZvcm1hdCk7XG5cbiAgICBlbnRyeVBvaW50cy5mb3JFYWNoKGVudHJ5UG9pbnQgPT4ge1xuICAgICAgY29uc3Qgb3V0cHV0RmlsZXM6IEZpbGVJbmZvW10gPSBbXTtcbiAgICAgIGNvbnN0IG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAgICAgYWxsb3dKczogdHJ1ZSxcbiAgICAgICAgbWF4Tm9kZU1vZHVsZUpzRGVwdGg6IEluZmluaXR5LFxuICAgICAgICByb290RGlyOiBlbnRyeVBvaW50LmVudHJ5RmlsZU5hbWUsXG4gICAgICB9O1xuXG4gICAgICAvLyBDcmVhdGUgdGhlIFRTIHByb2dyYW0gYW5kIG5lY2Vzc2FyeSBoZWxwZXJzLlxuICAgICAgLy8gVE9ETyA6IGNyZWF0ZSBhIGN1c3RvbSBjb21waWxlciBob3N0IHRoYXQgcmVhZHMgZnJvbSAuYmFrIGZpbGVzIGlmIGF2YWlsYWJsZS5cbiAgICAgIGNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3Qob3B0aW9ucyk7XG4gICAgICBjb25zdCBwYWNrYWdlUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oW2VudHJ5UG9pbnQuZW50cnlGaWxlTmFtZV0sIG9wdGlvbnMsIGhvc3QpO1xuICAgICAgY29uc3QgdHlwZUNoZWNrZXIgPSBwYWNrYWdlUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgICAgY29uc3QgZHRzTWFwcGVyID0gbmV3IER0c01hcHBlcihlbnRyeVBvaW50LmVudHJ5Um9vdCwgZW50cnlQb2ludC5kdHNFbnRyeVJvb3QpO1xuICAgICAgY29uc3QgcmVmbGVjdGlvbkhvc3QgPSB0aGlzLmdldEhvc3QoZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgZHRzTWFwcGVyKTtcblxuICAgICAgY29uc3QgcGFyc2VyID0gdGhpcy5nZXRGaWxlUGFyc2VyKGZvcm1hdCwgcGFja2FnZVByb2dyYW0sIHJlZmxlY3Rpb25Ib3N0KTtcbiAgICAgIGNvbnN0IGFuYWx5emVyID0gbmV3IEFuYWx5emVyKHR5cGVDaGVja2VyLCByZWZsZWN0aW9uSG9zdCk7XG4gICAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuZ2V0UmVuZGVyZXIoZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgICAvLyBQYXJzZSBhbmQgYW5hbHl6ZSB0aGUgZmlsZXMuXG4gICAgICBjb25zdCBlbnRyeVBvaW50RmlsZSA9IHBhY2thZ2VQcm9ncmFtLmdldFNvdXJjZUZpbGUoZW50cnlQb2ludC5lbnRyeUZpbGVOYW1lKSAhO1xuICAgICAgY29uc3QgcGFyc2VkRmlsZXMgPSBwYXJzZXIucGFyc2VGaWxlKGVudHJ5UG9pbnRGaWxlKTtcbiAgICAgIGNvbnN0IGFuYWx5emVkRmlsZXMgPSBwYXJzZWRGaWxlcy5tYXAocGFyc2VkRmlsZSA9PiBhbmFseXplci5hbmFseXplRmlsZShwYXJzZWRGaWxlKSk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICAgIG91dHB1dEZpbGVzLnB1c2goLi4udGhpcy50cmFuc2Zvcm1Tb3VyY2VGaWxlcyhcbiAgICAgICAgICBhbmFseXplZEZpbGVzLCBzb3VyY2VOb2RlTW9kdWxlcywgdGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbmRlcmVyKSk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSB0aGUgYC5kLnRzYCBmaWxlcyAoaWYgbmVjZXNzYXJ5KS5cbiAgICAgIC8vIFRPRE8oZ2thbHBhayk6IFdoYXQgYWJvdXQgYC5kLnRzYCBzb3VyY2UgbWFwcz8gKFNlZVxuICAgICAgLy8gaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svcmVsZWFzZS1ub3Rlcy90eXBlc2NyaXB0LTItOS5odG1sI25ldy0tLWRlY2xhcmF0aW9ubWFwLilcbiAgICAgIGlmIChmb3JtYXQgPT09ICdlc20yMDE1Jykge1xuICAgICAgICBvdXRwdXRGaWxlcy5wdXNoKC4uLnRoaXMudHJhbnNmb3JtRHRzRmlsZXMoXG4gICAgICAgICAgICBhbmFseXplZEZpbGVzLCBzb3VyY2VOb2RlTW9kdWxlcywgdGFyZ2V0Tm9kZU1vZHVsZXMsIGR0c01hcHBlcikpO1xuICAgICAgfVxuXG4gICAgICAvLyBXcml0ZSBvdXQgYWxsIHRoZSB0cmFuc2Zvcm1lZCBmaWxlcy5cbiAgICAgIG91dHB1dEZpbGVzLmZvckVhY2goZmlsZSA9PiB0aGlzLndyaXRlRmlsZShmaWxlKSk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRIb3N0KGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkdHNNYXBwZXI6IER0c01hcHBlcik6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZWZsZWN0aW9uSG9zdChwcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGR0c01hcHBlcik7XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRmVzbTIwMTVSZWZsZWN0aW9uSG9zdChwcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlZmxlY3Rpb25Ib3N0KHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbGVjdGlvbiBob3N0IGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RmlsZVBhcnNlcihmb3JtYXQ6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KTogRmlsZVBhcnNlciB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVGaWxlUGFyc2VyKHByb2dyYW0sIGhvc3QpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNUZpbGVQYXJzZXIocHJvZ3JhbSwgaG9zdCk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgcGFyc2VyIGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVuZGVyZXIoZm9ybWF0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCk6IFJlbmRlcmVyIHtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlbmRlcmVyKGhvc3QpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmVyKGhvc3QpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZW5kZXJlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGZpbmROb2RlTW9kdWxlc1BhdGgoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHdoaWxlIChzcmMgJiYgIS9ub2RlX21vZHVsZXMkLy50ZXN0KHNyYykpIHtcbiAgICAgIHNyYyA9IGRpcm5hbWUoc3JjKTtcbiAgICB9XG4gICAgcmV0dXJuIHNyYztcbiAgfVxuXG4gIHRyYW5zZm9ybUR0c0ZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICBkdHNNYXBwZXI6IER0c01hcHBlcik6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IG91dHB1dEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG5cbiAgICBhbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgIC8vIENyZWF0ZSBhIGBEdHNGaWxlVHJhbnNmb3JtZXJgIGZvciB0aGUgc291cmNlIGZpbGUgYW5kIHJlY29yZCB0aGUgZ2VuZXJhdGVkIGZpZWxkcywgd2hpY2hcbiAgICAgIC8vIHdpbGwgYWxsb3cgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgICAgY29uc3QgZHRzVHJhbnNmb3JtZXIgPSBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKG51bGwsIElNUE9SVF9QUkVGSVgpO1xuICAgICAgYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5mb3JFYWNoKFxuICAgICAgICAgIGFuYWx5emVkQ2xhc3MgPT5cbiAgICAgICAgICAgICAgZHRzVHJhbnNmb3JtZXIucmVjb3JkU3RhdGljRmllbGQoYW5hbHl6ZWRDbGFzcy5uYW1lLCBhbmFseXplZENsYXNzLmNvbXBpbGF0aW9uKSk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlLlxuICAgICAgY29uc3Qgc291cmNlRmlsZU5hbWUgPSBhbmFseXplZEZpbGUuc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsRHRzRmlsZU5hbWUgPSBkdHNNYXBwZXIuZ2V0RHRzRmlsZU5hbWVGb3Ioc291cmNlRmlsZU5hbWUpO1xuICAgICAgY29uc3Qgb3JpZ2luYWxEdHNDb250ZW50cyA9IHJlYWRGaWxlU3luYyhvcmlnaW5hbER0c0ZpbGVOYW1lLCAndXRmOCcpO1xuXG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIGAuZC50c2AgZmlsZSBiYXNlZCBvbiB0aGUgcmVjb3JkZWQgc291cmNlIGZpbGUgY2hhbmdlcy5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVkRHRzRmlsZU5hbWUgPVxuICAgICAgICAgIHJlc29sdmUodGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbGF0aXZlKHNvdXJjZU5vZGVNb2R1bGVzLCBvcmlnaW5hbER0c0ZpbGVOYW1lKSk7XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lZER0c0NvbnRlbnRzID0gZHRzVHJhbnNmb3JtZXIudHJhbnNmb3JtKG9yaWdpbmFsRHRzQ29udGVudHMsIHNvdXJjZUZpbGVOYW1lKTtcblxuICAgICAgLy8gQWRkIHRoZSB0cmFuc2Zvcm1lZCBgLmQudHNgIGZpbGUgdG8gdGhlIGxpc3Qgb2Ygb3V0cHV0IGZpbGVzLlxuICAgICAgb3V0cHV0RmlsZXMucHVzaCh7cGF0aDogdHJhbnNmb3JtZWREdHNGaWxlTmFtZSwgY29udGVudHM6IHRyYW5zZm9ybWVkRHRzQ29udGVudHN9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvdXRwdXRGaWxlcztcbiAgfVxuXG4gIHRyYW5zZm9ybVNvdXJjZUZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICByZW5kZXJlcjogUmVuZGVyZXIpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBvdXRwdXRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuXG4gICAgYW5hbHl6ZWRGaWxlcy5mb3JFYWNoKGFuYWx5emVkRmlsZSA9PiB7XG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlIGJhc2VkIG9uIHRoZSByZWNvcmRlZCBjaGFuZ2VzLlxuICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9XG4gICAgICAgICAgcmVzb2x2ZSh0YXJnZXROb2RlTW9kdWxlcywgcmVsYXRpdmUoc291cmNlTm9kZU1vZHVsZXMsIGFuYWx5emVkRmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lKSk7XG4gICAgICBjb25zdCB7c291cmNlLCBtYXB9ID0gcmVuZGVyZXIucmVuZGVyRmlsZShhbmFseXplZEZpbGUsIHRhcmdldFBhdGgpO1xuXG4gICAgICAvLyBBZGQgdGhlIHRyYW5zZm9ybWVkIGZpbGUgKGFuZCBzb3VyY2UgbWFwLCBpZiBhdmFpbGFibGUpIHRvIHRoZSBsaXN0IG9mIG91dHB1dCBmaWxlcy5cbiAgICAgIG91dHB1dEZpbGVzLnB1c2goc291cmNlKTtcbiAgICAgIGlmIChtYXApIHtcbiAgICAgICAgb3V0cHV0RmlsZXMucHVzaChtYXApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG91dHB1dEZpbGVzO1xuICB9XG5cbiAgd3JpdGVGaWxlKGZpbGU6IEZpbGVJbmZvKTogdm9pZCB7XG4gICAgbWtkaXIoJy1wJywgZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICBjb25zdCBiYWNrUGF0aCA9IGZpbGUucGF0aCArICcuYmFrJztcbiAgICBpZiAoZXhpc3RzU3luYyhmaWxlLnBhdGgpICYmICFleGlzdHNTeW5jKGJhY2tQYXRoKSkge1xuICAgICAgbXYoZmlsZS5wYXRoLCBiYWNrUGF0aCk7XG4gICAgfVxuICAgIHdyaXRlRmlsZVN5bmMoZmlsZS5wYXRoLCBmaWxlLmNvbnRlbnRzLCAndXRmOCcpO1xuICB9XG59XG4iXX0=