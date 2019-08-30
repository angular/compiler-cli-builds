(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var commonjs_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host");
    var dependency_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver");
    var esm_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    var umd_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host");
    var directory_walker_entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder");
    var targeted_entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var configuration_1 = require("@angular/compiler-cli/ngcc/src/packages/configuration");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var entry_point_bundle_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle");
    var transformer_1 = require("@angular/compiler-cli/ngcc/src/packages/transformer");
    var in_place_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    /**
     * This is the main entry-point into ngcc (aNGular Compatibility Compiler).
     *
     * You can call this function to process one or more npm packages, to ensure
     * that they are compatible with the ivy compiler (ngtsc).
     *
     * @param options The options telling ngcc what to compile and how.
     */
    function mainNgcc(_a) {
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _b = _a.propertiesToConsider, propertiesToConsider = _b === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _b, _c = _a.compileAllFormats, compileAllFormats = _c === void 0 ? true : _c, _d = _a.createNewEntryPointFormats, createNewEntryPointFormats = _d === void 0 ? false : _d, _e = _a.logger, logger = _e === void 0 ? new console_logger_1.ConsoleLogger(console_logger_1.LogLevel.info) : _e, pathMappings = _a.pathMappings;
        var fileSystem = file_system_1.getFileSystem();
        // The function for performing the analysis.
        var analyzeFn = function () {
            var e_1, _a, e_2, _b;
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
            var entryPoints = getEntryPoints(fileSystem, config, logger, dependencyResolver, absBasePath, targetEntryPointPath, pathMappings, supportedPropertiesToConsider, compileAllFormats);
            var processingMetadataPerEntryPoint = new Map();
            var tasks = [];
            try {
                for (var entryPoints_1 = tslib_1.__values(entryPoints), entryPoints_1_1 = entryPoints_1.next(); !entryPoints_1_1.done; entryPoints_1_1 = entryPoints_1.next()) {
                    var entryPoint = entryPoints_1_1.value;
                    var packageJson = entryPoint.packageJson;
                    var hasProcessedTypings = build_marker_1.hasBeenProcessed(packageJson, 'typings', entryPoint.path);
                    var _c = getPropertiesToProcessAndMarkAsProcessed(packageJson, supportedPropertiesToConsider), propertiesToProcess = _c.propertiesToProcess, propertyToPropertiesToMarkAsProcessed = _c.propertyToPropertiesToMarkAsProcessed;
                    var processDts = !hasProcessedTypings;
                    try {
                        for (var propertiesToProcess_1 = (e_2 = void 0, tslib_1.__values(propertiesToProcess)), propertiesToProcess_1_1 = propertiesToProcess_1.next(); !propertiesToProcess_1_1.done; propertiesToProcess_1_1 = propertiesToProcess_1.next()) {
                            var formatProperty = propertiesToProcess_1_1.value;
                            var formatPropertiesToMarkAsProcessed = propertyToPropertiesToMarkAsProcessed.get(formatProperty);
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
                    processingMetadataPerEntryPoint.set(entryPoint.path, {
                        hasProcessedTypings: hasProcessedTypings,
                        hasAnyProcessedFormat: false,
                    });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (entryPoints_1_1 && !entryPoints_1_1.done && (_a = entryPoints_1.return)) _a.call(entryPoints_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return { processingMetadataPerEntryPoint: processingMetadataPerEntryPoint, tasks: tasks };
        };
        // The function for creating the `compile()` function.
        var createCompileFn = function (onTaskCompleted) {
            var fileWriter = getFileWriter(fileSystem, createNewEntryPointFormats);
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
        // The function for actually planning and getting the work done.
        var executeFn = function (analyzeFn, createCompileFn) {
            var e_3, _a;
            var _b = analyzeFn(), processingMetadataPerEntryPoint = _b.processingMetadataPerEntryPoint, tasks = _b.tasks;
            var compile = createCompileFn(function (task, outcome) {
                var entryPoint = task.entryPoint, formatPropertiesToMarkAsProcessed = task.formatPropertiesToMarkAsProcessed, processDts = task.processDts;
                var processingMeta = processingMetadataPerEntryPoint.get(entryPoint.path);
                processingMeta.hasAnyProcessedFormat = true;
                if (outcome === 1 /* Processed */) {
                    var packageJsonPath = fileSystem.resolve(entryPoint.path, 'package.json');
                    var propsToMarkAsProcessed = tslib_1.__spread(formatPropertiesToMarkAsProcessed);
                    if (processDts) {
                        processingMeta.hasProcessedTypings = true;
                        propsToMarkAsProcessed.push('typings');
                    }
                    build_marker_1.markAsProcessed(fileSystem, entryPoint.packageJson, packageJsonPath, propsToMarkAsProcessed);
                }
            });
            try {
                // Process all tasks.
                for (var tasks_1 = tslib_1.__values(tasks), tasks_1_1 = tasks_1.next(); !tasks_1_1.done; tasks_1_1 = tasks_1.next()) {
                    var task = tasks_1_1.value;
                    var processingMeta = processingMetadataPerEntryPoint.get(task.entryPoint.path);
                    // If we only need one format processed and we already have one for the corresponding
                    // entry-point, skip the task.
                    if (!compileAllFormats && processingMeta.hasAnyProcessedFormat)
                        continue;
                    compile(task);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (tasks_1_1 && !tasks_1_1.done && (_a = tasks_1.return)) _a.call(tasks_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            // Check for entry-points for which we could not process any format at all.
            var unprocessedEntryPointPaths = Array.from(processingMetadataPerEntryPoint.entries())
                .filter(function (_a) {
                var _b = tslib_1.__read(_a, 2), processingMeta = _b[1];
                return !processingMeta.hasAnyProcessedFormat;
            })
                .map(function (_a) {
                var _b = tslib_1.__read(_a, 1), entryPointPath = _b[0];
                return "\n  - " + entryPointPath;
            })
                .join('');
            if (unprocessedEntryPointPaths) {
                throw new Error('Failed to compile any formats for the following entry-points (tried ' +
                    (propertiesToConsider.join(', ') + "): " + unprocessedEntryPointPaths));
            }
        };
        return executeFn(analyzeFn, createCompileFn);
    }
    exports.mainNgcc = mainNgcc;
    function ensureSupportedProperties(properties) {
        var e_4, _a;
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
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        if (supportedProperties.length === 0) {
            throw new Error("No supported format property to consider among [" + properties.join(', ') + "]. " +
                ("Supported properties: " + entry_point_1.SUPPORTED_FORMAT_PROPERTIES.join(', ')));
        }
        return supportedProperties;
    }
    function getFileWriter(fs, createNewEntryPointFormats) {
        return createNewEntryPointFormats ? new new_entry_point_file_writer_1.NewEntryPointFileWriter(fs) : new in_place_file_writer_1.InPlaceFileWriter(fs);
    }
    function getEntryPoints(fs, config, logger, resolver, basePath, targetEntryPointPath, pathMappings, propertiesToConsider, compileAllFormats) {
        var _a = (targetEntryPointPath !== undefined) ?
            getTargetedEntryPoints(fs, config, logger, resolver, basePath, targetEntryPointPath, propertiesToConsider, compileAllFormats, pathMappings) :
            getAllEntryPoints(fs, config, logger, resolver, basePath, pathMappings), entryPoints = _a.entryPoints, invalidEntryPoints = _a.invalidEntryPoints;
        logInvalidEntryPoints(logger, invalidEntryPoints);
        return entryPoints;
    }
    function getTargetedEntryPoints(fs, config, logger, resolver, basePath, targetEntryPointPath, propertiesToConsider, compileAllFormats, pathMappings) {
        var absoluteTargetEntryPointPath = file_system_1.resolve(basePath, targetEntryPointPath);
        if (hasProcessedTargetEntryPoint(fs, absoluteTargetEntryPointPath, propertiesToConsider, compileAllFormats)) {
            logger.debug('The target entry-point has already been processed');
            return { entryPoints: [], invalidEntryPoints: [], ignoredDependencies: [] };
        }
        var finder = new targeted_entry_point_finder_1.TargetedEntryPointFinder(fs, config, logger, resolver, basePath, absoluteTargetEntryPointPath, pathMappings);
        var entryPointInfo = finder.findEntryPoints();
        var invalidTarget = entryPointInfo.invalidEntryPoints.find(function (i) { return i.entryPoint.path === absoluteTargetEntryPointPath; });
        if (invalidTarget !== undefined) {
            throw new Error("The target entry-point \"" + invalidTarget.entryPoint.name + "\" has missing dependencies:\n" +
                invalidTarget.missingDependencies.map(function (dep) { return " - " + dep + "\n"; }));
        }
        if (entryPointInfo.entryPoints.length === 0) {
            markNonAngularPackageAsProcessed(fs, absoluteTargetEntryPointPath);
        }
        return entryPointInfo;
    }
    function getAllEntryPoints(fs, config, logger, resolver, basePath, pathMappings) {
        var finder = new directory_walker_entry_point_finder_1.DirectoryWalkerEntryPointFinder(fs, config, logger, resolver, basePath, pathMappings);
        return finder.findEntryPoints();
    }
    function hasProcessedTargetEntryPoint(fs, targetPath, propertiesToConsider, compileAllFormats) {
        var e_5, _a;
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
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (propertiesToConsider_1_1 && !propertiesToConsider_1_1.done && (_a = propertiesToConsider_1.return)) _a.call(propertiesToConsider_1);
            }
            finally { if (e_5) throw e_5.error; }
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
    function markNonAngularPackageAsProcessed(fs, path) {
        var packageJsonPath = file_system_1.resolve(path, 'package.json');
        var packageJson = JSON.parse(fs.readFile(packageJsonPath));
        // Note: We are marking all supported properties as processed, even if they don't exist in the
        //       `package.json` file. While this is redundant, it is also harmless.
        build_marker_1.markAsProcessed(fs, packageJson, packageJsonPath, entry_point_1.SUPPORTED_FORMAT_PROPERTIES);
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
     *   based on the specified `propertiesToConsider`, the properties in `package.json` and their
     *   corresponding format-paths. NOTE: Only one property per format-path needs to be processed.
     * - `propertyToPropertiesToMarkAsProcessed`: A mapping from each property in `propertiesToProcess`
     *   to the list of other properties in `package.json` that need to be marked as processed as soon
     *   as of the former being processed.
     */
    function getPropertiesToProcessAndMarkAsProcessed(packageJson, propertiesToConsider) {
        var e_6, _a, e_7, _b, e_8, _c;
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
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (propertiesToConsider_2_1 && !propertiesToConsider_2_1.done && (_a = propertiesToConsider_2.return)) _a.call(propertiesToConsider_2);
            }
            finally { if (e_6) throw e_6.error; }
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
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (SUPPORTED_FORMAT_PROPERTIES_1_1 && !SUPPORTED_FORMAT_PROPERTIES_1_1.done && (_b = SUPPORTED_FORMAT_PROPERTIES_1.return)) _b.call(SUPPORTED_FORMAT_PROPERTIES_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        var propertyToPropertiesToMarkAsProcessed = new Map();
        try {
            for (var propertiesToConsider_3 = tslib_1.__values(propertiesToConsider), propertiesToConsider_3_1 = propertiesToConsider_3.next(); !propertiesToConsider_3_1.done; propertiesToConsider_3_1 = propertiesToConsider_3.next()) {
                var prop = propertiesToConsider_3_1.value;
                var formatPath = packageJson[prop];
                var propertiesToMarkAsProcessed = formatPathToProperties[formatPath];
                propertyToPropertiesToMarkAsProcessed.set(prop, propertiesToMarkAsProcessed);
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (propertiesToConsider_3_1 && !propertiesToConsider_3_1.done && (_c = propertiesToConsider_3.return)) _c.call(propertiesToConsider_3);
            }
            finally { if (e_8) throw e_8.error; }
        }
        return { propertiesToProcess: propertiesToProcess, propertyToPropertiesToMarkAsProcessed: propertyToPropertiesToMarkAsProcessed };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQywyRUFBc0g7SUFFdEgsaUhBQStFO0lBQy9FLHVHQUFnSDtJQUNoSCx1R0FBcUU7SUFDckUsK0ZBQThEO0lBQzlELHVHQUFxRTtJQUNyRSw2SUFBeUc7SUFDekcsNkhBQTBGO0lBRTFGLHdGQUFpRTtJQUVqRSxxRkFBMEU7SUFDMUUsdUZBQTJEO0lBQzNELG1GQUFtSjtJQUNuSixpR0FBbUU7SUFDbkUsbUZBQW1EO0lBR25ELG9HQUFpRTtJQUNqRSxrSEFBOEU7SUE2QzlFOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixRQUFRLENBQ3BCLEVBRXNFO1lBRnJFLHNCQUFRLEVBQUUsOENBQW9CLEVBQUUsNEJBQWtELEVBQWxELHFGQUFrRCxFQUNsRix5QkFBd0IsRUFBeEIsNkNBQXdCLEVBQUUsa0NBQWtDLEVBQWxDLHVEQUFrQyxFQUM1RCxjQUF5QyxFQUF6QyxnR0FBeUMsRUFBRSw4QkFBWTtRQUMxRCxJQUFNLFVBQVUsR0FBRywyQkFBYSxFQUFFLENBQUM7UUFFbkMsNENBQTRDO1FBQzVDLElBQU0sU0FBUyxHQUFjOztZQUMzQixJQUFNLDZCQUE2QixHQUFHLHlCQUF5QixDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFFdEYsSUFBTSxjQUFjLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNwRSxJQUFNLGlCQUFpQixHQUFHLElBQUksdUNBQWlCLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzVFLElBQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDNUUsSUFBTSxz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QUFJLEdBQUcsRUFBb0QsQ0FBQzs7WUFDaEUsS0FBbUIsSUFBQSx5QkFBQSxpQkFBQSxvQkFBb0IsQ0FBQSwwREFBQSw0RkFBRTtnQkFBcEMsSUFBTSxJQUFJLGlDQUFBO2dCQUNiLElBQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUcsQ0FBQztnQkFDdkMsSUFBTSwyQkFBMkIsR0FBRyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDdkUscUNBQXFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO2FBQzlFOzs7Ozs7Ozs7UUFFRCxPQUFPLEVBQUMsbUJBQW1CLHFCQUFBLEVBQUUscUNBQXFDLHVDQUFBLEVBQUMsQ0FBQztJQUN0RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgZ2V0RmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtDb21tb25Kc0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIEludmFsaWRFbnRyeVBvaW50LCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtVbWREZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtBbmFseXplRm4sIENyZWF0ZUNvbXBpbGVGbiwgRW50cnlQb2ludFByb2Nlc3NpbmdNZXRhZGF0YSwgRXhlY3V0ZUZuLCBUYXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWV9IGZyb20gJy4vZXhlY3V0aW9uL2FwaSc7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtoYXNCZWVuUHJvY2Vzc2VkLCBtYXJrQXNQcm9jZXNzZWR9IGZyb20gJy4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7bWFrZUVudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2VzIHRvIHByb2Nlc3MuICovXG4gIGJhc2VQYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byB0aGUgcHJpbWFyeSBwYWNrYWdlIHRvIGJlIHByb2Nlc3NlZC4gSWYgbm90IGFic29sdXRlIHRoZW4gaXQgbXVzdCBiZSByZWxhdGl2ZSB0b1xuICAgKiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBBbGwgaXRzIGRlcGVuZGVuY2llcyB3aWxsIG5lZWQgdG8gYmUgcHJvY2Vzc2VkIHRvby5cbiAgICovXG4gIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogc3RyaW5nO1xuICAvKipcbiAgICogV2hpY2ggZW50cnktcG9pbnQgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uIHRvIGNvbnNpZGVyIHdoZW4gcHJvY2Vzc2luZyBhbiBlbnRyeS1wb2ludC5cbiAgICogRWFjaCBwcm9wZXJ0eSBzaG91bGQgaG9sZCBhIHBhdGggdG8gdGhlIHBhcnRpY3VsYXIgYnVuZGxlIGZvcm1hdCBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICAgKiBEZWZhdWx0cyB0byBhbGwgdGhlIHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbi5cbiAgICovXG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyPzogc3RyaW5nW107XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHByb2Nlc3MgYWxsIGZvcm1hdHMgc3BlY2lmaWVkIGJ5IChgcHJvcGVydGllc1RvQ29uc2lkZXJgKSAgb3IgdG8gc3RvcCBwcm9jZXNzaW5nXG4gICAqIHRoaXMgZW50cnktcG9pbnQgYXQgdGhlIGZpcnN0IG1hdGNoaW5nIGZvcm1hdC4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgY29tcGlsZUFsbEZvcm1hdHM/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hldGhlciB0byBjcmVhdGUgbmV3IGVudHJ5LXBvaW50cyBidW5kbGVzIHJhdGhlciB0aGFuIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBmaWxlcy5cbiAgICovXG4gIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBsb2dnZXIgdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGxvZyBtZXNzYWdlcy5cbiAgICovXG4gIGxvZ2dlcj86IExvZ2dlcjtcbiAgLyoqXG4gICAqIFBhdGhzIG1hcHBpbmcgY29uZmlndXJhdGlvbiAoYHBhdGhzYCBhbmQgYGJhc2VVcmxgKSwgYXMgZm91bmQgaW4gYHRzLkNvbXBpbGVyT3B0aW9uc2AuXG4gICAqIFRoZXNlIGFyZSB1c2VkIHRvIHJlc29sdmUgcGF0aHMgdG8gbG9jYWxseSBidWlsdCBBbmd1bGFyIGxpYnJhcmllcy5cbiAgICovXG4gIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncztcbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBmaWxlLXN5c3RlbSBzZXJ2aWNlIHRoYXQgd2lsbCBiZSB1c2VkIGJ5IG5nY2MgZm9yIGFsbCBmaWxlIGludGVyYWN0aW9ucy5cbiAgICovXG4gIGZpbGVTeXN0ZW0/OiBGaWxlU3lzdGVtO1xufVxuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhcbiAgICB7YmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgICAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSwgcGF0aE1hcHBpbmdzfTogTmdjY09wdGlvbnMpOiB2b2lkIHtcbiAgY29uc3QgZmlsZVN5c3RlbSA9IGdldEZpbGVTeXN0ZW0oKTtcblxuICAvLyBUaGUgZnVuY3Rpb24gZm9yIHBlcmZvcm1pbmcgdGhlIGFuYWx5c2lzLlxuICBjb25zdCBhbmFseXplRm46IEFuYWx5emVGbiA9ICgpID0+IHtcbiAgICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciA9IGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllc1RvQ29uc2lkZXIpO1xuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzKTtcbiAgICBjb25zdCBlc21EZXBlbmRlbmN5SG9zdCA9IG5ldyBFc21EZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gICAgY29uc3QgdW1kRGVwZW5kZW5jeUhvc3QgPSBuZXcgVW1kRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICAgIGNvbnN0IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3QgPSBuZXcgQ29tbW9uSnNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gICAgY29uc3QgZGVwZW5kZW5jeVJlc29sdmVyID0gbmV3IERlcGVuZGVuY3lSZXNvbHZlcihmaWxlU3lzdGVtLCBsb2dnZXIsIHtcbiAgICAgIGVzbTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgZXNtMjAxNTogZXNtRGVwZW5kZW5jeUhvc3QsXG4gICAgICB1bWQ6IHVtZERlcGVuZGVuY3lIb3N0LFxuICAgICAgY29tbW9uanM6IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3RcbiAgICB9KTtcblxuICAgIGNvbnN0IGFic0Jhc2VQYXRoID0gYWJzb2x1dGVGcm9tKGJhc2VQYXRoKTtcbiAgICBjb25zdCBjb25maWcgPSBuZXcgTmdjY0NvbmZpZ3VyYXRpb24oZmlsZVN5c3RlbSwgZGlybmFtZShhYnNCYXNlUGF0aCkpO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gZ2V0RW50cnlQb2ludHMoXG4gICAgICAgIGZpbGVTeXN0ZW0sIGNvbmZpZywgbG9nZ2VyLCBkZXBlbmRlbmN5UmVzb2x2ZXIsIGFic0Jhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCxcbiAgICAgICAgcGF0aE1hcHBpbmdzLCBzdXBwb3J0ZWRQcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpO1xuXG4gICAgY29uc3QgcHJvY2Vzc2luZ01ldGFkYXRhUGVyRW50cnlQb2ludCA9IG5ldyBNYXA8c3RyaW5nLCBFbnRyeVBvaW50UHJvY2Vzc2luZ01ldGFkYXRhPigpO1xuICAgIGNvbnN0IHRhc2tzOiBUYXNrW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZW50cnlQb2ludCBvZiBlbnRyeVBvaW50cykge1xuICAgICAgY29uc3QgcGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgICAgY29uc3QgaGFzUHJvY2Vzc2VkVHlwaW5ncyA9IGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sICd0eXBpbmdzJywgZW50cnlQb2ludC5wYXRoKTtcbiAgICAgIGNvbnN0IHtwcm9wZXJ0aWVzVG9Qcm9jZXNzLCBwcm9wZXJ0eVRvUHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkfSA9XG4gICAgICAgICAgZ2V0UHJvcGVydGllc1RvUHJvY2Vzc0FuZE1hcmtBc1Byb2Nlc3NlZChwYWNrYWdlSnNvbiwgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIpO1xuICAgICAgbGV0IHByb2Nlc3NEdHMgPSAhaGFzUHJvY2Vzc2VkVHlwaW5ncztcblxuICAgICAgZm9yIChjb25zdCBmb3JtYXRQcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Qcm9jZXNzKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCA9XG4gICAgICAgICAgICBwcm9wZXJ0eVRvUHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkLmdldChmb3JtYXRQcm9wZXJ0eSkgITtcbiAgICAgICAgdGFza3MucHVzaCh7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30pO1xuXG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyB0eXBpbmdzIGZvciB0aGUgZmlyc3QgcHJvcGVydHkgKGlmIG5vdCBhbHJlYWR5IHByb2Nlc3NlZCkuXG4gICAgICAgIHByb2Nlc3NEdHMgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcHJvY2Vzc2luZ01ldGFkYXRhUGVyRW50cnlQb2ludC5zZXQoZW50cnlQb2ludC5wYXRoLCB7XG4gICAgICAgIGhhc1Byb2Nlc3NlZFR5cGluZ3MsXG4gICAgICAgIGhhc0FueVByb2Nlc3NlZEZvcm1hdDogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3Byb2Nlc3NpbmdNZXRhZGF0YVBlckVudHJ5UG9pbnQsIHRhc2tzfTtcbiAgfTtcblxuICAvLyBUaGUgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIHRoZSBgY29tcGlsZSgpYCBmdW5jdGlvbi5cbiAgY29uc3QgY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4gPSBvblRhc2tDb21wbGV0ZWQgPT4ge1xuICAgIGNvbnN0IGZpbGVXcml0ZXIgPSBnZXRGaWxlV3JpdGVyKGZpbGVTeXN0ZW0sIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcbiAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmaWxlU3lzdGVtLCBsb2dnZXIpO1xuXG4gICAgcmV0dXJuICh0YXNrOiBUYXNrKSA9PiB7XG4gICAgICBjb25zdCB7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30gPSB0YXNrO1xuXG4gICAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJzsgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5KTtcblxuICAgICAgLy8gQWxsIHByb3BlcnRpZXMgbGlzdGVkIGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCBhcmUgZ3VhcmFudGVlZCB0byBwb2ludCB0byBhIGZvcm1hdC1wYXRoXG4gICAgICAvLyAoaS5lLiB0aGV5IGFyZSBkZWZpbmVkIGluIGBlbnRyeVBvaW50LnBhY2thZ2VKc29uYCkuIEZ1cnRoZXJtb3JlLCB0aGV5IGFyZSBhbHNvIGd1YXJhbnRlZWRcbiAgICAgIC8vIHRvIGJlIGFtb25nIGBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVNgLlxuICAgICAgLy8gQmFzZWQgb24gdGhlIGFib3ZlLCBgZm9ybWF0UGF0aGAgc2hvdWxkIGFsd2F5cyBiZSBkZWZpbmVkIGFuZCBgZ2V0RW50cnlQb2ludEZvcm1hdCgpYFxuICAgICAgLy8gc2hvdWxkIGFsd2F5cyByZXR1cm4gYSBmb3JtYXQgaGVyZSAoYW5kIG5vdCBgdW5kZWZpbmVkYCkuXG4gICAgICBpZiAoIWZvcm1hdFBhdGggfHwgIWZvcm1hdCkge1xuICAgICAgICAvLyBUaGlzIHNob3VsZCBuZXZlciBoYXBwZW4uXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBJbnZhcmlhbnQgdmlvbGF0ZWQ6IE5vIGZvcm1hdC1wYXRoIG9yIGZvcm1hdCBmb3IgJHtlbnRyeVBvaW50LnBhdGh9IDogYCArXG4gICAgICAgICAgICBgJHtmb3JtYXRQcm9wZXJ0eX0gKGZvcm1hdFBhdGg6ICR7Zm9ybWF0UGF0aH0gfCBmb3JtYXQ6ICR7Zm9ybWF0fSlgKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGZvcm1hdC1wYXRoIHdoaWNoIHRoZSBwcm9wZXJ0eSBtYXBzIHRvIGlzIGFscmVhZHkgcHJvY2Vzc2VkIC0gbm90aGluZyB0byBkby5cbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBmb3JtYXRQcm9wZXJ0eSwgZW50cnlQb2ludC5wYXRoKSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5BbHJlYWR5UHJvY2Vzc2VkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQYXRoLCBpc0NvcmUsIGZvcm1hdCwgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzLCB0cnVlKTtcblxuICAgICAgbG9nZ2VyLmluZm8oYENvbXBpbGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fSBhcyAke2Zvcm1hdH1gKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGJ1bmRsZSk7XG4gICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4odHMuZm9ybWF0RGlhZ25vc3RpY3MocmVzdWx0LmRpYWdub3N0aWNzLCBidW5kbGUuc3JjLmhvc3QpKTtcbiAgICAgICAgfVxuICAgICAgICBmaWxlV3JpdGVyLndyaXRlQnVuZGxlKGJ1bmRsZSwgcmVzdWx0LnRyYW5zZm9ybWVkRmlsZXMsIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBlcnJvcnMgPSB0cy5mb3JtYXREaWFnbm9zdGljcyhyZXN1bHQuZGlhZ25vc3RpY3MsIGJ1bmRsZS5zcmMuaG9zdCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBlbnRyeS1wb2ludCAke2VudHJ5UG9pbnQubmFtZX0gZHVlIHRvIGNvbXBpbGF0aW9uIGVycm9yczpcXG4ke2Vycm9yc31gKTtcbiAgICAgIH1cblxuICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5Qcm9jZXNzZWQpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBhY3R1YWxseSBwbGFubmluZyBhbmQgZ2V0dGluZyB0aGUgd29yayBkb25lLlxuICBjb25zdCBleGVjdXRlRm46IEV4ZWN1dGVGbiA9IChhbmFseXplRm46IEFuYWx5emVGbiwgY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4pID0+IHtcbiAgICBjb25zdCB7cHJvY2Vzc2luZ01ldGFkYXRhUGVyRW50cnlQb2ludCwgdGFza3N9ID0gYW5hbHl6ZUZuKCk7XG4gICAgY29uc3QgY29tcGlsZSA9IGNyZWF0ZUNvbXBpbGVGbigodGFzaywgb3V0Y29tZSkgPT4ge1xuICAgICAgY29uc3Qge2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30gPSB0YXNrO1xuICAgICAgY29uc3QgcHJvY2Vzc2luZ01ldGEgPSBwcm9jZXNzaW5nTWV0YWRhdGFQZXJFbnRyeVBvaW50LmdldChlbnRyeVBvaW50LnBhdGgpICE7XG4gICAgICBwcm9jZXNzaW5nTWV0YS5oYXNBbnlQcm9jZXNzZWRGb3JtYXQgPSB0cnVlO1xuXG4gICAgICBpZiAob3V0Y29tZSA9PT0gVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZCkge1xuICAgICAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBmaWxlU3lzdGVtLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGNvbnN0IHByb3BzVG9NYXJrQXNQcm9jZXNzZWQ6IChFbnRyeVBvaW50SnNvblByb3BlcnR5IHwgJ3R5cGluZ3MnKVtdID1cbiAgICAgICAgICAgIFsuLi5mb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWRdO1xuXG4gICAgICAgIGlmIChwcm9jZXNzRHRzKSB7XG4gICAgICAgICAgcHJvY2Vzc2luZ01ldGEuaGFzUHJvY2Vzc2VkVHlwaW5ncyA9IHRydWU7XG4gICAgICAgICAgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZC5wdXNoKCd0eXBpbmdzJyk7XG4gICAgICAgIH1cblxuICAgICAgICBtYXJrQXNQcm9jZXNzZWQoXG4gICAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LnBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGgsIHByb3BzVG9NYXJrQXNQcm9jZXNzZWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gUHJvY2VzcyBhbGwgdGFza3MuXG4gICAgZm9yIChjb25zdCB0YXNrIG9mIHRhc2tzKSB7XG4gICAgICBjb25zdCBwcm9jZXNzaW5nTWV0YSA9IHByb2Nlc3NpbmdNZXRhZGF0YVBlckVudHJ5UG9pbnQuZ2V0KHRhc2suZW50cnlQb2ludC5wYXRoKSAhO1xuXG4gICAgICAvLyBJZiB3ZSBvbmx5IG5lZWQgb25lIGZvcm1hdCBwcm9jZXNzZWQgYW5kIHdlIGFscmVhZHkgaGF2ZSBvbmUgZm9yIHRoZSBjb3JyZXNwb25kaW5nXG4gICAgICAvLyBlbnRyeS1wb2ludCwgc2tpcCB0aGUgdGFzay5cbiAgICAgIGlmICghY29tcGlsZUFsbEZvcm1hdHMgJiYgcHJvY2Vzc2luZ01ldGEuaGFzQW55UHJvY2Vzc2VkRm9ybWF0KSBjb250aW51ZTtcblxuICAgICAgY29tcGlsZSh0YXNrKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgZW50cnktcG9pbnRzIGZvciB3aGljaCB3ZSBjb3VsZCBub3QgcHJvY2VzcyBhbnkgZm9ybWF0IGF0IGFsbC5cbiAgICBjb25zdCB1bnByb2Nlc3NlZEVudHJ5UG9pbnRQYXRocyA9XG4gICAgICAgIEFycmF5LmZyb20ocHJvY2Vzc2luZ01ldGFkYXRhUGVyRW50cnlQb2ludC5lbnRyaWVzKCkpXG4gICAgICAgICAgICAuZmlsdGVyKChbLCBwcm9jZXNzaW5nTWV0YV0pID0+ICFwcm9jZXNzaW5nTWV0YS5oYXNBbnlQcm9jZXNzZWRGb3JtYXQpXG4gICAgICAgICAgICAubWFwKChbZW50cnlQb2ludFBhdGhdKSA9PiBgXFxuICAtICR7ZW50cnlQb2ludFBhdGh9YClcbiAgICAgICAgICAgIC5qb2luKCcnKTtcblxuICAgIGlmICh1bnByb2Nlc3NlZEVudHJ5UG9pbnRQYXRocykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdGYWlsZWQgdG8gY29tcGlsZSBhbnkgZm9ybWF0cyBmb3IgdGhlIGZvbGxvd2luZyBlbnRyeS1wb2ludHMgKHRyaWVkICcgK1xuICAgICAgICAgIGAke3Byb3BlcnRpZXNUb0NvbnNpZGVyLmpvaW4oJywgJyl9KTogJHt1bnByb2Nlc3NlZEVudHJ5UG9pbnRQYXRoc31gKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGV4ZWN1dGVGbihhbmFseXplRm4sIGNyZWF0ZUNvbXBpbGVGbik7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZVN1cHBvcnRlZFByb3BlcnRpZXMocHJvcGVydGllczogc3RyaW5nW10pOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10ge1xuICAvLyBTaG9ydC1jaXJjdWl0IHRoZSBjYXNlIHdoZXJlIGBwcm9wZXJ0aWVzYCBoYXMgZmFsbGVuIGJhY2sgdG8gdGhlIGRlZmF1bHQgdmFsdWU6XG4gIC8vIGBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVNgXG4gIGlmIChwcm9wZXJ0aWVzID09PSBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHJldHVybiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVM7XG5cbiAgY29uc3Qgc3VwcG9ydGVkUHJvcGVydGllczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID0gW107XG5cbiAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXMgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdKSB7XG4gICAgaWYgKFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUy5pbmRleE9mKHByb3ApICE9PSAtMSkge1xuICAgICAgc3VwcG9ydGVkUHJvcGVydGllcy5wdXNoKHByb3ApO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzdXBwb3J0ZWRQcm9wZXJ0aWVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYE5vIHN1cHBvcnRlZCBmb3JtYXQgcHJvcGVydHkgdG8gY29uc2lkZXIgYW1vbmcgWyR7cHJvcGVydGllcy5qb2luKCcsICcpfV0uIGAgK1xuICAgICAgICBgU3VwcG9ydGVkIHByb3BlcnRpZXM6ICR7U1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmpvaW4oJywgJyl9YCk7XG4gIH1cblxuICByZXR1cm4gc3VwcG9ydGVkUHJvcGVydGllcztcbn1cblxuZnVuY3Rpb24gZ2V0RmlsZVdyaXRlcihmczogRmlsZVN5c3RlbSwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM6IGJvb2xlYW4pOiBGaWxlV3JpdGVyIHtcbiAgcmV0dXJuIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID8gbmV3IE5ld0VudHJ5UG9pbnRGaWxlV3JpdGVyKGZzKSA6IG5ldyBJblBsYWNlRmlsZVdyaXRlcihmcyk7XG59XG5cbmZ1bmN0aW9uIGdldEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlcixcbiAgICBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQsIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbik6IEVudHJ5UG9pbnRbXSB7XG4gIGNvbnN0IHtlbnRyeVBvaW50cywgaW52YWxpZEVudHJ5UG9pbnRzfSA9ICh0YXJnZXRFbnRyeVBvaW50UGF0aCAhPT0gdW5kZWZpbmVkKSA/XG4gICAgICBnZXRUYXJnZXRlZEVudHJ5UG9pbnRzKFxuICAgICAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIsXG4gICAgICAgICAgY29tcGlsZUFsbEZvcm1hdHMsIHBhdGhNYXBwaW5ncykgOlxuICAgICAgZ2V0QWxsRW50cnlQb2ludHMoZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIGxvZ0ludmFsaWRFbnRyeVBvaW50cyhsb2dnZXIsIGludmFsaWRFbnRyeVBvaW50cyk7XG4gIHJldHVybiBlbnRyeVBvaW50cztcbn1cblxuZnVuY3Rpb24gZ2V0VGFyZ2V0ZWRFbnRyeVBvaW50cyhcbiAgICBmczogRmlsZVN5c3RlbSwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgbG9nZ2VyOiBMb2dnZXIsIHJlc29sdmVyOiBEZXBlbmRlbmN5UmVzb2x2ZXIsXG4gICAgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aDogc3RyaW5nLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4sIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgY29uc3QgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCA9IHJlc29sdmUoYmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoKTtcbiAgaWYgKGhhc1Byb2Nlc3NlZFRhcmdldEVudHJ5UG9pbnQoXG4gICAgICAgICAgZnMsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cykpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1RoZSB0YXJnZXQgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQnKTtcbiAgICByZXR1cm4ge2VudHJ5UG9pbnRzOiBbXSwgaW52YWxpZEVudHJ5UG9pbnRzOiBbXSwgaWdub3JlZERlcGVuZGVuY2llczogW119O1xuICB9XG4gIGNvbnN0IGZpbmRlciA9IG5ldyBUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXIoXG4gICAgICBmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgY29uc3QgZW50cnlQb2ludEluZm8gPSBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKCk7XG4gIGNvbnN0IGludmFsaWRUYXJnZXQgPSBlbnRyeVBvaW50SW5mby5pbnZhbGlkRW50cnlQb2ludHMuZmluZChcbiAgICAgIGkgPT4gaS5lbnRyeVBvaW50LnBhdGggPT09IGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgpO1xuICBpZiAoaW52YWxpZFRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGhlIHRhcmdldCBlbnRyeS1wb2ludCBcIiR7aW52YWxpZFRhcmdldC5lbnRyeVBvaW50Lm5hbWV9XCIgaGFzIG1pc3NpbmcgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICBpbnZhbGlkVGFyZ2V0Lm1pc3NpbmdEZXBlbmRlbmNpZXMubWFwKGRlcCA9PiBgIC0gJHtkZXB9XFxuYCkpO1xuICB9XG4gIGlmIChlbnRyeVBvaW50SW5mby5lbnRyeVBvaW50cy5sZW5ndGggPT09IDApIHtcbiAgICBtYXJrTm9uQW5ndWxhclBhY2thZ2VBc1Byb2Nlc3NlZChmcywgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCk7XG4gIH1cbiAgcmV0dXJuIGVudHJ5UG9pbnRJbmZvO1xufVxuXG5mdW5jdGlvbiBnZXRBbGxFbnRyeVBvaW50cyhcbiAgICBmczogRmlsZVN5c3RlbSwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgbG9nZ2VyOiBMb2dnZXIsIHJlc29sdmVyOiBEZXBlbmRlbmN5UmVzb2x2ZXIsXG4gICAgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLCBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8IHVuZGVmaW5lZCk6IFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gIGNvbnN0IGZpbmRlciA9XG4gICAgICBuZXcgRGlyZWN0b3J5V2Fsa2VyRW50cnlQb2ludEZpbmRlcihmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgcmV0dXJuIGZpbmRlci5maW5kRW50cnlQb2ludHMoKTtcbn1cblxuZnVuY3Rpb24gaGFzUHJvY2Vzc2VkVGFyZ2V0RW50cnlQb2ludChcbiAgICBmczogRmlsZVN5c3RlbSwgdGFyZ2V0UGF0aDogQWJzb2x1dGVGc1BhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbikge1xuICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSByZXNvbHZlKHRhcmdldFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gSXQgbWlnaHQgYmUgdGhhdCB0aGlzIHRhcmdldCBpcyBjb25maWd1cmVkIGluIHdoaWNoIGNhc2UgaXRzIHBhY2thZ2UuanNvbiBtaWdodCBub3QgZXhpc3QuXG4gIGlmICghZnMuZXhpc3RzKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuXG4gIGZvciAoY29uc3QgcHJvcGVydHkgb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBpZiAocGFja2FnZUpzb25bcHJvcGVydHldKSB7XG4gICAgICAvLyBIZXJlIGlzIGEgcHJvcGVydHkgdGhhdCBzaG91bGQgYmUgcHJvY2Vzc2VkXG4gICAgICBpZiAoaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgcHJvcGVydHkgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgdGFyZ2V0UGF0aCkpIHtcbiAgICAgICAgaWYgKCFjb21waWxlQWxsRm9ybWF0cykge1xuICAgICAgICAgIC8vIEl0IGhhcyBiZWVuIHByb2Nlc3NlZCBhbmQgd2Ugb25seSBuZWVkIG9uZSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEl0IGhhcyBub3QgYmVlbiBwcm9jZXNzZWQgYnV0IHdlIG5lZWQgYWxsIG9mIHRoZW0sIHNvIHdlIGFyZSBkb25lLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIEVpdGhlciBhbGwgZm9ybWF0cyBuZWVkIHRvIGJlIGNvbXBpbGVkIGFuZCB0aGVyZSB3ZXJlIG5vbmUgdGhhdCB3ZXJlIHVucHJvY2Vzc2VkLFxuICAvLyBPciBvbmx5IHRoZSBvbmUgbWF0Y2hpbmcgZm9ybWF0IG5lZWRzIHRvIGJlIGNvbXBpbGVkIGJ1dCB0aGVyZSB3YXMgYXQgbGVhc3Qgb25lIG1hdGNoaW5nXG4gIC8vIHByb3BlcnR5IGJlZm9yZSB0aGUgZmlyc3QgcHJvY2Vzc2VkIGZvcm1hdCB0aGF0IHdhcyB1bnByb2Nlc3NlZC5cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogSWYgd2UgZ2V0IGhlcmUsIHRoZW4gdGhlIHJlcXVlc3RlZCBlbnRyeS1wb2ludCBkaWQgbm90IGNvbnRhaW4gYW55dGhpbmcgY29tcGlsZWQgYnlcbiAqIHRoZSBvbGQgQW5ndWxhciBjb21waWxlci4gVGhlcmVmb3JlIHRoZXJlIGlzIG5vdGhpbmcgZm9yIG5nY2MgdG8gZG8uXG4gKiBTbyBtYXJrIGFsbCBmb3JtYXRzIGluIHRoaXMgZW50cnktcG9pbnQgYXMgcHJvY2Vzc2VkIHNvIHRoYXQgY2xpZW50cyBvZiBuZ2NjIGNhbiBhdm9pZFxuICogdHJpZ2dlcmluZyBuZ2NjIGZvciB0aGlzIGVudHJ5LXBvaW50IGluIHRoZSBmdXR1cmUuXG4gKi9cbmZ1bmN0aW9uIG1hcmtOb25Bbmd1bGFyUGFja2FnZUFzUHJvY2Vzc2VkKGZzOiBGaWxlU3lzdGVtLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSByZXNvbHZlKHBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuXG4gIC8vIE5vdGU6IFdlIGFyZSBtYXJraW5nIGFsbCBzdXBwb3J0ZWQgcHJvcGVydGllcyBhcyBwcm9jZXNzZWQsIGV2ZW4gaWYgdGhleSBkb24ndCBleGlzdCBpbiB0aGVcbiAgLy8gICAgICAgYHBhY2thZ2UuanNvbmAgZmlsZS4gV2hpbGUgdGhpcyBpcyByZWR1bmRhbnQsIGl0IGlzIGFsc28gaGFybWxlc3MuXG4gIG1hcmtBc1Byb2Nlc3NlZChmcywgcGFja2FnZUpzb24sIHBhY2thZ2VKc29uUGF0aCwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKTtcbn1cblxuZnVuY3Rpb24gbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlcjogTG9nZ2VyLCBpbnZhbGlkRW50cnlQb2ludHM6IEludmFsaWRFbnRyeVBvaW50W10pOiB2b2lkIHtcbiAgaW52YWxpZEVudHJ5UG9pbnRzLmZvckVhY2goaW52YWxpZEVudHJ5UG9pbnQgPT4ge1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYEludmFsaWQgZW50cnktcG9pbnQgJHtpbnZhbGlkRW50cnlQb2ludC5lbnRyeVBvaW50LnBhdGh9LmAsXG4gICAgICAgIGBJdCBpcyBtaXNzaW5nIHJlcXVpcmVkIGRlcGVuZGVuY2llczpcXG5gICtcbiAgICAgICAgICAgIGludmFsaWRFbnRyeVBvaW50Lm1pc3NpbmdEZXBlbmRlbmNpZXMubWFwKGRlcCA9PiBgIC0gJHtkZXB9YCkuam9pbignXFxuJykpO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGNvbXB1dGVzIGFuZCByZXR1cm5zIHRoZSBmb2xsb3dpbmc6XG4gKiAtIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYDogQW4gKG9yZGVyZWQpIGxpc3Qgb2YgcHJvcGVydGllcyB0aGF0IGV4aXN0IGFuZCBuZWVkIHRvIGJlIHByb2Nlc3NlZCxcbiAqICAgYmFzZWQgb24gdGhlIHNwZWNpZmllZCBgcHJvcGVydGllc1RvQ29uc2lkZXJgLCB0aGUgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCBhbmQgdGhlaXJcbiAqICAgY29ycmVzcG9uZGluZyBmb3JtYXQtcGF0aHMuIE5PVEU6IE9ubHkgb25lIHByb3BlcnR5IHBlciBmb3JtYXQtcGF0aCBuZWVkcyB0byBiZSBwcm9jZXNzZWQuXG4gKiAtIGBwcm9wZXJ0eVRvUHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkYDogQSBtYXBwaW5nIGZyb20gZWFjaCBwcm9wZXJ0eSBpbiBgcHJvcGVydGllc1RvUHJvY2Vzc2BcbiAqICAgdG8gdGhlIGxpc3Qgb2Ygb3RoZXIgcHJvcGVydGllcyBpbiBgcGFja2FnZS5qc29uYCB0aGF0IG5lZWQgdG8gYmUgbWFya2VkIGFzIHByb2Nlc3NlZCBhcyBzb29uXG4gKiAgIGFzIG9mIHRoZSBmb3JtZXIgYmVpbmcgcHJvY2Vzc2VkLlxuICovXG5mdW5jdGlvbiBnZXRQcm9wZXJ0aWVzVG9Qcm9jZXNzQW5kTWFya0FzUHJvY2Vzc2VkKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10pOiB7XG4gIHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXTtcbiAgcHJvcGVydHlUb1Byb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZDogTWFwPEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXT47XG59IHtcbiAgY29uc3QgZm9ybWF0UGF0aHNUb0NvbnNpZGVyID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgY29uc3QgcHJvcGVydGllc1RvUHJvY2VzczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdID0gW107XG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIG5vdCBkZWZpbmVkIGluIGBwYWNrYWdlLmpzb25gLlxuICAgIGlmICh0eXBlb2YgZm9ybWF0UGF0aCAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBtYXAgdG8gdGhlIHNhbWUgZm9ybWF0LXBhdGggYXMgYSBwcmVjZWRpbmcgcHJvcGVydHkuXG4gICAgaWYgKGZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gUHJvY2VzcyB0aGlzIHByb3BlcnR5LCBiZWNhdXNlIGl0IGlzIHRoZSBmaXJzdCBvbmUgdG8gbWFwIHRvIHRoaXMgZm9ybWF0LXBhdGguXG4gICAgZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmFkZChmb3JtYXRQYXRoKTtcbiAgICBwcm9wZXJ0aWVzVG9Qcm9jZXNzLnB1c2gocHJvcCk7XG4gIH1cblxuICBjb25zdCBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzOiB7W2Zvcm1hdFBhdGg6IHN0cmluZ106IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXX0gPSB7fTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXTtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIG5vdCBkZWZpbmVkIGluIGBwYWNrYWdlLmpzb25gLlxuICAgIGlmICh0eXBlb2YgZm9ybWF0UGF0aCAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBkbyBub3QgbWFwIHRvIGEgZm9ybWF0LXBhdGggdGhhdCB3aWxsIGJlIGNvbnNpZGVyZWQuXG4gICAgaWYgKCFmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIEFkZCB0aGlzIHByb3BlcnR5IHRvIHRoZSBtYXAuXG4gICAgY29uc3QgbGlzdCA9IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF0gfHwgKGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF0gPSBbXSk7XG4gICAgbGlzdC5wdXNoKHByb3ApO1xuICB9XG5cbiAgY29uc3QgcHJvcGVydHlUb1Byb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCA9XG4gICAgICBuZXcgTWFwPEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXT4oKTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdICE7XG4gICAgY29uc3QgcHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXTtcbiAgICBwcm9wZXJ0eVRvUHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkLnNldChwcm9wLCBwcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQpO1xuICB9XG5cbiAgcmV0dXJuIHtwcm9wZXJ0aWVzVG9Qcm9jZXNzLCBwcm9wZXJ0eVRvUHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkfTtcbn1cbiJdfQ==