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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBVUEsNEJBQTBCO0lBRTFCLCtCQUFpQztJQUdqQywyRUFBNEQ7SUFDNUQsZ0VBQTBDO0lBQzFDLG9FQUFvRDtJQUVwRCw2RUFBb007SUFDcE0seUVBQWdGO0lBRWhGLFNBQWdCLElBQUksQ0FDaEIsSUFBYyxFQUFFLFlBQWlELEVBQ2pFLE1BQStCO1FBRGYsNkJBQUEsRUFBQSxlQUFvQyxPQUFPLENBQUMsS0FBSztRQUUvRCxJQUFBLHVEQUNrRCxFQURqRCxvQkFBTyxFQUFFLHdCQUFTLEVBQUUsb0JBQU8sRUFBRSx3QkFBb0IsRUFBRSxnQkFBSyxFQUFFLHdCQUNULENBQUM7UUFDdkQsSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFO1lBQ3ZCLE9BQU8sbUJBQW1CLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDL0U7UUFDRCxJQUFJLEtBQUssRUFBRTtZQUNULElBQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3pELE9BQU8sbUJBQW1CLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztTQUM5RTtRQUNNLElBQUEsNEtBQXlCLENBQ2dEO1FBQ2hGLE9BQU8sbUJBQW1CLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBZkQsb0JBZUM7SUFHRCxTQUFTLGtCQUFrQixDQUFDLE9BQTRCO1FBQ3RELElBQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLFNBQVMsS0FBSyxPQUFPLElBQUksT0FBTyxDQUFDLFNBQVMsS0FBSyxLQUFLO1lBQ3BGLE9BQU8sQ0FBQyxhQUFhLEtBQUssWUFBWSxDQUFDO1FBQzNDLElBQU0sdUJBQXVCLEdBQUcsT0FBTyxDQUFDLDBCQUEwQixDQUFDO1FBQ25FLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLHVCQUF1QixFQUFFO1lBQ3BELE9BQU8sU0FBUyxDQUFDO1NBQ2xCO1FBQ0QsSUFBSSxtQkFBbUIsRUFBRTtZQUN2QixtRkFBbUY7WUFDbkYsaUVBQWlFO1lBQ2pFLG1DQUFtQztZQUNuQyxPQUFPLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDO1NBQ3RDO1FBQ0QsSUFBTSxXQUFXLEdBR29FO1lBQ25GLDJCQUEyQixFQUFFLFVBQUMsUUFBUTtnQkFDTCxPQUFBLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksc0JBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQTNELENBQTJEO1lBQzVGLGdCQUFnQixFQUFFLFVBQUMsT0FBTyxFQUFFLFVBQVUsSUFBSyxPQUFBLEVBQUUsRUFBRixDQUFFO1lBQzdDLDJCQUEyQixFQUFFLFVBQUMsUUFBUSxJQUFLLE9BQUEsS0FBSyxFQUFMLENBQUs7WUFDaEQsa0JBQWtCLEVBQUUsVUFBQyxRQUFRLElBQUssT0FBQSxRQUFRLEVBQVIsQ0FBUTtZQUMxQyxVQUFVLEVBQUUsS0FBSztZQUNqQixPQUFPLEVBQUUsSUFBSTtZQUNiLDJCQUEyQixFQUFFLEtBQUssRUFBRSxtQkFBbUIscUJBQUEsRUFBRSx1QkFBdUIseUJBQUE7U0FDakYsQ0FBQztRQUVGLElBQUksT0FBTyxDQUFDLDBCQUEwQixJQUFJLE9BQU8sQ0FBQyxhQUFhLEtBQUssZUFBZSxFQUFFO1lBQ25GLE9BQU8sVUFBQyxFQVNBO29CQVJDLG9CQUFPLEVBQ1Asc0NBQWdCLEVBQ2hCLHdCQUFTLEVBQ1Qsd0NBQWlCLEVBQ2pCLHNDQUFnQixFQUNoQiwwQkFBdUIsRUFBdkIsNENBQXVCLEVBQ3ZCLGNBQUksRUFDSixvQkFBTztnQkFFTCxrRkFBa0Y7Z0JBQ3pGLE9BQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGVBQWUsQ0FDOUIsT0FBTyx1QkFBTSxXQUFXLElBQUUsT0FBTyxTQUFBLEVBQUUsSUFBSSxNQUFBLEtBQUcsSUFBSSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQ3BGLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFO29CQUNuQyxRQUFRLEVBQUUsa0JBQWtCLENBQUMsTUFBTTtvQkFDbkMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLEtBQUs7aUJBQ2xDLENBQUM7WUFMTixDQUtNLENBQUM7U0FDWjthQUFNO1lBQ0wsT0FBTyxVQUFDLEVBT0E7b0JBTkMsb0JBQU8sRUFDUCxzQ0FBZ0IsRUFDaEIsd0JBQVMsRUFDVCx3Q0FBaUIsRUFDakIsc0NBQWdCLEVBQ2hCLDBCQUF1QixFQUF2Qiw0Q0FBdUI7Z0JBRXJCLE9BQUEsT0FBTyxDQUFDLElBQUksQ0FDUixnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQ2hFLEVBQUMsS0FBSyxFQUFFLGtCQUFrQixDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxFQUFDLENBQUM7WUFGekUsQ0FFeUUsQ0FBQztTQUN0RjtJQUNILENBQUM7SUFJRCxTQUFTLGtDQUFrQyxDQUFDLElBQWM7UUFDeEQsSUFBTSxPQUFPLEdBQXdCLEVBQUUsQ0FBQztRQUN4QyxJQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxVQUFVLENBQUMsUUFBUTtZQUFFLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQztRQUNsRSxJQUFJLFVBQVUsQ0FBQyxVQUFVO1lBQUUsT0FBTyxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDO1FBQ3hFLElBQUksVUFBVSxDQUFDLE1BQU07WUFBRSxPQUFPLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDaEUsSUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixDQUFDO1FBQ3pDLElBQUksRUFBRSxLQUFLLE9BQU8sSUFBSSxFQUFFLEtBQUssU0FBUyxJQUFJLEVBQUUsS0FBSyxRQUFRLEVBQUU7WUFDekQsT0FBTyxDQUFDLHlCQUF5QixHQUFHLEVBQUUsQ0FBQztTQUN4QztRQUNELElBQU0sTUFBTSxHQUFHLCtCQUErQixDQUMxQyxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN4RixJQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDL0MsNEJBQVcsTUFBTSxJQUFFLEtBQUssT0FBQSxJQUFFO0lBQzVCLENBQUM7SUFFRCxTQUFnQiwrQkFBK0IsQ0FDM0MsSUFBYyxFQUFFLGVBQXlDLEVBQ3pELGdCQUErQjtRQURmLGdDQUFBLEVBQUEsb0JBQXlDO1FBQ3pELGlDQUFBLEVBQUEscUJBQStCO1FBQ2pDLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQyxJQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUM7UUFDakQsSUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBQSxDQUFDO1lBQ3pDLElBQUksT0FBTyxDQUFDLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRTtnQkFDckMsSUFBTSxLQUFHLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQztnQkFDMUIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLEtBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFuQixDQUFtQixDQUFDLENBQUM7YUFDekQ7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFO1lBQ3BCLE9BQU87Z0JBQ0wsT0FBTyxTQUFBO2dCQUNQLFNBQVMsRUFBRSxFQUFFO2dCQUNiLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTztnQkFDMUIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU87YUFDakMsQ0FBQztTQUNIO1FBQ0QsSUFBTSxjQUFjLEdBQWdCLEVBQUUsQ0FBQztRQUN2QyxJQUFNLE1BQU0sR0FBRyxtQ0FBaUIsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdELElBQU0sT0FBTyx3QkFBTyxNQUFNLENBQUMsT0FBTyxFQUFLLGVBQWUsQ0FBQyxDQUFDO1FBQ3hELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNsQixPQUFPLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7U0FDdkM7UUFDRCxPQUFPO1lBQ0wsT0FBTyxTQUFBO1lBQ1AsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsT0FBTyxTQUFBO1lBQ3BDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNyQixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7U0FDNUIsQ0FBQztJQUNKLENBQUM7SUFqQ0QsMEVBaUNDO0lBRUQsU0FBUyxtQkFBbUIsQ0FDeEIsY0FBMkIsRUFBRSxPQUE2QixFQUMxRCxZQUFpRDtRQUFqRCw2QkFBQSxFQUFBLGVBQW9DLE9BQU8sQ0FBQyxLQUFLO1FBQ25ELElBQU0saUJBQWlCLEdBQUcseUNBQXVCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbEUsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEVBQUU7WUFDNUIsSUFBSSxZQUFVLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFDeEQsSUFBTSxVQUFVLEdBQTZCO2dCQUMzQyxtQkFBbUIsRUFBRSxjQUFNLE9BQUEsWUFBVSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsRUFBMUMsQ0FBMEM7Z0JBQ3JFLG9CQUFvQixFQUFFLFVBQUEsUUFBUSxJQUFJLE9BQUEsUUFBUSxFQUFSLENBQVE7Z0JBQzFDLFVBQVUsRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQWQsQ0FBYzthQUNqQyxDQUFDO1lBQ0YsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxLQUFLLElBQUksSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLE9BQU8sQ0FBQyxFQUFFO2dCQUM1RSxJQUFNLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNuRSxJQUFNLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNuRSxZQUFZLENBQUMscUNBQXVCLENBQ2hDLEVBQUUsQ0FBQyxvQ0FBb0MsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN6RSxZQUFZLENBQUMsbUNBQWlCLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7YUFDNUQ7aUJBQU07Z0JBQ0wsWUFBWSxDQUFDLG1DQUFpQixDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7YUFDaEU7U0FDRjtRQUNELE9BQU8sb0NBQWtCLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELFNBQWdCLFNBQVMsQ0FDckIsT0FBZSxFQUFFLE9BQTRCLEVBQUUsWUFBaUM7UUFDbEYsT0FBTyx1Q0FBdUIsQ0FBQyxzQ0FBc0IsQ0FBQyxPQUFPLEVBQUUsVUFBQSxXQUFXO1lBQ3hFLFlBQVksQ0FBQyxtQ0FBaUIsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsRUFBRSxPQUFPLEVBQUUsVUFBQSxPQUFPLElBQUksT0FBQSxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsRUFBM0IsQ0FBMkIsQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUxELDhCQUtDO0lBRUQsa0JBQWtCO0lBQ2xCLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7UUFDM0IsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsT0FBTyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDL0IiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIE11c3QgYmUgaW1wb3J0ZWQgZmlyc3QsIGJlY2F1c2UgQW5ndWxhciBkZWNvcmF0b3JzIHRocm93IG9uIGxvYWQuXG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIHRzaWNrbGUgZnJvbSAndHNpY2tsZSc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4vbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge0dFTkVSQVRFRF9GSUxFU30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmltcG9ydCB7ZXhpdENvZGVGcm9tUmVzdWx0LCBwZXJmb3JtQ29tcGlsYXRpb24sIHJlYWRDb25maWd1cmF0aW9uLCBmb3JtYXREaWFnbm9zdGljcywgRGlhZ25vc3RpY3MsIFBhcnNlZENvbmZpZ3VyYXRpb24sIFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCwgZmlsdGVyRXJyb3JzQW5kV2FybmluZ3N9IGZyb20gJy4vcGVyZm9ybV9jb21waWxlJztcbmltcG9ydCB7cGVyZm9ybVdhdGNoQ29tcGlsYXRpb24swqBjcmVhdGVQZXJmb3JtV2F0Y2hIb3N0fSBmcm9tICcuL3BlcmZvcm1fd2F0Y2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbihcbiAgICBhcmdzOiBzdHJpbmdbXSwgY29uc29sZUVycm9yOiAoczogc3RyaW5nKSA9PiB2b2lkID0gY29uc29sZS5lcnJvcixcbiAgICBjb25maWc/OiBOZ2NQYXJzZWRDb25maWd1cmF0aW9uKTogbnVtYmVyIHtcbiAgbGV0IHtwcm9qZWN0LCByb290TmFtZXMsIG9wdGlvbnMsIGVycm9yczogY29uZmlnRXJyb3JzLCB3YXRjaCwgZW1pdEZsYWdzfSA9XG4gICAgICBjb25maWcgfHwgcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzKTtcbiAgaWYgKGNvbmZpZ0Vycm9ycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gcmVwb3J0RXJyb3JzQW5kRXhpdChjb25maWdFcnJvcnMsIC8qb3B0aW9ucyovIHVuZGVmaW5lZCwgY29uc29sZUVycm9yKTtcbiAgfVxuICBpZiAod2F0Y2gpIHtcbiAgICBjb25zdCByZXN1bHQgPSB3YXRjaE1vZGUocHJvamVjdCwgb3B0aW9ucywgY29uc29sZUVycm9yKTtcbiAgICByZXR1cm4gcmVwb3J0RXJyb3JzQW5kRXhpdChyZXN1bHQuZmlyc3RDb21waWxlUmVzdWx0LCBvcHRpb25zLCBjb25zb2xlRXJyb3IpO1xuICB9XG4gIGNvbnN0IHtkaWFnbm9zdGljczogY29tcGlsZURpYWdzfSA9IHBlcmZvcm1Db21waWxhdGlvbihcbiAgICAgIHtyb290TmFtZXMsIG9wdGlvbnMsIGVtaXRGbGFncywgZW1pdENhbGxiYWNrOiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucyl9KTtcbiAgcmV0dXJuIHJlcG9ydEVycm9yc0FuZEV4aXQoY29tcGlsZURpYWdzLCBvcHRpb25zLCBjb25zb2xlRXJyb3IpO1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKTogYXBpLlRzRW1pdENhbGxiYWNrfHVuZGVmaW5lZCB7XG4gIGNvbnN0IHRyYW5zZm9ybURlY29yYXRvcnMgPSBvcHRpb25zLmVuYWJsZUl2eSAhPT0gJ25ndHNjJyAmJiBvcHRpb25zLmVuYWJsZUl2eSAhPT0gJ3RzYycgJiZcbiAgICAgIG9wdGlvbnMuYW5ub3RhdGlvbnNBcyAhPT0gJ2RlY29yYXRvcnMnO1xuICBjb25zdCB0cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZSA9IG9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI7XG4gIGlmICghdHJhbnNmb3JtRGVjb3JhdG9ycyAmJiAhdHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGlmICh0cmFuc2Zvcm1EZWNvcmF0b3JzKSB7XG4gICAgLy8gVGhpcyBpcyBuZWVkZWQgYXMgYSB3b3JrYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci90c2lja2xlL2lzc3Vlcy82MzVcbiAgICAvLyBPdGhlcndpc2UgdHNpY2tsZSBtaWdodCBlbWl0IHJlZmVyZW5jZXMgdG8gbm9uIGltcG9ydGVkIHZhbHVlc1xuICAgIC8vIGFzIFR5cGVTY3JpcHQgZWxpZGVkIHRoZSBpbXBvcnQuXG4gICAgb3B0aW9ucy5lbWl0RGVjb3JhdG9yTWV0YWRhdGEgPSB0cnVlO1xuICB9XG4gIGNvbnN0IHRzaWNrbGVIb3N0OiBQaWNrPFxuICAgICAgdHNpY2tsZS5Uc2lja2xlSG9zdCwgJ3Nob3VsZFNraXBUc2lja2xlUHJvY2Vzc2luZyd8J3BhdGhUb01vZHVsZU5hbWUnfFxuICAgICAgJ3Nob3VsZElnbm9yZVdhcm5pbmdzRm9yUGF0aCd8J2ZpbGVOYW1lVG9Nb2R1bGVJZCd8J2dvb2dtb2R1bGUnfCd1bnR5cGVkJ3xcbiAgICAgICdjb252ZXJ0SW5kZXhJbXBvcnRTaG9ydGhhbmQnfCd0cmFuc2Zvcm1EZWNvcmF0b3JzJ3wndHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUnPiA9IHtcbiAgICBzaG91bGRTa2lwVHNpY2tsZVByb2Nlc3Npbmc6IChmaWxlTmFtZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvXFwuZFxcLnRzJC8udGVzdChmaWxlTmFtZSkgfHwgR0VORVJBVEVEX0ZJTEVTLnRlc3QoZmlsZU5hbWUpLFxuICAgIHBhdGhUb01vZHVsZU5hbWU6IChjb250ZXh0LCBpbXBvcnRQYXRoKSA9PiAnJyxcbiAgICBzaG91bGRJZ25vcmVXYXJuaW5nc0ZvclBhdGg6IChmaWxlUGF0aCkgPT4gZmFsc2UsXG4gICAgZmlsZU5hbWVUb01vZHVsZUlkOiAoZmlsZU5hbWUpID0+IGZpbGVOYW1lLFxuICAgIGdvb2dtb2R1bGU6IGZhbHNlLFxuICAgIHVudHlwZWQ6IHRydWUsXG4gICAgY29udmVydEluZGV4SW1wb3J0U2hvcnRoYW5kOiBmYWxzZSwgdHJhbnNmb3JtRGVjb3JhdG9ycywgdHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUsXG4gIH07XG5cbiAgaWYgKG9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgfHwgb3B0aW9ucy5hbm5vdGF0aW9uc0FzID09PSAnc3RhdGljIGZpZWxkcycpIHtcbiAgICByZXR1cm4gKHtcbiAgICAgICAgICAgICBwcm9ncmFtLFxuICAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgICAgICAgd3JpdGVGaWxlLFxuICAgICAgICAgICAgIGNhbmNlbGxhdGlvblRva2VuLFxuICAgICAgICAgICAgIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzID0ge30sXG4gICAgICAgICAgICAgaG9zdCxcbiAgICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICAgIH0pID0+XG4gICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tcmVxdWlyZS1pbXBvcnRzIG9ubHkgZGVwZW5kIG9uIHRzaWNrbGUgaWYgcmVxdWVzdGVkXG4gICAgICAgIHJlcXVpcmUoJ3RzaWNrbGUnKS5lbWl0V2l0aFRzaWNrbGUoXG4gICAgICAgICAgICBwcm9ncmFtLCB7Li4udHNpY2tsZUhvc3QsIG9wdGlvbnMsIGhvc3R9LCBob3N0LCBvcHRpb25zLCB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsXG4gICAgICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcywge1xuICAgICAgICAgICAgICBiZWZvcmVUczogY3VzdG9tVHJhbnNmb3JtZXJzLmJlZm9yZSxcbiAgICAgICAgICAgICAgYWZ0ZXJUczogY3VzdG9tVHJhbnNmb3JtZXJzLmFmdGVyLFxuICAgICAgICAgICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICh7XG4gICAgICAgICAgICAgcHJvZ3JhbSxcbiAgICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLFxuICAgICAgICAgICAgIHdyaXRlRmlsZSxcbiAgICAgICAgICAgICBjYW5jZWxsYXRpb25Ub2tlbixcbiAgICAgICAgICAgICBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgIGN1c3RvbVRyYW5zZm9ybWVycyA9IHt9LFxuICAgICAgICAgICB9KSA9PlxuICAgICAgICAgICAgICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgICAgICAgICAgICAge2FmdGVyOiBjdXN0b21UcmFuc2Zvcm1lcnMuYWZ0ZXIsIGJlZm9yZTogY3VzdG9tVHJhbnNmb3JtZXJzLmJlZm9yZX0pO1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmdjUGFyc2VkQ29uZmlndXJhdGlvbiBleHRlbmRzIFBhcnNlZENvbmZpZ3VyYXRpb24geyB3YXRjaD86IGJvb2xlYW47IH1cblxuZnVuY3Rpb24gcmVhZE5nY0NvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihhcmdzOiBzdHJpbmdbXSk6IE5nY1BhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBjb25zdCBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zID0ge307XG4gIGNvbnN0IHBhcnNlZEFyZ3MgPSByZXF1aXJlKCdtaW5pbWlzdCcpKGFyZ3MpO1xuICBpZiAocGFyc2VkQXJncy5pMThuRmlsZSkgb3B0aW9ucy5pMThuSW5GaWxlID0gcGFyc2VkQXJncy5pMThuRmlsZTtcbiAgaWYgKHBhcnNlZEFyZ3MuaTE4bkZvcm1hdCkgb3B0aW9ucy5pMThuSW5Gb3JtYXQgPSBwYXJzZWRBcmdzLmkxOG5Gb3JtYXQ7XG4gIGlmIChwYXJzZWRBcmdzLmxvY2FsZSkgb3B0aW9ucy5pMThuSW5Mb2NhbGUgPSBwYXJzZWRBcmdzLmxvY2FsZTtcbiAgY29uc3QgbXQgPSBwYXJzZWRBcmdzLm1pc3NpbmdUcmFuc2xhdGlvbjtcbiAgaWYgKG10ID09PSAnZXJyb3InIHx8IG10ID09PSAnd2FybmluZycgfHwgbXQgPT09ICdpZ25vcmUnKSB7XG4gICAgb3B0aW9ucy5pMThuSW5NaXNzaW5nVHJhbnNsYXRpb25zID0gbXQ7XG4gIH1cbiAgY29uc3QgY29uZmlnID0gcmVhZENvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihcbiAgICAgIGFyZ3MsIG9wdGlvbnMsIFsnaTE4bkZpbGUnLCAnaTE4bkZvcm1hdCcsICdsb2NhbGUnLCAnbWlzc2luZ1RyYW5zbGF0aW9uJywgJ3dhdGNoJ10pO1xuICBjb25zdCB3YXRjaCA9IHBhcnNlZEFyZ3MudyB8fCBwYXJzZWRBcmdzLndhdGNoO1xuICByZXR1cm4gey4uLmNvbmZpZywgd2F0Y2h9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbW1hbmRMaW5lQW5kQ29uZmlndXJhdGlvbihcbiAgICBhcmdzOiBzdHJpbmdbXSwgZXhpc3RpbmdPcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zID0ge30sXG4gICAgbmdDbWRMaW5lT3B0aW9uczogc3RyaW5nW10gPSBbXSk6IFBhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBsZXQgY21kQ29uZmlnID0gdHMucGFyc2VDb21tYW5kTGluZShhcmdzKTtcbiAgY29uc3QgcHJvamVjdCA9IGNtZENvbmZpZy5vcHRpb25zLnByb2plY3QgfHwgJy4nO1xuICBjb25zdCBjbWRFcnJvcnMgPSBjbWRDb25maWcuZXJyb3JzLmZpbHRlcihlID0+IHtcbiAgICBpZiAodHlwZW9mIGUubWVzc2FnZVRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCBtc2cgPSBlLm1lc3NhZ2VUZXh0O1xuICAgICAgcmV0dXJuICFuZ0NtZExpbmVPcHRpb25zLnNvbWUobyA9PiBtc2cuaW5kZXhPZihvKSA+PSAwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICBpZiAoY21kRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0LFxuICAgICAgcm9vdE5hbWVzOiBbXSxcbiAgICAgIG9wdGlvbnM6IGNtZENvbmZpZy5vcHRpb25zLFxuICAgICAgZXJyb3JzOiBjbWRFcnJvcnMsXG4gICAgICBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3MuRGVmYXVsdFxuICAgIH07XG4gIH1cbiAgY29uc3QgYWxsRGlhZ25vc3RpY3M6IERpYWdub3N0aWNzID0gW107XG4gIGNvbnN0IGNvbmZpZyA9IHJlYWRDb25maWd1cmF0aW9uKHByb2plY3QsIGNtZENvbmZpZy5vcHRpb25zKTtcbiAgY29uc3Qgb3B0aW9ucyA9IHsuLi5jb25maWcub3B0aW9ucywgLi4uZXhpc3RpbmdPcHRpb25zfTtcbiAgaWYgKG9wdGlvbnMubG9jYWxlKSB7XG4gICAgb3B0aW9ucy5pMThuSW5Mb2NhbGUgPSBvcHRpb25zLmxvY2FsZTtcbiAgfVxuICByZXR1cm4ge1xuICAgIHByb2plY3QsXG4gICAgcm9vdE5hbWVzOiBjb25maWcucm9vdE5hbWVzLCBvcHRpb25zLFxuICAgIGVycm9yczogY29uZmlnLmVycm9ycyxcbiAgICBlbWl0RmxhZ3M6IGNvbmZpZy5lbWl0RmxhZ3NcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVwb3J0RXJyb3JzQW5kRXhpdChcbiAgICBhbGxEaWFnbm9zdGljczogRGlhZ25vc3RpY3MsIG9wdGlvbnM/OiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgIGNvbnNvbGVFcnJvcjogKHM6IHN0cmluZykgPT4gdm9pZCA9IGNvbnNvbGUuZXJyb3IpOiBudW1iZXIge1xuICBjb25zdCBlcnJvcnNBbmRXYXJuaW5ncyA9IGZpbHRlckVycm9yc0FuZFdhcm5pbmdzKGFsbERpYWdub3N0aWNzKTtcbiAgaWYgKGVycm9yc0FuZFdhcm5pbmdzLmxlbmd0aCkge1xuICAgIGxldCBjdXJyZW50RGlyID0gb3B0aW9ucyA/IG9wdGlvbnMuYmFzZVBhdGggOiB1bmRlZmluZWQ7XG4gICAgY29uc3QgZm9ybWF0SG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICAgICAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gY3VycmVudERpciB8fCB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICAgICAgZ2V0TmV3TGluZTogKCkgPT4gdHMuc3lzLm5ld0xpbmVcbiAgICB9O1xuICAgIGlmIChvcHRpb25zICYmIChvcHRpb25zLmVuYWJsZUl2eSA9PT0gdHJ1ZSB8fCBvcHRpb25zLmVuYWJsZUl2eSA9PT0gJ25ndHNjJykpIHtcbiAgICAgIGNvbnN0IG5nRGlhZ25vc3RpY3MgPSBlcnJvcnNBbmRXYXJuaW5ncy5maWx0ZXIoYXBpLmlzTmdEaWFnbm9zdGljKTtcbiAgICAgIGNvbnN0IHRzRGlhZ25vc3RpY3MgPSBlcnJvcnNBbmRXYXJuaW5ncy5maWx0ZXIoYXBpLmlzVHNEaWFnbm9zdGljKTtcbiAgICAgIGNvbnNvbGVFcnJvcihyZXBsYWNlVHNXaXRoTmdJbkVycm9ycyhcbiAgICAgICAgICB0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQodHNEaWFnbm9zdGljcywgZm9ybWF0SG9zdCkpKTtcbiAgICAgIGNvbnNvbGVFcnJvcihmb3JtYXREaWFnbm9zdGljcyhuZ0RpYWdub3N0aWNzLCBmb3JtYXRIb3N0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGVFcnJvcihmb3JtYXREaWFnbm9zdGljcyhlcnJvcnNBbmRXYXJuaW5ncywgZm9ybWF0SG9zdCkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZXhpdENvZGVGcm9tUmVzdWx0KGFsbERpYWdub3N0aWNzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoTW9kZShcbiAgICBwcm9qZWN0OiBzdHJpbmcsIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMsIGNvbnNvbGVFcnJvcjogKHM6IHN0cmluZykgPT4gdm9pZCkge1xuICByZXR1cm4gcGVyZm9ybVdhdGNoQ29tcGlsYXRpb24oY3JlYXRlUGVyZm9ybVdhdGNoSG9zdChwcm9qZWN0LCBkaWFnbm9zdGljcyA9PiB7XG4gICAgY29uc29sZUVycm9yKGZvcm1hdERpYWdub3N0aWNzKGRpYWdub3N0aWNzKSk7XG4gIH0sIG9wdGlvbnMsIG9wdGlvbnMgPT4gY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnMpKSk7XG59XG5cbi8vIENMSSBlbnRyeSBwb2ludFxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIGNvbnN0IGFyZ3MgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gIHByb2Nlc3MuZXhpdENvZGUgPSBtYWluKGFyZ3MpO1xufVxuIl19