(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var esm_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    /**
     * Helper functions for computing dependencies via typings files.
     */
    var DtsDependencyHost = /** @class */ (function (_super) {
        tslib_1.__extends(DtsDependencyHost, _super);
        function DtsDependencyHost(fs, pathMappings) {
            return _super.call(this, fs, new module_resolver_1.ModuleResolver(fs, pathMappings, ['', '.d.ts', '/index.d.ts'])) || this;
        }
        return DtsDependencyHost;
    }(esm_dependency_host_1.EsmDependencyHost));
    exports.DtsDependencyHost = DtsDependencyHost;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzX2RlcGVuZGVuY3lfaG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZHRzX2RlcGVuZGVuY3lfaG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFTQSx1R0FBd0Q7SUFDeEQsK0ZBQWlEO0lBRWpEOztPQUVHO0lBQ0g7UUFBdUMsNkNBQWlCO1FBQ3RELDJCQUFZLEVBQWMsRUFBRSxZQUEyQjttQkFDckQsa0JBQU0sRUFBRSxFQUFFLElBQUksZ0NBQWMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQy9FLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUFKRCxDQUF1Qyx1Q0FBaUIsR0FJdkQ7SUFKWSw4Q0FBaUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9lc21fZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vbW9kdWxlX3Jlc29sdmVyJztcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb25zIGZvciBjb21wdXRpbmcgZGVwZW5kZW5jaWVzIHZpYSB0eXBpbmdzIGZpbGVzLlxuICovXG5leHBvcnQgY2xhc3MgRHRzRGVwZW5kZW5jeUhvc3QgZXh0ZW5kcyBFc21EZXBlbmRlbmN5SG9zdCB7XG4gIGNvbnN0cnVjdG9yKGZzOiBGaWxlU3lzdGVtLCBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3MpIHtcbiAgICBzdXBlcihmcywgbmV3IE1vZHVsZVJlc29sdmVyKGZzLCBwYXRoTWFwcGluZ3MsIFsnJywgJy5kLnRzJywgJy9pbmRleC5kLnRzJ10pKTtcbiAgfVxufVxuIl19