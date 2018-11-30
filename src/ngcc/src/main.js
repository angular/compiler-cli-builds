(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/main", ["require", "exports", "canonical-path", "yargs", "@angular/compiler-cli/src/ngcc/src/packages/dependency_host", "@angular/compiler-cli/src/ngcc/src/packages/dependency_resolver", "@angular/compiler-cli/src/ngcc/src/packages/entry_point_bundle", "@angular/compiler-cli/src/ngcc/src/packages/entry_point_finder", "@angular/compiler-cli/src/ngcc/src/packages/transformer"], factory);
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
                    var bundle = entry_point_bundle_1.makeEntryPointBundle(entryPoint, isCore, format, format === dtsTransformFormat);
                    if (bundle === null) {
                        console.warn("Skipping " + entryPoint.name + " : " + format + " (no entry point file for this format).");
                    }
                    else {
                        transformer.transform(entryPoint, isCore, bundle);
                    }
                });
            });
        }
        catch (e) {
            console.error(e.stack);
            return 1;
        }
        return 0;
    }
    exports.mainNgcc = mainNgcc;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHFDQUF1QztJQUN2Qyw2QkFBK0I7SUFFL0IsK0ZBQTBEO0lBQzFELHVHQUFrRTtJQUVsRSxxR0FBbUU7SUFDbkUscUdBQStEO0lBQy9ELHVGQUFtRDtJQUVuRCxTQUFnQixRQUFRLENBQUMsSUFBYztRQUNyQyxJQUFNLE9BQU8sR0FDVCxLQUFLO2FBQ0EsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsUUFBUSxFQUFFLHVDQUF1QztZQUNqRCxPQUFPLEVBQUUsZ0JBQWdCO1NBQzFCLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFNBQVM7WUFDaEIsS0FBSyxFQUFFLElBQUk7WUFDWCxRQUFRLEVBQUUsaUNBQWlDO1lBQzNDLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQztTQUNsRCxDQUFDO2FBQ0QsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsUUFBUSxFQUFFLG1FQUFtRTtZQUM3RSxrQkFBa0IsRUFBRSxzQkFBc0I7U0FDM0MsQ0FBQzthQUNELElBQUksRUFBRTthQUNOLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyQixJQUFNLFVBQVUsR0FBVyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3RELElBQU0sT0FBTyxHQUF1QixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakQsSUFBTSxVQUFVLEdBQVcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQztRQUV0RCxJQUFNLFdBQVcsR0FBRyxJQUFJLHlCQUFXLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzVELElBQU0sSUFBSSxHQUFHLElBQUksZ0NBQWMsRUFBRSxDQUFDO1FBQ2xDLElBQU0sUUFBUSxHQUFHLElBQUksd0NBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUMsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQ0FBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QyxJQUFJO1lBQ0ssSUFBQSw0REFBVyxDQUF1QztZQUN6RCxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFFNUIscUNBQXFDO2dCQUNyQyxJQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxLQUFLLGVBQWUsQ0FBQztnQkFFbkQsNkVBQTZFO2dCQUM3RSxrRkFBa0Y7Z0JBQ2xGLHFFQUFxRTtnQkFDckUsSUFBTSxrQkFBa0IsR0FBcUIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBRTFGLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQSxNQUFNO29CQUNwQixJQUFNLE1BQU0sR0FDUix5Q0FBb0IsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEtBQUssa0JBQWtCLENBQUMsQ0FBQztvQkFDcEYsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO3dCQUNuQixPQUFPLENBQUMsSUFBSSxDQUNSLGNBQVksVUFBVSxDQUFDLElBQUksV0FBTSxNQUFNLDRDQUF5QyxDQUFDLENBQUM7cUJBQ3ZGO3lCQUFNO3dCQUNMLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztxQkFDbkQ7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QixPQUFPLENBQUMsQ0FBQztTQUNWO1FBRUQsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBNURELDRCQTREQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0ICogYXMgeWFyZ3MgZnJvbSAneWFyZ3MnO1xuXG5pbXBvcnQge0RlcGVuZGVuY3lIb3N0fSBmcm9tICcuL3BhY2thZ2VzL2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlcn0gZnJvbSAnLi9wYWNrYWdlcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7RW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge21ha2VFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vcGFja2FnZXMvZW50cnlfcG9pbnRfZmluZGVyJztcbmltcG9ydCB7VHJhbnNmb3JtZXJ9IGZyb20gJy4vcGFja2FnZXMvdHJhbnNmb3JtZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2MoYXJnczogc3RyaW5nW10pOiBudW1iZXIge1xuICBjb25zdCBvcHRpb25zID1cbiAgICAgIHlhcmdzXG4gICAgICAgICAgLm9wdGlvbigncycsIHtcbiAgICAgICAgICAgIGFsaWFzOiAnc291cmNlJyxcbiAgICAgICAgICAgIGRlc2NyaWJlOiAnQSBwYXRoIHRvIHRoZSByb290IGZvbGRlciB0byBjb21waWxlLicsXG4gICAgICAgICAgICBkZWZhdWx0OiAnLi9ub2RlX21vZHVsZXMnXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdmJywge1xuICAgICAgICAgICAgYWxpYXM6ICdmb3JtYXRzJyxcbiAgICAgICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgICAgICAgZGVzY3JpYmU6ICdBbiBhcnJheSBvZiBmb3JtYXRzIHRvIGNvbXBpbGUuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IFsnZmVzbTIwMTUnLCAnZXNtMjAxNScsICdmZXNtNScsICdlc201J11cbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ3QnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3RhcmdldCcsXG4gICAgICAgICAgICBkZXNjcmliZTogJ0EgcGF0aCB0byBhIHJvb3QgZm9sZGVyIHdoZXJlIHRoZSBjb21waWxlZCBmaWxlcyB3aWxsIGJlIHdyaXR0ZW4uJyxcbiAgICAgICAgICAgIGRlZmF1bHREZXNjcmlwdGlvbjogJ1RoZSBgc291cmNlYCBmb2xkZXIuJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmhlbHAoKVxuICAgICAgICAgIC5wYXJzZShhcmdzKTtcblxuICBjb25zdCBzb3VyY2VQYXRoOiBzdHJpbmcgPSBwYXRoLnJlc29sdmUob3B0aW9uc1sncyddKTtcbiAgY29uc3QgZm9ybWF0czogRW50cnlQb2ludEZvcm1hdFtdID0gb3B0aW9uc1snZiddO1xuICBjb25zdCB0YXJnZXRQYXRoOiBzdHJpbmcgPSBvcHRpb25zWyd0J10gfHwgc291cmNlUGF0aDtcblxuICBjb25zdCB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihzb3VyY2VQYXRoLCB0YXJnZXRQYXRoKTtcbiAgY29uc3QgaG9zdCA9IG5ldyBEZXBlbmRlbmN5SG9zdCgpO1xuICBjb25zdCByZXNvbHZlciA9IG5ldyBEZXBlbmRlbmN5UmVzb2x2ZXIoaG9zdCk7XG4gIGNvbnN0IGZpbmRlciA9IG5ldyBFbnRyeVBvaW50RmluZGVyKHJlc29sdmVyKTtcblxuICB0cnkge1xuICAgIGNvbnN0IHtlbnRyeVBvaW50c30gPSBmaW5kZXIuZmluZEVudHJ5UG9pbnRzKHNvdXJjZVBhdGgpO1xuICAgIGVudHJ5UG9pbnRzLmZvckVhY2goZW50cnlQb2ludCA9PiB7XG5cbiAgICAgIC8vIEFyZSB3ZSBjb21waWxpbmcgdGhlIEFuZ3VsYXIgY29yZT9cbiAgICAgIGNvbnN0IGlzQ29yZSA9IGVudHJ5UG9pbnQubmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnO1xuXG4gICAgICAvLyBXZSB0cmFuc2Zvcm0gdGhlIGQudHMgdHlwaW5ncyBmaWxlcyB3aGlsZSB0cmFuc2Zvcm1pbmcgb25lIG9mIHRoZSBmb3JtYXRzLlxuICAgICAgLy8gVGhpcyB2YXJpYWJsZSBkZWNpZGVzIHdpdGggd2hpY2ggb2YgdGhlIGF2YWlsYWJsZSBmb3JtYXRzIHRvIGRvIHRoaXMgdHJhbnNmb3JtLlxuICAgICAgLy8gSXQgaXMgbWFyZ2luYWxseSBmYXN0ZXIgdG8gcHJvY2VzcyB2aWEgdGhlIGZsYXQgZmlsZSBpZiBhdmFpbGFibGUuXG4gICAgICBjb25zdCBkdHNUcmFuc2Zvcm1Gb3JtYXQ6IEVudHJ5UG9pbnRGb3JtYXQgPSBlbnRyeVBvaW50LmZlc20yMDE1ID8gJ2Zlc20yMDE1JyA6ICdlc20yMDE1JztcblxuICAgICAgZm9ybWF0cy5mb3JFYWNoKGZvcm1hdCA9PiB7XG4gICAgICAgIGNvbnN0IGJ1bmRsZSA9XG4gICAgICAgICAgICBtYWtlRW50cnlQb2ludEJ1bmRsZShlbnRyeVBvaW50LCBpc0NvcmUsIGZvcm1hdCwgZm9ybWF0ID09PSBkdHNUcmFuc2Zvcm1Gb3JtYXQpO1xuICAgICAgICBpZiAoYnVuZGxlID09PSBudWxsKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICBgU2tpcHBpbmcgJHtlbnRyeVBvaW50Lm5hbWV9IDogJHtmb3JtYXR9IChubyBlbnRyeSBwb2ludCBmaWxlIGZvciB0aGlzIGZvcm1hdCkuYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJhbnNmb3JtZXIudHJhbnNmb3JtKGVudHJ5UG9pbnQsIGlzQ29yZSwgYnVuZGxlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgIHJldHVybiAxO1xuICB9XG5cbiAgcmV0dXJuIDA7XG59XG4iXX0=