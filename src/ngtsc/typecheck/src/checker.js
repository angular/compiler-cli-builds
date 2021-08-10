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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/checker", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/program_driver", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/completion", "@angular/compiler-cli/src/ngtsc/typecheck/src/context", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/shim", "@angular/compiler-cli/src/ngtsc/typecheck/src/source", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TemplateTypeCheckerImpl = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var program_driver_1 = require("@angular/compiler-cli/src/ngtsc/program_driver");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
    var completion_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/completion");
    var context_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/context");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
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
            return diagnostics_1.makeTemplateDiagnostic(templateId, mapping, sourceSpan, category, errorCode, message, relatedInformation);
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
        if (!diagnostics_2.shouldReportDiagnostic(diag)) {
            return null;
        }
        return diagnostics_2.translateDiagnostic(diag, sourceResolver);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBd1I7SUFLeFIsMkVBQTZHO0lBQzdHLG1FQUEwRDtJQUUxRCw2REFBOEU7SUFDOUUsaUZBQStEO0lBQy9ELHlFQUEyRjtJQUUzRiwrREFBbUM7SUFDbkMsa0ZBQTRGO0lBQzVGLHFFQUF3UTtJQUN4USxxRkFBMEU7SUFFMUUsdUZBQThDO0lBQzlDLGlGQUFtSDtJQUNuSCx5RkFBMEU7SUFDMUUsMkVBQThDO0lBQzlDLCtFQUErQztJQUMvQyxtRkFBMEY7SUFDMUYsaUhBQXdEO0lBR3hELElBQU0sUUFBUSxHQUFHLElBQUksbUNBQXdCLEVBQUUsQ0FBQztJQUNoRDs7OztPQUlHO0lBQ0g7UUF5Q0UsaUNBQ1ksZUFBMkIsRUFBVyxhQUE0QixFQUNsRSxnQkFBeUMsRUFBVSxNQUEwQixFQUM3RSxVQUE0QixFQUFVLFNBQXlCLEVBQy9ELFlBQTJELEVBQzNELFVBQTJELEVBQ2xELG9CQUEwQyxFQUMxQyxzQkFBOEMsRUFDOUMsSUFBa0I7WUFQM0Isb0JBQWUsR0FBZixlQUFlLENBQVk7WUFBVyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtZQUNsRSxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXlCO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7WUFDN0UsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMvRCxpQkFBWSxHQUFaLFlBQVksQ0FBK0M7WUFDM0QsZUFBVSxHQUFWLFVBQVUsQ0FBaUQ7WUFDbEQseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtZQUMxQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdC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TSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUM5QjtZQUZXLGNBQVEsR0FBUixRQUFRLENBQWdCOztRQUVwQyxDQUFDO1FBRUQsb0RBQWUsR0FBZixVQUFnQixJQUF5QjtZQUN2QyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssb0NBQXNCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUU7Z0JBQ2hFLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFFRCwrRUFBK0U7WUFDL0UsSUFBTSxRQUFRLEdBQUcsNkJBQXNCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3RCxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUM5QixPQUFPLEtBQUssQ0FBQzthQUNkO1lBRUQsZ0ZBQWdGO1lBQ2hGLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQXJCRCxDQUF5QywwQkFBMEIsR0FxQmxFIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBDc3NTZWxlY3RvciwgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBMaXRlcmFsUHJpbWl0aXZlLCBNZXRob2RDYWxsLCBQYXJzZUVycm9yLCBQYXJzZVNvdXJjZVNwYW4sIHBhcnNlVGVtcGxhdGUsIFByb3BlcnR5UmVhZCwgU2FmZU1ldGhvZENhbGwsIFNhZmVQcm9wZXJ0eVJlYWQsIFRtcGxBc3RFbGVtZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7VGV4dEF0dHJpYnV0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL3JlbmRlcjMvcjNfYXN0JztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtFcnJvckNvZGV9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRoLCBnZXRTb3VyY2VGaWxlT3JFcnJvcn0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtQZXJmQ2hlY2twb2ludCwgUGVyZkV2ZW50LCBQZXJmUGhhc2UsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge1Byb2dyYW1Ecml2ZXIsIFVwZGF0ZU1vZGV9IGZyb20gJy4uLy4uL3Byb2dyYW1fZHJpdmVyJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXIsIFR5cGVDaGVja1Njb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7aXNTaGltfSBmcm9tICcuLi8uLi9zaGltcyc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGVPck51bGwsIGlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEaXJlY3RpdmVJblNjb3BlLCBFbGVtZW50U3ltYm9sLCBGdWxsVGVtcGxhdGVNYXBwaW5nLCBHbG9iYWxDb21wbGV0aW9uLCBPcHRpbWl6ZUZvciwgUGlwZUluU2NvcGUsIFByb2dyYW1UeXBlQ2hlY2tBZGFwdGVyLCBTaGltTG9jYXRpb24sIFN5bWJvbCwgVGVtcGxhdGVJZCwgVGVtcGxhdGVTeW1ib2wsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhLCBUeXBlQ2hlY2tpbmdDb25maWd9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge21ha2VUZW1wbGF0ZURpYWdub3N0aWMsIFRlbXBsYXRlRGlhZ25vc3RpY30gZnJvbSAnLi4vZGlhZ25vc3RpY3MnO1xuXG5pbXBvcnQge0NvbXBsZXRpb25FbmdpbmV9IGZyb20gJy4vY29tcGxldGlvbic7XG5pbXBvcnQge0lubGluaW5nTW9kZSwgU2hpbVR5cGVDaGVja2luZ0RhdGEsIFRlbXBsYXRlRGF0YSwgVHlwZUNoZWNrQ29udGV4dEltcGwsIFR5cGVDaGVja2luZ0hvc3R9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQge3Nob3VsZFJlcG9ydERpYWdub3N0aWMsIHRyYW5zbGF0ZURpYWdub3N0aWN9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtUeXBlQ2hlY2tTaGltR2VuZXJhdG9yfSBmcm9tICcuL3NoaW0nO1xuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZU1hbmFnZXJ9IGZyb20gJy4vc291cmNlJztcbmltcG9ydCB7ZmluZFR5cGVDaGVja0Jsb2NrLCBnZXRUZW1wbGF0ZU1hcHBpbmcsIFRlbXBsYXRlU291cmNlUmVzb2x2ZXJ9IGZyb20gJy4vdGNiX3V0aWwnO1xuaW1wb3J0IHtTeW1ib2xCdWlsZGVyfSBmcm9tICcuL3RlbXBsYXRlX3N5bWJvbF9idWlsZGVyJztcblxuXG5jb25zdCBSRUdJU1RSWSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcbi8qKlxuICogUHJpbWFyeSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGVuZ2luZSwgd2hpY2ggcGVyZm9ybXMgdHlwZS1jaGVja2luZyB1c2luZyBhXG4gKiBgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5YCBmb3IgdHlwZS1jaGVja2luZyBwcm9ncmFtIG1haW50ZW5hbmNlLCBhbmQgdGhlXG4gKiBgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXJgIGZvciBnZW5lcmF0aW9uIG9mIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29kZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsIGltcGxlbWVudHMgVGVtcGxhdGVUeXBlQ2hlY2tlciB7XG4gIHByaXZhdGUgc3RhdGUgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBGaWxlVHlwZUNoZWNraW5nRGF0YT4oKTtcblxuICAvKipcbiAgICogU3RvcmVzIHRoZSBgQ29tcGxldGlvbkVuZ2luZWAgd2hpY2ggcG93ZXJzIGF1dG9jb21wbGV0aW9uIGZvciBlYWNoIGNvbXBvbmVudCBjbGFzcy5cbiAgICpcbiAgICogTXVzdCBiZSBpbnZhbGlkYXRlZCB3aGVuZXZlciB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgb3IgdGhlIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzLiBJbnZhbGlkYXRpb25cbiAgICogb24gdGVtcGxhdGUgY2hhbmdlcyBpcyBwZXJmb3JtZWQgd2l0aGluIHRoaXMgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBpbnN0YW5jZS4gV2hlbiB0aGVcbiAgICogYHRzLlByb2dyYW1gIGNoYW5nZXMsIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGFzIGEgd2hvbGUgaXMgZGVzdHJveWVkIGFuZCByZXBsYWNlZC5cbiAgICovXG4gIHByaXZhdGUgY29tcGxldGlvbkNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBDb21wbGV0aW9uRW5naW5lPigpO1xuICAvKipcbiAgICogU3RvcmVzIHRoZSBgU3ltYm9sQnVpbGRlcmAgd2hpY2ggY3JlYXRlcyBzeW1ib2xzIGZvciBlYWNoIGNvbXBvbmVudCBjbGFzcy5cbiAgICpcbiAgICogTXVzdCBiZSBpbnZhbGlkYXRlZCB3aGVuZXZlciB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgb3IgdGhlIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzLiBJbnZhbGlkYXRpb25cbiAgICogb24gdGVtcGxhdGUgY2hhbmdlcyBpcyBwZXJmb3JtZWQgd2l0aGluIHRoaXMgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBpbnN0YW5jZS4gV2hlbiB0aGVcbiAgICogYHRzLlByb2dyYW1gIGNoYW5nZXMsIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGFzIGEgd2hvbGUgaXMgZGVzdHJveWVkIGFuZCByZXBsYWNlZC5cbiAgICovXG4gIHByaXZhdGUgc3ltYm9sQnVpbGRlckNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBTeW1ib2xCdWlsZGVyPigpO1xuXG4gIC8qKlxuICAgKiBTdG9yZXMgZGlyZWN0aXZlcyBhbmQgcGlwZXMgdGhhdCBhcmUgaW4gc2NvcGUgZm9yIGVhY2ggY29tcG9uZW50LlxuICAgKlxuICAgKiBVbmxpa2Ugb3RoZXIgY2FjaGVzLCB0aGUgc2NvcGUgb2YgYSBjb21wb25lbnQgaXMgbm90IGFmZmVjdGVkIGJ5IGl0cyB0ZW1wbGF0ZS4gSXQgd2lsbCBiZVxuICAgKiBkZXN0cm95ZWQgd2hlbiB0aGUgYHRzLlByb2dyYW1gIGNoYW5nZXMgYW5kIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGFzIGEgd2hvbGUgaXNcbiAgICogZGVzdHJveWVkIGFuZCByZXBsYWNlZC5cbiAgICovXG4gIHByaXZhdGUgc2NvcGVDYWNoZSA9IG5ldyBNYXA8dHMuQ2xhc3NEZWNsYXJhdGlvbiwgU2NvcGVEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBTdG9yZXMgcG90ZW50aWFsIGVsZW1lbnQgdGFncyBmb3IgZWFjaCBjb21wb25lbnQgKGEgdW5pb24gb2YgRE9NIHRhZ3MgYXMgd2VsbCBhcyBkaXJlY3RpdmVcbiAgICogdGFncykuXG4gICAqXG4gICAqIFVubGlrZSBvdGhlciBjYWNoZXMsIHRoZSBzY29wZSBvZiBhIGNvbXBvbmVudCBpcyBub3QgYWZmZWN0ZWQgYnkgaXRzIHRlbXBsYXRlLiBJdCB3aWxsIGJlXG4gICAqIGRlc3Ryb3llZCB3aGVuIHRoZSBgdHMuUHJvZ3JhbWAgY2hhbmdlcyBhbmQgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgYXMgYSB3aG9sZSBpc1xuICAgKiBkZXN0cm95ZWQgYW5kIHJlcGxhY2VkLlxuICAgKi9cbiAgcHJpdmF0ZSBlbGVtZW50VGFnQ2FjaGUgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIE1hcDxzdHJpbmcsIERpcmVjdGl2ZUluU2NvcGV8bnVsbD4+KCk7XG5cbiAgcHJpdmF0ZSBpc0NvbXBsZXRlID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIG9yaWdpbmFsUHJvZ3JhbTogdHMuUHJvZ3JhbSwgcmVhZG9ubHkgcHJvZ3JhbURyaXZlcjogUHJvZ3JhbURyaXZlcixcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNrQWRhcHRlcjogUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIsIHByaXZhdGUgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgY29tcGlsZXJIb3N0OiBQaWNrPHRzLkNvbXBpbGVySG9zdCwgJ2dldENhbm9uaWNhbEZpbGVOYW1lJz4sXG4gICAgICBwcml2YXRlIHByaW9yQnVpbGQ6IEluY3JlbWVudGFsQnVpbGQ8dW5rbm93biwgRmlsZVR5cGVDaGVja2luZ0RhdGE+LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb21wb25lbnRTY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHR5cGVDaGVja1Njb3BlUmVnaXN0cnk6IFR5cGVDaGVja1Njb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHBlcmY6IFBlcmZSZWNvcmRlcikge31cblxuICBnZXRUZW1wbGF0ZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUbXBsQXN0Tm9kZVtdfG51bGwge1xuICAgIGNvbnN0IHtkYXRhfSA9IHRoaXMuZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50KTtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLnRlbXBsYXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOlxuICAgICAge2RhdGE6IFRlbXBsYXRlRGF0YXxudWxsLCB0Y2I6IHRzLk5vZGV8bnVsbCwgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRofSB7XG4gICAgdGhpcy5lbnN1cmVTaGltRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBzZiA9IGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3Ioc2ZQYXRoKTtcblxuICAgIGNvbnN0IGZpbGVSZWNvcmQgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG5cbiAgICBpZiAoIWZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgcmV0dXJuIHtkYXRhOiBudWxsLCB0Y2I6IG51bGwsIHNoaW1QYXRofTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcbiAgICBjb25zdCBzaGltUmVjb3JkID0gZmlsZVJlY29yZC5zaGltRGF0YS5nZXQoc2hpbVBhdGgpITtcbiAgICBjb25zdCBpZCA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcbiAgICBjb25zdCBzaGltU2YgPSBnZXRTb3VyY2VGaWxlT3JOdWxsKHByb2dyYW0sIHNoaW1QYXRoKTtcblxuICAgIGlmIChzaGltU2YgPT09IG51bGwgfHwgIWZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogbm8gc2hpbSBmaWxlIGluIHByb2dyYW06ICR7c2hpbVBhdGh9YCk7XG4gICAgfVxuXG4gICAgbGV0IHRjYjogdHMuTm9kZXxudWxsID0gZmluZFR5cGVDaGVja0Jsb2NrKHNoaW1TZiwgaWQsIC8qaXNEaWFnbm9zdGljc1JlcXVlc3QqLyBmYWxzZSk7XG5cbiAgICBpZiAodGNiID09PSBudWxsKSB7XG4gICAgICAvLyBUcnkgZm9yIGFuIGlubGluZSBibG9jay5cbiAgICAgIGNvbnN0IGlubGluZVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IocHJvZ3JhbSwgc2ZQYXRoKTtcbiAgICAgIHRjYiA9IGZpbmRUeXBlQ2hlY2tCbG9jayhpbmxpbmVTZiwgaWQsIC8qaXNEaWFnbm9zdGljc1JlcXVlc3QqLyBmYWxzZSk7XG4gICAgfVxuXG4gICAgbGV0IGRhdGE6IFRlbXBsYXRlRGF0YXxudWxsID0gbnVsbDtcbiAgICBpZiAoc2hpbVJlY29yZC50ZW1wbGF0ZXMuaGFzKHRlbXBsYXRlSWQpKSB7XG4gICAgICBkYXRhID0gc2hpbVJlY29yZC50ZW1wbGF0ZXMuZ2V0KHRlbXBsYXRlSWQpITtcbiAgICB9XG5cbiAgICByZXR1cm4ge2RhdGEsIHRjYiwgc2hpbVBhdGh9O1xuICB9XG5cbiAgaXNUcmFja2VkVHlwZUNoZWNrRmlsZShmaWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5nZXRGaWxlQW5kU2hpbVJlY29yZHNGb3JQYXRoKGZpbGVQYXRoKSAhPT0gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RmlsZUFuZFNoaW1SZWNvcmRzRm9yUGF0aChzaGltUGF0aDogQWJzb2x1dGVGc1BhdGgpOlxuICAgICAge2ZpbGVSZWNvcmQ6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhLCBzaGltUmVjb3JkOiBTaGltVHlwZUNoZWNraW5nRGF0YX18bnVsbCB7XG4gICAgZm9yIChjb25zdCBmaWxlUmVjb3JkIG9mIHRoaXMuc3RhdGUudmFsdWVzKCkpIHtcbiAgICAgIGlmIChmaWxlUmVjb3JkLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHtmaWxlUmVjb3JkLCBzaGltUmVjb3JkOiBmaWxlUmVjb3JkLnNoaW1EYXRhLmdldChzaGltUGF0aCkhfTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBnZXRUZW1wbGF0ZU1hcHBpbmdBdFNoaW1Mb2NhdGlvbih7c2hpbVBhdGgsIHBvc2l0aW9uSW5TaGltRmlsZX06IFNoaW1Mb2NhdGlvbik6XG4gICAgICBGdWxsVGVtcGxhdGVNYXBwaW5nfG51bGwge1xuICAgIGNvbnN0IHJlY29yZHMgPSB0aGlzLmdldEZpbGVBbmRTaGltUmVjb3Jkc0ZvclBhdGgoYWJzb2x1dGVGcm9tKHNoaW1QYXRoKSk7XG4gICAgaWYgKHJlY29yZHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB7ZmlsZVJlY29yZH0gPSByZWNvcmRzO1xuXG4gICAgY29uc3Qgc2hpbVNmID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShzaGltUGF0aCkpO1xuICAgIGlmIChzaGltU2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBnZXRUZW1wbGF0ZU1hcHBpbmcoXG4gICAgICAgIHNoaW1TZiwgcG9zaXRpb25JblNoaW1GaWxlLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIsIC8qaXNEaWFnbm9zdGljc1JlcXVlc3QqLyBmYWxzZSk7XG4gIH1cblxuICBnZW5lcmF0ZUFsbFR5cGVDaGVja0Jsb2NrcygpIHtcbiAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yQWxsRmlsZXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0eXBlLWNoZWNraW5nIGFuZCB0ZW1wbGF0ZSBwYXJzZSBkaWFnbm9zdGljcyBmcm9tIHRoZSBnaXZlbiBgdHMuU291cmNlRmlsZWAgdXNpbmcgdGhlXG4gICAqIG1vc3QgcmVjZW50IHR5cGUtY2hlY2tpbmcgcHJvZ3JhbS5cbiAgICovXG4gIGdldERpYWdub3N0aWNzRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBzd2l0Y2ggKG9wdGltaXplRm9yKSB7XG4gICAgICBjYXNlIE9wdGltaXplRm9yLldob2xlUHJvZ3JhbTpcbiAgICAgICAgdGhpcy5lbnN1cmVBbGxTaGltc0ZvckFsbEZpbGVzKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBPcHRpbWl6ZUZvci5TaW5nbGVGaWxlOlxuICAgICAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yT25lRmlsZShzZik7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShQZXJmUGhhc2UuVHRjRGlhZ25vc3RpY3MsICgpID0+IHtcbiAgICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuc3RhdGUuZ2V0KHNmUGF0aCkhO1xuXG4gICAgICBjb25zdCB0eXBlQ2hlY2tQcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcblxuICAgICAgY29uc3QgZGlhZ25vc3RpY3M6ICh0cy5EaWFnbm9zdGljfG51bGwpW10gPSBbXTtcbiAgICAgIGlmIChmaWxlUmVjb3JkLmhhc0lubGluZXMpIHtcbiAgICAgICAgY29uc3QgaW5saW5lU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzZlBhdGgpO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhpbmxpbmVTZikubWFwKFxuICAgICAgICAgICAgZGlhZyA9PiBjb252ZXJ0RGlhZ25vc3RpYyhkaWFnLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIpKSk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3NoaW1QYXRoLCBzaGltUmVjb3JkXSBvZiBmaWxlUmVjb3JkLnNoaW1EYXRhKSB7XG4gICAgICAgIGNvbnN0IHNoaW1TZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNoaW1QYXRoKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2hpbVNmKS5tYXAoXG4gICAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zaGltUmVjb3JkLmdlbmVzaXNEaWFnbm9zdGljcyk7XG5cbiAgICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZURhdGEgb2Ygc2hpbVJlY29yZC50ZW1wbGF0ZXMudmFsdWVzKCkpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRlbXBsYXRlRGF0YS50ZW1wbGF0ZURpYWdub3N0aWNzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGlhZ25vc3RpY3MuZmlsdGVyKChkaWFnOiB0cy5EaWFnbm9zdGljfG51bGwpOiBkaWFnIGlzIHRzLkRpYWdub3N0aWMgPT4gZGlhZyAhPT0gbnVsbCk7XG4gICAgfSk7XG4gIH1cblxuICBnZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHRoaXMuZW5zdXJlU2hpbUZvckNvbXBvbmVudChjb21wb25lbnQpO1xuXG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFBlcmZQaGFzZS5UdGNEaWFnbm9zdGljcywgKCkgPT4ge1xuICAgICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgICBjb25zdCBzaGltUGF0aCA9IFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcihzZlBhdGgpO1xuXG4gICAgICBjb25zdCBmaWxlUmVjb3JkID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuXG4gICAgICBpZiAoIWZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjb21wb25lbnQpO1xuICAgICAgY29uc3Qgc2hpbVJlY29yZCA9IGZpbGVSZWNvcmQuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSE7XG5cbiAgICAgIGNvbnN0IHR5cGVDaGVja1Byb2dyYW0gPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpO1xuXG4gICAgICBjb25zdCBkaWFnbm9zdGljczogKFRlbXBsYXRlRGlhZ25vc3RpY3xudWxsKVtdID0gW107XG4gICAgICBpZiAoc2hpbVJlY29yZC5oYXNJbmxpbmVzKSB7XG4gICAgICAgIGNvbnN0IGlubGluZVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IodHlwZUNoZWNrUHJvZ3JhbSwgc2ZQYXRoKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3MoaW5saW5lU2YpLm1hcChcbiAgICAgICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzaGltU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzaGltUGF0aCk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzaGltU2YpLm1hcChcbiAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uc2hpbVJlY29yZC5nZW5lc2lzRGlhZ25vc3RpY3MpO1xuXG4gICAgICBmb3IgKGNvbnN0IHRlbXBsYXRlRGF0YSBvZiBzaGltUmVjb3JkLnRlbXBsYXRlcy52YWx1ZXMoKSkge1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRlbXBsYXRlRGF0YS50ZW1wbGF0ZURpYWdub3N0aWNzKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRpYWdub3N0aWNzLmZpbHRlcihcbiAgICAgICAgICAoZGlhZzogVGVtcGxhdGVEaWFnbm9zdGljfG51bGwpOiBkaWFnIGlzIFRlbXBsYXRlRGlhZ25vc3RpYyA9PlxuICAgICAgICAgICAgICBkaWFnICE9PSBudWxsICYmIGRpYWcudGVtcGxhdGVJZCA9PT0gdGVtcGxhdGVJZCk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRUeXBlQ2hlY2tCbG9jayhjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB0cy5Ob2RlfG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldExhdGVzdENvbXBvbmVudFN0YXRlKGNvbXBvbmVudCkudGNiO1xuICB9XG5cbiAgZ2V0R2xvYmFsQ29tcGxldGlvbnMoXG4gICAgICBjb250ZXh0OiBUbXBsQXN0VGVtcGxhdGV8bnVsbCwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLFxuICAgICAgbm9kZTogQVNUfFRtcGxBc3ROb2RlKTogR2xvYmFsQ29tcGxldGlvbnxudWxsIHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldE9yQ3JlYXRlQ29tcGxldGlvbkVuZ2luZShjb21wb25lbnQpO1xuICAgIGlmIChlbmdpbmUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wZXJmLmluUGhhc2UoXG4gICAgICAgIFBlcmZQaGFzZS5UdGNBdXRvY29tcGxldGlvbiwgKCkgPT4gZW5naW5lLmdldEdsb2JhbENvbXBsZXRpb25zKGNvbnRleHQsIG5vZGUpKTtcbiAgfVxuXG4gIGdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oXG4gICAgICBhc3Q6IFByb3BlcnR5UmVhZHxTYWZlUHJvcGVydHlSZWFkfE1ldGhvZENhbGx8U2FmZU1ldGhvZENhbGwsXG4gICAgICBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBTaGltTG9jYXRpb258bnVsbCB7XG4gICAgY29uc3QgZW5naW5lID0gdGhpcy5nZXRPckNyZWF0ZUNvbXBsZXRpb25FbmdpbmUoY29tcG9uZW50KTtcbiAgICBpZiAoZW5naW5lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFxuICAgICAgICBQZXJmUGhhc2UuVHRjQXV0b2NvbXBsZXRpb24sICgpID0+IGVuZ2luZS5nZXRFeHByZXNzaW9uQ29tcGxldGlvbkxvY2F0aW9uKGFzdCkpO1xuICB9XG5cbiAgZ2V0TGl0ZXJhbENvbXBsZXRpb25Mb2NhdGlvbihcbiAgICAgIG5vZGU6IExpdGVyYWxQcmltaXRpdmV8VGV4dEF0dHJpYnV0ZSwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU2hpbUxvY2F0aW9ufG51bGwge1xuICAgIGNvbnN0IGVuZ2luZSA9IHRoaXMuZ2V0T3JDcmVhdGVDb21wbGV0aW9uRW5naW5lKGNvbXBvbmVudCk7XG4gICAgaWYgKGVuZ2luZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShcbiAgICAgICAgUGVyZlBoYXNlLlR0Y0F1dG9jb21wbGV0aW9uLCAoKSA9PiBlbmdpbmUuZ2V0TGl0ZXJhbENvbXBsZXRpb25Mb2NhdGlvbihub2RlKSk7XG4gIH1cblxuICBpbnZhbGlkYXRlQ2xhc3MoY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLmNvbXBsZXRpb25DYWNoZS5kZWxldGUoY2xhenopO1xuICAgIHRoaXMuc3ltYm9sQnVpbGRlckNhY2hlLmRlbGV0ZShjbGF6eik7XG4gICAgdGhpcy5zY29wZUNhY2hlLmRlbGV0ZShjbGF6eik7XG4gICAgdGhpcy5lbGVtZW50VGFnQ2FjaGUuZGVsZXRlKGNsYXp6KTtcblxuICAgIGNvbnN0IHNmID0gY2xhenouZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHNmUGF0aCk7XG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjbGF6eik7XG5cbiAgICBmaWxlRGF0YS5zaGltRGF0YS5kZWxldGUoc2hpbVBhdGgpO1xuICAgIGZpbGVEYXRhLmlzQ29tcGxldGUgPSBmYWxzZTtcblxuICAgIHRoaXMuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICB9XG5cbiAgbWFrZVRlbXBsYXRlRGlhZ25vc3RpYzxUIGV4dGVuZHMgRXJyb3JDb2RlPihcbiAgICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnksXG4gICAgICBlcnJvckNvZGU6IFQsIG1lc3NhZ2U6IHN0cmluZywgcmVsYXRlZEluZm9ybWF0aW9uPzoge1xuICAgICAgICB0ZXh0OiBzdHJpbmcsXG4gICAgICAgIHN0YXJ0OiBudW1iZXIsXG4gICAgICAgIGVuZDogbnVtYmVyLFxuICAgICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgfVtdKTogVGVtcGxhdGVEaWFnbm9zdGljIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGNsYXp6LmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuc3RhdGUuZ2V0KHNmUGF0aCkhO1xuICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjbGF6eik7XG4gICAgY29uc3QgbWFwcGluZyA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRTb3VyY2VNYXBwaW5nKHRlbXBsYXRlSWQpO1xuXG4gICAgcmV0dXJuIG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgIHRlbXBsYXRlSWQsIG1hcHBpbmcsIHNvdXJjZVNwYW4sIGNhdGVnb3J5LCBlcnJvckNvZGUsIG1lc3NhZ2UsIHJlbGF0ZWRJbmZvcm1hdGlvbik7XG4gIH1cblxuICBwcml2YXRlIGdldE9yQ3JlYXRlQ29tcGxldGlvbkVuZ2luZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBDb21wbGV0aW9uRW5naW5lfG51bGwge1xuICAgIGlmICh0aGlzLmNvbXBsZXRpb25DYWNoZS5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcGxldGlvbkNhY2hlLmdldChjb21wb25lbnQpITtcbiAgICB9XG5cbiAgICBjb25zdCB7dGNiLCBkYXRhLCBzaGltUGF0aH0gPSB0aGlzLmdldExhdGVzdENvbXBvbmVudFN0YXRlKGNvbXBvbmVudCk7XG4gICAgaWYgKHRjYiA9PT0gbnVsbCB8fCBkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBlbmdpbmUgPSBuZXcgQ29tcGxldGlvbkVuZ2luZSh0Y2IsIGRhdGEsIHNoaW1QYXRoKTtcbiAgICB0aGlzLmNvbXBsZXRpb25DYWNoZS5zZXQoY29tcG9uZW50LCBlbmdpbmUpO1xuICAgIHJldHVybiBlbmdpbmU7XG4gIH1cblxuICBwcml2YXRlIG1heWJlQWRvcHRQcmlvclJlc3VsdHNGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgaWYgKHRoaXMuc3RhdGUuaGFzKHNmUGF0aCkpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nUmVzdWx0cyA9IHRoaXMuc3RhdGUuZ2V0KHNmUGF0aCkhO1xuXG4gICAgICBpZiAoZXhpc3RpbmdSZXN1bHRzLmlzQ29tcGxldGUpIHtcbiAgICAgICAgLy8gQWxsIGRhdGEgZm9yIHRoaXMgZmlsZSBoYXMgYWxyZWFkeSBiZWVuIGdlbmVyYXRlZCwgc28gbm8gbmVlZCB0byBhZG9wdCBhbnl0aGluZy5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHByZXZpb3VzUmVzdWx0cyA9IHRoaXMucHJpb3JCdWlsZC5wcmlvclR5cGVDaGVja2luZ1Jlc3VsdHNGb3Ioc2YpO1xuICAgIGlmIChwcmV2aW91c1Jlc3VsdHMgPT09IG51bGwgfHwgIXByZXZpb3VzUmVzdWx0cy5pc0NvbXBsZXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5wZXJmLmV2ZW50Q291bnQoUGVyZkV2ZW50LlJldXNlVHlwZUNoZWNrRmlsZSk7XG4gICAgdGhpcy5zdGF0ZS5zZXQoc2ZQYXRoLCBwcmV2aW91c1Jlc3VsdHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbGxTaGltc0ZvckFsbEZpbGVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzQ29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnBlcmYuaW5QaGFzZShQZXJmUGhhc2UuVGNiR2VuZXJhdGlvbiwgKCkgPT4ge1xuICAgICAgY29uc3QgaG9zdCA9IG5ldyBXaG9sZVByb2dyYW1UeXBlQ2hlY2tpbmdIb3N0KHRoaXMpO1xuICAgICAgY29uc3QgY3R4ID0gdGhpcy5uZXdDb250ZXh0KGhvc3QpO1xuXG4gICAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMub3JpZ2luYWxQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlIHx8IGlzU2hpbShzZikpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2YpO1xuXG4gICAgICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgICAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICAgICAgaWYgKGZpbGVEYXRhLmlzQ29tcGxldGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHlwZUNoZWNrQWRhcHRlci50eXBlQ2hlY2soc2YsIGN0eCk7XG5cbiAgICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudXBkYXRlRnJvbUNvbnRleHQoY3R4KTtcbiAgICAgIHRoaXMuaXNDb21wbGV0ZSA9IHRydWU7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFsbFNoaW1zRm9yT25lRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMucGVyZi5pblBoYXNlKFBlcmZQaGFzZS5UY2JHZW5lcmF0aW9uLCAoKSA9PiB7XG4gICAgICB0aGlzLm1heWJlQWRvcHRQcmlvclJlc3VsdHNGb3JGaWxlKHNmKTtcblxuICAgICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgICAgaWYgKGZpbGVEYXRhLmlzQ29tcGxldGUpIHtcbiAgICAgICAgLy8gQWxsIGRhdGEgZm9yIHRoaXMgZmlsZSBpcyBwcmVzZW50IGFuZCBhY2NvdW50ZWQgZm9yIGFscmVhZHkuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaG9zdCA9IG5ldyBTaW5nbGVGaWxlVHlwZUNoZWNraW5nSG9zdChzZlBhdGgsIGZpbGVEYXRhLCB0aGlzKTtcbiAgICAgIGNvbnN0IGN0eCA9IHRoaXMubmV3Q29udGV4dChob3N0KTtcblxuICAgICAgdGhpcy50eXBlQ2hlY2tBZGFwdGVyLnR5cGVDaGVjayhzZiwgY3R4KTtcblxuICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG5cbiAgICAgIHRoaXMudXBkYXRlRnJvbUNvbnRleHQoY3R4KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlU2hpbUZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB2b2lkIHtcbiAgICBjb25zdCBzZiA9IGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3Ioc2ZQYXRoKTtcblxuICAgIHRoaXMubWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2YpO1xuXG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG5cbiAgICBpZiAoZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgLy8gQWxsIGRhdGEgZm9yIHRoaXMgY29tcG9uZW50IGlzIGF2YWlsYWJsZS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBob3N0ID0gbmV3IFNpbmdsZVNoaW1UeXBlQ2hlY2tpbmdIb3N0KHNmUGF0aCwgZmlsZURhdGEsIHRoaXMsIHNoaW1QYXRoKTtcbiAgICBjb25zdCBjdHggPSB0aGlzLm5ld0NvbnRleHQoaG9zdCk7XG5cbiAgICB0aGlzLnR5cGVDaGVja0FkYXB0ZXIudHlwZUNoZWNrKHNmLCBjdHgpO1xuICAgIHRoaXMudXBkYXRlRnJvbUNvbnRleHQoY3R4KTtcbiAgfVxuXG4gIHByaXZhdGUgbmV3Q29udGV4dChob3N0OiBUeXBlQ2hlY2tpbmdIb3N0KTogVHlwZUNoZWNrQ29udGV4dEltcGwge1xuICAgIGNvbnN0IGlubGluaW5nID1cbiAgICAgICAgdGhpcy5wcm9ncmFtRHJpdmVyLnN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucyA/IElubGluaW5nTW9kZS5JbmxpbmVPcHMgOiBJbmxpbmluZ01vZGUuRXJyb3I7XG4gICAgcmV0dXJuIG5ldyBUeXBlQ2hlY2tDb250ZXh0SW1wbChcbiAgICAgICAgdGhpcy5jb25maWcsIHRoaXMuY29tcGlsZXJIb3N0LCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLCBob3N0LCBpbmxpbmluZywgdGhpcy5wZXJmKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW55IHNoaW0gZGF0YSB0aGF0IGRlcGVuZHMgb24gaW5saW5lIG9wZXJhdGlvbnMgYXBwbGllZCB0byB0aGUgdHlwZS1jaGVja2luZyBwcm9ncmFtLlxuICAgKlxuICAgKiBUaGlzIGNhbiBiZSB1c2VmdWwgaWYgbmV3IGlubGluZXMgbmVlZCB0byBiZSBhcHBsaWVkLCBhbmQgaXQncyBub3QgcG9zc2libGUgdG8gZ3VhcmFudGVlIHRoYXRcbiAgICogdGhleSB3b24ndCBvdmVyd3JpdGUgb3IgY29ycnVwdCBleGlzdGluZyBpbmxpbmVzIHRoYXQgYXJlIHVzZWQgYnkgc3VjaCBzaGltcy5cbiAgICovXG4gIGNsZWFyQWxsU2hpbURhdGFVc2luZ0lubGluZXMoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBmaWxlRGF0YSBvZiB0aGlzLnN0YXRlLnZhbHVlcygpKSB7XG4gICAgICBpZiAoIWZpbGVEYXRhLmhhc0lubGluZXMpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3NoaW1GaWxlLCBzaGltRGF0YV0gb2YgZmlsZURhdGEuc2hpbURhdGEuZW50cmllcygpKSB7XG4gICAgICAgIGlmIChzaGltRGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICAgICAgZmlsZURhdGEuc2hpbURhdGEuZGVsZXRlKHNoaW1GaWxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmaWxlRGF0YS5oYXNJbmxpbmVzID0gZmFsc2U7XG4gICAgICBmaWxlRGF0YS5pc0NvbXBsZXRlID0gZmFsc2U7XG4gICAgICB0aGlzLmlzQ29tcGxldGUgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZUZyb21Db250ZXh0KGN0eDogVHlwZUNoZWNrQ29udGV4dEltcGwpOiB2b2lkIHtcbiAgICBjb25zdCB1cGRhdGVzID0gY3R4LmZpbmFsaXplKCk7XG4gICAgcmV0dXJuIHRoaXMucGVyZi5pblBoYXNlKFBlcmZQaGFzZS5UY2JVcGRhdGVQcm9ncmFtLCAoKSA9PiB7XG4gICAgICBpZiAodXBkYXRlcy5zaXplID4gMCkge1xuICAgICAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuVXBkYXRlVHlwZUNoZWNrUHJvZ3JhbSk7XG4gICAgICB9XG4gICAgICB0aGlzLnByb2dyYW1Ecml2ZXIudXBkYXRlRmlsZXModXBkYXRlcywgVXBkYXRlTW9kZS5JbmNyZW1lbnRhbCk7XG4gICAgICB0aGlzLnByaW9yQnVpbGQucmVjb3JkU3VjY2Vzc2Z1bFR5cGVDaGVjayh0aGlzLnN0YXRlKTtcbiAgICAgIHRoaXMucGVyZi5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuVHRjVXBkYXRlUHJvZ3JhbSk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRGaWxlRGF0YShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgICBpZiAoIXRoaXMuc3RhdGUuaGFzKHBhdGgpKSB7XG4gICAgICB0aGlzLnN0YXRlLnNldChwYXRoLCB7XG4gICAgICAgIGhhc0lubGluZXM6IGZhbHNlLFxuICAgICAgICBzb3VyY2VNYW5hZ2VyOiBuZXcgVGVtcGxhdGVTb3VyY2VNYW5hZ2VyKCksXG4gICAgICAgIGlzQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICBzaGltRGF0YTogbmV3IE1hcCgpLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXRlLmdldChwYXRoKSE7XG4gIH1cbiAgZ2V0U3ltYm9sT2ZOb2RlKG5vZGU6IFRtcGxBc3RUZW1wbGF0ZSwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVGVtcGxhdGVTeW1ib2x8bnVsbDtcbiAgZ2V0U3ltYm9sT2ZOb2RlKG5vZGU6IFRtcGxBc3RFbGVtZW50LCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBFbGVtZW50U3ltYm9sfG51bGw7XG4gIGdldFN5bWJvbE9mTm9kZShub2RlOiBBU1R8VG1wbEFzdE5vZGUsIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFN5bWJvbHxudWxsIHtcbiAgICBjb25zdCBidWlsZGVyID0gdGhpcy5nZXRPckNyZWF0ZVN5bWJvbEJ1aWxkZXIoY29tcG9uZW50KTtcbiAgICBpZiAoYnVpbGRlciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBlcmYuaW5QaGFzZShQZXJmUGhhc2UuVHRjU3ltYm9sLCAoKSA9PiBidWlsZGVyLmdldFN5bWJvbChub2RlKSk7XG4gIH1cblxuICBwcml2YXRlIGdldE9yQ3JlYXRlU3ltYm9sQnVpbGRlcihjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBTeW1ib2xCdWlsZGVyfG51bGwge1xuICAgIGlmICh0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuc3ltYm9sQnVpbGRlckNhY2hlLmdldChjb21wb25lbnQpITtcbiAgICB9XG5cbiAgICBjb25zdCB7dGNiLCBkYXRhLCBzaGltUGF0aH0gPSB0aGlzLmdldExhdGVzdENvbXBvbmVudFN0YXRlKGNvbXBvbmVudCk7XG4gICAgaWYgKHRjYiA9PT0gbnVsbCB8fCBkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBidWlsZGVyID0gbmV3IFN5bWJvbEJ1aWxkZXIoXG4gICAgICAgIHNoaW1QYXRoLCB0Y2IsIGRhdGEsIHRoaXMuY29tcG9uZW50U2NvcGVSZWFkZXIsXG4gICAgICAgICgpID0+IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgdGhpcy5zeW1ib2xCdWlsZGVyQ2FjaGUuc2V0KGNvbXBvbmVudCwgYnVpbGRlcik7XG4gICAgcmV0dXJuIGJ1aWxkZXI7XG4gIH1cblxuICBnZXREaXJlY3RpdmVzSW5TY29wZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBEaXJlY3RpdmVJblNjb3BlW118bnVsbCB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0U2NvcGVEYXRhKGNvbXBvbmVudCk7XG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YS5kaXJlY3RpdmVzO1xuICB9XG5cbiAgZ2V0UGlwZXNJblNjb3BlKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFBpcGVJblNjb3BlW118bnVsbCB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0U2NvcGVEYXRhKGNvbXBvbmVudCk7XG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YS5waXBlcztcbiAgfVxuXG4gIGdldERpcmVjdGl2ZU1ldGFkYXRhKGRpcjogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhfG51bGwge1xuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oZGlyKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnR5cGVDaGVja1Njb3BlUmVnaXN0cnkuZ2V0VHlwZUNoZWNrRGlyZWN0aXZlTWV0YWRhdGEobmV3IFJlZmVyZW5jZShkaXIpKTtcbiAgfVxuXG4gIGdldFBvdGVudGlhbEVsZW1lbnRUYWdzKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IE1hcDxzdHJpbmcsIERpcmVjdGl2ZUluU2NvcGV8bnVsbD4ge1xuICAgIGlmICh0aGlzLmVsZW1lbnRUYWdDYWNoZS5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuZWxlbWVudFRhZ0NhY2hlLmdldChjb21wb25lbnQpITtcbiAgICB9XG5cbiAgICBjb25zdCB0YWdNYXAgPSBuZXcgTWFwPHN0cmluZywgRGlyZWN0aXZlSW5TY29wZXxudWxsPigpO1xuXG4gICAgZm9yIChjb25zdCB0YWcgb2YgUkVHSVNUUlkuYWxsS25vd25FbGVtZW50TmFtZXMoKSkge1xuICAgICAgdGFnTWFwLnNldCh0YWcsIG51bGwpO1xuICAgIH1cblxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5nZXRTY29wZURhdGEoY29tcG9uZW50KTtcbiAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIHNjb3BlLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCBzZWxlY3RvciBvZiBDc3NTZWxlY3Rvci5wYXJzZShkaXJlY3RpdmUuc2VsZWN0b3IpKSB7XG4gICAgICAgICAgaWYgKHNlbGVjdG9yLmVsZW1lbnQgPT09IG51bGwgfHwgdGFnTWFwLmhhcyhzZWxlY3Rvci5lbGVtZW50KSkge1xuICAgICAgICAgICAgLy8gU2tpcCB0aGlzIGRpcmVjdGl2ZSBpZiBpdCBkb2Vzbid0IG1hdGNoIGFuIGVsZW1lbnQgdGFnLCBvciBpZiBhbm90aGVyIGRpcmVjdGl2ZSBoYXNcbiAgICAgICAgICAgIC8vIGFscmVhZHkgYmVlbiBpbmNsdWRlZCB3aXRoIHRoZSBzYW1lIGVsZW1lbnQgbmFtZS5cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRhZ01hcC5zZXQoc2VsZWN0b3IuZWxlbWVudCwgZGlyZWN0aXZlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZWxlbWVudFRhZ0NhY2hlLnNldChjb21wb25lbnQsIHRhZ01hcCk7XG4gICAgcmV0dXJuIHRhZ01hcDtcbiAgfVxuXG4gIGdldFBvdGVudGlhbERvbUJpbmRpbmdzKHRhZ05hbWU6IHN0cmluZyk6IHthdHRyaWJ1dGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZ31bXSB7XG4gICAgY29uc3QgYXR0cmlidXRlcyA9IFJFR0lTVFJZLmFsbEtub3duQXR0cmlidXRlc09mRWxlbWVudCh0YWdOYW1lKTtcbiAgICByZXR1cm4gYXR0cmlidXRlcy5tYXAoYXR0cmlidXRlID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBSRUdJU1RSWS5nZXRNYXBwZWRQcm9wTmFtZShhdHRyaWJ1dGUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gIH1cblxuICBwcml2YXRlIGdldFNjb3BlRGF0YShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBTY29wZURhdGF8bnVsbCB7XG4gICAgaWYgKHRoaXMuc2NvcGVDYWNoZS5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIHRoaXMuc2NvcGVDYWNoZS5nZXQoY29tcG9uZW50KSE7XG4gICAgfVxuXG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjb21wb25lbnQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBjb21wb25lbnRzIG11c3QgaGF2ZSBuYW1lc2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5jb21wb25lbnRTY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChjb21wb25lbnQpO1xuICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YTogU2NvcGVEYXRhID0ge1xuICAgICAgZGlyZWN0aXZlczogW10sXG4gICAgICBwaXBlczogW10sXG4gICAgICBpc1BvaXNvbmVkOiBzY29wZS5jb21waWxhdGlvbi5pc1BvaXNvbmVkLFxuICAgIH07XG5cbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCkuZ2V0VHlwZUNoZWNrZXIoKTtcbiAgICBmb3IgKGNvbnN0IGRpciBvZiBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzKSB7XG4gICAgICBpZiAoZGlyLnNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICAgIC8vIFNraXAgdGhpcyBkaXJlY3RpdmUsIGl0IGNhbid0IGJlIGFkZGVkIHRvIGEgdGVtcGxhdGUgYW55d2F5LlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRzU3ltYm9sID0gdHlwZUNoZWNrZXIuZ2V0U3ltYm9sQXRMb2NhdGlvbihkaXIucmVmLm5vZGUubmFtZSk7XG4gICAgICBpZiAoIWlzU3ltYm9sV2l0aFZhbHVlRGVjbGFyYXRpb24odHNTeW1ib2wpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsZXQgbmdNb2R1bGU6IENsYXNzRGVjbGFyYXRpb258bnVsbCA9IG51bGw7XG4gICAgICBjb25zdCBtb2R1bGVTY29wZU9mRGlyID0gdGhpcy5jb21wb25lbnRTY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChkaXIucmVmLm5vZGUpO1xuICAgICAgaWYgKG1vZHVsZVNjb3BlT2ZEaXIgIT09IG51bGwpIHtcbiAgICAgICAgbmdNb2R1bGUgPSBtb2R1bGVTY29wZU9mRGlyLm5nTW9kdWxlO1xuICAgICAgfVxuXG4gICAgICBkYXRhLmRpcmVjdGl2ZXMucHVzaCh7XG4gICAgICAgIGlzQ29tcG9uZW50OiBkaXIuaXNDb21wb25lbnQsXG4gICAgICAgIGlzU3RydWN0dXJhbDogZGlyLmlzU3RydWN0dXJhbCxcbiAgICAgICAgc2VsZWN0b3I6IGRpci5zZWxlY3RvcixcbiAgICAgICAgdHNTeW1ib2wsXG4gICAgICAgIG5nTW9kdWxlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBwaXBlIG9mIHNjb3BlLmNvbXBpbGF0aW9uLnBpcGVzKSB7XG4gICAgICBjb25zdCB0c1N5bWJvbCA9IHR5cGVDaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24ocGlwZS5yZWYubm9kZS5uYW1lKTtcbiAgICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZGF0YS5waXBlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogcGlwZS5uYW1lLFxuICAgICAgICB0c1N5bWJvbCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuc2NvcGVDYWNoZS5zZXQoY29tcG9uZW50LCBkYXRhKTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0RGlhZ25vc3RpYyhcbiAgICBkaWFnOiB0cy5EaWFnbm9zdGljLCBzb3VyY2VSZXNvbHZlcjogVGVtcGxhdGVTb3VyY2VSZXNvbHZlcik6IFRlbXBsYXRlRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKCFzaG91bGRSZXBvcnREaWFnbm9zdGljKGRpYWcpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHRyYW5zbGF0ZURpYWdub3N0aWMoZGlhZywgc291cmNlUmVzb2x2ZXIpO1xufVxuXG4vKipcbiAqIERhdGEgZm9yIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgcmVsYXRlZCB0byBhIHNwZWNpZmljIGlucHV0IGZpbGUgaW4gdGhlIHVzZXIncyBwcm9ncmFtICh3aGljaFxuICogY29udGFpbnMgY29tcG9uZW50cyB0byBiZSBjaGVja2VkKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSB0eXBlLWNoZWNraW5nIHNoaW0gcmVxdWlyZWQgYW55IGlubGluZSBjaGFuZ2VzIHRvIHRoZSBvcmlnaW5hbCBmaWxlLCB3aGljaCBhZmZlY3RzXG4gICAqIHdoZXRoZXIgdGhlIHNoaW0gY2FuIGJlIHJldXNlZC5cbiAgICovXG4gIGhhc0lubGluZXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFNvdXJjZSBtYXBwaW5nIGluZm9ybWF0aW9uIGZvciBtYXBwaW5nIGRpYWdub3N0aWNzIGZyb20gaW5saW5lZCB0eXBlIGNoZWNrIGJsb2NrcyBiYWNrIHRvIHRoZVxuICAgKiBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAgICovXG4gIHNvdXJjZU1hbmFnZXI6IFRlbXBsYXRlU291cmNlTWFuYWdlcjtcblxuICAvKipcbiAgICogRGF0YSBmb3IgZWFjaCBzaGltIGdlbmVyYXRlZCBmcm9tIHRoaXMgaW5wdXQgZmlsZS5cbiAgICpcbiAgICogQSBzaW5nbGUgaW5wdXQgZmlsZSB3aWxsIGdlbmVyYXRlIG9uZSBvciBtb3JlIHNoaW0gZmlsZXMgdGhhdCBhY3R1YWxseSBjb250YWluIHRlbXBsYXRlXG4gICAqIHR5cGUtY2hlY2tpbmcgY29kZS5cbiAgICovXG4gIHNoaW1EYXRhOiBNYXA8QWJzb2x1dGVGc1BhdGgsIFNoaW1UeXBlQ2hlY2tpbmdEYXRhPjtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2VyIGlzIGNlcnRhaW4gdGhhdCBhbGwgY29tcG9uZW50cyBmcm9tIHRoaXMgaW5wdXQgZmlsZSBoYXZlIGhhZFxuICAgKiB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdGVkIGludG8gc2hpbXMuXG4gICAqL1xuICBpc0NvbXBsZXRlOiBib29sZWFuO1xufVxuXG4vKipcbiAqIERyaXZlcyBhIGBUeXBlQ2hlY2tDb250ZXh0YCB0byBnZW5lcmF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZm9yIGV2ZXJ5IGNvbXBvbmVudCBpbiB0aGUgcHJvZ3JhbS5cbiAqL1xuY2xhc3MgV2hvbGVQcm9ncmFtVHlwZUNoZWNraW5nSG9zdCBpbXBsZW1lbnRzIFR5cGVDaGVja2luZ0hvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGltcGw6IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsKSB7fVxuXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlciB7XG4gICAgcmV0dXJuIHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpLnNvdXJjZU1hbmFnZXI7XG4gIH1cblxuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgY29uc3Qgc2hpbVBhdGggPSBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLnNoaW1Gb3Ioc2ZQYXRoKTtcbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgIC8vIFRoZSBjb21wb25lbnQgbmVlZHMgdG8gYmUgY2hlY2tlZCB1bmxlc3MgdGhlIHNoaW0gd2hpY2ggd291bGQgY29udGFpbiBpdCBhbHJlYWR5IGV4aXN0cy5cbiAgICByZXR1cm4gIWZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCk7XG4gIH1cblxuICByZWNvcmRTaGltRGF0YShzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBkYXRhOiBTaGltVHlwZUNoZWNraW5nRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5pbXBsLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgZmlsZURhdGEuc2hpbURhdGEuc2V0KGRhdGEucGF0aCwgZGF0YSk7XG4gICAgaWYgKGRhdGEuaGFzSW5saW5lcykge1xuICAgICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkQ29tcGxldGUoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpLmlzQ29tcGxldGUgPSB0cnVlO1xuICB9XG59XG5cbi8qKlxuICogRHJpdmVzIGEgYFR5cGVDaGVja0NvbnRleHRgIHRvIGdlbmVyYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBlZmZpY2llbnRseSBmb3IgYSBzaW5nbGUgaW5wdXQgZmlsZS5cbiAqL1xuY2xhc3MgU2luZ2xlRmlsZVR5cGVDaGVja2luZ0hvc3QgaW1wbGVtZW50cyBUeXBlQ2hlY2tpbmdIb3N0IHtcbiAgcHJpdmF0ZSBzZWVuSW5saW5lcyA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIHByb3RlY3RlZCBmaWxlRGF0YTogRmlsZVR5cGVDaGVja2luZ0RhdGEsXG4gICAgICBwcm90ZWN0ZWQgaW1wbDogVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwpIHt9XG5cbiAgcHJpdmF0ZSBhc3NlcnRQYXRoKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZlBhdGggIT09IHNmUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogcXVlcnlpbmcgVHlwZUNoZWNraW5nSG9zdCBvdXRzaWRlIG9mIGFzc2lnbmVkIGZpbGVgKTtcbiAgICB9XG4gIH1cblxuICBnZXRTb3VyY2VNYW5hZ2VyKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXIge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuICAgIHJldHVybiB0aGlzLmZpbGVEYXRhLnNvdXJjZU1hbmFnZXI7XG4gIH1cblxuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuc2ZQYXRoICE9PSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG5vZGUuZ2V0U291cmNlRmlsZSgpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBzaGltUGF0aCA9IFR5cGVDaGVja1NoaW1HZW5lcmF0b3Iuc2hpbUZvcih0aGlzLnNmUGF0aCk7XG5cbiAgICAvLyBPbmx5IG5lZWQgdG8gZ2VuZXJhdGUgYSBUQ0IgZm9yIHRoZSBjbGFzcyBpZiBubyBzaGltIGV4aXN0cyBmb3IgaXQgY3VycmVudGx5LlxuICAgIHJldHVybiAhdGhpcy5maWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpO1xuICB9XG5cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydFBhdGgoc2ZQYXRoKTtcblxuICAgIC8vIFByZXZpb3VzIHR5cGUtY2hlY2tpbmcgc3RhdGUgbWF5IGhhdmUgcmVxdWlyZWQgdGhlIHVzZSBvZiBpbmxpbmVzIChhc3N1bWluZyB0aGV5IHdlcmVcbiAgICAvLyBzdXBwb3J0ZWQpLiBJZiB0aGUgY3VycmVudCBvcGVyYXRpb24gYWxzbyByZXF1aXJlcyBpbmxpbmVzLCB0aGlzIHByZXNlbnRzIGEgcHJvYmxlbTpcbiAgICAvLyBnZW5lcmF0aW5nIG5ldyBpbmxpbmVzIG1heSBpbnZhbGlkYXRlIGFueSBvbGQgaW5saW5lcyB0aGF0IG9sZCBzdGF0ZSBkZXBlbmRzIG9uLlxuICAgIC8vXG4gICAgLy8gUmF0aGVyIHRoYW4gcmVzb2x2ZSB0aGlzIGlzc3VlIGJ5IHRyYWNraW5nIHNwZWNpZmljIGRlcGVuZGVuY2llcyBvbiBpbmxpbmVzLCBpZiB0aGUgbmV3IHN0YXRlXG4gICAgLy8gcmVsaWVzIG9uIGlubGluZXMsIGFueSBvbGQgc3RhdGUgdGhhdCByZWxpZWQgb24gdGhlbSBpcyBzaW1wbHkgY2xlYXJlZC4gVGhpcyBoYXBwZW5zIHdoZW4gdGhlXG4gICAgLy8gZmlyc3QgbmV3IHN0YXRlIHRoYXQgdXNlcyBpbmxpbmVzIGlzIGVuY291bnRlcmVkLlxuICAgIGlmIChkYXRhLmhhc0lubGluZXMgJiYgIXRoaXMuc2VlbklubGluZXMpIHtcbiAgICAgIHRoaXMuaW1wbC5jbGVhckFsbFNoaW1EYXRhVXNpbmdJbmxpbmVzKCk7XG4gICAgICB0aGlzLnNlZW5JbmxpbmVzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLmZpbGVEYXRhLnNoaW1EYXRhLnNldChkYXRhLnBhdGgsIGRhdGEpO1xuICAgIGlmIChkYXRhLmhhc0lubGluZXMpIHtcbiAgICAgIHRoaXMuZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkQ29tcGxldGUoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuICAgIHRoaXMuZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG4gIH1cbn1cblxuLyoqXG4gKiBEcml2ZXMgYSBgVHlwZUNoZWNrQ29udGV4dGAgdG8gZ2VuZXJhdGUgdHlwZS1jaGVja2luZyBjb2RlIGVmZmljaWVudGx5IGZvciBvbmx5IHRob3NlIGNvbXBvbmVudHNcbiAqIHdoaWNoIG1hcCB0byBhIHNpbmdsZSBzaGltIG9mIGEgc2luZ2xlIGlucHV0IGZpbGUuXG4gKi9cbmNsYXNzIFNpbmdsZVNoaW1UeXBlQ2hlY2tpbmdIb3N0IGV4dGVuZHMgU2luZ2xlRmlsZVR5cGVDaGVja2luZ0hvc3Qge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGZpbGVEYXRhOiBGaWxlVHlwZUNoZWNraW5nRGF0YSwgaW1wbDogVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwsXG4gICAgICBwcml2YXRlIHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHN1cGVyKHNmUGF0aCwgZmlsZURhdGEsIGltcGwpO1xuICB9XG5cbiAgc2hvdWxkQ2hlY2tOb2RlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5zZlBhdGggIT09IGFic29sdXRlRnJvbVNvdXJjZUZpbGUobm9kZS5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT25seSBnZW5lcmF0ZSBhIFRDQiBmb3IgdGhlIGNvbXBvbmVudCBpZiBpdCBtYXBzIHRvIHRoZSByZXF1ZXN0ZWQgc2hpbSBmaWxlLlxuICAgIGNvbnN0IHNoaW1QYXRoID0gVHlwZUNoZWNrU2hpbUdlbmVyYXRvci5zaGltRm9yKHRoaXMuc2ZQYXRoKTtcbiAgICBpZiAoc2hpbVBhdGggIT09IHRoaXMuc2hpbVBhdGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IG5lZWQgdG8gZ2VuZXJhdGUgYSBUQ0IgZm9yIHRoZSBjbGFzcyBpZiBubyBzaGltIGV4aXN0cyBmb3IgaXQgY3VycmVudGx5LlxuICAgIHJldHVybiAhdGhpcy5maWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpO1xuICB9XG59XG5cbi8qKlxuICogQ2FjaGVkIHNjb3BlIGluZm9ybWF0aW9uIGZvciBhIGNvbXBvbmVudC5cbiAqL1xuaW50ZXJmYWNlIFNjb3BlRGF0YSB7XG4gIGRpcmVjdGl2ZXM6IERpcmVjdGl2ZUluU2NvcGVbXTtcbiAgcGlwZXM6IFBpcGVJblNjb3BlW107XG4gIGlzUG9pc29uZWQ6IGJvb2xlYW47XG59XG4iXX0=