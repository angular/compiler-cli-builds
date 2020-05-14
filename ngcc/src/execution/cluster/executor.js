(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/cluster/executor", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/execution/cluster/master"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ClusterExecutor = void 0;
    var tslib_1 = require("tslib");
    var master_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/master");
    /**
     * An `Executor` that processes tasks in parallel (on multiple processes) and completes
     * asynchronously.
     */
    var ClusterExecutor = /** @class */ (function () {
        function ClusterExecutor(workerCount, fileSystem, logger, fileWriter, pkgJsonUpdater, lockFile, createTaskCompletedCallback) {
            this.workerCount = workerCount;
            this.fileSystem = fileSystem;
            this.logger = logger;
            this.fileWriter = fileWriter;
            this.pkgJsonUpdater = pkgJsonUpdater;
            this.lockFile = lockFile;
            this.createTaskCompletedCallback = createTaskCompletedCallback;
        }
        ClusterExecutor.prototype.execute = function (analyzeEntryPoints, _createCompileFn) {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    return [2 /*return*/, this.lockFile.lock(function () {
                            _this.logger.debug("Running ngcc on " + _this.constructor.name + " (using " + _this.workerCount + " worker processes).");
                            var master = new master_1.ClusterMaster(_this.workerCount, _this.fileSystem, _this.logger, _this.fileWriter, _this.pkgJsonUpdater, analyzeEntryPoints, _this.createTaskCompletedCallback);
                            return master.run();
                        })];
                });
            });
        };
        return ClusterExecutor;
    }());
    exports.ClusterExecutor = ClusterExecutor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQWVBLGtGQUF1QztJQUV2Qzs7O09BR0c7SUFDSDtRQUNFLHlCQUNZLFdBQW1CLEVBQVUsVUFBc0IsRUFBVSxNQUFjLEVBQzNFLFVBQXNCLEVBQVUsY0FBa0MsRUFDbEUsUUFBcUIsRUFDckIsMkJBQXdEO1lBSHhELGdCQUFXLEdBQVgsV0FBVyxDQUFRO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDM0UsZUFBVSxHQUFWLFVBQVUsQ0FBWTtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUNsRSxhQUFRLEdBQVIsUUFBUSxDQUFhO1lBQ3JCLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFBRyxDQUFDO1FBRWxFLGlDQUFPLEdBQWIsVUFBYyxrQkFBd0MsRUFBRSxnQkFBaUM7Ozs7b0JBRXZGLHNCQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDOzRCQUN4QixLQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDYixxQkFBbUIsS0FBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGdCQUFXLEtBQUksQ0FBQyxXQUFXLHdCQUFxQixDQUFDLENBQUM7NEJBQzlGLElBQU0sTUFBTSxHQUFHLElBQUksc0JBQWEsQ0FDNUIsS0FBSSxDQUFDLFdBQVcsRUFBRSxLQUFJLENBQUMsVUFBVSxFQUFFLEtBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSSxDQUFDLFVBQVUsRUFBRSxLQUFJLENBQUMsY0FBYyxFQUNwRixrQkFBa0IsRUFBRSxLQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQzs0QkFDMUQsT0FBTyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQ3RCLENBQUMsQ0FBQyxFQUFDOzs7U0FDSjtRQUNILHNCQUFDO0lBQUQsQ0FBQyxBQWxCRCxJQWtCQztJQWxCWSwwQ0FBZSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QXN5bmNMb2NrZXJ9IGZyb20gJy4uLy4uL2xvY2tpbmcvYXN5bmNfbG9ja2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4uLy4uL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4uLy4uL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbiwgQ3JlYXRlQ29tcGlsZUZuLCBFeGVjdXRvcn0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7Q3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrfSBmcm9tICcuLi90YXNrcy9hcGknO1xuXG5pbXBvcnQge0NsdXN0ZXJNYXN0ZXJ9IGZyb20gJy4vbWFzdGVyJztcblxuLyoqXG4gKiBBbiBgRXhlY3V0b3JgIHRoYXQgcHJvY2Vzc2VzIHRhc2tzIGluIHBhcmFsbGVsIChvbiBtdWx0aXBsZSBwcm9jZXNzZXMpIGFuZCBjb21wbGV0ZXNcbiAqIGFzeW5jaHJvbm91c2x5LlxuICovXG5leHBvcnQgY2xhc3MgQ2x1c3RlckV4ZWN1dG9yIGltcGxlbWVudHMgRXhlY3V0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgd29ya2VyQ291bnQ6IG51bWJlciwgcHJpdmF0ZSBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSBmaWxlV3JpdGVyOiBGaWxlV3JpdGVyLCBwcml2YXRlIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsXG4gICAgICBwcml2YXRlIGxvY2tGaWxlOiBBc3luY0xvY2tlcixcbiAgICAgIHByaXZhdGUgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spIHt9XG5cbiAgYXN5bmMgZXhlY3V0ZShhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuLCBfY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4pOlxuICAgICAgUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMubG9ja0ZpbGUubG9jaygoKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgICBgUnVubmluZyBuZ2NjIG9uICR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSAodXNpbmcgJHt0aGlzLndvcmtlckNvdW50fSB3b3JrZXIgcHJvY2Vzc2VzKS5gKTtcbiAgICAgIGNvbnN0IG1hc3RlciA9IG5ldyBDbHVzdGVyTWFzdGVyKFxuICAgICAgICAgIHRoaXMud29ya2VyQ291bnQsIHRoaXMuZmlsZVN5c3RlbSwgdGhpcy5sb2dnZXIsIHRoaXMuZmlsZVdyaXRlciwgdGhpcy5wa2dKc29uVXBkYXRlcixcbiAgICAgICAgICBhbmFseXplRW50cnlQb2ludHMsIHRoaXMuY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcbiAgICAgIHJldHVybiBtYXN0ZXIucnVuKCk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==