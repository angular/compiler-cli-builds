(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/util", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.removeLockFile = void 0;
    /**
     * Remove the lock-file at the provided `lockFilePath` from the given file-system.
     *
     * It only removes the file if the pid stored in the file matches the provided `pid`.
     * The provided `pid` is of the process that is exiting and so no longer needs to hold the lock.
     */
    function removeLockFile(fs, logger, lockFilePath, pid) {
        try {
            logger.debug("Attempting to remove lock-file at " + lockFilePath + ".");
            var lockFilePid = fs.readFile(lockFilePath);
            if (lockFilePid === pid) {
                logger.debug("PIDs match (" + pid + "), so removing " + lockFilePath + ".");
                fs.removeFile(lockFilePath);
            }
            else {
                logger.debug("PIDs do not match (" + pid + " and " + lockFilePid + "), so not removing " + lockFilePath + ".");
            }
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                logger.debug("The lock-file at " + lockFilePath + " was already removed.");
                // File already removed so quietly exit
            }
            else {
                throw e;
            }
        }
    }
    exports.removeLockFile = removeLockFile;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9sb2NraW5nL2xvY2tfZmlsZV93aXRoX2NoaWxkX3Byb2Nlc3MvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFVQTs7Ozs7T0FLRztJQUNILFNBQWdCLGNBQWMsQ0FDMUIsRUFBYyxFQUFFLE1BQWMsRUFBRSxZQUE0QixFQUFFLEdBQVc7UUFDM0UsSUFBSTtZQUNGLE1BQU0sQ0FBQyxLQUFLLENBQUMsdUNBQXFDLFlBQVksTUFBRyxDQUFDLENBQUM7WUFDbkUsSUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM5QyxJQUFJLFdBQVcsS0FBSyxHQUFHLEVBQUU7Z0JBQ3ZCLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWUsR0FBRyx1QkFBa0IsWUFBWSxNQUFHLENBQUMsQ0FBQztnQkFDbEUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUM3QjtpQkFBTTtnQkFDTCxNQUFNLENBQUMsS0FBSyxDQUNSLHdCQUFzQixHQUFHLGFBQVEsV0FBVywyQkFBc0IsWUFBWSxNQUFHLENBQUMsQ0FBQzthQUN4RjtTQUNGO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO2dCQUN2QixNQUFNLENBQUMsS0FBSyxDQUFDLHNCQUFvQixZQUFZLDBCQUF1QixDQUFDLENBQUM7Z0JBQ3RFLHVDQUF1QzthQUN4QztpQkFBTTtnQkFDTCxNQUFNLENBQUMsQ0FBQzthQUNUO1NBQ0Y7SUFDSCxDQUFDO0lBcEJELHdDQW9CQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vbG9nZ2luZy9sb2dnZXInO1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgbG9jay1maWxlIGF0IHRoZSBwcm92aWRlZCBgbG9ja0ZpbGVQYXRoYCBmcm9tIHRoZSBnaXZlbiBmaWxlLXN5c3RlbS5cbiAqXG4gKiBJdCBvbmx5IHJlbW92ZXMgdGhlIGZpbGUgaWYgdGhlIHBpZCBzdG9yZWQgaW4gdGhlIGZpbGUgbWF0Y2hlcyB0aGUgcHJvdmlkZWQgYHBpZGAuXG4gKiBUaGUgcHJvdmlkZWQgYHBpZGAgaXMgb2YgdGhlIHByb2Nlc3MgdGhhdCBpcyBleGl0aW5nIGFuZCBzbyBubyBsb25nZXIgbmVlZHMgdG8gaG9sZCB0aGUgbG9jay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUxvY2tGaWxlKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgbG9ja0ZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcGlkOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBsb2dnZXIuZGVidWcoYEF0dGVtcHRpbmcgdG8gcmVtb3ZlIGxvY2stZmlsZSBhdCAke2xvY2tGaWxlUGF0aH0uYCk7XG4gICAgY29uc3QgbG9ja0ZpbGVQaWQgPSBmcy5yZWFkRmlsZShsb2NrRmlsZVBhdGgpO1xuICAgIGlmIChsb2NrRmlsZVBpZCA9PT0gcGlkKSB7XG4gICAgICBsb2dnZXIuZGVidWcoYFBJRHMgbWF0Y2ggKCR7cGlkfSksIHNvIHJlbW92aW5nICR7bG9ja0ZpbGVQYXRofS5gKTtcbiAgICAgIGZzLnJlbW92ZUZpbGUobG9ja0ZpbGVQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICAgIGBQSURzIGRvIG5vdCBtYXRjaCAoJHtwaWR9IGFuZCAke2xvY2tGaWxlUGlkfSksIHNvIG5vdCByZW1vdmluZyAke2xvY2tGaWxlUGF0aH0uYCk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgVGhlIGxvY2stZmlsZSBhdCAke2xvY2tGaWxlUGF0aH0gd2FzIGFscmVhZHkgcmVtb3ZlZC5gKTtcbiAgICAgIC8vIEZpbGUgYWxyZWFkeSByZW1vdmVkIHNvIHF1aWV0bHkgZXhpdFxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxufVxuIl19