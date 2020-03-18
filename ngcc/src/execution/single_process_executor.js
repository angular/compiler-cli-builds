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
            var compile = createCompileFn(onTaskCompleted);
            // Process all tasks.
            this.logger.debug('Processing tasks...');
            var startTime = Date.now();
            while (!taskQueue.allTasksCompleted) {
                var task = taskQueue.getNextTask();
                compile(task);
                taskQueue.markTaskCompleted(task);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlX3Byb2Nlc3NfZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL3NpbmdsZV9wcm9jZXNzX2V4ZWN1dG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQVNIO1FBQ0UscUNBQ1ksTUFBYyxFQUFVLDJCQUF3RDtZQUFoRixXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVUsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQUFHLENBQUM7UUFFaEcsK0NBQVMsR0FBVCxVQUFVLGtCQUF3QyxFQUFFLGVBQWdDO1lBRWxGLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHFCQUFtQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksTUFBRyxDQUFDLENBQUM7WUFFL0QsSUFBTSxTQUFTLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztZQUN2QyxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEUsSUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBRWpELHFCQUFxQjtZQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3pDLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUU3QixPQUFPLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFO2dCQUNuQyxJQUFNLElBQUksR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFJLENBQUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDZCxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbkM7WUFFRCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHdCQUFzQixRQUFRLE9BQUksQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDSCxrQ0FBQztJQUFELENBQUMsQUF6QkQsSUF5QkM7SUF6QnFCLGtFQUEyQjtJQTJCakQ7O09BRUc7SUFDSDtRQUErQyxxREFBMkI7UUFDeEUsbUNBQ0ksTUFBYyxFQUFVLFFBQW9CLEVBQzVDLDJCQUF3RDtZQUY1RCxZQUdFLGtCQUFNLE1BQU0sRUFBRSwyQkFBMkIsQ0FBQyxTQUMzQztZQUgyQixjQUFRLEdBQVIsUUFBUSxDQUFZOztRQUdoRCxDQUFDO1FBQ0QsMkNBQU8sR0FBUCxVQUFRLGtCQUF3QyxFQUFFLGVBQWdDO1lBQWxGLGlCQUVDO1lBREMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLEVBQW5ELENBQW1ELENBQUMsQ0FBQztRQUNoRixDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBVEQsQ0FBK0MsMkJBQTJCLEdBU3pFO0lBVFksOERBQXlCO0lBV3RDOztPQUVHO0lBQ0g7UUFBZ0Qsc0RBQTJCO1FBQ3pFLG9DQUNJLE1BQWMsRUFBVSxRQUFxQixFQUM3QywyQkFBd0Q7WUFGNUQsWUFHRSxrQkFBTSxNQUFNLEVBQUUsMkJBQTJCLENBQUMsU0FDM0M7WUFIMkIsY0FBUSxHQUFSLFFBQVEsQ0FBYTs7UUFHakQsQ0FBQztRQUNLLDRDQUFPLEdBQWIsVUFBYyxrQkFBd0MsRUFBRSxlQUFnQzs7Ozs7Z0NBRXRGLHFCQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO2dDQUFXLHNCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLEVBQUE7cUNBQUEsQ0FBQyxFQUFBOzs0QkFBeEYsU0FBd0YsQ0FBQzs7Ozs7U0FDMUY7UUFDSCxpQ0FBQztJQUFELENBQUMsQUFWRCxDQUFnRCwyQkFBMkIsR0FVMUU7SUFWWSxnRUFBMEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QXN5bmNMb2NrZXJ9IGZyb20gJy4uL2xvY2tpbmcvYXN5bmNfbG9ja2VyJztcbmltcG9ydCB7U3luY0xvY2tlcn0gZnJvbSAnLi4vbG9ja2luZy9zeW5jX2xvY2tlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuXG5pbXBvcnQge0FuYWx5emVFbnRyeVBvaW50c0ZuLCBDcmVhdGVDb21waWxlRm4sIEV4ZWN1dG9yfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0NyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFja30gZnJvbSAnLi90YXNrcy9hcGknO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgU2luZ2xlUHJvY2Vzc29yRXhlY3V0b3JCYXNlIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLCBwcml2YXRlIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjazogQ3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKSB7fVxuXG4gIGRvRXhlY3V0ZShhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuLCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbik6XG4gICAgICB2b2lkfFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBSdW5uaW5nIG5nY2Mgb24gJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9LmApO1xuXG4gICAgY29uc3QgdGFza1F1ZXVlID0gYW5hbHl6ZUVudHJ5UG9pbnRzKCk7XG4gICAgY29uc3Qgb25UYXNrQ29tcGxldGVkID0gdGhpcy5jcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2sodGFza1F1ZXVlKTtcbiAgICBjb25zdCBjb21waWxlID0gY3JlYXRlQ29tcGlsZUZuKG9uVGFza0NvbXBsZXRlZCk7XG5cbiAgICAvLyBQcm9jZXNzIGFsbCB0YXNrcy5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyB0YXNrcy4uLicpO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICB3aGlsZSAoIXRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZCkge1xuICAgICAgY29uc3QgdGFzayA9IHRhc2tRdWV1ZS5nZXROZXh0VGFzaygpICE7XG4gICAgICBjb21waWxlKHRhc2spO1xuICAgICAgdGFza1F1ZXVlLm1hcmtUYXNrQ29tcGxldGVkKHRhc2spO1xuICAgIH1cblxuICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUHJvY2Vzc2VkIHRhc2tzIGluICR7ZHVyYXRpb259cy5gKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGBFeGVjdXRvcmAgdGhhdCBwcm9jZXNzZXMgYWxsIHRhc2tzIHNlcmlhbGx5IGFuZCBjb21wbGV0ZXMgc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmMgZXh0ZW5kcyBTaW5nbGVQcm9jZXNzb3JFeGVjdXRvckJhc2UgaW1wbGVtZW50cyBFeGVjdXRvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgbG9ja0ZpbGU6IFN5bmNMb2NrZXIsXG4gICAgICBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2s6IENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjaykge1xuICAgIHN1cGVyKGxvZ2dlciwgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcbiAgfVxuICBleGVjdXRlKGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4sIGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuKTogdm9pZCB7XG4gICAgdGhpcy5sb2NrRmlsZS5sb2NrKCgpID0+IHRoaXMuZG9FeGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBgRXhlY3V0b3JgIHRoYXQgcHJvY2Vzc2VzIGFsbCB0YXNrcyBzZXJpYWxseSwgYnV0IHN0aWxsIGNvbXBsZXRlcyBhc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNpbmdsZVByb2Nlc3NFeGVjdXRvckFzeW5jIGV4dGVuZHMgU2luZ2xlUHJvY2Vzc29yRXhlY3V0b3JCYXNlIGltcGxlbWVudHMgRXhlY3V0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIGxvZ2dlcjogTG9nZ2VyLCBwcml2YXRlIGxvY2tGaWxlOiBBc3luY0xvY2tlcixcbiAgICAgIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjazogQ3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKSB7XG4gICAgc3VwZXIobG9nZ2VyLCBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuICB9XG4gIGFzeW5jIGV4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbiwgY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4pOlxuICAgICAgUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2NrRmlsZS5sb2NrKGFzeW5jKCkgPT4gdGhpcy5kb0V4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzLCBjcmVhdGVDb21waWxlRm4pKTtcbiAgfVxufVxuIl19