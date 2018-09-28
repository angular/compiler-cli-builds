(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/packages/transformer", ["require", "exports", "tslib", "canonical-path", "fs", "shelljs", "typescript", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngcc/src/analyzer", "@angular/compiler-cli/src/ngcc/src/constants", "@angular/compiler-cli/src/ngcc/src/host/dts_mapper", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host", "@angular/compiler-cli/src/ngcc/src/host/esm5_host", "@angular/compiler-cli/src/ngcc/src/host/fesm2015_host", "@angular/compiler-cli/src/ngcc/src/parsing/esm2015_parser", "@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser", "@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer", "@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer", "@angular/compiler-cli/src/ngcc/src/packages/build_marker"], factory);
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
        Transformer.prototype.transform = function (entryPoint, format) {
            var _this = this;
            if (build_marker_1.checkMarkerFile(entryPoint, format)) {
                return;
            }
            var outputFiles = [];
            var options = {
                allowJs: true,
                maxNodeModuleJsDepth: Infinity,
                rootDir: entryPoint.path,
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
            var entryPointFilePath = entryPoint[format];
            if (!entryPointFilePath) {
                throw new Error("Missing entry point file for format, " + format + ", in package, " + entryPoint.path + ".");
            }
            var packageProgram = ts.createProgram([entryPointFilePath], options, host);
            var typeChecker = packageProgram.getTypeChecker();
            var dtsMapper = new dts_mapper_1.DtsMapper(canonical_path_1.dirname(entryPointFilePath), canonical_path_1.dirname(entryPoint.typings));
            var reflectionHost = this.getHost(format, packageProgram, dtsMapper);
            var parser = this.getFileParser(format, packageProgram, reflectionHost);
            var analyzer = new analyzer_1.Analyzer(typeChecker, reflectionHost, rootDirs);
            var renderer = this.getRenderer(format, packageProgram, reflectionHost);
            // Parse and analyze the files.
            var entryPointFile = packageProgram.getSourceFile(entryPointFilePath);
            var parsedFiles = parser.parseFile(entryPointFile);
            var analyzedFiles = parsedFiles.map(function (parsedFile) { return analyzer.analyzeFile(parsedFile); });
            // Transform the source files and source maps.
            outputFiles.push.apply(outputFiles, tslib_1.__spread(this.transformSourceFiles(analyzedFiles, this.sourcePath, this.targetPath, renderer)));
            // Transform the `.d.ts` files (if necessary).
            // TODO(gkalpak): What about `.d.ts` source maps? (See
            // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-9.html#new---declarationmap.)
            if (format === 'esm2015') {
                outputFiles.push.apply(outputFiles, tslib_1.__spread(this.transformDtsFiles(analyzedFiles, this.sourcePath, this.targetPath, dtsMapper)));
            }
            // Write out all the transformed files.
            outputFiles.forEach(function (file) { return _this.writeFile(file); });
            // Write the built-with-ngcc marker
            build_marker_1.writeMarkerFile(entryPoint, format);
        };
        Transformer.prototype.getHost = function (format, program, dtsMapper) {
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
        Transformer.prototype.getFileParser = function (format, program, host) {
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
        Transformer.prototype.getRenderer = function (format, program, host) {
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
        Transformer.prototype.transformDtsFiles = function (analyzedFiles, sourceNodeModules, targetNodeModules, dtsMapper) {
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
                var transformedDtsFileName = canonical_path_1.resolve(targetNodeModules, canonical_path_1.relative(sourceNodeModules, originalDtsFileName));
                var transformedDtsContents = dtsTransformer.transform(originalDtsContents, sourceFileName);
                // Add the transformed `.d.ts` file to the list of output files.
                outputFiles.push({ path: transformedDtsFileName, contents: transformedDtsContents });
            });
            return outputFiles;
        };
        Transformer.prototype.transformSourceFiles = function (analyzedFiles, sourceNodeModules, targetNodeModules, renderer) {
            var outputFiles = [];
            analyzedFiles.forEach(function (analyzedFile) {
                // Transform the source file based on the recorded changes.
                var targetPath = canonical_path_1.resolve(targetNodeModules, canonical_path_1.relative(sourceNodeModules, analyzedFile.sourceFile.fileName));
                var _a = renderer.renderFile(analyzedFile, targetPath), source = _a.source, map = _a.map;
                // Add the transformed file (and source map, if available) to the list of output files.
                outputFiles.push(source);
                if (map) {
                    outputFiles.push(map);
                }
            });
            return outputFiles;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhY2thZ2VzL3RyYW5zZm9ybWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlEQUEwRDtJQUMxRCx5QkFBMkQ7SUFDM0QsbUNBQWtDO0lBQ2xDLCtCQUFpQztJQUVqQyx1RUFBNEQ7SUFDNUQsd0VBQW1EO0lBQ25ELDBFQUEyQztJQUMzQyxpRkFBNkM7SUFDN0MscUZBQTJEO0lBQzNELCtFQUFxRDtJQUNyRCx1RkFBNkQ7SUFFN0QsNEZBQTREO0lBQzVELHNGQUFzRDtJQUV0RCxrR0FBOEQ7SUFDOUQsNEZBQXdEO0lBRXhELHlGQUFnRTtJQUloRTs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0g7UUFDRSxxQkFBb0IsVUFBa0IsRUFBVSxVQUFrQjtZQUE5QyxlQUFVLEdBQVYsVUFBVSxDQUFRO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUFHLENBQUM7UUFFdEUsK0JBQVMsR0FBVCxVQUFVLFVBQXNCLEVBQUUsTUFBd0I7WUFBMUQsaUJBMkRDO1lBMURDLElBQUksOEJBQWUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQ3ZDLE9BQU87YUFDUjtZQUVELElBQU0sV0FBVyxHQUFlLEVBQUUsQ0FBQztZQUNuQyxJQUFNLE9BQU8sR0FBdUI7Z0JBQ2xDLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG9CQUFvQixFQUFFLFFBQVE7Z0JBQzlCLE9BQU8sRUFBRSxVQUFVLENBQUMsSUFBSTthQUN6QixDQUFDO1lBRUYsK0NBQStDO1lBQy9DLGdGQUFnRjtZQUNoRixJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUMsSUFBSSxRQUFRLEdBQXVCLFNBQVMsQ0FBQztZQUM3QyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFO2dCQUNsQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQzthQUM3QjtpQkFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFO2dCQUN4QyxRQUFRLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDOUI7aUJBQU07Z0JBQ0wsUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQzthQUN6QztZQUNELElBQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtnQkFDdkIsTUFBTSxJQUFJLEtBQUssQ0FDWCwwQ0FBd0MsTUFBTSxzQkFBaUIsVUFBVSxDQUFDLElBQUksTUFBRyxDQUFDLENBQUM7YUFDeEY7WUFDRCxJQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsa0JBQWtCLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0UsSUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3BELElBQU0sU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQyx3QkFBTyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsd0JBQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxRixJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFdkUsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzFFLElBQU0sUUFBUSxHQUFHLElBQUksbUJBQVEsQ0FBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3JFLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUUxRSwrQkFBK0I7WUFDL0IsSUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBRyxDQUFDO1lBQzFFLElBQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDckQsSUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFBLFVBQVUsSUFBSSxPQUFBLFFBQVEsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQWhDLENBQWdDLENBQUMsQ0FBQztZQUV0Riw4Q0FBOEM7WUFDOUMsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFDSixJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsR0FBRTtZQUU3Riw4Q0FBOEM7WUFDOUMsc0RBQXNEO1lBQ3RELHdHQUF3RztZQUN4RyxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7Z0JBQ3hCLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQ0osSUFBSSxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLEdBQUU7YUFDNUY7WUFFRCx1Q0FBdUM7WUFDdkMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLEtBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQXBCLENBQW9CLENBQUMsQ0FBQztZQUVsRCxtQ0FBbUM7WUFDbkMsOEJBQWUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUVELDZCQUFPLEdBQVAsVUFBUSxNQUFjLEVBQUUsT0FBbUIsRUFBRSxTQUFvQjtZQUMvRCxRQUFRLE1BQU0sRUFBRTtnQkFDZCxLQUFLLFNBQVM7b0JBQ1osT0FBTyxJQUFJLG9DQUFxQixDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDeEUsS0FBSyxVQUFVO29CQUNiLE9BQU8sSUFBSSxzQ0FBc0IsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztnQkFDOUQsS0FBSyxNQUFNLENBQUM7Z0JBQ1osS0FBSyxPQUFPO29CQUNWLE9BQU8sSUFBSSw4QkFBa0IsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztnQkFDMUQ7b0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBdUIsTUFBTSw0QkFBd0IsQ0FBQyxDQUFDO2FBQzFFO1FBQ0gsQ0FBQztRQUVELG1DQUFhLEdBQWIsVUFBYyxNQUFjLEVBQUUsT0FBbUIsRUFBRSxJQUF3QjtZQUN6RSxRQUFRLE1BQU0sRUFBRTtnQkFDZCxLQUFLLFNBQVMsQ0FBQztnQkFDZixLQUFLLFVBQVU7b0JBQ2IsT0FBTyxJQUFJLGtDQUFpQixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDOUMsS0FBSyxNQUFNLENBQUM7Z0JBQ1osS0FBSyxPQUFPO29CQUNWLE9BQU8sSUFBSSw0QkFBYyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDM0M7b0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBb0IsTUFBTSw0QkFBd0IsQ0FBQyxDQUFDO2FBQ3ZFO1FBQ0gsQ0FBQztRQUVELGlDQUFXLEdBQVgsVUFBWSxNQUFjLEVBQUUsT0FBbUIsRUFBRSxJQUF3QjtZQUN2RSxRQUFRLE1BQU0sRUFBRTtnQkFDZCxLQUFLLFNBQVMsQ0FBQztnQkFDZixLQUFLLFVBQVU7b0JBQ2IsT0FBTyxJQUFJLGtDQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLEtBQUssTUFBTSxDQUFDO2dCQUNaLEtBQUssT0FBTztvQkFDVixPQUFPLElBQUksNEJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEM7b0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBaUIsTUFBTSw0QkFBd0IsQ0FBQyxDQUFDO2FBQ3BFO1FBQ0gsQ0FBQztRQUVELHVDQUFpQixHQUFqQixVQUNJLGFBQTZCLEVBQUUsaUJBQXlCLEVBQUUsaUJBQXlCLEVBQ25GLFNBQW9CO1lBQ3RCLElBQU0sV0FBVyxHQUFlLEVBQUUsQ0FBQztZQUVuQyxhQUFhLENBQUMsT0FBTyxDQUFDLFVBQUEsWUFBWTtnQkFDaEMsMkZBQTJGO2dCQUMzRixxRUFBcUU7Z0JBQ3JFLElBQU0sY0FBYyxHQUFHLElBQUksOEJBQWtCLENBQUMsSUFBSSxFQUFFLHlCQUFhLENBQUMsQ0FBQztnQkFDbkUsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQ2hDLFVBQUEsYUFBYTtvQkFDVCxPQUFBLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxXQUFXLENBQUM7Z0JBQS9FLENBQStFLENBQUMsQ0FBQztnQkFFekYsdUNBQXVDO2dCQUN2QyxJQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztnQkFDeEQsSUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ3hFLElBQU0sbUJBQW1CLEdBQUcsaUJBQVksQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFFdEUsd0VBQXdFO2dCQUN4RSxJQUFNLHNCQUFzQixHQUN4Qix3QkFBTyxDQUFDLGlCQUFpQixFQUFFLHlCQUFRLENBQUMsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO2dCQUNqRixJQUFNLHNCQUFzQixHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBRTdGLGdFQUFnRTtnQkFDaEUsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRSxRQUFRLEVBQUUsc0JBQXNCLEVBQUMsQ0FBQyxDQUFDO1lBQ3JGLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUVELDBDQUFvQixHQUFwQixVQUNJLGFBQTZCLEVBQUUsaUJBQXlCLEVBQUUsaUJBQXlCLEVBQ25GLFFBQWtCO1lBQ3BCLElBQU0sV0FBVyxHQUFlLEVBQUUsQ0FBQztZQUVuQyxhQUFhLENBQUMsT0FBTyxDQUFDLFVBQUEsWUFBWTtnQkFDaEMsMkRBQTJEO2dCQUMzRCxJQUFNLFVBQVUsR0FDWix3QkFBTyxDQUFDLGlCQUFpQixFQUFFLHlCQUFRLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN4RixJQUFBLGtEQUE2RCxFQUE1RCxrQkFBTSxFQUFFLFlBQW9ELENBQUM7Z0JBRXBFLHVGQUF1RjtnQkFDdkYsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekIsSUFBSSxHQUFHLEVBQUU7b0JBQ1AsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDdkI7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRCwrQkFBUyxHQUFULFVBQVUsSUFBYztZQUN0QixlQUFLLENBQUMsSUFBSSxFQUFFLHdCQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7WUFDcEMsSUFBSSxlQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNsRCxZQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN6QjtZQUNELGtCQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUFuS0QsSUFtS0M7SUFuS1ksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2Rpcm5hbWUsIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQge2V4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtta2RpciwgbXZ9IGZyb20gJ3NoZWxsanMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RHRzRmlsZVRyYW5zZm9ybWVyfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtBbmFseXplZEZpbGUsIEFuYWx5emVyfSBmcm9tICcuLi9hbmFseXplcic7XG5pbXBvcnQge0lNUE9SVF9QUkVGSVh9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQge0R0c01hcHBlcn0gZnJvbSAnLi4vaG9zdC9kdHNfbWFwcGVyJztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5pbXBvcnQge0VzbTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc201X2hvc3QnO1xuaW1wb3J0IHtGZXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2Zlc20yMDE1X2hvc3QnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7RXNtMjAxNUZpbGVQYXJzZXJ9IGZyb20gJy4uL3BhcnNpbmcvZXNtMjAxNV9wYXJzZXInO1xuaW1wb3J0IHtFc201RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9lc201X3BhcnNlcic7XG5pbXBvcnQge0ZpbGVQYXJzZXJ9IGZyb20gJy4uL3BhcnNpbmcvZmlsZV9wYXJzZXInO1xuaW1wb3J0IHtFc20yMDE1UmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc20yMDE1X3JlbmRlcmVyJztcbmltcG9ydCB7RXNtNVJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtNV9yZW5kZXJlcic7XG5pbXBvcnQge0ZpbGVJbmZvLCBSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcbmltcG9ydCB7Y2hlY2tNYXJrZXJGaWxlLCB3cml0ZU1hcmtlckZpbGV9IGZyb20gJy4vYnVpbGRfbWFya2VyJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cblxuLyoqXG4gKiBBIFBhY2thZ2UgaXMgc3RvcmVkIGluIGEgZGlyZWN0b3J5IG9uIGRpc2sgYW5kIHRoYXQgZGlyZWN0b3J5IGNhbiBjb250YWluIG9uZSBvciBtb3JlIHBhY2thZ2VcbiAqIGZvcm1hdHMgLSBlLmcuIGZlc20yMDE1LCBVTUQsIGV0Yy4gQWRkaXRpb25hbGx5LCBlYWNoIHBhY2thZ2UgcHJvdmlkZXMgdHlwaW5ncyAoYC5kLnRzYCBmaWxlcykuXG4gKlxuICogRWFjaCBvZiB0aGVzZSBmb3JtYXRzIGV4cG9zZXMgb25lIG9yIG1vcmUgZW50cnkgcG9pbnRzLCB3aGljaCBhcmUgc291cmNlIGZpbGVzIHRoYXQgbmVlZCB0byBiZVxuICogcGFyc2VkIHRvIGlkZW50aWZ5IHRoZSBkZWNvcmF0ZWQgZXhwb3J0ZWQgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgYW5hbHl6ZWQgYW5kIGNvbXBpbGVkIGJ5IG9uZSBvclxuICogbW9yZSBgRGVjb3JhdG9ySGFuZGxlcmAgb2JqZWN0cy5cbiAqXG4gKiBFYWNoIGVudHJ5IHBvaW50IHRvIGEgcGFja2FnZSBpcyBpZGVudGlmaWVkIGJ5IGEgYFNvdXJjZUZpbGVgIHRoYXQgY2FuIGJlIHBhcnNlZCBhbmQgYW5hbHl6ZWQgdG9cbiAqIGlkZW50aWZ5IGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkOyBhbmQgdGhlbiBmaW5hbGx5IHJlbmRlcmVkIGFuZCB3cml0dGVuIHRvIGRpc2suXG4gKiBUaGUgYWN0dWFsIGZpbGUgd2hpY2ggbmVlZHMgdG8gYmUgdHJhbnNmb3JtZWQgZGVwZW5kcyB1cG9uIHRoZSBwYWNrYWdlIGZvcm1hdC5cbiAqXG4gKiBBbG9uZyB3aXRoIHRoZSBzb3VyY2UgZmlsZXMsIHRoZSBjb3JyZXNwb25kaW5nIHNvdXJjZSBtYXBzIChlaXRoZXIgaW5saW5lIG9yIGV4dGVybmFsKSBhbmRcbiAqIGAuZC50c2AgZmlsZXMgYXJlIHRyYW5zZm9ybWVkIGFjY29yZGluZ2x5LlxuICpcbiAqIC0gRmxhdCBmaWxlIHBhY2thZ2VzIGhhdmUgYWxsIHRoZSBjbGFzc2VzIGluIGEgc2luZ2xlIGZpbGUuXG4gKiAtIE90aGVyIHBhY2thZ2VzIG1heSByZS1leHBvcnQgY2xhc3NlcyBmcm9tIG90aGVyIG5vbi1lbnRyeSBwb2ludCBmaWxlcy5cbiAqIC0gU29tZSBmb3JtYXRzIG1heSBjb250YWluIG11bHRpcGxlIFwibW9kdWxlc1wiIGluIGEgc2luZ2xlIGZpbGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBUcmFuc2Zvcm1lciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc291cmNlUGF0aDogc3RyaW5nLCBwcml2YXRlIHRhcmdldFBhdGg6IHN0cmluZykge31cblxuICB0cmFuc2Zvcm0oZW50cnlQb2ludDogRW50cnlQb2ludCwgZm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0KTogdm9pZCB7XG4gICAgaWYgKGNoZWNrTWFya2VyRmlsZShlbnRyeVBvaW50LCBmb3JtYXQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0RmlsZXM6IEZpbGVJbmZvW10gPSBbXTtcbiAgICBjb25zdCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMgPSB7XG4gICAgICBhbGxvd0pzOiB0cnVlLFxuICAgICAgbWF4Tm9kZU1vZHVsZUpzRGVwdGg6IEluZmluaXR5LFxuICAgICAgcm9vdERpcjogZW50cnlQb2ludC5wYXRoLFxuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgdGhlIFRTIHByb2dyYW0gYW5kIG5lY2Vzc2FyeSBoZWxwZXJzLlxuICAgIC8vIFRPRE8gOiBjcmVhdGUgYSBjdXN0b20gY29tcGlsZXIgaG9zdCB0aGF0IHJlYWRzIGZyb20gLmJhayBmaWxlcyBpZiBhdmFpbGFibGUuXG4gICAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChvcHRpb25zKTtcbiAgICBsZXQgcm9vdERpcnM6IHN0cmluZ1tdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAob3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByb290RGlycyA9IG9wdGlvbnMucm9vdERpcnM7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLnJvb3REaXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcm9vdERpcnMgPSBbb3B0aW9ucy5yb290RGlyXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcm9vdERpcnMgPSBbaG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCldO1xuICAgIH1cbiAgICBjb25zdCBlbnRyeVBvaW50RmlsZVBhdGggPSBlbnRyeVBvaW50W2Zvcm1hdF07XG4gICAgaWYgKCFlbnRyeVBvaW50RmlsZVBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgTWlzc2luZyBlbnRyeSBwb2ludCBmaWxlIGZvciBmb3JtYXQsICR7Zm9ybWF0fSwgaW4gcGFja2FnZSwgJHtlbnRyeVBvaW50LnBhdGh9LmApO1xuICAgIH1cbiAgICBjb25zdCBwYWNrYWdlUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oW2VudHJ5UG9pbnRGaWxlUGF0aF0sIG9wdGlvbnMsIGhvc3QpO1xuICAgIGNvbnN0IHR5cGVDaGVja2VyID0gcGFja2FnZVByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBjb25zdCBkdHNNYXBwZXIgPSBuZXcgRHRzTWFwcGVyKGRpcm5hbWUoZW50cnlQb2ludEZpbGVQYXRoKSwgZGlybmFtZShlbnRyeVBvaW50LnR5cGluZ3MpKTtcbiAgICBjb25zdCByZWZsZWN0aW9uSG9zdCA9IHRoaXMuZ2V0SG9zdChmb3JtYXQsIHBhY2thZ2VQcm9ncmFtLCBkdHNNYXBwZXIpO1xuXG4gICAgY29uc3QgcGFyc2VyID0gdGhpcy5nZXRGaWxlUGFyc2VyKGZvcm1hdCwgcGFja2FnZVByb2dyYW0sIHJlZmxlY3Rpb25Ib3N0KTtcbiAgICBjb25zdCBhbmFseXplciA9IG5ldyBBbmFseXplcih0eXBlQ2hlY2tlciwgcmVmbGVjdGlvbkhvc3QsIHJvb3REaXJzKTtcbiAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuZ2V0UmVuZGVyZXIoZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgLy8gUGFyc2UgYW5kIGFuYWx5emUgdGhlIGZpbGVzLlxuICAgIGNvbnN0IGVudHJ5UG9pbnRGaWxlID0gcGFja2FnZVByb2dyYW0uZ2V0U291cmNlRmlsZShlbnRyeVBvaW50RmlsZVBhdGgpICE7XG4gICAgY29uc3QgcGFyc2VkRmlsZXMgPSBwYXJzZXIucGFyc2VGaWxlKGVudHJ5UG9pbnRGaWxlKTtcbiAgICBjb25zdCBhbmFseXplZEZpbGVzID0gcGFyc2VkRmlsZXMubWFwKHBhcnNlZEZpbGUgPT4gYW5hbHl6ZXIuYW5hbHl6ZUZpbGUocGFyc2VkRmlsZSkpO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMgYW5kIHNvdXJjZSBtYXBzLlxuICAgIG91dHB1dEZpbGVzLnB1c2goXG4gICAgICAgIC4uLnRoaXMudHJhbnNmb3JtU291cmNlRmlsZXMoYW5hbHl6ZWRGaWxlcywgdGhpcy5zb3VyY2VQYXRoLCB0aGlzLnRhcmdldFBhdGgsIHJlbmRlcmVyKSk7XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIGAuZC50c2AgZmlsZXMgKGlmIG5lY2Vzc2FyeSkuXG4gICAgLy8gVE9ETyhna2FscGFrKTogV2hhdCBhYm91dCBgLmQudHNgIHNvdXJjZSBtYXBzPyAoU2VlXG4gICAgLy8gaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svcmVsZWFzZS1ub3Rlcy90eXBlc2NyaXB0LTItOS5odG1sI25ldy0tLWRlY2xhcmF0aW9ubWFwLilcbiAgICBpZiAoZm9ybWF0ID09PSAnZXNtMjAxNScpIHtcbiAgICAgIG91dHB1dEZpbGVzLnB1c2goXG4gICAgICAgICAgLi4udGhpcy50cmFuc2Zvcm1EdHNGaWxlcyhhbmFseXplZEZpbGVzLCB0aGlzLnNvdXJjZVBhdGgsIHRoaXMudGFyZ2V0UGF0aCwgZHRzTWFwcGVyKSk7XG4gICAgfVxuXG4gICAgLy8gV3JpdGUgb3V0IGFsbCB0aGUgdHJhbnNmb3JtZWQgZmlsZXMuXG4gICAgb3V0cHV0RmlsZXMuZm9yRWFjaChmaWxlID0+IHRoaXMud3JpdGVGaWxlKGZpbGUpKTtcblxuICAgIC8vIFdyaXRlIHRoZSBidWlsdC13aXRoLW5nY2MgbWFya2VyXG4gICAgd3JpdGVNYXJrZXJGaWxlKGVudHJ5UG9pbnQsIGZvcm1hdCk7XG4gIH1cblxuICBnZXRIb3N0KGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkdHNNYXBwZXI6IER0c01hcHBlcik6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZWZsZWN0aW9uSG9zdChwcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGR0c01hcHBlcik7XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRmVzbTIwMTVSZWZsZWN0aW9uSG9zdChwcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlZmxlY3Rpb25Ib3N0KHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbGVjdGlvbiBob3N0IGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RmlsZVBhcnNlcihmb3JtYXQ6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KTogRmlsZVBhcnNlciB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVGaWxlUGFyc2VyKHByb2dyYW0sIGhvc3QpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNUZpbGVQYXJzZXIocHJvZ3JhbSwgaG9zdCk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgcGFyc2VyIGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVuZGVyZXIoZm9ybWF0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCk6IFJlbmRlcmVyIHtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlbmRlcmVyKGhvc3QpO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmVyKGhvc3QpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZW5kZXJlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIHRyYW5zZm9ybUR0c0ZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICBkdHNNYXBwZXI6IER0c01hcHBlcik6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IG91dHB1dEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG5cbiAgICBhbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgIC8vIENyZWF0ZSBhIGBEdHNGaWxlVHJhbnNmb3JtZXJgIGZvciB0aGUgc291cmNlIGZpbGUgYW5kIHJlY29yZCB0aGUgZ2VuZXJhdGVkIGZpZWxkcywgd2hpY2hcbiAgICAgIC8vIHdpbGwgYWxsb3cgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgICAgY29uc3QgZHRzVHJhbnNmb3JtZXIgPSBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKG51bGwsIElNUE9SVF9QUkVGSVgpO1xuICAgICAgYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5mb3JFYWNoKFxuICAgICAgICAgIGFuYWx5emVkQ2xhc3MgPT5cbiAgICAgICAgICAgICAgZHRzVHJhbnNmb3JtZXIucmVjb3JkU3RhdGljRmllbGQoYW5hbHl6ZWRDbGFzcy5uYW1lLCBhbmFseXplZENsYXNzLmNvbXBpbGF0aW9uKSk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlLlxuICAgICAgY29uc3Qgc291cmNlRmlsZU5hbWUgPSBhbmFseXplZEZpbGUuc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsRHRzRmlsZU5hbWUgPSBkdHNNYXBwZXIuZ2V0RHRzRmlsZU5hbWVGb3Ioc291cmNlRmlsZU5hbWUpO1xuICAgICAgY29uc3Qgb3JpZ2luYWxEdHNDb250ZW50cyA9IHJlYWRGaWxlU3luYyhvcmlnaW5hbER0c0ZpbGVOYW1lLCAndXRmOCcpO1xuXG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIGAuZC50c2AgZmlsZSBiYXNlZCBvbiB0aGUgcmVjb3JkZWQgc291cmNlIGZpbGUgY2hhbmdlcy5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVkRHRzRmlsZU5hbWUgPVxuICAgICAgICAgIHJlc29sdmUodGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbGF0aXZlKHNvdXJjZU5vZGVNb2R1bGVzLCBvcmlnaW5hbER0c0ZpbGVOYW1lKSk7XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lZER0c0NvbnRlbnRzID0gZHRzVHJhbnNmb3JtZXIudHJhbnNmb3JtKG9yaWdpbmFsRHRzQ29udGVudHMsIHNvdXJjZUZpbGVOYW1lKTtcblxuICAgICAgLy8gQWRkIHRoZSB0cmFuc2Zvcm1lZCBgLmQudHNgIGZpbGUgdG8gdGhlIGxpc3Qgb2Ygb3V0cHV0IGZpbGVzLlxuICAgICAgb3V0cHV0RmlsZXMucHVzaCh7cGF0aDogdHJhbnNmb3JtZWREdHNGaWxlTmFtZSwgY29udGVudHM6IHRyYW5zZm9ybWVkRHRzQ29udGVudHN9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvdXRwdXRGaWxlcztcbiAgfVxuXG4gIHRyYW5zZm9ybVNvdXJjZUZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICByZW5kZXJlcjogUmVuZGVyZXIpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBvdXRwdXRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuXG4gICAgYW5hbHl6ZWRGaWxlcy5mb3JFYWNoKGFuYWx5emVkRmlsZSA9PiB7XG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlIGJhc2VkIG9uIHRoZSByZWNvcmRlZCBjaGFuZ2VzLlxuICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9XG4gICAgICAgICAgcmVzb2x2ZSh0YXJnZXROb2RlTW9kdWxlcywgcmVsYXRpdmUoc291cmNlTm9kZU1vZHVsZXMsIGFuYWx5emVkRmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lKSk7XG4gICAgICBjb25zdCB7c291cmNlLCBtYXB9ID0gcmVuZGVyZXIucmVuZGVyRmlsZShhbmFseXplZEZpbGUsIHRhcmdldFBhdGgpO1xuXG4gICAgICAvLyBBZGQgdGhlIHRyYW5zZm9ybWVkIGZpbGUgKGFuZCBzb3VyY2UgbWFwLCBpZiBhdmFpbGFibGUpIHRvIHRoZSBsaXN0IG9mIG91dHB1dCBmaWxlcy5cbiAgICAgIG91dHB1dEZpbGVzLnB1c2goc291cmNlKTtcbiAgICAgIGlmIChtYXApIHtcbiAgICAgICAgb3V0cHV0RmlsZXMucHVzaChtYXApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG91dHB1dEZpbGVzO1xuICB9XG5cbiAgd3JpdGVGaWxlKGZpbGU6IEZpbGVJbmZvKTogdm9pZCB7XG4gICAgbWtkaXIoJy1wJywgZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICBjb25zdCBiYWNrUGF0aCA9IGZpbGUucGF0aCArICcuYmFrJztcbiAgICBpZiAoZXhpc3RzU3luYyhmaWxlLnBhdGgpICYmICFleGlzdHNTeW5jKGJhY2tQYXRoKSkge1xuICAgICAgbXYoZmlsZS5wYXRoLCBiYWNrUGF0aCk7XG4gICAgfVxuICAgIHdyaXRlRmlsZVN5bmMoZmlsZS5wYXRoLCBmaWxlLmNvbnRlbnRzLCAndXRmOCcpO1xuICB9XG59XG4iXX0=