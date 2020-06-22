(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/cluster/executor", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/execution/cluster/master"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ClusterExecutor = void 0;
    var tslib_1 = require("tslib");
    var master_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/master");
    /**
     * An `Executor` that processes tasks in parallel (on multiple processes) and completes
     * asynchronously.
     */
    var ClusterExecutor = /** @class */ (function () {
        function ClusterExecutor(workerCount, fileSystem, logger, fileWriter, pkgJsonUpdater, lockFile, createTaskCompletedCallback) {
            this.workerCount = workerCount;
            this.fileSystem = fileSystem;
            this.logger = logger;
            this.fileWriter = fileWriter;
            this.pkgJsonUpdater = pkgJsonUpdater;
            this.lockFile = lockFile;
            this.createTaskCompletedCallback = createTaskCompletedCallback;
        }
        ClusterExecutor.prototype.execute = function (analyzeEntryPoints, _createCompileFn) {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    return [2 /*return*/, this.lockFile.lock(function () {
                            _this.logger.debug("Running ngcc on " + _this.constructor.name + " (using " + _this.workerCount + " worker processes).");
                            var master = new master_1.ClusterMaster(_this.workerCount, _this.fileSystem, _this.logger, _this.fileWriter, _this.pkgJsonUpdater, analyzeEntryPoints, _this.createTaskCompletedCallback);
                            return master.run();
                        })];
                });
            });
        };
        return ClusterExecutor;
    }());
    exports.ClusterExecutor = ClusterExecutor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQWVBLGtGQUF1QztJQUV2Qzs7O09BR0c7SUFDSDtRQUNFLHlCQUNZLFdBQW1CLEVBQVUsVUFBc0IsRUFBVSxNQUFjLEVBQzNFLFVBQXNCLEVBQVUsY0FBa0MsRUFDbEUsUUFBcUIsRUFDckIsMkJBQXdEO1lBSHhELGdCQUFXLEdBQVgsV0FBVyxDQUFRO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDM0UsZUFBVSxHQUFWLFVBQVUsQ0FBWTtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUNsRSxhQUFRLEdBQVIsUUFBUSxDQUFhO1lBQ3JCLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFBRyxDQUFDO1FBRWxFLGlDQUFPLEdBQWIsVUFBYyxrQkFBd0MsRUFBRSxnQkFBaUM7Ozs7b0JBRXZGLHNCQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDOzRCQUN4QixLQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDYixxQkFBbUIsS0FBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGdCQUFXLEtBQUksQ0FBQyxXQUFXLHdCQUFxQixDQUFDLENBQUM7NEJBQzlGLElBQU0sTUFBTSxHQUFHLElBQUksc0JBQWEsQ0FDNUIsS0FBSSxDQUFDLFdBQVcsRUFBRSxLQUFJLENBQUMsVUFBVSxFQUFFLEtBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSSxDQUFDLFVBQVUsRUFBRSxLQUFJLENBQUMsY0FBYyxFQUNwRixrQkFBa0IsRUFBRSxLQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQzs0QkFDMUQsT0FBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQ3RCLENBQUMsQ0FBQyxFQUFDOzs7U0FDSjtRQUNILHNCQUFDO0lBQUQsQ0FBQyxBQWxCRCxJQWtCQztJQWxCWSwwQ0FBZSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7QXN5bmNMb2NrZXJ9IGZyb20gJy4uLy4uL2xvY2tpbmcvYXN5bmNfbG9ja2VyJztcbmltcG9ydCB7RmlsZVdyaXRlcn0gZnJvbSAnLi4vLi4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi4vLi4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge0FuYWx5emVFbnRyeVBvaW50c0ZuLCBDcmVhdGVDb21waWxlRm4sIEV4ZWN1dG9yfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHtDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2t9IGZyb20gJy4uL3Rhc2tzL2FwaSc7XG5cbmltcG9ydCB7Q2x1c3Rlck1hc3Rlcn0gZnJvbSAnLi9tYXN0ZXInO1xuXG4vKipcbiAqIEFuIGBFeGVjdXRvcmAgdGhhdCBwcm9jZXNzZXMgdGFza3MgaW4gcGFyYWxsZWwgKG9uIG11bHRpcGxlIHByb2Nlc3NlcykgYW5kIGNvbXBsZXRlc1xuICogYXN5bmNocm9ub3VzbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbHVzdGVyRXhlY3V0b3IgaW1wbGVtZW50cyBFeGVjdXRvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB3b3JrZXJDb3VudDogbnVtYmVyLCBwcml2YXRlIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIGZpbGVXcml0ZXI6IEZpbGVXcml0ZXIsIHByaXZhdGUgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcixcbiAgICAgIHByaXZhdGUgbG9ja0ZpbGU6IEFzeW5jTG9ja2VyLFxuICAgICAgcHJpdmF0ZSBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2s6IENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjaykge31cblxuICBhc3luYyBleGVjdXRlKGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4sIF9jcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbik6XG4gICAgICBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5sb2NrRmlsZS5sb2NrKCgpID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAgIGBSdW5uaW5nIG5nY2Mgb24gJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICh1c2luZyAke3RoaXMud29ya2VyQ291bnR9IHdvcmtlciBwcm9jZXNzZXMpLmApO1xuICAgICAgY29uc3QgbWFzdGVyID0gbmV3IENsdXN0ZXJNYXN0ZXIoXG4gICAgICAgICAgdGhpcy53b3JrZXJDb3VudCwgdGhpcy5maWxlU3lzdGVtLCB0aGlzLmxvZ2dlciwgdGhpcy5maWxlV3JpdGVyLCB0aGlzLnBrZ0pzb25VcGRhdGVyLFxuICAgICAgICAgIGFuYWx5emVFbnRyeVBvaW50cywgdGhpcy5jcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuICAgICAgcmV0dXJuIG1hc3Rlci5ydW4oKTtcbiAgICB9KTtcbiAgfVxufVxuIl19