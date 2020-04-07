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
        define("@angular/compiler-cli/ngcc/src/execution/cluster/worker", ["require", "exports", "cluster", "@angular/compiler-cli/ngcc/src/execution/tasks/utils", "@angular/compiler-cli/ngcc/src/execution/cluster/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /// <reference types="node" />
    var cluster = require("cluster");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/utils");
    var utils_2 = require("@angular/compiler-cli/ngcc/src/execution/cluster/utils");
    /**
     * A cluster worker is responsible for processing one task (i.e. one format property for a specific
     * entry-point) at a time and reporting results back to the cluster master.
     */
    var ClusterWorker = /** @class */ (function () {
        function ClusterWorker(logger, createCompileFn) {
            this.logger = logger;
            if (cluster.isMaster) {
                throw new Error('Tried to instantiate `ClusterWorker` on the master process.');
            }
            this.compile = createCompileFn(function (_task, outcome, message) {
                return utils_2.sendMessageToMaster({ type: 'task-completed', outcome: outcome, message: message });
            });
        }
        ClusterWorker.prototype.run = function () {
            var _this = this;
            // Listen for `ProcessTaskMessage`s and process tasks.
            cluster.worker.on('message', function (msg) {
                try {
                    switch (msg.type) {
                        case 'process-task':
                            _this.logger.debug("[Worker #" + cluster.worker.id + "] Processing task: " + utils_1.stringifyTask(msg.task));
                            return _this.compile(msg.task);
                        default:
                            throw new Error("[Worker #" + cluster.worker.id + "] Invalid message received: " + JSON.stringify(msg));
                    }
                }
                catch (err) {
                    utils_2.sendMessageToMaster({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9jbHVzdGVyL3dvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhCQUE4QjtJQUU5QixpQ0FBbUM7SUFJbkMsOEVBQTZDO0lBRzdDLGdGQUE0QztJQUc1Qzs7O09BR0c7SUFDSDtRQUdFLHVCQUFvQixNQUFjLEVBQUUsZUFBZ0M7WUFBaEQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUNoQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUU7Z0JBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkRBQTZELENBQUMsQ0FBQzthQUNoRjtZQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsZUFBZSxDQUMxQixVQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTztnQkFDcEIsT0FBQSwyQkFBbUIsQ0FBQyxFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLFNBQUEsRUFBRSxPQUFPLFNBQUEsRUFBQyxDQUFDO1lBQS9ELENBQStELENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBRUQsMkJBQUcsR0FBSDtZQUFBLGlCQXVCQztZQXRCQyxzREFBc0Q7WUFDdEQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQUMsR0FBb0I7Z0JBQ2hELElBQUk7b0JBQ0YsUUFBUSxHQUFHLENBQUMsSUFBSSxFQUFFO3dCQUNoQixLQUFLLGNBQWM7NEJBQ2pCLEtBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNiLGNBQVksT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLDJCQUFzQixxQkFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDOzRCQUNsRixPQUFPLEtBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNoQzs0QkFDRSxNQUFNLElBQUksS0FBSyxDQUNYLGNBQVksT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLG9DQUErQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBRyxDQUFDLENBQUM7cUJBQzFGO2lCQUNGO2dCQUFDLE9BQU8sR0FBRyxFQUFFO29CQUNaLDJCQUFtQixDQUFDO3dCQUNsQixJQUFJLEVBQUUsT0FBTzt3QkFDYixLQUFLLEVBQUUsQ0FBQyxHQUFHLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7cUJBQ2pFLENBQUMsQ0FBQztpQkFDSjtZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsMkNBQTJDO1lBQzNDLE9BQU8sSUFBSSxPQUFPLENBQUMsY0FBTSxPQUFBLFNBQVMsRUFBVCxDQUFTLENBQUMsQ0FBQztRQUN0QyxDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBckNELElBcUNDO0lBckNZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG5pbXBvcnQgKiBhcyBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuXG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtDb21waWxlRm4sIENyZWF0ZUNvbXBpbGVGbn0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7c3RyaW5naWZ5VGFza30gZnJvbSAnLi4vdGFza3MvdXRpbHMnO1xuXG5pbXBvcnQge01lc3NhZ2VUb1dvcmtlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtzZW5kTWVzc2FnZVRvTWFzdGVyfSBmcm9tICcuL3V0aWxzJztcblxuXG4vKipcbiAqIEEgY2x1c3RlciB3b3JrZXIgaXMgcmVzcG9uc2libGUgZm9yIHByb2Nlc3Npbmcgb25lIHRhc2sgKGkuZS4gb25lIGZvcm1hdCBwcm9wZXJ0eSBmb3IgYSBzcGVjaWZpY1xuICogZW50cnktcG9pbnQpIGF0IGEgdGltZSBhbmQgcmVwb3J0aW5nIHJlc3VsdHMgYmFjayB0byB0aGUgY2x1c3RlciBtYXN0ZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbHVzdGVyV29ya2VyIHtcbiAgcHJpdmF0ZSBjb21waWxlOiBDb21waWxlRm47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBsb2dnZXI6IExvZ2dlciwgY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4pIHtcbiAgICBpZiAoY2x1c3Rlci5pc01hc3Rlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBpbnN0YW50aWF0ZSBgQ2x1c3RlcldvcmtlcmAgb24gdGhlIG1hc3RlciBwcm9jZXNzLicpO1xuICAgIH1cblxuICAgIHRoaXMuY29tcGlsZSA9IGNyZWF0ZUNvbXBpbGVGbihcbiAgICAgICAgKF90YXNrLCBvdXRjb21lLCBtZXNzYWdlKSA9PlxuICAgICAgICAgICAgc2VuZE1lc3NhZ2VUb01hc3Rlcih7dHlwZTogJ3Rhc2stY29tcGxldGVkJywgb3V0Y29tZSwgbWVzc2FnZX0pKTtcbiAgfVxuXG4gIHJ1bigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBMaXN0ZW4gZm9yIGBQcm9jZXNzVGFza01lc3NhZ2VgcyBhbmQgcHJvY2VzcyB0YXNrcy5cbiAgICBjbHVzdGVyLndvcmtlci5vbignbWVzc2FnZScsIChtc2c6IE1lc3NhZ2VUb1dvcmtlcikgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoIChtc2cudHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3Byb2Nlc3MtdGFzayc6XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgICAgICAgICBgW1dvcmtlciAjJHtjbHVzdGVyLndvcmtlci5pZH1dIFByb2Nlc3NpbmcgdGFzazogJHtzdHJpbmdpZnlUYXNrKG1zZy50YXNrKX1gKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBpbGUobXNnLnRhc2spO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYFtXb3JrZXIgIyR7Y2x1c3Rlci53b3JrZXIuaWR9XSBJbnZhbGlkIG1lc3NhZ2UgcmVjZWl2ZWQ6ICR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHNlbmRNZXNzYWdlVG9NYXN0ZXIoe1xuICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgZXJyb3I6IChlcnIgaW5zdGFuY2VvZiBFcnJvcikgPyAoZXJyLnN0YWNrIHx8IGVyci5tZXNzYWdlKSA6IGVycixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBSZXR1cm4gYSBwcm9taXNlIHRoYXQgaXMgbmV2ZXIgcmVzb2x2ZWQuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHVuZGVmaW5lZCk7XG4gIH1cbn1cbiJdfQ==