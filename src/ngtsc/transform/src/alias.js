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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxpYXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvYWxpYXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBRWpDLFNBQWdCLHFCQUFxQixDQUFDLGdCQUE0RDtRQUVoRyxPQUFPLFVBQUMsT0FBaUM7WUFDdkMsT0FBTyxVQUFDLElBQW1CO2dCQUN6QixJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUM3RCxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFFRCxJQUFNLFVBQVUsb0JBQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN4QyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEVBQXdCLEVBQUUsU0FBUzt3QkFBbkMsMEJBQXdCLEVBQXZCLGtCQUFVLEVBQUUsa0JBQVU7b0JBQ3BFLElBQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyx1QkFBdUI7b0JBQ25DLGdCQUFnQixDQUFDLFNBQVM7b0JBQzFCLGVBQWUsQ0FBQyxTQUFTO29CQUN6QixrQkFBa0IsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLENBQUMscUJBQXFCO3dCQUM5RCxrQkFBa0IsQ0FBQyxVQUFVO3dCQUM3QixVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFDM0IscUJBQXFCLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQzlELFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hCLENBQUMsQ0FBQyxDQUFDO2dCQUVILElBQUksR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2pELE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQXpCRCxzREF5QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgZnVuY3Rpb24gYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGV4cG9ydFN0YXRlbWVudHM6IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+Pik6XG4gICAgdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIChjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpID0+IHtcbiAgICByZXR1cm4gKGZpbGU6IHRzLlNvdXJjZUZpbGUpID0+IHtcbiAgICAgIGlmICh0cy5pc0J1bmRsZShmaWxlKSB8fCAhZXhwb3J0U3RhdGVtZW50cy5oYXMoZmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIGZpbGU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHN0YXRlbWVudHMgPSBbLi4uZmlsZS5zdGF0ZW1lbnRzXTtcbiAgICAgIGV4cG9ydFN0YXRlbWVudHMuZ2V0KGZpbGUuZmlsZU5hbWUpICEuZm9yRWFjaCgoW21vZHVsZU5hbWUsIHN5bWJvbE5hbWVdLCBhbGlhc05hbWUpID0+IHtcbiAgICAgICAgY29uc3Qgc3RtdCA9IHRzLmNyZWF0ZUV4cG9ydERlY2xhcmF0aW9uKFxuICAgICAgICAgICAgLyogZGVjb3JhdG9ycyAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgLyogZXhwb3J0Q2xhdXNlICovIHRzLmNyZWF0ZU5hbWVkRXhwb3J0cyhbdHMuY3JlYXRlRXhwb3J0U3BlY2lmaWVyKFxuICAgICAgICAgICAgICAgIC8qIHByb3BlcnR5TmFtZSAqLyBzeW1ib2xOYW1lLFxuICAgICAgICAgICAgICAgIC8qIG5hbWUgKi8gYWxpYXNOYW1lKV0pLFxuICAgICAgICAgICAgLyogbW9kdWxlU3BlY2lmaWVyICovIHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwobW9kdWxlTmFtZSkpO1xuICAgICAgICBzdGF0ZW1lbnRzLnB1c2goc3RtdCk7XG4gICAgICB9KTtcblxuICAgICAgZmlsZSA9IHRzLmdldE11dGFibGVDbG9uZShmaWxlKTtcbiAgICAgIGZpbGUuc3RhdGVtZW50cyA9IHRzLmNyZWF0ZU5vZGVBcnJheShzdGF0ZW1lbnRzKTtcbiAgICAgIHJldHVybiBmaWxlO1xuICAgIH07XG4gIH07XG59XG4iXX0=