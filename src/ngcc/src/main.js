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
        define("angular/packages/compiler-cli/src/ngcc/src/main", ["require", "exports", "path", "typescript", "angular/packages/compiler-cli/src/ngcc/src/parser/flat_esm2015_parser", "angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /* tslint:disable:no-console */
    var path_1 = require("path");
    var ts = require("typescript");
    var flat_esm2015_parser_1 = require("angular/packages/compiler-cli/src/ngcc/src/parser/flat_esm2015_parser");
    var esm2015_host_1 = require("angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host");
    function mainNgcc(args) {
        var rootPath = args[0];
        var packagePath = path_1.resolve(rootPath, 'fesm2015');
        var entryPointPath = path_1.resolve(packagePath, 'common.js');
        var options = { allowJs: true, rootDir: packagePath };
        var host = ts.createCompilerHost(options);
        var packageProgram = ts.createProgram([entryPointPath], options, host);
        var entryPointFile = packageProgram.getSourceFile(entryPointPath);
        var typeChecker = packageProgram.getTypeChecker();
        var reflectionHost = new esm2015_host_1.Esm2015ReflectionHost(typeChecker);
        var parser = new flat_esm2015_parser_1.FlatEsm2015PackageParser(typeChecker, reflectionHost);
        var decoratedClasses = parser.getDecoratedClasses(entryPointFile);
        dumpDecoratedClasses(decoratedClasses);
        return 0;
    }
    exports.mainNgcc = mainNgcc;
    function dumpDecoratedClasses(decoratedClasses) {
        console.log('Decorated classes');
        decoratedClasses.forEach(function (decoratedClass) {
            console.log("- " + decoratedClass.name);
            decoratedClass.decorators.forEach(function (decorator) {
                console.log("  * " + decorator.name + ":");
                if (decorator.args) {
                    decorator.args.forEach(function (arg) { return console.log("    ~ " + arg.getText()); });
                }
            });
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVGLCtCQUErQjtJQUVoQyw2QkFBK0I7SUFDL0IsK0JBQWlDO0lBRWpDLDZHQUF3RTtJQUN4RSw2RkFBNEQ7SUFFNUQsa0JBQXlCLElBQWM7UUFDckMsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLElBQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEQsSUFBTSxjQUFjLEdBQUcsY0FBTyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUV6RCxJQUFNLE9BQU8sR0FBdUIsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQztRQUM1RSxJQUFNLElBQUksR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUMsSUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RSxJQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBRSxDQUFDO1FBQ3JFLElBQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUVwRCxJQUFNLGNBQWMsR0FBRyxJQUFJLG9DQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlELElBQU0sTUFBTSxHQUFHLElBQUksOENBQXdCLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3pFLElBQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXBFLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBakJELDRCQWlCQztJQUVELDhCQUE4QixnQkFBa0M7UUFDOUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFBLGNBQWM7WUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFLLGNBQWMsQ0FBQyxJQUFNLENBQUMsQ0FBQztZQUN4QyxjQUFjLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFNBQVM7Z0JBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBTyxTQUFTLENBQUMsSUFBSSxNQUFHLENBQUMsQ0FBQztnQkFDdEMsSUFBSSxTQUFTLENBQUMsSUFBSSxFQUFFO29CQUNsQixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBUyxHQUFHLENBQUMsT0FBTyxFQUFJLENBQUMsRUFBckMsQ0FBcUMsQ0FBQyxDQUFDO2lCQUN0RTtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4gLyogdHNsaW50OmRpc2FibGU6bm8tY29uc29sZSAqL1xuXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IERlY29yYXRlZENsYXNzIH0gZnJvbSAnLi9wYXJzZXIvcGFyc2VyJztcbmltcG9ydCB7IEZsYXRFc20yMDE1UGFja2FnZVBhcnNlciB9IGZyb20gJy4vcGFyc2VyL2ZsYXRfZXNtMjAxNV9wYXJzZXInO1xuaW1wb3J0IHsgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IH0gZnJvbSAnLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhhcmdzOiBzdHJpbmdbXSk6IG51bWJlciB7XG4gIGNvbnN0IHJvb3RQYXRoID0gYXJnc1swXTtcbiAgY29uc3QgcGFja2FnZVBhdGggPSByZXNvbHZlKHJvb3RQYXRoLCAnZmVzbTIwMTUnKTtcbiAgY29uc3QgZW50cnlQb2ludFBhdGggPSByZXNvbHZlKHBhY2thZ2VQYXRoLCAnY29tbW9uLmpzJyk7XG5cbiAgY29uc3Qgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zID0geyBhbGxvd0pzOiB0cnVlLCByb290RGlyOiBwYWNrYWdlUGF0aCB9O1xuICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KG9wdGlvbnMpO1xuICBjb25zdCBwYWNrYWdlUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oW2VudHJ5UG9pbnRQYXRoXSwgb3B0aW9ucywgaG9zdCk7XG4gIGNvbnN0IGVudHJ5UG9pbnRGaWxlID0gcGFja2FnZVByb2dyYW0uZ2V0U291cmNlRmlsZShlbnRyeVBvaW50UGF0aCkhO1xuICBjb25zdCB0eXBlQ2hlY2tlciA9IHBhY2thZ2VQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgY29uc3QgcmVmbGVjdGlvbkhvc3QgPSBuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KHR5cGVDaGVja2VyKTtcbiAgY29uc3QgcGFyc2VyID0gbmV3IEZsYXRFc20yMDE1UGFja2FnZVBhcnNlcih0eXBlQ2hlY2tlciwgcmVmbGVjdGlvbkhvc3QpO1xuICBjb25zdCBkZWNvcmF0ZWRDbGFzc2VzID0gcGFyc2VyLmdldERlY29yYXRlZENsYXNzZXMoZW50cnlQb2ludEZpbGUpO1xuXG4gIGR1bXBEZWNvcmF0ZWRDbGFzc2VzKGRlY29yYXRlZENsYXNzZXMpO1xuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gZHVtcERlY29yYXRlZENsYXNzZXMoZGVjb3JhdGVkQ2xhc3NlczogRGVjb3JhdGVkQ2xhc3NbXSkge1xuICBjb25zb2xlLmxvZygnRGVjb3JhdGVkIGNsYXNzZXMnKTtcbiAgZGVjb3JhdGVkQ2xhc3Nlcy5mb3JFYWNoKGRlY29yYXRlZENsYXNzID0+IHtcbiAgICBjb25zb2xlLmxvZyhgLSAke2RlY29yYXRlZENsYXNzLm5hbWV9YCk7XG4gICAgZGVjb3JhdGVkQ2xhc3MuZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhgICAqICR7ZGVjb3JhdG9yLm5hbWV9OmApO1xuICAgICAgaWYgKGRlY29yYXRvci5hcmdzKSB7XG4gICAgICAgIGRlY29yYXRvci5hcmdzLmZvckVhY2goYXJnID0+IGNvbnNvbGUubG9nKGAgICAgfiAke2FyZy5nZXRUZXh0KCl9YCkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn0iXX0=