(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/analysis/util", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NOOP_DEPENDENCY_TRACKER = exports.isWithinPackage = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    function isWithinPackage(packagePath, filePath) {
        var relativePath = file_system_1.relative(packagePath, filePath);
        return file_system_1.isLocalRelativePath(relativePath) && !relativePath.startsWith('node_modules/');
    }
    exports.isWithinPackage = isWithinPackage;
    var NoopDependencyTracker = /** @class */ (function () {
        function NoopDependencyTracker() {
        }
        NoopDependencyTracker.prototype.addDependency = function () { };
        NoopDependencyTracker.prototype.addResourceDependency = function () { };
        NoopDependencyTracker.prototype.recordDependencyAnalysisFailure = function () { };
        return NoopDependencyTracker;
    }());
    exports.NOOP_DEPENDENCY_TRACKER = new NoopDependencyTracker();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUE2RjtJQUc3RixTQUFnQixlQUFlLENBQUMsV0FBMkIsRUFBRSxRQUF3QjtRQUNuRixJQUFNLFlBQVksR0FBRyxzQkFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNyRCxPQUFPLGlDQUFtQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBSEQsMENBR0M7SUFFRDtRQUFBO1FBSUEsQ0FBQztRQUhDLDZDQUFhLEdBQWIsY0FBdUIsQ0FBQztRQUN4QixxREFBcUIsR0FBckIsY0FBK0IsQ0FBQztRQUNoQywrREFBK0IsR0FBL0IsY0FBeUMsQ0FBQztRQUM1Qyw0QkFBQztJQUFELENBQUMsQUFKRCxJQUlDO0lBRVksUUFBQSx1QkFBdUIsR0FBc0IsSUFBSSxxQkFBcUIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBpc0xvY2FsUmVsYXRpdmVQYXRoLCByZWxhdGl2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q29tcG9uZW50UmVzb2x1dGlvblJlZ2lzdHJ5LCBEZXBlbmRlbmN5VHJhY2tlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2luY3JlbWVudGFsL2FwaSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpdGhpblBhY2thZ2UocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCBmaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgY29uc3QgcmVsYXRpdmVQYXRoID0gcmVsYXRpdmUocGFja2FnZVBhdGgsIGZpbGVQYXRoKTtcbiAgcmV0dXJuIGlzTG9jYWxSZWxhdGl2ZVBhdGgocmVsYXRpdmVQYXRoKSAmJiAhcmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoJ25vZGVfbW9kdWxlcy8nKTtcbn1cblxuY2xhc3MgTm9vcERlcGVuZGVuY3lUcmFja2VyIGltcGxlbWVudHMgRGVwZW5kZW5jeVRyYWNrZXIge1xuICBhZGREZXBlbmRlbmN5KCk6IHZvaWQge31cbiAgYWRkUmVzb3VyY2VEZXBlbmRlbmN5KCk6IHZvaWQge31cbiAgcmVjb3JkRGVwZW5kZW5jeUFuYWx5c2lzRmFpbHVyZSgpOiB2b2lkIHt9XG59XG5cbmV4cG9ydCBjb25zdCBOT09QX0RFUEVOREVOQ1lfVFJBQ0tFUjogRGVwZW5kZW5jeVRyYWNrZXIgPSBuZXcgTm9vcERlcGVuZGVuY3lUcmFja2VyKCk7XG4iXX0=