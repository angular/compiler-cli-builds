(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/create_compile_function", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getCreateCompileFn = void 0;
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var entry_point_bundle_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle");
    /**
     * The function for creating the `compile()` function.
     */
    function getCreateCompileFn(fileSystem, logger, fileWriter, enableI18nLegacyMessageIdFormat, tsConfig, pathMappings) {
        return function (beforeWritingFiles, onTaskCompleted) {
            var Transformer = require('../packages/transformer').Transformer;
            var transformer = new Transformer(fileSystem, logger, tsConfig);
            return function (task) {
                var entryPoint = task.entryPoint, formatProperty = task.formatProperty, formatPropertiesToMarkAsProcessed = task.formatPropertiesToMarkAsProcessed, processDts = task.processDts;
                var isCore = entryPoint.name === '@angular/core'; // Are we compiling the Angular core?
                var packageJson = entryPoint.packageJson;
                var formatPath = packageJson[formatProperty];
                var format = entry_point_1.getEntryPointFormat(fileSystem, entryPoint, formatProperty);
                // All properties listed in `propertiesToProcess` are guaranteed to point to a format-path
                // (i.e. they are defined in `entryPoint.packageJson`). Furthermore, they are also guaranteed
                // to be among `SUPPORTED_FORMAT_PROPERTIES`.
                // Based on the above, `formatPath` should always be defined and `getEntryPointFormat()`
                // should always return a format here (and not `undefined`).
                if (!formatPath || !format) {
                    // This should never happen.
                    throw new Error("Invariant violated: No format-path or format for " + entryPoint.path + " : " +
                        (formatProperty + " (formatPath: " + formatPath + " | format: " + format + ")"));
                }
                logger.info("Compiling " + entryPoint.name + " : " + formatProperty + " as " + format);
                var bundle = entry_point_bundle_1.makeEntryPointBundle(fileSystem, entryPoint, formatPath, isCore, format, processDts, pathMappings, true, enableI18nLegacyMessageIdFormat);
                var result = transformer.transform(bundle);
                if (result.success) {
                    if (result.diagnostics.length > 0) {
                        logger.warn(diagnostics_1.replaceTsWithNgInErrors(ts.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host)));
                    }
                    var writeBundle = function () {
                        fileWriter.writeBundle(bundle, result.transformedFiles, formatPropertiesToMarkAsProcessed);
                        logger.debug("  Successfully compiled " + entryPoint.name + " : " + formatProperty);
                        onTaskCompleted(task, 0 /* Processed */, null);
                    };
                    var beforeWritingResult = beforeWritingFiles(result.transformedFiles);
                    return (beforeWritingResult instanceof Promise) ?
                        beforeWritingResult.then(writeBundle) :
                        writeBundle();
                }
                else {
                    var errors = diagnostics_1.replaceTsWithNgInErrors(ts.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host));
                    onTaskCompleted(task, 1 /* Failed */, "compilation errors:\n" + errors);
                }
            };
        };
    }
    exports.getCreateCompileFn = getCreateCompileFn;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX2NvbXBpbGVfZnVuY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NyZWF0ZV9jb21waWxlX2Z1bmN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUNBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQywyRUFBdUU7SUFJdkUsbUZBQTREO0lBQzVELGlHQUFvRTtJQU9wRTs7T0FFRztJQUNILFNBQWdCLGtCQUFrQixDQUM5QixVQUFzQixFQUFFLE1BQWMsRUFBRSxVQUFzQixFQUM5RCwrQkFBd0MsRUFBRSxRQUFrQyxFQUM1RSxZQUFvQztRQUN0QyxPQUFPLFVBQUMsa0JBQWtCLEVBQUUsZUFBZTtZQUNsQyxJQUFBLFdBQVcsR0FBSSxPQUFPLENBQUMseUJBQXlCLENBQUMsWUFBdEMsQ0FBdUM7WUFDekQsSUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVsRSxPQUFPLFVBQUMsSUFBVTtnQkFDVCxJQUFBLFVBQVUsR0FBbUUsSUFBSSxXQUF2RSxFQUFFLGNBQWMsR0FBbUQsSUFBSSxlQUF2RCxFQUFFLGlDQUFpQyxHQUFnQixJQUFJLGtDQUFwQixFQUFFLFVBQVUsR0FBSSxJQUFJLFdBQVIsQ0FBUztnQkFFekYsSUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBRSxxQ0FBcUM7Z0JBQzFGLElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7Z0JBQzNDLElBQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDL0MsSUFBTSxNQUFNLEdBQUcsaUNBQW1CLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztnQkFFM0UsMEZBQTBGO2dCQUMxRiw2RkFBNkY7Z0JBQzdGLDZDQUE2QztnQkFDN0Msd0ZBQXdGO2dCQUN4Riw0REFBNEQ7Z0JBQzVELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQzFCLDRCQUE0QjtvQkFDNUIsTUFBTSxJQUFJLEtBQUssQ0FDWCxzREFBb0QsVUFBVSxDQUFDLElBQUksUUFBSzt5QkFDckUsY0FBYyxzQkFBaUIsVUFBVSxtQkFBYyxNQUFNLE1BQUcsQ0FBQSxDQUFDLENBQUM7aUJBQzFFO2dCQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBYSxVQUFVLENBQUMsSUFBSSxXQUFNLGNBQWMsWUFBTyxNQUFRLENBQUMsQ0FBQztnQkFFN0UsSUFBTSxNQUFNLEdBQUcseUNBQW9CLENBQy9CLFVBQVUsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQ2xGLCtCQUErQixDQUFDLENBQUM7Z0JBRXJDLElBQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzdDLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtvQkFDbEIsSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7d0JBQ2pDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUNBQXVCLENBQy9CLEVBQUUsQ0FBQyxvQ0FBb0MsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNwRjtvQkFFRCxJQUFNLFdBQVcsR0FBRzt3QkFDbEIsVUFBVSxDQUFDLFdBQVcsQ0FDbEIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO3dCQUV4RSxNQUFNLENBQUMsS0FBSyxDQUFDLDZCQUEyQixVQUFVLENBQUMsSUFBSSxXQUFNLGNBQWdCLENBQUMsQ0FBQzt3QkFDL0UsZUFBZSxDQUFDLElBQUkscUJBQW1DLElBQUksQ0FBQyxDQUFDO29CQUMvRCxDQUFDLENBQUM7b0JBRUYsSUFBTSxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztvQkFFeEUsT0FBTyxDQUFDLG1CQUFtQixZQUFZLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQzdDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQTBDLENBQUEsQ0FBQzt3QkFDL0UsV0FBVyxFQUFFLENBQUM7aUJBQ25CO3FCQUFNO29CQUNMLElBQU0sTUFBTSxHQUFHLHFDQUF1QixDQUNsQyxFQUFFLENBQUMsb0NBQW9DLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ2xGLGVBQWUsQ0FBQyxJQUFJLGtCQUFnQywwQkFBd0IsTUFBUSxDQUFDLENBQUM7aUJBQ3ZGO1lBQ0gsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQTdERCxnREE2REMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge3JlcGxhY2VUc1dpdGhOZ0luRXJyb3JzfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQYXJzZWRDb25maWd1cmF0aW9ufSBmcm9tICcuLi8uLi8uLi9zcmMvcGVyZm9ybV9jb21waWxlJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge2dldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7bWFrZUVudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi4vcGF0aF9tYXBwaW5ncyc7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4uL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuXG5pbXBvcnQge0NyZWF0ZUNvbXBpbGVGbn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtUYXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWV9IGZyb20gJy4vdGFza3MvYXBpJztcblxuLyoqXG4gKiBUaGUgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIHRoZSBgY29tcGlsZSgpYCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENyZWF0ZUNvbXBpbGVGbihcbiAgICBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgZmlsZVdyaXRlcjogRmlsZVdyaXRlcixcbiAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuLCB0c0NvbmZpZzogUGFyc2VkQ29uZmlndXJhdGlvbnxudWxsLFxuICAgIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCk6IENyZWF0ZUNvbXBpbGVGbiB7XG4gIHJldHVybiAoYmVmb3JlV3JpdGluZ0ZpbGVzLCBvblRhc2tDb21wbGV0ZWQpID0+IHtcbiAgICBjb25zdCB7VHJhbnNmb3JtZXJ9ID0gcmVxdWlyZSgnLi4vcGFja2FnZXMvdHJhbnNmb3JtZXInKTtcbiAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmaWxlU3lzdGVtLCBsb2dnZXIsIHRzQ29uZmlnKTtcblxuICAgIHJldHVybiAodGFzazogVGFzaykgPT4ge1xuICAgICAgY29uc3Qge2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9ID0gdGFzaztcblxuICAgICAgY29uc3QgaXNDb3JlID0gZW50cnlQb2ludC5uYW1lID09PSAnQGFuZ3VsYXIvY29yZSc7ICAvLyBBcmUgd2UgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmU/XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bZm9ybWF0UHJvcGVydHldO1xuICAgICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQcm9wZXJ0eSk7XG5cbiAgICAgIC8vIEFsbCBwcm9wZXJ0aWVzIGxpc3RlZCBpbiBgcHJvcGVydGllc1RvUHJvY2Vzc2AgYXJlIGd1YXJhbnRlZWQgdG8gcG9pbnQgdG8gYSBmb3JtYXQtcGF0aFxuICAgICAgLy8gKGkuZS4gdGhleSBhcmUgZGVmaW5lZCBpbiBgZW50cnlQb2ludC5wYWNrYWdlSnNvbmApLiBGdXJ0aGVybW9yZSwgdGhleSBhcmUgYWxzbyBndWFyYW50ZWVkXG4gICAgICAvLyB0byBiZSBhbW9uZyBgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTYC5cbiAgICAgIC8vIEJhc2VkIG9uIHRoZSBhYm92ZSwgYGZvcm1hdFBhdGhgIHNob3VsZCBhbHdheXMgYmUgZGVmaW5lZCBhbmQgYGdldEVudHJ5UG9pbnRGb3JtYXQoKWBcbiAgICAgIC8vIHNob3VsZCBhbHdheXMgcmV0dXJuIGEgZm9ybWF0IGhlcmUgKGFuZCBub3QgYHVuZGVmaW5lZGApLlxuICAgICAgaWYgKCFmb3JtYXRQYXRoIHx8ICFmb3JtYXQpIHtcbiAgICAgICAgLy8gVGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgSW52YXJpYW50IHZpb2xhdGVkOiBObyBmb3JtYXQtcGF0aCBvciBmb3JtYXQgZm9yICR7ZW50cnlQb2ludC5wYXRofSA6IGAgK1xuICAgICAgICAgICAgYCR7Zm9ybWF0UHJvcGVydHl9IChmb3JtYXRQYXRoOiAke2Zvcm1hdFBhdGh9IHwgZm9ybWF0OiAke2Zvcm1hdH0pYCk7XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlci5pbmZvKGBDb21waWxpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXRQcm9wZXJ0eX0gYXMgJHtmb3JtYXR9YCk7XG5cbiAgICAgIGNvbnN0IGJ1bmRsZSA9IG1ha2VFbnRyeVBvaW50QnVuZGxlKFxuICAgICAgICAgIGZpbGVTeXN0ZW0sIGVudHJ5UG9pbnQsIGZvcm1hdFBhdGgsIGlzQ29yZSwgZm9ybWF0LCBwcm9jZXNzRHRzLCBwYXRoTWFwcGluZ3MsIHRydWUsXG4gICAgICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybShidW5kbGUpO1xuICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIGlmIChyZXN1bHQuZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGxvZ2dlci53YXJuKHJlcGxhY2VUc1dpdGhOZ0luRXJyb3JzKFxuICAgICAgICAgICAgICB0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQocmVzdWx0LmRpYWdub3N0aWNzLCBidW5kbGUuc3JjLmhvc3QpKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB3cml0ZUJ1bmRsZSA9ICgpID0+IHtcbiAgICAgICAgICBmaWxlV3JpdGVyLndyaXRlQnVuZGxlKFxuICAgICAgICAgICAgICBidW5kbGUsIHJlc3VsdC50cmFuc2Zvcm1lZEZpbGVzLCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQpO1xuXG4gICAgICAgICAgbG9nZ2VyLmRlYnVnKGAgIFN1Y2Nlc3NmdWxseSBjb21waWxlZCAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdFByb3BlcnR5fWApO1xuICAgICAgICAgIG9uVGFza0NvbXBsZXRlZCh0YXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWUuUHJvY2Vzc2VkLCBudWxsKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBiZWZvcmVXcml0aW5nUmVzdWx0ID0gYmVmb3JlV3JpdGluZ0ZpbGVzKHJlc3VsdC50cmFuc2Zvcm1lZEZpbGVzKTtcblxuICAgICAgICByZXR1cm4gKGJlZm9yZVdyaXRpbmdSZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSA/XG4gICAgICAgICAgICBiZWZvcmVXcml0aW5nUmVzdWx0LnRoZW4od3JpdGVCdW5kbGUpIGFzIFJldHVyblR5cGU8dHlwZW9mIGJlZm9yZVdyaXRpbmdGaWxlcz46XG4gICAgICAgICAgICB3cml0ZUJ1bmRsZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZXJyb3JzID0gcmVwbGFjZVRzV2l0aE5nSW5FcnJvcnMoXG4gICAgICAgICAgICB0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQocmVzdWx0LmRpYWdub3N0aWNzLCBidW5kbGUuc3JjLmhvc3QpKTtcbiAgICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5GYWlsZWQsIGBjb21waWxhdGlvbiBlcnJvcnM6XFxuJHtlcnJvcnN9YCk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcbn1cbiJdfQ==