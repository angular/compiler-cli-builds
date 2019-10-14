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
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "dependency-graph", "os", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/execution/cluster/executor", "@angular/compiler-cli/ngcc/src/execution/cluster/package_json_updater", "@angular/compiler-cli/ngcc/src/execution/single_process_executor", "@angular/compiler-cli/ngcc/src/execution/task_selection/parallel_task_queue", "@angular/compiler-cli/ngcc/src/execution/task_selection/serial_task_queue", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", "@angular/compiler-cli/ngcc/src/writing/package_json_updater"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /// <reference types="node" />
    var dependency_graph_1 = require("dependency-graph");
    var os = require("os");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var commonjs_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host");
    var dependency_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver");
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
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _b = _a.propertiesToConsider, propertiesToConsider = _b === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _b, _c = _a.compileAllFormats, compileAllFormats = _c === void 0 ? true : _c, _d = _a.createNewEntryPointFormats, createNewEntryPointFormats = _d === void 0 ? false : _d, _e = _a.logger, logger = _e === void 0 ? new console_logger_1.ConsoleLogger(console_logger_1.LogLevel.info) : _e, pathMappings = _a.pathMappings, _f = _a.async, async = _f === void 0 ? false : _f;
        // Execute in parallel, if async execution is acceptable and there are more than 1 CPU cores.
        var inParallel = async && (os.cpus().length > 1);
        // Instantiate common utilities that are always used.
        // NOTE: Avoid eagerly instantiating anything that might not be used when running sync/async or in
        //       master/worker process.
        var fileSystem = file_system_1.getFileSystem();
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
            var supportedPropertiesToConsider = ensureSupportedProperties(propertiesToConsider);
            var moduleResolver = new module_resolver_1.ModuleResolver(fileSystem, pathMappings);
            var esmDependencyHost = new esm_dependency_host_1.EsmDependencyHost(fileSystem, moduleResolver);
            var umdDependencyHost = new umd_dependency_host_1.UmdDependencyHost(fileSystem, moduleResolver);
            var commonJsDependencyHost = new commonjs_dependency_host_1.CommonJsDependencyHost(fileSystem, moduleResolver);
            var dependencyResolver = new dependency_resolver_1.DependencyResolver(fileSystem, logger, {
                esm5: esmDependencyHost,
                esm2015: esmDependencyHost,
                umd: umdDependencyHost,
                commonjs: commonJsDependencyHost
            });
            var absBasePath = file_system_1.absoluteFrom(basePath);
            var config = new configuration_1.NgccConfiguration(fileSystem, file_system_1.dirname(absBasePath));
            var _c = getEntryPoints(fileSystem, pkgJsonUpdater, logger, dependencyResolver, config, absBasePath, targetEntryPointPath, pathMappings, supportedPropertiesToConsider, compileAllFormats), entryPoints = _c.entryPoints, graph = _c.graph;
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
                var bundle = entry_point_bundle_1.makeEntryPointBundle(fileSystem, entryPoint, formatPath, isCore, format, processDts, pathMappings, true);
                logger.info("Compiling " + entryPoint.name + " : " + formatProperty + " as " + format);
                var result = transformer.transform(bundle);
                if (result.success) {
                    if (result.diagnostics.length > 0) {
                        logger.warn(ts.formatDiagnostics(result.diagnostics, bundle.src.host));
                    }
                    fileWriter.writeBundle(bundle, result.transformedFiles, formatPropertiesToMarkAsProcessed);
                }
                else {
                    var errors = ts.formatDiagnostics(result.diagnostics, bundle.src.host);
                    throw new Error("Failed to compile entry-point " + entryPoint.name + " due to compilation errors:\n" + errors);
                }
                onTaskCompleted(task, 1 /* Processed */);
            };
        };
        // The executor for actually planning and getting the work done.
        var executor = getExecutor(async, inParallel, logger, pkgJsonUpdater);
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
    function getExecutor(async, inParallel, logger, pkgJsonUpdater) {
        if (inParallel) {
            // Execute in parallel (which implies async).
            // Use up to 8 CPU cores for workers, always reserving one for master.
            var workerCount = Math.min(8, os.cpus().length - 1);
            return new executor_1.ClusterExecutor(workerCount, logger, pkgJsonUpdater);
        }
        else {
            // Execute serially, on a single thread (either sync or async).
            return async ? new single_process_executor_1.AsyncSingleProcessExecutor(logger, pkgJsonUpdater) :
                new single_process_executor_1.SingleProcessExecutor(logger, pkgJsonUpdater);
        }
    }
    function getEntryPoints(fs, pkgJsonUpdater, logger, resolver, config, basePath, targetEntryPointPath, pathMappings, propertiesToConsider, compileAllFormats) {
        var _a = (targetEntryPointPath !== undefined) ?
            getTargetedEntryPoints(fs, pkgJsonUpdater, logger, resolver, config, basePath, targetEntryPointPath, propertiesToConsider, compileAllFormats, pathMappings) :
            getAllEntryPoints(fs, config, logger, resolver, basePath, pathMappings), entryPoints = _a.entryPoints, invalidEntryPoints = _a.invalidEntryPoints, graph = _a.graph;
        logInvalidEntryPoints(logger, invalidEntryPoints);
        return { entryPoints: entryPoints, graph: graph };
    }
    function getTargetedEntryPoints(fs, pkgJsonUpdater, logger, resolver, config, basePath, targetEntryPointPath, propertiesToConsider, compileAllFormats, pathMappings) {
        var absoluteTargetEntryPointPath = file_system_1.resolve(basePath, targetEntryPointPath);
        if (hasProcessedTargetEntryPoint(fs, absoluteTargetEntryPointPath, propertiesToConsider, compileAllFormats)) {
            logger.debug('The target entry-point has already been processed');
            return {
                entryPoints: [],
                invalidEntryPoints: [],
                ignoredDependencies: [],
                graph: EMPTY_GRAPH,
            };
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhCQUE4QjtJQUU5QixxREFBMEM7SUFDMUMsdUJBQXlCO0lBQ3pCLCtCQUFpQztJQUVqQywyRUFBc0g7SUFFdEgsaUhBQStFO0lBQy9FLHVHQUE2STtJQUM3SSx1R0FBcUU7SUFDckUsK0ZBQThEO0lBQzlELHVHQUFxRTtJQUNyRSw2SUFBeUc7SUFDekcsNkhBQTBGO0lBRTFGLHNGQUE2RDtJQUM3RCw4R0FBbUY7SUFDbkYsNEdBQXNHO0lBQ3RHLG1IQUFpRjtJQUNqRiwrR0FBNkU7SUFDN0Usd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSx1RkFBMkQ7SUFDM0QsbUZBQW1KO0lBQ25KLGlHQUFtRTtJQUNuRSxtRkFBbUQ7SUFHbkQsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQUM5RSxvR0FBNEY7SUF1RTVGLElBQU0sV0FBVyxHQUFHLElBQUksMkJBQVEsRUFBYyxDQUFDO0lBWS9DLFNBQWdCLFFBQVEsQ0FDcEIsRUFFcUY7WUFGcEYsc0JBQVEsRUFBRSw4Q0FBb0IsRUFBRSw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xGLHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFBRSxrQ0FBa0MsRUFBbEMsdURBQWtDLEVBQzVELGNBQXlDLEVBQXpDLGdHQUF5QyxFQUFFLDhCQUFZLEVBQUUsYUFBYSxFQUFiLGtDQUFhO1FBRXpFLDZGQUE2RjtRQUM3RixJQUFNLFVBQVUsR0FBRyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRW5ELHFEQUFxRDtRQUNyRCxrR0FBa0c7UUFDbEcsK0JBQStCO1FBQy9CLElBQU0sVUFBVSxHQUFHLDJCQUFh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QUMsQ0FBQzthQUN6RDs7Ozs7Ozs7O1FBRUQsT0FBTyxFQUFDLG1CQUFtQixxQkFBQSxFQUFFLHVCQUF1Qix5QkFBQSxFQUFDLENBQUM7SUFDeEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuaW1wb3J0IHtEZXBHcmFwaH0gZnJvbSAnZGVwZW5kZW5jeS1ncmFwaCc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgYWJzb2x1dGVGcm9tLCBkaXJuYW1lLCBnZXRGaWxlU3lzdGVtLCByZXNvbHZlfSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge0NvbW1vbkpzRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2NvbW1vbmpzX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlciwgSW52YWxpZEVudHJ5UG9pbnQsIFBhcnRpYWxseU9yZGVyZWRFbnRyeVBvaW50cywgU29ydGVkRW50cnlQb2ludHNJbmZvfSBmcm9tICcuL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7RXNtRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2VzbV9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvbW9kdWxlX3Jlc29sdmVyJztcbmltcG9ydCB7VW1kRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL3VtZF9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci9kaXJlY3Rvcnlfd2Fsa2VyX2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge1RhcmdldGVkRW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvdGFyZ2V0ZWRfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7QW5hbHl6ZUVudHJ5UG9pbnRzRm4sIENyZWF0ZUNvbXBpbGVGbiwgRXhlY3V0b3IsIFBhcnRpYWxseU9yZGVyZWRUYXNrcywgVGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLCBUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL2FwaSc7XG5pbXBvcnQge0NsdXN0ZXJFeGVjdXRvcn0gZnJvbSAnLi9leGVjdXRpb24vY2x1c3Rlci9leGVjdXRvcic7XG5pbXBvcnQge0NsdXN0ZXJQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4vZXhlY3V0aW9uL2NsdXN0ZXIvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtBc3luY1NpbmdsZVByb2Nlc3NFeGVjdXRvciwgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yfSBmcm9tICcuL2V4ZWN1dGlvbi9zaW5nbGVfcHJvY2Vzc19leGVjdXRvcic7XG5pbXBvcnQge1BhcmFsbGVsVGFza1F1ZXVlfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrX3NlbGVjdGlvbi9wYXJhbGxlbF90YXNrX3F1ZXVlJztcbmltcG9ydCB7U2VyaWFsVGFza1F1ZXVlfSBmcm9tICcuL2V4ZWN1dGlvbi90YXNrX3NlbGVjdGlvbi9zZXJpYWxfdGFza19xdWV1ZSc7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtoYXNCZWVuUHJvY2Vzc2VkLCBtYXJrQXNQcm9jZXNzZWR9IGZyb20gJy4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7bWFrZUVudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIsIFBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi93cml0aW5nL3BhY2thZ2VfanNvbl91cGRhdGVyJztcblxuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlciBmb3Igc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN5bmNOZ2NjT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2VzIHRvIHByb2Nlc3MuICovXG4gIGJhc2VQYXRoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBwYXRoIHRvIHRoZSBwcmltYXJ5IHBhY2thZ2UgdG8gYmUgcHJvY2Vzc2VkLiBJZiBub3QgYWJzb2x1dGUgdGhlbiBpdCBtdXN0IGJlIHJlbGF0aXZlIHRvXG4gICAqIGBiYXNlUGF0aGAuXG4gICAqXG4gICAqIEFsbCBpdHMgZGVwZW5kZW5jaWVzIHdpbGwgbmVlZCB0byBiZSBwcm9jZXNzZWQgdG9vLlxuICAgKi9cbiAgdGFyZ2V0RW50cnlQb2ludFBhdGg/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoaWNoIGVudHJ5LXBvaW50IHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbiB0byBjb25zaWRlciB3aGVuIHByb2Nlc3NpbmcgYW4gZW50cnktcG9pbnQuXG4gICAqIEVhY2ggcHJvcGVydHkgc2hvdWxkIGhvbGQgYSBwYXRoIHRvIHRoZSBwYXJ0aWN1bGFyIGJ1bmRsZSBmb3JtYXQgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAgICogRGVmYXVsdHMgdG8gYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24uXG4gICAqL1xuICBwcm9wZXJ0aWVzVG9Db25zaWRlcj86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHByb2Nlc3MgYWxsIGZvcm1hdHMgc3BlY2lmaWVkIGJ5IChgcHJvcGVydGllc1RvQ29uc2lkZXJgKSAgb3IgdG8gc3RvcCBwcm9jZXNzaW5nXG4gICAqIHRoaXMgZW50cnktcG9pbnQgYXQgdGhlIGZpcnN0IG1hdGNoaW5nIGZvcm1hdC4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgY29tcGlsZUFsbEZvcm1hdHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNyZWF0ZSBuZXcgZW50cnktcG9pbnRzIGJ1bmRsZXMgcmF0aGVyIHRoYW4gb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIGZpbGVzLlxuICAgKi9cbiAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlIGEgbG9nZ2VyIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBsb2cgbWVzc2FnZXMuXG4gICAqL1xuICBsb2dnZXI/OiBMb2dnZXI7XG5cbiAgLyoqXG4gICAqIFBhdGhzIG1hcHBpbmcgY29uZmlndXJhdGlvbiAoYHBhdGhzYCBhbmQgYGJhc2VVcmxgKSwgYXMgZm91bmQgaW4gYHRzLkNvbXBpbGVyT3B0aW9uc2AuXG4gICAqIFRoZXNlIGFyZSB1c2VkIHRvIHJlc29sdmUgcGF0aHMgdG8gbG9jYWxseSBidWlsdCBBbmd1bGFyIGxpYnJhcmllcy5cbiAgICovXG4gIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncztcblxuICAvKipcbiAgICogUHJvdmlkZSBhIGZpbGUtc3lzdGVtIHNlcnZpY2UgdGhhdCB3aWxsIGJlIHVzZWQgYnkgbmdjYyBmb3IgYWxsIGZpbGUgaW50ZXJhY3Rpb25zLlxuICAgKi9cbiAgZmlsZVN5c3RlbT86IEZpbGVTeXN0ZW07XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGNvbXBpbGF0aW9uIHNob3VsZCBydW4gYW5kIHJldHVybiBhc3luY2hyb25vdXNseS4gQWxsb3dpbmcgYXN5bmNocm9ub3VzIGV4ZWN1dGlvblxuICAgKiBtYXkgc3BlZWQgdXAgdGhlIGNvbXBpbGF0aW9uIGJ5IHV0aWxpemluZyBtdWx0aXBsZSBDUFUgY29yZXMgKGlmIGF2YWlsYWJsZSkuXG4gICAqXG4gICAqIERlZmF1bHQ6IGBmYWxzZWAgKGkuZS4gcnVuIHN5bmNocm9ub3VzbHkpXG4gICAqL1xuICBhc3luYz86IGZhbHNlO1xufVxuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlciBmb3IgYXN5bmNocm9ub3VzIGV4ZWN1dGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgQXN5bmNOZ2NjT3B0aW9ucyA9IE9taXQ8U3luY05nY2NPcHRpb25zLCAnYXN5bmMnPiYge2FzeW5jOiB0cnVlfTtcblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCB0eXBlIE5nY2NPcHRpb25zID0gQXN5bmNOZ2NjT3B0aW9ucyB8IFN5bmNOZ2NjT3B0aW9ucztcblxuY29uc3QgRU1QVFlfR1JBUEggPSBuZXcgRGVwR3JhcGg8RW50cnlQb2ludD4oKTtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGludG8gbmdjYyAoYU5HdWxhciBDb21wYXRpYmlsaXR5IENvbXBpbGVyKS5cbiAqXG4gKiBZb3UgY2FuIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBwcm9jZXNzIG9uZSBvciBtb3JlIG5wbSBwYWNrYWdlcywgdG8gZW5zdXJlXG4gKiB0aGF0IHRoZXkgYXJlIGNvbXBhdGlibGUgd2l0aCB0aGUgaXZ5IGNvbXBpbGVyIChuZ3RzYykuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgVGhlIG9wdGlvbnMgdGVsbGluZyBuZ2NjIHdoYXQgdG8gY29tcGlsZSBhbmQgaG93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogQXN5bmNOZ2NjT3B0aW9ucyk6IFByb21pc2U8dm9pZD47XG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Mob3B0aW9uczogU3luY05nY2NPcHRpb25zKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhcbiAgICB7YmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgICAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSwgcGF0aE1hcHBpbmdzLCBhc3luYyA9IGZhbHNlfTogTmdjY09wdGlvbnMpOiB2b2lkfFxuICAgIFByb21pc2U8dm9pZD4ge1xuICAvLyBFeGVjdXRlIGluIHBhcmFsbGVsLCBpZiBhc3luYyBleGVjdXRpb24gaXMgYWNjZXB0YWJsZSBhbmQgdGhlcmUgYXJlIG1vcmUgdGhhbiAxIENQVSBjb3Jlcy5cbiAgY29uc3QgaW5QYXJhbGxlbCA9IGFzeW5jICYmIChvcy5jcHVzKCkubGVuZ3RoID4gMSk7XG5cbiAgLy8gSW5zdGFudGlhdGUgY29tbW9uIHV0aWxpdGllcyB0aGF0IGFyZSBhbHdheXMgdXNlZC5cbiAgLy8gTk9URTogQXZvaWQgZWFnZXJseSBpbnN0YW50aWF0aW5nIGFueXRoaW5nIHRoYXQgbWlnaHQgbm90IGJlIHVzZWQgd2hlbiBydW5uaW5nIHN5bmMvYXN5bmMgb3IgaW5cbiAgLy8gICAgICAgbWFzdGVyL3dvcmtlciBwcm9jZXNzLlxuICBjb25zdCBmaWxlU3lzdGVtID0gZ2V0RmlsZVN5c3RlbSgpO1xuICAvLyBOT1RFOiBUbyBhdm9pZCBmaWxlIGNvcnJ1cHRpb24sIGVuc3VyZSB0aGF0IGVhY2ggYG5nY2NgIGludm9jYXRpb24gb25seSBjcmVhdGVzIF9vbmVfIGluc3RhbmNlXG4gIC8vICAgICAgIG9mIGBQYWNrYWdlSnNvblVwZGF0ZXJgIHRoYXQgYWN0dWFsbHkgd3JpdGVzIHRvIGRpc2sgKGFjcm9zcyBhbGwgcHJvY2Vzc2VzKS5cbiAgLy8gICAgICAgVGhpcyBpcyBoYXJkIHRvIGVuZm9yY2UgYXV0b21hdGljYWxseSwgd2hlbiBydW5uaW5nIG9uIG11bHRpcGxlIHByb2Nlc3Nlcywgc28gbmVlZHMgdG8gYmVcbiAgLy8gICAgICAgZW5mb3JjZWQgbWFudWFsbHkuXG4gIGNvbnN0IHBrZ0pzb25VcGRhdGVyID0gZ2V0UGFja2FnZUpzb25VcGRhdGVyKGluUGFyYWxsZWwsIGZpbGVTeXN0ZW0pO1xuXG4gIC8vIFRoZSBmdW5jdGlvbiBmb3IgcGVyZm9ybWluZyB0aGUgYW5hbHlzaXMuXG4gIGNvbnN0IGFuYWx5emVFbnRyeVBvaW50czogQW5hbHl6ZUVudHJ5UG9pbnRzRm4gPSAoKSA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKCdBbmFseXppbmcgZW50cnktcG9pbnRzLi4uJyk7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIGNvbnN0IHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyID0gZW5zdXJlU3VwcG9ydGVkUHJvcGVydGllcyhwcm9wZXJ0aWVzVG9Db25zaWRlcik7XG5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcihmaWxlU3lzdGVtLCBwYXRoTWFwcGluZ3MpO1xuICAgIGNvbnN0IGVzbURlcGVuZGVuY3lIb3N0ID0gbmV3IEVzbURlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gICAgY29uc3QgY29tbW9uSnNEZXBlbmRlbmN5SG9zdCA9IG5ldyBDb21tb25Kc0RlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgICBjb25zdCBkZXBlbmRlbmN5UmVzb2x2ZXIgPSBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKGZpbGVTeXN0ZW0sIGxvZ2dlciwge1xuICAgICAgZXNtNTogZXNtRGVwZW5kZW5jeUhvc3QsXG4gICAgICBlc20yMDE1OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICAgIHVtZDogdW1kRGVwZW5kZW5jeUhvc3QsXG4gICAgICBjb21tb25qczogY29tbW9uSnNEZXBlbmRlbmN5SG9zdFxuICAgIH0pO1xuXG4gICAgY29uc3QgYWJzQmFzZVBhdGggPSBhYnNvbHV0ZUZyb20oYmFzZVBhdGgpO1xuICAgIGNvbnN0IGNvbmZpZyA9IG5ldyBOZ2NjQ29uZmlndXJhdGlvbihmaWxlU3lzdGVtLCBkaXJuYW1lKGFic0Jhc2VQYXRoKSk7XG4gICAgY29uc3Qge2VudHJ5UG9pbnRzLCBncmFwaH0gPSBnZXRFbnRyeVBvaW50cyhcbiAgICAgICAgZmlsZVN5c3RlbSwgcGtnSnNvblVwZGF0ZXIsIGxvZ2dlciwgZGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWcsIGFic0Jhc2VQYXRoLFxuICAgICAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCwgcGF0aE1hcHBpbmdzLCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpO1xuXG4gICAgY29uc3QgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgICAvLyBUaGUgdGFza3MgYXJlIHBhcnRpYWxseSBvcmRlcmVkIGJ5IHZpcnR1ZSBvZiB0aGUgZW50cnktcG9pbnRzIGJlaW5nIHBhcnRpYWxseSBvcmRlcmVkIHRvby5cbiAgICBjb25zdCB0YXNrczogUGFydGlhbGx5T3JkZXJlZFRhc2tzID0gW10gYXMgYW55O1xuXG4gICAgZm9yIChjb25zdCBlbnRyeVBvaW50IG9mIGVudHJ5UG9pbnRzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCBoYXNQcm9jZXNzZWRUeXBpbmdzID0gaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgJ3R5cGluZ3MnLCBlbnRyeVBvaW50LnBhdGgpO1xuICAgICAgY29uc3Qge3Byb3BlcnRpZXNUb1Byb2Nlc3MsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwfSA9XG4gICAgICAgICAgZ2V0UHJvcGVydGllc1RvUHJvY2VzcyhwYWNrYWdlSnNvbiwgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKTtcbiAgICAgIGxldCBwcm9jZXNzRHRzID0gIWhhc1Byb2Nlc3NlZFR5cGluZ3M7XG5cbiAgICAgIGlmIChwcm9wZXJ0aWVzVG9Qcm9jZXNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBUaGlzIGVudHJ5LXBvaW50IGlzIHVucHJvY2Vzc2FibGUgKGkuZS4gdGhlcmUgaXMgbm8gZm9ybWF0IHByb3BlcnR5IHRoYXQgaXMgb2YgaW50ZXJlc3RcbiAgICAgICAgLy8gYW5kIGNhbiBiZSBwcm9jZXNzZWQpLiBUaGlzIHdpbGwgcmVzdWx0IGluIGFuIGVycm9yLCBidXQgY29udGludWUgbG9vcGluZyBvdmVyXG4gICAgICAgIC8vIGVudHJ5LXBvaW50cyBpbiBvcmRlciB0byBjb2xsZWN0IGFsbCB1bnByb2Nlc3NhYmxlIG9uZXMgYW5kIGRpc3BsYXkgYSBtb3JlIGluZm9ybWF0aXZlXG4gICAgICAgIC8vIGVycm9yLlxuICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLnB1c2goZW50cnlQb2ludC5wYXRoKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybWF0UHJvcGVydHkgb2YgcHJvcGVydGllc1RvUHJvY2Vzcykge1xuICAgICAgICBjb25zdCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQgPSBlcXVpdmFsZW50UHJvcGVydGllc01hcC5nZXQoZm9ybWF0UHJvcGVydHkpICE7XG4gICAgICAgIHRhc2tzLnB1c2goe2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9KTtcblxuICAgICAgICAvLyBPbmx5IHByb2Nlc3MgdHlwaW5ncyBmb3IgdGhlIGZpcnN0IHByb3BlcnR5IChpZiBub3QgYWxyZWFkeSBwcm9jZXNzZWQpLlxuICAgICAgICBwcm9jZXNzRHRzID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGVudHJ5LXBvaW50cyBmb3Igd2hpY2ggd2UgY291bGQgbm90IHByb2Nlc3MgYW55IGZvcm1hdCBhdCBhbGwuXG4gICAgaWYgKHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdVbmFibGUgdG8gcHJvY2VzcyBhbnkgZm9ybWF0cyBmb3IgdGhlIGZvbGxvd2luZyBlbnRyeS1wb2ludHMgKHRyaWVkICcgK1xuICAgICAgICAgIGAke3Byb3BlcnRpZXNUb0NvbnNpZGVyLmpvaW4oJywgJyl9KTogYCArXG4gICAgICAgICAgdW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5tYXAocGF0aCA9PiBgXFxuICAtICR7cGF0aH1gKS5qb2luKCcnKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMDApO1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYEFuYWx5emVkICR7ZW50cnlQb2ludHMubGVuZ3RofSBlbnRyeS1wb2ludHMgaW4gJHtkdXJhdGlvbn1zLiBgICtcbiAgICAgICAgYChUb3RhbCB0YXNrczogJHt0YXNrcy5sZW5ndGh9KWApO1xuXG4gICAgcmV0dXJuIGdldFRhc2tRdWV1ZShpblBhcmFsbGVsLCB0YXNrcywgZ3JhcGgpO1xuICB9O1xuXG4gIC8vIFRoZSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgdGhlIGBjb21waWxlKClgIGZ1bmN0aW9uLlxuICBjb25zdCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbiA9IG9uVGFza0NvbXBsZXRlZCA9PiB7XG4gICAgY29uc3QgZmlsZVdyaXRlciA9IGdldEZpbGVXcml0ZXIoZmlsZVN5c3RlbSwgcGtnSnNvblVwZGF0ZXIsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcbiAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmaWxlU3lzdGVtLCBsb2dnZXIpO1xuXG4gICAgcmV0dXJuICh0YXNrOiBUYXNrKSA9PiB7XG4gICAgICBjb25zdCB7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30gPSB0YXNrO1xuXG4gICAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJzsgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5KTtcblxuICAgICAgLy8gQWxsIHByb3BlcnRpZXMgbGlzdGVkIGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCBhcmUgZ3VhcmFudGVlZCB0byBwb2ludCB0byBhIGZvcm1hdC1wYXRoXG4gICAgICAvLyAoaS5lLiB0aGV5IGFyZSBkZWZpbmVkIGluIGBlbnRyeVBvaW50LnBhY2thZ2VKc29uYCkuIEZ1cnRoZXJtb3JlLCB0aGV5IGFyZSBhbHNvIGd1YXJhbnRlZWRcbiAgICAgIC8vIHRvIGJlIGFtb25nIGBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVNgLlxuICAgICAgLy8gQmFzZWQgb24gdGhlIGFib3ZlLCBgZm9ybWF0UGF0aGAgc2hvdWxkIGFsd2F5cyBiZSBkZWZpbmVkIGFuZCBgZ2V0RW50cnlQb2ludEZvcm1hdCgpYFxuICAgICAgLy8gc2hvdWxkIGFsd2F5cyByZXR1cm4gYSBmb3JtYXQgaGVyZSAoYW5kIG5vdCBgdW5kZWZpbmVkYCkuXG4gICAgICBpZiAoIWZvcm1hdFBhdGggfHwgIWZvcm1hdCkge1xuICAgICAgICAvLyBUaGlzIHNob3VsZCBuZXZlciBoYXBwZW4uXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBJbnZhcmlhbnQgdmlvbGF0ZWQ6IE5vIGZvcm1hdC1wYXRoIG9yIGZvcm1hdCBmb3IgJHtlbnRyeVBvaW50LnBhdGh9IDogYCArXG4gICAgICAgICAgICBgJHtmb3JtYXRQcm9wZXJ0eX0gKGZvcm1hdFBhdGg6ICR7Zm9ybWF0UGF0aH0gfCBmb3JtYXQ6ICR7Zm9ybWF0fSlgKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGZvcm1hdC1wYXRoIHdoaWNoIHRoZSBwcm9wZXJ0eSBtYXBzIHRvIGlzIGFscmVhZHkgcHJvY2Vzc2VkIC0gbm90aGluZyB0byBkby5cbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBmb3JtYXRQcm9wZXJ0eSwgZW50cnlQb2ludC5wYXRoKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5BbHJlYWR5UHJvY2Vzc2VkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQYXRoLCBpc0NvcmUsIGZvcm1hdCwgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzLCB0cnVlKTtcblxuICAgICAgbG9nZ2VyLmluZm8oYENvbXBpbGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fSBhcyAke2Zvcm1hdH1gKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGJ1bmRsZSk7XG4gICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4odHMuZm9ybWF0RGlhZ25vc3RpY3MocmVzdWx0LmRpYWdub3N0aWNzLCBidW5kbGUuc3JjLmhvc3QpKTtcbiAgICAgICAgfVxuICAgICAgICBmaWxlV3JpdGVyLndyaXRlQnVuZGxlKGJ1bmRsZSwgcmVzdWx0LnRyYW5zZm9ybWVkRmlsZXMsIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBlcnJvcnMgPSB0cy5mb3JtYXREaWFnbm9zdGljcyhyZXN1bHQuZGlhZ25vc3RpY3MsIGJ1bmRsZS5zcmMuaG9zdCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBlbnRyeS1wb2ludCAke2VudHJ5UG9pbnQubmFtZX0gZHVlIHRvIGNvbXBpbGF0aW9uIGVycm9yczpcXG4ke2Vycm9yc31gKTtcbiAgICAgIH1cblxuICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5Qcm9jZXNzZWQpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gVGhlIGV4ZWN1dG9yIGZvciBhY3R1YWxseSBwbGFubmluZyBhbmQgZ2V0dGluZyB0aGUgd29yayBkb25lLlxuICBjb25zdCBleGVjdXRvciA9IGdldEV4ZWN1dG9yKGFzeW5jLCBpblBhcmFsbGVsLCBsb2dnZXIsIHBrZ0pzb25VcGRhdGVyKTtcblxuICByZXR1cm4gZXhlY3V0b3IuZXhlY3V0ZShhbmFseXplRW50cnlQb2ludHMsIGNyZWF0ZUNvbXBpbGVGbik7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllczogc3RyaW5nW10pOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10ge1xuICAvLyBTaG9ydC1jaXJjdWl0IHRoZSBjYXNlIHdoZXJlIGBwcm9wZXJ0aWVzYCBoYXMgZmFsbGVuIGJhY2sgdG8gdGhlIGRlZmF1bHQgdmFsdWU6XG4gIC8vIGBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVNgXG4gIGlmIChwcm9wZXJ0aWVzID09PSBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHJldHVybiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVM7XG5cbiAgY29uc3Qgc3VwcG9ydGVkUHJvcGVydGllczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID0gW107XG5cbiAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXMgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdKSB7XG4gICAgaWYgKFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUy5pbmRleE9mKHByb3ApICE9PSAtMSkge1xuICAgICAgc3VwcG9ydGVkUHJvcGVydGllcy5wdXNoKHByb3ApO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzdXBwb3J0ZWRQcm9wZXJ0aWVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYE5vIHN1cHBvcnRlZCBmb3JtYXQgcHJvcGVydHkgdG8gY29uc2lkZXIgYW1vbmcgWyR7cHJvcGVydGllcy5qb2luKCcsICcpfV0uIGAgK1xuICAgICAgICBgU3VwcG9ydGVkIHByb3BlcnRpZXM6ICR7U1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICByZXR1cm4gc3VwcG9ydGVkUHJvcGVydGllcztcbn1cblxuZnVuY3Rpb24gZ2V0UGFja2FnZUpzb25VcGRhdGVyKGluUGFyYWxsZWw6IGJvb2xlYW4sIGZzOiBGaWxlU3lzdGVtKTogUGFja2FnZUpzb25VcGRhdGVyIHtcbiAgY29uc3QgZGlyZWN0UGtnSnNvblVwZGF0ZXIgPSBuZXcgRGlyZWN0UGFja2FnZUpzb25VcGRhdGVyKGZzKTtcbiAgcmV0dXJuIGluUGFyYWxsZWwgPyBuZXcgQ2x1c3RlclBhY2thZ2VKc29uVXBkYXRlcihkaXJlY3RQa2dKc29uVXBkYXRlcikgOiBkaXJlY3RQa2dKc29uVXBkYXRlcjtcbn1cblxuZnVuY3Rpb24gZ2V0RmlsZVdyaXRlcihcbiAgICBmczogRmlsZVN5c3RlbSwgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlcixcbiAgICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0czogYm9vbGVhbik6IEZpbGVXcml0ZXIge1xuICByZXR1cm4gY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPyBuZXcgTmV3RW50cnlQb2ludEZpbGVXcml0ZXIoZnMsIHBrZ0pzb25VcGRhdGVyKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBJblBsYWNlRmlsZVdyaXRlcihmcyk7XG59XG5cbmZ1bmN0aW9uIGdldFRhc2tRdWV1ZShcbiAgICBpblBhcmFsbGVsOiBib29sZWFuLCB0YXNrczogUGFydGlhbGx5T3JkZXJlZFRhc2tzLCBncmFwaDogRGVwR3JhcGg8RW50cnlQb2ludD4pOiBUYXNrUXVldWUge1xuICByZXR1cm4gaW5QYXJhbGxlbCA/IG5ldyBQYXJhbGxlbFRhc2tRdWV1ZSh0YXNrcywgZ3JhcGgpIDogbmV3IFNlcmlhbFRhc2tRdWV1ZSh0YXNrcyk7XG59XG5cbmZ1bmN0aW9uIGdldEV4ZWN1dG9yKFxuICAgIGFzeW5jOiBib29sZWFuLCBpblBhcmFsbGVsOiBib29sZWFuLCBsb2dnZXI6IExvZ2dlcixcbiAgICBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyKTogRXhlY3V0b3Ige1xuICBpZiAoaW5QYXJhbGxlbCkge1xuICAgIC8vIEV4ZWN1dGUgaW4gcGFyYWxsZWwgKHdoaWNoIGltcGxpZXMgYXN5bmMpLlxuICAgIC8vIFVzZSB1cCB0byA4IENQVSBjb3JlcyBmb3Igd29ya2VycywgYWx3YXlzIHJlc2VydmluZyBvbmUgZm9yIG1hc3Rlci5cbiAgICBjb25zdCB3b3JrZXJDb3VudCA9IE1hdGgubWluKDgsIG9zLmNwdXMoKS5sZW5ndGggLSAxKTtcbiAgICByZXR1cm4gbmV3IENsdXN0ZXJFeGVjdXRvcih3b3JrZXJDb3VudCwgbG9nZ2VyLCBwa2dKc29uVXBkYXRlcik7XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhlY3V0ZSBzZXJpYWxseSwgb24gYSBzaW5nbGUgdGhyZWFkIChlaXRoZXIgc3luYyBvciBhc3luYykuXG4gICAgcmV0dXJuIGFzeW5jID8gbmV3IEFzeW5jU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yKGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIpIDpcbiAgICAgICAgICAgICAgICAgICBuZXcgU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yKGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBsb2dnZXI6IExvZ2dlcixcbiAgICByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgdGFyZ2V0RW50cnlQb2ludFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCwgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQsXG4gICAgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLCBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbik6XG4gICAge2VudHJ5UG9pbnRzOiBQYXJ0aWFsbHlPcmRlcmVkRW50cnlQb2ludHMsIGdyYXBoOiBEZXBHcmFwaDxFbnRyeVBvaW50Pn0ge1xuICBjb25zdCB7ZW50cnlQb2ludHMsIGludmFsaWRFbnRyeVBvaW50cywgZ3JhcGh9ID0gKHRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSB1bmRlZmluZWQpID9cbiAgICAgIGdldFRhcmdldGVkRW50cnlQb2ludHMoXG4gICAgICAgICAgZnMsIHBrZ0pzb25VcGRhdGVyLCBsb2dnZXIsIHJlc29sdmVyLCBjb25maWcsIGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCxcbiAgICAgICAgICBwcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMsIHBhdGhNYXBwaW5ncykgOlxuICAgICAgZ2V0QWxsRW50cnlQb2ludHMoZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIGxvZ0ludmFsaWRFbnRyeVBvaW50cyhsb2dnZXIsIGludmFsaWRFbnRyeVBvaW50cyk7XG4gIHJldHVybiB7ZW50cnlQb2ludHMsIGdyYXBofTtcbn1cblxuZnVuY3Rpb24gZ2V0VGFyZ2V0ZWRFbnRyeVBvaW50cyhcbiAgICBmczogRmlsZVN5c3RlbSwgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgbG9nZ2VyOiBMb2dnZXIsXG4gICAgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlciwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoOiBzdHJpbmcsIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSwgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4sXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID0gcmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpO1xuICBpZiAoaGFzUHJvY2Vzc2VkVGFyZ2V0RW50cnlQb2ludChcbiAgICAgICAgICBmcywgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnVGhlIHRhcmdldCBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCcpO1xuICAgIHJldHVybiB7XG4gICAgICBlbnRyeVBvaW50czogW10gYXMgdW5rbm93biBhcyBQYXJ0aWFsbHlPcmRlcmVkRW50cnlQb2ludHMsXG4gICAgICBpbnZhbGlkRW50cnlQb2ludHM6IFtdLFxuICAgICAgaWdub3JlZERlcGVuZGVuY2llczogW10sXG4gICAgICBncmFwaDogRU1QVFlfR1JBUEgsXG4gICAgfTtcbiAgfVxuICBjb25zdCBmaW5kZXIgPSBuZXcgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVudHJ5UG9pbnRJbmZvID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xuICBjb25zdCBpbnZhbGlkVGFyZ2V0ID0gZW50cnlQb2ludEluZm8uaW52YWxpZEVudHJ5UG9pbnRzLmZpbmQoXG4gICAgICBpID0+IGkuZW50cnlQb2ludC5wYXRoID09PSBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoKTtcbiAgaWYgKGludmFsaWRUYXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRoZSB0YXJnZXQgZW50cnktcG9pbnQgXCIke2ludmFsaWRUYXJnZXQuZW50cnlQb2ludC5uYW1lfVwiIGhhcyBtaXNzaW5nIGRlcGVuZGVuY2llczpcXG5gICtcbiAgICAgICAgaW52YWxpZFRhcmdldC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfVxcbmApLmpvaW4oJycpKTtcbiAgfVxuICBpZiAoZW50cnlQb2ludEluZm8uZW50cnlQb2ludHMubGVuZ3RoID09PSAwKSB7XG4gICAgbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoZnMsIHBrZ0pzb25VcGRhdGVyLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoKTtcbiAgfVxuICByZXR1cm4gZW50cnlQb2ludEluZm87XG59XG5cbmZ1bmN0aW9uIGdldEFsbEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlcixcbiAgICBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgY29uc3QgZmluZGVyID1cbiAgICAgIG5ldyBEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyKGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICByZXR1cm4gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xufVxuXG5mdW5jdGlvbiBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgIGZzOiBGaWxlU3lzdGVtLCB0YXJnZXRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUodGFyZ2V0UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAvLyBJdCBtaWdodCBiZSB0aGF0IHRoaXMgdGFyZ2V0IGlzIGNvbmZpZ3VyZWQgaW4gd2hpY2ggY2FzZSBpdHMgcGFja2FnZS5qc29uIG1pZ2h0IG5vdCBleGlzdC5cbiAgaWYgKCFmcy5leGlzdHMocGFja2FnZUpzb25QYXRoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGlmIChwYWNrYWdlSnNvbltwcm9wZXJ0eV0pIHtcbiAgICAgIC8vIEhlcmUgaXMgYSBwcm9wZXJ0eSB0aGF0IHNob3VsZCBiZSBwcm9jZXNzZWRcbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBwcm9wZXJ0eSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5LCB0YXJnZXRQYXRoKSkge1xuICAgICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgICAgLy8gSXQgaGFzIGJlZW4gcHJvY2Vzc2VkIGFuZCB3ZSBvbmx5IG5lZWQgb25lLCBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQgaGFzIG5vdCBiZWVuIHByb2Nlc3NlZCBidXQgd2UgbmVlZCBhbGwgb2YgdGhlbSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gRWl0aGVyIGFsbCBmb3JtYXRzIG5lZWQgdG8gYmUgY29tcGlsZWQgYW5kIHRoZXJlIHdlcmUgbm9uZSB0aGF0IHdlcmUgdW5wcm9jZXNzZWQsXG4gIC8vIE9yIG9ubHkgdGhlIG9uZSBtYXRjaGluZyBmb3JtYXQgbmVlZHMgdG8gYmUgY29tcGlsZWQgYnV0IHRoZXJlIHdhcyBhdCBsZWFzdCBvbmUgbWF0Y2hpbmdcbiAgLy8gcHJvcGVydHkgYmVmb3JlIHRoZSBmaXJzdCBwcm9jZXNzZWQgZm9ybWF0IHRoYXQgd2FzIHVucHJvY2Vzc2VkLlxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBJZiB3ZSBnZXQgaGVyZSwgdGhlbiB0aGUgcmVxdWVzdGVkIGVudHJ5LXBvaW50IGRpZCBub3QgY29udGFpbiBhbnl0aGluZyBjb21waWxlZCBieVxuICogdGhlIG9sZCBBbmd1bGFyIGNvbXBpbGVyLiBUaGVyZWZvcmUgdGhlcmUgaXMgbm90aGluZyBmb3IgbmdjYyB0byBkby5cbiAqIFNvIG1hcmsgYWxsIGZvcm1hdHMgaW4gdGhpcyBlbnRyeS1wb2ludCBhcyBwcm9jZXNzZWQgc28gdGhhdCBjbGllbnRzIG9mIG5nY2MgY2FuIGF2b2lkXG4gKiB0cmlnZ2VyaW5nIG5nY2MgZm9yIHRoaXMgZW50cnktcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAqL1xuZnVuY3Rpb24gbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIHBhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUocGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgLy8gTm90ZTogV2UgYXJlIG1hcmtpbmcgYWxsIHN1cHBvcnRlZCBwcm9wZXJ0aWVzIGFzIHByb2Nlc3NlZCwgZXZlbiBpZiB0aGV5IGRvbid0IGV4aXN0IGluIHRoZVxuICAvLyAgICAgICBgcGFja2FnZS5qc29uYCBmaWxlLiBXaGlsZSB0aGlzIGlzIHJlZHVuZGFudCwgaXQgaXMgYWxzbyBoYXJtbGVzcy5cbiAgbWFya0FzUHJvY2Vzc2VkKHBrZ0pzb25VcGRhdGVyLCBwYWNrYWdlSnNvbiwgcGFja2FnZUpzb25QYXRoLCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpO1xufVxuXG5mdW5jdGlvbiBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyOiBMb2dnZXIsIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXSk6IHZvaWQge1xuICBpbnZhbGlkRW50cnlQb2ludHMuZm9yRWFjaChpbnZhbGlkRW50cnlQb2ludCA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgSW52YWxpZCBlbnRyeS1wb2ludCAke2ludmFsaWRFbnRyeVBvaW50LmVudHJ5UG9pbnQucGF0aH0uYCxcbiAgICAgICAgYEl0IGlzIG1pc3NpbmcgcmVxdWlyZWQgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICAgICAgaW52YWxpZEVudHJ5UG9pbnQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1gKS5qb2luKCdcXG4nKSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gY29tcHV0ZXMgYW5kIHJldHVybnMgdGhlIGZvbGxvd2luZzpcbiAqIC0gYHByb3BlcnRpZXNUb1Byb2Nlc3NgOiBBbiAob3JkZXJlZCkgbGlzdCBvZiBwcm9wZXJ0aWVzIHRoYXQgZXhpc3QgYW5kIG5lZWQgdG8gYmUgcHJvY2Vzc2VkLFxuICogICBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgYHByb3BlcnRpZXNUb0NvbnNpZGVyYCwgdGhlIHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgYW5kIHRoZWlyXG4gKiAgIGNvcnJlc3BvbmRpbmcgZm9ybWF0LXBhdGhzLiBOT1RFOiBPbmx5IG9uZSBwcm9wZXJ0eSBwZXIgZm9ybWF0LXBhdGggbmVlZHMgdG8gYmUgcHJvY2Vzc2VkLlxuICogLSBgZXF1aXZhbGVudFByb3BlcnRpZXNNYXBgOiBBIG1hcHBpbmcgZnJvbSBlYWNoIHByb3BlcnR5IGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCB0byB0aGUgbGlzdCBvZlxuICogICBvdGhlciBmb3JtYXQgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCB0aGF0IG5lZWQgdG8gYmUgbWFya2VkIGFzIHByb2Nlc3NlZCBhcyBzb29uIGFzIHRoZVxuICogICBmb3JtZXIgaGFzIGJlZW4gcHJvY2Vzc2VkLlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0aWVzVG9Qcm9jZXNzKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pOiB7XG4gIHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXTtcbiAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXA6IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+O1xufSB7XG4gIGNvbnN0IGZvcm1hdFBhdGhzVG9Db25zaWRlciA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGNvbnN0IHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgZGVmaW5lZCBpbiBgcGFja2FnZS5qc29uYC5cbiAgICBpZiAodHlwZW9mIGZvcm1hdFBhdGggIT09ICdzdHJpbmcnKSBjb250aW51ZTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgbWFwIHRvIHRoZSBzYW1lIGZvcm1hdC1wYXRoIGFzIGEgcHJlY2VkaW5nIHByb3BlcnR5LlxuICAgIGlmIChmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIFByb2Nlc3MgdGhpcyBwcm9wZXJ0eSwgYmVjYXVzZSBpdCBpcyB0aGUgZmlyc3Qgb25lIHRvIG1hcCB0byB0aGlzIGZvcm1hdC1wYXRoLlxuICAgIGZvcm1hdFBhdGhzVG9Db25zaWRlci5hZGQoZm9ybWF0UGF0aCk7XG4gICAgcHJvcGVydGllc1RvUHJvY2Vzcy5wdXNoKHByb3ApO1xuXG4gICAgLy8gSWYgd2Ugb25seSBuZWVkIG9uZSBmb3JtYXQgcHJvY2Vzc2VkLCB0aGVyZSBpcyBubyBuZWVkIHRvIHByb2Nlc3MgYW55IG1vcmUgcHJvcGVydGllcy5cbiAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSBicmVhaztcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXM6IHtbZm9ybWF0UGF0aDogc3RyaW5nXTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdfSA9IHt9O1xuICBmb3IgKGNvbnN0IHByb3Agb2YgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGRvIG5vdCBtYXAgdG8gYSBmb3JtYXQtcGF0aCB0aGF0IHdpbGwgYmUgY29uc2lkZXJlZC5cbiAgICBpZiAoIWZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gQWRkIHRoaXMgcHJvcGVydHkgdG8gdGhlIG1hcC5cbiAgICBjb25zdCBsaXN0ID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSB8fCAoZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSA9IFtdKTtcbiAgICBsaXN0LnB1c2gocHJvcCk7XG4gIH1cblxuICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllc01hcCA9IG5ldyBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPigpO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF0gITtcbiAgICBjb25zdCBlcXVpdmFsZW50UHJvcGVydGllcyA9IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF07XG4gICAgZXF1aXZhbGVudFByb3BlcnRpZXNNYXAuc2V0KHByb3AsIGVxdWl2YWxlbnRQcm9wZXJ0aWVzKTtcbiAgfVxuXG4gIHJldHVybiB7cHJvcGVydGllc1RvUHJvY2VzcywgZXF1aXZhbGVudFByb3BlcnRpZXNNYXB9O1xufVxuIl19