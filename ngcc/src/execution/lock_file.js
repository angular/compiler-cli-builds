(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/lock_file", ["require", "exports", "tslib", "process", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var process = require("process");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var LockFileBase = /** @class */ (function () {
        function LockFileBase(fs) {
            var _this = this;
            this.fs = fs;
            this.lockFilePath = this.fs.resolve(require.resolve('@angular/compiler-cli/ngcc'), '../__ngcc_lock_file__');
            /**
             * This handler needs to be defined as a property rather than a method
             * so that it can be passed around as a bound function.
             */
            this.signalHandler = function () {
                _this.remove();
                _this.exit(1);
            };
        }
        LockFileBase.prototype.writeLockFile = function () {
            try {
                this.addSignalHandlers();
                // To avoid race conditions, we check for existence of the lockfile
                // by actually trying to create it exclusively.
                return this.fs.writeFile(this.lockFilePath, process.pid.toString(), /* exclusive */ true);
            }
            catch (e) {
                this.removeSignalHandlers();
                throw e;
            }
        };
        /**
         * Read the pid from the lockfile.
         *
         * It is feasible that the lockfile was removed between the previous check for existence
         * and this file-read. If so then we still error but as gracefully as possible.
         */
        LockFileBase.prototype.readLockFile = function () {
            try {
                if (this.fs instanceof file_system_1.CachedFileSystem) {
                    // This file is "volatile", it might be changed by an external process,
                    // so we cannot rely upon the cached value when reading it.
                    this.fs.invalidateCaches(this.lockFilePath);
                }
                return this.fs.readFile(this.lockFilePath);
            }
            catch (_a) {
                return '{unknown}';
            }
        };
        /**
         * Remove the lock file from disk.
         */
        LockFileBase.prototype.remove = function () {
            this.removeSignalHandlers();
            if (this.fs.exists(this.lockFilePath)) {
                this.fs.removeFile(this.lockFilePath);
            }
        };
        /**
         * Capture CTRL-C and terminal closing events.
         * When these occur we remove the lockfile and exit.
         */
        LockFileBase.prototype.addSignalHandlers = function () {
            process.addListener('SIGINT', this.signalHandler);
            process.addListener('SIGHUP', this.signalHandler);
        };
        /**
         * Clear the event handlers to prevent leakage.
         */
        LockFileBase.prototype.removeSignalHandlers = function () {
            process.removeListener('SIGINT', this.signalHandler);
            process.removeListener('SIGHUP', this.signalHandler);
        };
        /**
         * This function wraps `process.exit()` which makes it easier to manage in unit tests,
         * since it is not possible to mock out `process.exit()` when it is called from signal handlers.
         */
        LockFileBase.prototype.exit = function (code) {
            process.exit(code);
        };
        return LockFileBase;
    }());
    exports.LockFileBase = LockFileBase;
    /**
     * LockFileSync is used to prevent more than one instance of ngcc executing at the same time,
     * when being called in a synchronous context.
     *
     * * When ngcc starts executing, it creates a file in the `compiler-cli/ngcc` folder.
     * * If it finds one is already there then it fails with a suitable error message.
     * * When ngcc completes executing, it removes the file so that future ngcc executions can start.
     */
    var LockFileSync = /** @class */ (function (_super) {
        tslib_1.__extends(LockFileSync, _super);
        function LockFileSync() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /**
         * Run the given function guarded by the lock file.
         *
         * @param fn the function to run.
         * @returns the value returned from the `fn` call.
         */
        LockFileSync.prototype.lock = function (fn) {
            this.create();
            try {
                return fn();
            }
            finally {
                this.remove();
            }
        };
        /**
         * Write a lock file to disk, or error if there is already one there.
         */
        LockFileSync.prototype.create = function () {
            try {
                this.writeLockFile();
            }
            catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
                this.handleExistingLockFile();
            }
        };
        /**
         * The lockfile already exists so raise a helpful error.
         */
        LockFileSync.prototype.handleExistingLockFile = function () {
            var pid = this.readLockFile();
            throw new Error("ngcc is already running at process with id " + pid + ".\n" +
                "If you are running multiple builds in parallel then you should pre-process your node_modules via the command line ngcc tool before starting the builds;\n" +
                "See https://v9.angular.io/guide/ivy#speeding-up-ngcc-compilation.\n" +
                ("(If you are sure no ngcc process is running then you should delete the lockfile at " + this.lockFilePath + ".)"));
        };
        return LockFileSync;
    }(LockFileBase));
    exports.LockFileSync = LockFileSync;
    /**
     * LockFileAsync is used to prevent more than one instance of ngcc executing at the same time,
     * when being called in an asynchronous context.
     *
     * * When ngcc starts executing, it creates a file in the `compiler-cli/ngcc` folder.
     * * If it finds one is already there then it pauses and waits for the file to be removed by the
     *   other process. If the file is not removed within a set timeout period given by
     *   `retryDelay*retryAttempts` an error is thrown with a suitable error message.
     * * If the process locking the file changes, then we restart the timeout.
     * * When ngcc completes executing, it removes the file so that future ngcc executions can start.
     */
    var LockFileAsync = /** @class */ (function (_super) {
        tslib_1.__extends(LockFileAsync, _super);
        function LockFileAsync(fs, logger, retryDelay, retryAttempts) {
            var _this = _super.call(this, fs) || this;
            _this.logger = logger;
            _this.retryDelay = retryDelay;
            _this.retryAttempts = retryAttempts;
            return _this;
        }
        /**
         * Run a function guarded by the lock file.
         *
         * @param fn The function to run.
         */
        LockFileAsync.prototype.lock = function (fn) {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.create()];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, fn().finally(function () { return _this.remove(); })];
                        case 2: return [2 /*return*/, _a.sent()];
                    }
                });
            });
        };
        LockFileAsync.prototype.create = function () {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var pid, attempts, e_1, newPid;
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            pid = '';
                            attempts = 0;
                            _a.label = 1;
                        case 1:
                            if (!(attempts < this.retryAttempts)) return [3 /*break*/, 6];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 3, , 5]);
                            return [2 /*return*/, this.writeLockFile()];
                        case 3:
                            e_1 = _a.sent();
                            if (e_1.code !== 'EEXIST') {
                                throw e_1;
                            }
                            newPid = this.readLockFile();
                            if (newPid !== pid) {
                                // The process locking the file has changed, so restart the timeout
                                attempts = 0;
                                pid = newPid;
                            }
                            if (attempts === 0) {
                                this.logger.info("Another process, with id " + pid + ", is currently running ngcc.\n" +
                                    ("Waiting up to " + this.retryDelay * this.retryAttempts / 1000 + "s for it to finish."));
                            }
                            // The file is still locked by another process so wait for a bit and retry
                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, _this.retryDelay); })];
                        case 4:
                            // The file is still locked by another process so wait for a bit and retry
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 5:
                            attempts++;
                            return [3 /*break*/, 1];
                        case 6: 
                        // If we fall out of the loop then we ran out of rety attempts
                        throw new Error("Timed out waiting " + this.retryAttempts * this.retryDelay / 1000 + "s for another ngcc process, with id " + pid + ", to complete.\n" +
                            ("(If you are sure no ngcc process is running then you should delete the lockfile at " + this.lockFilePath + ".)"));
                    }
                });
            });
        };
        return LockFileAsync;
    }(LockFileBase));
    exports.LockFileAsync = LockFileAsync;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ja19maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9sb2NrX2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaUNBQW1DO0lBRW5DLDJFQUE0RTtJQUc1RTtRQUlFLHNCQUFzQixFQUFjO1lBQXBDLGlCQUF3QztZQUFsQixPQUFFLEdBQUYsRUFBRSxDQUFZO1lBSHBDLGlCQUFZLEdBQ1IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLHVCQUF1QixDQUFDLENBQUM7WUE4RDVGOzs7ZUFHRztZQUNPLGtCQUFhLEdBQ25CO2dCQUNFLEtBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDZCxLQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxDQUFBO1FBcEVrQyxDQUFDO1FBRTlCLG9DQUFhLEdBQXZCO1lBQ0UsSUFBSTtnQkFDRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDekIsbUVBQW1FO2dCQUNuRSwrQ0FBK0M7Z0JBQy9DLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMzRjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUM1QixNQUFNLENBQUMsQ0FBQzthQUNUO1FBQ0gsQ0FBQztRQUVEOzs7OztXQUtHO1FBQ08sbUNBQVksR0FBdEI7WUFDRSxJQUFJO2dCQUNGLElBQUksSUFBSSxDQUFDLEVBQUUsWUFBWSw4QkFBZ0IsRUFBRTtvQkFDdkMsdUVBQXVFO29CQUN2RSwyREFBMkQ7b0JBQzNELElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2lCQUM3QztnQkFDRCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUM1QztZQUFDLFdBQU07Z0JBQ04sT0FBTyxXQUFXLENBQUM7YUFDcEI7UUFDSCxDQUFDO1FBRUQ7O1dBRUc7UUFDTyw2QkFBTSxHQUFoQjtZQUNFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVCLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNyQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDdkM7UUFDSCxDQUFDO1FBRUQ7OztXQUdHO1FBQ08sd0NBQWlCLEdBQTNCO1lBQ0UsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2xELE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQ7O1dBRUc7UUFDTywyQ0FBb0IsR0FBOUI7WUFDRSxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDckQsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFZRDs7O1dBR0c7UUFDTywyQkFBSSxHQUFkLFVBQWUsSUFBWTtZQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JCLENBQUM7UUFDSCxtQkFBQztJQUFELENBQUMsQUFqRkQsSUFpRkM7SUFqRnFCLG9DQUFZO0lBbUZsQzs7Ozs7OztPQU9HO0lBQ0g7UUFBa0Msd0NBQVk7UUFBOUM7O1FBeUNBLENBQUM7UUF4Q0M7Ozs7O1dBS0c7UUFDSCwyQkFBSSxHQUFKLFVBQVEsRUFBVztZQUNqQixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDZCxJQUFJO2dCQUNGLE9BQU8sRUFBRSxFQUFFLENBQUM7YUFDYjtvQkFBUztnQkFDUixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDZjtRQUNILENBQUM7UUFFRDs7V0FFRztRQUNPLDZCQUFNLEdBQWhCO1lBQ0UsSUFBSTtnQkFDRixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7YUFDdEI7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUN2QixNQUFNLENBQUMsQ0FBQztpQkFDVDtnQkFDRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQzthQUMvQjtRQUNILENBQUM7UUFFRDs7V0FFRztRQUNPLDZDQUFzQixHQUFoQztZQUNFLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksS0FBSyxDQUNYLGdEQUE4QyxHQUFHLFFBQUs7Z0JBQ3RELDJKQUEySjtnQkFDM0oscUVBQXFFO2lCQUNyRSx3RkFBc0YsSUFBSSxDQUFDLFlBQVksT0FBSSxDQUFBLENBQUMsQ0FBQztRQUNuSCxDQUFDO1FBQ0gsbUJBQUM7SUFBRCxDQUFDLEFBekNELENBQWtDLFlBQVksR0F5QzdDO0lBekNZLG9DQUFZO0lBMkN6Qjs7Ozs7Ozs7OztPQVVHO0lBQ0g7UUFBbUMseUNBQVk7UUFDN0MsdUJBQ0ksRUFBYyxFQUFZLE1BQWMsRUFBVSxVQUFrQixFQUM1RCxhQUFxQjtZQUZqQyxZQUdFLGtCQUFNLEVBQUUsQ0FBQyxTQUNWO1lBSDZCLFlBQU0sR0FBTixNQUFNLENBQVE7WUFBVSxnQkFBVSxHQUFWLFVBQVUsQ0FBUTtZQUM1RCxtQkFBYSxHQUFiLGFBQWEsQ0FBUTs7UUFFakMsQ0FBQztRQUVEOzs7O1dBSUc7UUFDRyw0QkFBSSxHQUFWLFVBQWMsRUFBb0I7Ozs7O2dDQUNoQyxxQkFBTSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUE7OzRCQUFuQixTQUFtQixDQUFDOzRCQUNiLHFCQUFNLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxjQUFNLE9BQUEsS0FBSSxDQUFDLE1BQU0sRUFBRSxFQUFiLENBQWEsQ0FBQyxFQUFBO2dDQUE5QyxzQkFBTyxTQUF1QyxFQUFDOzs7O1NBQ2hEO1FBRWUsOEJBQU0sR0FBdEI7Ozs7Ozs7NEJBQ00sR0FBRyxHQUFXLEVBQUUsQ0FBQzs0QkFDWixRQUFRLEdBQUcsQ0FBQzs7O2lDQUFFLENBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUE7Ozs7NEJBRWhELHNCQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBQzs7OzRCQUU1QixJQUFJLEdBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO2dDQUN2QixNQUFNLEdBQUMsQ0FBQzs2QkFDVDs0QkFDSyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDOzRCQUNuQyxJQUFJLE1BQU0sS0FBSyxHQUFHLEVBQUU7Z0NBQ2xCLG1FQUFtRTtnQ0FDbkUsUUFBUSxHQUFHLENBQUMsQ0FBQztnQ0FDYixHQUFHLEdBQUcsTUFBTSxDQUFDOzZCQUNkOzRCQUNELElBQUksUUFBUSxLQUFLLENBQUMsRUFBRTtnQ0FDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ1osOEJBQTRCLEdBQUcsbUNBQWdDO3FDQUMvRCxtQkFBaUIsSUFBSSxDQUFDLFVBQVUsR0FBQyxJQUFJLENBQUMsYUFBYSxHQUFDLElBQUksd0JBQXFCLENBQUEsQ0FBQyxDQUFDOzZCQUNwRjs0QkFDRCwwRUFBMEU7NEJBQzFFLHFCQUFNLElBQUksT0FBTyxDQUFDLFVBQUEsT0FBTyxJQUFJLE9BQUEsVUFBVSxDQUFDLE9BQU8sRUFBRSxLQUFJLENBQUMsVUFBVSxDQUFDLEVBQXBDLENBQW9DLENBQUMsRUFBQTs7NEJBRGxFLDBFQUEwRTs0QkFDMUUsU0FBa0UsQ0FBQzs7OzRCQW5CakIsUUFBUSxFQUFFLENBQUE7Ozt3QkFzQmhFLDhEQUE4RDt3QkFDOUQsTUFBTSxJQUFJLEtBQUssQ0FDWCx1QkFBcUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxHQUFDLElBQUksNENBQXVDLEdBQUcscUJBQWtCOzZCQUMxSCx3RkFBc0YsSUFBSSxDQUFDLFlBQVksT0FBSSxDQUFBLENBQUMsQ0FBQzs7OztTQUNsSDtRQUNILG9CQUFDO0lBQUQsQ0FBQyxBQTlDRCxDQUFtQyxZQUFZLEdBOEM5QztJQTlDWSxzQ0FBYSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHByb2Nlc3MgZnJvbSAncHJvY2Vzcyc7XG5cbmltcG9ydCB7Q2FjaGVkRmlsZVN5c3RlbSwgRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMb2NrRmlsZUJhc2Uge1xuICBsb2NrRmlsZVBhdGggPVxuICAgICAgdGhpcy5mcy5yZXNvbHZlKHJlcXVpcmUucmVzb2x2ZSgnQGFuZ3VsYXIvY29tcGlsZXItY2xpL25nY2MnKSwgJy4uL19fbmdjY19sb2NrX2ZpbGVfXycpO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBmczogRmlsZVN5c3RlbSkge31cblxuICBwcm90ZWN0ZWQgd3JpdGVMb2NrRmlsZSgpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5hZGRTaWduYWxIYW5kbGVycygpO1xuICAgICAgLy8gVG8gYXZvaWQgcmFjZSBjb25kaXRpb25zLCB3ZSBjaGVjayBmb3IgZXhpc3RlbmNlIG9mIHRoZSBsb2NrZmlsZVxuICAgICAgLy8gYnkgYWN0dWFsbHkgdHJ5aW5nIHRvIGNyZWF0ZSBpdCBleGNsdXNpdmVseS5cbiAgICAgIHJldHVybiB0aGlzLmZzLndyaXRlRmlsZSh0aGlzLmxvY2tGaWxlUGF0aCwgcHJvY2Vzcy5waWQudG9TdHJpbmcoKSwgLyogZXhjbHVzaXZlICovIHRydWUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMucmVtb3ZlU2lnbmFsSGFuZGxlcnMoKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlYWQgdGhlIHBpZCBmcm9tIHRoZSBsb2NrZmlsZS5cbiAgICpcbiAgICogSXQgaXMgZmVhc2libGUgdGhhdCB0aGUgbG9ja2ZpbGUgd2FzIHJlbW92ZWQgYmV0d2VlbiB0aGUgcHJldmlvdXMgY2hlY2sgZm9yIGV4aXN0ZW5jZVxuICAgKiBhbmQgdGhpcyBmaWxlLXJlYWQuIElmIHNvIHRoZW4gd2Ugc3RpbGwgZXJyb3IgYnV0IGFzIGdyYWNlZnVsbHkgYXMgcG9zc2libGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVhZExvY2tGaWxlKCk6IHN0cmluZyB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICh0aGlzLmZzIGluc3RhbmNlb2YgQ2FjaGVkRmlsZVN5c3RlbSkge1xuICAgICAgICAvLyBUaGlzIGZpbGUgaXMgXCJ2b2xhdGlsZVwiLCBpdCBtaWdodCBiZSBjaGFuZ2VkIGJ5IGFuIGV4dGVybmFsIHByb2Nlc3MsXG4gICAgICAgIC8vIHNvIHdlIGNhbm5vdCByZWx5IHVwb24gdGhlIGNhY2hlZCB2YWx1ZSB3aGVuIHJlYWRpbmcgaXQuXG4gICAgICAgIHRoaXMuZnMuaW52YWxpZGF0ZUNhY2hlcyh0aGlzLmxvY2tGaWxlUGF0aCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5mcy5yZWFkRmlsZSh0aGlzLmxvY2tGaWxlUGF0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gJ3t1bmtub3dufSc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgbG9jayBmaWxlIGZyb20gZGlzay5cbiAgICovXG4gIHByb3RlY3RlZCByZW1vdmUoKSB7XG4gICAgdGhpcy5yZW1vdmVTaWduYWxIYW5kbGVycygpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyh0aGlzLmxvY2tGaWxlUGF0aCkpIHtcbiAgICAgIHRoaXMuZnMucmVtb3ZlRmlsZSh0aGlzLmxvY2tGaWxlUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhcHR1cmUgQ1RSTC1DIGFuZCB0ZXJtaW5hbCBjbG9zaW5nIGV2ZW50cy5cbiAgICogV2hlbiB0aGVzZSBvY2N1ciB3ZSByZW1vdmUgdGhlIGxvY2tmaWxlIGFuZCBleGl0LlxuICAgKi9cbiAgcHJvdGVjdGVkIGFkZFNpZ25hbEhhbmRsZXJzKCkge1xuICAgIHByb2Nlc3MuYWRkTGlzdGVuZXIoJ1NJR0lOVCcsIHRoaXMuc2lnbmFsSGFuZGxlcik7XG4gICAgcHJvY2Vzcy5hZGRMaXN0ZW5lcignU0lHSFVQJywgdGhpcy5zaWduYWxIYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhciB0aGUgZXZlbnQgaGFuZGxlcnMgdG8gcHJldmVudCBsZWFrYWdlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlbW92ZVNpZ25hbEhhbmRsZXJzKCkge1xuICAgIHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIoJ1NJR0lOVCcsIHRoaXMuc2lnbmFsSGFuZGxlcik7XG4gICAgcHJvY2Vzcy5yZW1vdmVMaXN0ZW5lcignU0lHSFVQJywgdGhpcy5zaWduYWxIYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGhhbmRsZXIgbmVlZHMgdG8gYmUgZGVmaW5lZCBhcyBhIHByb3BlcnR5IHJhdGhlciB0aGFuIGEgbWV0aG9kXG4gICAqIHNvIHRoYXQgaXQgY2FuIGJlIHBhc3NlZCBhcm91bmQgYXMgYSBib3VuZCBmdW5jdGlvbi5cbiAgICovXG4gIHByb3RlY3RlZCBzaWduYWxIYW5kbGVyID1cbiAgICAgICgpID0+IHtcbiAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5leGl0KDEpO1xuICAgICAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGZ1bmN0aW9uIHdyYXBzIGBwcm9jZXNzLmV4aXQoKWAgd2hpY2ggbWFrZXMgaXQgZWFzaWVyIHRvIG1hbmFnZSBpbiB1bml0IHRlc3RzLFxuICAgKiBzaW5jZSBpdCBpcyBub3QgcG9zc2libGUgdG8gbW9jayBvdXQgYHByb2Nlc3MuZXhpdCgpYCB3aGVuIGl0IGlzIGNhbGxlZCBmcm9tIHNpZ25hbCBoYW5kbGVycy5cbiAgICovXG4gIHByb3RlY3RlZCBleGl0KGNvZGU6IG51bWJlcik6IHZvaWQge1xuICAgIHByb2Nlc3MuZXhpdChjb2RlKTtcbiAgfVxufVxuXG4vKipcbiAqIExvY2tGaWxlU3luYyBpcyB1c2VkIHRvIHByZXZlbnQgbW9yZSB0aGFuIG9uZSBpbnN0YW5jZSBvZiBuZ2NjIGV4ZWN1dGluZyBhdCB0aGUgc2FtZSB0aW1lLFxuICogd2hlbiBiZWluZyBjYWxsZWQgaW4gYSBzeW5jaHJvbm91cyBjb250ZXh0LlxuICpcbiAqICogV2hlbiBuZ2NjIHN0YXJ0cyBleGVjdXRpbmcsIGl0IGNyZWF0ZXMgYSBmaWxlIGluIHRoZSBgY29tcGlsZXItY2xpL25nY2NgIGZvbGRlci5cbiAqICogSWYgaXQgZmluZHMgb25lIGlzIGFscmVhZHkgdGhlcmUgdGhlbiBpdCBmYWlscyB3aXRoIGEgc3VpdGFibGUgZXJyb3IgbWVzc2FnZS5cbiAqICogV2hlbiBuZ2NjIGNvbXBsZXRlcyBleGVjdXRpbmcsIGl0IHJlbW92ZXMgdGhlIGZpbGUgc28gdGhhdCBmdXR1cmUgbmdjYyBleGVjdXRpb25zIGNhbiBzdGFydC5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2tGaWxlU3luYyBleHRlbmRzIExvY2tGaWxlQmFzZSB7XG4gIC8qKlxuICAgKiBSdW4gdGhlIGdpdmVuIGZ1bmN0aW9uIGd1YXJkZWQgYnkgdGhlIGxvY2sgZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGZuIHRoZSBmdW5jdGlvbiB0byBydW4uXG4gICAqIEByZXR1cm5zIHRoZSB2YWx1ZSByZXR1cm5lZCBmcm9tIHRoZSBgZm5gIGNhbGwuXG4gICAqL1xuICBsb2NrPFQ+KGZuOiAoKSA9PiBUKTogVCB7XG4gICAgdGhpcy5jcmVhdGUoKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGZuKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlIGEgbG9jayBmaWxlIHRvIGRpc2ssIG9yIGVycm9yIGlmIHRoZXJlIGlzIGFscmVhZHkgb25lIHRoZXJlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNyZWF0ZSgpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgdGhpcy53cml0ZUxvY2tGaWxlKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUuY29kZSAhPT0gJ0VFWElTVCcpIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaGFuZGxlRXhpc3RpbmdMb2NrRmlsZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgbG9ja2ZpbGUgYWxyZWFkeSBleGlzdHMgc28gcmFpc2UgYSBoZWxwZnVsIGVycm9yLlxuICAgKi9cbiAgcHJvdGVjdGVkIGhhbmRsZUV4aXN0aW5nTG9ja0ZpbGUoKTogdm9pZCB7XG4gICAgY29uc3QgcGlkID0gdGhpcy5yZWFkTG9ja0ZpbGUoKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBuZ2NjIGlzIGFscmVhZHkgcnVubmluZyBhdCBwcm9jZXNzIHdpdGggaWQgJHtwaWR9LlxcbmAgK1xuICAgICAgICBgSWYgeW91IGFyZSBydW5uaW5nIG11bHRpcGxlIGJ1aWxkcyBpbiBwYXJhbGxlbCB0aGVuIHlvdSBzaG91bGQgcHJlLXByb2Nlc3MgeW91ciBub2RlX21vZHVsZXMgdmlhIHRoZSBjb21tYW5kIGxpbmUgbmdjYyB0b29sIGJlZm9yZSBzdGFydGluZyB0aGUgYnVpbGRzO1xcbmAgK1xuICAgICAgICBgU2VlIGh0dHBzOi8vdjkuYW5ndWxhci5pby9ndWlkZS9pdnkjc3BlZWRpbmctdXAtbmdjYy1jb21waWxhdGlvbi5cXG5gICtcbiAgICAgICAgYChJZiB5b3UgYXJlIHN1cmUgbm8gbmdjYyBwcm9jZXNzIGlzIHJ1bm5pbmcgdGhlbiB5b3Ugc2hvdWxkIGRlbGV0ZSB0aGUgbG9ja2ZpbGUgYXQgJHt0aGlzLmxvY2tGaWxlUGF0aH0uKWApO1xuICB9XG59XG5cbi8qKlxuICogTG9ja0ZpbGVBc3luYyBpcyB1c2VkIHRvIHByZXZlbnQgbW9yZSB0aGFuIG9uZSBpbnN0YW5jZSBvZiBuZ2NjIGV4ZWN1dGluZyBhdCB0aGUgc2FtZSB0aW1lLFxuICogd2hlbiBiZWluZyBjYWxsZWQgaW4gYW4gYXN5bmNocm9ub3VzIGNvbnRleHQuXG4gKlxuICogKiBXaGVuIG5nY2Mgc3RhcnRzIGV4ZWN1dGluZywgaXQgY3JlYXRlcyBhIGZpbGUgaW4gdGhlIGBjb21waWxlci1jbGkvbmdjY2AgZm9sZGVyLlxuICogKiBJZiBpdCBmaW5kcyBvbmUgaXMgYWxyZWFkeSB0aGVyZSB0aGVuIGl0IHBhdXNlcyBhbmQgd2FpdHMgZm9yIHRoZSBmaWxlIHRvIGJlIHJlbW92ZWQgYnkgdGhlXG4gKiAgIG90aGVyIHByb2Nlc3MuIElmIHRoZSBmaWxlIGlzIG5vdCByZW1vdmVkIHdpdGhpbiBhIHNldCB0aW1lb3V0IHBlcmlvZCBnaXZlbiBieVxuICogICBgcmV0cnlEZWxheSpyZXRyeUF0dGVtcHRzYCBhbiBlcnJvciBpcyB0aHJvd24gd2l0aCBhIHN1aXRhYmxlIGVycm9yIG1lc3NhZ2UuXG4gKiAqIElmIHRoZSBwcm9jZXNzIGxvY2tpbmcgdGhlIGZpbGUgY2hhbmdlcywgdGhlbiB3ZSByZXN0YXJ0IHRoZSB0aW1lb3V0LlxuICogKiBXaGVuIG5nY2MgY29tcGxldGVzIGV4ZWN1dGluZywgaXQgcmVtb3ZlcyB0aGUgZmlsZSBzbyB0aGF0IGZ1dHVyZSBuZ2NjIGV4ZWN1dGlvbnMgY2FuIHN0YXJ0LlxuICovXG5leHBvcnQgY2xhc3MgTG9ja0ZpbGVBc3luYyBleHRlbmRzIExvY2tGaWxlQmFzZSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgZnM6IEZpbGVTeXN0ZW0sIHByb3RlY3RlZCBsb2dnZXI6IExvZ2dlciwgcHJpdmF0ZSByZXRyeURlbGF5OiBudW1iZXIsXG4gICAgICBwcml2YXRlIHJldHJ5QXR0ZW1wdHM6IG51bWJlcikge1xuICAgIHN1cGVyKGZzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gYSBmdW5jdGlvbiBndWFyZGVkIGJ5IHRoZSBsb2NrIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBmbiBUaGUgZnVuY3Rpb24gdG8gcnVuLlxuICAgKi9cbiAgYXN5bmMgbG9jazxUPihmbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgIGF3YWl0IHRoaXMuY3JlYXRlKCk7XG4gICAgcmV0dXJuIGF3YWl0IGZuKCkuZmluYWxseSgoKSA9PiB0aGlzLnJlbW92ZSgpKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBjcmVhdGUoKSB7XG4gICAgbGV0IHBpZDogc3RyaW5nID0gJyc7XG4gICAgZm9yIChsZXQgYXR0ZW1wdHMgPSAwOyBhdHRlbXB0cyA8IHRoaXMucmV0cnlBdHRlbXB0czsgYXR0ZW1wdHMrKykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JpdGVMb2NrRmlsZSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZS5jb2RlICE9PSAnRUVYSVNUJykge1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbmV3UGlkID0gdGhpcy5yZWFkTG9ja0ZpbGUoKTtcbiAgICAgICAgaWYgKG5ld1BpZCAhPT0gcGlkKSB7XG4gICAgICAgICAgLy8gVGhlIHByb2Nlc3MgbG9ja2luZyB0aGUgZmlsZSBoYXMgY2hhbmdlZCwgc28gcmVzdGFydCB0aGUgdGltZW91dFxuICAgICAgICAgIGF0dGVtcHRzID0gMDtcbiAgICAgICAgICBwaWQgPSBuZXdQaWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF0dGVtcHRzID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhcbiAgICAgICAgICAgICAgYEFub3RoZXIgcHJvY2Vzcywgd2l0aCBpZCAke3BpZH0sIGlzIGN1cnJlbnRseSBydW5uaW5nIG5nY2MuXFxuYCArXG4gICAgICAgICAgICAgIGBXYWl0aW5nIHVwIHRvICR7dGhpcy5yZXRyeURlbGF5KnRoaXMucmV0cnlBdHRlbXB0cy8xMDAwfXMgZm9yIGl0IHRvIGZpbmlzaC5gKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgZmlsZSBpcyBzdGlsbCBsb2NrZWQgYnkgYW5vdGhlciBwcm9jZXNzIHNvIHdhaXQgZm9yIGEgYml0IGFuZCByZXRyeVxuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgdGhpcy5yZXRyeURlbGF5KSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIElmIHdlIGZhbGwgb3V0IG9mIHRoZSBsb29wIHRoZW4gd2UgcmFuIG91dCBvZiByZXR5IGF0dGVtcHRzXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGltZWQgb3V0IHdhaXRpbmcgJHt0aGlzLnJldHJ5QXR0ZW1wdHMgKiB0aGlzLnJldHJ5RGVsYXkvMTAwMH1zIGZvciBhbm90aGVyIG5nY2MgcHJvY2Vzcywgd2l0aCBpZCAke3BpZH0sIHRvIGNvbXBsZXRlLlxcbmAgK1xuICAgICAgICBgKElmIHlvdSBhcmUgc3VyZSBubyBuZ2NjIHByb2Nlc3MgaXMgcnVubmluZyB0aGVuIHlvdSBzaG91bGQgZGVsZXRlIHRoZSBsb2NrZmlsZSBhdCAke3RoaXMubG9ja0ZpbGVQYXRofS4pYCk7XG4gIH1cbn1cbiJdfQ==