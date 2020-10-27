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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/checker", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/completion", "@angular/compiler-cli/src/ngtsc/typecheck/src/context", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/source", "@angular/compiler-cli/src/ngtsc/typecheck/src/template_symbol_builder"], factory);
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
            var tcb = diagnostics_1.findTypeCheckBlock(shimSf, id);
            if (tcb === null) {
                // Try for an inline block.
                var inlineSf = file_system_1.getSourceFileOrError(program, sfPath);
                tcb = diagnostics_1.findTypeCheckBlock(inlineSf, id);
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
            if (errors !== null) {
                return { nodes: nodes, errors: errors };
            }
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
            return { nodes: nodes };
        };
        /**
         * Retrieve type-checking diagnostics from the given `ts.SourceFile` using the most recent
         * type-checking program.
         */
        TemplateTypeCheckerImpl.prototype.getDiagnosticsForFile = function (sf, optimizeFor) {
            var e_2, _a;
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
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
            var e_3, _a;
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
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
            var e_4, _a, e_5, _b;
            try {
                for (var _c = tslib_1.__values(this.state.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var fileData = _d.value;
                    if (!fileData.hasInlines) {
                        continue;
                    }
                    try {
                        for (var _e = (e_5 = void 0, tslib_1.__values(fileData.shimData.entries())), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var _g = tslib_1.__read(_f.value, 2), shimFile = _g[0], shimData = _g[1];
                            if (shimData.hasInlines) {
                                fileData.shimData.delete(shimFile);
                            }
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    fileData.hasInlines = false;
                    fileData.isComplete = false;
                    this.isComplete = false;
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_4) throw e_4.error; }
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
            var e_6, _a, e_7, _b;
            if (this.scopeCache.has(component)) {
                return this.scopeCache.get(component);
            }
            if (!reflection_1.isNamedClassDeclaration(component)) {
                throw new Error("AssertionError: components must have names");
            }
            var data = {
                directives: [],
                pipes: [],
            };
            var scope = this.componentScopeReader.getScopeForComponent(component);
            if (scope === null || scope === 'error') {
                return null;
            }
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
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_6) throw e_6.error; }
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
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_7) throw e_7.error; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL3NyYy9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBa0k7SUFHbEksMkVBQStGO0lBRy9GLHlFQUF5RTtJQUV6RSwrREFBbUM7SUFDbkMsa0ZBQThEO0lBQzlELHFFQUFtTztJQUluTyx1RkFBOEM7SUFDOUMsaUZBQW1IO0lBQ25ILHlGQUFzSDtJQUN0SCwrRUFBK0M7SUFDL0MsaUhBQXdEO0lBRXhEOzs7O09BSUc7SUFDSDtRQWdDRSxpQ0FDWSxlQUEyQixFQUMxQixvQkFBaUQsRUFDbEQsZ0JBQXlDLEVBQVUsTUFBMEIsRUFDN0UsVUFBNEIsRUFBVSxTQUF5QixFQUMvRCxZQUEyRCxFQUMzRCxVQUEyRCxFQUNsRCxvQkFBMEM7WUFObkQsb0JBQWUsR0FBZixlQUFlLENBQVk7WUFDMUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUE2QjtZQUNsRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXlCO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7WUFDN0UsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUMvRCxpQkFBWSxHQUFaLFlBQVksQ0FBK0M7WUFDM0QsZUFBVSxHQUFWLFVBQVUsQ0FBaUQ7WUFDbEQseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtZQXRDdkQsVUFBSyxHQUFHLElBQUksR0FBRyxFQUF3QyxDQUFDO1lBRWhFOzs7Ozs7ZUFNRztZQUNLLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXlDLENBQUM7WUFDM0U7Ozs7OztlQU1HO1lBQ0ssdUJBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUM7WUFFM0U7Ozs7Ozs7ZUFPRztZQUNLLGVB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LElBQUksQ0FBQztRQUNsQyxDQUFDO1FBQ0gsaUNBQUM7SUFBRCxDQUFDLEFBbkVELElBbUVDO0lBRUQ7OztPQUdHO0lBQ0g7UUFBeUMsc0RBQTBCO1FBQ2pFLG9DQUNJLE1BQXNCLEVBQUUsUUFBOEIsRUFBRSxRQUFxQyxFQUM3RixJQUE2QixFQUFVLFFBQXdCO1lBRm5FLFlBR0Usa0JBQU0sTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQ3hDO1lBRjBDLGNBQVEsR0FBUixRQUFRLENBQWdCOztRQUVuRSxDQUFDO1FBRUQsb0RBQWUsR0FBZixVQUFnQixJQUF5QjtZQUN2QyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssb0NBQXNCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUU7Z0JBQ2hFLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFFRCwrRUFBK0U7WUFDL0UsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxRCxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUM5QixPQUFPLEtBQUssQ0FBQzthQUNkO1lBRUQsZ0ZBQWdGO1lBQ2hGLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNILGlDQUFDO0lBQUQsQ0FBQyxBQXJCRCxDQUF5QywwQkFBMEIsR0FxQmxFIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBQYXJzZUVycm9yLCBwYXJzZVRlbXBsYXRlLCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRoLCBnZXRTb3VyY2VGaWxlT3JFcnJvcn0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvYXBpJztcbmltcG9ydCB7aXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXJ9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7aXNTaGltfSBmcm9tICcuLi8uLi9zaGltcyc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGVPck51bGx9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtDb21wbGV0aW9uS2luZCwgRGlyZWN0aXZlSW5TY29wZSwgR2xvYmFsQ29tcGxldGlvbiwgT3B0aW1pemVGb3IsIFBpcGVJblNjb3BlLCBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlciwgU3ltYm9sLCBUZW1wbGF0ZUlkLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2tpbmdDb25maWcsIFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSwgVXBkYXRlTW9kZX0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7VGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi9kaWFnbm9zdGljcyc7XG5cbmltcG9ydCB7RXhwcmVzc2lvbklkZW50aWZpZXIsIGZpbmRGaXJzdE1hdGNoaW5nTm9kZX0gZnJvbSAnLi9jb21tZW50cyc7XG5pbXBvcnQge0NvbXBsZXRpb25FbmdpbmV9IGZyb20gJy4vY29tcGxldGlvbic7XG5pbXBvcnQge0lubGluaW5nTW9kZSwgU2hpbVR5cGVDaGVja2luZ0RhdGEsIFRlbXBsYXRlRGF0YSwgVHlwZUNoZWNrQ29udGV4dEltcGwsIFR5cGVDaGVja2luZ0hvc3R9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQge2ZpbmRUeXBlQ2hlY2tCbG9jaywgc2hvdWxkUmVwb3J0RGlhZ25vc3RpYywgVGVtcGxhdGVTb3VyY2VSZXNvbHZlciwgdHJhbnNsYXRlRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFuYWdlcn0gZnJvbSAnLi9zb3VyY2UnO1xuaW1wb3J0IHtTeW1ib2xCdWlsZGVyfSBmcm9tICcuL3RlbXBsYXRlX3N5bWJvbF9idWlsZGVyJztcblxuLyoqXG4gKiBQcmltYXJ5IHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgZW5naW5lLCB3aGljaCBwZXJmb3JtcyB0eXBlLWNoZWNraW5nIHVzaW5nIGFcbiAqIGBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3lgIGZvciB0eXBlLWNoZWNraW5nIHByb2dyYW0gbWFpbnRlbmFuY2UsIGFuZCB0aGVcbiAqIGBQcm9ncmFtVHlwZUNoZWNrQWRhcHRlcmAgZm9yIGdlbmVyYXRpb24gb2YgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBjb2RlLlxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwgaW1wbGVtZW50cyBUZW1wbGF0ZVR5cGVDaGVja2VyIHtcbiAgcHJpdmF0ZSBzdGF0ZSA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPigpO1xuXG4gIC8qKlxuICAgKiBTdG9yZXMgdGhlIGBDb21wbGV0aW9uRW5naW5lYCB3aGljaCBwb3dlcnMgYXV0b2NvbXBsZXRpb24gZm9yIGVhY2ggY29tcG9uZW50IGNsYXNzLlxuICAgKlxuICAgKiBNdXN0IGJlIGludmFsaWRhdGVkIHdoZW5ldmVyIHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZSBvciB0aGUgYHRzLlByb2dyYW1gIGNoYW5nZXMuIEludmFsaWRhdGlvblxuICAgKiBvbiB0ZW1wbGF0ZSBjaGFuZ2VzIGlzIHBlcmZvcm1lZCB3aXRoaW4gdGhpcyBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGluc3RhbmNlLiBXaGVuIHRoZVxuICAgKiBgdHMuUHJvZ3JhbWAgY2hhbmdlcywgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgYXMgYSB3aG9sZSBpcyBkZXN0cm95ZWQgYW5kIHJlcGxhY2VkLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wbGV0aW9uQ2FjaGUgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIENvbXBsZXRpb25FbmdpbmU+KCk7XG4gIC8qKlxuICAgKiBTdG9yZXMgdGhlIGBTeW1ib2xCdWlsZGVyYCB3aGljaCBjcmVhdGVzIHN5bWJvbHMgZm9yIGVhY2ggY29tcG9uZW50IGNsYXNzLlxuICAgKlxuICAgKiBNdXN0IGJlIGludmFsaWRhdGVkIHdoZW5ldmVyIHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZSBvciB0aGUgYHRzLlByb2dyYW1gIGNoYW5nZXMuIEludmFsaWRhdGlvblxuICAgKiBvbiB0ZW1wbGF0ZSBjaGFuZ2VzIGlzIHBlcmZvcm1lZCB3aXRoaW4gdGhpcyBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGluc3RhbmNlLiBXaGVuIHRoZVxuICAgKiBgdHMuUHJvZ3JhbWAgY2hhbmdlcywgdGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbGAgYXMgYSB3aG9sZSBpcyBkZXN0cm95ZWQgYW5kIHJlcGxhY2VkLlxuICAgKi9cbiAgcHJpdmF0ZSBzeW1ib2xCdWlsZGVyQ2FjaGUgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIFN5bWJvbEJ1aWxkZXI+KCk7XG5cbiAgLyoqXG4gICAqIFN0b3JlcyBkaXJlY3RpdmVzIGFuZCBwaXBlcyB0aGF0IGFyZSBpbiBzY29wZSBmb3IgZWFjaCBjb21wb25lbnQuXG4gICAqXG4gICAqIFVubGlrZSB0aGUgb3RoZXIgY2FjaGVzLCB0aGUgc2NvcGUgb2YgYSBjb21wb25lbnQgaXMgbm90IGFmZmVjdGVkIGJ5IGl0cyB0ZW1wbGF0ZSwgc28gdGhpc1xuICAgKiBjYWNoZSBkb2VzIG5vdCBuZWVkIHRvIGJlIGludmFsaWRhdGUgaWYgdGhlIHRlbXBsYXRlIGlzIG92ZXJyaWRkZW4uIEl0IHdpbGwgYmUgZGVzdHJveWVkIHdoZW5cbiAgICogdGhlIGB0cy5Qcm9ncmFtYCBjaGFuZ2VzIGFuZCB0aGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsYCBhcyBhIHdob2xlIGlzIGRlc3Ryb3llZCBhbmRcbiAgICogcmVwbGFjZWQuXG4gICAqL1xuICBwcml2YXRlIHNjb3BlQ2FjaGUgPSBuZXcgTWFwPHRzLkNsYXNzRGVjbGFyYXRpb24sIFNjb3BlRGF0YT4oKTtcblxuICBwcml2YXRlIGlzQ29tcGxldGUgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgb3JpZ2luYWxQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgcmVhZG9ubHkgdHlwZUNoZWNraW5nU3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNrQWRhcHRlcjogUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXIsIHByaXZhdGUgY29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWcsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgY29tcGlsZXJIb3N0OiBQaWNrPHRzLkNvbXBpbGVySG9zdCwgJ2dldENhbm9uaWNhbEZpbGVOYW1lJz4sXG4gICAgICBwcml2YXRlIHByaW9yQnVpbGQ6IEluY3JlbWVudGFsQnVpbGQ8dW5rbm93biwgRmlsZVR5cGVDaGVja2luZ0RhdGE+LFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBjb21wb25lbnRTY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIpIHt9XG5cbiAgcmVzZXRPdmVycmlkZXMoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBmaWxlUmVjb3JkIG9mIHRoaXMuc3RhdGUudmFsdWVzKCkpIHtcbiAgICAgIGlmIChmaWxlUmVjb3JkLnRlbXBsYXRlT3ZlcnJpZGVzICE9PSBudWxsKSB7XG4gICAgICAgIGZpbGVSZWNvcmQudGVtcGxhdGVPdmVycmlkZXMgPSBudWxsO1xuICAgICAgICBmaWxlUmVjb3JkLnNoaW1EYXRhLmNsZWFyKCk7XG4gICAgICAgIGZpbGVSZWNvcmQuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElkZWFsbHkgb25seSB0aG9zZSBjb21wb25lbnRzIHdpdGggb3ZlcnJpZGRlbiB0ZW1wbGF0ZXMgd291bGQgaGF2ZSB0aGVpciBjYWNoZXMgaW52YWxpZGF0ZWQsXG4gICAgLy8gYnV0IHRoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGxgIGRvZXMgbm90IHRyYWNrIHRoZSBjbGFzcyBmb3IgY29tcG9uZW50cyB3aXRoIG92ZXJyaWRlcy4gQXNcbiAgICAvLyBhIHF1aWNrIHdvcmthcm91bmQsIGNsZWFyIHRoZSBlbnRpcmUgY2FjaGUgaW5zdGVhZC5cbiAgICB0aGlzLmNvbXBsZXRpb25DYWNoZS5jbGVhcigpO1xuICAgIHRoaXMuc3ltYm9sQnVpbGRlckNhY2hlLmNsZWFyKCk7XG4gIH1cblxuICBnZXRUZW1wbGF0ZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUbXBsQXN0Tm9kZVtdfG51bGwge1xuICAgIGNvbnN0IHtkYXRhfSA9IHRoaXMuZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50KTtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLnRlbXBsYXRlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOlxuICAgICAge2RhdGE6IFRlbXBsYXRlRGF0YXxudWxsLCB0Y2I6IHRzLk5vZGV8bnVsbCwgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRofSB7XG4gICAgdGhpcy5lbnN1cmVTaGltRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBzZiA9IGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCk7XG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgY29uc3Qgc2hpbVBhdGggPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG5cbiAgICBjb25zdCBmaWxlUmVjb3JkID0gdGhpcy5nZXRGaWxlRGF0YShzZlBhdGgpO1xuXG4gICAgaWYgKCFmaWxlUmVjb3JkLnNoaW1EYXRhLmhhcyhzaGltUGF0aCkpIHtcbiAgICAgIHJldHVybiB7ZGF0YTogbnVsbCwgdGNiOiBudWxsLCBzaGltUGF0aH07XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKGNvbXBvbmVudCk7XG4gICAgY29uc3Qgc2hpbVJlY29yZCA9IGZpbGVSZWNvcmQuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSE7XG4gICAgY29uc3QgaWQgPSBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIuZ2V0VGVtcGxhdGVJZChjb21wb25lbnQpO1xuXG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpO1xuICAgIGNvbnN0IHNoaW1TZiA9IGdldFNvdXJjZUZpbGVPck51bGwocHJvZ3JhbSwgc2hpbVBhdGgpO1xuXG4gICAgaWYgKHNoaW1TZiA9PT0gbnVsbCB8fCAhZmlsZVJlY29yZC5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yOiBubyBzaGltIGZpbGUgaW4gcHJvZ3JhbTogJHtzaGltUGF0aH1gKTtcbiAgICB9XG5cbiAgICBsZXQgdGNiOiB0cy5Ob2RlfG51bGwgPSBmaW5kVHlwZUNoZWNrQmxvY2soc2hpbVNmLCBpZCk7XG5cbiAgICBpZiAodGNiID09PSBudWxsKSB7XG4gICAgICAvLyBUcnkgZm9yIGFuIGlubGluZSBibG9jay5cbiAgICAgIGNvbnN0IGlubGluZVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IocHJvZ3JhbSwgc2ZQYXRoKTtcbiAgICAgIHRjYiA9IGZpbmRUeXBlQ2hlY2tCbG9jayhpbmxpbmVTZiwgaWQpO1xuICAgIH1cblxuICAgIGxldCBkYXRhOiBUZW1wbGF0ZURhdGF8bnVsbCA9IG51bGw7XG4gICAgaWYgKHNoaW1SZWNvcmQudGVtcGxhdGVzLmhhcyh0ZW1wbGF0ZUlkKSkge1xuICAgICAgZGF0YSA9IHNoaW1SZWNvcmQudGVtcGxhdGVzLmdldCh0ZW1wbGF0ZUlkKSE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkYXRhLCB0Y2IsIHNoaW1QYXRofTtcbiAgfVxuXG4gIG92ZXJyaWRlQ29tcG9uZW50VGVtcGxhdGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCB0ZW1wbGF0ZTogc3RyaW5nKTpcbiAgICAgIHtub2RlczogVG1wbEFzdE5vZGVbXSwgZXJyb3JzPzogUGFyc2VFcnJvcltdfSB7XG4gICAgY29uc3Qge25vZGVzLCBlcnJvcnN9ID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgJ292ZXJyaWRlLmh0bWwnLCB7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICB9KTtcblxuICAgIGlmIChlcnJvcnMgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7bm9kZXMsIGVycm9yc307XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZVBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGNvbXBvbmVudC5nZXRTb3VyY2VGaWxlKCkpO1xuXG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuZ2V0RmlsZURhdGEoZmlsZVBhdGgpO1xuICAgIGNvbnN0IGlkID0gZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQoY29tcG9uZW50KTtcblxuICAgIGlmIChmaWxlUmVjb3JkLnRlbXBsYXRlT3ZlcnJpZGVzID09PSBudWxsKSB7XG4gICAgICBmaWxlUmVjb3JkLnRlbXBsYXRlT3ZlcnJpZGVzID0gbmV3IE1hcCgpO1xuICAgIH1cblxuICAgIGZpbGVSZWNvcmQudGVtcGxhdGVPdmVycmlkZXMuc2V0KGlkLCBub2Rlcyk7XG5cbiAgICAvLyBDbGVhciBkYXRhIGZvciB0aGUgc2hpbSBpbiBxdWVzdGlvbiwgc28gaXQnbGwgYmUgcmVnZW5lcmF0ZWQgb24gdGhlIG5leHQgcmVxdWVzdC5cbiAgICBjb25zdCBzaGltRmlsZSA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICBmaWxlUmVjb3JkLnNoaW1EYXRhLmRlbGV0ZShzaGltRmlsZSk7XG4gICAgZmlsZVJlY29yZC5pc0NvbXBsZXRlID0gZmFsc2U7XG4gICAgdGhpcy5pc0NvbXBsZXRlID0gZmFsc2U7XG5cbiAgICAvLyBPdmVycmlkaW5nIGEgY29tcG9uZW50J3MgdGVtcGxhdGUgaW52YWxpZGF0ZXMgaXRzIGNhY2hlZCByZXN1bHRzLlxuICAgIHRoaXMuY29tcGxldGlvbkNhY2hlLmRlbGV0ZShjb21wb25lbnQpO1xuICAgIHRoaXMuc3ltYm9sQnVpbGRlckNhY2hlLmRlbGV0ZShjb21wb25lbnQpO1xuXG4gICAgcmV0dXJuIHtub2Rlc307XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgdHlwZS1jaGVja2luZyBkaWFnbm9zdGljcyBmcm9tIHRoZSBnaXZlbiBgdHMuU291cmNlRmlsZWAgdXNpbmcgdGhlIG1vc3QgcmVjZW50XG4gICAqIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbS5cbiAgICovXG4gIGdldERpYWdub3N0aWNzRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBzd2l0Y2ggKG9wdGltaXplRm9yKSB7XG4gICAgICBjYXNlIE9wdGltaXplRm9yLldob2xlUHJvZ3JhbTpcbiAgICAgICAgdGhpcy5lbnN1cmVBbGxTaGltc0ZvckFsbEZpbGVzKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBPcHRpbWl6ZUZvci5TaW5nbGVGaWxlOlxuICAgICAgICB0aGlzLmVuc3VyZUFsbFNoaW1zRm9yT25lRmlsZShzZik7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGNvbnN0IGZpbGVSZWNvcmQgPSB0aGlzLnN0YXRlLmdldChzZlBhdGgpITtcblxuICAgIGNvbnN0IHR5cGVDaGVja1Byb2dyYW0gPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LmdldFByb2dyYW0oKTtcblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiAodHMuRGlhZ25vc3RpY3xudWxsKVtdID0gW107XG4gICAgaWYgKGZpbGVSZWNvcmQuaGFzSW5saW5lcykge1xuICAgICAgY29uc3QgaW5saW5lU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzZlBhdGgpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3MoaW5saW5lU2YpLm1hcChcbiAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IFtzaGltUGF0aCwgc2hpbVJlY29yZF0gb2YgZmlsZVJlY29yZC5zaGltRGF0YSkge1xuICAgICAgY29uc3Qgc2hpbVNmID0gZ2V0U291cmNlRmlsZU9yRXJyb3IodHlwZUNoZWNrUHJvZ3JhbSwgc2hpbVBhdGgpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2hpbVNmKS5tYXAoXG4gICAgICAgICAgZGlhZyA9PiBjb252ZXJ0RGlhZ25vc3RpYyhkaWFnLCBmaWxlUmVjb3JkLnNvdXJjZU1hbmFnZXIpKSk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnNoaW1SZWNvcmQuZ2VuZXNpc0RpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3MuZmlsdGVyKChkaWFnOiB0cy5EaWFnbm9zdGljfG51bGwpOiBkaWFnIGlzIHRzLkRpYWdub3N0aWMgPT4gZGlhZyAhPT0gbnVsbCk7XG4gIH1cblxuICBnZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHRoaXMuZW5zdXJlU2hpbUZvckNvbXBvbmVudChjb21wb25lbnQpO1xuXG4gICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gdGhpcy50eXBlQ2hlY2tpbmdTdHJhdGVneS5zaGltUGF0aEZvckNvbXBvbmVudChjb21wb25lbnQpO1xuXG4gICAgY29uc3QgZmlsZVJlY29yZCA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcblxuICAgIGlmICghZmlsZVJlY29yZC5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGZpbGVSZWNvcmQuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKGNvbXBvbmVudCk7XG4gICAgY29uc3Qgc2hpbVJlY29yZCA9IGZpbGVSZWNvcmQuc2hpbURhdGEuZ2V0KHNoaW1QYXRoKSE7XG5cbiAgICBjb25zdCB0eXBlQ2hlY2tQcm9ncmFtID0gdGhpcy50eXBlQ2hlY2tpbmdTdHJhdGVneS5nZXRQcm9ncmFtKCk7XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogKFRlbXBsYXRlRGlhZ25vc3RpY3xudWxsKVtdID0gW107XG4gICAgaWYgKHNoaW1SZWNvcmQuaGFzSW5saW5lcykge1xuICAgICAgY29uc3QgaW5saW5lU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzZlBhdGgpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3MoaW5saW5lU2YpLm1hcChcbiAgICAgICAgICBkaWFnID0+IGNvbnZlcnREaWFnbm9zdGljKGRpYWcsIGZpbGVSZWNvcmQuc291cmNlTWFuYWdlcikpKTtcbiAgICB9XG5cbiAgICBjb25zdCBzaGltU2YgPSBnZXRTb3VyY2VGaWxlT3JFcnJvcih0eXBlQ2hlY2tQcm9ncmFtLCBzaGltUGF0aCk7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi50eXBlQ2hlY2tQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2hpbVNmKS5tYXAoXG4gICAgICAgIGRpYWcgPT4gY29udmVydERpYWdub3N0aWMoZGlhZywgZmlsZVJlY29yZC5zb3VyY2VNYW5hZ2VyKSkpO1xuICAgIGRpYWdub3N0aWNzLnB1c2goLi4uc2hpbVJlY29yZC5nZW5lc2lzRGlhZ25vc3RpY3MpO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzLmZpbHRlcihcbiAgICAgICAgKGRpYWc6IFRlbXBsYXRlRGlhZ25vc3RpY3xudWxsKTogZGlhZyBpcyBUZW1wbGF0ZURpYWdub3N0aWMgPT5cbiAgICAgICAgICAgIGRpYWcgIT09IG51bGwgJiYgZGlhZy50ZW1wbGF0ZUlkID09PSB0ZW1wbGF0ZUlkKTtcbiAgfVxuXG4gIGdldFR5cGVDaGVja0Jsb2NrKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHRzLk5vZGV8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50KS50Y2I7XG4gIH1cblxuICBnZXRHbG9iYWxDb21wbGV0aW9ucyhjb250ZXh0OiBUbXBsQXN0VGVtcGxhdGV8bnVsbCwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIEdsb2JhbENvbXBsZXRpb258bnVsbCB7XG4gICAgY29uc3QgZW5naW5lID0gdGhpcy5nZXRPckNyZWF0ZUNvbXBsZXRpb25FbmdpbmUoY29tcG9uZW50KTtcbiAgICBpZiAoZW5naW5lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGVuZ2luZS5nZXRHbG9iYWxDb21wbGV0aW9ucyhjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0T3JDcmVhdGVDb21wbGV0aW9uRW5naW5lKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IENvbXBsZXRpb25FbmdpbmV8bnVsbCB7XG4gICAgaWYgKHRoaXMuY29tcGxldGlvbkNhY2hlLmhhcyhjb21wb25lbnQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb21wbGV0aW9uQ2FjaGUuZ2V0KGNvbXBvbmVudCkhO1xuICAgIH1cblxuICAgIGNvbnN0IHt0Y2IsIGRhdGEsIHNoaW1QYXRofSA9IHRoaXMuZ2V0TGF0ZXN0Q29tcG9uZW50U3RhdGUoY29tcG9uZW50KTtcbiAgICBpZiAodGNiID09PSBudWxsIHx8IGRhdGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGVuZ2luZSA9IG5ldyBDb21wbGV0aW9uRW5naW5lKHRjYiwgZGF0YSwgc2hpbVBhdGgpO1xuICAgIHRoaXMuY29tcGxldGlvbkNhY2hlLnNldChjb21wb25lbnQsIGVuZ2luZSk7XG4gICAgcmV0dXJuIGVuZ2luZTtcbiAgfVxuXG4gIHByaXZhdGUgbWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5oYXMoc2ZQYXRoKSkge1xuICAgICAgY29uc3QgZXhpc3RpbmdSZXN1bHRzID0gdGhpcy5zdGF0ZS5nZXQoc2ZQYXRoKSE7XG4gICAgICBpZiAoZXhpc3RpbmdSZXN1bHRzLnRlbXBsYXRlT3ZlcnJpZGVzICE9PSBudWxsKSB7XG4gICAgICAgIC8vIENhbm5vdCBhZG9wdCBwcmlvciByZXN1bHRzIGlmIHRlbXBsYXRlIG92ZXJyaWRlcyBoYXZlIGJlZW4gcmVxdWVzdGVkLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChleGlzdGluZ1Jlc3VsdHMuaXNDb21wbGV0ZSkge1xuICAgICAgICAvLyBBbGwgZGF0YSBmb3IgdGhpcyBmaWxlIGhhcyBhbHJlYWR5IGJlZW4gZ2VuZXJhdGVkLCBzbyBubyBuZWVkIHRvIGFkb3B0IGFueXRoaW5nLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcHJldmlvdXNSZXN1bHRzID0gdGhpcy5wcmlvckJ1aWxkLnByaW9yVHlwZUNoZWNraW5nUmVzdWx0c0ZvcihzZik7XG4gICAgaWYgKHByZXZpb3VzUmVzdWx0cyA9PT0gbnVsbCB8fCAhcHJldmlvdXNSZXN1bHRzLmlzQ29tcGxldGUgfHxcbiAgICAgICAgcHJldmlvdXNSZXN1bHRzLnRlbXBsYXRlT3ZlcnJpZGVzICE9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5zZXQoc2ZQYXRoLCBwcmV2aW91c1Jlc3VsdHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbGxTaGltc0ZvckFsbEZpbGVzKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzQ29tcGxldGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBob3N0ID0gbmV3IFdob2xlUHJvZ3JhbVR5cGVDaGVja2luZ0hvc3QodGhpcyk7XG4gICAgY29uc3QgY3R4ID0gdGhpcy5uZXdDb250ZXh0KGhvc3QpO1xuXG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLm9yaWdpbmFsUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaXNTaGltKHNmKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5tYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZik7XG5cbiAgICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgICBpZiAoZmlsZURhdGEuaXNDb21wbGV0ZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50eXBlQ2hlY2tBZGFwdGVyLnR5cGVDaGVjayhzZiwgY3R4KTtcblxuICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVGcm9tQ29udGV4dChjdHgpO1xuICAgIHRoaXMuaXNDb21wbGV0ZSA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFsbFNoaW1zRm9yT25lRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMubWF5YmVBZG9wdFByaW9yUmVzdWx0c0ZvckZpbGUoc2YpO1xuXG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICBpZiAoZmlsZURhdGEuaXNDb21wbGV0ZSkge1xuICAgICAgLy8gQWxsIGRhdGEgZm9yIHRoaXMgZmlsZSBpcyBwcmVzZW50IGFuZCBhY2NvdW50ZWQgZm9yIGFscmVhZHkuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgaG9zdCA9IG5ldyBTaW5nbGVGaWxlVHlwZUNoZWNraW5nSG9zdChzZlBhdGgsIGZpbGVEYXRhLCB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LCB0aGlzKTtcbiAgICBjb25zdCBjdHggPSB0aGlzLm5ld0NvbnRleHQoaG9zdCk7XG5cbiAgICB0aGlzLnR5cGVDaGVja0FkYXB0ZXIudHlwZUNoZWNrKHNmLCBjdHgpO1xuXG4gICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG5cbiAgICB0aGlzLnVwZGF0ZUZyb21Db250ZXh0KGN0eCk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZVNoaW1Gb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgY29uc3Qgc2YgPSBjb21wb25lbnQuZ2V0U291cmNlRmlsZSgpO1xuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuXG4gICAgdGhpcy5tYXliZUFkb3B0UHJpb3JSZXN1bHRzRm9yRmlsZShzZik7XG5cbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuZ2V0RmlsZURhdGEoc2ZQYXRoKTtcbiAgICBjb25zdCBzaGltUGF0aCA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQoY29tcG9uZW50KTtcblxuICAgIGlmIChmaWxlRGF0YS5zaGltRGF0YS5oYXMoc2hpbVBhdGgpKSB7XG4gICAgICAvLyBBbGwgZGF0YSBmb3IgdGhpcyBjb21wb25lbnQgaXMgYXZhaWxhYmxlLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGhvc3QgPVxuICAgICAgICBuZXcgU2luZ2xlU2hpbVR5cGVDaGVja2luZ0hvc3Qoc2ZQYXRoLCBmaWxlRGF0YSwgdGhpcy50eXBlQ2hlY2tpbmdTdHJhdGVneSwgdGhpcywgc2hpbVBhdGgpO1xuICAgIGNvbnN0IGN0eCA9IHRoaXMubmV3Q29udGV4dChob3N0KTtcblxuICAgIHRoaXMudHlwZUNoZWNrQWRhcHRlci50eXBlQ2hlY2soc2YsIGN0eCk7XG4gICAgdGhpcy51cGRhdGVGcm9tQ29udGV4dChjdHgpO1xuICB9XG5cbiAgcHJpdmF0ZSBuZXdDb250ZXh0KGhvc3Q6IFR5cGVDaGVja2luZ0hvc3QpOiBUeXBlQ2hlY2tDb250ZXh0SW1wbCB7XG4gICAgY29uc3QgaW5saW5pbmcgPSB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucyA/IElubGluaW5nTW9kZS5JbmxpbmVPcHMgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBJbmxpbmluZ01vZGUuRXJyb3I7XG4gICAgcmV0dXJuIG5ldyBUeXBlQ2hlY2tDb250ZXh0SW1wbChcbiAgICAgICAgdGhpcy5jb25maWcsIHRoaXMuY29tcGlsZXJIb3N0LCB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMucmVmbGVjdG9yLFxuICAgICAgICBob3N0LCBpbmxpbmluZyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFueSBzaGltIGRhdGEgdGhhdCBkZXBlbmRzIG9uIGlubGluZSBvcGVyYXRpb25zIGFwcGxpZWQgdG8gdGhlIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbS5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgdXNlZnVsIGlmIG5ldyBpbmxpbmVzIG5lZWQgdG8gYmUgYXBwbGllZCwgYW5kIGl0J3Mgbm90IHBvc3NpYmxlIHRvIGd1YXJhbnRlZSB0aGF0XG4gICAqIHRoZXkgd29uJ3Qgb3ZlcndyaXRlIG9yIGNvcnJ1cHQgZXhpc3RpbmcgaW5saW5lcyB0aGF0IGFyZSB1c2VkIGJ5IHN1Y2ggc2hpbXMuXG4gICAqL1xuICBjbGVhckFsbFNoaW1EYXRhVXNpbmdJbmxpbmVzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZmlsZURhdGEgb2YgdGhpcy5zdGF0ZS52YWx1ZXMoKSkge1xuICAgICAgaWYgKCFmaWxlRGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IFtzaGltRmlsZSwgc2hpbURhdGFdIG9mIGZpbGVEYXRhLnNoaW1EYXRhLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAoc2hpbURhdGEuaGFzSW5saW5lcykge1xuICAgICAgICAgIGZpbGVEYXRhLnNoaW1EYXRhLmRlbGV0ZShzaGltRmlsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZmlsZURhdGEuaGFzSW5saW5lcyA9IGZhbHNlO1xuICAgICAgZmlsZURhdGEuaXNDb21wbGV0ZSA9IGZhbHNlO1xuICAgICAgdGhpcy5pc0NvbXBsZXRlID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVGcm9tQ29udGV4dChjdHg6IFR5cGVDaGVja0NvbnRleHRJbXBsKTogdm9pZCB7XG4gICAgY29uc3QgdXBkYXRlcyA9IGN0eC5maW5hbGl6ZSgpO1xuICAgIHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kudXBkYXRlRmlsZXModXBkYXRlcywgVXBkYXRlTW9kZS5JbmNyZW1lbnRhbCk7XG4gICAgdGhpcy5wcmlvckJ1aWxkLnJlY29yZFN1Y2Nlc3NmdWxUeXBlQ2hlY2sodGhpcy5zdGF0ZSk7XG4gIH1cblxuICBnZXRGaWxlRGF0YShwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhIHtcbiAgICBpZiAoIXRoaXMuc3RhdGUuaGFzKHBhdGgpKSB7XG4gICAgICB0aGlzLnN0YXRlLnNldChwYXRoLCB7XG4gICAgICAgIGhhc0lubGluZXM6IGZhbHNlLFxuICAgICAgICB0ZW1wbGF0ZU92ZXJyaWRlczogbnVsbCxcbiAgICAgICAgc291cmNlTWFuYWdlcjogbmV3IFRlbXBsYXRlU291cmNlTWFuYWdlcigpLFxuICAgICAgICBpc0NvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgc2hpbURhdGE6IG5ldyBNYXAoKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5nZXQocGF0aCkhO1xuICB9XG5cbiAgZ2V0U3ltYm9sT2ZOb2RlKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU3ltYm9sfG51bGwge1xuICAgIGNvbnN0IGJ1aWxkZXIgPSB0aGlzLmdldE9yQ3JlYXRlU3ltYm9sQnVpbGRlcihjb21wb25lbnQpO1xuICAgIGlmIChidWlsZGVyID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGJ1aWxkZXIuZ2V0U3ltYm9sKG5vZGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRPckNyZWF0ZVN5bWJvbEJ1aWxkZXIoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU3ltYm9sQnVpbGRlcnxudWxsIHtcbiAgICBpZiAodGhpcy5zeW1ib2xCdWlsZGVyQ2FjaGUuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5nZXQoY29tcG9uZW50KSE7XG4gICAgfVxuXG4gICAgY29uc3Qge3RjYiwgZGF0YSwgc2hpbVBhdGh9ID0gdGhpcy5nZXRMYXRlc3RDb21wb25lbnRTdGF0ZShjb21wb25lbnQpO1xuICAgIGlmICh0Y2IgPT09IG51bGwgfHwgZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgYnVpbGRlciA9IG5ldyBTeW1ib2xCdWlsZGVyKFxuICAgICAgICBzaGltUGF0aCwgdGNiLCBkYXRhLCB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLFxuICAgICAgICAoKSA9PiB0aGlzLnR5cGVDaGVja2luZ1N0cmF0ZWd5LmdldFByb2dyYW0oKS5nZXRUeXBlQ2hlY2tlcigpKTtcbiAgICB0aGlzLnN5bWJvbEJ1aWxkZXJDYWNoZS5zZXQoY29tcG9uZW50LCBidWlsZGVyKTtcbiAgICByZXR1cm4gYnVpbGRlcjtcbiAgfVxuXG4gIGdldERpcmVjdGl2ZXNJblNjb3BlKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IERpcmVjdGl2ZUluU2NvcGVbXXxudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRTY29wZURhdGEoY29tcG9uZW50KTtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLmRpcmVjdGl2ZXM7XG4gIH1cblxuICBnZXRQaXBlc0luU2NvcGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogUGlwZUluU2NvcGVbXXxudWxsIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXRTY29wZURhdGEoY29tcG9uZW50KTtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBkYXRhLnBpcGVzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRTY29wZURhdGEoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU2NvcGVEYXRhfG51bGwge1xuICAgIGlmICh0aGlzLnNjb3BlQ2FjaGUuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnNjb3BlQ2FjaGUuZ2V0KGNvbXBvbmVudCkhO1xuICAgIH1cblxuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oY29tcG9uZW50KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogY29tcG9uZW50cyBtdXN0IGhhdmUgbmFtZXNgKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhOiBTY29wZURhdGEgPSB7XG4gICAgICBkaXJlY3RpdmVzOiBbXSxcbiAgICAgIHBpcGVzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmNvbXBvbmVudFNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgaWYgKHNjb3BlID09PSBudWxsIHx8IHNjb3BlID09PSAnZXJyb3InKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlQ2hlY2tlciA9IHRoaXMudHlwZUNoZWNraW5nU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpLmdldFR5cGVDaGVja2VyKCk7XG4gICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgaWYgKGRpci5zZWxlY3RvciA9PT0gbnVsbCkge1xuICAgICAgICAvLyBTa2lwIHRoaXMgZGlyZWN0aXZlLCBpdCBjYW4ndCBiZSBhZGRlZCB0byBhIHRlbXBsYXRlIGFueXdheS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCB0c1N5bWJvbCA9IHR5cGVDaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZGlyLnJlZi5ub2RlLm5hbWUpO1xuICAgICAgaWYgKHRzU3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBkYXRhLmRpcmVjdGl2ZXMucHVzaCh7XG4gICAgICAgIGlzQ29tcG9uZW50OiBkaXIuaXNDb21wb25lbnQsXG4gICAgICAgIHNlbGVjdG9yOiBkaXIuc2VsZWN0b3IsXG4gICAgICAgIHRzU3ltYm9sLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBwaXBlIG9mIHNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICBjb25zdCB0c1N5bWJvbCA9IHR5cGVDaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24ocGlwZS5yZWYubm9kZS5uYW1lKTtcbiAgICAgIGlmICh0c1N5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZGF0YS5waXBlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogcGlwZS5uYW1lLFxuICAgICAgICB0c1N5bWJvbCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuc2NvcGVDYWNoZS5zZXQoY29tcG9uZW50LCBkYXRhKTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb252ZXJ0RGlhZ25vc3RpYyhcbiAgICBkaWFnOiB0cy5EaWFnbm9zdGljLCBzb3VyY2VSZXNvbHZlcjogVGVtcGxhdGVTb3VyY2VSZXNvbHZlcik6IFRlbXBsYXRlRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKCFzaG91bGRSZXBvcnREaWFnbm9zdGljKGRpYWcpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgcmV0dXJuIHRyYW5zbGF0ZURpYWdub3N0aWMoZGlhZywgc291cmNlUmVzb2x2ZXIpO1xufVxuXG4vKipcbiAqIERhdGEgZm9yIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgcmVsYXRlZCB0byBhIHNwZWNpZmljIGlucHV0IGZpbGUgaW4gdGhlIHVzZXIncyBwcm9ncmFtICh3aGljaFxuICogY29udGFpbnMgY29tcG9uZW50cyB0byBiZSBjaGVja2VkKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaWxlVHlwZUNoZWNraW5nRGF0YSB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSB0eXBlLWNoZWNraW5nIHNoaW0gcmVxdWlyZWQgYW55IGlubGluZSBjaGFuZ2VzIHRvIHRoZSBvcmlnaW5hbCBmaWxlLCB3aGljaCBhZmZlY3RzXG4gICAqIHdoZXRoZXIgdGhlIHNoaW0gY2FuIGJlIHJldXNlZC5cbiAgICovXG4gIGhhc0lubGluZXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFNvdXJjZSBtYXBwaW5nIGluZm9ybWF0aW9uIGZvciBtYXBwaW5nIGRpYWdub3N0aWNzIGZyb20gaW5saW5lZCB0eXBlIGNoZWNrIGJsb2NrcyBiYWNrIHRvIHRoZVxuICAgKiBvcmlnaW5hbCB0ZW1wbGF0ZS5cbiAgICovXG4gIHNvdXJjZU1hbmFnZXI6IFRlbXBsYXRlU291cmNlTWFuYWdlcjtcblxuICAvKipcbiAgICogTWFwIG9mIHRlbXBsYXRlIG92ZXJyaWRlcyBhcHBsaWVkIHRvIGFueSBjb21wb25lbnRzIGluIHRoaXMgaW5wdXQgZmlsZS5cbiAgICovXG4gIHRlbXBsYXRlT3ZlcnJpZGVzOiBNYXA8VGVtcGxhdGVJZCwgVG1wbEFzdE5vZGVbXT58bnVsbDtcblxuICAvKipcbiAgICogRGF0YSBmb3IgZWFjaCBzaGltIGdlbmVyYXRlZCBmcm9tIHRoaXMgaW5wdXQgZmlsZS5cbiAgICpcbiAgICogQSBzaW5nbGUgaW5wdXQgZmlsZSB3aWxsIGdlbmVyYXRlIG9uZSBvciBtb3JlIHNoaW0gZmlsZXMgdGhhdCBhY3R1YWxseSBjb250YWluIHRlbXBsYXRlXG4gICAqIHR5cGUtY2hlY2tpbmcgY29kZS5cbiAgICovXG4gIHNoaW1EYXRhOiBNYXA8QWJzb2x1dGVGc1BhdGgsIFNoaW1UeXBlQ2hlY2tpbmdEYXRhPjtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2VyIGlzIGNlcnRhaW4gdGhhdCBhbGwgY29tcG9uZW50cyBmcm9tIHRoaXMgaW5wdXQgZmlsZSBoYXZlIGhhZFxuICAgKiB0eXBlLWNoZWNraW5nIGNvZGUgZ2VuZXJhdGVkIGludG8gc2hpbXMuXG4gICAqL1xuICBpc0NvbXBsZXRlOiBib29sZWFuO1xufVxuXG4vKipcbiAqIERyaXZlcyBhIGBUeXBlQ2hlY2tDb250ZXh0YCB0byBnZW5lcmF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZm9yIGV2ZXJ5IGNvbXBvbmVudCBpbiB0aGUgcHJvZ3JhbS5cbiAqL1xuY2xhc3MgV2hvbGVQcm9ncmFtVHlwZUNoZWNraW5nSG9zdCBpbXBsZW1lbnRzIFR5cGVDaGVja2luZ0hvc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGltcGw6IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsKSB7fVxuXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlciB7XG4gICAgcmV0dXJuIHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpLnNvdXJjZU1hbmFnZXI7XG4gIH1cblxuICBzaG91bGRDaGVja0NvbXBvbmVudChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZmlsZURhdGEgPSB0aGlzLmltcGwuZ2V0RmlsZURhdGEoYWJzb2x1dGVGcm9tU291cmNlRmlsZShub2RlLmdldFNvdXJjZUZpbGUoKSkpO1xuICAgIGNvbnN0IHNoaW1QYXRoID0gdGhpcy5pbXBsLnR5cGVDaGVja2luZ1N0cmF0ZWd5LnNoaW1QYXRoRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIC8vIFRoZSBjb21wb25lbnQgbmVlZHMgdG8gYmUgY2hlY2tlZCB1bmxlc3MgdGhlIHNoaW0gd2hpY2ggd291bGQgY29udGFpbiBpdCBhbHJlYWR5IGV4aXN0cy5cbiAgICByZXR1cm4gIWZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCk7XG4gIH1cblxuICBnZXRUZW1wbGF0ZU92ZXJyaWRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUbXBsQXN0Tm9kZVtdfG51bGwge1xuICAgIGNvbnN0IGZpbGVEYXRhID0gdGhpcy5pbXBsLmdldEZpbGVEYXRhKHNmUGF0aCk7XG4gICAgaWYgKGZpbGVEYXRhLnRlbXBsYXRlT3ZlcnJpZGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gZmlsZURhdGEuc291cmNlTWFuYWdlci5nZXRUZW1wbGF0ZUlkKG5vZGUpO1xuICAgIGlmIChmaWxlRGF0YS50ZW1wbGF0ZU92ZXJyaWRlcy5oYXModGVtcGxhdGVJZCkpIHtcbiAgICAgIHJldHVybiBmaWxlRGF0YS50ZW1wbGF0ZU92ZXJyaWRlcy5nZXQodGVtcGxhdGVJZCkhO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBmaWxlRGF0YSA9IHRoaXMuaW1wbC5nZXRGaWxlRGF0YShzZlBhdGgpO1xuICAgIGZpbGVEYXRhLnNoaW1EYXRhLnNldChkYXRhLnBhdGgsIGRhdGEpO1xuICAgIGlmIChkYXRhLmhhc0lubGluZXMpIHtcbiAgICAgIGZpbGVEYXRhLmhhc0lubGluZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJlY29yZENvbXBsZXRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgICB0aGlzLmltcGwuZ2V0RmlsZURhdGEoc2ZQYXRoKS5pc0NvbXBsZXRlID0gdHJ1ZTtcbiAgfVxufVxuXG4vKipcbiAqIERyaXZlcyBhIGBUeXBlQ2hlY2tDb250ZXh0YCB0byBnZW5lcmF0ZSB0eXBlLWNoZWNraW5nIGNvZGUgZWZmaWNpZW50bHkgZm9yIGEgc2luZ2xlIGlucHV0IGZpbGUuXG4gKi9cbmNsYXNzIFNpbmdsZUZpbGVUeXBlQ2hlY2tpbmdIb3N0IGltcGxlbWVudHMgVHlwZUNoZWNraW5nSG9zdCB7XG4gIHByaXZhdGUgc2VlbklubGluZXMgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBzZlBhdGg6IEFic29sdXRlRnNQYXRoLCBwcm90ZWN0ZWQgZmlsZURhdGE6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhLFxuICAgICAgcHJvdGVjdGVkIHN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksIHByb3RlY3RlZCBpbXBsOiBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbCkge31cblxuICBwcml2YXRlIGFzc2VydFBhdGgoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNmUGF0aCAhPT0gc2ZQYXRoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBxdWVyeWluZyBUeXBlQ2hlY2tpbmdIb3N0IG91dHNpZGUgb2YgYXNzaWduZWQgZmlsZWApO1xuICAgIH1cbiAgfVxuXG4gIGdldFNvdXJjZU1hbmFnZXIoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFRlbXBsYXRlU291cmNlTWFuYWdlciB7XG4gICAgdGhpcy5hc3NlcnRQYXRoKHNmUGF0aCk7XG4gICAgcmV0dXJuIHRoaXMuZmlsZURhdGEuc291cmNlTWFuYWdlcjtcbiAgfVxuXG4gIHNob3VsZENoZWNrQ29tcG9uZW50KG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5zZlBhdGggIT09IGFic29sdXRlRnJvbVNvdXJjZUZpbGUobm9kZS5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHNoaW1QYXRoID0gdGhpcy5zdHJhdGVneS5zaGltUGF0aEZvckNvbXBvbmVudChub2RlKTtcblxuICAgIC8vIE9ubHkgbmVlZCB0byBnZW5lcmF0ZSBhIFRDQiBmb3IgdGhlIGNsYXNzIGlmIG5vIHNoaW0gZXhpc3RzIGZvciBpdCBjdXJyZW50bHkuXG4gICAgcmV0dXJuICF0aGlzLmZpbGVEYXRhLnNoaW1EYXRhLmhhcyhzaGltUGF0aCk7XG4gIH1cblxuICBnZXRUZW1wbGF0ZU92ZXJyaWRlKHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUbXBsQXN0Tm9kZVtdfG51bGwge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuICAgIGlmICh0aGlzLmZpbGVEYXRhLnRlbXBsYXRlT3ZlcnJpZGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUlkID0gdGhpcy5maWxlRGF0YS5zb3VyY2VNYW5hZ2VyLmdldFRlbXBsYXRlSWQobm9kZSk7XG4gICAgaWYgKHRoaXMuZmlsZURhdGEudGVtcGxhdGVPdmVycmlkZXMuaGFzKHRlbXBsYXRlSWQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5maWxlRGF0YS50ZW1wbGF0ZU92ZXJyaWRlcy5nZXQodGVtcGxhdGVJZCkhO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmVjb3JkU2hpbURhdGEoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogU2hpbVR5cGVDaGVja2luZ0RhdGEpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydFBhdGgoc2ZQYXRoKTtcblxuICAgIC8vIFByZXZpb3VzIHR5cGUtY2hlY2tpbmcgc3RhdGUgbWF5IGhhdmUgcmVxdWlyZWQgdGhlIHVzZSBvZiBpbmxpbmVzIChhc3N1bWluZyB0aGV5IHdlcmVcbiAgICAvLyBzdXBwb3J0ZWQpLiBJZiB0aGUgY3VycmVudCBvcGVyYXRpb24gYWxzbyByZXF1aXJlcyBpbmxpbmVzLCB0aGlzIHByZXNlbnRzIGEgcHJvYmxlbTpcbiAgICAvLyBnZW5lcmF0aW5nIG5ldyBpbmxpbmVzIG1heSBpbnZhbGlkYXRlIGFueSBvbGQgaW5saW5lcyB0aGF0IG9sZCBzdGF0ZSBkZXBlbmRzIG9uLlxuICAgIC8vXG4gICAgLy8gUmF0aGVyIHRoYW4gcmVzb2x2ZSB0aGlzIGlzc3VlIGJ5IHRyYWNraW5nIHNwZWNpZmljIGRlcGVuZGVuY2llcyBvbiBpbmxpbmVzLCBpZiB0aGUgbmV3IHN0YXRlXG4gICAgLy8gcmVsaWVzIG9uIGlubGluZXMsIGFueSBvbGQgc3RhdGUgdGhhdCByZWxpZWQgb24gdGhlbSBpcyBzaW1wbHkgY2xlYXJlZC4gVGhpcyBoYXBwZW5zIHdoZW4gdGhlXG4gICAgLy8gZmlyc3QgbmV3IHN0YXRlIHRoYXQgdXNlcyBpbmxpbmVzIGlzIGVuY291bnRlcmVkLlxuICAgIGlmIChkYXRhLmhhc0lubGluZXMgJiYgIXRoaXMuc2VlbklubGluZXMpIHtcbiAgICAgIHRoaXMuaW1wbC5jbGVhckFsbFNoaW1EYXRhVXNpbmdJbmxpbmVzKCk7XG4gICAgICB0aGlzLnNlZW5JbmxpbmVzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLmZpbGVEYXRhLnNoaW1EYXRhLnNldChkYXRhLnBhdGgsIGRhdGEpO1xuICAgIGlmIChkYXRhLmhhc0lubGluZXMpIHtcbiAgICAgIHRoaXMuZmlsZURhdGEuaGFzSW5saW5lcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkQ29tcGxldGUoc2ZQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQge1xuICAgIHRoaXMuYXNzZXJ0UGF0aChzZlBhdGgpO1xuICAgIHRoaXMuZmlsZURhdGEuaXNDb21wbGV0ZSA9IHRydWU7XG4gIH1cbn1cblxuLyoqXG4gKiBEcml2ZXMgYSBgVHlwZUNoZWNrQ29udGV4dGAgdG8gZ2VuZXJhdGUgdHlwZS1jaGVja2luZyBjb2RlIGVmZmljaWVudGx5IGZvciBvbmx5IHRob3NlIGNvbXBvbmVudHNcbiAqIHdoaWNoIG1hcCB0byBhIHNpbmdsZSBzaGltIG9mIGEgc2luZ2xlIGlucHV0IGZpbGUuXG4gKi9cbmNsYXNzIFNpbmdsZVNoaW1UeXBlQ2hlY2tpbmdIb3N0IGV4dGVuZHMgU2luZ2xlRmlsZVR5cGVDaGVja2luZ0hvc3Qge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHNmUGF0aDogQWJzb2x1dGVGc1BhdGgsIGZpbGVEYXRhOiBGaWxlVHlwZUNoZWNraW5nRGF0YSwgc3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICAgIGltcGw6IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsLCBwcml2YXRlIHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHN1cGVyKHNmUGF0aCwgZmlsZURhdGEsIHN0cmF0ZWd5LCBpbXBsKTtcbiAgfVxuXG4gIHNob3VsZENoZWNrTm9kZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuc2ZQYXRoICE9PSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKG5vZGUuZ2V0U291cmNlRmlsZSgpKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE9ubHkgZ2VuZXJhdGUgYSBUQ0IgZm9yIHRoZSBjb21wb25lbnQgaWYgaXQgbWFwcyB0byB0aGUgcmVxdWVzdGVkIHNoaW0gZmlsZS5cbiAgICBjb25zdCBzaGltUGF0aCA9IHRoaXMuc3RyYXRlZ3kuc2hpbVBhdGhGb3JDb21wb25lbnQobm9kZSk7XG4gICAgaWYgKHNoaW1QYXRoICE9PSB0aGlzLnNoaW1QYXRoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT25seSBuZWVkIHRvIGdlbmVyYXRlIGEgVENCIGZvciB0aGUgY2xhc3MgaWYgbm8gc2hpbSBleGlzdHMgZm9yIGl0IGN1cnJlbnRseS5cbiAgICByZXR1cm4gIXRoaXMuZmlsZURhdGEuc2hpbURhdGEuaGFzKHNoaW1QYXRoKTtcbiAgfVxufVxuXG4vKipcbiAqIENhY2hlZCBzY29wZSBpbmZvcm1hdGlvbiBmb3IgYSBjb21wb25lbnQuXG4gKi9cbmludGVyZmFjZSBTY29wZURhdGEge1xuICBkaXJlY3RpdmVzOiBEaXJlY3RpdmVJblNjb3BlW107XG4gIHBpcGVzOiBQaXBlSW5TY29wZVtdO1xufVxuIl19