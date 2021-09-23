/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/ngcc/src/execution/cluster/master", ["require", "exports", "tslib", "cluster", "@angular/compiler-cli/ngcc/src/execution/tasks/utils", "@angular/compiler-cli/ngcc/src/execution/cluster/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ClusterMaster = void 0;
    var tslib_1 = require("tslib");
    /// <reference types="node" />
    var cluster = require("cluster");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/utils");
    var utils_2 = require("@angular/compiler-cli/ngcc/src/execution/cluster/utils");
    /**
     * The cluster master is responsible for analyzing all entry-points, planning the work that needs to
     * be done, distributing it to worker-processes and collecting/post-processing the results.
     */
    var ClusterMaster = /** @class */ (function () {
        function ClusterMaster(maxWorkerCount, fileSystem, logger, fileWriter, pkgJsonUpdater, analyzeEntryPoints, createTaskCompletedCallback) {
            this.maxWorkerCount = maxWorkerCount;
            this.fileSystem = fileSystem;
            this.logger = logger;
            this.fileWriter = fileWriter;
            this.pkgJsonUpdater = pkgJsonUpdater;
            this.finishedDeferred = new utils_2.Deferred();
            this.processingStartTime = -1;
            this.taskAssignments = new Map();
            this.remainingRespawnAttempts = 3;
            if (!cluster.isMaster) {
                throw new Error('Tried to instantiate `ClusterMaster` on a worker process.');
            }
            // Set the worker entry-point
            cluster.setupMaster({ exec: this.fileSystem.resolve(__dirname, 'worker.js') });
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
                for (var _b = (0, tslib_1.__values)(Array.from(this.taskAssignments)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = (0, tslib_1.__read)(_c.value, 2), workerId = _d[0], assignedTask = _d[1];
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
                    this.taskAssignments.set(workerId, { task: task });
                    (0, utils_2.sendMessageToWorker)(workerId, { type: 'process-task', task: task });
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
                    var _b = (0, tslib_1.__read)(_a, 2), _workerId = _b[0], task = _b[1];
                    return task !== null;
                })
                    .map(function (_a) {
                    var _b = (0, tslib_1.__read)(_a, 1), workerId = _b[0];
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
            var assignment = this.taskAssignments.get(worker.id);
            this.taskAssignments.delete(worker.id);
            this.logger.warn("Worker #" + worker.id + " exited unexpectedly (code: " + code + " | signal: " + signal + ").\n" +
                ("  Current task: " + ((assignment == null) ? '-' : (0, utils_1.stringifyTask)(assignment.task)) + "\n") +
                ("  Current phase: " + ((assignment == null) ? '-' :
                    (assignment.files == null) ? 'compiling' : 'writing files')));
            if (assignment == null) {
                // The crashed worker process was not in the middle of a task:
                // Just spawn another process.
                this.logger.debug("Spawning another worker process to replace #" + worker.id + "...");
                cluster.fork();
            }
            else {
                var task = assignment.task, files = assignment.files;
                if (files != null) {
                    // The crashed worker process was in the middle of writing transformed files:
                    // Revert any changes before re-processing the task.
                    this.logger.debug("Reverting " + files.length + " transformed files...");
                    this.fileWriter.revertBundle(task.entryPoint, files, task.formatPropertiesToMarkAsProcessed);
                }
                // The crashed worker process was in the middle of a task:
                // Re-add the task back to the queue.
                this.taskQueue.markAsUnprocessed(task);
                // The crashing might be a result of increased memory consumption by ngcc.
                // Do not spawn another process, unless this was the last worker process.
                var spawnedWorkerCount = Object.keys(cluster.workers).length;
                if (spawnedWorkerCount > 0) {
                    this.logger.debug("Not spawning another worker process to replace #" + worker.id + ". Continuing with " + spawnedWorkerCount + " workers...");
                    this.maybeDistributeWork();
                }
                else if (this.remainingRespawnAttempts > 0) {
                    this.logger.debug("Spawning another worker process to replace #" + worker.id + "...");
                    this.remainingRespawnAttempts--;
                    cluster.fork();
                }
                else {
                    throw new Error('All worker processes crashed and attempts to re-spawn them failed. ' +
                        'Please check your system and ensure there is enough memory available.');
                }
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
                case 'transformed-files':
                    return this.onWorkerTransformedFiles(workerId, msg);
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
            var assignment = this.taskAssignments.get(workerId) || null;
            if (assignment === null) {
                throw new Error("Expected worker #" + workerId + " to have a task assigned, while handling message: " +
                    JSON.stringify(msg));
            }
            this.onTaskCompleted(assignment.task, msg.outcome, msg.message);
            this.taskQueue.markAsCompleted(assignment.task);
            this.taskAssignments.set(workerId, null);
            this.maybeDistributeWork();
        };
        /** Handle a worker's message regarding the files transformed while processing its task. */
        ClusterMaster.prototype.onWorkerTransformedFiles = function (workerId, msg) {
            var assignment = this.taskAssignments.get(workerId) || null;
            if (assignment === null) {
                throw new Error("Expected worker #" + workerId + " to have a task assigned, while handling message: " +
                    JSON.stringify(msg));
            }
            var oldFiles = assignment.files;
            var newFiles = msg.files;
            if (oldFiles !== undefined) {
                throw new Error("Worker #" + workerId + " reported transformed files more than once.\n" +
                    ("  Old files (" + oldFiles.length + "): [" + oldFiles.join(', ') + "]\n") +
                    ("  New files (" + newFiles.length + "): [" + newFiles.join(', ') + "]\n"));
            }
            assignment.files = newFiles;
        };
        /** Handle a worker's request to update a `package.json` file. */
        ClusterMaster.prototype.onWorkerUpdatePackageJson = function (workerId, msg) {
            var assignment = this.taskAssignments.get(workerId) || null;
            if (assignment === null) {
                throw new Error("Expected worker #" + workerId + " to have a task assigned, while handling message: " +
                    JSON.stringify(msg));
            }
            var entryPoint = assignment.task.entryPoint;
            var expectedPackageJsonPath = this.fileSystem.resolve(entryPoint.path, 'package.json');
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
            this.pkgJsonUpdater.writeChanges(msg.changes, msg.packageJsonPath, entryPoint.packageJson);
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
                return (0, tslib_1.__awaiter)(_this, void 0, void 0, function () {
                    var err_1;
                    return (0, tslib_1.__generator)(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, fn.apply(void 0, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(args), false))];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFzdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9jbHVzdGVyL21hc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOEJBQThCO0lBRTlCLGlDQUFtQztJQVFuQyw4RUFBNkM7SUFHN0MsZ0ZBQXNEO0lBR3REOzs7T0FHRztJQUNIO1FBUUUsdUJBQ1ksY0FBc0IsRUFBVSxVQUE0QixFQUFVLE1BQWMsRUFDcEYsVUFBc0IsRUFBVSxjQUFrQyxFQUMxRSxrQkFBd0MsRUFDeEMsMkJBQXdEO1lBSGhELG1CQUFjLEdBQWQsY0FBYyxDQUFRO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ3BGLGVBQVUsR0FBVixVQUFVLENBQVk7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBb0I7WUFUdEUscUJBQWdCLEdBQUcsSUFBSSxnQkFBUSxFQUFRLENBQUM7WUFDeEMsd0JBQW1CLEdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDakMsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBdUQsQ0FBQztZQUdqRiw2QkFBd0IsR0FBRyxDQUFDLENBQUM7WUFPbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUU7Z0JBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkRBQTJELENBQUMsQ0FBQzthQUM5RTtZQUVELDZCQUE2QjtZQUM3QixPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsRUFBQyxDQUFDLENBQUM7WUFFN0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxlQUFlLEdBQUcsMkJB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QUUsRUFBYixDQUFhLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQ7OztXQUdHO1FBQ0ssd0NBQWdCLEdBQXhCLFVBQWlELEVBQXlDO1lBQTFGLGlCQVNDO1lBUEMsT0FBTztnQkFBTyxjQUFhO3FCQUFiLFVBQWEsRUFBYixxQkFBYSxFQUFiLElBQWE7b0JBQWIseUJBQWE7Ozs7Ozs7O2dDQUV2QixxQkFBTSxFQUFFLGtFQUFJLElBQUksWUFBQzs7Z0NBQWpCLFNBQWlCLENBQUM7Ozs7Z0NBRWxCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsS0FBRyxDQUFDLENBQUM7Ozs7OzthQUVyQyxDQUFDO1FBQ0osQ0FBQztRQUNILG9CQUFDO0lBQUQsQ0FBQyxBQS9TRCxJQStTQztJQS9TWSxzQ0FBYSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG5pbXBvcnQgKiBhcyBjbHVzdGVyIGZyb20gJ2NsdXN0ZXInO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBQYXRoTWFuaXB1bGF0aW9ufSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7RmlsZVdyaXRlcn0gZnJvbSAnLi4vLi4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi4vLi4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge0FuYWx5emVFbnRyeVBvaW50c0ZufSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHtDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2ssIFRhc2ssIFRhc2tDb21wbGV0ZWRDYWxsYmFjaywgVGFza1F1ZXVlfSBmcm9tICcuLi90YXNrcy9hcGknO1xuaW1wb3J0IHtzdHJpbmdpZnlUYXNrfSBmcm9tICcuLi90YXNrcy91dGlscyc7XG5cbmltcG9ydCB7TWVzc2FnZUZyb21Xb3JrZXIsIFRhc2tDb21wbGV0ZWRNZXNzYWdlLCBUcmFuc2Zvcm1lZEZpbGVzTWVzc2FnZSwgVXBkYXRlUGFja2FnZUpzb25NZXNzYWdlfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0RlZmVycmVkLCBzZW5kTWVzc2FnZVRvV29ya2VyfSBmcm9tICcuL3V0aWxzJztcblxuXG4vKipcbiAqIFRoZSBjbHVzdGVyIG1hc3RlciBpcyByZXNwb25zaWJsZSBmb3IgYW5hbHl6aW5nIGFsbCBlbnRyeS1wb2ludHMsIHBsYW5uaW5nIHRoZSB3b3JrIHRoYXQgbmVlZHMgdG9cbiAqIGJlIGRvbmUsIGRpc3RyaWJ1dGluZyBpdCB0byB3b3JrZXItcHJvY2Vzc2VzIGFuZCBjb2xsZWN0aW5nL3Bvc3QtcHJvY2Vzc2luZyB0aGUgcmVzdWx0cy5cbiAqL1xuZXhwb3J0IGNsYXNzIENsdXN0ZXJNYXN0ZXIge1xuICBwcml2YXRlIGZpbmlzaGVkRGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQ8dm9pZD4oKTtcbiAgcHJpdmF0ZSBwcm9jZXNzaW5nU3RhcnRUaW1lOiBudW1iZXIgPSAtMTtcbiAgcHJpdmF0ZSB0YXNrQXNzaWdubWVudHMgPSBuZXcgTWFwPG51bWJlciwge3Rhc2s6IFRhc2ssIGZpbGVzPzogQWJzb2x1dGVGc1BhdGhbXX18bnVsbD4oKTtcbiAgcHJpdmF0ZSB0YXNrUXVldWU6IFRhc2tRdWV1ZTtcbiAgcHJpdmF0ZSBvblRhc2tDb21wbGV0ZWQ6IFRhc2tDb21wbGV0ZWRDYWxsYmFjaztcbiAgcHJpdmF0ZSByZW1haW5pbmdSZXNwYXduQXR0ZW1wdHMgPSAzO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBtYXhXb3JrZXJDb3VudDogbnVtYmVyLCBwcml2YXRlIGZpbGVTeXN0ZW06IFBhdGhNYW5pcHVsYXRpb24sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIGZpbGVXcml0ZXI6IEZpbGVXcml0ZXIsIHByaXZhdGUgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcixcbiAgICAgIGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4sXG4gICAgICBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2s6IENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjaykge1xuICAgIGlmICghY2x1c3Rlci5pc01hc3Rlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byBpbnN0YW50aWF0ZSBgQ2x1c3Rlck1hc3RlcmAgb24gYSB3b3JrZXIgcHJvY2Vzcy4nKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGhlIHdvcmtlciBlbnRyeS1wb2ludFxuICAgIGNsdXN0ZXIuc2V0dXBNYXN0ZXIoe2V4ZWM6IHRoaXMuZmlsZVN5c3RlbS5yZXNvbHZlKF9fZGlybmFtZSwgJ3dvcmtlci5qcycpfSk7XG5cbiAgICB0aGlzLnRhc2tRdWV1ZSA9IGFuYWx5emVFbnRyeVBvaW50cygpO1xuICAgIHRoaXMub25UYXNrQ29tcGxldGVkID0gY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKHRoaXMudGFza1F1ZXVlKTtcbiAgfVxuXG4gIHJ1bigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy50YXNrUXVldWUuYWxsVGFza3NDb21wbGV0ZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgdXAgbGlzdGVuZXJzIGZvciB3b3JrZXIgZXZlbnRzIChlbWl0dGVkIG9uIGBjbHVzdGVyYCkuXG4gICAgY2x1c3Rlci5vbignb25saW5lJywgdGhpcy53cmFwRXZlbnRIYW5kbGVyKHdvcmtlciA9PiB0aGlzLm9uV29ya2VyT25saW5lKHdvcmtlci5pZCkpKTtcblxuICAgIGNsdXN0ZXIub24oXG4gICAgICAgICdtZXNzYWdlJywgdGhpcy53cmFwRXZlbnRIYW5kbGVyKCh3b3JrZXIsIG1zZykgPT4gdGhpcy5vbldvcmtlck1lc3NhZ2Uod29ya2VyLmlkLCBtc2cpKSk7XG5cbiAgICBjbHVzdGVyLm9uKFxuICAgICAgICAnZXhpdCcsXG4gICAgICAgIHRoaXMud3JhcEV2ZW50SGFuZGxlcigod29ya2VyLCBjb2RlLCBzaWduYWwpID0+IHRoaXMub25Xb3JrZXJFeGl0KHdvcmtlciwgY29kZSwgc2lnbmFsKSkpO1xuXG4gICAgLy8gU2luY2Ugd2UgaGF2ZSBwZW5kaW5nIHRhc2tzIGF0IHRoZSB2ZXJ5IG1pbmltdW0gd2UgbmVlZCBhIHNpbmdsZSB3b3JrZXIuXG4gICAgY2x1c3Rlci5mb3JrKCk7XG5cbiAgICByZXR1cm4gdGhpcy5maW5pc2hlZERlZmVycmVkLnByb21pc2UudGhlbigoKSA9PiB0aGlzLnN0b3BXb3JrZXJzKCksIGVyciA9PiB7XG4gICAgICB0aGlzLnN0b3BXb3JrZXJzKCk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBUcnkgdG8gZmluZCBhdmFpbGFibGUgKGlkbGUpIHdvcmtlcnMgYW5kIGFzc2lnbiB0aGVtIGF2YWlsYWJsZSAobm9uLWJsb2NrZWQpIHRhc2tzLiAqL1xuICBwcml2YXRlIG1heWJlRGlzdHJpYnV0ZVdvcmsoKTogdm9pZCB7XG4gICAgbGV0IGlzV29ya2VyQXZhaWxhYmxlID0gZmFsc2U7XG5cbiAgICAvLyBGaXJzdCwgY2hlY2sgd2hldGhlciBhbGwgdGFza3MgaGF2ZSBiZWVuIGNvbXBsZXRlZC5cbiAgICBpZiAodGhpcy50YXNrUXVldWUuYWxsVGFza3NDb21wbGV0ZWQpIHtcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHRoaXMucHJvY2Vzc2luZ1N0YXJ0VGltZSkgLyAxMDApIC8gMTA7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUHJvY2Vzc2VkIHRhc2tzIGluICR7ZHVyYXRpb259cy5gKTtcblxuICAgICAgcmV0dXJuIHRoaXMuZmluaXNoZWREZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgYXZhaWxhYmxlIHdvcmtlcnMgYW5kIGF2YWlsYWJsZSB0YXNrcyB0byBhc3NpZ24gdG8gdGhlbS5cbiAgICBmb3IgKGNvbnN0IFt3b3JrZXJJZCwgYXNzaWduZWRUYXNrXSBvZiBBcnJheS5mcm9tKHRoaXMudGFza0Fzc2lnbm1lbnRzKSkge1xuICAgICAgaWYgKGFzc2lnbmVkVGFzayAhPT0gbnVsbCkge1xuICAgICAgICAvLyBUaGlzIHdvcmtlciBhbHJlYWR5IGhhcyBhIGpvYjsgY2hlY2sgb3RoZXIgd29ya2Vycy5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUaGlzIHdvcmtlciBpcyBhdmFpbGFibGUuXG4gICAgICAgIGlzV29ya2VyQXZhaWxhYmxlID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhpcyB3b3JrZXIgbmVlZHMgYSBqb2IuIFNlZSBpZiBhbnkgYXJlIGF2YWlsYWJsZS5cbiAgICAgIGNvbnN0IHRhc2sgPSB0aGlzLnRhc2tRdWV1ZS5nZXROZXh0VGFzaygpO1xuICAgICAgaWYgKHRhc2sgPT09IG51bGwpIHtcbiAgICAgICAgLy8gTm8gc3VpdGFibGUgd29yayBhdmFpbGFibGUgcmlnaHQgbm93LlxuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gUHJvY2VzcyB0aGUgbmV4dCB0YXNrIG9uIHRoZSB3b3JrZXIuXG4gICAgICB0aGlzLnRhc2tBc3NpZ25tZW50cy5zZXQod29ya2VySWQsIHt0YXNrfSk7XG4gICAgICBzZW5kTWVzc2FnZVRvV29ya2VyKHdvcmtlcklkLCB7dHlwZTogJ3Byb2Nlc3MtdGFzaycsIHRhc2t9KTtcblxuICAgICAgaXNXb3JrZXJBdmFpbGFibGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWlzV29ya2VyQXZhaWxhYmxlKSB7XG4gICAgICBjb25zdCBzcGF3bmVkV29ya2VyQ291bnQgPSBPYmplY3Qua2V5cyhjbHVzdGVyLndvcmtlcnMpLmxlbmd0aDtcbiAgICAgIGlmIChzcGF3bmVkV29ya2VyQ291bnQgPCB0aGlzLm1heFdvcmtlckNvdW50KSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdTcGF3bmluZyBhbm90aGVyIHdvcmtlciBwcm9jZXNzIGFzIHRoZXJlIGlzIG1vcmUgd29yayB0byBiZSBkb25lLicpO1xuICAgICAgICBjbHVzdGVyLmZvcmsoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBhdmFpbGFibGUgd29ya2VycyBvciBubyBhdmFpbGFibGUgdGFza3MsIGxvZyAoZm9yIGRlYnVnZ2luZyBwdXJwb3NlcykuXG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAgICAgYEFsbCAke3NwYXduZWRXb3JrZXJDb3VudH0gd29ya2VycyBhcmUgY3VycmVudGx5IGJ1c3kgYW5kIGNhbm5vdCB0YWtlIG9uIG1vcmUgd29yay5gKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgYnVzeVdvcmtlcnMgPSBBcnJheS5mcm9tKHRoaXMudGFza0Fzc2lnbm1lbnRzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoW193b3JrZXJJZCwgdGFza10pID0+IHRhc2sgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKChbd29ya2VySWRdKSA9PiB3b3JrZXJJZCk7XG4gICAgICBjb25zdCB0b3RhbFdvcmtlckNvdW50ID0gdGhpcy50YXNrQXNzaWdubWVudHMuc2l6ZTtcbiAgICAgIGNvbnN0IGlkbGVXb3JrZXJDb3VudCA9IHRvdGFsV29ya2VyQ291bnQgLSBidXN5V29ya2Vycy5sZW5ndGg7XG5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAgIGBObyBhc3NpZ25tZW50cyBmb3IgJHtpZGxlV29ya2VyQ291bnR9IGlkbGUgKG91dCBvZiAke3RvdGFsV29ya2VyQ291bnR9IHRvdGFsKSBgICtcbiAgICAgICAgICBgd29ya2Vycy4gQnVzeSB3b3JrZXJzOiAke2J1c3lXb3JrZXJzLmpvaW4oJywgJyl9YCk7XG5cbiAgICAgIGlmIChidXN5V29ya2Vycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIGJ1ZzpcbiAgICAgICAgLy8gQWxsIHdvcmtlcnMgYXJlIGlkbGUgKG1lYW5pbmcgbm8gdGFza3MgYXJlIGluIHByb2dyZXNzKSBhbmQgYHRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZGBcbiAgICAgICAgLy8gaXMgYGZhbHNlYCwgYnV0IHRoZXJlIGlzIHN0aWxsIG5vIGFzc2lnbmFibGUgd29yay5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ1RoZXJlIGFyZSBzdGlsbCB1bnByb2Nlc3NlZCB0YXNrcyBpbiB0aGUgcXVldWUgYW5kIG5vIHRhc2tzIGFyZSBjdXJyZW50bHkgaW4gJyArXG4gICAgICAgICAgICBgcHJvZ3Jlc3MsIHlldCB0aGUgcXVldWUgZGlkIG5vdCByZXR1cm4gYW55IGF2YWlsYWJsZSB0YXNrczogJHt0aGlzLnRhc2tRdWV1ZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogSGFuZGxlIGEgd29ya2VyJ3MgZXhpdGluZy4gKE1pZ2h0IGJlIGludGVudGlvbmFsIG9yIG5vdC4pICovXG4gIHByaXZhdGUgb25Xb3JrZXJFeGl0KHdvcmtlcjogY2x1c3Rlci5Xb3JrZXIsIGNvZGU6IG51bWJlcnxudWxsLCBzaWduYWw6IHN0cmluZ3xudWxsKTogdm9pZCB7XG4gICAgLy8gSWYgdGhlIHdvcmtlcidzIGV4aXRpbmcgd2FzIGludGVudGlvbmFsLCBub3RoaW5nIHRvIGRvLlxuICAgIGlmICh3b3JrZXIuZXhpdGVkQWZ0ZXJEaXNjb25uZWN0KSByZXR1cm47XG5cbiAgICAvLyBUaGUgd29ya2VyIGV4aXRlZCB1bmV4cGVjdGVkbHk6IERldGVybWluZSBpdCdzIHN0YXR1cyBhbmQgdGFrZSBhbiBhcHByb3ByaWF0ZSBhY3Rpb24uXG4gICAgY29uc3QgYXNzaWdubWVudCA9IHRoaXMudGFza0Fzc2lnbm1lbnRzLmdldCh3b3JrZXIuaWQpO1xuICAgIHRoaXMudGFza0Fzc2lnbm1lbnRzLmRlbGV0ZSh3b3JrZXIuaWQpO1xuXG4gICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgYFdvcmtlciAjJHt3b3JrZXIuaWR9IGV4aXRlZCB1bmV4cGVjdGVkbHkgKGNvZGU6ICR7Y29kZX0gfCBzaWduYWw6ICR7c2lnbmFsfSkuXFxuYCArXG4gICAgICAgIGAgIEN1cnJlbnQgdGFzazogJHsoYXNzaWdubWVudCA9PSBudWxsKSA/ICctJyA6IHN0cmluZ2lmeVRhc2soYXNzaWdubWVudC50YXNrKX1cXG5gICtcbiAgICAgICAgYCAgQ3VycmVudCBwaGFzZTogJHtcbiAgICAgICAgICAgIChhc3NpZ25tZW50ID09IG51bGwpID8gJy0nIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGFzc2lnbm1lbnQuZmlsZXMgPT0gbnVsbCkgPyAnY29tcGlsaW5nJyA6ICd3cml0aW5nIGZpbGVzJ31gKTtcblxuICAgIGlmIChhc3NpZ25tZW50ID09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBjcmFzaGVkIHdvcmtlciBwcm9jZXNzIHdhcyBub3QgaW4gdGhlIG1pZGRsZSBvZiBhIHRhc2s6XG4gICAgICAvLyBKdXN0IHNwYXduIGFub3RoZXIgcHJvY2Vzcy5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBTcGF3bmluZyBhbm90aGVyIHdvcmtlciBwcm9jZXNzIHRvIHJlcGxhY2UgIyR7d29ya2VyLmlkfS4uLmApO1xuICAgICAgY2x1c3Rlci5mb3JrKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHt0YXNrLCBmaWxlc30gPSBhc3NpZ25tZW50O1xuXG4gICAgICBpZiAoZmlsZXMgIT0gbnVsbCkge1xuICAgICAgICAvLyBUaGUgY3Jhc2hlZCB3b3JrZXIgcHJvY2VzcyB3YXMgaW4gdGhlIG1pZGRsZSBvZiB3cml0aW5nIHRyYW5zZm9ybWVkIGZpbGVzOlxuICAgICAgICAvLyBSZXZlcnQgYW55IGNoYW5nZXMgYmVmb3JlIHJlLXByb2Nlc3NpbmcgdGhlIHRhc2suXG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBSZXZlcnRpbmcgJHtmaWxlcy5sZW5ndGh9IHRyYW5zZm9ybWVkIGZpbGVzLi4uYCk7XG4gICAgICAgIHRoaXMuZmlsZVdyaXRlci5yZXZlcnRCdW5kbGUoXG4gICAgICAgICAgICB0YXNrLmVudHJ5UG9pbnQsIGZpbGVzLCB0YXNrLmZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBjcmFzaGVkIHdvcmtlciBwcm9jZXNzIHdhcyBpbiB0aGUgbWlkZGxlIG9mIGEgdGFzazpcbiAgICAgIC8vIFJlLWFkZCB0aGUgdGFzayBiYWNrIHRvIHRoZSBxdWV1ZS5cbiAgICAgIHRoaXMudGFza1F1ZXVlLm1hcmtBc1VucHJvY2Vzc2VkKHRhc2spO1xuXG4gICAgICAvLyBUaGUgY3Jhc2hpbmcgbWlnaHQgYmUgYSByZXN1bHQgb2YgaW5jcmVhc2VkIG1lbW9yeSBjb25zdW1wdGlvbiBieSBuZ2NjLlxuICAgICAgLy8gRG8gbm90IHNwYXduIGFub3RoZXIgcHJvY2VzcywgdW5sZXNzIHRoaXMgd2FzIHRoZSBsYXN0IHdvcmtlciBwcm9jZXNzLlxuICAgICAgY29uc3Qgc3Bhd25lZFdvcmtlckNvdW50ID0gT2JqZWN0LmtleXMoY2x1c3Rlci53b3JrZXJzKS5sZW5ndGg7XG4gICAgICBpZiAoc3Bhd25lZFdvcmtlckNvdW50ID4gMCkge1xuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgTm90IHNwYXduaW5nIGFub3RoZXIgd29ya2VyIHByb2Nlc3MgdG8gcmVwbGFjZSAjJHtcbiAgICAgICAgICAgIHdvcmtlci5pZH0uIENvbnRpbnVpbmcgd2l0aCAke3NwYXduZWRXb3JrZXJDb3VudH0gd29ya2Vycy4uLmApO1xuICAgICAgICB0aGlzLm1heWJlRGlzdHJpYnV0ZVdvcmsoKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5yZW1haW5pbmdSZXNwYXduQXR0ZW1wdHMgPiAwKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBTcGF3bmluZyBhbm90aGVyIHdvcmtlciBwcm9jZXNzIHRvIHJlcGxhY2UgIyR7d29ya2VyLmlkfS4uLmApO1xuICAgICAgICB0aGlzLnJlbWFpbmluZ1Jlc3Bhd25BdHRlbXB0cy0tO1xuICAgICAgICBjbHVzdGVyLmZvcmsoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdBbGwgd29ya2VyIHByb2Nlc3NlcyBjcmFzaGVkIGFuZCBhdHRlbXB0cyB0byByZS1zcGF3biB0aGVtIGZhaWxlZC4gJyArXG4gICAgICAgICAgICAnUGxlYXNlIGNoZWNrIHlvdXIgc3lzdGVtIGFuZCBlbnN1cmUgdGhlcmUgaXMgZW5vdWdoIG1lbW9yeSBhdmFpbGFibGUuJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqIEhhbmRsZSBhIG1lc3NhZ2UgZnJvbSBhIHdvcmtlci4gKi9cbiAgcHJpdmF0ZSBvbldvcmtlck1lc3NhZ2Uod29ya2VySWQ6IG51bWJlciwgbXNnOiBNZXNzYWdlRnJvbVdvcmtlcik6IHZvaWQge1xuICAgIGlmICghdGhpcy50YXNrQXNzaWdubWVudHMuaGFzKHdvcmtlcklkKSkge1xuICAgICAgY29uc3Qga25vd25Xb3JrZXJzID0gQXJyYXkuZnJvbSh0aGlzLnRhc2tBc3NpZ25tZW50cy5rZXlzKCkpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBSZWNlaXZlZCBtZXNzYWdlIGZyb20gdW5rbm93biB3b3JrZXIgIyR7d29ya2VySWR9IChrbm93biB3b3JrZXJzOiBgICtcbiAgICAgICAgICBgJHtrbm93bldvcmtlcnMuam9pbignLCAnKX0pOiAke0pTT04uc3RyaW5naWZ5KG1zZyl9YCk7XG4gICAgfVxuXG4gICAgc3dpdGNoIChtc2cudHlwZSkge1xuICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIG9uIHdvcmtlciAjJHt3b3JrZXJJZH06ICR7bXNnLmVycm9yfWApO1xuICAgICAgY2FzZSAndGFzay1jb21wbGV0ZWQnOlxuICAgICAgICByZXR1cm4gdGhpcy5vbldvcmtlclRhc2tDb21wbGV0ZWQod29ya2VySWQsIG1zZyk7XG4gICAgICBjYXNlICd0cmFuc2Zvcm1lZC1maWxlcyc6XG4gICAgICAgIHJldHVybiB0aGlzLm9uV29ya2VyVHJhbnNmb3JtZWRGaWxlcyh3b3JrZXJJZCwgbXNnKTtcbiAgICAgIGNhc2UgJ3VwZGF0ZS1wYWNrYWdlLWpzb24nOlxuICAgICAgICByZXR1cm4gdGhpcy5vbldvcmtlclVwZGF0ZVBhY2thZ2VKc29uKHdvcmtlcklkLCBtc2cpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEludmFsaWQgbWVzc2FnZSByZWNlaXZlZCBmcm9tIHdvcmtlciAjJHt3b3JrZXJJZH06ICR7SlNPTi5zdHJpbmdpZnkobXNnKX1gKTtcbiAgICB9XG4gIH1cblxuICAvKiogSGFuZGxlIGEgd29ya2VyJ3MgY29taW5nIG9ubGluZS4gKi9cbiAgcHJpdmF0ZSBvbldvcmtlck9ubGluZSh3b3JrZXJJZDogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudGFza0Fzc2lnbm1lbnRzLmhhcyh3b3JrZXJJZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YXJpYW50IHZpb2xhdGVkOiBXb3JrZXIgIyR7d29ya2VySWR9IGNhbWUgb25saW5lIG1vcmUgdGhhbiBvbmNlLmApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnByb2Nlc3NpbmdTdGFydFRpbWUgPT09IC0xKSB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyB0YXNrcy4uLicpO1xuICAgICAgdGhpcy5wcm9jZXNzaW5nU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICB9XG5cbiAgICB0aGlzLnRhc2tBc3NpZ25tZW50cy5zZXQod29ya2VySWQsIG51bGwpO1xuICAgIHRoaXMubWF5YmVEaXN0cmlidXRlV29yaygpO1xuICB9XG5cbiAgLyoqIEhhbmRsZSBhIHdvcmtlcidzIGhhdmluZyBjb21wbGV0ZWQgdGhlaXIgYXNzaWduZWQgdGFzay4gKi9cbiAgcHJpdmF0ZSBvbldvcmtlclRhc2tDb21wbGV0ZWQod29ya2VySWQ6IG51bWJlciwgbXNnOiBUYXNrQ29tcGxldGVkTWVzc2FnZSk6IHZvaWQge1xuICAgIGNvbnN0IGFzc2lnbm1lbnQgPSB0aGlzLnRhc2tBc3NpZ25tZW50cy5nZXQod29ya2VySWQpIHx8IG51bGw7XG5cbiAgICBpZiAoYXNzaWdubWVudCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFeHBlY3RlZCB3b3JrZXIgIyR7d29ya2VySWR9IHRvIGhhdmUgYSB0YXNrIGFzc2lnbmVkLCB3aGlsZSBoYW5kbGluZyBtZXNzYWdlOiBgICtcbiAgICAgICAgICBKU09OLnN0cmluZ2lmeShtc2cpKTtcbiAgICB9XG5cbiAgICB0aGlzLm9uVGFza0NvbXBsZXRlZChhc3NpZ25tZW50LnRhc2ssIG1zZy5vdXRjb21lLCBtc2cubWVzc2FnZSk7XG5cbiAgICB0aGlzLnRhc2tRdWV1ZS5tYXJrQXNDb21wbGV0ZWQoYXNzaWdubWVudC50YXNrKTtcbiAgICB0aGlzLnRhc2tBc3NpZ25tZW50cy5zZXQod29ya2VySWQsIG51bGwpO1xuICAgIHRoaXMubWF5YmVEaXN0cmlidXRlV29yaygpO1xuICB9XG5cbiAgLyoqIEhhbmRsZSBhIHdvcmtlcidzIG1lc3NhZ2UgcmVnYXJkaW5nIHRoZSBmaWxlcyB0cmFuc2Zvcm1lZCB3aGlsZSBwcm9jZXNzaW5nIGl0cyB0YXNrLiAqL1xuICBwcml2YXRlIG9uV29ya2VyVHJhbnNmb3JtZWRGaWxlcyh3b3JrZXJJZDogbnVtYmVyLCBtc2c6IFRyYW5zZm9ybWVkRmlsZXNNZXNzYWdlKTogdm9pZCB7XG4gICAgY29uc3QgYXNzaWdubWVudCA9IHRoaXMudGFza0Fzc2lnbm1lbnRzLmdldCh3b3JrZXJJZCkgfHwgbnVsbDtcblxuICAgIGlmIChhc3NpZ25tZW50ID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEV4cGVjdGVkIHdvcmtlciAjJHt3b3JrZXJJZH0gdG8gaGF2ZSBhIHRhc2sgYXNzaWduZWQsIHdoaWxlIGhhbmRsaW5nIG1lc3NhZ2U6IGAgK1xuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KG1zZykpO1xuICAgIH1cblxuICAgIGNvbnN0IG9sZEZpbGVzID0gYXNzaWdubWVudC5maWxlcztcbiAgICBjb25zdCBuZXdGaWxlcyA9IG1zZy5maWxlcztcblxuICAgIGlmIChvbGRGaWxlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFdvcmtlciAjJHt3b3JrZXJJZH0gcmVwb3J0ZWQgdHJhbnNmb3JtZWQgZmlsZXMgbW9yZSB0aGFuIG9uY2UuXFxuYCArXG4gICAgICAgICAgYCAgT2xkIGZpbGVzICgke29sZEZpbGVzLmxlbmd0aH0pOiBbJHtvbGRGaWxlcy5qb2luKCcsICcpfV1cXG5gICtcbiAgICAgICAgICBgICBOZXcgZmlsZXMgKCR7bmV3RmlsZXMubGVuZ3RofSk6IFske25ld0ZpbGVzLmpvaW4oJywgJyl9XVxcbmApO1xuICAgIH1cblxuICAgIGFzc2lnbm1lbnQuZmlsZXMgPSBuZXdGaWxlcztcbiAgfVxuXG4gIC8qKiBIYW5kbGUgYSB3b3JrZXIncyByZXF1ZXN0IHRvIHVwZGF0ZSBhIGBwYWNrYWdlLmpzb25gIGZpbGUuICovXG4gIHByaXZhdGUgb25Xb3JrZXJVcGRhdGVQYWNrYWdlSnNvbih3b3JrZXJJZDogbnVtYmVyLCBtc2c6IFVwZGF0ZVBhY2thZ2VKc29uTWVzc2FnZSk6IHZvaWQge1xuICAgIGNvbnN0IGFzc2lnbm1lbnQgPSB0aGlzLnRhc2tBc3NpZ25tZW50cy5nZXQod29ya2VySWQpIHx8IG51bGw7XG5cbiAgICBpZiAoYXNzaWdubWVudCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFeHBlY3RlZCB3b3JrZXIgIyR7d29ya2VySWR9IHRvIGhhdmUgYSB0YXNrIGFzc2lnbmVkLCB3aGlsZSBoYW5kbGluZyBtZXNzYWdlOiBgICtcbiAgICAgICAgICBKU09OLnN0cmluZ2lmeShtc2cpKTtcbiAgICB9XG5cbiAgICBjb25zdCBlbnRyeVBvaW50ID0gYXNzaWdubWVudC50YXNrLmVudHJ5UG9pbnQ7XG4gICAgY29uc3QgZXhwZWN0ZWRQYWNrYWdlSnNvblBhdGggPSB0aGlzLmZpbGVTeXN0ZW0ucmVzb2x2ZShlbnRyeVBvaW50LnBhdGgsICdwYWNrYWdlLmpzb24nKTtcblxuICAgIGlmIChleHBlY3RlZFBhY2thZ2VKc29uUGF0aCAhPT0gbXNnLnBhY2thZ2VKc29uUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBSZWNlaXZlZCAnJHttc2cudHlwZX0nIG1lc3NhZ2UgZnJvbSB3b3JrZXIgIyR7d29ya2VySWR9IGZvciAnJHttc2cucGFja2FnZUpzb25QYXRofScsIGAgK1xuICAgICAgICAgIGBidXQgd2FzIGV4cGVjdGluZyAnJHtleHBlY3RlZFBhY2thZ2VKc29uUGF0aH0nIChiYXNlZCBvbiB0YXNrIGFzc2lnbm1lbnQpLmApO1xuICAgIH1cblxuICAgIC8vIE5PVEU6IEFsdGhvdWdoIHRoZSBjaGFuZ2UgaW4gdGhlIHBhcnNlZCBgcGFja2FnZS5qc29uYCB3aWxsIGJlIHJlZmxlY3RlZCBpbiB0YXNrcyBvYmplY3RzXG4gICAgLy8gICAgICAgbG9jYWxseSBhbmQgdGh1cyBhbHNvIGluIGZ1dHVyZSBgcHJvY2Vzcy10YXNrYCBtZXNzYWdlcyBzZW50IHRvIHdvcmtlciBwcm9jZXNzZXMsIGFueVxuICAgIC8vICAgICAgIHByb2Nlc3NlcyBhbHJlYWR5IHJ1bm5pbmcgYW5kIHByb2Nlc3NpbmcgYSB0YXNrIGZvciB0aGUgc2FtZSBlbnRyeS1wb2ludCB3aWxsIG5vdCBnZXRcbiAgICAvLyAgICAgICB0aGUgY2hhbmdlLlxuICAgIC8vICAgICAgIERvIG5vdCByZWx5IG9uIGhhdmluZyBhbiB1cC10by1kYXRlIGBwYWNrYWdlLmpzb25gIHJlcHJlc2VudGF0aW9uIGluIHdvcmtlciBwcm9jZXNzZXMuXG4gICAgLy8gICAgICAgSW4gb3RoZXIgd29yZHMsIHRhc2sgcHJvY2Vzc2luZyBzaG91bGQgb25seSByZWx5IG9uIHRoZSBpbmZvIHRoYXQgd2FzIHRoZXJlIHdoZW4gdGhlXG4gICAgLy8gICAgICAgZmlsZSB3YXMgaW5pdGlhbGx5IHBhcnNlZCAoZHVyaW5nIGVudHJ5LXBvaW50IGFuYWx5c2lzKSBhbmQgbm90IG9uIHRoZSBpbmZvIHRoYXQgbWlnaHRcbiAgICAvLyAgICAgICBiZSBhZGRlZCBsYXRlciAoZHVyaW5nIHRhc2sgcHJvY2Vzc2luZykuXG4gICAgdGhpcy5wa2dKc29uVXBkYXRlci53cml0ZUNoYW5nZXMobXNnLmNoYW5nZXMsIG1zZy5wYWNrYWdlSnNvblBhdGgsIGVudHJ5UG9pbnQucGFja2FnZUpzb24pO1xuICB9XG5cbiAgLyoqIFN0b3AgYWxsIHdvcmtlcnMgYW5kIHN0b3AgbGlzdGVuaW5nIG9uIGNsdXN0ZXIgZXZlbnRzLiAqL1xuICBwcml2YXRlIHN0b3BXb3JrZXJzKCk6IHZvaWQge1xuICAgIGNvbnN0IHdvcmtlcnMgPSBPYmplY3QudmFsdWVzKGNsdXN0ZXIud29ya2VycykgYXMgY2x1c3Rlci5Xb3JrZXJbXTtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgU3RvcHBpbmcgJHt3b3JrZXJzLmxlbmd0aH0gd29ya2Vycy4uLmApO1xuXG4gICAgY2x1c3Rlci5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICB3b3JrZXJzLmZvckVhY2god29ya2VyID0+IHdvcmtlci5raWxsKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyYXAgYW4gZXZlbnQgaGFuZGxlciB0byBlbnN1cmUgdGhhdCBgZmluaXNoZWREZWZlcnJlZGAgd2lsbCBiZSByZWplY3RlZCBvbiBlcnJvciAocmVnYXJkbGVzc1xuICAgKiBpZiB0aGUgaGFuZGxlciBjb21wbGV0ZXMgc3luY2hyb25vdXNseSBvciBhc3luY2hyb25vdXNseSkuXG4gICAqL1xuICBwcml2YXRlIHdyYXBFdmVudEhhbmRsZXI8QXJncyBleHRlbmRzIHVua25vd25bXT4oZm46ICguLi5hcmdzOiBBcmdzKSA9PiB2b2lkfFByb21pc2U8dm9pZD4pOlxuICAgICAgKC4uLmFyZ3M6IEFyZ3MpID0+IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBhc3luYyAoLi4uYXJnczogQXJncykgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZm4oLi4uYXJncyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy5maW5pc2hlZERlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cbiJdfQ==