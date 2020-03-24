#!/usr/bin/env node
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/main-ngcc", ["require", "exports", "tslib", "yargs", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/main", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/logging/logger"], factory);
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
    var yargs = require("yargs");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var main_1 = require("@angular/compiler-cli/ngcc/src/main");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
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
            describe: 'A relative path (from the `source` path) to a single entry-point to process (plus its dependencies).\n' +
                'If this property is provided then `error-on-failed-entry-point` is forced to true',
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
            .option('legacy-message-ids', {
            describe: 'Render `$localize` messages with legacy format ids.\n' +
                'The default value is `true`. Only set this to `false` if you do not want legacy message ids to\n' +
                'be rendered. For example, if you are not using legacy message ids in your translation files\n' +
                'AND are not doing compile-time inlining of translations, in which case the extra message ids\n' +
                'would add unwanted size to the final source bundle.\n' +
                'It is safe to leave this set to true if you are doing compile-time inlining because the extra\n' +
                'legacy message ids will all be stripped during translation.',
            type: 'boolean',
            default: true,
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
            .option('invalidate-entry-point-manifest', {
            describe: 'If this is set then ngcc will not read an entry-point manifest file from disk.\n' +
                'Instead it will walk the directory tree as normal looking for entry-points, and then write a new manifest file.',
            type: 'boolean',
            default: false,
        })
            .option('error-on-failed-entry-point', {
            describe: 'Set this option in order to terminate immediately with an error code if an entry-point fails to be processed.\n' +
                'If `-t`/`--target` is provided then this property is always true and cannot be changed. Otherwise the default is false.\n' +
                'When set to false, ngcc will continue to process entry-points after a failure. In which case it will log an error and resume processing other entry-points.',
            type: 'boolean',
            default: false,
        })
            .option('tsconfig', {
            describe: 'A path to a tsconfig.json file that will be used to configure the Angular compiler and module resolution used by ngcc.\n' +
                'If not provided, ngcc will attempt to read a `tsconfig.json` file from the folder above that given by the `-s` option.\n' +
                'Set to false (via `--no-tsconfig`) if you do not want ngcc to use any `tsconfig.json` file.',
            type: 'string',
        })
            .strict()
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
        var enableI18nLegacyMessageIdFormat_1 = options_1['legacy-message-ids'];
        var invalidateEntryPointManifest_1 = options_1['invalidate-entry-point-manifest'];
        var errorOnFailedEntryPoint_1 = options_1['error-on-failed-entry-point'];
        // yargs is not so great at mixed string+boolean types, so we have to test tsconfig against a
        // string "false" to capture the `tsconfig=false` option.
        // And we have to convert the option to a string to handle `no-tsconfig`, which will be `false`.
        var tsConfigPath_1 = "" + options_1['tsconfig'] === 'false' ? null : options_1['tsconfig'];
        (function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var logger, duration, e_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logger = logLevel_1 && new console_logger_1.ConsoleLogger(logger_1.LogLevel[logLevel_1]);
                        return [4 /*yield*/, main_1.mainNgcc({
                                basePath: baseSourcePath_1,
                                propertiesToConsider: propertiesToConsider_1,
                                targetEntryPointPath: targetEntryPointPath_1,
                                compileAllFormats: compileAllFormats_1,
                                createNewEntryPointFormats: createNewEntryPointFormats_1,
                                logger: logger,
                                enableI18nLegacyMessageIdFormat: enableI18nLegacyMessageIdFormat_1,
                                async: options_1['async'], invalidateEntryPointManifest: invalidateEntryPointManifest_1, errorOnFailedEntryPoint: errorOnFailedEntryPoint_1, tsConfigPath: tsConfigPath_1
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1uZ2NjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2MvbWFpbi1uZ2NjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFDQTs7Ozs7O09BTUc7SUFDSCw2QkFBK0I7SUFFL0IsMkVBQW9HO0lBQ3BHLDREQUFvQztJQUNwQyx3RkFBMkQ7SUFDM0Qsd0VBQThDO0lBRTlDLGtCQUFrQjtJQUNsQixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLElBQU0sV0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFNLFNBQU8sR0FDVCxLQUFLO2FBQ0EsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsUUFBUSxFQUNKLHFGQUFxRjtZQUN6RixPQUFPLEVBQUUsZ0JBQWdCO1NBQzFCLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQzthQUMxRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFlBQVk7WUFDbkIsS0FBSyxFQUFFLElBQUk7WUFDWCxRQUFRLEVBQ0osMEZBQTBGO2dCQUMxRixxRUFBcUU7Z0JBQ3JFLDZFQUE2RTtnQkFDN0Usc0pBQXNKO1NBQzNKLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQ0osd0dBQXdHO2dCQUN4RyxtRkFBbUY7U0FDeEYsQ0FBQzthQUNELE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDcEIsUUFBUSxFQUNK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aWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHlhcmdzIGZyb20gJ3lhcmdzJztcblxuaW1wb3J0IHtyZXNvbHZlLCBzZXRGaWxlU3lzdGVtLCBDYWNoZWRGaWxlU3lzdGVtLCBOb2RlSlNGaWxlU3lzdGVtfSBmcm9tICcuLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHttYWluTmdjY30gZnJvbSAnLi9zcmMvbWFpbic7XG5pbXBvcnQge0NvbnNvbGVMb2dnZXJ9IGZyb20gJy4vc3JjL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dMZXZlbH0gZnJvbSAnLi9zcmMvbG9nZ2luZy9sb2dnZXInO1xuXG4vLyBDTEkgZW50cnkgcG9pbnRcbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gIGNvbnN0IGFyZ3MgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gIGNvbnN0IG9wdGlvbnMgPVxuICAgICAgeWFyZ3NcbiAgICAgICAgICAub3B0aW9uKCdzJywge1xuICAgICAgICAgICAgYWxpYXM6ICdzb3VyY2UnLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0EgcGF0aCAocmVsYXRpdmUgdG8gdGhlIHdvcmtpbmcgZGlyZWN0b3J5KSBvZiB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRvIHByb2Nlc3MuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6ICcuL25vZGVfbW9kdWxlcydcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2YnLCB7YWxpYXM6ICdmb3JtYXRzJywgaGlkZGVuOsKgdHJ1ZSwgYXJyYXk6IHRydWV9KVxuICAgICAgICAgIC5vcHRpb24oJ3AnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3Byb3BlcnRpZXMnLFxuICAgICAgICAgICAgYXJyYXk6IHRydWUsXG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQW4gYXJyYXkgb2YgbmFtZXMgb2YgcHJvcGVydGllcyBpbiBwYWNrYWdlLmpzb24gdG8gY29tcGlsZSAoZS5nLiBgbW9kdWxlYCBvciBgZXMyMDE1YClcXG4nICtcbiAgICAgICAgICAgICAgICAnRWFjaCBvZiB0aGVzZSBwcm9wZXJ0aWVzIHNob3VsZCBob2xkIHRoZSBwYXRoIHRvIGEgYnVuZGxlLWZvcm1hdC5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgcHJvdmlkZWQsIG9ubHkgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzIGFyZSBjb25zaWRlcmVkIGZvciBwcm9jZXNzaW5nLlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBub3QgcHJvdmlkZWQsIGFsbCB0aGUgc3VwcG9ydGVkIGZvcm1hdCBwcm9wZXJ0aWVzIChlLmcuIGZlc20yMDE1LCBmZXNtNSwgZXMyMDE1LCBlc20yMDE1LCBlc201LCBtYWluLCBtb2R1bGUpIGluIHRoZSBwYWNrYWdlLmpzb24gYXJlIGNvbnNpZGVyZWQuJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbigndCcsIHtcbiAgICAgICAgICAgIGFsaWFzOiAndGFyZ2V0JyxcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdBIHJlbGF0aXZlIHBhdGggKGZyb20gdGhlIGBzb3VyY2VgIHBhdGgpIHRvIGEgc2luZ2xlIGVudHJ5LXBvaW50IHRvIHByb2Nlc3MgKHBsdXMgaXRzIGRlcGVuZGVuY2llcykuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIHRoaXMgcHJvcGVydHkgaXMgcHJvdmlkZWQgdGhlbiBgZXJyb3Itb24tZmFpbGVkLWVudHJ5LXBvaW50YCBpcyBmb3JjZWQgdG8gdHJ1ZScsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdmaXJzdC1vbmx5Jywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHNwZWNpZmllZCB0aGVuIG9ubHkgdGhlIGZpcnN0IG1hdGNoaW5nIHBhY2thZ2UuanNvbiBwcm9wZXJ0eSB3aWxsIGJlIGNvbXBpbGVkLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2NyZWF0ZS1pdnktZW50cnktcG9pbnRzJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHNwZWNpZmllZCB0aGVuIG5ldyBgKl9pdnlfbmdjY2AgZW50cnktcG9pbnRzIHdpbGwgYmUgYWRkZWQgdG8gcGFja2FnZS5qc29uIHJhdGhlciB0aGFuIG1vZGlmeWluZyB0aGUgb25lcyBpbi1wbGFjZS5cXG4nICtcbiAgICAgICAgICAgICAgICAnRm9yIHRoaXMgdG8gd29yayB5b3UgbmVlZCB0byBoYXZlIGN1c3RvbSByZXNvbHV0aW9uIHNldCB1cCAoZS5nLiBpbiB3ZWJwYWNrKSB0byBsb29rIGZvciB0aGVzZSBuZXcgZW50cnktcG9pbnRzLlxcbicgK1xuICAgICAgICAgICAgICAgICdUaGUgQW5ndWxhciBDTEkgZG9lcyB0aGlzIGFscmVhZHksIHNvIGl0IGlzIHNhZmUgdG8gdXNlIHRoaXMgb3B0aW9uIGlmIHRoZSBwcm9qZWN0IGlzIGJlaW5nIGJ1aWx0IHZpYSB0aGUgQ0xJLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdsZWdhY3ktbWVzc2FnZS1pZHMnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTogJ1JlbmRlciBgJGxvY2FsaXplYCBtZXNzYWdlcyB3aXRoIGxlZ2FjeSBmb3JtYXQgaWRzLlxcbicgK1xuICAgICAgICAgICAgICAgICdUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAuIE9ubHkgc2V0IHRoaXMgdG8gYGZhbHNlYCBpZiB5b3UgZG8gbm90IHdhbnQgbGVnYWN5IG1lc3NhZ2UgaWRzIHRvXFxuJyArXG4gICAgICAgICAgICAgICAgJ2JlIHJlbmRlcmVkLiBGb3IgZXhhbXBsZSwgaWYgeW91IGFyZSBub3QgdXNpbmcgbGVnYWN5IG1lc3NhZ2UgaWRzIGluIHlvdXIgdHJhbnNsYXRpb24gZmlsZXNcXG4nICtcbiAgICAgICAgICAgICAgICAnQU5EIGFyZSBub3QgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIG9mIHRyYW5zbGF0aW9ucywgaW4gd2hpY2ggY2FzZSB0aGUgZXh0cmEgbWVzc2FnZSBpZHNcXG4nICtcbiAgICAgICAgICAgICAgICAnd291bGQgYWRkIHVud2FudGVkIHNpemUgdG8gdGhlIGZpbmFsIHNvdXJjZSBidW5kbGUuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0l0IGlzIHNhZmUgdG8gbGVhdmUgdGhpcyBzZXQgdG8gdHJ1ZSBpZiB5b3UgYXJlIGRvaW5nIGNvbXBpbGUtdGltZSBpbmxpbmluZyBiZWNhdXNlIHRoZSBleHRyYVxcbicgK1xuICAgICAgICAgICAgICAgICdsZWdhY3kgbWVzc2FnZSBpZHMgd2lsbCBhbGwgYmUgc3RyaXBwZWQgZHVyaW5nIHRyYW5zbGF0aW9uLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignYXN5bmMnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnV2hldGhlciB0byBjb21waWxlIGFzeW5jaHJvbm91c2x5LiBUaGlzIGlzIGVuYWJsZWQgYnkgZGVmYXVsdCBhcyBpdCBhbGxvd3MgY29tcGlsYXRpb25zIHRvIGJlIHBhcmFsbGVsaXplZC5cXG4nICtcbiAgICAgICAgICAgICAgICAnRGlzYWJsaW5nIGFzeW5jaHJvbm91cyBjb21waWxhdGlvbiBtYXkgYmUgdXNlZnVsIGZvciBkZWJ1Z2dpbmcuJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdsJywge1xuICAgICAgICAgICAgYWxpYXM6ICdsb2dsZXZlbCcsXG4gICAgICAgICAgICBkZXNjcmliZTogJ1RoZSBsb3dlc3Qgc2V2ZXJpdHkgbG9nZ2luZyBtZXNzYWdlIHRoYXQgc2hvdWxkIGJlIG91dHB1dC4nLFxuICAgICAgICAgICAgY2hvaWNlczogWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2ludmFsaWRhdGUtZW50cnktcG9pbnQtbWFuaWZlc3QnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnSWYgdGhpcyBpcyBzZXQgdGhlbiBuZ2NjIHdpbGwgbm90IHJlYWQgYW4gZW50cnktcG9pbnQgbWFuaWZlc3QgZmlsZSBmcm9tIGRpc2suXFxuJyArXG4gICAgICAgICAgICAgICAgJ0luc3RlYWQgaXQgd2lsbCB3YWxrIHRoZSBkaXJlY3RvcnkgdHJlZSBhcyBub3JtYWwgbG9va2luZyBmb3IgZW50cnktcG9pbnRzLCBhbmQgdGhlbiB3cml0ZSBhIG5ldyBtYW5pZmVzdCBmaWxlLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2Vycm9yLW9uLWZhaWxlZC1lbnRyeS1wb2ludCcsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdTZXQgdGhpcyBvcHRpb24gaW4gb3JkZXIgdG8gdGVybWluYXRlIGltbWVkaWF0ZWx5IHdpdGggYW4gZXJyb3IgY29kZSBpZiBhbiBlbnRyeS1wb2ludCBmYWlscyB0byBiZSBwcm9jZXNzZWQuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIGAtdGAvYC0tdGFyZ2V0YCBpcyBwcm92aWRlZCB0aGVuIHRoaXMgcHJvcGVydHkgaXMgYWx3YXlzIHRydWUgYW5kIGNhbm5vdCBiZSBjaGFuZ2VkLiBPdGhlcndpc2UgdGhlIGRlZmF1bHQgaXMgZmFsc2UuXFxuJyArXG4gICAgICAgICAgICAgICAgJ1doZW4gc2V0IHRvIGZhbHNlLCBuZ2NjIHdpbGwgY29udGludWUgdG8gcHJvY2VzcyBlbnRyeS1wb2ludHMgYWZ0ZXIgYSBmYWlsdXJlLiBJbiB3aGljaCBjYXNlIGl0IHdpbGwgbG9nIGFuIGVycm9yIGFuZCByZXN1bWUgcHJvY2Vzc2luZyBvdGhlciBlbnRyeS1wb2ludHMuJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbigndHNjb25maWcnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQSBwYXRoIHRvIGEgdHNjb25maWcuanNvbiBmaWxlIHRoYXQgd2lsbCBiZSB1c2VkIHRvIGNvbmZpZ3VyZSB0aGUgQW5ndWxhciBjb21waWxlciBhbmQgbW9kdWxlIHJlc29sdXRpb24gdXNlZCBieSBuZ2NjLlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBub3QgcHJvdmlkZWQsIG5nY2Mgd2lsbCBhdHRlbXB0IHRvIHJlYWQgYSBgdHNjb25maWcuanNvbmAgZmlsZSBmcm9tIHRoZSBmb2xkZXIgYWJvdmUgdGhhdCBnaXZlbiBieSB0aGUgYC1zYCBvcHRpb24uXFxuJyArXG4gICAgICAgICAgICAgICAgJ1NldCB0byBmYWxzZSAodmlhIGAtLW5vLXRzY29uZmlnYCkgaWYgeW91IGRvIG5vdCB3YW50IG5nY2MgdG8gdXNlIGFueSBgdHNjb25maWcuanNvbmAgZmlsZS4nLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuc3RyaWN0KClcbiAgICAgICAgICAuaGVscCgpXG4gICAgICAgICAgLnBhcnNlKGFyZ3MpO1xuXG4gIGlmIChvcHRpb25zWydmJ10gJiYgb3B0aW9uc1snZiddLmxlbmd0aCkge1xuICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICdUaGUgZm9ybWF0cyBvcHRpb24gKC1mLy0tZm9ybWF0cykgaGFzIGJlZW4gcmVtb3ZlZC4gQ29uc2lkZXIgdGhlIHByb3BlcnRpZXMgb3B0aW9uICgtcC8tLXByb3BlcnRpZXMpIGluc3RlYWQuJyk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG5cbiAgc2V0RmlsZVN5c3RlbShuZXcgQ2FjaGVkRmlsZVN5c3RlbShuZXcgTm9kZUpTRmlsZVN5c3RlbSgpKSk7XG5cbiAgY29uc3QgYmFzZVNvdXJjZVBhdGggPSByZXNvbHZlKG9wdGlvbnNbJ3MnXSB8fCAnLi9ub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdID0gb3B0aW9uc1sncCddO1xuICBjb25zdCB0YXJnZXRFbnRyeVBvaW50UGF0aCA9IG9wdGlvbnNbJ3QnXSA/IG9wdGlvbnNbJ3QnXSA6IHVuZGVmaW5lZDtcbiAgY29uc3QgY29tcGlsZUFsbEZvcm1hdHMgPSAhb3B0aW9uc1snZmlyc3Qtb25seSddO1xuICBjb25zdCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IG9wdGlvbnNbJ2NyZWF0ZS1pdnktZW50cnktcG9pbnRzJ107XG4gIGNvbnN0IGxvZ0xldmVsID0gb3B0aW9uc1snbCddIGFzIGtleW9mIHR5cGVvZiBMb2dMZXZlbCB8IHVuZGVmaW5lZDtcbiAgY29uc3QgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCA9IG9wdGlvbnNbJ2xlZ2FjeS1tZXNzYWdlLWlkcyddO1xuICBjb25zdCBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0ID0gb3B0aW9uc1snaW52YWxpZGF0ZS1lbnRyeS1wb2ludC1tYW5pZmVzdCddO1xuICBjb25zdCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCA9IG9wdGlvbnNbJ2Vycm9yLW9uLWZhaWxlZC1lbnRyeS1wb2ludCddO1xuICAvLyB5YXJncyBpcyBub3Qgc28gZ3JlYXQgYXQgbWl4ZWQgc3RyaW5nK2Jvb2xlYW4gdHlwZXMsIHNvIHdlIGhhdmUgdG8gdGVzdCB0c2NvbmZpZyBhZ2FpbnN0IGFcbiAgLy8gc3RyaW5nIFwiZmFsc2VcIiB0byBjYXB0dXJlIHRoZSBgdHNjb25maWc9ZmFsc2VgIG9wdGlvbi5cbiAgLy8gQW5kIHdlIGhhdmUgdG8gY29udmVydCB0aGUgb3B0aW9uIHRvIGEgc3RyaW5nIHRvIGhhbmRsZSBgbm8tdHNjb25maWdgLCB3aGljaCB3aWxsIGJlIGBmYWxzZWAuXG4gIGNvbnN0IHRzQ29uZmlnUGF0aCA9IGAke29wdGlvbnNbJ3RzY29uZmlnJ119YCA9PT0gJ2ZhbHNlJyA/IG51bGwgOiBvcHRpb25zWyd0c2NvbmZpZyddO1xuXG4gIChhc3luYygpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbG9nZ2VyID0gbG9nTGV2ZWwgJiYgbmV3IENvbnNvbGVMb2dnZXIoTG9nTGV2ZWxbbG9nTGV2ZWxdKTtcblxuICAgICAgYXdhaXQgbWFpbk5nY2Moe1xuICAgICAgICBiYXNlUGF0aDogYmFzZVNvdXJjZVBhdGgsXG4gICAgICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyLFxuICAgICAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCxcbiAgICAgICAgY29tcGlsZUFsbEZvcm1hdHMsXG4gICAgICAgIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzLFxuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICAgIGFzeW5jOiBvcHRpb25zWydhc3luYyddLCBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0LCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCwgdHNDb25maWdQYXRoXG4gICAgICB9KTtcblxuICAgICAgaWYgKGxvZ2dlcikge1xuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgUnVuIG5nY2MgaW4gJHtkdXJhdGlvbn1zLmApO1xuICAgICAgfVxuXG4gICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2sgfHwgZS5tZXNzYWdlKTtcbiAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAxO1xuICAgIH1cbiAgfSkoKTtcbn1cbiJdfQ==