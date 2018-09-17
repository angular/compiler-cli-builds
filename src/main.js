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
    function main(args, consoleError, config) {
        if (consoleError === void 0) { consoleError = console.error; }
        var _a = config || readNgcCommandLineAndConfiguration(args), project = _a.project, rootNames = _a.rootNames, options = _a.options, configErrors = _a.errors, watch = _a.watch, emitFlags = _a.emitFlags;
        if (configErrors.length) {
            return reportErrorsAndExit(configErrors, /*options*/ undefined, consoleError);
        }
        if (watch) {
            var result = watchMode(project, options, consoleError);
            return reportErrorsAndExit(result.firstCompileResult, options, consoleError);
        }
        var compileDiags = perform_compile_1.performCompilation({ rootNames: rootNames, options: options, emitFlags: emitFlags, emitCallback: createEmitCallback(options) }).diagnostics;
        return reportErrorsAndExit(compileDiags, options, consoleError);
    }
    exports.main = main;
    function createEmitCallback(options) {
        var transformDecorators = options.enableIvy !== 'ngtsc' && options.enableIvy !== 'tsc' &&
            options.annotationsAs !== 'decorators';
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
    function reportErrorsAndExit(allDiagnostics, options, consoleError) {
        if (consoleError === void 0) { consoleError = console.error; }
        var errorsAndWarnings = perform_compile_1.filterErrorsAndWarnings(allDiagnostics);
        if (errorsAndWarnings.length) {
            var currentDir_1 = options ? options.basePath : undefined;
            var formatHost = {
                getCurrentDirectory: function () { return currentDir_1 || ts.sys.getCurrentDirectory(); },
                getCanonicalFileName: function (fileName) { return fileName; },
                getNewLine: function () { return ts.sys.newLine; }
            };
            if (options && (options.enableIvy === true || options.enableIvy === 'ngtsc')) {
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
            consoleError(perform_compile_1.formatDiagnostics(diagnostics));
        }, options, function (options) { return createEmitCallback(options); }));
    }
    exports.watchMode = watchMode;
    // CLI entry point
    if (require.main === module) {
        var args = process.argv.slice(2);
        process.exitCode = main(args);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBVUEsNEJBQTBCO0lBRTFCLCtCQUFpQztJQUdqQywyRUFBNEQ7SUFDNUQsZ0VBQTBDO0lBQzFDLG9FQUFvRDtJQUVwRCw2RUFBb007SUFDcE0seUVBQWdGO0lBRWhGLFNBQWdCLElBQUksQ0FDaEIsSUFBYyxFQUFFLFlBQWlELEVBQ2pFLE1BQStCO1FBRGYsNkJBQUEsRUFBQSxlQUFvQyxPQUFPLENBQUMsS0FBSztRQUUvRCxJQUFBLHVEQUNrRCxFQURqRCxvQkFBTyxFQUFFLHdCQUFTLEVBQUUsb0JBQU8sRUFBRSx3QkFBb0IsRUFBRSxnQkFBSyxFQUFFLHdCQUFTLENBQ2pCO1FBQ3ZELElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRTtZQUN2QixPQUFPLG1CQUFtQixDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQy9FO1FBQ0QsSUFBSSxLQUFLLEVBQUU7WUFDVCxJQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN6RCxPQUFPLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDOUU7UUFDTSxJQUFBLDRLQUF5QixDQUNnRDtRQUNoRixPQUFPLG1CQUFtQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQWZELG9CQWVDO0lBR0QsU0FBUyxrQkFBa0IsQ0FBQyxPQUE0QjtRQUN0RCxJQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxTQUFTLEtBQUssT0FBTyxJQUFJLE9BQU8sQ0FBQyxTQUFTLEtBQUssS0FBSztZQUNwRixP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QTNCLENBQTJCLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFMRCw4QkFLQztJQUVELGtCQUFrQjtJQUNsQixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQy9CIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBNdXN0IGJlIGltcG9ydGVkIGZpcnN0LCBiZWNhdXNlIEFuZ3VsYXIgZGVjb3JhdG9ycyB0aHJvdyBvbiBsb2FkLlxuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyB0c2lja2xlIGZyb20gJ3RzaWNrbGUnO1xuXG5pbXBvcnQge3JlcGxhY2VUc1dpdGhOZ0luRXJyb3JzfSBmcm9tICcuL25ndHNjL2RpYWdub3N0aWNzJztcbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHtHRU5FUkFURURfRklMRVN9IGZyb20gJy4vdHJhbnNmb3JtZXJzL3V0aWwnO1xuXG5pbXBvcnQge2V4aXRDb2RlRnJvbVJlc3VsdCwgcGVyZm9ybUNvbXBpbGF0aW9uLCByZWFkQ29uZmlndXJhdGlvbiwgZm9ybWF0RGlhZ25vc3RpY3MsIERpYWdub3N0aWNzLCBQYXJzZWRDb25maWd1cmF0aW9uLCBQZXJmb3JtQ29tcGlsYXRpb25SZXN1bHQsIGZpbHRlckVycm9yc0FuZFdhcm5pbmdzfSBmcm9tICcuL3BlcmZvcm1fY29tcGlsZSc7XG5pbXBvcnQge3BlcmZvcm1XYXRjaENvbXBpbGF0aW9uLMKgY3JlYXRlUGVyZm9ybVdhdGNoSG9zdH0gZnJvbSAnLi9wZXJmb3JtX3dhdGNoJztcblxuZXhwb3J0IGZ1bmN0aW9uIG1haW4oXG4gICAgYXJnczogc3RyaW5nW10sIGNvbnNvbGVFcnJvcjogKHM6IHN0cmluZykgPT4gdm9pZCA9IGNvbnNvbGUuZXJyb3IsXG4gICAgY29uZmlnPzogTmdjUGFyc2VkQ29uZmlndXJhdGlvbik6IG51bWJlciB7XG4gIGxldCB7cHJvamVjdCwgcm9vdE5hbWVzLCBvcHRpb25zLCBlcnJvcnM6IGNvbmZpZ0Vycm9ycywgd2F0Y2gsIGVtaXRGbGFnc30gPVxuICAgICAgY29uZmlnIHx8IHJlYWROZ2NDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oYXJncyk7XG4gIGlmIChjb25maWdFcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHJlcG9ydEVycm9yc0FuZEV4aXQoY29uZmlnRXJyb3JzLCAvKm9wdGlvbnMqLyB1bmRlZmluZWQsIGNvbnNvbGVFcnJvcik7XG4gIH1cbiAgaWYgKHdhdGNoKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gd2F0Y2hNb2RlKHByb2plY3QsIG9wdGlvbnMsIGNvbnNvbGVFcnJvcik7XG4gICAgcmV0dXJuIHJlcG9ydEVycm9yc0FuZEV4aXQocmVzdWx0LmZpcnN0Q29tcGlsZVJlc3VsdCwgb3B0aW9ucywgY29uc29sZUVycm9yKTtcbiAgfVxuICBjb25zdCB7ZGlhZ25vc3RpY3M6IGNvbXBpbGVEaWFnc30gPSBwZXJmb3JtQ29tcGlsYXRpb24oXG4gICAgICB7cm9vdE5hbWVzLCBvcHRpb25zLCBlbWl0RmxhZ3MsIGVtaXRDYWxsYmFjazogY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnMpfSk7XG4gIHJldHVybiByZXBvcnRFcnJvcnNBbmRFeGl0KGNvbXBpbGVEaWFncywgb3B0aW9ucywgY29uc29sZUVycm9yKTtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyk6IGFwaS5Uc0VtaXRDYWxsYmFja3x1bmRlZmluZWQge1xuICBjb25zdCB0cmFuc2Zvcm1EZWNvcmF0b3JzID0gb3B0aW9ucy5lbmFibGVJdnkgIT09ICduZ3RzYycgJiYgb3B0aW9ucy5lbmFibGVJdnkgIT09ICd0c2MnICYmXG4gICAgICBvcHRpb25zLmFubm90YXRpb25zQXMgIT09ICdkZWNvcmF0b3JzJztcbiAgY29uc3QgdHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUgPSBvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuICBpZiAoIXRyYW5zZm9ybURlY29yYXRvcnMgJiYgIXRyYW5zZm9ybVR5cGVzVG9DbG9zdXJlKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBpZiAodHJhbnNmb3JtRGVjb3JhdG9ycykge1xuICAgIC8vIFRoaXMgaXMgbmVlZGVkIGFzIGEgd29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvdHNpY2tsZS9pc3N1ZXMvNjM1XG4gICAgLy8gT3RoZXJ3aXNlIHRzaWNrbGUgbWlnaHQgZW1pdCByZWZlcmVuY2VzIHRvIG5vbiBpbXBvcnRlZCB2YWx1ZXNcbiAgICAvLyBhcyBUeXBlU2NyaXB0IGVsaWRlZCB0aGUgaW1wb3J0LlxuICAgIG9wdGlvbnMuZW1pdERlY29yYXRvck1ldGFkYXRhID0gdHJ1ZTtcbiAgfVxuICBjb25zdCB0c2lja2xlSG9zdDogUGljazxcbiAgICAgIHRzaWNrbGUuVHNpY2tsZUhvc3QsICdzaG91bGRTa2lwVHNpY2tsZVByb2Nlc3NpbmcnfCdwYXRoVG9Nb2R1bGVOYW1lJ3xcbiAgICAgICdzaG91bGRJZ25vcmVXYXJuaW5nc0ZvclBhdGgnfCdmaWxlTmFtZVRvTW9kdWxlSWQnfCdnb29nbW9kdWxlJ3wndW50eXBlZCd8XG4gICAgICAnY29udmVydEluZGV4SW1wb3J0U2hvcnRoYW5kJ3wndHJhbnNmb3JtRGVjb3JhdG9ycyd8J3RyYW5zZm9ybVR5cGVzVG9DbG9zdXJlJz4gPSB7XG4gICAgc2hvdWxkU2tpcFRzaWNrbGVQcm9jZXNzaW5nOiAoZmlsZU5hbWUpID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgL1xcLmRcXC50cyQvLnRlc3QoZmlsZU5hbWUpIHx8IEdFTkVSQVRFRF9GSUxFUy50ZXN0KGZpbGVOYW1lKSxcbiAgICBwYXRoVG9Nb2R1bGVOYW1lOiAoY29udGV4dCwgaW1wb3J0UGF0aCkgPT4gJycsXG4gICAgc2hvdWxkSWdub3JlV2FybmluZ3NGb3JQYXRoOiAoZmlsZVBhdGgpID0+IGZhbHNlLFxuICAgIGZpbGVOYW1lVG9Nb2R1bGVJZDogKGZpbGVOYW1lKSA9PiBmaWxlTmFtZSxcbiAgICBnb29nbW9kdWxlOiBmYWxzZSxcbiAgICB1bnR5cGVkOiB0cnVlLFxuICAgIGNvbnZlcnRJbmRleEltcG9ydFNob3J0aGFuZDogZmFsc2UsIHRyYW5zZm9ybURlY29yYXRvcnMsIHRyYW5zZm9ybVR5cGVzVG9DbG9zdXJlLFxuICB9O1xuXG4gIGlmIChvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyIHx8IG9wdGlvbnMuYW5ub3RhdGlvbnNBcyA9PT0gJ3N0YXRpYyBmaWVsZHMnKSB7XG4gICAgcmV0dXJuICh7XG4gICAgICAgICAgICAgcHJvZ3JhbSxcbiAgICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLFxuICAgICAgICAgICAgIHdyaXRlRmlsZSxcbiAgICAgICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbixcbiAgICAgICAgICAgICBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgIGN1c3RvbVRyYW5zZm9ybWVycyA9IHt9LFxuICAgICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgICAgb3B0aW9uc1xuICAgICAgICAgICB9KSA9PlxuICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXJlcXVpcmUtaW1wb3J0cyBvbmx5IGRlcGVuZCBvbiB0c2lja2xlIGlmIHJlcXVlc3RlZFxuICAgICAgICByZXF1aXJlKCd0c2lja2xlJykuZW1pdFdpdGhUc2lja2xlKFxuICAgICAgICAgICAgcHJvZ3JhbSwgey4uLnRzaWNrbGVIb3N0LCBvcHRpb25zLCBob3N0fSwgaG9zdCwgb3B0aW9ucywgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLFxuICAgICAgICAgICAgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIHtcbiAgICAgICAgICAgICAgYmVmb3JlVHM6IGN1c3RvbVRyYW5zZm9ybWVycy5iZWZvcmUsXG4gICAgICAgICAgICAgIGFmdGVyVHM6IGN1c3RvbVRyYW5zZm9ybWVycy5hZnRlcixcbiAgICAgICAgICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAoe1xuICAgICAgICAgICAgIHByb2dyYW0sXG4gICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSxcbiAgICAgICAgICAgICB3cml0ZUZpbGUsXG4gICAgICAgICAgICAgY2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgICAgICAgICAgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnMgPSB7fSxcbiAgICAgICAgICAgfSkgPT5cbiAgICAgICAgICAgICAgIHByb2dyYW0uZW1pdChcbiAgICAgICAgICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgICAgICAgIHthZnRlcjogY3VzdG9tVHJhbnNmb3JtZXJzLmFmdGVyLCBiZWZvcmU6IGN1c3RvbVRyYW5zZm9ybWVycy5iZWZvcmV9KTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nY1BhcnNlZENvbmZpZ3VyYXRpb24gZXh0ZW5kcyBQYXJzZWRDb25maWd1cmF0aW9uIHsgd2F0Y2g/OiBib29sZWFuOyB9XG5cbmZ1bmN0aW9uIHJlYWROZ2NDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oYXJnczogc3RyaW5nW10pOiBOZ2NQYXJzZWRDb25maWd1cmF0aW9uIHtcbiAgY29uc3Qgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyA9IHt9O1xuICBjb25zdCBwYXJzZWRBcmdzID0gcmVxdWlyZSgnbWluaW1pc3QnKShhcmdzKTtcbiAgaWYgKHBhcnNlZEFyZ3MuaTE4bkZpbGUpIG9wdGlvbnMuaTE4bkluRmlsZSA9IHBhcnNlZEFyZ3MuaTE4bkZpbGU7XG4gIGlmIChwYXJzZWRBcmdzLmkxOG5Gb3JtYXQpIG9wdGlvbnMuaTE4bkluRm9ybWF0ID0gcGFyc2VkQXJncy5pMThuRm9ybWF0O1xuICBpZiAocGFyc2VkQXJncy5sb2NhbGUpIG9wdGlvbnMuaTE4bkluTG9jYWxlID0gcGFyc2VkQXJncy5sb2NhbGU7XG4gIGNvbnN0IG10ID0gcGFyc2VkQXJncy5taXNzaW5nVHJhbnNsYXRpb247XG4gIGlmIChtdCA9PT0gJ2Vycm9yJyB8fCBtdCA9PT0gJ3dhcm5pbmcnIHx8IG10ID09PSAnaWdub3JlJykge1xuICAgIG9wdGlvbnMuaTE4bkluTWlzc2luZ1RyYW5zbGF0aW9ucyA9IG10O1xuICB9XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oXG4gICAgICBhcmdzLCBvcHRpb25zLCBbJ2kxOG5GaWxlJywgJ2kxOG5Gb3JtYXQnLCAnbG9jYWxlJywgJ21pc3NpbmdUcmFuc2xhdGlvbicsICd3YXRjaCddKTtcbiAgY29uc3Qgd2F0Y2ggPSBwYXJzZWRBcmdzLncgfHwgcGFyc2VkQXJncy53YXRjaDtcbiAgcmV0dXJuIHsuLi5jb25maWcsIHdhdGNofTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oXG4gICAgYXJnczogc3RyaW5nW10sIGV4aXN0aW5nT3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyA9IHt9LFxuICAgIG5nQ21kTGluZU9wdGlvbnM6IHN0cmluZ1tdID0gW10pOiBQYXJzZWRDb25maWd1cmF0aW9uIHtcbiAgbGV0IGNtZENvbmZpZyA9IHRzLnBhcnNlQ29tbWFuZExpbmUoYXJncyk7XG4gIGNvbnN0IHByb2plY3QgPSBjbWRDb25maWcub3B0aW9ucy5wcm9qZWN0IHx8ICcuJztcbiAgY29uc3QgY21kRXJyb3JzID0gY21kQ29uZmlnLmVycm9ycy5maWx0ZXIoZSA9PiB7XG4gICAgaWYgKHR5cGVvZiBlLm1lc3NhZ2VUZXh0ID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgbXNnID0gZS5tZXNzYWdlVGV4dDtcbiAgICAgIHJldHVybiAhbmdDbWRMaW5lT3B0aW9ucy5zb21lKG8gPT4gbXNnLmluZGV4T2YobykgPj0gMCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgaWYgKGNtZEVycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcHJvamVjdCxcbiAgICAgIHJvb3ROYW1lczogW10sXG4gICAgICBvcHRpb25zOiBjbWRDb25maWcub3B0aW9ucyxcbiAgICAgIGVycm9yczogY21kRXJyb3JzLFxuICAgICAgZW1pdEZsYWdzOiBhcGkuRW1pdEZsYWdzLkRlZmF1bHRcbiAgICB9O1xuICB9XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzOiBEaWFnbm9zdGljcyA9IFtdO1xuICBjb25zdCBjb25maWcgPSByZWFkQ29uZmlndXJhdGlvbihwcm9qZWN0LCBjbWRDb25maWcub3B0aW9ucyk7XG4gIGNvbnN0IG9wdGlvbnMgPSB7Li4uY29uZmlnLm9wdGlvbnMsIC4uLmV4aXN0aW5nT3B0aW9uc307XG4gIGlmIChvcHRpb25zLmxvY2FsZSkge1xuICAgIG9wdGlvbnMuaTE4bkluTG9jYWxlID0gb3B0aW9ucy5sb2NhbGU7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBwcm9qZWN0LFxuICAgIHJvb3ROYW1lczogY29uZmlnLnJvb3ROYW1lcywgb3B0aW9ucyxcbiAgICBlcnJvcnM6IGNvbmZpZy5lcnJvcnMsXG4gICAgZW1pdEZsYWdzOiBjb25maWcuZW1pdEZsYWdzXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlcG9ydEVycm9yc0FuZEV4aXQoXG4gICAgYWxsRGlhZ25vc3RpY3M6IERpYWdub3N0aWNzLCBvcHRpb25zPzogYXBpLkNvbXBpbGVyT3B0aW9ucyxcbiAgICBjb25zb2xlRXJyb3I6IChzOiBzdHJpbmcpID0+IHZvaWQgPSBjb25zb2xlLmVycm9yKTogbnVtYmVyIHtcbiAgY29uc3QgZXJyb3JzQW5kV2FybmluZ3MgPSBmaWx0ZXJFcnJvcnNBbmRXYXJuaW5ncyhhbGxEaWFnbm9zdGljcyk7XG4gIGlmIChlcnJvcnNBbmRXYXJuaW5ncy5sZW5ndGgpIHtcbiAgICBsZXQgY3VycmVudERpciA9IG9wdGlvbnMgPyBvcHRpb25zLmJhc2VQYXRoIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IGZvcm1hdEhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6ICgpID0+IGN1cnJlbnREaXIgfHwgdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgICAgIGdldENhbm9uaWNhbEZpbGVOYW1lOiBmaWxlTmFtZSA9PiBmaWxlTmFtZSxcbiAgICAgIGdldE5ld0xpbmU6ICgpID0+IHRzLnN5cy5uZXdMaW5lXG4gICAgfTtcbiAgICBpZiAob3B0aW9ucyAmJiAob3B0aW9ucy5lbmFibGVJdnkgPT09IHRydWUgfHwgb3B0aW9ucy5lbmFibGVJdnkgPT09ICduZ3RzYycpKSB7XG4gICAgICBjb25zdCBuZ0RpYWdub3N0aWNzID0gZXJyb3JzQW5kV2FybmluZ3MuZmlsdGVyKGFwaS5pc05nRGlhZ25vc3RpYyk7XG4gICAgICBjb25zdCB0c0RpYWdub3N0aWNzID0gZXJyb3JzQW5kV2FybmluZ3MuZmlsdGVyKGFwaS5pc1RzRGlhZ25vc3RpYyk7XG4gICAgICBjb25zb2xlRXJyb3IocmVwbGFjZVRzV2l0aE5nSW5FcnJvcnMoXG4gICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KHRzRGlhZ25vc3RpY3MsIGZvcm1hdEhvc3QpKSk7XG4gICAgICBjb25zb2xlRXJyb3IoZm9ybWF0RGlhZ25vc3RpY3MobmdEaWFnbm9zdGljcywgZm9ybWF0SG9zdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlRXJyb3IoZm9ybWF0RGlhZ25vc3RpY3MoZXJyb3JzQW5kV2FybmluZ3MsIGZvcm1hdEhvc3QpKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGV4aXRDb2RlRnJvbVJlc3VsdChhbGxEaWFnbm9zdGljcyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaE1vZGUoXG4gICAgcHJvamVjdDogc3RyaW5nLCBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zLCBjb25zb2xlRXJyb3I6IChzOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgcmV0dXJuIHBlcmZvcm1XYXRjaENvbXBpbGF0aW9uKGNyZWF0ZVBlcmZvcm1XYXRjaEhvc3QocHJvamVjdCwgZGlhZ25vc3RpY3MgPT4ge1xuICAgIGNvbnNvbGVFcnJvcihmb3JtYXREaWFnbm9zdGljcyhkaWFnbm9zdGljcykpO1xuICB9LCBvcHRpb25zLCBvcHRpb25zID0+IGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zKSkpO1xufVxuXG4vLyBDTEkgZW50cnkgcG9pbnRcbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBjb25zdCBhcmdzID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBwcm9jZXNzLmV4aXRDb2RlID0gbWFpbihhcmdzKTtcbn1cbiJdfQ==