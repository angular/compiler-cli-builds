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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBRTlCLGlDQUFtQztJQU9uQyxrRkFBdUM7SUFDdkMsa0ZBQXVDO0lBR3ZDOzs7T0FHRztJQUNIO1FBQ0UseUJBQ1ksV0FBbUIsRUFBVSxNQUFjLEVBQzNDLGNBQWtDLEVBQVUsUUFBb0I7WUFEaEUsZ0JBQVcsR0FBWCxXQUFXLENBQVE7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQzNDLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQVk7UUFBRyxDQUFDO1FBRTFFLGlDQUFPLEdBQWIsVUFBYyxrQkFBd0MsRUFBRSxlQUFnQzs7Ozs7b0JBRXRGLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTt3QkFDcEIsc0NBQXNDO3dCQUN0QyxzQkFBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQ0FDeEIsS0FBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2IscUJBQW1CLEtBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxnQkFBVyxLQUFJLENBQUMsV0FBVyx3QkFBcUIsQ0FBQyxDQUFDO2dDQUM5RixJQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFhLENBQzVCLEtBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSSxDQUFDLE1BQU0sRUFBRSxLQUFJLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0NBQzVFLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDOzRCQUN0QixDQUFDLENBQUMsRUFBQztxQkFDSjt5QkFBTTt3QkFFQyxNQUFNLEdBQUcsSUFBSSxzQkFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUM7d0JBQy9ELHNCQUFPLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBQztxQkFDckI7Ozs7U0FDRjtRQUNILHNCQUFDO0lBQUQsQ0FBQyxBQXRCRCxJQXNCQztJQXRCWSwwQ0FBZSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0ICogYXMgY2x1c3RlciBmcm9tICdjbHVzdGVyJztcblxuaW1wb3J0IHtTeW5jTG9ja2VyfSBmcm9tICcuLi8uLi9sb2NraW5nL3N5bmNfbG9ja2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi4vLi4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge0FuYWx5emVFbnRyeVBvaW50c0ZuLCBDcmVhdGVDb21waWxlRm4sIEV4ZWN1dG9yfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge0NsdXN0ZXJNYXN0ZXJ9IGZyb20gJy4vbWFzdGVyJztcbmltcG9ydCB7Q2x1c3Rlcldvcmtlcn0gZnJvbSAnLi93b3JrZXInO1xuXG5cbi8qKlxuICogQW4gYEV4ZWN1dG9yYCB0aGF0IHByb2Nlc3NlcyB0YXNrcyBpbiBwYXJhbGxlbCAob24gbXVsdGlwbGUgcHJvY2Vzc2VzKSBhbmQgY29tcGxldGVzXG4gKiBhc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIENsdXN0ZXJFeGVjdXRvciBpbXBsZW1lbnRzIEV4ZWN1dG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHdvcmtlckNvdW50OiBudW1iZXIsIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIHByaXZhdGUgbG9ja0ZpbGU6IFN5bmNMb2NrZXIpIHt9XG5cbiAgYXN5bmMgZXhlY3V0ZShhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuLCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbik6XG4gICAgICBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoY2x1c3Rlci5pc01hc3Rlcikge1xuICAgICAgLy8gVGhpcyBwcm9jZXNzIGlzIHRoZSBjbHVzdGVyIG1hc3Rlci5cbiAgICAgIHJldHVybiB0aGlzLmxvY2tGaWxlLmxvY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgICAgIGBSdW5uaW5nIG5nY2Mgb24gJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICh1c2luZyAke3RoaXMud29ya2VyQ291bnR9IHdvcmtlciBwcm9jZXNzZXMpLmApO1xuICAgICAgICBjb25zdCBtYXN0ZXIgPSBuZXcgQ2x1c3Rlck1hc3RlcihcbiAgICAgICAgICAgIHRoaXMud29ya2VyQ291bnQsIHRoaXMubG9nZ2VyLCB0aGlzLnBrZ0pzb25VcGRhdGVyLCBhbmFseXplRW50cnlQb2ludHMpO1xuICAgICAgICByZXR1cm4gbWFzdGVyLnJ1bigpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoaXMgcHJvY2VzcyBpcyBhIGNsdXN0ZXIgd29ya2VyLlxuICAgICAgY29uc3Qgd29ya2VyID0gbmV3IENsdXN0ZXJXb3JrZXIodGhpcy5sb2dnZXIsIGNyZWF0ZUNvbXBpbGVGbik7XG4gICAgICByZXR1cm4gd29ya2VyLnJ1bigpO1xuICAgIH1cbiAgfVxufVxuIl19