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
    exports.createLogErrorHandler = exports.createThrowErrorHandler = exports.createMarkAsProcessedHandler = exports.composeTaskCompletedCallbacks = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9leGVjdXRpb24vdGFza3MvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXNFO0lBRXRFLHFGQUE0RDtJQUM1RCxtRkFBNEY7SUFhNUY7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLDZCQUE2QixDQUN6QyxTQUE4RDtRQUNoRSxPQUFPLFVBQUMsSUFBVSxFQUFFLE9BQThCLEVBQUUsT0FBb0I7WUFDdEUsSUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BDLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtnQkFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBMEIsT0FBTyxpQ0FDN0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFHLENBQUMsQ0FBQzthQUMvQztZQUNELFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQVZELHNFQVVDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQWdCLDRCQUE0QixDQUFDLGNBQWtDO1FBRTdFLE9BQU8sVUFBQyxJQUFVO1lBQ1QsSUFBQSxVQUFVLEdBQW1ELElBQUksV0FBdkQsRUFBRSxpQ0FBaUMsR0FBZ0IsSUFBSSxrQ0FBcEIsRUFBRSxVQUFVLEdBQUksSUFBSSxXQUFSLENBQVM7WUFDekUsSUFBTSxlQUFlLEdBQUcscUJBQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2pFLElBQU0sc0JBQXNCLG9CQUNwQixpQ0FBaUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksVUFBVSxFQUFFO2dCQUNkLHNCQUFzQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUN4QztZQUNELDhCQUFlLENBQ1gsY0FBYyxFQUFFLFVBQVUsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDdkYsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQWJELG9FQWFDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxFQUFjO1FBQ3BELE9BQU8sVUFBQyxJQUFVLEVBQUUsT0FBb0I7WUFDdEMsSUFBTSxNQUFNLEdBQUcsaUNBQW1CLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzdFLE1BQU0sSUFBSSxLQUFLLENBQ1gsbUNBQWlDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFLLElBQUksQ0FBQyxjQUFjLFlBQ3pFLE1BQU0sTUFBRztnQkFDYixDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLGFBQVcsT0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQztJQUNKLENBQUM7SUFSRCwwREFRQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IscUJBQXFCLENBQ2pDLE1BQWMsRUFBRSxFQUFjLEVBQUUsU0FBb0I7UUFDdEQsT0FBTyxVQUFDLElBQVUsRUFBRSxPQUFvQjtZQUN0QyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLElBQU0sTUFBTSxHQUFHLGlDQUFtQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM3RSxNQUFNLENBQUMsS0FBSyxDQUNSLG1DQUFpQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksVUFBSyxJQUFJLENBQUMsY0FBYyxZQUN6RSxNQUFNLE1BQUc7Z0JBQ2IsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFXLE9BQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUM7SUFDSixDQUFDO0lBVkQsc0RBVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0ZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHttYXJrQXNQcm9jZXNzZWR9IGZyb20gJy4uLy4uL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge2dldEVudHJ5UG9pbnRGb3JtYXQsIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc30gZnJvbSAnLi4vLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4uLy4uL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuXG5pbXBvcnQge1Rhc2ssIFRhc2tDb21wbGV0ZWRDYWxsYmFjaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLCBUYXNrUXVldWV9IGZyb20gJy4vYXBpJztcblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHRoYXQgY2FuIGhhbmRsZSBhIHNwZWNpZmljIG91dGNvbWUgb2YgYSB0YXNrIGNvbXBsZXRpb24uXG4gKlxuICogVGhlc2UgZnVuY3Rpb25zIGNhbiBiZSBjb21wb3NlZCB1c2luZyB0aGUgYGNvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzKClgXG4gKiB0byBjcmVhdGUgYSBgVGFza0NvbXBsZXRlZENhbGxiYWNrYCBmdW5jdGlvbiB0aGF0IGNhbiBiZSBwYXNzZWQgdG8gYW4gYEV4ZWN1dG9yYC5cbiAqL1xuZXhwb3J0IHR5cGUgVGFza0NvbXBsZXRlZEhhbmRsZXIgPSAodGFzazogVGFzaywgbWVzc2FnZTogc3RyaW5nfG51bGwpID0+IHZvaWQ7XG5cbi8qKlxuICogQ29tcG9zZSBhIGdyb3VwIG9mIFRhc2tDb21wbGV0ZWRIYW5kbGVycyBpbnRvIGEgc2luZ2xlIFRhc2tDb21wbGV0ZWRDYWxsYmFjay5cbiAqXG4gKiBUaGUgY29tcG9zZSBjYWxsYmFjayB3aWxsIHJlY2VpdmUgYW4gb3V0Y29tZSBhbmQgd2lsbCBkZWxlZ2F0ZSB0byB0aGUgYXBwcm9wcmlhdGUgaGFuZGxlciBiYXNlZFxuICogb24gdGhpcyBvdXRjb21lLlxuICpcbiAqIEBwYXJhbSBjYWxsYmFja3MgYSBtYXAgb2Ygb3V0Y29tZXMgdG8gaGFuZGxlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wb3NlVGFza0NvbXBsZXRlZENhbGxiYWNrcyhcbiAgICBjYWxsYmFja3M6IFJlY29yZDxUYXNrUHJvY2Vzc2luZ091dGNvbWUsIFRhc2tDb21wbGV0ZWRIYW5kbGVyPik6IFRhc2tDb21wbGV0ZWRDYWxsYmFjayB7XG4gIHJldHVybiAodGFzazogVGFzaywgb3V0Y29tZTogVGFza1Byb2Nlc3NpbmdPdXRjb21lLCBtZXNzYWdlOiBzdHJpbmd8bnVsbCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gY2FsbGJhY2tzW291dGNvbWVdO1xuICAgIGlmIChjYWxsYmFjayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdGFzayBvdXRjb21lOiBcIiR7b3V0Y29tZX1cIiAtIHN1cHBvcnRlZCBvdXRjb21lczogJHtcbiAgICAgICAgICBKU09OLnN0cmluZ2lmeShPYmplY3Qua2V5cyhjYWxsYmFja3MpKX1gKTtcbiAgICB9XG4gICAgY2FsbGJhY2sodGFzaywgbWVzc2FnZSk7XG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgaGFuZGxlciB0aGF0IHdpbGwgbWFyayB0aGUgZW50cnktcG9pbnRzIGluIGEgcGFja2FnZSBhcyBiZWluZyBwcm9jZXNzZWQuXG4gKlxuICogQHBhcmFtIHBrZ0pzb25VcGRhdGVyIFRoZSBzZXJ2aWNlIHVzZWQgdG8gdXBkYXRlIHRoZSBwYWNrYWdlLmpzb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1hcmtBc1Byb2Nlc3NlZEhhbmRsZXIocGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcik6XG4gICAgVGFza0NvbXBsZXRlZEhhbmRsZXIge1xuICByZXR1cm4gKHRhc2s6IFRhc2spOiB2b2lkID0+IHtcbiAgICBjb25zdCB7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkLCBwcm9jZXNzRHRzfSA9IHRhc2s7XG4gICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZShlbnRyeVBvaW50LnBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgICBjb25zdCBwcm9wc1RvTWFya0FzUHJvY2Vzc2VkOiBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNbXSA9XG4gICAgICAgIFsuLi5mb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWRdO1xuICAgIGlmIChwcm9jZXNzRHRzKSB7XG4gICAgICBwcm9wc1RvTWFya0FzUHJvY2Vzc2VkLnB1c2goJ3R5cGluZ3MnKTtcbiAgICB9XG4gICAgbWFya0FzUHJvY2Vzc2VkKFxuICAgICAgICBwa2dKc29uVXBkYXRlciwgZW50cnlQb2ludC5wYWNrYWdlSnNvbiwgcGFja2FnZUpzb25QYXRoLCBwcm9wc1RvTWFya0FzUHJvY2Vzc2VkKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBoYW5kbGVyIHRoYXQgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRocm93RXJyb3JIYW5kbGVyKGZzOiBGaWxlU3lzdGVtKTogVGFza0NvbXBsZXRlZEhhbmRsZXIge1xuICByZXR1cm4gKHRhc2s6IFRhc2ssIG1lc3NhZ2U6IHN0cmluZ3xudWxsKTogdm9pZCA9PiB7XG4gICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChmcywgdGFzay5lbnRyeVBvaW50LCB0YXNrLmZvcm1hdFByb3BlcnR5KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBlbnRyeS1wb2ludCAke3Rhc2suZW50cnlQb2ludC5uYW1lfSAoJHt0YXNrLmZvcm1hdFByb3BlcnR5fSBhcyAke1xuICAgICAgICAgICAgZm9ybWF0fSlgICtcbiAgICAgICAgKG1lc3NhZ2UgIT09IG51bGwgPyBgIGR1ZSB0byAke21lc3NhZ2V9YCA6ICcnKSk7XG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgaGFuZGxlciB0aGF0IGxvZ3MgYW4gZXJyb3IgYW5kIG1hcmtzIHRoZSB0YXNrIGFzIGZhaWxlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxvZ0Vycm9ySGFuZGxlcihcbiAgICBsb2dnZXI6IExvZ2dlciwgZnM6IEZpbGVTeXN0ZW0sIHRhc2tRdWV1ZTogVGFza1F1ZXVlKTogVGFza0NvbXBsZXRlZEhhbmRsZXIge1xuICByZXR1cm4gKHRhc2s6IFRhc2ssIG1lc3NhZ2U6IHN0cmluZ3xudWxsKTogdm9pZCA9PiB7XG4gICAgdGFza1F1ZXVlLm1hcmtBc0ZhaWxlZCh0YXNrKTtcbiAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KGZzLCB0YXNrLmVudHJ5UG9pbnQsIHRhc2suZm9ybWF0UHJvcGVydHkpO1xuICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgYEZhaWxlZCB0byBjb21waWxlIGVudHJ5LXBvaW50ICR7dGFzay5lbnRyeVBvaW50Lm5hbWV9ICgke3Rhc2suZm9ybWF0UHJvcGVydHl9IGFzICR7XG4gICAgICAgICAgICBmb3JtYXR9KWAgK1xuICAgICAgICAobWVzc2FnZSAhPT0gbnVsbCA/IGAgZHVlIHRvICR7bWVzc2FnZX1gIDogJycpKTtcbiAgfTtcbn1cbiJdfQ==