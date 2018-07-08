/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("angular/packages/compiler-cli/src/ngcc/src/main", ["require", "exports", "path", "util", "typescript", "angular/packages/compiler-cli/src/ngcc/src/analyzer", "angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host", "angular/packages/compiler-cli/src/ngcc/src/parsing/esm2015_parser", "angular/packages/compiler-cli/src/ngcc/src/rendering/esm2015_renderer", "angular/packages/compiler-cli/src/ngcc/src/parsing/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /* tslint:disable:no-console */
    var path_1 = require("path");
    var util_1 = require("util");
    var ts = require("typescript");
    var analyzer_1 = require("angular/packages/compiler-cli/src/ngcc/src/analyzer");
    var esm2015_host_1 = require("angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host");
    var esm2015_parser_1 = require("angular/packages/compiler-cli/src/ngcc/src/parsing/esm2015_parser");
    var esm2015_renderer_1 = require("angular/packages/compiler-cli/src/ngcc/src/rendering/esm2015_renderer");
    var utils_1 = require("angular/packages/compiler-cli/src/ngcc/src/parsing/utils");
    function mainNgcc(args) {
        var packagePath = path_1.resolve(args[0]);
        var entryPointPaths = utils_1.getEntryPoints(packagePath, 'fesm2015');
        console.log('Entry points', entryPointPaths);
        entryPointPaths.forEach(function (entryPointPath) {
            console.log('Processing', path_1.relative(packagePath, entryPointPath));
            var options = { allowJs: true, rootDir: entryPointPath };
            var host = ts.createCompilerHost(options);
            var packageProgram = ts.createProgram([entryPointPath], options, host);
            var entryPointFile = packageProgram.getSourceFile(entryPointPath);
            var typeChecker = packageProgram.getTypeChecker();
            var reflectionHost = new esm2015_host_1.Esm2015ReflectionHost(typeChecker);
            var parser = new esm2015_parser_1.Esm2015FileParser(packageProgram, reflectionHost);
            var parsedFiles = parser.parseFile(entryPointFile);
            parsedFiles.forEach(function (parsedFile) {
                dumpParsedFile(parsedFile);
                var analyzer = new analyzer_1.Analyzer(typeChecker, reflectionHost);
                var analyzedFile = analyzer.analyzeFile(parsedFile);
                dumpAnalysis(analyzedFile);
                var renderer = new esm2015_renderer_1.Esm2015Renderer();
                var output = renderer.renderFile(analyzedFile);
                // Dump the output for the `testing.js` files as an example
                if (output.file.sourceFile.fileName.endsWith('testing.js')) {
                    console.log(output.content);
                    console.log(output.map);
                }
            });
        });
        return 0;
    }
    exports.mainNgcc = mainNgcc;
    function dumpParsedFile(parsedFile) {
        console.log('==================================================================');
        console.log(parsedFile.sourceFile.fileName);
        console.log('***** Decorated classes: *****');
        parsedFile.decoratedClasses.forEach(function (decoratedClass) {
            var output = "- " + decoratedClass.name + " ";
            decoratedClass.decorators.forEach(function (decorator) {
                output += "[" + decorator.name;
                if (decorator.args) {
                    output += ' ' + decorator.args.map(function (arg) { return "" + arg.getText(); }).join(', ');
                }
                output += ']';
            });
            console.log(output);
        });
    }
    function dumpAnalysis(file) {
        console.log('==================================================================');
        console.log(file.sourceFile.fileName);
        console.log('***** Analyzed classes: *****');
        file.analyzedClasses.forEach(function (analyzedClass) {
            console.log("- " + analyzedClass.name);
            console.log(util_1.inspect(analyzedClass, false, 1, true).split('\n').map(function (line) { return "    " + line; }).join('\n'));
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVGLCtCQUErQjtJQUVoQyw2QkFBdUM7SUFDdkMsNkJBQTZCO0lBQzdCLCtCQUFpQztJQUVqQyxnRkFBa0Q7SUFDbEQsNkZBQTBEO0lBQzFELG9HQUEyRDtJQUMzRCwwR0FBNkQ7SUFDN0Qsa0ZBQStDO0lBRy9DLGtCQUF5QixJQUFjO1FBQ3JDLElBQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxJQUFNLGVBQWUsR0FBRyxzQkFBYyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVoRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM3QyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUEsY0FBYztZQUVwQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxlQUFRLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDakUsSUFBTSxPQUFPLEdBQXVCLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLENBQUM7WUFDL0UsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLElBQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxjQUFjLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekUsSUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUUsQ0FBQztZQUNyRSxJQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsY0FBYyxF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QyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxTQUFPLElBQU0sRUFBYixDQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN4RyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbiAvKiB0c2xpbnQ6ZGlzYWJsZTpuby1jb25zb2xlICovXG5cbmltcG9ydCB7cmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtpbnNwZWN0fSBmcm9tICd1dGlsJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FuYWx5emVkRmlsZSwgQW5hbHl6ZXJ9IGZyb20gJy4vYW5hbHl6ZXInO1xuaW1wb3J0IHtFc20yMDE1UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vaG9zdC9lc20yMDE1X2hvc3QnO1xuaW1wb3J0IHtFc20yMDE1RmlsZVBhcnNlcn0gZnJvbSAnLi9wYXJzaW5nL2VzbTIwMTVfcGFyc2VyJztcbmltcG9ydCB7RXNtMjAxNVJlbmRlcmVyfSBmcm9tICcuL3JlbmRlcmluZy9lc20yMDE1X3JlbmRlcmVyJztcbmltcG9ydCB7Z2V0RW50cnlQb2ludHN9IGZyb20gJy4vcGFyc2luZy91dGlscyc7XG5pbXBvcnQge1BhcnNlZEZpbGV9IGZyb20gJy4vcGFyc2luZy9wYXJzZWRfZmlsZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhhcmdzOiBzdHJpbmdbXSk6IG51bWJlciB7XG4gIGNvbnN0IHBhY2thZ2VQYXRoID0gcmVzb2x2ZShhcmdzWzBdKTtcbiAgY29uc3QgZW50cnlQb2ludFBhdGhzID0gZ2V0RW50cnlQb2ludHMocGFja2FnZVBhdGgsICdmZXNtMjAxNScpO1xuXG4gIGNvbnNvbGUubG9nKCdFbnRyeSBwb2ludHMnLCBlbnRyeVBvaW50UGF0aHMpO1xuICBlbnRyeVBvaW50UGF0aHMuZm9yRWFjaChlbnRyeVBvaW50UGF0aCA9PiB7XG5cbiAgICBjb25zb2xlLmxvZygnUHJvY2Vzc2luZycsIHJlbGF0aXZlKHBhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCkpO1xuICAgIGNvbnN0IG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyA9IHsgYWxsb3dKczogdHJ1ZSwgcm9vdERpcjogZW50cnlQb2ludFBhdGggfTtcbiAgICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KG9wdGlvbnMpO1xuICAgIGNvbnN0IHBhY2thZ2VQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbShbZW50cnlQb2ludFBhdGhdLCBvcHRpb25zLCBob3N0KTtcbiAgICBjb25zdCBlbnRyeVBvaW50RmlsZSA9IHBhY2thZ2VQcm9ncmFtLmdldFNvdXJjZUZpbGUoZW50cnlQb2ludFBhdGgpITtcbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHBhY2thZ2VQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICBjb25zdCByZWZsZWN0aW9uSG9zdCA9IG5ldyBFc20yMDE1UmVmbGVjdGlvbkhvc3QodHlwZUNoZWNrZXIpO1xuICAgIGNvbnN0IHBhcnNlciA9IG5ldyBFc20yMDE1RmlsZVBhcnNlcihwYWNrYWdlUHJvZ3JhbSwgcmVmbGVjdGlvbkhvc3QpO1xuXG4gICAgY29uc3QgcGFyc2VkRmlsZXMgPSBwYXJzZXIucGFyc2VGaWxlKGVudHJ5UG9pbnRGaWxlKTtcbiAgICBwYXJzZWRGaWxlcy5mb3JFYWNoKHBhcnNlZEZpbGUgPT4ge1xuXG4gICAgICBkdW1wUGFyc2VkRmlsZShwYXJzZWRGaWxlKTtcblxuICAgICAgY29uc3QgYW5hbHl6ZXIgPSBuZXcgQW5hbHl6ZXIodHlwZUNoZWNrZXIsIHJlZmxlY3Rpb25Ib3N0KTtcbiAgICAgIGNvbnN0IGFuYWx5emVkRmlsZSA9IGFuYWx5emVyLmFuYWx5emVGaWxlKHBhcnNlZEZpbGUpO1xuXG4gICAgICBkdW1wQW5hbHlzaXMoYW5hbHl6ZWRGaWxlKTtcblxuICAgICAgY29uc3QgcmVuZGVyZXIgPSBuZXcgRXNtMjAxNVJlbmRlcmVyKCk7XG4gICAgICBjb25zdCBvdXRwdXQgPSByZW5kZXJlci5yZW5kZXJGaWxlKGFuYWx5emVkRmlsZSk7XG5cbiAgICAgIC8vIER1bXAgdGhlIG91dHB1dCBmb3IgdGhlIGB0ZXN0aW5nLmpzYCBmaWxlcyBhcyBhbiBleGFtcGxlXG4gICAgICBpZiAob3V0cHV0LmZpbGUuc291cmNlRmlsZS5maWxlTmFtZS5lbmRzV2l0aCgndGVzdGluZy5qcycpKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKG91dHB1dC5jb250ZW50KTtcbiAgICAgICAgY29uc29sZS5sb2cob3V0cHV0Lm1hcCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gZHVtcFBhcnNlZEZpbGUocGFyc2VkRmlsZTogUGFyc2VkRmlsZSkge1xuICBjb25zb2xlLmxvZygnPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Jyk7XG4gIGNvbnNvbGUubG9nKHBhcnNlZEZpbGUuc291cmNlRmlsZS5maWxlTmFtZSk7XG4gIGNvbnNvbGUubG9nKCcqKioqKiBEZWNvcmF0ZWQgY2xhc3NlczogKioqKionKTtcbiAgcGFyc2VkRmlsZS5kZWNvcmF0ZWRDbGFzc2VzLmZvckVhY2goZGVjb3JhdGVkQ2xhc3MgPT4ge1xuICAgIGxldCBvdXRwdXQgPSBgLSAke2RlY29yYXRlZENsYXNzLm5hbWV9IGA7XG4gICAgZGVjb3JhdGVkQ2xhc3MuZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICBvdXRwdXQgKz0gYFske2RlY29yYXRvci5uYW1lfWA7XG4gICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MpIHtcbiAgICAgICAgb3V0cHV0ICs9ICcgJyArIGRlY29yYXRvci5hcmdzLm1hcChhcmcgPT4gYCR7YXJnLmdldFRleHQoKX1gKS5qb2luKCcsICcpO1xuICAgICAgfVxuICAgICAgb3V0cHV0ICs9ICddJztcbiAgICB9KTtcbiAgICBjb25zb2xlLmxvZyhvdXRwdXQpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZHVtcEFuYWx5c2lzKGZpbGU6IEFuYWx5emVkRmlsZSkge1xuICBjb25zb2xlLmxvZygnPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Jyk7XG4gIGNvbnNvbGUubG9nKGZpbGUuc291cmNlRmlsZS5maWxlTmFtZSk7XG4gIGNvbnNvbGUubG9nKCcqKioqKiBBbmFseXplZCBjbGFzc2VzOiAqKioqKicpO1xuICBmaWxlLmFuYWx5emVkQ2xhc3Nlcy5mb3JFYWNoKGFuYWx5emVkQ2xhc3MgPT4ge1xuICAgIGNvbnNvbGUubG9nKGAtICR7YW5hbHl6ZWRDbGFzcy5uYW1lfWApO1xuICAgIGNvbnNvbGUubG9nKGluc3BlY3QoYW5hbHl6ZWRDbGFzcywgZmFsc2UsIDEsIHRydWUpLnNwbGl0KCdcXG4nKS5tYXAobGluZSA9PiBgICAgICR7bGluZX1gKS5qb2luKCdcXG4nKSk7XG4gIH0pO1xufVxuIl19