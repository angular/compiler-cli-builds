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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDZEQUFvRDtJQUVwRCx1R0FBc0U7SUFDdEUsdUdBQXFFO0lBQ3JFLCtGQUE4RDtJQUU5RCxzR0FBbUU7SUFDbkUsd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSxtRkFBa0k7SUFDbEksaUdBQW1FO0lBQ25FLGlHQUErRDtJQUMvRCxtRkFBbUQ7SUFHbkQsb0dBQWlFO0lBQ2pFLGtIQUE4RTtJQXlDOUUsSUFBTSxpQkFBaUIsR0FBdUIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFbEU7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLFFBQVEsQ0FDcEIsRUFFc0U7WUFGckUsc0JBQVEsRUFBRSw4Q0FBb0IsRUFBRSw0QkFBa0QsRUFBbEQscUZBQWtELEVBQ2xGLHlCQUF3QixFQUF4Qiw2Q0FBd0IsRUFBRSxrQ0FBa0MsRUFBbEMsdURBQWtDLEVBQzVELGNBQXlDLEVBQXpDLGdHQUF5QyxFQUFFLDhCQUFZO1FBQzFELElBQU0sRUFBRSxHQUFHLElBQUksc0NBQWdCLEVBQUUsQ0FBQztRQUNsQyxJQUFNLFdBQVcsR0FBRyxJQUFJLHlCQUFXLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELElBQU0sY0FBYyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDNUQsSUFBTSxJQUFJLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdkQsSUFBTSxRQUFRLEdBQUcsSUFBSSx3Q0FBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQ0FBZ0Is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VUFBQSxjQUFjO1lBQ3pDLElBQUksV0FBVyxDQUFDLGNBQWMsQ0FBQztnQkFDN0IsOEJBQWUsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxjQUF3QyxDQUFDLENBQUM7UUFDaEcsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuXG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0VzbURlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9lc21fZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL21vZHVsZV9yZXNvbHZlcic7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4vZmlsZV9zeXN0ZW0vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb2RlSlNGaWxlU3lzdGVtfSBmcm9tICcuL2ZpbGVfc3lzdGVtL25vZGVfanNfZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZCwgbWFya0FzUHJvY2Vzc2VkfSBmcm9tICcuL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGb3JtYXQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUywgZ2V0RW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge21ha2VFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2VzIHRvIHByb2Nlc3MuICovXG4gIGJhc2VQYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byB0aGUgcHJpbWFyeSBwYWNrYWdlIHRvIGJlIHByb2Nlc3NlZC4gSWYgbm90IGFic29sdXRlIHRoZW4gaXQgbXVzdCBiZSByZWxhdGl2ZSB0b1xuICAgKiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBBbGwgaXRzIGRlcGVuZGVuY2llcyB3aWxsIG5lZWQgdG8gYmUgcHJvY2Vzc2VkIHRvby5cbiAgICovXG4gIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogc3RyaW5nO1xuICAvKipcbiAgICogV2hpY2ggZW50cnktcG9pbnQgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uIHRvIGNvbnNpZGVyIHdoZW4gcHJvY2Vzc2luZyBhbiBlbnRyeS1wb2ludC5cbiAgICogRWFjaCBwcm9wZXJ0eSBzaG91bGQgaG9sZCBhIHBhdGggdG8gdGhlIHBhcnRpY3VsYXIgYnVuZGxlIGZvcm1hdCBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICAgKiBEZWZhdWx0cyB0byBhbGwgdGhlIHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbi5cbiAgICovXG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyPzogc3RyaW5nW107XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHByb2Nlc3MgYWxsIGZvcm1hdHMgc3BlY2lmaWVkIGJ5IChgcHJvcGVydGllc1RvQ29uc2lkZXJgKSAgb3IgdG8gc3RvcCBwcm9jZXNzaW5nXG4gICAqIHRoaXMgZW50cnktcG9pbnQgYXQgdGhlIGZpcnN0IG1hdGNoaW5nIGZvcm1hdC4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgY29tcGlsZUFsbEZvcm1hdHM/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hldGhlciB0byBjcmVhdGUgbmV3IGVudHJ5LXBvaW50cyBidW5kbGVzIHJhdGhlciB0aGFuIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBmaWxlcy5cbiAgICovXG4gIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBsb2dnZXIgdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGxvZyBtZXNzYWdlcy5cbiAgICovXG4gIGxvZ2dlcj86IExvZ2dlcjtcbiAgLyoqXG4gICAqIFBhdGhzIG1hcHBpbmcgY29uZmlndXJhdGlvbiAoYHBhdGhzYCBhbmQgYGJhc2VVcmxgKSwgYXMgZm91bmQgaW4gYHRzLkNvbXBpbGVyT3B0aW9uc2AuXG4gICAqIFRoZXNlIGFyZSB1c2VkIHRvIHJlc29sdmUgcGF0aHMgdG8gbG9jYWxseSBidWlsdCBBbmd1bGFyIGxpYnJhcmllcy5cbiAgICovXG4gIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncztcbn1cblxuY29uc3QgU1VQUE9SVEVEX0ZPUk1BVFM6IEVudHJ5UG9pbnRGb3JtYXRbXSA9IFsnZXNtNScsICdlc20yMDE1J107XG5cbi8qKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeS1wb2ludCBpbnRvIG5nY2MgKGFOR3VsYXIgQ29tcGF0aWJpbGl0eSBDb21waWxlcikuXG4gKlxuICogWW91IGNhbiBjYWxsIHRoaXMgZnVuY3Rpb24gdG8gcHJvY2VzcyBvbmUgb3IgbW9yZSBucG0gcGFja2FnZXMsIHRvIGVuc3VyZVxuICogdGhhdCB0aGV5IGFyZSBjb21wYXRpYmxlIHdpdGggdGhlIGl2eSBjb21waWxlciAobmd0c2MpLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIFRoZSBvcHRpb25zIHRlbGxpbmcgbmdjYyB3aGF0IHRvIGNvbXBpbGUgYW5kIGhvdy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKFxuICAgIHtiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyID0gU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLFxuICAgICBjb21waWxlQWxsRm9ybWF0cyA9IHRydWUsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID0gZmFsc2UsXG4gICAgIGxvZ2dlciA9IG5ldyBDb25zb2xlTG9nZ2VyKExvZ0xldmVsLmluZm8pLCBwYXRoTWFwcGluZ3N9OiBOZ2NjT3B0aW9ucyk6IHZvaWQge1xuICBjb25zdCBmcyA9IG5ldyBOb2RlSlNGaWxlU3lzdGVtKCk7XG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFRyYW5zZm9ybWVyKGZzLCBsb2dnZXIpO1xuICBjb25zdCBtb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcihmcywgcGF0aE1hcHBpbmdzKTtcbiAgY29uc3QgaG9zdCA9IG5ldyBFc21EZXBlbmRlbmN5SG9zdChmcywgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCByZXNvbHZlciA9IG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIobG9nZ2VyLCBob3N0KTtcbiAgY29uc3QgZmluZGVyID0gbmV3IEVudHJ5UG9pbnRGaW5kZXIoZnMsIGxvZ2dlciwgcmVzb2x2ZXIpO1xuICBjb25zdCBmaWxlV3JpdGVyID0gZ2V0RmlsZVdyaXRlcihmcywgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMpO1xuXG4gIGNvbnN0IGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggPVxuICAgICAgdGFyZ2V0RW50cnlQb2ludFBhdGggPyBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCkgOiB1bmRlZmluZWQ7XG5cbiAgaWYgKGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggJiZcbiAgICAgIGhhc1Byb2Nlc3NlZFRhcmdldEVudHJ5UG9pbnQoXG4gICAgICAgICAgZnMsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyLCBjb21waWxlQWxsRm9ybWF0cykpIHtcbiAgICBsb2dnZXIuaW5mbygnVGhlIHRhcmdldCBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCcpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHtlbnRyeVBvaW50c30gPSBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKFxuICAgICAgQWJzb2x1dGVGc1BhdGguZnJvbShiYXNlUGF0aCksIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHBhdGhNYXBwaW5ncyk7XG5cbiAgaWYgKGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggJiYgZW50cnlQb2ludHMubGVuZ3RoID09PSAwKSB7XG4gICAgbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoZnMsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBlbnRyeVBvaW50cy5mb3JFYWNoKGVudHJ5UG9pbnQgPT4ge1xuICAgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJztcblxuICAgIGNvbnN0IGNvbXBpbGVkRm9ybWF0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgY29uc3QgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCA9XG4gICAgICAgIEFic29sdXRlRnNQYXRoLmZyb21VbmNoZWNrZWQoYCR7ZW50cnlQb2ludC5wYXRofS9wYWNrYWdlLmpzb25gKTtcblxuICAgIGNvbnN0IGhhc1Byb2Nlc3NlZER0cyA9IGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludFBhY2thZ2VKc29uLCAndHlwaW5ncycpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzVG9Db25zaWRlci5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzVG9Db25zaWRlcltpXSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5O1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltwcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KHByb3BlcnR5KTtcblxuICAgICAgLy8gTm8gZm9ybWF0IHRoZW4gdGhpcyBwcm9wZXJ0eSBpcyBub3Qgc3VwcG9zZWQgdG8gYmUgY29tcGlsZWQuXG4gICAgICBpZiAoIWZvcm1hdFBhdGggfHwgIWZvcm1hdCB8fCBTVVBQT1JURURfRk9STUFUUy5pbmRleE9mKGZvcm1hdCkgPT09IC0xKSBjb250aW51ZTtcblxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludFBhY2thZ2VKc29uLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29tcGlsZWRGb3JtYXRzLmFkZChmb3JtYXRQYXRoKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7cHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzRmlyc3RGb3JtYXQgPSBjb21waWxlZEZvcm1hdHMuc2l6ZSA9PT0gMDtcbiAgICAgIGNvbnN0IHByb2Nlc3NEdHMgPSAhaGFzUHJvY2Vzc2VkRHRzICYmIGlzRmlyc3RGb3JtYXQ7XG5cbiAgICAgIC8vIFdlIGRvbid0IGJyZWFrIGlmIHRoaXMgaWYgc3RhdGVtZW50IGZhaWxzIGJlY2F1c2Ugd2Ugc3RpbGwgd2FudCB0byBtYXJrXG4gICAgICAvLyB0aGUgcHJvcGVydHkgYXMgcHJvY2Vzc2VkIGV2ZW4gaWYgaXRzIHVuZGVybHlpbmcgZm9ybWF0IGhhcyBiZWVuIGJ1aWx0IGFscmVhZHkuXG4gICAgICBpZiAoIWNvbXBpbGVkRm9ybWF0cy5oYXMoZm9ybWF0UGF0aCkgJiYgKGNvbXBpbGVBbGxGb3JtYXRzIHx8IGlzRmlyc3RGb3JtYXQpKSB7XG4gICAgICAgIGNvbnN0IGJ1bmRsZSA9IG1ha2VFbnRyeVBvaW50QnVuZGxlKFxuICAgICAgICAgICAgZnMsIGVudHJ5UG9pbnQucGF0aCwgZm9ybWF0UGF0aCwgZW50cnlQb2ludC50eXBpbmdzLCBpc0NvcmUsIHByb3BlcnR5LCBmb3JtYXQsXG4gICAgICAgICAgICBwcm9jZXNzRHRzLCBwYXRoTWFwcGluZ3MpO1xuICAgICAgICBpZiAoYnVuZGxlKSB7XG4gICAgICAgICAgbG9nZ2VyLmluZm8oYENvbXBpbGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSBhcyAke2Zvcm1hdH1gKTtcbiAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lZEZpbGVzID0gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGJ1bmRsZSk7XG4gICAgICAgICAgZmlsZVdyaXRlci53cml0ZUJ1bmRsZShlbnRyeVBvaW50LCBidW5kbGUsIHRyYW5zZm9ybWVkRmlsZXMpO1xuICAgICAgICAgIGNvbXBpbGVkRm9ybWF0cy5hZGQoZm9ybWF0UGF0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgIGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdH0gKG5vIHZhbGlkIGVudHJ5IHBvaW50IGZpbGUgZm9yIHRoaXMgZm9ybWF0KS5gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7cHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgIH1cblxuICAgICAgLy8gRWl0aGVyIHRoaXMgZm9ybWF0IHdhcyBqdXN0IGNvbXBpbGVkIG9yIGl0cyB1bmRlcmx5aW5nIGZvcm1hdCB3YXMgY29tcGlsZWQgYmVjYXVzZSBvZiBhXG4gICAgICAvLyBwcmV2aW91cyBwcm9wZXJ0eS5cbiAgICAgIGlmIChjb21waWxlZEZvcm1hdHMuaGFzKGZvcm1hdFBhdGgpKSB7XG4gICAgICAgIG1hcmtBc1Byb2Nlc3NlZChmcywgZW50cnlQb2ludFBhY2thZ2VKc29uLCBlbnRyeVBvaW50UGFja2FnZUpzb25QYXRoLCBwcm9wZXJ0eSk7XG4gICAgICAgIGlmIChwcm9jZXNzRHRzKSB7XG4gICAgICAgICAgbWFya0FzUHJvY2Vzc2VkKGZzLCBlbnRyeVBvaW50UGFja2FnZUpzb24sIGVudHJ5UG9pbnRQYWNrYWdlSnNvblBhdGgsICd0eXBpbmdzJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZWRGb3JtYXRzLnNpemUgPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRmFpbGVkIHRvIGNvbXBpbGUgYW55IGZvcm1hdHMgZm9yIGVudHJ5LXBvaW50IGF0ICgke2VudHJ5UG9pbnQucGF0aH0pLiBUcmllZCAke3Byb3BlcnRpZXNUb0NvbnNpZGVyfS5gKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKGZzOiBGaWxlU3lzdGVtLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0czogYm9vbGVhbik6IEZpbGVXcml0ZXIge1xuICByZXR1cm4gY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPyBuZXcgTmV3RW50cnlQb2ludEZpbGVXcml0ZXIoZnMpIDogbmV3IEluUGxhY2VGaWxlV3JpdGVyKGZzKTtcbn1cblxuZnVuY3Rpb24gaGFzUHJvY2Vzc2VkVGFyZ2V0RW50cnlQb2ludChcbiAgICBmczogRmlsZVN5c3RlbSwgdGFyZ2V0UGF0aDogQWJzb2x1dGVGc1BhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbikge1xuICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKHRhcmdldFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuXG4gIGZvciAoY29uc3QgcHJvcGVydHkgb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBpZiAocGFja2FnZUpzb25bcHJvcGVydHldKSB7XG4gICAgICAvLyBIZXJlIGlzIGEgcHJvcGVydHkgdGhhdCBzaG91bGQgYmUgcHJvY2Vzc2VkXG4gICAgICBpZiAoaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgcHJvcGVydHkgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSkpIHtcbiAgICAgICAgaWYgKCFjb21waWxlQWxsRm9ybWF0cykge1xuICAgICAgICAgIC8vIEl0IGhhcyBiZWVuIHByb2Nlc3NlZCBhbmQgd2Ugb25seSBuZWVkIG9uZSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEl0IGhhcyBub3QgYmVlbiBwcm9jZXNzZWQgYnV0IHdlIG5lZWQgYWxsIG9mIHRoZW0sIHNvIHdlIGFyZSBkb25lLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIEVpdGhlciBhbGwgZm9ybWF0cyBuZWVkIHRvIGJlIGNvbXBpbGVkIGFuZCB0aGVyZSB3ZXJlIG5vbmUgdGhhdCB3ZXJlIHVucHJvY2Vzc2VkLFxuICAvLyBPciBvbmx5IHRoZSBvbmUgbWF0Y2hpbmcgZm9ybWF0IG5lZWRzIHRvIGJlIGNvbXBpbGVkIGJ1dCB0aGVyZSB3YXMgYXQgbGVhc3Qgb25lIG1hdGNoaW5nXG4gIC8vIHByb3BlcnR5IGJlZm9yZSB0aGUgZmlyc3QgcHJvY2Vzc2VkIGZvcm1hdCB0aGF0IHdhcyB1bnByb2Nlc3NlZC5cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogSWYgd2UgZ2V0IGhlcmUsIHRoZW4gdGhlIHJlcXVlc3RlZCBlbnRyeS1wb2ludCBkaWQgbm90IGNvbnRhaW4gYW55dGhpbmcgY29tcGlsZWQgYnlcbiAqIHRoZSBvbGQgQW5ndWxhciBjb21waWxlci4gVGhlcmVmb3JlIHRoZXJlIGlzIG5vdGhpbmcgZm9yIG5nY2MgdG8gZG8uXG4gKiBTbyBtYXJrIGFsbCBmb3JtYXRzIGluIHRoaXMgZW50cnktcG9pbnQgYXMgcHJvY2Vzc2VkIHNvIHRoYXQgY2xpZW50cyBvZiBuZ2NjIGNhbiBhdm9pZFxuICogdHJpZ2dlcmluZyBuZ2NjIGZvciB0aGlzIGVudHJ5LXBvaW50IGluIHRoZSBmdXR1cmUuXG4gKi9cbmZ1bmN0aW9uIG1hcmtOb25Bbmd1bGFyUGFja2FnZUFzUHJvY2Vzc2VkKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IEFic29sdXRlRnNQYXRoLnJlc29sdmUocGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyLmZvckVhY2goZm9ybWF0UHJvcGVydHkgPT4ge1xuICAgIGlmIChwYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV0pXG4gICAgICBtYXJrQXNQcm9jZXNzZWQoZnMsIHBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGgsIGZvcm1hdFByb3BlcnR5IGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHkpO1xuICB9KTtcbn1cbiJdfQ==