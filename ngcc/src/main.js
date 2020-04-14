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
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "os", "typescript", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/execution/cluster/executor", "@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater", "@angular/compiler-cli/ngcc/src/execution/single_process_executor", "@angular/compiler-cli/ngcc/src/execution/tasks/completion", "@angular/compiler-cli/ngcc/src/execution/tasks/queues/parallel_task_queue", "@angular/compiler-cli/ngcc/src/execution/tasks/queues/serial_task_queue", "@angular/compiler-cli/ngcc/src/execution/tasks/utils", "@angular/compiler-cli/ngcc/src/locking/async_locker", "@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index", "@angular/compiler-cli/ngcc/src/locking/sync_locker", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/logging/logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/entry_point_manifest", "@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", "@angular/compiler-cli/ngcc/src/writing/package_json_updater"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var os = require("os");
    var ts = require("typescript");
    var __1 = require("@angular/compiler-cli");
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
    var completion_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/completion");
    var parallel_task_queue_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/queues/parallel_task_queue");
    var serial_task_queue_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/queues/serial_task_queue");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/execution/tasks/utils");
    var async_locker_1 = require("@angular/compiler-cli/ngcc/src/locking/async_locker");
    var lock_file_with_child_process_1 = require("@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index");
    var sync_locker_1 = require("@angular/compiler-cli/ngcc/src/locking/sync_locker");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var configuration_1 = require("@angular/compiler-cli/ngcc/src/packages/configuration");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var entry_point_bundle_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle");
    var entry_point_manifest_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_manifest");
    var package_cleaner_1 = require("@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner");
    var in_place_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    var package_json_updater_2 = require("@angular/compiler-cli/ngcc/src/writing/package_json_updater");
    function mainNgcc(_a) {
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _b = _a.propertiesToConsider, propertiesToConsider = _b === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _b, _c = _a.compileAllFormats, compileAllFormats = _c === void 0 ? true : _c, _d = _a.createNewEntryPointFormats, createNewEntryPointFormats = _d === void 0 ? false : _d, _e = _a.logger, logger = _e === void 0 ? new console_logger_1.ConsoleLogger(logger_1.LogLevel.info) : _e, pathMappings = _a.pathMappings, _f = _a.async, async = _f === void 0 ? false : _f, _g = _a.errorOnFailedEntryPoint, errorOnFailedEntryPoint = _g === void 0 ? false : _g, _h = _a.enableI18nLegacyMessageIdFormat, enableI18nLegacyMessageIdFormat = _h === void 0 ? true : _h, _j = _a.invalidateEntryPointManifest, invalidateEntryPointManifest = _j === void 0 ? false : _j, tsConfigPath = _a.tsConfigPath;
        if (!!targetEntryPointPath) {
            // targetEntryPointPath forces us to error if an entry-point fails.
            errorOnFailedEntryPoint = true;
        }
        // Execute in parallel, if async execution is acceptable and there are more than 1 CPU cores.
        var inParallel = async && (os.cpus().length > 1);
        // Instantiate common utilities that are always used.
        // NOTE: Avoid eagerly instantiating anything that might not be used when running sync/async or in
        //       master/worker process.
        var fileSystem = file_system_1.getFileSystem();
        var absBasePath = file_system_1.absoluteFrom(basePath);
        var projectPath = file_system_1.dirname(absBasePath);
        var config = new configuration_1.NgccConfiguration(fileSystem, projectPath);
        var tsConfig = tsConfigPath !== null ? __1.readConfiguration(tsConfigPath || projectPath) : null;
        // If `pathMappings` is not provided directly, then try getting it from `tsConfig`, if available.
        if (tsConfig !== null && pathMappings === undefined && tsConfig.options.baseUrl !== undefined &&
            tsConfig.options.paths) {
            pathMappings = {
                baseUrl: file_system_1.resolve(projectPath, tsConfig.options.baseUrl),
                paths: tsConfig.options.paths,
            };
        }
        var dependencyResolver = getDependencyResolver(fileSystem, logger, config, pathMappings);
        var entryPointManifest = invalidateEntryPointManifest ?
            new entry_point_manifest_1.InvalidatingEntryPointManifest(fileSystem, config, logger) :
            new entry_point_manifest_1.EntryPointManifest(fileSystem, config, logger);
        // Bail out early if the work is already done.
        var supportedPropertiesToConsider = ensureSupportedProperties(propertiesToConsider);
        var absoluteTargetEntryPointPath = targetEntryPointPath !== undefined ? file_system_1.resolve(basePath, targetEntryPointPath) : null;
        var finder = getEntryPointFinder(fileSystem, logger, dependencyResolver, config, entryPointManifest, absBasePath, absoluteTargetEntryPointPath, pathMappings);
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
            var duration = Math.round((Date.now() - startTime) / 100) / 10;
            logger.debug("Analyzed " + entryPoints.length + " entry-points in " + duration + "s. " +
                ("(Total tasks: " + tasks.length + ")"));
            return getTaskQueue(logger, inParallel, tasks, graph);
        };
        // The function for creating the `compile()` function.
        var createCompileFn = function (onTaskCompleted) {
            var fileWriter = getFileWriter(fileSystem, logger, pkgJsonUpdater, createNewEntryPointFormats, errorOnFailedEntryPoint);
            var Transformer = require('./packages/transformer').Transformer;
            var transformer = new Transformer(fileSystem, logger, tsConfig);
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
                    logger.debug("  Successfully compiled " + entryPoint.name + " : " + formatProperty);
                    onTaskCompleted(task, 0 /* Processed */, null);
                }
                else {
                    var errors = diagnostics_1.replaceTsWithNgInErrors(ts.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host));
                    onTaskCompleted(task, 1 /* Failed */, "compilation errors:\n" + errors);
                }
            };
        };
        // The executor for actually planning and getting the work done.
        var createTaskCompletedCallback = getCreateTaskCompletedCallback(pkgJsonUpdater, errorOnFailedEntryPoint, logger, fileSystem);
        var executor = getExecutor(async, inParallel, logger, pkgJsonUpdater, fileSystem, createTaskCompletedCallback);
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
    function getFileWriter(fs, logger, pkgJsonUpdater, createNewEntryPointFormats, errorOnFailedEntryPoint) {
        return createNewEntryPointFormats ?
            new new_entry_point_file_writer_1.NewEntryPointFileWriter(fs, logger, errorOnFailedEntryPoint, pkgJsonUpdater) :
            new in_place_file_writer_1.InPlaceFileWriter(fs, logger, errorOnFailedEntryPoint);
    }
    function getTaskQueue(logger, inParallel, tasks, graph) {
        var dependencies = utils_1.computeTaskDependencies(tasks, graph);
        return inParallel ? new parallel_task_queue_1.ParallelTaskQueue(logger, tasks, dependencies) :
            new serial_task_queue_1.SerialTaskQueue(logger, tasks, dependencies);
    }
    function getCreateTaskCompletedCallback(pkgJsonUpdater, errorOnFailedEntryPoint, logger, fileSystem) {
        return function (taskQueue) {
            var _a;
            return completion_1.composeTaskCompletedCallbacks((_a = {},
                _a[0 /* Processed */] = completion_1.createMarkAsProcessedHandler(pkgJsonUpdater),
                _a[1 /* Failed */] = errorOnFailedEntryPoint ? completion_1.createThrowErrorHandler(fileSystem) :
                    completion_1.createLogErrorHandler(logger, fileSystem, taskQueue),
                _a));
        };
    }
    function getExecutor(async, inParallel, logger, pkgJsonUpdater, fileSystem, createTaskCompletedCallback) {
        var lockFile = new lock_file_with_child_process_1.LockFileWithChildProcess(fileSystem, logger);
        if (async) {
            // Execute asynchronously (either serially or in parallel)
            var locker = new async_locker_1.AsyncLocker(lockFile, logger, 500, 50);
            if (inParallel) {
                // Execute in parallel. Use up to 8 CPU cores for workers, always reserving one for master.
                var workerCount = Math.min(8, os.cpus().length - 1);
                return new executor_1.ClusterExecutor(workerCount, logger, pkgJsonUpdater, locker, createTaskCompletedCallback);
            }
            else {
                // Execute serially, on a single thread (async).
                return new single_process_executor_1.SingleProcessExecutorAsync(logger, locker, createTaskCompletedCallback);
            }
        }
        else {
            // Execute serially, on a single thread (sync).
            return new single_process_executor_1.SingleProcessExecutorSync(logger, new sync_locker_1.SyncLocker(lockFile), createTaskCompletedCallback);
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
    function getEntryPointFinder(fs, logger, resolver, config, entryPointManifest, basePath, absoluteTargetEntryPointPath, pathMappings) {
        if (absoluteTargetEntryPointPath !== null) {
            return new targeted_entry_point_finder_1.TargetedEntryPointFinder(fs, config, logger, resolver, basePath, absoluteTargetEntryPointPath, pathMappings);
        }
        else {
            return new directory_walker_entry_point_finder_1.DirectoryWalkerEntryPointFinder(fs, config, logger, resolver, entryPointManifest, basePath, pathMappings);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILHVCQUF5QjtJQUN6QiwrQkFBaUM7SUFFakMsMkNBQXdDO0lBQ3hDLDJFQUFvRTtJQUNwRSwyRUFBc0g7SUFFdEgsaUhBQStFO0lBQy9FLHVHQUF5RjtJQUN6Rix1R0FBcUU7SUFDckUsdUdBQXFFO0lBQ3JFLCtGQUE4RDtJQUM5RCx1R0FBcUU7SUFDckUsNklBQXlHO0lBRXpHLDZIQUEwRjtJQUUxRixzRkFBNkQ7SUFDN0QsOEdBQW1GO0lBQ25GLDRHQUEwRztJQUUxRyx3RkFBeUo7SUFDekosaUhBQStFO0lBQy9FLDZHQUEyRTtJQUMzRSw4RUFBZ0U7SUFDaEUsb0ZBQW1EO0lBQ25ELDBIQUFnRjtJQUNoRixrRkFBaUQ7SUFDakQsd0ZBQXVEO0lBQ3ZELHdFQUFrRDtJQUNsRCxxRkFBeUQ7SUFDekQsdUZBQTJEO0lBQzNELG1GQUFtSjtJQUNuSixpR0FBbUU7SUFDbkUscUdBQW1HO0lBRW5HLG1HQUF5RTtJQUV6RSxvR0FBaUU7SUFDakUsa0hBQThFO0lBQzlFLG9HQUE0RjtJQW1JNUYsU0FBZ0IsUUFBUSxDQUFDLEVBYVg7WUFaWixzQkFBUSxFQUNSLDhDQUFvQixFQUNwQiw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xELHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFDeEIsa0NBQWtDLEVBQWxDLHVEQUFrQyxFQUNsQyxjQUF5QyxFQUF6Qyx3RkFBeUMsRUFDekMsOEJBQVksRUFDWixhQUFhLEVBQWIsa0NBQWEsRUFDYiwrQkFBK0IsRUFBL0Isb0RBQStCLEVBQy9CLHVDQUFzQyxFQUF0QywyREFBc0MsRUFDdEMsb0NBQW9DLEVBQXBDLHlEQUFvQyxFQUNwQyw4QkFBWTtRQUVaLElBQUksQ0FB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QUFVLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2pCOzs7Ozs7Ozs7UUFFRCxJQUFNLHVCQUF1QixHQUFHLElBQUksR0FBRyxFQUFvRCxDQUFDOztZQUM1RixLQUFtQixJQUFBLHlCQUFBLGlCQUFBLG9CQUFvQixDQUFBLDBEQUFBLDRGQUFFO2dCQUFwQyxJQUFNLElBQUksaUNBQUE7Z0JBQ2IsSUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBRSxDQUFDO2dCQUN0QyxJQUFNLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNoRSx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUM7YUFDekQ7Ozs7Ozs7OztRQUVELE9BQU8sRUFBQyxtQkFBbUIscUJBQUEsRUFBRSx1QkFBdUIseUJBQUEsRUFBQyxDQUFDO0lBQ3hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCB7RGVwR3JhcGh9IGZyb20gJ2RlcGVuZGVuY3ktZ3JhcGgnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7cmVhZENvbmZpZ3VyYXRpb259IGZyb20gJy4uLy4uJztcbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgQWJzb2x1dGVGc1BhdGgsIGRpcm5hbWUsIEZpbGVTeXN0ZW0sIGdldEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7Q29tbW9uSnNEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBJbnZhbGlkRW50cnlQb2ludH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0R0c0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9kdHNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RXNtRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2VzbV9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvbW9kdWxlX3Jlc29sdmVyJztcbmltcG9ydCB7VW1kRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL3VtZF9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci9kaXJlY3Rvcnlfd2Fsa2VyX2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2ludGVyZmFjZSc7XG5pbXBvcnQge1RhcmdldGVkRW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvdGFyZ2V0ZWRfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm4sIENyZWF0ZUNvbXBpbGVGbiwgRXhlY3V0b3J9IGZyb20gJy4vZXhlY3V0aW9uL2FwaSc7XG5pbXBvcnQge0NsdXN0ZXJFeGVjdXRvcn0gZnJvbSAnLi9leGVjdXRpb24vY2x1c3Rlci9leGVjdXRvcic7XG5pbXBvcnQge0NsdXN0ZXJQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4vZXhlY3V0aW9uL2NsdXN0ZXIvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtTaW5nbGVQcm9jZXNzRXhlY3V0b3JBc3luYywgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yU3luY30gZnJvbSAnLi9leGVjdXRpb24vc2luZ2xlX3Byb2Nlc3NfZXhlY3V0b3InO1xuaW1wb3J0IHtDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2ssIFBhcnRpYWxseU9yZGVyZWRUYXNrcywgVGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLCBUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tzL2FwaSc7XG5pbXBvcnQge2NvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzLCBjcmVhdGVMb2dFcnJvckhhbmRsZXIsIGNyZWF0ZU1hcmtBc1Byb2Nlc3NlZEhhbmRsZXIsIGNyZWF0ZVRocm93RXJyb3JIYW5kbGVyfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrcy9jb21wbGV0aW9uJztcbmltcG9ydCB7UGFyYWxsZWxUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tzL3F1ZXVlcy9wYXJhbGxlbF90YXNrX3F1ZXVlJztcbmltcG9ydCB7U2VyaWFsVGFza1F1ZXVlfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrcy9xdWV1ZXMvc2VyaWFsX3Rhc2tfcXVldWUnO1xuaW1wb3J0IHtjb21wdXRlVGFza0RlcGVuZGVuY2llc30gZnJvbSAnLi9leGVjdXRpb24vdGFza3MvdXRpbHMnO1xuaW1wb3J0IHtBc3luY0xvY2tlcn0gZnJvbSAnLi9sb2NraW5nL2FzeW5jX2xvY2tlcic7XG5pbXBvcnQge0xvY2tGaWxlV2l0aENoaWxkUHJvY2Vzc30gZnJvbSAnLi9sb2NraW5nL2xvY2tfZmlsZV93aXRoX2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtTeW5jTG9ja2VyfSBmcm9tICcuL2xvY2tpbmcvc3luY19sb2NrZXInO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZH0gZnJvbSAnLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludFBhY2thZ2VKc29uLCBnZXRFbnRyeVBvaW50Rm9ybWF0LCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVN9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHttYWtlRW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtFbnRyeVBvaW50TWFuaWZlc3QsIEludmFsaWRhdGluZ0VudHJ5UG9pbnRNYW5pZmVzdH0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9tYW5pZmVzdCc7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2NsZWFuT3V0ZGF0ZWRQYWNrYWdlc30gZnJvbSAnLi93cml0aW5nL2NsZWFuaW5nL3BhY2thZ2VfY2xlYW5lcic7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvaW5fcGxhY2VfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtOZXdFbnRyeVBvaW50RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5pbXBvcnQge0RpcmVjdFBhY2thZ2VKc29uVXBkYXRlciwgUGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlciBmb3Igc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN5bmNOZ2NjT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2VzIHRvIHByb2Nlc3MuICovXG4gIGJhc2VQYXRoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBwYXRoIHRvIHRoZSBwcmltYXJ5IHBhY2thZ2UgdG8gYmUgcHJvY2Vzc2VkLiBJZiBub3QgYWJzb2x1dGUgdGhlbiBpdCBtdXN0IGJlIHJlbGF0aXZlIHRvXG4gICAqIGBiYXNlUGF0aGAuXG4gICAqXG4gICAqIEFsbCBpdHMgZGVwZW5kZW5jaWVzIHdpbGwgbmVlZCB0byBiZSBwcm9jZXNzZWQgdG9vLlxuICAgKlxuICAgKiBJZiB0aGlzIHByb3BlcnR5IGlzIHByb3ZpZGVkIHRoZW4gYGVycm9yT25GYWlsZWRFbnRyeVBvaW50YCBpcyBmb3JjZWQgdG8gdHJ1ZS5cbiAgICovXG4gIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGljaCBlbnRyeS1wb2ludCBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY29uc2lkZXIgd2hlbiBwcm9jZXNzaW5nIGFuIGVudHJ5LXBvaW50LlxuICAgKiBFYWNoIHByb3BlcnR5IHNob3VsZCBob2xkIGEgcGF0aCB0byB0aGUgcGFydGljdWxhciBidW5kbGUgZm9ybWF0IGZvciB0aGUgZW50cnktcG9pbnQuXG4gICAqIERlZmF1bHRzIHRvIGFsbCB0aGUgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uLlxuICAgKi9cbiAgcHJvcGVydGllc1RvQ29uc2lkZXI/OiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogV2hldGhlciB0byBwcm9jZXNzIGFsbCBmb3JtYXRzIHNwZWNpZmllZCBieSAoYHByb3BlcnRpZXNUb0NvbnNpZGVyYCkgIG9yIHRvIHN0b3AgcHJvY2Vzc2luZ1xuICAgKiB0aGlzIGVudHJ5LXBvaW50IGF0IHRoZSBmaXJzdCBtYXRjaGluZyBmb3JtYXQuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIGNvbXBpbGVBbGxGb3JtYXRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBjcmVhdGUgbmV3IGVudHJ5LXBvaW50cyBidW5kbGVzIHJhdGhlciB0aGFuIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBmaWxlcy5cbiAgICovXG4gIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogUHJvdmlkZSBhIGxvZ2dlciB0aGF0IHdpbGwgYmUgY2FsbGVkIHdpdGggbG9nIG1lc3NhZ2VzLlxuICAgKi9cbiAgbG9nZ2VyPzogTG9nZ2VyO1xuXG4gIC8qKlxuICAgKiBQYXRocyBtYXBwaW5nIGNvbmZpZ3VyYXRpb24gKGBwYXRoc2AgYW5kIGBiYXNlVXJsYCksIGFzIGZvdW5kIGluIGB0cy5Db21waWxlck9wdGlvbnNgLlxuICAgKiBUaGVzZSBhcmUgdXNlZCB0byByZXNvbHZlIHBhdGhzIHRvIGxvY2FsbHkgYnVpbHQgQW5ndWxhciBsaWJyYXJpZXMuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBgcGF0aE1hcHBpbmdzYCBzcGVjaWZpZWQgaGVyZSB0YWtlIHByZWNlZGVuY2Ugb3ZlciBhbnkgYHBhdGhNYXBwaW5nc2AgbG9hZGVkIGZyb20gYVxuICAgKiBUUyBjb25maWcgZmlsZS5cbiAgICovXG4gIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncztcblxuICAvKipcbiAgICogUHJvdmlkZSBhIGZpbGUtc3lzdGVtIHNlcnZpY2UgdGhhdCB3aWxsIGJlIHVzZWQgYnkgbmdjYyBmb3IgYWxsIGZpbGUgaW50ZXJhY3Rpb25zLlxuICAgKi9cbiAgZmlsZVN5c3RlbT86IEZpbGVTeXN0ZW07XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGNvbXBpbGF0aW9uIHNob3VsZCBydW4gYW5kIHJldHVybiBhc3luY2hyb25vdXNseS4gQWxsb3dpbmcgYXN5bmNocm9ub3VzIGV4ZWN1dGlvblxuICAgKiBtYXkgc3BlZWQgdXAgdGhlIGNvbXBpbGF0aW9uIGJ5IHV0aWxpemluZyBtdWx0aXBsZSBDUFUgY29yZXMgKGlmIGF2YWlsYWJsZSkuXG4gICAqXG4gICAqIERlZmF1bHQ6IGBmYWxzZWAgKGkuZS4gcnVuIHN5bmNocm9ub3VzbHkpXG4gICAqL1xuICBhc3luYz86IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBTZXQgdG8gdHJ1ZSBpbiBvcmRlciB0byB0ZXJtaW5hdGUgaW1tZWRpYXRlbHkgd2l0aCBhbiBlcnJvciBjb2RlIGlmIGFuIGVudHJ5LXBvaW50IGZhaWxzIHRvIGJlXG4gICAqIHByb2Nlc3NlZC5cbiAgICpcbiAgICogSWYgYHRhcmdldEVudHJ5UG9pbnRQYXRoYCBpcyBwcm92aWRlZCB0aGVuIHRoaXMgcHJvcGVydHkgaXMgYWx3YXlzIHRydWUgYW5kIGNhbm5vdCBiZVxuICAgKiBjaGFuZ2VkLiBPdGhlcndpc2UgdGhlIGRlZmF1bHQgaXMgZmFsc2UuXG4gICAqXG4gICAqIFdoZW4gc2V0IHRvIGZhbHNlLCBuZ2NjIHdpbGwgY29udGludWUgdG8gcHJvY2VzcyBlbnRyeS1wb2ludHMgYWZ0ZXIgYSBmYWlsdXJlLiBJbiB3aGljaCBjYXNlIGl0XG4gICAqIHdpbGwgbG9nIGFuIGVycm9yIGFuZCByZXN1bWUgcHJvY2Vzc2luZyBvdGhlciBlbnRyeS1wb2ludHMuXG4gICAqL1xuICBlcnJvck9uRmFpbGVkRW50cnlQb2ludD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFJlbmRlciBgJGxvY2FsaXplYCBtZXNzYWdlcyB3aXRoIGxlZ2FjeSBmb3JtYXQgaWRzLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAuIE9ubHkgc2V0IHRoaXMgdG8gYGZhbHNlYCBpZiB5b3UgZG8gbm90IHdhbnQgbGVnYWN5IG1lc3NhZ2UgaWRzIHRvXG4gICAqIGJlIHJlbmRlcmVkLiBGb3IgZXhhbXBsZSwgaWYgeW91IGFyZSBub3QgdXNpbmcgbGVnYWN5IG1lc3NhZ2UgaWRzIGluIHlvdXIgdHJhbnNsYXRpb24gZmlsZXNcbiAgICogQU5EIGFyZSBub3QgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIG9mIHRyYW5zbGF0aW9ucywgaW4gd2hpY2ggY2FzZSB0aGUgZXh0cmEgbWVzc2FnZSBpZHNcbiAgICogd291bGQgYWRkIHVud2FudGVkIHNpemUgdG8gdGhlIGZpbmFsIHNvdXJjZSBidW5kbGUuXG4gICAqXG4gICAqIEl0IGlzIHNhZmUgdG8gbGVhdmUgdGhpcyBzZXQgdG8gdHJ1ZSBpZiB5b3UgYXJlIGRvaW5nIGNvbXBpbGUtdGltZSBpbmxpbmluZyBiZWNhdXNlIHRoZSBleHRyYVxuICAgKiBsZWdhY3kgbWVzc2FnZSBpZHMgd2lsbCBhbGwgYmUgc3RyaXBwZWQgZHVyaW5nIHRyYW5zbGF0aW9uLlxuICAgKi9cbiAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW52YWxpZGF0ZSBhbnkgZW50cnktcG9pbnQgbWFuaWZlc3QgZmlsZSB0aGF0IGlzIG9uIGRpc2suIEluc3RlYWQsIHdhbGsgdGhlXG4gICAqIGRpcmVjdG9yeSB0cmVlIGxvb2tpbmcgZm9yIGVudHJ5LXBvaW50cywgYW5kIHRoZW4gd3JpdGUgYSBuZXcgZW50cnktcG9pbnQgbWFuaWZlc3QsIGlmXG4gICAqIHBvc3NpYmxlLlxuICAgKlxuICAgKiBEZWZhdWx0OiBgZmFsc2VgIChpLmUuIHRoZSBtYW5pZmVzdCB3aWxsIGJlIHVzZWQgaWYgYXZhaWxhYmxlKVxuICAgKi9cbiAgaW52YWxpZGF0ZUVudHJ5UG9pbnRNYW5pZmVzdD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFuIGFic29sdXRlIHBhdGggdG8gYSBUUyBjb25maWcgZmlsZSAoZS5nLiBgdHNjb25maWcuanNvbmApIG9yIGEgZGlyZWN0b3J5IGNvbnRhaW5pbmcgb25lLCB0aGF0XG4gICAqIHdpbGwgYmUgdXNlZCB0byBjb25maWd1cmUgbW9kdWxlIHJlc29sdXRpb24gd2l0aCB0aGluZ3MgbGlrZSBwYXRoIG1hcHBpbmdzLCBpZiBub3Qgc3BlY2lmaWVkXG4gICAqIGV4cGxpY2l0bHkgdmlhIHRoZSBgcGF0aE1hcHBpbmdzYCBwcm9wZXJ0eSB0byBgbWFpbk5nY2NgLlxuICAgKlxuICAgKiBJZiBgdW5kZWZpbmVkYCwgbmdjYyB3aWxsIGF0dGVtcHQgdG8gbG9hZCBhIGB0c2NvbmZpZy5qc29uYCBmaWxlIGZyb20gdGhlIGRpcmVjdG9yeSBhYm92ZSB0aGVcbiAgICogYGJhc2VQYXRoYC5cbiAgICpcbiAgICogSWYgYG51bGxgLCBuZ2NjIHdpbGwgbm90IGF0dGVtcHQgdG8gbG9hZCBhbnkgVFMgY29uZmlnIGZpbGUgYXQgYWxsLlxuICAgKi9cbiAgdHNDb25maWdQYXRoPzogc3RyaW5nfG51bGw7XG59XG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyIGZvciBhc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICovXG5leHBvcnQgdHlwZSBBc3luY05nY2NPcHRpb25zID0gT21pdDxTeW5jTmdjY09wdGlvbnMsICdhc3luYyc+Jnthc3luYzogdHJ1ZX07XG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyLlxuICovXG5leHBvcnQgdHlwZSBOZ2NjT3B0aW9ucyA9IEFzeW5jTmdjY09wdGlvbnN8U3luY05nY2NPcHRpb25zO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhvcHRpb25zOiBBc3luY05nY2NPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhvcHRpb25zOiBTeW5jTmdjY09wdGlvbnMpOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKHtcbiAgYmFzZVBhdGgsXG4gIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLFxuICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSxcbiAgcGF0aE1hcHBpbmdzLFxuICBhc3luYyA9IGZhbHNlLFxuICBlcnJvck9uRmFpbGVkRW50cnlQb2ludCA9IGZhbHNlLFxuICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID0gdHJ1ZSxcbiAgaW52YWxpZGF0ZUVudHJ5UG9pbnRNYW5pZmVzdCA9IGZhbHNlLFxuICB0c0NvbmZpZ1BhdGhcbn06IE5nY2NPcHRpb25zKTogdm9pZHxQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCEhdGFyZ2V0RW50cnlQb2ludFBhdGgpIHtcbiAgICAvLyB0YXJnZXRFbnRyeVBvaW50UGF0aCBmb3JjZXMgdXMgdG8gZXJyb3IgaWYgYW4gZW50cnktcG9pbnQgZmFpbHMuXG4gICAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQgPSB0cnVlO1xuICB9XG5cbiAgLy8gRXhlY3V0ZSBpbiBwYXJhbGxlbCwgaWYgYXN5bmMgZXhlY3V0aW9uIGlzIGFjY2VwdGFibGUgYW5kIHRoZXJlIGFyZSBtb3JlIHRoYW4gMSBDUFUgY29yZXMuXG4gIGNvbnN0IGluUGFyYWxsZWwgPSBhc3luYyAmJiAob3MuY3B1cygpLmxlbmd0aCA+IDEpO1xuXG4gIC8vIEluc3RhbnRpYXRlIGNvbW1vbiB1dGlsaXRpZXMgdGhhdCBhcmUgYWx3YXlzIHVzZWQuXG4gIC8vIE5PVEU6IEF2b2lkIGVhZ2VybHkgaW5zdGFudGlhdGluZyBhbnl0aGluZyB0aGF0IG1pZ2h0IG5vdCBiZSB1c2VkIHdoZW4gcnVubmluZyBzeW5jL2FzeW5jIG9yIGluXG4gIC8vICAgICAgIG1hc3Rlci93b3JrZXIgcHJvY2Vzcy5cbiAgY29uc3QgZmlsZVN5c3RlbSA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgY29uc3QgYWJzQmFzZVBhdGggPSBhYnNvbHV0ZUZyb20oYmFzZVBhdGgpO1xuICBjb25zdCBwcm9qZWN0UGF0aCA9IGRpcm5hbWUoYWJzQmFzZVBhdGgpO1xuICBjb25zdCBjb25maWcgPSBuZXcgTmdjY0NvbmZpZ3VyYXRpb24oZmlsZVN5c3RlbSwgcHJvamVjdFBhdGgpO1xuICBjb25zdCB0c0NvbmZpZyA9IHRzQ29uZmlnUGF0aCAhPT0gbnVsbCA/IHJlYWRDb25maWd1cmF0aW9uKHRzQ29uZmlnUGF0aCB8fCBwcm9qZWN0UGF0aCkgOiBudWxsO1xuXG4gIC8vIElmIGBwYXRoTWFwcGluZ3NgIGlzIG5vdCBwcm92aWRlZCBkaXJlY3RseSwgdGhlbiB0cnkgZ2V0dGluZyBpdCBmcm9tIGB0c0NvbmZpZ2AsIGlmIGF2YWlsYWJsZS5cbiAgaWYgKHRzQ29uZmlnICE9PSBudWxsICYmIHBhdGhNYXBwaW5ncyA9PT0gdW5kZWZpbmVkICYmIHRzQ29uZmlnLm9wdGlvbnMuYmFzZVVybCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICB0c0NvbmZpZy5vcHRpb25zLnBhdGhzKSB7XG4gICAgcGF0aE1hcHBpbmdzID0ge1xuICAgICAgYmFzZVVybDogcmVzb2x2ZShwcm9qZWN0UGF0aCwgdHNDb25maWcub3B0aW9ucy5iYXNlVXJsKSxcbiAgICAgIHBhdGhzOiB0c0NvbmZpZy5vcHRpb25zLnBhdGhzLFxuICAgIH07XG4gIH1cblxuICBjb25zdCBkZXBlbmRlbmN5UmVzb2x2ZXIgPSBnZXREZXBlbmRlbmN5UmVzb2x2ZXIoZmlsZVN5c3RlbSwgbG9nZ2VyLCBjb25maWcsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVudHJ5UG9pbnRNYW5pZmVzdCA9IGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QgP1xuICAgICAgbmV3IEludmFsaWRhdGluZ0VudHJ5UG9pbnRNYW5pZmVzdChmaWxlU3lzdGVtLCBjb25maWcsIGxvZ2dlcikgOlxuICAgICAgbmV3IEVudHJ5UG9pbnRNYW5pZmVzdChmaWxlU3lzdGVtLCBjb25maWcsIGxvZ2dlcik7XG5cbiAgLy8gQmFpbCBvdXQgZWFybHkgaWYgdGhlIHdvcmsgaXMgYWxyZWFkeSBkb25lLlxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciA9IGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllc1RvQ29uc2lkZXIpO1xuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID1cbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSB1bmRlZmluZWQgPyByZXNvbHZlKGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCkgOiBudWxsO1xuICBjb25zdCBmaW5kZXIgPSBnZXRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBkZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZywgZW50cnlQb2ludE1hbmlmZXN0LCBhYnNCYXNlUGF0aCxcbiAgICAgIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIGlmIChmaW5kZXIgaW5zdGFuY2VvZiBUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXIgJiZcbiAgICAgICFmaW5kZXIudGFyZ2V0TmVlZHNQcm9jZXNzaW5nT3JDbGVhbmluZyhzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTk9URTogVG8gYXZvaWQgZmlsZSBjb3JydXB0aW9uLCBlbnN1cmUgdGhhdCBlYWNoIGBuZ2NjYCBpbnZvY2F0aW9uIG9ubHkgY3JlYXRlcyBfb25lXyBpbnN0YW5jZVxuICAvLyAgICAgICBvZiBgUGFja2FnZUpzb25VcGRhdGVyYCB0aGF0IGFjdHVhbGx5IHdyaXRlcyB0byBkaXNrIChhY3Jvc3MgYWxsIHByb2Nlc3NlcykuXG4gIC8vICAgICAgIFRoaXMgaXMgaGFyZCB0byBlbmZvcmNlIGF1dG9tYXRpY2FsbHksIHdoZW4gcnVubmluZyBvbiBtdWx0aXBsZSBwcm9jZXNzZXMsIHNvIG5lZWRzIHRvIGJlXG4gIC8vICAgICAgIGVuZm9yY2VkIG1hbnVhbGx5LlxuICBjb25zdCBwa2dKc29uVXBkYXRlciA9IGdldFBhY2thZ2VKc29uVXBkYXRlcihpblBhcmFsbGVsLCBmaWxlU3lzdGVtKTtcblxuICAvLyBUaGUgZnVuY3Rpb24gZm9yIHBlcmZvcm1pbmcgdGhlIGFuYWx5c2lzLlxuICBjb25zdCBhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuID0gKCkgPT4ge1xuICAgIGxvZ2dlci5kZWJ1ZygnQW5hbHl6aW5nIGVudHJ5LXBvaW50cy4uLicpO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICBsZXQgZW50cnlQb2ludEluZm8gPSBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKCk7XG4gICAgY29uc3QgY2xlYW5lZCA9IGNsZWFuT3V0ZGF0ZWRQYWNrYWdlcyhmaWxlU3lzdGVtLCBlbnRyeVBvaW50SW5mby5lbnRyeVBvaW50cyk7XG4gICAgaWYgKGNsZWFuZWQpIHtcbiAgICAgIC8vIElmIHdlIGhhZCB0byBjbGVhbiB1cCBvbmUgb3IgbW9yZSBwYWNrYWdlcyB0aGVuIHdlIG11c3QgcmVhZCBpbiB0aGUgZW50cnktcG9pbnRzIGFnYWluLlxuICAgICAgZW50cnlQb2ludEluZm8gPSBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKCk7XG4gICAgfVxuXG4gICAgY29uc3Qge2VudHJ5UG9pbnRzLCBpbnZhbGlkRW50cnlQb2ludHMsIGdyYXBofSA9IGVudHJ5UG9pbnRJbmZvO1xuICAgIGxvZ0ludmFsaWRFbnRyeVBvaW50cyhsb2dnZXIsIGludmFsaWRFbnRyeVBvaW50cyk7XG5cbiAgICBjb25zdCB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuICAgIC8vIFRoZSB0YXNrcyBhcmUgcGFydGlhbGx5IG9yZGVyZWQgYnkgdmlydHVlIG9mIHRoZSBlbnRyeS1wb2ludHMgYmVpbmcgcGFydGlhbGx5IG9yZGVyZWQgdG9vLlxuICAgIGNvbnN0IHRhc2tzOiBQYXJ0aWFsbHlPcmRlcmVkVGFza3MgPSBbXSBhcyBhbnk7XG5cbiAgICBmb3IgKGNvbnN0IGVudHJ5UG9pbnQgb2YgZW50cnlQb2ludHMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICAgIGNvbnN0IGhhc1Byb2Nlc3NlZFR5cGluZ3MgPSBoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCAndHlwaW5ncycpO1xuICAgICAgY29uc3Qge3Byb3BlcnRpZXNUb1Byb2Nlc3MsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwfSA9XG4gICAgICAgICAgZ2V0UHJvcGVydGllc1RvUHJvY2VzcyhwYWNrYWdlSnNvbiwgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKTtcbiAgICAgIGxldCBwcm9jZXNzRHRzID0gIWhhc1Byb2Nlc3NlZFR5cGluZ3M7XG5cbiAgICAgIGlmIChwcm9wZXJ0aWVzVG9Qcm9jZXNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBUaGlzIGVudHJ5LXBvaW50IGlzIHVucHJvY2Vzc2FibGUgKGkuZS4gdGhlcmUgaXMgbm8gZm9ybWF0IHByb3BlcnR5IHRoYXQgaXMgb2YgaW50ZXJlc3RcbiAgICAgICAgLy8gYW5kIGNhbiBiZSBwcm9jZXNzZWQpLiBUaGlzIHdpbGwgcmVzdWx0IGluIGFuIGVycm9yLCBidXQgY29udGludWUgbG9vcGluZyBvdmVyXG4gICAgICAgIC8vIGVudHJ5LXBvaW50cyBpbiBvcmRlciB0byBjb2xsZWN0IGFsbCB1bnByb2Nlc3NhYmxlIG9uZXMgYW5kIGRpc3BsYXkgYSBtb3JlIGluZm9ybWF0aXZlXG4gICAgICAgIC8vIGVycm9yLlxuICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLnB1c2goZW50cnlQb2ludC5wYXRoKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybWF0UHJvcGVydHkgb2YgcHJvcGVydGllc1RvUHJvY2Vzcykge1xuICAgICAgICBpZiAoaGFzQmVlblByb2Nlc3NlZChlbnRyeVBvaW50LnBhY2thZ2VKc29uLCBmb3JtYXRQcm9wZXJ0eSkpIHtcbiAgICAgICAgICAvLyBUaGUgZm9ybWF0LXBhdGggd2hpY2ggdGhlIHByb3BlcnR5IG1hcHMgdG8gaXMgYWxyZWFkeSBwcm9jZXNzZWQgLSBub3RoaW5nIHRvIGRvLlxuICAgICAgICAgIGxvZ2dlci5kZWJ1ZyhgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXRQcm9wZXJ0eX0gKGFscmVhZHkgY29tcGlsZWQpLmApO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkID0gZXF1aXZhbGVudFByb3BlcnRpZXNNYXAuZ2V0KGZvcm1hdFByb3BlcnR5KSE7XG4gICAgICAgIHRhc2tzLnB1c2goe2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9KTtcblxuICAgICAgICAvLyBPbmx5IHByb2Nlc3MgdHlwaW5ncyBmb3IgdGhlIGZpcnN0IHByb3BlcnR5IChpZiBub3QgYWxyZWFkeSBwcm9jZXNzZWQpLlxuICAgICAgICBwcm9jZXNzRHRzID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGVudHJ5LXBvaW50cyBmb3Igd2hpY2ggd2UgY291bGQgbm90IHByb2Nlc3MgYW55IGZvcm1hdCBhdCBhbGwuXG4gICAgaWYgKHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdVbmFibGUgdG8gcHJvY2VzcyBhbnkgZm9ybWF0cyBmb3IgdGhlIGZvbGxvd2luZyBlbnRyeS1wb2ludHMgKHRyaWVkICcgK1xuICAgICAgICAgIGAke3Byb3BlcnRpZXNUb0NvbnNpZGVyLmpvaW4oJywgJyl9KTogYCArXG4gICAgICAgICAgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5tYXAocGF0aCA9PiBgXFxuICAtICR7cGF0aH1gKS5qb2luKCcnKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMCkgLyAxMDtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgIGBBbmFseXplZCAke2VudHJ5UG9pbnRzLmxlbmd0aH0gZW50cnktcG9pbnRzIGluICR7ZHVyYXRpb259cy4gYCArXG4gICAgICAgIGAoVG90YWwgdGFza3M6ICR7dGFza3MubGVuZ3RofSlgKTtcblxuICAgIHJldHVybiBnZXRUYXNrUXVldWUobG9nZ2VyLCBpblBhcmFsbGVsLCB0YXNrcywgZ3JhcGgpO1xuICB9O1xuXG4gIC8vIFRoZSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgdGhlIGBjb21waWxlKClgIGZ1bmN0aW9uLlxuICBjb25zdCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbiA9IG9uVGFza0NvbXBsZXRlZCA9PiB7XG4gICAgY29uc3QgZmlsZVdyaXRlciA9IGdldEZpbGVXcml0ZXIoXG4gICAgICAgIGZpbGVTeXN0ZW0sIGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCk7XG4gICAgY29uc3Qge1RyYW5zZm9ybWVyfSA9IHJlcXVpcmUoJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInKTtcbiAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmaWxlU3lzdGVtLCBsb2dnZXIsIHRzQ29uZmlnKTtcblxuICAgIHJldHVybiAodGFzazogVGFzaykgPT4ge1xuICAgICAgY29uc3Qge2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9ID0gdGFzaztcblxuICAgICAgY29uc3QgaXNDb3JlID0gZW50cnlQb2ludC5uYW1lID09PSAnQGFuZ3VsYXIvY29yZSc7ICAvLyBBcmUgd2UgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmU/XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bZm9ybWF0UHJvcGVydHldO1xuICAgICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQcm9wZXJ0eSk7XG5cbiAgICAgIC8vIEFsbCBwcm9wZXJ0aWVzIGxpc3RlZCBpbiBgcHJvcGVydGllc1RvUHJvY2Vzc2AgYXJlIGd1YXJhbnRlZWQgdG8gcG9pbnQgdG8gYSBmb3JtYXQtcGF0aFxuICAgICAgLy8gKGkuZS4gdGhleSBhcmUgZGVmaW5lZCBpbiBgZW50cnlQb2ludC5wYWNrYWdlSnNvbmApLiBGdXJ0aGVybW9yZSwgdGhleSBhcmUgYWxzbyBndWFyYW50ZWVkXG4gICAgICAvLyB0byBiZSBhbW9uZyBgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTYC5cbiAgICAgIC8vIEJhc2VkIG9uIHRoZSBhYm92ZSwgYGZvcm1hdFBhdGhgIHNob3VsZCBhbHdheXMgYmUgZGVmaW5lZCBhbmQgYGdldEVudHJ5UG9pbnRGb3JtYXQoKWBcbiAgICAgIC8vIHNob3VsZCBhbHdheXMgcmV0dXJuIGEgZm9ybWF0IGhlcmUgKGFuZCBub3QgYHVuZGVmaW5lZGApLlxuICAgICAgaWYgKCFmb3JtYXRQYXRoIHx8ICFmb3JtYXQpIHtcbiAgICAgICAgLy8gVGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgSW52YXJpYW50IHZpb2xhdGVkOiBObyBmb3JtYXQtcGF0aCBvciBmb3JtYXQgZm9yICR7ZW50cnlQb2ludC5wYXRofSA6IGAgK1xuICAgICAgICAgICAgYCR7Zm9ybWF0UHJvcGVydHl9IChmb3JtYXRQYXRoOiAke2Zvcm1hdFBhdGh9IHwgZm9ybWF0OiAke2Zvcm1hdH0pYCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGJ1bmRsZSA9IG1ha2VFbnRyeVBvaW50QnVuZGxlKFxuICAgICAgICAgIGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIGZvcm1hdFBhdGgsIGlzQ29yZSwgZm9ybWF0LCBwcm9jZXNzRHRzLCBwYXRoTWFwcGluZ3MsIHRydWUsXG4gICAgICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCk7XG5cbiAgICAgIGxvZ2dlci5pbmZvKGBDb21waWxpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXRQcm9wZXJ0eX0gYXMgJHtmb3JtYXR9YCk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybShidW5kbGUpO1xuICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIGlmIChyZXN1bHQuZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGxvZ2dlci53YXJuKHJlcGxhY2VUc1dpdGhOZ0luRXJyb3JzKFxuICAgICAgICAgICAgICB0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQocmVzdWx0LmRpYWdub3N0aWNzLCBidW5kbGUuc3JjLmhvc3QpKSk7XG4gICAgICAgIH1cbiAgICAgICAgZmlsZVdyaXRlci53cml0ZUJ1bmRsZShidW5kbGUsIHJlc3VsdC50cmFuc2Zvcm1lZEZpbGVzLCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQpO1xuXG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgICBTdWNjZXNzZnVsbHkgY29tcGlsZWQgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXRQcm9wZXJ0eX1gKTtcblxuICAgICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZCwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBlcnJvcnMgPSByZXBsYWNlVHNXaXRoTmdJbkVycm9ycyhcbiAgICAgICAgICAgIHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChyZXN1bHQuZGlhZ25vc3RpY3MsIGJ1bmRsZS5zcmMuaG9zdCkpO1xuICAgICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLkZhaWxlZCwgYGNvbXBpbGF0aW9uIGVycm9yczpcXG4ke2Vycm9yc31gKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIFRoZSBleGVjdXRvciBmb3IgYWN0dWFsbHkgcGxhbm5pbmcgYW5kIGdldHRpbmcgdGhlIHdvcmsgZG9uZS5cbiAgY29uc3QgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrID1cbiAgICAgIGdldENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayhwa2dKc29uVXBkYXRlciwgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQsIGxvZ2dlciwgZmlsZVN5c3RlbSk7XG4gIGNvbnN0IGV4ZWN1dG9yID0gZ2V0RXhlY3V0b3IoXG4gICAgICBhc3luYywgaW5QYXJhbGxlbCwgbG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgZmlsZVN5c3RlbSwgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcblxuICByZXR1cm4gZXhlY3V0b3IuZXhlY3V0ZShhbmFseXplRW50cnlQb2ludHMsIGNyZWF0ZUNvbXBpbGVGbik7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllczogc3RyaW5nW10pOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10ge1xuICAvLyBTaG9ydC1jaXJjdWl0IHRoZSBjYXNlIHdoZXJlIGBwcm9wZXJ0aWVzYCBoYXMgZmFsbGVuIGJhY2sgdG8gdGhlIGRlZmF1bHQgdmFsdWU6XG4gIC8vIGBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVNgXG4gIGlmIChwcm9wZXJ0aWVzID09PSBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHJldHVybiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVM7XG5cbiAgY29uc3Qgc3VwcG9ydGVkUHJvcGVydGllczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID0gW107XG5cbiAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXMgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdKSB7XG4gICAgaWYgKFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUy5pbmRleE9mKHByb3ApICE9PSAtMSkge1xuICAgICAgc3VwcG9ydGVkUHJvcGVydGllcy5wdXNoKHByb3ApO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzdXBwb3J0ZWRQcm9wZXJ0aWVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYE5vIHN1cHBvcnRlZCBmb3JtYXQgcHJvcGVydHkgdG8gY29uc2lkZXIgYW1vbmcgWyR7cHJvcGVydGllcy5qb2luKCcsICcpfV0uIGAgK1xuICAgICAgICBgU3VwcG9ydGVkIHByb3BlcnRpZXM6ICR7U1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICByZXR1cm4gc3VwcG9ydGVkUHJvcGVydGllcztcbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUpzb25VcGRhdGVyKGluUGFyYWxsZWw6IGJvb2xlYW4sIGZzOiBGaWxlU3lzdGVtKTogUGFja2FnZUpzb25VcGRhdGVyIHtcbiAgY29uc3QgZGlyZWN0UGtnSnNvblVwZGF0ZXIgPSBuZXcgRGlyZWN0UGFja2FnZUpzb25VcGRhdGVyKGZzKTtcbiAgcmV0dXJuIGluUGFyYWxsZWwgPyBuZXcgQ2x1c3RlclBhY2thZ2VKc29uVXBkYXRlcihkaXJlY3RQa2dKc29uVXBkYXRlcikgOiBkaXJlY3RQa2dKc29uVXBkYXRlcjtcbn1cblxuZnVuY3Rpb24gZ2V0RmlsZVdyaXRlcihcbiAgICBmczogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsXG4gICAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM6IGJvb2xlYW4sIGVycm9yT25GYWlsZWRFbnRyeVBvaW50OiBib29sZWFuKTogRmlsZVdyaXRlciB7XG4gIHJldHVybiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/XG4gICAgICBuZXcgTmV3RW50cnlQb2ludEZpbGVXcml0ZXIoZnMsIGxvZ2dlciwgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQsIHBrZ0pzb25VcGRhdGVyKSA6XG4gICAgICBuZXcgSW5QbGFjZUZpbGVXcml0ZXIoZnMsIGxvZ2dlciwgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQpO1xufVxuXG5mdW5jdGlvbiBnZXRUYXNrUXVldWUoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIGluUGFyYWxsZWw6IGJvb2xlYW4sIHRhc2tzOiBQYXJ0aWFsbHlPcmRlcmVkVGFza3MsXG4gICAgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+KTogVGFza1F1ZXVlIHtcbiAgY29uc3QgZGVwZW5kZW5jaWVzID0gY29tcHV0ZVRhc2tEZXBlbmRlbmNpZXModGFza3MsIGdyYXBoKTtcbiAgcmV0dXJuIGluUGFyYWxsZWwgPyBuZXcgUGFyYWxsZWxUYXNrUXVldWUobG9nZ2VyLCB0YXNrcywgZGVwZW5kZW5jaWVzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgbmV3IFNlcmlhbFRhc2tRdWV1ZShsb2dnZXIsIHRhc2tzLCBkZXBlbmRlbmNpZXMpO1xufVxuXG5mdW5jdGlvbiBnZXRDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2soXG4gICAgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQ6IGJvb2xlYW4sIGxvZ2dlcjogTG9nZ2VyLFxuICAgIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0pOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2sge1xuICByZXR1cm4gdGFza1F1ZXVlID0+IGNvbXBvc2VUYXNrQ29tcGxldGVkQ2FsbGJhY2tzKHtcbiAgICAgICAgICAgW1Rhc2tQcm9jZXNzaW5nT3V0Y29tZS5Qcm9jZXNzZWRdOiBjcmVhdGVNYXJrQXNQcm9jZXNzZWRIYW5kbGVyKHBrZ0pzb25VcGRhdGVyKSxcbiAgICAgICAgICAgW1Rhc2tQcm9jZXNzaW5nT3V0Y29tZS5GYWlsZWRdOlxuICAgICAgICAgICAgICAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQgPyBjcmVhdGVUaHJvd0Vycm9ySGFuZGxlcihmaWxlU3lzdGVtKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUxvZ0Vycm9ySGFuZGxlcihsb2dnZXIsIGZpbGVTeXN0ZW0sIHRhc2tRdWV1ZSksXG4gICAgICAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0RXhlY3V0b3IoXG4gICAgYXN5bmM6IGJvb2xlYW4sIGluUGFyYWxsZWw6IGJvb2xlYW4sIGxvZ2dlcjogTG9nZ2VyLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLFxuICAgIGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0sIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjazogQ3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTogRXhlY3V0b3Ige1xuICBjb25zdCBsb2NrRmlsZSA9IG5ldyBMb2NrRmlsZVdpdGhDaGlsZFByb2Nlc3MoZmlsZVN5c3RlbSwgbG9nZ2VyKTtcbiAgaWYgKGFzeW5jKSB7XG4gICAgLy8gRXhlY3V0ZSBhc3luY2hyb25vdXNseSAoZWl0aGVyIHNlcmlhbGx5IG9yIGluIHBhcmFsbGVsKVxuICAgIGNvbnN0IGxvY2tlciA9IG5ldyBBc3luY0xvY2tlcihsb2NrRmlsZSwgbG9nZ2VyLCA1MDAsIDUwKTtcbiAgICBpZiAoaW5QYXJhbGxlbCkge1xuICAgICAgLy8gRXhlY3V0ZSBpbiBwYXJhbGxlbC4gVXNlIHVwIHRvIDggQ1BVIGNvcmVzIGZvciB3b3JrZXJzLCBhbHdheXMgcmVzZXJ2aW5nIG9uZSBmb3IgbWFzdGVyLlxuICAgICAgY29uc3Qgd29ya2VyQ291bnQgPSBNYXRoLm1pbig4LCBvcy5jcHVzKCkubGVuZ3RoIC0gMSk7XG4gICAgICByZXR1cm4gbmV3IENsdXN0ZXJFeGVjdXRvcihcbiAgICAgICAgICB3b3JrZXJDb3VudCwgbG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgbG9ja2VyLCBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFeGVjdXRlIHNlcmlhbGx5LCBvbiBhIHNpbmdsZSB0aHJlYWQgKGFzeW5jKS5cbiAgICAgIHJldHVybiBuZXcgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yQXN5bmMobG9nZ2VyLCBsb2NrZXIsIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIEV4ZWN1dGUgc2VyaWFsbHksIG9uIGEgc2luZ2xlIHRocmVhZCAoc3luYykuXG4gICAgcmV0dXJuIG5ldyBTaW5nbGVQcm9jZXNzRXhlY3V0b3JTeW5jKFxuICAgICAgICBsb2dnZXIsIG5ldyBTeW5jTG9ja2VyKGxvY2tGaWxlKSwgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREZXBlbmRlbmN5UmVzb2x2ZXIoXG4gICAgZmlsZVN5c3RlbTogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3N8dW5kZWZpbmVkKTogRGVwZW5kZW5jeVJlc29sdmVyIHtcbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzKTtcbiAgY29uc3QgZXNtRGVwZW5kZW5jeUhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3QgPSBuZXcgQ29tbW9uSnNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGR0c0RlcGVuZGVuY3lIb3N0ID0gbmV3IER0c0RlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIHBhdGhNYXBwaW5ncyk7XG4gIHJldHVybiBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKFxuICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBjb25maWcsIHtcbiAgICAgICAgZXNtNTogZXNtRGVwZW5kZW5jeUhvc3QsXG4gICAgICAgIGVzbTIwMTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgICB1bWQ6IHVtZERlcGVuZGVuY3lIb3N0LFxuICAgICAgICBjb21tb25qczogY29tbW9uSnNEZXBlbmRlbmN5SG9zdFxuICAgICAgfSxcbiAgICAgIGR0c0RlcGVuZGVuY3lIb3N0KTtcbn1cblxuZnVuY3Rpb24gZ2V0RW50cnlQb2ludEZpbmRlcihcbiAgICBmczogRmlsZVN5c3RlbSwgbG9nZ2VyOiBMb2dnZXIsIHJlc29sdmVyOiBEZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sXG4gICAgZW50cnlQb2ludE1hbmlmZXN0OiBFbnRyeVBvaW50TWFuaWZlc3QsIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aHxudWxsLFxuICAgIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCk6IEVudHJ5UG9pbnRGaW5kZXIge1xuICBpZiAoYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCAhPT0gbnVsbCkge1xuICAgIHJldHVybiBuZXcgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgICBmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IERpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXIoXG4gICAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGVudHJ5UG9pbnRNYW5pZmVzdCwgYmFzZVBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlcjogTG9nZ2VyLCBpbnZhbGlkRW50cnlQb2ludHM6IEludmFsaWRFbnRyeVBvaW50W10pOiB2b2lkIHtcbiAgaW52YWxpZEVudHJ5UG9pbnRzLmZvckVhY2goaW52YWxpZEVudHJ5UG9pbnQgPT4ge1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYEludmFsaWQgZW50cnktcG9pbnQgJHtpbnZhbGlkRW50cnlQb2ludC5lbnRyeVBvaW50LnBhdGh9LmAsXG4gICAgICAgIGBJdCBpcyBtaXNzaW5nIHJlcXVpcmVkIGRlcGVuZGVuY2llczpcXG5gICtcbiAgICAgICAgICAgIGludmFsaWRFbnRyeVBvaW50Lm1pc3NpbmdEZXBlbmRlbmNpZXMubWFwKGRlcCA9PiBgIC0gJHtkZXB9YCkuam9pbignXFxuJykpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGNvbXB1dGVzIGFuZCByZXR1cm5zIHRoZSBmb2xsb3dpbmc6XG4gKiAtIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYDogQW4gKG9yZGVyZWQpIGxpc3Qgb2YgcHJvcGVydGllcyB0aGF0IGV4aXN0IGFuZCBuZWVkIHRvIGJlIHByb2Nlc3NlZCxcbiAqICAgYmFzZWQgb24gdGhlIHByb3ZpZGVkIGBwcm9wZXJ0aWVzVG9Db25zaWRlcmAsIHRoZSBwcm9wZXJ0aWVzIGluIGBwYWNrYWdlLmpzb25gIGFuZCB0aGVpclxuICogICBjb3JyZXNwb25kaW5nIGZvcm1hdC1wYXRocy4gTk9URTogT25seSBvbmUgcHJvcGVydHkgcGVyIGZvcm1hdC1wYXRoIG5lZWRzIHRvIGJlIHByb2Nlc3NlZC5cbiAqIC0gYGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwYDogQSBtYXBwaW5nIGZyb20gZWFjaCBwcm9wZXJ0eSBpbiBgcHJvcGVydGllc1RvUHJvY2Vzc2AgdG8gdGhlIGxpc3Qgb2ZcbiAqICAgb3RoZXIgZm9ybWF0IHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgdGhhdCBuZWVkIHRvIGJlIG1hcmtlZCBhcyBwcm9jZXNzZWQgYXMgc29vbiBhcyB0aGVcbiAqICAgZm9ybWVyIGhhcyBiZWVuIHByb2Nlc3NlZC5cbiAqL1xuZnVuY3Rpb24gZ2V0UHJvcGVydGllc1RvUHJvY2VzcyhcbiAgICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKToge1xuICBwcm9wZXJ0aWVzVG9Qcm9jZXNzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W107XG4gIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwOiBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPjtcbn0ge1xuICBjb25zdCBmb3JtYXRQYXRoc1RvQ29uc2lkZXIgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBjb25zdCBwcm9wZXJ0aWVzVG9Qcm9jZXNzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IG1hcCB0byB0aGUgc2FtZSBmb3JtYXQtcGF0aCBhcyBhIHByZWNlZGluZyBwcm9wZXJ0eS5cbiAgICBpZiAoZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmhhcyhmb3JtYXRQYXRoKSkgY29udGludWU7XG5cbiAgICAvLyBQcm9jZXNzIHRoaXMgcHJvcGVydHksIGJlY2F1c2UgaXQgaXMgdGhlIGZpcnN0IG9uZSB0byBtYXAgdG8gdGhpcyBmb3JtYXQtcGF0aC5cbiAgICBmb3JtYXRQYXRoc1RvQ29uc2lkZXIuYWRkKGZvcm1hdFBhdGgpO1xuICAgIHByb3BlcnRpZXNUb1Byb2Nlc3MucHVzaChwcm9wKTtcblxuICAgIC8vIElmIHdlIG9ubHkgbmVlZCBvbmUgZm9ybWF0IHByb2Nlc3NlZCwgdGhlcmUgaXMgbm8gbmVlZCB0byBwcm9jZXNzIGFueSBtb3JlIHByb3BlcnRpZXMuXG4gICAgaWYgKCFjb21waWxlQWxsRm9ybWF0cykgYnJlYWs7XG4gIH1cblxuICBjb25zdCBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzOiB7W2Zvcm1hdFBhdGg6IHN0cmluZ106IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXX0gPSB7fTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIG5vdCBkZWZpbmVkIGluIGBwYWNrYWdlLmpzb25gLlxuICAgIGlmICh0eXBlb2YgZm9ybWF0UGF0aCAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBkbyBub3QgbWFwIHRvIGEgZm9ybWF0LXBhdGggdGhhdCB3aWxsIGJlIGNvbnNpZGVyZWQuXG4gICAgaWYgKCFmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIEFkZCB0aGlzIHByb3BlcnR5IHRvIHRoZSBtYXAuXG4gICAgY29uc3QgbGlzdCA9IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF0gfHwgKGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF0gPSBbXSk7XG4gICAgbGlzdC5wdXNoKHByb3ApO1xuICB9XG5cbiAgY29uc3QgZXF1aXZhbGVudFByb3BlcnRpZXNNYXAgPSBuZXcgTWFwPEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXT4oKTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdITtcbiAgICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllcyA9IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF07XG4gICAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXAuc2V0KHByb3AsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzKTtcbiAgfVxuXG4gIHJldHVybiB7cHJvcGVydGllc1RvUHJvY2VzcywgZXF1aXZhbGVudFByb3BlcnRpZXNNYXB9O1xufVxuIl19