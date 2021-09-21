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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/checker", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/program_driver", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/completion", "@angular/compiler-cli/src/ngtsc/typecheck/src/context", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/shim", "@angular/compiler-cli/src/ngtsc/typecheck/src/source", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TemplateTypeCheckerImpl = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var program_driver_1 = require("@angular/compiler-cli/src/ngtsc/program_driver");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
    var completion_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/completion");
    var context_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/context");
    var diagnostics_3 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var shim_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/shim");
    var source_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/source");
    var tcb_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util");
    var template_symbol_builder_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder");
    var REGISTRY = new compiler_1.DomElementSchemaRegistry();
    /**
     * Primary template type-checking engine, which performs type-checking using a
     * `TypeCheckingProgramStrategy` for type-checking program maintenance, and the
     * `ProgramTypeCheckAdapter` for generation of template type-checking code.
     */
    var TemplateTypeCheckerImpl = /** @class */ (function () {
        function TemplateTypeCheckerImpl(originalProgram, programDriver, typeCheckAdapter, config, refEmitter, reflector, compilerHost, priorBuild, componentScopeReader, typeCheckScopeRegistry, perf) {
            this.originalProgram = originalProgram;
            this.programDriver = programDriver;
            this.typeCheckAdapter = typeCheckAdapter;
            this.config = config;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.compilerHost = compilerHost;
            this.priorBuild = priorBuild;
            this.componentScopeReader = componentScopeReader;
            this.typeCheckScopeRegistry = typeCheckScopeRegistry;
            this.perf = perf;
            this.state = new Map();
            /**
             * Stores the `CompletionEngine` which powers autocompletion for each component class.
             *
             * Must be invalidated whenever the component's template or the `ts.Program` changes. Invalidation
             * on template changes is performed within this `TemplateTypeCheckerImpl` instance. When the
             * `ts.Program` changes, the `TemplateTypeCheckerImpl` as a whole is destroyed and replaced.
             */
            this.completionCache = new Map();
            /**
             * Stores the `SymbolBuilder` which creates symbols for each component class.
             *
             * Must be invalidated whenever the component's template or the `ts.Program` changes. Invalidation
             * on template changes is performed within this `TemplateTypeCheckerImpl` instance. When the
             * `ts.Program` changes, the `TemplateTypeCheckerImpl` as a whole is destroyed and replaced.
             */
            this.symbolBuilderCache = new Map();
            /**
             * Stores directives and pipes that are in scope for each component.
             *
             * Unlike other caches, the scope of a component is not affected by its template. It will be
             * destroyed when the `ts.Program` changes and the `TemplateTypeCheckerImpl` as a whole is
             * destroyed and replaced.
             */
            this.scopeCache = new Map();
            /**
             * Stores potential element tags for each component (a union of DOM tags as well as directive
             * tags).
             *
             * Unlike other caches, the scope of a component is not affected by its template. It will be
             * destroyed when the `ts.Program` changes and the `TemplateTypeCheckerImpl` as a whole is
             * destroyed and replaced.
             */
            this.elementTagCache = new Map();
            this.isComplete = false;
        }
        TemplateTypeCheckerImpl.prototype.getTemplate = function (component) {
            var data = this.getLatestComponentState(component).data;
            if (data === null) {
                return null;
            }
            return data.template;
        };
        TemplateTypeCheckerImpl.prototype.getLatestComponentState = function (component) {
            this.ensureShimForComponent(component);
            var sf = component.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            var fileRecord = this.getFileData(sfPath);
            if (!fileRecord.shimData.has(shimPath)) {
                return { data: null, tcb: null, shimPath: shimPath };
            }
            var templateId = fileRecord.sourceManager.getTemplateId(component);
            var shimRecord = fileRecord.shimData.get(shimPath);
            var id = fileRecord.sourceManager.getTemplateId(component);
            var program = this.programDriver.getProgram();
            var shimSf = typescript_1.getSourceFileOrNull(program, shimPath);
            if (shimSf === null || !fileRecord.shimData.has(shimPath)) {
                throw new Error("Error: no shim file in program: " + shimPath);
            }
            var tcb = tcb_util_1.findTypeCheckBlock(shimSf, id, /*isDiagnosticsRequest*/ false);
            if (tcb === null) {
                // Try for an inline block.
                var inlineSf = file_system_1.getSourceFileOrError(program, sfPath);
                tcb = tcb_util_1.findTypeCheckBlock(inlineSf, id, /*isDiagnosticsRequest*/ false);
            }
            var data = null;
            if (shimRecord.templates.has(templateId)) {
                data = shimRecord.templates.get(templateId);
            }
            return { data: data, tcb: tcb, shimPath: shimPath };
        };
        TemplateTypeCheckerImpl.prototype.isTrackedTypeCheckFile = function (filePath) {
            return this.getFileAndShimRecordsForPath(filePath) !== null;
        };
        TemplateTypeCheckerImpl.prototype.getFileAndShimRecordsForPath = function (shimPath) {
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(this.state.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var fileRecord = _c.value;
                    if (fileRecord.shimData.has(shimPath)) {
                        return { fileRecord: fileRecord, shimRecord: fileRecord.shimData.get(shimPath) };
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
            return null;
        };
        TemplateTypeCheckerImpl.prototype.getTemplateMappingAtShimLocation = function (_a) {
            var shimPath = _a.shimPath, positionInShimFile = _a.positionInShimFile;
            var records = this.getFileAndShimRecordsForPath(file_system_1.absoluteFrom(shimPath));
            if (records === null) {
                return null;
            }
            var fileRecord = records.fileRecord;
            var shimSf = this.programDriver.getProgram().getSourceFile(file_system_1.absoluteFrom(shimPath));
            if (shimSf === undefined) {
                return null;
            }
            return tcb_util_1.getTemplateMapping(shimSf, positionInShimFile, fileRecord.sourceManager, /*isDiagnosticsRequest*/ false);
        };
        TemplateTypeCheckerImpl.prototype.generateAllTypeCheckBlocks = function () {
            this.ensureAllShimsForAllFiles();
        };
        /**
         * Retrieve type-checking and template parse diagnostics from the given `ts.SourceFile` using the
         * most recent type-checking program.
         */
        TemplateTypeCheckerImpl.prototype.getDiagnosticsForFile = function (sf, optimizeFor) {
            var _this = this;
            switch (optimizeFor) {
                case api_1.OptimizeFor.WholeProgram:
                    this.ensureAllShimsForAllFiles();
                    break;
                case api_1.OptimizeFor.SingleFile:
                    this.ensureAllShimsForOneFile(sf);
                    break;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcDiagnostics, function () {
                var e_2, _a, e_3, _b;
                var sfPath = file_system_1.absoluteFromSourceFile(sf);
                var fileRecord = _this.state.get(sfPath);
                var typeCheckProgram = _this.programDriver.getProgram();
                var diagnostics = [];
                if (fileRecord.hasInlines) {
                    var inlineSf = file_system_1.getSourceFileOrError(typeCheckProgram, sfPath);
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); }))));
                }
                try {
                    for (var _c = tslib_1.__values(fileRecord.shimData), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var _e = tslib_1.__read(_d.value, 2), shimPath = _e[0], shimRecord = _e[1];
                        var shimSf = file_system_1.getSourceFileOrError(typeCheckProgram, shimPath);
                        diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); }))));
                        diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(shimRecord.genesisDiagnostics)));
                        try {
                            for (var _f = (e_3 = void 0, tslib_1.__values(shimRecord.templates.values())), _g = _f.next(); !_g.done; _g = _f.next()) {
                                var templateData = _g.value;
                                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(templateData.templateDiagnostics)));
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                return diagnostics.filter(function (diag) { return diag !== null; });
            });
        };
        TemplateTypeCheckerImpl.prototype.getDiagnosticsForComponent = function (component) {
            var _this = this;
            this.ensureShimForComponent(component);
            return this.perf.inPhase(perf_1.PerfPhase.TtcDiagnostics, function () {
                var e_4, _a;
                var sf = component.getSourceFile();
                var sfPath = file_system_1.absoluteFromSourceFile(sf);
                var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
                var fileRecord = _this.getFileData(sfPath);
                if (!fileRecord.shimData.has(shimPath)) {
                    return [];
                }
                var templateId = fileRecord.sourceManager.getTemplateId(component);
                var shimRecord = fileRecord.shimData.get(shimPath);
                var typeCheckProgram = _this.programDriver.getProgram();
                var diagnostics = [];
                if (shimRecord.hasInlines) {
                    var inlineSf = file_system_1.getSourceFileOrError(typeCheckProgram, sfPath);
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); }))));
                }
                var shimSf = file_system_1.getSourceFileOrError(typeCheckProgram, shimPath);
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); }))));
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(shimRecord.genesisDiagnostics)));
                try {
                    for (var _b = tslib_1.__values(shimRecord.templates.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var templateData = _c.value;
                        diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(templateData.templateDiagnostics)));
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                return diagnostics.filter(function (diag) {
                    return diag !== null && diag.templateId === templateId;
                });
            });
        };
        TemplateTypeCheckerImpl.prototype.getTypeCheckBlock = function (component) {
            return this.getLatestComponentState(component).tcb;
        };
        TemplateTypeCheckerImpl.prototype.getGlobalCompletions = function (context, component, node) {
            var engine = this.getOrCreateCompletionEngine(component);
            if (engine === null) {
                return null;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcAutocompletion, function () { return engine.getGlobalCompletions(context, node); });
        };
        TemplateTypeCheckerImpl.prototype.getExpressionCompletionLocation = function (ast, component) {
            var engine = this.getOrCreateCompletionEngine(component);
            if (engine === null) {
                return null;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcAutocompletion, function () { return engine.getExpressionCompletionLocation(ast); });
        };
        TemplateTypeCheckerImpl.prototype.getLiteralCompletionLocation = function (node, component) {
            var engine = this.getOrCreateCompletionEngine(component);
            if (engine === null) {
                return null;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcAutocompletion, function () { return engine.getLiteralCompletionLocation(node); });
        };
        TemplateTypeCheckerImpl.prototype.invalidateClass = function (clazz) {
            this.completionCache.delete(clazz);
            this.symbolBuilderCache.delete(clazz);
            this.scopeCache.delete(clazz);
            this.elementTagCache.delete(clazz);
            var sf = clazz.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            var fileData = this.getFileData(sfPath);
            var templateId = fileData.sourceManager.getTemplateId(clazz);
            fileData.shimData.delete(shimPath);
            fileData.isComplete = false;
            this.isComplete = false;
        };
        TemplateTypeCheckerImpl.prototype.makeTemplateDiagnostic = function (clazz, sourceSpan, category, errorCode, message, relatedInformation) {
            var sfPath = file_system_1.absoluteFromSourceFile(clazz.getSourceFile());
            var fileRecord = this.state.get(sfPath);
            var templateId = fileRecord.sourceManager.getTemplateId(clazz);
            var mapping = fileRecord.sourceManager.getSourceMapping(templateId);
            return tslib_1.__assign(tslib_1.__assign({}, diagnostics_2.makeTemplateDiagnostic(templateId, mapping, sourceSpan, category, diagnostics_1.ngErrorCode(errorCode), message, relatedInformation)), { __ngCode: errorCode });
        };
        TemplateTypeCheckerImpl.prototype.getOrCreateCompletionEngine = function (component) {
            if (this.completionCache.has(component)) {
                return this.completionCache.get(component);
            }
            var _a = this.getLatestComponentState(component), tcb = _a.tcb, data = _a.data, shimPath = _a.shimPath;
            if (tcb === null || data === null) {
                return null;
            }
            var engine = new completion_1.CompletionEngine(tcb, data, shimPath);
            this.completionCache.set(component, engine);
            return engine;
        };
        TemplateTypeCheckerImpl.prototype.maybeAdoptPriorResultsForFile = function (sf) {
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            if (this.state.has(sfPath)) {
                var existingResults = this.state.get(sfPath);
                if (existingResults.isComplete) {
                    // All data for this file has already been generated, so no need to adopt anything.
                    return;
                }
            }
            var previousResults = this.priorBuild.priorTypeCheckingResultsFor(sf);
            if (previousResults === null || !previousResults.isComplete) {
                return;
            }
            this.perf.eventCount(perf_1.PerfEvent.ReuseTypeCheckFile);
            this.state.set(sfPath, previousResults);
        };
        TemplateTypeCheckerImpl.prototype.ensureAllShimsForAllFiles = function () {
            var _this = this;
            if (this.isComplete) {
                return;
            }
            this.perf.inPhase(perf_1.PerfPhase.TcbGeneration, function () {
                var e_5, _a;
                var host = new WholeProgramTypeCheckingHost(_this);
                var ctx = _this.newContext(host);
                try {
                    for (var _b = tslib_1.__values(_this.originalProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var sf = _c.value;
                        if (sf.isDeclarationFile || shims_1.isShim(sf)) {
                            continue;
                        }
                        _this.maybeAdoptPriorResultsForFile(sf);
                        var sfPath = file_system_1.absoluteFromSourceFile(sf);
                        var fileData = _this.getFileData(sfPath);
                        if (fileData.isComplete) {
                            continue;
                        }
                        _this.typeCheckAdapter.typeCheck(sf, ctx);
                        fileData.isComplete = true;
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                _this.updateFromContext(ctx);
                _this.isComplete = true;
            });
        };
        TemplateTypeCheckerImpl.prototype.ensureAllShimsForOneFile = function (sf) {
            var _this = this;
            this.perf.inPhase(perf_1.PerfPhase.TcbGeneration, function () {
                _this.maybeAdoptPriorResultsForFile(sf);
                var sfPath = file_system_1.absoluteFromSourceFile(sf);
                var fileData = _this.getFileData(sfPath);
                if (fileData.isComplete) {
                    // All data for this file is present and accounted for already.
                    return;
                }
                var host = new SingleFileTypeCheckingHost(sfPath, fileData, _this);
                var ctx = _this.newContext(host);
                _this.typeCheckAdapter.typeCheck(sf, ctx);
                fileData.isComplete = true;
                _this.updateFromContext(ctx);
            });
        };
        TemplateTypeCheckerImpl.prototype.ensureShimForComponent = function (component) {
            var sf = component.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            this.maybeAdoptPriorResultsForFile(sf);
            var fileData = this.getFileData(sfPath);
            if (fileData.shimData.has(shimPath)) {
                // All data for this component is available.
                return;
            }
            var host = new SingleShimTypeCheckingHost(sfPath, fileData, this, shimPath);
            var ctx = this.newContext(host);
            this.typeCheckAdapter.typeCheck(sf, ctx);
            this.updateFromContext(ctx);
        };
        TemplateTypeCheckerImpl.prototype.newContext = function (host) {
            var inlining = this.programDriver.supportsInlineOperations ? context_1.InliningMode.InlineOps : context_1.InliningMode.Error;
            return new context_1.TypeCheckContextImpl(this.config, this.compilerHost, this.refEmitter, this.reflector, host, inlining, this.perf);
        };
        /**
         * Remove any shim data that depends on inline operations applied to the type-checking program.
         *
         * This can be useful if new inlines need to be applied, and it's not possible to guarantee that
         * they won't overwrite or corrupt existing inlines that are used by such shims.
         */
        TemplateTypeCheckerImpl.prototype.clearAllShimDataUsingInlines = function () {
            var e_6, _a, e_7, _b;
            try {
                for (var _c = tslib_1.__values(this.state.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var fileData = _d.value;
                    if (!fileData.hasInlines) {
                        continue;
                    }
                    try {
                        for (var _e = (e_7 = void 0, tslib_1.__values(fileData.shimData.entries())), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var _g = tslib_1.__read(_f.value, 2), shimFile = _g[0], shimData = _g[1];
                            if (shimData.hasInlines) {
                                fileData.shimData.delete(shimFile);
                            }
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                    fileData.hasInlines = false;
                    fileData.isComplete = false;
                    this.isComplete = false;
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_6) throw e_6.error; }
            }
        };
        TemplateTypeCheckerImpl.prototype.updateFromContext = function (ctx) {
            var _this = this;
            var updates = ctx.finalize();
            return this.perf.inPhase(perf_1.PerfPhase.TcbUpdateProgram, function () {
                if (updates.size > 0) {
                    _this.perf.eventCount(perf_1.PerfEvent.UpdateTypeCheckProgram);
                }
                _this.programDriver.updateFiles(updates, program_driver_1.UpdateMode.Incremental);
                _this.priorBuild.recordSuccessfulTypeCheck(_this.state);
                _this.perf.memory(perf_1.PerfCheckpoint.TtcUpdateProgram);
            });
        };
        TemplateTypeCheckerImpl.prototype.getFileData = function (path) {
            if (!this.state.has(path)) {
                this.state.set(path, {
                    hasInlines: false,
                    sourceManager: new source_1.TemplateSourceManager(),
                    isComplete: false,
                    shimData: new Map(),
                });
            }
            return this.state.get(path);
        };
        TemplateTypeCheckerImpl.prototype.getSymbolOfNode = function (node, component) {
            var builder = this.getOrCreateSymbolBuilder(component);
            if (builder === null) {
                return null;
            }
            return this.perf.inPhase(perf_1.PerfPhase.TtcSymbol, function () { return builder.getSymbol(node); });
        };
        TemplateTypeCheckerImpl.prototype.getOrCreateSymbolBuilder = function (component) {
            var _this = this;
            if (this.symbolBuilderCache.has(component)) {
                return this.symbolBuilderCache.get(component);
            }
            var _a = this.getLatestComponentState(component), tcb = _a.tcb, data = _a.data, shimPath = _a.shimPath;
            if (tcb === null || data === null) {
                return null;
            }
            var builder = new template_symbol_builder_1.SymbolBuilder(shimPath, tcb, data, this.componentScopeReader, function () { return _this.programDriver.getProgram().getTypeChecker(); });
            this.symbolBuilderCache.set(component, builder);
            return builder;
        };
        TemplateTypeCheckerImpl.prototype.getDirectivesInScope = function (component) {
            var data = this.getScopeData(component);
            if (data === null) {
                return null;
            }
            return data.directives;
        };
        TemplateTypeCheckerImpl.prototype.getPipesInScope = function (component) {
            var data = this.getScopeData(component);
            if (data === null) {
                return null;
            }
            return data.pipes;
        };
        TemplateTypeCheckerImpl.prototype.getDirectiveMetadata = function (dir) {
            if (!reflection_1.isNamedClassDeclaration(dir)) {
                return null;
            }
            return this.typeCheckScopeRegistry.getTypeCheckDirectiveMetadata(new imports_1.Reference(dir));
        };
        TemplateTypeCheckerImpl.prototype.getPotentialElementTags = function (component) {
            var e_8, _a, e_9, _b, e_10, _c;
            if (this.elementTagCache.has(component)) {
                return this.elementTagCache.get(component);
            }
            var tagMap = new Map();
            try {
                for (var _d = tslib_1.__values(REGISTRY.allKnownElementNames()), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var tag = _e.value;
                    tagMap.set(tag, null);
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_8) throw e_8.error; }
            }
            var scope = this.getScopeData(component);
            if (scope !== null) {
                try {
                    for (var _f = tslib_1.__values(scope.directives), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var directive = _g.value;
                        try {
                            for (var _h = (e_10 = void 0, tslib_1.__values(compiler_1.CssSelector.parse(directive.selector))), _j = _h.next(); !_j.done; _j = _h.next()) {
                                var selector = _j.value;
                                if (selector.element === null || tagMap.has(selector.element)) {
                                    // Skip this directive if it doesn't match an element tag, or if another directive has
                                    // already been included with the same element name.
                                    continue;
                                }
                                tagMap.set(selector.element, directive);
                            }
                        }
                        catch (e_10_1) { e_10 = { error: e_10_1 }; }
                        finally {
                            try {
                                if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                            }
                            finally { if (e_10) throw e_10.error; }
                        }
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
            }
            this.elementTagCache.set(component, tagMap);
            return tagMap;
        };
        TemplateTypeCheckerImpl.prototype.getPotentialDomBindings = function (tagName) {
            var attributes = REGISTRY.allKnownAttributesOfElement(tagName);
            return attributes.map(function (attribute) { return ({
                attribute: attribute,
                property: REGISTRY.getMappedPropName(attribute),
            }); });
        };
        TemplateTypeCheckerImpl.prototype.getScopeData = function (component) {
            var e_11, _a, e_12, _b;
            if (this.scopeCache.has(component)) {
                return this.scopeCache.get(component);
            }
            if (!reflection_1.isNamedClassDeclaration(component)) {
                throw new Error("AssertionError: components must have names");
            }
            var scope = this.componentScopeReader.getScopeForComponent(component);
            if (scope === null) {
                return null;
            }
            var data = {
                directives: [],
                pipes: [],
                isPoisoned: scope.compilation.isPoisoned,
            };
            var typeChecker = this.programDriver.getProgram().getTypeChecker();
            try {
                for (var _c = tslib_1.__values(scope.compilation.directives), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var dir = _d.value;
                    if (dir.selector === null) {
                        // Skip this directive, it can't be added to a template anyway.
                        continue;
                    }
                    var tsSymbol = typeChecker.getSymbolAtLocation(dir.ref.node.name);
                    if (!typescript_1.isSymbolWithValueDeclaration(tsSymbol)) {
                        continue;
                    }
                    var ngModule = null;
                    var moduleScopeOfDir = this.componentScopeReader.getScopeForComponent(dir.ref.node);
                    if (moduleScopeOfDir !== null) {
                        ngModule = moduleScopeOfDir.ngModule;
                    }
                    data.directives.push({
                        isComponent: dir.isComponent,
                        isStructural: dir.isStructural,
                        selector: dir.selector,
                        tsSymbol: tsSymbol,
                        ngModule: ngModule,
                    });
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_11) throw e_11.error; }
            }
            try {
                for (var _e = tslib_1.__values(scope.compilation.pipes), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var pipe = _f.value;
                    var tsSymbol = typeChecker.getSymbolAtLocation(pipe.ref.node.name);
                    if (tsSymbol === undefined) {
                        continue;
                    }
                    data.pipes.push({
                        name: pipe.name,
                        tsSymbol: tsSymbol,
                    });
                }
            }
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_12) throw e_12.error; }
            }
            this.scopeCache.set(component, data);
            return data;
        };
        return TemplateTypeCheckerImpl;
    }());
    exports.TemplateTypeCheckerImpl = TemplateTypeCheckerImpl;
    function convertDiagnostic(diag, sourceResolver) {
        if (!diagnostics_3.shouldReportDiagnostic(diag)) {
            return null;
        }
        return diagnostics_3.translateDiagnostic(diag, sourceResolver);
    }
    /**
     * Drives a `TypeCheckContext` to generate type-checking code for every component in the program.
     */
    var WholeProgramTypeCheckingHost = /** @class */ (function () {
        function WholeProgramTypeCheckingHost(impl) {
            this.impl = impl;
        }
        WholeProgramTypeCheckingHost.prototype.getSourceManager = function (sfPath) {
            return this.impl.getFileData(sfPath).sourceManager;
        };
        WholeProgramTypeCheckingHost.prototype.shouldCheckComponent = function (node) {
            var sfPath = file_system_1.absoluteFromSourceFile(node.getSourceFile());
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            var fileData = this.impl.getFileData(sfPath);
            // The component needs to be checked unless the shim which would contain it already exists.
            return !fileData.shimData.has(shimPath);
        };
        WholeProgramTypeCheckingHost.prototype.recordShimData = function (sfPath, data) {
            var fileData = this.impl.getFileData(sfPath);
            fileData.shimData.set(data.path, data);
            if (data.hasInlines) {
                fileData.hasInlines = true;
            }
        };
        WholeProgramTypeCheckingHost.prototype.recordComplete = function (sfPath) {
            this.impl.getFileData(sfPath).isComplete = true;
        };
        return WholeProgramTypeCheckingHost;
    }());
    /**
     * Drives a `TypeCheckContext` to generate type-checking code efficiently for a single input file.
     */
    var SingleFileTypeCheckingHost = /** @class */ (function () {
        function SingleFileTypeCheckingHost(sfPath, fileData, impl) {
            this.sfPath = sfPath;
            this.fileData = fileData;
            this.impl = impl;
            this.seenInlines = false;
        }
        SingleFileTypeCheckingHost.prototype.assertPath = function (sfPath) {
            if (this.sfPath !== sfPath) {
                throw new Error("AssertionError: querying TypeCheckingHost outside of assigned file");
            }
        };
        SingleFileTypeCheckingHost.prototype.getSourceManager = function (sfPath) {
            this.assertPath(sfPath);
            return this.fileData.sourceManager;
        };
        SingleFileTypeCheckingHost.prototype.shouldCheckComponent = function (node) {
            if (this.sfPath !== file_system_1.absoluteFromSourceFile(node.getSourceFile())) {
                return false;
            }
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(this.sfPath);
            // Only need to generate a TCB for the class if no shim exists for it currently.
            return !this.fileData.shimData.has(shimPath);
        };
        SingleFileTypeCheckingHost.prototype.recordShimData = function (sfPath, data) {
            this.assertPath(sfPath);
            // Previous type-checking state may have required the use of inlines (assuming they were
            // supported). If the current operation also requires inlines, this presents a problem:
            // generating new inlines may invalidate any old inlines that old state depends on.
            //
            // Rather than resolve this issue by tracking specific dependencies on inlines, if the new state
            // relies on inlines, any old state that relied on them is simply cleared. This happens when the
            // first new state that uses inlines is encountered.
            if (data.hasInlines && !this.seenInlines) {
                this.impl.clearAllShimDataUsingInlines();
                this.seenInlines = true;
            }
            this.fileData.shimData.set(data.path, data);
            if (data.hasInlines) {
                this.fileData.hasInlines = true;
            }
        };
        SingleFileTypeCheckingHost.prototype.recordComplete = function (sfPath) {
            this.assertPath(sfPath);
            this.fileData.isComplete = true;
        };
        return SingleFileTypeCheckingHost;
    }());
    /**
     * Drives a `TypeCheckContext` to generate type-checking code efficiently for only those components
     * which map to a single shim of a single input file.
     */
    var SingleShimTypeCheckingHost = /** @class */ (function (_super) {
        tslib_1.__extends(SingleShimTypeCheckingHost, _super);
        function SingleShimTypeCheckingHost(sfPath, fileData, impl, shimPath) {
            var _this = _super.call(this, sfPath, fileData, impl) || this;
            _this.shimPath = shimPath;
            return _this;
        }
        SingleShimTypeCheckingHost.prototype.shouldCheckNode = function (node) {
            if (this.sfPath !== file_system_1.absoluteFromSourceFile(node.getSourceFile())) {
                return false;
            }
            // Only generate a TCB for the component if it maps to the requested shim file.
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(this.sfPath);
            if (shimPath !== this.shimPath) {
                return false;
            }
            // Only need to generate a TCB for the class if no shim exists for it currently.
            return !this.fileData.shimData.has(shimPath);
        };
        return SingleShimTypeCheckingHost;
    }(SingleFileTypeCheckingHost));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBZ047SUFHaE4sMkVBQXlEO0lBRXpELDJFQUE2RztJQUM3RyxtRUFBMEQ7SUFFMUQsNkRBQThFO0lBQzlFLGlGQUErRDtJQUMvRCx5RUFBMkY7SUFFM0YsK0RBQW1DO0lBQ25DLGtGQUE0RjtJQUM1RixxRUFBa1Q7SUFDbFQscUZBQXNEO0lBRXRELHVGQUE4QztJQUM5QyxpRkFBbUg7SUFDbkgseUZBQTBFO0lBQzFFLDJFQUE4QztJQUM5QywrRUFBK0M7SUFDL0MsbUZBQTBGO0lBQzFGLGlIQUF3RDtJQUd4RCxJQUFNLFFBQVEsR0FBRyxJQUFJLG1DQUF3QixFQUFFLENBQUM7SUFDaEQ7Ozs7T0FJRztJQUNIO1FBeUNFLGlDQUNZLGVBQTJCLEVBQVcsYUFBNEIsRUFDbEUsZ0JBQXlDLEVBQVUsTUFBMEIsRUFDN0UsVUFBNEIsRUFBVSxTQUF5QixFQUMvRCxZQUEyRCxFQUMzRCxVQUEyRCxFQUNsRCxvQkFBMEMsRUFDMUMsc0JBQThDLEVBQzlDLElBQWtCO1lBUDNCLG9CQUFlLEdBQWYsZUFBZSxDQUFZO1lBQVcsa0JBQWEsR0FBYixhQUFhLENBQWU7WUFDbEUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF5QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzdFLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDL0QsaUJBQVksR0FBWixZQUFZLENBQStDO1lBQzNELGVBQVUsR0FBVixVQUFVLENBQWlEO1lBQ2xELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7WUFDMUMsMkJBQXNCLEdBQXRC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QixFQUFFLFFBQThCLEVBQUUsSUFBNkIsRUFDN0UsUUFBd0I7WUFGcEMsWUFHRSxrQkFBTSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUM5QjtZQUZXLGNBQVEsR0FBUixRQUFRLENBQWdCOztRQUVwQyxDQUFDO1FBRUQsb0RBQWUsR0FBZixVQUFnQixJQUF5QjtZQUN2QyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssb0NBQXNCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUU7Z0JBQ2hFLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFFRCwrRUFBK0U7WUFDL0UsSUFBTSxRQUFRLEdBQUcsNkJBQXNCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3RCxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUM5QixPQUFPLEtBQUssQ0FBQzthQUNkO1lBRUQsZ0ZBQWdGO1lBQ2hGLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQXJCRCxDQUF5QywwQkFBMEIsR0FxQmxFIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBDc3NTZWxlY3RvciwgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBMaXRlcmFsUHJpbWl0aXZlLCBQYXJzZVNvdXJjZVNwYW4sIFByb3BlcnR5UmVhZCwgU2FmZVByb3BlcnR5UmVhZCwgVG1wbEFzdEVsZW1lbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVmZXJlbmNlLCBUbXBsQXN0VGVtcGxhdGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7VGV4dEF0dHJpYnV0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL3JlbmRlcjMvcjNfYXN0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aCwgZ2V0U291cmNlRmlsZU9yRXJyb3J9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvYXBpJztcbmltcG9ydCB7UGVyZkNoZWNrcG9pbnQsIFBlcmZFdmVudCwgUGVyZlBoYXNlLCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtQcm9ncmFtRHJpdmVyLCBVcGRhdGVNb2RlfSBmcm9tICcuLi8uLi9wcm9ncmFtX2RyaXZlcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge2lzU2hpbX0gZnJvbSAnLi4vLi4vc2hpbXMnO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlT3JOdWxsLCBpc1N5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7RGlyZWN0aXZlSW5TY29wZSwgRWxlbWVudFN5bWJvbCwgRnVsbFRlbXBsYXRlTWFwcGluZywgR2xvYmFsQ29tcGxldGlvbiwgTmdUZW1wbGF0ZURpYWdub3N0aWMsIE9wdGltaXplRm9yLCBQaXBlSW5TY29wZSwgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIsIFNoaW1Mb2NhdGlvbiwgU3ltYm9sLCBUZW1wbGF0ZURpYWdub3N0aWMsIFRlbXBsYXRlSWQsIFRlbXBsYXRlU3ltYm9sLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSwgVHlwZUNoZWNraW5nQ29uZmlnfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHttYWtlVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7Q29tcGxldGlvbkVuZ2luZX0gZnJvbSAnLi9jb21wbGV0aW9uJztcbmltcG9ydCB7SW5saW5pbmdNb2RlLCBTaGltVHlwZUNoZWNraW5nRGF0YSwgVGVtcGxhdGVEYXRhLCBUeXBlQ2hlY2tDb250ZXh0SW1wbCwgVHlwZUNoZWNraW5nSG9zdH0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7c2hvdWxkUmVwb3J0RGlhZ25vc3RpYywgdHJhbnNsYXRlRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge1R5cGVDaGVja1NoaW1HZW5lcmF0b3J9IGZyb20gJy4vc2hpbSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFuYWdlcn0gZnJvbSAnLi9zb3VyY2UnO1xuaW1wb3J0IHtmaW5kVHlwZUNoZWNrQmxvY2ssIGdldFRlbXBsYXRlTWFwcGluZywgVGVtcGxhdGVTb3VyY2VSZXNvbHZlcn0gZnJvbSAnLi90Y2JfdXRpbCc7XG5pbXBvcnQge1N5bWJvbEJ1aWxkZXJ9IGZyb20gJy4vdGVtcGxhdGVfc3ltYm9sX2J1aWxkZXInO1xuXG5cbmNvbnN0IFJFR0lTVFJZID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuLyoqXG4gKiBQcmltYXJ5IHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgZW5naW5lLCB3aGljaCBwZXJmb3JtcyB0eXBlLWNoZWNraW5nIHVzaW5nIGFcbiAqIGBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3lgIGZvciB0eXBlLWNoZWNraW5nIHByb2dyYW0gbWFpbnRlbmFuY2UsIGFuZCB0aGVcbiAqIGBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlcmAgZm9yIGdlbmVyYXRpb24gb2YgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBjb2RlLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwgaW1wbGVtZW50cyBUZW1wbGF0ZVR5cGVDaGVja2VyIHtcbiAgcHJpdmF0ZSBzdGF0ZSA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBTdG9yZXMgdGhlIGBDb21wbGV0aW9uRW5naW5lYCB3aGljaCBwb3dlcnMgYXV0b2NvbXBsZXRpb24gZm9yIGVhY2ggY29tcG9uZW50IGNsYXNzLlxuICAgKlxuICAgKiBNdXN0IGJlIGludmFsaWRhdGVkIHdoZW5ldmVyIHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZSBvciB0aGUgYHRzLlByb2dyYW1gIGNoYW5nZXMuIEludmFsaWRhdGlvblxuICAgKiBvbiB0ZW1wbGF0ZSBjaGFuZ2VzIGlzIHBlcmZvcm1lZCB3aXRoaW4gdGhpcyBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGluc3RhbmNlLiBXaGVuIHRoZVxuICAgKiBgdHMuUHJvZ3JhbWAgY2hhbmdlcywgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgYXMgYSB3aG9sZSBpcyBkZXN0cm95ZWQgYW5kIHJlcGxhY2VkLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wbGV0aW9uQ2FjaGUgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIENvbXBsZXRpb25FbmdpbmU+KCk7XG4gIC8qKlxuICAgKiBTdG9yZXMgdGhlIGBTeW1ib2xCdWlsZGVyYCB3aGljaCBjcmVhdGVzIHN5bWJvbHMgZm9yIGVhY2ggY29tcG9uZW50IGNsYXNzLlxuICAgKlxuICAgKiBNdXN0IGJlIGludmFsaWRhdGVkIHdoZW5ldmVyIHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZSBvciB0aGUgYHRzLlByb2dyYW1gIGNoYW5nZXMuIEludmFsaWRhdGlvblxuICAgKiBvbiB0ZW1wbGF0ZSBjaGFuZ2VzIGlzIHBlcmZvcm1lZCB3aXRoaW4gdGhpcyBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGluc3RhbmNlLiBXaGVuIHRoZVxuICAgKiBgdHMuUHJvZ3JhbWAgY2hhbmdlcywgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgYXMgYSB3aG9sZSBpcyBkZXN0cm95ZWQgYW5kIHJlcGxhY2VkLlxuICAgKi9cbiAgcHJpdmF0ZSBzeW1ib2xCdWlsZGVyQ2FjaGUgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIFN5bWJvbEJ1aWxkZXI+KCk7XG5cbiAgLyoqXG4gICAqIFN0b3JlcyBkaXJlY3RpdmVzIGFuZCBwaXBlcyB0aGF0IGFyZSBpbiBzY29wZSBmb3IgZWFjaCBjb21wb25lbnQuXG4gICAqXG4gICAqIFVubGlrZSBvdGhlciBjYWNoZXMsIHRoZSBzY29wZSBvZiBhIGNvbXBvbmVudCBpcyBub3QgYWZmZWN0ZWQgYnkgaXRzIHRlbXBsYXRlLiBJdCB3aWxsIGJlXG4gICAqIGRlc3Ryb3llZCB3aGVuIHRoZSBgdHMuUHJvZ3JhbWAgY2hhbmdlcyBhbmQgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgYXMgYSB3aG9sZSBpc1xuICAgKiBkZXN0cm95ZWQgYW5kIHJlcGxhY2VkLlxuICAgKi9cbiAgcHJpdmF0ZSBzY29wZUNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBTY29wZURhdGE+KCk7XG5cbiAgLyoqXG4gICAqIFN0b3JlcyBwb3RlbnRpYWwgZWxlbWVudCB0YWdzIGZvciBlYWNoIGNvbXBvbmVudCAoYSB1bmlvbiBvZiBET00gdGFncyBhcyB3ZWxsIGFzIGRpcmVjdGl2ZVxuICAgKiB0YWdzKS5cbiAgICpcbiAgICogVW5saWtlIG90aGVyIGNhY2hlcywgdGhlIHNjb3BlIG9mIGEgY29tcG9uZW50IGlzIG5vdCBhZmZlY3RlZCBieSBpdHMgdGVtcGxhdGUuIEl0IHdpbGwgYmVcbiAgICogZGVzdHJveWVkIHdoZW4gdGhlIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzIGFuZCB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBhcyBhIHdob2xlIGlzXG4gICAqIGRlc3Ryb3llZCBhbmQgcmVwbGFjZWQuXG4gICAqL1xuICBwcml2YXRlIGVsZW1lbnRUYWdDYWNoZSA9IG5ldyBNYXA8dHMuQ2xhc3NEZWNsYXJhdGlvbiwgTWFwPHN0cmluZywgRGlyZWN0aXZlSW5TY29wZXxudWxsPj4oKTtcblxuICBwcml2YXRlIGlzQ29tcGxldGUgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgb3JpZ2luYWxQcm9ncmFtOiB0cy5Qcm9ncmFtLCByZWFkb25seSBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgICAgcHJpdmF0ZSB0eXBlQ2hlY2tBZGFwdGVyOiBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlciwgcHJpdmF0ZSBjb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZyxcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBjb21waWxlckhvc3Q6IFBpY2s8dHMuQ29tcGlsZXJIb3N0LCAnZ2V0Q2Fub25pY2FsRmlsZU5hbWUnPixcbiAgICAgIHByaXZhdGUgcHJpb3JCdWlsZDogSW5jcmVtZW50YWxCdWlsZDx1bmtub3duLCBGaWxlVHlwZUNoZWNraW5nRGF0YT4sXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IGNvbXBvbmVudFNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlcixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeTogVHlwZUNoZWNrU2NvcGVSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgcGVyZjogUGVyZlJlY29yZGVyKSB7fVxuXG4gIGdldFRlbXBsYXRlKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFRtcGxBc3ROb2RlW118bnVsbCB7XG4gICAgY29uc3Qge2RhdGF9ID0gdGhpcy5nZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQpO1xuICAgIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGEudGVtcGxhdGU7XG4gIH1cblxuICBwcml2YXRlIGdldExhdGVzdENvbXBvbmVudFN0YXRlKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6XG4gICAgICB7ZGF0YTogVGVtcGxhdGVEYXRhfG51bGwsIHRjYjogdHMuTm9kZXxudWxsLCBzaGltUGF0aDogQWJzb2x1dGVGc1BhdGh9IHtcbiAgICB0aGlzLmVuc3VyZVNoaW1Gb3JDb21wb25lbnQoY29tcG9uZW50KTtcblxuICAgIGNvbnN0IHNmID0gY29tcG9uZW50LmdldFNvdXJjZUZpbGUoKTtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICBjb25zdCBzaGltUGF0aCA9IFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcihzZlBhdGgpO1xuXG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcblxuICAgIGlmICghZmlsZVJlY29yZC5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICByZXR1cm4ge2RhdGE6IG51bGwsIHRjYjogbnVsbCwgc2hpbVBhdGh9O1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjb21wb25lbnQpO1xuICAgIGNvbnN0IHNoaW1SZWNvcmQgPSBmaWxlUmVjb3JkLnNoaW1EYXRhLmdldChzaGltUGF0aCkhO1xuICAgIGNvbnN0IGlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcblxuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpO1xuICAgIGNvbnN0IHNoaW1TZiA9IGdldFNvdXJjZUZpbGVPck51bGwocHJvZ3JhbSwgc2hpbVBhdGgpO1xuXG4gICAgaWYgKHNoaW1TZiA9PT0gbnVsbCB8fCAhZmlsZVJlY29yZC5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yOiBubyBzaGltIGZpbGUgaW4gcHJvZ3JhbTogJHtzaGltUGF0aH1gKTtcbiAgICB9XG5cbiAgICBsZXQgdGNiOiB0cy5Ob2RlfG51bGwgPSBmaW5kVHlwZUNoZWNrQmxvY2soc2hpbVNmLCBpZCwgLyppc0RpYWdub3N0aWNzUmVxdWVzdCovIGZhbHNlKTtcblxuICAgIGlmICh0Y2IgPT09IG51bGwpIHtcbiAgICAgIC8vIFRyeSBmb3IgYW4gaW5saW5lIGJsb2NrLlxuICAgICAgY29uc3QgaW5saW5lU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcihwcm9ncmFtLCBzZlBhdGgpO1xuICAgICAgdGNiID0gZmluZFR5cGVDaGVja0Jsb2NrKGlubGluZVNmLCBpZCwgLyppc0RpYWdub3N0aWNzUmVxdWVzdCovIGZhbHNlKTtcbiAgICB9XG5cbiAgICBsZXQgZGF0YTogVGVtcGxhdGVEYXRhfG51bGwgPSBudWxsO1xuICAgIGlmIChzaGltUmVjb3JkLnRlbXBsYXRlcy5oYXModGVtcGxhdGVJZCkpIHtcbiAgICAgIGRhdGEgPSBzaGltUmVjb3JkLnRlbXBsYXRlcy5nZXQodGVtcGxhdGVJZCkhO1xuICAgIH1cblxuICAgIHJldHVybiB7ZGF0YSwgdGNiLCBzaGltUGF0aH07XG4gIH1cblxuICBpc1RyYWNrZWRUeXBlQ2hlY2tGaWxlKGZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmdldEZpbGVBbmRTaGltUmVjb3Jkc0ZvclBhdGgoZmlsZVBhdGgpICE9PSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRGaWxlQW5kU2hpbVJlY29yZHNGb3JQYXRoKHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6XG4gICAgICB7ZmlsZVJlY29yZDogRmlsZVR5cGVDaGVja2luZ0RhdGEsIHNoaW1SZWNvcmQ6IFNoaW1UeXBlQ2hlY2tpbmdEYXRhfXxudWxsIHtcbiAgICBmb3IgKGNvbnN0IGZpbGVSZWNvcmQgb2YgdGhpcy5zdGF0ZS52YWx1ZXMoKSkge1xuICAgICAgaWYgKGZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgICByZXR1cm4ge2ZpbGVSZWNvcmQsIHNoaW1SZWNvcmQ6IGZpbGVSZWNvcmQuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSF9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldFRlbXBsYXRlTWFwcGluZ0F0U2hpbUxvY2F0aW9uKHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfTogU2hpbUxvY2F0aW9uKTpcbiAgICAgIEZ1bGxUZW1wbGF0ZU1hcHBpbmd8bnVsbCB7XG4gICAgY29uc3QgcmVjb3JkcyA9IHRoaXMuZ2V0RmlsZUFuZFNoaW1SZWNvcmRzRm9yUGF0aChhYnNvbHV0ZUZyb20oc2hpbVBhdGgpKTtcbiAgICBpZiAocmVjb3JkcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHtmaWxlUmVjb3JkfSA9IHJlY29yZHM7XG5cbiAgICBjb25zdCBzaGltU2YgPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpLmdldFNvdXJjZUZpbGUoYWJzb2x1dGVGcm9tKHNoaW1QYXRoKSk7XG4gICAgaWYgKHNoaW1TZiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGdldFRlbXBsYXRlTWFwcGluZyhcbiAgICAgICAgc2hpbVNmLCBwb3NpdGlvbkluU2hpbUZpbGUsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlciwgLyppc0RpYWdub3N0aWNzUmVxdWVzdCovIGZhbHNlKTtcbiAgfVxuXG4gIGdlbmVyYXRlQWxsVHlwZUNoZWNrQmxvY2tzKCkge1xuICAgIHRoaXMuZW5zdXJlQWxsU2hpbXNGb3JBbGxGaWxlcygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHR5cGUtY2hlY2tpbmcgYW5kIHRlbXBsYXRlIHBhcnNlIGRpYWdub3N0aWNzIGZyb20gdGhlIGdpdmVuIGB0cy5Tb3VyY2VGaWxlYCB1c2luZyB0aGVcbiAgICogbW9zdCByZWNlbnQgdHlwZS1jaGVja2luZyBwcm9ncmFtLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBvcHRpbWl6ZUZvcjogT3B0aW1pemVGb3IpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHN3aXRjaCAob3B0aW1pemVGb3IpIHtcbiAgICAgIGNhc2UgT3B0aW1pemVGb3IuV2hvbGVQcm9ncmFtOlxuICAgICAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yQWxsRmlsZXMoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIE9wdGltaXplRm9yLlNpbmdsZUZpbGU6XG4gICAgICAgIHRoaXMuZW5zdXJlQWxsU2hpbXNGb3JPbmVGaWxlKHNmKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFBlcmZQaGFzZS5UdGNEaWFnbm9zdGljcywgKCkgPT4ge1xuICAgICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgICBjb25zdCBmaWxlUmVjb3JkID0gdGhpcy5zdGF0ZS5nZXQoc2ZQYXRoKSE7XG5cbiAgICAgIGNvbnN0IHR5cGVDaGVja1Byb2dyYW0gPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpO1xuXG4gICAgICBjb25zdCBkaWFnbm9zdGljczogKHRzLkRpYWdub3N0aWN8bnVsbClbXSA9IFtdO1xuICAgICAgaWYgKGZpbGVSZWNvcmQuaGFzSW5saW5lcykge1xuICAgICAgICBjb25zdCBpbmxpbmVTZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNmUGF0aCk7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHlwZUNoZWNrUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGlubGluZVNmKS5tYXAoXG4gICAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBbc2hpbVBhdGgsIHNoaW1SZWNvcmRdIG9mIGZpbGVSZWNvcmQuc2hpbURhdGEpIHtcbiAgICAgICAgY29uc3Qgc2hpbVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IodHlwZUNoZWNrUHJvZ3JhbSwgc2hpbVBhdGgpO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzaGltU2YpLm1hcChcbiAgICAgICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnNoaW1SZWNvcmQuZ2VuZXNpc0RpYWdub3N0aWNzKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHRlbXBsYXRlRGF0YSBvZiBzaGltUmVjb3JkLnRlbXBsYXRlcy52YWx1ZXMoKSkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGVtcGxhdGVEYXRhLnRlbXBsYXRlRGlhZ25vc3RpY3MpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkaWFnbm9zdGljcy5maWx0ZXIoKGRpYWc6IHRzLkRpYWdub3N0aWN8bnVsbCk6IGRpYWcgaXMgdHMuRGlhZ25vc3RpYyA9PiBkaWFnICE9PSBudWxsKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldERpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgdGhpcy5lbnN1cmVTaGltRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICByZXR1cm4gdGhpcy5wZXJmLmluUGhhc2UoUGVyZlBoYXNlLlR0Y0RpYWdub3N0aWNzLCAoKSA9PiB7XG4gICAgICBjb25zdCBzZiA9IGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICAgIGNvbnN0IHNoaW1QYXRoID0gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHNmUGF0aCk7XG5cbiAgICAgIGNvbnN0IGZpbGVSZWNvcmQgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG5cbiAgICAgIGlmICghZmlsZVJlY29yZC5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKGNvbXBvbmVudCk7XG4gICAgICBjb25zdCBzaGltUmVjb3JkID0gZmlsZVJlY29yZC5zaGltRGF0YS5nZXQoc2hpbVBhdGgpITtcblxuICAgICAgY29uc3QgdHlwZUNoZWNrUHJvZ3JhbSA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCk7XG5cbiAgICAgIGNvbnN0IGRpYWdub3N0aWNzOiAoVGVtcGxhdGVEaWFnbm9zdGljfG51bGwpW10gPSBbXTtcbiAgICAgIGlmIChzaGltUmVjb3JkLmhhc0lubGluZXMpIHtcbiAgICAgICAgY29uc3QgaW5saW5lU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzZlBhdGgpO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhpbmxpbmVTZikubWFwKFxuICAgICAgICAgICAgZGlhZyA9PiBjb252ZXJ0RGlhZ25vc3RpYyhkaWFnLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIpKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNoaW1TZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNoaW1QYXRoKTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHlwZUNoZWNrUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNoaW1TZikubWFwKFxuICAgICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zaGltUmVjb3JkLmdlbmVzaXNEaWFnbm9zdGljcyk7XG5cbiAgICAgIGZvciAoY29uc3QgdGVtcGxhdGVEYXRhIG9mIHNoaW1SZWNvcmQudGVtcGxhdGVzLnZhbHVlcygpKSB7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGVtcGxhdGVEYXRhLnRlbXBsYXRlRGlhZ25vc3RpY3MpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGlhZ25vc3RpY3MuZmlsdGVyKFxuICAgICAgICAgIChkaWFnOiBUZW1wbGF0ZURpYWdub3N0aWN8bnVsbCk6IGRpYWcgaXMgVGVtcGxhdGVEaWFnbm9zdGljID0+XG4gICAgICAgICAgICAgIGRpYWcgIT09IG51bGwgJiYgZGlhZy50ZW1wbGF0ZUlkID09PSB0ZW1wbGF0ZUlkKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldFR5cGVDaGVja0Jsb2NrKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHRzLk5vZGV8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50KS50Y2I7XG4gIH1cblxuICBnZXRHbG9iYWxDb21wbGV0aW9ucyhcbiAgICAgIGNvbnRleHQ6IFRtcGxBc3RUZW1wbGF0ZXxudWxsLCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24sXG4gICAgICBub2RlOiBBU1R8VG1wbEFzdE5vZGUpOiBHbG9iYWxDb21wbGV0aW9ufG51bGwge1xuICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMuZ2V0T3JDcmVhdGVDb21wbGV0aW9uRW5naW5lKGNvbXBvbmVudCk7XG4gICAgaWYgKGVuZ2luZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShcbiAgICAgICAgUGVyZlBoYXNlLlR0Y0F1dG9jb21wbGV0aW9uLCAoKSA9PiBlbmdpbmUuZ2V0R2xvYmFsQ29tcGxldGlvbnMoY29udGV4dCwgbm9kZSkpO1xuICB9XG5cbiAgZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25Mb2NhdGlvbihcbiAgICAgIGFzdDogUHJvcGVydHlSZWFkfFNhZmVQcm9wZXJ0eVJlYWQsIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFNoaW1Mb2NhdGlvbnxudWxsIHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldE9yQ3JlYXRlQ29tcGxldGlvbkVuZ2luZShjb21wb25lbnQpO1xuICAgIGlmIChlbmdpbmUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wZXJmLmluUGhhc2UoXG4gICAgICAgIFBlcmZQaGFzZS5UdGNBdXRvY29tcGxldGlvbiwgKCkgPT4gZW5naW5lLmdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oYXN0KSk7XG4gIH1cblxuICBnZXRMaXRlcmFsQ29tcGxldGlvbkxvY2F0aW9uKFxuICAgICAgbm9kZTogTGl0ZXJhbFByaW1pdGl2ZXxUZXh0QXR0cmlidXRlLCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBTaGltTG9jYXRpb258bnVsbCB7XG4gICAgY29uc3QgZW5naW5lID0gdGhpcy5nZXRPckNyZWF0ZUNvbXBsZXRpb25FbmdpbmUoY29tcG9uZW50KTtcbiAgICBpZiAoZW5naW5lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFxuICAgICAgICBQZXJmUGhhc2UuVHRjQXV0b2NvbXBsZXRpb24sICgpID0+IGVuZ2luZS5nZXRMaXRlcmFsQ29tcGxldGlvbkxvY2F0aW9uKG5vZGUpKTtcbiAgfVxuXG4gIGludmFsaWRhdGVDbGFzcyhjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIHRoaXMuY29tcGxldGlvbkNhY2hlLmRlbGV0ZShjbGF6eik7XG4gICAgdGhpcy5zeW1ib2xCdWlsZGVyQ2FjaGUuZGVsZXRlKGNsYXp6KTtcbiAgICB0aGlzLnNjb3BlQ2FjaGUuZGVsZXRlKGNsYXp6KTtcbiAgICB0aGlzLmVsZW1lbnRUYWdDYWNoZS5kZWxldGUoY2xhenopO1xuXG4gICAgY29uc3Qgc2YgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3Ioc2ZQYXRoKTtcbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZURhdGEuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKGNsYXp6KTtcblxuICAgIGZpbGVEYXRhLnNoaW1EYXRhLmRlbGV0ZShzaGltUGF0aCk7XG4gICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5pc0NvbXBsZXRlID0gZmFsc2U7XG4gIH1cblxuICBtYWtlVGVtcGxhdGVEaWFnbm9zdGljPFQgZXh0ZW5kcyBFcnJvckNvZGU+KFxuICAgICAgY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHNvdXJjZVNwYW46IFBhcnNlU291cmNlU3BhbiwgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeSxcbiAgICAgIGVycm9yQ29kZTogVCwgbWVzc2FnZTogc3RyaW5nLCByZWxhdGVkSW5mb3JtYXRpb24/OiB7XG4gICAgICAgIHRleHQ6IHN0cmluZyxcbiAgICAgICAgc3RhcnQ6IG51bWJlcixcbiAgICAgICAgZW5kOiBudW1iZXIsXG4gICAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gICAgICB9W10pOiBOZ1RlbXBsYXRlRGlhZ25vc3RpYzxUPiB7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShjbGF6ei5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IGZpbGVSZWNvcmQgPSB0aGlzLnN0YXRlLmdldChzZlBhdGgpITtcbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY2xhenopO1xuICAgIGNvbnN0IG1hcHBpbmcgPSBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIuZ2V0U291cmNlTWFwcGluZyh0ZW1wbGF0ZUlkKTtcblxuICAgIHJldHVybiB7XG4gICAgICAuLi5tYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICAgIHRlbXBsYXRlSWQsIG1hcHBpbmcsIHNvdXJjZVNwYW4sIGNhdGVnb3J5LCBuZ0Vycm9yQ29kZShlcnJvckNvZGUpLCBtZXNzYWdlLFxuICAgICAgICAgIHJlbGF0ZWRJbmZvcm1hdGlvbiksXG4gICAgICBfX25nQ29kZTogZXJyb3JDb2RlXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0T3JDcmVhdGVDb21wbGV0aW9uRW5naW5lKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENvbXBsZXRpb25FbmdpbmV8bnVsbCB7XG4gICAgaWYgKHRoaXMuY29tcGxldGlvbkNhY2hlLmhhcyhjb21wb25lbnQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21wbGV0aW9uQ2FjaGUuZ2V0KGNvbXBvbmVudCkhO1xuICAgIH1cblxuICAgIGNvbnN0IHt0Y2IsIGRhdGEsIHNoaW1QYXRofSA9IHRoaXMuZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50KTtcbiAgICBpZiAodGNiID09PSBudWxsIHx8IGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGVuZ2luZSA9IG5ldyBDb21wbGV0aW9uRW5naW5lKHRjYiwgZGF0YSwgc2hpbVBhdGgpO1xuICAgIHRoaXMuY29tcGxldGlvbkNhY2hlLnNldChjb21wb25lbnQsIGVuZ2luZSk7XG4gICAgcmV0dXJuIGVuZ2luZTtcbiAgfVxuXG4gIHByaXZhdGUgbWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5oYXMoc2ZQYXRoKSkge1xuICAgICAgY29uc3QgZXhpc3RpbmdSZXN1bHRzID0gdGhpcy5zdGF0ZS5nZXQoc2ZQYXRoKSE7XG5cbiAgICAgIGlmIChleGlzdGluZ1Jlc3VsdHMuaXNDb21wbGV0ZSkge1xuICAgICAgICAvLyBBbGwgZGF0YSBmb3IgdGhpcyBmaWxlIGhhcyBhbHJlYWR5IGJlZW4gZ2VuZXJhdGVkLCBzbyBubyBuZWVkIHRvIGFkb3B0IGFueXRoaW5nLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcHJldmlvdXNSZXN1bHRzID0gdGhpcy5wcmlvckJ1aWxkLnByaW9yVHlwZUNoZWNraW5nUmVzdWx0c0ZvcihzZik7XG4gICAgaWYgKHByZXZpb3VzUmVzdWx0cyA9PT0gbnVsbCB8fCAhcHJldmlvdXNSZXN1bHRzLmlzQ29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuUmV1c2VUeXBlQ2hlY2tGaWxlKTtcbiAgICB0aGlzLnN0YXRlLnNldChzZlBhdGgsIHByZXZpb3VzUmVzdWx0cyk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFsbFNoaW1zRm9yQWxsRmlsZXMoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaXNDb21wbGV0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGVyZi5pblBoYXNlKFBlcmZQaGFzZS5UY2JHZW5lcmF0aW9uLCAoKSA9PiB7XG4gICAgICBjb25zdCBob3N0ID0gbmV3IFdob2xlUHJvZ3JhbVR5cGVDaGVja2luZ0hvc3QodGhpcyk7XG4gICAgICBjb25zdCBjdHggPSB0aGlzLm5ld0NvbnRleHQoaG9zdCk7XG5cbiAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy5vcmlnaW5hbFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaXNTaGltKHNmKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZik7XG5cbiAgICAgICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgICAgICBpZiAoZmlsZURhdGEuaXNDb21wbGV0ZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50eXBlQ2hlY2tBZGFwdGVyLnR5cGVDaGVjayhzZiwgY3R4KTtcblxuICAgICAgICBmaWxlRGF0YS5pc0NvbXBsZXRlID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy51cGRhdGVGcm9tQ29udGV4dChjdHgpO1xuICAgICAgdGhpcy5pc0NvbXBsZXRlID0gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQWxsU2hpbXNGb3JPbmVGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgdGhpcy5wZXJmLmluUGhhc2UoUGVyZlBoYXNlLlRjYkdlbmVyYXRpb24sICgpID0+IHtcbiAgICAgIHRoaXMubWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2YpO1xuXG4gICAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcblxuICAgICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgICBpZiAoZmlsZURhdGEuaXNDb21wbGV0ZSkge1xuICAgICAgICAvLyBBbGwgZGF0YSBmb3IgdGhpcyBmaWxlIGlzIHByZXNlbnQgYW5kIGFjY291bnRlZCBmb3IgYWxyZWFkeS5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBob3N0ID0gbmV3IFNpbmdsZUZpbGVUeXBlQ2hlY2tpbmdIb3N0KHNmUGF0aCwgZmlsZURhdGEsIHRoaXMpO1xuICAgICAgY29uc3QgY3R4ID0gdGhpcy5uZXdDb250ZXh0KGhvc3QpO1xuXG4gICAgICB0aGlzLnR5cGVDaGVja0FkYXB0ZXIudHlwZUNoZWNrKHNmLCBjdHgpO1xuXG4gICAgICBmaWxlRGF0YS5pc0NvbXBsZXRlID0gdHJ1ZTtcblxuICAgICAgdGhpcy51cGRhdGVGcm9tQ29udGV4dChjdHgpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVTaGltRm9yQ29tcG9uZW50KGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIGNvbnN0IHNmID0gY29tcG9uZW50LmdldFNvdXJjZUZpbGUoKTtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICBjb25zdCBzaGltUGF0aCA9IFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcihzZlBhdGgpO1xuXG4gICAgdGhpcy5tYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZik7XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcblxuICAgIGlmIChmaWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICAvLyBBbGwgZGF0YSBmb3IgdGhpcyBjb21wb25lbnQgaXMgYXZhaWxhYmxlLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGhvc3QgPSBuZXcgU2luZ2xlU2hpbVR5cGVDaGVja2luZ0hvc3Qoc2ZQYXRoLCBmaWxlRGF0YSwgdGhpcywgc2hpbVBhdGgpO1xuICAgIGNvbnN0IGN0eCA9IHRoaXMubmV3Q29udGV4dChob3N0KTtcblxuICAgIHRoaXMudHlwZUNoZWNrQWRhcHRlci50eXBlQ2hlY2soc2YsIGN0eCk7XG4gICAgdGhpcy51cGRhdGVGcm9tQ29udGV4dChjdHgpO1xuICB9XG5cbiAgcHJpdmF0ZSBuZXdDb250ZXh0KGhvc3Q6IFR5cGVDaGVja2luZ0hvc3QpOiBUeXBlQ2hlY2tDb250ZXh0SW1wbCB7XG4gICAgY29uc3QgaW5saW5pbmcgPVxuICAgICAgICB0aGlzLnByb2dyYW1Ecml2ZXIuc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zID8gSW5saW5pbmdNb2RlLklubGluZU9wcyA6IElubGluaW5nTW9kZS5FcnJvcjtcbiAgICByZXR1cm4gbmV3IFR5cGVDaGVja0NvbnRleHRJbXBsKFxuICAgICAgICB0aGlzLmNvbmZpZywgdGhpcy5jb21waWxlckhvc3QsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5yZWZsZWN0b3IsIGhvc3QsIGlubGluaW5nLCB0aGlzLnBlcmYpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbnkgc2hpbSBkYXRhIHRoYXQgZGVwZW5kcyBvbiBpbmxpbmUgb3BlcmF0aW9ucyBhcHBsaWVkIHRvIHRoZSB0eXBlLWNoZWNraW5nIHByb2dyYW0uXG4gICAqXG4gICAqIFRoaXMgY2FuIGJlIHVzZWZ1bCBpZiBuZXcgaW5saW5lcyBuZWVkIHRvIGJlIGFwcGxpZWQsIGFuZCBpdCdzIG5vdCBwb3NzaWJsZSB0byBndWFyYW50ZWUgdGhhdFxuICAgKiB0aGV5IHdvbid0IG92ZXJ3cml0ZSBvciBjb3JydXB0IGV4aXN0aW5nIGlubGluZXMgdGhhdCBhcmUgdXNlZCBieSBzdWNoIHNoaW1zLlxuICAgKi9cbiAgY2xlYXJBbGxTaGltRGF0YVVzaW5nSW5saW5lcygpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGZpbGVEYXRhIG9mIHRoaXMuc3RhdGUudmFsdWVzKCkpIHtcbiAgICAgIGlmICghZmlsZURhdGEuaGFzSW5saW5lcykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBbc2hpbUZpbGUsIHNoaW1EYXRhXSBvZiBmaWxlRGF0YS5zaGltRGF0YS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKHNoaW1EYXRhLmhhc0lubGluZXMpIHtcbiAgICAgICAgICBmaWxlRGF0YS5zaGltRGF0YS5kZWxldGUoc2hpbUZpbGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSBmYWxzZTtcbiAgICAgIGZpbGVEYXRhLmlzQ29tcGxldGUgPSBmYWxzZTtcbiAgICAgIHRoaXMuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlRnJvbUNvbnRleHQoY3R4OiBUeXBlQ2hlY2tDb250ZXh0SW1wbCk6IHZvaWQge1xuICAgIGNvbnN0IHVwZGF0ZXMgPSBjdHguZmluYWxpemUoKTtcbiAgICByZXR1cm4gdGhpcy5wZXJmLmluUGhhc2UoUGVyZlBoYXNlLlRjYlVwZGF0ZVByb2dyYW0sICgpID0+IHtcbiAgICAgIGlmICh1cGRhdGVzLnNpemUgPiAwKSB7XG4gICAgICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5VcGRhdGVUeXBlQ2hlY2tQcm9ncmFtKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHJvZ3JhbURyaXZlci51cGRhdGVGaWxlcyh1cGRhdGVzLCBVcGRhdGVNb2RlLkluY3JlbWVudGFsKTtcbiAgICAgIHRoaXMucHJpb3JCdWlsZC5yZWNvcmRTdWNjZXNzZnVsVHlwZUNoZWNrKHRoaXMuc3RhdGUpO1xuICAgICAgdGhpcy5wZXJmLm1lbW9yeShQZXJmQ2hlY2twb2ludC5UdGNVcGRhdGVQcm9ncmFtKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldEZpbGVEYXRhKHBhdGg6IEFic29sdXRlRnNQYXRoKTogRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAgIGlmICghdGhpcy5zdGF0ZS5oYXMocGF0aCkpIHtcbiAgICAgIHRoaXMuc3RhdGUuc2V0KHBhdGgsIHtcbiAgICAgICAgaGFzSW5saW5lczogZmFsc2UsXG4gICAgICAgIHNvdXJjZU1hbmFnZXI6IG5ldyBUZW1wbGF0ZVNvdXJjZU1hbmFnZXIoKSxcbiAgICAgICAgaXNDb21wbGV0ZTogZmFsc2UsXG4gICAgICAgIHNoaW1EYXRhOiBuZXcgTWFwKCksXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUuZ2V0KHBhdGgpITtcbiAgfVxuICBnZXRTeW1ib2xPZk5vZGUobm9kZTogVG1wbEFzdFRlbXBsYXRlLCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUZW1wbGF0ZVN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2xPZk5vZGUobm9kZTogVG1wbEFzdEVsZW1lbnQsIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IEVsZW1lbnRTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sT2ZOb2RlKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLmdldE9yQ3JlYXRlU3ltYm9sQnVpbGRlcihjb21wb25lbnQpO1xuICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFBlcmZQaGFzZS5UdGNTeW1ib2wsICgpID0+IGJ1aWxkZXIuZ2V0U3ltYm9sKG5vZGUpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0T3JDcmVhdGVTeW1ib2xCdWlsZGVyKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFN5bWJvbEJ1aWxkZXJ8bnVsbCB7XG4gICAgaWYgKHRoaXMuc3ltYm9sQnVpbGRlckNhY2hlLmhhcyhjb21wb25lbnQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5zeW1ib2xCdWlsZGVyQ2FjaGUuZ2V0KGNvbXBvbmVudCkhO1xuICAgIH1cblxuICAgIGNvbnN0IHt0Y2IsIGRhdGEsIHNoaW1QYXRofSA9IHRoaXMuZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50KTtcbiAgICBpZiAodGNiID09PSBudWxsIHx8IGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGJ1aWxkZXIgPSBuZXcgU3ltYm9sQnVpbGRlcihcbiAgICAgICAgc2hpbVBhdGgsIHRjYiwgZGF0YSwgdGhpcy5jb21wb25lbnRTY29wZVJlYWRlcixcbiAgICAgICAgKCkgPT4gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKS5nZXRUeXBlQ2hlY2tlcigpKTtcbiAgICB0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5zZXQoY29tcG9uZW50LCBidWlsZGVyKTtcbiAgICByZXR1cm4gYnVpbGRlcjtcbiAgfVxuXG4gIGdldERpcmVjdGl2ZXNJblNjb3BlKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IERpcmVjdGl2ZUluU2NvcGVbXXxudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRTY29wZURhdGEoY29tcG9uZW50KTtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLmRpcmVjdGl2ZXM7XG4gIH1cblxuICBnZXRQaXBlc0luU2NvcGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogUGlwZUluU2NvcGVbXXxudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRTY29wZURhdGEoY29tcG9uZW50KTtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLnBpcGVzO1xuICB9XG5cbiAgZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGlyOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGF8bnVsbCB7XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihkaXIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudHlwZUNoZWNrU2NvcGVSZWdpc3RyeS5nZXRUeXBlQ2hlY2tEaXJlY3RpdmVNZXRhZGF0YShuZXcgUmVmZXJlbmNlKGRpcikpO1xuICB9XG5cbiAgZ2V0UG90ZW50aWFsRWxlbWVudFRhZ3MoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogTWFwPHN0cmluZywgRGlyZWN0aXZlSW5TY29wZXxudWxsPiB7XG4gICAgaWYgKHRoaXMuZWxlbWVudFRhZ0NhY2hlLmhhcyhjb21wb25lbnQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbGVtZW50VGFnQ2FjaGUuZ2V0KGNvbXBvbmVudCkhO1xuICAgIH1cblxuICAgIGNvbnN0IHRhZ01hcCA9IG5ldyBNYXA8c3RyaW5nLCBEaXJlY3RpdmVJblNjb3BlfG51bGw+KCk7XG5cbiAgICBmb3IgKGNvbnN0IHRhZyBvZiBSRUdJU1RSWS5hbGxLbm93bkVsZW1lbnROYW1lcygpKSB7XG4gICAgICB0YWdNYXAuc2V0KHRhZywgbnVsbCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmdldFNjb3BlRGF0YShjb21wb25lbnQpO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2Ygc2NvcGUuZGlyZWN0aXZlcykge1xuICAgICAgICBmb3IgKGNvbnN0IHNlbGVjdG9yIG9mIENzc1NlbGVjdG9yLnBhcnNlKGRpcmVjdGl2ZS5zZWxlY3RvcikpIHtcbiAgICAgICAgICBpZiAoc2VsZWN0b3IuZWxlbWVudCA9PT0gbnVsbCB8fCB0YWdNYXAuaGFzKHNlbGVjdG9yLmVsZW1lbnQpKSB7XG4gICAgICAgICAgICAvLyBTa2lwIHRoaXMgZGlyZWN0aXZlIGlmIGl0IGRvZXNuJ3QgbWF0Y2ggYW4gZWxlbWVudCB0YWcsIG9yIGlmIGFub3RoZXIgZGlyZWN0aXZlIGhhc1xuICAgICAgICAgICAgLy8gYWxyZWFkeSBiZWVuIGluY2x1ZGVkIHdpdGggdGhlIHNhbWUgZWxlbWVudCBuYW1lLlxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGFnTWFwLnNldChzZWxlY3Rvci5lbGVtZW50LCBkaXJlY3RpdmUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5lbGVtZW50VGFnQ2FjaGUuc2V0KGNvbXBvbmVudCwgdGFnTWFwKTtcbiAgICByZXR1cm4gdGFnTWFwO1xuICB9XG5cbiAgZ2V0UG90ZW50aWFsRG9tQmluZGluZ3ModGFnTmFtZTogc3RyaW5nKToge2F0dHJpYnV0ZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nfVtdIHtcbiAgICBjb25zdCBhdHRyaWJ1dGVzID0gUkVHSVNUUlkuYWxsS25vd25BdHRyaWJ1dGVzT2ZFbGVtZW50KHRhZ05hbWUpO1xuICAgIHJldHVybiBhdHRyaWJ1dGVzLm1hcChhdHRyaWJ1dGUgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IFJFR0lTVFJZLmdldE1hcHBlZFByb3BOYW1lKGF0dHJpYnV0ZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0U2NvcGVEYXRhKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFNjb3BlRGF0YXxudWxsIHtcbiAgICBpZiAodGhpcy5zY29wZUNhY2hlLmhhcyhjb21wb25lbnQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5zY29wZUNhY2hlLmdldChjb21wb25lbnQpITtcbiAgICB9XG5cbiAgICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGNvbXBvbmVudCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uRXJyb3I6IGNvbXBvbmVudHMgbXVzdCBoYXZlIG5hbWVzYCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgaWYgKHNjb3BlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhOiBTY29wZURhdGEgPSB7XG4gICAgICBkaXJlY3RpdmVzOiBbXSxcbiAgICAgIHBpcGVzOiBbXSxcbiAgICAgIGlzUG9pc29uZWQ6IHNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQsXG4gICAgfTtcblxuICAgIGNvbnN0IHR5cGVDaGVja2VyID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMpIHtcbiAgICAgIGlmIChkaXIuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgLy8gU2tpcCB0aGlzIGRpcmVjdGl2ZSwgaXQgY2FuJ3QgYmUgYWRkZWQgdG8gYSB0ZW1wbGF0ZSBhbnl3YXkuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgdHNTeW1ib2wgPSB0eXBlQ2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRpci5yZWYubm9kZS5uYW1lKTtcbiAgICAgIGlmICghaXNTeW1ib2xXaXRoVmFsdWVEZWNsYXJhdGlvbih0c1N5bWJvbCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBuZ01vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbnxudWxsID0gbnVsbDtcbiAgICAgIGNvbnN0IG1vZHVsZVNjb3BlT2ZEaXIgPSB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KGRpci5yZWYubm9kZSk7XG4gICAgICBpZiAobW9kdWxlU2NvcGVPZkRpciAhPT0gbnVsbCkge1xuICAgICAgICBuZ01vZHVsZSA9IG1vZHVsZVNjb3BlT2ZEaXIubmdNb2R1bGU7XG4gICAgICB9XG5cbiAgICAgIGRhdGEuZGlyZWN0aXZlcy5wdXNoKHtcbiAgICAgICAgaXNDb21wb25lbnQ6IGRpci5pc0NvbXBvbmVudCxcbiAgICAgICAgaXNTdHJ1Y3R1cmFsOiBkaXIuaXNTdHJ1Y3R1cmFsLFxuICAgICAgICBzZWxlY3RvcjogZGlyLnNlbGVjdG9yLFxuICAgICAgICB0c1N5bWJvbCxcbiAgICAgICAgbmdNb2R1bGUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHBpcGUgb2Ygc2NvcGUuY29tcGlsYXRpb24ucGlwZXMpIHtcbiAgICAgIGNvbnN0IHRzU3ltYm9sID0gdHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihwaXBlLnJlZi5ub2RlLm5hbWUpO1xuICAgICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBkYXRhLnBpcGVzLnB1c2goe1xuICAgICAgICBuYW1lOiBwaXBlLm5hbWUsXG4gICAgICAgIHRzU3ltYm9sLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5zY29wZUNhY2hlLnNldChjb21wb25lbnQsIGRhdGEpO1xuICAgIHJldHVybiBkYXRhO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnREaWFnbm9zdGljKFxuICAgIGRpYWc6IHRzLkRpYWdub3N0aWMsIHNvdXJjZVJlc29sdmVyOiBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyKTogVGVtcGxhdGVEaWFnbm9zdGljfG51bGwge1xuICBpZiAoIXNob3VsZFJlcG9ydERpYWdub3N0aWMoZGlhZykpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gdHJhbnNsYXRlRGlhZ25vc3RpYyhkaWFnLCBzb3VyY2VSZXNvbHZlcik7XG59XG5cbi8qKlxuICogRGF0YSBmb3IgdGVtcGxhdGUgdHlwZS1jaGVja2luZyByZWxhdGVkIHRvIGEgc3BlY2lmaWMgaW5wdXQgZmlsZSBpbiB0aGUgdXNlcidzIHByb2dyYW0gKHdoaWNoXG4gKiBjb250YWlucyBjb21wb25lbnRzIHRvIGJlIGNoZWNrZWQpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIHR5cGUtY2hlY2tpbmcgc2hpbSByZXF1aXJlZCBhbnkgaW5saW5lIGNoYW5nZXMgdG8gdGhlIG9yaWdpbmFsIGZpbGUsIHdoaWNoIGFmZmVjdHNcbiAgICogd2hldGhlciB0aGUgc2hpbSBjYW4gYmUgcmV1c2VkLlxuICAgKi9cbiAgaGFzSW5saW5lczogYm9vbGVhbjtcblxuICAvKipcbiAgICogU291cmNlIG1hcHBpbmcgaW5mb3JtYXRpb24gZm9yIG1hcHBpbmcgZGlhZ25vc3RpY3MgZnJvbSBpbmxpbmVkIHR5cGUgY2hlY2sgYmxvY2tzIGJhY2sgdG8gdGhlXG4gICAqIG9yaWdpbmFsIHRlbXBsYXRlLlxuICAgKi9cbiAgc291cmNlTWFuYWdlcjogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyO1xuXG4gIC8qKlxuICAgKiBEYXRhIGZvciBlYWNoIHNoaW0gZ2VuZXJhdGVkIGZyb20gdGhpcyBpbnB1dCBmaWxlLlxuICAgKlxuICAgKiBBIHNpbmdsZSBpbnB1dCBmaWxlIHdpbGwgZ2VuZXJhdGUgb25lIG9yIG1vcmUgc2hpbSBmaWxlcyB0aGF0IGFjdHVhbGx5IGNvbnRhaW4gdGVtcGxhdGVcbiAgICogdHlwZS1jaGVja2luZyBjb2RlLlxuICAgKi9cbiAgc2hpbURhdGE6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgU2hpbVR5cGVDaGVja2luZ0RhdGE+O1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNrZXIgaXMgY2VydGFpbiB0aGF0IGFsbCBjb21wb25lbnRzIGZyb20gdGhpcyBpbnB1dCBmaWxlIGhhdmUgaGFkXG4gICAqIHR5cGUtY2hlY2tpbmcgY29kZSBnZW5lcmF0ZWQgaW50byBzaGltcy5cbiAgICovXG4gIGlzQ29tcGxldGU6IGJvb2xlYW47XG59XG5cbi8qKlxuICogRHJpdmVzIGEgYFR5cGVDaGVja0NvbnRleHRgIHRvIGdlbmVyYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBmb3IgZXZlcnkgY29tcG9uZW50IGluIHRoZSBwcm9ncmFtLlxuICovXG5jbGFzcyBXaG9sZVByb2dyYW1UeXBlQ2hlY2tpbmdIb3N0IGltcGxlbWVudHMgVHlwZUNoZWNraW5nSG9zdCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaW1wbDogVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwpIHt9XG5cbiAgZ2V0U291cmNlTWFuYWdlcihzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyIHtcbiAgICByZXR1cm4gdGhpcy5pbXBsLmdldEZpbGVEYXRhKHNmUGF0aCkuc291cmNlTWFuYWdlcjtcbiAgfVxuXG4gIHNob3VsZENoZWNrQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBjb25zdCBzaGltUGF0aCA9IFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcihzZlBhdGgpO1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5pbXBsLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgLy8gVGhlIGNvbXBvbmVudCBuZWVkcyB0byBiZSBjaGVja2VkIHVubGVzcyB0aGUgc2hpbSB3aGljaCB3b3VsZCBjb250YWluIGl0IGFscmVhZHkgZXhpc3RzLlxuICAgIHJldHVybiAhZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKTtcbiAgfVxuXG4gIHJlY29yZFNoaW1EYXRhKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGRhdGE6IFNoaW1UeXBlQ2hlY2tpbmdEYXRhKTogdm9pZCB7XG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmltcGwuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICBmaWxlRGF0YS5zaGltRGF0YS5zZXQoZGF0YS5wYXRoLCBkYXRhKTtcbiAgICBpZiAoZGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICBmaWxlRGF0YS5oYXNJbmxpbmVzID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZWNvcmRDb21wbGV0ZShzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhpcy5pbXBsLmdldEZpbGVEYXRhKHNmUGF0aCkuaXNDb21wbGV0ZSA9IHRydWU7XG4gIH1cbn1cblxuLyoqXG4gKiBEcml2ZXMgYSBgVHlwZUNoZWNrQ29udGV4dGAgdG8gZ2VuZXJhdGUgdHlwZS1jaGVja2luZyBjb2RlIGVmZmljaWVudGx5IGZvciBhIHNpbmdsZSBpbnB1dCBmaWxlLlxuICovXG5jbGFzcyBTaW5nbGVGaWxlVHlwZUNoZWNraW5nSG9zdCBpbXBsZW1lbnRzIFR5cGVDaGVja2luZ0hvc3Qge1xuICBwcml2YXRlIHNlZW5JbmxpbmVzID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvdGVjdGVkIGZpbGVEYXRhOiBGaWxlVHlwZUNoZWNraW5nRGF0YSxcbiAgICAgIHByb3RlY3RlZCBpbXBsOiBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbCkge31cblxuICBwcml2YXRlIGFzc2VydFBhdGgoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNmUGF0aCAhPT0gc2ZQYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBxdWVyeWluZyBUeXBlQ2hlY2tpbmdIb3N0IG91dHNpZGUgb2YgYXNzaWduZWQgZmlsZWApO1xuICAgIH1cbiAgfVxuXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlciB7XG4gICAgdGhpcy5hc3NlcnRQYXRoKHNmUGF0aCk7XG4gICAgcmV0dXJuIHRoaXMuZmlsZURhdGEuc291cmNlTWFuYWdlcjtcbiAgfVxuXG4gIHNob3VsZENoZWNrQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5zZlBhdGggIT09IGFic29sdXRlRnJvbVNvdXJjZUZpbGUobm9kZS5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHNoaW1QYXRoID0gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHRoaXMuc2ZQYXRoKTtcblxuICAgIC8vIE9ubHkgbmVlZCB0byBnZW5lcmF0ZSBhIFRDQiBmb3IgdGhlIGNsYXNzIGlmIG5vIHNoaW0gZXhpc3RzIGZvciBpdCBjdXJyZW50bHkuXG4gICAgcmV0dXJuICF0aGlzLmZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCk7XG4gIH1cblxuICByZWNvcmRTaGltRGF0YShzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBTaGltVHlwZUNoZWNraW5nRGF0YSk6IHZvaWQge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuXG4gICAgLy8gUHJldmlvdXMgdHlwZS1jaGVja2luZyBzdGF0ZSBtYXkgaGF2ZSByZXF1aXJlZCB0aGUgdXNlIG9mIGlubGluZXMgKGFzc3VtaW5nIHRoZXkgd2VyZVxuICAgIC8vIHN1cHBvcnRlZCkuIElmIHRoZSBjdXJyZW50IG9wZXJhdGlvbiBhbHNvIHJlcXVpcmVzIGlubGluZXMsIHRoaXMgcHJlc2VudHMgYSBwcm9ibGVtOlxuICAgIC8vIGdlbmVyYXRpbmcgbmV3IGlubGluZXMgbWF5IGludmFsaWRhdGUgYW55IG9sZCBpbmxpbmVzIHRoYXQgb2xkIHN0YXRlIGRlcGVuZHMgb24uXG4gICAgLy9cbiAgICAvLyBSYXRoZXIgdGhhbiByZXNvbHZlIHRoaXMgaXNzdWUgYnkgdHJhY2tpbmcgc3BlY2lmaWMgZGVwZW5kZW5jaWVzIG9uIGlubGluZXMsIGlmIHRoZSBuZXcgc3RhdGVcbiAgICAvLyByZWxpZXMgb24gaW5saW5lcywgYW55IG9sZCBzdGF0ZSB0aGF0IHJlbGllZCBvbiB0aGVtIGlzIHNpbXBseSBjbGVhcmVkLiBUaGlzIGhhcHBlbnMgd2hlbiB0aGVcbiAgICAvLyBmaXJzdCBuZXcgc3RhdGUgdGhhdCB1c2VzIGlubGluZXMgaXMgZW5jb3VudGVyZWQuXG4gICAgaWYgKGRhdGEuaGFzSW5saW5lcyAmJiAhdGhpcy5zZWVuSW5saW5lcykge1xuICAgICAgdGhpcy5pbXBsLmNsZWFyQWxsU2hpbURhdGFVc2luZ0lubGluZXMoKTtcbiAgICAgIHRoaXMuc2VlbklubGluZXMgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuZmlsZURhdGEuc2hpbURhdGEuc2V0KGRhdGEucGF0aCwgZGF0YSk7XG4gICAgaWYgKGRhdGEuaGFzSW5saW5lcykge1xuICAgICAgdGhpcy5maWxlRGF0YS5oYXNJbmxpbmVzID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZWNvcmRDb21wbGV0ZShzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhpcy5hc3NlcnRQYXRoKHNmUGF0aCk7XG4gICAgdGhpcy5maWxlRGF0YS5pc0NvbXBsZXRlID0gdHJ1ZTtcbiAgfVxufVxuXG4vKipcbiAqIERyaXZlcyBhIGBUeXBlQ2hlY2tDb250ZXh0YCB0byBnZW5lcmF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZWZmaWNpZW50bHkgZm9yIG9ubHkgdGhvc2UgY29tcG9uZW50c1xuICogd2hpY2ggbWFwIHRvIGEgc2luZ2xlIHNoaW0gb2YgYSBzaW5nbGUgaW5wdXQgZmlsZS5cbiAqL1xuY2xhc3MgU2luZ2xlU2hpbVR5cGVDaGVja2luZ0hvc3QgZXh0ZW5kcyBTaW5nbGVGaWxlVHlwZUNoZWNraW5nSG9zdCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZmlsZURhdGE6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhLCBpbXBsOiBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbCxcbiAgICAgIHByaXZhdGUgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gICAgc3VwZXIoc2ZQYXRoLCBmaWxlRGF0YSwgaW1wbCk7XG4gIH1cblxuICBzaG91bGRDaGVja05vZGUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnNmUGF0aCAhPT0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IGdlbmVyYXRlIGEgVENCIGZvciB0aGUgY29tcG9uZW50IGlmIGl0IG1hcHMgdG8gdGhlIHJlcXVlc3RlZCBzaGltIGZpbGUuXG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3IodGhpcy5zZlBhdGgpO1xuICAgIGlmIChzaGltUGF0aCAhPT0gdGhpcy5zaGltUGF0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE9ubHkgbmVlZCB0byBnZW5lcmF0ZSBhIFRDQiBmb3IgdGhlIGNsYXNzIGlmIG5vIHNoaW0gZXhpc3RzIGZvciBpdCBjdXJyZW50bHkuXG4gICAgcmV0dXJuICF0aGlzLmZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCk7XG4gIH1cbn1cblxuLyoqXG4gKiBDYWNoZWQgc2NvcGUgaW5mb3JtYXRpb24gZm9yIGEgY29tcG9uZW50LlxuICovXG5pbnRlcmZhY2UgU2NvcGVEYXRhIHtcbiAgZGlyZWN0aXZlczogRGlyZWN0aXZlSW5TY29wZVtdO1xuICBwaXBlczogUGlwZUluU2NvcGVbXTtcbiAgaXNQb2lzb25lZDogYm9vbGVhbjtcbn1cbiJdfQ==