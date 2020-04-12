(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/tasks/queues/base_task_queue", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/execution/tasks/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/utils");
    /**
     * A base `TaskQueue` implementation to be used as base for concrete implementations.
     */
    var BaseTaskQueue = /** @class */ (function () {
        function BaseTaskQueue(logger, tasks, dependencies) {
            this.logger = logger;
            this.tasks = tasks;
            this.dependencies = dependencies;
            this.inProgressTasks = new Set();
            /**
             * A map of tasks that should be skipped, mapped to the task that caused them to be skipped.
             */
            this.tasksToSkip = new Map();
        }
        Object.defineProperty(BaseTaskQueue.prototype, "allTasksCompleted", {
            get: function () {
                return (this.tasks.length === 0) && (this.inProgressTasks.size === 0);
            },
            enumerable: true,
            configurable: true
        });
        BaseTaskQueue.prototype.getNextTask = function () {
            var nextTask = this.computeNextTask();
            while (nextTask !== null) {
                if (!this.tasksToSkip.has(nextTask)) {
                    break;
                }
                // We are skipping this task so mark it as complete
                this.markTaskCompleted(nextTask);
                var failedTask = this.tasksToSkip.get(nextTask);
                this.logger.warn("Skipping processing of " + nextTask.entryPoint.name + " because its dependency " + failedTask.entryPoint.name + " failed to compile.");
                nextTask = this.computeNextTask();
            }
            return nextTask;
        };
        BaseTaskQueue.prototype.markAsFailed = function (task) {
            var e_1, _a;
            if (this.dependencies.has(task)) {
                try {
                    for (var _b = tslib_1.__values(this.dependencies.get(task)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var dependentTask = _c.value;
                        this.skipDependentTasks(dependentTask, task);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        };
        BaseTaskQueue.prototype.markTaskCompleted = function (task) {
            if (!this.inProgressTasks.has(task)) {
                throw new Error("Trying to mark task that was not in progress as completed: " + utils_1.stringifyTask(task));
            }
            this.inProgressTasks.delete(task);
        };
        BaseTaskQueue.prototype.toString = function () {
            var inProgTasks = Array.from(this.inProgressTasks);
            return this.constructor.name + "\n" +
                ("  All tasks completed: " + this.allTasksCompleted + "\n") +
                ("  Unprocessed tasks (" + this.tasks.length + "): " + this.stringifyTasks(this.tasks, '    ') + "\n") +
                ("  In-progress tasks (" + inProgTasks.length + "): " + this.stringifyTasks(inProgTasks, '    '));
        };
        /**
         * Mark the given `task` as to be skipped, then recursive skip all its dependents.
         *
         * @param task The task to skip
         * @param failedTask The task that failed, causing this task to be skipped
         */
        BaseTaskQueue.prototype.skipDependentTasks = function (task, failedTask) {
            var e_2, _a;
            this.tasksToSkip.set(task, failedTask);
            if (this.dependencies.has(task)) {
                try {
                    for (var _b = tslib_1.__values(this.dependencies.get(task)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var dependentTask = _c.value;
                        this.skipDependentTasks(dependentTask, failedTask);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        };
        BaseTaskQueue.prototype.stringifyTasks = function (tasks, indentation) {
            return tasks.map(function (task) { return "\n" + indentation + "- " + utils_1.stringifyTask(task); }).join('');
        };
        return BaseTaskQueue;
    }());
    exports.BaseTaskQueue = BaseTaskQueue;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZV90YXNrX3F1ZXVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi90YXNrcy9xdWV1ZXMvYmFzZV90YXNrX3F1ZXVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLDhFQUF1QztJQUd2Qzs7T0FFRztJQUNIO1FBV0UsdUJBQ2MsTUFBYyxFQUFZLEtBQTRCLEVBQ3RELFlBQThCO1lBRDlCLFdBQU0sR0FBTixNQUFNLENBQVE7WUFBWSxVQUFLLEdBQUwsS0FBSyxDQUF1QjtZQUN0RCxpQkFBWSxHQUFaLFlBQVksQ0FBa0I7WUFUbEMsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBUSxDQUFDO1lBRTVDOztlQUVHO1lBQ0ssZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBYyxDQUFDO1FBSUcsQ0FBQztRQVpoRCxzQkFBSSw0Q0FBaUI7aUJBQXJCO2dCQUNFLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3hFLENBQUM7OztXQUFBO1FBY0QsbUNBQVcsR0FBWDtZQUNFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QyxPQUFPLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDbkMsTUFBTTtpQkFDUDtnQkFDRCxtREFBbUQ7Z0JBQ25ELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDakMsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFHLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDRCQUEwQixRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksZ0NBQy9ELFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSx3QkFBcUIsQ0FBQyxDQUFDO2dCQUNyRCxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO2FBQ25DO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUVELG9DQUFZLEdBQVosVUFBYSxJQUFVOztZQUNyQixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFOztvQkFDL0IsS0FBNEIsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRyxDQUFBLGdCQUFBLDRCQUFFO3dCQUF0RCxJQUFNLGFBQWEsV0FBQTt3QkFDdEIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztxQkFDOUM7Ozs7Ozs7OzthQUNGO1FBQ0gsQ0FBQztRQUVELHlDQUFpQixHQUFqQixVQUFrQixJQUFVO1lBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbkMsTUFBTSxJQUFJLEtBQUssQ0FDWCxnRUFBOEQscUJBQWEsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDO2FBQzFGO1lBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUVELGdDQUFRLEdBQVI7WUFDRSxJQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUVyRCxPQUFVLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxPQUFJO2lCQUMvQiw0QkFBMEIsSUFBSSxDQUFDLGlCQUFpQixPQUFJLENBQUE7aUJBQ3BELDBCQUF3QixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sV0FBTSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE9BQUksQ0FBQTtpQkFDMUYsMEJBQXdCLFdBQVcsQ0FBQyxNQUFNLFdBQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFHLENBQUEsQ0FBQztRQUNqRyxDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDTywwQ0FBa0IsR0FBNUIsVUFBNkIsSUFBVSxFQUFFLFVBQWdCOztZQUN2RCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDdkMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTs7b0JBQy9CLEtBQTRCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUcsQ0FBQSxnQkFBQSw0QkFBRTt3QkFBdEQsSUFBTSxhQUFhLFdBQUE7d0JBQ3RCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7cUJBQ3BEOzs7Ozs7Ozs7YUFDRjtRQUNILENBQUM7UUFFUyxzQ0FBYyxHQUF4QixVQUF5QixLQUFhLEVBQUUsV0FBbUI7WUFDekQsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsT0FBSyxXQUFXLFVBQUsscUJBQWEsQ0FBQyxJQUFJLENBQUcsRUFBMUMsQ0FBMEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBN0VELElBNkVDO0lBN0VxQixzQ0FBYSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi8uLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge1BhcnRpYWxseU9yZGVyZWRUYXNrcywgVGFzaywgVGFza0RlcGVuZGVuY2llcywgVGFza1F1ZXVlfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHtzdHJpbmdpZnlUYXNrfSBmcm9tICcuLi91dGlscyc7XG5cblxuLyoqXG4gKiBBIGJhc2UgYFRhc2tRdWV1ZWAgaW1wbGVtZW50YXRpb24gdG8gYmUgdXNlZCBhcyBiYXNlIGZvciBjb25jcmV0ZSBpbXBsZW1lbnRhdGlvbnMuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCYXNlVGFza1F1ZXVlIGltcGxlbWVudHMgVGFza1F1ZXVlIHtcbiAgZ2V0IGFsbFRhc2tzQ29tcGxldGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAodGhpcy50YXNrcy5sZW5ndGggPT09IDApICYmICh0aGlzLmluUHJvZ3Jlc3NUYXNrcy5zaXplID09PSAwKTtcbiAgfVxuICBwcm90ZWN0ZWQgaW5Qcm9ncmVzc1Rhc2tzID0gbmV3IFNldDxUYXNrPigpO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiB0YXNrcyB0aGF0IHNob3VsZCBiZSBza2lwcGVkLCBtYXBwZWQgdG8gdGhlIHRhc2sgdGhhdCBjYXVzZWQgdGhlbSB0byBiZSBza2lwcGVkLlxuICAgKi9cbiAgcHJpdmF0ZSB0YXNrc1RvU2tpcCA9IG5ldyBNYXA8VGFzaywgVGFzaz4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBsb2dnZXI6IExvZ2dlciwgcHJvdGVjdGVkIHRhc2tzOiBQYXJ0aWFsbHlPcmRlcmVkVGFza3MsXG4gICAgICBwcm90ZWN0ZWQgZGVwZW5kZW5jaWVzOiBUYXNrRGVwZW5kZW5jaWVzKSB7fVxuXG4gIHByb3RlY3RlZCBhYnN0cmFjdCBjb21wdXRlTmV4dFRhc2soKTogVGFza3xudWxsO1xuXG4gIGdldE5leHRUYXNrKCk6IFRhc2t8bnVsbCB7XG4gICAgbGV0IG5leHRUYXNrID0gdGhpcy5jb21wdXRlTmV4dFRhc2soKTtcbiAgICB3aGlsZSAobmV4dFRhc2sgIT09IG51bGwpIHtcbiAgICAgIGlmICghdGhpcy50YXNrc1RvU2tpcC5oYXMobmV4dFRhc2spKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgLy8gV2UgYXJlIHNraXBwaW5nIHRoaXMgdGFzayBzbyBtYXJrIGl0IGFzIGNvbXBsZXRlXG4gICAgICB0aGlzLm1hcmtUYXNrQ29tcGxldGVkKG5leHRUYXNrKTtcbiAgICAgIGNvbnN0IGZhaWxlZFRhc2sgPSB0aGlzLnRhc2tzVG9Ta2lwLmdldChuZXh0VGFzaykgITtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oYFNraXBwaW5nIHByb2Nlc3Npbmcgb2YgJHtuZXh0VGFzay5lbnRyeVBvaW50Lm5hbWV9IGJlY2F1c2UgaXRzIGRlcGVuZGVuY3kgJHtcbiAgICAgICAgICBmYWlsZWRUYXNrLmVudHJ5UG9pbnQubmFtZX0gZmFpbGVkIHRvIGNvbXBpbGUuYCk7XG4gICAgICBuZXh0VGFzayA9IHRoaXMuY29tcHV0ZU5leHRUYXNrKCk7XG4gICAgfVxuICAgIHJldHVybiBuZXh0VGFzaztcbiAgfVxuXG4gIG1hcmtBc0ZhaWxlZCh0YXNrOiBUYXNrKSB7XG4gICAgaWYgKHRoaXMuZGVwZW5kZW5jaWVzLmhhcyh0YXNrKSkge1xuICAgICAgZm9yIChjb25zdCBkZXBlbmRlbnRUYXNrIG9mIHRoaXMuZGVwZW5kZW5jaWVzLmdldCh0YXNrKSAhKSB7XG4gICAgICAgIHRoaXMuc2tpcERlcGVuZGVudFRhc2tzKGRlcGVuZGVudFRhc2ssIHRhc2spO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG1hcmtUYXNrQ29tcGxldGVkKHRhc2s6IFRhc2spOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaW5Qcm9ncmVzc1Rhc2tzLmhhcyh0YXNrKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUcnlpbmcgdG8gbWFyayB0YXNrIHRoYXQgd2FzIG5vdCBpbiBwcm9ncmVzcyBhcyBjb21wbGV0ZWQ6ICR7c3RyaW5naWZ5VGFzayh0YXNrKX1gKTtcbiAgICB9XG5cbiAgICB0aGlzLmluUHJvZ3Jlc3NUYXNrcy5kZWxldGUodGFzayk7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGluUHJvZ1Rhc2tzID0gQXJyYXkuZnJvbSh0aGlzLmluUHJvZ3Jlc3NUYXNrcyk7XG5cbiAgICByZXR1cm4gYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfVxcbmAgK1xuICAgICAgICBgICBBbGwgdGFza3MgY29tcGxldGVkOiAke3RoaXMuYWxsVGFza3NDb21wbGV0ZWR9XFxuYCArXG4gICAgICAgIGAgIFVucHJvY2Vzc2VkIHRhc2tzICgke3RoaXMudGFza3MubGVuZ3RofSk6ICR7dGhpcy5zdHJpbmdpZnlUYXNrcyh0aGlzLnRhc2tzLCAnICAgICcpfVxcbmAgK1xuICAgICAgICBgICBJbi1wcm9ncmVzcyB0YXNrcyAoJHtpblByb2dUYXNrcy5sZW5ndGh9KTogJHt0aGlzLnN0cmluZ2lmeVRhc2tzKGluUHJvZ1Rhc2tzLCAnICAgICcpfWA7XG4gIH1cblxuICAvKipcbiAgICogTWFyayB0aGUgZ2l2ZW4gYHRhc2tgIGFzIHRvIGJlIHNraXBwZWQsIHRoZW4gcmVjdXJzaXZlIHNraXAgYWxsIGl0cyBkZXBlbmRlbnRzLlxuICAgKlxuICAgKiBAcGFyYW0gdGFzayBUaGUgdGFzayB0byBza2lwXG4gICAqIEBwYXJhbSBmYWlsZWRUYXNrIFRoZSB0YXNrIHRoYXQgZmFpbGVkLCBjYXVzaW5nIHRoaXMgdGFzayB0byBiZSBza2lwcGVkXG4gICAqL1xuICBwcm90ZWN0ZWQgc2tpcERlcGVuZGVudFRhc2tzKHRhc2s6IFRhc2ssIGZhaWxlZFRhc2s6IFRhc2spIHtcbiAgICB0aGlzLnRhc2tzVG9Ta2lwLnNldCh0YXNrLCBmYWlsZWRUYXNrKTtcbiAgICBpZiAodGhpcy5kZXBlbmRlbmNpZXMuaGFzKHRhc2spKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlcGVuZGVudFRhc2sgb2YgdGhpcy5kZXBlbmRlbmNpZXMuZ2V0KHRhc2spICEpIHtcbiAgICAgICAgdGhpcy5za2lwRGVwZW5kZW50VGFza3MoZGVwZW5kZW50VGFzaywgZmFpbGVkVGFzayk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIHN0cmluZ2lmeVRhc2tzKHRhc2tzOiBUYXNrW10sIGluZGVudGF0aW9uOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0YXNrcy5tYXAodGFzayA9PiBgXFxuJHtpbmRlbnRhdGlvbn0tICR7c3RyaW5naWZ5VGFzayh0YXNrKX1gKS5qb2luKCcnKTtcbiAgfVxufVxuIl19