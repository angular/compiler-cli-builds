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
            var isCore = entryPoint.name === '@angular/core';
            var r3SymbolsPath = isCore ? this.findR3SymbolsPath(canonical_path_1.dirname(entryPointFilePath)) : null;
            var rootPaths = r3SymbolsPath ? [entryPointFilePath, r3SymbolsPath] : [entryPointFilePath];
            var packageProgram = ts.createProgram(rootPaths, options, host);
            var typeChecker = packageProgram.getTypeChecker();
            var dtsMapper = new dts_mapper_1.DtsMapper(canonical_path_1.dirname(entryPointFilePath), canonical_path_1.dirname(entryPoint.typings));
            var reflectionHost = this.getHost(isCore, format, packageProgram, dtsMapper);
            var r3SymbolsFile = r3SymbolsPath && packageProgram.getSourceFile(r3SymbolsPath) || null;
            var parser = this.getFileParser(format, packageProgram, reflectionHost);
            var analyzer = new analyzer_1.Analyzer(typeChecker, reflectionHost, rootDirs, isCore);
            var renderer = this.getRenderer(format, packageProgram, reflectionHost, isCore, r3SymbolsFile);
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
        Transformer.prototype.getHost = function (isCore, format, program, dtsMapper) {
            switch (format) {
                case 'esm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(isCore, program.getTypeChecker(), dtsMapper);
                case 'fesm2015':
                    return new fesm2015_host_1.Fesm2015ReflectionHost(isCore, program.getTypeChecker());
                case 'esm5':
                case 'fesm5':
                    return new esm5_host_1.Esm5ReflectionHost(isCore, program.getTypeChecker());
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
        Transformer.prototype.getRenderer = function (format, program, host, isCore, rewriteCoreImportsTo) {
            switch (format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm2015_renderer_1.Esm2015Renderer(host, isCore, rewriteCoreImportsTo);
                case 'esm5':
                case 'fesm5':
                    return new esm5_renderer_1.Esm5Renderer(host, isCore, rewriteCoreImportsTo);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3BhY2thZ2VzL3RyYW5zZm9ybWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlEQUEwRDtJQUMxRCx5QkFBbUY7SUFDbkYsbUNBQWtDO0lBQ2xDLCtCQUFpQztJQUVqQyx1RUFBNEQ7SUFDNUQsd0VBQW1EO0lBQ25ELDBFQUEyQztJQUMzQyxpRkFBNkM7SUFDN0MscUZBQTJEO0lBQzNELCtFQUFxRDtJQUNyRCx1RkFBNkQ7SUFFN0QsNEZBQTREO0lBQzVELHNGQUFzRDtJQUV0RCxrR0FBOEQ7SUFDOUQsNEZBQXdEO0lBR3hELHlGQUFnRTtJQUdoRTs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0g7UUFDRSxxQkFBb0IsVUFBa0IsRUFBVSxVQUFrQjtZQUE5QyxlQUFVLEdBQVYsVUFBVSxDQUFRO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUFHLENBQUM7UUFFdEUsK0JBQVMsR0FBVCxVQUFVLFVBQXNCLEVBQUUsTUFBd0I7WUFBMUQsaUJBZ0VDO1lBL0RDLElBQUksOEJBQWUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQ3ZDLE9BQU87YUFDUjtZQUVELElBQU0sV0FBVyxHQUFlLEVBQUUsQ0FBQztZQUNuQyxJQUFNLE9BQU8sR0FBdUI7Z0JBQ2xDLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG9CQUFvQixFQUFFLFFBQVE7Z0JBQzlCLE9BQU8sRUFBRSxVQUFVLENBQUMsSUFBSTthQUN6QixDQUFDO1lBRUYsK0NBQStDO1lBQy9DLGdGQUFnRjtZQUNoRixJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUMsSUFBSSxRQUFRLEdBQXVCLFNBQVMs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Qyx3QkFBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN0RCxDQUFDLENBQUMsQ0FBQzs7Z0JBRVgsS0FBMkIsSUFBQSxtQkFBQSxpQkFBQSxjQUFjLENBQUEsOENBQUEsMEVBQUU7b0JBQXRDLElBQU0sWUFBWSwyQkFBQTtvQkFDckIsSUFBTSxtQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsd0JBQU8sQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztvQkFDbkYsSUFBSSxtQkFBaUIsRUFBRTt3QkFDckIsT0FBTyxtQkFBaUIsQ0FBQztxQkFDMUI7aUJBQ0Y7Ozs7Ozs7OztZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQXZNRCxJQXVNQztJQXZNWSxrQ0FBVyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7ZGlybmFtZSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCB7ZXhpc3RzU3luYywgbHN0YXRTeW5jLCByZWFkRmlsZVN5bmMsIHJlYWRkaXJTeW5jLCB3cml0ZUZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge21rZGlyLCBtdn0gZnJvbSAnc2hlbGxqcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEdHNGaWxlVHJhbnNmb3JtZXJ9IGZyb20gJy4uLy4uLy4uL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge0FuYWx5emVkRmlsZSwgQW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5emVyJztcbmltcG9ydCB7SU1QT1JUX1BSRUZJWH0gZnJvbSAnLi4vY29uc3RhbnRzJztcbmltcG9ydCB7RHRzTWFwcGVyfSBmcm9tICcuLi9ob3N0L2R0c19tYXBwZXInO1xuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RXNtNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L2VzbTVfaG9zdCc7XG5pbXBvcnQge0Zlc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZmVzbTIwMTVfaG9zdCc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtFc20yMDE1RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9lc20yMDE1X3BhcnNlcic7XG5pbXBvcnQge0VzbTVGaWxlUGFyc2VyfSBmcm9tICcuLi9wYXJzaW5nL2VzbTVfcGFyc2VyJztcbmltcG9ydCB7RmlsZVBhcnNlcn0gZnJvbSAnLi4vcGFyc2luZy9maWxlX3BhcnNlcic7XG5pbXBvcnQge0VzbTIwMTVSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL2VzbTIwMTVfcmVuZGVyZXInO1xuaW1wb3J0IHtFc201UmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc201X3JlbmRlcmVyJztcbmltcG9ydCB7RmlsZUluZm8sIFJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvcmVuZGVyZXInO1xuXG5pbXBvcnQge2NoZWNrTWFya2VyRmlsZSwgd3JpdGVNYXJrZXJGaWxlfSBmcm9tICcuL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG4vKipcbiAqIEEgUGFja2FnZSBpcyBzdG9yZWQgaW4gYSBkaXJlY3Rvcnkgb24gZGlzayBhbmQgdGhhdCBkaXJlY3RvcnkgY2FuIGNvbnRhaW4gb25lIG9yIG1vcmUgcGFja2FnZVxuICogZm9ybWF0cyAtIGUuZy4gZmVzbTIwMTUsIFVNRCwgZXRjLiBBZGRpdGlvbmFsbHksIGVhY2ggcGFja2FnZSBwcm92aWRlcyB0eXBpbmdzIChgLmQudHNgIGZpbGVzKS5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgU291cmNlRmlsZWAgdGhhdCBjYW4gYmUgcGFyc2VkIGFuZCBhbmFseXplZCB0b1xuICogaWRlbnRpZnkgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQ7IGFuZCB0aGVuIGZpbmFsbHkgcmVuZGVyZWQgYW5kIHdyaXR0ZW4gdG8gZGlzay5cbiAqIFRoZSBhY3R1YWwgZmlsZSB3aGljaCBuZWVkcyB0byBiZSB0cmFuc2Zvcm1lZCBkZXBlbmRzIHVwb24gdGhlIHBhY2thZ2UgZm9ybWF0LlxuICpcbiAqIEFsb25nIHdpdGggdGhlIHNvdXJjZSBmaWxlcywgdGhlIGNvcnJlc3BvbmRpbmcgc291cmNlIG1hcHMgKGVpdGhlciBpbmxpbmUgb3IgZXh0ZXJuYWwpIGFuZFxuICogYC5kLnRzYCBmaWxlcyBhcmUgdHJhbnNmb3JtZWQgYWNjb3JkaW5nbHkuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRyYW5zZm9ybWVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzb3VyY2VQYXRoOiBzdHJpbmcsIHByaXZhdGUgdGFyZ2V0UGF0aDogc3RyaW5nKSB7fVxuXG4gIHRyYW5zZm9ybShlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBmb3JtYXQ6IEVudHJ5UG9pbnRGb3JtYXQpOiB2b2lkIHtcbiAgICBpZiAoY2hlY2tNYXJrZXJGaWxlKGVudHJ5UG9pbnQsIGZvcm1hdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRwdXRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuICAgIGNvbnN0IG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAgIGFsbG93SnM6IHRydWUsXG4gICAgICBtYXhOb2RlTW9kdWxlSnNEZXB0aDogSW5maW5pdHksXG4gICAgICByb290RGlyOiBlbnRyeVBvaW50LnBhdGgsXG4gICAgfTtcblxuICAgIC8vIENyZWF0ZSB0aGUgVFMgcHJvZ3JhbSBhbmQgbmVjZXNzYXJ5IGhlbHBlcnMuXG4gICAgLy8gVE9ETyA6IGNyZWF0ZSBhIGN1c3RvbSBjb21waWxlciBob3N0IHRoYXQgcmVhZHMgZnJvbSAuYmFrIGZpbGVzIGlmIGF2YWlsYWJsZS5cbiAgICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KG9wdGlvbnMpO1xuICAgIGxldCByb290RGlyczogc3RyaW5nW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChvcHRpb25zLnJvb3REaXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJvb3REaXJzID0gb3B0aW9ucy5yb290RGlycztcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMucm9vdERpciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByb290RGlycyA9IFtvcHRpb25zLnJvb3REaXJdO1xuICAgIH0gZWxzZSB7XG4gICAgICByb290RGlycyA9IFtob3N0LmdldEN1cnJlbnREaXJlY3RvcnkoKV07XG4gICAgfVxuICAgIGNvbnN0IGVudHJ5UG9pbnRGaWxlUGF0aCA9IGVudHJ5UG9pbnRbZm9ybWF0XTtcbiAgICBpZiAoIWVudHJ5UG9pbnRGaWxlUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBNaXNzaW5nIGVudHJ5IHBvaW50IGZpbGUgZm9yIGZvcm1hdCwgJHtmb3JtYXR9LCBpbiBwYWNrYWdlLCAke2VudHJ5UG9pbnQucGF0aH0uYCk7XG4gICAgfVxuICAgIGNvbnN0IGlzQ29yZSA9IGVudHJ5UG9pbnQubmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xuICAgIGNvbnN0IHIzU3ltYm9sc1BhdGggPSBpc0NvcmUgPyB0aGlzLmZpbmRSM1N5bWJvbHNQYXRoKGRpcm5hbWUoZW50cnlQb2ludEZpbGVQYXRoKSkgOiBudWxsO1xuICAgIGNvbnN0IHJvb3RQYXRocyA9IHIzU3ltYm9sc1BhdGggPyBbZW50cnlQb2ludEZpbGVQYXRoLCByM1N5bWJvbHNQYXRoXSA6IFtlbnRyeVBvaW50RmlsZVBhdGhdO1xuICAgIGNvbnN0IHBhY2thZ2VQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShyb290UGF0aHMsIG9wdGlvbnMsIGhvc3QpO1xuICAgIGNvbnN0IHR5cGVDaGVja2VyID0gcGFja2FnZVByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBjb25zdCBkdHNNYXBwZXIgPSBuZXcgRHRzTWFwcGVyKGRpcm5hbWUoZW50cnlQb2ludEZpbGVQYXRoKSwgZGlybmFtZShlbnRyeVBvaW50LnR5cGluZ3MpKTtcbiAgICBjb25zdCByZWZsZWN0aW9uSG9zdCA9IHRoaXMuZ2V0SG9zdChpc0NvcmUsIGZvcm1hdCwgcGFja2FnZVByb2dyYW0sIGR0c01hcHBlcik7XG4gICAgY29uc3QgcjNTeW1ib2xzRmlsZSA9IHIzU3ltYm9sc1BhdGggJiYgcGFja2FnZVByb2dyYW0uZ2V0U291cmNlRmlsZShyM1N5bWJvbHNQYXRoKSB8fCBudWxsO1xuXG4gICAgY29uc3QgcGFyc2VyID0gdGhpcy5nZXRGaWxlUGFyc2VyKGZvcm1hdCwgcGFja2FnZVByb2dyYW0sIHJlZmxlY3Rpb25Ib3N0KTtcbiAgICBjb25zdCBhbmFseXplciA9IG5ldyBBbmFseXplcih0eXBlQ2hlY2tlciwgcmVmbGVjdGlvbkhvc3QsIHJvb3REaXJzLCBpc0NvcmUpO1xuICAgIGNvbnN0IHJlbmRlcmVyID1cbiAgICAgICAgdGhpcy5nZXRSZW5kZXJlcihmb3JtYXQsIHBhY2thZ2VQcm9ncmFtLCByZWZsZWN0aW9uSG9zdCwgaXNDb3JlLCByM1N5bWJvbHNGaWxlKTtcblxuICAgIC8vIFBhcnNlIGFuZCBhbmFseXplIHRoZSBmaWxlcy5cbiAgICBjb25zdCBlbnRyeVBvaW50RmlsZSA9IHBhY2thZ2VQcm9ncmFtLmdldFNvdXJjZUZpbGUoZW50cnlQb2ludEZpbGVQYXRoKSAhO1xuICAgIGNvbnN0IHBhcnNlZEZpbGVzID0gcGFyc2VyLnBhcnNlRmlsZShlbnRyeVBvaW50RmlsZSk7XG4gICAgY29uc3QgYW5hbHl6ZWRGaWxlcyA9IHBhcnNlZEZpbGVzLm1hcChwYXJzZWRGaWxlID0+IGFuYWx5emVyLmFuYWx5emVGaWxlKHBhcnNlZEZpbGUpKTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzIGFuZCBzb3VyY2UgbWFwcy5cbiAgICBvdXRwdXRGaWxlcy5wdXNoKFxuICAgICAgICAuLi50aGlzLnRyYW5zZm9ybVNvdXJjZUZpbGVzKGFuYWx5emVkRmlsZXMsIHRoaXMuc291cmNlUGF0aCwgdGhpcy50YXJnZXRQYXRoLCByZW5kZXJlcikpO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBgLmQudHNgIGZpbGVzIChpZiBuZWNlc3NhcnkpLlxuICAgIC8vIFRPRE8oZ2thbHBhayk6IFdoYXQgYWJvdXQgYC5kLnRzYCBzb3VyY2UgbWFwcz8gKFNlZVxuICAgIC8vIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL3JlbGVhc2Utbm90ZXMvdHlwZXNjcmlwdC0yLTkuaHRtbCNuZXctLS1kZWNsYXJhdGlvbm1hcC4pXG4gICAgaWYgKGZvcm1hdCA9PT0gJ2VzbTIwMTUnKSB7XG4gICAgICBvdXRwdXRGaWxlcy5wdXNoKFxuICAgICAgICAgIC4uLnRoaXMudHJhbnNmb3JtRHRzRmlsZXMoYW5hbHl6ZWRGaWxlcywgdGhpcy5zb3VyY2VQYXRoLCB0aGlzLnRhcmdldFBhdGgsIGR0c01hcHBlcikpO1xuICAgIH1cblxuICAgIC8vIFdyaXRlIG91dCBhbGwgdGhlIHRyYW5zZm9ybWVkIGZpbGVzLlxuICAgIG91dHB1dEZpbGVzLmZvckVhY2goZmlsZSA9PiB0aGlzLndyaXRlRmlsZShmaWxlKSk7XG5cbiAgICAvLyBXcml0ZSB0aGUgYnVpbHQtd2l0aC1uZ2NjIG1hcmtlclxuICAgIHdyaXRlTWFya2VyRmlsZShlbnRyeVBvaW50LCBmb3JtYXQpO1xuICB9XG5cbiAgZ2V0SG9zdChpc0NvcmU6IGJvb2xlYW4sIGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkdHNNYXBwZXI6IER0c01hcHBlcik6XG4gICAgICBOZ2NjUmVmbGVjdGlvbkhvc3Qge1xuICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc20yMDE1UmVmbGVjdGlvbkhvc3QoaXNDb3JlLCBwcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGR0c01hcHBlcik7XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRmVzbTIwMTVSZWZsZWN0aW9uSG9zdChpc0NvcmUsIHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgICBjYXNlICdlc201JzpcbiAgICAgIGNhc2UgJ2Zlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVmbGVjdGlvbkhvc3QoaXNDb3JlLCBwcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWxlY3Rpb24gaG9zdCBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldEZpbGVQYXJzZXIoZm9ybWF0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCk6IEZpbGVQYXJzZXIge1xuICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICBjYXNlICdlc20yMDE1JzpcbiAgICAgIGNhc2UgJ2Zlc20yMDE1JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc20yMDE1RmlsZVBhcnNlcihwcm9ncmFtLCBob3N0KTtcbiAgICAgIGNhc2UgJ2VzbTUnOlxuICAgICAgY2FzZSAnZmVzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVGaWxlUGFyc2VyKHByb2dyYW0sIGhvc3QpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHBhcnNlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmVyKFxuICAgICAgZm9ybWF0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcmV3cml0ZUNvcmVJbXBvcnRzVG86IHRzLlNvdXJjZUZpbGV8bnVsbCk6IFJlbmRlcmVyIHtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlbmRlcmVyKGhvc3QsIGlzQ29yZSwgcmV3cml0ZUNvcmVJbXBvcnRzVG8pO1xuICAgICAgY2FzZSAnZXNtNSc6XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlbmRlcmVyKGhvc3QsIGlzQ29yZSwgcmV3cml0ZUNvcmVJbXBvcnRzVG8pO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZW5kZXJlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIHRyYW5zZm9ybUR0c0ZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICBkdHNNYXBwZXI6IER0c01hcHBlcik6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IG91dHB1dEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG5cbiAgICBhbmFseXplZEZpbGVzLmZvckVhY2goYW5hbHl6ZWRGaWxlID0+IHtcbiAgICAgIC8vIENyZWF0ZSBhIGBEdHNGaWxlVHJhbnNmb3JtZXJgIGZvciB0aGUgc291cmNlIGZpbGUgYW5kIHJlY29yZCB0aGUgZ2VuZXJhdGVkIGZpZWxkcywgd2hpY2hcbiAgICAgIC8vIHdpbGwgYWxsb3cgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgICAgY29uc3QgZHRzVHJhbnNmb3JtZXIgPSBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKG51bGwsIElNUE9SVF9QUkVGSVgpO1xuICAgICAgYW5hbHl6ZWRGaWxlLmFuYWx5emVkQ2xhc3Nlcy5mb3JFYWNoKFxuICAgICAgICAgIGFuYWx5emVkQ2xhc3MgPT5cbiAgICAgICAgICAgICAgZHRzVHJhbnNmb3JtZXIucmVjb3JkU3RhdGljRmllbGQoYW5hbHl6ZWRDbGFzcy5uYW1lLCBhbmFseXplZENsYXNzLmNvbXBpbGF0aW9uKSk7XG5cbiAgICAgIC8vIEZpbmQgdGhlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlLlxuICAgICAgY29uc3Qgc291cmNlRmlsZU5hbWUgPSBhbmFseXplZEZpbGUuc291cmNlRmlsZS5maWxlTmFtZTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsRHRzRmlsZU5hbWUgPSBkdHNNYXBwZXIuZ2V0RHRzRmlsZU5hbWVGb3Ioc291cmNlRmlsZU5hbWUpO1xuICAgICAgY29uc3Qgb3JpZ2luYWxEdHNDb250ZW50cyA9IHJlYWRGaWxlU3luYyhvcmlnaW5hbER0c0ZpbGVOYW1lLCAndXRmOCcpO1xuXG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIGAuZC50c2AgZmlsZSBiYXNlZCBvbiB0aGUgcmVjb3JkZWQgc291cmNlIGZpbGUgY2hhbmdlcy5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVkRHRzRmlsZU5hbWUgPVxuICAgICAgICAgIHJlc29sdmUodGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbGF0aXZlKHNvdXJjZU5vZGVNb2R1bGVzLCBvcmlnaW5hbER0c0ZpbGVOYW1lKSk7XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lZER0c0NvbnRlbnRzID0gZHRzVHJhbnNmb3JtZXIudHJhbnNmb3JtKG9yaWdpbmFsRHRzQ29udGVudHMsIHNvdXJjZUZpbGVOYW1lKTtcblxuICAgICAgLy8gQWRkIHRoZSB0cmFuc2Zvcm1lZCBgLmQudHNgIGZpbGUgdG8gdGhlIGxpc3Qgb2Ygb3V0cHV0IGZpbGVzLlxuICAgICAgb3V0cHV0RmlsZXMucHVzaCh7cGF0aDogdHJhbnNmb3JtZWREdHNGaWxlTmFtZSwgY29udGVudHM6IHRyYW5zZm9ybWVkRHRzQ29udGVudHN9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBvdXRwdXRGaWxlcztcbiAgfVxuXG4gIHRyYW5zZm9ybVNvdXJjZUZpbGVzKFxuICAgICAgYW5hbHl6ZWRGaWxlczogQW5hbHl6ZWRGaWxlW10sIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmcsIHRhcmdldE5vZGVNb2R1bGVzOiBzdHJpbmcsXG4gICAgICByZW5kZXJlcjogUmVuZGVyZXIpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBvdXRwdXRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuXG4gICAgYW5hbHl6ZWRGaWxlcy5mb3JFYWNoKGFuYWx5emVkRmlsZSA9PiB7XG4gICAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlIGJhc2VkIG9uIHRoZSByZWNvcmRlZCBjaGFuZ2VzLlxuICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9XG4gICAgICAgICAgcmVzb2x2ZSh0YXJnZXROb2RlTW9kdWxlcywgcmVsYXRpdmUoc291cmNlTm9kZU1vZHVsZXMsIGFuYWx5emVkRmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lKSk7XG4gICAgICBjb25zdCB7c291cmNlLCBtYXB9ID0gcmVuZGVyZXIucmVuZGVyRmlsZShhbmFseXplZEZpbGUsIHRhcmdldFBhdGgpO1xuXG4gICAgICAvLyBBZGQgdGhlIHRyYW5zZm9ybWVkIGZpbGUgKGFuZCBzb3VyY2UgbWFwLCBpZiBhdmFpbGFibGUpIHRvIHRoZSBsaXN0IG9mIG91dHB1dCBmaWxlcy5cbiAgICAgIG91dHB1dEZpbGVzLnB1c2goc291cmNlKTtcbiAgICAgIGlmIChtYXApIHtcbiAgICAgICAgb3V0cHV0RmlsZXMucHVzaChtYXApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG91dHB1dEZpbGVzO1xuICB9XG5cbiAgd3JpdGVGaWxlKGZpbGU6IEZpbGVJbmZvKTogdm9pZCB7XG4gICAgbWtkaXIoJy1wJywgZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICBjb25zdCBiYWNrUGF0aCA9IGZpbGUucGF0aCArICcuYmFrJztcbiAgICBpZiAoZXhpc3RzU3luYyhmaWxlLnBhdGgpICYmICFleGlzdHNTeW5jKGJhY2tQYXRoKSkge1xuICAgICAgbXYoZmlsZS5wYXRoLCBiYWNrUGF0aCk7XG4gICAgfVxuICAgIHdyaXRlRmlsZVN5bmMoZmlsZS5wYXRoLCBmaWxlLmNvbnRlbnRzLCAndXRmOCcpO1xuICB9XG5cbiAgZmluZFIzU3ltYm9sc1BhdGgoZGlyZWN0b3J5OiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgcjNTeW1ib2xzRmlsZVBhdGggPSByZXNvbHZlKGRpcmVjdG9yeSwgJ3IzX3N5bWJvbHMuanMnKTtcbiAgICBpZiAoZXhpc3RzU3luYyhyM1N5bWJvbHNGaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiByM1N5bWJvbHNGaWxlUGF0aDtcbiAgICB9XG5cbiAgICBjb25zdCBzdWJEaXJlY3RvcmllcyA9XG4gICAgICAgIHJlYWRkaXJTeW5jKGRpcmVjdG9yeSlcbiAgICAgICAgICAgIC8vIE5vdCBpbnRlcmVzdGVkIGluIGhpZGRlbiBmaWxlc1xuICAgICAgICAgICAgLmZpbHRlcihwID0+ICFwLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgICAgIC8vIElnbm9yZSBub2RlX21vZHVsZXNcbiAgICAgICAgICAgIC5maWx0ZXIocCA9PiBwICE9PSAnbm9kZV9tb2R1bGVzJylcbiAgICAgICAgICAgIC8vIE9ubHkgaW50ZXJlc3RlZCBpbiBkaXJlY3RvcmllcyAoYW5kIG9ubHkgdGhvc2UgdGhhdCBhcmUgbm90IHN5bWxpbmtzKVxuICAgICAgICAgICAgLmZpbHRlcihwID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGxzdGF0U3luYyhyZXNvbHZlKGRpcmVjdG9yeSwgcCkpO1xuICAgICAgICAgICAgICByZXR1cm4gc3RhdC5pc0RpcmVjdG9yeSgpICYmICFzdGF0LmlzU3ltYm9saWNMaW5rKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgIGZvciAoY29uc3Qgc3ViRGlyZWN0b3J5IG9mIHN1YkRpcmVjdG9yaWVzKSB7XG4gICAgICBjb25zdCByM1N5bWJvbHNGaWxlUGF0aCA9IHRoaXMuZmluZFIzU3ltYm9sc1BhdGgocmVzb2x2ZShkaXJlY3RvcnksIHN1YkRpcmVjdG9yeSkpO1xuICAgICAgaWYgKHIzU3ltYm9sc0ZpbGVQYXRoKSB7XG4gICAgICAgIHJldHVybiByM1N5bWJvbHNGaWxlUGF0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIl19