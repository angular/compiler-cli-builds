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
        define("@angular/compiler-cli/src/ngtsc/core/src/compiler", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/indexer", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/modulewithproviders", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/core/src/config"], factory);
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
    var modulewithproviders_1 = require("@angular/compiler-cli/src/ngtsc/modulewithproviders");
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
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var config_1 = require("@angular/compiler-cli/src/ngtsc/core/src/config");
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
            return this.addMessageTextDetails(tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(this.getNonTemplateDiagnostics())), tslib_1.__read(this.getTemplateDiagnostics())));
        };
        /**
         * Get all Angular-related diagnostics for this compilation.
         *
         * If a `ts.SourceFile` is passed, only diagnostics related to that file are returned.
         */
        NgCompiler.prototype.getDiagnosticsForFile = function (file, optimizeFor) {
            return this.addMessageTextDetails(tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(this.getNonTemplateDiagnostics().filter(function (diag) { return diag.file === file; }))), tslib_1.__read(this.getTemplateDiagnosticsForFile(file, optimizeFor))));
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
                                                        this.scanForMwp(sf);
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
                        _this.scanForMwp(sf);
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
        NgCompiler.prototype.scanForMwp = function (sf) {
            var _this = this;
            this.compilation.mwpScanner.scan(sf, {
                addTypeReplacement: function (node, type) {
                    // Only obtain the return type transform for the source file once there's a type to replace,
                    // so that no transform is allocated when there's nothing to do.
                    _this.compilation.dtsTransforms.getReturnTypeTransform(sf).addTypeReplacement(node, type);
                }
            });
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
            var mwpScanner = new modulewithproviders_1.ModuleWithProvidersScanner(reflector, evaluator, refEmitter);
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
                new annotations_1.DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, injectableRegistry, isCore, semanticDepGraphUpdater, this.closureCompilerEnabled, config_1.compileUndecoratedClassesWithAngularFeatures, this.delegatingPerfRecorder),
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
            return {
                isCore: isCore,
                traitCompiler: traitCompiler,
                reflector: reflector,
                scopeRegistry: scopeRegistry,
                dtsTransforms: dtsTransforms,
                exportReferenceGraph: exportReferenceGraph,
                routeAnalyzer: routeAnalyzer,
                mwpScanner: mwpScanner,
                metaReader: metaReader,
                typeCheckScopeRegistry: typeCheckScopeRegistry,
                aliasingHost: aliasingHost,
                refEmitter: refEmitter,
                templateTypeChecker: templateTypeChecker,
                resourceRegistry: resourceRegistry,
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
            var e_9, _a;
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
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (references_1_1 && !references_1_1.done && (_a = references_1.return)) _a.call(references_1);
                }
                finally { if (e_9) throw e_9.error; }
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
        var e_10, _a;
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
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_10) throw e_10.error; }
        }
        return versions;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsMkVBQStNO0lBQy9NLGlFQUErRTtJQUMvRSwyRUFBbUg7SUFDbkgsMkVBQXlFO0lBQ3pFLDJFQUFxRztJQUNyRyxtRUFBK1g7SUFDL1gsMkVBQXFHO0lBRXJHLG1FQUFrRjtJQUNsRixxRUFBeU07SUFDek0sMkZBQXFFO0lBQ3JFLHVGQUF5RDtJQUN6RCw2REFBNEc7SUFFNUcseUVBQW9HO0lBQ3BHLHFFQUFxRDtJQUNyRCxtRUFBc0U7SUFDdEUsK0RBQW1JO0lBQ25JLCtEQUFzRDtJQUN0RCxpRUFBZ0Q7SUFDaEQsdUVBQWdMO0lBQ2hMLHVFQUF3RDtJQUN4RCxxRUFBeUY7SUFDekYsa0ZBQXNIO0lBSXRILDBFQUFzRTtJQXlCdEU7O09BRUc7SUFDSCxJQUFZLHFCQUlYO0lBSkQsV0FBWSxxQkFBcUI7UUFDL0IsbUVBQUssQ0FBQTtRQUNMLG1HQUFxQixDQUFBO1FBQ3JCLCtGQUFtQixDQUFBO0lBQ3JCLENBQUMsRUFKVyxxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQUloQztJQWdERDs7T0FFRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxTQUFxQixFQUFFLE9BQTBCLEVBQ2pELHdCQUFrRCxFQUFFLGFBQTRCLEVBQ2hGLFlBQXFDLEVBQUUseUJBQWtDLEVBQ3pFLGVBQXdCO1FBQzFCLE9BQU87WUFDTCxJQUFJLEVBQUUscUJBQXFCLENBQUMsS0FBSztZQUNqQyxTQUFTLFdBQUE7WUFDVCxPQUFPLFNBQUE7WUFDUCx3QkFBd0IsMEJBQUE7WUFDeEIsYUFBYSxlQUFBO1lBQ2IseUJBQXlCLDJCQUFBO1lB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Ozs7OztRQUNELE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5LCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEN5Y2xlSGFuZGxpbmdTdHJhdGVneSwgSW1wb3J0R3JhcGh9IGZyb20gJy4uLy4uL2N5Y2xlcyc7XG5pbXBvcnQge0NPTVBJTEVSX0VSUk9SU19XSVRIX0dVSURFUywgRVJST1JfREVUQUlMU19QQUdFX0JBU0VfVVJMLCBFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2NoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIFJlZmVyZW5jZUdyYXBofSBmcm9tICcuLi8uLi9lbnRyeV9wb2ludCc7XG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRoLCBMb2dpY2FsRmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5LCBBbGlhc2luZ0hvc3QsIEFsaWFzU3RyYXRlZ3ksIERlZmF1bHRJbXBvcnRUcmFja2VyLCBJbXBvcnRSZXdyaXRlciwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXRTdHJhdGVneSwgUmVmZXJlbmNlRW1pdHRlciwgUmVsYXRpdmVQYXRoU3RyYXRlZ3ksIFVuaWZpZWRNb2R1bGVzQWxpYXNpbmdIb3N0LCBVbmlmaWVkTW9kdWxlc1N0cmF0ZWd5fSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLCBJbmNyZW1lbnRhbFN0YXRlfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbCc7XG5pbXBvcnQge1NlbWFudGljU3ltYm9sfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9zZW1hbnRpY19ncmFwaCc7XG5pbXBvcnQge2dlbmVyYXRlQW5hbHlzaXMsIEluZGV4ZWRDb21wb25lbnQsIEluZGV4aW5nQ29udGV4dH0gZnJvbSAnLi4vLi4vaW5kZXhlcic7XG5pbXBvcnQge0NvbXBvbmVudFJlc291cmNlcywgQ29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIExvY2FsTWV0YWRhdGFSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIFJlc291cmNlUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXJ9IGZyb20gJy4uLy4uL21vZHVsZXdpdGhwcm92aWRlcnMnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0FjdGl2ZVBlcmZSZWNvcmRlciwgRGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgUGVyZkNoZWNrcG9pbnQsIFBlcmZFdmVudCwgUGVyZlBoYXNlfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7UHJvZ3JhbURyaXZlciwgVXBkYXRlTW9kZX0gZnJvbSAnLi4vLi4vcHJvZ3JhbV9kcml2ZXInO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGUsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtBZGFwdGVyUmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4uLy4uL3Jlc291cmNlJztcbmltcG9ydCB7ZW50cnlQb2ludEtleUZvciwgTmdNb2R1bGVSb3V0ZUFuYWx5emVyfSBmcm9tICcuLi8uLi9yb3V0aW5nJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXIsIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyLCBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge2dlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm19IGZyb20gJy4uLy4uL3NoaW1zJztcbmltcG9ydCB7aXZ5U3dpdGNoVHJhbnNmb3JtfSBmcm9tICcuLi8uLi9zd2l0Y2gnO1xuaW1wb3J0IHthbGlhc1RyYW5zZm9ybUZhY3RvcnksIENvbXBpbGF0aW9uTW9kZSwgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5LCBEZWNvcmF0b3JIYW5kbGVyLCBEdHNUcmFuc2Zvcm1SZWdpc3RyeSwgaXZ5VHJhbnNmb3JtRmFjdG9yeSwgVHJhaXRDb21waWxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7VGVtcGxhdGVUeXBlQ2hlY2tlckltcGx9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge09wdGltaXplRm9yLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2tpbmdDb25maWd9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlT3JOdWxsLCBpc0R0c1BhdGgsIHJlc29sdmVNb2R1bGVOYW1lLCB0b1VucmVkaXJlY3RlZFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtYaTE4bkNvbnRleHR9IGZyb20gJy4uLy4uL3hpMThuJztcbmltcG9ydCB7TGF6eVJvdXRlLCBOZ0NvbXBpbGVyQWRhcHRlciwgTmdDb21waWxlck9wdGlvbnN9IGZyb20gJy4uL2FwaSc7XG5cbmltcG9ydCB7Y29tcGlsZVVuZGVjb3JhdGVkQ2xhc3Nlc1dpdGhBbmd1bGFyRmVhdHVyZXN9IGZyb20gJy4vY29uZmlnJztcblxuLyoqXG4gKiBTdGF0ZSBpbmZvcm1hdGlvbiBhYm91dCBhIGNvbXBpbGF0aW9uIHdoaWNoIGlzIG9ubHkgZ2VuZXJhdGVkIG9uY2Ugc29tZSBkYXRhIGlzIHJlcXVlc3RlZCBmcm9tXG4gKiB0aGUgYE5nQ29tcGlsZXJgIChmb3IgZXhhbXBsZSwgYnkgY2FsbGluZyBgZ2V0RGlhZ25vc3RpY3NgKS5cbiAqL1xuaW50ZXJmYWNlIExhenlDb21waWxhdGlvblN0YXRlIHtcbiAgaXNDb3JlOiBib29sZWFuO1xuICB0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyO1xuICByZWZsZWN0b3I6IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdDtcbiAgbWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXI7XG4gIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeTtcbiAgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeTogVHlwZUNoZWNrU2NvcGVSZWdpc3RyeTtcbiAgZXhwb3J0UmVmZXJlbmNlR3JhcGg6IFJlZmVyZW5jZUdyYXBofG51bGw7XG4gIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcjtcbiAgZHRzVHJhbnNmb3JtczogRHRzVHJhbnNmb3JtUmVnaXN0cnk7XG4gIG13cFNjYW5uZXI6IE1vZHVsZVdpdGhQcm92aWRlcnNTY2FubmVyO1xuICBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsO1xuICByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyO1xuICB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyO1xuICByZXNvdXJjZVJlZ2lzdHJ5OiBSZXNvdXJjZVJlZ2lzdHJ5O1xufVxuXG5cblxuLyoqXG4gKiBEaXNjcmltaW5hbnQgdHlwZSBmb3IgYSBgQ29tcGlsYXRpb25UaWNrZXRgLlxuICovXG5leHBvcnQgZW51bSBDb21waWxhdGlvblRpY2tldEtpbmQge1xuICBGcmVzaCxcbiAgSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICBJbmNyZW1lbnRhbFJlc291cmNlLFxufVxuXG4vKipcbiAqIEJlZ2luIGFuIEFuZ3VsYXIgY29tcGlsYXRpb24gb3BlcmF0aW9uIGZyb20gc2NyYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGcmVzaENvbXBpbGF0aW9uVGlja2V0IHtcbiAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoO1xuICBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucztcbiAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k7XG4gIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXI7XG4gIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbjtcbiAgdHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuLyoqXG4gKiBCZWdpbiBhbiBBbmd1bGFyIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiB0aGF0IGluY29ycG9yYXRlcyBjaGFuZ2VzIHRvIFR5cGVTY3JpcHQgY29kZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFR5cGVTY3JpcHRDb21waWxhdGlvblRpY2tldCB7XG4gIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQ7XG4gIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zO1xuICBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneTtcbiAgaW5jcmVtZW50YWxDb21waWxhdGlvbjogSW5jcmVtZW50YWxDb21waWxhdGlvbjtcbiAgcHJvZ3JhbURyaXZlcjogUHJvZ3JhbURyaXZlcjtcbiAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbjtcbiAgdXNlUG9pc29uZWREYXRhOiBib29sZWFuO1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQge1xuICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZTtcbiAgY29tcGlsZXI6IE5nQ29tcGlsZXI7XG4gIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz47XG4gIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyO1xufVxuXG4vKipcbiAqIEEgcmVxdWVzdCB0byBiZWdpbiBBbmd1bGFyIGNvbXBpbGF0aW9uLCBlaXRoZXIgc3RhcnRpbmcgZnJvbSBzY3JhdGNoIG9yIGZyb20gYSBrbm93biBwcmlvciBzdGF0ZS5cbiAqXG4gKiBgQ29tcGlsYXRpb25UaWNrZXRgcyBhcmUgdXNlZCB0byBpbml0aWFsaXplIChvciB1cGRhdGUpIGFuIGBOZ0NvbXBpbGVyYCBpbnN0YW5jZSwgdGhlIGNvcmUgb2YgdGhlXG4gKiBBbmd1bGFyIGNvbXBpbGVyLiBUaGV5IGFic3RyYWN0IHRoZSBzdGFydGluZyBzdGF0ZSBvZiBjb21waWxhdGlvbiBhbmQgYWxsb3cgYE5nQ29tcGlsZXJgIHRvIGJlXG4gKiBtYW5hZ2VkIGluZGVwZW5kZW50bHkgb2YgYW55IGluY3JlbWVudGFsIGNvbXBpbGF0aW9uIGxpZmVjeWNsZS5cbiAqL1xuZXhwb3J0IHR5cGUgQ29tcGlsYXRpb25UaWNrZXQgPSBGcmVzaENvbXBpbGF0aW9uVGlja2V0fEluY3JlbWVudGFsVHlwZVNjcmlwdENvbXBpbGF0aW9uVGlja2V0fFxuICAgIEluY3JlbWVudGFsUmVzb3VyY2VDb21waWxhdGlvblRpY2tldDtcblxuLyoqXG4gKiBDcmVhdGUgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGZvciBhIGJyYW5kIG5ldyBjb21waWxhdGlvbiwgdXNpbmcgbm8gcHJpb3Igc3RhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXJ8bnVsbCwgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbixcbiAgICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4pOiBDb21waWxhdGlvblRpY2tldCB7XG4gIHJldHVybiB7XG4gICAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoLFxuICAgIHRzUHJvZ3JhbSxcbiAgICBvcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBwcm9ncmFtRHJpdmVyLFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhLFxuICAgIHBlcmZSZWNvcmRlcjogcGVyZlJlY29yZGVyID8/IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpLFxuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBDb21waWxhdGlvblRpY2tldGAgYXMgZWZmaWNpZW50bHkgYXMgcG9zc2libGUsIGJhc2VkIG9uIGEgcHJldmlvdXMgYE5nQ29tcGlsZXJgXG4gKiBpbnN0YW5jZSBhbmQgYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tQ29tcGlsZXJUaWNrZXQoXG4gICAgb2xkQ29tcGlsZXI6IE5nQ29tcGlsZXIsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsXG4gICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LFxuICAgIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyfG51bGwpOiBDb21waWxhdGlvblRpY2tldCB7XG4gIGNvbnN0IG9sZFByb2dyYW0gPSBvbGRDb21waWxlci5nZXRDdXJyZW50UHJvZ3JhbSgpO1xuICBjb25zdCBvbGRTdGF0ZSA9IG9sZENvbXBpbGVyLmluY3JlbWVudGFsU3RyYXRlZ3kuZ2V0SW5jcmVtZW50YWxTdGF0ZShvbGRQcm9ncmFtKTtcbiAgaWYgKG9sZFN0YXRlID09PSBudWxsKSB7XG4gICAgLy8gTm8gaW5jcmVtZW50YWwgc3RlcCBpcyBwb3NzaWJsZSBoZXJlLCBzaW5jZSBubyBJbmNyZW1lbnRhbERyaXZlciB3YXMgZm91bmQgZm9yIHRoZSBvbGRcbiAgICAvLyBwcm9ncmFtLlxuICAgIHJldHVybiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgICAgICBuZXdQcm9ncmFtLCBvbGRDb21waWxlci5vcHRpb25zLCBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXIsIHBlcmZSZWNvcmRlcixcbiAgICAgICAgb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciwgb2xkQ29tcGlsZXIudXNlUG9pc29uZWREYXRhKTtcbiAgfVxuXG4gIGlmIChwZXJmUmVjb3JkZXIgPT09IG51bGwpIHtcbiAgICBwZXJmUmVjb3JkZXIgPSBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKTtcbiAgfVxuXG4gIGNvbnN0IGluY3JlbWVudGFsQ29tcGlsYXRpb24gPSBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmluY3JlbWVudGFsKFxuICAgICAgbmV3UHJvZ3JhbSwgdmVyc2lvbk1hcEZyb21Qcm9ncmFtKG5ld1Byb2dyYW0sIHByb2dyYW1Ecml2ZXIpLCBvbGRQcm9ncmFtLCBvbGRTdGF0ZSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcblxuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQsXG4gICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICB1c2VQb2lzb25lZERhdGE6IG9sZENvbXBpbGVyLnVzZVBvaXNvbmVkRGF0YSxcbiAgICBvcHRpb25zOiBvbGRDb21waWxlci5vcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBpbmNyZW1lbnRhbENvbXBpbGF0aW9uLFxuICAgIHByb2dyYW1Ecml2ZXIsXG4gICAgbmV3UHJvZ3JhbSxcbiAgICBwZXJmUmVjb3JkZXIsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBkaXJlY3RseSBmcm9tIGFuIG9sZCBgdHMuUHJvZ3JhbWAgYW5kIGFzc29jaWF0ZWQgQW5ndWxhciBjb21waWxhdGlvblxuICogc3RhdGUsIGFsb25nIHdpdGggYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tU3RhdGVUaWNrZXQoXG4gICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkU3RhdGU6IEluY3JlbWVudGFsU3RhdGUsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PEFic29sdXRlRnNQYXRoPixcbiAgICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcnxudWxsLCBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuLFxuICAgIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbik6IENvbXBpbGF0aW9uVGlja2V0IHtcbiAgaWYgKHBlcmZSZWNvcmRlciA9PT0gbnVsbCkge1xuICAgIHBlcmZSZWNvcmRlciA9IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpO1xuICB9XG4gIGNvbnN0IGluY3JlbWVudGFsQ29tcGlsYXRpb24gPSBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmluY3JlbWVudGFsKFxuICAgICAgbmV3UHJvZ3JhbSwgdmVyc2lvbk1hcEZyb21Qcm9ncmFtKG5ld1Byb2dyYW0sIHByb2dyYW1Ecml2ZXIpLCBvbGRQcm9ncmFtLCBvbGRTdGF0ZSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICAgIG5ld1Byb2dyYW0sXG4gICAgb3B0aW9ucyxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICBwcm9ncmFtRHJpdmVyLFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhLFxuICAgIHBlcmZSZWNvcmRlcixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc291cmNlQ2hhbmdlVGlja2V0KGNvbXBpbGVyOiBOZ0NvbXBpbGVyLCBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+KTpcbiAgICBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFJlc291cmNlLFxuICAgIGNvbXBpbGVyLFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcyxcbiAgICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpLFxuICB9O1xufVxuXG5cbi8qKlxuICogVGhlIGhlYXJ0IG9mIHRoZSBBbmd1bGFyIEl2eSBjb21waWxlci5cbiAqXG4gKiBUaGUgYE5nQ29tcGlsZXJgIHByb3ZpZGVzIGFuIEFQSSBmb3IgcGVyZm9ybWluZyBBbmd1bGFyIGNvbXBpbGF0aW9uIHdpdGhpbiBhIGN1c3RvbSBUeXBlU2NyaXB0XG4gKiBjb21waWxlci4gRWFjaCBpbnN0YW5jZSBvZiBgTmdDb21waWxlcmAgc3VwcG9ydHMgYSBzaW5nbGUgY29tcGlsYXRpb24sIHdoaWNoIG1pZ2h0IGJlXG4gKiBpbmNyZW1lbnRhbC5cbiAqXG4gKiBgTmdDb21waWxlcmAgaXMgbGF6eSwgYW5kIGRvZXMgbm90IHBlcmZvcm0gYW55IG9mIHRoZSB3b3JrIG9mIHRoZSBjb21waWxhdGlvbiB1bnRpbCBvbmUgb2YgaXRzXG4gKiBvdXRwdXQgbWV0aG9kcyAoZS5nLiBgZ2V0RGlhZ25vc3RpY3NgKSBpcyBjYWxsZWQuXG4gKlxuICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ0NvbXBpbGVyIHtcbiAgLyoqXG4gICAqIExhemlseSBldmFsdWF0ZWQgc3RhdGUgb2YgdGhlIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIGNyZWF0ZWQgb24gZGVtYW5kIGJ5IGNhbGxpbmcgYGVuc3VyZUFuYWx5emVkYC5cbiAgICovXG4gIHByaXZhdGUgY29tcGlsYXRpb246IExhenlDb21waWxhdGlvblN0YXRlfG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBBbnkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgY29uc3RydWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhlc2UgYXJlIGRpYWdub3N0aWNzIHdoaWNoIGFyb3NlIGR1cmluZyBzZXR1cCBvZiB0aGUgaG9zdCBhbmQvb3IgcHJvZ3JhbS5cbiAgICovXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBOb24tdGVtcGxhdGUgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgcHJvZ3JhbSBpdHNlbGYuIERvZXMgbm90IGluY2x1ZGUgdGVtcGxhdGVcbiAgICogZGlhZ25vc3RpY3MgYmVjYXVzZSB0aGUgdGVtcGxhdGUgdHlwZSBjaGVja2VyIG1lbW9pemVzIHRoZW0gaXRzZWxmLlxuICAgKlxuICAgKiBUaGlzIGlzIHNldCBieSAoYW5kIG1lbW9pemVzKSBgZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljc2AuXG4gICAqL1xuICBwcml2YXRlIG5vblRlbXBsYXRlRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgY3VycmVudFByb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgZW50cnlQb2ludDogdHMuU291cmNlRmlsZXxudWxsO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICByZWFkb25seSBpZ25vcmVGb3JEaWFnbm9zdGljczogU2V0PHRzLlNvdXJjZUZpbGU+O1xuICByZWFkb25seSBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT47XG5cbiAgLyoqXG4gICAqIGBOZ0NvbXBpbGVyYCBjYW4gYmUgcmV1c2VkIGZvciBtdWx0aXBsZSBjb21waWxhdGlvbnMgKGZvciByZXNvdXJjZS1vbmx5IGNoYW5nZXMpLCBhbmQgZWFjaFxuICAgKiBuZXcgY29tcGlsYXRpb24gdXNlcyBhIGZyZXNoIGBQZXJmUmVjb3JkZXJgLiBUaHVzLCBjbGFzc2VzIGNyZWF0ZWQgd2l0aCBhIGxpZmVzcGFuIG9mIHRoZVxuICAgKiBgTmdDb21waWxlcmAgdXNlIGEgYERlbGVnYXRpbmdQZXJmUmVjb3JkZXJgIHNvIHRoZSBgUGVyZlJlY29yZGVyYCB0aGV5IHdyaXRlIHRvIGNhbiBiZSB1cGRhdGVkXG4gICAqIHdpdGggZWFjaCBmcmVzaCBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZGVsZWdhdGluZ1BlcmZSZWNvcmRlciA9IG5ldyBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyKHRoaXMucGVyZlJlY29yZGVyKTtcblxuICAvKipcbiAgICogQ29udmVydCBhIGBDb21waWxhdGlvblRpY2tldGAgaW50byBhbiBgTmdDb21waWxlcmAgaW5zdGFuY2UgZm9yIHRoZSByZXF1ZXN0ZWQgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIERlcGVuZGluZyBvbiB0aGUgbmF0dXJlIG9mIHRoZSBjb21waWxhdGlvbiByZXF1ZXN0LCB0aGUgYE5nQ29tcGlsZXJgIGluc3RhbmNlIG1heSBiZSByZXVzZWRcbiAgICogZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uIGFuZCB1cGRhdGVkIHdpdGggYW55IGNoYW5nZXMsIGl0IG1heSBiZSBhIG5ldyBpbnN0YW5jZSB3aGljaFxuICAgKiBpbmNyZW1lbnRhbGx5IHJldXNlcyBzdGF0ZSBmcm9tIGEgcHJldmlvdXMgY29tcGlsYXRpb24sIG9yIGl0IG1heSByZXByZXNlbnQgYSBmcmVzaFxuICAgKiBjb21waWxhdGlvbiBlbnRpcmVseS5cbiAgICovXG4gIHN0YXRpYyBmcm9tVGlja2V0KHRpY2tldDogQ29tcGlsYXRpb25UaWNrZXQsIGFkYXB0ZXI6IE5nQ29tcGlsZXJBZGFwdGVyKSB7XG4gICAgc3dpdGNoICh0aWNrZXQua2luZCkge1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuRnJlc2g6XG4gICAgICAgIHJldHVybiBuZXcgTmdDb21waWxlcihcbiAgICAgICAgICAgIGFkYXB0ZXIsXG4gICAgICAgICAgICB0aWNrZXQub3B0aW9ucyxcbiAgICAgICAgICAgIHRpY2tldC50c1Byb2dyYW0sXG4gICAgICAgICAgICB0aWNrZXQucHJvZ3JhbURyaXZlcixcbiAgICAgICAgICAgIHRpY2tldC5pbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICAgICAgICBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmZyZXNoKFxuICAgICAgICAgICAgICAgIHRpY2tldC50c1Byb2dyYW0sIHZlcnNpb25NYXBGcm9tUHJvZ3JhbSh0aWNrZXQudHNQcm9ncmFtLCB0aWNrZXQucHJvZ3JhbURyaXZlcikpLFxuICAgICAgICAgICAgdGlja2V0LmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgICAgICB0aWNrZXQudXNlUG9pc29uZWREYXRhLFxuICAgICAgICAgICAgdGlja2V0LnBlcmZSZWNvcmRlcixcbiAgICAgICAgKTtcbiAgICAgIGNhc2UgQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsVHlwZVNjcmlwdDpcbiAgICAgICAgcmV0dXJuIG5ldyBOZ0NvbXBpbGVyKFxuICAgICAgICAgICAgYWRhcHRlcixcbiAgICAgICAgICAgIHRpY2tldC5vcHRpb25zLFxuICAgICAgICAgICAgdGlja2V0Lm5ld1Byb2dyYW0sXG4gICAgICAgICAgICB0aWNrZXQucHJvZ3JhbURyaXZlcixcbiAgICAgICAgICAgIHRpY2tldC5pbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICAgICAgICB0aWNrZXQuaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgICAgICAgIHRpY2tldC5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICAgICAgdGlja2V0LnVzZVBvaXNvbmVkRGF0YSxcbiAgICAgICAgICAgIHRpY2tldC5wZXJmUmVjb3JkZXIsXG4gICAgICAgICk7XG4gICAgICBjYXNlIENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFJlc291cmNlOlxuICAgICAgICBjb25zdCBjb21waWxlciA9IHRpY2tldC5jb21waWxlcjtcbiAgICAgICAgY29tcGlsZXIudXBkYXRlV2l0aENoYW5nZWRSZXNvdXJjZXModGlja2V0Lm1vZGlmaWVkUmVzb3VyY2VGaWxlcywgdGlja2V0LnBlcmZSZWNvcmRlcik7XG4gICAgICAgIHJldHVybiBjb21waWxlcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBhZGFwdGVyOiBOZ0NvbXBpbGVyQWRhcHRlcixcbiAgICAgIHJlYWRvbmx5IG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBpbnB1dFByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICByZWFkb25seSBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgICAgcmVhZG9ubHkgaW5jcmVtZW50YWxTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgICAgcmVhZG9ubHkgaW5jcmVtZW50YWxDb21waWxhdGlvbjogSW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgIHJlYWRvbmx5IGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW4sXG4gICAgICByZWFkb25seSB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGxpdmVQZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcixcbiAgKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuYWRhcHRlci5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcyk7XG4gICAgY29uc3QgaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMgPSB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xuICAgIGlmIChpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljKTtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gaW5wdXRQcm9ncmFtO1xuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhdGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID1cbiAgICAgICAgYWRhcHRlci5lbnRyeVBvaW50ICE9PSBudWxsID8gZ2V0U291cmNlRmlsZU9yTnVsbChpbnB1dFByb2dyYW0sIGFkYXB0ZXIuZW50cnlQb2ludCkgOiBudWxsO1xuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmFkYXB0ZXIuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgICAgICAvLyBkb2VuJ3QgcmV0YWluIGEgcmVmZXJlbmNlIHRvIGB0aGlzYCwgaWYgb3RoZXIgY2xvc3VyZXMgaW4gdGhlIGNvbnN0cnVjdG9yIGhlcmUgcmVmZXJlbmNlXG4gICAgICAgIC8vIGB0aGlzYCBpbnRlcm5hbGx5IHRoZW4gYSBjbG9zdXJlIGNyZWF0ZWQgaGVyZSB3b3VsZCByZXRhaW4gdGhlbS4gVGhpcyBjYW4gY2F1c2UgbWFqb3JcbiAgICAgICAgLy8gbWVtb3J5IGxlYWsgaXNzdWVzIHNpbmNlIHRoZSBgbW9kdWxlUmVzb2x1dGlvbkNhY2hlYCBpcyBhIGxvbmctbGl2ZWQgb2JqZWN0IGFuZCBmaW5kcyBpdHNcbiAgICAgICAgLy8gd2F5IGludG8gYWxsIGtpbmRzIG9mIHBsYWNlcyBpbnNpZGUgVFMgaW50ZXJuYWwgb2JqZWN0cy5cbiAgICAgICAgdGhpcy5hZGFwdGVyLmdldENhbm9uaWNhbEZpbGVOYW1lLmJpbmQodGhpcy5hZGFwdGVyKSk7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHZlciA9XG4gICAgICAgIG5ldyBNb2R1bGVSZXNvbHZlcihpbnB1dFByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5hZGFwdGVyLCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUpO1xuICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyID0gbmV3IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcihhZGFwdGVyLCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMuY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKFxuICAgICAgICBuZXcgSW1wb3J0R3JhcGgoaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcikpO1xuICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneS5zZXRJbmNyZW1lbnRhbFN0YXRlKHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5zdGF0ZSwgaW5wdXRQcm9ncmFtKTtcblxuICAgIHRoaXMuaWdub3JlRm9yRGlhZ25vc3RpY3MgPVxuICAgICAgICBuZXcgU2V0KGlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbHRlcihzZiA9PiB0aGlzLmFkYXB0ZXIuaXNTaGltKHNmKSkpO1xuICAgIHRoaXMuaWdub3JlRm9yRW1pdCA9IHRoaXMuYWRhcHRlci5pZ25vcmVGb3JFbWl0O1xuXG4gICAgbGV0IGR0c0ZpbGVDb3VudCA9IDA7XG4gICAgbGV0IG5vbkR0c0ZpbGVDb3VudCA9IDA7XG4gICAgZm9yIChjb25zdCBzZiBvZiBpbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIGR0c0ZpbGVDb3VudCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9uRHRzRmlsZUNvdW50Kys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGl2ZVBlcmZSZWNvcmRlci5ldmVudENvdW50KFBlcmZFdmVudC5JbnB1dER0c0ZpbGUsIGR0c0ZpbGVDb3VudCk7XG4gICAgbGl2ZVBlcmZSZWNvcmRlci5ldmVudENvdW50KFBlcmZFdmVudC5JbnB1dFRzRmlsZSwgbm9uRHRzRmlsZUNvdW50KTtcbiAgfVxuXG4gIGdldCBwZXJmUmVjb3JkZXIoKTogQWN0aXZlUGVyZlJlY29yZGVyIHtcbiAgICByZXR1cm4gdGhpcy5saXZlUGVyZlJlY29yZGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4cG9zZXMgdGhlIGBJbmNyZW1lbnRhbENvbXBpbGF0aW9uYCB1bmRlciBhbiBvbGQgcHJvcGVydHkgbmFtZSB0aGF0IHRoZSBDTEkgdXNlcywgYXZvaWRpbmcgYVxuICAgKiBjaGlja2VuLWFuZC1lZ2cgcHJvYmxlbSB3aXRoIHRoZSByZW5hbWUgdG8gYGluY3JlbWVudGFsQ29tcGlsYXRpb25gLlxuICAgKlxuICAgKiBUT0RPKGFseGh1Yik6IHJlbW92ZSB3aGVuIHRoZSBDTEkgdXNlcyB0aGUgbmV3IG5hbWUuXG4gICAqL1xuICBnZXQgaW5jcmVtZW50YWxEcml2ZXIoKTogSW5jcmVtZW50YWxDb21waWxhdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbjtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlV2l0aENoYW5nZWRSZXNvdXJjZXMoXG4gICAgICBjaGFuZ2VkUmVzb3VyY2VzOiBTZXQ8c3RyaW5nPiwgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXIpOiB2b2lkIHtcbiAgICB0aGlzLmxpdmVQZXJmUmVjb3JkZXIgPSBwZXJmUmVjb3JkZXI7XG4gICAgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLnRhcmdldCA9IHBlcmZSZWNvcmRlcjtcblxuICAgIHBlcmZSZWNvcmRlci5pblBoYXNlKFBlcmZQaGFzZS5SZXNvdXJjZVVwZGF0ZSwgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgLy8gQW5hbHlzaXMgaGFzbid0IGhhcHBlbmVkIHlldCwgc28gbm8gdXBkYXRlIGlzIG5lY2Vzc2FyeSAtIGFueSBjaGFuZ2VzIHRvIHJlc291cmNlcyB3aWxsXG4gICAgICAgIC8vIGJlIGNhcHR1cmVkIGJ5IHRoZSBpbml0YWwgYW5hbHlzaXMgcGFzcyBpdHNlbGYuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZXNvdXJjZU1hbmFnZXIuaW52YWxpZGF0ZSgpO1xuXG4gICAgICBjb25zdCBjbGFzc2VzVG9VcGRhdGUgPSBuZXcgU2V0PERlY2xhcmF0aW9uTm9kZT4oKTtcbiAgICAgIGZvciAoY29uc3QgcmVzb3VyY2VGaWxlIG9mIGNoYW5nZWRSZXNvdXJjZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZUNsYXNzIG9mIHRoaXMuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUocmVzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIGNsYXNzZXNUb1VwZGF0ZS5hZGQodGVtcGxhdGVDbGFzcyk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IHN0eWxlQ2xhc3Mgb2YgdGhpcy5nZXRDb21wb25lbnRzV2l0aFN0eWxlRmlsZShyZXNvdXJjZUZpbGUpKSB7XG4gICAgICAgICAgY2xhc3Nlc1RvVXBkYXRlLmFkZChzdHlsZUNsYXNzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIGNsYXNzZXNUb1VwZGF0ZSkge1xuICAgICAgICB0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIudXBkYXRlUmVzb3VyY2VzKGNsYXp6KTtcbiAgICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oY2xhenopKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbXBpbGF0aW9uLnRlbXBsYXRlVHlwZUNoZWNrZXIuaW52YWxpZGF0ZUNsYXNzKGNsYXp6KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHJlc291cmNlIGRlcGVuZGVuY2llcyBvZiBhIGZpbGUuXG4gICAqXG4gICAqIElmIHRoZSBmaWxlIGlzIG5vdCBwYXJ0IG9mIHRoZSBjb21waWxhdGlvbiwgYW4gZW1wdHkgYXJyYXkgd2lsbCBiZSByZXR1cm5lZC5cbiAgICovXG4gIGdldFJlc291cmNlRGVwZW5kZW5jaWVzKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmdbXSB7XG4gICAgdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgcmV0dXJuIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5kZXBHcmFwaC5nZXRSZXNvdXJjZURlcGVuZGVuY2llcyhmaWxlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIEFuZ3VsYXItcmVsYXRlZCBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICovXG4gIGdldERpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkTWVzc2FnZVRleHREZXRhaWxzKFxuICAgICAgICBbLi4udGhpcy5nZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCksIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljcygpXSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBBbmd1bGFyLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIElmIGEgYHRzLlNvdXJjZUZpbGVgIGlzIHBhc3NlZCwgb25seSBkaWFnbm9zdGljcyByZWxhdGVkIHRvIHRoYXQgZmlsZSBhcmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXREaWFnbm9zdGljc0ZvckZpbGUoZmlsZTogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoW1xuICAgICAgLi4udGhpcy5nZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCkuZmlsdGVyKGRpYWcgPT4gZGlhZy5maWxlID09PSBmaWxlKSxcbiAgICAgIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljc0ZvckZpbGUoZmlsZSwgb3B0aW1pemVGb3IpXG4gICAgXSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIEFuZ3VsYXIuaW8gZXJyb3IgZ3VpZGUgbGlua3MgdG8gZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGFkZE1lc3NhZ2VUZXh0RGV0YWlscyhkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gZGlhZ25vc3RpY3MubWFwKGRpYWcgPT4ge1xuICAgICAgaWYgKGRpYWcuY29kZSAmJiBDT01QSUxFUl9FUlJPUlNfV0lUSF9HVUlERVMuaGFzKG5nRXJyb3JDb2RlKGRpYWcuY29kZSkpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4uZGlhZyxcbiAgICAgICAgICBtZXNzYWdlVGV4dDogZGlhZy5tZXNzYWdlVGV4dCArXG4gICAgICAgICAgICAgIGAuIEZpbmQgbW9yZSBhdCAke0VSUk9SX0RFVEFJTFNfUEFHRV9CQVNFX1VSTH0vTkcke25nRXJyb3JDb2RlKGRpYWcuY29kZSl9YFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRpYWc7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBzZXR1cC1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGN1cnJlbnQgYHRzLlByb2dyYW1gIGtub3duIHRvIHRoaXMgYE5nQ29tcGlsZXJgLlxuICAgKlxuICAgKiBDb21waWxhdGlvbiBiZWdpbnMgd2l0aCBhbiBpbnB1dCBgdHMuUHJvZ3JhbWAsIGFuZCBkdXJpbmcgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBvcGVyYXRpb25zIG5ld1xuICAgKiBgdHMuUHJvZ3JhbWBzIG1heSBiZSBwcm9kdWNlZCB1c2luZyB0aGUgYFByb2dyYW1Ecml2ZXJgLiBUaGUgbW9zdCByZWNlbnQgc3VjaCBgdHMuUHJvZ3JhbWAgdG9cbiAgICogYmUgcHJvZHVjZWQgaXMgYXZhaWxhYmxlIGhlcmUuXG4gICAqXG4gICAqIFRoaXMgYHRzLlByb2dyYW1gIHNlcnZlcyB0d28ga2V5IHB1cnBvc2VzOlxuICAgKlxuICAgKiAqIEFzIGFuIGluY3JlbWVudGFsIHN0YXJ0aW5nIHBvaW50IGZvciBjcmVhdGluZyB0aGUgbmV4dCBgdHMuUHJvZ3JhbWAgYmFzZWQgb24gZmlsZXMgdGhhdCB0aGVcbiAgICogICB1c2VyIGhhcyBjaGFuZ2VkIChmb3IgY2xpZW50cyB1c2luZyB0aGUgVFMgY29tcGlsZXIgcHJvZ3JhbSBBUElzKS5cbiAgICpcbiAgICogKiBBcyB0aGUgXCJiZWZvcmVcIiBwb2ludCBmb3IgYW4gaW5jcmVtZW50YWwgY29tcGlsYXRpb24gaW52b2NhdGlvbiwgdG8gZGV0ZXJtaW5lIHdoYXQncyBjaGFuZ2VkXG4gICAqICAgYmV0d2VlbiB0aGUgb2xkIGFuZCBuZXcgcHJvZ3JhbXMgKGZvciBhbGwgY29tcGlsYXRpb25zKS5cbiAgICovXG4gIGdldEN1cnJlbnRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQcm9ncmFtO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpOiBUZW1wbGF0ZVR5cGVDaGVja2VyIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdUaGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJgIGRvZXMgbm90IHdvcmsgd2l0aG91dCBgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcmAuJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmVuc3VyZUFuYWx5emVkKCkudGVtcGxhdGVUeXBlQ2hlY2tlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGB0cy5EZWNsYXJhdGlvbmBzIGZvciBhbnkgY29tcG9uZW50KHMpIHdoaWNoIHVzZSB0aGUgZ2l2ZW4gdGVtcGxhdGUgZmlsZS5cbiAgICovXG4gIGdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKHRlbXBsYXRlRmlsZVBhdGg6IHN0cmluZyk6IFJlYWRvbmx5U2V0PERlY2xhcmF0aW9uTm9kZT4ge1xuICAgIGNvbnN0IHtyZXNvdXJjZVJlZ2lzdHJ5fSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gcmVzb3VyY2VSZWdpc3RyeS5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlKHJlc29sdmUodGVtcGxhdGVGaWxlUGF0aCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgYHRzLkRlY2xhcmF0aW9uYHMgZm9yIGFueSBjb21wb25lbnQocykgd2hpY2ggdXNlIHRoZSBnaXZlbiB0ZW1wbGF0ZSBmaWxlLlxuICAgKi9cbiAgZ2V0Q29tcG9uZW50c1dpdGhTdHlsZUZpbGUoc3R5bGVGaWxlUGF0aDogc3RyaW5nKTogUmVhZG9ubHlTZXQ8RGVjbGFyYXRpb25Ob2RlPiB7XG4gICAgY29uc3Qge3Jlc291cmNlUmVnaXN0cnl9ID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIHJldHVybiByZXNvdXJjZVJlZ2lzdHJ5LmdldENvbXBvbmVudHNXaXRoU3R5bGUocmVzb2x2ZShzdHlsZUZpbGVQYXRoKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGV4dGVybmFsIHJlc291cmNlcyBmb3IgdGhlIGdpdmVuIGNvbXBvbmVudC5cbiAgICovXG4gIGdldENvbXBvbmVudFJlc291cmNlcyhjbGFzc0RlY2w6IERlY2xhcmF0aW9uTm9kZSk6IENvbXBvbmVudFJlc291cmNlc3xudWxsIHtcbiAgICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGNsYXNzRGVjbCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB7cmVzb3VyY2VSZWdpc3RyeX0gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29uc3Qgc3R5bGVzID0gcmVzb3VyY2VSZWdpc3RyeS5nZXRTdHlsZXMoY2xhc3NEZWNsKTtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHJlc291cmNlUmVnaXN0cnkuZ2V0VGVtcGxhdGUoY2xhc3NEZWNsKTtcbiAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7c3R5bGVzLCB0ZW1wbGF0ZX07XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBBbmd1bGFyJ3MgYW5hbHlzaXMgc3RlcCAoYXMgYSBwcmVjdXJzb3IgdG8gYGdldERpYWdub3N0aWNzYCBvciBgcHJlcGFyZUVtaXRgKVxuICAgKiBhc3luY2hyb25vdXNseS5cbiAgICpcbiAgICogTm9ybWFsbHksIHRoaXMgb3BlcmF0aW9uIGhhcHBlbnMgbGF6aWx5IHdoZW5ldmVyIGBnZXREaWFnbm9zdGljc2Agb3IgYHByZXBhcmVFbWl0YCBhcmUgY2FsbGVkLlxuICAgKiBIb3dldmVyLCBjZXJ0YWluIGNvbnN1bWVycyBtYXkgd2lzaCB0byBhbGxvdyBmb3IgYW4gYXN5bmNocm9ub3VzIHBoYXNlIG9mIGFuYWx5c2lzLCB3aGVyZVxuICAgKiByZXNvdXJjZXMgc3VjaCBhcyBgc3R5bGVVcmxzYCBhcmUgcmVzb2x2ZWQgYXN5bmNob25vdXNseS4gSW4gdGhlc2UgY2FzZXMgYGFuYWx5emVBc3luY2AgbXVzdCBiZVxuICAgKiBjYWxsZWQgZmlyc3QsIGFuZCBpdHMgYFByb21pc2VgIGF3YWl0ZWQgcHJpb3IgdG8gY2FsbGluZyBhbnkgb3RoZXIgQVBJcyBvZiBgTmdDb21waWxlcmAuXG4gICAqL1xuICBhc3luYyBhbmFseXplQXN5bmMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gIT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnBlcmZSZWNvcmRlci5pblBoYXNlKFBlcmZQaGFzZS5BbmFseXNpcywgYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG5cbiAgICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy5pbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhbmFseXNpc1Byb21pc2UgPSB0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuYW5hbHl6ZUFzeW5jKHNmKTtcbiAgICAgICAgdGhpcy5zY2FuRm9yTXdwKHNmKTtcbiAgICAgICAgaWYgKGFuYWx5c2lzUHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChhbmFseXNpc1Byb21pc2UpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblxuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIubWVtb3J5KFBlcmZDaGVja3BvaW50LkFuYWx5c2lzKTtcbiAgICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlcik7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdCBsYXp5IHJvdXRlcyBkZXRlY3RlZCBkdXJpbmcgYW5hbHlzaXMuXG4gICAqXG4gICAqIFRoaXMgY2FuIGJlIGNhbGxlZCBmb3Igb25lIHNwZWNpZmljIHJvdXRlLCBvciB0byByZXRyaWV2ZSBhbGwgdG9wLWxldmVsIHJvdXRlcy5cbiAgICovXG4gIGxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGU/OiBzdHJpbmcpOiBMYXp5Um91dGVbXSB7XG4gICAgaWYgKGVudHJ5Um91dGUpIHtcbiAgICAgIC8vIGh0dHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9ibG9iLzUwNzMyZTE1Ni9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL3RyYW5zZm9ybWVycy9jb21waWxlcl9ob3N0LnRzI0wxNzUtTDE4OCkuXG4gICAgICAvL1xuICAgICAgLy8gYEBhbmd1bGFyL2NsaWAgd2lsbCBhbHdheXMgY2FsbCB0aGlzIEFQSSB3aXRoIGFuIGFic29sdXRlIHBhdGgsIHNvIHRoZSByZXNvbHV0aW9uIHN0ZXAgaXNcbiAgICAgIC8vIG5vdCBuZWNlc3NhcnksIGJ1dCBrZWVwaW5nIGl0IGJhY2t3YXJkcyBjb21wYXRpYmxlIGluIGNhc2Ugc29tZW9uZSBlbHNlIGlzIHVzaW5nIHRoZSBBUEkuXG5cbiAgICAgIC8vIFJlbGF0aXZlIGVudHJ5IHBhdGhzIGFyZSBkaXNhbGxvd2VkLlxuICAgICAgaWYgKGVudHJ5Um91dGUuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGxpc3QgbGF6eSByb3V0ZXM6IFJlc29sdXRpb24gb2YgcmVsYXRpdmUgcGF0aHMgKCR7XG4gICAgICAgICAgICBlbnRyeVJvdXRlfSkgaXMgbm90IHN1cHBvcnRlZC5gKTtcbiAgICAgIH1cblxuICAgICAgLy8gTm9uLXJlbGF0aXZlIGVudHJ5IHBhdGhzIGZhbGwgaW50byBvbmUgb2YgdGhlIGZvbGxvd2luZyBjYXRlZ29yaWVzOlxuICAgICAgLy8gLSBBYnNvbHV0ZSBzeXN0ZW0gcGF0aHMgKGUuZy4gYC9mb28vYmFyL215LXByb2plY3QvbXktbW9kdWxlYCksIHdoaWNoIGFyZSB1bmFmZmVjdGVkIGJ5IHRoZVxuICAgICAgLy8gICBsb2dpYyBiZWxvdy5cbiAgICAgIC8vIC0gUGF0aHMgdG8gZW50ZXJuYWwgbW9kdWxlcyAoZS5nLiBgc29tZS1saWJgKS5cbiAgICAgIC8vIC0gUGF0aHMgbWFwcGVkIHRvIGRpcmVjdG9yaWVzIGluIGB0c2NvbmZpZy5qc29uYCAoZS5nLiBgc2hhcmVkL215LW1vZHVsZWApLlxuICAgICAgLy8gICAoU2VlIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL21vZHVsZS1yZXNvbHV0aW9uLmh0bWwjcGF0aC1tYXBwaW5nLilcbiAgICAgIC8vXG4gICAgICAvLyBJbiBhbGwgY2FzZXMgYWJvdmUsIHRoZSBgY29udGFpbmluZ0ZpbGVgIGFyZ3VtZW50IGlzIGlnbm9yZWQsIHNvIHdlIGNhbiBqdXN0IHRha2UgdGhlIGZpcnN0XG4gICAgICAvLyBvZiB0aGUgcm9vdCBmaWxlcy5cbiAgICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gdGhpcy5pbnB1dFByb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpWzBdO1xuICAgICAgY29uc3QgW2VudHJ5UGF0aCwgbW9kdWxlTmFtZV0gPSBlbnRyeVJvdXRlLnNwbGl0KCcjJyk7XG4gICAgICBjb25zdCByZXNvbHZlZE1vZHVsZSA9XG4gICAgICAgICAgcmVzb2x2ZU1vZHVsZU5hbWUoZW50cnlQYXRoLCBjb250YWluaW5nRmlsZSwgdGhpcy5vcHRpb25zLCB0aGlzLmFkYXB0ZXIsIG51bGwpO1xuXG4gICAgICBpZiAocmVzb2x2ZWRNb2R1bGUpIHtcbiAgICAgICAgZW50cnlSb3V0ZSA9IGVudHJ5UG9pbnRLZXlGb3IocmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSwgbW9kdWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIGNvbXBpbGF0aW9uLnJvdXRlQW5hbHl6ZXIubGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZSk7XG4gIH1cblxuICAvKipcbiAgICogRmV0Y2ggdHJhbnNmb3JtZXJzIGFuZCBvdGhlciBpbmZvcm1hdGlvbiB3aGljaCBpcyBuZWNlc3NhcnkgZm9yIGEgY29uc3VtZXIgdG8gYGVtaXRgIHRoZVxuICAgKiBwcm9ncmFtIHdpdGggQW5ndWxhci1hZGRlZCBkZWZpbml0aW9ucy5cbiAgICovXG4gIHByZXBhcmVFbWl0KCk6IHtcbiAgICB0cmFuc2Zvcm1lcnM6IHRzLkN1c3RvbVRyYW5zZm9ybWVycyxcbiAgfSB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICBjb25zdCBjb3JlSW1wb3J0c0Zyb20gPSBjb21waWxhdGlvbi5pc0NvcmUgPyBnZXRSM1N5bWJvbHNGaWxlKHRoaXMuaW5wdXRQcm9ncmFtKSA6IG51bGw7XG4gICAgbGV0IGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcjtcbiAgICBpZiAoY29yZUltcG9ydHNGcm9tICE9PSBudWxsKSB7XG4gICAgICBpbXBvcnRSZXdyaXRlciA9IG5ldyBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlcihjb3JlSW1wb3J0c0Zyb20uZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbXBvcnRSZXdyaXRlciA9IG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZWZhdWx0SW1wb3J0VHJhY2tlciA9IG5ldyBEZWZhdWx0SW1wb3J0VHJhY2tlcigpO1xuXG4gICAgY29uc3QgYmVmb3JlID0gW1xuICAgICAgaXZ5VHJhbnNmb3JtRmFjdG9yeShcbiAgICAgICAgICBjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLCBjb21waWxhdGlvbi5yZWZsZWN0b3IsIGltcG9ydFJld3JpdGVyLCBkZWZhdWx0SW1wb3J0VHJhY2tlcixcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIsIGNvbXBpbGF0aW9uLmlzQ29yZSwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkKSxcbiAgICAgIGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmV4cG9ydFN0YXRlbWVudHMpLFxuICAgICAgZGVmYXVsdEltcG9ydFRyYWNrZXIuaW1wb3J0UHJlc2VydmluZ1RyYW5zZm9ybWVyKCksXG4gICAgXTtcblxuICAgIGNvbnN0IGFmdGVyRGVjbGFyYXRpb25zOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT5bXSA9IFtdO1xuICAgIGlmIChjb21waWxhdGlvbi5kdHNUcmFuc2Zvcm1zICE9PSBudWxsKSB7XG4gICAgICBhZnRlckRlY2xhcmF0aW9ucy5wdXNoKFxuICAgICAgICAgIGRlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi5kdHNUcmFuc2Zvcm1zLCBpbXBvcnRSZXdyaXRlcikpO1xuICAgIH1cblxuICAgIC8vIE9ubHkgYWRkIGFsaWFzaW5nIHJlLWV4cG9ydHMgdG8gdGhlIC5kLnRzIG91dHB1dCBpZiB0aGUgYEFsaWFzaW5nSG9zdGAgcmVxdWVzdHMgaXQuXG4gICAgaWYgKGNvbXBpbGF0aW9uLmFsaWFzaW5nSG9zdCAhPT0gbnVsbCAmJiBjb21waWxhdGlvbi5hbGlhc2luZ0hvc3QuYWxpYXNFeHBvcnRzSW5EdHMpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zLnB1c2goYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZXhwb3J0U3RhdGVtZW50cykpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIGJlZm9yZS5wdXNoKFxuICAgICAgICAgIGdlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm0odGhpcy5hZGFwdGVyLmZhY3RvcnlUcmFja2VyLnNvdXJjZUluZm8sIGltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuICAgIGJlZm9yZS5wdXNoKGl2eVN3aXRjaFRyYW5zZm9ybSk7XG5cbiAgICByZXR1cm4ge3RyYW5zZm9ybWVyczoge2JlZm9yZSwgYWZ0ZXJEZWNsYXJhdGlvbnN9IGFzIHRzLkN1c3RvbVRyYW5zZm9ybWVyc307XG4gIH1cblxuICAvKipcbiAgICogUnVuIHRoZSBpbmRleGluZyBwcm9jZXNzIGFuZCByZXR1cm4gYSBgTWFwYCBvZiBhbGwgaW5kZXhlZCBjb21wb25lbnRzLlxuICAgKlxuICAgKiBTZWUgdGhlIGBpbmRleGluZ2AgcGFja2FnZSBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKi9cbiAgZ2V0SW5kZXhlZENvbXBvbmVudHMoKTogTWFwPERlY2xhcmF0aW9uTm9kZSwgSW5kZXhlZENvbXBvbmVudD4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBuZXcgSW5kZXhpbmdDb250ZXh0KCk7XG4gICAgY29tcGlsYXRpb24udHJhaXRDb21waWxlci5pbmRleChjb250ZXh0KTtcbiAgICByZXR1cm4gZ2VuZXJhdGVBbmFseXNpcyhjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsZWN0IGkxOG4gbWVzc2FnZXMgaW50byB0aGUgYFhpMThuQ29udGV4dGAuXG4gICAqL1xuICB4aTE4bihjdHg6IFhpMThuQ29udGV4dCk6IHZvaWQge1xuICAgIC8vIE5vdGUgdGhhdCB0aGUgJ3Jlc29sdmUnIHBoYXNlIGlzIG5vdCBzdHJpY3RseSBuZWNlc3NhcnkgZm9yIHhpMThuLCBidXQgdGhpcyBpcyBub3QgY3VycmVudGx5XG4gICAgLy8gb3B0aW1pemVkLlxuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIueGkxOG4oY3R4KTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQW5hbHl6ZWQodGhpczogTmdDb21waWxlcik6IExhenlDb21waWxhdGlvblN0YXRlIHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5hbmFseXplU3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxhdGlvbiE7XG4gIH1cblxuICBwcml2YXRlIGFuYWx5emVTeW5jKCk6IHZvaWQge1xuICAgIHRoaXMucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLkFuYWx5c2lzLCAoKSA9PiB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcbiAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy5pbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuYW5hbHl6ZVN5bmMoc2YpO1xuICAgICAgICB0aGlzLnNjYW5Gb3JNd3Aoc2YpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuQW5hbHlzaXMpO1xuXG4gICAgICB0aGlzLnJlc29sdmVDb21waWxhdGlvbih0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlQ29tcGlsYXRpb24odHJhaXRDb21waWxlcjogVHJhaXRDb21waWxlcik6IHZvaWQge1xuICAgIHRoaXMucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLlJlc29sdmUsICgpID0+IHtcbiAgICAgIHRyYWl0Q29tcGlsZXIucmVzb2x2ZSgpO1xuXG4gICAgICAvLyBBdCB0aGlzIHBvaW50LCBhbmFseXNpcyBpcyBjb21wbGV0ZSBhbmQgdGhlIGNvbXBpbGVyIGNhbiBub3cgY2FsY3VsYXRlIHdoaWNoIGZpbGVzIG5lZWQgdG9cbiAgICAgIC8vIGJlIGVtaXR0ZWQsIHNvIGRvIHRoYXQuXG4gICAgICB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24ucmVjb3JkU3VjY2Vzc2Z1bEFuYWx5c2lzKHRyYWl0Q29tcGlsZXIpO1xuXG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuUmVzb2x2ZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldCBmdWxsVGVtcGxhdGVUeXBlQ2hlY2soKTogYm9vbGVhbiB7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBzdHJpY3RuZXNzIGxldmVsIG9mIHR5cGUgY2hlY2tpbmcgYmFzZWQgb24gY29tcGlsZXIgb3B0aW9ucy4gQXNcbiAgICAvLyBgc3RyaWN0VGVtcGxhdGVzYCBpcyBhIHN1cGVyc2V0IG9mIGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgLCB0aGUgZm9ybWVyIGltcGxpZXMgdGhlIGxhdHRlci5cbiAgICAvLyBBbHNvIHNlZSBgdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNgIHdoZXJlIGl0IGlzIHZlcmlmaWVkIHRoYXQgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2BcbiAgICAvLyBpcyBub3QgZGlzYWJsZWQgd2hlbiBgc3RyaWN0VGVtcGxhdGVzYCBpcyBlbmFibGVkLlxuICAgIGNvbnN0IHN0cmljdFRlbXBsYXRlcyA9ICEhdGhpcy5vcHRpb25zLnN0cmljdFRlbXBsYXRlcztcbiAgICByZXR1cm4gc3RyaWN0VGVtcGxhdGVzIHx8ICEhdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHlwZUNoZWNraW5nQ29uZmlnKCk6IFR5cGVDaGVja2luZ0NvbmZpZyB7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBzdHJpY3RuZXNzIGxldmVsIG9mIHR5cGUgY2hlY2tpbmcgYmFzZWQgb24gY29tcGlsZXIgb3B0aW9ucy4gQXNcbiAgICAvLyBgc3RyaWN0VGVtcGxhdGVzYCBpcyBhIHN1cGVyc2V0IG9mIGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgLCB0aGUgZm9ybWVyIGltcGxpZXMgdGhlIGxhdHRlci5cbiAgICAvLyBBbHNvIHNlZSBgdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNgIHdoZXJlIGl0IGlzIHZlcmlmaWVkIHRoYXQgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2BcbiAgICAvLyBpcyBub3QgZGlzYWJsZWQgd2hlbiBgc3RyaWN0VGVtcGxhdGVzYCBpcyBlbmFibGVkLlxuICAgIGNvbnN0IHN0cmljdFRlbXBsYXRlcyA9ICEhdGhpcy5vcHRpb25zLnN0cmljdFRlbXBsYXRlcztcblxuICAgIGNvbnN0IHVzZUlubGluZVR5cGVDb25zdHJ1Y3RvcnMgPSB0aGlzLnByb2dyYW1Ecml2ZXIuc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zO1xuXG4gICAgLy8gRmlyc3Qgc2VsZWN0IGEgdHlwZS1jaGVja2luZyBjb25maWd1cmF0aW9uLCBiYXNlZCBvbiB3aGV0aGVyIGZ1bGwgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpc1xuICAgIC8vIHJlcXVlc3RlZC5cbiAgICBsZXQgdHlwZUNoZWNraW5nQ29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWc7XG4gICAgaWYgKHRoaXMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcgPSB7XG4gICAgICAgIGFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrUXVlcmllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVGVtcGxhdGVCb2RpZXM6IHRydWUsXG4gICAgICAgIGFsd2F5c0NoZWNrU2NoZW1hSW5UZW1wbGF0ZUJvZGllczogdHJ1ZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGhvbm9yQWNjZXNzTW9kaWZpZXJzRm9ySW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQXR0cmlidXRlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBFdmVuIGluIGZ1bGwgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlLCBET00gYmluZGluZyBjaGVja3MgYXJlIG5vdCBxdWl0ZSByZWFkeSB5ZXQuXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBDaGVja2luZyBvZiBET00gZXZlbnRzIGN1cnJlbnRseSBoYXMgYW4gYWR2ZXJzZSBlZmZlY3Qgb24gZGV2ZWxvcGVyIGV4cGVyaWVuY2UsXG4gICAgICAgIC8vIGUuZy4gZm9yIGA8aW5wdXQgKGJsdXIpPVwidXBkYXRlKCRldmVudC50YXJnZXQudmFsdWUpXCI+YCBlbmFibGluZyB0aGlzIGNoZWNrIHJlc3VsdHMgaW46XG4gICAgICAgIC8vIC0gZXJyb3IgVFMyNTMxOiBPYmplY3QgaXMgcG9zc2libHkgJ251bGwnLlxuICAgICAgICAvLyAtIGVycm9yIFRTMjMzOTogUHJvcGVydHkgJ3ZhbHVlJyBkb2VzIG5vdCBleGlzdCBvbiB0eXBlICdFdmVudFRhcmdldCcuXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBOb24tRE9NIHJlZmVyZW5jZXMgaGF2ZSB0aGUgY29ycmVjdCB0eXBlIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzOiB0cnVlLFxuICAgICAgICAvLyBQaXBlcyBhcmUgY2hlY2tlZCBpbiBWaWV3IEVuZ2luZSBzbyB0aGVyZSBpcyBubyBzdHJpY3RuZXNzIGZsYWcuXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IHRydWUsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgdXNlQ29udGV4dEdlbmVyaWNUeXBlOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIHN0cmljdExpdGVyYWxUeXBlczogdHJ1ZSxcbiAgICAgICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICB1c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzLFxuICAgICAgICAvLyBXYXJuaW5ncyBmb3Igc3Vib3B0aW1hbCB0eXBlIGluZmVyZW5jZSBhcmUgb25seSBlbmFibGVkIGlmIGluIExhbmd1YWdlIFNlcnZpY2UgbW9kZVxuICAgICAgICAvLyAocHJvdmlkaW5nIHRoZSBmdWxsIFRlbXBsYXRlVHlwZUNoZWNrZXIgQVBJKSBhbmQgaWYgc3RyaWN0IG1vZGUgaXMgbm90IGVuYWJsZWQuIEluIHN0cmljdFxuICAgICAgICAvLyBtb2RlLCB0aGUgdXNlciBpcyBpbiBmdWxsIGNvbnRyb2wgb2YgdHlwZSBpbmZlcmVuY2UuXG4gICAgICAgIHN1Z2dlc3Rpb25zRm9yU3Vib3B0aW1hbFR5cGVJbmZlcmVuY2U6IHRoaXMuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciAmJiAhc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogZmFsc2UsXG4gICAgICAgIGNoZWNrUXVlcmllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVGVtcGxhdGVCb2RpZXM6IGZhbHNlLFxuICAgICAgICAvLyBFbmFibGUgZGVlcCBzY2hlbWEgY2hlY2tpbmcgaW4gXCJiYXNpY1wiIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgbW9kZSBvbmx5IGlmIENsb3N1cmVcbiAgICAgICAgLy8gY29tcGlsYXRpb24gaXMgcmVxdWVzdGVkLCB3aGljaCBpcyBhIGdvb2QgcHJveHkgZm9yIFwib25seSBpbiBnb29nbGUzXCIuXG4gICAgICAgIGFsd2F5c0NoZWNrU2NoZW1hSW5UZW1wbGF0ZUJvZGllczogdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBzdHJpY3ROdWxsSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGhvbm9yQWNjZXNzTW9kaWZpZXJzRm9ySW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQXR0cmlidXRlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZlBpcGVzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogZmFsc2UsXG4gICAgICAgIHVzZUNvbnRleHRHZW5lcmljVHlwZTogZmFsc2UsXG4gICAgICAgIHN0cmljdExpdGVyYWxUeXBlczogZmFsc2UsXG4gICAgICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IHRoaXMuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgdXNlSW5saW5lVHlwZUNvbnN0cnVjdG9ycyxcbiAgICAgICAgLy8gSW4gXCJiYXNpY1wiIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgbW9kZSwgbm8gd2FybmluZ3MgYXJlIHByb2R1Y2VkIHNpbmNlIG1vc3QgdGhpbmdzIGFyZVxuICAgICAgICAvLyBub3QgY2hlY2tlZCBhbnl3YXlzLlxuICAgICAgICBzdWdnZXN0aW9uc0ZvclN1Ym9wdGltYWxUeXBlSW5mZXJlbmNlOiBmYWxzZSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gQXBwbHkgZXhwbGljaXRseSBjb25maWd1cmVkIHN0cmljdG5lc3MgZmxhZ3Mgb24gdG9wIG9mIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAvLyBiYXNlZCBvbiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzID0gdGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXM7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dEFjY2Vzc01vZGlmaWVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzID1cbiAgICAgICAgICB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRBY2Nlc3NNb2RpZmllcnM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbElucHV0VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzID0gdGhpcy5vcHRpb25zLnN0cmljdE51bGxJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXM7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3REb21FdmVudFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkRvbUV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3REb21FdmVudFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3REb21Mb2NhbFJlZlR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkRvbVJlZmVyZW5jZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0RG9tTG9jYWxSZWZUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RBdHRyaWJ1dGVUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzID0gdGhpcy5vcHRpb25zLnN0cmljdEF0dHJpYnV0ZVR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdENvbnRleHRHZW5lcmljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcudXNlQ29udGV4dEdlbmVyaWNUeXBlID0gdGhpcy5vcHRpb25zLnN0cmljdENvbnRleHRHZW5lcmljcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RMaXRlcmFsVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdExpdGVyYWxUeXBlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RMaXRlcmFsVHlwZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHR5cGVDaGVja2luZ0NvbmZpZztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIC8vIEdldCB0aGUgZGlhZ25vc3RpY3MuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy5pbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlIHx8IHRoaXMuYWRhcHRlci5pc1NoaW0oc2YpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBkaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgIC4uLmNvbXBpbGF0aW9uLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmLCBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW0pKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxTdGF0ZSh0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc3RhdGUsIHByb2dyYW0pO1xuICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgaWYgKCFzZi5pc0RlY2xhcmF0aW9uRmlsZSAmJiAhdGhpcy5hZGFwdGVyLmlzU2hpbShzZikpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY29tcGlsYXRpb24udGVtcGxhdGVUeXBlQ2hlY2tlci5nZXREaWFnbm9zdGljc0ZvckZpbGUoc2YsIG9wdGltaXplRm9yKSk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCk7XG4gICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsU3RhdGUodGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnN0YXRlLCBwcm9ncmFtKTtcbiAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGlmICh0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3MgPT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgICAgdGhpcy5ub25UZW1wbGF0ZURpYWdub3N0aWNzID0gWy4uLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZGlhZ25vc3RpY3NdO1xuICAgICAgaWYgKHRoaXMuZW50cnlQb2ludCAhPT0gbnVsbCAmJiBjb21waWxhdGlvbi5leHBvcnRSZWZlcmVuY2VHcmFwaCAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3MucHVzaCguLi5jaGVja0ZvclByaXZhdGVFeHBvcnRzKFxuICAgICAgICAgICAgdGhpcy5lbnRyeVBvaW50LCB0aGlzLmlucHV0UHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCBjb21waWxhdGlvbi5leHBvcnRSZWZlcmVuY2VHcmFwaCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5ub25UZW1wbGF0ZURpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2FuRm9yTXdwKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgdGhpcy5jb21waWxhdGlvbiEubXdwU2Nhbm5lci5zY2FuKHNmLCB7XG4gICAgICBhZGRUeXBlUmVwbGFjZW1lbnQ6IChub2RlOiB0cy5EZWNsYXJhdGlvbiwgdHlwZTogVHlwZSk6IHZvaWQgPT4ge1xuICAgICAgICAvLyBPbmx5IG9idGFpbiB0aGUgcmV0dXJuIHR5cGUgdHJhbnNmb3JtIGZvciB0aGUgc291cmNlIGZpbGUgb25jZSB0aGVyZSdzIGEgdHlwZSB0byByZXBsYWNlLFxuICAgICAgICAvLyBzbyB0aGF0IG5vIHRyYW5zZm9ybSBpcyBhbGxvY2F0ZWQgd2hlbiB0aGVyZSdzIG5vdGhpbmcgdG8gZG8uXG4gICAgICAgIHRoaXMuY29tcGlsYXRpb24hLmR0c1RyYW5zZm9ybXMhLmdldFJldHVyblR5cGVUcmFuc2Zvcm0oc2YpLmFkZFR5cGVSZXBsYWNlbWVudChub2RlLCB0eXBlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgbWFrZUNvbXBpbGF0aW9uKCk6IExhenlDb21waWxhdGlvblN0YXRlIHtcbiAgICBjb25zdCBjaGVja2VyID0gdGhpcy5pbnB1dFByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICAgIGNvbnN0IHJlZmxlY3RvciA9IG5ldyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QoY2hlY2tlcik7XG5cbiAgICAvLyBDb25zdHJ1Y3QgdGhlIFJlZmVyZW5jZUVtaXR0ZXIuXG4gICAgbGV0IHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXI7XG4gICAgbGV0IGFsaWFzaW5nSG9zdDogQWxpYXNpbmdIb3N0fG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmFkYXB0ZXIudW5pZmllZE1vZHVsZXNIb3N0ID09PSBudWxsIHx8ICF0aGlzLm9wdGlvbnMuX3VzZUhvc3RGb3JJbXBvcnRHZW5lcmF0aW9uKSB7XG4gICAgICBsZXQgbG9jYWxJbXBvcnRTdHJhdGVneTogUmVmZXJlbmNlRW1pdFN0cmF0ZWd5O1xuXG4gICAgICAvLyBUaGUgc3RyYXRlZ3kgdXNlZCBmb3IgbG9jYWwsIGluLXByb2plY3QgaW1wb3J0cyBkZXBlbmRzIG9uIHdoZXRoZXIgVFMgaGFzIGJlZW4gY29uZmlndXJlZFxuICAgICAgLy8gd2l0aCByb290RGlycy4gSWYgc28sIHRoZW4gbXVsdGlwbGUgZGlyZWN0b3JpZXMgbWF5IGJlIG1hcHBlZCBpbiB0aGUgc2FtZSBcIm1vZHVsZVxuICAgICAgLy8gbmFtZXNwYWNlXCIgYW5kIHRoZSBsb2dpYyBvZiBgTG9naWNhbFByb2plY3RTdHJhdGVneWAgaXMgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgY29ycmVjdFxuICAgICAgLy8gaW1wb3J0cyB3aGljaCBtYXkgY3Jvc3MgdGhlc2UgbXVsdGlwbGUgZGlyZWN0b3JpZXMuIE90aGVyd2lzZSwgcGxhaW4gcmVsYXRpdmUgaW1wb3J0cyBhcmVcbiAgICAgIC8vIHN1ZmZpY2llbnQuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnJvb3REaXIgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgICh0aGlzLm9wdGlvbnMucm9vdERpcnMgIT09IHVuZGVmaW5lZCAmJiB0aGlzLm9wdGlvbnMucm9vdERpcnMubGVuZ3RoID4gMCkpIHtcbiAgICAgICAgLy8gcm9vdERpcnMgbG9naWMgaXMgaW4gZWZmZWN0IC0gdXNlIHRoZSBgTG9naWNhbFByb2plY3RTdHJhdGVneWAgZm9yIGluLXByb2plY3QgcmVsYXRpdmVcbiAgICAgICAgLy8gaW1wb3J0cy5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSA9IG5ldyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5KFxuICAgICAgICAgICAgcmVmbGVjdG9yLCBuZXcgTG9naWNhbEZpbGVTeXN0ZW0oWy4uLnRoaXMuYWRhcHRlci5yb290RGlyc10sIHRoaXMuYWRhcHRlcikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gUGxhaW4gcmVsYXRpdmUgaW1wb3J0cyBhcmUgYWxsIHRoYXQncyBuZWVkZWQuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3kgPSBuZXcgUmVsYXRpdmVQYXRoU3RyYXRlZ3kocmVmbGVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBkb2Vzbid0IGhhdmUgZmlsZU5hbWVUb01vZHVsZU5hbWUsIHNvIGJ1aWxkIGFuIE5QTS1jZW50cmljIHJlZmVyZW5jZVxuICAgICAgLy8gcmVzb2x1dGlvbiBzdHJhdGVneS5cbiAgICAgIHJlZkVtaXR0ZXIgPSBuZXcgUmVmZXJlbmNlRW1pdHRlcihbXG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gdXNlIGxvY2FsIGlkZW50aWZpZXJzIGlmIGF2YWlsYWJsZS5cbiAgICAgICAgbmV3IExvY2FsSWRlbnRpZmllclN0cmF0ZWd5KCksXG4gICAgICAgIC8vIE5leHQsIGF0dGVtcHQgdG8gdXNlIGFuIGFic29sdXRlIGltcG9ydC5cbiAgICAgICAgbmV3IEFic29sdXRlTW9kdWxlU3RyYXRlZ3kodGhpcy5pbnB1dFByb2dyYW0sIGNoZWNrZXIsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHJlZmxlY3RvciksXG4gICAgICAgIC8vIEZpbmFsbHksIGNoZWNrIGlmIHRoZSByZWZlcmVuY2UgaXMgYmVpbmcgd3JpdHRlbiBpbnRvIGEgZmlsZSB3aXRoaW4gdGhlIHByb2plY3QncyAudHNcbiAgICAgICAgLy8gc291cmNlcywgYW5kIHVzZSBhIHJlbGF0aXZlIGltcG9ydCBpZiBzby4gSWYgdGhpcyBmYWlscywgUmVmZXJlbmNlRW1pdHRlciB3aWxsIHRocm93XG4gICAgICAgIC8vIGFuIGVycm9yLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5LFxuICAgICAgXSk7XG5cbiAgICAgIC8vIElmIGFuIGVudHJ5cG9pbnQgaXMgcHJlc2VudCwgdGhlbiBhbGwgdXNlciBpbXBvcnRzIHNob3VsZCBiZSBkaXJlY3RlZCB0aHJvdWdoIHRoZVxuICAgICAgLy8gZW50cnlwb2ludCBhbmQgcHJpdmF0ZSBleHBvcnRzIGFyZSBub3QgbmVlZGVkLiBUaGUgY29tcGlsZXIgd2lsbCB2YWxpZGF0ZSB0aGF0IGFsbCBwdWJsaWNseVxuICAgICAgLy8gdmlzaWJsZSBkaXJlY3RpdmVzL3BpcGVzIGFyZSBpbXBvcnRhYmxlIHZpYSB0aGlzIGVudHJ5cG9pbnQuXG4gICAgICBpZiAodGhpcy5lbnRyeVBvaW50ID09PSBudWxsICYmIHRoaXMub3B0aW9ucy5nZW5lcmF0ZURlZXBSZWV4cG9ydHMgPT09IHRydWUpIHtcbiAgICAgICAgLy8gTm8gZW50cnlwb2ludCBpcyBwcmVzZW50IGFuZCBkZWVwIHJlLWV4cG9ydHMgd2VyZSByZXF1ZXN0ZWQsIHNvIGNvbmZpZ3VyZSB0aGUgYWxpYXNpbmdcbiAgICAgICAgLy8gc3lzdGVtIHRvIGdlbmVyYXRlIHRoZW0uXG4gICAgICAgIGFsaWFzaW5nSG9zdCA9IG5ldyBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0KHJlZmxlY3Rvcik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBDb21waWxlckhvc3Qgc3VwcG9ydHMgZmlsZU5hbWVUb01vZHVsZU5hbWUsIHNvIHVzZSB0aGF0IHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgIHJlZkVtaXR0ZXIgPSBuZXcgUmVmZXJlbmNlRW1pdHRlcihbXG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gdXNlIGxvY2FsIGlkZW50aWZpZXJzIGlmIGF2YWlsYWJsZS5cbiAgICAgICAgbmV3IExvY2FsSWRlbnRpZmllclN0cmF0ZWd5KCksXG4gICAgICAgIC8vIFRoZW4gdXNlIGFsaWFzZWQgcmVmZXJlbmNlcyAodGhpcyBpcyBhIHdvcmthcm91bmQgdG8gU3RyaWN0RGVwcyBjaGVja3MpLlxuICAgICAgICBuZXcgQWxpYXNTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBmaWxlTmFtZVRvTW9kdWxlTmFtZSB0byBlbWl0IGltcG9ydHMuXG4gICAgICAgIG5ldyBVbmlmaWVkTW9kdWxlc1N0cmF0ZWd5KHJlZmxlY3RvciwgdGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCksXG4gICAgICBdKTtcbiAgICAgIGFsaWFzaW5nSG9zdCA9IG5ldyBVbmlmaWVkTW9kdWxlc0FsaWFzaW5nSG9zdCh0aGlzLmFkYXB0ZXIudW5pZmllZE1vZHVsZXNIb3N0KTtcbiAgICB9XG5cbiAgICBjb25zdCBldmFsdWF0b3IgPVxuICAgICAgICBuZXcgUGFydGlhbEV2YWx1YXRvcihyZWZsZWN0b3IsIGNoZWNrZXIsIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5kZXBHcmFwaCk7XG4gICAgY29uc3QgZHRzUmVhZGVyID0gbmV3IER0c01ldGFkYXRhUmVhZGVyKGNoZWNrZXIsIHJlZmxlY3Rvcik7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVnaXN0cnkgPSBuZXcgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlciA9IGxvY2FsTWV0YVJlZ2lzdHJ5O1xuICAgIGNvbnN0IGRlcFNjb3BlUmVhZGVyID0gbmV3IE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcihkdHNSZWFkZXIsIGFsaWFzaW5nSG9zdCk7XG4gICAgY29uc3Qgc2NvcGVSZWdpc3RyeSA9XG4gICAgICAgIG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkobG9jYWxNZXRhUmVhZGVyLCBkZXBTY29wZVJlYWRlciwgcmVmRW1pdHRlciwgYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIgPSBzY29wZVJlZ2lzdHJ5O1xuICAgIGNvbnN0IHNlbWFudGljRGVwR3JhcGhVcGRhdGVyID0gdGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyO1xuICAgIGNvbnN0IG1ldGFSZWdpc3RyeSA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnkoW2xvY2FsTWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5XSk7XG4gICAgY29uc3QgaW5qZWN0YWJsZVJlZ2lzdHJ5ID0gbmV3IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5KHJlZmxlY3Rvcik7XG5cbiAgICBjb25zdCBtZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW2xvY2FsTWV0YVJlYWRlciwgZHRzUmVhZGVyXSk7XG4gICAgY29uc3QgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSA9IG5ldyBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5KHNjb3BlUmVhZGVyLCBtZXRhUmVhZGVyKTtcblxuXG4gICAgLy8gSWYgYSBmbGF0IG1vZHVsZSBlbnRyeXBvaW50IHdhcyBzcGVjaWZpZWQsIHRoZW4gdHJhY2sgcmVmZXJlbmNlcyB2aWEgYSBgUmVmZXJlbmNlR3JhcGhgIGluXG4gICAgLy8gb3JkZXIgdG8gcHJvZHVjZSBwcm9wZXIgZGlhZ25vc3RpY3MgZm9yIGluY29ycmVjdGx5IGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMvZXRjLiBJZiB0aGVyZVxuICAgIC8vIGlzIG5vIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgdGhlbiBkb24ndCBwYXkgdGhlIGNvc3Qgb2YgdHJhY2tpbmcgcmVmZXJlbmNlcy5cbiAgICBsZXQgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBSZWZlcmVuY2VzUmVnaXN0cnk7XG4gICAgbGV0IGV4cG9ydFJlZmVyZW5jZUdyYXBoOiBSZWZlcmVuY2VHcmFwaHxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsKSB7XG4gICAgICBleHBvcnRSZWZlcmVuY2VHcmFwaCA9IG5ldyBSZWZlcmVuY2VHcmFwaCgpO1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IFJlZmVyZW5jZUdyYXBoQWRhcHRlcihleHBvcnRSZWZlcmVuY2VHcmFwaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5KCk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm91dGVBbmFseXplciA9IG5ldyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIodGhpcy5tb2R1bGVSZXNvbHZlciwgZXZhbHVhdG9yKTtcblxuICAgIGNvbnN0IGR0c1RyYW5zZm9ybXMgPSBuZXcgRHRzVHJhbnNmb3JtUmVnaXN0cnkoKTtcblxuICAgIGNvbnN0IG13cFNjYW5uZXIgPSBuZXcgTW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXIocmVmbGVjdG9yLCBldmFsdWF0b3IsIHJlZkVtaXR0ZXIpO1xuXG4gICAgY29uc3QgaXNDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy5pbnB1dFByb2dyYW0pO1xuXG4gICAgY29uc3QgcmVzb3VyY2VSZWdpc3RyeSA9IG5ldyBSZXNvdXJjZVJlZ2lzdHJ5KCk7XG5cbiAgICBjb25zdCBjb21waWxhdGlvbk1vZGUgPVxuICAgICAgICB0aGlzLm9wdGlvbnMuY29tcGlsYXRpb25Nb2RlID09PSAncGFydGlhbCcgPyBDb21waWxhdGlvbk1vZGUuUEFSVElBTCA6IENvbXBpbGF0aW9uTW9kZS5GVUxMO1xuXG4gICAgLy8gQ3ljbGVzIGFyZSBoYW5kbGVkIGluIGZ1bGwgY29tcGlsYXRpb24gbW9kZSBieSBcInJlbW90ZSBzY29waW5nXCIuXG4gICAgLy8gXCJSZW1vdGUgc2NvcGluZ1wiIGRvZXMgbm90IHdvcmsgd2VsbCB3aXRoIHRyZWUgc2hha2luZyBmb3IgbGlicmFyaWVzLlxuICAgIC8vIFNvIGluIHBhcnRpYWwgY29tcGlsYXRpb24gbW9kZSwgd2hlbiBidWlsZGluZyBhIGxpYnJhcnksIGEgY3ljbGUgd2lsbCBjYXVzZSBhbiBlcnJvci5cbiAgICBjb25zdCBjeWNsZUhhbmRsaW5nU3RyYXRlZ3kgPSBjb21waWxhdGlvbk1vZGUgPT09IENvbXBpbGF0aW9uTW9kZS5GVUxMID9cbiAgICAgICAgQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LlVzZVJlbW90ZVNjb3BpbmcgOlxuICAgICAgICBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuRXJyb3I7XG5cbiAgICAvLyBTZXQgdXAgdGhlIEl2eUNvbXBpbGF0aW9uLCB3aGljaCBtYW5hZ2VzIHN0YXRlIGZvciB0aGUgSXZ5IHRyYW5zZm9ybWVyLlxuICAgIGNvbnN0IGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sfG51bGwsIHVua25vd24+W10gPSBbXG4gICAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBtZXRhUmVhZGVyLCBzY29wZVJlYWRlciwgc2NvcGVSZWdpc3RyeSxcbiAgICAgICAgICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LCByZXNvdXJjZVJlZ2lzdHJ5LCBpc0NvcmUsIHRoaXMucmVzb3VyY2VNYW5hZ2VyLFxuICAgICAgICAgIHRoaXMuYWRhcHRlci5yb290RGlycywgdGhpcy5vcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMgfHwgZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyAhPT0gZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQgIT09IGZhbHNlLCB0aGlzLnVzZVBvaXNvbmVkRGF0YSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsXG4gICAgICAgICAgY3ljbGVIYW5kbGluZ1N0cmF0ZWd5LCByZWZFbWl0dGVyLCB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uZGVwR3JhcGgsXG4gICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlciwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciksXG5cbiAgICAgIC8vIFRPRE8oYWx4aHViKTogdW5kZXJzdGFuZCB3aHkgdGhlIGNhc3QgaGVyZSBpcyBuZWNlc3NhcnkgKHNvbWV0aGluZyB0byBkbyB3aXRoIGBudWxsYFxuICAgICAgLy8gbm90IGJlaW5nIGFzc2lnbmFibGUgdG8gYHVua25vd25gIHdoZW4gd3JhcHBlZCBpbiBgUmVhZG9ubHlgKS5cbiAgICAgIC8vIGNsYW5nLWZvcm1hdCBvZmZcbiAgICAgICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LCBtZXRhUmVhZGVyLFxuICAgICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBpc0NvcmUsIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyLFxuICAgICAgICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCwgY29tcGlsZVVuZGVjb3JhdGVkQ2xhc3Nlc1dpdGhBbmd1bGFyRmVhdHVyZXMsXG4gICAgICAgICAgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLFxuICAgICAgICApIGFzIFJlYWRvbmx5PERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2wgfCBudWxsLHVua25vd24+PixcbiAgICAgIC8vIGNsYW5nLWZvcm1hdCBvblxuICAgICAgLy8gUGlwZSBoYW5kbGVyIG11c3QgYmUgYmVmb3JlIGluamVjdGFibGUgaGFuZGxlciBpbiBsaXN0IHNvIHBpcGUgZmFjdG9yaWVzIGFyZSBwcmludGVkXG4gICAgICAvLyBiZWZvcmUgaW5qZWN0YWJsZSBmYWN0b3JpZXMgKHNvIGluamVjdGFibGUgZmFjdG9yaWVzIGNhbiBkZWxlZ2F0ZSB0byB0aGVtKVxuICAgICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIGluamVjdGFibGVSZWdpc3RyeSwgaXNDb3JlLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciksXG4gICAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBpc0NvcmUsIHRoaXMub3B0aW9ucy5zdHJpY3RJbmplY3Rpb25QYXJhbWV0ZXJzIHx8IGZhbHNlLCBpbmplY3RhYmxlUmVnaXN0cnksXG4gICAgICAgICAgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyKSxcbiAgICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWFkZXIsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgcmVmZXJlbmNlc1JlZ2lzdHJ5LCBpc0NvcmUsXG4gICAgICAgICAgcm91dGVBbmFseXplciwgcmVmRW1pdHRlciwgdGhpcy5hZGFwdGVyLmZhY3RvcnlUcmFja2VyLCB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsXG4gICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIsIHRoaXMub3B0aW9ucy5pMThuSW5Mb2NhbGUpLFxuICAgIF07XG5cbiAgICBjb25zdCB0cmFpdENvbXBpbGVyID0gbmV3IFRyYWl0Q29tcGlsZXIoXG4gICAgICAgIGhhbmRsZXJzLCByZWZsZWN0b3IsIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgdGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLFxuICAgICAgICB0aGlzLm9wdGlvbnMuY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlcyAhPT0gZmFsc2UsIGNvbXBpbGF0aW9uTW9kZSwgZHRzVHJhbnNmb3JtcyxcbiAgICAgICAgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIpO1xuXG4gICAgLy8gVGVtcGxhdGUgdHlwZS1jaGVja2luZyBtYXkgdXNlIHRoZSBgUHJvZ3JhbURyaXZlcmAgdG8gcHJvZHVjZSBuZXcgYHRzLlByb2dyYW1gKHMpLiBJZiB0aGlzXG4gICAgLy8gaGFwcGVucywgdGhleSBuZWVkIHRvIGJlIHRyYWNrZWQgYnkgdGhlIGBOZ0NvbXBpbGVyYC5cbiAgICBjb25zdCBub3RpZnlpbmdEcml2ZXIgPVxuICAgICAgICBuZXcgTm90aWZ5aW5nUHJvZ3JhbURyaXZlcldyYXBwZXIodGhpcy5wcm9ncmFtRHJpdmVyLCAocHJvZ3JhbTogdHMuUHJvZ3JhbSkgPT4ge1xuICAgICAgICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneS5zZXRJbmNyZW1lbnRhbFN0YXRlKHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5zdGF0ZSwgcHJvZ3JhbSk7XG4gICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XG4gICAgICAgIH0pO1xuXG4gICAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IG5ldyBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbChcbiAgICAgICAgdGhpcy5pbnB1dFByb2dyYW0sIG5vdGlmeWluZ0RyaXZlciwgdHJhaXRDb21waWxlciwgdGhpcy5nZXRUeXBlQ2hlY2tpbmdDb25maWcoKSwgcmVmRW1pdHRlcixcbiAgICAgICAgcmVmbGVjdG9yLCB0aGlzLmFkYXB0ZXIsIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbiwgc2NvcGVSZWdpc3RyeSwgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSxcbiAgICAgICAgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyKTtcblxuICAgIHJldHVybiB7XG4gICAgICBpc0NvcmUsXG4gICAgICB0cmFpdENvbXBpbGVyLFxuICAgICAgcmVmbGVjdG9yLFxuICAgICAgc2NvcGVSZWdpc3RyeSxcbiAgICAgIGR0c1RyYW5zZm9ybXMsXG4gICAgICBleHBvcnRSZWZlcmVuY2VHcmFwaCxcbiAgICAgIHJvdXRlQW5hbHl6ZXIsXG4gICAgICBtd3BTY2FubmVyLFxuICAgICAgbWV0YVJlYWRlcixcbiAgICAgIHR5cGVDaGVja1Njb3BlUmVnaXN0cnksXG4gICAgICBhbGlhc2luZ0hvc3QsXG4gICAgICByZWZFbWl0dGVyLFxuICAgICAgdGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgIHJlc291cmNlUmVnaXN0cnksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgZ2l2ZW4gYFByb2dyYW1gIGlzIEBhbmd1bGFyL2NvcmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUGFja2FnZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogYm9vbGVhbiB7XG4gIC8vIExvb2sgZm9yIGl0c19qdXN0X2FuZ3VsYXIudHMgc29tZXdoZXJlIGluIHRoZSBwcm9ncmFtLlxuICBjb25zdCByM1N5bWJvbHMgPSBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW0pO1xuICBpZiAocjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIGNvbnN0YW50IElUU19KVVNUX0FOR1VMQVIgaW4gdGhhdCBmaWxlLlxuICByZXR1cm4gcjNTeW1ib2xzLnN0YXRlbWVudHMuc29tZShzdG10ID0+IHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IG11c3QgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgYmUgZXhwb3J0ZWQuXG4gICAgaWYgKHN0bXQubW9kaWZpZXJzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXN0bXQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgZGVjbGFyZSBJVFNfSlVTVF9BTkdVTEFSLlxuICAgIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuc29tZShkZWNsID0+IHtcbiAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBtdXN0IG1hdGNoIHRoZSBuYW1lLlxuICAgICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSB8fCBkZWNsLm5hbWUudGV4dCAhPT0gJ0lUU19KVVNUX0FOR1VMQVInKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEl0IG11c3QgaW5pdGlhbGl6ZSB0aGUgdmFyaWFibGUgdG8gdHJ1ZS5cbiAgICAgIGlmIChkZWNsLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQgfHwgZGVjbC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgZGVmaW5pdGlvbiBtYXRjaGVzLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlICdyM19zeW1ib2xzLnRzJyBmaWxlIGluIHRoZSBnaXZlbiBgUHJvZ3JhbWAsIG9yIHJldHVybiBgbnVsbGAgaWYgaXQgd2Fzbid0IHRoZXJlLlxuICovXG5mdW5jdGlvbiBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbmQoZmlsZSA9PiBmaWxlLmZpbGVOYW1lLmluZGV4T2YoJ3IzX3N5bWJvbHMudHMnKSA+PSAwKSB8fCBudWxsO1xufVxuXG4vKipcbiAqIFNpbmNlIFwic3RyaWN0VGVtcGxhdGVzXCIgaXMgYSB0cnVlIHN1cGVyc2V0IG9mIHR5cGUgY2hlY2tpbmcgY2FwYWJpbGl0aWVzIGNvbXBhcmVkIHRvXG4gKiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiLCBpdCBpcyByZXF1aXJlZCB0aGF0IHRoZSBsYXR0ZXIgaXMgbm90IGV4cGxpY2l0bHkgZGlzYWJsZWQgaWYgdGhlXG4gKiBmb3JtZXIgaXMgZW5hYmxlZC5cbiAqL1xuZnVuY3Rpb24gdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnMob3B0aW9uczogTmdDb21waWxlck9wdGlvbnMpOiB0cy5EaWFnbm9zdGljfG51bGwge1xuICBpZiAob3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2sgPT09IGZhbHNlICYmIG9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICBjb2RlOiBuZ0Vycm9yQ29kZShFcnJvckNvZGUuQ09ORklHX1NUUklDVF9URU1QTEFURVNfSU1QTElFU19GVUxMX1RFTVBMQVRFX1RZUEVDSEVDSyksXG4gICAgICBmaWxlOiB1bmRlZmluZWQsXG4gICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBtZXNzYWdlVGV4dDpcbiAgICAgICAgICBgQW5ndWxhciBjb21waWxlciBvcHRpb24gXCJzdHJpY3RUZW1wbGF0ZXNcIiBpcyBlbmFibGVkLCBob3dldmVyIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgZGlzYWJsZWQuXG5cbkhhdmluZyB0aGUgXCJzdHJpY3RUZW1wbGF0ZXNcIiBmbGFnIGVuYWJsZWQgaW1wbGllcyB0aGF0IFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgYWxzbyBlbmFibGVkLCBzb1xudGhlIGxhdHRlciBjYW4gbm90IGJlIGV4cGxpY2l0bHkgZGlzYWJsZWQuXG5cbk9uZSBvZiB0aGUgZm9sbG93aW5nIGFjdGlvbnMgaXMgcmVxdWlyZWQ6XG4xLiBSZW1vdmUgdGhlIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgb3B0aW9uLlxuMi4gUmVtb3ZlIFwic3RyaWN0VGVtcGxhdGVzXCIgb3Igc2V0IGl0IHRvICdmYWxzZScuXG5cbk1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHRlbXBsYXRlIHR5cGUgY2hlY2tpbmcgY29tcGlsZXIgb3B0aW9ucyBjYW4gYmUgZm91bmQgaW4gdGhlIGRvY3VtZW50YXRpb246XG5odHRwczovL3Y5LmFuZ3VsYXIuaW8vZ3VpZGUvdGVtcGxhdGUtdHlwZWNoZWNrI3RlbXBsYXRlLXR5cGUtY2hlY2tpbmdgLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuY2xhc3MgUmVmZXJlbmNlR3JhcGhBZGFwdGVyIGltcGxlbWVudHMgUmVmZXJlbmNlc1JlZ2lzdHJ5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBncmFwaDogUmVmZXJlbmNlR3JhcGgpIHt9XG5cbiAgYWRkKHNvdXJjZTogRGVjbGFyYXRpb25Ob2RlLCAuLi5yZWZlcmVuY2VzOiBSZWZlcmVuY2U8RGVjbGFyYXRpb25Ob2RlPltdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB7bm9kZX0gb2YgcmVmZXJlbmNlcykge1xuICAgICAgbGV0IHNvdXJjZUZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc291cmNlRmlsZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgcmVjb3JkIGxvY2FsIHJlZmVyZW5jZXMgKG5vdCByZWZlcmVuY2VzIGludG8gLmQudHMgZmlsZXMpLlxuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCB8fCAhaXNEdHNQYXRoKHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgIHRoaXMuZ3JhcGguYWRkKHNvdXJjZSwgbm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIE5vdGlmeWluZ1Byb2dyYW1Ecml2ZXJXcmFwcGVyIGltcGxlbWVudHMgUHJvZ3JhbURyaXZlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBkZWxlZ2F0ZTogUHJvZ3JhbURyaXZlciwgcHJpdmF0ZSBub3RpZnlOZXdQcm9ncmFtOiAocHJvZ3JhbTogdHMuUHJvZ3JhbSkgPT4gdm9pZCkge31cblxuICBnZXQgc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zKCkge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLnN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucztcbiAgfVxuXG4gIGdldFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuZ2V0UHJvZ3JhbSgpO1xuICB9XG5cbiAgdXBkYXRlRmlsZXMoY29udGVudHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPiwgdXBkYXRlTW9kZTogVXBkYXRlTW9kZSk6IHZvaWQge1xuICAgIHRoaXMuZGVsZWdhdGUudXBkYXRlRmlsZXMoY29udGVudHMsIHVwZGF0ZU1vZGUpO1xuICAgIHRoaXMubm90aWZ5TmV3UHJvZ3JhbSh0aGlzLmRlbGVnYXRlLmdldFByb2dyYW0oKSk7XG4gIH1cblxuICBnZXRTb3VyY2VGaWxlVmVyc2lvbiA9IHRoaXMuZGVsZWdhdGUuZ2V0U291cmNlRmlsZVZlcnNpb24/LmJpbmQodGhpcyk7XG59XG5cbmZ1bmN0aW9uIHZlcnNpb25NYXBGcm9tUHJvZ3JhbShcbiAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkcml2ZXI6IFByb2dyYW1Ecml2ZXIpOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz58bnVsbCB7XG4gIGlmIChkcml2ZXIuZ2V0U291cmNlRmlsZVZlcnNpb24gPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgdmVyc2lvbnMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgcG9zc2libHlSZWRpcmVjdGVkU291cmNlRmlsZSBvZiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICBjb25zdCBzZiA9IHRvVW5yZWRpcmVjdGVkU291cmNlRmlsZShwb3NzaWJseVJlZGlyZWN0ZWRTb3VyY2VGaWxlKTtcbiAgICB2ZXJzaW9ucy5zZXQoYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZiksIGRyaXZlci5nZXRTb3VyY2VGaWxlVmVyc2lvbihzZikpO1xuICB9XG4gIHJldHVybiB2ZXJzaW9ucztcbn0iXX0=