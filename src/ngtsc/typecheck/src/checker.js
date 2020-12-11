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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/checker", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/completion", "@angular/compiler-cli/src/ngtsc/typecheck/src/context", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/source", "@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util", "@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TemplateTypeCheckerImpl = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var completion_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/completion");
    var context_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/context");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    var source_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/source");
    var tcb_util_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/tcb_util");
    var template_symbol_builder_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder");
    /**
     * Primary template type-checking engine, which performs type-checking using a
     * `TypeCheckingProgramStrategy` for type-checking program maintenance, and the
     * `ProgramTypeCheckAdapter` for generation of template type-checking code.
     */
    var TemplateTypeCheckerImpl = /** @class */ (function () {
        function TemplateTypeCheckerImpl(originalProgram, typeCheckingStrategy, typeCheckAdapter, config, refEmitter, reflector, compilerHost, priorBuild, componentScopeReader) {
            this.originalProgram = originalProgram;
            this.typeCheckingStrategy = typeCheckingStrategy;
            this.typeCheckAdapter = typeCheckAdapter;
            this.config = config;
            this.refEmitter = refEmitter;
            this.reflector = reflector;
            this.compilerHost = compilerHost;
            this.priorBuild = priorBuild;
            this.componentScopeReader = componentScopeReader;
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
             * Unlike the other caches, the scope of a component is not affected by its template, so this
             * cache does not need to be invalidate if the template is overridden. It will be destroyed when
             * the `ts.Program` changes and the `TemplateTypeCheckerImpl` as a whole is destroyed and
             * replaced.
             */
            this.scopeCache = new Map();
            this.isComplete = false;
        }
        TemplateTypeCheckerImpl.prototype.resetOverrides = function () {
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(this.state.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var fileRecord = _c.value;
                    if (fileRecord.templateOverrides !== null) {
                        fileRecord.templateOverrides = null;
                        fileRecord.shimData.clear();
                        fileRecord.isComplete = false;
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
            // Ideally only those components with overridden templates would have their caches invalidated,
            // but the `TemplateTypeCheckerImpl` does not track the class for components with overrides. As
            // a quick workaround, clear the entire cache instead.
            this.completionCache.clear();
            this.symbolBuilderCache.clear();
        };
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
            var shimPath = this.typeCheckingStrategy.shimPathForComponent(component);
            var fileRecord = this.getFileData(sfPath);
            if (!fileRecord.shimData.has(shimPath)) {
                return { data: null, tcb: null, shimPath: shimPath };
            }
            var templateId = fileRecord.sourceManager.getTemplateId(component);
            var shimRecord = fileRecord.shimData.get(shimPath);
            var id = fileRecord.sourceManager.getTemplateId(component);
            var program = this.typeCheckingStrategy.getProgram();
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
        TemplateTypeCheckerImpl.prototype.overrideComponentTemplate = function (component, template) {
            var _a = compiler_1.parseTemplate(template, 'override.html', {
                preserveWhitespaces: true,
                leadingTriviaChars: [],
            }), nodes = _a.nodes, errors = _a.errors;
            var filePath = file_system_1.absoluteFromSourceFile(component.getSourceFile());
            var fileRecord = this.getFileData(filePath);
            var id = fileRecord.sourceManager.getTemplateId(component);
            if (fileRecord.templateOverrides === null) {
                fileRecord.templateOverrides = new Map();
            }
            fileRecord.templateOverrides.set(id, nodes);
            // Clear data for the shim in question, so it'll be regenerated on the next request.
            var shimFile = this.typeCheckingStrategy.shimPathForComponent(component);
            fileRecord.shimData.delete(shimFile);
            fileRecord.isComplete = false;
            this.isComplete = false;
            // Overriding a component's template invalidates its cached results.
            this.completionCache.delete(component);
            this.symbolBuilderCache.delete(component);
            return { nodes: nodes, errors: errors };
        };
        TemplateTypeCheckerImpl.prototype.isTrackedTypeCheckFile = function (filePath) {
            return this.getFileAndShimRecordsForPath(filePath) !== null;
        };
        TemplateTypeCheckerImpl.prototype.getFileAndShimRecordsForPath = function (shimPath) {
            var e_2, _a;
            try {
                for (var _b = tslib_1.__values(this.state.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var fileRecord = _c.value;
                    if (fileRecord.shimData.has(shimPath)) {
                        return { fileRecord: fileRecord, shimRecord: fileRecord.shimData.get(shimPath) };
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
            return null;
        };
        TemplateTypeCheckerImpl.prototype.getTemplateMappingAtShimLocation = function (_a) {
            var shimPath = _a.shimPath, positionInShimFile = _a.positionInShimFile;
            var records = this.getFileAndShimRecordsForPath(file_system_1.absoluteFrom(shimPath));
            if (records === null) {
                return null;
            }
            var fileRecord = records.fileRecord;
            var shimSf = this.typeCheckingStrategy.getProgram().getSourceFile(file_system_1.absoluteFrom(shimPath));
            if (shimSf === undefined) {
                return null;
            }
            return tcb_util_1.getTemplateMapping(shimSf, positionInShimFile, fileRecord.sourceManager, /*isDiagnosticsRequest*/ false);
        };
        TemplateTypeCheckerImpl.prototype.generateAllTypeCheckBlocks = function () {
            this.ensureAllShimsForAllFiles();
        };
        /**
         * Retrieve type-checking diagnostics from the given `ts.SourceFile` using the most recent
         * type-checking program.
         */
        TemplateTypeCheckerImpl.prototype.getDiagnosticsForFile = function (sf, optimizeFor) {
            var e_3, _a;
            switch (optimizeFor) {
                case api_1.OptimizeFor.WholeProgram:
                    this.ensureAllShimsForAllFiles();
                    break;
                case api_1.OptimizeFor.SingleFile:
                    this.ensureAllShimsForOneFile(sf);
                    break;
            }
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var fileRecord = this.state.get(sfPath);
            var typeCheckProgram = this.typeCheckingStrategy.getProgram();
            var diagnostics = [];
            if (fileRecord.hasInlines) {
                var inlineSf = file_system_1.getSourceFileOrError(typeCheckProgram, sfPath);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })));
            }
            try {
                for (var _b = tslib_1.__values(fileRecord.shimData), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_1.__read(_c.value, 2), shimPath = _d[0], shimRecord = _d[1];
                    var shimSf = file_system_1.getSourceFileOrError(typeCheckProgram, shimPath);
                    diagnostics.push.apply(diagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })));
                    diagnostics.push.apply(diagnostics, tslib_1.__spread(shimRecord.genesisDiagnostics));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return diagnostics.filter(function (diag) { return diag !== null; });
        };
        TemplateTypeCheckerImpl.prototype.getDiagnosticsForComponent = function (component) {
            this.ensureShimForComponent(component);
            var sf = component.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var shimPath = this.typeCheckingStrategy.shimPathForComponent(component);
            var fileRecord = this.getFileData(sfPath);
            if (!fileRecord.shimData.has(shimPath)) {
                return [];
            }
            var templateId = fileRecord.sourceManager.getTemplateId(component);
            var shimRecord = fileRecord.shimData.get(shimPath);
            var typeCheckProgram = this.typeCheckingStrategy.getProgram();
            var diagnostics = [];
            if (shimRecord.hasInlines) {
                var inlineSf = file_system_1.getSourceFileOrError(typeCheckProgram, sfPath);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(inlineSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })));
            }
            var shimSf = file_system_1.getSourceFileOrError(typeCheckProgram, shimPath);
            diagnostics.push.apply(diagnostics, tslib_1.__spread(typeCheckProgram.getSemanticDiagnostics(shimSf).map(function (diag) { return convertDiagnostic(diag, fileRecord.sourceManager); })));
            diagnostics.push.apply(diagnostics, tslib_1.__spread(shimRecord.genesisDiagnostics));
            return diagnostics.filter(function (diag) {
                return diag !== null && diag.templateId === templateId;
            });
        };
        TemplateTypeCheckerImpl.prototype.getTypeCheckBlock = function (component) {
            return this.getLatestComponentState(component).tcb;
        };
        TemplateTypeCheckerImpl.prototype.getGlobalCompletions = function (context, component) {
            var engine = this.getOrCreateCompletionEngine(component);
            if (engine === null) {
                return null;
            }
            return engine.getGlobalCompletions(context);
        };
        TemplateTypeCheckerImpl.prototype.getExpressionCompletionLocation = function (ast, component) {
            var engine = this.getOrCreateCompletionEngine(component);
            if (engine === null) {
                return null;
            }
            return engine.getExpressionCompletionLocation(ast);
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
                if (existingResults.templateOverrides !== null) {
                    // Cannot adopt prior results if template overrides have been requested.
                    return;
                }
                if (existingResults.isComplete) {
                    // All data for this file has already been generated, so no need to adopt anything.
                    return;
                }
            }
            var previousResults = this.priorBuild.priorTypeCheckingResultsFor(sf);
            if (previousResults === null || !previousResults.isComplete ||
                previousResults.templateOverrides !== null) {
                return;
            }
            this.state.set(sfPath, previousResults);
        };
        TemplateTypeCheckerImpl.prototype.ensureAllShimsForAllFiles = function () {
            var e_4, _a;
            if (this.isComplete) {
                return;
            }
            var host = new WholeProgramTypeCheckingHost(this);
            var ctx = this.newContext(host);
            try {
                for (var _b = tslib_1.__values(this.originalProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    if (sf.isDeclarationFile || shims_1.isShim(sf)) {
                        continue;
                    }
                    this.maybeAdoptPriorResultsForFile(sf);
                    var sfPath = file_system_1.absoluteFromSourceFile(sf);
                    var fileData = this.getFileData(sfPath);
                    if (fileData.isComplete) {
                        continue;
                    }
                    this.typeCheckAdapter.typeCheck(sf, ctx);
                    fileData.isComplete = true;
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            this.updateFromContext(ctx);
            this.isComplete = true;
        };
        TemplateTypeCheckerImpl.prototype.ensureAllShimsForOneFile = function (sf) {
            this.maybeAdoptPriorResultsForFile(sf);
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            var fileData = this.getFileData(sfPath);
            if (fileData.isComplete) {
                // All data for this file is present and accounted for already.
                return;
            }
            var host = new SingleFileTypeCheckingHost(sfPath, fileData, this.typeCheckingStrategy, this);
            var ctx = this.newContext(host);
            this.typeCheckAdapter.typeCheck(sf, ctx);
            fileData.isComplete = true;
            this.updateFromContext(ctx);
        };
        TemplateTypeCheckerImpl.prototype.ensureShimForComponent = function (component) {
            var sf = component.getSourceFile();
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            this.maybeAdoptPriorResultsForFile(sf);
            var fileData = this.getFileData(sfPath);
            var shimPath = this.typeCheckingStrategy.shimPathForComponent(component);
            if (fileData.shimData.has(shimPath)) {
                // All data for this component is available.
                return;
            }
            var host = new SingleShimTypeCheckingHost(sfPath, fileData, this.typeCheckingStrategy, this, shimPath);
            var ctx = this.newContext(host);
            this.typeCheckAdapter.typeCheck(sf, ctx);
            this.updateFromContext(ctx);
        };
        TemplateTypeCheckerImpl.prototype.newContext = function (host) {
            var inlining = this.typeCheckingStrategy.supportsInlineOperations ? context_1.InliningMode.InlineOps :
                context_1.InliningMode.Error;
            return new context_1.TypeCheckContextImpl(this.config, this.compilerHost, this.typeCheckingStrategy, this.refEmitter, this.reflector, host, inlining);
        };
        /**
         * Remove any shim data that depends on inline operations applied to the type-checking program.
         *
         * This can be useful if new inlines need to be applied, and it's not possible to guarantee that
         * they won't overwrite or corrupt existing inlines that are used by such shims.
         */
        TemplateTypeCheckerImpl.prototype.clearAllShimDataUsingInlines = function () {
            var e_5, _a, e_6, _b;
            try {
                for (var _c = tslib_1.__values(this.state.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var fileData = _d.value;
                    if (!fileData.hasInlines) {
                        continue;
                    }
                    try {
                        for (var _e = (e_6 = void 0, tslib_1.__values(fileData.shimData.entries())), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var _g = tslib_1.__read(_f.value, 2), shimFile = _g[0], shimData = _g[1];
                            if (shimData.hasInlines) {
                                fileData.shimData.delete(shimFile);
                            }
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                    fileData.hasInlines = false;
                    fileData.isComplete = false;
                    this.isComplete = false;
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_5) throw e_5.error; }
            }
        };
        TemplateTypeCheckerImpl.prototype.updateFromContext = function (ctx) {
            var updates = ctx.finalize();
            this.typeCheckingStrategy.updateFiles(updates, api_1.UpdateMode.Incremental);
            this.priorBuild.recordSuccessfulTypeCheck(this.state);
        };
        TemplateTypeCheckerImpl.prototype.getFileData = function (path) {
            if (!this.state.has(path)) {
                this.state.set(path, {
                    hasInlines: false,
                    templateOverrides: null,
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
            return builder.getSymbol(node);
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
            var builder = new template_symbol_builder_1.SymbolBuilder(shimPath, tcb, data, this.componentScopeReader, function () { return _this.typeCheckingStrategy.getProgram().getTypeChecker(); });
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
        TemplateTypeCheckerImpl.prototype.getScopeData = function (component) {
            var e_7, _a, e_8, _b;
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
            var typeChecker = this.typeCheckingStrategy.getProgram().getTypeChecker();
            try {
                for (var _c = tslib_1.__values(scope.exported.directives), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var dir = _d.value;
                    if (dir.selector === null) {
                        // Skip this directive, it can't be added to a template anyway.
                        continue;
                    }
                    var tsSymbol = typeChecker.getSymbolAtLocation(dir.ref.node.name);
                    if (tsSymbol === undefined) {
                        continue;
                    }
                    data.directives.push({
                        isComponent: dir.isComponent,
                        selector: dir.selector,
                        tsSymbol: tsSymbol,
                    });
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_7) throw e_7.error; }
            }
            try {
                for (var _e = tslib_1.__values(scope.exported.pipes), _f = _e.next(); !_f.done; _f = _e.next()) {
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
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_8) throw e_8.error; }
            }
            this.scopeCache.set(component, data);
            return data;
        };
        return TemplateTypeCheckerImpl;
    }());
    exports.TemplateTypeCheckerImpl = TemplateTypeCheckerImpl;
    function convertDiagnostic(diag, sourceResolver) {
        if (!diagnostics_1.shouldReportDiagnostic(diag)) {
            return null;
        }
        return diagnostics_1.translateDiagnostic(diag, sourceResolver);
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
            var fileData = this.impl.getFileData(file_system_1.absoluteFromSourceFile(node.getSourceFile()));
            var shimPath = this.impl.typeCheckingStrategy.shimPathForComponent(node);
            // The component needs to be checked unless the shim which would contain it already exists.
            return !fileData.shimData.has(shimPath);
        };
        WholeProgramTypeCheckingHost.prototype.getTemplateOverride = function (sfPath, node) {
            var fileData = this.impl.getFileData(sfPath);
            if (fileData.templateOverrides === null) {
                return null;
            }
            var templateId = fileData.sourceManager.getTemplateId(node);
            if (fileData.templateOverrides.has(templateId)) {
                return fileData.templateOverrides.get(templateId);
            }
            return null;
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
        function SingleFileTypeCheckingHost(sfPath, fileData, strategy, impl) {
            this.sfPath = sfPath;
            this.fileData = fileData;
            this.strategy = strategy;
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
            var shimPath = this.strategy.shimPathForComponent(node);
            // Only need to generate a TCB for the class if no shim exists for it currently.
            return !this.fileData.shimData.has(shimPath);
        };
        SingleFileTypeCheckingHost.prototype.getTemplateOverride = function (sfPath, node) {
            this.assertPath(sfPath);
            if (this.fileData.templateOverrides === null) {
                return null;
            }
            var templateId = this.fileData.sourceManager.getTemplateId(node);
            if (this.fileData.templateOverrides.has(templateId)) {
                return this.fileData.templateOverrides.get(templateId);
            }
            return null;
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
        function SingleShimTypeCheckingHost(sfPath, fileData, strategy, impl, shimPath) {
            var _this = _super.call(this, sfPath, fileData, strategy, impl) || this;
            _this.shimPath = shimPath;
            return _this;
        }
        SingleShimTypeCheckingHost.prototype.shouldCheckNode = function (node) {
            if (this.sfPath !== file_system_1.absoluteFromSourceFile(node.getSourceFile())) {
                return false;
            }
            // Only generate a TCB for the component if it maps to the requested shim file.
            var shimPath = this.strategy.shimPathForComponent(node);
            if (shimPath !== this.shimPath) {
                return false;
            }
            // Only need to generate a TCB for the class if no shim exists for it currently.
            return !this.fileData.shimData.has(shimPath);
        };
        return SingleShimTypeCheckingHost;
    }(SingleFileTypeCheckingHost));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBMko7SUFHM0osMkVBQTZHO0lBRzdHLHlFQUF5RTtJQUV6RSwrREFBbUM7SUFDbkMsa0ZBQThEO0lBQzlELHFFQUFzUDtJQUd0UCx1RkFBOEM7SUFDOUMsaUZBQW1IO0lBQ25ILHlGQUEwRTtJQUMxRSwrRUFBK0M7SUFDL0MsbUZBQTBGO0lBQzFGLGlIQUF3RDtJQUV4RDs7OztPQUlHO0lBQ0g7UUFnQ0UsaUNBQ1ksZUFBMkIsRUFDMUIsb0JBQWlELEVBQ2xELGdCQUF5QyxFQUFVLE1BQTBCLEVBQzdFLFVBQTRCLEVBQVUsU0FBeUIsRUFDL0QsWUFBMkQsRUFDM0QsVUFBMkQsRUFDbEQsb0JBQTBDO1lBTm5ELG9CQUFlLEdBQWYsZUFBZSxDQUFZO1lBQzFCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBNkI7WUFDbEQscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF5QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW9CO1lBQzdFLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDL0QsaUJBQVksR0FBWixZQUFZLENBQStDO1lBQzNELGVBQVUsR0FBVixVQUFVLENBQWlEO1lBQ2xELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7WUF0Q3ZELFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBd0MsQ0FBQztZQUVoRTs7Ozs7O2VBTUc7WUFDSyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUF5QyxDQUFDO1lBQzNFOzs7Ozs7ZUFNRztZQUNLLHVCQUFrQixHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1lBRTNFOzs7Ozs7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LFFBQVEsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFDSCxpQ0FBQztJQUFELENBQUMsQUFyQkQsQ0FBeUMsMEJBQTBCLEdBcUJsRSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgTWV0aG9kQ2FsbCwgUGFyc2VFcnJvciwgcGFyc2VUZW1wbGF0ZSwgUHJvcGVydHlSZWFkLCBTYWZlTWV0aG9kQ2FsbCwgU2FmZVByb3BlcnR5UmVhZCwgVG1wbEFzdE5vZGUsIFRtcGxBc3RUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aCwgZ2V0U291cmNlRmlsZU9yRXJyb3J9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGR9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge2lzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyfSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge2lzU2hpbX0gZnJvbSAnLi4vLi4vc2hpbXMnO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlT3JOdWxsfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7RGlyZWN0aXZlSW5TY29wZSwgRnVsbFRlbXBsYXRlTWFwcGluZywgR2xvYmFsQ29tcGxldGlvbiwgT3B0aW1pemVGb3IsIFBpcGVJblNjb3BlLCBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlciwgU2hpbUxvY2F0aW9uLCBTeW1ib2wsIFRlbXBsYXRlSWQsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2luZ0NvbmZpZywgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LCBVcGRhdGVNb2RlfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHtUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4uL2RpYWdub3N0aWNzJztcblxuaW1wb3J0IHtDb21wbGV0aW9uRW5naW5lfSBmcm9tICcuL2NvbXBsZXRpb24nO1xuaW1wb3J0IHtJbmxpbmluZ01vZGUsIFNoaW1UeXBlQ2hlY2tpbmdEYXRhLCBUZW1wbGF0ZURhdGEsIFR5cGVDaGVja0NvbnRleHRJbXBsLCBUeXBlQ2hlY2tpbmdIb3N0fSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHtzaG91bGRSZXBvcnREaWFnbm9zdGljLCB0cmFuc2xhdGVEaWFnbm9zdGljfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYW5hZ2VyfSBmcm9tICcuL3NvdXJjZSc7XG5pbXBvcnQge2ZpbmRUeXBlQ2hlY2tCbG9jaywgZ2V0VGVtcGxhdGVNYXBwaW5nLCBUZW1wbGF0ZVNvdXJjZVJlc29sdmVyfSBmcm9tICcuL3RjYl91dGlsJztcbmltcG9ydCB7U3ltYm9sQnVpbGRlcn0gZnJvbSAnLi90ZW1wbGF0ZV9zeW1ib2xfYnVpbGRlcic7XG5cbi8qKlxuICogUHJpbWFyeSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGVuZ2luZSwgd2hpY2ggcGVyZm9ybXMgdHlwZS1jaGVja2luZyB1c2luZyBhXG4gKiBgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5YCBmb3IgdHlwZS1jaGVja2luZyBwcm9ncmFtIG1haW50ZW5hbmNlLCBhbmQgdGhlXG4gKiBgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXJgIGZvciBnZW5lcmF0aW9uIG9mIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgY29kZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsIGltcGxlbWVudHMgVGVtcGxhdGVUeXBlQ2hlY2tlciB7XG4gIHByaXZhdGUgc3RhdGUgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBGaWxlVHlwZUNoZWNraW5nRGF0YT4oKTtcblxuICAvKipcbiAgICogU3RvcmVzIHRoZSBgQ29tcGxldGlvbkVuZ2luZWAgd2hpY2ggcG93ZXJzIGF1dG9jb21wbGV0aW9uIGZvciBlYWNoIGNvbXBvbmVudCBjbGFzcy5cbiAgICpcbiAgICogTXVzdCBiZSBpbnZhbGlkYXRlZCB3aGVuZXZlciB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgb3IgdGhlIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzLiBJbnZhbGlkYXRpb25cbiAgICogb24gdGVtcGxhdGUgY2hhbmdlcyBpcyBwZXJmb3JtZWQgd2l0aGluIHRoaXMgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBpbnN0YW5jZS4gV2hlbiB0aGVcbiAgICogYHRzLlByb2dyYW1gIGNoYW5nZXMsIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGFzIGEgd2hvbGUgaXMgZGVzdHJveWVkIGFuZCByZXBsYWNlZC5cbiAgICovXG4gIHByaXZhdGUgY29tcGxldGlvbkNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBDb21wbGV0aW9uRW5naW5lPigpO1xuICAvKipcbiAgICogU3RvcmVzIHRoZSBgU3ltYm9sQnVpbGRlcmAgd2hpY2ggY3JlYXRlcyBzeW1ib2xzIGZvciBlYWNoIGNvbXBvbmVudCBjbGFzcy5cbiAgICpcbiAgICogTXVzdCBiZSBpbnZhbGlkYXRlZCB3aGVuZXZlciB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgb3IgdGhlIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzLiBJbnZhbGlkYXRpb25cbiAgICogb24gdGVtcGxhdGUgY2hhbmdlcyBpcyBwZXJmb3JtZWQgd2l0aGluIHRoaXMgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBpbnN0YW5jZS4gV2hlbiB0aGVcbiAgICogYHRzLlByb2dyYW1gIGNoYW5nZXMsIHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGFzIGEgd2hvbGUgaXMgZGVzdHJveWVkIGFuZCByZXBsYWNlZC5cbiAgICovXG4gIHByaXZhdGUgc3ltYm9sQnVpbGRlckNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBTeW1ib2xCdWlsZGVyPigpO1xuXG4gIC8qKlxuICAgKiBTdG9yZXMgZGlyZWN0aXZlcyBhbmQgcGlwZXMgdGhhdCBhcmUgaW4gc2NvcGUgZm9yIGVhY2ggY29tcG9uZW50LlxuICAgKlxuICAgKiBVbmxpa2UgdGhlIG90aGVyIGNhY2hlcywgdGhlIHNjb3BlIG9mIGEgY29tcG9uZW50IGlzIG5vdCBhZmZlY3RlZCBieSBpdHMgdGVtcGxhdGUsIHNvIHRoaXNcbiAgICogY2FjaGUgZG9lcyBub3QgbmVlZCB0byBiZSBpbnZhbGlkYXRlIGlmIHRoZSB0ZW1wbGF0ZSBpcyBvdmVycmlkZGVuLiBJdCB3aWxsIGJlIGRlc3Ryb3llZCB3aGVuXG4gICAqIHRoZSBgdHMuUHJvZ3JhbWAgY2hhbmdlcyBhbmQgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgYXMgYSB3aG9sZSBpcyBkZXN0cm95ZWQgYW5kXG4gICAqIHJlcGxhY2VkLlxuICAgKi9cbiAgcHJpdmF0ZSBzY29wZUNhY2hlID0gbmV3IE1hcDx0cy5DbGFzc0RlY2xhcmF0aW9uLCBTY29wZURhdGE+KCk7XG5cbiAgcHJpdmF0ZSBpc0NvbXBsZXRlID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIG9yaWdpbmFsUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIHJlYWRvbmx5IHR5cGVDaGVja2luZ1N0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIHR5cGVDaGVja0FkYXB0ZXI6IFByb2dyYW1UeXBlQ2hlY2tBZGFwdGVyLCBwcml2YXRlIGNvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnLFxuICAgICAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIGNvbXBpbGVySG9zdDogUGljazx0cy5Db21waWxlckhvc3QsICdnZXRDYW5vbmljYWxGaWxlTmFtZSc+LFxuICAgICAgcHJpdmF0ZSBwcmlvckJ1aWxkOiBJbmNyZW1lbnRhbEJ1aWxkPHVua25vd24sIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY29tcG9uZW50U2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyKSB7fVxuXG4gIHJlc2V0T3ZlcnJpZGVzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZmlsZVJlY29yZCBvZiB0aGlzLnN0YXRlLnZhbHVlcygpKSB7XG4gICAgICBpZiAoZmlsZVJlY29yZC50ZW1wbGF0ZU92ZXJyaWRlcyAhPT0gbnVsbCkge1xuICAgICAgICBmaWxlUmVjb3JkLnRlbXBsYXRlT3ZlcnJpZGVzID0gbnVsbDtcbiAgICAgICAgZmlsZVJlY29yZC5zaGltRGF0YS5jbGVhcigpO1xuICAgICAgICBmaWxlUmVjb3JkLmlzQ29tcGxldGUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZGVhbGx5IG9ubHkgdGhvc2UgY29tcG9uZW50cyB3aXRoIG92ZXJyaWRkZW4gdGVtcGxhdGVzIHdvdWxkIGhhdmUgdGhlaXIgY2FjaGVzIGludmFsaWRhdGVkLFxuICAgIC8vIGJ1dCB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBkb2VzIG5vdCB0cmFjayB0aGUgY2xhc3MgZm9yIGNvbXBvbmVudHMgd2l0aCBvdmVycmlkZXMuIEFzXG4gICAgLy8gYSBxdWljayB3b3JrYXJvdW5kLCBjbGVhciB0aGUgZW50aXJlIGNhY2hlIGluc3RlYWQuXG4gICAgdGhpcy5jb21wbGV0aW9uQ2FjaGUuY2xlYXIoKTtcbiAgICB0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5jbGVhcigpO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVG1wbEFzdE5vZGVbXXxudWxsIHtcbiAgICBjb25zdCB7ZGF0YX0gPSB0aGlzLmdldExhdGVzdENvbXBvbmVudFN0YXRlKGNvbXBvbmVudCk7XG4gICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YS50ZW1wbGF0ZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIHtkYXRhOiBUZW1wbGF0ZURhdGF8bnVsbCwgdGNiOiB0cy5Ob2RlfG51bGwsIHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aH0ge1xuICAgIHRoaXMuZW5zdXJlU2hpbUZvckNvbXBvbmVudChjb21wb25lbnQpO1xuXG4gICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gdGhpcy50eXBlQ2hlY2tpbmdTdHJhdGVneS5zaGltUGF0aEZvckNvbXBvbmVudChjb21wb25lbnQpO1xuXG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcblxuICAgIGlmICghZmlsZVJlY29yZC5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICByZXR1cm4ge2RhdGE6IG51bGwsIHRjYjogbnVsbCwgc2hpbVBhdGh9O1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlSWQgPSBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjb21wb25lbnQpO1xuICAgIGNvbnN0IHNoaW1SZWNvcmQgPSBmaWxlUmVjb3JkLnNoaW1EYXRhLmdldChzaGltUGF0aCkhO1xuICAgIGNvbnN0IGlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcblxuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LmdldFByb2dyYW0oKTtcbiAgICBjb25zdCBzaGltU2YgPSBnZXRTb3VyY2VGaWxlT3JOdWxsKHByb2dyYW0sIHNoaW1QYXRoKTtcblxuICAgIGlmIChzaGltU2YgPT09IG51bGwgfHwgIWZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogbm8gc2hpbSBmaWxlIGluIHByb2dyYW06ICR7c2hpbVBhdGh9YCk7XG4gICAgfVxuXG4gICAgbGV0IHRjYjogdHMuTm9kZXxudWxsID0gZmluZFR5cGVDaGVja0Jsb2NrKHNoaW1TZiwgaWQsIC8qaXNEaWFnbm9zdGljc1JlcXVlc3QqLyBmYWxzZSk7XG5cbiAgICBpZiAodGNiID09PSBudWxsKSB7XG4gICAgICAvLyBUcnkgZm9yIGFuIGlubGluZSBibG9jay5cbiAgICAgIGNvbnN0IGlubGluZVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IocHJvZ3JhbSwgc2ZQYXRoKTtcbiAgICAgIHRjYiA9IGZpbmRUeXBlQ2hlY2tCbG9jayhpbmxpbmVTZiwgaWQsIC8qaXNEaWFnbm9zdGljc1JlcXVlc3QqLyBmYWxzZSk7XG4gICAgfVxuXG4gICAgbGV0IGRhdGE6IFRlbXBsYXRlRGF0YXxudWxsID0gbnVsbDtcbiAgICBpZiAoc2hpbVJlY29yZC50ZW1wbGF0ZXMuaGFzKHRlbXBsYXRlSWQpKSB7XG4gICAgICBkYXRhID0gc2hpbVJlY29yZC50ZW1wbGF0ZXMuZ2V0KHRlbXBsYXRlSWQpITtcbiAgICB9XG5cbiAgICByZXR1cm4ge2RhdGEsIHRjYiwgc2hpbVBhdGh9O1xuICB9XG5cbiAgb3ZlcnJpZGVDb21wb25lbnRUZW1wbGF0ZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24sIHRlbXBsYXRlOiBzdHJpbmcpOlxuICAgICAge25vZGVzOiBUbXBsQXN0Tm9kZVtdLCBlcnJvcnM6IFBhcnNlRXJyb3JbXXxudWxsfSB7XG4gICAgY29uc3Qge25vZGVzLCBlcnJvcnN9ID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgJ292ZXJyaWRlLmh0bWwnLCB7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGZpbGVQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpKTtcblxuICAgIGNvbnN0IGZpbGVSZWNvcmQgPSB0aGlzLmdldEZpbGVEYXRhKGZpbGVQYXRoKTtcbiAgICBjb25zdCBpZCA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKGNvbXBvbmVudCk7XG5cbiAgICBpZiAoZmlsZVJlY29yZC50ZW1wbGF0ZU92ZXJyaWRlcyA9PT0gbnVsbCkge1xuICAgICAgZmlsZVJlY29yZC50ZW1wbGF0ZU92ZXJyaWRlcyA9IG5ldyBNYXAoKTtcbiAgICB9XG5cbiAgICBmaWxlUmVjb3JkLnRlbXBsYXRlT3ZlcnJpZGVzLnNldChpZCwgbm9kZXMpO1xuXG4gICAgLy8gQ2xlYXIgZGF0YSBmb3IgdGhlIHNoaW0gaW4gcXVlc3Rpb24sIHNvIGl0J2xsIGJlIHJlZ2VuZXJhdGVkIG9uIHRoZSBuZXh0IHJlcXVlc3QuXG4gICAgY29uc3Qgc2hpbUZpbGUgPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgZmlsZVJlY29yZC5zaGltRGF0YS5kZWxldGUoc2hpbUZpbGUpO1xuICAgIGZpbGVSZWNvcmQuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICAgIHRoaXMuaXNDb21wbGV0ZSA9IGZhbHNlO1xuXG4gICAgLy8gT3ZlcnJpZGluZyBhIGNvbXBvbmVudCdzIHRlbXBsYXRlIGludmFsaWRhdGVzIGl0cyBjYWNoZWQgcmVzdWx0cy5cbiAgICB0aGlzLmNvbXBsZXRpb25DYWNoZS5kZWxldGUoY29tcG9uZW50KTtcbiAgICB0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5kZWxldGUoY29tcG9uZW50KTtcblxuICAgIHJldHVybiB7bm9kZXMsIGVycm9yc307XG4gIH1cblxuICBpc1RyYWNrZWRUeXBlQ2hlY2tGaWxlKGZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmdldEZpbGVBbmRTaGltUmVjb3Jkc0ZvclBhdGgoZmlsZVBhdGgpICE9PSBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRGaWxlQW5kU2hpbVJlY29yZHNGb3JQYXRoKHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6XG4gICAgICB7ZmlsZVJlY29yZDogRmlsZVR5cGVDaGVja2luZ0RhdGEsIHNoaW1SZWNvcmQ6IFNoaW1UeXBlQ2hlY2tpbmdEYXRhfXxudWxsIHtcbiAgICBmb3IgKGNvbnN0IGZpbGVSZWNvcmQgb2YgdGhpcy5zdGF0ZS52YWx1ZXMoKSkge1xuICAgICAgaWYgKGZpbGVSZWNvcmQuc2hpbURhdGEuaGFzKHNoaW1QYXRoKSkge1xuICAgICAgICByZXR1cm4ge2ZpbGVSZWNvcmQsIHNoaW1SZWNvcmQ6IGZpbGVSZWNvcmQuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSF9O1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldFRlbXBsYXRlTWFwcGluZ0F0U2hpbUxvY2F0aW9uKHtzaGltUGF0aCwgcG9zaXRpb25JblNoaW1GaWxlfTogU2hpbUxvY2F0aW9uKTpcbiAgICAgIEZ1bGxUZW1wbGF0ZU1hcHBpbmd8bnVsbCB7XG4gICAgY29uc3QgcmVjb3JkcyA9IHRoaXMuZ2V0RmlsZUFuZFNoaW1SZWNvcmRzRm9yUGF0aChhYnNvbHV0ZUZyb20oc2hpbVBhdGgpKTtcbiAgICBpZiAocmVjb3JkcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHtmaWxlUmVjb3JkfSA9IHJlY29yZHM7XG5cbiAgICBjb25zdCBzaGltU2YgPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LmdldFByb2dyYW0oKS5nZXRTb3VyY2VGaWxlKGFic29sdXRlRnJvbShzaGltUGF0aCkpO1xuICAgIGlmIChzaGltU2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBnZXRUZW1wbGF0ZU1hcHBpbmcoXG4gICAgICAgIHNoaW1TZiwgcG9zaXRpb25JblNoaW1GaWxlLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIsIC8qaXNEaWFnbm9zdGljc1JlcXVlc3QqLyBmYWxzZSk7XG4gIH1cblxuICBnZW5lcmF0ZUFsbFR5cGVDaGVja0Jsb2NrcygpIHtcbiAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yQWxsRmlsZXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0eXBlLWNoZWNraW5nIGRpYWdub3N0aWNzIGZyb20gdGhlIGdpdmVuIGB0cy5Tb3VyY2VGaWxlYCB1c2luZyB0aGUgbW9zdCByZWNlbnRcbiAgICogdHlwZS1jaGVja2luZyBwcm9ncmFtLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBvcHRpbWl6ZUZvcjogT3B0aW1pemVGb3IpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHN3aXRjaCAob3B0aW1pemVGb3IpIHtcbiAgICAgIGNhc2UgT3B0aW1pemVGb3IuV2hvbGVQcm9ncmFtOlxuICAgICAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yQWxsRmlsZXMoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIE9wdGltaXplRm9yLlNpbmdsZUZpbGU6XG4gICAgICAgIHRoaXMuZW5zdXJlQWxsU2hpbXNGb3JPbmVGaWxlKHNmKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuc3RhdGUuZ2V0KHNmUGF0aCkhO1xuXG4gICAgY29uc3QgdHlwZUNoZWNrUHJvZ3JhbSA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpO1xuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6ICh0cy5EaWFnbm9zdGljfG51bGwpW10gPSBbXTtcbiAgICBpZiAoZmlsZVJlY29yZC5oYXNJbmxpbmVzKSB7XG4gICAgICBjb25zdCBpbmxpbmVTZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNmUGF0aCk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhpbmxpbmVTZikubWFwKFxuICAgICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW3NoaW1QYXRoLCBzaGltUmVjb3JkXSBvZiBmaWxlUmVjb3JkLnNoaW1EYXRhKSB7XG4gICAgICBjb25zdCBzaGltU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzaGltUGF0aCk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzaGltU2YpLm1hcChcbiAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uc2hpbVJlY29yZC5nZW5lc2lzRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIHJldHVybiBkaWFnbm9zdGljcy5maWx0ZXIoKGRpYWc6IHRzLkRpYWdub3N0aWN8bnVsbCk6IGRpYWcgaXMgdHMuRGlhZ25vc3RpYyA9PiBkaWFnICE9PSBudWxsKTtcbiAgfVxuXG4gIGdldERpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgdGhpcy5lbnN1cmVTaGltRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBzZiA9IGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3Qgc2hpbVBhdGggPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBmaWxlUmVjb3JkID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuXG4gICAgaWYgKCFmaWxlUmVjb3JkLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcbiAgICBjb25zdCBzaGltUmVjb3JkID0gZmlsZVJlY29yZC5zaGltRGF0YS5nZXQoc2hpbVBhdGgpITtcblxuICAgIGNvbnN0IHR5cGVDaGVja1Byb2dyYW0gPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LmdldFByb2dyYW0oKTtcblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiAoVGVtcGxhdGVEaWFnbm9zdGljfG51bGwpW10gPSBbXTtcbiAgICBpZiAoc2hpbVJlY29yZC5oYXNJbmxpbmVzKSB7XG4gICAgICBjb25zdCBpbmxpbmVTZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNmUGF0aCk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhpbmxpbmVTZikubWFwKFxuICAgICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHNoaW1TZiA9IGdldFNvdXJjZUZpbGVPckVycm9yKHR5cGVDaGVja1Byb2dyYW0sIHNoaW1QYXRoKTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR5cGVDaGVja1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzaGltU2YpLm1hcChcbiAgICAgICAgZGlhZyA9PiBjb252ZXJ0RGlhZ25vc3RpYyhkaWFnLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIpKSk7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5zaGltUmVjb3JkLmdlbmVzaXNEaWFnbm9zdGljcyk7XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3MuZmlsdGVyKFxuICAgICAgICAoZGlhZzogVGVtcGxhdGVEaWFnbm9zdGljfG51bGwpOiBkaWFnIGlzIFRlbXBsYXRlRGlhZ25vc3RpYyA9PlxuICAgICAgICAgICAgZGlhZyAhPT0gbnVsbCAmJiBkaWFnLnRlbXBsYXRlSWQgPT09IHRlbXBsYXRlSWQpO1xuICB9XG5cbiAgZ2V0VHlwZUNoZWNrQmxvY2soY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuTm9kZXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQpLnRjYjtcbiAgfVxuXG4gIGdldEdsb2JhbENvbXBsZXRpb25zKGNvbnRleHQ6IFRtcGxBc3RUZW1wbGF0ZXxudWxsLCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOlxuICAgICAgR2xvYmFsQ29tcGxldGlvbnxudWxsIHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldE9yQ3JlYXRlQ29tcGxldGlvbkVuZ2luZShjb21wb25lbnQpO1xuICAgIGlmIChlbmdpbmUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZW5naW5lLmdldEdsb2JhbENvbXBsZXRpb25zKGNvbnRleHQpO1xuICB9XG5cbiAgZ2V0RXhwcmVzc2lvbkNvbXBsZXRpb25Mb2NhdGlvbihcbiAgICAgIGFzdDogUHJvcGVydHlSZWFkfFNhZmVQcm9wZXJ0eVJlYWR8TWV0aG9kQ2FsbHxTYWZlTWV0aG9kQ2FsbCxcbiAgICAgIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFNoaW1Mb2NhdGlvbnxudWxsIHtcbiAgICBjb25zdCBlbmdpbmUgPSB0aGlzLmdldE9yQ3JlYXRlQ29tcGxldGlvbkVuZ2luZShjb21wb25lbnQpO1xuICAgIGlmIChlbmdpbmUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZW5naW5lLmdldEV4cHJlc3Npb25Db21wbGV0aW9uTG9jYXRpb24oYXN0KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0T3JDcmVhdGVDb21wbGV0aW9uRW5naW5lKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENvbXBsZXRpb25FbmdpbmV8bnVsbCB7XG4gICAgaWYgKHRoaXMuY29tcGxldGlvbkNhY2hlLmhhcyhjb21wb25lbnQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21wbGV0aW9uQ2FjaGUuZ2V0KGNvbXBvbmVudCkhO1xuICAgIH1cblxuICAgIGNvbnN0IHt0Y2IsIGRhdGEsIHNoaW1QYXRofSA9IHRoaXMuZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50KTtcbiAgICBpZiAodGNiID09PSBudWxsIHx8IGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGVuZ2luZSA9IG5ldyBDb21wbGV0aW9uRW5naW5lKHRjYiwgZGF0YSwgc2hpbVBhdGgpO1xuICAgIHRoaXMuY29tcGxldGlvbkNhY2hlLnNldChjb21wb25lbnQsIGVuZ2luZSk7XG4gICAgcmV0dXJuIGVuZ2luZTtcbiAgfVxuXG4gIHByaXZhdGUgbWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5oYXMoc2ZQYXRoKSkge1xuICAgICAgY29uc3QgZXhpc3RpbmdSZXN1bHRzID0gdGhpcy5zdGF0ZS5nZXQoc2ZQYXRoKSE7XG4gICAgICBpZiAoZXhpc3RpbmdSZXN1bHRzLnRlbXBsYXRlT3ZlcnJpZGVzICE9PSBudWxsKSB7XG4gICAgICAgIC8vIENhbm5vdCBhZG9wdCBwcmlvciByZXN1bHRzIGlmIHRlbXBsYXRlIG92ZXJyaWRlcyBoYXZlIGJlZW4gcmVxdWVzdGVkLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChleGlzdGluZ1Jlc3VsdHMuaXNDb21wbGV0ZSkge1xuICAgICAgICAvLyBBbGwgZGF0YSBmb3IgdGhpcyBmaWxlIGhhcyBhbHJlYWR5IGJlZW4gZ2VuZXJhdGVkLCBzbyBubyBuZWVkIHRvIGFkb3B0IGFueXRoaW5nLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcHJldmlvdXNSZXN1bHRzID0gdGhpcy5wcmlvckJ1aWxkLnByaW9yVHlwZUNoZWNraW5nUmVzdWx0c0ZvcihzZik7XG4gICAgaWYgKHByZXZpb3VzUmVzdWx0cyA9PT0gbnVsbCB8fCAhcHJldmlvdXNSZXN1bHRzLmlzQ29tcGxldGUgfHxcbiAgICAgICAgcHJldmlvdXNSZXN1bHRzLnRlbXBsYXRlT3ZlcnJpZGVzICE9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5zZXQoc2ZQYXRoLCBwcmV2aW91c1Jlc3VsdHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbGxTaGltc0ZvckFsbEZpbGVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzQ29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBob3N0ID0gbmV3IFdob2xlUHJvZ3JhbVR5cGVDaGVja2luZ0hvc3QodGhpcyk7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5uZXdDb250ZXh0KGhvc3QpO1xuXG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLm9yaWdpbmFsUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaXNTaGltKHNmKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5tYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZik7XG5cbiAgICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgICBpZiAoZmlsZURhdGEuaXNDb21wbGV0ZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50eXBlQ2hlY2tBZGFwdGVyLnR5cGVDaGVjayhzZiwgY3R4KTtcblxuICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVGcm9tQ29udGV4dChjdHgpO1xuICAgIHRoaXMuaXNDb21wbGV0ZSA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFsbFNoaW1zRm9yT25lRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMubWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2YpO1xuXG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICBpZiAoZmlsZURhdGEuaXNDb21wbGV0ZSkge1xuICAgICAgLy8gQWxsIGRhdGEgZm9yIHRoaXMgZmlsZSBpcyBwcmVzZW50IGFuZCBhY2NvdW50ZWQgZm9yIGFscmVhZHkuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgaG9zdCA9IG5ldyBTaW5nbGVGaWxlVHlwZUNoZWNraW5nSG9zdChzZlBhdGgsIGZpbGVEYXRhLCB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LCB0aGlzKTtcbiAgICBjb25zdCBjdHggPSB0aGlzLm5ld0NvbnRleHQoaG9zdCk7XG5cbiAgICB0aGlzLnR5cGVDaGVja0FkYXB0ZXIudHlwZUNoZWNrKHNmLCBjdHgpO1xuXG4gICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG5cbiAgICB0aGlzLnVwZGF0ZUZyb21Db250ZXh0KGN0eCk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZVNoaW1Gb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuXG4gICAgdGhpcy5tYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZik7XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICBjb25zdCBzaGltUGF0aCA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQoY29tcG9uZW50KTtcblxuICAgIGlmIChmaWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICAvLyBBbGwgZGF0YSBmb3IgdGhpcyBjb21wb25lbnQgaXMgYXZhaWxhYmxlLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGhvc3QgPVxuICAgICAgICBuZXcgU2luZ2xlU2hpbVR5cGVDaGVja2luZ0hvc3Qoc2ZQYXRoLCBmaWxlRGF0YSwgdGhpcy50eXBlQ2hlY2tpbmdTdHJhdGVneSwgdGhpcywgc2hpbVBhdGgpO1xuICAgIGNvbnN0IGN0eCA9IHRoaXMubmV3Q29udGV4dChob3N0KTtcblxuICAgIHRoaXMudHlwZUNoZWNrQWRhcHRlci50eXBlQ2hlY2soc2YsIGN0eCk7XG4gICAgdGhpcy51cGRhdGVGcm9tQ29udGV4dChjdHgpO1xuICB9XG5cbiAgcHJpdmF0ZSBuZXdDb250ZXh0KGhvc3Q6IFR5cGVDaGVja2luZ0hvc3QpOiBUeXBlQ2hlY2tDb250ZXh0SW1wbCB7XG4gICAgY29uc3QgaW5saW5pbmcgPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucyA/IElubGluaW5nTW9kZS5JbmxpbmVPcHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJbmxpbmluZ01vZGUuRXJyb3I7XG4gICAgcmV0dXJuIG5ldyBUeXBlQ2hlY2tDb250ZXh0SW1wbChcbiAgICAgICAgdGhpcy5jb25maWcsIHRoaXMuY29tcGlsZXJIb3N0LCB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLFxuICAgICAgICBob3N0LCBpbmxpbmluZyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFueSBzaGltIGRhdGEgdGhhdCBkZXBlbmRzIG9uIGlubGluZSBvcGVyYXRpb25zIGFwcGxpZWQgdG8gdGhlIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbS5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgdXNlZnVsIGlmIG5ldyBpbmxpbmVzIG5lZWQgdG8gYmUgYXBwbGllZCwgYW5kIGl0J3Mgbm90IHBvc3NpYmxlIHRvIGd1YXJhbnRlZSB0aGF0XG4gICAqIHRoZXkgd29uJ3Qgb3ZlcndyaXRlIG9yIGNvcnJ1cHQgZXhpc3RpbmcgaW5saW5lcyB0aGF0IGFyZSB1c2VkIGJ5IHN1Y2ggc2hpbXMuXG4gICAqL1xuICBjbGVhckFsbFNoaW1EYXRhVXNpbmdJbmxpbmVzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZmlsZURhdGEgb2YgdGhpcy5zdGF0ZS52YWx1ZXMoKSkge1xuICAgICAgaWYgKCFmaWxlRGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IFtzaGltRmlsZSwgc2hpbURhdGFdIG9mIGZpbGVEYXRhLnNoaW1EYXRhLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoc2hpbURhdGEuaGFzSW5saW5lcykge1xuICAgICAgICAgIGZpbGVEYXRhLnNoaW1EYXRhLmRlbGV0ZShzaGltRmlsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IGZhbHNlO1xuICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICAgICAgdGhpcy5pc0NvbXBsZXRlID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVGcm9tQ29udGV4dChjdHg6IFR5cGVDaGVja0NvbnRleHRJbXBsKTogdm9pZCB7XG4gICAgY29uc3QgdXBkYXRlcyA9IGN0eC5maW5hbGl6ZSgpO1xuICAgIHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kudXBkYXRlRmlsZXModXBkYXRlcywgVXBkYXRlTW9kZS5JbmNyZW1lbnRhbCk7XG4gICAgdGhpcy5wcmlvckJ1aWxkLnJlY29yZFN1Y2Nlc3NmdWxUeXBlQ2hlY2sodGhpcy5zdGF0ZSk7XG4gIH1cblxuICBnZXRGaWxlRGF0YShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgICBpZiAoIXRoaXMuc3RhdGUuaGFzKHBhdGgpKSB7XG4gICAgICB0aGlzLnN0YXRlLnNldChwYXRoLCB7XG4gICAgICAgIGhhc0lubGluZXM6IGZhbHNlLFxuICAgICAgICB0ZW1wbGF0ZU92ZXJyaWRlczogbnVsbCxcbiAgICAgICAgc291cmNlTWFuYWdlcjogbmV3IFRlbXBsYXRlU291cmNlTWFuYWdlcigpLFxuICAgICAgICBpc0NvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgc2hpbURhdGE6IG5ldyBNYXAoKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5nZXQocGF0aCkhO1xuICB9XG5cbiAgZ2V0U3ltYm9sT2ZOb2RlKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLmdldE9yQ3JlYXRlU3ltYm9sQnVpbGRlcihjb21wb25lbnQpO1xuICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGJ1aWxkZXIuZ2V0U3ltYm9sKG5vZGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRPckNyZWF0ZVN5bWJvbEJ1aWxkZXIoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU3ltYm9sQnVpbGRlcnxudWxsIHtcbiAgICBpZiAodGhpcy5zeW1ib2xCdWlsZGVyQ2FjaGUuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5nZXQoY29tcG9uZW50KSE7XG4gICAgfVxuXG4gICAgY29uc3Qge3RjYiwgZGF0YSwgc2hpbVBhdGh9ID0gdGhpcy5nZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQpO1xuICAgIGlmICh0Y2IgPT09IG51bGwgfHwgZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgYnVpbGRlciA9IG5ldyBTeW1ib2xCdWlsZGVyKFxuICAgICAgICBzaGltUGF0aCwgdGNiLCBkYXRhLCB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLFxuICAgICAgICAoKSA9PiB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LmdldFByb2dyYW0oKS5nZXRUeXBlQ2hlY2tlcigpKTtcbiAgICB0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5zZXQoY29tcG9uZW50LCBidWlsZGVyKTtcbiAgICByZXR1cm4gYnVpbGRlcjtcbiAgfVxuXG4gIGdldERpcmVjdGl2ZXNJblNjb3BlKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IERpcmVjdGl2ZUluU2NvcGVbXXxudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRTY29wZURhdGEoY29tcG9uZW50KTtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLmRpcmVjdGl2ZXM7XG4gIH1cblxuICBnZXRQaXBlc0luU2NvcGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogUGlwZUluU2NvcGVbXXxudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRTY29wZURhdGEoY29tcG9uZW50KTtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLnBpcGVzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTY29wZURhdGEoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU2NvcGVEYXRhfG51bGwge1xuICAgIGlmICh0aGlzLnNjb3BlQ2FjaGUuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnNjb3BlQ2FjaGUuZ2V0KGNvbXBvbmVudCkhO1xuICAgIH1cblxuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oY29tcG9uZW50KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogY29tcG9uZW50cyBtdXN0IGhhdmUgbmFtZXNgKTtcbiAgICB9XG5cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuY29tcG9uZW50U2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICBpZiAoc2NvcGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGE6IFNjb3BlRGF0YSA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IFtdLFxuICAgICAgcGlwZXM6IFtdLFxuICAgICAgaXNQb2lzb25lZDogc2NvcGUuY29tcGlsYXRpb24uaXNQb2lzb25lZCxcbiAgICB9O1xuXG4gICAgY29uc3QgdHlwZUNoZWNrZXIgPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LmdldFByb2dyYW0oKS5nZXRUeXBlQ2hlY2tlcigpO1xuICAgIGZvciAoY29uc3QgZGlyIG9mIHNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgIGlmIChkaXIuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgLy8gU2tpcCB0aGlzIGRpcmVjdGl2ZSwgaXQgY2FuJ3QgYmUgYWRkZWQgdG8gYSB0ZW1wbGF0ZSBhbnl3YXkuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgdHNTeW1ib2wgPSB0eXBlQ2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGRpci5yZWYubm9kZS5uYW1lKTtcbiAgICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZGF0YS5kaXJlY3RpdmVzLnB1c2goe1xuICAgICAgICBpc0NvbXBvbmVudDogZGlyLmlzQ29tcG9uZW50LFxuICAgICAgICBzZWxlY3RvcjogZGlyLnNlbGVjdG9yLFxuICAgICAgICB0c1N5bWJvbCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5leHBvcnRlZC5waXBlcykge1xuICAgICAgY29uc3QgdHNTeW1ib2wgPSB0eXBlQ2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKHBpcGUucmVmLm5vZGUubmFtZSk7XG4gICAgICBpZiAodHNTeW1ib2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGRhdGEucGlwZXMucHVzaCh7XG4gICAgICAgIG5hbWU6IHBpcGUubmFtZSxcbiAgICAgICAgdHNTeW1ib2wsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnNjb3BlQ2FjaGUuc2V0KGNvbXBvbmVudCwgZGF0YSk7XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29udmVydERpYWdub3N0aWMoXG4gICAgZGlhZzogdHMuRGlhZ25vc3RpYywgc291cmNlUmVzb2x2ZXI6IFRlbXBsYXRlU291cmNlUmVzb2x2ZXIpOiBUZW1wbGF0ZURpYWdub3N0aWN8bnVsbCB7XG4gIGlmICghc2hvdWxkUmVwb3J0RGlhZ25vc3RpYyhkaWFnKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB0cmFuc2xhdGVEaWFnbm9zdGljKGRpYWcsIHNvdXJjZVJlc29sdmVyKTtcbn1cblxuLyoqXG4gKiBEYXRhIGZvciB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHJlbGF0ZWQgdG8gYSBzcGVjaWZpYyBpbnB1dCBmaWxlIGluIHRoZSB1c2VyJ3MgcHJvZ3JhbSAod2hpY2hcbiAqIGNvbnRhaW5zIGNvbXBvbmVudHMgdG8gYmUgY2hlY2tlZCkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVR5cGVDaGVja2luZ0RhdGEge1xuICAvKipcbiAgICogV2hldGhlciB0aGUgdHlwZS1jaGVja2luZyBzaGltIHJlcXVpcmVkIGFueSBpbmxpbmUgY2hhbmdlcyB0byB0aGUgb3JpZ2luYWwgZmlsZSwgd2hpY2ggYWZmZWN0c1xuICAgKiB3aGV0aGVyIHRoZSBzaGltIGNhbiBiZSByZXVzZWQuXG4gICAqL1xuICBoYXNJbmxpbmVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBTb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbiBmb3IgbWFwcGluZyBkaWFnbm9zdGljcyBmcm9tIGlubGluZWQgdHlwZSBjaGVjayBibG9ja3MgYmFjayB0byB0aGVcbiAgICogb3JpZ2luYWwgdGVtcGxhdGUuXG4gICAqL1xuICBzb3VyY2VNYW5hZ2VyOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXI7XG5cbiAgLyoqXG4gICAqIE1hcCBvZiB0ZW1wbGF0ZSBvdmVycmlkZXMgYXBwbGllZCB0byBhbnkgY29tcG9uZW50cyBpbiB0aGlzIGlucHV0IGZpbGUuXG4gICAqL1xuICB0ZW1wbGF0ZU92ZXJyaWRlczogTWFwPFRlbXBsYXRlSWQsIFRtcGxBc3ROb2RlW10+fG51bGw7XG5cbiAgLyoqXG4gICAqIERhdGEgZm9yIGVhY2ggc2hpbSBnZW5lcmF0ZWQgZnJvbSB0aGlzIGlucHV0IGZpbGUuXG4gICAqXG4gICAqIEEgc2luZ2xlIGlucHV0IGZpbGUgd2lsbCBnZW5lcmF0ZSBvbmUgb3IgbW9yZSBzaGltIGZpbGVzIHRoYXQgYWN0dWFsbHkgY29udGFpbiB0ZW1wbGF0ZVxuICAgKiB0eXBlLWNoZWNraW5nIGNvZGUuXG4gICAqL1xuICBzaGltRGF0YTogTWFwPEFic29sdXRlRnNQYXRoLCBTaGltVHlwZUNoZWNraW5nRGF0YT47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tlciBpcyBjZXJ0YWluIHRoYXQgYWxsIGNvbXBvbmVudHMgZnJvbSB0aGlzIGlucHV0IGZpbGUgaGF2ZSBoYWRcbiAgICogdHlwZS1jaGVja2luZyBjb2RlIGdlbmVyYXRlZCBpbnRvIHNoaW1zLlxuICAgKi9cbiAgaXNDb21wbGV0ZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBEcml2ZXMgYSBgVHlwZUNoZWNrQ29udGV4dGAgdG8gZ2VuZXJhdGUgdHlwZS1jaGVja2luZyBjb2RlIGZvciBldmVyeSBjb21wb25lbnQgaW4gdGhlIHByb2dyYW0uXG4gKi9cbmNsYXNzIFdob2xlUHJvZ3JhbVR5cGVDaGVja2luZ0hvc3QgaW1wbGVtZW50cyBUeXBlQ2hlY2tpbmdIb3N0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBpbXBsOiBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbCkge31cblxuICBnZXRTb3VyY2VNYW5hZ2VyKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXIge1xuICAgIHJldHVybiB0aGlzLmltcGwuZ2V0RmlsZURhdGEoc2ZQYXRoKS5zb3VyY2VNYW5hZ2VyO1xuICB9XG5cbiAgc2hvdWxkQ2hlY2tDb21wb25lbnQobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5pbXBsLmdldEZpbGVEYXRhKGFic29sdXRlRnJvbVNvdXJjZUZpbGUobm9kZS5nZXRTb3VyY2VGaWxlKCkpKTtcbiAgICBjb25zdCBzaGltUGF0aCA9IHRoaXMuaW1wbC50eXBlQ2hlY2tpbmdTdHJhdGVneS5zaGltUGF0aEZvckNvbXBvbmVudChub2RlKTtcbiAgICAvLyBUaGUgY29tcG9uZW50IG5lZWRzIHRvIGJlIGNoZWNrZWQgdW5sZXNzIHRoZSBzaGltIHdoaWNoIHdvdWxkIGNvbnRhaW4gaXQgYWxyZWFkeSBleGlzdHMuXG4gICAgcmV0dXJuICFmaWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVPdmVycmlkZShzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVG1wbEFzdE5vZGVbXXxudWxsIHtcbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgIGlmIChmaWxlRGF0YS50ZW1wbGF0ZU92ZXJyaWRlcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVEYXRhLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChub2RlKTtcbiAgICBpZiAoZmlsZURhdGEudGVtcGxhdGVPdmVycmlkZXMuaGFzKHRlbXBsYXRlSWQpKSB7XG4gICAgICByZXR1cm4gZmlsZURhdGEudGVtcGxhdGVPdmVycmlkZXMuZ2V0KHRlbXBsYXRlSWQpITtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJlY29yZFNoaW1EYXRhKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGRhdGE6IFNoaW1UeXBlQ2hlY2tpbmdEYXRhKTogdm9pZCB7XG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmltcGwuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICBmaWxlRGF0YS5zaGltRGF0YS5zZXQoZGF0YS5wYXRoLCBkYXRhKTtcbiAgICBpZiAoZGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICBmaWxlRGF0YS5oYXNJbmxpbmVzID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZWNvcmRDb21wbGV0ZShzZlBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZCB7XG4gICAgdGhpcy5pbXBsLmdldEZpbGVEYXRhKHNmUGF0aCkuaXNDb21wbGV0ZSA9IHRydWU7XG4gIH1cbn1cblxuLyoqXG4gKiBEcml2ZXMgYSBgVHlwZUNoZWNrQ29udGV4dGAgdG8gZ2VuZXJhdGUgdHlwZS1jaGVja2luZyBjb2RlIGVmZmljaWVudGx5IGZvciBhIHNpbmdsZSBpbnB1dCBmaWxlLlxuICovXG5jbGFzcyBTaW5nbGVGaWxlVHlwZUNoZWNraW5nSG9zdCBpbXBsZW1lbnRzIFR5cGVDaGVja2luZ0hvc3Qge1xuICBwcml2YXRlIHNlZW5JbmxpbmVzID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJvdGVjdGVkIGZpbGVEYXRhOiBGaWxlVHlwZUNoZWNraW5nRGF0YSxcbiAgICAgIHByb3RlY3RlZCBzdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LCBwcm90ZWN0ZWQgaW1wbDogVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwpIHt9XG5cbiAgcHJpdmF0ZSBhc3NlcnRQYXRoKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZlBhdGggIT09IHNmUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogcXVlcnlpbmcgVHlwZUNoZWNraW5nSG9zdCBvdXRzaWRlIG9mIGFzc2lnbmVkIGZpbGVgKTtcbiAgICB9XG4gIH1cblxuICBnZXRTb3VyY2VNYW5hZ2VyKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBUZW1wbGF0ZVNvdXJjZU1hbmFnZXIge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuICAgIHJldHVybiB0aGlzLmZpbGVEYXRhLnNvdXJjZU1hbmFnZXI7XG4gIH1cblxuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuc2ZQYXRoICE9PSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG5vZGUuZ2V0U291cmNlRmlsZSgpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBzaGltUGF0aCA9IHRoaXMuc3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQobm9kZSk7XG5cbiAgICAvLyBPbmx5IG5lZWQgdG8gZ2VuZXJhdGUgYSBUQ0IgZm9yIHRoZSBjbGFzcyBpZiBubyBzaGltIGV4aXN0cyBmb3IgaXQgY3VycmVudGx5LlxuICAgIHJldHVybiAhdGhpcy5maWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVPdmVycmlkZShzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogVG1wbEFzdE5vZGVbXXxudWxsIHtcbiAgICB0aGlzLmFzc2VydFBhdGgoc2ZQYXRoKTtcbiAgICBpZiAodGhpcy5maWxlRGF0YS50ZW1wbGF0ZU92ZXJyaWRlcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IHRoaXMuZmlsZURhdGEuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKG5vZGUpO1xuICAgIGlmICh0aGlzLmZpbGVEYXRhLnRlbXBsYXRlT3ZlcnJpZGVzLmhhcyh0ZW1wbGF0ZUlkKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZmlsZURhdGEudGVtcGxhdGVPdmVycmlkZXMuZ2V0KHRlbXBsYXRlSWQpITtcbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJlY29yZFNoaW1EYXRhKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGRhdGE6IFNoaW1UeXBlQ2hlY2tpbmdEYXRhKTogdm9pZCB7XG4gICAgdGhpcy5hc3NlcnRQYXRoKHNmUGF0aCk7XG5cbiAgICAvLyBQcmV2aW91cyB0eXBlLWNoZWNraW5nIHN0YXRlIG1heSBoYXZlIHJlcXVpcmVkIHRoZSB1c2Ugb2YgaW5saW5lcyAoYXNzdW1pbmcgdGhleSB3ZXJlXG4gICAgLy8gc3VwcG9ydGVkKS4gSWYgdGhlIGN1cnJlbnQgb3BlcmF0aW9uIGFsc28gcmVxdWlyZXMgaW5saW5lcywgdGhpcyBwcmVzZW50cyBhIHByb2JsZW06XG4gICAgLy8gZ2VuZXJhdGluZyBuZXcgaW5saW5lcyBtYXkgaW52YWxpZGF0ZSBhbnkgb2xkIGlubGluZXMgdGhhdCBvbGQgc3RhdGUgZGVwZW5kcyBvbi5cbiAgICAvL1xuICAgIC8vIFJhdGhlciB0aGFuIHJlc29sdmUgdGhpcyBpc3N1ZSBieSB0cmFja2luZyBzcGVjaWZpYyBkZXBlbmRlbmNpZXMgb24gaW5saW5lcywgaWYgdGhlIG5ldyBzdGF0ZVxuICAgIC8vIHJlbGllcyBvbiBpbmxpbmVzLCBhbnkgb2xkIHN0YXRlIHRoYXQgcmVsaWVkIG9uIHRoZW0gaXMgc2ltcGx5IGNsZWFyZWQuIFRoaXMgaGFwcGVucyB3aGVuIHRoZVxuICAgIC8vIGZpcnN0IG5ldyBzdGF0ZSB0aGF0IHVzZXMgaW5saW5lcyBpcyBlbmNvdW50ZXJlZC5cbiAgICBpZiAoZGF0YS5oYXNJbmxpbmVzICYmICF0aGlzLnNlZW5JbmxpbmVzKSB7XG4gICAgICB0aGlzLmltcGwuY2xlYXJBbGxTaGltRGF0YVVzaW5nSW5saW5lcygpO1xuICAgICAgdGhpcy5zZWVuSW5saW5lcyA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5maWxlRGF0YS5zaGltRGF0YS5zZXQoZGF0YS5wYXRoLCBkYXRhKTtcbiAgICBpZiAoZGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICB0aGlzLmZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZENvbXBsZXRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydFBhdGgoc2ZQYXRoKTtcbiAgICB0aGlzLmZpbGVEYXRhLmlzQ29tcGxldGUgPSB0cnVlO1xuICB9XG59XG5cbi8qKlxuICogRHJpdmVzIGEgYFR5cGVDaGVja0NvbnRleHRgIHRvIGdlbmVyYXRlIHR5cGUtY2hlY2tpbmcgY29kZSBlZmZpY2llbnRseSBmb3Igb25seSB0aG9zZSBjb21wb25lbnRzXG4gKiB3aGljaCBtYXAgdG8gYSBzaW5nbGUgc2hpbSBvZiBhIHNpbmdsZSBpbnB1dCBmaWxlLlxuICovXG5jbGFzcyBTaW5nbGVTaGltVHlwZUNoZWNraW5nSG9zdCBleHRlbmRzIFNpbmdsZUZpbGVUeXBlQ2hlY2tpbmdIb3N0IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBmaWxlRGF0YTogRmlsZVR5cGVDaGVja2luZ0RhdGEsIHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgICBpbXBsOiBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbCwgcHJpdmF0ZSBzaGltUGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICBzdXBlcihzZlBhdGgsIGZpbGVEYXRhLCBzdHJhdGVneSwgaW1wbCk7XG4gIH1cblxuICBzaG91bGRDaGVja05vZGUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnNmUGF0aCAhPT0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IGdlbmVyYXRlIGEgVENCIGZvciB0aGUgY29tcG9uZW50IGlmIGl0IG1hcHMgdG8gdGhlIHJlcXVlc3RlZCBzaGltIGZpbGUuXG4gICAgY29uc3Qgc2hpbVBhdGggPSB0aGlzLnN0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGlmIChzaGltUGF0aCAhPT0gdGhpcy5zaGltUGF0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE9ubHkgbmVlZCB0byBnZW5lcmF0ZSBhIFRDQiBmb3IgdGhlIGNsYXNzIGlmIG5vIHNoaW0gZXhpc3RzIGZvciBpdCBjdXJyZW50bHkuXG4gICAgcmV0dXJuICF0aGlzLmZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCk7XG4gIH1cbn1cblxuLyoqXG4gKiBDYWNoZWQgc2NvcGUgaW5mb3JtYXRpb24gZm9yIGEgY29tcG9uZW50LlxuICovXG5pbnRlcmZhY2UgU2NvcGVEYXRhIHtcbiAgZGlyZWN0aXZlczogRGlyZWN0aXZlSW5TY29wZVtdO1xuICBwaXBlczogUGlwZUluU2NvcGVbXTtcbiAgaXNQb2lzb25lZDogYm9vbGVhbjtcbn1cbiJdfQ==