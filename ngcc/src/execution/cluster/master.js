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
        define("@angular/compiler-cli/ngcc/src/execution/cluster/master", ["require", "exports", "tslib", "cluster", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/execution/utils", "@angular/compiler-cli/ngcc/src/execution/cluster/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /// <reference types="node" />
    var cluster = require("cluster");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/utils");
    var utils_2 = require("@angular/compiler-cli/ngcc/src/execution/cluster/utils");
    /**
     * The cluster master is responsible for analyzing all entry-points, planning the work that needs to
     * be done, distributing it to worker-processes and collecting/post-processing the results.
     */
    var ClusterMaster = /** @class */ (function () {
        function ClusterMaster(workerCount, logger, pkgJsonUpdater, analyzeEntryPoints) {
            this.workerCount = workerCount;
            this.logger = logger;
            this.pkgJsonUpdater = pkgJsonUpdater;
            this.finishedDeferred = new utils_2.Deferred();
            this.processingStartTime = -1;
            this.taskAssignments = new Map();
            if (!cluster.isMaster) {
                throw new Error('Tried to instantiate `ClusterMaster` on a worker process.');
            }
            this.taskQueue = analyzeEntryPoints();
        }
        ClusterMaster.prototype.run = function () {
            var _this = this;
            if (this.taskQueue.allTasksCompleted) {
                return Promise.resolve();
            }
            // Set up listeners for worker events (emitted on `cluster`).
            cluster.on('online', this.wrapEventHandler(function (worker) { return _this.onWorkerOnline(worker.id); }));
            cluster.on('message', this.wrapEventHandler(function (worker, msg) { return _this.onWorkerMessage(worker.id, msg); }));
            cluster.on('exit', this.wrapEventHandler(function (worker, code, signal) { return _this.onWorkerExit(worker, code, signal); }));
            // Since we have pending tasks at the very minimum we need a single worker.
            cluster.fork();
            return this.finishedDeferred.promise.then(function () { return _this.stopWorkers(); }, function (err) {
                _this.stopWorkers();
                return Promise.reject(err);
            });
        };
        /** Try to find available (idle) workers and assign them available (non-blocked) tasks. */
        ClusterMaster.prototype.maybeDistributeWork = function () {
            var e_1, _a;
            var isWorkerAvailable = false;
            // First, check whether all tasks have been completed.
            if (this.taskQueue.allTasksCompleted) {
                var duration = Math.round((Date.now() - this.processingStartTime) / 100) / 10;
                this.logger.debug("Processed tasks in " + duration + "s.");
                return this.finishedDeferred.resolve();
            }
            try {
                // Look for available workers and available tasks to assign to them.
                for (var _b = tslib_1.__values(Array.from(this.taskAssignments)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_1.__read(_c.value, 2), workerId = _d[0], assignedTask = _d[1];
                    if (assignedTask !== null) {
                        // This worker already has a job; check other workers.
                        continue;
                    }
                    else {
                        // This worker is available.
                        isWorkerAvailable = true;
                    }
                    // This worker needs a job. See if any are available.
                    var task = this.taskQueue.getNextTask();
                    if (task === null) {
                        // No suitable work available right now.
                        break;
                    }
                    // Process the next task on the worker.
                    this.taskAssignments.set(workerId, task);
                    utils_2.sendMessageToWorker(workerId, { type: 'process-task', task: task });
                    isWorkerAvailable = false;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (!isWorkerAvailable) {
                if (this.taskAssignments.size < this.workerCount) {
                    this.logger.debug('Spawning another worker process as there is more work to be done.');
                    cluster.fork();
                }
                else {
                    // If there are no available workers or no available tasks, log (for debugging purposes).
                    this.logger.debug("All " + this.taskAssignments.size + " workers are currently busy and cannot take on more " +
                        'work.');
                }
            }
            else {
                var busyWorkers = Array.from(this.taskAssignments)
                    .filter(function (_a) {
                    var _b = tslib_1.__read(_a, 2), _workerId = _b[0], task = _b[1];
                    return task !== null;
                })
                    .map(function (_a) {
                    var _b = tslib_1.__read(_a, 1), workerId = _b[0];
                    return workerId;
                });
                var totalWorkerCount = this.taskAssignments.size;
                var idleWorkerCount = totalWorkerCount - busyWorkers.length;
                this.logger.debug("No assignments for " + idleWorkerCount + " idle (out of " + totalWorkerCount + " total) " +
                    ("workers. Busy workers: " + busyWorkers.join(', ')));
                if (busyWorkers.length === 0) {
                    // This is a bug:
                    // All workers are idle (meaning no tasks are in progress) and `taskQueue.allTasksCompleted`
                    // is `false`, but there is still no assignable work.
                    throw new Error('There are still unprocessed tasks in the queue and no tasks are currently in ' +
                        ("progress, yet the queue did not return any available tasks: " + this.taskQueue));
                }
            }
        };
        /** Handle a worker's exiting. (Might be intentional or not.) */
        ClusterMaster.prototype.onWorkerExit = function (worker, code, signal) {
            // If the worker's exiting was intentional, nothing to do.
            if (worker.exitedAfterDisconnect)
                return;
            // The worker exited unexpectedly: Determine it's status and take an appropriate action.
            var currentTask = this.taskAssignments.get(worker.id);
            this.logger.warn("Worker #" + worker.id + " exited unexpectedly (code: " + code + " | signal: " + signal + ").\n" +
                ("  Current assignment: " + ((currentTask == null) ? '-' : utils_1.stringifyTask(currentTask))));
            if (currentTask == null) {
                // The crashed worker process was not in the middle of a task:
                // Just spawn another process.
                this.logger.debug("Spawning another worker process to replace #" + worker.id + "...");
                this.taskAssignments.delete(worker.id);
                cluster.fork();
            }
            else {
                // The crashed worker process was in the middle of a task:
                // Impossible to know whether we can recover (without ending up with a corrupted entry-point).
                throw new Error('Process unexpectedly crashed, while processing format property ' +
                    (currentTask.formatProperty + " for entry-point '" + currentTask.entryPoint.path + "'."));
            }
        };
        /** Handle a message from a worker. */
        ClusterMaster.prototype.onWorkerMessage = function (workerId, msg) {
            if (!this.taskAssignments.has(workerId)) {
                var knownWorkers = Array.from(this.taskAssignments.keys());
                throw new Error("Received message from unknown worker #" + workerId + " (known workers: " +
                    (knownWorkers.join(', ') + "): " + JSON.stringify(msg)));
            }
            switch (msg.type) {
                case 'error':
                    throw new Error("Error on worker #" + workerId + ": " + msg.error);
                case 'task-completed':
                    return this.onWorkerTaskCompleted(workerId, msg);
                case 'update-package-json':
                    return this.onWorkerUpdatePackageJson(workerId, msg);
                default:
                    throw new Error("Invalid message received from worker #" + workerId + ": " + JSON.stringify(msg));
            }
        };
        /** Handle a worker's coming online. */
        ClusterMaster.prototype.onWorkerOnline = function (workerId) {
            if (this.taskAssignments.has(workerId)) {
                throw new Error("Invariant violated: Worker #" + workerId + " came online more than once.");
            }
            if (this.processingStartTime === -1) {
                this.logger.debug('Processing tasks...');
                this.processingStartTime = Date.now();
            }
            this.taskAssignments.set(workerId, null);
            this.maybeDistributeWork();
        };
        /** Handle a worker's having completed their assigned task. */
        ClusterMaster.prototype.onWorkerTaskCompleted = function (workerId, msg) {
            var task = this.taskAssignments.get(workerId) || null;
            if (task === null) {
                throw new Error("Expected worker #" + workerId + " to have a task assigned, while handling message: " +
                    JSON.stringify(msg));
            }
            utils_1.onTaskCompleted(this.pkgJsonUpdater, task, msg.outcome);
            this.taskQueue.markTaskCompleted(task);
            this.taskAssignments.set(workerId, null);
            this.maybeDistributeWork();
        };
        /** Handle a worker's request to update a `package.json` file. */
        ClusterMaster.prototype.onWorkerUpdatePackageJson = function (workerId, msg) {
            var task = this.taskAssignments.get(workerId) || null;
            if (task === null) {
                throw new Error("Expected worker #" + workerId + " to have a task assigned, while handling message: " +
                    JSON.stringify(msg));
            }
            var expectedPackageJsonPath = file_system_1.resolve(task.entryPoint.path, 'package.json');
            var parsedPackageJson = task.entryPoint.packageJson;
            if (expectedPackageJsonPath !== msg.packageJsonPath) {
                throw new Error("Received '" + msg.type + "' message from worker #" + workerId + " for '" + msg.packageJsonPath + "', " +
                    ("but was expecting '" + expectedPackageJsonPath + "' (based on task assignment)."));
            }
            // NOTE: Although the change in the parsed `package.json` will be reflected in tasks objects
            //       locally and thus also in future `process-task` messages sent to worker processes, any
            //       processes already running and processing a task for the same entry-point will not get
            //       the change.
            //       Do not rely on having an up-to-date `package.json` representation in worker processes.
            //       In other words, task processing should only rely on the info that was there when the
            //       file was initially parsed (during entry-point analysis) and not on the info that might
            //       be added later (during task processing).
            this.pkgJsonUpdater.writeChanges(msg.changes, msg.packageJsonPath, parsedPackageJson);
        };
        /** Stop all workers and stop listening on cluster events. */
        ClusterMaster.prototype.stopWorkers = function () {
            var workers = Object.values(cluster.workers);
            this.logger.debug("Stopping " + workers.length + " workers...");
            cluster.removeAllListeners();
            workers.forEach(function (worker) { return worker.kill(); });
        };
        /**
         * Wrap an event handler to ensure that `finishedDeferred` will be rejected on error (regardless
         * if the handler completes synchronously or asynchronously).
         */
        ClusterMaster.prototype.wrapEventHandler = function (fn) {
            var _this = this;
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var err_1;
                    return tslib_1.__generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, fn.apply(void 0, tslib_1.__spread(args))];
                            case 1:
                                _a.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                err_1 = _a.sent();
                                this.finishedDeferred.reject(err_1);
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            };
        };
        return ClusterMaster;
    }());
    exports.ClusterMaster = ClusterMaster;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9jbHVzdGVyL21hc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4QkFBOEI7SUFFOUIsaUNBQW1DO0lBRW5DLDJFQUEwRDtJQUkxRCx3RUFBd0Q7SUFHeEQsZ0ZBQXNEO0lBR3REOzs7T0FHRztJQUNIO1FBTUUsdUJBQ1ksV0FBbUIsRUFBVSxNQUFjLEVBQzNDLGNBQWtDLEVBQUUsa0JBQXdDO1lBRDVFLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUMzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBb0I7WUFQdEMscUJBQWdCLEdBQUcsSUFBSSxnQkFBUSxFQUFRLENBQUM7WUFDeEMsd0JBQW1CLEdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDakMsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBcUIsQ0FBQztZQU1yRCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQywyREFBMkQsQ0FBQyxDQUFDO2FBQzlFO1lBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3hDLENBQUM7UUFFRCwyQkFBRyxHQUFIO1lBQUEsaUJBc0JDO1lBckJDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDcEMsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDMUI7WUFFRCw2REFBNkQ7WUFDN0QsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsS0FBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxD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Q0FBQzs7Ozs7O2FBRXJDLENBQUM7UUFDSixDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBbFBELElBa1BDO0lBbFBZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG5pbXBvcnQgKiBhcyBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuXG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4uLy4uL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbiwgVGFzaywgVGFza1F1ZXVlfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHtvblRhc2tDb21wbGV0ZWQsIHN0cmluZ2lmeVRhc2t9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtNZXNzYWdlRnJvbVdvcmtlciwgVGFza0NvbXBsZXRlZE1lc3NhZ2UsIFVwZGF0ZVBhY2thZ2VKc29uTWVzc2FnZX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEZWZlcnJlZCwgc2VuZE1lc3NhZ2VUb1dvcmtlcn0gZnJvbSAnLi91dGlscyc7XG5cblxuLyoqXG4gKiBUaGUgY2x1c3RlciBtYXN0ZXIgaXMgcmVzcG9uc2libGUgZm9yIGFuYWx5emluZyBhbGwgZW50cnktcG9pbnRzLCBwbGFubmluZyB0aGUgd29yayB0aGF0IG5lZWRzIHRvXG4gKiBiZSBkb25lLCBkaXN0cmlidXRpbmcgaXQgdG8gd29ya2VyLXByb2Nlc3NlcyBhbmQgY29sbGVjdGluZy9wb3N0LXByb2Nlc3NpbmcgdGhlIHJlc3VsdHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbHVzdGVyTWFzdGVyIHtcbiAgcHJpdmF0ZSBmaW5pc2hlZERlZmVycmVkID0gbmV3IERlZmVycmVkPHZvaWQ+KCk7XG4gIHByaXZhdGUgcHJvY2Vzc2luZ1N0YXJ0VGltZTogbnVtYmVyID0gLTE7XG4gIHByaXZhdGUgdGFza0Fzc2lnbm1lbnRzID0gbmV3IE1hcDxudW1iZXIsIFRhc2t8bnVsbD4oKTtcbiAgcHJpdmF0ZSB0YXNrUXVldWU6IFRhc2tRdWV1ZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgd29ya2VyQ291bnQ6IG51bWJlciwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbikge1xuICAgIGlmICghY2x1c3Rlci5pc01hc3Rlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBpbnN0YW50aWF0ZSBgQ2x1c3Rlck1hc3RlcmAgb24gYSB3b3JrZXIgcHJvY2Vzcy4nKTtcbiAgICB9XG5cbiAgICB0aGlzLnRhc2tRdWV1ZSA9IGFuYWx5emVFbnRyeVBvaW50cygpO1xuICB9XG5cbiAgcnVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLnRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIC8vIFNldCB1cCBsaXN0ZW5lcnMgZm9yIHdvcmtlciBldmVudHMgKGVtaXR0ZWQgb24gYGNsdXN0ZXJgKS5cbiAgICBjbHVzdGVyLm9uKCdvbmxpbmUnLCB0aGlzLndyYXBFdmVudEhhbmRsZXIod29ya2VyID0+IHRoaXMub25Xb3JrZXJPbmxpbmUod29ya2VyLmlkKSkpO1xuXG4gICAgY2x1c3Rlci5vbihcbiAgICAgICAgJ21lc3NhZ2UnLCB0aGlzLndyYXBFdmVudEhhbmRsZXIoKHdvcmtlciwgbXNnKSA9PiB0aGlzLm9uV29ya2VyTWVzc2FnZSh3b3JrZXIuaWQsIG1zZykpKTtcblxuICAgIGNsdXN0ZXIub24oXG4gICAgICAgICdleGl0JyxcbiAgICAgICAgdGhpcy53cmFwRXZlbnRIYW5kbGVyKCh3b3JrZXIsIGNvZGUsIHNpZ25hbCkgPT4gdGhpcy5vbldvcmtlckV4aXQod29ya2VyLCBjb2RlLCBzaWduYWwpKSk7XG5cbiAgICAvLyBTaW5jZSB3ZSBoYXZlIHBlbmRpbmcgdGFza3MgYXQgdGhlIHZlcnkgbWluaW11bSB3ZSBuZWVkIGEgc2luZ2xlIHdvcmtlci5cbiAgICBjbHVzdGVyLmZvcmsoKTtcblxuICAgIHJldHVybiB0aGlzLmZpbmlzaGVkRGVmZXJyZWQucHJvbWlzZS50aGVuKCgpID0+IHRoaXMuc3RvcFdvcmtlcnMoKSwgZXJyID0+IHtcbiAgICAgIHRoaXMuc3RvcFdvcmtlcnMoKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIFRyeSB0byBmaW5kIGF2YWlsYWJsZSAoaWRsZSkgd29ya2VycyBhbmQgYXNzaWduIHRoZW0gYXZhaWxhYmxlIChub24tYmxvY2tlZCkgdGFza3MuICovXG4gIHByaXZhdGUgbWF5YmVEaXN0cmlidXRlV29yaygpOiB2b2lkIHtcbiAgICBsZXQgaXNXb3JrZXJBdmFpbGFibGUgPSBmYWxzZTtcblxuICAgIC8vIEZpcnN0LCBjaGVjayB3aGV0aGVyIGFsbCB0YXNrcyBoYXZlIGJlZW4gY29tcGxldGVkLlxuICAgIGlmICh0aGlzLnRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZCkge1xuICAgICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gdGhpcy5wcm9jZXNzaW5nU3RhcnRUaW1lKSAvIDEwMCkgLyAxMDtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBQcm9jZXNzZWQgdGFza3MgaW4gJHtkdXJhdGlvbn1zLmApO1xuXG4gICAgICByZXR1cm4gdGhpcy5maW5pc2hlZERlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIGZvciBhdmFpbGFibGUgd29ya2VycyBhbmQgYXZhaWxhYmxlIHRhc2tzIHRvIGFzc2lnbiB0byB0aGVtLlxuICAgIGZvciAoY29uc3QgW3dvcmtlcklkLCBhc3NpZ25lZFRhc2tdIG9mIEFycmF5LmZyb20odGhpcy50YXNrQXNzaWdubWVudHMpKSB7XG4gICAgICBpZiAoYXNzaWduZWRUYXNrICE9PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgd29ya2VyIGFscmVhZHkgaGFzIGEgam9iOyBjaGVjayBvdGhlciB3b3JrZXJzLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoaXMgd29ya2VyIGlzIGF2YWlsYWJsZS5cbiAgICAgICAgaXNXb3JrZXJBdmFpbGFibGUgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGlzIHdvcmtlciBuZWVkcyBhIGpvYi4gU2VlIGlmIGFueSBhcmUgYXZhaWxhYmxlLlxuICAgICAgY29uc3QgdGFzayA9IHRoaXMudGFza1F1ZXVlLmdldE5leHRUYXNrKCk7XG4gICAgICBpZiAodGFzayA9PT0gbnVsbCkge1xuICAgICAgICAvLyBObyBzdWl0YWJsZSB3b3JrIGF2YWlsYWJsZSByaWdodCBub3cuXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBQcm9jZXNzIHRoZSBuZXh0IHRhc2sgb24gdGhlIHdvcmtlci5cbiAgICAgIHRoaXMudGFza0Fzc2lnbm1lbnRzLnNldCh3b3JrZXJJZCwgdGFzayk7XG4gICAgICBzZW5kTWVzc2FnZVRvV29ya2VyKHdvcmtlcklkLCB7dHlwZTogJ3Byb2Nlc3MtdGFzaycsIHRhc2t9KTtcblxuICAgICAgaXNXb3JrZXJBdmFpbGFibGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWlzV29ya2VyQXZhaWxhYmxlKSB7XG4gICAgICBpZiAodGhpcy50YXNrQXNzaWdubWVudHMuc2l6ZSA8IHRoaXMud29ya2VyQ291bnQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NwYXduaW5nIGFub3RoZXIgd29ya2VyIHByb2Nlc3MgYXMgdGhlcmUgaXMgbW9yZSB3b3JrIHRvIGJlIGRvbmUuJyk7XG4gICAgICAgIGNsdXN0ZXIuZm9yaygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGF2YWlsYWJsZSB3b3JrZXJzIG9yIG5vIGF2YWlsYWJsZSB0YXNrcywgbG9nIChmb3IgZGVidWdnaW5nIHB1cnBvc2VzKS5cbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICAgICBgQWxsICR7dGhpcy50YXNrQXNzaWdubWVudHMuc2l6ZX0gd29ya2VycyBhcmUgY3VycmVudGx5IGJ1c3kgYW5kIGNhbm5vdCB0YWtlIG9uIG1vcmUgYCArXG4gICAgICAgICAgICAnd29yay4nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYnVzeVdvcmtlcnMgPSBBcnJheS5mcm9tKHRoaXMudGFza0Fzc2lnbm1lbnRzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoW193b3JrZXJJZCwgdGFza10pID0+IHRhc2sgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKChbd29ya2VySWRdKSA9PiB3b3JrZXJJZCk7XG4gICAgICBjb25zdCB0b3RhbFdvcmtlckNvdW50ID0gdGhpcy50YXNrQXNzaWdubWVudHMuc2l6ZTtcbiAgICAgIGNvbnN0IGlkbGVXb3JrZXJDb3VudCA9IHRvdGFsV29ya2VyQ291bnQgLSBidXN5V29ya2Vycy5sZW5ndGg7XG5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAgIGBObyBhc3NpZ25tZW50cyBmb3IgJHtpZGxlV29ya2VyQ291bnR9IGlkbGUgKG91dCBvZiAke3RvdGFsV29ya2VyQ291bnR9IHRvdGFsKSBgICtcbiAgICAgICAgICBgd29ya2Vycy4gQnVzeSB3b3JrZXJzOiAke2J1c3lXb3JrZXJzLmpvaW4oJywgJyl9YCk7XG5cbiAgICAgIGlmIChidXN5V29ya2Vycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIGJ1ZzpcbiAgICAgICAgLy8gQWxsIHdvcmtlcnMgYXJlIGlkbGUgKG1lYW5pbmcgbm8gdGFza3MgYXJlIGluIHByb2dyZXNzKSBhbmQgYHRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZGBcbiAgICAgICAgLy8gaXMgYGZhbHNlYCwgYnV0IHRoZXJlIGlzIHN0aWxsIG5vIGFzc2lnbmFibGUgd29yay5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ1RoZXJlIGFyZSBzdGlsbCB1bnByb2Nlc3NlZCB0YXNrcyBpbiB0aGUgcXVldWUgYW5kIG5vIHRhc2tzIGFyZSBjdXJyZW50bHkgaW4gJyArXG4gICAgICAgICAgICBgcHJvZ3Jlc3MsIHlldCB0aGUgcXVldWUgZGlkIG5vdCByZXR1cm4gYW55IGF2YWlsYWJsZSB0YXNrczogJHt0aGlzLnRhc2tRdWV1ZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogSGFuZGxlIGEgd29ya2VyJ3MgZXhpdGluZy4gKE1pZ2h0IGJlIGludGVudGlvbmFsIG9yIG5vdC4pICovXG4gIHByaXZhdGUgb25Xb3JrZXJFeGl0KHdvcmtlcjogY2x1c3Rlci5Xb3JrZXIsIGNvZGU6IG51bWJlcnxudWxsLCBzaWduYWw6IHN0cmluZ3xudWxsKTogdm9pZCB7XG4gICAgLy8gSWYgdGhlIHdvcmtlcidzIGV4aXRpbmcgd2FzIGludGVudGlvbmFsLCBub3RoaW5nIHRvIGRvLlxuICAgIGlmICh3b3JrZXIuZXhpdGVkQWZ0ZXJEaXNjb25uZWN0KSByZXR1cm47XG5cbiAgICAvLyBUaGUgd29ya2VyIGV4aXRlZCB1bmV4cGVjdGVkbHk6IERldGVybWluZSBpdCdzIHN0YXR1cyBhbmQgdGFrZSBhbiBhcHByb3ByaWF0ZSBhY3Rpb24uXG4gICAgY29uc3QgY3VycmVudFRhc2sgPSB0aGlzLnRhc2tBc3NpZ25tZW50cy5nZXQod29ya2VyLmlkKTtcblxuICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgIGBXb3JrZXIgIyR7d29ya2VyLmlkfSBleGl0ZWQgdW5leHBlY3RlZGx5IChjb2RlOiAke2NvZGV9IHwgc2lnbmFsOiAke3NpZ25hbH0pLlxcbmAgK1xuICAgICAgICBgICBDdXJyZW50IGFzc2lnbm1lbnQ6ICR7KGN1cnJlbnRUYXNrID09IG51bGwpID8gJy0nIDogc3RyaW5naWZ5VGFzayhjdXJyZW50VGFzayl9YCk7XG5cbiAgICBpZiAoY3VycmVudFRhc2sgPT0gbnVsbCkge1xuICAgICAgLy8gVGhlIGNyYXNoZWQgd29ya2VyIHByb2Nlc3Mgd2FzIG5vdCBpbiB0aGUgbWlkZGxlIG9mIGEgdGFzazpcbiAgICAgIC8vIEp1c3Qgc3Bhd24gYW5vdGhlciBwcm9jZXNzLlxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoYFNwYXduaW5nIGFub3RoZXIgd29ya2VyIHByb2Nlc3MgdG8gcmVwbGFjZSAjJHt3b3JrZXIuaWR9Li4uYCk7XG4gICAgICB0aGlzLnRhc2tBc3NpZ25tZW50cy5kZWxldGUod29ya2VyLmlkKTtcbiAgICAgIGNsdXN0ZXIuZm9yaygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgY3Jhc2hlZCB3b3JrZXIgcHJvY2VzcyB3YXMgaW4gdGhlIG1pZGRsZSBvZiBhIHRhc2s6XG4gICAgICAvLyBJbXBvc3NpYmxlIHRvIGtub3cgd2hldGhlciB3ZSBjYW4gcmVjb3ZlciAod2l0aG91dCBlbmRpbmcgdXAgd2l0aCBhIGNvcnJ1cHRlZCBlbnRyeS1wb2ludCkuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1Byb2Nlc3MgdW5leHBlY3RlZGx5IGNyYXNoZWQsIHdoaWxlIHByb2Nlc3NpbmcgZm9ybWF0IHByb3BlcnR5ICcgK1xuICAgICAgICAgIGAke2N1cnJlbnRUYXNrLmZvcm1hdFByb3BlcnR5fSBmb3IgZW50cnktcG9pbnQgJyR7Y3VycmVudFRhc2suZW50cnlQb2ludC5wYXRofScuYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEhhbmRsZSBhIG1lc3NhZ2UgZnJvbSBhIHdvcmtlci4gKi9cbiAgcHJpdmF0ZSBvbldvcmtlck1lc3NhZ2Uod29ya2VySWQ6IG51bWJlciwgbXNnOiBNZXNzYWdlRnJvbVdvcmtlcik6IHZvaWQge1xuICAgIGlmICghdGhpcy50YXNrQXNzaWdubWVudHMuaGFzKHdvcmtlcklkKSkge1xuICAgICAgY29uc3Qga25vd25Xb3JrZXJzID0gQXJyYXkuZnJvbSh0aGlzLnRhc2tBc3NpZ25tZW50cy5rZXlzKCkpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBSZWNlaXZlZCBtZXNzYWdlIGZyb20gdW5rbm93biB3b3JrZXIgIyR7d29ya2VySWR9IChrbm93biB3b3JrZXJzOiBgICtcbiAgICAgICAgICBgJHtrbm93bldvcmtlcnMuam9pbignLCAnKX0pOiAke0pTT04uc3RyaW5naWZ5KG1zZyl9YCk7XG4gICAgfVxuXG4gICAgc3dpdGNoIChtc2cudHlwZSkge1xuICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIG9uIHdvcmtlciAjJHt3b3JrZXJJZH06ICR7bXNnLmVycm9yfWApO1xuICAgICAgY2FzZSAndGFzay1jb21wbGV0ZWQnOlxuICAgICAgICByZXR1cm4gdGhpcy5vbldvcmtlclRhc2tDb21wbGV0ZWQod29ya2VySWQsIG1zZyk7XG4gICAgICBjYXNlICd1cGRhdGUtcGFja2FnZS1qc29uJzpcbiAgICAgICAgcmV0dXJuIHRoaXMub25Xb3JrZXJVcGRhdGVQYWNrYWdlSnNvbih3b3JrZXJJZCwgbXNnKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBJbnZhbGlkIG1lc3NhZ2UgcmVjZWl2ZWQgZnJvbSB3b3JrZXIgIyR7d29ya2VySWR9OiAke0pTT04uc3RyaW5naWZ5KG1zZyl9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEhhbmRsZSBhIHdvcmtlcidzIGNvbWluZyBvbmxpbmUuICovXG4gIHByaXZhdGUgb25Xb3JrZXJPbmxpbmUod29ya2VySWQ6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICh0aGlzLnRhc2tBc3NpZ25tZW50cy5oYXMod29ya2VySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFyaWFudCB2aW9sYXRlZDogV29ya2VyICMke3dvcmtlcklkfSBjYW1lIG9ubGluZSBtb3JlIHRoYW4gb25jZS5gKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wcm9jZXNzaW5nU3RhcnRUaW1lID09PSAtMSkge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdGFza3MuLi4nKTtcbiAgICAgIHRoaXMucHJvY2Vzc2luZ1N0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgfVxuXG4gICAgdGhpcy50YXNrQXNzaWdubWVudHMuc2V0KHdvcmtlcklkLCBudWxsKTtcbiAgICB0aGlzLm1heWJlRGlzdHJpYnV0ZVdvcmsoKTtcbiAgfVxuXG4gIC8qKiBIYW5kbGUgYSB3b3JrZXIncyBoYXZpbmcgY29tcGxldGVkIHRoZWlyIGFzc2lnbmVkIHRhc2suICovXG4gIHByaXZhdGUgb25Xb3JrZXJUYXNrQ29tcGxldGVkKHdvcmtlcklkOiBudW1iZXIsIG1zZzogVGFza0NvbXBsZXRlZE1lc3NhZ2UpOiB2b2lkIHtcbiAgICBjb25zdCB0YXNrID0gdGhpcy50YXNrQXNzaWdubWVudHMuZ2V0KHdvcmtlcklkKSB8fCBudWxsO1xuXG4gICAgaWYgKHRhc2sgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRXhwZWN0ZWQgd29ya2VyICMke3dvcmtlcklkfSB0byBoYXZlIGEgdGFzayBhc3NpZ25lZCwgd2hpbGUgaGFuZGxpbmcgbWVzc2FnZTogYCArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkobXNnKSk7XG4gICAgfVxuXG4gICAgb25UYXNrQ29tcGxldGVkKHRoaXMucGtnSnNvblVwZGF0ZXIsIHRhc2ssIG1zZy5vdXRjb21lKTtcblxuICAgIHRoaXMudGFza1F1ZXVlLm1hcmtUYXNrQ29tcGxldGVkKHRhc2spO1xuICAgIHRoaXMudGFza0Fzc2lnbm1lbnRzLnNldCh3b3JrZXJJZCwgbnVsbCk7XG4gICAgdGhpcy5tYXliZURpc3RyaWJ1dGVXb3JrKCk7XG4gIH1cblxuICAvKiogSGFuZGxlIGEgd29ya2VyJ3MgcmVxdWVzdCB0byB1cGRhdGUgYSBgcGFja2FnZS5qc29uYCBmaWxlLiAqL1xuICBwcml2YXRlIG9uV29ya2VyVXBkYXRlUGFja2FnZUpzb24od29ya2VySWQ6IG51bWJlciwgbXNnOiBVcGRhdGVQYWNrYWdlSnNvbk1lc3NhZ2UpOiB2b2lkIHtcbiAgICBjb25zdCB0YXNrID0gdGhpcy50YXNrQXNzaWdubWVudHMuZ2V0KHdvcmtlcklkKSB8fCBudWxsO1xuXG4gICAgaWYgKHRhc2sgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRXhwZWN0ZWQgd29ya2VyICMke3dvcmtlcklkfSB0byBoYXZlIGEgdGFzayBhc3NpZ25lZCwgd2hpbGUgaGFuZGxpbmcgbWVzc2FnZTogYCArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkobXNnKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwZWN0ZWRQYWNrYWdlSnNvblBhdGggPSByZXNvbHZlKHRhc2suZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgcGFyc2VkUGFja2FnZUpzb24gPSB0YXNrLmVudHJ5UG9pbnQucGFja2FnZUpzb247XG5cbiAgICBpZiAoZXhwZWN0ZWRQYWNrYWdlSnNvblBhdGggIT09IG1zZy5wYWNrYWdlSnNvblBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgUmVjZWl2ZWQgJyR7bXNnLnR5cGV9JyBtZXNzYWdlIGZyb20gd29ya2VyICMke3dvcmtlcklkfSBmb3IgJyR7bXNnLnBhY2thZ2VKc29uUGF0aH0nLCBgICtcbiAgICAgICAgICBgYnV0IHdhcyBleHBlY3RpbmcgJyR7ZXhwZWN0ZWRQYWNrYWdlSnNvblBhdGh9JyAoYmFzZWQgb24gdGFzayBhc3NpZ25tZW50KS5gKTtcbiAgICB9XG5cbiAgICAvLyBOT1RFOiBBbHRob3VnaCB0aGUgY2hhbmdlIGluIHRoZSBwYXJzZWQgYHBhY2thZ2UuanNvbmAgd2lsbCBiZSByZWZsZWN0ZWQgaW4gdGFza3Mgb2JqZWN0c1xuICAgIC8vICAgICAgIGxvY2FsbHkgYW5kIHRodXMgYWxzbyBpbiBmdXR1cmUgYHByb2Nlc3MtdGFza2AgbWVzc2FnZXMgc2VudCB0byB3b3JrZXIgcHJvY2Vzc2VzLCBhbnlcbiAgICAvLyAgICAgICBwcm9jZXNzZXMgYWxyZWFkeSBydW5uaW5nIGFuZCBwcm9jZXNzaW5nIGEgdGFzayBmb3IgdGhlIHNhbWUgZW50cnktcG9pbnQgd2lsbCBub3QgZ2V0XG4gICAgLy8gICAgICAgdGhlIGNoYW5nZS5cbiAgICAvLyAgICAgICBEbyBub3QgcmVseSBvbiBoYXZpbmcgYW4gdXAtdG8tZGF0ZSBgcGFja2FnZS5qc29uYCByZXByZXNlbnRhdGlvbiBpbiB3b3JrZXIgcHJvY2Vzc2VzLlxuICAgIC8vICAgICAgIEluIG90aGVyIHdvcmRzLCB0YXNrIHByb2Nlc3Npbmcgc2hvdWxkIG9ubHkgcmVseSBvbiB0aGUgaW5mbyB0aGF0IHdhcyB0aGVyZSB3aGVuIHRoZVxuICAgIC8vICAgICAgIGZpbGUgd2FzIGluaXRpYWxseSBwYXJzZWQgKGR1cmluZyBlbnRyeS1wb2ludCBhbmFseXNpcykgYW5kIG5vdCBvbiB0aGUgaW5mbyB0aGF0IG1pZ2h0XG4gICAgLy8gICAgICAgYmUgYWRkZWQgbGF0ZXIgKGR1cmluZyB0YXNrIHByb2Nlc3NpbmcpLlxuICAgIHRoaXMucGtnSnNvblVwZGF0ZXIud3JpdGVDaGFuZ2VzKG1zZy5jaGFuZ2VzLCBtc2cucGFja2FnZUpzb25QYXRoLCBwYXJzZWRQYWNrYWdlSnNvbik7XG4gIH1cblxuICAvKiogU3RvcCBhbGwgd29ya2VycyBhbmQgc3RvcCBsaXN0ZW5pbmcgb24gY2x1c3RlciBldmVudHMuICovXG4gIHByaXZhdGUgc3RvcFdvcmtlcnMoKTogdm9pZCB7XG4gICAgY29uc3Qgd29ya2VycyA9IE9iamVjdC52YWx1ZXMoY2x1c3Rlci53b3JrZXJzKSBhcyBjbHVzdGVyLldvcmtlcltdO1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBTdG9wcGluZyAke3dvcmtlcnMubGVuZ3RofSB3b3JrZXJzLi4uYCk7XG5cbiAgICBjbHVzdGVyLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgIHdvcmtlcnMuZm9yRWFjaCh3b3JrZXIgPT4gd29ya2VyLmtpbGwoKSk7XG4gIH1cblxuICAvKipcbiAgICogV3JhcCBhbiBldmVudCBoYW5kbGVyIHRvIGVuc3VyZSB0aGF0IGBmaW5pc2hlZERlZmVycmVkYCB3aWxsIGJlIHJlamVjdGVkIG9uIGVycm9yIChyZWdhcmRsZXNzXG4gICAqIGlmIHRoZSBoYW5kbGVyIGNvbXBsZXRlcyBzeW5jaHJvbm91c2x5IG9yIGFzeW5jaHJvbm91c2x5KS5cbiAgICovXG4gIHByaXZhdGUgd3JhcEV2ZW50SGFuZGxlcjxBcmdzIGV4dGVuZHMgdW5rbm93bltdPihmbjogKC4uLmFyZ3M6IEFyZ3MpID0+IHZvaWR8UHJvbWlzZTx2b2lkPik6XG4gICAgICAoLi4uYXJnczogQXJncykgPT4gUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIGFzeW5jKC4uLmFyZ3M6IEFyZ3MpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZuKC4uLmFyZ3MpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRoaXMuZmluaXNoZWREZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG4iXX0=