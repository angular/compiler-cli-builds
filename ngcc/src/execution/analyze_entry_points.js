(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/analyze_entry_points", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/execution/tasks/queues/parallel_task_queue", "@angular/compiler-cli/ngcc/src/execution/tasks/queues/serial_task_queue", "@angular/compiler-cli/ngcc/src/execution/tasks/utils", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner"], factory);
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
    /**
     * Create the function for performing the analysis of the entry-points.
     */
    function getAnalyzeEntryPointsFn(logger, finder, fileSystem, supportedPropertiesToConsider, compileAllFormats, propertiesToConsider, inParallel) {
        return function () {
            var e_1, _a, e_2, _b;
            logger.debug('Analyzing entry-points...');
            var startTime = Date.now();
            var entryPointInfo = finder.findEntryPoints();
            var cleaned = package_cleaner_1.cleanOutdatedPackages(fileSystem, entryPointInfo.entryPoints);
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
                for (var entryPoints_1 = tslib_1.__values(entryPoints), entryPoints_1_1 = entryPoints_1.next(); !entryPoints_1_1.done; entryPoints_1_1 = entryPoints_1.next()) {
                    var entryPoint = entryPoints_1_1.value;
                    var packageJson = entryPoint.packageJson;
                    var hasProcessedTypings = build_marker_1.hasBeenProcessed(packageJson, 'typings');
                    var _c = getPropertiesToProcess(packageJson, supportedPropertiesToConsider, compileAllFormats), propertiesToProcess = _c.propertiesToProcess, equivalentPropertiesMap = _c.equivalentPropertiesMap;
                    var processDts = !hasProcessedTypings;
                    if (propertiesToProcess.length === 0) {
                        // This entry-point is unprocessable (i.e. there is no format property that is of interest
                        // and can be processed). This will result in an error, but continue looping over
                        // entry-points in order to collect all unprocessable ones and display a more informative
                        // error.
                        unprocessableEntryPointPaths.push(entryPoint.path);
                        continue;
                    }
                    try {
                        for (var propertiesToProcess_1 = (e_2 = void 0, tslib_1.__values(propertiesToProcess)), propertiesToProcess_1_1 = propertiesToProcess_1.next(); !propertiesToProcess_1_1.done; propertiesToProcess_1_1 = propertiesToProcess_1.next()) {
                            var formatProperty = propertiesToProcess_1_1.value;
                            if (build_marker_1.hasBeenProcessed(entryPoint.packageJson, formatProperty)) {
                                // The format-path which the property maps to is already processed - nothing to do.
                                logger.debug("Skipping " + entryPoint.name + " : " + formatProperty + " (already compiled).");
                                continue;
                            }
                            var formatPropertiesToMarkAsProcessed = equivalentPropertiesMap.get(formatProperty);
                            tasks.push({ entryPoint: entryPoint, formatProperty: formatProperty, formatPropertiesToMarkAsProcessed: formatPropertiesToMarkAsProcessed, processDts: processDts });
                            // Only process typings for the first property (if not already processed).
                            processDts = false;
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
    function getPropertiesToProcess(packageJson, propertiesToConsider, compileAllFormats) {
        var e_3, _a, e_4, _b, e_5, _c;
        var formatPathsToConsider = new Set();
        var propertiesToProcess = [];
        try {
            for (var propertiesToConsider_1 = tslib_1.__values(propertiesToConsider), propertiesToConsider_1_1 = propertiesToConsider_1.next(); !propertiesToConsider_1_1.done; propertiesToConsider_1_1 = propertiesToConsider_1.next()) {
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
            for (var SUPPORTED_FORMAT_PROPERTIES_1 = tslib_1.__values(entry_point_1.SUPPORTED_FORMAT_PROPERTIES), SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next(); !SUPPORTED_FORMAT_PROPERTIES_1_1.done; SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next()) {
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
            for (var propertiesToConsider_2 = tslib_1.__values(propertiesToConsider), propertiesToConsider_2_1 = propertiesToConsider_2.next(); !propertiesToConsider_2_1.done; propertiesToConsider_2_1 = propertiesToConsider_2.next()) {
                var prop = propertiesToConsider_2_1.value;
                var formatPath = packageJson[prop];
                var equivalentProperties = formatPathToProperties[formatPath];
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
        var dependencies = utils_1.computeTaskDependencies(tasks, graph);
        return inParallel ? new parallel_task_queue_1.ParallelTaskQueue(logger, tasks, dependencies) :
            new serial_task_queue_1.SerialTaskQueue(logger, tasks, dependencies);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZV9lbnRyeV9wb2ludHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2FuYWx5emVfZW50cnlfcG9pbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFZQSxpSEFBZ0Y7SUFDaEYsNkdBQTRFO0lBQzVFLDhFQUFpRTtJQUVqRSxxRkFBMEQ7SUFDMUQsbUZBQStIO0lBQy9ILG1HQUEwRTtJQUsxRTs7T0FFRztJQUNILFNBQWdCLHVCQUF1QixDQUNuQyxNQUFjLEVBQUUsTUFBd0IsRUFBRSxVQUFzQixFQUNoRSw2QkFBdUQsRUFBRSxpQkFBMEIsRUFDbkYsb0JBQThCLEVBQUUsVUFBbUI7UUFDckQsT0FBTzs7WUFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDMUMsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRTdCLElBQUksY0FBYyxHQUFHLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM5QyxJQUFNLE9BQU8sR0FBRyx1Q0FBcUIsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlFLElBQUksT0FBTyxFQUFFO2dCQUNYLDBGQUEwRjtnQkFDMUYsY0FBYyxHQUFHLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQzthQUMzQztZQUVNLElBQUEsV0FBVyxHQUErQixjQUFjLFlBQTdDLEVBQUUsa0JBQWtCLEdBQVcsY0FBYyxtQkFBekIsRUFBRSxLQUFLLEdBQUksY0FBYyxNQUFsQixDQUFtQjtZQUNoRSxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUVsRCxJQUFNLDRCQUE0QixHQUFhLEVBQUUsQ0FBQztZQUNsRCw2RkFBNkY7WUFDN0YsSUFBTSxLQUFLLEdBQTBCLEVBQVMsQ0FB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LENBQUM7b0JBQUUsU0FBUztnQkFFckQsZ0NBQWdDO2dCQUNoQyxJQUFNLElBQUksR0FBRyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2pCOzs7Ozs7Ozs7UUFFRCxJQUFNLHVCQUF1QixHQUFHLElBQUksR0FBRyxFQUFvRCxDQUFDOztZQUM1RixLQUFtQixJQUFBLHlCQUFBLGlCQUFBLG9CQUFvQixDQUFBLDBEQUFBLDRGQUFFO2dCQUFwQyxJQUFNLElBQUksaUNBQUE7Z0JBQ2IsSUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBRSxDQUFDO2dCQUN0QyxJQUFNLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNoRSx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUM7YUFDekQ7Ozs7Ozs7OztRQUVELE9BQU8sRUFBQyxtQkFBbUIscUJBQUEsRUFBRSx1QkFBdUIseUJBQUEsRUFBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxTQUFTLFlBQVksQ0FDakIsTUFBYyxFQUFFLFVBQW1CLEVBQUUsS0FBNEIsRUFDakUsS0FBMkI7UUFDN0IsSUFBTSxZQUFZLEdBQUcsK0JBQXVCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNELE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLHVDQUFpQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNwRCxJQUFJLG1DQUFlLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN2RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtEZXBHcmFwaH0gZnJvbSAnZGVwZW5kZW5jeS1ncmFwaCc7XG5cbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7SW52YWxpZEVudHJ5UG9pbnR9IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7RW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi4vZW50cnlfcG9pbnRfZmluZGVyL2ludGVyZmFjZSc7XG5pbXBvcnQge1BhcmFsbGVsVGFza1F1ZXVlfSBmcm9tICcuLi9leGVjdXRpb24vdGFza3MvcXVldWVzL3BhcmFsbGVsX3Rhc2tfcXVldWUnO1xuaW1wb3J0IHtTZXJpYWxUYXNrUXVldWV9IGZyb20gJy4uL2V4ZWN1dGlvbi90YXNrcy9xdWV1ZXMvc2VyaWFsX3Rhc2tfcXVldWUnO1xuaW1wb3J0IHtjb21wdXRlVGFza0RlcGVuZGVuY2llc30gZnJvbSAnLi4vZXhlY3V0aW9uL3Rhc2tzL3V0aWxzJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge2hhc0JlZW5Qcm9jZXNzZWR9IGZyb20gJy4uL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge2NsZWFuT3V0ZGF0ZWRQYWNrYWdlc30gZnJvbSAnLi4vd3JpdGluZy9jbGVhbmluZy9wYWNrYWdlX2NsZWFuZXInO1xuXG5pbXBvcnQge0FuYWx5emVFbnRyeVBvaW50c0ZufSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge1BhcnRpYWxseU9yZGVyZWRUYXNrcywgVGFza1F1ZXVlfSBmcm9tICcuL3Rhc2tzL2FwaSc7XG5cbi8qKlxuICogQ3JlYXRlIHRoZSBmdW5jdGlvbiBmb3IgcGVyZm9ybWluZyB0aGUgYW5hbHlzaXMgb2YgdGhlIGVudHJ5LXBvaW50cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFuYWx5emVFbnRyeVBvaW50c0ZuKFxuICAgIGxvZ2dlcjogTG9nZ2VyLCBmaW5kZXI6IEVudHJ5UG9pbnRGaW5kZXIsIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0sXG4gICAgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXI6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSwgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4sXG4gICAgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLCBpblBhcmFsbGVsOiBib29sZWFuKTogQW5hbHl6ZUVudHJ5UG9pbnRzRm4ge1xuICByZXR1cm4gKCkgPT4ge1xuICAgIGxvZ2dlci5kZWJ1ZygnQW5hbHl6aW5nIGVudHJ5LXBvaW50cy4uLicpO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICBsZXQgZW50cnlQb2ludEluZm8gPSBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKCk7XG4gICAgY29uc3QgY2xlYW5lZCA9IGNsZWFuT3V0ZGF0ZWRQYWNrYWdlcyhmaWxlU3lzdGVtLCBlbnRyeVBvaW50SW5mby5lbnRyeVBvaW50cyk7XG4gICAgaWYgKGNsZWFuZWQpIHtcbiAgICAgIC8vIElmIHdlIGhhZCB0byBjbGVhbiB1cCBvbmUgb3IgbW9yZSBwYWNrYWdlcyB0aGVuIHdlIG11c3QgcmVhZCBpbiB0aGUgZW50cnktcG9pbnRzIGFnYWluLlxuICAgICAgZW50cnlQb2ludEluZm8gPSBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKCk7XG4gICAgfVxuXG4gICAgY29uc3Qge2VudHJ5UG9pbnRzLCBpbnZhbGlkRW50cnlQb2ludHMsIGdyYXBofSA9IGVudHJ5UG9pbnRJbmZvO1xuICAgIGxvZ0ludmFsaWRFbnRyeVBvaW50cyhsb2dnZXIsIGludmFsaWRFbnRyeVBvaW50cyk7XG5cbiAgICBjb25zdCB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuICAgIC8vIFRoZSB0YXNrcyBhcmUgcGFydGlhbGx5IG9yZGVyZWQgYnkgdmlydHVlIG9mIHRoZSBlbnRyeS1wb2ludHMgYmVpbmcgcGFydGlhbGx5IG9yZGVyZWQgdG9vLlxuICAgIGNvbnN0IHRhc2tzOiBQYXJ0aWFsbHlPcmRlcmVkVGFza3MgPSBbXSBhcyBhbnk7XG5cbiAgICBmb3IgKGNvbnN0IGVudHJ5UG9pbnQgb2YgZW50cnlQb2ludHMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICAgIGNvbnN0IGhhc1Byb2Nlc3NlZFR5cGluZ3MgPSBoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCAndHlwaW5ncycpO1xuICAgICAgY29uc3Qge3Byb3BlcnRpZXNUb1Byb2Nlc3MsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwfSA9XG4gICAgICAgICAgZ2V0UHJvcGVydGllc1RvUHJvY2VzcyhwYWNrYWdlSnNvbiwgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKTtcbiAgICAgIGxldCBwcm9jZXNzRHRzID0gIWhhc1Byb2Nlc3NlZFR5cGluZ3M7XG5cbiAgICAgIGlmIChwcm9wZXJ0aWVzVG9Qcm9jZXNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBUaGlzIGVudHJ5LXBvaW50IGlzIHVucHJvY2Vzc2FibGUgKGkuZS4gdGhlcmUgaXMgbm8gZm9ybWF0IHByb3BlcnR5IHRoYXQgaXMgb2YgaW50ZXJlc3RcbiAgICAgICAgLy8gYW5kIGNhbiBiZSBwcm9jZXNzZWQpLiBUaGlzIHdpbGwgcmVzdWx0IGluIGFuIGVycm9yLCBidXQgY29udGludWUgbG9vcGluZyBvdmVyXG4gICAgICAgIC8vIGVudHJ5LXBvaW50cyBpbiBvcmRlciB0byBjb2xsZWN0IGFsbCB1bnByb2Nlc3NhYmxlIG9uZXMgYW5kIGRpc3BsYXkgYSBtb3JlIGluZm9ybWF0aXZlXG4gICAgICAgIC8vIGVycm9yLlxuICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLnB1c2goZW50cnlQb2ludC5wYXRoKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybWF0UHJvcGVydHkgb2YgcHJvcGVydGllc1RvUHJvY2Vzcykge1xuICAgICAgICBpZiAoaGFzQmVlblByb2Nlc3NlZChlbnRyeVBvaW50LnBhY2thZ2VKc29uLCBmb3JtYXRQcm9wZXJ0eSkpIHtcbiAgICAgICAgICAvLyBUaGUgZm9ybWF0LXBhdGggd2hpY2ggdGhlIHByb3BlcnR5IG1hcHMgdG8gaXMgYWxyZWFkeSBwcm9jZXNzZWQgLSBub3RoaW5nIHRvIGRvLlxuICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXRQcm9wZXJ0eX0gKGFscmVhZHkgY29tcGlsZWQpLmApO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkID0gZXF1aXZhbGVudFByb3BlcnRpZXNNYXAuZ2V0KGZvcm1hdFByb3BlcnR5KSE7XG4gICAgICAgIHRhc2tzLnB1c2goe2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9KTtcblxuICAgICAgICAvLyBPbmx5IHByb2Nlc3MgdHlwaW5ncyBmb3IgdGhlIGZpcnN0IHByb3BlcnR5IChpZiBub3QgYWxyZWFkeSBwcm9jZXNzZWQpLlxuICAgICAgICBwcm9jZXNzRHRzID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGVudHJ5LXBvaW50cyBmb3Igd2hpY2ggd2UgY291bGQgbm90IHByb2Nlc3MgYW55IGZvcm1hdCBhdCBhbGwuXG4gICAgaWYgKHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdVbmFibGUgdG8gcHJvY2VzcyBhbnkgZm9ybWF0cyBmb3IgdGhlIGZvbGxvd2luZyBlbnRyeS1wb2ludHMgKHRyaWVkICcgK1xuICAgICAgICAgIGAke3Byb3BlcnRpZXNUb0NvbnNpZGVyLmpvaW4oJywgJyl9KTogYCArXG4gICAgICAgICAgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5tYXAocGF0aCA9PiBgXFxuICAtICR7cGF0aH1gKS5qb2luKCcnKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMCkgLyAxMDtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgIGBBbmFseXplZCAke2VudHJ5UG9pbnRzLmxlbmd0aH0gZW50cnktcG9pbnRzIGluICR7ZHVyYXRpb259cy4gYCArXG4gICAgICAgIGAoVG90YWwgdGFza3M6ICR7dGFza3MubGVuZ3RofSlgKTtcblxuICAgIHJldHVybiBnZXRUYXNrUXVldWUobG9nZ2VyLCBpblBhcmFsbGVsLCB0YXNrcywgZ3JhcGgpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyOiBMb2dnZXIsIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXSk6IHZvaWQge1xuICBpbnZhbGlkRW50cnlQb2ludHMuZm9yRWFjaChpbnZhbGlkRW50cnlQb2ludCA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgSW52YWxpZCBlbnRyeS1wb2ludCAke2ludmFsaWRFbnRyeVBvaW50LmVudHJ5UG9pbnQucGF0aH0uYCxcbiAgICAgICAgYEl0IGlzIG1pc3NpbmcgcmVxdWlyZWQgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICAgICAgaW52YWxpZEVudHJ5UG9pbnQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1gKS5qb2luKCdcXG4nKSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gY29tcHV0ZXMgYW5kIHJldHVybnMgdGhlIGZvbGxvd2luZzpcbiAqIC0gYHByb3BlcnRpZXNUb1Byb2Nlc3NgOiBBbiAob3JkZXJlZCkgbGlzdCBvZiBwcm9wZXJ0aWVzIHRoYXQgZXhpc3QgYW5kIG5lZWQgdG8gYmUgcHJvY2Vzc2VkLFxuICogICBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYHByb3BlcnRpZXNUb0NvbnNpZGVyYCwgdGhlIHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgYW5kIHRoZWlyXG4gKiAgIGNvcnJlc3BvbmRpbmcgZm9ybWF0LXBhdGhzLiBOT1RFOiBPbmx5IG9uZSBwcm9wZXJ0eSBwZXIgZm9ybWF0LXBhdGggbmVlZHMgdG8gYmUgcHJvY2Vzc2VkLlxuICogLSBgZXF1aXZhbGVudFByb3BlcnRpZXNNYXBgOiBBIG1hcHBpbmcgZnJvbSBlYWNoIHByb3BlcnR5IGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCB0byB0aGUgbGlzdCBvZlxuICogICBvdGhlciBmb3JtYXQgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCB0aGF0IG5lZWQgdG8gYmUgbWFya2VkIGFzIHByb2Nlc3NlZCBhcyBzb29uIGFzIHRoZVxuICogICBmb3JtZXIgaGFzIGJlZW4gcHJvY2Vzc2VkLlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0aWVzVG9Qcm9jZXNzKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pOiB7XG4gIHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXTtcbiAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXA6IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+O1xufSB7XG4gIGNvbnN0IGZvcm1hdFBhdGhzVG9Db25zaWRlciA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGNvbnN0IHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgZGVmaW5lZCBpbiBgcGFja2FnZS5qc29uYC5cbiAgICBpZiAodHlwZW9mIGZvcm1hdFBhdGggIT09ICdzdHJpbmcnKSBjb250aW51ZTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgbWFwIHRvIHRoZSBzYW1lIGZvcm1hdC1wYXRoIGFzIGEgcHJlY2VkaW5nIHByb3BlcnR5LlxuICAgIGlmIChmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIFByb2Nlc3MgdGhpcyBwcm9wZXJ0eSwgYmVjYXVzZSBpdCBpcyB0aGUgZmlyc3Qgb25lIHRvIG1hcCB0byB0aGlzIGZvcm1hdC1wYXRoLlxuICAgIGZvcm1hdFBhdGhzVG9Db25zaWRlci5hZGQoZm9ybWF0UGF0aCk7XG4gICAgcHJvcGVydGllc1RvUHJvY2Vzcy5wdXNoKHByb3ApO1xuXG4gICAgLy8gSWYgd2Ugb25seSBuZWVkIG9uZSBmb3JtYXQgcHJvY2Vzc2VkLCB0aGVyZSBpcyBubyBuZWVkIHRvIHByb2Nlc3MgYW55IG1vcmUgcHJvcGVydGllcy5cbiAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSBicmVhaztcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXM6IHtbZm9ybWF0UGF0aDogc3RyaW5nXTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdfSA9IHt9O1xuICBmb3IgKGNvbnN0IHByb3Agb2YgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGRvIG5vdCBtYXAgdG8gYSBmb3JtYXQtcGF0aCB0aGF0IHdpbGwgYmUgY29uc2lkZXJlZC5cbiAgICBpZiAoIWZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gQWRkIHRoaXMgcHJvcGVydHkgdG8gdGhlIG1hcC5cbiAgICBjb25zdCBsaXN0ID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSB8fCAoZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSA9IFtdKTtcbiAgICBsaXN0LnB1c2gocHJvcCk7XG4gIH1cblxuICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllc01hcCA9IG5ldyBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPigpO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF0hO1xuICAgIGNvbnN0IGVxdWl2YWxlbnRQcm9wZXJ0aWVzID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXTtcbiAgICBlcXVpdmFsZW50UHJvcGVydGllc01hcC5zZXQocHJvcCwgZXF1aXZhbGVudFByb3BlcnRpZXMpO1xuICB9XG5cbiAgcmV0dXJuIHtwcm9wZXJ0aWVzVG9Qcm9jZXNzLCBlcXVpdmFsZW50UHJvcGVydGllc01hcH07XG59XG5cbmZ1bmN0aW9uIGdldFRhc2tRdWV1ZShcbiAgICBsb2dnZXI6IExvZ2dlciwgaW5QYXJhbGxlbDogYm9vbGVhbiwgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcyxcbiAgICBncmFwaDogRGVwR3JhcGg8RW50cnlQb2ludD4pOiBUYXNrUXVldWUge1xuICBjb25zdCBkZXBlbmRlbmNpZXMgPSBjb21wdXRlVGFza0RlcGVuZGVuY2llcyh0YXNrcywgZ3JhcGgpO1xuICByZXR1cm4gaW5QYXJhbGxlbCA/IG5ldyBQYXJhbGxlbFRhc2tRdWV1ZShsb2dnZXIsIHRhc2tzLCBkZXBlbmRlbmNpZXMpIDpcbiAgICAgICAgICAgICAgICAgICAgICBuZXcgU2VyaWFsVGFza1F1ZXVlKGxvZ2dlciwgdGFza3MsIGRlcGVuZGVuY2llcyk7XG59XG4iXX0=