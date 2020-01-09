(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils", "@angular/compiler-cli/ngcc/src/dependencies/dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver"], factory);
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
    var commonjs_umd_utils_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_umd_utils");
    var dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    /**
     * Helper functions for computing dependencies.
     */
    var CommonJsDependencyHost = /** @class */ (function (_super) {
        tslib_1.__extends(CommonJsDependencyHost, _super);
        function CommonJsDependencyHost() {
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
        CommonJsDependencyHost.prototype.recursivelyCollectDependencies = function (file, dependencies, missing, deepImports, alreadySeen) {
            var e_1, _a, e_2, _b;
            var fromContents = this.fs.readFile(file);
            if (!this.hasRequireCalls(fromContents)) {
                // Avoid parsing the source file as there are no imports.
                return;
            }
            // Parse the source into a TypeScript AST and then walk it looking for imports and re-exports.
            var sf = ts.createSourceFile(file, fromContents, ts.ScriptTarget.ES2015, false, ts.ScriptKind.JS);
            try {
                for (var _c = tslib_1.__values(sf.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var statement = _d.value;
                    var declarations = ts.isVariableStatement(statement) ? statement.declarationList.declarations : [];
                    try {
                        for (var declarations_1 = (e_2 = void 0, tslib_1.__values(declarations)), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                            var declaration = declarations_1_1.value;
                            if (declaration.initializer && commonjs_umd_utils_1.isRequireCall(declaration.initializer)) {
                                var importPath = declaration.initializer.arguments[0].text;
                                var resolvedModule = this.moduleResolver.resolveModuleImport(importPath, file);
                                if (resolvedModule) {
                                    if (resolvedModule instanceof module_resolver_1.ResolvedRelativeModule) {
                                        var internalDependency = resolvedModule.modulePath;
                                        if (!alreadySeen.has(internalDependency)) {
                                            alreadySeen.add(internalDependency);
                                            this.recursivelyCollectDependencies(internalDependency, dependencies, missing, deepImports, alreadySeen);
                                        }
                                    }
                                    else {
                                        if (resolvedModule instanceof module_resolver_1.ResolvedDeepImport) {
                                            deepImports.add(resolvedModule.importPath);
                                        }
                                        else {
                                            dependencies.add(resolvedModule.entryPointPath);
                                        }
                                    }
                                }
                                else {
                                    missing.add(importPath);
                                }
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (declarations_1_1 && !declarations_1_1.done && (_b = declarations_1.return)) _b.call(declarations_1);
                        }
                        finally { if (e_2) throw e_2.error; }
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
        };
        /**
         * Check whether a source file needs to be parsed for imports.
         * This is a performance short-circuit, which saves us from creating
         * a TypeScript AST unnecessarily.
         *
         * @param source The content of the source file to check.
         *
         * @returns false if there are definitely no require calls
         * in this file, true otherwise.
         */
        CommonJsDependencyHost.prototype.hasRequireCalls = function (source) { return /require\(['"]/.test(source); };
        return CommonJsDependencyHost;
    }(dependency_host_1.DependencyHostBase));
    exports.CommonJsDependencyHost = CommonJsDependencyHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDZGQUF5RDtJQUN6RCwrRkFBcUQ7SUFDckQsK0ZBQTZFO0lBRTdFOztPQUVHO0lBQ0g7UUFBNEMsa0RBQWtCO1FBQTlEOztRQW9FQSxDQUFDO1FBbkVDOzs7Ozs7Ozs7OztXQVdHO1FBQ08sK0RBQThCLEdBQXhDLFVBQ0ksSUFBb0IsRUFBRSxZQUFpQyxFQUFFLE9BQW9CLEVBQzdFLFdBQWdDLEVBQUUsV0FBZ0M7O1lBQ3BFLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTVDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUN2Qyx5REFBeUQ7Z0JBQ3pELE9BQU87YUFDUjtZQUVELDhGQUE4RjtZQUM5RixJQUFNLEVBQUUsR0FDSixFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7Z0JBRTdGLEtBQXdCLElBQUEsS0FBQSxpQkFBQSxFQUFFLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFsQyxJQUFNLFNBQVMsV0FBQTtvQkFDbEIsSUFBTSxZQUFZLEdBQ2QsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDOzt3QkFDcEYsS0FBMEIsSUFBQSxnQ0FBQSxpQkFBQSxZQUFZLENBQUEsQ0FBQSwwQ0FBQSxvRUFBRTs0QkFBbkMsSUFBTSxXQUFXLHlCQUFBOzRCQUNwQixJQUFJLFdBQVcsQ0FBQyxXQUFXLElBQUksa0NBQWEsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0NBQ3JFLElBQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQ0FDN0QsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0NBQ2pGLElBQUksY0FBYyxFQUFFO29DQUNsQixJQUFJLGNBQWMsWUFBWSx3Q0FBc0IsRUFBRTt3Q0FDcEQsSUFBTSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDO3dDQUNyRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFOzRDQUN4QyxXQUFXLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7NENBQ3BDLElBQUksQ0FBQyw4QkFBOEIsQ0FDL0Isa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7eUNBQzFFO3FDQUNGO3lDQUFNO3dDQUNMLElBQUksY0FBYyxZQUFZLG9DQUFrQixFQUFFOzRDQUNoRCxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQzt5Q0FDNUM7NkNBQU07NENBQ0wsWUFBWSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7eUNBQ2pEO3FDQUNGO2lDQUNGO3FDQUFNO29DQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7aUNBQ3pCOzZCQUNGO3lCQUNGOzs7Ozs7Ozs7aUJBQ0Y7Ozs7Ozs7OztRQUNILENBQUM7UUFFRDs7Ozs7Ozs7O1dBU0c7UUFDSyxnREFBZSxHQUF2QixVQUF3QixNQUFjLElBQWEsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRiw2QkFBQztJQUFELENBQUMsQUFwRUQsQ0FBNEMsb0NBQWtCLEdBb0U3RDtJQXBFWSx3REFBc0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2lzUmVxdWlyZUNhbGx9IGZyb20gJy4uL2hvc3QvY29tbW9uanNfdW1kX3V0aWxzJztcbmltcG9ydCB7RGVwZW5kZW5jeUhvc3RCYXNlfSBmcm9tICcuL2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge1Jlc29sdmVkRGVlcEltcG9ydCwgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZX0gZnJvbSAnLi9tb2R1bGVfcmVzb2x2ZXInO1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbnMgZm9yIGNvbXB1dGluZyBkZXBlbmRlbmNpZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21tb25Kc0RlcGVuZGVuY3lIb3N0IGV4dGVuZHMgRGVwZW5kZW5jeUhvc3RCYXNlIHtcbiAgLyoqXG4gICAqIENvbXB1dGUgdGhlIGRlcGVuZGVuY2llcyBvZiB0aGUgZ2l2ZW4gZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGZpbGUgQW4gYWJzb2x1dGUgcGF0aCB0byB0aGUgZmlsZSB3aG9zZSBkZXBlbmRlbmNpZXMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEBwYXJhbSBkZXBlbmRlbmNpZXMgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGFic29sdXRlIHBhdGhzIG9mIHJlc29sdmVkIGVudHJ5IHBvaW50cyBhZGRlZCB0b1xuICAgKiBpdC5cbiAgICogQHBhcmFtIG1pc3NpbmcgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGRlcGVuZGVuY2llcyB0aGF0IGNvdWxkIG5vdCBiZSBmb3VuZCBhZGRlZCB0byBpdC5cbiAgICogQHBhcmFtIGRlZXBJbXBvcnRzIEEgc2V0IHRoYXQgd2lsbCBoYXZlIHRoZSBpbXBvcnQgcGF0aHMgdGhhdCBleGlzdCBidXQgY2Fubm90IGJlIG1hcHBlZCB0b1xuICAgKiBlbnRyeS1wb2ludHMsIGkuZS4gZGVlcC1pbXBvcnRzLlxuICAgKiBAcGFyYW0gYWxyZWFkeVNlZW4gQSBzZXQgdGhhdCBpcyB1c2VkIHRvIHRyYWNrIGludGVybmFsIGRlcGVuZGVuY2llcyB0byBwcmV2ZW50IGdldHRpbmcgc3R1Y2tcbiAgICogaW4gYSBjaXJjdWxhciBkZXBlbmRlbmN5IGxvb3AuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVjdXJzaXZlbHlDb2xsZWN0RGVwZW5kZW5jaWVzKFxuICAgICAgZmlsZTogQWJzb2x1dGVGc1BhdGgsIGRlcGVuZGVuY2llczogU2V0PEFic29sdXRlRnNQYXRoPiwgbWlzc2luZzogU2V0PHN0cmluZz4sXG4gICAgICBkZWVwSW1wb3J0czogU2V0PEFic29sdXRlRnNQYXRoPiwgYWxyZWFkeVNlZW46IFNldDxBYnNvbHV0ZUZzUGF0aD4pOiB2b2lkIHtcbiAgICBjb25zdCBmcm9tQ29udGVudHMgPSB0aGlzLmZzLnJlYWRGaWxlKGZpbGUpO1xuXG4gICAgaWYgKCF0aGlzLmhhc1JlcXVpcmVDYWxscyhmcm9tQ29udGVudHMpKSB7XG4gICAgICAvLyBBdm9pZCBwYXJzaW5nIHRoZSBzb3VyY2UgZmlsZSBhcyB0aGVyZSBhcmUgbm8gaW1wb3J0cy5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSB0aGUgc291cmNlIGludG8gYSBUeXBlU2NyaXB0IEFTVCBhbmQgdGhlbiB3YWxrIGl0IGxvb2tpbmcgZm9yIGltcG9ydHMgYW5kIHJlLWV4cG9ydHMuXG4gICAgY29uc3Qgc2YgPVxuICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUsIGZyb21Db250ZW50cywgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSwgZmFsc2UsIHRzLlNjcmlwdEtpbmQuSlMpO1xuXG4gICAgZm9yIChjb25zdCBzdGF0ZW1lbnQgb2Ygc2Yuc3RhdGVtZW50cykge1xuICAgICAgY29uc3QgZGVjbGFyYXRpb25zID1cbiAgICAgICAgICB0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkgPyBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucyA6IFtdO1xuICAgICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBkZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyICYmIGlzUmVxdWlyZUNhbGwoZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpKSB7XG4gICAgICAgICAgY29uc3QgaW1wb3J0UGF0aCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyLmFyZ3VtZW50c1swXS50ZXh0O1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID0gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlSW1wb3J0KGltcG9ydFBhdGgsIGZpbGUpO1xuICAgICAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICAgICAgaWYgKHJlc29sdmVkTW9kdWxlIGluc3RhbmNlb2YgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZSkge1xuICAgICAgICAgICAgICBjb25zdCBpbnRlcm5hbERlcGVuZGVuY3kgPSByZXNvbHZlZE1vZHVsZS5tb2R1bGVQYXRoO1xuICAgICAgICAgICAgICBpZiAoIWFscmVhZHlTZWVuLmhhcyhpbnRlcm5hbERlcGVuZGVuY3kpKSB7XG4gICAgICAgICAgICAgICAgYWxyZWFkeVNlZW4uYWRkKGludGVybmFsRGVwZW5kZW5jeSk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWN1cnNpdmVseUNvbGxlY3REZXBlbmRlbmNpZXMoXG4gICAgICAgICAgICAgICAgICAgIGludGVybmFsRGVwZW5kZW5jeSwgZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0cywgYWxyZWFkeVNlZW4pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAocmVzb2x2ZWRNb2R1bGUgaW5zdGFuY2VvZiBSZXNvbHZlZERlZXBJbXBvcnQpIHtcbiAgICAgICAgICAgICAgICBkZWVwSW1wb3J0cy5hZGQocmVzb2x2ZWRNb2R1bGUuaW1wb3J0UGF0aCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLmFkZChyZXNvbHZlZE1vZHVsZS5lbnRyeVBvaW50UGF0aCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWlzc2luZy5hZGQoaW1wb3J0UGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYSBzb3VyY2UgZmlsZSBuZWVkcyB0byBiZSBwYXJzZWQgZm9yIGltcG9ydHMuXG4gICAqIFRoaXMgaXMgYSBwZXJmb3JtYW5jZSBzaG9ydC1jaXJjdWl0LCB3aGljaCBzYXZlcyB1cyBmcm9tIGNyZWF0aW5nXG4gICAqIGEgVHlwZVNjcmlwdCBBU1QgdW5uZWNlc3NhcmlseS5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZSBUaGUgY29udGVudCBvZiB0aGUgc291cmNlIGZpbGUgdG8gY2hlY2suXG4gICAqXG4gICAqIEByZXR1cm5zIGZhbHNlIGlmIHRoZXJlIGFyZSBkZWZpbml0ZWx5IG5vIHJlcXVpcmUgY2FsbHNcbiAgICogaW4gdGhpcyBmaWxlLCB0cnVlIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgaGFzUmVxdWlyZUNhbGxzKHNvdXJjZTogc3RyaW5nKTogYm9vbGVhbiB7IHJldHVybiAvcmVxdWlyZVxcKFsnXCJdLy50ZXN0KHNvdXJjZSk7IH1cbn1cbiJdfQ==