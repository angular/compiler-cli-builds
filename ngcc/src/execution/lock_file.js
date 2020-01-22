(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/lock_file", ["require", "exports", "process"], factory);
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
    var process = require("process");
    /**
     * The LockFile is used to prevent more than one instance of ngcc executing at the same time.
     *
     * When ngcc starts executing, it creates a file in the `compiler-cli/ngcc` folder. If it finds one
     * is already there then it fails with a suitable error message.
     * When ngcc completes executing, it removes the file so that future ngcc executions can start.
     */
    var LockFile = /** @class */ (function () {
        function LockFile(fs) {
            var _this = this;
            this.fs = fs;
            this.lockFilePath = this.fs.resolve(require.resolve('@angular/compiler-cli/ngcc'), '../__ngcc_lock_file__');
            /**
             * This handle needs to be defined as a property rather than a method
             * so that it can be passed around as a bound function.
             */
            this.signalHandler = function () {
                _this.remove();
                _this.exit(1);
            };
        }
        /**
         * Run a function guarded by the lock file.
         *
         * Note that T can be a Promise. If so, we run the `remove()` call in the promise's `finally`
         * handler. Otherwise we run the `remove()` call in the `try...finally` block.
         *
         * @param fn The function to run.
         */
        LockFile.prototype.lock = function (fn) {
            var _this = this;
            var isAsync = false;
            this.create();
            try {
                var result = fn();
                if (result instanceof Promise) {
                    isAsync = true;
                    // The cast is necessary because TS cannot deduce that T is now a promise here.
                    return result.finally(function () { return _this.remove(); });
                }
                else {
                    return result;
                }
            }
            finally {
                if (!isAsync) {
                    this.remove();
                }
            }
        };
        /**
         * Write a lock file to disk, or error if there is already one there.
         */
        LockFile.prototype.create = function () {
            try {
                this.addSignalHandlers();
                // To avoid race conditions, we check for existence of the lockfile
                // by actually trying to create it exclusively
                this.fs.writeFile(this.lockFilePath, process.pid.toString(), /* exclusive */ true);
            }
            catch (e) {
                this.removeSignalHandlers();
                if (e.code !== 'EEXIST') {
                    throw e;
                }
                // The lockfile already exists so raise a helpful error.
                // It is feasible that the lockfile was removed between the previous check for existence
                // and this file-read. If so then we still error but as gracefully as possible.
                var pid = void 0;
                try {
                    pid = this.fs.readFile(this.lockFilePath);
                }
                catch (_a) {
                    pid = '{unknown}';
                }
                throw new Error("ngcc is already running at process with id " + pid + ".\n" +
                    ("(If you are sure no ngcc process is running then you should delete the lockfile at " + this.lockFilePath + ".)"));
            }
        };
        /**
         * Remove the lock file from disk.
         */
        LockFile.prototype.remove = function () {
            this.removeSignalHandlers();
            if (this.fs.exists(this.lockFilePath)) {
                this.fs.removeFile(this.lockFilePath);
            }
        };
        LockFile.prototype.addSignalHandlers = function () {
            process.once('SIGINT', this.signalHandler);
            process.once('SIGHUP', this.signalHandler);
        };
        LockFile.prototype.removeSignalHandlers = function () {
            process.removeListener('SIGINT', this.signalHandler);
            process.removeListener('SIGHUP', this.signalHandler);
        };
        /**
         * This function wraps `process.exit()` which makes it easier to manage in unit tests,
         * since it is not possible to mock out `process.exit()` when it is called from signal handlers.
         */
        LockFile.prototype.exit = function (code) {
            process.exit(code);
        };
        return LockFile;
    }());
    exports.LockFile = LockFile;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ja19maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi9sb2NrX2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCxpQ0FBbUM7SUFHbkM7Ozs7OztPQU1HO0lBQ0g7UUFJRSxrQkFBb0IsRUFBYztZQUFsQyxpQkFBc0M7WUFBbEIsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUhsQyxpQkFBWSxHQUNSLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1lBa0Y1Rjs7O2VBR0c7WUFDTyxrQkFBYSxHQUNuQjtnQkFDRSxLQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2QsS0FBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNmLENBQUMsQ0FBQTtRQXhGZ0MsQ0FBQztRQUV0Qzs7Ozs7OztXQU9HO1FBQ0gsdUJBQUksR0FBSixVQUFRLEVBQVc7WUFBbkIsaUJBaUJDO1lBaEJDLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNwQixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDZCxJQUFJO2dCQUNGLElBQU0sTUFBTSxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUNwQixJQUFJLE1BQU0sWUFBWSxPQUFPLEVBQUU7b0JBQzdCLE9BQU8sR0FBRyxJQUFJLENBQUM7b0JBQ2YsK0VBQStFO29CQUMvRSxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxNQUFNLEVBQUUsRUFBYixDQUFhLENBQWlCLENBQUM7aUJBQzVEO3FCQUFNO29CQUNMLE9BQU8sTUFBTSxDQUFDO2lCQUNmO2FBQ0Y7b0JBQVM7Z0JBQ1IsSUFBSSxDQUFDLE9BQU8sRUFBRTtvQkFDWixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7aUJBQ2Y7YUFDRjtRQUNILENBQUM7UUFFRDs7V0FFRztRQUNPLHlCQUFNLEdBQWhCO1lBQ0UsSUFBSTtnQkFDRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDekIsbUVBQW1FO2dCQUNuRSw4Q0FBOEM7Z0JBQzlDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDcEY7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtvQkFDdkIsTUFBTSxDQUFDLENBQUM7aUJBQ1Q7Z0JBRUQsd0RBQXdEO2dCQUN4RCx3RkFBd0Y7Z0JBQ3hGLCtFQUErRTtnQkFDL0UsSUFBSSxHQUFHLFNBQVEsQ0FBQztnQkFDaEIsSUFBSTtvQkFDRixHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2lCQUMzQztnQkFBQyxXQUFNO29CQUNOLEdBQUcsR0FBRyxXQUFXLENBQUM7aUJBQ25CO2dCQUVELE1BQU0sSUFBSSxLQUFLLENBQ1gsZ0RBQThDLEdBQUcsUUFBSztxQkFDdEQsd0ZBQXNGLElBQUksQ0FBQyxZQUFZLE9BQUksQ0FBQSxDQUFDLENBQUM7YUFDbEg7UUFDSCxDQUFDO1FBRUQ7O1dBRUc7UUFDTyx5QkFBTSxHQUFoQjtZQUNFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVCLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNyQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDdkM7UUFDSCxDQUFDO1FBRVMsb0NBQWlCLEdBQTNCO1lBQ0UsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRVMsdUNBQW9CLEdBQTlCO1lBQ0UsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3JELE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBWUQ7OztXQUdHO1FBQ08sdUJBQUksR0FBZCxVQUFlLElBQVk7WUFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBQ0gsZUFBQztJQUFELENBQUMsQUFyR0QsSUFxR0M7SUFyR1ksNEJBQVEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBwcm9jZXNzIGZyb20gJ3Byb2Nlc3MnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG4vKipcbiAqIFRoZSBMb2NrRmlsZSBpcyB1c2VkIHRvIHByZXZlbnQgbW9yZSB0aGFuIG9uZSBpbnN0YW5jZSBvZiBuZ2NjIGV4ZWN1dGluZyBhdCB0aGUgc2FtZSB0aW1lLlxuICpcbiAqIFdoZW4gbmdjYyBzdGFydHMgZXhlY3V0aW5nLCBpdCBjcmVhdGVzIGEgZmlsZSBpbiB0aGUgYGNvbXBpbGVyLWNsaS9uZ2NjYCBmb2xkZXIuIElmIGl0IGZpbmRzIG9uZVxuICogaXMgYWxyZWFkeSB0aGVyZSB0aGVuIGl0IGZhaWxzIHdpdGggYSBzdWl0YWJsZSBlcnJvciBtZXNzYWdlLlxuICogV2hlbiBuZ2NjIGNvbXBsZXRlcyBleGVjdXRpbmcsIGl0IHJlbW92ZXMgdGhlIGZpbGUgc28gdGhhdCBmdXR1cmUgbmdjYyBleGVjdXRpb25zIGNhbiBzdGFydC5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2tGaWxlIHtcbiAgbG9ja0ZpbGVQYXRoID1cbiAgICAgIHRoaXMuZnMucmVzb2x2ZShyZXF1aXJlLnJlc29sdmUoJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9uZ2NjJyksICcuLi9fX25nY2NfbG9ja19maWxlX18nKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtKSB7fVxuXG4gIC8qKlxuICAgKiBSdW4gYSBmdW5jdGlvbiBndWFyZGVkIGJ5IHRoZSBsb2NrIGZpbGUuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBUIGNhbiBiZSBhIFByb21pc2UuIElmIHNvLCB3ZSBydW4gdGhlIGByZW1vdmUoKWAgY2FsbCBpbiB0aGUgcHJvbWlzZSdzIGBmaW5hbGx5YFxuICAgKiBoYW5kbGVyLiBPdGhlcndpc2Ugd2UgcnVuIHRoZSBgcmVtb3ZlKClgIGNhbGwgaW4gdGhlIGB0cnkuLi5maW5hbGx5YCBibG9jay5cbiAgICpcbiAgICogQHBhcmFtIGZuIFRoZSBmdW5jdGlvbiB0byBydW4uXG4gICAqL1xuICBsb2NrPFQ+KGZuOiAoKSA9PiBUKTogVCB7XG4gICAgbGV0IGlzQXN5bmMgPSBmYWxzZTtcbiAgICB0aGlzLmNyZWF0ZSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBmbigpO1xuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgaXNBc3luYyA9IHRydWU7XG4gICAgICAgIC8vIFRoZSBjYXN0IGlzIG5lY2Vzc2FyeSBiZWNhdXNlIFRTIGNhbm5vdCBkZWR1Y2UgdGhhdCBUIGlzIG5vdyBhIHByb21pc2UgaGVyZS5cbiAgICAgICAgcmV0dXJuIHJlc3VsdC5maW5hbGx5KCgpID0+IHRoaXMucmVtb3ZlKCkpIGFzIHVua25vd24gYXMgVDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmICghaXNBc3luYykge1xuICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZSBhIGxvY2sgZmlsZSB0byBkaXNrLCBvciBlcnJvciBpZiB0aGVyZSBpcyBhbHJlYWR5IG9uZSB0aGVyZS5cbiAgICovXG4gIHByb3RlY3RlZCBjcmVhdGUoKSB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuYWRkU2lnbmFsSGFuZGxlcnMoKTtcbiAgICAgIC8vIFRvIGF2b2lkIHJhY2UgY29uZGl0aW9ucywgd2UgY2hlY2sgZm9yIGV4aXN0ZW5jZSBvZiB0aGUgbG9ja2ZpbGVcbiAgICAgIC8vIGJ5IGFjdHVhbGx5IHRyeWluZyB0byBjcmVhdGUgaXQgZXhjbHVzaXZlbHlcbiAgICAgIHRoaXMuZnMud3JpdGVGaWxlKHRoaXMubG9ja0ZpbGVQYXRoLCBwcm9jZXNzLnBpZC50b1N0cmluZygpLCAvKiBleGNsdXNpdmUgKi8gdHJ1ZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5yZW1vdmVTaWduYWxIYW5kbGVycygpO1xuICAgICAgaWYgKGUuY29kZSAhPT0gJ0VFWElTVCcpIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGxvY2tmaWxlIGFscmVhZHkgZXhpc3RzIHNvIHJhaXNlIGEgaGVscGZ1bCBlcnJvci5cbiAgICAgIC8vIEl0IGlzIGZlYXNpYmxlIHRoYXQgdGhlIGxvY2tmaWxlIHdhcyByZW1vdmVkIGJldHdlZW4gdGhlIHByZXZpb3VzIGNoZWNrIGZvciBleGlzdGVuY2VcbiAgICAgIC8vIGFuZCB0aGlzIGZpbGUtcmVhZC4gSWYgc28gdGhlbiB3ZSBzdGlsbCBlcnJvciBidXQgYXMgZ3JhY2VmdWxseSBhcyBwb3NzaWJsZS5cbiAgICAgIGxldCBwaWQ6IHN0cmluZztcbiAgICAgIHRyeSB7XG4gICAgICAgIHBpZCA9IHRoaXMuZnMucmVhZEZpbGUodGhpcy5sb2NrRmlsZVBhdGgpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHBpZCA9ICd7dW5rbm93bn0nO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYG5nY2MgaXMgYWxyZWFkeSBydW5uaW5nIGF0IHByb2Nlc3Mgd2l0aCBpZCAke3BpZH0uXFxuYCArXG4gICAgICAgICAgYChJZiB5b3UgYXJlIHN1cmUgbm8gbmdjYyBwcm9jZXNzIGlzIHJ1bm5pbmcgdGhlbiB5b3Ugc2hvdWxkIGRlbGV0ZSB0aGUgbG9ja2ZpbGUgYXQgJHt0aGlzLmxvY2tGaWxlUGF0aH0uKWApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGxvY2sgZmlsZSBmcm9tIGRpc2suXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVtb3ZlKCkge1xuICAgIHRoaXMucmVtb3ZlU2lnbmFsSGFuZGxlcnMoKTtcbiAgICBpZiAodGhpcy5mcy5leGlzdHModGhpcy5sb2NrRmlsZVBhdGgpKSB7XG4gICAgICB0aGlzLmZzLnJlbW92ZUZpbGUodGhpcy5sb2NrRmlsZVBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBhZGRTaWduYWxIYW5kbGVycygpIHtcbiAgICBwcm9jZXNzLm9uY2UoJ1NJR0lOVCcsIHRoaXMuc2lnbmFsSGFuZGxlcik7XG4gICAgcHJvY2Vzcy5vbmNlKCdTSUdIVVAnLCB0aGlzLnNpZ25hbEhhbmRsZXIpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlbW92ZVNpZ25hbEhhbmRsZXJzKCkge1xuICAgIHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIoJ1NJR0lOVCcsIHRoaXMuc2lnbmFsSGFuZGxlcik7XG4gICAgcHJvY2Vzcy5yZW1vdmVMaXN0ZW5lcignU0lHSFVQJywgdGhpcy5zaWduYWxIYW5kbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIGhhbmRsZSBuZWVkcyB0byBiZSBkZWZpbmVkIGFzIGEgcHJvcGVydHkgcmF0aGVyIHRoYW4gYSBtZXRob2RcbiAgICogc28gdGhhdCBpdCBjYW4gYmUgcGFzc2VkIGFyb3VuZCBhcyBhIGJvdW5kIGZ1bmN0aW9uLlxuICAgKi9cbiAgcHJvdGVjdGVkIHNpZ25hbEhhbmRsZXIgPVxuICAgICAgKCkgPT4ge1xuICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLmV4aXQoMSk7XG4gICAgICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgZnVuY3Rpb24gd3JhcHMgYHByb2Nlc3MuZXhpdCgpYCB3aGljaCBtYWtlcyBpdCBlYXNpZXIgdG8gbWFuYWdlIGluIHVuaXQgdGVzdHMsXG4gICAqIHNpbmNlIGl0IGlzIG5vdCBwb3NzaWJsZSB0byBtb2NrIG91dCBgcHJvY2Vzcy5leGl0KClgIHdoZW4gaXQgaXMgY2FsbGVkIGZyb20gc2lnbmFsIGhhbmRsZXJzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGV4aXQoY29kZTogbnVtYmVyKTogdm9pZCB7XG4gICAgcHJvY2Vzcy5leGl0KGNvZGUpO1xuICB9XG59XG4iXX0=