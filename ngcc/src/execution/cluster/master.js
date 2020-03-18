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
        define("@angular/compiler-cli/ngcc/src/execution/cluster/master", ["require", "exports", "tslib", "cluster", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/execution/tasks/utils", "@angular/compiler-cli/ngcc/src/execution/cluster/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /// <reference types="node" />
    var cluster = require("cluster");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/utils");
    var utils_2 = require("@angular/compiler-cli/ngcc/src/execution/cluster/utils");
    /**
     * The cluster master is responsible for analyzing all entry-points, planning the work that needs to
     * be done, distributing it to worker-processes and collecting/post-processing the results.
     */
    var ClusterMaster = /** @class */ (function () {
        function ClusterMaster(workerCount, logger, pkgJsonUpdater, analyzeEntryPoints, createTaskCompletedCallback) {
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
            this.onTaskCompleted = createTaskCompletedCallback(this.taskQueue);
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
            this.onTaskCompleted(task, msg.outcome, msg.message);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9jbHVzdGVyL21hc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4QkFBOEI7SUFFOUIsaUNBQW1DO0lBRW5DLDJFQUEwRDtJQUsxRCw4RUFBNkM7SUFHN0MsZ0ZBQXNEO0lBR3REOzs7T0FHRztJQUNIO1FBT0UsdUJBQ1ksV0FBbUIsRUFBVSxNQUFjLEVBQzNDLGNBQWtDLEVBQUUsa0JBQXdDLEVBQ3BGLDJCQUF3RDtZQUZoRCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDM0MsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1lBUnRDLHFCQUFnQixHQUFHLElBQUksZ0JBQVEsRUFBUSxDQUFDO1lBQ3hDLHdCQUFtQixHQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXFCLENBQUM7WUFRckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7Z0JBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkRBQTJELENBQUMsQ0FBQzthQUM5RTtZQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsZUFBZSxHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsMkJBQUcsR0FBSDtZQUFBLGlCQXNCQztZQXJCQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ3BDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzFCO1lBRUQsNkRBQTZEO1lBQzdELE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLElB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QUFJLElBQUksSUFBQzs7Z0NBQWpCLFNBQWlCLENBQUM7Ozs7Z0NBRWxCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsS0FBRyxDQUFDLENBQUM7Ozs7OzthQUVyQyxDQUFDO1FBQ0osQ0FBQztRQUNILG9CQUFDO0lBQUQsQ0FBQyxBQXJQRCxJQXFQQztJQXJQWSxzQ0FBYSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0ICogYXMgY2x1c3RlciBmcm9tICdjbHVzdGVyJztcblxuaW1wb3J0IHtyZXNvbHZlfSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7UGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuLi8uLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm59IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge0NyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjaywgVGFzaywgVGFza0NvbXBsZXRlZENhbGxiYWNrLCBUYXNrUXVldWV9IGZyb20gJy4uL3Rhc2tzL2FwaSc7XG5pbXBvcnQge3N0cmluZ2lmeVRhc2t9IGZyb20gJy4uL3Rhc2tzL3V0aWxzJztcblxuaW1wb3J0IHtNZXNzYWdlRnJvbVdvcmtlciwgVGFza0NvbXBsZXRlZE1lc3NhZ2UsIFVwZGF0ZVBhY2thZ2VKc29uTWVzc2FnZX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEZWZlcnJlZCwgc2VuZE1lc3NhZ2VUb1dvcmtlcn0gZnJvbSAnLi91dGlscyc7XG5cblxuLyoqXG4gKiBUaGUgY2x1c3RlciBtYXN0ZXIgaXMgcmVzcG9uc2libGUgZm9yIGFuYWx5emluZyBhbGwgZW50cnktcG9pbnRzLCBwbGFubmluZyB0aGUgd29yayB0aGF0IG5lZWRzIHRvXG4gKiBiZSBkb25lLCBkaXN0cmlidXRpbmcgaXQgdG8gd29ya2VyLXByb2Nlc3NlcyBhbmQgY29sbGVjdGluZy9wb3N0LXByb2Nlc3NpbmcgdGhlIHJlc3VsdHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbHVzdGVyTWFzdGVyIHtcbiAgcHJpdmF0ZSBmaW5pc2hlZERlZmVycmVkID0gbmV3IERlZmVycmVkPHZvaWQ+KCk7XG4gIHByaXZhdGUgcHJvY2Vzc2luZ1N0YXJ0VGltZTogbnVtYmVyID0gLTE7XG4gIHByaXZhdGUgdGFza0Fzc2lnbm1lbnRzID0gbmV3IE1hcDxudW1iZXIsIFRhc2t8bnVsbD4oKTtcbiAgcHJpdmF0ZSB0YXNrUXVldWU6IFRhc2tRdWV1ZTtcbiAgcHJpdmF0ZSBvblRhc2tDb21wbGV0ZWQ6IFRhc2tDb21wbGV0ZWRDYWxsYmFjaztcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgd29ya2VyQ291bnQ6IG51bWJlciwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbixcbiAgICAgIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjazogQ3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKSB7XG4gICAgaWYgKCFjbHVzdGVyLmlzTWFzdGVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RyaWVkIHRvIGluc3RhbnRpYXRlIGBDbHVzdGVyTWFzdGVyYCBvbiBhIHdvcmtlciBwcm9jZXNzLicpO1xuICAgIH1cblxuICAgIHRoaXMudGFza1F1ZXVlID0gYW5hbHl6ZUVudHJ5UG9pbnRzKCk7XG4gICAgdGhpcy5vblRhc2tDb21wbGV0ZWQgPSBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2sodGhpcy50YXNrUXVldWUpO1xuICB9XG5cbiAgcnVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLnRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIC8vIFNldCB1cCBsaXN0ZW5lcnMgZm9yIHdvcmtlciBldmVudHMgKGVtaXR0ZWQgb24gYGNsdXN0ZXJgKS5cbiAgICBjbHVzdGVyLm9uKCdvbmxpbmUnLCB0aGlzLndyYXBFdmVudEhhbmRsZXIod29ya2VyID0+IHRoaXMub25Xb3JrZXJPbmxpbmUod29ya2VyLmlkKSkpO1xuXG4gICAgY2x1c3Rlci5vbihcbiAgICAgICAgJ21lc3NhZ2UnLCB0aGlzLndyYXBFdmVudEhhbmRsZXIoKHdvcmtlciwgbXNnKSA9PiB0aGlzLm9uV29ya2VyTWVzc2FnZSh3b3JrZXIuaWQsIG1zZykpKTtcblxuICAgIGNsdXN0ZXIub24oXG4gICAgICAgICdleGl0JyxcbiAgICAgICAgdGhpcy53cmFwRXZlbnRIYW5kbGVyKCh3b3JrZXIsIGNvZGUsIHNpZ25hbCkgPT4gdGhpcy5vbldvcmtlckV4aXQod29ya2VyLCBjb2RlLCBzaWduYWwpKSk7XG5cbiAgICAvLyBTaW5jZSB3ZSBoYXZlIHBlbmRpbmcgdGFza3MgYXQgdGhlIHZlcnkgbWluaW11bSB3ZSBuZWVkIGEgc2luZ2xlIHdvcmtlci5cbiAgICBjbHVzdGVyLmZvcmsoKTtcblxuICAgIHJldHVybiB0aGlzLmZpbmlzaGVkRGVmZXJyZWQucHJvbWlzZS50aGVuKCgpID0+IHRoaXMuc3RvcFdvcmtlcnMoKSwgZXJyID0+IHtcbiAgICAgIHRoaXMuc3RvcFdvcmtlcnMoKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIFRyeSB0byBmaW5kIGF2YWlsYWJsZSAoaWRsZSkgd29ya2VycyBhbmQgYXNzaWduIHRoZW0gYXZhaWxhYmxlIChub24tYmxvY2tlZCkgdGFza3MuICovXG4gIHByaXZhdGUgbWF5YmVEaXN0cmlidXRlV29yaygpOiB2b2lkIHtcbiAgICBsZXQgaXNXb3JrZXJBdmFpbGFibGUgPSBmYWxzZTtcblxuICAgIC8vIEZpcnN0LCBjaGVjayB3aGV0aGVyIGFsbCB0YXNrcyBoYXZlIGJlZW4gY29tcGxldGVkLlxuICAgIGlmICh0aGlzLnRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZCkge1xuICAgICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gdGhpcy5wcm9jZXNzaW5nU3RhcnRUaW1lKSAvIDEwMCkgLyAxMDtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBQcm9jZXNzZWQgdGFza3MgaW4gJHtkdXJhdGlvbn1zLmApO1xuXG4gICAgICByZXR1cm4gdGhpcy5maW5pc2hlZERlZmVycmVkLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIGZvciBhdmFpbGFibGUgd29ya2VycyBhbmQgYXZhaWxhYmxlIHRhc2tzIHRvIGFzc2lnbiB0byB0aGVtLlxuICAgIGZvciAoY29uc3QgW3dvcmtlcklkLCBhc3NpZ25lZFRhc2tdIG9mIEFycmF5LmZyb20odGhpcy50YXNrQXNzaWdubWVudHMpKSB7XG4gICAgICBpZiAoYXNzaWduZWRUYXNrICE9PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgd29ya2VyIGFscmVhZHkgaGFzIGEgam9iOyBjaGVjayBvdGhlciB3b3JrZXJzLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoaXMgd29ya2VyIGlzIGF2YWlsYWJsZS5cbiAgICAgICAgaXNXb3JrZXJBdmFpbGFibGUgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGlzIHdvcmtlciBuZWVkcyBhIGpvYi4gU2VlIGlmIGFueSBhcmUgYXZhaWxhYmxlLlxuICAgICAgY29uc3QgdGFzayA9IHRoaXMudGFza1F1ZXVlLmdldE5leHRUYXNrKCk7XG4gICAgICBpZiAodGFzayA9PT0gbnVsbCkge1xuICAgICAgICAvLyBObyBzdWl0YWJsZSB3b3JrIGF2YWlsYWJsZSByaWdodCBub3cuXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBQcm9jZXNzIHRoZSBuZXh0IHRhc2sgb24gdGhlIHdvcmtlci5cbiAgICAgIHRoaXMudGFza0Fzc2lnbm1lbnRzLnNldCh3b3JrZXJJZCwgdGFzayk7XG4gICAgICBzZW5kTWVzc2FnZVRvV29ya2VyKHdvcmtlcklkLCB7dHlwZTogJ3Byb2Nlc3MtdGFzaycsIHRhc2t9KTtcblxuICAgICAgaXNXb3JrZXJBdmFpbGFibGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWlzV29ya2VyQXZhaWxhYmxlKSB7XG4gICAgICBpZiAodGhpcy50YXNrQXNzaWdubWVudHMuc2l6ZSA8IHRoaXMud29ya2VyQ291bnQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NwYXduaW5nIGFub3RoZXIgd29ya2VyIHByb2Nlc3MgYXMgdGhlcmUgaXMgbW9yZSB3b3JrIHRvIGJlIGRvbmUuJyk7XG4gICAgICAgIGNsdXN0ZXIuZm9yaygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGF2YWlsYWJsZSB3b3JrZXJzIG9yIG5vIGF2YWlsYWJsZSB0YXNrcywgbG9nIChmb3IgZGVidWdnaW5nIHB1cnBvc2VzKS5cbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICAgICBgQWxsICR7dGhpcy50YXNrQXNzaWdubWVudHMuc2l6ZX0gd29ya2VycyBhcmUgY3VycmVudGx5IGJ1c3kgYW5kIGNhbm5vdCB0YWtlIG9uIG1vcmUgYCArXG4gICAgICAgICAgICAnd29yay4nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYnVzeVdvcmtlcnMgPSBBcnJheS5mcm9tKHRoaXMudGFza0Fzc2lnbm1lbnRzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoW193b3JrZXJJZCwgdGFza10pID0+IHRhc2sgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKChbd29ya2VySWRdKSA9PiB3b3JrZXJJZCk7XG4gICAgICBjb25zdCB0b3RhbFdvcmtlckNvdW50ID0gdGhpcy50YXNrQXNzaWdubWVudHMuc2l6ZTtcbiAgICAgIGNvbnN0IGlkbGVXb3JrZXJDb3VudCA9IHRvdGFsV29ya2VyQ291bnQgLSBidXN5V29ya2Vycy5sZW5ndGg7XG5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAgIGBObyBhc3NpZ25tZW50cyBmb3IgJHtpZGxlV29ya2VyQ291bnR9IGlkbGUgKG91dCBvZiAke3RvdGFsV29ya2VyQ291bnR9IHRvdGFsKSBgICtcbiAgICAgICAgICBgd29ya2Vycy4gQnVzeSB3b3JrZXJzOiAke2J1c3lXb3JrZXJzLmpvaW4oJywgJyl9YCk7XG5cbiAgICAgIGlmIChidXN5V29ya2Vycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIGJ1ZzpcbiAgICAgICAgLy8gQWxsIHdvcmtlcnMgYXJlIGlkbGUgKG1lYW5pbmcgbm8gdGFza3MgYXJlIGluIHByb2dyZXNzKSBhbmQgYHRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZGBcbiAgICAgICAgLy8gaXMgYGZhbHNlYCwgYnV0IHRoZXJlIGlzIHN0aWxsIG5vIGFzc2lnbmFibGUgd29yay5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ1RoZXJlIGFyZSBzdGlsbCB1bnByb2Nlc3NlZCB0YXNrcyBpbiB0aGUgcXVldWUgYW5kIG5vIHRhc2tzIGFyZSBjdXJyZW50bHkgaW4gJyArXG4gICAgICAgICAgICBgcHJvZ3Jlc3MsIHlldCB0aGUgcXVldWUgZGlkIG5vdCByZXR1cm4gYW55IGF2YWlsYWJsZSB0YXNrczogJHt0aGlzLnRhc2tRdWV1ZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogSGFuZGxlIGEgd29ya2VyJ3MgZXhpdGluZy4gKE1pZ2h0IGJlIGludGVudGlvbmFsIG9yIG5vdC4pICovXG4gIHByaXZhdGUgb25Xb3JrZXJFeGl0KHdvcmtlcjogY2x1c3Rlci5Xb3JrZXIsIGNvZGU6IG51bWJlcnxudWxsLCBzaWduYWw6IHN0cmluZ3xudWxsKTogdm9pZCB7XG4gICAgLy8gSWYgdGhlIHdvcmtlcidzIGV4aXRpbmcgd2FzIGludGVudGlvbmFsLCBub3RoaW5nIHRvIGRvLlxuICAgIGlmICh3b3JrZXIuZXhpdGVkQWZ0ZXJEaXNjb25uZWN0KSByZXR1cm47XG5cbiAgICAvLyBUaGUgd29ya2VyIGV4aXRlZCB1bmV4cGVjdGVkbHk6IERldGVybWluZSBpdCdzIHN0YXR1cyBhbmQgdGFrZSBhbiBhcHByb3ByaWF0ZSBhY3Rpb24uXG4gICAgY29uc3QgY3VycmVudFRhc2sgPSB0aGlzLnRhc2tBc3NpZ25tZW50cy5nZXQod29ya2VyLmlkKTtcblxuICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgIGBXb3JrZXIgIyR7d29ya2VyLmlkfSBleGl0ZWQgdW5leHBlY3RlZGx5IChjb2RlOiAke2NvZGV9IHwgc2lnbmFsOiAke3NpZ25hbH0pLlxcbmAgK1xuICAgICAgICBgICBDdXJyZW50IGFzc2lnbm1lbnQ6ICR7KGN1cnJlbnRUYXNrID09IG51bGwpID8gJy0nIDogc3RyaW5naWZ5VGFzayhjdXJyZW50VGFzayl9YCk7XG5cbiAgICBpZiAoY3VycmVudFRhc2sgPT0gbnVsbCkge1xuICAgICAgLy8gVGhlIGNyYXNoZWQgd29ya2VyIHByb2Nlc3Mgd2FzIG5vdCBpbiB0aGUgbWlkZGxlIG9mIGEgdGFzazpcbiAgICAgIC8vIEp1c3Qgc3Bhd24gYW5vdGhlciBwcm9jZXNzLlxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoYFNwYXduaW5nIGFub3RoZXIgd29ya2VyIHByb2Nlc3MgdG8gcmVwbGFjZSAjJHt3b3JrZXIuaWR9Li4uYCk7XG4gICAgICB0aGlzLnRhc2tBc3NpZ25tZW50cy5kZWxldGUod29ya2VyLmlkKTtcbiAgICAgIGNsdXN0ZXIuZm9yaygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgY3Jhc2hlZCB3b3JrZXIgcHJvY2VzcyB3YXMgaW4gdGhlIG1pZGRsZSBvZiBhIHRhc2s6XG4gICAgICAvLyBJbXBvc3NpYmxlIHRvIGtub3cgd2hldGhlciB3ZSBjYW4gcmVjb3ZlciAod2l0aG91dCBlbmRpbmcgdXAgd2l0aCBhIGNvcnJ1cHRlZCBlbnRyeS1wb2ludCkuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1Byb2Nlc3MgdW5leHBlY3RlZGx5IGNyYXNoZWQsIHdoaWxlIHByb2Nlc3NpbmcgZm9ybWF0IHByb3BlcnR5ICcgK1xuICAgICAgICAgIGAke2N1cnJlbnRUYXNrLmZvcm1hdFByb3BlcnR5fSBmb3IgZW50cnktcG9pbnQgJyR7Y3VycmVudFRhc2suZW50cnlQb2ludC5wYXRofScuYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEhhbmRsZSBhIG1lc3NhZ2UgZnJvbSBhIHdvcmtlci4gKi9cbiAgcHJpdmF0ZSBvbldvcmtlck1lc3NhZ2Uod29ya2VySWQ6IG51bWJlciwgbXNnOiBNZXNzYWdlRnJvbVdvcmtlcik6IHZvaWQge1xuICAgIGlmICghdGhpcy50YXNrQXNzaWdubWVudHMuaGFzKHdvcmtlcklkKSkge1xuICAgICAgY29uc3Qga25vd25Xb3JrZXJzID0gQXJyYXkuZnJvbSh0aGlzLnRhc2tBc3NpZ25tZW50cy5rZXlzKCkpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBSZWNlaXZlZCBtZXNzYWdlIGZyb20gdW5rbm93biB3b3JrZXIgIyR7d29ya2VySWR9IChrbm93biB3b3JrZXJzOiBgICtcbiAgICAgICAgICBgJHtrbm93bldvcmtlcnMuam9pbignLCAnKX0pOiAke0pTT04uc3RyaW5naWZ5KG1zZyl9YCk7XG4gICAgfVxuXG4gICAgc3dpdGNoIChtc2cudHlwZSkge1xuICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIG9uIHdvcmtlciAjJHt3b3JrZXJJZH06ICR7bXNnLmVycm9yfWApO1xuICAgICAgY2FzZSAndGFzay1jb21wbGV0ZWQnOlxuICAgICAgICByZXR1cm4gdGhpcy5vbldvcmtlclRhc2tDb21wbGV0ZWQod29ya2VySWQsIG1zZyk7XG4gICAgICBjYXNlICd1cGRhdGUtcGFja2FnZS1qc29uJzpcbiAgICAgICAgcmV0dXJuIHRoaXMub25Xb3JrZXJVcGRhdGVQYWNrYWdlSnNvbih3b3JrZXJJZCwgbXNnKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBJbnZhbGlkIG1lc3NhZ2UgcmVjZWl2ZWQgZnJvbSB3b3JrZXIgIyR7d29ya2VySWR9OiAke0pTT04uc3RyaW5naWZ5KG1zZyl9YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEhhbmRsZSBhIHdvcmtlcidzIGNvbWluZyBvbmxpbmUuICovXG4gIHByaXZhdGUgb25Xb3JrZXJPbmxpbmUod29ya2VySWQ6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICh0aGlzLnRhc2tBc3NpZ25tZW50cy5oYXMod29ya2VySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFyaWFudCB2aW9sYXRlZDogV29ya2VyICMke3dvcmtlcklkfSBjYW1lIG9ubGluZSBtb3JlIHRoYW4gb25jZS5gKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wcm9jZXNzaW5nU3RhcnRUaW1lID09PSAtMSkge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdGFza3MuLi4nKTtcbiAgICAgIHRoaXMucHJvY2Vzc2luZ1N0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgfVxuXG4gICAgdGhpcy50YXNrQXNzaWdubWVudHMuc2V0KHdvcmtlcklkLCBudWxsKTtcbiAgICB0aGlzLm1heWJlRGlzdHJpYnV0ZVdvcmsoKTtcbiAgfVxuXG4gIC8qKiBIYW5kbGUgYSB3b3JrZXIncyBoYXZpbmcgY29tcGxldGVkIHRoZWlyIGFzc2lnbmVkIHRhc2suICovXG4gIHByaXZhdGUgb25Xb3JrZXJUYXNrQ29tcGxldGVkKHdvcmtlcklkOiBudW1iZXIsIG1zZzogVGFza0NvbXBsZXRlZE1lc3NhZ2UpOiB2b2lkIHtcbiAgICBjb25zdCB0YXNrID0gdGhpcy50YXNrQXNzaWdubWVudHMuZ2V0KHdvcmtlcklkKSB8fCBudWxsO1xuXG4gICAgaWYgKHRhc2sgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRXhwZWN0ZWQgd29ya2VyICMke3dvcmtlcklkfSB0byBoYXZlIGEgdGFzayBhc3NpZ25lZCwgd2hpbGUgaGFuZGxpbmcgbWVzc2FnZTogYCArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkobXNnKSk7XG4gICAgfVxuXG4gICAgdGhpcy5vblRhc2tDb21wbGV0ZWQodGFzaywgbXNnLm91dGNvbWUsIG1zZy5tZXNzYWdlKTtcblxuICAgIHRoaXMudGFza1F1ZXVlLm1hcmtUYXNrQ29tcGxldGVkKHRhc2spO1xuICAgIHRoaXMudGFza0Fzc2lnbm1lbnRzLnNldCh3b3JrZXJJZCwgbnVsbCk7XG4gICAgdGhpcy5tYXliZURpc3RyaWJ1dGVXb3JrKCk7XG4gIH1cblxuICAvKiogSGFuZGxlIGEgd29ya2VyJ3MgcmVxdWVzdCB0byB1cGRhdGUgYSBgcGFja2FnZS5qc29uYCBmaWxlLiAqL1xuICBwcml2YXRlIG9uV29ya2VyVXBkYXRlUGFja2FnZUpzb24od29ya2VySWQ6IG51bWJlciwgbXNnOiBVcGRhdGVQYWNrYWdlSnNvbk1lc3NhZ2UpOiB2b2lkIHtcbiAgICBjb25zdCB0YXNrID0gdGhpcy50YXNrQXNzaWdubWVudHMuZ2V0KHdvcmtlcklkKSB8fCBudWxsO1xuXG4gICAgaWYgKHRhc2sgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRXhwZWN0ZWQgd29ya2VyICMke3dvcmtlcklkfSB0byBoYXZlIGEgdGFzayBhc3NpZ25lZCwgd2hpbGUgaGFuZGxpbmcgbWVzc2FnZTogYCArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkobXNnKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwZWN0ZWRQYWNrYWdlSnNvblBhdGggPSByZXNvbHZlKHRhc2suZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgcGFyc2VkUGFja2FnZUpzb24gPSB0YXNrLmVudHJ5UG9pbnQucGFja2FnZUpzb247XG5cbiAgICBpZiAoZXhwZWN0ZWRQYWNrYWdlSnNvblBhdGggIT09IG1zZy5wYWNrYWdlSnNvblBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgUmVjZWl2ZWQgJyR7bXNnLnR5cGV9JyBtZXNzYWdlIGZyb20gd29ya2VyICMke3dvcmtlcklkfSBmb3IgJyR7bXNnLnBhY2thZ2VKc29uUGF0aH0nLCBgICtcbiAgICAgICAgICBgYnV0IHdhcyBleHBlY3RpbmcgJyR7ZXhwZWN0ZWRQYWNrYWdlSnNvblBhdGh9JyAoYmFzZWQgb24gdGFzayBhc3NpZ25tZW50KS5gKTtcbiAgICB9XG5cbiAgICAvLyBOT1RFOiBBbHRob3VnaCB0aGUgY2hhbmdlIGluIHRoZSBwYXJzZWQgYHBhY2thZ2UuanNvbmAgd2lsbCBiZSByZWZsZWN0ZWQgaW4gdGFza3Mgb2JqZWN0c1xuICAgIC8vICAgICAgIGxvY2FsbHkgYW5kIHRodXMgYWxzbyBpbiBmdXR1cmUgYHByb2Nlc3MtdGFza2AgbWVzc2FnZXMgc2VudCB0byB3b3JrZXIgcHJvY2Vzc2VzLCBhbnlcbiAgICAvLyAgICAgICBwcm9jZXNzZXMgYWxyZWFkeSBydW5uaW5nIGFuZCBwcm9jZXNzaW5nIGEgdGFzayBmb3IgdGhlIHNhbWUgZW50cnktcG9pbnQgd2lsbCBub3QgZ2V0XG4gICAgLy8gICAgICAgdGhlIGNoYW5nZS5cbiAgICAvLyAgICAgICBEbyBub3QgcmVseSBvbiBoYXZpbmcgYW4gdXAtdG8tZGF0ZSBgcGFja2FnZS5qc29uYCByZXByZXNlbnRhdGlvbiBpbiB3b3JrZXIgcHJvY2Vzc2VzLlxuICAgIC8vICAgICAgIEluIG90aGVyIHdvcmRzLCB0YXNrIHByb2Nlc3Npbmcgc2hvdWxkIG9ubHkgcmVseSBvbiB0aGUgaW5mbyB0aGF0IHdhcyB0aGVyZSB3aGVuIHRoZVxuICAgIC8vICAgICAgIGZpbGUgd2FzIGluaXRpYWxseSBwYXJzZWQgKGR1cmluZyBlbnRyeS1wb2ludCBhbmFseXNpcykgYW5kIG5vdCBvbiB0aGUgaW5mbyB0aGF0IG1pZ2h0XG4gICAgLy8gICAgICAgYmUgYWRkZWQgbGF0ZXIgKGR1cmluZyB0YXNrIHByb2Nlc3NpbmcpLlxuICAgIHRoaXMucGtnSnNvblVwZGF0ZXIud3JpdGVDaGFuZ2VzKG1zZy5jaGFuZ2VzLCBtc2cucGFja2FnZUpzb25QYXRoLCBwYXJzZWRQYWNrYWdlSnNvbik7XG4gIH1cblxuICAvKiogU3RvcCBhbGwgd29ya2VycyBhbmQgc3RvcCBsaXN0ZW5pbmcgb24gY2x1c3RlciBldmVudHMuICovXG4gIHByaXZhdGUgc3RvcFdvcmtlcnMoKTogdm9pZCB7XG4gICAgY29uc3Qgd29ya2VycyA9IE9iamVjdC52YWx1ZXMoY2x1c3Rlci53b3JrZXJzKSBhcyBjbHVzdGVyLldvcmtlcltdO1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBTdG9wcGluZyAke3dvcmtlcnMubGVuZ3RofSB3b3JrZXJzLi4uYCk7XG5cbiAgICBjbHVzdGVyLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgIHdvcmtlcnMuZm9yRWFjaCh3b3JrZXIgPT4gd29ya2VyLmtpbGwoKSk7XG4gIH1cblxuICAvKipcbiAgICogV3JhcCBhbiBldmVudCBoYW5kbGVyIHRvIGVuc3VyZSB0aGF0IGBmaW5pc2hlZERlZmVycmVkYCB3aWxsIGJlIHJlamVjdGVkIG9uIGVycm9yIChyZWdhcmRsZXNzXG4gICAqIGlmIHRoZSBoYW5kbGVyIGNvbXBsZXRlcyBzeW5jaHJvbm91c2x5IG9yIGFzeW5jaHJvbm91c2x5KS5cbiAgICovXG4gIHByaXZhdGUgd3JhcEV2ZW50SGFuZGxlcjxBcmdzIGV4dGVuZHMgdW5rbm93bltdPihmbjogKC4uLmFyZ3M6IEFyZ3MpID0+IHZvaWR8UHJvbWlzZTx2b2lkPik6XG4gICAgICAoLi4uYXJnczogQXJncykgPT4gUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIGFzeW5jKC4uLmFyZ3M6IEFyZ3MpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZuKC4uLmFyZ3MpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRoaXMuZmluaXNoZWREZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG4iXX0=