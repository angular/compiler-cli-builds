(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/dependency_host", ["require", "exports", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DependencyHostBase = exports.createDependencyInfo = void 0;
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
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
            var resolvedFile = utils_1.resolveFileWithPostfixes(this.fs, entryPointPath, this.moduleResolver.relativeExtensions);
            if (resolvedFile !== null) {
                var alreadySeen = new Set();
                this.recursivelyCollectDependencies(resolvedFile, dependencies, missing, deepImports, alreadySeen);
            }
        };
        return DependencyHostBase;
    }());
    exports.DependencyHostBase = DependencyHostBase;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBU0EsOERBQWtEO0lBb0JsRCxTQUFnQixvQkFBb0I7UUFDbEMsT0FBTyxFQUFDLFlBQVksRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFDLENBQUM7SUFDL0UsQ0FBQztJQUZELG9EQUVDO0lBRUQ7UUFDRSw0QkFBc0IsRUFBYyxFQUFZLGNBQThCO1lBQXhELE9BQUUsR0FBRixFQUFFLENBQVk7WUFBWSxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFBRyxDQUFDO1FBRWxGOzs7Ozs7O1dBT0c7UUFDSCxnREFBbUIsR0FBbkIsVUFDSSxjQUE4QixFQUFFLEVBQW9EO2dCQUFuRCxZQUFZLGtCQUFBLEVBQUUsT0FBTyxhQUFBLEVBQUUsV0FBVyxpQkFBQTtZQUNyRSxJQUFNLFlBQVksR0FDZCxnQ0FBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDOUYsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUN6QixJQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLDhCQUE4QixDQUMvQixZQUFZLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDcEU7UUFDSCxDQUFDO1FBaUJILHlCQUFDO0lBQUQsQ0FBQyxBQXJDRCxJQXFDQztJQXJDcUIsZ0RBQWtCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RW50cnlQb2ludH0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtyZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXN9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtNb2R1bGVSZXNvbHZlcn0gZnJvbSAnLi9tb2R1bGVfcmVzb2x2ZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVuY3lIb3N0IHtcbiAgY29sbGVjdERlcGVuZGVuY2llcyhcbiAgICAgIGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwge2RlcGVuZGVuY2llcywgbWlzc2luZywgZGVlcEltcG9ydHN9OiBEZXBlbmRlbmN5SW5mbyk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwZW5kZW5jeUluZm8ge1xuICBkZXBlbmRlbmNpZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG4gIG1pc3Npbmc6IFNldDxBYnNvbHV0ZUZzUGF0aHxQYXRoU2VnbWVudD47XG4gIGRlZXBJbXBvcnRzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzIHtcbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcbiAgZGVwSW5mbzogRGVwZW5kZW5jeUluZm87XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEZXBlbmRlbmN5SW5mbygpOiBEZXBlbmRlbmN5SW5mbyB7XG4gIHJldHVybiB7ZGVwZW5kZW5jaWVzOiBuZXcgU2V0KCksIG1pc3Npbmc6IG5ldyBTZXQoKSwgZGVlcEltcG9ydHM6IG5ldyBTZXQoKX07XG59XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBEZXBlbmRlbmN5SG9zdEJhc2UgaW1wbGVtZW50cyBEZXBlbmRlbmN5SG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBmczogRmlsZVN5c3RlbSwgcHJvdGVjdGVkIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcikge31cblxuICAvKipcbiAgICogRmluZCBhbGwgdGhlIGRlcGVuZGVuY2llcyBmb3IgdGhlIGVudHJ5LXBvaW50IGF0IHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gZW50cnlQb2ludFBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIEphdmFTY3JpcHQgZmlsZSB0aGF0IHJlcHJlc2VudHMgYW4gZW50cnktcG9pbnQuXG4gICAqIEBwYXJhbSBkZXBlbmRlbmN5SW5mbyBBbiBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZVxuICAgKiBlbnRyeS1wb2ludCwgaW5jbHVkaW5nIHRob3NlIHRoYXQgd2VyZSBtaXNzaW5nIG9yIGRlZXAgaW1wb3J0cyBpbnRvIG90aGVyIGVudHJ5LXBvaW50cy4gVGhlXG4gICAqIHNldHMgaW4gdGhpcyBvYmplY3Qgd2lsbCBiZSB1cGRhdGVkIHdpdGggbmV3IGluZm9ybWF0aW9uIGFib3V0IHRoZSBlbnRyeS1wb2ludCdzIGRlcGVuZGVuY2llcy5cbiAgICovXG4gIGNvbGxlY3REZXBlbmRlbmNpZXMoXG4gICAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsIHtkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzfTogRGVwZW5kZW5jeUluZm8pOiB2b2lkIHtcbiAgICBjb25zdCByZXNvbHZlZEZpbGUgPVxuICAgICAgICByZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXModGhpcy5mcywgZW50cnlQb2ludFBhdGgsIHRoaXMubW9kdWxlUmVzb2x2ZXIucmVsYXRpdmVFeHRlbnNpb25zKTtcbiAgICBpZiAocmVzb2x2ZWRGaWxlICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBhbHJlYWR5U2VlbiA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgICB0aGlzLnJlY3Vyc2l2ZWx5Q29sbGVjdERlcGVuZGVuY2llcyhcbiAgICAgICAgICByZXNvbHZlZEZpbGUsIGRlcGVuZGVuY2llcywgbWlzc2luZywgZGVlcEltcG9ydHMsIGFscmVhZHlTZWVuKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBnaXZlbiBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZmlsZSBBbiBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBmaWxlIHdob3NlIGRlcGVuZGVuY2llcyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIGRlcGVuZGVuY2llcyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgYWJzb2x1dGUgcGF0aHMgb2YgcmVzb2x2ZWQgZW50cnkgcG9pbnRzIGFkZGVkIHRvXG4gICAqIGl0LlxuICAgKiBAcGFyYW0gbWlzc2luZyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgZGVwZW5kZW5jaWVzIHRoYXQgY291bGQgbm90IGJlIGZvdW5kIGFkZGVkIHRvIGl0LlxuICAgKiBAcGFyYW0gZGVlcEltcG9ydHMgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGltcG9ydCBwYXRocyB0aGF0IGV4aXN0IGJ1dCBjYW5ub3QgYmUgbWFwcGVkIHRvXG4gICAqIGVudHJ5LXBvaW50cywgaS5lLiBkZWVwLWltcG9ydHMuXG4gICAqIEBwYXJhbSBhbHJlYWR5U2VlbiBBIHNldCB0aGF0IGlzIHVzZWQgdG8gdHJhY2sgaW50ZXJuYWwgZGVwZW5kZW5jaWVzIHRvIHByZXZlbnQgZ2V0dGluZyBzdHVja1xuICAgKiBpbiBhIGNpcmN1bGFyIGRlcGVuZGVuY3kgbG9vcC5cbiAgICovXG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZWN1cnNpdmVseUNvbGxlY3REZXBlbmRlbmNpZXMoXG4gICAgICBmaWxlOiBBYnNvbHV0ZUZzUGF0aCwgZGVwZW5kZW5jaWVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LCBtaXNzaW5nOiBTZXQ8c3RyaW5nPixcbiAgICAgIGRlZXBJbXBvcnRzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LCBhbHJlYWR5U2VlbjogU2V0PEFic29sdXRlRnNQYXRoPik6IHZvaWQ7XG59XG4iXX0=