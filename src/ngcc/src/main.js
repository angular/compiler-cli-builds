(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/main", ["require", "exports", "canonical-path", "yargs", "@angular/compiler-cli/src/ngcc/src/packages/build_marker", "@angular/compiler-cli/src/ngcc/src/packages/dependency_host", "@angular/compiler-cli/src/ngcc/src/packages/dependency_resolver", "@angular/compiler-cli/src/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/src/ngcc/src/packages/entry_point_finder", "@angular/compiler-cli/src/ngcc/src/packages/transformer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var path = require("canonical-path");
    var yargs = require("yargs");
    var build_marker_1 = require("@angular/compiler-cli/src/ngcc/src/packages/build_marker");
    var dependency_host_1 = require("@angular/compiler-cli/src/ngcc/src/packages/dependency_host");
    var dependency_resolver_1 = require("@angular/compiler-cli/src/ngcc/src/packages/dependency_resolver");
    var entry_point_bundle_1 = require("@angular/compiler-cli/src/ngcc/src/packages/entry_point_bundle");
    var entry_point_finder_1 = require("@angular/compiler-cli/src/ngcc/src/packages/entry_point_finder");
    var transformer_1 = require("@angular/compiler-cli/src/ngcc/src/packages/transformer");
    function mainNgcc(args) {
        var options = yargs
            .option('s', {
            alias: 'source',
            describe: 'A path to the root folder to compile.',
            default: './node_modules'
        })
            .option('f', {
            alias: 'formats',
            array: true,
            describe: 'An array of formats to compile.',
            default: ['fesm2015', 'esm2015', 'fesm5', 'esm5']
        })
            .option('t', {
            alias: 'target',
            describe: 'A path to a root folder where the compiled files will be written.',
            defaultDescription: 'The `source` folder.'
        })
            .help()
            .parse(args);
        var sourcePath = path.resolve(options['s']);
        var formats = options['f'];
        var targetPath = options['t'] || sourcePath;
        var transformer = new transformer_1.Transformer(sourcePath, targetPath);
        var host = new dependency_host_1.DependencyHost();
        var resolver = new dependency_resolver_1.DependencyResolver(host);
        var finder = new entry_point_finder_1.EntryPointFinder(resolver);
        try {
            var entryPoints = finder.findEntryPoints(sourcePath).entryPoints;
            entryPoints.forEach(function (entryPoint) {
                // Are we compiling the Angular core?
                var isCore = entryPoint.name === '@angular/core';
                // We transform the d.ts typings files while transforming one of the formats.
                // This variable decides with which of the available formats to do this transform.
                // It is marginally faster to process via the flat file if available.
                var dtsTransformFormat = entryPoint.fesm2015 ? 'fesm2015' : 'esm2015';
                formats.forEach(function (format) {
                    if (build_marker_1.checkMarkerFile(entryPoint, format)) {
                        console.warn("Skipping " + entryPoint.name + " : " + format + " (already built).");
                        return;
                    }
                    var bundle = entry_point_bundle_1.makeEntryPointBundle(entryPoint, isCore, format, format === dtsTransformFormat);
                    if (bundle === null) {
                        console.warn("Skipping " + entryPoint.name + " : " + format + " (no entry point file for this format).");
                    }
                    else {
                        transformer.transform(entryPoint, isCore, bundle);
                    }
                    // Write the built-with-ngcc marker
                    build_marker_1.writeMarkerFile(entryPoint, format);
                });
            });
        }
        catch (e) {
            console.error(e.stack || e.message);
            return 1;
        }
        return 0;
    }
    exports.mainNgcc = mainNgcc;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHFDQUF1QztJQUN2Qyw2QkFBK0I7SUFFL0IseUZBQXlFO0lBQ3pFLCtGQUEwRDtJQUMxRCx1R0FBa0U7SUFFbEUscUdBQW1FO0lBQ25FLHFHQUErRDtJQUMvRCx1RkFBbUQ7SUFFbkQsU0FBZ0IsUUFBUSxDQUFDLElBQWM7UUFDckMsSUFBTSxPQUFPLEdBQ1QsS0FBSzthQUNBLE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFFBQVEsRUFBRSx1Q0FBdUM7WUFDakQsT0FBTyxFQUFFLGdCQUFnQjtTQUMxQixDQUFDO2FBQ0QsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxTQUFTO1lBQ2hCLEtBQUssRUFBRSxJQUFJO1lBQ1gsUUFBUSxFQUFFLGlDQUFpQztZQUMzQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUM7U0FDbEQsQ0FBQzthQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFFBQVEsRUFBRSxtRUFBbUU7WUFDN0Usa0JBQWtCLEVBQUUsc0JBQXNCO1NBQzNDLENBQUM7YUFDRCxJQUFJLEVBQUU7YUFDTixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckIsSUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFNLE9BQU8sR0FBdUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pELElBQU0sVUFBVSxHQUFXLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUM7UUFFdEQsSUFBTSxXQUFXLEdBQUcsSUFBSSx5QkFBVyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM1RCxJQUFNLElBQUksR0FBRyxJQUFJLGdDQUFjLEVBQUUsQ0FBQztRQUNsQyxJQUFNLFFBQVEsR0FBRyxJQUFJLHdDQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQU0sTUFBTSxHQUFHLElBQUkscUNBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFOUMsSUFBSTtZQUNLLElBQUEsNERBQVcsQ0FBdUM7WUFDekQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFBLFVBQVU7Z0JBRTVCLHFDQUFxQztnQkFDckMsSUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksS0FBSyxlQUFlLENBQUM7Z0JBRW5ELDZFQUE2RTtnQkFDN0Usa0ZBQWtGO2dCQUNsRixxRUFBcUU7Z0JBQ3JFLElBQU0sa0JBQWtCLEdBQXFCLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUUxRixPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUEsTUFBTTtvQkFDcEIsSUFBSSw4QkFBZSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFBRTt3QkFDdkMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFZLFVBQVUsQ0FBQyxJQUFJLFdBQU0sTUFBTSxzQkFBbUIsQ0FBQyxDQUFDO3dCQUN6RSxPQUFPO3FCQUNSO29CQUVELElBQU0sTUFBTSxHQUNSLHlDQUFvQixDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sS0FBSyxrQkFBa0IsQ0FBQyxDQUFDO29CQUNwRixJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7d0JBQ25CLE9BQU8sQ0FBQyxJQUFJLENBQ1IsY0FBWSxVQUFVLENBQUMsSUFBSSxXQUFNLE1BQU0sNENBQXlDLENBQUMsQ0FBQztxQkFDdkY7eUJBQU07d0JBQ0wsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO3FCQUNuRDtvQkFFRCxtQ0FBbUM7b0JBQ25DLDhCQUFlLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN0QyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDcEMsT0FBTyxDQUFDLENBQUM7U0FDVjtRQUVELE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQXBFRCw0QkFvRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCAqIGFzIHlhcmdzIGZyb20gJ3lhcmdzJztcblxuaW1wb3J0IHtjaGVja01hcmtlckZpbGUsIHdyaXRlTWFya2VyRmlsZX0gZnJvbSAnLi9wYWNrYWdlcy9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9wYWNrYWdlcy9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXJ9IGZyb20gJy4vcGFja2FnZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHttYWtlRW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2ZpbmRlcic7XG5pbXBvcnQge1RyYW5zZm9ybWVyfSBmcm9tICcuL3BhY2thZ2VzL3RyYW5zZm9ybWVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKGFyZ3M6IHN0cmluZ1tdKTogbnVtYmVyIHtcbiAgY29uc3Qgb3B0aW9ucyA9XG4gICAgICB5YXJnc1xuICAgICAgICAgIC5vcHRpb24oJ3MnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3NvdXJjZScsXG4gICAgICAgICAgICBkZXNjcmliZTogJ0EgcGF0aCB0byB0aGUgcm9vdCBmb2xkZXIgdG8gY29tcGlsZS4nLFxuICAgICAgICAgICAgZGVmYXVsdDogJy4vbm9kZV9tb2R1bGVzJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignZicsIHtcbiAgICAgICAgICAgIGFsaWFzOiAnZm9ybWF0cycsXG4gICAgICAgICAgICBhcnJheTogdHJ1ZSxcbiAgICAgICAgICAgIGRlc2NyaWJlOiAnQW4gYXJyYXkgb2YgZm9ybWF0cyB0byBjb21waWxlLicsXG4gICAgICAgICAgICBkZWZhdWx0OiBbJ2Zlc20yMDE1JywgJ2VzbTIwMTUnLCAnZmVzbTUnLCAnZXNtNSddXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCd0Jywge1xuICAgICAgICAgICAgYWxpYXM6ICd0YXJnZXQnLFxuICAgICAgICAgICAgZGVzY3JpYmU6ICdBIHBhdGggdG8gYSByb290IGZvbGRlciB3aGVyZSB0aGUgY29tcGlsZWQgZmlsZXMgd2lsbCBiZSB3cml0dGVuLicsXG4gICAgICAgICAgICBkZWZhdWx0RGVzY3JpcHRpb246ICdUaGUgYHNvdXJjZWAgZm9sZGVyLidcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5oZWxwKClcbiAgICAgICAgICAucGFyc2UoYXJncyk7XG5cbiAgY29uc3Qgc291cmNlUGF0aDogc3RyaW5nID0gcGF0aC5yZXNvbHZlKG9wdGlvbnNbJ3MnXSk7XG4gIGNvbnN0IGZvcm1hdHM6IEVudHJ5UG9pbnRGb3JtYXRbXSA9IG9wdGlvbnNbJ2YnXTtcbiAgY29uc3QgdGFyZ2V0UGF0aDogc3RyaW5nID0gb3B0aW9uc1sndCddIHx8IHNvdXJjZVBhdGg7XG5cbiAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgVHJhbnNmb3JtZXIoc291cmNlUGF0aCwgdGFyZ2V0UGF0aCk7XG4gIGNvbnN0IGhvc3QgPSBuZXcgRGVwZW5kZW5jeUhvc3QoKTtcbiAgY29uc3QgcmVzb2x2ZXIgPSBuZXcgRGVwZW5kZW5jeVJlc29sdmVyKGhvc3QpO1xuICBjb25zdCBmaW5kZXIgPSBuZXcgRW50cnlQb2ludEZpbmRlcihyZXNvbHZlcik7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7ZW50cnlQb2ludHN9ID0gZmluZGVyLmZpbmRFbnRyeVBvaW50cyhzb3VyY2VQYXRoKTtcbiAgICBlbnRyeVBvaW50cy5mb3JFYWNoKGVudHJ5UG9pbnQgPT4ge1xuXG4gICAgICAvLyBBcmUgd2UgY29tcGlsaW5nIHRoZSBBbmd1bGFyIGNvcmU/XG4gICAgICBjb25zdCBpc0NvcmUgPSBlbnRyeVBvaW50Lm5hbWUgPT09ICdAYW5ndWxhci9jb3JlJztcblxuICAgICAgLy8gV2UgdHJhbnNmb3JtIHRoZSBkLnRzIHR5cGluZ3MgZmlsZXMgd2hpbGUgdHJhbnNmb3JtaW5nIG9uZSBvZiB0aGUgZm9ybWF0cy5cbiAgICAgIC8vIFRoaXMgdmFyaWFibGUgZGVjaWRlcyB3aXRoIHdoaWNoIG9mIHRoZSBhdmFpbGFibGUgZm9ybWF0cyB0byBkbyB0aGlzIHRyYW5zZm9ybS5cbiAgICAgIC8vIEl0IGlzIG1hcmdpbmFsbHkgZmFzdGVyIHRvIHByb2Nlc3MgdmlhIHRoZSBmbGF0IGZpbGUgaWYgYXZhaWxhYmxlLlxuICAgICAgY29uc3QgZHRzVHJhbnNmb3JtRm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0ID0gZW50cnlQb2ludC5mZXNtMjAxNSA/ICdmZXNtMjAxNScgOiAnZXNtMjAxNSc7XG5cbiAgICAgIGZvcm1hdHMuZm9yRWFjaChmb3JtYXQgPT4ge1xuICAgICAgICBpZiAoY2hlY2tNYXJrZXJGaWxlKGVudHJ5UG9pbnQsIGZvcm1hdCkpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oYFNraXBwaW5nICR7ZW50cnlQb2ludC5uYW1lfSA6ICR7Zm9ybWF0fSAoYWxyZWFkeSBidWlsdCkuYCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYnVuZGxlID1cbiAgICAgICAgICAgIG1ha2VFbnRyeVBvaW50QnVuZGxlKGVudHJ5UG9pbnQsIGlzQ29yZSwgZm9ybWF0LCBmb3JtYXQgPT09IGR0c1RyYW5zZm9ybUZvcm1hdCk7XG4gICAgICAgIGlmIChidW5kbGUgPT09IG51bGwpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAgIGBTa2lwcGluZyAke2VudHJ5UG9pbnQubmFtZX0gOiAke2Zvcm1hdH0gKG5vIGVudHJ5IHBvaW50IGZpbGUgZm9yIHRoaXMgZm9ybWF0KS5gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cmFuc2Zvcm1lci50cmFuc2Zvcm0oZW50cnlQb2ludCwgaXNDb3JlLCBidW5kbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV3JpdGUgdGhlIGJ1aWx0LXdpdGgtbmdjYyBtYXJrZXJcbiAgICAgICAgd3JpdGVNYXJrZXJGaWxlKGVudHJ5UG9pbnQsIGZvcm1hdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayB8fCBlLm1lc3NhZ2UpO1xuICAgIHJldHVybiAxO1xuICB9XG5cbiAgcmV0dXJuIDA7XG59XG4iXX0=