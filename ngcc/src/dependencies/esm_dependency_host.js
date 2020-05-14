(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/ngcc/src/dependencies/dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isStringImportOrReexport = exports.hasImportOrReexportStatements = exports.EsmDependencyHost = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    /**
     * Helper functions for computing dependencies.
     */
    var EsmDependencyHost = /** @class */ (function (_super) {
        tslib_1.__extends(EsmDependencyHost, _super);
        function EsmDependencyHost() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Compute the dependencies of the given file.
         *
         * @param file An absolute path to the file whose dependencies we want to get.
         * @param dependencies A set that will have the absolute paths of resolved entry points added to
         * it.
         * @param missing A set that will have the dependencies that could not be found added to it.
         * @param deepImports A set that will have the import paths that exist but cannot be mapped to
         * entry-points, i.e. deep-imports.
         * @param alreadySeen A set that is used to track internal dependencies to prevent getting stuck
         * in a circular dependency loop.
         */
        EsmDependencyHost.prototype.recursivelyCollectDependencies = function (file, dependencies, missing, deepImports, alreadySeen) {
            var _this = this;
            var fromContents = this.fs.readFile(file);
            if (!hasImportOrReexportStatements(fromContents)) {
                // Avoid parsing the source file as there are no imports.
                return;
            }
            // Parse the source into a TypeScript AST and then walk it looking for imports and re-exports.
            var sf = ts.createSourceFile(file, fromContents, ts.ScriptTarget.ES2015, false, ts.ScriptKind.JS);
            sf.statements
                // filter out statements that are not imports or reexports
                .filter(isStringImportOrReexport)
                // Grab the id of the module that is being imported
                .map(function (stmt) { return stmt.moduleSpecifier.text; })
                .forEach(function (importPath) {
                var resolved = _this.processImport(importPath, file, dependencies, missing, deepImports, alreadySeen);
                if (!resolved) {
                    missing.add(importPath);
                }
            });
        };
        /**
         * Resolve the given `importPath` from `file` and add it to the appropriate set.
         *
         * @returns `true` if the import was resolved (to an entry-point, a local import, or a
         * deep-import).
         */
        EsmDependencyHost.prototype.processImport = function (importPath, file, dependencies, missing, deepImports, alreadySeen) {
            var resolvedModule = this.moduleResolver.resolveModuleImport(importPath, file);
            if (resolvedModule === null) {
                return false;
            }
            if (resolvedModule instanceof module_resolver_1.ResolvedRelativeModule) {
                var internalDependency = resolvedModule.modulePath;
                if (!alreadySeen.has(internalDependency)) {
                    alreadySeen.add(internalDependency);
                    this.recursivelyCollectDependencies(internalDependency, dependencies, missing, deepImports, alreadySeen);
                }
            }
            else if (resolvedModule instanceof module_resolver_1.ResolvedDeepImport) {
                deepImports.add(resolvedModule.importPath);
            }
            else {
                dependencies.add(resolvedModule.entryPointPath);
            }
            return true;
        };
        return EsmDependencyHost;
    }(dependency_host_1.DependencyHostBase));
    exports.EsmDependencyHost = EsmDependencyHost;
    /**
     * Check whether a source file needs to be parsed for imports.
     * This is a performance short-circuit, which saves us from creating
     * a TypeScript AST unnecessarily.
     *
     * @param source The content of the source file to check.
     *
     * @returns false if there are definitely no import or re-export statements
     * in this file, true otherwise.
     */
    function hasImportOrReexportStatements(source) {
        return /(import|export)\s.+from/.test(source);
    }
    exports.hasImportOrReexportStatements = hasImportOrReexportStatements;
    /**
     * Check whether the given statement is an import with a string literal module specifier.
     * @param stmt the statement node to check.
     * @returns true if the statement is an import with a string literal module specifier.
     */
    function isStringImportOrReexport(stmt) {
        return ts.isImportDeclaration(stmt) ||
            ts.isExportDeclaration(stmt) && !!stmt.moduleSpecifier &&
                ts.isStringLiteral(stmt.moduleSpecifier);
    }
    exports.isStringImportOrReexport = isStringImportOrReexport;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtX2RlcGVuZGVuY3lfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLCtGQUFxRDtJQUNyRCwrRkFBNkU7SUFFN0U7O09BRUc7SUFDSDtRQUF1Qyw2Q0FBa0I7UUFBekQ7O1FBbUVBLENBQUM7UUFsRUM7Ozs7Ozs7Ozs7O1dBV0c7UUFDTywwREFBOEIsR0FBeEMsVUFDSSxJQUFvQixFQUFFLFlBQWlDLEVBQUUsT0FBb0IsRUFDN0UsV0FBd0IsRUFBRSxXQUFnQztZQUY5RCxpQkF5QkM7WUF0QkMsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFNUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNoRCx5REFBeUQ7Z0JBQ3pELE9BQU87YUFDUjtZQUVELDhGQUE4RjtZQUM5RixJQUFNLEVBQUUsR0FDSixFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM3RixFQUFFLENBQUMsVUFBVTtnQkFDVCwwREFBMEQ7aUJBQ3pELE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQztnQkFDakMsbURBQW1EO2lCQUNsRCxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBekIsQ0FBeUIsQ0FBQztpQkFDdEMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDakIsSUFBTSxRQUFRLEdBQ1YsS0FBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUMxRixJQUFJLENBQUMsUUFBUSxFQUFFO29CQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7aUJBQ3pCO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDVCxDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDTyx5Q0FBYSxHQUF2QixVQUNJLFVBQWtCLEVBQUUsSUFBb0IsRUFBRSxZQUFpQyxFQUMzRSxPQUFvQixFQUFFLFdBQXdCLEVBQUUsV0FBZ0M7WUFDbEYsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakYsSUFBSSxjQUFjLEtBQUssSUFBSSxFQUFFO2dCQUMzQixPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsSUFBSSxjQUFjLFlBQVksd0NBQXNCLEVBQUU7Z0JBQ3BELElBQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQztnQkFDckQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRTtvQkFDeEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO29CQUNwQyxJQUFJLENBQUMsOEJBQThCLENBQy9CLGtCQUFrQixFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2lCQUMxRTthQUNGO2lCQUFNLElBQUksY0FBYyxZQUFZLG9DQUFrQixFQUFFO2dCQUN2RCxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUM1QztpQkFBTTtnQkFDTCxZQUFZLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQzthQUNqRDtZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQW5FRCxDQUF1QyxvQ0FBa0IsR0FtRXhEO0lBbkVZLDhDQUFpQjtJQXFFOUI7Ozs7Ozs7OztPQVNHO0lBQ0gsU0FBZ0IsNkJBQTZCLENBQUMsTUFBYztRQUMxRCxPQUFPLHlCQUF5QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRkQsc0VBRUM7SUFHRDs7OztPQUlHO0lBQ0gsU0FBZ0Isd0JBQXdCLENBQUMsSUFBa0I7UUFFekQsT0FBTyxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDO1lBQy9CLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWU7Z0JBQ3RELEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFMRCw0REFLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVwZW5kZW5jeUhvc3RCYXNlfSBmcm9tICcuL2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge1Jlc29sdmVkRGVlcEltcG9ydCwgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZX0gZnJvbSAnLi9tb2R1bGVfcmVzb2x2ZXInO1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbnMgZm9yIGNvbXB1dGluZyBkZXBlbmRlbmNpZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBFc21EZXBlbmRlbmN5SG9zdCBleHRlbmRzIERlcGVuZGVuY3lIb3N0QmFzZSB7XG4gIC8qKlxuICAgKiBDb21wdXRlIHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlIGdpdmVuIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlIEFuIGFic29sdXRlIHBhdGggdG8gdGhlIGZpbGUgd2hvc2UgZGVwZW5kZW5jaWVzIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzIEEgc2V0IHRoYXQgd2lsbCBoYXZlIHRoZSBhYnNvbHV0ZSBwYXRocyBvZiByZXNvbHZlZCBlbnRyeSBwb2ludHMgYWRkZWQgdG9cbiAgICogaXQuXG4gICAqIEBwYXJhbSBtaXNzaW5nIEEgc2V0IHRoYXQgd2lsbCBoYXZlIHRoZSBkZXBlbmRlbmNpZXMgdGhhdCBjb3VsZCBub3QgYmUgZm91bmQgYWRkZWQgdG8gaXQuXG4gICAqIEBwYXJhbSBkZWVwSW1wb3J0cyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgaW1wb3J0IHBhdGhzIHRoYXQgZXhpc3QgYnV0IGNhbm5vdCBiZSBtYXBwZWQgdG9cbiAgICogZW50cnktcG9pbnRzLCBpLmUuIGRlZXAtaW1wb3J0cy5cbiAgICogQHBhcmFtIGFscmVhZHlTZWVuIEEgc2V0IHRoYXQgaXMgdXNlZCB0byB0cmFjayBpbnRlcm5hbCBkZXBlbmRlbmNpZXMgdG8gcHJldmVudCBnZXR0aW5nIHN0dWNrXG4gICAqIGluIGEgY2lyY3VsYXIgZGVwZW5kZW5jeSBsb29wLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlY3Vyc2l2ZWx5Q29sbGVjdERlcGVuZGVuY2llcyhcbiAgICAgIGZpbGU6IEFic29sdXRlRnNQYXRoLCBkZXBlbmRlbmNpZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD4sIG1pc3Npbmc6IFNldDxzdHJpbmc+LFxuICAgICAgZGVlcEltcG9ydHM6IFNldDxzdHJpbmc+LCBhbHJlYWR5U2VlbjogU2V0PEFic29sdXRlRnNQYXRoPik6IHZvaWQge1xuICAgIGNvbnN0IGZyb21Db250ZW50cyA9IHRoaXMuZnMucmVhZEZpbGUoZmlsZSk7XG5cbiAgICBpZiAoIWhhc0ltcG9ydE9yUmVleHBvcnRTdGF0ZW1lbnRzKGZyb21Db250ZW50cykpIHtcbiAgICAgIC8vIEF2b2lkIHBhcnNpbmcgdGhlIHNvdXJjZSBmaWxlIGFzIHRoZXJlIGFyZSBubyBpbXBvcnRzLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHRoZSBzb3VyY2UgaW50byBhIFR5cGVTY3JpcHQgQVNUIGFuZCB0aGVuIHdhbGsgaXQgbG9va2luZyBmb3IgaW1wb3J0cyBhbmQgcmUtZXhwb3J0cy5cbiAgICBjb25zdCBzZiA9XG4gICAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZSwgZnJvbUNvbnRlbnRzLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1LCBmYWxzZSwgdHMuU2NyaXB0S2luZC5KUyk7XG4gICAgc2Yuc3RhdGVtZW50c1xuICAgICAgICAvLyBmaWx0ZXIgb3V0IHN0YXRlbWVudHMgdGhhdCBhcmUgbm90IGltcG9ydHMgb3IgcmVleHBvcnRzXG4gICAgICAgIC5maWx0ZXIoaXNTdHJpbmdJbXBvcnRPclJlZXhwb3J0KVxuICAgICAgICAvLyBHcmFiIHRoZSBpZCBvZiB0aGUgbW9kdWxlIHRoYXQgaXMgYmVpbmcgaW1wb3J0ZWRcbiAgICAgICAgLm1hcChzdG10ID0+IHN0bXQubW9kdWxlU3BlY2lmaWVyLnRleHQpXG4gICAgICAgIC5mb3JFYWNoKGltcG9ydFBhdGggPT4ge1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkID1cbiAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzSW1wb3J0KGltcG9ydFBhdGgsIGZpbGUsIGRlcGVuZGVuY2llcywgbWlzc2luZywgZGVlcEltcG9ydHMsIGFscmVhZHlTZWVuKTtcbiAgICAgICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgICAgICBtaXNzaW5nLmFkZChpbXBvcnRQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc29sdmUgdGhlIGdpdmVuIGBpbXBvcnRQYXRoYCBmcm9tIGBmaWxlYCBhbmQgYWRkIGl0IHRvIHRoZSBhcHByb3ByaWF0ZSBzZXQuXG4gICAqXG4gICAqIEByZXR1cm5zIGB0cnVlYCBpZiB0aGUgaW1wb3J0IHdhcyByZXNvbHZlZCAodG8gYW4gZW50cnktcG9pbnQsIGEgbG9jYWwgaW1wb3J0LCBvciBhXG4gICAqIGRlZXAtaW1wb3J0KS5cbiAgICovXG4gIHByb3RlY3RlZCBwcm9jZXNzSW1wb3J0KFxuICAgICAgaW1wb3J0UGF0aDogc3RyaW5nLCBmaWxlOiBBYnNvbHV0ZUZzUGF0aCwgZGVwZW5kZW5jaWVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LFxuICAgICAgbWlzc2luZzogU2V0PHN0cmluZz4sIGRlZXBJbXBvcnRzOiBTZXQ8c3RyaW5nPiwgYWxyZWFkeVNlZW46IFNldDxBYnNvbHV0ZUZzUGF0aD4pOiBib29sZWFuIHtcbiAgICBjb25zdCByZXNvbHZlZE1vZHVsZSA9IHRoaXMubW9kdWxlUmVzb2x2ZXIucmVzb2x2ZU1vZHVsZUltcG9ydChpbXBvcnRQYXRoLCBmaWxlKTtcbiAgICBpZiAocmVzb2x2ZWRNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHJlc29sdmVkTW9kdWxlIGluc3RhbmNlb2YgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZSkge1xuICAgICAgY29uc3QgaW50ZXJuYWxEZXBlbmRlbmN5ID0gcmVzb2x2ZWRNb2R1bGUubW9kdWxlUGF0aDtcbiAgICAgIGlmICghYWxyZWFkeVNlZW4uaGFzKGludGVybmFsRGVwZW5kZW5jeSkpIHtcbiAgICAgICAgYWxyZWFkeVNlZW4uYWRkKGludGVybmFsRGVwZW5kZW5jeSk7XG4gICAgICAgIHRoaXMucmVjdXJzaXZlbHlDb2xsZWN0RGVwZW5kZW5jaWVzKFxuICAgICAgICAgICAgaW50ZXJuYWxEZXBlbmRlbmN5LCBkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzLCBhbHJlYWR5U2Vlbik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyZXNvbHZlZE1vZHVsZSBpbnN0YW5jZW9mIFJlc29sdmVkRGVlcEltcG9ydCkge1xuICAgICAgZGVlcEltcG9ydHMuYWRkKHJlc29sdmVkTW9kdWxlLmltcG9ydFBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZXBlbmRlbmNpZXMuYWRkKHJlc29sdmVkTW9kdWxlLmVudHJ5UG9pbnRQYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGEgc291cmNlIGZpbGUgbmVlZHMgdG8gYmUgcGFyc2VkIGZvciBpbXBvcnRzLlxuICogVGhpcyBpcyBhIHBlcmZvcm1hbmNlIHNob3J0LWNpcmN1aXQsIHdoaWNoIHNhdmVzIHVzIGZyb20gY3JlYXRpbmdcbiAqIGEgVHlwZVNjcmlwdCBBU1QgdW5uZWNlc3NhcmlseS5cbiAqXG4gKiBAcGFyYW0gc291cmNlIFRoZSBjb250ZW50IG9mIHRoZSBzb3VyY2UgZmlsZSB0byBjaGVjay5cbiAqXG4gKiBAcmV0dXJucyBmYWxzZSBpZiB0aGVyZSBhcmUgZGVmaW5pdGVseSBubyBpbXBvcnQgb3IgcmUtZXhwb3J0IHN0YXRlbWVudHNcbiAqIGluIHRoaXMgZmlsZSwgdHJ1ZSBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNJbXBvcnRPclJlZXhwb3J0U3RhdGVtZW50cyhzb3VyY2U6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gLyhpbXBvcnR8ZXhwb3J0KVxccy4rZnJvbS8udGVzdChzb3VyY2UpO1xufVxuXG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gc3RhdGVtZW50IGlzIGFuIGltcG9ydCB3aXRoIGEgc3RyaW5nIGxpdGVyYWwgbW9kdWxlIHNwZWNpZmllci5cbiAqIEBwYXJhbSBzdG10IHRoZSBzdGF0ZW1lbnQgbm9kZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHN0YXRlbWVudCBpcyBhbiBpbXBvcnQgd2l0aCBhIHN0cmluZyBsaXRlcmFsIG1vZHVsZSBzcGVjaWZpZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZ0ltcG9ydE9yUmVleHBvcnQoc3RtdDogdHMuU3RhdGVtZW50KTogc3RtdCBpcyB0cy5JbXBvcnREZWNsYXJhdGlvbiZcbiAgICB7bW9kdWxlU3BlY2lmaWVyOiB0cy5TdHJpbmdMaXRlcmFsfSB7XG4gIHJldHVybiB0cy5pc0ltcG9ydERlY2xhcmF0aW9uKHN0bXQpIHx8XG4gICAgICB0cy5pc0V4cG9ydERlY2xhcmF0aW9uKHN0bXQpICYmICEhc3RtdC5tb2R1bGVTcGVjaWZpZXIgJiZcbiAgICAgIHRzLmlzU3RyaW5nTGl0ZXJhbChzdG10Lm1vZHVsZVNwZWNpZmllcik7XG59XG4iXX0=