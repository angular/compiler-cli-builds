#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
var ts = require("typescript");
var tsc = require("@angular/tsc-wrapped");
var tsickle = require("tsickle");
var perform_compile_1 = require("./perform-compile");
var compiler_1 = require("@angular/compiler");
var codegen_1 = require("./codegen");
function main(args, consoleError) {
    if (consoleError === void 0) { consoleError = console.error; }
    var parsedArgs = require('minimist')(args);
    var _a = readCommandLineAndConfiguration(parsedArgs), rootNames = _a.rootNames, options = _a.options, configErrors = _a.errors;
    if (configErrors.length) {
        return Promise.resolve(reportErrorsAndExit(options, configErrors, consoleError));
    }
    if (options.disableTransformerPipeline) {
        return disabledTransformerPipelineNgcMain(parsedArgs, consoleError);
    }
    var compileDiags = perform_compile_1.performCompilation({ rootNames: rootNames, options: options, emitCallback: createEmitCallback(options) }).diagnostics;
    return Promise.resolve(reportErrorsAndExit(options, compileDiags, consoleError));
}
exports.main = main;
function mainSync(args, consoleError) {
    if (consoleError === void 0) { consoleError = console.error; }
    var parsedArgs = require('minimist')(args);
    var _a = readCommandLineAndConfiguration(parsedArgs), rootNames = _a.rootNames, options = _a.options, configErrors = _a.errors;
    if (configErrors.length) {
        return reportErrorsAndExit(options, configErrors, consoleError);
    }
    var compileDiags = perform_compile_1.performCompilation({ rootNames: rootNames, options: options, emitCallback: createEmitCallback(options) }).diagnostics;
    return reportErrorsAndExit(options, compileDiags, consoleError);
}
exports.mainSync = mainSync;
function createEmitCallback(options) {
    var tsickleOptions = {
        googmodule: false,
        untyped: true,
        convertIndexImportShorthand: true,
        transformDecorators: options.annotationsAs !== 'decorators',
        transformTypesToClosure: options.annotateForClosureCompiler,
    };
    var tsickleHost = {
        shouldSkipTsickleProcessing: function (fileName) { return /\.d\.ts$/.test(fileName); },
        pathToModuleName: function (context, importPath) { return ''; },
        shouldIgnoreWarningsForPath: function (filePath) { return false; },
        fileNameToModuleId: function (fileName) { return fileName; },
    };
    return function (_a) {
        var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, _b = _a.customTransformers, customTransformers = _b === void 0 ? {} : _b, host = _a.host, options = _a.options;
        return tsickle.emitWithTsickle(program, tsickleHost, tsickleOptions, host, options, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, {
            beforeTs: customTransformers.before,
            afterTs: customTransformers.after,
        });
    };
}
function readCommandLineAndConfiguration(args) {
    var project = args.p || args.project || '.';
    var allDiagnostics = [];
    var config = perform_compile_1.readConfiguration(project);
    var options = mergeCommandLineParams(args, config.options);
    return { rootNames: config.rootNames, options: options, errors: config.errors };
}
function reportErrorsAndExit(options, allDiagnostics, consoleError) {
    if (consoleError === void 0) { consoleError = console.error; }
    var exitCode = allDiagnostics.some(function (d) { return d.category === ts.DiagnosticCategory.Error; }) ? 1 : 0;
    if (allDiagnostics.length) {
        consoleError(perform_compile_1.formatDiagnostics(options, allDiagnostics));
    }
    return exitCode;
}
function mergeCommandLineParams(cliArgs, options) {
    // TODO: also merge in tsc command line parameters by calling
    // ts.readCommandLine.
    if (cliArgs.i18nFile)
        options.i18nInFile = cliArgs.i18nFile;
    if (cliArgs.i18nFormat)
        options.i18nInFormat = cliArgs.i18nFormat;
    if (cliArgs.locale)
        options.i18nInLocale = cliArgs.locale;
    var mt = cliArgs.missingTranslation;
    if (mt === 'error' || mt === 'warning' || mt === 'ignore') {
        options.i18nInMissingTranslations = mt;
    }
    return options;
}
function disabledTransformerPipelineNgcMain(args, consoleError) {
    if (consoleError === void 0) { consoleError = console.error; }
    var cliOptions = new tsc.NgcCliOptions(args);
    var project = args.p || args.project || '.';
    return tsc.main(project, cliOptions, disabledTransformerPipelineCodegen)
        .then(function () { return 0; })
        .catch(function (e) {
        if (e instanceof tsc.UserError || compiler_1.isSyntaxError(e)) {
            consoleError(e.message);
        }
        else {
            consoleError(e.stack);
        }
        return Promise.resolve(1);
    });
}
function disabledTransformerPipelineCodegen(ngOptions, cliOptions, program, host) {
    if (ngOptions.enableSummariesForJit === undefined) {
        // default to false
        ngOptions.enableSummariesForJit = false;
    }
    return codegen_1.CodeGenerator.create(ngOptions, cliOptions, program, host).codegen();
}
// CLI entry point
if (require.main === module) {
    var args = process.argv.slice(2);
    main(args).then(function (exitCode) { return process.exitCode = exitCode; });
}
//# sourceMappingURL=main.js.map