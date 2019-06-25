(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/entry_point_finder", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
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
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var entry_point_bundle_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle");
    var entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_finder");
    var transformer_1 = require("@angular/compiler-cli/ngcc/src/packages/transformer");
    var in_place_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    var SUPPORTED_FORMATS = ['esm5', 'esm2015', 'umd', 'commonjs'];
    /**
     * This is the main entry-point into ngcc (aNGular Compatibility Compiler).
     *
     * You can call this function to process one or more npm packages, to ensure
     * that they are compatible with the ivy compiler (ngtsc).
     *
     * @param options The options telling ngcc what to compile and how.
     */
    function mainNgcc(_a) {
        var e_1, _b;
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _c = _a.propertiesToConsider, propertiesToConsider = _c === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _c, _d = _a.compileAllFormats, compileAllFormats = _d === void 0 ? true : _d, _e = _a.createNewEntryPointFormats, createNewEntryPointFormats = _e === void 0 ? false : _e, _f = _a.logger, logger = _f === void 0 ? new console_logger_1.ConsoleLogger(console_logger_1.LogLevel.info) : _f, pathMappings = _a.pathMappings;
        var fs = file_system_1.getFileSystem();
        var transformer = new transformer_1.Transformer(fs, logger);
        var moduleResolver = new module_resolver_1.ModuleResolver(fs, pathMappings);
        var esmDependencyHost = new esm_dependency_host_1.EsmDependencyHost(fs, moduleResolver);
        var umdDependencyHost = new umd_dependency_host_1.UmdDependencyHost(fs, moduleResolver);
        var commonJsDependencyHost = new commonjs_dependency_host_1.CommonJsDependencyHost(fs, moduleResolver);
        var resolver = new dependency_resolver_1.DependencyResolver(fs, logger, {
            esm5: esmDependencyHost,
            esm2015: esmDependencyHost,
            umd: umdDependencyHost,
            commonjs: commonJsDependencyHost
        });
        var finder = new entry_point_finder_1.EntryPointFinder(fs, logger, resolver);
        var fileWriter = getFileWriter(fs, createNewEntryPointFormats);
        var absoluteTargetEntryPointPath = targetEntryPointPath ? file_system_1.resolve(basePath, targetEntryPointPath) : undefined;
        if (absoluteTargetEntryPointPath &&
            hasProcessedTargetEntryPoint(fs, absoluteTargetEntryPointPath, propertiesToConsider, compileAllFormats)) {
            logger.debug('The target entry-point has already been processed');
            return;
        }
        var _g = finder.findEntryPoints(file_system_1.absoluteFrom(basePath), absoluteTargetEntryPointPath, pathMappings), entryPoints = _g.entryPoints, invalidEntryPoints = _g.invalidEntryPoints;
        invalidEntryPoints.forEach(function (invalidEntryPoint) {
            logger.debug("Invalid entry-point " + invalidEntryPoint.entryPoint.path + ".", "It is missing required dependencies:\n" +
                invalidEntryPoint.missingDependencies.map(function (dep) { return " - " + dep; }).join('\n'));
        });
        if (absoluteTargetEntryPointPath && entryPoints.length === 0) {
            markNonAngularPackageAsProcessed(fs, absoluteTargetEntryPointPath, propertiesToConsider);
            return;
        }
        try {
            for (var entryPoints_1 = tslib_1.__values(entryPoints), entryPoints_1_1 = entryPoints_1.next(); !entryPoints_1_1.done; entryPoints_1_1 = entryPoints_1.next()) {
                var entryPoint = entryPoints_1_1.value;
                // Are we compiling the Angular core?
                var isCore = entryPoint.name === '@angular/core';
                var compiledFormats = new Set();
                var entryPointPackageJson = entryPoint.packageJson;
                var entryPointPackageJsonPath = fs.resolve(entryPoint.path, 'package.json');
                var hasProcessedDts = build_marker_1.hasBeenProcessed(entryPointPackageJson, 'typings');
                for (var i = 0; i < propertiesToConsider.length; i++) {
                    var property = propertiesToConsider[i];
                    var formatPath = entryPointPackageJson[property];
                    var format = entry_point_1.getEntryPointFormat(fs, entryPoint, property);
                    // No format then this property is not supposed to be compiled.
                    if (!formatPath || !format || SUPPORTED_FORMATS.indexOf(format) === -1)
                        continue;
                    if (build_marker_1.hasBeenProcessed(entryPointPackageJson, property)) {
                        compiledFormats.add(formatPath);
                        logger.debug("Skipping " + entryPoint.name + " : " + property + " (already compiled).");
                        continue;
                    }
                    var isFirstFormat = compiledFormats.size === 0;
                    var processDts = !hasProcessedDts && isFirstFormat;
                    // We don't break if this if statement fails because we still want to mark
                    // the property as processed even if its underlying format has been built already.
                    if (!compiledFormats.has(formatPath) && (compileAllFormats || isFirstFormat)) {
                        var bundle = entry_point_bundle_1.makeEntryPointBundle(fs, entryPoint.path, formatPath, entryPoint.typings, isCore, property, format, processDts, pathMappings);
                        if (bundle) {
                            logger.info("Compiling " + entryPoint.name + " : " + property + " as " + format);
                            var transformedFiles = transformer.transform(bundle);
                            fileWriter.writeBundle(entryPoint, bundle, transformedFiles);
                            compiledFormats.add(formatPath);
                        }
                        else {
                            logger.warn("Skipping " + entryPoint.name + " : " + format + " (no valid entry point file for this format).");
                        }
                    }
                    else if (!compileAllFormats) {
                        logger.debug("Skipping " + entryPoint.name + " : " + property + " (already compiled).");
                    }
                    // Either this format was just compiled or its underlying format was compiled because of a
                    // previous property.
                    if (compiledFormats.has(formatPath)) {
                        build_marker_1.markAsProcessed(fs, entryPointPackageJson, entryPointPackageJsonPath, property);
                        if (processDts) {
                            build_marker_1.markAsProcessed(fs, entryPointPackageJson, entryPointPackageJsonPath, 'typings');
                        }
                    }
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
    function hasProcessedTargetEntryPoint(fs, targetPath, propertiesToConsider, compileAllFormats) {
        var e_2, _a;
        var packageJsonPath = file_system_1.resolve(targetPath, 'package.json');
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
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (propertiesToConsider_1_1 && !propertiesToConsider_1_1.done && (_a = propertiesToConsider_1.return)) _a.call(propertiesToConsider_1);
            }
            finally { if (e_2) throw e_2.error; }
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
    function markNonAngularPackageAsProcessed(fs, path, propertiesToConsider) {
        var packageJsonPath = file_system_1.resolve(path, 'package.json');
        var packageJson = JSON.parse(fs.readFile(packageJsonPath));
        propertiesToConsider.forEach(function (formatProperty) {
            if (packageJson[formatProperty])
                build_marker_1.markAsProcessed(fs, packageJson, packageJsonPath, formatProperty);
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUE2RztJQUM3RyxpSEFBK0U7SUFDL0UsdUdBQXNFO0lBQ3RFLHVHQUFxRTtJQUNyRSwrRkFBOEQ7SUFDOUQsdUdBQXFFO0lBQ3JFLHdGQUFpRTtJQUVqRSxxRkFBMEU7SUFDMUUsbUZBQWtJO0lBQ2xJLGlHQUFtRTtJQUNuRSxpR0FBK0Q7SUFDL0QsbUZBQW1EO0lBR25ELG9HQUFpRTtJQUNqRSxrSEFBOEU7SUF5QzlFLElBQU0saUJBQWlCLEdBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFckY7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLFFBQVEsQ0FDcEIsRUFFc0U7O1lBRnJFLHNCQUFRLEVBQUUsOENBQW9CLEVBQUUsNEJBQWtELEVBQWxELHFGQUFrRCxFQUNsRix5QkFBd0IsRUFBeEIsNkNBQXdCLEVBQUUsa0NBQWtDLEVBQWxDLHVEQUFrQyxFQUM1RCxjQUF5QyxFQUF6QyxnR0FBeUMsRUFBRSw4QkFBWTtRQUMxRCxJQUFNLEVBQUUsR0FBRywyQkFBYSxFQUFFLENBQUM7UUFDM0IsSUFBTSxXQUFXLEdBQUcsSUFBSSx5QkFBVyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNoRCxJQUFNLGNBQWMsR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzVELElBQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDcEUsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLHVDQUFpQixDQUFDLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQztR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MERBQUEsNEZBQUU7Z0JBQXhDLElBQU0sUUFBUSxpQ0FBQTtnQkFDakIsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ3pCLDhDQUE4QztvQkFDOUMsSUFBSSwrQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsUUFBa0MsQ0FBQyxFQUFFO3dCQUNyRSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7NEJBQ3RCLDhEQUE4RDs0QkFDOUQsT0FBTyxJQUFJLENBQUM7eUJBQ2I7cUJBQ0Y7eUJBQU07d0JBQ0wscUVBQXFFO3dCQUNyRSxPQUFPLEtBQUssQ0FBQztxQkFDZDtpQkFDRjthQUNGOzs7Ozs7Ozs7UUFDRCxvRkFBb0Y7UUFDcEYsMkZBQTJGO1FBQzNGLG1FQUFtRTtRQUNuRSxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQVMsZ0NBQWdDLENBQ3JDLEVBQWMsRUFBRSxJQUFvQixFQUFFLG9CQUE4QjtRQUN0RSxJQUFNLGVBQWUsR0FBRyxxQkFBTyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN0RCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUM3RCxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsVUFBQSxjQUFjO1lBQ3pDLElBQUksV0FBVyxDQUFDLGNBQWMsQ0FBQztnQkFDN0IsOEJBQWUsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxjQUF3QyxDQUFDLENBQUM7UUFDaEcsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgYWJzb2x1dGVGcm9tLCBnZXRGaWxlU3lzdGVtLCByZXNvbHZlfSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb21tb25Kc0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtVbWREZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtoYXNCZWVuUHJvY2Vzc2VkLCBtYXJrQXNQcm9jZXNzZWR9IGZyb20gJy4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7RW50cnlQb2ludEZvcm1hdCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7bWFrZUVudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7RW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtUcmFuc2Zvcm1lcn0gZnJvbSAnLi9wYWNrYWdlcy90cmFuc2Zvcm1lcic7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvaW5fcGxhY2VfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtOZXdFbnRyeVBvaW50RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5cbi8qKlxuICogVGhlIG9wdGlvbnMgdG8gY29uZmlndXJlIHRoZSBuZ2NjIGNvbXBpbGVyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NPcHRpb25zIHtcbiAgLyoqIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdGhhdCBjb250YWlucyB0aGUgcGFja2FnZXMgdG8gcHJvY2Vzcy4gKi9cbiAgYmFzZVBhdGg6IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBwYXRoIHRvIHRoZSBwcmltYXJ5IHBhY2thZ2UgdG8gYmUgcHJvY2Vzc2VkLiBJZiBub3QgYWJzb2x1dGUgdGhlbiBpdCBtdXN0IGJlIHJlbGF0aXZlIHRvXG4gICAqIGBiYXNlUGF0aGAuXG4gICAqXG4gICAqIEFsbCBpdHMgZGVwZW5kZW5jaWVzIHdpbGwgbmVlZCB0byBiZSBwcm9jZXNzZWQgdG9vLlxuICAgKi9cbiAgdGFyZ2V0RW50cnlQb2ludFBhdGg/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBXaGljaCBlbnRyeS1wb2ludCBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY29uc2lkZXIgd2hlbiBwcm9jZXNzaW5nIGFuIGVudHJ5LXBvaW50LlxuICAgKiBFYWNoIHByb3BlcnR5IHNob3VsZCBob2xkIGEgcGF0aCB0byB0aGUgcGFydGljdWxhciBidW5kbGUgZm9ybWF0IGZvciB0aGUgZW50cnktcG9pbnQuXG4gICAqIERlZmF1bHRzIHRvIGFsbCB0aGUgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uLlxuICAgKi9cbiAgcHJvcGVydGllc1RvQ29uc2lkZXI/OiBzdHJpbmdbXTtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcHJvY2VzcyBhbGwgZm9ybWF0cyBzcGVjaWZpZWQgYnkgKGBwcm9wZXJ0aWVzVG9Db25zaWRlcmApICBvciB0byBzdG9wIHByb2Nlc3NpbmdcbiAgICogdGhpcyBlbnRyeS1wb2ludCBhdCB0aGUgZmlyc3QgbWF0Y2hpbmcgZm9ybWF0LiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqL1xuICBjb21waWxlQWxsRm9ybWF0cz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNyZWF0ZSBuZXcgZW50cnktcG9pbnRzIGJ1bmRsZXMgcmF0aGVyIHRoYW4gb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIGZpbGVzLlxuICAgKi9cbiAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM/OiBib29sZWFuO1xuICAvKipcbiAgICogUHJvdmlkZSBhIGxvZ2dlciB0aGF0IHdpbGwgYmUgY2FsbGVkIHdpdGggbG9nIG1lc3NhZ2VzLlxuICAgKi9cbiAgbG9nZ2VyPzogTG9nZ2VyO1xuICAvKipcbiAgICogUGF0aHMgbWFwcGluZyBjb25maWd1cmF0aW9uIChgcGF0aHNgIGFuZCBgYmFzZVVybGApLCBhcyBmb3VuZCBpbiBgdHMuQ29tcGlsZXJPcHRpb25zYC5cbiAgICogVGhlc2UgYXJlIHVzZWQgdG8gcmVzb2x2ZSBwYXRocyB0byBsb2NhbGx5IGJ1aWx0IEFuZ3VsYXIgbGlicmFyaWVzLlxuICAgKi9cbiAgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzO1xufVxuXG5jb25zdCBTVVBQT1JURURfRk9STUFUUzogRW50cnlQb2ludEZvcm1hdFtdID0gWydlc201JywgJ2VzbTIwMTUnLCAndW1kJywgJ2NvbW1vbmpzJ107XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeS1wb2ludCBpbnRvIG5nY2MgKGFOR3VsYXIgQ29tcGF0aWJpbGl0eSBDb21waWxlcikuXG4gKlxuICogWW91IGNhbiBjYWxsIHRoaXMgZnVuY3Rpb24gdG8gcHJvY2VzcyBvbmUgb3IgbW9yZSBucG0gcGFja2FnZXMsIHRvIGVuc3VyZVxuICogdGhhdCB0aGV5IGFyZSBjb21wYXRpYmxlIHdpdGggdGhlIGl2eSBjb21waWxlciAobmd0c2MpLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIFRoZSBvcHRpb25zIHRlbGxpbmcgbmdjYyB3aGF0IHRvIGNvbXBpbGUgYW5kIGhvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKFxuICAgIHtiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyID0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLFxuICAgICBjb21waWxlQWxsRm9ybWF0cyA9IHRydWUsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID0gZmFsc2UsXG4gICAgIGxvZ2dlciA9IG5ldyBDb25zb2xlTG9nZ2VyKExvZ0xldmVsLmluZm8pLCBwYXRoTWFwcGluZ3N9OiBOZ2NjT3B0aW9ucyk6IHZvaWQge1xuICBjb25zdCBmcyA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgVHJhbnNmb3JtZXIoZnMsIGxvZ2dlcik7XG4gIGNvbnN0IG1vZHVsZVJlc29sdmVyID0gbmV3IE1vZHVsZVJlc29sdmVyKGZzLCBwYXRoTWFwcGluZ3MpO1xuICBjb25zdCBlc21EZXBlbmRlbmN5SG9zdCA9IG5ldyBFc21EZXBlbmRlbmN5SG9zdChmcywgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmcywgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCBjb21tb25Kc0RlcGVuZGVuY3lIb3N0ID0gbmV3IENvbW1vbkpzRGVwZW5kZW5jeUhvc3QoZnMsIG1vZHVsZVJlc29sdmVyKTtcbiAgY29uc3QgcmVzb2x2ZXIgPSBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKGZzLCBsb2dnZXIsIHtcbiAgICBlc201OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICBlc20yMDE1OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICB1bWQ6IHVtZERlcGVuZGVuY3lIb3N0LFxuICAgIGNvbW1vbmpzOiBjb21tb25Kc0RlcGVuZGVuY3lIb3N0XG4gIH0pO1xuICBjb25zdCBmaW5kZXIgPSBuZXcgRW50cnlQb2ludEZpbmRlcihmcywgbG9nZ2VyLCByZXNvbHZlcik7XG4gIGNvbnN0IGZpbGVXcml0ZXIgPSBnZXRGaWxlV3JpdGVyKGZzLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyk7XG5cbiAgY29uc3QgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCA9XG4gICAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCA/IHJlc29sdmUoYmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoKSA6IHVuZGVmaW5lZDtcblxuICBpZiAoYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCAmJlxuICAgICAgaGFzUHJvY2Vzc2VkVGFyZ2V0RW50cnlQb2ludChcbiAgICAgICAgICBmcywgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIsIGNvbXBpbGVBbGxGb3JtYXRzKSkge1xuICAgIGxvZ2dlci5kZWJ1ZygnVGhlIHRhcmdldCBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCcpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHtlbnRyeVBvaW50cywgaW52YWxpZEVudHJ5UG9pbnRzfSA9XG4gICAgICBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKGFic29sdXRlRnJvbShiYXNlUGF0aCksIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyk7XG5cbiAgaW52YWxpZEVudHJ5UG9pbnRzLmZvckVhY2goaW52YWxpZEVudHJ5UG9pbnQgPT4ge1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYEludmFsaWQgZW50cnktcG9pbnQgJHtpbnZhbGlkRW50cnlQb2ludC5lbnRyeVBvaW50LnBhdGh9LmAsXG4gICAgICAgIGBJdCBpcyBtaXNzaW5nIHJlcXVpcmVkIGRlcGVuZGVuY2llczpcXG5gICtcbiAgICAgICAgICAgIGludmFsaWRFbnRyeVBvaW50Lm1pc3NpbmdEZXBlbmRlbmNpZXMubWFwKGRlcCA9PiBgIC0gJHtkZXB9YCkuam9pbignXFxuJykpO1xuICB9KTtcblxuICBpZiAoYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCAmJiBlbnRyeVBvaW50cy5sZW5ndGggPT09IDApIHtcbiAgICBtYXJrTm9uQW5ndWxhclBhY2thZ2VBc1Byb2Nlc3NlZChmcywgYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGZvciAoY29uc3QgZW50cnlQb2ludCBvZiBlbnRyeVBvaW50cykge1xuICAgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJztcblxuICAgIGNvbnN0IGNvbXBpbGVkRm9ybWF0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgY29uc3QgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCA9IGZzLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICBjb25zdCBoYXNQcm9jZXNzZWREdHMgPSBoYXNCZWVuUHJvY2Vzc2VkKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgJ3R5cGluZ3MnKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcHJvcGVydGllc1RvQ29uc2lkZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gcHJvcGVydGllc1RvQ29uc2lkZXJbaV0gYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eTtcbiAgICAgIGNvbnN0IGZvcm1hdFBhdGggPSBlbnRyeVBvaW50UGFja2FnZUpzb25bcHJvcGVydHldO1xuICAgICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChmcywgZW50cnlQb2ludCwgcHJvcGVydHkpO1xuXG4gICAgICAvLyBObyBmb3JtYXQgdGhlbiB0aGlzIHByb3BlcnR5IGlzIG5vdCBzdXBwb3NlZCB0byBiZSBjb21waWxlZC5cbiAgICAgIGlmICghZm9ybWF0UGF0aCB8fCAhZm9ybWF0IHx8IFNVUFBPUlRFRF9GT1JNQVRTLmluZGV4T2YoZm9ybWF0KSA9PT0gLTEpIGNvbnRpbnVlO1xuXG4gICAgICBpZiAoaGFzQmVlblByb2Nlc3NlZChlbnRyeVBvaW50UGFja2FnZUpzb24sIHByb3BlcnR5KSkge1xuICAgICAgICBjb21waWxlZEZvcm1hdHMuYWRkKGZvcm1hdFBhdGgpO1xuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7cHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzRmlyc3RGb3JtYXQgPSBjb21waWxlZEZvcm1hdHMuc2l6ZSA9PT0gMDtcbiAgICAgIGNvbnN0IHByb2Nlc3NEdHMgPSAhaGFzUHJvY2Vzc2VkRHRzICYmIGlzRmlyc3RGb3JtYXQ7XG5cbiAgICAgIC8vIFdlIGRvbid0IGJyZWFrIGlmIHRoaXMgaWYgc3RhdGVtZW50IGZhaWxzIGJlY2F1c2Ugd2Ugc3RpbGwgd2FudCB0byBtYXJrXG4gICAgICAvLyB0aGUgcHJvcGVydHkgYXMgcHJvY2Vzc2VkIGV2ZW4gaWYgaXRzIHVuZGVybHlpbmcgZm9ybWF0IGhhcyBiZWVuIGJ1aWx0IGFscmVhZHkuXG4gICAgICBpZiAoIWNvbXBpbGVkRm9ybWF0cy5oYXMoZm9ybWF0UGF0aCkgJiYgKGNvbXBpbGVBbGxGb3JtYXRzIHx8IGlzRmlyc3RGb3JtYXQpKSB7XG4gICAgICAgIGNvbnN0IGJ1bmRsZSA9IG1ha2VFbnRyeVBvaW50QnVuZGxlKFxuICAgICAgICAgICAgZnMsIGVudHJ5UG9pbnQucGF0aCwgZm9ybWF0UGF0aCwgZW50cnlQb2ludC50eXBpbmdzLCBpc0NvcmUsIHByb3BlcnR5LCBmb3JtYXQsXG4gICAgICAgICAgICBwcm9jZXNzRHRzLCBwYXRoTWFwcGluZ3MpO1xuICAgICAgICBpZiAoYnVuZGxlKSB7XG4gICAgICAgICAgbG9nZ2VyLmluZm8oYENvbXBpbGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSBhcyAke2Zvcm1hdH1gKTtcbiAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lZEZpbGVzID0gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGJ1bmRsZSk7XG4gICAgICAgICAgZmlsZVdyaXRlci53cml0ZUJ1bmRsZShlbnRyeVBvaW50LCBidW5kbGUsIHRyYW5zZm9ybWVkRmlsZXMpO1xuICAgICAgICAgIGNvbXBpbGVkRm9ybWF0cy5hZGQoZm9ybWF0UGF0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgIGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdH0gKG5vIHZhbGlkIGVudHJ5IHBvaW50IGZpbGUgZm9yIHRoaXMgZm9ybWF0KS5gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSAoYWxyZWFkeSBjb21waWxlZCkuYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEVpdGhlciB0aGlzIGZvcm1hdCB3YXMganVzdCBjb21waWxlZCBvciBpdHMgdW5kZXJseWluZyBmb3JtYXQgd2FzIGNvbXBpbGVkIGJlY2F1c2Ugb2YgYVxuICAgICAgLy8gcHJldmlvdXMgcHJvcGVydHkuXG4gICAgICBpZiAoY29tcGlsZWRGb3JtYXRzLmhhcyhmb3JtYXRQYXRoKSkge1xuICAgICAgICBtYXJrQXNQcm9jZXNzZWQoZnMsIGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCwgcHJvcGVydHkpO1xuICAgICAgICBpZiAocHJvY2Vzc0R0cykge1xuICAgICAgICAgIG1hcmtBc1Byb2Nlc3NlZChmcywgZW50cnlQb2ludFBhY2thZ2VKc29uLCBlbnRyeVBvaW50UGFja2FnZUpzb25QYXRoLCAndHlwaW5ncycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVkRm9ybWF0cy5zaXplID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEZhaWxlZCB0byBjb21waWxlIGFueSBmb3JtYXRzIGZvciBlbnRyeS1wb2ludCBhdCAoJHtlbnRyeVBvaW50LnBhdGh9KS4gVHJpZWQgJHtwcm9wZXJ0aWVzVG9Db25zaWRlcn0uYCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVXcml0ZXIoZnM6IEZpbGVTeXN0ZW0sIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzOiBib29sZWFuKTogRmlsZVdyaXRlciB7XG4gIHJldHVybiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/IG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcihmcykgOiBuZXcgSW5QbGFjZUZpbGVXcml0ZXIoZnMpO1xufVxuXG5mdW5jdGlvbiBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgIGZzOiBGaWxlU3lzdGVtLCB0YXJnZXRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUodGFyZ2V0UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGlmIChwYWNrYWdlSnNvbltwcm9wZXJ0eV0pIHtcbiAgICAgIC8vIEhlcmUgaXMgYSBwcm9wZXJ0eSB0aGF0IHNob3VsZCBiZSBwcm9jZXNzZWRcbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBwcm9wZXJ0eSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5KSkge1xuICAgICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgICAgLy8gSXQgaGFzIGJlZW4gcHJvY2Vzc2VkIGFuZCB3ZSBvbmx5IG5lZWQgb25lLCBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQgaGFzIG5vdCBiZWVuIHByb2Nlc3NlZCBidXQgd2UgbmVlZCBhbGwgb2YgdGhlbSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gRWl0aGVyIGFsbCBmb3JtYXRzIG5lZWQgdG8gYmUgY29tcGlsZWQgYW5kIHRoZXJlIHdlcmUgbm9uZSB0aGF0IHdlcmUgdW5wcm9jZXNzZWQsXG4gIC8vIE9yIG9ubHkgdGhlIG9uZSBtYXRjaGluZyBmb3JtYXQgbmVlZHMgdG8gYmUgY29tcGlsZWQgYnV0IHRoZXJlIHdhcyBhdCBsZWFzdCBvbmUgbWF0Y2hpbmdcbiAgLy8gcHJvcGVydHkgYmVmb3JlIHRoZSBmaXJzdCBwcm9jZXNzZWQgZm9ybWF0IHRoYXQgd2FzIHVucHJvY2Vzc2VkLlxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBJZiB3ZSBnZXQgaGVyZSwgdGhlbiB0aGUgcmVxdWVzdGVkIGVudHJ5LXBvaW50IGRpZCBub3QgY29udGFpbiBhbnl0aGluZyBjb21waWxlZCBieVxuICogdGhlIG9sZCBBbmd1bGFyIGNvbXBpbGVyLiBUaGVyZWZvcmUgdGhlcmUgaXMgbm90aGluZyBmb3IgbmdjYyB0byBkby5cbiAqIFNvIG1hcmsgYWxsIGZvcm1hdHMgaW4gdGhpcyBlbnRyeS1wb2ludCBhcyBwcm9jZXNzZWQgc28gdGhhdCBjbGllbnRzIG9mIG5nY2MgY2FuIGF2b2lkXG4gKiB0cmlnZ2VyaW5nIG5nY2MgZm9yIHRoaXMgZW50cnktcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAqL1xuZnVuY3Rpb24gbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHBhdGg6IEFic29sdXRlRnNQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10pIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gcmVzb2x2ZShwYXRoLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcbiAgcHJvcGVydGllc1RvQ29uc2lkZXIuZm9yRWFjaChmb3JtYXRQcm9wZXJ0eSA9PiB7XG4gICAgaWYgKHBhY2thZ2VKc29uW2Zvcm1hdFByb3BlcnR5XSlcbiAgICAgIG1hcmtBc1Byb2Nlc3NlZChmcywgcGFja2FnZUpzb24sIHBhY2thZ2VKc29uUGF0aCwgZm9ybWF0UHJvcGVydHkgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSk7XG4gIH0pO1xufVxuIl19