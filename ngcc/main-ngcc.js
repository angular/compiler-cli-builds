#!/usr/bin/env node
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/main-ngcc", ["require", "exports", "tslib", "yargs", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/main", "@angular/compiler-cli/ngcc/src/logging/console_logger"], factory);
    }
})(function (require, exports) {
    "use strict";
    var _this = this;
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var yargs = require("yargs");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var main_1 = require("@angular/compiler-cli/ngcc/src/main");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    // CLI entry point
    if (require.main === module) {
        var startTime_1 = Date.now();
        var args = process.argv.slice(2);
        var options_1 = yargs
            .option('s', {
            alias: 'source',
            describe: 'A path (relative to the working directory) of the `node_modules` folder to process.',
            default: './node_modules'
        })
            .option('f', { alias: 'formats', hidden: true, array: true })
            .option('p', {
            alias: 'properties',
            array: true,
            describe: 'An array of names of properties in package.json to compile (e.g. `module` or `es2015`)\n' +
                'Each of these properties should hold the path to a bundle-format.\n' +
                'If provided, only the specified properties are considered for processing.\n' +
                'If not provided, all the supported format properties (e.g. fesm2015, fesm5, es2015, esm2015, esm5, main, module) in the package.json are considered.'
        })
            .option('t', {
            alias: 'target',
            describe: 'A relative path (from the `source` path) to a single entry-point to process (plus its dependencies).',
        })
            .option('first-only', {
            describe: 'If specified then only the first matching package.json property will be compiled.',
            type: 'boolean'
        })
            .option('create-ivy-entry-points', {
            describe: 'If specified then new `*_ivy_ngcc` entry-points will be added to package.json rather than modifying the ones in-place.\n' +
                'For this to work you need to have custom resolution set up (e.g. in webpack) to look for these new entry-points.\n' +
                'The Angular CLI does this already, so it is safe to use this option if the project is being built via the CLI.',
            type: 'boolean',
        })
            .option('async', {
            describe: 'Whether to compile asynchronously. This is enabled by default as it allows compilations to be parallelized.\n' +
                'Disabling asynchronous compilation may be useful for debugging.',
            type: 'boolean',
            default: true,
        })
            .option('l', {
            alias: 'loglevel',
            describe: 'The lowest severity logging message that should be output.',
            choices: ['debug', 'info', 'warn', 'error'],
        })
            .help()
            .parse(args);
        if (options_1['f'] && options_1['f'].length) {
            console.error('The formats option (-f/--formats) has been removed. Consider the properties option (-p/--properties) instead.');
            process.exit(1);
        }
        file_system_1.setFileSystem(new file_system_1.CachedFileSystem(new file_system_1.NodeJSFileSystem()));
        var baseSourcePath_1 = file_system_1.resolve(options_1['s'] || './node_modules');
        var propertiesToConsider_1 = options_1['p'];
        var targetEntryPointPath_1 = options_1['t'] ? options_1['t'] : undefined;
        var compileAllFormats_1 = !options_1['first-only'];
        var createNewEntryPointFormats_1 = options_1['create-ivy-entry-points'];
        var logLevel_1 = options_1['l'];
        (function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var logger, duration, e_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logger = logLevel_1 && new console_logger_1.ConsoleLogger(console_logger_1.LogLevel[logLevel_1]);
                        return [4 /*yield*/, main_1.mainNgcc({
                                basePath: baseSourcePath_1,
                                propertiesToConsider: propertiesToConsider_1,
                                targetEntryPointPath: targetEntryPointPath_1,
                                compileAllFormats: compileAllFormats_1,
                                createNewEntryPointFormats: createNewEntryPointFormats_1,
                                logger: logger,
                                async: options_1['async'],
                            })];
                    case 1:
                        _a.sent();
                        if (logger) {
                            duration = Math.round((Date.now() - startTime_1) / 1000);
                            logger.debug("Run ngcc in " + duration + "s.");
                        }
                        process.exitCode = 0;
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        console.error(e_1.stack || e_1.message);
                        process.exitCode = 1;
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); })();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1uZ2NjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2MvbWFpbi1uZ2NjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBUUEsaUJBc0dBOzs7SUE3R0E7Ozs7OztPQU1HO0lBQ0gsNkJBQStCO0lBRS9CLDJFQUFvRztJQUNwRyw0REFBb0M7SUFDcEMsd0ZBQXFFO0lBRXJFLGtCQUFrQjtJQUNsQixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLElBQU0sV0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFNLFNBQU8sR0FDVCxLQUFLO2FBQ0EsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsUUFBUSxFQUNKLHFGQUFxRjtZQUN6RixPQUFPLEVBQUUsZ0JBQWdCO1NBQzFCLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQzthQUMxRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFlBQVk7WUFDbkIsS0FBSyxFQUFFLElBQUk7WUFDWCxRQUFRLEVBQ0osMEZBQTBGO2dCQUMxRixxRUFBcUU7Z0JBQ3JFLDZFQUE2RTtnQkFDN0Usc0pBQXNKO1NBQzNKLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQ0osc0dBQXNHO1NBQzNHLENBQUM7YUFDRCxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3BCLFFBQVEsRUFDSixtRkFBbUY7WUFDdkYsSUFBSSxFQUFFLFNBQVM7U0FDaEIsQ0FBQzthQUNELE1BQU0sQ0FBQyx5QkFBeUIsRUFBRTtZQUNqQyxRQUFRLEVBQ0osMEhBQTBIO2dCQUMxSCxvSEFBb0g7Z0JBQ3BILGdIQUFnSDtZQUNwSCxJQUFJLEVBQUUsU0FBUztTQUNoQixDQUFDO2FBQ0QsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUNmLFFBQVEsRUFDSiwrR0FBK0c7Z0JBQy9HLGlFQUFpRTtZQUNyRSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1NBQ2QsQ0FBQzthQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsVUFBVTtZQUNqQixRQUFRLEVBQUUsNERBQTREO1lBQ3RFLE9BQU8sRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQztTQUM1QyxDQUFDO2FBQ0QsSUFBSSxFQUFFO2FBQ04sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXJCLElBQUksU0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFNBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUU7WUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FDVCwrR0FBK0csQ0FBQyxDQUFDO1lBQ3JILE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakI7UUFFRCwyQkFBYSxDQUFDLElBQUksOEJBQWdCLENBQUMsSUFBSSw4QkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU1RCxJQUFNLGdCQUFjLEdBQUcscUJBQU8sQ0FBQyxTQUFPLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLENBQUMsQ0FBQztRQUNqRSxJQUFNLHNCQUFvQixHQUFhLFNBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRCxJQUFNLHNCQUFvQixHQUFHLFNBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDckUsSUFBTSxtQkFBaUIsR0FBRyxDQUFDLFNBQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNqRCxJQUFNLDRCQUEwQixHQUFHLFNBQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3RFLElBQU0sVUFBUSxHQUFHLFNBQU8sQ0FBQyxHQUFHLENBQXNDLENBQUM7UUFFbkUsQ0FBQzs7Ozs7O3dCQUVTLE1BQU0sR0FBRyxVQUFRLElBQUksSUFBSSw4QkFBYSxDQUFDLHlCQUFRLENBQUMsVUFBUSxDQUFDLENBQUMsQ0FBQzt3QkFFakUscUJBQU0sZUFBUSxDQUFDO2dDQUNiLFFBQVEsRUFBRSxnQkFBYztnQ0FDeEIsb0JBQW9CLHdCQUFBO2dDQUNwQixvQkFBb0Isd0JBQUE7Z0NBQ3BCLGlCQUFpQixxQkFBQTtnQ0FDakIsMEJBQTBCLDhCQUFBO2dDQUMxQixNQUFNLFFBQUE7Z0NBQ04sS0FBSyxFQUFFLFNBQU8sQ0FBQyxPQUFPLENBQUM7NkJBQ3hCLENBQUMsRUFBQTs7d0JBUkYsU0FRRSxDQUFDO3dCQUVILElBQUksTUFBTSxFQUFFOzRCQUNKLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDOzRCQUM3RCxNQUFNLENBQUMsS0FBSyxDQUFDLGlCQUFlLFFBQVEsT0FBSSxDQUFDLENBQUM7eUJBQzNDO3dCQUVELE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDOzs7O3dCQUVyQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUMsQ0FBQyxLQUFLLElBQUksR0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUNwQyxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQzs7Ozs7YUFFeEIsQ0FBQyxFQUFFLENBQUM7S0FDTiIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHlhcmdzIGZyb20gJ3lhcmdzJztcblxuaW1wb3J0IHtyZXNvbHZlLCBzZXRGaWxlU3lzdGVtLCBDYWNoZWRGaWxlU3lzdGVtLCBOb2RlSlNGaWxlU3lzdGVtfSBmcm9tICcuLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHttYWluTmdjY30gZnJvbSAnLi9zcmMvbWFpbic7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXIsIExvZ0xldmVsfSBmcm9tICcuL3NyYy9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcblxuLy8gQ0xJIGVudHJ5IHBvaW50XG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICBjb25zdCBhcmdzID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBjb25zdCBvcHRpb25zID1cbiAgICAgIHlhcmdzXG4gICAgICAgICAgLm9wdGlvbigncycsIHtcbiAgICAgICAgICAgIGFsaWFzOiAnc291cmNlJyxcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdBIHBhdGggKHJlbGF0aXZlIHRvIHRoZSB3b3JraW5nIGRpcmVjdG9yeSkgb2YgdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0byBwcm9jZXNzLicsXG4gICAgICAgICAgICBkZWZhdWx0OiAnLi9ub2RlX21vZHVsZXMnXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdmJywge2FsaWFzOiAnZm9ybWF0cycsIGhpZGRlbjrCoHRydWUsIGFycmF5OiB0cnVlfSlcbiAgICAgICAgICAub3B0aW9uKCdwJywge1xuICAgICAgICAgICAgYWxpYXM6ICdwcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0FuIGFycmF5IG9mIG5hbWVzIG9mIHByb3BlcnRpZXMgaW4gcGFja2FnZS5qc29uIHRvIGNvbXBpbGUgKGUuZy4gYG1vZHVsZWAgb3IgYGVzMjAxNWApXFxuJyArXG4gICAgICAgICAgICAgICAgJ0VhY2ggb2YgdGhlc2UgcHJvcGVydGllcyBzaG91bGQgaG9sZCB0aGUgcGF0aCB0byBhIGJ1bmRsZS1mb3JtYXQuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIHByb3ZpZGVkLCBvbmx5IHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcyBhcmUgY29uc2lkZXJlZCBmb3IgcHJvY2Vzc2luZy5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgbm90IHByb3ZpZGVkLCBhbGwgdGhlIHN1cHBvcnRlZCBmb3JtYXQgcHJvcGVydGllcyAoZS5nLiBmZXNtMjAxNSwgZmVzbTUsIGVzMjAxNSwgZXNtMjAxNSwgZXNtNSwgbWFpbiwgbW9kdWxlKSBpbiB0aGUgcGFja2FnZS5qc29uIGFyZSBjb25zaWRlcmVkLidcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ3QnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3RhcmdldCcsXG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQSByZWxhdGl2ZSBwYXRoIChmcm9tIHRoZSBgc291cmNlYCBwYXRoKSB0byBhIHNpbmdsZSBlbnRyeS1wb2ludCB0byBwcm9jZXNzIChwbHVzIGl0cyBkZXBlbmRlbmNpZXMpLicsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdmaXJzdC1vbmx5Jywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHNwZWNpZmllZCB0aGVuIG9ubHkgdGhlIGZpcnN0IG1hdGNoaW5nIHBhY2thZ2UuanNvbiBwcm9wZXJ0eSB3aWxsIGJlIGNvbXBpbGVkLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2NyZWF0ZS1pdnktZW50cnktcG9pbnRzJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHNwZWNpZmllZCB0aGVuIG5ldyBgKl9pdnlfbmdjY2AgZW50cnktcG9pbnRzIHdpbGwgYmUgYWRkZWQgdG8gcGFja2FnZS5qc29uIHJhdGhlciB0aGFuIG1vZGlmeWluZyB0aGUgb25lcyBpbi1wbGFjZS5cXG4nICtcbiAgICAgICAgICAgICAgICAnRm9yIHRoaXMgdG8gd29yayB5b3UgbmVlZCB0byBoYXZlIGN1c3RvbSByZXNvbHV0aW9uIHNldCB1cCAoZS5nLiBpbiB3ZWJwYWNrKSB0byBsb29rIGZvciB0aGVzZSBuZXcgZW50cnktcG9pbnRzLlxcbicgK1xuICAgICAgICAgICAgICAgICdUaGUgQW5ndWxhciBDTEkgZG9lcyB0aGlzIGFscmVhZHksIHNvIGl0IGlzIHNhZmUgdG8gdXNlIHRoaXMgb3B0aW9uIGlmIHRoZSBwcm9qZWN0IGlzIGJlaW5nIGJ1aWx0IHZpYSB0aGUgQ0xJLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdhc3luYycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdXaGV0aGVyIHRvIGNvbXBpbGUgYXN5bmNocm9ub3VzbHkuIFRoaXMgaXMgZW5hYmxlZCBieSBkZWZhdWx0IGFzIGl0IGFsbG93cyBjb21waWxhdGlvbnMgdG8gYmUgcGFyYWxsZWxpemVkLlxcbicgK1xuICAgICAgICAgICAgICAgICdEaXNhYmxpbmcgYXN5bmNocm9ub3VzIGNvbXBpbGF0aW9uIG1heSBiZSB1c2VmdWwgZm9yIGRlYnVnZ2luZy4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2wnLCB7XG4gICAgICAgICAgICBhbGlhczogJ2xvZ2xldmVsJyxcbiAgICAgICAgICAgIGRlc2NyaWJlOiAnVGhlIGxvd2VzdCBzZXZlcml0eSBsb2dnaW5nIG1lc3NhZ2UgdGhhdCBzaG91bGQgYmUgb3V0cHV0LicsXG4gICAgICAgICAgICBjaG9pY2VzOiBbJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmhlbHAoKVxuICAgICAgICAgIC5wYXJzZShhcmdzKTtcblxuICBpZiAob3B0aW9uc1snZiddICYmIG9wdGlvbnNbJ2YnXS5sZW5ndGgpIHtcbiAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAnVGhlIGZvcm1hdHMgb3B0aW9uICgtZi8tLWZvcm1hdHMpIGhhcyBiZWVuIHJlbW92ZWQuIENvbnNpZGVyIHRoZSBwcm9wZXJ0aWVzIG9wdGlvbiAoLXAvLS1wcm9wZXJ0aWVzKSBpbnN0ZWFkLicpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxuXG4gIHNldEZpbGVTeXN0ZW0obmV3IENhY2hlZEZpbGVTeXN0ZW0obmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSkpO1xuXG4gIGNvbnN0IGJhc2VTb3VyY2VQYXRoID0gcmVzb2x2ZShvcHRpb25zWydzJ10gfHwgJy4vbm9kZV9tb2R1bGVzJyk7XG4gIGNvbnN0IHByb3BlcnRpZXNUb0NvbnNpZGVyOiBzdHJpbmdbXSA9IG9wdGlvbnNbJ3AnXTtcbiAgY29uc3QgdGFyZ2V0RW50cnlQb2ludFBhdGggPSBvcHRpb25zWyd0J10gPyBvcHRpb25zWyd0J10gOiB1bmRlZmluZWQ7XG4gIGNvbnN0IGNvbXBpbGVBbGxGb3JtYXRzID0gIW9wdGlvbnNbJ2ZpcnN0LW9ubHknXTtcbiAgY29uc3QgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMgPSBvcHRpb25zWydjcmVhdGUtaXZ5LWVudHJ5LXBvaW50cyddO1xuICBjb25zdCBsb2dMZXZlbCA9IG9wdGlvbnNbJ2wnXSBhcyBrZXlvZiB0eXBlb2YgTG9nTGV2ZWwgfCB1bmRlZmluZWQ7XG5cbiAgKGFzeW5jKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBsb2dnZXIgPSBsb2dMZXZlbCAmJiBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbFtsb2dMZXZlbF0pO1xuXG4gICAgICBhd2FpdCBtYWluTmdjYyh7XG4gICAgICAgIGJhc2VQYXRoOiBiYXNlU291cmNlUGF0aCxcbiAgICAgICAgcHJvcGVydGllc1RvQ29uc2lkZXIsXG4gICAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgICAgICBjb21waWxlQWxsRm9ybWF0cyxcbiAgICAgICAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMsXG4gICAgICAgIGxvZ2dlcixcbiAgICAgICAgYXN5bmM6IG9wdGlvbnNbJ2FzeW5jJ10sXG4gICAgICB9KTtcblxuICAgICAgaWYgKGxvZ2dlcikge1xuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgUnVuIG5nY2MgaW4gJHtkdXJhdGlvbn1zLmApO1xuICAgICAgfVxuXG4gICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2sgfHwgZS5tZXNzYWdlKTtcbiAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAxO1xuICAgIH1cbiAgfSkoKTtcbn1cbiJdfQ==