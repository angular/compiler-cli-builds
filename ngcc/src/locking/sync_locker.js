(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/locking/sync_locker", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * SyncLocker is used to prevent more than one instance of ngcc executing at the same time,
     * when being called in a synchronous context.
     *
     * * When ngcc starts executing, it creates a file in the `compiler-cli/ngcc` folder.
     * * If it finds one is already there then it fails with a suitable error message.
     * * When ngcc completes executing, it removes the file so that future ngcc executions can start.
     */
    var SyncLocker = /** @class */ (function () {
        function SyncLocker(lockFile) {
            this.lockFile = lockFile;
        }
        /**
         * Run the given function guarded by the lock file.
         *
         * @param fn the function to run.
         * @returns the value returned from the `fn` call.
         */
        SyncLocker.prototype.lock = function (fn) {
            this.create();
            try {
                return fn();
            }
            finally {
                this.lockFile.remove();
            }
        };
        /**
         * Write a lock file to disk, or error if there is already one there.
         */
        SyncLocker.prototype.create = function () {
            try {
                this.lockFile.write();
            }
            catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
                this.handleExistingLockFile();
            }
        };
        /**
         * The lock-file already exists so raise a helpful error.
         */
        SyncLocker.prototype.handleExistingLockFile = function () {
            var pid = this.lockFile.read();
            throw new Error("ngcc is already running at process with id " + pid + ".\n" +
                "If you are running multiple builds in parallel then you should pre-process your node_modules via the command line ngcc tool before starting the builds;\n" +
                "See https://v9.angular.io/guide/ivy#speeding-up-ngcc-compilation.\n" +
                ("(If you are sure no ngcc process is running then you should delete the lock-file at " + this.lockFile.path + ".)"));
        };
        return SyncLocker;
    }());
    exports.SyncLocker = SyncLocker;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luY19sb2NrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvbG9ja2luZy9zeW5jX2xvY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQVVBOzs7Ozs7O09BT0c7SUFDSDtRQUNFLG9CQUFvQixRQUFrQjtZQUFsQixhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQUcsQ0FBQztRQUUxQzs7Ozs7V0FLRztRQUNILHlCQUFJLEdBQUosVUFBUSxFQUFXO1lBQ2pCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNkLElBQUk7Z0JBQ0YsT0FBTyxFQUFFLEVBQUUsQ0FBQzthQUNiO29CQUFTO2dCQUNSLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDeEI7UUFDSCxDQUFDO1FBRUQ7O1dBRUc7UUFDTywyQkFBTSxHQUFoQjtZQUNFLElBQUk7Z0JBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUN2QjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7b0JBQ3ZCLE1BQU0sQ0FBQyxDQUFDO2lCQUNUO2dCQUNELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2FBQy9CO1FBQ0gsQ0FBQztRQUVEOztXQUVHO1FBQ08sMkNBQXNCLEdBQWhDO1lBQ0UsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqQyxNQUFNLElBQUksS0FBSyxDQUNYLGdEQUE4QyxHQUFHLFFBQUs7Z0JBQ3RELDJKQUEySjtnQkFDM0oscUVBQXFFO2lCQUNyRSx5RkFBdUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLE9BQUksQ0FBQSxDQUFDLENBQUM7UUFDckgsQ0FBQztRQUNILGlCQUFDO0lBQUQsQ0FBQyxBQTNDRCxJQTJDQztJQTNDWSxnQ0FBVSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0xvY2tGaWxlfSBmcm9tICcuL2xvY2tfZmlsZSc7XG5cbi8qKlxuICogU3luY0xvY2tlciBpcyB1c2VkIHRvIHByZXZlbnQgbW9yZSB0aGFuIG9uZSBpbnN0YW5jZSBvZiBuZ2NjIGV4ZWN1dGluZyBhdCB0aGUgc2FtZSB0aW1lLFxuICogd2hlbiBiZWluZyBjYWxsZWQgaW4gYSBzeW5jaHJvbm91cyBjb250ZXh0LlxuICpcbiAqICogV2hlbiBuZ2NjIHN0YXJ0cyBleGVjdXRpbmcsIGl0IGNyZWF0ZXMgYSBmaWxlIGluIHRoZSBgY29tcGlsZXItY2xpL25nY2NgIGZvbGRlci5cbiAqICogSWYgaXQgZmluZHMgb25lIGlzIGFscmVhZHkgdGhlcmUgdGhlbiBpdCBmYWlscyB3aXRoIGEgc3VpdGFibGUgZXJyb3IgbWVzc2FnZS5cbiAqICogV2hlbiBuZ2NjIGNvbXBsZXRlcyBleGVjdXRpbmcsIGl0IHJlbW92ZXMgdGhlIGZpbGUgc28gdGhhdCBmdXR1cmUgbmdjYyBleGVjdXRpb25zIGNhbiBzdGFydC5cbiAqL1xuZXhwb3J0IGNsYXNzIFN5bmNMb2NrZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGxvY2tGaWxlOiBMb2NrRmlsZSkge31cblxuICAvKipcbiAgICogUnVuIHRoZSBnaXZlbiBmdW5jdGlvbiBndWFyZGVkIGJ5IHRoZSBsb2NrIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBmbiB0aGUgZnVuY3Rpb24gdG8gcnVuLlxuICAgKiBAcmV0dXJucyB0aGUgdmFsdWUgcmV0dXJuZWQgZnJvbSB0aGUgYGZuYCBjYWxsLlxuICAgKi9cbiAgbG9jazxUPihmbjogKCkgPT4gVCk6IFQge1xuICAgIHRoaXMuY3JlYXRlKCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmbigpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLmxvY2tGaWxlLnJlbW92ZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZSBhIGxvY2sgZmlsZSB0byBkaXNrLCBvciBlcnJvciBpZiB0aGVyZSBpcyBhbHJlYWR5IG9uZSB0aGVyZS5cbiAgICovXG4gIHByb3RlY3RlZCBjcmVhdGUoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMubG9ja0ZpbGUud3JpdGUoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlICE9PSAnRUVYSVNUJykge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgICAgdGhpcy5oYW5kbGVFeGlzdGluZ0xvY2tGaWxlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBsb2NrLWZpbGUgYWxyZWFkeSBleGlzdHMgc28gcmFpc2UgYSBoZWxwZnVsIGVycm9yLlxuICAgKi9cbiAgcHJvdGVjdGVkIGhhbmRsZUV4aXN0aW5nTG9ja0ZpbGUoKTogdm9pZCB7XG4gICAgY29uc3QgcGlkID0gdGhpcy5sb2NrRmlsZS5yZWFkKCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgbmdjYyBpcyBhbHJlYWR5IHJ1bm5pbmcgYXQgcHJvY2VzcyB3aXRoIGlkICR7cGlkfS5cXG5gICtcbiAgICAgICAgYElmIHlvdSBhcmUgcnVubmluZyBtdWx0aXBsZSBidWlsZHMgaW4gcGFyYWxsZWwgdGhlbiB5b3Ugc2hvdWxkIHByZS1wcm9jZXNzIHlvdXIgbm9kZV9tb2R1bGVzIHZpYSB0aGUgY29tbWFuZCBsaW5lIG5nY2MgdG9vbCBiZWZvcmUgc3RhcnRpbmcgdGhlIGJ1aWxkcztcXG5gICtcbiAgICAgICAgYFNlZSBodHRwczovL3Y5LmFuZ3VsYXIuaW8vZ3VpZGUvaXZ5I3NwZWVkaW5nLXVwLW5nY2MtY29tcGlsYXRpb24uXFxuYCArXG4gICAgICAgIGAoSWYgeW91IGFyZSBzdXJlIG5vIG5nY2MgcHJvY2VzcyBpcyBydW5uaW5nIHRoZW4geW91IHNob3VsZCBkZWxldGUgdGhlIGxvY2stZmlsZSBhdCAke3RoaXMubG9ja0ZpbGUucGF0aH0uKWApO1xuICB9XG59XG4iXX0=