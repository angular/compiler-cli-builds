#!/usr/bin/env node
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/command_line_options", ["require", "exports", "yargs", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/logging"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCommandLineOptions = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var yargs = require("yargs");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var logging_1 = require("@angular/compiler-cli/src/ngtsc/logging");
    function parseCommandLineOptions(args) {
        var _a;
        var options = yargs
            .option('s', {
            alias: 'source',
            describe: 'A path (relative to the working directory) of the `node_modules` folder to process.',
            default: './node_modules',
            type: 'string',
        })
            .option('f', { alias: 'formats', hidden: true, array: true, type: 'string' })
            .option('p', {
            alias: 'properties',
            array: true,
            describe: 'An array of names of properties in package.json to compile (e.g. `module` or `main`)\n' +
                'Each of these properties should hold the path to a bundle-format.\n' +
                'If provided, only the specified properties are considered for processing.\n' +
                'If not provided, all the supported format properties (e.g. fesm2015, fesm5, es2015, esm2015, esm5, main, module) in the package.json are considered.',
            type: 'string',
        })
            .option('t', {
            alias: 'target',
            describe: 'A relative path (from the `source` path) to a single entry-point to process (plus its dependencies).\n' +
                'If this property is provided then `error-on-failed-entry-point` is forced to true.\n' +
                'This option overrides the `--use-program-dependencies` option.',
            type: 'string',
        })
            .option('use-program-dependencies', {
            type: 'boolean',
            describe: 'If this property is provided then the entry-points to process are parsed from the program defined by the loaded tsconfig.json. See `--tsconfig`.\n' +
                'This option is overridden by the `--target` option.',
        })
            .option('first-only', {
            describe: 'If specified then only the first matching package.json property will be compiled.\n' +
                'This option is overridden by `--typings-only`.',
            type: 'boolean',
        })
            .option('typings-only', {
            describe: 'If specified then only the typings files are processed, and no JS source files will be modified.\n' +
                'Setting this option will force `--first-only` to be set, since only one format is needed to process the typings',
            type: 'boolean',
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
            type: 'string',
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
        if ((_a = options.f) === null || _a === void 0 ? void 0 : _a.length) {
            console.error('The formats option (-f/--formats) has been removed. Consider the properties option (-p/--properties) instead.');
            process.exit(1);
        }
        var fs = new file_system_1.NodeJSFileSystem();
        (0, file_system_1.setFileSystem)(fs);
        var baseSourcePath = fs.resolve(options.s || './node_modules');
        var propertiesToConsider = options.p;
        var targetEntryPointPath = options.t;
        var compileAllFormats = !options['first-only'];
        var typingsOnly = options['typings-only'];
        var createNewEntryPointFormats = options['create-ivy-entry-points'];
        var logLevel = options.l;
        var enableI18nLegacyMessageIdFormat = options['legacy-message-ids'];
        var invalidateEntryPointManifest = options['invalidate-entry-point-manifest'];
        var errorOnFailedEntryPoint = options['error-on-failed-entry-point'];
        var findEntryPointsFromTsConfigProgram = options['use-program-dependencies'];
        // yargs is not so great at mixed string+boolean types, so we have to test tsconfig against a
        // string "false" to capture the `tsconfig=false` option.
        // And we have to convert the option to a string to handle `no-tsconfig`, which will be `false`.
        var tsConfigPath = "" + options.tsconfig === 'false' ? null : options.tsconfig;
        var logger = logLevel && new logging_1.ConsoleLogger(logging_1.LogLevel[logLevel]);
        return {
            basePath: baseSourcePath,
            propertiesToConsider: propertiesToConsider,
            targetEntryPointPath: targetEntryPointPath,
            typingsOnly: typingsOnly,
            compileAllFormats: compileAllFormats,
            createNewEntryPointFormats: createNewEntryPointFormats,
            logger: logger,
            enableI18nLegacyMessageIdFormat: enableI18nLegacyMessageIdFormat,
            async: options.async,
            invalidateEntryPointManifest: invalidateEntryPointManifest,
            errorOnFailedEntryPoint: errorOnFailedEntryPoint,
            tsConfigPath: tsConfigPath,
            findEntryPointsFromTsConfigProgram: findEntryPointsFromTsConfigProgram,
        };
    }
    exports.parseCommandLineOptions = parseCommandLineOptions;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZF9saW5lX29wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvY29tbWFuZF9saW5lX29wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUNBOzs7Ozs7T0FNRztJQUNILDZCQUErQjtJQUUvQiwyRUFBNEU7SUFDNUUsbUVBQWdFO0lBR2hFLFNBQWdCLHVCQUF1QixDQUFDLElBQWM7O1FBQ3BELElBQU0sT0FBTyxHQUNULEtBQUs7YUFDQSxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFFBQVE7WUFDZixRQUFRLEVBQ0oscUZBQXFGO1lBQ3pGLE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsSUFBSSxFQUFFLFFBQVE7U0FDZixDQUFDO2FBQ0QsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUMsQ0FBQzthQUMxRSxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1gsS0FBSyxFQUFFLFlBQVk7WUFDbkIsS0FBSyxFQUFFLElBQUk7WUFDWCxRQUFRLEVBQ0osd0ZBQXdGO2dCQUN4RixxRUFBcUU7Z0JBQ3JFLDZFQUE2RTtnQkFDN0Usc0pBQXNKO1lBQzFKLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQyxHQUFHLEVBQUU7WUFDWCxLQUFLLEVBQUUsUUFBUTtZQUNmLFFBQVEsRUFDSix3R0FBd0c7Z0JBQ3hHLHNGQUFzRjtnQkFDdEYsZ0VBQWdFO1lBQ3BFLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQzthQUNELE1BQU0sQ0FBQywwQkFBMEIsRUFBRTtZQUNsQyxJQUFJLEVBQUUsU0FBUztZQUNmLFFBQVEsRUFDSixvSkFBb0o7Z0JBQ3BKLHFE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QUM7UUFDdEUsSUFBTSw0QkFBNEIsR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUNoRixJQUFNLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ3ZFLElBQU0sa0NBQWtDLEdBQUcsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDL0UsNkZBQTZGO1FBQzdGLHlEQUF5RDtRQUN6RCxnR0FBZ0c7UUFDaEcsSUFBTSxZQUFZLEdBQUcsS0FBRyxPQUFPLENBQUMsUUFBVSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBRWpGLElBQU0sTUFBTSxHQUFHLFFBQVEsSUFBSSxJQUFJLHVCQUFhLENBQUMsa0JBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRWpFLE9BQU87WUFDTCxRQUFRLEVBQUUsY0FBYztZQUN4QixvQkFBb0Isc0JBQUE7WUFDcEIsb0JBQW9CLHNCQUFBO1lBQ3BCLFdBQVcsYUFBQTtZQUNYLGlCQUFpQixtQkFBQTtZQUNqQiwwQkFBMEIsNEJBQUE7WUFDMUIsTUFBTSxRQUFBO1lBQ04sK0JBQStCLGlDQUFBO1lBQy9CLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQiw0QkFBNEIsOEJBQUE7WUFDNUIsdUJBQXVCLHlCQUFBO1lBQ3ZCLFlBQVksY0FBQTtZQUNaLGtDQUFrQyxvQ0FBQTtTQUNuQyxDQUFDO0lBQ0osQ0FBQztJQWxKRCwwREFrSkMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHlhcmdzIGZyb20gJ3lhcmdzJztcblxuaW1wb3J0IHtzZXRGaWxlU3lzdGVtLCBOb2RlSlNGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb25zb2xlTG9nZ2VyLCBMb2dMZXZlbH0gZnJvbSAnLi4vLi4vc3JjL25ndHNjL2xvZ2dpbmcnO1xuaW1wb3J0IHtOZ2NjT3B0aW9uc30gZnJvbSAnLi9uZ2NjX29wdGlvbnMnO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDb21tYW5kTGluZU9wdGlvbnMoYXJnczogc3RyaW5nW10pOiBOZ2NjT3B0aW9ucyB7XG4gIGNvbnN0IG9wdGlvbnMgPVxuICAgICAgeWFyZ3NcbiAgICAgICAgICAub3B0aW9uKCdzJywge1xuICAgICAgICAgICAgYWxpYXM6ICdzb3VyY2UnLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0EgcGF0aCAocmVsYXRpdmUgdG8gdGhlIHdvcmtpbmcgZGlyZWN0b3J5KSBvZiB0aGUgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRvIHByb2Nlc3MuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6ICcuL25vZGVfbW9kdWxlcycsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2YnLCB7YWxpYXM6ICdmb3JtYXRzJywgaGlkZGVuOsKgdHJ1ZSwgYXJyYXk6IHRydWUsIHR5cGU6ICdzdHJpbmcnfSlcbiAgICAgICAgICAub3B0aW9uKCdwJywge1xuICAgICAgICAgICAgYWxpYXM6ICdwcm9wZXJ0aWVzJyxcbiAgICAgICAgICAgIGFycmF5OiB0cnVlLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0FuIGFycmF5IG9mIG5hbWVzIG9mIHByb3BlcnRpZXMgaW4gcGFja2FnZS5qc29uIHRvIGNvbXBpbGUgKGUuZy4gYG1vZHVsZWAgb3IgYG1haW5gKVxcbicgK1xuICAgICAgICAgICAgICAgICdFYWNoIG9mIHRoZXNlIHByb3BlcnRpZXMgc2hvdWxkIGhvbGQgdGhlIHBhdGggdG8gYSBidW5kbGUtZm9ybWF0LlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBwcm92aWRlZCwgb25seSB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMgYXJlIGNvbnNpZGVyZWQgZm9yIHByb2Nlc3NpbmcuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0lmIG5vdCBwcm92aWRlZCwgYWxsIHRoZSBzdXBwb3J0ZWQgZm9ybWF0IHByb3BlcnRpZXMgKGUuZy4gZmVzbTIwMTUsIGZlc201LCBlczIwMTUsIGVzbTIwMTUsIGVzbTUsIG1haW4sIG1vZHVsZSkgaW4gdGhlIHBhY2thZ2UuanNvbiBhcmUgY29uc2lkZXJlZC4nLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCd0Jywge1xuICAgICAgICAgICAgYWxpYXM6ICd0YXJnZXQnLFxuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0EgcmVsYXRpdmUgcGF0aCAoZnJvbSB0aGUgYHNvdXJjZWAgcGF0aCkgdG8gYSBzaW5nbGUgZW50cnktcG9pbnQgdG8gcHJvY2VzcyAocGx1cyBpdHMgZGVwZW5kZW5jaWVzKS5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgdGhpcyBwcm9wZXJ0eSBpcyBwcm92aWRlZCB0aGVuIGBlcnJvci1vbi1mYWlsZWQtZW50cnktcG9pbnRgIGlzIGZvcmNlZCB0byB0cnVlLlxcbicgK1xuICAgICAgICAgICAgICAgICdUaGlzIG9wdGlvbiBvdmVycmlkZXMgdGhlIGAtLXVzZS1wcm9ncmFtLWRlcGVuZGVuY2llc2Agb3B0aW9uLicsXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ3VzZS1wcm9ncmFtLWRlcGVuZGVuY2llcycsIHtcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdJZiB0aGlzIHByb3BlcnR5IGlzIHByb3ZpZGVkIHRoZW4gdGhlIGVudHJ5LXBvaW50cyB0byBwcm9jZXNzIGFyZSBwYXJzZWQgZnJvbSB0aGUgcHJvZ3JhbSBkZWZpbmVkIGJ5IHRoZSBsb2FkZWQgdHNjb25maWcuanNvbi4gU2VlIGAtLXRzY29uZmlnYC5cXG4nICtcbiAgICAgICAgICAgICAgICAnVGhpcyBvcHRpb24gaXMgb3ZlcnJpZGRlbiBieSB0aGUgYC0tdGFyZ2V0YCBvcHRpb24uJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2ZpcnN0LW9ubHknLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnSWYgc3BlY2lmaWVkIHRoZW4gb25seSB0aGUgZmlyc3QgbWF0Y2hpbmcgcGFja2FnZS5qc29uIHByb3BlcnR5IHdpbGwgYmUgY29tcGlsZWQuXFxuJyArXG4gICAgICAgICAgICAgICAgJ1RoaXMgb3B0aW9uIGlzIG92ZXJyaWRkZW4gYnkgYC0tdHlwaW5ncy1vbmx5YC4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbigndHlwaW5ncy1vbmx5Jywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHNwZWNpZmllZCB0aGVuIG9ubHkgdGhlIHR5cGluZ3MgZmlsZXMgYXJlIHByb2Nlc3NlZCwgYW5kIG5vIEpTIHNvdXJjZSBmaWxlcyB3aWxsIGJlIG1vZGlmaWVkLlxcbicgK1xuICAgICAgICAgICAgICAgICdTZXR0aW5nIHRoaXMgb3B0aW9uIHdpbGwgZm9yY2UgYC0tZmlyc3Qtb25seWAgdG8gYmUgc2V0LCBzaW5jZSBvbmx5IG9uZSBmb3JtYXQgaXMgbmVlZGVkIHRvIHByb2Nlc3MgdGhlIHR5cGluZ3MnLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLm9wdGlvbignY3JlYXRlLWl2eS1lbnRyeS1wb2ludHMnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnSWYgc3BlY2lmaWVkIHRoZW4gbmV3IGAqX2l2eV9uZ2NjYCBlbnRyeS1wb2ludHMgd2lsbCBiZSBhZGRlZCB0byBwYWNrYWdlLmpzb24gcmF0aGVyIHRoYW4gbW9kaWZ5aW5nIHRoZSBvbmVzIGluLXBsYWNlLlxcbicgK1xuICAgICAgICAgICAgICAgICdGb3IgdGhpcyB0byB3b3JrIHlvdSBuZWVkIHRvIGhhdmUgY3VzdG9tIHJlc29sdXRpb24gc2V0IHVwIChlLmcuIGluIHdlYnBhY2spIHRvIGxvb2sgZm9yIHRoZXNlIG5ldyBlbnRyeS1wb2ludHMuXFxuJyArXG4gICAgICAgICAgICAgICAgJ1RoZSBBbmd1bGFyIENMSSBkb2VzIHRoaXMgYWxyZWFkeSwgc28gaXQgaXMgc2FmZSB0byB1c2UgdGhpcyBvcHRpb24gaWYgdGhlIHByb2plY3QgaXMgYmVpbmcgYnVpbHQgdmlhIHRoZSBDTEkuJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2xlZ2FjeS1tZXNzYWdlLWlkcycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOiAnUmVuZGVyIGAkbG9jYWxpemVgIG1lc3NhZ2VzIHdpdGggbGVnYWN5IGZvcm1hdCBpZHMuXFxuJyArXG4gICAgICAgICAgICAgICAgJ1RoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYC4gT25seSBzZXQgdGhpcyB0byBgZmFsc2VgIGlmIHlvdSBkbyBub3Qgd2FudCBsZWdhY3kgbWVzc2FnZSBpZHMgdG9cXG4nICtcbiAgICAgICAgICAgICAgICAnYmUgcmVuZGVyZWQuIEZvciBleGFtcGxlLCBpZiB5b3UgYXJlIG5vdCB1c2luZyBsZWdhY3kgbWVzc2FnZSBpZHMgaW4geW91ciB0cmFuc2xhdGlvbiBmaWxlc1xcbicgK1xuICAgICAgICAgICAgICAgICdBTkQgYXJlIG5vdCBkb2luZyBjb21waWxlLXRpbWUgaW5saW5pbmcgb2YgdHJhbnNsYXRpb25zLCBpbiB3aGljaCBjYXNlIHRoZSBleHRyYSBtZXNzYWdlIGlkc1xcbicgK1xuICAgICAgICAgICAgICAgICd3b3VsZCBhZGQgdW53YW50ZWQgc2l6ZSB0byB0aGUgZmluYWwgc291cmNlIGJ1bmRsZS5cXG4nICtcbiAgICAgICAgICAgICAgICAnSXQgaXMgc2FmZSB0byBsZWF2ZSB0aGlzIHNldCB0byB0cnVlIGlmIHlvdSBhcmUgZG9pbmcgY29tcGlsZS10aW1lIGlubGluaW5nIGJlY2F1c2UgdGhlIGV4dHJhXFxuJyArXG4gICAgICAgICAgICAgICAgJ2xlZ2FjeSBtZXNzYWdlIGlkcyB3aWxsIGFsbCBiZSBzdHJpcHBlZCBkdXJpbmcgdHJhbnNsYXRpb24uJyxcbiAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgIGRlZmF1bHQ6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdhc3luYycsIHtcbiAgICAgICAgICAgIGRlc2NyaWJlOlxuICAgICAgICAgICAgICAgICdXaGV0aGVyIHRvIGNvbXBpbGUgYXN5bmNocm9ub3VzbHkuIFRoaXMgaXMgZW5hYmxlZCBieSBkZWZhdWx0IGFzIGl0IGFsbG93cyBjb21waWxhdGlvbnMgdG8gYmUgcGFyYWxsZWxpemVkLlxcbicgK1xuICAgICAgICAgICAgICAgICdEaXNhYmxpbmcgYXN5bmNocm9ub3VzIGNvbXBpbGF0aW9uIG1heSBiZSB1c2VmdWwgZm9yIGRlYnVnZ2luZy4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ2wnLCB7XG4gICAgICAgICAgICBhbGlhczogJ2xvZ2xldmVsJyxcbiAgICAgICAgICAgIGRlc2NyaWJlOiAnVGhlIGxvd2VzdCBzZXZlcml0eSBsb2dnaW5nIG1lc3NhZ2UgdGhhdCBzaG91bGQgYmUgb3V0cHV0LicsXG4gICAgICAgICAgICBjaG9pY2VzOiBbJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddLFxuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdpbnZhbGlkYXRlLWVudHJ5LXBvaW50LW1hbmlmZXN0Jywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0lmIHRoaXMgaXMgc2V0IHRoZW4gbmdjYyB3aWxsIG5vdCByZWFkIGFuIGVudHJ5LXBvaW50IG1hbmlmZXN0IGZpbGUgZnJvbSBkaXNrLlxcbicgK1xuICAgICAgICAgICAgICAgICdJbnN0ZWFkIGl0IHdpbGwgd2FsayB0aGUgZGlyZWN0b3J5IHRyZWUgYXMgbm9ybWFsIGxvb2tpbmcgZm9yIGVudHJ5LXBvaW50cywgYW5kIHRoZW4gd3JpdGUgYSBuZXcgbWFuaWZlc3QgZmlsZS4nLFxuICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgfSlcbiAgICAgICAgICAub3B0aW9uKCdlcnJvci1vbi1mYWlsZWQtZW50cnktcG9pbnQnLCB7XG4gICAgICAgICAgICBkZXNjcmliZTpcbiAgICAgICAgICAgICAgICAnU2V0IHRoaXMgb3B0aW9uIGluIG9yZGVyIHRvIHRlcm1pbmF0ZSBpbW1lZGlhdGVseSB3aXRoIGFuIGVycm9yIGNvZGUgaWYgYW4gZW50cnktcG9pbnQgZmFpbHMgdG8gYmUgcHJvY2Vzc2VkLlxcbicgK1xuICAgICAgICAgICAgICAgICdJZiBgLXRgL2AtLXRhcmdldGAgaXMgcHJvdmlkZWQgdGhlbiB0aGlzIHByb3BlcnR5IGlzIGFsd2F5cyB0cnVlIGFuZCBjYW5ub3QgYmUgY2hhbmdlZC4gT3RoZXJ3aXNlIHRoZSBkZWZhdWx0IGlzIGZhbHNlLlxcbicgK1xuICAgICAgICAgICAgICAgICdXaGVuIHNldCB0byBmYWxzZSwgbmdjYyB3aWxsIGNvbnRpbnVlIHRvIHByb2Nlc3MgZW50cnktcG9pbnRzIGFmdGVyIGEgZmFpbHVyZS4gSW4gd2hpY2ggY2FzZSBpdCB3aWxsIGxvZyBhbiBlcnJvciBhbmQgcmVzdW1lIHByb2Nlc3Npbmcgb3RoZXIgZW50cnktcG9pbnRzLicsXG4gICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5vcHRpb24oJ3RzY29uZmlnJywge1xuICAgICAgICAgICAgZGVzY3JpYmU6XG4gICAgICAgICAgICAgICAgJ0EgcGF0aCB0byBhIHRzY29uZmlnLmpzb24gZmlsZSB0aGF0IHdpbGwgYmUgdXNlZCB0byBjb25maWd1cmUgdGhlIEFuZ3VsYXIgY29tcGlsZXIgYW5kIG1vZHVsZSByZXNvbHV0aW9uIHVzZWQgYnkgbmdjYy5cXG4nICtcbiAgICAgICAgICAgICAgICAnSWYgbm90IHByb3ZpZGVkLCBuZ2NjIHdpbGwgYXR0ZW1wdCB0byByZWFkIGEgYHRzY29uZmlnLmpzb25gIGZpbGUgZnJvbSB0aGUgZm9sZGVyIGFib3ZlIHRoYXQgZ2l2ZW4gYnkgdGhlIGAtc2Agb3B0aW9uLlxcbicgK1xuICAgICAgICAgICAgICAgICdTZXQgdG8gZmFsc2UgKHZpYSBgLS1uby10c2NvbmZpZ2ApIGlmIHlvdSBkbyBub3Qgd2FudCBuZ2NjIHRvIHVzZSBhbnkgYHRzY29uZmlnLmpzb25gIGZpbGUuJyxcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnN0cmljdCgpXG4gICAgICAgICAgLmhlbHAoKVxuICAgICAgICAgIC5wYXJzZShhcmdzKTtcblxuICBpZiAob3B0aW9ucy5mPy5sZW5ndGgpIHtcbiAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAnVGhlIGZvcm1hdHMgb3B0aW9uICgtZi8tLWZvcm1hdHMpIGhhcyBiZWVuIHJlbW92ZWQuIENvbnNpZGVyIHRoZSBwcm9wZXJ0aWVzIG9wdGlvbiAoLXAvLS1wcm9wZXJ0aWVzKSBpbnN0ZWFkLicpO1xuICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgfVxuXG4gIGNvbnN0IGZzID0gbmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKTtcbiAgc2V0RmlsZVN5c3RlbShmcyk7XG5cbiAgY29uc3QgYmFzZVNvdXJjZVBhdGggPSBmcy5yZXNvbHZlKG9wdGlvbnMucyB8fCAnLi9ub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgcHJvcGVydGllc1RvQ29uc2lkZXIgPSBvcHRpb25zLnA7XG4gIGNvbnN0IHRhcmdldEVudHJ5UG9pbnRQYXRoID0gb3B0aW9ucy50O1xuICBjb25zdCBjb21waWxlQWxsRm9ybWF0cyA9ICFvcHRpb25zWydmaXJzdC1vbmx5J107XG4gIGNvbnN0IHR5cGluZ3NPbmx5ID0gb3B0aW9uc1sndHlwaW5ncy1vbmx5J107XG4gIGNvbnN0IGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzID0gb3B0aW9uc1snY3JlYXRlLWl2eS1lbnRyeS1wb2ludHMnXTtcbiAgY29uc3QgbG9nTGV2ZWwgPSBvcHRpb25zLmwgYXMga2V5b2YgdHlwZW9mIExvZ0xldmVsIHwgdW5kZWZpbmVkO1xuICBjb25zdCBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ID0gb3B0aW9uc1snbGVnYWN5LW1lc3NhZ2UtaWRzJ107XG4gIGNvbnN0IGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QgPSBvcHRpb25zWydpbnZhbGlkYXRlLWVudHJ5LXBvaW50LW1hbmlmZXN0J107XG4gIGNvbnN0IGVycm9yT25GYWlsZWRFbnRyeVBvaW50ID0gb3B0aW9uc1snZXJyb3Itb24tZmFpbGVkLWVudHJ5LXBvaW50J107XG4gIGNvbnN0IGZpbmRFbnRyeVBvaW50c0Zyb21Uc0NvbmZpZ1Byb2dyYW0gPSBvcHRpb25zWyd1c2UtcHJvZ3JhbS1kZXBlbmRlbmNpZXMnXTtcbiAgLy8geWFyZ3MgaXMgbm90IHNvIGdyZWF0IGF0IG1peGVkIHN0cmluZytib29sZWFuIHR5cGVzLCBzbyB3ZSBoYXZlIHRvIHRlc3QgdHNjb25maWcgYWdhaW5zdCBhXG4gIC8vIHN0cmluZyBcImZhbHNlXCIgdG8gY2FwdHVyZSB0aGUgYHRzY29uZmlnPWZhbHNlYCBvcHRpb24uXG4gIC8vIEFuZCB3ZSBoYXZlIHRvIGNvbnZlcnQgdGhlIG9wdGlvbiB0byBhIHN0cmluZyB0byBoYW5kbGUgYG5vLXRzY29uZmlnYCwgd2hpY2ggd2lsbCBiZSBgZmFsc2VgLlxuICBjb25zdCB0c0NvbmZpZ1BhdGggPSBgJHtvcHRpb25zLnRzY29uZmlnfWAgPT09ICdmYWxzZScgPyBudWxsIDogb3B0aW9ucy50c2NvbmZpZztcblxuICBjb25zdCBsb2dnZXIgPSBsb2dMZXZlbCAmJiBuZXcgQ29uc29sZUxvZ2dlcihMb2dMZXZlbFtsb2dMZXZlbF0pO1xuXG4gIHJldHVybiB7XG4gICAgYmFzZVBhdGg6IGJhc2VTb3VyY2VQYXRoLFxuICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyLFxuICAgIHRhcmdldEVudHJ5UG9pbnRQYXRoLFxuICAgIHR5cGluZ3NPbmx5LFxuICAgIGNvbXBpbGVBbGxGb3JtYXRzLFxuICAgIGNyZWF0ZU5ld0VudHJ5UG9pbnRGb3JtYXRzLFxuICAgIGxvZ2dlcixcbiAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgIGFzeW5jOiBvcHRpb25zLmFzeW5jLFxuICAgIGludmFsaWRhdGVFbnRyeVBvaW50TWFuaWZlc3QsXG4gICAgZXJyb3JPbkZhaWxlZEVudHJ5UG9pbnQsXG4gICAgdHNDb25maWdQYXRoLFxuICAgIGZpbmRFbnRyeVBvaW50c0Zyb21Uc0NvbmZpZ1Byb2dyYW0sXG4gIH07XG59XG4iXX0=