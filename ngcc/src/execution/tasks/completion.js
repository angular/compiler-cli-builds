(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/tasks/completion", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/execution/tasks/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createLogErrorHandler = exports.createThrowErrorHandler = exports.createMarkAsProcessedHandler = exports.composeTaskCompletedCallbacks = void 0;
    var tslib_1 = require("tslib");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var api_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/api");
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
    function createMarkAsProcessedHandler(fs, pkgJsonUpdater) {
        return function (task) {
            var entryPoint = task.entryPoint, formatPropertiesToMarkAsProcessed = task.formatPropertiesToMarkAsProcessed, processDts = task.processDts;
            var packageJsonPath = fs.resolve(entryPoint.path, 'package.json');
            var propsToMarkAsProcessed = (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(formatPropertiesToMarkAsProcessed), false);
            if (processDts !== api_1.DtsProcessing.No) {
                propsToMarkAsProcessed.push('typings');
            }
            (0, build_marker_1.markAsProcessed)(pkgJsonUpdater, entryPoint.packageJson, packageJsonPath, propsToMarkAsProcessed);
        };
    }
    exports.createMarkAsProcessedHandler = createMarkAsProcessedHandler;
    /**
     * Create a handler that will throw an error.
     */
    function createThrowErrorHandler(fs) {
        return function (task, message) {
            throw new Error(createErrorMessage(fs, task, message));
        };
    }
    exports.createThrowErrorHandler = createThrowErrorHandler;
    /**
     * Create a handler that logs an error and marks the task as failed.
     */
    function createLogErrorHandler(logger, fs, taskQueue) {
        return function (task, message) {
            taskQueue.markAsFailed(task);
            logger.error(createErrorMessage(fs, task, message));
        };
    }
    exports.createLogErrorHandler = createLogErrorHandler;
    function createErrorMessage(fs, task, message) {
        var _a;
        var jsFormat = "`" + task.formatProperty + "` as " + ((_a = (0, entry_point_1.getEntryPointFormat)(fs, task.entryPoint, task.formatProperty)) !== null && _a !== void 0 ? _a : 'unknown format');
        var format = task.typingsOnly ? "typings only using " + jsFormat : jsFormat;
        message = message !== null ? " due to " + message : '';
        return "Failed to compile entry-point " + task.entryPoint.name + " (" + format + ")" + message;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9leGVjdXRpb24vdGFza3MvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBU0EscUZBQTREO0lBQzVELG1GQUE0RjtJQUc1RiwwRUFBbUc7SUFVbkc7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLDZCQUE2QixDQUN6QyxTQUE4RDtRQUNoRSxPQUFPLFVBQUMsSUFBVSxFQUFFLE9BQThCLEVBQUUsT0FBb0I7WUFDdEUsSUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BDLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtnQkFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBMEIsT0FBTyxpQ0FDN0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFHLENBQUMsQ0FBQzthQUMvQztZQUNELFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQVZELHNFQVVDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQWdCLDRCQUE0QixDQUN4QyxFQUFvQixFQUFFLGNBQWtDO1FBQzFELE9BQU8sVUFBQyxJQUFVO1lBQ1QsSUFBQSxVQUFVLEdBQW1ELElBQUksV0FBdkQsRUFBRSxpQ0FBaUMsR0FBZ0IsSUFBSSxrQ0FBcEIsRUFBRSxVQUFVLEdBQUksSUFBSSxXQUFSLENBQVM7WUFDekUsSUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3BFLElBQU0sc0JBQXNCLHNEQUNwQixpQ0FBaUMsU0FBQyxDQUFDO1lBQzNDLElBQUksVUFBVSxLQUFLLG1CQUFhLENBQUMsRUFBRSxFQUFFO2dCQUNuQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDeEM7WUFDRCxJQUFBLDhCQUFlLEVBQ1gsY0FBYyxFQUFFLFVBQVUsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDdkYsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQWJELG9FQWFDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxFQUFzQjtRQUM1RCxPQUFPLFVBQUMsSUFBVSxFQUFFLE9BQW9CO1lBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQztJQUNKLENBQUM7SUFKRCwwREFJQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IscUJBQXFCLENBQ2pDLE1BQWMsRUFBRSxFQUFzQixFQUFFLFNBQW9CO1FBQzlELE9BQU8sVUFBQyxJQUFVLEVBQUUsT0FBb0I7WUFDdEMsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUM7SUFDSixDQUFDO0lBTkQsc0RBTUM7SUFFRCxTQUFTLGtCQUFrQixDQUFDLEVBQXNCLEVBQUUsSUFBVSxFQUFFLE9BQW9COztRQUNsRixJQUFNLFFBQVEsR0FBRyxNQUFLLElBQUksQ0FBQyxjQUFjLGNBQ3JDLE1BQUEsSUFBQSxpQ0FBbUIsRUFBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLG1DQUFJLGdCQUFnQixDQUFFLENBQUM7UUFDeEYsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsd0JBQXNCLFFBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzlFLE9BQU8sR0FBRyxPQUFPLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFXLE9BQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3ZELE9BQU8sbUNBQWlDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFLLE1BQU0sTUFBRyxHQUFHLE9BQU8sQ0FBQztJQUN2RixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1BhdGhNYW5pcHVsYXRpb24sIFJlYWRvbmx5RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvbG9nZ2luZyc7XG5pbXBvcnQge21hcmtBc1Byb2Nlc3NlZH0gZnJvbSAnLi4vLi4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7Z2V0RW50cnlQb2ludEZvcm1hdCwgUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzfSBmcm9tICcuLi8uLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi4vLi4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5cbmltcG9ydCB7RHRzUHJvY2Vzc2luZywgVGFzaywgVGFza0NvbXBsZXRlZENhbGxiYWNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUsIFRhc2tRdWV1ZX0gZnJvbSAnLi9hcGknO1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gdGhhdCBjYW4gaGFuZGxlIGEgc3BlY2lmaWMgb3V0Y29tZSBvZiBhIHRhc2sgY29tcGxldGlvbi5cbiAqXG4gKiBUaGVzZSBmdW5jdGlvbnMgY2FuIGJlIGNvbXBvc2VkIHVzaW5nIHRoZSBgY29tcG9zZVRhc2tDb21wbGV0ZWRDYWxsYmFja3MoKWBcbiAqIHRvIGNyZWF0ZSBhIGBUYXNrQ29tcGxldGVkQ2FsbGJhY2tgIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIHBhc3NlZCB0byBhbiBgRXhlY3V0b3JgLlxuICovXG5leHBvcnQgdHlwZSBUYXNrQ29tcGxldGVkSGFuZGxlciA9ICh0YXNrOiBUYXNrLCBtZXNzYWdlOiBzdHJpbmd8bnVsbCkgPT4gdm9pZDtcblxuLyoqXG4gKiBDb21wb3NlIGEgZ3JvdXAgb2YgVGFza0NvbXBsZXRlZEhhbmRsZXJzIGludG8gYSBzaW5nbGUgVGFza0NvbXBsZXRlZENhbGxiYWNrLlxuICpcbiAqIFRoZSBjb21wb3NlIGNhbGxiYWNrIHdpbGwgcmVjZWl2ZSBhbiBvdXRjb21lIGFuZCB3aWxsIGRlbGVnYXRlIHRvIHRoZSBhcHByb3ByaWF0ZSBoYW5kbGVyIGJhc2VkXG4gKiBvbiB0aGlzIG91dGNvbWUuXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrcyBhIG1hcCBvZiBvdXRjb21lcyB0byBoYW5kbGVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzKFxuICAgIGNhbGxiYWNrczogUmVjb3JkPFRhc2tQcm9jZXNzaW5nT3V0Y29tZSwgVGFza0NvbXBsZXRlZEhhbmRsZXI+KTogVGFza0NvbXBsZXRlZENhbGxiYWNrIHtcbiAgcmV0dXJuICh0YXNrOiBUYXNrLCBvdXRjb21lOiBUYXNrUHJvY2Vzc2luZ091dGNvbWUsIG1lc3NhZ2U6IHN0cmluZ3xudWxsKTogdm9pZCA9PiB7XG4gICAgY29uc3QgY2FsbGJhY2sgPSBjYWxsYmFja3Nbb3V0Y29tZV07XG4gICAgaWYgKGNhbGxiYWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0YXNrIG91dGNvbWU6IFwiJHtvdXRjb21lfVwiIC0gc3VwcG9ydGVkIG91dGNvbWVzOiAke1xuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KE9iamVjdC5rZXlzKGNhbGxiYWNrcykpfWApO1xuICAgIH1cbiAgICBjYWxsYmFjayh0YXNrLCBtZXNzYWdlKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBoYW5kbGVyIHRoYXQgd2lsbCBtYXJrIHRoZSBlbnRyeS1wb2ludHMgaW4gYSBwYWNrYWdlIGFzIGJlaW5nIHByb2Nlc3NlZC5cbiAqXG4gKiBAcGFyYW0gcGtnSnNvblVwZGF0ZXIgVGhlIHNlcnZpY2UgdXNlZCB0byB1cGRhdGUgdGhlIHBhY2thZ2UuanNvblxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWFya0FzUHJvY2Vzc2VkSGFuZGxlcihcbiAgICBmczogUGF0aE1hbmlwdWxhdGlvbiwgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcik6IFRhc2tDb21wbGV0ZWRIYW5kbGVyIHtcbiAgcmV0dXJuICh0YXNrOiBUYXNrKTogdm9pZCA9PiB7XG4gICAgY29uc3Qge2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30gPSB0YXNrO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGZzLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZDogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzW10gPVxuICAgICAgICBbLi4uZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkXTtcbiAgICBpZiAocHJvY2Vzc0R0cyAhPT0gRHRzUHJvY2Vzc2luZy5Obykge1xuICAgICAgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZC5wdXNoKCd0eXBpbmdzJyk7XG4gICAgfVxuICAgIG1hcmtBc1Byb2Nlc3NlZChcbiAgICAgICAgcGtnSnNvblVwZGF0ZXIsIGVudHJ5UG9pbnQucGFja2FnZUpzb24sIHBhY2thZ2VKc29uUGF0aCwgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZCk7XG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgaGFuZGxlciB0aGF0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUaHJvd0Vycm9ySGFuZGxlcihmczogUmVhZG9ubHlGaWxlU3lzdGVtKTogVGFza0NvbXBsZXRlZEhhbmRsZXIge1xuICByZXR1cm4gKHRhc2s6IFRhc2ssIG1lc3NhZ2U6IHN0cmluZ3xudWxsKTogdm9pZCA9PiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGNyZWF0ZUVycm9yTWVzc2FnZShmcywgdGFzaywgbWVzc2FnZSkpO1xuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGhhbmRsZXIgdGhhdCBsb2dzIGFuIGVycm9yIGFuZCBtYXJrcyB0aGUgdGFzayBhcyBmYWlsZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2dFcnJvckhhbmRsZXIoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIGZzOiBSZWFkb25seUZpbGVTeXN0ZW0sIHRhc2tRdWV1ZTogVGFza1F1ZXVlKTogVGFza0NvbXBsZXRlZEhhbmRsZXIge1xuICByZXR1cm4gKHRhc2s6IFRhc2ssIG1lc3NhZ2U6IHN0cmluZ3xudWxsKTogdm9pZCA9PiB7XG4gICAgdGFza1F1ZXVlLm1hcmtBc0ZhaWxlZCh0YXNrKTtcbiAgICBsb2dnZXIuZXJyb3IoY3JlYXRlRXJyb3JNZXNzYWdlKGZzLCB0YXNrLCBtZXNzYWdlKSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVycm9yTWVzc2FnZShmczogUmVhZG9ubHlGaWxlU3lzdGVtLCB0YXNrOiBUYXNrLCBtZXNzYWdlOiBzdHJpbmd8bnVsbCk6IHN0cmluZyB7XG4gIGNvbnN0IGpzRm9ybWF0ID0gYFxcYCR7dGFzay5mb3JtYXRQcm9wZXJ0eX1cXGAgYXMgJHtcbiAgICAgIGdldEVudHJ5UG9pbnRGb3JtYXQoZnMsIHRhc2suZW50cnlQb2ludCwgdGFzay5mb3JtYXRQcm9wZXJ0eSkgPz8gJ3Vua25vd24gZm9ybWF0J31gO1xuICBjb25zdCBmb3JtYXQgPSB0YXNrLnR5cGluZ3NPbmx5ID8gYHR5cGluZ3Mgb25seSB1c2luZyAke2pzRm9ybWF0fWAgOiBqc0Zvcm1hdDtcbiAgbWVzc2FnZSA9IG1lc3NhZ2UgIT09IG51bGwgPyBgIGR1ZSB0byAke21lc3NhZ2V9YCA6ICcnO1xuICByZXR1cm4gYEZhaWxlZCB0byBjb21waWxlIGVudHJ5LXBvaW50ICR7dGFzay5lbnRyeVBvaW50Lm5hbWV9ICgke2Zvcm1hdH0pYCArIG1lc3NhZ2U7XG59XG4iXX0=