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
                            return [2 /*return*/, fn().finally(function () { return _this.remove(); })];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ja19maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9sb2NrX2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaUNBQW1DO0lBRW5DLDJFQUE0RTtJQUc1RTtRQUlFLHNCQUFzQixFQUFjO1lBQXBDLGlCQUF3QztZQUFsQixPQUFFLEdBQUYsRUFBRSxDQUFZO1lBSHBDLGlCQUFZLEdBQ1IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLHVCQUF1QixDQUFDLENBQUM7WUE4RDVGOzs7ZUFHRztZQUNPLGtCQUFhLEdBQ25CO2dCQUNFLEtBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDZCxLQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxDQUFBO1FBcEVrQyxDQUFDO1FBRTlCLG9DQUFhLEdBQXZCO1lBQ0UsSUFBSTtnQkFDRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDekIsbUVBQW1FO2dCQUNuRSwrQ0FBK0M7Z0JBQy9DLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMzRjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUM1QixNQUFNLENBQUMsQ0FBQzthQUNUO1FBQ0gsQ0FBQztRQUVEOzs7OztXQUtHO1FBQ08sbUNBQVksR0FBdEI7WUFDRSxJQUFJO2dCQUNGLElBQUksSUFBSSxDQUFDLEVBQUUsWUFBWSw4QkFBZ0IsRUFBRTtvQkFDdkMsdUVBQXVFO29CQUN2RSwyREFBMkQ7b0JBQzNELElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2lCQUM3QztnQkFDRCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUM1QztZQUFDLFdBQU07Z0JBQ04sT0FBTyxXQUFXLENBQUM7YUFDcEI7UUFDSCxDQUFDO1FBRUQ7O1dBRUc7UUFDTyw2QkFBTSxHQUFoQjtZQUNFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVCLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNyQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDdkM7UUFDSCxDQUFDO1FBRUQ7OztXQUdHO1FBQ08sd0NBQWlCLEdBQTNCO1lBQ0UsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2xELE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQ7O1dBRUc7UUFDTywyQ0FBb0IsR0FBOUI7WUFDRSxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDckQsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFZRDs7O1dBR0c7UUFDTywyQkFBSSxHQUFkLFVBQWUsSUFBWTtZQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JCLENBQUM7UUFDSCxtQkFBQztJQUFELENBQUMsQUFqRkQsSUFpRkM7SUFqRnFCLG9DQUFZO0lBbUZsQzs7Ozs7OztPQU9HO0lBQ0g7UUFBa0Msd0NBQVk7UUFBOUM7O1FBeUNBLENBQUM7UUF4Q0M7Ozs7O1dBS0c7UUFDSCwyQkFBSSxHQUFKLFVBQVEsRUFBVztZQUNqQixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDZCxJQUFJO2dCQUNGLE9BQU8sRUFBRSxFQUFFLENBQUM7YUFDYjtvQkFBUztnQkFDUixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDZjtRQUNILENBQUM7UUFFRDs7V0FFRztRQUNPLDZCQUFNLEdBQWhCO1lBQ0UsSUFBSTtnQkFDRixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7YUFDdEI7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUN2QixNQUFNLENBQUMsQ0FBQztpQkFDVDtnQkFDRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQzthQUMvQjtRQUNILENBQUM7UUFFRDs7V0FFRztRQUNPLDZDQUFzQixHQUFoQztZQUNFLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNoQyxNQUFNLElBQUksS0FBSyxDQUNYLGdEQUE4QyxHQUFHLFFBQUs7Z0JBQ3RELDJKQUEySjtnQkFDM0oscUVBQXFFO2lCQUNyRSx3RkFBc0YsSUFBSSxDQUFDLFlBQVksT0FBSSxDQUFBLENBQUMsQ0FBQztRQUNuSCxDQUFDO1FBQ0gsbUJBQUM7SUFBRCxDQUFDLEFBekNELENBQWtDLFlBQVksR0F5QzdDO0lBekNZLG9DQUFZO0lBMkN6Qjs7Ozs7Ozs7OztPQVVHO0lBQ0g7UUFBbUMseUNBQVk7UUFDN0MsdUJBQ0ksRUFBYyxFQUFZLE1BQWMsRUFBVSxVQUFrQixFQUM1RCxhQUFxQjtZQUZqQyxZQUdFLGtCQUFNLEVBQUUsQ0FBQyxTQUNWO1lBSDZCLFlBQU0sR0FBTixNQUFNLENBQVE7WUFBVSxnQkFBVSxHQUFWLFVBQVUsQ0FBUTtZQUM1RCxtQkFBYSxHQUFiLGFBQWEsQ0FBUTs7UUFFakMsQ0FBQztRQUVEOzs7O1dBSUc7UUFDRyw0QkFBSSxHQUFWLFVBQWMsRUFBb0I7Ozs7O2dDQUNoQyxxQkFBTSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUE7OzRCQUFuQixTQUFtQixDQUFDOzRCQUNwQixzQkFBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxNQUFNLEVBQUUsRUFBYixDQUFhLENBQUMsRUFBQzs7OztTQUMxQztRQUVlLDhCQUFNLEdBQXRCOzs7Ozs7OzRCQUNNLEdBQUcsR0FBVyxFQUFFLENBQUM7NEJBQ1osUUFBUSxHQUFHLENBQUM7OztpQ0FBRSxDQUFBLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFBOzs7OzRCQUVoRCxzQkFBTyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUM7Ozs0QkFFNUIsSUFBSSxHQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtnQ0FDdkIsTUFBTSxHQUFDLENBQUM7NkJBQ1Q7NEJBQ0ssTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQzs0QkFDbkMsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO2dDQUNsQixtRUFBbUU7Z0NBQ25FLFFBQVEsR0FBRyxDQUFDLENBQUM7Z0NBQ2IsR0FBRyxHQUFHLE1BQU0sQ0FBQzs2QkFDZDs0QkFDRCxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUU7Z0NBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNaLDhCQUE0QixHQUFHLG1DQUFnQztxQ0FDL0QsbUJBQWlCLElBQUksQ0FBQyxVQUFVLEdBQUMsSUFBSSxDQUFDLGFBQWEsR0FBQyxJQUFJLHdCQUFxQixDQUFBLENBQUMsQ0FBQzs2QkFDcEY7NEJBQ0QsMEVBQTBFOzRCQUMxRSxxQkFBTSxJQUFJLE9BQU8sQ0FBQyxVQUFBLE9BQU8sSUFBSSxPQUFBLFVBQVUsQ0FBQyxPQUFPLEVBQUUsS0FBSSxDQUFDLFVBQVUsQ0FBQyxFQUFwQyxDQUFvQyxDQUFDLEVBQUE7OzRCQURsRSwwRUFBMEU7NEJBQzFFLFNBQWtFLENBQUM7Ozs0QkFuQmpCLFFBQVEsRUFBRSxDQUFBOzs7d0JBc0JoRSw4REFBOEQ7d0JBQzlELE1BQU0sSUFBSSxLQUFLLENBQ1gsdUJBQXFCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBQyxJQUFJLDRDQUF1QyxHQUFHLHFCQUFrQjs2QkFDMUgsd0ZBQXNGLElBQUksQ0FBQyxZQUFZLE9BQUksQ0FBQSxDQUFDLENBQUM7Ozs7U0FDbEg7UUFDSCxvQkFBQztJQUFELENBQUMsQUE5Q0QsQ0FBbUMsWUFBWSxHQThDOUM7SUE5Q1ksc0NBQWEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBwcm9jZXNzIGZyb20gJ3Byb2Nlc3MnO1xuXG5pbXBvcnQge0NhY2hlZEZpbGVTeXN0ZW0sIEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgTG9ja0ZpbGVCYXNlIHtcbiAgbG9ja0ZpbGVQYXRoID1cbiAgICAgIHRoaXMuZnMucmVzb2x2ZShyZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9uZ2NjJyksICcuLi9fX25nY2NfbG9ja19maWxlX18nKTtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZnM6IEZpbGVTeXN0ZW0pIHt9XG5cbiAgcHJvdGVjdGVkIHdyaXRlTG9ja0ZpbGUoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuYWRkU2lnbmFsSGFuZGxlcnMoKTtcbiAgICAgIC8vIFRvIGF2b2lkIHJhY2UgY29uZGl0aW9ucywgd2UgY2hlY2sgZm9yIGV4aXN0ZW5jZSBvZiB0aGUgbG9ja2ZpbGVcbiAgICAgIC8vIGJ5IGFjdHVhbGx5IHRyeWluZyB0byBjcmVhdGUgaXQgZXhjbHVzaXZlbHkuXG4gICAgICByZXR1cm4gdGhpcy5mcy53cml0ZUZpbGUodGhpcy5sb2NrRmlsZVBhdGgsIHByb2Nlc3MucGlkLnRvU3RyaW5nKCksIC8qIGV4Y2x1c2l2ZSAqLyB0cnVlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLnJlbW92ZVNpZ25hbEhhbmRsZXJzKCk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkIHRoZSBwaWQgZnJvbSB0aGUgbG9ja2ZpbGUuXG4gICAqXG4gICAqIEl0IGlzIGZlYXNpYmxlIHRoYXQgdGhlIGxvY2tmaWxlIHdhcyByZW1vdmVkIGJldHdlZW4gdGhlIHByZXZpb3VzIGNoZWNrIGZvciBleGlzdGVuY2VcbiAgICogYW5kIHRoaXMgZmlsZS1yZWFkLiBJZiBzbyB0aGVuIHdlIHN0aWxsIGVycm9yIGJ1dCBhcyBncmFjZWZ1bGx5IGFzIHBvc3NpYmxlLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlYWRMb2NrRmlsZSgpOiBzdHJpbmcge1xuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy5mcyBpbnN0YW5jZW9mIENhY2hlZEZpbGVTeXN0ZW0pIHtcbiAgICAgICAgLy8gVGhpcyBmaWxlIGlzIFwidm9sYXRpbGVcIiwgaXQgbWlnaHQgYmUgY2hhbmdlZCBieSBhbiBleHRlcm5hbCBwcm9jZXNzLFxuICAgICAgICAvLyBzbyB3ZSBjYW5ub3QgcmVseSB1cG9uIHRoZSBjYWNoZWQgdmFsdWUgd2hlbiByZWFkaW5nIGl0LlxuICAgICAgICB0aGlzLmZzLmludmFsaWRhdGVDYWNoZXModGhpcy5sb2NrRmlsZVBhdGgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZnMucmVhZEZpbGUodGhpcy5sb2NrRmlsZVBhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuICd7dW5rbm93bn0nO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGxvY2sgZmlsZSBmcm9tIGRpc2suXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVtb3ZlKCkge1xuICAgIHRoaXMucmVtb3ZlU2lnbmFsSGFuZGxlcnMoKTtcbiAgICBpZiAodGhpcy5mcy5leGlzdHModGhpcy5sb2NrRmlsZVBhdGgpKSB7XG4gICAgICB0aGlzLmZzLnJlbW92ZUZpbGUodGhpcy5sb2NrRmlsZVBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYXB0dXJlIENUUkwtQyBhbmQgdGVybWluYWwgY2xvc2luZyBldmVudHMuXG4gICAqIFdoZW4gdGhlc2Ugb2NjdXIgd2UgcmVtb3ZlIHRoZSBsb2NrZmlsZSBhbmQgZXhpdC5cbiAgICovXG4gIHByb3RlY3RlZCBhZGRTaWduYWxIYW5kbGVycygpIHtcbiAgICBwcm9jZXNzLmFkZExpc3RlbmVyKCdTSUdJTlQnLCB0aGlzLnNpZ25hbEhhbmRsZXIpO1xuICAgIHByb2Nlc3MuYWRkTGlzdGVuZXIoJ1NJR0hVUCcsIHRoaXMuc2lnbmFsSGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXIgdGhlIGV2ZW50IGhhbmRsZXJzIHRvIHByZXZlbnQgbGVha2FnZS5cbiAgICovXG4gIHByb3RlY3RlZCByZW1vdmVTaWduYWxIYW5kbGVycygpIHtcbiAgICBwcm9jZXNzLnJlbW92ZUxpc3RlbmVyKCdTSUdJTlQnLCB0aGlzLnNpZ25hbEhhbmRsZXIpO1xuICAgIHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIoJ1NJR0hVUCcsIHRoaXMuc2lnbmFsSGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBoYW5kbGVyIG5lZWRzIHRvIGJlIGRlZmluZWQgYXMgYSBwcm9wZXJ0eSByYXRoZXIgdGhhbiBhIG1ldGhvZFxuICAgKiBzbyB0aGF0IGl0IGNhbiBiZSBwYXNzZWQgYXJvdW5kIGFzIGEgYm91bmQgZnVuY3Rpb24uXG4gICAqL1xuICBwcm90ZWN0ZWQgc2lnbmFsSGFuZGxlciA9XG4gICAgICAoKSA9PiB7XG4gICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuZXhpdCgxKTtcbiAgICAgIH1cblxuICAvKipcbiAgICogVGhpcyBmdW5jdGlvbiB3cmFwcyBgcHJvY2Vzcy5leGl0KClgIHdoaWNoIG1ha2VzIGl0IGVhc2llciB0byBtYW5hZ2UgaW4gdW5pdCB0ZXN0cyxcbiAgICogc2luY2UgaXQgaXMgbm90IHBvc3NpYmxlIHRvIG1vY2sgb3V0IGBwcm9jZXNzLmV4aXQoKWAgd2hlbiBpdCBpcyBjYWxsZWQgZnJvbSBzaWduYWwgaGFuZGxlcnMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZXhpdChjb2RlOiBudW1iZXIpOiB2b2lkIHtcbiAgICBwcm9jZXNzLmV4aXQoY29kZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBMb2NrRmlsZVN5bmMgaXMgdXNlZCB0byBwcmV2ZW50IG1vcmUgdGhhbiBvbmUgaW5zdGFuY2Ugb2YgbmdjYyBleGVjdXRpbmcgYXQgdGhlIHNhbWUgdGltZSxcbiAqIHdoZW4gYmVpbmcgY2FsbGVkIGluIGEgc3luY2hyb25vdXMgY29udGV4dC5cbiAqXG4gKiAqIFdoZW4gbmdjYyBzdGFydHMgZXhlY3V0aW5nLCBpdCBjcmVhdGVzIGEgZmlsZSBpbiB0aGUgYGNvbXBpbGVyLWNsaS9uZ2NjYCBmb2xkZXIuXG4gKiAqIElmIGl0IGZpbmRzIG9uZSBpcyBhbHJlYWR5IHRoZXJlIHRoZW4gaXQgZmFpbHMgd2l0aCBhIHN1aXRhYmxlIGVycm9yIG1lc3NhZ2UuXG4gKiAqIFdoZW4gbmdjYyBjb21wbGV0ZXMgZXhlY3V0aW5nLCBpdCByZW1vdmVzIHRoZSBmaWxlIHNvIHRoYXQgZnV0dXJlIG5nY2MgZXhlY3V0aW9ucyBjYW4gc3RhcnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NrRmlsZVN5bmMgZXh0ZW5kcyBMb2NrRmlsZUJhc2Uge1xuICAvKipcbiAgICogUnVuIHRoZSBnaXZlbiBmdW5jdGlvbiBndWFyZGVkIGJ5IHRoZSBsb2NrIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBmbiB0aGUgZnVuY3Rpb24gdG8gcnVuLlxuICAgKiBAcmV0dXJucyB0aGUgdmFsdWUgcmV0dXJuZWQgZnJvbSB0aGUgYGZuYCBjYWxsLlxuICAgKi9cbiAgbG9jazxUPihmbjogKCkgPT4gVCk6IFQge1xuICAgIHRoaXMuY3JlYXRlKCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmbigpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLnJlbW92ZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZSBhIGxvY2sgZmlsZSB0byBkaXNrLCBvciBlcnJvciBpZiB0aGVyZSBpcyBhbHJlYWR5IG9uZSB0aGVyZS5cbiAgICovXG4gIHByb3RlY3RlZCBjcmVhdGUoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMud3JpdGVMb2NrRmlsZSgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgIT09ICdFRVhJU1QnKSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgICB0aGlzLmhhbmRsZUV4aXN0aW5nTG9ja0ZpbGUoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhlIGxvY2tmaWxlIGFscmVhZHkgZXhpc3RzIHNvIHJhaXNlIGEgaGVscGZ1bCBlcnJvci5cbiAgICovXG4gIHByb3RlY3RlZCBoYW5kbGVFeGlzdGluZ0xvY2tGaWxlKCk6IHZvaWQge1xuICAgIGNvbnN0IHBpZCA9IHRoaXMucmVhZExvY2tGaWxlKCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgbmdjYyBpcyBhbHJlYWR5IHJ1bm5pbmcgYXQgcHJvY2VzcyB3aXRoIGlkICR7cGlkfS5cXG5gICtcbiAgICAgICAgYElmIHlvdSBhcmUgcnVubmluZyBtdWx0aXBsZSBidWlsZHMgaW4gcGFyYWxsZWwgdGhlbiB5b3Ugc2hvdWxkIHByZS1wcm9jZXNzIHlvdXIgbm9kZV9tb2R1bGVzIHZpYSB0aGUgY29tbWFuZCBsaW5lIG5nY2MgdG9vbCBiZWZvcmUgc3RhcnRpbmcgdGhlIGJ1aWxkcztcXG5gICtcbiAgICAgICAgYFNlZSBodHRwczovL3Y5LmFuZ3VsYXIuaW8vZ3VpZGUvaXZ5I3NwZWVkaW5nLXVwLW5nY2MtY29tcGlsYXRpb24uXFxuYCArXG4gICAgICAgIGAoSWYgeW91IGFyZSBzdXJlIG5vIG5nY2MgcHJvY2VzcyBpcyBydW5uaW5nIHRoZW4geW91IHNob3VsZCBkZWxldGUgdGhlIGxvY2tmaWxlIGF0ICR7dGhpcy5sb2NrRmlsZVBhdGh9LilgKTtcbiAgfVxufVxuXG4vKipcbiAqIExvY2tGaWxlQXN5bmMgaXMgdXNlZCB0byBwcmV2ZW50IG1vcmUgdGhhbiBvbmUgaW5zdGFuY2Ugb2YgbmdjYyBleGVjdXRpbmcgYXQgdGhlIHNhbWUgdGltZSxcbiAqIHdoZW4gYmVpbmcgY2FsbGVkIGluIGFuIGFzeW5jaHJvbm91cyBjb250ZXh0LlxuICpcbiAqICogV2hlbiBuZ2NjIHN0YXJ0cyBleGVjdXRpbmcsIGl0IGNyZWF0ZXMgYSBmaWxlIGluIHRoZSBgY29tcGlsZXItY2xpL25nY2NgIGZvbGRlci5cbiAqICogSWYgaXQgZmluZHMgb25lIGlzIGFscmVhZHkgdGhlcmUgdGhlbiBpdCBwYXVzZXMgYW5kIHdhaXRzIGZvciB0aGUgZmlsZSB0byBiZSByZW1vdmVkIGJ5IHRoZVxuICogICBvdGhlciBwcm9jZXNzLiBJZiB0aGUgZmlsZSBpcyBub3QgcmVtb3ZlZCB3aXRoaW4gYSBzZXQgdGltZW91dCBwZXJpb2QgZ2l2ZW4gYnlcbiAqICAgYHJldHJ5RGVsYXkqcmV0cnlBdHRlbXB0c2AgYW4gZXJyb3IgaXMgdGhyb3duIHdpdGggYSBzdWl0YWJsZSBlcnJvciBtZXNzYWdlLlxuICogKiBJZiB0aGUgcHJvY2VzcyBsb2NraW5nIHRoZSBmaWxlIGNoYW5nZXMsIHRoZW4gd2UgcmVzdGFydCB0aGUgdGltZW91dC5cbiAqICogV2hlbiBuZ2NjIGNvbXBsZXRlcyBleGVjdXRpbmcsIGl0IHJlbW92ZXMgdGhlIGZpbGUgc28gdGhhdCBmdXR1cmUgbmdjYyBleGVjdXRpb25zIGNhbiBzdGFydC5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2tGaWxlQXN5bmMgZXh0ZW5kcyBMb2NrRmlsZUJhc2Uge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIGZzOiBGaWxlU3lzdGVtLCBwcm90ZWN0ZWQgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgcmV0cnlEZWxheTogbnVtYmVyLFxuICAgICAgcHJpdmF0ZSByZXRyeUF0dGVtcHRzOiBudW1iZXIpIHtcbiAgICBzdXBlcihmcyk7XG4gIH1cblxuICAvKipcbiAgICogUnVuIGEgZnVuY3Rpb24gZ3VhcmRlZCBieSB0aGUgbG9jayBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gZm4gVGhlIGZ1bmN0aW9uIHRvIHJ1bi5cbiAgICovXG4gIGFzeW5jIGxvY2s8VD4oZm46ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICBhd2FpdCB0aGlzLmNyZWF0ZSgpO1xuICAgIHJldHVybiBmbigpLmZpbmFsbHkoKCkgPT4gdGhpcy5yZW1vdmUoKSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgY3JlYXRlKCkge1xuICAgIGxldCBwaWQ6IHN0cmluZyA9ICcnO1xuICAgIGZvciAobGV0IGF0dGVtcHRzID0gMDsgYXR0ZW1wdHMgPCB0aGlzLnJldHJ5QXR0ZW1wdHM7IGF0dGVtcHRzKyspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0aGlzLndyaXRlTG9ja0ZpbGUoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSAhPT0gJ0VFWElTVCcpIHtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld1BpZCA9IHRoaXMucmVhZExvY2tGaWxlKCk7XG4gICAgICAgIGlmIChuZXdQaWQgIT09IHBpZCkge1xuICAgICAgICAgIC8vIFRoZSBwcm9jZXNzIGxvY2tpbmcgdGhlIGZpbGUgaGFzIGNoYW5nZWQsIHNvIHJlc3RhcnQgdGhlIHRpbWVvdXRcbiAgICAgICAgICBhdHRlbXB0cyA9IDA7XG4gICAgICAgICAgcGlkID0gbmV3UGlkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhdHRlbXB0cyA9PT0gMCkge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oXG4gICAgICAgICAgICAgIGBBbm90aGVyIHByb2Nlc3MsIHdpdGggaWQgJHtwaWR9LCBpcyBjdXJyZW50bHkgcnVubmluZyBuZ2NjLlxcbmAgK1xuICAgICAgICAgICAgICBgV2FpdGluZyB1cCB0byAke3RoaXMucmV0cnlEZWxheSp0aGlzLnJldHJ5QXR0ZW1wdHMvMTAwMH1zIGZvciBpdCB0byBmaW5pc2guYCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlIGZpbGUgaXMgc3RpbGwgbG9ja2VkIGJ5IGFub3RoZXIgcHJvY2VzcyBzbyB3YWl0IGZvciBhIGJpdCBhbmQgcmV0cnlcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHRoaXMucmV0cnlEZWxheSkpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBJZiB3ZSBmYWxsIG91dCBvZiB0aGUgbG9vcCB0aGVuIHdlIHJhbiBvdXQgb2YgcmV0eSBhdHRlbXB0c1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRpbWVkIG91dCB3YWl0aW5nICR7dGhpcy5yZXRyeUF0dGVtcHRzICogdGhpcy5yZXRyeURlbGF5LzEwMDB9cyBmb3IgYW5vdGhlciBuZ2NjIHByb2Nlc3MsIHdpdGggaWQgJHtwaWR9LCB0byBjb21wbGV0ZS5cXG5gICtcbiAgICAgICAgYChJZiB5b3UgYXJlIHN1cmUgbm8gbmdjYyBwcm9jZXNzIGlzIHJ1bm5pbmcgdGhlbiB5b3Ugc2hvdWxkIGRlbGV0ZSB0aGUgbG9ja2ZpbGUgYXQgJHt0aGlzLmxvY2tGaWxlUGF0aH0uKWApO1xuICB9XG59XG4iXX0=