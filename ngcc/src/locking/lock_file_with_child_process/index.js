(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index", ["require", "exports", "child_process", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/logging/logger", "@angular/compiler-cli/ngcc/src/locking/lock_file", "@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var child_process_1 = require("child_process");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
    var lock_file_1 = require("@angular/compiler-cli/ngcc/src/locking/lock_file");
    var util_1 = require("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/util");
    /// <reference types="node" />
    /**
     * This `LockFile` implementation uses a child-process to remove the lock file when the main process
     * exits (for whatever reason).
     *
     * There are a few milliseconds between the child-process being forked and it registering its
     * `disconnect` event, which is responsible for tidying up the lock-file in the event that the main
     * process exits unexpectedly.
     *
     * We eagerly create the unlocker child-process so that it maximizes the time before the lock-file
     * is actually written, which makes it very unlikely that the unlocker would not be ready in the
     * case that the developer hits Ctrl-C or closes the terminal within a fraction of a second of the
     * lock-file being created.
     *
     * The worst case scenario is that ngcc is killed too quickly and leaves behind an orphaned
     * lock-file. In which case the next ngcc run will display a helpful error message about deleting
     * the lock-file.
     */
    var LockFileWithChildProcess = /** @class */ (function () {
        function LockFileWithChildProcess(fs, logger) {
            this.fs = fs;
            this.logger = logger;
            this.path = lock_file_1.getLockFilePath(fs);
            this.unlocker = this.createUnlocker(this.path);
        }
        LockFileWithChildProcess.prototype.write = function () {
            if (this.unlocker === null) {
                // In case we already disconnected the previous unlocker child-process, perhaps by calling
                // `remove()`. Normally the LockFile should only be used once per instance.
                this.unlocker = this.createUnlocker(this.path);
            }
            this.logger.debug("Attemping to write lock-file at " + this.path + " with PID " + process.pid);
            // To avoid race conditions, check for existence of the lock-file by trying to create it.
            // This will throw an error if the file already exists.
            this.fs.writeFile(this.path, process.pid.toString(), /* exclusive */ true);
            this.logger.debug("Written lock-file at " + this.path + " with PID " + process.pid);
        };
        LockFileWithChildProcess.prototype.read = function () {
            try {
                if (this.fs instanceof file_system_1.CachedFileSystem) {
                    // The lock-file file is "volatile", it might be changed by an external process,
                    // so we must not rely upon the cached value when reading it.
                    this.fs.invalidateCaches(this.path);
                }
                return this.fs.readFile(this.path);
            }
            catch (_a) {
                return '{unknown}';
            }
        };
        LockFileWithChildProcess.prototype.remove = function () {
            util_1.removeLockFile(this.fs, this.logger, this.path, process.pid.toString());
            if (this.unlocker !== null) {
                // If there is an unlocker child-process then disconnect from it so that it can exit itself.
                this.unlocker.disconnect();
                this.unlocker = null;
            }
        };
        LockFileWithChildProcess.prototype.createUnlocker = function (path) {
            this.logger.debug('Forking unlocker child-process');
            var logLevel = this.logger.level !== undefined ? this.logger.level.toString() : logger_1.LogLevel.info.toString();
            return child_process_1.fork(this.fs.resolve(__dirname, './unlocker.js'), [path, logLevel], { detached: true });
        };
        return LockFileWithChildProcess;
    }());
    exports.LockFileWithChildProcess = LockFileWithChildProcess;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvbG9ja2luZy9sb2NrX2ZpbGVfd2l0aF9jaGlsZF9wcm9jZXNzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0NBQWlEO0lBRWpELDJFQUErRjtJQUMvRix3RUFBc0Q7SUFDdEQsOEVBQXVEO0lBRXZELGlHQUFzQztJQUd0Qyw4QkFBOEI7SUFFOUI7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUlFLGtDQUFzQixFQUFjLEVBQVksTUFBYztZQUF4QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVksV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUM1RCxJQUFJLENBQUMsSUFBSSxHQUFHLDJCQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBR0Qsd0NBQUssR0FBTDtZQUNFLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQzFCLDBGQUEwRjtnQkFDMUYsMkVBQTJFO2dCQUMzRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMscUNBQW1DLElBQUksQ0FBQyxJQUFJLGtCQUFhLE9BQU8sQ0FBQyxHQUFLLENBQUMsQ0FBQztZQUMxRix5RkFBeUY7WUFDekYsdURBQXVEO1lBQ3ZELElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsMEJBQXdCLElBQUksQ0FBQyxJQUFJLGtCQUFhLE9BQU8sQ0FBQyxHQUFLLENBQUMsQ0FBQztRQUNqRixDQUFDO1FBRUQsdUNBQUksR0FBSjtZQUNFLElBQUk7Z0JBQ0YsSUFBSSxJQUFJLENBQUMsRUFBRSxZQUFZLDhCQUFnQixFQUFFO29CQUN2QyxnRkFBZ0Y7b0JBQ2hGLDZEQUE2RDtvQkFDN0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3JDO2dCQUNELE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BDO1lBQUMsV0FBTTtnQkFDTixPQUFPLFdBQVcsQ0FBQzthQUNwQjtRQUNILENBQUM7UUFFRCx5Q0FBTSxHQUFOO1lBQ0UscUJBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDeEUsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDMUIsNEZBQTRGO2dCQUM1RixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzthQUN0QjtRQUNILENBQUM7UUFFUyxpREFBYyxHQUF4QixVQUF5QixJQUFvQjtZQUMzQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQ3BELElBQU0sUUFBUSxHQUNWLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzlGLE9BQU8sb0JBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUMvRixDQUFDO1FBQ0gsK0JBQUM7SUFBRCxDQUFDLEFBbkRELElBbURDO0lBbkRZLDREQUF3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q2hpbGRQcm9jZXNzLCBmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgQ2FjaGVkRmlsZVN5c3RlbSwgRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nTGV2ZWwsIExvZ2dlcn0gZnJvbSAnLi4vLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtMb2NrRmlsZSwgZ2V0TG9ja0ZpbGVQYXRofSBmcm9tICcuLi9sb2NrX2ZpbGUnO1xuXG5pbXBvcnQge3JlbW92ZUxvY2tGaWxlfSBmcm9tICcuL3V0aWwnO1xuXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbi8qKlxuICogVGhpcyBgTG9ja0ZpbGVgIGltcGxlbWVudGF0aW9uIHVzZXMgYSBjaGlsZC1wcm9jZXNzIHRvIHJlbW92ZSB0aGUgbG9jayBmaWxlIHdoZW4gdGhlIG1haW4gcHJvY2Vzc1xuICogZXhpdHMgKGZvciB3aGF0ZXZlciByZWFzb24pLlxuICpcbiAqIFRoZXJlIGFyZSBhIGZldyBtaWxsaXNlY29uZHMgYmV0d2VlbiB0aGUgY2hpbGQtcHJvY2VzcyBiZWluZyBmb3JrZWQgYW5kIGl0IHJlZ2lzdGVyaW5nIGl0c1xuICogYGRpc2Nvbm5lY3RgIGV2ZW50LCB3aGljaCBpcyByZXNwb25zaWJsZSBmb3IgdGlkeWluZyB1cCB0aGUgbG9jay1maWxlIGluIHRoZSBldmVudCB0aGF0IHRoZSBtYWluXG4gKiBwcm9jZXNzIGV4aXRzIHVuZXhwZWN0ZWRseS5cbiAqXG4gKiBXZSBlYWdlcmx5IGNyZWF0ZSB0aGUgdW5sb2NrZXIgY2hpbGQtcHJvY2VzcyBzbyB0aGF0IGl0IG1heGltaXplcyB0aGUgdGltZSBiZWZvcmUgdGhlIGxvY2stZmlsZVxuICogaXMgYWN0dWFsbHkgd3JpdHRlbiwgd2hpY2ggbWFrZXMgaXQgdmVyeSB1bmxpa2VseSB0aGF0IHRoZSB1bmxvY2tlciB3b3VsZCBub3QgYmUgcmVhZHkgaW4gdGhlXG4gKiBjYXNlIHRoYXQgdGhlIGRldmVsb3BlciBoaXRzIEN0cmwtQyBvciBjbG9zZXMgdGhlIHRlcm1pbmFsIHdpdGhpbiBhIGZyYWN0aW9uIG9mIGEgc2Vjb25kIG9mIHRoZVxuICogbG9jay1maWxlIGJlaW5nIGNyZWF0ZWQuXG4gKlxuICogVGhlIHdvcnN0IGNhc2Ugc2NlbmFyaW8gaXMgdGhhdCBuZ2NjIGlzIGtpbGxlZCB0b28gcXVpY2tseSBhbmQgbGVhdmVzIGJlaGluZCBhbiBvcnBoYW5lZFxuICogbG9jay1maWxlLiBJbiB3aGljaCBjYXNlIHRoZSBuZXh0IG5nY2MgcnVuIHdpbGwgZGlzcGxheSBhIGhlbHBmdWwgZXJyb3IgbWVzc2FnZSBhYm91dCBkZWxldGluZ1xuICogdGhlIGxvY2stZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2tGaWxlV2l0aENoaWxkUHJvY2VzcyBpbXBsZW1lbnRzIExvY2tGaWxlIHtcbiAgcGF0aDogQWJzb2x1dGVGc1BhdGg7XG4gIHByaXZhdGUgdW5sb2NrZXI6IENoaWxkUHJvY2Vzc3xudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBmczogRmlsZVN5c3RlbSwgcHJvdGVjdGVkIGxvZ2dlcjogTG9nZ2VyKSB7XG4gICAgdGhpcy5wYXRoID0gZ2V0TG9ja0ZpbGVQYXRoKGZzKTtcbiAgICB0aGlzLnVubG9ja2VyID0gdGhpcy5jcmVhdGVVbmxvY2tlcih0aGlzLnBhdGgpO1xuICB9XG5cblxuICB3cml0ZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy51bmxvY2tlciA9PT0gbnVsbCkge1xuICAgICAgLy8gSW4gY2FzZSB3ZSBhbHJlYWR5IGRpc2Nvbm5lY3RlZCB0aGUgcHJldmlvdXMgdW5sb2NrZXIgY2hpbGQtcHJvY2VzcywgcGVyaGFwcyBieSBjYWxsaW5nXG4gICAgICAvLyBgcmVtb3ZlKClgLiBOb3JtYWxseSB0aGUgTG9ja0ZpbGUgc2hvdWxkIG9ubHkgYmUgdXNlZCBvbmNlIHBlciBpbnN0YW5jZS5cbiAgICAgIHRoaXMudW5sb2NrZXIgPSB0aGlzLmNyZWF0ZVVubG9ja2VyKHRoaXMucGF0aCk7XG4gICAgfVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBBdHRlbXBpbmcgdG8gd3JpdGUgbG9jay1maWxlIGF0ICR7dGhpcy5wYXRofSB3aXRoIFBJRCAke3Byb2Nlc3MucGlkfWApO1xuICAgIC8vIFRvIGF2b2lkIHJhY2UgY29uZGl0aW9ucywgY2hlY2sgZm9yIGV4aXN0ZW5jZSBvZiB0aGUgbG9jay1maWxlIGJ5IHRyeWluZyB0byBjcmVhdGUgaXQuXG4gICAgLy8gVGhpcyB3aWxsIHRocm93IGFuIGVycm9yIGlmIHRoZSBmaWxlIGFscmVhZHkgZXhpc3RzLlxuICAgIHRoaXMuZnMud3JpdGVGaWxlKHRoaXMucGF0aCwgcHJvY2Vzcy5waWQudG9TdHJpbmcoKSwgLyogZXhjbHVzaXZlICovIHRydWUpO1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBXcml0dGVuIGxvY2stZmlsZSBhdCAke3RoaXMucGF0aH0gd2l0aCBQSUQgJHtwcm9jZXNzLnBpZH1gKTtcbiAgfVxuXG4gIHJlYWQoKTogc3RyaW5nIHtcbiAgICB0cnkge1xuICAgICAgaWYgKHRoaXMuZnMgaW5zdGFuY2VvZiBDYWNoZWRGaWxlU3lzdGVtKSB7XG4gICAgICAgIC8vIFRoZSBsb2NrLWZpbGUgZmlsZSBpcyBcInZvbGF0aWxlXCIsIGl0IG1pZ2h0IGJlIGNoYW5nZWQgYnkgYW4gZXh0ZXJuYWwgcHJvY2VzcyxcbiAgICAgICAgLy8gc28gd2UgbXVzdCBub3QgcmVseSB1cG9uIHRoZSBjYWNoZWQgdmFsdWUgd2hlbiByZWFkaW5nIGl0LlxuICAgICAgICB0aGlzLmZzLmludmFsaWRhdGVDYWNoZXModGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmZzLnJlYWRGaWxlKHRoaXMucGF0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gJ3t1bmtub3dufSc7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlKCkge1xuICAgIHJlbW92ZUxvY2tGaWxlKHRoaXMuZnMsIHRoaXMubG9nZ2VyLCB0aGlzLnBhdGgsIHByb2Nlc3MucGlkLnRvU3RyaW5nKCkpO1xuICAgIGlmICh0aGlzLnVubG9ja2VyICE9PSBudWxsKSB7XG4gICAgICAvLyBJZiB0aGVyZSBpcyBhbiB1bmxvY2tlciBjaGlsZC1wcm9jZXNzIHRoZW4gZGlzY29ubmVjdCBmcm9tIGl0IHNvIHRoYXQgaXQgY2FuIGV4aXQgaXRzZWxmLlxuICAgICAgdGhpcy51bmxvY2tlci5kaXNjb25uZWN0KCk7XG4gICAgICB0aGlzLnVubG9ja2VyID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgY3JlYXRlVW5sb2NrZXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBDaGlsZFByb2Nlc3Mge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdGb3JraW5nIHVubG9ja2VyIGNoaWxkLXByb2Nlc3MnKTtcbiAgICBjb25zdCBsb2dMZXZlbCA9XG4gICAgICAgIHRoaXMubG9nZ2VyLmxldmVsICE9PSB1bmRlZmluZWQgPyB0aGlzLmxvZ2dlci5sZXZlbC50b1N0cmluZygpIDogTG9nTGV2ZWwuaW5mby50b1N0cmluZygpO1xuICAgIHJldHVybiBmb3JrKHRoaXMuZnMucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3VubG9ja2VyLmpzJyksIFtwYXRoLCBsb2dMZXZlbF0sIHtkZXRhY2hlZDogdHJ1ZX0pO1xuICB9XG59XG4iXX0=