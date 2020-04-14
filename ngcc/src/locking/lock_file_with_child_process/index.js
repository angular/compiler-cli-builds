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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvbG9ja2luZy9sb2NrX2ZpbGVfd2l0aF9jaGlsZF9wcm9jZXNzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0NBQWlEO0lBRWpELDJFQUErRjtJQUMvRix3RUFBc0Q7SUFDdEQsOEVBQXVEO0lBRXZELGlHQUFzQztJQUV0Qyw4QkFBOEI7SUFFOUI7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUlFLGtDQUFzQixFQUFjLEVBQVksTUFBYztZQUF4QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVksV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUM1RCxJQUFJLENBQUMsSUFBSSxHQUFHLDJCQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBR0Qsd0NBQUssR0FBTDtZQUNFLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQzFCLDBGQUEwRjtnQkFDMUYsMkVBQTJFO2dCQUMzRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMscUNBQW1DLElBQUksQ0FBQyxJQUFJLGtCQUFhLE9BQU8sQ0FBQyxHQUFLLENBQUMsQ0FBQztZQUMxRix5RkFBeUY7WUFDekYsdURBQXVEO1lBQ3ZELElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsMEJBQXdCLElBQUksQ0FBQyxJQUFJLGtCQUFhLE9BQU8sQ0FBQyxHQUFLLENBQUMsQ0FBQztRQUNqRixDQUFDO1FBRUQsdUNBQUksR0FBSjtZQUNFLElBQUk7Z0JBQ0YsSUFBSSxJQUFJLENBQUMsRUFBRSxZQUFZLDhCQUFnQixFQUFFO29CQUN2QyxnRkFBZ0Y7b0JBQ2hGLDZEQUE2RDtvQkFDN0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3JDO2dCQUNELE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BDO1lBQUMsV0FBTTtnQkFDTixPQUFPLFdBQVcsQ0FBQzthQUNwQjtRQUNILENBQUM7UUFFRCx5Q0FBTSxHQUFOO1lBQ0UscUJBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDeEUsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDMUIsNEZBQTRGO2dCQUM1RixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzthQUN0QjtRQUNILENBQUM7UUFFUyxpREFBYyxHQUF4QixVQUF5QixJQUFvQjtZQUMzQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQ3BELElBQU0sUUFBUSxHQUNWLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzlGLE9BQU8sb0JBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUMvRixDQUFDO1FBQ0gsK0JBQUM7SUFBRCxDQUFDLEFBbkRELElBbURDO0lBbkRZLDREQUF3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q2hpbGRQcm9jZXNzLCBmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgQ2FjaGVkRmlsZVN5c3RlbSwgRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi4vLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtnZXRMb2NrRmlsZVBhdGgsIExvY2tGaWxlfSBmcm9tICcuLi9sb2NrX2ZpbGUnO1xuXG5pbXBvcnQge3JlbW92ZUxvY2tGaWxlfSBmcm9tICcuL3V0aWwnO1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG4vKipcbiAqIFRoaXMgYExvY2tGaWxlYCBpbXBsZW1lbnRhdGlvbiB1c2VzIGEgY2hpbGQtcHJvY2VzcyB0byByZW1vdmUgdGhlIGxvY2sgZmlsZSB3aGVuIHRoZSBtYWluIHByb2Nlc3NcbiAqIGV4aXRzIChmb3Igd2hhdGV2ZXIgcmVhc29uKS5cbiAqXG4gKiBUaGVyZSBhcmUgYSBmZXcgbWlsbGlzZWNvbmRzIGJldHdlZW4gdGhlIGNoaWxkLXByb2Nlc3MgYmVpbmcgZm9ya2VkIGFuZCBpdCByZWdpc3RlcmluZyBpdHNcbiAqIGBkaXNjb25uZWN0YCBldmVudCwgd2hpY2ggaXMgcmVzcG9uc2libGUgZm9yIHRpZHlpbmcgdXAgdGhlIGxvY2stZmlsZSBpbiB0aGUgZXZlbnQgdGhhdCB0aGUgbWFpblxuICogcHJvY2VzcyBleGl0cyB1bmV4cGVjdGVkbHkuXG4gKlxuICogV2UgZWFnZXJseSBjcmVhdGUgdGhlIHVubG9ja2VyIGNoaWxkLXByb2Nlc3Mgc28gdGhhdCBpdCBtYXhpbWl6ZXMgdGhlIHRpbWUgYmVmb3JlIHRoZSBsb2NrLWZpbGVcbiAqIGlzIGFjdHVhbGx5IHdyaXR0ZW4sIHdoaWNoIG1ha2VzIGl0IHZlcnkgdW5saWtlbHkgdGhhdCB0aGUgdW5sb2NrZXIgd291bGQgbm90IGJlIHJlYWR5IGluIHRoZVxuICogY2FzZSB0aGF0IHRoZSBkZXZlbG9wZXIgaGl0cyBDdHJsLUMgb3IgY2xvc2VzIHRoZSB0ZXJtaW5hbCB3aXRoaW4gYSBmcmFjdGlvbiBvZiBhIHNlY29uZCBvZiB0aGVcbiAqIGxvY2stZmlsZSBiZWluZyBjcmVhdGVkLlxuICpcbiAqIFRoZSB3b3JzdCBjYXNlIHNjZW5hcmlvIGlzIHRoYXQgbmdjYyBpcyBraWxsZWQgdG9vIHF1aWNrbHkgYW5kIGxlYXZlcyBiZWhpbmQgYW4gb3JwaGFuZWRcbiAqIGxvY2stZmlsZS4gSW4gd2hpY2ggY2FzZSB0aGUgbmV4dCBuZ2NjIHJ1biB3aWxsIGRpc3BsYXkgYSBoZWxwZnVsIGVycm9yIG1lc3NhZ2UgYWJvdXQgZGVsZXRpbmdcbiAqIHRoZSBsb2NrLWZpbGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NrRmlsZVdpdGhDaGlsZFByb2Nlc3MgaW1wbGVtZW50cyBMb2NrRmlsZSB7XG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuICBwcml2YXRlIHVubG9ja2VyOiBDaGlsZFByb2Nlc3N8bnVsbDtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZnM6IEZpbGVTeXN0ZW0sIHByb3RlY3RlZCBsb2dnZXI6IExvZ2dlcikge1xuICAgIHRoaXMucGF0aCA9IGdldExvY2tGaWxlUGF0aChmcyk7XG4gICAgdGhpcy51bmxvY2tlciA9IHRoaXMuY3JlYXRlVW5sb2NrZXIodGhpcy5wYXRoKTtcbiAgfVxuXG5cbiAgd3JpdGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMudW5sb2NrZXIgPT09IG51bGwpIHtcbiAgICAgIC8vIEluIGNhc2Ugd2UgYWxyZWFkeSBkaXNjb25uZWN0ZWQgdGhlIHByZXZpb3VzIHVubG9ja2VyIGNoaWxkLXByb2Nlc3MsIHBlcmhhcHMgYnkgY2FsbGluZ1xuICAgICAgLy8gYHJlbW92ZSgpYC4gTm9ybWFsbHkgdGhlIExvY2tGaWxlIHNob3VsZCBvbmx5IGJlIHVzZWQgb25jZSBwZXIgaW5zdGFuY2UuXG4gICAgICB0aGlzLnVubG9ja2VyID0gdGhpcy5jcmVhdGVVbmxvY2tlcih0aGlzLnBhdGgpO1xuICAgIH1cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgQXR0ZW1waW5nIHRvIHdyaXRlIGxvY2stZmlsZSBhdCAke3RoaXMucGF0aH0gd2l0aCBQSUQgJHtwcm9jZXNzLnBpZH1gKTtcbiAgICAvLyBUbyBhdm9pZCByYWNlIGNvbmRpdGlvbnMsIGNoZWNrIGZvciBleGlzdGVuY2Ugb2YgdGhlIGxvY2stZmlsZSBieSB0cnlpbmcgdG8gY3JlYXRlIGl0LlxuICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBlcnJvciBpZiB0aGUgZmlsZSBhbHJlYWR5IGV4aXN0cy5cbiAgICB0aGlzLmZzLndyaXRlRmlsZSh0aGlzLnBhdGgsIHByb2Nlc3MucGlkLnRvU3RyaW5nKCksIC8qIGV4Y2x1c2l2ZSAqLyB0cnVlKTtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgV3JpdHRlbiBsb2NrLWZpbGUgYXQgJHt0aGlzLnBhdGh9IHdpdGggUElEICR7cHJvY2Vzcy5waWR9YCk7XG4gIH1cblxuICByZWFkKCk6IHN0cmluZyB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICh0aGlzLmZzIGluc3RhbmNlb2YgQ2FjaGVkRmlsZVN5c3RlbSkge1xuICAgICAgICAvLyBUaGUgbG9jay1maWxlIGZpbGUgaXMgXCJ2b2xhdGlsZVwiLCBpdCBtaWdodCBiZSBjaGFuZ2VkIGJ5IGFuIGV4dGVybmFsIHByb2Nlc3MsXG4gICAgICAgIC8vIHNvIHdlIG11c3Qgbm90IHJlbHkgdXBvbiB0aGUgY2FjaGVkIHZhbHVlIHdoZW4gcmVhZGluZyBpdC5cbiAgICAgICAgdGhpcy5mcy5pbnZhbGlkYXRlQ2FjaGVzKHRoaXMucGF0aCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5mcy5yZWFkRmlsZSh0aGlzLnBhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuICd7dW5rbm93bn0nO1xuICAgIH1cbiAgfVxuXG4gIHJlbW92ZSgpIHtcbiAgICByZW1vdmVMb2NrRmlsZSh0aGlzLmZzLCB0aGlzLmxvZ2dlciwgdGhpcy5wYXRoLCBwcm9jZXNzLnBpZC50b1N0cmluZygpKTtcbiAgICBpZiAodGhpcy51bmxvY2tlciAhPT0gbnVsbCkge1xuICAgICAgLy8gSWYgdGhlcmUgaXMgYW4gdW5sb2NrZXIgY2hpbGQtcHJvY2VzcyB0aGVuIGRpc2Nvbm5lY3QgZnJvbSBpdCBzbyB0aGF0IGl0IGNhbiBleGl0IGl0c2VsZi5cbiAgICAgIHRoaXMudW5sb2NrZXIuZGlzY29ubmVjdCgpO1xuICAgICAgdGhpcy51bmxvY2tlciA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGNyZWF0ZVVubG9ja2VyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogQ2hpbGRQcm9jZXNzIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRm9ya2luZyB1bmxvY2tlciBjaGlsZC1wcm9jZXNzJyk7XG4gICAgY29uc3QgbG9nTGV2ZWwgPVxuICAgICAgICB0aGlzLmxvZ2dlci5sZXZlbCAhPT0gdW5kZWZpbmVkID8gdGhpcy5sb2dnZXIubGV2ZWwudG9TdHJpbmcoKSA6IExvZ0xldmVsLmluZm8udG9TdHJpbmcoKTtcbiAgICByZXR1cm4gZm9yayh0aGlzLmZzLnJlc29sdmUoX19kaXJuYW1lLCAnLi91bmxvY2tlci5qcycpLCBbcGF0aCwgbG9nTGV2ZWxdLCB7ZGV0YWNoZWQ6IHRydWV9KTtcbiAgfVxufVxuIl19