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
                                async: options_1['async'], invalidateEntryPointManifest: invalidateEntryPointManifest_1, errorOnFailedEntryPoint: errorOnFailedEntryPoint_1,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1uZ2NjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2MvbWFpbi1uZ2NjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFDQTs7Ozs7O09BTUc7SUFDSCw2QkFBK0I7SUFFL0IsMkVBQW9HO0lBQ3BHLDREQUFvQztJQUNwQyx3RkFBMkQ7SUFDM0Qsd0VBQThDO0lBRTlDLGtCQUFrQjtJQUNsQixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLElBQU0sV0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxJQUFNLFNBQU8sR0FDVCxLQUFLO2FBQ0EsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsUUFBUSxFQUNKLHFGQUFxRjtZQUN6RixPQUFPLEVBQUUsZ0JBQWdCO1NBQzFCLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQzthQUMxRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFlBQVk7WUFDbkIsS0FBSyxFQUFFLElBQUk7WUFDWCxRQUFRLEVBQ0osMEZBQTBGO2dCQUMxRixxRUFBcUU7Z0JBQ3JFLDZFQUE2RTtnQkFDN0Usc0pBQXNKO1NBQzNKLENBQUM7YUFDRCxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQ0osd0dBQXdHO2dCQUN4RyxtRkFBbUY7U0FDeEYsQ0FBQzthQUNELE1BQU0sQ0FBQyxZQUFZLEVBQUU7WUFDcEIsUUFBUSxFQUNK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Q3BCLG9CQUFvQix3QkFBQTtnQ0FDcEIsaUJBQWlCLHFCQUFBO2dDQUNqQiwwQkFBMEIsOEJBQUE7Z0NBQzFCLE1BQU0sUUFBQTtnQ0FDTiwrQkFBK0IsbUNBQUE7Z0NBQy9CLEtBQUssRUFBRSxTQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsNEJBQTRCLGdDQUFBLEVBQUUsdUJBQXVCLDJCQUFBOzZCQUMvRSxDQUFDLEVBQUE7O3dCQVRGLFNBU0UsQ0FBQzt3QkFFSCxJQUFJLE1BQU0sRUFBRTs0QkFDSixRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxXQUFTLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQzs0QkFDN0QsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBZSxRQUFRLE9BQUksQ0FBQyxDQUFDO3lCQUMzQzt3QkFFRCxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQzs7Ozt3QkFFckIsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFDLENBQUMsS0FBSyxJQUFJLEdBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDcEMsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7Ozs7O2FBRXhCLENBQUMsRUFBRSxDQUFDO0tBQ04iLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB5YXJncyBmcm9tICd5YXJncyc7XG5cbmltcG9ydCB7cmVzb2x2ZSwgc2V0RmlsZVN5c3RlbSwgQ2FjaGVkRmlsZVN5c3RlbSwgTm9kZUpTRmlsZVN5c3RlbX0gZnJvbSAnLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7bWFpbk5nY2N9IGZyb20gJy4vc3JjL21haW4nO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyfSBmcm9tICcuL3NyYy9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmltcG9ydCB7TG9nTGV2ZWx9IGZyb20gJy4vc3JjL2xvZ2dpbmcvbG9nZ2VyJztcblxuLy8gQ0xJIGVudHJ5IHBvaW50XG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICBjb25zdCBhcmdzID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBjb25zdCBvcHRpb25zID1cbiAgICAgIHlhcmdzXG4gICAgICAgICAgLm9wdGlvbigncycsIHtcbiAgICAgICAgICAgIGFsaWFzOiAnc291cmNlJyxcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdBIHBhdGggKHJlbGF0aXZlIHRvIHRoZSB3b3JraW5nIGRpcmVjdG9yeSkgb2YgdGhlIGBub2RlX21vZHVsZXNgIGZvbGRlciB0byBwcm9jZXNzLicsXG4gICAgICAgICAgICBkZWZhdWx0OiAnLi9ub2RlX21vZHVsZXMnXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdmJywge2FsaWFzOiAnZm9ybWF0cycsIGhpZGRlbjrCoHRydWUsIGFycmF5OiB0cnVlfSlcbiAgICAgICAgICAub3B0aW9uKCdwJywge1xuICAgICAgICAgICAgYWxpYXM6ICdwcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0FuIGFycmF5IG9mIG5hbWVzIG9mIHByb3BlcnRpZXMgaW4gcGFja2FnZS5qc29uIHRvIGNvbXBpbGUgKGUuZy4gYG1vZHVsZWAgb3IgYGVzMjAxNWApXFxuJyArXG4gICAgICAgICAgICAgICAgJ0VhY2ggb2YgdGhlc2UgcHJvcGVydGllcyBzaG91bGQgaG9sZCB0aGUgcGF0aCB0byBhIGJ1bmRsZS1mb3JtYXQuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIHByb3ZpZGVkLCBvbmx5IHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcyBhcmUgY29uc2lkZXJlZCBmb3IgcHJvY2Vzc2luZy5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgbm90IHByb3ZpZGVkLCBhbGwgdGhlIHN1cHBvcnRlZCBmb3JtYXQgcHJvcGVydGllcyAoZS5nLiBmZXNtMjAxNSwgZmVzbTUsIGVzMjAxNSwgZXNtMjAxNSwgZXNtNSwgbWFpbiwgbW9kdWxlKSBpbiB0aGUgcGFja2FnZS5qc29uIGFyZSBjb25zaWRlcmVkLidcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ3QnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3RhcmdldCcsXG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQSByZWxhdGl2ZSBwYXRoIChmcm9tIHRoZSBgc291cmNlYCBwYXRoKSB0byBhIHNpbmdsZSBlbnRyeS1wb2ludCB0byBwcm9jZXNzIChwbHVzIGl0cyBkZXBlbmRlbmNpZXMpLlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiB0aGlzIHByb3BlcnR5IGlzIHByb3ZpZGVkIHRoZW4gYGVycm9yLW9uLWZhaWxlZC1lbnRyeS1wb2ludGAgaXMgZm9yY2VkIHRvIHRydWUnLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignZmlyc3Qtb25seScsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdJZiBzcGVjaWZpZWQgdGhlbiBvbmx5IHRoZSBmaXJzdCBtYXRjaGluZyBwYWNrYWdlLmpzb24gcHJvcGVydHkgd2lsbCBiZSBjb21waWxlZC4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdjcmVhdGUtaXZ5LWVudHJ5LXBvaW50cycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdJZiBzcGVjaWZpZWQgdGhlbiBuZXcgYCpfaXZ5X25nY2NgIGVudHJ5LXBvaW50cyB3aWxsIGJlIGFkZGVkIHRvIHBhY2thZ2UuanNvbiByYXRoZXIgdGhhbiBtb2RpZnlpbmcgdGhlIG9uZXMgaW4tcGxhY2UuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0ZvciB0aGlzIHRvIHdvcmsgeW91IG5lZWQgdG8gaGF2ZSBjdXN0b20gcmVzb2x1dGlvbiBzZXQgdXAgKGUuZy4gaW4gd2VicGFjaykgdG8gbG9vayBmb3IgdGhlc2UgbmV3IGVudHJ5LXBvaW50cy5cXG4nICtcbiAgICAgICAgICAgICAgICAnVGhlIEFuZ3VsYXIgQ0xJIGRvZXMgdGhpcyBhbHJlYWR5LCBzbyBpdCBpcyBzYWZlIHRvIHVzZSB0aGlzIG9wdGlvbiBpZiB0aGUgcHJvamVjdCBpcyBiZWluZyBidWlsdCB2aWEgdGhlIENMSS4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignbGVnYWN5LW1lc3NhZ2UtaWRzJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6ICdSZW5kZXIgYCRsb2NhbGl6ZWAgbWVzc2FnZXMgd2l0aCBsZWdhY3kgZm9ybWF0IGlkcy5cXG4nICtcbiAgICAgICAgICAgICAgICAnVGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgLiBPbmx5IHNldCB0aGlzIHRvIGBmYWxzZWAgaWYgeW91IGRvIG5vdCB3YW50IGxlZ2FjeSBtZXNzYWdlIGlkcyB0b1xcbicgK1xuICAgICAgICAgICAgICAgICdiZSByZW5kZXJlZC4gRm9yIGV4YW1wbGUsIGlmIHlvdSBhcmUgbm90IHVzaW5nIGxlZ2FjeSBtZXNzYWdlIGlkcyBpbiB5b3VyIHRyYW5zbGF0aW9uIGZpbGVzXFxuJyArXG4gICAgICAgICAgICAgICAgJ0FORCBhcmUgbm90IGRvaW5nIGNvbXBpbGUtdGltZSBpbmxpbmluZyBvZiB0cmFuc2xhdGlvbnMsIGluIHdoaWNoIGNhc2UgdGhlIGV4dHJhIG1lc3NhZ2UgaWRzXFxuJyArXG4gICAgICAgICAgICAgICAgJ3dvdWxkIGFkZCB1bndhbnRlZCBzaXplIHRvIHRoZSBmaW5hbCBzb3VyY2UgYnVuZGxlLlxcbicgK1xuICAgICAgICAgICAgICAgICdJdCBpcyBzYWZlIHRvIGxlYXZlIHRoaXMgc2V0IHRvIHRydWUgaWYgeW91IGFyZSBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgYmVjYXVzZSB0aGUgZXh0cmFcXG4nICtcbiAgICAgICAgICAgICAgICAnbGVnYWN5IG1lc3NhZ2UgaWRzIHdpbGwgYWxsIGJlIHN0cmlwcGVkIGR1cmluZyB0cmFuc2xhdGlvbi4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2FzeW5jJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ1doZXRoZXIgdG8gY29tcGlsZSBhc3luY2hyb25vdXNseS4gVGhpcyBpcyBlbmFibGVkIGJ5IGRlZmF1bHQgYXMgaXQgYWxsb3dzIGNvbXBpbGF0aW9ucyB0byBiZSBwYXJhbGxlbGl6ZWQuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0Rpc2FibGluZyBhc3luY2hyb25vdXMgY29tcGlsYXRpb24gbWF5IGJlIHVzZWZ1bCBmb3IgZGVidWdnaW5nLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignbCcsIHtcbiAgICAgICAgICAgIGFsaWFzOiAnbG9nbGV2ZWwnLFxuICAgICAgICAgICAgZGVzY3JpYmU6ICdUaGUgbG93ZXN0IHNldmVyaXR5IGxvZ2dpbmcgbWVzc2FnZSB0aGF0IHNob3VsZCBiZSBvdXRwdXQuJyxcbiAgICAgICAgICAgIGNob2ljZXM6IFsnZGVidWcnLCAnaW5mbycsICd3YXJuJywgJ2Vycm9yJ10sXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdpbnZhbGlkYXRlLWVudHJ5LXBvaW50LW1hbmlmZXN0Jywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHRoaXMgaXMgc2V0IHRoZW4gbmdjYyB3aWxsIG5vdCByZWFkIGFuIGVudHJ5LXBvaW50IG1hbmlmZXN0IGZpbGUgZnJvbSBkaXNrLlxcbicgK1xuICAgICAgICAgICAgICAgICdJbnN0ZWFkIGl0IHdpbGwgd2FsayB0aGUgZGlyZWN0b3J5IHRyZWUgYXMgbm9ybWFsIGxvb2tpbmcgZm9yIGVudHJ5LXBvaW50cywgYW5kIHRoZW4gd3JpdGUgYSBuZXcgbWFuaWZlc3QgZmlsZS4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdlcnJvci1vbi1mYWlsZWQtZW50cnktcG9pbnQnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnU2V0IHRoaXMgb3B0aW9uIGluIG9yZGVyIHRvIHRlcm1pbmF0ZSBpbW1lZGlhdGVseSB3aXRoIGFuIGVycm9yIGNvZGUgaWYgYW4gZW50cnktcG9pbnQgZmFpbHMgdG8gYmUgcHJvY2Vzc2VkLlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBgLXRgL2AtLXRhcmdldGAgaXMgcHJvdmlkZWQgdGhlbiB0aGlzIHByb3BlcnR5IGlzIGFsd2F5cyB0cnVlIGFuZCBjYW5ub3QgYmUgY2hhbmdlZC4gT3RoZXJ3aXNlIHRoZSBkZWZhdWx0IGlzIGZhbHNlLlxcbicgK1xuICAgICAgICAgICAgICAgICdXaGVuIHNldCB0byBmYWxzZSwgbmdjYyB3aWxsIGNvbnRpbnVlIHRvIHByb2Nlc3MgZW50cnktcG9pbnRzIGFmdGVyIGEgZmFpbHVyZS4gSW4gd2hpY2ggY2FzZSBpdCB3aWxsIGxvZyBhbiBlcnJvciBhbmQgcmVzdW1lIHByb2Nlc3Npbmcgb3RoZXIgZW50cnktcG9pbnRzLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5zdHJpY3QoKVxuICAgICAgICAgIC5oZWxwKClcbiAgICAgICAgICAucGFyc2UoYXJncyk7XG5cbiAgaWYgKG9wdGlvbnNbJ2YnXSAmJiBvcHRpb25zWydmJ10ubGVuZ3RoKSB7XG4gICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgJ1RoZSBmb3JtYXRzIG9wdGlvbiAoLWYvLS1mb3JtYXRzKSBoYXMgYmVlbiByZW1vdmVkLiBDb25zaWRlciB0aGUgcHJvcGVydGllcyBvcHRpb24gKC1wLy0tcHJvcGVydGllcykgaW5zdGVhZC4nKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cblxuICBzZXRGaWxlU3lzdGVtKG5ldyBDYWNoZWRGaWxlU3lzdGVtKG5ldyBOb2RlSlNGaWxlU3lzdGVtKCkpKTtcblxuICBjb25zdCBiYXNlU291cmNlUGF0aCA9IHJlc29sdmUob3B0aW9uc1sncyddIHx8ICcuL25vZGVfbW9kdWxlcycpO1xuICBjb25zdCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10gPSBvcHRpb25zWydwJ107XG4gIGNvbnN0IHRhcmdldEVudHJ5UG9pbnRQYXRoID0gb3B0aW9uc1sndCddID8gb3B0aW9uc1sndCddIDogdW5kZWZpbmVkO1xuICBjb25zdCBjb21waWxlQWxsRm9ybWF0cyA9ICFvcHRpb25zWydmaXJzdC1vbmx5J107XG4gIGNvbnN0IGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID0gb3B0aW9uc1snY3JlYXRlLWl2eS1lbnRyeS1wb2ludHMnXTtcbiAgY29uc3QgbG9nTGV2ZWwgPSBvcHRpb25zWydsJ10gYXMga2V5b2YgdHlwZW9mIExvZ0xldmVsIHwgdW5kZWZpbmVkO1xuICBjb25zdCBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID0gb3B0aW9uc1snbGVnYWN5LW1lc3NhZ2UtaWRzJ107XG4gIGNvbnN0IGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QgPSBvcHRpb25zWydpbnZhbGlkYXRlLWVudHJ5LXBvaW50LW1hbmlmZXN0J107XG4gIGNvbnN0IGVycm9yT25GYWlsZWRFbnRyeVBvaW50ID0gb3B0aW9uc1snZXJyb3Itb24tZmFpbGVkLWVudHJ5LXBvaW50J107XG5cbiAgKGFzeW5jKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBsb2dnZXIgPSBsb2dMZXZlbCAmJiBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbFtsb2dMZXZlbF0pO1xuXG4gICAgICBhd2FpdCBtYWluTmdjYyh7XG4gICAgICAgIGJhc2VQYXRoOiBiYXNlU291cmNlUGF0aCxcbiAgICAgICAgcHJvcGVydGllc1RvQ29uc2lkZXIsXG4gICAgICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgICAgICBjb21waWxlQWxsRm9ybWF0cyxcbiAgICAgICAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMsXG4gICAgICAgIGxvZ2dlcixcbiAgICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICAgICAgYXN5bmM6IG9wdGlvbnNbJ2FzeW5jJ10sIGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QsIGVycm9yT25GYWlsZWRFbnRyeVBvaW50LFxuICAgICAgfSk7XG5cbiAgICAgIGlmIChsb2dnZXIpIHtcbiAgICAgICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMDApO1xuICAgICAgICBsb2dnZXIuZGVidWcoYFJ1biBuZ2NjIGluICR7ZHVyYXRpb259cy5gKTtcbiAgICAgIH1cblxuICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IDA7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihlLnN0YWNrIHx8IGUubWVzc2FnZSk7XG4gICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgICB9XG4gIH0pKCk7XG59XG4iXX0=