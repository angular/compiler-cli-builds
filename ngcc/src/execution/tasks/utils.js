(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/tasks/utils", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/execution/tasks/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var api_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/api");
    /** Stringify a task for debugging purposes. */
    exports.stringifyTask = function (task) {
        return "{entryPoint: " + task.entryPoint.name + ", formatProperty: " + task.formatProperty + ", processDts: " + task.processDts + "}";
    };
    /**
     * Compute a mapping of tasks to the tasks that are dependent on them (if any).
     *
     * Task A can depend upon task B, if either:
     *
     * * A and B have the same entry-point _and_ B is generating the typings for that entry-point
     *   (i.e. has `processDts: true`).
     * * A's entry-point depends on B's entry-point _and_ B is also generating typings.
     *
     * NOTE: If a task is not generating typings, then it cannot affect anything which depends on its
     *       entry-point, regardless of the dependency graph. To put this another way, only the task
     *       which produces the typings for a dependency needs to have been completed.
     *
     * As a performance optimization, we take into account the fact that `tasks` are sorted in such a
     * way that a task can only depend on earlier tasks (i.e. dependencies always come before
     * dependents in the list of tasks).
     *
     * @param tasks A (partially ordered) list of tasks.
     * @param graph The dependency graph between entry-points.
     * @return A map from each task to those tasks directly dependent upon it.
     */
    function computeTaskDependencies(tasks, graph) {
        var dependencies = new api_1.TaskDependencies();
        var candidateDependencies = new Map();
        tasks.forEach(function (task) {
            var e_1, _a;
            var entryPointPath = task.entryPoint.path;
            // Find the earlier tasks (`candidateDependencies`) that this task depends upon.
            var deps = graph.dependenciesOf(entryPointPath);
            var taskDependencies = deps.filter(function (dep) { return candidateDependencies.has(dep); })
                .map(function (dep) { return candidateDependencies.get(dep); });
            // If this task has dependencies, add it to the dependencies and dependents maps.
            if (taskDependencies.length > 0) {
                try {
                    for (var taskDependencies_1 = tslib_1.__values(taskDependencies), taskDependencies_1_1 = taskDependencies_1.next(); !taskDependencies_1_1.done; taskDependencies_1_1 = taskDependencies_1.next()) {
                        var dependency = taskDependencies_1_1.value;
                        var taskDependents = getDependentsSet(dependencies, dependency);
                        taskDependents.add(task);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (taskDependencies_1_1 && !taskDependencies_1_1.done && (_a = taskDependencies_1.return)) _a.call(taskDependencies_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            if (task.processDts) {
                // SANITY CHECK:
                // There should only be one task per entry-point that generates typings (and thus can be a
                // dependency of other tasks), so the following should theoretically never happen, but check
                // just in case.
                if (candidateDependencies.has(entryPointPath)) {
                    var otherTask = candidateDependencies.get(entryPointPath);
                    throw new Error('Invariant violated: Multiple tasks are assigned generating typings for ' +
                        ("'" + entryPointPath + "':\n  - " + exports.stringifyTask(otherTask) + "\n  - " + exports.stringifyTask(task)));
                }
                // This task can potentially be a dependency (i.e. it generates typings), so add it to the
                // list of candidate dependencies for subsequent tasks.
                candidateDependencies.set(entryPointPath, task);
            }
            else {
                // This task is not generating typings so we need to add it to the dependents of the task that
                // does generate typings, if that exists
                if (candidateDependencies.has(entryPointPath)) {
                    var typingsTask = candidateDependencies.get(entryPointPath);
                    var typingsTaskDependents = getDependentsSet(dependencies, typingsTask);
                    typingsTaskDependents.add(task);
                }
            }
        });
        return dependencies;
    }
    exports.computeTaskDependencies = computeTaskDependencies;
    function getDependentsSet(map, task) {
        if (!map.has(task)) {
            map.set(task, new Set());
        }
        return map.get(task);
    }
    exports.getDependentsSet = getDependentsSet;
    /**
     * Invert the given mapping of Task dependencies.
     *
     * @param dependencies The mapping of tasks to the tasks that depend upon them.
     * @returns A mapping of tasks to the tasks that they depend upon.
     */
    function getBlockedTasks(dependencies) {
        var e_2, _a, e_3, _b;
        var blockedTasks = new Map();
        try {
            for (var dependencies_1 = tslib_1.__values(dependencies), dependencies_1_1 = dependencies_1.next(); !dependencies_1_1.done; dependencies_1_1 = dependencies_1.next()) {
                var _c = tslib_1.__read(dependencies_1_1.value, 2), dependency = _c[0], dependents = _c[1];
                try {
                    for (var dependents_1 = (e_3 = void 0, tslib_1.__values(dependents)), dependents_1_1 = dependents_1.next(); !dependents_1_1.done; dependents_1_1 = dependents_1.next()) {
                        var dependent = dependents_1_1.value;
                        var dependentSet = getDependentsSet(blockedTasks, dependent);
                        dependentSet.add(dependency);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (dependents_1_1 && !dependents_1_1.done && (_b = dependents_1.return)) _b.call(dependents_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (dependencies_1_1 && !dependencies_1_1.done && (_a = dependencies_1.return)) _a.call(dependencies_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return blockedTasks;
    }
    exports.getBlockedTasks = getBlockedTasks;
    /**
     * Sort a list of tasks by priority.
     *
     * Priority is determined by the number of other tasks that a task is (transitively) blocking:
     * The more tasks a task is blocking the higher its priority is, because processing it will
     * potentially unblock more tasks.
     *
     * To keep the behavior predictable, if two tasks block the same number of other tasks, their
     * relative order in the original `tasks` lists is preserved.
     *
     * @param tasks A (partially ordered) list of tasks.
     * @param dependencies The mapping of tasks to the tasks that depend upon them.
     * @return The list of tasks sorted by priority.
     */
    function sortTasksByPriority(tasks, dependencies) {
        var priorityPerTask = new Map();
        var computePriority = function (task, idx) { return [dependencies.has(task) ? dependencies.get(task).size : 0, idx]; };
        tasks.forEach(function (task, i) { return priorityPerTask.set(task, computePriority(task, i)); });
        return tasks.slice().sort(function (task1, task2) {
            var _a = tslib_1.__read(priorityPerTask.get(task1), 2), p1 = _a[0], idx1 = _a[1];
            var _b = tslib_1.__read(priorityPerTask.get(task2), 2), p2 = _b[0], idx2 = _b[1];
            return (p2 - p1) || (idx1 - idx2);
        });
    }
    exports.sortTasksByPriority = sortTasksByPriority;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL3Rhc2tzL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLDBFQUFvRTtJQUVwRSwrQ0FBK0M7SUFDbEMsUUFBQSxhQUFhLEdBQUcsVUFBQyxJQUFVO1FBQ3BDLE9BQUEsa0JBQWdCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSwwQkFBcUIsSUFBSSxDQUFDLGNBQWMsc0JBQWlCLElBQUksQ0FBQyxVQUFVLE1BQUc7SUFBL0csQ0FBK0csQ0FBQztJQUVwSDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FvQkc7SUFDSCxTQUFnQix1QkFBdUIsQ0FDbkMsS0FBNEIsRUFBRSxLQUEyQjtRQUMzRCxJQUFNLFlBQVksR0FBRyxJQUFJLHNCQUFnQixFQUFFLENBQUM7UUFDNUMsSUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBZ0IsQ0FBQztRQUV0RCxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSTs7WUFDaEIsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFFNUMsZ0ZBQWdGO1lBQ2hGLElBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDbEQsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUE5QixDQUE4QixDQUFDO2lCQUM3QyxHQUFHLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFHLEVBQWhDLENBQWdDLENBQUMsQ0FBQztZQUUzRSxpRkFBaUY7WUFDakYsSUFBSSxnQkFBZ0IsQ0FBQyxN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QUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFqRSxDQUFpRSxDQUFDO1FBRTFGLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBQyxJQUFJLEVBQUUsQ0FBQyxJQUFLLE9BQUEsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFuRCxDQUFtRCxDQUFDLENBQUM7UUFFaEYsT0FBTyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQUMsS0FBSyxFQUFFLEtBQUs7WUFDL0IsSUFBQSxrREFBeUMsRUFBeEMsVUFBRSxFQUFFLFlBQW9DLENBQUM7WUFDMUMsSUFBQSxrREFBeUMsRUFBeEMsVUFBRSxFQUFFLFlBQW9DLENBQUM7WUFFaEQsT0FBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFkRCxrREFjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7RGVwR3JhcGh9IGZyb20gJ2RlcGVuZGVuY3ktZ3JhcGgnO1xuaW1wb3J0IHtFbnRyeVBvaW50fSBmcm9tICcuLi8uLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge1BhcnRpYWxseU9yZGVyZWRUYXNrcywgVGFzaywgVGFza0RlcGVuZGVuY2llc30gZnJvbSAnLi9hcGknO1xuXG4vKiogU3RyaW5naWZ5IGEgdGFzayBmb3IgZGVidWdnaW5nIHB1cnBvc2VzLiAqL1xuZXhwb3J0IGNvbnN0IHN0cmluZ2lmeVRhc2sgPSAodGFzazogVGFzayk6IHN0cmluZyA9PlxuICAgIGB7ZW50cnlQb2ludDogJHt0YXNrLmVudHJ5UG9pbnQubmFtZX0sIGZvcm1hdFByb3BlcnR5OiAke3Rhc2suZm9ybWF0UHJvcGVydHl9LCBwcm9jZXNzRHRzOiAke3Rhc2sucHJvY2Vzc0R0c319YDtcblxuLyoqXG4gKiBDb21wdXRlIGEgbWFwcGluZyBvZiB0YXNrcyB0byB0aGUgdGFza3MgdGhhdCBhcmUgZGVwZW5kZW50IG9uIHRoZW0gKGlmIGFueSkuXG4gKlxuICogVGFzayBBIGNhbiBkZXBlbmQgdXBvbiB0YXNrIEIsIGlmIGVpdGhlcjpcbiAqXG4gKiAqIEEgYW5kIEIgaGF2ZSB0aGUgc2FtZSBlbnRyeS1wb2ludCBfYW5kXyBCIGlzIGdlbmVyYXRpbmcgdGhlIHR5cGluZ3MgZm9yIHRoYXQgZW50cnktcG9pbnRcbiAqICAgKGkuZS4gaGFzIGBwcm9jZXNzRHRzOiB0cnVlYCkuXG4gKiAqIEEncyBlbnRyeS1wb2ludCBkZXBlbmRzIG9uIEIncyBlbnRyeS1wb2ludCBfYW5kXyBCIGlzIGFsc28gZ2VuZXJhdGluZyB0eXBpbmdzLlxuICpcbiAqIE5PVEU6IElmIGEgdGFzayBpcyBub3QgZ2VuZXJhdGluZyB0eXBpbmdzLCB0aGVuIGl0IGNhbm5vdCBhZmZlY3QgYW55dGhpbmcgd2hpY2ggZGVwZW5kcyBvbiBpdHNcbiAqICAgICAgIGVudHJ5LXBvaW50LCByZWdhcmRsZXNzIG9mIHRoZSBkZXBlbmRlbmN5IGdyYXBoLiBUbyBwdXQgdGhpcyBhbm90aGVyIHdheSwgb25seSB0aGUgdGFza1xuICogICAgICAgd2hpY2ggcHJvZHVjZXMgdGhlIHR5cGluZ3MgZm9yIGEgZGVwZW5kZW5jeSBuZWVkcyB0byBoYXZlIGJlZW4gY29tcGxldGVkLlxuICpcbiAqIEFzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uLCB3ZSB0YWtlIGludG8gYWNjb3VudCB0aGUgZmFjdCB0aGF0IGB0YXNrc2AgYXJlIHNvcnRlZCBpbiBzdWNoIGFcbiAqIHdheSB0aGF0IGEgdGFzayBjYW4gb25seSBkZXBlbmQgb24gZWFybGllciB0YXNrcyAoaS5lLiBkZXBlbmRlbmNpZXMgYWx3YXlzIGNvbWUgYmVmb3JlXG4gKiBkZXBlbmRlbnRzIGluIHRoZSBsaXN0IG9mIHRhc2tzKS5cbiAqXG4gKiBAcGFyYW0gdGFza3MgQSAocGFydGlhbGx5IG9yZGVyZWQpIGxpc3Qgb2YgdGFza3MuXG4gKiBAcGFyYW0gZ3JhcGggVGhlIGRlcGVuZGVuY3kgZ3JhcGggYmV0d2VlbiBlbnRyeS1wb2ludHMuXG4gKiBAcmV0dXJuIEEgbWFwIGZyb20gZWFjaCB0YXNrIHRvIHRob3NlIHRhc2tzIGRpcmVjdGx5IGRlcGVuZGVudCB1cG9uIGl0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVRhc2tEZXBlbmRlbmNpZXMoXG4gICAgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcywgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+KTogVGFza0RlcGVuZGVuY2llcyB7XG4gIGNvbnN0IGRlcGVuZGVuY2llcyA9IG5ldyBUYXNrRGVwZW5kZW5jaWVzKCk7XG4gIGNvbnN0IGNhbmRpZGF0ZURlcGVuZGVuY2llcyA9IG5ldyBNYXA8c3RyaW5nLCBUYXNrPigpO1xuXG4gIHRhc2tzLmZvckVhY2godGFzayA9PiB7XG4gICAgY29uc3QgZW50cnlQb2ludFBhdGggPSB0YXNrLmVudHJ5UG9pbnQucGF0aDtcblxuICAgIC8vIEZpbmQgdGhlIGVhcmxpZXIgdGFza3MgKGBjYW5kaWRhdGVEZXBlbmRlbmNpZXNgKSB0aGF0IHRoaXMgdGFzayBkZXBlbmRzIHVwb24uXG4gICAgY29uc3QgZGVwcyA9IGdyYXBoLmRlcGVuZGVuY2llc09mKGVudHJ5UG9pbnRQYXRoKTtcbiAgICBjb25zdCB0YXNrRGVwZW5kZW5jaWVzID0gZGVwcy5maWx0ZXIoZGVwID0+IGNhbmRpZGF0ZURlcGVuZGVuY2llcy5oYXMoZGVwKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZGVwID0+IGNhbmRpZGF0ZURlcGVuZGVuY2llcy5nZXQoZGVwKSAhKTtcblxuICAgIC8vIElmIHRoaXMgdGFzayBoYXMgZGVwZW5kZW5jaWVzLCBhZGQgaXQgdG8gdGhlIGRlcGVuZGVuY2llcyBhbmQgZGVwZW5kZW50cyBtYXBzLlxuICAgIGlmICh0YXNrRGVwZW5kZW5jaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAoY29uc3QgZGVwZW5kZW5jeSBvZiB0YXNrRGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGNvbnN0IHRhc2tEZXBlbmRlbnRzID0gZ2V0RGVwZW5kZW50c1NldChkZXBlbmRlbmNpZXMsIGRlcGVuZGVuY3kpO1xuICAgICAgICB0YXNrRGVwZW5kZW50cy5hZGQodGFzayk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhc2sucHJvY2Vzc0R0cykge1xuICAgICAgLy8gU0FOSVRZIENIRUNLOlxuICAgICAgLy8gVGhlcmUgc2hvdWxkIG9ubHkgYmUgb25lIHRhc2sgcGVyIGVudHJ5LXBvaW50IHRoYXQgZ2VuZXJhdGVzIHR5cGluZ3MgKGFuZCB0aHVzIGNhbiBiZSBhXG4gICAgICAvLyBkZXBlbmRlbmN5IG9mIG90aGVyIHRhc2tzKSwgc28gdGhlIGZvbGxvd2luZyBzaG91bGQgdGhlb3JldGljYWxseSBuZXZlciBoYXBwZW4sIGJ1dCBjaGVja1xuICAgICAgLy8ganVzdCBpbiBjYXNlLlxuICAgICAgaWYgKGNhbmRpZGF0ZURlcGVuZGVuY2llcy5oYXMoZW50cnlQb2ludFBhdGgpKSB7XG4gICAgICAgIGNvbnN0IG90aGVyVGFzayA9IGNhbmRpZGF0ZURlcGVuZGVuY2llcy5nZXQoZW50cnlQb2ludFBhdGgpICE7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdJbnZhcmlhbnQgdmlvbGF0ZWQ6IE11bHRpcGxlIHRhc2tzIGFyZSBhc3NpZ25lZCBnZW5lcmF0aW5nIHR5cGluZ3MgZm9yICcgK1xuICAgICAgICAgICAgYCcke2VudHJ5UG9pbnRQYXRofSc6XFxuICAtICR7c3RyaW5naWZ5VGFzayhvdGhlclRhc2spfVxcbiAgLSAke3N0cmluZ2lmeVRhc2sodGFzayl9YCk7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIHRhc2sgY2FuIHBvdGVudGlhbGx5IGJlIGEgZGVwZW5kZW5jeSAoaS5lLiBpdCBnZW5lcmF0ZXMgdHlwaW5ncyksIHNvIGFkZCBpdCB0byB0aGVcbiAgICAgIC8vIGxpc3Qgb2YgY2FuZGlkYXRlIGRlcGVuZGVuY2llcyBmb3Igc3Vic2VxdWVudCB0YXNrcy5cbiAgICAgIGNhbmRpZGF0ZURlcGVuZGVuY2llcy5zZXQoZW50cnlQb2ludFBhdGgsIHRhc2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIHRhc2sgaXMgbm90IGdlbmVyYXRpbmcgdHlwaW5ncyBzbyB3ZSBuZWVkIHRvIGFkZCBpdCB0byB0aGUgZGVwZW5kZW50cyBvZiB0aGUgdGFzayB0aGF0XG4gICAgICAvLyBkb2VzIGdlbmVyYXRlIHR5cGluZ3MsIGlmIHRoYXQgZXhpc3RzXG4gICAgICBpZiAoY2FuZGlkYXRlRGVwZW5kZW5jaWVzLmhhcyhlbnRyeVBvaW50UGF0aCkpIHtcbiAgICAgICAgY29uc3QgdHlwaW5nc1Rhc2sgPSBjYW5kaWRhdGVEZXBlbmRlbmNpZXMuZ2V0KGVudHJ5UG9pbnRQYXRoKSAhO1xuICAgICAgICBjb25zdCB0eXBpbmdzVGFza0RlcGVuZGVudHMgPSBnZXREZXBlbmRlbnRzU2V0KGRlcGVuZGVuY2llcywgdHlwaW5nc1Rhc2spO1xuICAgICAgICB0eXBpbmdzVGFza0RlcGVuZGVudHMuYWRkKHRhc2spO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGRlcGVuZGVuY2llcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlcGVuZGVudHNTZXQobWFwOiBUYXNrRGVwZW5kZW5jaWVzLCB0YXNrOiBUYXNrKTogU2V0PFRhc2s+IHtcbiAgaWYgKCFtYXAuaGFzKHRhc2spKSB7XG4gICAgbWFwLnNldCh0YXNrLCBuZXcgU2V0KCkpO1xuICB9XG4gIHJldHVybiBtYXAuZ2V0KHRhc2spICE7XG59XG5cbi8qKlxuICogSW52ZXJ0IHRoZSBnaXZlbiBtYXBwaW5nIG9mIFRhc2sgZGVwZW5kZW5jaWVzLlxuICpcbiAqIEBwYXJhbSBkZXBlbmRlbmNpZXMgVGhlIG1hcHBpbmcgb2YgdGFza3MgdG8gdGhlIHRhc2tzIHRoYXQgZGVwZW5kIHVwb24gdGhlbS5cbiAqIEByZXR1cm5zIEEgbWFwcGluZyBvZiB0YXNrcyB0byB0aGUgdGFza3MgdGhhdCB0aGV5IGRlcGVuZCB1cG9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QmxvY2tlZFRhc2tzKGRlcGVuZGVuY2llczogVGFza0RlcGVuZGVuY2llcyk6IE1hcDxUYXNrLCBTZXQ8VGFzaz4+IHtcbiAgY29uc3QgYmxvY2tlZFRhc2tzID0gbmV3IE1hcDxUYXNrLCBTZXQ8VGFzaz4+KCk7XG4gIGZvciAoY29uc3QgW2RlcGVuZGVuY3ksIGRlcGVuZGVudHNdIG9mIGRlcGVuZGVuY2llcykge1xuICAgIGZvciAoY29uc3QgZGVwZW5kZW50IG9mIGRlcGVuZGVudHMpIHtcbiAgICAgIGNvbnN0IGRlcGVuZGVudFNldCA9IGdldERlcGVuZGVudHNTZXQoYmxvY2tlZFRhc2tzLCBkZXBlbmRlbnQpO1xuICAgICAgZGVwZW5kZW50U2V0LmFkZChkZXBlbmRlbmN5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJsb2NrZWRUYXNrcztcbn1cblxuLyoqXG4gKiBTb3J0IGEgbGlzdCBvZiB0YXNrcyBieSBwcmlvcml0eS5cbiAqXG4gKiBQcmlvcml0eSBpcyBkZXRlcm1pbmVkIGJ5IHRoZSBudW1iZXIgb2Ygb3RoZXIgdGFza3MgdGhhdCBhIHRhc2sgaXMgKHRyYW5zaXRpdmVseSkgYmxvY2tpbmc6XG4gKiBUaGUgbW9yZSB0YXNrcyBhIHRhc2sgaXMgYmxvY2tpbmcgdGhlIGhpZ2hlciBpdHMgcHJpb3JpdHkgaXMsIGJlY2F1c2UgcHJvY2Vzc2luZyBpdCB3aWxsXG4gKiBwb3RlbnRpYWxseSB1bmJsb2NrIG1vcmUgdGFza3MuXG4gKlxuICogVG8ga2VlcCB0aGUgYmVoYXZpb3IgcHJlZGljdGFibGUsIGlmIHR3byB0YXNrcyBibG9jayB0aGUgc2FtZSBudW1iZXIgb2Ygb3RoZXIgdGFza3MsIHRoZWlyXG4gKiByZWxhdGl2ZSBvcmRlciBpbiB0aGUgb3JpZ2luYWwgYHRhc2tzYCBsaXN0cyBpcyBwcmVzZXJ2ZWQuXG4gKlxuICogQHBhcmFtIHRhc2tzIEEgKHBhcnRpYWxseSBvcmRlcmVkKSBsaXN0IG9mIHRhc2tzLlxuICogQHBhcmFtIGRlcGVuZGVuY2llcyBUaGUgbWFwcGluZyBvZiB0YXNrcyB0byB0aGUgdGFza3MgdGhhdCBkZXBlbmQgdXBvbiB0aGVtLlxuICogQHJldHVybiBUaGUgbGlzdCBvZiB0YXNrcyBzb3J0ZWQgYnkgcHJpb3JpdHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzb3J0VGFza3NCeVByaW9yaXR5KFxuICAgIHRhc2tzOiBQYXJ0aWFsbHlPcmRlcmVkVGFza3MsIGRlcGVuZGVuY2llczogVGFza0RlcGVuZGVuY2llcyk6IFBhcnRpYWxseU9yZGVyZWRUYXNrcyB7XG4gIGNvbnN0IHByaW9yaXR5UGVyVGFzayA9IG5ldyBNYXA8VGFzaywgW251bWJlciwgbnVtYmVyXT4oKTtcbiAgY29uc3QgY29tcHV0ZVByaW9yaXR5ID0gKHRhc2s6IFRhc2ssIGlkeDogbnVtYmVyKTpcbiAgICAgIFtudW1iZXIsIG51bWJlcl0gPT4gW2RlcGVuZGVuY2llcy5oYXModGFzaykgPyBkZXBlbmRlbmNpZXMuZ2V0KHRhc2spICEuc2l6ZSA6IDAsIGlkeF07XG5cbiAgdGFza3MuZm9yRWFjaCgodGFzaywgaSkgPT4gcHJpb3JpdHlQZXJUYXNrLnNldCh0YXNrLCBjb21wdXRlUHJpb3JpdHkodGFzaywgaSkpKTtcblxuICByZXR1cm4gdGFza3Muc2xpY2UoKS5zb3J0KCh0YXNrMSwgdGFzazIpID0+IHtcbiAgICBjb25zdCBbcDEsIGlkeDFdID0gcHJpb3JpdHlQZXJUYXNrLmdldCh0YXNrMSkgITtcbiAgICBjb25zdCBbcDIsIGlkeDJdID0gcHJpb3JpdHlQZXJUYXNrLmdldCh0YXNrMikgITtcblxuICAgIHJldHVybiAocDIgLSBwMSkgfHwgKGlkeDEgLSBpZHgyKTtcbiAgfSk7XG59XG4iXX0=