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
        define("@angular/compiler-cli/ngcc/src/execution/single_process_executor", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/execution/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/utils");
    var SingleProcessorExecutorBase = /** @class */ (function () {
        function SingleProcessorExecutorBase(logger, pkgJsonUpdater) {
            this.logger = logger;
            this.pkgJsonUpdater = pkgJsonUpdater;
        }
        SingleProcessorExecutorBase.prototype.doExecute = function (analyzeEntryPoints, createCompileFn) {
            var _this = this;
            this.logger.debug("Running ngcc on " + this.constructor.name + ".");
            var taskQueue = analyzeEntryPoints();
            var compile = createCompileFn(function (task, outcome) { return utils_1.onTaskCompleted(_this.pkgJsonUpdater, task, outcome); });
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
        function SingleProcessExecutorSync(logger, pkgJsonUpdater, lockfile) {
            var _this = _super.call(this, logger, pkgJsonUpdater) || this;
            _this.lockfile = lockfile;
            return _this;
        }
        SingleProcessExecutorSync.prototype.execute = function (analyzeEntryPoints, createCompileFn) {
            var _this = this;
            this.lockfile.lock(function () { return _this.doExecute(analyzeEntryPoints, createCompileFn); });
        };
        return SingleProcessExecutorSync;
    }(SingleProcessorExecutorBase));
    exports.SingleProcessExecutorSync = SingleProcessExecutorSync;
    /**
     * An `Executor` that processes all tasks serially, but still completes asynchronously.
     */
    var SingleProcessExecutorAsync = /** @class */ (function (_super) {
        tslib_1.__extends(SingleProcessExecutorAsync, _super);
        function SingleProcessExecutorAsync(logger, pkgJsonUpdater, lockfile) {
            var _this = _super.call(this, logger, pkgJsonUpdater) || this;
            _this.lockfile = lockfile;
            return _this;
        }
        SingleProcessExecutorAsync.prototype.execute = function (analyzeEntryPoints, createCompileFn) {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.lockfile.lock(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () { return tslib_1.__generator(this, function (_a) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlX3Byb2Nlc3NfZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL3NpbmdsZV9wcm9jZXNzX2V4ZWN1dG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQU9ILHdFQUF3QztJQUV4QztRQUNFLHFDQUFvQixNQUFjLEVBQVUsY0FBa0M7WUFBMUQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtRQUFHLENBQUM7UUFFbEYsK0NBQVMsR0FBVCxVQUFVLGtCQUF3QyxFQUFFLGVBQWdDO1lBQXBGLGlCQW9CQztZQWxCQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxxQkFBbUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQUcsQ0FBQyxDQUFDO1lBRS9ELElBQU0sU0FBUyxHQUFHLGtCQUFrQixFQUFFLENBQUM7WUFDdkMsSUFBTSxPQUFPLEdBQ1QsZUFBZSxDQUFDLFVBQUMsSUFBSSxFQUFFLE9BQU8sSUFBSyxPQUFBLHVCQUFlLENBQUMsS0FBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQW5ELENBQW1ELENBQUMsQ0FBQztZQUU1RixxQkFBcUI7WUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUN6QyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFN0IsT0FBTyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDbkMsSUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBSSxDQUFDO2dCQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2QsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ25DO1lBRUQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBc0IsUUFBUSxPQUFJLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBQ0gsa0NBQUM7SUFBRCxDQUFDLEFBeEJELElBd0JDO0lBeEJxQixrRUFBMkI7SUEwQmpEOztPQUVHO0lBQ0g7UUFBK0MscURBQTJCO1FBQ3hFLG1DQUFZLE1BQWMsRUFBRSxjQUFrQyxFQUFVLFFBQXNCO1lBQTlGLFlBQ0Usa0JBQU0sTUFBTSxFQUFFLGNBQWMsQ0FBQyxTQUM5QjtZQUZ1RSxjQUFRLEdBQVIsUUFBUSxDQUFjOztRQUU5RixDQUFDO1FBQ0QsMkNBQU8sR0FBUCxVQUFRLGtCQUF3QyxFQUFFLGVBQWdDO1lBQWxGLGlCQUVDO1lBREMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLEVBQW5ELENBQW1ELENBQUMsQ0FBQztRQUNoRixDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBUEQsQ0FBK0MsMkJBQTJCLEdBT3pFO0lBUFksOERBQXlCO0lBU3RDOztPQUVHO0lBQ0g7UUFBZ0Qsc0RBQTJCO1FBQ3pFLG9DQUFZLE1BQWMsRUFBRSxjQUFrQyxFQUFVLFFBQXVCO1lBQS9GLFlBQ0Usa0JBQU0sTUFBTSxFQUFFLGNBQWMsQ0FBQyxTQUM5QjtZQUZ1RSxjQUFRLEdBQVIsUUFBUSxDQUFlOztRQUUvRixDQUFDO1FBQ0ssNENBQU8sR0FBYixVQUFjLGtCQUF3QyxFQUFFLGVBQWdDOzs7OztnQ0FFdEYscUJBQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0NBQVcsc0JBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUMsRUFBQTtxQ0FBQSxDQUFDLEVBQUE7OzRCQUF4RixTQUF3RixDQUFDOzs7OztTQUMxRjtRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQVJELENBQWdELDJCQUEyQixHQVExRTtJQVJZLGdFQUEwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7UGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcblxuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbiwgQ3JlYXRlQ29tcGlsZUZuLCBFeGVjdXRvcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtMb2NrRmlsZUFzeW5jLCBMb2NrRmlsZVN5bmN9IGZyb20gJy4vbG9ja19maWxlJztcbmltcG9ydCB7b25UYXNrQ29tcGxldGVkfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNpbmdsZVByb2Nlc3NvckV4ZWN1dG9yQmFzZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcikge31cblxuICBkb0V4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbiwgY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4pOlxuICAgICAgdm9pZHxQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUnVubmluZyBuZ2NjIG9uICR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfS5gKTtcblxuICAgIGNvbnN0IHRhc2tRdWV1ZSA9IGFuYWx5emVFbnRyeVBvaW50cygpO1xuICAgIGNvbnN0IGNvbXBpbGUgPVxuICAgICAgICBjcmVhdGVDb21waWxlRm4oKHRhc2ssIG91dGNvbWUpID0+IG9uVGFza0NvbXBsZXRlZCh0aGlzLnBrZ0pzb25VcGRhdGVyLCB0YXNrLCBvdXRjb21lKSk7XG5cbiAgICAvLyBQcm9jZXNzIGFsbCB0YXNrcy5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyB0YXNrcy4uLicpO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICB3aGlsZSAoIXRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZCkge1xuICAgICAgY29uc3QgdGFzayA9IHRhc2tRdWV1ZS5nZXROZXh0VGFzaygpICE7XG4gICAgICBjb21waWxlKHRhc2spO1xuICAgICAgdGFza1F1ZXVlLm1hcmtUYXNrQ29tcGxldGVkKHRhc2spO1xuICAgIH1cblxuICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUHJvY2Vzc2VkIHRhc2tzIGluICR7ZHVyYXRpb259cy5gKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGBFeGVjdXRvcmAgdGhhdCBwcm9jZXNzZXMgYWxsIHRhc2tzIHNlcmlhbGx5IGFuZCBjb21wbGV0ZXMgc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmMgZXh0ZW5kcyBTaW5nbGVQcm9jZXNzb3JFeGVjdXRvckJhc2UgaW1wbGVtZW50cyBFeGVjdXRvciB7XG4gIGNvbnN0cnVjdG9yKGxvZ2dlcjogTG9nZ2VyLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBwcml2YXRlIGxvY2tmaWxlOiBMb2NrRmlsZVN5bmMpIHtcbiAgICBzdXBlcihsb2dnZXIsIHBrZ0pzb25VcGRhdGVyKTtcbiAgfVxuICBleGVjdXRlKGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4sIGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuKTogdm9pZCB7XG4gICAgdGhpcy5sb2NrZmlsZS5sb2NrKCgpID0+IHRoaXMuZG9FeGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBbiBgRXhlY3V0b3JgIHRoYXQgcHJvY2Vzc2VzIGFsbCB0YXNrcyBzZXJpYWxseSwgYnV0IHN0aWxsIGNvbXBsZXRlcyBhc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNpbmdsZVByb2Nlc3NFeGVjdXRvckFzeW5jIGV4dGVuZHMgU2luZ2xlUHJvY2Vzc29yRXhlY3V0b3JCYXNlIGltcGxlbWVudHMgRXhlY3V0b3Ige1xuICBjb25zdHJ1Y3Rvcihsb2dnZXI6IExvZ2dlciwgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgcHJpdmF0ZSBsb2NrZmlsZTogTG9ja0ZpbGVBc3luYykge1xuICAgIHN1cGVyKGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIpO1xuICB9XG4gIGFzeW5jIGV4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbiwgY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4pOlxuICAgICAgUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2NrZmlsZS5sb2NrKGFzeW5jKCkgPT4gdGhpcy5kb0V4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzLCBjcmVhdGVDb21waWxlRm4pKTtcbiAgfVxufVxuIl19