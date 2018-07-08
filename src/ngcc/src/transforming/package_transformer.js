(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("angular/packages/compiler-cli/src/ngcc/src/transforming/package_transformer", ["require", "exports", "typescript", "shelljs", "fs", "path", "angular/packages/compiler-cli/src/ngcc/src/analyzer", "angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host", "angular/packages/compiler-cli/src/ngcc/src/parsing/esm2015_parser", "angular/packages/compiler-cli/src/ngcc/src/parsing/utils", "angular/packages/compiler-cli/src/ngcc/src/rendering/esm2015_renderer"], factory);
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
    var ts = require("typescript");
    var shelljs_1 = require("shelljs");
    var fs_1 = require("fs");
    var path_1 = require("path");
    var analyzer_1 = require("angular/packages/compiler-cli/src/ngcc/src/analyzer");
    var esm2015_host_1 = require("angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host");
    var esm2015_parser_1 = require("angular/packages/compiler-cli/src/ngcc/src/parsing/esm2015_parser");
    var utils_1 = require("angular/packages/compiler-cli/src/ngcc/src/parsing/utils");
    var esm2015_renderer_1 = require("angular/packages/compiler-cli/src/ngcc/src/rendering/esm2015_renderer");
    /**
     * A Package is stored in a directory on disk and that directory can contain one or more package formats - e.g. fesm2015, UMD, etc.
     *
     * Each of these formats exposes one or more entry points, which are source files that need to be
     * parsed to identify the decorated exported classes that need to be analyzed and compiled by one or
     * more `DecoratorHandler` objects.
     *
     * Each entry point to a package is identified by a `SourceFile` that can be parsed and analyzed
     * to identify classes that need to be transformed; and then finally rendered and written to disk.
    
     * The actual file which needs to be transformed depends upon the package format.
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
            var entryPointPaths = utils_1.getEntryPoints(packagePath, format);
            entryPointPaths.forEach(function (entryPointPath) {
                var options = { allowJs: true, rootDir: entryPointPath };
                var host = ts.createCompilerHost(options);
                var packageProgram = ts.createProgram([entryPointPath], options, host);
                var entryPointFile = packageProgram.getSourceFile(entryPointPath);
                var typeChecker = packageProgram.getTypeChecker();
                var reflectionHost = _this.getHost(format, packageProgram);
                var parser = new esm2015_parser_1.Esm2015FileParser(packageProgram, reflectionHost);
                var analyzer = new analyzer_1.Analyzer(typeChecker, reflectionHost);
                var renderer = new esm2015_renderer_1.Esm2015Renderer();
                var parsedFiles = parser.parseFile(entryPointFile);
                parsedFiles.forEach(function (parsedFile) {
                    var analyzedFile = analyzer.analyzeFile(parsedFile);
                    var targetPath = path_1.resolve(targetNodeModules, path_1.relative(sourceNodeModules, analyzedFile.sourceFile.fileName));
                    var _a = renderer.renderFile(analyzedFile, targetPath), source = _a.source, map = _a.map;
                    _this.writeFile(source);
                    _this.writeFile(map);
                });
            });
        };
        PackageTransformer.prototype.getHost = function (format, program) {
            switch (format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(program.getTypeChecker());
                default:
                    throw new Error("Relection host for \"" + format + "\" not yet implemented.");
            }
        };
        PackageTransformer.prototype.getFileParser = function (format, program, host) {
            switch (format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm2015_parser_1.Esm2015FileParser(program, host);
                default:
                    throw new Error("File parser for \"" + format + "\" not yet implemented.");
            }
        };
        PackageTransformer.prototype.getRenderer = function (format, program, host) {
            switch (format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm2015_renderer_1.Esm2015Renderer();
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
        PackageTransformer.prototype.writeFile = function (file) {
            shelljs_1.mkdir('-p', path_1.dirname(file.path));
            fs_1.writeFileSync(file.path, file.contents, 'utf8');
        };
        return PackageTransformer;
    }());
    exports.PackageTransformer = PackageTransformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV90cmFuc2Zvcm1lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvdHJhbnNmb3JtaW5nL3BhY2thZ2VfdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFDakMsbUNBQThCO0lBQzlCLHlCQUFpQztJQUNqQyw2QkFBZ0Q7SUFDaEQsZ0ZBQXFDO0lBRXJDLDZGQUEyRDtJQUUzRCxvR0FBNEQ7SUFDNUQsa0ZBQWdEO0lBRWhELDBHQUE4RDtJQUU5RDs7Ozs7Ozs7Ozs7Ozs7O09BZUc7SUFDRjtRQUFBO1FBc0VELENBQUM7UUFwRUMsc0NBQVMsR0FBVCxVQUFVLFdBQW1CLEVBQUUsTUFBYztZQUE3QyxpQkF5QkM7WUF4QkMsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDaEUsSUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDM0YsSUFBTSxlQUFlLEdBQUcsc0JBQWMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDNUQsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFBLGNBQWM7Z0JBQ3BDLElBQU0sT0FBTyxHQUF1QixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDO2dCQUMvRSxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzVDLElBQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3pFLElBQU0sY0FBYyxHQUFH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QUQsQ0FBQyxBQXRFQSxJQXNFQTtJQXRFYSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7bWtkaXJ9IGZyb20gJ3NoZWxsanMnO1xuaW1wb3J0IHt3cml0ZUZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge2Rpcm5hbWUsIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICdwYXRoJztcbmltcG9ydCB7QW5hbHl6ZXJ9IGZyb20gJy4uL2FuYWx5emVyJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge0VzbTIwMTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc20yMDE1X2hvc3QnO1xuaW1wb3J0IHtGaWxlUGFyc2VyfSBmcm9tICcuLi9wYXJzaW5nL2ZpbGVfcGFyc2VyJztcbmltcG9ydCB7RXNtMjAxNUZpbGVQYXJzZXJ9IGZyb20gJy4uL3BhcnNpbmcvZXNtMjAxNV9wYXJzZXInO1xuaW1wb3J0IHtnZXRFbnRyeVBvaW50c30gZnJvbSAnLi4vcGFyc2luZy91dGlscyc7XG5pbXBvcnQge0ZpbGVJbmZvLCBSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcbmltcG9ydCB7RXNtMjAxNVJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtMjAxNV9yZW5kZXJlcic7XG5cbi8qKlxuICogQSBQYWNrYWdlIGlzIHN0b3JlZCBpbiBhIGRpcmVjdG9yeSBvbiBkaXNrIGFuZCB0aGF0IGRpcmVjdG9yeSBjYW4gY29udGFpbiBvbmUgb3IgbW9yZSBwYWNrYWdlIGZvcm1hdHMgLSBlLmcuIGZlc20yMDE1LCBVTUQsIGV0Yy5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgU291cmNlRmlsZWAgdGhhdCBjYW4gYmUgcGFyc2VkIGFuZCBhbmFseXplZFxuICogdG8gaWRlbnRpZnkgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQ7IGFuZCB0aGVuIGZpbmFsbHkgcmVuZGVyZWQgYW5kIHdyaXR0ZW4gdG8gZGlzay5cblxuICogVGhlIGFjdHVhbCBmaWxlIHdoaWNoIG5lZWRzIHRvIGJlIHRyYW5zZm9ybWVkIGRlcGVuZHMgdXBvbiB0aGUgcGFja2FnZSBmb3JtYXQuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuIGV4cG9ydCBjbGFzcyBQYWNrYWdlVHJhbnNmb3JtZXIge1xuXG4gIHRyYW5zZm9ybShwYWNrYWdlUGF0aDogc3RyaW5nLCBmb3JtYXQ6IHN0cmluZykge1xuICAgIGNvbnN0IHNvdXJjZU5vZGVNb2R1bGVzID0gdGhpcy5maW5kTm9kZU1vZHVsZXNQYXRoKHBhY2thZ2VQYXRoKTtcbiAgICBjb25zdCB0YXJnZXROb2RlTW9kdWxlcyA9IHNvdXJjZU5vZGVNb2R1bGVzLnJlcGxhY2UoL25vZGVfbW9kdWxlcyQvLCAnbm9kZV9tb2R1bGVzX25ndHNjJyk7XG4gICAgY29uc3QgZW50cnlQb2ludFBhdGhzID0gZ2V0RW50cnlQb2ludHMocGFja2FnZVBhdGgsIGZvcm1hdCk7XG4gICAgZW50cnlQb2ludFBhdGhzLmZvckVhY2goZW50cnlQb2ludFBhdGggPT4ge1xuICAgICAgY29uc3Qgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zID0geyBhbGxvd0pzOiB0cnVlLCByb290RGlyOiBlbnRyeVBvaW50UGF0aCB9O1xuICAgICAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChvcHRpb25zKTtcbiAgICAgIGNvbnN0IHBhY2thZ2VQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShbZW50cnlQb2ludFBhdGhdLCBvcHRpb25zLCBob3N0KTtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRGaWxlID0gcGFja2FnZVByb2dyYW0uZ2V0U291cmNlRmlsZShlbnRyeVBvaW50UGF0aCkhO1xuICAgICAgY29uc3QgdHlwZUNoZWNrZXIgPSBwYWNrYWdlUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgICBjb25zdCByZWZsZWN0aW9uSG9zdCA9IHRoaXMuZ2V0SG9zdChmb3JtYXQsIHBhY2thZ2VQcm9ncmFtKTtcbiAgICAgIGNvbnN0IHBhcnNlciA9IG5ldyBFc20yMDE1RmlsZVBhcnNlcihwYWNrYWdlUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3QpO1xuICAgICAgY29uc3QgYW5hbHl6ZXIgPSBuZXcgQW5hbHl6ZXIodHlwZUNoZWNrZXIsIHJlZmxlY3Rpb25Ib3N0KTtcbiAgICAgIGNvbnN0IHJlbmRlcmVyID0gbmV3IEVzbTIwMTVSZW5kZXJlcigpO1xuXG4gICAgICBjb25zdCBwYXJzZWRGaWxlcyA9IHBhcnNlci5wYXJzZUZpbGUoZW50cnlQb2ludEZpbGUpO1xuICAgICAgcGFyc2VkRmlsZXMuZm9yRWFjaChwYXJzZWRGaWxlID0+IHtcbiAgICAgICAgY29uc3QgYW5hbHl6ZWRGaWxlID0gYW5hbHl6ZXIuYW5hbHl6ZUZpbGUocGFyc2VkRmlsZSk7XG4gICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSByZXNvbHZlKHRhcmdldE5vZGVNb2R1bGVzLCByZWxhdGl2ZShzb3VyY2VOb2RlTW9kdWxlcywgYW5hbHl6ZWRGaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUpKTtcbiAgICAgICAgY29uc3Qge3NvdXJjZSwgbWFwfSA9IHJlbmRlcmVyLnJlbmRlckZpbGUoYW5hbHl6ZWRGaWxlLCB0YXJnZXRQYXRoKTtcbiAgICAgICAgdGhpcy53cml0ZUZpbGUoc291cmNlKTtcbiAgICAgICAgdGhpcy53cml0ZUZpbGUobWFwKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0SG9zdChmb3JtYXQ6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSk6IE5nY2NSZWZsZWN0aW9uSG9zdCB7XG4gICAgc3dpdGNoKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWxlY3Rpb24gaG9zdCBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldEZpbGVQYXJzZXIoZm9ybWF0OiBzdHJpbmcsIHByb2dyYW06IHRzLlByb2dyYW0sIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCk6IEZpbGVQYXJzZXIge1xuICAgIHN3aXRjaChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVGaWxlUGFyc2VyKHByb2dyYW0sIGhvc3QpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHBhcnNlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmVyKGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QpOiBSZW5kZXJlciB7XG4gICAgc3dpdGNoKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlbmRlcmVyKCk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbmRlcmVyIGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZmluZE5vZGVNb2R1bGVzUGF0aChzcmM6IHN0cmluZykge1xuICAgIHdoaWxlKHNyYyAmJiAhL25vZGVfbW9kdWxlcyQvLnRlc3Qoc3JjKSkge1xuICAgICAgc3JjID0gZGlybmFtZShzcmMpO1xuICAgIH1cbiAgICByZXR1cm4gc3JjO1xuICB9XG5cbiAgd3JpdGVGaWxlKGZpbGU6IEZpbGVJbmZvKSB7XG4gICAgbWtkaXIoJy1wJywgZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICB3cml0ZUZpbGVTeW5jKGZpbGUucGF0aCwgZmlsZS5jb250ZW50cywgJ3V0ZjgnKTtcbiAgfVxufVxuIl19