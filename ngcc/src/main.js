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
        var e_1, _b, e_2, _c;
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _d = _a.propertiesToConsider, propertiesToConsider = _d === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _d, _e = _a.compileAllFormats, compileAllFormats = _e === void 0 ? true : _e, _f = _a.createNewEntryPointFormats, createNewEntryPointFormats = _f === void 0 ? false : _f, _g = _a.logger, logger = _g === void 0 ? new console_logger_1.ConsoleLogger(console_logger_1.LogLevel.info) : _g, pathMappings = _a.pathMappings;
        var fileSystem = file_system_1.getFileSystem();
        var transformer = new transformer_1.Transformer(fileSystem, logger);
        var moduleResolver = new module_resolver_1.ModuleResolver(fileSystem, pathMappings);
        var esmDependencyHost = new esm_dependency_host_1.EsmDependencyHost(fileSystem, moduleResolver);
        var umdDependencyHost = new umd_dependency_host_1.UmdDependencyHost(fileSystem, moduleResolver);
        var commonJsDependencyHost = new commonjs_dependency_host_1.CommonJsDependencyHost(fileSystem, moduleResolver);
        var resolver = new dependency_resolver_1.DependencyResolver(fileSystem, logger, {
            esm5: esmDependencyHost,
            esm2015: esmDependencyHost,
            umd: umdDependencyHost,
            commonjs: commonJsDependencyHost
        });
        var absBasePath = file_system_1.absoluteFrom(basePath);
        var config = new configuration_1.NgccConfiguration(fileSystem, file_system_1.dirname(absBasePath));
        var fileWriter = getFileWriter(fileSystem, createNewEntryPointFormats);
        var entryPoints = getEntryPoints(fileSystem, config, logger, resolver, absBasePath, targetEntryPointPath, pathMappings, propertiesToConsider, compileAllFormats);
        try {
            for (var entryPoints_1 = tslib_1.__values(entryPoints), entryPoints_1_1 = entryPoints_1.next(); !entryPoints_1_1.done; entryPoints_1_1 = entryPoints_1.next()) {
                var entryPoint = entryPoints_1_1.value;
                // Are we compiling the Angular core?
                var isCore = entryPoint.name === '@angular/core';
                var compiledFormats = new Set();
                var entryPointPackageJson = entryPoint.packageJson;
                var entryPointPackageJsonPath = fileSystem.resolve(entryPoint.path, 'package.json');
                var pathToPropsMap = getFormatPathToPropertiesMap(entryPointPackageJson);
                var processDts = !build_marker_1.hasBeenProcessed(entryPointPackageJson, 'typings');
                try {
                    for (var _h = (e_2 = void 0, tslib_1.__values(propertiesToConsider)), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var property = _j.value;
                        // If we only need one format processed and we already have one, exit the loop.
                        if (!compileAllFormats && (compiledFormats.size > 0))
                            break;
                        var formatPath = entryPointPackageJson[property];
                        var format = entry_point_1.getEntryPointFormat(fileSystem, entryPoint, property);
                        // No format then this property is not supposed to be compiled.
                        if (!formatPath || !format)
                            continue;
                        // The `formatPath` which the property maps to is already processed - nothing to do.
                        if (build_marker_1.hasBeenProcessed(entryPointPackageJson, property)) {
                            compiledFormats.add(formatPath);
                            logger.debug("Skipping " + entryPoint.name + " : " + property + " (already compiled).");
                            continue;
                        }
                        if (!compiledFormats.has(formatPath)) {
                            var bundle = entry_point_bundle_1.makeEntryPointBundle(fileSystem, entryPoint, formatPath, isCore, property, format, processDts, pathMappings, true);
                            if (bundle) {
                                logger.info("Compiling " + entryPoint.name + " : " + property + " as " + format);
                                var transformedFiles = transformer.transform(bundle);
                                fileWriter.writeBundle(entryPoint, bundle, transformedFiles);
                                compiledFormats.add(formatPath);
                                var propsToMarkAsProcessed = pathToPropsMap.get(formatPath);
                                if (processDts) {
                                    propsToMarkAsProcessed.push('typings');
                                    processDts = false;
                                }
                                build_marker_1.markAsProcessed(fileSystem, entryPointPackageJson, entryPointPackageJsonPath, propsToMarkAsProcessed);
                            }
                            else {
                                logger.warn("Skipping " + entryPoint.name + " : " + format + " (no valid entry point file for this format).");
                            }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                if (compiledFormats.size === 0) {
                    throw new Error("Failed to compile any formats for entry-point at (" + entryPoint.path + "). Tried " + propertiesToConsider + ".");
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (entryPoints_1_1 && !entryPoints_1_1.done && (_b = entryPoints_1.return)) _b.call(entryPoints_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    exports.mainNgcc = mainNgcc;
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
        var e_3, _a;
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
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (propertiesToConsider_1_1 && !propertiesToConsider_1_1.done && (_a = propertiesToConsider_1.return)) _a.call(propertiesToConsider_1);
            }
            finally { if (e_3) throw e_3.error; }
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
    function getFormatPathToPropertiesMap(packageJson) {
        var e_4, _a;
        var map = new Map();
        try {
            for (var SUPPORTED_FORMAT_PROPERTIES_1 = tslib_1.__values(entry_point_1.SUPPORTED_FORMAT_PROPERTIES), SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next(); !SUPPORTED_FORMAT_PROPERTIES_1_1.done; SUPPORTED_FORMAT_PROPERTIES_1_1 = SUPPORTED_FORMAT_PROPERTIES_1.next()) {
                var prop = SUPPORTED_FORMAT_PROPERTIES_1_1.value;
                var formatPath = packageJson[prop];
                if (formatPath) {
                    if (!map.has(formatPath)) {
                        map.set(formatPath, []);
                    }
                    map.get(formatPath).push(prop);
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (SUPPORTED_FORMAT_PROPERTIES_1_1 && !SUPPORTED_FORMAT_PROPERTIES_1_1.done && (_a = SUPPORTED_FORMAT_PROPERTIES_1.return)) _a.call(SUPPORTED_FORMAT_PROPERTIES_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return map;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUFzSDtJQUV0SCxpSEFBK0U7SUFDL0UsdUdBQWdIO0lBQ2hILHVHQUFxRTtJQUNyRSwrRkFBOEQ7SUFDOUQsdUdBQXFFO0lBQ3JFLDZJQUF5RztJQUN6Ryw2SEFBMEY7SUFDMUYsd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSx1RkFBMkQ7SUFDM0QsbUZBQW1KO0lBQ25KLGlHQUFtRTtJQUNuRSxtRkFBbUQ7SUFHbkQsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQThDOUU7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLFFBQVEsQ0FDcEIsRUFFc0U7O1lBRnJFLHNCQUFRLEVBQUUsOENBQW9CLEVBQUUsNEJBQWtELEVBQWxELHFGQUFrRCxFQUNsRix5QkFBd0IsRUFBeEIsNkNBQXdCLEVBQUUsa0NBQWtDLEVBQWxDLHVEQUFrQyxFQUM1RCxjQUF5QyxFQUF6QyxnR0FBeUMsRUFBRSw4QkFBWTtRQUMxRCxJQUFNLFVBQVUsR0FBRywyQkFBYSxFQUFFLENBQUM7UUFDbkMsSUFBTSxXQUFXLEdBQUcsSUFBSSx5QkFBVyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4RCxJQUFNLGNBQWMsR0FBRyxJQUFJLGdDQUFjLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3BFLElBQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDNUUsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLHVDQUFpQixDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUM1RSxJQUFNLHNCQUFzQixHQUFHLElBQUksaURBQXNCLENBQUMsVUFBVSxFQUFF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LENBQUM7aUJBQ2xDO2FBQ0Y7Ozs7Ozs7OztRQUVELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgZ2V0RmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtDb21tb25Kc0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIEludmFsaWRFbnRyeVBvaW50LCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtVbWREZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZCwgbWFya0FzUHJvY2Vzc2VkfSBmcm9tICcuL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9ufSBmcm9tICcuL3BhY2thZ2VzL2NvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50UGFja2FnZUpzb24sIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUywgZ2V0RW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge21ha2VFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge1RyYW5zZm9ybWVyfSBmcm9tICcuL3BhY2thZ2VzL3RyYW5zZm9ybWVyJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7SW5QbGFjZUZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9pbl9wbGFjZV9maWxlX3dyaXRlcic7XG5pbXBvcnQge05ld0VudHJ5UG9pbnRGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyJztcblxuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2VzIHRvIHByb2Nlc3MuICovXG4gIGJhc2VQYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byB0aGUgcHJpbWFyeSBwYWNrYWdlIHRvIGJlIHByb2Nlc3NlZC4gSWYgbm90IGFic29sdXRlIHRoZW4gaXQgbXVzdCBiZSByZWxhdGl2ZSB0b1xuICAgKiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBBbGwgaXRzIGRlcGVuZGVuY2llcyB3aWxsIG5lZWQgdG8gYmUgcHJvY2Vzc2VkIHRvby5cbiAgICovXG4gIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogc3RyaW5nO1xuICAvKipcbiAgICogV2hpY2ggZW50cnktcG9pbnQgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uIHRvIGNvbnNpZGVyIHdoZW4gcHJvY2Vzc2luZyBhbiBlbnRyeS1wb2ludC5cbiAgICogRWFjaCBwcm9wZXJ0eSBzaG91bGQgaG9sZCBhIHBhdGggdG8gdGhlIHBhcnRpY3VsYXIgYnVuZGxlIGZvcm1hdCBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICAgKiBEZWZhdWx0cyB0byBhbGwgdGhlIHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbi5cbiAgICovXG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyPzogc3RyaW5nW107XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHByb2Nlc3MgYWxsIGZvcm1hdHMgc3BlY2lmaWVkIGJ5IChgcHJvcGVydGllc1RvQ29uc2lkZXJgKSAgb3IgdG8gc3RvcCBwcm9jZXNzaW5nXG4gICAqIHRoaXMgZW50cnktcG9pbnQgYXQgdGhlIGZpcnN0IG1hdGNoaW5nIGZvcm1hdC4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgY29tcGlsZUFsbEZvcm1hdHM/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hldGhlciB0byBjcmVhdGUgbmV3IGVudHJ5LXBvaW50cyBidW5kbGVzIHJhdGhlciB0aGFuIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBmaWxlcy5cbiAgICovXG4gIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBsb2dnZXIgdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGxvZyBtZXNzYWdlcy5cbiAgICovXG4gIGxvZ2dlcj86IExvZ2dlcjtcbiAgLyoqXG4gICAqIFBhdGhzIG1hcHBpbmcgY29uZmlndXJhdGlvbiAoYHBhdGhzYCBhbmQgYGJhc2VVcmxgKSwgYXMgZm91bmQgaW4gYHRzLkNvbXBpbGVyT3B0aW9uc2AuXG4gICAqIFRoZXNlIGFyZSB1c2VkIHRvIHJlc29sdmUgcGF0aHMgdG8gbG9jYWxseSBidWlsdCBBbmd1bGFyIGxpYnJhcmllcy5cbiAgICovXG4gIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncztcbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBmaWxlLXN5c3RlbSBzZXJ2aWNlIHRoYXQgd2lsbCBiZSB1c2VkIGJ5IG5nY2MgZm9yIGFsbCBmaWxlIGludGVyYWN0aW9ucy5cbiAgICovXG4gIGZpbGVTeXN0ZW0/OiBGaWxlU3lzdGVtO1xufVxuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhcbiAgICB7YmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgICAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSwgcGF0aE1hcHBpbmdzfTogTmdjY09wdGlvbnMpOiB2b2lkIHtcbiAgY29uc3QgZmlsZVN5c3RlbSA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgVHJhbnNmb3JtZXIoZmlsZVN5c3RlbSwgbG9nZ2VyKTtcbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzKTtcbiAgY29uc3QgZXNtRGVwZW5kZW5jeUhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3QgPSBuZXcgQ29tbW9uSnNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IHJlc29sdmVyID0gbmV3IERlcGVuZGVuY3lSZXNvbHZlcihmaWxlU3lzdGVtLCBsb2dnZXIsIHtcbiAgICBlc201OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICBlc20yMDE1OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICB1bWQ6IHVtZERlcGVuZGVuY3lIb3N0LFxuICAgIGNvbW1vbmpzOiBjb21tb25Kc0RlcGVuZGVuY3lIb3N0XG4gIH0pO1xuICBjb25zdCBhYnNCYXNlUGF0aCA9IGFic29sdXRlRnJvbShiYXNlUGF0aCk7XG4gIGNvbnN0IGNvbmZpZyA9IG5ldyBOZ2NjQ29uZmlndXJhdGlvbihmaWxlU3lzdGVtLCBkaXJuYW1lKGFic0Jhc2VQYXRoKSk7XG4gIGNvbnN0IGZpbGVXcml0ZXIgPSBnZXRGaWxlV3JpdGVyKGZpbGVTeXN0ZW0sIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcbiAgY29uc3QgZW50cnlQb2ludHMgPSBnZXRFbnRyeVBvaW50cyhcbiAgICAgIGZpbGVTeXN0ZW0sIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYWJzQmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MsXG4gICAgICBwcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpO1xuICBmb3IgKGNvbnN0IGVudHJ5UG9pbnQgb2YgZW50cnlQb2ludHMpIHtcbiAgICAvLyBBcmUgd2UgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmU/XG4gICAgY29uc3QgaXNDb3JlID0gZW50cnlQb2ludC5uYW1lID09PSAnQGFuZ3VsYXIvY29yZSc7XG5cbiAgICBjb25zdCBjb21waWxlZEZvcm1hdHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvblBhdGggPSBmaWxlU3lzdGVtLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG4gICAgY29uc3QgcGF0aFRvUHJvcHNNYXAgPSBnZXRGb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzTWFwKGVudHJ5UG9pbnRQYWNrYWdlSnNvbik7XG5cbiAgICBsZXQgcHJvY2Vzc0R0cyA9ICFoYXNCZWVuUHJvY2Vzc2VkKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgJ3R5cGluZ3MnKTtcblxuICAgIGZvciAoY29uc3QgcHJvcGVydHkgb2YgcHJvcGVydGllc1RvQ29uc2lkZXIgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdKSB7XG4gICAgICAvLyBJZiB3ZSBvbmx5IG5lZWQgb25lIGZvcm1hdCBwcm9jZXNzZWQgYW5kIHdlIGFscmVhZHkgaGF2ZSBvbmUsIGV4aXQgdGhlIGxvb3AuXG4gICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzICYmIChjb21waWxlZEZvcm1hdHMuc2l6ZSA+IDApKSBicmVhaztcblxuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltwcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIHByb3BlcnR5KTtcblxuICAgICAgLy8gTm8gZm9ybWF0IHRoZW4gdGhpcyBwcm9wZXJ0eSBpcyBub3Qgc3VwcG9zZWQgdG8gYmUgY29tcGlsZWQuXG4gICAgICBpZiAoIWZvcm1hdFBhdGggfHwgIWZvcm1hdCkgY29udGludWU7XG5cbiAgICAgIC8vIFRoZSBgZm9ybWF0UGF0aGAgd2hpY2ggdGhlIHByb3BlcnR5IG1hcHMgdG8gaXMgYWxyZWFkeSBwcm9jZXNzZWQgLSBub3RoaW5nIHRvIGRvLlxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludFBhY2thZ2VKc29uLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29tcGlsZWRGb3JtYXRzLmFkZChmb3JtYXRQYXRoKTtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSAoYWxyZWFkeSBjb21waWxlZCkuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG5cbiAgICAgIGlmICghY29tcGlsZWRGb3JtYXRzLmhhcyhmb3JtYXRQYXRoKSkge1xuICAgICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICAgIGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIGZvcm1hdFBhdGgsIGlzQ29yZSwgcHJvcGVydHksIGZvcm1hdCwgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzLFxuICAgICAgICAgICAgdHJ1ZSk7XG5cbiAgICAgICAgaWYgKGJ1bmRsZSkge1xuICAgICAgICAgIGxvZ2dlci5pbmZvKGBDb21waWxpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtwcm9wZXJ0eX0gYXMgJHtmb3JtYXR9YCk7XG4gICAgICAgICAgY29uc3QgdHJhbnNmb3JtZWRGaWxlcyA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybShidW5kbGUpO1xuICAgICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoZW50cnlQb2ludCwgYnVuZGxlLCB0cmFuc2Zvcm1lZEZpbGVzKTtcbiAgICAgICAgICBjb21waWxlZEZvcm1hdHMuYWRkKGZvcm1hdFBhdGgpO1xuXG4gICAgICAgICAgY29uc3QgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZCA9IHBhdGhUb1Byb3BzTWFwLmdldChmb3JtYXRQYXRoKSAhO1xuICAgICAgICAgIGlmIChwcm9jZXNzRHRzKSB7XG4gICAgICAgICAgICBwcm9wc1RvTWFya0FzUHJvY2Vzc2VkLnB1c2goJ3R5cGluZ3MnKTtcbiAgICAgICAgICAgIHByb2Nlc3NEdHMgPSBmYWxzZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBtYXJrQXNQcm9jZXNzZWQoXG4gICAgICAgICAgICAgIGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCwgcHJvcHNUb01hcmtBc1Byb2Nlc3NlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgIGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdH0gKG5vIHZhbGlkIGVudHJ5IHBvaW50IGZpbGUgZm9yIHRoaXMgZm9ybWF0KS5gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb21waWxlZEZvcm1hdHMuc2l6ZSA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBhbnkgZm9ybWF0cyBmb3IgZW50cnktcG9pbnQgYXQgKCR7ZW50cnlQb2ludC5wYXRofSkuIFRyaWVkICR7cHJvcGVydGllc1RvQ29uc2lkZXJ9LmApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKGZzOiBGaWxlU3lzdGVtLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0czogYm9vbGVhbik6IEZpbGVXcml0ZXIge1xuICByZXR1cm4gY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPyBuZXcgTmV3RW50cnlQb2ludEZpbGVXcml0ZXIoZnMpIDogbmV3IEluUGxhY2VGaWxlV3JpdGVyKGZzKTtcbn1cblxuZnVuY3Rpb24gZ2V0RW50cnlQb2ludHMoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIGxvZ2dlcjogTG9nZ2VyLCByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLFxuICAgIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5ncyB8IHVuZGVmaW5lZCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKTogRW50cnlQb2ludFtdIHtcbiAgY29uc3Qge2VudHJ5UG9pbnRzLCBpbnZhbGlkRW50cnlQb2ludHN9ID0gKHRhcmdldEVudHJ5UG9pbnRQYXRoICE9PSB1bmRlZmluZWQpID9cbiAgICAgIGdldFRhcmdldGVkRW50cnlQb2ludHMoXG4gICAgICAgICAgZnMsIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlciwgYmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlcixcbiAgICAgICAgICBjb21waWxlQWxsRm9ybWF0cywgcGF0aE1hcHBpbmdzKSA6XG4gICAgICBnZXRBbGxFbnRyeVBvaW50cyhmcywgY29uZmlnLCBsb2dnZXIsIHJlc29sdmVyLCBiYXNlUGF0aCwgcGF0aE1hcHBpbmdzKTtcbiAgbG9nSW52YWxpZEVudHJ5UG9pbnRzKGxvZ2dlciwgaW52YWxpZEVudHJ5UG9pbnRzKTtcbiAgcmV0dXJuIGVudHJ5UG9pbnRzO1xufVxuXG5mdW5jdGlvbiBnZXRUYXJnZXRlZEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlcixcbiAgICBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoOiBzdHJpbmcsIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbiwgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID0gcmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpO1xuICBpZiAoaGFzUHJvY2Vzc2VkVGFyZ2V0RW50cnlQb2ludChcbiAgICAgICAgICBmcywgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnVGhlIHRhcmdldCBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCcpO1xuICAgIHJldHVybiB7ZW50cnlQb2ludHM6IFtdLCBpbnZhbGlkRW50cnlQb2ludHM6IFtdLCBpZ25vcmVkRGVwZW5kZW5jaWVzOiBbXX07XG4gIH1cbiAgY29uc3QgZmluZGVyID0gbmV3IFRhcmdldGVkRW50cnlQb2ludEZpbmRlcihcbiAgICAgIGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICBjb25zdCBlbnRyeVBvaW50SW5mbyA9IGZpbmRlci5maW5kRW50cnlQb2ludHMoKTtcbiAgaWYgKGVudHJ5UG9pbnRJbmZvLmVudHJ5UG9pbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIG1hcmtOb25Bbmd1bGFyUGFja2FnZUFzUHJvY2Vzc2VkKGZzLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoKTtcbiAgfVxuICByZXR1cm4gZW50cnlQb2ludEluZm87XG59XG5cbmZ1bmN0aW9uIGdldEFsbEVudHJ5UG9pbnRzKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBsb2dnZXI6IExvZ2dlciwgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlcixcbiAgICBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgY29uc3QgZmluZGVyID1cbiAgICAgIG5ldyBEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyKGZzLCBjb25maWcsIGxvZ2dlciwgcmVzb2x2ZXIsIGJhc2VQYXRoLCBwYXRoTWFwcGluZ3MpO1xuICByZXR1cm4gZmluZGVyLmZpbmRFbnRyeVBvaW50cygpO1xufVxuXG5mdW5jdGlvbiBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgIGZzOiBGaWxlU3lzdGVtLCB0YXJnZXRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUodGFyZ2V0UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICAvLyBJdCBtaWdodCBiZSB0aGF0IHRoaXMgdGFyZ2V0IGlzIGNvbmZpZ3VyZWQgaW4gd2hpY2ggY2FzZSBpdHMgcGFja2FnZS5qc29uIG1pZ2h0IG5vdCBleGlzdC5cbiAgaWYgKCFmcy5leGlzdHMocGFja2FnZUpzb25QYXRoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGlmIChwYWNrYWdlSnNvbltwcm9wZXJ0eV0pIHtcbiAgICAgIC8vIEhlcmUgaXMgYSBwcm9wZXJ0eSB0aGF0IHNob3VsZCBiZSBwcm9jZXNzZWRcbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBwcm9wZXJ0eSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5KSkge1xuICAgICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgICAgLy8gSXQgaGFzIGJlZW4gcHJvY2Vzc2VkIGFuZCB3ZSBvbmx5IG5lZWQgb25lLCBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQgaGFzIG5vdCBiZWVuIHByb2Nlc3NlZCBidXQgd2UgbmVlZCBhbGwgb2YgdGhlbSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gRWl0aGVyIGFsbCBmb3JtYXRzIG5lZWQgdG8gYmUgY29tcGlsZWQgYW5kIHRoZXJlIHdlcmUgbm9uZSB0aGF0IHdlcmUgdW5wcm9jZXNzZWQsXG4gIC8vIE9yIG9ubHkgdGhlIG9uZSBtYXRjaGluZyBmb3JtYXQgbmVlZHMgdG8gYmUgY29tcGlsZWQgYnV0IHRoZXJlIHdhcyBhdCBsZWFzdCBvbmUgbWF0Y2hpbmdcbiAgLy8gcHJvcGVydHkgYmVmb3JlIHRoZSBmaXJzdCBwcm9jZXNzZWQgZm9ybWF0IHRoYXQgd2FzIHVucHJvY2Vzc2VkLlxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBJZiB3ZSBnZXQgaGVyZSwgdGhlbiB0aGUgcmVxdWVzdGVkIGVudHJ5LXBvaW50IGRpZCBub3QgY29udGFpbiBhbnl0aGluZyBjb21waWxlZCBieVxuICogdGhlIG9sZCBBbmd1bGFyIGNvbXBpbGVyLiBUaGVyZWZvcmUgdGhlcmUgaXMgbm90aGluZyBmb3IgbmdjYyB0byBkby5cbiAqIFNvIG1hcmsgYWxsIGZvcm1hdHMgaW4gdGhpcyBlbnRyeS1wb2ludCBhcyBwcm9jZXNzZWQgc28gdGhhdCBjbGllbnRzIG9mIG5nY2MgY2FuIGF2b2lkXG4gKiB0cmlnZ2VyaW5nIG5nY2MgZm9yIHRoaXMgZW50cnktcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAqL1xuZnVuY3Rpb24gbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoZnM6IEZpbGVTeXN0ZW0sIHBhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUocGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgLy8gTm90ZTogV2UgYXJlIG1hcmtpbmcgYWxsIHN1cHBvcnRlZCBwcm9wZXJ0aWVzIGFzIHByb2Nlc3NlZCwgZXZlbiBpZiB0aGV5IGRvbid0IGV4aXN0IGluIHRoZVxuICAvLyAgICAgICBgcGFja2FnZS5qc29uYCBmaWxlLiBXaGlsZSB0aGlzIGlzIHJlZHVuZGFudCwgaXQgaXMgYWxzbyBoYXJtbGVzcy5cbiAgbWFya0FzUHJvY2Vzc2VkKGZzLCBwYWNrYWdlSnNvbiwgcGFja2FnZUpzb25QYXRoLCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpO1xufVxuXG5mdW5jdGlvbiBsb2dJbnZhbGlkRW50cnlQb2ludHMobG9nZ2VyOiBMb2dnZXIsIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXSk6IHZvaWQge1xuICBpbnZhbGlkRW50cnlQb2ludHMuZm9yRWFjaChpbnZhbGlkRW50cnlQb2ludCA9PiB7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICBgSW52YWxpZCBlbnRyeS1wb2ludCAke2ludmFsaWRFbnRyeVBvaW50LmVudHJ5UG9pbnQucGF0aH0uYCxcbiAgICAgICAgYEl0IGlzIG1pc3NpbmcgcmVxdWlyZWQgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICAgICAgaW52YWxpZEVudHJ5UG9pbnQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1gKS5qb2luKCdcXG4nKSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRGb3JtYXRQYXRoVG9Qcm9wZXJ0aWVzTWFwKHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24pOlxuICAgIE1hcDxzdHJpbmcsIEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXT4ge1xuICBjb25zdCBtYXAgPSBuZXcgTWFwPHN0cmluZywgRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdPigpO1xuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMpIHtcbiAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bcHJvcF07XG4gICAgaWYgKGZvcm1hdFBhdGgpIHtcbiAgICAgIGlmICghbWFwLmhhcyhmb3JtYXRQYXRoKSkge1xuICAgICAgICBtYXAuc2V0KGZvcm1hdFBhdGgsIFtdKTtcbiAgICAgIH1cbiAgICAgIG1hcC5nZXQoZm9ybWF0UGF0aCkgIS5wdXNoKHByb3ApO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtYXA7XG59XG4iXX0=