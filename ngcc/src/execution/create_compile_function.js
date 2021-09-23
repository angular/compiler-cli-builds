(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/execution/create_compile_function", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/ngcc/src/packages/source_file_cache"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getCreateCompileFn = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var entry_point_bundle_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point_bundle");
    var source_file_cache_1 = require("@angular/compiler-cli/ngcc/src/packages/source_file_cache");
    /**
     * The function for creating the `compile()` function.
     */
    function getCreateCompileFn(fileSystem, logger, fileWriter, enableI18nLegacyMessageIdFormat, tsConfig, pathMappings) {
        return function (beforeWritingFiles, onTaskCompleted) {
            var Transformer = require('../packages/transformer').Transformer;
            var transformer = new Transformer(fileSystem, logger, tsConfig);
            var sharedFileCache = new source_file_cache_1.SharedFileCache(fileSystem);
            var moduleResolutionCache = (0, source_file_cache_1.createModuleResolutionCache)(fileSystem);
            return function (task) {
                var entryPoint = task.entryPoint, formatProperty = task.formatProperty, formatPropertiesToMarkAsProcessed = task.formatPropertiesToMarkAsProcessed, processDts = task.processDts;
                var isCore = entryPoint.name === '@angular/core'; // Are we compiling the Angular core?
                var packageJson = entryPoint.packageJson;
                var formatPath = packageJson[formatProperty];
                var format = (0, entry_point_1.getEntryPointFormat)(fileSystem, entryPoint, formatProperty);
                // All properties listed in `propertiesToProcess` are guaranteed to point to a format-path
                // (i.e. they are defined in `entryPoint.packageJson`). Furthermore, they are also guaranteed
                // to be among `SUPPORTED_FORMAT_PROPERTIES`.
                // Based on the above, `formatPath` should always be defined and `getEntryPointFormat()`
                // should always return a format here (and not `undefined`) unless `formatPath` points to a
                // missing or empty file.
                if (!formatPath || !format) {
                    onTaskCompleted(task, 1 /* Failed */, "property `" + formatProperty + "` pointing to a missing or empty file: " + formatPath);
                    return;
                }
                logger.info("Compiling " + entryPoint.name + " : " + formatProperty + " as " + format);
                var bundle = (0, entry_point_bundle_1.makeEntryPointBundle)(fileSystem, entryPoint, sharedFileCache, moduleResolutionCache, formatPath, isCore, format, processDts, pathMappings, true, enableI18nLegacyMessageIdFormat);
                var result = transformer.transform(bundle);
                if (result.success) {
                    if (result.diagnostics.length > 0) {
                        logger.warn((0, diagnostics_1.replaceTsWithNgInErrors)(ts.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host)));
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
                    var errors = (0, diagnostics_1.replaceTsWithNgInErrors)(ts.formatDiagnosticsWithColorAndContext(result.diagnostics, bundle.src.host));
                    onTaskCompleted(task, 1 /* Failed */, "compilation errors:\n" + errors);
                }
            };
        };
    }
    exports.getCreateCompileFn = getCreateCompileFn;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlX2NvbXBpbGVfZnVuY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZXhlY3V0aW9uL2NyZWF0ZV9jb21waWxlX2Z1bmN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUNBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUVqQywyRUFBdUU7SUFJdkUsbUZBQTREO0lBQzVELGlHQUFvRTtJQUNwRSwrRkFBMkY7SUFPM0Y7O09BRUc7SUFDSCxTQUFnQixrQkFBa0IsQ0FDOUIsVUFBc0IsRUFBRSxNQUFjLEVBQUUsVUFBc0IsRUFDOUQsK0JBQXdDLEVBQUUsUUFBa0MsRUFDNUUsWUFBb0M7UUFDdEMsT0FBTyxVQUFDLGtCQUFrQixFQUFFLGVBQWU7WUFDbEMsSUFBQSxXQUFXLEdBQUksT0FBTyxDQUFDLHlCQUF5QixDQUFDLFlBQXRDLENBQXVDO1lBQ3pELElBQU0sV0FBVyxHQUFHLElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbEUsSUFBTSxlQUFlLEdBQUcsSUFBSSxtQ0FBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3hELElBQU0scUJBQXFCLEdBQUcsSUFBQSwrQ0FBMkIsRUFBQyxVQUFVLENBQUMsQ0FBQztZQUV0RSxPQUFPLFVBQUMsSUFBVTtnQkFDVCxJQUFBLFVBQVUsR0FBbUUsSUFBSSxXQUF2RSxFQUFFLGNBQWMsR0FBbUQsSUFBSSxlQUF2RCxFQUFFLGlDQUFpQyxHQUFnQixJQUFJLGtDQUFwQixFQUFFLFVBQVUsR0FBSSxJQUFJLFdBQVIsQ0FBUztnQkFFekYsSUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBRSxxQ0FBcUM7Z0JBQzFGLElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7Z0JBQzNDLElBQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDL0MsSUFBTSxNQUFNLEdBQUcsSUFBQSxpQ0FBbUIsRUFBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO2dCQUUzRSwwRkFBMEY7Z0JBQzFGLDZGQUE2RjtnQkFDN0YsNkNBQTZDO2dCQUM3Qyx3RkFBd0Y7Z0JBQ3hGLDJGQUEyRjtnQkFDM0YseUJBQXlCO2dCQUN6QixJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsTUFBTSxFQUFFO29CQUMxQixlQUFlLENBQ1gsSUFBSSxrQkFDSixlQUFjLGNBQWMsK0NBQTJDLFVBQVksQ0FBQyxDQUFDO29CQUN6RixPQUFPO2lCQUNSO2dCQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBYSxVQUFVLENBQUMsSUFBSSxXQUFNLGNBQWMsWUFBTyxNQUFRLENBQUMsQ0FBQztnQkFFN0UsSUFBTSxNQUFNLEdBQUcsSUFBQSx5Q0FBb0IsRUFDL0IsVUFBVSxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFDbEYsTUFBTSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLCtCQUErQixDQUFDLENBQUM7Z0JBRTdFLElBQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzdDLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtvQkFDbEIsSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7d0JBQ2pDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBQSxxQ0FBdUIsRUFDL0IsRUFBRSxDQUFDLG9DQUFvQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQ3BGO29CQUVELElBQU0sV0FBVyxHQUFHO3dCQUNsQixVQUFVLENBQUMsV0FBVyxDQUNsQixNQUFNLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixFQUFFLGlDQUFpQyxDQUFDLENBQUM7d0JBRXhFLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkJBQTJCLFVBQVUsQ0FBQyxJQUFJLFdBQU0sY0FBZ0IsQ0FBQyxDQUFDO3dCQUMvRSxlQUFlLENBQUMsSUFBSSxxQkFBbUMsSUFBSSxDQUFDLENBQUM7b0JBQy9ELENBQUMsQ0FBQztvQkFFRixJQUFNLG1CQUFtQixHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUV4RSxPQUFPLENBQUMsbUJBQW1CLFlBQVksT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDN0MsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBMEMsQ0FBQSxDQUFDO3dCQUMvRSxXQUFXLEVBQUUsQ0FBQztpQkFDbkI7cUJBQU07b0JBQ0wsSUFBTSxNQUFNLEdBQUcsSUFBQSxxQ0FBdUIsRUFDbEMsRUFBRSxDQUFDLG9DQUFvQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNsRixlQUFlLENBQUMsSUFBSSxrQkFBZ0MsMEJBQXdCLE1BQVEsQ0FBQyxDQUFDO2lCQUN2RjtZQUNILENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7SUFoRUQsZ0RBZ0VDIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge3JlcGxhY2VUc1dpdGhOZ0luRXJyb3JzfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7UGFyc2VkQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vc3JjL3BlcmZvcm1fY29tcGlsZSc7XG5pbXBvcnQge2dldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7bWFrZUVudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge2NyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZSwgU2hhcmVkRmlsZUNhY2hlfSBmcm9tICcuLi9wYWNrYWdlcy9zb3VyY2VfZmlsZV9jYWNoZSc7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi4vcGF0aF9tYXBwaW5ncyc7XG5pbXBvcnQge0ZpbGVXcml0ZXJ9IGZyb20gJy4uL3dyaXRpbmcvZmlsZV93cml0ZXInO1xuXG5pbXBvcnQge0NyZWF0ZUNvbXBpbGVGbn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtUYXNrLCBUYXNrUHJvY2Vzc2luZ091dGNvbWV9IGZyb20gJy4vdGFza3MvYXBpJztcblxuLyoqXG4gKiBUaGUgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIHRoZSBgY29tcGlsZSgpYCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENyZWF0ZUNvbXBpbGVGbihcbiAgICBmaWxlU3lzdGVtOiBGaWxlU3lzdGVtLCBsb2dnZXI6IExvZ2dlciwgZmlsZVdyaXRlcjogRmlsZVdyaXRlcixcbiAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuLCB0c0NvbmZpZzogUGFyc2VkQ29uZmlndXJhdGlvbnxudWxsLFxuICAgIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCk6IENyZWF0ZUNvbXBpbGVGbiB7XG4gIHJldHVybiAoYmVmb3JlV3JpdGluZ0ZpbGVzLCBvblRhc2tDb21wbGV0ZWQpID0+IHtcbiAgICBjb25zdCB7VHJhbnNmb3JtZXJ9ID0gcmVxdWlyZSgnLi4vcGFja2FnZXMvdHJhbnNmb3JtZXInKTtcbiAgICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihmaWxlU3lzdGVtLCBsb2dnZXIsIHRzQ29uZmlnKTtcbiAgICBjb25zdCBzaGFyZWRGaWxlQ2FjaGUgPSBuZXcgU2hhcmVkRmlsZUNhY2hlKGZpbGVTeXN0ZW0pO1xuICAgIGNvbnN0IG1vZHVsZVJlc29sdXRpb25DYWNoZSA9IGNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShmaWxlU3lzdGVtKTtcblxuICAgIHJldHVybiAodGFzazogVGFzaykgPT4ge1xuICAgICAgY29uc3Qge2VudHJ5UG9pbnQsIGZvcm1hdFByb3BlcnR5LCBmb3JtYXRQcm9wZXJ0aWVzVG9NYXJrQXNQcm9jZXNzZWQsIHByb2Nlc3NEdHN9ID0gdGFzaztcblxuICAgICAgY29uc3QgaXNDb3JlID0gZW50cnlQb2ludC5uYW1lID09PSAnQGFuZ3VsYXIvY29yZSc7ICAvLyBBcmUgd2UgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmU/XG4gICAgICBjb25zdCBwYWNrYWdlSnNvbiA9IGVudHJ5UG9pbnQucGFja2FnZUpzb247XG4gICAgICBjb25zdCBmb3JtYXRQYXRoID0gcGFja2FnZUpzb25bZm9ybWF0UHJvcGVydHldO1xuICAgICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdChmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBmb3JtYXRQcm9wZXJ0eSk7XG5cbiAgICAgIC8vIEFsbCBwcm9wZXJ0aWVzIGxpc3RlZCBpbiBgcHJvcGVydGllc1RvUHJvY2Vzc2AgYXJlIGd1YXJhbnRlZWQgdG8gcG9pbnQgdG8gYSBmb3JtYXQtcGF0aFxuICAgICAgLy8gKGkuZS4gdGhleSBhcmUgZGVmaW5lZCBpbiBgZW50cnlQb2ludC5wYWNrYWdlSnNvbmApLiBGdXJ0aGVybW9yZSwgdGhleSBhcmUgYWxzbyBndWFyYW50ZWVkXG4gICAgICAvLyB0byBiZSBhbW9uZyBgU1VQUE9SVEVEX0ZPUk1BVF9QUk9QRVJUSUVTYC5cbiAgICAgIC8vIEJhc2VkIG9uIHRoZSBhYm92ZSwgYGZvcm1hdFBhdGhgIHNob3VsZCBhbHdheXMgYmUgZGVmaW5lZCBhbmQgYGdldEVudHJ5UG9pbnRGb3JtYXQoKWBcbiAgICAgIC8vIHNob3VsZCBhbHdheXMgcmV0dXJuIGEgZm9ybWF0IGhlcmUgKGFuZCBub3QgYHVuZGVmaW5lZGApIHVubGVzcyBgZm9ybWF0UGF0aGAgcG9pbnRzIHRvIGFcbiAgICAgIC8vIG1pc3Npbmcgb3IgZW1wdHkgZmlsZS5cbiAgICAgIGlmICghZm9ybWF0UGF0aCB8fCAhZm9ybWF0KSB7XG4gICAgICAgIG9uVGFza0NvbXBsZXRlZChcbiAgICAgICAgICAgIHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5GYWlsZWQsXG4gICAgICAgICAgICBgcHJvcGVydHkgXFxgJHtmb3JtYXRQcm9wZXJ0eX1cXGAgcG9pbnRpbmcgdG8gYSBtaXNzaW5nIG9yIGVtcHR5IGZpbGU6ICR7Zm9ybWF0UGF0aH1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBsb2dnZXIuaW5mbyhgQ29tcGlsaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9IGFzICR7Zm9ybWF0fWApO1xuXG4gICAgICBjb25zdCBidW5kbGUgPSBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICAgICAgICBmaWxlU3lzdGVtLCBlbnRyeVBvaW50LCBzaGFyZWRGaWxlQ2FjaGUsIG1vZHVsZVJlc29sdXRpb25DYWNoZSwgZm9ybWF0UGF0aCwgaXNDb3JlLFxuICAgICAgICAgIGZvcm1hdCwgcHJvY2Vzc0R0cywgcGF0aE1hcHBpbmdzLCB0cnVlLCBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGJ1bmRsZSk7XG4gICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5kaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4ocmVwbGFjZVRzV2l0aE5nSW5FcnJvcnMoXG4gICAgICAgICAgICAgIHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChyZXN1bHQuZGlhZ25vc3RpY3MsIGJ1bmRsZS5zcmMuaG9zdCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHdyaXRlQnVuZGxlID0gKCkgPT4ge1xuICAgICAgICAgIGZpbGVXcml0ZXIud3JpdGVCdW5kbGUoXG4gICAgICAgICAgICAgIGJ1bmRsZSwgcmVzdWx0LnRyYW5zZm9ybWVkRmlsZXMsIGZvcm1hdFByb3BlcnRpZXNUb01hcmtBc1Byb2Nlc3NlZCk7XG5cbiAgICAgICAgICBsb2dnZXIuZGVidWcoYCAgU3VjY2Vzc2Z1bGx5IGNvbXBpbGVkICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0UHJvcGVydHl9YCk7XG4gICAgICAgICAgb25UYXNrQ29tcGxldGVkKHRhc2ssIFRhc2tQcm9jZXNzaW5nT3V0Y29tZS5Qcm9jZXNzZWQsIG51bGwpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGJlZm9yZVdyaXRpbmdSZXN1bHQgPSBiZWZvcmVXcml0aW5nRmlsZXMocmVzdWx0LnRyYW5zZm9ybWVkRmlsZXMpO1xuXG4gICAgICAgIHJldHVybiAoYmVmb3JlV3JpdGluZ1Jlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpID9cbiAgICAgICAgICAgIGJlZm9yZVdyaXRpbmdSZXN1bHQudGhlbih3cml0ZUJ1bmRsZSkgYXMgUmV0dXJuVHlwZTx0eXBlb2YgYmVmb3JlV3JpdGluZ0ZpbGVzPjpcbiAgICAgICAgICAgIHdyaXRlQnVuZGxlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBlcnJvcnMgPSByZXBsYWNlVHNXaXRoTmdJbkVycm9ycyhcbiAgICAgICAgICAgIHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChyZXN1bHQuZGlhZ25vc3RpY3MsIGJ1bmRsZS5zcmMuaG9zdCkpO1xuICAgICAgICBvblRhc2tDb21wbGV0ZWQodGFzaywgVGFza1Byb2Nlc3NpbmdPdXRjb21lLkZhaWxlZCwgYGNvbXBpbGF0aW9uIGVycm9yczpcXG4ke2Vycm9yc31gKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xufVxuIl19