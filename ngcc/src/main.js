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
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "dependency-graph", "os", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/dts_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/execution/cluster/executor", "@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater", "@angular/compiler-cli/ngcc/src/execution/lock_file", "@angular/compiler-cli/ngcc/src/execution/single_process_executor", "@angular/compiler-cli/ngcc/src/execution/task_selection/parallel_task_queue", "@angular/compiler-cli/ngcc/src/execution/task_selection/serial_task_queue", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", "@angular/compiler-cli/ngcc/src/writing/package_json_updater"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /// <reference types="node" />
    var dependency_graph_1 = require("dependency-graph");
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
    var in_place_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    var package_json_updater_2 = require("@angular/compiler-cli/ngcc/src/writing/package_json_updater");
    var EMPTY_GRAPH = new dependency_graph_1.DepGraph();
    function mainNgcc(_a) {
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _b = _a.propertiesToConsider, propertiesToConsider = _b === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _b, _c = _a.compileAllFormats, compileAllFormats = _c === void 0 ? true : _c, _d = _a.createNewEntryPointFormats, createNewEntryPointFormats = _d === void 0 ? false : _d, _e = _a.logger, logger = _e === void 0 ? new console_logger_1.ConsoleLogger(console_logger_1.LogLevel.info) : _e, pathMappings = _a.pathMappings, _f = _a.async, async = _f === void 0 ? false : _f, _g = _a.enableI18nLegacyMessageIdFormat, enableI18nLegacyMessageIdFormat = _g === void 0 ? true : _g;
        // Execute in parallel, if async execution is acceptable and there are more than 1 CPU cores.
        var inParallel = async && (os.cpus().length > 1);
        // Instantiate common utilities that are always used.
        // NOTE: Avoid eagerly instantiating anything that might not be used when running sync/async or in
        //       master/worker process.
        var fileSystem = file_system_1.getFileSystem();
        // Bail out early if the work is already done.
        var supportedPropertiesToConsider = ensureSupportedProperties(propertiesToConsider);
        var absoluteTargetEntryPointPath = targetEntryPointPath !== undefined ? file_system_1.resolve(basePath, targetEntryPointPath) : undefined;
        if (absoluteTargetEntryPointPath !== undefined &&
            hasProcessedTargetEntryPoint(fileSystem, absoluteTargetEntryPointPath, supportedPropertiesToConsider, compileAllFormats)) {
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
            var moduleResolver = new module_resolver_1.ModuleResolver(fileSystem, pathMappings);
            var esmDependencyHost = new esm_dependency_host_1.EsmDependencyHost(fileSystem, moduleResolver);
            var umdDependencyHost = new umd_dependency_host_1.UmdDependencyHost(fileSystem, moduleResolver);
            var commonJsDependencyHost = new commonjs_dependency_host_1.CommonJsDependencyHost(fileSystem, moduleResolver);
            var dtsDependencyHost = new dts_dependency_host_1.DtsDependencyHost(fileSystem, pathMappings);
            var dependencyResolver = new dependency_resolver_1.DependencyResolver(fileSystem, logger, {
                esm5: esmDependencyHost,
                esm2015: esmDependencyHost,
                umd: umdDependencyHost,
                commonjs: commonJsDependencyHost
            }, dtsDependencyHost);
            var absBasePath = file_system_1.absoluteFrom(basePath);
            var config = new configuration_1.NgccConfiguration(fileSystem, file_system_1.dirname(absBasePath));
            var _c = getEntryPoints(fileSystem, pkgJsonUpdater, logger, dependencyResolver, config, absBasePath, absoluteTargetEntryPointPath, pathMappings), entryPoints = _c.entryPoints, graph = _c.graph;
            var unprocessableEntryPointPaths = [];
            // The tasks are partially ordered by virtue of the entry-points being partially ordered too.
            var tasks = [];
            try {
                for (var entryPoints_1 = tslib_1.__values(entryPoints), entryPoints_1_1 = entryPoints_1.next(); !entryPoints_1_1.done; entryPoints_1_1 = entryPoints_1.next()) {
                    var entryPoint = entryPoints_1_1.value;
                    var packageJson = entryPoint.packageJson;
                    var hasProcessedTypings = build_marker_1.hasBeenProcessed(packageJson, 'typings', entryPoint.path);
                    var _d = getPropertiesToProcess(packageJson, supportedPropertiesToConsider, compileAllFormats), propertiesToProcess = _d.propertiesToProcess, equivalentPropertiesMap = _d.equivalentPropertiesMap;
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
                if (build_marker_1.hasBeenProcessed(packageJson, formatProperty, entryPoint.path)) {
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
    function getEntryPoints(fs, pkgJsonUpdater, logger, resolver, config, basePath, targetEntryPointPath, pathMappings) {
        var _a = (targetEntryPointPath !== undefined) ?
            getTargetedEntryPoints(fs, pkgJsonUpdater, logger, resolver, config, basePath, targetEntryPointPath, pathMappings) :
            getAllEntryPoints(fs, config, logger, resolver, basePath, pathMappings), entryPoints = _a.entryPoints, invalidEntryPoints = _a.invalidEntryPoints, graph = _a.graph;
        logInvalidEntryPoints(logger, invalidEntryPoints);
        return { entryPoints: entryPoints, graph: graph };
    }
    function getTargetedEntryPoints(fs, pkgJsonUpdater, logger, resolver, config, basePath, absoluteTargetEntryPointPath, pathMappings) {
        var finder = new targeted_entry_point_finder_1.TargetedEntryPointFinder(fs, config, logger, resolver, basePath, absoluteTargetEntryPointPath, pathMappings);
        var entryPointInfo = finder.findEntryPoints();
        var invalidTarget = entryPointInfo.invalidEntryPoints.find(function (i) { return i.entryPoint.path === absoluteTargetEntryPointPath; });
        if (invalidTarget !== undefined) {
            throw new Error("The target entry-point \"" + invalidTarget.entryPoint.name + "\" has missing dependencies:\n" +
                invalidTarget.missingDependencies.map(function (dep) { return " - " + dep + "\n"; }).join(''));
        }
        if (entryPointInfo.entryPoints.length === 0) {
            markNonAngularPackageAsProcessed(fs, pkgJsonUpdater, absoluteTargetEntryPointPath);
        }
        return entryPointInfo;
    }
    function getAllEntryPoints(fs, config, logger, resolver, basePath, pathMappings) {
        var finder = new directory_walker_entry_point_finder_1.DirectoryWalkerEntryPointFinder(fs, config, logger, resolver, basePath, pathMappings);
        return finder.findEntryPoints();
    }
    function hasProcessedTargetEntryPoint(fs, targetPath, propertiesToConsider, compileAllFormats) {
        var e_4, _a;
        var packageJsonPath = file_system_1.resolve(targetPath, 'package.json');
        // It might be that this target is configured in which case its package.json might not exist.
        if (!fs.exists(packageJsonPath)) {
            return false;
        }
        var packageJson = JSON.parse(fs.readFile(packageJsonPath));
        try {
            for (var propertiesToConsider_1 = tslib_1.__values(propertiesToConsider), propertiesToConsider_1_1 = propertiesToConsider_1.next(); !propertiesToConsider_1_1.done; propertiesToConsider_1_1 = propertiesToConsider_1.next()) {
                var property = propertiesToConsider_1_1.value;
                if (packageJson[property]) {
                    // Here is a property that should be processed
                    if (build_marker_1.hasBeenProcessed(packageJson, property, targetPath)) {
                        if (!compileAllFormats) {
                            // It has been processed and we only need one, so we are done.
                            return true;
                        }
                    }
                    else {
                        // It has not been processed but we need all of them, so we are done.
                        return false;
                    }
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (propertiesToConsider_1_1 && !propertiesToConsider_1_1.done && (_a = propertiesToConsider_1.return)) _a.call(propertiesToConsider_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        // Either all formats need to be compiled and there were none that were unprocessed,
        // Or only the one matching format needs to be compiled but there was at least one matching
        // property before the first processed format that was unprocessed.
        return true;
    }
    /**
     * If we get here, then the requested entry-point did not contain anything compiled by
     * the old Angular compiler. Therefore there is nothing for ngcc to do.
     * So mark all formats in this entry-point as processed so that clients of ngcc can avoid
     * triggering ngcc for this entry-point in the future.
     */
    function markNonAngularPackageAsProcessed(fs, pkgJsonUpdater, path) {
        var packageJsonPath = file_system_1.resolve(path, 'package.json');
        var packageJson = JSON.parse(fs.readFile(packageJsonPath));
        // Note: We are marking all supported properties as processed, even if they don't exist in the
        //       `package.json` file. While this is redundant, it is also harmless.
        build_marker_1.markAsProcessed(pkgJsonUpdater, packageJson, packageJsonPath, entry_point_1.SUPPORTED_FORMAT_PROPERTIES);
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
        var e_5, _a, e_6, _b, e_7, _c;
        var formatPathsToConsider = new Set();
        var propertiesToProcess = [];
        try {
            for (var propertiesToConsider_2 = tslib_1.__values(propertiesToConsider), propertiesToConsider_2_1 = propertiesToConsider_2.next(); !propertiesToConsider_2_1.done; propertiesToConsider_2_1 = propertiesToConsider_2.next()) {
                var prop = propertiesToConsider_2_1.value;
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
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (propertiesToConsider_2_1 && !propertiesToConsider_2_1.done && (_a = propertiesToConsider_2.return)) _a.call(propertiesToConsider_2);
            }
            finally { if (e_5) throw e_5.error; }
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
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (SUPPORTED_FORMAT_PROPERTIES_1_1 && !SUPPORTED_FORMAT_PROPERTIES_1_1.done && (_b = SUPPORTED_FORMAT_PROPERTIES_1.return)) _b.call(SUPPORTED_FORMAT_PROPERTIES_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
        var equivalentPropertiesMap = new Map();
        try {
            for (var propertiesToConsider_3 = tslib_1.__values(propertiesToConsider), propertiesToConsider_3_1 = propertiesToConsider_3.next(); !propertiesToConsider_3_1.done; propertiesToConsider_3_1 = propertiesToConsider_3.next()) {
                var prop = propertiesToConsider_3_1.value;
                var formatPath = packageJson[prop];
                var equivalentProperties = formatPathToProperties[formatPath];
                equivalentPropertiesMap.set(prop, equivalentProperties);
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (propertiesToConsider_3_1 && !propertiesToConsider_3_1.done && (_c = propertiesToConsider_3.return)) _c.call(propertiesToConsider_3);
            }
            finally { if (e_7) throw e_7.error; }
        }
        return { propertiesToProcess: propertiesToProcess, equivalentPropertiesMap: equivalentPropertiesMap };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhCQUE4QjtJQUU5QixxREFBMEM7SUFDMUMsdUJBQXlCO0lBQ3pCLCtCQUFpQztJQUVqQywyRUFBb0U7SUFDcEUsMkVBQXNIO0lBRXRILGlIQUErRTtJQUMvRSx1R0FBNkk7SUFDN0ksdUdBQXFFO0lBQ3JFLHVHQUFxRTtJQUNyRSwrRkFBOEQ7SUFDOUQsdUdBQXFFO0lBQ3JFLDZJQUF5RztJQUN6Ryw2SEFBMEY7SUFFMUYsc0ZBQTZEO0lBQzdELDhHQUFtRjtJQUNuRixnRkFBK0M7SUFDL0MsNEdBQXNHO0lBQ3RHLG1IQUFpRjtJQUNqRiwrR0FBNkU7SUFDN0Usd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSx1RkFBMkQ7SUFDM0QsbUZBQW1KO0lBQ25KLGlHQUFtRTtJQUNuRSxtRkFBbUQ7SUFHbkQsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQUM5RSxvR0FBNEY7SUFvRjVGLElBQU0sV0FBVyxHQUFHLElBQUksMkJBQVEsRUFBYyxDQUFDO0lBWS9DLFNBQWdCLFFBQVEsQ0FDcEIsRUFHcUQ7WUFIcEQsc0JBQVEsRUFBRSw4Q0FBb0IsRUFBRSw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xGLHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFBRSxrQ0FBa0MsRUFBbEMsdURBQWtDLEVBQzVELGNBQXlDLEVBQXpDLGdHQUF5QyxFQUFFLDhCQUFZLEVBQUUsYUFBYSxFQUFiLGtDQUFhLEVBQ3RFLHVDQUFzQyxFQUF0QywyREFBc0M7UUFDekMsNkZBQTZGO1FBQzdGLElBQU0sVUFBVSxHQUFHLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7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QUksQ0FBQyxDQUFDO2FBQ2pCOzs7Ozs7Ozs7UUFFRCxJQUFNLHVCQUF1QixHQUFHLElBQUksR0FBRyxFQUFvRCxDQUFDOztZQUM1RixLQUFtQixJQUFBLHlCQUFBLGlCQUFBLG9CQUFvQixDQUFBLDBEQUFBLDRGQUFFO2dCQUFwQyxJQUFNLElBQUksaUNBQUE7Z0JBQ2IsSUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBRyxDQUFDO2dCQUN2QyxJQUFNLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNoRSx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUM7YUFDekQ7Ozs7Ozs7OztRQUVELE9BQU8sRUFBQyxtQkFBbUIscUJBQUEsRUFBRSx1QkFBdUIseUJBQUEsRUFBQyxDQUFDO0lBQ3hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCB7RGVwR3JhcGh9IGZyb20gJ2RlcGVuZGVuY3ktZ3JhcGgnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb20sIGRpcm5hbWUsIGdldEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7Q29tbW9uSnNEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBJbnZhbGlkRW50cnlQb2ludCwgUGFydGlhbGx5T3JkZXJlZEVudHJ5UG9pbnRzLCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtEdHNEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZHRzX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0VzbURlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9lc21fZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL21vZHVsZV9yZXNvbHZlcic7XG5pbXBvcnQge1VtZERlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy91bWRfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGlyZWN0b3J5V2Fsa2VyRW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvZGlyZWN0b3J5X3dhbGtlcl9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL3RhcmdldGVkX2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge0FuYWx5emVFbnRyeVBvaW50c0ZuLCBDcmVhdGVDb21waWxlRm4sIEV4ZWN1dG9yLCBQYXJ0aWFsbHlPcmRlcmVkVGFza3MsIFRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZSwgVGFza1F1ZXVlfSBmcm9tICcuL2V4ZWN1dGlvbi9hcGknO1xuaW1wb3J0IHtDbHVzdGVyRXhlY3V0b3J9IGZyb20gJy4vZXhlY3V0aW9uL2NsdXN0ZXIvZXhlY3V0b3InO1xuaW1wb3J0IHtDbHVzdGVyUGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuL2V4ZWN1dGlvbi9jbHVzdGVyL3BhY2thZ2VfanNvbl91cGRhdGVyJztcbmltcG9ydCB7TG9ja0ZpbGV9IGZyb20gJy4vZXhlY3V0aW9uL2xvY2tfZmlsZSc7XG5pbXBvcnQge0FzeW5jU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yLCBTaW5nbGVQcm9jZXNzRXhlY3V0b3J9IGZyb20gJy4vZXhlY3V0aW9uL3NpbmdsZV9wcm9jZXNzX2V4ZWN1dG9yJztcbmltcG9ydCB7UGFyYWxsZWxUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tfc2VsZWN0aW9uL3BhcmFsbGVsX3Rhc2tfcXVldWUnO1xuaW1wb3J0IHtTZXJpYWxUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tfc2VsZWN0aW9uL3NlcmlhbF90YXNrX3F1ZXVlJztcbmltcG9ydCB7Q29uc29sZUxvZ2dlciwgTG9nTGV2ZWx9IGZyb20gJy4vbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge2hhc0JlZW5Qcm9jZXNzZWQsIG1hcmtBc1Byb2Nlc3NlZH0gZnJvbSAnLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludFBhY2thZ2VKc29uLCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsIGdldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHttYWtlRW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtUcmFuc2Zvcm1lcn0gZnJvbSAnLi9wYWNrYWdlcy90cmFuc2Zvcm1lcic7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvaW5fcGxhY2VfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtOZXdFbnRyeVBvaW50RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5pbXBvcnQge0RpcmVjdFBhY2thZ2VKc29uVXBkYXRlciwgUGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuXG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyIGZvciBzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3luY05nY2NPcHRpb25zIHtcbiAgLyoqIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdGhhdCBjb250YWlucyB0aGUgcGFja2FnZXMgdG8gcHJvY2Vzcy4gKi9cbiAgYmFzZVBhdGg6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHBhdGggdG8gdGhlIHByaW1hcnkgcGFja2FnZSB0byBiZSBwcm9jZXNzZWQuIElmIG5vdCBhYnNvbHV0ZSB0aGVuIGl0IG11c3QgYmUgcmVsYXRpdmUgdG9cbiAgICogYGJhc2VQYXRoYC5cbiAgICpcbiAgICogQWxsIGl0cyBkZXBlbmRlbmNpZXMgd2lsbCBuZWVkIHRvIGJlIHByb2Nlc3NlZCB0b28uXG4gICAqL1xuICB0YXJnZXRFbnRyeVBvaW50UGF0aD86IHN0cmluZztcblxuICAvKipcbiAgICogV2hpY2ggZW50cnktcG9pbnQgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uIHRvIGNvbnNpZGVyIHdoZW4gcHJvY2Vzc2luZyBhbiBlbnRyeS1wb2ludC5cbiAgICogRWFjaCBwcm9wZXJ0eSBzaG91bGQgaG9sZCBhIHBhdGggdG8gdGhlIHBhcnRpY3VsYXIgYnVuZGxlIGZvcm1hdCBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICAgKiBEZWZhdWx0cyB0byBhbGwgdGhlIHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbi5cbiAgICovXG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcHJvY2VzcyBhbGwgZm9ybWF0cyBzcGVjaWZpZWQgYnkgKGBwcm9wZXJ0aWVzVG9Db25zaWRlcmApICBvciB0byBzdG9wIHByb2Nlc3NpbmdcbiAgICogdGhpcyBlbnRyeS1wb2ludCBhdCB0aGUgZmlyc3QgbWF0Y2hpbmcgZm9ybWF0LiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqL1xuICBjb21waWxlQWxsRm9ybWF0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY3JlYXRlIG5ldyBlbnRyeS1wb2ludHMgYnVuZGxlcyByYXRoZXIgdGhhbiBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgZmlsZXMuXG4gICAqL1xuICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBsb2dnZXIgdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGxvZyBtZXNzYWdlcy5cbiAgICovXG4gIGxvZ2dlcj86IExvZ2dlcjtcblxuICAvKipcbiAgICogUGF0aHMgbWFwcGluZyBjb25maWd1cmF0aW9uIChgcGF0aHNgIGFuZCBgYmFzZVVybGApLCBhcyBmb3VuZCBpbiBgdHMuQ29tcGlsZXJPcHRpb25zYC5cbiAgICogVGhlc2UgYXJlIHVzZWQgdG8gcmVzb2x2ZSBwYXRocyB0byBsb2NhbGx5IGJ1aWx0IEFuZ3VsYXIgbGlicmFyaWVzLlxuICAgKi9cbiAgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlIGEgZmlsZS1zeXN0ZW0gc2VydmljZSB0aGF0IHdpbGwgYmUgdXNlZCBieSBuZ2NjIGZvciBhbGwgZmlsZSBpbnRlcmFjdGlvbnMuXG4gICAqL1xuICBmaWxlU3lzdGVtPzogRmlsZVN5c3RlbTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgY29tcGlsYXRpb24gc2hvdWxkIHJ1biBhbmQgcmV0dXJuIGFzeW5jaHJvbm91c2x5LiBBbGxvd2luZyBhc3luY2hyb25vdXMgZXhlY3V0aW9uXG4gICAqIG1heSBzcGVlZCB1cCB0aGUgY29tcGlsYXRpb24gYnkgdXRpbGl6aW5nIG11bHRpcGxlIENQVSBjb3JlcyAoaWYgYXZhaWxhYmxlKS5cbiAgICpcbiAgICogRGVmYXVsdDogYGZhbHNlYCAoaS5lLiBydW4gc3luY2hyb25vdXNseSlcbiAgICovXG4gIGFzeW5jPzogZmFsc2U7XG5cbiAgLyoqXG4gICAqIFJlbmRlciBgJGxvY2FsaXplYCBtZXNzYWdlcyB3aXRoIGxlZ2FjeSBmb3JtYXQgaWRzLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAuIE9ubHkgc2V0IHRoaXMgdG8gYGZhbHNlYCBpZiB5b3UgZG8gbm90IHdhbnQgbGVnYWN5IG1lc3NhZ2UgaWRzIHRvXG4gICAqIGJlIHJlbmRlcmVkLiBGb3IgZXhhbXBsZSwgaWYgeW91IGFyZSBub3QgdXNpbmcgbGVnYWN5IG1lc3NhZ2UgaWRzIGluIHlvdXIgdHJhbnNsYXRpb24gZmlsZXNcbiAgICogQU5EIGFyZSBub3QgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIG9mIHRyYW5zbGF0aW9ucywgaW4gd2hpY2ggY2FzZSB0aGUgZXh0cmEgbWVzc2FnZSBpZHNcbiAgICogd291bGQgYWRkIHVud2FudGVkIHNpemUgdG8gdGhlIGZpbmFsIHNvdXJjZSBidW5kbGUuXG4gICAqXG4gICAqIEl0IGlzIHNhZmUgdG8gbGVhdmUgdGhpcyBzZXQgdG8gdHJ1ZSBpZiB5b3UgYXJlIGRvaW5nIGNvbXBpbGUtdGltZSBpbmxpbmluZyBiZWNhdXNlIHRoZSBleHRyYVxuICAgKiBsZWdhY3kgbWVzc2FnZSBpZHMgd2lsbCBhbGwgYmUgc3RyaXBwZWQgZHVyaW5nIHRyYW5zbGF0aW9uLlxuICAgKi9cbiAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyIGZvciBhc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICovXG5leHBvcnQgdHlwZSBBc3luY05nY2NPcHRpb25zID0gT21pdDxTeW5jTmdjY09wdGlvbnMsICdhc3luYyc+JiB7YXN5bmM6IHRydWV9O1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlci5cbiAqL1xuZXhwb3J0IHR5cGUgTmdjY09wdGlvbnMgPSBBc3luY05nY2NPcHRpb25zIHwgU3luY05nY2NPcHRpb25zO1xuXG5jb25zdCBFTVBUWV9HUkFQSCA9IG5ldyBEZXBHcmFwaDxFbnRyeVBvaW50PigpO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhvcHRpb25zOiBBc3luY05nY2NPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhvcHRpb25zOiBTeW5jTmdjY09wdGlvbnMpOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKFxuICAgIHtiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyID0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLFxuICAgICBjb21waWxlQWxsRm9ybWF0cyA9IHRydWUsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID0gZmFsc2UsXG4gICAgIGxvZ2dlciA9IG5ldyBDb25zb2xlTG9nZ2VyKExvZ0xldmVsLmluZm8pLCBwYXRoTWFwcGluZ3MsIGFzeW5jID0gZmFsc2UsXG4gICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQgPSB0cnVlfTogTmdjY09wdGlvbnMpOiB2b2lkfFByb21pc2U8dm9pZD4ge1xuICAvLyBFeGVjdXRlIGluIHBhcmFsbGVsLCBpZiBhc3luYyBleGVjdXRpb24gaXMgYWNjZXB0YWJsZSBhbmQgdGhlcmUgYXJlIG1vcmUgdGhhbiAxIENQVSBjb3Jlcy5cbiAgY29uc3QgaW5QYXJhbGxlbCA9IGFzeW5jICYmIChvcy5jcHVzKCkubGVuZ3RoID4gMSk7XG5cbiAgLy8gSW5zdGFudGlhdGUgY29tbW9uIHV0aWxpdGllcyB0aGF0IGFyZSBhbHdheXMgdXNlZC5cbiAgLy8gTk9URTogQXZvaWQgZWFnZXJseSBpbnN0YW50aWF0aW5nIGFueXRoaW5nIHRoYXQgbWlnaHQgbm90IGJlIHVzZWQgd2hlbiBydW5uaW5nIHN5bmMvYXN5bmMgb3IgaW5cbiAgLy8gICAgICAgbWFzdGVyL3dvcmtlciBwcm9jZXNzLlxuICBjb25zdCBmaWxlU3lzdGVtID0gZ2V0RmlsZVN5c3RlbSgpO1xuXG5cbiAgLy8gQmFpbCBvdXQgZWFybHkgaWYgdGhlIHdvcmsgaXMgYWxyZWFkeSBkb25lLlxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciA9IGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllc1RvQ29uc2lkZXIpO1xuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID1cbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSB1bmRlZmluZWQgPyByZXNvbHZlKGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCkgOiB1bmRlZmluZWQ7XG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIGhhc1Byb2Nlc3NlZFRhcmdldEVudHJ5UG9pbnQoXG4gICAgICAgICAgZmlsZVN5c3RlbSwgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsXG4gICAgICAgICAgY29tcGlsZUFsbEZvcm1hdHMpKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTk9URTogVG8gYXZvaWQgZmlsZSBjb3JydXB0aW9uLCBlbnN1cmUgdGhhdCBlYWNoIGBuZ2NjYCBpbnZvY2F0aW9uIG9ubHkgY3JlYXRlcyBfb25lXyBpbnN0YW5jZVxuICAvLyAgICAgICBvZiBgUGFja2FnZUpzb25VcGRhdGVyYCB0aGF0IGFjdHVhbGx5IHdyaXRlcyB0byBkaXNrIChhY3Jvc3MgYWxsIHByb2Nlc3NlcykuXG4gIC8vICAgICAgIFRoaXMgaXMgaGFyZCB0byBlbmZvcmNlIGF1dG9tYXRpY2FsbHksIHdoZW4gcnVubmluZyBvbiBtdWx0aXBsZSBwcm9jZXNzZXMsIHNvIG5lZWRzIHRvIGJlXG4gIC8vICAgICAgIGVuZm9yY2VkIG1hbnVhbGx5LlxuICBjb25zdCBwa2dKc29uVXBkYXRlciA9IGdldFBhY2thZ2VKc29uVXBkYXRlcihpblBhcmFsbGVsLCBmaWxlU3lzdGVtKTtcblxuICAvLyBUaGUgZnVuY3Rpb24gZm9yIHBlcmZvcm1pbmcgdGhlIGFuYWx5c2lzLlxuICBjb25zdCBhbmFseXplRW50cnlQb2ludHM6IEFuYWx5emVFbnRyeVBvaW50c0ZuID0gKCkgPT4ge1xuICAgIGxvZ2dlci5kZWJ1ZygnQW5hbHl6aW5nIGVudHJ5LXBvaW50cy4uLicpO1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcihmaWxlU3lzdGVtLCBwYXRoTWFwcGluZ3MpO1xuICAgIGNvbnN0IGVzbURlcGVuZGVuY3lIb3N0ID0gbmV3IEVzbURlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gICAgY29uc3QgY29tbW9uSnNEZXBlbmRlbmN5SG9zdCA9IG5ldyBDb21tb25Kc0RlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgICBjb25zdCBkdHNEZXBlbmRlbmN5SG9zdCA9IG5ldyBEdHNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBwYXRoTWFwcGluZ3MpO1xuICAgIGNvbnN0IGRlcGVuZGVuY3lSZXNvbHZlciA9IG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIoXG4gICAgICAgIGZpbGVTeXN0ZW0sIGxvZ2dlciwge1xuICAgICAgICAgIGVzbTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgICAgIGVzbTIwMTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgICAgIHVtZDogdW1kRGVwZW5kZW5jeUhvc3QsXG4gICAgICAgICAgY29tbW9uanM6IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3RcbiAgICAgICAgfSxcbiAgICAgICAgZHRzRGVwZW5kZW5jeUhvc3QpO1xuXG4gICAgY29uc3QgYWJzQmFzZVBhdGggPSBhYnNvbHV0ZUZyb20oYmFzZVBhdGgpO1xuICAgIGNvbnN0IGNvbmZpZyA9IG5ldyBOZ2NjQ29uZmlndXJhdGlvbihmaWxlU3lzdGVtLCBkaXJuYW1lKGFic0Jhc2VQYXRoKSk7XG4gICAgY29uc3Qge2VudHJ5UG9pbnRzLCBncmFwaH0gPSBnZXRFbnRyeVBvaW50cyhcbiAgICAgICAgZmlsZVN5c3RlbSwgcGtnSnNvblVwZGF0ZXIsIGxvZ2dlciwgZGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWcsIGFic0Jhc2VQYXRoLFxuICAgICAgICBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuXG4gICAgY29uc3QgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBUaGUgdGFza3MgYXJlIHBhcnRpYWxseSBvcmRlcmVkIGJ5IHZpcnR1ZSBvZiB0aGUgZW50cnktcG9pbnRzIGJlaW5nIHBhcnRpYWxseSBvcmRlcmVkIHRvby5cbiAgICBjb25zdCB0YXNrczogUGFydGlhbGx5T3JkZXJlZFRhc2tzID0gW10gYXMgYW55O1xuXG4gICAgZm9yIChjb25zdCBlbnRyeVBvaW50IG9mIGVudHJ5UG9pbnRzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCBoYXNQcm9jZXNzZWRUeXBpbmdzID0gaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgJ3R5cGluZ3MnLCBlbnRyeVBvaW50LnBhdGgpO1xuICAgICAgY29uc3Qge3Byb3BlcnRpZXNUb1Byb2Nlc3MsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwfSA9XG4gICAgICAgICAgZ2V0UHJvcGVydGllc1RvUHJvY2VzcyhwYWNrYWdlSnNvbiwgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKTtcbiAgICAgIGxldCBwcm9jZXNzRHRzID0gIWhhc1Byb2Nlc3NlZFR5cGluZ3M7XG5cbiAgICAgIGlmIChwcm9wZXJ0aWVzVG9Qcm9jZXNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBUaGlzIGVudHJ5LXBvaW50IGlzIHVucHJvY2Vzc2FibGUgKGkuZS4gdGhlcmUgaXMgbm8gZm9ybWF0IHByb3BlcnR5IHRoYXQgaXMgb2YgaW50ZXJlc3RcbiAgICAgICAgLy8gYW5kIGNhbiBiZSBwcm9jZXNzZWQpLiBUaGlzIHdpbGwgcmVzdWx0IGluIGFuIGVycm9yLCBidXQgY29udGludWUgbG9vcGluZyBvdmVyXG4gICAgICAgIC8vIGVudHJ5LXBvaW50cyBpbiBvcmRlciB0byBjb2xsZWN0IGFsbCB1bnByb2Nlc3NhYmxlIG9uZXMgYW5kIGRpc3BsYXkgYSBtb3JlIGluZm9ybWF0aXZlXG4gICAgICAgIC8vIGVycm9yLlxuICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLnB1c2goZW50cnlQb2ludC5wYXRoKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybWF0UHJvcGVydHkgb2YgcHJvcGVydGllc1RvUHJvY2Vzcykge1xuICAgICAgICBjb25zdCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQgPSBlcXVpdmFsZW50UHJvcGVydGllc01hcC5nZXQoZm9ybWF0UHJvcGVydHkpICE7XG4gICAgICAgIHRhc2tzLnB1c2goe2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9KTtcblxuICAgICAgICAvLyBPbmx5IHByb2Nlc3MgdHlwaW5ncyBmb3IgdGhlIGZpcnN0IHByb3BlcnR5IChpZiBub3QgYWxyZWFkeSBwcm9jZXNzZWQpLlxuICAgICAgICBwcm9jZXNzRHRzID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGVudHJ5LXBvaW50cyBmb3Igd2hpY2ggd2UgY291bGQgbm90IHByb2Nlc3MgYW55IGZvcm1hdCBhdCBhbGwuXG4gICAgaWYgKHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdVbmFibGUgdG8gcHJvY2VzcyBhbnkgZm9ybWF0cyBmb3IgdGhlIGZvbGxvd2luZyBlbnRyeS1wb2ludHMgKHRyaWVkICcgK1xuICAgICAgICAgIGAke3Byb3BlcnRpZXNUb0NvbnNpZGVyLmpvaW4oJywgJyl9KTogYCArXG4gICAgICAgICAgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5tYXAocGF0aCA9PiBgXFxuICAtICR7cGF0aH1gKS5qb2luKCcnKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMDApO1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYEFuYWx5emVkICR7ZW50cnlQb2ludHMubGVuZ3RofSBlbnRyeS1wb2ludHMgaW4gJHtkdXJhdGlvbn1zLiBgICtcbiAgICAgICAgYChUb3RhbCB0YXNrczogJHt0YXNrcy5sZW5ndGh9KWApO1xuXG4gICAgcmV0dXJuIGdldFRhc2tRdWV1ZShpblBhcmFsbGVsLCB0YXNrcywgZ3JhcGgpO1xuICB9O1xuXG4gIC8vIFRoZSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgdGhlIGBjb21waWxlKClgIGZ1bmN0aW9uLlxuICBjb25zdCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbiA9IG9uVGFza0NvbXBsZXRlZCA9PiB7XG4gICAgY29uc3QgZmlsZVdyaXRlciA9IGdldEZpbGVXcml0ZXIoZmlsZVN5c3RlbSwgcGtnSnNvblVwZGF0ZXIsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcbiAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmaWxlU3lzdGVtLCBsb2dnZXIpO1xuXG4gICAgcmV0dXJuICh0YXNrOiBUYXNrKSA9PiB7XG4gICAgICBjb25zdCB7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30gPSB0YXNrO1xuXG4gICAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJzsgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5KTtcblxuICAgICAgLy8gQWxsIHByb3BlcnRpZXMgbGlzdGVkIGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCBhcmUgZ3VhcmFudGVlZCB0byBwb2ludCB0byBhIGZvcm1hdC1wYXRoXG4gICAgICAvLyAoaS5lLiB0aGV5IGFyZSBkZWZpbmVkIGluIGBlbnRyeVBvaW50LnBhY2thZ2VKc29uYCkuIEZ1cnRoZXJtb3JlLCB0aGV5IGFyZSBhbHNvIGd1YXJhbnRlZWRcbiAgICAgIC8vIHRvIGJlIGFtb25nIGBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVNgLlxuICAgICAgLy8gQmFzZWQgb24gdGhlIGFib3ZlLCBgZm9ybWF0UGF0aGAgc2hvdWxkIGFsd2F5cyBiZSBkZWZpbmVkIGFuZCBgZ2V0RW50cnlQb2ludEZvcm1hdCgpYFxuICAgICAgLy8gc2hvdWxkIGFsd2F5cyByZXR1cm4gYSBmb3JtYXQgaGVyZSAoYW5kIG5vdCBgdW5kZWZpbmVkYCkuXG4gICAgICBpZiAoIWZvcm1hdFBhdGggfHwgIWZvcm1hdCkge1xuICAgICAgICAvLyBUaGlzIHNob3VsZCBuZXZlciBoYXBwZW4uXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBJbnZhcmlhbnQgdmlvbGF0ZWQ6IE5vIGZvcm1hdC1wYXRoIG9yIGZvcm1hdCBmb3IgJHtlbnRyeVBvaW50LnBhdGh9IDogYCArXG4gICAgICAgICAgICBgJHtmb3JtYXRQcm9wZXJ0eX0gKGZvcm1hdFBhdGg6ICR7Zm9ybWF0UGF0aH0gfCBmb3JtYXQ6ICR7Zm9ybWF0fSlgKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGZvcm1hdC1wYXRoIHdoaWNoIHRoZSBwcm9wZXJ0eSBtYXBzIHRvIGlzIGFscmVhZHkgcHJvY2Vzc2VkIC0gbm90aGluZyB0byBkby5cbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBmb3JtYXRQcm9wZXJ0eSwgZW50cnlQb2ludC5wYXRoKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5BbHJlYWR5UHJvY2Vzc2VkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQYXRoLCBpc0NvcmUsIGZvcm1hdCwgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzLCB0cnVlLFxuICAgICAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fWApO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oYnVuZGxlKTtcbiAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICBpZiAocmVzdWx0LmRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBsb2dnZXIud2FybihyZXBsYWNlVHNXaXRoTmdJbkVycm9ycyhcbiAgICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KSkpO1xuICAgICAgICB9XG4gICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoYnVuZGxlLCByZXN1bHQudHJhbnNmb3JtZWRGaWxlcywgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVycm9ycyA9IHJlcGxhY2VUc1dpdGhOZ0luRXJyb3JzKFxuICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBlbnRyeS1wb2ludCAke2VudHJ5UG9pbnQubmFtZX0gKCR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fSkgZHVlIHRvIGNvbXBpbGF0aW9uIGVycm9yczpcXG4ke2Vycm9yc31gKTtcbiAgICAgIH1cblxuICAgICAgbG9nZ2VyLmRlYnVnKGAgIFN1Y2Nlc3NmdWxseSBjb21waWxlZCAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fWApO1xuXG4gICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZCk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBUaGUgZXhlY3V0b3IgZm9yIGFjdHVhbGx5IHBsYW5uaW5nIGFuZCBnZXR0aW5nIHRoZSB3b3JrIGRvbmUuXG4gIGNvbnN0IGV4ZWN1dG9yID0gZ2V0RXhlY3V0b3IoYXN5bmMsIGluUGFyYWxsZWwsIGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIsIG5ldyBMb2NrRmlsZShmaWxlU3lzdGVtKSk7XG5cbiAgcmV0dXJuIGV4ZWN1dG9yLmV4ZWN1dGUoYW5hbHl6ZUVudHJ5UG9pbnRzLCBjcmVhdGVDb21waWxlRm4pO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVTdXBwb3J0ZWRQcm9wZXJ0aWVzKHByb3BlcnRpZXM6IHN0cmluZ1tdKTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdIHtcbiAgLy8gU2hvcnQtY2lyY3VpdCB0aGUgY2FzZSB3aGVyZSBgcHJvcGVydGllc2AgaGFzIGZhbGxlbiBiYWNrIHRvIHRoZSBkZWZhdWx0IHZhbHVlOlxuICAvLyBgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTYFxuICBpZiAocHJvcGVydGllcyA9PT0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSByZXR1cm4gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTO1xuXG4gIGNvbnN0IHN1cHBvcnRlZFByb3BlcnRpZXM6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzIGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSkge1xuICAgIGlmIChTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuaW5kZXhPZihwcm9wKSAhPT0gLTEpIHtcbiAgICAgIHN1cHBvcnRlZFByb3BlcnRpZXMucHVzaChwcm9wKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc3VwcG9ydGVkUHJvcGVydGllcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBObyBzdXBwb3J0ZWQgZm9ybWF0IHByb3BlcnR5IHRvIGNvbnNpZGVyIGFtb25nIFske3Byb3BlcnRpZXMuam9pbignLCAnKX1dLiBgICtcbiAgICAgICAgYFN1cHBvcnRlZCBwcm9wZXJ0aWVzOiAke1NVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUy5qb2luKCcsICcpfWApO1xuICB9XG5cbiAgcmV0dXJuIHN1cHBvcnRlZFByb3BlcnRpZXM7XG59XG5cbmZ1bmN0aW9uIGdldFBhY2thZ2VKc29uVXBkYXRlcihpblBhcmFsbGVsOiBib29sZWFuLCBmczogRmlsZVN5c3RlbSk6IFBhY2thZ2VKc29uVXBkYXRlciB7XG4gIGNvbnN0IGRpcmVjdFBrZ0pzb25VcGRhdGVyID0gbmV3IERpcmVjdFBhY2thZ2VKc29uVXBkYXRlcihmcyk7XG4gIHJldHVybiBpblBhcmFsbGVsID8gbmV3IENsdXN0ZXJQYWNrYWdlSnNvblVwZGF0ZXIoZGlyZWN0UGtnSnNvblVwZGF0ZXIpIDogZGlyZWN0UGtnSnNvblVwZGF0ZXI7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVXcml0ZXIoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsXG4gICAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM6IGJvb2xlYW4pOiBGaWxlV3JpdGVyIHtcbiAgcmV0dXJuIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID8gbmV3IE5ld0VudHJ5UG9pbnRGaWxlV3JpdGVyKGZzLCBwa2dKc29uVXBkYXRlcikgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSW5QbGFjZUZpbGVXcml0ZXIoZnMpO1xufVxuXG5mdW5jdGlvbiBnZXRUYXNrUXVldWUoXG4gICAgaW5QYXJhbGxlbDogYm9vbGVhbiwgdGFza3M6IFBhcnRpYWxseU9yZGVyZWRUYXNrcywgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+KTogVGFza1F1ZXVlIHtcbiAgcmV0dXJuIGluUGFyYWxsZWwgPyBuZXcgUGFyYWxsZWxUYXNrUXVldWUodGFza3MsIGdyYXBoKSA6IG5ldyBTZXJpYWxUYXNrUXVldWUodGFza3MpO1xufVxuXG5mdW5jdGlvbiBnZXRFeGVjdXRvcihcbiAgICBhc3luYzogYm9vbGVhbiwgaW5QYXJhbGxlbDogYm9vbGVhbiwgbG9nZ2VyOiBMb2dnZXIsIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsXG4gICAgbG9ja0ZpbGU6IExvY2tGaWxlKTogRXhlY3V0b3Ige1xuICBpZiAoaW5QYXJhbGxlbCkge1xuICAgIC8vIEV4ZWN1dGUgaW4gcGFyYWxsZWwgKHdoaWNoIGltcGxpZXMgYXN5bmMpLlxuICAgIC8vIFVzZSB1cCB0byA4IENQVSBjb3JlcyBmb3Igd29ya2VycywgYWx3YXlzIHJlc2VydmluZyBvbmUgZm9yIG1hc3Rlci5cbiAgICBjb25zdCB3b3JrZXJDb3VudCA9IE1hdGgubWluKDgsIG9zLmNwdXMoKS5sZW5ndGggLSAxKTtcbiAgICByZXR1cm4gbmV3IENsdXN0ZXJFeGVjdXRvcih3b3JrZXJDb3VudCwgbG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgbG9ja0ZpbGUpO1xuICB9IGVsc2Uge1xuICAgIC8vIEV4ZWN1dGUgc2VyaWFsbHksIG9uIGEgc2luZ2xlIHRocmVhZCAoZWl0aGVyIHN5bmMgb3IgYXN5bmMpLlxuICAgIHJldHVybiBhc3luYyA/IG5ldyBBc3luY1NpbmdsZVByb2Nlc3NFeGVjdXRvcihsb2dnZXIsIHBrZ0pzb25VcGRhdGVyLCBsb2NrRmlsZSkgOlxuICAgICAgICAgICAgICAgICAgIG5ldyBTaW5nbGVQcm9jZXNzRXhlY3V0b3IobG9nZ2VyLCBwa2dKc29uVXBkYXRlciwgbG9ja0ZpbGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBsb2dnZXI6IExvZ2dlcixcbiAgICByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgdGFyZ2V0RW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoIHwgdW5kZWZpbmVkLCBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8XG4gICAgICAgIHVuZGVmaW5lZCk6IHtlbnRyeVBvaW50czogUGFydGlhbGx5T3JkZXJlZEVudHJ5UG9pbnRzLCBncmFwaDogRGVwR3JhcGg8RW50cnlQb2ludD59IHtcbiAgY29uc3Qge2VudHJ5UG9pbnRzLCBpbnZhbGlkRW50cnlQb2ludHMsIGdyYXBofSA9ICh0YXJnZXRFbnRyeVBvaW50UGF0aCAhPT0gdW5kZWZpbmVkKSA/XG4gICAgICBnZXRUYXJnZXRlZEVudHJ5UG9pbnRzKFxuICAgICAgICAgIGZzLCBwa2dKc29uVXBkYXRlciwgbG9nZ2VyLCByZXNvbHZlciwgY29uZmlnLCBiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgsXG4gICAgICAgICAgcGF0aE1hcHBpbmdzKSA6XG4gICAgICBnZXRBbGxFbnRyeVBvaW50cyhmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzKTtcbiAgcmV0dXJuIHtlbnRyeVBvaW50cywgZ3JhcGh9O1xufVxuXG5mdW5jdGlvbiBnZXRUYXJnZXRlZEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBsb2dnZXI6IExvZ2dlcixcbiAgICByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICBjb25zdCBmaW5kZXIgPSBuZXcgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVudHJ5UG9pbnRJbmZvID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xuICBjb25zdCBpbnZhbGlkVGFyZ2V0ID0gZW50cnlQb2ludEluZm8uaW52YWxpZEVudHJ5UG9pbnRzLmZpbmQoXG4gICAgICBpID0+IGkuZW50cnlQb2ludC5wYXRoID09PSBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoKTtcbiAgaWYgKGludmFsaWRUYXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRoZSB0YXJnZXQgZW50cnktcG9pbnQgXCIke2ludmFsaWRUYXJnZXQuZW50cnlQb2ludC5uYW1lfVwiIGhhcyBtaXNzaW5nIGRlcGVuZGVuY2llczpcXG5gICtcbiAgICAgICAgaW52YWxpZFRhcmdldC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfVxcbmApLmpvaW4oJycpKTtcbiAgfVxuICBpZiAoZW50cnlQb2ludEluZm8uZW50cnlQb2ludHMubGVuZ3RoID09PSAwKSB7XG4gICAgbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoZnMsIHBrZ0pzb25VcGRhdGVyLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoKTtcbiAgfVxuICByZXR1cm4gZW50cnlQb2ludEluZm87XG59XG5cbmZ1bmN0aW9uIGdldEFsbEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlcixcbiAgICBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgY29uc3QgZmluZGVyID1cbiAgICAgIG5ldyBEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyKGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICByZXR1cm4gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xufVxuXG5mdW5jdGlvbiBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgIGZzOiBGaWxlU3lzdGVtLCB0YXJnZXRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUodGFyZ2V0UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAvLyBJdCBtaWdodCBiZSB0aGF0IHRoaXMgdGFyZ2V0IGlzIGNvbmZpZ3VyZWQgaW4gd2hpY2ggY2FzZSBpdHMgcGFja2FnZS5qc29uIG1pZ2h0IG5vdCBleGlzdC5cbiAgaWYgKCFmcy5leGlzdHMocGFja2FnZUpzb25QYXRoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGlmIChwYWNrYWdlSnNvbltwcm9wZXJ0eV0pIHtcbiAgICAgIC8vIEhlcmUgaXMgYSBwcm9wZXJ0eSB0aGF0IHNob3VsZCBiZSBwcm9jZXNzZWRcbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBwcm9wZXJ0eSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5LCB0YXJnZXRQYXRoKSkge1xuICAgICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgICAgLy8gSXQgaGFzIGJlZW4gcHJvY2Vzc2VkIGFuZCB3ZSBvbmx5IG5lZWQgb25lLCBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQgaGFzIG5vdCBiZWVuIHByb2Nlc3NlZCBidXQgd2UgbmVlZCBhbGwgb2YgdGhlbSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gRWl0aGVyIGFsbCBmb3JtYXRzIG5lZWQgdG8gYmUgY29tcGlsZWQgYW5kIHRoZXJlIHdlcmUgbm9uZSB0aGF0IHdlcmUgdW5wcm9jZXNzZWQsXG4gIC8vIE9yIG9ubHkgdGhlIG9uZSBtYXRjaGluZyBmb3JtYXQgbmVlZHMgdG8gYmUgY29tcGlsZWQgYnV0IHRoZXJlIHdhcyBhdCBsZWFzdCBvbmUgbWF0Y2hpbmdcbiAgLy8gcHJvcGVydHkgYmVmb3JlIHRoZSBmaXJzdCBwcm9jZXNzZWQgZm9ybWF0IHRoYXQgd2FzIHVucHJvY2Vzc2VkLlxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBJZiB3ZSBnZXQgaGVyZSwgdGhlbiB0aGUgcmVxdWVzdGVkIGVudHJ5LXBvaW50IGRpZCBub3QgY29udGFpbiBhbnl0aGluZyBjb21waWxlZCBieVxuICogdGhlIG9sZCBBbmd1bGFyIGNvbXBpbGVyLiBUaGVyZWZvcmUgdGhlcmUgaXMgbm90aGluZyBmb3IgbmdjYyB0byBkby5cbiAqIFNvIG1hcmsgYWxsIGZvcm1hdHMgaW4gdGhpcyBlbnRyeS1wb2ludCBhcyBwcm9jZXNzZWQgc28gdGhhdCBjbGllbnRzIG9mIG5nY2MgY2FuIGF2b2lkXG4gKiB0cmlnZ2VyaW5nIG5nY2MgZm9yIHRoaXMgZW50cnktcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAqL1xuZnVuY3Rpb24gbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIHBhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUocGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgLy8gTm90ZTogV2UgYXJlIG1hcmtpbmcgYWxsIHN1cHBvcnRlZCBwcm9wZXJ0aWVzIGFzIHByb2Nlc3NlZCwgZXZlbiBpZiB0aGV5IGRvbid0IGV4aXN0IGluIHRoZVxuICAvLyAgICAgICBgcGFja2FnZS5qc29uYCBmaWxlLiBXaGlsZSB0aGlzIGlzIHJlZHVuZGFudCwgaXQgaXMgYWxzbyBoYXJtbGVzcy5cbiAgbWFya0FzUHJvY2Vzc2VkKHBrZ0pzb25VcGRhdGVyLCBwYWNrYWdlSnNvbiwgcGFja2FnZUpzb25QYXRoLCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpO1xufVxuXG5mdW5jdGlvbiBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyOiBMb2dnZXIsIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXSk6IHZvaWQge1xuICBpbnZhbGlkRW50cnlQb2ludHMuZm9yRWFjaChpbnZhbGlkRW50cnlQb2ludCA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgSW52YWxpZCBlbnRyeS1wb2ludCAke2ludmFsaWRFbnRyeVBvaW50LmVudHJ5UG9pbnQucGF0aH0uYCxcbiAgICAgICAgYEl0IGlzIG1pc3NpbmcgcmVxdWlyZWQgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICAgICAgaW52YWxpZEVudHJ5UG9pbnQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1gKS5qb2luKCdcXG4nKSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gY29tcHV0ZXMgYW5kIHJldHVybnMgdGhlIGZvbGxvd2luZzpcbiAqIC0gYHByb3BlcnRpZXNUb1Byb2Nlc3NgOiBBbiAob3JkZXJlZCkgbGlzdCBvZiBwcm9wZXJ0aWVzIHRoYXQgZXhpc3QgYW5kIG5lZWQgdG8gYmUgcHJvY2Vzc2VkLFxuICogICBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYHByb3BlcnRpZXNUb0NvbnNpZGVyYCwgdGhlIHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgYW5kIHRoZWlyXG4gKiAgIGNvcnJlc3BvbmRpbmcgZm9ybWF0LXBhdGhzLiBOT1RFOiBPbmx5IG9uZSBwcm9wZXJ0eSBwZXIgZm9ybWF0LXBhdGggbmVlZHMgdG8gYmUgcHJvY2Vzc2VkLlxuICogLSBgZXF1aXZhbGVudFByb3BlcnRpZXNNYXBgOiBBIG1hcHBpbmcgZnJvbSBlYWNoIHByb3BlcnR5IGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCB0byB0aGUgbGlzdCBvZlxuICogICBvdGhlciBmb3JtYXQgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCB0aGF0IG5lZWQgdG8gYmUgbWFya2VkIGFzIHByb2Nlc3NlZCBhcyBzb29uIGFzIHRoZVxuICogICBmb3JtZXIgaGFzIGJlZW4gcHJvY2Vzc2VkLlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0aWVzVG9Qcm9jZXNzKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pOiB7XG4gIHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXTtcbiAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXA6IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+O1xufSB7XG4gIGNvbnN0IGZvcm1hdFBhdGhzVG9Db25zaWRlciA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGNvbnN0IHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgZGVmaW5lZCBpbiBgcGFja2FnZS5qc29uYC5cbiAgICBpZiAodHlwZW9mIGZvcm1hdFBhdGggIT09ICdzdHJpbmcnKSBjb250aW51ZTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgbWFwIHRvIHRoZSBzYW1lIGZvcm1hdC1wYXRoIGFzIGEgcHJlY2VkaW5nIHByb3BlcnR5LlxuICAgIGlmIChmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIFByb2Nlc3MgdGhpcyBwcm9wZXJ0eSwgYmVjYXVzZSBpdCBpcyB0aGUgZmlyc3Qgb25lIHRvIG1hcCB0byB0aGlzIGZvcm1hdC1wYXRoLlxuICAgIGZvcm1hdFBhdGhzVG9Db25zaWRlci5hZGQoZm9ybWF0UGF0aCk7XG4gICAgcHJvcGVydGllc1RvUHJvY2Vzcy5wdXNoKHByb3ApO1xuXG4gICAgLy8gSWYgd2Ugb25seSBuZWVkIG9uZSBmb3JtYXQgcHJvY2Vzc2VkLCB0aGVyZSBpcyBubyBuZWVkIHRvIHByb2Nlc3MgYW55IG1vcmUgcHJvcGVydGllcy5cbiAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSBicmVhaztcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXM6IHtbZm9ybWF0UGF0aDogc3RyaW5nXTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdfSA9IHt9O1xuICBmb3IgKGNvbnN0IHByb3Agb2YgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGRvIG5vdCBtYXAgdG8gYSBmb3JtYXQtcGF0aCB0aGF0IHdpbGwgYmUgY29uc2lkZXJlZC5cbiAgICBpZiAoIWZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gQWRkIHRoaXMgcHJvcGVydHkgdG8gdGhlIG1hcC5cbiAgICBjb25zdCBsaXN0ID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSB8fCAoZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSA9IFtdKTtcbiAgICBsaXN0LnB1c2gocHJvcCk7XG4gIH1cblxuICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllc01hcCA9IG5ldyBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPigpO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF0gITtcbiAgICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllcyA9IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF07XG4gICAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXAuc2V0KHByb3AsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzKTtcbiAgfVxuXG4gIHJldHVybiB7cHJvcGVydGllc1RvUHJvY2VzcywgZXF1aXZhbGVudFByb3BlcnRpZXNNYXB9O1xufVxuIl19