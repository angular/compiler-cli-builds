(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/ngcc/src/host/commonjs_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver"], factory);
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
    var commonjs_host_1 = require("@angular/compiler-cli/ngcc/src/host/commonjs_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    /**
     * Helper functions for computing dependencies.
     */
    var CommonJsDependencyHost = /** @class */ (function () {
        function CommonJsDependencyHost(fs, moduleResolver) {
            this.fs = fs;
            this.moduleResolver = moduleResolver;
        }
        /**
         * Find all the dependencies for the entry-point at the given path.
         *
         * @param entryPointPath The absolute path to the JavaScript file that represents an entry-point.
         * @returns Information about the dependencies of the entry-point, including those that were
         * missing or deep imports into other entry-points.
         */
        CommonJsDependencyHost.prototype.findDependencies = function (entryPointPath) {
            var dependencies = new Set();
            var missing = new Set();
            var deepImports = new Set();
            var alreadySeen = new Set();
            this.recursivelyFindDependencies(entryPointPath, dependencies, missing, deepImports, alreadySeen);
            return { dependencies: dependencies, missing: missing, deepImports: deepImports };
        };
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
         * in a
         * circular dependency loop.
         */
        CommonJsDependencyHost.prototype.recursivelyFindDependencies = function (file, dependencies, missing, deepImports, alreadySeen) {
            var e_1, _a, e_2, _b;
            var fromContents = this.fs.readFile(file);
            if (!this.hasRequireCalls(fromContents)) {
                // Avoid parsing the source file as there are no require calls.
                return;
            }
            // Parse the source into a TypeScript AST and then walk it looking for imports and re-exports.
            var sf = ts.createSourceFile(file, fromContents, ts.ScriptTarget.ES2015, false, ts.ScriptKind.JS);
            try {
                for (var _c = tslib_1.__values(sf.statements), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var statement = _d.value;
                    var declarations = ts.isVariableStatement(statement) ? statement.declarationList.declarations : [];
                    try {
                        for (var declarations_1 = tslib_1.__values(declarations), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                            var declaration = declarations_1_1.value;
                            if (declaration.initializer && commonjs_host_1.isRequireCall(declaration.initializer)) {
                                var importPath = declaration.initializer.arguments[0].text;
                                var resolvedModule = this.moduleResolver.resolveModuleImport(importPath, file);
                                if (resolvedModule) {
                                    if (resolvedModule instanceof module_resolver_1.ResolvedRelativeModule) {
                                        var internalDependency = resolvedModule.modulePath;
                                        if (!alreadySeen.has(internalDependency)) {
                                            alreadySeen.add(internalDependency);
                                            this.recursivelyFindDependencies(internalDependency, dependencies, missing, deepImports, alreadySeen);
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
    }());
    exports.CommonJsDependencyHost = CommonJsDependencyHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBSWpDLG1GQUFvRDtJQUdwRCwrRkFBNkY7SUFFN0Y7O09BRUc7SUFDSDtRQUNFLGdDQUFvQixFQUFjLEVBQVUsY0FBOEI7WUFBdEQsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUFHLENBQUM7UUFFOUU7Ozs7OztXQU1HO1FBQ0gsaURBQWdCLEdBQWhCLFVBQWlCLGNBQThCO1lBQzdDLElBQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQy9DLElBQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1lBQ3RELElBQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQzlDLElBQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQzlDLElBQUksQ0FBQywyQkFBMkIsQ0FDNUIsY0FBYyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3JFLE9BQU8sRUFBQyxZQUFZLGNBQUEsRUFBRSxPQUFPLFNBQUEsRUFBRSxXQUFXLGFBQUEsRUFBQyxDQUFDO1FBQzlDLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7O1dBWUc7UUFDSyw0REFBMkIsR0FBbkMsVUFDSSxJQUFvQixFQUFFLFlBQWlDLEVBQUUsT0FBb0IsRUFDN0UsV0FBZ0MsRUFBRSxXQUFnQzs7WUFDcEUsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQ3ZDLCtEQUErRDtnQkFDL0QsT0FBTzthQUNSO1lBRUQsOEZBQThGO1lBQzlGLElBQU0sRUFBRSxHQUNKLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDOztnQkFFN0YsS0FBd0IsSUFBQSxLQUFBLGlCQUFBLEVBQUUsQ0FBQyxVQUFVLENBQUEsZ0JBQUEsNEJBQUU7b0JBQWxDLElBQU0sU0FBUyxXQUFBO29CQUNsQixJQUFNLFlBQVksR0FDZCxFQUFFLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7O3dCQUNwRixLQUEwQixJQUFBLGlCQUFBLGlCQUFBLFlBQVksQ0FBQSwwQ0FBQSxvRUFBRTs0QkFBbkMsSUFBTSxXQUFXLHlCQUFBOzRCQUNwQixJQUFJLFdBQVcsQ0FBQyxXQUFXLElBQUksNkJBQWEsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0NBQ3JFLElBQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQ0FDN0QsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0NBQ2pGLElBQUksY0FBYyxFQUFFO29DQUNsQixJQUFJLGNBQWMsWUFBWSx3Q0FBc0IsRUFBRTt3Q0FDcEQsSUFBTSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDO3dDQUNyRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFOzRDQUN4QyxXQUFXLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7NENBQ3BDLElBQUksQ0FBQywyQkFBMkIsQ0FDNUIsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7eUNBQzFFO3FDQUNGO3lDQUFNO3dDQUNMLElBQUksY0FBYyxZQUFZLG9DQUFrQixFQUFFOzRDQUNoRCxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQzt5Q0FDNUM7NkNBQU07NENBQ0wsWUFBWSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7eUNBQ2pEO3FDQUNGO2lDQUNGO3FDQUFNO29DQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7aUNBQ3pCOzZCQUNGO3lCQUNGOzs7Ozs7Ozs7aUJBQ0Y7Ozs7Ozs7OztRQUNILENBQUM7UUFFRDs7Ozs7Ozs7O1dBU0c7UUFDSCxnREFBZSxHQUFmLFVBQWdCLE1BQWMsSUFBYSxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLDZCQUFDO0lBQUQsQ0FBQyxBQXZGRCxJQXVGQztJQXZGWSx3REFBc0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgUGF0aFNlZ21lbnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXRoJztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vZmlsZV9zeXN0ZW0vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtpc1JlcXVpcmVDYWxsfSBmcm9tICcuLi9ob3N0L2NvbW1vbmpzX2hvc3QnO1xuXG5pbXBvcnQge0RlcGVuZGVuY3lIb3N0LCBEZXBlbmRlbmN5SW5mb30gZnJvbSAnLi9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVSZXNvbHZlciwgUmVzb2x2ZWREZWVwSW1wb3J0LCBSZXNvbHZlZFJlbGF0aXZlTW9kdWxlfSBmcm9tICcuL21vZHVsZV9yZXNvbHZlcic7XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9ucyBmb3IgY29tcHV0aW5nIGRlcGVuZGVuY2llcy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbW1vbkpzRGVwZW5kZW5jeUhvc3QgaW1wbGVtZW50cyBEZXBlbmRlbmN5SG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbW9kdWxlUmVzb2x2ZXI6IE1vZHVsZVJlc29sdmVyKSB7fVxuXG4gIC8qKlxuICAgKiBGaW5kIGFsbCB0aGUgZGVwZW5kZW5jaWVzIGZvciB0aGUgZW50cnktcG9pbnQgYXQgdGhlIGdpdmVuIHBhdGguXG4gICAqXG4gICAqIEBwYXJhbSBlbnRyeVBvaW50UGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgSmF2YVNjcmlwdCBmaWxlIHRoYXQgcmVwcmVzZW50cyBhbiBlbnRyeS1wb2ludC5cbiAgICogQHJldHVybnMgSW5mb3JtYXRpb24gYWJvdXQgdGhlIGRlcGVuZGVuY2llcyBvZiB0aGUgZW50cnktcG9pbnQsIGluY2x1ZGluZyB0aG9zZSB0aGF0IHdlcmVcbiAgICogbWlzc2luZyBvciBkZWVwIGltcG9ydHMgaW50byBvdGhlciBlbnRyeS1wb2ludHMuXG4gICAqL1xuICBmaW5kRGVwZW5kZW5jaWVzKGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IERlcGVuZGVuY3lJbmZvIHtcbiAgICBjb25zdCBkZXBlbmRlbmNpZXMgPSBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpO1xuICAgIGNvbnN0IG1pc3NpbmcgPSBuZXcgU2V0PEFic29sdXRlRnNQYXRofFBhdGhTZWdtZW50PigpO1xuICAgIGNvbnN0IGRlZXBJbXBvcnRzID0gbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKTtcbiAgICBjb25zdCBhbHJlYWR5U2VlbiA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgdGhpcy5yZWN1cnNpdmVseUZpbmREZXBlbmRlbmNpZXMoXG4gICAgICAgIGVudHJ5UG9pbnRQYXRoLCBkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzLCBhbHJlYWR5U2Vlbik7XG4gICAgcmV0dXJuIHtkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlIGdpdmVuIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBmaWxlIEFuIGFic29sdXRlIHBhdGggdG8gdGhlIGZpbGUgd2hvc2UgZGVwZW5kZW5jaWVzIHdlIHdhbnQgdG8gZ2V0LlxuICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzIEEgc2V0IHRoYXQgd2lsbCBoYXZlIHRoZSBhYnNvbHV0ZSBwYXRocyBvZiByZXNvbHZlZCBlbnRyeSBwb2ludHMgYWRkZWQgdG9cbiAgICogaXQuXG4gICAqIEBwYXJhbSBtaXNzaW5nIEEgc2V0IHRoYXQgd2lsbCBoYXZlIHRoZSBkZXBlbmRlbmNpZXMgdGhhdCBjb3VsZCBub3QgYmUgZm91bmQgYWRkZWQgdG8gaXQuXG4gICAqIEBwYXJhbSBkZWVwSW1wb3J0cyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgaW1wb3J0IHBhdGhzIHRoYXQgZXhpc3QgYnV0IGNhbm5vdCBiZSBtYXBwZWQgdG9cbiAgICogZW50cnktcG9pbnRzLCBpLmUuIGRlZXAtaW1wb3J0cy5cbiAgICogQHBhcmFtIGFscmVhZHlTZWVuIEEgc2V0IHRoYXQgaXMgdXNlZCB0byB0cmFjayBpbnRlcm5hbCBkZXBlbmRlbmNpZXMgdG8gcHJldmVudCBnZXR0aW5nIHN0dWNrXG4gICAqIGluIGFcbiAgICogY2lyY3VsYXIgZGVwZW5kZW5jeSBsb29wLlxuICAgKi9cbiAgcHJpdmF0ZSByZWN1cnNpdmVseUZpbmREZXBlbmRlbmNpZXMoXG4gICAgICBmaWxlOiBBYnNvbHV0ZUZzUGF0aCwgZGVwZW5kZW5jaWVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LCBtaXNzaW5nOiBTZXQ8c3RyaW5nPixcbiAgICAgIGRlZXBJbXBvcnRzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LCBhbHJlYWR5U2VlbjogU2V0PEFic29sdXRlRnNQYXRoPik6IHZvaWQge1xuICAgIGNvbnN0IGZyb21Db250ZW50cyA9IHRoaXMuZnMucmVhZEZpbGUoZmlsZSk7XG4gICAgaWYgKCF0aGlzLmhhc1JlcXVpcmVDYWxscyhmcm9tQ29udGVudHMpKSB7XG4gICAgICAvLyBBdm9pZCBwYXJzaW5nIHRoZSBzb3VyY2UgZmlsZSBhcyB0aGVyZSBhcmUgbm8gcmVxdWlyZSBjYWxscy5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSB0aGUgc291cmNlIGludG8gYSBUeXBlU2NyaXB0IEFTVCBhbmQgdGhlbiB3YWxrIGl0IGxvb2tpbmcgZm9yIGltcG9ydHMgYW5kIHJlLWV4cG9ydHMuXG4gICAgY29uc3Qgc2YgPVxuICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUsIGZyb21Db250ZW50cywgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSwgZmFsc2UsIHRzLlNjcmlwdEtpbmQuSlMpO1xuXG4gICAgZm9yIChjb25zdCBzdGF0ZW1lbnQgb2Ygc2Yuc3RhdGVtZW50cykge1xuICAgICAgY29uc3QgZGVjbGFyYXRpb25zID1cbiAgICAgICAgICB0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0YXRlbWVudCkgPyBzdGF0ZW1lbnQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucyA6IFtdO1xuICAgICAgZm9yIChjb25zdCBkZWNsYXJhdGlvbiBvZiBkZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgaWYgKGRlY2xhcmF0aW9uLmluaXRpYWxpemVyICYmIGlzUmVxdWlyZUNhbGwoZGVjbGFyYXRpb24uaW5pdGlhbGl6ZXIpKSB7XG4gICAgICAgICAgY29uc3QgaW1wb3J0UGF0aCA9IGRlY2xhcmF0aW9uLmluaXRpYWxpemVyLmFyZ3VtZW50c1swXS50ZXh0O1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID0gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlSW1wb3J0KGltcG9ydFBhdGgsIGZpbGUpO1xuICAgICAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICAgICAgaWYgKHJlc29sdmVkTW9kdWxlIGluc3RhbmNlb2YgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZSkge1xuICAgICAgICAgICAgICBjb25zdCBpbnRlcm5hbERlcGVuZGVuY3kgPSByZXNvbHZlZE1vZHVsZS5tb2R1bGVQYXRoO1xuICAgICAgICAgICAgICBpZiAoIWFscmVhZHlTZWVuLmhhcyhpbnRlcm5hbERlcGVuZGVuY3kpKSB7XG4gICAgICAgICAgICAgICAgYWxyZWFkeVNlZW4uYWRkKGludGVybmFsRGVwZW5kZW5jeSk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWN1cnNpdmVseUZpbmREZXBlbmRlbmNpZXMoXG4gICAgICAgICAgICAgICAgICAgIGludGVybmFsRGVwZW5kZW5jeSwgZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0cywgYWxyZWFkeVNlZW4pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAocmVzb2x2ZWRNb2R1bGUgaW5zdGFuY2VvZiBSZXNvbHZlZERlZXBJbXBvcnQpIHtcbiAgICAgICAgICAgICAgICBkZWVwSW1wb3J0cy5hZGQocmVzb2x2ZWRNb2R1bGUuaW1wb3J0UGF0aCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLmFkZChyZXNvbHZlZE1vZHVsZS5lbnRyeVBvaW50UGF0aCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWlzc2luZy5hZGQoaW1wb3J0UGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYSBzb3VyY2UgZmlsZSBuZWVkcyB0byBiZSBwYXJzZWQgZm9yIGltcG9ydHMuXG4gICAqIFRoaXMgaXMgYSBwZXJmb3JtYW5jZSBzaG9ydC1jaXJjdWl0LCB3aGljaCBzYXZlcyB1cyBmcm9tIGNyZWF0aW5nXG4gICAqIGEgVHlwZVNjcmlwdCBBU1QgdW5uZWNlc3NhcmlseS5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZSBUaGUgY29udGVudCBvZiB0aGUgc291cmNlIGZpbGUgdG8gY2hlY2suXG4gICAqXG4gICAqIEByZXR1cm5zIGZhbHNlIGlmIHRoZXJlIGFyZSBkZWZpbml0ZWx5IG5vIHJlcXVpcmUgY2FsbHNcbiAgICogaW4gdGhpcyBmaWxlLCB0cnVlIG90aGVyd2lzZS5cbiAgICovXG4gIGhhc1JlcXVpcmVDYWxscyhzb3VyY2U6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gL3JlcXVpcmVcXChbJ1wiXS8udGVzdChzb3VyY2UpOyB9XG59XG4iXX0=