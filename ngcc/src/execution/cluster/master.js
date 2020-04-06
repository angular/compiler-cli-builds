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
        function ClusterMaster(maxWorkerCount, logger, pkgJsonUpdater, analyzeEntryPoints, createTaskCompletedCallback) {
            this.maxWorkerCount = maxWorkerCount;
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
                var spawnedWorkerCount = Object.keys(cluster.workers).length;
                if (spawnedWorkerCount < this.maxWorkerCount) {
                    this.logger.debug('Spawning another worker process as there is more work to be done.');
                    cluster.fork();
                }
                else {
                    // If there are no available workers or no available tasks, log (for debugging purposes).
                    this.logger.debug("All " + spawnedWorkerCount + " workers are currently busy and cannot take on more work.");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9jbHVzdGVyL21hc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4QkFBOEI7SUFFOUIsaUNBQW1DO0lBRW5DLDJFQUEwRDtJQUsxRCw4RUFBNkM7SUFHN0MsZ0ZBQXNEO0lBR3REOzs7T0FHRztJQUNIO1FBT0UsdUJBQ1ksY0FBc0IsRUFBVSxNQUFjLEVBQzlDLGNBQWtDLEVBQUUsa0JBQXdDLEVBQ3BGLDJCQUF3RDtZQUZoRCxtQkFBYyxHQUFkLGNBQWMsQ0FBUTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDOUMsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1lBUnRDLHFCQUFnQixHQUFHLElBQUksZ0JBQVEsRUFBUSxDQUFDO1lBQ3hDLHdCQUFtQixHQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXFCLENBQUM7WUFRckQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7Z0JBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkRBQTJELENBQUMsQ0FBQzthQUM5RTtZQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsZUFBZSxHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsMkJBQUcsR0FBSDtZQUFBLGlCQXNCQztZQXJCQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ3BDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQzFCO1lBRUQsNkRBQTZEO1lBQzdELE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLElB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QkFBYTs7Ozs7Ozs7Z0NBRXZCLHFCQUFNLEVBQUUsZ0NBQUksSUFBSSxJQUFDOztnQ0FBakIsU0FBaUIsQ0FBQzs7OztnQ0FFbEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFHLENBQUMsQ0FBQzs7Ozs7O2FBRXJDLENBQUM7UUFDSixDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBclBELElBcVBDO0lBclBZLHNDQUFhIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG5pbXBvcnQgKiBhcyBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuXG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4uLy4uL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbn0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7Q3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrLCBUYXNrLCBUYXNrQ29tcGxldGVkQ2FsbGJhY2ssIFRhc2tRdWV1ZX0gZnJvbSAnLi4vdGFza3MvYXBpJztcbmltcG9ydCB7c3RyaW5naWZ5VGFza30gZnJvbSAnLi4vdGFza3MvdXRpbHMnO1xuXG5pbXBvcnQge01lc3NhZ2VGcm9tV29ya2VyLCBUYXNrQ29tcGxldGVkTWVzc2FnZSwgVXBkYXRlUGFja2FnZUpzb25NZXNzYWdlfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0RlZmVycmVkLCBzZW5kTWVzc2FnZVRvV29ya2VyfSBmcm9tICcuL3V0aWxzJztcblxuXG4vKipcbiAqIFRoZSBjbHVzdGVyIG1hc3RlciBpcyByZXNwb25zaWJsZSBmb3IgYW5hbHl6aW5nIGFsbCBlbnRyeS1wb2ludHMsIHBsYW5uaW5nIHRoZSB3b3JrIHRoYXQgbmVlZHMgdG9cbiAqIGJlIGRvbmUsIGRpc3RyaWJ1dGluZyBpdCB0byB3b3JrZXItcHJvY2Vzc2VzIGFuZCBjb2xsZWN0aW5nL3Bvc3QtcHJvY2Vzc2luZyB0aGUgcmVzdWx0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIENsdXN0ZXJNYXN0ZXIge1xuICBwcml2YXRlIGZpbmlzaGVkRGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQ8dm9pZD4oKTtcbiAgcHJpdmF0ZSBwcm9jZXNzaW5nU3RhcnRUaW1lOiBudW1iZXIgPSAtMTtcbiAgcHJpdmF0ZSB0YXNrQXNzaWdubWVudHMgPSBuZXcgTWFwPG51bWJlciwgVGFza3xudWxsPigpO1xuICBwcml2YXRlIHRhc2tRdWV1ZTogVGFza1F1ZXVlO1xuICBwcml2YXRlIG9uVGFza0NvbXBsZXRlZDogVGFza0NvbXBsZXRlZENhbGxiYWNrO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBtYXhXb3JrZXJDb3VudDogbnVtYmVyLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuLFxuICAgICAgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spIHtcbiAgICBpZiAoIWNsdXN0ZXIuaXNNYXN0ZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVHJpZWQgdG8gaW5zdGFudGlhdGUgYENsdXN0ZXJNYXN0ZXJgIG9uIGEgd29ya2VyIHByb2Nlc3MuJyk7XG4gICAgfVxuXG4gICAgdGhpcy50YXNrUXVldWUgPSBhbmFseXplRW50cnlQb2ludHMoKTtcbiAgICB0aGlzLm9uVGFza0NvbXBsZXRlZCA9IGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayh0aGlzLnRhc2tRdWV1ZSk7XG4gIH1cblxuICBydW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMudGFza1F1ZXVlLmFsbFRhc2tzQ29tcGxldGVkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgLy8gU2V0IHVwIGxpc3RlbmVycyBmb3Igd29ya2VyIGV2ZW50cyAoZW1pdHRlZCBvbiBgY2x1c3RlcmApLlxuICAgIGNsdXN0ZXIub24oJ29ubGluZScsIHRoaXMud3JhcEV2ZW50SGFuZGxlcih3b3JrZXIgPT4gdGhpcy5vbldvcmtlck9ubGluZSh3b3JrZXIuaWQpKSk7XG5cbiAgICBjbHVzdGVyLm9uKFxuICAgICAgICAnbWVzc2FnZScsIHRoaXMud3JhcEV2ZW50SGFuZGxlcigod29ya2VyLCBtc2cpID0+IHRoaXMub25Xb3JrZXJNZXNzYWdlKHdvcmtlci5pZCwgbXNnKSkpO1xuXG4gICAgY2x1c3Rlci5vbihcbiAgICAgICAgJ2V4aXQnLFxuICAgICAgICB0aGlzLndyYXBFdmVudEhhbmRsZXIoKHdvcmtlciwgY29kZSwgc2lnbmFsKSA9PiB0aGlzLm9uV29ya2VyRXhpdCh3b3JrZXIsIGNvZGUsIHNpZ25hbCkpKTtcblxuICAgIC8vIFNpbmNlIHdlIGhhdmUgcGVuZGluZyB0YXNrcyBhdCB0aGUgdmVyeSBtaW5pbXVtIHdlIG5lZWQgYSBzaW5nbGUgd29ya2VyLlxuICAgIGNsdXN0ZXIuZm9yaygpO1xuXG4gICAgcmV0dXJuIHRoaXMuZmluaXNoZWREZWZlcnJlZC5wcm9taXNlLnRoZW4oKCkgPT4gdGhpcy5zdG9wV29ya2VycygpLCBlcnIgPT4ge1xuICAgICAgdGhpcy5zdG9wV29ya2VycygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gICAgfSk7XG4gIH1cblxuICAvKiogVHJ5IHRvIGZpbmQgYXZhaWxhYmxlIChpZGxlKSB3b3JrZXJzIGFuZCBhc3NpZ24gdGhlbSBhdmFpbGFibGUgKG5vbi1ibG9ja2VkKSB0YXNrcy4gKi9cbiAgcHJpdmF0ZSBtYXliZURpc3RyaWJ1dGVXb3JrKCk6IHZvaWQge1xuICAgIGxldCBpc1dvcmtlckF2YWlsYWJsZSA9IGZhbHNlO1xuXG4gICAgLy8gRmlyc3QsIGNoZWNrIHdoZXRoZXIgYWxsIHRhc2tzIGhhdmUgYmVlbiBjb21wbGV0ZWQuXG4gICAgaWYgKHRoaXMudGFza1F1ZXVlLmFsbFRhc2tzQ29tcGxldGVkKSB7XG4gICAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSB0aGlzLnByb2Nlc3NpbmdTdGFydFRpbWUpIC8gMTAwKSAvIDEwO1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoYFByb2Nlc3NlZCB0YXNrcyBpbiAke2R1cmF0aW9ufXMuYCk7XG5cbiAgICAgIHJldHVybiB0aGlzLmZpbmlzaGVkRGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIC8vIExvb2sgZm9yIGF2YWlsYWJsZSB3b3JrZXJzIGFuZCBhdmFpbGFibGUgdGFza3MgdG8gYXNzaWduIHRvIHRoZW0uXG4gICAgZm9yIChjb25zdCBbd29ya2VySWQsIGFzc2lnbmVkVGFza10gb2YgQXJyYXkuZnJvbSh0aGlzLnRhc2tBc3NpZ25tZW50cykpIHtcbiAgICAgIGlmIChhc3NpZ25lZFRhc2sgIT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyB3b3JrZXIgYWxyZWFkeSBoYXMgYSBqb2I7IGNoZWNrIG90aGVyIHdvcmtlcnMuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhpcyB3b3JrZXIgaXMgYXZhaWxhYmxlLlxuICAgICAgICBpc1dvcmtlckF2YWlsYWJsZSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoaXMgd29ya2VyIG5lZWRzIGEgam9iLiBTZWUgaWYgYW55IGFyZSBhdmFpbGFibGUuXG4gICAgICBjb25zdCB0YXNrID0gdGhpcy50YXNrUXVldWUuZ2V0TmV4dFRhc2soKTtcbiAgICAgIGlmICh0YXNrID09PSBudWxsKSB7XG4gICAgICAgIC8vIE5vIHN1aXRhYmxlIHdvcmsgYXZhaWxhYmxlIHJpZ2h0IG5vdy5cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIFByb2Nlc3MgdGhlIG5leHQgdGFzayBvbiB0aGUgd29ya2VyLlxuICAgICAgdGhpcy50YXNrQXNzaWdubWVudHMuc2V0KHdvcmtlcklkLCB0YXNrKTtcbiAgICAgIHNlbmRNZXNzYWdlVG9Xb3JrZXIod29ya2VySWQsIHt0eXBlOiAncHJvY2Vzcy10YXNrJywgdGFza30pO1xuXG4gICAgICBpc1dvcmtlckF2YWlsYWJsZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaXNXb3JrZXJBdmFpbGFibGUpIHtcbiAgICAgIGNvbnN0IHNwYXduZWRXb3JrZXJDb3VudCA9IE9iamVjdC5rZXlzKGNsdXN0ZXIud29ya2VycykubGVuZ3RoO1xuICAgICAgaWYgKHNwYXduZWRXb3JrZXJDb3VudCA8IHRoaXMubWF4V29ya2VyQ291bnQpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1NwYXduaW5nIGFub3RoZXIgd29ya2VyIHByb2Nlc3MgYXMgdGhlcmUgaXMgbW9yZSB3b3JrIHRvIGJlIGRvbmUuJyk7XG4gICAgICAgIGNsdXN0ZXIuZm9yaygpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGF2YWlsYWJsZSB3b3JrZXJzIG9yIG5vIGF2YWlsYWJsZSB0YXNrcywgbG9nIChmb3IgZGVidWdnaW5nIHB1cnBvc2VzKS5cbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICAgICBgQWxsICR7c3Bhd25lZFdvcmtlckNvdW50fSB3b3JrZXJzIGFyZSBjdXJyZW50bHkgYnVzeSBhbmQgY2Fubm90IHRha2Ugb24gbW9yZSB3b3JrLmApO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBidXN5V29ya2VycyA9IEFycmF5LmZyb20odGhpcy50YXNrQXNzaWdubWVudHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChbX3dvcmtlcklkLCB0YXNrXSkgPT4gdGFzayAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKFt3b3JrZXJJZF0pID0+IHdvcmtlcklkKTtcbiAgICAgIGNvbnN0IHRvdGFsV29ya2VyQ291bnQgPSB0aGlzLnRhc2tBc3NpZ25tZW50cy5zaXplO1xuICAgICAgY29uc3QgaWRsZVdvcmtlckNvdW50ID0gdG90YWxXb3JrZXJDb3VudCAtIGJ1c3lXb3JrZXJzLmxlbmd0aDtcblxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICAgYE5vIGFzc2lnbm1lbnRzIGZvciAke2lkbGVXb3JrZXJDb3VudH0gaWRsZSAob3V0IG9mICR7dG90YWxXb3JrZXJDb3VudH0gdG90YWwpIGAgK1xuICAgICAgICAgIGB3b3JrZXJzLiBCdXN5IHdvcmtlcnM6ICR7YnVzeVdvcmtlcnMuam9pbignLCAnKX1gKTtcblxuICAgICAgaWYgKGJ1c3lXb3JrZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBUaGlzIGlzIGEgYnVnOlxuICAgICAgICAvLyBBbGwgd29ya2VycyBhcmUgaWRsZSAobWVhbmluZyBubyB0YXNrcyBhcmUgaW4gcHJvZ3Jlc3MpIGFuZCBgdGFza1F1ZXVlLmFsbFRhc2tzQ29tcGxldGVkYFxuICAgICAgICAvLyBpcyBgZmFsc2VgLCBidXQgdGhlcmUgaXMgc3RpbGwgbm8gYXNzaWduYWJsZSB3b3JrLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnVGhlcmUgYXJlIHN0aWxsIHVucHJvY2Vzc2VkIHRhc2tzIGluIHRoZSBxdWV1ZSBhbmQgbm8gdGFza3MgYXJlIGN1cnJlbnRseSBpbiAnICtcbiAgICAgICAgICAgIGBwcm9ncmVzcywgeWV0IHRoZSBxdWV1ZSBkaWQgbm90IHJldHVybiBhbnkgYXZhaWxhYmxlIHRhc2tzOiAke3RoaXMudGFza1F1ZXVlfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKiBIYW5kbGUgYSB3b3JrZXIncyBleGl0aW5nLiAoTWlnaHQgYmUgaW50ZW50aW9uYWwgb3Igbm90LikgKi9cbiAgcHJpdmF0ZSBvbldvcmtlckV4aXQod29ya2VyOiBjbHVzdGVyLldvcmtlciwgY29kZTogbnVtYmVyfG51bGwsIHNpZ25hbDogc3RyaW5nfG51bGwpOiB2b2lkIHtcbiAgICAvLyBJZiB0aGUgd29ya2VyJ3MgZXhpdGluZyB3YXMgaW50ZW50aW9uYWwsIG5vdGhpbmcgdG8gZG8uXG4gICAgaWYgKHdvcmtlci5leGl0ZWRBZnRlckRpc2Nvbm5lY3QpIHJldHVybjtcblxuICAgIC8vIFRoZSB3b3JrZXIgZXhpdGVkIHVuZXhwZWN0ZWRseTogRGV0ZXJtaW5lIGl0J3Mgc3RhdHVzIGFuZCB0YWtlIGFuIGFwcHJvcHJpYXRlIGFjdGlvbi5cbiAgICBjb25zdCBjdXJyZW50VGFzayA9IHRoaXMudGFza0Fzc2lnbm1lbnRzLmdldCh3b3JrZXIuaWQpO1xuXG4gICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgYFdvcmtlciAjJHt3b3JrZXIuaWR9IGV4aXRlZCB1bmV4cGVjdGVkbHkgKGNvZGU6ICR7Y29kZX0gfCBzaWduYWw6ICR7c2lnbmFsfSkuXFxuYCArXG4gICAgICAgIGAgIEN1cnJlbnQgYXNzaWdubWVudDogJHsoY3VycmVudFRhc2sgPT0gbnVsbCkgPyAnLScgOiBzdHJpbmdpZnlUYXNrKGN1cnJlbnRUYXNrKX1gKTtcblxuICAgIGlmIChjdXJyZW50VGFzayA9PSBudWxsKSB7XG4gICAgICAvLyBUaGUgY3Jhc2hlZCB3b3JrZXIgcHJvY2VzcyB3YXMgbm90IGluIHRoZSBtaWRkbGUgb2YgYSB0YXNrOlxuICAgICAgLy8gSnVzdCBzcGF3biBhbm90aGVyIHByb2Nlc3MuXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgU3Bhd25pbmcgYW5vdGhlciB3b3JrZXIgcHJvY2VzcyB0byByZXBsYWNlICMke3dvcmtlci5pZH0uLi5gKTtcbiAgICAgIHRoaXMudGFza0Fzc2lnbm1lbnRzLmRlbGV0ZSh3b3JrZXIuaWQpO1xuICAgICAgY2x1c3Rlci5mb3JrKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBjcmFzaGVkIHdvcmtlciBwcm9jZXNzIHdhcyBpbiB0aGUgbWlkZGxlIG9mIGEgdGFzazpcbiAgICAgIC8vIEltcG9zc2libGUgdG8ga25vdyB3aGV0aGVyIHdlIGNhbiByZWNvdmVyICh3aXRob3V0IGVuZGluZyB1cCB3aXRoIGEgY29ycnVwdGVkIGVudHJ5LXBvaW50KS5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnUHJvY2VzcyB1bmV4cGVjdGVkbHkgY3Jhc2hlZCwgd2hpbGUgcHJvY2Vzc2luZyBmb3JtYXQgcHJvcGVydHkgJyArXG4gICAgICAgICAgYCR7Y3VycmVudFRhc2suZm9ybWF0UHJvcGVydHl9IGZvciBlbnRyeS1wb2ludCAnJHtjdXJyZW50VGFzay5lbnRyeVBvaW50LnBhdGh9Jy5gKTtcbiAgICB9XG4gIH1cblxuICAvKiogSGFuZGxlIGEgbWVzc2FnZSBmcm9tIGEgd29ya2VyLiAqL1xuICBwcml2YXRlIG9uV29ya2VyTWVzc2FnZSh3b3JrZXJJZDogbnVtYmVyLCBtc2c6IE1lc3NhZ2VGcm9tV29ya2VyKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnRhc2tBc3NpZ25tZW50cy5oYXMod29ya2VySWQpKSB7XG4gICAgICBjb25zdCBrbm93bldvcmtlcnMgPSBBcnJheS5mcm9tKHRoaXMudGFza0Fzc2lnbm1lbnRzLmtleXMoKSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFJlY2VpdmVkIG1lc3NhZ2UgZnJvbSB1bmtub3duIHdvcmtlciAjJHt3b3JrZXJJZH0gKGtub3duIHdvcmtlcnM6IGAgK1xuICAgICAgICAgIGAke2tub3duV29ya2Vycy5qb2luKCcsICcpfSk6ICR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKG1zZy50eXBlKSB7XG4gICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3Igb24gd29ya2VyICMke3dvcmtlcklkfTogJHttc2cuZXJyb3J9YCk7XG4gICAgICBjYXNlICd0YXNrLWNvbXBsZXRlZCc6XG4gICAgICAgIHJldHVybiB0aGlzLm9uV29ya2VyVGFza0NvbXBsZXRlZCh3b3JrZXJJZCwgbXNnKTtcbiAgICAgIGNhc2UgJ3VwZGF0ZS1wYWNrYWdlLWpzb24nOlxuICAgICAgICByZXR1cm4gdGhpcy5vbldvcmtlclVwZGF0ZVBhY2thZ2VKc29uKHdvcmtlcklkLCBtc2cpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEludmFsaWQgbWVzc2FnZSByZWNlaXZlZCBmcm9tIHdvcmtlciAjJHt3b3JrZXJJZH06ICR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKTtcbiAgICB9XG4gIH1cblxuICAvKiogSGFuZGxlIGEgd29ya2VyJ3MgY29taW5nIG9ubGluZS4gKi9cbiAgcHJpdmF0ZSBvbldvcmtlck9ubGluZSh3b3JrZXJJZDogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudGFza0Fzc2lnbm1lbnRzLmhhcyh3b3JrZXJJZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YXJpYW50IHZpb2xhdGVkOiBXb3JrZXIgIyR7d29ya2VySWR9IGNhbWUgb25saW5lIG1vcmUgdGhhbiBvbmNlLmApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnByb2Nlc3NpbmdTdGFydFRpbWUgPT09IC0xKSB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyB0YXNrcy4uLicpO1xuICAgICAgdGhpcy5wcm9jZXNzaW5nU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICB9XG5cbiAgICB0aGlzLnRhc2tBc3NpZ25tZW50cy5zZXQod29ya2VySWQsIG51bGwpO1xuICAgIHRoaXMubWF5YmVEaXN0cmlidXRlV29yaygpO1xuICB9XG5cbiAgLyoqIEhhbmRsZSBhIHdvcmtlcidzIGhhdmluZyBjb21wbGV0ZWQgdGhlaXIgYXNzaWduZWQgdGFzay4gKi9cbiAgcHJpdmF0ZSBvbldvcmtlclRhc2tDb21wbGV0ZWQod29ya2VySWQ6IG51bWJlciwgbXNnOiBUYXNrQ29tcGxldGVkTWVzc2FnZSk6IHZvaWQge1xuICAgIGNvbnN0IHRhc2sgPSB0aGlzLnRhc2tBc3NpZ25tZW50cy5nZXQod29ya2VySWQpIHx8IG51bGw7XG5cbiAgICBpZiAodGFzayA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFeHBlY3RlZCB3b3JrZXIgIyR7d29ya2VySWR9IHRvIGhhdmUgYSB0YXNrIGFzc2lnbmVkLCB3aGlsZSBoYW5kbGluZyBtZXNzYWdlOiBgICtcbiAgICAgICAgICBKU09OLnN0cmluZ2lmeShtc2cpKTtcbiAgICB9XG5cbiAgICB0aGlzLm9uVGFza0NvbXBsZXRlZCh0YXNrLCBtc2cub3V0Y29tZSwgbXNnLm1lc3NhZ2UpO1xuXG4gICAgdGhpcy50YXNrUXVldWUubWFya1Rhc2tDb21wbGV0ZWQodGFzayk7XG4gICAgdGhpcy50YXNrQXNzaWdubWVudHMuc2V0KHdvcmtlcklkLCBudWxsKTtcbiAgICB0aGlzLm1heWJlRGlzdHJpYnV0ZVdvcmsoKTtcbiAgfVxuXG4gIC8qKiBIYW5kbGUgYSB3b3JrZXIncyByZXF1ZXN0IHRvIHVwZGF0ZSBhIGBwYWNrYWdlLmpzb25gIGZpbGUuICovXG4gIHByaXZhdGUgb25Xb3JrZXJVcGRhdGVQYWNrYWdlSnNvbih3b3JrZXJJZDogbnVtYmVyLCBtc2c6IFVwZGF0ZVBhY2thZ2VKc29uTWVzc2FnZSk6IHZvaWQge1xuICAgIGNvbnN0IHRhc2sgPSB0aGlzLnRhc2tBc3NpZ25tZW50cy5nZXQod29ya2VySWQpIHx8IG51bGw7XG5cbiAgICBpZiAodGFzayA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFeHBlY3RlZCB3b3JrZXIgIyR7d29ya2VySWR9IHRvIGhhdmUgYSB0YXNrIGFzc2lnbmVkLCB3aGlsZSBoYW5kbGluZyBtZXNzYWdlOiBgICtcbiAgICAgICAgICBKU09OLnN0cmluZ2lmeShtc2cpKTtcbiAgICB9XG5cbiAgICBjb25zdCBleHBlY3RlZFBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUodGFzay5lbnRyeVBvaW50LnBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgICBjb25zdCBwYXJzZWRQYWNrYWdlSnNvbiA9IHRhc2suZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcblxuICAgIGlmIChleHBlY3RlZFBhY2thZ2VKc29uUGF0aCAhPT0gbXNnLnBhY2thZ2VKc29uUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBSZWNlaXZlZCAnJHttc2cudHlwZX0nIG1lc3NhZ2UgZnJvbSB3b3JrZXIgIyR7d29ya2VySWR9IGZvciAnJHttc2cucGFja2FnZUpzb25QYXRofScsIGAgK1xuICAgICAgICAgIGBidXQgd2FzIGV4cGVjdGluZyAnJHtleHBlY3RlZFBhY2thZ2VKc29uUGF0aH0nIChiYXNlZCBvbiB0YXNrIGFzc2lnbm1lbnQpLmApO1xuICAgIH1cblxuICAgIC8vIE5PVEU6IEFsdGhvdWdoIHRoZSBjaGFuZ2UgaW4gdGhlIHBhcnNlZCBgcGFja2FnZS5qc29uYCB3aWxsIGJlIHJlZmxlY3RlZCBpbiB0YXNrcyBvYmplY3RzXG4gICAgLy8gICAgICAgbG9jYWxseSBhbmQgdGh1cyBhbHNvIGluIGZ1dHVyZSBgcHJvY2Vzcy10YXNrYCBtZXNzYWdlcyBzZW50IHRvIHdvcmtlciBwcm9jZXNzZXMsIGFueVxuICAgIC8vICAgICAgIHByb2Nlc3NlcyBhbHJlYWR5IHJ1bm5pbmcgYW5kIHByb2Nlc3NpbmcgYSB0YXNrIGZvciB0aGUgc2FtZSBlbnRyeS1wb2ludCB3aWxsIG5vdCBnZXRcbiAgICAvLyAgICAgICB0aGUgY2hhbmdlLlxuICAgIC8vICAgICAgIERvIG5vdCByZWx5IG9uIGhhdmluZyBhbiB1cC10by1kYXRlIGBwYWNrYWdlLmpzb25gIHJlcHJlc2VudGF0aW9uIGluIHdvcmtlciBwcm9jZXNzZXMuXG4gICAgLy8gICAgICAgSW4gb3RoZXIgd29yZHMsIHRhc2sgcHJvY2Vzc2luZyBzaG91bGQgb25seSByZWx5IG9uIHRoZSBpbmZvIHRoYXQgd2FzIHRoZXJlIHdoZW4gdGhlXG4gICAgLy8gICAgICAgZmlsZSB3YXMgaW5pdGlhbGx5IHBhcnNlZCAoZHVyaW5nIGVudHJ5LXBvaW50IGFuYWx5c2lzKSBhbmQgbm90IG9uIHRoZSBpbmZvIHRoYXQgbWlnaHRcbiAgICAvLyAgICAgICBiZSBhZGRlZCBsYXRlciAoZHVyaW5nIHRhc2sgcHJvY2Vzc2luZykuXG4gICAgdGhpcy5wa2dKc29uVXBkYXRlci53cml0ZUNoYW5nZXMobXNnLmNoYW5nZXMsIG1zZy5wYWNrYWdlSnNvblBhdGgsIHBhcnNlZFBhY2thZ2VKc29uKTtcbiAgfVxuXG4gIC8qKiBTdG9wIGFsbCB3b3JrZXJzIGFuZCBzdG9wIGxpc3RlbmluZyBvbiBjbHVzdGVyIGV2ZW50cy4gKi9cbiAgcHJpdmF0ZSBzdG9wV29ya2VycygpOiB2b2lkIHtcbiAgICBjb25zdCB3b3JrZXJzID0gT2JqZWN0LnZhbHVlcyhjbHVzdGVyLndvcmtlcnMpIGFzIGNsdXN0ZXIuV29ya2VyW107XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoYFN0b3BwaW5nICR7d29ya2Vycy5sZW5ndGh9IHdvcmtlcnMuLi5gKTtcblxuICAgIGNsdXN0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgd29ya2Vycy5mb3JFYWNoKHdvcmtlciA9PiB3b3JrZXIua2lsbCgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcmFwIGFuIGV2ZW50IGhhbmRsZXIgdG8gZW5zdXJlIHRoYXQgYGZpbmlzaGVkRGVmZXJyZWRgIHdpbGwgYmUgcmVqZWN0ZWQgb24gZXJyb3IgKHJlZ2FyZGxlc3NcbiAgICogaWYgdGhlIGhhbmRsZXIgY29tcGxldGVzIHN5bmNocm9ub3VzbHkgb3IgYXN5bmNocm9ub3VzbHkpLlxuICAgKi9cbiAgcHJpdmF0ZSB3cmFwRXZlbnRIYW5kbGVyPEFyZ3MgZXh0ZW5kcyB1bmtub3duW10+KGZuOiAoLi4uYXJnczogQXJncykgPT4gdm9pZHxQcm9taXNlPHZvaWQ+KTpcbiAgICAgICguLi5hcmdzOiBBcmdzKSA9PiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gYXN5bmMgKC4uLmFyZ3M6IEFyZ3MpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZuKC4uLmFyZ3MpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRoaXMuZmluaXNoZWREZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG4iXX0=