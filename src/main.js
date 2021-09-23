#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/main", ["require", "exports", "tslib", "reflect-metadata", "typescript", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/util", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/src/perform_watch", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.watchMode = exports.readCommandLineAndConfiguration = exports.readNgcCommandLineAndConfiguration = exports.mainDiagnosticsForTest = exports.main = void 0;
    var tslib_1 = require("tslib");
    // Must be imported first, because Angular decorators throw on load.
    require("reflect-metadata");
    var ts = require("typescript");
    var api = require("@angular/compiler-cli/src/transformers/api");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    var perform_compile_1 = require("@angular/compiler-cli/src/perform_compile");
    var perform_watch_1 = require("@angular/compiler-cli/src/perform_watch");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
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
        var _b = (0, perform_compile_1.performCompilation)({
            rootNames: rootNames,
            options: options,
            emitFlags: emitFlags,
            oldProgram: oldProgram,
            emitCallback: createEmitCallback(options),
            customTransformers: customTransformers,
            modifiedResourceFiles: modifiedResourceFiles
        }), compileDiags = _b.diagnostics, program = _b.program;
        if (programReuse !== undefined) {
            programReuse.program = program;
        }
        return reportErrorsAndExit(compileDiags, options, consoleError);
    }
    exports.main = main;
    function mainDiagnosticsForTest(args, config, programReuse, modifiedResourceFiles) {
        var _a = config || readNgcCommandLineAndConfiguration(args), project = _a.project, rootNames = _a.rootNames, options = _a.options, configErrors = _a.errors, watch = _a.watch, emitFlags = _a.emitFlags;
        if (configErrors.length) {
            return configErrors;
        }
        var oldProgram;
        if (programReuse !== undefined) {
            oldProgram = programReuse.program;
        }
        var _b = (0, perform_compile_1.performCompilation)({
            rootNames: rootNames,
            options: options,
            emitFlags: emitFlags,
            oldProgram: oldProgram,
            modifiedResourceFiles: modifiedResourceFiles,
            emitCallback: createEmitCallback(options),
        }), compileDiags = _b.diagnostics, program = _b.program;
        if (programReuse !== undefined) {
            programReuse.program = program;
        }
        return compileDiags;
    }
    exports.mainDiagnosticsForTest = mainDiagnosticsForTest;
    function createEmitCallback(options) {
        if (!options.annotateForClosureCompiler) {
            return undefined;
        }
        var tsickleHost = {
            shouldSkipTsickleProcessing: function (fileName) { return /\.d\.ts$/.test(fileName) ||
                // View Engine's generated files were never intended to be processed with tsickle.
                (!options.enableIvy && util_1.GENERATED_FILES.test(fileName)); },
            pathToModuleName: function (context, importPath) { return ''; },
            shouldIgnoreWarningsForPath: function (filePath) { return false; },
            fileNameToModuleId: function (fileName) { return fileName; },
            googmodule: false,
            untyped: true,
            convertIndexImportShorthand: false,
            // Decorators are transformed as part of the Angular compiler programs. To avoid
            // conflicts, we disable decorator transformations for tsickle.
            transformDecorators: false,
            transformTypesToClosure: true,
        };
        return function (_a) {
            var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, _b = _a.customTransformers, customTransformers = _b === void 0 ? {} : _b, host = _a.host, options = _a.options;
            // tslint:disable-next-line:no-require-imports only depend on tsickle if requested
            return require('tsickle').emitWithTsickle(program, (0, tslib_1.__assign)((0, tslib_1.__assign)({}, tsickleHost), { options: options, host: host, moduleResolutionHost: host }), host, options, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, {
                beforeTs: customTransformers.before,
                afterTs: customTransformers.after,
            });
        };
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
        return (0, tslib_1.__assign)((0, tslib_1.__assign)({}, config), { watch: watch });
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
        var config = (0, perform_compile_1.readConfiguration)(project, cmdConfig.options);
        var options = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, config.options), existingOptions);
        if (options.locale) {
            options.i18nInLocale = options.locale;
        }
        return {
            project: project,
            rootNames: config.rootNames,
            options: options,
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
        var errorsAndWarnings = (0, perform_compile_1.filterErrorsAndWarnings)(allDiagnostics);
        printDiagnostics(errorsAndWarnings, options, consoleError);
        return (0, perform_compile_1.exitCodeFromResult)(allDiagnostics);
    }
    function watchMode(project, options, consoleError) {
        return (0, perform_watch_1.performWatchCompilation)((0, perform_watch_1.createPerformWatchHost)(project, function (diagnostics) {
            printDiagnostics(diagnostics, options, consoleError);
        }, options, function (options) { return createEmitCallback(options); }));
    }
    exports.watchMode = watchMode;
    function printDiagnostics(diagnostics, options, consoleError) {
        if (diagnostics.length === 0) {
            return;
        }
        var formatHost = getFormatDiagnosticsHost(options);
        consoleError((0, perform_compile_1.formatDiagnostics)(diagnostics, formatHost));
    }
    // CLI entry point
    if (require.main === module) {
        process.title = 'Angular Compiler (ngc)';
        var args = process.argv.slice(2);
        // We are running the real compiler so run against the real file-system
        (0, file_system_1.setFileSystem)(new file_system_1.NodeJSFileSystem());
        process.exitCode = main(args);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILG9FQUFvRTtJQUNwRSw0QkFBMEI7SUFFMUIsK0JBQWlDO0lBSWpDLGdFQUEwQztJQUMxQyxvRUFBb0Q7SUFFcEQsNkVBQTBLO0lBQzFLLHlFQUFnRjtJQUNoRiwyRUFBb0U7SUFFcEUsU0FBZ0IsSUFBSSxDQUNoQixJQUFjLEVBQUUsWUFBaUQsRUFDakUsTUFBK0IsRUFBRSxrQkFBMkMsRUFBRSxZQUU3RSxFQUNELHFCQUF3QztRQUp4Qiw2QkFBQSxFQUFBLGVBQW9DLE9BQU8sQ0FBQyxLQUFLO1FBSy9ELElBQUEsS0FDQSxNQUFNLElBQUksa0NBQWtDLENBQUMsSUFBSSxDQUFDLEVBRGpELE9BQU8sYUFBQSxFQUFFLFNBQVMsZUFBQSxFQUFFLE9BQU8sYUFBQSxFQUFVLFlBQVksWUFBQSxFQUFFLEtBQUssV0FBQSxFQUFFLFNBQVMsZUFDbEIsQ0FBQztRQUN2RCxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUU7WUFDdkIsT0FBTyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztTQUMvRTtRQUNELElBQUksS0FBSyxFQUFFO1lBQ1QsSUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDekQsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQzlFO1FBRUQsSUFBSSxVQUFpQyxDQUFDO1FBQ3RDLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtZQUM5QixVQUFVLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztTQUNuQztRQUVL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M0IsT0FBTyxDQUFDLEtBQUssR0FBRyx3QkFBd0IsQ0FBQztRQUN6QyxJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyx1RUFBdUU7UUFDdkUsSUFBQSwyQkFBYSxFQUFDLElBQUksOEJBQWdCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQy9CIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIE11c3QgYmUgaW1wb3J0ZWQgZmlyc3QsIGJlY2F1c2UgQW5ndWxhciBkZWNvcmF0b3JzIHRocm93IG9uIGxvYWQuXG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIHRzaWNrbGUgZnJvbSAndHNpY2tsZSc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4vbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge0dFTkVSQVRFRF9GSUxFU30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmltcG9ydCB7ZXhpdENvZGVGcm9tUmVzdWx0LCBwZXJmb3JtQ29tcGlsYXRpb24sIHJlYWRDb25maWd1cmF0aW9uLCBmb3JtYXREaWFnbm9zdGljcywgRGlhZ25vc3RpY3MsIFBhcnNlZENvbmZpZ3VyYXRpb24sIGZpbHRlckVycm9yc0FuZFdhcm5pbmdzfSBmcm9tICcuL3BlcmZvcm1fY29tcGlsZSc7XG5pbXBvcnQge3BlcmZvcm1XYXRjaENvbXBpbGF0aW9uLMKgY3JlYXRlUGVyZm9ybVdhdGNoSG9zdH0gZnJvbSAnLi9wZXJmb3JtX3dhdGNoJztcbmltcG9ydCB7Tm9kZUpTRmlsZVN5c3RlbSwgc2V0RmlsZVN5c3RlbX0gZnJvbSAnLi9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluKFxuICAgIGFyZ3M6IHN0cmluZ1tdLCBjb25zb2xlRXJyb3I6IChzOiBzdHJpbmcpID0+IHZvaWQgPSBjb25zb2xlLmVycm9yLFxuICAgIGNvbmZpZz86IE5nY1BhcnNlZENvbmZpZ3VyYXRpb24sIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMsIHByb2dyYW1SZXVzZT86IHtcbiAgICAgIHByb2dyYW06IGFwaS5Qcm9ncmFtfHVuZGVmaW5lZCxcbiAgICB9LFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcz86IFNldDxzdHJpbmc+fG51bGwpOiBudW1iZXIge1xuICBsZXQge3Byb2plY3QsIHJvb3ROYW1lcywgb3B0aW9ucywgZXJyb3JzOiBjb25maWdFcnJvcnMsIHdhdGNoLCBlbWl0RmxhZ3N9ID1cbiAgICAgIGNvbmZpZyB8fCByZWFkTmdjQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKGFyZ3MpO1xuICBpZiAoY29uZmlnRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiByZXBvcnRFcnJvcnNBbmRFeGl0KGNvbmZpZ0Vycm9ycywgLypvcHRpb25zKi8gdW5kZWZpbmVkLCBjb25zb2xlRXJyb3IpO1xuICB9XG4gIGlmICh3YXRjaCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHdhdGNoTW9kZShwcm9qZWN0LCBvcHRpb25zLCBjb25zb2xlRXJyb3IpO1xuICAgIHJldHVybiByZXBvcnRFcnJvcnNBbmRFeGl0KHJlc3VsdC5maXJzdENvbXBpbGVSZXN1bHQsIG9wdGlvbnMsIGNvbnNvbGVFcnJvcik7XG4gIH1cblxuICBsZXQgb2xkUHJvZ3JhbTogYXBpLlByb2dyYW18dW5kZWZpbmVkO1xuICBpZiAocHJvZ3JhbVJldXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBvbGRQcm9ncmFtID0gcHJvZ3JhbVJldXNlLnByb2dyYW07XG4gIH1cblxuICBjb25zdCB7ZGlhZ25vc3RpY3M6IGNvbXBpbGVEaWFncywgcHJvZ3JhbX0gPSBwZXJmb3JtQ29tcGlsYXRpb24oe1xuICAgIHJvb3ROYW1lcyxcbiAgICBvcHRpb25zLFxuICAgIGVtaXRGbGFncyxcbiAgICBvbGRQcm9ncmFtLFxuICAgIGVtaXRDYWxsYmFjazogY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnMpLFxuICAgIGN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICBtb2RpZmllZFJlc291cmNlRmlsZXNcbiAgfSk7XG4gIGlmIChwcm9ncmFtUmV1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgIHByb2dyYW1SZXVzZS5wcm9ncmFtID0gcHJvZ3JhbTtcbiAgfVxuICByZXR1cm4gcmVwb3J0RXJyb3JzQW5kRXhpdChjb21waWxlRGlhZ3MsIG9wdGlvbnMsIGNvbnNvbGVFcnJvcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluRGlhZ25vc3RpY3NGb3JUZXN0KFxuICAgIGFyZ3M6IHN0cmluZ1tdLCBjb25maWc/OiBOZ2NQYXJzZWRDb25maWd1cmF0aW9uLFxuICAgIHByb2dyYW1SZXVzZT86IHtwcm9ncmFtOiBhcGkuUHJvZ3JhbXx1bmRlZmluZWR9LFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcz86IFNldDxzdHJpbmc+fG51bGwpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+IHtcbiAgbGV0IHtwcm9qZWN0LCByb290TmFtZXMsIG9wdGlvbnMsIGVycm9yczogY29uZmlnRXJyb3JzLCB3YXRjaCwgZW1pdEZsYWdzfSA9XG4gICAgICBjb25maWcgfHwgcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzKTtcbiAgaWYgKGNvbmZpZ0Vycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gY29uZmlnRXJyb3JzO1xuICB9XG5cbiAgbGV0IG9sZFByb2dyYW06IGFwaS5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgaWYgKHByb2dyYW1SZXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgb2xkUHJvZ3JhbSA9IHByb2dyYW1SZXVzZS5wcm9ncmFtO1xuICB9XG5cbiAgY29uc3Qge2RpYWdub3N0aWNzOiBjb21waWxlRGlhZ3MsIHByb2dyYW19ID0gcGVyZm9ybUNvbXBpbGF0aW9uKHtcbiAgICByb290TmFtZXMsXG4gICAgb3B0aW9ucyxcbiAgICBlbWl0RmxhZ3MsXG4gICAgb2xkUHJvZ3JhbSxcbiAgICBtb2RpZmllZFJlc291cmNlRmlsZXMsXG4gICAgZW1pdENhbGxiYWNrOiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucyksXG4gIH0pO1xuXG4gIGlmIChwcm9ncmFtUmV1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgIHByb2dyYW1SZXVzZS5wcm9ncmFtID0gcHJvZ3JhbTtcbiAgfVxuXG4gIHJldHVybiBjb21waWxlRGlhZ3M7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKTogYXBpLlRzRW1pdENhbGxiYWNrfHVuZGVmaW5lZCB7XG4gIGlmICghb3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgdHNpY2tsZUhvc3Q6IFBpY2s8XG4gICAgICB0c2lja2xlLlRzaWNrbGVIb3N0LFxuICAgICAgJ3Nob3VsZFNraXBUc2lja2xlUHJvY2Vzc2luZyd8J3BhdGhUb01vZHVsZU5hbWUnfCdzaG91bGRJZ25vcmVXYXJuaW5nc0ZvclBhdGgnfFxuICAgICAgJ2ZpbGVOYW1lVG9Nb2R1bGVJZCd8J2dvb2dtb2R1bGUnfCd1bnR5cGVkJ3wnY29udmVydEluZGV4SW1wb3J0U2hvcnRoYW5kJ3xcbiAgICAgICd0cmFuc2Zvcm1EZWNvcmF0b3JzJ3wndHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUnPiA9IHtcbiAgICBzaG91bGRTa2lwVHNpY2tsZVByb2Nlc3Npbmc6IChmaWxlTmFtZSkgPT4gL1xcLmRcXC50cyQvLnRlc3QoZmlsZU5hbWUpIHx8XG4gICAgICAgIC8vIFZpZXcgRW5naW5lJ3MgZ2VuZXJhdGVkIGZpbGVzIHdlcmUgbmV2ZXIgaW50ZW5kZWQgdG8gYmUgcHJvY2Vzc2VkIHdpdGggdHNpY2tsZS5cbiAgICAgICAgKCFvcHRpb25zLmVuYWJsZUl2eSAmJiBHRU5FUkFURURfRklMRVMudGVzdChmaWxlTmFtZSkpLFxuICAgIHBhdGhUb01vZHVsZU5hbWU6IChjb250ZXh0LCBpbXBvcnRQYXRoKSA9PiAnJyxcbiAgICBzaG91bGRJZ25vcmVXYXJuaW5nc0ZvclBhdGg6IChmaWxlUGF0aCkgPT4gZmFsc2UsXG4gICAgZmlsZU5hbWVUb01vZHVsZUlkOiAoZmlsZU5hbWUpID0+IGZpbGVOYW1lLFxuICAgIGdvb2dtb2R1bGU6IGZhbHNlLFxuICAgIHVudHlwZWQ6IHRydWUsXG4gICAgY29udmVydEluZGV4SW1wb3J0U2hvcnRoYW5kOiBmYWxzZSxcbiAgICAvLyBEZWNvcmF0b3JzIGFyZSB0cmFuc2Zvcm1lZCBhcyBwYXJ0IG9mIHRoZSBBbmd1bGFyIGNvbXBpbGVyIHByb2dyYW1zLiBUbyBhdm9pZFxuICAgIC8vIGNvbmZsaWN0cywgd2UgZGlzYWJsZSBkZWNvcmF0b3IgdHJhbnNmb3JtYXRpb25zIGZvciB0c2lja2xlLlxuICAgIHRyYW5zZm9ybURlY29yYXRvcnM6IGZhbHNlLFxuICAgIHRyYW5zZm9ybVR5cGVzVG9DbG9zdXJlOiB0cnVlLFxuICB9O1xuXG4gIHJldHVybiAoe1xuICAgICAgICAgICBwcm9ncmFtLFxuICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLFxuICAgICAgICAgICB3cml0ZUZpbGUsXG4gICAgICAgICAgIGNhbmNlbGxhdGlvblRva2VuLFxuICAgICAgICAgICBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnMgPSB7fSxcbiAgICAgICAgICAgaG9zdCxcbiAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgfSkgPT5cbiAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tcmVxdWlyZS1pbXBvcnRzIG9ubHkgZGVwZW5kIG9uIHRzaWNrbGUgaWYgcmVxdWVzdGVkXG4gICAgICByZXF1aXJlKCd0c2lja2xlJykuZW1pdFdpdGhUc2lja2xlKFxuICAgICAgICAgIHByb2dyYW0sIHsuLi50c2lja2xlSG9zdCwgb3B0aW9ucywgaG9zdCwgbW9kdWxlUmVzb2x1dGlvbkhvc3Q6IGhvc3R9LCBob3N0LCBvcHRpb25zLFxuICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIHtcbiAgICAgICAgICAgIGJlZm9yZVRzOiBjdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlLFxuICAgICAgICAgICAgYWZ0ZXJUczogY3VzdG9tVHJhbnNmb3JtZXJzLmFmdGVyLFxuICAgICAgICAgIH0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nY1BhcnNlZENvbmZpZ3VyYXRpb24gZXh0ZW5kcyBQYXJzZWRDb25maWd1cmF0aW9uIHtcbiAgd2F0Y2g/OiBib29sZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzOiBzdHJpbmdbXSk6IE5nY1BhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBjb25zdCBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zID0ge307XG4gIGNvbnN0IHBhcnNlZEFyZ3MgPSByZXF1aXJlKCdtaW5pbWlzdCcpKGFyZ3MpO1xuICBpZiAocGFyc2VkQXJncy5pMThuRmlsZSkgb3B0aW9ucy5pMThuSW5GaWxlID0gcGFyc2VkQXJncy5pMThuRmlsZTtcbiAgaWYgKHBhcnNlZEFyZ3MuaTE4bkZvcm1hdCkgb3B0aW9ucy5pMThuSW5Gb3JtYXQgPSBwYXJzZWRBcmdzLmkxOG5Gb3JtYXQ7XG4gIGlmIChwYXJzZWRBcmdzLmxvY2FsZSkgb3B0aW9ucy5pMThuSW5Mb2NhbGUgPSBwYXJzZWRBcmdzLmxvY2FsZTtcbiAgY29uc3QgbXQgPSBwYXJzZWRBcmdzLm1pc3NpbmdUcmFuc2xhdGlvbjtcbiAgaWYgKG10ID09PSAnZXJyb3InIHx8IG10ID09PSAnd2FybmluZycgfHwgbXQgPT09ICdpZ25vcmUnKSB7XG4gICAgb3B0aW9ucy5pMThuSW5NaXNzaW5nVHJhbnNsYXRpb25zID0gbXQ7XG4gIH1cbiAgY29uc3QgY29uZmlnID0gcmVhZENvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihcbiAgICAgIGFyZ3MsIG9wdGlvbnMsIFsnaTE4bkZpbGUnLCAnaTE4bkZvcm1hdCcsICdsb2NhbGUnLCAnbWlzc2luZ1RyYW5zbGF0aW9uJywgJ3dhdGNoJ10pO1xuICBjb25zdCB3YXRjaCA9IHBhcnNlZEFyZ3MudyB8fCBwYXJzZWRBcmdzLndhdGNoO1xuICByZXR1cm4gey4uLmNvbmZpZywgd2F0Y2h9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihcbiAgICBhcmdzOiBzdHJpbmdbXSwgZXhpc3RpbmdPcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zID0ge30sXG4gICAgbmdDbWRMaW5lT3B0aW9uczogc3RyaW5nW10gPSBbXSk6IFBhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBsZXQgY21kQ29uZmlnID0gdHMucGFyc2VDb21tYW5kTGluZShhcmdzKTtcbiAgY29uc3QgcHJvamVjdCA9IGNtZENvbmZpZy5vcHRpb25zLnByb2plY3QgfHwgJy4nO1xuICBjb25zdCBjbWRFcnJvcnMgPSBjbWRDb25maWcuZXJyb3JzLmZpbHRlcihlID0+IHtcbiAgICBpZiAodHlwZW9mIGUubWVzc2FnZVRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCBtc2cgPSBlLm1lc3NhZ2VUZXh0O1xuICAgICAgcmV0dXJuICFuZ0NtZExpbmVPcHRpb25zLnNvbWUobyA9PiBtc2cuaW5kZXhPZihvKSA+PSAwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICBpZiAoY21kRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0LFxuICAgICAgcm9vdE5hbWVzOiBbXSxcbiAgICAgIG9wdGlvbnM6IGNtZENvbmZpZy5vcHRpb25zLFxuICAgICAgZXJyb3JzOiBjbWRFcnJvcnMsXG4gICAgICBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3MuRGVmYXVsdFxuICAgIH07XG4gIH1cbiAgY29uc3QgY29uZmlnID0gcmVhZENvbmZpZ3VyYXRpb24ocHJvamVjdCwgY21kQ29uZmlnLm9wdGlvbnMpO1xuICBjb25zdCBvcHRpb25zID0gey4uLmNvbmZpZy5vcHRpb25zLCAuLi5leGlzdGluZ09wdGlvbnN9O1xuICBpZiAob3B0aW9ucy5sb2NhbGUpIHtcbiAgICBvcHRpb25zLmkxOG5JbkxvY2FsZSA9IG9wdGlvbnMubG9jYWxlO1xuICB9XG4gIHJldHVybiB7XG4gICAgcHJvamVjdCxcbiAgICByb290TmFtZXM6IGNvbmZpZy5yb290TmFtZXMsXG4gICAgb3B0aW9ucyxcbiAgICBlcnJvcnM6IGNvbmZpZy5lcnJvcnMsXG4gICAgZW1pdEZsYWdzOiBjb25maWcuZW1pdEZsYWdzXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldEZvcm1hdERpYWdub3N0aWNzSG9zdChvcHRpb25zPzogYXBpLkNvbXBpbGVyT3B0aW9ucyk6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCB7XG4gIGNvbnN0IGJhc2VQYXRoID0gb3B0aW9ucyA/IG9wdGlvbnMuYmFzZVBhdGggOiB1bmRlZmluZWQ7XG4gIHJldHVybiB7XG4gICAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gYmFzZVBhdGggfHwgdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgICAvLyBXZSBuZWVkIHRvIG5vcm1hbGl6ZSB0aGUgcGF0aCBzZXBhcmF0b3JzIGhlcmUgYmVjYXVzZSBieSBkZWZhdWx0LCBUeXBlU2NyaXB0XG4gICAgLy8gY29tcGlsZXIgaG9zdHMgdXNlIHBvc2l4IGNhbm9uaWNhbCBwYXRocy4gSW4gb3JkZXIgdG8gcHJpbnQgY29uc2lzdGVudCBkaWFnbm9zdGljcyxcbiAgICAvLyB3ZSBhbHNvIG5vcm1hbGl6ZSB0aGUgcGF0aHMuXG4gICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IGZpbGVOYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICBnZXROZXdMaW5lOiAoKSA9PiB7XG4gICAgICAvLyBNYW51YWxseSBkZXRlcm1pbmUgdGhlIHByb3BlciBuZXcgbGluZSBzdHJpbmcgYmFzZWQgb24gdGhlIHBhc3NlZCBjb21waWxlclxuICAgICAgLy8gb3B0aW9ucy4gVGhlcmUgaXMgbm8gcHVibGljIFR5cGVTY3JpcHQgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nXG4gICAgICAvLyBuZXcgbGluZSBzdHJpbmcuIHNlZTogaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8yOTU4MVxuICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5uZXdMaW5lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMubmV3TGluZSA9PT0gdHMuTmV3TGluZUtpbmQuTGluZUZlZWQgPyAnXFxuJyA6ICdcXHJcXG4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRzLnN5cy5uZXdMaW5lO1xuICAgIH0sXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlcG9ydEVycm9yc0FuZEV4aXQoXG4gICAgYWxsRGlhZ25vc3RpY3M6IERpYWdub3N0aWNzLCBvcHRpb25zPzogYXBpLkNvbXBpbGVyT3B0aW9ucyxcbiAgICBjb25zb2xlRXJyb3I6IChzOiBzdHJpbmcpID0+IHZvaWQgPSBjb25zb2xlLmVycm9yKTogbnVtYmVyIHtcbiAgY29uc3QgZXJyb3JzQW5kV2FybmluZ3MgPSBmaWx0ZXJFcnJvcnNBbmRXYXJuaW5ncyhhbGxEaWFnbm9zdGljcyk7XG4gIHByaW50RGlhZ25vc3RpY3MoZXJyb3JzQW5kV2FybmluZ3MsIG9wdGlvbnMsIGNvbnNvbGVFcnJvcik7XG4gIHJldHVybiBleGl0Q29kZUZyb21SZXN1bHQoYWxsRGlhZ25vc3RpY3MpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hNb2RlKFxuICAgIHByb2plY3Q6IHN0cmluZywgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucywgY29uc29sZUVycm9yOiAoczogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIHJldHVybiBwZXJmb3JtV2F0Y2hDb21waWxhdGlvbihjcmVhdGVQZXJmb3JtV2F0Y2hIb3N0KHByb2plY3QsIGRpYWdub3N0aWNzID0+IHtcbiAgICBwcmludERpYWdub3N0aWNzKGRpYWdub3N0aWNzLCBvcHRpb25zLCBjb25zb2xlRXJyb3IpO1xuICB9LCBvcHRpb25zLCBvcHRpb25zID0+IGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zKSkpO1xufVxuXG5mdW5jdGlvbiBwcmludERpYWdub3N0aWNzKFxuICAgIGRpYWdub3N0aWNzOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+LFxuICAgIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnN8dW5kZWZpbmVkLCBjb25zb2xlRXJyb3I6IChzOiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkIHtcbiAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBmb3JtYXRIb3N0ID0gZ2V0Rm9ybWF0RGlhZ25vc3RpY3NIb3N0KG9wdGlvbnMpO1xuICBjb25zb2xlRXJyb3IoZm9ybWF0RGlhZ25vc3RpY3MoZGlhZ25vc3RpY3MsIGZvcm1hdEhvc3QpKTtcbn1cblxuLy8gQ0xJIGVudHJ5IHBvaW50XG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgcHJvY2Vzcy50aXRsZSA9ICdBbmd1bGFyIENvbXBpbGVyIChuZ2MpJztcbiAgY29uc3QgYXJncyA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgLy8gV2UgYXJlIHJ1bm5pbmcgdGhlIHJlYWwgY29tcGlsZXIgc28gcnVuIGFnYWluc3QgdGhlIHJlYWwgZmlsZS1zeXN0ZW1cbiAgc2V0RmlsZVN5c3RlbShuZXcgTm9kZUpTRmlsZVN5c3RlbSgpKTtcbiAgcHJvY2Vzcy5leGl0Q29kZSA9IG1haW4oYXJncyk7XG59XG4iXX0=