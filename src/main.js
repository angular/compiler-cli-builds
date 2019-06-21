#!/usr/bin/env node
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/main", ["require", "exports", "tslib", "reflect-metadata", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/util", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/src/perform_watch"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    // Must be imported first, because Angular decorators throw on load.
    require("reflect-metadata");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var api = require("@angular/compiler-cli/src/transformers/api");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    var perform_compile_1 = require("@angular/compiler-cli/src/perform_compile");
    var perform_watch_1 = require("@angular/compiler-cli/src/perform_watch");
    function main(args, consoleError, config, customTransformers, programReuse, modifiedResourceFiles) {
        if (consoleError === void 0) { consoleError = console.error; }
        var _a = config || readNgcCommandLineAndConfiguration(args), project = _a.project, rootNames = _a.rootNames, options = _a.options, configErrors = _a.errors, watch = _a.watch, emitFlags = _a.emitFlags;
        if (configErrors.length) {
            return reportErrorsAndExit(configErrors, /*options*/ undefined, consoleError);
        }
        if (watch) {
            var result = watchMode(project, options, consoleError);
            return reportErrorsAndExit(result.firstCompileResult, options, consoleError);
        }
        var oldProgram;
        if (programReuse !== undefined) {
            oldProgram = programReuse.program;
        }
        var _b = perform_compile_1.performCompilation({
            rootNames: rootNames,
            options: options,
            emitFlags: emitFlags,
            oldProgram: oldProgram,
            emitCallback: createEmitCallback(options), customTransformers: customTransformers, modifiedResourceFiles: modifiedResourceFiles
        }), compileDiags = _b.diagnostics, program = _b.program;
        if (programReuse !== undefined) {
            programReuse.program = program;
        }
        return reportErrorsAndExit(compileDiags, options, consoleError);
    }
    exports.main = main;
    function mainDiagnosticsForTest(args, config) {
        var _a = config || readNgcCommandLineAndConfiguration(args), project = _a.project, rootNames = _a.rootNames, options = _a.options, configErrors = _a.errors, watch = _a.watch, emitFlags = _a.emitFlags;
        if (configErrors.length) {
            return configErrors;
        }
        var compileDiags = perform_compile_1.performCompilation({ rootNames: rootNames, options: options, emitFlags: emitFlags, emitCallback: createEmitCallback(options) }).diagnostics;
        return compileDiags;
    }
    exports.mainDiagnosticsForTest = mainDiagnosticsForTest;
    function createEmitCallback(options) {
        var transformDecorators = !options.enableIvy && options.annotationsAs !== 'decorators';
        var transformTypesToClosure = options.annotateForClosureCompiler;
        if (!transformDecorators && !transformTypesToClosure) {
            return undefined;
        }
        if (transformDecorators) {
            // This is needed as a workaround for https://github.com/angular/tsickle/issues/635
            // Otherwise tsickle might emit references to non imported values
            // as TypeScript elided the import.
            options.emitDecoratorMetadata = true;
        }
        var tsickleHost = {
            shouldSkipTsickleProcessing: function (fileName) {
                return /\.d\.ts$/.test(fileName) || util_1.GENERATED_FILES.test(fileName);
            },
            pathToModuleName: function (context, importPath) { return ''; },
            shouldIgnoreWarningsForPath: function (filePath) { return false; },
            fileNameToModuleId: function (fileName) { return fileName; },
            googmodule: false,
            untyped: true,
            convertIndexImportShorthand: false, transformDecorators: transformDecorators, transformTypesToClosure: transformTypesToClosure,
        };
        if (options.annotateForClosureCompiler || options.annotationsAs === 'static fields') {
            return function (_a) {
                var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, _b = _a.customTransformers, customTransformers = _b === void 0 ? {} : _b, host = _a.host, options = _a.options;
                // tslint:disable-next-line:no-require-imports only depend on tsickle if requested
                return require('tsickle').emitWithTsickle(program, tslib_1.__assign({}, tsickleHost, { options: options, host: host }), host, options, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, {
                    beforeTs: customTransformers.before,
                    afterTs: customTransformers.after,
                });
            };
        }
        else {
            return function (_a) {
                var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, _b = _a.customTransformers, customTransformers = _b === void 0 ? {} : _b;
                return program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, { after: customTransformers.after, before: customTransformers.before });
            };
        }
    }
    function readNgcCommandLineAndConfiguration(args) {
        var options = {};
        var parsedArgs = require('minimist')(args);
        if (parsedArgs.i18nFile)
            options.i18nInFile = parsedArgs.i18nFile;
        if (parsedArgs.i18nFormat)
            options.i18nInFormat = parsedArgs.i18nFormat;
        if (parsedArgs.locale)
            options.i18nInLocale = parsedArgs.locale;
        var mt = parsedArgs.missingTranslation;
        if (mt === 'error' || mt === 'warning' || mt === 'ignore') {
            options.i18nInMissingTranslations = mt;
        }
        var config = readCommandLineAndConfiguration(args, options, ['i18nFile', 'i18nFormat', 'locale', 'missingTranslation', 'watch']);
        var watch = parsedArgs.w || parsedArgs.watch;
        return tslib_1.__assign({}, config, { watch: watch });
    }
    exports.readNgcCommandLineAndConfiguration = readNgcCommandLineAndConfiguration;
    function readCommandLineAndConfiguration(args, existingOptions, ngCmdLineOptions) {
        if (existingOptions === void 0) { existingOptions = {}; }
        if (ngCmdLineOptions === void 0) { ngCmdLineOptions = []; }
        var cmdConfig = ts.parseCommandLine(args);
        var project = cmdConfig.options.project || '.';
        var cmdErrors = cmdConfig.errors.filter(function (e) {
            if (typeof e.messageText === 'string') {
                var msg_1 = e.messageText;
                return !ngCmdLineOptions.some(function (o) { return msg_1.indexOf(o) >= 0; });
            }
            return true;
        });
        if (cmdErrors.length) {
            return {
                project: project,
                rootNames: [],
                options: cmdConfig.options,
                errors: cmdErrors,
                emitFlags: api.EmitFlags.Default
            };
        }
        var allDiagnostics = [];
        var config = perform_compile_1.readConfiguration(project, cmdConfig.options);
        var options = tslib_1.__assign({}, config.options, existingOptions);
        if (options.locale) {
            options.i18nInLocale = options.locale;
        }
        return {
            project: project,
            rootNames: config.rootNames, options: options,
            errors: config.errors,
            emitFlags: config.emitFlags
        };
    }
    exports.readCommandLineAndConfiguration = readCommandLineAndConfiguration;
    function getFormatDiagnosticsHost(options) {
        var basePath = options ? options.basePath : undefined;
        return {
            getCurrentDirectory: function () { return basePath || ts.sys.getCurrentDirectory(); },
            // We need to normalize the path separators here because by default, TypeScript
            // compiler hosts use posix canonical paths. In order to print consistent diagnostics,
            // we also normalize the paths.
            getCanonicalFileName: function (fileName) { return fileName.replace(/\\/g, '/'); },
            getNewLine: function () {
                // Manually determine the proper new line string based on the passed compiler
                // options. There is no public TypeScript function that returns the corresponding
                // new line string. see: https://github.com/Microsoft/TypeScript/issues/29581
                if (options && options.newLine !== undefined) {
                    return options.newLine === ts.NewLineKind.LineFeed ? '\n' : '\r\n';
                }
                return ts.sys.newLine;
            },
        };
    }
    function reportErrorsAndExit(allDiagnostics, options, consoleError) {
        if (consoleError === void 0) { consoleError = console.error; }
        var errorsAndWarnings = perform_compile_1.filterErrorsAndWarnings(allDiagnostics);
        if (errorsAndWarnings.length) {
            var formatHost = getFormatDiagnosticsHost(options);
            if (options && options.enableIvy === true) {
                var ngDiagnostics = errorsAndWarnings.filter(api.isNgDiagnostic);
                var tsDiagnostics = errorsAndWarnings.filter(api.isTsDiagnostic);
                consoleError(diagnostics_1.replaceTsWithNgInErrors(ts.formatDiagnosticsWithColorAndContext(tsDiagnostics, formatHost)));
                consoleError(perform_compile_1.formatDiagnostics(ngDiagnostics, formatHost));
            }
            else {
                consoleError(perform_compile_1.formatDiagnostics(errorsAndWarnings, formatHost));
            }
        }
        return perform_compile_1.exitCodeFromResult(allDiagnostics);
    }
    function watchMode(project, options, consoleError) {
        return perform_watch_1.performWatchCompilation(perform_watch_1.createPerformWatchHost(project, function (diagnostics) {
            consoleError(perform_compile_1.formatDiagnostics(diagnostics, getFormatDiagnosticsHost(options)));
        }, options, function (options) { return createEmitCallback(options); }));
    }
    exports.watchMode = watchMode;
    // CLI entry point
    if (require.main === module) {
        var args = process.argv.slice(2);
        process.exitCode = main(args);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsb0VBQW9FO0lBQ3BFLDRCQUEwQjtJQUUxQiwrQkFBaUM7SUFHakMsMkVBQTREO0lBQzVELGdFQUEwQztJQUMxQyxvRUFBb0Q7SUFFcEQsNkVBQW9NO0lBQ3BNLHlFQUFnRjtJQUVoRixTQUFnQixJQUFJLENBQ2hCLElBQWMsRUFBRSxZQUFpRCxFQUNqRSxNQUErQixFQUFFLGtCQUEyQyxFQUFFLFlBRTdFLEVBQ0QscUJBQW1DO1FBSm5CLDZCQUFBLEVBQUEsZUFBb0MsT0FBTyxDQUFDLEtBQUs7UUFLL0QsSUFBQSx1REFDa0QsRUFEakQsb0JBQU8sRUFBRSx3QkFBUyxFQUFFLG9CQUFPLEVBQUUsd0JBQW9CLEVBQUUsZ0JBQUssRUFBRSx3QkFDVCxDQUFDO1FBQ3ZELElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRTtZQUN2QixPQUFPLG1CQUFtQixDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQy9FO1FBQ0QsSUFBSSxLQUFLLEVBQUU7WUFDVCxJQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN6RCxPQUFPLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDOUU7UUFFRCxJQUFJLFVBQWlDLENBQUM7UUFDdEMsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFO1lBQzlCLFVBQVUsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDO1NBQ25DO1FBRUssSUFBQTs7Ozs7O1VBTUosRUFOSyw2QkFBeUIsRUFBRSxvQkFNaEMsQ0FBQztRQUNILElBQUks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T0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7UUFDM0IsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsT0FBTyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDL0IiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIE11c3QgYmUgaW1wb3J0ZWQgZmlyc3QsIGJlY2F1c2UgQW5ndWxhciBkZWNvcmF0b3JzIHRocm93IG9uIGxvYWQuXG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIHRzaWNrbGUgZnJvbSAndHNpY2tsZSc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4vbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge0dFTkVSQVRFRF9GSUxFU30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmltcG9ydCB7ZXhpdENvZGVGcm9tUmVzdWx0LCBwZXJmb3JtQ29tcGlsYXRpb24sIHJlYWRDb25maWd1cmF0aW9uLCBmb3JtYXREaWFnbm9zdGljcywgRGlhZ25vc3RpY3MsIFBhcnNlZENvbmZpZ3VyYXRpb24sIFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCwgZmlsdGVyRXJyb3JzQW5kV2FybmluZ3N9IGZyb20gJy4vcGVyZm9ybV9jb21waWxlJztcbmltcG9ydCB7cGVyZm9ybVdhdGNoQ29tcGlsYXRpb24swqBjcmVhdGVQZXJmb3JtV2F0Y2hIb3N0fSBmcm9tICcuL3BlcmZvcm1fd2F0Y2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbihcbiAgICBhcmdzOiBzdHJpbmdbXSwgY29uc29sZUVycm9yOiAoczogc3RyaW5nKSA9PiB2b2lkID0gY29uc29sZS5lcnJvcixcbiAgICBjb25maWc/OiBOZ2NQYXJzZWRDb25maWd1cmF0aW9uLCBjdXN0b21UcmFuc2Zvcm1lcnM/OiBhcGkuQ3VzdG9tVHJhbnNmb3JtZXJzLCBwcm9ncmFtUmV1c2U/OiB7XG4gICAgICBwcm9ncmFtOiBhcGkuUHJvZ3JhbSB8IHVuZGVmaW5lZCxcbiAgICB9LFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcz86IFNldDxzdHJpbmc+KTogbnVtYmVyIHtcbiAgbGV0IHtwcm9qZWN0LCByb290TmFtZXMsIG9wdGlvbnMsIGVycm9yczogY29uZmlnRXJyb3JzLCB3YXRjaCwgZW1pdEZsYWdzfSA9XG4gICAgICBjb25maWcgfHwgcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzKTtcbiAgaWYgKGNvbmZpZ0Vycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gcmVwb3J0RXJyb3JzQW5kRXhpdChjb25maWdFcnJvcnMsIC8qb3B0aW9ucyovIHVuZGVmaW5lZCwgY29uc29sZUVycm9yKTtcbiAgfVxuICBpZiAod2F0Y2gpIHtcbiAgICBjb25zdCByZXN1bHQgPSB3YXRjaE1vZGUocHJvamVjdCwgb3B0aW9ucywgY29uc29sZUVycm9yKTtcbiAgICByZXR1cm4gcmVwb3J0RXJyb3JzQW5kRXhpdChyZXN1bHQuZmlyc3RDb21waWxlUmVzdWx0LCBvcHRpb25zLCBjb25zb2xlRXJyb3IpO1xuICB9XG5cbiAgbGV0IG9sZFByb2dyYW06IGFwaS5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgaWYgKHByb2dyYW1SZXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgb2xkUHJvZ3JhbSA9IHByb2dyYW1SZXVzZS5wcm9ncmFtO1xuICB9XG5cbiAgY29uc3Qge2RpYWdub3N0aWNzOiBjb21waWxlRGlhZ3MsIHByb2dyYW19ID0gcGVyZm9ybUNvbXBpbGF0aW9uKHtcbiAgICByb290TmFtZXMsXG4gICAgb3B0aW9ucyxcbiAgICBlbWl0RmxhZ3MsXG4gICAgb2xkUHJvZ3JhbSxcbiAgICBlbWl0Q2FsbGJhY2s6IGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zKSwgY3VzdG9tVHJhbnNmb3JtZXJzLCBtb2RpZmllZFJlc291cmNlRmlsZXNcbiAgfSk7XG4gIGlmIChwcm9ncmFtUmV1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgIHByb2dyYW1SZXVzZS5wcm9ncmFtID0gcHJvZ3JhbTtcbiAgfVxuICByZXR1cm4gcmVwb3J0RXJyb3JzQW5kRXhpdChjb21waWxlRGlhZ3MsIG9wdGlvbnMsIGNvbnNvbGVFcnJvcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluRGlhZ25vc3RpY3NGb3JUZXN0KFxuICAgIGFyZ3M6IHN0cmluZ1tdLCBjb25maWc/OiBOZ2NQYXJzZWRDb25maWd1cmF0aW9uKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPiB7XG4gIGxldCB7cHJvamVjdCwgcm9vdE5hbWVzLCBvcHRpb25zLCBlcnJvcnM6IGNvbmZpZ0Vycm9ycywgd2F0Y2gsIGVtaXRGbGFnc30gPVxuICAgICAgY29uZmlnIHx8IHJlYWROZ2NDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oYXJncyk7XG4gIGlmIChjb25maWdFcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGNvbmZpZ0Vycm9ycztcbiAgfVxuICBjb25zdCB7ZGlhZ25vc3RpY3M6IGNvbXBpbGVEaWFnc30gPSBwZXJmb3JtQ29tcGlsYXRpb24oXG4gICAgICB7cm9vdE5hbWVzLCBvcHRpb25zLCBlbWl0RmxhZ3MsIGVtaXRDYWxsYmFjazogY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnMpfSk7XG4gIHJldHVybiBjb21waWxlRGlhZ3M7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKTogYXBpLlRzRW1pdENhbGxiYWNrfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRyYW5zZm9ybURlY29yYXRvcnMgPSAhb3B0aW9ucy5lbmFibGVJdnkgJiYgb3B0aW9ucy5hbm5vdGF0aW9uc0FzICE9PSAnZGVjb3JhdG9ycyc7XG4gIGNvbnN0IHRyYW5zZm9ybVR5cGVzVG9DbG9zdXJlID0gb3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjtcbiAgaWYgKCF0cmFuc2Zvcm1EZWNvcmF0b3JzICYmICF0cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKHRyYW5zZm9ybURlY29yYXRvcnMpIHtcbiAgICAvLyBUaGlzIGlzIG5lZWRlZCBhcyBhIHdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL3RzaWNrbGUvaXNzdWVzLzYzNVxuICAgIC8vIE90aGVyd2lzZSB0c2lja2xlIG1pZ2h0IGVtaXQgcmVmZXJlbmNlcyB0byBub24gaW1wb3J0ZWQgdmFsdWVzXG4gICAgLy8gYXMgVHlwZVNjcmlwdCBlbGlkZWQgdGhlIGltcG9ydC5cbiAgICBvcHRpb25zLmVtaXREZWNvcmF0b3JNZXRhZGF0YSA9IHRydWU7XG4gIH1cbiAgY29uc3QgdHNpY2tsZUhvc3Q6IFBpY2s8XG4gICAgICB0c2lja2xlLlRzaWNrbGVIb3N0LCAnc2hvdWxkU2tpcFRzaWNrbGVQcm9jZXNzaW5nJ3wncGF0aFRvTW9kdWxlTmFtZSd8XG4gICAgICAnc2hvdWxkSWdub3JlV2FybmluZ3NGb3JQYXRoJ3wnZmlsZU5hbWVUb01vZHVsZUlkJ3wnZ29vZ21vZHVsZSd8J3VudHlwZWQnfFxuICAgICAgJ2NvbnZlcnRJbmRleEltcG9ydFNob3J0aGFuZCd8J3RyYW5zZm9ybURlY29yYXRvcnMnfCd0cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZSc+ID0ge1xuICAgIHNob3VsZFNraXBUc2lja2xlUHJvY2Vzc2luZzogKGZpbGVOYW1lKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC9cXC5kXFwudHMkLy50ZXN0KGZpbGVOYW1lKSB8fCBHRU5FUkFURURfRklMRVMudGVzdChmaWxlTmFtZSksXG4gICAgcGF0aFRvTW9kdWxlTmFtZTogKGNvbnRleHQsIGltcG9ydFBhdGgpID0+ICcnLFxuICAgIHNob3VsZElnbm9yZVdhcm5pbmdzRm9yUGF0aDogKGZpbGVQYXRoKSA9PiBmYWxzZSxcbiAgICBmaWxlTmFtZVRvTW9kdWxlSWQ6IChmaWxlTmFtZSkgPT4gZmlsZU5hbWUsXG4gICAgZ29vZ21vZHVsZTogZmFsc2UsXG4gICAgdW50eXBlZDogdHJ1ZSxcbiAgICBjb252ZXJ0SW5kZXhJbXBvcnRTaG9ydGhhbmQ6IGZhbHNlLCB0cmFuc2Zvcm1EZWNvcmF0b3JzLCB0cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZSxcbiAgfTtcblxuICBpZiAob3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciB8fCBvcHRpb25zLmFubm90YXRpb25zQXMgPT09ICdzdGF0aWMgZmllbGRzJykge1xuICAgIHJldHVybiAoe1xuICAgICAgICAgICAgIHByb2dyYW0sXG4gICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSxcbiAgICAgICAgICAgICB3cml0ZUZpbGUsXG4gICAgICAgICAgICAgY2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgICAgICAgICAgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnMgPSB7fSxcbiAgICAgICAgICAgICBob3N0LFxuICAgICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgICAgfSkgPT5cbiAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1yZXF1aXJlLWltcG9ydHMgb25seSBkZXBlbmQgb24gdHNpY2tsZSBpZiByZXF1ZXN0ZWRcbiAgICAgICAgcmVxdWlyZSgndHNpY2tsZScpLmVtaXRXaXRoVHNpY2tsZShcbiAgICAgICAgICAgIHByb2dyYW0sIHsuLi50c2lja2xlSG9zdCwgb3B0aW9ucywgaG9zdH0sIGhvc3QsIG9wdGlvbnMsIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSxcbiAgICAgICAgICAgIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCB7XG4gICAgICAgICAgICAgIGJlZm9yZVRzOiBjdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlLFxuICAgICAgICAgICAgICBhZnRlclRzOiBjdXN0b21UcmFuc2Zvcm1lcnMuYWZ0ZXIsXG4gICAgICAgICAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gKHtcbiAgICAgICAgICAgICBwcm9ncmFtLFxuICAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgICAgICAgd3JpdGVGaWxlLFxuICAgICAgICAgICAgIGNhbmNlbGxhdGlvblRva2VuLFxuICAgICAgICAgICAgIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzID0ge30sXG4gICAgICAgICAgIH0pID0+XG4gICAgICAgICAgICAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgICAgICAgICB7YWZ0ZXI6IGN1c3RvbVRyYW5zZm9ybWVycy5hZnRlciwgYmVmb3JlOiBjdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlfSk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBOZ2NQYXJzZWRDb25maWd1cmF0aW9uIGV4dGVuZHMgUGFyc2VkQ29uZmlndXJhdGlvbiB7IHdhdGNoPzogYm9vbGVhbjsgfVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzOiBzdHJpbmdbXSk6IE5nY1BhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBjb25zdCBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zID0ge307XG4gIGNvbnN0IHBhcnNlZEFyZ3MgPSByZXF1aXJlKCdtaW5pbWlzdCcpKGFyZ3MpO1xuICBpZiAocGFyc2VkQXJncy5pMThuRmlsZSkgb3B0aW9ucy5pMThuSW5GaWxlID0gcGFyc2VkQXJncy5pMThuRmlsZTtcbiAgaWYgKHBhcnNlZEFyZ3MuaTE4bkZvcm1hdCkgb3B0aW9ucy5pMThuSW5Gb3JtYXQgPSBwYXJzZWRBcmdzLmkxOG5Gb3JtYXQ7XG4gIGlmIChwYXJzZWRBcmdzLmxvY2FsZSkgb3B0aW9ucy5pMThuSW5Mb2NhbGUgPSBwYXJzZWRBcmdzLmxvY2FsZTtcbiAgY29uc3QgbXQgPSBwYXJzZWRBcmdzLm1pc3NpbmdUcmFuc2xhdGlvbjtcbiAgaWYgKG10ID09PSAnZXJyb3InIHx8IG10ID09PSAnd2FybmluZycgfHwgbXQgPT09ICdpZ25vcmUnKSB7XG4gICAgb3B0aW9ucy5pMThuSW5NaXNzaW5nVHJhbnNsYXRpb25zID0gbXQ7XG4gIH1cbiAgY29uc3QgY29uZmlnID0gcmVhZENvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihcbiAgICAgIGFyZ3MsIG9wdGlvbnMsIFsnaTE4bkZpbGUnLCAnaTE4bkZvcm1hdCcsICdsb2NhbGUnLCAnbWlzc2luZ1RyYW5zbGF0aW9uJywgJ3dhdGNoJ10pO1xuICBjb25zdCB3YXRjaCA9IHBhcnNlZEFyZ3MudyB8fCBwYXJzZWRBcmdzLndhdGNoO1xuICByZXR1cm4gey4uLmNvbmZpZywgd2F0Y2h9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihcbiAgICBhcmdzOiBzdHJpbmdbXSwgZXhpc3RpbmdPcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zID0ge30sXG4gICAgbmdDbWRMaW5lT3B0aW9uczogc3RyaW5nW10gPSBbXSk6IFBhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBsZXQgY21kQ29uZmlnID0gdHMucGFyc2VDb21tYW5kTGluZShhcmdzKTtcbiAgY29uc3QgcHJvamVjdCA9IGNtZENvbmZpZy5vcHRpb25zLnByb2plY3QgfHwgJy4nO1xuICBjb25zdCBjbWRFcnJvcnMgPSBjbWRDb25maWcuZXJyb3JzLmZpbHRlcihlID0+IHtcbiAgICBpZiAodHlwZW9mIGUubWVzc2FnZVRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCBtc2cgPSBlLm1lc3NhZ2VUZXh0O1xuICAgICAgcmV0dXJuICFuZ0NtZExpbmVPcHRpb25zLnNvbWUobyA9PiBtc2cuaW5kZXhPZihvKSA+PSAwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICBpZiAoY21kRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0LFxuICAgICAgcm9vdE5hbWVzOiBbXSxcbiAgICAgIG9wdGlvbnM6IGNtZENvbmZpZy5vcHRpb25zLFxuICAgICAgZXJyb3JzOiBjbWRFcnJvcnMsXG4gICAgICBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3MuRGVmYXVsdFxuICAgIH07XG4gIH1cbiAgY29uc3QgYWxsRGlhZ25vc3RpY3M6IERpYWdub3N0aWNzID0gW107XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRDb25maWd1cmF0aW9uKHByb2plY3QsIGNtZENvbmZpZy5vcHRpb25zKTtcbiAgY29uc3Qgb3B0aW9ucyA9IHsuLi5jb25maWcub3B0aW9ucywgLi4uZXhpc3RpbmdPcHRpb25zfTtcbiAgaWYgKG9wdGlvbnMubG9jYWxlKSB7XG4gICAgb3B0aW9ucy5pMThuSW5Mb2NhbGUgPSBvcHRpb25zLmxvY2FsZTtcbiAgfVxuICByZXR1cm4ge1xuICAgIHByb2plY3QsXG4gICAgcm9vdE5hbWVzOiBjb25maWcucm9vdE5hbWVzLCBvcHRpb25zLFxuICAgIGVycm9yczogY29uZmlnLmVycm9ycyxcbiAgICBlbWl0RmxhZ3M6IGNvbmZpZy5lbWl0RmxhZ3NcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Rm9ybWF0RGlhZ25vc3RpY3NIb3N0KG9wdGlvbnM/OiBhcGkuQ29tcGlsZXJPcHRpb25zKTogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0IHtcbiAgY29uc3QgYmFzZVBhdGggPSBvcHRpb25zID8gb3B0aW9ucy5iYXNlUGF0aCA6IHVuZGVmaW5lZDtcbiAgcmV0dXJuIHtcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiBiYXNlUGF0aCB8fCB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgIC8vIFdlIG5lZWQgdG8gbm9ybWFsaXplIHRoZSBwYXRoIHNlcGFyYXRvcnMgaGVyZSBiZWNhdXNlIGJ5IGRlZmF1bHQsIFR5cGVTY3JpcHRcbiAgICAvLyBjb21waWxlciBob3N0cyB1c2UgcG9zaXggY2Fub25pY2FsIHBhdGhzLiBJbiBvcmRlciB0byBwcmludCBjb25zaXN0ZW50IGRpYWdub3N0aWNzLFxuICAgIC8vIHdlIGFsc28gbm9ybWFsaXplIHRoZSBwYXRocy5cbiAgICBnZXRDYW5vbmljYWxGaWxlTmFtZTogZmlsZU5hbWUgPT4gZmlsZU5hbWUucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIGdldE5ld0xpbmU6ICgpID0+IHtcbiAgICAgIC8vIE1hbnVhbGx5IGRldGVybWluZSB0aGUgcHJvcGVyIG5ldyBsaW5lIHN0cmluZyBiYXNlZCBvbiB0aGUgcGFzc2VkIGNvbXBpbGVyXG4gICAgICAvLyBvcHRpb25zLiBUaGVyZSBpcyBubyBwdWJsaWMgVHlwZVNjcmlwdCBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmdcbiAgICAgIC8vIG5ldyBsaW5lIHN0cmluZy4gc2VlOiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzI5NTgxXG4gICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLm5ld0xpbmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5uZXdMaW5lID09PSB0cy5OZXdMaW5lS2luZC5MaW5lRmVlZCA/ICdcXG4nIDogJ1xcclxcbic7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHMuc3lzLm5ld0xpbmU7XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVwb3J0RXJyb3JzQW5kRXhpdChcbiAgICBhbGxEaWFnbm9zdGljczogRGlhZ25vc3RpY3MsIG9wdGlvbnM/OiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgIGNvbnNvbGVFcnJvcjogKHM6IHN0cmluZykgPT4gdm9pZCA9IGNvbnNvbGUuZXJyb3IpOiBudW1iZXIge1xuICBjb25zdCBlcnJvcnNBbmRXYXJuaW5ncyA9IGZpbHRlckVycm9yc0FuZFdhcm5pbmdzKGFsbERpYWdub3N0aWNzKTtcbiAgaWYgKGVycm9yc0FuZFdhcm5pbmdzLmxlbmd0aCkge1xuICAgIGNvbnN0IGZvcm1hdEhvc3QgPSBnZXRGb3JtYXREaWFnbm9zdGljc0hvc3Qob3B0aW9ucyk7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5lbmFibGVJdnkgPT09IHRydWUpIHtcbiAgICAgIGNvbnN0IG5nRGlhZ25vc3RpY3MgPSBlcnJvcnNBbmRXYXJuaW5ncy5maWx0ZXIoYXBpLmlzTmdEaWFnbm9zdGljKTtcbiAgICAgIGNvbnN0IHRzRGlhZ25vc3RpY3MgPSBlcnJvcnNBbmRXYXJuaW5ncy5maWx0ZXIoYXBpLmlzVHNEaWFnbm9zdGljKTtcbiAgICAgIGNvbnNvbGVFcnJvcihyZXBsYWNlVHNXaXRoTmdJbkVycm9ycyhcbiAgICAgICAgICB0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQodHNEaWFnbm9zdGljcywgZm9ybWF0SG9zdCkpKTtcbiAgICAgIGNvbnNvbGVFcnJvcihmb3JtYXREaWFnbm9zdGljcyhuZ0RpYWdub3N0aWNzLCBmb3JtYXRIb3N0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGVFcnJvcihmb3JtYXREaWFnbm9zdGljcyhlcnJvcnNBbmRXYXJuaW5ncywgZm9ybWF0SG9zdCkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZXhpdENvZGVGcm9tUmVzdWx0KGFsbERpYWdub3N0aWNzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoTW9kZShcbiAgICBwcm9qZWN0OiBzdHJpbmcsIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMsIGNvbnNvbGVFcnJvcjogKHM6IHN0cmluZykgPT4gdm9pZCkge1xuICByZXR1cm4gcGVyZm9ybVdhdGNoQ29tcGlsYXRpb24oY3JlYXRlUGVyZm9ybVdhdGNoSG9zdChwcm9qZWN0LCBkaWFnbm9zdGljcyA9PiB7XG4gICAgY29uc29sZUVycm9yKGZvcm1hdERpYWdub3N0aWNzKGRpYWdub3N0aWNzLCBnZXRGb3JtYXREaWFnbm9zdGljc0hvc3Qob3B0aW9ucykpKTtcbiAgfSwgb3B0aW9ucywgb3B0aW9ucyA9PiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucykpKTtcbn1cblxuLy8gQ0xJIGVudHJ5IHBvaW50XG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgY29uc3QgYXJncyA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgcHJvY2Vzcy5leGl0Q29kZSA9IG1haW4oYXJncyk7XG59XG4iXX0=