(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/dependency_host", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/utils", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DependencyHostBase = exports.createDependencyInfo = void 0;
    var tslib_1 = require("tslib");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    function createDependencyInfo() {
        return { dependencies: new Set(), missing: new Set(), deepImports: new Set() };
    }
    exports.createDependencyInfo = createDependencyInfo;
    var DependencyHostBase = /** @class */ (function () {
        function DependencyHostBase(fs, moduleResolver) {
            this.fs = fs;
            this.moduleResolver = moduleResolver;
        }
        /**
         * Find all the dependencies for the entry-point at the given path.
         *
         * @param entryPointPath The absolute path to the JavaScript file that represents an entry-point.
         * @param dependencyInfo An object containing information about the dependencies of the
         * entry-point, including those that were missing or deep imports into other entry-points. The
         * sets in this object will be updated with new information about the entry-point's dependencies.
         */
        DependencyHostBase.prototype.collectDependencies = function (entryPointPath, _a) {
            var dependencies = _a.dependencies, missing = _a.missing, deepImports = _a.deepImports;
            var resolvedFile = (0, utils_1.resolveFileWithPostfixes)(this.fs, entryPointPath, this.moduleResolver.relativeExtensions);
            if (resolvedFile !== null) {
                var alreadySeen = new Set();
                this.recursivelyCollectDependencies(resolvedFile, dependencies, missing, deepImports, alreadySeen);
            }
        };
        /**
         * Find all the dependencies for the provided paths.
         *
         * @param files The list of absolute paths of JavaScript files to scan for dependencies.
         * @param dependencyInfo An object containing information about the dependencies of the
         * entry-point, including those that were missing or deep imports into other entry-points. The
         * sets in this object will be updated with new information about the entry-point's dependencies.
         */
        DependencyHostBase.prototype.collectDependenciesInFiles = function (files, _a) {
            var e_1, _b;
            var dependencies = _a.dependencies, missing = _a.missing, deepImports = _a.deepImports;
            var alreadySeen = new Set();
            try {
                for (var files_1 = (0, tslib_1.__values)(files), files_1_1 = files_1.next(); !files_1_1.done; files_1_1 = files_1.next()) {
                    var file = files_1_1.value;
                    this.processFile(file, dependencies, missing, deepImports, alreadySeen);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (files_1_1 && !files_1_1.done && (_b = files_1.return)) _b.call(files_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
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
         * in a circular dependency loop.
         */
        DependencyHostBase.prototype.recursivelyCollectDependencies = function (file, dependencies, missing, deepImports, alreadySeen) {
            var e_2, _a;
            var fromContents = this.fs.readFile(file);
            if (this.canSkipFile(fromContents)) {
                return;
            }
            var imports = this.extractImports(file, fromContents);
            try {
                for (var imports_1 = (0, tslib_1.__values)(imports), imports_1_1 = imports_1.next(); !imports_1_1.done; imports_1_1 = imports_1.next()) {
                    var importPath = imports_1_1.value;
                    var resolved = this.processImport(importPath, file, dependencies, missing, deepImports, alreadySeen);
                    if (!resolved) {
                        missing.add(importPath);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (imports_1_1 && !imports_1_1.done && (_a = imports_1.return)) _a.call(imports_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        /**
         * Resolve the given `importPath` from `file` and add it to the appropriate set.
         *
         * If the import is local to this package then follow it by calling
         * `recursivelyCollectDependencies()`.
         *
         * @returns `true` if the import was resolved (to an entry-point, a local import, or a
         * deep-import), `false` otherwise.
         */
        DependencyHostBase.prototype.processImport = function (importPath, file, dependencies, missing, deepImports, alreadySeen) {
            var resolvedModule = this.moduleResolver.resolveModuleImport(importPath, file);
            if (resolvedModule === null) {
                return false;
            }
            if (resolvedModule instanceof module_resolver_1.ResolvedRelativeModule) {
                this.processFile(resolvedModule.modulePath, dependencies, missing, deepImports, alreadySeen);
            }
            else if (resolvedModule instanceof module_resolver_1.ResolvedDeepImport) {
                deepImports.add(resolvedModule.importPath);
            }
            else {
                dependencies.add(resolvedModule.entryPointPath);
            }
            return true;
        };
        /**
         * Processes the file if it has not already been seen. This will also recursively process
         * all files that are imported from the file, while taking the set of already seen files
         * into account.
         */
        DependencyHostBase.prototype.processFile = function (file, dependencies, missing, deepImports, alreadySeen) {
            if (!alreadySeen.has(file)) {
                alreadySeen.add(file);
                this.recursivelyCollectDependencies(file, dependencies, missing, deepImports, alreadySeen);
            }
        };
        return DependencyHostBase;
    }());
    exports.DependencyHostBase = DependencyHostBase;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVNBLDhEQUFrRDtJQUVsRCwrRkFBNkY7SUFrQjdGLFNBQWdCLG9CQUFvQjtRQUNsQyxPQUFPLEVBQUMsWUFBWSxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRkQsb0RBRUM7SUFFRDtRQUNFLDRCQUFzQixFQUFzQixFQUFZLGNBQThCO1lBQWhFLE9BQUUsR0FBRixFQUFFLENBQW9CO1lBQVksbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQUcsQ0FBQztRQUUxRjs7Ozs7OztXQU9HO1FBQ0gsZ0RBQW1CLEdBQW5CLFVBQ0ksY0FBOEIsRUFBRSxFQUFvRDtnQkFBbkQsWUFBWSxrQkFBQSxFQUFFLE9BQU8sYUFBQSxFQUFFLFdBQVcsaUJBQUE7WUFDckUsSUFBTSxZQUFZLEdBQ2QsSUFBQSxnQ0FBd0IsRUFBQyxJQUFJLENBQUMsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDOUYsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUN6QixJQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLDhCQUE4QixDQUMvQixZQUFZLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDcEU7UUFDSCxDQUFDO1FBRUQ7Ozs7Ozs7V0FPRztRQUNILHVEQUEwQixHQUExQixVQUNJLEtBQXVC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Z2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBQYXRoU2VnbWVudCwgUmVhZG9ubHlGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtFbnRyeVBvaW50fSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge3Jlc29sdmVGaWxlV2l0aFBvc3RmaXhlc30gZnJvbSAnLi4vdXRpbHMnO1xuXG5pbXBvcnQge01vZHVsZVJlc29sdmVyLCBSZXNvbHZlZERlZXBJbXBvcnQsIFJlc29sdmVkUmVsYXRpdmVNb2R1bGV9IGZyb20gJy4vbW9kdWxlX3Jlc29sdmVyJztcblxuZXhwb3J0IGludGVyZmFjZSBEZXBlbmRlbmN5SG9zdCB7XG4gIGNvbGxlY3REZXBlbmRlbmNpZXMoXG4gICAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsIHtkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzfTogRGVwZW5kZW5jeUluZm8pOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVuY3lJbmZvIHtcbiAgZGVwZW5kZW5jaWVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+O1xuICBtaXNzaW5nOiBTZXQ8QWJzb2x1dGVGc1BhdGh8UGF0aFNlZ21lbnQ+O1xuICBkZWVwSW1wb3J0czogU2V0PEFic29sdXRlRnNQYXRoPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcyB7XG4gIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQ7XG4gIGRlcEluZm86IERlcGVuZGVuY3lJbmZvO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGVwZW5kZW5jeUluZm8oKTogRGVwZW5kZW5jeUluZm8ge1xuICByZXR1cm4ge2RlcGVuZGVuY2llczogbmV3IFNldCgpLCBtaXNzaW5nOiBuZXcgU2V0KCksIGRlZXBJbXBvcnRzOiBuZXcgU2V0KCl9O1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRGVwZW5kZW5jeUhvc3RCYXNlIGltcGxlbWVudHMgRGVwZW5kZW5jeUhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZnM6IFJlYWRvbmx5RmlsZVN5c3RlbSwgcHJvdGVjdGVkIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcikge31cblxuICAvKipcbiAgICogRmluZCBhbGwgdGhlIGRlcGVuZGVuY2llcyBmb3IgdGhlIGVudHJ5LXBvaW50IGF0IHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gZW50cnlQb2ludFBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIEphdmFTY3JpcHQgZmlsZSB0aGF0IHJlcHJlc2VudHMgYW4gZW50cnktcG9pbnQuXG4gICAqIEBwYXJhbSBkZXBlbmRlbmN5SW5mbyBBbiBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZVxuICAgKiBlbnRyeS1wb2ludCwgaW5jbHVkaW5nIHRob3NlIHRoYXQgd2VyZSBtaXNzaW5nIG9yIGRlZXAgaW1wb3J0cyBpbnRvIG90aGVyIGVudHJ5LXBvaW50cy4gVGhlXG4gICAqIHNldHMgaW4gdGhpcyBvYmplY3Qgd2lsbCBiZSB1cGRhdGVkIHdpdGggbmV3IGluZm9ybWF0aW9uIGFib3V0IHRoZSBlbnRyeS1wb2ludCdzIGRlcGVuZGVuY2llcy5cbiAgICovXG4gIGNvbGxlY3REZXBlbmRlbmNpZXMoXG4gICAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsIHtkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzfTogRGVwZW5kZW5jeUluZm8pOiB2b2lkIHtcbiAgICBjb25zdCByZXNvbHZlZEZpbGUgPVxuICAgICAgICByZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXModGhpcy5mcywgZW50cnlQb2ludFBhdGgsIHRoaXMubW9kdWxlUmVzb2x2ZXIucmVsYXRpdmVFeHRlbnNpb25zKTtcbiAgICBpZiAocmVzb2x2ZWRGaWxlICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBhbHJlYWR5U2VlbiA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgICB0aGlzLnJlY3Vyc2l2ZWx5Q29sbGVjdERlcGVuZGVuY2llcyhcbiAgICAgICAgICByZXNvbHZlZEZpbGUsIGRlcGVuZGVuY2llcywgbWlzc2luZywgZGVlcEltcG9ydHMsIGFscmVhZHlTZWVuKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZCBhbGwgdGhlIGRlcGVuZGVuY2llcyBmb3IgdGhlIHByb3ZpZGVkIHBhdGhzLlxuICAgKlxuICAgKiBAcGFyYW0gZmlsZXMgVGhlIGxpc3Qgb2YgYWJzb2x1dGUgcGF0aHMgb2YgSmF2YVNjcmlwdCBmaWxlcyB0byBzY2FuIGZvciBkZXBlbmRlbmNpZXMuXG4gICAqIEBwYXJhbSBkZXBlbmRlbmN5SW5mbyBBbiBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZVxuICAgKiBlbnRyeS1wb2ludCwgaW5jbHVkaW5nIHRob3NlIHRoYXQgd2VyZSBtaXNzaW5nIG9yIGRlZXAgaW1wb3J0cyBpbnRvIG90aGVyIGVudHJ5LXBvaW50cy4gVGhlXG4gICAqIHNldHMgaW4gdGhpcyBvYmplY3Qgd2lsbCBiZSB1cGRhdGVkIHdpdGggbmV3IGluZm9ybWF0aW9uIGFib3V0IHRoZSBlbnRyeS1wb2ludCdzIGRlcGVuZGVuY2llcy5cbiAgICovXG4gIGNvbGxlY3REZXBlbmRlbmNpZXNJbkZpbGVzKFxuICAgICAgZmlsZXM6IEFic29sdXRlRnNQYXRoW10sIHtkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzfTogRGVwZW5kZW5jeUluZm8pOiB2b2lkIHtcbiAgICBjb25zdCBhbHJlYWR5U2VlbiA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICB0aGlzLnByb2Nlc3NGaWxlKGZpbGUsIGRlcGVuZGVuY2llcywgbWlzc2luZywgZGVlcEltcG9ydHMsIGFscmVhZHlTZWVuKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBnaXZlbiBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZmlsZSBBbiBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBmaWxlIHdob3NlIGRlcGVuZGVuY2llcyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIGRlcGVuZGVuY2llcyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgYWJzb2x1dGUgcGF0aHMgb2YgcmVzb2x2ZWQgZW50cnkgcG9pbnRzIGFkZGVkIHRvXG4gICAqIGl0LlxuICAgKiBAcGFyYW0gbWlzc2luZyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgZGVwZW5kZW5jaWVzIHRoYXQgY291bGQgbm90IGJlIGZvdW5kIGFkZGVkIHRvIGl0LlxuICAgKiBAcGFyYW0gZGVlcEltcG9ydHMgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGltcG9ydCBwYXRocyB0aGF0IGV4aXN0IGJ1dCBjYW5ub3QgYmUgbWFwcGVkIHRvXG4gICAqIGVudHJ5LXBvaW50cywgaS5lLiBkZWVwLWltcG9ydHMuXG4gICAqIEBwYXJhbSBhbHJlYWR5U2VlbiBBIHNldCB0aGF0IGlzIHVzZWQgdG8gdHJhY2sgaW50ZXJuYWwgZGVwZW5kZW5jaWVzIHRvIHByZXZlbnQgZ2V0dGluZyBzdHVja1xuICAgKiBpbiBhIGNpcmN1bGFyIGRlcGVuZGVuY3kgbG9vcC5cbiAgICovXG4gIHByb3RlY3RlZCByZWN1cnNpdmVseUNvbGxlY3REZXBlbmRlbmNpZXMoXG4gICAgICBmaWxlOiBBYnNvbHV0ZUZzUGF0aCwgZGVwZW5kZW5jaWVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LCBtaXNzaW5nOiBTZXQ8c3RyaW5nPixcbiAgICAgIGRlZXBJbXBvcnRzOiBTZXQ8c3RyaW5nPiwgYWxyZWFkeVNlZW46IFNldDxBYnNvbHV0ZUZzUGF0aD4pOiB2b2lkIHtcbiAgICBjb25zdCBmcm9tQ29udGVudHMgPSB0aGlzLmZzLnJlYWRGaWxlKGZpbGUpO1xuICAgIGlmICh0aGlzLmNhblNraXBGaWxlKGZyb21Db250ZW50cykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW1wb3J0cyA9IHRoaXMuZXh0cmFjdEltcG9ydHMoZmlsZSwgZnJvbUNvbnRlbnRzKTtcbiAgICBmb3IgKGNvbnN0IGltcG9ydFBhdGggb2YgaW1wb3J0cykge1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPVxuICAgICAgICAgIHRoaXMucHJvY2Vzc0ltcG9ydChpbXBvcnRQYXRoLCBmaWxlLCBkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzLCBhbHJlYWR5U2Vlbik7XG4gICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgIG1pc3NpbmcuYWRkKGltcG9ydFBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBhYnN0cmFjdCBjYW5Ta2lwRmlsZShmaWxlQ29udGVudHM6IHN0cmluZyk6IGJvb2xlYW47XG4gIHByb3RlY3RlZCBhYnN0cmFjdCBleHRyYWN0SW1wb3J0cyhmaWxlOiBBYnNvbHV0ZUZzUGF0aCwgZmlsZUNvbnRlbnRzOiBzdHJpbmcpOiBTZXQ8c3RyaW5nPjtcblxuICAvKipcbiAgICogUmVzb2x2ZSB0aGUgZ2l2ZW4gYGltcG9ydFBhdGhgIGZyb20gYGZpbGVgIGFuZCBhZGQgaXQgdG8gdGhlIGFwcHJvcHJpYXRlIHNldC5cbiAgICpcbiAgICogSWYgdGhlIGltcG9ydCBpcyBsb2NhbCB0byB0aGlzIHBhY2thZ2UgdGhlbiBmb2xsb3cgaXQgYnkgY2FsbGluZ1xuICAgKiBgcmVjdXJzaXZlbHlDb2xsZWN0RGVwZW5kZW5jaWVzKClgLlxuICAgKlxuICAgKiBAcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGltcG9ydCB3YXMgcmVzb2x2ZWQgKHRvIGFuIGVudHJ5LXBvaW50LCBhIGxvY2FsIGltcG9ydCwgb3IgYVxuICAgKiBkZWVwLWltcG9ydCksIGBmYWxzZWAgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHByb2Nlc3NJbXBvcnQoXG4gICAgICBpbXBvcnRQYXRoOiBzdHJpbmcsIGZpbGU6IEFic29sdXRlRnNQYXRoLCBkZXBlbmRlbmNpZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD4sXG4gICAgICBtaXNzaW5nOiBTZXQ8c3RyaW5nPiwgZGVlcEltcG9ydHM6IFNldDxzdHJpbmc+LCBhbHJlYWR5U2VlbjogU2V0PEFic29sdXRlRnNQYXRoPik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID0gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlSW1wb3J0KGltcG9ydFBhdGgsIGZpbGUpO1xuICAgIGlmIChyZXNvbHZlZE1vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAocmVzb2x2ZWRNb2R1bGUgaW5zdGFuY2VvZiBSZXNvbHZlZFJlbGF0aXZlTW9kdWxlKSB7XG4gICAgICB0aGlzLnByb2Nlc3NGaWxlKHJlc29sdmVkTW9kdWxlLm1vZHVsZVBhdGgsIGRlcGVuZGVuY2llcywgbWlzc2luZywgZGVlcEltcG9ydHMsIGFscmVhZHlTZWVuKTtcbiAgICB9IGVsc2UgaWYgKHJlc29sdmVkTW9kdWxlIGluc3RhbmNlb2YgUmVzb2x2ZWREZWVwSW1wb3J0KSB7XG4gICAgICBkZWVwSW1wb3J0cy5hZGQocmVzb2x2ZWRNb2R1bGUuaW1wb3J0UGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlcGVuZGVuY2llcy5hZGQocmVzb2x2ZWRNb2R1bGUuZW50cnlQb2ludFBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgdGhlIGZpbGUgaWYgaXQgaGFzIG5vdCBhbHJlYWR5IGJlZW4gc2Vlbi4gVGhpcyB3aWxsIGFsc28gcmVjdXJzaXZlbHkgcHJvY2Vzc1xuICAgKiBhbGwgZmlsZXMgdGhhdCBhcmUgaW1wb3J0ZWQgZnJvbSB0aGUgZmlsZSwgd2hpbGUgdGFraW5nIHRoZSBzZXQgb2YgYWxyZWFkeSBzZWVuIGZpbGVzXG4gICAqIGludG8gYWNjb3VudC5cbiAgICovXG4gIHByb3RlY3RlZCBwcm9jZXNzRmlsZShcbiAgICAgIGZpbGU6IEFic29sdXRlRnNQYXRoLCBkZXBlbmRlbmNpZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD4sIG1pc3Npbmc6IFNldDxzdHJpbmc+LFxuICAgICAgZGVlcEltcG9ydHM6IFNldDxzdHJpbmc+LCBhbHJlYWR5U2VlbjogU2V0PEFic29sdXRlRnNQYXRoPik6IHZvaWQge1xuICAgIGlmICghYWxyZWFkeVNlZW4uaGFzKGZpbGUpKSB7XG4gICAgICBhbHJlYWR5U2Vlbi5hZGQoZmlsZSk7XG4gICAgICB0aGlzLnJlY3Vyc2l2ZWx5Q29sbGVjdERlcGVuZGVuY2llcyhmaWxlLCBkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzLCBhbHJlYWR5U2Vlbik7XG4gICAgfVxuICB9XG59XG4iXX0=