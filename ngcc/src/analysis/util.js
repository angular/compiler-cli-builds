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
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    function isWithinPackage(packagePath, sourceFile) {
        var relativePath = file_system_1.relative(packagePath, file_system_1.absoluteFromSourceFile(sourceFile));
        return !relativePath.startsWith('..') && !relativePath.startsWith('node_modules/');
    }
    exports.isWithinPackage = isWithinPackage;
    var NoopDependencyTracker = /** @class */ (function () {
        function NoopDependencyTracker() {
        }
        NoopDependencyTracker.prototype.addDependency = function () { };
        NoopDependencyTracker.prototype.addResourceDependency = function () { };
        NoopDependencyTracker.prototype.addTransitiveDependency = function () { };
        NoopDependencyTracker.prototype.addTransitiveResources = function () { };
        return NoopDependencyTracker;
    }());
    exports.NOOP_DEPENDENCY_TRACKER = new NoopDependencyTracker();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9hbmFseXNpcy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLDJFQUFnRztJQUdoRyxTQUFnQixlQUFlLENBQUMsV0FBMkIsRUFBRSxVQUF5QjtRQUNwRixJQUFNLFlBQVksR0FBRyxzQkFBUSxDQUFDLFdBQVcsRUFBRSxvQ0FBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQy9FLE9BQU8sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBSEQsMENBR0M7SUFFRDtRQUFBO1FBS0EsQ0FBQztRQUpDLDZDQUFhLEdBQWIsY0FBdUIsQ0FBQztRQUN4QixxREFBcUIsR0FBckIsY0FBK0IsQ0FBQztRQUNoQyx1REFBdUIsR0FBdkIsY0FBaUMsQ0FBQztRQUNsQyxzREFBc0IsR0FBdEIsY0FBZ0MsQ0FBQztRQUNuQyw0QkFBQztJQUFELENBQUMsQUFMRCxJQUtDO0lBRVksUUFBQSx1QkFBdUIsR0FBc0IsSUFBSSxxQkFBcUIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGgsIHJlbGF0aXZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZXBlbmRlbmN5VHJhY2tlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2luY3JlbWVudGFsL2FwaSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dpdGhpblBhY2thZ2UocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKHBhY2thZ2VQYXRoLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNvdXJjZUZpbGUpKTtcbiAgcmV0dXJuICFyZWxhdGl2ZVBhdGguc3RhcnRzV2l0aCgnLi4nKSAmJiAhcmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoJ25vZGVfbW9kdWxlcy8nKTtcbn1cblxuY2xhc3MgTm9vcERlcGVuZGVuY3lUcmFja2VyIGltcGxlbWVudHMgRGVwZW5kZW5jeVRyYWNrZXIge1xuICBhZGREZXBlbmRlbmN5KCk6IHZvaWQge31cbiAgYWRkUmVzb3VyY2VEZXBlbmRlbmN5KCk6IHZvaWQge31cbiAgYWRkVHJhbnNpdGl2ZURlcGVuZGVuY3koKTogdm9pZCB7fVxuICBhZGRUcmFuc2l0aXZlUmVzb3VyY2VzKCk6IHZvaWQge31cbn1cblxuZXhwb3J0IGNvbnN0IE5PT1BfREVQRU5ERU5DWV9UUkFDS0VSOiBEZXBlbmRlbmN5VHJhY2tlciA9IG5ldyBOb29wRGVwZW5kZW5jeVRyYWNrZXIoKTtcbiJdfQ==