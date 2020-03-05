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
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "os", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/execution/cluster/executor", "@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater", "@angular/compiler-cli/ngcc/src/execution/single_process_executor", "@angular/compiler-cli/ngcc/src/execution/task_selection/parallel_task_queue", "@angular/compiler-cli/ngcc/src/execution/task_selection/serial_task_queue", "@angular/compiler-cli/ngcc/src/locking/async_locker", "@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index", "@angular/compiler-cli/ngcc/src/locking/sync_locker", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/logging/logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", "@angular/compiler-cli/ngcc/src/writing/package_json_updater"], factory);
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
    var single_process_executor_1 = require("@angular/compiler-cli/ngcc/src/execution/single_process_executor");
    var parallel_task_queue_1 = require("@angular/compiler-cli/ngcc/src/execution/task_selection/parallel_task_queue");
    var serial_task_queue_1 = require("@angular/compiler-cli/ngcc/src/execution/task_selection/serial_task_queue");
    var async_locker_1 = require("@angular/compiler-cli/ngcc/src/locking/async_locker");
    var lock_file_with_child_process_1 = require("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index");
    var sync_locker_1 = require("@angular/compiler-cli/ngcc/src/locking/sync_locker");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
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
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _b = _a.propertiesToConsider, propertiesToConsider = _b === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _b, _c = _a.compileAllFormats, compileAllFormats = _c === void 0 ? true : _c, _d = _a.createNewEntryPointFormats, createNewEntryPointFormats = _d === void 0 ? false : _d, _e = _a.logger, logger = _e === void 0 ? new console_logger_1.ConsoleLogger(logger_1.LogLevel.info) : _e, pathMappings = _a.pathMappings, _f = _a.async, async = _f === void 0 ? false : _f, _g = _a.enableI18nLegacyMessageIdFormat, enableI18nLegacyMessageIdFormat = _g === void 0 ? true : _g;
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
                onTaskCompleted(task, 0 /* Processed */);
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
        var lockFile = new lock_file_with_child_process_1.LockFileWithChildProcess(fileSystem, logger);
        if (async) {
            // Execute asynchronously (either serially or in parallel)
            var locker = new async_locker_1.AsyncLocker(lockFile, logger, 500, 50);
            if (inParallel) {
                // Execute in parallel. Use up to 8 CPU cores for workers, always reserving one for master.
                var workerCount = Math.min(8, os.cpus().length - 1);
                return new executor_1.ClusterExecutor(workerCount, logger, pkgJsonUpdater, locker);
            }
            else {
                // Execute serially, on a single thread (async).
                return new single_process_executor_1.SingleProcessExecutorAsync(logger, pkgJsonUpdater, locker);
            }
        }
        else {
            // Execute serially, on a single thread (sync).
            return new single_process_executor_1.SingleProcessExecutorSync(logger, pkgJsonUpdater, new sync_locker_1.SyncLocker(lockFile));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILHVCQUF5QjtJQUN6QiwrQkFBaUM7SUFFakMsMkVBQW9FO0lBQ3BFLDJFQUFzSDtJQUV0SCxpSEFBK0U7SUFDL0UsdUdBQXlGO0lBQ3pGLHVHQUFxRTtJQUNyRSx1R0FBcUU7SUFDckUsK0ZBQThEO0lBQzlELHVHQUFxRTtJQUNyRSw2SUFBeUc7SUFFekcsNkhBQTBGO0lBRTFGLHNGQUE2RDtJQUM3RCw4R0FBbUY7SUFDbkYsNEdBQTBHO0lBQzFHLG1IQUFpRjtJQUNqRiwrR0FBNkU7SUFDN0Usb0ZBQW1EO0lBQ25ELDBIQUFnRjtJQUNoRixrRkFBaUQ7SUFDakQsd0ZBQXVEO0lBQ3ZELHdFQUFrRDtJQUNsRCxxRkFBeUQ7SUFDekQsdUZBQTJEO0lBQzNELG1GQUFtSjtJQUNuSixpR0FBbUU7SUFDbkUsbUZBQW1EO0lBRW5ELG1HQUF5RTtJQUV6RSxvR0FBaUU7SUFDakUsa0hBQThFO0lBQzlFLG9HQUE0RjtJQTZGNUYsU0FBZ0IsUUFBUSxDQUNwQixFQUdxRDtZQUhwRCxzQkFBUSxFQUFFLDhDQUFvQixFQUFFLDRCQUFrRCxFQUFsRCxxRkFBa0QsRUFDbEYseUJBQXdCLEVBQXhCLDZDQUF3QixFQUFFLGtDQUFrQyxFQUFsQyx1REFBa0MsRUFDNUQsY0FBeUMsRUFBekMsd0ZBQXlDLEVBQUUsOEJBQVksRUFBRSxhQUFhLEVBQWIsa0NBQWEsRUFDdEUsdUNBQXNDLEVBQXRDLDJEQUFzQztRQUN6Qyw2RkFBNkY7UUFDN0YsSUFBTSxVQUFVLEdBQUcsS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVuRCxxREFBcUQ7UUFD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cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCB7RGVwR3JhcGh9IGZyb20gJ2RlcGVuZGVuY3ktZ3JhcGgnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb20sIGRpcm5hbWUsIGdldEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7Q29tbW9uSnNEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBJbnZhbGlkRW50cnlQb2ludH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0R0c0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9kdHNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RXNtRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2VzbV9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvbW9kdWxlX3Jlc29sdmVyJztcbmltcG9ydCB7VW1kRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL3VtZF9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci9kaXJlY3Rvcnlfd2Fsa2VyX2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2ludGVyZmFjZSc7XG5pbXBvcnQge1RhcmdldGVkRW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvdGFyZ2V0ZWRfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm4sIENyZWF0ZUNvbXBpbGVGbiwgRXhlY3V0b3IsIFBhcnRpYWxseU9yZGVyZWRUYXNrcywgVGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLCBUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL2FwaSc7XG5pbXBvcnQge0NsdXN0ZXJFeGVjdXRvcn0gZnJvbSAnLi9leGVjdXRpb24vY2x1c3Rlci9leGVjdXRvcic7XG5pbXBvcnQge0NsdXN0ZXJQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4vZXhlY3V0aW9uL2NsdXN0ZXIvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtTaW5nbGVQcm9jZXNzRXhlY3V0b3JBc3luYywgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yU3luY30gZnJvbSAnLi9leGVjdXRpb24vc2luZ2xlX3Byb2Nlc3NfZXhlY3V0b3InO1xuaW1wb3J0IHtQYXJhbGxlbFRhc2tRdWV1ZX0gZnJvbSAnLi9leGVjdXRpb24vdGFza19zZWxlY3Rpb24vcGFyYWxsZWxfdGFza19xdWV1ZSc7XG5pbXBvcnQge1NlcmlhbFRhc2tRdWV1ZX0gZnJvbSAnLi9leGVjdXRpb24vdGFza19zZWxlY3Rpb24vc2VyaWFsX3Rhc2tfcXVldWUnO1xuaW1wb3J0IHtBc3luY0xvY2tlcn0gZnJvbSAnLi9sb2NraW5nL2FzeW5jX2xvY2tlcic7XG5pbXBvcnQge0xvY2tGaWxlV2l0aENoaWxkUHJvY2Vzc30gZnJvbSAnLi9sb2NraW5nL2xvY2tfZmlsZV93aXRoX2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtTeW5jTG9ja2VyfSBmcm9tICcuL2xvY2tpbmcvc3luY19sb2NrZXInO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dMZXZlbCwgTG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZH0gZnJvbSAnLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludFBhY2thZ2VKc29uLCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsIGdldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHttYWtlRW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtUcmFuc2Zvcm1lcn0gZnJvbSAnLi9wYWNrYWdlcy90cmFuc2Zvcm1lcic7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2NsZWFuT3V0ZGF0ZWRQYWNrYWdlc30gZnJvbSAnLi93cml0aW5nL2NsZWFuaW5nL3BhY2thZ2VfY2xlYW5lcic7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvaW5fcGxhY2VfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtOZXdFbnRyeVBvaW50RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5pbXBvcnQge0RpcmVjdFBhY2thZ2VKc29uVXBkYXRlciwgUGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlciBmb3Igc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN5bmNOZ2NjT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2VzIHRvIHByb2Nlc3MuICovXG4gIGJhc2VQYXRoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBwYXRoIHRvIHRoZSBwcmltYXJ5IHBhY2thZ2UgdG8gYmUgcHJvY2Vzc2VkLiBJZiBub3QgYWJzb2x1dGUgdGhlbiBpdCBtdXN0IGJlIHJlbGF0aXZlIHRvXG4gICAqIGBiYXNlUGF0aGAuXG4gICAqXG4gICAqIEFsbCBpdHMgZGVwZW5kZW5jaWVzIHdpbGwgbmVlZCB0byBiZSBwcm9jZXNzZWQgdG9vLlxuICAgKi9cbiAgdGFyZ2V0RW50cnlQb2ludFBhdGg/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoaWNoIGVudHJ5LXBvaW50IHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbiB0byBjb25zaWRlciB3aGVuIHByb2Nlc3NpbmcgYW4gZW50cnktcG9pbnQuXG4gICAqIEVhY2ggcHJvcGVydHkgc2hvdWxkIGhvbGQgYSBwYXRoIHRvIHRoZSBwYXJ0aWN1bGFyIGJ1bmRsZSBmb3JtYXQgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAgICogRGVmYXVsdHMgdG8gYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24uXG4gICAqL1xuICBwcm9wZXJ0aWVzVG9Db25zaWRlcj86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHByb2Nlc3MgYWxsIGZvcm1hdHMgc3BlY2lmaWVkIGJ5IChgcHJvcGVydGllc1RvQ29uc2lkZXJgKSAgb3IgdG8gc3RvcCBwcm9jZXNzaW5nXG4gICAqIHRoaXMgZW50cnktcG9pbnQgYXQgdGhlIGZpcnN0IG1hdGNoaW5nIGZvcm1hdC4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgY29tcGlsZUFsbEZvcm1hdHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNyZWF0ZSBuZXcgZW50cnktcG9pbnRzIGJ1bmRsZXMgcmF0aGVyIHRoYW4gb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIGZpbGVzLlxuICAgKi9cbiAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlIGEgbG9nZ2VyIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBsb2cgbWVzc2FnZXMuXG4gICAqL1xuICBsb2dnZXI/OiBMb2dnZXI7XG5cbiAgLyoqXG4gICAqIFBhdGhzIG1hcHBpbmcgY29uZmlndXJhdGlvbiAoYHBhdGhzYCBhbmQgYGJhc2VVcmxgKSwgYXMgZm91bmQgaW4gYHRzLkNvbXBpbGVyT3B0aW9uc2AuXG4gICAqIFRoZXNlIGFyZSB1c2VkIHRvIHJlc29sdmUgcGF0aHMgdG8gbG9jYWxseSBidWlsdCBBbmd1bGFyIGxpYnJhcmllcy5cbiAgICovXG4gIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncztcblxuICAvKipcbiAgICogUHJvdmlkZSBhIGZpbGUtc3lzdGVtIHNlcnZpY2UgdGhhdCB3aWxsIGJlIHVzZWQgYnkgbmdjYyBmb3IgYWxsIGZpbGUgaW50ZXJhY3Rpb25zLlxuICAgKi9cbiAgZmlsZVN5c3RlbT86IEZpbGVTeXN0ZW07XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGNvbXBpbGF0aW9uIHNob3VsZCBydW4gYW5kIHJldHVybiBhc3luY2hyb25vdXNseS4gQWxsb3dpbmcgYXN5bmNocm9ub3VzIGV4ZWN1dGlvblxuICAgKiBtYXkgc3BlZWQgdXAgdGhlIGNvbXBpbGF0aW9uIGJ5IHV0aWxpemluZyBtdWx0aXBsZSBDUFUgY29yZXMgKGlmIGF2YWlsYWJsZSkuXG4gICAqXG4gICAqIERlZmF1bHQ6IGBmYWxzZWAgKGkuZS4gcnVuIHN5bmNocm9ub3VzbHkpXG4gICAqL1xuICBhc3luYz86IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBSZW5kZXIgYCRsb2NhbGl6ZWAgbWVzc2FnZXMgd2l0aCBsZWdhY3kgZm9ybWF0IGlkcy5cbiAgICpcbiAgICogVGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgLiBPbmx5IHNldCB0aGlzIHRvIGBmYWxzZWAgaWYgeW91IGRvIG5vdCB3YW50IGxlZ2FjeSBtZXNzYWdlIGlkcyB0b1xuICAgKiBiZSByZW5kZXJlZC4gRm9yIGV4YW1wbGUsIGlmIHlvdSBhcmUgbm90IHVzaW5nIGxlZ2FjeSBtZXNzYWdlIGlkcyBpbiB5b3VyIHRyYW5zbGF0aW9uIGZpbGVzXG4gICAqIEFORCBhcmUgbm90IGRvaW5nIGNvbXBpbGUtdGltZSBpbmxpbmluZyBvZiB0cmFuc2xhdGlvbnMsIGluIHdoaWNoIGNhc2UgdGhlIGV4dHJhIG1lc3NhZ2UgaWRzXG4gICAqIHdvdWxkIGFkZCB1bndhbnRlZCBzaXplIHRvIHRoZSBmaW5hbCBzb3VyY2UgYnVuZGxlLlxuICAgKlxuICAgKiBJdCBpcyBzYWZlIHRvIGxlYXZlIHRoaXMgc2V0IHRvIHRydWUgaWYgeW91IGFyZSBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgYmVjYXVzZSB0aGUgZXh0cmFcbiAgICogbGVnYWN5IG1lc3NhZ2UgaWRzIHdpbGwgYWxsIGJlIHN0cmlwcGVkIGR1cmluZyB0cmFuc2xhdGlvbi5cbiAgICovXG4gIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlciBmb3IgYXN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgQXN5bmNOZ2NjT3B0aW9ucyA9IE9taXQ8U3luY05nY2NPcHRpb25zLCAnYXN5bmMnPiYge2FzeW5jOiB0cnVlfTtcblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCB0eXBlIE5nY2NPcHRpb25zID0gQXN5bmNOZ2NjT3B0aW9ucyB8IFN5bmNOZ2NjT3B0aW9ucztcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGludG8gbmdjYyAoYU5HdWxhciBDb21wYXRpYmlsaXR5IENvbXBpbGVyKS5cbiAqXG4gKiBZb3UgY2FuIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBwcm9jZXNzIG9uZSBvciBtb3JlIG5wbSBwYWNrYWdlcywgdG8gZW5zdXJlXG4gKiB0aGF0IHRoZXkgYXJlIGNvbXBhdGlibGUgd2l0aCB0aGUgaXZ5IGNvbXBpbGVyIChuZ3RzYykuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgVGhlIG9wdGlvbnMgdGVsbGluZyBuZ2NjIHdoYXQgdG8gY29tcGlsZSBhbmQgaG93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogQXN5bmNOZ2NjT3B0aW9ucyk6IFByb21pc2U8dm9pZD47XG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogU3luY05nY2NPcHRpb25zKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhcbiAgICB7YmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgICAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSwgcGF0aE1hcHBpbmdzLCBhc3luYyA9IGZhbHNlLFxuICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID0gdHJ1ZX06IE5nY2NPcHRpb25zKTogdm9pZHxQcm9taXNlPHZvaWQ+IHtcbiAgLy8gRXhlY3V0ZSBpbiBwYXJhbGxlbCwgaWYgYXN5bmMgZXhlY3V0aW9uIGlzIGFjY2VwdGFibGUgYW5kIHRoZXJlIGFyZSBtb3JlIHRoYW4gMSBDUFUgY29yZXMuXG4gIGNvbnN0IGluUGFyYWxsZWwgPSBhc3luYyAmJiAob3MuY3B1cygpLmxlbmd0aCA+IDEpO1xuXG4gIC8vIEluc3RhbnRpYXRlIGNvbW1vbiB1dGlsaXRpZXMgdGhhdCBhcmUgYWx3YXlzIHVzZWQuXG4gIC8vIE5PVEU6IEF2b2lkIGVhZ2VybHkgaW5zdGFudGlhdGluZyBhbnl0aGluZyB0aGF0IG1pZ2h0IG5vdCBiZSB1c2VkIHdoZW4gcnVubmluZyBzeW5jL2FzeW5jIG9yIGluXG4gIC8vICAgICAgIG1hc3Rlci93b3JrZXIgcHJvY2Vzcy5cbiAgY29uc3QgZmlsZVN5c3RlbSA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgY29uc3QgYWJzQmFzZVBhdGggPSBhYnNvbHV0ZUZyb20oYmFzZVBhdGgpO1xuICBjb25zdCBjb25maWcgPSBuZXcgTmdjY0NvbmZpZ3VyYXRpb24oZmlsZVN5c3RlbSwgZGlybmFtZShhYnNCYXNlUGF0aCkpO1xuICBjb25zdCBkZXBlbmRlbmN5UmVzb2x2ZXIgPSBnZXREZXBlbmRlbmN5UmVzb2x2ZXIoZmlsZVN5c3RlbSwgbG9nZ2VyLCBjb25maWcsIHBhdGhNYXBwaW5ncyk7XG5cbiAgLy8gQmFpbCBvdXQgZWFybHkgaWYgdGhlIHdvcmsgaXMgYWxyZWFkeSBkb25lLlxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciA9IGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllc1RvQ29uc2lkZXIpO1xuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID1cbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSB1bmRlZmluZWQgPyByZXNvbHZlKGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCkgOiBudWxsO1xuICBjb25zdCBmaW5kZXIgPSBnZXRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBkZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZywgYWJzQmFzZVBhdGgsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsXG4gICAgICBwYXRoTWFwcGluZ3MpO1xuICBpZiAoZmluZGVyIGluc3RhbmNlb2YgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyICYmXG4gICAgICAhZmluZGVyLnRhcmdldE5lZWRzUHJvY2Vzc2luZ09yQ2xlYW5pbmcoc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnVGhlIHRhcmdldCBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCcpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIE5PVEU6IFRvIGF2b2lkIGZpbGUgY29ycnVwdGlvbiwgZW5zdXJlIHRoYXQgZWFjaCBgbmdjY2AgaW52b2NhdGlvbiBvbmx5IGNyZWF0ZXMgX29uZV8gaW5zdGFuY2VcbiAgLy8gICAgICAgb2YgYFBhY2thZ2VKc29uVXBkYXRlcmAgdGhhdCBhY3R1YWxseSB3cml0ZXMgdG8gZGlzayAoYWNyb3NzIGFsbCBwcm9jZXNzZXMpLlxuICAvLyAgICAgICBUaGlzIGlzIGhhcmQgdG8gZW5mb3JjZSBhdXRvbWF0aWNhbGx5LCB3aGVuIHJ1bm5pbmcgb24gbXVsdGlwbGUgcHJvY2Vzc2VzLCBzbyBuZWVkcyB0byBiZVxuICAvLyAgICAgICBlbmZvcmNlZCBtYW51YWxseS5cbiAgY29uc3QgcGtnSnNvblVwZGF0ZXIgPSBnZXRQYWNrYWdlSnNvblVwZGF0ZXIoaW5QYXJhbGxlbCwgZmlsZVN5c3RlbSk7XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBwZXJmb3JtaW5nIHRoZSBhbmFseXNpcy5cbiAgY29uc3QgYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbiA9ICgpID0+IHtcbiAgICBsb2dnZXIuZGVidWcoJ0FuYWx5emluZyBlbnRyeS1wb2ludHMuLi4nKTtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgbGV0IGVudHJ5UG9pbnRJbmZvID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xuICAgIGNvbnN0IGNsZWFuZWQgPSBjbGVhbk91dGRhdGVkUGFja2FnZXMoZmlsZVN5c3RlbSwgZW50cnlQb2ludEluZm8uZW50cnlQb2ludHMpO1xuICAgIGlmIChjbGVhbmVkKSB7XG4gICAgICAvLyBJZiB3ZSBoYWQgdG8gY2xlYW4gdXAgb25lIG9yIG1vcmUgcGFja2FnZXMgdGhlbiB3ZSBtdXN0IHJlYWQgaW4gdGhlIGVudHJ5LXBvaW50cyBhZ2Fpbi5cbiAgICAgIGVudHJ5UG9pbnRJbmZvID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xuICAgIH1cblxuICAgIGNvbnN0IHtlbnRyeVBvaW50cywgaW52YWxpZEVudHJ5UG9pbnRzLCBncmFwaH0gPSBlbnRyeVBvaW50SW5mbztcbiAgICBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyLCBpbnZhbGlkRW50cnlQb2ludHMpO1xuXG4gICAgY29uc3QgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBUaGUgdGFza3MgYXJlIHBhcnRpYWxseSBvcmRlcmVkIGJ5IHZpcnR1ZSBvZiB0aGUgZW50cnktcG9pbnRzIGJlaW5nIHBhcnRpYWxseSBvcmRlcmVkIHRvby5cbiAgICBjb25zdCB0YXNrczogUGFydGlhbGx5T3JkZXJlZFRhc2tzID0gW10gYXMgYW55O1xuXG4gICAgZm9yIChjb25zdCBlbnRyeVBvaW50IG9mIGVudHJ5UG9pbnRzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCBoYXNQcm9jZXNzZWRUeXBpbmdzID0gaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgJ3R5cGluZ3MnKTtcbiAgICAgIGNvbnN0IHtwcm9wZXJ0aWVzVG9Qcm9jZXNzLCBlcXVpdmFsZW50UHJvcGVydGllc01hcH0gPVxuICAgICAgICAgIGdldFByb3BlcnRpZXNUb1Byb2Nlc3MocGFja2FnZUpzb24sIHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cyk7XG4gICAgICBsZXQgcHJvY2Vzc0R0cyA9ICFoYXNQcm9jZXNzZWRUeXBpbmdzO1xuXG4gICAgICBpZiAocHJvcGVydGllc1RvUHJvY2Vzcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVGhpcyBlbnRyeS1wb2ludCBpcyB1bnByb2Nlc3NhYmxlIChpLmUuIHRoZXJlIGlzIG5vIGZvcm1hdCBwcm9wZXJ0eSB0aGF0IGlzIG9mIGludGVyZXN0XG4gICAgICAgIC8vIGFuZCBjYW4gYmUgcHJvY2Vzc2VkKS4gVGhpcyB3aWxsIHJlc3VsdCBpbiBhbiBlcnJvciwgYnV0IGNvbnRpbnVlIGxvb3Bpbmcgb3ZlclxuICAgICAgICAvLyBlbnRyeS1wb2ludHMgaW4gb3JkZXIgdG8gY29sbGVjdCBhbGwgdW5wcm9jZXNzYWJsZSBvbmVzIGFuZCBkaXNwbGF5IGEgbW9yZSBpbmZvcm1hdGl2ZVxuICAgICAgICAvLyBlcnJvci5cbiAgICAgICAgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5wdXNoKGVudHJ5UG9pbnQucGF0aCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IGZvcm1hdFByb3BlcnR5IG9mIHByb3BlcnRpZXNUb1Byb2Nlc3MpIHtcbiAgICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludC5wYWNrYWdlSnNvbiwgZm9ybWF0UHJvcGVydHkpKSB7XG4gICAgICAgICAgLy8gVGhlIGZvcm1hdC1wYXRoIHdoaWNoIHRoZSBwcm9wZXJ0eSBtYXBzIHRvIGlzIGFscmVhZHkgcHJvY2Vzc2VkIC0gbm90aGluZyB0byBkby5cbiAgICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCA9IGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwLmdldChmb3JtYXRQcm9wZXJ0eSkgITtcbiAgICAgICAgdGFza3MucHVzaCh7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30pO1xuXG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyB0eXBpbmdzIGZvciB0aGUgZmlyc3QgcHJvcGVydHkgKGlmIG5vdCBhbHJlYWR5IHByb2Nlc3NlZCkuXG4gICAgICAgIHByb2Nlc3NEdHMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgZW50cnktcG9pbnRzIGZvciB3aGljaCB3ZSBjb3VsZCBub3QgcHJvY2VzcyBhbnkgZm9ybWF0IGF0IGFsbC5cbiAgICBpZiAodW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1VuYWJsZSB0byBwcm9jZXNzIGFueSBmb3JtYXRzIGZvciB0aGUgZm9sbG93aW5nIGVudHJ5LXBvaW50cyAodHJpZWQgJyArXG4gICAgICAgICAgYCR7cHJvcGVydGllc1RvQ29uc2lkZXIuam9pbignLCAnKX0pOiBgICtcbiAgICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLm1hcChwYXRoID0+IGBcXG4gIC0gJHtwYXRofWApLmpvaW4oJycpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgQW5hbHl6ZWQgJHtlbnRyeVBvaW50cy5sZW5ndGh9IGVudHJ5LXBvaW50cyBpbiAke2R1cmF0aW9ufXMuIGAgK1xuICAgICAgICBgKFRvdGFsIHRhc2tzOiAke3Rhc2tzLmxlbmd0aH0pYCk7XG5cbiAgICByZXR1cm4gZ2V0VGFza1F1ZXVlKGluUGFyYWxsZWwsIHRhc2tzLCBncmFwaCk7XG4gIH07XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBjcmVhdGluZyB0aGUgYGNvbXBpbGUoKWAgZnVuY3Rpb24uXG4gIGNvbnN0IGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuID0gb25UYXNrQ29tcGxldGVkID0+IHtcbiAgICBjb25zdCBmaWxlV3JpdGVyID0gZ2V0RmlsZVdyaXRlcihmaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlciwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMpO1xuICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFRyYW5zZm9ybWVyKGZpbGVTeXN0ZW0sIGxvZ2dlcik7XG5cbiAgICByZXR1cm4gKHRhc2s6IFRhc2spID0+IHtcbiAgICAgIGNvbnN0IHtlbnRyeVBvaW50LCBmb3JtYXRQcm9wZXJ0eSwgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkLCBwcm9jZXNzRHRzfSA9IHRhc2s7XG5cbiAgICAgIGNvbnN0IGlzQ29yZSA9IGVudHJ5UG9pbnQubmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnOyAgLy8gQXJlIHdlIGNvbXBpbGluZyB0aGUgQW5ndWxhciBjb3JlP1xuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW2Zvcm1hdFByb3BlcnR5XTtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IGdldEVudHJ5UG9pbnRGb3JtYXQoZmlsZVN5c3RlbSwgZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHkpO1xuXG4gICAgICAvLyBBbGwgcHJvcGVydGllcyBsaXN0ZWQgaW4gYHByb3BlcnRpZXNUb1Byb2Nlc3NgIGFyZSBndWFyYW50ZWVkIHRvIHBvaW50IHRvIGEgZm9ybWF0LXBhdGhcbiAgICAgIC8vIChpLmUuIHRoZXkgYXJlIGRlZmluZWQgaW4gYGVudHJ5UG9pbnQucGFja2FnZUpzb25gKS4gRnVydGhlcm1vcmUsIHRoZXkgYXJlIGFsc28gZ3VhcmFudGVlZFxuICAgICAgLy8gdG8gYmUgYW1vbmcgYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2AuXG4gICAgICAvLyBCYXNlZCBvbiB0aGUgYWJvdmUsIGBmb3JtYXRQYXRoYCBzaG91bGQgYWx3YXlzIGJlIGRlZmluZWQgYW5kIGBnZXRFbnRyeVBvaW50Rm9ybWF0KClgXG4gICAgICAvLyBzaG91bGQgYWx3YXlzIHJldHVybiBhIGZvcm1hdCBoZXJlIChhbmQgbm90IGB1bmRlZmluZWRgKS5cbiAgICAgIGlmICghZm9ybWF0UGF0aCB8fCAhZm9ybWF0KSB7XG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEludmFyaWFudCB2aW9sYXRlZDogTm8gZm9ybWF0LXBhdGggb3IgZm9ybWF0IGZvciAke2VudHJ5UG9pbnQucGF0aH0gOiBgICtcbiAgICAgICAgICAgIGAke2Zvcm1hdFByb3BlcnR5fSAoZm9ybWF0UGF0aDogJHtmb3JtYXRQYXRofSB8IGZvcm1hdDogJHtmb3JtYXR9KWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQYXRoLCBpc0NvcmUsIGZvcm1hdCwgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzLCB0cnVlLFxuICAgICAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fWApO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oYnVuZGxlKTtcbiAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICBpZiAocmVzdWx0LmRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBsb2dnZXIud2FybihyZXBsYWNlVHNXaXRoTmdJbkVycm9ycyhcbiAgICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KSkpO1xuICAgICAgICB9XG4gICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoYnVuZGxlLCByZXN1bHQudHJhbnNmb3JtZWRGaWxlcywgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVycm9ycyA9IHJlcGxhY2VUc1dpdGhOZ0luRXJyb3JzKFxuICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBlbnRyeS1wb2ludCAke2VudHJ5UG9pbnQubmFtZX0gKCR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fSkgZHVlIHRvIGNvbXBpbGF0aW9uIGVycm9yczpcXG4ke2Vycm9yc31gKTtcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmRlYnVnKGAgIFN1Y2Nlc3NmdWxseSBjb21waWxlZCAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fWApO1xuXG4gICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZCk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBUaGUgZXhlY3V0b3IgZm9yIGFjdHVhbGx5IHBsYW5uaW5nIGFuZCBnZXR0aW5nIHRoZSB3b3JrIGRvbmUuXG4gIGNvbnN0IGV4ZWN1dG9yID0gZ2V0RXhlY3V0b3IoYXN5bmMsIGluUGFyYWxsZWwsIGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIsIGZpbGVTeXN0ZW0pO1xuXG4gIHJldHVybiBleGVjdXRvci5leGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlU3VwcG9ydGVkUHJvcGVydGllcyhwcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSB7XG4gIC8vIFNob3J0LWNpcmN1aXQgdGhlIGNhc2Ugd2hlcmUgYHByb3BlcnRpZXNgIGhhcyBmYWxsZW4gYmFjayB0byB0aGUgZGVmYXVsdCB2YWx1ZTpcbiAgLy8gYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2BcbiAgaWYgKHByb3BlcnRpZXMgPT09IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykgcmV0dXJuIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUztcblxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllcyBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5W10pIHtcbiAgICBpZiAoU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmluZGV4T2YocHJvcCkgIT09IC0xKSB7XG4gICAgICBzdXBwb3J0ZWRQcm9wZXJ0aWVzLnB1c2gocHJvcCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN1cHBvcnRlZFByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTm8gc3VwcG9ydGVkIGZvcm1hdCBwcm9wZXJ0eSB0byBjb25zaWRlciBhbW9uZyBbJHtwcm9wZXJ0aWVzLmpvaW4oJywgJyl9XS4gYCArXG4gICAgICAgIGBTdXBwb3J0ZWQgcHJvcGVydGllczogJHtTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIHJldHVybiBzdXBwb3J0ZWRQcm9wZXJ0aWVzO1xufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSnNvblVwZGF0ZXIoaW5QYXJhbGxlbDogYm9vbGVhbiwgZnM6IEZpbGVTeXN0ZW0pOiBQYWNrYWdlSnNvblVwZGF0ZXIge1xuICBjb25zdCBkaXJlY3RQa2dKc29uVXBkYXRlciA9IG5ldyBEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIoZnMpO1xuICByZXR1cm4gaW5QYXJhbGxlbCA/IG5ldyBDbHVzdGVyUGFja2FnZUpzb25VcGRhdGVyKGRpcmVjdFBrZ0pzb25VcGRhdGVyKSA6IGRpcmVjdFBrZ0pzb25VcGRhdGVyO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLFxuICAgIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzOiBib29sZWFuKTogRmlsZVdyaXRlciB7XG4gIHJldHVybiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/IG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcihmcywgcGtnSnNvblVwZGF0ZXIpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEluUGxhY2VGaWxlV3JpdGVyKGZzKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGFza1F1ZXVlKFxuICAgIGluUGFyYWxsZWw6IGJvb2xlYW4sIHRhc2tzOiBQYXJ0aWFsbHlPcmRlcmVkVGFza3MsIGdyYXBoOiBEZXBHcmFwaDxFbnRyeVBvaW50Pik6IFRhc2tRdWV1ZSB7XG4gIHJldHVybiBpblBhcmFsbGVsID8gbmV3IFBhcmFsbGVsVGFza1F1ZXVlKHRhc2tzLCBncmFwaCkgOiBuZXcgU2VyaWFsVGFza1F1ZXVlKHRhc2tzKTtcbn1cblxuZnVuY3Rpb24gZ2V0RXhlY3V0b3IoXG4gICAgYXN5bmM6IGJvb2xlYW4sIGluUGFyYWxsZWw6IGJvb2xlYW4sIGxvZ2dlcjogTG9nZ2VyLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLFxuICAgIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0pOiBFeGVjdXRvciB7XG4gIGNvbnN0IGxvY2tGaWxlID0gbmV3IExvY2tGaWxlV2l0aENoaWxkUHJvY2VzcyhmaWxlU3lzdGVtLCBsb2dnZXIpO1xuICBpZiAoYXN5bmMpIHtcbiAgICAvLyBFeGVjdXRlIGFzeW5jaHJvbm91c2x5IChlaXRoZXIgc2VyaWFsbHkgb3IgaW4gcGFyYWxsZWwpXG4gICAgY29uc3QgbG9ja2VyID0gbmV3IEFzeW5jTG9ja2VyKGxvY2tGaWxlLCBsb2dnZXIsIDUwMCwgNTApO1xuICAgIGlmIChpblBhcmFsbGVsKSB7XG4gICAgICAvLyBFeGVjdXRlIGluIHBhcmFsbGVsLiBVc2UgdXAgdG8gOCBDUFUgY29yZXMgZm9yIHdvcmtlcnMsIGFsd2F5cyByZXNlcnZpbmcgb25lIGZvciBtYXN0ZXIuXG4gICAgICBjb25zdCB3b3JrZXJDb3VudCA9IE1hdGgubWluKDgsIG9zLmNwdXMoKS5sZW5ndGggLSAxKTtcbiAgICAgIHJldHVybiBuZXcgQ2x1c3RlckV4ZWN1dG9yKHdvcmtlckNvdW50LCBsb2dnZXIsIHBrZ0pzb25VcGRhdGVyLCBsb2NrZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFeGVjdXRlIHNlcmlhbGx5LCBvbiBhIHNpbmdsZSB0aHJlYWQgKGFzeW5jKS5cbiAgICAgIHJldHVybiBuZXcgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yQXN5bmMobG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgbG9ja2VyKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhlY3V0ZSBzZXJpYWxseSwgb24gYSBzaW5nbGUgdGhyZWFkIChzeW5jKS5cbiAgICByZXR1cm4gbmV3IFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmMobG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgbmV3IFN5bmNMb2NrZXIobG9ja0ZpbGUpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREZXBlbmRlbmN5UmVzb2x2ZXIoXG4gICAgZmlsZVN5c3RlbTogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQpOiBEZXBlbmRlbmN5UmVzb2x2ZXIge1xuICBjb25zdCBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcihmaWxlU3lzdGVtLCBwYXRoTWFwcGluZ3MpO1xuICBjb25zdCBlc21EZXBlbmRlbmN5SG9zdCA9IG5ldyBFc21EZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IHVtZERlcGVuZGVuY3lIb3N0ID0gbmV3IFVtZERlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgY29uc3QgY29tbW9uSnNEZXBlbmRlbmN5SG9zdCA9IG5ldyBDb21tb25Kc0RlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgY29uc3QgZHRzRGVwZW5kZW5jeUhvc3QgPSBuZXcgRHRzRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzKTtcbiAgcmV0dXJuIG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIoXG4gICAgICBmaWxlU3lzdGVtLCBsb2dnZXIsIGNvbmZpZywge1xuICAgICAgICBlc201OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICAgICAgZXNtMjAxNTogZXNtRGVwZW5kZW5jeUhvc3QsXG4gICAgICAgIHVtZDogdW1kRGVwZW5kZW5jeUhvc3QsXG4gICAgICAgIGNvbW1vbmpzOiBjb21tb25Kc0RlcGVuZGVuY3lIb3N0XG4gICAgICB9LFxuICAgICAgZHRzRGVwZW5kZW5jeUhvc3QpO1xufVxuXG5mdW5jdGlvbiBnZXRFbnRyeVBvaW50RmluZGVyKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlciwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbixcbiAgICBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoIHwgbnVsbCxcbiAgICBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8IHVuZGVmaW5lZCk6IEVudHJ5UG9pbnRGaW5kZXIge1xuICBpZiAoYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCAhPT0gbnVsbCkge1xuICAgIHJldHVybiBuZXcgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgICBmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IERpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXIoXG4gICAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGxvZ0ludmFsaWRFbnRyeVBvaW50cyhsb2dnZXI6IExvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzOiBJbnZhbGlkRW50cnlQb2ludFtdKTogdm9pZCB7XG4gIGludmFsaWRFbnRyeVBvaW50cy5mb3JFYWNoKGludmFsaWRFbnRyeVBvaW50ID0+IHtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgIGBJbnZhbGlkIGVudHJ5LXBvaW50ICR7aW52YWxpZEVudHJ5UG9pbnQuZW50cnlQb2ludC5wYXRofS5gLFxuICAgICAgICBgSXQgaXMgbWlzc2luZyByZXF1aXJlZCBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgICAgICBpbnZhbGlkRW50cnlQb2ludC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfWApLmpvaW4oJ1xcbicpKTtcbiAgfSk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBjb21wdXRlcyBhbmQgcmV0dXJucyB0aGUgZm9sbG93aW5nOlxuICogLSBgcHJvcGVydGllc1RvUHJvY2Vzc2A6IEFuIChvcmRlcmVkKSBsaXN0IG9mIHByb3BlcnRpZXMgdGhhdCBleGlzdCBhbmQgbmVlZCB0byBiZSBwcm9jZXNzZWQsXG4gKiAgIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBgcHJvcGVydGllc1RvQ29uc2lkZXJgLCB0aGUgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCBhbmQgdGhlaXJcbiAqICAgY29ycmVzcG9uZGluZyBmb3JtYXQtcGF0aHMuIE5PVEU6IE9ubHkgb25lIHByb3BlcnR5IHBlciBmb3JtYXQtcGF0aCBuZWVkcyB0byBiZSBwcm9jZXNzZWQuXG4gKiAtIGBlcXVpdmFsZW50UHJvcGVydGllc01hcGA6IEEgbWFwcGluZyBmcm9tIGVhY2ggcHJvcGVydHkgaW4gYHByb3BlcnRpZXNUb1Byb2Nlc3NgIHRvIHRoZSBsaXN0IG9mXG4gKiAgIG90aGVyIGZvcm1hdCBwcm9wZXJ0aWVzIGluIGBwYWNrYWdlLmpzb25gIHRoYXQgbmVlZCB0byBiZSBtYXJrZWQgYXMgcHJvY2Vzc2VkIGFzIHNvb24gYXMgdGhlXG4gKiAgIGZvcm1lciBoYXMgYmVlbiBwcm9jZXNzZWQuXG4gKi9cbmZ1bmN0aW9uIGdldFByb3BlcnRpZXNUb1Byb2Nlc3MoXG4gICAgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgcHJvcGVydGllc1RvQ29uc2lkZXI6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbik6IHtcbiAgcHJvcGVydGllc1RvUHJvY2VzczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdO1xuICBlcXVpdmFsZW50UHJvcGVydGllc01hcDogTWFwPEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXT47XG59IHtcbiAgY29uc3QgZm9ybWF0UGF0aHNUb0NvbnNpZGVyID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgY29uc3QgcHJvcGVydGllc1RvUHJvY2VzczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID0gW107XG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIG5vdCBkZWZpbmVkIGluIGBwYWNrYWdlLmpzb25gLlxuICAgIGlmICh0eXBlb2YgZm9ybWF0UGF0aCAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBtYXAgdG8gdGhlIHNhbWUgZm9ybWF0LXBhdGggYXMgYSBwcmVjZWRpbmcgcHJvcGVydHkuXG4gICAgaWYgKGZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gUHJvY2VzcyB0aGlzIHByb3BlcnR5LCBiZWNhdXNlIGl0IGlzIHRoZSBmaXJzdCBvbmUgdG8gbWFwIHRvIHRoaXMgZm9ybWF0LXBhdGguXG4gICAgZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmFkZChmb3JtYXRQYXRoKTtcbiAgICBwcm9wZXJ0aWVzVG9Qcm9jZXNzLnB1c2gocHJvcCk7XG5cbiAgICAvLyBJZiB3ZSBvbmx5IG5lZWQgb25lIGZvcm1hdCBwcm9jZXNzZWQsIHRoZXJlIGlzIG5vIG5lZWQgdG8gcHJvY2VzcyBhbnkgbW9yZSBwcm9wZXJ0aWVzLlxuICAgIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIGJyZWFrO1xuICB9XG5cbiAgY29uc3QgZm9ybWF0UGF0aFRvUHJvcGVydGllczoge1tmb3JtYXRQYXRoOiBzdHJpbmddOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W119ID0ge307XG4gIGZvciAoY29uc3QgcHJvcCBvZiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgZGVmaW5lZCBpbiBgcGFja2FnZS5qc29uYC5cbiAgICBpZiAodHlwZW9mIGZvcm1hdFBhdGggIT09ICdzdHJpbmcnKSBjb250aW51ZTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgZG8gbm90IG1hcCB0byBhIGZvcm1hdC1wYXRoIHRoYXQgd2lsbCBiZSBjb25zaWRlcmVkLlxuICAgIGlmICghZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmhhcyhmb3JtYXRQYXRoKSkgY29udGludWU7XG5cbiAgICAvLyBBZGQgdGhpcyBwcm9wZXJ0eSB0byB0aGUgbWFwLlxuICAgIGNvbnN0IGxpc3QgPSBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdIHx8IChmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdID0gW10pO1xuICAgIGxpc3QucHVzaChwcm9wKTtcbiAgfVxuXG4gIGNvbnN0IGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwID0gbmV3IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+KCk7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXSAhO1xuICAgIGNvbnN0IGVxdWl2YWxlbnRQcm9wZXJ0aWVzID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXTtcbiAgICBlcXVpdmFsZW50UHJvcGVydGllc01hcC5zZXQocHJvcCwgZXF1aXZhbGVudFByb3BlcnRpZXMpO1xuICB9XG5cbiAgcmV0dXJuIHtwcm9wZXJ0aWVzVG9Qcm9jZXNzLCBlcXVpdmFsZW50UHJvcGVydGllc01hcH07XG59XG4iXX0=