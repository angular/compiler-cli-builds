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
        var executor = getExecutor(async, inParallel, logger, pkgJsonUpdater, fileSystem);
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
    function getExecutor(async, inParallel, logger, pkgJsonUpdater, fileSystem) {
        if (async) {
            // Execute asynchronously (either serially or in parallel)
            var lockFile = new lock_file_1.LockFileAsync(fileSystem, logger, 500, 50);
            if (inParallel) {
                // Execute in parallel. Use up to 8 CPU cores for workers, always reserving one for master.
                var workerCount = Math.min(8, os.cpus().length - 1);
                return new executor_1.ClusterExecutor(workerCount, logger, pkgJsonUpdater, lockFile);
            }
            else {
                // Execute serially, on a single thread (async).
                return new single_process_executor_1.SingleProcessExecutorAsync(logger, pkgJsonUpdater, lockFile);
            }
        }
        else {
            // Execute serially, on a single thread (sync).
            return new single_process_executor_1.SingleProcessExecutorSync(logger, pkgJsonUpdater, new lock_file_1.LockFileSync(fileSystem));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILHVCQUF5QjtJQUN6QiwrQkFBaUM7SUFFakMsMkVBQW9FO0lBQ3BFLDJFQUFzSDtJQUV0SCxpSEFBK0U7SUFDL0UsdUdBQXlGO0lBQ3pGLHVHQUFxRTtJQUNyRSx1R0FBcUU7SUFDckUsK0ZBQThEO0lBQzlELHVHQUFxRTtJQUNyRSw2SUFBeUc7SUFFekcsNkhBQTBGO0lBRTFGLHNGQUE2RDtJQUM3RCw4R0FBbUY7SUFDbkYsZ0ZBQWtFO0lBQ2xFLDRHQUEwRztJQUMxRyxtSEFBaUY7SUFDakYsK0dBQTZFO0lBQzdFLHdGQUFpRTtJQUVqRSxxRkFBMEU7SUFDMUUsdUZBQTJEO0lBQzNELG1GQUFtSjtJQUNuSixpR0FBbUU7SUFDbkUsbUZBQW1EO0lBRW5ELG1HQUF5RTtJQUV6RSxvR0FBaUU7SUFDakUsa0hBQThFO0lBQzlFLG9HQUE0RjtJQTZGNUYsU0FBZ0IsUUFBUSxDQUNwQixFQUdxRDtZQUhwRCxzQkFBUSxFQUFFLDhDQUFvQixFQUFFLDRCQUFrRCxFQUFsRCxxRkFBa0QsRUFDbEYseUJBQXdCLEVBQXhCLDZDQUF3QixFQUFFLGtDQUFrQyxFQUFsQyx1REFBa0MsRUFDNUQsY0FBeUMsRUFBekMsZ0dBQXlDLEVBQUUsOEJBQVksRUFBRSxhQUFhLEVBQWIsa0NBQWEsRUFDdEUsdUNBQXNDLEVBQXRDLDJEQUFzQztRQUN6Qyw2RkFBNkY7UUFDN0YsSUFBTSxVQUFVLEdBQUcsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVuRCxxREFBcUQ7UUFDckQsa0dBQWtHO1FBQ2xHLCtCQUErQjtRQUMvQixJQUFNLFVBQVUs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QUM7O1lBQ3BGLEtBQW1CLElBQUEsZ0NBQUEsaUJBQUEseUNBQTJCLENBQUEsd0VBQUEsaUhBQUU7Z0JBQTNDLElBQU0sSUFBSSx3Q0FBQTtnQkFDYixJQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRXJDLDREQUE0RDtnQkFDNUQsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRO29CQUFFLFNBQVM7Z0JBRTdDLDhFQUE4RTtnQkFDOUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7b0JBQUUsU0FBUztnQkFFckQsZ0NBQWdDO2dCQUNoQyxJQUFNLElBQUksR0FBRyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2pCOzs7Ozs7Ozs7UUFFRCxJQUFNLHVCQUF1QixHQUFHLElBQUksR0FBRyxFQUFvRCxDQUFDOztZQUM1RixLQUFtQixJQUFBLHlCQUFBLGlCQUFBLG9CQUFvQixDQUFBLDBEQUFBLDRGQUFFO2dCQUFwQyxJQUFNLElBQUksaUNBQUE7Z0JBQ2IsSUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBRyxDQUFDO2dCQUN2QyxJQUFNLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNoRSx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUM7YUFDekQ7Ozs7Ozs7OztRQUVELE9BQU8sRUFBQyxtQkFBbUIscUJBQUEsRUFBRSx1QkFBdUIseUJBQUEsRUFBQyxDQUFDO0lBQ3hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCB7RGVwR3JhcGh9IGZyb20gJ2RlcGVuZGVuY3ktZ3JhcGgnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb20sIGRpcm5hbWUsIGdldEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7Q29tbW9uSnNEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBJbnZhbGlkRW50cnlQb2ludH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0R0c0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9kdHNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RXNtRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2VzbV9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvbW9kdWxlX3Jlc29sdmVyJztcbmltcG9ydCB7VW1kRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL3VtZF9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci9kaXJlY3Rvcnlfd2Fsa2VyX2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2ludGVyZmFjZSc7XG5pbXBvcnQge1RhcmdldGVkRW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvdGFyZ2V0ZWRfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm4sIENyZWF0ZUNvbXBpbGVGbiwgRXhlY3V0b3IsIFBhcnRpYWxseU9yZGVyZWRUYXNrcywgVGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLCBUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL2FwaSc7XG5pbXBvcnQge0NsdXN0ZXJFeGVjdXRvcn0gZnJvbSAnLi9leGVjdXRpb24vY2x1c3Rlci9leGVjdXRvcic7XG5pbXBvcnQge0NsdXN0ZXJQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4vZXhlY3V0aW9uL2NsdXN0ZXIvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtMb2NrRmlsZUFzeW5jLCBMb2NrRmlsZVN5bmN9IGZyb20gJy4vZXhlY3V0aW9uL2xvY2tfZmlsZSc7XG5pbXBvcnQge1NpbmdsZVByb2Nlc3NFeGVjdXRvckFzeW5jLCBTaW5nbGVQcm9jZXNzRXhlY3V0b3JTeW5jfSBmcm9tICcuL2V4ZWN1dGlvbi9zaW5nbGVfcHJvY2Vzc19leGVjdXRvcic7XG5pbXBvcnQge1BhcmFsbGVsVGFza1F1ZXVlfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrX3NlbGVjdGlvbi9wYXJhbGxlbF90YXNrX3F1ZXVlJztcbmltcG9ydCB7U2VyaWFsVGFza1F1ZXVlfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrX3NlbGVjdGlvbi9zZXJpYWxfdGFza19xdWV1ZSc7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtoYXNCZWVuUHJvY2Vzc2VkLCBtYXJrQXNQcm9jZXNzZWR9IGZyb20gJy4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7bWFrZUVudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtjbGVhbk91dGRhdGVkUGFja2FnZXN9IGZyb20gJy4vd3JpdGluZy9jbGVhbmluZy9wYWNrYWdlX2NsZWFuZXInO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIsIFBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIgZm9yIHN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTeW5jTmdjY09wdGlvbnMge1xuICAvKiogVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlcyB0byBwcm9jZXNzLiAqL1xuICBiYXNlUGF0aDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byB0aGUgcHJpbWFyeSBwYWNrYWdlIHRvIGJlIHByb2Nlc3NlZC4gSWYgbm90IGFic29sdXRlIHRoZW4gaXQgbXVzdCBiZSByZWxhdGl2ZSB0b1xuICAgKiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBBbGwgaXRzIGRlcGVuZGVuY2llcyB3aWxsIG5lZWQgdG8gYmUgcHJvY2Vzc2VkIHRvby5cbiAgICovXG4gIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGljaCBlbnRyeS1wb2ludCBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY29uc2lkZXIgd2hlbiBwcm9jZXNzaW5nIGFuIGVudHJ5LXBvaW50LlxuICAgKiBFYWNoIHByb3BlcnR5IHNob3VsZCBob2xkIGEgcGF0aCB0byB0aGUgcGFydGljdWxhciBidW5kbGUgZm9ybWF0IGZvciB0aGUgZW50cnktcG9pbnQuXG4gICAqIERlZmF1bHRzIHRvIGFsbCB0aGUgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uLlxuICAgKi9cbiAgcHJvcGVydGllc1RvQ29uc2lkZXI/OiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogV2hldGhlciB0byBwcm9jZXNzIGFsbCBmb3JtYXRzIHNwZWNpZmllZCBieSAoYHByb3BlcnRpZXNUb0NvbnNpZGVyYCkgIG9yIHRvIHN0b3AgcHJvY2Vzc2luZ1xuICAgKiB0aGlzIGVudHJ5LXBvaW50IGF0IHRoZSBmaXJzdCBtYXRjaGluZyBmb3JtYXQuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIGNvbXBpbGVBbGxGb3JtYXRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBjcmVhdGUgbmV3IGVudHJ5LXBvaW50cyBidW5kbGVzIHJhdGhlciB0aGFuIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBmaWxlcy5cbiAgICovXG4gIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogUHJvdmlkZSBhIGxvZ2dlciB0aGF0IHdpbGwgYmUgY2FsbGVkIHdpdGggbG9nIG1lc3NhZ2VzLlxuICAgKi9cbiAgbG9nZ2VyPzogTG9nZ2VyO1xuXG4gIC8qKlxuICAgKiBQYXRocyBtYXBwaW5nIGNvbmZpZ3VyYXRpb24gKGBwYXRoc2AgYW5kIGBiYXNlVXJsYCksIGFzIGZvdW5kIGluIGB0cy5Db21waWxlck9wdGlvbnNgLlxuICAgKiBUaGVzZSBhcmUgdXNlZCB0byByZXNvbHZlIHBhdGhzIHRvIGxvY2FsbHkgYnVpbHQgQW5ndWxhciBsaWJyYXJpZXMuXG4gICAqL1xuICBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3M7XG5cbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBmaWxlLXN5c3RlbSBzZXJ2aWNlIHRoYXQgd2lsbCBiZSB1c2VkIGJ5IG5nY2MgZm9yIGFsbCBmaWxlIGludGVyYWN0aW9ucy5cbiAgICovXG4gIGZpbGVTeXN0ZW0/OiBGaWxlU3lzdGVtO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBjb21waWxhdGlvbiBzaG91bGQgcnVuIGFuZCByZXR1cm4gYXN5bmNocm9ub3VzbHkuIEFsbG93aW5nIGFzeW5jaHJvbm91cyBleGVjdXRpb25cbiAgICogbWF5IHNwZWVkIHVwIHRoZSBjb21waWxhdGlvbiBieSB1dGlsaXppbmcgbXVsdGlwbGUgQ1BVIGNvcmVzIChpZiBhdmFpbGFibGUpLlxuICAgKlxuICAgKiBEZWZhdWx0OiBgZmFsc2VgIChpLmUuIHJ1biBzeW5jaHJvbm91c2x5KVxuICAgKi9cbiAgYXN5bmM/OiBmYWxzZTtcblxuICAvKipcbiAgICogUmVuZGVyIGAkbG9jYWxpemVgIG1lc3NhZ2VzIHdpdGggbGVnYWN5IGZvcm1hdCBpZHMuXG4gICAqXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC4gT25seSBzZXQgdGhpcyB0byBgZmFsc2VgIGlmIHlvdSBkbyBub3Qgd2FudCBsZWdhY3kgbWVzc2FnZSBpZHMgdG9cbiAgICogYmUgcmVuZGVyZWQuIEZvciBleGFtcGxlLCBpZiB5b3UgYXJlIG5vdCB1c2luZyBsZWdhY3kgbWVzc2FnZSBpZHMgaW4geW91ciB0cmFuc2xhdGlvbiBmaWxlc1xuICAgKiBBTkQgYXJlIG5vdCBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgb2YgdHJhbnNsYXRpb25zLCBpbiB3aGljaCBjYXNlIHRoZSBleHRyYSBtZXNzYWdlIGlkc1xuICAgKiB3b3VsZCBhZGQgdW53YW50ZWQgc2l6ZSB0byB0aGUgZmluYWwgc291cmNlIGJ1bmRsZS5cbiAgICpcbiAgICogSXQgaXMgc2FmZSB0byBsZWF2ZSB0aGlzIHNldCB0byB0cnVlIGlmIHlvdSBhcmUgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIGJlY2F1c2UgdGhlIGV4dHJhXG4gICAqIGxlZ2FjeSBtZXNzYWdlIGlkcyB3aWxsIGFsbCBiZSBzdHJpcHBlZCBkdXJpbmcgdHJhbnNsYXRpb24uXG4gICAqL1xuICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0PzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIgZm9yIGFzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKi9cbmV4cG9ydCB0eXBlIEFzeW5jTmdjY09wdGlvbnMgPSBPbWl0PFN5bmNOZ2NjT3B0aW9ucywgJ2FzeW5jJz4mIHthc3luYzogdHJ1ZX07XG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyLlxuICovXG5leHBvcnQgdHlwZSBOZ2NjT3B0aW9ucyA9IEFzeW5jTmdjY09wdGlvbnMgfCBTeW5jTmdjY09wdGlvbnM7XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeS1wb2ludCBpbnRvIG5nY2MgKGFOR3VsYXIgQ29tcGF0aWJpbGl0eSBDb21waWxlcikuXG4gKlxuICogWW91IGNhbiBjYWxsIHRoaXMgZnVuY3Rpb24gdG8gcHJvY2VzcyBvbmUgb3IgbW9yZSBucG0gcGFja2FnZXMsIHRvIGVuc3VyZVxuICogdGhhdCB0aGV5IGFyZSBjb21wYXRpYmxlIHdpdGggdGhlIGl2eSBjb21waWxlciAobmd0c2MpLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIFRoZSBvcHRpb25zIHRlbGxpbmcgbmdjYyB3aGF0IHRvIGNvbXBpbGUgYW5kIGhvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKG9wdGlvbnM6IEFzeW5jTmdjY09wdGlvbnMpOiBQcm9taXNlPHZvaWQ+O1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKG9wdGlvbnM6IFN5bmNOZ2NjT3B0aW9ucyk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2MoXG4gICAge2Jhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIgPSBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsXG4gICAgIGNvbXBpbGVBbGxGb3JtYXRzID0gdHJ1ZSwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPSBmYWxzZSxcbiAgICAgbG9nZ2VyID0gbmV3IENvbnNvbGVMb2dnZXIoTG9nTGV2ZWwuaW5mbyksIHBhdGhNYXBwaW5ncywgYXN5bmMgPSBmYWxzZSxcbiAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCA9IHRydWV9OiBOZ2NjT3B0aW9ucyk6IHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gIC8vIEV4ZWN1dGUgaW4gcGFyYWxsZWwsIGlmIGFzeW5jIGV4ZWN1dGlvbiBpcyBhY2NlcHRhYmxlIGFuZCB0aGVyZSBhcmUgbW9yZSB0aGFuIDEgQ1BVIGNvcmVzLlxuICBjb25zdCBpblBhcmFsbGVsID0gYXN5bmMgJiYgKG9zLmNwdXMoKS5sZW5ndGggPiAxKTtcblxuICAvLyBJbnN0YW50aWF0ZSBjb21tb24gdXRpbGl0aWVzIHRoYXQgYXJlIGFsd2F5cyB1c2VkLlxuICAvLyBOT1RFOiBBdm9pZCBlYWdlcmx5IGluc3RhbnRpYXRpbmcgYW55dGhpbmcgdGhhdCBtaWdodCBub3QgYmUgdXNlZCB3aGVuIHJ1bm5pbmcgc3luYy9hc3luYyBvciBpblxuICAvLyAgICAgICBtYXN0ZXIvd29ya2VyIHByb2Nlc3MuXG4gIGNvbnN0IGZpbGVTeXN0ZW0gPSBnZXRGaWxlU3lzdGVtKCk7XG4gIGNvbnN0IGFic0Jhc2VQYXRoID0gYWJzb2x1dGVGcm9tKGJhc2VQYXRoKTtcbiAgY29uc3QgY29uZmlnID0gbmV3IE5nY2NDb25maWd1cmF0aW9uKGZpbGVTeXN0ZW0sIGRpcm5hbWUoYWJzQmFzZVBhdGgpKTtcbiAgY29uc3QgZGVwZW5kZW5jeVJlc29sdmVyID0gZ2V0RGVwZW5kZW5jeVJlc29sdmVyKGZpbGVTeXN0ZW0sIGxvZ2dlciwgY29uZmlnLCBwYXRoTWFwcGluZ3MpO1xuXG4gIC8vIEJhaWwgb3V0IGVhcmx5IGlmIHRoZSB3b3JrIGlzIGFscmVhZHkgZG9uZS5cbiAgY29uc3Qgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIgPSBlbnN1cmVTdXBwb3J0ZWRQcm9wZXJ0aWVzKHByb3BlcnRpZXNUb0NvbnNpZGVyKTtcbiAgY29uc3QgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCA9XG4gICAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCAhPT0gdW5kZWZpbmVkID8gcmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpIDogbnVsbDtcbiAgY29uc3QgZmluZGVyID0gZ2V0RW50cnlQb2ludEZpbmRlcihcbiAgICAgIGZpbGVTeXN0ZW0sIGxvZ2dlciwgZGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWcsIGFic0Jhc2VQYXRoLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgICAgcGF0aE1hcHBpbmdzKTtcbiAgaWYgKGZpbmRlciBpbnN0YW5jZW9mIFRhcmdldGVkRW50cnlQb2ludEZpbmRlciAmJlxuICAgICAgIWZpbmRlci50YXJnZXROZWVkc1Byb2Nlc3NpbmdPckNsZWFuaW5nKHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cykpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1RoZSB0YXJnZXQgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBOT1RFOiBUbyBhdm9pZCBmaWxlIGNvcnJ1cHRpb24sIGVuc3VyZSB0aGF0IGVhY2ggYG5nY2NgIGludm9jYXRpb24gb25seSBjcmVhdGVzIF9vbmVfIGluc3RhbmNlXG4gIC8vICAgICAgIG9mIGBQYWNrYWdlSnNvblVwZGF0ZXJgIHRoYXQgYWN0dWFsbHkgd3JpdGVzIHRvIGRpc2sgKGFjcm9zcyBhbGwgcHJvY2Vzc2VzKS5cbiAgLy8gICAgICAgVGhpcyBpcyBoYXJkIHRvIGVuZm9yY2UgYXV0b21hdGljYWxseSwgd2hlbiBydW5uaW5nIG9uIG11bHRpcGxlIHByb2Nlc3Nlcywgc28gbmVlZHMgdG8gYmVcbiAgLy8gICAgICAgZW5mb3JjZWQgbWFudWFsbHkuXG4gIGNvbnN0IHBrZ0pzb25VcGRhdGVyID0gZ2V0UGFja2FnZUpzb25VcGRhdGVyKGluUGFyYWxsZWwsIGZpbGVTeXN0ZW0pO1xuXG4gIC8vIFRoZSBmdW5jdGlvbiBmb3IgcGVyZm9ybWluZyB0aGUgYW5hbHlzaXMuXG4gIGNvbnN0IGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4gPSAoKSA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKCdBbmFseXppbmcgZW50cnktcG9pbnRzLi4uJyk7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGxldCBlbnRyeVBvaW50SW5mbyA9IGZpbmRlci5maW5kRW50cnlQb2ludHMoKTtcbiAgICBjb25zdCBjbGVhbmVkID0gY2xlYW5PdXRkYXRlZFBhY2thZ2VzKGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnRJbmZvLmVudHJ5UG9pbnRzKTtcbiAgICBpZiAoY2xlYW5lZCkge1xuICAgICAgLy8gSWYgd2UgaGFkIHRvIGNsZWFuIHVwIG9uZSBvciBtb3JlIHBhY2thZ2VzIHRoZW4gd2UgbXVzdCByZWFkIGluIHRoZSBlbnRyeS1wb2ludHMgYWdhaW4uXG4gICAgICBlbnRyeVBvaW50SW5mbyA9IGZpbmRlci5maW5kRW50cnlQb2ludHMoKTtcbiAgICB9XG5cbiAgICBjb25zdCB7ZW50cnlQb2ludHMsIGludmFsaWRFbnRyeVBvaW50cywgZ3JhcGh9ID0gZW50cnlQb2ludEluZm87XG4gICAgbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzKTtcblxuICAgIGNvbnN0IHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHM6IHN0cmluZ1tdID0gW107XG4gICAgLy8gVGhlIHRhc2tzIGFyZSBwYXJ0aWFsbHkgb3JkZXJlZCBieSB2aXJ0dWUgb2YgdGhlIGVudHJ5LXBvaW50cyBiZWluZyBwYXJ0aWFsbHkgb3JkZXJlZCB0b28uXG4gICAgY29uc3QgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcyA9IFtdIGFzIGFueTtcblxuICAgIGZvciAoY29uc3QgZW50cnlQb2ludCBvZiBlbnRyeVBvaW50cykge1xuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgICAgY29uc3QgaGFzUHJvY2Vzc2VkVHlwaW5ncyA9IGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sICd0eXBpbmdzJyk7XG4gICAgICBjb25zdCB7cHJvcGVydGllc1RvUHJvY2VzcywgZXF1aXZhbGVudFByb3BlcnRpZXNNYXB9ID1cbiAgICAgICAgICBnZXRQcm9wZXJ0aWVzVG9Qcm9jZXNzKHBhY2thZ2VKc29uLCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpO1xuICAgICAgbGV0IHByb2Nlc3NEdHMgPSAhaGFzUHJvY2Vzc2VkVHlwaW5ncztcblxuICAgICAgaWYgKHByb3BlcnRpZXNUb1Byb2Nlc3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIFRoaXMgZW50cnktcG9pbnQgaXMgdW5wcm9jZXNzYWJsZSAoaS5lLiB0aGVyZSBpcyBubyBmb3JtYXQgcHJvcGVydHkgdGhhdCBpcyBvZiBpbnRlcmVzdFxuICAgICAgICAvLyBhbmQgY2FuIGJlIHByb2Nlc3NlZCkuIFRoaXMgd2lsbCByZXN1bHQgaW4gYW4gZXJyb3IsIGJ1dCBjb250aW51ZSBsb29waW5nIG92ZXJcbiAgICAgICAgLy8gZW50cnktcG9pbnRzIGluIG9yZGVyIHRvIGNvbGxlY3QgYWxsIHVucHJvY2Vzc2FibGUgb25lcyBhbmQgZGlzcGxheSBhIG1vcmUgaW5mb3JtYXRpdmVcbiAgICAgICAgLy8gZXJyb3IuXG4gICAgICAgIHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHMucHVzaChlbnRyeVBvaW50LnBhdGgpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBmb3JtYXRQcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Qcm9jZXNzKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCA9IGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwLmdldChmb3JtYXRQcm9wZXJ0eSkgITtcbiAgICAgICAgdGFza3MucHVzaCh7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30pO1xuXG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyB0eXBpbmdzIGZvciB0aGUgZmlyc3QgcHJvcGVydHkgKGlmIG5vdCBhbHJlYWR5IHByb2Nlc3NlZCkuXG4gICAgICAgIHByb2Nlc3NEdHMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgZW50cnktcG9pbnRzIGZvciB3aGljaCB3ZSBjb3VsZCBub3QgcHJvY2VzcyBhbnkgZm9ybWF0IGF0IGFsbC5cbiAgICBpZiAodW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1VuYWJsZSB0byBwcm9jZXNzIGFueSBmb3JtYXRzIGZvciB0aGUgZm9sbG93aW5nIGVudHJ5LXBvaW50cyAodHJpZWQgJyArXG4gICAgICAgICAgYCR7cHJvcGVydGllc1RvQ29uc2lkZXIuam9pbignLCAnKX0pOiBgICtcbiAgICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLm1hcChwYXRoID0+IGBcXG4gIC0gJHtwYXRofWApLmpvaW4oJycpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgQW5hbHl6ZWQgJHtlbnRyeVBvaW50cy5sZW5ndGh9IGVudHJ5LXBvaW50cyBpbiAke2R1cmF0aW9ufXMuIGAgK1xuICAgICAgICBgKFRvdGFsIHRhc2tzOiAke3Rhc2tzLmxlbmd0aH0pYCk7XG5cbiAgICByZXR1cm4gZ2V0VGFza1F1ZXVlKGluUGFyYWxsZWwsIHRhc2tzLCBncmFwaCk7XG4gIH07XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBjcmVhdGluZyB0aGUgYGNvbXBpbGUoKWAgZnVuY3Rpb24uXG4gIGNvbnN0IGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuID0gb25UYXNrQ29tcGxldGVkID0+IHtcbiAgICBjb25zdCBmaWxlV3JpdGVyID0gZ2V0RmlsZVdyaXRlcihmaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlciwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMpO1xuICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFRyYW5zZm9ybWVyKGZpbGVTeXN0ZW0sIGxvZ2dlcik7XG5cbiAgICByZXR1cm4gKHRhc2s6IFRhc2spID0+IHtcbiAgICAgIGNvbnN0IHtlbnRyeVBvaW50LCBmb3JtYXRQcm9wZXJ0eSwgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkLCBwcm9jZXNzRHRzfSA9IHRhc2s7XG5cbiAgICAgIGNvbnN0IGlzQ29yZSA9IGVudHJ5UG9pbnQubmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnOyAgLy8gQXJlIHdlIGNvbXBpbGluZyB0aGUgQW5ndWxhciBjb3JlP1xuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW2Zvcm1hdFByb3BlcnR5XTtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IGdldEVudHJ5UG9pbnRGb3JtYXQoZmlsZVN5c3RlbSwgZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHkpO1xuXG4gICAgICAvLyBBbGwgcHJvcGVydGllcyBsaXN0ZWQgaW4gYHByb3BlcnRpZXNUb1Byb2Nlc3NgIGFyZSBndWFyYW50ZWVkIHRvIHBvaW50IHRvIGEgZm9ybWF0LXBhdGhcbiAgICAgIC8vIChpLmUuIHRoZXkgYXJlIGRlZmluZWQgaW4gYGVudHJ5UG9pbnQucGFja2FnZUpzb25gKS4gRnVydGhlcm1vcmUsIHRoZXkgYXJlIGFsc28gZ3VhcmFudGVlZFxuICAgICAgLy8gdG8gYmUgYW1vbmcgYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2AuXG4gICAgICAvLyBCYXNlZCBvbiB0aGUgYWJvdmUsIGBmb3JtYXRQYXRoYCBzaG91bGQgYWx3YXlzIGJlIGRlZmluZWQgYW5kIGBnZXRFbnRyeVBvaW50Rm9ybWF0KClgXG4gICAgICAvLyBzaG91bGQgYWx3YXlzIHJldHVybiBhIGZvcm1hdCBoZXJlIChhbmQgbm90IGB1bmRlZmluZWRgKS5cbiAgICAgIGlmICghZm9ybWF0UGF0aCB8fCAhZm9ybWF0KSB7XG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEludmFyaWFudCB2aW9sYXRlZDogTm8gZm9ybWF0LXBhdGggb3IgZm9ybWF0IGZvciAke2VudHJ5UG9pbnQucGF0aH0gOiBgICtcbiAgICAgICAgICAgIGAke2Zvcm1hdFByb3BlcnR5fSAoZm9ybWF0UGF0aDogJHtmb3JtYXRQYXRofSB8IGZvcm1hdDogJHtmb3JtYXR9KWApO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgZm9ybWF0LXBhdGggd2hpY2ggdGhlIHByb3BlcnR5IG1hcHMgdG8gaXMgYWxyZWFkeSBwcm9jZXNzZWQgLSBub3RoaW5nIHRvIGRvLlxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sIGZvcm1hdFByb3BlcnR5KSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5BbHJlYWR5UHJvY2Vzc2VkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQYXRoLCBpc0NvcmUsIGZvcm1hdCwgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzLCB0cnVlLFxuICAgICAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fWApO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oYnVuZGxlKTtcbiAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICBpZiAocmVzdWx0LmRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBsb2dnZXIud2FybihyZXBsYWNlVHNXaXRoTmdJbkVycm9ycyhcbiAgICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KSkpO1xuICAgICAgICB9XG4gICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoYnVuZGxlLCByZXN1bHQudHJhbnNmb3JtZWRGaWxlcywgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVycm9ycyA9IHJlcGxhY2VUc1dpdGhOZ0luRXJyb3JzKFxuICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBlbnRyeS1wb2ludCAke2VudHJ5UG9pbnQubmFtZX0gKCR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fSkgZHVlIHRvIGNvbXBpbGF0aW9uIGVycm9yczpcXG4ke2Vycm9yc31gKTtcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmRlYnVnKGAgIFN1Y2Nlc3NmdWxseSBjb21waWxlZCAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fWApO1xuXG4gICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZCk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBUaGUgZXhlY3V0b3IgZm9yIGFjdHVhbGx5IHBsYW5uaW5nIGFuZCBnZXR0aW5nIHRoZSB3b3JrIGRvbmUuXG4gIGNvbnN0IGV4ZWN1dG9yID0gZ2V0RXhlY3V0b3IoYXN5bmMsIGluUGFyYWxsZWwsIGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIsIGZpbGVTeXN0ZW0pO1xuXG4gIHJldHVybiBleGVjdXRvci5leGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlU3VwcG9ydGVkUHJvcGVydGllcyhwcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSB7XG4gIC8vIFNob3J0LWNpcmN1aXQgdGhlIGNhc2Ugd2hlcmUgYHByb3BlcnRpZXNgIGhhcyBmYWxsZW4gYmFjayB0byB0aGUgZGVmYXVsdCB2YWx1ZTpcbiAgLy8gYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2BcbiAgaWYgKHByb3BlcnRpZXMgPT09IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykgcmV0dXJuIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUztcblxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllcyBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5W10pIHtcbiAgICBpZiAoU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmluZGV4T2YocHJvcCkgIT09IC0xKSB7XG4gICAgICBzdXBwb3J0ZWRQcm9wZXJ0aWVzLnB1c2gocHJvcCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN1cHBvcnRlZFByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTm8gc3VwcG9ydGVkIGZvcm1hdCBwcm9wZXJ0eSB0byBjb25zaWRlciBhbW9uZyBbJHtwcm9wZXJ0aWVzLmpvaW4oJywgJyl9XS4gYCArXG4gICAgICAgIGBTdXBwb3J0ZWQgcHJvcGVydGllczogJHtTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIHJldHVybiBzdXBwb3J0ZWRQcm9wZXJ0aWVzO1xufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSnNvblVwZGF0ZXIoaW5QYXJhbGxlbDogYm9vbGVhbiwgZnM6IEZpbGVTeXN0ZW0pOiBQYWNrYWdlSnNvblVwZGF0ZXIge1xuICBjb25zdCBkaXJlY3RQa2dKc29uVXBkYXRlciA9IG5ldyBEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIoZnMpO1xuICByZXR1cm4gaW5QYXJhbGxlbCA/IG5ldyBDbHVzdGVyUGFja2FnZUpzb25VcGRhdGVyKGRpcmVjdFBrZ0pzb25VcGRhdGVyKSA6IGRpcmVjdFBrZ0pzb25VcGRhdGVyO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLFxuICAgIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzOiBib29sZWFuKTogRmlsZVdyaXRlciB7XG4gIHJldHVybiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/IG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcihmcywgcGtnSnNvblVwZGF0ZXIpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEluUGxhY2VGaWxlV3JpdGVyKGZzKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGFza1F1ZXVlKFxuICAgIGluUGFyYWxsZWw6IGJvb2xlYW4sIHRhc2tzOiBQYXJ0aWFsbHlPcmRlcmVkVGFza3MsIGdyYXBoOiBEZXBHcmFwaDxFbnRyeVBvaW50Pik6IFRhc2tRdWV1ZSB7XG4gIHJldHVybiBpblBhcmFsbGVsID8gbmV3IFBhcmFsbGVsVGFza1F1ZXVlKHRhc2tzLCBncmFwaCkgOiBuZXcgU2VyaWFsVGFza1F1ZXVlKHRhc2tzKTtcbn1cblxuZnVuY3Rpb24gZ2V0RXhlY3V0b3IoXG4gICAgYXN5bmM6IGJvb2xlYW4sIGluUGFyYWxsZWw6IGJvb2xlYW4sIGxvZ2dlcjogTG9nZ2VyLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLFxuICAgIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0pOiBFeGVjdXRvciB7XG4gIGlmIChhc3luYykge1xuICAgIC8vIEV4ZWN1dGUgYXN5bmNocm9ub3VzbHkgKGVpdGhlciBzZXJpYWxseSBvciBpbiBwYXJhbGxlbClcbiAgICBjb25zdCBsb2NrRmlsZSA9IG5ldyBMb2NrRmlsZUFzeW5jKGZpbGVTeXN0ZW0sIGxvZ2dlciwgNTAwLCA1MCk7XG4gICAgaWYgKGluUGFyYWxsZWwpIHtcbiAgICAgIC8vIEV4ZWN1dGUgaW4gcGFyYWxsZWwuIFVzZSB1cCB0byA4IENQVSBjb3JlcyBmb3Igd29ya2VycywgYWx3YXlzIHJlc2VydmluZyBvbmUgZm9yIG1hc3Rlci5cbiAgICAgIGNvbnN0IHdvcmtlckNvdW50ID0gTWF0aC5taW4oOCwgb3MuY3B1cygpLmxlbmd0aCAtIDEpO1xuICAgICAgcmV0dXJuIG5ldyBDbHVzdGVyRXhlY3V0b3Iod29ya2VyQ291bnQsIGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIsIGxvY2tGaWxlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRXhlY3V0ZSBzZXJpYWxseSwgb24gYSBzaW5nbGUgdGhyZWFkIChhc3luYykuXG4gICAgICByZXR1cm4gbmV3IFNpbmdsZVByb2Nlc3NFeGVjdXRvckFzeW5jKGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIsIGxvY2tGaWxlKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhlY3V0ZSBzZXJpYWxseSwgb24gYSBzaW5nbGUgdGhyZWFkIChzeW5jKS5cbiAgICByZXR1cm4gbmV3IFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmMobG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgbmV3IExvY2tGaWxlU3luYyhmaWxlU3lzdGVtKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RGVwZW5kZW5jeVJlc29sdmVyKFxuICAgIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0sIGxvZ2dlcjogTG9nZ2VyLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLFxuICAgIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkKTogRGVwZW5kZW5jeVJlc29sdmVyIHtcbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzKTtcbiAgY29uc3QgZXNtRGVwZW5kZW5jeUhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3QgPSBuZXcgQ29tbW9uSnNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGR0c0RlcGVuZGVuY3lIb3N0ID0gbmV3IER0c0RlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIHBhdGhNYXBwaW5ncyk7XG4gIHJldHVybiBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBjb25maWcsIHtcbiAgICAgICAgZXNtNTogZXNtRGVwZW5kZW5jeUhvc3QsXG4gICAgICAgIGVzbTIwMTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgICB1bWQ6IHVtZERlcGVuZGVuY3lIb3N0LFxuICAgICAgICBjb21tb25qczogY29tbW9uSnNEZXBlbmRlbmN5SG9zdFxuICAgICAgfSxcbiAgICAgIGR0c0RlcGVuZGVuY3lIb3N0KTtcbn1cblxuZnVuY3Rpb24gZ2V0RW50cnlQb2ludEZpbmRlcihcbiAgICBmczogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIHJlc29sdmVyOiBEZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sXG4gICAgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCB8IG51bGwsXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQpOiBFbnRyeVBvaW50RmluZGVyIHtcbiAgaWYgKGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggIT09IG51bGwpIHtcbiAgICByZXR1cm4gbmV3IFRhcmdldGVkRW50cnlQb2ludEZpbmRlcihcbiAgICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyKFxuICAgICAgICBmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyOiBMb2dnZXIsIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXSk6IHZvaWQge1xuICBpbnZhbGlkRW50cnlQb2ludHMuZm9yRWFjaChpbnZhbGlkRW50cnlQb2ludCA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgSW52YWxpZCBlbnRyeS1wb2ludCAke2ludmFsaWRFbnRyeVBvaW50LmVudHJ5UG9pbnQucGF0aH0uYCxcbiAgICAgICAgYEl0IGlzIG1pc3NpbmcgcmVxdWlyZWQgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICAgICAgaW52YWxpZEVudHJ5UG9pbnQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1gKS5qb2luKCdcXG4nKSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gY29tcHV0ZXMgYW5kIHJldHVybnMgdGhlIGZvbGxvd2luZzpcbiAqIC0gYHByb3BlcnRpZXNUb1Byb2Nlc3NgOiBBbiAob3JkZXJlZCkgbGlzdCBvZiBwcm9wZXJ0aWVzIHRoYXQgZXhpc3QgYW5kIG5lZWQgdG8gYmUgcHJvY2Vzc2VkLFxuICogICBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYHByb3BlcnRpZXNUb0NvbnNpZGVyYCwgdGhlIHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgYW5kIHRoZWlyXG4gKiAgIGNvcnJlc3BvbmRpbmcgZm9ybWF0LXBhdGhzLiBOT1RFOiBPbmx5IG9uZSBwcm9wZXJ0eSBwZXIgZm9ybWF0LXBhdGggbmVlZHMgdG8gYmUgcHJvY2Vzc2VkLlxuICogLSBgZXF1aXZhbGVudFByb3BlcnRpZXNNYXBgOiBBIG1hcHBpbmcgZnJvbSBlYWNoIHByb3BlcnR5IGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCB0byB0aGUgbGlzdCBvZlxuICogICBvdGhlciBmb3JtYXQgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCB0aGF0IG5lZWQgdG8gYmUgbWFya2VkIGFzIHByb2Nlc3NlZCBhcyBzb29uIGFzIHRoZVxuICogICBmb3JtZXIgaGFzIGJlZW4gcHJvY2Vzc2VkLlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0aWVzVG9Qcm9jZXNzKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pOiB7XG4gIHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXTtcbiAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXA6IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+O1xufSB7XG4gIGNvbnN0IGZvcm1hdFBhdGhzVG9Db25zaWRlciA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGNvbnN0IHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgZGVmaW5lZCBpbiBgcGFja2FnZS5qc29uYC5cbiAgICBpZiAodHlwZW9mIGZvcm1hdFBhdGggIT09ICdzdHJpbmcnKSBjb250aW51ZTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgbWFwIHRvIHRoZSBzYW1lIGZvcm1hdC1wYXRoIGFzIGEgcHJlY2VkaW5nIHByb3BlcnR5LlxuICAgIGlmIChmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIFByb2Nlc3MgdGhpcyBwcm9wZXJ0eSwgYmVjYXVzZSBpdCBpcyB0aGUgZmlyc3Qgb25lIHRvIG1hcCB0byB0aGlzIGZvcm1hdC1wYXRoLlxuICAgIGZvcm1hdFBhdGhzVG9Db25zaWRlci5hZGQoZm9ybWF0UGF0aCk7XG4gICAgcHJvcGVydGllc1RvUHJvY2Vzcy5wdXNoKHByb3ApO1xuXG4gICAgLy8gSWYgd2Ugb25seSBuZWVkIG9uZSBmb3JtYXQgcHJvY2Vzc2VkLCB0aGVyZSBpcyBubyBuZWVkIHRvIHByb2Nlc3MgYW55IG1vcmUgcHJvcGVydGllcy5cbiAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSBicmVhaztcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXM6IHtbZm9ybWF0UGF0aDogc3RyaW5nXTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdfSA9IHt9O1xuICBmb3IgKGNvbnN0IHByb3Agb2YgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGRvIG5vdCBtYXAgdG8gYSBmb3JtYXQtcGF0aCB0aGF0IHdpbGwgYmUgY29uc2lkZXJlZC5cbiAgICBpZiAoIWZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gQWRkIHRoaXMgcHJvcGVydHkgdG8gdGhlIG1hcC5cbiAgICBjb25zdCBsaXN0ID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSB8fCAoZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSA9IFtdKTtcbiAgICBsaXN0LnB1c2gocHJvcCk7XG4gIH1cblxuICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllc01hcCA9IG5ldyBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPigpO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF0gITtcbiAgICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllcyA9IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF07XG4gICAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXAuc2V0KHByb3AsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzKTtcbiAgfVxuXG4gIHJldHVybiB7cHJvcGVydGllc1RvUHJvY2VzcywgZXF1aXZhbGVudFByb3BlcnRpZXNNYXB9O1xufVxuIl19