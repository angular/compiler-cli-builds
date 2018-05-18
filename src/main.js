#!/usr/bin/env node
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/main", ["require", "exports", "tslib", "reflect-metadata", "typescript", "tsickle/src/tsickle", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/util", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/src/perform_watch"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    require("reflect-metadata");
    var ts = require("typescript");
    var tsickle = require("tsickle/src/tsickle");
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
        var transformDecorators = options.enableIvy !== 'ngtsc' && options.annotationsAs !== 'decorators';
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
        return function (_a) {
            var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, _b = _a.customTransformers, customTransformers = _b === void 0 ? {} : _b, host = _a.host, options = _a.options;
            return tsickle.emitWithTsickle(program, tslib_1.__assign({}, tsickleHost, { options: options, host: host }), host, options, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, {
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
            consoleError(perform_compile_1.formatDiagnostics(errorsAndWarnings, formatHost));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBVUEsNEJBQTBCO0lBRTFCLCtCQUFpQztJQUdqQyw2Q0FBbUM7SUFDbkMsZ0VBQTBDO0lBRTFDLG9FQUFvRDtJQUVwRCw2RUFBb007SUFDcE0seUVBQWdGO0lBRWhGLGNBQ0ksSUFBYyxFQUFFLFlBQWlELEVBQ2pFLE1BQStCO1FBRGYsNkJBQUEsRUFBQSxlQUFvQyxPQUFPLENBQUMsS0FBSztRQUUvRCxJQUFBLHVEQUNrRCxFQURqRCxvQkFBTyxFQUFFLHdCQUFTLEVBQUUsb0JBQU8sRUFBRSx3QkFBb0IsRUFBRSxnQkFBSyxFQUFFLHdCQUFTLENBQ2pCO1FBQ3ZELElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRTtZQUN2QixPQUFPLG1CQUFtQixDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQy9FO1FBQ0QsSUFBSSxLQUFLLEVBQUU7WUFDVCxJQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUN6RCxPQUFPLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDOUU7UUFDTSxJQUFBLDRLQUF5QixDQUNnRDtRQUNoRixPQUFPLG1CQUFtQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQWZELG9CQWVDO0lBR0QsNEJBQTRCLE9BQTRCO1FBQ3RELElBQU0sbUJBQW1CLEdBQ3JCLE9BQU8sQ0FBQyxTQUFTLEtBQUssT0FBTyxJQUFJLE9BQU8sQ0FBQyxhQUFhLEtBQUssWUFBWSxDQUFDO1FBQzVFLElBQU0sdUJBQXVCLEdBQUcs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a0JBQWtCLENBQUMsT0FBTyxDQUFDLEVBQTNCLENBQTJCLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFMRCw4QkFLQztJQUVELGtCQUFrQjtJQUNsQixJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQy9CIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG4vLyBNdXN0IGJlIGltcG9ydGVkIGZpcnN0LCBiZWNhdXNlIEFuZ3VsYXIgZGVjb3JhdG9ycyB0aHJvdyBvbiBsb2FkLlxuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHNpY2tsZSBmcm9tICd0c2lja2xlJztcbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0ICogYXMgbmdjIGZyb20gJy4vdHJhbnNmb3JtZXJzL2VudHJ5X3BvaW50cyc7XG5pbXBvcnQge0dFTkVSQVRFRF9GSUxFU30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmltcG9ydCB7ZXhpdENvZGVGcm9tUmVzdWx0LCBwZXJmb3JtQ29tcGlsYXRpb24sIHJlYWRDb25maWd1cmF0aW9uLCBmb3JtYXREaWFnbm9zdGljcywgRGlhZ25vc3RpY3MsIFBhcnNlZENvbmZpZ3VyYXRpb24sIFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCwgZmlsdGVyRXJyb3JzQW5kV2FybmluZ3N9IGZyb20gJy4vcGVyZm9ybV9jb21waWxlJztcbmltcG9ydCB7cGVyZm9ybVdhdGNoQ29tcGlsYXRpb24swqBjcmVhdGVQZXJmb3JtV2F0Y2hIb3N0fSBmcm9tICcuL3BlcmZvcm1fd2F0Y2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbihcbiAgICBhcmdzOiBzdHJpbmdbXSwgY29uc29sZUVycm9yOiAoczogc3RyaW5nKSA9PiB2b2lkID0gY29uc29sZS5lcnJvcixcbiAgICBjb25maWc/OiBOZ2NQYXJzZWRDb25maWd1cmF0aW9uKTogbnVtYmVyIHtcbiAgbGV0IHtwcm9qZWN0LCByb290TmFtZXMsIG9wdGlvbnMsIGVycm9yczogY29uZmlnRXJyb3JzLCB3YXRjaCwgZW1pdEZsYWdzfSA9XG4gICAgICBjb25maWcgfHwgcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzKTtcbiAgaWYgKGNvbmZpZ0Vycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gcmVwb3J0RXJyb3JzQW5kRXhpdChjb25maWdFcnJvcnMsIC8qb3B0aW9ucyovIHVuZGVmaW5lZCwgY29uc29sZUVycm9yKTtcbiAgfVxuICBpZiAod2F0Y2gpIHtcbiAgICBjb25zdCByZXN1bHQgPSB3YXRjaE1vZGUocHJvamVjdCwgb3B0aW9ucywgY29uc29sZUVycm9yKTtcbiAgICByZXR1cm4gcmVwb3J0RXJyb3JzQW5kRXhpdChyZXN1bHQuZmlyc3RDb21waWxlUmVzdWx0LCBvcHRpb25zLCBjb25zb2xlRXJyb3IpO1xuICB9XG4gIGNvbnN0IHtkaWFnbm9zdGljczogY29tcGlsZURpYWdzfSA9IHBlcmZvcm1Db21waWxhdGlvbihcbiAgICAgIHtyb290TmFtZXMsIG9wdGlvbnMsIGVtaXRGbGFncywgZW1pdENhbGxiYWNrOiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucyl9KTtcbiAgcmV0dXJuIHJlcG9ydEVycm9yc0FuZEV4aXQoY29tcGlsZURpYWdzLCBvcHRpb25zLCBjb25zb2xlRXJyb3IpO1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKTogYXBpLlRzRW1pdENhbGxiYWNrfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRyYW5zZm9ybURlY29yYXRvcnMgPVxuICAgICAgb3B0aW9ucy5lbmFibGVJdnkgIT09ICduZ3RzYycgJiYgb3B0aW9ucy5hbm5vdGF0aW9uc0FzICE9PSAnZGVjb3JhdG9ycyc7XG4gIGNvbnN0IHRyYW5zZm9ybVR5cGVzVG9DbG9zdXJlID0gb3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjtcbiAgaWYgKCF0cmFuc2Zvcm1EZWNvcmF0b3JzICYmICF0cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZSkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgaWYgKHRyYW5zZm9ybURlY29yYXRvcnMpIHtcbiAgICAvLyBUaGlzIGlzIG5lZWRlZCBhcyBhIHdvcmthcm91bmQgZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL3RzaWNrbGUvaXNzdWVzLzYzNVxuICAgIC8vIE90aGVyd2lzZSB0c2lja2xlIG1pZ2h0IGVtaXQgcmVmZXJlbmNlcyB0byBub24gaW1wb3J0ZWQgdmFsdWVzXG4gICAgLy8gYXMgVHlwZVNjcmlwdCBlbGlkZWQgdGhlIGltcG9ydC5cbiAgICBvcHRpb25zLmVtaXREZWNvcmF0b3JNZXRhZGF0YSA9IHRydWU7XG4gIH1cbiAgY29uc3QgdHNpY2tsZUhvc3Q6IFBpY2s8XG4gICAgICB0c2lja2xlLlRzaWNrbGVIb3N0LCAnc2hvdWxkU2tpcFRzaWNrbGVQcm9jZXNzaW5nJ3wncGF0aFRvTW9kdWxlTmFtZSd8XG4gICAgICAnc2hvdWxkSWdub3JlV2FybmluZ3NGb3JQYXRoJ3wnZmlsZU5hbWVUb01vZHVsZUlkJ3wnZ29vZ21vZHVsZSd8J3VudHlwZWQnfFxuICAgICAgJ2NvbnZlcnRJbmRleEltcG9ydFNob3J0aGFuZCd8J3RyYW5zZm9ybURlY29yYXRvcnMnfCd0cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZSc+ID0ge1xuICAgIHNob3VsZFNraXBUc2lja2xlUHJvY2Vzc2luZzogKGZpbGVOYW1lKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC9cXC5kXFwudHMkLy50ZXN0KGZpbGVOYW1lKSB8fCBHRU5FUkFURURfRklMRVMudGVzdChmaWxlTmFtZSksXG4gICAgcGF0aFRvTW9kdWxlTmFtZTogKGNvbnRleHQsIGltcG9ydFBhdGgpID0+ICcnLFxuICAgIHNob3VsZElnbm9yZVdhcm5pbmdzRm9yUGF0aDogKGZpbGVQYXRoKSA9PiBmYWxzZSxcbiAgICBmaWxlTmFtZVRvTW9kdWxlSWQ6IChmaWxlTmFtZSkgPT4gZmlsZU5hbWUsXG4gICAgZ29vZ21vZHVsZTogZmFsc2UsXG4gICAgdW50eXBlZDogdHJ1ZSxcbiAgICBjb252ZXJ0SW5kZXhJbXBvcnRTaG9ydGhhbmQ6IGZhbHNlLCB0cmFuc2Zvcm1EZWNvcmF0b3JzLCB0cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZSxcbiAgfTtcblxuICByZXR1cm4gKHtcbiAgICAgICAgICAgcHJvZ3JhbSxcbiAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSxcbiAgICAgICAgICAgd3JpdGVGaWxlLFxuICAgICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbixcbiAgICAgICAgICAgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzID0ge30sXG4gICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgIG9wdGlvbnNcbiAgICAgICAgIH0pID0+XG4gICAgICAgICAgICAgdHNpY2tsZS5lbWl0V2l0aFRzaWNrbGUoXG4gICAgICAgICAgICAgICAgIHByb2dyYW0sIHsuLi50c2lja2xlSG9zdCwgb3B0aW9ucywgaG9zdH0sIGhvc3QsIG9wdGlvbnMsIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgICAgICAgICAgIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIHtcbiAgICAgICAgICAgICAgICAgICBiZWZvcmVUczogY3VzdG9tVHJhbnNmb3JtZXJzLmJlZm9yZSxcbiAgICAgICAgICAgICAgICAgICBhZnRlclRzOiBjdXN0b21UcmFuc2Zvcm1lcnMuYWZ0ZXIsXG4gICAgICAgICAgICAgICAgIH0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nY1BhcnNlZENvbmZpZ3VyYXRpb24gZXh0ZW5kcyBQYXJzZWRDb25maWd1cmF0aW9uIHsgd2F0Y2g/OiBib29sZWFuOyB9XG5cbmZ1bmN0aW9uIHJlYWROZ2NDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oYXJnczogc3RyaW5nW10pOiBOZ2NQYXJzZWRDb25maWd1cmF0aW9uIHtcbiAgY29uc3Qgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyA9IHt9O1xuICBjb25zdCBwYXJzZWRBcmdzID0gcmVxdWlyZSgnbWluaW1pc3QnKShhcmdzKTtcbiAgaWYgKHBhcnNlZEFyZ3MuaTE4bkZpbGUpIG9wdGlvbnMuaTE4bkluRmlsZSA9IHBhcnNlZEFyZ3MuaTE4bkZpbGU7XG4gIGlmIChwYXJzZWRBcmdzLmkxOG5Gb3JtYXQpIG9wdGlvbnMuaTE4bkluRm9ybWF0ID0gcGFyc2VkQXJncy5pMThuRm9ybWF0O1xuICBpZiAocGFyc2VkQXJncy5sb2NhbGUpIG9wdGlvbnMuaTE4bkluTG9jYWxlID0gcGFyc2VkQXJncy5sb2NhbGU7XG4gIGNvbnN0IG10ID0gcGFyc2VkQXJncy5taXNzaW5nVHJhbnNsYXRpb247XG4gIGlmIChtdCA9PT0gJ2Vycm9yJyB8fCBtdCA9PT0gJ3dhcm5pbmcnIHx8IG10ID09PSAnaWdub3JlJykge1xuICAgIG9wdGlvbnMuaTE4bkluTWlzc2luZ1RyYW5zbGF0aW9ucyA9IG10O1xuICB9XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oXG4gICAgICBhcmdzLCBvcHRpb25zLCBbJ2kxOG5GaWxlJywgJ2kxOG5Gb3JtYXQnLCAnbG9jYWxlJywgJ21pc3NpbmdUcmFuc2xhdGlvbicsICd3YXRjaCddKTtcbiAgY29uc3Qgd2F0Y2ggPSBwYXJzZWRBcmdzLncgfHwgcGFyc2VkQXJncy53YXRjaDtcbiAgcmV0dXJuIHsuLi5jb25maWcsIHdhdGNofTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRDb21tYW5kTGluZUFuZENvbmZpZ3VyYXRpb24oXG4gICAgYXJnczogc3RyaW5nW10sIGV4aXN0aW5nT3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyA9IHt9LFxuICAgIG5nQ21kTGluZU9wdGlvbnM6IHN0cmluZ1tdID0gW10pOiBQYXJzZWRDb25maWd1cmF0aW9uIHtcbiAgbGV0IGNtZENvbmZpZyA9IHRzLnBhcnNlQ29tbWFuZExpbmUoYXJncyk7XG4gIGNvbnN0IHByb2plY3QgPSBjbWRDb25maWcub3B0aW9ucy5wcm9qZWN0IHx8ICcuJztcbiAgY29uc3QgY21kRXJyb3JzID0gY21kQ29uZmlnLmVycm9ycy5maWx0ZXIoZSA9PiB7XG4gICAgaWYgKHR5cGVvZiBlLm1lc3NhZ2VUZXh0ID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgbXNnID0gZS5tZXNzYWdlVGV4dDtcbiAgICAgIHJldHVybiAhbmdDbWRMaW5lT3B0aW9ucy5zb21lKG8gPT4gbXNnLmluZGV4T2YobykgPj0gMCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgaWYgKGNtZEVycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcHJvamVjdCxcbiAgICAgIHJvb3ROYW1lczogW10sXG4gICAgICBvcHRpb25zOiBjbWRDb25maWcub3B0aW9ucyxcbiAgICAgIGVycm9yczogY21kRXJyb3JzLFxuICAgICAgZW1pdEZsYWdzOiBhcGkuRW1pdEZsYWdzLkRlZmF1bHRcbiAgICB9O1xuICB9XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzOiBEaWFnbm9zdGljcyA9IFtdO1xuICBjb25zdCBjb25maWcgPSByZWFkQ29uZmlndXJhdGlvbihwcm9qZWN0LCBjbWRDb25maWcub3B0aW9ucyk7XG4gIGNvbnN0IG9wdGlvbnMgPSB7Li4uY29uZmlnLm9wdGlvbnMsIC4uLmV4aXN0aW5nT3B0aW9uc307XG4gIGlmIChvcHRpb25zLmxvY2FsZSkge1xuICAgIG9wdGlvbnMuaTE4bkluTG9jYWxlID0gb3B0aW9ucy5sb2NhbGU7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBwcm9qZWN0LFxuICAgIHJvb3ROYW1lczogY29uZmlnLnJvb3ROYW1lcywgb3B0aW9ucyxcbiAgICBlcnJvcnM6IGNvbmZpZy5lcnJvcnMsXG4gICAgZW1pdEZsYWdzOiBjb25maWcuZW1pdEZsYWdzXG4gIH07XG59XG5cbmZ1bmN0aW9uIHJlcG9ydEVycm9yc0FuZEV4aXQoXG4gICAgYWxsRGlhZ25vc3RpY3M6IERpYWdub3N0aWNzLCBvcHRpb25zPzogYXBpLkNvbXBpbGVyT3B0aW9ucyxcbiAgICBjb25zb2xlRXJyb3I6IChzOiBzdHJpbmcpID0+IHZvaWQgPSBjb25zb2xlLmVycm9yKTogbnVtYmVyIHtcbiAgY29uc3QgZXJyb3JzQW5kV2FybmluZ3MgPSBmaWx0ZXJFcnJvcnNBbmRXYXJuaW5ncyhhbGxEaWFnbm9zdGljcyk7XG4gIGlmIChlcnJvcnNBbmRXYXJuaW5ncy5sZW5ndGgpIHtcbiAgICBsZXQgY3VycmVudERpciA9IG9wdGlvbnMgPyBvcHRpb25zLmJhc2VQYXRoIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IGZvcm1hdEhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6ICgpID0+IGN1cnJlbnREaXIgfHwgdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgICAgIGdldENhbm9uaWNhbEZpbGVOYW1lOiBmaWxlTmFtZSA9PiBmaWxlTmFtZSxcbiAgICAgIGdldE5ld0xpbmU6ICgpID0+IHRzLnN5cy5uZXdMaW5lXG4gICAgfTtcbiAgICBjb25zb2xlRXJyb3IoZm9ybWF0RGlhZ25vc3RpY3MoZXJyb3JzQW5kV2FybmluZ3MsIGZvcm1hdEhvc3QpKTtcbiAgfVxuICByZXR1cm4gZXhpdENvZGVGcm9tUmVzdWx0KGFsbERpYWdub3N0aWNzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoTW9kZShcbiAgICBwcm9qZWN0OiBzdHJpbmcsIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMsIGNvbnNvbGVFcnJvcjogKHM6IHN0cmluZykgPT4gdm9pZCkge1xuICByZXR1cm4gcGVyZm9ybVdhdGNoQ29tcGlsYXRpb24oY3JlYXRlUGVyZm9ybVdhdGNoSG9zdChwcm9qZWN0LCBkaWFnbm9zdGljcyA9PiB7XG4gICAgY29uc29sZUVycm9yKGZvcm1hdERpYWdub3N0aWNzKGRpYWdub3N0aWNzKSk7XG4gIH0sIG9wdGlvbnMsIG9wdGlvbnMgPT4gY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnMpKSk7XG59XG5cbi8vIENMSSBlbnRyeSBwb2ludFxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIGNvbnN0IGFyZ3MgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gIHByb2Nlc3MuZXhpdENvZGUgPSBtYWluKGFyZ3MpO1xufVxuIl19