(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/locking/lock_file_with_signal_handlers", ["require", "exports", "process", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/locking/lock_file"], factory);
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
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var lock_file_1 = require("@angular/compiler-cli/ngcc/src/locking/lock_file");
    var LockFileWithSignalHandlers = /** @class */ (function () {
        function LockFileWithSignalHandlers(fs) {
            var _this = this;
            this.fs = fs;
            this.path = lock_file_1.getLockFilePath(this.fs);
            /**
             * This handler needs to be defined as a property rather than a method
             * so that it can be passed around as a bound function.
             */
            this.signalHandler = function () {
                _this.remove();
                _this.exit(1);
            };
        }
        LockFileWithSignalHandlers.prototype.write = function () {
            try {
                this.addSignalHandlers();
                // To avoid race conditions, we check for existence of the lock-file by actually trying to
                // create it exclusively.
                return this.fs.writeFile(this.path, process.pid.toString(), /* exclusive */ true);
            }
            catch (e) {
                this.removeSignalHandlers();
                throw e;
            }
        };
        LockFileWithSignalHandlers.prototype.read = function () {
            try {
                if (this.fs instanceof file_system_1.CachedFileSystem) {
                    // This file is "volatile", it might be changed by an external process,
                    // so we cannot rely upon the cached value when reading it.
                    this.fs.invalidateCaches(this.path);
                }
                return this.fs.readFile(this.path);
            }
            catch (_a) {
                return '{unknown}';
            }
        };
        LockFileWithSignalHandlers.prototype.remove = function () {
            this.removeSignalHandlers();
            if (this.fs.exists(this.path)) {
                this.fs.removeFile(this.path);
            }
        };
        /**
         * Capture CTRL-C and terminal closing events.
         * When these occur we remove the lock-file and exit.
         */
        LockFileWithSignalHandlers.prototype.addSignalHandlers = function () {
            process.addListener('SIGINT', this.signalHandler);
            process.addListener('SIGHUP', this.signalHandler);
        };
        /**
         * Clear the event handlers to prevent leakage.
         */
        LockFileWithSignalHandlers.prototype.removeSignalHandlers = function () {
            process.removeListener('SIGINT', this.signalHandler);
            process.removeListener('SIGHUP', this.signalHandler);
        };
        /**
         * This function wraps `process.exit()` which makes it easier to manage in unit tests,
         * since it is not possible to mock out `process.exit()` when it is called from signal handlers.
         */
        LockFileWithSignalHandlers.prototype.exit = function (code) {
            process.exit(code);
        };
        return LockFileWithSignalHandlers;
    }());
    exports.LockFileWithSignalHandlers = LockFileWithSignalHandlers;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9ja19maWxlX3dpdGhfc2lnbmFsX2hhbmRsZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2xvY2tpbmcvbG9ja19maWxlX3dpdGhfc2lnbmFsX2hhbmRsZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaUNBQW1DO0lBQ25DLDJFQUE0RTtJQUM1RSw4RUFBc0Q7SUFFdEQ7UUFDRSxvQ0FBc0IsRUFBYztZQUFwQyxpQkFBd0M7WUFBbEIsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUVwQyxTQUFJLEdBQUcsMkJBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFtRGhDOzs7ZUFHRztZQUNPLGtCQUFhLEdBQ25CO2dCQUNFLEtBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDZCxLQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2YsQ0FBQyxDQUFBO1FBN0RrQyxDQUFDO1FBSXhDLDBDQUFLLEdBQUw7WUFDRSxJQUFJO2dCQUNGLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUN6QiwwRkFBMEY7Z0JBQzFGLHlCQUF5QjtnQkFDekIsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ25GO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQzVCLE1BQU0sQ0FBQyxDQUFDO2FBQ1Q7UUFDSCxDQUFDO1FBRUQseUNBQUksR0FBSjtZQUNFLElBQUk7Z0JBQ0YsSUFBSSxJQUFJLENBQUMsRUFBRSxZQUFZLDhCQUFnQixFQUFFO29CQUN2Qyx1RUFBdUU7b0JBQ3ZFLDJEQUEyRDtvQkFDM0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3JDO2dCQUNELE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3BDO1lBQUMsV0FBTTtnQkFDTixPQUFPLFdBQVcsQ0FBQzthQUNwQjtRQUNILENBQUM7UUFFRCwyQ0FBTSxHQUFOO1lBQ0UsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDNUIsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMvQjtRQUNILENBQUM7UUFFRDs7O1dBR0c7UUFDTyxzREFBaUIsR0FBM0I7WUFDRSxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDbEQsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRDs7V0FFRztRQUNPLHlEQUFvQixHQUE5QjtZQUNFLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNyRCxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQVlEOzs7V0FHRztRQUNPLHlDQUFJLEdBQWQsVUFBZSxJQUFZO1lBQ3pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsQ0FBQztRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQXZFRCxJQXVFQztJQXZFWSxnRUFBMEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBwcm9jZXNzIGZyb20gJ3Byb2Nlc3MnO1xuaW1wb3J0IHtDYWNoZWRGaWxlU3lzdGVtLCBGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2NrRmlsZSwgZ2V0TG9ja0ZpbGVQYXRofSBmcm9tICcuL2xvY2tfZmlsZSc7XG5cbmV4cG9ydCBjbGFzcyBMb2NrRmlsZVdpdGhTaWduYWxIYW5kbGVycyBpbXBsZW1lbnRzIExvY2tGaWxlIHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIGZzOiBGaWxlU3lzdGVtKSB7fVxuXG4gIHBhdGggPSBnZXRMb2NrRmlsZVBhdGgodGhpcy5mcyk7XG5cbiAgd3JpdGUoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuYWRkU2lnbmFsSGFuZGxlcnMoKTtcbiAgICAgIC8vIFRvIGF2b2lkIHJhY2UgY29uZGl0aW9ucywgd2UgY2hlY2sgZm9yIGV4aXN0ZW5jZSBvZiB0aGUgbG9jay1maWxlIGJ5IGFjdHVhbGx5IHRyeWluZyB0b1xuICAgICAgLy8gY3JlYXRlIGl0IGV4Y2x1c2l2ZWx5LlxuICAgICAgcmV0dXJuIHRoaXMuZnMud3JpdGVGaWxlKHRoaXMucGF0aCwgcHJvY2Vzcy5waWQudG9TdHJpbmcoKSwgLyogZXhjbHVzaXZlICovIHRydWUpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMucmVtb3ZlU2lnbmFsSGFuZGxlcnMoKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgcmVhZCgpOiBzdHJpbmcge1xuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy5mcyBpbnN0YW5jZW9mIENhY2hlZEZpbGVTeXN0ZW0pIHtcbiAgICAgICAgLy8gVGhpcyBmaWxlIGlzIFwidm9sYXRpbGVcIiwgaXQgbWlnaHQgYmUgY2hhbmdlZCBieSBhbiBleHRlcm5hbCBwcm9jZXNzLFxuICAgICAgICAvLyBzbyB3ZSBjYW5ub3QgcmVseSB1cG9uIHRoZSBjYWNoZWQgdmFsdWUgd2hlbiByZWFkaW5nIGl0LlxuICAgICAgICB0aGlzLmZzLmludmFsaWRhdGVDYWNoZXModGhpcy5wYXRoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmZzLnJlYWRGaWxlKHRoaXMucGF0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gJ3t1bmtub3dufSc7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlKCkge1xuICAgIHRoaXMucmVtb3ZlU2lnbmFsSGFuZGxlcnMoKTtcbiAgICBpZiAodGhpcy5mcy5leGlzdHModGhpcy5wYXRoKSkge1xuICAgICAgdGhpcy5mcy5yZW1vdmVGaWxlKHRoaXMucGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhcHR1cmUgQ1RSTC1DIGFuZCB0ZXJtaW5hbCBjbG9zaW5nIGV2ZW50cy5cbiAgICogV2hlbiB0aGVzZSBvY2N1ciB3ZSByZW1vdmUgdGhlIGxvY2stZmlsZSBhbmQgZXhpdC5cbiAgICovXG4gIHByb3RlY3RlZCBhZGRTaWduYWxIYW5kbGVycygpIHtcbiAgICBwcm9jZXNzLmFkZExpc3RlbmVyKCdTSUdJTlQnLCB0aGlzLnNpZ25hbEhhbmRsZXIpO1xuICAgIHByb2Nlc3MuYWRkTGlzdGVuZXIoJ1NJR0hVUCcsIHRoaXMuc2lnbmFsSGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXIgdGhlIGV2ZW50IGhhbmRsZXJzIHRvIHByZXZlbnQgbGVha2FnZS5cbiAgICovXG4gIHByb3RlY3RlZCByZW1vdmVTaWduYWxIYW5kbGVycygpIHtcbiAgICBwcm9jZXNzLnJlbW92ZUxpc3RlbmVyKCdTSUdJTlQnLCB0aGlzLnNpZ25hbEhhbmRsZXIpO1xuICAgIHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIoJ1NJR0hVUCcsIHRoaXMuc2lnbmFsSGFuZGxlcik7XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBoYW5kbGVyIG5lZWRzIHRvIGJlIGRlZmluZWQgYXMgYSBwcm9wZXJ0eSByYXRoZXIgdGhhbiBhIG1ldGhvZFxuICAgKiBzbyB0aGF0IGl0IGNhbiBiZSBwYXNzZWQgYXJvdW5kIGFzIGEgYm91bmQgZnVuY3Rpb24uXG4gICAqL1xuICBwcm90ZWN0ZWQgc2lnbmFsSGFuZGxlciA9XG4gICAgICAoKSA9PiB7XG4gICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMuZXhpdCgxKTtcbiAgICAgIH1cblxuICAvKipcbiAgICogVGhpcyBmdW5jdGlvbiB3cmFwcyBgcHJvY2Vzcy5leGl0KClgIHdoaWNoIG1ha2VzIGl0IGVhc2llciB0byBtYW5hZ2UgaW4gdW5pdCB0ZXN0cyxcbiAgICogc2luY2UgaXQgaXMgbm90IHBvc3NpYmxlIHRvIG1vY2sgb3V0IGBwcm9jZXNzLmV4aXQoKWAgd2hlbiBpdCBpcyBjYWxsZWQgZnJvbSBzaWduYWwgaGFuZGxlcnMuXG4gICAqL1xuICBwcm90ZWN0ZWQgZXhpdChjb2RlOiBudW1iZXIpOiB2b2lkIHtcbiAgICBwcm9jZXNzLmV4aXQoY29kZSk7XG4gIH1cbn1cbiJdfQ==