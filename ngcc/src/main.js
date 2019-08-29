(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", "@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
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
                var transformedFiles = transformer.transform(bundle);
                fileWriter.writeBundle(bundle, transformedFiles, formatPropertiesToMarkAsProcessed);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUFzSDtJQUV0SCxpSEFBK0U7SUFDL0UsdUdBQWdIO0lBQ2hILHVHQUFxRTtJQUNyRSwrRkFBOEQ7SUFDOUQsdUdBQXFFO0lBQ3JFLDZJQUF5RztJQUN6Ryw2SEFBMEY7SUFFMUYsd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSx1RkFBMkQ7SUFDM0QsbUZBQW1KO0lBQ25KLGlHQUFtRTtJQUNuRSxtRkFBbUQ7SUFHbkQsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQThDOUU7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLFFBQVEsQ0FDcEIsRUFFc0U7WUFGckUsc0JBQVEsRUFBRSw4Q0FBb0IsRUFBRSw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xGLHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFBRSxrQ0FBa0MsRUFBbEMsdURBQWtDLEVBQzVELGNBQXlDLEVBQXpDLGdHQUF5QyxFQUFFLDhCQUFZO1FBQzFELElBQU0sVUFBVSxHQUFHLDJCQUFhLEVBQUUsQ0FBQztRQUVuQyw0Q0FBNEM7UUFDNUMsSUFBTSxTQUFTLEdBQWM7O1lBQzNCLElBQU0sNkJBQTZCLEdBQUcseUJBQXlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUV0RixJQUFNLGNBQWMsR0FBRyxJQUFJLGdDQUFjLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3BFLElBQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDNUUsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLHVDQUFpQixDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUM1RSxJQUFNLHNCQUFzQixHQUFHLElB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O2FBQ2hDOzs7Ozs7Ozs7UUFFRCxJQUFNLHNCQUFzQixHQUFxRCxFQUFFLENBQUM7O1lBQ3BGLEtBQW1CLElBQUEsZ0NBQUEsaUJBQUEseUNBQTJCLENBQUEsd0VBQUEsaUhBQUU7Z0JBQTNDLElBQU0sSUFBSSx3Q0FBQTtnQkFDYixJQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRXJDLDREQUE0RDtnQkFDNUQsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRO29CQUFFLFNBQVM7Z0JBRTdDLDhFQUE4RTtnQkFDOUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7b0JBQUUsU0FBUztnQkFFckQsZ0NBQWdDO2dCQUNoQyxJQUFNLElBQUksR0FBRyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2pCOzs7Ozs7Ozs7UUFFRCxJQUFNLHFDQUFxQyxHQUN2QyxJQUFJLEdBQUcsRUFBb0QsQ0FBQzs7WUFDaEUsS0FBbUIsSUFBQSx5QkFBQSxpQkFBQSxvQkFBb0IsQ0FBQSwwREFBQSw0RkFBRTtnQkFBcEMsSUFBTSxJQUFJLGlDQUFBO2dCQUNiLElBQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUcsQ0FBQztnQkFDdkMsSUFBTSwyQkFBMkIsR0FBRyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDdkUscUNBQXFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO2FBQzlFOzs7Ozs7Ozs7UUFFRCxPQUFPLEVBQUMsbUJBQW1CLHFCQUFBLEVBQUUscUNBQXFDLHVDQUFBLEVBQUMsQ0FBQztJQUN0RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgYWJzb2x1dGVGcm9tLCBkaXJuYW1lLCBnZXRGaWxlU3lzdGVtLCByZXNvbHZlfSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge0NvbW1vbkpzRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2NvbW1vbmpzX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlciwgSW52YWxpZEVudHJ5UG9pbnQsIFNvcnRlZEVudHJ5UG9pbnRzSW5mb30gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0VzbURlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9lc21fZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL21vZHVsZV9yZXNvbHZlcic7XG5pbXBvcnQge1VtZERlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy91bWRfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGlyZWN0b3J5V2Fsa2VyRW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9lbnRyeV9wb2ludF9maW5kZXIvZGlyZWN0b3J5X3dhbGtlcl9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtUYXJnZXRlZEVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL3RhcmdldGVkX2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge0FuYWx5emVGbiwgQ3JlYXRlQ29tcGlsZUZuLCBFbnRyeVBvaW50UHJvY2Vzc2luZ01ldGFkYXRhLCBFeGVjdXRlRm4sIFRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZX0gZnJvbSAnLi9leGVjdXRpb24vYXBpJztcbmltcG9ydCB7Q29uc29sZUxvZ2dlciwgTG9nTGV2ZWx9IGZyb20gJy4vbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge2hhc0JlZW5Qcm9jZXNzZWQsIG1hcmtBc1Byb2Nlc3NlZH0gZnJvbSAnLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludFBhY2thZ2VKc29uLCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsIGdldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHttYWtlRW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtUcmFuc2Zvcm1lcn0gZnJvbSAnLi9wYWNrYWdlcy90cmFuc2Zvcm1lcic7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvaW5fcGxhY2VfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtOZXdFbnRyeVBvaW50RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5cblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY09wdGlvbnMge1xuICAvKiogVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlcyB0byBwcm9jZXNzLiAqL1xuICBiYXNlUGF0aDogc3RyaW5nO1xuICAvKipcbiAgICogVGhlIHBhdGggdG8gdGhlIHByaW1hcnkgcGFja2FnZSB0byBiZSBwcm9jZXNzZWQuIElmIG5vdCBhYnNvbHV0ZSB0aGVuIGl0IG11c3QgYmUgcmVsYXRpdmUgdG9cbiAgICogYGJhc2VQYXRoYC5cbiAgICpcbiAgICogQWxsIGl0cyBkZXBlbmRlbmNpZXMgd2lsbCBuZWVkIHRvIGJlIHByb2Nlc3NlZCB0b28uXG4gICAqL1xuICB0YXJnZXRFbnRyeVBvaW50UGF0aD86IHN0cmluZztcbiAgLyoqXG4gICAqIFdoaWNoIGVudHJ5LXBvaW50IHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbiB0byBjb25zaWRlciB3aGVuIHByb2Nlc3NpbmcgYW4gZW50cnktcG9pbnQuXG4gICAqIEVhY2ggcHJvcGVydHkgc2hvdWxkIGhvbGQgYSBwYXRoIHRvIHRoZSBwYXJ0aWN1bGFyIGJ1bmRsZSBmb3JtYXQgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAgICogRGVmYXVsdHMgdG8gYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24uXG4gICAqL1xuICBwcm9wZXJ0aWVzVG9Db25zaWRlcj86IHN0cmluZ1tdO1xuICAvKipcbiAgICogV2hldGhlciB0byBwcm9jZXNzIGFsbCBmb3JtYXRzIHNwZWNpZmllZCBieSAoYHByb3BlcnRpZXNUb0NvbnNpZGVyYCkgIG9yIHRvIHN0b3AgcHJvY2Vzc2luZ1xuICAgKiB0aGlzIGVudHJ5LXBvaW50IGF0IHRoZSBmaXJzdCBtYXRjaGluZyBmb3JtYXQuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIGNvbXBpbGVBbGxGb3JtYXRzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY3JlYXRlIG5ldyBlbnRyeS1wb2ludHMgYnVuZGxlcyByYXRoZXIgdGhhbiBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgZmlsZXMuXG4gICAqL1xuICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQcm92aWRlIGEgbG9nZ2VyIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBsb2cgbWVzc2FnZXMuXG4gICAqL1xuICBsb2dnZXI/OiBMb2dnZXI7XG4gIC8qKlxuICAgKiBQYXRocyBtYXBwaW5nIGNvbmZpZ3VyYXRpb24gKGBwYXRoc2AgYW5kIGBiYXNlVXJsYCksIGFzIGZvdW5kIGluIGB0cy5Db21waWxlck9wdGlvbnNgLlxuICAgKiBUaGVzZSBhcmUgdXNlZCB0byByZXNvbHZlIHBhdGhzIHRvIGxvY2FsbHkgYnVpbHQgQW5ndWxhciBsaWJyYXJpZXMuXG4gICAqL1xuICBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3M7XG4gIC8qKlxuICAgKiBQcm92aWRlIGEgZmlsZS1zeXN0ZW0gc2VydmljZSB0aGF0IHdpbGwgYmUgdXNlZCBieSBuZ2NjIGZvciBhbGwgZmlsZSBpbnRlcmFjdGlvbnMuXG4gICAqL1xuICBmaWxlU3lzdGVtPzogRmlsZVN5c3RlbTtcbn1cblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGludG8gbmdjYyAoYU5HdWxhciBDb21wYXRpYmlsaXR5IENvbXBpbGVyKS5cbiAqXG4gKiBZb3UgY2FuIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBwcm9jZXNzIG9uZSBvciBtb3JlIG5wbSBwYWNrYWdlcywgdG8gZW5zdXJlXG4gKiB0aGF0IHRoZXkgYXJlIGNvbXBhdGlibGUgd2l0aCB0aGUgaXZ5IGNvbXBpbGVyIChuZ3RzYykuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgVGhlIG9wdGlvbnMgdGVsbGluZyBuZ2NjIHdoYXQgdG8gY29tcGlsZSBhbmQgaG93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2MoXG4gICAge2Jhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIgPSBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsXG4gICAgIGNvbXBpbGVBbGxGb3JtYXRzID0gdHJ1ZSwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPSBmYWxzZSxcbiAgICAgbG9nZ2VyID0gbmV3IENvbnNvbGVMb2dnZXIoTG9nTGV2ZWwuaW5mbyksIHBhdGhNYXBwaW5nc306IE5nY2NPcHRpb25zKTogdm9pZCB7XG4gIGNvbnN0IGZpbGVTeXN0ZW0gPSBnZXRGaWxlU3lzdGVtKCk7XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBwZXJmb3JtaW5nIHRoZSBhbmFseXNpcy5cbiAgY29uc3QgYW5hbHl6ZUZuOiBBbmFseXplRm4gPSAoKSA9PiB7XG4gICAgY29uc3Qgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIgPSBlbnN1cmVTdXBwb3J0ZWRQcm9wZXJ0aWVzKHByb3BlcnRpZXNUb0NvbnNpZGVyKTtcblxuICAgIGNvbnN0IG1vZHVsZVJlc29sdmVyID0gbmV3IE1vZHVsZVJlc29sdmVyKGZpbGVTeXN0ZW0sIHBhdGhNYXBwaW5ncyk7XG4gICAgY29uc3QgZXNtRGVwZW5kZW5jeUhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICAgIGNvbnN0IHVtZERlcGVuZGVuY3lIb3N0ID0gbmV3IFVtZERlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgICBjb25zdCBjb21tb25Kc0RlcGVuZGVuY3lIb3N0ID0gbmV3IENvbW1vbkpzRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICAgIGNvbnN0IGRlcGVuZGVuY3lSZXNvbHZlciA9IG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIoZmlsZVN5c3RlbSwgbG9nZ2VyLCB7XG4gICAgICBlc201OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICAgIGVzbTIwMTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgICAgdW1kOiB1bWREZXBlbmRlbmN5SG9zdCxcbiAgICAgIGNvbW1vbmpzOiBjb21tb25Kc0RlcGVuZGVuY3lIb3N0XG4gICAgfSk7XG5cbiAgICBjb25zdCBhYnNCYXNlUGF0aCA9IGFic29sdXRlRnJvbShiYXNlUGF0aCk7XG4gICAgY29uc3QgY29uZmlnID0gbmV3IE5nY2NDb25maWd1cmF0aW9uKGZpbGVTeXN0ZW0sIGRpcm5hbWUoYWJzQmFzZVBhdGgpKTtcbiAgICBjb25zdCBlbnRyeVBvaW50cyA9IGdldEVudHJ5UG9pbnRzKFxuICAgICAgICBmaWxlU3lzdGVtLCBjb25maWcsIGxvZ2dlciwgZGVwZW5kZW5jeVJlc29sdmVyLCBhYnNCYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgsXG4gICAgICAgIHBhdGhNYXBwaW5ncywgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKTtcblxuICAgIGNvbnN0IHByb2Nlc3NpbmdNZXRhZGF0YVBlckVudHJ5UG9pbnQgPSBuZXcgTWFwPHN0cmluZywgRW50cnlQb2ludFByb2Nlc3NpbmdNZXRhZGF0YT4oKTtcbiAgICBjb25zdCB0YXNrczogVGFza1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGVudHJ5UG9pbnQgb2YgZW50cnlQb2ludHMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICAgIGNvbnN0IGhhc1Byb2Nlc3NlZFR5cGluZ3MgPSBoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCAndHlwaW5ncycsIGVudHJ5UG9pbnQucGF0aCk7XG4gICAgICBjb25zdCB7cHJvcGVydGllc1RvUHJvY2VzcywgcHJvcGVydHlUb1Byb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZH0gPVxuICAgICAgICAgIGdldFByb3BlcnRpZXNUb1Byb2Nlc3NBbmRNYXJrQXNQcm9jZXNzZWQocGFja2FnZUpzb24sIHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyKTtcbiAgICAgIGxldCBwcm9jZXNzRHRzID0gIWhhc1Byb2Nlc3NlZFR5cGluZ3M7XG5cbiAgICAgIGZvciAoY29uc3QgZm9ybWF0UHJvcGVydHkgb2YgcHJvcGVydGllc1RvUHJvY2Vzcykge1xuICAgICAgICBjb25zdCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQgPVxuICAgICAgICAgICAgcHJvcGVydHlUb1Byb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZC5nZXQoZm9ybWF0UHJvcGVydHkpICE7XG4gICAgICAgIHRhc2tzLnB1c2goe2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9KTtcblxuICAgICAgICAvLyBPbmx5IHByb2Nlc3MgdHlwaW5ncyBmb3IgdGhlIGZpcnN0IHByb3BlcnR5IChpZiBub3QgYWxyZWFkeSBwcm9jZXNzZWQpLlxuICAgICAgICBwcm9jZXNzRHRzID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHByb2Nlc3NpbmdNZXRhZGF0YVBlckVudHJ5UG9pbnQuc2V0KGVudHJ5UG9pbnQucGF0aCwge1xuICAgICAgICBoYXNQcm9jZXNzZWRUeXBpbmdzLFxuICAgICAgICBoYXNBbnlQcm9jZXNzZWRGb3JtYXQ6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtwcm9jZXNzaW5nTWV0YWRhdGFQZXJFbnRyeVBvaW50LCB0YXNrc307XG4gIH07XG5cbiAgLy8gVGhlIGZ1bmN0aW9uIGZvciBjcmVhdGluZyB0aGUgYGNvbXBpbGUoKWAgZnVuY3Rpb24uXG4gIGNvbnN0IGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuID0gb25UYXNrQ29tcGxldGVkID0+IHtcbiAgICBjb25zdCBmaWxlV3JpdGVyID0gZ2V0RmlsZVdyaXRlcihmaWxlU3lzdGVtLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyk7XG4gICAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgVHJhbnNmb3JtZXIoZmlsZVN5c3RlbSwgbG9nZ2VyKTtcblxuICAgIHJldHVybiAodGFzazogVGFzaykgPT4ge1xuICAgICAgY29uc3Qge2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9ID0gdGFzaztcblxuICAgICAgY29uc3QgaXNDb3JlID0gZW50cnlQb2ludC5uYW1lID09PSAnQGFuZ3VsYXIvY29yZSc7ICAvLyBBcmUgd2UgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmU/XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bZm9ybWF0UHJvcGVydHldO1xuICAgICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQcm9wZXJ0eSk7XG5cbiAgICAgIC8vIEFsbCBwcm9wZXJ0aWVzIGxpc3RlZCBpbiBgcHJvcGVydGllc1RvUHJvY2Vzc2AgYXJlIGd1YXJhbnRlZWQgdG8gcG9pbnQgdG8gYSBmb3JtYXQtcGF0aFxuICAgICAgLy8gKGkuZS4gdGhleSBhcmUgZGVmaW5lZCBpbiBgZW50cnlQb2ludC5wYWNrYWdlSnNvbmApLiBGdXJ0aGVybW9yZSwgdGhleSBhcmUgYWxzbyBndWFyYW50ZWVkXG4gICAgICAvLyB0byBiZSBhbW9uZyBgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTYC5cbiAgICAgIC8vIEJhc2VkIG9uIHRoZSBhYm92ZSwgYGZvcm1hdFBhdGhgIHNob3VsZCBhbHdheXMgYmUgZGVmaW5lZCBhbmQgYGdldEVudHJ5UG9pbnRGb3JtYXQoKWBcbiAgICAgIC8vIHNob3VsZCBhbHdheXMgcmV0dXJuIGEgZm9ybWF0IGhlcmUgKGFuZCBub3QgYHVuZGVmaW5lZGApLlxuICAgICAgaWYgKCFmb3JtYXRQYXRoIHx8ICFmb3JtYXQpIHtcbiAgICAgICAgLy8gVGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgSW52YXJpYW50IHZpb2xhdGVkOiBObyBmb3JtYXQtcGF0aCBvciBmb3JtYXQgZm9yICR7ZW50cnlQb2ludC5wYXRofSA6IGAgK1xuICAgICAgICAgICAgYCR7Zm9ybWF0UHJvcGVydHl9IChmb3JtYXRQYXRoOiAke2Zvcm1hdFBhdGh9IHwgZm9ybWF0OiAke2Zvcm1hdH0pYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBmb3JtYXQtcGF0aCB3aGljaCB0aGUgcHJvcGVydHkgbWFwcyB0byBpcyBhbHJlYWR5IHByb2Nlc3NlZCAtIG5vdGhpbmcgdG8gZG8uXG4gICAgICBpZiAoaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgZm9ybWF0UHJvcGVydHksIGVudHJ5UG9pbnQucGF0aCkpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fSAoYWxyZWFkeSBjb21waWxlZCkuYCk7XG4gICAgICAgIG9uVGFza0NvbXBsZXRlZCh0YXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUuQWxyZWFkeVByb2Nlc3NlZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnVuZGxlID0gbWFrZUVudHJ5UG9pbnRCdW5kbGUoXG4gICAgICAgICAgZmlsZVN5c3RlbSwgZW50cnlQb2ludCwgZm9ybWF0UGF0aCwgaXNDb3JlLCBmb3JtYXQsIHByb2Nlc3NEdHMsIHBhdGhNYXBwaW5ncywgdHJ1ZSk7XG5cbiAgICAgIGxvZ2dlci5pbmZvKGBDb21waWxpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXRQcm9wZXJ0eX0gYXMgJHtmb3JtYXR9YCk7XG5cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVkRmlsZXMgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oYnVuZGxlKTtcbiAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoYnVuZGxlLCB0cmFuc2Zvcm1lZEZpbGVzLCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQpO1xuXG4gICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLlByb2Nlc3NlZCk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBUaGUgZnVuY3Rpb24gZm9yIGFjdHVhbGx5IHBsYW5uaW5nIGFuZCBnZXR0aW5nIHRoZSB3b3JrIGRvbmUuXG4gIGNvbnN0IGV4ZWN1dGVGbjogRXhlY3V0ZUZuID0gKGFuYWx5emVGbjogQW5hbHl6ZUZuLCBjcmVhdGVDb21waWxlRm46IENyZWF0ZUNvbXBpbGVGbikgPT4ge1xuICAgIGNvbnN0IHtwcm9jZXNzaW5nTWV0YWRhdGFQZXJFbnRyeVBvaW50LCB0YXNrc30gPSBhbmFseXplRm4oKTtcbiAgICBjb25zdCBjb21waWxlID0gY3JlYXRlQ29tcGlsZUZuKCh0YXNrLCBvdXRjb21lKSA9PiB7XG4gICAgICBjb25zdCB7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkLCBwcm9jZXNzRHRzfSA9IHRhc2s7XG4gICAgICBjb25zdCBwcm9jZXNzaW5nTWV0YSA9IHByb2Nlc3NpbmdNZXRhZGF0YVBlckVudHJ5UG9pbnQuZ2V0KGVudHJ5UG9pbnQucGF0aCkgITtcbiAgICAgIHByb2Nlc3NpbmdNZXRhLmhhc0FueVByb2Nlc3NlZEZvcm1hdCA9IHRydWU7XG5cbiAgICAgIGlmIChvdXRjb21lID09PSBUYXNrUHJvY2Vzc2luZ091dGNvbWUuUHJvY2Vzc2VkKSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGZpbGVTeXN0ZW0ucmVzb2x2ZShlbnRyeVBvaW50LnBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgY29uc3QgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZDogKEVudHJ5UG9pbnRKc29uUHJvcGVydHkgfCAndHlwaW5ncycpW10gPVxuICAgICAgICAgICAgWy4uLmZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZF07XG5cbiAgICAgICAgaWYgKHByb2Nlc3NEdHMpIHtcbiAgICAgICAgICBwcm9jZXNzaW5nTWV0YS5oYXNQcm9jZXNzZWRUeXBpbmdzID0gdHJ1ZTtcbiAgICAgICAgICBwcm9wc1RvTWFya0FzUHJvY2Vzc2VkLnB1c2goJ3R5cGluZ3MnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1hcmtBc1Byb2Nlc3NlZChcbiAgICAgICAgICAgIGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQucGFja2FnZUpzb24sIHBhY2thZ2VKc29uUGF0aCwgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBQcm9jZXNzIGFsbCB0YXNrcy5cbiAgICBmb3IgKGNvbnN0IHRhc2sgb2YgdGFza3MpIHtcbiAgICAgIGNvbnN0IHByb2Nlc3NpbmdNZXRhID0gcHJvY2Vzc2luZ01ldGFkYXRhUGVyRW50cnlQb2ludC5nZXQodGFzay5lbnRyeVBvaW50LnBhdGgpICE7XG5cbiAgICAgIC8vIElmIHdlIG9ubHkgbmVlZCBvbmUgZm9ybWF0IHByb2Nlc3NlZCBhbmQgd2UgYWxyZWFkeSBoYXZlIG9uZSBmb3IgdGhlIGNvcnJlc3BvbmRpbmdcbiAgICAgIC8vIGVudHJ5LXBvaW50LCBza2lwIHRoZSB0YXNrLlxuICAgICAgaWYgKCFjb21waWxlQWxsRm9ybWF0cyAmJiBwcm9jZXNzaW5nTWV0YS5oYXNBbnlQcm9jZXNzZWRGb3JtYXQpIGNvbnRpbnVlO1xuXG4gICAgICBjb21waWxlKHRhc2spO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBlbnRyeS1wb2ludHMgZm9yIHdoaWNoIHdlIGNvdWxkIG5vdCBwcm9jZXNzIGFueSBmb3JtYXQgYXQgYWxsLlxuICAgIGNvbnN0IHVucHJvY2Vzc2VkRW50cnlQb2ludFBhdGhzID1cbiAgICAgICAgQXJyYXkuZnJvbShwcm9jZXNzaW5nTWV0YWRhdGFQZXJFbnRyeVBvaW50LmVudHJpZXMoKSlcbiAgICAgICAgICAgIC5maWx0ZXIoKFssIHByb2Nlc3NpbmdNZXRhXSkgPT4gIXByb2Nlc3NpbmdNZXRhLmhhc0FueVByb2Nlc3NlZEZvcm1hdClcbiAgICAgICAgICAgIC5tYXAoKFtlbnRyeVBvaW50UGF0aF0pID0+IGBcXG4gIC0gJHtlbnRyeVBvaW50UGF0aH1gKVxuICAgICAgICAgICAgLmpvaW4oJycpO1xuXG4gICAgaWYgKHVucHJvY2Vzc2VkRW50cnlQb2ludFBhdGhzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ0ZhaWxlZCB0byBjb21waWxlIGFueSBmb3JtYXRzIGZvciB0aGUgZm9sbG93aW5nIGVudHJ5LXBvaW50cyAodHJpZWQgJyArXG4gICAgICAgICAgYCR7cHJvcGVydGllc1RvQ29uc2lkZXIuam9pbignLCAnKX0pOiAke3VucHJvY2Vzc2VkRW50cnlQb2ludFBhdGhzfWApO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZXhlY3V0ZUZuKGFuYWx5emVGbiwgY3JlYXRlQ29tcGlsZUZuKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlU3VwcG9ydGVkUHJvcGVydGllcyhwcm9wZXJ0aWVzOiBzdHJpbmdbXSk6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSB7XG4gIC8vIFNob3J0LWNpcmN1aXQgdGhlIGNhc2Ugd2hlcmUgYHByb3BlcnRpZXNgIGhhcyBmYWxsZW4gYmFjayB0byB0aGUgZGVmYXVsdCB2YWx1ZTpcbiAgLy8gYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2BcbiAgaWYgKHByb3BlcnRpZXMgPT09IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUykgcmV0dXJuIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUztcblxuICBjb25zdCBzdXBwb3J0ZWRQcm9wZXJ0aWVzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllcyBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5W10pIHtcbiAgICBpZiAoU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLmluZGV4T2YocHJvcCkgIT09IC0xKSB7XG4gICAgICBzdXBwb3J0ZWRQcm9wZXJ0aWVzLnB1c2gocHJvcCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN1cHBvcnRlZFByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTm8gc3VwcG9ydGVkIGZvcm1hdCBwcm9wZXJ0eSB0byBjb25zaWRlciBhbW9uZyBbJHtwcm9wZXJ0aWVzLmpvaW4oJywgJyl9XS4gYCArXG4gICAgICAgIGBTdXBwb3J0ZWQgcHJvcGVydGllczogJHtTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuam9pbignLCAnKX1gKTtcbiAgfVxuXG4gIHJldHVybiBzdXBwb3J0ZWRQcm9wZXJ0aWVzO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKGZzOiBGaWxlU3lzdGVtLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0czogYm9vbGVhbik6IEZpbGVXcml0ZXIge1xuICByZXR1cm4gY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPyBuZXcgTmV3RW50cnlQb2ludEZpbGVXcml0ZXIoZnMpIDogbmV3IEluUGxhY2VGaWxlV3JpdGVyKGZzKTtcbn1cblxuZnVuY3Rpb24gZ2V0RW50cnlQb2ludHMoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIGxvZ2dlcjogTG9nZ2VyLCByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLFxuICAgIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8IHVuZGVmaW5lZCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKTogRW50cnlQb2ludFtdIHtcbiAgY29uc3Qge2VudHJ5UG9pbnRzLCBpbnZhbGlkRW50cnlQb2ludHN9ID0gKHRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSB1bmRlZmluZWQpID9cbiAgICAgIGdldFRhcmdldGVkRW50cnlQb2ludHMoXG4gICAgICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlcixcbiAgICAgICAgICBjb21waWxlQWxsRm9ybWF0cywgcGF0aE1hcHBpbmdzKSA6XG4gICAgICBnZXRBbGxFbnRyeVBvaW50cyhmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzKTtcbiAgcmV0dXJuIGVudHJ5UG9pbnRzO1xufVxuXG5mdW5jdGlvbiBnZXRUYXJnZXRlZEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlcixcbiAgICBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoOiBzdHJpbmcsIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbiwgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID0gcmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpO1xuICBpZiAoaGFzUHJvY2Vzc2VkVGFyZ2V0RW50cnlQb2ludChcbiAgICAgICAgICBmcywgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnVGhlIHRhcmdldCBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCcpO1xuICAgIHJldHVybiB7ZW50cnlQb2ludHM6IFtdLCBpbnZhbGlkRW50cnlQb2ludHM6IFtdLCBpZ25vcmVkRGVwZW5kZW5jaWVzOiBbXX07XG4gIH1cbiAgY29uc3QgZmluZGVyID0gbmV3IFRhcmdldGVkRW50cnlQb2ludEZpbmRlcihcbiAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICBjb25zdCBlbnRyeVBvaW50SW5mbyA9IGZpbmRlci5maW5kRW50cnlQb2ludHMoKTtcbiAgY29uc3QgaW52YWxpZFRhcmdldCA9IGVudHJ5UG9pbnRJbmZvLmludmFsaWRFbnRyeVBvaW50cy5maW5kKFxuICAgICAgaSA9PiBpLmVudHJ5UG9pbnQucGF0aCA9PT0gYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCk7XG4gIGlmIChpbnZhbGlkVGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IFwiJHtpbnZhbGlkVGFyZ2V0LmVudHJ5UG9pbnQubmFtZX1cIiBoYXMgbWlzc2luZyBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgIGludmFsaWRUYXJnZXQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1cXG5gKSk7XG4gIH1cbiAgaWYgKGVudHJ5UG9pbnRJbmZvLmVudHJ5UG9pbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIG1hcmtOb25Bbmd1bGFyUGFja2FnZUFzUHJvY2Vzc2VkKGZzLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoKTtcbiAgfVxuICByZXR1cm4gZW50cnlQb2ludEluZm87XG59XG5cbmZ1bmN0aW9uIGdldEFsbEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlcixcbiAgICBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgY29uc3QgZmluZGVyID1cbiAgICAgIG5ldyBEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyKGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICByZXR1cm4gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xufVxuXG5mdW5jdGlvbiBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgIGZzOiBGaWxlU3lzdGVtLCB0YXJnZXRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUodGFyZ2V0UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAvLyBJdCBtaWdodCBiZSB0aGF0IHRoaXMgdGFyZ2V0IGlzIGNvbmZpZ3VyZWQgaW4gd2hpY2ggY2FzZSBpdHMgcGFja2FnZS5qc29uIG1pZ2h0IG5vdCBleGlzdC5cbiAgaWYgKCFmcy5leGlzdHMocGFja2FnZUpzb25QYXRoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGlmIChwYWNrYWdlSnNvbltwcm9wZXJ0eV0pIHtcbiAgICAgIC8vIEhlcmUgaXMgYSBwcm9wZXJ0eSB0aGF0IHNob3VsZCBiZSBwcm9jZXNzZWRcbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBwcm9wZXJ0eSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5LCB0YXJnZXRQYXRoKSkge1xuICAgICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgICAgLy8gSXQgaGFzIGJlZW4gcHJvY2Vzc2VkIGFuZCB3ZSBvbmx5IG5lZWQgb25lLCBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQgaGFzIG5vdCBiZWVuIHByb2Nlc3NlZCBidXQgd2UgbmVlZCBhbGwgb2YgdGhlbSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gRWl0aGVyIGFsbCBmb3JtYXRzIG5lZWQgdG8gYmUgY29tcGlsZWQgYW5kIHRoZXJlIHdlcmUgbm9uZSB0aGF0IHdlcmUgdW5wcm9jZXNzZWQsXG4gIC8vIE9yIG9ubHkgdGhlIG9uZSBtYXRjaGluZyBmb3JtYXQgbmVlZHMgdG8gYmUgY29tcGlsZWQgYnV0IHRoZXJlIHdhcyBhdCBsZWFzdCBvbmUgbWF0Y2hpbmdcbiAgLy8gcHJvcGVydHkgYmVmb3JlIHRoZSBmaXJzdCBwcm9jZXNzZWQgZm9ybWF0IHRoYXQgd2FzIHVucHJvY2Vzc2VkLlxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBJZiB3ZSBnZXQgaGVyZSwgdGhlbiB0aGUgcmVxdWVzdGVkIGVudHJ5LXBvaW50IGRpZCBub3QgY29udGFpbiBhbnl0aGluZyBjb21waWxlZCBieVxuICogdGhlIG9sZCBBbmd1bGFyIGNvbXBpbGVyLiBUaGVyZWZvcmUgdGhlcmUgaXMgbm90aGluZyBmb3IgbmdjYyB0byBkby5cbiAqIFNvIG1hcmsgYWxsIGZvcm1hdHMgaW4gdGhpcyBlbnRyeS1wb2ludCBhcyBwcm9jZXNzZWQgc28gdGhhdCBjbGllbnRzIG9mIG5nY2MgY2FuIGF2b2lkXG4gKiB0cmlnZ2VyaW5nIG5nY2MgZm9yIHRoaXMgZW50cnktcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAqL1xuZnVuY3Rpb24gbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoZnM6IEZpbGVTeXN0ZW0sIHBhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUocGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgLy8gTm90ZTogV2UgYXJlIG1hcmtpbmcgYWxsIHN1cHBvcnRlZCBwcm9wZXJ0aWVzIGFzIHByb2Nlc3NlZCwgZXZlbiBpZiB0aGV5IGRvbid0IGV4aXN0IGluIHRoZVxuICAvLyAgICAgICBgcGFja2FnZS5qc29uYCBmaWxlLiBXaGlsZSB0aGlzIGlzIHJlZHVuZGFudCwgaXQgaXMgYWxzbyBoYXJtbGVzcy5cbiAgbWFya0FzUHJvY2Vzc2VkKGZzLCBwYWNrYWdlSnNvbiwgcGFja2FnZUpzb25QYXRoLCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpO1xufVxuXG5mdW5jdGlvbiBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyOiBMb2dnZXIsIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXSk6IHZvaWQge1xuICBpbnZhbGlkRW50cnlQb2ludHMuZm9yRWFjaChpbnZhbGlkRW50cnlQb2ludCA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgSW52YWxpZCBlbnRyeS1wb2ludCAke2ludmFsaWRFbnRyeVBvaW50LmVudHJ5UG9pbnQucGF0aH0uYCxcbiAgICAgICAgYEl0IGlzIG1pc3NpbmcgcmVxdWlyZWQgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICAgICAgaW52YWxpZEVudHJ5UG9pbnQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1gKS5qb2luKCdcXG4nKSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gY29tcHV0ZXMgYW5kIHJldHVybnMgdGhlIGZvbGxvd2luZzpcbiAqIC0gYHByb3BlcnRpZXNUb1Byb2Nlc3NgOiBBbiAob3JkZXJlZCkgbGlzdCBvZiBwcm9wZXJ0aWVzIHRoYXQgZXhpc3QgYW5kIG5lZWQgdG8gYmUgcHJvY2Vzc2VkLFxuICogICBiYXNlZCBvbiB0aGUgc3BlY2lmaWVkIGBwcm9wZXJ0aWVzVG9Db25zaWRlcmAsIHRoZSBwcm9wZXJ0aWVzIGluIGBwYWNrYWdlLmpzb25gIGFuZCB0aGVpclxuICogICBjb3JyZXNwb25kaW5nIGZvcm1hdC1wYXRocy4gTk9URTogT25seSBvbmUgcHJvcGVydHkgcGVyIGZvcm1hdC1wYXRoIG5lZWRzIHRvIGJlIHByb2Nlc3NlZC5cbiAqIC0gYHByb3BlcnR5VG9Qcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWRgOiBBIG1hcHBpbmcgZnJvbSBlYWNoIHByb3BlcnR5IGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYFxuICogICB0byB0aGUgbGlzdCBvZiBvdGhlciBwcm9wZXJ0aWVzIGluIGBwYWNrYWdlLmpzb25gIHRoYXQgbmVlZCB0byBiZSBtYXJrZWQgYXMgcHJvY2Vzc2VkIGFzIHNvb25cbiAqICAgYXMgb2YgdGhlIGZvcm1lciBiZWluZyBwcm9jZXNzZWQuXG4gKi9cbmZ1bmN0aW9uIGdldFByb3BlcnRpZXNUb1Byb2Nlc3NBbmRNYXJrQXNQcm9jZXNzZWQoXG4gICAgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgcHJvcGVydGllc1RvQ29uc2lkZXI6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSk6IHtcbiAgcHJvcGVydGllc1RvUHJvY2VzczogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdO1xuICBwcm9wZXJ0eVRvUHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkOiBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPjtcbn0ge1xuICBjb25zdCBmb3JtYXRQYXRoc1RvQ29uc2lkZXIgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBjb25zdCBwcm9wZXJ0aWVzVG9Qcm9jZXNzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10gPSBbXTtcbiAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IG1hcCB0byB0aGUgc2FtZSBmb3JtYXQtcGF0aCBhcyBhIHByZWNlZGluZyBwcm9wZXJ0eS5cbiAgICBpZiAoZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmhhcyhmb3JtYXRQYXRoKSkgY29udGludWU7XG5cbiAgICAvLyBQcm9jZXNzIHRoaXMgcHJvcGVydHksIGJlY2F1c2UgaXQgaXMgdGhlIGZpcnN0IG9uZSB0byBtYXAgdG8gdGhpcyBmb3JtYXQtcGF0aC5cbiAgICBmb3JtYXRQYXRoc1RvQ29uc2lkZXIuYWRkKGZvcm1hdFBhdGgpO1xuICAgIHByb3BlcnRpZXNUb1Byb2Nlc3MucHVzaChwcm9wKTtcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXM6IHtbZm9ybWF0UGF0aDogc3RyaW5nXTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdfSA9IHt9O1xuICBmb3IgKGNvbnN0IHByb3Agb2YgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSB7XG4gICAgY29uc3QgZm9ybWF0UGF0aCA9IHBhY2thZ2VKc29uW3Byb3BdO1xuXG4gICAgLy8gSWdub3JlIHByb3BlcnRpZXMgdGhhdCBhcmUgbm90IGRlZmluZWQgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKHR5cGVvZiBmb3JtYXRQYXRoICE9PSAnc3RyaW5nJykgY29udGludWU7XG5cbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGRvIG5vdCBtYXAgdG8gYSBmb3JtYXQtcGF0aCB0aGF0IHdpbGwgYmUgY29uc2lkZXJlZC5cbiAgICBpZiAoIWZvcm1hdFBhdGhzVG9Db25zaWRlci5oYXMoZm9ybWF0UGF0aCkpIGNvbnRpbnVlO1xuXG4gICAgLy8gQWRkIHRoaXMgcHJvcGVydHkgdG8gdGhlIG1hcC5cbiAgICBjb25zdCBsaXN0ID0gZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSB8fCAoZm9ybWF0UGF0aFRvUHJvcGVydGllc1tmb3JtYXRQYXRoXSA9IFtdKTtcbiAgICBsaXN0LnB1c2gocHJvcCk7XG4gIH1cblxuICBjb25zdCBwcm9wZXJ0eVRvUHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkID1cbiAgICAgIG5ldyBNYXA8RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPigpO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF0gITtcbiAgICBjb25zdCBwcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQgPSBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdO1xuICAgIHByb3BlcnR5VG9Qcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQuc2V0KHByb3AsIHByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCk7XG4gIH1cblxuICByZXR1cm4ge3Byb3BlcnRpZXNUb1Byb2Nlc3MsIHByb3BlcnR5VG9Qcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWR9O1xufVxuIl19