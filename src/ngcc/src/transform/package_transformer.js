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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV90cmFuc2Zvcm1lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvdHJhbnNmb3JtL3BhY2thZ2VfdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseUJBQTJEO0lBQzNELDZCQUFnRDtJQUNoRCxtQ0FBa0M7SUFDbEMsK0JBQWlDO0lBRWpDLHVFQUE0RDtJQUM1RCx3RUFBbUQ7SUFDbkQsMEVBQTJDO0lBQzNDLGlGQUE2QztJQUM3QyxxRkFBMkQ7SUFDM0QsK0VBQXFEO0lBQ3JELHVGQUE2RDtJQUU3RCw0RkFBNEQ7SUFDNUQsc0ZBQXNEO0lBRXRELGtHQUE4RDtJQUM5RCw0RkFBd0Q7SUFJeEQsNEVBQXVDO0lBSXZDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSDtRQUFBO1FBMEpBLENBQUM7UUF6SkMsc0NBQVMsR0FBVCxVQUFVLFdBQW1CLEVBQUUsTUFBYyxFQUFFLFVBQW1DO1lBQWxGLGlCQTZDQztZQTdDOEMsMkJBQUEsRUFBQSwyQkFBbUM7WUFDaEYsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEUsSUFBTSxpQkFBaUIsR0FBRyxjQUFPLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZFLElBQU0sV0FBVyxHQUFHLHNCQUFjLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBRXhELFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBQSxVQUFVO2dCQUM1QixJQUFNLFdBQVcsR0FBZSxFQUFFLENBQUM7Z0JBQ25DLElBQU0sT0FBTyxHQUF1QjtvQkFDbEMsT0FBTyxFQUFFLElBQUk7b0JBQ2Isb0JBQW9CLEVBQUUsUUFBUTtvQkFDOUIsT0FBTyxF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VSxHQUNaLGNBQU8sQ0FBQyxpQkFBaUIsRUFBRSxlQUFRLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN4RixJQUFBLGtEQUE2RCxFQUE1RCxrQkFBTSxFQUFFLFlBQUcsQ0FBa0Q7Z0JBRXBFLHVGQUF1RjtnQkFDdkYsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekIsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdkI7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRCxzQ0FBUyxHQUFULFVBQVUsSUFBYztZQUN0QixlQUFLLENBQUMsSUFBSSxFQUFFLGNBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoQyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztZQUNwQyxJQUFJLGVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ2xELFlBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3pCO1lBQ0Qsa0JBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQTFKRCxJQTBKQztJQTFKWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2V4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtkaXJuYW1lLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQge21rZGlyLCBtdn0gZnJvbSAnc2hlbGxqcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEdHNGaWxlVHJhbnNmb3JtZXJ9IGZyb20gJy4uLy4uLy4uL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge0FuYWx5emVkRmlsZSwgQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5emVyJztcbmltcG9ydCB7SU1QT1JUX1BSRUZJWH0gZnJvbSAnLi4vY29uc3RhbnRzJztcbmltcG9ydCB7RHRzTWFwcGVyfSBmcm9tICcuLi9ob3N0L2R0c19tYXBwZXInO1xuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTVfaG9zdCc7XG5pbXBvcnQge0Zlc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZmVzbTIwMTVfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtFc20yMDE1RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9lc20yMDE1X3BhcnNlcic7XG5pbXBvcnQge0VzbTVGaWxlUGFyc2VyfSBmcm9tICcuLi9wYXJzaW5nL2VzbTVfcGFyc2VyJztcbmltcG9ydCB7RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9maWxlX3BhcnNlcic7XG5pbXBvcnQge0VzbTIwMTVSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbTIwMTVfcmVuZGVyZXInO1xuaW1wb3J0IHtFc201UmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc201X3JlbmRlcmVyJztcbmltcG9ydCB7RmlsZUluZm8sIFJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuaW1wb3J0IHtpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtnZXRFbnRyeVBvaW50c30gZnJvbSAnLi91dGlscyc7XG5cblxuXG4vKipcbiAqIEEgUGFja2FnZSBpcyBzdG9yZWQgaW4gYSBkaXJlY3Rvcnkgb24gZGlzayBhbmQgdGhhdCBkaXJlY3RvcnkgY2FuIGNvbnRhaW4gb25lIG9yIG1vcmUgcGFja2FnZVxuICogZm9ybWF0cyAtIGUuZy4gZmVzbTIwMTUsIFVNRCwgZXRjLiBBZGRpdGlvbmFsbHksIGVhY2ggcGFja2FnZSBwcm92aWRlcyB0eXBpbmdzIChgLmQudHNgIGZpbGVzKS5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgU291cmNlRmlsZWAgdGhhdCBjYW4gYmUgcGFyc2VkIGFuZCBhbmFseXplZCB0b1xuICogaWRlbnRpZnkgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQ7IGFuZCB0aGVuIGZpbmFsbHkgcmVuZGVyZWQgYW5kIHdyaXR0ZW4gdG8gZGlzay5cbiAqIFRoZSBhY3R1YWwgZmlsZSB3aGljaCBuZWVkcyB0byBiZSB0cmFuc2Zvcm1lZCBkZXBlbmRzIHVwb24gdGhlIHBhY2thZ2UgZm9ybWF0LlxuICpcbiAqIEFsb25nIHdpdGggdGhlIHNvdXJjZSBmaWxlcywgdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIG1hcHMgKGVpdGhlciBpbmxpbmUgb3IgZXh0ZXJuYWwpIGFuZFxuICogYC5kLnRzYCBmaWxlcyBhcmUgdHJhbnNmb3JtZWQgYWNjb3JkaW5nbHkuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhY2thZ2VUcmFuc2Zvcm1lciB7XG4gIHRyYW5zZm9ybShwYWNrYWdlUGF0aDogc3RyaW5nLCBmb3JtYXQ6IHN0cmluZywgdGFyZ2V0UGF0aDogc3RyaW5nID0gJ25vZGVfbW9kdWxlcycpOiB2b2lkIHtcbiAgICBjb25zdCBzb3VyY2VOb2RlTW9kdWxlcyA9IHRoaXMuZmluZE5vZGVNb2R1bGVzUGF0aChwYWNrYWdlUGF0aCk7XG4gICAgY29uc3QgdGFyZ2V0Tm9kZU1vZHVsZXMgPSByZXNvbHZlKHNvdXJjZU5vZGVNb2R1bGVzLCAnLi4nLCB0YXJnZXRQYXRoKTtcbiAgICBjb25zdCBlbnRyeVBvaW50cyA9IGdldEVudHJ5UG9pbnRzKHBhY2thZ2VQYXRoLCBmb3JtYXQpO1xuXG4gICAgZW50cnlQb2ludHMuZm9yRWFjaChlbnRyeVBvaW50ID0+IHtcbiAgICAgIGNvbnN0IG91dHB1dEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG4gICAgICBjb25zdCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMgPSB7XG4gICAgICAgIGFsbG93SnM6IHRydWUsXG4gICAgICAgIG1heE5vZGVNb2R1bGVKc0RlcHRoOiBJbmZpbml0eSxcbiAgICAgICAgcm9vdERpcjogZW50cnlQb2ludC5lbnRyeUZpbGVOYW1lLFxuICAgICAgfTtcblxuICAgICAgLy8gQ3JlYXRlIHRoZSBUUyBwcm9ncmFtIGFuZCBuZWNlc3NhcnkgaGVscGVycy5cbiAgICAgIC8vIFRPRE8gOiBjcmVhdGUgYSBjdXN0b20gY29tcGlsZXIgaG9zdCB0aGF0IHJlYWRzIGZyb20gLmJhayBmaWxlcyBpZiBhdmFpbGFibGUuXG4gICAgICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KG9wdGlvbnMpO1xuICAgICAgY29uc3QgcGFja2FnZVByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKFtlbnRyeVBvaW50LmVudHJ5RmlsZU5hbWVdLCBvcHRpb25zLCBob3N0KTtcbiAgICAgIGNvbnN0IHR5cGVDaGVja2VyID0gcGFja2FnZVByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICAgIGNvbnN0IGR0c01hcHBlciA9IG5ldyBEdHNNYXBwZXIoZW50cnlQb2ludC5lbnRyeVJvb3QsIGVudHJ5UG9pbnQuZHRzRW50cnlSb290KTtcbiAgICAgIGNvbnN0IHJlZmxlY3Rpb25Ib3N0ID0gdGhpcy5nZXRIb3N0KGZvcm1hdCwgcGFja2FnZVByb2dyYW0sIGR0c01hcHBlcik7XG5cbiAgICAgIGNvbnN0IHBhcnNlciA9IHRoaXMuZ2V0RmlsZVBhcnNlcihmb3JtYXQsIHBhY2thZ2VQcm9ncmFtLCByZWZsZWN0aW9uSG9zdCk7XG4gICAgICBjb25zdCBhbmFseXplciA9IG5ldyBBbmFseXplcih0eXBlQ2hlY2tlciwgcmVmbGVjdGlvbkhvc3QpO1xuICAgICAgY29uc3QgcmVuZGVyZXIgPSB0aGlzLmdldFJlbmRlcmVyKGZvcm1hdCwgcGFja2FnZVByb2dyYW0sIHJlZmxlY3Rpb25Ib3N0KTtcblxuICAgICAgLy8gUGFyc2UgYW5kIGFuYWx5emUgdGhlIGZpbGVzLlxuICAgICAgY29uc3QgZW50cnlQb2ludEZpbGUgPSBwYWNrYWdlUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGVudHJ5UG9pbnQuZW50cnlGaWxlTmFtZSkgITtcbiAgICAgIGNvbnN0IHBhcnNlZEZpbGVzID0gcGFyc2VyLnBhcnNlRmlsZShlbnRyeVBvaW50RmlsZSk7XG4gICAgICBjb25zdCBhbmFseXplZEZpbGVzID0gcGFyc2VkRmlsZXMubWFwKHBhcnNlZEZpbGUgPT4gYW5hbHl6ZXIuYW5hbHl6ZUZpbGUocGFyc2VkRmlsZSkpO1xuXG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlcyBhbmQgc291cmNlIG1hcHMuXG4gICAgICBvdXRwdXRGaWxlcy5wdXNoKC4uLnRoaXMudHJhbnNmb3JtU291cmNlRmlsZXMoXG4gICAgICAgICAgYW5hbHl6ZWRGaWxlcywgc291cmNlTm9kZU1vZHVsZXMsIHRhcmdldE5vZGVNb2R1bGVzLCByZW5kZXJlcikpO1xuXG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIGAuZC50c2AgZmlsZXMgKGlmIG5lY2Vzc2FyeSkuXG4gICAgICAvLyBUT0RPKGdrYWxwYWspOiBXaGF0IGFib3V0IGAuZC50c2Agc291cmNlIG1hcHM/IChTZWVcbiAgICAgIC8vIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL3JlbGVhc2Utbm90ZXMvdHlwZXNjcmlwdC0yLTkuaHRtbCNuZXctLS1kZWNsYXJhdGlvbm1hcC4pXG4gICAgICBpZiAoZm9ybWF0ID09PSAnZXNtMjAxNScpIHtcbiAgICAgICAgb3V0cHV0RmlsZXMucHVzaCguLi50aGlzLnRyYW5zZm9ybUR0c0ZpbGVzKFxuICAgICAgICAgICAgYW5hbHl6ZWRGaWxlcywgc291cmNlTm9kZU1vZHVsZXMsIHRhcmdldE5vZGVNb2R1bGVzLCBkdHNNYXBwZXIpKTtcbiAgICAgIH1cblxuICAgICAgLy8gV3JpdGUgb3V0IGFsbCB0aGUgdHJhbnNmb3JtZWQgZmlsZXMuXG4gICAgICBvdXRwdXRGaWxlcy5mb3JFYWNoKGZpbGUgPT4gdGhpcy53cml0ZUZpbGUoZmlsZSkpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0SG9zdChmb3JtYXQ6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgZHRzTWFwcGVyOiBEdHNNYXBwZXIpOiBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc20yMDE1UmVmbGVjdGlvbkhvc3QocHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCBkdHNNYXBwZXIpO1xuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEZlc20yMDE1UmVmbGVjdGlvbkhvc3QocHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpKTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgY2FzZSAnZmVzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZWZsZWN0aW9uSG9zdChwcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWxlY3Rpb24gaG9zdCBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldEZpbGVQYXJzZXIoZm9ybWF0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCk6IEZpbGVQYXJzZXIge1xuICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgIGNhc2UgJ2Zlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc20yMDE1RmlsZVBhcnNlcihwcm9ncmFtLCBob3N0KTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgY2FzZSAnZmVzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVGaWxlUGFyc2VyKHByb2dyYW0sIGhvc3QpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHBhcnNlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmVyKGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QpOiBSZW5kZXJlciB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZW5kZXJlcihob3N0KTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgY2FzZSAnZmVzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVSZW5kZXJlcihob3N0KTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVuZGVyZXIgZm9yIFwiJHtmb3JtYXR9XCIgbm90IHlldCBpbXBsZW1lbnRlZC5gKTtcbiAgICB9XG4gIH1cblxuICBmaW5kTm9kZU1vZHVsZXNQYXRoKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICB3aGlsZSAoc3JjICYmICEvbm9kZV9tb2R1bGVzJC8udGVzdChzcmMpKSB7XG4gICAgICBzcmMgPSBkaXJuYW1lKHNyYyk7XG4gICAgfVxuICAgIHJldHVybiBzcmM7XG4gIH1cblxuICB0cmFuc2Zvcm1EdHNGaWxlcyhcbiAgICAgIGFuYWx5emVkRmlsZXM6IEFuYWx5emVkRmlsZVtdLCBzb3VyY2VOb2RlTW9kdWxlczogc3RyaW5nLCB0YXJnZXROb2RlTW9kdWxlczogc3RyaW5nLFxuICAgICAgZHRzTWFwcGVyOiBEdHNNYXBwZXIpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBvdXRwdXRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuXG4gICAgYW5hbHl6ZWRGaWxlcy5mb3JFYWNoKGFuYWx5emVkRmlsZSA9PiB7XG4gICAgICAvLyBDcmVhdGUgYSBgRHRzRmlsZVRyYW5zZm9ybWVyYCBmb3IgdGhlIHNvdXJjZSBmaWxlIGFuZCByZWNvcmQgdGhlIGdlbmVyYXRlZCBmaWVsZHMsIHdoaWNoXG4gICAgICAvLyB3aWxsIGFsbG93IHRoZSBjb3JyZXNwb25kaW5nIGAuZC50c2AgZmlsZSB0byBiZSB0cmFuc2Zvcm1lZCBsYXRlci5cbiAgICAgIGNvbnN0IGR0c1RyYW5zZm9ybWVyID0gbmV3IER0c0ZpbGVUcmFuc2Zvcm1lcihudWxsLCBJTVBPUlRfUFJFRklYKTtcbiAgICAgIGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaChcbiAgICAgICAgICBhbmFseXplZENsYXNzID0+XG4gICAgICAgICAgICAgIGR0c1RyYW5zZm9ybWVyLnJlY29yZFN0YXRpY0ZpZWxkKGFuYWx5emVkQ2xhc3MubmFtZSwgYW5hbHl6ZWRDbGFzcy5jb21waWxhdGlvbikpO1xuXG4gICAgICAvLyBGaW5kIHRoZSBjb3JyZXNwb25kaW5nIGAuZC50c2AgZmlsZS5cbiAgICAgIGNvbnN0IHNvdXJjZUZpbGVOYW1lID0gYW5hbHl6ZWRGaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWU7XG4gICAgICBjb25zdCBvcmlnaW5hbER0c0ZpbGVOYW1lID0gZHRzTWFwcGVyLmdldER0c0ZpbGVOYW1lRm9yKHNvdXJjZUZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsRHRzQ29udGVudHMgPSByZWFkRmlsZVN5bmMob3JpZ2luYWxEdHNGaWxlTmFtZSwgJ3V0ZjgnKTtcblxuICAgICAgLy8gVHJhbmZvcm0gdGhlIGAuZC50c2AgZmlsZSBiYXNlZCBvbiB0aGUgcmVjb3JkZWQgc291cmNlIGZpbGUgY2hhbmdlcy5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVkRHRzRmlsZU5hbWUgPVxuICAgICAgICAgIHJlc29sdmUodGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbGF0aXZlKHNvdXJjZU5vZGVNb2R1bGVzLCBvcmlnaW5hbER0c0ZpbGVOYW1lKSk7XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lZER0c0NvbnRlbnRzID0gZHRzVHJhbnNmb3JtZXIudHJhbnNmb3JtKG9yaWdpbmFsRHRzQ29udGVudHMsIHNvdXJjZUZpbGVOYW1lKTtcblxuICAgICAgLy8gQWRkIHRoZSB0cmFuc2Zvcm1lZCBgLmQudHNgIGZpbGUgdG8gdGhlIGxpc3Qgb2Ygb3V0cHV0IGZpbGVzLlxuICAgICAgb3V0cHV0RmlsZXMucHVzaCh7cGF0aDogdHJhbnNmb3JtZWREdHNGaWxlTmFtZSwgY29udGVudHM6IHRyYW5zZm9ybWVkRHRzQ29udGVudHN9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvdXRwdXRGaWxlcztcbiAgfVxuXG4gIHRyYW5zZm9ybVNvdXJjZUZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICByZW5kZXJlcjogUmVuZGVyZXIpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBvdXRwdXRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuXG4gICAgYW5hbHl6ZWRGaWxlcy5mb3JFYWNoKGFuYWx5emVkRmlsZSA9PiB7XG4gICAgICAvLyBUcmFuZm9ybSB0aGUgc291cmNlIGZpbGUgYmFzZWQgb24gdGhlIHJlY29yZGVkIGNoYW5nZXMuXG4gICAgICBjb25zdCB0YXJnZXRQYXRoID1cbiAgICAgICAgICByZXNvbHZlKHRhcmdldE5vZGVNb2R1bGVzLCByZWxhdGl2ZShzb3VyY2VOb2RlTW9kdWxlcywgYW5hbHl6ZWRGaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUpKTtcbiAgICAgIGNvbnN0IHtzb3VyY2UsIG1hcH0gPSByZW5kZXJlci5yZW5kZXJGaWxlKGFuYWx5emVkRmlsZSwgdGFyZ2V0UGF0aCk7XG5cbiAgICAgIC8vIEFkZCB0aGUgdHJhbnNmb3JtZWQgZmlsZSAoYW5kIHNvdXJjZSBtYXAsIGlmIGF2YWlsYWJsZSkgdG8gdGhlIGxpc3Qgb2Ygb3V0cHV0IGZpbGVzLlxuICAgICAgb3V0cHV0RmlsZXMucHVzaChzb3VyY2UpO1xuICAgICAgaWYgKG1hcCkge1xuICAgICAgICBvdXRwdXRGaWxlcy5wdXNoKG1hcCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gb3V0cHV0RmlsZXM7XG4gIH1cblxuICB3cml0ZUZpbGUoZmlsZTogRmlsZUluZm8pOiB2b2lkIHtcbiAgICBta2RpcignLXAnLCBkaXJuYW1lKGZpbGUucGF0aCkpO1xuICAgIGNvbnN0IGJhY2tQYXRoID0gZmlsZS5wYXRoICsgJy5iYWsnO1xuICAgIGlmIChleGlzdHNTeW5jKGZpbGUucGF0aCkgJiYgIWV4aXN0c1N5bmMoYmFja1BhdGgpKSB7XG4gICAgICBtdihmaWxlLnBhdGgsIGJhY2tQYXRoKTtcbiAgICB9XG4gICAgd3JpdGVGaWxlU3luYyhmaWxlLnBhdGgsIGZpbGUuY29udGVudHMsICd1dGY4Jyk7XG4gIH1cbn1cbiJdfQ==