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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/program_driver", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/typecheck/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgtscProgram = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
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
                typescript_support_1.verifySupportedTypeScriptVersion();
            }
            this.closureCompilerEnabled = !!options.annotateForClosureCompiler;
            var reuseProgram = oldProgram === null || oldProgram === void 0 ? void 0 : oldProgram.reuseTsProgram;
            this.host = core_1.NgCompilerHost.wrap(delegateHost, rootNames, options, reuseProgram !== null && reuseProgram !== void 0 ? reuseProgram : null);
            if (reuseProgram !== undefined) {
                // Prior to reusing the old program, restore shim tagging for all its `ts.SourceFile`s.
                // TypeScript checks the `referencedFiles` of `ts.SourceFile`s for changes when evaluating
                // incremental reuse of data from the old program, so it's important that these match in order
                // to get the most benefit out of reuse.
                shims_1.retagAllTsFiles(reuseProgram);
            }
            this.tsProgram = perfRecorder.inPhase(perf_1.PerfPhase.TypeScriptProgramCreate, function () { return ts.createProgram(_this.host.inputFiles, options, _this.host, reuseProgram); });
            this.reuseTsProgram = this.tsProgram;
            perfRecorder.phase(perf_1.PerfPhase.Unaccounted);
            perfRecorder.memory(perf_1.PerfCheckpoint.TypeScriptProgramCreate);
            this.host.postProgramCreationCleanup();
            // Shim tagging has served its purpose, and tags can now be removed from all `ts.SourceFile`s in
            // the program.
            shims_1.untagAllTsFiles(this.tsProgram);
            var programDriver = new program_driver_1.TsCreateProgramDriver(this.tsProgram, this.host, this.options, this.host.shimExtensionPrefixes);
            this.incrementalStrategy = oldProgram !== undefined ?
                oldProgram.incrementalStrategy.toNextBuildStrategy() :
                new incremental_1.TrackedIncrementalBuildStrategy();
            var modifiedResourceFiles = new Set();
            if (this.host.getModifiedResourceFiles !== undefined) {
                var strings = this.host.getModifiedResourceFiles();
                if (strings !== undefined) {
                    try {
                        for (var strings_1 = tslib_1.__values(strings), strings_1_1 = strings_1.next(); !strings_1_1.done; strings_1_1 = strings_1.next()) {
                            var fileString = strings_1_1.value;
                            modifiedResourceFiles.add(file_system_1.absoluteFrom(fileString));
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
                ticket = core_1.freshCompilationTicket(this.tsProgram, options, this.incrementalStrategy, programDriver, perfRecorder, 
                /* enableTemplateTypeChecker */ false, /* usePoisonedData */ false);
            }
            else {
                ticket = core_1.incrementalFromCompilerTicket(oldProgram.compiler, this.tsProgram, this.incrementalStrategy, programDriver, modifiedResourceFiles, perfRecorder);
            }
            // Create the NgCompiler which will drive the rest of the compilation.
            this.compiler = core_1.NgCompiler.fromTicket(ticket, this.host);
        }
        NgtscProgram.prototype.getTsProgram = function () {
            return this.tsProgram;
        };
        NgtscProgram.prototype.getReuseTsProgram = function () {
            return this.reuseTsProgram;
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
                        for (var _b = tslib_1.__values(_this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var sf = _c.value;
                            if (!ignoredFiles.has(sf)) {
                                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(_this.tsProgram.getSyntacticDiagnostics(sf, cancellationToken))));
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
                        for (var _b = tslib_1.__values(_this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var sf = _c.value;
                            if (!ignoredFiles.has(sf)) {
                                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(_this.tsProgram.getSemanticDiagnostics(sf, cancellationToken))));
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
            var diagnostics = sf === undefined ?
                this.compiler.getDiagnostics() :
                this.compiler.getDiagnosticsForFile(sf, api_1.OptimizeFor.WholeProgram);
            this.reuseTsProgram = this.compiler.getCurrentProgram();
            return diagnostics;
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
            return this.compiler.listLazyRoutes(entryRoute);
        };
        NgtscProgram.prototype.emit = function (opts) {
            var _this = this;
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
                            for (var sourceFiles_1 = tslib_1.__values(sourceFiles), sourceFiles_1_1 = sourceFiles_1.next(); !sourceFiles_1_1.done; sourceFiles_1_1 = sourceFiles_1.next()) {
                                var writtenSf = sourceFiles_1_1.value;
                                if (writtenSf.isDeclarationFile) {
                                    continue;
                                }
                                _this.compiler.incrementalDriver.recordSuccessfulEmit(writtenSf);
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
                    beforeTransforms.push.apply(beforeTransforms, tslib_1.__spreadArray([], tslib_1.__read(customTransforms.beforeTs)));
                }
                var emitResults = [];
                try {
                    for (var _b = tslib_1.__values(_this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var targetSourceFile = _c.value;
                        if (targetSourceFile.isDeclarationFile || ignoreFiles.has(targetSourceFile)) {
                            continue;
                        }
                        if (_this.compiler.incrementalDriver.safeToSkipEmit(targetSourceFile)) {
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
                file_system_1.getFileSystem().writeFile(file_system_1.getFileSystem().resolve(this.options.tracePerformance), JSON.stringify(perf, null, 2));
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
            for (var emitResults_1 = tslib_1.__values(emitResults), emitResults_1_1 = emitResults_1.next(); !emitResults_1_1.done; emitResults_1_1 = emitResults_1.next()) {
                var er = emitResults_1_1.value;
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(er.diagnostics)));
                emitSkipped = emitSkipped || er.emitSkipped;
                emittedFiles.push.apply(emittedFiles, tslib_1.__spreadArray([], tslib_1.__read((er.emittedFiles || []))));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBR2pDLG1GQUF1RTtJQUV2RSw2REFBNEg7SUFFNUgsMkVBQTBFO0lBQzFFLDJFQUE4RDtJQUU5RCw2REFBa0c7SUFDbEcsaUZBQXVEO0lBRXZELCtEQUF5RDtJQUN6RCxxRUFBNEM7SUFJNUM7Ozs7T0FJRztJQUNIO1FBMEJFLHNCQUNJLFNBQWdDLEVBQVUsT0FBMEIsRUFDcEUsWUFBOEIsRUFBRSxVQUF5Qjs7WUFGN0QsaUJBMEVDO1lBekU2QyxZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQUV0RSxJQUFNLFlBQVksR0FBRyx5QkFBa0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUV0RCxZQUFZLENBQUMsS0FBSyxDQUFDLGdCQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFcEMsNERBQTREO1lBQzVELElBQUksQ0FBQyxPQUFPLENBQUMsNkJBQTZCLEVBQUU7Z0JBQzFDLHFEQUFnQyxFQUFFLENBQUM7YUFDcEM7WUFFRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQztZQUVuRSxJQUFNLFlBQVksR0FBRyxVQUFVLGFBQVYsVUFBVSx1QkFBVixVQUFVLENBQUUsY0FBYyxDQUFDO1lBQ2hELElBQUksQ0FBQyxJQUFJLEdBQUcscUJBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsWUFBWSxhQUFaLFlBQVksY0FBWixZQUFZLEdBQUksSUFBSSxDQUFDLENBQUM7WUFFeEYsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFO2dCQUM5Qix1RkFBdUY7Z0JBQ3ZGLDBGQUEwRjtnQkFDMUYsOEZBQThGO2dCQUM5Rix3Q0FBd0M7Z0JBQ3hDLHVCQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDL0I7WUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQ2pDLGdCQUFTLENBQUMsdUJBQXVCLEVBQ2pDLGNBQU0sT0FBQSxFQUFFLENBQUMsYUFBYSxDQUFDLEtBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxLQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxFQUF4RSxDQUF3RSxDQUFDLENBQUM7WUFDcEYsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBRXJDLFlBQVksQ0FBQyxLQUFLLENBQUMsZ0JBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMxQyxZQUFZLENBQUMsTUFBTSxDQUFDLHFCQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUU1RCxJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFFdkMsZ0dBQWdHO1lBQ2hHLGVBQWU7WUFDZix1QkFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVoQyxJQUFNLGFBQWEsR0FBRyxJQUFJLHNDQUFxQixDQUMzQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFFOUUsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFVBQVUsS0FBSyxTQUFTLENBQUMsQ0FBQztnQkFDakQsVUFBVSxDQUFDLG1CQUFtQixDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztnQkFDdEQsSUFBSSw2Q0FBK0IsRUFBRSxDQUFDO1lBQzFDLElBQU0scUJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7WUFDeEQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixLQUFLLFNBQVMsRUFBRTtnQkFDcEQsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUNyRCxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7O3dCQUN6QixLQUF5QixJQUFBLFlBQUEsaUJBQUEsT0FBTyxDQUFBLGdDQUFBLHFEQUFFOzRCQUE3QixJQUFNLFVBQVUsb0JBQUE7NEJBQ25CLHFCQUFxQixDQUFDLEdBQUcsQ0FBQywwQkFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7eUJBQ3JEOzs7Ozs7Ozs7aUJBQ0Y7YUFDRjtZQUVELElBQUksTUFBeUIsQ0FBQztZQUM5QixJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUU7Z0JBQzVCLE1BQU0sR0FBRyw2QkFBc0IsQ0FDM0IsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLGFBQWEsRUFBRSxZQUFZO2dCQUM5RSwrQkFBK0IsQ0FBQyxLQUFLLEVBQUUscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDekU7aUJBQU07Z0JBQ0wsTUFBTSxHQUFHLG9DQUE2QixDQUNsQyxVQUFVLENBQUMsUUFBUSxFQUNuQixJQUFJLENBQUMsU0FBUyxFQUNkLElBQUksQ0FBQyxtQkFBbUIsRUFDeEIsYUFBYSxFQUNiLHFCQUFxQixFQUNyQixZQUFZLENBQ2YsQ0FBQzthQUNIO1lBR0Qsc0VBQXNFO1lBQ3RFLElBQUksQ0FBQyxRQUFRLEdBQUcsaUJBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsbUNBQVksR0FBWjtZQUNFLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN4QixDQUFDO1FBRUQsd0NBQWlCLEdBQWpCO1lBQ0UsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQzdCLENBQUM7UUFFRCw2Q0FBc0IsR0FBdEIsVUFBdUIsaUJBQ1M7WUFEaEMsaUJBS0M7WUFIQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FDckMsZ0JBQVMsQ0FBQyxxQkFBcUIsRUFDL0IsY0FBTSxPQUFBLEtBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsRUFBdkQsQ0FBdUQsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxnREFBeUIsR0FBekIsVUFDSSxVQUFvQyxFQUNwQyxpQkFBa0Q7WUFGdEQsaUJBdUJDO1lBcEJDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLGdCQUFTLENBQUMscUJBQXFCLEVBQUU7O2dCQUN6RSxJQUFNLFlBQVksR0FBRyxLQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDO2dCQUN4RCxJQUFJLEdBQTZCLENBQUM7Z0JBQ2xDLElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRTtvQkFDNUIsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO3dCQUNoQyxPQUFPLEVBQUUsQ0FBQztxQkFDWDtvQkFFRCxHQUFHLEdBQUcsS0FBSSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztpQkFDN0U7cUJBQU07b0JBQ0wsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQzs7d0JBQ3hDLEtBQWlCLElBQUEsS0FBQSxpQkFBQSxLQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFBLGdCQUFBLDRCQUFFOzRCQUE3QyxJQUFNLEVBQUUsV0FBQTs0QkFDWCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQ0FDekIsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVywyQ0FBUyxLQUFJLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxJQUFFOzZCQUNwRjt5QkFDRjs7Ozs7Ozs7O29CQUNELEdBQUcsR0FBRyxXQUFXLENBQUM7aUJBQ25CO2dCQUNELE9BQU8sR0FBRyxDQUFDO1lBQ2IsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsK0NBQXdCLEdBQXhCLFVBQ0ksVUFBb0MsRUFDcEMsaUJBQWtEO1lBRnRELGlCQXVCQztZQXBCQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxnQkFBUyxDQUFDLHFCQUFxQixFQUFFOztnQkFDekUsSUFBTSxZQUFZLEdBQUcsS0FBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQztnQkFDeEQsSUFBSSxHQUE2QixDQUFDO2dCQUNsQyxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUU7b0JBQzVCLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTt3QkFDaEMsT0FBTyxFQUFFLENBQUM7cUJBQ1g7b0JBRUQsR0FBRyxHQUFHLEtBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsVUFBVSxFQUFFLGlCQUFpQixDQUFDLENBQUM7aUJBQzVFO3FCQUFNO29CQUNMLElBQU0sV0FBVyxHQUFvQixFQUFFLENBQUM7O3dCQUN4QyxLQUFpQixJQUFBLEtBQUEsaUJBQUEsS0FBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQSxnQkFBQSw0QkFBRTs0QkFBN0MsSUFBTSxFQUFFLFdBQUE7NEJBQ1gsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0NBQ3pCLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsMkNBQVMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsSUFBRTs2QkFDbkY7eUJBQ0Y7Ozs7Ozs7OztvQkFDRCxHQUFHLEdBQUcsV0FBVyxDQUFDO2lCQUNuQjtnQkFDRCxPQUFPLEdBQUcsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELDZDQUFzQixHQUF0QixVQUF1QixpQkFDUztZQUM5QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM5QyxDQUFDO1FBRUQsaURBQTBCLEdBQTFCLFVBQTJCLGlCQUNTO1lBQ2xDLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUVELCtDQUF3QixHQUF4QixVQUNJLFFBQTJCLEVBQUUsaUJBQWtEO1lBRWpGLElBQUksRUFBRSxHQUE0QixTQUFTLENBQUM7WUFDNUMsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFO2dCQUMxQixFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzVDLElBQUksRUFBRSxLQUFLLFNBQVMsRUFBRTtvQkFDcEIseUZBQXlGO29CQUN6RixrQkFBa0I7b0JBQ2xCLE9BQU8sRUFBRSxDQUFDO2lCQUNYO2FBQ0Y7WUFFRCxJQUFNLFdBQVcsR0FBRyxFQUFFLEtBQUssU0FBUyxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEVBQUUsaUJBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN0RSxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4RCxPQUFPLFdBQVcsQ0FBQztRQUNyQixDQUFDO1FBRUQ7Ozs7OztXQU1HO1FBQ0gsMkNBQW9CLEdBQXBCO1lBQ0UsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3RDLENBQUM7UUFFRCxxQ0FBYyxHQUFkLFVBQWUsVUFBNkI7WUFDMUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsMkJBQUksR0FBSixVQUFLLElBTU07WUFOWCxpQkFtRkM7WUE1RUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLHFCQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFMUQsSUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLGdCQUFTLENBQUMsY0FBYyxFQUFFOztnQkFDaEUsSUFBQSxZQUFZLEdBQUksS0FBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsYUFBL0IsQ0FBZ0M7Z0JBQ25ELElBQU0sV0FBVyxHQUFHLEtBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDO2dCQUNoRCxJQUFNLFlBQVksR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxtQkFBbUIsQ0FBQztnQkFFdEUsSUFBTSxTQUFTLEdBQ1gsVUFBQyxRQUFnQixFQUFFLElBQVksRUFBRSxrQkFBMkIsRUFDM0QsT0FBOEMsRUFDOUMsV0FBbUQ7O29CQUNsRCxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7OzRCQUM3QixtRkFBbUY7NEJBQ25GLGlDQUFpQzs0QkFDakMsS0FBd0IsSUFBQSxnQkFBQSxpQkFBQSxXQUFXLENBQUEsd0NBQUEsaUVBQUU7Z0NBQWhDLElBQU0sU0FBUyx3QkFBQTtnQ0FDbEIsSUFBSSxTQUFTLENBQUMsaUJBQWlCLEVBQUU7b0NBQy9CLFNBQVM7aUNBQ1Y7Z0NBRUQsS0FBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQzs2QkFDakU7Ozs7Ozs7OztxQkFDRjtvQkFDRCxLQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDaEYsQ0FBQyxDQUFDO2dCQUVOLElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztnQkFDekQsSUFBTSxnQkFBZ0IsR0FBRyxZQUFZLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQztnQkFDbkQsSUFBTSwyQkFBMkIsR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUM7Z0JBRW5FLElBQUksZ0JBQWdCLEtBQUssU0FBUyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsS0FBSyxTQUFTLEVBQUU7b0JBQzdFLGdCQUFnQixDQUFDLElBQUksT0FBckIsZ0JBQWdCLDJDQUFTLGdCQUFnQixDQUFDLFFBQVEsSUFBRTtpQkFDckQ7Z0JBRUQsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQzs7b0JBRXhDLEtBQStCLElBQUEsS0FBQSxpQkFBQSxLQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFBLGdCQUFBLDRCQUFFO3dCQUEzRCxJQUFNLGdCQUFnQixXQUFBO3dCQUN6QixJQUFJLGdCQUFnQixDQUFDLGlCQUFpQixJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRTs0QkFDM0UsU0FBUzt5QkFDVjt3QkFFRCxJQUFJLEtBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7NEJBQ3BFLEtBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxnQkFBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7NEJBQ3BFLFNBQVM7eUJBQ1Y7d0JBRUQsS0FBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLGdCQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7d0JBRWhFLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDOzRCQUM1QixnQkFBZ0Isa0JBQUE7NEJBQ2hCLE9BQU8sRUFBRSxLQUFJLENBQUMsU0FBUzs0QkFDdkIsSUFBSSxFQUFFLEtBQUksQ0FBQyxJQUFJOzRCQUNmLE9BQU8sRUFBRSxLQUFJLENBQUMsT0FBTzs0QkFDckIsZ0JBQWdCLEVBQUUsS0FBSzs0QkFDdkIsU0FBUyxXQUFBOzRCQUNULGtCQUFrQixFQUFFO2dDQUNsQixNQUFNLEVBQUUsZ0JBQWdCO2dDQUN4QixLQUFLLEVBQUUsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsT0FBTztnQ0FDbkQsaUJBQWlCLEVBQUUsMkJBQTJCOzZCQUN4Qzt5QkFDVCxDQUFDLENBQUMsQ0FBQztxQkFDTDs7Ozs7Ozs7O2dCQUVELEtBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxxQkFBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUV2RCx5RkFBeUY7Z0JBQ3pGLFFBQVE7Z0JBQ1IsT0FBTyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDcEYsQ0FBQyxDQUFDLENBQUM7WUFFSCxnRkFBZ0Y7WUFDaEYsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixLQUFLLFNBQVMsRUFBRTtnQkFDL0MsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25ELDJCQUFhLEVBQUUsQ0FBQyxTQUFTLENBQ3JCLDJCQUFhLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzVGO1lBQ0QsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBRUQsMkNBQW9CLEdBQXBCO1lBQ0UsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDOUMsQ0FBQztRQUVELDBDQUFtQixHQUFuQjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsK0NBQXdCLEdBQXhCO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCw0Q0FBcUIsR0FBckI7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUNILG1CQUFDO0lBQUQsQ0FBQyxBQXhURCxJQXdUQztJQXhUWSxvQ0FBWTtJQTBUekIsSUFBTSxtQkFBbUIsR0FBdUIsVUFBQyxFQU9oRDtZQU5DLE9BQU8sYUFBQSxFQUNQLGdCQUFnQixzQkFBQSxFQUNoQixTQUFTLGVBQUEsRUFDVCxpQkFBaUIsdUJBQUEsRUFDakIsZ0JBQWdCLHNCQUFBLEVBQ2hCLGtCQUFrQix3QkFBQTtRQUVoQixPQUFBLE9BQU8sQ0FBQyxJQUFJLENBQ1IsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDO0lBRHpGLENBQ3lGLENBQUM7SUFFOUYsU0FBUyxnQkFBZ0IsQ0FBQyxXQUE0Qjs7UUFDcEQsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztRQUN4QyxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDeEIsSUFBTSxZQUFZLEdBQWEsRUFBRSxDQUFDOztZQUNsQyxLQUFpQixJQUFBLGdCQUFBLGlCQUFBLFdBQVcsQ0FBQSx3Q0FBQSxpRUFBRTtnQkFBekIsSUFBTSxFQUFFLHdCQUFBO2dCQUNYLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsMkNBQVMsRUFBRSxDQUFDLFdBQVcsSUFBRTtnQkFDcEMsV0FBVyxHQUFHLFdBQVcsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDO2dCQUM1QyxZQUFZLENBQUMsSUFBSSxPQUFqQixZQUFZLDJDQUFTLENBQUMsRUFBRSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsSUFBRTthQUMvQzs7Ozs7Ozs7O1FBRUQsT0FBTyxFQUFDLFdBQVcsYUFBQSxFQUFFLFdBQVcsYUFBQSxFQUFFLFlBQVksY0FBQSxFQUFDLENBQUM7SUFDbEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0dlbmVyYXRlZEZpbGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnLi4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge3ZlcmlmeVN1cHBvcnRlZFR5cGVTY3JpcHRWZXJzaW9ufSBmcm9tICcuLi90eXBlc2NyaXB0X3N1cHBvcnQnO1xuXG5pbXBvcnQge0NvbXBpbGF0aW9uVGlja2V0LCBmcmVzaENvbXBpbGF0aW9uVGlja2V0LCBpbmNyZW1lbnRhbEZyb21Db21waWxlclRpY2tldCwgTmdDb21waWxlciwgTmdDb21waWxlckhvc3R9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQge05nQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL2NvcmUvYXBpJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBBYnNvbHV0ZUZzUGF0aCwgZ2V0RmlsZVN5c3RlbX0gZnJvbSAnLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1RyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3l9IGZyb20gJy4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtJbmRleGVkQ29tcG9uZW50fSBmcm9tICcuL2luZGV4ZXInO1xuaW1wb3J0IHtBY3RpdmVQZXJmUmVjb3JkZXIsIFBlcmZDaGVja3BvaW50IGFzIFBlcmZDaGVja3BvaW50LCBQZXJmRXZlbnQsIFBlcmZQaGFzZX0gZnJvbSAnLi9wZXJmJztcbmltcG9ydCB7VHNDcmVhdGVQcm9ncmFtRHJpdmVyfSBmcm9tICcuL3Byb2dyYW1fZHJpdmVyJztcbmltcG9ydCB7RGVjbGFyYXRpb25Ob2RlfSBmcm9tICcuL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtyZXRhZ0FsbFRzRmlsZXMsIHVudGFnQWxsVHNGaWxlc30gZnJvbSAnLi9zaGltcyc7XG5pbXBvcnQge09wdGltaXplRm9yfSBmcm9tICcuL3R5cGVjaGVjay9hcGknO1xuXG5cblxuLyoqXG4gKiBFbnRyeXBvaW50IHRvIHRoZSBBbmd1bGFyIENvbXBpbGVyIChJdnkrKSB3aGljaCBzaXRzIGJlaGluZCB0aGUgYGFwaS5Qcm9ncmFtYCBpbnRlcmZhY2UsIGFsbG93aW5nXG4gKiBpdCB0byBiZSBhIGRyb3AtaW4gcmVwbGFjZW1lbnQgZm9yIHRoZSBsZWdhY3kgVmlldyBFbmdpbmUgY29tcGlsZXIgdG8gdG9vbGluZyBzdWNoIGFzIHRoZVxuICogY29tbWFuZC1saW5lIG1haW4oKSBmdW5jdGlvbiBvciB0aGUgQW5ndWxhciBDTEkuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ3RzY1Byb2dyYW0gaW1wbGVtZW50cyBhcGkuUHJvZ3JhbSB7XG4gIHJlYWRvbmx5IGNvbXBpbGVyOiBOZ0NvbXBpbGVyO1xuXG4gIC8qKlxuICAgKiBUaGUgcHJpbWFyeSBUeXBlU2NyaXB0IHByb2dyYW0sIHdoaWNoIGlzIHVzZWQgZm9yIGFuYWx5c2lzIGFuZCBlbWl0LlxuICAgKi9cbiAgcHJpdmF0ZSB0c1Byb2dyYW06IHRzLlByb2dyYW07XG5cbiAgLyoqXG4gICAqIFRoZSBUeXBlU2NyaXB0IHByb2dyYW0gdG8gdXNlIGZvciB0aGUgbmV4dCBpbmNyZW1lbnRhbCBjb21waWxhdGlvbi5cbiAgICpcbiAgICogT25jZSBhIFRTIHByb2dyYW0gaXMgdXNlZCB0byBjcmVhdGUgYW5vdGhlciAoYW4gaW5jcmVtZW50YWwgY29tcGlsYXRpb24gb3BlcmF0aW9uKSwgaXQgY2FuIG5vXG4gICAqIGxvbmdlciBiZSB1c2VkIHRvIGRvIHNvIGFnYWluLlxuICAgKlxuICAgKiBTaW5jZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHVzZXMgdGhlIHByaW1hcnkgcHJvZ3JhbSB0byBjcmVhdGUgYSB0eXBlLWNoZWNraW5nIHByb2dyYW0sIGFmdGVyXG4gICAqIHRoaXMgaGFwcGVucyB0aGUgcHJpbWFyeSBwcm9ncmFtIGlzIG5vIGxvbmdlciBzdWl0YWJsZSBmb3Igc3RhcnRpbmcgYSBzdWJzZXF1ZW50IGNvbXBpbGF0aW9uLFxuICAgKiBhbmQgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBUaHVzLCB0aGUgcHJvZ3JhbSB3aGljaCBzaG91bGQgYmUgdXNlZCBmb3IgdGhlIG5leHQgaW5jcmVtZW50YWwgY29tcGlsYXRpb24gaXMgdHJhY2tlZCBpblxuICAgKiBgcmV1c2VUc1Byb2dyYW1gLCBzZXBhcmF0ZWx5IGZyb20gdGhlIFwicHJpbWFyeVwiIHByb2dyYW0gd2hpY2ggaXMgYWx3YXlzIHVzZWQgZm9yIGVtaXQuXG4gICAqL1xuICBwcml2YXRlIHJldXNlVHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgaG9zdDogTmdDb21waWxlckhvc3Q7XG4gIHByaXZhdGUgaW5jcmVtZW50YWxTdHJhdGVneTogVHJhY2tlZEluY3JlbWVudGFsQnVpbGRTdHJhdGVneTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJvb3ROYW1lczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBwcml2YXRlIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgICAgZGVsZWdhdGVIb3N0OiBhcGkuQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogTmd0c2NQcm9ncmFtKSB7XG4gICAgY29uc3QgcGVyZlJlY29yZGVyID0gQWN0aXZlUGVyZlJlY29yZGVyLnplcm9lZFRvTm93KCk7XG5cbiAgICBwZXJmUmVjb3JkZXIucGhhc2UoUGVyZlBoYXNlLlNldHVwKTtcblxuICAgIC8vIEZpcnN0LCBjaGVjayB3aGV0aGVyIHRoZSBjdXJyZW50IFRTIHZlcnNpb24gaXMgc3VwcG9ydGVkLlxuICAgIGlmICghb3B0aW9ucy5kaXNhYmxlVHlwZVNjcmlwdFZlcnNpb25DaGVjaykge1xuICAgICAgdmVyaWZ5U3VwcG9ydGVkVHlwZVNjcmlwdFZlcnNpb24oKTtcbiAgICB9XG5cbiAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgPSAhIW9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI7XG5cbiAgICBjb25zdCByZXVzZVByb2dyYW0gPSBvbGRQcm9ncmFtPy5yZXVzZVRzUHJvZ3JhbTtcbiAgICB0aGlzLmhvc3QgPSBOZ0NvbXBpbGVySG9zdC53cmFwKGRlbGVnYXRlSG9zdCwgcm9vdE5hbWVzLCBvcHRpb25zLCByZXVzZVByb2dyYW0gPz8gbnVsbCk7XG5cbiAgICBpZiAocmV1c2VQcm9ncmFtICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFByaW9yIHRvIHJldXNpbmcgdGhlIG9sZCBwcm9ncmFtLCByZXN0b3JlIHNoaW0gdGFnZ2luZyBmb3IgYWxsIGl0cyBgdHMuU291cmNlRmlsZWBzLlxuICAgICAgLy8gVHlwZVNjcmlwdCBjaGVja3MgdGhlIGByZWZlcmVuY2VkRmlsZXNgIG9mIGB0cy5Tb3VyY2VGaWxlYHMgZm9yIGNoYW5nZXMgd2hlbiBldmFsdWF0aW5nXG4gICAgICAvLyBpbmNyZW1lbnRhbCByZXVzZSBvZiBkYXRhIGZyb20gdGhlIG9sZCBwcm9ncmFtLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IHRoZXNlIG1hdGNoIGluIG9yZGVyXG4gICAgICAvLyB0byBnZXQgdGhlIG1vc3QgYmVuZWZpdCBvdXQgb2YgcmV1c2UuXG4gICAgICByZXRhZ0FsbFRzRmlsZXMocmV1c2VQcm9ncmFtKTtcbiAgICB9XG5cbiAgICB0aGlzLnRzUHJvZ3JhbSA9IHBlcmZSZWNvcmRlci5pblBoYXNlKFxuICAgICAgICBQZXJmUGhhc2UuVHlwZVNjcmlwdFByb2dyYW1DcmVhdGUsXG4gICAgICAgICgpID0+IHRzLmNyZWF0ZVByb2dyYW0odGhpcy5ob3N0LmlucHV0RmlsZXMsIG9wdGlvbnMsIHRoaXMuaG9zdCwgcmV1c2VQcm9ncmFtKSk7XG4gICAgdGhpcy5yZXVzZVRzUHJvZ3JhbSA9IHRoaXMudHNQcm9ncmFtO1xuXG4gICAgcGVyZlJlY29yZGVyLnBoYXNlKFBlcmZQaGFzZS5VbmFjY291bnRlZCk7XG4gICAgcGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5UeXBlU2NyaXB0UHJvZ3JhbUNyZWF0ZSk7XG5cbiAgICB0aGlzLmhvc3QucG9zdFByb2dyYW1DcmVhdGlvbkNsZWFudXAoKTtcblxuICAgIC8vIFNoaW0gdGFnZ2luZyBoYXMgc2VydmVkIGl0cyBwdXJwb3NlLCBhbmQgdGFncyBjYW4gbm93IGJlIHJlbW92ZWQgZnJvbSBhbGwgYHRzLlNvdXJjZUZpbGVgcyBpblxuICAgIC8vIHRoZSBwcm9ncmFtLlxuICAgIHVudGFnQWxsVHNGaWxlcyh0aGlzLnRzUHJvZ3JhbSk7XG5cbiAgICBjb25zdCBwcm9ncmFtRHJpdmVyID0gbmV3IFRzQ3JlYXRlUHJvZ3JhbURyaXZlcihcbiAgICAgICAgdGhpcy50c1Byb2dyYW0sIHRoaXMuaG9zdCwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3Quc2hpbUV4dGVuc2lvblByZWZpeGVzKTtcblxuICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneSA9IG9sZFByb2dyYW0gIT09IHVuZGVmaW5lZCA/XG4gICAgICAgIG9sZFByb2dyYW0uaW5jcmVtZW50YWxTdHJhdGVneS50b05leHRCdWlsZFN0cmF0ZWd5KCkgOlxuICAgICAgICBuZXcgVHJhY2tlZEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSgpO1xuICAgIGNvbnN0IG1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCk7XG4gICAgaWYgKHRoaXMuaG9zdC5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3Qgc3RyaW5ncyA9IHRoaXMuaG9zdC5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMoKTtcbiAgICAgIGlmIChzdHJpbmdzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBmaWxlU3RyaW5nIG9mIHN0cmluZ3MpIHtcbiAgICAgICAgICBtb2RpZmllZFJlc291cmNlRmlsZXMuYWRkKGFic29sdXRlRnJvbShmaWxlU3RyaW5nKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgdGlja2V0OiBDb21waWxhdGlvblRpY2tldDtcbiAgICBpZiAob2xkUHJvZ3JhbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aWNrZXQgPSBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgICAgICAgIHRoaXMudHNQcm9ncmFtLCBvcHRpb25zLCB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXIsIHBlcmZSZWNvcmRlcixcbiAgICAgICAgICAvKiBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyICovIGZhbHNlLCAvKiB1c2VQb2lzb25lZERhdGEgKi8gZmFsc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aWNrZXQgPSBpbmNyZW1lbnRhbEZyb21Db21waWxlclRpY2tldChcbiAgICAgICAgICBvbGRQcm9ncmFtLmNvbXBpbGVyLFxuICAgICAgICAgIHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneSxcbiAgICAgICAgICBwcm9ncmFtRHJpdmVyLFxuICAgICAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcyxcbiAgICAgICAgICBwZXJmUmVjb3JkZXIsXG4gICAgICApO1xuICAgIH1cblxuXG4gICAgLy8gQ3JlYXRlIHRoZSBOZ0NvbXBpbGVyIHdoaWNoIHdpbGwgZHJpdmUgdGhlIHJlc3Qgb2YgdGhlIGNvbXBpbGF0aW9uLlxuICAgIHRoaXMuY29tcGlsZXIgPSBOZ0NvbXBpbGVyLmZyb21UaWNrZXQodGlja2V0LCB0aGlzLmhvc3QpO1xuICB9XG5cbiAgZ2V0VHNQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbTtcbiAgfVxuXG4gIGdldFJldXNlVHNQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLnJldXNlVHNQcm9ncmFtO1xuICB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHJlYWRvbmx5IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLmluUGhhc2UoXG4gICAgICAgIFBlcmZQaGFzZS5UeXBlU2NyaXB0RGlhZ25vc3RpY3MsXG4gICAgICAgICgpID0+IHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbikpO1xuICB9XG5cbiAgZ2V0VHNTeW50YWN0aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuVHlwZVNjcmlwdERpYWdub3N0aWNzLCAoKSA9PiB7XG4gICAgICBjb25zdCBpZ25vcmVkRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmlnbm9yZUZvckRpYWdub3N0aWNzO1xuICAgICAgbGV0IHJlczogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoaWdub3JlZEZpbGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcyA9IHRoaXMudHNQcm9ncmFtLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgICAgaWYgKCFpZ25vcmVkRmlsZXMuaGFzKHNmKSkge1xuICAgICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzZiwgY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gZGlhZ25vc3RpY3M7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiByZWFkb25seSB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLnBlcmZSZWNvcmRlci5pblBoYXNlKFBlcmZQaGFzZS5UeXBlU2NyaXB0RGlhZ25vc3RpY3MsICgpID0+IHtcbiAgICAgIGNvbnN0IGlnbm9yZWRGaWxlcyA9IHRoaXMuY29tcGlsZXIuaWdub3JlRm9yRGlhZ25vc3RpY3M7XG4gICAgICBsZXQgcmVzOiByZWFkb25seSB0cy5EaWFnbm9zdGljW107XG4gICAgICBpZiAoc291cmNlRmlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChpZ25vcmVkRmlsZXMuaGFzKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzID0gdGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICAgIGlmICghaWdub3JlZEZpbGVzLmhhcyhzZikpIHtcbiAgICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzZiwgY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gZGlhZ25vc3RpY3M7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHJlYWRvbmx5KHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWMpW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldE9wdGlvbkRpYWdub3N0aWNzKCk7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiByZWFkb25seSBhcGkuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBmaWxlTmFtZT86IHN0cmluZ3x1bmRlZmluZWQsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTpcbiAgICAgIHJlYWRvbmx5KHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWMpW10ge1xuICAgIGxldCBzZjogdHMuU291cmNlRmlsZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKGZpbGVOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHNmID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBUaGVyZSBhcmUgbm8gZGlhZ25vc3RpY3MgZm9yIGZpbGVzIHdoaWNoIGRvbid0IGV4aXN0IGluIHRoZSBwcm9ncmFtIC0gbWF5YmUgdGhlIGNhbGxlclxuICAgICAgICAvLyBoYXMgc3RhbGUgZGF0YT9cbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gc2YgPT09IHVuZGVmaW5lZCA/XG4gICAgICAgIHRoaXMuY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3MoKSA6XG4gICAgICAgIHRoaXMuY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmLCBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW0pO1xuICAgIHRoaXMucmV1c2VUc1Byb2dyYW0gPSB0aGlzLmNvbXBpbGVyLmdldEN1cnJlbnRQcm9ncmFtKCk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEVuc3VyZSB0aGF0IHRoZSBgTmdDb21waWxlcmAgaGFzIHByb3Blcmx5IGFuYWx5emVkIHRoZSBwcm9ncmFtLCBhbmQgYWxsb3cgZm9yIHRoZSBhc3luY2hyb25vdXNcbiAgICogbG9hZGluZyBvZiBhbnkgcmVzb3VyY2VzIGR1cmluZyB0aGUgcHJvY2Vzcy5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIGJ5IHRoZSBBbmd1bGFyIENMSSB0byBhbGxvdyBmb3Igc3Bhd25pbmcgKGFzeW5jKSBjaGlsZCBjb21waWxhdGlvbnMgZm9yIHRoaW5nc1xuICAgKiBsaWtlIFNBU1MgZmlsZXMgdXNlZCBpbiBgc3R5bGVVcmxzYC5cbiAgICovXG4gIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmFuYWx5emVBc3luYygpO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZ3x1bmRlZmluZWQpOiBhcGkuTGF6eVJvdXRlW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGUpO1xuICB9XG5cbiAgZW1pdChvcHRzPzoge1xuICAgIGVtaXRGbGFncz86IGFwaS5FbWl0RmxhZ3N8dW5kZWZpbmVkO1xuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4gfCB1bmRlZmluZWQ7XG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycyB8IHVuZGVmaW5lZDtcbiAgICBlbWl0Q2FsbGJhY2s/OiBhcGkuVHNFbWl0Q2FsbGJhY2sgfCB1bmRlZmluZWQ7XG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogYXBpLlRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrIHwgdW5kZWZpbmVkO1xuICB9fHVuZGVmaW5lZCk6IHRzLkVtaXRSZXN1bHQge1xuICAgIHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5QcmVFbWl0KTtcblxuICAgIGNvbnN0IHJlcyA9IHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLlR5cGVTY3JpcHRFbWl0LCAoKSA9PiB7XG4gICAgICBjb25zdCB7dHJhbnNmb3JtZXJzfSA9IHRoaXMuY29tcGlsZXIucHJlcGFyZUVtaXQoKTtcbiAgICAgIGNvbnN0IGlnbm9yZUZpbGVzID0gdGhpcy5jb21waWxlci5pZ25vcmVGb3JFbWl0O1xuICAgICAgY29uc3QgZW1pdENhbGxiYWNrID0gb3B0cyAmJiBvcHRzLmVtaXRDYWxsYmFjayB8fCBkZWZhdWx0RW1pdENhbGxiYWNrO1xuXG4gICAgICBjb25zdCB3cml0ZUZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgICAoZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKXx1bmRlZmluZWQsXG4gICAgICAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZCkgPT4ge1xuICAgICAgICAgICAgaWYgKHNvdXJjZUZpbGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgLy8gUmVjb3JkIHN1Y2Nlc3NmdWwgd3JpdGVzIGZvciBhbnkgYHRzLlNvdXJjZUZpbGVgICh0aGF0J3Mgbm90IGEgZGVjbGFyYXRpb24gZmlsZSlcbiAgICAgICAgICAgICAgLy8gdGhhdCdzIGFuIGlucHV0IHRvIHRoaXMgd3JpdGUuXG4gICAgICAgICAgICAgIGZvciAoY29uc3Qgd3JpdHRlblNmIG9mIHNvdXJjZUZpbGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdyaXR0ZW5TZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5jb21waWxlci5pbmNyZW1lbnRhbERyaXZlci5yZWNvcmRTdWNjZXNzZnVsRW1pdCh3cml0dGVuU2YpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhvc3Qud3JpdGVGaWxlKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKTtcbiAgICAgICAgICB9O1xuXG4gICAgICBjb25zdCBjdXN0b21UcmFuc2Zvcm1zID0gb3B0cyAmJiBvcHRzLmN1c3RvbVRyYW5zZm9ybWVycztcbiAgICAgIGNvbnN0IGJlZm9yZVRyYW5zZm9ybXMgPSB0cmFuc2Zvcm1lcnMuYmVmb3JlIHx8IFtdO1xuICAgICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zID0gdHJhbnNmb3JtZXJzLmFmdGVyRGVjbGFyYXRpb25zO1xuXG4gICAgICBpZiAoY3VzdG9tVHJhbnNmb3JtcyAhPT0gdW5kZWZpbmVkICYmIGN1c3RvbVRyYW5zZm9ybXMuYmVmb3JlVHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goLi4uY3VzdG9tVHJhbnNmb3Jtcy5iZWZvcmVUcyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10gPSBbXTtcblxuICAgICAgZm9yIChjb25zdCB0YXJnZXRTb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgaWYgKHRhcmdldFNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaWdub3JlRmlsZXMuaGFzKHRhcmdldFNvdXJjZUZpbGUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jb21waWxlci5pbmNyZW1lbnRhbERyaXZlci5zYWZlVG9Ta2lwRW1pdCh0YXJnZXRTb3VyY2VGaWxlKSkge1xuICAgICAgICAgIHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLmV2ZW50Q291bnQoUGVyZkV2ZW50LkVtaXRTa2lwU291cmNlRmlsZSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbXBpbGVyLnBlcmZSZWNvcmRlci5ldmVudENvdW50KFBlcmZFdmVudC5FbWl0U291cmNlRmlsZSk7XG5cbiAgICAgICAgZW1pdFJlc3VsdHMucHVzaChlbWl0Q2FsbGJhY2soe1xuICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgICBlbWl0T25seUR0c0ZpbGVzOiBmYWxzZSxcbiAgICAgICAgICB3cml0ZUZpbGUsXG4gICAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgICBiZWZvcmU6IGJlZm9yZVRyYW5zZm9ybXMsXG4gICAgICAgICAgICBhZnRlcjogY3VzdG9tVHJhbnNmb3JtcyAmJiBjdXN0b21UcmFuc2Zvcm1zLmFmdGVyVHMsXG4gICAgICAgICAgICBhZnRlckRlY2xhcmF0aW9uczogYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zLFxuICAgICAgICAgIH0gYXMgYW55LFxuICAgICAgICB9KSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5FbWl0KTtcblxuICAgICAgLy8gUnVuIHRoZSBlbWl0LCBpbmNsdWRpbmcgYSBjdXN0b20gdHJhbnNmb3JtZXIgdGhhdCB3aWxsIGRvd25sZXZlbCB0aGUgSXZ5IGRlY29yYXRvcnMgaW5cbiAgICAgIC8vIGNvZGUuXG4gICAgICByZXR1cm4gKChvcHRzICYmIG9wdHMubWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrKSB8fCBtZXJnZUVtaXRSZXN1bHRzKShlbWl0UmVzdWx0cyk7XG4gICAgfSk7XG5cbiAgICAvLyBSZWNvcmQgcGVyZm9ybWFuY2UgYW5hbHlzaXMgaW5mb3JtYXRpb24gdG8gZGlzayBpZiB3ZSd2ZSBiZWVuIGFza2VkIHRvIGRvIHNvLlxuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhY2VQZXJmb3JtYW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBwZXJmID0gdGhpcy5jb21waWxlci5wZXJmUmVjb3JkZXIuZmluYWxpemUoKTtcbiAgICAgIGdldEZpbGVTeXN0ZW0oKS53cml0ZUZpbGUoXG4gICAgICAgICAgZ2V0RmlsZVN5c3RlbSgpLnJlc29sdmUodGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UpLCBKU09OLnN0cmluZ2lmeShwZXJmLCBudWxsLCAyKSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBnZXRJbmRleGVkQ29tcG9uZW50cygpOiBNYXA8RGVjbGFyYXRpb25Ob2RlLCBJbmRleGVkQ29tcG9uZW50PiB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0SW5kZXhlZENvbXBvbmVudHMoKTtcbiAgfVxuXG4gIGdldExpYnJhcnlTdW1tYXJpZXMoKTogTWFwPHN0cmluZywgYXBpLkxpYnJhcnlTdW1tYXJ5PiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk6IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxufVxuXG5jb25zdCBkZWZhdWx0RW1pdENhbGxiYWNrOiBhcGkuVHNFbWl0Q2FsbGJhY2sgPSAoe1xuICBwcm9ncmFtLFxuICB0YXJnZXRTb3VyY2VGaWxlLFxuICB3cml0ZUZpbGUsXG4gIGNhbmNlbGxhdGlvblRva2VuLFxuICBlbWl0T25seUR0c0ZpbGVzLFxuICBjdXN0b21UcmFuc2Zvcm1lcnNcbn0pID0+XG4gICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cblxuICByZXR1cm4ge2RpYWdub3N0aWNzLCBlbWl0U2tpcHBlZCwgZW1pdHRlZEZpbGVzfTtcbn1cbiJdfQ==