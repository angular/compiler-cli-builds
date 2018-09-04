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
                var rootDirs = undefined;
                if (options.rootDirs !== undefined) {
                    rootDirs = options.rootDirs;
                }
                else if (options.rootDir !== undefined) {
                    rootDirs = [options.rootDir];
                }
                else {
                    rootDirs = [host.getCurrentDirectory()];
                }
                var packageProgram = ts.createProgram([entryPoint.entryFileName], options, host);
                var typeChecker = packageProgram.getTypeChecker();
                var dtsMapper = new dts_mapper_1.DtsMapper(entryPoint.entryRoot, entryPoint.dtsEntryRoot);
                var reflectionHost = _this.getHost(format, packageProgram, dtsMapper);
                var parser = _this.getFileParser(format, packageProgram, reflectionHost);
                var analyzer = new analyzer_1.Analyzer(typeChecker, reflectionHost, rootDirs);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV90cmFuc2Zvcm1lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvdHJhbnNmb3JtL3BhY2thZ2VfdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseUJBQTJEO0lBQzNELDZCQUFnRDtJQUNoRCxtQ0FBa0M7SUFDbEMsK0JBQWlDO0lBRWpDLHVFQUE0RDtJQUM1RCx3RUFBbUQ7SUFDbkQsMEVBQTJDO0lBQzNDLGlGQUE2QztJQUM3QyxxRkFBMkQ7SUFDM0QsK0VBQXFEO0lBQ3JELHVGQUE2RDtJQUU3RCw0RkFBNEQ7SUFDNUQsc0ZBQXNEO0lBRXRELGtHQUE4RDtJQUM5RCw0RkFBd0Q7SUFHeEQsNEVBQXVDO0lBSXZDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSDtRQUFBO1FBa0tBLENBQUM7UUFqS0Msc0NBQVMsR0FBVCxVQUFVLFdBQW1CLEVBQUUsTUFBYyxFQUFFLFVBQW1DO1lBQWxGLGlCQXFEQztZQXJEOEMsMkJBQUEsRUFBQSwyQkFBbUM7WUFDaEYsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEUsSUFBTSxpQkFBaUIsR0FBRyxjQUFPLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZFLElBQU0sV0FBVyxHQUFHLHNCQUFjLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXhELFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBQSxVQUFVO2dCQUM1QixJQUFNLFdBQVcsR0FBZSxFQUFFLENBQUM7Z0JBQ25DLElBQU0sT0FBTyxHQUF1QjtvQkFDbEMsT0FBTyxFQUFFLElBQUk7b0JBQ2Isb0JBQW9CLEVBQUUsUUFBUTtvQkFDOUIsT0FBTyxF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SSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUFsS0QsSUFrS0M7SUFsS1ksZ0RBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7ZGlybmFtZSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtta2RpciwgbXZ9IGZyb20gJ3NoZWxsanMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RHRzRmlsZVRyYW5zZm9ybWVyfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtBbmFseXplZEZpbGUsIEFuYWx5emVyfSBmcm9tICcuLi9hbmFseXplcic7XG5pbXBvcnQge0lNUE9SVF9QUkVGSVh9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQge0R0c01hcHBlcn0gZnJvbSAnLi4vaG9zdC9kdHNfbWFwcGVyJztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc201X2hvc3QnO1xuaW1wb3J0IHtGZXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2Zlc20yMDE1X2hvc3QnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7RXNtMjAxNUZpbGVQYXJzZXJ9IGZyb20gJy4uL3BhcnNpbmcvZXNtMjAxNV9wYXJzZXInO1xuaW1wb3J0IHtFc201RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9lc201X3BhcnNlcic7XG5pbXBvcnQge0ZpbGVQYXJzZXJ9IGZyb20gJy4uL3BhcnNpbmcvZmlsZV9wYXJzZXInO1xuaW1wb3J0IHtFc20yMDE1UmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc20yMDE1X3JlbmRlcmVyJztcbmltcG9ydCB7RXNtNVJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtNV9yZW5kZXJlcic7XG5pbXBvcnQge0ZpbGVJbmZvLCBSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcblxuaW1wb3J0IHtnZXRFbnRyeVBvaW50c30gZnJvbSAnLi91dGlscyc7XG5cblxuXG4vKipcbiAqIEEgUGFja2FnZSBpcyBzdG9yZWQgaW4gYSBkaXJlY3Rvcnkgb24gZGlzayBhbmQgdGhhdCBkaXJlY3RvcnkgY2FuIGNvbnRhaW4gb25lIG9yIG1vcmUgcGFja2FnZVxuICogZm9ybWF0cyAtIGUuZy4gZmVzbTIwMTUsIFVNRCwgZXRjLiBBZGRpdGlvbmFsbHksIGVhY2ggcGFja2FnZSBwcm92aWRlcyB0eXBpbmdzIChgLmQudHNgIGZpbGVzKS5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgU291cmNlRmlsZWAgdGhhdCBjYW4gYmUgcGFyc2VkIGFuZCBhbmFseXplZCB0b1xuICogaWRlbnRpZnkgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQ7IGFuZCB0aGVuIGZpbmFsbHkgcmVuZGVyZWQgYW5kIHdyaXR0ZW4gdG8gZGlzay5cbiAqIFRoZSBhY3R1YWwgZmlsZSB3aGljaCBuZWVkcyB0byBiZSB0cmFuc2Zvcm1lZCBkZXBlbmRzIHVwb24gdGhlIHBhY2thZ2UgZm9ybWF0LlxuICpcbiAqIEFsb25nIHdpdGggdGhlIHNvdXJjZSBmaWxlcywgdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIG1hcHMgKGVpdGhlciBpbmxpbmUgb3IgZXh0ZXJuYWwpIGFuZFxuICogYC5kLnRzYCBmaWxlcyBhcmUgdHJhbnNmb3JtZWQgYWNjb3JkaW5nbHkuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhY2thZ2VUcmFuc2Zvcm1lciB7XG4gIHRyYW5zZm9ybShwYWNrYWdlUGF0aDogc3RyaW5nLCBmb3JtYXQ6IHN0cmluZywgdGFyZ2V0UGF0aDogc3RyaW5nID0gJ25vZGVfbW9kdWxlcycpOiB2b2lkIHtcbiAgICBjb25zdCBzb3VyY2VOb2RlTW9kdWxlcyA9IHRoaXMuZmluZE5vZGVNb2R1bGVzUGF0aChwYWNrYWdlUGF0aCk7XG4gICAgY29uc3QgdGFyZ2V0Tm9kZU1vZHVsZXMgPSByZXNvbHZlKHNvdXJjZU5vZGVNb2R1bGVzLCAnLi4nLCB0YXJnZXRQYXRoKTtcbiAgICBjb25zdCBlbnRyeVBvaW50cyA9IGdldEVudHJ5UG9pbnRzKHBhY2thZ2VQYXRoLCBmb3JtYXQpO1xuXG4gICAgZW50cnlQb2ludHMuZm9yRWFjaChlbnRyeVBvaW50ID0+IHtcbiAgICAgIGNvbnN0IG91dHB1dEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG4gICAgICBjb25zdCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMgPSB7XG4gICAgICAgIGFsbG93SnM6IHRydWUsXG4gICAgICAgIG1heE5vZGVNb2R1bGVKc0RlcHRoOiBJbmZpbml0eSxcbiAgICAgICAgcm9vdERpcjogZW50cnlQb2ludC5lbnRyeUZpbGVOYW1lLFxuICAgICAgfTtcblxuICAgICAgLy8gQ3JlYXRlIHRoZSBUUyBwcm9ncmFtIGFuZCBuZWNlc3NhcnkgaGVscGVycy5cbiAgICAgIC8vIFRPRE8gOiBjcmVhdGUgYSBjdXN0b20gY29tcGlsZXIgaG9zdCB0aGF0IHJlYWRzIGZyb20gLmJhayBmaWxlcyBpZiBhdmFpbGFibGUuXG4gICAgICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KG9wdGlvbnMpO1xuICAgICAgbGV0IHJvb3REaXJzOiBzdHJpbmdbXXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAob3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJvb3REaXJzID0gb3B0aW9ucy5yb290RGlycztcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5yb290RGlyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcm9vdERpcnMgPSBbb3B0aW9ucy5yb290RGlyXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3REaXJzID0gW2hvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpXTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhY2thZ2VQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShbZW50cnlQb2ludC5lbnRyeUZpbGVOYW1lXSwgb3B0aW9ucywgaG9zdCk7XG4gICAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHBhY2thZ2VQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG4gICAgICBjb25zdCBkdHNNYXBwZXIgPSBuZXcgRHRzTWFwcGVyKGVudHJ5UG9pbnQuZW50cnlSb290LCBlbnRyeVBvaW50LmR0c0VudHJ5Um9vdCk7XG4gICAgICBjb25zdCByZWZsZWN0aW9uSG9zdCA9IHRoaXMuZ2V0SG9zdChmb3JtYXQsIHBhY2thZ2VQcm9ncmFtLCBkdHNNYXBwZXIpO1xuXG4gICAgICBjb25zdCBwYXJzZXIgPSB0aGlzLmdldEZpbGVQYXJzZXIoZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3QpO1xuICAgICAgY29uc3QgYW5hbHl6ZXIgPSBuZXcgQW5hbHl6ZXIodHlwZUNoZWNrZXIsIHJlZmxlY3Rpb25Ib3N0LCByb290RGlycyk7XG4gICAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuZ2V0UmVuZGVyZXIoZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgICAvLyBQYXJzZSBhbmQgYW5hbHl6ZSB0aGUgZmlsZXMuXG4gICAgICBjb25zdCBlbnRyeVBvaW50RmlsZSA9IHBhY2thZ2VQcm9ncmFtLmdldFNvdXJjZUZpbGUoZW50cnlQb2ludC5lbnRyeUZpbGVOYW1lKSAhO1xuICAgICAgY29uc3QgcGFyc2VkRmlsZXMgPSBwYXJzZXIucGFyc2VGaWxlKGVudHJ5UG9pbnRGaWxlKTtcbiAgICAgIGNvbnN0IGFuYWx5emVkRmlsZXMgPSBwYXJzZWRGaWxlcy5tYXAocGFyc2VkRmlsZSA9PiBhbmFseXplci5hbmFseXplRmlsZShwYXJzZWRGaWxlKSk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICAgIG91dHB1dEZpbGVzLnB1c2goLi4udGhpcy50cmFuc2Zvcm1Tb3VyY2VGaWxlcyhcbiAgICAgICAgICBhbmFseXplZEZpbGVzLCBzb3VyY2VOb2RlTW9kdWxlcywgdGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbmRlcmVyKSk7XG5cbiAgICAgIC8vIFRyYW5zZm9ybSB0aGUgYC5kLnRzYCBmaWxlcyAoaWYgbmVjZXNzYXJ5KS5cbiAgICAgIC8vIFRPRE8oZ2thbHBhayk6IFdoYXQgYWJvdXQgYC5kLnRzYCBzb3VyY2UgbWFwcz8gKFNlZVxuICAgICAgLy8gaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svcmVsZWFzZS1ub3Rlcy90eXBlc2NyaXB0LTItOS5odG1sI25ldy0tLWRlY2xhcmF0aW9ubWFwLilcbiAgICAgIGlmIChmb3JtYXQgPT09ICdlc20yMDE1Jykge1xuICAgICAgICBvdXRwdXRGaWxlcy5wdXNoKC4uLnRoaXMudHJhbnNmb3JtRHRzRmlsZXMoXG4gICAgICAgICAgICBhbmFseXplZEZpbGVzLCBzb3VyY2VOb2RlTW9kdWxlcywgdGFyZ2V0Tm9kZU1vZHVsZXMsIGR0c01hcHBlcikpO1xuICAgICAgfVxuXG4gICAgICAvLyBXcml0ZSBvdXQgYWxsIHRoZSB0cmFuc2Zvcm1lZCBmaWxlcy5cbiAgICAgIG91dHB1dEZpbGVzLmZvckVhY2goZmlsZSA9PiB0aGlzLndyaXRlRmlsZShmaWxlKSk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRIb3N0KGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkdHNNYXBwZXI6IER0c01hcHBlcik6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZWZsZWN0aW9uSG9zdChwcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGR0c01hcHBlcik7XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRmVzbTIwMTVSZWZsZWN0aW9uSG9zdChwcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlZmxlY3Rpb25Ib3N0KHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbGVjdGlvbiBob3N0IGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RmlsZVBhcnNlcihmb3JtYXQ6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KTogRmlsZVBhcnNlciB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVGaWxlUGFyc2VyKHByb2dyYW0sIGhvc3QpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNUZpbGVQYXJzZXIocHJvZ3JhbSwgaG9zdCk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgcGFyc2VyIGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVuZGVyZXIoZm9ybWF0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCk6IFJlbmRlcmVyIHtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlbmRlcmVyKGhvc3QpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmVyKGhvc3QpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZW5kZXJlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGZpbmROb2RlTW9kdWxlc1BhdGgoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHdoaWxlIChzcmMgJiYgIS9ub2RlX21vZHVsZXMkLy50ZXN0KHNyYykpIHtcbiAgICAgIHNyYyA9IGRpcm5hbWUoc3JjKTtcbiAgICB9XG4gICAgcmV0dXJuIHNyYztcbiAgfVxuXG4gIHRyYW5zZm9ybUR0c0ZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICBkdHNNYXBwZXI6IER0c01hcHBlcik6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IG91dHB1dEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG5cbiAgICBhbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgIC8vIENyZWF0ZSBhIGBEdHNGaWxlVHJhbnNmb3JtZXJgIGZvciB0aGUgc291cmNlIGZpbGUgYW5kIHJlY29yZCB0aGUgZ2VuZXJhdGVkIGZpZWxkcywgd2hpY2hcbiAgICAgIC8vIHdpbGwgYWxsb3cgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgICAgY29uc3QgZHRzVHJhbnNmb3JtZXIgPSBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKG51bGwsIElNUE9SVF9QUkVGSVgpO1xuICAgICAgYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5mb3JFYWNoKFxuICAgICAgICAgIGFuYWx5emVkQ2xhc3MgPT5cbiAgICAgICAgICAgICAgZHRzVHJhbnNmb3JtZXIucmVjb3JkU3RhdGljRmllbGQoYW5hbHl6ZWRDbGFzcy5uYW1lLCBhbmFseXplZENsYXNzLmNvbXBpbGF0aW9uKSk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlLlxuICAgICAgY29uc3Qgc291cmNlRmlsZU5hbWUgPSBhbmFseXplZEZpbGUuc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsRHRzRmlsZU5hbWUgPSBkdHNNYXBwZXIuZ2V0RHRzRmlsZU5hbWVGb3Ioc291cmNlRmlsZU5hbWUpO1xuICAgICAgY29uc3Qgb3JpZ2luYWxEdHNDb250ZW50cyA9IHJlYWRGaWxlU3luYyhvcmlnaW5hbER0c0ZpbGVOYW1lLCAndXRmOCcpO1xuXG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIGAuZC50c2AgZmlsZSBiYXNlZCBvbiB0aGUgcmVjb3JkZWQgc291cmNlIGZpbGUgY2hhbmdlcy5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVkRHRzRmlsZU5hbWUgPVxuICAgICAgICAgIHJlc29sdmUodGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbGF0aXZlKHNvdXJjZU5vZGVNb2R1bGVzLCBvcmlnaW5hbER0c0ZpbGVOYW1lKSk7XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lZER0c0NvbnRlbnRzID0gZHRzVHJhbnNmb3JtZXIudHJhbnNmb3JtKG9yaWdpbmFsRHRzQ29udGVudHMsIHNvdXJjZUZpbGVOYW1lKTtcblxuICAgICAgLy8gQWRkIHRoZSB0cmFuc2Zvcm1lZCBgLmQudHNgIGZpbGUgdG8gdGhlIGxpc3Qgb2Ygb3V0cHV0IGZpbGVzLlxuICAgICAgb3V0cHV0RmlsZXMucHVzaCh7cGF0aDogdHJhbnNmb3JtZWREdHNGaWxlTmFtZSwgY29udGVudHM6IHRyYW5zZm9ybWVkRHRzQ29udGVudHN9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvdXRwdXRGaWxlcztcbiAgfVxuXG4gIHRyYW5zZm9ybVNvdXJjZUZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICByZW5kZXJlcjogUmVuZGVyZXIpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBvdXRwdXRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuXG4gICAgYW5hbHl6ZWRGaWxlcy5mb3JFYWNoKGFuYWx5emVkRmlsZSA9PiB7XG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlIGJhc2VkIG9uIHRoZSByZWNvcmRlZCBjaGFuZ2VzLlxuICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9XG4gICAgICAgICAgcmVzb2x2ZSh0YXJnZXROb2RlTW9kdWxlcywgcmVsYXRpdmUoc291cmNlTm9kZU1vZHVsZXMsIGFuYWx5emVkRmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lKSk7XG4gICAgICBjb25zdCB7c291cmNlLCBtYXB9ID0gcmVuZGVyZXIucmVuZGVyRmlsZShhbmFseXplZEZpbGUsIHRhcmdldFBhdGgpO1xuXG4gICAgICAvLyBBZGQgdGhlIHRyYW5zZm9ybWVkIGZpbGUgKGFuZCBzb3VyY2UgbWFwLCBpZiBhdmFpbGFibGUpIHRvIHRoZSBsaXN0IG9mIG91dHB1dCBmaWxlcy5cbiAgICAgIG91dHB1dEZpbGVzLnB1c2goc291cmNlKTtcbiAgICAgIGlmIChtYXApIHtcbiAgICAgICAgb3V0cHV0RmlsZXMucHVzaChtYXApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG91dHB1dEZpbGVzO1xuICB9XG5cbiAgd3JpdGVGaWxlKGZpbGU6IEZpbGVJbmZvKTogdm9pZCB7XG4gICAgbWtkaXIoJy1wJywgZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICBjb25zdCBiYWNrUGF0aCA9IGZpbGUucGF0aCArICcuYmFrJztcbiAgICBpZiAoZXhpc3RzU3luYyhmaWxlLnBhdGgpICYmICFleGlzdHNTeW5jKGJhY2tQYXRoKSkge1xuICAgICAgbXYoZmlsZS5wYXRoLCBiYWNrUGF0aCk7XG4gICAgfVxuICAgIHdyaXRlRmlsZVN5bmMoZmlsZS5wYXRoLCBmaWxlLmNvbnRlbnRzLCAndXRmOCcpO1xuICB9XG59XG4iXX0=