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
        define("@angular/compiler-cli/src/perform_watch", ["require", "exports", "chokidar", "path", "typescript", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/entry_points", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var chokidar = require("chokidar");
    var path = require("path");
    var ts = require("typescript");
    var perform_compile_1 = require("@angular/compiler-cli/src/perform_compile");
    var api = require("@angular/compiler-cli/src/transformers/api");
    var entry_points_1 = require("@angular/compiler-cli/src/transformers/entry_points");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    function totalCompilationTimeDiagnostic(timeInMillis) {
        var duration;
        if (timeInMillis > 1000) {
            duration = (timeInMillis / 1000).toPrecision(2) + "s";
        }
        else {
            duration = timeInMillis + "ms";
        }
        return {
            category: ts.DiagnosticCategory.Message,
            messageText: "Total time: " + duration,
            code: api.DEFAULT_ERROR_CODE,
            source: api.SOURCE,
        };
    }
    var FileChangeEvent;
    (function (FileChangeEvent) {
        FileChangeEvent[FileChangeEvent["Change"] = 0] = "Change";
        FileChangeEvent[FileChangeEvent["CreateDelete"] = 1] = "CreateDelete";
        FileChangeEvent[FileChangeEvent["CreateDeleteDir"] = 2] = "CreateDeleteDir";
    })(FileChangeEvent = exports.FileChangeEvent || (exports.FileChangeEvent = {}));
    function createPerformWatchHost(configFileName, reportDiagnostics, existingOptions, createEmitCallback) {
        return {
            reportDiagnostics: reportDiagnostics,
            createCompilerHost: function (options) { return entry_points_1.createCompilerHost({ options: options }); },
            readConfiguration: function () { return perform_compile_1.readConfiguration(configFileName, existingOptions); },
            createEmitCallback: function (options) { return createEmitCallback ? createEmitCallback(options) : undefined; },
            onFileChange: function (options, listener, ready) {
                if (!options.basePath) {
                    reportDiagnostics([{
                            category: ts.DiagnosticCategory.Error,
                            messageText: 'Invalid configuration option. baseDir not specified',
                            source: api.SOURCE,
                            code: api.DEFAULT_ERROR_CODE
                        }]);
                    return { close: function () { } };
                }
                var watcher = chokidar.watch(options.basePath, {
                    // ignore .dotfiles, .js and .map files.
                    // can't ignore other files as we e.g. want to recompile if an `.html` file changes as well.
                    ignored: /((^[\/\\])\..)|(\.js$)|(\.map$)|(\.metadata\.json|node_modules)/,
                    ignoreInitial: true,
                    persistent: true,
                });
                watcher.on('all', function (event, path) {
                    switch (event) {
                        case 'change':
                            listener(FileChangeEvent.Change, path);
                            break;
                        case 'unlink':
                        case 'add':
                            listener(FileChangeEvent.CreateDelete, path);
                            break;
                        case 'unlinkDir':
                        case 'addDir':
                            listener(FileChangeEvent.CreateDeleteDir, path);
                            break;
                    }
                });
                watcher.on('ready', ready);
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
        var ignoreFilesForWatch = new Set();
        var fileCache = new Map();
        var firstCompileResult = doCompilation();
        // Watch basePath, ignoring .dotfiles
        var resolveReadyPromise;
        var readyPromise = new Promise(function (resolve) { return resolveReadyPromise = resolve; });
        // Note: ! is ok as options are filled after the first compilation
        // Note: ! is ok as resolvedReadyPromise is filled by the previous call
        var fileWatcher = host.onFileChange(cachedOptions.options, watchedFileChanged, resolveReadyPromise);
        return { close: close, ready: function (cb) { return readyPromise.then(cb); }, firstCompileResult: firstCompileResult };
        function cacheEntry(fileName) {
            fileName = path.normalize(fileName);
            var entry = fileCache.get(fileName);
            if (!entry) {
                entry = {};
                fileCache.set(fileName, entry);
            }
            return entry;
        }
        function close() {
            fileWatcher.close();
            if (timerHandleForRecompilation) {
                host.clearTimeout(timerHandleForRecompilation.timerHandle);
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
                return cachedOptions.errors;
            }
            var startTime = Date.now();
            if (!cachedCompilerHost) {
                cachedCompilerHost = host.createCompilerHost(cachedOptions.options);
                var originalWriteFileCallback_1 = cachedCompilerHost.writeFile;
                cachedCompilerHost.writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                    if (sourceFiles === void 0) { sourceFiles = []; }
                    ignoreFilesForWatch.add(path.normalize(fileName));
                    return originalWriteFileCallback_1(fileName, data, writeByteOrderMark, onError, sourceFiles);
                };
                var originalFileExists_1 = cachedCompilerHost.fileExists;
                cachedCompilerHost.fileExists = function (fileName) {
                    var ce = cacheEntry(fileName);
                    if (ce.exists == null) {
                        ce.exists = originalFileExists_1.call(this, fileName);
                    }
                    return ce.exists;
                };
                var originalGetSourceFile_1 = cachedCompilerHost.getSourceFile;
                cachedCompilerHost.getSourceFile = function (fileName, languageVersion) {
                    var ce = cacheEntry(fileName);
                    if (!ce.sf) {
                        ce.sf = originalGetSourceFile_1.call(this, fileName, languageVersion);
                    }
                    return ce.sf;
                };
                var originalReadFile_1 = cachedCompilerHost.readFile;
                cachedCompilerHost.readFile = function (fileName) {
                    var ce = cacheEntry(fileName);
                    if (ce.content == null) {
                        ce.content = originalReadFile_1.call(this, fileName);
                    }
                    return ce.content;
                };
                // Provide access to the file paths that triggered this rebuild
                cachedCompilerHost.getModifiedResourceFiles = function () {
                    if (timerHandleForRecompilation === undefined) {
                        return undefined;
                    }
                    return timerHandleForRecompilation.modifiedResourceFiles;
                };
            }
            ignoreFilesForWatch.clear();
            var oldProgram = cachedProgram;
            // We clear out the `cachedProgram` here as a
            // program can only be used as `oldProgram` 1x
            cachedProgram = undefined;
            var compileResult = perform_compile_1.performCompilation({
                rootNames: cachedOptions.rootNames,
                options: cachedOptions.options,
                host: cachedCompilerHost,
                oldProgram: oldProgram,
                emitCallback: host.createEmitCallback(cachedOptions.options)
            });
            if (compileResult.diagnostics.length) {
                host.reportDiagnostics(compileResult.diagnostics);
            }
            var endTime = Date.now();
            if (cachedOptions.options.diagnostics) {
                var totalTime = (endTime - startTime) / 1000;
                host.reportDiagnostics([totalCompilationTimeDiagnostic(endTime - startTime)]);
            }
            var exitCode = perform_compile_1.exitCodeFromResult(compileResult.diagnostics);
            if (exitCode == 0) {
                cachedProgram = compileResult.program;
                host.reportDiagnostics([util_1.createMessageDiagnostic('Compilation complete. Watching for file changes.')]);
            }
            else {
                host.reportDiagnostics([util_1.createMessageDiagnostic('Compilation failed. Watching for file changes.')]);
            }
            return compileResult.diagnostics;
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
            else if (event === FileChangeEvent.CreateDelete || event === FileChangeEvent.CreateDeleteDir) {
                // If a file was added or removed, reread the configuration
                // to determine the new list of root files.
                cachedOptions = undefined;
            }
            if (event === FileChangeEvent.CreateDeleteDir) {
                fileCache.clear();
            }
            else {
                fileCache.delete(path.normalize(fileName));
            }
            if (!ignoreFilesForWatch.has(path.normalize(fileName))) {
                // Ignore the file if the file is one that was written by the compiler.
                startTimerForRecompilation(fileName);
            }
        }
        // Upon detecting a file change, wait for 250ms and then perform a recompilation. This gives batch
        // operations (such as saving all modified files in an editor) a chance to complete before we kick
        // off a new compilation.
        function startTimerForRecompilation(changedPath) {
            if (timerHandleForRecompilation) {
                host.clearTimeout(timerHandleForRecompilation.timerHandle);
            }
            else {
                timerHandleForRecompilation = {
                    modifiedResourceFiles: new Set(),
                    timerHandle: undefined
                };
            }
            timerHandleForRecompilation.timerHandle = host.setTimeout(recompile, 250);
            timerHandleForRecompilation.modifiedResourceFiles.add(changedPath);
        }
        function recompile() {
            host.reportDiagnostics([util_1.createMessageDiagnostic('File change detected. Starting incremental compilation.')]);
            doCompilation();
            timerHandleForRecompilation = undefined;
        }
    }
    exports.performWatchCompilation = performWatchCompilation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybV93YXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvcGVyZm9ybV93YXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILG1DQUFxQztJQUNyQywyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLDZFQUF3SjtJQUN4SixnRUFBMEM7SUFDMUMsb0ZBQStEO0lBQy9ELG9FQUE0RDtJQUU1RCxTQUFTLDhCQUE4QixDQUFDLFlBQW9CO1FBQzFELElBQUksUUFBZ0IsQ0FBQztRQUNyQixJQUFJLFlBQVksR0FBRyxJQUFJLEVBQUU7WUFDdkIsUUFBUSxHQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBRyxDQUFDO1NBQ3ZEO2FBQU07WUFDTCxRQUFRLEdBQU0sWUFBWSxPQUFJLENBQUM7U0FDaEM7UUFDRCxPQUFPO1lBQ0wsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPO1lBQ3ZDLFdBQVcsRUFBRSxpQkFBZSxRQUFVO1lBQ3RDLElBQUksRUFBRSxHQUFHLENBQUMsa0JBQWtCO1lBQzVCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTTtTQUNuQixDQUFDO0lBQ0osQ0FBQztJQUVELElBQVksZUFJWDtJQUpELFdBQVksZUFBZTtRQUN6Qix5REFBTSxDQUFBO1FBQ04scUVBQVksQ0FBQTtRQUNaLDJFQUFlLENBQUE7SUFDakIsQ0FBQyxFQUpXLGVBQWUsR0FBZix1QkFBZSxLQUFmLHVCQUFlLFFBSTFCO0lBY0QsU0FBZ0Isc0JBQXNCLENBQ2xDLGNBQXNCLEVBQUUsaUJBQXFELEVBQzdFLGVBQW9DLEVBQUUsa0JBQ2tDO1FBQzFFLE9BQU87WUFDTCxpQkFBaUIsRUFBRSxpQkFBaUI7WUFDcEMsa0JBQWtCLEVBQUUsVUFBQSxPQUFPLElBQUks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QUksQ0FBQyxZQUFZLENBQUMsMkJBQTJCLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDNUQ7aUJBQU07Z0JBQ0wsMkJBQTJCLEdBQUc7b0JBQzVCLHFCQUFxQixFQUFFLElBQUksR0FBRyxFQUFVO29CQUN4QyxXQUFXLEVBQUUsU0FBUztpQkFDdkIsQ0FBQzthQUNIO1lBQ0QsMkJBQTJCLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzFFLDJCQUEyQixDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsU0FBUyxTQUFTO1lBQ2hCLElBQUksQ0FBQyxpQkFBaUIsQ0FDbEIsQ0FBQyw4QkFBdUIsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxRixhQUFhLEVBQUUsQ0FBQztZQUNoQiwyQkFBMkIsR0FBRyxTQUFTLENBQUM7UUFDMUMsQ0FBQztJQUNILENBQUM7SUF2TEQsMERBdUxDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyBjaG9raWRhciBmcm9tICdjaG9raWRhcic7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGlhZ25vc3RpY3MsIFBhcnNlZENvbmZpZ3VyYXRpb24sIFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCwgZXhpdENvZGVGcm9tUmVzdWx0LCBwZXJmb3JtQ29tcGlsYXRpb24sIHJlYWRDb25maWd1cmF0aW9ufSBmcm9tICcuL3BlcmZvcm1fY29tcGlsZSc7XG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7Y3JlYXRlQ29tcGlsZXJIb3N0fSBmcm9tICcuL3RyYW5zZm9ybWVycy9lbnRyeV9wb2ludHMnO1xuaW1wb3J0IHtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpY30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmZ1bmN0aW9uIHRvdGFsQ29tcGlsYXRpb25UaW1lRGlhZ25vc3RpYyh0aW1lSW5NaWxsaXM6IG51bWJlcik6IGFwaS5EaWFnbm9zdGljIHtcbiAgbGV0IGR1cmF0aW9uOiBzdHJpbmc7XG4gIGlmICh0aW1lSW5NaWxsaXMgPiAxMDAwKSB7XG4gICAgZHVyYXRpb24gPSBgJHsodGltZUluTWlsbGlzIC8gMTAwMCkudG9QcmVjaXNpb24oMil9c2A7XG4gIH0gZWxzZSB7XG4gICAgZHVyYXRpb24gPSBgJHt0aW1lSW5NaWxsaXN9bXNgO1xuICB9XG4gIHJldHVybiB7XG4gICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlLFxuICAgIG1lc3NhZ2VUZXh0OiBgVG90YWwgdGltZTogJHtkdXJhdGlvbn1gLFxuICAgIGNvZGU6IGFwaS5ERUZBVUxUX0VSUk9SX0NPREUsXG4gICAgc291cmNlOiBhcGkuU09VUkNFLFxuICB9O1xufVxuXG5leHBvcnQgZW51bSBGaWxlQ2hhbmdlRXZlbnQge1xuICBDaGFuZ2UsXG4gIENyZWF0ZURlbGV0ZSxcbiAgQ3JlYXRlRGVsZXRlRGlyLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlcmZvcm1XYXRjaEhvc3Qge1xuICByZXBvcnREaWFnbm9zdGljcyhkaWFnbm9zdGljczogRGlhZ25vc3RpY3MpOiB2b2lkO1xuICByZWFkQ29uZmlndXJhdGlvbigpOiBQYXJzZWRDb25maWd1cmF0aW9uO1xuICBjcmVhdGVDb21waWxlckhvc3Qob3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyk6IGFwaS5Db21waWxlckhvc3Q7XG4gIGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKTogYXBpLlRzRW1pdENhbGxiYWNrfHVuZGVmaW5lZDtcbiAgb25GaWxlQ2hhbmdlKFxuICAgICAgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucywgbGlzdGVuZXI6IChldmVudDogRmlsZUNoYW5nZUV2ZW50LCBmaWxlTmFtZTogc3RyaW5nKSA9PiB2b2lkLFxuICAgICAgcmVhZHk6ICgpID0+IHZvaWQpOiB7Y2xvc2U6ICgpID0+IHZvaWR9O1xuICBzZXRUaW1lb3V0KGNhbGxiYWNrOiAoKSA9PiB2b2lkLCBtczogbnVtYmVyKTogYW55O1xuICBjbGVhclRpbWVvdXQodGltZW91dElkOiBhbnkpOiB2b2lkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGVyZm9ybVdhdGNoSG9zdChcbiAgICBjb25maWdGaWxlTmFtZTogc3RyaW5nLCByZXBvcnREaWFnbm9zdGljczogKGRpYWdub3N0aWNzOiBEaWFnbm9zdGljcykgPT4gdm9pZCxcbiAgICBleGlzdGluZ09wdGlvbnM/OiB0cy5Db21waWxlck9wdGlvbnMsIGNyZWF0ZUVtaXRDYWxsYmFjaz86IChvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKSA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaS5Uc0VtaXRDYWxsYmFjayB8IHVuZGVmaW5lZCk6IFBlcmZvcm1XYXRjaEhvc3Qge1xuICByZXR1cm4ge1xuICAgIHJlcG9ydERpYWdub3N0aWNzOiByZXBvcnREaWFnbm9zdGljcyxcbiAgICBjcmVhdGVDb21waWxlckhvc3Q6IG9wdGlvbnMgPT4gY3JlYXRlQ29tcGlsZXJIb3N0KHtvcHRpb25zfSksXG4gICAgcmVhZENvbmZpZ3VyYXRpb246ICgpID0+IHJlYWRDb25maWd1cmF0aW9uKGNvbmZpZ0ZpbGVOYW1lLCBleGlzdGluZ09wdGlvbnMpLFxuICAgIGNyZWF0ZUVtaXRDYWxsYmFjazogb3B0aW9ucyA9PiBjcmVhdGVFbWl0Q2FsbGJhY2sgPyBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9ucykgOiB1bmRlZmluZWQsXG4gICAgb25GaWxlQ2hhbmdlOiAob3B0aW9ucywgbGlzdGVuZXIsIHJlYWR5OiAoKSA9PiB2b2lkKSA9PiB7XG4gICAgICBpZiAoIW9wdGlvbnMuYmFzZVBhdGgpIHtcbiAgICAgICAgcmVwb3J0RGlhZ25vc3RpY3MoW3tcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiAnSW52YWxpZCBjb25maWd1cmF0aW9uIG9wdGlvbi4gYmFzZURpciBub3Qgc3BlY2lmaWVkJyxcbiAgICAgICAgICBzb3VyY2U6IGFwaS5TT1VSQ0UsXG4gICAgICAgICAgY29kZTogYXBpLkRFRkFVTFRfRVJST1JfQ09ERVxuICAgICAgICB9XSk7XG4gICAgICAgIHJldHVybiB7Y2xvc2U6ICgpID0+IHt9fTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChvcHRpb25zLmJhc2VQYXRoLCB7XG4gICAgICAgIC8vIGlnbm9yZSAuZG90ZmlsZXMsIC5qcyBhbmQgLm1hcCBmaWxlcy5cbiAgICAgICAgLy8gY2FuJ3QgaWdub3JlIG90aGVyIGZpbGVzIGFzIHdlIGUuZy4gd2FudCB0byByZWNvbXBpbGUgaWYgYW4gYC5odG1sYCBmaWxlIGNoYW5nZXMgYXMgd2VsbC5cbiAgICAgICAgaWdub3JlZDogLygoXltcXC9cXFxcXSlcXC4uKXwoXFwuanMkKXwoXFwubWFwJCl8KFxcLm1ldGFkYXRhXFwuanNvbnxub2RlX21vZHVsZXMpLyxcbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZSxcbiAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgIH0pO1xuICAgICAgd2F0Y2hlci5vbignYWxsJywgKGV2ZW50OiBzdHJpbmcsIHBhdGg6IHN0cmluZykgPT4ge1xuICAgICAgICBzd2l0Y2ggKGV2ZW50KSB7XG4gICAgICAgICAgY2FzZSAnY2hhbmdlJzpcbiAgICAgICAgICAgIGxpc3RlbmVyKEZpbGVDaGFuZ2VFdmVudC5DaGFuZ2UsIHBhdGgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAndW5saW5rJzpcbiAgICAgICAgICBjYXNlICdhZGQnOlxuICAgICAgICAgICAgbGlzdGVuZXIoRmlsZUNoYW5nZUV2ZW50LkNyZWF0ZURlbGV0ZSwgcGF0aCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICd1bmxpbmtEaXInOlxuICAgICAgICAgIGNhc2UgJ2FkZERpcic6XG4gICAgICAgICAgICBsaXN0ZW5lcihGaWxlQ2hhbmdlRXZlbnQuQ3JlYXRlRGVsZXRlRGlyLCBwYXRoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHdhdGNoZXIub24oJ3JlYWR5JywgcmVhZHkpO1xuICAgICAgcmV0dXJuIHtjbG9zZTogKCkgPT4gd2F0Y2hlci5jbG9zZSgpLCByZWFkeX07XG4gICAgfSxcbiAgICBzZXRUaW1lb3V0OiAodHMuc3lzLmNsZWFyVGltZW91dCAmJiB0cy5zeXMuc2V0VGltZW91dCkgfHwgc2V0VGltZW91dCxcbiAgICBjbGVhclRpbWVvdXQ6ICh0cy5zeXMuc2V0VGltZW91dCAmJiB0cy5zeXMuY2xlYXJUaW1lb3V0KSB8fCBjbGVhclRpbWVvdXQsXG4gIH07XG59XG5cbmludGVyZmFjZSBDYWNoZUVudHJ5IHtcbiAgZXhpc3RzPzogYm9vbGVhbjtcbiAgc2Y/OiB0cy5Tb3VyY2VGaWxlO1xuICBjb250ZW50Pzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUXVldWVkQ29tcGlsYXRpb25JbmZvIHtcbiAgdGltZXJIYW5kbGU6IGFueTtcbiAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8c3RyaW5nPjtcbn1cblxuLyoqXG4gKiBUaGUgbG9naWMgaW4gdGhpcyBmdW5jdGlvbiBpcyBhZGFwdGVkIGZyb20gYHRzYy50c2AgZnJvbSBUeXBlU2NyaXB0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyZm9ybVdhdGNoQ29tcGlsYXRpb24oaG9zdDogUGVyZm9ybVdhdGNoSG9zdCk6XG4gICAge2Nsb3NlOiAoKSA9PiB2b2lkLCByZWFkeTogKGNiOiAoKSA9PiB2b2lkKSA9PiB2b2lkLCBmaXJzdENvbXBpbGVSZXN1bHQ6IERpYWdub3N0aWNzfSB7XG4gIGxldCBjYWNoZWRQcm9ncmFtOiBhcGkuUHJvZ3JhbXx1bmRlZmluZWQ7ICAgICAgICAgICAgLy8gUHJvZ3JhbSBjYWNoZWQgZnJvbSBsYXN0IGNvbXBpbGF0aW9uXG4gIGxldCBjYWNoZWRDb21waWxlckhvc3Q6IGFwaS5Db21waWxlckhvc3R8dW5kZWZpbmVkOyAgLy8gQ29tcGlsZXJIb3N0IGNhY2hlZCBmcm9tIGxhc3QgY29tcGlsYXRpb25cbiAgbGV0IGNhY2hlZE9wdGlvbnM6IFBhcnNlZENvbmZpZ3VyYXRpb258dW5kZWZpbmVkOyAgLy8gQ29tcGlsZXJPcHRpb25zIGNhY2hlZCBmcm9tIGxhc3QgY29tcGlsYXRpb25cbiAgbGV0IHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbjogUXVldWVkQ29tcGlsYXRpb25JbmZvfFxuICAgICAgdW5kZWZpbmVkOyAgLy8gSGFuZGxlIGZvciAwLjI1cyB3YWl0IHRpbWVyIHRvIHRyaWdnZXIgcmVjb21waWxhdGlvblxuXG4gIGNvbnN0IGlnbm9yZUZpbGVzRm9yV2F0Y2ggPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgZmlsZUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIENhY2hlRW50cnk+KCk7XG5cbiAgY29uc3QgZmlyc3RDb21waWxlUmVzdWx0ID0gZG9Db21waWxhdGlvbigpO1xuXG4gIC8vIFdhdGNoIGJhc2VQYXRoLCBpZ25vcmluZyAuZG90ZmlsZXNcbiAgbGV0IHJlc29sdmVSZWFkeVByb21pc2U6ICgpID0+IHZvaWQ7XG4gIGNvbnN0IHJlYWR5UHJvbWlzZSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gcmVzb2x2ZVJlYWR5UHJvbWlzZSA9IHJlc29sdmUpO1xuICAvLyBOb3RlOiAhIGlzIG9rIGFzIG9wdGlvbnMgYXJlIGZpbGxlZCBhZnRlciB0aGUgZmlyc3QgY29tcGlsYXRpb25cbiAgLy8gTm90ZTogISBpcyBvayBhcyByZXNvbHZlZFJlYWR5UHJvbWlzZSBpcyBmaWxsZWQgYnkgdGhlIHByZXZpb3VzIGNhbGxcbiAgY29uc3QgZmlsZVdhdGNoZXIgPVxuICAgICAgaG9zdC5vbkZpbGVDaGFuZ2UoY2FjaGVkT3B0aW9ucyAhLm9wdGlvbnMsIHdhdGNoZWRGaWxlQ2hhbmdlZCwgcmVzb2x2ZVJlYWR5UHJvbWlzZSAhKTtcblxuICByZXR1cm4ge2Nsb3NlLCByZWFkeTogY2IgPT4gcmVhZHlQcm9taXNlLnRoZW4oY2IpLCBmaXJzdENvbXBpbGVSZXN1bHR9O1xuXG4gIGZ1bmN0aW9uIGNhY2hlRW50cnkoZmlsZU5hbWU6IHN0cmluZyk6IENhY2hlRW50cnkge1xuICAgIGZpbGVOYW1lID0gcGF0aC5ub3JtYWxpemUoZmlsZU5hbWUpO1xuICAgIGxldCBlbnRyeSA9IGZpbGVDYWNoZS5nZXQoZmlsZU5hbWUpO1xuICAgIGlmICghZW50cnkpIHtcbiAgICAgIGVudHJ5ID0ge307XG4gICAgICBmaWxlQ2FjaGUuc2V0KGZpbGVOYW1lLCBlbnRyeSk7XG4gICAgfVxuICAgIHJldHVybiBlbnRyeTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsb3NlKCkge1xuICAgIGZpbGVXYXRjaGVyLmNsb3NlKCk7XG4gICAgaWYgKHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbikge1xuICAgICAgaG9zdC5jbGVhclRpbWVvdXQodGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uLnRpbWVySGFuZGxlKTtcbiAgICAgIHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvLyBJbnZva2VkIHRvIHBlcmZvcm0gaW5pdGlhbCBjb21waWxhdGlvbiBvciByZS1jb21waWxhdGlvbiBpbiB3YXRjaCBtb2RlXG4gIGZ1bmN0aW9uIGRvQ29tcGlsYXRpb24oKTogRGlhZ25vc3RpY3Mge1xuICAgIGlmICghY2FjaGVkT3B0aW9ucykge1xuICAgICAgY2FjaGVkT3B0aW9ucyA9IGhvc3QucmVhZENvbmZpZ3VyYXRpb24oKTtcbiAgICB9XG4gICAgaWYgKGNhY2hlZE9wdGlvbnMuZXJyb3JzICYmIGNhY2hlZE9wdGlvbnMuZXJyb3JzLmxlbmd0aCkge1xuICAgICAgaG9zdC5yZXBvcnREaWFnbm9zdGljcyhjYWNoZWRPcHRpb25zLmVycm9ycyk7XG4gICAgICByZXR1cm4gY2FjaGVkT3B0aW9ucy5lcnJvcnM7XG4gICAgfVxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgaWYgKCFjYWNoZWRDb21waWxlckhvc3QpIHtcbiAgICAgIGNhY2hlZENvbXBpbGVySG9zdCA9IGhvc3QuY3JlYXRlQ29tcGlsZXJIb3N0KGNhY2hlZE9wdGlvbnMub3B0aW9ucyk7XG4gICAgICBjb25zdCBvcmlnaW5hbFdyaXRlRmlsZUNhbGxiYWNrID0gY2FjaGVkQ29tcGlsZXJIb3N0LndyaXRlRmlsZTtcbiAgICAgIGNhY2hlZENvbXBpbGVySG9zdC53cml0ZUZpbGUgPSBmdW5jdGlvbihcbiAgICAgICAgICBmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgICAgICBvbkVycm9yPzogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCwgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT4gPSBbXSkge1xuICAgICAgICBpZ25vcmVGaWxlc0ZvcldhdGNoLmFkZChwYXRoLm5vcm1hbGl6ZShmaWxlTmFtZSkpO1xuICAgICAgICByZXR1cm4gb3JpZ2luYWxXcml0ZUZpbGVDYWxsYmFjayhmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgICB9O1xuICAgICAgY29uc3Qgb3JpZ2luYWxGaWxlRXhpc3RzID0gY2FjaGVkQ29tcGlsZXJIb3N0LmZpbGVFeGlzdHM7XG4gICAgICBjYWNoZWRDb21waWxlckhvc3QuZmlsZUV4aXN0cyA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgY2UgPSBjYWNoZUVudHJ5KGZpbGVOYW1lKTtcbiAgICAgICAgaWYgKGNlLmV4aXN0cyA9PSBudWxsKSB7XG4gICAgICAgICAgY2UuZXhpc3RzID0gb3JpZ2luYWxGaWxlRXhpc3RzLmNhbGwodGhpcywgZmlsZU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjZS5leGlzdHMgITtcbiAgICAgIH07XG4gICAgICBjb25zdCBvcmlnaW5hbEdldFNvdXJjZUZpbGUgPSBjYWNoZWRDb21waWxlckhvc3QuZ2V0U291cmNlRmlsZTtcbiAgICAgIGNhY2hlZENvbXBpbGVySG9zdC5nZXRTb3VyY2VGaWxlID0gZnVuY3Rpb24oXG4gICAgICAgICAgZmlsZU5hbWU6IHN0cmluZywgbGFuZ3VhZ2VWZXJzaW9uOiB0cy5TY3JpcHRUYXJnZXQpIHtcbiAgICAgICAgY29uc3QgY2UgPSBjYWNoZUVudHJ5KGZpbGVOYW1lKTtcbiAgICAgICAgaWYgKCFjZS5zZikge1xuICAgICAgICAgIGNlLnNmID0gb3JpZ2luYWxHZXRTb3VyY2VGaWxlLmNhbGwodGhpcywgZmlsZU5hbWUsIGxhbmd1YWdlVmVyc2lvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNlLnNmICE7XG4gICAgICB9O1xuICAgICAgY29uc3Qgb3JpZ2luYWxSZWFkRmlsZSA9IGNhY2hlZENvbXBpbGVySG9zdC5yZWFkRmlsZTtcbiAgICAgIGNhY2hlZENvbXBpbGVySG9zdC5yZWFkRmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgY2UgPSBjYWNoZUVudHJ5KGZpbGVOYW1lKTtcbiAgICAgICAgaWYgKGNlLmNvbnRlbnQgPT0gbnVsbCkge1xuICAgICAgICAgIGNlLmNvbnRlbnQgPSBvcmlnaW5hbFJlYWRGaWxlLmNhbGwodGhpcywgZmlsZU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjZS5jb250ZW50ICE7XG4gICAgICB9O1xuICAgICAgLy8gUHJvdmlkZSBhY2Nlc3MgdG8gdGhlIGZpbGUgcGF0aHMgdGhhdCB0cmlnZ2VyZWQgdGhpcyByZWJ1aWxkXG4gICAgICBjYWNoZWRDb21waWxlckhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbi5tb2RpZmllZFJlc291cmNlRmlsZXM7XG4gICAgICB9O1xuICAgIH1cbiAgICBpZ25vcmVGaWxlc0ZvcldhdGNoLmNsZWFyKCk7XG4gICAgY29uc3Qgb2xkUHJvZ3JhbSA9IGNhY2hlZFByb2dyYW07XG4gICAgLy8gV2UgY2xlYXIgb3V0IHRoZSBgY2FjaGVkUHJvZ3JhbWAgaGVyZSBhcyBhXG4gICAgLy8gcHJvZ3JhbSBjYW4gb25seSBiZSB1c2VkIGFzIGBvbGRQcm9ncmFtYCAxeFxuICAgIGNhY2hlZFByb2dyYW0gPSB1bmRlZmluZWQ7XG4gICAgY29uc3QgY29tcGlsZVJlc3VsdCA9IHBlcmZvcm1Db21waWxhdGlvbih7XG4gICAgICByb290TmFtZXM6IGNhY2hlZE9wdGlvbnMucm9vdE5hbWVzLFxuICAgICAgb3B0aW9uczogY2FjaGVkT3B0aW9ucy5vcHRpb25zLFxuICAgICAgaG9zdDogY2FjaGVkQ29tcGlsZXJIb3N0LFxuICAgICAgb2xkUHJvZ3JhbTogb2xkUHJvZ3JhbSxcbiAgICAgIGVtaXRDYWxsYmFjazogaG9zdC5jcmVhdGVFbWl0Q2FsbGJhY2soY2FjaGVkT3B0aW9ucy5vcHRpb25zKVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbXBpbGVSZXN1bHQuZGlhZ25vc3RpY3MubGVuZ3RoKSB7XG4gICAgICBob3N0LnJlcG9ydERpYWdub3N0aWNzKGNvbXBpbGVSZXN1bHQuZGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGNvbnN0IGVuZFRpbWUgPSBEYXRlLm5vdygpO1xuICAgIGlmIChjYWNoZWRPcHRpb25zLm9wdGlvbnMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIGNvbnN0IHRvdGFsVGltZSA9IChlbmRUaW1lIC0gc3RhcnRUaW1lKSAvIDEwMDA7XG4gICAgICBob3N0LnJlcG9ydERpYWdub3N0aWNzKFt0b3RhbENvbXBpbGF0aW9uVGltZURpYWdub3N0aWMoZW5kVGltZSAtIHN0YXJ0VGltZSldKTtcbiAgICB9XG4gICAgY29uc3QgZXhpdENvZGUgPSBleGl0Q29kZUZyb21SZXN1bHQoY29tcGlsZVJlc3VsdC5kaWFnbm9zdGljcyk7XG4gICAgaWYgKGV4aXRDb2RlID09IDApIHtcbiAgICAgIGNhY2hlZFByb2dyYW0gPSBjb21waWxlUmVzdWx0LnByb2dyYW07XG4gICAgICBob3N0LnJlcG9ydERpYWdub3N0aWNzKFxuICAgICAgICAgIFtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYygnQ29tcGlsYXRpb24gY29tcGxldGUuIFdhdGNoaW5nIGZvciBmaWxlIGNoYW5nZXMuJyldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaG9zdC5yZXBvcnREaWFnbm9zdGljcyhcbiAgICAgICAgICBbY3JlYXRlTWVzc2FnZURpYWdub3N0aWMoJ0NvbXBpbGF0aW9uIGZhaWxlZC4gV2F0Y2hpbmcgZm9yIGZpbGUgY2hhbmdlcy4nKV0pO1xuICAgIH1cblxuICAgIHJldHVybiBjb21waWxlUmVzdWx0LmRpYWdub3N0aWNzO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzZXRPcHRpb25zKCkge1xuICAgIGNhY2hlZFByb2dyYW0gPSB1bmRlZmluZWQ7XG4gICAgY2FjaGVkQ29tcGlsZXJIb3N0ID0gdW5kZWZpbmVkO1xuICAgIGNhY2hlZE9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiB3YXRjaGVkRmlsZUNoYW5nZWQoZXZlbnQ6IEZpbGVDaGFuZ2VFdmVudCwgZmlsZU5hbWU6IHN0cmluZykge1xuICAgIGlmIChjYWNoZWRPcHRpb25zICYmIGV2ZW50ID09PSBGaWxlQ2hhbmdlRXZlbnQuQ2hhbmdlICYmXG4gICAgICAgIC8vIFRPRE8oY2h1Y2tqKTogdmFsaWRhdGUgdGhhdCB0aGlzIGlzIHN1ZmZpY2llbnQgdG8gc2tpcCBmaWxlcyB0aGF0IHdlcmUgd3JpdHRlbi5cbiAgICAgICAgLy8gVGhpcyBhc3N1bWVzIHRoYXQgdGhlIGZpbGUgcGF0aCB3ZSB3cml0ZSBpcyB0aGUgc2FtZSBmaWxlIHBhdGggd2Ugd2lsbCByZWNlaXZlIGluIHRoZVxuICAgICAgICAvLyBjaGFuZ2Ugbm90aWZpY2F0aW9uLlxuICAgICAgICBwYXRoLm5vcm1hbGl6ZShmaWxlTmFtZSkgPT09IHBhdGgubm9ybWFsaXplKGNhY2hlZE9wdGlvbnMucHJvamVjdCkpIHtcbiAgICAgIC8vIElmIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgY2hhbmdlcywgZm9yZ2V0IGV2ZXJ5dGhpbmcgYW5kIHN0YXJ0IHRoZSByZWNvbXBpbGF0aW9uIHRpbWVyXG4gICAgICByZXNldE9wdGlvbnMoKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBldmVudCA9PT0gRmlsZUNoYW5nZUV2ZW50LkNyZWF0ZURlbGV0ZSB8fCBldmVudCA9PT0gRmlsZUNoYW5nZUV2ZW50LkNyZWF0ZURlbGV0ZURpcikge1xuICAgICAgLy8gSWYgYSBmaWxlIHdhcyBhZGRlZCBvciByZW1vdmVkLCByZXJlYWQgdGhlIGNvbmZpZ3VyYXRpb25cbiAgICAgIC8vIHRvIGRldGVybWluZSB0aGUgbmV3IGxpc3Qgb2Ygcm9vdCBmaWxlcy5cbiAgICAgIGNhY2hlZE9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50ID09PSBGaWxlQ2hhbmdlRXZlbnQuQ3JlYXRlRGVsZXRlRGlyKSB7XG4gICAgICBmaWxlQ2FjaGUuY2xlYXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZUNhY2hlLmRlbGV0ZShwYXRoLm5vcm1hbGl6ZShmaWxlTmFtZSkpO1xuICAgIH1cblxuICAgIGlmICghaWdub3JlRmlsZXNGb3JXYXRjaC5oYXMocGF0aC5ub3JtYWxpemUoZmlsZU5hbWUpKSkge1xuICAgICAgLy8gSWdub3JlIHRoZSBmaWxlIGlmIHRoZSBmaWxlIGlzIG9uZSB0aGF0IHdhcyB3cml0dGVuIGJ5IHRoZSBjb21waWxlci5cbiAgICAgIHN0YXJ0VGltZXJGb3JSZWNvbXBpbGF0aW9uKGZpbGVOYW1lKTtcbiAgICB9XG4gIH1cblxuICAvLyBVcG9uIGRldGVjdGluZyBhIGZpbGUgY2hhbmdlLCB3YWl0IGZvciAyNTBtcyBhbmQgdGhlbiBwZXJmb3JtIGEgcmVjb21waWxhdGlvbi4gVGhpcyBnaXZlcyBiYXRjaFxuICAvLyBvcGVyYXRpb25zIChzdWNoIGFzIHNhdmluZyBhbGwgbW9kaWZpZWQgZmlsZXMgaW4gYW4gZWRpdG9yKSBhIGNoYW5jZSB0byBjb21wbGV0ZSBiZWZvcmUgd2Uga2lja1xuICAvLyBvZmYgYSBuZXcgY29tcGlsYXRpb24uXG4gIGZ1bmN0aW9uIHN0YXJ0VGltZXJGb3JSZWNvbXBpbGF0aW9uKGNoYW5nZWRQYXRoOiBzdHJpbmcpIHtcbiAgICBpZiAodGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uKSB7XG4gICAgICBob3N0LmNsZWFyVGltZW91dCh0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb24udGltZXJIYW5kbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb24gPSB7XG4gICAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogbmV3IFNldDxzdHJpbmc+KCksXG4gICAgICAgIHRpbWVySGFuZGxlOiB1bmRlZmluZWRcbiAgICAgIH07XG4gICAgfVxuICAgIHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbi50aW1lckhhbmRsZSA9IGhvc3Quc2V0VGltZW91dChyZWNvbXBpbGUsIDI1MCk7XG4gICAgdGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uLm1vZGlmaWVkUmVzb3VyY2VGaWxlcy5hZGQoY2hhbmdlZFBhdGgpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVjb21waWxlKCkge1xuICAgIGhvc3QucmVwb3J0RGlhZ25vc3RpY3MoXG4gICAgICAgIFtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYygnRmlsZSBjaGFuZ2UgZGV0ZWN0ZWQuIFN0YXJ0aW5nIGluY3JlbWVudGFsIGNvbXBpbGF0aW9uLicpXSk7XG4gICAgZG9Db21waWxhdGlvbigpO1xuICAgIHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbiA9IHVuZGVmaW5lZDtcbiAgfVxufVxuIl19