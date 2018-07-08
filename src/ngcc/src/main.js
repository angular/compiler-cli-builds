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
        define("angular/packages/compiler-cli/src/ngcc/src/main", ["require", "exports", "path", "util", "angular/packages/compiler-cli/src/ngcc/src/transforming/package_transformer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /* tslint:disable:no-console */
    var path_1 = require("path");
    var util_1 = require("util");
    var package_transformer_1 = require("angular/packages/compiler-cli/src/ngcc/src/transforming/package_transformer");
    function mainNgcc(args) {
        var packagePath = path_1.resolve(args[0]);
        var transformer = new package_transformer_1.PackageTransformer();
        transformer.transform(packagePath, 'fesm2015');
        // const entryPointPaths = getEntryPoints(packagePath, 'fesm2015');
        // console.log('Entry points', entryPointPaths);
        // entryPointPaths.forEach(entryPointPath => {
        //   console.log('Processing', relative(packagePath, entryPointPath));
        //   const options: ts.CompilerOptions = { allowJs: true, rootDir: entryPointPath };
        //   const host = ts.createCompilerHost(options);
        //   const packageProgram = ts.createProgram([entryPointPath], options, host);
        //   const entryPointFile = packageProgram.getSourceFile(entryPointPath)!;
        //   const typeChecker = packageProgram.getTypeChecker();
        //   const reflectionHost = new Esm2015ReflectionHost(typeChecker);
        //   const parser = new Esm2015FileParser(packageProgram, reflectionHost);
        //   const parsedFiles = parser.parseFile(entryPointFile);
        //   parsedFiles.forEach(parsedFile => {
        //     dumpParsedFile(parsedFile);
        //     const analyzer = new Analyzer(typeChecker, reflectionHost);
        //     const analyzedFile = analyzer.analyzeFile(parsedFile);
        //     dumpAnalysis(analyzedFile);
        //     const renderer = new Esm2015Renderer();
        //     const output = renderer.renderFile(analyzedFile);
        //     // Dump the output for the `testing.js` files as an example
        //     if (output.file.sourceFile.fileName.endsWith('testing.js')) {
        //       console.log(output.content);
        //       console.log(output.map);
        //     }
        //   });
        // });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVGLCtCQUErQjtJQUVoQyw2QkFBdUM7SUFDdkMsNkJBQTZCO0lBRzdCLG1IQUFzRTtJQVN0RSxrQkFBeUIsSUFBYztRQUNyQyxJQUFNLFdBQVcsR0FBRyxjQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckMsSUFBTSxXQUFXLEdBQUcsSUFBSSx3Q0FBa0IsRUFBRSxDQUFDO1FBQzdDLFdBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQy9DLG1FQUFtRTtRQUVuRSxnREFBZ0Q7UUFDaEQsOENBQThDO1FBRTlDLHNFQUFzRTtRQUN0RSxvRkFBb0Y7UUFDcEYsaURBQWlEO1FBQ2pELDhFQUE4RTtRQUM5RSwwRUFBMEU7UUFDMUUseURBQXlEO1FBRXpELG1FQUFtRTtRQUNuRSwwRUFBMEU7UUFFMUUsMERBQTBEO1FBQzFELHdDQUF3QztRQUV4QyxrQ0FBa0M7UUFFbEMsa0VBQWtFO1FBQ2xFLDZEQUE2RDtRQUU3RCxrQ0FBa0M7UUFFbEMsOENBQThDO1FBQzlDLHdEQUF3RDtRQUV4RCxrRUFBa0U7UUFDbEUsb0VBQW9FO1FBQ3BFLHFDQUFxQztRQUNyQyxpQ0FBaUM7UUFDakMsUUFBUTtRQUNSLFFBQVE7UUFDUixNQUFNO1FBQ04sT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBekNELDRCQXlDQztJQUVELHdCQUF3QixVQUFzQjtRQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLG9FQUFvRSxDQUFDLENBQUM7UUFDbEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUM5QyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQUEsY0FBYztZQUNoRCxJQUFJLE1BQU0sR0FBRyxPQUFLLGNBQWMsQ0FBQyxJQUFJLE1BQUcsQ0FBQztZQUN6QyxjQUFjLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFNBQVM7Z0JBQ3pDLE1BQU0sSUFBSSxNQUFJLFNBQVMsQ0FBQyxJQUFNLENBQUM7Z0JBQy9CLElBQUksU0FBUyxDQUFDLElBQUksRUFBRTtvQkFDbEIsTUFBTSxJQUFJLEdBQUcsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEtBQUcsR0FBRyxDQUFDLE9BQU8sRUFBSSxFQUFsQixDQUFrQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUMxRTtnQkFDRCxNQUFNLElBQUksR0FBRyxDQUFDO1lBQ2hCLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxzQkFBc0IsSUFBa0I7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvRUFBb0UsQ0FBQyxDQUFDO1FBQ2xGLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBQSxhQUFhO1lBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBSyxhQUFhLENBQUMsSUFBTSxDQUFDLENBQUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFPLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLFNBQU8sSUFBTSxFQUFiLENBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuIC8qIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGUgKi9cblxuaW1wb3J0IHtyZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQge2luc3BlY3R9IGZyb20gJ3V0aWwnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UGFja2FnZVRyYW5zZm9ybWVyfSBmcm9tICcuL3RyYW5zZm9ybWluZy9wYWNrYWdlX3RyYW5zZm9ybWVyJztcblxuaW1wb3J0IHtBbmFseXplZEZpbGUsIEFuYWx5emVyfSBmcm9tICcuL2FuYWx5emVyJztcbmltcG9ydCB7RXNtMjAxNVJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuL2hvc3QvZXNtMjAxNV9ob3N0JztcbmltcG9ydCB7RXNtMjAxNUZpbGVQYXJzZXJ9IGZyb20gJy4vcGFyc2luZy9lc20yMDE1X3BhcnNlcic7XG5pbXBvcnQge0VzbTIwMTVSZW5kZXJlcn0gZnJvbSAnLi9yZW5kZXJpbmcvZXNtMjAxNV9yZW5kZXJlcic7XG5pbXBvcnQge2dldEVudHJ5UG9pbnRzfSBmcm9tICcuL3BhcnNpbmcvdXRpbHMnO1xuaW1wb3J0IHtQYXJzZWRGaWxlfSBmcm9tICcuL3BhcnNpbmcvcGFyc2VkX2ZpbGUnO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2MoYXJnczogc3RyaW5nW10pOiBudW1iZXIge1xuICBjb25zdCBwYWNrYWdlUGF0aCA9IHJlc29sdmUoYXJnc1swXSk7XG5cbiAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgUGFja2FnZVRyYW5zZm9ybWVyKCk7XG4gIHRyYW5zZm9ybWVyLnRyYW5zZm9ybShwYWNrYWdlUGF0aCwgJ2Zlc20yMDE1Jyk7XG4gIC8vIGNvbnN0IGVudHJ5UG9pbnRQYXRocyA9IGdldEVudHJ5UG9pbnRzKHBhY2thZ2VQYXRoLCAnZmVzbTIwMTUnKTtcblxuICAvLyBjb25zb2xlLmxvZygnRW50cnkgcG9pbnRzJywgZW50cnlQb2ludFBhdGhzKTtcbiAgLy8gZW50cnlQb2ludFBhdGhzLmZvckVhY2goZW50cnlQb2ludFBhdGggPT4ge1xuXG4gIC8vICAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcnLCByZWxhdGl2ZShwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpKTtcbiAgLy8gICBjb25zdCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMgPSB7IGFsbG93SnM6IHRydWUsIHJvb3REaXI6IGVudHJ5UG9pbnRQYXRoIH07XG4gIC8vICAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChvcHRpb25zKTtcbiAgLy8gICBjb25zdCBwYWNrYWdlUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oW2VudHJ5UG9pbnRQYXRoXSwgb3B0aW9ucywgaG9zdCk7XG4gIC8vICAgY29uc3QgZW50cnlQb2ludEZpbGUgPSBwYWNrYWdlUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGVudHJ5UG9pbnRQYXRoKSE7XG4gIC8vICAgY29uc3QgdHlwZUNoZWNrZXIgPSBwYWNrYWdlUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gIC8vICAgY29uc3QgcmVmbGVjdGlvbkhvc3QgPSBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KHR5cGVDaGVja2VyKTtcbiAgLy8gICBjb25zdCBwYXJzZXIgPSBuZXcgRXNtMjAxNUZpbGVQYXJzZXIocGFja2FnZVByb2dyYW0sIHJlZmxlY3Rpb25Ib3N0KTtcblxuICAvLyAgIGNvbnN0IHBhcnNlZEZpbGVzID0gcGFyc2VyLnBhcnNlRmlsZShlbnRyeVBvaW50RmlsZSk7XG4gIC8vICAgcGFyc2VkRmlsZXMuZm9yRWFjaChwYXJzZWRGaWxlID0+IHtcblxuICAvLyAgICAgZHVtcFBhcnNlZEZpbGUocGFyc2VkRmlsZSk7XG5cbiAgLy8gICAgIGNvbnN0IGFuYWx5emVyID0gbmV3IEFuYWx5emVyKHR5cGVDaGVja2VyLCByZWZsZWN0aW9uSG9zdCk7XG4gIC8vICAgICBjb25zdCBhbmFseXplZEZpbGUgPSBhbmFseXplci5hbmFseXplRmlsZShwYXJzZWRGaWxlKTtcblxuICAvLyAgICAgZHVtcEFuYWx5c2lzKGFuYWx5emVkRmlsZSk7XG5cbiAgLy8gICAgIGNvbnN0IHJlbmRlcmVyID0gbmV3IEVzbTIwMTVSZW5kZXJlcigpO1xuICAvLyAgICAgY29uc3Qgb3V0cHV0ID0gcmVuZGVyZXIucmVuZGVyRmlsZShhbmFseXplZEZpbGUpO1xuXG4gIC8vICAgICAvLyBEdW1wIHRoZSBvdXRwdXQgZm9yIHRoZSBgdGVzdGluZy5qc2AgZmlsZXMgYXMgYW4gZXhhbXBsZVxuICAvLyAgICAgaWYgKG91dHB1dC5maWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJ3Rlc3RpbmcuanMnKSkge1xuICAvLyAgICAgICBjb25zb2xlLmxvZyhvdXRwdXQuY29udGVudCk7XG4gIC8vICAgICAgIGNvbnNvbGUubG9nKG91dHB1dC5tYXApO1xuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuICAvLyB9KTtcbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIGR1bXBQYXJzZWRGaWxlKHBhcnNlZEZpbGU6IFBhcnNlZEZpbGUpIHtcbiAgY29uc29sZS5sb2coJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PScpO1xuICBjb25zb2xlLmxvZyhwYXJzZWRGaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICBjb25zb2xlLmxvZygnKioqKiogRGVjb3JhdGVkIGNsYXNzZXM6ICoqKioqJyk7XG4gIHBhcnNlZEZpbGUuZGVjb3JhdGVkQ2xhc3Nlcy5mb3JFYWNoKGRlY29yYXRlZENsYXNzID0+IHtcbiAgICBsZXQgb3V0cHV0ID0gYC0gJHtkZWNvcmF0ZWRDbGFzcy5uYW1lfSBgO1xuICAgIGRlY29yYXRlZENsYXNzLmRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgb3V0cHV0ICs9IGBbJHtkZWNvcmF0b3IubmFtZX1gO1xuICAgICAgaWYgKGRlY29yYXRvci5hcmdzKSB7XG4gICAgICAgIG91dHB1dCArPSAnICcgKyBkZWNvcmF0b3IuYXJncy5tYXAoYXJnID0+IGAke2FyZy5nZXRUZXh0KCl9YCkuam9pbignLCAnKTtcbiAgICAgIH1cbiAgICAgIG91dHB1dCArPSAnXSc7XG4gICAgfSk7XG4gICAgY29uc29sZS5sb2cob3V0cHV0KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGR1bXBBbmFseXNpcyhmaWxlOiBBbmFseXplZEZpbGUpIHtcbiAgY29uc29sZS5sb2coJz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PScpO1xuICBjb25zb2xlLmxvZyhmaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUpO1xuICBjb25zb2xlLmxvZygnKioqKiogQW5hbHl6ZWQgY2xhc3NlczogKioqKionKTtcbiAgZmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaChhbmFseXplZENsYXNzID0+IHtcbiAgICBjb25zb2xlLmxvZyhgLSAke2FuYWx5emVkQ2xhc3MubmFtZX1gKTtcbiAgICBjb25zb2xlLmxvZyhpbnNwZWN0KGFuYWx5emVkQ2xhc3MsIGZhbHNlLCAxLCB0cnVlKS5zcGxpdCgnXFxuJykubWFwKGxpbmUgPT4gYCAgICAke2xpbmV9YCkuam9pbignXFxuJykpO1xuICB9KTtcbn1cbiJdfQ==