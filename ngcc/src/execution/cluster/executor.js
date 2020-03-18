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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBRTlCLGlDQUFtQztJQVFuQyxrRkFBdUM7SUFDdkMsa0ZBQXVDO0lBR3ZDOzs7T0FHRztJQUNIO1FBQ0UseUJBQ1ksV0FBbUIsRUFBVSxNQUFjLEVBQzNDLGNBQWtDLEVBQVUsUUFBcUIsRUFDakUsMkJBQXdEO1lBRnhELGdCQUFXLEdBQVgsV0FBVyxDQUFRO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUMzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBb0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFhO1lBQ2pFLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFBRyxDQUFDO1FBRWxFLGlDQUFPLEdBQWIsVUFBYyxrQkFBd0MsRUFBRSxlQUFnQzs7Ozs7b0JBRXRGLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTt3QkFDcEIsc0NBQXNDO3dCQUN0QyxzQkFBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQ0FDeEIsS0FBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2IscUJBQW1CLEtBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxnQkFBVyxLQUFJLENBQUMsV0FBVyx3QkFBcUIsQ0FBQyxDQUFDO2dDQUM5RixJQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFhLENBQzVCLEtBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSSxDQUFDLE1BQU0sRUFBRSxLQUFJLENBQUMsY0FBYyxFQUFFLGtCQUFrQixFQUN0RSxLQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQ0FDdEMsT0FBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7NEJBQ3RCLENBQUMsQ0FBQyxFQUFDO3FCQUNKO3lCQUFNO3dCQUVDLE1BQU0sR0FBRyxJQUFJLHNCQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQzt3QkFDL0Qsc0JBQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFDO3FCQUNyQjs7OztTQUNGO1FBQ0gsc0JBQUM7SUFBRCxDQUFDLEFBeEJELElBd0JDO0lBeEJZLDBDQUFlIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG5pbXBvcnQgKiBhcyBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuXG5pbXBvcnQge0FzeW5jTG9ja2VyfSBmcm9tICcuLi8uLi9sb2NraW5nL2FzeW5jX2xvY2tlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4uLy4uL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbiwgQ3JlYXRlQ29tcGlsZUZuLCBFeGVjdXRvcn0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7Q3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrfSBmcm9tICcuLi90YXNrcy9hcGknO1xuXG5pbXBvcnQge0NsdXN0ZXJNYXN0ZXJ9IGZyb20gJy4vbWFzdGVyJztcbmltcG9ydCB7Q2x1c3Rlcldvcmtlcn0gZnJvbSAnLi93b3JrZXInO1xuXG5cbi8qKlxuICogQW4gYEV4ZWN1dG9yYCB0aGF0IHByb2Nlc3NlcyB0YXNrcyBpbiBwYXJhbGxlbCAob24gbXVsdGlwbGUgcHJvY2Vzc2VzKSBhbmQgY29tcGxldGVzXG4gKiBhc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIENsdXN0ZXJFeGVjdXRvciBpbXBsZW1lbnRzIEV4ZWN1dG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHdvcmtlckNvdW50OiBudW1iZXIsIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIHByaXZhdGUgbG9ja0ZpbGU6IEFzeW5jTG9ja2VyLFxuICAgICAgcHJpdmF0ZSBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2s6IENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjaykge31cblxuICBhc3luYyBleGVjdXRlKGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4sIGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuKTpcbiAgICAgIFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChjbHVzdGVyLmlzTWFzdGVyKSB7XG4gICAgICAvLyBUaGlzIHByb2Nlc3MgaXMgdGhlIGNsdXN0ZXIgbWFzdGVyLlxuICAgICAgcmV0dXJuIHRoaXMubG9ja0ZpbGUubG9jaygoKSA9PiB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAgICAgYFJ1bm5pbmcgbmdjYyBvbiAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gKHVzaW5nICR7dGhpcy53b3JrZXJDb3VudH0gd29ya2VyIHByb2Nlc3NlcykuYCk7XG4gICAgICAgIGNvbnN0IG1hc3RlciA9IG5ldyBDbHVzdGVyTWFzdGVyKFxuICAgICAgICAgICAgdGhpcy53b3JrZXJDb3VudCwgdGhpcy5sb2dnZXIsIHRoaXMucGtnSnNvblVwZGF0ZXIsIGFuYWx5emVFbnRyeVBvaW50cyxcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIG1hc3Rlci5ydW4oKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIHByb2Nlc3MgaXMgYSBjbHVzdGVyIHdvcmtlci5cbiAgICAgIGNvbnN0IHdvcmtlciA9IG5ldyBDbHVzdGVyV29ya2VyKHRoaXMubG9nZ2VyLCBjcmVhdGVDb21waWxlRm4pO1xuICAgICAgcmV0dXJuIHdvcmtlci5ydW4oKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==