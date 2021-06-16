import { ParallelTaskQueue } from '../execution/tasks/queues/parallel_task_queue';
import { SerialTaskQueue } from '../execution/tasks/queues/serial_task_queue';
import { computeTaskDependencies } from '../execution/tasks/utils';
import { hasBeenProcessed } from '../packages/build_marker';
import { SUPPORTED_FORMAT_PROPERTIES } from '../packages/entry_point';
import { cleanOutdatedPackages } from '../writing/cleaning/package_cleaner';
import { DtsProcessing } from './tasks/api';
/**
 * Create the function for performing the analysis of the entry-points.
 */
export function getAnalyzeEntryPointsFn(logger, finder, fileSystem, supportedPropertiesToConsider, typingsOnly, compileAllFormats, propertiesToConsider, inParallel) {
    return () => {
        logger.debug('Analyzing entry-points...');
        const startTime = Date.now();
        let entryPointInfo = finder.findEntryPoints();
        const cleaned = cleanOutdatedPackages(fileSystem, entryPointInfo.entryPoints);
        if (cleaned) {
            // If we had to clean up one or more packages then we must read in the entry-points again.
            entryPointInfo = finder.findEntryPoints();
        }
        const { entryPoints, invalidEntryPoints, graph } = entryPointInfo;
        logInvalidEntryPoints(logger, invalidEntryPoints);
        const unprocessableEntryPointPaths = [];
        // The tasks are partially ordered by virtue of the entry-points being partially ordered too.
        const tasks = [];
        for (const entryPoint of entryPoints) {
            const packageJson = entryPoint.packageJson;
            const { propertiesToProcess, equivalentPropertiesMap } = getPropertiesToProcess(packageJson, supportedPropertiesToConsider, compileAllFormats, typingsOnly);
            if (propertiesToProcess.length === 0) {
                // This entry-point is unprocessable (i.e. there is no format property that is of interest
                // and can be processed). This will result in an error, but continue looping over
                // entry-points in order to collect all unprocessable ones and display a more informative
                // error.
                unprocessableEntryPointPaths.push(entryPoint.path);
                continue;
            }
            const hasProcessedTypings = hasBeenProcessed(packageJson, 'typings');
            if (hasProcessedTypings && typingsOnly) {
                // Typings for this entry-point have already been processed and we're in typings-only mode,
                // so no task has to be created for this entry-point.
                logger.debug(`Skipping ${entryPoint.name} : typings have already been processed.`);
                continue;
            }
            let processDts = hasProcessedTypings ? DtsProcessing.No :
                typingsOnly ? DtsProcessing.Only : DtsProcessing.Yes;
            for (const formatProperty of propertiesToProcess) {
                if (hasBeenProcessed(entryPoint.packageJson, formatProperty)) {
                    // The format-path which the property maps to is already processed - nothing to do.
                    logger.debug(`Skipping ${entryPoint.name} : ${formatProperty} (already compiled).`);
                    continue;
                }
                const formatPropertiesToMarkAsProcessed = equivalentPropertiesMap.get(formatProperty);
                tasks.push({ entryPoint, formatProperty, formatPropertiesToMarkAsProcessed, processDts });
                // Only process typings for the first property (if not already processed).
                processDts = DtsProcessing.No;
            }
        }
        // Check for entry-points for which we could not process any format at all.
        if (unprocessableEntryPointPaths.length > 0) {
            throw new Error('Unable to process any formats for the following entry-points (tried ' +
                `${propertiesToConsider.join(', ')}): ` +
                unprocessableEntryPointPaths.map(path => `\n  - ${path}`).join(''));
        }
        const duration = Math.round((Date.now() - startTime) / 100) / 10;
        logger.debug(`Analyzed ${entryPoints.length} entry-points in ${duration}s. ` +
            `(Total tasks: ${tasks.length})`);
        return getTaskQueue(logger, inParallel, tasks, graph);
    };
}
function logInvalidEntryPoints(logger, invalidEntryPoints) {
    invalidEntryPoints.forEach(invalidEntryPoint => {
        logger.debug(`Invalid entry-point ${invalidEntryPoint.entryPoint.path}.`, `It is missing required dependencies:\n` +
            invalidEntryPoint.missingDependencies.map(dep => ` - ${dep}`).join('\n'));
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
    const formatPathsToConsider = new Set();
    const propertiesToProcess = [];
    for (const prop of propertiesToConsider) {
        const formatPath = packageJson[prop];
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
    const formatPathToProperties = {};
    for (const prop of SUPPORTED_FORMAT_PROPERTIES) {
        const formatPath = packageJson[prop];
        // Ignore properties that are not defined in `package.json`.
        if (typeof formatPath !== 'string')
            continue;
        // Ignore properties that do not map to a format-path that will be considered.
        if (!formatPathsToConsider.has(formatPath))
            continue;
        // Add this property to the map.
        const list = formatPathToProperties[formatPath] || (formatPathToProperties[formatPath] = []);
        list.push(prop);
    }
    const equivalentPropertiesMap = new Map();
    for (const prop of propertiesToConsider) {
        const formatPath = packageJson[prop];
        // If we are only processing typings then there should be no format properties to mark
        const equivalentProperties = typingsOnly ? [] : formatPathToProperties[formatPath];
        equivalentPropertiesMap.set(prop, equivalentProperties);
    }
    return { propertiesToProcess, equivalentPropertiesMap };
}
function getTaskQueue(logger, inParallel, tasks, graph) {
    const dependencies = computeTaskDependencies(tasks, graph);
    return inParallel ? new ParallelTaskQueue(logger, tasks, dependencies) :
        new SerialTaskQueue(logger, tasks, dependencies);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZV9lbnRyeV9wb2ludHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2FuYWx5emVfZW50cnlfcG9pbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWFBLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLCtDQUErQyxDQUFDO0FBQ2hGLE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUMsdUJBQXVCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNqRSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQTRELDJCQUEyQixFQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDL0gsT0FBTyxFQUFDLHFCQUFxQixFQUFDLE1BQU0scUNBQXFDLENBQUM7QUFHMUUsT0FBTyxFQUFDLGFBQWEsRUFBbUMsTUFBTSxhQUFhLENBQUM7QUFFNUU7O0dBRUc7QUFDSCxNQUFNLFVBQVUsdUJBQXVCLENBQ25DLE1BQWMsRUFBRSxNQUF3QixFQUFFLFVBQXNCLEVBQ2hFLDZCQUF1RCxFQUFFLFdBQW9CLEVBQzdFLGlCQUEwQixFQUFFLG9CQUE4QixFQUMxRCxVQUFtQjtJQUNyQixPQUFPLEdBQUcsRUFBRTtRQUNWLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUMxQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFN0IsSUFBSSxjQUFjLEdBQUcsTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzlDLE1BQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUUsSUFBSSxPQUFPLEVBQUU7WUFDWCwwRkFBMEY7WUFDMUYsY0FBYyxHQUFHLE1B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Q0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxlQUFlLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztBQUN2RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0RlcEdyYXBofSBmcm9tICdkZXBlbmRlbmN5LWdyYXBoJztcblxuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7SW52YWxpZEVudHJ5UG9pbnR9IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7RW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi4vZW50cnlfcG9pbnRfZmluZGVyL2ludGVyZmFjZSc7XG5pbXBvcnQge1BhcmFsbGVsVGFza1F1ZXVlfSBmcm9tICcuLi9leGVjdXRpb24vdGFza3MvcXVldWVzL3BhcmFsbGVsX3Rhc2tfcXVldWUnO1xuaW1wb3J0IHtTZXJpYWxUYXNrUXVldWV9IGZyb20gJy4uL2V4ZWN1dGlvbi90YXNrcy9xdWV1ZXMvc2VyaWFsX3Rhc2tfcXVldWUnO1xuaW1wb3J0IHtjb21wdXRlVGFza0RlcGVuZGVuY2llc30gZnJvbSAnLi4vZXhlY3V0aW9uL3Rhc2tzL3V0aWxzJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZH0gZnJvbSAnLi4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludFBhY2thZ2VKc29uLCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVN9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7Y2xlYW5PdXRkYXRlZFBhY2thZ2VzfSBmcm9tICcuLi93cml0aW5nL2NsZWFuaW5nL3BhY2thZ2VfY2xlYW5lcic7XG5cbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm59IGZyb20gJy4vYXBpJztcbmltcG9ydCB7RHRzUHJvY2Vzc2luZywgUGFydGlhbGx5T3JkZXJlZFRhc2tzLCBUYXNrUXVldWV9IGZyb20gJy4vdGFza3MvYXBpJztcblxuLyoqXG4gKiBDcmVhdGUgdGhlIGZ1bmN0aW9uIGZvciBwZXJmb3JtaW5nIHRoZSBhbmFseXNpcyBvZiB0aGUgZW50cnktcG9pbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QW5hbHl6ZUVudHJ5UG9pbnRzRm4oXG4gICAgbG9nZ2VyOiBMb2dnZXIsIGZpbmRlcjogRW50cnlQb2ludEZpbmRlciwgZmlsZVN5c3RlbTogRmlsZVN5c3RlbSxcbiAgICBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlcjogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdLCB0eXBpbmdzT25seTogYm9vbGVhbixcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbiwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGluUGFyYWxsZWw6IGJvb2xlYW4pOiBBbmFseXplRW50cnlQb2ludHNGbiB7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKCdBbmFseXppbmcgZW50cnktcG9pbnRzLi4uJyk7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGxldCBlbnRyeVBvaW50SW5mbyA9IGZpbmRlci5maW5kRW50cnlQb2ludHMoKTtcbiAgICBjb25zdCBjbGVhbmVkID0gY2xlYW5PdXRkYXRlZFBhY2thZ2VzKGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnRJbmZvLmVudHJ5UG9pbnRzKTtcbiAgICBpZiAoY2xlYW5lZCkge1xuICAgICAgLy8gSWYgd2UgaGFkIHRvIGNsZWFuIHVwIG9uZSBvciBtb3JlIHBhY2thZ2VzIHRoZW4gd2UgbXVzdCByZWFkIGluIHRoZSBlbnRyeS1wb2ludHMgYWdhaW4uXG4gICAgICBlbnRyeVBvaW50SW5mbyA9IGZpbmRlci5maW5kRW50cnlQb2ludHMoKTtcbiAgICB9XG5cbiAgICBjb25zdCB7ZW50cnlQb2ludHMsIGludmFsaWRFbnRyeVBvaW50cywgZ3JhcGh9ID0gZW50cnlQb2ludEluZm87XG4gICAgbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzKTtcblxuICAgIGNvbnN0IHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHM6IHN0cmluZ1tdID0gW107XG4gICAgLy8gVGhlIHRhc2tzIGFyZSBwYXJ0aWFsbHkgb3JkZXJlZCBieSB2aXJ0dWUgb2YgdGhlIGVudHJ5LXBvaW50cyBiZWluZyBwYXJ0aWFsbHkgb3JkZXJlZCB0b28uXG4gICAgY29uc3QgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcyA9IFtdIGFzIGFueTtcblxuICAgIGZvciAoY29uc3QgZW50cnlQb2ludCBvZiBlbnRyeVBvaW50cykge1xuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgICAgY29uc3Qge3Byb3BlcnRpZXNUb1Byb2Nlc3MsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwfSA9IGdldFByb3BlcnRpZXNUb1Byb2Nlc3MoXG4gICAgICAgICAgcGFja2FnZUpzb24sIHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cywgdHlwaW5nc09ubHkpO1xuXG4gICAgICBpZiAocHJvcGVydGllc1RvUHJvY2Vzcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVGhpcyBlbnRyeS1wb2ludCBpcyB1bnByb2Nlc3NhYmxlIChpLmUuIHRoZXJlIGlzIG5vIGZvcm1hdCBwcm9wZXJ0eSB0aGF0IGlzIG9mIGludGVyZXN0XG4gICAgICAgIC8vIGFuZCBjYW4gYmUgcHJvY2Vzc2VkKS4gVGhpcyB3aWxsIHJlc3VsdCBpbiBhbiBlcnJvciwgYnV0IGNvbnRpbnVlIGxvb3Bpbmcgb3ZlclxuICAgICAgICAvLyBlbnRyeS1wb2ludHMgaW4gb3JkZXIgdG8gY29sbGVjdCBhbGwgdW5wcm9jZXNzYWJsZSBvbmVzIGFuZCBkaXNwbGF5IGEgbW9yZSBpbmZvcm1hdGl2ZVxuICAgICAgICAvLyBlcnJvci5cbiAgICAgICAgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5wdXNoKGVudHJ5UG9pbnQucGF0aCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBoYXNQcm9jZXNzZWRUeXBpbmdzID0gaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgJ3R5cGluZ3MnKTtcbiAgICAgIGlmIChoYXNQcm9jZXNzZWRUeXBpbmdzICYmIHR5cGluZ3NPbmx5KSB7XG4gICAgICAgIC8vIFR5cGluZ3MgZm9yIHRoaXMgZW50cnktcG9pbnQgaGF2ZSBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkIGFuZCB3ZSdyZSBpbiB0eXBpbmdzLW9ubHkgbW9kZSxcbiAgICAgICAgLy8gc28gbm8gdGFzayBoYXMgdG8gYmUgY3JlYXRlZCBmb3IgdGhpcyBlbnRyeS1wb2ludC5cbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiB0eXBpbmdzIGhhdmUgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZC5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBsZXQgcHJvY2Vzc0R0cyA9IGhhc1Byb2Nlc3NlZFR5cGluZ3MgPyBEdHNQcm9jZXNzaW5nLk5vIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGluZ3NPbmx5ID8gRHRzUHJvY2Vzc2luZy5Pbmx5IDogRHRzUHJvY2Vzc2luZy5ZZXM7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybWF0UHJvcGVydHkgb2YgcHJvcGVydGllc1RvUHJvY2Vzcykge1xuICAgICAgICBpZiAoaGFzQmVlblByb2Nlc3NlZChlbnRyeVBvaW50LnBhY2thZ2VKc29uLCBmb3JtYXRQcm9wZXJ0eSkpIHtcbiAgICAgICAgICAvLyBUaGUgZm9ybWF0LXBhdGggd2hpY2ggdGhlIHByb3BlcnR5IG1hcHMgdG8gaXMgYWxyZWFkeSBwcm9jZXNzZWQgLSBub3RoaW5nIHRvIGRvLlxuICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXRQcm9wZXJ0eX0gKGFscmVhZHkgY29tcGlsZWQpLmApO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkID0gZXF1aXZhbGVudFByb3BlcnRpZXNNYXAuZ2V0KGZvcm1hdFByb3BlcnR5KSE7XG4gICAgICAgIHRhc2tzLnB1c2goe2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9KTtcblxuICAgICAgICAvLyBPbmx5IHByb2Nlc3MgdHlwaW5ncyBmb3IgdGhlIGZpcnN0IHByb3BlcnR5IChpZiBub3QgYWxyZWFkeSBwcm9jZXNzZWQpLlxuICAgICAgICBwcm9jZXNzRHRzID0gRHRzUHJvY2Vzc2luZy5ObztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgZW50cnktcG9pbnRzIGZvciB3aGljaCB3ZSBjb3VsZCBub3QgcHJvY2VzcyBhbnkgZm9ybWF0IGF0IGFsbC5cbiAgICBpZiAodW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1VuYWJsZSB0byBwcm9jZXNzIGFueSBmb3JtYXRzIGZvciB0aGUgZm9sbG93aW5nIGVudHJ5LXBvaW50cyAodHJpZWQgJyArXG4gICAgICAgICAgYCR7cHJvcGVydGllc1RvQ29uc2lkZXIuam9pbignLCAnKX0pOiBgICtcbiAgICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLm1hcChwYXRoID0+IGBcXG4gIC0gJHtwYXRofWApLmpvaW4oJycpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwKSAvIDEwO1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYEFuYWx5emVkICR7ZW50cnlQb2ludHMubGVuZ3RofSBlbnRyeS1wb2ludHMgaW4gJHtkdXJhdGlvbn1zLiBgICtcbiAgICAgICAgYChUb3RhbCB0YXNrczogJHt0YXNrcy5sZW5ndGh9KWApO1xuXG4gICAgcmV0dXJuIGdldFRhc2tRdWV1ZShsb2dnZXIsIGluUGFyYWxsZWwsIHRhc2tzLCBncmFwaCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGxvZ0ludmFsaWRFbnRyeVBvaW50cyhsb2dnZXI6IExvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzOiBJbnZhbGlkRW50cnlQb2ludFtdKTogdm9pZCB7XG4gIGludmFsaWRFbnRyeVBvaW50cy5mb3JFYWNoKGludmFsaWRFbnRyeVBvaW50ID0+IHtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgIGBJbnZhbGlkIGVudHJ5LXBvaW50ICR7aW52YWxpZEVudHJ5UG9pbnQuZW50cnlQb2ludC5wYXRofS5gLFxuICAgICAgICBgSXQgaXMgbWlzc2luZyByZXF1aXJlZCBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgICAgICBpbnZhbGlkRW50cnlQb2ludC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfWApLmpvaW4oJ1xcbicpKTtcbiAgfSk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBjb21wdXRlcyBhbmQgcmV0dXJucyB0aGUgZm9sbG93aW5nOlxuICogLSBgcHJvcGVydGllc1RvUHJvY2Vzc2A6IEFuIChvcmRlcmVkKSBsaXN0IG9mIHByb3BlcnRpZXMgdGhhdCBleGlzdCBhbmQgbmVlZCB0byBiZSBwcm9jZXNzZWQsXG4gKiAgIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBgcHJvcGVydGllc1RvQ29uc2lkZXJgLCB0aGUgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCBhbmQgdGhlaXJcbiAqICAgY29ycmVzcG9uZGluZyBmb3JtYXQtcGF0aHMuIE5PVEU6IE9ubHkgb25lIHByb3BlcnR5IHBlciBmb3JtYXQtcGF0aCBuZWVkcyB0byBiZSBwcm9jZXNzZWQuXG4gKiAtIGBlcXVpdmFsZW50UHJvcGVydGllc01hcGA6IEEgbWFwcGluZyBmcm9tIGVhY2ggcHJvcGVydHkgaW4gYHByb3BlcnRpZXNUb1Byb2Nlc3NgIHRvIHRoZSBsaXN0IG9mXG4gKiAgIG90aGVyIGZvcm1hdCBwcm9wZXJ0aWVzIGluIGBwYWNrYWdlLmpzb25gIHRoYXQgbmVlZCB0byBiZSBtYXJrZWQgYXMgcHJvY2Vzc2VkIGFzIHNvb24gYXMgdGhlXG4gKiAgIGZvcm1lciBoYXMgYmVlbiBwcm9jZXNzZWQuXG4gKi9cbmZ1bmN0aW9uIGdldFByb3BlcnRpZXNUb1Byb2Nlc3MoXG4gICAgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgcHJvcGVydGllc1RvQ29uc2lkZXI6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbiwgdHlwaW5nc09ubHk6IGJvb2xlYW4pOiB7XG4gIHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXTtcbiAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXA6IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+O1xufSB7XG4gIGNvbnN0IGZvcm1hdFBhdGhzVG9Db25zaWRlciA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGNvbnN0IHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgZGVmaW5lZCBpbiBgcGFja2FnZS5qc29uYC5cbiAgICBpZiAodHlwZW9mIGZvcm1hdFBhdGggIT09ICdzdHJpbmcnKSBjb250aW51ZTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgbWFwIHRvIHRoZSBzYW1lIGZvcm1hdC1wYXRoIGFzIGEgcHJlY2VkaW5nIHByb3BlcnR5LlxuICAgIGlmIChmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIFByb2Nlc3MgdGhpcyBwcm9wZXJ0eSwgYmVjYXVzZSBpdCBpcyB0aGUgZmlyc3Qgb25lIHRvIG1hcCB0byB0aGlzIGZvcm1hdC1wYXRoLlxuICAgIGZvcm1hdFBhdGhzVG9Db25zaWRlci5hZGQoZm9ybWF0UGF0aCk7XG4gICAgcHJvcGVydGllc1RvUHJvY2Vzcy5wdXNoKHByb3ApO1xuXG4gICAgLy8gSWYgd2Ugb25seSBuZWVkIG9uZSBmb3JtYXQgcHJvY2Vzc2VkLCB0aGVyZSBpcyBubyBuZWVkIHRvIHByb2Nlc3MgYW55IG1vcmUgcHJvcGVydGllcy5cbiAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSBicmVhaztcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXM6IHtbZm9ybWF0UGF0aDogc3RyaW5nXTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdfSA9IHt9O1xuICBmb3IgKGNvbnN0IHByb3Agb2YgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGRvIG5vdCBtYXAgdG8gYSBmb3JtYXQtcGF0aCB0aGF0IHdpbGwgYmUgY29uc2lkZXJlZC5cbiAgICBpZiAoIWZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gQWRkIHRoaXMgcHJvcGVydHkgdG8gdGhlIG1hcC5cbiAgICBjb25zdCBsaXN0ID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSB8fCAoZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSA9IFtdKTtcbiAgICBsaXN0LnB1c2gocHJvcCk7XG4gIH1cblxuICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllc01hcCA9IG5ldyBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPigpO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF0hO1xuICAgIC8vIElmIHdlIGFyZSBvbmx5IHByb2Nlc3NpbmcgdHlwaW5ncyB0aGVuIHRoZXJlIHNob3VsZCBiZSBubyBmb3JtYXQgcHJvcGVydGllcyB0byBtYXJrXG4gICAgY29uc3QgZXF1aXZhbGVudFByb3BlcnRpZXMgPSB0eXBpbmdzT25seSA/IFtdIDogZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXTtcbiAgICBlcXVpdmFsZW50UHJvcGVydGllc01hcC5zZXQocHJvcCwgZXF1aXZhbGVudFByb3BlcnRpZXMpO1xuICB9XG5cbiAgcmV0dXJuIHtwcm9wZXJ0aWVzVG9Qcm9jZXNzLCBlcXVpdmFsZW50UHJvcGVydGllc01hcH07XG59XG5cbmZ1bmN0aW9uIGdldFRhc2tRdWV1ZShcbiAgICBsb2dnZXI6IExvZ2dlciwgaW5QYXJhbGxlbDogYm9vbGVhbiwgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcyxcbiAgICBncmFwaDogRGVwR3JhcGg8RW50cnlQb2ludD4pOiBUYXNrUXVldWUge1xuICBjb25zdCBkZXBlbmRlbmNpZXMgPSBjb21wdXRlVGFza0RlcGVuZGVuY2llcyh0YXNrcywgZ3JhcGgpO1xuICByZXR1cm4gaW5QYXJhbGxlbCA/IG5ldyBQYXJhbGxlbFRhc2tRdWV1ZShsb2dnZXIsIHRhc2tzLCBkZXBlbmRlbmNpZXMpIDpcbiAgICAgICAgICAgICAgICAgICAgICBuZXcgU2VyaWFsVGFza1F1ZXVlKGxvZ2dlciwgdGFza3MsIGRlcGVuZGVuY2llcyk7XG59XG4iXX0=