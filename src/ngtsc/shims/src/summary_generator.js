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
        define("@angular/compiler-cli/src/ngtsc/shims/src/summary_generator", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/util");
    var SummaryGenerator = /** @class */ (function () {
        function SummaryGenerator(map) {
            this.map = map;
        }
        SummaryGenerator.prototype.getSummaryFileNames = function () { return Array.from(this.map.keys()); };
        SummaryGenerator.prototype.recognize = function (fileName) { return this.map.has(fileName); };
        SummaryGenerator.prototype.generate = function (genFilePath, readFile) {
            var e_1, _a, e_2, _b;
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
            var symbolNames = [];
            try {
                for (var _c = tslib_1.__values(original.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
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
                        if (stmt.exportClause === undefined || stmt.moduleSpecifier !== undefined) {
                            continue;
                        }
                        try {
                            for (var _e = tslib_1.__values(stmt.exportClause.elements), _f = _e.next(); !_f.done; _f = _e.next()) {
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
                .map(function (sourceFile) { return path_1.normalizeSeparators(sourceFile); })
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VtbWFyeV9nZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL3NyYy9zdW1tYXJ5X2dlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsc0VBQXdEO0lBQ3hELGtGQUFpRTtJQUdqRSx1RUFBMkM7SUFFM0M7UUFDRSwwQkFBNEIsR0FBd0I7WUFBeEIsUUFBRyxHQUFILEdBQUcsQ0FBcUI7UUFBRyxDQUFDO1FBRXhELDhDQUFtQixHQUFuQixjQUFrQyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV2RSxvQ0FBUyxHQUFULFVBQVUsUUFBZ0IsSUFBYSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV2RSxtQ0FBUSxHQUFSLFVBQVMsV0FBbUIsRUFBRSxRQUFvRDs7WUFFaEYsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFHLENBQUM7WUFDakQsSUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hDLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDckIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELDJGQUEyRjtZQUMzRixnR0FBZ0c7WUFDaEcsNkZBQTZGO1lBQzdGLDRGQUE0RjtZQUM1RixrRUFBa0U7WUFDbEUsSUFBTSxXQUFXLEdBQWEsRUFBRSxDQUFDOztnQkFDakMsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLFFBQVEsQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7b0JBQW5DLElBQU0sSUFB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QUFJLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUF2QyxDQUF1QyxDQUFDLENBQUM7SUFDMUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7bm9ybWFsaXplU2VwYXJhdG9yc30gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcGF0aCc7XG5pbXBvcnQge2lzTm9uRGVjbGFyYXRpb25Uc1BhdGh9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1NoaW1HZW5lcmF0b3J9IGZyb20gJy4vaG9zdCc7XG5pbXBvcnQge2dlbmVyYXRlZE1vZHVsZU5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBjbGFzcyBTdW1tYXJ5R2VuZXJhdG9yIGltcGxlbWVudHMgU2hpbUdlbmVyYXRvciB7XG4gIHByaXZhdGUgY29uc3RydWN0b3IocHJpdmF0ZSBtYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4pIHt9XG5cbiAgZ2V0U3VtbWFyeUZpbGVOYW1lcygpOiBzdHJpbmdbXSB7IHJldHVybiBBcnJheS5mcm9tKHRoaXMubWFwLmtleXMoKSk7IH1cblxuICByZWNvZ25pemUoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5tYXAuaGFzKGZpbGVOYW1lKTsgfVxuXG4gIGdlbmVyYXRlKGdlbkZpbGVQYXRoOiBzdHJpbmcsIHJlYWRGaWxlOiAoZmlsZU5hbWU6IHN0cmluZykgPT4gdHMuU291cmNlRmlsZSB8IG51bGwpOiB0cy5Tb3VyY2VGaWxlXG4gICAgICB8bnVsbCB7XG4gICAgY29uc3Qgb3JpZ2luYWxQYXRoID0gdGhpcy5tYXAuZ2V0KGdlbkZpbGVQYXRoKSAhO1xuICAgIGNvbnN0IG9yaWdpbmFsID0gcmVhZEZpbGUob3JpZ2luYWxQYXRoKTtcbiAgICBpZiAob3JpZ2luYWwgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIENvbGxlY3QgYSBsaXN0IG9mIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGhhdmUgZmFjdG9yeSB0eXBlcyBlbWl0dGVkIGZvciB0aGVtLiBUaGlzIGxpc3QgaXNcbiAgICAvLyBvdmVybHkgYnJvYWQgYXMgYXQgdGhpcyBwb2ludCB0aGUgdHMuVHlwZUNoZWNrZXIgaGFzIG5vdCBiZWVuIGNyZWF0ZWQgYW5kIHNvIGl0IGNhbid0IGJlIHVzZWRcbiAgICAvLyB0byBzZW1hbnRpY2FsbHkgdW5kZXJzdGFuZCB3aGljaCBkZWNvcmF0b3JzIGFyZSBBbmd1bGFyIGRlY29yYXRvcnMuIEl0J3Mgb2theSB0byBvdXRwdXQgYW5cbiAgICAvLyBvdmVybHkgYnJvYWQgc2V0IG9mIHN1bW1hcnkgZXhwb3J0cyBhcyB0aGUgZXhwb3J0cyBhcmUgbm8tb3BzIGFueXdheSwgYW5kIHN1bW1hcmllcyBhcmUgYVxuICAgIC8vIGNvbXBhdGliaWxpdHkgbGF5ZXIgd2hpY2ggd2lsbCBiZSByZW1vdmVkIGFmdGVyIEl2eSBpcyBlbmFibGVkLlxuICAgIGNvbnN0IHN5bWJvbE5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc3RtdCBvZiBvcmlnaW5hbC5zdGF0ZW1lbnRzKSB7XG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHN0bXQpKSB7XG4gICAgICAgIC8vIElmIHRoZSBjbGFzcyBpc24ndCBleHBvcnRlZCwgb3IgaWYgaXQncyBub3QgZGVjb3JhdGVkLCB0aGVuIHNraXAgaXQuXG4gICAgICAgIGlmICghaXNFeHBvcnRlZChzdG10KSB8fCBzdG10LmRlY29yYXRvcnMgPT09IHVuZGVmaW5lZCB8fCBzdG10Lm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHN5bWJvbE5hbWVzLnB1c2goc3RtdC5uYW1lLnRleHQpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc0V4cG9ydERlY2xhcmF0aW9uKHN0bXQpKSB7XG4gICAgICAgIC8vIExvb2sgZm9yIGFuIGV4cG9ydCBzdGF0ZW1lbnQgb2YgdGhlIGZvcm0gXCJleHBvcnQgey4uLn07XCIuIElmIGl0IGRvZXNuJ3QgbWF0Y2ggdGhhdCwgdGhlblxuICAgICAgICAvLyBza2lwIGl0LlxuICAgICAgICBpZiAoc3RtdC5leHBvcnRDbGF1c2UgPT09IHVuZGVmaW5lZCB8fCBzdG10Lm1vZHVsZVNwZWNpZmllciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IHNwZWNpZmllciBvZiBzdG10LmV4cG9ydENsYXVzZS5lbGVtZW50cykge1xuICAgICAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZXJlIGlzIG5vIGd1YXJhbnRlZSB0aGF0IHNwZWNpZmllciBoZXJlIHJlZmVycyB0byBhIGNsYXNzIGRlY2xhcmF0aW9uLFxuICAgICAgICAgIC8vIGJ1dCB0aGF0J3Mgb2theS5cblxuICAgICAgICAgIC8vIFVzZSBzcGVjaWZpZXIubmFtZSBhcyB0aGF0J3MgZ3VhcmFudGVlZCB0byBiZSB0aGUgZXhwb3J0ZWQgbmFtZSwgcmVnYXJkbGVzcyBvZiB3aGV0aGVyXG4gICAgICAgICAgLy8gc3BlY2lmaWVyLnByb3BlcnR5TmFtZSBpcyBzZXQuXG4gICAgICAgICAgc3ltYm9sTmFtZXMucHVzaChzcGVjaWZpZXIubmFtZS50ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZhckxpbmVzID0gc3ltYm9sTmFtZXMubWFwKG5hbWUgPT4gYGV4cG9ydCBjb25zdCAke25hbWV9TmdTdW1tYXJ5OiBhbnkgPSBudWxsO2ApO1xuXG4gICAgaWYgKHZhckxpbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSW4gdGhlIGV2ZW50IHRoZXJlIGFyZSBubyBvdGhlciBleHBvcnRzLCBhZGQgYW4gZW1wdHkgZXhwb3J0IHRvIGVuc3VyZSB0aGUgZ2VuZXJhdGVkXG4gICAgICAvLyBzdW1tYXJ5IGZpbGUgaXMgc3RpbGwgYW4gRVMgbW9kdWxlLlxuICAgICAgdmFyTGluZXMucHVzaChgZXhwb3J0IGNvbnN0IMm1ZW1wdHkgPSBudWxsO2ApO1xuICAgIH1cbiAgICBjb25zdCBzb3VyY2VUZXh0ID0gdmFyTGluZXMuam9pbignXFxuJyk7XG4gICAgY29uc3QgZ2VuRmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgIGdlbkZpbGVQYXRoLCBzb3VyY2VUZXh0LCBvcmlnaW5hbC5sYW5ndWFnZVZlcnNpb24sIHRydWUsIHRzLlNjcmlwdEtpbmQuVFMpO1xuICAgIGlmIChvcmlnaW5hbC5tb2R1bGVOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGdlbkZpbGUubW9kdWxlTmFtZSA9XG4gICAgICAgICAgZ2VuZXJhdGVkTW9kdWxlTmFtZShvcmlnaW5hbC5tb2R1bGVOYW1lLCBvcmlnaW5hbC5maWxlTmFtZSwgJy5uZ3N1bW1hcnknKTtcbiAgICB9XG4gICAgcmV0dXJuIGdlbkZpbGU7XG4gIH1cblxuICBzdGF0aWMgZm9yUm9vdEZpbGVzKGZpbGVzOiBSZWFkb25seUFycmF5PHN0cmluZz4pOiBTdW1tYXJ5R2VuZXJhdG9yIHtcbiAgICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgIGZpbGVzLmZpbHRlcihzb3VyY2VGaWxlID0+IGlzTm9uRGVjbGFyYXRpb25Uc1BhdGgoc291cmNlRmlsZSkpXG4gICAgICAgIC5tYXAoc291cmNlRmlsZSA9PiBub3JtYWxpemVTZXBhcmF0b3JzKHNvdXJjZUZpbGUpKVxuICAgICAgICAuZm9yRWFjaChzb3VyY2VGaWxlID0+IG1hcC5zZXQoc291cmNlRmlsZS5yZXBsYWNlKC9cXC50cyQvLCAnLm5nc3VtbWFyeS50cycpLCBzb3VyY2VGaWxlKSk7XG4gICAgcmV0dXJuIG5ldyBTdW1tYXJ5R2VuZXJhdG9yKG1hcCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNFeHBvcnRlZChkZWNsOiB0cy5EZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICByZXR1cm4gZGVjbC5tb2RpZmllcnMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgZGVjbC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKTtcbn1cbiJdfQ==