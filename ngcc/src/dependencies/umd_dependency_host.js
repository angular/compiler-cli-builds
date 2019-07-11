(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", ["require", "exports", "typescript", "@angular/compiler-cli/ngcc/src/host/umd_host", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver"], factory);
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
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
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
            var resolvedFile = utils_1.resolveFileWithPostfixes(this.fs, file, ['', '.js', '/index.js']);
            if (resolvedFile === null) {
                return;
            }
            var fromContents = this.fs.readFile(resolvedFile);
            if (!this.hasRequireCalls(fromContents)) {
                // Avoid parsing the source file as there are no require calls.
                return;
            }
            // Parse the source into a TypeScript AST and then walk it looking for imports and re-exports.
            var sf = ts.createSourceFile(resolvedFile, fromContents, ts.ScriptTarget.ES2015, false, ts.ScriptKind.JS);
            if (sf.statements.length !== 1) {
                return;
            }
            var umdModule = umd_host_1.parseStatementForUmdModule(sf.statements[0]);
            var umdImports = umdModule && umd_host_1.getImportsOfUmdModule(umdModule);
            if (umdImports === null) {
                return;
            }
            umdImports.forEach(function (umdImport) {
                var resolvedModule = _this.moduleResolver.resolveModuleImport(umdImport.path, resolvedFile);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX2RlcGVuZGVuY3lfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdqQyx5RUFBbUY7SUFDbkYsOERBQWtEO0lBR2xELCtGQUE2RjtJQUc3Rjs7T0FFRztJQUNIO1FBQ0UsMkJBQW9CLEVBQWMsRUFBVSxjQUE4QjtZQUF0RCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQUcsQ0FBQztRQUU5RTs7Ozs7O1dBTUc7UUFDSCw0Q0FBZ0IsR0FBaEIsVUFBaUIsY0FBOEI7WUFDN0MsSUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7WUFDL0MsSUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7WUFDdEQsSUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7WUFDOUMsSUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7WUFDOUMsSUFBSSxDQUFDLDJCQUEyQixDQUM1QixjQUFjLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDckUsT0FBTyxFQUFDLFlBQVksY0FBQSxFQUFFLE9BQU8sU0FBQSxFQUFFLFdBQVcsYUFBQSxFQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVEOzs7Ozs7Ozs7Ozs7V0FZRztRQUNLLHVEQUEyQixHQUFuQyxVQUNJLElBQW9CLEVBQUUsWUFBaUMsRUFBRSxPQUFvQixFQUM3RSxXQUF3QixFQUFFLFdBQWdDO1lBRjlELGlCQWdEQztZQTdDQyxJQUFNLFlBQVksR0FBRyxnQ0FBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN2RixJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7Z0JBQ3pCLE9BQU87YUFDUjtZQUVELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3BELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUN2QywrREFBK0Q7Z0JBQy9ELE9BQU87YUFDUjtZQUVELDhGQUE4RjtZQUM5RixJQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQzFCLFlBQVksRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDakYsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzlCLE9BQU87YUFDUjtZQUVELElBQU0sU0FBUyxHQUFHLHFDQUEwQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvRCxJQUFNLFVBQVUsR0FBRyxTQUFTLElBQUksZ0NBQXFCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDakUsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO2dCQUN2QixPQUFPO2FBQ1I7WUFFRCxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUEsU0FBUztnQkFDMUIsSUFBTSxjQUFjLEdBQUcsS0FBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO2dCQUM3RixJQUFJLGNBQWMsRUFBRTtvQkFDbEIsSUFBSSxjQUFjLFlBQVksd0NBQXNCLEVBQUU7d0JBQ3BELElBQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQzt3QkFDckQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRTs0QkFDeEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDOzRCQUNwQyxLQUFJLENBQUMsMkJBQTJCLENBQzVCLGtCQUFrQixFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO3lCQUMxRTtxQkFDRjt5QkFBTTt3QkFDTCxJQUFJLGNBQWMsWUFBWSxvQ0FBa0IsRUFBRTs0QkFDaEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7eUJBQzVDOzZCQUFNOzRCQUNMLFlBQVksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO3lCQUNqRDtxQkFDRjtpQkFDRjtxQkFBTTtvQkFDTCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDN0I7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRDs7Ozs7Ozs7O1dBU0c7UUFDSCwyQ0FBZSxHQUFmLFVBQWdCLE1BQWMsSUFBYSxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25GLHdCQUFDO0lBQUQsQ0FBQyxBQTlGRCxJQThGQztJQTlGWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2dldEltcG9ydHNPZlVtZE1vZHVsZSwgcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGV9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuaW1wb3J0IHtyZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXN9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtEZXBlbmRlbmN5SG9zdCwgRGVwZW5kZW5jeUluZm99IGZyb20gJy4vZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXIsIFJlc29sdmVkRGVlcEltcG9ydCwgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZX0gZnJvbSAnLi9tb2R1bGVfcmVzb2x2ZXInO1xuXG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9ucyBmb3IgY29tcHV0aW5nIGRlcGVuZGVuY2llcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFVtZERlcGVuZGVuY3lIb3N0IGltcGxlbWVudHMgRGVwZW5kZW5jeUhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcikge31cblxuICAvKipcbiAgICogRmluZCBhbGwgdGhlIGRlcGVuZGVuY2llcyBmb3IgdGhlIGVudHJ5LXBvaW50IGF0IHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gZW50cnlQb2ludFBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIEphdmFTY3JpcHQgZmlsZSB0aGF0IHJlcHJlc2VudHMgYW4gZW50cnktcG9pbnQuXG4gICAqIEByZXR1cm5zIEluZm9ybWF0aW9uIGFib3V0IHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlIGVudHJ5LXBvaW50LCBpbmNsdWRpbmcgdGhvc2UgdGhhdCB3ZXJlXG4gICAqIG1pc3Npbmcgb3IgZGVlcCBpbXBvcnRzIGludG8gb3RoZXIgZW50cnktcG9pbnRzLlxuICAgKi9cbiAgZmluZERlcGVuZGVuY2llcyhlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBEZXBlbmRlbmN5SW5mbyB7XG4gICAgY29uc3QgZGVwZW5kZW5jaWVzID0gbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKTtcbiAgICBjb25zdCBtaXNzaW5nID0gbmV3IFNldDxBYnNvbHV0ZUZzUGF0aHxQYXRoU2VnbWVudD4oKTtcbiAgICBjb25zdCBkZWVwSW1wb3J0cyA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgY29uc3QgYWxyZWFkeVNlZW4gPSBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpO1xuICAgIHRoaXMucmVjdXJzaXZlbHlGaW5kRGVwZW5kZW5jaWVzKFxuICAgICAgICBlbnRyeVBvaW50UGF0aCwgZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0cywgYWxyZWFkeVNlZW4pO1xuICAgIHJldHVybiB7ZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0c307XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBnaXZlbiBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZmlsZSBBbiBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBmaWxlIHdob3NlIGRlcGVuZGVuY2llcyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIGRlcGVuZGVuY2llcyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgYWJzb2x1dGUgcGF0aHMgb2YgcmVzb2x2ZWQgZW50cnkgcG9pbnRzIGFkZGVkIHRvXG4gICAqIGl0LlxuICAgKiBAcGFyYW0gbWlzc2luZyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgZGVwZW5kZW5jaWVzIHRoYXQgY291bGQgbm90IGJlIGZvdW5kIGFkZGVkIHRvIGl0LlxuICAgKiBAcGFyYW0gZGVlcEltcG9ydHMgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGltcG9ydCBwYXRocyB0aGF0IGV4aXN0IGJ1dCBjYW5ub3QgYmUgbWFwcGVkIHRvXG4gICAqIGVudHJ5LXBvaW50cywgaS5lLiBkZWVwLWltcG9ydHMuXG4gICAqIEBwYXJhbSBhbHJlYWR5U2VlbiBBIHNldCB0aGF0IGlzIHVzZWQgdG8gdHJhY2sgaW50ZXJuYWwgZGVwZW5kZW5jaWVzIHRvIHByZXZlbnQgZ2V0dGluZyBzdHVja1xuICAgKiBpbiBhXG4gICAqIGNpcmN1bGFyIGRlcGVuZGVuY3kgbG9vcC5cbiAgICovXG4gIHByaXZhdGUgcmVjdXJzaXZlbHlGaW5kRGVwZW5kZW5jaWVzKFxuICAgICAgZmlsZTogQWJzb2x1dGVGc1BhdGgsIGRlcGVuZGVuY2llczogU2V0PEFic29sdXRlRnNQYXRoPiwgbWlzc2luZzogU2V0PHN0cmluZz4sXG4gICAgICBkZWVwSW1wb3J0czogU2V0PHN0cmluZz4sIGFscmVhZHlTZWVuOiBTZXQ8QWJzb2x1dGVGc1BhdGg+KTogdm9pZCB7XG4gICAgY29uc3QgcmVzb2x2ZWRGaWxlID0gcmVzb2x2ZUZpbGVXaXRoUG9zdGZpeGVzKHRoaXMuZnMsIGZpbGUsIFsnJywgJy5qcycsICcvaW5kZXguanMnXSk7XG4gICAgaWYgKHJlc29sdmVkRmlsZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGZyb21Db250ZW50cyA9IHRoaXMuZnMucmVhZEZpbGUocmVzb2x2ZWRGaWxlKTtcbiAgICBpZiAoIXRoaXMuaGFzUmVxdWlyZUNhbGxzKGZyb21Db250ZW50cykpIHtcbiAgICAgIC8vIEF2b2lkIHBhcnNpbmcgdGhlIHNvdXJjZSBmaWxlIGFzIHRoZXJlIGFyZSBubyByZXF1aXJlIGNhbGxzLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHRoZSBzb3VyY2UgaW50byBhIFR5cGVTY3JpcHQgQVNUIGFuZCB0aGVuIHdhbGsgaXQgbG9va2luZyBmb3IgaW1wb3J0cyBhbmQgcmUtZXhwb3J0cy5cbiAgICBjb25zdCBzZiA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAgIHJlc29sdmVkRmlsZSwgZnJvbUNvbnRlbnRzLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1LCBmYWxzZSwgdHMuU2NyaXB0S2luZC5KUyk7XG4gICAgaWYgKHNmLnN0YXRlbWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdW1kTW9kdWxlID0gcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGUoc2Yuc3RhdGVtZW50c1swXSk7XG4gICAgY29uc3QgdW1kSW1wb3J0cyA9IHVtZE1vZHVsZSAmJiBnZXRJbXBvcnRzT2ZVbWRNb2R1bGUodW1kTW9kdWxlKTtcbiAgICBpZiAodW1kSW1wb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHVtZEltcG9ydHMuZm9yRWFjaCh1bWRJbXBvcnQgPT4ge1xuICAgICAgY29uc3QgcmVzb2x2ZWRNb2R1bGUgPSB0aGlzLm1vZHVsZVJlc29sdmVyLnJlc29sdmVNb2R1bGVJbXBvcnQodW1kSW1wb3J0LnBhdGgsIHJlc29sdmVkRmlsZSk7XG4gICAgICBpZiAocmVzb2x2ZWRNb2R1bGUpIHtcbiAgICAgICAgaWYgKHJlc29sdmVkTW9kdWxlIGluc3RhbmNlb2YgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZSkge1xuICAgICAgICAgIGNvbnN0IGludGVybmFsRGVwZW5kZW5jeSA9IHJlc29sdmVkTW9kdWxlLm1vZHVsZVBhdGg7XG4gICAgICAgICAgaWYgKCFhbHJlYWR5U2Vlbi5oYXMoaW50ZXJuYWxEZXBlbmRlbmN5KSkge1xuICAgICAgICAgICAgYWxyZWFkeVNlZW4uYWRkKGludGVybmFsRGVwZW5kZW5jeSk7XG4gICAgICAgICAgICB0aGlzLnJlY3Vyc2l2ZWx5RmluZERlcGVuZGVuY2llcyhcbiAgICAgICAgICAgICAgICBpbnRlcm5hbERlcGVuZGVuY3ksIGRlcGVuZGVuY2llcywgbWlzc2luZywgZGVlcEltcG9ydHMsIGFscmVhZHlTZWVuKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHJlc29sdmVkTW9kdWxlIGluc3RhbmNlb2YgUmVzb2x2ZWREZWVwSW1wb3J0KSB7XG4gICAgICAgICAgICBkZWVwSW1wb3J0cy5hZGQocmVzb2x2ZWRNb2R1bGUuaW1wb3J0UGF0aCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlcGVuZGVuY2llcy5hZGQocmVzb2x2ZWRNb2R1bGUuZW50cnlQb2ludFBhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWlzc2luZy5hZGQodW1kSW1wb3J0LnBhdGgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYSBzb3VyY2UgZmlsZSBuZWVkcyB0byBiZSBwYXJzZWQgZm9yIGltcG9ydHMuXG4gICAqIFRoaXMgaXMgYSBwZXJmb3JtYW5jZSBzaG9ydC1jaXJjdWl0LCB3aGljaCBzYXZlcyB1cyBmcm9tIGNyZWF0aW5nXG4gICAqIGEgVHlwZVNjcmlwdCBBU1QgdW5uZWNlc3NhcmlseS5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZSBUaGUgY29udGVudCBvZiB0aGUgc291cmNlIGZpbGUgdG8gY2hlY2suXG4gICAqXG4gICAqIEByZXR1cm5zIGZhbHNlIGlmIHRoZXJlIGFyZSBkZWZpbml0ZWx5IG5vIHJlcXVpcmUgY2FsbHNcbiAgICogaW4gdGhpcyBmaWxlLCB0cnVlIG90aGVyd2lzZS5cbiAgICovXG4gIGhhc1JlcXVpcmVDYWxscyhzb3VyY2U6IHN0cmluZyk6IGJvb2xlYW4geyByZXR1cm4gL3JlcXVpcmVcXChbJ1wiXS8udGVzdChzb3VyY2UpOyB9XG59XG4iXX0=