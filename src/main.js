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
        warnForDeprecatedOptions(options);
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
    function warnForDeprecatedOptions(options) {
        if (options.i18nLegacyMessageIdFormat !== undefined) {
            console.warn('The `i18nLegacyMessageIdFormat` option is deprecated.\n' +
                'Migrate your legacy translation files to the new `$localize` message id format and remove this option.');
        }
    }
    // CLI entry point
    if (require.main === module) {
        var args = process.argv.slice(2);
        // We are running the real compiler so run against the real file-system
        file_system_1.setFileSystem(new file_system_1.NodeJSFileSystem());
        process.exitCode = main(args);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0E7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsb0VBQW9FO0lBQ3BFLDRCQUEwQjtJQUUxQiwrQkFBaUM7SUFHakMsMkVBQTREO0lBQzVELGdFQUEwQztJQUMxQyxvRUFBb0Q7SUFFcEQsNkVBQTBLO0lBQzFLLHlFQUFnRjtJQUNoRiwyRUFBb0U7SUFFcEUsU0FBZ0IsSUFBSSxDQUNoQixJQUFjLEVBQUUsWUFBaUQsRUFDakUsTUFBK0IsRUFBRSxrQkFBMkMsRUFBRSxZQUU3RSxFQUNELHFCQUF5QztRQUp6Qiw2QkFBQSxFQUFBLGVBQW9DLE9BQU8sQ0FBQyxLQUFLO1FBSy9ELElBQUEsdURBQ2tELEVBRGpELG9CQUFPLEVBQUUsd0JBQVMsRUFBRSxvQkFBTyxFQUFFLHdCQUFvQixFQUFFLGdCQUFLLEVBQUUsd0JBQ1QsQ0FBQztRQUN2RCxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUU7WUFDdkIsT0FBTyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztTQUMvRTtRQUNELHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLElBQUksS0FBSyxFQUFFO1lBQ1QsSUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDekQsT0FBTyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQzlFO1FBRUQsSUFBSSxVQUFpQyxDQUFDO1FBQ3RDLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRTtZQUM5QixVQUFVLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQztTQUNuQztRQUVLLElBQUE7Ozs7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QyxPQUFPLENBQUMsRUFBM0IsQ0FBMkIsQ0FBQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUxELDhCQUtDO0lBRUQsU0FBUyx3QkFBd0IsQ0FBQyxPQUE0QjtRQUM1RCxJQUFJLE9BQU8sQ0FBQyx5QkFBeUIsS0FBSyxTQUFTLEVBQUU7WUFDbkQsT0FBTyxDQUFDLElBQUksQ0FDUix5REFBeUQ7Z0JBQ3pELHdHQUF3RyxDQUFDLENBQUM7U0FDL0c7SUFDSCxDQUFDO0lBRUQsa0JBQWtCO0lBQ2xCLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7UUFDM0IsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsdUVBQXVFO1FBQ3ZFLDJCQUFhLENBQUMsSUFBSSw4QkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDdEMsT0FBTyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDL0IiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vIE11c3QgYmUgaW1wb3J0ZWQgZmlyc3QsIGJlY2F1c2UgQW5ndWxhciBkZWNvcmF0b3JzIHRocm93IG9uIGxvYWQuXG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIHRzaWNrbGUgZnJvbSAndHNpY2tsZSc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4vbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge0dFTkVSQVRFRF9GSUxFU30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmltcG9ydCB7ZXhpdENvZGVGcm9tUmVzdWx0LCBwZXJmb3JtQ29tcGlsYXRpb24sIHJlYWRDb25maWd1cmF0aW9uLCBmb3JtYXREaWFnbm9zdGljcywgRGlhZ25vc3RpY3MsIFBhcnNlZENvbmZpZ3VyYXRpb24sIGZpbHRlckVycm9yc0FuZFdhcm5pbmdzfSBmcm9tICcuL3BlcmZvcm1fY29tcGlsZSc7XG5pbXBvcnQge3BlcmZvcm1XYXRjaENvbXBpbGF0aW9uLMKgY3JlYXRlUGVyZm9ybVdhdGNoSG9zdH0gZnJvbSAnLi9wZXJmb3JtX3dhdGNoJztcbmltcG9ydCB7Tm9kZUpTRmlsZVN5c3RlbSwgc2V0RmlsZVN5c3RlbX0gZnJvbSAnLi9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluKFxuICAgIGFyZ3M6IHN0cmluZ1tdLCBjb25zb2xlRXJyb3I6IChzOiBzdHJpbmcpID0+IHZvaWQgPSBjb25zb2xlLmVycm9yLFxuICAgIGNvbmZpZz86IE5nY1BhcnNlZENvbmZpZ3VyYXRpb24sIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMsIHByb2dyYW1SZXVzZT86IHtcbiAgICAgIHByb2dyYW06IGFwaS5Qcm9ncmFtIHwgdW5kZWZpbmVkLFxuICAgIH0sXG4gICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzPzogU2V0PHN0cmluZz58IG51bGwpOiBudW1iZXIge1xuICBsZXQge3Byb2plY3QsIHJvb3ROYW1lcywgb3B0aW9ucywgZXJyb3JzOiBjb25maWdFcnJvcnMsIHdhdGNoLCBlbWl0RmxhZ3N9ID1cbiAgICAgIGNvbmZpZyB8fCByZWFkTmdjQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKGFyZ3MpO1xuICBpZiAoY29uZmlnRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiByZXBvcnRFcnJvcnNBbmRFeGl0KGNvbmZpZ0Vycm9ycywgLypvcHRpb25zKi8gdW5kZWZpbmVkLCBjb25zb2xlRXJyb3IpO1xuICB9XG4gIHdhcm5Gb3JEZXByZWNhdGVkT3B0aW9ucyhvcHRpb25zKTtcbiAgaWYgKHdhdGNoKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gd2F0Y2hNb2RlKHByb2plY3QsIG9wdGlvbnMsIGNvbnNvbGVFcnJvcik7XG4gICAgcmV0dXJuIHJlcG9ydEVycm9yc0FuZEV4aXQocmVzdWx0LmZpcnN0Q29tcGlsZVJlc3VsdCwgb3B0aW9ucywgY29uc29sZUVycm9yKTtcbiAgfVxuXG4gIGxldCBvbGRQcm9ncmFtOiBhcGkuUHJvZ3JhbXx1bmRlZmluZWQ7XG4gIGlmIChwcm9ncmFtUmV1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgIG9sZFByb2dyYW0gPSBwcm9ncmFtUmV1c2UucHJvZ3JhbTtcbiAgfVxuXG4gIGNvbnN0IHtkaWFnbm9zdGljczogY29tcGlsZURpYWdzLCBwcm9ncmFtfSA9IHBlcmZvcm1Db21waWxhdGlvbih7XG4gICAgcm9vdE5hbWVzLFxuICAgIG9wdGlvbnMsXG4gICAgZW1pdEZsYWdzLFxuICAgIG9sZFByb2dyYW0sXG4gICAgZW1pdENhbGxiYWNrOiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucyksIGN1c3RvbVRyYW5zZm9ybWVycywgbW9kaWZpZWRSZXNvdXJjZUZpbGVzXG4gIH0pO1xuICBpZiAocHJvZ3JhbVJldXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBwcm9ncmFtUmV1c2UucHJvZ3JhbSA9IHByb2dyYW07XG4gIH1cbiAgcmV0dXJuIHJlcG9ydEVycm9yc0FuZEV4aXQoY29tcGlsZURpYWdzLCBvcHRpb25zLCBjb25zb2xlRXJyb3IpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFpbkRpYWdub3N0aWNzRm9yVGVzdChcbiAgICBhcmdzOiBzdHJpbmdbXSwgY29uZmlnPzogTmdjUGFyc2VkQ29uZmlndXJhdGlvbik6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpY3xhcGkuRGlhZ25vc3RpYz4ge1xuICBsZXQge3Byb2plY3QsIHJvb3ROYW1lcywgb3B0aW9ucywgZXJyb3JzOiBjb25maWdFcnJvcnMsIHdhdGNoLCBlbWl0RmxhZ3N9ID1cbiAgICAgIGNvbmZpZyB8fCByZWFkTmdjQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKGFyZ3MpO1xuICBpZiAoY29uZmlnRXJyb3JzLmxlbmd0aCkge1xuICAgIHJldHVybiBjb25maWdFcnJvcnM7XG4gIH1cbiAgY29uc3Qge2RpYWdub3N0aWNzOiBjb21waWxlRGlhZ3N9ID0gcGVyZm9ybUNvbXBpbGF0aW9uKFxuICAgICAge3Jvb3ROYW1lcywgb3B0aW9ucywgZW1pdEZsYWdzLCBlbWl0Q2FsbGJhY2s6IGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zKX0pO1xuICByZXR1cm4gY29tcGlsZURpYWdzO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyk6IGFwaS5Uc0VtaXRDYWxsYmFja3x1bmRlZmluZWQge1xuICBjb25zdCB0cmFuc2Zvcm1EZWNvcmF0b3JzID1cbiAgICAgIChvcHRpb25zLmVuYWJsZUl2eSA9PT0gZmFsc2UgJiYgb3B0aW9ucy5hbm5vdGF0aW9uc0FzICE9PSAnZGVjb3JhdG9ycycpO1xuICBjb25zdCB0cmFuc2Zvcm1UeXBlc1RvQ2xvc3VyZSA9IG9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI7XG4gIGlmICghdHJhbnNmb3JtRGVjb3JhdG9ycyAmJiAhdHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGlmICh0cmFuc2Zvcm1EZWNvcmF0b3JzKSB7XG4gICAgLy8gVGhpcyBpcyBuZWVkZWQgYXMgYSB3b3JrYXJvdW5kIGZvciBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci90c2lja2xlL2lzc3Vlcy82MzVcbiAgICAvLyBPdGhlcndpc2UgdHNpY2tsZSBtaWdodCBlbWl0IHJlZmVyZW5jZXMgdG8gbm9uIGltcG9ydGVkIHZhbHVlc1xuICAgIC8vIGFzIFR5cGVTY3JpcHQgZWxpZGVkIHRoZSBpbXBvcnQuXG4gICAgb3B0aW9ucy5lbWl0RGVjb3JhdG9yTWV0YWRhdGEgPSB0cnVlO1xuICB9XG4gIGNvbnN0IHRzaWNrbGVIb3N0OiBQaWNrPFxuICAgICAgdHNpY2tsZS5Uc2lja2xlSG9zdCwgJ3Nob3VsZFNraXBUc2lja2xlUHJvY2Vzc2luZyd8J3BhdGhUb01vZHVsZU5hbWUnfFxuICAgICAgJ3Nob3VsZElnbm9yZVdhcm5pbmdzRm9yUGF0aCd8J2ZpbGVOYW1lVG9Nb2R1bGVJZCd8J2dvb2dtb2R1bGUnfCd1bnR5cGVkJ3xcbiAgICAgICdjb252ZXJ0SW5kZXhJbXBvcnRTaG9ydGhhbmQnfCd0cmFuc2Zvcm1EZWNvcmF0b3JzJ3wndHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUnPiA9IHtcbiAgICBzaG91bGRTa2lwVHNpY2tsZVByb2Nlc3Npbmc6IChmaWxlTmFtZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvXFwuZFxcLnRzJC8udGVzdChmaWxlTmFtZSkgfHwgR0VORVJBVEVEX0ZJTEVTLnRlc3QoZmlsZU5hbWUpLFxuICAgIHBhdGhUb01vZHVsZU5hbWU6IChjb250ZXh0LCBpbXBvcnRQYXRoKSA9PiAnJyxcbiAgICBzaG91bGRJZ25vcmVXYXJuaW5nc0ZvclBhdGg6IChmaWxlUGF0aCkgPT4gZmFsc2UsXG4gICAgZmlsZU5hbWVUb01vZHVsZUlkOiAoZmlsZU5hbWUpID0+IGZpbGVOYW1lLFxuICAgIGdvb2dtb2R1bGU6IGZhbHNlLFxuICAgIHVudHlwZWQ6IHRydWUsXG4gICAgY29udmVydEluZGV4SW1wb3J0U2hvcnRoYW5kOiBmYWxzZSwgdHJhbnNmb3JtRGVjb3JhdG9ycywgdHJhbnNmb3JtVHlwZXNUb0Nsb3N1cmUsXG4gIH07XG5cbiAgaWYgKG9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgfHwgb3B0aW9ucy5hbm5vdGF0aW9uc0FzID09PSAnc3RhdGljIGZpZWxkcycpIHtcbiAgICByZXR1cm4gKHtcbiAgICAgICAgICAgICBwcm9ncmFtLFxuICAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgICAgICAgd3JpdGVGaWxlLFxuICAgICAgICAgICAgIGNhbmNlbGxhdGlvblRva2VuLFxuICAgICAgICAgICAgIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzID0ge30sXG4gICAgICAgICAgICAgaG9zdCxcbiAgICAgICAgICAgICBvcHRpb25zXG4gICAgICAgICAgIH0pID0+XG4gICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tcmVxdWlyZS1pbXBvcnRzIG9ubHkgZGVwZW5kIG9uIHRzaWNrbGUgaWYgcmVxdWVzdGVkXG4gICAgICAgIHJlcXVpcmUoJ3RzaWNrbGUnKS5lbWl0V2l0aFRzaWNrbGUoXG4gICAgICAgICAgICBwcm9ncmFtLCB7Li4udHNpY2tsZUhvc3QsIG9wdGlvbnMsIGhvc3QsIG1vZHVsZVJlc29sdXRpb25Ib3N0OiBob3N0fSwgaG9zdCwgb3B0aW9ucyxcbiAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIHtcbiAgICAgICAgICAgICAgYmVmb3JlVHM6IGN1c3RvbVRyYW5zZm9ybWVycy5iZWZvcmUsXG4gICAgICAgICAgICAgIGFmdGVyVHM6IGN1c3RvbVRyYW5zZm9ybWVycy5hZnRlcixcbiAgICAgICAgICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAoe1xuICAgICAgICAgICAgIHByb2dyYW0sXG4gICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSxcbiAgICAgICAgICAgICB3cml0ZUZpbGUsXG4gICAgICAgICAgICAgY2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgICAgICAgICAgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnMgPSB7fSxcbiAgICAgICAgICAgfSkgPT5cbiAgICAgICAgICAgICAgIHByb2dyYW0uZW1pdChcbiAgICAgICAgICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgICAgICAgICAgICAgIHthZnRlcjogY3VzdG9tVHJhbnNmb3JtZXJzLmFmdGVyLCBiZWZvcmU6IGN1c3RvbVRyYW5zZm9ybWVycy5iZWZvcmV9KTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nY1BhcnNlZENvbmZpZ3VyYXRpb24gZXh0ZW5kcyBQYXJzZWRDb25maWd1cmF0aW9uIHsgd2F0Y2g/OiBib29sZWFuOyB9XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkTmdjQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKGFyZ3M6IHN0cmluZ1tdKTogTmdjUGFyc2VkQ29uZmlndXJhdGlvbiB7XG4gIGNvbnN0IG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMgPSB7fTtcbiAgY29uc3QgcGFyc2VkQXJncyA9IHJlcXVpcmUoJ21pbmltaXN0JykoYXJncyk7XG4gIGlmIChwYXJzZWRBcmdzLmkxOG5GaWxlKSBvcHRpb25zLmkxOG5JbkZpbGUgPSBwYXJzZWRBcmdzLmkxOG5GaWxlO1xuICBpZiAocGFyc2VkQXJncy5pMThuRm9ybWF0KSBvcHRpb25zLmkxOG5JbkZvcm1hdCA9IHBhcnNlZEFyZ3MuaTE4bkZvcm1hdDtcbiAgaWYgKHBhcnNlZEFyZ3MubG9jYWxlKSBvcHRpb25zLmkxOG5JbkxvY2FsZSA9IHBhcnNlZEFyZ3MubG9jYWxlO1xuICBjb25zdCBtdCA9IHBhcnNlZEFyZ3MubWlzc2luZ1RyYW5zbGF0aW9uO1xuICBpZiAobXQgPT09ICdlcnJvcicgfHwgbXQgPT09ICd3YXJuaW5nJyB8fCBtdCA9PT0gJ2lnbm9yZScpIHtcbiAgICBvcHRpb25zLmkxOG5Jbk1pc3NpbmdUcmFuc2xhdGlvbnMgPSBtdDtcbiAgfVxuICBjb25zdCBjb25maWcgPSByZWFkQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKFxuICAgICAgYXJncywgb3B0aW9ucywgWydpMThuRmlsZScsICdpMThuRm9ybWF0JywgJ2xvY2FsZScsICdtaXNzaW5nVHJhbnNsYXRpb24nLCAnd2F0Y2gnXSk7XG4gIGNvbnN0IHdhdGNoID0gcGFyc2VkQXJncy53IHx8IHBhcnNlZEFyZ3Mud2F0Y2g7XG4gIHJldHVybiB7Li4uY29uZmlnLCB3YXRjaH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkQ29tbWFuZExpbmVBbmRDb25maWd1cmF0aW9uKFxuICAgIGFyZ3M6IHN0cmluZ1tdLCBleGlzdGluZ09wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMgPSB7fSxcbiAgICBuZ0NtZExpbmVPcHRpb25zOiBzdHJpbmdbXSA9IFtdKTogUGFyc2VkQ29uZmlndXJhdGlvbiB7XG4gIGxldCBjbWRDb25maWcgPSB0cy5wYXJzZUNvbW1hbmRMaW5lKGFyZ3MpO1xuICBjb25zdCBwcm9qZWN0ID0gY21kQ29uZmlnLm9wdGlvbnMucHJvamVjdCB8fCAnLic7XG4gIGNvbnN0IGNtZEVycm9ycyA9IGNtZENvbmZpZy5lcnJvcnMuZmlsdGVyKGUgPT4ge1xuICAgIGlmICh0eXBlb2YgZS5tZXNzYWdlVGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IG1zZyA9IGUubWVzc2FnZVRleHQ7XG4gICAgICByZXR1cm4gIW5nQ21kTGluZU9wdGlvbnMuc29tZShvID0+IG1zZy5pbmRleE9mKG8pID49IDApO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIGlmIChjbWRFcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3QsXG4gICAgICByb290TmFtZXM6IFtdLFxuICAgICAgb3B0aW9uczogY21kQ29uZmlnLm9wdGlvbnMsXG4gICAgICBlcnJvcnM6IGNtZEVycm9ycyxcbiAgICAgIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncy5EZWZhdWx0XG4gICAgfTtcbiAgfVxuICBjb25zdCBhbGxEaWFnbm9zdGljczogRGlhZ25vc3RpY3MgPSBbXTtcbiAgY29uc3QgY29uZmlnID0gcmVhZENvbmZpZ3VyYXRpb24ocHJvamVjdCwgY21kQ29uZmlnLm9wdGlvbnMpO1xuICBjb25zdCBvcHRpb25zID0gey4uLmNvbmZpZy5vcHRpb25zLCAuLi5leGlzdGluZ09wdGlvbnN9O1xuICBpZiAob3B0aW9ucy5sb2NhbGUpIHtcbiAgICBvcHRpb25zLmkxOG5JbkxvY2FsZSA9IG9wdGlvbnMubG9jYWxlO1xuICB9XG4gIHJldHVybiB7XG4gICAgcHJvamVjdCxcbiAgICByb290TmFtZXM6IGNvbmZpZy5yb290TmFtZXMsIG9wdGlvbnMsXG4gICAgZXJyb3JzOiBjb25maWcuZXJyb3JzLFxuICAgIGVtaXRGbGFnczogY29uZmlnLmVtaXRGbGFnc1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRGb3JtYXREaWFnbm9zdGljc0hvc3Qob3B0aW9ucz86IGFwaS5Db21waWxlck9wdGlvbnMpOiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3Qge1xuICBjb25zdCBiYXNlUGF0aCA9IG9wdGlvbnMgPyBvcHRpb25zLmJhc2VQYXRoIDogdW5kZWZpbmVkO1xuICByZXR1cm4ge1xuICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6ICgpID0+IGJhc2VQYXRoIHx8IHRzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5KCksXG4gICAgLy8gV2UgbmVlZCB0byBub3JtYWxpemUgdGhlIHBhdGggc2VwYXJhdG9ycyBoZXJlIGJlY2F1c2UgYnkgZGVmYXVsdCwgVHlwZVNjcmlwdFxuICAgIC8vIGNvbXBpbGVyIGhvc3RzIHVzZSBwb3NpeCBjYW5vbmljYWwgcGF0aHMuIEluIG9yZGVyIHRvIHByaW50IGNvbnNpc3RlbnQgZGlhZ25vc3RpY3MsXG4gICAgLy8gd2UgYWxzbyBub3JtYWxpemUgdGhlIHBhdGhzLlxuICAgIGdldENhbm9uaWNhbEZpbGVOYW1lOiBmaWxlTmFtZSA9PiBmaWxlTmFtZS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgZ2V0TmV3TGluZTogKCkgPT4ge1xuICAgICAgLy8gTWFudWFsbHkgZGV0ZXJtaW5lIHRoZSBwcm9wZXIgbmV3IGxpbmUgc3RyaW5nIGJhc2VkIG9uIHRoZSBwYXNzZWQgY29tcGlsZXJcbiAgICAgIC8vIG9wdGlvbnMuIFRoZXJlIGlzIG5vIHB1YmxpYyBUeXBlU2NyaXB0IGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZ1xuICAgICAgLy8gbmV3IGxpbmUgc3RyaW5nLiBzZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjk1ODFcbiAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubmV3TGluZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLm5ld0xpbmUgPT09IHRzLk5ld0xpbmVLaW5kLkxpbmVGZWVkID8gJ1xcbicgOiAnXFxyXFxuJztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cy5zeXMubmV3TGluZTtcbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiByZXBvcnRFcnJvcnNBbmRFeGl0KFxuICAgIGFsbERpYWdub3N0aWNzOiBEaWFnbm9zdGljcywgb3B0aW9ucz86IGFwaS5Db21waWxlck9wdGlvbnMsXG4gICAgY29uc29sZUVycm9yOiAoczogc3RyaW5nKSA9PiB2b2lkID0gY29uc29sZS5lcnJvcik6IG51bWJlciB7XG4gIGNvbnN0IGVycm9yc0FuZFdhcm5pbmdzID0gZmlsdGVyRXJyb3JzQW5kV2FybmluZ3MoYWxsRGlhZ25vc3RpY3MpO1xuICBpZiAoZXJyb3JzQW5kV2FybmluZ3MubGVuZ3RoKSB7XG4gICAgY29uc3QgZm9ybWF0SG9zdCA9IGdldEZvcm1hdERpYWdub3N0aWNzSG9zdChvcHRpb25zKTtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmVuYWJsZUl2eSAhPT0gZmFsc2UpIHtcbiAgICAgIGNvbnN0IG5nRGlhZ25vc3RpY3MgPSBlcnJvcnNBbmRXYXJuaW5ncy5maWx0ZXIoYXBpLmlzTmdEaWFnbm9zdGljKTtcbiAgICAgIGNvbnN0IHRzRGlhZ25vc3RpY3MgPSBlcnJvcnNBbmRXYXJuaW5ncy5maWx0ZXIoYXBpLmlzVHNEaWFnbm9zdGljKTtcbiAgICAgIGNvbnNvbGVFcnJvcihyZXBsYWNlVHNXaXRoTmdJbkVycm9ycyhcbiAgICAgICAgICB0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQodHNEaWFnbm9zdGljcywgZm9ybWF0SG9zdCkpKTtcbiAgICAgIGNvbnNvbGVFcnJvcihmb3JtYXREaWFnbm9zdGljcyhuZ0RpYWdub3N0aWNzLCBmb3JtYXRIb3N0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGVFcnJvcihmb3JtYXREaWFnbm9zdGljcyhlcnJvcnNBbmRXYXJuaW5ncywgZm9ybWF0SG9zdCkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZXhpdENvZGVGcm9tUmVzdWx0KGFsbERpYWdub3N0aWNzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoTW9kZShcbiAgICBwcm9qZWN0OiBzdHJpbmcsIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMsIGNvbnNvbGVFcnJvcjogKHM6IHN0cmluZykgPT4gdm9pZCkge1xuICByZXR1cm4gcGVyZm9ybVdhdGNoQ29tcGlsYXRpb24oY3JlYXRlUGVyZm9ybVdhdGNoSG9zdChwcm9qZWN0LCBkaWFnbm9zdGljcyA9PiB7XG4gICAgY29uc29sZUVycm9yKGZvcm1hdERpYWdub3N0aWNzKGRpYWdub3N0aWNzLCBnZXRGb3JtYXREaWFnbm9zdGljc0hvc3Qob3B0aW9ucykpKTtcbiAgfSwgb3B0aW9ucywgb3B0aW9ucyA9PiBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucykpKTtcbn1cblxuZnVuY3Rpb24gd2FybkZvckRlcHJlY2F0ZWRPcHRpb25zKG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMuaTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc29sZS53YXJuKFxuICAgICAgICAnVGhlIGBpMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0YCBvcHRpb24gaXMgZGVwcmVjYXRlZC5cXG4nICtcbiAgICAgICAgJ01pZ3JhdGUgeW91ciBsZWdhY3kgdHJhbnNsYXRpb24gZmlsZXMgdG8gdGhlIG5ldyBgJGxvY2FsaXplYCBtZXNzYWdlIGlkIGZvcm1hdCBhbmQgcmVtb3ZlIHRoaXMgb3B0aW9uLicpO1xuICB9XG59XG5cbi8vIENMSSBlbnRyeSBwb2ludFxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIGNvbnN0IGFyZ3MgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gIC8vIFdlIGFyZSBydW5uaW5nIHRoZSByZWFsIGNvbXBpbGVyIHNvIHJ1biBhZ2FpbnN0IHRoZSByZWFsIGZpbGUtc3lzdGVtXG4gIHNldEZpbGVTeXN0ZW0obmV3IE5vZGVKU0ZpbGVTeXN0ZW0oKSk7XG4gIHByb2Nlc3MuZXhpdENvZGUgPSBtYWluKGFyZ3MpO1xufVxuIl19