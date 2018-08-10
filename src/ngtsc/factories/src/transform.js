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
        define("@angular/compiler-cli/src/ngtsc/factories/src/transform", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    var STRIP_NG_FACTORY = /(.*)NgFactory$/;
    function generatedFactoryTransform(factoryMap, coreImportsFrom) {
        return function (context) {
            return function (file) {
                return transformFactorySourceFile(factoryMap, context, coreImportsFrom, file);
            };
        };
    }
    exports.generatedFactoryTransform = generatedFactoryTransform;
    function transformFactorySourceFile(factoryMap, context, coreImportsFrom, file) {
        // If this is not a generated file, it won't have factory info associated with it.
        if (!factoryMap.has(file.fileName)) {
            // Don't transform non-generated code.
            return file;
        }
        var _a = factoryMap.get(file.fileName), moduleSymbolNames = _a.moduleSymbolNames, sourceFilePath = _a.sourceFilePath;
        var clone = ts.getMutableClone(file);
        var transformedStatements = file.statements.map(function (stmt) {
            if (coreImportsFrom !== null && ts.isImportDeclaration(stmt) &&
                ts.isStringLiteral(stmt.moduleSpecifier) && stmt.moduleSpecifier.text === '@angular/core') {
                var path = path_1.relativePathBetween(sourceFilePath, coreImportsFrom.fileName);
                if (path !== null) {
                    return ts.updateImportDeclaration(stmt, stmt.decorators, stmt.modifiers, stmt.importClause, ts.createStringLiteral(path));
                }
                else {
                    return ts.createNotEmittedStatement(stmt);
                }
            }
            else if (ts.isVariableStatement(stmt) && stmt.declarationList.declarations.length === 1) {
                var decl = stmt.declarationList.declarations[0];
                if (ts.isIdentifier(decl.name)) {
                    var match = STRIP_NG_FACTORY.exec(decl.name.text);
                    if (match === null || !moduleSymbolNames.has(match[1])) {
                        // Remove the given factory as it wasn't actually for an NgModule.
                        return ts.createNotEmittedStatement(stmt);
                    }
                }
                return stmt;
            }
            else {
                return stmt;
            }
        });
        if (!transformedStatements.some(ts.isVariableStatement)) {
            // If the resulting file has no factories, include an empty export to
            // satisfy closure compiler.
            transformedStatements.push(ts.createVariableStatement([ts.createModifier(ts.SyntaxKind.ExportKeyword)], ts.createVariableDeclarationList([ts.createVariableDeclaration('ɵNonEmptyModule', undefined, ts.createTrue())], ts.NodeFlags.Const)));
        }
        clone.statements = ts.createNodeArray(transformedStatements);
        return clone;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9mYWN0b3JpZXMvc3JjL3RyYW5zZm9ybS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxzRUFBd0Q7SUFFeEQsSUFBTSxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQztJQU8xQyxtQ0FDSSxVQUFvQyxFQUNwQyxlQUFxQztRQUN2QyxPQUFPLFVBQUMsT0FBaUM7WUFDdkMsT0FBTyxVQUFDLElBQW1CO2dCQUN6QixPQUFPLDBCQUEwQixDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2hGLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7SUFSRCw4REFRQztJQUVELG9DQUNJLFVBQW9DLEVBQUUsT0FBaUMsRUFDdkUsZUFBcUMsRUFBRSxJQUFtQjtRQUM1RCxrRkFBa0Y7UUFDbEYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ2xDLHNDQUFzQztZQUN0QyxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUssSUFBQSxrQ0FBcUUsRUFBcEUsd0NBQWlCLEVBQUUsa0NBQWMsQ0FBb0M7UUFFNUUsSUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV2QyxJQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtZQUNwRCxJQUFJLGVBQWUsS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQztnQkFDeEQsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUFFO2dCQUM3RixJQUFNLElBQUksR0FBRywwQkFBbUIsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzRSxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7b0JBQ2pCLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUM3QixJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7aUJBQzdGO3FCQUFNO29CQUNMLE9BQU8sRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUMzQzthQUNGO2lCQUFNLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3pGLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUM5QixJQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDcEQsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUN0RCxrRUFBa0U7d0JBQ2xFLE9BQU8sRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUMzQztpQkFDRjtnQkFDRCxPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDO2FBQ2I7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7WUFDdkQscUVBQXFFO1lBQ3JFLDRCQUE0QjtZQUM1QixxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUNqRCxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUNoRCxFQUFFLENBQUMsNkJBQTZCLENBQzVCLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUM3RSxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMvQjtRQUNELEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzdELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7cmVsYXRpdmVQYXRoQmV0d2Vlbn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcGF0aCc7XG5cbmNvbnN0IFNUUklQX05HX0ZBQ1RPUlkgPSAvKC4qKU5nRmFjdG9yeSQvO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZhY3RvcnlJbmZvIHtcbiAgc291cmNlRmlsZVBhdGg6IHN0cmluZztcbiAgbW9kdWxlU3ltYm9sTmFtZXM6IFNldDxzdHJpbmc+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybShcbiAgICBmYWN0b3J5TWFwOiBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz4sXG4gICAgY29yZUltcG9ydHNGcm9tOiB0cy5Tb3VyY2VGaWxlIHwgbnVsbCk6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPiB7XG4gIHJldHVybiAoY29udGV4dDogdHMuVHJhbnNmb3JtYXRpb25Db250ZXh0KTogdHMuVHJhbnNmb3JtZXI8dHMuU291cmNlRmlsZT4gPT4ge1xuICAgIHJldHVybiAoZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUgPT4ge1xuICAgICAgcmV0dXJuIHRyYW5zZm9ybUZhY3RvcnlTb3VyY2VGaWxlKGZhY3RvcnlNYXAsIGNvbnRleHQsIGNvcmVJbXBvcnRzRnJvbSwgZmlsZSk7XG4gICAgfTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtRmFjdG9yeVNvdXJjZUZpbGUoXG4gICAgZmFjdG9yeU1hcDogTWFwPHN0cmluZywgRmFjdG9yeUluZm8+LCBjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQsXG4gICAgY29yZUltcG9ydHNGcm9tOiB0cy5Tb3VyY2VGaWxlIHwgbnVsbCwgZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICAvLyBJZiB0aGlzIGlzIG5vdCBhIGdlbmVyYXRlZCBmaWxlLCBpdCB3b24ndCBoYXZlIGZhY3RvcnkgaW5mbyBhc3NvY2lhdGVkIHdpdGggaXQuXG4gIGlmICghZmFjdG9yeU1hcC5oYXMoZmlsZS5maWxlTmFtZSkpIHtcbiAgICAvLyBEb24ndCB0cmFuc2Zvcm0gbm9uLWdlbmVyYXRlZCBjb2RlLlxuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgY29uc3Qge21vZHVsZVN5bWJvbE5hbWVzLCBzb3VyY2VGaWxlUGF0aH0gPSBmYWN0b3J5TWFwLmdldChmaWxlLmZpbGVOYW1lKSAhO1xuXG4gIGNvbnN0IGNsb25lID0gdHMuZ2V0TXV0YWJsZUNsb25lKGZpbGUpO1xuXG4gIGNvbnN0IHRyYW5zZm9ybWVkU3RhdGVtZW50cyA9IGZpbGUuc3RhdGVtZW50cy5tYXAoc3RtdCA9PiB7XG4gICAgaWYgKGNvcmVJbXBvcnRzRnJvbSAhPT0gbnVsbCAmJiB0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpICYmXG4gICAgICAgIHRzLmlzU3RyaW5nTGl0ZXJhbChzdG10Lm1vZHVsZVNwZWNpZmllcikgJiYgc3RtdC5tb2R1bGVTcGVjaWZpZXIudGV4dCA9PT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICBjb25zdCBwYXRoID0gcmVsYXRpdmVQYXRoQmV0d2Vlbihzb3VyY2VGaWxlUGF0aCwgY29yZUltcG9ydHNGcm9tLmZpbGVOYW1lKTtcbiAgICAgIGlmIChwYXRoICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0cy51cGRhdGVJbXBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgIHN0bXQsIHN0bXQuZGVjb3JhdG9ycywgc3RtdC5tb2RpZmllcnMsIHN0bXQuaW1wb3J0Q2xhdXNlLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKHBhdGgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0cy5jcmVhdGVOb3RFbWl0dGVkU3RhdGVtZW50KHN0bXQpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSAmJiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICBjb25zdCBkZWNsID0gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zWzBdO1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gU1RSSVBfTkdfRkFDVE9SWS5leGVjKGRlY2wubmFtZS50ZXh0KTtcbiAgICAgICAgaWYgKG1hdGNoID09PSBudWxsIHx8ICFtb2R1bGVTeW1ib2xOYW1lcy5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgLy8gUmVtb3ZlIHRoZSBnaXZlbiBmYWN0b3J5IGFzIGl0IHdhc24ndCBhY3R1YWxseSBmb3IgYW4gTmdNb2R1bGUuXG4gICAgICAgICAgcmV0dXJuIHRzLmNyZWF0ZU5vdEVtaXR0ZWRTdGF0ZW1lbnQoc3RtdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzdG10O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc3RtdDtcbiAgICB9XG4gIH0pO1xuICBpZiAoIXRyYW5zZm9ybWVkU3RhdGVtZW50cy5zb21lKHRzLmlzVmFyaWFibGVTdGF0ZW1lbnQpKSB7XG4gICAgLy8gSWYgdGhlIHJlc3VsdGluZyBmaWxlIGhhcyBubyBmYWN0b3JpZXMsIGluY2x1ZGUgYW4gZW1wdHkgZXhwb3J0IHRvXG4gICAgLy8gc2F0aXNmeSBjbG9zdXJlIGNvbXBpbGVyLlxuICAgIHRyYW5zZm9ybWVkU3RhdGVtZW50cy5wdXNoKHRzLmNyZWF0ZVZhcmlhYmxlU3RhdGVtZW50KFxuICAgICAgICBbdHMuY3JlYXRlTW9kaWZpZXIodHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKV0sXG4gICAgICAgIHRzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KFxuICAgICAgICAgICAgW3RzLmNyZWF0ZVZhcmlhYmxlRGVjbGFyYXRpb24oJ8m1Tm9uRW1wdHlNb2R1bGUnLCB1bmRlZmluZWQsIHRzLmNyZWF0ZVRydWUoKSldLFxuICAgICAgICAgICAgdHMuTm9kZUZsYWdzLkNvbnN0KSkpO1xuICB9XG4gIGNsb25lLnN0YXRlbWVudHMgPSB0cy5jcmVhdGVOb2RlQXJyYXkodHJhbnNmb3JtZWRTdGF0ZW1lbnRzKTtcbiAgcmV0dXJuIGNsb25lO1xufVxuIl19