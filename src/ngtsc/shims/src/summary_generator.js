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
        define("@angular/compiler-cli/src/ngtsc/shims/src/summary_generator", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SummaryGenerator = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/util");
    var SummaryGenerator = /** @class */ (function () {
        function SummaryGenerator() {
            this.shouldEmit = true;
            this.extensionPrefix = 'ngsummary';
        }
        SummaryGenerator.prototype.generateShimForFile = function (sf, genFilePath) {
            var e_1, _a, e_2, _b;
            // Collect a list of classes that need to have factory types emitted for them. This list is
            // overly broad as at this point the ts.TypeChecker has not been created and so it can't be used
            // to semantically understand which decorators are Angular decorators. It's okay to output an
            // overly broad set of summary exports as the exports are no-ops anyway, and summaries are a
            // compatibility layer which will be removed after Ivy is enabled.
            var symbolNames = [];
            try {
                for (var _c = tslib_1.__values(sf.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var stmt = _d.value;
                    if (ts.isClassDeclaration(stmt)) {
                        // If the class isn't exported, or if it's not decorated, then skip it.
                        if (!isExported(stmt) || stmt.decorators === undefined || stmt.name === undefined) {
                            continue;
                        }
                        symbolNames.push(stmt.name.text);
                    }
                    else if (ts.isExportDeclaration(stmt)) {
                        // Look for an export statement of the form "export {...};". If it doesn't match that, then
                        // skip it.
                        if (stmt.exportClause === undefined || stmt.moduleSpecifier !== undefined ||
                            !ts.isNamedExports(stmt.exportClause)) {
                            continue;
                        }
                        try {
                            for (var _e = (e_2 = void 0, tslib_1.__values(stmt.exportClause.elements)), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var specifier = _f.value;
                                // At this point, there is no guarantee that specifier here refers to a class declaration,
                                // but that's okay.
                                // Use specifier.name as that's guaranteed to be the exported name, regardless of whether
                                // specifier.propertyName is set.
                                symbolNames.push(specifier.name.text);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var varLines = symbolNames.map(function (name) { return "export const " + name + "NgSummary: any = null;"; });
            if (varLines.length === 0) {
                // In the event there are no other exports, add an empty export to ensure the generated
                // summary file is still an ES module.
                varLines.push("export const \u0275empty = null;");
            }
            var sourceText = varLines.join('\n');
            var genFile = ts.createSourceFile(genFilePath, sourceText, sf.languageVersion, true, ts.ScriptKind.TS);
            if (sf.moduleName !== undefined) {
                genFile.moduleName = util_1.generatedModuleName(sf.moduleName, sf.fileName, '.ngsummary');
            }
            return genFile;
        };
        return SummaryGenerator;
    }());
    exports.SummaryGenerator = SummaryGenerator;
    function isExported(decl) {
        return decl.modifiers !== undefined &&
            decl.modifiers.some(function (mod) { return mod.kind == ts.SyntaxKind.ExportKeyword; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VtbWFyeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9zdW1tYXJ5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBS2pDLHVFQUEyQztJQUUzQztRQUFBO1lBQ1csZUFBVSxHQUFHLElBQUksQ0FBQztZQUNsQixvQkFBZSxHQUFHLFdBQVcsQ0FBQztRQWtEekMsQ0FBQztRQWhEQyw4Q0FBbUIsR0FBbkIsVUFBb0IsRUFBaUIsRUFBRSxXQUEyQjs7WUFDaEUsMkZBQTJGO1lBQzNGLGdHQUFnRztZQUNoRyw2RkFBNkY7WUFDN0YsNEZBQTRGO1lBQzVGLGtFQUFrRTtZQUNsRSxJQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7O2dCQUNqQyxLQUFtQixJQUFBLEtBQUEsaUJBQUEsRUFBRSxDQUFDLFVBQVUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBN0IsSUFBTSxJQUFJLFdBQUE7b0JBQ2IsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQy9CLHVFQUF1RTt3QkFDdkUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTs0QkFDakYsU0FBUzt5QkFDVjt3QkFDRCxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ2xDO3lCQUFNLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN2QywyRkFBMkY7d0JBQzNGLFdBQVc7d0JBQ1gsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLFNBQVM7NEJBQ3JFLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUU7NEJBQ3pDLFNBQVM7eUJBQ1Y7OzRCQUVELEtBQXdCLElBQUEsb0JBQUEsaUJBQUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTtnQ0FBL0MsSUFBTSxTQUFTLFdBQUE7Z0NBQ2xCLDBGQUEwRjtnQ0FDMUYsbUJBQW1CO2dDQUVuQix5RkFBeUY7Z0NBQ3pGLGlDQUFpQztnQ0FDakMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzZCQUN2Qzs7Ozs7Ozs7O3FCQUNGO2lCQUNGOzs7Ozs7Ozs7WUFFRCxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsa0JBQWdCLElBQUksMkJBQXdCLEVBQTVDLENBQTRDLENBQUMsQ0FBQztZQUV2RixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN6Qix1RkFBdUY7Z0JBQ3ZGLHNDQUFzQztnQkFDdEMsUUFBUSxDQUFDLElBQUksQ0FBQyxrQ0FBNkIsQ0FBQyxDQUFDO2FBQzlDO1lBQ0QsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QyxJQUFNLE9BQU8sR0FDVCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdGLElBQUksRUFBRSxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUU7Z0JBQy9CLE9BQU8sQ0FBQyxVQUFVLEdBQUcsMEJBQW1CLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQ3BGO1lBQ0QsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQXBERCxJQW9EQztJQXBEWSw0Q0FBZ0I7SUFzRDdCLFNBQVMsVUFBVSxDQUFDLElBQW9CO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO1lBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBdkMsQ0FBdUMsQ0FBQyxDQUFDO0lBQzFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1BlckZpbGVTaGltR2VuZXJhdG9yfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2dlbmVyYXRlZE1vZHVsZU5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBjbGFzcyBTdW1tYXJ5R2VuZXJhdG9yIGltcGxlbWVudHMgUGVyRmlsZVNoaW1HZW5lcmF0b3Ige1xuICByZWFkb25seSBzaG91bGRFbWl0ID0gdHJ1ZTtcbiAgcmVhZG9ubHkgZXh0ZW5zaW9uUHJlZml4ID0gJ25nc3VtbWFyeSc7XG5cbiAgZ2VuZXJhdGVTaGltRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSwgZ2VuRmlsZVBhdGg6IEFic29sdXRlRnNQYXRoKTogdHMuU291cmNlRmlsZSB7XG4gICAgLy8gQ29sbGVjdCBhIGxpc3Qgb2YgY2xhc3NlcyB0aGF0IG5lZWQgdG8gaGF2ZSBmYWN0b3J5IHR5cGVzIGVtaXR0ZWQgZm9yIHRoZW0uIFRoaXMgbGlzdCBpc1xuICAgIC8vIG92ZXJseSBicm9hZCBhcyBhdCB0aGlzIHBvaW50IHRoZSB0cy5UeXBlQ2hlY2tlciBoYXMgbm90IGJlZW4gY3JlYXRlZCBhbmQgc28gaXQgY2FuJ3QgYmUgdXNlZFxuICAgIC8vIHRvIHNlbWFudGljYWxseSB1bmRlcnN0YW5kIHdoaWNoIGRlY29yYXRvcnMgYXJlIEFuZ3VsYXIgZGVjb3JhdG9ycy4gSXQncyBva2F5IHRvIG91dHB1dCBhblxuICAgIC8vIG92ZXJseSBicm9hZCBzZXQgb2Ygc3VtbWFyeSBleHBvcnRzIGFzIHRoZSBleHBvcnRzIGFyZSBuby1vcHMgYW55d2F5LCBhbmQgc3VtbWFyaWVzIGFyZSBhXG4gICAgLy8gY29tcGF0aWJpbGl0eSBsYXllciB3aGljaCB3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgSXZ5IGlzIGVuYWJsZWQuXG4gICAgY29uc3Qgc3ltYm9sTmFtZXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBzdG10IG9mIHNmLnN0YXRlbWVudHMpIHtcbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24oc3RtdCkpIHtcbiAgICAgICAgLy8gSWYgdGhlIGNsYXNzIGlzbid0IGV4cG9ydGVkLCBvciBpZiBpdCdzIG5vdCBkZWNvcmF0ZWQsIHRoZW4gc2tpcCBpdC5cbiAgICAgICAgaWYgKCFpc0V4cG9ydGVkKHN0bXQpIHx8IHN0bXQuZGVjb3JhdG9ycyA9PT0gdW5kZWZpbmVkIHx8IHN0bXQubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgc3ltYm9sTmFtZXMucHVzaChzdG10Lm5hbWUudGV4dCk7XG4gICAgICB9IGVsc2UgaWYgKHRzLmlzRXhwb3J0RGVjbGFyYXRpb24oc3RtdCkpIHtcbiAgICAgICAgLy8gTG9vayBmb3IgYW4gZXhwb3J0IHN0YXRlbWVudCBvZiB0aGUgZm9ybSBcImV4cG9ydCB7Li4ufTtcIi4gSWYgaXQgZG9lc24ndCBtYXRjaCB0aGF0LCB0aGVuXG4gICAgICAgIC8vIHNraXAgaXQuXG4gICAgICAgIGlmIChzdG10LmV4cG9ydENsYXVzZSA9PT0gdW5kZWZpbmVkIHx8IHN0bXQubW9kdWxlU3BlY2lmaWVyICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAgICF0cy5pc05hbWVkRXhwb3J0cyhzdG10LmV4cG9ydENsYXVzZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3Qgc3BlY2lmaWVyIG9mIHN0bXQuZXhwb3J0Q2xhdXNlLmVsZW1lbnRzKSB7XG4gICAgICAgICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlcmUgaXMgbm8gZ3VhcmFudGVlIHRoYXQgc3BlY2lmaWVyIGhlcmUgcmVmZXJzIHRvIGEgY2xhc3MgZGVjbGFyYXRpb24sXG4gICAgICAgICAgLy8gYnV0IHRoYXQncyBva2F5LlxuXG4gICAgICAgICAgLy8gVXNlIHNwZWNpZmllci5uYW1lIGFzIHRoYXQncyBndWFyYW50ZWVkIHRvIGJlIHRoZSBleHBvcnRlZCBuYW1lLCByZWdhcmRsZXNzIG9mIHdoZXRoZXJcbiAgICAgICAgICAvLyBzcGVjaWZpZXIucHJvcGVydHlOYW1lIGlzIHNldC5cbiAgICAgICAgICBzeW1ib2xOYW1lcy5wdXNoKHNwZWNpZmllci5uYW1lLnRleHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFyTGluZXMgPSBzeW1ib2xOYW1lcy5tYXAobmFtZSA9PiBgZXhwb3J0IGNvbnN0ICR7bmFtZX1OZ1N1bW1hcnk6IGFueSA9IG51bGw7YCk7XG5cbiAgICBpZiAodmFyTGluZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBJbiB0aGUgZXZlbnQgdGhlcmUgYXJlIG5vIG90aGVyIGV4cG9ydHMsIGFkZCBhbiBlbXB0eSBleHBvcnQgdG8gZW5zdXJlIHRoZSBnZW5lcmF0ZWRcbiAgICAgIC8vIHN1bW1hcnkgZmlsZSBpcyBzdGlsbCBhbiBFUyBtb2R1bGUuXG4gICAgICB2YXJMaW5lcy5wdXNoKGBleHBvcnQgY29uc3QgybVlbXB0eSA9IG51bGw7YCk7XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZVRleHQgPSB2YXJMaW5lcy5qb2luKCdcXG4nKTtcbiAgICBjb25zdCBnZW5GaWxlID1cbiAgICAgICAgdHMuY3JlYXRlU291cmNlRmlsZShnZW5GaWxlUGF0aCwgc291cmNlVGV4dCwgc2YubGFuZ3VhZ2VWZXJzaW9uLCB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTKTtcbiAgICBpZiAoc2YubW9kdWxlTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBnZW5GaWxlLm1vZHVsZU5hbWUgPSBnZW5lcmF0ZWRNb2R1bGVOYW1lKHNmLm1vZHVsZU5hbWUsIHNmLmZpbGVOYW1lLCAnLm5nc3VtbWFyeScpO1xuICAgIH1cbiAgICByZXR1cm4gZ2VuRmlsZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0V4cG9ydGVkKGRlY2w6IHRzLkRlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gIHJldHVybiBkZWNsLm1vZGlmaWVycyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBkZWNsLm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpO1xufVxuIl19