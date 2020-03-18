(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/tasks/completion", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/entry_point"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    /**
     * Compose a group of TaskCompletedHandlers into a single TaskCompletedCallback.
     *
     * The compose callback will receive an outcome and will delegate to the appropriate handler based
     * on this outcome.
     *
     * @param callbacks a map of outcomes to handlers.
     */
    function composeTaskCompletedCallbacks(callbacks) {
        return function (task, outcome, message) {
            var callback = callbacks[outcome];
            if (callback === undefined) {
                throw new Error("Unknown task outcome: \"" + outcome + "\" - supported outcomes: " + JSON.stringify(Object.keys(callbacks)));
            }
            callback(task, message);
        };
    }
    exports.composeTaskCompletedCallbacks = composeTaskCompletedCallbacks;
    /**
     * Create a handler that will mark the entry-points in a package as being processed.
     *
     * @param pkgJsonUpdater The service used to update the package.json
     */
    function createMarkAsProcessedHandler(pkgJsonUpdater) {
        return function (task) {
            var entryPoint = task.entryPoint, formatPropertiesToMarkAsProcessed = task.formatPropertiesToMarkAsProcessed, processDts = task.processDts;
            var packageJsonPath = file_system_1.resolve(entryPoint.path, 'package.json');
            var propsToMarkAsProcessed = tslib_1.__spread(formatPropertiesToMarkAsProcessed);
            if (processDts) {
                propsToMarkAsProcessed.push('typings');
            }
            build_marker_1.markAsProcessed(pkgJsonUpdater, entryPoint.packageJson, packageJsonPath, propsToMarkAsProcessed);
        };
    }
    exports.createMarkAsProcessedHandler = createMarkAsProcessedHandler;
    /**
     * Create a handler that will throw an error.
     */
    function createThrowErrorHandler(fs) {
        return function (task, message) {
            var format = entry_point_1.getEntryPointFormat(fs, task.entryPoint, task.formatProperty);
            throw new Error("Failed to compile entry-point " + task.entryPoint.name + " (" + task.formatProperty + " as " + format + ")" +
                (message !== null ? " due to " + message : ''));
        };
    }
    exports.createThrowErrorHandler = createThrowErrorHandler;
    /**
     * Create a handler that logs an error and marks the task as failed.
     */
    function createLogErrorHandler(logger, fs, taskQueue) {
        return function (task, message) {
            taskQueue.markAsFailed(task);
            var format = entry_point_1.getEntryPointFormat(fs, task.entryPoint, task.formatProperty);
            logger.error("Failed to compile entry-point " + task.entryPoint.name + " (" + task.formatProperty + " as " + format + ")" +
                (message !== null ? " due to " + message : ''));
        };
    }
    exports.createLogErrorHandler = createLogErrorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9leGVjdXRpb24vdGFza3MvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBc0U7SUFFdEUscUZBQTREO0lBQzVELG1GQUE0RjtJQVk1Rjs7Ozs7OztPQU9HO0lBQ0gsU0FBZ0IsNkJBQTZCLENBQ3pDLFNBQThEO1FBQ2hFLE9BQU8sVUFBQyxJQUFVLEVBQUUsT0FBOEIsRUFBRSxPQUFzQjtZQUN4RSxJQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDcEMsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO2dCQUMxQixNQUFNLElBQUksS0FBSyxDQUNYLDZCQUEwQixPQUFPLGlDQUEyQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUcsQ0FBQyxDQUFDO2FBQzNHO1lBQ0QsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUM7SUFDSixDQUFDO0lBVkQsc0VBVUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBZ0IsNEJBQTRCLENBQUMsY0FBa0M7UUFFN0UsT0FBTyxVQUFDLElBQVU7WUFDVCxJQUFBLDRCQUFVLEVBQUUsMEVBQWlDLEVBQUUsNEJBQVUsQ0FBUztZQUN6RSxJQUFNLGVBQWUsR0FBRyxxQkFBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDakUsSUFBTSxzQkFBc0Isb0JBQ3BCLGlDQUFpQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxVQUFVLEVBQUU7Z0JBQ2Qsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ3hDO1lBQ0QsOEJBQWUsQ0FDWCxjQUFjLEVBQUUsVUFBVSxDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUN2RixDQUFDLENBQUM7SUFDSixDQUFDO0lBYkQsb0VBYUM7SUFFRDs7T0FFRztJQUNILFNBQWdCLHVCQUF1QixDQUFDLEVBQWM7UUFDcEQsT0FBTyxVQUFDLElBQVUsRUFBRSxPQUFzQjtZQUN4QyxJQUFNLE1BQU0sR0FBRyxpQ0FBbUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDN0UsTUFBTSxJQUFJLEtBQUssQ0FDWCxtQ0FBaUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQUssSUFBSSxDQUFDLGNBQWMsWUFBTyxNQUFNLE1BQUc7Z0JBQzdGLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBVyxPQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQVBELDBEQU9DO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixxQkFBcUIsQ0FDakMsTUFBYyxFQUFFLEVBQWMsRUFBRSxTQUFvQjtRQUN0RCxPQUFPLFVBQUMsSUFBVSxFQUFFLE9BQXNCO1lBQ3hDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsSUFBTSxNQUFNLEdBQUcsaUNBQW1CLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzdFLE1BQU0sQ0FBQyxLQUFLLENBQ1IsbUNBQWlDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFLLElBQUksQ0FBQyxjQUFjLFlBQU8sTUFBTSxNQUFHO2dCQUM3RixDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLGFBQVcsT0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQztJQUNKLENBQUM7SUFURCxzREFTQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7RmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge21hcmtBc1Byb2Nlc3NlZH0gZnJvbSAnLi4vLi4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7UGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzLCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuLi8uLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi4vLi4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge1Rhc2ssIFRhc2tDb21wbGV0ZWRDYWxsYmFjaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLCBUYXNrUXVldWV9IGZyb20gJy4vYXBpJztcblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHRoYXQgY2FuIGhhbmRsZSBhIHNwZWNpZmljIG91dGNvbWUgb2YgYSB0YXNrIGNvbXBsZXRpb24uXG4gKlxuICogVGhlc2UgZnVuY3Rpb25zIGNhbiBiZSBjb21wb3NlZCB1c2luZyB0aGUgYGNvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzKClgXG4gKiB0byBjcmVhdGUgYSBgVGFza0NvbXBsZXRlZENhbGxiYWNrYCBmdW5jdGlvbiB0aGF0IGNhbiBiZSBwYXNzZWQgdG8gYW4gYEV4ZWN1dG9yYC5cbiAqL1xuZXhwb3J0IHR5cGUgVGFza0NvbXBsZXRlZEhhbmRsZXIgPSAodGFzazogVGFzaywgbWVzc2FnZTogc3RyaW5nIHwgbnVsbCkgPT4gdm9pZDtcblxuLyoqXG4gKiBDb21wb3NlIGEgZ3JvdXAgb2YgVGFza0NvbXBsZXRlZEhhbmRsZXJzIGludG8gYSBzaW5nbGUgVGFza0NvbXBsZXRlZENhbGxiYWNrLlxuICpcbiAqIFRoZSBjb21wb3NlIGNhbGxiYWNrIHdpbGwgcmVjZWl2ZSBhbiBvdXRjb21lIGFuZCB3aWxsIGRlbGVnYXRlIHRvIHRoZSBhcHByb3ByaWF0ZSBoYW5kbGVyIGJhc2VkXG4gKiBvbiB0aGlzIG91dGNvbWUuXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrcyBhIG1hcCBvZiBvdXRjb21lcyB0byBoYW5kbGVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzKFxuICAgIGNhbGxiYWNrczogUmVjb3JkPFRhc2tQcm9jZXNzaW5nT3V0Y29tZSwgVGFza0NvbXBsZXRlZEhhbmRsZXI+KTogVGFza0NvbXBsZXRlZENhbGxiYWNrIHtcbiAgcmV0dXJuICh0YXNrOiBUYXNrLCBvdXRjb21lOiBUYXNrUHJvY2Vzc2luZ091dGNvbWUsIG1lc3NhZ2U6IHN0cmluZyB8IG51bGwpOiB2b2lkID0+IHtcbiAgICBjb25zdCBjYWxsYmFjayA9IGNhbGxiYWNrc1tvdXRjb21lXTtcbiAgICBpZiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBVbmtub3duIHRhc2sgb3V0Y29tZTogXCIke291dGNvbWV9XCIgLSBzdXBwb3J0ZWQgb3V0Y29tZXM6ICR7SlNPTi5zdHJpbmdpZnkoT2JqZWN0LmtleXMoY2FsbGJhY2tzKSl9YCk7XG4gICAgfVxuICAgIGNhbGxiYWNrKHRhc2ssIG1lc3NhZ2UpO1xuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGhhbmRsZXIgdGhhdCB3aWxsIG1hcmsgdGhlIGVudHJ5LXBvaW50cyBpbiBhIHBhY2thZ2UgYXMgYmVpbmcgcHJvY2Vzc2VkLlxuICpcbiAqIEBwYXJhbSBwa2dKc29uVXBkYXRlciBUaGUgc2VydmljZSB1c2VkIHRvIHVwZGF0ZSB0aGUgcGFja2FnZS5qc29uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNYXJrQXNQcm9jZXNzZWRIYW5kbGVyKHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIpOlxuICAgIFRhc2tDb21wbGV0ZWRIYW5kbGVyIHtcbiAgcmV0dXJuICh0YXNrOiBUYXNrKTogdm9pZCA9PiB7XG4gICAgY29uc3Qge2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30gPSB0YXNrO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUoZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZDogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzW10gPVxuICAgICAgICBbLi4uZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkXTtcbiAgICBpZiAocHJvY2Vzc0R0cykge1xuICAgICAgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZC5wdXNoKCd0eXBpbmdzJyk7XG4gICAgfVxuICAgIG1hcmtBc1Byb2Nlc3NlZChcbiAgICAgICAgcGtnSnNvblVwZGF0ZXIsIGVudHJ5UG9pbnQucGFja2FnZUpzb24sIHBhY2thZ2VKc29uUGF0aCwgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZCk7XG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgaGFuZGxlciB0aGF0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUaHJvd0Vycm9ySGFuZGxlcihmczogRmlsZVN5c3RlbSk6IFRhc2tDb21wbGV0ZWRIYW5kbGVyIHtcbiAgcmV0dXJuICh0YXNrOiBUYXNrLCBtZXNzYWdlOiBzdHJpbmcgfCBudWxsKTogdm9pZCA9PiB7XG4gICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChmcywgdGFzay5lbnRyeVBvaW50LCB0YXNrLmZvcm1hdFByb3BlcnR5KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBlbnRyeS1wb2ludCAke3Rhc2suZW50cnlQb2ludC5uYW1lfSAoJHt0YXNrLmZvcm1hdFByb3BlcnR5fSBhcyAke2Zvcm1hdH0pYCArXG4gICAgICAgIChtZXNzYWdlICE9PSBudWxsID8gYCBkdWUgdG8gJHttZXNzYWdlfWAgOiAnJykpO1xuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGhhbmRsZXIgdGhhdCBsb2dzIGFuIGVycm9yIGFuZCBtYXJrcyB0aGUgdGFzayBhcyBmYWlsZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2dFcnJvckhhbmRsZXIoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIGZzOiBGaWxlU3lzdGVtLCB0YXNrUXVldWU6IFRhc2tRdWV1ZSk6IFRhc2tDb21wbGV0ZWRIYW5kbGVyIHtcbiAgcmV0dXJuICh0YXNrOiBUYXNrLCBtZXNzYWdlOiBzdHJpbmcgfCBudWxsKTogdm9pZCA9PiB7XG4gICAgdGFza1F1ZXVlLm1hcmtBc0ZhaWxlZCh0YXNrKTtcbiAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KGZzLCB0YXNrLmVudHJ5UG9pbnQsIHRhc2suZm9ybWF0UHJvcGVydHkpO1xuICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgYEZhaWxlZCB0byBjb21waWxlIGVudHJ5LXBvaW50ICR7dGFzay5lbnRyeVBvaW50Lm5hbWV9ICgke3Rhc2suZm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fSlgICtcbiAgICAgICAgKG1lc3NhZ2UgIT09IG51bGwgPyBgIGR1ZSB0byAke21lc3NhZ2V9YCA6ICcnKSk7XG4gIH07XG59XG4iXX0=