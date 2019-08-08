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
                    var hasProcessedTypings = build_marker_1.hasBeenProcessed(packageJson, 'typings');
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
                // (i.e. they exist in `entryPointPackageJson`). Furthermore, they are also guaranteed to be
                // among `SUPPORTED_FORMAT_PROPERTIES`.
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
                    if (build_marker_1.hasBeenProcessed(packageJson, property)) {
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
                // Ignore properties that are not in `package.json`.
                if (!packageJson.hasOwnProperty(prop))
                    continue;
                var formatPath = packageJson[prop];
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
                // Ignore properties that are not in `package.json`.
                if (!packageJson.hasOwnProperty(prop))
                    continue;
                var formatPath = packageJson[prop];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUFzSDtJQUV0SCxpSEFBK0U7SUFDL0UsdUdBQWdIO0lBQ2hILHVHQUFxRTtJQUNyRSwrRkFBOEQ7SUFDOUQsdUdBQXFFO0lBQ3JFLDZJQUF5RztJQUN6Ryw2SEFBMEY7SUFFMUYsd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSx1RkFBMkQ7SUFDM0QsbUZBQW1KO0lBQ25KLGlHQUFtRTtJQUNuRSxtRkFBbUQ7SUFHbkQsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQThDOUU7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLFFBQVEsQ0FDcEIsRUFFc0U7WUFGckUsc0JBQVEsRUFBRSw4Q0FBb0IsRUFBRSw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xGLHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFBRSxrQ0FBa0MsRUFBbEMsdURBQWtDLEVBQzVELGNBQXlDLEVBQXpDLGdHQUF5QyxFQUFFLDhCQUFZO1FBQzFELElBQU0sVUFBVSxHQUFHLDJCQUFhLEVBQUUsQ0FBQztRQUVuQyw0Q0FBNEM7UUFDNUMsSUFBTSxTQUFTLEdBQWM7O1lBQzNCLElBQU0sNkJBQTZCLEdBQUcseUJBQXlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUV0RixJQUFNLGNBQWMsR0FBRyxJQUFJLGdDQUFjLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3BFLElBQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDNUUsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLHVDQUFpQixDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUM1RSxJQUFNLHNCQUFzQixHQUFHLElB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cUQsRUFBRSxDQUFDOztZQUNwRixLQUFtQixJQUFBLGdDQUFBLGlCQUFBLHlDQUEyQixDQUFBLHdFQUFBLGlIQUFFO2dCQUEzQyxJQUFNLElBQUksd0NBQUE7Z0JBQ2Isb0RBQW9EO2dCQUNwRCxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7b0JBQUUsU0FBUztnQkFFaEQsSUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBRyxDQUFDO2dCQUV2Qyw4RUFBOEU7Z0JBQzlFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO29CQUFFLFNBQVM7Z0JBRXJELGdDQUFnQztnQkFDaEMsSUFBTSxJQUFJLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDN0YsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNqQjs7Ozs7Ozs7O1FBRUQsSUFBTSxxQ0FBcUMsR0FDdkMsSUFBSSxHQUFHLEVBQW9ELENBQUM7O1lBQ2hFLEtBQW1CLElBQUEseUJBQUEsaUJBQUEsb0JBQW9CLENBQUEsMERBQUEsNEZBQUU7Z0JBQXBDLElBQU0sSUFBSSxpQ0FBQTtnQkFDYixJQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFHLENBQUM7Z0JBQ3ZDLElBQU0sMkJBQTJCLEdBQUcsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3ZFLHFDQUFxQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLENBQUMsQ0FBQzthQUM5RTs7Ozs7Ozs7O1FBRUQsT0FBTyxFQUFDLG1CQUFtQixxQkFBQSxFQUFFLHFDQUFxQyx1Q0FBQSxFQUFDLENBQUM7SUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgZ2V0RmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtDb21tb25Kc0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIEludmFsaWRFbnRyeVBvaW50LCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtVbWREZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtBbmFseXplRm4sIENyZWF0ZUNvbXBpbGVGbiwgRW50cnlQb2ludFByb2Nlc3NpbmdNZXRhZGF0YSwgRXhlY3V0ZUZuLCBUYXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWV9IGZyb20gJy4vZXhlY3V0aW9uL2FwaSc7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtoYXNCZWVuUHJvY2Vzc2VkLCBtYXJrQXNQcm9jZXNzZWR9IGZyb20gJy4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7bWFrZUVudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuXG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NPcHRpb25zIHtcbiAgLyoqIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdGhhdCBjb250YWlucyB0aGUgcGFja2FnZXMgdG8gcHJvY2Vzcy4gKi9cbiAgYmFzZVBhdGg6IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBwYXRoIHRvIHRoZSBwcmltYXJ5IHBhY2thZ2UgdG8gYmUgcHJvY2Vzc2VkLiBJZiBub3QgYWJzb2x1dGUgdGhlbiBpdCBtdXN0IGJlIHJlbGF0aXZlIHRvXG4gICAqIGBiYXNlUGF0aGAuXG4gICAqXG4gICAqIEFsbCBpdHMgZGVwZW5kZW5jaWVzIHdpbGwgbmVlZCB0byBiZSBwcm9jZXNzZWQgdG9vLlxuICAgKi9cbiAgdGFyZ2V0RW50cnlQb2ludFBhdGg/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBXaGljaCBlbnRyeS1wb2ludCBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY29uc2lkZXIgd2hlbiBwcm9jZXNzaW5nIGFuIGVudHJ5LXBvaW50LlxuICAgKiBFYWNoIHByb3BlcnR5IHNob3VsZCBob2xkIGEgcGF0aCB0byB0aGUgcGFydGljdWxhciBidW5kbGUgZm9ybWF0IGZvciB0aGUgZW50cnktcG9pbnQuXG4gICAqIERlZmF1bHRzIHRvIGFsbCB0aGUgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uLlxuICAgKi9cbiAgcHJvcGVydGllc1RvQ29uc2lkZXI/OiBzdHJpbmdbXTtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcHJvY2VzcyBhbGwgZm9ybWF0cyBzcGVjaWZpZWQgYnkgKGBwcm9wZXJ0aWVzVG9Db25zaWRlcmApICBvciB0byBzdG9wIHByb2Nlc3NpbmdcbiAgICogdGhpcyBlbnRyeS1wb2ludCBhdCB0aGUgZmlyc3QgbWF0Y2hpbmcgZm9ybWF0LiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqL1xuICBjb21waWxlQWxsRm9ybWF0cz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNyZWF0ZSBuZXcgZW50cnktcG9pbnRzIGJ1bmRsZXMgcmF0aGVyIHRoYW4gb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIGZpbGVzLlxuICAgKi9cbiAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM/OiBib29sZWFuO1xuICAvKipcbiAgICogUHJvdmlkZSBhIGxvZ2dlciB0aGF0IHdpbGwgYmUgY2FsbGVkIHdpdGggbG9nIG1lc3NhZ2VzLlxuICAgKi9cbiAgbG9nZ2VyPzogTG9nZ2VyO1xuICAvKipcbiAgICogUGF0aHMgbWFwcGluZyBjb25maWd1cmF0aW9uIChgcGF0aHNgIGFuZCBgYmFzZVVybGApLCBhcyBmb3VuZCBpbiBgdHMuQ29tcGlsZXJPcHRpb25zYC5cbiAgICogVGhlc2UgYXJlIHVzZWQgdG8gcmVzb2x2ZSBwYXRocyB0byBsb2NhbGx5IGJ1aWx0IEFuZ3VsYXIgbGlicmFyaWVzLlxuICAgKi9cbiAgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzO1xuICAvKipcbiAgICogUHJvdmlkZSBhIGZpbGUtc3lzdGVtIHNlcnZpY2UgdGhhdCB3aWxsIGJlIHVzZWQgYnkgbmdjYyBmb3IgYWxsIGZpbGUgaW50ZXJhY3Rpb25zLlxuICAgKi9cbiAgZmlsZVN5c3RlbT86IEZpbGVTeXN0ZW07XG59XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeS1wb2ludCBpbnRvIG5nY2MgKGFOR3VsYXIgQ29tcGF0aWJpbGl0eSBDb21waWxlcikuXG4gKlxuICogWW91IGNhbiBjYWxsIHRoaXMgZnVuY3Rpb24gdG8gcHJvY2VzcyBvbmUgb3IgbW9yZSBucG0gcGFja2FnZXMsIHRvIGVuc3VyZVxuICogdGhhdCB0aGV5IGFyZSBjb21wYXRpYmxlIHdpdGggdGhlIGl2eSBjb21waWxlciAobmd0c2MpLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIFRoZSBvcHRpb25zIHRlbGxpbmcgbmdjYyB3aGF0IHRvIGNvbXBpbGUgYW5kIGhvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKFxuICAgIHtiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyID0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLFxuICAgICBjb21waWxlQWxsRm9ybWF0cyA9IHRydWUsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID0gZmFsc2UsXG4gICAgIGxvZ2dlciA9IG5ldyBDb25zb2xlTG9nZ2VyKExvZ0xldmVsLmluZm8pLCBwYXRoTWFwcGluZ3N9OiBOZ2NjT3B0aW9ucyk6IHZvaWQge1xuICBjb25zdCBmaWxlU3lzdGVtID0gZ2V0RmlsZVN5c3RlbSgpO1xuXG4gIC8vIFRoZSBmdW5jdGlvbiBmb3IgcGVyZm9ybWluZyB0aGUgYW5hbHlzaXMuXG4gIGNvbnN0IGFuYWx5emVGbjogQW5hbHl6ZUZuID0gKCkgPT4ge1xuICAgIGNvbnN0IHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyID0gZW5zdXJlU3VwcG9ydGVkUHJvcGVydGllcyhwcm9wZXJ0aWVzVG9Db25zaWRlcik7XG5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcihmaWxlU3lzdGVtLCBwYXRoTWFwcGluZ3MpO1xuICAgIGNvbnN0IGVzbURlcGVuZGVuY3lIb3N0ID0gbmV3IEVzbURlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gICAgY29uc3QgY29tbW9uSnNEZXBlbmRlbmN5SG9zdCA9IG5ldyBDb21tb25Kc0RlcGVuZGVuY3lIb3N0KGZpbGVTeXN0ZW0sIG1vZHVsZVJlc29sdmVyKTtcbiAgICBjb25zdCBkZXBlbmRlbmN5UmVzb2x2ZXIgPSBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKGZpbGVTeXN0ZW0sIGxvZ2dlciwge1xuICAgICAgZXNtNTogZXNtRGVwZW5kZW5jeUhvc3QsXG4gICAgICBlc20yMDE1OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICAgIHVtZDogdW1kRGVwZW5kZW5jeUhvc3QsXG4gICAgICBjb21tb25qczogY29tbW9uSnNEZXBlbmRlbmN5SG9zdFxuICAgIH0pO1xuXG4gICAgY29uc3QgYWJzQmFzZVBhdGggPSBhYnNvbHV0ZUZyb20oYmFzZVBhdGgpO1xuICAgIGNvbnN0IGNvbmZpZyA9IG5ldyBOZ2NjQ29uZmlndXJhdGlvbihmaWxlU3lzdGVtLCBkaXJuYW1lKGFic0Jhc2VQYXRoKSk7XG4gICAgY29uc3QgZW50cnlQb2ludHMgPSBnZXRFbnRyeVBvaW50cyhcbiAgICAgICAgZmlsZVN5c3RlbSwgY29uZmlnLCBsb2dnZXIsIGRlcGVuZGVuY3lSZXNvbHZlciwgYWJzQmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgICAgICBwYXRoTWFwcGluZ3MsIHN1cHBvcnRlZFByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cyk7XG5cbiAgICBjb25zdCBwcm9jZXNzaW5nTWV0YWRhdGFQZXJFbnRyeVBvaW50ID0gbmV3IE1hcDxzdHJpbmcsIEVudHJ5UG9pbnRQcm9jZXNzaW5nTWV0YWRhdGE+KCk7XG4gICAgY29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBlbnRyeVBvaW50IG9mIGVudHJ5UG9pbnRzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCBoYXNQcm9jZXNzZWRUeXBpbmdzID0gaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgJ3R5cGluZ3MnKTtcbiAgICAgIGNvbnN0IHtwcm9wZXJ0aWVzVG9Qcm9jZXNzLCBwcm9wZXJ0eVRvUHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkfSA9XG4gICAgICAgICAgZ2V0UHJvcGVydGllc1RvUHJvY2Vzc0FuZE1hcmtBc1Byb2Nlc3NlZChwYWNrYWdlSnNvbiwgc3VwcG9ydGVkUHJvcGVydGllc1RvQ29uc2lkZXIpO1xuICAgICAgbGV0IHByb2Nlc3NEdHMgPSAhaGFzUHJvY2Vzc2VkVHlwaW5ncztcblxuICAgICAgZm9yIChjb25zdCBmb3JtYXRQcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Qcm9jZXNzKSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCA9XG4gICAgICAgICAgICBwcm9wZXJ0eVRvUHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkLmdldChmb3JtYXRQcm9wZXJ0eSkgITtcbiAgICAgICAgdGFza3MucHVzaCh7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30pO1xuXG4gICAgICAgIC8vIE9ubHkgcHJvY2VzcyB0eXBpbmdzIGZvciB0aGUgZmlyc3QgcHJvcGVydHkgKGlmIG5vdCBhbHJlYWR5IHByb2Nlc3NlZCkuXG4gICAgICAgIHByb2Nlc3NEdHMgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcHJvY2Vzc2luZ01ldGFkYXRhUGVyRW50cnlQb2ludC5zZXQoZW50cnlQb2ludC5wYXRoLCB7XG4gICAgICAgIGhhc1Byb2Nlc3NlZFR5cGluZ3MsXG4gICAgICAgIGhhc0FueVByb2Nlc3NlZEZvcm1hdDogZmFsc2UsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3Byb2Nlc3NpbmdNZXRhZGF0YVBlckVudHJ5UG9pbnQsIHRhc2tzfTtcbiAgfTtcblxuICAvLyBUaGUgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIHRoZSBgY29tcGlsZSgpYCBmdW5jdGlvbi5cbiAgY29uc3QgY3JlYXRlQ29tcGlsZUZuOiBDcmVhdGVDb21waWxlRm4gPSBvblRhc2tDb21wbGV0ZWQgPT4ge1xuICAgIGNvbnN0IGZpbGVXcml0ZXIgPSBnZXRGaWxlV3JpdGVyKGZpbGVTeXN0ZW0sIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcbiAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmaWxlU3lzdGVtLCBsb2dnZXIpO1xuXG4gICAgcmV0dXJuICh0YXNrOiBUYXNrKSA9PiB7XG4gICAgICBjb25zdCB7ZW50cnlQb2ludCwgZm9ybWF0UHJvcGVydHksIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCwgcHJvY2Vzc0R0c30gPSB0YXNrO1xuXG4gICAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJzsgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5KTtcblxuICAgICAgLy8gQWxsIHByb3BlcnRpZXMgbGlzdGVkIGluIGBwcm9wZXJ0aWVzVG9Qcm9jZXNzYCBhcmUgZ3VhcmFudGVlZCB0byBwb2ludCB0byBhIGZvcm1hdC1wYXRoXG4gICAgICAvLyAoaS5lLiB0aGV5IGV4aXN0IGluIGBlbnRyeVBvaW50UGFja2FnZUpzb25gKS4gRnVydGhlcm1vcmUsIHRoZXkgYXJlIGFsc28gZ3VhcmFudGVlZCB0byBiZVxuICAgICAgLy8gYW1vbmcgYFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFU2AuXG4gICAgICAvLyBCYXNlZCBvbiB0aGUgYWJvdmUsIGBmb3JtYXRQYXRoYCBzaG91bGQgYWx3YXlzIGJlIGRlZmluZWQgYW5kIGBnZXRFbnRyeVBvaW50Rm9ybWF0KClgXG4gICAgICAvLyBzaG91bGQgYWx3YXlzIHJldHVybiBhIGZvcm1hdCBoZXJlIChhbmQgbm90IGB1bmRlZmluZWRgKS5cbiAgICAgIGlmICghZm9ybWF0UGF0aCB8fCAhZm9ybWF0KSB7XG4gICAgICAgIC8vIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbi5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEludmFyaWFudCB2aW9sYXRlZDogTm8gZm9ybWF0LXBhdGggb3IgZm9ybWF0IGZvciAke2VudHJ5UG9pbnQucGF0aH0gOiBgICtcbiAgICAgICAgICAgIGAke2Zvcm1hdFByb3BlcnR5fSAoZm9ybWF0UGF0aDogJHtmb3JtYXRQYXRofSB8IGZvcm1hdDogJHtmb3JtYXR9KWApO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgZm9ybWF0LXBhdGggd2hpY2ggdGhlIHByb3BlcnR5IG1hcHMgdG8gaXMgYWxyZWFkeSBwcm9jZXNzZWQgLSBub3RoaW5nIHRvIGRvLlxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sIGZvcm1hdFByb3BlcnR5KSkge1xuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5BbHJlYWR5UHJvY2Vzc2VkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQYXRoLCBpc0NvcmUsIGZvcm1hdCwgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzLCB0cnVlKTtcblxuICAgICAgbG9nZ2VyLmluZm8oYENvbXBpbGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fSBhcyAke2Zvcm1hdH1gKTtcblxuICAgICAgY29uc3QgdHJhbnNmb3JtZWRGaWxlcyA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybShidW5kbGUpO1xuICAgICAgZmlsZVdyaXRlci53cml0ZUJ1bmRsZShidW5kbGUsIHRyYW5zZm9ybWVkRmlsZXMsIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCk7XG5cbiAgICAgIG9uVGFza0NvbXBsZXRlZCh0YXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUuUHJvY2Vzc2VkKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFRoZSBmdW5jdGlvbiBmb3IgYWN0dWFsbHkgcGxhbm5pbmcgYW5kIGdldHRpbmcgdGhlIHdvcmsgZG9uZS5cbiAgY29uc3QgZXhlY3V0ZUZuOiBFeGVjdXRlRm4gPSAoYW5hbHl6ZUZuOiBBbmFseXplRm4sIGNyZWF0ZUNvbXBpbGVGbjogQ3JlYXRlQ29tcGlsZUZuKSA9PiB7XG4gICAgY29uc3Qge3Byb2Nlc3NpbmdNZXRhZGF0YVBlckVudHJ5UG9pbnQsIHRhc2tzfSA9IGFuYWx5emVGbigpO1xuICAgIGNvbnN0IGNvbXBpbGUgPSBjcmVhdGVDb21waWxlRm4oKHRhc2ssIG91dGNvbWUpID0+IHtcbiAgICAgIGNvbnN0IHtlbnRyeVBvaW50LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9ID0gdGFzaztcbiAgICAgIGNvbnN0IHByb2Nlc3NpbmdNZXRhID0gcHJvY2Vzc2luZ01ldGFkYXRhUGVyRW50cnlQb2ludC5nZXQoZW50cnlQb2ludC5wYXRoKSAhO1xuICAgICAgcHJvY2Vzc2luZ01ldGEuaGFzQW55UHJvY2Vzc2VkRm9ybWF0ID0gdHJ1ZTtcblxuICAgICAgaWYgKG91dGNvbWUgPT09IFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5Qcm9jZXNzZWQpIHtcbiAgICAgICAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gZmlsZVN5c3RlbS5yZXNvbHZlKGVudHJ5UG9pbnQucGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICBjb25zdCBwcm9wc1RvTWFya0FzUHJvY2Vzc2VkOiAoRW50cnlQb2ludEpzb25Qcm9wZXJ0eSB8ICd0eXBpbmdzJylbXSA9XG4gICAgICAgICAgICBbLi4uZm9ybWF0UHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkXTtcblxuICAgICAgICBpZiAocHJvY2Vzc0R0cykge1xuICAgICAgICAgIHByb2Nlc3NpbmdNZXRhLmhhc1Byb2Nlc3NlZFR5cGluZ3MgPSB0cnVlO1xuICAgICAgICAgIHByb3BzVG9NYXJrQXNQcm9jZXNzZWQucHVzaCgndHlwaW5ncycpO1xuICAgICAgICB9XG5cbiAgICAgICAgbWFya0FzUHJvY2Vzc2VkKFxuICAgICAgICAgICAgZmlsZVN5c3RlbSwgZW50cnlQb2ludC5wYWNrYWdlSnNvbiwgcGFja2FnZUpzb25QYXRoLCBwcm9wc1RvTWFya0FzUHJvY2Vzc2VkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFByb2Nlc3MgYWxsIHRhc2tzLlxuICAgIGZvciAoY29uc3QgdGFzayBvZiB0YXNrcykge1xuICAgICAgY29uc3QgcHJvY2Vzc2luZ01ldGEgPSBwcm9jZXNzaW5nTWV0YWRhdGFQZXJFbnRyeVBvaW50LmdldCh0YXNrLmVudHJ5UG9pbnQucGF0aCkgITtcblxuICAgICAgLy8gSWYgd2Ugb25seSBuZWVkIG9uZSBmb3JtYXQgcHJvY2Vzc2VkIGFuZCB3ZSBhbHJlYWR5IGhhdmUgb25lIGZvciB0aGUgY29ycmVzcG9uZGluZ1xuICAgICAgLy8gZW50cnktcG9pbnQsIHNraXAgdGhlIHRhc2suXG4gICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzICYmIHByb2Nlc3NpbmdNZXRhLmhhc0FueVByb2Nlc3NlZEZvcm1hdCkgY29udGludWU7XG5cbiAgICAgIGNvbXBpbGUodGFzayk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGVudHJ5LXBvaW50cyBmb3Igd2hpY2ggd2UgY291bGQgbm90IHByb2Nlc3MgYW55IGZvcm1hdCBhdCBhbGwuXG4gICAgY29uc3QgdW5wcm9jZXNzZWRFbnRyeVBvaW50UGF0aHMgPVxuICAgICAgICBBcnJheS5mcm9tKHByb2Nlc3NpbmdNZXRhZGF0YVBlckVudHJ5UG9pbnQuZW50cmllcygpKVxuICAgICAgICAgICAgLmZpbHRlcigoWywgcHJvY2Vzc2luZ01ldGFdKSA9PiAhcHJvY2Vzc2luZ01ldGEuaGFzQW55UHJvY2Vzc2VkRm9ybWF0KVxuICAgICAgICAgICAgLm1hcCgoW2VudHJ5UG9pbnRQYXRoXSkgPT4gYFxcbiAgLSAke2VudHJ5UG9pbnRQYXRofWApXG4gICAgICAgICAgICAuam9pbignJyk7XG5cbiAgICBpZiAodW5wcm9jZXNzZWRFbnRyeVBvaW50UGF0aHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnRmFpbGVkIHRvIGNvbXBpbGUgYW55IGZvcm1hdHMgZm9yIHRoZSBmb2xsb3dpbmcgZW50cnktcG9pbnRzICh0cmllZCAnICtcbiAgICAgICAgICBgJHtwcm9wZXJ0aWVzVG9Db25zaWRlci5qb2luKCcsICcpfSk6ICR7dW5wcm9jZXNzZWRFbnRyeVBvaW50UGF0aHN9YCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBleGVjdXRlRm4oYW5hbHl6ZUZuLCBjcmVhdGVDb21waWxlRm4pO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVTdXBwb3J0ZWRQcm9wZXJ0aWVzKHByb3BlcnRpZXM6IHN0cmluZ1tdKTogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdIHtcbiAgLy8gU2hvcnQtY2lyY3VpdCB0aGUgY2FzZSB3aGVyZSBgcHJvcGVydGllc2AgaGFzIGZhbGxlbiBiYWNrIHRvIHRoZSBkZWZhdWx0IHZhbHVlOlxuICAvLyBgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTYFxuICBpZiAocHJvcGVydGllcyA9PT0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTKSByZXR1cm4gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTO1xuXG4gIGNvbnN0IHN1cHBvcnRlZFByb3BlcnRpZXM6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzIGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSkge1xuICAgIGlmIChTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMuaW5kZXhPZihwcm9wKSAhPT0gLTEpIHtcbiAgICAgIHN1cHBvcnRlZFByb3BlcnRpZXMucHVzaChwcm9wKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc3VwcG9ydGVkUHJvcGVydGllcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBObyBzdXBwb3J0ZWQgZm9ybWF0IHByb3BlcnR5IHRvIGNvbnNpZGVyIGFtb25nIFske3Byb3BlcnRpZXMuam9pbignLCAnKX1dLiBgICtcbiAgICAgICAgYFN1cHBvcnRlZCBwcm9wZXJ0aWVzOiAke1NVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUy5qb2luKCcsICcpfWApO1xuICB9XG5cbiAgcmV0dXJuIHN1cHBvcnRlZFByb3BlcnRpZXM7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVXcml0ZXIoZnM6IEZpbGVTeXN0ZW0sIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzOiBib29sZWFuKTogRmlsZVdyaXRlciB7XG4gIHJldHVybiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/IG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcihmcykgOiBuZXcgSW5QbGFjZUZpbGVXcml0ZXIoZnMpO1xufVxuXG5mdW5jdGlvbiBnZXRFbnRyeVBvaW50cyhcbiAgICBmczogRmlsZVN5c3RlbSwgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgbG9nZ2VyOiBMb2dnZXIsIHJlc29sdmVyOiBEZXBlbmRlbmN5UmVzb2x2ZXIsXG4gICAgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pOiBFbnRyeVBvaW50W10ge1xuICBjb25zdCB7ZW50cnlQb2ludHMsIGludmFsaWRFbnRyeVBvaW50c30gPSAodGFyZ2V0RW50cnlQb2ludFBhdGggIT09IHVuZGVmaW5lZCkgP1xuICAgICAgZ2V0VGFyZ2V0ZWRFbnRyeVBvaW50cyhcbiAgICAgICAgICBmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyLFxuICAgICAgICAgIGNvbXBpbGVBbGxGb3JtYXRzLCBwYXRoTWFwcGluZ3MpIDpcbiAgICAgIGdldEFsbEVudHJ5UG9pbnRzKGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyLCBpbnZhbGlkRW50cnlQb2ludHMpO1xuICByZXR1cm4gZW50cnlQb2ludHM7XG59XG5cbmZ1bmN0aW9uIGdldFRhcmdldGVkRW50cnlQb2ludHMoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIGxvZ2dlcjogTG9nZ2VyLCByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLFxuICAgIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGg6IHN0cmluZywgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuLCBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8IHVuZGVmaW5lZCk6IFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gIGNvbnN0IGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggPSByZXNvbHZlKGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCk7XG4gIGlmIChoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgICAgICAgIGZzLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkJyk7XG4gICAgcmV0dXJuIHtlbnRyeVBvaW50czogW10sIGludmFsaWRFbnRyeVBvaW50czogW10sIGlnbm9yZWREZXBlbmRlbmNpZXM6IFtdfTtcbiAgfVxuICBjb25zdCBmaW5kZXIgPSBuZXcgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyKFxuICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVudHJ5UG9pbnRJbmZvID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xuICBjb25zdCBpbnZhbGlkVGFyZ2V0ID0gZW50cnlQb2ludEluZm8uaW52YWxpZEVudHJ5UG9pbnRzLmZpbmQoXG4gICAgICBpID0+IGkuZW50cnlQb2ludC5wYXRoID09PSBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoKTtcbiAgaWYgKGludmFsaWRUYXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRoZSB0YXJnZXQgZW50cnktcG9pbnQgXCIke2ludmFsaWRUYXJnZXQuZW50cnlQb2ludC5uYW1lfVwiIGhhcyBtaXNzaW5nIGRlcGVuZGVuY2llczpcXG5gICtcbiAgICAgICAgaW52YWxpZFRhcmdldC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfVxcbmApKTtcbiAgfVxuICBpZiAoZW50cnlQb2ludEluZm8uZW50cnlQb2ludHMubGVuZ3RoID09PSAwKSB7XG4gICAgbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoZnMsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgpO1xuICB9XG4gIHJldHVybiBlbnRyeVBvaW50SW5mbztcbn1cblxuZnVuY3Rpb24gZ2V0QWxsRW50cnlQb2ludHMoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIGxvZ2dlcjogTG9nZ2VyLCByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLFxuICAgIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICBjb25zdCBmaW5kZXIgPVxuICAgICAgbmV3IERpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXIoZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIHBhdGhNYXBwaW5ncyk7XG4gIHJldHVybiBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKCk7XG59XG5cbmZ1bmN0aW9uIGhhc1Byb2Nlc3NlZFRhcmdldEVudHJ5UG9pbnQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHRhcmdldFBhdGg6IEFic29sdXRlRnNQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZSh0YXJnZXRQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIEl0IG1pZ2h0IGJlIHRoYXQgdGhpcyB0YXJnZXQgaXMgY29uZmlndXJlZCBpbiB3aGljaCBjYXNlIGl0cyBwYWNrYWdlLmpzb24gbWlnaHQgbm90IGV4aXN0LlxuICBpZiAoIWZzLmV4aXN0cyhwYWNrYWdlSnNvblBhdGgpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcblxuICBmb3IgKGNvbnN0IHByb3BlcnR5IG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgaWYgKHBhY2thZ2VKc29uW3Byb3BlcnR5XSkge1xuICAgICAgLy8gSGVyZSBpcyBhIHByb3BlcnR5IHRoYXQgc2hvdWxkIGJlIHByb2Nlc3NlZFxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sIHByb3BlcnR5IGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHkpKSB7XG4gICAgICAgIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIHtcbiAgICAgICAgICAvLyBJdCBoYXMgYmVlbiBwcm9jZXNzZWQgYW5kIHdlIG9ubHkgbmVlZCBvbmUsIHNvIHdlIGFyZSBkb25lLlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJdCBoYXMgbm90IGJlZW4gcHJvY2Vzc2VkIGJ1dCB3ZSBuZWVkIGFsbCBvZiB0aGVtLCBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBFaXRoZXIgYWxsIGZvcm1hdHMgbmVlZCB0byBiZSBjb21waWxlZCBhbmQgdGhlcmUgd2VyZSBub25lIHRoYXQgd2VyZSB1bnByb2Nlc3NlZCxcbiAgLy8gT3Igb25seSB0aGUgb25lIG1hdGNoaW5nIGZvcm1hdCBuZWVkcyB0byBiZSBjb21waWxlZCBidXQgdGhlcmUgd2FzIGF0IGxlYXN0IG9uZSBtYXRjaGluZ1xuICAvLyBwcm9wZXJ0eSBiZWZvcmUgdGhlIGZpcnN0IHByb2Nlc3NlZCBmb3JtYXQgdGhhdCB3YXMgdW5wcm9jZXNzZWQuXG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIElmIHdlIGdldCBoZXJlLCB0aGVuIHRoZSByZXF1ZXN0ZWQgZW50cnktcG9pbnQgZGlkIG5vdCBjb250YWluIGFueXRoaW5nIGNvbXBpbGVkIGJ5XG4gKiB0aGUgb2xkIEFuZ3VsYXIgY29tcGlsZXIuIFRoZXJlZm9yZSB0aGVyZSBpcyBub3RoaW5nIGZvciBuZ2NjIHRvIGRvLlxuICogU28gbWFyayBhbGwgZm9ybWF0cyBpbiB0aGlzIGVudHJ5LXBvaW50IGFzIHByb2Nlc3NlZCBzbyB0aGF0IGNsaWVudHMgb2YgbmdjYyBjYW4gYXZvaWRcbiAqIHRyaWdnZXJpbmcgbmdjYyBmb3IgdGhpcyBlbnRyeS1wb2ludCBpbiB0aGUgZnV0dXJlLlxuICovXG5mdW5jdGlvbiBtYXJrTm9uQW5ndWxhclBhY2thZ2VBc1Byb2Nlc3NlZChmczogRmlsZVN5c3RlbSwgcGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZShwYXRoLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcblxuICAvLyBOb3RlOiBXZSBhcmUgbWFya2luZyBhbGwgc3VwcG9ydGVkIHByb3BlcnRpZXMgYXMgcHJvY2Vzc2VkLCBldmVuIGlmIHRoZXkgZG9uJ3QgZXhpc3QgaW4gdGhlXG4gIC8vICAgICAgIGBwYWNrYWdlLmpzb25gIGZpbGUuIFdoaWxlIHRoaXMgaXMgcmVkdW5kYW50LCBpdCBpcyBhbHNvIGhhcm1sZXNzLlxuICBtYXJrQXNQcm9jZXNzZWQoZnMsIHBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGgsIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyk7XG59XG5cbmZ1bmN0aW9uIGxvZ0ludmFsaWRFbnRyeVBvaW50cyhsb2dnZXI6IExvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzOiBJbnZhbGlkRW50cnlQb2ludFtdKTogdm9pZCB7XG4gIGludmFsaWRFbnRyeVBvaW50cy5mb3JFYWNoKGludmFsaWRFbnRyeVBvaW50ID0+IHtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgIGBJbnZhbGlkIGVudHJ5LXBvaW50ICR7aW52YWxpZEVudHJ5UG9pbnQuZW50cnlQb2ludC5wYXRofS5gLFxuICAgICAgICBgSXQgaXMgbWlzc2luZyByZXF1aXJlZCBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgICAgICBpbnZhbGlkRW50cnlQb2ludC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfWApLmpvaW4oJ1xcbicpKTtcbiAgfSk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBjb21wdXRlcyBhbmQgcmV0dXJucyB0aGUgZm9sbG93aW5nOlxuICogLSBgcHJvcGVydGllc1RvUHJvY2Vzc2A6IEFuIChvcmRlcmVkKSBsaXN0IG9mIHByb3BlcnRpZXMgdGhhdCBleGlzdCBhbmQgbmVlZCB0byBiZSBwcm9jZXNzZWQsXG4gKiAgIGJhc2VkIG9uIHRoZSBzcGVjaWZpZWQgYHByb3BlcnRpZXNUb0NvbnNpZGVyYCwgdGhlIHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgYW5kIHRoZWlyXG4gKiAgIGNvcnJlc3BvbmRpbmcgZm9ybWF0LXBhdGhzLiBOT1RFOiBPbmx5IG9uZSBwcm9wZXJ0eSBwZXIgZm9ybWF0LXBhdGggbmVlZHMgdG8gYmUgcHJvY2Vzc2VkLlxuICogLSBgcHJvcGVydHlUb1Byb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZGA6IEEgbWFwcGluZyBmcm9tIGVhY2ggcHJvcGVydHkgaW4gYHByb3BlcnRpZXNUb1Byb2Nlc3NgXG4gKiAgIHRvIHRoZSBsaXN0IG9mIG90aGVyIHByb3BlcnRpZXMgaW4gYHBhY2thZ2UuanNvbmAgdGhhdCBuZWVkIHRvIGJlIG1hcmtlZCBhcyBwcm9jZXNzZWQgYXMgc29vblxuICogICBhcyBvZiB0aGUgZm9ybWVyIGJlaW5nIHByb2Nlc3NlZC5cbiAqL1xuZnVuY3Rpb24gZ2V0UHJvcGVydGllc1RvUHJvY2Vzc0FuZE1hcmtBc1Byb2Nlc3NlZChcbiAgICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdKToge1xuICBwcm9wZXJ0aWVzVG9Qcm9jZXNzOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W107XG4gIHByb3BlcnR5VG9Qcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQ6IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+O1xufSB7XG4gIGNvbnN0IGZvcm1hdFBhdGhzVG9Db25zaWRlciA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGNvbnN0IHByb3BlcnRpZXNUb1Byb2Nlc3M6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKCFwYWNrYWdlSnNvbi5oYXNPd25Qcm9wZXJ0eShwcm9wKSkgY29udGludWU7XG5cbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF0gITtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgbWFwIHRvIHRoZSBzYW1lIGZvcm1hdC1wYXRoIGFzIGEgcHJlY2VkaW5nIHByb3BlcnR5LlxuICAgIGlmIChmb3JtYXRQYXRoc1RvQ29uc2lkZXIuaGFzKGZvcm1hdFBhdGgpKSBjb250aW51ZTtcblxuICAgIC8vIFByb2Nlc3MgdGhpcyBwcm9wZXJ0eSwgYmVjYXVzZSBpdCBpcyB0aGUgZmlyc3Qgb25lIHRvIG1hcCB0byB0aGlzIGZvcm1hdC1wYXRoLlxuICAgIGZvcm1hdFBhdGhzVG9Db25zaWRlci5hZGQoZm9ybWF0UGF0aCk7XG4gICAgcHJvcGVydGllc1RvUHJvY2Vzcy5wdXNoKHByb3ApO1xuICB9XG5cbiAgY29uc3QgZm9ybWF0UGF0aFRvUHJvcGVydGllczoge1tmb3JtYXRQYXRoOiBzdHJpbmddOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W119ID0ge307XG4gIGZvciAoY29uc3QgcHJvcCBvZiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHtcbiAgICAvLyBJZ25vcmUgcHJvcGVydGllcyB0aGF0IGFyZSBub3QgaW4gYHBhY2thZ2UuanNvbmAuXG4gICAgaWYgKCFwYWNrYWdlSnNvbi5oYXNPd25Qcm9wZXJ0eShwcm9wKSkgY29udGludWU7XG5cbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF0gITtcblxuICAgIC8vIElnbm9yZSBwcm9wZXJ0aWVzIHRoYXQgZG8gbm90IG1hcCB0byBhIGZvcm1hdC1wYXRoIHRoYXQgd2lsbCBiZSBjb25zaWRlcmVkLlxuICAgIGlmICghZm9ybWF0UGF0aHNUb0NvbnNpZGVyLmhhcyhmb3JtYXRQYXRoKSkgY29udGludWU7XG5cbiAgICAvLyBBZGQgdGhpcyBwcm9wZXJ0eSB0byB0aGUgbWFwLlxuICAgIGNvbnN0IGxpc3QgPSBmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdIHx8IChmb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzW2Zvcm1hdFBhdGhdID0gW10pO1xuICAgIGxpc3QucHVzaChwcm9wKTtcbiAgfVxuXG4gIGNvbnN0IHByb3BlcnR5VG9Qcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQgPVxuICAgICAgbmV3IE1hcDxFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50SnNvblByb3BlcnR5W10+KCk7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGNvbnN0IGZvcm1hdFBhdGggPSBwYWNrYWdlSnNvbltwcm9wXSAhO1xuICAgIGNvbnN0IHByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCA9IGZvcm1hdFBhdGhUb1Byb3BlcnRpZXNbZm9ybWF0UGF0aF07XG4gICAgcHJvcGVydHlUb1Byb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZC5zZXQocHJvcCwgcHJvcGVydGllc1RvTWFya0FzUHJvY2Vzc2VkKTtcbiAgfVxuXG4gIHJldHVybiB7cHJvcGVydGllc1RvUHJvY2VzcywgcHJvcGVydHlUb1Byb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZH07XG59XG4iXX0=