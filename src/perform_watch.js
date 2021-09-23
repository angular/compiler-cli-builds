/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
    exports.performWatchCompilation = exports.createPerformWatchHost = exports.FileChangeEvent = void 0;
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
            createCompilerHost: function (options) { return (0, entry_points_1.createCompilerHost)({ options: options }); },
            readConfiguration: function () { return (0, perform_compile_1.readConfiguration)(configFileName, existingOptions); },
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
            var compileResult = (0, perform_compile_1.performCompilation)({
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
            var exitCode = (0, perform_compile_1.exitCodeFromResult)(compileResult.diagnostics);
            if (exitCode == 0) {
                cachedProgram = compileResult.program;
                host.reportDiagnostics([(0, util_1.createMessageDiagnostic)('Compilation complete. Watching for file changes.')]);
            }
            else {
                host.reportDiagnostics([(0, util_1.createMessageDiagnostic)('Compilation failed. Watching for file changes.')]);
            }
            return compileResult.diagnostics;
        }
        function resetOptions() {
            cachedProgram = undefined;
            cachedCompilerHost = undefined;
            cachedOptions = undefined;
        }
        function watchedFileChanged(event, fileName) {
            var normalizedPath = path.normalize(fileName);
            if (cachedOptions && event === FileChangeEvent.Change &&
                // TODO(chuckj): validate that this is sufficient to skip files that were written.
                // This assumes that the file path we write is the same file path we will receive in the
                // change notification.
                normalizedPath === path.normalize(cachedOptions.project)) {
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
                fileCache.delete(normalizedPath);
            }
            if (!ignoreFilesForWatch.has(normalizedPath)) {
                // Ignore the file if the file is one that was written by the compiler.
                startTimerForRecompilation(normalizedPath);
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
            host.reportDiagnostics([(0, util_1.createMessageDiagnostic)('File change detected. Starting incremental compilation.')]);
            doCompilation();
            timerHandleForRecompilation = undefined;
        }
    }
    exports.performWatchCompilation = performWatchCompilation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybV93YXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvcGVyZm9ybV93YXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxtQ0FBcUM7SUFDckMsMkJBQTZCO0lBQzdCLCtCQUFpQztJQUVqQyw2RUFBd0o7SUFDeEosZ0VBQTBDO0lBQzFDLG9GQUErRDtJQUMvRCxvRUFBNEQ7SUFFNUQsU0FBUyw4QkFBOEIsQ0FBQyxZQUFvQjtRQUMxRCxJQUFJLFFBQWdCLENBQUM7UUFDckIsSUFBSSxZQUFZLEdBQUcsSUFBSSxFQUFFO1lBQ3ZCLFFBQVEsR0FBTSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQUcsQ0FBQztTQUN2RDthQUFNO1lBQ0wsUUFBUSxHQUFNLFlBQVksT0FBSSxDQUFDO1NBQ2hDO1FBQ0QsT0FBTztZQUNMLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTztZQUN2QyxXQUFXLEVBQUUsaUJBQWUsUUFBVTtZQUN0QyxJQUFJLEVBQUUsR0FBRyxDQUFDLGtCQUFrQjtZQUM1QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU07U0FDbkIsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFZLGVBSVg7SUFKRCxXQUFZLGVBQWU7UUFDekIseURBQU0sQ0FBQTtRQUNOLHFFQUFZLENBQUE7UUFDWiwyRUFBZSxDQUFBO0lBQ2pCLENBQUMsRUFKVyxlQUFlLEdBQWYsdUJBQWUsS0FBZix1QkFBZSxRQUkxQjtJQWNELFNBQWdCLHNCQUFzQixDQUNsQyxjQUFzQixFQUFFLGlCQUFxRCxFQUM3RSxlQUFvQyxFQUNwQyxrQkFDa0M7UUFDcEMsT0FBTztZQUNMLGlCQUFpQixFQUFFLGlCQUFpQjtZQUNwQyxrQkFBa0IsRUFBRSxVQUFBLE9BQU8sSUFB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QUFFO2dCQUMvQixJQUFJLENBQUMsWUFBWSxDQUFDLDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQzVEO2lCQUFNO2dCQUNMLDJCQUEyQixHQUFHO29CQUM1QixxQkFBcUIsRUFBRSxJQUFJLEdBQUcsRUFBVTtvQkFDeEMsV0FBVyxFQUFFLFNBQVM7aUJBQ3ZCLENBQUM7YUFDSDtZQUNELDJCQUEyQixDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMxRSwyQkFBMkIsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUVELFNBQVMsU0FBUztZQUNoQixJQUFJLENBQUMsaUJBQWlCLENBQ2xCLENBQUMsSUFBQSw4QkFBdUIsRUFBQyx5REFBeUQsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxRixhQUFhLEVBQUUsQ0FBQztZQUNoQiwyQkFBMkIsR0FBRyxTQUFTLENBQUM7UUFDMUMsQ0FBQztJQUNILENBQUM7SUF6TEQsMERBeUxDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEaWFnbm9zdGljcywgZXhpdENvZGVGcm9tUmVzdWx0LCBQYXJzZWRDb25maWd1cmF0aW9uLCBwZXJmb3JtQ29tcGlsYXRpb24sIFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCwgcmVhZENvbmZpZ3VyYXRpb259IGZyb20gJy4vcGVyZm9ybV9jb21waWxlJztcbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHtjcmVhdGVDb21waWxlckhvc3R9IGZyb20gJy4vdHJhbnNmb3JtZXJzL2VudHJ5X3BvaW50cyc7XG5pbXBvcnQge2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljfSBmcm9tICcuL3RyYW5zZm9ybWVycy91dGlsJztcblxuZnVuY3Rpb24gdG90YWxDb21waWxhdGlvblRpbWVEaWFnbm9zdGljKHRpbWVJbk1pbGxpczogbnVtYmVyKTogYXBpLkRpYWdub3N0aWMge1xuICBsZXQgZHVyYXRpb246IHN0cmluZztcbiAgaWYgKHRpbWVJbk1pbGxpcyA+IDEwMDApIHtcbiAgICBkdXJhdGlvbiA9IGAkeyh0aW1lSW5NaWxsaXMgLyAxMDAwKS50b1ByZWNpc2lvbigyKX1zYDtcbiAgfSBlbHNlIHtcbiAgICBkdXJhdGlvbiA9IGAke3RpbWVJbk1pbGxpc31tc2A7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UsXG4gICAgbWVzc2FnZVRleHQ6IGBUb3RhbCB0aW1lOiAke2R1cmF0aW9ufWAsXG4gICAgY29kZTogYXBpLkRFRkFVTFRfRVJST1JfQ09ERSxcbiAgICBzb3VyY2U6IGFwaS5TT1VSQ0UsXG4gIH07XG59XG5cbmV4cG9ydCBlbnVtIEZpbGVDaGFuZ2VFdmVudCB7XG4gIENoYW5nZSxcbiAgQ3JlYXRlRGVsZXRlLFxuICBDcmVhdGVEZWxldGVEaXIsXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVyZm9ybVdhdGNoSG9zdCB7XG4gIHJlcG9ydERpYWdub3N0aWNzKGRpYWdub3N0aWNzOiBEaWFnbm9zdGljcyk6IHZvaWQ7XG4gIHJlYWRDb25maWd1cmF0aW9uKCk6IFBhcnNlZENvbmZpZ3VyYXRpb247XG4gIGNyZWF0ZUNvbXBpbGVySG9zdChvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKTogYXBpLkNvbXBpbGVySG9zdDtcbiAgY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMpOiBhcGkuVHNFbWl0Q2FsbGJhY2t8dW5kZWZpbmVkO1xuICBvbkZpbGVDaGFuZ2UoXG4gICAgICBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zLCBsaXN0ZW5lcjogKGV2ZW50OiBGaWxlQ2hhbmdlRXZlbnQsIGZpbGVOYW1lOiBzdHJpbmcpID0+IHZvaWQsXG4gICAgICByZWFkeTogKCkgPT4gdm9pZCk6IHtjbG9zZTogKCkgPT4gdm9pZH07XG4gIHNldFRpbWVvdXQoY2FsbGJhY2s6ICgpID0+IHZvaWQsIG1zOiBudW1iZXIpOiBhbnk7XG4gIGNsZWFyVGltZW91dCh0aW1lb3V0SWQ6IGFueSk6IHZvaWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQZXJmb3JtV2F0Y2hIb3N0KFxuICAgIGNvbmZpZ0ZpbGVOYW1lOiBzdHJpbmcsIHJlcG9ydERpYWdub3N0aWNzOiAoZGlhZ25vc3RpY3M6IERpYWdub3N0aWNzKSA9PiB2b2lkLFxuICAgIGV4aXN0aW5nT3B0aW9ucz86IHRzLkNvbXBpbGVyT3B0aW9ucyxcbiAgICBjcmVhdGVFbWl0Q2FsbGJhY2s/OiAob3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucykgPT5cbiAgICAgICAgYXBpLlRzRW1pdENhbGxiYWNrIHwgdW5kZWZpbmVkKTogUGVyZm9ybVdhdGNoSG9zdCB7XG4gIHJldHVybiB7XG4gICAgcmVwb3J0RGlhZ25vc3RpY3M6IHJlcG9ydERpYWdub3N0aWNzLFxuICAgIGNyZWF0ZUNvbXBpbGVySG9zdDogb3B0aW9ucyA9PiBjcmVhdGVDb21waWxlckhvc3Qoe29wdGlvbnN9KSxcbiAgICByZWFkQ29uZmlndXJhdGlvbjogKCkgPT4gcmVhZENvbmZpZ3VyYXRpb24oY29uZmlnRmlsZU5hbWUsIGV4aXN0aW5nT3B0aW9ucyksXG4gICAgY3JlYXRlRW1pdENhbGxiYWNrOiBvcHRpb25zID0+IGNyZWF0ZUVtaXRDYWxsYmFjayA/IGNyZWF0ZUVtaXRDYWxsYmFjayhvcHRpb25zKSA6IHVuZGVmaW5lZCxcbiAgICBvbkZpbGVDaGFuZ2U6IChvcHRpb25zLCBsaXN0ZW5lciwgcmVhZHk6ICgpID0+IHZvaWQpID0+IHtcbiAgICAgIGlmICghb3B0aW9ucy5iYXNlUGF0aCkge1xuICAgICAgICByZXBvcnREaWFnbm9zdGljcyhbe1xuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6ICdJbnZhbGlkIGNvbmZpZ3VyYXRpb24gb3B0aW9uLiBiYXNlRGlyIG5vdCBzcGVjaWZpZWQnLFxuICAgICAgICAgIHNvdXJjZTogYXBpLlNPVVJDRSxcbiAgICAgICAgICBjb2RlOiBhcGkuREVGQVVMVF9FUlJPUl9DT0RFXG4gICAgICAgIH1dKTtcbiAgICAgICAgcmV0dXJuIHtjbG9zZTogKCkgPT4ge319O1xuICAgICAgfVxuICAgICAgY29uc3Qgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKG9wdGlvbnMuYmFzZVBhdGgsIHtcbiAgICAgICAgLy8gaWdub3JlIC5kb3RmaWxlcywgLmpzIGFuZCAubWFwIGZpbGVzLlxuICAgICAgICAvLyBjYW4ndCBpZ25vcmUgb3RoZXIgZmlsZXMgYXMgd2UgZS5nLiB3YW50IHRvIHJlY29tcGlsZSBpZiBhbiBgLmh0bWxgIGZpbGUgY2hhbmdlcyBhcyB3ZWxsLlxuICAgICAgICBpZ25vcmVkOiAvKCheW1xcL1xcXFxdKVxcLi4pfChcXC5qcyQpfChcXC5tYXAkKXwoXFwubWV0YWRhdGFcXC5qc29ufG5vZGVfbW9kdWxlcykvLFxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlLFxuICAgICAgICBwZXJzaXN0ZW50OiB0cnVlLFxuICAgICAgfSk7XG4gICAgICB3YXRjaGVyLm9uKCdhbGwnLCAoZXZlbnQ6IHN0cmluZywgcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICBjYXNlICdjaGFuZ2UnOlxuICAgICAgICAgICAgbGlzdGVuZXIoRmlsZUNoYW5nZUV2ZW50LkNoYW5nZSwgcGF0aCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICd1bmxpbmsnOlxuICAgICAgICAgIGNhc2UgJ2FkZCc6XG4gICAgICAgICAgICBsaXN0ZW5lcihGaWxlQ2hhbmdlRXZlbnQuQ3JlYXRlRGVsZXRlLCBwYXRoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3VubGlua0Rpcic6XG4gICAgICAgICAgY2FzZSAnYWRkRGlyJzpcbiAgICAgICAgICAgIGxpc3RlbmVyKEZpbGVDaGFuZ2VFdmVudC5DcmVhdGVEZWxldGVEaXIsIHBhdGgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgd2F0Y2hlci5vbigncmVhZHknLCByZWFkeSk7XG4gICAgICByZXR1cm4ge2Nsb3NlOiAoKSA9PiB3YXRjaGVyLmNsb3NlKCksIHJlYWR5fTtcbiAgICB9LFxuICAgIHNldFRpbWVvdXQ6ICh0cy5zeXMuY2xlYXJUaW1lb3V0ICYmIHRzLnN5cy5zZXRUaW1lb3V0KSB8fCBzZXRUaW1lb3V0LFxuICAgIGNsZWFyVGltZW91dDogKHRzLnN5cy5zZXRUaW1lb3V0ICYmIHRzLnN5cy5jbGVhclRpbWVvdXQpIHx8IGNsZWFyVGltZW91dCxcbiAgfTtcbn1cblxuaW50ZXJmYWNlIENhY2hlRW50cnkge1xuICBleGlzdHM/OiBib29sZWFuO1xuICBzZj86IHRzLlNvdXJjZUZpbGU7XG4gIGNvbnRlbnQ/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBRdWV1ZWRDb21waWxhdGlvbkluZm8ge1xuICB0aW1lckhhbmRsZTogYW55O1xuICBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+O1xufVxuXG4vKipcbiAqIFRoZSBsb2dpYyBpbiB0aGlzIGZ1bmN0aW9uIGlzIGFkYXB0ZWQgZnJvbSBgdHNjLnRzYCBmcm9tIFR5cGVTY3JpcHQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJmb3JtV2F0Y2hDb21waWxhdGlvbihob3N0OiBQZXJmb3JtV2F0Y2hIb3N0KTpcbiAgICB7Y2xvc2U6ICgpID0+IHZvaWQsIHJlYWR5OiAoY2I6ICgpID0+IHZvaWQpID0+IHZvaWQsIGZpcnN0Q29tcGlsZVJlc3VsdDogRGlhZ25vc3RpY3N9IHtcbiAgbGV0IGNhY2hlZFByb2dyYW06IGFwaS5Qcm9ncmFtfHVuZGVmaW5lZDsgICAgICAgICAgICAvLyBQcm9ncmFtIGNhY2hlZCBmcm9tIGxhc3QgY29tcGlsYXRpb25cbiAgbGV0IGNhY2hlZENvbXBpbGVySG9zdDogYXBpLkNvbXBpbGVySG9zdHx1bmRlZmluZWQ7ICAvLyBDb21waWxlckhvc3QgY2FjaGVkIGZyb20gbGFzdCBjb21waWxhdGlvblxuICBsZXQgY2FjaGVkT3B0aW9uczogUGFyc2VkQ29uZmlndXJhdGlvbnx1bmRlZmluZWQ7ICAvLyBDb21waWxlck9wdGlvbnMgY2FjaGVkIGZyb20gbGFzdCBjb21waWxhdGlvblxuICBsZXQgdGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uOiBRdWV1ZWRDb21waWxhdGlvbkluZm98XG4gICAgICB1bmRlZmluZWQ7ICAvLyBIYW5kbGUgZm9yIDAuMjVzIHdhaXQgdGltZXIgdG8gdHJpZ2dlciByZWNvbXBpbGF0aW9uXG5cbiAgY29uc3QgaWdub3JlRmlsZXNGb3JXYXRjaCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBmaWxlQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgQ2FjaGVFbnRyeT4oKTtcblxuICBjb25zdCBmaXJzdENvbXBpbGVSZXN1bHQgPSBkb0NvbXBpbGF0aW9uKCk7XG5cbiAgLy8gV2F0Y2ggYmFzZVBhdGgsIGlnbm9yaW5nIC5kb3RmaWxlc1xuICBsZXQgcmVzb2x2ZVJlYWR5UHJvbWlzZTogKCkgPT4gdm9pZDtcbiAgY29uc3QgcmVhZHlQcm9taXNlID0gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiByZXNvbHZlUmVhZHlQcm9taXNlID0gcmVzb2x2ZSk7XG4gIC8vIE5vdGU6ICEgaXMgb2sgYXMgb3B0aW9ucyBhcmUgZmlsbGVkIGFmdGVyIHRoZSBmaXJzdCBjb21waWxhdGlvblxuICAvLyBOb3RlOiAhIGlzIG9rIGFzIHJlc29sdmVkUmVhZHlQcm9taXNlIGlzIGZpbGxlZCBieSB0aGUgcHJldmlvdXMgY2FsbFxuICBjb25zdCBmaWxlV2F0Y2hlciA9XG4gICAgICBob3N0Lm9uRmlsZUNoYW5nZShjYWNoZWRPcHRpb25zIS5vcHRpb25zLCB3YXRjaGVkRmlsZUNoYW5nZWQsIHJlc29sdmVSZWFkeVByb21pc2UhKTtcblxuICByZXR1cm4ge2Nsb3NlLCByZWFkeTogY2IgPT4gcmVhZHlQcm9taXNlLnRoZW4oY2IpLCBmaXJzdENvbXBpbGVSZXN1bHR9O1xuXG4gIGZ1bmN0aW9uIGNhY2hlRW50cnkoZmlsZU5hbWU6IHN0cmluZyk6IENhY2hlRW50cnkge1xuICAgIGZpbGVOYW1lID0gcGF0aC5ub3JtYWxpemUoZmlsZU5hbWUpO1xuICAgIGxldCBlbnRyeSA9IGZpbGVDYWNoZS5nZXQoZmlsZU5hbWUpO1xuICAgIGlmICghZW50cnkpIHtcbiAgICAgIGVudHJ5ID0ge307XG4gICAgICBmaWxlQ2FjaGUuc2V0KGZpbGVOYW1lLCBlbnRyeSk7XG4gICAgfVxuICAgIHJldHVybiBlbnRyeTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsb3NlKCkge1xuICAgIGZpbGVXYXRjaGVyLmNsb3NlKCk7XG4gICAgaWYgKHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbikge1xuICAgICAgaG9zdC5jbGVhclRpbWVvdXQodGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uLnRpbWVySGFuZGxlKTtcbiAgICAgIHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICAvLyBJbnZva2VkIHRvIHBlcmZvcm0gaW5pdGlhbCBjb21waWxhdGlvbiBvciByZS1jb21waWxhdGlvbiBpbiB3YXRjaCBtb2RlXG4gIGZ1bmN0aW9uIGRvQ29tcGlsYXRpb24oKTogRGlhZ25vc3RpY3Mge1xuICAgIGlmICghY2FjaGVkT3B0aW9ucykge1xuICAgICAgY2FjaGVkT3B0aW9ucyA9IGhvc3QucmVhZENvbmZpZ3VyYXRpb24oKTtcbiAgICB9XG4gICAgaWYgKGNhY2hlZE9wdGlvbnMuZXJyb3JzICYmIGNhY2hlZE9wdGlvbnMuZXJyb3JzLmxlbmd0aCkge1xuICAgICAgaG9zdC5yZXBvcnREaWFnbm9zdGljcyhjYWNoZWRPcHRpb25zLmVycm9ycyk7XG4gICAgICByZXR1cm4gY2FjaGVkT3B0aW9ucy5lcnJvcnM7XG4gICAgfVxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgaWYgKCFjYWNoZWRDb21waWxlckhvc3QpIHtcbiAgICAgIGNhY2hlZENvbXBpbGVySG9zdCA9IGhvc3QuY3JlYXRlQ29tcGlsZXJIb3N0KGNhY2hlZE9wdGlvbnMub3B0aW9ucyk7XG4gICAgICBjb25zdCBvcmlnaW5hbFdyaXRlRmlsZUNhbGxiYWNrID0gY2FjaGVkQ29tcGlsZXJIb3N0LndyaXRlRmlsZTtcbiAgICAgIGNhY2hlZENvbXBpbGVySG9zdC53cml0ZUZpbGUgPSBmdW5jdGlvbihcbiAgICAgICAgICBmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgICAgICBvbkVycm9yPzogKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCwgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT4gPSBbXSkge1xuICAgICAgICBpZ25vcmVGaWxlc0ZvcldhdGNoLmFkZChwYXRoLm5vcm1hbGl6ZShmaWxlTmFtZSkpO1xuICAgICAgICByZXR1cm4gb3JpZ2luYWxXcml0ZUZpbGVDYWxsYmFjayhmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgICB9O1xuICAgICAgY29uc3Qgb3JpZ2luYWxGaWxlRXhpc3RzID0gY2FjaGVkQ29tcGlsZXJIb3N0LmZpbGVFeGlzdHM7XG4gICAgICBjYWNoZWRDb21waWxlckhvc3QuZmlsZUV4aXN0cyA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgY2UgPSBjYWNoZUVudHJ5KGZpbGVOYW1lKTtcbiAgICAgICAgaWYgKGNlLmV4aXN0cyA9PSBudWxsKSB7XG4gICAgICAgICAgY2UuZXhpc3RzID0gb3JpZ2luYWxGaWxlRXhpc3RzLmNhbGwodGhpcywgZmlsZU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjZS5leGlzdHMhO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsR2V0U291cmNlRmlsZSA9IGNhY2hlZENvbXBpbGVySG9zdC5nZXRTb3VyY2VGaWxlO1xuICAgICAgY2FjaGVkQ29tcGlsZXJIb3N0LmdldFNvdXJjZUZpbGUgPSBmdW5jdGlvbihcbiAgICAgICAgICBmaWxlTmFtZTogc3RyaW5nLCBsYW5ndWFnZVZlcnNpb246IHRzLlNjcmlwdFRhcmdldCkge1xuICAgICAgICBjb25zdCBjZSA9IGNhY2hlRW50cnkoZmlsZU5hbWUpO1xuICAgICAgICBpZiAoIWNlLnNmKSB7XG4gICAgICAgICAgY2Uuc2YgPSBvcmlnaW5hbEdldFNvdXJjZUZpbGUuY2FsbCh0aGlzLCBmaWxlTmFtZSwgbGFuZ3VhZ2VWZXJzaW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2Uuc2YhO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsUmVhZEZpbGUgPSBjYWNoZWRDb21waWxlckhvc3QucmVhZEZpbGU7XG4gICAgICBjYWNoZWRDb21waWxlckhvc3QucmVhZEZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGNlID0gY2FjaGVFbnRyeShmaWxlTmFtZSk7XG4gICAgICAgIGlmIChjZS5jb250ZW50ID09IG51bGwpIHtcbiAgICAgICAgICBjZS5jb250ZW50ID0gb3JpZ2luYWxSZWFkRmlsZS5jYWxsKHRoaXMsIGZpbGVOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2UuY29udGVudCE7XG4gICAgICB9O1xuICAgICAgLy8gUHJvdmlkZSBhY2Nlc3MgdG8gdGhlIGZpbGUgcGF0aHMgdGhhdCB0cmlnZ2VyZWQgdGhpcyByZWJ1aWxkXG4gICAgICBjYWNoZWRDb21waWxlckhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbi5tb2RpZmllZFJlc291cmNlRmlsZXM7XG4gICAgICB9O1xuICAgIH1cbiAgICBpZ25vcmVGaWxlc0ZvcldhdGNoLmNsZWFyKCk7XG4gICAgY29uc3Qgb2xkUHJvZ3JhbSA9IGNhY2hlZFByb2dyYW07XG4gICAgLy8gV2UgY2xlYXIgb3V0IHRoZSBgY2FjaGVkUHJvZ3JhbWAgaGVyZSBhcyBhXG4gICAgLy8gcHJvZ3JhbSBjYW4gb25seSBiZSB1c2VkIGFzIGBvbGRQcm9ncmFtYCAxeFxuICAgIGNhY2hlZFByb2dyYW0gPSB1bmRlZmluZWQ7XG4gICAgY29uc3QgY29tcGlsZVJlc3VsdCA9IHBlcmZvcm1Db21waWxhdGlvbih7XG4gICAgICByb290TmFtZXM6IGNhY2hlZE9wdGlvbnMucm9vdE5hbWVzLFxuICAgICAgb3B0aW9uczogY2FjaGVkT3B0aW9ucy5vcHRpb25zLFxuICAgICAgaG9zdDogY2FjaGVkQ29tcGlsZXJIb3N0LFxuICAgICAgb2xkUHJvZ3JhbTogb2xkUHJvZ3JhbSxcbiAgICAgIGVtaXRDYWxsYmFjazogaG9zdC5jcmVhdGVFbWl0Q2FsbGJhY2soY2FjaGVkT3B0aW9ucy5vcHRpb25zKVxuICAgIH0pO1xuXG4gICAgaWYgKGNvbXBpbGVSZXN1bHQuZGlhZ25vc3RpY3MubGVuZ3RoKSB7XG4gICAgICBob3N0LnJlcG9ydERpYWdub3N0aWNzKGNvbXBpbGVSZXN1bHQuZGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGNvbnN0IGVuZFRpbWUgPSBEYXRlLm5vdygpO1xuICAgIGlmIChjYWNoZWRPcHRpb25zLm9wdGlvbnMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIGNvbnN0IHRvdGFsVGltZSA9IChlbmRUaW1lIC0gc3RhcnRUaW1lKSAvIDEwMDA7XG4gICAgICBob3N0LnJlcG9ydERpYWdub3N0aWNzKFt0b3RhbENvbXBpbGF0aW9uVGltZURpYWdub3N0aWMoZW5kVGltZSAtIHN0YXJ0VGltZSldKTtcbiAgICB9XG4gICAgY29uc3QgZXhpdENvZGUgPSBleGl0Q29kZUZyb21SZXN1bHQoY29tcGlsZVJlc3VsdC5kaWFnbm9zdGljcyk7XG4gICAgaWYgKGV4aXRDb2RlID09IDApIHtcbiAgICAgIGNhY2hlZFByb2dyYW0gPSBjb21waWxlUmVzdWx0LnByb2dyYW07XG4gICAgICBob3N0LnJlcG9ydERpYWdub3N0aWNzKFxuICAgICAgICAgIFtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYygnQ29tcGlsYXRpb24gY29tcGxldGUuIFdhdGNoaW5nIGZvciBmaWxlIGNoYW5nZXMuJyldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaG9zdC5yZXBvcnREaWFnbm9zdGljcyhcbiAgICAgICAgICBbY3JlYXRlTWVzc2FnZURpYWdub3N0aWMoJ0NvbXBpbGF0aW9uIGZhaWxlZC4gV2F0Y2hpbmcgZm9yIGZpbGUgY2hhbmdlcy4nKV0pO1xuICAgIH1cblxuICAgIHJldHVybiBjb21waWxlUmVzdWx0LmRpYWdub3N0aWNzO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzZXRPcHRpb25zKCkge1xuICAgIGNhY2hlZFByb2dyYW0gPSB1bmRlZmluZWQ7XG4gICAgY2FjaGVkQ29tcGlsZXJIb3N0ID0gdW5kZWZpbmVkO1xuICAgIGNhY2hlZE9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBmdW5jdGlvbiB3YXRjaGVkRmlsZUNoYW5nZWQoZXZlbnQ6IEZpbGVDaGFuZ2VFdmVudCwgZmlsZU5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRQYXRoID0gcGF0aC5ub3JtYWxpemUoZmlsZU5hbWUpO1xuXG4gICAgaWYgKGNhY2hlZE9wdGlvbnMgJiYgZXZlbnQgPT09IEZpbGVDaGFuZ2VFdmVudC5DaGFuZ2UgJiZcbiAgICAgICAgLy8gVE9ETyhjaHVja2opOiB2YWxpZGF0ZSB0aGF0IHRoaXMgaXMgc3VmZmljaWVudCB0byBza2lwIGZpbGVzIHRoYXQgd2VyZSB3cml0dGVuLlxuICAgICAgICAvLyBUaGlzIGFzc3VtZXMgdGhhdCB0aGUgZmlsZSBwYXRoIHdlIHdyaXRlIGlzIHRoZSBzYW1lIGZpbGUgcGF0aCB3ZSB3aWxsIHJlY2VpdmUgaW4gdGhlXG4gICAgICAgIC8vIGNoYW5nZSBub3RpZmljYXRpb24uXG4gICAgICAgIG5vcm1hbGl6ZWRQYXRoID09PSBwYXRoLm5vcm1hbGl6ZShjYWNoZWRPcHRpb25zLnByb2plY3QpKSB7XG4gICAgICAvLyBJZiB0aGUgY29uZmlndXJhdGlvbiBmaWxlIGNoYW5nZXMsIGZvcmdldCBldmVyeXRoaW5nIGFuZCBzdGFydCB0aGUgcmVjb21waWxhdGlvbiB0aW1lclxuICAgICAgcmVzZXRPcHRpb25zKCk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgZXZlbnQgPT09IEZpbGVDaGFuZ2VFdmVudC5DcmVhdGVEZWxldGUgfHwgZXZlbnQgPT09IEZpbGVDaGFuZ2VFdmVudC5DcmVhdGVEZWxldGVEaXIpIHtcbiAgICAgIC8vIElmIGEgZmlsZSB3YXMgYWRkZWQgb3IgcmVtb3ZlZCwgcmVyZWFkIHRoZSBjb25maWd1cmF0aW9uXG4gICAgICAvLyB0byBkZXRlcm1pbmUgdGhlIG5ldyBsaXN0IG9mIHJvb3QgZmlsZXMuXG4gICAgICBjYWNoZWRPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmIChldmVudCA9PT0gRmlsZUNoYW5nZUV2ZW50LkNyZWF0ZURlbGV0ZURpcikge1xuICAgICAgZmlsZUNhY2hlLmNsZWFyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpbGVDYWNoZS5kZWxldGUobm9ybWFsaXplZFBhdGgpO1xuICAgIH1cblxuICAgIGlmICghaWdub3JlRmlsZXNGb3JXYXRjaC5oYXMobm9ybWFsaXplZFBhdGgpKSB7XG4gICAgICAvLyBJZ25vcmUgdGhlIGZpbGUgaWYgdGhlIGZpbGUgaXMgb25lIHRoYXQgd2FzIHdyaXR0ZW4gYnkgdGhlIGNvbXBpbGVyLlxuICAgICAgc3RhcnRUaW1lckZvclJlY29tcGlsYXRpb24obm9ybWFsaXplZFBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFVwb24gZGV0ZWN0aW5nIGEgZmlsZSBjaGFuZ2UsIHdhaXQgZm9yIDI1MG1zIGFuZCB0aGVuIHBlcmZvcm0gYSByZWNvbXBpbGF0aW9uLiBUaGlzIGdpdmVzIGJhdGNoXG4gIC8vIG9wZXJhdGlvbnMgKHN1Y2ggYXMgc2F2aW5nIGFsbCBtb2RpZmllZCBmaWxlcyBpbiBhbiBlZGl0b3IpIGEgY2hhbmNlIHRvIGNvbXBsZXRlIGJlZm9yZSB3ZSBraWNrXG4gIC8vIG9mZiBhIG5ldyBjb21waWxhdGlvbi5cbiAgZnVuY3Rpb24gc3RhcnRUaW1lckZvclJlY29tcGlsYXRpb24oY2hhbmdlZFBhdGg6IHN0cmluZykge1xuICAgIGlmICh0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb24pIHtcbiAgICAgIGhvc3QuY2xlYXJUaW1lb3V0KHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbi50aW1lckhhbmRsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbiA9IHtcbiAgICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgICAgdGltZXJIYW5kbGU6IHVuZGVmaW5lZFxuICAgICAgfTtcbiAgICB9XG4gICAgdGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uLnRpbWVySGFuZGxlID0gaG9zdC5zZXRUaW1lb3V0KHJlY29tcGlsZSwgMjUwKTtcbiAgICB0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb24ubW9kaWZpZWRSZXNvdXJjZUZpbGVzLmFkZChjaGFuZ2VkUGF0aCk7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvbXBpbGUoKSB7XG4gICAgaG9zdC5yZXBvcnREaWFnbm9zdGljcyhcbiAgICAgICAgW2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljKCdGaWxlIGNoYW5nZSBkZXRlY3RlZC4gU3RhcnRpbmcgaW5jcmVtZW50YWwgY29tcGlsYXRpb24uJyldKTtcbiAgICBkb0NvbXBpbGF0aW9uKCk7XG4gICAgdGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uID0gdW5kZWZpbmVkO1xuICB9XG59XG4iXX0=