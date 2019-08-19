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
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    var DependencyHostBase = /** @class */ (function () {
        function DependencyHostBase(fs, moduleResolver) {
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
        DependencyHostBase.prototype.findDependencies = function (entryPointPath) {
            var dependencies = new Set();
            var missing = new Set();
            var deepImports = new Set();
            var resolvedFile = utils_1.resolveFileWithPostfixes(this.fs, entryPointPath, ['', '.js', '/index.js']);
            if (resolvedFile !== null) {
                var alreadySeen = new Set();
                this.recursivelyFindDependencies(resolvedFile, dependencies, missing, deepImports, alreadySeen);
            }
            return { dependencies: dependencies, missing: missing, deepImports: deepImports };
        };
        return DependencyHostBase;
    }());
    exports.DependencyHostBase = DependencyHostBase;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9ob3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X2hvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFRQSw4REFBa0Q7SUFjbEQ7UUFDRSw0QkFBc0IsRUFBYyxFQUFZLGNBQThCO1lBQXhELE9BQUUsR0FBRixFQUFFLENBQVk7WUFBWSxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFBRyxDQUFDO1FBRWxGOzs7Ozs7V0FNRztRQUNILDZDQUFnQixHQUFoQixVQUFpQixjQUE4QjtZQUM3QyxJQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUMvQyxJQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUN0RCxJQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUU5QyxJQUFNLFlBQVksR0FDZCxnQ0FBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNoRixJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUU7Z0JBQ3pCLElBQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO2dCQUM5QyxJQUFJLENBQUMsMkJBQTJCLENBQzVCLFlBQVksRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQzthQUNwRTtZQUVELE9BQU8sRUFBQyxZQUFZLGNBQUEsRUFBRSxPQUFPLFNBQUEsRUFBRSxXQUFXLGFBQUEsRUFBQyxDQUFDO1FBQzlDLENBQUM7UUFpQkgseUJBQUM7SUFBRCxDQUFDLEFBekNELElBeUNDO0lBekNxQixnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7cmVzb2x2ZUZpbGVXaXRoUG9zdGZpeGVzfSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vbW9kdWxlX3Jlc29sdmVyJztcblxuZXhwb3J0IGludGVyZmFjZSBEZXBlbmRlbmN5SG9zdCB7XG4gIGZpbmREZXBlbmRlbmNpZXMoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRGVwZW5kZW5jeUluZm87XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwZW5kZW5jeUluZm8ge1xuICBkZXBlbmRlbmNpZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG4gIG1pc3Npbmc6IFNldDxBYnNvbHV0ZUZzUGF0aHxQYXRoU2VnbWVudD47XG4gIGRlZXBJbXBvcnRzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+O1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgRGVwZW5kZW5jeUhvc3RCYXNlIGltcGxlbWVudHMgRGVwZW5kZW5jeUhvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZnM6IEZpbGVTeXN0ZW0sIHByb3RlY3RlZCBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXIpIHt9XG5cbiAgLyoqXG4gICAqIEZpbmQgYWxsIHRoZSBkZXBlbmRlbmNpZXMgZm9yIHRoZSBlbnRyeS1wb2ludCBhdCB0aGUgZ2l2ZW4gcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIGVudHJ5UG9pbnRQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBKYXZhU2NyaXB0IGZpbGUgdGhhdCByZXByZXNlbnRzIGFuIGVudHJ5LXBvaW50LlxuICAgKiBAcmV0dXJucyBJbmZvcm1hdGlvbiBhYm91dCB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBlbnRyeS1wb2ludCwgaW5jbHVkaW5nIHRob3NlIHRoYXQgd2VyZVxuICAgKiBtaXNzaW5nIG9yIGRlZXAgaW1wb3J0cyBpbnRvIG90aGVyIGVudHJ5LXBvaW50cy5cbiAgICovXG4gIGZpbmREZXBlbmRlbmNpZXMoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRGVwZW5kZW5jeUluZm8ge1xuICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgY29uc3QgbWlzc2luZyA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGh8UGF0aFNlZ21lbnQ+KCk7XG4gICAgY29uc3QgZGVlcEltcG9ydHMgPSBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpO1xuXG4gICAgY29uc3QgcmVzb2x2ZWRGaWxlID1cbiAgICAgICAgcmVzb2x2ZUZpbGVXaXRoUG9zdGZpeGVzKHRoaXMuZnMsIGVudHJ5UG9pbnRQYXRoLCBbJycsICcuanMnLCAnL2luZGV4LmpzJ10pO1xuICAgIGlmIChyZXNvbHZlZEZpbGUgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGFscmVhZHlTZWVuID0gbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKTtcbiAgICAgIHRoaXMucmVjdXJzaXZlbHlGaW5kRGVwZW5kZW5jaWVzKFxuICAgICAgICAgIHJlc29sdmVkRmlsZSwgZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0cywgYWxyZWFkeVNlZW4pO1xuICAgIH1cblxuICAgIHJldHVybiB7ZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0c307XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSB0aGUgZGVwZW5kZW5jaWVzIG9mIHRoZSBnaXZlbiBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZmlsZSBBbiBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBmaWxlIHdob3NlIGRlcGVuZGVuY2llcyB3ZSB3YW50IHRvIGdldC5cbiAgICogQHBhcmFtIGRlcGVuZGVuY2llcyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgYWJzb2x1dGUgcGF0aHMgb2YgcmVzb2x2ZWQgZW50cnkgcG9pbnRzIGFkZGVkIHRvXG4gICAqIGl0LlxuICAgKiBAcGFyYW0gbWlzc2luZyBBIHNldCB0aGF0IHdpbGwgaGF2ZSB0aGUgZGVwZW5kZW5jaWVzIHRoYXQgY291bGQgbm90IGJlIGZvdW5kIGFkZGVkIHRvIGl0LlxuICAgKiBAcGFyYW0gZGVlcEltcG9ydHMgQSBzZXQgdGhhdCB3aWxsIGhhdmUgdGhlIGltcG9ydCBwYXRocyB0aGF0IGV4aXN0IGJ1dCBjYW5ub3QgYmUgbWFwcGVkIHRvXG4gICAqIGVudHJ5LXBvaW50cywgaS5lLiBkZWVwLWltcG9ydHMuXG4gICAqIEBwYXJhbSBhbHJlYWR5U2VlbiBBIHNldCB0aGF0IGlzIHVzZWQgdG8gdHJhY2sgaW50ZXJuYWwgZGVwZW5kZW5jaWVzIHRvIHByZXZlbnQgZ2V0dGluZyBzdHVja1xuICAgKiBpbiBhIGNpcmN1bGFyIGRlcGVuZGVuY3kgbG9vcC5cbiAgICovXG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZWN1cnNpdmVseUZpbmREZXBlbmRlbmNpZXMoXG4gICAgICBmaWxlOiBBYnNvbHV0ZUZzUGF0aCwgZGVwZW5kZW5jaWVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LCBtaXNzaW5nOiBTZXQ8c3RyaW5nPixcbiAgICAgIGRlZXBJbXBvcnRzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LCBhbHJlYWR5U2VlbjogU2V0PEFic29sdXRlRnNQYXRoPik6IHZvaWQ7XG59XG4iXX0=