/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/cluster/executor", ["require", "exports", "tslib", "cluster", "@angular/compiler-cli/ngcc/src/execution/cluster/master", "@angular/compiler-cli/ngcc/src/execution/cluster/worker"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /// <reference types="node" />
    var cluster = require("cluster");
    var master_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/master");
    var worker_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/worker");
    /**
     * An `Executor` that processes tasks in parallel (on multiple processes) and completes
     * asynchronously.
     */
    var ClusterExecutor = /** @class */ (function () {
        function ClusterExecutor(workerCount, logger, pkgJsonUpdater, lockFile, createTaskCompletedCallback) {
            this.workerCount = workerCount;
            this.logger = logger;
            this.pkgJsonUpdater = pkgJsonUpdater;
            this.lockFile = lockFile;
            this.createTaskCompletedCallback = createTaskCompletedCallback;
        }
        ClusterExecutor.prototype.execute = function (analyzeEntryPoints, createCompileFn) {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var worker;
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    if (cluster.isMaster) {
                        // This process is the cluster master.
                        return [2 /*return*/, this.lockFile.lock(function () {
                                _this.logger.debug("Running ngcc on " + _this.constructor.name + " (using " + _this.workerCount + " worker processes).");
                                var master = new master_1.ClusterMaster(_this.workerCount, _this.logger, _this.pkgJsonUpdater, analyzeEntryPoints, _this.createTaskCompletedCallback);
                                return master.run();
                            })];
                    }
                    else {
                        worker = new worker_1.ClusterWorker(this.logger, createCompileFn);
                        return [2 /*return*/, worker.run()];
                    }
                    return [2 /*return*/];
                });
            });
        };
        return ClusterExecutor;
    }());
    exports.ClusterExecutor = ClusterExecutor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBRTlCLGlDQUFtQztJQVFuQyxrRkFBdUM7SUFDdkMsa0ZBQXVDO0lBR3ZDOzs7T0FHRztJQUNIO1FBQ0UseUJBQ1ksV0FBbUIsRUFBVSxNQUFjLEVBQzNDLGNBQWtDLEVBQVUsUUFBcUIsRUFDakUsMkJBQXdEO1lBRnhELGdCQUFXLEdBQVgsV0FBVyxDQUFRO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUMzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBb0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFhO1lBQ2pFLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFBRyxDQUFDO1FBRWxFLGlDQUFPLEdBQWIsVUFBYyxrQkFBd0MsRUFBRSxlQUFnQzs7Ozs7b0JBRXRGLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTt3QkFDcEIsc0NBQXNDO3dCQUN0QyxzQkFBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQ0FDeEIsS0FBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMscUJBQW1CLEtBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxnQkFDdEQsS0FBSSxDQUFDLFdBQVcsd0JBQXFCLENBQUMsQ0FBQztnQ0FDM0MsSUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBYSxDQUM1QixLQUFJLENBQUMsV0FBVyxFQUFFLEtBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsRUFDdEUsS0FBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0NBQ3RDLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDOzRCQUN0QixDQUFDLENBQUMsRUFBQztxQkFDSjt5QkFBTTt3QkFFQyxNQUFNLEdBQUcsSUFBSSxzQkFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7d0JBQy9ELHNCQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBQztxQkFDckI7Ozs7U0FDRjtRQUNILHNCQUFDO0lBQUQsQ0FBQyxBQXhCRCxJQXdCQztJQXhCWSwwQ0FBZSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0ICogYXMgY2x1c3RlciBmcm9tICdjbHVzdGVyJztcblxuaW1wb3J0IHtBc3luY0xvY2tlcn0gZnJvbSAnLi4vLi4vbG9ja2luZy9hc3luY19sb2NrZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7UGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuLi8uLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm4sIENyZWF0ZUNvbXBpbGVGbiwgRXhlY3V0b3J9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge0NyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFja30gZnJvbSAnLi4vdGFza3MvYXBpJztcblxuaW1wb3J0IHtDbHVzdGVyTWFzdGVyfSBmcm9tICcuL21hc3Rlcic7XG5pbXBvcnQge0NsdXN0ZXJXb3JrZXJ9IGZyb20gJy4vd29ya2VyJztcblxuXG4vKipcbiAqIEFuIGBFeGVjdXRvcmAgdGhhdCBwcm9jZXNzZXMgdGFza3MgaW4gcGFyYWxsZWwgKG9uIG11bHRpcGxlIHByb2Nlc3NlcykgYW5kIGNvbXBsZXRlc1xuICogYXN5bmNocm9ub3VzbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbHVzdGVyRXhlY3V0b3IgaW1wbGVtZW50cyBFeGVjdXRvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB3b3JrZXJDb3VudDogbnVtYmVyLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBwcml2YXRlIGxvY2tGaWxlOiBBc3luY0xvY2tlcixcbiAgICAgIHByaXZhdGUgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spIHt9XG5cbiAgYXN5bmMgZXhlY3V0ZShhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuLCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbik6XG4gICAgICBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoY2x1c3Rlci5pc01hc3Rlcikge1xuICAgICAgLy8gVGhpcyBwcm9jZXNzIGlzIHRoZSBjbHVzdGVyIG1hc3Rlci5cbiAgICAgIHJldHVybiB0aGlzLmxvY2tGaWxlLmxvY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUnVubmluZyBuZ2NjIG9uICR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSAodXNpbmcgJHtcbiAgICAgICAgICAgIHRoaXMud29ya2VyQ291bnR9IHdvcmtlciBwcm9jZXNzZXMpLmApO1xuICAgICAgICBjb25zdCBtYXN0ZXIgPSBuZXcgQ2x1c3Rlck1hc3RlcihcbiAgICAgICAgICAgIHRoaXMud29ya2VyQ291bnQsIHRoaXMubG9nZ2VyLCB0aGlzLnBrZ0pzb25VcGRhdGVyLCBhbmFseXplRW50cnlQb2ludHMsXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayk7XG4gICAgICAgIHJldHVybiBtYXN0ZXIucnVuKCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBwcm9jZXNzIGlzIGEgY2x1c3RlciB3b3JrZXIuXG4gICAgICBjb25zdCB3b3JrZXIgPSBuZXcgQ2x1c3Rlcldvcmtlcih0aGlzLmxvZ2dlciwgY3JlYXRlQ29tcGlsZUZuKTtcbiAgICAgIHJldHVybiB3b3JrZXIucnVuKCk7XG4gICAgfVxuICB9XG59XG4iXX0=