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
        define("@angular/compiler-cli/ngcc/src/main", ["require", "exports", "canonical-path", "fs", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/dependency_host", "@angular/compiler-cli/ngcc/src/packages/dependency_resolver", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/entry_point_finder", "@angular/compiler-cli/ngcc/src/packages/transformer", "@angular/compiler-cli/ngcc/src/writing/in_place_file_writer", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var canonical_path_1 = require("canonical-path");
    var fs_1 = require("fs");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
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
        var basePath = _a.basePath, targetEntryPointPath = _a.targetEntryPointPath, _b = _a.propertiesToConsider, propertiesToConsider = _b === void 0 ? entry_point_1.SUPPORTED_FORMAT_PROPERTIES : _b, _c = _a.compileAllFormats, compileAllFormats = _c === void 0 ? true : _c, _d = _a.createNewEntryPointFormats, createNewEntryPointFormats = _d === void 0 ? false : _d;
        var transformer = new transformer_1.Transformer(basePath);
        var host = new dependency_host_1.DependencyHost();
        var resolver = new dependency_resolver_1.DependencyResolver(host);
        var finder = new entry_point_finder_1.EntryPointFinder(resolver);
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
            for (var i = 0; i < propertiesToConsider.length; i++) {
                var property = propertiesToConsider[i];
                var formatPath = entryPointPackageJson[property];
                var format = entry_point_1.getEntryPointFormat(property);
                // No format then this property is not supposed to be compiled.
                if (!formatPath || !format || SUPPORTED_FORMATS.indexOf(format) === -1)
                    continue;
                if (build_marker_1.hasBeenProcessed(entryPointPackageJson, property)) {
                    compiledFormats.add(formatPath);
                    console.warn("Skipping " + entryPoint.name + " : " + property + " (already compiled).");
                    continue;
                }
                // We don't break if this if statement fails because we still want to mark
                // the property as processed even if its underlying format has been built already.
                if (!compiledFormats.has(formatPath) && (compileAllFormats || compiledFormats.size === 0)) {
                    var bundle = entry_point_bundle_1.makeEntryPointBundle(entryPoint.path, formatPath, entryPoint.typings, isCore, property, format, compiledFormats.size === 0);
                    if (bundle) {
                        console.warn("Compiling " + entryPoint.name + " : " + property + " as " + format);
                        var transformedFiles = transformer.transform(bundle);
                        fileWriter.writeBundle(entryPoint, bundle, transformedFiles);
                        compiledFormats.add(formatPath);
                    }
                    else {
                        console.warn("Skipping " + entryPoint.name + " : " + format + " (no valid entry point file for this format).");
                    }
                }
                else if (!compileAllFormats) {
                    console.warn("Skipping " + entryPoint.name + " : " + property + " (already compiled).");
                }
                // Either this format was just compiled or its underlying format was compiled because of a
                // previous property.
                if (compiledFormats.has(formatPath)) {
                    build_marker_1.markAsProcessed(entryPointPackageJson, entryPointPackageJsonPath, property);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsaURBQXVDO0lBQ3ZDLHlCQUFnQztJQUVoQyw2REFBb0Q7SUFFcEQscUZBQTBFO0lBQzFFLDJGQUEwRDtJQUMxRCxtR0FBa0U7SUFDbEUsbUZBQWtJO0lBQ2xJLGlHQUFtRTtJQUNuRSxpR0FBK0Q7SUFDL0QsbUZBQW1EO0lBRW5ELG9HQUFpRTtJQUNqRSxrSEFBOEU7SUFnQzlFLElBQU0saUJBQWlCLEdBQXVCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBRWxFOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixRQUFRLENBQ3BCLEVBQzJFO1lBRDFFLHNCQUFRLEVBQUUsOENBQW9CLEVBQUUsNEJBQWtELEVBQWxELHFGQUFrRCxFQUNsRix5QkFBd0IsRUFBeEIsNkNBQXdCLEVBQUUsa0NBQWtDLEVBQWxDLHVEQUFrQztRQUMvRCxJQUFNLFdBQVcsR0FBRyxJQUFJLHlCQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUMsSUFBTSxJQUFJLEdBQUcsSUFBSSxnQ0FBYyxFQUFFLENBQUM7UUFDbEMsSUFBTSxRQUFRLEdBQUcsSUFBSSx3Q0FBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFNLE1BQU0sR0FBRyxJQUFJLHFDQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLElBQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRTdELElBQU0sNEJBQTRCLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztZQUN2RCxxQkFBYyxDQUFDLElBQUksQ0FBQyx3QkFBTyxDQUFDLFFBQVEsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5RCxTQUFTLENB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QVUsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQzt3QkFDN0QsZUFBZSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztxQkFDakM7eUJBQU07d0JBQ0wsT0FBTyxDQUFDLElBQUksQ0FDUixjQUFZLFVBQVUsQ0FBQyxJQUFJLFdBQU0sTUFBTSxrREFBK0MsQ0FBQyxDQUFDO3FCQUM3RjtpQkFDRjtxQkFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7b0JBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBWSxVQUFVLENBQUMsSUFBSSxXQUFNLFFBQVEseUJBQXNCLENBQUMsQ0FBQztpQkFDL0U7Z0JBRUQsMEZBQTBGO2dCQUMxRixxQkFBcUI7Z0JBQ3JCLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDbkMsOEJBQWUsQ0FBQyxxQkFBcUIsRUFBRSx5QkFBeUIsRUFBRSxRQUFRLENBQUMsQ0FBQztpQkFDN0U7YUFDRjtZQUVELElBQUksZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUU7Z0JBQzlCLE1BQU0sSUFBSSxLQUFLLENBQ1gsdURBQXFELFVBQVUsQ0FBQyxJQUFJLGlCQUFZLG9CQUFvQixNQUFHLENBQUMsQ0FBQzthQUM5RztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQXJGRCw0QkFxRkM7SUFFRCxTQUFTLGFBQWEsQ0FBQywwQkFBbUM7UUFDeEQsT0FBTywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxxREFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLHdDQUFpQixFQUFFLENBQUM7SUFDOUYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtyZXNvbHZlfSBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQge3JlYWRGaWxlU3luY30gZnJvbSAnZnMnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5cbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZCwgbWFya0FzUHJvY2Vzc2VkfSBmcm9tICcuL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL3BhY2thZ2VzL2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlcn0gZnJvbSAnLi9wYWNrYWdlcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7RW50cnlQb2ludEZvcm1hdCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTLCBnZXRFbnRyeVBvaW50Rm9ybWF0fSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7bWFrZUVudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7RW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9maW5kZXInO1xuaW1wb3J0IHtUcmFuc2Zvcm1lcn0gZnJvbSAnLi9wYWNrYWdlcy90cmFuc2Zvcm1lcic7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4vd3JpdGluZy9maWxlX3dyaXRlcic7XG5pbXBvcnQge0luUGxhY2VGaWxlV3JpdGVyfSBmcm9tICcuL3dyaXRpbmcvaW5fcGxhY2VfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtOZXdFbnRyeVBvaW50RmlsZVdyaXRlcn0gZnJvbSAnLi93cml0aW5nL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5cblxuLyoqXG4gKiBUaGUgb3B0aW9ucyB0byBjb25maWd1cmUgdGhlIG5nY2MgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY09wdGlvbnMge1xuICAvKiogVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0aGF0IGNvbnRhaW5zIHRoZSBwYWNrYWdlcyB0byBwcm9jZXNzLiAqL1xuICBiYXNlUGF0aDogc3RyaW5nO1xuICAvKipcbiAgICogVGhlIHBhdGgsIHJlbGF0aXZlIHRvIGBiYXNlUGF0aGAgdG8gdGhlIHByaW1hcnkgcGFja2FnZSB0byBiZSBwcm9jZXNzZWQuXG4gICAqXG4gICAqIEFsbCBpdHMgZGVwZW5kZW5jaWVzIHdpbGwgbmVlZCB0byBiZSBwcm9jZXNzZWQgdG9vLlxuICAgKi9cbiAgdGFyZ2V0RW50cnlQb2ludFBhdGg/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBXaGljaCBlbnRyeS1wb2ludCBwcm9wZXJ0aWVzIGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY29uc2lkZXIgd2hlbiBwcm9jZXNzaW5nIGFuIGVudHJ5LXBvaW50LlxuICAgKiBFYWNoIHByb3BlcnR5IHNob3VsZCBob2xkIGEgcGF0aCB0byB0aGUgcGFydGljdWxhciBidW5kbGUgZm9ybWF0IGZvciB0aGUgZW50cnktcG9pbnQuXG4gICAqIERlZmF1bHRzIHRvIGFsbCB0aGUgcHJvcGVydGllcyBpbiB0aGUgcGFja2FnZS5qc29uLlxuICAgKi9cbiAgcHJvcGVydGllc1RvQ29uc2lkZXI/OiBzdHJpbmdbXTtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcHJvY2VzcyBhbGwgZm9ybWF0cyBzcGVjaWZpZWQgYnkgKGBwcm9wZXJ0aWVzVG9Db25zaWRlcmApICBvciB0byBzdG9wIHByb2Nlc3NpbmdcbiAgICogdGhpcyBlbnRyeS1wb2ludCBhdCB0aGUgZmlyc3QgbWF0Y2hpbmcgZm9ybWF0LiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqL1xuICBjb21waWxlQWxsRm9ybWF0cz86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNyZWF0ZSBuZXcgZW50cnktcG9pbnRzIGJ1bmRsZXMgcmF0aGVyIHRoYW4gb3ZlcndyaXRpbmcgdGhlIG9yaWdpbmFsIGZpbGVzLlxuICAgKi9cbiAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHM/OiBib29sZWFuO1xufVxuXG5jb25zdCBTVVBQT1JURURfRk9STUFUUzogRW50cnlQb2ludEZvcm1hdFtdID0gWydlc201JywgJ2VzbTIwMTUnXTtcblxuLyoqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5LXBvaW50IGludG8gbmdjYyAoYU5HdWxhciBDb21wYXRpYmlsaXR5IENvbXBpbGVyKS5cbiAqXG4gKiBZb3UgY2FuIGNhbGwgdGhpcyBmdW5jdGlvbiB0byBwcm9jZXNzIG9uZSBvciBtb3JlIG5wbSBwYWNrYWdlcywgdG8gZW5zdXJlXG4gKiB0aGF0IHRoZXkgYXJlIGNvbXBhdGlibGUgd2l0aCB0aGUgaXZ5IGNvbXBpbGVyIChuZ3RzYykuXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgVGhlIG9wdGlvbnMgdGVsbGluZyBuZ2NjIHdoYXQgdG8gY29tcGlsZSBhbmQgaG93LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2MoXG4gICAge2Jhc2VQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aCwgcHJvcGVydGllc1RvQ29uc2lkZXIgPSBTVVBQT1JURURfRk9STUFUX1BST1BFUlRJRVMsXG4gICAgIGNvbXBpbGVBbGxGb3JtYXRzID0gdHJ1ZSwgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPSBmYWxzZX06IE5nY2NPcHRpb25zKTogdm9pZCB7XG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFRyYW5zZm9ybWVyKGJhc2VQYXRoKTtcbiAgY29uc3QgaG9zdCA9IG5ldyBEZXBlbmRlbmN5SG9zdCgpO1xuICBjb25zdCByZXNvbHZlciA9IG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIoaG9zdCk7XG4gIGNvbnN0IGZpbmRlciA9IG5ldyBFbnRyeVBvaW50RmluZGVyKHJlc29sdmVyKTtcbiAgY29uc3QgZmlsZVdyaXRlciA9IGdldEZpbGVXcml0ZXIoY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMpO1xuXG4gIGNvbnN0IGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGggPSB0YXJnZXRFbnRyeVBvaW50UGF0aCA/XG4gICAgICBBYnNvbHV0ZUZzUGF0aC5mcm9tKHJlc29sdmUoYmFzZVBhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoKSkgOlxuICAgICAgdW5kZWZpbmVkO1xuICBjb25zdCB7ZW50cnlQb2ludHN9ID1cbiAgICAgIGZpbmRlci5maW5kRW50cnlQb2ludHMoQWJzb2x1dGVGc1BhdGguZnJvbShiYXNlUGF0aCksIGFic29sdXRlVGFyZ2V0RW50cnlQb2ludFBhdGgpO1xuXG4gIGlmIChhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoICYmIGVudHJ5UG9pbnRzLmV2ZXJ5KGVudHJ5UG9pbnQgPT4ge1xuICAgICAgICByZXR1cm4gZW50cnlQb2ludC5wYXRoICE9PSBhYnNvbHV0ZVRhcmdldEVudHJ5UG9pbnRQYXRoO1xuICAgICAgfSkpIHtcbiAgICAvLyBJZiB3ZSBnZXQgaGVyZSwgdGhlbiB0aGUgcmVxdWVzdGVkIGVudHJ5LXBvaW50IGRpZCBub3QgY29udGFpbiBhbnl0aGluZyBjb21waWxlZCBieVxuICAgIC8vIHRoZSBvbGQgQW5ndWxhciBjb21waWxlci4gVGhlcmVmb3JlIHRoZXJlIGlzIG5vdGhpbmcgZm9yIG5nY2MgdG8gZG8uXG4gICAgLy8gU28gbWFyayBhbGwgZm9ybWF0cyBpbiB0aGlzIGVudHJ5LXBvaW50IGFzIHByb2Nlc3NlZCBzbyB0aGF0IGNsaWVudHMgb2YgbmdjYyBjYW4gYXZvaWRcbiAgICAvLyB0cmlnZ2VyaW5nIG5nY2MgZm9yIHRoaXMgZW50cnktcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPVxuICAgICAgICBBYnNvbHV0ZUZzUGF0aC5mcm9tKHJlc29sdmUoYWJzb2x1dGVUYXJnZXRFbnRyeVBvaW50UGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uUGF0aCwgJ3V0ZjgnKSk7XG4gICAgcHJvcGVydGllc1RvQ29uc2lkZXIuZm9yRWFjaChmb3JtYXRQcm9wZXJ0eSA9PiB7XG4gICAgICBpZiAocGFja2FnZUpzb25bZm9ybWF0UHJvcGVydHldKVxuICAgICAgICBtYXJrQXNQcm9jZXNzZWQocGFja2FnZUpzb24sIHBhY2thZ2VKc29uUGF0aCwgZm9ybWF0UHJvcGVydHkgYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSk7XG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZW50cnlQb2ludHMuZm9yRWFjaChlbnRyeVBvaW50ID0+IHtcbiAgICAvLyBBcmUgd2UgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmU/XG4gICAgY29uc3QgaXNDb3JlID0gZW50cnlQb2ludC5uYW1lID09PSAnQGFuZ3VsYXIvY29yZSc7XG5cbiAgICBjb25zdCBjb21waWxlZEZvcm1hdHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBlbnRyeVBvaW50UGFja2FnZUpzb24gPSBlbnRyeVBvaW50LnBhY2thZ2VKc29uO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRQYWNrYWdlSnNvblBhdGggPSBBYnNvbHV0ZUZzUGF0aC5mcm9tKHJlc29sdmUoZW50cnlQb2ludC5wYXRoLCAncGFja2FnZS5qc29uJykpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzVG9Db25zaWRlci5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgcHJvcGVydHkgPSBwcm9wZXJ0aWVzVG9Db25zaWRlcltpXSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5O1xuICAgICAgY29uc3QgZm9ybWF0UGF0aCA9IGVudHJ5UG9pbnRQYWNrYWdlSnNvbltwcm9wZXJ0eV07XG4gICAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KHByb3BlcnR5KTtcblxuICAgICAgLy8gTm8gZm9ybWF0IHRoZW4gdGhpcyBwcm9wZXJ0eSBpcyBub3Qgc3VwcG9zZWQgdG8gYmUgY29tcGlsZWQuXG4gICAgICBpZiAoIWZvcm1hdFBhdGggfHwgIWZvcm1hdCB8fCBTVVBQT1JURURfRk9STUFUUy5pbmRleE9mKGZvcm1hdCkgPT09IC0xKSBjb250aW51ZTtcblxuICAgICAgaWYgKGhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludFBhY2thZ2VKc29uLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgY29tcGlsZWRGb3JtYXRzLmFkZChmb3JtYXRQYXRoKTtcbiAgICAgICAgY29uc29sZS53YXJuKGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke3Byb3BlcnR5fSAoYWxyZWFkeSBjb21waWxlZCkuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBXZSBkb24ndCBicmVhayBpZiB0aGlzIGlmIHN0YXRlbWVudCBmYWlscyBiZWNhdXNlIHdlIHN0aWxsIHdhbnQgdG8gbWFya1xuICAgICAgLy8gdGhlIHByb3BlcnR5IGFzIHByb2Nlc3NlZCBldmVuIGlmIGl0cyB1bmRlcmx5aW5nIGZvcm1hdCBoYXMgYmVlbiBidWlsdCBhbHJlYWR5LlxuICAgICAgaWYgKCFjb21waWxlZEZvcm1hdHMuaGFzKGZvcm1hdFBhdGgpICYmIChjb21waWxlQWxsRm9ybWF0cyB8fCBjb21waWxlZEZvcm1hdHMuc2l6ZSA9PT0gMCkpIHtcbiAgICAgICAgY29uc3QgYnVuZGxlID0gbWFrZUVudHJ5UG9pbnRCdW5kbGUoXG4gICAgICAgICAgICBlbnRyeVBvaW50LnBhdGgsIGZvcm1hdFBhdGgsIGVudHJ5UG9pbnQudHlwaW5ncywgaXNDb3JlLCBwcm9wZXJ0eSwgZm9ybWF0LFxuICAgICAgICAgICAgY29tcGlsZWRGb3JtYXRzLnNpemUgPT09IDApO1xuICAgICAgICBpZiAoYnVuZGxlKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKGBDb21waWxpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtwcm9wZXJ0eX0gYXMgJHtmb3JtYXR9YCk7XG4gICAgICAgICAgY29uc3QgdHJhbnNmb3JtZWRGaWxlcyA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybShidW5kbGUpO1xuICAgICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoZW50cnlQb2ludCwgYnVuZGxlLCB0cmFuc2Zvcm1lZEZpbGVzKTtcbiAgICAgICAgICBjb21waWxlZEZvcm1hdHMuYWRkKGZvcm1hdFBhdGgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0fSAobm8gdmFsaWQgZW50cnkgcG9pbnQgZmlsZSBmb3IgdGhpcyBmb3JtYXQpLmApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFjb21waWxlQWxsRm9ybWF0cykge1xuICAgICAgICBjb25zb2xlLndhcm4oYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7cHJvcGVydHl9IChhbHJlYWR5IGNvbXBpbGVkKS5gKTtcbiAgICAgIH1cblxuICAgICAgLy8gRWl0aGVyIHRoaXMgZm9ybWF0IHdhcyBqdXN0IGNvbXBpbGVkIG9yIGl0cyB1bmRlcmx5aW5nIGZvcm1hdCB3YXMgY29tcGlsZWQgYmVjYXVzZSBvZiBhXG4gICAgICAvLyBwcmV2aW91cyBwcm9wZXJ0eS5cbiAgICAgIGlmIChjb21waWxlZEZvcm1hdHMuaGFzKGZvcm1hdFBhdGgpKSB7XG4gICAgICAgIG1hcmtBc1Byb2Nlc3NlZChlbnRyeVBvaW50UGFja2FnZUpzb24sIGVudHJ5UG9pbnRQYWNrYWdlSnNvblBhdGgsIHByb3BlcnR5KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZWRGb3JtYXRzLnNpemUgPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRmFpbGVkIHRvIGNvbXBpbGUgYW55IGZvcm1hdHMgZm9yIGVudHJ5LXBvaW50IGF0ICgke2VudHJ5UG9pbnQucGF0aH0pLiBUcmllZCAke3Byb3BlcnRpZXNUb0NvbnNpZGVyfS5gKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlV3JpdGVyKGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzOiBib29sZWFuKTogRmlsZVdyaXRlciB7XG4gIHJldHVybiBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA/IG5ldyBOZXdFbnRyeVBvaW50RmlsZVdyaXRlcigpIDogbmV3IEluUGxhY2VGaWxlV3JpdGVyKCk7XG59XG4iXX0=