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
        define("@angular/compiler-cli/src/ngtsc/transform/src/alias", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.aliasTransformFactory = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    function aliasTransformFactory(exportStatements) {
        return function (context) {
            return function (file) {
                if (ts.isBundle(file) || !exportStatements.has(file.fileName)) {
                    return file;
                }
                var statements = tslib_1.__spread(file.statements);
                exportStatements.get(file.fileName).forEach(function (_a, aliasName) {
                    var _b = tslib_1.__read(_a, 2), moduleName = _b[0], symbolName = _b[1];
                    var stmt = ts.createExportDeclaration(
                    /* decorators */ undefined, 
                    /* modifiers */ undefined, 
                    /* exportClause */ ts.createNamedExports([ts.createExportSpecifier(
                        /* propertyName */ symbolName, 
                        /* name */ aliasName)]), 
                    /* moduleSpecifier */ ts.createStringLiteral(moduleName));
                    statements.push(stmt);
                });
                file = ts.getMutableClone(file);
                file.statements = ts.createNodeArray(statements);
                return file;
            };
        };
    }
    exports.aliasTransformFactory = aliasTransformFactory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxpYXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvYWxpYXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUVqQyxTQUFnQixxQkFBcUIsQ0FBQyxnQkFBNEQ7UUFFaEcsT0FBTyxVQUFDLE9BQWlDO1lBQ3ZDLE9BQU8sVUFBQyxJQUFtQjtnQkFDekIsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDN0QsT0FBTyxJQUFJLENBQUM7aUJBQ2I7Z0JBRUQsSUFBTSxVQUFVLG9CQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDeEMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUUsQ0FBQyxPQUFPLENBQUMsVUFBQyxFQUF3QixFQUFFLFNBQVM7d0JBQW5DLEtBQUEscUJBQXdCLEVBQXZCLFVBQVUsUUFBQSxFQUFFLFVBQVUsUUFBQTtvQkFDbkUsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLHVCQUF1QjtvQkFDbkMsZ0JBQWdCLENBQUMsU0FBUztvQkFDMUIsZUFBZSxDQUFDLFNBQVM7b0JBQ3pCLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxxQkFBcUI7d0JBQzlELGtCQUFrQixDQUFDLFVBQVU7d0JBQzdCLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUMzQixxQkFBcUIsQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDOUQsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDeEIsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsSUFBSSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDakQsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7SUFDSixDQUFDO0lBekJELHNEQXlCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBhbGlhc1RyYW5zZm9ybUZhY3RvcnkoZXhwb3J0U3RhdGVtZW50czogTWFwPHN0cmluZywgTWFwPHN0cmluZywgW3N0cmluZywgc3RyaW5nXT4+KTpcbiAgICB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4ge1xuICByZXR1cm4gKGNvbnRleHQ6IHRzLlRyYW5zZm9ybWF0aW9uQ29udGV4dCkgPT4ge1xuICAgIHJldHVybiAoZmlsZTogdHMuU291cmNlRmlsZSkgPT4ge1xuICAgICAgaWYgKHRzLmlzQnVuZGxlKGZpbGUpIHx8ICFleHBvcnRTdGF0ZW1lbnRzLmhhcyhmaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICByZXR1cm4gZmlsZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc3RhdGVtZW50cyA9IFsuLi5maWxlLnN0YXRlbWVudHNdO1xuICAgICAgZXhwb3J0U3RhdGVtZW50cy5nZXQoZmlsZS5maWxlTmFtZSkhLmZvckVhY2goKFttb2R1bGVOYW1lLCBzeW1ib2xOYW1lXSwgYWxpYXNOYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IHN0bXQgPSB0cy5jcmVhdGVFeHBvcnREZWNsYXJhdGlvbihcbiAgICAgICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogbW9kaWZpZXJzICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGV4cG9ydENsYXVzZSAqLyB0cy5jcmVhdGVOYW1lZEV4cG9ydHMoW3RzLmNyZWF0ZUV4cG9ydFNwZWNpZmllcihcbiAgICAgICAgICAgICAgICAvKiBwcm9wZXJ0eU5hbWUgKi8gc3ltYm9sTmFtZSxcbiAgICAgICAgICAgICAgICAvKiBuYW1lICovIGFsaWFzTmFtZSldKSxcbiAgICAgICAgICAgIC8qIG1vZHVsZVNwZWNpZmllciAqLyB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKG1vZHVsZU5hbWUpKTtcbiAgICAgICAgc3RhdGVtZW50cy5wdXNoKHN0bXQpO1xuICAgICAgfSk7XG5cbiAgICAgIGZpbGUgPSB0cy5nZXRNdXRhYmxlQ2xvbmUoZmlsZSk7XG4gICAgICBmaWxlLnN0YXRlbWVudHMgPSB0cy5jcmVhdGVOb2RlQXJyYXkoc3RhdGVtZW50cyk7XG4gICAgICByZXR1cm4gZmlsZTtcbiAgICB9O1xuICB9O1xufVxuIl19