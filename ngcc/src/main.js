/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "os", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/execution/cluster/executor", "@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater", "@angular/compiler-cli/ngcc/src/execution/lock_file", "@angular/compiler-cli/ngcc/src/execution/single_process_executor", "@angular/compiler-cli/ngcc/src/execution/task_selection/parallel_task_queue", "@angular/compiler-cli/ngcc/src/execution/task_selection/serial_task_queue", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", "@angular/compiler-cli/ngcc/src/writing/package_json_updater"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var os = require("os");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var commonjs_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host");
    var dependency_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver");
    var dts_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host");
    var esm_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    var umd_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host");
    var directory_walker_entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder");
    var targeted_entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder");
    var executor_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/executor");
    var package_json_updater_1 = require("@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater");
    var lock_file_1 = require("@angular/compiler-cli/ngcc/src/execution/lock_file");
    var single_process_executor_1 = require("@angular/compiler-cli/ngcc/src/execution/single_process_executor");
    var parallel_task_queue_1 = require("@angular/compiler-cli/ngcc/src/execution/task_selection/parallel_task_queue");
    var serial_task_queue_1 = require("@angular/compiler-cli/ngcc/src/execution/task_selection/serial_task_queue");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var configuration_1 = require("@angular/compiler-cli/ngcc/src/packages/configuration");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var entry_point_bundle_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle");
    var transformer_1 = require("@angular/compiler-cli/ngcc/src/packages/transformer");
    var package_cleaner_1 = require("@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner");
    var in_place_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    var package_json_updater_2 = require("@angular/compiler-cli/ngcc/src/writing/package_json_updater");
    function mainNgcc(_a) {
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _b = _a.propertiesToConsider, propertiesToConsider = _b === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _b, _c = _a.compileAllFormats, compileAllFormats = _c === void 0 ? true : _c, _d = _a.createNewEntryPointFormats, createNewEntryPointFormats = _d === void 0 ? false : _d, _e = _a.logger, logger = _e === void 0 ? new console_logger_1.ConsoleLogger(console_logger_1.LogLevel.info) : _e, pathMappings = _a.pathMappings, _f = _a.async, async = _f === void 0 ? false : _f, _g = _a.enableI18nLegacyMessageIdFormat, enableI18nLegacyMessageIdFormat = _g === void 0 ? true : _g;
        // Execute in parallel, if async execution is acceptable and there are more than 1 CPU cores.
        var inParallel = async && (os.cpus().length > 1);
        // Instantiate common utilities that are always used.
        // NOTE: Avoid eagerly instantiating anything that might not be used when running sync/async or in
        //       master/worker process.
        var fileSystem = file_system_1.getFileSystem();
        var absBasePath = file_system_1.absoluteFrom(basePath);
        var config = new configuration_1.NgccConfiguration(fileSystem, file_system_1.dirname(absBasePath));
        var dependencyResolver = getDependencyResolver(fileSystem, logger, config, pathMappings);
        // Bail out early if the work is already done.
        var supportedPropertiesToConsider = ensureSupportedProperties(propertiesToConsider);
        var absoluteTargetEntryPointPath = targetEntryPointPath !== undefined ? file_system_1.resolve(basePath, targetEntryPointPath) : null;
        var finder = getEntryPointFinder(fileSystem, logger, dependencyResolver, config, absBasePath, absoluteTargetEntryPointPath, pathMappings);
        if (finder instanceof targeted_entry_point_finder_1.TargetedEntryPointFinder &&
            !finder.targetNeedsProcessingOrCleaning(supportedPropertiesToConsider, compileAllFormats)) {
            logger.debug('The target entry-point has already been processed');
            return;
        }
        // NOTE: To avoid file corruption, ensure that each `ngcc` invocation only creates _one_ instance
        //       of `PackageJsonUpdater` that actually writes to disk (across all processes).
        //       This is hard to enforce automatically, when running on multiple processes, so needs to be
        //       enforced manually.
        var pkgJsonUpdater = getPackageJsonUpdater(inParallel, fileSystem);
        // The function for performing the analysis.
        var analyzeEntryPoints = function () {
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
            var duration = Math.round((Date.now() - startTime) / 1000);
            logger.debug("Analyzed " + entryPoints.length + " entry-points in " + duration + "s. " +
                ("(Total tasks: " + tasks.length + ")"));
            return getTaskQueue(inParallel, tasks, graph);
        };
        // The function for creating the `compile()` function.
        var createCompileFn = function (onTaskCompleted) {
            var fileWriter = getFileWriter(fileSystem, pkgJsonUpdater, createNewEntryPointFormats);
            var transformer = new transformer_1.Transformer(fileSystem, logger);
            return function (task) {
                var entryPoint = task.entryPoint, formatProperty = task.formatProperty, formatPropertiesToMarkAsProcessed = task.formatPropertiesToMarkAsProcessed, processDts = task.processDts;
                var isCore = entryPoint.name === '@angular/core'; // Are we compiling the Angular core?
                var packageJson = entryPoint.packageJson;
                var formatPath = packageJson[formatProperty];
                var format = entry_point_1.getEntryPointFormat(fileSystem, entryPoint, formatProperty);
                // All properties listed in `propertiesToProcess` are guaranteed to point to a format-path
                // (i.e. they are defined in `entryPoint.packageJson`). Furthermore, they are also guaranteed
                // to be among `SUPPORTED_FORMAT_PROPERTIES`.
                // Based on the above, `formatPath` should always be defined and `getEntryPointFormat()`
                // should always return a format here (and not `undefined`).
                if (!formatPath || !format) {
                    // This should never happen.
                    throw new Error("Invariant violated: No format-path or format for " + entryPoint.path + " : " +
                        (formatProperty + " (formatPath: " + formatPath + " | format: " + format + ")"));
                }
                // The format-path which the property maps to is already processed - nothing to do.
                if (build_marker_1.hasBeenProcessed(packageJson, formatProperty)) {
                    logger.debug("Skipping " + entryPoint.name + " : " + formatProperty + " (already compiled).");
                    onTaskCompleted(task, 0 /* AlreadyProcessed */);
                    return;
                }
                var bundle = entry_point_bundle_1.makeEntryPointBundle(fileSystem, entryPoint, formatPath, isCore, format, processDts, pathMappings, true, enableI18nLegacyMessageIdFormat);
                logger.info("Compiling " + entryPoint.name + " : " + formatProperty + " as " + format);
                var result = transformer.transform(bundle);
                if (result.success) {
                    if (result.diagnostics.length > 0) {
                        logger.warn(diagnostics_1.replaceTsWithNgInErrors(ts.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host)));
                    }
                    fileWriter.writeBundle(bundle, result.transformedFiles, formatPropertiesToMarkAsProcessed);
                }
                else {
                    var errors = diagnostics_1.replaceTsWithNgInErrors(ts.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host));
                    throw new Error("Failed to compile entry-point " + entryPoint.name + " (" + formatProperty + " as " + format + ") due to compilation errors:\n" + errors);
                }
                logger.debug("  Successfully compiled " + entryPoint.name + " : " + formatProperty);
                onTaskCompleted(task, 1 /* Processed */);
            };
        };
        // The executor for actually planning and getting the work done.
        var executor = getExecutor(async, inParallel, logger, pkgJsonUpdater, new lock_file_1.LockFile(fileSystem));
        return executor.execute(analyzeEntryPoints, createCompileFn);
    }
    exports.mainNgcc = mainNgcc;
    function ensureSupportedProperties(properties) {
        var e_3, _a;
        // Short-circuit the case where `properties` has fallen back to the default value:
        // `SUPPORTED_FORMAT_PROPERTIES`
        if (properties === entry_point_1.SUPPORTED_FORMAT_PROPERTIES)
            return entry_point_1.SUPPORTED_FORMAT_PROPERTIES;
        var supportedProperties = [];
        try {
            for (var _b = tslib_1.__values(properties), _c = _b.next(); !_c.done; _c = _b.next()) {
                var prop = _c.value;
                if (entry_point_1.SUPPORTED_FORMAT_PROPERTIES.indexOf(prop) !== -1) {
                    supportedProperties.push(prop);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        if (supportedProperties.length === 0) {
            throw new Error("No supported format property to consider among [" + properties.join(', ') + "]. " +
                ("Supported properties: " + entry_point_1.SUPPORTED_FORMAT_PROPERTIES.join(', ')));
        }
        return supportedProperties;
    }
    function getPackageJsonUpdater(inParallel, fs) {
        var directPkgJsonUpdater = new package_json_updater_2.DirectPackageJsonUpdater(fs);
        return inParallel ? new package_json_updater_1.ClusterPackageJsonUpdater(directPkgJsonUpdater) : directPkgJsonUpdater;
    }
    function getFileWriter(fs, pkgJsonUpdater, createNewEntryPointFormats) {
        return createNewEntryPointFormats ? new new_entry_point_file_writer_1.NewEntryPointFileWriter(fs, pkgJsonUpdater) :
            new in_place_file_writer_1.InPlaceFileWriter(fs);
    }
    function getTaskQueue(inParallel, tasks, graph) {
        return inParallel ? new parallel_task_queue_1.ParallelTaskQueue(tasks, graph) : new serial_task_queue_1.SerialTaskQueue(tasks);
    }
    function getExecutor(async, inParallel, logger, pkgJsonUpdater, lockFile) {
        if (inParallel) {
            // Execute in parallel (which implies async).
            // Use up to 8 CPU cores for workers, always reserving one for master.
            var workerCount = Math.min(8, os.cpus().length - 1);
            return new executor_1.ClusterExecutor(workerCount, logger, pkgJsonUpdater, lockFile);
        }
        else {
            // Execute serially, on a single thread (either sync or async).
            return async ? new single_process_executor_1.AsyncSingleProcessExecutor(logger, pkgJsonUpdater, lockFile) :
                new single_process_executor_1.SingleProcessExecutor(logger, pkgJsonUpdater, lockFile);
        }
    }
    function getDependencyResolver(fileSystem, logger, config, pathMappings) {
        var moduleResolver = new module_resolver_1.ModuleResolver(fileSystem, pathMappings);
        var esmDependencyHost = new esm_dependency_host_1.EsmDependencyHost(fileSystem, moduleResolver);
        var umdDependencyHost = new umd_dependency_host_1.UmdDependencyHost(fileSystem, moduleResolver);
        var commonJsDependencyHost = new commonjs_dependency_host_1.CommonJsDependencyHost(fileSystem, moduleResolver);
        var dtsDependencyHost = new dts_dependency_host_1.DtsDependencyHost(fileSystem, pathMappings);
        return new dependency_resolver_1.DependencyResolver(fileSystem, logger, config, {
            esm5: esmDependencyHost,
            esm2015: esmDependencyHost,
            umd: umdDependencyHost,
            commonjs: commonJsDependencyHost
        }, dtsDependencyHost);
    }
    function getEntryPointFinder(fs, logger, resolver, config, basePath, absoluteTargetEntryPointPath, pathMappings) {
        if (absoluteTargetEntryPointPath !== null) {
            return new targeted_entry_point_finder_1.TargetedEntryPointFinder(fs, config, logger, resolver, basePath, absoluteTargetEntryPointPath, pathMappings);
        }
        else {
            return new directory_walker_entry_point_finder_1.DirectoryWalkerEntryPointFinder(fs, config, logger, resolver, basePath, pathMappings);
        }
    }
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
        var e_4, _a, e_5, _b, e_6, _c;
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
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (propertiesToConsider_1_1 && !propertiesToConsider_1_1.done && (_a = propertiesToConsider_1.return)) _a.call(propertiesToConsider_1);
            }
            finally { if (e_4) throw e_4.error; }
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
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (SUPPORTED_FORMAT_PROPERTIES_1_1 && !SUPPORTED_FORMAT_PROPERTIES_1_1.done && (_b = SUPPORTED_FORMAT_PROPERTIES_1.return)) _b.call(SUPPORTED_FORMAT_PROPERTIES_1);
            }
            finally { if (e_5) throw e_5.error; }
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
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (propertiesToConsider_2_1 && !propertiesToConsider_2_1.done && (_c = propertiesToConsider_2.return)) _c.call(propertiesToConsider_2);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return { propertiesToProcess: propertiesToProcess, equivalentPropertiesMap: equivalentPropertiesMap };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILHVCQUF5QjtJQUN6QiwrQkFBaUM7SUFFakMsMkVBQW9FO0lBQ3BFLDJFQUFzSDtJQUV0SCxpSEFBK0U7SUFDL0UsdUdBQXlGO0lBQ3pGLHVHQUFxRTtJQUNyRSx1R0FBcUU7SUFDckUsK0ZBQThEO0lBQzlELHVHQUFxRTtJQUNyRSw2SUFBeUc7SUFFekcsNkhBQTBGO0lBRTFGLHNGQUE2RDtJQUM3RCw4R0FBbUY7SUFDbkYsZ0ZBQStDO0lBQy9DLDRHQUFzRztJQUN0RyxtSEFBaUY7SUFDakYsK0dBQTZFO0lBQzdFLHdGQUFpRTtJQUVqRSxxRkFBMEU7SUFDMUUsdUZBQTJEO0lBQzNELG1GQUFtSjtJQUNuSixpR0FBbUU7SUFDbkUsbUZBQW1EO0lBRW5ELG1HQUF5RTtJQUV6RSxvR0FBaUU7SUFDakUsa0hBQThFO0lBQzlFLG9HQUE0RjtJQTZGNUYsU0FBZ0IsUUFBUSxDQUNwQixFQUdxRDtZQUhwRCxzQkFBUSxFQUFFLDhDQUFvQixFQUFFLDRCQUFrRCxFQUFsRCxxRkFBa0QsRUFDbEYseUJBQXdCLEVBQXhCLDZDQUF3QixFQUFFLGtDQUFrQyxFQUFsQyx1REFBa0MsRUFDNUQsY0FBeUMsRUFBekMsZ0dBQXlDLEVBQUUsOEJBQVksRUFBRSxhQUFhLEVBQWIsa0NBQWEsRUFDdEUsdUNBQXNDLEVBQXRDLDJEQUFzQztRQUN6Qyw2RkFBNkY7UUFDN0YsSUFBTSxVQUFVLEdBQUcsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVuRCxxREFBcUQ7UUFDckQsa0dBQWtHO1FBQ2xHLCtCQUErQjtRQUMvQixJQUFNLFVBQVUs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LENBQUMsQ0FBQztnQkFFckMsNERBQTREO2dCQUM1RCxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVE7b0JBQUUsU0FBUztnQkFFN0MsOEVBQThFO2dCQUM5RSxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztvQkFBRSxTQUFTO2dCQUVyRCxnQ0FBZ0M7Z0JBQ2hDLElBQU0sSUFBSSxHQUFHLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQzdGLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDakI7Ozs7Ozs7OztRQUVELElBQU0sdUJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQW9ELENBQUM7O1lBQzVGLEtBQW1CLElBQUEseUJBQUEsaUJBQUEsb0JBQW9CLENBQUEsMERBQUEsNEZBQUU7Z0JBQXBDLElBQU0sSUFBSSxpQ0FBQTtnQkFDYixJQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFHLENBQUM7Z0JBQ3ZDLElBQU0sb0JBQW9CLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2hFLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsQ0FBQzthQUN6RDs7Ozs7Ozs7O1FBRUQsT0FBTyxFQUFDLG1CQUFtQixxQkFBQSxFQUFFLHVCQUF1Qix5QkFBQSxFQUFDLENBQUM7SUFDeEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0IHtEZXBHcmFwaH0gZnJvbSAnZGVwZW5kZW5jeS1ncmFwaCc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtyZXBsYWNlVHNXaXRoTmdJbkVycm9yc30gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgZ2V0RmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtDb21tb25Kc0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIEludmFsaWRFbnRyeVBvaW50fSBmcm9tICcuL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7RHRzRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2R0c19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtVbWREZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7RW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvaW50ZXJmYWNlJztcbmltcG9ydCB7VGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbiwgQ3JlYXRlQ29tcGlsZUZuLCBFeGVjdXRvciwgUGFydGlhbGx5T3JkZXJlZFRhc2tzLCBUYXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUsIFRhc2tRdWV1ZX0gZnJvbSAnLi9leGVjdXRpb24vYXBpJztcbmltcG9ydCB7Q2x1c3RlckV4ZWN1dG9yfSBmcm9tICcuL2V4ZWN1dGlvbi9jbHVzdGVyL2V4ZWN1dG9yJztcbmltcG9ydCB7Q2x1c3RlclBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi9leGVjdXRpb24vY2x1c3Rlci9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge0xvY2tGaWxlfSBmcm9tICcuL2V4ZWN1dGlvbi9sb2NrX2ZpbGUnO1xuaW1wb3J0IHtBc3luY1NpbmdsZVByb2Nlc3NFeGVjdXRvciwgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yfSBmcm9tICcuL2V4ZWN1dGlvbi9zaW5nbGVfcHJvY2Vzc19leGVjdXRvcic7XG5pbXBvcnQge1BhcmFsbGVsVGFza1F1ZXVlfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrX3NlbGVjdGlvbi9wYXJhbGxlbF90YXNrX3F1ZXVlJztcbmltcG9ydCB7U2VyaWFsVGFza1F1ZXVlfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrX3NlbGVjdGlvbi9zZXJpYWxfdGFza19xdWV1ZSc7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtoYXNCZWVuUHJvY2Vzc2VkLCBtYXJrQXNQcm9jZXNzZWR9IGZyb20gJy4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7bWFrZUVudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtjbGVhbk91dGRhdGVkUGFja2FnZXN9IGZyb20gJy4vd3JpdGluZy9jbGVhbmluZy9wYWNrYWdlX2NsZWFuZXInO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIsIFBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIgZm9yIHN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTeW5jTmdjY09wdGlvbnMge1xuICAvKiogVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlcyB0byBwcm9jZXNzLiAqL1xuICBiYXNlUGF0aDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byB0aGUgcHJpbWFyeSBwYWNrYWdlIHRvIGJlIHByb2Nlc3NlZC4gSWYgbm90IGFic29sdXRlIHRoZW4gaXQgbXVzdCBiZSByZWxhdGl2ZSB0b1xuICAgKiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBBbGwgaXRzIGRlcGVuZGVuY2llcyB3aWxsIG5lZWQgdG8gYmUgcHJvY2Vzc2VkIHRvby5cbiAgICovXG4gIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGljaCBlbnRyeS1wb2ludCBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY29uc2lkZXIgd2hlbiBwcm9jZXNzaW5nIGFuIGVudHJ5LXBvaW50LlxuICAgKiBFYWNoIHByb3BlcnR5IHNob3VsZCBob2xkIGEgcGF0aCB0byB0aGUgcGFydGljdWxhciBidW5kbGUgZm9ybWF0IGZvciB0aGUgZW50cnktcG9pbnQuXG4gICAqIERlZmF1bHRzIHRvIGFsbCB0aGUgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uLlxuICAgKi9cbiAgcHJvcGVydGllc1RvQ29uc2lkZXI/OiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogV2hldGhlciB0byBwcm9jZXNzIGFsbCBmb3JtYXRzIHNwZWNpZmllZCBieSAoYHByb3BlcnRpZXNUb0NvbnNpZGVyYCkgIG9yIHRvIHN0b3AgcHJvY2Vzc2luZ1xuICAgKiB0aGlzIGVudHJ5LXBvaW50IGF0IHRoZSBmaXJzdCBtYXRjaGluZyBmb3JtYXQuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIGNvbXBpbGVBbGxGb3JtYXRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBjcmVhdGUgbmV3IGVudHJ5LXBvaW50cyBidW5kbGVzIHJhdGhlciB0aGFuIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBmaWxlcy5cbiAgICovXG4gIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogUHJvdmlkZSBhIGxvZ2dlciB0aGF0IHdpbGwgYmUgY2FsbGVkIHdpdGggbG9nIG1lc3NhZ2VzLlxuICAgKi9cbiAgbG9nZ2VyPzogTG9nZ2VyO1xuXG4gIC8qKlxuICAgKiBQYXRocyBtYXBwaW5nIGNvbmZpZ3VyYXRpb24gKGBwYXRoc2AgYW5kIGBiYXNlVXJsYCksIGFzIGZvdW5kIGluIGB0cy5Db21waWxlck9wdGlvbnNgLlxuICAgKiBUaGVzZSBhcmUgdXNlZCB0byByZXNvbHZlIHBhdGhzIHRvIGxvY2FsbHkgYnVpbHQgQW5ndWxhciBsaWJyYXJpZXMuXG4gICAqL1xuICBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3M7XG5cbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBmaWxlLXN5c3RlbSBzZXJ2aWNlIHRoYXQgd2lsbCBiZSB1c2VkIGJ5IG5nY2MgZm9yIGFsbCBmaWxlIGludGVyYWN0aW9ucy5cbiAgICovXG4gIGZpbGVTeXN0ZW0/OiBGaWxlU3lzdGVtO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBjb21waWxhdGlvbiBzaG91bGQgcnVuIGFuZCByZXR1cm4gYXN5bmNocm9ub3VzbHkuIEFsbG93aW5nIGFzeW5jaHJvbm91cyBleGVjdXRpb25cbiAgICogbWF5IHNwZWVkIHVwIHRoZSBjb21waWxhdGlvbiBieSB1dGlsaXppbmcgbXVsdGlwbGUgQ1BVIGNvcmVzIChpZiBhdmFpbGFibGUpLlxuICAgKlxuICAgKiBEZWZhdWx0OiBgZmFsc2VgIChpLmUuIHJ1biBzeW5jaHJvbm91c2x5KVxuICAgKi9cbiAgYXN5bmM/OiBmYWxzZTtcblxuICAvKipcbiAgICogUmVuZGVyIGAkbG9jYWxpemVgIG1lc3NhZ2VzIHdpdGggbGVnYWN5IGZvcm1hdCBpZHMuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC4gT25seSBzZXQgdGhpcyB0byBgZmFsc2VgIGlmIHlvdSBkbyBub3Qgd2FudCBsZWdhY3kgbWVzc2FnZSBpZHMgdG9cbiAgICogYmUgcmVuZGVyZWQuIEZvciBleGFtcGxlLCBpZiB5b3UgYXJlIG5vdCB1c2luZyBsZWdhY3kgbWVzc2FnZSBpZHMgaW4geW91ciB0cmFuc2xhdGlvbiBmaWxlc1xuICAgKiBBTkQgYXJlIG5vdCBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgb2YgdHJhbnNsYXRpb25zLCBpbiB3aGljaCBjYXNlIHRoZSBleHRyYSBtZXNzYWdlIGlkc1xuICAgKiB3b3VsZCBhZGQgdW53YW50ZWQgc2l6ZSB0byB0aGUgZmluYWwgc291cmNlIGJ1bmRsZS5cbiAgICpcbiAgICogSXQgaXMgc2FmZSB0byBsZWF2ZSB0aGlzIHNldCB0byB0cnVlIGlmIHlvdSBhcmUgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIGJlY2F1c2UgdGhlIGV4dHJhXG4gICAqIGxlZ2FjeSBtZXNzYWdlIGlkcyB3aWxsIGFsbCBiZSBzdHJpcHBlZCBkdXJpbmcgdHJhbnNsYXRpb24uXG4gICAqL1xuICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIgZm9yIGFzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKi9cbmV4cG9ydCB0eXBlIEFzeW5jTmdjY09wdGlvbnMgPSBPbWl0PFN5bmNOZ2NjT3B0aW9ucywgJ2FzeW5jJz4mIHthc3luYzogdHJ1ZX07XG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyLlxuICovXG5leHBvcnQgdHlwZSBOZ2NjT3B0aW9ucyA9IEFzeW5jTmdjY09wdGlvbnMgfCBTeW5jTmdjY09wdGlvbnM7XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeS1wb2ludCBpbnRvIG5nY2MgKGFOR3VsYXIgQ29tcGF0aWJpbGl0eSBDb21waWxlcikuXG4gKlxuICogWW91IGNhbiBjYWxsIHRoaXMgZnVuY3Rpb24gdG8gcHJvY2VzcyBvbmUgb3IgbW9yZSBucG0gcGFja2FnZXMsIHRvIGVuc3VyZVxuICogdGhhdCB0aGV5IGFyZSBjb21wYXRpYmxlIHdpdGggdGhlIGl2eSBjb21waWxlciAobmd0c2MpLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIFRoZSBvcHRpb25zIHRlbGxpbmcgbmdjYyB3aGF0IHRvIGNvbXBpbGUgYW5kIGhvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKG9wdGlvbnM6IEFzeW5jTmdjY09wdGlvbnMpOiBQcm9taXNlPHZvaWQ+O1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKG9wdGlvbnM6IFN5bmNOZ2NjT3B0aW9ucyk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2MoXG4gICAge2Jhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIgPSBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsXG4gICAgIGNvbXBpbGVBbGxGb3JtYXRzID0gdHJ1ZSwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPSBmYWxzZSxcbiAgICAgbG9nZ2VyID0gbmV3IENvbnNvbGVMb2dnZXIoTG9nTGV2ZWwuaW5mbyksIHBhdGhNYXBwaW5ncywgYXN5bmMgPSBmYWxzZSxcbiAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCA9IHRydWV9OiBOZ2NjT3B0aW9ucyk6IHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gIC8vIEV4ZWN1dGUgaW4gcGFyYWxsZWwsIGlmIGFzeW5jIGV4ZWN1dGlvbiBpcyBhY2NlcHRhYmxlIGFuZCB0aGVyZSBhcmUgbW9yZSB0aGFuIDEgQ1BVIGNvcmVzLlxuICBjb25zdCBpblBhcmFsbGVsID0gYXN5bmMgJiYgKG9zLmNwdXMoKS5sZW5ndGggPiAxKTtcblxuICAvLyBJbnN0YW50aWF0ZSBjb21tb24gdXRpbGl0aWVzIHRoYXQgYXJlIGFsd2F5cyB1c2VkLlxuICAvLyBOT1RFOiBBdm9pZCBlYWdlcmx5IGluc3RhbnRpYXRpbmcgYW55dGhpbmcgdGhhdCBtaWdodCBub3QgYmUgdXNlZCB3aGVuIHJ1bm5pbmcgc3luYy9hc3luYyBvciBpblxuICAvLyAgICAgICBtYXN0ZXIvd29ya2VyIHByb2Nlc3MuXG4gIGNvbnN0IGZpbGVTeXN0ZW0gPSBnZXRGaWxlU3lzdGVtKCk7XG4gIGNvbnN0IGFic0Jhc2VQYXRoID0gYWJzb2x1dGVGcm9tKGJhc2VQYXRoKTtcbiAgY29uc3QgY29uZmlnID0gbmV3IE5nY2NDb25maWd1cmF0aW9uKGZpbGVTeXN0ZW0sIGRpcm5hbWUoYWJzQmFzZVBhdGgpKTtcbiAgY29uc3QgZGVwZW5kZW5jeVJlc29sdmVyID0gZ2V0RGVwZW5kZW5jeVJlc29sdmVyKGZpbGVTeXN0ZW0sIGxvZ2dlciwgY29uZmlnLCBwYXRoTWFwcGluZ3MpO1xuXG4gIC8vIEJhaWwgb3V0IGVhcmx5IGlmIHRoZSB3b3JrIGlzIGFscmVhZHkgZG9uZS5cbiAgY29uc3Qgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIgPSBlbnN1cmVTdXBwb3J0ZWRQcm9wZXJ0aWVzKHByb3BlcnRpZXNUb0NvbnNpZGVyKTtcbiAgY29uc3QgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCA9XG4gICAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCAhPT0gdW5kZWZpbmVkID8gcmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpIDogbnVsbDtcbiAgY29uc3QgZmluZGVyID0gZ2V0RW50cnlQb2ludEZpbmRlcihcbiAgICAgIGZpbGVTeXN0ZW0sIGxvZ2dlciwgZGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWcsIGFic0Jhc2VQYXRoLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgICAgcGF0aE1hcHBpbmdzKTtcbiAgaWYgKGZpbmRlciBpbnN0YW5jZW9mIFRhcmdldGVkRW50cnlQb2ludEZpbmRlciAmJlxuICAgICAgIWZpbmRlci50YXJnZXROZWVkc1Byb2Nlc3NpbmdPckNsZWFuaW5nKHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cykpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1RoZSB0YXJnZXQgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBOT1RFOiBUbyBhdm9pZCBmaWxlIGNvcnJ1cHRpb24sIGVuc3VyZSB0aGF0IGVhY2ggYG5nY2NgIGludm9jYXRpb24gb25seSBjcmVhdGVzIF9vbmVfIGluc3RhbmNlXG4gIC8vICAgICAgIG9mIGBQYWNrYWdlSnNvblVwZGF0ZXJgIHRoYXQgYWN0dWFsbHkgd3JpdGVzIHRvIGRpc2sgKGFjcm9zcyBhbGwgcHJvY2Vzc2VzKS5cbiAgLy8gICAgICAgVGhpcyBpcyBoYXJkIHRvIGVuZm9yY2UgYXV0b21hdGljYWxseSwgd2hlbiBydW5uaW5nIG9uIG11bHRpcGxlIHByb2Nlc3Nlcywgc28gbmVlZHMgdG8gYmVcbiAgLy8gICAgICAgZW5mb3JjZWQgbWFudWFsbHkuXG4gIGNvbnN0IHBrZ0pzb25VcGRhdGVyID0gZ2V0UGFja2FnZUpzb25VcGRhdGVyKGluUGFyYWxsZWwsIGZpbGVTeXN0ZW0pO1xuXG4gIC8vIFRoZSBmdW5jdGlvbiBmb3IgcGVyZm9ybWluZyB0aGUgYW5hbHlzaXMuXG4gIGNvbnN0IGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4gPSAoKSA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKCdBbmFseXppbmcgZW50cnktcG9pbnRzLi4uJyk7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGxldCBlbnRyeVBvaW50SW5mbyA9IGZpbmRlci5maW5kRW50cnlQb2ludHMoKTtcbiAgICBjb25zdCBjbGVhbmVkID0gY2xlYW5PdXRkYXRlZFBhY2thZ2VzKGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnRJbmZvLmVudHJ5UG9pbnRzKTtcbiAgICBpZiAoY2xlYW5lZCkge1xuICAgICAgLy8gSWYgd2UgaGFkIHRvIGNsZWFuIHVwIG9uZSBvciBtb3JlIHBhY2thZ2VzIHRoZW4gd2UgbXVzdCByZWFkIGluIHRoZSBlbnRyeS1wb2ludHMgYWdhaW4uXG4gICAgICBlbnRyeVBvaW50SW5mbyA9IGZpbmRlci5maW5kRW50cnlQb2ludHMoKTtcbiAgICB9XG5cbiAgICBjb25zdCB7ZW50cnlQb2ludHMsIGludmFsaWRFbnRyeVBvaW50cywgZ3JhcGh9ID0gZW50cnlQb2ludEluZm87XG4gICAgbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzKTtcblxuICAgIGNvbnN0IHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHM6IHN0cmluZ1tdID0gW107XG4gICAgLy8gVGhlIHRhc2tzIGFyZSBwYXJ0aWFsbHkgb3JkZXJlZCBieSB2aXJ0dWUgb2YgdGhlIGVudHJ5LXBvaW50cyBiZWluZyBwYXJ0aWFsbHkgb3JkZXJlZCB0b28uXG4gICAgY29uc3QgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcyA9IFtdIGFzIGFueTtcblxuICAgIGZvciAoY29uc3QgZW50cnlQb2ludCBvZiBlbnRyeVBvaW50cykge1xuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgICAgY29uc3QgaGFzUHJvY2Vzc2VkVHlwaW5ncyA9IGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sICd0eXBpbmdzJyk7XG4gICAgICBjb25zdCB7cHJvcGVydGllc1RvUHJvY2VzcywgZXF1aXZhbGVudFByb3BlcnRpZXNNYXB9ID1cbiAgICAgICAgICBnZXRQcm9wZXJ0aWVzVG9Qcm9jZXNzKHBhY2thZ2VKc29uLCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpO1xuICAgICAgbGV0IHByb2Nlc3NEdHMgPSAhaGFzUHJvY2Vzc2VkVHlwaW5ncztcblxuICAgICAgaWYgKHByb3BlcnRpZXNUb1Byb2Nlc3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIFRoaXMgZW50cnktcG9pbnQgaXMgdW5wcm9jZXNzYWJsZSAoaS5lLiB0aGVyZSBpcyBubyBmb3JtYXQgcHJvcGVydHkgdGhhdCBpcyBvZiBpbnRlcmVzdFxuICAgICAgICAvLyBhbmQgY2FuIGJlIHByb2Nlc3NlZCkuIFRoaXMgd2lsbCByZXN1bHQgaW4gYW4gZXJyb3IsIGJ1dCBjb250aW51ZSBsb29waW5nIG92ZXJcbiAgICAgICAgLy8gZW50cnktcG9pbnRzIGluIG9yZGVyIHRvIGNvbGxlY3QgYWxsIHVucHJvY2Vzc2FibGUgb25lcyBhbmQgZGlzcGxheSBhIG1vcmUgaW5mb3JtYXRpdmVcbiAgICAgICAgLy8gZXJyb3IuXG4gICAgICAgIHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHMucHVzaChlbnRyeVBvaW50LnBhdGgpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBmb3JtYXRQcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Qcm9jZXNzKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCA9IGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwLmdldChmb3JtYXRQcm9wZXJ0eSkgITtcbiAgICAgICAgdGFza3MucHVzaCh7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30pO1xuXG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyB0eXBpbmdzIGZvciB0aGUgZmlyc3QgcHJvcGVydHkgKGlmIG5vdCBhbHJlYWR5IHByb2Nlc3NlZCkuXG4gICAgICAgIHByb2Nlc3NEdHMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgZW50cnktcG9pbnRzIGZvciB3aGljaCB3ZSBjb3VsZCBub3QgcHJvY2VzcyBhbnkgZm9ybWF0IGF0IGFsbC5cbiAgICBpZiAodW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1VuYWJsZSB0byBwcm9jZXNzIGFueSBmb3JtYXRzIGZvciB0aGUgZm9sbG93aW5nIGVudHJ5LXBvaW50cyAodHJpZWQgJyArXG4gICAgICAgICAgYCR7cHJvcGVydGllc1RvQ29uc2lkZXIuam9pbignLCAnKX0pOiBgICtcbiAgICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLm1hcChwYXRoID0+IGBcXG4gIC0gJHtwYXRofWApLmpvaW4oJycpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgQW5hbHl6ZWQgJHtlbnRyeVBvaW50cy5sZW5ndGh9IGVudHJ5LXBvaW50cyBpbiAke2R1cmF0aW9ufXMuIGAgK1xuICAgICAgICBgKFRvdGFsIHRhc2tzOiAke3Rhc2tzLmxlbmd0aH0pYCk7XG5cbiAgICByZXR1cm4gZ2V0VGFza1F1ZXVlKGluUGFyYWxsZWwsIHRhc2tzLCBncmFwaCk7XG4gIH07XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBjcmVhdGluZyB0aGUgYGNvbXBpbGUoKWAgZnVuY3Rpb24uXG4gIGNvbnN0IGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuID0gb25UYXNrQ29tcGxldGVkID0+IHtcbiAgICBjb25zdCBmaWxlV3JpdGVyID0gZ2V0RmlsZVdyaXRlcihmaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlciwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMpO1xuICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFRyYW5zZm9ybWVyKGZpbGVTeXN0ZW0sIGxvZ2dlcik7XG5cbiAgICByZXR1cm4gKHRhc2s6IFRhc2spID0+IHtcbiAgICAgIGNvbnN0IHtlbnRyeVBvaW50LCBmb3JtYXRQcm9wZXJ0eSwgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkLCBwcm9jZXNzRHRzfSA9IHRhc2s7XG5cbiAgICAgIGNvbnN0IGlzQ29yZSA9IGVudHJ5UG9pbnQubmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnOyAgLy8gQXJlIHdlIGNvbXBpbGluZyB0aGUgQW5ndWxhciBjb3JlP1xuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW2Zvcm1hdFByb3BlcnR5XTtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IGdldEVudHJ5UG9pbnRGb3JtYXQoZmlsZVN5c3RlbSwgZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHkpO1xuXG4gICAgICAvLyBBbGwgcHJvcGVydGllcyBsaXN0ZWQgaW4gYHByb3BlcnRpZXNUb1Byb2Nlc3NgIGFyZSBndWFyYW50ZWVkIHRvIHBvaW50IHRvIGEgZm9ybWF0LXBhdGhcbiAgICAgIC8vIChpLmUuIHRoZXkgYXJlIGRlZmluZWQgaW4gYGVudHJ5UG9pbnQucGFja2FnZUpzb25gKS4gRnVydGhlcm1vcmUsIHRoZXkgYXJlIGFsc28gZ3VhcmFudGVlZFxuICAgICAgLy8gdG8gYmUgYW1vbmcgYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2AuXG4gICAgICAvLyBCYXNlZCBvbiB0aGUgYWJvdmUsIGBmb3JtYXRQYXRoYCBzaG91bGQgYWx3YXlzIGJlIGRlZmluZWQgYW5kIGBnZXRFbnRyeVBvaW50Rm9ybWF0KClgXG4gICAgICAvLyBzaG91bGQgYWx3YXlzIHJldHVybiBhIGZvcm1hdCBoZXJlIChhbmQgbm90IGB1bmRlZmluZWRgKS5cbiAgICAgIGlmICghZm9ybWF0UGF0aCB8fCAhZm9ybWF0KSB7XG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEludmFyaWFudCB2aW9sYXRlZDogTm8gZm9ybWF0LXBhdGggb3IgZm9ybWF0IGZvciAke2VudHJ5UG9pbnQucGF0aH0gOiBgICtcbiAgICAgICAgICAgIGAke2Zvcm1hdFByb3BlcnR5fSAoZm9ybWF0UGF0aDogJHtmb3JtYXRQYXRofSB8IGZvcm1hdDogJHtmb3JtYXR9KWApO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgZm9ybWF0LXBhdGggd2hpY2ggdGhlIHByb3BlcnR5IG1hcHMgdG8gaXMgYWxyZWFkeSBwcm9jZXNzZWQgLSBub3RoaW5nIHRvIGRvLlxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sIGZvcm1hdFByb3BlcnR5KSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5BbHJlYWR5UHJvY2Vzc2VkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQYXRoLCBpc0NvcmUsIGZvcm1hdCwgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzLCB0cnVlLFxuICAgICAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fWApO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oYnVuZGxlKTtcbiAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICBpZiAocmVzdWx0LmRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBsb2dnZXIud2FybihyZXBsYWNlVHNXaXRoTmdJbkVycm9ycyhcbiAgICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KSkpO1xuICAgICAgICB9XG4gICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoYnVuZGxlLCByZXN1bHQudHJhbnNmb3JtZWRGaWxlcywgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVycm9ycyA9IHJlcGxhY2VUc1dpdGhOZ0luRXJyb3JzKFxuICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBlbnRyeS1wb2ludCAke2VudHJ5UG9pbnQubmFtZX0gKCR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fSkgZHVlIHRvIGNvbXBpbGF0aW9uIGVycm9yczpcXG4ke2Vycm9yc31gKTtcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmRlYnVnKGAgIFN1Y2Nlc3NmdWxseSBjb21waWxlZCAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fWApO1xuXG4gICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZCk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBUaGUgZXhlY3V0b3IgZm9yIGFjdHVhbGx5IHBsYW5uaW5nIGFuZCBnZXR0aW5nIHRoZSB3b3JrIGRvbmUuXG4gIGNvbnN0IGV4ZWN1dG9yID0gZ2V0RXhlY3V0b3IoYXN5bmMsIGluUGFyYWxsZWwsIGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIsIG5ldyBMb2NrRmlsZShmaWxlU3lzdGVtKSk7XG5cbiAgcmV0dXJuIGV4ZWN1dG9yLmV4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzLCBjcmVhdGVDb21waWxlRm4pO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVTdXBwb3J0ZWRQcm9wZXJ0aWVzKHByb3BlcnRpZXM6IHN0cmluZ1tdKTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdIHtcbiAgLy8gU2hvcnQtY2lyY3VpdCB0aGUgY2FzZSB3aGVyZSBgcHJvcGVydGllc2AgaGFzIGZhbGxlbiBiYWNrIHRvIHRoZSBkZWZhdWx0IHZhbHVlOlxuICAvLyBgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTYFxuICBpZiAocHJvcGVydGllcyA9PT0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSByZXR1cm4gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTO1xuXG4gIGNvbnN0IHN1cHBvcnRlZFByb3BlcnRpZXM6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzIGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSkge1xuICAgIGlmIChTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuaW5kZXhPZihwcm9wKSAhPT0gLTEpIHtcbiAgICAgIHN1cHBvcnRlZFByb3BlcnRpZXMucHVzaChwcm9wKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc3VwcG9ydGVkUHJvcGVydGllcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBObyBzdXBwb3J0ZWQgZm9ybWF0IHByb3BlcnR5IHRvIGNvbnNpZGVyIGFtb25nIFske3Byb3BlcnRpZXMuam9pbignLCAnKX1dLiBgICtcbiAgICAgICAgYFN1cHBvcnRlZCBwcm9wZXJ0aWVzOiAke1NVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUy5qb2luKCcsICcpfWApO1xuICB9XG5cbiAgcmV0dXJuIHN1cHBvcnRlZFByb3BlcnRpZXM7XG59XG5cbmZ1bmN0aW9uIGdldFBhY2thZ2VKc29uVXBkYXRlcihpblBhcmFsbGVsOiBib29sZWFuLCBmczogRmlsZVN5c3RlbSk6IFBhY2thZ2VKc29uVXBkYXRlciB7XG4gIGNvbnN0IGRpcmVjdFBrZ0pzb25VcGRhdGVyID0gbmV3IERpcmVjdFBhY2thZ2VKc29uVXBkYXRlcihmcyk7XG4gIHJldHVybiBpblBhcmFsbGVsID8gbmV3IENsdXN0ZXJQYWNrYWdlSnNvblVwZGF0ZXIoZGlyZWN0UGtnSnNvblVwZGF0ZXIpIDogZGlyZWN0UGtnSnNvblVwZGF0ZXI7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVXcml0ZXIoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsXG4gICAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM6IGJvb2xlYW4pOiBGaWxlV3JpdGVyIHtcbiAgcmV0dXJuIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID8gbmV3IE5ld0VudHJ5UG9pbnRGaWxlV3JpdGVyKGZzLCBwa2dKc29uVXBkYXRlcikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSW5QbGFjZUZpbGVXcml0ZXIoZnMpO1xufVxuXG5mdW5jdGlvbiBnZXRUYXNrUXVldWUoXG4gICAgaW5QYXJhbGxlbDogYm9vbGVhbiwgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcywgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+KTogVGFza1F1ZXVlIHtcbiAgcmV0dXJuIGluUGFyYWxsZWwgPyBuZXcgUGFyYWxsZWxUYXNrUXVldWUodGFza3MsIGdyYXBoKSA6IG5ldyBTZXJpYWxUYXNrUXVldWUodGFza3MpO1xufVxuXG5mdW5jdGlvbiBnZXRFeGVjdXRvcihcbiAgICBhc3luYzogYm9vbGVhbiwgaW5QYXJhbGxlbDogYm9vbGVhbiwgbG9nZ2VyOiBMb2dnZXIsIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsXG4gICAgbG9ja0ZpbGU6IExvY2tGaWxlKTogRXhlY3V0b3Ige1xuICBpZiAoaW5QYXJhbGxlbCkge1xuICAgIC8vIEV4ZWN1dGUgaW4gcGFyYWxsZWwgKHdoaWNoIGltcGxpZXMgYXN5bmMpLlxuICAgIC8vIFVzZSB1cCB0byA4IENQVSBjb3JlcyBmb3Igd29ya2VycywgYWx3YXlzIHJlc2VydmluZyBvbmUgZm9yIG1hc3Rlci5cbiAgICBjb25zdCB3b3JrZXJDb3VudCA9IE1hdGgubWluKDgsIG9zLmNwdXMoKS5sZW5ndGggLSAxKTtcbiAgICByZXR1cm4gbmV3IENsdXN0ZXJFeGVjdXRvcih3b3JrZXJDb3VudCwgbG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgbG9ja0ZpbGUpO1xuICB9IGVsc2Uge1xuICAgIC8vIEV4ZWN1dGUgc2VyaWFsbHksIG9uIGEgc2luZ2xlIHRocmVhZCAoZWl0aGVyIHN5bmMgb3IgYXN5bmMpLlxuICAgIHJldHVybiBhc3luYyA/IG5ldyBBc3luY1NpbmdsZVByb2Nlc3NFeGVjdXRvcihsb2dnZXIsIHBrZ0pzb25VcGRhdGVyLCBsb2NrRmlsZSkgOlxuICAgICAgICAgICAgICAgICAgIG5ldyBTaW5nbGVQcm9jZXNzRXhlY3V0b3IobG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgbG9ja0ZpbGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldERlcGVuZGVuY3lSZXNvbHZlcihcbiAgICBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbixcbiAgICBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8IHVuZGVmaW5lZCk6IERlcGVuZGVuY3lSZXNvbHZlciB7XG4gIGNvbnN0IG1vZHVsZVJlc29sdmVyID0gbmV3IE1vZHVsZVJlc29sdmVyKGZpbGVTeXN0ZW0sIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVzbURlcGVuZGVuY3lIb3N0ID0gbmV3IEVzbURlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgY29uc3QgdW1kRGVwZW5kZW5jeUhvc3QgPSBuZXcgVW1kRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCBjb21tb25Kc0RlcGVuZGVuY3lIb3N0ID0gbmV3IENvbW1vbkpzRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCBkdHNEZXBlbmRlbmN5SG9zdCA9IG5ldyBEdHNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBwYXRoTWFwcGluZ3MpO1xuICByZXR1cm4gbmV3IERlcGVuZGVuY3lSZXNvbHZlcihcbiAgICAgIGZpbGVTeXN0ZW0sIGxvZ2dlciwgY29uZmlnLCB7XG4gICAgICAgIGVzbTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgICBlc20yMDE1OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICAgICAgdW1kOiB1bWREZXBlbmRlbmN5SG9zdCxcbiAgICAgICAgY29tbW9uanM6IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3RcbiAgICAgIH0sXG4gICAgICBkdHNEZXBlbmRlbmN5SG9zdCk7XG59XG5cbmZ1bmN0aW9uIGdldEVudHJ5UG9pbnRGaW5kZXIoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGxvZ2dlcjogTG9nZ2VyLCByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLFxuICAgIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGggfCBudWxsLFxuICAgIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkKTogRW50cnlQb2ludEZpbmRlciB7XG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIG5ldyBUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXIoXG4gICAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgRGlyZWN0b3J5V2Fsa2VyRW50cnlQb2ludEZpbmRlcihcbiAgICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlcjogTG9nZ2VyLCBpbnZhbGlkRW50cnlQb2ludHM6IEludmFsaWRFbnRyeVBvaW50W10pOiB2b2lkIHtcbiAgaW52YWxpZEVudHJ5UG9pbnRzLmZvckVhY2goaW52YWxpZEVudHJ5UG9pbnQgPT4ge1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYEludmFsaWQgZW50cnktcG9pbnQgJHtpbnZhbGlkRW50cnlQb2ludC5lbnRyeVBvaW50LnBhdGh9LmAsXG4gICAgICAgIGBJdCBpcyBtaXNzaW5nIHJlcXVpcmVkIGRlcGVuZGVuY2llczpcXG5gICtcbiAgICAgICAgICAgIGludmFsaWRFbnRyeVBvaW50Lm1pc3NpbmdEZXBlbmRlbmNpZXMubWFwKGRlcCA9PiBgIC0gJHtkZXB9YCkuam9pbignXFxuJykpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGNvbXB1dGVzIGFuZCByZXR1cm5zIHRoZSBmb2xsb3dpbmc6XG4gKiAtIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYDogQW4gKG9yZGVyZWQpIGxpc3Qgb2YgcHJvcGVydGllcyB0aGF0IGV4aXN0IGFuZCBuZWVkIHRvIGJlIHByb2Nlc3NlZCxcbiAqICAgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGBwcm9wZXJ0aWVzVG9Db25zaWRlcmAsIHRoZSBwcm9wZXJ0aWVzIGluIGBwYWNrYWdlLmpzb25gIGFuZCB0aGVpclxuICogICBjb3JyZXNwb25kaW5nIGZvcm1hdC1wYXRocy4gTk9URTogT25seSBvbmUgcHJvcGVydHkgcGVyIGZvcm1hdC1wYXRoIG5lZWRzIHRvIGJlIHByb2Nlc3NlZC5cbiAqIC0gYGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwYDogQSBtYXBwaW5nIGZyb20gZWFjaCBwcm9wZXJ0eSBpbiBgcHJvcGVydGllc1RvUHJvY2Vzc2AgdG8gdGhlIGxpc3Qgb2ZcbiAqICAgb3RoZXIgZm9ybWF0IHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgdGhhdCBuZWVkIHRvIGJlIG1hcmtlZCBhcyBwcm9jZXNzZWQgYXMgc29vbiBhcyB0aGVcbiAqICAgZm9ybWVyIGhhcyBiZWVuIHByb2Nlc3NlZC5cbiAqL1xuZnVuY3Rpb24gZ2V0UHJvcGVydGllc1RvUHJvY2VzcyhcbiAgICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKToge1xuICBwcm9wZXJ0aWVzVG9Qcm9jZXNzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W107XG4gIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwOiBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPjtcbn0ge1xuICBjb25zdCBmb3JtYXRQYXRoc1RvQ29uc2lkZXIgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBjb25zdCBwcm9wZXJ0aWVzVG9Qcm9jZXNzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IG1hcCB0byB0aGUgc2FtZSBmb3JtYXQtcGF0aCBhcyBhIHByZWNlZGluZyBwcm9wZXJ0eS5cbiAgICBpZiAoZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmhhcyhmb3JtYXRQYXRoKSkgY29udGludWU7XG5cbiAgICAvLyBQcm9jZXNzIHRoaXMgcHJvcGVydHksIGJlY2F1c2UgaXQgaXMgdGhlIGZpcnN0IG9uZSB0byBtYXAgdG8gdGhpcyBmb3JtYXQtcGF0aC5cbiAgICBmb3JtYXRQYXRoc1RvQ29uc2lkZXIuYWRkKGZvcm1hdFBhdGgpO1xuICAgIHByb3BlcnRpZXNUb1Byb2Nlc3MucHVzaChwcm9wKTtcblxuICAgIC8vIElmIHdlIG9ubHkgbmVlZCBvbmUgZm9ybWF0IHByb2Nlc3NlZCwgdGhlcmUgaXMgbm8gbmVlZCB0byBwcm9jZXNzIGFueSBtb3JlIHByb3BlcnRpZXMuXG4gICAgaWYgKCFjb21waWxlQWxsRm9ybWF0cykgYnJlYWs7XG4gIH1cblxuICBjb25zdCBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzOiB7W2Zvcm1hdFBhdGg6IHN0cmluZ106IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXX0gPSB7fTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIG5vdCBkZWZpbmVkIGluIGBwYWNrYWdlLmpzb25gLlxuICAgIGlmICh0eXBlb2YgZm9ybWF0UGF0aCAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBkbyBub3QgbWFwIHRvIGEgZm9ybWF0LXBhdGggdGhhdCB3aWxsIGJlIGNvbnNpZGVyZWQuXG4gICAgaWYgKCFmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIEFkZCB0aGlzIHByb3BlcnR5IHRvIHRoZSBtYXAuXG4gICAgY29uc3QgbGlzdCA9IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF0gfHwgKGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF0gPSBbXSk7XG4gICAgbGlzdC5wdXNoKHByb3ApO1xuICB9XG5cbiAgY29uc3QgZXF1aXZhbGVudFByb3BlcnRpZXNNYXAgPSBuZXcgTWFwPEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXT4oKTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdICE7XG4gICAgY29uc3QgZXF1aXZhbGVudFByb3BlcnRpZXMgPSBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdO1xuICAgIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwLnNldChwcm9wLCBlcXVpdmFsZW50UHJvcGVydGllcyk7XG4gIH1cblxuICByZXR1cm4ge3Byb3BlcnRpZXNUb1Byb2Nlc3MsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwfTtcbn1cbiJdfQ==