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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VtbWFyeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9zdW1tYXJ5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFLakMsdUVBQTJDO0lBRTNDO1FBQUE7WUFDVyxlQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ2xCLG9CQUFlLEdBQUcsV0FBVyxDQUFDO1FBa0R6QyxDQUFDO1FBaERDLDhDQUFtQixHQUFuQixVQUFvQixFQUFpQixFQUFFLFdBQTJCOztZQUNoRSwyRkFBMkY7WUFDM0YsZ0dBQWdHO1lBQ2hHLDZGQUE2RjtZQUM3Riw0RkFBNEY7WUFDNUYsa0VBQWtFO1lBQ2xFLElBQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQzs7Z0JBQ2pDLEtBQW1CLElBQUEsS0FBQSxpQkFBQSxFQUFFLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUE3QixJQUFNLElBQUksV0FBQTtvQkFDYixJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDL0IsdUVBQXVFO3dCQUN2RSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFOzRCQUNqRixTQUFTO3lCQUNWO3dCQUNELFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDbEM7eUJBQU0sSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQ3ZDLDJGQUEyRjt3QkFDM0YsV0FBVzt3QkFDWCxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUssU0FBUzs0QkFDckUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRTs0QkFDekMsU0FBUzt5QkFDVjs7NEJBRUQsS0FBd0IsSUFBQSxvQkFBQSxpQkFBQSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQSxDQUFBLGdCQUFBLDRCQUFFO2dDQUEvQyxJQUFNLFNBQVMsV0FBQTtnQ0FDbEIsMEZBQTBGO2dDQUMxRixtQkFBbUI7Z0NBRW5CLHlGQUF5RjtnQ0FDekYsaUNBQWlDO2dDQUNqQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7NkJBQ3ZDOzs7Ozs7Ozs7cUJBQ0Y7aUJBQ0Y7Ozs7Ozs7OztZQUVELElBQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxrQkFBZ0IsSUFBSSwyQkFBd0IsRUFBNUMsQ0FBNEMsQ0FBQyxDQUFDO1lBRXZGLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3pCLHVGQUF1RjtnQkFDdkYsc0NBQXNDO2dCQUN0QyxRQUFRLENBQUMsSUFBSSxDQUFDLGtDQUE2QixDQUFDLENBQUM7YUFDOUM7WUFDRCxJQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLElBQU0sT0FBTyxHQUNULEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0YsSUFBSSxFQUFFLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRTtnQkFDL0IsT0FBTyxDQUFDLFVBQVUsR0FBRywwQkFBbUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7YUFDcEY7WUFDRCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBcERELElBb0RDO0lBcERZLDRDQUFnQjtJQXNEN0IsU0FBUyxVQUFVLENBQUMsSUFBb0I7UUFDdEMsT0FBTyxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFDL0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUF2QyxDQUF1QyxDQUFDLENBQUM7SUFDMUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UGVyRmlsZVNoaW1HZW5lcmF0b3J9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7Z2VuZXJhdGVkTW9kdWxlTmFtZX0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGNsYXNzIFN1bW1hcnlHZW5lcmF0b3IgaW1wbGVtZW50cyBQZXJGaWxlU2hpbUdlbmVyYXRvciB7XG4gIHJlYWRvbmx5IHNob3VsZEVtaXQgPSB0cnVlO1xuICByZWFkb25seSBleHRlbnNpb25QcmVmaXggPSAnbmdzdW1tYXJ5JztcblxuICBnZW5lcmF0ZVNoaW1Gb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBnZW5GaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICAvLyBDb2xsZWN0IGEgbGlzdCBvZiBjbGFzc2VzIHRoYXQgbmVlZCB0byBoYXZlIGZhY3RvcnkgdHlwZXMgZW1pdHRlZCBmb3IgdGhlbS4gVGhpcyBsaXN0IGlzXG4gICAgLy8gb3Zlcmx5IGJyb2FkIGFzIGF0IHRoaXMgcG9pbnQgdGhlIHRzLlR5cGVDaGVja2VyIGhhcyBub3QgYmVlbiBjcmVhdGVkIGFuZCBzbyBpdCBjYW4ndCBiZSB1c2VkXG4gICAgLy8gdG8gc2VtYW50aWNhbGx5IHVuZGVyc3RhbmQgd2hpY2ggZGVjb3JhdG9ycyBhcmUgQW5ndWxhciBkZWNvcmF0b3JzLiBJdCdzIG9rYXkgdG8gb3V0cHV0IGFuXG4gICAgLy8gb3Zlcmx5IGJyb2FkIHNldCBvZiBzdW1tYXJ5IGV4cG9ydHMgYXMgdGhlIGV4cG9ydHMgYXJlIG5vLW9wcyBhbnl3YXksIGFuZCBzdW1tYXJpZXMgYXJlIGFcbiAgICAvLyBjb21wYXRpYmlsaXR5IGxheWVyIHdoaWNoIHdpbGwgYmUgcmVtb3ZlZCBhZnRlciBJdnkgaXMgZW5hYmxlZC5cbiAgICBjb25zdCBzeW1ib2xOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHN0bXQgb2Ygc2Yuc3RhdGVtZW50cykge1xuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihzdG10KSkge1xuICAgICAgICAvLyBJZiB0aGUgY2xhc3MgaXNuJ3QgZXhwb3J0ZWQsIG9yIGlmIGl0J3Mgbm90IGRlY29yYXRlZCwgdGhlbiBza2lwIGl0LlxuICAgICAgICBpZiAoIWlzRXhwb3J0ZWQoc3RtdCkgfHwgc3RtdC5kZWNvcmF0b3JzID09PSB1bmRlZmluZWQgfHwgc3RtdC5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBzeW1ib2xOYW1lcy5wdXNoKHN0bXQubmFtZS50ZXh0KTtcbiAgICAgIH0gZWxzZSBpZiAodHMuaXNFeHBvcnREZWNsYXJhdGlvbihzdG10KSkge1xuICAgICAgICAvLyBMb29rIGZvciBhbiBleHBvcnQgc3RhdGVtZW50IG9mIHRoZSBmb3JtIFwiZXhwb3J0IHsuLi59O1wiLiBJZiBpdCBkb2Vzbid0IG1hdGNoIHRoYXQsIHRoZW5cbiAgICAgICAgLy8gc2tpcCBpdC5cbiAgICAgICAgaWYgKHN0bXQuZXhwb3J0Q2xhdXNlID09PSB1bmRlZmluZWQgfHwgc3RtdC5tb2R1bGVTcGVjaWZpZXIgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgICAgIXRzLmlzTmFtZWRFeHBvcnRzKHN0bXQuZXhwb3J0Q2xhdXNlKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBzcGVjaWZpZXIgb2Ygc3RtdC5leHBvcnRDbGF1c2UuZWxlbWVudHMpIHtcbiAgICAgICAgICAvLyBBdCB0aGlzIHBvaW50LCB0aGVyZSBpcyBubyBndWFyYW50ZWUgdGhhdCBzcGVjaWZpZXIgaGVyZSByZWZlcnMgdG8gYSBjbGFzcyBkZWNsYXJhdGlvbixcbiAgICAgICAgICAvLyBidXQgdGhhdCdzIG9rYXkuXG5cbiAgICAgICAgICAvLyBVc2Ugc3BlY2lmaWVyLm5hbWUgYXMgdGhhdCdzIGd1YXJhbnRlZWQgdG8gYmUgdGhlIGV4cG9ydGVkIG5hbWUsIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlclxuICAgICAgICAgIC8vIHNwZWNpZmllci5wcm9wZXJ0eU5hbWUgaXMgc2V0LlxuICAgICAgICAgIHN5bWJvbE5hbWVzLnB1c2goc3BlY2lmaWVyLm5hbWUudGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YXJMaW5lcyA9IHN5bWJvbE5hbWVzLm1hcChuYW1lID0+IGBleHBvcnQgY29uc3QgJHtuYW1lfU5nU3VtbWFyeTogYW55ID0gbnVsbDtgKTtcblxuICAgIGlmICh2YXJMaW5lcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIEluIHRoZSBldmVudCB0aGVyZSBhcmUgbm8gb3RoZXIgZXhwb3J0cywgYWRkIGFuIGVtcHR5IGV4cG9ydCB0byBlbnN1cmUgdGhlIGdlbmVyYXRlZFxuICAgICAgLy8gc3VtbWFyeSBmaWxlIGlzIHN0aWxsIGFuIEVTIG1vZHVsZS5cbiAgICAgIHZhckxpbmVzLnB1c2goYGV4cG9ydCBjb25zdCDJtWVtcHR5ID0gbnVsbDtgKTtcbiAgICB9XG4gICAgY29uc3Qgc291cmNlVGV4dCA9IHZhckxpbmVzLmpvaW4oJ1xcbicpO1xuICAgIGNvbnN0IGdlbkZpbGUgPVxuICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKGdlbkZpbGVQYXRoLCBzb3VyY2VUZXh0LCBzZi5sYW5ndWFnZVZlcnNpb24sIHRydWUsIHRzLlNjcmlwdEtpbmQuVFMpO1xuICAgIGlmIChzZi5tb2R1bGVOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGdlbkZpbGUubW9kdWxlTmFtZSA9IGdlbmVyYXRlZE1vZHVsZU5hbWUoc2YubW9kdWxlTmFtZSwgc2YuZmlsZU5hbWUsICcubmdzdW1tYXJ5Jyk7XG4gICAgfVxuICAgIHJldHVybiBnZW5GaWxlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRXhwb3J0ZWQoZGVjbDogdHMuRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGRlY2wubW9kaWZpZXJzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIGRlY2wubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCk7XG59XG4iXX0=