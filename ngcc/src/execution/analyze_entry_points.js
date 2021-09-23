(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/analyze_entry_points", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/execution/tasks/queues/parallel_task_queue", "@angular/compiler-cli/ngcc/src/execution/tasks/queues/serial_task_queue", "@angular/compiler-cli/ngcc/src/execution/tasks/utils", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner", "@angular/compiler-cli/ngcc/src/execution/tasks/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getAnalyzeEntryPointsFn = void 0;
    var tslib_1 = require("tslib");
    var parallel_task_queue_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/queues/parallel_task_queue");
    var serial_task_queue_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/queues/serial_task_queue");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/utils");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var package_cleaner_1 = require("@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner");
    var api_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/api");
    /**
     * Create the function for performing the analysis of the entry-points.
     */
    function getAnalyzeEntryPointsFn(logger, finder, fileSystem, supportedPropertiesToConsider, typingsOnly, compileAllFormats, propertiesToConsider, inParallel) {
        return function () {
            var e_1, _a, e_2, _b;
            logger.debug('Analyzing entry-points...');
            var startTime = Date.now();
            var entryPointInfo = finder.findEntryPoints();
            var cleaned = (0, package_cleaner_1.cleanOutdatedPackages)(fileSystem, entryPointInfo.entryPoints);
            if (cleaned) {
                // If we had to clean up one or more packages then we must read in the entry-points again.
                entryPointInfo = finder.findEntryPoints();
            }
            var entryPoints = entryPointInfo.entryPoints, invalidEntryPoints = entryPointInfo.invalidEntryPoints, graph = entryPointInfo.graph;
            logInvalidEntryPoints(logger, invalidEntryPoints);
            var unprocessableEntryPointPaths = [];
            // The tasks are partially ordered by virtue of the entry-points being partially ordered too.
            var tasks = [];
            try {
                for (var entryPoints_1 = (0, tslib_1.__values)(entryPoints), entryPoints_1_1 = entryPoints_1.next(); !entryPoints_1_1.done; entryPoints_1_1 = entryPoints_1.next()) {
                    var entryPoint = entryPoints_1_1.value;
                    var packageJson = entryPoint.packageJson;
                    var _c = getPropertiesToProcess(packageJson, supportedPropertiesToConsider, compileAllFormats, typingsOnly), propertiesToProcess = _c.propertiesToProcess, equivalentPropertiesMap = _c.equivalentPropertiesMap;
                    if (propertiesToProcess.length === 0) {
                        // This entry-point is unprocessable (i.e. there is no format property that is of interest
                        // and can be processed). This will result in an error, but continue looping over
                        // entry-points in order to collect all unprocessable ones and display a more informative
                        // error.
                        unprocessableEntryPointPaths.push(entryPoint.path);
                        continue;
                    }
                    var hasProcessedTypings = (0, build_marker_1.hasBeenProcessed)(packageJson, 'typings');
                    if (hasProcessedTypings && typingsOnly) {
                        // Typings for this entry-point have already been processed and we're in typings-only mode,
                        // so no task has to be created for this entry-point.
                        logger.debug("Skipping " + entryPoint.name + " : typings have already been processed.");
                        continue;
                    }
                    var processDts = hasProcessedTypings ? api_1.DtsProcessing.No :
                        typingsOnly ? api_1.DtsProcessing.Only : api_1.DtsProcessing.Yes;
                    try {
                        for (var propertiesToProcess_1 = (e_2 = void 0, (0, tslib_1.__values)(propertiesToProcess)), propertiesToProcess_1_1 = propertiesToProcess_1.next(); !propertiesToProcess_1_1.done; propertiesToProcess_1_1 = propertiesToProcess_1.next()) {
                            var formatProperty = propertiesToProcess_1_1.value;
                            if ((0, build_marker_1.hasBeenProcessed)(entryPoint.packageJson, formatProperty)) {
                                // The format-path which the property maps to is already processed - nothing to do.
                                logger.debug("Skipping " + entryPoint.name + " : " + formatProperty + " (already compiled).");
                                continue;
                            }
                            var formatPropertiesToMarkAsProcessed = equivalentPropertiesMap.get(formatProperty);
                            tasks.push({ entryPoint: entryPoint, formatProperty: formatProperty, formatPropertiesToMarkAsProcessed: formatPropertiesToMarkAsProcessed, processDts: processDts });
                            // Only process typings for the first property (if not already processed).
                            processDts = api_1.DtsProcessing.No;
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (propertiesToProcess_1_1 && !propertiesToProcess_1_1.done && (_b = propertiesToProcess_1.return)) _b.call(propertiesToProcess_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (entryPoints_1_1 && !entryPoints_1_1.done && (_a = entryPoints_1.return)) _a.call(entryPoints_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Check for entry-points for which we could not process any format at all.
            if (unprocessableEntryPointPaths.length > 0) {
                throw new Error('Unable to process any formats for the following entry-points (tried ' +
                    (propertiesToConsider.join(', ') + "): ") +
                    unprocessableEntryPointPaths.map(function (path) { return "\n  - " + path; }).join(''));
            }
            var duration = Math.round((Date.now() - startTime) / 100) / 10;
            logger.debug("Analyzed " + entryPoints.length + " entry-points in " + duration + "s. " +
                ("(Total tasks: " + tasks.length + ")"));
            return getTaskQueue(logger, inParallel, tasks, graph);
        };
    }
    exports.getAnalyzeEntryPointsFn = getAnalyzeEntryPointsFn;
    function logInvalidEntryPoints(logger, invalidEntryPoints) {
        invalidEntryPoints.forEach(function (invalidEntryPoint) {
            logger.debug("Invalid entry-point " + invalidEntryPoint.entryPoint.path + ".", "It is missing required dependencies:\n" +
                invalidEntryPoint.missingDependencies.map(function (dep) { return " - " + dep; }).join('\n'));
        });
    }
    /**
     * This function computes and returns the following:
     * - `propertiesToProcess`: An (ordered) list of properties that exist and need to be processed,
     *   based on the provided `propertiesToConsider`, the properties in `package.json` and their
     *   corresponding format-paths. NOTE: Only one property per format-path needs to be processed.
     * - `equivalentPropertiesMap`: A mapping from each property in `propertiesToProcess` to the list of
     *   other format properties in `package.json` that need to be marked as processed as soon as the
     *   former has been processed.
     */
    function getPropertiesToProcess(packageJson, propertiesToConsider, compileAllFormats, typingsOnly) {
        var e_3, _a, e_4, _b, e_5, _c;
        var formatPathsToConsider = new Set();
        var propertiesToProcess = [];
        try {
            for (var propertiesToConsider_1 = (0, tslib_1.__values)(propertiesToConsider), propertiesToConsider_1_1 = propertiesToConsider_1.next(); !propertiesToConsider_1_1.done; propertiesToConsider_1_1 = propertiesToConsider_1.next()) {
                var prop = propertiesToConsider_1_1.value;
                var formatPath = packageJson[prop];
                // Ignore properties that are not defined in `package.json`.
                if (typeof formatPath !== 'string')
                    continue;
                // Ignore properties that map to the same format-path as a preceding property.
                if (formatPathsToConsider.has(formatPath))
                    continue;
                // Process this property, because it is the first one to map to this format-path.
                formatPathsToConsider.add(formatPath);
                propertiesToProcess.push(prop);
                // If we only need one format processed, there is no need to process any more properties.
                if (!compileAllFormats)
                    break;
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (propertiesToConsider_1_1 && !propertiesToConsider_1_1.done && (_a = propertiesToConsider_1.return)) _a.call(propertiesToConsider_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        var formatPathToProperties = {};
        try {
            for (var SUPPORTED_FORMAT_PROPERTIES_1 = (0, tslib_1.__values)(entry_point_1.SUPPORTED_FORMAT_PROPERTIES), SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next(); !SUPPORTED_FORMAT_PROPERTIES_1_1.done; SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next()) {
                var prop = SUPPORTED_FORMAT_PROPERTIES_1_1.value;
                var formatPath = packageJson[prop];
                // Ignore properties that are not defined in `package.json`.
                if (typeof formatPath !== 'string')
                    continue;
                // Ignore properties that do not map to a format-path that will be considered.
                if (!formatPathsToConsider.has(formatPath))
                    continue;
                // Add this property to the map.
                var list = formatPathToProperties[formatPath] || (formatPathToProperties[formatPath] = []);
                list.push(prop);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (SUPPORTED_FORMAT_PROPERTIES_1_1 && !SUPPORTED_FORMAT_PROPERTIES_1_1.done && (_b = SUPPORTED_FORMAT_PROPERTIES_1.return)) _b.call(SUPPORTED_FORMAT_PROPERTIES_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        var equivalentPropertiesMap = new Map();
        try {
            for (var propertiesToConsider_2 = (0, tslib_1.__values)(propertiesToConsider), propertiesToConsider_2_1 = propertiesToConsider_2.next(); !propertiesToConsider_2_1.done; propertiesToConsider_2_1 = propertiesToConsider_2.next()) {
                var prop = propertiesToConsider_2_1.value;
                var formatPath = packageJson[prop];
                // If we are only processing typings then there should be no format properties to mark
                var equivalentProperties = typingsOnly ? [] : formatPathToProperties[formatPath];
                equivalentPropertiesMap.set(prop, equivalentProperties);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (propertiesToConsider_2_1 && !propertiesToConsider_2_1.done && (_c = propertiesToConsider_2.return)) _c.call(propertiesToConsider_2);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return { propertiesToProcess: propertiesToProcess, equivalentPropertiesMap: equivalentPropertiesMap };
    }
    function getTaskQueue(logger, inParallel, tasks, graph) {
        var dependencies = (0, utils_1.computeTaskDependencies)(tasks, graph);
        return inParallel ? new parallel_task_queue_1.ParallelTaskQueue(logger, tasks, dependencies) :
            new serial_task_queue_1.SerialTaskQueue(logger, tasks, dependencies);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZV9lbnRyeV9wb2ludHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2FuYWx5emVfZW50cnlfcG9pbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFhQSxpSEFBZ0Y7SUFDaEYsNkdBQTRFO0lBQzVFLDhFQUFpRTtJQUNqRSxxRkFBMEQ7SUFDMUQsbUZBQStIO0lBQy9ILG1HQUEwRTtJQUcxRSwwRUFBNEU7SUFFNUU7O09BRUc7SUFDSCxTQUFnQix1QkFBdUIsQ0FDbkMsTUFBYyxFQUFFLE1BQXdCLEVBQUUsVUFBc0IsRUFDaEUsNkJBQXVELEVBQUUsV0FBb0IsRUFDN0UsaUJBQTBCLEVBQUUsb0JBQThCLEVBQzFELFVBQW1CO1FBQ3JCLE9BQU87O1lBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQzFDLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUU3QixJQUFJLGNBQWMsR0FBRyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDOUMsSUFBTSxPQUFPLEdBQUcsSUFBQSx1Q0FBcUIsRUFBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlFLElBQUksT0FBTyxFQUFFO2dCQUNYLDBGQUEwRjtnQkFDMUYsY0FBYyxHQUFHLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQzthQUMzQztZQUVNLElBQUEsV0FBVyxHQUErQixjQUFjLFlBQTdDLEVBQUUsa0JBQWtCLEdBQVcsY0FBYyxtQkFBekIsRUFBRSxLQUFLLEdBQUksY0FBYyxNQUFsQixDQUFtQjtZQUNoRSxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUVsRCxJQUFNLDRCQUE0QixHQUFhLEVBQUUsQ0FBQztZQUNsRCw2RkFBNkY7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QyxDQUFDO0lBQ3hELENBQUM7SUFFRCxTQUFTLFlBQVksQ0FDakIsTUFBYyxFQUFFLFVBQW1CLEVBQUUsS0FBNEIsRUFDakUsS0FBMkI7UUFDN0IsSUFBTSxZQUFZLEdBQUcsSUFBQSwrQkFBdUIsRUFBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0QsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksdUNBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQ3BELElBQUksbUNBQWUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3ZFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7RGVwR3JhcGh9IGZyb20gJ2RlcGVuZGVuY3ktZ3JhcGgnO1xuXG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2xvZ2dpbmcnO1xuaW1wb3J0IHtJbnZhbGlkRW50cnlQb2ludH0gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuLi9lbnRyeV9wb2ludF9maW5kZXIvaW50ZXJmYWNlJztcbmltcG9ydCB7UGFyYWxsZWxUYXNrUXVldWV9IGZyb20gJy4uL2V4ZWN1dGlvbi90YXNrcy9xdWV1ZXMvcGFyYWxsZWxfdGFza19xdWV1ZSc7XG5pbXBvcnQge1NlcmlhbFRhc2tRdWV1ZX0gZnJvbSAnLi4vZXhlY3V0aW9uL3Rhc2tzL3F1ZXVlcy9zZXJpYWxfdGFza19xdWV1ZSc7XG5pbXBvcnQge2NvbXB1dGVUYXNrRGVwZW5kZW5jaWVzfSBmcm9tICcuLi9leGVjdXRpb24vdGFza3MvdXRpbHMnO1xuaW1wb3J0IHtoYXNCZWVuUHJvY2Vzc2VkfSBmcm9tICcuLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50UGFja2FnZUpzb24sIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU30gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtjbGVhbk91dGRhdGVkUGFja2FnZXN9IGZyb20gJy4uL3dyaXRpbmcvY2xlYW5pbmcvcGFja2FnZV9jbGVhbmVyJztcblxuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEdHNQcm9jZXNzaW5nLCBQYXJ0aWFsbHlPcmRlcmVkVGFza3MsIFRhc2tRdWV1ZX0gZnJvbSAnLi90YXNrcy9hcGknO1xuXG4vKipcbiAqIENyZWF0ZSB0aGUgZnVuY3Rpb24gZm9yIHBlcmZvcm1pbmcgdGhlIGFuYWx5c2lzIG9mIHRoZSBlbnRyeS1wb2ludHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbmFseXplRW50cnlQb2ludHNGbihcbiAgICBsb2dnZXI6IExvZ2dlciwgZmluZGVyOiBFbnRyeVBvaW50RmluZGVyLCBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLFxuICAgIHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10sIHR5cGluZ3NPbmx5OiBib29sZWFuLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10sXG4gICAgaW5QYXJhbGxlbDogYm9vbGVhbik6IEFuYWx5emVFbnRyeVBvaW50c0ZuIHtcbiAgcmV0dXJuICgpID0+IHtcbiAgICBsb2dnZXIuZGVidWcoJ0FuYWx5emluZyBlbnRyeS1wb2ludHMuLi4nKTtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgbGV0IGVudHJ5UG9pbnRJbmZvID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xuICAgIGNvbnN0IGNsZWFuZWQgPSBjbGVhbk91dGRhdGVkUGFja2FnZXMoZmlsZVN5c3RlbSwgZW50cnlQb2ludEluZm8uZW50cnlQb2ludHMpO1xuICAgIGlmIChjbGVhbmVkKSB7XG4gICAgICAvLyBJZiB3ZSBoYWQgdG8gY2xlYW4gdXAgb25lIG9yIG1vcmUgcGFja2FnZXMgdGhlbiB3ZSBtdXN0IHJlYWQgaW4gdGhlIGVudHJ5LXBvaW50cyBhZ2Fpbi5cbiAgICAgIGVudHJ5UG9pbnRJbmZvID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xuICAgIH1cblxuICAgIGNvbnN0IHtlbnRyeVBvaW50cywgaW52YWxpZEVudHJ5UG9pbnRzLCBncmFwaH0gPSBlbnRyeVBvaW50SW5mbztcbiAgICBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyLCBpbnZhbGlkRW50cnlQb2ludHMpO1xuXG4gICAgY29uc3QgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBUaGUgdGFza3MgYXJlIHBhcnRpYWxseSBvcmRlcmVkIGJ5IHZpcnR1ZSBvZiB0aGUgZW50cnktcG9pbnRzIGJlaW5nIHBhcnRpYWxseSBvcmRlcmVkIHRvby5cbiAgICBjb25zdCB0YXNrczogUGFydGlhbGx5T3JkZXJlZFRhc2tzID0gW10gYXMgYW55O1xuXG4gICAgZm9yIChjb25zdCBlbnRyeVBvaW50IG9mIGVudHJ5UG9pbnRzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCB7cHJvcGVydGllc1RvUHJvY2VzcywgZXF1aXZhbGVudFByb3BlcnRpZXNNYXB9ID0gZ2V0UHJvcGVydGllc1RvUHJvY2VzcyhcbiAgICAgICAgICBwYWNrYWdlSnNvbiwgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzLCB0eXBpbmdzT25seSk7XG5cbiAgICAgIGlmIChwcm9wZXJ0aWVzVG9Qcm9jZXNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBUaGlzIGVudHJ5LXBvaW50IGlzIHVucHJvY2Vzc2FibGUgKGkuZS4gdGhlcmUgaXMgbm8gZm9ybWF0IHByb3BlcnR5IHRoYXQgaXMgb2YgaW50ZXJlc3RcbiAgICAgICAgLy8gYW5kIGNhbiBiZSBwcm9jZXNzZWQpLiBUaGlzIHdpbGwgcmVzdWx0IGluIGFuIGVycm9yLCBidXQgY29udGludWUgbG9vcGluZyBvdmVyXG4gICAgICAgIC8vIGVudHJ5LXBvaW50cyBpbiBvcmRlciB0byBjb2xsZWN0IGFsbCB1bnByb2Nlc3NhYmxlIG9uZXMgYW5kIGRpc3BsYXkgYSBtb3JlIGluZm9ybWF0aXZlXG4gICAgICAgIC8vIGVycm9yLlxuICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLnB1c2goZW50cnlQb2ludC5wYXRoKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhhc1Byb2Nlc3NlZFR5cGluZ3MgPSBoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCAndHlwaW5ncycpO1xuICAgICAgaWYgKGhhc1Byb2Nlc3NlZFR5cGluZ3MgJiYgdHlwaW5nc09ubHkpIHtcbiAgICAgICAgLy8gVHlwaW5ncyBmb3IgdGhpcyBlbnRyeS1wb2ludCBoYXZlIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQgYW5kIHdlJ3JlIGluIHR5cGluZ3Mtb25seSBtb2RlLFxuICAgICAgICAvLyBzbyBubyB0YXNrIGhhcyB0byBiZSBjcmVhdGVkIGZvciB0aGlzIGVudHJ5LXBvaW50LlxuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6IHR5cGluZ3MgaGF2ZSBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGxldCBwcm9jZXNzRHRzID0gaGFzUHJvY2Vzc2VkVHlwaW5ncyA/IER0c1Byb2Nlc3NpbmcuTm8gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwaW5nc09ubHkgPyBEdHNQcm9jZXNzaW5nLk9ubHkgOiBEdHNQcm9jZXNzaW5nLlllcztcblxuICAgICAgZm9yIChjb25zdCBmb3JtYXRQcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Qcm9jZXNzKSB7XG4gICAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKGVudHJ5UG9pbnQucGFja2FnZUpzb24sIGZvcm1hdFByb3BlcnR5KSkge1xuICAgICAgICAgIC8vIFRoZSBmb3JtYXQtcGF0aCB3aGljaCB0aGUgcHJvcGVydHkgbWFwcyB0byBpcyBhbHJlYWR5IHByb2Nlc3NlZCAtIG5vdGhpbmcgdG8gZG8uXG4gICAgICAgICAgbG9nZ2VyLmRlYnVnKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fSAoYWxyZWFkeSBjb21waWxlZCkuYCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQgPSBlcXVpdmFsZW50UHJvcGVydGllc01hcC5nZXQoZm9ybWF0UHJvcGVydHkpITtcbiAgICAgICAgdGFza3MucHVzaCh7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30pO1xuXG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyB0eXBpbmdzIGZvciB0aGUgZmlyc3QgcHJvcGVydHkgKGlmIG5vdCBhbHJlYWR5IHByb2Nlc3NlZCkuXG4gICAgICAgIHByb2Nlc3NEdHMgPSBEdHNQcm9jZXNzaW5nLk5vO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBlbnRyeS1wb2ludHMgZm9yIHdoaWNoIHdlIGNvdWxkIG5vdCBwcm9jZXNzIGFueSBmb3JtYXQgYXQgYWxsLlxuICAgIGlmICh1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnVW5hYmxlIHRvIHByb2Nlc3MgYW55IGZvcm1hdHMgZm9yIHRoZSBmb2xsb3dpbmcgZW50cnktcG9pbnRzICh0cmllZCAnICtcbiAgICAgICAgICBgJHtwcm9wZXJ0aWVzVG9Db25zaWRlci5qb2luKCcsICcpfSk6IGAgK1xuICAgICAgICAgIHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHMubWFwKHBhdGggPT4gYFxcbiAgLSAke3BhdGh9YCkuam9pbignJykpO1xuICAgIH1cblxuICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDApIC8gMTA7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgQW5hbHl6ZWQgJHtlbnRyeVBvaW50cy5sZW5ndGh9IGVudHJ5LXBvaW50cyBpbiAke2R1cmF0aW9ufXMuIGAgK1xuICAgICAgICBgKFRvdGFsIHRhc2tzOiAke3Rhc2tzLmxlbmd0aH0pYCk7XG5cbiAgICByZXR1cm4gZ2V0VGFza1F1ZXVlKGxvZ2dlciwgaW5QYXJhbGxlbCwgdGFza3MsIGdyYXBoKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlcjogTG9nZ2VyLCBpbnZhbGlkRW50cnlQb2ludHM6IEludmFsaWRFbnRyeVBvaW50W10pOiB2b2lkIHtcbiAgaW52YWxpZEVudHJ5UG9pbnRzLmZvckVhY2goaW52YWxpZEVudHJ5UG9pbnQgPT4ge1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYEludmFsaWQgZW50cnktcG9pbnQgJHtpbnZhbGlkRW50cnlQb2ludC5lbnRyeVBvaW50LnBhdGh9LmAsXG4gICAgICAgIGBJdCBpcyBtaXNzaW5nIHJlcXVpcmVkIGRlcGVuZGVuY2llczpcXG5gICtcbiAgICAgICAgICAgIGludmFsaWRFbnRyeVBvaW50Lm1pc3NpbmdEZXBlbmRlbmNpZXMubWFwKGRlcCA9PiBgIC0gJHtkZXB9YCkuam9pbignXFxuJykpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGNvbXB1dGVzIGFuZCByZXR1cm5zIHRoZSBmb2xsb3dpbmc6XG4gKiAtIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYDogQW4gKG9yZGVyZWQpIGxpc3Qgb2YgcHJvcGVydGllcyB0aGF0IGV4aXN0IGFuZCBuZWVkIHRvIGJlIHByb2Nlc3NlZCxcbiAqICAgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGBwcm9wZXJ0aWVzVG9Db25zaWRlcmAsIHRoZSBwcm9wZXJ0aWVzIGluIGBwYWNrYWdlLmpzb25gIGFuZCB0aGVpclxuICogICBjb3JyZXNwb25kaW5nIGZvcm1hdC1wYXRocy4gTk9URTogT25seSBvbmUgcHJvcGVydHkgcGVyIGZvcm1hdC1wYXRoIG5lZWRzIHRvIGJlIHByb2Nlc3NlZC5cbiAqIC0gYGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwYDogQSBtYXBwaW5nIGZyb20gZWFjaCBwcm9wZXJ0eSBpbiBgcHJvcGVydGllc1RvUHJvY2Vzc2AgdG8gdGhlIGxpc3Qgb2ZcbiAqICAgb3RoZXIgZm9ybWF0IHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgdGhhdCBuZWVkIHRvIGJlIG1hcmtlZCBhcyBwcm9jZXNzZWQgYXMgc29vbiBhcyB0aGVcbiAqICAgZm9ybWVyIGhhcyBiZWVuIHByb2Nlc3NlZC5cbiAqL1xuZnVuY3Rpb24gZ2V0UHJvcGVydGllc1RvUHJvY2VzcyhcbiAgICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuLCB0eXBpbmdzT25seTogYm9vbGVhbik6IHtcbiAgcHJvcGVydGllc1RvUHJvY2VzczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdO1xuICBlcXVpdmFsZW50UHJvcGVydGllc01hcDogTWFwPEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXT47XG59IHtcbiAgY29uc3QgZm9ybWF0UGF0aHNUb0NvbnNpZGVyID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgY29uc3QgcHJvcGVydGllc1RvUHJvY2VzczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID0gW107XG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIG5vdCBkZWZpbmVkIGluIGBwYWNrYWdlLmpzb25gLlxuICAgIGlmICh0eXBlb2YgZm9ybWF0UGF0aCAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBtYXAgdG8gdGhlIHNhbWUgZm9ybWF0LXBhdGggYXMgYSBwcmVjZWRpbmcgcHJvcGVydHkuXG4gICAgaWYgKGZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gUHJvY2VzcyB0aGlzIHByb3BlcnR5LCBiZWNhdXNlIGl0IGlzIHRoZSBmaXJzdCBvbmUgdG8gbWFwIHRvIHRoaXMgZm9ybWF0LXBhdGguXG4gICAgZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmFkZChmb3JtYXRQYXRoKTtcbiAgICBwcm9wZXJ0aWVzVG9Qcm9jZXNzLnB1c2gocHJvcCk7XG5cbiAgICAvLyBJZiB3ZSBvbmx5IG5lZWQgb25lIGZvcm1hdCBwcm9jZXNzZWQsIHRoZXJlIGlzIG5vIG5lZWQgdG8gcHJvY2VzcyBhbnkgbW9yZSBwcm9wZXJ0aWVzLlxuICAgIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIGJyZWFrO1xuICB9XG5cbiAgY29uc3QgZm9ybWF0UGF0aFRvUHJvcGVydGllczoge1tmb3JtYXRQYXRoOiBzdHJpbmddOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W119ID0ge307XG4gIGZvciAoY29uc3QgcHJvcCBvZiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgZGVmaW5lZCBpbiBgcGFja2FnZS5qc29uYC5cbiAgICBpZiAodHlwZW9mIGZvcm1hdFBhdGggIT09ICdzdHJpbmcnKSBjb250aW51ZTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgZG8gbm90IG1hcCB0byBhIGZvcm1hdC1wYXRoIHRoYXQgd2lsbCBiZSBjb25zaWRlcmVkLlxuICAgIGlmICghZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmhhcyhmb3JtYXRQYXRoKSkgY29udGludWU7XG5cbiAgICAvLyBBZGQgdGhpcyBwcm9wZXJ0eSB0byB0aGUgbWFwLlxuICAgIGNvbnN0IGxpc3QgPSBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdIHx8IChmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdID0gW10pO1xuICAgIGxpc3QucHVzaChwcm9wKTtcbiAgfVxuXG4gIGNvbnN0IGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwID0gbmV3IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+KCk7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXSE7XG4gICAgLy8gSWYgd2UgYXJlIG9ubHkgcHJvY2Vzc2luZyB0eXBpbmdzIHRoZW4gdGhlcmUgc2hvdWxkIGJlIG5vIGZvcm1hdCBwcm9wZXJ0aWVzIHRvIG1hcmtcbiAgICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllcyA9IHR5cGluZ3NPbmx5ID8gW10gOiBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdO1xuICAgIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwLnNldChwcm9wLCBlcXVpdmFsZW50UHJvcGVydGllcyk7XG4gIH1cblxuICByZXR1cm4ge3Byb3BlcnRpZXNUb1Byb2Nlc3MsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwfTtcbn1cblxuZnVuY3Rpb24gZ2V0VGFza1F1ZXVlKFxuICAgIGxvZ2dlcjogTG9nZ2VyLCBpblBhcmFsbGVsOiBib29sZWFuLCB0YXNrczogUGFydGlhbGx5T3JkZXJlZFRhc2tzLFxuICAgIGdyYXBoOiBEZXBHcmFwaDxFbnRyeVBvaW50Pik6IFRhc2tRdWV1ZSB7XG4gIGNvbnN0IGRlcGVuZGVuY2llcyA9IGNvbXB1dGVUYXNrRGVwZW5kZW5jaWVzKHRhc2tzLCBncmFwaCk7XG4gIHJldHVybiBpblBhcmFsbGVsID8gbmV3IFBhcmFsbGVsVGFza1F1ZXVlKGxvZ2dlciwgdGFza3MsIGRlcGVuZGVuY2llcykgOlxuICAgICAgICAgICAgICAgICAgICAgIG5ldyBTZXJpYWxUYXNrUXVldWUobG9nZ2VyLCB0YXNrcywgZGVwZW5kZW5jaWVzKTtcbn1cbiJdfQ==