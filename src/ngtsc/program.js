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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/ngtsc/core", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/typecheck"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgtscProgram = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var typescript_support_1 = require("@angular/compiler-cli/src/typescript_support");
    var core_1 = require("@angular/compiler-cli/src/ngtsc/core");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
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
            var reuseProgram = oldProgram && oldProgram.reuseTsProgram;
            this.host = core_1.NgCompilerHost.wrap(delegateHost, rootNames, options, reuseProgram !== null && reuseProgram !== void 0 ? reuseProgram : null);
            this.tsProgram = ts.createProgram(this.host.inputFiles, options, this.host, reuseProgram);
            this.reuseTsProgram = this.tsProgram;
            this.host.postProgramCreationCleanup();
            var reusedProgramStrategy = new typecheck_1.ReusedProgramStrategy(this.tsProgram, this.host, this.options, this.host.shimExtensionPrefixes);
            // Create the NgCompiler which will drive the rest of the compilation.
            this.compiler = new core_1.NgCompiler(this.host, options, this.tsProgram, reusedProgramStrategy, reuseProgram, this.perfRecorder);
        }
        NgtscProgram.prototype.getTsProgram = function () {
            return this.tsProgram;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBR2pDLG1GQUF1RTtJQUV2RSw2REFBa0Q7SUFHbEQsNkRBQXFFO0lBQ3JFLHVFQUFrRDtJQUlsRDs7OztPQUlHO0lBQ0g7UUEyQkUsc0JBQ0ksU0FBZ0MsRUFBVSxPQUEwQixFQUNwRSxZQUE4QixFQUFFLFVBQXlCO1lBRGYsWUFBTyxHQUFQLE9BQU8sQ0FBbUI7WUFKaEUsaUJBQVksR0FBaUIseUJBQWtCLENBQUM7WUFDaEQsZ0JBQVcsR0FBcUIsSUFBSSxDQUFDO1lBSzNDLDREQUE0RDtZQUM1RCxJQUFJLENBQUMsT0FBTyxDQUFDLDZCQUE2QixFQUFFO2dCQUMxQyxxREFBZ0MsRUFBRSxDQUFDO2FBQ3BDO1lBRUQsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO2dCQUMxQyxJQUFJLENBQUMsV0FBVyxHQUFHLGtCQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQzthQUN0QztZQUNELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDO1lBRW5FLElBQU0sWUFBWSxHQUFHLFVBQVUsSUFBSSxVQUFVLENBQUMsY0FBYyxDQUFDO1lBQzdELElBQUksQ0FBQyxJQUFJLEdBQUcscUJBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsWUFBWSxhQUFaLFlBQVksY0FBWixZQUFZLEdBQUksSUFBSSxDQUFDLENBQUM7WUFFeEYsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsYUFBYSxD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O1FBQ3BELElBQU0sV0FBVyxHQUFvQixFQUFFLENBQUM7UUFDeEMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQzs7WUFDbEMsS0FBaUIsSUFBQSxnQkFBQSxpQkFBQSxXQUFXLENBQUEsd0NBQUEsaUVBQUU7Z0JBQXpCLElBQU0sRUFBRSx3QkFBQTtnQkFDWCxXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLG1CQUFTLEVBQUUsQ0FBQyxXQUFXLEdBQUU7Z0JBQ3BDLFdBQVcsR0FBRyxXQUFXLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQztnQkFDNUMsWUFBWSxDQUFDLElBQUksT0FBakIsWUFBWSxtQkFBUyxDQUFDLEVBQUUsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEdBQUU7YUFDL0M7Ozs7Ozs7OztRQUVELE9BQU8sRUFBQyxXQUFXLGFBQUEsRUFBRSxXQUFXLGFBQUEsRUFBRSxZQUFZLGNBQUEsRUFBQyxDQUFDO0lBQ2xELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7R2VuZXJhdGVkRmlsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7dmVyaWZ5U3VwcG9ydGVkVHlwZVNjcmlwdFZlcnNpb259IGZyb20gJy4uL3R5cGVzY3JpcHRfc3VwcG9ydCc7XG5cbmltcG9ydCB7TmdDb21waWxlciwgTmdDb21waWxlckhvc3R9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQge05nQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL2NvcmUvYXBpJztcbmltcG9ydCB7SW5kZXhlZENvbXBvbmVudH0gZnJvbSAnLi9pbmRleGVyJztcbmltcG9ydCB7Tk9PUF9QRVJGX1JFQ09SREVSLCBQZXJmUmVjb3JkZXIsIFBlcmZUcmFja2VyfSBmcm9tICcuL3BlcmYnO1xuaW1wb3J0IHtSZXVzZWRQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJy4vdHlwZWNoZWNrJztcblxuXG5cbi8qKlxuICogRW50cnlwb2ludCB0byB0aGUgQW5ndWxhciBDb21waWxlciAoSXZ5Kykgd2hpY2ggc2l0cyBiZWhpbmQgdGhlIGBhcGkuUHJvZ3JhbWAgaW50ZXJmYWNlLCBhbGxvd2luZ1xuICogaXQgdG8gYmUgYSBkcm9wLWluIHJlcGxhY2VtZW50IGZvciB0aGUgbGVnYWN5IFZpZXcgRW5naW5lIGNvbXBpbGVyIHRvIHRvb2xpbmcgc3VjaCBhcyB0aGVcbiAqIGNvbW1hbmQtbGluZSBtYWluKCkgZnVuY3Rpb24gb3IgdGhlIEFuZ3VsYXIgQ0xJLlxuICovXG5leHBvcnQgY2xhc3MgTmd0c2NQcm9ncmFtIGltcGxlbWVudHMgYXBpLlByb2dyYW0ge1xuICBwcml2YXRlIGNvbXBpbGVyOiBOZ0NvbXBpbGVyO1xuXG4gIC8qKlxuICAgKiBUaGUgcHJpbWFyeSBUeXBlU2NyaXB0IHByb2dyYW0sIHdoaWNoIGlzIHVzZWQgZm9yIGFuYWx5c2lzIGFuZCBlbWl0LlxuICAgKi9cbiAgcHJpdmF0ZSB0c1Byb2dyYW06IHRzLlByb2dyYW07XG5cbiAgLyoqXG4gICAqIFRoZSBUeXBlU2NyaXB0IHByb2dyYW0gdG8gdXNlIGZvciB0aGUgbmV4dCBpbmNyZW1lbnRhbCBjb21waWxhdGlvbi5cbiAgICpcbiAgICogT25jZSBhIFRTIHByb2dyYW0gaXMgdXNlZCB0byBjcmVhdGUgYW5vdGhlciAoYW4gaW5jcmVtZW50YWwgY29tcGlsYXRpb24gb3BlcmF0aW9uKSwgaXQgY2FuIG5vXG4gICAqIGxvbmdlciBiZSB1c2VkIHRvIGRvIHNvIGFnYWluLlxuICAgKlxuICAgKiBTaW5jZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHVzZXMgdGhlIHByaW1hcnkgcHJvZ3JhbSB0byBjcmVhdGUgYSB0eXBlLWNoZWNraW5nIHByb2dyYW0sIGFmdGVyXG4gICAqIHRoaXMgaGFwcGVucyB0aGUgcHJpbWFyeSBwcm9ncmFtIGlzIG5vIGxvbmdlciBzdWl0YWJsZSBmb3Igc3RhcnRpbmcgYSBzdWJzZXF1ZW50IGNvbXBpbGF0aW9uLFxuICAgKiBhbmQgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSBzaG91bGQgYmUgdXNlZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBUaHVzLCB0aGUgcHJvZ3JhbSB3aGljaCBzaG91bGQgYmUgdXNlZCBmb3IgdGhlIG5leHQgaW5jcmVtZW50YWwgY29tcGlsYXRpb24gaXMgdHJhY2tlZCBpblxuICAgKiBgcmV1c2VUc1Byb2dyYW1gLCBzZXBhcmF0ZWx5IGZyb20gdGhlIFwicHJpbWFyeVwiIHByb2dyYW0gd2hpY2ggaXMgYWx3YXlzIHVzZWQgZm9yIGVtaXQuXG4gICAqL1xuICBwcml2YXRlIHJldXNlVHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgaG9zdDogTmdDb21waWxlckhvc3Q7XG4gIHByaXZhdGUgcGVyZlJlY29yZGVyOiBQZXJmUmVjb3JkZXIgPSBOT09QX1BFUkZfUkVDT1JERVI7XG4gIHByaXZhdGUgcGVyZlRyYWNrZXI6IFBlcmZUcmFja2VyfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcm9vdE5hbWVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsXG4gICAgICBkZWxlZ2F0ZUhvc3Q6IGFwaS5Db21waWxlckhvc3QsIG9sZFByb2dyYW0/OiBOZ3RzY1Byb2dyYW0pIHtcbiAgICAvLyBGaXJzdCwgY2hlY2sgd2hldGhlciB0aGUgY3VycmVudCBUUyB2ZXJzaW9uIGlzIHN1cHBvcnRlZC5cbiAgICBpZiAoIW9wdGlvbnMuZGlzYWJsZVR5cGVTY3JpcHRWZXJzaW9uQ2hlY2spIHtcbiAgICAgIHZlcmlmeVN1cHBvcnRlZFR5cGVTY3JpcHRWZXJzaW9uKCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudHJhY2VQZXJmb3JtYW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnBlcmZUcmFja2VyID0gUGVyZlRyYWNrZXIuemVyb2VkVG9Ob3coKTtcbiAgICAgIHRoaXMucGVyZlJlY29yZGVyID0gdGhpcy5wZXJmVHJhY2tlcjtcbiAgICB9XG4gICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkID0gISFvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuXG4gICAgY29uc3QgcmV1c2VQcm9ncmFtID0gb2xkUHJvZ3JhbSAmJiBvbGRQcm9ncmFtLnJldXNlVHNQcm9ncmFtO1xuICAgIHRoaXMuaG9zdCA9IE5nQ29tcGlsZXJIb3N0LndyYXAoZGVsZWdhdGVIb3N0LCByb290TmFtZXMsIG9wdGlvbnMsIHJldXNlUHJvZ3JhbSA/PyBudWxsKTtcblxuICAgIHRoaXMudHNQcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh0aGlzLmhvc3QuaW5wdXRGaWxlcywgb3B0aW9ucywgdGhpcy5ob3N0LCByZXVzZVByb2dyYW0pO1xuICAgIHRoaXMucmV1c2VUc1Byb2dyYW0gPSB0aGlzLnRzUHJvZ3JhbTtcblxuICAgIHRoaXMuaG9zdC5wb3N0UHJvZ3JhbUNyZWF0aW9uQ2xlYW51cCgpO1xuXG4gICAgY29uc3QgcmV1c2VkUHJvZ3JhbVN0cmF0ZWd5ID0gbmV3IFJldXNlZFByb2dyYW1TdHJhdGVneShcbiAgICAgICAgdGhpcy50c1Byb2dyYW0sIHRoaXMuaG9zdCwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3Quc2hpbUV4dGVuc2lvblByZWZpeGVzKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgTmdDb21waWxlciB3aGljaCB3aWxsIGRyaXZlIHRoZSByZXN0IG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICB0aGlzLmNvbXBpbGVyID0gbmV3IE5nQ29tcGlsZXIoXG4gICAgICAgIHRoaXMuaG9zdCwgb3B0aW9ucywgdGhpcy50c1Byb2dyYW0sIHJldXNlZFByb2dyYW1TdHJhdGVneSwgcmV1c2VQcm9ncmFtLCB0aGlzLnBlcmZSZWNvcmRlcik7XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtO1xuICB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHJlYWRvbmx5IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiByZWFkb25seSB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGlnbm9yZWRGaWxlcyA9IHRoaXMuY29tcGlsZXIuaWdub3JlRm9yRGlhZ25vc3RpY3M7XG4gICAgaWYgKHNvdXJjZUZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKGlnbm9yZWRGaWxlcy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgaWYgKCFpZ25vcmVkRmlsZXMuaGFzKHNmKSkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGhpcy50c1Byb2dyYW0uZ2V0U3ludGFjdGljRGlhZ25vc3RpY3Moc2YsIGNhbmNlbGxhdGlvblRva2VuKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgICB9XG4gIH1cblxuICBnZXRUc1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZXx1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IHJlYWRvbmx5IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgaWdub3JlZEZpbGVzID0gdGhpcy5jb21waWxlci5pZ25vcmVGb3JEaWFnbm9zdGljcztcbiAgICBpZiAoc291cmNlRmlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoaWdub3JlZEZpbGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmICghaWdub3JlZEZpbGVzLmhhcyhzZikpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2YsIGNhbmNlbGxhdGlvblRva2VuKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgICB9XG4gIH1cblxuICBnZXROZ09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogcmVhZG9ubHkodHMuRGlhZ25vc3RpY3xhcGkuRGlhZ25vc3RpYylbXSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTtcbiAgfVxuXG4gIGdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IHJlYWRvbmx5IGFwaS5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldE5nU2VtYW50aWNEaWFnbm9zdGljcyhcbiAgICAgIGZpbGVOYW1lPzogc3RyaW5nfHVuZGVmaW5lZCwgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOlxuICAgICAgcmVhZG9ubHkodHMuRGlhZ25vc3RpY3xhcGkuRGlhZ25vc3RpYylbXSB7XG4gICAgbGV0IHNmOiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoZmlsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgc2YgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKTtcbiAgICAgIGlmIChzZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIFRoZXJlIGFyZSBubyBkaWFnbm9zdGljcyBmb3IgZmlsZXMgd2hpY2ggZG9uJ3QgZXhpc3QgaW4gdGhlIHByb2dyYW0gLSBtYXliZSB0aGUgY2FsbGVyXG4gICAgICAgIC8vIGhhcyBzdGFsZSBkYXRhP1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZGlhZ25vc3RpY3MgPSB0aGlzLmNvbXBpbGVyLmdldERpYWdub3N0aWNzKHNmKTtcbiAgICB0aGlzLnJldXNlVHNQcm9ncmFtID0gdGhpcy5jb21waWxlci5nZXROZXh0UHJvZ3JhbSgpO1xuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmUgdGhhdCB0aGUgYE5nQ29tcGlsZXJgIGhhcyBwcm9wZXJseSBhbmFseXplZCB0aGUgcHJvZ3JhbSwgYW5kIGFsbG93IGZvciB0aGUgYXN5bmNocm9ub3VzXG4gICAqIGxvYWRpbmcgb2YgYW55IHJlc291cmNlcyBkdXJpbmcgdGhlIHByb2Nlc3MuXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCBieSB0aGUgQW5ndWxhciBDTEkgdG8gYWxsb3cgZm9yIHNwYXduaW5nIChhc3luYykgY2hpbGQgY29tcGlsYXRpb25zIGZvciB0aGluZ3NcbiAgICogbGlrZSBTQVNTIGZpbGVzIHVzZWQgaW4gYHN0eWxlVXJsc2AuXG4gICAqL1xuICBsb2FkTmdTdHJ1Y3R1cmVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5hbmFseXplQXN5bmMoKTtcbiAgfVxuXG4gIGxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGU/OiBzdHJpbmd8dW5kZWZpbmVkKTogYXBpLkxhenlSb3V0ZVtdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIGVtaXQob3B0cz86IHtcbiAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzfHVuZGVmaW5lZDtcbiAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuIHwgdW5kZWZpbmVkO1xuICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMgfCB1bmRlZmluZWQ7XG4gICAgZW1pdENhbGxiYWNrPzogYXBpLlRzRW1pdENhbGxiYWNrIHwgdW5kZWZpbmVkO1xuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IGFwaS5Uc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayB8IHVuZGVmaW5lZDtcbiAgfXx1bmRlZmluZWQpOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCB7dHJhbnNmb3JtZXJzfSA9IHRoaXMuY29tcGlsZXIucHJlcGFyZUVtaXQoKTtcbiAgICBjb25zdCBpZ25vcmVGaWxlcyA9IHRoaXMuY29tcGlsZXIuaWdub3JlRm9yRW1pdDtcbiAgICBjb25zdCBlbWl0Q2FsbGJhY2sgPSBvcHRzICYmIG9wdHMuZW1pdENhbGxiYWNrIHx8IGRlZmF1bHRFbWl0Q2FsbGJhY2s7XG5cbiAgICBjb25zdCB3cml0ZUZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgKGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpfHVuZGVmaW5lZCxcbiAgICAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+fHVuZGVmaW5lZCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2VGaWxlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBSZWNvcmQgc3VjY2Vzc2Z1bCB3cml0ZXMgZm9yIGFueSBgdHMuU291cmNlRmlsZWAgKHRoYXQncyBub3QgYSBkZWNsYXJhdGlvbiBmaWxlKVxuICAgICAgICAgICAgLy8gdGhhdCdzIGFuIGlucHV0IHRvIHRoaXMgd3JpdGUuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHdyaXR0ZW5TZiBvZiBzb3VyY2VGaWxlcykge1xuICAgICAgICAgICAgICBpZiAod3JpdHRlblNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB0aGlzLmNvbXBpbGVyLmluY3JlbWVudGFsRHJpdmVyLnJlY29yZFN1Y2Nlc3NmdWxFbWl0KHdyaXR0ZW5TZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuaG9zdC53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgY3VzdG9tVHJhbnNmb3JtcyA9IG9wdHMgJiYgb3B0cy5jdXN0b21UcmFuc2Zvcm1lcnM7XG4gICAgY29uc3QgYmVmb3JlVHJhbnNmb3JtcyA9IHRyYW5zZm9ybWVycy5iZWZvcmUgfHwgW107XG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zID0gdHJhbnNmb3JtZXJzLmFmdGVyRGVjbGFyYXRpb25zO1xuXG4gICAgaWYgKGN1c3RvbVRyYW5zZm9ybXMgIT09IHVuZGVmaW5lZCAmJiBjdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaCguLi5jdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzKTtcbiAgICB9XG5cbiAgICBjb25zdCBlbWl0U3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdlbWl0Jyk7XG4gICAgY29uc3QgZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB0YXJnZXRTb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICh0YXJnZXRTb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlIHx8IGlnbm9yZUZpbGVzLmhhcyh0YXJnZXRTb3VyY2VGaWxlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuY29tcGlsZXIuaW5jcmVtZW50YWxEcml2ZXIuc2FmZVRvU2tpcEVtaXQodGFyZ2V0U291cmNlRmlsZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVFbWl0U3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdlbWl0RmlsZScsIHRhcmdldFNvdXJjZUZpbGUpO1xuICAgICAgZW1pdFJlc3VsdHMucHVzaChlbWl0Q2FsbGJhY2soe1xuICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLFxuICAgICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIGVtaXRPbmx5RHRzRmlsZXM6IGZhbHNlLFxuICAgICAgICB3cml0ZUZpbGUsXG4gICAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczoge1xuICAgICAgICAgIGJlZm9yZTogYmVmb3JlVHJhbnNmb3JtcyxcbiAgICAgICAgICBhZnRlcjogY3VzdG9tVHJhbnNmb3JtcyAmJiBjdXN0b21UcmFuc2Zvcm1zLmFmdGVyVHMsXG4gICAgICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnM6IGFmdGVyRGVjbGFyYXRpb25zVHJhbnNmb3JtcyxcbiAgICAgICAgfSBhcyBhbnksXG4gICAgICB9KSk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGZpbGVFbWl0U3Bhbik7XG4gICAgfVxuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoZW1pdFNwYW4pO1xuXG4gICAgaWYgKHRoaXMucGVyZlRyYWNrZXIgIT09IG51bGwgJiYgdGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wZXJmVHJhY2tlci5zZXJpYWxpemVUb0ZpbGUodGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UsIHRoaXMuaG9zdCk7XG4gICAgfVxuXG4gICAgLy8gUnVuIHRoZSBlbWl0LCBpbmNsdWRpbmcgYSBjdXN0b20gdHJhbnNmb3JtZXIgdGhhdCB3aWxsIGRvd25sZXZlbCB0aGUgSXZ5IGRlY29yYXRvcnMgaW4gY29kZS5cbiAgICByZXR1cm4gKChvcHRzICYmIG9wdHMubWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrKSB8fCBtZXJnZUVtaXRSZXN1bHRzKShlbWl0UmVzdWx0cyk7XG4gIH1cblxuICBnZXRJbmRleGVkQ29tcG9uZW50cygpOiBNYXA8dHMuRGVjbGFyYXRpb24sIEluZGV4ZWRDb21wb25lbnQ+IHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXRJbmRleGVkQ29tcG9uZW50cygpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBhcGkuTGlicmFyeVN1bW1hcnk+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG59XG5cbmNvbnN0IGRlZmF1bHRFbWl0Q2FsbGJhY2s6IGFwaS5Uc0VtaXRDYWxsYmFjayA9ICh7XG4gIHByb2dyYW0sXG4gIHRhcmdldFNvdXJjZUZpbGUsXG4gIHdyaXRlRmlsZSxcbiAgY2FuY2VsbGF0aW9uVG9rZW4sXG4gIGVtaXRPbmx5RHRzRmlsZXMsXG4gIGN1c3RvbVRyYW5zZm9ybWVyc1xufSkgPT5cbiAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG5cbmZ1bmN0aW9uIG1lcmdlRW1pdFJlc3VsdHMoZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSk6IHRzLkVtaXRSZXN1bHQge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGxldCBlbWl0U2tpcHBlZCA9IGZhbHNlO1xuICBjb25zdCBlbWl0dGVkRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgZXIgb2YgZW1pdFJlc3VsdHMpIHtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmVyLmRpYWdub3N0aWNzKTtcbiAgICBlbWl0U2tpcHBlZCA9IGVtaXRTa2lwcGVkIHx8IGVyLmVtaXRTa2lwcGVkO1xuICAgIGVtaXR0ZWRGaWxlcy5wdXNoKC4uLihlci5lbWl0dGVkRmlsZXMgfHwgW10pKTtcbiAgfVxuXG4gIHJldHVybiB7ZGlhZ25vc3RpY3MsIGVtaXRTa2lwcGVkLCBlbWl0dGVkRmlsZXN9O1xufVxuIl19