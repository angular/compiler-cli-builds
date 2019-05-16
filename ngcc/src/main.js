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
            logger.debug('The target entry-point has already been processed');
            return;
        }
        var _f = finder.findEntryPoints(path_1.AbsoluteFsPath.from(basePath), absoluteTargetEntryPointPath, pathMappings), entryPoints = _f.entryPoints, invalidEntryPoints = _f.invalidEntryPoints;
        invalidEntryPoints.forEach(function (invalidEntryPoint) {
            logger.debug("Invalid entry-point " + invalidEntryPoint.entryPoint.path + ".", "It is missing required dependencies:\n" +
                invalidEntryPoint.missingDependencies.map(function (dep) { return " - " + dep; }).join('\n'));
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDZEQUFvRDtJQUVwRCx1R0FBc0U7SUFDdEUsdUdBQXFFO0lBQ3JFLCtGQUE4RDtJQUU5RCxzR0FBbUU7SUFDbkUsd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSxtRkFBa0k7SUFDbEksaUdBQW1FO0lBQ25FLGlHQUErRDtJQUMvRCxtRkFBbUQ7SUFHbkQsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQXlDOUUsSUFBTSxpQkFBaUIsR0FBdUIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFbEU7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLFFBQVEsQ0FDcEIsRUFFc0U7WUFGckUsc0JBQVEsRUFBRSw4Q0FBb0IsRUFBRSw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xGLHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFBRSxrQ0FBa0MsRUFBbEMsdURBQWtDLEVBQzVELGNBQXlDLEVBQXpDLGdHQUF5QyxFQUFFLDhCQUFZO1FBQzFELElBQU0sRUFBRSxHQUFHLElBQUksc0NBQWdCLEVBQUUsQ0FBQztRQUNsQyxJQUFNLFdBQVcsR0FBRyxJQUFJLHlCQUFXLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELElBQU0sY0FBYyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDNUQsSUFBTSxJQUFJLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdkQsSUFBTSxRQUFRLEdBQUcsSUFBSSx3Q0FBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQ0FBZ0Is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QzNGLG1FQUFtRTtRQUNuRSxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQVMsZ0NBQWdDLENBQ3JDLEVBQWMsRUFBRSxJQUFvQixFQUFFLG9CQUE4QjtRQUN0RSxJQUFNLGVBQWUsR0FBRyxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDckUsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDN0Qsb0JBQW9CLENBQUMsT0FBTyxDQUFDLFVBQUEsY0FBYztZQUN6QyxJQUFJLFdBQVcsQ0FBQyxjQUFjLENBQUM7Z0JBQzdCLDhCQUFlLENBQUMsRUFBRSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsY0FBd0MsQ0FBQyxDQUFDO1FBQ2hHLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9wYXRoJztcblxuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Tm9kZUpTRmlsZVN5c3RlbX0gZnJvbSAnLi9maWxlX3N5c3RlbS9ub2RlX2pzX2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q29uc29sZUxvZ2dlciwgTG9nTGV2ZWx9IGZyb20gJy4vbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge2hhc0JlZW5Qcm9jZXNzZWQsIG1hcmtBc1Byb2Nlc3NlZH0gZnJvbSAnLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50Rm9ybWF0LCBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsIGdldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHttYWtlRW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge1RyYW5zZm9ybWVyfSBmcm9tICcuL3BhY2thZ2VzL3RyYW5zZm9ybWVyJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7SW5QbGFjZUZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9pbl9wbGFjZV9maWxlX3dyaXRlcic7XG5pbXBvcnQge05ld0VudHJ5UG9pbnRGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyJztcblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY09wdGlvbnMge1xuICAvKiogVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlcyB0byBwcm9jZXNzLiAqL1xuICBiYXNlUGF0aDogc3RyaW5nO1xuICAvKipcbiAgICogVGhlIHBhdGggdG8gdGhlIHByaW1hcnkgcGFja2FnZSB0byBiZSBwcm9jZXNzZWQuIElmIG5vdCBhYnNvbHV0ZSB0aGVuIGl0IG11c3QgYmUgcmVsYXRpdmUgdG9cbiAgICogYGJhc2VQYXRoYC5cbiAgICpcbiAgICogQWxsIGl0cyBkZXBlbmRlbmNpZXMgd2lsbCBuZWVkIHRvIGJlIHByb2Nlc3NlZCB0b28uXG4gICAqL1xuICB0YXJnZXRFbnRyeVBvaW50UGF0aD86IHN0cmluZztcbiAgLyoqXG4gICAqIFdoaWNoIGVudHJ5LXBvaW50IHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbiB0byBjb25zaWRlciB3aGVuIHByb2Nlc3NpbmcgYW4gZW50cnktcG9pbnQuXG4gICAqIEVhY2ggcHJvcGVydHkgc2hvdWxkIGhvbGQgYSBwYXRoIHRvIHRoZSBwYXJ0aWN1bGFyIGJ1bmRsZSBmb3JtYXQgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAgICogRGVmYXVsdHMgdG8gYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24uXG4gICAqL1xuICBwcm9wZXJ0aWVzVG9Db25zaWRlcj86IHN0cmluZ1tdO1xuICAvKipcbiAgICogV2hldGhlciB0byBwcm9jZXNzIGFsbCBmb3JtYXRzIHNwZWNpZmllZCBieSAoYHByb3BlcnRpZXNUb0NvbnNpZGVyYCkgIG9yIHRvIHN0b3AgcHJvY2Vzc2luZ1xuICAgKiB0aGlzIGVudHJ5LXBvaW50IGF0IHRoZSBmaXJzdCBtYXRjaGluZyBmb3JtYXQuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIGNvbXBpbGVBbGxGb3JtYXRzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY3JlYXRlIG5ldyBlbnRyeS1wb2ludHMgYnVuZGxlcyByYXRoZXIgdGhhbiBvdmVyd3JpdGluZyB0aGUgb3JpZ2luYWwgZmlsZXMuXG4gICAqL1xuICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBQcm92aWRlIGEgbG9nZ2VyIHRoYXQgd2lsbCBiZSBjYWxsZWQgd2l0aCBsb2cgbWVzc2FnZXMuXG4gICAqL1xuICBsb2dnZXI/OiBMb2dnZXI7XG4gIC8qKlxuICAgKiBQYXRocyBtYXBwaW5nIGNvbmZpZ3VyYXRpb24gKGBwYXRoc2AgYW5kIGBiYXNlVXJsYCksIGFzIGZvdW5kIGluIGB0cy5Db21waWxlck9wdGlvbnNgLlxuICAgKiBUaGVzZSBhcmUgdXNlZCB0byByZXNvbHZlIHBhdGhzIHRvIGxvY2FsbHkgYnVpbHQgQW5ndWxhciBsaWJyYXJpZXMuXG4gICAqL1xuICBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3M7XG59XG5cbmNvbnN0IFNVUFBPUlRFRF9GT1JNQVRTOiBFbnRyeVBvaW50Rm9ybWF0W10gPSBbJ2VzbTUnLCAnZXNtMjAxNSddO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhcbiAgICB7YmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgICAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSwgcGF0aE1hcHBpbmdzfTogTmdjY09wdGlvbnMpOiB2b2lkIHtcbiAgY29uc3QgZnMgPSBuZXcgTm9kZUpTRmlsZVN5c3RlbSgpO1xuICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmcywgbG9nZ2VyKTtcbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZnMsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGhvc3QgPSBuZXcgRXNtRGVwZW5kZW5jeUhvc3QoZnMsIG1vZHVsZVJlc29sdmVyKTtcbiAgY29uc3QgcmVzb2x2ZXIgPSBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKGxvZ2dlciwgaG9zdCk7XG4gIGNvbnN0IGZpbmRlciA9IG5ldyBFbnRyeVBvaW50RmluZGVyKGZzLCBsb2dnZXIsIHJlc29sdmVyKTtcbiAgY29uc3QgZmlsZVdyaXRlciA9IGdldEZpbGVXcml0ZXIoZnMsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcblxuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID1cbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoID8gQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpIDogdW5kZWZpbmVkO1xuXG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICYmXG4gICAgICBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgICAgICAgIGZzLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qge2VudHJ5UG9pbnRzLCBpbnZhbGlkRW50cnlQb2ludHN9ID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cyhcbiAgICAgIEFic29sdXRlRnNQYXRoLmZyb20oYmFzZVBhdGgpLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuXG4gIGludmFsaWRFbnRyeVBvaW50cy5mb3JFYWNoKGludmFsaWRFbnRyeVBvaW50ID0+IHtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgIGBJbnZhbGlkIGVudHJ5LXBvaW50ICR7aW52YWxpZEVudHJ5UG9pbnQuZW50cnlQb2ludC5wYXRofS5gLFxuICAgICAgICBgSXQgaXMgbWlzc2luZyByZXF1aXJlZCBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgICAgICBpbnZhbGlkRW50cnlQb2ludC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfWApLmpvaW4oJ1xcbicpKTtcbiAgfSk7XG5cbiAgaWYgKGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggJiYgZW50cnlQb2ludHMubGVuZ3RoID09PSAwKSB7XG4gICAgbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoZnMsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBlbnRyeVBvaW50cy5mb3JFYWNoKGVudHJ5UG9pbnQgPT4ge1xuICAgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJztcblxuICAgIGNvbnN0IGNvbXBpbGVkRm9ybWF0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgY29uc3QgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCA9XG4gICAgICAgIEFic29sdXRlRnNQYXRoLmZyb21VbmNoZWNrZWQoYCR7ZW50cnlQb2ludC5wYXRofS9wYWNrYWdlLmpzb25gKTtcblxuICAgIGNvbnN0IGhhc1Byb2Nlc3NlZER0cyA9IGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludFBhY2thZ2VKc29uLCAndHlwaW5ncycpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzVG9Db25zaWRlci5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzVG9Db25zaWRlcltpXSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5O1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltwcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KHByb3BlcnR5KTtcblxuICAgICAgLy8gTm8gZm9ybWF0IHRoZW4gdGhpcyBwcm9wZXJ0eSBpcyBub3Qgc3VwcG9zZWQgdG8gYmUgY29tcGlsZWQuXG4gICAgICBpZiAoIWZvcm1hdFBhdGggfHwgIWZvcm1hdCB8fCBTVVBQT1JURURfRk9STUFUUy5pbmRleE9mKGZvcm1hdCkgPT09IC0xKSBjb250aW51ZTtcblxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludFBhY2thZ2VKc29uLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29tcGlsZWRGb3JtYXRzLmFkZChmb3JtYXRQYXRoKTtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSAoYWxyZWFkeSBjb21waWxlZCkuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpc0ZpcnN0Rm9ybWF0ID0gY29tcGlsZWRGb3JtYXRzLnNpemUgPT09IDA7XG4gICAgICBjb25zdCBwcm9jZXNzRHRzID0gIWhhc1Byb2Nlc3NlZER0cyAmJiBpc0ZpcnN0Rm9ybWF0O1xuXG4gICAgICAvLyBXZSBkb24ndCBicmVhayBpZiB0aGlzIGlmIHN0YXRlbWVudCBmYWlscyBiZWNhdXNlIHdlIHN0aWxsIHdhbnQgdG8gbWFya1xuICAgICAgLy8gdGhlIHByb3BlcnR5IGFzIHByb2Nlc3NlZCBldmVuIGlmIGl0cyB1bmRlcmx5aW5nIGZvcm1hdCBoYXMgYmVlbiBidWlsdCBhbHJlYWR5LlxuICAgICAgaWYgKCFjb21waWxlZEZvcm1hdHMuaGFzKGZvcm1hdFBhdGgpICYmIChjb21waWxlQWxsRm9ybWF0cyB8fCBpc0ZpcnN0Rm9ybWF0KSkge1xuICAgICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICAgIGZzLCBlbnRyeVBvaW50LnBhdGgsIGZvcm1hdFBhdGgsIGVudHJ5UG9pbnQudHlwaW5ncywgaXNDb3JlLCBwcm9wZXJ0eSwgZm9ybWF0LFxuICAgICAgICAgICAgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzKTtcbiAgICAgICAgaWYgKGJ1bmRsZSkge1xuICAgICAgICAgIGxvZ2dlci5pbmZvKGBDb21waWxpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtwcm9wZXJ0eX0gYXMgJHtmb3JtYXR9YCk7XG4gICAgICAgICAgY29uc3QgdHJhbnNmb3JtZWRGaWxlcyA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybShidW5kbGUpO1xuICAgICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoZW50cnlQb2ludCwgYnVuZGxlLCB0cmFuc2Zvcm1lZEZpbGVzKTtcbiAgICAgICAgICBjb21waWxlZEZvcm1hdHMuYWRkKGZvcm1hdFBhdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICBgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXR9IChubyB2YWxpZCBlbnRyeSBwb2ludCBmaWxlIGZvciB0aGlzIGZvcm1hdCkuYCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtwcm9wZXJ0eX0gKGFscmVhZHkgY29tcGlsZWQpLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBFaXRoZXIgdGhpcyBmb3JtYXQgd2FzIGp1c3QgY29tcGlsZWQgb3IgaXRzIHVuZGVybHlpbmcgZm9ybWF0IHdhcyBjb21waWxlZCBiZWNhdXNlIG9mIGFcbiAgICAgIC8vIHByZXZpb3VzIHByb3BlcnR5LlxuICAgICAgaWYgKGNvbXBpbGVkRm9ybWF0cy5oYXMoZm9ybWF0UGF0aCkpIHtcbiAgICAgICAgbWFya0FzUHJvY2Vzc2VkKGZzLCBlbnRyeVBvaW50UGFja2FnZUpzb24sIGVudHJ5UG9pbnRQYWNrYWdlSnNvblBhdGgsIHByb3BlcnR5KTtcbiAgICAgICAgaWYgKHByb2Nlc3NEdHMpIHtcbiAgICAgICAgICBtYXJrQXNQcm9jZXNzZWQoZnMsIGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCwgJ3R5cGluZ3MnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb21waWxlZEZvcm1hdHMuc2l6ZSA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBGYWlsZWQgdG8gY29tcGlsZSBhbnkgZm9ybWF0cyBmb3IgZW50cnktcG9pbnQgYXQgKCR7ZW50cnlQb2ludC5wYXRofSkuIFRyaWVkICR7cHJvcGVydGllc1RvQ29uc2lkZXJ9LmApO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldEZpbGVXcml0ZXIoZnM6IEZpbGVTeXN0ZW0sIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzOiBib29sZWFuKTogRmlsZVdyaXRlciB7XG4gIHJldHVybiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/IG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcihmcykgOiBuZXcgSW5QbGFjZUZpbGVXcml0ZXIoZnMpO1xufVxuXG5mdW5jdGlvbiBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgIGZzOiBGaWxlU3lzdGVtLCB0YXJnZXRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdLFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IEFic29sdXRlRnNQYXRoLnJlc29sdmUodGFyZ2V0UGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG5cbiAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgIGlmIChwYWNrYWdlSnNvbltwcm9wZXJ0eV0pIHtcbiAgICAgIC8vIEhlcmUgaXMgYSBwcm9wZXJ0eSB0aGF0IHNob3VsZCBiZSBwcm9jZXNzZWRcbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBwcm9wZXJ0eSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5KSkge1xuICAgICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgICAgLy8gSXQgaGFzIGJlZW4gcHJvY2Vzc2VkIGFuZCB3ZSBvbmx5IG5lZWQgb25lLCBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQgaGFzIG5vdCBiZWVuIHByb2Nlc3NlZCBidXQgd2UgbmVlZCBhbGwgb2YgdGhlbSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gRWl0aGVyIGFsbCBmb3JtYXRzIG5lZWQgdG8gYmUgY29tcGlsZWQgYW5kIHRoZXJlIHdlcmUgbm9uZSB0aGF0IHdlcmUgdW5wcm9jZXNzZWQsXG4gIC8vIE9yIG9ubHkgdGhlIG9uZSBtYXRjaGluZyBmb3JtYXQgbmVlZHMgdG8gYmUgY29tcGlsZWQgYnV0IHRoZXJlIHdhcyBhdCBsZWFzdCBvbmUgbWF0Y2hpbmdcbiAgLy8gcHJvcGVydHkgYmVmb3JlIHRoZSBmaXJzdCBwcm9jZXNzZWQgZm9ybWF0IHRoYXQgd2FzIHVucHJvY2Vzc2VkLlxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBJZiB3ZSBnZXQgaGVyZSwgdGhlbiB0aGUgcmVxdWVzdGVkIGVudHJ5LXBvaW50IGRpZCBub3QgY29udGFpbiBhbnl0aGluZyBjb21waWxlZCBieVxuICogdGhlIG9sZCBBbmd1bGFyIGNvbXBpbGVyLiBUaGVyZWZvcmUgdGhlcmUgaXMgbm90aGluZyBmb3IgbmdjYyB0byBkby5cbiAqIFNvIG1hcmsgYWxsIGZvcm1hdHMgaW4gdGhpcyBlbnRyeS1wb2ludCBhcyBwcm9jZXNzZWQgc28gdGhhdCBjbGllbnRzIG9mIG5nY2MgY2FuIGF2b2lkXG4gKiB0cmlnZ2VyaW5nIG5nY2MgZm9yIHRoaXMgZW50cnktcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAqL1xuZnVuY3Rpb24gbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoXG4gICAgZnM6IEZpbGVTeXN0ZW0sIHBhdGg6IEFic29sdXRlRnNQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10pIHtcbiAgY29uc3QgcGFja2FnZUpzb25QYXRoID0gQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShwYXRoLCAncGFja2FnZS5qc29uJyk7XG4gIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZShwYWNrYWdlSnNvblBhdGgpKTtcbiAgcHJvcGVydGllc1RvQ29uc2lkZXIuZm9yRWFjaChmb3JtYXRQcm9wZXJ0eSA9PiB7XG4gICAgaWYgKHBhY2thZ2VKc29uW2Zvcm1hdFByb3BlcnR5XSlcbiAgICAgIG1hcmtBc1Byb2Nlc3NlZChmcywgcGFja2FnZUpzb24sIHBhY2thZ2VKc29uUGF0aCwgZm9ybWF0UHJvcGVydHkgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSk7XG4gIH0pO1xufVxuIl19