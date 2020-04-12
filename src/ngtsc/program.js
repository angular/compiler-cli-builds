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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/core/src/compiler", "@angular/compiler-cli/src/ngtsc/perf"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var typescript_support_1 = require("@angular/compiler-cli/src/typescript_support");
    var core_1 = require("@angular/compiler-cli/src/ngtsc/core");
    var compiler_1 = require("@angular/compiler-cli/src/ngtsc/core/src/compiler");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
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
            this.host = core_1.NgCompilerHost.wrap(delegateHost, rootNames, options);
            var reuseProgram = oldProgram && oldProgram.reuseTsProgram;
            this.tsProgram = ts.createProgram(this.host.inputFiles, options, this.host, reuseProgram);
            this.reuseTsProgram = this.tsProgram;
            // Create the NgCompiler which will drive the rest of the compilation.
            this.compiler =
                new compiler_1.NgCompiler(this.host, options, this.tsProgram, reuseProgram, this.perfRecorder);
        }
        NgtscProgram.prototype.getTsProgram = function () { return this.tsProgram; };
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
            var diagnostics = this.compiler.getDiagnostics(sf);
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
        NgtscProgram.prototype.loadNgStructureAsync = function () { return this.compiler.analyzeAsync(); };
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
                        emitOnlyDtsFiles: false, writeFile: writeFile,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsbUZBQXVFO0lBRXZFLDZEQUFzQztJQUV0Qyw4RUFBK0M7SUFFL0MsNkRBQXFFO0lBSXJFOzs7O09BSUc7SUFDSDtRQTJCRSxzQkFDSSxTQUFnQyxFQUFVLE9BQTBCLEVBQ3BFLFlBQThCLEVBQUUsVUFBeUI7WUFEZixZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQUpoRSxpQkFBWSxHQUFpQix5QkFBa0IsQ0FBQztZQUNoRCxnQkFBVyxHQUFxQixJQUFJLENBQUM7WUFLM0MsNERBQTREO1lBQzVELElBQUksQ0FBQyxPQUFPLENBQUMsNkJBQTZCLEVBQUU7Z0JBQzFDLHFEQUFnQyxFQUFFLENBQUM7YUFDcEM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7Z0JBQzFDLElBQUksQ0FBQyxXQUFXLEdBQUcsa0JBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2FBQ3RDO1lBQ0QsSUFBSSxDQUFDLHNCQUFzQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUM7WUFFbkUsSUFBSSxDQUFDLElBQUksR0FBRyxxQkFBYyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRWxFLElBQU0sWUFBWSxHQUFHLFVBQVUsSUFBSSxVQUFVLENBQUMsY0FBYyxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVB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LG1CQUFTLENBQUMsRUFBRSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsR0FBRTthQUMvQzs7Ozs7Ozs7O1FBRUQsT0FBTyxFQUFDLFdBQVcsYUFBQSxFQUFFLFdBQVcsYUFBQSxFQUFFLFlBQVksY0FBQSxFQUFDLENBQUM7SUFDbEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtHZW5lcmF0ZWRGaWxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4uL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHt2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbn0gZnJvbSAnLi4vdHlwZXNjcmlwdF9zdXBwb3J0JztcblxuaW1wb3J0IHtOZ0NvbXBpbGVySG9zdH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7TmdDb21waWxlck9wdGlvbnN9IGZyb20gJy4vY29yZS9hcGknO1xuaW1wb3J0IHtOZ0NvbXBpbGVyfSBmcm9tICcuL2NvcmUvc3JjL2NvbXBpbGVyJztcbmltcG9ydCB7SW5kZXhlZENvbXBvbmVudH0gZnJvbSAnLi9pbmRleGVyJztcbmltcG9ydCB7Tk9PUF9QRVJGX1JFQ09SREVSLCBQZXJmUmVjb3JkZXIsIFBlcmZUcmFja2VyfSBmcm9tICcuL3BlcmYnO1xuXG5cblxuLyoqXG4gKiBFbnRyeXBvaW50IHRvIHRoZSBBbmd1bGFyIENvbXBpbGVyIChJdnkrKSB3aGljaCBzaXRzIGJlaGluZCB0aGUgYGFwaS5Qcm9ncmFtYCBpbnRlcmZhY2UsIGFsbG93aW5nXG4gKiBpdCB0byBiZSBhIGRyb3AtaW4gcmVwbGFjZW1lbnQgZm9yIHRoZSBsZWdhY3kgVmlldyBFbmdpbmUgY29tcGlsZXIgdG8gdG9vbGluZyBzdWNoIGFzIHRoZVxuICogY29tbWFuZC1saW5lIG1haW4oKSBmdW5jdGlvbiBvciB0aGUgQW5ndWxhciBDTEkuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ3RzY1Byb2dyYW0gaW1wbGVtZW50cyBhcGkuUHJvZ3JhbSB7XG4gIHByaXZhdGUgY29tcGlsZXI6IE5nQ29tcGlsZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBwcmltYXJ5IFR5cGVTY3JpcHQgcHJvZ3JhbSwgd2hpY2ggaXMgdXNlZCBmb3IgYW5hbHlzaXMgYW5kIGVtaXQuXG4gICAqL1xuICBwcml2YXRlIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcblxuICAvKipcbiAgICogVGhlIFR5cGVTY3JpcHQgcHJvZ3JhbSB0byB1c2UgZm9yIHRoZSBuZXh0IGluY3JlbWVudGFsIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBPbmNlIGEgVFMgcHJvZ3JhbSBpcyB1c2VkIHRvIGNyZWF0ZSBhbm90aGVyIChhbiBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiBvcGVyYXRpb24pLCBpdCBjYW4gbm9cbiAgICogbG9uZ2VyIGJlIHVzZWQgdG8gZG8gc28gYWdhaW4uXG4gICAqXG4gICAqIFNpbmNlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgdXNlcyB0aGUgcHJpbWFyeSBwcm9ncmFtIHRvIGNyZWF0ZSBhIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSwgYWZ0ZXJcbiAgICogdGhpcyBoYXBwZW5zIHRoZSBwcmltYXJ5IHByb2dyYW0gaXMgbm8gbG9uZ2VyIHN1aXRhYmxlIGZvciBzdGFydGluZyBhIHN1YnNlcXVlbnQgY29tcGlsYXRpb24sXG4gICAqIGFuZCB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBwcm9ncmFtIHNob3VsZCBiZSB1c2VkIGluc3RlYWQuXG4gICAqXG4gICAqIFRodXMsIHRoZSBwcm9ncmFtIHdoaWNoIHNob3VsZCBiZSB1c2VkIGZvciB0aGUgbmV4dCBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiBpcyB0cmFja2VkIGluXG4gICAqIGByZXVzZVRzUHJvZ3JhbWAsIHNlcGFyYXRlbHkgZnJvbSB0aGUgXCJwcmltYXJ5XCIgcHJvZ3JhbSB3aGljaCBpcyBhbHdheXMgdXNlZCBmb3IgZW1pdC5cbiAgICovXG4gIHByaXZhdGUgcmV1c2VUc1Byb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgY2xvc3VyZUNvbXBpbGVyRW5hYmxlZDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBob3N0OiBOZ0NvbXBpbGVySG9zdDtcbiAgcHJpdmF0ZSBwZXJmUmVjb3JkZXI6IFBlcmZSZWNvcmRlciA9IE5PT1BfUEVSRl9SRUNPUkRFUjtcbiAgcHJpdmF0ZSBwZXJmVHJhY2tlcjogUGVyZlRyYWNrZXJ8bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyxcbiAgICAgIGRlbGVnYXRlSG9zdDogYXBpLkNvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IE5ndHNjUHJvZ3JhbSkge1xuICAgIC8vIEZpcnN0LCBjaGVjayB3aGV0aGVyIHRoZSBjdXJyZW50IFRTIHZlcnNpb24gaXMgc3VwcG9ydGVkLlxuICAgIGlmICghb3B0aW9ucy5kaXNhYmxlVHlwZVNjcmlwdFZlcnNpb25DaGVjaykge1xuICAgICAgdmVyaWZ5U3VwcG9ydGVkVHlwZVNjcmlwdFZlcnNpb24oKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucGVyZlRyYWNrZXIgPSBQZXJmVHJhY2tlci56ZXJvZWRUb05vdygpO1xuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIgPSB0aGlzLnBlcmZUcmFja2VyO1xuICAgIH1cbiAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgPSAhIW9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI7XG5cbiAgICB0aGlzLmhvc3QgPSBOZ0NvbXBpbGVySG9zdC53cmFwKGRlbGVnYXRlSG9zdCwgcm9vdE5hbWVzLCBvcHRpb25zKTtcblxuICAgIGNvbnN0IHJldXNlUHJvZ3JhbSA9IG9sZFByb2dyYW0gJiYgb2xkUHJvZ3JhbS5yZXVzZVRzUHJvZ3JhbTtcbiAgICB0aGlzLnRzUHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0odGhpcy5ob3N0LmlucHV0RmlsZXMsIG9wdGlvbnMsIHRoaXMuaG9zdCwgcmV1c2VQcm9ncmFtKTtcbiAgICB0aGlzLnJldXNlVHNQcm9ncmFtID0gdGhpcy50c1Byb2dyYW07XG5cbiAgICAvLyBDcmVhdGUgdGhlIE5nQ29tcGlsZXIgd2hpY2ggd2lsbCBkcml2ZSB0aGUgcmVzdCBvZiB0aGUgY29tcGlsYXRpb24uXG4gICAgdGhpcy5jb21waWxlciA9XG4gICAgICAgIG5ldyBOZ0NvbXBpbGVyKHRoaXMuaG9zdCwgb3B0aW9ucywgdGhpcy50c1Byb2dyYW0sIHJldXNlUHJvZ3JhbSwgdGhpcy5wZXJmUmVjb3JkZXIpO1xuICB9XG5cbiAgZ2V0VHNQcm9ncmFtKCk6IHRzLlByb2dyYW0geyByZXR1cm4gdGhpcy50c1Byb2dyYW07IH1cblxuICBnZXRUc09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0T3B0aW9uc0RpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3MoXG4gICAgICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZXx1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IHJlYWRvbmx5IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgaWdub3JlZEZpbGVzID0gdGhpcy5jb21waWxlci5pZ25vcmVGb3JEaWFnbm9zdGljcztcbiAgICBpZiAoc291cmNlRmlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoaWdub3JlZEZpbGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAoIWlnbm9yZWRGaWxlcy5oYXMoc2YpKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzZiwgY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICAgIH1cbiAgfVxuXG4gIGdldFRzU2VtYW50aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBpZ25vcmVkRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmlnbm9yZUZvckRpYWdub3N0aWNzO1xuICAgIGlmIChzb3VyY2VGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChpZ25vcmVkRmlsZXMuaGFzKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgaWYgKCFpZ25vcmVkRmlsZXMuaGFzKHNmKSkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzZiwgY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICAgIH1cbiAgfVxuXG4gIGdldE5nT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiByZWFkb25seSh0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljKVtdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXRPcHRpb25EaWFnbm9zdGljcygpO1xuICB9XG5cbiAgZ2V0TmdTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogcmVhZG9ubHkgYXBpLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgZmlsZU5hbWU/OiBzdHJpbmd8dW5kZWZpbmVkLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiByZWFkb25seSh0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljKVtdIHtcbiAgICBsZXQgc2Y6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChmaWxlTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzZiA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVGhlcmUgYXJlIG5vIGRpYWdub3N0aWNzIGZvciBmaWxlcyB3aGljaCBkb24ndCBleGlzdCBpbiB0aGUgcHJvZ3JhbSAtIG1heWJlIHRoZSBjYWxsZXJcbiAgICAgICAgLy8gaGFzIHN0YWxlIGRhdGE/XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IHRoaXMuY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3Moc2YpO1xuICAgIHRoaXMucmV1c2VUc1Byb2dyYW0gPSB0aGlzLmNvbXBpbGVyLmdldE5leHRQcm9ncmFtKCk7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEVuc3VyZSB0aGF0IHRoZSBgTmdDb21waWxlcmAgaGFzIHByb3Blcmx5IGFuYWx5emVkIHRoZSBwcm9ncmFtLCBhbmQgYWxsb3cgZm9yIHRoZSBhc3luY2hyb25vdXNcbiAgICogbG9hZGluZyBvZiBhbnkgcmVzb3VyY2VzIGR1cmluZyB0aGUgcHJvY2Vzcy5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIGJ5IHRoZSBBbmd1bGFyIENMSSB0byBhbGxvdyBmb3Igc3Bhd25pbmcgKGFzeW5jKSBjaGlsZCBjb21waWxhdGlvbnMgZm9yIHRoaW5nc1xuICAgKiBsaWtlIFNBU1MgZmlsZXMgdXNlZCBpbiBgc3R5bGVVcmxzYC5cbiAgICovXG4gIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4geyByZXR1cm4gdGhpcy5jb21waWxlci5hbmFseXplQXN5bmMoKTsgfVxuXG4gIGxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGU/OiBzdHJpbmd8dW5kZWZpbmVkKTogYXBpLkxhenlSb3V0ZVtdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIGVtaXQob3B0cz86IHtcbiAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzIHwgdW5kZWZpbmVkOyBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuIHwgdW5kZWZpbmVkO1xuICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMgfCB1bmRlZmluZWQ7XG4gICAgZW1pdENhbGxiYWNrPzogYXBpLlRzRW1pdENhbGxiYWNrIHwgdW5kZWZpbmVkO1xuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IGFwaS5Uc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayB8IHVuZGVmaW5lZDtcbiAgfXx1bmRlZmluZWQpOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCB7dHJhbnNmb3JtZXJzfSA9IHRoaXMuY29tcGlsZXIucHJlcGFyZUVtaXQoKTtcbiAgICBjb25zdCBpZ25vcmVGaWxlcyA9IHRoaXMuY29tcGlsZXIuaWdub3JlRm9yRW1pdDtcbiAgICBjb25zdCBlbWl0Q2FsbGJhY2sgPSBvcHRzICYmIG9wdHMuZW1pdENhbGxiYWNrIHx8IGRlZmF1bHRFbWl0Q2FsbGJhY2s7XG5cbiAgICBjb25zdCB3cml0ZUZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgKGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpIHwgdW5kZWZpbmVkLFxuICAgICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT58IHVuZGVmaW5lZCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2VGaWxlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBSZWNvcmQgc3VjY2Vzc2Z1bCB3cml0ZXMgZm9yIGFueSBgdHMuU291cmNlRmlsZWAgKHRoYXQncyBub3QgYSBkZWNsYXJhdGlvbiBmaWxlKVxuICAgICAgICAgICAgLy8gdGhhdCdzIGFuIGlucHV0IHRvIHRoaXMgd3JpdGUuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHdyaXR0ZW5TZiBvZiBzb3VyY2VGaWxlcykge1xuICAgICAgICAgICAgICBpZiAod3JpdHRlblNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB0aGlzLmNvbXBpbGVyLmluY3JlbWVudGFsRHJpdmVyLnJlY29yZFN1Y2Nlc3NmdWxFbWl0KHdyaXR0ZW5TZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuaG9zdC53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgY3VzdG9tVHJhbnNmb3JtcyA9IG9wdHMgJiYgb3B0cy5jdXN0b21UcmFuc2Zvcm1lcnM7XG4gICAgY29uc3QgYmVmb3JlVHJhbnNmb3JtcyA9IHRyYW5zZm9ybWVycy5iZWZvcmUgfHwgW107XG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zID0gdHJhbnNmb3JtZXJzLmFmdGVyRGVjbGFyYXRpb25zO1xuXG4gICAgaWYgKGN1c3RvbVRyYW5zZm9ybXMgIT09IHVuZGVmaW5lZCAmJiBjdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaCguLi5jdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzKTtcbiAgICB9XG5cbiAgICBjb25zdCBlbWl0U3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdlbWl0Jyk7XG4gICAgY29uc3QgZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB0YXJnZXRTb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICh0YXJnZXRTb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlIHx8IGlnbm9yZUZpbGVzLmhhcyh0YXJnZXRTb3VyY2VGaWxlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuY29tcGlsZXIuaW5jcmVtZW50YWxEcml2ZXIuc2FmZVRvU2tpcEVtaXQodGFyZ2V0U291cmNlRmlsZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVFbWl0U3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdlbWl0RmlsZScsIHRhcmdldFNvdXJjZUZpbGUpO1xuICAgICAgZW1pdFJlc3VsdHMucHVzaChlbWl0Q2FsbGJhY2soe1xuICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLFxuICAgICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIGVtaXRPbmx5RHRzRmlsZXM6IGZhbHNlLCB3cml0ZUZpbGUsXG4gICAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczoge1xuICAgICAgICAgIGJlZm9yZTogYmVmb3JlVHJhbnNmb3JtcyxcbiAgICAgICAgICBhZnRlcjogY3VzdG9tVHJhbnNmb3JtcyAmJiBjdXN0b21UcmFuc2Zvcm1zLmFmdGVyVHMsXG4gICAgICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnM6IGFmdGVyRGVjbGFyYXRpb25zVHJhbnNmb3JtcyxcbiAgICAgICAgfSBhcyBhbnksXG4gICAgICB9KSk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGZpbGVFbWl0U3Bhbik7XG4gICAgfVxuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoZW1pdFNwYW4pO1xuXG4gICAgaWYgKHRoaXMucGVyZlRyYWNrZXIgIT09IG51bGwgJiYgdGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wZXJmVHJhY2tlci5zZXJpYWxpemVUb0ZpbGUodGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UsIHRoaXMuaG9zdCk7XG4gICAgfVxuXG4gICAgLy8gUnVuIHRoZSBlbWl0LCBpbmNsdWRpbmcgYSBjdXN0b20gdHJhbnNmb3JtZXIgdGhhdCB3aWxsIGRvd25sZXZlbCB0aGUgSXZ5IGRlY29yYXRvcnMgaW4gY29kZS5cbiAgICByZXR1cm4gKChvcHRzICYmIG9wdHMubWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrKSB8fCBtZXJnZUVtaXRSZXN1bHRzKShlbWl0UmVzdWx0cyk7XG4gIH1cblxuICBnZXRJbmRleGVkQ29tcG9uZW50cygpOiBNYXA8dHMuRGVjbGFyYXRpb24sIEluZGV4ZWRDb21wb25lbnQ+IHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXRJbmRleGVkQ29tcG9uZW50cygpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBhcGkuTGlicmFyeVN1bW1hcnk+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG59XG5cbmNvbnN0IGRlZmF1bHRFbWl0Q2FsbGJhY2s6IGFwaS5Uc0VtaXRDYWxsYmFjayA9XG4gICAgKHtwcm9ncmFtLCB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzfSkgPT5cbiAgICAgICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcywgY3VzdG9tVHJhbnNmb3JtZXJzKTtcblxuZnVuY3Rpb24gbWVyZ2VFbWl0UmVzdWx0cyhlbWl0UmVzdWx0czogdHMuRW1pdFJlc3VsdFtdKTogdHMuRW1pdFJlc3VsdCB7XG4gIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgbGV0IGVtaXRTa2lwcGVkID0gZmFsc2U7XG4gIGNvbnN0IGVtaXR0ZWRGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBlciBvZiBlbWl0UmVzdWx0cykge1xuICAgIGRpYWdub3N0aWNzLnB1c2goLi4uZXIuZGlhZ25vc3RpY3MpO1xuICAgIGVtaXRTa2lwcGVkID0gZW1pdFNraXBwZWQgfHwgZXIuZW1pdFNraXBwZWQ7XG4gICAgZW1pdHRlZEZpbGVzLnB1c2goLi4uKGVyLmVtaXR0ZWRGaWxlcyB8fCBbXSkpO1xuICB9XG5cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG4iXX0=