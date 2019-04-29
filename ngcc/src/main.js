(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/file_system/node_js_file_system", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/entry_point_finder", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
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
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var dependency_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver");
    var esm_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    var node_js_file_system_1 = require("@angular/compiler-cli/ngcc/src/file_system/node_js_file_system");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var entry_point_bundle_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle");
    var entry_point_finder_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_finder");
    var transformer_1 = require("@angular/compiler-cli/ngcc/src/packages/transformer");
    var in_place_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/in_place_file_writer");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    var SUPPORTED_FORMATS = ['esm5', 'esm2015'];
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
        var fs = new node_js_file_system_1.NodeJSFileSystem();
        var transformer = new transformer_1.Transformer(fs, logger);
        var moduleResolver = new module_resolver_1.ModuleResolver(fs, pathMappings);
        var host = new esm_dependency_host_1.EsmDependencyHost(fs, moduleResolver);
        var resolver = new dependency_resolver_1.DependencyResolver(logger, host);
        var finder = new entry_point_finder_1.EntryPointFinder(fs, logger, resolver);
        var fileWriter = getFileWriter(fs, createNewEntryPointFormats);
        var absoluteTargetEntryPointPath = targetEntryPointPath ? path_1.AbsoluteFsPath.resolve(basePath, targetEntryPointPath) : undefined;
        if (absoluteTargetEntryPointPath &&
            hasProcessedTargetEntryPoint(fs, absoluteTargetEntryPointPath, propertiesToConsider, compileAllFormats)) {
            logger.info('The target entry-point has already been processed');
            return;
        }
        var entryPoints = finder.findEntryPoints(path_1.AbsoluteFsPath.from(basePath), absoluteTargetEntryPointPath, pathMappings).entryPoints;
        if (absoluteTargetEntryPointPath && entryPoints.length === 0) {
            markNonAngularPackageAsProcessed(fs, absoluteTargetEntryPointPath, propertiesToConsider);
            return;
        }
        entryPoints.forEach(function (entryPoint) {
            // Are we compiling the Angular core?
            var isCore = entryPoint.name === '@angular/core';
            var compiledFormats = new Set();
            var entryPointPackageJson = entryPoint.packageJson;
            var entryPointPackageJsonPath = path_1.AbsoluteFsPath.fromUnchecked(entryPoint.path + "/package.json");
            var hasProcessedDts = build_marker_1.hasBeenProcessed(entryPointPackageJson, 'typings');
            for (var i = 0; i < propertiesToConsider.length; i++) {
                var property = propertiesToConsider[i];
                var formatPath = entryPointPackageJson[property];
                var format = entry_point_1.getEntryPointFormat(property);
                // No format then this property is not supposed to be compiled.
                if (!formatPath || !format || SUPPORTED_FORMATS.indexOf(format) === -1)
                    continue;
                if (build_marker_1.hasBeenProcessed(entryPointPackageJson, property)) {
                    compiledFormats.add(formatPath);
                    logger.info("Skipping " + entryPoint.name + " : " + property + " (already compiled).");
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
                    logger.info("Skipping " + entryPoint.name + " : " + property + " (already compiled).");
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
        });
    }
    exports.mainNgcc = mainNgcc;
    function getFileWriter(fs, createNewEntryPointFormats) {
        return createNewEntryPointFormats ? new new_entry_point_file_writer_1.NewEntryPointFileWriter(fs) : new in_place_file_writer_1.InPlaceFileWriter(fs);
    }
    function hasProcessedTargetEntryPoint(fs, targetPath, propertiesToConsider, compileAllFormats) {
        var e_1, _a;
        var packageJsonPath = path_1.AbsoluteFsPath.resolve(targetPath, 'package.json');
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
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (propertiesToConsider_1_1 && !propertiesToConsider_1_1.done && (_a = propertiesToConsider_1.return)) _a.call(propertiesToConsider_1);
            }
            finally { if (e_1) throw e_1.error; }
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
        var packageJsonPath = path_1.AbsoluteFsPath.resolve(path, 'package.json');
        var packageJson = JSON.parse(fs.readFile(packageJsonPath));
        propertiesToConsider.forEach(function (formatProperty) {
            if (packageJson[formatProperty])
                build_marker_1.markAsProcessed(fs, packageJson, packageJsonPath, formatProperty);
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDZEQUFvRDtJQUVwRCx1R0FBc0U7SUFDdEUsdUdBQXFFO0lBQ3JFLCtGQUE4RDtJQUU5RCxzR0FBbUU7SUFDbkUsd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSxtRkFBa0k7SUFDbEksaUdBQW1FO0lBQ25FLGlHQUErRDtJQUMvRCxtRkFBbUQ7SUFHbkQsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQXdDOUUsSUFBTSxpQkFBaUIsR0FBdUIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFbEU7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLFFBQVEsQ0FDcEIsRUFFc0U7WUFGckUsc0JBQVEsRUFBRSw4Q0FBb0IsRUFBRSw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xGLHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFBRSxrQ0FBa0MsRUFBbEMsdURBQWtDLEVBQzVELGNBQXlDLEVBQXpDLGdHQUF5QyxFQUFFLDhCQUFZO1FBQzFELElBQU0sRUFBRSxHQUFHLElBQUksc0NBQWdCLEVBQUUsQ0FBQztRQUNsQyxJQUFNLFdBQVcsR0FBRyxJQUFJLHlCQUFXLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELElBQU0sY0FBYyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDNUQsSUFBTSxJQUFJLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdkQsSUFBTSxRQUFRLEdBQUcsSUFBSSx3Q0FBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQ0FBZ0Is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VUFBQSxjQUFjO1lBQ3pDLElBQUksV0FBVyxDQUFDLGNBQWMsQ0FBQztnQkFDN0IsOEJBQWUsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxjQUF3QyxDQUFDLENBQUM7UUFDaEcsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuXG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0VzbURlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9lc21fZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL21vZHVsZV9yZXNvbHZlcic7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4vZmlsZV9zeXN0ZW0vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb2RlSlNGaWxlU3lzdGVtfSBmcm9tICcuL2ZpbGVfc3lzdGVtL25vZGVfanNfZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZCwgbWFya0FzUHJvY2Vzc2VkfSBmcm9tICcuL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGb3JtYXQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUywgZ2V0RW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge21ha2VFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2VzIHRvIHByb2Nlc3MuICovXG4gIGJhc2VQYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgcGF0aCwgcmVsYXRpdmUgdG8gYGJhc2VQYXRoYCB0byB0aGUgcHJpbWFyeSBwYWNrYWdlIHRvIGJlIHByb2Nlc3NlZC5cbiAgICpcbiAgICogQWxsIGl0cyBkZXBlbmRlbmNpZXMgd2lsbCBuZWVkIHRvIGJlIHByb2Nlc3NlZCB0b28uXG4gICAqL1xuICB0YXJnZXRFbnRyeVBvaW50UGF0aD86IHN0cmluZztcbiAgLyoqXG4gICAqIFdoaWNoIGVudHJ5LXBvaW50IHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbiB0byBjb25zaWRlciB3aGVuIHByb2Nlc3NpbmcgYW4gZW50cnktcG9pbnQuXG4gICAqIEVhY2ggcHJvcGVydHkgc2hvdWxkIGhvbGQgYSBwYXRoIHRvIHRoZSBwYXJ0aWN1bGFyIGJ1bmRsZSBmb3JtYXQgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAgICogRGVmYXVsdHMgdG8gYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24uXG4gICAqL1xuICBwcm9wZXJ0aWVzVG9Db25zaWRlcj86IHN0cmluZ1tdO1xuICAvKipcbiAgICogV2hldGhlciB0byBwcm9jZXNzIGFsbCBmb3JtYXRzIHNwZWNpZmllZCBieSAoYHByb3BlcnRpZXNUb0NvbnNpZGVyYCkgIG9yIHRvIHN0b3AgcHJvY2Vzc2luZ1xuICAgKiB0aGlzIGVudHJ5LXBvaW50IGF0IHRoZSBmaXJzdCBtYXRjaGluZyBmb3JtYXQuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIGNvbXBpbGVBbGxGb3JtYXRzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY3JlYXRlIG5ldyBlbnRyeS1wb2ludHMgYnVuZGxlcyByYXRoZXIgdGhhbiBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgZmlsZXMuXG4gICAqL1xuICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQcm92aWRlIGEgbG9nZ2VyIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBsb2cgbWVzc2FnZXMuXG4gICAqL1xuICBsb2dnZXI/OiBMb2dnZXI7XG4gIC8qKlxuICAgKiBQYXRocyBtYXBwaW5nIGNvbmZpZ3VyYXRpb24gKGBwYXRoc2AgYW5kIGBiYXNlVXJsYCksIGFzIGZvdW5kIGluIGB0cy5Db21waWxlck9wdGlvbnNgLlxuICAgKiBUaGVzZSBhcmUgdXNlZCB0byByZXNvbHZlIHBhdGhzIHRvIGxvY2FsbHkgYnVpbHQgQW5ndWxhciBsaWJyYXJpZXMuXG4gICAqL1xuICBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3M7XG59XG5cbmNvbnN0IFNVUFBPUlRFRF9GT1JNQVRTOiBFbnRyeVBvaW50Rm9ybWF0W10gPSBbJ2VzbTUnLCAnZXNtMjAxNSddO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhcbiAgICB7YmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgICAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSwgcGF0aE1hcHBpbmdzfTogTmdjY09wdGlvbnMpOiB2b2lkIHtcbiAgY29uc3QgZnMgPSBuZXcgTm9kZUpTRmlsZVN5c3RlbSgpO1xuICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmcywgbG9nZ2VyKTtcbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZnMsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZnMsIG1vZHVsZVJlc29sdmVyKTtcbiAgY29uc3QgcmVzb2x2ZXIgPSBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKGxvZ2dlciwgaG9zdCk7XG4gIGNvbnN0IGZpbmRlciA9IG5ldyBFbnRyeVBvaW50RmluZGVyKGZzLCBsb2dnZXIsIHJlc29sdmVyKTtcbiAgY29uc3QgZmlsZVdyaXRlciA9IGdldEZpbGVXcml0ZXIoZnMsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcblxuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID1cbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoID8gQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpIDogdW5kZWZpbmVkO1xuXG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICYmXG4gICAgICBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgICAgICAgIGZzLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpKSB7XG4gICAgbG9nZ2VyLmluZm8oJ1RoZSB0YXJnZXQgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB7ZW50cnlQb2ludHN9ID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cyhcbiAgICAgIEFic29sdXRlRnNQYXRoLmZyb20oYmFzZVBhdGgpLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuXG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICYmIGVudHJ5UG9pbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIG1hcmtOb25Bbmd1bGFyUGFja2FnZUFzUHJvY2Vzc2VkKGZzLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlcik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZW50cnlQb2ludHMuZm9yRWFjaChlbnRyeVBvaW50ID0+IHtcbiAgICAvLyBBcmUgd2UgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmU/XG4gICAgY29uc3QgaXNDb3JlID0gZW50cnlQb2ludC5uYW1lID09PSAnQGFuZ3VsYXIvY29yZSc7XG5cbiAgICBjb25zdCBjb21waWxlZEZvcm1hdHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvblBhdGggPVxuICAgICAgICBBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKGAke2VudHJ5UG9pbnQucGF0aH0vcGFja2FnZS5qc29uYCk7XG5cbiAgICBjb25zdCBoYXNQcm9jZXNzZWREdHMgPSBoYXNCZWVuUHJvY2Vzc2VkKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgJ3R5cGluZ3MnKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcHJvcGVydGllc1RvQ29uc2lkZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gcHJvcGVydGllc1RvQ29uc2lkZXJbaV0gYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eTtcbiAgICAgIGNvbnN0IGZvcm1hdFBhdGggPSBlbnRyeVBvaW50UGFja2FnZUpzb25bcHJvcGVydHldO1xuICAgICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChwcm9wZXJ0eSk7XG5cbiAgICAgIC8vIE5vIGZvcm1hdCB0aGVuIHRoaXMgcHJvcGVydHkgaXMgbm90IHN1cHBvc2VkIHRvIGJlIGNvbXBpbGVkLlxuICAgICAgaWYgKCFmb3JtYXRQYXRoIHx8ICFmb3JtYXQgfHwgU1VQUE9SVEVEX0ZPUk1BVFMuaW5kZXhPZihmb3JtYXQpID09PSAtMSkgY29udGludWU7XG5cbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgcHJvcGVydHkpKSB7XG4gICAgICAgIGNvbXBpbGVkRm9ybWF0cy5hZGQoZm9ybWF0UGF0aCk7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSAoYWxyZWFkeSBjb21waWxlZCkuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpc0ZpcnN0Rm9ybWF0ID0gY29tcGlsZWRGb3JtYXRzLnNpemUgPT09IDA7XG4gICAgICBjb25zdCBwcm9jZXNzRHRzID0gIWhhc1Byb2Nlc3NlZER0cyAmJiBpc0ZpcnN0Rm9ybWF0O1xuXG4gICAgICAvLyBXZSBkb24ndCBicmVhayBpZiB0aGlzIGlmIHN0YXRlbWVudCBmYWlscyBiZWNhdXNlIHdlIHN0aWxsIHdhbnQgdG8gbWFya1xuICAgICAgLy8gdGhlIHByb3BlcnR5IGFzIHByb2Nlc3NlZCBldmVuIGlmIGl0cyB1bmRlcmx5aW5nIGZvcm1hdCBoYXMgYmVlbiBidWlsdCBhbHJlYWR5LlxuICAgICAgaWYgKCFjb21waWxlZEZvcm1hdHMuaGFzKGZvcm1hdFBhdGgpICYmIChjb21waWxlQWxsRm9ybWF0cyB8fCBpc0ZpcnN0Rm9ybWF0KSkge1xuICAgICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICAgIGZzLCBlbnRyeVBvaW50LnBhdGgsIGZvcm1hdFBhdGgsIGVudHJ5UG9pbnQudHlwaW5ncywgaXNDb3JlLCBwcm9wZXJ0eSwgZm9ybWF0LFxuICAgICAgICAgICAgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzKTtcbiAgICAgICAgaWYgKGJ1bmRsZSkge1xuICAgICAgICAgIGxvZ2dlci5pbmZvKGBDb21waWxpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtwcm9wZXJ0eX0gYXMgJHtmb3JtYXR9YCk7XG4gICAgICAgICAgY29uc3QgdHJhbnNmb3JtZWRGaWxlcyA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybShidW5kbGUpO1xuICAgICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoZW50cnlQb2ludCwgYnVuZGxlLCB0cmFuc2Zvcm1lZEZpbGVzKTtcbiAgICAgICAgICBjb21waWxlZEZvcm1hdHMuYWRkKGZvcm1hdFBhdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICBgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXR9IChubyB2YWxpZCBlbnRyeSBwb2ludCBmaWxlIGZvciB0aGlzIGZvcm1hdCkuYCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSAoYWxyZWFkeSBjb21waWxlZCkuYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEVpdGhlciB0aGlzIGZvcm1hdCB3YXMganVzdCBjb21waWxlZCBvciBpdHMgdW5kZXJseWluZyBmb3JtYXQgd2FzIGNvbXBpbGVkIGJlY2F1c2Ugb2YgYVxuICAgICAgLy8gcHJldmlvdXMgcHJvcGVydHkuXG4gICAgICBpZiAoY29tcGlsZWRGb3JtYXRzLmhhcyhmb3JtYXRQYXRoKSkge1xuICAgICAgICBtYXJrQXNQcm9jZXNzZWQoZnMsIGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCwgcHJvcGVydHkpO1xuICAgICAgICBpZiAocHJvY2Vzc0R0cykge1xuICAgICAgICAgIG1hcmtBc1Byb2Nlc3NlZChmcywgZW50cnlQb2ludFBhY2thZ2VKc29uLCBlbnRyeVBvaW50UGFja2FnZUpzb25QYXRoLCAndHlwaW5ncycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVkRm9ybWF0cy5zaXplID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEZhaWxlZCB0byBjb21waWxlIGFueSBmb3JtYXRzIGZvciBlbnRyeS1wb2ludCBhdCAoJHtlbnRyeVBvaW50LnBhdGh9KS4gVHJpZWQgJHtwcm9wZXJ0aWVzVG9Db25zaWRlcn0uYCk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0RmlsZVdyaXRlcihmczogRmlsZVN5c3RlbSwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM6IGJvb2xlYW4pOiBGaWxlV3JpdGVyIHtcbiAgcmV0dXJuIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID8gbmV3IE5ld0VudHJ5UG9pbnRGaWxlV3JpdGVyKGZzKSA6IG5ldyBJblBsYWNlRmlsZVdyaXRlcihmcyk7XG59XG5cbmZ1bmN0aW9uIGhhc1Byb2Nlc3NlZFRhcmdldEVudHJ5UG9pbnQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHRhcmdldFBhdGg6IEFic29sdXRlRnNQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10sXG4gICAgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gQWJzb2x1dGVGc1BhdGgucmVzb2x2ZSh0YXJnZXRQYXRoLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcblxuICBmb3IgKGNvbnN0IHByb3BlcnR5IG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgaWYgKHBhY2thZ2VKc29uW3Byb3BlcnR5XSkge1xuICAgICAgLy8gSGVyZSBpcyBhIHByb3BlcnR5IHRoYXQgc2hvdWxkIGJlIHByb2Nlc3NlZFxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQocGFja2FnZUpzb24sIHByb3BlcnR5IGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHkpKSB7XG4gICAgICAgIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIHtcbiAgICAgICAgICAvLyBJdCBoYXMgYmVlbiBwcm9jZXNzZWQgYW5kIHdlIG9ubHkgbmVlZCBvbmUsIHNvIHdlIGFyZSBkb25lLlxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJdCBoYXMgbm90IGJlZW4gcHJvY2Vzc2VkIGJ1dCB3ZSBuZWVkIGFsbCBvZiB0aGVtLCBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICAvLyBFaXRoZXIgYWxsIGZvcm1hdHMgbmVlZCB0byBiZSBjb21waWxlZCBhbmQgdGhlcmUgd2VyZSBub25lIHRoYXQgd2VyZSB1bnByb2Nlc3NlZCxcbiAgLy8gT3Igb25seSB0aGUgb25lIG1hdGNoaW5nIGZvcm1hdCBuZWVkcyB0byBiZSBjb21waWxlZCBidXQgdGhlcmUgd2FzIGF0IGxlYXN0IG9uZSBtYXRjaGluZ1xuICAvLyBwcm9wZXJ0eSBiZWZvcmUgdGhlIGZpcnN0IHByb2Nlc3NlZCBmb3JtYXQgdGhhdCB3YXMgdW5wcm9jZXNzZWQuXG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIElmIHdlIGdldCBoZXJlLCB0aGVuIHRoZSByZXF1ZXN0ZWQgZW50cnktcG9pbnQgZGlkIG5vdCBjb250YWluIGFueXRoaW5nIGNvbXBpbGVkIGJ5XG4gKiB0aGUgb2xkIEFuZ3VsYXIgY29tcGlsZXIuIFRoZXJlZm9yZSB0aGVyZSBpcyBub3RoaW5nIGZvciBuZ2NjIHRvIGRvLlxuICogU28gbWFyayBhbGwgZm9ybWF0cyBpbiB0aGlzIGVudHJ5LXBvaW50IGFzIHByb2Nlc3NlZCBzbyB0aGF0IGNsaWVudHMgb2YgbmdjYyBjYW4gYXZvaWRcbiAqIHRyaWdnZXJpbmcgbmdjYyBmb3IgdGhpcyBlbnRyeS1wb2ludCBpbiB0aGUgZnV0dXJlLlxuICovXG5mdW5jdGlvbiBtYXJrTm9uQW5ndWxhclBhY2thZ2VBc1Byb2Nlc3NlZChcbiAgICBmczogRmlsZVN5c3RlbSwgcGF0aDogQWJzb2x1dGVGc1BhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSkge1xuICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKHBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuICBwcm9wZXJ0aWVzVG9Db25zaWRlci5mb3JFYWNoKGZvcm1hdFByb3BlcnR5ID0+IHtcbiAgICBpZiAocGFja2FnZUpzb25bZm9ybWF0UHJvcGVydHldKVxuICAgICAgbWFya0FzUHJvY2Vzc2VkKGZzLCBwYWNrYWdlSnNvbiwgcGFja2FnZUpzb25QYXRoLCBmb3JtYXRQcm9wZXJ0eSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5KTtcbiAgfSk7XG59XG4iXX0=