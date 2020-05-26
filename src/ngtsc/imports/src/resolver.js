(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/imports/src/resolver", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ModuleResolver = void 0;
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * Used by `RouterEntryPointManager` and `NgModuleRouteAnalyzer` (which is in turn is used by
     * `NgModuleDecoratorHandler`) for resolving the module source-files references in lazy-loaded
     * routes (relative to the source-file containing the `NgModule` that provides the route
     * definitions).
     */
    var ModuleResolver = /** @class */ (function () {
        function ModuleResolver(program, compilerOptions, host, moduleResolutionCache) {
            this.program = program;
            this.compilerOptions = compilerOptions;
            this.host = host;
            this.moduleResolutionCache = moduleResolutionCache;
        }
        ModuleResolver.prototype.resolveModule = function (moduleName, containingFile) {
            var resolved = typescript_1.resolveModuleName(moduleName, containingFile, this.compilerOptions, this.host, this.moduleResolutionCache);
            if (resolved === undefined) {
                return null;
            }
            return typescript_1.getSourceFileOrNull(this.program, file_system_1.absoluteFrom(resolved.resolvedFileName));
        };
        return ModuleResolver;
    }());
    exports.ModuleResolver = ModuleResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvc3JjL3Jlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVFBLDJFQUErQztJQUMvQyxrRkFBaUY7SUFFakY7Ozs7O09BS0c7SUFDSDtRQUNFLHdCQUNZLE9BQW1CLEVBQVUsZUFBbUMsRUFDaEUsSUFBcUIsRUFBVSxxQkFBb0Q7WUFEbkYsWUFBTyxHQUFQLE9BQU8sQ0FBWTtZQUFVLG9CQUFlLEdBQWYsZUFBZSxDQUFvQjtZQUNoRSxTQUFJLEdBQUosSUFBSSxDQUFpQjtZQUFVLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBK0I7UUFDL0YsQ0FBQztRQUVELHNDQUFhLEdBQWIsVUFBYyxVQUFrQixFQUFFLGNBQXNCO1lBQ3RELElBQU0sUUFBUSxHQUFHLDhCQUFpQixDQUM5QixVQUFVLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUM3RixJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7Z0JBQzFCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLGdDQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsMEJBQVksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUFkRCxJQWNDO0lBZFksd0NBQWMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7YWJzb2x1dGVGcm9tfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGVPck51bGwsIHJlc29sdmVNb2R1bGVOYW1lfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuLyoqXG4gKiBVc2VkIGJ5IGBSb3V0ZXJFbnRyeVBvaW50TWFuYWdlcmAgYW5kIGBOZ01vZHVsZVJvdXRlQW5hbHl6ZXJgICh3aGljaCBpcyBpbiB0dXJuIGlzIHVzZWQgYnlcbiAqIGBOZ01vZHVsZURlY29yYXRvckhhbmRsZXJgKSBmb3IgcmVzb2x2aW5nIHRoZSBtb2R1bGUgc291cmNlLWZpbGVzIHJlZmVyZW5jZXMgaW4gbGF6eS1sb2FkZWRcbiAqIHJvdXRlcyAocmVsYXRpdmUgdG8gdGhlIHNvdXJjZS1maWxlIGNvbnRhaW5pbmcgdGhlIGBOZ01vZHVsZWAgdGhhdCBwcm92aWRlcyB0aGUgcm91dGVcbiAqIGRlZmluaXRpb25zKS5cbiAqL1xuZXhwb3J0IGNsYXNzIE1vZHVsZVJlc29sdmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHByb2dyYW06IHRzLlByb2dyYW0sIHByaXZhdGUgY29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsXG4gICAgICBwcml2YXRlIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCwgcHJpdmF0ZSBtb2R1bGVSZXNvbHV0aW9uQ2FjaGU6IHRzLk1vZHVsZVJlc29sdXRpb25DYWNoZXxudWxsKSB7XG4gIH1cblxuICByZXNvbHZlTW9kdWxlKG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlTW9kdWxlTmFtZShcbiAgICAgICAgbW9kdWxlTmFtZSwgY29udGFpbmluZ0ZpbGUsIHRoaXMuY29tcGlsZXJPcHRpb25zLCB0aGlzLmhvc3QsIHRoaXMubW9kdWxlUmVzb2x1dGlvbkNhY2hlKTtcbiAgICBpZiAocmVzb2x2ZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBnZXRTb3VyY2VGaWxlT3JOdWxsKHRoaXMucHJvZ3JhbSwgYWJzb2x1dGVGcm9tKHJlc29sdmVkLnJlc29sdmVkRmlsZU5hbWUpKTtcbiAgfVxufVxuIl19