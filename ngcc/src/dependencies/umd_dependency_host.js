(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/ngcc/src/host/umd_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UmdDependencyHost = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var umd_host_1 = require("@angular/compiler-cli/ngcc/src/host/umd_host");
    var dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    /**
     * Helper functions for computing dependencies.
     */
    var UmdDependencyHost = /** @class */ (function (_super) {
        tslib_1.__extends(UmdDependencyHost, _super);
        function UmdDependencyHost() {
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
        UmdDependencyHost.prototype.recursivelyCollectDependencies = function (file, dependencies, missing, deepImports, alreadySeen) {
            var _this = this;
            var fromContents = this.fs.readFile(file);
            if (!this.hasRequireCalls(fromContents)) {
                // Avoid parsing the source file as there are no imports.
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
                            _this.recursivelyCollectDependencies(internalDependency, dependencies, missing, deepImports, alreadySeen);
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
        UmdDependencyHost.prototype.hasRequireCalls = function (source) {
            return /require\(['"]/.test(source);
        };
        return UmdDependencyHost;
    }(dependency_host_1.DependencyHostBase));
    exports.UmdDependencyHost = UmdDependencyHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW1kX2RlcGVuZGVuY3lfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLHlFQUFtRjtJQUNuRiwrRkFBcUQ7SUFDckQsK0ZBQTZFO0lBRTdFOztPQUVHO0lBQ0g7UUFBdUMsNkNBQWtCO1FBQXpEOztRQXlFQSxDQUFDO1FBeEVDOzs7Ozs7Ozs7OztXQVdHO1FBQ08sMERBQThCLEdBQXhDLFVBQ0ksSUFBb0IsRUFBRSxZQUFpQyxFQUFFLE9BQW9CLEVBQzdFLFdBQXdCLEVBQUUsV0FBZ0M7WUFGOUQsaUJBNkNDO1lBMUNDLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTVDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUN2Qyx5REFBeUQ7Z0JBQ3pELE9BQU87YUFDUjtZQUVELDhGQUE4RjtZQUM5RixJQUFNLEVBQUUsR0FDSixFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUU3RixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDOUIsT0FBTzthQUNSO1lBRUQsSUFBTSxTQUFTLEdBQUcscUNBQTBCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9ELElBQU0sVUFBVSxHQUFHLFNBQVMsSUFBSSxnQ0FBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNqRSxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3ZCLE9BQU87YUFDUjtZQUVELFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQSxTQUFTO2dCQUMxQixJQUFNLGNBQWMsR0FBRyxLQUFJLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3JGLElBQUksY0FBYyxFQUFFO29CQUNsQixJQUFJLGNBQWMsWUFBWSx3Q0FBc0IsRUFBRTt3QkFDcEQsSUFBTSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDO3dCQUNyRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFOzRCQUN4QyxXQUFXLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7NEJBQ3BDLEtBQUksQ0FBQyw4QkFBOEIsQ0FDL0Isa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7eUJBQzFFO3FCQUNGO3lCQUFNO3dCQUNMLElBQUksY0FBYyxZQUFZLG9DQUFrQixFQUFFOzRCQUNoRCxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQzt5QkFDNUM7NkJBQU07NEJBQ0wsWUFBWSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7eUJBQ2pEO3FCQUNGO2lCQUNGO3FCQUFNO29CQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUM3QjtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVEOzs7Ozs7Ozs7V0FTRztRQUNLLDJDQUFlLEdBQXZCLFVBQXdCLE1BQWM7WUFDcEMsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUF6RUQsQ0FBdUMsb0NBQWtCLEdBeUV4RDtJQXpFWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2dldEltcG9ydHNPZlVtZE1vZHVsZSwgcGFyc2VTdGF0ZW1lbnRGb3JVbWRNb2R1bGV9IGZyb20gJy4uL2hvc3QvdW1kX2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5SG9zdEJhc2V9IGZyb20gJy4vZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7UmVzb2x2ZWREZWVwSW1wb3J0LCBSZXNvbHZlZFJlbGF0aXZlTW9kdWxlfSBmcm9tICcuL21vZHVsZV9yZXNvbHZlcic7XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9ucyBmb3IgY29tcHV0aW5nIGRlcGVuZGVuY2llcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFVtZERlcGVuZGVuY3lIb3N0IGV4dGVuZHMgRGVwZW5kZW5jeUhvc3RCYXNlIHtcbiAgLyoqXG4gICAqIENvbXB1dGUgdGhlIGRlcGVuZGVuY2llcyBvZiB0aGUgZ2l2ZW4gZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGZpbGUgQW4gYWJzb2x1dGUgcGF0aCB0byB0aGUgZmlsZSB3aG9zZSBkZXBlbmRlbmNpZXMgd2Ugd2FudCB0byBnZXQuXG4gICAqIEBwYXJhbSBkZXBlbmRlbmNpZXMgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGFic29sdXRlIHBhdGhzIG9mIHJlc29sdmVkIGVudHJ5IHBvaW50cyBhZGRlZCB0b1xuICAgKiBpdC5cbiAgICogQHBhcmFtIG1pc3NpbmcgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGRlcGVuZGVuY2llcyB0aGF0IGNvdWxkIG5vdCBiZSBmb3VuZCBhZGRlZCB0byBpdC5cbiAgICogQHBhcmFtIGRlZXBJbXBvcnRzIEEgc2V0IHRoYXQgd2lsbCBoYXZlIHRoZSBpbXBvcnQgcGF0aHMgdGhhdCBleGlzdCBidXQgY2Fubm90IGJlIG1hcHBlZCB0b1xuICAgKiBlbnRyeS1wb2ludHMsIGkuZS4gZGVlcC1pbXBvcnRzLlxuICAgKiBAcGFyYW0gYWxyZWFkeVNlZW4gQSBzZXQgdGhhdCBpcyB1c2VkIHRvIHRyYWNrIGludGVybmFsIGRlcGVuZGVuY2llcyB0byBwcmV2ZW50IGdldHRpbmcgc3R1Y2tcbiAgICogaW4gYSBjaXJjdWxhciBkZXBlbmRlbmN5IGxvb3AuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVjdXJzaXZlbHlDb2xsZWN0RGVwZW5kZW5jaWVzKFxuICAgICAgZmlsZTogQWJzb2x1dGVGc1BhdGgsIGRlcGVuZGVuY2llczogU2V0PEFic29sdXRlRnNQYXRoPiwgbWlzc2luZzogU2V0PHN0cmluZz4sXG4gICAgICBkZWVwSW1wb3J0czogU2V0PHN0cmluZz4sIGFscmVhZHlTZWVuOiBTZXQ8QWJzb2x1dGVGc1BhdGg+KTogdm9pZCB7XG4gICAgY29uc3QgZnJvbUNvbnRlbnRzID0gdGhpcy5mcy5yZWFkRmlsZShmaWxlKTtcblxuICAgIGlmICghdGhpcy5oYXNSZXF1aXJlQ2FsbHMoZnJvbUNvbnRlbnRzKSkge1xuICAgICAgLy8gQXZvaWQgcGFyc2luZyB0aGUgc291cmNlIGZpbGUgYXMgdGhlcmUgYXJlIG5vIGltcG9ydHMuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgdGhlIHNvdXJjZSBpbnRvIGEgVHlwZVNjcmlwdCBBU1QgYW5kIHRoZW4gd2FsayBpdCBsb29raW5nIGZvciBpbXBvcnRzIGFuZCByZS1leHBvcnRzLlxuICAgIGNvbnN0IHNmID1cbiAgICAgICAgdHMuY3JlYXRlU291cmNlRmlsZShmaWxlLCBmcm9tQ29udGVudHMsIHRzLlNjcmlwdFRhcmdldC5FUzIwMTUsIGZhbHNlLCB0cy5TY3JpcHRLaW5kLkpTKTtcblxuICAgIGlmIChzZi5zdGF0ZW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHVtZE1vZHVsZSA9IHBhcnNlU3RhdGVtZW50Rm9yVW1kTW9kdWxlKHNmLnN0YXRlbWVudHNbMF0pO1xuICAgIGNvbnN0IHVtZEltcG9ydHMgPSB1bWRNb2R1bGUgJiYgZ2V0SW1wb3J0c09mVW1kTW9kdWxlKHVtZE1vZHVsZSk7XG4gICAgaWYgKHVtZEltcG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB1bWRJbXBvcnRzLmZvckVhY2godW1kSW1wb3J0ID0+IHtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID0gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlSW1wb3J0KHVtZEltcG9ydC5wYXRoLCBmaWxlKTtcbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBpZiAocmVzb2x2ZWRNb2R1bGUgaW5zdGFuY2VvZiBSZXNvbHZlZFJlbGF0aXZlTW9kdWxlKSB7XG4gICAgICAgICAgY29uc3QgaW50ZXJuYWxEZXBlbmRlbmN5ID0gcmVzb2x2ZWRNb2R1bGUubW9kdWxlUGF0aDtcbiAgICAgICAgICBpZiAoIWFscmVhZHlTZWVuLmhhcyhpbnRlcm5hbERlcGVuZGVuY3kpKSB7XG4gICAgICAgICAgICBhbHJlYWR5U2Vlbi5hZGQoaW50ZXJuYWxEZXBlbmRlbmN5KTtcbiAgICAgICAgICAgIHRoaXMucmVjdXJzaXZlbHlDb2xsZWN0RGVwZW5kZW5jaWVzKFxuICAgICAgICAgICAgICAgIGludGVybmFsRGVwZW5kZW5jeSwgZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0cywgYWxyZWFkeVNlZW4pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocmVzb2x2ZWRNb2R1bGUgaW5zdGFuY2VvZiBSZXNvbHZlZERlZXBJbXBvcnQpIHtcbiAgICAgICAgICAgIGRlZXBJbXBvcnRzLmFkZChyZXNvbHZlZE1vZHVsZS5pbXBvcnRQYXRoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVwZW5kZW5jaWVzLmFkZChyZXNvbHZlZE1vZHVsZS5lbnRyeVBvaW50UGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtaXNzaW5nLmFkZCh1bWRJbXBvcnQucGF0aCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhIHNvdXJjZSBmaWxlIG5lZWRzIHRvIGJlIHBhcnNlZCBmb3IgaW1wb3J0cy5cbiAgICogVGhpcyBpcyBhIHBlcmZvcm1hbmNlIHNob3J0LWNpcmN1aXQsIHdoaWNoIHNhdmVzIHVzIGZyb20gY3JlYXRpbmdcbiAgICogYSBUeXBlU2NyaXB0IEFTVCB1bm5lY2Vzc2FyaWx5LlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlIFRoZSBjb250ZW50IG9mIHRoZSBzb3VyY2UgZmlsZSB0byBjaGVjay5cbiAgICpcbiAgICogQHJldHVybnMgZmFsc2UgaWYgdGhlcmUgYXJlIGRlZmluaXRlbHkgbm8gcmVxdWlyZSBjYWxsc1xuICAgKiBpbiB0aGlzIGZpbGUsIHRydWUgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBoYXNSZXF1aXJlQ2FsbHMoc291cmNlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gL3JlcXVpcmVcXChbJ1wiXS8udGVzdChzb3VyY2UpO1xuICB9XG59XG4iXX0=