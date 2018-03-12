#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const ts = require("typescript");
const tsickle = require("tsickle/src/tsickle");
const api = require("./transformers/api");
const util_1 = require("./transformers/util");
const perform_compile_1 = require("./perform_compile");
const perform_watch_1 = require("./perform_watch");
function main(args, consoleError = console.error, config) {
    let { project, rootNames, options, errors: configErrors, watch, emitFlags } = config || readNgcCommandLineAndConfiguration(args);
    if (configErrors.length) {
        return reportErrorsAndExit(configErrors, /*options*/ undefined, consoleError);
    }
    if (watch) {
        const result = watchMode(project, options, consoleError);
        return reportErrorsAndExit(result.firstCompileResult, options, consoleError);
    }
    const { diagnostics: compileDiags } = perform_compile_1.performCompilation({ rootNames, options, emitFlags, emitCallback: createEmitCallback(options) });
    return reportErrorsAndExit(compileDiags, options, consoleError);
}
exports.main = main;
function createEmitCallback(options) {
    const transformDecorators = options.annotationsAs !== 'decorators';
    const transformTypesToClosure = options.annotateForClosureCompiler;
    if (!transformDecorators && !transformTypesToClosure) {
        return undefined;
    }
    if (transformDecorators) {
        // This is needed as a workaround for https://github.com/angular/tsickle/issues/635
        // Otherwise tsickle might emit references to non imported values
        // as TypeScript elided the import.
        options.emitDecoratorMetadata = true;
    }
    const tsickleHost = {
        shouldSkipTsickleProcessing: (fileName) => /\.d\.ts$/.test(fileName) || util_1.GENERATED_FILES.test(fileName),
        pathToModuleName: (context, importPath) => '',
        shouldIgnoreWarningsForPath: (filePath) => false,
        fileNameToModuleId: (fileName) => fileName,
        googmodule: false,
        untyped: true,
        convertIndexImportShorthand: false, transformDecorators, transformTypesToClosure,
    };
    return ({ program, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers = {}, host, options }) => tsickle.emitWithTsickle(program, Object.assign({}, tsickleHost, { options, host }), host, options, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, {
        beforeTs: customTransformers.before,
        afterTs: customTransformers.after,
    });
}
function readNgcCommandLineAndConfiguration(args) {
    const options = {};
    const parsedArgs = require('minimist')(args);
    if (parsedArgs.i18nFile)
        options.i18nInFile = parsedArgs.i18nFile;
    if (parsedArgs.i18nFormat)
        options.i18nInFormat = parsedArgs.i18nFormat;
    if (parsedArgs.locale)
        options.i18nInLocale = parsedArgs.locale;
    const mt = parsedArgs.missingTranslation;
    if (mt === 'error' || mt === 'warning' || mt === 'ignore') {
        options.i18nInMissingTranslations = mt;
    }
    const config = readCommandLineAndConfiguration(args, options, ['i18nFile', 'i18nFormat', 'locale', 'missingTranslation', 'watch']);
    const watch = parsedArgs.w || parsedArgs.watch;
    return Object.assign({}, config, { watch });
}
function readCommandLineAndConfiguration(args, existingOptions = {}, ngCmdLineOptions = []) {
    let cmdConfig = ts.parseCommandLine(args);
    const project = cmdConfig.options.project || '.';
    const cmdErrors = cmdConfig.errors.filter(e => {
        if (typeof e.messageText === 'string') {
            const msg = e.messageText;
            return !ngCmdLineOptions.some(o => msg.indexOf(o) >= 0);
        }
        return true;
    });
    if (cmdErrors.length) {
        return {
            project,
            rootNames: [],
            options: cmdConfig.options,
            errors: cmdErrors,
            emitFlags: api.EmitFlags.Default
        };
    }
    const allDiagnostics = [];
    const config = perform_compile_1.readConfiguration(project, cmdConfig.options);
    const options = Object.assign({}, config.options, existingOptions);
    if (options.locale) {
        options.i18nInLocale = options.locale;
    }
    return {
        project,
        rootNames: config.rootNames, options,
        errors: config.errors,
        emitFlags: config.emitFlags
    };
}
exports.readCommandLineAndConfiguration = readCommandLineAndConfiguration;
function reportErrorsAndExit(allDiagnostics, options, consoleError = console.error) {
    const errorsAndWarnings = perform_compile_1.filterErrorsAndWarnings(allDiagnostics);
    if (errorsAndWarnings.length) {
        let currentDir = options ? options.basePath : undefined;
        const formatHost = {
            getCurrentDirectory: () => currentDir || ts.sys.getCurrentDirectory(),
            getCanonicalFileName: fileName => fileName,
            getNewLine: () => ts.sys.newLine
        };
        consoleError(perform_compile_1.formatDiagnostics(errorsAndWarnings, formatHost));
    }
    return perform_compile_1.exitCodeFromResult(allDiagnostics);
}
function watchMode(project, options, consoleError) {
    return perform_watch_1.performWatchCompilation(perform_watch_1.createPerformWatchHost(project, diagnostics => {
        consoleError(perform_compile_1.formatDiagnostics(diagnostics));
    }, options, options => createEmitCallback(options)));
}
exports.watchMode = watchMode;
// CLI entry point
if (require.main === module) {
    const args = process.argv.slice(2);
    process.exitCode = main(args);
}
//# sourceMappingURL=main.js.map