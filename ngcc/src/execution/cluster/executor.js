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
        function ClusterExecutor(workerCount, logger, pkgJsonUpdater, lockFile) {
            this.workerCount = workerCount;
            this.logger = logger;
            this.pkgJsonUpdater = pkgJsonUpdater;
            this.lockFile = lockFile;
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
                                var master = new master_1.ClusterMaster(_this.workerCount, _this.logger, _this.pkgJsonUpdater, analyzeEntryPoints);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBRTlCLGlDQUFtQztJQU9uQyxrRkFBdUM7SUFDdkMsa0ZBQXVDO0lBR3ZDOzs7T0FHRztJQUNIO1FBQ0UseUJBQ1ksV0FBbUIsRUFBVSxNQUFjLEVBQzNDLGNBQWtDLEVBQVUsUUFBdUI7WUFEbkUsZ0JBQVcsR0FBWCxXQUFXLENBQVE7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQzNDLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQWU7UUFBRyxDQUFDO1FBRTdFLGlDQUFPLEdBQWIsVUFBYyxrQkFBd0MsRUFBRSxlQUFnQzs7Ozs7b0JBRXRGLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTt3QkFDcEIsc0NBQXNDO3dCQUN0QyxzQkFBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQ0FDeEIsS0FBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2IscUJBQW1CLEtBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxnQkFBVyxLQUFJLENBQUMsV0FBVyx3QkFBcUIsQ0FBQyxDQUFDO2dDQUM5RixJQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFhLENBQzVCLEtBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSSxDQUFDLE1BQU0sRUFBRSxLQUFJLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0NBQzVFLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDOzRCQUN0QixDQUFDLENBQUMsRUFBQztxQkFDSjt5QkFBTTt3QkFFQyxNQUFNLEdBQUcsSUFBSSxzQkFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7d0JBQy9ELHNCQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBQztxQkFDckI7Ozs7U0FDRjtRQUNILHNCQUFDO0lBQUQsQ0FBQyxBQXRCRCxJQXNCQztJQXRCWSwwQ0FBZSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0ICogYXMgY2x1c3RlciBmcm9tICdjbHVzdGVyJztcblxuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7UGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuLi8uLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm4sIENyZWF0ZUNvbXBpbGVGbiwgRXhlY3V0b3J9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge0xvY2tGaWxlQXN5bmN9IGZyb20gJy4uL2xvY2tfZmlsZSc7XG5cbmltcG9ydCB7Q2x1c3Rlck1hc3Rlcn0gZnJvbSAnLi9tYXN0ZXInO1xuaW1wb3J0IHtDbHVzdGVyV29ya2VyfSBmcm9tICcuL3dvcmtlcic7XG5cblxuLyoqXG4gKiBBbiBgRXhlY3V0b3JgIHRoYXQgcHJvY2Vzc2VzIHRhc2tzIGluIHBhcmFsbGVsIChvbiBtdWx0aXBsZSBwcm9jZXNzZXMpIGFuZCBjb21wbGV0ZXNcbiAqIGFzeW5jaHJvbm91c2x5LlxuICovXG5leHBvcnQgY2xhc3MgQ2x1c3RlckV4ZWN1dG9yIGltcGxlbWVudHMgRXhlY3V0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgd29ya2VyQ291bnQ6IG51bWJlciwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgcHJpdmF0ZSBsb2NrRmlsZTogTG9ja0ZpbGVBc3luYykge31cblxuICBhc3luYyBleGVjdXRlKGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4sIGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuKTpcbiAgICAgIFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChjbHVzdGVyLmlzTWFzdGVyKSB7XG4gICAgICAvLyBUaGlzIHByb2Nlc3MgaXMgdGhlIGNsdXN0ZXIgbWFzdGVyLlxuICAgICAgcmV0dXJuIHRoaXMubG9ja0ZpbGUubG9jaygoKSA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAgICAgYFJ1bm5pbmcgbmdjYyBvbiAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gKHVzaW5nICR7dGhpcy53b3JrZXJDb3VudH0gd29ya2VyIHByb2Nlc3NlcykuYCk7XG4gICAgICAgIGNvbnN0IG1hc3RlciA9IG5ldyBDbHVzdGVyTWFzdGVyKFxuICAgICAgICAgICAgdGhpcy53b3JrZXJDb3VudCwgdGhpcy5sb2dnZXIsIHRoaXMucGtnSnNvblVwZGF0ZXIsIGFuYWx5emVFbnRyeVBvaW50cyk7XG4gICAgICAgIHJldHVybiBtYXN0ZXIucnVuKCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBwcm9jZXNzIGlzIGEgY2x1c3RlciB3b3JrZXIuXG4gICAgICBjb25zdCB3b3JrZXIgPSBuZXcgQ2x1c3Rlcldvcmtlcih0aGlzLmxvZ2dlciwgY3JlYXRlQ29tcGlsZUZuKTtcbiAgICAgIHJldHVybiB3b3JrZXIucnVuKCk7XG4gICAgfVxuICB9XG59XG4iXX0=