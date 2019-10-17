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
        define("@angular/compiler-cli/src/main", ["require", "exports", "tslib", "reflect-metadata", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/util", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/src/perform_watch", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
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
        var transformDecorators = (options.enableIvy === false && options.annotationsAs !== 'decorators');
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
                return require('tsickle').emitWithTsickle(program, tslib_1.__assign({}, tsickleHost, { options: options, host: host, moduleResolutionHost: host }), host, options, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, {
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
            if (options && options.enableIvy !== false) {
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
        // We are running the real compiler so run against the real file-system
        file_system_1.setFileSystem(new file_system_1.NodeJSFileSystem());
        process.exitCode = main(args);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsb0VBQW9FO0lBQ3BFLDRCQUEwQjtJQUUxQiwrQkFBaUM7SUFHakMsMkVBQTREO0lBQzVELGdFQUEwQztJQUMxQyxvRUFBb0Q7SUFFcEQsNkVBQTBLO0lBQzFLLHlFQUFnRjtJQUNoRiwyRUFBb0U7SUFFcEUsU0FBZ0IsSUFBSSxDQUNoQixJQUFjLEVBQUUsWUFBaUQsRUFDakUsTUFBK0IsRUFBRSxrQkFBMkMsRUFBRSxZQUU3RSxFQUNELHFCQUF5QztRQUp6Qiw2QkFBQSxFQUFBLGVBQW9DLE9BQU8sQ0FBQyxLQUFLO1FBSy9ELElBQUEsdURBQ2tELEVBRGpELG9CQUFPLEVBQUUsd0JBQVMsRUFBRSxvQkFBTyxFQUFFLHdCQUFvQixFQUFFLGdCQUFLLEVBQUUsd0JBQ1QsQ0FBQztRQUN2RCxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUU7WUFDdkIsT0FBTyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztTQUMvRTtRQUNELElBQUksS0FBSyxFQUFFO1lBQ1QsSUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDekQsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQzlFO1FBRUQsSUFBSSxVQUFpQyxDQUFDO1FBQ3RDLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtZQUM5QixVQUFVLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztTQUNuQztRQUVLLElBQUE7Ozs7OztVQU1KLEVBTkssNkJBQXlCLEVBQUUsb0JBTWhDLENB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LENBQUM7SUFDdkQsQ0FBQztJQUxELDhCQUtDO0lBRUQsa0JBQWtCO0lBQ2xCLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7UUFDM0IsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsdUVBQXVFO1FBQ3ZFLDJCQUFhLENBQUMsSUFBSSw4QkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDdEMsT0FBTyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDL0IiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIE11c3QgYmUgaW1wb3J0ZWQgZmlyc3QsIGJlY2F1c2UgQW5ndWxhciBkZWNvcmF0b3JzIHRocm93IG9uIGxvYWQuXG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIHRzaWNrbGUgZnJvbSAndHNpY2tsZSc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4vbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge0dFTkVSQVRFRF9GSUxFU30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmltcG9ydCB7ZXhpdENvZGVGcm9tUmVzdWx0LCBwZXJmb3JtQ29tcGlsYXRpb24sIHJlYWRDb25maWd1cmF0aW9uLCBmb3JtYXREaWFnbm9zdGljcywgRGlhZ25vc3RpY3MsIFBhcnNlZENvbmZpZ3VyYXRpb24sIGZpbHRlckVycm9yc0FuZFdhcm5pbmdzfSBmcm9tICcuL3BlcmZvcm1fY29tcGlsZSc7XG5pbXBvcnQge3BlcmZvcm1XYXRjaENvbXBpbGF0aW9uLMKgY3JlYXRlUGVyZm9ybVdhdGNoSG9zdH0gZnJvbSAnLi9wZXJmb3JtX3dhdGNoJztcbmltcG9ydCB7Tm9kZUpTRmlsZVN5c3RlbSwgc2V0RmlsZVN5c3RlbX0gZnJvbSAnLi9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluKFxuICAgIGFyZ3M6IHN0cmluZ1tdLCBjb25zb2xlRXJyb3I6IChzOiBzdHJpbmcpID0+IHZvaWQgPSBjb25zb2xlLmVycm9yLFxuICAgIGNvbmZpZz86IE5nY1BhcnNlZENvbmZpZ3VyYXRpb24sIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMsIHByb2dyYW1SZXVzZT86IHtcbiAgICAgIHByb2dyYW06IGFwaS5Qcm9ncmFtIHwgdW5kZWZpbmVkLFxuICAgIH0sXG4gICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzPzogU2V0PHN0cmluZz58IG51bGwpOiBudW1iZXIge1xuICBsZXQge3Byb2plY3QsIHJvb3ROYW1lcywgb3B0aW9ucywgZXJyb3JzOiBjb25maWdFcnJvcnMsIHdhdGNoLCBlbWl0RmxhZ3N9ID1cbiAgICAgIGNvbmZpZyB8fCByZWFkTmdjQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKGFyZ3MpO1xuICBpZiAoY29uZmlnRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiByZXBvcnRFcnJvcnNBbmRFeGl0KGNvbmZpZ0Vycm9ycywgLypvcHRpb25zKi8gdW5kZWZpbmVkLCBjb25zb2xlRXJyb3IpO1xuICB9XG4gIGlmICh3YXRjaCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHdhdGNoTW9kZShwcm9qZWN0LCBvcHRpb25zLCBjb25zb2xlRXJyb3IpO1xuICAgIHJldHVybiByZXBvcnRFcnJvcnNBbmRFeGl0KHJlc3VsdC5maXJzdENvbXBpbGVSZXN1bHQsIG9wdGlvbnMsIGNvbnNvbGVFcnJvcik7XG4gIH1cblxuICBsZXQgb2xkUHJvZ3JhbTogYXBpLlByb2dyYW18dW5kZWZpbmVkO1xuICBpZiAocHJvZ3JhbVJldXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBvbGRQcm9ncmFtID0gcHJvZ3JhbVJldXNlLnByb2dyYW07XG4gIH1cblxuICBjb25zdCB7ZGlhZ25vc3RpY3M6IGNvbXBpbGVEaWFncywgcHJvZ3JhbX0gPSBwZXJmb3JtQ29tcGlsYXRpb24oe1xuICAgIHJvb3ROYW1lcyxcbiAgICBvcHRpb25zLFxuICAgIGVtaXRGbGFncyxcbiAgICBvbGRQcm9ncmFtLFxuICAgIGVtaXRDYWxsYmFjazogY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnMpLCBjdXN0b21UcmFuc2Zvcm1lcnMsIG1vZGlmaWVkUmVzb3VyY2VGaWxlc1xuICB9KTtcbiAgaWYgKHByb2dyYW1SZXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcHJvZ3JhbVJldXNlLnByb2dyYW0gPSBwcm9ncmFtO1xuICB9XG4gIHJldHVybiByZXBvcnRFcnJvcnNBbmRFeGl0KGNvbXBpbGVEaWFncywgb3B0aW9ucywgY29uc29sZUVycm9yKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1haW5EaWFnbm9zdGljc0ZvclRlc3QoXG4gICAgYXJnczogc3RyaW5nW10sIGNvbmZpZz86IE5nY1BhcnNlZENvbmZpZ3VyYXRpb24pOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+IHtcbiAgbGV0IHtwcm9qZWN0LCByb290TmFtZXMsIG9wdGlvbnMsIGVycm9yczogY29uZmlnRXJyb3JzLCB3YXRjaCwgZW1pdEZsYWdzfSA9XG4gICAgICBjb25maWcgfHwgcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzKTtcbiAgaWYgKGNvbmZpZ0Vycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gY29uZmlnRXJyb3JzO1xuICB9XG4gIGNvbnN0IHtkaWFnbm9zdGljczogY29tcGlsZURpYWdzfSA9IHBlcmZvcm1Db21waWxhdGlvbihcbiAgICAgIHtyb290TmFtZXMsIG9wdGlvbnMsIGVtaXRGbGFncywgZW1pdENhbGxiYWNrOiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucyl9KTtcbiAgcmV0dXJuIGNvbXBpbGVEaWFncztcbn1cblxuZnVuY3Rpb24gY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMpOiBhcGkuVHNFbWl0Q2FsbGJhY2t8dW5kZWZpbmVkIHtcbiAgY29uc3QgdHJhbnNmb3JtRGVjb3JhdG9ycyA9XG4gICAgICAob3B0aW9ucy5lbmFibGVJdnkgPT09IGZhbHNlICYmIG9wdGlvbnMuYW5ub3RhdGlvbnNBcyAhPT0gJ2RlY29yYXRvcnMnKTtcbiAgY29uc3QgdHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUgPSBvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuICBpZiAoIXRyYW5zZm9ybURlY29yYXRvcnMgJiYgIXRyYW5zZm9ybVR5cGVzVG9DbG9zdXJlKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBpZiAodHJhbnNmb3JtRGVjb3JhdG9ycykge1xuICAgIC8vIFRoaXMgaXMgbmVlZGVkIGFzIGEgd29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvdHNpY2tsZS9pc3N1ZXMvNjM1XG4gICAgLy8gT3RoZXJ3aXNlIHRzaWNrbGUgbWlnaHQgZW1pdCByZWZlcmVuY2VzIHRvIG5vbiBpbXBvcnRlZCB2YWx1ZXNcbiAgICAvLyBhcyBUeXBlU2NyaXB0IGVsaWRlZCB0aGUgaW1wb3J0LlxuICAgIG9wdGlvbnMuZW1pdERlY29yYXRvck1ldGFkYXRhID0gdHJ1ZTtcbiAgfVxuICBjb25zdCB0c2lja2xlSG9zdDogUGljazxcbiAgICAgIHRzaWNrbGUuVHNpY2tsZUhvc3QsICdzaG91bGRTa2lwVHNpY2tsZVByb2Nlc3NpbmcnfCdwYXRoVG9Nb2R1bGVOYW1lJ3xcbiAgICAgICdzaG91bGRJZ25vcmVXYXJuaW5nc0ZvclBhdGgnfCdmaWxlTmFtZVRvTW9kdWxlSWQnfCdnb29nbW9kdWxlJ3wndW50eXBlZCd8XG4gICAgICAnY29udmVydEluZGV4SW1wb3J0U2hvcnRoYW5kJ3wndHJhbnNmb3JtRGVjb3JhdG9ycyd8J3RyYW5zZm9ybVR5cGVzVG9DbG9zdXJlJz4gPSB7XG4gICAgc2hvdWxkU2tpcFRzaWNrbGVQcm9jZXNzaW5nOiAoZmlsZU5hbWUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgL1xcLmRcXC50cyQvLnRlc3QoZmlsZU5hbWUpIHx8IEdFTkVSQVRFRF9GSUxFUy50ZXN0KGZpbGVOYW1lKSxcbiAgICBwYXRoVG9Nb2R1bGVOYW1lOiAoY29udGV4dCwgaW1wb3J0UGF0aCkgPT4gJycsXG4gICAgc2hvdWxkSWdub3JlV2FybmluZ3NGb3JQYXRoOiAoZmlsZVBhdGgpID0+IGZhbHNlLFxuICAgIGZpbGVOYW1lVG9Nb2R1bGVJZDogKGZpbGVOYW1lKSA9PiBmaWxlTmFtZSxcbiAgICBnb29nbW9kdWxlOiBmYWxzZSxcbiAgICB1bnR5cGVkOiB0cnVlLFxuICAgIGNvbnZlcnRJbmRleEltcG9ydFNob3J0aGFuZDogZmFsc2UsIHRyYW5zZm9ybURlY29yYXRvcnMsIHRyYW5zZm9ybVR5cGVzVG9DbG9zdXJlLFxuICB9O1xuXG4gIGlmIChvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyIHx8IG9wdGlvbnMuYW5ub3RhdGlvbnNBcyA9PT0gJ3N0YXRpYyBmaWVsZHMnKSB7XG4gICAgcmV0dXJuICh7XG4gICAgICAgICAgICAgcHJvZ3JhbSxcbiAgICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLFxuICAgICAgICAgICAgIHdyaXRlRmlsZSxcbiAgICAgICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbixcbiAgICAgICAgICAgICBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgIGN1c3RvbVRyYW5zZm9ybWVycyA9IHt9LFxuICAgICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICB9KSA9PlxuICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXJlcXVpcmUtaW1wb3J0cyBvbmx5IGRlcGVuZCBvbiB0c2lja2xlIGlmIHJlcXVlc3RlZFxuICAgICAgICByZXF1aXJlKCd0c2lja2xlJykuZW1pdFdpdGhUc2lja2xlKFxuICAgICAgICAgICAgcHJvZ3JhbSwgey4uLnRzaWNrbGVIb3N0LCBvcHRpb25zLCBob3N0LCBtb2R1bGVSZXNvbHV0aW9uSG9zdDogaG9zdH0sIGhvc3QsIG9wdGlvbnMsXG4gICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCB7XG4gICAgICAgICAgICAgIGJlZm9yZVRzOiBjdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlLFxuICAgICAgICAgICAgICBhZnRlclRzOiBjdXN0b21UcmFuc2Zvcm1lcnMuYWZ0ZXIsXG4gICAgICAgICAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gKHtcbiAgICAgICAgICAgICBwcm9ncmFtLFxuICAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgICAgICAgd3JpdGVGaWxlLFxuICAgICAgICAgICAgIGNhbmNlbGxhdGlvblRva2VuLFxuICAgICAgICAgICAgIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzID0ge30sXG4gICAgICAgICAgIH0pID0+XG4gICAgICAgICAgICAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgICAgICAgICB7YWZ0ZXI6IGN1c3RvbVRyYW5zZm9ybWVycy5hZnRlciwgYmVmb3JlOiBjdXN0b21UcmFuc2Zvcm1lcnMuYmVmb3JlfSk7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBOZ2NQYXJzZWRDb25maWd1cmF0aW9uIGV4dGVuZHMgUGFyc2VkQ29uZmlndXJhdGlvbiB7IHdhdGNoPzogYm9vbGVhbjsgfVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzOiBzdHJpbmdbXSk6IE5nY1BhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBjb25zdCBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zID0ge307XG4gIGNvbnN0IHBhcnNlZEFyZ3MgPSByZXF1aXJlKCdtaW5pbWlzdCcpKGFyZ3MpO1xuICBpZiAocGFyc2VkQXJncy5pMThuRmlsZSkgb3B0aW9ucy5pMThuSW5GaWxlID0gcGFyc2VkQXJncy5pMThuRmlsZTtcbiAgaWYgKHBhcnNlZEFyZ3MuaTE4bkZvcm1hdCkgb3B0aW9ucy5pMThuSW5Gb3JtYXQgPSBwYXJzZWRBcmdzLmkxOG5Gb3JtYXQ7XG4gIGlmIChwYXJzZWRBcmdzLmxvY2FsZSkgb3B0aW9ucy5pMThuSW5Mb2NhbGUgPSBwYXJzZWRBcmdzLmxvY2FsZTtcbiAgY29uc3QgbXQgPSBwYXJzZWRBcmdzLm1pc3NpbmdUcmFuc2xhdGlvbjtcbiAgaWYgKG10ID09PSAnZXJyb3InIHx8IG10ID09PSAnd2FybmluZycgfHwgbXQgPT09ICdpZ25vcmUnKSB7XG4gICAgb3B0aW9ucy5pMThuSW5NaXNzaW5nVHJhbnNsYXRpb25zID0gbXQ7XG4gIH1cbiAgY29uc3QgY29uZmlnID0gcmVhZENvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihcbiAgICAgIGFyZ3MsIG9wdGlvbnMsIFsnaTE4bkZpbGUnLCAnaTE4bkZvcm1hdCcsICdsb2NhbGUnLCAnbWlzc2luZ1RyYW5zbGF0aW9uJywgJ3dhdGNoJ10pO1xuICBjb25zdCB3YXRjaCA9IHBhcnNlZEFyZ3MudyB8fCBwYXJzZWRBcmdzLndhdGNoO1xuICByZXR1cm4gey4uLmNvbmZpZywgd2F0Y2h9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihcbiAgICBhcmdzOiBzdHJpbmdbXSwgZXhpc3RpbmdPcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zID0ge30sXG4gICAgbmdDbWRMaW5lT3B0aW9uczogc3RyaW5nW10gPSBbXSk6IFBhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBsZXQgY21kQ29uZmlnID0gdHMucGFyc2VDb21tYW5kTGluZShhcmdzKTtcbiAgY29uc3QgcHJvamVjdCA9IGNtZENvbmZpZy5vcHRpb25zLnByb2plY3QgfHwgJy4nO1xuICBjb25zdCBjbWRFcnJvcnMgPSBjbWRDb25maWcuZXJyb3JzLmZpbHRlcihlID0+IHtcbiAgICBpZiAodHlwZW9mIGUubWVzc2FnZVRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCBtc2cgPSBlLm1lc3NhZ2VUZXh0O1xuICAgICAgcmV0dXJuICFuZ0NtZExpbmVPcHRpb25zLnNvbWUobyA9PiBtc2cuaW5kZXhPZihvKSA+PSAwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICBpZiAoY21kRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0LFxuICAgICAgcm9vdE5hbWVzOiBbXSxcbiAgICAgIG9wdGlvbnM6IGNtZENvbmZpZy5vcHRpb25zLFxuICAgICAgZXJyb3JzOiBjbWRFcnJvcnMsXG4gICAgICBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3MuRGVmYXVsdFxuICAgIH07XG4gIH1cbiAgY29uc3QgYWxsRGlhZ25vc3RpY3M6IERpYWdub3N0aWNzID0gW107XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRDb25maWd1cmF0aW9uKHByb2plY3QsIGNtZENvbmZpZy5vcHRpb25zKTtcbiAgY29uc3Qgb3B0aW9ucyA9IHsuLi5jb25maWcub3B0aW9ucywgLi4uZXhpc3RpbmdPcHRpb25zfTtcbiAgaWYgKG9wdGlvbnMubG9jYWxlKSB7XG4gICAgb3B0aW9ucy5pMThuSW5Mb2NhbGUgPSBvcHRpb25zLmxvY2FsZTtcbiAgfVxuICByZXR1cm4ge1xuICAgIHByb2plY3QsXG4gICAgcm9vdE5hbWVzOiBjb25maWcucm9vdE5hbWVzLCBvcHRpb25zLFxuICAgIGVycm9yczogY29uZmlnLmVycm9ycyxcbiAgICBlbWl0RmxhZ3M6IGNvbmZpZy5lbWl0RmxhZ3NcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Rm9ybWF0RGlhZ25vc3RpY3NIb3N0KG9wdGlvbnM/OiBhcGkuQ29tcGlsZXJPcHRpb25zKTogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0IHtcbiAgY29uc3QgYmFzZVBhdGggPSBvcHRpb25zID8gb3B0aW9ucy5iYXNlUGF0aCA6IHVuZGVmaW5lZDtcbiAgcmV0dXJuIHtcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiBiYXNlUGF0aCB8fCB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgIC8vIFdlIG5lZWQgdG8gbm9ybWFsaXplIHRoZSBwYXRoIHNlcGFyYXRvcnMgaGVyZSBiZWNhdXNlIGJ5IGRlZmF1bHQsIFR5cGVTY3JpcHRcbiAgICAvLyBjb21waWxlciBob3N0cyB1c2UgcG9zaXggY2Fub25pY2FsIHBhdGhzLiBJbiBvcmRlciB0byBwcmludCBjb25zaXN0ZW50IGRpYWdub3N0aWNzLFxuICAgIC8vIHdlIGFsc28gbm9ybWFsaXplIHRoZSBwYXRocy5cbiAgICBnZXRDYW5vbmljYWxGaWxlTmFtZTogZmlsZU5hbWUgPT4gZmlsZU5hbWUucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIGdldE5ld0xpbmU6ICgpID0+IHtcbiAgICAgIC8vIE1hbnVhbGx5IGRldGVybWluZSB0aGUgcHJvcGVyIG5ldyBsaW5lIHN0cmluZyBiYXNlZCBvbiB0aGUgcGFzc2VkIGNvbXBpbGVyXG4gICAgICAvLyBvcHRpb25zLiBUaGVyZSBpcyBubyBwdWJsaWMgVHlwZVNjcmlwdCBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmdcbiAgICAgIC8vIG5ldyBsaW5lIHN0cmluZy4gc2VlOiBodHRwczovL2dpdGh1Yi5jb20vTWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzI5NTgxXG4gICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLm5ld0xpbmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5uZXdMaW5lID09PSB0cy5OZXdMaW5lS2luZC5MaW5lRmVlZCA/ICdcXG4nIDogJ1xcclxcbic7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHMuc3lzLm5ld0xpbmU7XG4gICAgfSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVwb3J0RXJyb3JzQW5kRXhpdChcbiAgICBhbGxEaWFnbm9zdGljczogRGlhZ25vc3RpY3MsIG9wdGlvbnM/OiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgIGNvbnNvbGVFcnJvcjogKHM6IHN0cmluZykgPT4gdm9pZCA9IGNvbnNvbGUuZXJyb3IpOiBudW1iZXIge1xuICBjb25zdCBlcnJvcnNBbmRXYXJuaW5ncyA9IGZpbHRlckVycm9yc0FuZFdhcm5pbmdzKGFsbERpYWdub3N0aWNzKTtcbiAgaWYgKGVycm9yc0FuZFdhcm5pbmdzLmxlbmd0aCkge1xuICAgIGNvbnN0IGZvcm1hdEhvc3QgPSBnZXRGb3JtYXREaWFnbm9zdGljc0hvc3Qob3B0aW9ucyk7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5lbmFibGVJdnkgIT09IGZhbHNlKSB7XG4gICAgICBjb25zdCBuZ0RpYWdub3N0aWNzID0gZXJyb3JzQW5kV2FybmluZ3MuZmlsdGVyKGFwaS5pc05nRGlhZ25vc3RpYyk7XG4gICAgICBjb25zdCB0c0RpYWdub3N0aWNzID0gZXJyb3JzQW5kV2FybmluZ3MuZmlsdGVyKGFwaS5pc1RzRGlhZ25vc3RpYyk7XG4gICAgICBjb25zb2xlRXJyb3IocmVwbGFjZVRzV2l0aE5nSW5FcnJvcnMoXG4gICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHRzRGlhZ25vc3RpY3MsIGZvcm1hdEhvc3QpKSk7XG4gICAgICBjb25zb2xlRXJyb3IoZm9ybWF0RGlhZ25vc3RpY3MobmdEaWFnbm9zdGljcywgZm9ybWF0SG9zdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlRXJyb3IoZm9ybWF0RGlhZ25vc3RpY3MoZXJyb3JzQW5kV2FybmluZ3MsIGZvcm1hdEhvc3QpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGV4aXRDb2RlRnJvbVJlc3VsdChhbGxEaWFnbm9zdGljcyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaE1vZGUoXG4gICAgcHJvamVjdDogc3RyaW5nLCBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zLCBjb25zb2xlRXJyb3I6IChzOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgcmV0dXJuIHBlcmZvcm1XYXRjaENvbXBpbGF0aW9uKGNyZWF0ZVBlcmZvcm1XYXRjaEhvc3QocHJvamVjdCwgZGlhZ25vc3RpY3MgPT4ge1xuICAgIGNvbnNvbGVFcnJvcihmb3JtYXREaWFnbm9zdGljcyhkaWFnbm9zdGljcywgZ2V0Rm9ybWF0RGlhZ25vc3RpY3NIb3N0KG9wdGlvbnMpKSk7XG4gIH0sIG9wdGlvbnMsIG9wdGlvbnMgPT4gY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnMpKSk7XG59XG5cbi8vIENMSSBlbnRyeSBwb2ludFxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIGNvbnN0IGFyZ3MgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gIC8vIFdlIGFyZSBydW5uaW5nIHRoZSByZWFsIGNvbXBpbGVyIHNvIHJ1biBhZ2FpbnN0IHRoZSByZWFsIGZpbGUtc3lzdGVtXG4gIHNldEZpbGVTeXN0ZW0obmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSk7XG4gIHByb2Nlc3MuZXhpdENvZGUgPSBtYWluKGFyZ3MpO1xufVxuIl19