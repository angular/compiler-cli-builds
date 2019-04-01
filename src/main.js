#!/usr/bin/env node
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
    require("reflect-metadata");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var api = require("@angular/compiler-cli/src/transformers/api");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    var perform_compile_1 = require("@angular/compiler-cli/src/perform_compile");
    var perform_watch_1 = require("@angular/compiler-cli/src/perform_watch");
    function main(args, consoleError, config, customTransformers, programReuse) {
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
            emitCallback: createEmitCallback(options), customTransformers: customTransformers
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBVUEsNEJBQTBCO0lBRTFCLCtCQUFpQztJQUdqQywyRUFBNEQ7SUFDNUQsZ0VBQTBDO0lBQzFDLG9FQUFvRDtJQUVwRCw2RUFBb007SUFDcE0seUVBQWdGO0lBRWhGLFNBQWdCLElBQUksQ0FDaEIsSUFBYyxFQUFFLFlBQWlELEVBQ2pFLE1BQStCLEVBQUUsa0JBQTJDLEVBQUUsWUFFN0U7UUFIZSw2QkFBQSxFQUFBLGVBQW9DLE9BQU8sQ0FBQyxLQUFLO1FBSS9ELElBQUEsdURBQ2tELEVBRGpELG9CQUFPLEVBQUUsd0JBQVMsRUFBRSxvQkFBTyxFQUFFLHdCQUFvQixFQUFFLGdCQUFLLEVBQUUsd0JBQ1QsQ0FBQztRQUN2RCxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUU7WUFDdkIsT0FBTyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztTQUMvRTtRQUNELElBQUksS0FBSyxFQUFFO1lBQ1QsSUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDekQsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQzlFO1FBRUQsSUFBSSxVQUFpQyxDQUFDO1FBQ3RDLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtZQUM5QixVQUFVLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztTQUNuQztRQUVLLElBQUE7Ozs7OztVQU1KLEVBTkssNkJBQXlCLEVBQUUsb0JBTWhDLENBQUM7UUFDSCxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7WUFDOUIsWUFBWSxDQUFDLE9BQU8s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SUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQy9CIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBNdXN0IGJlIGltcG9ydGVkIGZpcnN0LCBiZWNhdXNlIEFuZ3VsYXIgZGVjb3JhdG9ycyB0aHJvdyBvbiBsb2FkLlxuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyB0c2lja2xlIGZyb20gJ3RzaWNrbGUnO1xuXG5pbXBvcnQge3JlcGxhY2VUc1dpdGhOZ0luRXJyb3JzfSBmcm9tICcuL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHtHRU5FUkFURURfRklMRVN9IGZyb20gJy4vdHJhbnNmb3JtZXJzL3V0aWwnO1xuXG5pbXBvcnQge2V4aXRDb2RlRnJvbVJlc3VsdCwgcGVyZm9ybUNvbXBpbGF0aW9uLCByZWFkQ29uZmlndXJhdGlvbiwgZm9ybWF0RGlhZ25vc3RpY3MsIERpYWdub3N0aWNzLCBQYXJzZWRDb25maWd1cmF0aW9uLCBQZXJmb3JtQ29tcGlsYXRpb25SZXN1bHQsIGZpbHRlckVycm9yc0FuZFdhcm5pbmdzfSBmcm9tICcuL3BlcmZvcm1fY29tcGlsZSc7XG5pbXBvcnQge3BlcmZvcm1XYXRjaENvbXBpbGF0aW9uLMKgY3JlYXRlUGVyZm9ybVdhdGNoSG9zdH0gZnJvbSAnLi9wZXJmb3JtX3dhdGNoJztcblxuZXhwb3J0IGZ1bmN0aW9uIG1haW4oXG4gICAgYXJnczogc3RyaW5nW10sIGNvbnNvbGVFcnJvcjogKHM6IHN0cmluZykgPT4gdm9pZCA9IGNvbnNvbGUuZXJyb3IsXG4gICAgY29uZmlnPzogTmdjUGFyc2VkQ29uZmlndXJhdGlvbiwgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycywgcHJvZ3JhbVJldXNlPzoge1xuICAgICAgcHJvZ3JhbTogYXBpLlByb2dyYW0gfCB1bmRlZmluZWQsXG4gICAgfSk6IG51bWJlciB7XG4gIGxldCB7cHJvamVjdCwgcm9vdE5hbWVzLCBvcHRpb25zLCBlcnJvcnM6IGNvbmZpZ0Vycm9ycywgd2F0Y2gsIGVtaXRGbGFnc30gPVxuICAgICAgY29uZmlnIHx8IHJlYWROZ2NDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oYXJncyk7XG4gIGlmIChjb25maWdFcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHJlcG9ydEVycm9yc0FuZEV4aXQoY29uZmlnRXJyb3JzLCAvKm9wdGlvbnMqLyB1bmRlZmluZWQsIGNvbnNvbGVFcnJvcik7XG4gIH1cbiAgaWYgKHdhdGNoKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gd2F0Y2hNb2RlKHByb2plY3QsIG9wdGlvbnMsIGNvbnNvbGVFcnJvcik7XG4gICAgcmV0dXJuIHJlcG9ydEVycm9yc0FuZEV4aXQocmVzdWx0LmZpcnN0Q29tcGlsZVJlc3VsdCwgb3B0aW9ucywgY29uc29sZUVycm9yKTtcbiAgfVxuXG4gIGxldCBvbGRQcm9ncmFtOiBhcGkuUHJvZ3JhbXx1bmRlZmluZWQ7XG4gIGlmIChwcm9ncmFtUmV1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgIG9sZFByb2dyYW0gPSBwcm9ncmFtUmV1c2UucHJvZ3JhbTtcbiAgfVxuXG4gIGNvbnN0IHtkaWFnbm9zdGljczogY29tcGlsZURpYWdzLCBwcm9ncmFtfSA9IHBlcmZvcm1Db21waWxhdGlvbih7XG4gICAgcm9vdE5hbWVzLFxuICAgIG9wdGlvbnMsXG4gICAgZW1pdEZsYWdzLFxuICAgIG9sZFByb2dyYW0sXG4gICAgZW1pdENhbGxiYWNrOiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucyksIGN1c3RvbVRyYW5zZm9ybWVyc1xuICB9KTtcbiAgaWYgKHByb2dyYW1SZXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcHJvZ3JhbVJldXNlLnByb2dyYW0gPSBwcm9ncmFtO1xuICB9XG4gIHJldHVybiByZXBvcnRFcnJvcnNBbmRFeGl0KGNvbXBpbGVEaWFncywgb3B0aW9ucywgY29uc29sZUVycm9yKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1haW5EaWFnbm9zdGljc0ZvclRlc3QoXG4gICAgYXJnczogc3RyaW5nW10sIGNvbmZpZz86IE5nY1BhcnNlZENvbmZpZ3VyYXRpb24pOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+IHtcbiAgbGV0IHtwcm9qZWN0LCByb290TmFtZXMsIG9wdGlvbnMsIGVycm9yczogY29uZmlnRXJyb3JzLCB3YXRjaCwgZW1pdEZsYWdzfSA9XG4gICAgICBjb25maWcgfHwgcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzKTtcbiAgaWYgKGNvbmZpZ0Vycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gY29uZmlnRXJyb3JzO1xuICB9XG4gIGNvbnN0IHtkaWFnbm9zdGljczogY29tcGlsZURpYWdzfSA9IHBlcmZvcm1Db21waWxhdGlvbihcbiAgICAgIHtyb290TmFtZXMsIG9wdGlvbnMsIGVtaXRGbGFncywgZW1pdENhbGxiYWNrOiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucyl9KTtcbiAgcmV0dXJuIGNvbXBpbGVEaWFncztcbn1cblxuZnVuY3Rpb24gY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMpOiBhcGkuVHNFbWl0Q2FsbGJhY2t8dW5kZWZpbmVkIHtcbiAgY29uc3QgdHJhbnNmb3JtRGVjb3JhdG9ycyA9ICFvcHRpb25zLmVuYWJsZUl2eSAmJiBvcHRpb25zLmFubm90YXRpb25zQXMgIT09ICdkZWNvcmF0b3JzJztcbiAgY29uc3QgdHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUgPSBvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuICBpZiAoIXRyYW5zZm9ybURlY29yYXRvcnMgJiYgIXRyYW5zZm9ybVR5cGVzVG9DbG9zdXJlKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBpZiAodHJhbnNmb3JtRGVjb3JhdG9ycykge1xuICAgIC8vIFRoaXMgaXMgbmVlZGVkIGFzIGEgd29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvdHNpY2tsZS9pc3N1ZXMvNjM1XG4gICAgLy8gT3RoZXJ3aXNlIHRzaWNrbGUgbWlnaHQgZW1pdCByZWZlcmVuY2VzIHRvIG5vbiBpbXBvcnRlZCB2YWx1ZXNcbiAgICAvLyBhcyBUeXBlU2NyaXB0IGVsaWRlZCB0aGUgaW1wb3J0LlxuICAgIG9wdGlvbnMuZW1pdERlY29yYXRvck1ldGFkYXRhID0gdHJ1ZTtcbiAgfVxuICBjb25zdCB0c2lja2xlSG9zdDogUGljazxcbiAgICAgIHRzaWNrbGUuVHNpY2tsZUhvc3QsICdzaG91bGRTa2lwVHNpY2tsZVByb2Nlc3NpbmcnfCdwYXRoVG9Nb2R1bGVOYW1lJ3xcbiAgICAgICdzaG91bGRJZ25vcmVXYXJuaW5nc0ZvclBhdGgnfCdmaWxlTmFtZVRvTW9kdWxlSWQnfCdnb29nbW9kdWxlJ3wndW50eXBlZCd8XG4gICAgICAnY29udmVydEluZGV4SW1wb3J0U2hvcnRoYW5kJ3wndHJhbnNmb3JtRGVjb3JhdG9ycyd8J3RyYW5zZm9ybVR5cGVzVG9DbG9zdXJlJz4gPSB7XG4gICAgc2hvdWxkU2tpcFRzaWNrbGVQcm9jZXNzaW5nOiAoZmlsZU5hbWUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgL1xcLmRcXC50cyQvLnRlc3QoZmlsZU5hbWUpIHx8IEdFTkVSQVRFRF9GSUxFUy50ZXN0KGZpbGVOYW1lKSxcbiAgICBwYXRoVG9Nb2R1bGVOYW1lOiAoY29udGV4dCwgaW1wb3J0UGF0aCkgPT4gJycsXG4gICAgc2hvdWxkSWdub3JlV2FybmluZ3NGb3JQYXRoOiAoZmlsZVBhdGgpID0+IGZhbHNlLFxuICAgIGZpbGVOYW1lVG9Nb2R1bGVJZDogKGZpbGVOYW1lKSA9PiBmaWxlTmFtZSxcbiAgICBnb29nbW9kdWxlOiBmYWxzZSxcbiAgICB1bnR5cGVkOiB0cnVlLFxuICAgIGNvbnZlcnRJbmRleEltcG9ydFNob3J0aGFuZDogZmFsc2UsIHRyYW5zZm9ybURlY29yYXRvcnMsIHRyYW5zZm9ybVR5cGVzVG9DbG9zdXJlLFxuICB9O1xuXG4gIGlmIChvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyIHx8IG9wdGlvbnMuYW5ub3RhdGlvbnNBcyA9PT0gJ3N0YXRpYyBmaWVsZHMnKSB7XG4gICAgcmV0dXJuICh7XG4gICAgICAgICAgICAgcHJvZ3JhbSxcbiAgICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLFxuICAgICAgICAgICAgIHdyaXRlRmlsZSxcbiAgICAgICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbixcbiAgICAgICAgICAgICBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgIGN1c3RvbVRyYW5zZm9ybWVycyA9IHt9LFxuICAgICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICB9KSA9PlxuICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXJlcXVpcmUtaW1wb3J0cyBvbmx5IGRlcGVuZCBvbiB0c2lja2xlIGlmIHJlcXVlc3RlZFxuICAgICAgICByZXF1aXJlKCd0c2lja2xlJykuZW1pdFdpdGhUc2lja2xlKFxuICAgICAgICAgICAgcHJvZ3JhbSwgey4uLnRzaWNrbGVIb3N0LCBvcHRpb25zLCBob3N0fSwgaG9zdCwgb3B0aW9ucywgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLFxuICAgICAgICAgICAgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIHtcbiAgICAgICAgICAgICAgYmVmb3JlVHM6IGN1c3RvbVRyYW5zZm9ybWVycy5iZWZvcmUsXG4gICAgICAgICAgICAgIGFmdGVyVHM6IGN1c3RvbVRyYW5zZm9ybWVycy5hZnRlcixcbiAgICAgICAgICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAoe1xuICAgICAgICAgICAgIHByb2dyYW0sXG4gICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSxcbiAgICAgICAgICAgICB3cml0ZUZpbGUsXG4gICAgICAgICAgICAgY2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgICAgICAgICAgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnMgPSB7fSxcbiAgICAgICAgICAgfSkgPT5cbiAgICAgICAgICAgICAgIHByb2dyYW0uZW1pdChcbiAgICAgICAgICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgICAgICAgIHthZnRlcjogY3VzdG9tVHJhbnNmb3JtZXJzLmFmdGVyLCBiZWZvcmU6IGN1c3RvbVRyYW5zZm9ybWVycy5iZWZvcmV9KTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nY1BhcnNlZENvbmZpZ3VyYXRpb24gZXh0ZW5kcyBQYXJzZWRDb25maWd1cmF0aW9uIHsgd2F0Y2g/OiBib29sZWFuOyB9XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkTmdjQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKGFyZ3M6IHN0cmluZ1tdKTogTmdjUGFyc2VkQ29uZmlndXJhdGlvbiB7XG4gIGNvbnN0IG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMgPSB7fTtcbiAgY29uc3QgcGFyc2VkQXJncyA9IHJlcXVpcmUoJ21pbmltaXN0JykoYXJncyk7XG4gIGlmIChwYXJzZWRBcmdzLmkxOG5GaWxlKSBvcHRpb25zLmkxOG5JbkZpbGUgPSBwYXJzZWRBcmdzLmkxOG5GaWxlO1xuICBpZiAocGFyc2VkQXJncy5pMThuRm9ybWF0KSBvcHRpb25zLmkxOG5JbkZvcm1hdCA9IHBhcnNlZEFyZ3MuaTE4bkZvcm1hdDtcbiAgaWYgKHBhcnNlZEFyZ3MubG9jYWxlKSBvcHRpb25zLmkxOG5JbkxvY2FsZSA9IHBhcnNlZEFyZ3MubG9jYWxlO1xuICBjb25zdCBtdCA9IHBhcnNlZEFyZ3MubWlzc2luZ1RyYW5zbGF0aW9uO1xuICBpZiAobXQgPT09ICdlcnJvcicgfHwgbXQgPT09ICd3YXJuaW5nJyB8fCBtdCA9PT0gJ2lnbm9yZScpIHtcbiAgICBvcHRpb25zLmkxOG5Jbk1pc3NpbmdUcmFuc2xhdGlvbnMgPSBtdDtcbiAgfVxuICBjb25zdCBjb25maWcgPSByZWFkQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKFxuICAgICAgYXJncywgb3B0aW9ucywgWydpMThuRmlsZScsICdpMThuRm9ybWF0JywgJ2xvY2FsZScsICdtaXNzaW5nVHJhbnNsYXRpb24nLCAnd2F0Y2gnXSk7XG4gIGNvbnN0IHdhdGNoID0gcGFyc2VkQXJncy53IHx8IHBhcnNlZEFyZ3Mud2F0Y2g7XG4gIHJldHVybiB7Li4uY29uZmlnLCB3YXRjaH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKFxuICAgIGFyZ3M6IHN0cmluZ1tdLCBleGlzdGluZ09wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMgPSB7fSxcbiAgICBuZ0NtZExpbmVPcHRpb25zOiBzdHJpbmdbXSA9IFtdKTogUGFyc2VkQ29uZmlndXJhdGlvbiB7XG4gIGxldCBjbWRDb25maWcgPSB0cy5wYXJzZUNvbW1hbmRMaW5lKGFyZ3MpO1xuICBjb25zdCBwcm9qZWN0ID0gY21kQ29uZmlnLm9wdGlvbnMucHJvamVjdCB8fCAnLic7XG4gIGNvbnN0IGNtZEVycm9ycyA9IGNtZENvbmZpZy5lcnJvcnMuZmlsdGVyKGUgPT4ge1xuICAgIGlmICh0eXBlb2YgZS5tZXNzYWdlVGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGUubWVzc2FnZVRleHQ7XG4gICAgICByZXR1cm4gIW5nQ21kTGluZU9wdGlvbnMuc29tZShvID0+IG1zZy5pbmRleE9mKG8pID49IDApO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIGlmIChjbWRFcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICByb290TmFtZXM6IFtdLFxuICAgICAgb3B0aW9uczogY21kQ29uZmlnLm9wdGlvbnMsXG4gICAgICBlcnJvcnM6IGNtZEVycm9ycyxcbiAgICAgIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncy5EZWZhdWx0XG4gICAgfTtcbiAgfVxuICBjb25zdCBhbGxEaWFnbm9zdGljczogRGlhZ25vc3RpY3MgPSBbXTtcbiAgY29uc3QgY29uZmlnID0gcmVhZENvbmZpZ3VyYXRpb24ocHJvamVjdCwgY21kQ29uZmlnLm9wdGlvbnMpO1xuICBjb25zdCBvcHRpb25zID0gey4uLmNvbmZpZy5vcHRpb25zLCAuLi5leGlzdGluZ09wdGlvbnN9O1xuICBpZiAob3B0aW9ucy5sb2NhbGUpIHtcbiAgICBvcHRpb25zLmkxOG5JbkxvY2FsZSA9IG9wdGlvbnMubG9jYWxlO1xuICB9XG4gIHJldHVybiB7XG4gICAgcHJvamVjdCxcbiAgICByb290TmFtZXM6IGNvbmZpZy5yb290TmFtZXMsIG9wdGlvbnMsXG4gICAgZXJyb3JzOiBjb25maWcuZXJyb3JzLFxuICAgIGVtaXRGbGFnczogY29uZmlnLmVtaXRGbGFnc1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRGb3JtYXREaWFnbm9zdGljc0hvc3Qob3B0aW9ucz86IGFwaS5Db21waWxlck9wdGlvbnMpOiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3Qge1xuICBjb25zdCBiYXNlUGF0aCA9IG9wdGlvbnMgPyBvcHRpb25zLmJhc2VQYXRoIDogdW5kZWZpbmVkO1xuICByZXR1cm4ge1xuICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6ICgpID0+IGJhc2VQYXRoIHx8IHRzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5KCksXG4gICAgLy8gV2UgbmVlZCB0byBub3JtYWxpemUgdGhlIHBhdGggc2VwYXJhdG9ycyBoZXJlIGJlY2F1c2UgYnkgZGVmYXVsdCwgVHlwZVNjcmlwdFxuICAgIC8vIGNvbXBpbGVyIGhvc3RzIHVzZSBwb3NpeCBjYW5vbmljYWwgcGF0aHMuIEluIG9yZGVyIHRvIHByaW50IGNvbnNpc3RlbnQgZGlhZ25vc3RpY3MsXG4gICAgLy8gd2UgYWxzbyBub3JtYWxpemUgdGhlIHBhdGhzLlxuICAgIGdldENhbm9uaWNhbEZpbGVOYW1lOiBmaWxlTmFtZSA9PiBmaWxlTmFtZS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgZ2V0TmV3TGluZTogKCkgPT4ge1xuICAgICAgLy8gTWFudWFsbHkgZGV0ZXJtaW5lIHRoZSBwcm9wZXIgbmV3IGxpbmUgc3RyaW5nIGJhc2VkIG9uIHRoZSBwYXNzZWQgY29tcGlsZXJcbiAgICAgIC8vIG9wdGlvbnMuIFRoZXJlIGlzIG5vIHB1YmxpYyBUeXBlU2NyaXB0IGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZ1xuICAgICAgLy8gbmV3IGxpbmUgc3RyaW5nLiBzZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjk1ODFcbiAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubmV3TGluZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLm5ld0xpbmUgPT09IHRzLk5ld0xpbmVLaW5kLkxpbmVGZWVkID8gJ1xcbicgOiAnXFxyXFxuJztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cy5zeXMubmV3TGluZTtcbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiByZXBvcnRFcnJvcnNBbmRFeGl0KFxuICAgIGFsbERpYWdub3N0aWNzOiBEaWFnbm9zdGljcywgb3B0aW9ucz86IGFwaS5Db21waWxlck9wdGlvbnMsXG4gICAgY29uc29sZUVycm9yOiAoczogc3RyaW5nKSA9PiB2b2lkID0gY29uc29sZS5lcnJvcik6IG51bWJlciB7XG4gIGNvbnN0IGVycm9yc0FuZFdhcm5pbmdzID0gZmlsdGVyRXJyb3JzQW5kV2FybmluZ3MoYWxsRGlhZ25vc3RpY3MpO1xuICBpZiAoZXJyb3JzQW5kV2FybmluZ3MubGVuZ3RoKSB7XG4gICAgY29uc3QgZm9ybWF0SG9zdCA9IGdldEZvcm1hdERpYWdub3N0aWNzSG9zdChvcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmVuYWJsZUl2eSA9PT0gdHJ1ZSkge1xuICAgICAgY29uc3QgbmdEaWFnbm9zdGljcyA9IGVycm9yc0FuZFdhcm5pbmdzLmZpbHRlcihhcGkuaXNOZ0RpYWdub3N0aWMpO1xuICAgICAgY29uc3QgdHNEaWFnbm9zdGljcyA9IGVycm9yc0FuZFdhcm5pbmdzLmZpbHRlcihhcGkuaXNUc0RpYWdub3N0aWMpO1xuICAgICAgY29uc29sZUVycm9yKHJlcGxhY2VUc1dpdGhOZ0luRXJyb3JzKFxuICAgICAgICAgIHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dCh0c0RpYWdub3N0aWNzLCBmb3JtYXRIb3N0KSkpO1xuICAgICAgY29uc29sZUVycm9yKGZvcm1hdERpYWdub3N0aWNzKG5nRGlhZ25vc3RpY3MsIGZvcm1hdEhvc3QpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZUVycm9yKGZvcm1hdERpYWdub3N0aWNzKGVycm9yc0FuZFdhcm5pbmdzLCBmb3JtYXRIb3N0KSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBleGl0Q29kZUZyb21SZXN1bHQoYWxsRGlhZ25vc3RpY3MpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hNb2RlKFxuICAgIHByb2plY3Q6IHN0cmluZywgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucywgY29uc29sZUVycm9yOiAoczogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIHJldHVybiBwZXJmb3JtV2F0Y2hDb21waWxhdGlvbihjcmVhdGVQZXJmb3JtV2F0Y2hIb3N0KHByb2plY3QsIGRpYWdub3N0aWNzID0+IHtcbiAgICBjb25zb2xlRXJyb3IoZm9ybWF0RGlhZ25vc3RpY3MoZGlhZ25vc3RpY3MsIGdldEZvcm1hdERpYWdub3N0aWNzSG9zdChvcHRpb25zKSkpO1xuICB9LCBvcHRpb25zLCBvcHRpb25zID0+IGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zKSkpO1xufVxuXG4vLyBDTEkgZW50cnkgcG9pbnRcbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBjb25zdCBhcmdzID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBwcm9jZXNzLmV4aXRDb2RlID0gbWFpbihhcmdzKTtcbn1cbiJdfQ==