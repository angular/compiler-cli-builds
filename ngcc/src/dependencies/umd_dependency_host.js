(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", ["require", "exports", "typescript", "@angular/compiler-cli/ngcc/src/host/umd_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var umd_host_1 = require("@angular/compiler-cli/ngcc/src/host/umd_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    /**
     * Helper functions for computing dependencies.
     */
    var UmdDependencyHost = /** @class */ (function () {
        function UmdDependencyHost(fs, moduleResolver) {
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
        UmdDependencyHost.prototype.findDependencies = function (entryPointPath) {
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
        UmdDependencyHost.prototype.recursivelyFindDependencies = function (file, dependencies, missing, deepImports, alreadySeen) {
            var _this = this;
            var fromContents = this.fs.readFile(file);
            if (!this.hasRequireCalls(fromContents)) {
                // Avoid parsing the source file as there are no require calls.
                return;
            }
            // Parse the source into a TypeScript AST and then walk it looking for imports and re-exports.
            var sf = ts.createSourceFile(file, fromContents, ts.ScriptTarget.ES2015, false, ts.ScriptKind.JS);
            if (sf.statements.length !== 1) {
                return;
            }
            var umdModule = umd_host_1.parseStatementForUmdModule(sf.statements[0]);
            var umdImports = umdModule && umd_host_1.getImportsOfUmdModule(umdModule);
            if (umdImports === null) {
                return;
            }
            umdImports.forEach(function (umdImport) {
                var resolvedModule = _this.moduleResolver.resolveModuleImport(umdImport.path, file);
                if (resolvedModule) {
                    if (resolvedModule instanceof module_resolver_1.ResolvedRelativeModule) {
                        var internalDependency = resolvedModule.modulePath;
                        if (!alreadySeen.has(internalDependency)) {
                            alreadySeen.add(internalDependency);
                            _this.recursivelyFindDependencies(internalDependency, dependencies, missing, deepImports, alreadySeen);
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
                    missing.add(umdImport.path);
                }
            });
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
        UmdDependencyHost.prototype.hasRequireCalls = function (source) { return /require\(['"]/.test(source); };
        return UmdDependencyHost;
    }());
    exports.UmdDependencyHost = UmdDependencyHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX2RlcGVuZGVuY3lfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUlqQyx5RUFBbUY7SUFHbkYsK0ZBQTZGO0lBSTdGOztPQUVHO0lBQ0g7UUFDRSwyQkFBb0IsRUFBYyxFQUFVLGNBQThCO1lBQXRELE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFBRyxDQUFDO1FBRTlFOzs7Ozs7V0FNRztRQUNILDRDQUFnQixHQUFoQixVQUFpQixjQUE4QjtZQUM3QyxJQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUMvQyxJQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1lBQ2xDLElBQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFDdEMsSUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7WUFDOUMsSUFBSSxDQUFDLDJCQUEyQixDQUM1QixjQUFjLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDckUsT0FBTyxFQUFDLFlBQVksY0FBQSxFQUFFLE9BQU8sU0FBQSxFQUFFLFdBQVcsYUFBQSxFQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7V0FZRztRQUNLLHVEQUEyQixHQUFuQyxVQUNJLElBQW9CLEVBQUUsWUFBaUMsRUFBRSxPQUFvQixFQUM3RSxXQUF3QixFQUFFLFdBQWdDO1lBRjlELGlCQTJDQztZQXhDQyxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDdkMsK0RBQStEO2dCQUMvRCxPQUFPO2FBQ1I7WUFFRCw4RkFBOEY7WUFDOUYsSUFBTSxFQUFFLEdBQ0osRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0YsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzlCLE9BQU87YUFDUjtZQUVELElBQU0sU0FBUyxHQUFHLHFDQUEwQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvRCxJQUFNLFVBQVUsR0FBRyxTQUFTLElBQUksZ0NBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDakUsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUN2QixPQUFPO2FBQ1I7WUFFRCxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUEsU0FBUztnQkFDMUIsSUFBTSxjQUFjLEdBQUcsS0FBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNyRixJQUFJLGNBQWMsRUFBRTtvQkFDbEIsSUFBSSxjQUFjLFlBQVksd0NBQXNCLEVBQUU7d0JBQ3BELElBQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQzt3QkFDckQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRTs0QkFDeEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDOzRCQUNwQyxLQUFJLENBQUMsMkJBQTJCLENBQzVCLGtCQUFrQixFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO3lCQUMxRTtxQkFDRjt5QkFBTTt3QkFDTCxJQUFJLGNBQWMsWUFBWSxvQ0FBa0IsRUFBRTs0QkFDaEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7eUJBQzVDOzZCQUFNOzRCQUNMLFlBQVksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO3lCQUNqRDtxQkFDRjtpQkFDRjtxQkFBTTtvQkFDTCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDN0I7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRDs7Ozs7Ozs7O1dBU0c7UUFDSCwyQ0FBZSxHQUFmLFVBQWdCLE1BQWMsSUFBYSxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLHdCQUFDO0lBQUQsQ0FBQyxBQXpGRCxJQXlGQztJQXpGWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi9maWxlX3N5c3RlbS9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2dldEltcG9ydHNPZlVtZE1vZHVsZSwgcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGV9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuXG5pbXBvcnQge0RlcGVuZGVuY3lIb3N0LCBEZXBlbmRlbmN5SW5mb30gZnJvbSAnLi9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVSZXNvbHZlciwgUmVzb2x2ZWREZWVwSW1wb3J0LCBSZXNvbHZlZFJlbGF0aXZlTW9kdWxlfSBmcm9tICcuL21vZHVsZV9yZXNvbHZlcic7XG5cblxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbnMgZm9yIGNvbXB1dGluZyBkZXBlbmRlbmNpZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBVbWREZXBlbmRlbmN5SG9zdCBpbXBsZW1lbnRzIERlcGVuZGVuY3lIb3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXIpIHt9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRoZSBkZXBlbmRlbmNpZXMgZm9yIHRoZSBlbnRyeS1wb2ludCBhdCB0aGUgZ2l2ZW4gcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIGVudHJ5UG9pbnRQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBKYXZhU2NyaXB0IGZpbGUgdGhhdCByZXByZXNlbnRzIGFuIGVudHJ5LXBvaW50LlxuICAgKiBAcmV0dXJucyBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBlbnRyeS1wb2ludCwgaW5jbHVkaW5nIHRob3NlIHRoYXQgd2VyZVxuICAgKiBtaXNzaW5nIG9yIGRlZXAgaW1wb3J0cyBpbnRvIG90aGVyIGVudHJ5LXBvaW50cy5cbiAgICovXG4gIGZpbmREZXBlbmRlbmNpZXMoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRGVwZW5kZW5jeUluZm8ge1xuICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgY29uc3QgbWlzc2luZyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGRlZXBJbXBvcnRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgYWxyZWFkeVNlZW4gPSBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpO1xuICAgIHRoaXMucmVjdXJzaXZlbHlGaW5kRGVwZW5kZW5jaWVzKFxuICAgICAgICBlbnRyeVBvaW50UGF0aCwgZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0cywgYWxyZWFkeVNlZW4pO1xuICAgIHJldHVybiB7ZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0c307XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBnaXZlbiBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZmlsZSBBbiBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBmaWxlIHdob3NlIGRlcGVuZGVuY2llcyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIGRlcGVuZGVuY2llcyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgYWJzb2x1dGUgcGF0aHMgb2YgcmVzb2x2ZWQgZW50cnkgcG9pbnRzIGFkZGVkIHRvXG4gICAqIGl0LlxuICAgKiBAcGFyYW0gbWlzc2luZyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgZGVwZW5kZW5jaWVzIHRoYXQgY291bGQgbm90IGJlIGZvdW5kIGFkZGVkIHRvIGl0LlxuICAgKiBAcGFyYW0gZGVlcEltcG9ydHMgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGltcG9ydCBwYXRocyB0aGF0IGV4aXN0IGJ1dCBjYW5ub3QgYmUgbWFwcGVkIHRvXG4gICAqIGVudHJ5LXBvaW50cywgaS5lLiBkZWVwLWltcG9ydHMuXG4gICAqIEBwYXJhbSBhbHJlYWR5U2VlbiBBIHNldCB0aGF0IGlzIHVzZWQgdG8gdHJhY2sgaW50ZXJuYWwgZGVwZW5kZW5jaWVzIHRvIHByZXZlbnQgZ2V0dGluZyBzdHVja1xuICAgKiBpbiBhXG4gICAqIGNpcmN1bGFyIGRlcGVuZGVuY3kgbG9vcC5cbiAgICovXG4gIHByaXZhdGUgcmVjdXJzaXZlbHlGaW5kRGVwZW5kZW5jaWVzKFxuICAgICAgZmlsZTogQWJzb2x1dGVGc1BhdGgsIGRlcGVuZGVuY2llczogU2V0PEFic29sdXRlRnNQYXRoPiwgbWlzc2luZzogU2V0PHN0cmluZz4sXG4gICAgICBkZWVwSW1wb3J0czogU2V0PHN0cmluZz4sIGFscmVhZHlTZWVuOiBTZXQ8QWJzb2x1dGVGc1BhdGg+KTogdm9pZCB7XG4gICAgY29uc3QgZnJvbUNvbnRlbnRzID0gdGhpcy5mcy5yZWFkRmlsZShmaWxlKTtcbiAgICBpZiAoIXRoaXMuaGFzUmVxdWlyZUNhbGxzKGZyb21Db250ZW50cykpIHtcbiAgICAgIC8vIEF2b2lkIHBhcnNpbmcgdGhlIHNvdXJjZSBmaWxlIGFzIHRoZXJlIGFyZSBubyByZXF1aXJlIGNhbGxzLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHRoZSBzb3VyY2UgaW50byBhIFR5cGVTY3JpcHQgQVNUIGFuZCB0aGVuIHdhbGsgaXQgbG9va2luZyBmb3IgaW1wb3J0cyBhbmQgcmUtZXhwb3J0cy5cbiAgICBjb25zdCBzZiA9XG4gICAgICAgIHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZSwgZnJvbUNvbnRlbnRzLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1LCBmYWxzZSwgdHMuU2NyaXB0S2luZC5KUyk7XG4gICAgaWYgKHNmLnN0YXRlbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdW1kTW9kdWxlID0gcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc2Yuc3RhdGVtZW50c1swXSk7XG4gICAgY29uc3QgdW1kSW1wb3J0cyA9IHVtZE1vZHVsZSAmJiBnZXRJbXBvcnRzT2ZVbWRNb2R1bGUodW1kTW9kdWxlKTtcbiAgICBpZiAodW1kSW1wb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHVtZEltcG9ydHMuZm9yRWFjaCh1bWRJbXBvcnQgPT4ge1xuICAgICAgY29uc3QgcmVzb2x2ZWRNb2R1bGUgPSB0aGlzLm1vZHVsZVJlc29sdmVyLnJlc29sdmVNb2R1bGVJbXBvcnQodW1kSW1wb3J0LnBhdGgsIGZpbGUpO1xuICAgICAgaWYgKHJlc29sdmVkTW9kdWxlKSB7XG4gICAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSBpbnN0YW5jZW9mIFJlc29sdmVkUmVsYXRpdmVNb2R1bGUpIHtcbiAgICAgICAgICBjb25zdCBpbnRlcm5hbERlcGVuZGVuY3kgPSByZXNvbHZlZE1vZHVsZS5tb2R1bGVQYXRoO1xuICAgICAgICAgIGlmICghYWxyZWFkeVNlZW4uaGFzKGludGVybmFsRGVwZW5kZW5jeSkpIHtcbiAgICAgICAgICAgIGFscmVhZHlTZWVuLmFkZChpbnRlcm5hbERlcGVuZGVuY3kpO1xuICAgICAgICAgICAgdGhpcy5yZWN1cnNpdmVseUZpbmREZXBlbmRlbmNpZXMoXG4gICAgICAgICAgICAgICAgaW50ZXJuYWxEZXBlbmRlbmN5LCBkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzLCBhbHJlYWR5U2Vlbik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSBpbnN0YW5jZW9mIFJlc29sdmVkRGVlcEltcG9ydCkge1xuICAgICAgICAgICAgZGVlcEltcG9ydHMuYWRkKHJlc29sdmVkTW9kdWxlLmltcG9ydFBhdGgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZXBlbmRlbmNpZXMuYWRkKHJlc29sdmVkTW9kdWxlLmVudHJ5UG9pbnRQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1pc3NpbmcuYWRkKHVtZEltcG9ydC5wYXRoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGEgc291cmNlIGZpbGUgbmVlZHMgdG8gYmUgcGFyc2VkIGZvciBpbXBvcnRzLlxuICAgKiBUaGlzIGlzIGEgcGVyZm9ybWFuY2Ugc2hvcnQtY2lyY3VpdCwgd2hpY2ggc2F2ZXMgdXMgZnJvbSBjcmVhdGluZ1xuICAgKiBhIFR5cGVTY3JpcHQgQVNUIHVubmVjZXNzYXJpbHkuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2UgVGhlIGNvbnRlbnQgb2YgdGhlIHNvdXJjZSBmaWxlIHRvIGNoZWNrLlxuICAgKlxuICAgKiBAcmV0dXJucyBmYWxzZSBpZiB0aGVyZSBhcmUgZGVmaW5pdGVseSBubyByZXF1aXJlIGNhbGxzXG4gICAqIGluIHRoaXMgZmlsZSwgdHJ1ZSBvdGhlcndpc2UuXG4gICAqL1xuICBoYXNSZXF1aXJlQ2FsbHMoc291cmNlOiBzdHJpbmcpOiBib29sZWFuIHsgcmV0dXJuIC9yZXF1aXJlXFwoWydcIl0vLnRlc3Qoc291cmNlKTsgfVxufVxuIl19