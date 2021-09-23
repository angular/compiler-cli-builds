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
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            var fileRecord = this.getFileData(sfPath);
            if (!fileRecord.shimData.has(shimPath)) {
                return { data: null, tcb: null, shimPath: shimPath };
            }
            var templateId = fileRecord.sourceManager.getTemplateId(component);
            var shimRecord = fileRecord.shimData.get(shimPath);
            var id = fileRecord.sourceManager.getTemplateId(component);
            var program = this.programDriver.getProgram();
            var shimSf = (0, typescript_1.getSourceFileOrNull)(program, shimPath);
            if (shimSf === null || !fileRecord.shimData.has(shimPath)) {
                throw new Error("Error: no shim file in program: " + shimPath);
            }
            var tcb = (0, tcb_util_1.findTypeCheckBlock)(shimSf, id, /*isDiagnosticsRequest*/ false);
            if (tcb === null) {
                // Try for an inline block.
                var inlineSf = (0, file_system_1.getSourceFileOrError)(program, sfPath);
                tcb = (0, tcb_util_1.findTypeCheckBlock)(inlineSf, id, /*isDiagnosticsRequest*/ false);
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
                for (var _b = (0, tslib_1.__values)(this.state.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
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
            var records = this.getFileAndShimRecordsForPath((0, file_system_1.absoluteFrom)(shimPath));
            if (records === null) {
                return null;
            }
            var fileRecord = records.fileRecord;
            var shimSf = this.programDriver.getProgram().getSourceFile((0, file_system_1.absoluteFrom)(shimPath));
            if (shimSf === undefined) {
                return null;
            }
            return (0, tcb_util_1.getTemplateMapping)(shimSf, positionInShimFile, fileRecord.sourceManager, /*isDiagnosticsRequest*/ false);
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
                var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
                var fileRecord = _this.state.get(sfPath);
                var typeCheckProgram = _this.programDriver.getProgram();
                var diagnostics = [];
                if (fileRecord.hasInlines) {
                    var inlineSf = (0, file_system_1.getSourceFileOrError)(typeCheckProgram, sfPath);
                    diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })), false));
                }
                try {
                    for (var _c = (0, tslib_1.__values)(fileRecord.shimData), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var _e = (0, tslib_1.__read)(_d.value, 2), shimPath = _e[0], shimRecord = _e[1];
                        var shimSf = (0, file_system_1.getSourceFileOrError)(typeCheckProgram, shimPath);
                        diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })), false));
                        diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(shimRecord.genesisDiagnostics), false));
                        try {
                            for (var _f = (e_3 = void 0, (0, tslib_1.__values)(shimRecord.templates.values())), _g = _f.next(); !_g.done; _g = _f.next()) {
                                var templateData = _g.value;
                                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(templateData.templateDiagnostics), false));
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
                var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
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
                    var inlineSf = (0, file_system_1.getSourceFileOrError)(typeCheckProgram, sfPath);
                    diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })), false));
                }
                var shimSf = (0, file_system_1.getSourceFileOrError)(typeCheckProgram, shimPath);
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })), false));
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(shimRecord.genesisDiagnostics), false));
                try {
                    for (var _b = (0, tslib_1.__values)(shimRecord.templates.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var templateData = _c.value;
                        diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(templateData.templateDiagnostics), false));
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
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
            var shimPath = shim_1.TypeCheckShimGenerator.shimFor(sfPath);
            var fileData = this.getFileData(sfPath);
            var templateId = fileData.sourceManager.getTemplateId(clazz);
            fileData.shimData.delete(shimPath);
            fileData.isComplete = false;
            this.isComplete = false;
        };
        TemplateTypeCheckerImpl.prototype.makeTemplateDiagnostic = function (clazz, sourceSpan, category, errorCode, message, relatedInformation) {
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(clazz.getSourceFile());
            var fileRecord = this.state.get(sfPath);
            var templateId = fileRecord.sourceManager.getTemplateId(clazz);
            var mapping = fileRecord.sourceManager.getSourceMapping(templateId);
            return (0, tslib_1.__assign)((0, tslib_1.__assign)({}, (0, diagnostics_2.makeTemplateDiagnostic)(templateId, mapping, sourceSpan, category, (0, diagnostics_1.ngErrorCode)(errorCode), message, relatedInformation)), { __ngCode: errorCode });
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
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
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
                    for (var _b = (0, tslib_1.__values)(_this.originalProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var sf = _c.value;
                        if (sf.isDeclarationFile || (0, shims_1.isShim)(sf)) {
                            continue;
                        }
                        _this.maybeAdoptPriorResultsForFile(sf);
                        var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
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
                var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
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
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
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
                for (var _c = (0, tslib_1.__values)(this.state.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var fileData = _d.value;
                    if (!fileData.hasInlines) {
                        continue;
                    }
                    try {
                        for (var _e = (e_7 = void 0, (0, tslib_1.__values)(fileData.shimData.entries())), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var _g = (0, tslib_1.__read)(_f.value, 2), shimFile = _g[0], shimData = _g[1];
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
            if (!(0, reflection_1.isNamedClassDeclaration)(dir)) {
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
                for (var _d = (0, tslib_1.__values)(REGISTRY.allKnownElementNames()), _e = _d.next(); !_e.done; _e = _d.next()) {
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
                    for (var _f = (0, tslib_1.__values)(scope.directives), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var directive = _g.value;
                        try {
                            for (var _h = (e_10 = void 0, (0, tslib_1.__values)(compiler_1.CssSelector.parse(directive.selector))), _j = _h.next(); !_j.done; _j = _h.next()) {
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
            if (!(0, reflection_1.isNamedClassDeclaration)(component)) {
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
                for (var _c = (0, tslib_1.__values)(scope.compilation.directives), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var dir = _d.value;
                    if (dir.selector === null) {
                        // Skip this directive, it can't be added to a template anyway.
                        continue;
                    }
                    var tsSymbol = typeChecker.getSymbolAtLocation(dir.ref.node.name);
                    if (!(0, typescript_1.isSymbolWithValueDeclaration)(tsSymbol)) {
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
                for (var _e = (0, tslib_1.__values)(scope.compilation.pipes), _f = _e.next(); !_f.done; _f = _e.next()) {
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
        if (!(0, diagnostics_3.shouldReportDiagnostic)(diag)) {
            return null;
        }
        return (0, diagnostics_3.translateDiagnostic)(diag, sourceResolver);
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
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(node.getSourceFile());
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
            if (this.sfPath !== (0, file_system_1.absoluteFromSourceFile)(node.getSourceFile())) {
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
        (0, tslib_1.__extends)(SingleShimTypeCheckingHost, _super);
        function SingleShimTypeCheckingHost(sfPath, fileData, impl, shimPath) {
            var _this = _super.call(this, sfPath, fileData, impl) || this;
            _this.shimPath = shimPath;
            return _this;
        }
        SingleShimTypeCheckingHost.prototype.shouldCheckNode = function (node) {
            if (this.sfPath !== (0, file_system_1.absoluteFromSourceFile)(node.getSourceFile())) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBZ047SUFHaE4sMkVBQXlEO0lBRXpELDJFQUE2RztJQUM3RyxtRUFBMEQ7SUFFMUQsNkRBQThFO0lBQzlFLGlGQUErRDtJQUMvRCx5RUFBMkY7SUFFM0YsK0RBQW1DO0lBQ25DLGtGQUE0RjtJQUM1RixxRUFBa1Q7SUFDbFQscUZBQXNEO0lBRXRELHVGQUE4QztJQUM5QyxpRkFBbUg7SUFDbkgseUZBQTBFO0lBQzFFLDJFQUE4QztJQUM5QywrRUFBK0M7SUFDL0MsbUZBQTBGO0lBQzFGLGlIQUF3RDtJQUd4RCxJQUFNLFFBQVEsR0FBRyxJQUFJLG1DQUF3QixFQUFFLENBQUM7SUFDaEQ7Ozs7T0FJRztJQUNIO1FBeUNFLGlDQUNZLGVBQTJCLEVBQVcsYUFBNEIsRUFDbEUsZ0JBQXlDLEVBQVUsTUFBMEIsRUFDN0UsVUFBNEIsRUFBVSxTQUF5QixFQUMvRCxZQUEyRCxFQUMzRCxVQUEyRCxFQUNsRCxvQkFBMEMsRUFDMUMsc0JBQThDLEVBQzlDLElBQWtCO1lBUDNCLG9CQUFlLEdBQWYsZUFBZSxDQUFZO1lBQVcsa0JBQWEsR0FBYixhQUFhLENBQWU7WUFDbEUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF5QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzdFLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDL0QsaUJBQVksR0FBWixZQUFZLENBQStDO1lBQzNELGVBQVUsR0FBVixVQUFVLENBQWlEO1lBQ2xELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7WUFDMUMsMkJBQXNCLEdBQXRC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QUFNLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDbEMsQ0FBQztRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQXJERCxJQXFEQztJQUVEOzs7T0FHRztJQUNIO1FBQXlDLDJEQUEwQjtRQUNqRSxvQ0FDSSxNQUFzQixFQUFFLFFBQThCLEVBQUUsSUFBNkIsRUFDN0UsUUFBd0I7WUFGcEMsWUFHRSxrQkFBTSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUM5QjtZQUZXLGNBQVEsR0FBUixRQUFRLENBQWdCOztRQUVwQyxDQUFDO1FBRUQsb0RBQWUsR0FBZixVQUFnQixJQUF5QjtZQUN2QyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBQSxvQ0FBc0IsRUFBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRTtnQkFDaEUsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUVELCtFQUErRTtZQUMvRSxJQUFNLFFBQVEsR0FBRyw2QkFBc0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdELElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQzlCLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFFRCxnRkFBZ0Y7WUFDaEYsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQ0gsaUNBQUM7SUFBRCxDQUFDLEFBckJELENBQXlDLDBCQUEwQixHQXFCbEUiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIENzc1NlbGVjdG9yLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIExpdGVyYWxQcmltaXRpdmUsIFBhcnNlU291cmNlU3BhbiwgUHJvcGVydHlSZWFkLCBTYWZlUHJvcGVydHlSZWFkLCBUbXBsQXN0RWxlbWVudCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RSZWZlcmVuY2UsIFRtcGxBc3RUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtUZXh0QXR0cmlidXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvcmVuZGVyMy9yM19hc3QnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Vycm9yQ29kZSwgbmdFcnJvckNvZGV9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRoLCBnZXRTb3VyY2VGaWxlT3JFcnJvcn0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtQZXJmQ2hlY2twb2ludCwgUGVyZkV2ZW50LCBQZXJmUGhhc2UsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge1Byb2dyYW1Ecml2ZXIsIFVwZGF0ZU1vZGV9IGZyb20gJy4uLy4uL3Byb2dyYW1fZHJpdmVyJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXIsIFR5cGVDaGVja1Njb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7aXNTaGltfSBmcm9tICcuLi8uLi9zaGltcyc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGVPck51bGwsIGlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEaXJlY3RpdmVJblNjb3BlLCBFbGVtZW50U3ltYm9sLCBGdWxsVGVtcGxhdGVNYXBwaW5nLCBHbG9iYWxDb21wbGV0aW9uLCBOZ1RlbXBsYXRlRGlhZ25vc3RpYywgT3B0aW1pemVGb3IsIFBpcGVJblNjb3BlLCBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlciwgU2hpbUxvY2F0aW9uLCBTeW1ib2wsIFRlbXBsYXRlRGlhZ25vc3RpYywgVGVtcGxhdGVJZCwgVGVtcGxhdGVTeW1ib2wsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ2hlY2tpbmdDb25maWd9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge21ha2VUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHtDb21wbGV0aW9uRW5naW5lfSBmcm9tICcuL2NvbXBsZXRpb24nO1xuaW1wb3J0IHtJbmxpbmluZ01vZGUsIFNoaW1UeXBlQ2hlY2tpbmdEYXRhLCBUZW1wbGF0ZURhdGEsIFR5cGVDaGVja0NvbnRleHRJbXBsLCBUeXBlQ2hlY2tpbmdIb3N0fSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHtzaG91bGRSZXBvcnREaWFnbm9zdGljLCB0cmFuc2xhdGVEaWFnbm9zdGljfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7VHlwZUNoZWNrU2hpbUdlbmVyYXRvcn0gZnJvbSAnLi9zaGltJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYW5hZ2VyfSBmcm9tICcuL3NvdXJjZSc7XG5pbXBvcnQge2ZpbmRUeXBlQ2hlY2tCbG9jaywgZ2V0VGVtcGxhdGVNYXBwaW5nLCBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyfSBmcm9tICcuL3RjYl91dGlsJztcbmltcG9ydCB7U3ltYm9sQnVpbGRlcn0gZnJvbSAnLi90ZW1wbGF0ZV9zeW1ib2xfYnVpbGRlcic7XG5cblxuY29uc3QgUkVHSVNUUlkgPSBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCk7XG4vKipcbiAqIFByaW1hcnkgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBlbmdpbmUsIHdoaWNoIHBlcmZvcm1zIHR5cGUtY2hlY2tpbmcgdXNpbmcgYVxuICogYFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneWAgZm9yIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSBtYWludGVuYW5jZSwgYW5kIHRoZVxuICogYFByb2dyYW1UeXBlQ2hlY2tBZGFwdGVyYCBmb3IgZ2VuZXJhdGlvbiBvZiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGNvZGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbCBpbXBsZW1lbnRzIFRlbXBsYXRlVHlwZUNoZWNrZXIge1xuICBwcml2YXRlIHN0YXRlID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+KCk7XG5cbiAgLyoqXG4gICAqIFN0b3JlcyB0aGUgYENvbXBsZXRpb25FbmdpbmVgIHdoaWNoIHBvd2VycyBhdXRvY29tcGxldGlvbiBmb3IgZWFjaCBjb21wb25lbnQgY2xhc3MuXG4gICAqXG4gICAqIE11c3QgYmUgaW52YWxpZGF0ZWQgd2hlbmV2ZXIgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIG9yIHRoZSBgdHMuUHJvZ3JhbWAgY2hhbmdlcy4gSW52YWxpZGF0aW9uXG4gICAqIG9uIHRlbXBsYXRlIGNoYW5nZXMgaXMgcGVyZm9ybWVkIHdpdGhpbiB0aGlzIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgaW5zdGFuY2UuIFdoZW4gdGhlXG4gICAqIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzLCB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBhcyBhIHdob2xlIGlzIGRlc3Ryb3llZCBhbmQgcmVwbGFjZWQuXG4gICAqL1xuICBwcml2YXRlIGNvbXBsZXRpb25DYWNoZSA9IG5ldyBNYXA8dHMuQ2xhc3NEZWNsYXJhdGlvbiwgQ29tcGxldGlvbkVuZ2luZT4oKTtcbiAgLyoqXG4gICAqIFN0b3JlcyB0aGUgYFN5bWJvbEJ1aWxkZXJgIHdoaWNoIGNyZWF0ZXMgc3ltYm9scyBmb3IgZWFjaCBjb21wb25lbnQgY2xhc3MuXG4gICAqXG4gICAqIE11c3QgYmUgaW52YWxpZGF0ZWQgd2hlbmV2ZXIgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlIG9yIHRoZSBgdHMuUHJvZ3JhbWAgY2hhbmdlcy4gSW52YWxpZGF0aW9uXG4gICAqIG9uIHRlbXBsYXRlIGNoYW5nZXMgaXMgcGVyZm9ybWVkIHdpdGhpbiB0aGlzIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgaW5zdGFuY2UuIFdoZW4gdGhlXG4gICAqIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzLCB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBhcyBhIHdob2xlIGlzIGRlc3Ryb3llZCBhbmQgcmVwbGFjZWQuXG4gICAqL1xuICBwcml2YXRlIHN5bWJvbEJ1aWxkZXJDYWNoZSA9IG5ldyBNYXA8dHMuQ2xhc3NEZWNsYXJhdGlvbiwgU3ltYm9sQnVpbGRlcj4oKTtcblxuICAvKipcbiAgICogU3RvcmVzIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHRoYXQgYXJlIGluIHNjb3BlIGZvciBlYWNoIGNvbXBvbmVudC5cbiAgICpcbiAgICogVW5saWtlIG90aGVyIGNhY2hlcywgdGhlIHNjb3BlIG9mIGEgY29tcG9uZW50IGlzIG5vdCBhZmZlY3RlZCBieSBpdHMgdGVtcGxhdGUuIEl0IHdpbGwgYmVcbiAgICogZGVzdHJveWVkIHdoZW4gdGhlIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzIGFuZCB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBhcyBhIHdob2xlIGlzXG4gICAqIGRlc3Ryb3llZCBhbmQgcmVwbGFjZWQuXG4gICAqL1xuICBwcml2YXRlIHNjb3BlQ2FjaGUgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIFNjb3BlRGF0YT4oKTtcblxuICAvKipcbiAgICogU3RvcmVzIHBvdGVudGlhbCBlbGVtZW50IHRhZ3MgZm9yIGVhY2ggY29tcG9uZW50IChhIHVuaW9uIG9mIERPTSB0YWdzIGFzIHdlbGwgYXMgZGlyZWN0aXZlXG4gICAqIHRhZ3MpLlxuICAgKlxuICAgKiBVbmxpa2Ugb3RoZXIgY2FjaGVzLCB0aGUgc2NvcGUgb2YgYSBjb21wb25lbnQgaXMgbm90IGFmZmVjdGVkIGJ5IGl0cyB0ZW1wbGF0ZS4gSXQgd2lsbCBiZVxuICAgKiBkZXN0cm95ZWQgd2hlbiB0aGUgYHRzLlByb2dyYW1gIGNoYW5nZXMgYW5kIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGFzIGEgd2hvbGUgaXNcbiAgICogZGVzdHJveWVkIGFuZCByZXBsYWNlZC5cbiAgICovXG4gIHByaXZhdGUgZWxlbWVudFRhZ0NhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBNYXA8c3RyaW5nLCBEaXJlY3RpdmVJblNjb3BlfG51bGw+PigpO1xuXG4gIHByaXZhdGUgaXNDb21wbGV0ZSA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBvcmlnaW5hbFByb2dyYW06IHRzLlByb2dyYW0sIHJlYWRvbmx5IHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsXG4gICAgICBwcml2YXRlIHR5cGVDaGVja0FkYXB0ZXI6IFByb2dyYW1UeXBlQ2hlY2tBZGFwdGVyLCBwcml2YXRlIGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIGNvbXBpbGVySG9zdDogUGljazx0cy5Db21waWxlckhvc3QsICdnZXRDYW5vbmljYWxGaWxlTmFtZSc+LFxuICAgICAgcHJpdmF0ZSBwcmlvckJ1aWxkOiBJbmNyZW1lbnRhbEJ1aWxkPHVua25vd24sIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50U2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5OiBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBwZXJmOiBQZXJmUmVjb3JkZXIpIHt9XG5cbiAgZ2V0VGVtcGxhdGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVG1wbEFzdE5vZGVbXXxudWxsIHtcbiAgICBjb25zdCB7ZGF0YX0gPSB0aGlzLmdldExhdGVzdENvbXBvbmVudFN0YXRlKGNvbXBvbmVudCk7XG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YS50ZW1wbGF0ZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIHtkYXRhOiBUZW1wbGF0ZURhdGF8bnVsbCwgdGNiOiB0cy5Ob2RlfG51bGwsIHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aH0ge1xuICAgIHRoaXMuZW5zdXJlU2hpbUZvckNvbXBvbmVudChjb21wb25lbnQpO1xuXG4gICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHNmUGF0aCk7XG5cbiAgICBjb25zdCBmaWxlUmVjb3JkID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuXG4gICAgaWYgKCFmaWxlUmVjb3JkLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgIHJldHVybiB7ZGF0YTogbnVsbCwgdGNiOiBudWxsLCBzaGltUGF0aH07XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKGNvbXBvbmVudCk7XG4gICAgY29uc3Qgc2hpbVJlY29yZCA9IGZpbGVSZWNvcmQuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSE7XG4gICAgY29uc3QgaWQgPSBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjb21wb25lbnQpO1xuXG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCk7XG4gICAgY29uc3Qgc2hpbVNmID0gZ2V0U291cmNlRmlsZU9yTnVsbChwcm9ncmFtLCBzaGltUGF0aCk7XG5cbiAgICBpZiAoc2hpbVNmID09PSBudWxsIHx8ICFmaWxlUmVjb3JkLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3I6IG5vIHNoaW0gZmlsZSBpbiBwcm9ncmFtOiAke3NoaW1QYXRofWApO1xuICAgIH1cblxuICAgIGxldCB0Y2I6IHRzLk5vZGV8bnVsbCA9IGZpbmRUeXBlQ2hlY2tCbG9jayhzaGltU2YsIGlkLCAvKmlzRGlhZ25vc3RpY3NSZXF1ZXN0Ki8gZmFsc2UpO1xuXG4gICAgaWYgKHRjYiA9PT0gbnVsbCkge1xuICAgICAgLy8gVHJ5IGZvciBhbiBpbmxpbmUgYmxvY2suXG4gICAgICBjb25zdCBpbmxpbmVTZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHByb2dyYW0sIHNmUGF0aCk7XG4gICAgICB0Y2IgPSBmaW5kVHlwZUNoZWNrQmxvY2soaW5saW5lU2YsIGlkLCAvKmlzRGlhZ25vc3RpY3NSZXF1ZXN0Ki8gZmFsc2UpO1xuICAgIH1cblxuICAgIGxldCBkYXRhOiBUZW1wbGF0ZURhdGF8bnVsbCA9IG51bGw7XG4gICAgaWYgKHNoaW1SZWNvcmQudGVtcGxhdGVzLmhhcyh0ZW1wbGF0ZUlkKSkge1xuICAgICAgZGF0YSA9IHNoaW1SZWNvcmQudGVtcGxhdGVzLmdldCh0ZW1wbGF0ZUlkKSE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkYXRhLCB0Y2IsIHNoaW1QYXRofTtcbiAgfVxuXG4gIGlzVHJhY2tlZFR5cGVDaGVja0ZpbGUoZmlsZVBhdGg6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0RmlsZUFuZFNoaW1SZWNvcmRzRm9yUGF0aChmaWxlUGF0aCkgIT09IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldEZpbGVBbmRTaGltUmVjb3Jkc0ZvclBhdGgoc2hpbVBhdGg6IEFic29sdXRlRnNQYXRoKTpcbiAgICAgIHtmaWxlUmVjb3JkOiBGaWxlVHlwZUNoZWNraW5nRGF0YSwgc2hpbVJlY29yZDogU2hpbVR5cGVDaGVja2luZ0RhdGF9fG51bGwge1xuICAgIGZvciAoY29uc3QgZmlsZVJlY29yZCBvZiB0aGlzLnN0YXRlLnZhbHVlcygpKSB7XG4gICAgICBpZiAoZmlsZVJlY29yZC5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICAgIHJldHVybiB7ZmlsZVJlY29yZCwgc2hpbVJlY29yZDogZmlsZVJlY29yZC5zaGltRGF0YS5nZXQoc2hpbVBhdGgpIX07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVNYXBwaW5nQXRTaGltTG9jYXRpb24oe3NoaW1QYXRoLCBwb3NpdGlvbkluU2hpbUZpbGV9OiBTaGltTG9jYXRpb24pOlxuICAgICAgRnVsbFRlbXBsYXRlTWFwcGluZ3xudWxsIHtcbiAgICBjb25zdCByZWNvcmRzID0gdGhpcy5nZXRGaWxlQW5kU2hpbVJlY29yZHNGb3JQYXRoKGFic29sdXRlRnJvbShzaGltUGF0aCkpO1xuICAgIGlmIChyZWNvcmRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qge2ZpbGVSZWNvcmR9ID0gcmVjb3JkcztcblxuICAgIGNvbnN0IHNoaW1TZiA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCkuZ2V0U291cmNlRmlsZShhYnNvbHV0ZUZyb20oc2hpbVBhdGgpKTtcbiAgICBpZiAoc2hpbVNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZ2V0VGVtcGxhdGVNYXBwaW5nKFxuICAgICAgICBzaGltU2YsIHBvc2l0aW9uSW5TaGltRmlsZSwgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLCAvKmlzRGlhZ25vc3RpY3NSZXF1ZXN0Ki8gZmFsc2UpO1xuICB9XG5cbiAgZ2VuZXJhdGVBbGxUeXBlQ2hlY2tCbG9ja3MoKSB7XG4gICAgdGhpcy5lbnN1cmVBbGxTaGltc0ZvckFsbEZpbGVzKCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgdHlwZS1jaGVja2luZyBhbmQgdGVtcGxhdGUgcGFyc2UgZGlhZ25vc3RpY3MgZnJvbSB0aGUgZ2l2ZW4gYHRzLlNvdXJjZUZpbGVgIHVzaW5nIHRoZVxuICAgKiBtb3N0IHJlY2VudCB0eXBlLWNoZWNraW5nIHByb2dyYW0uXG4gICAqL1xuICBnZXREaWFnbm9zdGljc0ZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUsIG9wdGltaXplRm9yOiBPcHRpbWl6ZUZvcik6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgc3dpdGNoIChvcHRpbWl6ZUZvcikge1xuICAgICAgY2FzZSBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW06XG4gICAgICAgIHRoaXMuZW5zdXJlQWxsU2hpbXNGb3JBbGxGaWxlcygpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgT3B0aW1pemVGb3IuU2luZ2xlRmlsZTpcbiAgICAgICAgdGhpcy5lbnN1cmVBbGxTaGltc0Zvck9uZUZpbGUoc2YpO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5wZXJmLmluUGhhc2UoUGVyZlBoYXNlLlR0Y0RpYWdub3N0aWNzLCAoKSA9PiB7XG4gICAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICAgIGNvbnN0IGZpbGVSZWNvcmQgPSB0aGlzLnN0YXRlLmdldChzZlBhdGgpITtcblxuICAgICAgY29uc3QgdHlwZUNoZWNrUHJvZ3JhbSA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCk7XG5cbiAgICAgIGNvbnN0IGRpYWdub3N0aWNzOiAodHMuRGlhZ25vc3RpY3xudWxsKVtdID0gW107XG4gICAgICBpZiAoZmlsZVJlY29yZC5oYXNJbmxpbmVzKSB7XG4gICAgICAgIGNvbnN0IGlubGluZVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IodHlwZUNoZWNrUHJvZ3JhbSwgc2ZQYXRoKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3MoaW5saW5lU2YpLm1hcChcbiAgICAgICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IFtzaGltUGF0aCwgc2hpbVJlY29yZF0gb2YgZmlsZVJlY29yZC5zaGltRGF0YSkge1xuICAgICAgICBjb25zdCBzaGltU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzaGltUGF0aCk7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHlwZUNoZWNrUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNoaW1TZikubWFwKFxuICAgICAgICAgICAgZGlhZyA9PiBjb252ZXJ0RGlhZ25vc3RpYyhkaWFnLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIpKSk7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uc2hpbVJlY29yZC5nZW5lc2lzRGlhZ25vc3RpY3MpO1xuXG4gICAgICAgIGZvciAoY29uc3QgdGVtcGxhdGVEYXRhIG9mIHNoaW1SZWNvcmQudGVtcGxhdGVzLnZhbHVlcygpKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50ZW1wbGF0ZURhdGEudGVtcGxhdGVEaWFnbm9zdGljcyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRpYWdub3N0aWNzLmZpbHRlcigoZGlhZzogdHMuRGlhZ25vc3RpY3xudWxsKTogZGlhZyBpcyB0cy5EaWFnbm9zdGljID0+IGRpYWcgIT09IG51bGwpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0RGlhZ25vc3RpY3NGb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICB0aGlzLmVuc3VyZVNoaW1Gb3JDb21wb25lbnQoY29tcG9uZW50KTtcblxuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShQZXJmUGhhc2UuVHRjRGlhZ25vc3RpY3MsICgpID0+IHtcbiAgICAgIGNvbnN0IHNmID0gY29tcG9uZW50LmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3Ioc2ZQYXRoKTtcblxuICAgICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcblxuICAgICAgaWYgKCFmaWxlUmVjb3JkLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcbiAgICAgIGNvbnN0IHNoaW1SZWNvcmQgPSBmaWxlUmVjb3JkLnNoaW1EYXRhLmdldChzaGltUGF0aCkhO1xuXG4gICAgICBjb25zdCB0eXBlQ2hlY2tQcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcblxuICAgICAgY29uc3QgZGlhZ25vc3RpY3M6IChUZW1wbGF0ZURpYWdub3N0aWN8bnVsbClbXSA9IFtdO1xuICAgICAgaWYgKHNoaW1SZWNvcmQuaGFzSW5saW5lcykge1xuICAgICAgICBjb25zdCBpbmxpbmVTZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNmUGF0aCk7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udHlwZUNoZWNrUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGlubGluZVNmKS5tYXAoXG4gICAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2hpbVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IodHlwZUNoZWNrUHJvZ3JhbSwgc2hpbVBhdGgpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2hpbVNmKS5tYXAoXG4gICAgICAgICAgZGlhZyA9PiBjb252ZXJ0RGlhZ25vc3RpYyhkaWFnLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIpKSk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnNoaW1SZWNvcmQuZ2VuZXNpc0RpYWdub3N0aWNzKTtcblxuICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZURhdGEgb2Ygc2hpbVJlY29yZC50ZW1wbGF0ZXMudmFsdWVzKCkpIHtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50ZW1wbGF0ZURhdGEudGVtcGxhdGVEaWFnbm9zdGljcyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkaWFnbm9zdGljcy5maWx0ZXIoXG4gICAgICAgICAgKGRpYWc6IFRlbXBsYXRlRGlhZ25vc3RpY3xudWxsKTogZGlhZyBpcyBUZW1wbGF0ZURpYWdub3N0aWMgPT5cbiAgICAgICAgICAgICAgZGlhZyAhPT0gbnVsbCAmJiBkaWFnLnRlbXBsYXRlSWQgPT09IHRlbXBsYXRlSWQpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0VHlwZUNoZWNrQmxvY2soY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuTm9kZXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQpLnRjYjtcbiAgfVxuXG4gIGdldEdsb2JhbENvbXBsZXRpb25zKFxuICAgICAgY29udGV4dDogVG1wbEFzdFRlbXBsYXRlfG51bGwsIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSk6IEdsb2JhbENvbXBsZXRpb258bnVsbCB7XG4gICAgY29uc3QgZW5naW5lID0gdGhpcy5nZXRPckNyZWF0ZUNvbXBsZXRpb25FbmdpbmUoY29tcG9uZW50KTtcbiAgICBpZiAoZW5naW5lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFxuICAgICAgICBQZXJmUGhhc2UuVHRjQXV0b2NvbXBsZXRpb24sICgpID0+IGVuZ2luZS5nZXRHbG9iYWxDb21wbGV0aW9ucyhjb250ZXh0LCBub2RlKSk7XG4gIH1cblxuICBnZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKFxuICAgICAgYXN0OiBQcm9wZXJ0eVJlYWR8U2FmZVByb3BlcnR5UmVhZCwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU2hpbUxvY2F0aW9ufG51bGwge1xuICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMuZ2V0T3JDcmVhdGVDb21wbGV0aW9uRW5naW5lKGNvbXBvbmVudCk7XG4gICAgaWYgKGVuZ2luZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShcbiAgICAgICAgUGVyZlBoYXNlLlR0Y0F1dG9jb21wbGV0aW9uLCAoKSA9PiBlbmdpbmUuZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25Mb2NhdGlvbihhc3QpKTtcbiAgfVxuXG4gIGdldExpdGVyYWxDb21wbGV0aW9uTG9jYXRpb24oXG4gICAgICBub2RlOiBMaXRlcmFsUHJpbWl0aXZlfFRleHRBdHRyaWJ1dGUsIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFNoaW1Mb2NhdGlvbnxudWxsIHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldE9yQ3JlYXRlQ29tcGxldGlvbkVuZ2luZShjb21wb25lbnQpO1xuICAgIGlmIChlbmdpbmUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wZXJmLmluUGhhc2UoXG4gICAgICAgIFBlcmZQaGFzZS5UdGNBdXRvY29tcGxldGlvbiwgKCkgPT4gZW5naW5lLmdldExpdGVyYWxDb21wbGV0aW9uTG9jYXRpb24obm9kZSkpO1xuICB9XG5cbiAgaW52YWxpZGF0ZUNsYXNzKGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5jb21wbGV0aW9uQ2FjaGUuZGVsZXRlKGNsYXp6KTtcbiAgICB0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5kZWxldGUoY2xhenopO1xuICAgIHRoaXMuc2NvcGVDYWNoZS5kZWxldGUoY2xhenopO1xuICAgIHRoaXMuZWxlbWVudFRhZ0NhY2hlLmRlbGV0ZShjbGF6eik7XG5cbiAgICBjb25zdCBzZiA9IGNsYXp6LmdldFNvdXJjZUZpbGUoKTtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICBjb25zdCBzaGltUGF0aCA9IFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcihzZlBhdGgpO1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY2xhenopO1xuXG4gICAgZmlsZURhdGEuc2hpbURhdGEuZGVsZXRlKHNoaW1QYXRoKTtcbiAgICBmaWxlRGF0YS5pc0NvbXBsZXRlID0gZmFsc2U7XG5cbiAgICB0aGlzLmlzQ29tcGxldGUgPSBmYWxzZTtcbiAgfVxuXG4gIG1ha2VUZW1wbGF0ZURpYWdub3N0aWM8VCBleHRlbmRzIEVycm9yQ29kZT4oXG4gICAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgc291cmNlU3BhbjogUGFyc2VTb3VyY2VTcGFuLCBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LFxuICAgICAgZXJyb3JDb2RlOiBULCBtZXNzYWdlOiBzdHJpbmcsIHJlbGF0ZWRJbmZvcm1hdGlvbj86IHtcbiAgICAgICAgdGV4dDogc3RyaW5nLFxuICAgICAgICBzdGFydDogbnVtYmVyLFxuICAgICAgICBlbmQ6IG51bWJlcixcbiAgICAgICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgICAgIH1bXSk6IE5nVGVtcGxhdGVEaWFnbm9zdGljPFQ+IHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGNsYXp6LmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuc3RhdGUuZ2V0KHNmUGF0aCkhO1xuICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjbGF6eik7XG4gICAgY29uc3QgbWFwcGluZyA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRTb3VyY2VNYXBwaW5nKHRlbXBsYXRlSWQpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLm1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgdGVtcGxhdGVJZCwgbWFwcGluZywgc291cmNlU3BhbiwgY2F0ZWdvcnksIG5nRXJyb3JDb2RlKGVycm9yQ29kZSksIG1lc3NhZ2UsXG4gICAgICAgICAgcmVsYXRlZEluZm9ybWF0aW9uKSxcbiAgICAgIF9fbmdDb2RlOiBlcnJvckNvZGVcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRPckNyZWF0ZUNvbXBsZXRpb25FbmdpbmUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogQ29tcGxldGlvbkVuZ2luZXxudWxsIHtcbiAgICBpZiAodGhpcy5jb21wbGV0aW9uQ2FjaGUuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvbXBsZXRpb25DYWNoZS5nZXQoY29tcG9uZW50KSE7XG4gICAgfVxuXG4gICAgY29uc3Qge3RjYiwgZGF0YSwgc2hpbVBhdGh9ID0gdGhpcy5nZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQpO1xuICAgIGlmICh0Y2IgPT09IG51bGwgfHwgZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZW5naW5lID0gbmV3IENvbXBsZXRpb25FbmdpbmUodGNiLCBkYXRhLCBzaGltUGF0aCk7XG4gICAgdGhpcy5jb21wbGV0aW9uQ2FjaGUuc2V0KGNvbXBvbmVudCwgZW5naW5lKTtcbiAgICByZXR1cm4gZW5naW5lO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGlmICh0aGlzLnN0YXRlLmhhcyhzZlBhdGgpKSB7XG4gICAgICBjb25zdCBleGlzdGluZ1Jlc3VsdHMgPSB0aGlzLnN0YXRlLmdldChzZlBhdGgpITtcblxuICAgICAgaWYgKGV4aXN0aW5nUmVzdWx0cy5pc0NvbXBsZXRlKSB7XG4gICAgICAgIC8vIEFsbCBkYXRhIGZvciB0aGlzIGZpbGUgaGFzIGFscmVhZHkgYmVlbiBnZW5lcmF0ZWQsIHNvIG5vIG5lZWQgdG8gYWRvcHQgYW55dGhpbmcuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBwcmV2aW91c1Jlc3VsdHMgPSB0aGlzLnByaW9yQnVpbGQucHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzRm9yKHNmKTtcbiAgICBpZiAocHJldmlvdXNSZXN1bHRzID09PSBudWxsIHx8ICFwcmV2aW91c1Jlc3VsdHMuaXNDb21wbGV0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5SZXVzZVR5cGVDaGVja0ZpbGUpO1xuICAgIHRoaXMuc3RhdGUuc2V0KHNmUGF0aCwgcHJldmlvdXNSZXN1bHRzKTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQWxsU2hpbXNGb3JBbGxGaWxlcygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pc0NvbXBsZXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wZXJmLmluUGhhc2UoUGVyZlBoYXNlLlRjYkdlbmVyYXRpb24sICgpID0+IHtcbiAgICAgIGNvbnN0IGhvc3QgPSBuZXcgV2hvbGVQcm9ncmFtVHlwZUNoZWNraW5nSG9zdCh0aGlzKTtcbiAgICAgIGNvbnN0IGN0eCA9IHRoaXMubmV3Q29udGV4dChob3N0KTtcblxuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLm9yaWdpbmFsUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSB8fCBpc1NoaW0oc2YpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1heWJlQWRvcHRQcmlvclJlc3VsdHNGb3JGaWxlKHNmKTtcblxuICAgICAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICAgICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgICAgIGlmIChmaWxlRGF0YS5pc0NvbXBsZXRlKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnR5cGVDaGVja0FkYXB0ZXIudHlwZUNoZWNrKHNmLCBjdHgpO1xuXG4gICAgICAgIGZpbGVEYXRhLmlzQ29tcGxldGUgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnVwZGF0ZUZyb21Db250ZXh0KGN0eCk7XG4gICAgICB0aGlzLmlzQ29tcGxldGUgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbGxTaGltc0Zvck9uZUZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICB0aGlzLnBlcmYuaW5QaGFzZShQZXJmUGhhc2UuVGNiR2VuZXJhdGlvbiwgKCkgPT4ge1xuICAgICAgdGhpcy5tYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZik7XG5cbiAgICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuXG4gICAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICAgIGlmIChmaWxlRGF0YS5pc0NvbXBsZXRlKSB7XG4gICAgICAgIC8vIEFsbCBkYXRhIGZvciB0aGlzIGZpbGUgaXMgcHJlc2VudCBhbmQgYWNjb3VudGVkIGZvciBhbHJlYWR5LlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhvc3QgPSBuZXcgU2luZ2xlRmlsZVR5cGVDaGVja2luZ0hvc3Qoc2ZQYXRoLCBmaWxlRGF0YSwgdGhpcyk7XG4gICAgICBjb25zdCBjdHggPSB0aGlzLm5ld0NvbnRleHQoaG9zdCk7XG5cbiAgICAgIHRoaXMudHlwZUNoZWNrQWRhcHRlci50eXBlQ2hlY2soc2YsIGN0eCk7XG5cbiAgICAgIGZpbGVEYXRhLmlzQ29tcGxldGUgPSB0cnVlO1xuXG4gICAgICB0aGlzLnVwZGF0ZUZyb21Db250ZXh0KGN0eCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZVNoaW1Gb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHNmUGF0aCk7XG5cbiAgICB0aGlzLm1heWJlQWRvcHRQcmlvclJlc3VsdHNGb3JGaWxlKHNmKTtcblxuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuXG4gICAgaWYgKGZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgIC8vIEFsbCBkYXRhIGZvciB0aGlzIGNvbXBvbmVudCBpcyBhdmFpbGFibGUuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgaG9zdCA9IG5ldyBTaW5nbGVTaGltVHlwZUNoZWNraW5nSG9zdChzZlBhdGgsIGZpbGVEYXRhLCB0aGlzLCBzaGltUGF0aCk7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5uZXdDb250ZXh0KGhvc3QpO1xuXG4gICAgdGhpcy50eXBlQ2hlY2tBZGFwdGVyLnR5cGVDaGVjayhzZiwgY3R4KTtcbiAgICB0aGlzLnVwZGF0ZUZyb21Db250ZXh0KGN0eCk7XG4gIH1cblxuICBwcml2YXRlIG5ld0NvbnRleHQoaG9zdDogVHlwZUNoZWNraW5nSG9zdCk6IFR5cGVDaGVja0NvbnRleHRJbXBsIHtcbiAgICBjb25zdCBpbmxpbmluZyA9XG4gICAgICAgIHRoaXMucHJvZ3JhbURyaXZlci5zdXBwb3J0c0lubGluZU9wZXJhdGlvbnMgPyBJbmxpbmluZ01vZGUuSW5saW5lT3BzIDogSW5saW5pbmdNb2RlLkVycm9yO1xuICAgIHJldHVybiBuZXcgVHlwZUNoZWNrQ29udGV4dEltcGwoXG4gICAgICAgIHRoaXMuY29uZmlnLCB0aGlzLmNvbXBpbGVySG9zdCwgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLnJlZmxlY3RvciwgaG9zdCwgaW5saW5pbmcsIHRoaXMucGVyZik7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFueSBzaGltIGRhdGEgdGhhdCBkZXBlbmRzIG9uIGlubGluZSBvcGVyYXRpb25zIGFwcGxpZWQgdG8gdGhlIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbS5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgdXNlZnVsIGlmIG5ldyBpbmxpbmVzIG5lZWQgdG8gYmUgYXBwbGllZCwgYW5kIGl0J3Mgbm90IHBvc3NpYmxlIHRvIGd1YXJhbnRlZSB0aGF0XG4gICAqIHRoZXkgd29uJ3Qgb3ZlcndyaXRlIG9yIGNvcnJ1cHQgZXhpc3RpbmcgaW5saW5lcyB0aGF0IGFyZSB1c2VkIGJ5IHN1Y2ggc2hpbXMuXG4gICAqL1xuICBjbGVhckFsbFNoaW1EYXRhVXNpbmdJbmxpbmVzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZmlsZURhdGEgb2YgdGhpcy5zdGF0ZS52YWx1ZXMoKSkge1xuICAgICAgaWYgKCFmaWxlRGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IFtzaGltRmlsZSwgc2hpbURhdGFdIG9mIGZpbGVEYXRhLnNoaW1EYXRhLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoc2hpbURhdGEuaGFzSW5saW5lcykge1xuICAgICAgICAgIGZpbGVEYXRhLnNoaW1EYXRhLmRlbGV0ZShzaGltRmlsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IGZhbHNlO1xuICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICAgICAgdGhpcy5pc0NvbXBsZXRlID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVGcm9tQ29udGV4dChjdHg6IFR5cGVDaGVja0NvbnRleHRJbXBsKTogdm9pZCB7XG4gICAgY29uc3QgdXBkYXRlcyA9IGN0eC5maW5hbGl6ZSgpO1xuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShQZXJmUGhhc2UuVGNiVXBkYXRlUHJvZ3JhbSwgKCkgPT4ge1xuICAgICAgaWYgKHVwZGF0ZXMuc2l6ZSA+IDApIHtcbiAgICAgICAgdGhpcy5wZXJmLmV2ZW50Q291bnQoUGVyZkV2ZW50LlVwZGF0ZVR5cGVDaGVja1Byb2dyYW0pO1xuICAgICAgfVxuICAgICAgdGhpcy5wcm9ncmFtRHJpdmVyLnVwZGF0ZUZpbGVzKHVwZGF0ZXMsIFVwZGF0ZU1vZGUuSW5jcmVtZW50YWwpO1xuICAgICAgdGhpcy5wcmlvckJ1aWxkLnJlY29yZFN1Y2Nlc3NmdWxUeXBlQ2hlY2sodGhpcy5zdGF0ZSk7XG4gICAgICB0aGlzLnBlcmYubWVtb3J5KFBlcmZDaGVja3BvaW50LlR0Y1VwZGF0ZVByb2dyYW0pO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0RmlsZURhdGEocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gICAgaWYgKCF0aGlzLnN0YXRlLmhhcyhwYXRoKSkge1xuICAgICAgdGhpcy5zdGF0ZS5zZXQocGF0aCwge1xuICAgICAgICBoYXNJbmxpbmVzOiBmYWxzZSxcbiAgICAgICAgc291cmNlTWFuYWdlcjogbmV3IFRlbXBsYXRlU291cmNlTWFuYWdlcigpLFxuICAgICAgICBpc0NvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgc2hpbURhdGE6IG5ldyBNYXAoKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5nZXQocGF0aCkhO1xuICB9XG4gIGdldFN5bWJvbE9mTm9kZShub2RlOiBUbXBsQXN0VGVtcGxhdGUsIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFRlbXBsYXRlU3ltYm9sfG51bGw7XG4gIGdldFN5bWJvbE9mTm9kZShub2RlOiBUbXBsQXN0RWxlbWVudCwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogRWxlbWVudFN5bWJvbHxudWxsO1xuICBnZXRTeW1ib2xPZk5vZGUobm9kZTogQVNUfFRtcGxBc3ROb2RlLCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBTeW1ib2x8bnVsbCB7XG4gICAgY29uc3QgYnVpbGRlciA9IHRoaXMuZ2V0T3JDcmVhdGVTeW1ib2xCdWlsZGVyKGNvbXBvbmVudCk7XG4gICAgaWYgKGJ1aWxkZXIgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wZXJmLmluUGhhc2UoUGVyZlBoYXNlLlR0Y1N5bWJvbCwgKCkgPT4gYnVpbGRlci5nZXRTeW1ib2wobm9kZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRPckNyZWF0ZVN5bWJvbEJ1aWxkZXIoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU3ltYm9sQnVpbGRlcnxudWxsIHtcbiAgICBpZiAodGhpcy5zeW1ib2xCdWlsZGVyQ2FjaGUuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5nZXQoY29tcG9uZW50KSE7XG4gICAgfVxuXG4gICAgY29uc3Qge3RjYiwgZGF0YSwgc2hpbVBhdGh9ID0gdGhpcy5nZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQpO1xuICAgIGlmICh0Y2IgPT09IG51bGwgfHwgZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgYnVpbGRlciA9IG5ldyBTeW1ib2xCdWlsZGVyKFxuICAgICAgICBzaGltUGF0aCwgdGNiLCBkYXRhLCB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLFxuICAgICAgICAoKSA9PiB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpLmdldFR5cGVDaGVja2VyKCkpO1xuICAgIHRoaXMuc3ltYm9sQnVpbGRlckNhY2hlLnNldChjb21wb25lbnQsIGJ1aWxkZXIpO1xuICAgIHJldHVybiBidWlsZGVyO1xuICB9XG5cbiAgZ2V0RGlyZWN0aXZlc0luU2NvcGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogRGlyZWN0aXZlSW5TY29wZVtdfG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldFNjb3BlRGF0YShjb21wb25lbnQpO1xuICAgIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGEuZGlyZWN0aXZlcztcbiAgfVxuXG4gIGdldFBpcGVzSW5TY29wZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBQaXBlSW5TY29wZVtdfG51bGwge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldFNjb3BlRGF0YShjb21wb25lbnQpO1xuICAgIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGEucGlwZXM7XG4gIH1cblxuICBnZXREaXJlY3RpdmVNZXRhZGF0YShkaXI6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGRpcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LmdldFR5cGVDaGVja0RpcmVjdGl2ZU1ldGFkYXRhKG5ldyBSZWZlcmVuY2UoZGlyKSk7XG4gIH1cblxuICBnZXRQb3RlbnRpYWxFbGVtZW50VGFncyhjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBNYXA8c3RyaW5nLCBEaXJlY3RpdmVJblNjb3BlfG51bGw+IHtcbiAgICBpZiAodGhpcy5lbGVtZW50VGFnQ2FjaGUuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmVsZW1lbnRUYWdDYWNoZS5nZXQoY29tcG9uZW50KSE7XG4gICAgfVxuXG4gICAgY29uc3QgdGFnTWFwID0gbmV3IE1hcDxzdHJpbmcsIERpcmVjdGl2ZUluU2NvcGV8bnVsbD4oKTtcblxuICAgIGZvciAoY29uc3QgdGFnIG9mIFJFR0lTVFJZLmFsbEtub3duRWxlbWVudE5hbWVzKCkpIHtcbiAgICAgIHRhZ01hcC5zZXQodGFnLCBudWxsKTtcbiAgICB9XG5cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuZ2V0U2NvcGVEYXRhKGNvbXBvbmVudCk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBzY29wZS5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGZvciAoY29uc3Qgc2VsZWN0b3Igb2YgQ3NzU2VsZWN0b3IucGFyc2UoZGlyZWN0aXZlLnNlbGVjdG9yKSkge1xuICAgICAgICAgIGlmIChzZWxlY3Rvci5lbGVtZW50ID09PSBudWxsIHx8IHRhZ01hcC5oYXMoc2VsZWN0b3IuZWxlbWVudCkpIHtcbiAgICAgICAgICAgIC8vIFNraXAgdGhpcyBkaXJlY3RpdmUgaWYgaXQgZG9lc24ndCBtYXRjaCBhbiBlbGVtZW50IHRhZywgb3IgaWYgYW5vdGhlciBkaXJlY3RpdmUgaGFzXG4gICAgICAgICAgICAvLyBhbHJlYWR5IGJlZW4gaW5jbHVkZWQgd2l0aCB0aGUgc2FtZSBlbGVtZW50IG5hbWUuXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0YWdNYXAuc2V0KHNlbGVjdG9yLmVsZW1lbnQsIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmVsZW1lbnRUYWdDYWNoZS5zZXQoY29tcG9uZW50LCB0YWdNYXApO1xuICAgIHJldHVybiB0YWdNYXA7XG4gIH1cblxuICBnZXRQb3RlbnRpYWxEb21CaW5kaW5ncyh0YWdOYW1lOiBzdHJpbmcpOiB7YXR0cmlidXRlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmd9W10ge1xuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBSRUdJU1RSWS5hbGxLbm93bkF0dHJpYnV0ZXNPZkVsZW1lbnQodGFnTmFtZSk7XG4gICAgcmV0dXJuIGF0dHJpYnV0ZXMubWFwKGF0dHJpYnV0ZSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogUkVHSVNUUlkuZ2V0TWFwcGVkUHJvcE5hbWUoYXR0cmlidXRlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTY29wZURhdGEoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU2NvcGVEYXRhfG51bGwge1xuICAgIGlmICh0aGlzLnNjb3BlQ2FjaGUuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnNjb3BlQ2FjaGUuZ2V0KGNvbXBvbmVudCkhO1xuICAgIH1cblxuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oY29tcG9uZW50KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogY29tcG9uZW50cyBtdXN0IGhhdmUgbmFtZXNgKTtcbiAgICB9XG5cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuY29tcG9uZW50U2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICBpZiAoc2NvcGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGE6IFNjb3BlRGF0YSA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IFtdLFxuICAgICAgcGlwZXM6IFtdLFxuICAgICAgaXNQb2lzb25lZDogc2NvcGUuY29tcGlsYXRpb24uaXNQb2lzb25lZCxcbiAgICB9O1xuXG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpLmdldFR5cGVDaGVja2VyKCk7XG4gICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgaWYgKGRpci5zZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgZGlyZWN0aXZlLCBpdCBjYW4ndCBiZSBhZGRlZCB0byBhIHRlbXBsYXRlIGFueXdheS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCB0c1N5bWJvbCA9IHR5cGVDaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZGlyLnJlZi5ub2RlLm5hbWUpO1xuICAgICAgaWYgKCFpc1N5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9uKHRzU3ltYm9sKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgbGV0IG5nTW9kdWxlOiBDbGFzc0RlY2xhcmF0aW9ufG51bGwgPSBudWxsO1xuICAgICAgY29uc3QgbW9kdWxlU2NvcGVPZkRpciA9IHRoaXMuY29tcG9uZW50U2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQoZGlyLnJlZi5ub2RlKTtcbiAgICAgIGlmIChtb2R1bGVTY29wZU9mRGlyICE9PSBudWxsKSB7XG4gICAgICAgIG5nTW9kdWxlID0gbW9kdWxlU2NvcGVPZkRpci5uZ01vZHVsZTtcbiAgICAgIH1cblxuICAgICAgZGF0YS5kaXJlY3RpdmVzLnB1c2goe1xuICAgICAgICBpc0NvbXBvbmVudDogZGlyLmlzQ29tcG9uZW50LFxuICAgICAgICBpc1N0cnVjdHVyYWw6IGRpci5pc1N0cnVjdHVyYWwsXG4gICAgICAgIHNlbGVjdG9yOiBkaXIuc2VsZWN0b3IsXG4gICAgICAgIHRzU3ltYm9sLFxuICAgICAgICBuZ01vZHVsZSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5jb21waWxhdGlvbi5waXBlcykge1xuICAgICAgY29uc3QgdHNTeW1ib2wgPSB0eXBlQ2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHBpcGUucmVmLm5vZGUubmFtZSk7XG4gICAgICBpZiAodHNTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGRhdGEucGlwZXMucHVzaCh7XG4gICAgICAgIG5hbWU6IHBpcGUubmFtZSxcbiAgICAgICAgdHNTeW1ib2wsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnNjb3BlQ2FjaGUuc2V0KGNvbXBvbmVudCwgZGF0YSk7XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29udmVydERpYWdub3N0aWMoXG4gICAgZGlhZzogdHMuRGlhZ25vc3RpYywgc291cmNlUmVzb2x2ZXI6IFRlbXBsYXRlU291cmNlUmVzb2x2ZXIpOiBUZW1wbGF0ZURpYWdub3N0aWN8bnVsbCB7XG4gIGlmICghc2hvdWxkUmVwb3J0RGlhZ25vc3RpYyhkaWFnKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB0cmFuc2xhdGVEaWFnbm9zdGljKGRpYWcsIHNvdXJjZVJlc29sdmVyKTtcbn1cblxuLyoqXG4gKiBEYXRhIGZvciB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHJlbGF0ZWQgdG8gYSBzcGVjaWZpYyBpbnB1dCBmaWxlIGluIHRoZSB1c2VyJ3MgcHJvZ3JhbSAod2hpY2hcbiAqIGNvbnRhaW5zIGNvbXBvbmVudHMgdG8gYmUgY2hlY2tlZCkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAvKipcbiAgICogV2hldGhlciB0aGUgdHlwZS1jaGVja2luZyBzaGltIHJlcXVpcmVkIGFueSBpbmxpbmUgY2hhbmdlcyB0byB0aGUgb3JpZ2luYWwgZmlsZSwgd2hpY2ggYWZmZWN0c1xuICAgKiB3aGV0aGVyIHRoZSBzaGltIGNhbiBiZSByZXVzZWQuXG4gICAqL1xuICBoYXNJbmxpbmVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBTb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbiBmb3IgbWFwcGluZyBkaWFnbm9zdGljcyBmcm9tIGlubGluZWQgdHlwZSBjaGVjayBibG9ja3MgYmFjayB0byB0aGVcbiAgICogb3JpZ2luYWwgdGVtcGxhdGUuXG4gICAqL1xuICBzb3VyY2VNYW5hZ2VyOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXI7XG5cbiAgLyoqXG4gICAqIERhdGEgZm9yIGVhY2ggc2hpbSBnZW5lcmF0ZWQgZnJvbSB0aGlzIGlucHV0IGZpbGUuXG4gICAqXG4gICAqIEEgc2luZ2xlIGlucHV0IGZpbGUgd2lsbCBnZW5lcmF0ZSBvbmUgb3IgbW9yZSBzaGltIGZpbGVzIHRoYXQgYWN0dWFsbHkgY29udGFpbiB0ZW1wbGF0ZVxuICAgKiB0eXBlLWNoZWNraW5nIGNvZGUuXG4gICAqL1xuICBzaGltRGF0YTogTWFwPEFic29sdXRlRnNQYXRoLCBTaGltVHlwZUNoZWNraW5nRGF0YT47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tlciBpcyBjZXJ0YWluIHRoYXQgYWxsIGNvbXBvbmVudHMgZnJvbSB0aGlzIGlucHV0IGZpbGUgaGF2ZSBoYWRcbiAgICogdHlwZS1jaGVja2luZyBjb2RlIGdlbmVyYXRlZCBpbnRvIHNoaW1zLlxuICAgKi9cbiAgaXNDb21wbGV0ZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBEcml2ZXMgYSBgVHlwZUNoZWNrQ29udGV4dGAgdG8gZ2VuZXJhdGUgdHlwZS1jaGVja2luZyBjb2RlIGZvciBldmVyeSBjb21wb25lbnQgaW4gdGhlIHByb2dyYW0uXG4gKi9cbmNsYXNzIFdob2xlUHJvZ3JhbVR5cGVDaGVja2luZ0hvc3QgaW1wbGVtZW50cyBUeXBlQ2hlY2tpbmdIb3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBpbXBsOiBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbCkge31cblxuICBnZXRTb3VyY2VNYW5hZ2VyKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXIge1xuICAgIHJldHVybiB0aGlzLmltcGwuZ2V0RmlsZURhdGEoc2ZQYXRoKS5zb3VyY2VNYW5hZ2VyO1xuICB9XG5cbiAgc2hvdWxkQ2hlY2tDb21wb25lbnQobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUobm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHNmUGF0aCk7XG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmltcGwuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICAvLyBUaGUgY29tcG9uZW50IG5lZWRzIHRvIGJlIGNoZWNrZWQgdW5sZXNzIHRoZSBzaGltIHdoaWNoIHdvdWxkIGNvbnRhaW4gaXQgYWxyZWFkeSBleGlzdHMuXG4gICAgcmV0dXJuICFmaWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpO1xuICB9XG5cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgIGZpbGVEYXRhLnNoaW1EYXRhLnNldChkYXRhLnBhdGgsIGRhdGEpO1xuICAgIGlmIChkYXRhLmhhc0lubGluZXMpIHtcbiAgICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZENvbXBsZXRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmltcGwuZ2V0RmlsZURhdGEoc2ZQYXRoKS5pc0NvbXBsZXRlID0gdHJ1ZTtcbiAgfVxufVxuXG4vKipcbiAqIERyaXZlcyBhIGBUeXBlQ2hlY2tDb250ZXh0YCB0byBnZW5lcmF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZWZmaWNpZW50bHkgZm9yIGEgc2luZ2xlIGlucHV0IGZpbGUuXG4gKi9cbmNsYXNzIFNpbmdsZUZpbGVUeXBlQ2hlY2tpbmdIb3N0IGltcGxlbWVudHMgVHlwZUNoZWNraW5nSG9zdCB7XG4gIHByaXZhdGUgc2VlbklubGluZXMgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBwcm90ZWN0ZWQgZmlsZURhdGE6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhLFxuICAgICAgcHJvdGVjdGVkIGltcGw6IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsKSB7fVxuXG4gIHByaXZhdGUgYXNzZXJ0UGF0aChzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc2ZQYXRoICE9PSBzZlBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uRXJyb3I6IHF1ZXJ5aW5nIFR5cGVDaGVja2luZ0hvc3Qgb3V0c2lkZSBvZiBhc3NpZ25lZCBmaWxlYCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0U291cmNlTWFuYWdlcihzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogVGVtcGxhdGVTb3VyY2VNYW5hZ2VyIHtcbiAgICB0aGlzLmFzc2VydFBhdGgoc2ZQYXRoKTtcbiAgICByZXR1cm4gdGhpcy5maWxlRGF0YS5zb3VyY2VNYW5hZ2VyO1xuICB9XG5cbiAgc2hvdWxkQ2hlY2tDb21wb25lbnQobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnNmUGF0aCAhPT0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3IodGhpcy5zZlBhdGgpO1xuXG4gICAgLy8gT25seSBuZWVkIHRvIGdlbmVyYXRlIGEgVENCIGZvciB0aGUgY2xhc3MgaWYgbm8gc2hpbSBleGlzdHMgZm9yIGl0IGN1cnJlbnRseS5cbiAgICByZXR1cm4gIXRoaXMuZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKTtcbiAgfVxuXG4gIHJlY29yZFNoaW1EYXRhKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGRhdGE6IFNoaW1UeXBlQ2hlY2tpbmdEYXRhKTogdm9pZCB7XG4gICAgdGhpcy5hc3NlcnRQYXRoKHNmUGF0aCk7XG5cbiAgICAvLyBQcmV2aW91cyB0eXBlLWNoZWNraW5nIHN0YXRlIG1heSBoYXZlIHJlcXVpcmVkIHRoZSB1c2Ugb2YgaW5saW5lcyAoYXNzdW1pbmcgdGhleSB3ZXJlXG4gICAgLy8gc3VwcG9ydGVkKS4gSWYgdGhlIGN1cnJlbnQgb3BlcmF0aW9uIGFsc28gcmVxdWlyZXMgaW5saW5lcywgdGhpcyBwcmVzZW50cyBhIHByb2JsZW06XG4gICAgLy8gZ2VuZXJhdGluZyBuZXcgaW5saW5lcyBtYXkgaW52YWxpZGF0ZSBhbnkgb2xkIGlubGluZXMgdGhhdCBvbGQgc3RhdGUgZGVwZW5kcyBvbi5cbiAgICAvL1xuICAgIC8vIFJhdGhlciB0aGFuIHJlc29sdmUgdGhpcyBpc3N1ZSBieSB0cmFja2luZyBzcGVjaWZpYyBkZXBlbmRlbmNpZXMgb24gaW5saW5lcywgaWYgdGhlIG5ldyBzdGF0ZVxuICAgIC8vIHJlbGllcyBvbiBpbmxpbmVzLCBhbnkgb2xkIHN0YXRlIHRoYXQgcmVsaWVkIG9uIHRoZW0gaXMgc2ltcGx5IGNsZWFyZWQuIFRoaXMgaGFwcGVucyB3aGVuIHRoZVxuICAgIC8vIGZpcnN0IG5ldyBzdGF0ZSB0aGF0IHVzZXMgaW5saW5lcyBpcyBlbmNvdW50ZXJlZC5cbiAgICBpZiAoZGF0YS5oYXNJbmxpbmVzICYmICF0aGlzLnNlZW5JbmxpbmVzKSB7XG4gICAgICB0aGlzLmltcGwuY2xlYXJBbGxTaGltRGF0YVVzaW5nSW5saW5lcygpO1xuICAgICAgdGhpcy5zZWVuSW5saW5lcyA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5maWxlRGF0YS5zaGltRGF0YS5zZXQoZGF0YS5wYXRoLCBkYXRhKTtcbiAgICBpZiAoZGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICB0aGlzLmZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZENvbXBsZXRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydFBhdGgoc2ZQYXRoKTtcbiAgICB0aGlzLmZpbGVEYXRhLmlzQ29tcGxldGUgPSB0cnVlO1xuICB9XG59XG5cbi8qKlxuICogRHJpdmVzIGEgYFR5cGVDaGVja0NvbnRleHRgIHRvIGdlbmVyYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBlZmZpY2llbnRseSBmb3Igb25seSB0aG9zZSBjb21wb25lbnRzXG4gKiB3aGljaCBtYXAgdG8gYSBzaW5nbGUgc2hpbSBvZiBhIHNpbmdsZSBpbnB1dCBmaWxlLlxuICovXG5jbGFzcyBTaW5nbGVTaGltVHlwZUNoZWNraW5nSG9zdCBleHRlbmRzIFNpbmdsZUZpbGVUeXBlQ2hlY2tpbmdIb3N0IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBmaWxlRGF0YTogRmlsZVR5cGVDaGVja2luZ0RhdGEsIGltcGw6IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsLFxuICAgICAgcHJpdmF0ZSBzaGltUGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICBzdXBlcihzZlBhdGgsIGZpbGVEYXRhLCBpbXBsKTtcbiAgfVxuXG4gIHNob3VsZENoZWNrTm9kZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuc2ZQYXRoICE9PSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG5vZGUuZ2V0U291cmNlRmlsZSgpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE9ubHkgZ2VuZXJhdGUgYSBUQ0IgZm9yIHRoZSBjb21wb25lbnQgaWYgaXQgbWFwcyB0byB0aGUgcmVxdWVzdGVkIHNoaW0gZmlsZS5cbiAgICBjb25zdCBzaGltUGF0aCA9IFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcih0aGlzLnNmUGF0aCk7XG4gICAgaWYgKHNoaW1QYXRoICE9PSB0aGlzLnNoaW1QYXRoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT25seSBuZWVkIHRvIGdlbmVyYXRlIGEgVENCIGZvciB0aGUgY2xhc3MgaWYgbm8gc2hpbSBleGlzdHMgZm9yIGl0IGN1cnJlbnRseS5cbiAgICByZXR1cm4gIXRoaXMuZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKTtcbiAgfVxufVxuXG4vKipcbiAqIENhY2hlZCBzY29wZSBpbmZvcm1hdGlvbiBmb3IgYSBjb21wb25lbnQuXG4gKi9cbmludGVyZmFjZSBTY29wZURhdGEge1xuICBkaXJlY3RpdmVzOiBEaXJlY3RpdmVJblNjb3BlW107XG4gIHBpcGVzOiBQaXBlSW5TY29wZVtdO1xuICBpc1BvaXNvbmVkOiBib29sZWFuO1xufVxuIl19