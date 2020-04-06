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
                                async: options_1['async'],
                                invalidateEntryPointManifest: invalidateEntryPointManifest_1,
                                errorOnFailedEntryPoint: errorOnFailedEntryPoint_1,
                                tsConfigPath: tsConfigPath_1
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1uZ2NjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2MvbWFpbi1uZ2NjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFDQTs7Ozs7O09BTUc7SUFDSCw2QkFBK0I7SUFFL0IsMkVBQW9HO0lBQ3BHLDREQUFvQztJQUNwQyx3RkFBMkQ7SUFDM0Qsd0VBQThDO0lBRTlDLGtCQUFrQjtJQUNsQixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLElBQU0sV0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFNLFNBQU8sR0FDVCxLQUFLO2FBQ0EsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsUUFBUSxFQUNKLHFGQUFxRjtZQUN6RixPQUFPLEVBQUUsZ0JBQWdCO1NBQzFCLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQzthQUMxRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFlBQVk7WUFDbkIsS0FBSyxFQUFFLElBQUk7WUFDWCxRQUFRLEVBQ0osMEZBQTBGO2dCQUMxRixxRUFBcUU7Z0JBQ3JFLDZFQUE2RTtnQkFDN0Usc0pBQXNKO1NBQzNKLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQ0osd0dBQXdHO2dCQUN4RyxtRkFBbUY7U0FDeEYsQ0FBQzthQUNELE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDcEIsUUFBUSxFQUNK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Q29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgeWFyZ3MgZnJvbSAneWFyZ3MnO1xuXG5pbXBvcnQge3Jlc29sdmUsIHNldEZpbGVTeXN0ZW0sIENhY2hlZEZpbGVTeXN0ZW0sIE5vZGVKU0ZpbGVTeXN0ZW19IGZyb20gJy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge21haW5OZ2NjfSBmcm9tICcuL3NyYy9tYWluJztcbmltcG9ydCB7Q29uc29sZUxvZ2dlcn0gZnJvbSAnLi9zcmMvbG9nZ2luZy9jb25zb2xlX2xvZ2dlcic7XG5pbXBvcnQge0xvZ0xldmVsfSBmcm9tICcuL3NyYy9sb2dnaW5nL2xvZ2dlcic7XG5cbi8vIENMSSBlbnRyeSBwb2ludFxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgY29uc3QgYXJncyA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgY29uc3Qgb3B0aW9ucyA9XG4gICAgICB5YXJnc1xuICAgICAgICAgIC5vcHRpb24oJ3MnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3NvdXJjZScsXG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQSBwYXRoIChyZWxhdGl2ZSB0byB0aGUgd29ya2luZyBkaXJlY3RvcnkpIG9mIHRoZSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdG8gcHJvY2Vzcy4nLFxuICAgICAgICAgICAgZGVmYXVsdDogJy4vbm9kZV9tb2R1bGVzJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignZicsIHthbGlhczogJ2Zvcm1hdHMnLCBoaWRkZW46wqB0cnVlLCBhcnJheTogdHJ1ZX0pXG4gICAgICAgICAgLm9wdGlvbigncCcsIHtcbiAgICAgICAgICAgIGFsaWFzOiAncHJvcGVydGllcycsXG4gICAgICAgICAgICBhcnJheTogdHJ1ZSxcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdBbiBhcnJheSBvZiBuYW1lcyBvZiBwcm9wZXJ0aWVzIGluIHBhY2thZ2UuanNvbiB0byBjb21waWxlIChlLmcuIGBtb2R1bGVgIG9yIGBlczIwMTVgKVxcbicgK1xuICAgICAgICAgICAgICAgICdFYWNoIG9mIHRoZXNlIHByb3BlcnRpZXMgc2hvdWxkIGhvbGQgdGhlIHBhdGggdG8gYSBidW5kbGUtZm9ybWF0LlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBwcm92aWRlZCwgb25seSB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMgYXJlIGNvbnNpZGVyZWQgZm9yIHByb2Nlc3NpbmcuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIG5vdCBwcm92aWRlZCwgYWxsIHRoZSBzdXBwb3J0ZWQgZm9ybWF0IHByb3BlcnRpZXMgKGUuZy4gZmVzbTIwMTUsIGZlc201LCBlczIwMTUsIGVzbTIwMTUsIGVzbTUsIG1haW4sIG1vZHVsZSkgaW4gdGhlIHBhY2thZ2UuanNvbiBhcmUgY29uc2lkZXJlZC4nXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCd0Jywge1xuICAgICAgICAgICAgYWxpYXM6ICd0YXJnZXQnLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0EgcmVsYXRpdmUgcGF0aCAoZnJvbSB0aGUgYHNvdXJjZWAgcGF0aCkgdG8gYSBzaW5nbGUgZW50cnktcG9pbnQgdG8gcHJvY2VzcyAocGx1cyBpdHMgZGVwZW5kZW5jaWVzKS5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgdGhpcyBwcm9wZXJ0eSBpcyBwcm92aWRlZCB0aGVuIGBlcnJvci1vbi1mYWlsZWQtZW50cnktcG9pbnRgIGlzIGZvcmNlZCB0byB0cnVlJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2ZpcnN0LW9ubHknLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnSWYgc3BlY2lmaWVkIHRoZW4gb25seSB0aGUgZmlyc3QgbWF0Y2hpbmcgcGFja2FnZS5qc29uIHByb3BlcnR5IHdpbGwgYmUgY29tcGlsZWQuJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignY3JlYXRlLWl2eS1lbnRyeS1wb2ludHMnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnSWYgc3BlY2lmaWVkIHRoZW4gbmV3IGAqX2l2eV9uZ2NjYCBlbnRyeS1wb2ludHMgd2lsbCBiZSBhZGRlZCB0byBwYWNrYWdlLmpzb24gcmF0aGVyIHRoYW4gbW9kaWZ5aW5nIHRoZSBvbmVzIGluLXBsYWNlLlxcbicgK1xuICAgICAgICAgICAgICAgICdGb3IgdGhpcyB0byB3b3JrIHlvdSBuZWVkIHRvIGhhdmUgY3VzdG9tIHJlc29sdXRpb24gc2V0IHVwIChlLmcuIGluIHdlYnBhY2spIHRvIGxvb2sgZm9yIHRoZXNlIG5ldyBlbnRyeS1wb2ludHMuXFxuJyArXG4gICAgICAgICAgICAgICAgJ1RoZSBBbmd1bGFyIENMSSBkb2VzIHRoaXMgYWxyZWFkeSwgc28gaXQgaXMgc2FmZSB0byB1c2UgdGhpcyBvcHRpb24gaWYgdGhlIHByb2plY3QgaXMgYmVpbmcgYnVpbHQgdmlhIHRoZSBDTEkuJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2xlZ2FjeS1tZXNzYWdlLWlkcycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOiAnUmVuZGVyIGAkbG9jYWxpemVgIG1lc3NhZ2VzIHdpdGggbGVnYWN5IGZvcm1hdCBpZHMuXFxuJyArXG4gICAgICAgICAgICAgICAgJ1RoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC4gT25seSBzZXQgdGhpcyB0byBgZmFsc2VgIGlmIHlvdSBkbyBub3Qgd2FudCBsZWdhY3kgbWVzc2FnZSBpZHMgdG9cXG4nICtcbiAgICAgICAgICAgICAgICAnYmUgcmVuZGVyZWQuIEZvciBleGFtcGxlLCBpZiB5b3UgYXJlIG5vdCB1c2luZyBsZWdhY3kgbWVzc2FnZSBpZHMgaW4geW91ciB0cmFuc2xhdGlvbiBmaWxlc1xcbicgK1xuICAgICAgICAgICAgICAgICdBTkQgYXJlIG5vdCBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgb2YgdHJhbnNsYXRpb25zLCBpbiB3aGljaCBjYXNlIHRoZSBleHRyYSBtZXNzYWdlIGlkc1xcbicgK1xuICAgICAgICAgICAgICAgICd3b3VsZCBhZGQgdW53YW50ZWQgc2l6ZSB0byB0aGUgZmluYWwgc291cmNlIGJ1bmRsZS5cXG4nICtcbiAgICAgICAgICAgICAgICAnSXQgaXMgc2FmZSB0byBsZWF2ZSB0aGlzIHNldCB0byB0cnVlIGlmIHlvdSBhcmUgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIGJlY2F1c2UgdGhlIGV4dHJhXFxuJyArXG4gICAgICAgICAgICAgICAgJ2xlZ2FjeSBtZXNzYWdlIGlkcyB3aWxsIGFsbCBiZSBzdHJpcHBlZCBkdXJpbmcgdHJhbnNsYXRpb24uJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdhc3luYycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdXaGV0aGVyIHRvIGNvbXBpbGUgYXN5bmNocm9ub3VzbHkuIFRoaXMgaXMgZW5hYmxlZCBieSBkZWZhdWx0IGFzIGl0IGFsbG93cyBjb21waWxhdGlvbnMgdG8gYmUgcGFyYWxsZWxpemVkLlxcbicgK1xuICAgICAgICAgICAgICAgICdEaXNhYmxpbmcgYXN5bmNocm9ub3VzIGNvbXBpbGF0aW9uIG1heSBiZSB1c2VmdWwgZm9yIGRlYnVnZ2luZy4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2wnLCB7XG4gICAgICAgICAgICBhbGlhczogJ2xvZ2xldmVsJyxcbiAgICAgICAgICAgIGRlc2NyaWJlOiAnVGhlIGxvd2VzdCBzZXZlcml0eSBsb2dnaW5nIG1lc3NhZ2UgdGhhdCBzaG91bGQgYmUgb3V0cHV0LicsXG4gICAgICAgICAgICBjaG9pY2VzOiBbJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignaW52YWxpZGF0ZS1lbnRyeS1wb2ludC1tYW5pZmVzdCcsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdJZiB0aGlzIGlzIHNldCB0aGVuIG5nY2Mgd2lsbCBub3QgcmVhZCBhbiBlbnRyeS1wb2ludCBtYW5pZmVzdCBmaWxlIGZyb20gZGlzay5cXG4nICtcbiAgICAgICAgICAgICAgICAnSW5zdGVhZCBpdCB3aWxsIHdhbGsgdGhlIGRpcmVjdG9yeSB0cmVlIGFzIG5vcm1hbCBsb29raW5nIGZvciBlbnRyeS1wb2ludHMsIGFuZCB0aGVuIHdyaXRlIGEgbmV3IG1hbmlmZXN0IGZpbGUuJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignZXJyb3Itb24tZmFpbGVkLWVudHJ5LXBvaW50Jywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ1NldCB0aGlzIG9wdGlvbiBpbiBvcmRlciB0byB0ZXJtaW5hdGUgaW1tZWRpYXRlbHkgd2l0aCBhbiBlcnJvciBjb2RlIGlmIGFuIGVudHJ5LXBvaW50IGZhaWxzIHRvIGJlIHByb2Nlc3NlZC5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgYC10YC9gLS10YXJnZXRgIGlzIHByb3ZpZGVkIHRoZW4gdGhpcyBwcm9wZXJ0eSBpcyBhbHdheXMgdHJ1ZSBhbmQgY2Fubm90IGJlIGNoYW5nZWQuIE90aGVyd2lzZSB0aGUgZGVmYXVsdCBpcyBmYWxzZS5cXG4nICtcbiAgICAgICAgICAgICAgICAnV2hlbiBzZXQgdG8gZmFsc2UsIG5nY2Mgd2lsbCBjb250aW51ZSB0byBwcm9jZXNzIGVudHJ5LXBvaW50cyBhZnRlciBhIGZhaWx1cmUuIEluIHdoaWNoIGNhc2UgaXQgd2lsbCBsb2cgYW4gZXJyb3IgYW5kIHJlc3VtZSBwcm9jZXNzaW5nIG90aGVyIGVudHJ5LXBvaW50cy4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCd0c2NvbmZpZycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdBIHBhdGggdG8gYSB0c2NvbmZpZy5qc29uIGZpbGUgdGhhdCB3aWxsIGJlIHVzZWQgdG8gY29uZmlndXJlIHRoZSBBbmd1bGFyIGNvbXBpbGVyIGFuZCBtb2R1bGUgcmVzb2x1dGlvbiB1c2VkIGJ5IG5nY2MuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIG5vdCBwcm92aWRlZCwgbmdjYyB3aWxsIGF0dGVtcHQgdG8gcmVhZCBhIGB0c2NvbmZpZy5qc29uYCBmaWxlIGZyb20gdGhlIGZvbGRlciBhYm92ZSB0aGF0IGdpdmVuIGJ5IHRoZSBgLXNgIG9wdGlvbi5cXG4nICtcbiAgICAgICAgICAgICAgICAnU2V0IHRvIGZhbHNlICh2aWEgYC0tbm8tdHNjb25maWdgKSBpZiB5b3UgZG8gbm90IHdhbnQgbmdjYyB0byB1c2UgYW55IGB0c2NvbmZpZy5qc29uYCBmaWxlLicsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHJpY3QoKVxuICAgICAgICAgIC5oZWxwKClcbiAgICAgICAgICAucGFyc2UoYXJncyk7XG5cbiAgaWYgKG9wdGlvbnNbJ2YnXSAmJiBvcHRpb25zWydmJ10ubGVuZ3RoKSB7XG4gICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgJ1RoZSBmb3JtYXRzIG9wdGlvbiAoLWYvLS1mb3JtYXRzKSBoYXMgYmVlbiByZW1vdmVkLiBDb25zaWRlciB0aGUgcHJvcGVydGllcyBvcHRpb24gKC1wLy0tcHJvcGVydGllcykgaW5zdGVhZC4nKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cblxuICBzZXRGaWxlU3lzdGVtKG5ldyBDYWNoZWRGaWxlU3lzdGVtKG5ldyBOb2RlSlNGaWxlU3lzdGVtKCkpKTtcblxuICBjb25zdCBiYXNlU291cmNlUGF0aCA9IHJlc29sdmUob3B0aW9uc1sncyddIHx8ICcuL25vZGVfbW9kdWxlcycpO1xuICBjb25zdCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10gPSBvcHRpb25zWydwJ107XG4gIGNvbnN0IHRhcmdldEVudHJ5UG9pbnRQYXRoID0gb3B0aW9uc1sndCddID8gb3B0aW9uc1sndCddIDogdW5kZWZpbmVkO1xuICBjb25zdCBjb21waWxlQWxsRm9ybWF0cyA9ICFvcHRpb25zWydmaXJzdC1vbmx5J107XG4gIGNvbnN0IGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID0gb3B0aW9uc1snY3JlYXRlLWl2eS1lbnRyeS1wb2ludHMnXTtcbiAgY29uc3QgbG9nTGV2ZWwgPSBvcHRpb25zWydsJ10gYXMga2V5b2YgdHlwZW9mIExvZ0xldmVsIHwgdW5kZWZpbmVkO1xuICBjb25zdCBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID0gb3B0aW9uc1snbGVnYWN5LW1lc3NhZ2UtaWRzJ107XG4gIGNvbnN0IGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QgPSBvcHRpb25zWydpbnZhbGlkYXRlLWVudHJ5LXBvaW50LW1hbmlmZXN0J107XG4gIGNvbnN0IGVycm9yT25GYWlsZWRFbnRyeVBvaW50ID0gb3B0aW9uc1snZXJyb3Itb24tZmFpbGVkLWVudHJ5LXBvaW50J107XG4gIC8vIHlhcmdzIGlzIG5vdCBzbyBncmVhdCBhdCBtaXhlZCBzdHJpbmcrYm9vbGVhbiB0eXBlcywgc28gd2UgaGF2ZSB0byB0ZXN0IHRzY29uZmlnIGFnYWluc3QgYVxuICAvLyBzdHJpbmcgXCJmYWxzZVwiIHRvIGNhcHR1cmUgdGhlIGB0c2NvbmZpZz1mYWxzZWAgb3B0aW9uLlxuICAvLyBBbmQgd2UgaGF2ZSB0byBjb252ZXJ0IHRoZSBvcHRpb24gdG8gYSBzdHJpbmcgdG8gaGFuZGxlIGBuby10c2NvbmZpZ2AsIHdoaWNoIHdpbGwgYmUgYGZhbHNlYC5cbiAgY29uc3QgdHNDb25maWdQYXRoID0gYCR7b3B0aW9uc1sndHNjb25maWcnXX1gID09PSAnZmFsc2UnID8gbnVsbCA6IG9wdGlvbnNbJ3RzY29uZmlnJ107XG5cbiAgKGFzeW5jICgpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbG9nZ2VyID0gbG9nTGV2ZWwgJiYgbmV3IENvbnNvbGVMb2dnZXIoTG9nTGV2ZWxbbG9nTGV2ZWxdKTtcblxuICAgICAgYXdhaXQgbWFpbk5nY2Moe1xuICAgICAgICBiYXNlUGF0aDogYmFzZVNvdXJjZVBhdGgsXG4gICAgICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyLFxuICAgICAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCxcbiAgICAgICAgY29tcGlsZUFsbEZvcm1hdHMsXG4gICAgICAgIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzLFxuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICAgIGFzeW5jOiBvcHRpb25zWydhc3luYyddLFxuICAgICAgICBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0LFxuICAgICAgICBlcnJvck9uRmFpbGVkRW50cnlQb2ludCxcbiAgICAgICAgdHNDb25maWdQYXRoXG4gICAgICB9KTtcblxuICAgICAgaWYgKGxvZ2dlcikge1xuICAgICAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwMCk7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZyhgUnVuIG5nY2MgaW4gJHtkdXJhdGlvbn1zLmApO1xuICAgICAgfVxuXG4gICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2sgfHwgZS5tZXNzYWdlKTtcbiAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAxO1xuICAgIH1cbiAgfSkoKTtcbn1cbiJdfQ==