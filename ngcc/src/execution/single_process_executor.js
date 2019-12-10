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
    /**
     * An `Executor` that processes all tasks serially and completes synchronously.
     */
    var SingleProcessExecutor = /** @class */ (function () {
        function SingleProcessExecutor(logger, pkgJsonUpdater) {
            this.logger = logger;
            this.pkgJsonUpdater = pkgJsonUpdater;
        }
        SingleProcessExecutor.prototype.execute = function (analyzeEntryPoints, createCompileFn) {
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
        return SingleProcessExecutor;
    }());
    exports.SingleProcessExecutor = SingleProcessExecutor;
    /**
     * An `Executor` that processes all tasks serially, but still completes asynchronously.
     */
    var AsyncSingleProcessExecutor = /** @class */ (function (_super) {
        tslib_1.__extends(AsyncSingleProcessExecutor, _super);
        function AsyncSingleProcessExecutor() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        AsyncSingleProcessExecutor.prototype.execute = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                return tslib_1.__generator(this, function (_a) {
                    return [2 /*return*/, _super.prototype.execute.apply(this, tslib_1.__spread(args))];
                });
            });
        };
        return AsyncSingleProcessExecutor;
    }(SingleProcessExecutor));
    exports.AsyncSingleProcessExecutor = AsyncSingleProcessExecutor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlX3Byb2Nlc3NfZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL3NpbmdsZV9wcm9jZXNzX2V4ZWN1dG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQU1ILHdFQUF3QztJQUd4Qzs7T0FFRztJQUNIO1FBQ0UsK0JBQW9CLE1BQWMsRUFBVSxjQUFrQztZQUExRCxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVUsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1FBQUcsQ0FBQztRQUVsRix1Q0FBTyxHQUFQLFVBQVEsa0JBQXdDLEVBQUUsZUFBZ0M7WUFBbEYsaUJBbUJDO1lBbEJDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHFCQUFtQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksTUFBRyxDQUFDLENBQUM7WUFFL0QsSUFBTSxTQUFTLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztZQUN2QyxJQUFNLE9BQU8sR0FDVCxlQUFlLENBQUMsVUFBQyxJQUFJLEVBQUUsT0FBTyxJQUFLLE9BQUEsdUJBQWUsQ0FBQyxLQUFJLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsRUFBbkQsQ0FBbUQsQ0FBQyxDQUFDO1lBRTVGLHFCQUFxQjtZQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3pDLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUU3QixPQUFPLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFO2dCQUNuQyxJQUFNLElBQUksR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFJLENBQUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDZCxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbkM7WUFFRCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHdCQUFzQixRQUFRLE9BQUksQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUF2QkQsSUF1QkM7SUF2Qlksc0RBQXFCO0lBeUJsQzs7T0FFRztJQUNIO1FBQWdELHNEQUFxQjtRQUFyRTs7UUFJQSxDQUFDO1FBSE8sNENBQU8sR0FBYjtZQUFjLGNBQXdDO2lCQUF4QyxVQUF3QyxFQUF4QyxxQkFBd0MsRUFBeEMsSUFBd0M7Z0JBQXhDLHlCQUF3Qzs7OztvQkFDcEQsc0JBQU8saUJBQU0sT0FBTyw4QkFBSSxJQUFJLElBQUU7OztTQUMvQjtRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQUpELENBQWdELHFCQUFxQixHQUlwRTtJQUpZLGdFQUEwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7UGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcblxuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbiwgQ3JlYXRlQ29tcGlsZUZuLCBFeGVjdXRvcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtvblRhc2tDb21wbGV0ZWR9IGZyb20gJy4vdXRpbHMnO1xuXG5cbi8qKlxuICogQW4gYEV4ZWN1dG9yYCB0aGF0IHByb2Nlc3NlcyBhbGwgdGFza3Mgc2VyaWFsbHkgYW5kIGNvbXBsZXRlcyBzeW5jaHJvbm91c2x5LlxuICovXG5leHBvcnQgY2xhc3MgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yIGltcGxlbWVudHMgRXhlY3V0b3Ige1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLCBwcml2YXRlIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIpIHt9XG5cbiAgZXhlY3V0ZShhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuLCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbik6IHZvaWQge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBSdW5uaW5nIG5nY2Mgb24gJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9LmApO1xuXG4gICAgY29uc3QgdGFza1F1ZXVlID0gYW5hbHl6ZUVudHJ5UG9pbnRzKCk7XG4gICAgY29uc3QgY29tcGlsZSA9XG4gICAgICAgIGNyZWF0ZUNvbXBpbGVGbigodGFzaywgb3V0Y29tZSkgPT4gb25UYXNrQ29tcGxldGVkKHRoaXMucGtnSnNvblVwZGF0ZXIsIHRhc2ssIG91dGNvbWUpKTtcblxuICAgIC8vIFByb2Nlc3MgYWxsIHRhc2tzLlxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIHRhc2tzLi4uJyk7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIHdoaWxlICghdGFza1F1ZXVlLmFsbFRhc2tzQ29tcGxldGVkKSB7XG4gICAgICBjb25zdCB0YXNrID0gdGFza1F1ZXVlLmdldE5leHRUYXNrKCkgITtcbiAgICAgIGNvbXBpbGUodGFzayk7XG4gICAgICB0YXNrUXVldWUubWFya1Rhc2tDb21wbGV0ZWQodGFzayk7XG4gICAgfVxuXG4gICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMDApO1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBQcm9jZXNzZWQgdGFza3MgaW4gJHtkdXJhdGlvbn1zLmApO1xuICB9XG59XG5cbi8qKlxuICogQW4gYEV4ZWN1dG9yYCB0aGF0IHByb2Nlc3NlcyBhbGwgdGFza3Mgc2VyaWFsbHksIGJ1dCBzdGlsbCBjb21wbGV0ZXMgYXN5bmNocm9ub3VzbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBBc3luY1NpbmdsZVByb2Nlc3NFeGVjdXRvciBleHRlbmRzIFNpbmdsZVByb2Nlc3NFeGVjdXRvciB7XG4gIGFzeW5jIGV4ZWN1dGUoLi4uYXJnczogUGFyYW1ldGVyczxFeGVjdXRvclsnZXhlY3V0ZSddPik6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBzdXBlci5leGVjdXRlKC4uLmFyZ3MpO1xuICB9XG59XG4iXX0=