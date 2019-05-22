(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", "@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host", "@angular/compiler-cli/ngcc/src/dependencies/module_resolver", "@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host", "@angular/compiler-cli/ngcc/src/file_system/node_js_file_system", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/entry_point_finder", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
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
    var commonjs_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/commonjs_dependency_host");
    var dependency_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver");
    var esm_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/esm_dependency_host");
    var module_resolver_1 = require("@angular/compiler-cli/ngcc/src/dependencies/module_resolver");
    var umd_dependency_host_1 = require("@angular/compiler-cli/ngcc/src/dependencies/umd_dependency_host");
    var node_js_file_system_1 = require("@angular/compiler-cli/ngcc/src/file_system/node_js_file_system");
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
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _b = _a.propertiesToConsider, propertiesToConsider = _b === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _b, _c = _a.compileAllFormats, compileAllFormats = _c === void 0 ? true : _c, _d = _a.createNewEntryPointFormats, createNewEntryPointFormats = _d === void 0 ? false : _d, _e = _a.logger, logger = _e === void 0 ? new console_logger_1.ConsoleLogger(console_logger_1.LogLevel.info) : _e, pathMappings = _a.pathMappings;
        var fs = new node_js_file_system_1.NodeJSFileSystem();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDZEQUFvRDtJQUVwRCxpSEFBK0U7SUFDL0UsdUdBQXNFO0lBQ3RFLHVHQUFxRTtJQUNyRSwrRkFBOEQ7SUFDOUQsdUdBQXFFO0lBRXJFLHNHQUFtRTtJQUNuRSx3RkFBaUU7SUFFakUscUZBQTBFO0lBQzFFLG1GQUFrSTtJQUNsSSxpR0FBbUU7SUFDbkUsaUdBQStEO0lBQy9ELG1GQUFtRDtJQUduRCxvR0FBaUU7SUFDakUsa0hBQThFO0lBeUM5RSxJQUFNLGlCQUFpQixHQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRXJGOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixRQUFRLENBQ3BCLEVBRXNFO1lBRnJFLHNCQUFRLEVBQUUsOENBQW9CLEVBQUUsNEJBQWtELEVBQWxELHFGQUFrRCxFQUNsRix5QkFBd0IsRUFBeEIsNkNBQXdCLEVBQUUsa0NBQWtDLEVBQWxDLHVEQUFrQyxFQUM1RCxjQUF5QyxFQUF6QyxnR0FBeUMsRUFBRSw4QkFBWTtRQUMxRCxJQUFNLEVBQUUsR0FBRyxJQUFJLHNDQUFnQixFQUFFLENBQUM7UUFDbEMsSUFBTSxXQUFXLEdBQUcsSUFBSSx5QkFBVyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNoRCxJQUFNLGNBQWMsR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzVELElBQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDcEUsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLHVDQUFpQixDQUFDLEVBQUUsRUFB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NEZBQUU7Z0JBQXhDLElBQU0sUUFBUSxpQ0FBQTtnQkFDakIsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ3pCLDhDQUE4QztvQkFDOUMsSUFBSSwrQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsUUFBa0MsQ0FBQyxFQUFFO3dCQUNyRSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7NEJBQ3RCLDhEQUE4RDs0QkFDOUQsT0FBTyxJQUFJLENBQUM7eUJBQ2I7cUJBQ0Y7eUJBQU07d0JBQ0wscUVBQXFFO3dCQUNyRSxPQUFPLEtBQUssQ0FBQztxQkFDZDtpQkFDRjthQUNGOzs7Ozs7Ozs7UUFDRCxvRkFBb0Y7UUFDcEYsMkZBQTJGO1FBQzNGLG1FQUFtRTtRQUNuRSxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQVMsZ0NBQWdDLENBQ3JDLEVBQWMsRUFBRSxJQUFvQixFQUFFLG9CQUE4QjtRQUN0RSxJQUFNLGVBQWUsR0FBRyxxQkFBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDckUsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDN0Qsb0JBQW9CLENBQUMsT0FBTyxDQUFDLFVBQUEsY0FBYztZQUN6QyxJQUFJLFdBQVcsQ0FBQyxjQUFjLENBQUM7Z0JBQzdCLDhCQUFlLENBQUMsRUFBRSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsY0FBd0MsQ0FBQyxDQUFDO1FBQ2hHLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL3NyYy9uZ3RzYy9wYXRoJztcblxuaW1wb3J0IHtDb21tb25Kc0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL2RlcGVuZGVuY2llcy9jb21tb25qc19kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtFc21EZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvZXNtX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXInO1xuaW1wb3J0IHtVbWREZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMvdW1kX2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4vZmlsZV9zeXN0ZW0vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOb2RlSlNGaWxlU3lzdGVtfSBmcm9tICcuL2ZpbGVfc3lzdGVtL25vZGVfanNfZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZCwgbWFya0FzUHJvY2Vzc2VkfSBmcm9tICcuL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGb3JtYXQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUywgZ2V0RW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge21ha2VFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuXG4vKipcbiAqIFRoZSBvcHRpb25zIHRvIGNvbmZpZ3VyZSB0aGUgbmdjYyBjb21waWxlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjT3B0aW9ucyB7XG4gIC8qKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgY29udGFpbnMgdGhlIHBhY2thZ2VzIHRvIHByb2Nlc3MuICovXG4gIGJhc2VQYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgcGF0aCB0byB0aGUgcHJpbWFyeSBwYWNrYWdlIHRvIGJlIHByb2Nlc3NlZC4gSWYgbm90IGFic29sdXRlIHRoZW4gaXQgbXVzdCBiZSByZWxhdGl2ZSB0b1xuICAgKiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBBbGwgaXRzIGRlcGVuZGVuY2llcyB3aWxsIG5lZWQgdG8gYmUgcHJvY2Vzc2VkIHRvby5cbiAgICovXG4gIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogc3RyaW5nO1xuICAvKipcbiAgICogV2hpY2ggZW50cnktcG9pbnQgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uIHRvIGNvbnNpZGVyIHdoZW4gcHJvY2Vzc2luZyBhbiBlbnRyeS1wb2ludC5cbiAgICogRWFjaCBwcm9wZXJ0eSBzaG91bGQgaG9sZCBhIHBhdGggdG8gdGhlIHBhcnRpY3VsYXIgYnVuZGxlIGZvcm1hdCBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICAgKiBEZWZhdWx0cyB0byBhbGwgdGhlIHByb3BlcnRpZXMgaW4gdGhlIHBhY2thZ2UuanNvbi5cbiAgICovXG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyPzogc3RyaW5nW107XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHByb2Nlc3MgYWxsIGZvcm1hdHMgc3BlY2lmaWVkIGJ5IChgcHJvcGVydGllc1RvQ29uc2lkZXJgKSAgb3IgdG8gc3RvcCBwcm9jZXNzaW5nXG4gICAqIHRoaXMgZW50cnktcG9pbnQgYXQgdGhlIGZpcnN0IG1hdGNoaW5nIGZvcm1hdC4gRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgY29tcGlsZUFsbEZvcm1hdHM/OiBib29sZWFuO1xuICAvKipcbiAgICogV2hldGhlciB0byBjcmVhdGUgbmV3IGVudHJ5LXBvaW50cyBidW5kbGVzIHJhdGhlciB0aGFuIG92ZXJ3cml0aW5nIHRoZSBvcmlnaW5hbCBmaWxlcy5cbiAgICovXG4gIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFByb3ZpZGUgYSBsb2dnZXIgdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIGxvZyBtZXNzYWdlcy5cbiAgICovXG4gIGxvZ2dlcj86IExvZ2dlcjtcbiAgLyoqXG4gICAqIFBhdGhzIG1hcHBpbmcgY29uZmlndXJhdGlvbiAoYHBhdGhzYCBhbmQgYGJhc2VVcmxgKSwgYXMgZm91bmQgaW4gYHRzLkNvbXBpbGVyT3B0aW9uc2AuXG4gICAqIFRoZXNlIGFyZSB1c2VkIHRvIHJlc29sdmUgcGF0aHMgdG8gbG9jYWxseSBidWlsdCBBbmd1bGFyIGxpYnJhcmllcy5cbiAgICovXG4gIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncztcbn1cblxuY29uc3QgU1VQUE9SVEVEX0ZPUk1BVFM6IEVudHJ5UG9pbnRGb3JtYXRbXSA9IFsnZXNtNScsICdlc20yMDE1JywgJ3VtZCcsICdjb21tb25qcyddO1xuXG4vKipcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnktcG9pbnQgaW50byBuZ2NjIChhTkd1bGFyIENvbXBhdGliaWxpdHkgQ29tcGlsZXIpLlxuICpcbiAqIFlvdSBjYW4gY2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHByb2Nlc3Mgb25lIG9yIG1vcmUgbnBtIHBhY2thZ2VzLCB0byBlbnN1cmVcbiAqIHRoYXQgdGhleSBhcmUgY29tcGF0aWJsZSB3aXRoIHRoZSBpdnkgY29tcGlsZXIgKG5ndHNjKS5cbiAqXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgb3B0aW9ucyB0ZWxsaW5nIG5nY2Mgd2hhdCB0byBjb21waWxlIGFuZCBob3cuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhcbiAgICB7YmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciA9IFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUyxcbiAgICAgY29tcGlsZUFsbEZvcm1hdHMgPSB0cnVlLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IGZhbHNlLFxuICAgICBsb2dnZXIgPSBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbC5pbmZvKSwgcGF0aE1hcHBpbmdzfTogTmdjY09wdGlvbnMpOiB2b2lkIHtcbiAgY29uc3QgZnMgPSBuZXcgTm9kZUpTRmlsZVN5c3RlbSgpO1xuICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmcywgbG9nZ2VyKTtcbiAgY29uc3QgbW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIoZnMsIHBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0IGVzbURlcGVuZGVuY3lIb3N0ID0gbmV3IEVzbURlcGVuZGVuY3lIb3N0KGZzLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IHVtZERlcGVuZGVuY3lIb3N0ID0gbmV3IFVtZERlcGVuZGVuY3lIb3N0KGZzLCBtb2R1bGVSZXNvbHZlcik7XG4gIGNvbnN0IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3QgPSBuZXcgQ29tbW9uSnNEZXBlbmRlbmN5SG9zdChmcywgbW9kdWxlUmVzb2x2ZXIpO1xuICBjb25zdCByZXNvbHZlciA9IG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIoZnMsIGxvZ2dlciwge1xuICAgIGVzbTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgIGVzbTIwMTU6IGVzbURlcGVuZGVuY3lIb3N0LFxuICAgIHVtZDogdW1kRGVwZW5kZW5jeUhvc3QsXG4gICAgY29tbW9uanM6IGNvbW1vbkpzRGVwZW5kZW5jeUhvc3RcbiAgfSk7XG4gIGNvbnN0IGZpbmRlciA9IG5ldyBFbnRyeVBvaW50RmluZGVyKGZzLCBsb2dnZXIsIHJlc29sdmVyKTtcbiAgY29uc3QgZmlsZVdyaXRlciA9IGdldEZpbGVXcml0ZXIoZnMsIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcblxuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID1cbiAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoID8gQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShiYXNlUGF0aCwgdGFyZ2V0RW50cnlQb2ludFBhdGgpIDogdW5kZWZpbmVkO1xuXG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICYmXG4gICAgICBoYXNQcm9jZXNzZWRUYXJnZXRFbnRyeVBvaW50KFxuICAgICAgICAgIGZzLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwcm9wZXJ0aWVzVG9Db25zaWRlciwgY29tcGlsZUFsbEZvcm1hdHMpKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qge2VudHJ5UG9pbnRzLCBpbnZhbGlkRW50cnlQb2ludHN9ID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cyhcbiAgICAgIEFic29sdXRlRnNQYXRoLmZyb20oYmFzZVBhdGgpLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoLCBwYXRoTWFwcGluZ3MpO1xuXG4gIGludmFsaWRFbnRyeVBvaW50cy5mb3JFYWNoKGludmFsaWRFbnRyeVBvaW50ID0+IHtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgIGBJbnZhbGlkIGVudHJ5LXBvaW50ICR7aW52YWxpZEVudHJ5UG9pbnQuZW50cnlQb2ludC5wYXRofS5gLFxuICAgICAgICBgSXQgaXMgbWlzc2luZyByZXF1aXJlZCBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgICAgICBpbnZhbGlkRW50cnlQb2ludC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfWApLmpvaW4oJ1xcbicpKTtcbiAgfSk7XG5cbiAgaWYgKGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggJiYgZW50cnlQb2ludHMubGVuZ3RoID09PSAwKSB7XG4gICAgbWFya05vbkFuZ3VsYXJQYWNrYWdlQXNQcm9jZXNzZWQoZnMsIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBlbnRyeVBvaW50cy5mb3JFYWNoKGVudHJ5UG9pbnQgPT4ge1xuICAgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJztcblxuICAgIGNvbnN0IGNvbXBpbGVkRm9ybWF0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgY29uc3QgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCA9XG4gICAgICAgIEFic29sdXRlRnNQYXRoLmZyb21VbmNoZWNrZWQoYCR7ZW50cnlQb2ludC5wYXRofS9wYWNrYWdlLmpzb25gKTtcblxuICAgIGNvbnN0IGhhc1Byb2Nlc3NlZER0cyA9IGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludFBhY2thZ2VKc29uLCAndHlwaW5ncycpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzVG9Db25zaWRlci5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzVG9Db25zaWRlcltpXSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5O1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltwcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KGZzLCBlbnRyeVBvaW50LCBwcm9wZXJ0eSk7XG5cbiAgICAgIC8vIE5vIGZvcm1hdCB0aGVuIHRoaXMgcHJvcGVydHkgaXMgbm90IHN1cHBvc2VkIHRvIGJlIGNvbXBpbGVkLlxuICAgICAgaWYgKCFmb3JtYXRQYXRoIHx8ICFmb3JtYXQgfHwgU1VQUE9SVEVEX0ZPUk1BVFMuaW5kZXhPZihmb3JtYXQpID09PSAtMSkgY29udGludWU7XG5cbiAgICAgIGlmIChoYXNCZWVuUHJvY2Vzc2VkKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgcHJvcGVydHkpKSB7XG4gICAgICAgIGNvbXBpbGVkRm9ybWF0cy5hZGQoZm9ybWF0UGF0aCk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtwcm9wZXJ0eX0gKGFscmVhZHkgY29tcGlsZWQpLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNGaXJzdEZvcm1hdCA9IGNvbXBpbGVkRm9ybWF0cy5zaXplID09PSAwO1xuICAgICAgY29uc3QgcHJvY2Vzc0R0cyA9ICFoYXNQcm9jZXNzZWREdHMgJiYgaXNGaXJzdEZvcm1hdDtcblxuICAgICAgLy8gV2UgZG9uJ3QgYnJlYWsgaWYgdGhpcyBpZiBzdGF0ZW1lbnQgZmFpbHMgYmVjYXVzZSB3ZSBzdGlsbCB3YW50IHRvIG1hcmtcbiAgICAgIC8vIHRoZSBwcm9wZXJ0eSBhcyBwcm9jZXNzZWQgZXZlbiBpZiBpdHMgdW5kZXJseWluZyBmb3JtYXQgaGFzIGJlZW4gYnVpbHQgYWxyZWFkeS5cbiAgICAgIGlmICghY29tcGlsZWRGb3JtYXRzLmhhcyhmb3JtYXRQYXRoKSAmJiAoY29tcGlsZUFsbEZvcm1hdHMgfHwgaXNGaXJzdEZvcm1hdCkpIHtcbiAgICAgICAgY29uc3QgYnVuZGxlID0gbWFrZUVudHJ5UG9pbnRCdW5kbGUoXG4gICAgICAgICAgICBmcywgZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoLCBlbnRyeVBvaW50LnR5cGluZ3MsIGlzQ29yZSwgcHJvcGVydHksIGZvcm1hdCxcbiAgICAgICAgICAgIHByb2Nlc3NEdHMsIHBhdGhNYXBwaW5ncyk7XG4gICAgICAgIGlmIChidW5kbGUpIHtcbiAgICAgICAgICBsb2dnZXIuaW5mbyhgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7cHJvcGVydHl9IGFzICR7Zm9ybWF0fWApO1xuICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVkRmlsZXMgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oYnVuZGxlKTtcbiAgICAgICAgICBmaWxlV3JpdGVyLndyaXRlQnVuZGxlKGVudHJ5UG9pbnQsIGJ1bmRsZSwgdHJhbnNmb3JtZWRGaWxlcyk7XG4gICAgICAgICAgY29tcGlsZWRGb3JtYXRzLmFkZChmb3JtYXRQYXRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICAgICAgYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0fSAobm8gdmFsaWQgZW50cnkgcG9pbnQgZmlsZSBmb3IgdGhpcyBmb3JtYXQpLmApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFjb21waWxlQWxsRm9ybWF0cykge1xuICAgICAgICBsb2dnZXIuZGVidWcoYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7cHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgIH1cblxuICAgICAgLy8gRWl0aGVyIHRoaXMgZm9ybWF0IHdhcyBqdXN0IGNvbXBpbGVkIG9yIGl0cyB1bmRlcmx5aW5nIGZvcm1hdCB3YXMgY29tcGlsZWQgYmVjYXVzZSBvZiBhXG4gICAgICAvLyBwcmV2aW91cyBwcm9wZXJ0eS5cbiAgICAgIGlmIChjb21waWxlZEZvcm1hdHMuaGFzKGZvcm1hdFBhdGgpKSB7XG4gICAgICAgIG1hcmtBc1Byb2Nlc3NlZChmcywgZW50cnlQb2ludFBhY2thZ2VKc29uLCBlbnRyeVBvaW50UGFja2FnZUpzb25QYXRoLCBwcm9wZXJ0eSk7XG4gICAgICAgIGlmIChwcm9jZXNzRHRzKSB7XG4gICAgICAgICAgbWFya0FzUHJvY2Vzc2VkKGZzLCBlbnRyeVBvaW50UGFja2FnZUpzb24sIGVudHJ5UG9pbnRQYWNrYWdlSnNvblBhdGgsICd0eXBpbmdzJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZWRGb3JtYXRzLnNpemUgPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRmFpbGVkIHRvIGNvbXBpbGUgYW55IGZvcm1hdHMgZm9yIGVudHJ5LXBvaW50IGF0ICgke2VudHJ5UG9pbnQucGF0aH0pLiBUcmllZCAke3Byb3BlcnRpZXNUb0NvbnNpZGVyfS5gKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKGZzOiBGaWxlU3lzdGVtLCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0czogYm9vbGVhbik6IEZpbGVXcml0ZXIge1xuICByZXR1cm4gY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPyBuZXcgTmV3RW50cnlQb2ludEZpbGVXcml0ZXIoZnMpIDogbmV3IEluUGxhY2VGaWxlV3JpdGVyKGZzKTtcbn1cblxuZnVuY3Rpb24gaGFzUHJvY2Vzc2VkVGFyZ2V0RW50cnlQb2ludChcbiAgICBmczogRmlsZVN5c3RlbSwgdGFyZ2V0UGF0aDogQWJzb2x1dGVGc1BhdGgsIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSxcbiAgICBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbikge1xuICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKHRhcmdldFBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlKHBhY2thZ2VKc29uUGF0aCkpO1xuXG4gIGZvciAoY29uc3QgcHJvcGVydHkgb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICBpZiAocGFja2FnZUpzb25bcHJvcGVydHldKSB7XG4gICAgICAvLyBIZXJlIGlzIGEgcHJvcGVydHkgdGhhdCBzaG91bGQgYmUgcHJvY2Vzc2VkXG4gICAgICBpZiAoaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbiwgcHJvcGVydHkgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSkpIHtcbiAgICAgICAgaWYgKCFjb21waWxlQWxsRm9ybWF0cykge1xuICAgICAgICAgIC8vIEl0IGhhcyBiZWVuIHByb2Nlc3NlZCBhbmQgd2Ugb25seSBuZWVkIG9uZSwgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEl0IGhhcyBub3QgYmVlbiBwcm9jZXNzZWQgYnV0IHdlIG5lZWQgYWxsIG9mIHRoZW0sIHNvIHdlIGFyZSBkb25lLlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIEVpdGhlciBhbGwgZm9ybWF0cyBuZWVkIHRvIGJlIGNvbXBpbGVkIGFuZCB0aGVyZSB3ZXJlIG5vbmUgdGhhdCB3ZXJlIHVucHJvY2Vzc2VkLFxuICAvLyBPciBvbmx5IHRoZSBvbmUgbWF0Y2hpbmcgZm9ybWF0IG5lZWRzIHRvIGJlIGNvbXBpbGVkIGJ1dCB0aGVyZSB3YXMgYXQgbGVhc3Qgb25lIG1hdGNoaW5nXG4gIC8vIHByb3BlcnR5IGJlZm9yZSB0aGUgZmlyc3QgcHJvY2Vzc2VkIGZvcm1hdCB0aGF0IHdhcyB1bnByb2Nlc3NlZC5cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogSWYgd2UgZ2V0IGhlcmUsIHRoZW4gdGhlIHJlcXVlc3RlZCBlbnRyeS1wb2ludCBkaWQgbm90IGNvbnRhaW4gYW55dGhpbmcgY29tcGlsZWQgYnlcbiAqIHRoZSBvbGQgQW5ndWxhciBjb21waWxlci4gVGhlcmVmb3JlIHRoZXJlIGlzIG5vdGhpbmcgZm9yIG5nY2MgdG8gZG8uXG4gKiBTbyBtYXJrIGFsbCBmb3JtYXRzIGluIHRoaXMgZW50cnktcG9pbnQgYXMgcHJvY2Vzc2VkIHNvIHRoYXQgY2xpZW50cyBvZiBuZ2NjIGNhbiBhdm9pZFxuICogdHJpZ2dlcmluZyBuZ2NjIGZvciB0aGlzIGVudHJ5LXBvaW50IGluIHRoZSBmdXR1cmUuXG4gKi9cbmZ1bmN0aW9uIG1hcmtOb25Bbmd1bGFyUGFja2FnZUFzUHJvY2Vzc2VkKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IEFic29sdXRlRnNQYXRoLnJlc29sdmUocGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGUocGFja2FnZUpzb25QYXRoKSk7XG4gIHByb3BlcnRpZXNUb0NvbnNpZGVyLmZvckVhY2goZm9ybWF0UHJvcGVydHkgPT4ge1xuICAgIGlmIChwYWNrYWdlSnNvbltmb3JtYXRQcm9wZXJ0eV0pXG4gICAgICBtYXJrQXNQcm9jZXNzZWQoZnMsIHBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGgsIGZvcm1hdFByb3BlcnR5IGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHkpO1xuICB9KTtcbn1cbiJdfQ==