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
            host.reportDiagnostics([util_1.createMessageDiagnostic('File change detected. Starting incremental compilation.')]);
            doCompilation();
            timerHandleForRecompilation = undefined;
        }
    }
    exports.performWatchCompilation = performWatchCompilation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybV93YXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvcGVyZm9ybV93YXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxtQ0FBcUM7SUFDckMsMkJBQTZCO0lBQzdCLCtCQUFpQztJQUVqQyw2RUFBd0o7SUFDeEosZ0VBQTBDO0lBQzFDLG9GQUErRDtJQUMvRCxvRUFBNEQ7SUFFNUQsU0FBUyw4QkFBOEIsQ0FBQyxZQUFvQjtRQUMxRCxJQUFJLFFBQWdCLENBQUM7UUFDckIsSUFBSSxZQUFZLEdBQUcsSUFBSSxFQUFFO1lBQ3ZCLFFBQVEsR0FBTSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQUcsQ0FBQztTQUN2RDthQUFNO1lBQ0wsUUFBUSxHQUFNLFlBQVksT0FBSSxDQUFDO1NBQ2hDO1FBQ0QsT0FBTztZQUNMLFFBQVEsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTztZQUN2QyxXQUFXLEVBQUUsaUJBQWUsUUFBVTtZQUN0QyxJQUFJLEVBQUUsR0FBRyxDQUFDLGtCQUFrQjtZQUM1QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU07U0FDbkIsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFZLGVBSVg7SUFKRCxXQUFZLGVBQWU7UUFDekIseURBQU0sQ0FBQTtRQUNOLHFFQUFZLENBQUE7UUFDWiwyRUFBZSxDQUFBO0lBQ2pCLENBQUMsRUFKVyxlQUFlLEdBQWYsdUJBQWUsS0FBZix1QkFBZSxRQUkxQjtJQWNELFNBQWdCLHNCQUFzQixDQUNsQyxjQUFzQixFQUFFLGlCQUFxRCxFQUM3RSxlQUFvQyxFQUNwQyxrQkFDa0M7UUFDcEMsT0FBTztZQUNMLGlCQUFpQixFQUFFLGlCQUFpQjtZQUNwQyxrQkFBa0IsRUFBRSxVQUFBLE9BQU8sSUFB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LDJCQUEyQixDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQzVEO2lCQUFNO2dCQUNMLDJCQUEyQixHQUFHO29CQUM1QixxQkFBcUIsRUFBRSxJQUFJLEdBQUcsRUFBVTtvQkFDeEMsV0FBVyxFQUFFLFNBQVM7aUJBQ3ZCLENBQUM7YUFDSDtZQUNELDJCQUEyQixDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMxRSwyQkFBMkIsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckUsQ0FBQztRQUVELFNBQVMsU0FBUztZQUNoQixJQUFJLENBQUMsaUJBQWlCLENBQ2xCLENBQUMsOEJBQXVCLENBQUMseURBQXlELENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUYsYUFBYSxFQUFFLENBQUM7WUFDaEIsMkJBQTJCLEdBQUcsU0FBUyxDQUFDO1FBQzFDLENBQUM7SUFDSCxDQUFDO0lBekxELDBEQXlMQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RpYWdub3N0aWNzLCBleGl0Q29kZUZyb21SZXN1bHQsIFBhcnNlZENvbmZpZ3VyYXRpb24sIHBlcmZvcm1Db21waWxhdGlvbiwgUGVyZm9ybUNvbXBpbGF0aW9uUmVzdWx0LCByZWFkQ29uZmlndXJhdGlvbn0gZnJvbSAnLi9wZXJmb3JtX2NvbXBpbGUnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge2NyZWF0ZUNvbXBpbGVySG9zdH0gZnJvbSAnLi90cmFuc2Zvcm1lcnMvZW50cnlfcG9pbnRzJztcbmltcG9ydCB7Y3JlYXRlTWVzc2FnZURpYWdub3N0aWN9IGZyb20gJy4vdHJhbnNmb3JtZXJzL3V0aWwnO1xuXG5mdW5jdGlvbiB0b3RhbENvbXBpbGF0aW9uVGltZURpYWdub3N0aWModGltZUluTWlsbGlzOiBudW1iZXIpOiBhcGkuRGlhZ25vc3RpYyB7XG4gIGxldCBkdXJhdGlvbjogc3RyaW5nO1xuICBpZiAodGltZUluTWlsbGlzID4gMTAwMCkge1xuICAgIGR1cmF0aW9uID0gYCR7KHRpbWVJbk1pbGxpcyAvIDEwMDApLnRvUHJlY2lzaW9uKDIpfXNgO1xuICB9IGVsc2Uge1xuICAgIGR1cmF0aW9uID0gYCR7dGltZUluTWlsbGlzfW1zYDtcbiAgfVxuICByZXR1cm4ge1xuICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuTWVzc2FnZSxcbiAgICBtZXNzYWdlVGV4dDogYFRvdGFsIHRpbWU6ICR7ZHVyYXRpb259YCxcbiAgICBjb2RlOiBhcGkuREVGQVVMVF9FUlJPUl9DT0RFLFxuICAgIHNvdXJjZTogYXBpLlNPVVJDRSxcbiAgfTtcbn1cblxuZXhwb3J0IGVudW0gRmlsZUNoYW5nZUV2ZW50IHtcbiAgQ2hhbmdlLFxuICBDcmVhdGVEZWxldGUsXG4gIENyZWF0ZURlbGV0ZURpcixcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQZXJmb3JtV2F0Y2hIb3N0IHtcbiAgcmVwb3J0RGlhZ25vc3RpY3MoZGlhZ25vc3RpY3M6IERpYWdub3N0aWNzKTogdm9pZDtcbiAgcmVhZENvbmZpZ3VyYXRpb24oKTogUGFyc2VkQ29uZmlndXJhdGlvbjtcbiAgY3JlYXRlQ29tcGlsZXJIb3N0KG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMpOiBhcGkuQ29tcGlsZXJIb3N0O1xuICBjcmVhdGVFbWl0Q2FsbGJhY2sob3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyk6IGFwaS5Uc0VtaXRDYWxsYmFja3x1bmRlZmluZWQ7XG4gIG9uRmlsZUNoYW5nZShcbiAgICAgIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMsIGxpc3RlbmVyOiAoZXZlbnQ6IEZpbGVDaGFuZ2VFdmVudCwgZmlsZU5hbWU6IHN0cmluZykgPT4gdm9pZCxcbiAgICAgIHJlYWR5OiAoKSA9PiB2b2lkKToge2Nsb3NlOiAoKSA9PiB2b2lkfTtcbiAgc2V0VGltZW91dChjYWxsYmFjazogKCkgPT4gdm9pZCwgbXM6IG51bWJlcik6IGFueTtcbiAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZDogYW55KTogdm9pZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBlcmZvcm1XYXRjaEhvc3QoXG4gICAgY29uZmlnRmlsZU5hbWU6IHN0cmluZywgcmVwb3J0RGlhZ25vc3RpY3M6IChkaWFnbm9zdGljczogRGlhZ25vc3RpY3MpID0+IHZvaWQsXG4gICAgZXhpc3RpbmdPcHRpb25zPzogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgIGNyZWF0ZUVtaXRDYWxsYmFjaz86IChvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKSA9PlxuICAgICAgICBhcGkuVHNFbWl0Q2FsbGJhY2sgfCB1bmRlZmluZWQpOiBQZXJmb3JtV2F0Y2hIb3N0IHtcbiAgcmV0dXJuIHtcbiAgICByZXBvcnREaWFnbm9zdGljczogcmVwb3J0RGlhZ25vc3RpY3MsXG4gICAgY3JlYXRlQ29tcGlsZXJIb3N0OiBvcHRpb25zID0+IGNyZWF0ZUNvbXBpbGVySG9zdCh7b3B0aW9uc30pLFxuICAgIHJlYWRDb25maWd1cmF0aW9uOiAoKSA9PiByZWFkQ29uZmlndXJhdGlvbihjb25maWdGaWxlTmFtZSwgZXhpc3RpbmdPcHRpb25zKSxcbiAgICBjcmVhdGVFbWl0Q2FsbGJhY2s6IG9wdGlvbnMgPT4gY3JlYXRlRW1pdENhbGxiYWNrID8gY3JlYXRlRW1pdENhbGxiYWNrKG9wdGlvbnMpIDogdW5kZWZpbmVkLFxuICAgIG9uRmlsZUNoYW5nZTogKG9wdGlvbnMsIGxpc3RlbmVyLCByZWFkeTogKCkgPT4gdm9pZCkgPT4ge1xuICAgICAgaWYgKCFvcHRpb25zLmJhc2VQYXRoKSB7XG4gICAgICAgIHJlcG9ydERpYWdub3N0aWNzKFt7XG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBtZXNzYWdlVGV4dDogJ0ludmFsaWQgY29uZmlndXJhdGlvbiBvcHRpb24uIGJhc2VEaXIgbm90IHNwZWNpZmllZCcsXG4gICAgICAgICAgc291cmNlOiBhcGkuU09VUkNFLFxuICAgICAgICAgIGNvZGU6IGFwaS5ERUZBVUxUX0VSUk9SX0NPREVcbiAgICAgICAgfV0pO1xuICAgICAgICByZXR1cm4ge2Nsb3NlOiAoKSA9PiB7fX07XG4gICAgICB9XG4gICAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2gob3B0aW9ucy5iYXNlUGF0aCwge1xuICAgICAgICAvLyBpZ25vcmUgLmRvdGZpbGVzLCAuanMgYW5kIC5tYXAgZmlsZXMuXG4gICAgICAgIC8vIGNhbid0IGlnbm9yZSBvdGhlciBmaWxlcyBhcyB3ZSBlLmcuIHdhbnQgdG8gcmVjb21waWxlIGlmIGFuIGAuaHRtbGAgZmlsZSBjaGFuZ2VzIGFzIHdlbGwuXG4gICAgICAgIGlnbm9yZWQ6IC8oKF5bXFwvXFxcXF0pXFwuLil8KFxcLmpzJCl8KFxcLm1hcCQpfChcXC5tZXRhZGF0YVxcLmpzb258bm9kZV9tb2R1bGVzKS8sXG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWUsXG4gICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXG4gICAgICB9KTtcbiAgICAgIHdhdGNoZXIub24oJ2FsbCcsIChldmVudDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+IHtcbiAgICAgICAgc3dpdGNoIChldmVudCkge1xuICAgICAgICAgIGNhc2UgJ2NoYW5nZSc6XG4gICAgICAgICAgICBsaXN0ZW5lcihGaWxlQ2hhbmdlRXZlbnQuQ2hhbmdlLCBwYXRoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3VubGluayc6XG4gICAgICAgICAgY2FzZSAnYWRkJzpcbiAgICAgICAgICAgIGxpc3RlbmVyKEZpbGVDaGFuZ2VFdmVudC5DcmVhdGVEZWxldGUsIHBhdGgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAndW5saW5rRGlyJzpcbiAgICAgICAgICBjYXNlICdhZGREaXInOlxuICAgICAgICAgICAgbGlzdGVuZXIoRmlsZUNoYW5nZUV2ZW50LkNyZWF0ZURlbGV0ZURpciwgcGF0aCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB3YXRjaGVyLm9uKCdyZWFkeScsIHJlYWR5KTtcbiAgICAgIHJldHVybiB7Y2xvc2U6ICgpID0+IHdhdGNoZXIuY2xvc2UoKSwgcmVhZHl9O1xuICAgIH0sXG4gICAgc2V0VGltZW91dDogKHRzLnN5cy5jbGVhclRpbWVvdXQgJiYgdHMuc3lzLnNldFRpbWVvdXQpIHx8IHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0OiAodHMuc3lzLnNldFRpbWVvdXQgJiYgdHMuc3lzLmNsZWFyVGltZW91dCkgfHwgY2xlYXJUaW1lb3V0LFxuICB9O1xufVxuXG5pbnRlcmZhY2UgQ2FjaGVFbnRyeSB7XG4gIGV4aXN0cz86IGJvb2xlYW47XG4gIHNmPzogdHMuU291cmNlRmlsZTtcbiAgY29udGVudD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFF1ZXVlZENvbXBpbGF0aW9uSW5mbyB7XG4gIHRpbWVySGFuZGxlOiBhbnk7XG4gIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz47XG59XG5cbi8qKlxuICogVGhlIGxvZ2ljIGluIHRoaXMgZnVuY3Rpb24gaXMgYWRhcHRlZCBmcm9tIGB0c2MudHNgIGZyb20gVHlwZVNjcmlwdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcmZvcm1XYXRjaENvbXBpbGF0aW9uKGhvc3Q6IFBlcmZvcm1XYXRjaEhvc3QpOlxuICAgIHtjbG9zZTogKCkgPT4gdm9pZCwgcmVhZHk6IChjYjogKCkgPT4gdm9pZCkgPT4gdm9pZCwgZmlyc3RDb21waWxlUmVzdWx0OiBEaWFnbm9zdGljc30ge1xuICBsZXQgY2FjaGVkUHJvZ3JhbTogYXBpLlByb2dyYW18dW5kZWZpbmVkOyAgICAgICAgICAgIC8vIFByb2dyYW0gY2FjaGVkIGZyb20gbGFzdCBjb21waWxhdGlvblxuICBsZXQgY2FjaGVkQ29tcGlsZXJIb3N0OiBhcGkuQ29tcGlsZXJIb3N0fHVuZGVmaW5lZDsgIC8vIENvbXBpbGVySG9zdCBjYWNoZWQgZnJvbSBsYXN0IGNvbXBpbGF0aW9uXG4gIGxldCBjYWNoZWRPcHRpb25zOiBQYXJzZWRDb25maWd1cmF0aW9ufHVuZGVmaW5lZDsgIC8vIENvbXBpbGVyT3B0aW9ucyBjYWNoZWQgZnJvbSBsYXN0IGNvbXBpbGF0aW9uXG4gIGxldCB0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb246IFF1ZXVlZENvbXBpbGF0aW9uSW5mb3xcbiAgICAgIHVuZGVmaW5lZDsgIC8vIEhhbmRsZSBmb3IgMC4yNXMgd2FpdCB0aW1lciB0byB0cmlnZ2VyIHJlY29tcGlsYXRpb25cblxuICBjb25zdCBpZ25vcmVGaWxlc0ZvcldhdGNoID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGZpbGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBDYWNoZUVudHJ5PigpO1xuXG4gIGNvbnN0IGZpcnN0Q29tcGlsZVJlc3VsdCA9IGRvQ29tcGlsYXRpb24oKTtcblxuICAvLyBXYXRjaCBiYXNlUGF0aCwgaWdub3JpbmcgLmRvdGZpbGVzXG4gIGxldCByZXNvbHZlUmVhZHlQcm9taXNlOiAoKSA9PiB2b2lkO1xuICBjb25zdCByZWFkeVByb21pc2UgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlc29sdmVSZWFkeVByb21pc2UgPSByZXNvbHZlKTtcbiAgLy8gTm90ZTogISBpcyBvayBhcyBvcHRpb25zIGFyZSBmaWxsZWQgYWZ0ZXIgdGhlIGZpcnN0IGNvbXBpbGF0aW9uXG4gIC8vIE5vdGU6ICEgaXMgb2sgYXMgcmVzb2x2ZWRSZWFkeVByb21pc2UgaXMgZmlsbGVkIGJ5IHRoZSBwcmV2aW91cyBjYWxsXG4gIGNvbnN0IGZpbGVXYXRjaGVyID1cbiAgICAgIGhvc3Qub25GaWxlQ2hhbmdlKGNhY2hlZE9wdGlvbnMhLm9wdGlvbnMsIHdhdGNoZWRGaWxlQ2hhbmdlZCwgcmVzb2x2ZVJlYWR5UHJvbWlzZSEpO1xuXG4gIHJldHVybiB7Y2xvc2UsIHJlYWR5OiBjYiA9PiByZWFkeVByb21pc2UudGhlbihjYiksIGZpcnN0Q29tcGlsZVJlc3VsdH07XG5cbiAgZnVuY3Rpb24gY2FjaGVFbnRyeShmaWxlTmFtZTogc3RyaW5nKTogQ2FjaGVFbnRyeSB7XG4gICAgZmlsZU5hbWUgPSBwYXRoLm5vcm1hbGl6ZShmaWxlTmFtZSk7XG4gICAgbGV0IGVudHJ5ID0gZmlsZUNhY2hlLmdldChmaWxlTmFtZSk7XG4gICAgaWYgKCFlbnRyeSkge1xuICAgICAgZW50cnkgPSB7fTtcbiAgICAgIGZpbGVDYWNoZS5zZXQoZmlsZU5hbWUsIGVudHJ5KTtcbiAgICB9XG4gICAgcmV0dXJuIGVudHJ5O1xuICB9XG5cbiAgZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgZmlsZVdhdGNoZXIuY2xvc2UoKTtcbiAgICBpZiAodGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uKSB7XG4gICAgICBob3N0LmNsZWFyVGltZW91dCh0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb24udGltZXJIYW5kbGUpO1xuICAgICAgdGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8vIEludm9rZWQgdG8gcGVyZm9ybSBpbml0aWFsIGNvbXBpbGF0aW9uIG9yIHJlLWNvbXBpbGF0aW9uIGluIHdhdGNoIG1vZGVcbiAgZnVuY3Rpb24gZG9Db21waWxhdGlvbigpOiBEaWFnbm9zdGljcyB7XG4gICAgaWYgKCFjYWNoZWRPcHRpb25zKSB7XG4gICAgICBjYWNoZWRPcHRpb25zID0gaG9zdC5yZWFkQ29uZmlndXJhdGlvbigpO1xuICAgIH1cbiAgICBpZiAoY2FjaGVkT3B0aW9ucy5lcnJvcnMgJiYgY2FjaGVkT3B0aW9ucy5lcnJvcnMubGVuZ3RoKSB7XG4gICAgICBob3N0LnJlcG9ydERpYWdub3N0aWNzKGNhY2hlZE9wdGlvbnMuZXJyb3JzKTtcbiAgICAgIHJldHVybiBjYWNoZWRPcHRpb25zLmVycm9ycztcbiAgICB9XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICBpZiAoIWNhY2hlZENvbXBpbGVySG9zdCkge1xuICAgICAgY2FjaGVkQ29tcGlsZXJIb3N0ID0gaG9zdC5jcmVhdGVDb21waWxlckhvc3QoY2FjaGVkT3B0aW9ucy5vcHRpb25zKTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsV3JpdGVGaWxlQ2FsbGJhY2sgPSBjYWNoZWRDb21waWxlckhvc3Qud3JpdGVGaWxlO1xuICAgICAgY2FjaGVkQ29tcGlsZXJIb3N0LndyaXRlRmlsZSA9IGZ1bmN0aW9uKFxuICAgICAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgICAgIG9uRXJyb3I/OiAobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkLCBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPiA9IFtdKSB7XG4gICAgICAgIGlnbm9yZUZpbGVzRm9yV2F0Y2guYWRkKHBhdGgubm9ybWFsaXplKGZpbGVOYW1lKSk7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbFdyaXRlRmlsZUNhbGxiYWNrKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKTtcbiAgICAgIH07XG4gICAgICBjb25zdCBvcmlnaW5hbEZpbGVFeGlzdHMgPSBjYWNoZWRDb21waWxlckhvc3QuZmlsZUV4aXN0cztcbiAgICAgIGNhY2hlZENvbXBpbGVySG9zdC5maWxlRXhpc3RzID0gZnVuY3Rpb24oZmlsZU5hbWU6IHN0cmluZykge1xuICAgICAgICBjb25zdCBjZSA9IGNhY2hlRW50cnkoZmlsZU5hbWUpO1xuICAgICAgICBpZiAoY2UuZXhpc3RzID09IG51bGwpIHtcbiAgICAgICAgICBjZS5leGlzdHMgPSBvcmlnaW5hbEZpbGVFeGlzdHMuY2FsbCh0aGlzLCBmaWxlTmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNlLmV4aXN0cyE7XG4gICAgICB9O1xuICAgICAgY29uc3Qgb3JpZ2luYWxHZXRTb3VyY2VGaWxlID0gY2FjaGVkQ29tcGlsZXJIb3N0LmdldFNvdXJjZUZpbGU7XG4gICAgICBjYWNoZWRDb21waWxlckhvc3QuZ2V0U291cmNlRmlsZSA9IGZ1bmN0aW9uKFxuICAgICAgICAgIGZpbGVOYW1lOiBzdHJpbmcsIGxhbmd1YWdlVmVyc2lvbjogdHMuU2NyaXB0VGFyZ2V0KSB7XG4gICAgICAgIGNvbnN0IGNlID0gY2FjaGVFbnRyeShmaWxlTmFtZSk7XG4gICAgICAgIGlmICghY2Uuc2YpIHtcbiAgICAgICAgICBjZS5zZiA9IG9yaWdpbmFsR2V0U291cmNlRmlsZS5jYWxsKHRoaXMsIGZpbGVOYW1lLCBsYW5ndWFnZVZlcnNpb24pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjZS5zZiE7XG4gICAgICB9O1xuICAgICAgY29uc3Qgb3JpZ2luYWxSZWFkRmlsZSA9IGNhY2hlZENvbXBpbGVySG9zdC5yZWFkRmlsZTtcbiAgICAgIGNhY2hlZENvbXBpbGVySG9zdC5yZWFkRmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgY2UgPSBjYWNoZUVudHJ5KGZpbGVOYW1lKTtcbiAgICAgICAgaWYgKGNlLmNvbnRlbnQgPT0gbnVsbCkge1xuICAgICAgICAgIGNlLmNvbnRlbnQgPSBvcmlnaW5hbFJlYWRGaWxlLmNhbGwodGhpcywgZmlsZU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjZS5jb250ZW50ITtcbiAgICAgIH07XG4gICAgICAvLyBQcm92aWRlIGFjY2VzcyB0byB0aGUgZmlsZSBwYXRocyB0aGF0IHRyaWdnZXJlZCB0aGlzIHJlYnVpbGRcbiAgICAgIGNhY2hlZENvbXBpbGVySG9zdC5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uLm1vZGlmaWVkUmVzb3VyY2VGaWxlcztcbiAgICAgIH07XG4gICAgfVxuICAgIGlnbm9yZUZpbGVzRm9yV2F0Y2guY2xlYXIoKTtcbiAgICBjb25zdCBvbGRQcm9ncmFtID0gY2FjaGVkUHJvZ3JhbTtcbiAgICAvLyBXZSBjbGVhciBvdXQgdGhlIGBjYWNoZWRQcm9ncmFtYCBoZXJlIGFzIGFcbiAgICAvLyBwcm9ncmFtIGNhbiBvbmx5IGJlIHVzZWQgYXMgYG9sZFByb2dyYW1gIDF4XG4gICAgY2FjaGVkUHJvZ3JhbSA9IHVuZGVmaW5lZDtcbiAgICBjb25zdCBjb21waWxlUmVzdWx0ID0gcGVyZm9ybUNvbXBpbGF0aW9uKHtcbiAgICAgIHJvb3ROYW1lczogY2FjaGVkT3B0aW9ucy5yb290TmFtZXMsXG4gICAgICBvcHRpb25zOiBjYWNoZWRPcHRpb25zLm9wdGlvbnMsXG4gICAgICBob3N0OiBjYWNoZWRDb21waWxlckhvc3QsXG4gICAgICBvbGRQcm9ncmFtOiBvbGRQcm9ncmFtLFxuICAgICAgZW1pdENhbGxiYWNrOiBob3N0LmNyZWF0ZUVtaXRDYWxsYmFjayhjYWNoZWRPcHRpb25zLm9wdGlvbnMpXG4gICAgfSk7XG5cbiAgICBpZiAoY29tcGlsZVJlc3VsdC5kaWFnbm9zdGljcy5sZW5ndGgpIHtcbiAgICAgIGhvc3QucmVwb3J0RGlhZ25vc3RpY3MoY29tcGlsZVJlc3VsdC5kaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZW5kVGltZSA9IERhdGUubm93KCk7XG4gICAgaWYgKGNhY2hlZE9wdGlvbnMub3B0aW9ucy5kaWFnbm9zdGljcykge1xuICAgICAgY29uc3QgdG90YWxUaW1lID0gKGVuZFRpbWUgLSBzdGFydFRpbWUpIC8gMTAwMDtcbiAgICAgIGhvc3QucmVwb3J0RGlhZ25vc3RpY3MoW3RvdGFsQ29tcGlsYXRpb25UaW1lRGlhZ25vc3RpYyhlbmRUaW1lIC0gc3RhcnRUaW1lKV0pO1xuICAgIH1cbiAgICBjb25zdCBleGl0Q29kZSA9IGV4aXRDb2RlRnJvbVJlc3VsdChjb21waWxlUmVzdWx0LmRpYWdub3N0aWNzKTtcbiAgICBpZiAoZXhpdENvZGUgPT0gMCkge1xuICAgICAgY2FjaGVkUHJvZ3JhbSA9IGNvbXBpbGVSZXN1bHQucHJvZ3JhbTtcbiAgICAgIGhvc3QucmVwb3J0RGlhZ25vc3RpY3MoXG4gICAgICAgICAgW2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljKCdDb21waWxhdGlvbiBjb21wbGV0ZS4gV2F0Y2hpbmcgZm9yIGZpbGUgY2hhbmdlcy4nKV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBob3N0LnJlcG9ydERpYWdub3N0aWNzKFxuICAgICAgICAgIFtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYygnQ29tcGlsYXRpb24gZmFpbGVkLiBXYXRjaGluZyBmb3IgZmlsZSBjaGFuZ2VzLicpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbXBpbGVSZXN1bHQuZGlhZ25vc3RpY3M7XG4gIH1cblxuICBmdW5jdGlvbiByZXNldE9wdGlvbnMoKSB7XG4gICAgY2FjaGVkUHJvZ3JhbSA9IHVuZGVmaW5lZDtcbiAgICBjYWNoZWRDb21waWxlckhvc3QgPSB1bmRlZmluZWQ7XG4gICAgY2FjaGVkT3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdhdGNoZWRGaWxlQ2hhbmdlZChldmVudDogRmlsZUNoYW5nZUV2ZW50LCBmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3Qgbm9ybWFsaXplZFBhdGggPSBwYXRoLm5vcm1hbGl6ZShmaWxlTmFtZSk7XG5cbiAgICBpZiAoY2FjaGVkT3B0aW9ucyAmJiBldmVudCA9PT0gRmlsZUNoYW5nZUV2ZW50LkNoYW5nZSAmJlxuICAgICAgICAvLyBUT0RPKGNodWNraik6IHZhbGlkYXRlIHRoYXQgdGhpcyBpcyBzdWZmaWNpZW50IHRvIHNraXAgZmlsZXMgdGhhdCB3ZXJlIHdyaXR0ZW4uXG4gICAgICAgIC8vIFRoaXMgYXNzdW1lcyB0aGF0IHRoZSBmaWxlIHBhdGggd2Ugd3JpdGUgaXMgdGhlIHNhbWUgZmlsZSBwYXRoIHdlIHdpbGwgcmVjZWl2ZSBpbiB0aGVcbiAgICAgICAgLy8gY2hhbmdlIG5vdGlmaWNhdGlvbi5cbiAgICAgICAgbm9ybWFsaXplZFBhdGggPT09IHBhdGgubm9ybWFsaXplKGNhY2hlZE9wdGlvbnMucHJvamVjdCkpIHtcbiAgICAgIC8vIElmIHRoZSBjb25maWd1cmF0aW9uIGZpbGUgY2hhbmdlcywgZm9yZ2V0IGV2ZXJ5dGhpbmcgYW5kIHN0YXJ0IHRoZSByZWNvbXBpbGF0aW9uIHRpbWVyXG4gICAgICByZXNldE9wdGlvbnMoKTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBldmVudCA9PT0gRmlsZUNoYW5nZUV2ZW50LkNyZWF0ZURlbGV0ZSB8fCBldmVudCA9PT0gRmlsZUNoYW5nZUV2ZW50LkNyZWF0ZURlbGV0ZURpcikge1xuICAgICAgLy8gSWYgYSBmaWxlIHdhcyBhZGRlZCBvciByZW1vdmVkLCByZXJlYWQgdGhlIGNvbmZpZ3VyYXRpb25cbiAgICAgIC8vIHRvIGRldGVybWluZSB0aGUgbmV3IGxpc3Qgb2Ygcm9vdCBmaWxlcy5cbiAgICAgIGNhY2hlZE9wdGlvbnMgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50ID09PSBGaWxlQ2hhbmdlRXZlbnQuQ3JlYXRlRGVsZXRlRGlyKSB7XG4gICAgICBmaWxlQ2FjaGUuY2xlYXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlsZUNhY2hlLmRlbGV0ZShub3JtYWxpemVkUGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKCFpZ25vcmVGaWxlc0ZvcldhdGNoLmhhcyhub3JtYWxpemVkUGF0aCkpIHtcbiAgICAgIC8vIElnbm9yZSB0aGUgZmlsZSBpZiB0aGUgZmlsZSBpcyBvbmUgdGhhdCB3YXMgd3JpdHRlbiBieSB0aGUgY29tcGlsZXIuXG4gICAgICBzdGFydFRpbWVyRm9yUmVjb21waWxhdGlvbihub3JtYWxpemVkUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLy8gVXBvbiBkZXRlY3RpbmcgYSBmaWxlIGNoYW5nZSwgd2FpdCBmb3IgMjUwbXMgYW5kIHRoZW4gcGVyZm9ybSBhIHJlY29tcGlsYXRpb24uIFRoaXMgZ2l2ZXMgYmF0Y2hcbiAgLy8gb3BlcmF0aW9ucyAoc3VjaCBhcyBzYXZpbmcgYWxsIG1vZGlmaWVkIGZpbGVzIGluIGFuIGVkaXRvcikgYSBjaGFuY2UgdG8gY29tcGxldGUgYmVmb3JlIHdlIGtpY2tcbiAgLy8gb2ZmIGEgbmV3IGNvbXBpbGF0aW9uLlxuICBmdW5jdGlvbiBzdGFydFRpbWVyRm9yUmVjb21waWxhdGlvbihjaGFuZ2VkUGF0aDogc3RyaW5nKSB7XG4gICAgaWYgKHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbikge1xuICAgICAgaG9zdC5jbGVhclRpbWVvdXQodGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uLnRpbWVySGFuZGxlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGltZXJIYW5kbGVGb3JSZWNvbXBpbGF0aW9uID0ge1xuICAgICAgICBtb2RpZmllZFJlc291cmNlRmlsZXM6IG5ldyBTZXQ8c3RyaW5nPigpLFxuICAgICAgICB0aW1lckhhbmRsZTogdW5kZWZpbmVkXG4gICAgICB9O1xuICAgIH1cbiAgICB0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb24udGltZXJIYW5kbGUgPSBob3N0LnNldFRpbWVvdXQocmVjb21waWxlLCAyNTApO1xuICAgIHRpbWVySGFuZGxlRm9yUmVjb21waWxhdGlvbi5tb2RpZmllZFJlc291cmNlRmlsZXMuYWRkKGNoYW5nZWRQYXRoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlY29tcGlsZSgpIHtcbiAgICBob3N0LnJlcG9ydERpYWdub3N0aWNzKFxuICAgICAgICBbY3JlYXRlTWVzc2FnZURpYWdub3N0aWMoJ0ZpbGUgY2hhbmdlIGRldGVjdGVkLiBTdGFydGluZyBpbmNyZW1lbnRhbCBjb21waWxhdGlvbi4nKV0pO1xuICAgIGRvQ29tcGlsYXRpb24oKTtcbiAgICB0aW1lckhhbmRsZUZvclJlY29tcGlsYXRpb24gPSB1bmRlZmluZWQ7XG4gIH1cbn1cbiJdfQ==