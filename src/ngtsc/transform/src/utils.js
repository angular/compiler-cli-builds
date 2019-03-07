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
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
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
            return ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamespaceImport(ts.createIdentifier(i.as))), ts.createLiteral(i.name));
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
            sf.statements = ts.createNodeArray(tslib_1.__spread([fileoverviewAnchorStmt], existingImports, addedImports, extraStatements, body));
        }
        return sf;
    }
    exports.addImports = addImports;
    function isImportStatement(stmt) {
        return ts.isImportDeclaration(stmt) || ts.isImportEqualsDeclaration(stmt) ||
            ts.isNamespaceImport(stmt);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBSWpDOzs7O09BSUc7SUFDSCxTQUFnQixVQUFVLENBQ3RCLGFBQTRCLEVBQUUsRUFBaUIsRUFDL0MsZUFBb0M7UUFBcEMsZ0NBQUEsRUFBQSxvQkFBb0M7UUFDdEMsNkNBQTZDO1FBQzdDLElBQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUM7WUFDakUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQzdCLFNBQVMsRUFBRSxTQUFTLEVBQ3BCLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUNyRixFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDO1FBRUgsK0VBQStFO1FBQy9FLGlDQUFpQztRQUNqQyxJQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUF2QixDQUF1QixDQUFDLENBQUM7UUFDOUUsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUF4QixDQUF3QixDQUFDLENBQUM7UUFDcEUsNkJBQTZCO1FBQzdCLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDM0Isb0ZBQW9GO1lBQ3BGLHVGQUF1RjtZQUN2Riw2QkFBNkI7WUFDN0IsSUFBTSxzQkFBc0IsR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEUsRUFBRSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsZUFBZSxtQkFDN0Isc0JBQXNCLEdBQUssZUFBZSxFQUFLLFlBQVksRUFBSyxlQUFlLEVBQUssSUFBSSxFQUFFLENBQUM7U0FDakc7UUFFRCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUExQkQsZ0NBMEJDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUFrQjtRQUMzQyxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDO1lBQ3JFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vdHJhbnNsYXRvcic7XG5cbi8qKlxuICogQWRkcyBleHRyYSBpbXBvcnRzIGluIHRoZSBpbXBvcnQgbWFuYWdlIGZvciB0aGlzIHNvdXJjZSBmaWxlLCBhZnRlciB0aGUgZXhpc3RpbmcgaW1wb3J0c1xuICogYW5kIGJlZm9yZSB0aGUgbW9kdWxlIGJvZHkuXG4gKiBDYW4gb3B0aW9uYWxseSBhZGQgZXh0cmEgc3RhdGVtZW50cyAoZS5nLiBuZXcgY29uc3RhbnRzKSBiZWZvcmUgdGhlIGJvZHkgYXMgd2VsbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFkZEltcG9ydHMoXG4gICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgc2Y6IHRzLlNvdXJjZUZpbGUsXG4gICAgZXh0cmFTdGF0ZW1lbnRzOiB0cy5TdGF0ZW1lbnRbXSA9IFtdKTogdHMuU291cmNlRmlsZSB7XG4gIC8vIEdlbmVyYXRlIHRoZSBpbXBvcnQgc3RhdGVtZW50cyB0byBwcmVwZW5kLlxuICBjb25zdCBhZGRlZEltcG9ydHMgPSBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoc2YuZmlsZU5hbWUpLm1hcChpID0+IHtcbiAgICByZXR1cm4gdHMuY3JlYXRlSW1wb3J0RGVjbGFyYXRpb24oXG4gICAgICAgIHVuZGVmaW5lZCwgdW5kZWZpbmVkLFxuICAgICAgICB0cy5jcmVhdGVJbXBvcnRDbGF1c2UodW5kZWZpbmVkLCB0cy5jcmVhdGVOYW1lc3BhY2VJbXBvcnQodHMuY3JlYXRlSWRlbnRpZmllcihpLmFzKSkpLFxuICAgICAgICB0cy5jcmVhdGVMaXRlcmFsKGkubmFtZSkpO1xuICB9KTtcblxuICAvLyBGaWx0ZXIgb3V0IHRoZSBleGlzdGluZyBpbXBvcnRzIGFuZCB0aGUgc291cmNlIGZpbGUgYm9keS4gQWxsIG5ldyBzdGF0ZW1lbnRzXG4gIC8vIHdpbGwgYmUgaW5zZXJ0ZWQgYmV0d2VlbiB0aGVtLlxuICBjb25zdCBleGlzdGluZ0ltcG9ydHMgPSBzZi5zdGF0ZW1lbnRzLmZpbHRlcihzdG10ID0+IGlzSW1wb3J0U3RhdGVtZW50KHN0bXQpKTtcbiAgY29uc3QgYm9keSA9IHNmLnN0YXRlbWVudHMuZmlsdGVyKHN0bXQgPT4gIWlzSW1wb3J0U3RhdGVtZW50KHN0bXQpKTtcbiAgLy8gUHJlcGVuZCBpbXBvcnRzIGlmIG5lZWRlZC5cbiAgaWYgKGFkZGVkSW1wb3J0cy5sZW5ndGggPiAwKSB7XG4gICAgLy8gSWYgd2UgcHJlcGVuZCBpbXBvcnRzLCB3ZSBhbHNvIHByZXBlbmQgTm90RW1pdHRlZFN0YXRlbWVudCB0byB1c2UgaXQgYXMgYW4gYW5jaG9yXG4gICAgLy8gZm9yIEBmaWxlb3ZlcnZpZXcgQ2xvc3VyZSBhbm5vdGF0aW9uLiBJZiB0aGVyZSBpcyBubyBAZmlsZW92ZXJ2aWV3IGFubm90YXRpb25zLCB0aGlzXG4gICAgLy8gc3RhdGVtZW50IHdvdWxkIGJlIGEgbm9vcC5cbiAgICBjb25zdCBmaWxlb3ZlcnZpZXdBbmNob3JTdG10ID0gdHMuY3JlYXRlTm90RW1pdHRlZFN0YXRlbWVudChzZik7XG4gICAgc2Yuc3RhdGVtZW50cyA9IHRzLmNyZWF0ZU5vZGVBcnJheShcbiAgICAgICAgW2ZpbGVvdmVydmlld0FuY2hvclN0bXQsIC4uLmV4aXN0aW5nSW1wb3J0cywgLi4uYWRkZWRJbXBvcnRzLCAuLi5leHRyYVN0YXRlbWVudHMsIC4uLmJvZHldKTtcbiAgfVxuXG4gIHJldHVybiBzZjtcbn1cblxuZnVuY3Rpb24gaXNJbXBvcnRTdGF0ZW1lbnQoc3RtdDogdHMuU3RhdGVtZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiB0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpIHx8IHRzLmlzSW1wb3J0RXF1YWxzRGVjbGFyYXRpb24oc3RtdCkgfHxcbiAgICAgIHRzLmlzTmFtZXNwYWNlSW1wb3J0KHN0bXQpO1xufVxuIl19