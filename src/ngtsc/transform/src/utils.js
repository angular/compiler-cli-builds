(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/transform/src/utils", ["require", "exports", "tslib", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.addImports = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    /**
     * Adds extra imports in the import manage for this source file, after the existing imports
     * and before the module body.
     * Can optionally add extra statements (e.g. new constants) before the body as well.
     */
    function addImports(importManager, sf, extraStatements) {
        if (extraStatements === void 0) { extraStatements = []; }
        // Generate the import statements to prepend.
        var addedImports = importManager.getAllImports(sf.fileName).map(function (i) {
            var qualifier = ts.createIdentifier(i.qualifier.text);
            var importClause = ts.createImportClause(
            /* name */ undefined, 
            /* namedBindings */ ts.createNamespaceImport(qualifier));
            var decl = ts.createImportDeclaration(
            /* decorators */ undefined, 
            /* modifiers */ undefined, 
            /* importClause */ importClause, 
            /* moduleSpecifier */ ts.createLiteral(i.specifier));
            // Set the qualifier's original TS node to the `ts.ImportDeclaration`. This allows downstream
            // transforms such as tsickle to properly process references to this import.
            //
            // This operation is load-bearing in g3 as some imported modules contain special metadata
            // generated by clutz, which tsickle uses to transform imports and references to those imports.
            //
            // TODO(alxhub): add a test for this when tsickle is updated externally to depend on this
            // behavior.
            ts.setOriginalNode(i.qualifier, decl);
            return decl;
        });
        // Filter out the existing imports and the source file body. All new statements
        // will be inserted between them.
        var existingImports = sf.statements.filter(function (stmt) { return isImportStatement(stmt); });
        var body = sf.statements.filter(function (stmt) { return !isImportStatement(stmt); });
        // Prepend imports if needed.
        if (addedImports.length > 0) {
            // If we prepend imports, we also prepend NotEmittedStatement to use it as an anchor
            // for @fileoverview Closure annotation. If there is no @fileoverview annotations, this
            // statement would be a noop.
            var fileoverviewAnchorStmt = ts.createNotEmittedStatement(sf);
            return ts.updateSourceFileNode(sf, ts.createNodeArray(tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray([
                fileoverviewAnchorStmt
            ], tslib_1.__read(existingImports)), tslib_1.__read(addedImports)), tslib_1.__read(extraStatements)), tslib_1.__read(body))));
        }
        return sf;
    }
    exports.addImports = addImports;
    function isImportStatement(stmt) {
        return ts.isImportDeclaration(stmt) || ts.isImportEqualsDeclaration(stmt) ||
            ts.isNamespaceImport(stmt);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUlqQzs7OztPQUlHO0lBQ0gsU0FBZ0IsVUFBVSxDQUN0QixhQUE0QixFQUFFLEVBQWlCLEVBQy9DLGVBQW9DO1FBQXBDLGdDQUFBLEVBQUEsb0JBQW9DO1FBQ3RDLDZDQUE2QztRQUM3QyxJQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDO1lBQ2pFLElBQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hELElBQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0I7WUFDdEMsVUFBVSxDQUFDLFNBQVM7WUFDcEIsbUJBQW1CLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDN0QsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLHVCQUF1QjtZQUNuQyxnQkFBZ0IsQ0FBQyxTQUFTO1lBQzFCLGVBQWUsQ0FBQyxTQUFTO1lBQ3pCLGtCQUFrQixDQUFDLFlBQVk7WUFDL0IscUJBQXFCLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUV6RCw2RkFBNkY7WUFDN0YsNEVBQTRFO1lBQzVFLEVBQUU7WUFDRix5RkFBeUY7WUFDekYsK0ZBQStGO1lBQy9GLEVBQUU7WUFDRix5RkFBeUY7WUFDekYsWUFBWTtZQUNaLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUV0QyxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBRUgsK0VBQStFO1FBQy9FLGlDQUFpQztRQUNqQyxJQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUF2QixDQUF1QixDQUFDLENBQUM7UUFDOUUsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUF4QixDQUF3QixDQUFDLENBQUM7UUFDcEUsNkJBQTZCO1FBQzdCLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDM0Isb0ZBQW9GO1lBQ3BGLHVGQUF1RjtZQUN2Riw2QkFBNkI7WUFDN0IsSUFBTSxzQkFBc0IsR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEUsT0FBTyxFQUFFLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxlQUFlO2dCQUNuRCxzQkFBc0I7OEJBQUssZUFBZSxtQkFBSyxZQUFZLG1CQUFLLGVBQWUsbUJBQUssSUFBSSxHQUN4RixDQUFDLENBQUM7U0FDTDtRQUVELE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQTVDRCxnQ0E0Q0M7SUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQWtCO1FBQzNDLE9BQU8sRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7WUFDckUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0ltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uL3RyYW5zbGF0b3InO1xuXG4vKipcbiAqIEFkZHMgZXh0cmEgaW1wb3J0cyBpbiB0aGUgaW1wb3J0IG1hbmFnZSBmb3IgdGhpcyBzb3VyY2UgZmlsZSwgYWZ0ZXIgdGhlIGV4aXN0aW5nIGltcG9ydHNcbiAqIGFuZCBiZWZvcmUgdGhlIG1vZHVsZSBib2R5LlxuICogQ2FuIG9wdGlvbmFsbHkgYWRkIGV4dHJhIHN0YXRlbWVudHMgKGUuZy4gbmV3IGNvbnN0YW50cykgYmVmb3JlIHRoZSBib2R5IGFzIHdlbGwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRJbXBvcnRzKFxuICAgIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIsIHNmOiB0cy5Tb3VyY2VGaWxlLFxuICAgIGV4dHJhU3RhdGVtZW50czogdHMuU3RhdGVtZW50W10gPSBbXSk6IHRzLlNvdXJjZUZpbGUge1xuICAvLyBHZW5lcmF0ZSB0aGUgaW1wb3J0IHN0YXRlbWVudHMgdG8gcHJlcGVuZC5cbiAgY29uc3QgYWRkZWRJbXBvcnRzID0gaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKHNmLmZpbGVOYW1lKS5tYXAoaSA9PiB7XG4gICAgY29uc3QgcXVhbGlmaWVyID0gdHMuY3JlYXRlSWRlbnRpZmllcihpLnF1YWxpZmllci50ZXh0KTtcbiAgICBjb25zdCBpbXBvcnRDbGF1c2UgPSB0cy5jcmVhdGVJbXBvcnRDbGF1c2UoXG4gICAgICAgIC8qIG5hbWUgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBuYW1lZEJpbmRpbmdzICovIHRzLmNyZWF0ZU5hbWVzcGFjZUltcG9ydChxdWFsaWZpZXIpKTtcbiAgICBjb25zdCBkZWNsID0gdHMuY3JlYXRlSW1wb3J0RGVjbGFyYXRpb24oXG4gICAgICAgIC8qIGRlY29yYXRvcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBtb2RpZmllcnMgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBpbXBvcnRDbGF1c2UgKi8gaW1wb3J0Q2xhdXNlLFxuICAgICAgICAvKiBtb2R1bGVTcGVjaWZpZXIgKi8gdHMuY3JlYXRlTGl0ZXJhbChpLnNwZWNpZmllcikpO1xuXG4gICAgLy8gU2V0IHRoZSBxdWFsaWZpZXIncyBvcmlnaW5hbCBUUyBub2RlIHRvIHRoZSBgdHMuSW1wb3J0RGVjbGFyYXRpb25gLiBUaGlzIGFsbG93cyBkb3duc3RyZWFtXG4gICAgLy8gdHJhbnNmb3JtcyBzdWNoIGFzIHRzaWNrbGUgdG8gcHJvcGVybHkgcHJvY2VzcyByZWZlcmVuY2VzIHRvIHRoaXMgaW1wb3J0LlxuICAgIC8vXG4gICAgLy8gVGhpcyBvcGVyYXRpb24gaXMgbG9hZC1iZWFyaW5nIGluIGczIGFzIHNvbWUgaW1wb3J0ZWQgbW9kdWxlcyBjb250YWluIHNwZWNpYWwgbWV0YWRhdGFcbiAgICAvLyBnZW5lcmF0ZWQgYnkgY2x1dHosIHdoaWNoIHRzaWNrbGUgdXNlcyB0byB0cmFuc2Zvcm0gaW1wb3J0cyBhbmQgcmVmZXJlbmNlcyB0byB0aG9zZSBpbXBvcnRzLlxuICAgIC8vXG4gICAgLy8gVE9ETyhhbHhodWIpOiBhZGQgYSB0ZXN0IGZvciB0aGlzIHdoZW4gdHNpY2tsZSBpcyB1cGRhdGVkIGV4dGVybmFsbHkgdG8gZGVwZW5kIG9uIHRoaXNcbiAgICAvLyBiZWhhdmlvci5cbiAgICB0cy5zZXRPcmlnaW5hbE5vZGUoaS5xdWFsaWZpZXIsIGRlY2wpO1xuXG4gICAgcmV0dXJuIGRlY2w7XG4gIH0pO1xuXG4gIC8vIEZpbHRlciBvdXQgdGhlIGV4aXN0aW5nIGltcG9ydHMgYW5kIHRoZSBzb3VyY2UgZmlsZSBib2R5LiBBbGwgbmV3IHN0YXRlbWVudHNcbiAgLy8gd2lsbCBiZSBpbnNlcnRlZCBiZXR3ZWVuIHRoZW0uXG4gIGNvbnN0IGV4aXN0aW5nSW1wb3J0cyA9IHNmLnN0YXRlbWVudHMuZmlsdGVyKHN0bXQgPT4gaXNJbXBvcnRTdGF0ZW1lbnQoc3RtdCkpO1xuICBjb25zdCBib2R5ID0gc2Yuc3RhdGVtZW50cy5maWx0ZXIoc3RtdCA9PiAhaXNJbXBvcnRTdGF0ZW1lbnQoc3RtdCkpO1xuICAvLyBQcmVwZW5kIGltcG9ydHMgaWYgbmVlZGVkLlxuICBpZiAoYWRkZWRJbXBvcnRzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBJZiB3ZSBwcmVwZW5kIGltcG9ydHMsIHdlIGFsc28gcHJlcGVuZCBOb3RFbWl0dGVkU3RhdGVtZW50IHRvIHVzZSBpdCBhcyBhbiBhbmNob3JcbiAgICAvLyBmb3IgQGZpbGVvdmVydmlldyBDbG9zdXJlIGFubm90YXRpb24uIElmIHRoZXJlIGlzIG5vIEBmaWxlb3ZlcnZpZXcgYW5ub3RhdGlvbnMsIHRoaXNcbiAgICAvLyBzdGF0ZW1lbnQgd291bGQgYmUgYSBub29wLlxuICAgIGNvbnN0IGZpbGVvdmVydmlld0FuY2hvclN0bXQgPSB0cy5jcmVhdGVOb3RFbWl0dGVkU3RhdGVtZW50KHNmKTtcbiAgICByZXR1cm4gdHMudXBkYXRlU291cmNlRmlsZU5vZGUoc2YsIHRzLmNyZWF0ZU5vZGVBcnJheShbXG4gICAgICBmaWxlb3ZlcnZpZXdBbmNob3JTdG10LCAuLi5leGlzdGluZ0ltcG9ydHMsIC4uLmFkZGVkSW1wb3J0cywgLi4uZXh0cmFTdGF0ZW1lbnRzLCAuLi5ib2R5XG4gICAgXSkpO1xuICB9XG5cbiAgcmV0dXJuIHNmO1xufVxuXG5mdW5jdGlvbiBpc0ltcG9ydFN0YXRlbWVudChzdG10OiB0cy5TdGF0ZW1lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRzLmlzSW1wb3J0RGVjbGFyYXRpb24oc3RtdCkgfHwgdHMuaXNJbXBvcnRFcXVhbHNEZWNsYXJhdGlvbihzdG10KSB8fFxuICAgICAgdHMuaXNOYW1lc3BhY2VJbXBvcnQoc3RtdCk7XG59XG4iXX0=