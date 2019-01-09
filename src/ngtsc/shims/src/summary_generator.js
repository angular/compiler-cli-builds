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
        define("@angular/compiler-cli/src/ngtsc/shims/src/summary_generator", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/util");
    var SummaryGenerator = /** @class */ (function () {
        function SummaryGenerator(map) {
            this.map = map;
        }
        SummaryGenerator.prototype.getSummaryFileNames = function () { return Array.from(this.map.keys()); };
        SummaryGenerator.prototype.recognize = function (fileName) { return this.map.has(fileName); };
        SummaryGenerator.prototype.generate = function (genFilePath, readFile) {
            var originalPath = this.map.get(genFilePath);
            var original = readFile(originalPath);
            if (original === null) {
                return null;
            }
            // Collect a list of classes that need to have factory types emitted for them. This list is
            // overly broad as at this point the ts.TypeChecker has not been created and so it can't be used
            // to semantically understand which decorators are Angular decorators. It's okay to output an
            // overly broad set of summary exports as the exports are no-ops anyway, and summaries are a
            // compatibility layer which will be removed after Ivy is enabled.
            var symbolNames = original
                .statements
                // Pick out top level class declarations...
                .filter(ts.isClassDeclaration)
                // which are named, exported, and have decorators.
                .filter(function (decl) { return isExported(decl) && decl.decorators !== undefined &&
                decl.name !== undefined; })
                // Grab the symbol name.
                .map(function (decl) { return decl.name.text; });
            var varLines = symbolNames.map(function (name) { return "export const " + name + "NgSummary: any = null;"; });
            if (varLines.length === 0) {
                // In the event there are no other exports, add an empty export to ensure the generated
                // summary file is still an ES module.
                varLines.push("export const \u0275empty = null;");
            }
            var sourceText = varLines.join('\n');
            var genFile = ts.createSourceFile(genFilePath, sourceText, original.languageVersion, true, ts.ScriptKind.TS);
            if (original.moduleName !== undefined) {
                genFile.moduleName =
                    util_1.generatedModuleName(original.moduleName, original.fileName, '.ngsummary');
            }
            return genFile;
        };
        SummaryGenerator.forRootFiles = function (files) {
            var map = new Map();
            files.filter(function (sourceFile) { return typescript_1.isNonDeclarationTsPath(sourceFile); })
                .forEach(function (sourceFile) { return map.set(sourceFile.replace(/\.ts$/, '.ngsummary.ts'), sourceFile); });
            return new SummaryGenerator(map);
        };
        return SummaryGenerator;
    }());
    exports.SummaryGenerator = SummaryGenerator;
    function isExported(decl) {
        return decl.modifiers !== undefined &&
            decl.modifiers.some(function (mod) { return mod.kind == ts.SyntaxKind.ExportKeyword; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VtbWFyeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4vLi4vLi4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9zdW1tYXJ5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxrRkFBaUU7SUFHakUsdUVBQTJDO0lBRTNDO1FBQ0UsMEJBQTRCLEdBQXdCO1lBQXhCLFFBQUcsR0FBSCxHQUFHLENBQXFCO1FBQUcsQ0FBQztRQUV4RCw4Q0FBbUIsR0FBbkIsY0FBa0MsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkUsb0NBQVMsR0FBVCxVQUFVLFFBQWdCLElBQWEsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkUsbUNBQVEsR0FBUixVQUFTLFdBQW1CLEVBQUUsUUFBb0Q7WUFFaEYsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFHLENBQUM7WUFDakQsSUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hDLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDckIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELDJGQUEyRjtZQUMzRixnR0FBZ0c7WUFDaEcsNkZBQTZGO1lBQzdGLDRGQUE0RjtZQUM1RixrRUFBa0U7WUFDbEUsSUFBTSxXQUFXLEdBQUcsUUFBUTtpQkFDSCxVQUFVO2dCQUNYLDJDQUEyQztpQkFDMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztnQkFDOUIsa0RBQWtEO2lCQUNqRCxNQUFNLENBQ0gsVUFBQSxJQUFJLElBQUksT0FBQSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxTQUFTO2dCQUNyRCxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFEbkIsQ0FDbUIsQ0FBQztnQkFDaEMsd0JBQXdCO2lCQUN2QixHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsSUFBTSxDQUFDLElBQUksRUFBaEIsQ0FBZ0IsQ0FBQyxDQUFDO1lBRXZELElBQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxrQkFBZ0IsSUFBSSwyQkFBd0IsRUFBNUMsQ0FBNEMsQ0FBQyxDQUFDO1lBRXZGLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3pCLHVGQUF1RjtnQkFDdkYsc0NBQXNDO2dCQUN0QyxRQUFRLENBQUMsSUFBSSxDQUFDLGtDQUE2QixDQUFDLENBQUM7YUFDOUM7WUFDRCxJQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FDL0IsV0FBVyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQy9FLElBQUksUUFBUSxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUU7Z0JBQ3JDLE9BQU8sQ0FBQyxVQUFVO29CQUNkLDBCQUFtQixDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQzthQUMvRTtZQUNELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFFTSw2QkFBWSxHQUFuQixVQUFvQixLQUE0QjtZQUM5QyxJQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUN0QyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQUEsVUFBVSxJQUFJLE9BQUEsbUNBQXNCLENBQUMsVUFBVSxDQUFDLEVBQWxDLENBQWtDLENBQUM7aUJBQ3pELE9BQU8sQ0FBQyxVQUFBLFVBQVUsSUFBSSxPQUFBLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLEVBQUUsVUFBVSxDQUFDLEVBQWpFLENBQWlFLENBQUMsQ0FBQztZQUM5RixPQUFPLElBQUksZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQXRERCxJQXNEQztJQXREWSw0Q0FBZ0I7SUF3RDdCLFNBQVMsVUFBVSxDQUFDLElBQW9CO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBdkMsQ0FBdUMsQ0FBQyxDQUFDO0lBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lzTm9uRGVjbGFyYXRpb25Uc1BhdGh9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1NoaW1HZW5lcmF0b3J9IGZyb20gJy4vaG9zdCc7XG5pbXBvcnQge2dlbmVyYXRlZE1vZHVsZU5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBjbGFzcyBTdW1tYXJ5R2VuZXJhdG9yIGltcGxlbWVudHMgU2hpbUdlbmVyYXRvciB7XG4gIHByaXZhdGUgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4pIHt9XG5cbiAgZ2V0U3VtbWFyeUZpbGVOYW1lcygpOiBzdHJpbmdbXSB7IHJldHVybiBBcnJheS5mcm9tKHRoaXMubWFwLmtleXMoKSk7IH1cblxuICByZWNvZ25pemUoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5tYXAuaGFzKGZpbGVOYW1lKTsgfVxuXG4gIGdlbmVyYXRlKGdlbkZpbGVQYXRoOiBzdHJpbmcsIHJlYWRGaWxlOiAoZmlsZU5hbWU6IHN0cmluZykgPT4gdHMuU291cmNlRmlsZSB8IG51bGwpOiB0cy5Tb3VyY2VGaWxlXG4gICAgICB8bnVsbCB7XG4gICAgY29uc3Qgb3JpZ2luYWxQYXRoID0gdGhpcy5tYXAuZ2V0KGdlbkZpbGVQYXRoKSAhO1xuICAgIGNvbnN0IG9yaWdpbmFsID0gcmVhZEZpbGUob3JpZ2luYWxQYXRoKTtcbiAgICBpZiAob3JpZ2luYWwgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIENvbGxlY3QgYSBsaXN0IG9mIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGhhdmUgZmFjdG9yeSB0eXBlcyBlbWl0dGVkIGZvciB0aGVtLiBUaGlzIGxpc3QgaXNcbiAgICAvLyBvdmVybHkgYnJvYWQgYXMgYXQgdGhpcyBwb2ludCB0aGUgdHMuVHlwZUNoZWNrZXIgaGFzIG5vdCBiZWVuIGNyZWF0ZWQgYW5kIHNvIGl0IGNhbid0IGJlIHVzZWRcbiAgICAvLyB0byBzZW1hbnRpY2FsbHkgdW5kZXJzdGFuZCB3aGljaCBkZWNvcmF0b3JzIGFyZSBBbmd1bGFyIGRlY29yYXRvcnMuIEl0J3Mgb2theSB0byBvdXRwdXQgYW5cbiAgICAvLyBvdmVybHkgYnJvYWQgc2V0IG9mIHN1bW1hcnkgZXhwb3J0cyBhcyB0aGUgZXhwb3J0cyBhcmUgbm8tb3BzIGFueXdheSwgYW5kIHN1bW1hcmllcyBhcmUgYVxuICAgIC8vIGNvbXBhdGliaWxpdHkgbGF5ZXIgd2hpY2ggd2lsbCBiZSByZW1vdmVkIGFmdGVyIEl2eSBpcyBlbmFibGVkLlxuICAgIGNvbnN0IHN5bWJvbE5hbWVzID0gb3JpZ2luYWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGVtZW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFBpY2sgb3V0IHRvcCBsZXZlbCBjbGFzcyBkZWNsYXJhdGlvbnMuLi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aGljaCBhcmUgbmFtZWQsIGV4cG9ydGVkLCBhbmQgaGF2ZSBkZWNvcmF0b3JzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlY2wgPT4gaXNFeHBvcnRlZChkZWNsKSAmJiBkZWNsLmRlY29yYXRvcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVjbC5uYW1lICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR3JhYiB0aGUgc3ltYm9sIG5hbWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChkZWNsID0+IGRlY2wubmFtZSAhLnRleHQpO1xuXG4gICAgY29uc3QgdmFyTGluZXMgPSBzeW1ib2xOYW1lcy5tYXAobmFtZSA9PiBgZXhwb3J0IGNvbnN0ICR7bmFtZX1OZ1N1bW1hcnk6IGFueSA9IG51bGw7YCk7XG5cbiAgICBpZiAodmFyTGluZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBJbiB0aGUgZXZlbnQgdGhlcmUgYXJlIG5vIG90aGVyIGV4cG9ydHMsIGFkZCBhbiBlbXB0eSBleHBvcnQgdG8gZW5zdXJlIHRoZSBnZW5lcmF0ZWRcbiAgICAgIC8vIHN1bW1hcnkgZmlsZSBpcyBzdGlsbCBhbiBFUyBtb2R1bGUuXG4gICAgICB2YXJMaW5lcy5wdXNoKGBleHBvcnQgY29uc3QgybVlbXB0eSA9IG51bGw7YCk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZVRleHQgPSB2YXJMaW5lcy5qb2luKCdcXG4nKTtcbiAgICBjb25zdCBnZW5GaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZShcbiAgICAgICAgZ2VuRmlsZVBhdGgsIHNvdXJjZVRleHQsIG9yaWdpbmFsLmxhbmd1YWdlVmVyc2lvbiwgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UUyk7XG4gICAgaWYgKG9yaWdpbmFsLm1vZHVsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZ2VuRmlsZS5tb2R1bGVOYW1lID1cbiAgICAgICAgICBnZW5lcmF0ZWRNb2R1bGVOYW1lKG9yaWdpbmFsLm1vZHVsZU5hbWUsIG9yaWdpbmFsLmZpbGVOYW1lLCAnLm5nc3VtbWFyeScpO1xuICAgIH1cbiAgICByZXR1cm4gZ2VuRmlsZTtcbiAgfVxuXG4gIHN0YXRpYyBmb3JSb290RmlsZXMoZmlsZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPik6IFN1bW1hcnlHZW5lcmF0b3Ige1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgZmlsZXMuZmlsdGVyKHNvdXJjZUZpbGUgPT4gaXNOb25EZWNsYXJhdGlvblRzUGF0aChzb3VyY2VGaWxlKSlcbiAgICAgICAgLmZvckVhY2goc291cmNlRmlsZSA9PiBtYXAuc2V0KHNvdXJjZUZpbGUucmVwbGFjZSgvXFwudHMkLywgJy5uZ3N1bW1hcnkudHMnKSwgc291cmNlRmlsZSkpO1xuICAgIHJldHVybiBuZXcgU3VtbWFyeUdlbmVyYXRvcihtYXApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRXhwb3J0ZWQoZGVjbDogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY2wubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIGRlY2wubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG59XG4iXX0=