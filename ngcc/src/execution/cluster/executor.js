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
        function ClusterExecutor(workerCount, logger, pkgJsonUpdater) {
            this.workerCount = workerCount;
            this.logger = logger;
            this.pkgJsonUpdater = pkgJsonUpdater;
        }
        ClusterExecutor.prototype.execute = function (analyzeEntryPoints, createCompileFn) {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var master, worker;
                return tslib_1.__generator(this, function (_a) {
                    if (cluster.isMaster) {
                        this.logger.debug("Running ngcc on " + this.constructor.name + " (using " + this.workerCount + " worker processes).");
                        master = new master_1.ClusterMaster(this.workerCount, this.logger, this.pkgJsonUpdater, analyzeEntryPoints);
                        return [2 /*return*/, master.run()];
                    }
                    else {
                        worker = new worker_1.ClusterWorker(createCompileFn);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBRTlCLGlDQUFtQztJQU1uQyxrRkFBdUM7SUFDdkMsa0ZBQXVDO0lBR3ZDOzs7T0FHRztJQUNIO1FBQ0UseUJBQ1ksV0FBbUIsRUFBVSxNQUFjLEVBQzNDLGNBQWtDO1lBRGxDLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUMzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBb0I7UUFBRyxDQUFDO1FBRTVDLGlDQUFPLEdBQWIsVUFBYyxrQkFBd0MsRUFBRSxlQUFnQzs7OztvQkFFdEYsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO3dCQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDYixxQkFBbUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGdCQUFXLElBQUksQ0FBQyxXQUFXLHdCQUFxQixDQUFDLENBQUM7d0JBR3hGLE1BQU0sR0FDUixJQUFJLHNCQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQzt3QkFDOUYsc0JBQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFDO3FCQUNyQjt5QkFBTTt3QkFFQyxNQUFNLEdBQUcsSUFBSSxzQkFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDO3dCQUNsRCxzQkFBTyxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUM7cUJBQ3JCOzs7O1NBQ0Y7UUFDSCxzQkFBQztJQUFELENBQUMsQUFyQkQsSUFxQkM7SUFyQlksMENBQWUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCAqIGFzIGNsdXN0ZXIgZnJvbSAnY2x1c3Rlcic7XG5cbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi4vLi4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge0FuYWx5emVFbnRyeVBvaW50c0ZuLCBDcmVhdGVDb21waWxlRm4sIEV4ZWN1dG9yfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge0NsdXN0ZXJNYXN0ZXJ9IGZyb20gJy4vbWFzdGVyJztcbmltcG9ydCB7Q2x1c3Rlcldvcmtlcn0gZnJvbSAnLi93b3JrZXInO1xuXG5cbi8qKlxuICogQW4gYEV4ZWN1dG9yYCB0aGF0IHByb2Nlc3NlcyB0YXNrcyBpbiBwYXJhbGxlbCAob24gbXVsdGlwbGUgcHJvY2Vzc2VzKSBhbmQgY29tcGxldGVzXG4gKiBhc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIENsdXN0ZXJFeGVjdXRvciBpbXBsZW1lbnRzIEV4ZWN1dG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHdvcmtlckNvdW50OiBudW1iZXIsIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIpIHt9XG5cbiAgYXN5bmMgZXhlY3V0ZShhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuLCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbik6XG4gICAgICBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoY2x1c3Rlci5pc01hc3Rlcikge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICAgYFJ1bm5pbmcgbmdjYyBvbiAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gKHVzaW5nICR7dGhpcy53b3JrZXJDb3VudH0gd29ya2VyIHByb2Nlc3NlcykuYCk7XG5cbiAgICAgIC8vIFRoaXMgcHJvY2VzcyBpcyB0aGUgY2x1c3RlciBtYXN0ZXIuXG4gICAgICBjb25zdCBtYXN0ZXIgPVxuICAgICAgICAgIG5ldyBDbHVzdGVyTWFzdGVyKHRoaXMud29ya2VyQ291bnQsIHRoaXMubG9nZ2VyLCB0aGlzLnBrZ0pzb25VcGRhdGVyLCBhbmFseXplRW50cnlQb2ludHMpO1xuICAgICAgcmV0dXJuIG1hc3Rlci5ydW4oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBwcm9jZXNzIGlzIGEgY2x1c3RlciB3b3JrZXIuXG4gICAgICBjb25zdCB3b3JrZXIgPSBuZXcgQ2x1c3RlcldvcmtlcihjcmVhdGVDb21waWxlRm4pO1xuICAgICAgcmV0dXJuIHdvcmtlci5ydW4oKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==