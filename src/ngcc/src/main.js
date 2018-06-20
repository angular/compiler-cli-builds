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
        define("angular/packages/compiler-cli/src/ngcc/src/main", ["require", "exports", "path", "typescript", "angular/packages/compiler-cli/src/ngcc/src/parser", "angular/packages/compiler-cli/src/ngcc/src/host/esm2015_host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path_1 = require("path");
    var ts = require("typescript");
    var parser_1 = require("angular/packages/compiler-cli/src/ngcc/src/parser");
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
        var packageParser = new parser_1.PackageParser(new esm2015_host_1.Esm2015ReflectionHost(typeChecker));
        var decoratedClasses = packageParser.getDecoratedClasses(entryPointFile);
        console.error('Decorated Classes', decoratedClasses.map(function (m) { return m.decorators; }));
        return 0;
    }
    exports.mainNgcc = mainNgcc;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDZCQUErQjtJQUMvQiwrQkFBaUM7SUFDakMsNEVBQXlDO0lBQ3pDLDZGQUE0RDtJQUU1RCxrQkFBeUIsSUFBYztRQUNyQyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekIsSUFBTSxXQUFXLEdBQUcsY0FBTyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsRCxJQUFNLGNBQWMsR0FBRyxjQUFPLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELElBQU0sT0FBTyxHQUF1QixFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDO1FBQzVFLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxJQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pFLElBQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFFLENBQUM7UUFDckUsSUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRXBELElBQU0sYUFBYSxHQUFHLElBQUksc0JBQWEsQ0FBQyxJQUFJLG9DQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsSUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsbUJBQW1CLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFM0UsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsVUFBVSxFQUFaLENBQVksQ0FBQyxDQUFDLENBQUM7UUFFNUUsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBaEJELDRCQWdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBQYWNrYWdlUGFyc2VyIH0gZnJvbSAnLi9wYXJzZXInO1xuaW1wb3J0IHsgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0IH0gZnJvbSAnLi9ob3N0L2VzbTIwMTVfaG9zdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhhcmdzOiBzdHJpbmdbXSk6IG51bWJlciB7XG4gIGNvbnN0IHJvb3RQYXRoID0gYXJnc1swXTtcbiAgY29uc3QgcGFja2FnZVBhdGggPSByZXNvbHZlKHJvb3RQYXRoLCAnZmVzbTIwMTUnKTtcbiAgY29uc3QgZW50cnlQb2ludFBhdGggPSByZXNvbHZlKHBhY2thZ2VQYXRoLCAnY29tbW9uLmpzJyk7XG4gIGNvbnN0IG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyA9IHsgYWxsb3dKczogdHJ1ZSwgcm9vdERpcjogcGFja2FnZVBhdGggfTtcbiAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUNvbXBpbGVySG9zdChvcHRpb25zKTtcbiAgY29uc3QgcGFja2FnZVByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKFtlbnRyeVBvaW50UGF0aF0sIG9wdGlvbnMsIGhvc3QpO1xuICBjb25zdCBlbnRyeVBvaW50RmlsZSA9IHBhY2thZ2VQcm9ncmFtLmdldFNvdXJjZUZpbGUoZW50cnlQb2ludFBhdGgpITtcbiAgY29uc3QgdHlwZUNoZWNrZXIgPSBwYWNrYWdlUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gIGNvbnN0IHBhY2thZ2VQYXJzZXIgPSBuZXcgUGFja2FnZVBhcnNlcihuZXcgRXNtMjAxNVJlZmxlY3Rpb25Ib3N0KHR5cGVDaGVja2VyKSk7XG4gIGNvbnN0IGRlY29yYXRlZENsYXNzZXMgPSBwYWNrYWdlUGFyc2VyLmdldERlY29yYXRlZENsYXNzZXMoZW50cnlQb2ludEZpbGUpO1xuXG4gIGNvbnNvbGUuZXJyb3IoJ0RlY29yYXRlZCBDbGFzc2VzJywgZGVjb3JhdGVkQ2xhc3Nlcy5tYXAobSA9PiBtLmRlY29yYXRvcnMpKTtcblxuICByZXR1cm4gMDtcbn1cblxuXG4iXX0=