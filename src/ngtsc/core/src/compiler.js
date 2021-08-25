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
        define("@angular/compiler-cli/src/ngtsc/core/src/compiler", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/indexer", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/extended", "@angular/compiler-cli/src/ngtsc/typecheck/extended/src/template_checks/invalid_banana_in_box", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isAngularCorePackage = exports.NgCompiler = exports.resourceChangeTicket = exports.incrementalFromStateTicket = exports.incrementalFromCompilerTicket = exports.freshCompilationTicket = exports.CompilationTicketKind = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var cycles_1 = require("@angular/compiler-cli/src/ngtsc/cycles");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var entry_point_1 = require("@angular/compiler-cli/src/ngtsc/entry_point");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var incremental_1 = require("@angular/compiler-cli/src/ngtsc/incremental");
    var indexer_1 = require("@angular/compiler-cli/src/ngtsc/indexer");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var resource_1 = require("@angular/compiler-cli/src/ngtsc/resource");
    var routing_1 = require("@angular/compiler-cli/src/ngtsc/routing");
    var scope_1 = require("@angular/compiler-cli/src/ngtsc/scope");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var switch_1 = require("@angular/compiler-cli/src/ngtsc/switch");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var extended_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/extended");
    var invalid_banana_in_box_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/extended/src/template_checks/invalid_banana_in_box");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * Discriminant type for a `CompilationTicket`.
     */
    var CompilationTicketKind;
    (function (CompilationTicketKind) {
        CompilationTicketKind[CompilationTicketKind["Fresh"] = 0] = "Fresh";
        CompilationTicketKind[CompilationTicketKind["IncrementalTypeScript"] = 1] = "IncrementalTypeScript";
        CompilationTicketKind[CompilationTicketKind["IncrementalResource"] = 2] = "IncrementalResource";
    })(CompilationTicketKind = exports.CompilationTicketKind || (exports.CompilationTicketKind = {}));
    /**
     * Create a `CompilationTicket` for a brand new compilation, using no prior state.
     */
    function freshCompilationTicket(tsProgram, options, incrementalBuildStrategy, programDriver, perfRecorder, enableTemplateTypeChecker, usePoisonedData) {
        return {
            kind: CompilationTicketKind.Fresh,
            tsProgram: tsProgram,
            options: options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            programDriver: programDriver,
            enableTemplateTypeChecker: enableTemplateTypeChecker,
            usePoisonedData: usePoisonedData,
            perfRecorder: perfRecorder !== null && perfRecorder !== void 0 ? perfRecorder : perf_1.ActivePerfRecorder.zeroedToNow(),
        };
    }
    exports.freshCompilationTicket = freshCompilationTicket;
    /**
     * Create a `CompilationTicket` as efficiently as possible, based on a previous `NgCompiler`
     * instance and a new `ts.Program`.
     */
    function incrementalFromCompilerTicket(oldCompiler, newProgram, incrementalBuildStrategy, programDriver, modifiedResourceFiles, perfRecorder) {
        var oldProgram = oldCompiler.getCurrentProgram();
        var oldState = oldCompiler.incrementalStrategy.getIncrementalState(oldProgram);
        if (oldState === null) {
            // No incremental step is possible here, since no IncrementalDriver was found for the old
            // program.
            return freshCompilationTicket(newProgram, oldCompiler.options, incrementalBuildStrategy, programDriver, perfRecorder, oldCompiler.enableTemplateTypeChecker, oldCompiler.usePoisonedData);
        }
        if (perfRecorder === null) {
            perfRecorder = perf_1.ActivePerfRecorder.zeroedToNow();
        }
        var incrementalCompilation = incremental_1.IncrementalCompilation.incremental(newProgram, versionMapFromProgram(newProgram, programDriver), oldProgram, oldState, modifiedResourceFiles, perfRecorder);
        return {
            kind: CompilationTicketKind.IncrementalTypeScript,
            enableTemplateTypeChecker: oldCompiler.enableTemplateTypeChecker,
            usePoisonedData: oldCompiler.usePoisonedData,
            options: oldCompiler.options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            incrementalCompilation: incrementalCompilation,
            programDriver: programDriver,
            newProgram: newProgram,
            perfRecorder: perfRecorder,
        };
    }
    exports.incrementalFromCompilerTicket = incrementalFromCompilerTicket;
    /**
     * Create a `CompilationTicket` directly from an old `ts.Program` and associated Angular compilation
     * state, along with a new `ts.Program`.
     */
    function incrementalFromStateTicket(oldProgram, oldState, newProgram, options, incrementalBuildStrategy, programDriver, modifiedResourceFiles, perfRecorder, enableTemplateTypeChecker, usePoisonedData) {
        if (perfRecorder === null) {
            perfRecorder = perf_1.ActivePerfRecorder.zeroedToNow();
        }
        var incrementalCompilation = incremental_1.IncrementalCompilation.incremental(newProgram, versionMapFromProgram(newProgram, programDriver), oldProgram, oldState, modifiedResourceFiles, perfRecorder);
        return {
            kind: CompilationTicketKind.IncrementalTypeScript,
            newProgram: newProgram,
            options: options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            incrementalCompilation: incrementalCompilation,
            programDriver: programDriver,
            enableTemplateTypeChecker: enableTemplateTypeChecker,
            usePoisonedData: usePoisonedData,
            perfRecorder: perfRecorder,
        };
    }
    exports.incrementalFromStateTicket = incrementalFromStateTicket;
    function resourceChangeTicket(compiler, modifiedResourceFiles) {
        return {
            kind: CompilationTicketKind.IncrementalResource,
            compiler: compiler,
            modifiedResourceFiles: modifiedResourceFiles,
            perfRecorder: perf_1.ActivePerfRecorder.zeroedToNow(),
        };
    }
    exports.resourceChangeTicket = resourceChangeTicket;
    /**
     * The heart of the Angular Ivy compiler.
     *
     * The `NgCompiler` provides an API for performing Angular compilation within a custom TypeScript
     * compiler. Each instance of `NgCompiler` supports a single compilation, which might be
     * incremental.
     *
     * `NgCompiler` is lazy, and does not perform any of the work of the compilation until one of its
     * output methods (e.g. `getDiagnostics`) is called.
     *
     * See the README.md for more information.
     */
    var NgCompiler = /** @class */ (function () {
        function NgCompiler(adapter, options, inputProgram, programDriver, incrementalStrategy, incrementalCompilation, enableTemplateTypeChecker, usePoisonedData, livePerfRecorder) {
            var _a, e_1, _b;
            var _this = this;
            this.adapter = adapter;
            this.options = options;
            this.inputProgram = inputProgram;
            this.programDriver = programDriver;
            this.incrementalStrategy = incrementalStrategy;
            this.incrementalCompilation = incrementalCompilation;
            this.enableTemplateTypeChecker = enableTemplateTypeChecker;
            this.usePoisonedData = usePoisonedData;
            this.livePerfRecorder = livePerfRecorder;
            /**
             * Lazily evaluated state of the compilation.
             *
             * This is created on demand by calling `ensureAnalyzed`.
             */
            this.compilation = null;
            /**
             * Any diagnostics related to the construction of the compilation.
             *
             * These are diagnostics which arose during setup of the host and/or program.
             */
            this.constructionDiagnostics = [];
            /**
             * Non-template diagnostics related to the program itself. Does not include template
             * diagnostics because the template type checker memoizes them itself.
             *
             * This is set by (and memoizes) `getNonTemplateDiagnostics`.
             */
            this.nonTemplateDiagnostics = null;
            /**
             * `NgCompiler` can be reused for multiple compilations (for resource-only changes), and each
             * new compilation uses a fresh `PerfRecorder`. Thus, classes created with a lifespan of the
             * `NgCompiler` use a `DelegatingPerfRecorder` so the `PerfRecorder` they write to can be updated
             * with each fresh compilation.
             */
            this.delegatingPerfRecorder = new perf_1.DelegatingPerfRecorder(this.perfRecorder);
            if (this.options._extendedTemplateDiagnostics === true &&
                this.options.strictTemplates === false) {
                throw new Error('The \'_extendedTemplateDiagnostics\' option requires \'strictTemplates\' to also be enabled.');
            }
            (_a = this.constructionDiagnostics).push.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(this.adapter.constructionDiagnostics)));
            var incompatibleTypeCheckOptionsDiagnostic = verifyCompatibleTypeCheckOptions(this.options);
            if (incompatibleTypeCheckOptionsDiagnostic !== null) {
                this.constructionDiagnostics.push(incompatibleTypeCheckOptionsDiagnostic);
            }
            this.currentProgram = inputProgram;
            this.closureCompilerEnabled = !!this.options.annotateForClosureCompiler;
            this.entryPoint =
                adapter.entryPoint !== null ? typescript_1.getSourceFileOrNull(inputProgram, adapter.entryPoint) : null;
            var moduleResolutionCache = ts.createModuleResolutionCache(this.adapter.getCurrentDirectory(), 
            // doen't retain a reference to `this`, if other closures in the constructor here reference
            // `this` internally then a closure created here would retain them. This can cause major
            // memory leak issues since the `moduleResolutionCache` is a long-lived object and finds its
            // way into all kinds of places inside TS internal objects.
            this.adapter.getCanonicalFileName.bind(this.adapter));
            this.moduleResolver =
                new imports_1.ModuleResolver(inputProgram, this.options, this.adapter, moduleResolutionCache);
            this.resourceManager = new resource_1.AdapterResourceLoader(adapter, this.options);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(new cycles_1.ImportGraph(inputProgram.getTypeChecker(), this.delegatingPerfRecorder));
            this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, inputProgram);
            this.ignoreForDiagnostics =
                new Set(inputProgram.getSourceFiles().filter(function (sf) { return _this.adapter.isShim(sf); }));
            this.ignoreForEmit = this.adapter.ignoreForEmit;
            var dtsFileCount = 0;
            var nonDtsFileCount = 0;
            try {
                for (var _c = tslib_1.__values(inputProgram.getSourceFiles()), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var sf = _d.value;
                    if (sf.isDeclarationFile) {
                        dtsFileCount++;
                    }
                    else {
                        nonDtsFileCount++;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            livePerfRecorder.eventCount(perf_1.PerfEvent.InputDtsFile, dtsFileCount);
            livePerfRecorder.eventCount(perf_1.PerfEvent.InputTsFile, nonDtsFileCount);
        }
        /**
         * Convert a `CompilationTicket` into an `NgCompiler` instance for the requested compilation.
         *
         * Depending on the nature of the compilation request, the `NgCompiler` instance may be reused
         * from a previous compilation and updated with any changes, it may be a new instance which
         * incrementally reuses state from a previous compilation, or it may represent a fresh
         * compilation entirely.
         */
        NgCompiler.fromTicket = function (ticket, adapter) {
            switch (ticket.kind) {
                case CompilationTicketKind.Fresh:
                    return new NgCompiler(adapter, ticket.options, ticket.tsProgram, ticket.programDriver, ticket.incrementalBuildStrategy, incremental_1.IncrementalCompilation.fresh(ticket.tsProgram, versionMapFromProgram(ticket.tsProgram, ticket.programDriver)), ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
                case CompilationTicketKind.IncrementalTypeScript:
                    return new NgCompiler(adapter, ticket.options, ticket.newProgram, ticket.programDriver, ticket.incrementalBuildStrategy, ticket.incrementalCompilation, ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
                case CompilationTicketKind.IncrementalResource:
                    var compiler = ticket.compiler;
                    compiler.updateWithChangedResources(ticket.modifiedResourceFiles, ticket.perfRecorder);
                    return compiler;
            }
        };
        Object.defineProperty(NgCompiler.prototype, "perfRecorder", {
            get: function () {
                return this.livePerfRecorder;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(NgCompiler.prototype, "incrementalDriver", {
            /**
             * Exposes the `IncrementalCompilation` under an old property name that the CLI uses, avoiding a
             * chicken-and-egg problem with the rename to `incrementalCompilation`.
             *
             * TODO(alxhub): remove when the CLI uses the new name.
             */
            get: function () {
                return this.incrementalCompilation;
            },
            enumerable: false,
            configurable: true
        });
        NgCompiler.prototype.updateWithChangedResources = function (changedResources, perfRecorder) {
            var _this = this;
            this.livePerfRecorder = perfRecorder;
            this.delegatingPerfRecorder.target = perfRecorder;
            perfRecorder.inPhase(perf_1.PerfPhase.ResourceUpdate, function () {
                var e_2, _a, e_3, _b, e_4, _c, e_5, _d;
                if (_this.compilation === null) {
                    // Analysis hasn't happened yet, so no update is necessary - any changes to resources will
                    // be captured by the inital analysis pass itself.
                    return;
                }
                _this.resourceManager.invalidate();
                var classesToUpdate = new Set();
                try {
                    for (var changedResources_1 = tslib_1.__values(changedResources), changedResources_1_1 = changedResources_1.next(); !changedResources_1_1.done; changedResources_1_1 = changedResources_1.next()) {
                        var resourceFile = changedResources_1_1.value;
                        try {
                            for (var _e = (e_3 = void 0, tslib_1.__values(_this.getComponentsWithTemplateFile(resourceFile))), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var templateClass = _f.value;
                                classesToUpdate.add(templateClass);
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                        try {
                            for (var _g = (e_4 = void 0, tslib_1.__values(_this.getComponentsWithStyleFile(resourceFile))), _h = _g.next(); !_h.done; _h = _g.next()) {
                                var styleClass = _h.value;
                                classesToUpdate.add(styleClass);
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (_h && !_h.done && (_c = _g.return)) _c.call(_g);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (changedResources_1_1 && !changedResources_1_1.done && (_a = changedResources_1.return)) _a.call(changedResources_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                try {
                    for (var classesToUpdate_1 = tslib_1.__values(classesToUpdate), classesToUpdate_1_1 = classesToUpdate_1.next(); !classesToUpdate_1_1.done; classesToUpdate_1_1 = classesToUpdate_1.next()) {
                        var clazz = classesToUpdate_1_1.value;
                        _this.compilation.traitCompiler.updateResources(clazz);
                        if (!ts.isClassDeclaration(clazz)) {
                            continue;
                        }
                        _this.compilation.templateTypeChecker.invalidateClass(clazz);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (classesToUpdate_1_1 && !classesToUpdate_1_1.done && (_d = classesToUpdate_1.return)) _d.call(classesToUpdate_1);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            });
        };
        /**
         * Get the resource dependencies of a file.
         *
         * If the file is not part of the compilation, an empty array will be returned.
         */
        NgCompiler.prototype.getResourceDependencies = function (file) {
            this.ensureAnalyzed();
            return this.incrementalCompilation.depGraph.getResourceDependencies(file);
        };
        /**
         * Get all Angular-related diagnostics for this compilation.
         */
        NgCompiler.prototype.getDiagnostics = function () {
            var diagnostics = [];
            diagnostics.push.apply(diagnostics, tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(this.getNonTemplateDiagnostics())), tslib_1.__read(this.getTemplateDiagnostics())));
            if (this.options._extendedTemplateDiagnostics) {
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(this.getExtendedTemplateDiagnostics())));
            }
            return this.addMessageTextDetails(diagnostics);
        };
        /**
         * Get all Angular-related diagnostics for this compilation.
         *
         * If a `ts.SourceFile` is passed, only diagnostics related to that file are returned.
         */
        NgCompiler.prototype.getDiagnosticsForFile = function (file, optimizeFor) {
            var diagnostics = [];
            diagnostics.push.apply(diagnostics, tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(this.getNonTemplateDiagnostics().filter(function (diag) { return diag.file === file; }))), tslib_1.__read(this.getTemplateDiagnosticsForFile(file, optimizeFor))));
            if (this.options._extendedTemplateDiagnostics) {
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(this.getExtendedTemplateDiagnostics(file))));
            }
            return this.addMessageTextDetails(diagnostics);
        };
        /**
         * Get all `ts.Diagnostic`s currently available that pertain to the given component.
         */
        NgCompiler.prototype.getDiagnosticsForComponent = function (component) {
            var compilation = this.ensureAnalyzed();
            var ttc = compilation.templateTypeChecker;
            var diagnostics = [];
            diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(ttc.getDiagnosticsForComponent(component))));
            if (this.options._extendedTemplateDiagnostics) {
                var extendedTemplateChecker = compilation.extendedTemplateChecker;
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(extendedTemplateChecker.getDiagnosticsForComponent(component))));
            }
            return this.addMessageTextDetails(diagnostics);
        };
        /**
         * Add Angular.io error guide links to diagnostics for this compilation.
         */
        NgCompiler.prototype.addMessageTextDetails = function (diagnostics) {
            return diagnostics.map(function (diag) {
                if (diag.code && diagnostics_1.COMPILER_ERRORS_WITH_GUIDES.has(diagnostics_1.ngErrorCode(diag.code))) {
                    return tslib_1.__assign(tslib_1.__assign({}, diag), { messageText: diag.messageText +
                            (". Find more at " + diagnostics_1.ERROR_DETAILS_PAGE_BASE_URL + "/NG" + diagnostics_1.ngErrorCode(diag.code)) });
                }
                return diag;
            });
        };
        /**
         * Get all setup-related diagnostics for this compilation.
         */
        NgCompiler.prototype.getOptionDiagnostics = function () {
            return this.constructionDiagnostics;
        };
        /**
         * Get the current `ts.Program` known to this `NgCompiler`.
         *
         * Compilation begins with an input `ts.Program`, and during template type-checking operations new
         * `ts.Program`s may be produced using the `ProgramDriver`. The most recent such `ts.Program` to
         * be produced is available here.
         *
         * This `ts.Program` serves two key purposes:
         *
         * * As an incremental starting point for creating the next `ts.Program` based on files that the
         *   user has changed (for clients using the TS compiler program APIs).
         *
         * * As the "before" point for an incremental compilation invocation, to determine what's changed
         *   between the old and new programs (for all compilations).
         */
        NgCompiler.prototype.getCurrentProgram = function () {
            return this.currentProgram;
        };
        NgCompiler.prototype.getTemplateTypeChecker = function () {
            if (!this.enableTemplateTypeChecker) {
                throw new Error('The `TemplateTypeChecker` does not work without `enableTemplateTypeChecker`.');
            }
            return this.ensureAnalyzed().templateTypeChecker;
        };
        /**
         * Retrieves the `ts.Declaration`s for any component(s) which use the given template file.
         */
        NgCompiler.prototype.getComponentsWithTemplateFile = function (templateFilePath) {
            var resourceRegistry = this.ensureAnalyzed().resourceRegistry;
            return resourceRegistry.getComponentsWithTemplate(file_system_1.resolve(templateFilePath));
        };
        /**
         * Retrieves the `ts.Declaration`s for any component(s) which use the given template file.
         */
        NgCompiler.prototype.getComponentsWithStyleFile = function (styleFilePath) {
            var resourceRegistry = this.ensureAnalyzed().resourceRegistry;
            return resourceRegistry.getComponentsWithStyle(file_system_1.resolve(styleFilePath));
        };
        /**
         * Retrieves external resources for the given component.
         */
        NgCompiler.prototype.getComponentResources = function (classDecl) {
            if (!reflection_1.isNamedClassDeclaration(classDecl)) {
                return null;
            }
            var resourceRegistry = this.ensureAnalyzed().resourceRegistry;
            var styles = resourceRegistry.getStyles(classDecl);
            var template = resourceRegistry.getTemplate(classDecl);
            if (template === null) {
                return null;
            }
            return { styles: styles, template: template };
        };
        NgCompiler.prototype.getMeta = function (classDecl) {
            var _a;
            if (!reflection_1.isNamedClassDeclaration(classDecl)) {
                return null;
            }
            var ref = new imports_1.Reference(classDecl);
            var metaReader = this.ensureAnalyzed().metaReader;
            var meta = (_a = metaReader.getPipeMetadata(ref)) !== null && _a !== void 0 ? _a : metaReader.getDirectiveMetadata(ref);
            if (meta === null) {
                return null;
            }
            return meta;
        };
        /**
         * Perform Angular's analysis step (as a precursor to `getDiagnostics` or `prepareEmit`)
         * asynchronously.
         *
         * Normally, this operation happens lazily whenever `getDiagnostics` or `prepareEmit` are called.
         * However, certain consumers may wish to allow for an asynchronous phase of analysis, where
         * resources such as `styleUrls` are resolved asynchonously. In these cases `analyzeAsync` must be
         * called first, and its `Promise` awaited prior to calling any other APIs of `NgCompiler`.
         */
        NgCompiler.prototype.analyzeAsync = function () {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.compilation !== null) {
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.perfRecorder.inPhase(perf_1.PerfPhase.Analysis, function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                    var promises, _a, _b, sf, analysisPromise;
                                    var e_6, _c;
                                    return tslib_1.__generator(this, function (_d) {
                                        switch (_d.label) {
                                            case 0:
                                                this.compilation = this.makeCompilation();
                                                promises = [];
                                                try {
                                                    for (_a = tslib_1.__values(this.inputProgram.getSourceFiles()), _b = _a.next(); !_b.done; _b = _a.next()) {
                                                        sf = _b.value;
                                                        if (sf.isDeclarationFile) {
                                                            continue;
                                                        }
                                                        analysisPromise = this.compilation.traitCompiler.analyzeAsync(sf);
                                                        if (analysisPromise !== undefined) {
                                                            promises.push(analysisPromise);
                                                        }
                                                    }
                                                }
                                                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                                                finally {
                                                    try {
                                                        if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                                    }
                                                    finally { if (e_6) throw e_6.error; }
                                                }
                                                return [4 /*yield*/, Promise.all(promises)];
                                            case 1:
                                                _d.sent();
                                                this.perfRecorder.memory(perf_1.PerfCheckpoint.Analysis);
                                                this.resolveCompilation(this.compilation.traitCompiler);
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * List lazy routes detected during analysis.
         *
         * This can be called for one specific route, or to retrieve all top-level routes.
         */
        NgCompiler.prototype.listLazyRoutes = function (entryRoute) {
            if (entryRoute) {
                // htts://github.com/angular/angular/blob/50732e156/packages/compiler-cli/src/transformers/compiler_host.ts#L175-L188).
                //
                // `@angular/cli` will always call this API with an absolute path, so the resolution step is
                // not necessary, but keeping it backwards compatible in case someone else is using the API.
                // Relative entry paths are disallowed.
                if (entryRoute.startsWith('.')) {
                    throw new Error("Failed to list lazy routes: Resolution of relative paths (" + entryRoute + ") is not supported.");
                }
                // Non-relative entry paths fall into one of the following categories:
                // - Absolute system paths (e.g. `/foo/bar/my-project/my-module`), which are unaffected by the
                //   logic below.
                // - Paths to enternal modules (e.g. `some-lib`).
                // - Paths mapped to directories in `tsconfig.json` (e.g. `shared/my-module`).
                //   (See https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping.)
                //
                // In all cases above, the `containingFile` argument is ignored, so we can just take the first
                // of the root files.
                var containingFile = this.inputProgram.getRootFileNames()[0];
                var _a = tslib_1.__read(entryRoute.split('#'), 2), entryPath = _a[0], moduleName = _a[1];
                var resolvedModule = typescript_1.resolveModuleName(entryPath, containingFile, this.options, this.adapter, null);
                if (resolvedModule) {
                    entryRoute = routing_1.entryPointKeyFor(resolvedModule.resolvedFileName, moduleName);
                }
            }
            var compilation = this.ensureAnalyzed();
            return compilation.routeAnalyzer.listLazyRoutes(entryRoute);
        };
        /**
         * Fetch transformers and other information which is necessary for a consumer to `emit` the
         * program with Angular-added definitions.
         */
        NgCompiler.prototype.prepareEmit = function () {
            var compilation = this.ensureAnalyzed();
            var coreImportsFrom = compilation.isCore ? getR3SymbolsFile(this.inputProgram) : null;
            var importRewriter;
            if (coreImportsFrom !== null) {
                importRewriter = new imports_1.R3SymbolsImportRewriter(coreImportsFrom.fileName);
            }
            else {
                importRewriter = new imports_1.NoopImportRewriter();
            }
            var defaultImportTracker = new imports_1.DefaultImportTracker();
            var before = [
                transform_1.ivyTransformFactory(compilation.traitCompiler, compilation.reflector, importRewriter, defaultImportTracker, this.delegatingPerfRecorder, compilation.isCore, this.closureCompilerEnabled),
                transform_1.aliasTransformFactory(compilation.traitCompiler.exportStatements),
                defaultImportTracker.importPreservingTransformer(),
            ];
            var afterDeclarations = [];
            if (compilation.dtsTransforms !== null) {
                afterDeclarations.push(transform_1.declarationTransformFactory(compilation.dtsTransforms, importRewriter));
            }
            // Only add aliasing re-exports to the .d.ts output if the `AliasingHost` requests it.
            if (compilation.aliasingHost !== null && compilation.aliasingHost.aliasExportsInDts) {
                afterDeclarations.push(transform_1.aliasTransformFactory(compilation.traitCompiler.exportStatements));
            }
            if (this.adapter.factoryTracker !== null) {
                before.push(shims_1.generatedFactoryTransform(this.adapter.factoryTracker.sourceInfo, importRewriter));
            }
            before.push(switch_1.ivySwitchTransform);
            return { transformers: { before: before, afterDeclarations: afterDeclarations } };
        };
        /**
         * Run the indexing process and return a `Map` of all indexed components.
         *
         * See the `indexing` package for more details.
         */
        NgCompiler.prototype.getIndexedComponents = function () {
            var compilation = this.ensureAnalyzed();
            var context = new indexer_1.IndexingContext();
            compilation.traitCompiler.index(context);
            return indexer_1.generateAnalysis(context);
        };
        /**
         * Collect i18n messages into the `Xi18nContext`.
         */
        NgCompiler.prototype.xi18n = function (ctx) {
            // Note that the 'resolve' phase is not strictly necessary for xi18n, but this is not currently
            // optimized.
            var compilation = this.ensureAnalyzed();
            compilation.traitCompiler.xi18n(ctx);
        };
        NgCompiler.prototype.ensureAnalyzed = function () {
            if (this.compilation === null) {
                this.analyzeSync();
            }
            return this.compilation;
        };
        NgCompiler.prototype.analyzeSync = function () {
            var _this = this;
            this.perfRecorder.inPhase(perf_1.PerfPhase.Analysis, function () {
                var e_7, _a;
                _this.compilation = _this.makeCompilation();
                try {
                    for (var _b = tslib_1.__values(_this.inputProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var sf = _c.value;
                        if (sf.isDeclarationFile) {
                            continue;
                        }
                        _this.compilation.traitCompiler.analyzeSync(sf);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
                _this.perfRecorder.memory(perf_1.PerfCheckpoint.Analysis);
                _this.resolveCompilation(_this.compilation.traitCompiler);
            });
        };
        NgCompiler.prototype.resolveCompilation = function (traitCompiler) {
            var _this = this;
            this.perfRecorder.inPhase(perf_1.PerfPhase.Resolve, function () {
                traitCompiler.resolve();
                // At this point, analysis is complete and the compiler can now calculate which files need to
                // be emitted, so do that.
                _this.incrementalCompilation.recordSuccessfulAnalysis(traitCompiler);
                _this.perfRecorder.memory(perf_1.PerfCheckpoint.Resolve);
            });
        };
        Object.defineProperty(NgCompiler.prototype, "fullTemplateTypeCheck", {
            get: function () {
                // Determine the strictness level of type checking based on compiler options. As
                // `strictTemplates` is a superset of `fullTemplateTypeCheck`, the former implies the latter.
                // Also see `verifyCompatibleTypeCheckOptions` where it is verified that `fullTemplateTypeCheck`
                // is not disabled when `strictTemplates` is enabled.
                var strictTemplates = !!this.options.strictTemplates;
                return strictTemplates || !!this.options.fullTemplateTypeCheck;
            },
            enumerable: false,
            configurable: true
        });
        NgCompiler.prototype.getTypeCheckingConfig = function () {
            // Determine the strictness level of type checking based on compiler options. As
            // `strictTemplates` is a superset of `fullTemplateTypeCheck`, the former implies the latter.
            // Also see `verifyCompatibleTypeCheckOptions` where it is verified that `fullTemplateTypeCheck`
            // is not disabled when `strictTemplates` is enabled.
            var strictTemplates = !!this.options.strictTemplates;
            var useInlineTypeConstructors = this.programDriver.supportsInlineOperations;
            // First select a type-checking configuration, based on whether full template type-checking is
            // requested.
            var typeCheckingConfig;
            if (this.fullTemplateTypeCheck) {
                typeCheckingConfig = {
                    applyTemplateContextGuards: strictTemplates,
                    checkQueries: false,
                    checkTemplateBodies: true,
                    alwaysCheckSchemaInTemplateBodies: true,
                    checkTypeOfInputBindings: strictTemplates,
                    honorAccessModifiersForInputBindings: false,
                    strictNullInputBindings: strictTemplates,
                    checkTypeOfAttributes: strictTemplates,
                    // Even in full template type-checking mode, DOM binding checks are not quite ready yet.
                    checkTypeOfDomBindings: false,
                    checkTypeOfOutputEvents: strictTemplates,
                    checkTypeOfAnimationEvents: strictTemplates,
                    // Checking of DOM events currently has an adverse effect on developer experience,
                    // e.g. for `<input (blur)="update($event.target.value)">` enabling this check results in:
                    // - error TS2531: Object is possibly 'null'.
                    // - error TS2339: Property 'value' does not exist on type 'EventTarget'.
                    checkTypeOfDomEvents: strictTemplates,
                    checkTypeOfDomReferences: strictTemplates,
                    // Non-DOM references have the correct type in View Engine so there is no strictness flag.
                    checkTypeOfNonDomReferences: true,
                    // Pipes are checked in View Engine so there is no strictness flag.
                    checkTypeOfPipes: true,
                    strictSafeNavigationTypes: strictTemplates,
                    useContextGenericType: strictTemplates,
                    strictLiteralTypes: true,
                    enableTemplateTypeChecker: this.enableTemplateTypeChecker,
                    useInlineTypeConstructors: useInlineTypeConstructors,
                    // Warnings for suboptimal type inference are only enabled if in Language Service mode
                    // (providing the full TemplateTypeChecker API) and if strict mode is not enabled. In strict
                    // mode, the user is in full control of type inference.
                    suggestionsForSuboptimalTypeInference: this.enableTemplateTypeChecker && !strictTemplates,
                };
            }
            else {
                typeCheckingConfig = {
                    applyTemplateContextGuards: false,
                    checkQueries: false,
                    checkTemplateBodies: false,
                    // Enable deep schema checking in "basic" template type-checking mode only if Closure
                    // compilation is requested, which is a good proxy for "only in google3".
                    alwaysCheckSchemaInTemplateBodies: this.closureCompilerEnabled,
                    checkTypeOfInputBindings: false,
                    strictNullInputBindings: false,
                    honorAccessModifiersForInputBindings: false,
                    checkTypeOfAttributes: false,
                    checkTypeOfDomBindings: false,
                    checkTypeOfOutputEvents: false,
                    checkTypeOfAnimationEvents: false,
                    checkTypeOfDomEvents: false,
                    checkTypeOfDomReferences: false,
                    checkTypeOfNonDomReferences: false,
                    checkTypeOfPipes: false,
                    strictSafeNavigationTypes: false,
                    useContextGenericType: false,
                    strictLiteralTypes: false,
                    enableTemplateTypeChecker: this.enableTemplateTypeChecker,
                    useInlineTypeConstructors: useInlineTypeConstructors,
                    // In "basic" template type-checking mode, no warnings are produced since most things are
                    // not checked anyways.
                    suggestionsForSuboptimalTypeInference: false,
                };
            }
            // Apply explicitly configured strictness flags on top of the default configuration
            // based on "fullTemplateTypeCheck".
            if (this.options.strictInputTypes !== undefined) {
                typeCheckingConfig.checkTypeOfInputBindings = this.options.strictInputTypes;
                typeCheckingConfig.applyTemplateContextGuards = this.options.strictInputTypes;
            }
            if (this.options.strictInputAccessModifiers !== undefined) {
                typeCheckingConfig.honorAccessModifiersForInputBindings =
                    this.options.strictInputAccessModifiers;
            }
            if (this.options.strictNullInputTypes !== undefined) {
                typeCheckingConfig.strictNullInputBindings = this.options.strictNullInputTypes;
            }
            if (this.options.strictOutputEventTypes !== undefined) {
                typeCheckingConfig.checkTypeOfOutputEvents = this.options.strictOutputEventTypes;
                typeCheckingConfig.checkTypeOfAnimationEvents = this.options.strictOutputEventTypes;
            }
            if (this.options.strictDomEventTypes !== undefined) {
                typeCheckingConfig.checkTypeOfDomEvents = this.options.strictDomEventTypes;
            }
            if (this.options.strictSafeNavigationTypes !== undefined) {
                typeCheckingConfig.strictSafeNavigationTypes = this.options.strictSafeNavigationTypes;
            }
            if (this.options.strictDomLocalRefTypes !== undefined) {
                typeCheckingConfig.checkTypeOfDomReferences = this.options.strictDomLocalRefTypes;
            }
            if (this.options.strictAttributeTypes !== undefined) {
                typeCheckingConfig.checkTypeOfAttributes = this.options.strictAttributeTypes;
            }
            if (this.options.strictContextGenerics !== undefined) {
                typeCheckingConfig.useContextGenericType = this.options.strictContextGenerics;
            }
            if (this.options.strictLiteralTypes !== undefined) {
                typeCheckingConfig.strictLiteralTypes = this.options.strictLiteralTypes;
            }
            return typeCheckingConfig;
        };
        NgCompiler.prototype.getTemplateDiagnostics = function () {
            var e_8, _a;
            var compilation = this.ensureAnalyzed();
            // Get the diagnostics.
            var diagnostics = [];
            try {
                for (var _b = tslib_1.__values(this.inputProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    if (sf.isDeclarationFile || this.adapter.isShim(sf)) {
                        continue;
                    }
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(compilation.templateTypeChecker.getDiagnosticsForFile(sf, api_1.OptimizeFor.WholeProgram))));
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_8) throw e_8.error; }
            }
            var program = this.programDriver.getProgram();
            this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
            this.currentProgram = program;
            return diagnostics;
        };
        NgCompiler.prototype.getTemplateDiagnosticsForFile = function (sf, optimizeFor) {
            var compilation = this.ensureAnalyzed();
            // Get the diagnostics.
            var diagnostics = [];
            if (!sf.isDeclarationFile && !this.adapter.isShim(sf)) {
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(compilation.templateTypeChecker.getDiagnosticsForFile(sf, optimizeFor))));
            }
            var program = this.programDriver.getProgram();
            this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
            this.currentProgram = program;
            return diagnostics;
        };
        NgCompiler.prototype.getNonTemplateDiagnostics = function () {
            var _a;
            if (this.nonTemplateDiagnostics === null) {
                var compilation = this.ensureAnalyzed();
                this.nonTemplateDiagnostics = tslib_1.__spreadArray([], tslib_1.__read(compilation.traitCompiler.diagnostics));
                if (this.entryPoint !== null && compilation.exportReferenceGraph !== null) {
                    (_a = this.nonTemplateDiagnostics).push.apply(_a, tslib_1.__spreadArray([], tslib_1.__read(entry_point_1.checkForPrivateExports(this.entryPoint, this.inputProgram.getTypeChecker(), compilation.exportReferenceGraph))));
                }
            }
            return this.nonTemplateDiagnostics;
        };
        /**
         * Calls the `extendedTemplateCheck` phase of the trait compiler
         * @param sf optional parameter to get diagnostics for a certain file
         *     or all files in the program if `sf` is undefined
         * @returns generated extended template diagnostics
         */
        NgCompiler.prototype.getExtendedTemplateDiagnostics = function (sf) {
            var e_9, _a;
            var diagnostics = [];
            var compilation = this.ensureAnalyzed();
            var extendedTemplateChecker = compilation.extendedTemplateChecker;
            if (sf !== undefined) {
                return compilation.traitCompiler.extendedTemplateCheck(sf, extendedTemplateChecker);
            }
            try {
                for (var _b = tslib_1.__values(this.inputProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf_1 = _c.value;
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(compilation.traitCompiler.extendedTemplateCheck(sf_1, extendedTemplateChecker))));
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_9) throw e_9.error; }
            }
            return diagnostics;
        };
        NgCompiler.prototype.makeCompilation = function () {
            var _this = this;
            var checker = this.inputProgram.getTypeChecker();
            var reflector = new reflection_1.TypeScriptReflectionHost(checker);
            // Construct the ReferenceEmitter.
            var refEmitter;
            var aliasingHost = null;
            if (this.adapter.unifiedModulesHost === null || !this.options._useHostForImportGeneration) {
                var localImportStrategy = void 0;
                // The strategy used for local, in-project imports depends on whether TS has been configured
                // with rootDirs. If so, then multiple directories may be mapped in the same "module
                // namespace" and the logic of `LogicalProjectStrategy` is required to generate correct
                // imports which may cross these multiple directories. Otherwise, plain relative imports are
                // sufficient.
                if (this.options.rootDir !== undefined ||
                    (this.options.rootDirs !== undefined && this.options.rootDirs.length > 0)) {
                    // rootDirs logic is in effect - use the `LogicalProjectStrategy` for in-project relative
                    // imports.
                    localImportStrategy = new imports_1.LogicalProjectStrategy(reflector, new file_system_1.LogicalFileSystem(tslib_1.__spreadArray([], tslib_1.__read(this.adapter.rootDirs)), this.adapter));
                }
                else {
                    // Plain relative imports are all that's needed.
                    localImportStrategy = new imports_1.RelativePathStrategy(reflector);
                }
                // The CompilerHost doesn't have fileNameToModuleName, so build an NPM-centric reference
                // resolution strategy.
                refEmitter = new imports_1.ReferenceEmitter([
                    // First, try to use local identifiers if available.
                    new imports_1.LocalIdentifierStrategy(),
                    // Next, attempt to use an absolute import.
                    new imports_1.AbsoluteModuleStrategy(this.inputProgram, checker, this.moduleResolver, reflector),
                    // Finally, check if the reference is being written into a file within the project's .ts
                    // sources, and use a relative import if so. If this fails, ReferenceEmitter will throw
                    // an error.
                    localImportStrategy,
                ]);
                // If an entrypoint is present, then all user imports should be directed through the
                // entrypoint and private exports are not needed. The compiler will validate that all publicly
                // visible directives/pipes are importable via this entrypoint.
                if (this.entryPoint === null && this.options.generateDeepReexports === true) {
                    // No entrypoint is present and deep re-exports were requested, so configure the aliasing
                    // system to generate them.
                    aliasingHost = new imports_1.PrivateExportAliasingHost(reflector);
                }
            }
            else {
                // The CompilerHost supports fileNameToModuleName, so use that to emit imports.
                refEmitter = new imports_1.ReferenceEmitter([
                    // First, try to use local identifiers if available.
                    new imports_1.LocalIdentifierStrategy(),
                    // Then use aliased references (this is a workaround to StrictDeps checks).
                    new imports_1.AliasStrategy(),
                    // Then use fileNameToModuleName to emit imports.
                    new imports_1.UnifiedModulesStrategy(reflector, this.adapter.unifiedModulesHost),
                ]);
                aliasingHost = new imports_1.UnifiedModulesAliasingHost(this.adapter.unifiedModulesHost);
            }
            var evaluator = new partial_evaluator_1.PartialEvaluator(reflector, checker, this.incrementalCompilation.depGraph);
            var dtsReader = new metadata_1.DtsMetadataReader(checker, reflector);
            var localMetaRegistry = new metadata_1.LocalMetadataRegistry();
            var localMetaReader = localMetaRegistry;
            var depScopeReader = new scope_1.MetadataDtsModuleScopeResolver(dtsReader, aliasingHost);
            var scopeRegistry = new scope_1.LocalModuleScopeRegistry(localMetaReader, depScopeReader, refEmitter, aliasingHost);
            var scopeReader = scopeRegistry;
            var semanticDepGraphUpdater = this.incrementalCompilation.semanticDepGraphUpdater;
            var metaRegistry = new metadata_1.CompoundMetadataRegistry([localMetaRegistry, scopeRegistry]);
            var injectableRegistry = new metadata_1.InjectableClassRegistry(reflector);
            var metaReader = new metadata_1.CompoundMetadataReader([localMetaReader, dtsReader]);
            var typeCheckScopeRegistry = new scope_1.TypeCheckScopeRegistry(scopeReader, metaReader);
            // If a flat module entrypoint was specified, then track references via a `ReferenceGraph` in
            // order to produce proper diagnostics for incorrectly exported directives/pipes/etc. If there
            // is no flat module entrypoint then don't pay the cost of tracking references.
            var referencesRegistry;
            var exportReferenceGraph = null;
            if (this.entryPoint !== null) {
                exportReferenceGraph = new entry_point_1.ReferenceGraph();
                referencesRegistry = new ReferenceGraphAdapter(exportReferenceGraph);
            }
            else {
                referencesRegistry = new annotations_1.NoopReferencesRegistry();
            }
            var routeAnalyzer = new routing_1.NgModuleRouteAnalyzer(this.moduleResolver, evaluator);
            var dtsTransforms = new transform_1.DtsTransformRegistry();
            var isCore = isAngularCorePackage(this.inputProgram);
            var resourceRegistry = new metadata_1.ResourceRegistry();
            var compilationMode = this.options.compilationMode === 'partial' ? transform_1.CompilationMode.PARTIAL : transform_1.CompilationMode.FULL;
            // Cycles are handled in full compilation mode by "remote scoping".
            // "Remote scoping" does not work well with tree shaking for libraries.
            // So in partial compilation mode, when building a library, a cycle will cause an error.
            var cycleHandlingStrategy = compilationMode === transform_1.CompilationMode.FULL ?
                0 /* UseRemoteScoping */ :
                1 /* Error */;
            // Set up the IvyCompilation, which manages state for the Ivy transformer.
            var handlers = [
                new annotations_1.ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, this.resourceManager, this.adapter.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.usePoisonedData, this.options.i18nNormalizeLineEndingsInICUs, this.moduleResolver, this.cycleAnalyzer, cycleHandlingStrategy, refEmitter, this.incrementalCompilation.depGraph, injectableRegistry, semanticDepGraphUpdater, this.closureCompilerEnabled, this.delegatingPerfRecorder),
                // TODO(alxhub): understand why the cast here is necessary (something to do with `null`
                // not being assignable to `unknown` when wrapped in `Readonly`).
                // clang-format off
                new annotations_1.DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, injectableRegistry, isCore, semanticDepGraphUpdater, this.closureCompilerEnabled, /** compileUndecoratedClassesWithAngularFeatures */ false, this.delegatingPerfRecorder),
                // clang-format on
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, injectableRegistry, isCore, this.delegatingPerfRecorder),
                new annotations_1.InjectableDecoratorHandler(reflector, isCore, this.options.strictInjectionParameters || false, injectableRegistry, this.delegatingPerfRecorder),
                new annotations_1.NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, this.adapter.factoryTracker, this.closureCompilerEnabled, injectableRegistry, this.delegatingPerfRecorder, this.options.i18nInLocale),
            ];
            var traitCompiler = new transform_1.TraitCompiler(handlers, reflector, this.delegatingPerfRecorder, this.incrementalCompilation, this.options.compileNonExportedClasses !== false, compilationMode, dtsTransforms, semanticDepGraphUpdater);
            // Template type-checking may use the `ProgramDriver` to produce new `ts.Program`(s). If this
            // happens, they need to be tracked by the `NgCompiler`.
            var notifyingDriver = new NotifyingProgramDriverWrapper(this.programDriver, function (program) {
                _this.incrementalStrategy.setIncrementalState(_this.incrementalCompilation.state, program);
                _this.currentProgram = program;
            });
            var templateTypeChecker = new typecheck_1.TemplateTypeCheckerImpl(this.inputProgram, notifyingDriver, traitCompiler, this.getTypeCheckingConfig(), refEmitter, reflector, this.adapter, this.incrementalCompilation, scopeRegistry, typeCheckScopeRegistry, this.delegatingPerfRecorder);
            var templateChecks = [new invalid_banana_in_box_1.InvalidBananaInBoxCheck()];
            var extendedTemplateChecker = new extended_1.ExtendedTemplateCheckerImpl(templateTypeChecker, checker, templateChecks);
            return {
                isCore: isCore,
                traitCompiler: traitCompiler,
                reflector: reflector,
                scopeRegistry: scopeRegistry,
                dtsTransforms: dtsTransforms,
                exportReferenceGraph: exportReferenceGraph,
                routeAnalyzer: routeAnalyzer,
                metaReader: metaReader,
                typeCheckScopeRegistry: typeCheckScopeRegistry,
                aliasingHost: aliasingHost,
                refEmitter: refEmitter,
                templateTypeChecker: templateTypeChecker,
                resourceRegistry: resourceRegistry,
                extendedTemplateChecker: extendedTemplateChecker
            };
        };
        return NgCompiler;
    }());
    exports.NgCompiler = NgCompiler;
    /**
     * Determine if the given `Program` is @angular/core.
     */
    function isAngularCorePackage(program) {
        // Look for its_just_angular.ts somewhere in the program.
        var r3Symbols = getR3SymbolsFile(program);
        if (r3Symbols === null) {
            return false;
        }
        // Look for the constant ITS_JUST_ANGULAR in that file.
        return r3Symbols.statements.some(function (stmt) {
            // The statement must be a variable declaration statement.
            if (!ts.isVariableStatement(stmt)) {
                return false;
            }
            // It must be exported.
            if (stmt.modifiers === undefined ||
                !stmt.modifiers.some(function (mod) { return mod.kind === ts.SyntaxKind.ExportKeyword; })) {
                return false;
            }
            // It must declare ITS_JUST_ANGULAR.
            return stmt.declarationList.declarations.some(function (decl) {
                // The declaration must match the name.
                if (!ts.isIdentifier(decl.name) || decl.name.text !== 'ITS_JUST_ANGULAR') {
                    return false;
                }
                // It must initialize the variable to true.
                if (decl.initializer === undefined || decl.initializer.kind !== ts.SyntaxKind.TrueKeyword) {
                    return false;
                }
                // This definition matches.
                return true;
            });
        });
    }
    exports.isAngularCorePackage = isAngularCorePackage;
    /**
     * Find the 'r3_symbols.ts' file in the given `Program`, or return `null` if it wasn't there.
     */
    function getR3SymbolsFile(program) {
        return program.getSourceFiles().find(function (file) { return file.fileName.indexOf('r3_symbols.ts') >= 0; }) || null;
    }
    /**
     * Since "strictTemplates" is a true superset of type checking capabilities compared to
     * "fullTemplateTypeCheck", it is required that the latter is not explicitly disabled if the
     * former is enabled.
     */
    function verifyCompatibleTypeCheckOptions(options) {
        if (options.fullTemplateTypeCheck === false && options.strictTemplates === true) {
            return {
                category: ts.DiagnosticCategory.Error,
                code: diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK),
                file: undefined,
                start: undefined,
                length: undefined,
                messageText: "Angular compiler option \"strictTemplates\" is enabled, however \"fullTemplateTypeCheck\" is disabled.\n\nHaving the \"strictTemplates\" flag enabled implies that \"fullTemplateTypeCheck\" is also enabled, so\nthe latter can not be explicitly disabled.\n\nOne of the following actions is required:\n1. Remove the \"fullTemplateTypeCheck\" option.\n2. Remove \"strictTemplates\" or set it to 'false'.\n\nMore information about the template type checking compiler options can be found in the documentation:\nhttps://v9.angular.io/guide/template-typecheck#template-type-checking",
            };
        }
        return null;
    }
    var ReferenceGraphAdapter = /** @class */ (function () {
        function ReferenceGraphAdapter(graph) {
            this.graph = graph;
        }
        ReferenceGraphAdapter.prototype.add = function (source) {
            var e_10, _a;
            var references = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                references[_i - 1] = arguments[_i];
            }
            try {
                for (var references_1 = tslib_1.__values(references), references_1_1 = references_1.next(); !references_1_1.done; references_1_1 = references_1.next()) {
                    var node = references_1_1.value.node;
                    var sourceFile = node.getSourceFile();
                    if (sourceFile === undefined) {
                        sourceFile = ts.getOriginalNode(node).getSourceFile();
                    }
                    // Only record local references (not references into .d.ts files).
                    if (sourceFile === undefined || !typescript_1.isDtsPath(sourceFile.fileName)) {
                        this.graph.add(source, node);
                    }
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (references_1_1 && !references_1_1.done && (_a = references_1.return)) _a.call(references_1);
                }
                finally { if (e_10) throw e_10.error; }
            }
        };
        return ReferenceGraphAdapter;
    }());
    var NotifyingProgramDriverWrapper = /** @class */ (function () {
        function NotifyingProgramDriverWrapper(delegate, notifyNewProgram) {
            var _a;
            this.delegate = delegate;
            this.notifyNewProgram = notifyNewProgram;
            this.getSourceFileVersion = (_a = this.delegate.getSourceFileVersion) === null || _a === void 0 ? void 0 : _a.bind(this);
        }
        Object.defineProperty(NotifyingProgramDriverWrapper.prototype, "supportsInlineOperations", {
            get: function () {
                return this.delegate.supportsInlineOperations;
            },
            enumerable: false,
            configurable: true
        });
        NotifyingProgramDriverWrapper.prototype.getProgram = function () {
            return this.delegate.getProgram();
        };
        NotifyingProgramDriverWrapper.prototype.updateFiles = function (contents, updateMode) {
            this.delegate.updateFiles(contents, updateMode);
            this.notifyNewProgram(this.delegate.getProgram());
        };
        return NotifyingProgramDriverWrapper;
    }());
    function versionMapFromProgram(program, driver) {
        var e_11, _a;
        if (driver.getSourceFileVersion === undefined) {
            return null;
        }
        var versions = new Map();
        try {
            for (var _b = tslib_1.__values(program.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var possiblyRedirectedSourceFile = _c.value;
                var sf = typescript_1.toUnredirectedSourceFile(possiblyRedirectedSourceFile);
                versions.set(file_system_1.absoluteFromSourceFile(sf), driver.getSourceFileVersion(sf));
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_11) throw e_11.error; }
        }
        return versions;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsMkVBQStNO0lBQy9NLGlFQUErRTtJQUMvRSwyRUFBbUg7SUFDbkgsMkVBQXlFO0lBQ3pFLDJFQUFxRztJQUNyRyxtRUFBK1g7SUFDL1gsMkVBQXFHO0lBRXJHLG1FQUFrRjtJQUNsRixxRUFBa087SUFDbE8sdUZBQXlEO0lBQ3pELDZEQUE0RztJQUU1Ryx5RUFBb0c7SUFDcEcscUVBQXFEO0lBQ3JELG1FQUFzRTtJQUN0RSwrREFBbUk7SUFDbkksK0RBQXNEO0lBQ3RELGlFQUFnRDtJQUNoRCx1RUFBZ0w7SUFDaEwsdUVBQXdEO0lBQ3hELHFFQUF5RjtJQUN6RiwrRUFBcUU7SUFFckUsc0lBQTJHO0lBQzNHLGtGQUFzSDtJQTJCdEg7O09BRUc7SUFDSCxJQUFZLHFCQUlYO0lBSkQsV0FBWSxxQkFBcUI7UUFDL0IsbUVBQUssQ0FBQTtRQUNMLG1HQUFxQixDQUFBO1FBQ3JCLCtGQUFtQixDQUFBO0lBQ3JCLENBQUMsRUFKVyxxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQUloQztJQWdERDs7T0FFRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxTQUFxQixFQUFFLE9BQTBCLEVBQ2pELHdCQUFrRCxFQUFFLGFBQTRCLEVBQ2hGLFlBQXFDLEVBQUUseUJBQWtDLEVBQ3pFLGVBQXdCO1FBQzFCLE9BQU87WUFDTCxJQUFJLEVBQUUscUJBQXFCLENBQUMsS0FBSztZQUNqQyxTQUFTLFdBQUE7WUFDVCxPQUFPLFNBQUE7WUFDUCx3QkFBd0IsMEJBQUE7WUFDeEIsYUFBYSxlQUFBO1lBQ2IseUJBQXlCLDJCQUFBO1lB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WUFDaEQsQ0FBQzs7O1dBQUE7UUFFRCxrREFBVSxHQUFWO1lBQ0UsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3BDLENBQUM7UUFFRCxtREFBVyxHQUFYLFVBQVksUUFBeUMsRUFBRSxVQUFzQjtZQUMzRSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBR0gsb0NBQUM7SUFBRCxDQUFDLEFBbEJELElBa0JDO0lBRUQsU0FBUyxxQkFBcUIsQ0FDMUIsT0FBbUIsRUFBRSxNQUFxQjs7UUFDNUMsSUFBSSxNQUFNLENBQUMsb0JBQW9CLEtBQUssU0FBUyxFQUFFO1lBQzdDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQzs7WUFDbkQsS0FBMkMsSUFBQSxLQUFBLGlCQUFBLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQSxnQkFBQSw0QkFBRTtnQkFBaEUsSUFBTSw0QkFBNEIsV0FBQTtnQkFDckMsSUFBTSxFQUFFLEdBQUcscUNBQXdCLENBQUMsNEJBQTRCLENBQUMsQ0FBQztnQkFDbEUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQ0FBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUMzRTs7Ozs7Ozs7O1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5LCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEN5Y2xlSGFuZGxpbmdTdHJhdGVneSwgSW1wb3J0R3JhcGh9IGZyb20gJy4uLy4uL2N5Y2xlcyc7XG5pbXBvcnQge0NPTVBJTEVSX0VSUk9SU19XSVRIX0dVSURFUywgRVJST1JfREVUQUlMU19QQUdFX0JBU0VfVVJMLCBFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2NoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIFJlZmVyZW5jZUdyYXBofSBmcm9tICcuLi8uLi9lbnRyeV9wb2ludCc7XG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRoLCBMb2dpY2FsRmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5LCBBbGlhc2luZ0hvc3QsIEFsaWFzU3RyYXRlZ3ksIERlZmF1bHRJbXBvcnRUcmFja2VyLCBJbXBvcnRSZXdyaXRlciwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXRTdHJhdGVneSwgUmVmZXJlbmNlRW1pdHRlciwgUmVsYXRpdmVQYXRoU3RyYXRlZ3ksIFVuaWZpZWRNb2R1bGVzQWxpYXNpbmdIb3N0LCBVbmlmaWVkTW9kdWxlc1N0cmF0ZWd5fSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLCBJbmNyZW1lbnRhbFN0YXRlfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbCc7XG5pbXBvcnQge1NlbWFudGljU3ltYm9sfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9zZW1hbnRpY19ncmFwaCc7XG5pbXBvcnQge2dlbmVyYXRlQW5hbHlzaXMsIEluZGV4ZWRDb21wb25lbnQsIEluZGV4aW5nQ29udGV4dH0gZnJvbSAnLi4vLi4vaW5kZXhlcic7XG5pbXBvcnQge0NvbXBvbmVudFJlc291cmNlcywgQ29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEaXJlY3RpdmVNZXRhLCBEdHNNZXRhZGF0YVJlYWRlciwgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIExvY2FsTWV0YWRhdGFSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIFBpcGVNZXRhLCBSZXNvdXJjZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7QWN0aXZlUGVyZlJlY29yZGVyLCBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyLCBQZXJmQ2hlY2twb2ludCwgUGVyZkV2ZW50LCBQZXJmUGhhc2V9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtGaWxlVXBkYXRlLCBQcm9ncmFtRHJpdmVyLCBVcGRhdGVNb2RlfSBmcm9tICcuLi8uLi9wcm9ncmFtX2RyaXZlcic7XG5pbXBvcnQge0RlY2xhcmF0aW9uTm9kZSwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0FkYXB0ZXJSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi4vLi4vcmVzb3VyY2UnO1xuaW1wb3J0IHtlbnRyeVBvaW50S2V5Rm9yLCBOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIsIFR5cGVDaGVja1Njb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7Z2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybX0gZnJvbSAnLi4vLi4vc2hpbXMnO1xuaW1wb3J0IHtpdnlTd2l0Y2hUcmFuc2Zvcm19IGZyb20gJy4uLy4uL3N3aXRjaCc7XG5pbXBvcnQge2FsaWFzVHJhbnNmb3JtRmFjdG9yeSwgQ29tcGlsYXRpb25Nb2RlLCBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnksIERlY29yYXRvckhhbmRsZXIsIER0c1RyYW5zZm9ybVJlZ2lzdHJ5LCBpdnlUcmFuc2Zvcm1GYWN0b3J5LCBUcmFpdENvbXBpbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtUZW1wbGF0ZVR5cGVDaGVja2VySW1wbH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7T3B0aW1pemVGb3IsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2luZ0NvbmZpZ30gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge0V4dGVuZGVkVGVtcGxhdGVDaGVja2VySW1wbH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2V4dGVuZGVkJztcbmltcG9ydCB7RXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXJ9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9leHRlbmRlZC9hcGknO1xuaW1wb3J0IHtJbnZhbGlkQmFuYW5hSW5Cb3hDaGVja30gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2V4dGVuZGVkL3NyYy90ZW1wbGF0ZV9jaGVja3MvaW52YWxpZF9iYW5hbmFfaW5fYm94JztcbmltcG9ydCB7Z2V0U291cmNlRmlsZU9yTnVsbCwgaXNEdHNQYXRoLCByZXNvbHZlTW9kdWxlTmFtZSwgdG9VbnJlZGlyZWN0ZWRTb3VyY2VGaWxlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7WGkxOG5Db250ZXh0fSBmcm9tICcuLi8uLi94aTE4bic7XG5pbXBvcnQge0xhenlSb3V0ZSwgTmdDb21waWxlckFkYXB0ZXIsIE5nQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi9hcGknO1xuXG4vKipcbiAqIFN0YXRlIGluZm9ybWF0aW9uIGFib3V0IGEgY29tcGlsYXRpb24gd2hpY2ggaXMgb25seSBnZW5lcmF0ZWQgb25jZSBzb21lIGRhdGEgaXMgcmVxdWVzdGVkIGZyb21cbiAqIHRoZSBgTmdDb21waWxlcmAgKGZvciBleGFtcGxlLCBieSBjYWxsaW5nIGBnZXREaWFnbm9zdGljc2ApLlxuICovXG5pbnRlcmZhY2UgTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICBpc0NvcmU6IGJvb2xlYW47XG4gIHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXI7XG4gIHJlZmxlY3RvcjogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0O1xuICBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcjtcbiAgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5O1xuICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5OiBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5O1xuICBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbDtcbiAgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyO1xuICBkdHNUcmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1SZWdpc3RyeTtcbiAgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbDtcbiAgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcjtcbiAgdGVtcGxhdGVUeXBlQ2hlY2tlcjogVGVtcGxhdGVUeXBlQ2hlY2tlcjtcbiAgcmVzb3VyY2VSZWdpc3RyeTogUmVzb3VyY2VSZWdpc3RyeTtcbiAgZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXI6IEV4dGVuZGVkVGVtcGxhdGVDaGVja2VyO1xufVxuXG5cblxuLyoqXG4gKiBEaXNjcmltaW5hbnQgdHlwZSBmb3IgYSBgQ29tcGlsYXRpb25UaWNrZXRgLlxuICovXG5leHBvcnQgZW51bSBDb21waWxhdGlvblRpY2tldEtpbmQge1xuICBGcmVzaCxcbiAgSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICBJbmNyZW1lbnRhbFJlc291cmNlLFxufVxuXG4vKipcbiAqIEJlZ2luIGFuIEFuZ3VsYXIgY29tcGlsYXRpb24gb3BlcmF0aW9uIGZyb20gc2NyYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGcmVzaENvbXBpbGF0aW9uVGlja2V0IHtcbiAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoO1xuICBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucztcbiAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k7XG4gIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXI7XG4gIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbjtcbiAgdHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuLyoqXG4gKiBCZWdpbiBhbiBBbmd1bGFyIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiB0aGF0IGluY29ycG9yYXRlcyBjaGFuZ2VzIHRvIFR5cGVTY3JpcHQgY29kZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFR5cGVTY3JpcHRDb21waWxhdGlvblRpY2tldCB7XG4gIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQ7XG4gIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zO1xuICBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneTtcbiAgaW5jcmVtZW50YWxDb21waWxhdGlvbjogSW5jcmVtZW50YWxDb21waWxhdGlvbjtcbiAgcHJvZ3JhbURyaXZlcjogUHJvZ3JhbURyaXZlcjtcbiAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbjtcbiAgdXNlUG9pc29uZWREYXRhOiBib29sZWFuO1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQge1xuICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZTtcbiAgY29tcGlsZXI6IE5nQ29tcGlsZXI7XG4gIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz47XG4gIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyO1xufVxuXG4vKipcbiAqIEEgcmVxdWVzdCB0byBiZWdpbiBBbmd1bGFyIGNvbXBpbGF0aW9uLCBlaXRoZXIgc3RhcnRpbmcgZnJvbSBzY3JhdGNoIG9yIGZyb20gYSBrbm93biBwcmlvciBzdGF0ZS5cbiAqXG4gKiBgQ29tcGlsYXRpb25UaWNrZXRgcyBhcmUgdXNlZCB0byBpbml0aWFsaXplIChvciB1cGRhdGUpIGFuIGBOZ0NvbXBpbGVyYCBpbnN0YW5jZSwgdGhlIGNvcmUgb2YgdGhlXG4gKiBBbmd1bGFyIGNvbXBpbGVyLiBUaGV5IGFic3RyYWN0IHRoZSBzdGFydGluZyBzdGF0ZSBvZiBjb21waWxhdGlvbiBhbmQgYWxsb3cgYE5nQ29tcGlsZXJgIHRvIGJlXG4gKiBtYW5hZ2VkIGluZGVwZW5kZW50bHkgb2YgYW55IGluY3JlbWVudGFsIGNvbXBpbGF0aW9uIGxpZmVjeWNsZS5cbiAqL1xuZXhwb3J0IHR5cGUgQ29tcGlsYXRpb25UaWNrZXQgPSBGcmVzaENvbXBpbGF0aW9uVGlja2V0fEluY3JlbWVudGFsVHlwZVNjcmlwdENvbXBpbGF0aW9uVGlja2V0fFxuICAgIEluY3JlbWVudGFsUmVzb3VyY2VDb21waWxhdGlvblRpY2tldDtcblxuLyoqXG4gKiBDcmVhdGUgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGZvciBhIGJyYW5kIG5ldyBjb21waWxhdGlvbiwgdXNpbmcgbm8gcHJpb3Igc3RhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXJ8bnVsbCwgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbixcbiAgICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4pOiBDb21waWxhdGlvblRpY2tldCB7XG4gIHJldHVybiB7XG4gICAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoLFxuICAgIHRzUHJvZ3JhbSxcbiAgICBvcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBwcm9ncmFtRHJpdmVyLFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhLFxuICAgIHBlcmZSZWNvcmRlcjogcGVyZlJlY29yZGVyID8/IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpLFxuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBDb21waWxhdGlvblRpY2tldGAgYXMgZWZmaWNpZW50bHkgYXMgcG9zc2libGUsIGJhc2VkIG9uIGEgcHJldmlvdXMgYE5nQ29tcGlsZXJgXG4gKiBpbnN0YW5jZSBhbmQgYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tQ29tcGlsZXJUaWNrZXQoXG4gICAgb2xkQ29tcGlsZXI6IE5nQ29tcGlsZXIsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsXG4gICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LFxuICAgIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyfG51bGwpOiBDb21waWxhdGlvblRpY2tldCB7XG4gIGNvbnN0IG9sZFByb2dyYW0gPSBvbGRDb21waWxlci5nZXRDdXJyZW50UHJvZ3JhbSgpO1xuICBjb25zdCBvbGRTdGF0ZSA9IG9sZENvbXBpbGVyLmluY3JlbWVudGFsU3RyYXRlZ3kuZ2V0SW5jcmVtZW50YWxTdGF0ZShvbGRQcm9ncmFtKTtcbiAgaWYgKG9sZFN0YXRlID09PSBudWxsKSB7XG4gICAgLy8gTm8gaW5jcmVtZW50YWwgc3RlcCBpcyBwb3NzaWJsZSBoZXJlLCBzaW5jZSBubyBJbmNyZW1lbnRhbERyaXZlciB3YXMgZm91bmQgZm9yIHRoZSBvbGRcbiAgICAvLyBwcm9ncmFtLlxuICAgIHJldHVybiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgICAgICBuZXdQcm9ncmFtLCBvbGRDb21waWxlci5vcHRpb25zLCBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXIsIHBlcmZSZWNvcmRlcixcbiAgICAgICAgb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciwgb2xkQ29tcGlsZXIudXNlUG9pc29uZWREYXRhKTtcbiAgfVxuXG4gIGlmIChwZXJmUmVjb3JkZXIgPT09IG51bGwpIHtcbiAgICBwZXJmUmVjb3JkZXIgPSBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKTtcbiAgfVxuXG4gIGNvbnN0IGluY3JlbWVudGFsQ29tcGlsYXRpb24gPSBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmluY3JlbWVudGFsKFxuICAgICAgbmV3UHJvZ3JhbSwgdmVyc2lvbk1hcEZyb21Qcm9ncmFtKG5ld1Byb2dyYW0sIHByb2dyYW1Ecml2ZXIpLCBvbGRQcm9ncmFtLCBvbGRTdGF0ZSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcblxuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQsXG4gICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICB1c2VQb2lzb25lZERhdGE6IG9sZENvbXBpbGVyLnVzZVBvaXNvbmVkRGF0YSxcbiAgICBvcHRpb25zOiBvbGRDb21waWxlci5vcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBpbmNyZW1lbnRhbENvbXBpbGF0aW9uLFxuICAgIHByb2dyYW1Ecml2ZXIsXG4gICAgbmV3UHJvZ3JhbSxcbiAgICBwZXJmUmVjb3JkZXIsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBkaXJlY3RseSBmcm9tIGFuIG9sZCBgdHMuUHJvZ3JhbWAgYW5kIGFzc29jaWF0ZWQgQW5ndWxhciBjb21waWxhdGlvblxuICogc3RhdGUsIGFsb25nIHdpdGggYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tU3RhdGVUaWNrZXQoXG4gICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkU3RhdGU6IEluY3JlbWVudGFsU3RhdGUsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PEFic29sdXRlRnNQYXRoPixcbiAgICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcnxudWxsLCBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuLFxuICAgIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbik6IENvbXBpbGF0aW9uVGlja2V0IHtcbiAgaWYgKHBlcmZSZWNvcmRlciA9PT0gbnVsbCkge1xuICAgIHBlcmZSZWNvcmRlciA9IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpO1xuICB9XG4gIGNvbnN0IGluY3JlbWVudGFsQ29tcGlsYXRpb24gPSBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmluY3JlbWVudGFsKFxuICAgICAgbmV3UHJvZ3JhbSwgdmVyc2lvbk1hcEZyb21Qcm9ncmFtKG5ld1Byb2dyYW0sIHByb2dyYW1Ecml2ZXIpLCBvbGRQcm9ncmFtLCBvbGRTdGF0ZSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICAgIG5ld1Byb2dyYW0sXG4gICAgb3B0aW9ucyxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICBwcm9ncmFtRHJpdmVyLFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhLFxuICAgIHBlcmZSZWNvcmRlcixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc291cmNlQ2hhbmdlVGlja2V0KGNvbXBpbGVyOiBOZ0NvbXBpbGVyLCBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+KTpcbiAgICBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFJlc291cmNlLFxuICAgIGNvbXBpbGVyLFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcyxcbiAgICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpLFxuICB9O1xufVxuXG5cbi8qKlxuICogVGhlIGhlYXJ0IG9mIHRoZSBBbmd1bGFyIEl2eSBjb21waWxlci5cbiAqXG4gKiBUaGUgYE5nQ29tcGlsZXJgIHByb3ZpZGVzIGFuIEFQSSBmb3IgcGVyZm9ybWluZyBBbmd1bGFyIGNvbXBpbGF0aW9uIHdpdGhpbiBhIGN1c3RvbSBUeXBlU2NyaXB0XG4gKiBjb21waWxlci4gRWFjaCBpbnN0YW5jZSBvZiBgTmdDb21waWxlcmAgc3VwcG9ydHMgYSBzaW5nbGUgY29tcGlsYXRpb24sIHdoaWNoIG1pZ2h0IGJlXG4gKiBpbmNyZW1lbnRhbC5cbiAqXG4gKiBgTmdDb21waWxlcmAgaXMgbGF6eSwgYW5kIGRvZXMgbm90IHBlcmZvcm0gYW55IG9mIHRoZSB3b3JrIG9mIHRoZSBjb21waWxhdGlvbiB1bnRpbCBvbmUgb2YgaXRzXG4gKiBvdXRwdXQgbWV0aG9kcyAoZS5nLiBgZ2V0RGlhZ25vc3RpY3NgKSBpcyBjYWxsZWQuXG4gKlxuICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ0NvbXBpbGVyIHtcbiAgLyoqXG4gICAqIExhemlseSBldmFsdWF0ZWQgc3RhdGUgb2YgdGhlIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIGNyZWF0ZWQgb24gZGVtYW5kIGJ5IGNhbGxpbmcgYGVuc3VyZUFuYWx5emVkYC5cbiAgICovXG4gIHByaXZhdGUgY29tcGlsYXRpb246IExhenlDb21waWxhdGlvblN0YXRlfG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBBbnkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgY29uc3RydWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhlc2UgYXJlIGRpYWdub3N0aWNzIHdoaWNoIGFyb3NlIGR1cmluZyBzZXR1cCBvZiB0aGUgaG9zdCBhbmQvb3IgcHJvZ3JhbS5cbiAgICovXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBOb24tdGVtcGxhdGUgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgcHJvZ3JhbSBpdHNlbGYuIERvZXMgbm90IGluY2x1ZGUgdGVtcGxhdGVcbiAgICogZGlhZ25vc3RpY3MgYmVjYXVzZSB0aGUgdGVtcGxhdGUgdHlwZSBjaGVja2VyIG1lbW9pemVzIHRoZW0gaXRzZWxmLlxuICAgKlxuICAgKiBUaGlzIGlzIHNldCBieSAoYW5kIG1lbW9pemVzKSBgZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljc2AuXG4gICAqL1xuICBwcml2YXRlIG5vblRlbXBsYXRlRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgY3VycmVudFByb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgZW50cnlQb2ludDogdHMuU291cmNlRmlsZXxudWxsO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICByZWFkb25seSBpZ25vcmVGb3JEaWFnbm9zdGljczogU2V0PHRzLlNvdXJjZUZpbGU+O1xuICByZWFkb25seSBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT47XG5cbiAgLyoqXG4gICAqIGBOZ0NvbXBpbGVyYCBjYW4gYmUgcmV1c2VkIGZvciBtdWx0aXBsZSBjb21waWxhdGlvbnMgKGZvciByZXNvdXJjZS1vbmx5IGNoYW5nZXMpLCBhbmQgZWFjaFxuICAgKiBuZXcgY29tcGlsYXRpb24gdXNlcyBhIGZyZXNoIGBQZXJmUmVjb3JkZXJgLiBUaHVzLCBjbGFzc2VzIGNyZWF0ZWQgd2l0aCBhIGxpZmVzcGFuIG9mIHRoZVxuICAgKiBgTmdDb21waWxlcmAgdXNlIGEgYERlbGVnYXRpbmdQZXJmUmVjb3JkZXJgIHNvIHRoZSBgUGVyZlJlY29yZGVyYCB0aGV5IHdyaXRlIHRvIGNhbiBiZSB1cGRhdGVkXG4gICAqIHdpdGggZWFjaCBmcmVzaCBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZGVsZWdhdGluZ1BlcmZSZWNvcmRlciA9IG5ldyBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyKHRoaXMucGVyZlJlY29yZGVyKTtcblxuICAvKipcbiAgICogQ29udmVydCBhIGBDb21waWxhdGlvblRpY2tldGAgaW50byBhbiBgTmdDb21waWxlcmAgaW5zdGFuY2UgZm9yIHRoZSByZXF1ZXN0ZWQgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIERlcGVuZGluZyBvbiB0aGUgbmF0dXJlIG9mIHRoZSBjb21waWxhdGlvbiByZXF1ZXN0LCB0aGUgYE5nQ29tcGlsZXJgIGluc3RhbmNlIG1heSBiZSByZXVzZWRcbiAgICogZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uIGFuZCB1cGRhdGVkIHdpdGggYW55IGNoYW5nZXMsIGl0IG1heSBiZSBhIG5ldyBpbnN0YW5jZSB3aGljaFxuICAgKiBpbmNyZW1lbnRhbGx5IHJldXNlcyBzdGF0ZSBmcm9tIGEgcHJldmlvdXMgY29tcGlsYXRpb24sIG9yIGl0IG1heSByZXByZXNlbnQgYSBmcmVzaFxuICAgKiBjb21waWxhdGlvbiBlbnRpcmVseS5cbiAgICovXG4gIHN0YXRpYyBmcm9tVGlja2V0KHRpY2tldDogQ29tcGlsYXRpb25UaWNrZXQsIGFkYXB0ZXI6IE5nQ29tcGlsZXJBZGFwdGVyKSB7XG4gICAgc3dpdGNoICh0aWNrZXQua2luZCkge1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuRnJlc2g6XG4gICAgICAgIHJldHVybiBuZXcgTmdDb21waWxlcihcbiAgICAgICAgICAgIGFkYXB0ZXIsXG4gICAgICAgICAgICB0aWNrZXQub3B0aW9ucyxcbiAgICAgICAgICAgIHRpY2tldC50c1Byb2dyYW0sXG4gICAgICAgICAgICB0aWNrZXQucHJvZ3JhbURyaXZlcixcbiAgICAgICAgICAgIHRpY2tldC5pbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICAgICAgICBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmZyZXNoKFxuICAgICAgICAgICAgICAgIHRpY2tldC50c1Byb2dyYW0sIHZlcnNpb25NYXBGcm9tUHJvZ3JhbSh0aWNrZXQudHNQcm9ncmFtLCB0aWNrZXQucHJvZ3JhbURyaXZlcikpLFxuICAgICAgICAgICAgdGlja2V0LmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgICAgICB0aWNrZXQudXNlUG9pc29uZWREYXRhLFxuICAgICAgICAgICAgdGlja2V0LnBlcmZSZWNvcmRlcixcbiAgICAgICAgKTtcbiAgICAgIGNhc2UgQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsVHlwZVNjcmlwdDpcbiAgICAgICAgcmV0dXJuIG5ldyBOZ0NvbXBpbGVyKFxuICAgICAgICAgICAgYWRhcHRlcixcbiAgICAgICAgICAgIHRpY2tldC5vcHRpb25zLFxuICAgICAgICAgICAgdGlja2V0Lm5ld1Byb2dyYW0sXG4gICAgICAgICAgICB0aWNrZXQucHJvZ3JhbURyaXZlcixcbiAgICAgICAgICAgIHRpY2tldC5pbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICAgICAgICB0aWNrZXQuaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgICAgICAgIHRpY2tldC5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICAgICAgdGlja2V0LnVzZVBvaXNvbmVkRGF0YSxcbiAgICAgICAgICAgIHRpY2tldC5wZXJmUmVjb3JkZXIsXG4gICAgICAgICk7XG4gICAgICBjYXNlIENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFJlc291cmNlOlxuICAgICAgICBjb25zdCBjb21waWxlciA9IHRpY2tldC5jb21waWxlcjtcbiAgICAgICAgY29tcGlsZXIudXBkYXRlV2l0aENoYW5nZWRSZXNvdXJjZXModGlja2V0Lm1vZGlmaWVkUmVzb3VyY2VGaWxlcywgdGlja2V0LnBlcmZSZWNvcmRlcik7XG4gICAgICAgIHJldHVybiBjb21waWxlcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBhZGFwdGVyOiBOZ0NvbXBpbGVyQWRhcHRlcixcbiAgICAgIHJlYWRvbmx5IG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBpbnB1dFByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICByZWFkb25seSBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgICAgcmVhZG9ubHkgaW5jcmVtZW50YWxTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgICAgcmVhZG9ubHkgaW5jcmVtZW50YWxDb21waWxhdGlvbjogSW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgIHJlYWRvbmx5IGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW4sXG4gICAgICByZWFkb25seSB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGxpdmVQZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcixcbiAgKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5fZXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzID09PSB0cnVlICYmXG4gICAgICAgIHRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXMgPT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1RoZSBcXCdfZXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzXFwnIG9wdGlvbiByZXF1aXJlcyBcXCdzdHJpY3RUZW1wbGF0ZXNcXCcgdG8gYWxzbyBiZSBlbmFibGVkLicpO1xuICAgIH1cblxuICAgIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MucHVzaCguLi50aGlzLmFkYXB0ZXIuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MpO1xuICAgIGNvbnN0IGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljID0gdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICBpZiAoaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MucHVzaChpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyk7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IGlucHV0UHJvZ3JhbTtcbiAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgPSAhIXRoaXMub3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjtcblxuICAgIHRoaXMuZW50cnlQb2ludCA9XG4gICAgICAgIGFkYXB0ZXIuZW50cnlQb2ludCAhPT0gbnVsbCA/IGdldFNvdXJjZUZpbGVPck51bGwoaW5wdXRQcm9ncmFtLCBhZGFwdGVyLmVudHJ5UG9pbnQpIDogbnVsbDtcblxuICAgIGNvbnN0IG1vZHVsZVJlc29sdXRpb25DYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShcbiAgICAgICAgdGhpcy5hZGFwdGVyLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgICAgICAgLy8gZG9lbid0IHJldGFpbiBhIHJlZmVyZW5jZSB0byBgdGhpc2AsIGlmIG90aGVyIGNsb3N1cmVzIGluIHRoZSBjb25zdHJ1Y3RvciBoZXJlIHJlZmVyZW5jZVxuICAgICAgICAvLyBgdGhpc2AgaW50ZXJuYWxseSB0aGVuIGEgY2xvc3VyZSBjcmVhdGVkIGhlcmUgd291bGQgcmV0YWluIHRoZW0uIFRoaXMgY2FuIGNhdXNlIG1ham9yXG4gICAgICAgIC8vIG1lbW9yeSBsZWFrIGlzc3VlcyBzaW5jZSB0aGUgYG1vZHVsZVJlc29sdXRpb25DYWNoZWAgaXMgYSBsb25nLWxpdmVkIG9iamVjdCBhbmQgZmluZHMgaXRzXG4gICAgICAgIC8vIHdheSBpbnRvIGFsbCBraW5kcyBvZiBwbGFjZXMgaW5zaWRlIFRTIGludGVybmFsIG9iamVjdHMuXG4gICAgICAgIHRoaXMuYWRhcHRlci5nZXRDYW5vbmljYWxGaWxlTmFtZS5iaW5kKHRoaXMuYWRhcHRlcikpO1xuICAgIHRoaXMubW9kdWxlUmVzb2x2ZXIgPVxuICAgICAgICBuZXcgTW9kdWxlUmVzb2x2ZXIoaW5wdXRQcm9ncmFtLCB0aGlzLm9wdGlvbnMsIHRoaXMuYWRhcHRlciwgbW9kdWxlUmVzb2x1dGlvbkNhY2hlKTtcbiAgICB0aGlzLnJlc291cmNlTWFuYWdlciA9IG5ldyBBZGFwdGVyUmVzb3VyY2VMb2FkZXIoYWRhcHRlciwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcihcbiAgICAgICAgbmV3IEltcG9ydEdyYXBoKGlucHV0UHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxTdGF0ZSh0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc3RhdGUsIGlucHV0UHJvZ3JhbSk7XG5cbiAgICB0aGlzLmlnbm9yZUZvckRpYWdub3N0aWNzID1cbiAgICAgICAgbmV3IFNldChpbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gdGhpcy5hZGFwdGVyLmlzU2hpbShzZikpKTtcbiAgICB0aGlzLmlnbm9yZUZvckVtaXQgPSB0aGlzLmFkYXB0ZXIuaWdub3JlRm9yRW1pdDtcblxuICAgIGxldCBkdHNGaWxlQ291bnQgPSAwO1xuICAgIGxldCBub25EdHNGaWxlQ291bnQgPSAwO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBkdHNGaWxlQ291bnQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vbkR0c0ZpbGVDb3VudCsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxpdmVQZXJmUmVjb3JkZXIuZXZlbnRDb3VudChQZXJmRXZlbnQuSW5wdXREdHNGaWxlLCBkdHNGaWxlQ291bnQpO1xuICAgIGxpdmVQZXJmUmVjb3JkZXIuZXZlbnRDb3VudChQZXJmRXZlbnQuSW5wdXRUc0ZpbGUsIG5vbkR0c0ZpbGVDb3VudCk7XG4gIH1cblxuICBnZXQgcGVyZlJlY29yZGVyKCk6IEFjdGl2ZVBlcmZSZWNvcmRlciB7XG4gICAgcmV0dXJuIHRoaXMubGl2ZVBlcmZSZWNvcmRlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHBvc2VzIHRoZSBgSW5jcmVtZW50YWxDb21waWxhdGlvbmAgdW5kZXIgYW4gb2xkIHByb3BlcnR5IG5hbWUgdGhhdCB0aGUgQ0xJIHVzZXMsIGF2b2lkaW5nIGFcbiAgICogY2hpY2tlbi1hbmQtZWdnIHByb2JsZW0gd2l0aCB0aGUgcmVuYW1lIHRvIGBpbmNyZW1lbnRhbENvbXBpbGF0aW9uYC5cbiAgICpcbiAgICogVE9ETyhhbHhodWIpOiByZW1vdmUgd2hlbiB0aGUgQ0xJIHVzZXMgdGhlIG5ldyBuYW1lLlxuICAgKi9cbiAgZ2V0IGluY3JlbWVudGFsRHJpdmVyKCk6IEluY3JlbWVudGFsQ29tcGlsYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb247XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVdpdGhDaGFuZ2VkUmVzb3VyY2VzKFxuICAgICAgY2hhbmdlZFJlc291cmNlczogU2V0PHN0cmluZz4sIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyKTogdm9pZCB7XG4gICAgdGhpcy5saXZlUGVyZlJlY29yZGVyID0gcGVyZlJlY29yZGVyO1xuICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlci50YXJnZXQgPSBwZXJmUmVjb3JkZXI7XG5cbiAgICBwZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuUmVzb3VyY2VVcGRhdGUsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICAgIC8vIEFuYWx5c2lzIGhhc24ndCBoYXBwZW5lZCB5ZXQsIHNvIG5vIHVwZGF0ZSBpcyBuZWNlc3NhcnkgLSBhbnkgY2hhbmdlcyB0byByZXNvdXJjZXMgd2lsbFxuICAgICAgICAvLyBiZSBjYXB0dXJlZCBieSB0aGUgaW5pdGFsIGFuYWx5c2lzIHBhc3MgaXRzZWxmLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyLmludmFsaWRhdGUoKTtcblxuICAgICAgY29uc3QgY2xhc3Nlc1RvVXBkYXRlID0gbmV3IFNldDxEZWNsYXJhdGlvbk5vZGU+KCk7XG4gICAgICBmb3IgKGNvbnN0IHJlc291cmNlRmlsZSBvZiBjaGFuZ2VkUmVzb3VyY2VzKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGVtcGxhdGVDbGFzcyBvZiB0aGlzLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKHJlc291cmNlRmlsZSkpIHtcbiAgICAgICAgICBjbGFzc2VzVG9VcGRhdGUuYWRkKHRlbXBsYXRlQ2xhc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBzdHlsZUNsYXNzIG9mIHRoaXMuZ2V0Q29tcG9uZW50c1dpdGhTdHlsZUZpbGUocmVzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIGNsYXNzZXNUb1VwZGF0ZS5hZGQoc3R5bGVDbGFzcyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBjbGF6eiBvZiBjbGFzc2VzVG9VcGRhdGUpIHtcbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLnVwZGF0ZVJlc291cmNlcyhjbGF6eik7XG4gICAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmludmFsaWRhdGVDbGFzcyhjbGF6eik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSBkZXBlbmRlbmNpZXMgb2YgYSBmaWxlLlxuICAgKlxuICAgKiBJZiB0aGUgZmlsZSBpcyBub3QgcGFydCBvZiB0aGUgY29tcGlsYXRpb24sIGFuIGVtcHR5IGFycmF5IHdpbGwgYmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXRSZXNvdXJjZURlcGVuZGVuY2llcyhmaWxlOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nW10ge1xuICAgIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIHJldHVybiB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uZGVwR3JhcGguZ2V0UmVzb3VyY2VEZXBlbmRlbmNpZXMoZmlsZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBBbmd1bGFyLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqL1xuICBnZXREaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljcygpLCAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKSk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5fZXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuZ2V0RXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoZGlhZ25vc3RpY3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgQW5ndWxhci1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBJZiBhIGB0cy5Tb3VyY2VGaWxlYCBpcyBwYXNzZWQsIG9ubHkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGF0IGZpbGUgYXJlIHJldHVybmVkLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKGZpbGU6IHRzLlNvdXJjZUZpbGUsIG9wdGltaXplRm9yOiBPcHRpbWl6ZUZvcik6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgIC4uLnRoaXMuZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljcygpLmZpbHRlcihkaWFnID0+IGRpYWcuZmlsZSA9PT0gZmlsZSksXG4gICAgICAgIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljc0ZvckZpbGUoZmlsZSwgb3B0aW1pemVGb3IpKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLl9leHRlbmRlZFRlbXBsYXRlRGlhZ25vc3RpY3MpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGhpcy5nZXRFeHRlbmRlZFRlbXBsYXRlRGlhZ25vc3RpY3MoZmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoZGlhZ25vc3RpY3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgYHRzLkRpYWdub3N0aWNgcyBjdXJyZW50bHkgYXZhaWxhYmxlIHRoYXQgcGVydGFpbiB0byB0aGUgZ2l2ZW4gY29tcG9uZW50LlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NGb3JDb21wb25lbnQoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCB0dGMgPSBjb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnR0Yy5nZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQpKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLl9leHRlbmRlZFRlbXBsYXRlRGlhZ25vc3RpY3MpIHtcbiAgICAgIGNvbnN0IGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyID0gY29tcGlsYXRpb24uZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXI7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmV4dGVuZGVkVGVtcGxhdGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoZGlhZ25vc3RpY3MpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBBbmd1bGFyLmlvIGVycm9yIGd1aWRlIGxpbmtzIHRvIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBhZGRNZXNzYWdlVGV4dERldGFpbHMoZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzLm1hcChkaWFnID0+IHtcbiAgICAgIGlmIChkaWFnLmNvZGUgJiYgQ09NUElMRVJfRVJST1JTX1dJVEhfR1VJREVTLmhhcyhuZ0Vycm9yQ29kZShkaWFnLmNvZGUpKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLmRpYWcsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6IGRpYWcubWVzc2FnZVRleHQgK1xuICAgICAgICAgICAgICBgLiBGaW5kIG1vcmUgYXQgJHtFUlJPUl9ERVRBSUxTX1BBR0VfQkFTRV9VUkx9L05HJHtuZ0Vycm9yQ29kZShkaWFnLmNvZGUpfWBcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkaWFnO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgc2V0dXAtcmVsYXRlZCBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICovXG4gIGdldE9wdGlvbkRpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3M7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBjdXJyZW50IGB0cy5Qcm9ncmFtYCBrbm93biB0byB0aGlzIGBOZ0NvbXBpbGVyYC5cbiAgICpcbiAgICogQ29tcGlsYXRpb24gYmVnaW5zIHdpdGggYW4gaW5wdXQgYHRzLlByb2dyYW1gLCBhbmQgZHVyaW5nIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgb3BlcmF0aW9ucyBuZXdcbiAgICogYHRzLlByb2dyYW1gcyBtYXkgYmUgcHJvZHVjZWQgdXNpbmcgdGhlIGBQcm9ncmFtRHJpdmVyYC4gVGhlIG1vc3QgcmVjZW50IHN1Y2ggYHRzLlByb2dyYW1gIHRvXG4gICAqIGJlIHByb2R1Y2VkIGlzIGF2YWlsYWJsZSBoZXJlLlxuICAgKlxuICAgKiBUaGlzIGB0cy5Qcm9ncmFtYCBzZXJ2ZXMgdHdvIGtleSBwdXJwb3NlczpcbiAgICpcbiAgICogKiBBcyBhbiBpbmNyZW1lbnRhbCBzdGFydGluZyBwb2ludCBmb3IgY3JlYXRpbmcgdGhlIG5leHQgYHRzLlByb2dyYW1gIGJhc2VkIG9uIGZpbGVzIHRoYXQgdGhlXG4gICAqICAgdXNlciBoYXMgY2hhbmdlZCAoZm9yIGNsaWVudHMgdXNpbmcgdGhlIFRTIGNvbXBpbGVyIHByb2dyYW0gQVBJcykuXG4gICAqXG4gICAqICogQXMgdGhlIFwiYmVmb3JlXCIgcG9pbnQgZm9yIGFuIGluY3JlbWVudGFsIGNvbXBpbGF0aW9uIGludm9jYXRpb24sIHRvIGRldGVybWluZSB3aGF0J3MgY2hhbmdlZFxuICAgKiAgIGJldHdlZW4gdGhlIG9sZCBhbmQgbmV3IHByb2dyYW1zIChmb3IgYWxsIGNvbXBpbGF0aW9ucykuXG4gICAqL1xuICBnZXRDdXJyZW50UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UHJvZ3JhbTtcbiAgfVxuXG4gIGdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTogVGVtcGxhdGVUeXBlQ2hlY2tlciB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnVGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VyYCBkb2VzIG5vdCB3b3JrIHdpdGhvdXQgYGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXJgLicpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lbnN1cmVBbmFseXplZCgpLnRlbXBsYXRlVHlwZUNoZWNrZXI7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBgdHMuRGVjbGFyYXRpb25gcyBmb3IgYW55IGNvbXBvbmVudChzKSB3aGljaCB1c2UgdGhlIGdpdmVuIHRlbXBsYXRlIGZpbGUuXG4gICAqL1xuICBnZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZSh0ZW1wbGF0ZUZpbGVQYXRoOiBzdHJpbmcpOiBSZWFkb25seVNldDxEZWNsYXJhdGlvbk5vZGU+IHtcbiAgICBjb25zdCB7cmVzb3VyY2VSZWdpc3RyeX0gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIHJlc291cmNlUmVnaXN0cnkuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZShyZXNvbHZlKHRlbXBsYXRlRmlsZVBhdGgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGB0cy5EZWNsYXJhdGlvbmBzIGZvciBhbnkgY29tcG9uZW50KHMpIHdoaWNoIHVzZSB0aGUgZ2l2ZW4gdGVtcGxhdGUgZmlsZS5cbiAgICovXG4gIGdldENvbXBvbmVudHNXaXRoU3R5bGVGaWxlKHN0eWxlRmlsZVBhdGg6IHN0cmluZyk6IFJlYWRvbmx5U2V0PERlY2xhcmF0aW9uTm9kZT4ge1xuICAgIGNvbnN0IHtyZXNvdXJjZVJlZ2lzdHJ5fSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gcmVzb3VyY2VSZWdpc3RyeS5nZXRDb21wb25lbnRzV2l0aFN0eWxlKHJlc29sdmUoc3R5bGVGaWxlUGF0aCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBleHRlcm5hbCByZXNvdXJjZXMgZm9yIHRoZSBnaXZlbiBjb21wb25lbnQuXG4gICAqL1xuICBnZXRDb21wb25lbnRSZXNvdXJjZXMoY2xhc3NEZWNsOiBEZWNsYXJhdGlvbk5vZGUpOiBDb21wb25lbnRSZXNvdXJjZXN8bnVsbCB7XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjbGFzc0RlY2wpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qge3Jlc291cmNlUmVnaXN0cnl9ID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IHN0eWxlcyA9IHJlc291cmNlUmVnaXN0cnkuZ2V0U3R5bGVzKGNsYXNzRGVjbCk7XG4gICAgY29uc3QgdGVtcGxhdGUgPSByZXNvdXJjZVJlZ2lzdHJ5LmdldFRlbXBsYXRlKGNsYXNzRGVjbCk7XG4gICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge3N0eWxlcywgdGVtcGxhdGV9O1xuICB9XG5cbiAgZ2V0TWV0YShjbGFzc0RlY2w6IERlY2xhcmF0aW9uTm9kZSk6IFBpcGVNZXRhfERpcmVjdGl2ZU1ldGF8bnVsbCB7XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjbGFzc0RlY2wpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShjbGFzc0RlY2wpO1xuICAgIGNvbnN0IHttZXRhUmVhZGVyfSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBtZXRhID0gbWV0YVJlYWRlci5nZXRQaXBlTWV0YWRhdGEocmVmKSA/PyBtZXRhUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKHJlZik7XG4gICAgaWYgKG1ldGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIEFuZ3VsYXIncyBhbmFseXNpcyBzdGVwIChhcyBhIHByZWN1cnNvciB0byBgZ2V0RGlhZ25vc3RpY3NgIG9yIGBwcmVwYXJlRW1pdGApXG4gICAqIGFzeW5jaHJvbm91c2x5LlxuICAgKlxuICAgKiBOb3JtYWxseSwgdGhpcyBvcGVyYXRpb24gaGFwcGVucyBsYXppbHkgd2hlbmV2ZXIgYGdldERpYWdub3N0aWNzYCBvciBgcHJlcGFyZUVtaXRgIGFyZSBjYWxsZWQuXG4gICAqIEhvd2V2ZXIsIGNlcnRhaW4gY29uc3VtZXJzIG1heSB3aXNoIHRvIGFsbG93IGZvciBhbiBhc3luY2hyb25vdXMgcGhhc2Ugb2YgYW5hbHlzaXMsIHdoZXJlXG4gICAqIHJlc291cmNlcyBzdWNoIGFzIGBzdHlsZVVybHNgIGFyZSByZXNvbHZlZCBhc3luY2hvbm91c2x5LiBJbiB0aGVzZSBjYXNlcyBgYW5hbHl6ZUFzeW5jYCBtdXN0IGJlXG4gICAqIGNhbGxlZCBmaXJzdCwgYW5kIGl0cyBgUHJvbWlzZWAgYXdhaXRlZCBwcmlvciB0byBjYWxsaW5nIGFueSBvdGhlciBBUElzIG9mIGBOZ0NvbXBpbGVyYC5cbiAgICovXG4gIGFzeW5jIGFuYWx5emVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLkFuYWx5c2lzLCBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcblxuICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplQXN5bmMoc2YpO1xuICAgICAgICBpZiAoYW5hbHlzaXNQcm9taXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGFuYWx5c2lzUHJvbWlzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuQW5hbHlzaXMpO1xuICAgICAgdGhpcy5yZXNvbHZlQ29tcGlsYXRpb24odGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGxhenkgcm91dGVzIGRldGVjdGVkIGR1cmluZyBhbmFseXNpcy5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgY2FsbGVkIGZvciBvbmUgc3BlY2lmaWMgcm91dGUsIG9yIHRvIHJldHJpZXZlIGFsbCB0b3AtbGV2ZWwgcm91dGVzLlxuICAgKi9cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdIHtcbiAgICBpZiAoZW50cnlSb3V0ZSkge1xuICAgICAgLy8gaHR0czovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvNTA3MzJlMTU2L3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMjTDE3NS1MMTg4KS5cbiAgICAgIC8vXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCB3aWxsIGFsd2F5cyBjYWxsIHRoaXMgQVBJIHdpdGggYW4gYWJzb2x1dGUgcGF0aCwgc28gdGhlIHJlc29sdXRpb24gc3RlcCBpc1xuICAgICAgLy8gbm90IG5lY2Vzc2FyeSwgYnV0IGtlZXBpbmcgaXQgYmFja3dhcmRzIGNvbXBhdGlibGUgaW4gY2FzZSBzb21lb25lIGVsc2UgaXMgdXNpbmcgdGhlIEFQSS5cblxuICAgICAgLy8gUmVsYXRpdmUgZW50cnkgcGF0aHMgYXJlIGRpc2FsbG93ZWQuXG4gICAgICBpZiAoZW50cnlSb3V0ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gbGlzdCBsYXp5IHJvdXRlczogUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyAoJHtcbiAgICAgICAgICAgIGVudHJ5Um91dGV9KSBpcyBub3Qgc3VwcG9ydGVkLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tcmVsYXRpdmUgZW50cnkgcGF0aHMgZmFsbCBpbnRvIG9uZSBvZiB0aGUgZm9sbG93aW5nIGNhdGVnb3JpZXM6XG4gICAgICAvLyAtIEFic29sdXRlIHN5c3RlbSBwYXRocyAoZS5nLiBgL2Zvby9iYXIvbXktcHJvamVjdC9teS1tb2R1bGVgKSwgd2hpY2ggYXJlIHVuYWZmZWN0ZWQgYnkgdGhlXG4gICAgICAvLyAgIGxvZ2ljIGJlbG93LlxuICAgICAgLy8gLSBQYXRocyB0byBlbnRlcm5hbCBtb2R1bGVzIChlLmcuIGBzb21lLWxpYmApLlxuICAgICAgLy8gLSBQYXRocyBtYXBwZWQgdG8gZGlyZWN0b3JpZXMgaW4gYHRzY29uZmlnLmpzb25gIChlLmcuIGBzaGFyZWQvbXktbW9kdWxlYCkuXG4gICAgICAvLyAgIChTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbCNwYXRoLW1hcHBpbmcuKVxuICAgICAgLy9cbiAgICAgIC8vIEluIGFsbCBjYXNlcyBhYm92ZSwgdGhlIGBjb250YWluaW5nRmlsZWAgYXJndW1lbnQgaXMgaWdub3JlZCwgc28gd2UgY2FuIGp1c3QgdGFrZSB0aGUgZmlyc3RcbiAgICAgIC8vIG9mIHRoZSByb290IGZpbGVzLlxuICAgICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSB0aGlzLmlucHV0UHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKClbMF07XG4gICAgICBjb25zdCBbZW50cnlQYXRoLCBtb2R1bGVOYW1lXSA9IGVudHJ5Um91dGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID1cbiAgICAgICAgICByZXNvbHZlTW9kdWxlTmFtZShlbnRyeVBhdGgsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuYWRhcHRlciwgbnVsbCk7XG5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBlbnRyeVJvdXRlID0gZW50cnlQb2ludEtleUZvcihyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLCBtb2R1bGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gY29tcGlsYXRpb24ucm91dGVBbmFseXplci5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCB0cmFuc2Zvcm1lcnMgYW5kIG90aGVyIGluZm9ybWF0aW9uIHdoaWNoIGlzIG5lY2Vzc2FyeSBmb3IgYSBjb25zdW1lciB0byBgZW1pdGAgdGhlXG4gICAqIHByb2dyYW0gd2l0aCBBbmd1bGFyLWFkZGVkIGRlZmluaXRpb25zLlxuICAgKi9cbiAgcHJlcGFyZUVtaXQoKToge1xuICAgIHRyYW5zZm9ybWVyczogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICB9IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IGNvcmVJbXBvcnRzRnJvbSA9IGNvbXBpbGF0aW9uLmlzQ29yZSA/IGdldFIzU3ltYm9sc0ZpbGUodGhpcy5pbnB1dFByb2dyYW0pIDogbnVsbDtcbiAgICBsZXQgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyO1xuICAgIGlmIChjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwpIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyKGNvcmVJbXBvcnRzRnJvbS5maWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmF1bHRJbXBvcnRUcmFja2VyID0gbmV3IERlZmF1bHRJbXBvcnRUcmFja2VyKCk7XG5cbiAgICBjb25zdCBiZWZvcmUgPSBbXG4gICAgICBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIsIGNvbXBpbGF0aW9uLnJlZmxlY3RvciwgaW1wb3J0UmV3cml0ZXIsIGRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgY29tcGlsYXRpb24uaXNDb3JlLCB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQpLFxuICAgICAgYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZXhwb3J0U3RhdGVtZW50cyksXG4gICAgICBkZWZhdWx0SW1wb3J0VHJhY2tlci5pbXBvcnRQcmVzZXJ2aW5nVHJhbnNmb3JtZXIoKSxcbiAgICBdO1xuXG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnM6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdID0gW107XG4gICAgaWYgKGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMgIT09IG51bGwpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zLnB1c2goXG4gICAgICAgICAgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMsIGltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuXG4gICAgLy8gT25seSBhZGQgYWxpYXNpbmcgcmUtZXhwb3J0cyB0byB0aGUgLmQudHMgb3V0cHV0IGlmIHRoZSBgQWxpYXNpbmdIb3N0YCByZXF1ZXN0cyBpdC5cbiAgICBpZiAoY29tcGlsYXRpb24uYWxpYXNpbmdIb3N0ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmFsaWFzaW5nSG9zdC5hbGlhc0V4cG9ydHNJbkR0cykge1xuICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnMucHVzaChhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24udHJhaXRDb21waWxlci5leHBvcnRTdGF0ZW1lbnRzKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgYmVmb3JlLnB1c2goXG4gICAgICAgICAgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybSh0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIuc291cmNlSW5mbywgaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgYmVmb3JlLnB1c2goaXZ5U3dpdGNoVHJhbnNmb3JtKTtcblxuICAgIHJldHVybiB7dHJhbnNmb3JtZXJzOiB7YmVmb3JlLCBhZnRlckRlY2xhcmF0aW9uc30gYXMgdHMuQ3VzdG9tVHJhbnNmb3JtZXJzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gdGhlIGluZGV4aW5nIHByb2Nlc3MgYW5kIHJldHVybiBhIGBNYXBgIG9mIGFsbCBpbmRleGVkIGNvbXBvbmVudHMuXG4gICAqXG4gICAqIFNlZSB0aGUgYGluZGV4aW5nYCBwYWNrYWdlIGZvciBtb3JlIGRldGFpbHMuXG4gICAqL1xuICBnZXRJbmRleGVkQ29tcG9uZW50cygpOiBNYXA8RGVjbGFyYXRpb25Ob2RlLCBJbmRleGVkQ29tcG9uZW50PiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBJbmRleGluZ0NvbnRleHQoKTtcbiAgICBjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmluZGV4KGNvbnRleHQpO1xuICAgIHJldHVybiBnZW5lcmF0ZUFuYWx5c2lzKGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgaTE4biBtZXNzYWdlcyBpbnRvIHRoZSBgWGkxOG5Db250ZXh0YC5cbiAgICovXG4gIHhpMThuKGN0eDogWGkxOG5Db250ZXh0KTogdm9pZCB7XG4gICAgLy8gTm90ZSB0aGF0IHRoZSAncmVzb2x2ZScgcGhhc2UgaXMgbm90IHN0cmljdGx5IG5lY2Vzc2FyeSBmb3IgeGkxOG4sIGJ1dCB0aGlzIGlzIG5vdCBjdXJyZW50bHlcbiAgICAvLyBvcHRpbWl6ZWQuXG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29tcGlsYXRpb24udHJhaXRDb21waWxlci54aTE4bihjdHgpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbmFseXplZCh0aGlzOiBOZ0NvbXBpbGVyKTogTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICB0aGlzLmFuYWx5emVTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbXBpbGF0aW9uITtcbiAgfVxuXG4gIHByaXZhdGUgYW5hbHl6ZVN5bmMoKTogdm9pZCB7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuQW5hbHlzaXMsICgpID0+IHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplU3luYyhzZik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5BbmFseXNpcyk7XG5cbiAgICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlcik7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVDb21waWxhdGlvbih0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuUmVzb2x2ZSwgKCkgPT4ge1xuICAgICAgdHJhaXRDb21waWxlci5yZXNvbHZlKCk7XG5cbiAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIGFuYWx5c2lzIGlzIGNvbXBsZXRlIGFuZCB0aGUgY29tcGlsZXIgY2FuIG5vdyBjYWxjdWxhdGUgd2hpY2ggZmlsZXMgbmVlZCB0b1xuICAgICAgLy8gYmUgZW1pdHRlZCwgc28gZG8gdGhhdC5cbiAgICAgIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5yZWNvcmRTdWNjZXNzZnVsQW5hbHlzaXModHJhaXRDb21waWxlcik7XG5cbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5SZXNvbHZlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGZ1bGxUZW1wbGF0ZVR5cGVDaGVjaygpOiBib29sZWFuIHtcbiAgICAvLyBEZXRlcm1pbmUgdGhlIHN0cmljdG5lc3MgbGV2ZWwgb2YgdHlwZSBjaGVja2luZyBiYXNlZCBvbiBjb21waWxlciBvcHRpb25zLiBBc1xuICAgIC8vIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGEgc3VwZXJzZXQgb2YgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2AsIHRoZSBmb3JtZXIgaW1wbGllcyB0aGUgbGF0dGVyLlxuICAgIC8vIEFsc28gc2VlIGB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc2Agd2hlcmUgaXQgaXMgdmVyaWZpZWQgdGhhdCBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYFxuICAgIC8vIGlzIG5vdCBkaXNhYmxlZCB3aGVuIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGVuYWJsZWQuXG4gICAgY29uc3Qgc3RyaWN0VGVtcGxhdGVzID0gISF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzO1xuICAgIHJldHVybiBzdHJpY3RUZW1wbGF0ZXMgfHwgISF0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBlQ2hlY2tpbmdDb25maWcoKTogVHlwZUNoZWNraW5nQ29uZmlnIHtcbiAgICAvLyBEZXRlcm1pbmUgdGhlIHN0cmljdG5lc3MgbGV2ZWwgb2YgdHlwZSBjaGVja2luZyBiYXNlZCBvbiBjb21waWxlciBvcHRpb25zLiBBc1xuICAgIC8vIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGEgc3VwZXJzZXQgb2YgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2AsIHRoZSBmb3JtZXIgaW1wbGllcyB0aGUgbGF0dGVyLlxuICAgIC8vIEFsc28gc2VlIGB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc2Agd2hlcmUgaXQgaXMgdmVyaWZpZWQgdGhhdCBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYFxuICAgIC8vIGlzIG5vdCBkaXNhYmxlZCB3aGVuIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGVuYWJsZWQuXG4gICAgY29uc3Qgc3RyaWN0VGVtcGxhdGVzID0gISF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzO1xuXG4gICAgY29uc3QgdXNlSW5saW5lVHlwZUNvbnN0cnVjdG9ycyA9IHRoaXMucHJvZ3JhbURyaXZlci5zdXBwb3J0c0lubGluZU9wZXJhdGlvbnM7XG5cbiAgICAvLyBGaXJzdCBzZWxlY3QgYSB0eXBlLWNoZWNraW5nIGNvbmZpZ3VyYXRpb24sIGJhc2VkIG9uIHdoZXRoZXIgZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGlzXG4gICAgLy8gcmVxdWVzdGVkLlxuICAgIGxldCB0eXBlQ2hlY2tpbmdDb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZztcbiAgICBpZiAodGhpcy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogdHJ1ZSxcbiAgICAgICAgYWx3YXlzQ2hlY2tTY2hlbWFJblRlbXBsYXRlQm9kaWVzOiB0cnVlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIEV2ZW4gaW4gZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIERPTSBiaW5kaW5nIGNoZWNrcyBhcmUgbm90IHF1aXRlIHJlYWR5IHlldC5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIENoZWNraW5nIG9mIERPTSBldmVudHMgY3VycmVudGx5IGhhcyBhbiBhZHZlcnNlIGVmZmVjdCBvbiBkZXZlbG9wZXIgZXhwZXJpZW5jZSxcbiAgICAgICAgLy8gZS5nLiBmb3IgYDxpbnB1dCAoYmx1cik9XCJ1cGRhdGUoJGV2ZW50LnRhcmdldC52YWx1ZSlcIj5gIGVuYWJsaW5nIHRoaXMgY2hlY2sgcmVzdWx0cyBpbjpcbiAgICAgICAgLy8gLSBlcnJvciBUUzI1MzE6IE9iamVjdCBpcyBwb3NzaWJseSAnbnVsbCcuXG4gICAgICAgIC8vIC0gZXJyb3IgVFMyMzM5OiBQcm9wZXJ0eSAndmFsdWUnIGRvZXMgbm90IGV4aXN0IG9uIHR5cGUgJ0V2ZW50VGFyZ2V0Jy5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIE5vbi1ET00gcmVmZXJlbmNlcyBoYXZlIHRoZSBjb3JyZWN0IHR5cGUgaW4gVmlldyBFbmdpbmUgc28gdGhlcmUgaXMgbm8gc3RyaWN0bmVzcyBmbGFnLlxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IHRydWUsXG4gICAgICAgIC8vIFBpcGVzIGFyZSBjaGVja2VkIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogdHJ1ZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICB1c2VDb250ZXh0R2VuZXJpY1R5cGU6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgc3RyaWN0TGl0ZXJhbFR5cGVzOiB0cnVlLFxuICAgICAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiB0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgIHVzZUlubGluZVR5cGVDb25zdHJ1Y3RvcnMsXG4gICAgICAgIC8vIFdhcm5pbmdzIGZvciBzdWJvcHRpbWFsIHR5cGUgaW5mZXJlbmNlIGFyZSBvbmx5IGVuYWJsZWQgaWYgaW4gTGFuZ3VhZ2UgU2VydmljZSBtb2RlXG4gICAgICAgIC8vIChwcm92aWRpbmcgdGhlIGZ1bGwgVGVtcGxhdGVUeXBlQ2hlY2tlciBBUEkpIGFuZCBpZiBzdHJpY3QgbW9kZSBpcyBub3QgZW5hYmxlZC4gSW4gc3RyaWN0XG4gICAgICAgIC8vIG1vZGUsIHRoZSB1c2VyIGlzIGluIGZ1bGwgY29udHJvbCBvZiB0eXBlIGluZmVyZW5jZS5cbiAgICAgICAgc3VnZ2VzdGlvbnNGb3JTdWJvcHRpbWFsVHlwZUluZmVyZW5jZTogdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyICYmICFzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcgPSB7XG4gICAgICAgIGFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogZmFsc2UsXG4gICAgICAgIC8vIEVuYWJsZSBkZWVwIHNjaGVtYSBjaGVja2luZyBpbiBcImJhc2ljXCIgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlIG9ubHkgaWYgQ2xvc3VyZVxuICAgICAgICAvLyBjb21waWxhdGlvbiBpcyByZXF1ZXN0ZWQsIHdoaWNoIGlzIGEgZ29vZCBwcm94eSBmb3IgXCJvbmx5IGluIGdvb2dsZTNcIi5cbiAgICAgICAgYWx3YXlzQ2hlY2tTY2hlbWFJblRlbXBsYXRlQm9kaWVzOiB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsXG4gICAgICAgIGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbUV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IGZhbHNlLFxuICAgICAgICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzOiBmYWxzZSxcbiAgICAgICAgdXNlQ29udGV4dEdlbmVyaWNUeXBlOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TGl0ZXJhbFR5cGVzOiBmYWxzZSxcbiAgICAgICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICB1c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzLFxuICAgICAgICAvLyBJbiBcImJhc2ljXCIgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlLCBubyB3YXJuaW5ncyBhcmUgcHJvZHVjZWQgc2luY2UgbW9zdCB0aGluZ3MgYXJlXG4gICAgICAgIC8vIG5vdCBjaGVja2VkIGFueXdheXMuXG4gICAgICAgIHN1Z2dlc3Rpb25zRm9yU3Vib3B0aW1hbFR5cGVJbmZlcmVuY2U6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBBcHBseSBleHBsaWNpdGx5IGNvbmZpZ3VyZWQgc3RyaWN0bmVzcyBmbGFncyBvbiB0b3Agb2YgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgIC8vIGJhc2VkIG9uIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0QWNjZXNzTW9kaWZpZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5ob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3MgPVxuICAgICAgICAgIHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dEFjY2Vzc01vZGlmaWVycztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3ROdWxsSW5wdXRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbElucHV0VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tRXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUxvY2FsUmVmVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3REb21Mb2NhbFJlZlR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdEF0dHJpYnV0ZVR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkF0dHJpYnV0ZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0QXR0cmlidXRlVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUgPSB0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TGl0ZXJhbFR5cGVzID0gdGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcztcbiAgICB9XG5cbiAgICByZXR1cm4gdHlwZUNoZWNraW5nQ29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgdGhpcy5hZGFwdGVyLmlzU2hpbShzZikpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAgLi4uY29tcGlsYXRpb24udGVtcGxhdGVUeXBlQ2hlY2tlci5nZXREaWFnbm9zdGljc0ZvckZpbGUoc2YsIE9wdGltaXplRm9yLldob2xlUHJvZ3JhbSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpO1xuICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneS5zZXRJbmNyZW1lbnRhbFN0YXRlKHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5zdGF0ZSwgcHJvZ3JhbSk7XG4gICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIGdldFRlbXBsYXRlRGlhZ25vc3RpY3NGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBvcHRpbWl6ZUZvcjogT3B0aW1pemVGb3IpOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICAvLyBHZXQgdGhlIGRpYWdub3N0aWNzLlxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlICYmICF0aGlzLmFkYXB0ZXIuaXNTaGltKHNmKSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yRmlsZShzZiwgb3B0aW1pemVGb3IpKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxTdGF0ZSh0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc3RhdGUsIHByb2dyYW0pO1xuICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgaWYgKHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcyA9PT0gbnVsbCkge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgICB0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3MgPSBbLi4uY29tcGlsYXRpb24udHJhaXRDb21waWxlci5kaWFnbm9zdGljc107XG4gICAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQsIHRoaXMuaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3M7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgdGhlIGBleHRlbmRlZFRlbXBsYXRlQ2hlY2tgIHBoYXNlIG9mIHRoZSB0cmFpdCBjb21waWxlclxuICAgKiBAcGFyYW0gc2Ygb3B0aW9uYWwgcGFyYW1ldGVyIHRvIGdldCBkaWFnbm9zdGljcyBmb3IgYSBjZXJ0YWluIGZpbGVcbiAgICogICAgIG9yIGFsbCBmaWxlcyBpbiB0aGUgcHJvZ3JhbSBpZiBgc2ZgIGlzIHVuZGVmaW5lZFxuICAgKiBAcmV0dXJucyBnZW5lcmF0ZWQgZXh0ZW5kZWQgdGVtcGxhdGUgZGlhZ25vc3RpY3NcbiAgICovXG4gIHByaXZhdGUgZ2V0RXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzKHNmPzogdHMuU291cmNlRmlsZSk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyID0gY29tcGlsYXRpb24uZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXI7XG4gICAgaWYgKHNmICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmV4dGVuZGVkVGVtcGxhdGVDaGVjayhzZiwgZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXIpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMuaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAgLi4uY29tcGlsYXRpb24udHJhaXRDb21waWxlci5leHRlbmRlZFRlbXBsYXRlQ2hlY2soc2YsIGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlQ29tcGlsYXRpb24oKTogTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICAgIGNvbnN0IGNoZWNrZXIgPSB0aGlzLmlucHV0UHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgcmVmbGVjdG9yID0gbmV3IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdChjaGVja2VyKTtcblxuICAgIC8vIENvbnN0cnVjdCB0aGUgUmVmZXJlbmNlRW1pdHRlci5cbiAgICBsZXQgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcjtcbiAgICBsZXQgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QgPT09IG51bGwgfHwgIXRoaXMub3B0aW9ucy5fdXNlSG9zdEZvckltcG9ydEdlbmVyYXRpb24pIHtcbiAgICAgIGxldCBsb2NhbEltcG9ydFN0cmF0ZWd5OiBSZWZlcmVuY2VFbWl0U3RyYXRlZ3k7XG5cbiAgICAgIC8vIFRoZSBzdHJhdGVneSB1c2VkIGZvciBsb2NhbCwgaW4tcHJvamVjdCBpbXBvcnRzIGRlcGVuZHMgb24gd2hldGhlciBUUyBoYXMgYmVlbiBjb25maWd1cmVkXG4gICAgICAvLyB3aXRoIHJvb3REaXJzLiBJZiBzbywgdGhlbiBtdWx0aXBsZSBkaXJlY3RvcmllcyBtYXkgYmUgbWFwcGVkIGluIHRoZSBzYW1lIFwibW9kdWxlXG4gICAgICAvLyBuYW1lc3BhY2VcIiBhbmQgdGhlIGxvZ2ljIG9mIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBpcyByZXF1aXJlZCB0byBnZW5lcmF0ZSBjb3JyZWN0XG4gICAgICAvLyBpbXBvcnRzIHdoaWNoIG1heSBjcm9zcyB0aGVzZSBtdWx0aXBsZSBkaXJlY3Rvcmllcy4gT3RoZXJ3aXNlLCBwbGFpbiByZWxhdGl2ZSBpbXBvcnRzIGFyZVxuICAgICAgLy8gc3VmZmljaWVudC5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucm9vdERpciAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgKHRoaXMub3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkICYmIHRoaXMub3B0aW9ucy5yb290RGlycy5sZW5ndGggPiAwKSkge1xuICAgICAgICAvLyByb290RGlycyBsb2dpYyBpcyBpbiBlZmZlY3QgLSB1c2UgdGhlIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBmb3IgaW4tcHJvamVjdCByZWxhdGl2ZVxuICAgICAgICAvLyBpbXBvcnRzLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID0gbmV3IExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3koXG4gICAgICAgICAgICByZWZsZWN0b3IsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbShbLi4udGhpcy5hZGFwdGVyLnJvb3REaXJzXSwgdGhpcy5hZGFwdGVyKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBQbGFpbiByZWxhdGl2ZSBpbXBvcnRzIGFyZSBhbGwgdGhhdCdzIG5lZWRlZC5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSA9IG5ldyBSZWxhdGl2ZVBhdGhTdHJhdGVneShyZWZsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IGRvZXNuJ3QgaGF2ZSBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gYnVpbGQgYW4gTlBNLWNlbnRyaWMgcmVmZXJlbmNlXG4gICAgICAvLyByZXNvbHV0aW9uIHN0cmF0ZWd5LlxuICAgICAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gTmV4dCwgYXR0ZW1wdCB0byB1c2UgYW4gYWJzb2x1dGUgaW1wb3J0LlxuICAgICAgICBuZXcgQWJzb2x1dGVNb2R1bGVTdHJhdGVneSh0aGlzLmlucHV0UHJvZ3JhbSwgY2hlY2tlciwgdGhpcy5tb2R1bGVSZXNvbHZlciwgcmVmbGVjdG9yKSxcbiAgICAgICAgLy8gRmluYWxseSwgY2hlY2sgaWYgdGhlIHJlZmVyZW5jZSBpcyBiZWluZyB3cml0dGVuIGludG8gYSBmaWxlIHdpdGhpbiB0aGUgcHJvamVjdCdzIC50c1xuICAgICAgICAvLyBzb3VyY2VzLCBhbmQgdXNlIGEgcmVsYXRpdmUgaW1wb3J0IGlmIHNvLiBJZiB0aGlzIGZhaWxzLCBSZWZlcmVuY2VFbWl0dGVyIHdpbGwgdGhyb3dcbiAgICAgICAgLy8gYW4gZXJyb3IuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3ksXG4gICAgICBdKTtcblxuICAgICAgLy8gSWYgYW4gZW50cnlwb2ludCBpcyBwcmVzZW50LCB0aGVuIGFsbCB1c2VyIGltcG9ydHMgc2hvdWxkIGJlIGRpcmVjdGVkIHRocm91Z2ggdGhlXG4gICAgICAvLyBlbnRyeXBvaW50IGFuZCBwcml2YXRlIGV4cG9ydHMgYXJlIG5vdCBuZWVkZWQuIFRoZSBjb21waWxlciB3aWxsIHZhbGlkYXRlIHRoYXQgYWxsIHB1YmxpY2x5XG4gICAgICAvLyB2aXNpYmxlIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIGltcG9ydGFibGUgdmlhIHRoaXMgZW50cnlwb2ludC5cbiAgICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgPT09IG51bGwgJiYgdGhpcy5vcHRpb25zLmdlbmVyYXRlRGVlcFJlZXhwb3J0cyA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBObyBlbnRyeXBvaW50IGlzIHByZXNlbnQgYW5kIGRlZXAgcmUtZXhwb3J0cyB3ZXJlIHJlcXVlc3RlZCwgc28gY29uZmlndXJlIHRoZSBhbGlhc2luZ1xuICAgICAgICAvLyBzeXN0ZW0gdG8gZ2VuZXJhdGUgdGhlbS5cbiAgICAgICAgYWxpYXNpbmdIb3N0ID0gbmV3IFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QocmVmbGVjdG9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBzdXBwb3J0cyBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gdXNlIHRoYXQgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgYWxpYXNlZCByZWZlcmVuY2VzICh0aGlzIGlzIGEgd29ya2Fyb3VuZCB0byBTdHJpY3REZXBzIGNoZWNrcykuXG4gICAgICAgIG5ldyBBbGlhc1N0cmF0ZWd5KCksXG4gICAgICAgIC8vIFRoZW4gdXNlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lIHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgICAgbmV3IFVuaWZpZWRNb2R1bGVzU3RyYXRlZ3kocmVmbGVjdG9yLCB0aGlzLmFkYXB0ZXIudW5pZmllZE1vZHVsZXNIb3N0KSxcbiAgICAgIF0pO1xuICAgICAgYWxpYXNpbmdIb3N0ID0gbmV3IFVuaWZpZWRNb2R1bGVzQWxpYXNpbmdIb3N0KHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QpO1xuICAgIH1cblxuICAgIGNvbnN0IGV2YWx1YXRvciA9XG4gICAgICAgIG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHJlZmxlY3RvciwgY2hlY2tlciwgdGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLmRlcEdyYXBoKTtcbiAgICBjb25zdCBkdHNSZWFkZXIgPSBuZXcgRHRzTWV0YWRhdGFSZWFkZXIoY2hlY2tlciwgcmVmbGVjdG9yKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyID0gbG9jYWxNZXRhUmVnaXN0cnk7XG4gICAgY29uc3QgZGVwU2NvcGVSZWFkZXIgPSBuZXcgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyKGR0c1JlYWRlciwgYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlZ2lzdHJ5ID1cbiAgICAgICAgbmV3IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeShsb2NhbE1ldGFSZWFkZXIsIGRlcFNjb3BlUmVhZGVyLCByZWZFbWl0dGVyLCBhbGlhc2luZ0hvc3QpO1xuICAgIGNvbnN0IHNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlciA9IHNjb3BlUmVnaXN0cnk7XG4gICAgY29uc3Qgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgPSB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI7XG4gICAgY29uc3QgbWV0YVJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbbG9jYWxNZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnldKTtcbiAgICBjb25zdCBpbmplY3RhYmxlUmVnaXN0cnkgPSBuZXcgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnkocmVmbGVjdG9yKTtcblxuICAgIGNvbnN0IG1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbbG9jYWxNZXRhUmVhZGVyLCBkdHNSZWFkZXJdKTtcbiAgICBjb25zdCB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5ID0gbmV3IFR5cGVDaGVja1Njb3BlUmVnaXN0cnkoc2NvcGVSZWFkZXIsIG1ldGFSZWFkZXIpO1xuXG5cbiAgICAvLyBJZiBhIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgd2FzIHNwZWNpZmllZCwgdGhlbiB0cmFjayByZWZlcmVuY2VzIHZpYSBhIGBSZWZlcmVuY2VHcmFwaGAgaW5cbiAgICAvLyBvcmRlciB0byBwcm9kdWNlIHByb3BlciBkaWFnbm9zdGljcyBmb3IgaW5jb3JyZWN0bHkgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy9ldGMuIElmIHRoZXJlXG4gICAgLy8gaXMgbm8gZmxhdCBtb2R1bGUgZW50cnlwb2ludCB0aGVuIGRvbid0IHBheSB0aGUgY29zdCBvZiB0cmFja2luZyByZWZlcmVuY2VzLlxuICAgIGxldCByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeTtcbiAgICBsZXQgZXhwb3J0UmVmZXJlbmNlR3JhcGg6IFJlZmVyZW5jZUdyYXBofG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwpIHtcbiAgICAgIGV4cG9ydFJlZmVyZW5jZUdyYXBoID0gbmV3IFJlZmVyZW5jZUdyYXBoKCk7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgUmVmZXJlbmNlR3JhcGhBZGFwdGVyKGV4cG9ydFJlZmVyZW5jZUdyYXBoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IE5vb3BSZWZlcmVuY2VzUmVnaXN0cnkoKTtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZUFuYWx5emVyID0gbmV3IE5nTW9kdWxlUm91dGVBbmFseXplcih0aGlzLm1vZHVsZVJlc29sdmVyLCBldmFsdWF0b3IpO1xuXG4gICAgY29uc3QgZHRzVHJhbnNmb3JtcyA9IG5ldyBEdHNUcmFuc2Zvcm1SZWdpc3RyeSgpO1xuXG4gICAgY29uc3QgaXNDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy5pbnB1dFByb2dyYW0pO1xuXG4gICAgY29uc3QgcmVzb3VyY2VSZWdpc3RyeSA9IG5ldyBSZXNvdXJjZVJlZ2lzdHJ5KCk7XG5cbiAgICBjb25zdCBjb21waWxhdGlvbk1vZGUgPVxuICAgICAgICB0aGlzLm9wdGlvbnMuY29tcGlsYXRpb25Nb2RlID09PSAncGFydGlhbCcgPyBDb21waWxhdGlvbk1vZGUuUEFSVElBTCA6IENvbXBpbGF0aW9uTW9kZS5GVUxMO1xuXG4gICAgLy8gQ3ljbGVzIGFyZSBoYW5kbGVkIGluIGZ1bGwgY29tcGlsYXRpb24gbW9kZSBieSBcInJlbW90ZSBzY29waW5nXCIuXG4gICAgLy8gXCJSZW1vdGUgc2NvcGluZ1wiIGRvZXMgbm90IHdvcmsgd2VsbCB3aXRoIHRyZWUgc2hha2luZyBmb3IgbGlicmFyaWVzLlxuICAgIC8vIFNvIGluIHBhcnRpYWwgY29tcGlsYXRpb24gbW9kZSwgd2hlbiBidWlsZGluZyBhIGxpYnJhcnksIGEgY3ljbGUgd2lsbCBjYXVzZSBhbiBlcnJvci5cbiAgICBjb25zdCBjeWNsZUhhbmRsaW5nU3RyYXRlZ3kgPSBjb21waWxhdGlvbk1vZGUgPT09IENvbXBpbGF0aW9uTW9kZS5GVUxMID9cbiAgICAgICAgQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LlVzZVJlbW90ZVNjb3BpbmcgOlxuICAgICAgICBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuRXJyb3I7XG5cbiAgICAvLyBTZXQgdXAgdGhlIEl2eUNvbXBpbGF0aW9uLCB3aGljaCBtYW5hZ2VzIHN0YXRlIGZvciB0aGUgSXZ5IHRyYW5zZm9ybWVyLlxuICAgIGNvbnN0IGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sfG51bGwsIHVua25vd24+W10gPSBbXG4gICAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBtZXRhUmVhZGVyLCBzY29wZVJlYWRlciwgc2NvcGVSZWdpc3RyeSxcbiAgICAgICAgICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LCByZXNvdXJjZVJlZ2lzdHJ5LCBpc0NvcmUsIHRoaXMucmVzb3VyY2VNYW5hZ2VyLFxuICAgICAgICAgIHRoaXMuYWRhcHRlci5yb290RGlycywgdGhpcy5vcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMgfHwgZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyAhPT0gZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQgIT09IGZhbHNlLCB0aGlzLnVzZVBvaXNvbmVkRGF0YSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsXG4gICAgICAgICAgY3ljbGVIYW5kbGluZ1N0cmF0ZWd5LCByZWZFbWl0dGVyLCB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uZGVwR3JhcGgsXG4gICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlciwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciksXG5cbiAgICAgIC8vIFRPRE8oYWx4aHViKTogdW5kZXJzdGFuZCB3aHkgdGhlIGNhc3QgaGVyZSBpcyBuZWNlc3NhcnkgKHNvbWV0aGluZyB0byBkbyB3aXRoIGBudWxsYFxuICAgICAgLy8gbm90IGJlaW5nIGFzc2lnbmFibGUgdG8gYHVua25vd25gIHdoZW4gd3JhcHBlZCBpbiBgUmVhZG9ubHlgKS5cbiAgICAgIC8vIGNsYW5nLWZvcm1hdCBvZmZcbiAgICAgICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LCBtZXRhUmVhZGVyLFxuICAgICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBpc0NvcmUsIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyLFxuICAgICAgICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCwgLyoqIGNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzICovIGZhbHNlLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcixcbiAgICAgICAgKSBhcyBSZWFkb25seTxEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sIHwgbnVsbCx1bmtub3duPj4sXG4gICAgICAvLyBjbGFuZy1mb3JtYXQgb25cbiAgICAgIC8vIFBpcGUgaGFuZGxlciBtdXN0IGJlIGJlZm9yZSBpbmplY3RhYmxlIGhhbmRsZXIgaW4gbGlzdCBzbyBwaXBlIGZhY3RvcmllcyBhcmUgcHJpbnRlZFxuICAgICAgLy8gYmVmb3JlIGluamVjdGFibGUgZmFjdG9yaWVzIChzbyBpbmplY3RhYmxlIGZhY3RvcmllcyBjYW4gZGVsZWdhdGUgdG8gdGhlbSlcbiAgICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LCBpbmplY3RhYmxlUmVnaXN0cnksIGlzQ29yZSxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpLFxuICAgICAgbmV3IEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgaXNDb3JlLCB0aGlzLm9wdGlvbnMuc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycyB8fCBmYWxzZSwgaW5qZWN0YWJsZVJlZ2lzdHJ5LFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciksXG4gICAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVhZGVyLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIHJlZmVyZW5jZXNSZWdpc3RyeSwgaXNDb3JlLFxuICAgICAgICAgIHJvdXRlQW5hbHl6ZXIsIHJlZkVtaXR0ZXIsIHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSwgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLCB0aGlzLm9wdGlvbnMuaTE4bkluTG9jYWxlKSxcbiAgICBdO1xuXG4gICAgY29uc3QgdHJhaXRDb21waWxlciA9IG5ldyBUcmFpdENvbXBpbGVyKFxuICAgICAgICBoYW5kbGVycywgcmVmbGVjdG9yLCB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIsIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgICAgdGhpcy5vcHRpb25zLmNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXMgIT09IGZhbHNlLCBjb21waWxhdGlvbk1vZGUsIGR0c1RyYW5zZm9ybXMsXG4gICAgICAgIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyKTtcblxuICAgIC8vIFRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgbWF5IHVzZSB0aGUgYFByb2dyYW1Ecml2ZXJgIHRvIHByb2R1Y2UgbmV3IGB0cy5Qcm9ncmFtYChzKS4gSWYgdGhpc1xuICAgIC8vIGhhcHBlbnMsIHRoZXkgbmVlZCB0byBiZSB0cmFja2VkIGJ5IHRoZSBgTmdDb21waWxlcmAuXG4gICAgY29uc3Qgbm90aWZ5aW5nRHJpdmVyID1cbiAgICAgICAgbmV3IE5vdGlmeWluZ1Byb2dyYW1Ecml2ZXJXcmFwcGVyKHRoaXMucHJvZ3JhbURyaXZlciwgKHByb2dyYW06IHRzLlByb2dyYW0pID0+IHtcbiAgICAgICAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxTdGF0ZSh0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc3RhdGUsIHByb2dyYW0pO1xuICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuICAgICAgICB9KTtcblxuICAgIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSBuZXcgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwoXG4gICAgICAgIHRoaXMuaW5wdXRQcm9ncmFtLCBub3RpZnlpbmdEcml2ZXIsIHRyYWl0Q29tcGlsZXIsIHRoaXMuZ2V0VHlwZUNoZWNraW5nQ29uZmlnKCksIHJlZkVtaXR0ZXIsXG4gICAgICAgIHJlZmxlY3RvciwgdGhpcy5hZGFwdGVyLCB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24sIHNjb3BlUmVnaXN0cnksIHR5cGVDaGVja1Njb3BlUmVnaXN0cnksXG4gICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcik7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZUNoZWNrcyA9IFtuZXcgSW52YWxpZEJhbmFuYUluQm94Q2hlY2soKV07XG4gICAgY29uc3QgZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXIgPVxuICAgICAgICBuZXcgRXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXJJbXBsKHRlbXBsYXRlVHlwZUNoZWNrZXIsIGNoZWNrZXIsIHRlbXBsYXRlQ2hlY2tzKTtcblxuICAgIHJldHVybiB7XG4gICAgICBpc0NvcmUsXG4gICAgICB0cmFpdENvbXBpbGVyLFxuICAgICAgcmVmbGVjdG9yLFxuICAgICAgc2NvcGVSZWdpc3RyeSxcbiAgICAgIGR0c1RyYW5zZm9ybXMsXG4gICAgICBleHBvcnRSZWZlcmVuY2VHcmFwaCxcbiAgICAgIHJvdXRlQW5hbHl6ZXIsXG4gICAgICBtZXRhUmVhZGVyLFxuICAgICAgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSxcbiAgICAgIGFsaWFzaW5nSG9zdCxcbiAgICAgIHJlZkVtaXR0ZXIsXG4gICAgICB0ZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgcmVzb3VyY2VSZWdpc3RyeSxcbiAgICAgIGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgZ2l2ZW4gYFByb2dyYW1gIGlzIEBhbmd1bGFyL2NvcmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUGFja2FnZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogYm9vbGVhbiB7XG4gIC8vIExvb2sgZm9yIGl0c19qdXN0X2FuZ3VsYXIudHMgc29tZXdoZXJlIGluIHRoZSBwcm9ncmFtLlxuICBjb25zdCByM1N5bWJvbHMgPSBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW0pO1xuICBpZiAocjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIGNvbnN0YW50IElUU19KVVNUX0FOR1VMQVIgaW4gdGhhdCBmaWxlLlxuICByZXR1cm4gcjNTeW1ib2xzLnN0YXRlbWVudHMuc29tZShzdG10ID0+IHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IG11c3QgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgYmUgZXhwb3J0ZWQuXG4gICAgaWYgKHN0bXQubW9kaWZpZXJzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXN0bXQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgZGVjbGFyZSBJVFNfSlVTVF9BTkdVTEFSLlxuICAgIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuc29tZShkZWNsID0+IHtcbiAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBtdXN0IG1hdGNoIHRoZSBuYW1lLlxuICAgICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSB8fCBkZWNsLm5hbWUudGV4dCAhPT0gJ0lUU19KVVNUX0FOR1VMQVInKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEl0IG11c3QgaW5pdGlhbGl6ZSB0aGUgdmFyaWFibGUgdG8gdHJ1ZS5cbiAgICAgIGlmIChkZWNsLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQgfHwgZGVjbC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgZGVmaW5pdGlvbiBtYXRjaGVzLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlICdyM19zeW1ib2xzLnRzJyBmaWxlIGluIHRoZSBnaXZlbiBgUHJvZ3JhbWAsIG9yIHJldHVybiBgbnVsbGAgaWYgaXQgd2Fzbid0IHRoZXJlLlxuICovXG5mdW5jdGlvbiBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbmQoZmlsZSA9PiBmaWxlLmZpbGVOYW1lLmluZGV4T2YoJ3IzX3N5bWJvbHMudHMnKSA+PSAwKSB8fCBudWxsO1xufVxuXG4vKipcbiAqIFNpbmNlIFwic3RyaWN0VGVtcGxhdGVzXCIgaXMgYSB0cnVlIHN1cGVyc2V0IG9mIHR5cGUgY2hlY2tpbmcgY2FwYWJpbGl0aWVzIGNvbXBhcmVkIHRvXG4gKiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiLCBpdCBpcyByZXF1aXJlZCB0aGF0IHRoZSBsYXR0ZXIgaXMgbm90IGV4cGxpY2l0bHkgZGlzYWJsZWQgaWYgdGhlXG4gKiBmb3JtZXIgaXMgZW5hYmxlZC5cbiAqL1xuZnVuY3Rpb24gdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnMob3B0aW9uczogTmdDb21waWxlck9wdGlvbnMpOiB0cy5EaWFnbm9zdGljfG51bGwge1xuICBpZiAob3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2sgPT09IGZhbHNlICYmIG9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICBjb2RlOiBuZ0Vycm9yQ29kZShFcnJvckNvZGUuQ09ORklHX1NUUklDVF9URU1QTEFURVNfSU1QTElFU19GVUxMX1RFTVBMQVRFX1RZUEVDSEVDSyksXG4gICAgICBmaWxlOiB1bmRlZmluZWQsXG4gICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBtZXNzYWdlVGV4dDpcbiAgICAgICAgICBgQW5ndWxhciBjb21waWxlciBvcHRpb24gXCJzdHJpY3RUZW1wbGF0ZXNcIiBpcyBlbmFibGVkLCBob3dldmVyIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgZGlzYWJsZWQuXG5cbkhhdmluZyB0aGUgXCJzdHJpY3RUZW1wbGF0ZXNcIiBmbGFnIGVuYWJsZWQgaW1wbGllcyB0aGF0IFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgYWxzbyBlbmFibGVkLCBzb1xudGhlIGxhdHRlciBjYW4gbm90IGJlIGV4cGxpY2l0bHkgZGlzYWJsZWQuXG5cbk9uZSBvZiB0aGUgZm9sbG93aW5nIGFjdGlvbnMgaXMgcmVxdWlyZWQ6XG4xLiBSZW1vdmUgdGhlIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgb3B0aW9uLlxuMi4gUmVtb3ZlIFwic3RyaWN0VGVtcGxhdGVzXCIgb3Igc2V0IGl0IHRvICdmYWxzZScuXG5cbk1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHRlbXBsYXRlIHR5cGUgY2hlY2tpbmcgY29tcGlsZXIgb3B0aW9ucyBjYW4gYmUgZm91bmQgaW4gdGhlIGRvY3VtZW50YXRpb246XG5odHRwczovL3Y5LmFuZ3VsYXIuaW8vZ3VpZGUvdGVtcGxhdGUtdHlwZWNoZWNrI3RlbXBsYXRlLXR5cGUtY2hlY2tpbmdgLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuY2xhc3MgUmVmZXJlbmNlR3JhcGhBZGFwdGVyIGltcGxlbWVudHMgUmVmZXJlbmNlc1JlZ2lzdHJ5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBncmFwaDogUmVmZXJlbmNlR3JhcGgpIHt9XG5cbiAgYWRkKHNvdXJjZTogRGVjbGFyYXRpb25Ob2RlLCAuLi5yZWZlcmVuY2VzOiBSZWZlcmVuY2U8RGVjbGFyYXRpb25Ob2RlPltdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB7bm9kZX0gb2YgcmVmZXJlbmNlcykge1xuICAgICAgbGV0IHNvdXJjZUZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc291cmNlRmlsZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgcmVjb3JkIGxvY2FsIHJlZmVyZW5jZXMgKG5vdCByZWZlcmVuY2VzIGludG8gLmQudHMgZmlsZXMpLlxuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCB8fCAhaXNEdHNQYXRoKHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgIHRoaXMuZ3JhcGguYWRkKHNvdXJjZSwgbm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIE5vdGlmeWluZ1Byb2dyYW1Ecml2ZXJXcmFwcGVyIGltcGxlbWVudHMgUHJvZ3JhbURyaXZlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBkZWxlZ2F0ZTogUHJvZ3JhbURyaXZlciwgcHJpdmF0ZSBub3RpZnlOZXdQcm9ncmFtOiAocHJvZ3JhbTogdHMuUHJvZ3JhbSkgPT4gdm9pZCkge31cblxuICBnZXQgc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zKCkge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLnN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucztcbiAgfVxuXG4gIGdldFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0UHJvZ3JhbSgpO1xuICB9XG5cbiAgdXBkYXRlRmlsZXMoY29udGVudHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVVwZGF0ZT4sIHVwZGF0ZU1vZGU6IFVwZGF0ZU1vZGUpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLnVwZGF0ZUZpbGVzKGNvbnRlbnRzLCB1cGRhdGVNb2RlKTtcbiAgICB0aGlzLm5vdGlmeU5ld1Byb2dyYW0odGhpcy5kZWxlZ2F0ZS5nZXRQcm9ncmFtKCkpO1xuICB9XG5cbiAgZ2V0U291cmNlRmlsZVZlcnNpb24gPSB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGVWZXJzaW9uPy5iaW5kKHRoaXMpO1xufVxuXG5mdW5jdGlvbiB2ZXJzaW9uTWFwRnJvbVByb2dyYW0oXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgZHJpdmVyOiBQcm9ncmFtRHJpdmVyKTogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+fG51bGwge1xuICBpZiAoZHJpdmVyLmdldFNvdXJjZUZpbGVWZXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHZlcnNpb25zID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHBvc3NpYmx5UmVkaXJlY3RlZFNvdXJjZUZpbGUgb2YgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgY29uc3Qgc2YgPSB0b1VucmVkaXJlY3RlZFNvdXJjZUZpbGUocG9zc2libHlSZWRpcmVjdGVkU291cmNlRmlsZSk7XG4gICAgdmVyc2lvbnMuc2V0KGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpLCBkcml2ZXIuZ2V0U291cmNlRmlsZVZlcnNpb24oc2YpKTtcbiAgfVxuICByZXR1cm4gdmVyc2lvbnM7XG59XG4iXX0=