import { markAsProcessed } from '../../packages/build_marker';
import { getEntryPointFormat } from '../../packages/entry_point';
import { DtsProcessing } from './api';
/**
 * Compose a group of TaskCompletedHandlers into a single TaskCompletedCallback.
 *
 * The compose callback will receive an outcome and will delegate to the appropriate handler based
 * on this outcome.
 *
 * @param callbacks a map of outcomes to handlers.
 */
export function composeTaskCompletedCallbacks(callbacks) {
    return (task, outcome, message) => {
        const callback = callbacks[outcome];
        if (callback === undefined) {
            throw new Error(`Unknown task outcome: "${outcome}" - supported outcomes: ${JSON.stringify(Object.keys(callbacks))}`);
        }
        callback(task, message);
    };
}
/**
 * Create a handler that will mark the entry-points in a package as being processed.
 *
 * @param pkgJsonUpdater The service used to update the package.json
 */
export function createMarkAsProcessedHandler(fs, pkgJsonUpdater) {
    return (task) => {
        const { entryPoint, formatPropertiesToMarkAsProcessed, processDts } = task;
        const packageJsonPath = fs.resolve(entryPoint.path, 'package.json');
        const propsToMarkAsProcessed = [...formatPropertiesToMarkAsProcessed];
        if (processDts !== DtsProcessing.No) {
            propsToMarkAsProcessed.push('typings');
        }
        markAsProcessed(pkgJsonUpdater, entryPoint.packageJson, packageJsonPath, propsToMarkAsProcessed);
    };
}
/**
 * Create a handler that will throw an error.
 */
export function createThrowErrorHandler(fs) {
    return (task, message) => {
        throw new Error(createErrorMessage(fs, task, message));
    };
}
/**
 * Create a handler that logs an error and marks the task as failed.
 */
export function createLogErrorHandler(logger, fs, taskQueue) {
    return (task, message) => {
        taskQueue.markAsFailed(task);
        logger.error(createErrorMessage(fs, task, message));
    };
}
function createErrorMessage(fs, task, message) {
    var _a;
    const jsFormat = `\`${task.formatProperty}\` as ${(_a = getEntryPointFormat(fs, task.entryPoint, task.formatProperty)) !== null && _a !== void 0 ? _a : 'unknown format'}`;
    const format = task.typingsOnly ? `typings only using ${jsFormat}` : jsFormat;
    message = message !== null ? ` due to ${message}` : '';
    return `Failed to compile entry-point ${task.entryPoint.name} (${format})` + message;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9leGVjdXRpb24vdGFza3MvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFTQSxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sNkJBQTZCLENBQUM7QUFDNUQsT0FBTyxFQUFDLG1CQUFtQixFQUE4QixNQUFNLDRCQUE0QixDQUFDO0FBRzVGLE9BQU8sRUFBQyxhQUFhLEVBQWdFLE1BQU0sT0FBTyxDQUFDO0FBVW5HOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsNkJBQTZCLENBQ3pDLFNBQThEO0lBQ2hFLE9BQU8sQ0FBQyxJQUFVLEVBQUUsT0FBOEIsRUFBRSxPQUFvQixFQUFRLEVBQUU7UUFDaEYsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BDLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRTtZQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixPQUFPLDJCQUM3QyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDL0M7UUFDRCxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzFCLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLDRCQUE0QixDQUN4QyxFQUFvQixFQUFFLGNBQWtDO0lBQzFELE9BQU8sQ0FBQyxJQUFVLEVBQVEsRUFBRTtRQUMxQixNQUFNLEVBQUMsVUFBVSxFQUFFLGlDQUFpQyxFQUFFLFVBQVUsRUFBQyxHQUFHLElBQUksQ0FBQztRQUN6RSxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDcEUsTUFBTSxzQkFBc0IsR0FDeEIsQ0FBQyxHQUFHLGlDQUFpQyxDQUFDLENBQUM7UUFDM0MsSUFBSSxVQUFVLEtBQUssYUFBYSxDQUFDLEVBQUUsRUFBRTtZQUNuQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDeEM7UUFDRCxlQUFlLENBQ1gsY0FBYyxFQUFFLFVBQVUsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFDdkYsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEVBQXNCO0lBQzVELE9BQU8sQ0FBQyxJQUFVLEVBQUUsT0FBb0IsRUFBUSxFQUFFO1FBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3pELENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxxQkFBcUIsQ0FDakMsTUFBYyxFQUFFLEVBQXNCLEVBQUUsU0FBb0I7SUFDOUQsT0FBTyxDQUFDLElBQVUsRUFBRSxPQUFvQixFQUFRLEVBQUU7UUFDaEQsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxFQUFzQixFQUFFLElBQVUsRUFBRSxPQUFvQjs7SUFDbEYsTUFBTSxRQUFRLEdBQUcsS0FBSyxJQUFJLENBQUMsY0FBYyxTQUNyQyxNQUFBLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsbUNBQUksZ0JBQWdCLEVBQUUsQ0FBQztJQUN4RixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztJQUM5RSxPQUFPLEdBQUcsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3ZELE9BQU8saUNBQWlDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQztBQUN2RixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1BhdGhNYW5pcHVsYXRpb24sIFJlYWRvbmx5RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbmd0c2MvbG9nZ2luZyc7XG5pbXBvcnQge21hcmtBc1Byb2Nlc3NlZH0gZnJvbSAnLi4vLi4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7Z2V0RW50cnlQb2ludEZvcm1hdCwgUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzfSBmcm9tICcuLi8uLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi4vLi4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5cbmltcG9ydCB7RHRzUHJvY2Vzc2luZywgVGFzaywgVGFza0NvbXBsZXRlZENhbGxiYWNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUsIFRhc2tRdWV1ZX0gZnJvbSAnLi9hcGknO1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gdGhhdCBjYW4gaGFuZGxlIGEgc3BlY2lmaWMgb3V0Y29tZSBvZiBhIHRhc2sgY29tcGxldGlvbi5cbiAqXG4gKiBUaGVzZSBmdW5jdGlvbnMgY2FuIGJlIGNvbXBvc2VkIHVzaW5nIHRoZSBgY29tcG9zZVRhc2tDb21wbGV0ZWRDYWxsYmFja3MoKWBcbiAqIHRvIGNyZWF0ZSBhIGBUYXNrQ29tcGxldGVkQ2FsbGJhY2tgIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIHBhc3NlZCB0byBhbiBgRXhlY3V0b3JgLlxuICovXG5leHBvcnQgdHlwZSBUYXNrQ29tcGxldGVkSGFuZGxlciA9ICh0YXNrOiBUYXNrLCBtZXNzYWdlOiBzdHJpbmd8bnVsbCkgPT4gdm9pZDtcblxuLyoqXG4gKiBDb21wb3NlIGEgZ3JvdXAgb2YgVGFza0NvbXBsZXRlZEhhbmRsZXJzIGludG8gYSBzaW5nbGUgVGFza0NvbXBsZXRlZENhbGxiYWNrLlxuICpcbiAqIFRoZSBjb21wb3NlIGNhbGxiYWNrIHdpbGwgcmVjZWl2ZSBhbiBvdXRjb21lIGFuZCB3aWxsIGRlbGVnYXRlIHRvIHRoZSBhcHByb3ByaWF0ZSBoYW5kbGVyIGJhc2VkXG4gKiBvbiB0aGlzIG91dGNvbWUuXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrcyBhIG1hcCBvZiBvdXRjb21lcyB0byBoYW5kbGVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzKFxuICAgIGNhbGxiYWNrczogUmVjb3JkPFRhc2tQcm9jZXNzaW5nT3V0Y29tZSwgVGFza0NvbXBsZXRlZEhhbmRsZXI+KTogVGFza0NvbXBsZXRlZENhbGxiYWNrIHtcbiAgcmV0dXJuICh0YXNrOiBUYXNrLCBvdXRjb21lOiBUYXNrUHJvY2Vzc2luZ091dGNvbWUsIG1lc3NhZ2U6IHN0cmluZ3xudWxsKTogdm9pZCA9PiB7XG4gICAgY29uc3QgY2FsbGJhY2sgPSBjYWxsYmFja3Nbb3V0Y29tZV07XG4gICAgaWYgKGNhbGxiYWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0YXNrIG91dGNvbWU6IFwiJHtvdXRjb21lfVwiIC0gc3VwcG9ydGVkIG91dGNvbWVzOiAke1xuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KE9iamVjdC5rZXlzKGNhbGxiYWNrcykpfWApO1xuICAgIH1cbiAgICBjYWxsYmFjayh0YXNrLCBtZXNzYWdlKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBoYW5kbGVyIHRoYXQgd2lsbCBtYXJrIHRoZSBlbnRyeS1wb2ludHMgaW4gYSBwYWNrYWdlIGFzIGJlaW5nIHByb2Nlc3NlZC5cbiAqXG4gKiBAcGFyYW0gcGtnSnNvblVwZGF0ZXIgVGhlIHNlcnZpY2UgdXNlZCB0byB1cGRhdGUgdGhlIHBhY2thZ2UuanNvblxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWFya0FzUHJvY2Vzc2VkSGFuZGxlcihcbiAgICBmczogUGF0aE1hbmlwdWxhdGlvbiwgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcik6IFRhc2tDb21wbGV0ZWRIYW5kbGVyIHtcbiAgcmV0dXJuICh0YXNrOiBUYXNrKTogdm9pZCA9PiB7XG4gICAgY29uc3Qge2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30gPSB0YXNrO1xuICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGZzLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZDogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzW10gPVxuICAgICAgICBbLi4uZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkXTtcbiAgICBpZiAocHJvY2Vzc0R0cyAhPT0gRHRzUHJvY2Vzc2luZy5Obykge1xuICAgICAgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZC5wdXNoKCd0eXBpbmdzJyk7XG4gICAgfVxuICAgIG1hcmtBc1Byb2Nlc3NlZChcbiAgICAgICAgcGtnSnNvblVwZGF0ZXIsIGVudHJ5UG9pbnQucGFja2FnZUpzb24sIHBhY2thZ2VKc29uUGF0aCwgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZCk7XG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgaGFuZGxlciB0aGF0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUaHJvd0Vycm9ySGFuZGxlcihmczogUmVhZG9ubHlGaWxlU3lzdGVtKTogVGFza0NvbXBsZXRlZEhhbmRsZXIge1xuICByZXR1cm4gKHRhc2s6IFRhc2ssIG1lc3NhZ2U6IHN0cmluZ3xudWxsKTogdm9pZCA9PiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGNyZWF0ZUVycm9yTWVzc2FnZShmcywgdGFzaywgbWVzc2FnZSkpO1xuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGhhbmRsZXIgdGhhdCBsb2dzIGFuIGVycm9yIGFuZCBtYXJrcyB0aGUgdGFzayBhcyBmYWlsZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2dFcnJvckhhbmRsZXIoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIGZzOiBSZWFkb25seUZpbGVTeXN0ZW0sIHRhc2tRdWV1ZTogVGFza1F1ZXVlKTogVGFza0NvbXBsZXRlZEhhbmRsZXIge1xuICByZXR1cm4gKHRhc2s6IFRhc2ssIG1lc3NhZ2U6IHN0cmluZ3xudWxsKTogdm9pZCA9PiB7XG4gICAgdGFza1F1ZXVlLm1hcmtBc0ZhaWxlZCh0YXNrKTtcbiAgICBsb2dnZXIuZXJyb3IoY3JlYXRlRXJyb3JNZXNzYWdlKGZzLCB0YXNrLCBtZXNzYWdlKSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVycm9yTWVzc2FnZShmczogUmVhZG9ubHlGaWxlU3lzdGVtLCB0YXNrOiBUYXNrLCBtZXNzYWdlOiBzdHJpbmd8bnVsbCk6IHN0cmluZyB7XG4gIGNvbnN0IGpzRm9ybWF0ID0gYFxcYCR7dGFzay5mb3JtYXRQcm9wZXJ0eX1cXGAgYXMgJHtcbiAgICAgIGdldEVudHJ5UG9pbnRGb3JtYXQoZnMsIHRhc2suZW50cnlQb2ludCwgdGFzay5mb3JtYXRQcm9wZXJ0eSkgPz8gJ3Vua25vd24gZm9ybWF0J31gO1xuICBjb25zdCBmb3JtYXQgPSB0YXNrLnR5cGluZ3NPbmx5ID8gYHR5cGluZ3Mgb25seSB1c2luZyAke2pzRm9ybWF0fWAgOiBqc0Zvcm1hdDtcbiAgbWVzc2FnZSA9IG1lc3NhZ2UgIT09IG51bGwgPyBgIGR1ZSB0byAke21lc3NhZ2V9YCA6ICcnO1xuICByZXR1cm4gYEZhaWxlZCB0byBjb21waWxlIGVudHJ5LXBvaW50ICR7dGFzay5lbnRyeVBvaW50Lm5hbWV9ICgke2Zvcm1hdH0pYCArIG1lc3NhZ2U7XG59XG4iXX0=