/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "canonical-path", "fs", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/dependency_host", "@angular/compiler-cli/ngcc/src/packages/dependency_resolver", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/entry_point_finder", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var canonical_path_1 = require("canonical-path");
    var fs_1 = require("fs");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var dependency_host_1 = require("@angular/compiler-cli/ngcc/src/packages/dependency_host");
    var dependency_resolver_1 = require("@angular/compiler-cli/ngcc/src/packages/dependency_resolver");
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
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _b = _a.propertiesToConsider, propertiesToConsider = _b === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _b, _c = _a.compileAllFormats, compileAllFormats = _c === void 0 ? true : _c, _d = _a.createNewEntryPointFormats, createNewEntryPointFormats = _d === void 0 ? false : _d, _e = _a.logger, logger = _e === void 0 ? new console_logger_1.ConsoleLogger(console_logger_1.LogLevel.info) : _e;
        var transformer = new transformer_1.Transformer(logger, basePath);
        var host = new dependency_host_1.DependencyHost();
        var resolver = new dependency_resolver_1.DependencyResolver(logger, host);
        var finder = new entry_point_finder_1.EntryPointFinder(logger, resolver);
        var fileWriter = getFileWriter(createNewEntryPointFormats);
        var absoluteTargetEntryPointPath = targetEntryPointPath ?
            path_1.AbsoluteFsPath.from(canonical_path_1.resolve(basePath, targetEntryPointPath)) :
            undefined;
        var entryPoints = finder.findEntryPoints(path_1.AbsoluteFsPath.from(basePath), absoluteTargetEntryPointPath).entryPoints;
        if (absoluteTargetEntryPointPath && entryPoints.every(function (entryPoint) {
            return entryPoint.path !== absoluteTargetEntryPointPath;
        })) {
            // If we get here, then the requested entry-point did not contain anything compiled by
            // the old Angular compiler. Therefore there is nothing for ngcc to do.
            // So mark all formats in this entry-point as processed so that clients of ngcc can avoid
            // triggering ngcc for this entry-point in the future.
            var packageJsonPath_1 = path_1.AbsoluteFsPath.from(canonical_path_1.resolve(absoluteTargetEntryPointPath, 'package.json'));
            var packageJson_1 = JSON.parse(fs_1.readFileSync(packageJsonPath_1, 'utf8'));
            propertiesToConsider.forEach(function (formatProperty) {
                if (packageJson_1[formatProperty])
                    build_marker_1.markAsProcessed(packageJson_1, packageJsonPath_1, formatProperty);
            });
            return;
        }
        entryPoints.forEach(function (entryPoint) {
            // Are we compiling the Angular core?
            var isCore = entryPoint.name === '@angular/core';
            var compiledFormats = new Set();
            var entryPointPackageJson = entryPoint.packageJson;
            var entryPointPackageJsonPath = path_1.AbsoluteFsPath.from(canonical_path_1.resolve(entryPoint.path, 'package.json'));
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
                    var bundle = entry_point_bundle_1.makeEntryPointBundle(entryPoint.path, formatPath, entryPoint.typings, isCore, property, format, processDts);
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
                    build_marker_1.markAsProcessed(entryPointPackageJson, entryPointPackageJsonPath, property);
                    if (processDts) {
                        build_marker_1.markAsProcessed(entryPointPackageJson, entryPointPackageJsonPath, 'typings');
                    }
                }
            }
            if (compiledFormats.size === 0) {
                throw new Error("Failed to compile any formats for entry-point at (" + entryPoint.path + "). Tried " + propertiesToConsider + ".");
            }
        });
    }
    exports.mainNgcc = mainNgcc;
    function getFileWriter(createNewEntryPointFormats) {
        return createNewEntryPointFormats ? new new_entry_point_file_writer_1.NewEntryPointFileWriter() : new in_place_file_writer_1.InPlaceFileWriter();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsaURBQXVDO0lBQ3ZDLHlCQUFnQztJQUVoQyw2REFBb0Q7SUFFcEQsd0ZBQWlFO0lBRWpFLHFGQUEwRTtJQUMxRSwyRkFBMEQ7SUFDMUQsbUdBQWtFO0lBQ2xFLG1GQUFrSTtJQUNsSSxpR0FBbUU7SUFDbkUsaUdBQStEO0lBQy9ELG1GQUFtRDtJQUVuRCxvR0FBaUU7SUFDakUsa0hBQThFO0lBcUM5RSxJQUFNLGlCQUFpQixHQUF1QixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUVsRTs7Ozs7OztPQU9HO0lBQ0gsU0FBZ0IsUUFBUSxDQUFDLEVBR3dEO1lBSHZELHNCQUFRLEVBQUUsOENBQW9CLEVBQzlCLDRCQUFrRCxFQUFsRCxxRkFBa0QsRUFDbEQseUJBQXdCLEVBQXhCLDZDQUF3QixFQUFFLGtDQUFrQyxFQUFsQyx1REFBa0MsRUFDNUQsY0FBeUMsRUFBekMsZ0dBQXlDO1FBQ2pFLElBQU0sV0FBVyxHQUFHLElBQUkseUJBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdEQsSUFBTSxJQUFJLEdBQUcsSUFBSSxnQ0FBYyxFQUFFLENBQUM7UUFDbEMsSUFBTSxRQUFRLEdBQUcsSUFBSSx3Q0FBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEQsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQ0FBZ0IsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdEQsSUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFFN0QsSUFBTSw0QkFBNEIsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3ZELHFCQUFjLENBQUMsSUFB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TywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxxREFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLHdDQUFpQixFQUFFLENBQUM7SUFDOUYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtyZXNvbHZlfSBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQge3JlYWRGaWxlU3luY30gZnJvbSAnZnMnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5cbmltcG9ydCB7Q29uc29sZUxvZ2dlciwgTG9nTGV2ZWx9IGZyb20gJy4vbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge2hhc0JlZW5Qcm9jZXNzZWQsIG1hcmtBc1Byb2Nlc3NlZH0gZnJvbSAnLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9wYWNrYWdlcy9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXJ9IGZyb20gJy4vcGFja2FnZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGb3JtYXQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIFNVUFBPUlRFRF9GT1JNQVRfUFJPUEVSVElFUywgZ2V0RW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge21ha2VFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuaW1wb3J0IHtGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuaW1wb3J0IHtJblBsYWNlRmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL2luX3BsYWNlX2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7TmV3RW50cnlQb2ludEZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuXG5cblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY09wdGlvbnMge1xuICAvKiogVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlcyB0byBwcm9jZXNzLiAqL1xuICBiYXNlUGF0aDogc3RyaW5nO1xuICAvKipcbiAgICogVGhlIHBhdGgsIHJlbGF0aXZlIHRvIGBiYXNlUGF0aGAgdG8gdGhlIHByaW1hcnkgcGFja2FnZSB0byBiZSBwcm9jZXNzZWQuXG4gICAqXG4gICAqIEFsbCBpdHMgZGVwZW5kZW5jaWVzIHdpbGwgbmVlZCB0byBiZSBwcm9jZXNzZWQgdG9vLlxuICAgKi9cbiAgdGFyZ2V0RW50cnlQb2ludFBhdGg/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBXaGljaCBlbnRyeS1wb2ludCBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY29uc2lkZXIgd2hlbiBwcm9jZXNzaW5nIGFuIGVudHJ5LXBvaW50LlxuICAgKiBFYWNoIHByb3BlcnR5IHNob3VsZCBob2xkIGEgcGF0aCB0byB0aGUgcGFydGljdWxhciBidW5kbGUgZm9ybWF0IGZvciB0aGUgZW50cnktcG9pbnQuXG4gICAqIERlZmF1bHRzIHRvIGFsbCB0aGUgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uLlxuICAgKi9cbiAgcHJvcGVydGllc1RvQ29uc2lkZXI/OiBzdHJpbmdbXTtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcHJvY2VzcyBhbGwgZm9ybWF0cyBzcGVjaWZpZWQgYnkgKGBwcm9wZXJ0aWVzVG9Db25zaWRlcmApICBvciB0byBzdG9wIHByb2Nlc3NpbmdcbiAgICogdGhpcyBlbnRyeS1wb2ludCBhdCB0aGUgZmlyc3QgbWF0Y2hpbmcgZm9ybWF0LiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqL1xuICBjb21waWxlQWxsRm9ybWF0cz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNyZWF0ZSBuZXcgZW50cnktcG9pbnRzIGJ1bmRsZXMgcmF0aGVyIHRoYW4gb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIGZpbGVzLlxuICAgKi9cbiAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM/OiBib29sZWFuO1xuICAvKipcbiAgICogUHJvdmlkZSBhIGxvZ2dlciB0aGF0IHdpbGwgYmUgY2FsbGVkIHdpdGggbG9nIG1lc3NhZ2VzLlxuICAgKi9cbiAgbG9nZ2VyPzogTG9nZ2VyO1xufVxuXG5jb25zdCBTVVBQT1JURURfRk9STUFUUzogRW50cnlQb2ludEZvcm1hdFtdID0gWydlc201JywgJ2VzbTIwMTUnXTtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGludG8gbmdjYyAoYU5HdWxhciBDb21wYXRpYmlsaXR5IENvbXBpbGVyKS5cbiAqXG4gKiBZb3UgY2FuIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBwcm9jZXNzIG9uZSBvciBtb3JlIG5wbSBwYWNrYWdlcywgdG8gZW5zdXJlXG4gKiB0aGF0IHRoZXkgYXJlIGNvbXBhdGlibGUgd2l0aCB0aGUgaXZ5IGNvbXBpbGVyIChuZ3RzYykuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgVGhlIG9wdGlvbnMgdGVsbGluZyBuZ2NjIHdoYXQgdG8gY29tcGlsZSBhbmQgaG93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2Moe2Jhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc1RvQ29uc2lkZXIgPSBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBpbGVBbGxGb3JtYXRzID0gdHJ1ZSwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyID0gbmV3IENvbnNvbGVMb2dnZXIoTG9nTGV2ZWwuaW5mbyl9OiBOZ2NjT3B0aW9ucyk6IHZvaWQge1xuICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihsb2dnZXIsIGJhc2VQYXRoKTtcbiAgY29uc3QgaG9zdCA9IG5ldyBEZXBlbmRlbmN5SG9zdCgpO1xuICBjb25zdCByZXNvbHZlciA9IG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIobG9nZ2VyLCBob3N0KTtcbiAgY29uc3QgZmluZGVyID0gbmV3IEVudHJ5UG9pbnRGaW5kZXIobG9nZ2VyLCByZXNvbHZlcik7XG4gIGNvbnN0IGZpbGVXcml0ZXIgPSBnZXRGaWxlV3JpdGVyKGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzKTtcblxuICBjb25zdCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoID0gdGFyZ2V0RW50cnlQb2ludFBhdGggP1xuICAgICAgQWJzb2x1dGVGc1BhdGguZnJvbShyZXNvbHZlKGJhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCkpIDpcbiAgICAgIHVuZGVmaW5lZDtcbiAgY29uc3Qge2VudHJ5UG9pbnRzfSA9XG4gICAgICBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKEFic29sdXRlRnNQYXRoLmZyb20oYmFzZVBhdGgpLCBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoKTtcblxuICBpZiAoYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCAmJiBlbnRyeVBvaW50cy5ldmVyeShlbnRyeVBvaW50ID0+IHtcbiAgICAgICAgcmV0dXJuIGVudHJ5UG9pbnQucGF0aCAhPT0gYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aDtcbiAgICAgIH0pKSB7XG4gICAgLy8gSWYgd2UgZ2V0IGhlcmUsIHRoZW4gdGhlIHJlcXVlc3RlZCBlbnRyeS1wb2ludCBkaWQgbm90IGNvbnRhaW4gYW55dGhpbmcgY29tcGlsZWQgYnlcbiAgICAvLyB0aGUgb2xkIEFuZ3VsYXIgY29tcGlsZXIuIFRoZXJlZm9yZSB0aGVyZSBpcyBub3RoaW5nIGZvciBuZ2NjIHRvIGRvLlxuICAgIC8vIFNvIG1hcmsgYWxsIGZvcm1hdHMgaW4gdGhpcyBlbnRyeS1wb2ludCBhcyBwcm9jZXNzZWQgc28gdGhhdCBjbGllbnRzIG9mIG5nY2MgY2FuIGF2b2lkXG4gICAgLy8gdHJpZ2dlcmluZyBuZ2NjIGZvciB0aGlzIGVudHJ5LXBvaW50IGluIHRoZSBmdXR1cmUuXG4gICAgY29uc3QgcGFja2FnZUpzb25QYXRoID1cbiAgICAgICAgQWJzb2x1dGVGc1BhdGguZnJvbShyZXNvbHZlKGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgsICdwYWNrYWdlLmpzb24nKSk7XG4gICAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYWNrYWdlSnNvblBhdGgsICd1dGY4JykpO1xuICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyLmZvckVhY2goZm9ybWF0UHJvcGVydHkgPT4ge1xuICAgICAgaWYgKHBhY2thZ2VKc29uW2Zvcm1hdFByb3BlcnR5XSlcbiAgICAgICAgbWFya0FzUHJvY2Vzc2VkKHBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGgsIGZvcm1hdFByb3BlcnR5IGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHkpO1xuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGVudHJ5UG9pbnRzLmZvckVhY2goZW50cnlQb2ludCA9PiB7XG4gICAgLy8gQXJlIHdlIGNvbXBpbGluZyB0aGUgQW5ndWxhciBjb3JlP1xuICAgIGNvbnN0IGlzQ29yZSA9IGVudHJ5UG9pbnQubmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xuXG4gICAgY29uc3QgY29tcGlsZWRGb3JtYXRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgZW50cnlQb2ludFBhY2thZ2VKc29uID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbjtcbiAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb25QYXRoID0gQWJzb2x1dGVGc1BhdGguZnJvbShyZXNvbHZlKGVudHJ5UG9pbnQucGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcblxuICAgIGNvbnN0IGhhc1Byb2Nlc3NlZER0cyA9IGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludFBhY2thZ2VKc29uLCAndHlwaW5ncycpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzVG9Db25zaWRlci5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzVG9Db25zaWRlcltpXSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5O1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltwcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KHByb3BlcnR5KTtcblxuICAgICAgLy8gTm8gZm9ybWF0IHRoZW4gdGhpcyBwcm9wZXJ0eSBpcyBub3Qgc3VwcG9zZWQgdG8gYmUgY29tcGlsZWQuXG4gICAgICBpZiAoIWZvcm1hdFBhdGggfHwgIWZvcm1hdCB8fCBTVVBQT1JURURfRk9STUFUUy5pbmRleE9mKGZvcm1hdCkgPT09IC0xKSBjb250aW51ZTtcblxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludFBhY2thZ2VKc29uLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29tcGlsZWRGb3JtYXRzLmFkZChmb3JtYXRQYXRoKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7cHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzRmlyc3RGb3JtYXQgPSBjb21waWxlZEZvcm1hdHMuc2l6ZSA9PT0gMDtcbiAgICAgIGNvbnN0IHByb2Nlc3NEdHMgPSAhaGFzUHJvY2Vzc2VkRHRzICYmIGlzRmlyc3RGb3JtYXQ7XG5cbiAgICAgIC8vIFdlIGRvbid0IGJyZWFrIGlmIHRoaXMgaWYgc3RhdGVtZW50IGZhaWxzIGJlY2F1c2Ugd2Ugc3RpbGwgd2FudCB0byBtYXJrXG4gICAgICAvLyB0aGUgcHJvcGVydHkgYXMgcHJvY2Vzc2VkIGV2ZW4gaWYgaXRzIHVuZGVybHlpbmcgZm9ybWF0IGhhcyBiZWVuIGJ1aWx0IGFscmVhZHkuXG4gICAgICBpZiAoIWNvbXBpbGVkRm9ybWF0cy5oYXMoZm9ybWF0UGF0aCkgJiYgKGNvbXBpbGVBbGxGb3JtYXRzIHx8IGlzRmlyc3RGb3JtYXQpKSB7XG4gICAgICAgIGNvbnN0IGJ1bmRsZSA9IG1ha2VFbnRyeVBvaW50QnVuZGxlKFxuICAgICAgICAgICAgZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoLCBlbnRyeVBvaW50LnR5cGluZ3MsIGlzQ29yZSwgcHJvcGVydHksIGZvcm1hdCwgcHJvY2Vzc0R0cyk7XG4gICAgICAgIGlmIChidW5kbGUpIHtcbiAgICAgICAgICBsb2dnZXIuaW5mbyhgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7cHJvcGVydHl9IGFzICR7Zm9ybWF0fWApO1xuICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVkRmlsZXMgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oYnVuZGxlKTtcbiAgICAgICAgICBmaWxlV3JpdGVyLndyaXRlQnVuZGxlKGVudHJ5UG9pbnQsIGJ1bmRsZSwgdHJhbnNmb3JtZWRGaWxlcyk7XG4gICAgICAgICAgY29tcGlsZWRGb3JtYXRzLmFkZChmb3JtYXRQYXRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICAgICAgYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0fSAobm8gdmFsaWQgZW50cnkgcG9pbnQgZmlsZSBmb3IgdGhpcyBmb3JtYXQpLmApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFjb21waWxlQWxsRm9ybWF0cykge1xuICAgICAgICBsb2dnZXIuaW5mbyhgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtwcm9wZXJ0eX0gKGFscmVhZHkgY29tcGlsZWQpLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBFaXRoZXIgdGhpcyBmb3JtYXQgd2FzIGp1c3QgY29tcGlsZWQgb3IgaXRzIHVuZGVybHlpbmcgZm9ybWF0IHdhcyBjb21waWxlZCBiZWNhdXNlIG9mIGFcbiAgICAgIC8vIHByZXZpb3VzIHByb3BlcnR5LlxuICAgICAgaWYgKGNvbXBpbGVkRm9ybWF0cy5oYXMoZm9ybWF0UGF0aCkpIHtcbiAgICAgICAgbWFya0FzUHJvY2Vzc2VkKGVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgZW50cnlQb2ludFBhY2thZ2VKc29uUGF0aCwgcHJvcGVydHkpO1xuICAgICAgICBpZiAocHJvY2Vzc0R0cykge1xuICAgICAgICAgIG1hcmtBc1Byb2Nlc3NlZChlbnRyeVBvaW50UGFja2FnZUpzb24sIGVudHJ5UG9pbnRQYWNrYWdlSnNvblBhdGgsICd0eXBpbmdzJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZWRGb3JtYXRzLnNpemUgPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRmFpbGVkIHRvIGNvbXBpbGUgYW55IGZvcm1hdHMgZm9yIGVudHJ5LXBvaW50IGF0ICgke2VudHJ5UG9pbnQucGF0aH0pLiBUcmllZCAke3Byb3BlcnRpZXNUb0NvbnNpZGVyfS5gKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzOiBib29sZWFuKTogRmlsZVdyaXRlciB7XG4gIHJldHVybiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/IG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcigpIDogbmV3IEluUGxhY2VGaWxlV3JpdGVyKCk7XG59XG4iXX0=