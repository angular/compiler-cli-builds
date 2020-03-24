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
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "os", "typescript", "@angular/compiler-cli", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/execution/cluster/executor", "@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater", "@angular/compiler-cli/ngcc/src/execution/single_process_executor", "@angular/compiler-cli/ngcc/src/execution/tasks/completion", "@angular/compiler-cli/ngcc/src/execution/tasks/queues/parallel_task_queue", "@angular/compiler-cli/ngcc/src/execution/tasks/queues/serial_task_queue", "@angular/compiler-cli/ngcc/src/execution/tasks/utils", "@angular/compiler-cli/ngcc/src/locking/async_locker", "@angular/compiler-cli/ngcc/src/locking/lock_file_with_child_process/index", "@angular/compiler-cli/ngcc/src/locking/sync_locker", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/logging/logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/entry_point_manifest", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/cleaning/package_cleaner", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", "@angular/compiler-cli/ngcc/src/writing/package_json_updater"], factory);
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
    var transformer_1 = require("@angular/compiler-cli/ngcc/src/packages/transformer");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUtILHVCQUF5QjtJQUN6QiwrQkFBaUM7SUFFakMsMkNBQXdDO0lBQ3hDLDJFQUFvRTtJQUNwRSwyRUFBc0g7SUFFdEgsaUhBQStFO0lBQy9FLHVHQUF5RjtJQUN6Rix1R0FBcUU7SUFDckUsdUdBQXFFO0lBQ3JFLCtGQUE4RDtJQUM5RCx1R0FBcUU7SUFDckUsNklBQXlHO0lBRXpHLDZIQUEwRjtJQUUxRixzRkFBNkQ7SUFDN0QsOEdBQW1GO0lBQ25GLDRHQUEwRztJQUUxRyx3RkFBeUo7SUFDekosaUhBQStFO0lBQy9FLDZHQUEyRTtJQUMzRSw4RUFBZ0U7SUFDaEUsb0ZBQW1EO0lBQ25ELDBIQUFnRjtJQUNoRixrRkFBaUQ7SUFDakQsd0ZBQXVEO0lBQ3ZELHdFQUFrRDtJQUNsRCxxRkFBeUQ7SUFDekQsdUZBQTJEO0lBQzNELG1GQUFtSjtJQUNuSixpR0FBbUU7SUFDbkUscUdBQW1HO0lBQ25HLG1GQUFtRDtJQUVuRCxtR0FBeUU7SUFFekUsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQUM5RSxvR0FBNEY7SUFtSTVGLFNBQWdCLFFBQVEsQ0FDcEIsRUFJaUU7WUFKaEUsc0JBQVEsRUFBRSw4Q0FBb0IsRUFBRSw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xGLHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFBRSxrQ0FBa0MsRUFBbEMsdURBQWtDLEVBQzVELGNBQXlDLEVBQXpDLHdGQUF5QyxFQUFFLDhCQUFZLEVBQUUsYUFBYSxFQUFiLGtDQUFhLEVBQ3RFLCtCQUErQixFQUEvQixvREFBK0IsRUFBRSx1Q0FBc0MsRUFBdEMsMkRBQXNDLEVBQ3ZFLG9DQUFvQyxFQUFwQyx5REFBb0MsRUFBRSw4QkFBWTtR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c0JBQXNCLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQzdGLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDakI7Ozs7Ozs7OztRQUVELElBQU0sdUJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQW9ELENBQUM7O1lBQzVGLEtBQW1CLElBQUEseUJBQUEsaUJBQUEsb0JBQW9CLENBQUEsMERBQUEsNEZBQUU7Z0JBQXBDLElBQU0sSUFBSSxpQ0FBQTtnQkFDYixJQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFHLENBQUM7Z0JBQ3ZDLElBQU0sb0JBQW9CLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2hFLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsQ0FBQzthQUN6RDs7Ozs7Ozs7O1FBRUQsT0FBTyxFQUFDLG1CQUFtQixxQkFBQSxFQUFFLHVCQUF1Qix5QkFBQSxFQUFDLENBQUM7SUFDeEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0IHtEZXBHcmFwaH0gZnJvbSAnZGVwZW5kZW5jeS1ncmFwaCc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtyZWFkQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vLi4nO1xuaW1wb3J0IHtyZXBsYWNlVHNXaXRoTmdJbkVycm9yc30gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgZ2V0RmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtDb21tb25Kc0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIEludmFsaWRFbnRyeVBvaW50fSBmcm9tICcuL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7RHRzRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2R0c19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtVbWREZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7RW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvaW50ZXJmYWNlJztcbmltcG9ydCB7VGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbiwgQ3JlYXRlQ29tcGlsZUZuLCBFeGVjdXRvcn0gZnJvbSAnLi9leGVjdXRpb24vYXBpJztcbmltcG9ydCB7Q2x1c3RlckV4ZWN1dG9yfSBmcm9tICcuL2V4ZWN1dGlvbi9jbHVzdGVyL2V4ZWN1dG9yJztcbmltcG9ydCB7Q2x1c3RlclBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi9leGVjdXRpb24vY2x1c3Rlci9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge1NpbmdsZVByb2Nlc3NFeGVjdXRvckFzeW5jLCBTaW5nbGVQcm9jZXNzRXhlY3V0b3JTeW5jfSBmcm9tICcuL2V4ZWN1dGlvbi9zaW5nbGVfcHJvY2Vzc19leGVjdXRvcic7XG5pbXBvcnQge0NyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjaywgUGFydGlhbGx5T3JkZXJlZFRhc2tzLCBUYXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUsIFRhc2tRdWV1ZX0gZnJvbSAnLi9leGVjdXRpb24vdGFza3MvYXBpJztcbmltcG9ydCB7Y29tcG9zZVRhc2tDb21wbGV0ZWRDYWxsYmFja3MsIGNyZWF0ZUxvZ0Vycm9ySGFuZGxlciwgY3JlYXRlTWFya0FzUHJvY2Vzc2VkSGFuZGxlciwgY3JlYXRlVGhyb3dFcnJvckhhbmRsZXJ9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tzL2NvbXBsZXRpb24nO1xuaW1wb3J0IHtQYXJhbGxlbFRhc2tRdWV1ZX0gZnJvbSAnLi9leGVjdXRpb24vdGFza3MvcXVldWVzL3BhcmFsbGVsX3Rhc2tfcXVldWUnO1xuaW1wb3J0IHtTZXJpYWxUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tzL3F1ZXVlcy9zZXJpYWxfdGFza19xdWV1ZSc7XG5pbXBvcnQge2NvbXB1dGVUYXNrRGVwZW5kZW5jaWVzfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrcy91dGlscyc7XG5pbXBvcnQge0FzeW5jTG9ja2VyfSBmcm9tICcuL2xvY2tpbmcvYXN5bmNfbG9ja2VyJztcbmltcG9ydCB7TG9ja0ZpbGVXaXRoQ2hpbGRQcm9jZXNzfSBmcm9tICcuL2xvY2tpbmcvbG9ja19maWxlX3dpdGhfY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQge1N5bmNMb2NrZXJ9IGZyb20gJy4vbG9ja2luZy9zeW5jX2xvY2tlcic7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXJ9IGZyb20gJy4vbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5pbXBvcnQge0xvZ0xldmVsLCBMb2dnZXJ9IGZyb20gJy4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtoYXNCZWVuUHJvY2Vzc2VkfSBmcm9tICcuL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9ufSBmcm9tICcuL3BhY2thZ2VzL2NvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50UGFja2FnZUpzb24sIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUywgZ2V0RW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge21ha2VFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0VudHJ5UG9pbnRNYW5pZmVzdCwgSW52YWxpZGF0aW5nRW50cnlQb2ludE1hbmlmZXN0fSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X21hbmlmZXN0JztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtjbGVhbk91dGRhdGVkUGFja2FnZXN9IGZyb20gJy4vd3JpdGluZy9jbGVhbmluZy9wYWNrYWdlX2NsZWFuZXInO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIsIFBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIgZm9yIHN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTeW5jTmdjY09wdGlvbnMge1xuICAvKiogVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlcyB0byBwcm9jZXNzLiAqL1xuICBiYXNlUGF0aDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byB0aGUgcHJpbWFyeSBwYWNrYWdlIHRvIGJlIHByb2Nlc3NlZC4gSWYgbm90IGFic29sdXRlIHRoZW4gaXQgbXVzdCBiZSByZWxhdGl2ZSB0b1xuICAgKiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBBbGwgaXRzIGRlcGVuZGVuY2llcyB3aWxsIG5lZWQgdG8gYmUgcHJvY2Vzc2VkIHRvby5cbiAgICpcbiAgICogSWYgdGhpcyBwcm9wZXJ0eSBpcyBwcm92aWRlZCB0aGVuIGBlcnJvck9uRmFpbGVkRW50cnlQb2ludGAgaXMgZm9yY2VkIHRvIHRydWUuXG4gICAqL1xuICB0YXJnZXRFbnRyeVBvaW50UGF0aD86IHN0cmluZztcblxuICAvKipcbiAgICogV2hpY2ggZW50cnktcG9pbnQgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uIHRvIGNvbnNpZGVyIHdoZW4gcHJvY2Vzc2luZyBhbiBlbnRyeS1wb2ludC5cbiAgICogRWFjaCBwcm9wZXJ0eSBzaG91bGQgaG9sZCBhIHBhdGggdG8gdGhlIHBhcnRpY3VsYXIgYnVuZGxlIGZvcm1hdCBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICAgKiBEZWZhdWx0cyB0byBhbGwgdGhlIHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbi5cbiAgICovXG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcHJvY2VzcyBhbGwgZm9ybWF0cyBzcGVjaWZpZWQgYnkgKGBwcm9wZXJ0aWVzVG9Db25zaWRlcmApICBvciB0byBzdG9wIHByb2Nlc3NpbmdcbiAgICogdGhpcyBlbnRyeS1wb2ludCBhdCB0aGUgZmlyc3QgbWF0Y2hpbmcgZm9ybWF0LiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqL1xuICBjb21waWxlQWxsRm9ybWF0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY3JlYXRlIG5ldyBlbnRyeS1wb2ludHMgYnVuZGxlcyByYXRoZXIgdGhhbiBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgZmlsZXMuXG4gICAqL1xuICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBsb2dnZXIgdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGxvZyBtZXNzYWdlcy5cbiAgICovXG4gIGxvZ2dlcj86IExvZ2dlcjtcblxuICAvKipcbiAgICogUGF0aHMgbWFwcGluZyBjb25maWd1cmF0aW9uIChgcGF0aHNgIGFuZCBgYmFzZVVybGApLCBhcyBmb3VuZCBpbiBgdHMuQ29tcGlsZXJPcHRpb25zYC5cbiAgICogVGhlc2UgYXJlIHVzZWQgdG8gcmVzb2x2ZSBwYXRocyB0byBsb2NhbGx5IGJ1aWx0IEFuZ3VsYXIgbGlicmFyaWVzLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgYHBhdGhNYXBwaW5nc2Agc3BlY2lmaWVkIGhlcmUgdGFrZSBwcmVjZWRlbmNlIG92ZXIgYW55IGBwYXRoTWFwcGluZ3NgIGxvYWRlZCBmcm9tIGFcbiAgICogVFMgY29uZmlnIGZpbGUuXG4gICAqL1xuICBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3M7XG5cbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBmaWxlLXN5c3RlbSBzZXJ2aWNlIHRoYXQgd2lsbCBiZSB1c2VkIGJ5IG5nY2MgZm9yIGFsbCBmaWxlIGludGVyYWN0aW9ucy5cbiAgICovXG4gIGZpbGVTeXN0ZW0/OiBGaWxlU3lzdGVtO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBjb21waWxhdGlvbiBzaG91bGQgcnVuIGFuZCByZXR1cm4gYXN5bmNocm9ub3VzbHkuIEFsbG93aW5nIGFzeW5jaHJvbm91cyBleGVjdXRpb25cbiAgICogbWF5IHNwZWVkIHVwIHRoZSBjb21waWxhdGlvbiBieSB1dGlsaXppbmcgbXVsdGlwbGUgQ1BVIGNvcmVzIChpZiBhdmFpbGFibGUpLlxuICAgKlxuICAgKiBEZWZhdWx0OiBgZmFsc2VgIChpLmUuIHJ1biBzeW5jaHJvbm91c2x5KVxuICAgKi9cbiAgYXN5bmM/OiBmYWxzZTtcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgaW4gb3JkZXIgdG8gdGVybWluYXRlIGltbWVkaWF0ZWx5IHdpdGggYW4gZXJyb3IgY29kZSBpZiBhbiBlbnRyeS1wb2ludCBmYWlscyB0byBiZVxuICAgKiBwcm9jZXNzZWQuXG4gICAqXG4gICAqIElmIGB0YXJnZXRFbnRyeVBvaW50UGF0aGAgaXMgcHJvdmlkZWQgdGhlbiB0aGlzIHByb3BlcnR5IGlzIGFsd2F5cyB0cnVlIGFuZCBjYW5ub3QgYmVcbiAgICogY2hhbmdlZC4gT3RoZXJ3aXNlIHRoZSBkZWZhdWx0IGlzIGZhbHNlLlxuICAgKlxuICAgKiBXaGVuIHNldCB0byBmYWxzZSwgbmdjYyB3aWxsIGNvbnRpbnVlIHRvIHByb2Nlc3MgZW50cnktcG9pbnRzIGFmdGVyIGEgZmFpbHVyZS4gSW4gd2hpY2ggY2FzZSBpdFxuICAgKiB3aWxsIGxvZyBhbiBlcnJvciBhbmQgcmVzdW1lIHByb2Nlc3Npbmcgb3RoZXIgZW50cnktcG9pbnRzLlxuICAgKi9cbiAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBSZW5kZXIgYCRsb2NhbGl6ZWAgbWVzc2FnZXMgd2l0aCBsZWdhY3kgZm9ybWF0IGlkcy5cbiAgICpcbiAgICogVGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgLiBPbmx5IHNldCB0aGlzIHRvIGBmYWxzZWAgaWYgeW91IGRvIG5vdCB3YW50IGxlZ2FjeSBtZXNzYWdlIGlkcyB0b1xuICAgKiBiZSByZW5kZXJlZC4gRm9yIGV4YW1wbGUsIGlmIHlvdSBhcmUgbm90IHVzaW5nIGxlZ2FjeSBtZXNzYWdlIGlkcyBpbiB5b3VyIHRyYW5zbGF0aW9uIGZpbGVzXG4gICAqIEFORCBhcmUgbm90IGRvaW5nIGNvbXBpbGUtdGltZSBpbmxpbmluZyBvZiB0cmFuc2xhdGlvbnMsIGluIHdoaWNoIGNhc2UgdGhlIGV4dHJhIG1lc3NhZ2UgaWRzXG4gICAqIHdvdWxkIGFkZCB1bndhbnRlZCBzaXplIHRvIHRoZSBmaW5hbCBzb3VyY2UgYnVuZGxlLlxuICAgKlxuICAgKiBJdCBpcyBzYWZlIHRvIGxlYXZlIHRoaXMgc2V0IHRvIHRydWUgaWYgeW91IGFyZSBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgYmVjYXVzZSB0aGUgZXh0cmFcbiAgICogbGVnYWN5IG1lc3NhZ2UgaWRzIHdpbGwgYWxsIGJlIHN0cmlwcGVkIGR1cmluZyB0cmFuc2xhdGlvbi5cbiAgICovXG4gIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGludmFsaWRhdGUgYW55IGVudHJ5LXBvaW50IG1hbmlmZXN0IGZpbGUgdGhhdCBpcyBvbiBkaXNrLiBJbnN0ZWFkLCB3YWxrIHRoZVxuICAgKiBkaXJlY3RvcnkgdHJlZSBsb29raW5nIGZvciBlbnRyeS1wb2ludHMsIGFuZCB0aGVuIHdyaXRlIGEgbmV3IGVudHJ5LXBvaW50IG1hbmlmZXN0LCBpZlxuICAgKiBwb3NzaWJsZS5cbiAgICpcbiAgICogRGVmYXVsdDogYGZhbHNlYCAoaS5lLiB0aGUgbWFuaWZlc3Qgd2lsbCBiZSB1c2VkIGlmIGF2YWlsYWJsZSlcbiAgICovXG4gIGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3Q/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBbiBhYnNvbHV0ZSBwYXRoIHRvIGEgVFMgY29uZmlnIGZpbGUgKGUuZy4gYHRzY29uZmlnLmpzb25gKSBvciBhIGRpcmVjdG9yeSBjb250YWluaW5nIG9uZSwgdGhhdFxuICAgKiB3aWxsIGJlIHVzZWQgdG8gY29uZmlndXJlIG1vZHVsZSByZXNvbHV0aW9uIHdpdGggdGhpbmdzIGxpa2UgcGF0aCBtYXBwaW5ncywgaWYgbm90IHNwZWNpZmllZFxuICAgKiBleHBsaWNpdGx5IHZpYSB0aGUgYHBhdGhNYXBwaW5nc2AgcHJvcGVydHkgdG8gYG1haW5OZ2NjYC5cbiAgICpcbiAgICogSWYgYHVuZGVmaW5lZGAsIG5nY2Mgd2lsbCBhdHRlbXB0IHRvIGxvYWQgYSBgdHNjb25maWcuanNvbmAgZmlsZSBmcm9tIHRoZSBkaXJlY3RvcnkgYWJvdmUgdGhlXG4gICAqIGBiYXNlUGF0aGAuXG4gICAqXG4gICAqIElmIGBudWxsYCwgbmdjYyB3aWxsIG5vdCBhdHRlbXB0IHRvIGxvYWQgYW55IFRTIGNvbmZpZyBmaWxlIGF0IGFsbC5cbiAgICovXG4gIHRzQ29uZmlnUGF0aD86IHN0cmluZ3xudWxsO1xufVxuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlciBmb3IgYXN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgQXN5bmNOZ2NjT3B0aW9ucyA9IE9taXQ8U3luY05nY2NPcHRpb25zLCAnYXN5bmMnPiYge2FzeW5jOiB0cnVlfTtcblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCB0eXBlIE5nY2NPcHRpb25zID0gQXN5bmNOZ2NjT3B0aW9ucyB8IFN5bmNOZ2NjT3B0aW9ucztcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGludG8gbmdjYyAoYU5HdWxhciBDb21wYXRpYmlsaXR5IENvbXBpbGVyKS5cbiAqXG4gKiBZb3UgY2FuIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBwcm9jZXNzIG9uZSBvciBtb3JlIG5wbSBwYWNrYWdlcywgdG8gZW5zdXJlXG4gKiB0aGF0IHRoZXkgYXJlIGNvbXBhdGlibGUgd2l0aCB0aGUgaXZ5IGNvbXBpbGVyIChuZ3RzYykuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgVGhlIG9wdGlvbnMgdGVsbGluZyBuZ2NjIHdoYXQgdG8gY29tcGlsZSBhbmQgaG93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogQXN5bmNOZ2NjT3B0aW9ucyk6IFByb21pc2U8dm9pZD47XG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogU3luY05nY2NPcHRpb25zKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhcbiAgICB7YmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgICAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSwgcGF0aE1hcHBpbmdzLCBhc3luYyA9IGZhbHNlLFxuICAgICBlcnJvck9uRmFpbGVkRW50cnlQb2ludCA9IGZhbHNlLCBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID0gdHJ1ZSxcbiAgICAgaW52YWxpZGF0ZUVudHJ5UG9pbnRNYW5pZmVzdCA9IGZhbHNlLCB0c0NvbmZpZ1BhdGh9OiBOZ2NjT3B0aW9ucyk6IHZvaWR8UHJvbWlzZTx2b2lkPiB7XG4gIGlmICghIXRhcmdldEVudHJ5UG9pbnRQYXRoKSB7XG4gICAgLy8gdGFyZ2V0RW50cnlQb2ludFBhdGggZm9yY2VzIHVzIHRvIGVycm9yIGlmIGFuIGVudHJ5LXBvaW50IGZhaWxzLlxuICAgIGVycm9yT25GYWlsZWRFbnRyeVBvaW50ID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIEV4ZWN1dGUgaW4gcGFyYWxsZWwsIGlmIGFzeW5jIGV4ZWN1dGlvbiBpcyBhY2NlcHRhYmxlIGFuZCB0aGVyZSBhcmUgbW9yZSB0aGFuIDEgQ1BVIGNvcmVzLlxuICBjb25zdCBpblBhcmFsbGVsID0gYXN5bmMgJiYgKG9zLmNwdXMoKS5sZW5ndGggPiAxKTtcblxuICAvLyBJbnN0YW50aWF0ZSBjb21tb24gdXRpbGl0aWVzIHRoYXQgYXJlIGFsd2F5cyB1c2VkLlxuICAvLyBOT1RFOiBBdm9pZCBlYWdlcmx5IGluc3RhbnRpYXRpbmcgYW55dGhpbmcgdGhhdCBtaWdodCBub3QgYmUgdXNlZCB3aGVuIHJ1bm5pbmcgc3luYy9hc3luYyBvciBpblxuICAvLyAgICAgICBtYXN0ZXIvd29ya2VyIHByb2Nlc3MuXG4gIGNvbnN0IGZpbGVTeXN0ZW0gPSBnZXRGaWxlU3lzdGVtKCk7XG4gIGNvbnN0IGFic0Jhc2VQYXRoID0gYWJzb2x1dGVGcm9tKGJhc2VQYXRoKTtcbiAgY29uc3QgcHJvamVjdFBhdGggPSBkaXJuYW1lKGFic0Jhc2VQYXRoKTtcbiAgY29uc3QgY29uZmlnID0gbmV3IE5nY2NDb25maWd1cmF0aW9uKGZpbGVTeXN0ZW0sIHByb2plY3RQYXRoKTtcbiAgY29uc3QgdHNDb25maWcgPSB0c0NvbmZpZ1BhdGggIT09IG51bGwgPyByZWFkQ29uZmlndXJhdGlvbih0c0NvbmZpZ1BhdGggfHwgcHJvamVjdFBhdGgpIDogbnVsbDtcblxuICAvLyBJZiBgcGF0aE1hcHBpbmdzYCBpcyBub3QgcHJvdmlkZWQgZGlyZWN0bHksIHRoZW4gdHJ5IGdldHRpbmcgaXQgZnJvbSBgdHNDb25maWdgLCBpZiBhdmFpbGFibGUuXG4gIGlmICh0c0NvbmZpZyAhPT0gbnVsbCAmJiBwYXRoTWFwcGluZ3MgPT09IHVuZGVmaW5lZCAmJiB0c0NvbmZpZy5vcHRpb25zLmJhc2VVcmwgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgdHNDb25maWcub3B0aW9ucy5wYXRocykge1xuICAgIHBhdGhNYXBwaW5ncyA9IHtcbiAgICAgIGJhc2VVcmw6IHJlc29sdmUocHJvamVjdFBhdGgsIHRzQ29uZmlnLm9wdGlvbnMuYmFzZVVybCksXG4gICAgICBwYXRoczogdHNDb25maWcub3B0aW9ucy5wYXRocyxcbiAgICB9O1xuICB9XG5cbiAgY29uc3QgZGVwZW5kZW5jeVJlc29sdmVyID0gZ2V0RGVwZW5kZW5jeVJlc29sdmVyKGZpbGVTeXN0ZW0sIGxvZ2dlciwgY29uZmlnLCBwYXRoTWFwcGluZ3MpO1xuICBjb25zdCBlbnRyeVBvaW50TWFuaWZlc3QgPSBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0ID9cbiAgICAgIG5ldyBJbnZhbGlkYXRpbmdFbnRyeVBvaW50TWFuaWZlc3QoZmlsZVN5c3RlbSwgY29uZmlnLCBsb2dnZXIpIDpcbiAgICAgIG5ldyBFbnRyeVBvaW50TWFuaWZlc3QoZmlsZVN5c3RlbSwgY29uZmlnLCBsb2dnZXIpO1xuXG4gIC8vIEJhaWwgb3V0IGVhcmx5IGlmIHRoZSB3b3JrIGlzIGFscmVhZHkgZG9uZS5cbiAgY29uc3Qgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIgPSBlbnN1cmVTdXBwb3J0ZWRQcm9wZXJ0aWVzKHByb3BlcnRpZXNUb0NvbnNpZGVyKTtcbiAgY29uc3QgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCA9XG4gICAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCAhPT0gdW5kZWZpbmVkID8gcmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpIDogbnVsbDtcbiAgY29uc3QgZmluZGVyID0gZ2V0RW50cnlQb2ludEZpbmRlcihcbiAgICAgIGZpbGVTeXN0ZW0sIGxvZ2dlciwgZGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWcsIGVudHJ5UG9pbnRNYW5pZmVzdCwgYWJzQmFzZVBhdGgsXG4gICAgICBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICBpZiAoZmluZGVyIGluc3RhbmNlb2YgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyICYmXG4gICAgICAhZmluZGVyLnRhcmdldE5lZWRzUHJvY2Vzc2luZ09yQ2xlYW5pbmcoc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnVGhlIHRhcmdldCBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCcpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIE5PVEU6IFRvIGF2b2lkIGZpbGUgY29ycnVwdGlvbiwgZW5zdXJlIHRoYXQgZWFjaCBgbmdjY2AgaW52b2NhdGlvbiBvbmx5IGNyZWF0ZXMgX29uZV8gaW5zdGFuY2VcbiAgLy8gICAgICAgb2YgYFBhY2thZ2VKc29uVXBkYXRlcmAgdGhhdCBhY3R1YWxseSB3cml0ZXMgdG8gZGlzayAoYWNyb3NzIGFsbCBwcm9jZXNzZXMpLlxuICAvLyAgICAgICBUaGlzIGlzIGhhcmQgdG8gZW5mb3JjZSBhdXRvbWF0aWNhbGx5LCB3aGVuIHJ1bm5pbmcgb24gbXVsdGlwbGUgcHJvY2Vzc2VzLCBzbyBuZWVkcyB0byBiZVxuICAvLyAgICAgICBlbmZvcmNlZCBtYW51YWxseS5cbiAgY29uc3QgcGtnSnNvblVwZGF0ZXIgPSBnZXRQYWNrYWdlSnNvblVwZGF0ZXIoaW5QYXJhbGxlbCwgZmlsZVN5c3RlbSk7XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBwZXJmb3JtaW5nIHRoZSBhbmFseXNpcy5cbiAgY29uc3QgYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbiA9ICgpID0+IHtcbiAgICBsb2dnZXIuZGVidWcoJ0FuYWx5emluZyBlbnRyeS1wb2ludHMuLi4nKTtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgbGV0IGVudHJ5UG9pbnRJbmZvID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xuICAgIGNvbnN0IGNsZWFuZWQgPSBjbGVhbk91dGRhdGVkUGFja2FnZXMoZmlsZVN5c3RlbSwgZW50cnlQb2ludEluZm8uZW50cnlQb2ludHMpO1xuICAgIGlmIChjbGVhbmVkKSB7XG4gICAgICAvLyBJZiB3ZSBoYWQgdG8gY2xlYW4gdXAgb25lIG9yIG1vcmUgcGFja2FnZXMgdGhlbiB3ZSBtdXN0IHJlYWQgaW4gdGhlIGVudHJ5LXBvaW50cyBhZ2Fpbi5cbiAgICAgIGVudHJ5UG9pbnRJbmZvID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xuICAgIH1cblxuICAgIGNvbnN0IHtlbnRyeVBvaW50cywgaW52YWxpZEVudHJ5UG9pbnRzLCBncmFwaH0gPSBlbnRyeVBvaW50SW5mbztcbiAgICBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyLCBpbnZhbGlkRW50cnlQb2ludHMpO1xuXG4gICAgY29uc3QgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBUaGUgdGFza3MgYXJlIHBhcnRpYWxseSBvcmRlcmVkIGJ5IHZpcnR1ZSBvZiB0aGUgZW50cnktcG9pbnRzIGJlaW5nIHBhcnRpYWxseSBvcmRlcmVkIHRvby5cbiAgICBjb25zdCB0YXNrczogUGFydGlhbGx5T3JkZXJlZFRhc2tzID0gW10gYXMgYW55O1xuXG4gICAgZm9yIChjb25zdCBlbnRyeVBvaW50IG9mIGVudHJ5UG9pbnRzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCBoYXNQcm9jZXNzZWRUeXBpbmdzID0gaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgJ3R5cGluZ3MnKTtcbiAgICAgIGNvbnN0IHtwcm9wZXJ0aWVzVG9Qcm9jZXNzLCBlcXVpdmFsZW50UHJvcGVydGllc01hcH0gPVxuICAgICAgICAgIGdldFByb3BlcnRpZXNUb1Byb2Nlc3MocGFja2FnZUpzb24sIHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cyk7XG4gICAgICBsZXQgcHJvY2Vzc0R0cyA9ICFoYXNQcm9jZXNzZWRUeXBpbmdzO1xuXG4gICAgICBpZiAocHJvcGVydGllc1RvUHJvY2Vzcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8gVGhpcyBlbnRyeS1wb2ludCBpcyB1bnByb2Nlc3NhYmxlIChpLmUuIHRoZXJlIGlzIG5vIGZvcm1hdCBwcm9wZXJ0eSB0aGF0IGlzIG9mIGludGVyZXN0XG4gICAgICAgIC8vIGFuZCBjYW4gYmUgcHJvY2Vzc2VkKS4gVGhpcyB3aWxsIHJlc3VsdCBpbiBhbiBlcnJvciwgYnV0IGNvbnRpbnVlIGxvb3Bpbmcgb3ZlclxuICAgICAgICAvLyBlbnRyeS1wb2ludHMgaW4gb3JkZXIgdG8gY29sbGVjdCBhbGwgdW5wcm9jZXNzYWJsZSBvbmVzIGFuZCBkaXNwbGF5IGEgbW9yZSBpbmZvcm1hdGl2ZVxuICAgICAgICAvLyBlcnJvci5cbiAgICAgICAgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5wdXNoKGVudHJ5UG9pbnQucGF0aCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IGZvcm1hdFByb3BlcnR5IG9mIHByb3BlcnRpZXNUb1Byb2Nlc3MpIHtcbiAgICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludC5wYWNrYWdlSnNvbiwgZm9ybWF0UHJvcGVydHkpKSB7XG4gICAgICAgICAgLy8gVGhlIGZvcm1hdC1wYXRoIHdoaWNoIHRoZSBwcm9wZXJ0eSBtYXBzIHRvIGlzIGFscmVhZHkgcHJvY2Vzc2VkIC0gbm90aGluZyB0byBkby5cbiAgICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCA9IGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwLmdldChmb3JtYXRQcm9wZXJ0eSkgITtcbiAgICAgICAgdGFza3MucHVzaCh7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30pO1xuXG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyB0eXBpbmdzIGZvciB0aGUgZmlyc3QgcHJvcGVydHkgKGlmIG5vdCBhbHJlYWR5IHByb2Nlc3NlZCkuXG4gICAgICAgIHByb2Nlc3NEdHMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgZW50cnktcG9pbnRzIGZvciB3aGljaCB3ZSBjb3VsZCBub3QgcHJvY2VzcyBhbnkgZm9ybWF0IGF0IGFsbC5cbiAgICBpZiAodW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1VuYWJsZSB0byBwcm9jZXNzIGFueSBmb3JtYXRzIGZvciB0aGUgZm9sbG93aW5nIGVudHJ5LXBvaW50cyAodHJpZWQgJyArXG4gICAgICAgICAgYCR7cHJvcGVydGllc1RvQ29uc2lkZXIuam9pbignLCAnKX0pOiBgICtcbiAgICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLm1hcChwYXRoID0+IGBcXG4gIC0gJHtwYXRofWApLmpvaW4oJycpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwKSAvIDEwO1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYEFuYWx5emVkICR7ZW50cnlQb2ludHMubGVuZ3RofSBlbnRyeS1wb2ludHMgaW4gJHtkdXJhdGlvbn1zLiBgICtcbiAgICAgICAgYChUb3RhbCB0YXNrczogJHt0YXNrcy5sZW5ndGh9KWApO1xuXG4gICAgcmV0dXJuIGdldFRhc2tRdWV1ZShsb2dnZXIsIGluUGFyYWxsZWwsIHRhc2tzLCBncmFwaCk7XG4gIH07XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBjcmVhdGluZyB0aGUgYGNvbXBpbGUoKWAgZnVuY3Rpb24uXG4gIGNvbnN0IGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuID0gb25UYXNrQ29tcGxldGVkID0+IHtcbiAgICBjb25zdCBmaWxlV3JpdGVyID0gZ2V0RmlsZVdyaXRlcihcbiAgICAgICAgZmlsZVN5c3RlbSwgbG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMsIGVycm9yT25GYWlsZWRFbnRyeVBvaW50KTtcbiAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmaWxlU3lzdGVtLCBsb2dnZXIpO1xuXG4gICAgcmV0dXJuICh0YXNrOiBUYXNrKSA9PiB7XG4gICAgICBjb25zdCB7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30gPSB0YXNrO1xuXG4gICAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJzsgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5KTtcblxuICAgICAgLy8gQWxsIHByb3BlcnRpZXMgbGlzdGVkIGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCBhcmUgZ3VhcmFudGVlZCB0byBwb2ludCB0byBhIGZvcm1hdC1wYXRoXG4gICAgICAvLyAoaS5lLiB0aGV5IGFyZSBkZWZpbmVkIGluIGBlbnRyeVBvaW50LnBhY2thZ2VKc29uYCkuIEZ1cnRoZXJtb3JlLCB0aGV5IGFyZSBhbHNvIGd1YXJhbnRlZWRcbiAgICAgIC8vIHRvIGJlIGFtb25nIGBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVNgLlxuICAgICAgLy8gQmFzZWQgb24gdGhlIGFib3ZlLCBgZm9ybWF0UGF0aGAgc2hvdWxkIGFsd2F5cyBiZSBkZWZpbmVkIGFuZCBgZ2V0RW50cnlQb2ludEZvcm1hdCgpYFxuICAgICAgLy8gc2hvdWxkIGFsd2F5cyByZXR1cm4gYSBmb3JtYXQgaGVyZSAoYW5kIG5vdCBgdW5kZWZpbmVkYCkuXG4gICAgICBpZiAoIWZvcm1hdFBhdGggfHwgIWZvcm1hdCkge1xuICAgICAgICAvLyBUaGlzIHNob3VsZCBuZXZlciBoYXBwZW4uXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBJbnZhcmlhbnQgdmlvbGF0ZWQ6IE5vIGZvcm1hdC1wYXRoIG9yIGZvcm1hdCBmb3IgJHtlbnRyeVBvaW50LnBhdGh9IDogYCArXG4gICAgICAgICAgICBgJHtmb3JtYXRQcm9wZXJ0eX0gKGZvcm1hdFBhdGg6ICR7Zm9ybWF0UGF0aH0gfCBmb3JtYXQ6ICR7Zm9ybWF0fSlgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVuZGxlID0gbWFrZUVudHJ5UG9pbnRCdW5kbGUoXG4gICAgICAgICAgZmlsZVN5c3RlbSwgZW50cnlQb2ludCwgZm9ybWF0UGF0aCwgaXNDb3JlLCBmb3JtYXQsIHByb2Nlc3NEdHMsIHBhdGhNYXBwaW5ncywgdHJ1ZSxcbiAgICAgICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0KTtcblxuICAgICAgbG9nZ2VyLmluZm8oYENvbXBpbGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fSBhcyAke2Zvcm1hdH1gKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGJ1bmRsZSk7XG4gICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4ocmVwbGFjZVRzV2l0aE5nSW5FcnJvcnMoXG4gICAgICAgICAgICAgIHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChyZXN1bHQuZGlhZ25vc3RpY3MsIGJ1bmRsZS5zcmMuaG9zdCkpKTtcbiAgICAgICAgfVxuICAgICAgICBmaWxlV3JpdGVyLndyaXRlQnVuZGxlKGJ1bmRsZSwgcmVzdWx0LnRyYW5zZm9ybWVkRmlsZXMsIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCk7XG5cbiAgICAgICAgbG9nZ2VyLmRlYnVnKGAgIFN1Y2Nlc3NmdWxseSBjb21waWxlZCAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fWApO1xuXG4gICAgICAgIG9uVGFza0NvbXBsZXRlZCh0YXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUuUHJvY2Vzc2VkLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVycm9ycyA9IHJlcGxhY2VUc1dpdGhOZ0luRXJyb3JzKFxuICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KSk7XG4gICAgICAgIG9uVGFza0NvbXBsZXRlZCh0YXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUuRmFpbGVkLCBgY29tcGlsYXRpb24gZXJyb3JzOlxcbiR7ZXJyb3JzfWApO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgLy8gVGhlIGV4ZWN1dG9yIGZvciBhY3R1YWxseSBwbGFubmluZyBhbmQgZ2V0dGluZyB0aGUgd29yayBkb25lLlxuICBjb25zdCBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2sgPVxuICAgICAgZ2V0Q3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKHBrZ0pzb25VcGRhdGVyLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCwgbG9nZ2VyLCBmaWxlU3lzdGVtKTtcbiAgY29uc3QgZXhlY3V0b3IgPSBnZXRFeGVjdXRvcihcbiAgICAgIGFzeW5jLCBpblBhcmFsbGVsLCBsb2dnZXIsIHBrZ0pzb25VcGRhdGVyLCBmaWxlU3lzdGVtLCBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuXG4gIHJldHVybiBleGVjdXRvci5leGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlU3VwcG9ydGVkUHJvcGVydGllcyhwcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSB7XG4gIC8vIFNob3J0LWNpcmN1aXQgdGhlIGNhc2Ugd2hlcmUgYHByb3BlcnRpZXNgIGhhcyBmYWxsZW4gYmFjayB0byB0aGUgZGVmYXVsdCB2YWx1ZTpcbiAgLy8gYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2BcbiAgaWYgKHByb3BlcnRpZXMgPT09IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykgcmV0dXJuIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUztcblxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllcyBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5W10pIHtcbiAgICBpZiAoU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmluZGV4T2YocHJvcCkgIT09IC0xKSB7XG4gICAgICBzdXBwb3J0ZWRQcm9wZXJ0aWVzLnB1c2gocHJvcCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN1cHBvcnRlZFByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTm8gc3VwcG9ydGVkIGZvcm1hdCBwcm9wZXJ0eSB0byBjb25zaWRlciBhbW9uZyBbJHtwcm9wZXJ0aWVzLmpvaW4oJywgJyl9XS4gYCArXG4gICAgICAgIGBTdXBwb3J0ZWQgcHJvcGVydGllczogJHtTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIHJldHVybiBzdXBwb3J0ZWRQcm9wZXJ0aWVzO1xufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSnNvblVwZGF0ZXIoaW5QYXJhbGxlbDogYm9vbGVhbiwgZnM6IEZpbGVTeXN0ZW0pOiBQYWNrYWdlSnNvblVwZGF0ZXIge1xuICBjb25zdCBkaXJlY3RQa2dKc29uVXBkYXRlciA9IG5ldyBEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIoZnMpO1xuICByZXR1cm4gaW5QYXJhbGxlbCA/IG5ldyBDbHVzdGVyUGFja2FnZUpzb25VcGRhdGVyKGRpcmVjdFBrZ0pzb25VcGRhdGVyKSA6IGRpcmVjdFBrZ0pzb25VcGRhdGVyO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcixcbiAgICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0czogYm9vbGVhbiwgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQ6IGJvb2xlYW4pOiBGaWxlV3JpdGVyIHtcbiAgcmV0dXJuIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID9cbiAgICAgIG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcihmcywgbG9nZ2VyLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCwgcGtnSnNvblVwZGF0ZXIpIDpcbiAgICAgIG5ldyBJblBsYWNlRmlsZVdyaXRlcihmcywgbG9nZ2VyLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCk7XG59XG5cbmZ1bmN0aW9uIGdldFRhc2tRdWV1ZShcbiAgICBsb2dnZXI6IExvZ2dlciwgaW5QYXJhbGxlbDogYm9vbGVhbiwgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcyxcbiAgICBncmFwaDogRGVwR3JhcGg8RW50cnlQb2ludD4pOiBUYXNrUXVldWUge1xuICBjb25zdCBkZXBlbmRlbmNpZXMgPSBjb21wdXRlVGFza0RlcGVuZGVuY2llcyh0YXNrcywgZ3JhcGgpO1xuICByZXR1cm4gaW5QYXJhbGxlbCA/IG5ldyBQYXJhbGxlbFRhc2tRdWV1ZShsb2dnZXIsIHRhc2tzLCBkZXBlbmRlbmNpZXMpIDpcbiAgICAgICAgICAgICAgICAgICAgICBuZXcgU2VyaWFsVGFza1F1ZXVlKGxvZ2dlciwgdGFza3MsIGRlcGVuZGVuY2llcyk7XG59XG5cbmZ1bmN0aW9uIGdldENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayhcbiAgICBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBlcnJvck9uRmFpbGVkRW50cnlQb2ludDogYm9vbGVhbiwgbG9nZ2VyOiBMb2dnZXIsXG4gICAgZmlsZVN5c3RlbTogRmlsZVN5c3RlbSk6IENyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayB7XG4gIHJldHVybiB0YXNrUXVldWUgPT4gY29tcG9zZVRhc2tDb21wbGV0ZWRDYWxsYmFja3Moe1xuICAgICAgICAgICBbVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZF06IGNyZWF0ZU1hcmtBc1Byb2Nlc3NlZEhhbmRsZXIocGtnSnNvblVwZGF0ZXIpLFxuICAgICAgICAgICBbVGFza1Byb2Nlc3NpbmdPdXRjb21lLkZhaWxlZF06XG4gICAgICAgICAgICAgICBlcnJvck9uRmFpbGVkRW50cnlQb2ludCA/IGNyZWF0ZVRocm93RXJyb3JIYW5kbGVyKGZpbGVTeXN0ZW0pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlTG9nRXJyb3JIYW5kbGVyKGxvZ2dlciwgZmlsZVN5c3RlbSwgdGFza1F1ZXVlKSxcbiAgICAgICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRFeGVjdXRvcihcbiAgICBhc3luYzogYm9vbGVhbiwgaW5QYXJhbGxlbDogYm9vbGVhbiwgbG9nZ2VyOiBMb2dnZXIsIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsXG4gICAgZmlsZVN5c3RlbTogRmlsZVN5c3RlbSwgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrOiBDcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spOiBFeGVjdXRvciB7XG4gIGNvbnN0IGxvY2tGaWxlID0gbmV3IExvY2tGaWxlV2l0aENoaWxkUHJvY2VzcyhmaWxlU3lzdGVtLCBsb2dnZXIpO1xuICBpZiAoYXN5bmMpIHtcbiAgICAvLyBFeGVjdXRlIGFzeW5jaHJvbm91c2x5IChlaXRoZXIgc2VyaWFsbHkgb3IgaW4gcGFyYWxsZWwpXG4gICAgY29uc3QgbG9ja2VyID0gbmV3IEFzeW5jTG9ja2VyKGxvY2tGaWxlLCBsb2dnZXIsIDUwMCwgNTApO1xuICAgIGlmIChpblBhcmFsbGVsKSB7XG4gICAgICAvLyBFeGVjdXRlIGluIHBhcmFsbGVsLiBVc2UgdXAgdG8gOCBDUFUgY29yZXMgZm9yIHdvcmtlcnMsIGFsd2F5cyByZXNlcnZpbmcgb25lIGZvciBtYXN0ZXIuXG4gICAgICBjb25zdCB3b3JrZXJDb3VudCA9IE1hdGgubWluKDgsIG9zLmNwdXMoKS5sZW5ndGggLSAxKTtcbiAgICAgIHJldHVybiBuZXcgQ2x1c3RlckV4ZWN1dG9yKFxuICAgICAgICAgIHdvcmtlckNvdW50LCBsb2dnZXIsIHBrZ0pzb25VcGRhdGVyLCBsb2NrZXIsIGNyZWF0ZVRhc2tDb21wbGV0ZWRDYWxsYmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEV4ZWN1dGUgc2VyaWFsbHksIG9uIGEgc2luZ2xlIHRocmVhZCAoYXN5bmMpLlxuICAgICAgcmV0dXJuIG5ldyBTaW5nbGVQcm9jZXNzRXhlY3V0b3JBc3luYyhsb2dnZXIsIGxvY2tlciwgY3JlYXRlVGFza0NvbXBsZXRlZENhbGxiYWNrKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhlY3V0ZSBzZXJpYWxseSwgb24gYSBzaW5nbGUgdGhyZWFkIChzeW5jKS5cbiAgICByZXR1cm4gbmV3IFNpbmdsZVByb2Nlc3NFeGVjdXRvclN5bmMoXG4gICAgICAgIGxvZ2dlciwgbmV3IFN5bmNMb2NrZXIobG9ja0ZpbGUpLCBjcmVhdGVUYXNrQ29tcGxldGVkQ2FsbGJhY2spO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldERlcGVuZGVuY3lSZXNvbHZlcihcbiAgICBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbixcbiAgICBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8IHVuZGVmaW5lZCk6IERlcGVuZGVuY3lSZXNvbHZlciB7XG4gIGNvbnN0IG1vZHVsZVJlc29sdmVyID0gbmV3IE1vZHVsZVJlc29sdmVyKGZpbGVTeXN0ZW0sIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVzbURlcGVuZGVuY3lIb3N0ID0gbmV3IEVzbURlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgY29uc3QgdW1kRGVwZW5kZW5jeUhvc3QgPSBuZXcgVW1kRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCBjb21tb25Kc0RlcGVuZGVuY3lIb3N0ID0gbmV3IENvbW1vbkpzRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCBkdHNEZXBlbmRlbmN5SG9zdCA9IG5ldyBEdHNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBwYXRoTWFwcGluZ3MpO1xuICByZXR1cm4gbmV3IERlcGVuZGVuY3lSZXNvbHZlcihcbiAgICAgIGZpbGVTeXN0ZW0sIGxvZ2dlciwgY29uZmlnLCB7XG4gICAgICAgIGVzbTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgICBlc20yMDE1OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICAgICAgdW1kOiB1bWREZXBlbmRlbmN5SG9zdCxcbiAgICAgICAgY29tbW9uanM6IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3RcbiAgICAgIH0sXG4gICAgICBkdHNEZXBlbmRlbmN5SG9zdCk7XG59XG5cbmZ1bmN0aW9uIGdldEVudHJ5UG9pbnRGaW5kZXIoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGxvZ2dlcjogTG9nZ2VyLCByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLFxuICAgIGVudHJ5UG9pbnRNYW5pZmVzdDogRW50cnlQb2ludE1hbmlmZXN0LCBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGggfCBudWxsLFxuICAgIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkKTogRW50cnlQb2ludEZpbmRlciB7XG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIG5ldyBUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXIoXG4gICAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgRGlyZWN0b3J5V2Fsa2VyRW50cnlQb2ludEZpbmRlcihcbiAgICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgZW50cnlQb2ludE1hbmlmZXN0LCBiYXNlUGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyOiBMb2dnZXIsIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXSk6IHZvaWQge1xuICBpbnZhbGlkRW50cnlQb2ludHMuZm9yRWFjaChpbnZhbGlkRW50cnlQb2ludCA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgSW52YWxpZCBlbnRyeS1wb2ludCAke2ludmFsaWRFbnRyeVBvaW50LmVudHJ5UG9pbnQucGF0aH0uYCxcbiAgICAgICAgYEl0IGlzIG1pc3NpbmcgcmVxdWlyZWQgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICAgICAgaW52YWxpZEVudHJ5UG9pbnQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1gKS5qb2luKCdcXG4nKSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gY29tcHV0ZXMgYW5kIHJldHVybnMgdGhlIGZvbGxvd2luZzpcbiAqIC0gYHByb3BlcnRpZXNUb1Byb2Nlc3NgOiBBbiAob3JkZXJlZCkgbGlzdCBvZiBwcm9wZXJ0aWVzIHRoYXQgZXhpc3QgYW5kIG5lZWQgdG8gYmUgcHJvY2Vzc2VkLFxuICogICBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYHByb3BlcnRpZXNUb0NvbnNpZGVyYCwgdGhlIHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgYW5kIHRoZWlyXG4gKiAgIGNvcnJlc3BvbmRpbmcgZm9ybWF0LXBhdGhzLiBOT1RFOiBPbmx5IG9uZSBwcm9wZXJ0eSBwZXIgZm9ybWF0LXBhdGggbmVlZHMgdG8gYmUgcHJvY2Vzc2VkLlxuICogLSBgZXF1aXZhbGVudFByb3BlcnRpZXNNYXBgOiBBIG1hcHBpbmcgZnJvbSBlYWNoIHByb3BlcnR5IGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCB0byB0aGUgbGlzdCBvZlxuICogICBvdGhlciBmb3JtYXQgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCB0aGF0IG5lZWQgdG8gYmUgbWFya2VkIGFzIHByb2Nlc3NlZCBhcyBzb29uIGFzIHRoZVxuICogICBmb3JtZXIgaGFzIGJlZW4gcHJvY2Vzc2VkLlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0aWVzVG9Qcm9jZXNzKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pOiB7XG4gIHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXTtcbiAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXA6IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+O1xufSB7XG4gIGNvbnN0IGZvcm1hdFBhdGhzVG9Db25zaWRlciA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGNvbnN0IHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgZGVmaW5lZCBpbiBgcGFja2FnZS5qc29uYC5cbiAgICBpZiAodHlwZW9mIGZvcm1hdFBhdGggIT09ICdzdHJpbmcnKSBjb250aW51ZTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgbWFwIHRvIHRoZSBzYW1lIGZvcm1hdC1wYXRoIGFzIGEgcHJlY2VkaW5nIHByb3BlcnR5LlxuICAgIGlmIChmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIFByb2Nlc3MgdGhpcyBwcm9wZXJ0eSwgYmVjYXVzZSBpdCBpcyB0aGUgZmlyc3Qgb25lIHRvIG1hcCB0byB0aGlzIGZvcm1hdC1wYXRoLlxuICAgIGZvcm1hdFBhdGhzVG9Db25zaWRlci5hZGQoZm9ybWF0UGF0aCk7XG4gICAgcHJvcGVydGllc1RvUHJvY2Vzcy5wdXNoKHByb3ApO1xuXG4gICAgLy8gSWYgd2Ugb25seSBuZWVkIG9uZSBmb3JtYXQgcHJvY2Vzc2VkLCB0aGVyZSBpcyBubyBuZWVkIHRvIHByb2Nlc3MgYW55IG1vcmUgcHJvcGVydGllcy5cbiAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSBicmVhaztcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXM6IHtbZm9ybWF0UGF0aDogc3RyaW5nXTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdfSA9IHt9O1xuICBmb3IgKGNvbnN0IHByb3Agb2YgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGRvIG5vdCBtYXAgdG8gYSBmb3JtYXQtcGF0aCB0aGF0IHdpbGwgYmUgY29uc2lkZXJlZC5cbiAgICBpZiAoIWZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gQWRkIHRoaXMgcHJvcGVydHkgdG8gdGhlIG1hcC5cbiAgICBjb25zdCBsaXN0ID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSB8fCAoZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSA9IFtdKTtcbiAgICBsaXN0LnB1c2gocHJvcCk7XG4gIH1cblxuICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllc01hcCA9IG5ldyBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPigpO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF0gITtcbiAgICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllcyA9IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF07XG4gICAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXAuc2V0KHByb3AsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzKTtcbiAgfVxuXG4gIHJldHVybiB7cHJvcGVydGllc1RvUHJvY2VzcywgZXF1aXZhbGVudFByb3BlcnRpZXNNYXB9O1xufVxuIl19