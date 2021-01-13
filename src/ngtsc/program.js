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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgtscProgram = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var typescript_support_1 = require("@angular/compiler-cli/src/typescript_support");
    var core_1 = require("@angular/compiler-cli/src/ngtsc/core");
    var incremental_1 = require("@angular/compiler-cli/src/ngtsc/incremental");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    /**
     * Entrypoint to the Angular Compiler (Ivy+) which sits behind the `api.Program` interface, allowing
     * it to be a drop-in replacement for the legacy View Engine compiler to tooling such as the
     * command-line main() function or the Angular CLI.
     */
    var NgtscProgram = /** @class */ (function () {
        function NgtscProgram(rootNames, options, delegateHost, oldProgram) {
            this.options = options;
            this.perfRecorder = perf_1.NOOP_PERF_RECORDER;
            this.perfTracker = null;
            // First, check whether the current TS version is supported.
            if (!options.disableTypeScriptVersionCheck) {
                typescript_support_1.verifySupportedTypeScriptVersion();
            }
            if (options.tracePerformance !== undefined) {
                this.perfTracker = perf_1.PerfTracker.zeroedToNow();
                this.perfRecorder = this.perfTracker;
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
            this.tsProgram = ts.createProgram(this.host.inputFiles, options, this.host, reuseProgram);
            this.reuseTsProgram = this.tsProgram;
            this.host.postProgramCreationCleanup();
            // Shim tagging has served its purpose, and tags can now be removed from all `ts.SourceFile`s in
            // the program.
            shims_1.untagAllTsFiles(this.tsProgram);
            var reusedProgramStrategy = new typecheck_1.ReusedProgramStrategy(this.tsProgram, this.host, this.options, this.host.shimExtensionPrefixes);
            this.incrementalStrategy = oldProgram !== undefined ?
                oldProgram.incrementalStrategy.toNextBuildStrategy() :
                new incremental_1.TrackedIncrementalBuildStrategy();
            // Create the NgCompiler which will drive the rest of the compilation.
            this.compiler = new core_1.NgCompiler(this.host, options, this.tsProgram, reusedProgramStrategy, this.incrementalStrategy, 
            /** enableTemplateTypeChecker */ false, /* usePoisonedData */ false, reuseProgram, this.perfRecorder);
        }
        NgtscProgram.prototype.getTsProgram = function () {
            return this.tsProgram;
        };
        NgtscProgram.prototype.getReuseTsProgram = function () {
            return this.reuseTsProgram;
        };
        NgtscProgram.prototype.getTsOptionDiagnostics = function (cancellationToken) {
            return this.tsProgram.getOptionsDiagnostics(cancellationToken);
        };
        NgtscProgram.prototype.getTsSyntacticDiagnostics = function (sourceFile, cancellationToken) {
            var e_1, _a;
            var ignoredFiles = this.compiler.ignoreForDiagnostics;
            if (sourceFile !== undefined) {
                if (ignoredFiles.has(sourceFile)) {
                    return [];
                }
                return this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
            }
            else {
                var diagnostics = [];
                try {
                    for (var _b = tslib_1.__values(this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var sf = _c.value;
                        if (!ignoredFiles.has(sf)) {
                            diagnostics.push.apply(diagnostics, tslib_1.__spread(this.tsProgram.getSyntacticDiagnostics(sf, cancellationToken)));
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return diagnostics;
            }
        };
        NgtscProgram.prototype.getTsSemanticDiagnostics = function (sourceFile, cancellationToken) {
            var e_2, _a;
            var ignoredFiles = this.compiler.ignoreForDiagnostics;
            if (sourceFile !== undefined) {
                if (ignoredFiles.has(sourceFile)) {
                    return [];
                }
                return this.tsProgram.getSemanticDiagnostics(sourceFile, cancellationToken);
            }
            else {
                var diagnostics = [];
                try {
                    for (var _b = tslib_1.__values(this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var sf = _c.value;
                        if (!ignoredFiles.has(sf)) {
                            diagnostics.push.apply(diagnostics, tslib_1.__spread(this.tsProgram.getSemanticDiagnostics(sf, cancellationToken)));
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
                return diagnostics;
            }
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
            this.reuseTsProgram = this.compiler.getNextProgram();
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
            var e_3, _a;
            var _this = this;
            var transformers = this.compiler.prepareEmit().transformers;
            var ignoreFiles = this.compiler.ignoreForEmit;
            var emitCallback = opts && opts.emitCallback || defaultEmitCallback;
            var writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                var e_4, _a;
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
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (sourceFiles_1_1 && !sourceFiles_1_1.done && (_a = sourceFiles_1.return)) _a.call(sourceFiles_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
                _this.host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
            };
            var customTransforms = opts && opts.customTransformers;
            var beforeTransforms = transformers.before || [];
            var afterDeclarationsTransforms = transformers.afterDeclarations;
            if (customTransforms !== undefined && customTransforms.beforeTs !== undefined) {
                beforeTransforms.push.apply(beforeTransforms, tslib_1.__spread(customTransforms.beforeTs));
            }
            var emitSpan = this.perfRecorder.start('emit');
            var emitResults = [];
            try {
                for (var _b = tslib_1.__values(this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var targetSourceFile = _c.value;
                    if (targetSourceFile.isDeclarationFile || ignoreFiles.has(targetSourceFile)) {
                        continue;
                    }
                    if (this.compiler.incrementalDriver.safeToSkipEmit(targetSourceFile)) {
                        continue;
                    }
                    var fileEmitSpan = this.perfRecorder.start('emitFile', targetSourceFile);
                    emitResults.push(emitCallback({
                        targetSourceFile: targetSourceFile,
                        program: this.tsProgram,
                        host: this.host,
                        options: this.options,
                        emitOnlyDtsFiles: false,
                        writeFile: writeFile,
                        customTransformers: {
                            before: beforeTransforms,
                            after: customTransforms && customTransforms.afterTs,
                            afterDeclarations: afterDeclarationsTransforms,
                        },
                    }));
                    this.perfRecorder.stop(fileEmitSpan);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            this.perfRecorder.stop(emitSpan);
            if (this.perfTracker !== null && this.options.tracePerformance !== undefined) {
                this.perfTracker.serializeToFile(this.options.tracePerformance, this.host);
            }
            // Run the emit, including a custom transformer that will downlevel the Ivy decorators in code.
            return ((opts && opts.mergeEmitResultsCallback) || mergeEmitResults)(emitResults);
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
        var e_5, _a;
        var diagnostics = [];
        var emitSkipped = false;
        var emittedFiles = [];
        try {
            for (var emitResults_1 = tslib_1.__values(emitResults), emitResults_1_1 = emitResults_1.next(); !emitResults_1_1.done; emitResults_1_1 = emitResults_1.next()) {
                var er = emitResults_1_1.value;
                diagnostics.push.apply(diagnostics, tslib_1.__spread(er.diagnostics));
                emitSkipped = emitSkipped || er.emitSkipped;
                emittedFiles.push.apply(emittedFiles, tslib_1.__spread((er.emittedFiles || [])));
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (emitResults_1_1 && !emitResults_1_1.done && (_a = emitResults_1.return)) _a.call(emitResults_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return { diagnostics: diagnostics, emitSkipped: emitSkipped, emittedFiles: emittedFiles };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBR2pDLG1GQUF1RTtJQUV2RSw2REFBa0Q7SUFFbEQsMkVBQThEO0lBRTlELDZEQUFxRTtJQUVyRSwrREFBeUQ7SUFDekQsdUVBQWtEO0lBQ2xELHFFQUE0QztJQUk1Qzs7OztPQUlHO0lBQ0g7UUE0QkUsc0JBQ0ksU0FBZ0MsRUFBVSxPQUEwQixFQUNwRSxZQUE4QixFQUFFLFVBQXlCO1lBRGYsWUFBTyxHQUFQLE9BQU8sQ0FBbUI7WUFMaEUsaUJBQVksR0FBaUIseUJBQWtCLENBQUM7WUFDaEQsZ0JBQVcsR0FBcUIsSUFBSSxDQUFDO1lBTTNDLDREQUE0RDtZQUM1RCxJQUFJLENBQUMsT0FBTyxDQUFDLDZCQUE2QixFQUFFO2dCQUMxQyxxREFBZ0MsRUFBRSxDQUFDO2FBQ3BDO1lBRUQsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO2dCQUMxQyxJQUFJLENBQUMsV0FBVyxHQUFHLGtCQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQzthQUN0QztZQUNELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDO1lBRW5FLElBQU0sWUFBWSxHQUFHLFVBQVUsYUFBVixVQUFVLHVCQUFWLFVBQVUsQ0FBRSxjQUFjLENBQUM7WUFDaEQsSUFBSSxDQUFDLElBQUksR0FBRyxxQkFBYyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxZQUFZLGFBQVosWUFBWSxjQUFaLFlBQVksR0FBSSxJQUFJLENB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QUFqQixZQUFZLG1CQUFTLENBQUMsRUFBRSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsR0FBRTthQUMvQzs7Ozs7Ozs7O1FBRUQsT0FBTyxFQUFDLFdBQVcsYUFBQSxFQUFFLFdBQVcsYUFBQSxFQUFFLFlBQVksY0FBQSxFQUFDLENBQUM7SUFDbEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0dlbmVyYXRlZEZpbGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnLi4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge3ZlcmlmeVN1cHBvcnRlZFR5cGVTY3JpcHRWZXJzaW9ufSBmcm9tICcuLi90eXBlc2NyaXB0X3N1cHBvcnQnO1xuXG5pbXBvcnQge05nQ29tcGlsZXIsIE5nQ29tcGlsZXJIb3N0fSBmcm9tICcuL2NvcmUnO1xuaW1wb3J0IHtOZ0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi9jb3JlL2FwaSc7XG5pbXBvcnQge1RyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3l9IGZyb20gJy4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtJbmRleGVkQ29tcG9uZW50fSBmcm9tICcuL2luZGV4ZXInO1xuaW1wb3J0IHtOT09QX1BFUkZfUkVDT1JERVIsIFBlcmZSZWNvcmRlciwgUGVyZlRyYWNrZXJ9IGZyb20gJy4vcGVyZic7XG5pbXBvcnQge0RlY2xhcmF0aW9uTm9kZX0gZnJvbSAnLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7cmV0YWdBbGxUc0ZpbGVzLCB1bnRhZ0FsbFRzRmlsZXN9IGZyb20gJy4vc2hpbXMnO1xuaW1wb3J0IHtSZXVzZWRQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJy4vdHlwZWNoZWNrJztcbmltcG9ydCB7T3B0aW1pemVGb3J9IGZyb20gJy4vdHlwZWNoZWNrL2FwaSc7XG5cblxuXG4vKipcbiAqIEVudHJ5cG9pbnQgdG8gdGhlIEFuZ3VsYXIgQ29tcGlsZXIgKEl2eSspIHdoaWNoIHNpdHMgYmVoaW5kIHRoZSBgYXBpLlByb2dyYW1gIGludGVyZmFjZSwgYWxsb3dpbmdcbiAqIGl0IHRvIGJlIGEgZHJvcC1pbiByZXBsYWNlbWVudCBmb3IgdGhlIGxlZ2FjeSBWaWV3IEVuZ2luZSBjb21waWxlciB0byB0b29saW5nIHN1Y2ggYXMgdGhlXG4gKiBjb21tYW5kLWxpbmUgbWFpbigpIGZ1bmN0aW9uIG9yIHRoZSBBbmd1bGFyIENMSS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5ndHNjUHJvZ3JhbSBpbXBsZW1lbnRzIGFwaS5Qcm9ncmFtIHtcbiAgcmVhZG9ubHkgY29tcGlsZXI6IE5nQ29tcGlsZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBwcmltYXJ5IFR5cGVTY3JpcHQgcHJvZ3JhbSwgd2hpY2ggaXMgdXNlZCBmb3IgYW5hbHlzaXMgYW5kIGVtaXQuXG4gICAqL1xuICBwcml2YXRlIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcblxuICAvKipcbiAgICogVGhlIFR5cGVTY3JpcHQgcHJvZ3JhbSB0byB1c2UgZm9yIHRoZSBuZXh0IGluY3JlbWVudGFsIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBPbmNlIGEgVFMgcHJvZ3JhbSBpcyB1c2VkIHRvIGNyZWF0ZSBhbm90aGVyIChhbiBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiBvcGVyYXRpb24pLCBpdCBjYW4gbm9cbiAgICogbG9uZ2VyIGJlIHVzZWQgdG8gZG8gc28gYWdhaW4uXG4gICAqXG4gICAqIFNpbmNlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgdXNlcyB0aGUgcHJpbWFyeSBwcm9ncmFtIHRvIGNyZWF0ZSBhIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSwgYWZ0ZXJcbiAgICogdGhpcyBoYXBwZW5zIHRoZSBwcmltYXJ5IHByb2dyYW0gaXMgbm8gbG9uZ2VyIHN1aXRhYmxlIGZvciBzdGFydGluZyBhIHN1YnNlcXVlbnQgY29tcGlsYXRpb24sXG4gICAqIGFuZCB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBwcm9ncmFtIHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gICAqXG4gICAqIFRodXMsIHRoZSBwcm9ncmFtIHdoaWNoIHNob3VsZCBiZSB1c2VkIGZvciB0aGUgbmV4dCBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiBpcyB0cmFja2VkIGluXG4gICAqIGByZXVzZVRzUHJvZ3JhbWAsIHNlcGFyYXRlbHkgZnJvbSB0aGUgXCJwcmltYXJ5XCIgcHJvZ3JhbSB3aGljaCBpcyBhbHdheXMgdXNlZCBmb3IgZW1pdC5cbiAgICovXG4gIHByaXZhdGUgcmV1c2VUc1Byb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgY2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBob3N0OiBOZ0NvbXBpbGVySG9zdDtcbiAgcHJpdmF0ZSBwZXJmUmVjb3JkZXI6IFBlcmZSZWNvcmRlciA9IE5PT1BfUEVSRl9SRUNPUkRFUjtcbiAgcHJpdmF0ZSBwZXJmVHJhY2tlcjogUGVyZlRyYWNrZXJ8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaW5jcmVtZW50YWxTdHJhdGVneTogVHJhY2tlZEluY3JlbWVudGFsQnVpbGRTdHJhdGVneTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJvb3ROYW1lczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBwcml2YXRlIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgICAgZGVsZWdhdGVIb3N0OiBhcGkuQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogTmd0c2NQcm9ncmFtKSB7XG4gICAgLy8gRmlyc3QsIGNoZWNrIHdoZXRoZXIgdGhlIGN1cnJlbnQgVFMgdmVyc2lvbiBpcyBzdXBwb3J0ZWQuXG4gICAgaWYgKCFvcHRpb25zLmRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrKSB7XG4gICAgICB2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbigpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wZXJmVHJhY2tlciA9IFBlcmZUcmFja2VyLnplcm9lZFRvTm93KCk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlciA9IHRoaXMucGVyZlRyYWNrZXI7XG4gICAgfVxuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhb3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjtcblxuICAgIGNvbnN0IHJldXNlUHJvZ3JhbSA9IG9sZFByb2dyYW0/LnJldXNlVHNQcm9ncmFtO1xuICAgIHRoaXMuaG9zdCA9IE5nQ29tcGlsZXJIb3N0LndyYXAoZGVsZWdhdGVIb3N0LCByb290TmFtZXMsIG9wdGlvbnMsIHJldXNlUHJvZ3JhbSA/PyBudWxsKTtcblxuICAgIGlmIChyZXVzZVByb2dyYW0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gUHJpb3IgdG8gcmV1c2luZyB0aGUgb2xkIHByb2dyYW0sIHJlc3RvcmUgc2hpbSB0YWdnaW5nIGZvciBhbGwgaXRzIGB0cy5Tb3VyY2VGaWxlYHMuXG4gICAgICAvLyBUeXBlU2NyaXB0IGNoZWNrcyB0aGUgYHJlZmVyZW5jZWRGaWxlc2Agb2YgYHRzLlNvdXJjZUZpbGVgcyBmb3IgY2hhbmdlcyB3aGVuIGV2YWx1YXRpbmdcbiAgICAgIC8vIGluY3JlbWVudGFsIHJldXNlIG9mIGRhdGEgZnJvbSB0aGUgb2xkIHByb2dyYW0sIHNvIGl0J3MgaW1wb3J0YW50IHRoYXQgdGhlc2UgbWF0Y2ggaW4gb3JkZXJcbiAgICAgIC8vIHRvIGdldCB0aGUgbW9zdCBiZW5lZml0IG91dCBvZiByZXVzZS5cbiAgICAgIHJldGFnQWxsVHNGaWxlcyhyZXVzZVByb2dyYW0pO1xuICAgIH1cblxuICAgIHRoaXMudHNQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh0aGlzLmhvc3QuaW5wdXRGaWxlcywgb3B0aW9ucywgdGhpcy5ob3N0LCByZXVzZVByb2dyYW0pO1xuICAgIHRoaXMucmV1c2VUc1Byb2dyYW0gPSB0aGlzLnRzUHJvZ3JhbTtcblxuICAgIHRoaXMuaG9zdC5wb3N0UHJvZ3JhbUNyZWF0aW9uQ2xlYW51cCgpO1xuXG4gICAgLy8gU2hpbSB0YWdnaW5nIGhhcyBzZXJ2ZWQgaXRzIHB1cnBvc2UsIGFuZCB0YWdzIGNhbiBub3cgYmUgcmVtb3ZlZCBmcm9tIGFsbCBgdHMuU291cmNlRmlsZWBzIGluXG4gICAgLy8gdGhlIHByb2dyYW0uXG4gICAgdW50YWdBbGxUc0ZpbGVzKHRoaXMudHNQcm9ncmFtKTtcblxuICAgIGNvbnN0IHJldXNlZFByb2dyYW1TdHJhdGVneSA9IG5ldyBSZXVzZWRQcm9ncmFtU3RyYXRlZ3koXG4gICAgICAgIHRoaXMudHNQcm9ncmFtLCB0aGlzLmhvc3QsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LnNoaW1FeHRlbnNpb25QcmVmaXhlcyk7XG5cbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kgPSBvbGRQcm9ncmFtICE9PSB1bmRlZmluZWQgP1xuICAgICAgICBvbGRQcm9ncmFtLmluY3JlbWVudGFsU3RyYXRlZ3kudG9OZXh0QnVpbGRTdHJhdGVneSgpIDpcbiAgICAgICAgbmV3IFRyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3koKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgTmdDb21waWxlciB3aGljaCB3aWxsIGRyaXZlIHRoZSByZXN0IG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICB0aGlzLmNvbXBpbGVyID0gbmV3IE5nQ29tcGlsZXIoXG4gICAgICAgIHRoaXMuaG9zdCwgb3B0aW9ucywgdGhpcy50c1Byb2dyYW0sIHJldXNlZFByb2dyYW1TdHJhdGVneSwgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LFxuICAgICAgICAvKiogZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciAqLyBmYWxzZSwgLyogdXNlUG9pc29uZWREYXRhICovIGZhbHNlLCByZXVzZVByb2dyYW0sXG4gICAgICAgIHRoaXMucGVyZlJlY29yZGVyKTtcbiAgfVxuXG4gIGdldFRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW07XG4gIH1cblxuICBnZXRSZXVzZVRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy5yZXVzZVRzUHJvZ3JhbTtcbiAgfVxuXG4gIGdldFRzT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiByZWFkb25seSB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRPcHRpb25zRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0VHNTeW50YWN0aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBpZ25vcmVkRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmlnbm9yZUZvckRpYWdub3N0aWNzO1xuICAgIGlmIChzb3VyY2VGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChpZ25vcmVkRmlsZXMuaGFzKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmICghaWdub3JlZEZpbGVzLmhhcyhzZikpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMudHNQcm9ncmFtLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNmLCBjYW5jZWxsYXRpb25Ub2tlbikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gICAgfVxuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiByZWFkb25seSB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGlnbm9yZWRGaWxlcyA9IHRoaXMuY29tcGlsZXIuaWdub3JlRm9yRGlhZ25vc3RpY3M7XG4gICAgaWYgKHNvdXJjZUZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKGlnbm9yZWRGaWxlcy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAoIWlnbm9yZWRGaWxlcy5oYXMoc2YpKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNmLCBjYW5jZWxsYXRpb25Ub2tlbikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gICAgfVxuICB9XG5cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHJlYWRvbmx5KHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWMpW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldE9wdGlvbkRpYWdub3N0aWNzKCk7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiByZWFkb25seSBhcGkuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBmaWxlTmFtZT86IHN0cmluZ3x1bmRlZmluZWQsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTpcbiAgICAgIHJlYWRvbmx5KHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWMpW10ge1xuICAgIGxldCBzZjogdHMuU291cmNlRmlsZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgaWYgKGZpbGVOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHNmID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZShmaWxlTmFtZSk7XG4gICAgICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBUaGVyZSBhcmUgbm8gZGlhZ25vc3RpY3MgZm9yIGZpbGVzIHdoaWNoIGRvbid0IGV4aXN0IGluIHRoZSBwcm9ncmFtIC0gbWF5YmUgdGhlIGNhbGxlclxuICAgICAgICAvLyBoYXMgc3RhbGUgZGF0YT9cbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gc2YgPT09IHVuZGVmaW5lZCA/XG4gICAgICAgIHRoaXMuY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3MoKSA6XG4gICAgICAgIHRoaXMuY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmLCBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW0pO1xuICAgIHRoaXMucmV1c2VUc1Byb2dyYW0gPSB0aGlzLmNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEVuc3VyZSB0aGF0IHRoZSBgTmdDb21waWxlcmAgaGFzIHByb3Blcmx5IGFuYWx5emVkIHRoZSBwcm9ncmFtLCBhbmQgYWxsb3cgZm9yIHRoZSBhc3luY2hyb25vdXNcbiAgICogbG9hZGluZyBvZiBhbnkgcmVzb3VyY2VzIGR1cmluZyB0aGUgcHJvY2Vzcy5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIGJ5IHRoZSBBbmd1bGFyIENMSSB0byBhbGxvdyBmb3Igc3Bhd25pbmcgKGFzeW5jKSBjaGlsZCBjb21waWxhdGlvbnMgZm9yIHRoaW5nc1xuICAgKiBsaWtlIFNBU1MgZmlsZXMgdXNlZCBpbiBgc3R5bGVVcmxzYC5cbiAgICovXG4gIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmFuYWx5emVBc3luYygpO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZ3x1bmRlZmluZWQpOiBhcGkuTGF6eVJvdXRlW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGUpO1xuICB9XG5cbiAgZW1pdChvcHRzPzoge1xuICAgIGVtaXRGbGFncz86IGFwaS5FbWl0RmxhZ3N8dW5kZWZpbmVkO1xuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4gfCB1bmRlZmluZWQ7XG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycyB8IHVuZGVmaW5lZDtcbiAgICBlbWl0Q2FsbGJhY2s/OiBhcGkuVHNFbWl0Q2FsbGJhY2sgfCB1bmRlZmluZWQ7XG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogYXBpLlRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrIHwgdW5kZWZpbmVkO1xuICB9fHVuZGVmaW5lZCk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGNvbnN0IHt0cmFuc2Zvcm1lcnN9ID0gdGhpcy5jb21waWxlci5wcmVwYXJlRW1pdCgpO1xuICAgIGNvbnN0IGlnbm9yZUZpbGVzID0gdGhpcy5jb21waWxlci5pZ25vcmVGb3JFbWl0O1xuICAgIGNvbnN0IGVtaXRDYWxsYmFjayA9IG9wdHMgJiYgb3B0cy5lbWl0Q2FsbGJhY2sgfHwgZGVmYXVsdEVtaXRDYWxsYmFjaztcblxuICAgIGNvbnN0IHdyaXRlRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPVxuICAgICAgICAoZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT58dW5kZWZpbmVkKSA9PiB7XG4gICAgICAgICAgaWYgKHNvdXJjZUZpbGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFJlY29yZCBzdWNjZXNzZnVsIHdyaXRlcyBmb3IgYW55IGB0cy5Tb3VyY2VGaWxlYCAodGhhdCdzIG5vdCBhIGRlY2xhcmF0aW9uIGZpbGUpXG4gICAgICAgICAgICAvLyB0aGF0J3MgYW4gaW5wdXQgdG8gdGhpcyB3cml0ZS5cbiAgICAgICAgICAgIGZvciAoY29uc3Qgd3JpdHRlblNmIG9mIHNvdXJjZUZpbGVzKSB7XG4gICAgICAgICAgICAgIGlmICh3cml0dGVuU2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHRoaXMuY29tcGlsZXIuaW5jcmVtZW50YWxEcml2ZXIucmVjb3JkU3VjY2Vzc2Z1bEVtaXQod3JpdHRlblNmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5ob3N0LndyaXRlRmlsZShmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCBjdXN0b21UcmFuc2Zvcm1zID0gb3B0cyAmJiBvcHRzLmN1c3RvbVRyYW5zZm9ybWVycztcbiAgICBjb25zdCBiZWZvcmVUcmFuc2Zvcm1zID0gdHJhbnNmb3JtZXJzLmJlZm9yZSB8fCBbXTtcbiAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMgPSB0cmFuc2Zvcm1lcnMuYWZ0ZXJEZWNsYXJhdGlvbnM7XG5cbiAgICBpZiAoY3VzdG9tVHJhbnNmb3JtcyAhPT0gdW5kZWZpbmVkICYmIGN1c3RvbVRyYW5zZm9ybXMuYmVmb3JlVHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgYmVmb3JlVHJhbnNmb3Jtcy5wdXNoKC4uLmN1c3RvbVRyYW5zZm9ybXMuYmVmb3JlVHMpO1xuICAgIH1cblxuICAgIGNvbnN0IGVtaXRTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2VtaXQnKTtcbiAgICBjb25zdCBlbWl0UmVzdWx0czogdHMuRW1pdFJlc3VsdFtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHRhcmdldFNvdXJjZUZpbGUgb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHRhcmdldFNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaWdub3JlRmlsZXMuaGFzKHRhcmdldFNvdXJjZUZpbGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5jb21waWxlci5pbmNyZW1lbnRhbERyaXZlci5zYWZlVG9Ta2lwRW1pdCh0YXJnZXRTb3VyY2VGaWxlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmlsZUVtaXRTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2VtaXRGaWxlJywgdGFyZ2V0U291cmNlRmlsZSk7XG4gICAgICBlbWl0UmVzdWx0cy5wdXNoKGVtaXRDYWxsYmFjayh7XG4gICAgICAgIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZW1pdE9ubHlEdHNGaWxlczogZmFsc2UsXG4gICAgICAgIHdyaXRlRmlsZSxcbiAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgYmVmb3JlOiBiZWZvcmVUcmFuc2Zvcm1zLFxuICAgICAgICAgIGFmdGVyOiBjdXN0b21UcmFuc2Zvcm1zICYmIGN1c3RvbVRyYW5zZm9ybXMuYWZ0ZXJUcyxcbiAgICAgICAgICBhZnRlckRlY2xhcmF0aW9uczogYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zLFxuICAgICAgICB9IGFzIGFueSxcbiAgICAgIH0pKTtcbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoZmlsZUVtaXRTcGFuKTtcbiAgICB9XG5cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGVtaXRTcGFuKTtcblxuICAgIGlmICh0aGlzLnBlcmZUcmFja2VyICE9PSBudWxsICYmIHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucGVyZlRyYWNrZXIuc2VyaWFsaXplVG9GaWxlKHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlLCB0aGlzLmhvc3QpO1xuICAgIH1cblxuICAgIC8vIFJ1biB0aGUgZW1pdCwgaW5jbHVkaW5nIGEgY3VzdG9tIHRyYW5zZm9ybWVyIHRoYXQgd2lsbCBkb3dubGV2ZWwgdGhlIEl2eSBkZWNvcmF0b3JzIGluIGNvZGUuXG4gICAgcmV0dXJuICgob3B0cyAmJiBvcHRzLm1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaykgfHwgbWVyZ2VFbWl0UmVzdWx0cykoZW1pdFJlc3VsdHMpO1xuICB9XG5cbiAgZ2V0SW5kZXhlZENvbXBvbmVudHMoKTogTWFwPERlY2xhcmF0aW9uTm9kZSwgSW5kZXhlZENvbXBvbmVudD4ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLmdldEluZGV4ZWRDb21wb25lbnRzKCk7XG4gIH1cblxuICBnZXRMaWJyYXJ5U3VtbWFyaWVzKCk6IE1hcDxzdHJpbmcsIGFwaS5MaWJyYXJ5U3VtbWFyeT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRHZW5lcmF0ZWRGaWxlcygpOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0RW1pdHRlZFNvdXJjZUZpbGVzKCk6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cbn1cblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogYXBpLlRzRW1pdENhbGxiYWNrID0gKHtcbiAgcHJvZ3JhbSxcbiAgdGFyZ2V0U291cmNlRmlsZSxcbiAgd3JpdGVGaWxlLFxuICBjYW5jZWxsYXRpb25Ub2tlbixcbiAgZW1pdE9ubHlEdHNGaWxlcyxcbiAgY3VzdG9tVHJhbnNmb3JtZXJzXG59KSA9PlxuICAgIHByb2dyYW0uZW1pdChcbiAgICAgICAgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcywgY3VzdG9tVHJhbnNmb3JtZXJzKTtcblxuZnVuY3Rpb24gbWVyZ2VFbWl0UmVzdWx0cyhlbWl0UmVzdWx0czogdHMuRW1pdFJlc3VsdFtdKTogdHMuRW1pdFJlc3VsdCB7XG4gIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgbGV0IGVtaXRTa2lwcGVkID0gZmFsc2U7XG4gIGNvbnN0IGVtaXR0ZWRGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBlciBvZiBlbWl0UmVzdWx0cykge1xuICAgIGRpYWdub3N0aWNzLnB1c2goLi4uZXIuZGlhZ25vc3RpY3MpO1xuICAgIGVtaXRTa2lwcGVkID0gZW1pdFNraXBwZWQgfHwgZXIuZW1pdFNraXBwZWQ7XG4gICAgZW1pdHRlZEZpbGVzLnB1c2goLi4uKGVyLmVtaXR0ZWRGaWxlcyB8fCBbXSkpO1xuICB9XG5cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG4iXX0=