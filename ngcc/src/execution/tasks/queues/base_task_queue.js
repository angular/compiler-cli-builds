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
    exports.BaseTaskQueue = void 0;
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
            enumerable: false,
            configurable: true
        });
        BaseTaskQueue.prototype.getNextTask = function () {
            var nextTask = this.computeNextTask();
            while (nextTask !== null) {
                if (!this.tasksToSkip.has(nextTask)) {
                    break;
                }
                // We are skipping this task so mark it as complete
                this.markAsCompleted(nextTask);
                var failedTask = this.tasksToSkip.get(nextTask);
                this.logger.warn("Skipping processing of " + nextTask.entryPoint.name + " because its dependency " + failedTask.entryPoint.name + " failed to compile.");
                nextTask = this.computeNextTask();
            }
            return nextTask;
        };
        BaseTaskQueue.prototype.markAsCompleted = function (task) {
            if (!this.inProgressTasks.has(task)) {
                throw new Error("Trying to mark task that was not in progress as completed: " + (0, utils_1.stringifyTask)(task));
            }
            this.inProgressTasks.delete(task);
        };
        BaseTaskQueue.prototype.markAsFailed = function (task) {
            var e_1, _a;
            if (this.dependencies.has(task)) {
                try {
                    for (var _b = (0, tslib_1.__values)(this.dependencies.get(task)), _c = _b.next(); !_c.done; _c = _b.next()) {
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
        BaseTaskQueue.prototype.markAsUnprocessed = function (task) {
            if (!this.inProgressTasks.has(task)) {
                throw new Error("Trying to mark task that was not in progress as unprocessed: " + (0, utils_1.stringifyTask)(task));
            }
            this.inProgressTasks.delete(task);
            this.tasks.unshift(task);
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
                    for (var _b = (0, tslib_1.__values)(this.dependencies.get(task)), _c = _b.next(); !_c.done; _c = _b.next()) {
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
            return tasks.map(function (task) { return "\n" + indentation + "- " + (0, utils_1.stringifyTask)(task); }).join('');
        };
        return BaseTaskQueue;
    }());
    exports.BaseTaskQueue = BaseTaskQueue;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZV90YXNrX3F1ZXVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2V4ZWN1dGlvbi90YXNrcy9xdWV1ZXMvYmFzZV90YXNrX3F1ZXVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFTQSw4RUFBdUM7SUFHdkM7O09BRUc7SUFDSDtRQVdFLHVCQUNjLE1BQWMsRUFBWSxLQUE0QixFQUN0RCxZQUE4QjtZQUQ5QixXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVksVUFBSyxHQUFMLEtBQUssQ0FBdUI7WUFDdEQsaUJBQVksR0FBWixZQUFZLENBQWtCO1lBVGxDLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQVEsQ0FBQztZQUU1Qzs7ZUFFRztZQUNLLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWMsQ0FBQztRQUlHLENBQUM7UUFaaEQsc0JBQUksNENBQWlCO2lCQUFyQjtnQkFDRSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN4RSxDQUFDOzs7V0FBQTtRQWNELG1DQUFXLEdBQVg7WUFDRSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEMsT0FBTyxRQUFRLEtBQUssSUFBSSxFQUFFO2dCQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ25DLE1BQU07aUJBQ1A7Z0JBQ0QsbURBQW1EO2dCQUNuRCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMvQixJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FB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V0FBVyxVQUFLLElBQUEscUJBQWEsRUFBQyxJQUFJLENBQUcsRUFBMUMsQ0FBMEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBQ0gsb0JBQUM7SUFBRCxDQUFDLEFBdkZELElBdUZDO0lBdkZxQixzQ0FBYSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7UGFydGlhbGx5T3JkZXJlZFRhc2tzLCBUYXNrLCBUYXNrRGVwZW5kZW5jaWVzLCBUYXNrUXVldWV9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge3N0cmluZ2lmeVRhc2t9IGZyb20gJy4uL3V0aWxzJztcblxuXG4vKipcbiAqIEEgYmFzZSBgVGFza1F1ZXVlYCBpbXBsZW1lbnRhdGlvbiB0byBiZSB1c2VkIGFzIGJhc2UgZm9yIGNvbmNyZXRlIGltcGxlbWVudGF0aW9ucy5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2VUYXNrUXVldWUgaW1wbGVtZW50cyBUYXNrUXVldWUge1xuICBnZXQgYWxsVGFza3NDb21wbGV0ZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICh0aGlzLnRhc2tzLmxlbmd0aCA9PT0gMCkgJiYgKHRoaXMuaW5Qcm9ncmVzc1Rhc2tzLnNpemUgPT09IDApO1xuICB9XG4gIHByb3RlY3RlZCBpblByb2dyZXNzVGFza3MgPSBuZXcgU2V0PFRhc2s+KCk7XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIHRhc2tzIHRoYXQgc2hvdWxkIGJlIHNraXBwZWQsIG1hcHBlZCB0byB0aGUgdGFzayB0aGF0IGNhdXNlZCB0aGVtIHRvIGJlIHNraXBwZWQuXG4gICAqL1xuICBwcml2YXRlIHRhc2tzVG9Ta2lwID0gbmV3IE1hcDxUYXNrLCBUYXNrPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIGxvZ2dlcjogTG9nZ2VyLCBwcm90ZWN0ZWQgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcyxcbiAgICAgIHByb3RlY3RlZCBkZXBlbmRlbmNpZXM6IFRhc2tEZXBlbmRlbmNpZXMpIHt9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IGNvbXB1dGVOZXh0VGFzaygpOiBUYXNrfG51bGw7XG5cbiAgZ2V0TmV4dFRhc2soKTogVGFza3xudWxsIHtcbiAgICBsZXQgbmV4dFRhc2sgPSB0aGlzLmNvbXB1dGVOZXh0VGFzaygpO1xuICAgIHdoaWxlIChuZXh0VGFzayAhPT0gbnVsbCkge1xuICAgICAgaWYgKCF0aGlzLnRhc2tzVG9Ta2lwLmhhcyhuZXh0VGFzaykpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICAvLyBXZSBhcmUgc2tpcHBpbmcgdGhpcyB0YXNrIHNvIG1hcmsgaXQgYXMgY29tcGxldGVcbiAgICAgIHRoaXMubWFya0FzQ29tcGxldGVkKG5leHRUYXNrKTtcbiAgICAgIGNvbnN0IGZhaWxlZFRhc2sgPSB0aGlzLnRhc2tzVG9Ta2lwLmdldChuZXh0VGFzaykhO1xuICAgICAgdGhpcy5sb2dnZXIud2FybihgU2tpcHBpbmcgcHJvY2Vzc2luZyBvZiAke25leHRUYXNrLmVudHJ5UG9pbnQubmFtZX0gYmVjYXVzZSBpdHMgZGVwZW5kZW5jeSAke1xuICAgICAgICAgIGZhaWxlZFRhc2suZW50cnlQb2ludC5uYW1lfSBmYWlsZWQgdG8gY29tcGlsZS5gKTtcbiAgICAgIG5leHRUYXNrID0gdGhpcy5jb21wdXRlTmV4dFRhc2soKTtcbiAgICB9XG4gICAgcmV0dXJuIG5leHRUYXNrO1xuICB9XG5cbiAgbWFya0FzQ29tcGxldGVkKHRhc2s6IFRhc2spOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaW5Qcm9ncmVzc1Rhc2tzLmhhcyh0YXNrKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUcnlpbmcgdG8gbWFyayB0YXNrIHRoYXQgd2FzIG5vdCBpbiBwcm9ncmVzcyBhcyBjb21wbGV0ZWQ6ICR7c3RyaW5naWZ5VGFzayh0YXNrKX1gKTtcbiAgICB9XG5cbiAgICB0aGlzLmluUHJvZ3Jlc3NUYXNrcy5kZWxldGUodGFzayk7XG4gIH1cblxuICBtYXJrQXNGYWlsZWQodGFzazogVGFzayk6IHZvaWQge1xuICAgIGlmICh0aGlzLmRlcGVuZGVuY2llcy5oYXModGFzaykpIHtcbiAgICAgIGZvciAoY29uc3QgZGVwZW5kZW50VGFzayBvZiB0aGlzLmRlcGVuZGVuY2llcy5nZXQodGFzaykhKSB7XG4gICAgICAgIHRoaXMuc2tpcERlcGVuZGVudFRhc2tzKGRlcGVuZGVudFRhc2ssIHRhc2spO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIG1hcmtBc1VucHJvY2Vzc2VkKHRhc2s6IFRhc2spOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaW5Qcm9ncmVzc1Rhc2tzLmhhcyh0YXNrKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUcnlpbmcgdG8gbWFyayB0YXNrIHRoYXQgd2FzIG5vdCBpbiBwcm9ncmVzcyBhcyB1bnByb2Nlc3NlZDogJHtzdHJpbmdpZnlUYXNrKHRhc2spfWApO1xuICAgIH1cblxuICAgIHRoaXMuaW5Qcm9ncmVzc1Rhc2tzLmRlbGV0ZSh0YXNrKTtcbiAgICB0aGlzLnRhc2tzLnVuc2hpZnQodGFzayk7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGNvbnN0IGluUHJvZ1Rhc2tzID0gQXJyYXkuZnJvbSh0aGlzLmluUHJvZ3Jlc3NUYXNrcyk7XG5cbiAgICByZXR1cm4gYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfVxcbmAgK1xuICAgICAgICBgICBBbGwgdGFza3MgY29tcGxldGVkOiAke3RoaXMuYWxsVGFza3NDb21wbGV0ZWR9XFxuYCArXG4gICAgICAgIGAgIFVucHJvY2Vzc2VkIHRhc2tzICgke3RoaXMudGFza3MubGVuZ3RofSk6ICR7dGhpcy5zdHJpbmdpZnlUYXNrcyh0aGlzLnRhc2tzLCAnICAgICcpfVxcbmAgK1xuICAgICAgICBgICBJbi1wcm9ncmVzcyB0YXNrcyAoJHtpblByb2dUYXNrcy5sZW5ndGh9KTogJHt0aGlzLnN0cmluZ2lmeVRhc2tzKGluUHJvZ1Rhc2tzLCAnICAgICcpfWA7XG4gIH1cblxuICAvKipcbiAgICogTWFyayB0aGUgZ2l2ZW4gYHRhc2tgIGFzIHRvIGJlIHNraXBwZWQsIHRoZW4gcmVjdXJzaXZlIHNraXAgYWxsIGl0cyBkZXBlbmRlbnRzLlxuICAgKlxuICAgKiBAcGFyYW0gdGFzayBUaGUgdGFzayB0byBza2lwXG4gICAqIEBwYXJhbSBmYWlsZWRUYXNrIFRoZSB0YXNrIHRoYXQgZmFpbGVkLCBjYXVzaW5nIHRoaXMgdGFzayB0byBiZSBza2lwcGVkXG4gICAqL1xuICBwcm90ZWN0ZWQgc2tpcERlcGVuZGVudFRhc2tzKHRhc2s6IFRhc2ssIGZhaWxlZFRhc2s6IFRhc2spIHtcbiAgICB0aGlzLnRhc2tzVG9Ta2lwLnNldCh0YXNrLCBmYWlsZWRUYXNrKTtcbiAgICBpZiAodGhpcy5kZXBlbmRlbmNpZXMuaGFzKHRhc2spKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlcGVuZGVudFRhc2sgb2YgdGhpcy5kZXBlbmRlbmNpZXMuZ2V0KHRhc2spISkge1xuICAgICAgICB0aGlzLnNraXBEZXBlbmRlbnRUYXNrcyhkZXBlbmRlbnRUYXNrLCBmYWlsZWRUYXNrKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgc3RyaW5naWZ5VGFza3ModGFza3M6IFRhc2tbXSwgaW5kZW50YXRpb246IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRhc2tzLm1hcCh0YXNrID0+IGBcXG4ke2luZGVudGF0aW9ufS0gJHtzdHJpbmdpZnlUYXNrKHRhc2spfWApLmpvaW4oJycpO1xuICB9XG59XG4iXX0=