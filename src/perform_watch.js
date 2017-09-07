"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
var chokidar = require("chokidar");
var path = require("path");
var ts = require("typescript");
var perform_compile_1 = require("./perform_compile");
var api = require("./transformers/api");
var entry_points_1 = require("./transformers/entry_points");
var ChangeDiagnostics = {
    Compilation_complete_Watching_for_file_changes: {
        category: ts.DiagnosticCategory.Message,
        messageText: 'Compilation complete. Watching for file changes.',
        code: api.DEFAULT_ERROR_CODE,
        source: api.SOURCE
    },
    Compilation_failed_Watching_for_file_changes: {
        category: ts.DiagnosticCategory.Message,
        messageText: 'Compilation failed. Watching for file changes.',
        code: api.DEFAULT_ERROR_CODE,
        source: api.SOURCE
    },
    File_change_detected_Starting_incremental_compilation: {
        category: ts.DiagnosticCategory.Message,
        messageText: 'File change detected. Starting incremental compilation.',
        code: api.DEFAULT_ERROR_CODE,
        source: api.SOURCE
    },
};
var FileChangeEvent;
(function (FileChangeEvent) {
    FileChangeEvent[FileChangeEvent["Change"] = 0] = "Change";
    FileChangeEvent[FileChangeEvent["CreateDelete"] = 1] = "CreateDelete";
})(FileChangeEvent = exports.FileChangeEvent || (exports.FileChangeEvent = {}));
function createPerformWatchHost(configFileName, reportDiagnostics, createEmitCallback) {
    return {
        reportDiagnostics: reportDiagnostics,
        createCompilerHost: function (options) { return entry_points_1.createCompilerHost({ options: options }); },
        readConfiguration: function () { return perform_compile_1.readConfiguration(configFileName); },
        createEmitCallback: function (options) { return createEmitCallback ? createEmitCallback(options) : undefined; },
        onFileChange: function (listeners) {
            var parsed = perform_compile_1.readConfiguration(configFileName);
            function stubReady(cb) { process.nextTick(cb); }
            if (parsed.errors && parsed.errors.length) {
                reportDiagnostics(parsed.errors);
                return { close: function () { }, ready: stubReady };
            }
            if (!parsed.options.basePath) {
                reportDiagnostics([{
                        category: ts.DiagnosticCategory.Error,
                        messageText: 'Invalid configuration option. baseDir not specified',
                        source: api.SOURCE,
                        code: api.DEFAULT_ERROR_CODE
                    }]);
                return { close: function () { }, ready: stubReady };
            }
            var watcher = chokidar.watch(parsed.options.basePath, {
                // ignore .dotfiles, .js and .map files.
                // can't ignore other files as we e.g. want to recompile if an `.html` file changes as well.
                ignored: /((^[\/\\])\..)|(\.js$)|(\.map$)|(\.metadata\.json)/,
                ignoreInitial: true,
                persistent: true,
            });
            watcher.on('all', function (event, path) {
                switch (event) {
                    case 'change':
                        listeners(FileChangeEvent.Change, path);
                        break;
                    case 'unlink':
                    case 'add':
                        listeners(FileChangeEvent.CreateDelete, path);
                        break;
                }
            });
            function ready(cb) { watcher.on('ready', cb); }
            return { close: function () { return watcher.close(); }, ready: ready };
        },
        setTimeout: (ts.sys.clearTimeout && ts.sys.setTimeout) || setTimeout,
        clearTimeout: (ts.sys.setTimeout && ts.sys.clearTimeout) || clearTimeout,
    };
}
exports.createPerformWatchHost = createPerformWatchHost;
/**
 * The logic in this function is adapted from `tsc.ts` from TypeScript.
 */
function performWatchCompilation(host) {
    var cachedProgram; // Program cached from last compilation
    var cachedCompilerHost; // CompilerHost cached from last compilation
    var cachedOptions; // CompilerOptions cached from last compilation
    var timerHandleForRecompilation; // Handle for 0.25s wait timer to trigger recompilation
    // Watch basePath, ignoring .dotfiles
    var fileWatcher = host.onFileChange(watchedFileChanged);
    var ingoreFilesForWatch = new Set();
    var firstCompileResult = doCompilation();
    var readyPromise = new Promise(function (resolve) { return fileWatcher.ready(resolve); });
    return { close: close, ready: function (cb) { return readyPromise.then(cb); }, firstCompileResult: firstCompileResult };
    function close() {
        fileWatcher.close();
        if (timerHandleForRecompilation) {
            host.clearTimeout(timerHandleForRecompilation);
            timerHandleForRecompilation = undefined;
        }
    }
    // Invoked to perform initial compilation or re-compilation in watch mode
    function doCompilation() {
        if (!cachedOptions) {
            cachedOptions = host.readConfiguration();
        }
        if (cachedOptions.errors && cachedOptions.errors.length) {
            host.reportDiagnostics(cachedOptions.errors);
            return;
        }
        if (!cachedCompilerHost) {
            // TODO(chuckj): consider avoiding re-generating factories for libraries.
            // Consider modifying the AotCompilerHost to be able to remember the summary files
            // generated from previous compiliations and return false from isSourceFile for
            // .d.ts files for which a summary file was already generated.å
            cachedCompilerHost = host.createCompilerHost(cachedOptions.options);
            var originalWriteFileCallback_1 = cachedCompilerHost.writeFile;
            cachedCompilerHost.writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                ingoreFilesForWatch.add(path.normalize(fileName));
                return originalWriteFileCallback_1(fileName, data, writeByteOrderMark, onError, sourceFiles);
            };
        }
        ingoreFilesForWatch.clear();
        var compileResult = perform_compile_1.performCompilation({
            rootNames: cachedOptions.rootNames,
            options: cachedOptions.options,
            host: cachedCompilerHost,
            oldProgram: cachedProgram,
            emitCallback: host.createEmitCallback(cachedOptions.options)
        });
        if (compileResult.diagnostics.length) {
            host.reportDiagnostics(compileResult.diagnostics);
        }
        var exitCode = perform_compile_1.exitCodeFromResult(compileResult);
        if (exitCode == 0) {
            cachedProgram = compileResult.program;
            host.reportDiagnostics([ChangeDiagnostics.Compilation_complete_Watching_for_file_changes]);
        }
        else {
            host.reportDiagnostics([ChangeDiagnostics.Compilation_failed_Watching_for_file_changes]);
        }
        return compileResult;
    }
    function resetOptions() {
        cachedProgram = undefined;
        cachedCompilerHost = undefined;
        cachedOptions = undefined;
    }
    function watchedFileChanged(event, fileName) {
        if (cachedOptions && event === FileChangeEvent.Change &&
            // TODO(chuckj): validate that this is sufficient to skip files that were written.
            // This assumes that the file path we write is the same file path we will receive in the
            // change notification.
            path.normalize(fileName) === path.normalize(cachedOptions.project)) {
            // If the configuration file changes, forget everything and start the recompilation timer
            resetOptions();
        }
        else if (event === FileChangeEvent.CreateDelete) {
            // If a file was added or removed, reread the configuration
            // to determine the new list of root files.
            cachedOptions = undefined;
        }
        if (!ingoreFilesForWatch.has(path.normalize(fileName))) {
            // Ignore the file if the file is one that was written by the compiler.
            startTimerForRecompilation();
        }
    }
    // Upon detecting a file change, wait for 250ms and then perform a recompilation. This gives batch
    // operations (such as saving all modified files in an editor) a chance to complete before we kick
    // off a new compilation.
    function startTimerForRecompilation() {
        if (timerHandleForRecompilation) {
            host.clearTimeout(timerHandleForRecompilation);
        }
        timerHandleForRecompilation = host.setTimeout(recompile, 250);
    }
    function recompile() {
        timerHandleForRecompilation = undefined;
        host.reportDiagnostics([ChangeDiagnostics.File_change_detected_Starting_incremental_compilation]);
        doCompilation();
    }
}
exports.performWatchCompilation = performWatchCompilation;
//# sourceMappingURL=perform_watch.js.map