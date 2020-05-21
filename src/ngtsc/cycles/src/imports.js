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
        define("@angular/compiler-cli/src/ngtsc/cycles/src/imports", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ImportGraph = void 0;
    var ts = require("typescript");
    /**
     * A cached graph of imports in the `ts.Program`.
     *
     * The `ImportGraph` keeps track of dependencies (imports) of individual `ts.SourceFile`s. Only
     * dependencies within the same program are tracked; imports into packages on NPM are not.
     */
    var ImportGraph = /** @class */ (function () {
        function ImportGraph(resolver) {
            this.resolver = resolver;
            this.map = new Map();
        }
        /**
         * List the direct (not transitive) imports of a given `ts.SourceFile`.
         *
         * This operation is cached.
         */
        ImportGraph.prototype.importsOf = function (sf) {
            if (!this.map.has(sf)) {
                this.map.set(sf, this.scanImports(sf));
            }
            return this.map.get(sf);
        };
        /**
         * Lists the transitive imports of a given `ts.SourceFile`.
         */
        ImportGraph.prototype.transitiveImportsOf = function (sf) {
            var imports = new Set();
            this.transitiveImportsOfHelper(sf, imports);
            return imports;
        };
        ImportGraph.prototype.transitiveImportsOfHelper = function (sf, results) {
            var _this = this;
            if (results.has(sf)) {
                return;
            }
            results.add(sf);
            this.importsOf(sf).forEach(function (imported) {
                _this.transitiveImportsOfHelper(imported, results);
            });
        };
        /**
         * Add a record of an import from `sf` to `imported`, that's not present in the original
         * `ts.Program` but will be remembered by the `ImportGraph`.
         */
        ImportGraph.prototype.addSyntheticImport = function (sf, imported) {
            if (isLocalFile(imported)) {
                this.importsOf(sf).add(imported);
            }
        };
        ImportGraph.prototype.scanImports = function (sf) {
            var _this = this;
            var imports = new Set();
            // Look through the source file for import statements.
            sf.statements.forEach(function (stmt) {
                if ((ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt)) &&
                    stmt.moduleSpecifier !== undefined && ts.isStringLiteral(stmt.moduleSpecifier)) {
                    // Resolve the module to a file, and check whether that file is in the ts.Program.
                    var moduleName = stmt.moduleSpecifier.text;
                    var moduleFile = _this.resolver.resolveModule(moduleName, sf.fileName);
                    if (moduleFile !== null && isLocalFile(moduleFile)) {
                        // Record this local import.
                        imports.add(moduleFile);
                    }
                }
            });
            return imports;
        };
        return ImportGraph;
    }());
    exports.ImportGraph = ImportGraph;
    function isLocalFile(sf) {
        return !sf.fileName.endsWith('.d.ts');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY3ljbGVzL3NyYy9pbXBvcnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUlqQzs7Ozs7T0FLRztJQUNIO1FBR0UscUJBQW9CLFFBQXdCO1lBQXhCLGFBQVEsR0FBUixRQUFRLENBQWdCO1lBRnBDLFFBQUcsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztRQUVaLENBQUM7UUFFaEQ7Ozs7V0FJRztRQUNILCtCQUFTLEdBQVQsVUFBVSxFQUFpQjtZQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDeEM7WUFDRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRSxDQUFDO1FBQzNCLENBQUM7UUFFRDs7V0FFRztRQUNILHlDQUFtQixHQUFuQixVQUFvQixFQUFpQjtZQUNuQyxJQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUN6QyxJQUFJLENBQUMseUJBQXlCLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFFTywrQ0FBeUIsR0FBakMsVUFBa0MsRUFBaUIsRUFBRSxPQUEyQjtZQUFoRixpQkFRQztZQVBDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDbkIsT0FBTzthQUNSO1lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLFFBQVE7Z0JBQ2pDLEtBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQ7OztXQUdHO1FBQ0gsd0NBQWtCLEdBQWxCLFVBQW1CLEVBQWlCLEVBQUUsUUFBdUI7WUFDM0QsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ2xDO1FBQ0gsQ0FBQztRQUVPLGlDQUFXLEdBQW5CLFVBQW9CLEVBQWlCO1lBQXJDLGlCQWdCQztZQWZDLElBQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBQ3pDLHNEQUFzRDtZQUN0RCxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUk7Z0JBQ3hCLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUM5RCxJQUFJLENBQUMsZUFBZSxLQUFLLFNBQVMsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRTtvQkFDbEYsa0ZBQWtGO29CQUNsRixJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztvQkFDN0MsSUFBTSxVQUFVLEdBQUcsS0FBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDeEUsSUFBSSxVQUFVLEtBQUssSUFBSSxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsRUFBRTt3QkFDbEQsNEJBQTRCO3dCQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO3FCQUN6QjtpQkFDRjtZQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQS9ERCxJQStEQztJQS9EWSxrQ0FBVztJQWlFeEIsU0FBUyxXQUFXLENBQUMsRUFBaUI7UUFDcEMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcblxuLyoqXG4gKiBBIGNhY2hlZCBncmFwaCBvZiBpbXBvcnRzIGluIHRoZSBgdHMuUHJvZ3JhbWAuXG4gKlxuICogVGhlIGBJbXBvcnRHcmFwaGAga2VlcHMgdHJhY2sgb2YgZGVwZW5kZW5jaWVzIChpbXBvcnRzKSBvZiBpbmRpdmlkdWFsIGB0cy5Tb3VyY2VGaWxlYHMuIE9ubHlcbiAqIGRlcGVuZGVuY2llcyB3aXRoaW4gdGhlIHNhbWUgcHJvZ3JhbSBhcmUgdHJhY2tlZDsgaW1wb3J0cyBpbnRvIHBhY2thZ2VzIG9uIE5QTSBhcmUgbm90LlxuICovXG5leHBvcnQgY2xhc3MgSW1wb3J0R3JhcGgge1xuICBwcml2YXRlIG1hcCA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgU2V0PHRzLlNvdXJjZUZpbGU+PigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVzb2x2ZXI6IE1vZHVsZVJlc29sdmVyKSB7fVxuXG4gIC8qKlxuICAgKiBMaXN0IHRoZSBkaXJlY3QgKG5vdCB0cmFuc2l0aXZlKSBpbXBvcnRzIG9mIGEgZ2l2ZW4gYHRzLlNvdXJjZUZpbGVgLlxuICAgKlxuICAgKiBUaGlzIG9wZXJhdGlvbiBpcyBjYWNoZWQuXG4gICAqL1xuICBpbXBvcnRzT2Yoc2Y6IHRzLlNvdXJjZUZpbGUpOiBTZXQ8dHMuU291cmNlRmlsZT4ge1xuICAgIGlmICghdGhpcy5tYXAuaGFzKHNmKSkge1xuICAgICAgdGhpcy5tYXAuc2V0KHNmLCB0aGlzLnNjYW5JbXBvcnRzKHNmKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1hcC5nZXQoc2YpITtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyB0aGUgdHJhbnNpdGl2ZSBpbXBvcnRzIG9mIGEgZ2l2ZW4gYHRzLlNvdXJjZUZpbGVgLlxuICAgKi9cbiAgdHJhbnNpdGl2ZUltcG9ydHNPZihzZjogdHMuU291cmNlRmlsZSk6IFNldDx0cy5Tb3VyY2VGaWxlPiB7XG4gICAgY29uc3QgaW1wb3J0cyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcbiAgICB0aGlzLnRyYW5zaXRpdmVJbXBvcnRzT2ZIZWxwZXIoc2YsIGltcG9ydHMpO1xuICAgIHJldHVybiBpbXBvcnRzO1xuICB9XG5cbiAgcHJpdmF0ZSB0cmFuc2l0aXZlSW1wb3J0c09mSGVscGVyKHNmOiB0cy5Tb3VyY2VGaWxlLCByZXN1bHRzOiBTZXQ8dHMuU291cmNlRmlsZT4pOiB2b2lkIHtcbiAgICBpZiAocmVzdWx0cy5oYXMoc2YpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlc3VsdHMuYWRkKHNmKTtcbiAgICB0aGlzLmltcG9ydHNPZihzZikuZm9yRWFjaChpbXBvcnRlZCA9PiB7XG4gICAgICB0aGlzLnRyYW5zaXRpdmVJbXBvcnRzT2ZIZWxwZXIoaW1wb3J0ZWQsIHJlc3VsdHMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHJlY29yZCBvZiBhbiBpbXBvcnQgZnJvbSBgc2ZgIHRvIGBpbXBvcnRlZGAsIHRoYXQncyBub3QgcHJlc2VudCBpbiB0aGUgb3JpZ2luYWxcbiAgICogYHRzLlByb2dyYW1gIGJ1dCB3aWxsIGJlIHJlbWVtYmVyZWQgYnkgdGhlIGBJbXBvcnRHcmFwaGAuXG4gICAqL1xuICBhZGRTeW50aGV0aWNJbXBvcnQoc2Y6IHRzLlNvdXJjZUZpbGUsIGltcG9ydGVkOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKGlzTG9jYWxGaWxlKGltcG9ydGVkKSkge1xuICAgICAgdGhpcy5pbXBvcnRzT2Yoc2YpLmFkZChpbXBvcnRlZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzY2FuSW1wb3J0cyhzZjogdHMuU291cmNlRmlsZSk6IFNldDx0cy5Tb3VyY2VGaWxlPiB7XG4gICAgY29uc3QgaW1wb3J0cyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcbiAgICAvLyBMb29rIHRocm91Z2ggdGhlIHNvdXJjZSBmaWxlIGZvciBpbXBvcnQgc3RhdGVtZW50cy5cbiAgICBzZi5zdGF0ZW1lbnRzLmZvckVhY2goc3RtdCA9PiB7XG4gICAgICBpZiAoKHRzLmlzSW1wb3J0RGVjbGFyYXRpb24oc3RtdCkgfHwgdHMuaXNFeHBvcnREZWNsYXJhdGlvbihzdG10KSkgJiZcbiAgICAgICAgICBzdG10Lm1vZHVsZVNwZWNpZmllciAhPT0gdW5kZWZpbmVkICYmIHRzLmlzU3RyaW5nTGl0ZXJhbChzdG10Lm1vZHVsZVNwZWNpZmllcikpIHtcbiAgICAgICAgLy8gUmVzb2x2ZSB0aGUgbW9kdWxlIHRvIGEgZmlsZSwgYW5kIGNoZWNrIHdoZXRoZXIgdGhhdCBmaWxlIGlzIGluIHRoZSB0cy5Qcm9ncmFtLlxuICAgICAgICBjb25zdCBtb2R1bGVOYW1lID0gc3RtdC5tb2R1bGVTcGVjaWZpZXIudGV4dDtcbiAgICAgICAgY29uc3QgbW9kdWxlRmlsZSA9IHRoaXMucmVzb2x2ZXIucmVzb2x2ZU1vZHVsZShtb2R1bGVOYW1lLCBzZi5maWxlTmFtZSk7XG4gICAgICAgIGlmIChtb2R1bGVGaWxlICE9PSBudWxsICYmIGlzTG9jYWxGaWxlKG1vZHVsZUZpbGUpKSB7XG4gICAgICAgICAgLy8gUmVjb3JkIHRoaXMgbG9jYWwgaW1wb3J0LlxuICAgICAgICAgIGltcG9ydHMuYWRkKG1vZHVsZUZpbGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGltcG9ydHM7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNMb2NhbEZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgcmV0dXJuICFzZi5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKTtcbn1cbiJdfQ==