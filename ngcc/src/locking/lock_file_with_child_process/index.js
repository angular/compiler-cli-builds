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
            var unlocker = child_process_1.fork(this.fs.resolve(__dirname, './unlocker.js'), [path, logLevel], {
                detached: true,
                stdio: 'pipe',
            });
            unlocker.stdout.on('data', function (data) { return process.stdout.write(data); });
            unlocker.stderr.on('data', function (data) { return process.stderr.write(data); });
            return unlocker;
        };
        return LockFileWithChildProcess;
    }());
    exports.LockFileWithChildProcess = LockFileWithChildProcess;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvbG9ja2luZy9sb2NrX2ZpbGVfd2l0aF9jaGlsZF9wcm9jZXNzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0NBQXNFO0lBR3RFLDJFQUErRjtJQUMvRix3RUFBc0Q7SUFDdEQsOEVBQXVEO0lBRXZELGlHQUFzQztJQUV0Qyw4QkFBOEI7SUFFOUI7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSDtRQUlFLGtDQUFzQixFQUFjLEVBQVksTUFBYztZQUF4QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVksV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUM1RCxJQUFJLENBQUMsSUFBSSxHQUFHLDJCQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBR0Qsd0NBQUssR0FBTDtZQUNFLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQzFCLDBGQUEwRjtnQkFDMUYsMkVBQTJFO2dCQUMzRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMscUNBQW1DLElBQUksQ0FBQyxJQUFJLGtCQUFhLE9BQU8sQ0FBQyxHQUFLLENBQUMsQ0FBQztZQUMxRix5RkFBeUY7WUFDekYsdURBQXVEO1lBQ3ZELElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsMEJBQXdCLElBQUksQ0FBQyxJQUFJLGtCQUFhLE9BQU8sQ0FBQyxHQUFLLENBQUMsQ0FBQztRQUNqRixDQUFDO1FBRUQsdUNBQUksR0FBSjtZQUNFLElBQUk7Z0JBQ0YsSUFBSSxJQUFJLENBQUMsRUFBRSxZQUFZLDhCQUFnQixFQUFFO29CQUN2QyxnRkFBZ0Y7b0JBQ2hGLDZEQUE2RDtvQkFDN0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3JDO2dCQUNELE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BDO1lBQUMsV0FBTTtnQkFDTixPQUFPLFdBQVcsQ0FBQzthQUNwQjtRQUNILENBQUM7UUFFRCx5Q0FBTSxHQUFOO1lBQ0UscUJBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDeEUsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDMUIsNEZBQTRGO2dCQUM1RixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzthQUN0QjtRQUNILENBQUM7UUFFUyxpREFBYyxHQUF4QixVQUF5QixJQUFvQjtZQUMzQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQ3BELElBQU0sUUFBUSxHQUNWLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLGlCQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBRTlGLElBQU0sUUFBUSxHQUFHLG9CQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFO2dCQUNsRSxRQUFRLEVBQUUsSUFBSTtnQkFDZCxLQUFLLEVBQUUsTUFBTTthQUNkLENBQXNELENBQUM7WUFDekUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUEsSUFBSSxJQUFJLE9BQUEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQTFCLENBQTBCLENBQUMsQ0FBQztZQUMvRCxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsVUFBQSxJQUFJLElBQUksT0FBQSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBMUIsQ0FBMEIsQ0FBQyxDQUFDO1lBRS9ELE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7UUFDSCwrQkFBQztJQUFELENBQUMsQUEzREQsSUEyREM7SUEzRFksNERBQXdCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDaGlsZFByb2Nlc3MsIENoaWxkUHJvY2Vzc0J5U3RkaW8sIGZvcmt9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtSZWFkYWJsZSwgV3JpdGFibGV9IGZyb20gJ3N0cmVhbSc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIENhY2hlZEZpbGVTeXN0ZW0sIEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlciwgTG9nTGV2ZWx9IGZyb20gJy4uLy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7Z2V0TG9ja0ZpbGVQYXRoLCBMb2NrRmlsZX0gZnJvbSAnLi4vbG9ja19maWxlJztcblxuaW1wb3J0IHtyZW1vdmVMb2NrRmlsZX0gZnJvbSAnLi91dGlsJztcblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuLyoqXG4gKiBUaGlzIGBMb2NrRmlsZWAgaW1wbGVtZW50YXRpb24gdXNlcyBhIGNoaWxkLXByb2Nlc3MgdG8gcmVtb3ZlIHRoZSBsb2NrIGZpbGUgd2hlbiB0aGUgbWFpbiBwcm9jZXNzXG4gKiBleGl0cyAoZm9yIHdoYXRldmVyIHJlYXNvbikuXG4gKlxuICogVGhlcmUgYXJlIGEgZmV3IG1pbGxpc2Vjb25kcyBiZXR3ZWVuIHRoZSBjaGlsZC1wcm9jZXNzIGJlaW5nIGZvcmtlZCBhbmQgaXQgcmVnaXN0ZXJpbmcgaXRzXG4gKiBgZGlzY29ubmVjdGAgZXZlbnQsIHdoaWNoIGlzIHJlc3BvbnNpYmxlIGZvciB0aWR5aW5nIHVwIHRoZSBsb2NrLWZpbGUgaW4gdGhlIGV2ZW50IHRoYXQgdGhlIG1haW5cbiAqIHByb2Nlc3MgZXhpdHMgdW5leHBlY3RlZGx5LlxuICpcbiAqIFdlIGVhZ2VybHkgY3JlYXRlIHRoZSB1bmxvY2tlciBjaGlsZC1wcm9jZXNzIHNvIHRoYXQgaXQgbWF4aW1pemVzIHRoZSB0aW1lIGJlZm9yZSB0aGUgbG9jay1maWxlXG4gKiBpcyBhY3R1YWxseSB3cml0dGVuLCB3aGljaCBtYWtlcyBpdCB2ZXJ5IHVubGlrZWx5IHRoYXQgdGhlIHVubG9ja2VyIHdvdWxkIG5vdCBiZSByZWFkeSBpbiB0aGVcbiAqIGNhc2UgdGhhdCB0aGUgZGV2ZWxvcGVyIGhpdHMgQ3RybC1DIG9yIGNsb3NlcyB0aGUgdGVybWluYWwgd2l0aGluIGEgZnJhY3Rpb24gb2YgYSBzZWNvbmQgb2YgdGhlXG4gKiBsb2NrLWZpbGUgYmVpbmcgY3JlYXRlZC5cbiAqXG4gKiBUaGUgd29yc3QgY2FzZSBzY2VuYXJpbyBpcyB0aGF0IG5nY2MgaXMga2lsbGVkIHRvbyBxdWlja2x5IGFuZCBsZWF2ZXMgYmVoaW5kIGFuIG9ycGhhbmVkXG4gKiBsb2NrLWZpbGUuIEluIHdoaWNoIGNhc2UgdGhlIG5leHQgbmdjYyBydW4gd2lsbCBkaXNwbGF5IGEgaGVscGZ1bCBlcnJvciBtZXNzYWdlIGFib3V0IGRlbGV0aW5nXG4gKiB0aGUgbG9jay1maWxlLlxuICovXG5leHBvcnQgY2xhc3MgTG9ja0ZpbGVXaXRoQ2hpbGRQcm9jZXNzIGltcGxlbWVudHMgTG9ja0ZpbGUge1xuICBwYXRoOiBBYnNvbHV0ZUZzUGF0aDtcbiAgcHJpdmF0ZSB1bmxvY2tlcjogQ2hpbGRQcm9jZXNzfG51bGw7XG5cbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGZzOiBGaWxlU3lzdGVtLCBwcm90ZWN0ZWQgbG9nZ2VyOiBMb2dnZXIpIHtcbiAgICB0aGlzLnBhdGggPSBnZXRMb2NrRmlsZVBhdGgoZnMpO1xuICAgIHRoaXMudW5sb2NrZXIgPSB0aGlzLmNyZWF0ZVVubG9ja2VyKHRoaXMucGF0aCk7XG4gIH1cblxuXG4gIHdyaXRlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnVubG9ja2VyID09PSBudWxsKSB7XG4gICAgICAvLyBJbiBjYXNlIHdlIGFscmVhZHkgZGlzY29ubmVjdGVkIHRoZSBwcmV2aW91cyB1bmxvY2tlciBjaGlsZC1wcm9jZXNzLCBwZXJoYXBzIGJ5IGNhbGxpbmdcbiAgICAgIC8vIGByZW1vdmUoKWAuIE5vcm1hbGx5IHRoZSBMb2NrRmlsZSBzaG91bGQgb25seSBiZSB1c2VkIG9uY2UgcGVyIGluc3RhbmNlLlxuICAgICAgdGhpcy51bmxvY2tlciA9IHRoaXMuY3JlYXRlVW5sb2NrZXIodGhpcy5wYXRoKTtcbiAgICB9XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoYEF0dGVtcGluZyB0byB3cml0ZSBsb2NrLWZpbGUgYXQgJHt0aGlzLnBhdGh9IHdpdGggUElEICR7cHJvY2Vzcy5waWR9YCk7XG4gICAgLy8gVG8gYXZvaWQgcmFjZSBjb25kaXRpb25zLCBjaGVjayBmb3IgZXhpc3RlbmNlIG9mIHRoZSBsb2NrLWZpbGUgYnkgdHJ5aW5nIHRvIGNyZWF0ZSBpdC5cbiAgICAvLyBUaGlzIHdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGZpbGUgYWxyZWFkeSBleGlzdHMuXG4gICAgdGhpcy5mcy53cml0ZUZpbGUodGhpcy5wYXRoLCBwcm9jZXNzLnBpZC50b1N0cmluZygpLCAvKiBleGNsdXNpdmUgKi8gdHJ1ZSk7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoYFdyaXR0ZW4gbG9jay1maWxlIGF0ICR7dGhpcy5wYXRofSB3aXRoIFBJRCAke3Byb2Nlc3MucGlkfWApO1xuICB9XG5cbiAgcmVhZCgpOiBzdHJpbmcge1xuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy5mcyBpbnN0YW5jZW9mIENhY2hlZEZpbGVTeXN0ZW0pIHtcbiAgICAgICAgLy8gVGhlIGxvY2stZmlsZSBmaWxlIGlzIFwidm9sYXRpbGVcIiwgaXQgbWlnaHQgYmUgY2hhbmdlZCBieSBhbiBleHRlcm5hbCBwcm9jZXNzLFxuICAgICAgICAvLyBzbyB3ZSBtdXN0IG5vdCByZWx5IHVwb24gdGhlIGNhY2hlZCB2YWx1ZSB3aGVuIHJlYWRpbmcgaXQuXG4gICAgICAgIHRoaXMuZnMuaW52YWxpZGF0ZUNhY2hlcyh0aGlzLnBhdGgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZnMucmVhZEZpbGUodGhpcy5wYXRoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiAne3Vua25vd259JztcbiAgICB9XG4gIH1cblxuICByZW1vdmUoKSB7XG4gICAgcmVtb3ZlTG9ja0ZpbGUodGhpcy5mcywgdGhpcy5sb2dnZXIsIHRoaXMucGF0aCwgcHJvY2Vzcy5waWQudG9TdHJpbmcoKSk7XG4gICAgaWYgKHRoaXMudW5sb2NrZXIgIT09IG51bGwpIHtcbiAgICAgIC8vIElmIHRoZXJlIGlzIGFuIHVubG9ja2VyIGNoaWxkLXByb2Nlc3MgdGhlbiBkaXNjb25uZWN0IGZyb20gaXQgc28gdGhhdCBpdCBjYW4gZXhpdCBpdHNlbGYuXG4gICAgICB0aGlzLnVubG9ja2VyLmRpc2Nvbm5lY3QoKTtcbiAgICAgIHRoaXMudW5sb2NrZXIgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBjcmVhdGVVbmxvY2tlcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IENoaWxkUHJvY2Vzc3xudWxsIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnRm9ya2luZyB1bmxvY2tlciBjaGlsZC1wcm9jZXNzJyk7XG4gICAgY29uc3QgbG9nTGV2ZWwgPVxuICAgICAgICB0aGlzLmxvZ2dlci5sZXZlbCAhPT0gdW5kZWZpbmVkID8gdGhpcy5sb2dnZXIubGV2ZWwudG9TdHJpbmcoKSA6IExvZ0xldmVsLmluZm8udG9TdHJpbmcoKTtcblxuICAgIGNvbnN0IHVubG9ja2VyID0gZm9yayh0aGlzLmZzLnJlc29sdmUoX19kaXJuYW1lLCAnLi91bmxvY2tlci5qcycpLCBbcGF0aCwgbG9nTGV2ZWxdLCB7XG4gICAgICAgICAgICAgICAgICAgICAgIGRldGFjaGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICBzdGRpbzogJ3BpcGUnLFxuICAgICAgICAgICAgICAgICAgICAgfSkgYXMgQ2hpbGRQcm9jZXNzQnlTdGRpbzxXcml0YWJsZSwgUmVhZGFibGUsIFJlYWRhYmxlPjtcbiAgICB1bmxvY2tlci5zdGRvdXQub24oJ2RhdGEnLCBkYXRhID0+IHByb2Nlc3Muc3Rkb3V0LndyaXRlKGRhdGEpKTtcbiAgICB1bmxvY2tlci5zdGRlcnIub24oJ2RhdGEnLCBkYXRhID0+IHByb2Nlc3Muc3RkZXJyLndyaXRlKGRhdGEpKTtcblxuICAgIHJldHVybiB1bmxvY2tlcjtcbiAgfVxufVxuIl19