/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
                for (var _c = (0, tslib_1.__values)(sf.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
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
                            for (var _e = (e_2 = void 0, (0, tslib_1.__values)(stmt.exportClause.elements)), _f = _e.next(); !_f.done; _f = _e.next()) {
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
                genFile.moduleName = (0, util_1.generatedModuleName)(sf.moduleName, sf.fileName, '.ngsummary');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VtbWFyeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9zdW1tYXJ5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBS2pDLHVFQUEyQztJQUUzQztRQUFBO1lBQ1csZUFBVSxHQUFHLElBQUksQ0FBQztZQUNsQixvQkFBZSxHQUFHLFdBQVcsQ0FBQztRQWtEekMsQ0FBQztRQWhEQyw4Q0FBbUIsR0FBbkIsVUFBb0IsRUFBaUIsRUFBRSxXQUEyQjs7WUFDaEUsMkZBQTJGO1lBQzNGLGdHQUFnRztZQUNoRyw2RkFBNkY7WUFDN0YsNEZBQTRGO1lBQzVGLGtFQUFrRTtZQUNsRSxJQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7O2dCQUNqQyxLQUFtQixJQUFBLEtBQUEsc0JBQUEsRUFBRSxDQUFDLFVBQVUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBN0IsSUFBTSxJQUFJLFdBQUE7b0JBQ2IsSUFBSSxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQy9CLHVFQUF1RTt3QkFDdkUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTs0QkFDakYsU0FBUzt5QkFDVjt3QkFDRCxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ2xDO3lCQUFNLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN2QywyRkFBMkY7d0JBQzNGLFdBQVc7d0JBQ1gsSUFBSSxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLFNBQVM7NEJBQ3JFLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUU7NEJBQ3pDLFNBQVM7eUJBQ1Y7OzRCQUVELEtBQXdCLElBQUEsb0JBQUEsc0JBQUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTtnQ0FBL0MsSUFBTSxTQUFTLFdBQUE7Z0NBQ2xCLDBGQUEwRjtnQ0FDMUYsbUJBQW1CO2dDQUVuQix5RkFBeUY7Z0NBQ3pGLGlDQUFpQztnQ0FDakMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzZCQUN2Qzs7Ozs7Ozs7O3FCQUNGO2lCQUNGOzs7Ozs7Ozs7WUFFRCxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsa0JBQWdCLElBQUksMkJBQXdCLEVBQTVDLENBQTRDLENBQUMsQ0FBQztZQUV2RixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN6Qix1RkFBdUY7Z0JBQ3ZGLHNDQUFzQztnQkFDdEMsUUFBUSxDQUFDLElBQUksQ0FBQyxrQ0FBNkIsQ0FBQyxDQUFDO2FBQzlDO1lBQ0QsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QyxJQUFNLE9BQU8sR0FDVCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdGLElBQUksRUFBRSxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUU7Z0JBQy9CLE9BQU8sQ0FBQyxVQUFVLEdBQUcsSUFBQSwwQkFBbUIsRUFBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7YUFDcEY7WUFDRCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBcERELElBb0RDO0lBcERZLDRDQUFnQjtJQXNEN0IsU0FBUyxVQUFVLENBQUMsSUFBb0I7UUFDdEMsT0FBTyxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUF2QyxDQUF1QyxDQUFDLENBQUM7SUFDMUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQZXJGaWxlU2hpbUdlbmVyYXRvcn0gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtnZW5lcmF0ZWRNb2R1bGVOYW1lfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgY2xhc3MgU3VtbWFyeUdlbmVyYXRvciBpbXBsZW1lbnRzIFBlckZpbGVTaGltR2VuZXJhdG9yIHtcbiAgcmVhZG9ubHkgc2hvdWxkRW1pdCA9IHRydWU7XG4gIHJlYWRvbmx5IGV4dGVuc2lvblByZWZpeCA9ICduZ3N1bW1hcnknO1xuXG4gIGdlbmVyYXRlU2hpbUZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUsIGdlbkZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHRzLlNvdXJjZUZpbGUge1xuICAgIC8vIENvbGxlY3QgYSBsaXN0IG9mIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGhhdmUgZmFjdG9yeSB0eXBlcyBlbWl0dGVkIGZvciB0aGVtLiBUaGlzIGxpc3QgaXNcbiAgICAvLyBvdmVybHkgYnJvYWQgYXMgYXQgdGhpcyBwb2ludCB0aGUgdHMuVHlwZUNoZWNrZXIgaGFzIG5vdCBiZWVuIGNyZWF0ZWQgYW5kIHNvIGl0IGNhbid0IGJlIHVzZWRcbiAgICAvLyB0byBzZW1hbnRpY2FsbHkgdW5kZXJzdGFuZCB3aGljaCBkZWNvcmF0b3JzIGFyZSBBbmd1bGFyIGRlY29yYXRvcnMuIEl0J3Mgb2theSB0byBvdXRwdXQgYW5cbiAgICAvLyBvdmVybHkgYnJvYWQgc2V0IG9mIHN1bW1hcnkgZXhwb3J0cyBhcyB0aGUgZXhwb3J0cyBhcmUgbm8tb3BzIGFueXdheSwgYW5kIHN1bW1hcmllcyBhcmUgYVxuICAgIC8vIGNvbXBhdGliaWxpdHkgbGF5ZXIgd2hpY2ggd2lsbCBiZSByZW1vdmVkIGFmdGVyIEl2eSBpcyBlbmFibGVkLlxuICAgIGNvbnN0IHN5bWJvbE5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3RtdCBvZiBzZi5zdGF0ZW1lbnRzKSB7XG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0bXQpKSB7XG4gICAgICAgIC8vIElmIHRoZSBjbGFzcyBpc24ndCBleHBvcnRlZCwgb3IgaWYgaXQncyBub3QgZGVjb3JhdGVkLCB0aGVuIHNraXAgaXQuXG4gICAgICAgIGlmICghaXNFeHBvcnRlZChzdG10KSB8fCBzdG10LmRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCB8fCBzdG10Lm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHN5bWJvbE5hbWVzLnB1c2goc3RtdC5uYW1lLnRleHQpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc0V4cG9ydERlY2xhcmF0aW9uKHN0bXQpKSB7XG4gICAgICAgIC8vIExvb2sgZm9yIGFuIGV4cG9ydCBzdGF0ZW1lbnQgb2YgdGhlIGZvcm0gXCJleHBvcnQgey4uLn07XCIuIElmIGl0IGRvZXNuJ3QgbWF0Y2ggdGhhdCwgdGhlblxuICAgICAgICAvLyBza2lwIGl0LlxuICAgICAgICBpZiAoc3RtdC5leHBvcnRDbGF1c2UgPT09IHVuZGVmaW5lZCB8fCBzdG10Lm1vZHVsZVNwZWNpZmllciAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgICAhdHMuaXNOYW1lZEV4cG9ydHMoc3RtdC5leHBvcnRDbGF1c2UpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IHNwZWNpZmllciBvZiBzdG10LmV4cG9ydENsYXVzZS5lbGVtZW50cykge1xuICAgICAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZXJlIGlzIG5vIGd1YXJhbnRlZSB0aGF0IHNwZWNpZmllciBoZXJlIHJlZmVycyB0byBhIGNsYXNzIGRlY2xhcmF0aW9uLFxuICAgICAgICAgIC8vIGJ1dCB0aGF0J3Mgb2theS5cblxuICAgICAgICAgIC8vIFVzZSBzcGVjaWZpZXIubmFtZSBhcyB0aGF0J3MgZ3VhcmFudGVlZCB0byBiZSB0aGUgZXhwb3J0ZWQgbmFtZSwgcmVnYXJkbGVzcyBvZiB3aGV0aGVyXG4gICAgICAgICAgLy8gc3BlY2lmaWVyLnByb3BlcnR5TmFtZSBpcyBzZXQuXG4gICAgICAgICAgc3ltYm9sTmFtZXMucHVzaChzcGVjaWZpZXIubmFtZS50ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZhckxpbmVzID0gc3ltYm9sTmFtZXMubWFwKG5hbWUgPT4gYGV4cG9ydCBjb25zdCAke25hbWV9TmdTdW1tYXJ5OiBhbnkgPSBudWxsO2ApO1xuXG4gICAgaWYgKHZhckxpbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSW4gdGhlIGV2ZW50IHRoZXJlIGFyZSBubyBvdGhlciBleHBvcnRzLCBhZGQgYW4gZW1wdHkgZXhwb3J0IHRvIGVuc3VyZSB0aGUgZ2VuZXJhdGVkXG4gICAgICAvLyBzdW1tYXJ5IGZpbGUgaXMgc3RpbGwgYW4gRVMgbW9kdWxlLlxuICAgICAgdmFyTGluZXMucHVzaChgZXhwb3J0IGNvbnN0IMm1ZW1wdHkgPSBudWxsO2ApO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gdmFyTGluZXMuam9pbignXFxuJyk7XG4gICAgY29uc3QgZ2VuRmlsZSA9XG4gICAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoZ2VuRmlsZVBhdGgsIHNvdXJjZVRleHQsIHNmLmxhbmd1YWdlVmVyc2lvbiwgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UUyk7XG4gICAgaWYgKHNmLm1vZHVsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZ2VuRmlsZS5tb2R1bGVOYW1lID0gZ2VuZXJhdGVkTW9kdWxlTmFtZShzZi5tb2R1bGVOYW1lLCBzZi5maWxlTmFtZSwgJy5uZ3N1bW1hcnknKTtcbiAgICB9XG4gICAgcmV0dXJuIGdlbkZpbGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNFeHBvcnRlZChkZWNsOiB0cy5EZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICByZXR1cm4gZGVjbC5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgZGVjbC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbn1cbiJdfQ==