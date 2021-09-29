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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/i18n", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/program_driver", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/typecheck/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgtscProgram = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var api = require("@angular/compiler-cli/src/transformers/api");
    var i18n_1 = require("@angular/compiler-cli/src/transformers/i18n");
    var typescript_support_1 = require("@angular/compiler-cli/src/typescript_support");
    var core_1 = require("@angular/compiler-cli/src/ngtsc/core");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var incremental_1 = require("@angular/compiler-cli/src/ngtsc/incremental");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var program_driver_1 = require("@angular/compiler-cli/src/ngtsc/program_driver");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    /**
     * Entrypoint to the Angular Compiler (Ivy+) which sits behind the `api.Program` interface, allowing
     * it to be a drop-in replacement for the legacy View Engine compiler to tooling such as the
     * command-line main() function or the Angular CLI.
     */
    var NgtscProgram = /** @class */ (function () {
        function NgtscProgram(rootNames, options, delegateHost, oldProgram) {
            var e_1, _a;
            var _this = this;
            this.options = options;
            var perfRecorder = perf_1.ActivePerfRecorder.zeroedToNow();
            perfRecorder.phase(perf_1.PerfPhase.Setup);
            // First, check whether the current TS version is supported.
            if (!options.disableTypeScriptVersionCheck) {
                (0, typescript_support_1.verifySupportedTypeScriptVersion)();
            }
            var reuseProgram = oldProgram === null || oldProgram === void 0 ? void 0 : oldProgram.compiler.getCurrentProgram();
            this.host = core_1.NgCompilerHost.wrap(delegateHost, rootNames, options, reuseProgram !== null && reuseProgram !== void 0 ? reuseProgram : null);
            if (reuseProgram !== undefined) {
                // Prior to reusing the old program, restore shim tagging for all its `ts.SourceFile`s.
                // TypeScript checks the `referencedFiles` of `ts.SourceFile`s for changes when evaluating
                // incremental reuse of data from the old program, so it's important that these match in order
                // to get the most benefit out of reuse.
                (0, shims_1.retagAllTsFiles)(reuseProgram);
            }
            this.tsProgram = perfRecorder.inPhase(perf_1.PerfPhase.TypeScriptProgramCreate, function () { return ts.createProgram(_this.host.inputFiles, options, _this.host, reuseProgram); });
            perfRecorder.phase(perf_1.PerfPhase.Unaccounted);
            perfRecorder.memory(perf_1.PerfCheckpoint.TypeScriptProgramCreate);
            this.host.postProgramCreationCleanup();
            // Shim tagging has served its purpose, and tags can now be removed from all `ts.SourceFile`s in
            // the program.
            (0, shims_1.untagAllTsFiles)(this.tsProgram);
            var programDriver = new program_driver_1.TsCreateProgramDriver(this.tsProgram, this.host, this.options, this.host.shimExtensionPrefixes);
            this.incrementalStrategy = oldProgram !== undefined ?
                oldProgram.incrementalStrategy.toNextBuildStrategy() :
                new incremental_1.TrackedIncrementalBuildStrategy();
            var modifiedResourceFiles = new Set();
            if (this.host.getModifiedResourceFiles !== undefined) {
                var strings = this.host.getModifiedResourceFiles();
                if (strings !== undefined) {
                    try {
                        for (var strings_1 = (0, tslib_1.__values)(strings), strings_1_1 = strings_1.next(); !strings_1_1.done; strings_1_1 = strings_1.next()) {
                            var fileString = strings_1_1.value;
                            modifiedResourceFiles.add((0, file_system_1.absoluteFrom)(fileString));
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (strings_1_1 && !strings_1_1.done && (_a = strings_1.return)) _a.call(strings_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            }
            var ticket;
            if (oldProgram === undefined) {
                ticket = (0, core_1.freshCompilationTicket)(this.tsProgram, options, this.incrementalStrategy, programDriver, perfRecorder, 
                /* enableTemplateTypeChecker */ false, /* usePoisonedData */ false);
            }
            else {
                ticket = (0, core_1.incrementalFromCompilerTicket)(oldProgram.compiler, this.tsProgram, this.incrementalStrategy, programDriver, modifiedResourceFiles, perfRecorder);
            }
            // Create the NgCompiler which will drive the rest of the compilation.
            this.compiler = core_1.NgCompiler.fromTicket(ticket, this.host);
        }
        NgtscProgram.prototype.getTsProgram = function () {
            return this.tsProgram;
        };
        NgtscProgram.prototype.getReuseTsProgram = function () {
            return this.compiler.getCurrentProgram();
        };
        NgtscProgram.prototype.getTsOptionDiagnostics = function (cancellationToken) {
            var _this = this;
            return this.compiler.perfRecorder.inPhase(perf_1.PerfPhase.TypeScriptDiagnostics, function () { return _this.tsProgram.getOptionsDiagnostics(cancellationToken); });
        };
        NgtscProgram.prototype.getTsSyntacticDiagnostics = function (sourceFile, cancellationToken) {
            var _this = this;
            return this.compiler.perfRecorder.inPhase(perf_1.PerfPhase.TypeScriptDiagnostics, function () {
                var e_2, _a;
                var ignoredFiles = _this.compiler.ignoreForDiagnostics;
                var res;
                if (sourceFile !== undefined) {
                    if (ignoredFiles.has(sourceFile)) {
                        return [];
                    }
                    res = _this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
                }
                else {
                    var diagnostics = [];
                    try {
                        for (var _b = (0, tslib_1.__values)(_this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var sf = _c.value;
                            if (!ignoredFiles.has(sf)) {
                                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(_this.tsProgram.getSyntacticDiagnostics(sf, cancellationToken)), false));
                            }
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    res = diagnostics;
                }
                return res;
            });
        };
        NgtscProgram.prototype.getTsSemanticDiagnostics = function (sourceFile, cancellationToken) {
            var _this = this;
            return this.compiler.perfRecorder.inPhase(perf_1.PerfPhase.TypeScriptDiagnostics, function () {
                var e_3, _a;
                var ignoredFiles = _this.compiler.ignoreForDiagnostics;
                var res;
                if (sourceFile !== undefined) {
                    if (ignoredFiles.has(sourceFile)) {
                        return [];
                    }
                    res = _this.tsProgram.getSemanticDiagnostics(sourceFile, cancellationToken);
                }
                else {
                    var diagnostics = [];
                    try {
                        for (var _b = (0, tslib_1.__values)(_this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var sf = _c.value;
                            if (!ignoredFiles.has(sf)) {
                                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(_this.tsProgram.getSemanticDiagnostics(sf, cancellationToken)), false));
                            }
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    res = diagnostics;
                }
                return res;
            });
        };
        NgtscProgram.prototype.getNgOptionDiagnostics = function (cancellationToken) {
            return this.compiler.getOptionDiagnostics();
        };
        NgtscProgram.prototype.getNgStructuralDiagnostics = function (cancellationToken) {
            return [];
        };
        NgtscProgram.prototype.getNgSemanticDiagnostics = function (fileName, cancellationToken) {
            var sf = undefined;
            if (fileName !== undefined) {
                sf = this.tsProgram.getSourceFile(fileName);
                if (sf === undefined) {
                    // There are no diagnostics for files which don't exist in the program - maybe the caller
                    // has stale data?
                    return [];
                }
            }
            if (sf === undefined) {
                return this.compiler.getDiagnostics();
            }
            else {
                return this.compiler.getDiagnosticsForFile(sf, api_1.OptimizeFor.WholeProgram);
            }
        };
        /**
         * Ensure that the `NgCompiler` has properly analyzed the program, and allow for the asynchronous
         * loading of any resources during the process.
         *
         * This is used by the Angular CLI to allow for spawning (async) child compilations for things
         * like SASS files used in `styleUrls`.
         */
        NgtscProgram.prototype.loadNgStructureAsync = function () {
            return this.compiler.analyzeAsync();
        };
        NgtscProgram.prototype.listLazyRoutes = function (entryRoute) {
            return [];
        };
        NgtscProgram.prototype.emitXi18n = function () {
            var _a, _b, _c;
            var ctx = new compiler_1.MessageBundle(new compiler_1.HtmlParser(), [], {}, (_a = this.options.i18nOutLocale) !== null && _a !== void 0 ? _a : null);
            this.compiler.xi18n(ctx);
            (0, i18n_1.i18nExtract)((_b = this.options.i18nOutFormat) !== null && _b !== void 0 ? _b : null, (_c = this.options.i18nOutFile) !== null && _c !== void 0 ? _c : null, this.host, this.options, ctx, file_system_1.resolve);
        };
        NgtscProgram.prototype.emit = function (opts) {
            var _this = this;
            // Check if emission of the i18n messages bundle was requested.
            if (opts !== undefined && opts.emitFlags !== undefined &&
                opts.emitFlags & api.EmitFlags.I18nBundle) {
                this.emitXi18n();
                // `api.EmitFlags` is a View Engine compiler concept. We only pay attention to the absence of
                // the other flags here if i18n emit was requested (since this is usually done in the xi18n
                // flow, where we don't want to emit JS at all).
                if (!(opts.emitFlags & api.EmitFlags.JS)) {
                    return {
                        diagnostics: [],
                        emitSkipped: true,
                        emittedFiles: [],
                    };
                }
            }
            this.compiler.perfRecorder.memory(perf_1.PerfCheckpoint.PreEmit);
            var res = this.compiler.perfRecorder.inPhase(perf_1.PerfPhase.TypeScriptEmit, function () {
                var e_4, _a;
                var transformers = _this.compiler.prepareEmit().transformers;
                var ignoreFiles = _this.compiler.ignoreForEmit;
                var emitCallback = opts && opts.emitCallback || defaultEmitCallback;
                var writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                    var e_5, _a;
                    if (sourceFiles !== undefined) {
                        try {
                            // Record successful writes for any `ts.SourceFile` (that's not a declaration file)
                            // that's an input to this write.
                            for (var sourceFiles_1 = (0, tslib_1.__values)(sourceFiles), sourceFiles_1_1 = sourceFiles_1.next(); !sourceFiles_1_1.done; sourceFiles_1_1 = sourceFiles_1.next()) {
                                var writtenSf = sourceFiles_1_1.value;
                                if (writtenSf.isDeclarationFile) {
                                    continue;
                                }
                                _this.compiler.incrementalCompilation.recordSuccessfulEmit(writtenSf);
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (sourceFiles_1_1 && !sourceFiles_1_1.done && (_a = sourceFiles_1.return)) _a.call(sourceFiles_1);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                    }
                    _this.host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
                };
                var customTransforms = opts && opts.customTransformers;
                var beforeTransforms = transformers.before || [];
                var afterDeclarationsTransforms = transformers.afterDeclarations;
                if (customTransforms !== undefined && customTransforms.beforeTs !== undefined) {
                    beforeTransforms.push.apply(beforeTransforms, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(customTransforms.beforeTs), false));
                }
                var emitResults = [];
                try {
                    for (var _b = (0, tslib_1.__values)(_this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var targetSourceFile = _c.value;
                        if (targetSourceFile.isDeclarationFile || ignoreFiles.has(targetSourceFile)) {
                            continue;
                        }
                        if (_this.compiler.incrementalCompilation.safeToSkipEmit(targetSourceFile)) {
                            _this.compiler.perfRecorder.eventCount(perf_1.PerfEvent.EmitSkipSourceFile);
                            continue;
                        }
                        _this.compiler.perfRecorder.eventCount(perf_1.PerfEvent.EmitSourceFile);
                        emitResults.push(emitCallback({
                            targetSourceFile: targetSourceFile,
                            program: _this.tsProgram,
                            host: _this.host,
                            options: _this.options,
                            emitOnlyDtsFiles: false,
                            writeFile: writeFile,
                            customTransformers: {
                                before: beforeTransforms,
                                after: customTransforms && customTransforms.afterTs,
                                afterDeclarations: afterDeclarationsTransforms,
                            },
                        }));
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                _this.compiler.perfRecorder.memory(perf_1.PerfCheckpoint.Emit);
                // Run the emit, including a custom transformer that will downlevel the Ivy decorators in
                // code.
                return ((opts && opts.mergeEmitResultsCallback) || mergeEmitResults)(emitResults);
            });
            // Record performance analysis information to disk if we've been asked to do so.
            if (this.options.tracePerformance !== undefined) {
                var perf = this.compiler.perfRecorder.finalize();
                (0, file_system_1.getFileSystem)().writeFile((0, file_system_1.getFileSystem)().resolve(this.options.tracePerformance), JSON.stringify(perf, null, 2));
            }
            return res;
        };
        NgtscProgram.prototype.getIndexedComponents = function () {
            return this.compiler.getIndexedComponents();
        };
        NgtscProgram.prototype.getLibrarySummaries = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.getEmittedGeneratedFiles = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.getEmittedSourceFiles = function () {
            throw new Error('Method not implemented.');
        };
        return NgtscProgram;
    }());
    exports.NgtscProgram = NgtscProgram;
    var defaultEmitCallback = function (_a) {
        var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, customTransformers = _a.customTransformers;
        return program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    };
    function mergeEmitResults(emitResults) {
        var e_6, _a;
        var diagnostics = [];
        var emitSkipped = false;
        var emittedFiles = [];
        try {
            for (var emitResults_1 = (0, tslib_1.__values)(emitResults), emitResults_1_1 = emitResults_1.next(); !emitResults_1_1.done; emitResults_1_1 = emitResults_1.next()) {
                var er = emitResults_1_1.value;
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(er.diagnostics), false));
                emitSkipped = emitSkipped || er.emitSkipped;
                emittedFiles.push.apply(emittedFiles, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)((er.emittedFiles || [])), false));
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (emitResults_1_1 && !emitResults_1_1.done && (_a = emitResults_1.return)) _a.call(emitResults_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return { diagnostics: diagnostics, emitSkipped: emitSkipped, emittedFiles: emittedFiles };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJFO0lBQzNFLCtCQUFpQztJQUVqQyxnRUFBMkM7SUFDM0Msb0VBQWlEO0lBQ2pELG1GQUF1RTtJQUV2RSw2REFBNEg7SUFFNUgsMkVBQW1GO0lBQ25GLDJFQUE4RDtJQUU5RCw2REFBa0c7SUFDbEcsaUZBQXVEO0lBRXZELCtEQUF5RDtJQUN6RCxxRUFBNEM7SUFFNUM7Ozs7T0FJRztJQUNIO1FBV0Usc0JBQ0ksU0FBZ0MsRUFBVSxPQUEwQixFQUNwRSxZQUE4QixFQUFFLFVBQXlCOztZQUY3RCxpQkF1RUM7WUF0RTZDLFlBQU8sR0FBUCxPQUFPLENBQW1CO1lBRXRFLElBQU0sWUFBWSxHQUFHLHlCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBRXRELFlBQVksQ0FBQyxLQUFLLENBQUMsZ0JBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVwQyw0REFBNEQ7WUFDNUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRTtnQkFDMUMsSUFBQSxxREFBZ0MsR0FBRSxDQUFDO2FBQ3BDO1lBRUQsSUFBTSxZQUFZLEdBQUcsVUFBVSxhQUFWLFVBQVUsdUJBQVYsVUFBVSxDQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzlELElBQUksQ0FBQyxJQUFJLEdBQUcscUJBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsWUFBWSxhQUFaLFlBQVksY0FBWixZQUFZLEdBQUksSUFBSSxDQUFDLENBQUM7WUFFeEYsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFO2dCQUM5Qix1RkFBdUY7Z0JBQ3ZGLDBGQUEwRjtnQkFDMUYsOEZB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QUFDO1FBQ3hDLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN4QixJQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7O1lBQ2xDLEtBQWlCLElBQUEsZ0JBQUEsc0JBQUEsV0FBVyxDQUFBLHdDQUFBLGlFQUFFO2dCQUF6QixJQUFNLEVBQUUsd0JBQUE7Z0JBQ1gsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxxREFBUyxFQUFFLENBQUMsV0FBVyxXQUFFO2dCQUNwQyxXQUFXLEdBQUcsV0FBVyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUM7Z0JBQzVDLFlBQVksQ0FBQyxJQUFJLE9BQWpCLFlBQVkscURBQVMsQ0FBQyxFQUFFLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxXQUFFO2FBQy9DOzs7Ozs7Ozs7UUFFRCxPQUFPLEVBQUMsV0FBVyxhQUFBLEVBQUUsV0FBVyxhQUFBLEVBQUUsWUFBWSxjQUFBLEVBQUMsQ0FBQztJQUNsRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7R2VuZXJhdGVkRmlsZSwgSHRtbFBhcnNlciwgTWVzc2FnZUJ1bmRsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7aTE4bkV4dHJhY3R9IGZyb20gJy4uL3RyYW5zZm9ybWVycy9pMThuJztcbmltcG9ydCB7dmVyaWZ5U3VwcG9ydGVkVHlwZVNjcmlwdFZlcnNpb259IGZyb20gJy4uL3R5cGVzY3JpcHRfc3VwcG9ydCc7XG5cbmltcG9ydCB7Q29tcGlsYXRpb25UaWNrZXQsIGZyZXNoQ29tcGlsYXRpb25UaWNrZXQsIGluY3JlbWVudGFsRnJvbUNvbXBpbGVyVGlja2V0LCBOZ0NvbXBpbGVyLCBOZ0NvbXBpbGVySG9zdH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7TmdDb21waWxlck9wdGlvbnN9IGZyb20gJy4vY29yZS9hcGknO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIEFic29sdXRlRnNQYXRoLCBnZXRGaWxlU3lzdGVtLCByZXNvbHZlfSBmcm9tICcuL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7VHJhY2tlZEluY3JlbWVudGFsQnVpbGRTdHJhdGVneX0gZnJvbSAnLi9pbmNyZW1lbnRhbCc7XG5pbXBvcnQge0luZGV4ZWRDb21wb25lbnR9IGZyb20gJy4vaW5kZXhlcic7XG5pbXBvcnQge0FjdGl2ZVBlcmZSZWNvcmRlciwgUGVyZkNoZWNrcG9pbnQgYXMgUGVyZkNoZWNrcG9pbnQsIFBlcmZFdmVudCwgUGVyZlBoYXNlfSBmcm9tICcuL3BlcmYnO1xuaW1wb3J0IHtUc0NyZWF0ZVByb2dyYW1Ecml2ZXJ9IGZyb20gJy4vcHJvZ3JhbV9kcml2ZXInO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGV9IGZyb20gJy4vcmVmbGVjdGlvbic7XG5pbXBvcnQge3JldGFnQWxsVHNGaWxlcywgdW50YWdBbGxUc0ZpbGVzfSBmcm9tICcuL3NoaW1zJztcbmltcG9ydCB7T3B0aW1pemVGb3J9IGZyb20gJy4vdHlwZWNoZWNrL2FwaSc7XG5cbi8qKlxuICogRW50cnlwb2ludCB0byB0aGUgQW5ndWxhciBDb21waWxlciAoSXZ5Kykgd2hpY2ggc2l0cyBiZWhpbmQgdGhlIGBhcGkuUHJvZ3JhbWAgaW50ZXJmYWNlLCBhbGxvd2luZ1xuICogaXQgdG8gYmUgYSBkcm9wLWluIHJlcGxhY2VtZW50IGZvciB0aGUgbGVnYWN5IFZpZXcgRW5naW5lIGNvbXBpbGVyIHRvIHRvb2xpbmcgc3VjaCBhcyB0aGVcbiAqIGNvbW1hbmQtbGluZSBtYWluKCkgZnVuY3Rpb24gb3IgdGhlIEFuZ3VsYXIgQ0xJLlxuICovXG5leHBvcnQgY2xhc3MgTmd0c2NQcm9ncmFtIGltcGxlbWVudHMgYXBpLlByb2dyYW0ge1xuICByZWFkb25seSBjb21waWxlcjogTmdDb21waWxlcjtcblxuICAvKipcbiAgICogVGhlIHByaW1hcnkgVHlwZVNjcmlwdCBwcm9ncmFtLCB3aGljaCBpcyB1c2VkIGZvciBhbmFseXNpcyBhbmQgZW1pdC5cbiAgICovXG4gIHByaXZhdGUgdHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuXG4gIHByaXZhdGUgaG9zdDogTmdDb21waWxlckhvc3Q7XG4gIHByaXZhdGUgaW5jcmVtZW50YWxTdHJhdGVneTogVHJhY2tlZEluY3JlbWVudGFsQnVpbGRTdHJhdGVneTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJvb3ROYW1lczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBwcml2YXRlIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgICAgZGVsZWdhdGVIb3N0OiBhcGkuQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogTmd0c2NQcm9ncmFtKSB7XG4gICAgY29uc3QgcGVyZlJlY29yZGVyID0gQWN0aXZlUGVyZlJlY29yZGVyLnplcm9lZFRvTm93KCk7XG5cbiAgICBwZXJmUmVjb3JkZXIucGhhc2UoUGVyZlBoYXNlLlNldHVwKTtcblxuICAgIC8vIEZpcnN0LCBjaGVjayB3aGV0aGVyIHRoZSBjdXJyZW50IFRTIHZlcnNpb24gaXMgc3VwcG9ydGVkLlxuICAgIGlmICghb3B0aW9ucy5kaXNhYmxlVHlwZVNjcmlwdFZlcnNpb25DaGVjaykge1xuICAgICAgdmVyaWZ5U3VwcG9ydGVkVHlwZVNjcmlwdFZlcnNpb24oKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXVzZVByb2dyYW0gPSBvbGRQcm9ncmFtPy5jb21waWxlci5nZXRDdXJyZW50UHJvZ3JhbSgpO1xuICAgIHRoaXMuaG9zdCA9IE5nQ29tcGlsZXJIb3N0LndyYXAoZGVsZWdhdGVIb3N0LCByb290TmFtZXMsIG9wdGlvbnMsIHJldXNlUHJvZ3JhbSA/PyBudWxsKTtcblxuICAgIGlmIChyZXVzZVByb2dyYW0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gUHJpb3IgdG8gcmV1c2luZyB0aGUgb2xkIHByb2dyYW0sIHJlc3RvcmUgc2hpbSB0YWdnaW5nIGZvciBhbGwgaXRzIGB0cy5Tb3VyY2VGaWxlYHMuXG4gICAgICAvLyBUeXBlU2NyaXB0IGNoZWNrcyB0aGUgYHJlZmVyZW5jZWRGaWxlc2Agb2YgYHRzLlNvdXJjZUZpbGVgcyBmb3IgY2hhbmdlcyB3aGVuIGV2YWx1YXRpbmdcbiAgICAgIC8vIGluY3JlbWVudGFsIHJldXNlIG9mIGRhdGEgZnJvbSB0aGUgb2xkIHByb2dyYW0sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgdGhlc2UgbWF0Y2ggaW4gb3JkZXJcbiAgICAgIC8vIHRvIGdldCB0aGUgbW9zdCBiZW5lZml0IG91dCBvZiByZXVzZS5cbiAgICAgIHJldGFnQWxsVHNGaWxlcyhyZXVzZVByb2dyYW0pO1xuICAgIH1cblxuICAgIHRoaXMudHNQcm9ncmFtID0gcGVyZlJlY29yZGVyLmluUGhhc2UoXG4gICAgICAgIFBlcmZQaGFzZS5UeXBlU2NyaXB0UHJvZ3JhbUNyZWF0ZSxcbiAgICAgICAgKCkgPT4gdHMuY3JlYXRlUHJvZ3JhbSh0aGlzLmhvc3QuaW5wdXRGaWxlcywgb3B0aW9ucywgdGhpcy5ob3N0LCByZXVzZVByb2dyYW0pKTtcblxuICAgIHBlcmZSZWNvcmRlci5waGFzZShQZXJmUGhhc2UuVW5hY2NvdW50ZWQpO1xuICAgIHBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuVHlwZVNjcmlwdFByb2dyYW1DcmVhdGUpO1xuXG4gICAgdGhpcy5ob3N0LnBvc3RQcm9ncmFtQ3JlYXRpb25DbGVhbnVwKCk7XG5cbiAgICAvLyBTaGltIHRhZ2dpbmcgaGFzIHNlcnZlZCBpdHMgcHVycG9zZSwgYW5kIHRhZ3MgY2FuIG5vdyBiZSByZW1vdmVkIGZyb20gYWxsIGB0cy5Tb3VyY2VGaWxlYHMgaW5cbiAgICAvLyB0aGUgcHJvZ3JhbS5cbiAgICB1bnRhZ0FsbFRzRmlsZXModGhpcy50c1Byb2dyYW0pO1xuXG4gICAgY29uc3QgcHJvZ3JhbURyaXZlciA9IG5ldyBUc0NyZWF0ZVByb2dyYW1Ecml2ZXIoXG4gICAgICAgIHRoaXMudHNQcm9ncmFtLCB0aGlzLmhvc3QsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LnNoaW1FeHRlbnNpb25QcmVmaXhlcyk7XG5cbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kgPSBvbGRQcm9ncmFtICE9PSB1bmRlZmluZWQgP1xuICAgICAgICBvbGRQcm9ncmFtLmluY3JlbWVudGFsU3RyYXRlZ3kudG9OZXh0QnVpbGRTdHJhdGVneSgpIDpcbiAgICAgICAgbmV3IFRyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3koKTtcbiAgICBjb25zdCBtb2RpZmllZFJlc291cmNlRmlsZXMgPSBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpO1xuICAgIGlmICh0aGlzLmhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHN0cmluZ3MgPSB0aGlzLmhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzKCk7XG4gICAgICBpZiAoc3RyaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGZvciAoY29uc3QgZmlsZVN0cmluZyBvZiBzdHJpbmdzKSB7XG4gICAgICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzLmFkZChhYnNvbHV0ZUZyb20oZmlsZVN0cmluZykpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHRpY2tldDogQ29tcGlsYXRpb25UaWNrZXQ7XG4gICAgaWYgKG9sZFByb2dyYW0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGlja2V0ID0gZnJlc2hDb21waWxhdGlvblRpY2tldChcbiAgICAgICAgICB0aGlzLnRzUHJvZ3JhbSwgb3B0aW9ucywgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LCBwcm9ncmFtRHJpdmVyLCBwZXJmUmVjb3JkZXIsXG4gICAgICAgICAgLyogZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciAqLyBmYWxzZSwgLyogdXNlUG9pc29uZWREYXRhICovIGZhbHNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGlja2V0ID0gaW5jcmVtZW50YWxGcm9tQ29tcGlsZXJUaWNrZXQoXG4gICAgICAgICAgb2xkUHJvZ3JhbS5jb21waWxlcixcbiAgICAgICAgICB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3ksXG4gICAgICAgICAgcHJvZ3JhbURyaXZlcixcbiAgICAgICAgICBtb2RpZmllZFJlc291cmNlRmlsZXMsXG4gICAgICAgICAgcGVyZlJlY29yZGVyLFxuICAgICAgKTtcbiAgICB9XG5cblxuICAgIC8vIENyZWF0ZSB0aGUgTmdDb21waWxlciB3aGljaCB3aWxsIGRyaXZlIHRoZSByZXN0IG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICB0aGlzLmNvbXBpbGVyID0gTmdDb21waWxlci5mcm9tVGlja2V0KHRpY2tldCwgdGhpcy5ob3N0KTtcbiAgfVxuXG4gIGdldFRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW07XG4gIH1cblxuICBnZXRSZXVzZVRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXRDdXJyZW50UHJvZ3JhbSgpO1xuICB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHJlYWRvbmx5IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLmluUGhhc2UoXG4gICAgICAgIFBlcmZQaGFzZS5UeXBlU2NyaXB0RGlhZ25vc3RpY3MsXG4gICAgICAgICgpID0+IHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbikpO1xuICB9XG5cbiAgZ2V0VHNTeW50YWN0aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuVHlwZVNjcmlwdERpYWdub3N0aWNzLCAoKSA9PiB7XG4gICAgICBjb25zdCBpZ25vcmVkRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmlnbm9yZUZvckRpYWdub3N0aWNzO1xuICAgICAgbGV0IHJlczogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoaWdub3JlZEZpbGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcyA9IHRoaXMudHNQcm9ncmFtLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgICAgaWYgKCFpZ25vcmVkRmlsZXMuaGFzKHNmKSkge1xuICAgICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzZiwgY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gZGlhZ25vc3RpY3M7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiByZWFkb25seSB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLnBlcmZSZWNvcmRlci5pblBoYXNlKFBlcmZQaGFzZS5UeXBlU2NyaXB0RGlhZ25vc3RpY3MsICgpID0+IHtcbiAgICAgIGNvbnN0IGlnbm9yZWRGaWxlcyA9IHRoaXMuY29tcGlsZXIuaWdub3JlRm9yRGlhZ25vc3RpY3M7XG4gICAgICBsZXQgcmVzOiByZWFkb25seSB0cy5EaWFnbm9zdGljW107XG4gICAgICBpZiAoc291cmNlRmlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChpZ25vcmVkRmlsZXMuaGFzKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzID0gdGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICAgIGlmICghaWdub3JlZEZpbGVzLmhhcyhzZikpIHtcbiAgICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzZiwgY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gZGlhZ25vc3RpY3M7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHJlYWRvbmx5KHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWMpW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldE9wdGlvbkRpYWdub3N0aWNzKCk7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiByZWFkb25seSBhcGkuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBmaWxlTmFtZT86IHN0cmluZ3x1bmRlZmluZWQsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTpcbiAgICAgIHJlYWRvbmx5KHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWMpW10ge1xuICAgIGxldCBzZjogdHMuU291cmNlRmlsZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKGZpbGVOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHNmID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBUaGVyZSBhcmUgbm8gZGlhZ25vc3RpY3MgZm9yIGZpbGVzIHdoaWNoIGRvbid0IGV4aXN0IGluIHRoZSBwcm9ncmFtIC0gbWF5YmUgdGhlIGNhbGxlclxuICAgICAgICAvLyBoYXMgc3RhbGUgZGF0YT9cbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXREaWFnbm9zdGljcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXREaWFnbm9zdGljc0ZvckZpbGUoc2YsIE9wdGltaXplRm9yLldob2xlUHJvZ3JhbSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEVuc3VyZSB0aGF0IHRoZSBgTmdDb21waWxlcmAgaGFzIHByb3Blcmx5IGFuYWx5emVkIHRoZSBwcm9ncmFtLCBhbmQgYWxsb3cgZm9yIHRoZSBhc3luY2hyb25vdXNcbiAgICogbG9hZGluZyBvZiBhbnkgcmVzb3VyY2VzIGR1cmluZyB0aGUgcHJvY2Vzcy5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIGJ5IHRoZSBBbmd1bGFyIENMSSB0byBhbGxvdyBmb3Igc3Bhd25pbmcgKGFzeW5jKSBjaGlsZCBjb21waWxhdGlvbnMgZm9yIHRoaW5nc1xuICAgKiBsaWtlIFNBU1MgZmlsZXMgdXNlZCBpbiBgc3R5bGVVcmxzYC5cbiAgICovXG4gIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmFuYWx5emVBc3luYygpO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZ3x1bmRlZmluZWQpOiBhcGkuTGF6eVJvdXRlW10ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIHByaXZhdGUgZW1pdFhpMThuKCk6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IG5ldyBNZXNzYWdlQnVuZGxlKG5ldyBIdG1sUGFyc2VyKCksIFtdLCB7fSwgdGhpcy5vcHRpb25zLmkxOG5PdXRMb2NhbGUgPz8gbnVsbCk7XG4gICAgdGhpcy5jb21waWxlci54aTE4bihjdHgpO1xuICAgIGkxOG5FeHRyYWN0KFxuICAgICAgICB0aGlzLm9wdGlvbnMuaTE4bk91dEZvcm1hdCA/PyBudWxsLCB0aGlzLm9wdGlvbnMuaTE4bk91dEZpbGUgPz8gbnVsbCwgdGhpcy5ob3N0LFxuICAgICAgICB0aGlzLm9wdGlvbnMsIGN0eCwgcmVzb2x2ZSk7XG4gIH1cblxuICBlbWl0KG9wdHM/OiB7XG4gICAgZW1pdEZsYWdzPzogYXBpLkVtaXRGbGFnc3x1bmRlZmluZWQ7XG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbiB8IHVuZGVmaW5lZDtcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBhcGkuQ3VzdG9tVHJhbnNmb3JtZXJzIHwgdW5kZWZpbmVkO1xuICAgIGVtaXRDYWxsYmFjaz86IGFwaS5Uc0VtaXRDYWxsYmFjayB8IHVuZGVmaW5lZDtcbiAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBhcGkuVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2sgfCB1bmRlZmluZWQ7XG4gIH18dW5kZWZpbmVkKTogdHMuRW1pdFJlc3VsdCB7XG4gICAgLy8gQ2hlY2sgaWYgZW1pc3Npb24gb2YgdGhlIGkxOG4gbWVzc2FnZXMgYnVuZGxlIHdhcyByZXF1ZXN0ZWQuXG4gICAgaWYgKG9wdHMgIT09IHVuZGVmaW5lZCAmJiBvcHRzLmVtaXRGbGFncyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIG9wdHMuZW1pdEZsYWdzICYgYXBpLkVtaXRGbGFncy5JMThuQnVuZGxlKSB7XG4gICAgICB0aGlzLmVtaXRYaTE4bigpO1xuXG4gICAgICAvLyBgYXBpLkVtaXRGbGFnc2AgaXMgYSBWaWV3IEVuZ2luZSBjb21waWxlciBjb25jZXB0LiBXZSBvbmx5IHBheSBhdHRlbnRpb24gdG8gdGhlIGFic2VuY2Ugb2ZcbiAgICAgIC8vIHRoZSBvdGhlciBmbGFncyBoZXJlIGlmIGkxOG4gZW1pdCB3YXMgcmVxdWVzdGVkIChzaW5jZSB0aGlzIGlzIHVzdWFsbHkgZG9uZSBpbiB0aGUgeGkxOG5cbiAgICAgIC8vIGZsb3csIHdoZXJlIHdlIGRvbid0IHdhbnQgdG8gZW1pdCBKUyBhdCBhbGwpLlxuICAgICAgaWYgKCEob3B0cy5lbWl0RmxhZ3MgJiBhcGkuRW1pdEZsYWdzLkpTKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGRpYWdub3N0aWNzOiBbXSxcbiAgICAgICAgICBlbWl0U2tpcHBlZDogdHJ1ZSxcbiAgICAgICAgICBlbWl0dGVkRmlsZXM6IFtdLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5QcmVFbWl0KTtcblxuICAgIGNvbnN0IHJlcyA9IHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLlR5cGVTY3JpcHRFbWl0LCAoKSA9PiB7XG4gICAgICBjb25zdCB7dHJhbnNmb3JtZXJzfSA9IHRoaXMuY29tcGlsZXIucHJlcGFyZUVtaXQoKTtcbiAgICAgIGNvbnN0IGlnbm9yZUZpbGVzID0gdGhpcy5jb21waWxlci5pZ25vcmVGb3JFbWl0O1xuICAgICAgY29uc3QgZW1pdENhbGxiYWNrID0gb3B0cyAmJiBvcHRzLmVtaXRDYWxsYmFjayB8fCBkZWZhdWx0RW1pdENhbGxiYWNrO1xuXG4gICAgICBjb25zdCB3cml0ZUZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgICAoZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHNvdXJjZUZpbGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgLy8gUmVjb3JkIHN1Y2Nlc3NmdWwgd3JpdGVzIGZvciBhbnkgYHRzLlNvdXJjZUZpbGVgICh0aGF0J3Mgbm90IGEgZGVjbGFyYXRpb24gZmlsZSlcbiAgICAgICAgICAgICAgLy8gdGhhdCdzIGFuIGlucHV0IHRvIHRoaXMgd3JpdGUuXG4gICAgICAgICAgICAgIGZvciAoY29uc3Qgd3JpdHRlblNmIG9mIHNvdXJjZUZpbGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdyaXR0ZW5TZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlci5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnJlY29yZFN1Y2Nlc3NmdWxFbWl0KHdyaXR0ZW5TZik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaG9zdC53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICAgICAgICAgIH07XG5cbiAgICAgIGNvbnN0IGN1c3RvbVRyYW5zZm9ybXMgPSBvcHRzICYmIG9wdHMuY3VzdG9tVHJhbnNmb3JtZXJzO1xuICAgICAgY29uc3QgYmVmb3JlVHJhbnNmb3JtcyA9IHRyYW5zZm9ybWVycy5iZWZvcmUgfHwgW107XG4gICAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMgPSB0cmFuc2Zvcm1lcnMuYWZ0ZXJEZWNsYXJhdGlvbnM7XG5cbiAgICAgIGlmIChjdXN0b21UcmFuc2Zvcm1zICE9PSB1bmRlZmluZWQgJiYgY3VzdG9tVHJhbnNmb3Jtcy5iZWZvcmVUcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaCguLi5jdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSA9IFtdO1xuXG4gICAgICBmb3IgKGNvbnN0IHRhcmdldFNvdXJjZUZpbGUgb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAodGFyZ2V0U291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSB8fCBpZ25vcmVGaWxlcy5oYXModGFyZ2V0U291cmNlRmlsZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmNvbXBpbGVyLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc2FmZVRvU2tpcEVtaXQodGFyZ2V0U291cmNlRmlsZSkpIHtcbiAgICAgICAgICB0aGlzLmNvbXBpbGVyLnBlcmZSZWNvcmRlci5ldmVudENvdW50KFBlcmZFdmVudC5FbWl0U2tpcFNvdXJjZUZpbGUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb21waWxlci5wZXJmUmVjb3JkZXIuZXZlbnRDb3VudChQZXJmRXZlbnQuRW1pdFNvdXJjZUZpbGUpO1xuXG4gICAgICAgIGVtaXRSZXN1bHRzLnB1c2goZW1pdENhbGxiYWNrKHtcbiAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLFxuICAgICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgICAgZW1pdE9ubHlEdHNGaWxlczogZmFsc2UsXG4gICAgICAgICAgd3JpdGVGaWxlLFxuICAgICAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczoge1xuICAgICAgICAgICAgYmVmb3JlOiBiZWZvcmVUcmFuc2Zvcm1zLFxuICAgICAgICAgICAgYWZ0ZXI6IGN1c3RvbVRyYW5zZm9ybXMgJiYgY3VzdG9tVHJhbnNmb3Jtcy5hZnRlclRzLFxuICAgICAgICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnM6IGFmdGVyRGVjbGFyYXRpb25zVHJhbnNmb3JtcyxcbiAgICAgICAgICB9IGFzIGFueSxcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNvbXBpbGVyLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuRW1pdCk7XG5cbiAgICAgIC8vIFJ1biB0aGUgZW1pdCwgaW5jbHVkaW5nIGEgY3VzdG9tIHRyYW5zZm9ybWVyIHRoYXQgd2lsbCBkb3dubGV2ZWwgdGhlIEl2eSBkZWNvcmF0b3JzIGluXG4gICAgICAvLyBjb2RlLlxuICAgICAgcmV0dXJuICgob3B0cyAmJiBvcHRzLm1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaykgfHwgbWVyZ2VFbWl0UmVzdWx0cykoZW1pdFJlc3VsdHMpO1xuICAgIH0pO1xuXG4gICAgLy8gUmVjb3JkIHBlcmZvcm1hbmNlIGFuYWx5c2lzIGluZm9ybWF0aW9uIHRvIGRpc2sgaWYgd2UndmUgYmVlbiBhc2tlZCB0byBkbyBzby5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgcGVyZiA9IHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLmZpbmFsaXplKCk7XG4gICAgICBnZXRGaWxlU3lzdGVtKCkud3JpdGVGaWxlKFxuICAgICAgICAgIGdldEZpbGVTeXN0ZW0oKS5yZXNvbHZlKHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlKSwgSlNPTi5zdHJpbmdpZnkocGVyZiwgbnVsbCwgMikpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgZ2V0SW5kZXhlZENvbXBvbmVudHMoKTogTWFwPERlY2xhcmF0aW9uTm9kZSwgSW5kZXhlZENvbXBvbmVudD4ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldEluZGV4ZWRDb21wb25lbnRzKCk7XG4gIH1cblxuICBnZXRMaWJyYXJ5U3VtbWFyaWVzKCk6IE1hcDxzdHJpbmcsIGFwaS5MaWJyYXJ5U3VtbWFyeT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRHZW5lcmF0ZWRGaWxlcygpOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0RW1pdHRlZFNvdXJjZUZpbGVzKCk6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cbn1cblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogYXBpLlRzRW1pdENhbGxiYWNrID0gKHtcbiAgcHJvZ3JhbSxcbiAgdGFyZ2V0U291cmNlRmlsZSxcbiAgd3JpdGVGaWxlLFxuICBjYW5jZWxsYXRpb25Ub2tlbixcbiAgZW1pdE9ubHlEdHNGaWxlcyxcbiAgY3VzdG9tVHJhbnNmb3JtZXJzXG59KSA9PlxuICAgIHByb2dyYW0uZW1pdChcbiAgICAgICAgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcywgY3VzdG9tVHJhbnNmb3JtZXJzKTtcblxuZnVuY3Rpb24gbWVyZ2VFbWl0UmVzdWx0cyhlbWl0UmVzdWx0czogdHMuRW1pdFJlc3VsdFtdKTogdHMuRW1pdFJlc3VsdCB7XG4gIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgbGV0IGVtaXRTa2lwcGVkID0gZmFsc2U7XG4gIGNvbnN0IGVtaXR0ZWRGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBlciBvZiBlbWl0UmVzdWx0cykge1xuICAgIGRpYWdub3N0aWNzLnB1c2goLi4uZXIuZGlhZ25vc3RpY3MpO1xuICAgIGVtaXRTa2lwcGVkID0gZW1pdFNraXBwZWQgfHwgZXIuZW1pdFNraXBwZWQ7XG4gICAgZW1pdHRlZEZpbGVzLnB1c2goLi4uKGVyLmVtaXR0ZWRGaWxlcyB8fCBbXSkpO1xuICB9XG5cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG4iXX0=