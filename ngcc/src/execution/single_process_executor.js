/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/single_process_executor", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SingleProcessExecutorAsync = exports.SingleProcessExecutorSync = exports.SingleProcessorExecutorBase = void 0;
    var tslib_1 = require("tslib");
    var SingleProcessorExecutorBase = /** @class */ (function () {
        function SingleProcessorExecutorBase(logger, createTaskCompletedCallback) {
            this.logger = logger;
            this.createTaskCompletedCallback = createTaskCompletedCallback;
        }
        SingleProcessorExecutorBase.prototype.doExecute = function (analyzeEntryPoints, createCompileFn) {
            this.logger.debug("Running ngcc on " + this.constructor.name + ".");
            var taskQueue = analyzeEntryPoints();
            var onTaskCompleted = this.createTaskCompletedCallback(taskQueue);
            var compile = createCompileFn(function () { }, onTaskCompleted);
            // Process all tasks.
            this.logger.debug('Processing tasks...');
            var startTime = Date.now();
            while (!taskQueue.allTasksCompleted) {
                var task = taskQueue.getNextTask();
                compile(task);
                taskQueue.markAsCompleted(task);
            }
            var duration = Math.round((Date.now() - startTime) / 1000);
            this.logger.debug("Processed tasks in " + duration + "s.");
        };
        return SingleProcessorExecutorBase;
    }());
    exports.SingleProcessorExecutorBase = SingleProcessorExecutorBase;
    /**
     * An `Executor` that processes all tasks serially and completes synchronously.
     */
    var SingleProcessExecutorSync = /** @class */ (function (_super) {
        tslib_1.__extends(SingleProcessExecutorSync, _super);
        function SingleProcessExecutorSync(logger, lockFile, createTaskCompletedCallback) {
            var _this = _super.call(this, logger, createTaskCompletedCallback) || this;
            _this.lockFile = lockFile;
            return _this;
        }
        SingleProcessExecutorSync.prototype.execute = function (analyzeEntryPoints, createCompileFn) {
            var _this = this;
            this.lockFile.lock(function () { return _this.doExecute(analyzeEntryPoints, createCompileFn); });
        };
        return SingleProcessExecutorSync;
    }(SingleProcessorExecutorBase));
    exports.SingleProcessExecutorSync = SingleProcessExecutorSync;
    /**
     * An `Executor` that processes all tasks serially, but still completes asynchronously.
     */
    var SingleProcessExecutorAsync = /** @class */ (function (_super) {
        tslib_1.__extends(SingleProcessExecutorAsync, _super);
        function SingleProcessExecutorAsync(logger, lockFile, createTaskCompletedCallback) {
            var _this = _super.call(this, logger, createTaskCompletedCallback) || this;
            _this.lockFile = lockFile;
            return _this;
        }
        SingleProcessExecutorAsync.prototype.execute = function (analyzeEntryPoints, createCompileFn) {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.lockFile.lock(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () { return tslib_1.__generator(this, function (_a) {
                                return [2 /*return*/, this.doExecute(analyzeEntryPoints, createCompileFn)];
                            }); }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        return SingleProcessExecutorAsync;
    }(SingleProcessorExecutorBase));
    exports.SingleProcessExecutorAsync = SingleProcessExecutorAsync;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlX3Byb2Nlc3NfZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL3NpbmdsZV9wcm9jZXNzX2V4ZWN1dG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFTSDtRQUNFLHFDQUNZLE1BQWMsRUFBVSwyQkFBd0Q7WUFBaEYsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFVLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFBRyxDQUFDO1FBRWhHLCtDQUFTLEdBQVQsVUFBVSxrQkFBd0MsRUFBRSxlQUFnQztZQUVsRixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxxQkFBbUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQUcsQ0FBQyxDQUFDO1lBRS9ELElBQU0sU0FBUyxHQUFHLGtCQUFrQixFQUFFLENBQUM7WUFDdkMsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3BFLElBQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxjQUFPLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUUzRCxxQkFBcUI7WUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUN6QyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFN0IsT0FBTyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDbkMsSUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRyxDQUFDO2dCQUN0QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2QsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNqQztZQUVELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDN0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0JBQXNCLFFBQVEsT0FBSSxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUNILGtDQUFDO0lBQUQsQ0FBQyxBQXpCRCxJQXlCQztJQXpCcUIsa0VBQTJCO0lBMkJqRDs7T0FFRztJQUNIO1FBQStDLHFEQUEyQjtRQUN4RSxtQ0FDSSxNQUFjLEVBQVUsUUFBb0IsRUFDNUMsMkJBQXdEO1lBRjVELFlBR0Usa0JBQU0sTUFBTSxFQUFFLDJCQUEyQixDQUFDLFNBQzNDO1lBSDJCLGNBQVEsR0FBUixRQUFRLENBQVk7O1FBR2hELENBQUM7UUFDRCwyQ0FBTyxHQUFQLFVBQVEsa0JBQXdDLEVBQUUsZUFBZ0M7WUFBbEYsaUJBRUM7WUFEQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFNLE9BQUEsS0FBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUMsRUFBbkQsQ0FBbUQsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFDSCxnQ0FBQztJQUFELENBQUMsQUFURCxDQUErQywyQkFBMkIsR0FTekU7SUFUWSw4REFBeUI7SUFXdEM7O09BRUc7SUFDSDtRQUFnRCxzREFBMkI7UUFDekUsb0NBQ0ksTUFBYyxFQUFVLFFBQXFCLEVBQzdDLDJCQUF3RDtZQUY1RCxZQUdFLGtCQUFNLE1BQU0sRUFBRSwyQkFBMkIsQ0FBQyxTQUMzQztZQUgyQixjQUFRLEdBQVIsUUFBUSxDQUFhOztRQUdqRCxDQUFDO1FBQ0ssNENBQU8sR0FBYixVQUFjLGtCQUF3QyxFQUFFLGVBQWdDOzs7OztnQ0FFdEYscUJBQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0NBQVksc0JBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUMsRUFBQTtxQ0FBQSxDQUFDLEVBQUE7OzRCQUF6RixTQUF5RixDQUFDOzs7OztTQUMzRjtRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQVZELENBQWdELDJCQUEyQixHQVUxRTtJQVZZLGdFQUEwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBc3luY0xvY2tlcn0gZnJvbSAnLi4vbG9ja2luZy9hc3luY19sb2NrZXInO1xuaW1wb3J0IHtTeW5jTG9ja2VyfSBmcm9tICcuLi9sb2NraW5nL3N5bmNfbG9ja2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5cbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm4sIENyZWF0ZUNvbXBpbGVGbiwgRXhlY3V0b3J9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrfSBmcm9tICcuL3Rhc2tzL2FwaSc7XG5cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTaW5nbGVQcm9jZXNzb3JFeGVjdXRvckJhc2Uge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spIHt9XG5cbiAgZG9FeGVjdXRlKGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4sIGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuKTpcbiAgICAgIHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoYFJ1bm5pbmcgbmdjYyBvbiAke3RoaXMuY29uc3RydWN0b3IubmFtZX0uYCk7XG5cbiAgICBjb25zdCB0YXNrUXVldWUgPSBhbmFseXplRW50cnlQb2ludHMoKTtcbiAgICBjb25zdCBvblRhc2tDb21wbGV0ZWQgPSB0aGlzLmNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayh0YXNrUXVldWUpO1xuICAgIGNvbnN0IGNvbXBpbGUgPSBjcmVhdGVDb21waWxlRm4oKCkgPT4ge30sIG9uVGFza0NvbXBsZXRlZCk7XG5cbiAgICAvLyBQcm9jZXNzIGFsbCB0YXNrcy5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyB0YXNrcy4uLicpO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICB3aGlsZSAoIXRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZCkge1xuICAgICAgY29uc3QgdGFzayA9IHRhc2tRdWV1ZS5nZXROZXh0VGFzaygpITtcbiAgICAgIGNvbXBpbGUodGFzayk7XG4gICAgICB0YXNrUXVldWUubWFya0FzQ29tcGxldGVkKHRhc2spO1xuICAgIH1cblxuICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUHJvY2Vzc2VkIHRhc2tzIGluICR7ZHVyYXRpb259cy5gKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGBFeGVjdXRvcmAgdGhhdCBwcm9jZXNzZXMgYWxsIHRhc2tzIHNlcmlhbGx5IGFuZCBjb21wbGV0ZXMgc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmMgZXh0ZW5kcyBTaW5nbGVQcm9jZXNzb3JFeGVjdXRvckJhc2UgaW1wbGVtZW50cyBFeGVjdXRvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgbG9ja0ZpbGU6IFN5bmNMb2NrZXIsXG4gICAgICBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2s6IENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjaykge1xuICAgIHN1cGVyKGxvZ2dlciwgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcbiAgfVxuICBleGVjdXRlKGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4sIGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuKTogdm9pZCB7XG4gICAgdGhpcy5sb2NrRmlsZS5sb2NrKCgpID0+IHRoaXMuZG9FeGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBgRXhlY3V0b3JgIHRoYXQgcHJvY2Vzc2VzIGFsbCB0YXNrcyBzZXJpYWxseSwgYnV0IHN0aWxsIGNvbXBsZXRlcyBhc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNpbmdsZVByb2Nlc3NFeGVjdXRvckFzeW5jIGV4dGVuZHMgU2luZ2xlUHJvY2Vzc29yRXhlY3V0b3JCYXNlIGltcGxlbWVudHMgRXhlY3V0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIGxvZ2dlcjogTG9nZ2VyLCBwcml2YXRlIGxvY2tGaWxlOiBBc3luY0xvY2tlcixcbiAgICAgIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjazogQ3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKSB7XG4gICAgc3VwZXIobG9nZ2VyLCBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuICB9XG4gIGFzeW5jIGV4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbiwgY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4pOlxuICAgICAgUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2NrRmlsZS5sb2NrKGFzeW5jICgpID0+IHRoaXMuZG9FeGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKSk7XG4gIH1cbn1cbiJdfQ==