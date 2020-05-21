#!/usr/bin/env node
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/command_line_options", ["require", "exports", "yargs", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/logging/console_logger", "@angular/compiler-cli/ngcc/src/logging/logger"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCommandLineOptions = void 0;
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var yargs = require("yargs");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var console_logger_1 = require("@angular/compiler-cli/ngcc/src/logging/console_logger");
    var logger_1 = require("@angular/compiler-cli/ngcc/src/logging/logger");
    function parseCommandLineOptions(args) {
        var options = yargs
            .option('s', {
            alias: 'source',
            describe: 'A path (relative to the working directory) of the `node_modules` folder to process.',
            default: './node_modules'
        })
            .option('f', { alias: 'formats', hidden: true, array: true })
            .option('p', {
            alias: 'properties',
            array: true,
            describe: 'An array of names of properties in package.json to compile (e.g. `module` or `main`)\n' +
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
        if (options['f'] && options['f'].length) {
            console.error('The formats option (-f/--formats) has been removed. Consider the properties option (-p/--properties) instead.');
            process.exit(1);
        }
        file_system_1.setFileSystem(new file_system_1.NodeJSFileSystem());
        var baseSourcePath = file_system_1.resolve(options['s'] || './node_modules');
        var propertiesToConsider = options['p'];
        var targetEntryPointPath = options['t'] ? options['t'] : undefined;
        var compileAllFormats = !options['first-only'];
        var createNewEntryPointFormats = options['create-ivy-entry-points'];
        var logLevel = options['l'];
        var enableI18nLegacyMessageIdFormat = options['legacy-message-ids'];
        var invalidateEntryPointManifest = options['invalidate-entry-point-manifest'];
        var errorOnFailedEntryPoint = options['error-on-failed-entry-point'];
        // yargs is not so great at mixed string+boolean types, so we have to test tsconfig against a
        // string "false" to capture the `tsconfig=false` option.
        // And we have to convert the option to a string to handle `no-tsconfig`, which will be `false`.
        var tsConfigPath = "" + options['tsconfig'] === 'false' ? null : options['tsconfig'];
        var logger = logLevel && new console_logger_1.ConsoleLogger(logger_1.LogLevel[logLevel]);
        return {
            basePath: baseSourcePath,
            propertiesToConsider: propertiesToConsider,
            targetEntryPointPath: targetEntryPointPath,
            compileAllFormats: compileAllFormats,
            createNewEntryPointFormats: createNewEntryPointFormats,
            logger: logger,
            enableI18nLegacyMessageIdFormat: enableI18nLegacyMessageIdFormat,
            async: options['async'],
            invalidateEntryPointManifest: invalidateEntryPointManifest,
            errorOnFailedEntryPoint: errorOnFailedEntryPoint,
            tsConfigPath: tsConfigPath
        };
    }
    exports.parseCommandLineOptions = parseCommandLineOptions;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZF9saW5lX29wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvY29tbWFuZF9saW5lX29wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUNBOzs7Ozs7T0FNRztJQUNILDZCQUErQjtJQUUvQiwyRUFBcUY7SUFDckYsd0ZBQXVEO0lBQ3ZELHdFQUEwQztJQUcxQyxTQUFnQix1QkFBdUIsQ0FBQyxJQUFjO1FBQ3BELElBQU0sT0FBTyxHQUNULEtBQUs7YUFDQSxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQ0oscUZBQXFGO1lBQ3pGLE9BQU8sRUFBRSxnQkFBZ0I7U0FDMUIsQ0FBQzthQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDO2FBQzFELE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsWUFBWTtZQUNuQixLQUFLLEVBQUUsSUFBSTtZQUNYLFFBQVEsRUFDSix3RkFBd0Y7Z0JBQ3hGLHFFQUFxRTtnQkFDckUsNkVBQTZFO2dCQUM3RSxzSkFBc0o7U0FDM0osQ0FBQzthQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFFBQVEsRUFDSix3R0FBd0c7Z0JBQ3hHLG1GQUFtRjtTQUN4RixDQUFDO2FBQ0QsTUFBTSxDQUFDLFlBQVksRUFBRTtZQUNwQixRQUFRLEVBQ0osbUZBQW1GO1lBQ3ZGLElBQUksRUFBRSxTQUFTO1NBQ2hCLENBQUM7YUFDRCxNQUFNLENBQUMseUJBQXlCLEVBQUU7WUFDakMsUUFBUSxFQUNKLDBIQUEwSDtnQkFDMUgsb0hBQW9IO2dCQUNwSCxnSEFBZ0g7WUFD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QWEsQ0FBQyxpQkFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFakUsT0FBTztZQUNMLFFBQVEsRUFBRSxjQUFjO1lBQ3hCLG9CQUFvQixzQkFBQTtZQUNwQixvQkFBb0Isc0JBQUE7WUFDcEIsaUJBQWlCLG1CQUFBO1lBQ2pCLDBCQUEwQiw0QkFBQTtZQUMxQixNQUFNLFFBQUE7WUFDTiwrQkFBK0IsaUNBQUE7WUFDL0IsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDdkIsNEJBQTRCLDhCQUFBO1lBQzVCLHVCQUF1Qix5QkFBQTtZQUN2QixZQUFZLGNBQUE7U0FDYixDQUFDO0lBQ0osQ0FBQztJQTNIRCwwREEySEMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB5YXJncyBmcm9tICd5YXJncyc7XG5cbmltcG9ydCB7cmVzb2x2ZSwgc2V0RmlsZVN5c3RlbSwgTm9kZUpTRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q29uc29sZUxvZ2dlcn0gZnJvbSAnLi9sb2dnaW5nL2NvbnNvbGVfbG9nZ2VyJztcbmltcG9ydCB7TG9nTGV2ZWx9IGZyb20gJy4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtOZ2NjT3B0aW9uc30gZnJvbSAnLi9uZ2NjX29wdGlvbnMnO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDb21tYW5kTGluZU9wdGlvbnMoYXJnczogc3RyaW5nW10pOiBOZ2NjT3B0aW9ucyB7XG4gIGNvbnN0IG9wdGlvbnMgPVxuICAgICAgeWFyZ3NcbiAgICAgICAgICAub3B0aW9uKCdzJywge1xuICAgICAgICAgICAgYWxpYXM6ICdzb3VyY2UnLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0EgcGF0aCAocmVsYXRpdmUgdG8gdGhlIHdvcmtpbmcgZGlyZWN0b3J5KSBvZiB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRvIHByb2Nlc3MuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6ICcuL25vZGVfbW9kdWxlcydcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2YnLCB7YWxpYXM6ICdmb3JtYXRzJywgaGlkZGVuOsKgdHJ1ZSwgYXJyYXk6IHRydWV9KVxuICAgICAgICAgIC5vcHRpb24oJ3AnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3Byb3BlcnRpZXMnLFxuICAgICAgICAgICAgYXJyYXk6IHRydWUsXG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQW4gYXJyYXkgb2YgbmFtZXMgb2YgcHJvcGVydGllcyBpbiBwYWNrYWdlLmpzb24gdG8gY29tcGlsZSAoZS5nLiBgbW9kdWxlYCBvciBgbWFpbmApXFxuJyArXG4gICAgICAgICAgICAgICAgJ0VhY2ggb2YgdGhlc2UgcHJvcGVydGllcyBzaG91bGQgaG9sZCB0aGUgcGF0aCB0byBhIGJ1bmRsZS1mb3JtYXQuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIHByb3ZpZGVkLCBvbmx5IHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcyBhcmUgY29uc2lkZXJlZCBmb3IgcHJvY2Vzc2luZy5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgbm90IHByb3ZpZGVkLCBhbGwgdGhlIHN1cHBvcnRlZCBmb3JtYXQgcHJvcGVydGllcyAoZS5nLiBmZXNtMjAxNSwgZmVzbTUsIGVzMjAxNSwgZXNtMjAxNSwgZXNtNSwgbWFpbiwgbW9kdWxlKSBpbiB0aGUgcGFja2FnZS5qc29uIGFyZSBjb25zaWRlcmVkLidcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ3QnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3RhcmdldCcsXG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQSByZWxhdGl2ZSBwYXRoIChmcm9tIHRoZSBgc291cmNlYCBwYXRoKSB0byBhIHNpbmdsZSBlbnRyeS1wb2ludCB0byBwcm9jZXNzIChwbHVzIGl0cyBkZXBlbmRlbmNpZXMpLlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiB0aGlzIHByb3BlcnR5IGlzIHByb3ZpZGVkIHRoZW4gYGVycm9yLW9uLWZhaWxlZC1lbnRyeS1wb2ludGAgaXMgZm9yY2VkIHRvIHRydWUnLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignZmlyc3Qtb25seScsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdJZiBzcGVjaWZpZWQgdGhlbiBvbmx5IHRoZSBmaXJzdCBtYXRjaGluZyBwYWNrYWdlLmpzb24gcHJvcGVydHkgd2lsbCBiZSBjb21waWxlZC4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdjcmVhdGUtaXZ5LWVudHJ5LXBvaW50cycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdJZiBzcGVjaWZpZWQgdGhlbiBuZXcgYCpfaXZ5X25nY2NgIGVudHJ5LXBvaW50cyB3aWxsIGJlIGFkZGVkIHRvIHBhY2thZ2UuanNvbiByYXRoZXIgdGhhbiBtb2RpZnlpbmcgdGhlIG9uZXMgaW4tcGxhY2UuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0ZvciB0aGlzIHRvIHdvcmsgeW91IG5lZWQgdG8gaGF2ZSBjdXN0b20gcmVzb2x1dGlvbiBzZXQgdXAgKGUuZy4gaW4gd2VicGFjaykgdG8gbG9vayBmb3IgdGhlc2UgbmV3IGVudHJ5LXBvaW50cy5cXG4nICtcbiAgICAgICAgICAgICAgICAnVGhlIEFuZ3VsYXIgQ0xJIGRvZXMgdGhpcyBhbHJlYWR5LCBzbyBpdCBpcyBzYWZlIHRvIHVzZSB0aGlzIG9wdGlvbiBpZiB0aGUgcHJvamVjdCBpcyBiZWluZyBidWlsdCB2aWEgdGhlIENMSS4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignbGVnYWN5LW1lc3NhZ2UtaWRzJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6ICdSZW5kZXIgYCRsb2NhbGl6ZWAgbWVzc2FnZXMgd2l0aCBsZWdhY3kgZm9ybWF0IGlkcy5cXG4nICtcbiAgICAgICAgICAgICAgICAnVGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgLiBPbmx5IHNldCB0aGlzIHRvIGBmYWxzZWAgaWYgeW91IGRvIG5vdCB3YW50IGxlZ2FjeSBtZXNzYWdlIGlkcyB0b1xcbicgK1xuICAgICAgICAgICAgICAgICdiZSByZW5kZXJlZC4gRm9yIGV4YW1wbGUsIGlmIHlvdSBhcmUgbm90IHVzaW5nIGxlZ2FjeSBtZXNzYWdlIGlkcyBpbiB5b3VyIHRyYW5zbGF0aW9uIGZpbGVzXFxuJyArXG4gICAgICAgICAgICAgICAgJ0FORCBhcmUgbm90IGRvaW5nIGNvbXBpbGUtdGltZSBpbmxpbmluZyBvZiB0cmFuc2xhdGlvbnMsIGluIHdoaWNoIGNhc2UgdGhlIGV4dHJhIG1lc3NhZ2UgaWRzXFxuJyArXG4gICAgICAgICAgICAgICAgJ3dvdWxkIGFkZCB1bndhbnRlZCBzaXplIHRvIHRoZSBmaW5hbCBzb3VyY2UgYnVuZGxlLlxcbicgK1xuICAgICAgICAgICAgICAgICdJdCBpcyBzYWZlIHRvIGxlYXZlIHRoaXMgc2V0IHRvIHRydWUgaWYgeW91IGFyZSBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgYmVjYXVzZSB0aGUgZXh0cmFcXG4nICtcbiAgICAgICAgICAgICAgICAnbGVnYWN5IG1lc3NhZ2UgaWRzIHdpbGwgYWxsIGJlIHN0cmlwcGVkIGR1cmluZyB0cmFuc2xhdGlvbi4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2FzeW5jJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ1doZXRoZXIgdG8gY29tcGlsZSBhc3luY2hyb25vdXNseS4gVGhpcyBpcyBlbmFibGVkIGJ5IGRlZmF1bHQgYXMgaXQgYWxsb3dzIGNvbXBpbGF0aW9ucyB0byBiZSBwYXJhbGxlbGl6ZWQuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0Rpc2FibGluZyBhc3luY2hyb25vdXMgY29tcGlsYXRpb24gbWF5IGJlIHVzZWZ1bCBmb3IgZGVidWdnaW5nLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignbCcsIHtcbiAgICAgICAgICAgIGFsaWFzOiAnbG9nbGV2ZWwnLFxuICAgICAgICAgICAgZGVzY3JpYmU6ICdUaGUgbG93ZXN0IHNldmVyaXR5IGxvZ2dpbmcgbWVzc2FnZSB0aGF0IHNob3VsZCBiZSBvdXRwdXQuJyxcbiAgICAgICAgICAgIGNob2ljZXM6IFsnZGVidWcnLCAnaW5mbycsICd3YXJuJywgJ2Vycm9yJ10sXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdpbnZhbGlkYXRlLWVudHJ5LXBvaW50LW1hbmlmZXN0Jywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHRoaXMgaXMgc2V0IHRoZW4gbmdjYyB3aWxsIG5vdCByZWFkIGFuIGVudHJ5LXBvaW50IG1hbmlmZXN0IGZpbGUgZnJvbSBkaXNrLlxcbicgK1xuICAgICAgICAgICAgICAgICdJbnN0ZWFkIGl0IHdpbGwgd2FsayB0aGUgZGlyZWN0b3J5IHRyZWUgYXMgbm9ybWFsIGxvb2tpbmcgZm9yIGVudHJ5LXBvaW50cywgYW5kIHRoZW4gd3JpdGUgYSBuZXcgbWFuaWZlc3QgZmlsZS4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdlcnJvci1vbi1mYWlsZWQtZW50cnktcG9pbnQnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnU2V0IHRoaXMgb3B0aW9uIGluIG9yZGVyIHRvIHRlcm1pbmF0ZSBpbW1lZGlhdGVseSB3aXRoIGFuIGVycm9yIGNvZGUgaWYgYW4gZW50cnktcG9pbnQgZmFpbHMgdG8gYmUgcHJvY2Vzc2VkLlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBgLXRgL2AtLXRhcmdldGAgaXMgcHJvdmlkZWQgdGhlbiB0aGlzIHByb3BlcnR5IGlzIGFsd2F5cyB0cnVlIGFuZCBjYW5ub3QgYmUgY2hhbmdlZC4gT3RoZXJ3aXNlIHRoZSBkZWZhdWx0IGlzIGZhbHNlLlxcbicgK1xuICAgICAgICAgICAgICAgICdXaGVuIHNldCB0byBmYWxzZSwgbmdjYyB3aWxsIGNvbnRpbnVlIHRvIHByb2Nlc3MgZW50cnktcG9pbnRzIGFmdGVyIGEgZmFpbHVyZS4gSW4gd2hpY2ggY2FzZSBpdCB3aWxsIGxvZyBhbiBlcnJvciBhbmQgcmVzdW1lIHByb2Nlc3Npbmcgb3RoZXIgZW50cnktcG9pbnRzLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ3RzY29uZmlnJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0EgcGF0aCB0byBhIHRzY29uZmlnLmpzb24gZmlsZSB0aGF0IHdpbGwgYmUgdXNlZCB0byBjb25maWd1cmUgdGhlIEFuZ3VsYXIgY29tcGlsZXIgYW5kIG1vZHVsZSByZXNvbHV0aW9uIHVzZWQgYnkgbmdjYy5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgbm90IHByb3ZpZGVkLCBuZ2NjIHdpbGwgYXR0ZW1wdCB0byByZWFkIGEgYHRzY29uZmlnLmpzb25gIGZpbGUgZnJvbSB0aGUgZm9sZGVyIGFib3ZlIHRoYXQgZ2l2ZW4gYnkgdGhlIGAtc2Agb3B0aW9uLlxcbicgK1xuICAgICAgICAgICAgICAgICdTZXQgdG8gZmFsc2UgKHZpYSBgLS1uby10c2NvbmZpZ2ApIGlmIHlvdSBkbyBub3Qgd2FudCBuZ2NjIHRvIHVzZSBhbnkgYHRzY29uZmlnLmpzb25gIGZpbGUuJyxcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnN0cmljdCgpXG4gICAgICAgICAgLmhlbHAoKVxuICAgICAgICAgIC5wYXJzZShhcmdzKTtcblxuICBpZiAob3B0aW9uc1snZiddICYmIG9wdGlvbnNbJ2YnXS5sZW5ndGgpIHtcbiAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAnVGhlIGZvcm1hdHMgb3B0aW9uICgtZi8tLWZvcm1hdHMpIGhhcyBiZWVuIHJlbW92ZWQuIENvbnNpZGVyIHRoZSBwcm9wZXJ0aWVzIG9wdGlvbiAoLXAvLS1wcm9wZXJ0aWVzKSBpbnN0ZWFkLicpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxuXG4gIHNldEZpbGVTeXN0ZW0obmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSk7XG5cbiAgY29uc3QgYmFzZVNvdXJjZVBhdGggPSByZXNvbHZlKG9wdGlvbnNbJ3MnXSB8fCAnLi9ub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgcHJvcGVydGllc1RvQ29uc2lkZXI6IHN0cmluZ1tdID0gb3B0aW9uc1sncCddO1xuICBjb25zdCB0YXJnZXRFbnRyeVBvaW50UGF0aCA9IG9wdGlvbnNbJ3QnXSA/IG9wdGlvbnNbJ3QnXSA6IHVuZGVmaW5lZDtcbiAgY29uc3QgY29tcGlsZUFsbEZvcm1hdHMgPSAhb3B0aW9uc1snZmlyc3Qtb25seSddO1xuICBjb25zdCBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyA9IG9wdGlvbnNbJ2NyZWF0ZS1pdnktZW50cnktcG9pbnRzJ107XG4gIGNvbnN0IGxvZ0xldmVsID0gb3B0aW9uc1snbCddIGFzIGtleW9mIHR5cGVvZiBMb2dMZXZlbCB8IHVuZGVmaW5lZDtcbiAgY29uc3QgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCA9IG9wdGlvbnNbJ2xlZ2FjeS1tZXNzYWdlLWlkcyddO1xuICBjb25zdCBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0ID0gb3B0aW9uc1snaW52YWxpZGF0ZS1lbnRyeS1wb2ludC1tYW5pZmVzdCddO1xuICBjb25zdCBlcnJvck9uRmFpbGVkRW50cnlQb2ludCA9IG9wdGlvbnNbJ2Vycm9yLW9uLWZhaWxlZC1lbnRyeS1wb2ludCddO1xuICAvLyB5YXJncyBpcyBub3Qgc28gZ3JlYXQgYXQgbWl4ZWQgc3RyaW5nK2Jvb2xlYW4gdHlwZXMsIHNvIHdlIGhhdmUgdG8gdGVzdCB0c2NvbmZpZyBhZ2FpbnN0IGFcbiAgLy8gc3RyaW5nIFwiZmFsc2VcIiB0byBjYXB0dXJlIHRoZSBgdHNjb25maWc9ZmFsc2VgIG9wdGlvbi5cbiAgLy8gQW5kIHdlIGhhdmUgdG8gY29udmVydCB0aGUgb3B0aW9uIHRvIGEgc3RyaW5nIHRvIGhhbmRsZSBgbm8tdHNjb25maWdgLCB3aGljaCB3aWxsIGJlIGBmYWxzZWAuXG4gIGNvbnN0IHRzQ29uZmlnUGF0aCA9IGAke29wdGlvbnNbJ3RzY29uZmlnJ119YCA9PT0gJ2ZhbHNlJyA/IG51bGwgOiBvcHRpb25zWyd0c2NvbmZpZyddO1xuXG4gIGNvbnN0IGxvZ2dlciA9IGxvZ0xldmVsICYmIG5ldyBDb25zb2xlTG9nZ2VyKExvZ0xldmVsW2xvZ0xldmVsXSk7XG5cbiAgcmV0dXJuIHtcbiAgICBiYXNlUGF0aDogYmFzZVNvdXJjZVBhdGgsXG4gICAgcHJvcGVydGllc1RvQ29uc2lkZXIsXG4gICAgdGFyZ2V0RW50cnlQb2ludFBhdGgsXG4gICAgY29tcGlsZUFsbEZvcm1hdHMsXG4gICAgY3JlYXRlTmV3RW50cnlQb2ludEZvcm1hdHMsXG4gICAgbG9nZ2VyLFxuICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgYXN5bmM6IG9wdGlvbnNbJ2FzeW5jJ10sXG4gICAgaW52YWxpZGF0ZUVudHJ5UG9pbnRNYW5pZmVzdCxcbiAgICBlcnJvck9uRmFpbGVkRW50cnlQb2ludCxcbiAgICB0c0NvbmZpZ1BhdGhcbiAgfTtcbn1cbiJdfQ==