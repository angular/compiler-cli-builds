(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/configuration", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/entry_point_finder", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
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
    var configuration_1 = require("@angular/compiler-cli/ngcc/src/packages/configuration");
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
        var config = new configuration_1.NgccConfiguration(fileSystem, file_system_1.dirname(file_system_1.absoluteFrom(basePath)));
        var finder = new entry_point_finder_1.EntryPointFinder(fileSystem, config, logger, resolver);
        var fileWriter = getFileWriter(fileSystem, createNewEntryPointFormats);
        var absoluteTargetEntryPointPath = targetEntryPointPath ? file_system_1.resolve(basePath, targetEntryPointPath) : undefined;
        if (absoluteTargetEntryPointPath &&
            hasProcessedTargetEntryPoint(fileSystem, absoluteTargetEntryPointPath, propertiesToConsider, compileAllFormats)) {
            logger.debug('The target entry-point has already been processed');
            return;
        }
        var _g = finder.findEntryPoints(file_system_1.absoluteFrom(basePath), absoluteTargetEntryPointPath, pathMappings), entryPoints = _g.entryPoints, invalidEntryPoints = _g.invalidEntryPoints;
        invalidEntryPoints.forEach(function (invalidEntryPoint) {
            logger.debug("Invalid entry-point " + invalidEntryPoint.entryPoint.path + ".", "It is missing required dependencies:\n" +
                invalidEntryPoint.missingDependencies.map(function (dep) { return " - " + dep; }).join('\n'));
        });
        if (absoluteTargetEntryPointPath && entryPoints.length === 0) {
            markNonAngularPackageAsProcessed(fileSystem, absoluteTargetEntryPointPath, propertiesToConsider);
            return;
        }
        try {
            for (var entryPoints_1 = tslib_1.__values(entryPoints), entryPoints_1_1 = entryPoints_1.next(); !entryPoints_1_1.done; entryPoints_1_1 = entryPoints_1.next()) {
                var entryPoint = entryPoints_1_1.value;
                // Are we compiling the Angular core?
                var isCore = entryPoint.name === '@angular/core';
                var compiledFormats = new Set();
                var entryPointPackageJson = entryPoint.packageJson;
                var entryPointPackageJsonPath = fileSystem.resolve(entryPoint.path, 'package.json');
                var hasProcessedDts = build_marker_1.hasBeenProcessed(entryPointPackageJson, 'typings');
                for (var i = 0; i < propertiesToConsider.length; i++) {
                    var property = propertiesToConsider[i];
                    var formatPath = entryPointPackageJson[property];
                    var format = entry_point_1.getEntryPointFormat(fileSystem, entryPoint, property);
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
                        var bundle = entry_point_bundle_1.makeEntryPointBundle(fileSystem, entryPoint, formatPath, isCore, property, format, processDts, pathMappings, true);
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
                        build_marker_1.markAsProcessed(fileSystem, entryPointPackageJson, entryPointPackageJsonPath, property);
                        if (processDts) {
                            build_marker_1.markAsProcessed(fileSystem, entryPointPackageJson, entryPointPackageJsonPath, 'typings');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUFzSDtJQUN0SCxpSEFBK0U7SUFDL0UsdUdBQXNFO0lBQ3RFLHVHQUFxRTtJQUNyRSwrRkFBOEQ7SUFDOUQsdUdBQXFFO0lBQ3JFLHdGQUFpRTtJQUVqRSxxRkFBMEU7SUFDMUUsdUZBQTJEO0lBQzNELG1GQUFrSTtJQUNsSSxpR0FBbUU7SUFDbkUsaUdBQStEO0lBQy9ELG1GQUFtRDtJQUduRCxvR0FBaUU7SUFDakUsa0hBQThFO0lBNkM5RSxJQUFNLGlCQUFpQixHQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRXJGOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixRQUFRLENBQ3BCLEVBRXNFOztZQUZyRSxzQkFBUSxFQUFFLDhDQUFvQixFQUFFLDRCQUFrRCxFQUFsRCxxRkFBa0QsRUFDbEYseUJBQXdCLEVBQXhCLDZDQUF3QixFQUFFLGtDQUFrQyxFQUFsQyx1REFBa0MsRUFDNUQsY0FBeUMsRUFBekMsZ0dBQXlDLEVBQUUsOEJBQVk7UUFDMUQsSUFBTSxVQUFVLEdBQUcsMkJBQWEsRUFBRSxDQUFDO1FBQ25DLElBQU0sV0FBVyxHQUFHLElBQUkseUJBQVcsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEQsSUFBTSxjQUFjLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNwRSxJQUFNLGlCQUFpQixHQUFHLElBQUksdUNBQWlCLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzVFLElBQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxVQUFVLEVBQUUsY0FB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QyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbSwgZGlybmFtZSwgZ2V0RmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q29tbW9uSnNEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvY29tbW9uanNfZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7RXNtRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2VzbV9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtNb2R1bGVSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvbW9kdWxlX3Jlc29sdmVyJztcbmltcG9ydCB7VW1kRGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jaWVzL3VtZF9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZCwgbWFya0FzUHJvY2Vzc2VkfSBmcm9tICcuL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9ufSBmcm9tICcuL3BhY2thZ2VzL2NvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50Rm9ybWF0LCBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsIGdldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHttYWtlRW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge1RyYW5zZm9ybWVyfSBmcm9tICcuL3BhY2thZ2VzL3RyYW5zZm9ybWVyJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7SW5QbGFjZUZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9pbl9wbGFjZV9maWxlX3dyaXRlcic7XG5pbXBvcnQge05ld0VudHJ5UG9pbnRGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyJztcblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY09wdGlvbnMge1xuICAvKiogVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlcyB0byBwcm9jZXNzLiAqL1xuICBiYXNlUGF0aDogc3RyaW5nO1xuICAvKipcbiAgICogVGhlIHBhdGggdG8gdGhlIHByaW1hcnkgcGFja2FnZSB0byBiZSBwcm9jZXNzZWQuIElmIG5vdCBhYnNvbHV0ZSB0aGVuIGl0IG11c3QgYmUgcmVsYXRpdmUgdG9cbiAgICogYGJhc2VQYXRoYC5cbiAgICpcbiAgICogQWxsIGl0cyBkZXBlbmRlbmNpZXMgd2lsbCBuZWVkIHRvIGJlIHByb2Nlc3NlZCB0b28uXG4gICAqL1xuICB0YXJnZXRFbnRyeVBvaW50UGF0aD86IHN0cmluZztcbiAgLyoqXG4gICAqIFdoaWNoIGVudHJ5LXBvaW50IHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbiB0byBjb25zaWRlciB3aGVuIHByb2Nlc3NpbmcgYW4gZW50cnktcG9pbnQuXG4gICAqIEVhY2ggcHJvcGVydHkgc2hvdWxkIGhvbGQgYSBwYXRoIHRvIHRoZSBwYXJ0aWN1bGFyIGJ1bmRsZSBmb3JtYXQgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAgICogRGVmYXVsdHMgdG8gYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24uXG4gICAqL1xuICBwcm9wZXJ0aWVzVG9Db25zaWRlcj86IHN0cmluZ1tdO1xuICAvKipcbiAgICogV2hldGhlciB0byBwcm9jZXNzIGFsbCBmb3JtYXRzIHNwZWNpZmllZCBieSAoYHByb3BlcnRpZXNUb0NvbnNpZGVyYCkgIG9yIHRvIHN0b3AgcHJvY2Vzc2luZ1xuICAgKiB0aGlzIGVudHJ5LXBvaW50IGF0IHRoZSBmaXJzdCBtYXRjaGluZyBmb3JtYXQuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIGNvbXBpbGVBbGxGb3JtYXRzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY3JlYXRlIG5ldyBlbnRyeS1wb2ludHMgYnVuZGxlcyByYXRoZXIgdGhhbiBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgZmlsZXMuXG4gICAqL1xuICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQcm92aWRlIGEgbG9nZ2VyIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBsb2cgbWVzc2FnZXMuXG4gICAqL1xuICBsb2dnZXI/OiBMb2dnZXI7XG4gIC8qKlxuICAgKiBQYXRocyBtYXBwaW5nIGNvbmZpZ3VyYXRpb24gKGBwYXRoc2AgYW5kIGBiYXNlVXJsYCksIGFzIGZvdW5kIGluIGB0cy5Db21waWxlck9wdGlvbnNgLlxuICAgKiBUaGVzZSBhcmUgdXNlZCB0byByZXNvbHZlIHBhdGhzIHRvIGxvY2FsbHkgYnVpbHQgQW5ndWxhciBsaWJyYXJpZXMuXG4gICAqL1xuICBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3M7XG4gIC8qKlxuICAgKiBQcm92aWRlIGEgZmlsZS1zeXN0ZW0gc2VydmljZSB0aGF0IHdpbGwgYmUgdXNlZCBieSBuZ2NjIGZvciBhbGwgZmlsZSBpbnRlcmFjdGlvbnMuXG4gICAqL1xuICBmaWxlU3lzdGVtPzogRmlsZVN5c3RlbTtcbn1cblxuY29uc3QgU1VQUE9SVEVEX0ZPUk1BVFM6IEVudHJ5UG9pbnRGb3JtYXRbXSA9IFsnZXNtNScsICdlc20yMDE1JywgJ3VtZCcsICdjb21tb25qcyddO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhcbiAgICB7YmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgICAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSwgcGF0aE1hcHBpbmdzfTogTmdjY09wdGlvbnMpOiB2b2lkIHtcbiAgY29uc3QgZmlsZVN5c3RlbSA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgVHJhbnNmb3JtZXIoZmlsZVN5c3RlbSwgbG9nZ2VyKTtcbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzKTtcbiAgY29uc3QgZXNtRGVwZW5kZW5jeUhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZmlsZVN5c3RlbSwgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCB1bWREZXBlbmRlbmN5SG9zdCA9IG5ldyBVbWREZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3QgPSBuZXcgQ29tbW9uSnNEZXBlbmRlbmN5SG9zdChmaWxlU3lzdGVtLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IHJlc29sdmVyID0gbmV3IERlcGVuZGVuY3lSZXNvbHZlcihmaWxlU3lzdGVtLCBsb2dnZXIsIHtcbiAgICBlc201OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICBlc20yMDE1OiBlc21EZXBlbmRlbmN5SG9zdCxcbiAgICB1bWQ6IHVtZERlcGVuZGVuY3lIb3N0LFxuICAgIGNvbW1vbmpzOiBjb21tb25Kc0RlcGVuZGVuY3lIb3N0XG4gIH0pO1xuICBjb25zdCBjb25maWcgPSBuZXcgTmdjY0NvbmZpZ3VyYXRpb24oZmlsZVN5c3RlbSwgZGlybmFtZShhYnNvbHV0ZUZyb20oYmFzZVBhdGgpKSk7XG4gIGNvbnN0IGZpbmRlciA9IG5ldyBFbnRyeVBvaW50RmluZGVyKGZpbGVTeXN0ZW0sIGNvbmZpZywgbG9nZ2VyLCByZXNvbHZlcik7XG4gIGNvbnN0IGZpbGVXcml0ZXIgPSBnZXRGaWxlV3JpdGVyKGZpbGVTeXN0ZW0sIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcblxuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID1cbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoID8gcmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpIDogdW5kZWZpbmVkO1xuXG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICYmXG4gICAgICBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgICAgICAgIGZpbGVTeXN0ZW0sIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cykpIHtcbiAgICBsb2dnZXIuZGVidWcoJ1RoZSB0YXJnZXQgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB7ZW50cnlQb2ludHMsIGludmFsaWRFbnRyeVBvaW50c30gPVxuICAgICAgZmluZGVyLmZpbmRFbnRyeVBvaW50cyhhYnNvbHV0ZUZyb20oYmFzZVBhdGgpLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuXG4gIGludmFsaWRFbnRyeVBvaW50cy5mb3JFYWNoKGludmFsaWRFbnRyeVBvaW50ID0+IHtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgIGBJbnZhbGlkIGVudHJ5LXBvaW50ICR7aW52YWxpZEVudHJ5UG9pbnQuZW50cnlQb2ludC5wYXRofS5gLFxuICAgICAgICBgSXQgaXMgbWlzc2luZyByZXF1aXJlZCBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgICAgICBpbnZhbGlkRW50cnlQb2ludC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfWApLmpvaW4oJ1xcbicpKTtcbiAgfSk7XG5cbiAgaWYgKGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggJiYgZW50cnlQb2ludHMubGVuZ3RoID09PSAwKSB7XG4gICAgbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoXG4gICAgICAgIGZpbGVTeXN0ZW0sIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBmb3IgKGNvbnN0IGVudHJ5UG9pbnQgb2YgZW50cnlQb2ludHMpIHtcbiAgICAvLyBBcmUgd2UgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmU/XG4gICAgY29uc3QgaXNDb3JlID0gZW50cnlQb2ludC5uYW1lID09PSAnQGFuZ3VsYXIvY29yZSc7XG5cbiAgICBjb25zdCBjb21waWxlZEZvcm1hdHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvblBhdGggPSBmaWxlU3lzdGVtLnJlc29sdmUoZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJyk7XG5cbiAgICBjb25zdCBoYXNQcm9jZXNzZWREdHMgPSBoYXNCZWVuUHJvY2Vzc2VkKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgJ3R5cGluZ3MnKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcHJvcGVydGllc1RvQ29uc2lkZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gcHJvcGVydGllc1RvQ29uc2lkZXJbaV0gYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eTtcbiAgICAgIGNvbnN0IGZvcm1hdFBhdGggPSBlbnRyeVBvaW50UGFja2FnZUpzb25bcHJvcGVydHldO1xuICAgICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBwcm9wZXJ0eSk7XG5cbiAgICAgIC8vIE5vIGZvcm1hdCB0aGVuIHRoaXMgcHJvcGVydHkgaXMgbm90IHN1cHBvc2VkIHRvIGJlIGNvbXBpbGVkLlxuICAgICAgaWYgKCFmb3JtYXRQYXRoIHx8ICFmb3JtYXQgfHwgU1VQUE9SVEVEX0ZPUk1BVFMuaW5kZXhPZihmb3JtYXQpID09PSAtMSkgY29udGludWU7XG5cbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgcHJvcGVydHkpKSB7XG4gICAgICAgIGNvbXBpbGVkRm9ybWF0cy5hZGQoZm9ybWF0UGF0aCk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtwcm9wZXJ0eX0gKGFscmVhZHkgY29tcGlsZWQpLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNGaXJzdEZvcm1hdCA9IGNvbXBpbGVkRm9ybWF0cy5zaXplID09PSAwO1xuICAgICAgY29uc3QgcHJvY2Vzc0R0cyA9ICFoYXNQcm9jZXNzZWREdHMgJiYgaXNGaXJzdEZvcm1hdDtcblxuICAgICAgLy8gV2UgZG9uJ3QgYnJlYWsgaWYgdGhpcyBpZiBzdGF0ZW1lbnQgZmFpbHMgYmVjYXVzZSB3ZSBzdGlsbCB3YW50IHRvIG1hcmtcbiAgICAgIC8vIHRoZSBwcm9wZXJ0eSBhcyBwcm9jZXNzZWQgZXZlbiBpZiBpdHMgdW5kZXJseWluZyBmb3JtYXQgaGFzIGJlZW4gYnVpbHQgYWxyZWFkeS5cbiAgICAgIGlmICghY29tcGlsZWRGb3JtYXRzLmhhcyhmb3JtYXRQYXRoKSAmJiAoY29tcGlsZUFsbEZvcm1hdHMgfHwgaXNGaXJzdEZvcm1hdCkpIHtcbiAgICAgICAgY29uc3QgYnVuZGxlID0gbWFrZUVudHJ5UG9pbnRCdW5kbGUoXG4gICAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQYXRoLCBpc0NvcmUsIHByb3BlcnR5LCBmb3JtYXQsIHByb2Nlc3NEdHMsIHBhdGhNYXBwaW5ncyxcbiAgICAgICAgICAgIHRydWUpO1xuICAgICAgICBpZiAoYnVuZGxlKSB7XG4gICAgICAgICAgbG9nZ2VyLmluZm8oYENvbXBpbGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSBhcyAke2Zvcm1hdH1gKTtcbiAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lZEZpbGVzID0gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGJ1bmRsZSk7XG4gICAgICAgICAgZmlsZVdyaXRlci53cml0ZUJ1bmRsZShlbnRyeVBvaW50LCBidW5kbGUsIHRyYW5zZm9ybWVkRmlsZXMpO1xuICAgICAgICAgIGNvbXBpbGVkRm9ybWF0cy5hZGQoZm9ybWF0UGF0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgIGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdH0gKG5vIHZhbGlkIGVudHJ5IHBvaW50IGZpbGUgZm9yIHRoaXMgZm9ybWF0KS5gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSAoYWxyZWFkeSBjb21waWxlZCkuYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEVpdGhlciB0aGlzIGZvcm1hdCB3YXMganVzdCBjb21waWxlZCBvciBpdHMgdW5kZXJseWluZyBmb3JtYXQgd2FzIGNvbXBpbGVkIGJlY2F1c2Ugb2YgYVxuICAgICAgLy8gcHJldmlvdXMgcHJvcGVydHkuXG4gICAgICBpZiAoY29tcGlsZWRGb3JtYXRzLmhhcyhmb3JtYXRQYXRoKSkge1xuICAgICAgICBtYXJrQXNQcm9jZXNzZWQoZmlsZVN5c3RlbSwgZW50cnlQb2ludFBhY2thZ2VKc29uLCBlbnRyeVBvaW50UGFja2FnZUpzb25QYXRoLCBwcm9wZXJ0eSk7XG4gICAgICAgIGlmIChwcm9jZXNzRHRzKSB7XG4gICAgICAgICAgbWFya0FzUHJvY2Vzc2VkKGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCwgJ3R5cGluZ3MnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb21waWxlZEZvcm1hdHMuc2l6ZSA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBhbnkgZm9ybWF0cyBmb3IgZW50cnktcG9pbnQgYXQgKCR7ZW50cnlQb2ludC5wYXRofSkuIFRyaWVkICR7cHJvcGVydGllc1RvQ29uc2lkZXJ9LmApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKGZzOiBGaWxlU3lzdGVtLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0czogYm9vbGVhbik6IEZpbGVXcml0ZXIge1xuICByZXR1cm4gY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPyBuZXcgTmV3RW50cnlQb2ludEZpbGVXcml0ZXIoZnMpIDogbmV3IEluUGxhY2VGaWxlV3JpdGVyKGZzKTtcbn1cblxuZnVuY3Rpb24gaGFzUHJvY2Vzc2VkVGFyZ2V0RW50cnlQb2ludChcbiAgICBmczogRmlsZVN5c3RlbSwgdGFyZ2V0UGF0aDogQWJzb2x1dGVGc1BhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbikge1xuICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSByZXNvbHZlKHRhcmdldFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gSXQgbWlnaHQgYmUgdGhhdCB0aGlzIHRhcmdldCBpcyBjb25maWd1cmVkIGluIHdoaWNoIGNhc2UgaXRzIHBhY2thZ2UuanNvbiBtaWdodCBub3QgZXhpc3QuXG4gIGlmICghZnMuZXhpc3RzKHBhY2thZ2VKc29uUGF0aCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuXG4gIGZvciAoY29uc3QgcHJvcGVydHkgb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBpZiAocGFja2FnZUpzb25bcHJvcGVydHldKSB7XG4gICAgICAvLyBIZXJlIGlzIGEgcHJvcGVydHkgdGhhdCBzaG91bGQgYmUgcHJvY2Vzc2VkXG4gICAgICBpZiAoaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgcHJvcGVydHkgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSkpIHtcbiAgICAgICAgaWYgKCFjb21waWxlQWxsRm9ybWF0cykge1xuICAgICAgICAgIC8vIEl0IGhhcyBiZWVuIHByb2Nlc3NlZCBhbmQgd2Ugb25seSBuZWVkIG9uZSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEl0IGhhcyBub3QgYmVlbiBwcm9jZXNzZWQgYnV0IHdlIG5lZWQgYWxsIG9mIHRoZW0sIHNvIHdlIGFyZSBkb25lLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIEVpdGhlciBhbGwgZm9ybWF0cyBuZWVkIHRvIGJlIGNvbXBpbGVkIGFuZCB0aGVyZSB3ZXJlIG5vbmUgdGhhdCB3ZXJlIHVucHJvY2Vzc2VkLFxuICAvLyBPciBvbmx5IHRoZSBvbmUgbWF0Y2hpbmcgZm9ybWF0IG5lZWRzIHRvIGJlIGNvbXBpbGVkIGJ1dCB0aGVyZSB3YXMgYXQgbGVhc3Qgb25lIG1hdGNoaW5nXG4gIC8vIHByb3BlcnR5IGJlZm9yZSB0aGUgZmlyc3QgcHJvY2Vzc2VkIGZvcm1hdCB0aGF0IHdhcyB1bnByb2Nlc3NlZC5cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogSWYgd2UgZ2V0IGhlcmUsIHRoZW4gdGhlIHJlcXVlc3RlZCBlbnRyeS1wb2ludCBkaWQgbm90IGNvbnRhaW4gYW55dGhpbmcgY29tcGlsZWQgYnlcbiAqIHRoZSBvbGQgQW5ndWxhciBjb21waWxlci4gVGhlcmVmb3JlIHRoZXJlIGlzIG5vdGhpbmcgZm9yIG5nY2MgdG8gZG8uXG4gKiBTbyBtYXJrIGFsbCBmb3JtYXRzIGluIHRoaXMgZW50cnktcG9pbnQgYXMgcHJvY2Vzc2VkIHNvIHRoYXQgY2xpZW50cyBvZiBuZ2NjIGNhbiBhdm9pZFxuICogdHJpZ2dlcmluZyBuZ2NjIGZvciB0aGlzIGVudHJ5LXBvaW50IGluIHRoZSBmdXR1cmUuXG4gKi9cbmZ1bmN0aW9uIG1hcmtOb25Bbmd1bGFyUGFja2FnZUFzUHJvY2Vzc2VkKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IHJlc29sdmUocGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyLmZvckVhY2goZm9ybWF0UHJvcGVydHkgPT4ge1xuICAgIGlmIChwYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV0pXG4gICAgICBtYXJrQXNQcm9jZXNzZWQoZnMsIHBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGgsIGZvcm1hdFByb3BlcnR5IGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHkpO1xuICB9KTtcbn1cbiJdfQ==