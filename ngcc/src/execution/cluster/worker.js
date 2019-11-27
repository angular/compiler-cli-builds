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
        define("@angular/compiler-cli/ngcc/src/execution/cluster/worker", ["require", "exports", "cluster", "@angular/compiler-cli/ngcc/src/execution/cluster/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /// <reference types="node" />
    var cluster = require("cluster");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/utils");
    /**
     * A cluster worker is responsible for processing one task (i.e. one format property for a specific
     * entry-point) at a time and reporting results back to the cluster master.
     */
    var ClusterWorker = /** @class */ (function () {
        function ClusterWorker(createCompileFn) {
            if (cluster.isMaster) {
                throw new Error('Tried to instantiate `ClusterWorker` on the master process.');
            }
            this.compile =
                createCompileFn(function (_task, outcome) { return utils_1.sendMessageToMaster({ type: 'task-completed', outcome: outcome }); });
        }
        ClusterWorker.prototype.run = function () {
            var _this = this;
            // Listen for `ProcessTaskMessage`s and process tasks.
            cluster.worker.on('message', function (msg) {
                try {
                    switch (msg.type) {
                        case 'process-task':
                            return _this.compile(msg.task);
                        default:
                            throw new Error("Invalid message received on worker #" + cluster.worker.id + ": " + JSON.stringify(msg));
                    }
                }
                catch (err) {
                    utils_1.sendMessageToMaster({
                        type: 'error',
                        error: (err instanceof Error) ? (err.stack || err.message) : err,
                    });
                }
            });
            // Return a promise that is never resolved.
            return new Promise(function () { return undefined; });
        };
        return ClusterWorker;
    }());
    exports.ClusterWorker = ClusterWorker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9jbHVzdGVyL3dvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhCQUE4QjtJQUU5QixpQ0FBbUM7SUFLbkMsZ0ZBQTRDO0lBRzVDOzs7T0FHRztJQUNIO1FBR0UsdUJBQVksZUFBZ0M7WUFDMUMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO2dCQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLDZEQUE2RCxDQUFDLENBQUM7YUFDaEY7WUFFRCxJQUFJLENBQUMsT0FBTztnQkFDUixlQUFlLENBQUMsVUFBQyxLQUFLLEVBQUUsT0FBTyxJQUFLLE9BQUEsMkJBQW1CLENBQUMsRUFBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxTQUFBLEVBQUMsQ0FBQyxFQUF0RCxDQUFzRCxDQUFDLENBQUM7UUFDbEcsQ0FBQztRQUVELDJCQUFHLEdBQUg7WUFBQSxpQkFxQkM7WUFwQkMsc0RBQXNEO1lBQ3RELE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFDLEdBQW9CO2dCQUNoRCxJQUFJO29CQUNGLFFBQVEsR0FBRyxDQUFDLElBQUksRUFBRTt3QkFDaEIsS0FBSyxjQUFjOzRCQUNqQixPQUFPLEtBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNoQzs0QkFDRSxNQUFNLElBQUksS0FBSyxDQUNYLHlDQUF1QyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBSyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBRyxDQUFDLENBQUM7cUJBQzNGO2lCQUNGO2dCQUFDLE9BQU8sR0FBRyxFQUFFO29CQUNaLDJCQUFtQixDQUFDO3dCQUNsQixJQUFJLEVBQUUsT0FBTzt3QkFDYixLQUFLLEVBQUUsQ0FBQyxHQUFHLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7cUJBQ2pFLENBQUMsQ0FBQztpQkFDSjtZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsMkNBQTJDO1lBQzNDLE9BQU8sSUFBSSxPQUFPLENBQUMsY0FBTSxPQUFBLFNBQVMsRUFBVCxDQUFTLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBbENELElBa0NDO0lBbENZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG5pbXBvcnQgKiBhcyBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuXG5pbXBvcnQge0NvbXBpbGVGbiwgQ3JlYXRlQ29tcGlsZUZufSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge01lc3NhZ2VUb1dvcmtlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtzZW5kTWVzc2FnZVRvTWFzdGVyfSBmcm9tICcuL3V0aWxzJztcblxuXG4vKipcbiAqIEEgY2x1c3RlciB3b3JrZXIgaXMgcmVzcG9uc2libGUgZm9yIHByb2Nlc3Npbmcgb25lIHRhc2sgKGkuZS4gb25lIGZvcm1hdCBwcm9wZXJ0eSBmb3IgYSBzcGVjaWZpY1xuICogZW50cnktcG9pbnQpIGF0IGEgdGltZSBhbmQgcmVwb3J0aW5nIHJlc3VsdHMgYmFjayB0byB0aGUgY2x1c3RlciBtYXN0ZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbHVzdGVyV29ya2VyIHtcbiAgcHJpdmF0ZSBjb21waWxlOiBDb21waWxlRm47XG5cbiAgY29uc3RydWN0b3IoY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4pIHtcbiAgICBpZiAoY2x1c3Rlci5pc01hc3Rlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBpbnN0YW50aWF0ZSBgQ2x1c3RlcldvcmtlcmAgb24gdGhlIG1hc3RlciBwcm9jZXNzLicpO1xuICAgIH1cblxuICAgIHRoaXMuY29tcGlsZSA9XG4gICAgICAgIGNyZWF0ZUNvbXBpbGVGbigoX3Rhc2ssIG91dGNvbWUpID0+IHNlbmRNZXNzYWdlVG9NYXN0ZXIoe3R5cGU6ICd0YXNrLWNvbXBsZXRlZCcsIG91dGNvbWV9KSk7XG4gIH1cblxuICBydW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gTGlzdGVuIGZvciBgUHJvY2Vzc1Rhc2tNZXNzYWdlYHMgYW5kIHByb2Nlc3MgdGFza3MuXG4gICAgY2x1c3Rlci53b3JrZXIub24oJ21lc3NhZ2UnLCAobXNnOiBNZXNzYWdlVG9Xb3JrZXIpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaCAobXNnLnR5cGUpIHtcbiAgICAgICAgICBjYXNlICdwcm9jZXNzLXRhc2snOlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZShtc2cudGFzayk7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgSW52YWxpZCBtZXNzYWdlIHJlY2VpdmVkIG9uIHdvcmtlciAjJHtjbHVzdGVyLndvcmtlci5pZH06ICR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHNlbmRNZXNzYWdlVG9NYXN0ZXIoe1xuICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgZXJyb3I6IChlcnIgaW5zdGFuY2VvZiBFcnJvcikgPyAoZXJyLnN0YWNrIHx8IGVyci5tZXNzYWdlKSA6IGVycixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBSZXR1cm4gYSBwcm9taXNlIHRoYXQgaXMgbmV2ZXIgcmVzb2x2ZWQuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHVuZGVmaW5lZCk7XG4gIH1cbn1cbiJdfQ==