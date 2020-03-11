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
        function SingleProcessExecutorSync(logger, pkgJsonUpdater, lockFile) {
            var _this = _super.call(this, logger, pkgJsonUpdater) || this;
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
        function SingleProcessExecutorAsync(logger, pkgJsonUpdater, lockFile) {
            var _this = _super.call(this, logger, pkgJsonUpdater) || this;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlX3Byb2Nlc3NfZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL3NpbmdsZV9wcm9jZXNzX2V4ZWN1dG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQU9ILHdFQUF3QztJQUV4QztRQUNFLHFDQUFvQixNQUFjLEVBQVUsY0FBa0M7WUFBMUQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtRQUFHLENBQUM7UUFFbEYsK0NBQVMsR0FBVCxVQUFVLGtCQUF3QyxFQUFFLGVBQWdDO1lBQXBGLGlCQW9CQztZQWxCQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxxQkFBbUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQUcsQ0FBQyxDQUFDO1lBRS9ELElBQU0sU0FBUyxHQUFHLGtCQUFrQixFQUFFLENBQUM7WUFDdkMsSUFBTSxPQUFPLEdBQ1QsZUFBZSxDQUFDLFVBQUMsSUFBSSxFQUFFLE9BQU8sSUFBSyxPQUFBLHVCQUFlLENBQUMsS0FBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQW5ELENBQW1ELENBQUMsQ0FBQztZQUU1RixxQkFBcUI7WUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUN6QyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFFN0IsT0FBTyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDbkMsSUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBSSxDQUFDO2dCQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2QsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ25DO1lBRUQsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBc0IsUUFBUSxPQUFJLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBQ0gsa0NBQUM7SUFBRCxDQUFDLEFBeEJELElBd0JDO0lBeEJxQixrRUFBMkI7SUEwQmpEOztPQUVHO0lBQ0g7UUFBK0MscURBQTJCO1FBQ3hFLG1DQUFZLE1BQWMsRUFBRSxjQUFrQyxFQUFVLFFBQW9CO1lBQTVGLFlBQ0Usa0JBQU0sTUFBTSxFQUFFLGNBQWMsQ0FBQyxTQUM5QjtZQUZ1RSxjQUFRLEdBQVIsUUFBUSxDQUFZOztRQUU1RixDQUFDO1FBQ0QsMkNBQU8sR0FBUCxVQUFRLGtCQUF3QyxFQUFFLGVBQWdDO1lBQWxGLGlCQUVDO1lBREMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBTSxPQUFBLEtBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLEVBQW5ELENBQW1ELENBQUMsQ0FBQztRQUNoRixDQUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBUEQsQ0FBK0MsMkJBQTJCLEdBT3pFO0lBUFksOERBQXlCO0lBU3RDOztPQUVHO0lBQ0g7UUFBZ0Qsc0RBQTJCO1FBQ3pFLG9DQUFZLE1BQWMsRUFBRSxjQUFrQyxFQUFVLFFBQW9CO1lBQTVGLFlBQ0Usa0JBQU0sTUFBTSxFQUFFLGNBQWMsQ0FBQyxTQUM5QjtZQUZ1RSxjQUFRLEdBQVIsUUFBUSxDQUFZOztRQUU1RixDQUFDO1FBQ0ssNENBQU8sR0FBYixVQUFjLGtCQUF3QyxFQUFFLGVBQWdDOzs7OztnQ0FFdEYscUJBQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0NBQVcsc0JBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUMsRUFBQTtxQ0FBQSxDQUFDLEVBQUE7OzRCQUF4RixTQUF3RixDQUFDOzs7OztTQUMxRjtRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQVJELENBQWdELDJCQUEyQixHQVExRTtJQVJZLGdFQUEwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtTeW5jTG9ja2VyfSBmcm9tICcuLi9sb2NraW5nL3N5bmNfbG9ja2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5cbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm4sIENyZWF0ZUNvbXBpbGVGbiwgRXhlY3V0b3J9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7b25UYXNrQ29tcGxldGVkfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNpbmdsZVByb2Nlc3NvckV4ZWN1dG9yQmFzZSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcikge31cblxuICBkb0V4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbiwgY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4pOlxuICAgICAgdm9pZHxQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUnVubmluZyBuZ2NjIG9uICR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfS5gKTtcblxuICAgIGNvbnN0IHRhc2tRdWV1ZSA9IGFuYWx5emVFbnRyeVBvaW50cygpO1xuICAgIGNvbnN0IGNvbXBpbGUgPVxuICAgICAgICBjcmVhdGVDb21waWxlRm4oKHRhc2ssIG91dGNvbWUpID0+IG9uVGFza0NvbXBsZXRlZCh0aGlzLnBrZ0pzb25VcGRhdGVyLCB0YXNrLCBvdXRjb21lKSk7XG5cbiAgICAvLyBQcm9jZXNzIGFsbCB0YXNrcy5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyB0YXNrcy4uLicpO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICB3aGlsZSAoIXRhc2tRdWV1ZS5hbGxUYXNrc0NvbXBsZXRlZCkge1xuICAgICAgY29uc3QgdGFzayA9IHRhc2tRdWV1ZS5nZXROZXh0VGFzaygpICE7XG4gICAgICBjb21waWxlKHRhc2spO1xuICAgICAgdGFza1F1ZXVlLm1hcmtUYXNrQ29tcGxldGVkKHRhc2spO1xuICAgIH1cblxuICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDAwKTtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUHJvY2Vzc2VkIHRhc2tzIGluICR7ZHVyYXRpb259cy5gKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGBFeGVjdXRvcmAgdGhhdCBwcm9jZXNzZXMgYWxsIHRhc2tzIHNlcmlhbGx5IGFuZCBjb21wbGV0ZXMgc3luY2hyb25vdXNseS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmMgZXh0ZW5kcyBTaW5nbGVQcm9jZXNzb3JFeGVjdXRvckJhc2UgaW1wbGVtZW50cyBFeGVjdXRvciB7XG4gIGNvbnN0cnVjdG9yKGxvZ2dlcjogTG9nZ2VyLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBwcml2YXRlIGxvY2tGaWxlOiBTeW5jTG9ja2VyKSB7XG4gICAgc3VwZXIobG9nZ2VyLCBwa2dKc29uVXBkYXRlcik7XG4gIH1cbiAgZXhlY3V0ZShhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuLCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbik6IHZvaWQge1xuICAgIHRoaXMubG9ja0ZpbGUubG9jaygoKSA9PiB0aGlzLmRvRXhlY3V0ZShhbmFseXplRW50cnlQb2ludHMsIGNyZWF0ZUNvbXBpbGVGbikpO1xuICB9XG59XG5cbi8qKlxuICogQW4gYEV4ZWN1dG9yYCB0aGF0IHByb2Nlc3NlcyBhbGwgdGFza3Mgc2VyaWFsbHksIGJ1dCBzdGlsbCBjb21wbGV0ZXMgYXN5bmNocm9ub3VzbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBTaW5nbGVQcm9jZXNzRXhlY3V0b3JBc3luYyBleHRlbmRzIFNpbmdsZVByb2Nlc3NvckV4ZWN1dG9yQmFzZSBpbXBsZW1lbnRzIEV4ZWN1dG9yIHtcbiAgY29uc3RydWN0b3IobG9nZ2VyOiBMb2dnZXIsIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIHByaXZhdGUgbG9ja0ZpbGU6IFN5bmNMb2NrZXIpIHtcbiAgICBzdXBlcihsb2dnZXIsIHBrZ0pzb25VcGRhdGVyKTtcbiAgfVxuICBhc3luYyBleGVjdXRlKGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4sIGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuKTpcbiAgICAgIFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9ja0ZpbGUubG9jayhhc3luYygpID0+IHRoaXMuZG9FeGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKSk7XG4gIH1cbn1cbiJdfQ==