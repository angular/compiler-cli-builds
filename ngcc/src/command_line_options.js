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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZF9saW5lX29wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvY29tbWFuZF9saW5lX29wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQ0E7Ozs7OztPQU1HO0lBQ0gsNkJBQStCO0lBRS9CLDJFQUFxRjtJQUNyRix3RkFBdUQ7SUFDdkQsd0VBQTBDO0lBRzFDLFNBQWdCLHVCQUF1QixDQUFDLElBQWM7UUFDcEQsSUFBTSxPQUFPLEdBQ1QsS0FBSzthQUNBLE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFFBQVEsRUFDSixxRkFBcUY7WUFDekYsT0FBTyxFQUFFLGdCQUFnQjtTQUMxQixDQUFDO2FBQ0QsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFDLENBQUM7YUFDMUQsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxZQUFZO1lBQ25CLEtBQUssRUFBRSxJQUFJO1lBQ1gsUUFBUSxFQUNKLHdGQUF3RjtnQkFDeEYscUVBQXFFO2dCQUNyRSw2RUFBNkU7Z0JBQzdFLHNKQUFzSjtTQUMzSixDQUFDO2FBQ0QsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxRQUFRO1lBQ2YsUUFBUSxFQUNKLHdHQUF3RztnQkFDeEcsbUZBQW1GO1NBQ3hGLENBQUM7YUFDRCxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3BCLFFBQVEsRUFDSixtRkFBbUY7WUFDdkYsSUFBSSxFQUFFLFNBQVM7U0FDaEIsQ0FBQzthQUNELE1BQU0sQ0FBQyx5QkFBeUIsRUFBRTtZQUNqQyxRQUFRLEVBQ0osMEhBQTBIO2dCQUMxSCxvSEFBb0g7Z0JBQ3BILGdIQUFnSDtZQUNwSCxJQUFJLEVBQUUsU0FBUztTQUNoQixDQUFDO2FBQ0QsTUFBTSxDQUFDLG9CQUFvQixFQUFFO1lBQzVCLFFBQVEsRUFBRSx1REFBdUQ7Z0JBQzdELGtHQUFrRztnQkFDbEcsK0ZBQStGO2dCQUMvRixnR0FBZ0c7Z0JBQ2hHLHVEQUF1RDtnQkFDdkQsaUdBQWlHO2dCQUNqRyw2REFBNkQ7WUFDakUsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUM7YUFDRCxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ2YsUUFBUSxFQUNKLCtHQUErRztnQkFDL0csaUVBQWlFO1lBQ3JFLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDO2FBQ0QsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNYLEtBQUssRUFBRSxVQUFVO1lBQ2pCLFFBQVEsRUFBRSw0REFBNEQ7WUFDdEUsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDO1NBQzVDLENBQUM7YUFDRCxNQUFNLENBQUMsaUNBQWlDLEVBQUU7WUFDekMsUUFBUSxFQUNKLGtGQUFrRjtnQkFDbEYsaUhBQWlIO1lBQ3JILElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO2FBQ0QsTUFBTSxDQUFDLDZCQUE2QixFQUFFO1lBQ3JDLFFBQVEsRUFDSixpSEFBaUg7Z0JBQ2pILDJIQUEySDtnQkFDM0gsNkpBQTZKO1lBQ2pLLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7U0FDZixDQUFDO2FBQ0QsTUFBTSxDQUFDLFVBQVUsRUFBRTtZQUNsQixRQUFRLEVBQ0osMEhBQTBIO2dCQUMxSCwwSEFBMEg7Z0JBQzFILDZGQUE2RjtZQUNqRyxJQUFJLEVBQUUsUUFBUTtTQUNmLENBQUM7YUFDRCxNQUFNLEVBQUU7YUFDUixJQUFJLEVBQUU7YUFDTixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRTtZQUN2QyxPQUFPLENBQUMsS0FBSyxDQUNULCtHQUErRyxDQUFDLENBQUM7WUFDckgsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQjtRQUVELDJCQUFhLENBQUMsSUFBSSw4QkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFFdEMsSUFBTSxjQUFjLEdBQUcscUJBQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLENBQUMsQ0FBQztRQUNqRSxJQUFNLG9CQUFvQixHQUFhLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRCxJQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDckUsSUFBTSxpQkFBaUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNqRCxJQUFNLDBCQUEwQixHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3RFLElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQXNDLENBQUM7UUFDbkUsSUFBTSwrQkFBK0IsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN0RSxJQUFNLDRCQUE0QixHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2hGLElBQU0sdUJBQXVCLEdBQUcsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDdkUsNkZBQTZGO1FBQzdGLHlEQUF5RDtRQUN6RCxnR0FBZ0c7UUFDaEcsSUFBTSxZQUFZLEdBQUcsS0FBRyxPQUFPLENBQUMsVUFBVSxDQUFHLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV2RixJQUFNLE1BQU0sR0FBRyxRQUFRLElBQUksSUFBSSw4QkFBYSxDQUFDLGlCQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUVqRSxPQUFPO1lBQ0wsUUFBUSxFQUFFLGNBQWM7WUFDeEIsb0JBQW9CLHNCQUFBO1lBQ3BCLG9CQUFvQixzQkFBQTtZQUNwQixpQkFBaUIsbUJBQUE7WUFDakIsMEJBQTBCLDRCQUFBO1lBQzFCLE1BQU0sUUFBQTtZQUNOLCtCQUErQixpQ0FBQTtZQUMvQixLQUFLLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUN2Qiw0QkFBNEIsOEJBQUE7WUFDNUIsdUJBQXVCLHlCQUFBO1lBQ3ZCLFlBQVksY0FBQTtTQUNiLENBQUM7SUFDSixDQUFDO0lBM0hELDBEQTJIQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHlhcmdzIGZyb20gJ3lhcmdzJztcblxuaW1wb3J0IHtyZXNvbHZlLCBzZXRGaWxlU3lzdGVtLCBOb2RlSlNGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyfSBmcm9tICcuL2xvZ2dpbmcvY29uc29sZV9sb2dnZXInO1xuaW1wb3J0IHtMb2dMZXZlbH0gZnJvbSAnLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge05nY2NPcHRpb25zfSBmcm9tICcuL25nY2Nfb3B0aW9ucyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNvbW1hbmRMaW5lT3B0aW9ucyhhcmdzOiBzdHJpbmdbXSk6IE5nY2NPcHRpb25zIHtcbiAgY29uc3Qgb3B0aW9ucyA9XG4gICAgICB5YXJnc1xuICAgICAgICAgIC5vcHRpb24oJ3MnLCB7XG4gICAgICAgICAgICBhbGlhczogJ3NvdXJjZScsXG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQSBwYXRoIChyZWxhdGl2ZSB0byB0aGUgd29ya2luZyBkaXJlY3RvcnkpIG9mIHRoZSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdG8gcHJvY2Vzcy4nLFxuICAgICAgICAgICAgZGVmYXVsdDogJy4vbm9kZV9tb2R1bGVzJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignZicsIHthbGlhczogJ2Zvcm1hdHMnLCBoaWRkZW46wqB0cnVlLCBhcnJheTogdHJ1ZX0pXG4gICAgICAgICAgLm9wdGlvbigncCcsIHtcbiAgICAgICAgICAgIGFsaWFzOiAncHJvcGVydGllcycsXG4gICAgICAgICAgICBhcnJheTogdHJ1ZSxcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdBbiBhcnJheSBvZiBuYW1lcyBvZiBwcm9wZXJ0aWVzIGluIHBhY2thZ2UuanNvbiB0byBjb21waWxlIChlLmcuIGBtb2R1bGVgIG9yIGBtYWluYClcXG4nICtcbiAgICAgICAgICAgICAgICAnRWFjaCBvZiB0aGVzZSBwcm9wZXJ0aWVzIHNob3VsZCBob2xkIHRoZSBwYXRoIHRvIGEgYnVuZGxlLWZvcm1hdC5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgcHJvdmlkZWQsIG9ubHkgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzIGFyZSBjb25zaWRlcmVkIGZvciBwcm9jZXNzaW5nLlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBub3QgcHJvdmlkZWQsIGFsbCB0aGUgc3VwcG9ydGVkIGZvcm1hdCBwcm9wZXJ0aWVzIChlLmcuIGZlc20yMDE1LCBmZXNtNSwgZXMyMDE1LCBlc20yMDE1LCBlc201LCBtYWluLCBtb2R1bGUpIGluIHRoZSBwYWNrYWdlLmpzb24gYXJlIGNvbnNpZGVyZWQuJ1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbigndCcsIHtcbiAgICAgICAgICAgIGFsaWFzOiAndGFyZ2V0JyxcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdBIHJlbGF0aXZlIHBhdGggKGZyb20gdGhlIGBzb3VyY2VgIHBhdGgpIHRvIGEgc2luZ2xlIGVudHJ5LXBvaW50IHRvIHByb2Nlc3MgKHBsdXMgaXRzIGRlcGVuZGVuY2llcykuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIHRoaXMgcHJvcGVydHkgaXMgcHJvdmlkZWQgdGhlbiBgZXJyb3Itb24tZmFpbGVkLWVudHJ5LXBvaW50YCBpcyBmb3JjZWQgdG8gdHJ1ZScsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdmaXJzdC1vbmx5Jywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHNwZWNpZmllZCB0aGVuIG9ubHkgdGhlIGZpcnN0IG1hdGNoaW5nIHBhY2thZ2UuanNvbiBwcm9wZXJ0eSB3aWxsIGJlIGNvbXBpbGVkLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2NyZWF0ZS1pdnktZW50cnktcG9pbnRzJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHNwZWNpZmllZCB0aGVuIG5ldyBgKl9pdnlfbmdjY2AgZW50cnktcG9pbnRzIHdpbGwgYmUgYWRkZWQgdG8gcGFja2FnZS5qc29uIHJhdGhlciB0aGFuIG1vZGlmeWluZyB0aGUgb25lcyBpbi1wbGFjZS5cXG4nICtcbiAgICAgICAgICAgICAgICAnRm9yIHRoaXMgdG8gd29yayB5b3UgbmVlZCB0byBoYXZlIGN1c3RvbSByZXNvbHV0aW9uIHNldCB1cCAoZS5nLiBpbiB3ZWJwYWNrKSB0byBsb29rIGZvciB0aGVzZSBuZXcgZW50cnktcG9pbnRzLlxcbicgK1xuICAgICAgICAgICAgICAgICdUaGUgQW5ndWxhciBDTEkgZG9lcyB0aGlzIGFscmVhZHksIHNvIGl0IGlzIHNhZmUgdG8gdXNlIHRoaXMgb3B0aW9uIGlmIHRoZSBwcm9qZWN0IGlzIGJlaW5nIGJ1aWx0IHZpYSB0aGUgQ0xJLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdsZWdhY3ktbWVzc2FnZS1pZHMnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTogJ1JlbmRlciBgJGxvY2FsaXplYCBtZXNzYWdlcyB3aXRoIGxlZ2FjeSBmb3JtYXQgaWRzLlxcbicgK1xuICAgICAgICAgICAgICAgICdUaGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAuIE9ubHkgc2V0IHRoaXMgdG8gYGZhbHNlYCBpZiB5b3UgZG8gbm90IHdhbnQgbGVnYWN5IG1lc3NhZ2UgaWRzIHRvXFxuJyArXG4gICAgICAgICAgICAgICAgJ2JlIHJlbmRlcmVkLiBGb3IgZXhhbXBsZSwgaWYgeW91IGFyZSBub3QgdXNpbmcgbGVnYWN5IG1lc3NhZ2UgaWRzIGluIHlvdXIgdHJhbnNsYXRpb24gZmlsZXNcXG4nICtcbiAgICAgICAgICAgICAgICAnQU5EIGFyZSBub3QgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIG9mIHRyYW5zbGF0aW9ucywgaW4gd2hpY2ggY2FzZSB0aGUgZXh0cmEgbWVzc2FnZSBpZHNcXG4nICtcbiAgICAgICAgICAgICAgICAnd291bGQgYWRkIHVud2FudGVkIHNpemUgdG8gdGhlIGZpbmFsIHNvdXJjZSBidW5kbGUuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0l0IGlzIHNhZmUgdG8gbGVhdmUgdGhpcyBzZXQgdG8gdHJ1ZSBpZiB5b3UgYXJlIGRvaW5nIGNvbXBpbGUtdGltZSBpbmxpbmluZyBiZWNhdXNlIHRoZSBleHRyYVxcbicgK1xuICAgICAgICAgICAgICAgICdsZWdhY3kgbWVzc2FnZSBpZHMgd2lsbCBhbGwgYmUgc3RyaXBwZWQgZHVyaW5nIHRyYW5zbGF0aW9uLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignYXN5bmMnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnV2hldGhlciB0byBjb21waWxlIGFzeW5jaHJvbm91c2x5LiBUaGlzIGlzIGVuYWJsZWQgYnkgZGVmYXVsdCBhcyBpdCBhbGxvd3MgY29tcGlsYXRpb25zIHRvIGJlIHBhcmFsbGVsaXplZC5cXG4nICtcbiAgICAgICAgICAgICAgICAnRGlzYWJsaW5nIGFzeW5jaHJvbm91cyBjb21waWxhdGlvbiBtYXkgYmUgdXNlZnVsIGZvciBkZWJ1Z2dpbmcuJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdsJywge1xuICAgICAgICAgICAgYWxpYXM6ICdsb2dsZXZlbCcsXG4gICAgICAgICAgICBkZXNjcmliZTogJ1RoZSBsb3dlc3Qgc2V2ZXJpdHkgbG9nZ2luZyBtZXNzYWdlIHRoYXQgc2hvdWxkIGJlIG91dHB1dC4nLFxuICAgICAgICAgICAgY2hvaWNlczogWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2ludmFsaWRhdGUtZW50cnktcG9pbnQtbWFuaWZlc3QnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnSWYgdGhpcyBpcyBzZXQgdGhlbiBuZ2NjIHdpbGwgbm90IHJlYWQgYW4gZW50cnktcG9pbnQgbWFuaWZlc3QgZmlsZSBmcm9tIGRpc2suXFxuJyArXG4gICAgICAgICAgICAgICAgJ0luc3RlYWQgaXQgd2lsbCB3YWxrIHRoZSBkaXJlY3RvcnkgdHJlZSBhcyBub3JtYWwgbG9va2luZyBmb3IgZW50cnktcG9pbnRzLCBhbmQgdGhlbiB3cml0ZSBhIG5ldyBtYW5pZmVzdCBmaWxlLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2Vycm9yLW9uLWZhaWxlZC1lbnRyeS1wb2ludCcsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdTZXQgdGhpcyBvcHRpb24gaW4gb3JkZXIgdG8gdGVybWluYXRlIGltbWVkaWF0ZWx5IHdpdGggYW4gZXJyb3IgY29kZSBpZiBhbiBlbnRyeS1wb2ludCBmYWlscyB0byBiZSBwcm9jZXNzZWQuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIGAtdGAvYC0tdGFyZ2V0YCBpcyBwcm92aWRlZCB0aGVuIHRoaXMgcHJvcGVydHkgaXMgYWx3YXlzIHRydWUgYW5kIGNhbm5vdCBiZSBjaGFuZ2VkLiBPdGhlcndpc2UgdGhlIGRlZmF1bHQgaXMgZmFsc2UuXFxuJyArXG4gICAgICAgICAgICAgICAgJ1doZW4gc2V0IHRvIGZhbHNlLCBuZ2NjIHdpbGwgY29udGludWUgdG8gcHJvY2VzcyBlbnRyeS1wb2ludHMgYWZ0ZXIgYSBmYWlsdXJlLiBJbiB3aGljaCBjYXNlIGl0IHdpbGwgbG9nIGFuIGVycm9yIGFuZCByZXN1bWUgcHJvY2Vzc2luZyBvdGhlciBlbnRyeS1wb2ludHMuJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbigndHNjb25maWcnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnQSBwYXRoIHRvIGEgdHNjb25maWcuanNvbiBmaWxlIHRoYXQgd2lsbCBiZSB1c2VkIHRvIGNvbmZpZ3VyZSB0aGUgQW5ndWxhciBjb21waWxlciBhbmQgbW9kdWxlIHJlc29sdXRpb24gdXNlZCBieSBuZ2NjLlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBub3QgcHJvdmlkZWQsIG5nY2Mgd2lsbCBhdHRlbXB0IHRvIHJlYWQgYSBgdHNjb25maWcuanNvbmAgZmlsZSBmcm9tIHRoZSBmb2xkZXIgYWJvdmUgdGhhdCBnaXZlbiBieSB0aGUgYC1zYCBvcHRpb24uXFxuJyArXG4gICAgICAgICAgICAgICAgJ1NldCB0byBmYWxzZSAodmlhIGAtLW5vLXRzY29uZmlnYCkgaWYgeW91IGRvIG5vdCB3YW50IG5nY2MgdG8gdXNlIGFueSBgdHNjb25maWcuanNvbmAgZmlsZS4nLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuc3RyaWN0KClcbiAgICAgICAgICAuaGVscCgpXG4gICAgICAgICAgLnBhcnNlKGFyZ3MpO1xuXG4gIGlmIChvcHRpb25zWydmJ10gJiYgb3B0aW9uc1snZiddLmxlbmd0aCkge1xuICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICdUaGUgZm9ybWF0cyBvcHRpb24gKC1mLy0tZm9ybWF0cykgaGFzIGJlZW4gcmVtb3ZlZC4gQ29uc2lkZXIgdGhlIHByb3BlcnRpZXMgb3B0aW9uICgtcC8tLXByb3BlcnRpZXMpIGluc3RlYWQuJyk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG5cbiAgc2V0RmlsZVN5c3RlbShuZXcgTm9kZUpTRmlsZVN5c3RlbSgpKTtcblxuICBjb25zdCBiYXNlU291cmNlUGF0aCA9IHJlc29sdmUob3B0aW9uc1sncyddIHx8ICcuL25vZGVfbW9kdWxlcycpO1xuICBjb25zdCBwcm9wZXJ0aWVzVG9Db25zaWRlcjogc3RyaW5nW10gPSBvcHRpb25zWydwJ107XG4gIGNvbnN0IHRhcmdldEVudHJ5UG9pbnRQYXRoID0gb3B0aW9uc1sndCddID8gb3B0aW9uc1sndCddIDogdW5kZWZpbmVkO1xuICBjb25zdCBjb21waWxlQWxsRm9ybWF0cyA9ICFvcHRpb25zWydmaXJzdC1vbmx5J107XG4gIGNvbnN0IGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID0gb3B0aW9uc1snY3JlYXRlLWl2eS1lbnRyeS1wb2ludHMnXTtcbiAgY29uc3QgbG9nTGV2ZWwgPSBvcHRpb25zWydsJ10gYXMga2V5b2YgdHlwZW9mIExvZ0xldmVsIHwgdW5kZWZpbmVkO1xuICBjb25zdCBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID0gb3B0aW9uc1snbGVnYWN5LW1lc3NhZ2UtaWRzJ107XG4gIGNvbnN0IGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QgPSBvcHRpb25zWydpbnZhbGlkYXRlLWVudHJ5LXBvaW50LW1hbmlmZXN0J107XG4gIGNvbnN0IGVycm9yT25GYWlsZWRFbnRyeVBvaW50ID0gb3B0aW9uc1snZXJyb3Itb24tZmFpbGVkLWVudHJ5LXBvaW50J107XG4gIC8vIHlhcmdzIGlzIG5vdCBzbyBncmVhdCBhdCBtaXhlZCBzdHJpbmcrYm9vbGVhbiB0eXBlcywgc28gd2UgaGF2ZSB0byB0ZXN0IHRzY29uZmlnIGFnYWluc3QgYVxuICAvLyBzdHJpbmcgXCJmYWxzZVwiIHRvIGNhcHR1cmUgdGhlIGB0c2NvbmZpZz1mYWxzZWAgb3B0aW9uLlxuICAvLyBBbmQgd2UgaGF2ZSB0byBjb252ZXJ0IHRoZSBvcHRpb24gdG8gYSBzdHJpbmcgdG8gaGFuZGxlIGBuby10c2NvbmZpZ2AsIHdoaWNoIHdpbGwgYmUgYGZhbHNlYC5cbiAgY29uc3QgdHNDb25maWdQYXRoID0gYCR7b3B0aW9uc1sndHNjb25maWcnXX1gID09PSAnZmFsc2UnID8gbnVsbCA6IG9wdGlvbnNbJ3RzY29uZmlnJ107XG5cbiAgY29uc3QgbG9nZ2VyID0gbG9nTGV2ZWwgJiYgbmV3IENvbnNvbGVMb2dnZXIoTG9nTGV2ZWxbbG9nTGV2ZWxdKTtcblxuICByZXR1cm4ge1xuICAgIGJhc2VQYXRoOiBiYXNlU291cmNlUGF0aCxcbiAgICBwcm9wZXJ0aWVzVG9Db25zaWRlcixcbiAgICB0YXJnZXRFbnRyeVBvaW50UGF0aCxcbiAgICBjb21waWxlQWxsRm9ybWF0cyxcbiAgICBjcmVhdGVOZXdFbnRyeVBvaW50Rm9ybWF0cyxcbiAgICBsb2dnZXIsXG4gICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICBhc3luYzogb3B0aW9uc1snYXN5bmMnXSxcbiAgICBpbnZhbGlkYXRlRW50cnlQb2ludE1hbmlmZXN0LFxuICAgIGVycm9yT25GYWlsZWRFbnRyeVBvaW50LFxuICAgIHRzQ29uZmlnUGF0aFxuICB9O1xufVxuIl19