(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/transform/package_transformer", ["require", "exports", "fs", "path", "shelljs", "typescript", "@angular/compiler-cli/src/ngcc/src/analyzer", "@angular/compiler-cli/src/ngcc/src/host/esm2015_host", "@angular/compiler-cli/src/ngcc/src/host/esm5_host", "@angular/compiler-cli/src/ngcc/src/parsing/esm2015_parser", "@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser", "@angular/compiler-cli/src/ngcc/src/parsing/utils", "@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer", "@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer"], factory);
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
    var fs_1 = require("fs");
    var path_1 = require("path");
    var shelljs_1 = require("shelljs");
    var ts = require("typescript");
    var analyzer_1 = require("@angular/compiler-cli/src/ngcc/src/analyzer");
    var esm2015_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/esm2015_host");
    var esm5_host_1 = require("@angular/compiler-cli/src/ngcc/src/host/esm5_host");
    var esm2015_parser_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/esm2015_parser");
    var esm5_parser_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/esm5_parser");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/parsing/utils");
    var esm2015_renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/esm2015_renderer");
    var esm5_renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer");
    /**
     * A Package is stored in a directory on disk and that directory can contain one or more package
     formats - e.g. fesm2015, UMD, etc.
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
                var parser = _this.getFileParser(format, packageProgram, reflectionHost);
                var analyzer = new analyzer_1.Analyzer(typeChecker, reflectionHost);
                var renderer = _this.getRenderer(format, packageProgram, reflectionHost);
                var parsedFiles = parser.parseFile(entryPointFile);
                parsedFiles.forEach(function (parsedFile) {
                    var analyzedFile = analyzer.analyzeFile(parsedFile);
                    var targetPath = path_1.resolve(targetNodeModules, path_1.relative(sourceNodeModules, analyzedFile.sourceFile.fileName));
                    var _a = renderer.renderFile(analyzedFile, targetPath), source = _a.source, map = _a.map;
                    _this.writeFile(source);
                    if (map) {
                        _this.writeFile(map);
                    }
                });
            });
        };
        PackageTransformer.prototype.getHost = function (format, program) {
            switch (format) {
                case 'esm2015':
                case 'fesm2015':
                    return new esm2015_host_1.Esm2015ReflectionHost(program.getTypeChecker());
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
        PackageTransformer.prototype.writeFile = function (file) {
            shelljs_1.mkdir('-p', path_1.dirname(file.path));
            fs_1.writeFileSync(file.path, file.contents, 'utf8');
        };
        return PackageTransformer;
    }());
    exports.PackageTransformer = PackageTransformer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZV90cmFuc2Zvcm1lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvdHJhbnNmb3JtL3BhY2thZ2VfdHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5QkFBaUM7SUFDakMsNkJBQWdEO0lBQ2hELG1DQUE4QjtJQUM5QiwrQkFBaUM7SUFFakMsd0VBQXFDO0lBQ3JDLHFGQUEyRDtJQUMzRCwrRUFBcUQ7SUFFckQsNEZBQTREO0lBQzVELHNGQUFzRDtJQUV0RCwwRUFBZ0Q7SUFDaEQsa0dBQThEO0lBQzlELDRGQUF3RDtJQUl4RDs7Ozs7Ozs7Ozs7Ozs7OztPQWdCRztJQUNIO1FBQUE7UUE4RUEsQ0FBQztRQTdFQyxzQ0FBUyxHQUFULFVBQVUsV0FBbUIsRUFBRSxNQUFjO1lBQTdDLGlCQTRCQztZQTNCQyxJQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNoRSxJQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUMzRixJQUFNLGVBQWUsR0FBRyxzQkFBYyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUM1RCxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUEsY0FBYztnQkFDcEMsSUFBTSxPQUFPLEdBQXVCLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFDLENBQUM7Z0JBQzdFLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDNUMsSUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDekUsSUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUcsQ0FBQztnQkFDdEUsSUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUVwRCxJQUFNLGNBQWMsR0FBRyxLQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztnQkFDNUQsSUFBTSxNQUFNLEdBQUcsS0FBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2dCQUMxRSxJQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFRLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2dCQUMzRCxJQUFNLFFBQVEsR0FBRyxLQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBRTFFLElBQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ3JELFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBQSxVQUFVO29CQUM1QixJQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN0RCxJQUFNLFVBQVUsR0FBRyxjQUFPLENBQ3RCLGlCQUFpQixFQUFFLGVBQVEsQ0FBQyxpQkFBaUIsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ2hGLElBQUEsa0RBQTZELEVBQTVELGtCQUFNLEVBQUUsWUFBRyxDQUFrRDtvQkFDcEUsS0FBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDdkIsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsS0FBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDckI7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxvQ0FBTyxHQUFQLFVBQVEsTUFBYyxFQUFFLE9BQW1CO1lBQ3pDLFFBQVEsTUFBTSxFQUFFO2dCQUNkLEtBQUssU0FBUyxDQUFDO2dCQUNmLEtBQUssVUFBVTtvQkFDYixPQUFPLElBQUksb0NBQXFCLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7Z0JBQzdELEtBQUssT0FBTztvQkFDVixPQUFPLElBQUksOEJBQWtCLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7Z0JBQzFEO29CQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQXVCLE1BQU0sNEJBQXdCLENBQUMsQ0FBQzthQUMxRTtRQUNILENBQUM7UUFFRCwwQ0FBYSxHQUFiLFVBQWMsTUFBYyxFQUFFLE9BQW1CLEVBQUUsSUFBd0I7WUFDekUsUUFBUSxNQUFNLEVBQUU7Z0JBQ2QsS0FBSyxTQUFTLENBQUM7Z0JBQ2YsS0FBSyxVQUFVO29CQUNiLE9BQU8sSUFBSSxrQ0FBaUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzlDLEtBQUssT0FBTztvQkFDVixPQUFPLElBQUksNEJBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzNDO29CQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQW9CLE1BQU0sNEJBQXdCLENBQUMsQ0FBQzthQUN2RTtRQUNILENBQUM7UUFFRCx3Q0FBVyxHQUFYLFVBQVksTUFBYyxFQUFFLE9BQW1CLEVBQUUsSUFBd0I7WUFDdkUsUUFBUSxNQUFNLEVBQUU7Z0JBQ2QsS0FBSyxTQUFTLENBQUM7Z0JBQ2YsS0FBSyxVQUFVO29CQUNiLE9BQU8sSUFBSSxrQ0FBZSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuQyxLQUFLLE9BQU87b0JBQ1YsT0FBTyxJQUFJLDRCQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2hDO29CQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQWlCLE1BQU0sNEJBQXdCLENBQUMsQ0FBQzthQUNwRTtRQUNILENBQUM7UUFFRCxnREFBbUIsR0FBbkIsVUFBb0IsR0FBVztZQUM3QixPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3hDLEdBQUcsR0FBRyxjQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDcEI7WUFDRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFFRCxzQ0FBUyxHQUFULFVBQVUsSUFBYztZQUN0QixlQUFLLENBQUMsSUFBSSxFQUFFLGNBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoQyxrQkFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBOUVELElBOEVDO0lBOUVZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7d3JpdGVGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHtkaXJuYW1lLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQge21rZGlyfSBmcm9tICdzaGVsbGpzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FuYWx5emVyfSBmcm9tICcuLi9hbmFseXplcic7XG5pbXBvcnQge0VzbTIwMTVSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9lc20yMDE1X2hvc3QnO1xuaW1wb3J0IHtFc201UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvZXNtNV9ob3N0JztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge0VzbTIwMTVGaWxlUGFyc2VyfSBmcm9tICcuLi9wYXJzaW5nL2VzbTIwMTVfcGFyc2VyJztcbmltcG9ydCB7RXNtNUZpbGVQYXJzZXJ9IGZyb20gJy4uL3BhcnNpbmcvZXNtNV9wYXJzZXInO1xuaW1wb3J0IHtGaWxlUGFyc2VyfSBmcm9tICcuLi9wYXJzaW5nL2ZpbGVfcGFyc2VyJztcbmltcG9ydCB7Z2V0RW50cnlQb2ludHN9IGZyb20gJy4uL3BhcnNpbmcvdXRpbHMnO1xuaW1wb3J0IHtFc20yMDE1UmVuZGVyZXJ9IGZyb20gJy4uL3JlbmRlcmluZy9lc20yMDE1X3JlbmRlcmVyJztcbmltcG9ydCB7RXNtNVJlbmRlcmVyfSBmcm9tICcuLi9yZW5kZXJpbmcvZXNtNV9yZW5kZXJlcic7XG5pbXBvcnQge0ZpbGVJbmZvLCBSZW5kZXJlcn0gZnJvbSAnLi4vcmVuZGVyaW5nL3JlbmRlcmVyJztcblxuXG4vKipcbiAqIEEgUGFja2FnZSBpcyBzdG9yZWQgaW4gYSBkaXJlY3Rvcnkgb24gZGlzayBhbmQgdGhhdCBkaXJlY3RvcnkgY2FuIGNvbnRhaW4gb25lIG9yIG1vcmUgcGFja2FnZVxuIGZvcm1hdHMgLSBlLmcuIGZlc20yMDE1LCBVTUQsIGV0Yy5cbiAqXG4gKiBFYWNoIG9mIHRoZXNlIGZvcm1hdHMgZXhwb3NlcyBvbmUgb3IgbW9yZSBlbnRyeSBwb2ludHMsIHdoaWNoIGFyZSBzb3VyY2UgZmlsZXMgdGhhdCBuZWVkIHRvIGJlXG4gKiBwYXJzZWQgdG8gaWRlbnRpZnkgdGhlIGRlY29yYXRlZCBleHBvcnRlZCBjbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBhbmFseXplZCBhbmQgY29tcGlsZWQgYnkgb25lIG9yXG4gKiBtb3JlIGBEZWNvcmF0b3JIYW5kbGVyYCBvYmplY3RzLlxuICpcbiAqIEVhY2ggZW50cnkgcG9pbnQgdG8gYSBwYWNrYWdlIGlzIGlkZW50aWZpZWQgYnkgYSBgU291cmNlRmlsZWAgdGhhdCBjYW4gYmUgcGFyc2VkIGFuZCBhbmFseXplZFxuICogdG8gaWRlbnRpZnkgY2xhc3NlcyB0aGF0IG5lZWQgdG8gYmUgdHJhbnNmb3JtZWQ7IGFuZCB0aGVuIGZpbmFsbHkgcmVuZGVyZWQgYW5kIHdyaXR0ZW4gdG8gZGlzay5cblxuICogVGhlIGFjdHVhbCBmaWxlIHdoaWNoIG5lZWRzIHRvIGJlIHRyYW5zZm9ybWVkIGRlcGVuZHMgdXBvbiB0aGUgcGFja2FnZSBmb3JtYXQuXG4gKlxuICogLSBGbGF0IGZpbGUgcGFja2FnZXMgaGF2ZSBhbGwgdGhlIGNsYXNzZXMgaW4gYSBzaW5nbGUgZmlsZS5cbiAqIC0gT3RoZXIgcGFja2FnZXMgbWF5IHJlLWV4cG9ydCBjbGFzc2VzIGZyb20gb3RoZXIgbm9uLWVudHJ5IHBvaW50IGZpbGVzLlxuICogLSBTb21lIGZvcm1hdHMgbWF5IGNvbnRhaW4gbXVsdGlwbGUgXCJtb2R1bGVzXCIgaW4gYSBzaW5nbGUgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhY2thZ2VUcmFuc2Zvcm1lciB7XG4gIHRyYW5zZm9ybShwYWNrYWdlUGF0aDogc3RyaW5nLCBmb3JtYXQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHNvdXJjZU5vZGVNb2R1bGVzID0gdGhpcy5maW5kTm9kZU1vZHVsZXNQYXRoKHBhY2thZ2VQYXRoKTtcbiAgICBjb25zdCB0YXJnZXROb2RlTW9kdWxlcyA9IHNvdXJjZU5vZGVNb2R1bGVzLnJlcGxhY2UoL25vZGVfbW9kdWxlcyQvLCAnbm9kZV9tb2R1bGVzX25ndHNjJyk7XG4gICAgY29uc3QgZW50cnlQb2ludFBhdGhzID0gZ2V0RW50cnlQb2ludHMocGFja2FnZVBhdGgsIGZvcm1hdCk7XG4gICAgZW50cnlQb2ludFBhdGhzLmZvckVhY2goZW50cnlQb2ludFBhdGggPT4ge1xuICAgICAgY29uc3Qgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zID0ge2FsbG93SnM6IHRydWUsIHJvb3REaXI6IGVudHJ5UG9pbnRQYXRofTtcbiAgICAgIGNvbnN0IGhvc3QgPSB0cy5jcmVhdGVDb21waWxlckhvc3Qob3B0aW9ucyk7XG4gICAgICBjb25zdCBwYWNrYWdlUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oW2VudHJ5UG9pbnRQYXRoXSwgb3B0aW9ucywgaG9zdCk7XG4gICAgICBjb25zdCBlbnRyeVBvaW50RmlsZSA9IHBhY2thZ2VQcm9ncmFtLmdldFNvdXJjZUZpbGUoZW50cnlQb2ludFBhdGgpICE7XG4gICAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHBhY2thZ2VQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICAgIGNvbnN0IHJlZmxlY3Rpb25Ib3N0ID0gdGhpcy5nZXRIb3N0KGZvcm1hdCwgcGFja2FnZVByb2dyYW0pO1xuICAgICAgY29uc3QgcGFyc2VyID0gdGhpcy5nZXRGaWxlUGFyc2VyKGZvcm1hdCwgcGFja2FnZVByb2dyYW0sIHJlZmxlY3Rpb25Ib3N0KTtcbiAgICAgIGNvbnN0IGFuYWx5emVyID0gbmV3IEFuYWx5emVyKHR5cGVDaGVja2VyLCByZWZsZWN0aW9uSG9zdCk7XG4gICAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuZ2V0UmVuZGVyZXIoZm9ybWF0LCBwYWNrYWdlUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgICBjb25zdCBwYXJzZWRGaWxlcyA9IHBhcnNlci5wYXJzZUZpbGUoZW50cnlQb2ludEZpbGUpO1xuICAgICAgcGFyc2VkRmlsZXMuZm9yRWFjaChwYXJzZWRGaWxlID0+IHtcbiAgICAgICAgY29uc3QgYW5hbHl6ZWRGaWxlID0gYW5hbHl6ZXIuYW5hbHl6ZUZpbGUocGFyc2VkRmlsZSk7XG4gICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSByZXNvbHZlKFxuICAgICAgICAgICAgdGFyZ2V0Tm9kZU1vZHVsZXMsIHJlbGF0aXZlKHNvdXJjZU5vZGVNb2R1bGVzLCBhbmFseXplZEZpbGUuc291cmNlRmlsZS5maWxlTmFtZSkpO1xuICAgICAgICBjb25zdCB7c291cmNlLCBtYXB9ID0gcmVuZGVyZXIucmVuZGVyRmlsZShhbmFseXplZEZpbGUsIHRhcmdldFBhdGgpO1xuICAgICAgICB0aGlzLndyaXRlRmlsZShzb3VyY2UpO1xuICAgICAgICBpZiAobWFwKSB7XG4gICAgICAgICAgdGhpcy53cml0ZUZpbGUobWFwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRIb3N0KGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtKTogTmdjY1JlZmxlY3Rpb25Ib3N0IHtcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xuICAgICAgY2FzZSAnZXNtMjAxNSc6XG4gICAgICBjYXNlICdmZXNtMjAxNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgICBjYXNlICdmZXNtNSc6XG4gICAgICAgIHJldHVybiBuZXcgRXNtNVJlZmxlY3Rpb25Ib3N0KHByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbGVjdGlvbiBob3N0IGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RmlsZVBhcnNlcihmb3JtYXQ6IHN0cmluZywgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0KTogRmlsZVBhcnNlciB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVGaWxlUGFyc2VyKHByb2dyYW0sIGhvc3QpO1xuICAgICAgY2FzZSAnZmVzbTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTVGaWxlUGFyc2VyKHByb2dyYW0sIGhvc3QpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHBhcnNlciBmb3IgXCIke2Zvcm1hdH1cIiBub3QgeWV0IGltcGxlbWVudGVkLmApO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlbmRlcmVyKGZvcm1hdDogc3RyaW5nLCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QpOiBSZW5kZXJlciB7XG4gICAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2VzbTIwMTUnOlxuICAgICAgY2FzZSAnZmVzbTIwMTUnOlxuICAgICAgICByZXR1cm4gbmV3IEVzbTIwMTVSZW5kZXJlcihob3N0KTtcbiAgICAgIGNhc2UgJ2Zlc201JzpcbiAgICAgICAgcmV0dXJuIG5ldyBFc201UmVuZGVyZXIoaG9zdCk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbmRlcmVyIGZvciBcIiR7Zm9ybWF0fVwiIG5vdCB5ZXQgaW1wbGVtZW50ZWQuYCk7XG4gICAgfVxuICB9XG5cbiAgZmluZE5vZGVNb2R1bGVzUGF0aChzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgd2hpbGUgKHNyYyAmJiAhL25vZGVfbW9kdWxlcyQvLnRlc3Qoc3JjKSkge1xuICAgICAgc3JjID0gZGlybmFtZShzcmMpO1xuICAgIH1cbiAgICByZXR1cm4gc3JjO1xuICB9XG5cbiAgd3JpdGVGaWxlKGZpbGU6IEZpbGVJbmZvKTogdm9pZCB7XG4gICAgbWtkaXIoJy1wJywgZGlybmFtZShmaWxlLnBhdGgpKTtcbiAgICB3cml0ZUZpbGVTeW5jKGZpbGUucGF0aCwgZmlsZS5jb250ZW50cywgJ3V0ZjgnKTtcbiAgfVxufVxuIl19