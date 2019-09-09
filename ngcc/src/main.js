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
                invalidTarget.missingDependencies.map(function (dep) { return " - " + dep + "\n"; }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhCQUE4QjtJQUU5QixxREFBMEM7SUFDMUMsdUJBQXlCO0lBQ3pCLCtCQUFpQztJQUVqQywyRUFBc0g7SUFFdEgsaUhBQStFO0lBQy9FLHVHQUE2STtJQUM3SSx1R0FBcUU7SUFDckUsK0ZBQThEO0lBQzlELHVHQUFxRTtJQUNyRSw2SUFBeUc7SUFDekcsNkhBQTBGO0lBRTFGLHNGQUE2RDtJQUM3RCw4R0FBbUY7SUFDbkYsNEdBQXNHO0lBQ3RHLG1IQUFpRjtJQUNqRiwrR0FBNkU7SUFDN0Usd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSx1RkFBMkQ7SUFDM0QsbUZBQW1KO0lBQ25KLGlHQUFtRTtJQUNuRSxtRkFBbUQ7SUFHbkQsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQUM5RSxvR0FBNEY7SUF1RTVGLElBQU0sV0FBVyxHQUFHLElBQUksMkJBQVEsRUFBYyxDQUFDO0lBWS9DLFNBQWdCLFFBQVEsQ0FDcEIsRUFFcUY7WUFGcEYsc0JBQVEsRUFBRSw4Q0FBb0IsRUFBRSw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xGLHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFBRSxrQ0FBa0MsRUFBbEMsdURBQWtDLEVBQzVELGNBQXlDLEVBQXpDLGdHQUF5QyxFQUFFLDhCQUFZLEVBQUUsYUFBYSxFQUFiLGtDQUFhO1FBRXpFLDZGQUE2RjtRQUM3RixJQUFNLFVBQVUsR0FBRyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRW5ELHFEQUFxRDtRQUNyRCxrR0FBa0c7UUFDbEcsK0JBQStCO1FBQy9CLElBQU0sVUFBVSxHQUFHLDJCQUFh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RCxPQUFPLEVBQUMsbUJBQW1CLHFCQUFBLEVBQUUsdUJBQXVCLHlCQUFBLEVBQUMsQ0FBQztJQUN4RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIm5vZGVcIiAvPlxuXG5pbXBvcnQge0RlcEdyYXBofSBmcm9tICdkZXBlbmRlbmN5LWdyYXBoJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb20sIGRpcm5hbWUsIGdldEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7Q29tbW9uSnNEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBJbnZhbGlkRW50cnlQb2ludCwgUGFydGlhbGx5T3JkZXJlZEVudHJ5UG9pbnRzLCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtVbWREZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtBbmFseXplRW50cnlQb2ludHNGbiwgQ3JlYXRlQ29tcGlsZUZuLCBFeGVjdXRvciwgUGFydGlhbGx5T3JkZXJlZFRhc2tzLCBUYXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUsIFRhc2tRdWV1ZX0gZnJvbSAnLi9leGVjdXRpb24vYXBpJztcbmltcG9ydCB7Q2x1c3RlckV4ZWN1dG9yfSBmcm9tICcuL2V4ZWN1dGlvbi9jbHVzdGVyL2V4ZWN1dG9yJztcbmltcG9ydCB7Q2x1c3RlclBhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi9leGVjdXRpb24vY2x1c3Rlci9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge0FzeW5jU2luZ2xlUHJvY2Vzc0V4ZWN1dG9yLCBTaW5nbGVQcm9jZXNzRXhlY3V0b3J9IGZyb20gJy4vZXhlY3V0aW9uL3NpbmdsZV9wcm9jZXNzX2V4ZWN1dG9yJztcbmltcG9ydCB7UGFyYWxsZWxUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tfc2VsZWN0aW9uL3BhcmFsbGVsX3Rhc2tfcXVldWUnO1xuaW1wb3J0IHtTZXJpYWxUYXNrUXVldWV9IGZyb20gJy4vZXhlY3V0aW9uL3Rhc2tfc2VsZWN0aW9uL3NlcmlhbF90YXNrX3F1ZXVlJztcbmltcG9ydCB7Q29uc29sZUxvZ2dlciwgTG9nTGV2ZWx9IGZyb20gJy4vbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge2hhc0JlZW5Qcm9jZXNzZWQsIG1hcmtBc1Byb2Nlc3NlZH0gZnJvbSAnLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludFBhY2thZ2VKc29uLCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsIGdldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHttYWtlRW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtUcmFuc2Zvcm1lcn0gZnJvbSAnLi9wYWNrYWdlcy90cmFuc2Zvcm1lcic7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvaW5fcGxhY2VfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtOZXdFbnRyeVBvaW50RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5pbXBvcnQge0RpcmVjdFBhY2thZ2VKc29uVXBkYXRlciwgUGFja2FnZUpzb25VcGRhdGVyfSBmcm9tICcuL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuXG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyIGZvciBzeW5jaHJvbm91cyBleGVjdXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3luY05nY2NPcHRpb25zIHtcbiAgLyoqIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdGhhdCBjb250YWlucyB0aGUgcGFja2FnZXMgdG8gcHJvY2Vzcy4gKi9cbiAgYmFzZVBhdGg6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHBhdGggdG8gdGhlIHByaW1hcnkgcGFja2FnZSB0byBiZSBwcm9jZXNzZWQuIElmIG5vdCBhYnNvbHV0ZSB0aGVuIGl0IG11c3QgYmUgcmVsYXRpdmUgdG9cbiAgICogYGJhc2VQYXRoYC5cbiAgICpcbiAgICogQWxsIGl0cyBkZXBlbmRlbmNpZXMgd2lsbCBuZWVkIHRvIGJlIHByb2Nlc3NlZCB0b28uXG4gICAqL1xuICB0YXJnZXRFbnRyeVBvaW50UGF0aD86IHN0cmluZztcblxuICAvKipcbiAgICogV2hpY2ggZW50cnktcG9pbnQgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uIHRvIGNvbnNpZGVyIHdoZW4gcHJvY2Vzc2luZyBhbiBlbnRyeS1wb2ludC5cbiAgICogRWFjaCBwcm9wZXJ0eSBzaG91bGQgaG9sZCBhIHBhdGggdG8gdGhlIHBhcnRpY3VsYXIgYnVuZGxlIGZvcm1hdCBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICAgKiBEZWZhdWx0cyB0byBhbGwgdGhlIHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbi5cbiAgICovXG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcHJvY2VzcyBhbGwgZm9ybWF0cyBzcGVjaWZpZWQgYnkgKGBwcm9wZXJ0aWVzVG9Db25zaWRlcmApICBvciB0byBzdG9wIHByb2Nlc3NpbmdcbiAgICogdGhpcyBlbnRyeS1wb2ludCBhdCB0aGUgZmlyc3QgbWF0Y2hpbmcgZm9ybWF0LiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqL1xuICBjb21waWxlQWxsRm9ybWF0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY3JlYXRlIG5ldyBlbnRyeS1wb2ludHMgYnVuZGxlcyByYXRoZXIgdGhhbiBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgZmlsZXMuXG4gICAqL1xuICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBsb2dnZXIgdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGxvZyBtZXNzYWdlcy5cbiAgICovXG4gIGxvZ2dlcj86IExvZ2dlcjtcblxuICAvKipcbiAgICogUGF0aHMgbWFwcGluZyBjb25maWd1cmF0aW9uIChgcGF0aHNgIGFuZCBgYmFzZVVybGApLCBhcyBmb3VuZCBpbiBgdHMuQ29tcGlsZXJPcHRpb25zYC5cbiAgICogVGhlc2UgYXJlIHVzZWQgdG8gcmVzb2x2ZSBwYXRocyB0byBsb2NhbGx5IGJ1aWx0IEFuZ3VsYXIgbGlicmFyaWVzLlxuICAgKi9cbiAgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlIGEgZmlsZS1zeXN0ZW0gc2VydmljZSB0aGF0IHdpbGwgYmUgdXNlZCBieSBuZ2NjIGZvciBhbGwgZmlsZSBpbnRlcmFjdGlvbnMuXG4gICAqL1xuICBmaWxlU3lzdGVtPzogRmlsZVN5c3RlbTtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgY29tcGlsYXRpb24gc2hvdWxkIHJ1biBhbmQgcmV0dXJuIGFzeW5jaHJvbm91c2x5LiBBbGxvd2luZyBhc3luY2hyb25vdXMgZXhlY3V0aW9uXG4gICAqIG1heSBzcGVlZCB1cCB0aGUgY29tcGlsYXRpb24gYnkgdXRpbGl6aW5nIG11bHRpcGxlIENQVSBjb3JlcyAoaWYgYXZhaWxhYmxlKS5cbiAgICpcbiAgICogRGVmYXVsdDogYGZhbHNlYCAoaS5lLiBydW4gc3luY2hyb25vdXNseSlcbiAgICovXG4gIGFzeW5jPzogZmFsc2U7XG59XG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyIGZvciBhc3luY2hyb25vdXMgZXhlY3V0aW9uLlxuICovXG5leHBvcnQgdHlwZSBBc3luY05nY2NPcHRpb25zID0gT21pdDxTeW5jTmdjY09wdGlvbnMsICdhc3luYyc+JiB7YXN5bmM6IHRydWV9O1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlci5cbiAqL1xuZXhwb3J0IHR5cGUgTmdjY09wdGlvbnMgPSBBc3luY05nY2NPcHRpb25zIHwgU3luY05nY2NPcHRpb25zO1xuXG5jb25zdCBFTVBUWV9HUkFQSCA9IG5ldyBEZXBHcmFwaDxFbnRyeVBvaW50PigpO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhvcHRpb25zOiBBc3luY05nY2NPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhvcHRpb25zOiBTeW5jTmdjY09wdGlvbnMpOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKFxuICAgIHtiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyID0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLFxuICAgICBjb21waWxlQWxsRm9ybWF0cyA9IHRydWUsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID0gZmFsc2UsXG4gICAgIGxvZ2dlciA9IG5ldyBDb25zb2xlTG9nZ2VyKExvZ0xldmVsLmluZm8pLCBwYXRoTWFwcGluZ3MsIGFzeW5jID0gZmFsc2V9OiBOZ2NjT3B0aW9ucyk6IHZvaWR8XG4gICAgUHJvbWlzZTx2b2lkPiB7XG4gIC8vIEV4ZWN1dGUgaW4gcGFyYWxsZWwsIGlmIGFzeW5jIGV4ZWN1dGlvbiBpcyBhY2NlcHRhYmxlIGFuZCB0aGVyZSBhcmUgbW9yZSB0aGFuIDEgQ1BVIGNvcmVzLlxuICBjb25zdCBpblBhcmFsbGVsID0gYXN5bmMgJiYgKG9zLmNwdXMoKS5sZW5ndGggPiAxKTtcblxuICAvLyBJbnN0YW50aWF0ZSBjb21tb24gdXRpbGl0aWVzIHRoYXQgYXJlIGFsd2F5cyB1c2VkLlxuICAvLyBOT1RFOiBBdm9pZCBlYWdlcmx5IGluc3RhbnRpYXRpbmcgYW55dGhpbmcgdGhhdCBtaWdodCBub3QgYmUgdXNlZCB3aGVuIHJ1bm5pbmcgc3luYy9hc3luYyBvciBpblxuICAvLyAgICAgICBtYXN0ZXIvd29ya2VyIHByb2Nlc3MuXG4gIGNvbnN0IGZpbGVTeXN0ZW0gPSBnZXRGaWxlU3lzdGVtKCk7XG4gIC8vIE5PVEU6IFRvIGF2b2lkIGZpbGUgY29ycnVwdGlvbiwgZW5zdXJlIHRoYXQgZWFjaCBgbmdjY2AgaW52b2NhdGlvbiBvbmx5IGNyZWF0ZXMgX29uZV8gaW5zdGFuY2VcbiAgLy8gICAgICAgb2YgYFBhY2thZ2VKc29uVXBkYXRlcmAgdGhhdCBhY3R1YWxseSB3cml0ZXMgdG8gZGlzayAoYWNyb3NzIGFsbCBwcm9jZXNzZXMpLlxuICAvLyAgICAgICBUaGlzIGlzIGhhcmQgdG8gZW5mb3JjZSBhdXRvbWF0aWNhbGx5LCB3aGVuIHJ1bm5pbmcgb24gbXVsdGlwbGUgcHJvY2Vzc2VzLCBzbyBuZWVkcyB0byBiZVxuICAvLyAgICAgICBlbmZvcmNlZCBtYW51YWxseS5cbiAgY29uc3QgcGtnSnNvblVwZGF0ZXIgPSBnZXRQYWNrYWdlSnNvblVwZGF0ZXIoaW5QYXJhbGxlbCwgZmlsZVN5c3RlbSk7XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBwZXJmb3JtaW5nIHRoZSBhbmFseXNpcy5cbiAgY29uc3QgYW5hbHl6ZUVudHJ5UG9pbnRzOiBBbmFseXplRW50cnlQb2ludHNGbiA9ICgpID0+IHtcbiAgICBsb2dnZXIuZGVidWcoJ0FuYWx5emluZyBlbnRyeS1wb2ludHMuLi4nKTtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgY29uc3Qgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIgPSBlbnN1cmVTdXBwb3J0ZWRQcm9wZXJ0aWVzKHByb3BlcnRpZXNUb0NvbnNpZGVyKTtcblxuICAgIGNvbnN0IG1vZHVsZVJlc29sdmVyID0gbmV3IE1vZHVsZVJlc29sdmVyKGZpbGVTeXN0ZW0sIHBhdGhNYXBwaW5ncyk7XG4gICAgY29uc3QgZXNtRGVwZW5kZW5jeUhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICAgIGNvbnN0IHVtZERlcGVuZGVuY3lIb3N0ID0gbmV3IFVtZERlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgICBjb25zdCBjb21tb25Kc0RlcGVuZGVuY3lIb3N0ID0gbmV3IENvbW1vbkpzRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICAgIGNvbnN0IGRlcGVuZGVuY3lSZXNvbHZlciA9IG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIoZmlsZVN5c3RlbSwgbG9nZ2VyLCB7XG4gICAgICBlc201OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICAgIGVzbTIwMTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgdW1kOiB1bWREZXBlbmRlbmN5SG9zdCxcbiAgICAgIGNvbW1vbmpzOiBjb21tb25Kc0RlcGVuZGVuY3lIb3N0XG4gICAgfSk7XG5cbiAgICBjb25zdCBhYnNCYXNlUGF0aCA9IGFic29sdXRlRnJvbShiYXNlUGF0aCk7XG4gICAgY29uc3QgY29uZmlnID0gbmV3IE5nY2NDb25maWd1cmF0aW9uKGZpbGVTeXN0ZW0sIGRpcm5hbWUoYWJzQmFzZVBhdGgpKTtcbiAgICBjb25zdCB7ZW50cnlQb2ludHMsIGdyYXBofSA9IGdldEVudHJ5UG9pbnRzKFxuICAgICAgICBmaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlciwgbG9nZ2VyLCBkZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZywgYWJzQmFzZVBhdGgsXG4gICAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MsIHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cyk7XG5cbiAgICBjb25zdCB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzOiBzdHJpbmdbXSA9IFtdO1xuICAgIC8vIFRoZSB0YXNrcyBhcmUgcGFydGlhbGx5IG9yZGVyZWQgYnkgdmlydHVlIG9mIHRoZSBlbnRyeS1wb2ludHMgYmVpbmcgcGFydGlhbGx5IG9yZGVyZWQgdG9vLlxuICAgIGNvbnN0IHRhc2tzOiBQYXJ0aWFsbHlPcmRlcmVkVGFza3MgPSBbXSBhcyBhbnk7XG5cbiAgICBmb3IgKGNvbnN0IGVudHJ5UG9pbnQgb2YgZW50cnlQb2ludHMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICAgIGNvbnN0IGhhc1Byb2Nlc3NlZFR5cGluZ3MgPSBoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCAndHlwaW5ncycsIGVudHJ5UG9pbnQucGF0aCk7XG4gICAgICBjb25zdCB7cHJvcGVydGllc1RvUHJvY2VzcywgZXF1aXZhbGVudFByb3BlcnRpZXNNYXB9ID1cbiAgICAgICAgICBnZXRQcm9wZXJ0aWVzVG9Qcm9jZXNzKHBhY2thZ2VKc29uLCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpO1xuICAgICAgbGV0IHByb2Nlc3NEdHMgPSAhaGFzUHJvY2Vzc2VkVHlwaW5ncztcblxuICAgICAgaWYgKHByb3BlcnRpZXNUb1Byb2Nlc3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIFRoaXMgZW50cnktcG9pbnQgaXMgdW5wcm9jZXNzYWJsZSAoaS5lLiB0aGVyZSBpcyBubyBmb3JtYXQgcHJvcGVydHkgdGhhdCBpcyBvZiBpbnRlcmVzdFxuICAgICAgICAvLyBhbmQgY2FuIGJlIHByb2Nlc3NlZCkuIFRoaXMgd2lsbCByZXN1bHQgaW4gYW4gZXJyb3IsIGJ1dCBjb250aW51ZSBsb29waW5nIG92ZXJcbiAgICAgICAgLy8gZW50cnktcG9pbnRzIGluIG9yZGVyIHRvIGNvbGxlY3QgYWxsIHVucHJvY2Vzc2FibGUgb25lcyBhbmQgZGlzcGxheSBhIG1vcmUgaW5mb3JtYXRpdmVcbiAgICAgICAgLy8gZXJyb3IuXG4gICAgICAgIHVucHJvY2Vzc2FibGVFbnRyeVBvaW50UGF0aHMucHVzaChlbnRyeVBvaW50LnBhdGgpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBmb3JtYXRQcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Qcm9jZXNzKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCA9IGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwLmdldChmb3JtYXRQcm9wZXJ0eSkgITtcbiAgICAgICAgdGFza3MucHVzaCh7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30pO1xuXG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyB0eXBpbmdzIGZvciB0aGUgZmlyc3QgcHJvcGVydHkgKGlmIG5vdCBhbHJlYWR5IHByb2Nlc3NlZCkuXG4gICAgICAgIHByb2Nlc3NEdHMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgZW50cnktcG9pbnRzIGZvciB3aGljaCB3ZSBjb3VsZCBub3QgcHJvY2VzcyBhbnkgZm9ybWF0IGF0IGFsbC5cbiAgICBpZiAodW5wcm9jZXNzYWJsZUVudHJ5UG9pbnRQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1VuYWJsZSB0byBwcm9jZXNzIGFueSBmb3JtYXRzIGZvciB0aGUgZm9sbG93aW5nIGVudHJ5LXBvaW50cyAodHJpZWQgJyArXG4gICAgICAgICAgYCR7cHJvcGVydGllc1RvQ29uc2lkZXIuam9pbignLCAnKX0pOiBgICtcbiAgICAgICAgICB1bnByb2Nlc3NhYmxlRW50cnlQb2ludFBhdGhzLm1hcChwYXRoID0+IGBcXG4gIC0gJHtwYXRofWApLmpvaW4oJycpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgQW5hbHl6ZWQgJHtlbnRyeVBvaW50cy5sZW5ndGh9IGVudHJ5LXBvaW50cyBpbiAke2R1cmF0aW9ufXMuIGAgK1xuICAgICAgICBgKFRvdGFsIHRhc2tzOiAke3Rhc2tzLmxlbmd0aH0pYCk7XG5cbiAgICByZXR1cm4gZ2V0VGFza1F1ZXVlKGluUGFyYWxsZWwsIHRhc2tzLCBncmFwaCk7XG4gIH07XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBjcmVhdGluZyB0aGUgYGNvbXBpbGUoKWAgZnVuY3Rpb24uXG4gIGNvbnN0IGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuID0gb25UYXNrQ29tcGxldGVkID0+IHtcbiAgICBjb25zdCBmaWxlV3JpdGVyID0gZ2V0RmlsZVdyaXRlcihmaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlciwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMpO1xuICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFRyYW5zZm9ybWVyKGZpbGVTeXN0ZW0sIGxvZ2dlcik7XG5cbiAgICByZXR1cm4gKHRhc2s6IFRhc2spID0+IHtcbiAgICAgIGNvbnN0IHtlbnRyeVBvaW50LCBmb3JtYXRQcm9wZXJ0eSwgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkLCBwcm9jZXNzRHRzfSA9IHRhc2s7XG5cbiAgICAgIGNvbnN0IGlzQ29yZSA9IGVudHJ5UG9pbnQubmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnOyAgLy8gQXJlIHdlIGNvbXBpbGluZyB0aGUgQW5ndWxhciBjb3JlP1xuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW2Zvcm1hdFByb3BlcnR5XTtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IGdldEVudHJ5UG9pbnRGb3JtYXQoZmlsZVN5c3RlbSwgZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHkpO1xuXG4gICAgICAvLyBBbGwgcHJvcGVydGllcyBsaXN0ZWQgaW4gYHByb3BlcnRpZXNUb1Byb2Nlc3NgIGFyZSBndWFyYW50ZWVkIHRvIHBvaW50IHRvIGEgZm9ybWF0LXBhdGhcbiAgICAgIC8vIChpLmUuIHRoZXkgYXJlIGRlZmluZWQgaW4gYGVudHJ5UG9pbnQucGFja2FnZUpzb25gKS4gRnVydGhlcm1vcmUsIHRoZXkgYXJlIGFsc28gZ3VhcmFudGVlZFxuICAgICAgLy8gdG8gYmUgYW1vbmcgYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2AuXG4gICAgICAvLyBCYXNlZCBvbiB0aGUgYWJvdmUsIGBmb3JtYXRQYXRoYCBzaG91bGQgYWx3YXlzIGJlIGRlZmluZWQgYW5kIGBnZXRFbnRyeVBvaW50Rm9ybWF0KClgXG4gICAgICAvLyBzaG91bGQgYWx3YXlzIHJldHVybiBhIGZvcm1hdCBoZXJlIChhbmQgbm90IGB1bmRlZmluZWRgKS5cbiAgICAgIGlmICghZm9ybWF0UGF0aCB8fCAhZm9ybWF0KSB7XG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEludmFyaWFudCB2aW9sYXRlZDogTm8gZm9ybWF0LXBhdGggb3IgZm9ybWF0IGZvciAke2VudHJ5UG9pbnQucGF0aH0gOiBgICtcbiAgICAgICAgICAgIGAke2Zvcm1hdFByb3BlcnR5fSAoZm9ybWF0UGF0aDogJHtmb3JtYXRQYXRofSB8IGZvcm1hdDogJHtmb3JtYXR9KWApO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgZm9ybWF0LXBhdGggd2hpY2ggdGhlIHByb3BlcnR5IG1hcHMgdG8gaXMgYWxyZWFkeSBwcm9jZXNzZWQgLSBub3RoaW5nIHRvIGRvLlxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sIGZvcm1hdFByb3BlcnR5LCBlbnRyeVBvaW50LnBhdGgpKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXRQcm9wZXJ0eX0gKGFscmVhZHkgY29tcGlsZWQpLmApO1xuICAgICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLkFscmVhZHlQcm9jZXNzZWQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGJ1bmRsZSA9IG1ha2VFbnRyeVBvaW50QnVuZGxlKFxuICAgICAgICAgIGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIGZvcm1hdFBhdGgsIGlzQ29yZSwgZm9ybWF0LCBwcm9jZXNzRHRzLCBwYXRoTWFwcGluZ3MsIHRydWUpO1xuXG4gICAgICBsb2dnZXIuaW5mbyhgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fWApO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oYnVuZGxlKTtcbiAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICBpZiAocmVzdWx0LmRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBsb2dnZXIud2Fybih0cy5mb3JtYXREaWFnbm9zdGljcyhyZXN1bHQuZGlhZ25vc3RpY3MsIGJ1bmRsZS5zcmMuaG9zdCkpO1xuICAgICAgICB9XG4gICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoYnVuZGxlLCByZXN1bHQudHJhbnNmb3JtZWRGaWxlcywgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGVycm9ycyA9IHRzLmZvcm1hdERpYWdub3N0aWNzKHJlc3VsdC5kaWFnbm9zdGljcywgYnVuZGxlLnNyYy5ob3N0KTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEZhaWxlZCB0byBjb21waWxlIGVudHJ5LXBvaW50ICR7ZW50cnlQb2ludC5uYW1lfSBkdWUgdG8gY29tcGlsYXRpb24gZXJyb3JzOlxcbiR7ZXJyb3JzfWApO1xuICAgICAgfVxuXG4gICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZCk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBUaGUgZXhlY3V0b3IgZm9yIGFjdHVhbGx5IHBsYW5uaW5nIGFuZCBnZXR0aW5nIHRoZSB3b3JrIGRvbmUuXG4gIGNvbnN0IGV4ZWN1dG9yID0gZ2V0RXhlY3V0b3IoYXN5bmMsIGluUGFyYWxsZWwsIGxvZ2dlciwgcGtnSnNvblVwZGF0ZXIpO1xuXG4gIHJldHVybiBleGVjdXRvci5leGVjdXRlKGFuYWx5emVFbnRyeVBvaW50cywgY3JlYXRlQ29tcGlsZUZuKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlU3VwcG9ydGVkUHJvcGVydGllcyhwcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSB7XG4gIC8vIFNob3J0LWNpcmN1aXQgdGhlIGNhc2Ugd2hlcmUgYHByb3BlcnRpZXNgIGhhcyBmYWxsZW4gYmFjayB0byB0aGUgZGVmYXVsdCB2YWx1ZTpcbiAgLy8gYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2BcbiAgaWYgKHByb3BlcnRpZXMgPT09IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykgcmV0dXJuIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUztcblxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllcyBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5W10pIHtcbiAgICBpZiAoU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmluZGV4T2YocHJvcCkgIT09IC0xKSB7XG4gICAgICBzdXBwb3J0ZWRQcm9wZXJ0aWVzLnB1c2gocHJvcCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN1cHBvcnRlZFByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTm8gc3VwcG9ydGVkIGZvcm1hdCBwcm9wZXJ0eSB0byBjb25zaWRlciBhbW9uZyBbJHtwcm9wZXJ0aWVzLmpvaW4oJywgJyl9XS4gYCArXG4gICAgICAgIGBTdXBwb3J0ZWQgcHJvcGVydGllczogJHtTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIHJldHVybiBzdXBwb3J0ZWRQcm9wZXJ0aWVzO1xufVxuXG5mdW5jdGlvbiBnZXRQYWNrYWdlSnNvblVwZGF0ZXIoaW5QYXJhbGxlbDogYm9vbGVhbiwgZnM6IEZpbGVTeXN0ZW0pOiBQYWNrYWdlSnNvblVwZGF0ZXIge1xuICBjb25zdCBkaXJlY3RQa2dKc29uVXBkYXRlciA9IG5ldyBEaXJlY3RQYWNrYWdlSnNvblVwZGF0ZXIoZnMpO1xuICByZXR1cm4gaW5QYXJhbGxlbCA/IG5ldyBDbHVzdGVyUGFja2FnZUpzb25VcGRhdGVyKGRpcmVjdFBrZ0pzb25VcGRhdGVyKSA6IGRpcmVjdFBrZ0pzb25VcGRhdGVyO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLFxuICAgIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzOiBib29sZWFuKTogRmlsZVdyaXRlciB7XG4gIHJldHVybiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/IG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcihmcywgcGtnSnNvblVwZGF0ZXIpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEluUGxhY2VGaWxlV3JpdGVyKGZzKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGFza1F1ZXVlKFxuICAgIGluUGFyYWxsZWw6IGJvb2xlYW4sIHRhc2tzOiBQYXJ0aWFsbHlPcmRlcmVkVGFza3MsIGdyYXBoOiBEZXBHcmFwaDxFbnRyeVBvaW50Pik6IFRhc2tRdWV1ZSB7XG4gIHJldHVybiBpblBhcmFsbGVsID8gbmV3IFBhcmFsbGVsVGFza1F1ZXVlKHRhc2tzLCBncmFwaCkgOiBuZXcgU2VyaWFsVGFza1F1ZXVlKHRhc2tzKTtcbn1cblxuZnVuY3Rpb24gZ2V0RXhlY3V0b3IoXG4gICAgYXN5bmM6IGJvb2xlYW4sIGluUGFyYWxsZWw6IGJvb2xlYW4sIGxvZ2dlcjogTG9nZ2VyLFxuICAgIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIpOiBFeGVjdXRvciB7XG4gIGlmIChpblBhcmFsbGVsKSB7XG4gICAgLy8gRXhlY3V0ZSBpbiBwYXJhbGxlbCAod2hpY2ggaW1wbGllcyBhc3luYykuXG4gICAgLy8gVXNlIHVwIHRvIDggQ1BVIGNvcmVzIGZvciB3b3JrZXJzLCBhbHdheXMgcmVzZXJ2aW5nIG9uZSBmb3IgbWFzdGVyLlxuICAgIGNvbnN0IHdvcmtlckNvdW50ID0gTWF0aC5taW4oOCwgb3MuY3B1cygpLmxlbmd0aCAtIDEpO1xuICAgIHJldHVybiBuZXcgQ2x1c3RlckV4ZWN1dG9yKHdvcmtlckNvdW50LCBsb2dnZXIsIHBrZ0pzb25VcGRhdGVyKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBFeGVjdXRlIHNlcmlhbGx5LCBvbiBhIHNpbmdsZSB0aHJlYWQgKGVpdGhlciBzeW5jIG9yIGFzeW5jKS5cbiAgICByZXR1cm4gYXN5bmMgPyBuZXcgQXN5bmNTaW5nbGVQcm9jZXNzRXhlY3V0b3IobG9nZ2VyLCBwa2dKc29uVXBkYXRlcikgOlxuICAgICAgICAgICAgICAgICAgIG5ldyBTaW5nbGVQcm9jZXNzRXhlY3V0b3IobG9nZ2VyLCBwa2dKc29uVXBkYXRlcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RW50cnlQb2ludHMoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIGxvZ2dlcjogTG9nZ2VyLFxuICAgIHJlc29sdmVyOiBEZXBlbmRlbmN5UmVzb2x2ZXIsIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICB0YXJnZXRFbnRyeVBvaW50UGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLCBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8IHVuZGVmaW5lZCxcbiAgICBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10sIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKTpcbiAgICB7ZW50cnlQb2ludHM6IFBhcnRpYWxseU9yZGVyZWRFbnRyeVBvaW50cywgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+fSB7XG4gIGNvbnN0IHtlbnRyeVBvaW50cywgaW52YWxpZEVudHJ5UG9pbnRzLCBncmFwaH0gPSAodGFyZ2V0RW50cnlQb2ludFBhdGggIT09IHVuZGVmaW5lZCkgP1xuICAgICAgZ2V0VGFyZ2V0ZWRFbnRyeVBvaW50cyhcbiAgICAgICAgICBmcywgcGtnSnNvblVwZGF0ZXIsIGxvZ2dlciwgcmVzb2x2ZXIsIGNvbmZpZywgYmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgICAgICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cywgcGF0aE1hcHBpbmdzKSA6XG4gICAgICBnZXRBbGxFbnRyeVBvaW50cyhmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzKTtcbiAgcmV0dXJuIHtlbnRyeVBvaW50cywgZ3JhcGh9O1xufVxuXG5mdW5jdGlvbiBnZXRUYXJnZXRlZEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwa2dKc29uVXBkYXRlcjogUGFja2FnZUpzb25VcGRhdGVyLCBsb2dnZXI6IExvZ2dlcixcbiAgICByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgdGFyZ2V0RW50cnlQb2ludFBhdGg6IHN0cmluZywgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLCBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbixcbiAgICBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8IHVuZGVmaW5lZCk6IFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gIGNvbnN0IGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggPSByZXNvbHZlKGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCk7XG4gIGlmIChoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgICAgICAgIGZzLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVudHJ5UG9pbnRzOiBbXSBhcyB1bmtub3duIGFzIFBhcnRpYWxseU9yZGVyZWRFbnRyeVBvaW50cyxcbiAgICAgIGludmFsaWRFbnRyeVBvaW50czogW10sXG4gICAgICBpZ25vcmVkRGVwZW5kZW5jaWVzOiBbXSxcbiAgICAgIGdyYXBoOiBFTVBUWV9HUkFQSCxcbiAgICB9O1xuICB9XG4gIGNvbnN0IGZpbmRlciA9IG5ldyBUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXIoXG4gICAgICBmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgY29uc3QgZW50cnlQb2ludEluZm8gPSBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKCk7XG4gIGNvbnN0IGludmFsaWRUYXJnZXQgPSBlbnRyeVBvaW50SW5mby5pbnZhbGlkRW50cnlQb2ludHMuZmluZChcbiAgICAgIGkgPT4gaS5lbnRyeVBvaW50LnBhdGggPT09IGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgpO1xuICBpZiAoaW52YWxpZFRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGhlIHRhcmdldCBlbnRyeS1wb2ludCBcIiR7aW52YWxpZFRhcmdldC5lbnRyeVBvaW50Lm5hbWV9XCIgaGFzIG1pc3NpbmcgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICBpbnZhbGlkVGFyZ2V0Lm1pc3NpbmdEZXBlbmRlbmNpZXMubWFwKGRlcCA9PiBgIC0gJHtkZXB9XFxuYCkpO1xuICB9XG4gIGlmIChlbnRyeVBvaW50SW5mby5lbnRyeVBvaW50cy5sZW5ndGggPT09IDApIHtcbiAgICBtYXJrTm9uQW5ndWxhclBhY2thZ2VBc1Byb2Nlc3NlZChmcywgcGtnSnNvblVwZGF0ZXIsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgpO1xuICB9XG4gIHJldHVybiBlbnRyeVBvaW50SW5mbztcbn1cblxuZnVuY3Rpb24gZ2V0QWxsRW50cnlQb2ludHMoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIGxvZ2dlcjogTG9nZ2VyLCByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLFxuICAgIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICBjb25zdCBmaW5kZXIgPVxuICAgICAgbmV3IERpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXIoZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIHJldHVybiBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKCk7XG59XG5cbmZ1bmN0aW9uIGhhc1Byb2Nlc3NlZFRhcmdldEVudHJ5UG9pbnQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHRhcmdldFBhdGg6IEFic29sdXRlRnNQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZSh0YXJnZXRQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIEl0IG1pZ2h0IGJlIHRoYXQgdGhpcyB0YXJnZXQgaXMgY29uZmlndXJlZCBpbiB3aGljaCBjYXNlIGl0cyBwYWNrYWdlLmpzb24gbWlnaHQgbm90IGV4aXN0LlxuICBpZiAoIWZzLmV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcblxuICBmb3IgKGNvbnN0IHByb3BlcnR5IG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgaWYgKHBhY2thZ2VKc29uW3Byb3BlcnR5XSkge1xuICAgICAgLy8gSGVyZSBpcyBhIHByb3BlcnR5IHRoYXQgc2hvdWxkIGJlIHByb2Nlc3NlZFxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sIHByb3BlcnR5IGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIHRhcmdldFBhdGgpKSB7XG4gICAgICAgIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIHtcbiAgICAgICAgICAvLyBJdCBoYXMgYmVlbiBwcm9jZXNzZWQgYW5kIHdlIG9ubHkgbmVlZCBvbmUsIHNvIHdlIGFyZSBkb25lLlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJdCBoYXMgbm90IGJlZW4gcHJvY2Vzc2VkIGJ1dCB3ZSBuZWVkIGFsbCBvZiB0aGVtLCBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBFaXRoZXIgYWxsIGZvcm1hdHMgbmVlZCB0byBiZSBjb21waWxlZCBhbmQgdGhlcmUgd2VyZSBub25lIHRoYXQgd2VyZSB1bnByb2Nlc3NlZCxcbiAgLy8gT3Igb25seSB0aGUgb25lIG1hdGNoaW5nIGZvcm1hdCBuZWVkcyB0byBiZSBjb21waWxlZCBidXQgdGhlcmUgd2FzIGF0IGxlYXN0IG9uZSBtYXRjaGluZ1xuICAvLyBwcm9wZXJ0eSBiZWZvcmUgdGhlIGZpcnN0IHByb2Nlc3NlZCBmb3JtYXQgdGhhdCB3YXMgdW5wcm9jZXNzZWQuXG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIElmIHdlIGdldCBoZXJlLCB0aGVuIHRoZSByZXF1ZXN0ZWQgZW50cnktcG9pbnQgZGlkIG5vdCBjb250YWluIGFueXRoaW5nIGNvbXBpbGVkIGJ5XG4gKiB0aGUgb2xkIEFuZ3VsYXIgY29tcGlsZXIuIFRoZXJlZm9yZSB0aGVyZSBpcyBub3RoaW5nIGZvciBuZ2NjIHRvIGRvLlxuICogU28gbWFyayBhbGwgZm9ybWF0cyBpbiB0aGlzIGVudHJ5LXBvaW50IGFzIHByb2Nlc3NlZCBzbyB0aGF0IGNsaWVudHMgb2YgbmdjYyBjYW4gYXZvaWRcbiAqIHRyaWdnZXJpbmcgbmdjYyBmb3IgdGhpcyBlbnRyeS1wb2ludCBpbiB0aGUgZnV0dXJlLlxuICovXG5mdW5jdGlvbiBtYXJrTm9uQW5ndWxhclBhY2thZ2VBc1Byb2Nlc3NlZChcbiAgICBmczogRmlsZVN5c3RlbSwgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgcGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZShwYXRoLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcblxuICAvLyBOb3RlOiBXZSBhcmUgbWFya2luZyBhbGwgc3VwcG9ydGVkIHByb3BlcnRpZXMgYXMgcHJvY2Vzc2VkLCBldmVuIGlmIHRoZXkgZG9uJ3QgZXhpc3QgaW4gdGhlXG4gIC8vICAgICAgIGBwYWNrYWdlLmpzb25gIGZpbGUuIFdoaWxlIHRoaXMgaXMgcmVkdW5kYW50LCBpdCBpcyBhbHNvIGhhcm1sZXNzLlxuICBtYXJrQXNQcm9jZXNzZWQocGtnSnNvblVwZGF0ZXIsIHBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGgsIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyk7XG59XG5cbmZ1bmN0aW9uIGxvZ0ludmFsaWRFbnRyeVBvaW50cyhsb2dnZXI6IExvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzOiBJbnZhbGlkRW50cnlQb2ludFtdKTogdm9pZCB7XG4gIGludmFsaWRFbnRyeVBvaW50cy5mb3JFYWNoKGludmFsaWRFbnRyeVBvaW50ID0+IHtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgIGBJbnZhbGlkIGVudHJ5LXBvaW50ICR7aW52YWxpZEVudHJ5UG9pbnQuZW50cnlQb2ludC5wYXRofS5gLFxuICAgICAgICBgSXQgaXMgbWlzc2luZyByZXF1aXJlZCBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgICAgICBpbnZhbGlkRW50cnlQb2ludC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfWApLmpvaW4oJ1xcbicpKTtcbiAgfSk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBjb21wdXRlcyBhbmQgcmV0dXJucyB0aGUgZm9sbG93aW5nOlxuICogLSBgcHJvcGVydGllc1RvUHJvY2Vzc2A6IEFuIChvcmRlcmVkKSBsaXN0IG9mIHByb3BlcnRpZXMgdGhhdCBleGlzdCBhbmQgbmVlZCB0byBiZSBwcm9jZXNzZWQsXG4gKiAgIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBgcHJvcGVydGllc1RvQ29uc2lkZXJgLCB0aGUgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCBhbmQgdGhlaXJcbiAqICAgY29ycmVzcG9uZGluZyBmb3JtYXQtcGF0aHMuIE5PVEU6IE9ubHkgb25lIHByb3BlcnR5IHBlciBmb3JtYXQtcGF0aCBuZWVkcyB0byBiZSBwcm9jZXNzZWQuXG4gKiAtIGBlcXVpdmFsZW50UHJvcGVydGllc01hcGA6IEEgbWFwcGluZyBmcm9tIGVhY2ggcHJvcGVydHkgaW4gYHByb3BlcnRpZXNUb1Byb2Nlc3NgIHRvIHRoZSBsaXN0IG9mXG4gKiAgIG90aGVyIGZvcm1hdCBwcm9wZXJ0aWVzIGluIGBwYWNrYWdlLmpzb25gIHRoYXQgbmVlZCB0byBiZSBtYXJrZWQgYXMgcHJvY2Vzc2VkIGFzIHNvb24gYXMgdGhlXG4gKiAgIGZvcm1lciBoYXMgYmVlbiBwcm9jZXNzZWQuXG4gKi9cbmZ1bmN0aW9uIGdldFByb3BlcnRpZXNUb1Byb2Nlc3MoXG4gICAgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgcHJvcGVydGllc1RvQ29uc2lkZXI6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbik6IHtcbiAgcHJvcGVydGllc1RvUHJvY2VzczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdO1xuICBlcXVpdmFsZW50UHJvcGVydGllc01hcDogTWFwPEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXT47XG59IHtcbiAgY29uc3QgZm9ybWF0UGF0aHNUb0NvbnNpZGVyID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgY29uc3QgcHJvcGVydGllc1RvUHJvY2VzczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID0gW107XG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIG5vdCBkZWZpbmVkIGluIGBwYWNrYWdlLmpzb25gLlxuICAgIGlmICh0eXBlb2YgZm9ybWF0UGF0aCAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBtYXAgdG8gdGhlIHNhbWUgZm9ybWF0LXBhdGggYXMgYSBwcmVjZWRpbmcgcHJvcGVydHkuXG4gICAgaWYgKGZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gUHJvY2VzcyB0aGlzIHByb3BlcnR5LCBiZWNhdXNlIGl0IGlzIHRoZSBmaXJzdCBvbmUgdG8gbWFwIHRvIHRoaXMgZm9ybWF0LXBhdGguXG4gICAgZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmFkZChmb3JtYXRQYXRoKTtcbiAgICBwcm9wZXJ0aWVzVG9Qcm9jZXNzLnB1c2gocHJvcCk7XG5cbiAgICAvLyBJZiB3ZSBvbmx5IG5lZWQgb25lIGZvcm1hdCBwcm9jZXNzZWQsIHRoZXJlIGlzIG5vIG5lZWQgdG8gcHJvY2VzcyBhbnkgbW9yZSBwcm9wZXJ0aWVzLlxuICAgIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIGJyZWFrO1xuICB9XG5cbiAgY29uc3QgZm9ybWF0UGF0aFRvUHJvcGVydGllczoge1tmb3JtYXRQYXRoOiBzdHJpbmddOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W119ID0ge307XG4gIGZvciAoY29uc3QgcHJvcCBvZiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgZGVmaW5lZCBpbiBgcGFja2FnZS5qc29uYC5cbiAgICBpZiAodHlwZW9mIGZvcm1hdFBhdGggIT09ICdzdHJpbmcnKSBjb250aW51ZTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgZG8gbm90IG1hcCB0byBhIGZvcm1hdC1wYXRoIHRoYXQgd2lsbCBiZSBjb25zaWRlcmVkLlxuICAgIGlmICghZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmhhcyhmb3JtYXRQYXRoKSkgY29udGludWU7XG5cbiAgICAvLyBBZGQgdGhpcyBwcm9wZXJ0eSB0byB0aGUgbWFwLlxuICAgIGNvbnN0IGxpc3QgPSBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdIHx8IChmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdID0gW10pO1xuICAgIGxpc3QucHVzaChwcm9wKTtcbiAgfVxuXG4gIGNvbnN0IGVxdWl2YWxlbnRQcm9wZXJ0aWVzTWFwID0gbmV3IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+KCk7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXSAhO1xuICAgIGNvbnN0IGVxdWl2YWxlbnRQcm9wZXJ0aWVzID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXTtcbiAgICBlcXVpdmFsZW50UHJvcGVydGllc01hcC5zZXQocHJvcCwgZXF1aXZhbGVudFByb3BlcnRpZXMpO1xuICB9XG5cbiAgcmV0dXJuIHtwcm9wZXJ0aWVzVG9Qcm9jZXNzLCBlcXVpdmFsZW50UHJvcGVydGllc01hcH07XG59XG4iXX0=