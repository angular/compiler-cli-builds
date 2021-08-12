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
        define("@angular/compiler-cli/src/ngtsc/core/src/compiler", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/indexer", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsMkVBQStNO0lBQy9NLGlFQUErRTtJQUMvRSwyRUFBbUg7SUFDbkgsMkVBQXlFO0lBQ3pFLDJFQUFxRztJQUNyRyxtRUFBK1g7SUFDL1gsMkVBQXFHO0lBRXJHLG1FQUFrRjtJQUNsRixxRUFBa087SUFDbE8sdUZBQXlEO0lBQ3pELDZEQUE0RztJQUU1Ryx5RUFBb0c7SUFDcEcscUVBQXFEO0lBQ3JELG1FQUFzRTtJQUN0RSwrREFBbUk7SUFDbkksK0RBQXNEO0lBQ3RELGlFQUFnRDtJQUNoRCx1RUFBZ0w7SUFDaEwsdUVBQXdEO0lBQ3hELHFFQUF5RjtJQUN6RixrRkFBc0g7SUEwQnRIOztPQUVHO0lBQ0gsSUFBWSxxQkFJWDtJQUpELFdBQVkscUJBQXFCO1FBQy9CLG1FQUFLLENBQUE7UUFDTCxtR0FBcUIsQ0FBQTtRQUNyQiwrRkFBbUIsQ0FBQTtJQUNyQixDQUFDLEVBSlcscUJBQXFCLEdBQXJCLDZCQUFxQixLQUFyQiw2QkFBcUIsUUFJaEM7SUFnREQ7O09BRUc7SUFDSCxTQUFnQixzQkFBc0IsQ0FDbEMsU0FBcUIsRUFBRSxPQUEwQixFQUNqRCx3QkFBa0QsRUFBRSxhQUE0QixFQUNoRixZQUFxQyxFQUFFLHlCQUFrQyxFQUN6RSxlQUF3QjtRQUMxQixPQUFPO1lBQ0wsSUFBSSxFQUFFLHFCQUFxQixDQUFDLEtBQUs7WUFDakMsU0FBUyxXQUFBO1lBQ1QsT0FBTyxTQUFBO1lBQ1Asd0JBQXdCLDBCQUFBO1lBQ3hCLGFBQWEsZUFBQTtZQUNiLHlCQUF5QiwyQkFBQTtZQUN6QixlQUFlLGlCQUFBO1lBQ2YsWUFBWSxF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UmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vLi4vYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBDeWNsZUhhbmRsaW5nU3RyYXRlZ3ksIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi9jeWNsZXMnO1xuaW1wb3J0IHtDT01QSUxFUl9FUlJPUlNfV0lUSF9HVUlERVMsIEVSUk9SX0RFVEFJTFNfUEFHRV9CQVNFX1VSTCwgRXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjaGVja0ZvclByaXZhdGVFeHBvcnRzLCBSZWZlcmVuY2VHcmFwaH0gZnJvbSAnLi4vLi4vZW50cnlfcG9pbnQnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aCwgTG9naWNhbEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgQWxpYXNpbmdIb3N0LCBBbGlhc1N0cmF0ZWd5LCBEZWZhdWx0SW1wb3J0VHJhY2tlciwgSW1wb3J0UmV3cml0ZXIsIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBNb2R1bGVSZXNvbHZlciwgTm9vcEltcG9ydFJld3JpdGVyLCBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0LCBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0U3RyYXRlZ3ksIFJlZmVyZW5jZUVtaXR0ZXIsIFJlbGF0aXZlUGF0aFN0cmF0ZWd5LCBVbmlmaWVkTW9kdWxlc0FsaWFzaW5nSG9zdCwgVW5pZmllZE1vZHVsZXNTdHJhdGVneX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGRTdHJhdGVneSwgSW5jcmVtZW50YWxDb21waWxhdGlvbiwgSW5jcmVtZW50YWxTdGF0ZX0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvc2VtYW50aWNfZ3JhcGgnO1xuaW1wb3J0IHtnZW5lcmF0ZUFuYWx5c2lzLCBJbmRleGVkQ29tcG9uZW50LCBJbmRleGluZ0NvbnRleHR9IGZyb20gJy4uLy4uL2luZGV4ZXInO1xuaW1wb3J0IHtDb21wb25lbnRSZXNvdXJjZXMsIENvbXBvdW5kTWV0YWRhdGFSZWFkZXIsIENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgRGlyZWN0aXZlTWV0YSwgRHRzTWV0YWRhdGFSZWFkZXIsIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBMb2NhbE1ldGFkYXRhUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyLCBQaXBlTWV0YSwgUmVzb3VyY2VSZWdpc3RyeX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0FjdGl2ZVBlcmZSZWNvcmRlciwgRGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgUGVyZkNoZWNrcG9pbnQsIFBlcmZFdmVudCwgUGVyZlBoYXNlfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7RmlsZVVwZGF0ZSwgUHJvZ3JhbURyaXZlciwgVXBkYXRlTW9kZX0gZnJvbSAnLi4vLi4vcHJvZ3JhbV9kcml2ZXInO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGUsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtBZGFwdGVyUmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4uLy4uL3Jlc291cmNlJztcbmltcG9ydCB7ZW50cnlQb2ludEtleUZvciwgTmdNb2R1bGVSb3V0ZUFuYWx5emVyfSBmcm9tICcuLi8uLi9yb3V0aW5nJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXIsIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyLCBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge2dlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm19IGZyb20gJy4uLy4uL3NoaW1zJztcbmltcG9ydCB7aXZ5U3dpdGNoVHJhbnNmb3JtfSBmcm9tICcuLi8uLi9zd2l0Y2gnO1xuaW1wb3J0IHthbGlhc1RyYW5zZm9ybUZhY3RvcnksIENvbXBpbGF0aW9uTW9kZSwgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5LCBEZWNvcmF0b3JIYW5kbGVyLCBEdHNUcmFuc2Zvcm1SZWdpc3RyeSwgaXZ5VHJhbnNmb3JtRmFjdG9yeSwgVHJhaXRDb21waWxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7VGVtcGxhdGVUeXBlQ2hlY2tlckltcGx9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge09wdGltaXplRm9yLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2tpbmdDb25maWd9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlT3JOdWxsLCBpc0R0c1BhdGgsIHJlc29sdmVNb2R1bGVOYW1lLCB0b1VucmVkaXJlY3RlZFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtYaTE4bkNvbnRleHR9IGZyb20gJy4uLy4uL3hpMThuJztcbmltcG9ydCB7TGF6eVJvdXRlLCBOZ0NvbXBpbGVyQWRhcHRlciwgTmdDb21waWxlck9wdGlvbnN9IGZyb20gJy4uL2FwaSc7XG5cbi8qKlxuICogU3RhdGUgaW5mb3JtYXRpb24gYWJvdXQgYSBjb21waWxhdGlvbiB3aGljaCBpcyBvbmx5IGdlbmVyYXRlZCBvbmNlIHNvbWUgZGF0YSBpcyByZXF1ZXN0ZWQgZnJvbVxuICogdGhlIGBOZ0NvbXBpbGVyYCAoZm9yIGV4YW1wbGUsIGJ5IGNhbGxpbmcgYGdldERpYWdub3N0aWNzYCkuXG4gKi9cbmludGVyZmFjZSBMYXp5Q29tcGlsYXRpb25TdGF0ZSB7XG4gIGlzQ29yZTogYm9vbGVhbjtcbiAgdHJhaXRDb21waWxlcjogVHJhaXRDb21waWxlcjtcbiAgcmVmbGVjdG9yOiBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3Q7XG4gIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyO1xuICBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnk7XG4gIHR5cGVDaGVja1Njb3BlUmVnaXN0cnk6IFR5cGVDaGVja1Njb3BlUmVnaXN0cnk7XG4gIGV4cG9ydFJlZmVyZW5jZUdyYXBoOiBSZWZlcmVuY2VHcmFwaHxudWxsO1xuICByb3V0ZUFuYWx5emVyOiBOZ01vZHVsZVJvdXRlQW5hbHl6ZXI7XG4gIGR0c1RyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVJlZ2lzdHJ5O1xuICBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsO1xuICByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyO1xuICB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyO1xuICByZXNvdXJjZVJlZ2lzdHJ5OiBSZXNvdXJjZVJlZ2lzdHJ5O1xufVxuXG5cblxuLyoqXG4gKiBEaXNjcmltaW5hbnQgdHlwZSBmb3IgYSBgQ29tcGlsYXRpb25UaWNrZXRgLlxuICovXG5leHBvcnQgZW51bSBDb21waWxhdGlvblRpY2tldEtpbmQge1xuICBGcmVzaCxcbiAgSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICBJbmNyZW1lbnRhbFJlc291cmNlLFxufVxuXG4vKipcbiAqIEJlZ2luIGFuIEFuZ3VsYXIgY29tcGlsYXRpb24gb3BlcmF0aW9uIGZyb20gc2NyYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGcmVzaENvbXBpbGF0aW9uVGlja2V0IHtcbiAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoO1xuICBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucztcbiAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k7XG4gIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXI7XG4gIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbjtcbiAgdHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuLyoqXG4gKiBCZWdpbiBhbiBBbmd1bGFyIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiB0aGF0IGluY29ycG9yYXRlcyBjaGFuZ2VzIHRvIFR5cGVTY3JpcHQgY29kZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFR5cGVTY3JpcHRDb21waWxhdGlvblRpY2tldCB7XG4gIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQ7XG4gIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zO1xuICBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneTtcbiAgaW5jcmVtZW50YWxDb21waWxhdGlvbjogSW5jcmVtZW50YWxDb21waWxhdGlvbjtcbiAgcHJvZ3JhbURyaXZlcjogUHJvZ3JhbURyaXZlcjtcbiAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbjtcbiAgdXNlUG9pc29uZWREYXRhOiBib29sZWFuO1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQge1xuICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZTtcbiAgY29tcGlsZXI6IE5nQ29tcGlsZXI7XG4gIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz47XG4gIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyO1xufVxuXG4vKipcbiAqIEEgcmVxdWVzdCB0byBiZWdpbiBBbmd1bGFyIGNvbXBpbGF0aW9uLCBlaXRoZXIgc3RhcnRpbmcgZnJvbSBzY3JhdGNoIG9yIGZyb20gYSBrbm93biBwcmlvciBzdGF0ZS5cbiAqXG4gKiBgQ29tcGlsYXRpb25UaWNrZXRgcyBhcmUgdXNlZCB0byBpbml0aWFsaXplIChvciB1cGRhdGUpIGFuIGBOZ0NvbXBpbGVyYCBpbnN0YW5jZSwgdGhlIGNvcmUgb2YgdGhlXG4gKiBBbmd1bGFyIGNvbXBpbGVyLiBUaGV5IGFic3RyYWN0IHRoZSBzdGFydGluZyBzdGF0ZSBvZiBjb21waWxhdGlvbiBhbmQgYWxsb3cgYE5nQ29tcGlsZXJgIHRvIGJlXG4gKiBtYW5hZ2VkIGluZGVwZW5kZW50bHkgb2YgYW55IGluY3JlbWVudGFsIGNvbXBpbGF0aW9uIGxpZmVjeWNsZS5cbiAqL1xuZXhwb3J0IHR5cGUgQ29tcGlsYXRpb25UaWNrZXQgPSBGcmVzaENvbXBpbGF0aW9uVGlja2V0fEluY3JlbWVudGFsVHlwZVNjcmlwdENvbXBpbGF0aW9uVGlja2V0fFxuICAgIEluY3JlbWVudGFsUmVzb3VyY2VDb21waWxhdGlvblRpY2tldDtcblxuLyoqXG4gKiBDcmVhdGUgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGZvciBhIGJyYW5kIG5ldyBjb21waWxhdGlvbiwgdXNpbmcgbm8gcHJpb3Igc3RhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXJ8bnVsbCwgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbixcbiAgICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4pOiBDb21waWxhdGlvblRpY2tldCB7XG4gIHJldHVybiB7XG4gICAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoLFxuICAgIHRzUHJvZ3JhbSxcbiAgICBvcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBwcm9ncmFtRHJpdmVyLFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhLFxuICAgIHBlcmZSZWNvcmRlcjogcGVyZlJlY29yZGVyID8/IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpLFxuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBDb21waWxhdGlvblRpY2tldGAgYXMgZWZmaWNpZW50bHkgYXMgcG9zc2libGUsIGJhc2VkIG9uIGEgcHJldmlvdXMgYE5nQ29tcGlsZXJgXG4gKiBpbnN0YW5jZSBhbmQgYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tQ29tcGlsZXJUaWNrZXQoXG4gICAgb2xkQ29tcGlsZXI6IE5nQ29tcGlsZXIsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsXG4gICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+LFxuICAgIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyfG51bGwpOiBDb21waWxhdGlvblRpY2tldCB7XG4gIGNvbnN0IG9sZFByb2dyYW0gPSBvbGRDb21waWxlci5nZXRDdXJyZW50UHJvZ3JhbSgpO1xuICBjb25zdCBvbGRTdGF0ZSA9IG9sZENvbXBpbGVyLmluY3JlbWVudGFsU3RyYXRlZ3kuZ2V0SW5jcmVtZW50YWxTdGF0ZShvbGRQcm9ncmFtKTtcbiAgaWYgKG9sZFN0YXRlID09PSBudWxsKSB7XG4gICAgLy8gTm8gaW5jcmVtZW50YWwgc3RlcCBpcyBwb3NzaWJsZSBoZXJlLCBzaW5jZSBubyBJbmNyZW1lbnRhbERyaXZlciB3YXMgZm91bmQgZm9yIHRoZSBvbGRcbiAgICAvLyBwcm9ncmFtLlxuICAgIHJldHVybiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgICAgICBuZXdQcm9ncmFtLCBvbGRDb21waWxlci5vcHRpb25zLCBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXIsIHBlcmZSZWNvcmRlcixcbiAgICAgICAgb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciwgb2xkQ29tcGlsZXIudXNlUG9pc29uZWREYXRhKTtcbiAgfVxuXG4gIGlmIChwZXJmUmVjb3JkZXIgPT09IG51bGwpIHtcbiAgICBwZXJmUmVjb3JkZXIgPSBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKTtcbiAgfVxuXG4gIGNvbnN0IGluY3JlbWVudGFsQ29tcGlsYXRpb24gPSBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmluY3JlbWVudGFsKFxuICAgICAgbmV3UHJvZ3JhbSwgdmVyc2lvbk1hcEZyb21Qcm9ncmFtKG5ld1Byb2dyYW0sIHByb2dyYW1Ecml2ZXIpLCBvbGRQcm9ncmFtLCBvbGRTdGF0ZSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcblxuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQsXG4gICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICB1c2VQb2lzb25lZERhdGE6IG9sZENvbXBpbGVyLnVzZVBvaXNvbmVkRGF0YSxcbiAgICBvcHRpb25zOiBvbGRDb21waWxlci5vcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBpbmNyZW1lbnRhbENvbXBpbGF0aW9uLFxuICAgIHByb2dyYW1Ecml2ZXIsXG4gICAgbmV3UHJvZ3JhbSxcbiAgICBwZXJmUmVjb3JkZXIsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBkaXJlY3RseSBmcm9tIGFuIG9sZCBgdHMuUHJvZ3JhbWAgYW5kIGFzc29jaWF0ZWQgQW5ndWxhciBjb21waWxhdGlvblxuICogc3RhdGUsIGFsb25nIHdpdGggYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tU3RhdGVUaWNrZXQoXG4gICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkU3RhdGU6IEluY3JlbWVudGFsU3RhdGUsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PEFic29sdXRlRnNQYXRoPixcbiAgICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcnxudWxsLCBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuLFxuICAgIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbik6IENvbXBpbGF0aW9uVGlja2V0IHtcbiAgaWYgKHBlcmZSZWNvcmRlciA9PT0gbnVsbCkge1xuICAgIHBlcmZSZWNvcmRlciA9IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpO1xuICB9XG4gIGNvbnN0IGluY3JlbWVudGFsQ29tcGlsYXRpb24gPSBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmluY3JlbWVudGFsKFxuICAgICAgbmV3UHJvZ3JhbSwgdmVyc2lvbk1hcEZyb21Qcm9ncmFtKG5ld1Byb2dyYW0sIHByb2dyYW1Ecml2ZXIpLCBvbGRQcm9ncmFtLCBvbGRTdGF0ZSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICAgIG5ld1Byb2dyYW0sXG4gICAgb3B0aW9ucyxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICBwcm9ncmFtRHJpdmVyLFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhLFxuICAgIHBlcmZSZWNvcmRlcixcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc291cmNlQ2hhbmdlVGlja2V0KGNvbXBpbGVyOiBOZ0NvbXBpbGVyLCBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+KTpcbiAgICBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFJlc291cmNlLFxuICAgIGNvbXBpbGVyLFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcyxcbiAgICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpLFxuICB9O1xufVxuXG5cbi8qKlxuICogVGhlIGhlYXJ0IG9mIHRoZSBBbmd1bGFyIEl2eSBjb21waWxlci5cbiAqXG4gKiBUaGUgYE5nQ29tcGlsZXJgIHByb3ZpZGVzIGFuIEFQSSBmb3IgcGVyZm9ybWluZyBBbmd1bGFyIGNvbXBpbGF0aW9uIHdpdGhpbiBhIGN1c3RvbSBUeXBlU2NyaXB0XG4gKiBjb21waWxlci4gRWFjaCBpbnN0YW5jZSBvZiBgTmdDb21waWxlcmAgc3VwcG9ydHMgYSBzaW5nbGUgY29tcGlsYXRpb24sIHdoaWNoIG1pZ2h0IGJlXG4gKiBpbmNyZW1lbnRhbC5cbiAqXG4gKiBgTmdDb21waWxlcmAgaXMgbGF6eSwgYW5kIGRvZXMgbm90IHBlcmZvcm0gYW55IG9mIHRoZSB3b3JrIG9mIHRoZSBjb21waWxhdGlvbiB1bnRpbCBvbmUgb2YgaXRzXG4gKiBvdXRwdXQgbWV0aG9kcyAoZS5nLiBgZ2V0RGlhZ25vc3RpY3NgKSBpcyBjYWxsZWQuXG4gKlxuICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ0NvbXBpbGVyIHtcbiAgLyoqXG4gICAqIExhemlseSBldmFsdWF0ZWQgc3RhdGUgb2YgdGhlIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIGNyZWF0ZWQgb24gZGVtYW5kIGJ5IGNhbGxpbmcgYGVuc3VyZUFuYWx5emVkYC5cbiAgICovXG4gIHByaXZhdGUgY29tcGlsYXRpb246IExhenlDb21waWxhdGlvblN0YXRlfG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBBbnkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgY29uc3RydWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhlc2UgYXJlIGRpYWdub3N0aWNzIHdoaWNoIGFyb3NlIGR1cmluZyBzZXR1cCBvZiB0aGUgaG9zdCBhbmQvb3IgcHJvZ3JhbS5cbiAgICovXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBOb24tdGVtcGxhdGUgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgcHJvZ3JhbSBpdHNlbGYuIERvZXMgbm90IGluY2x1ZGUgdGVtcGxhdGVcbiAgICogZGlhZ25vc3RpY3MgYmVjYXVzZSB0aGUgdGVtcGxhdGUgdHlwZSBjaGVja2VyIG1lbW9pemVzIHRoZW0gaXRzZWxmLlxuICAgKlxuICAgKiBUaGlzIGlzIHNldCBieSAoYW5kIG1lbW9pemVzKSBgZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljc2AuXG4gICAqL1xuICBwcml2YXRlIG5vblRlbXBsYXRlRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgY3VycmVudFByb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgZW50cnlQb2ludDogdHMuU291cmNlRmlsZXxudWxsO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICByZWFkb25seSBpZ25vcmVGb3JEaWFnbm9zdGljczogU2V0PHRzLlNvdXJjZUZpbGU+O1xuICByZWFkb25seSBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT47XG5cbiAgLyoqXG4gICAqIGBOZ0NvbXBpbGVyYCBjYW4gYmUgcmV1c2VkIGZvciBtdWx0aXBsZSBjb21waWxhdGlvbnMgKGZvciByZXNvdXJjZS1vbmx5IGNoYW5nZXMpLCBhbmQgZWFjaFxuICAgKiBuZXcgY29tcGlsYXRpb24gdXNlcyBhIGZyZXNoIGBQZXJmUmVjb3JkZXJgLiBUaHVzLCBjbGFzc2VzIGNyZWF0ZWQgd2l0aCBhIGxpZmVzcGFuIG9mIHRoZVxuICAgKiBgTmdDb21waWxlcmAgdXNlIGEgYERlbGVnYXRpbmdQZXJmUmVjb3JkZXJgIHNvIHRoZSBgUGVyZlJlY29yZGVyYCB0aGV5IHdyaXRlIHRvIGNhbiBiZSB1cGRhdGVkXG4gICAqIHdpdGggZWFjaCBmcmVzaCBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZGVsZWdhdGluZ1BlcmZSZWNvcmRlciA9IG5ldyBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyKHRoaXMucGVyZlJlY29yZGVyKTtcblxuICAvKipcbiAgICogQ29udmVydCBhIGBDb21waWxhdGlvblRpY2tldGAgaW50byBhbiBgTmdDb21waWxlcmAgaW5zdGFuY2UgZm9yIHRoZSByZXF1ZXN0ZWQgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIERlcGVuZGluZyBvbiB0aGUgbmF0dXJlIG9mIHRoZSBjb21waWxhdGlvbiByZXF1ZXN0LCB0aGUgYE5nQ29tcGlsZXJgIGluc3RhbmNlIG1heSBiZSByZXVzZWRcbiAgICogZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uIGFuZCB1cGRhdGVkIHdpdGggYW55IGNoYW5nZXMsIGl0IG1heSBiZSBhIG5ldyBpbnN0YW5jZSB3aGljaFxuICAgKiBpbmNyZW1lbnRhbGx5IHJldXNlcyBzdGF0ZSBmcm9tIGEgcHJldmlvdXMgY29tcGlsYXRpb24sIG9yIGl0IG1heSByZXByZXNlbnQgYSBmcmVzaFxuICAgKiBjb21waWxhdGlvbiBlbnRpcmVseS5cbiAgICovXG4gIHN0YXRpYyBmcm9tVGlja2V0KHRpY2tldDogQ29tcGlsYXRpb25UaWNrZXQsIGFkYXB0ZXI6IE5nQ29tcGlsZXJBZGFwdGVyKSB7XG4gICAgc3dpdGNoICh0aWNrZXQua2luZCkge1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuRnJlc2g6XG4gICAgICAgIHJldHVybiBuZXcgTmdDb21waWxlcihcbiAgICAgICAgICAgIGFkYXB0ZXIsXG4gICAgICAgICAgICB0aWNrZXQub3B0aW9ucyxcbiAgICAgICAgICAgIHRpY2tldC50c1Byb2dyYW0sXG4gICAgICAgICAgICB0aWNrZXQucHJvZ3JhbURyaXZlcixcbiAgICAgICAgICAgIHRpY2tldC5pbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICAgICAgICBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmZyZXNoKFxuICAgICAgICAgICAgICAgIHRpY2tldC50c1Byb2dyYW0sIHZlcnNpb25NYXBGcm9tUHJvZ3JhbSh0aWNrZXQudHNQcm9ncmFtLCB0aWNrZXQucHJvZ3JhbURyaXZlcikpLFxuICAgICAgICAgICAgdGlja2V0LmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgICAgICB0aWNrZXQudXNlUG9pc29uZWREYXRhLFxuICAgICAgICAgICAgdGlja2V0LnBlcmZSZWNvcmRlcixcbiAgICAgICAgKTtcbiAgICAgIGNhc2UgQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsVHlwZVNjcmlwdDpcbiAgICAgICAgcmV0dXJuIG5ldyBOZ0NvbXBpbGVyKFxuICAgICAgICAgICAgYWRhcHRlcixcbiAgICAgICAgICAgIHRpY2tldC5vcHRpb25zLFxuICAgICAgICAgICAgdGlja2V0Lm5ld1Byb2dyYW0sXG4gICAgICAgICAgICB0aWNrZXQucHJvZ3JhbURyaXZlcixcbiAgICAgICAgICAgIHRpY2tldC5pbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICAgICAgICB0aWNrZXQuaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgICAgICAgIHRpY2tldC5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICAgICAgdGlja2V0LnVzZVBvaXNvbmVkRGF0YSxcbiAgICAgICAgICAgIHRpY2tldC5wZXJmUmVjb3JkZXIsXG4gICAgICAgICk7XG4gICAgICBjYXNlIENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFJlc291cmNlOlxuICAgICAgICBjb25zdCBjb21waWxlciA9IHRpY2tldC5jb21waWxlcjtcbiAgICAgICAgY29tcGlsZXIudXBkYXRlV2l0aENoYW5nZWRSZXNvdXJjZXModGlja2V0Lm1vZGlmaWVkUmVzb3VyY2VGaWxlcywgdGlja2V0LnBlcmZSZWNvcmRlcik7XG4gICAgICAgIHJldHVybiBjb21waWxlcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBhZGFwdGVyOiBOZ0NvbXBpbGVyQWRhcHRlcixcbiAgICAgIHJlYWRvbmx5IG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBpbnB1dFByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICByZWFkb25seSBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgICAgcmVhZG9ubHkgaW5jcmVtZW50YWxTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgICAgcmVhZG9ubHkgaW5jcmVtZW50YWxDb21waWxhdGlvbjogSW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICAgIHJlYWRvbmx5IGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW4sXG4gICAgICByZWFkb25seSB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGxpdmVQZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcixcbiAgKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuYWRhcHRlci5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcyk7XG4gICAgY29uc3QgaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMgPSB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xuICAgIGlmIChpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljKTtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gaW5wdXRQcm9ncmFtO1xuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhdGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID1cbiAgICAgICAgYWRhcHRlci5lbnRyeVBvaW50ICE9PSBudWxsID8gZ2V0U291cmNlRmlsZU9yTnVsbChpbnB1dFByb2dyYW0sIGFkYXB0ZXIuZW50cnlQb2ludCkgOiBudWxsO1xuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmFkYXB0ZXIuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgICAgICAvLyBkb2VuJ3QgcmV0YWluIGEgcmVmZXJlbmNlIHRvIGB0aGlzYCwgaWYgb3RoZXIgY2xvc3VyZXMgaW4gdGhlIGNvbnN0cnVjdG9yIGhlcmUgcmVmZXJlbmNlXG4gICAgICAgIC8vIGB0aGlzYCBpbnRlcm5hbGx5IHRoZW4gYSBjbG9zdXJlIGNyZWF0ZWQgaGVyZSB3b3VsZCByZXRhaW4gdGhlbS4gVGhpcyBjYW4gY2F1c2UgbWFqb3JcbiAgICAgICAgLy8gbWVtb3J5IGxlYWsgaXNzdWVzIHNpbmNlIHRoZSBgbW9kdWxlUmVzb2x1dGlvbkNhY2hlYCBpcyBhIGxvbmctbGl2ZWQgb2JqZWN0IGFuZCBmaW5kcyBpdHNcbiAgICAgICAgLy8gd2F5IGludG8gYWxsIGtpbmRzIG9mIHBsYWNlcyBpbnNpZGUgVFMgaW50ZXJuYWwgb2JqZWN0cy5cbiAgICAgICAgdGhpcy5hZGFwdGVyLmdldENhbm9uaWNhbEZpbGVOYW1lLmJpbmQodGhpcy5hZGFwdGVyKSk7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHZlciA9XG4gICAgICAgIG5ldyBNb2R1bGVSZXNvbHZlcihpbnB1dFByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5hZGFwdGVyLCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUpO1xuICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyID0gbmV3IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcihhZGFwdGVyLCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMuY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKFxuICAgICAgICBuZXcgSW1wb3J0R3JhcGgoaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcikpO1xuICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneS5zZXRJbmNyZW1lbnRhbFN0YXRlKHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5zdGF0ZSwgaW5wdXRQcm9ncmFtKTtcblxuICAgIHRoaXMuaWdub3JlRm9yRGlhZ25vc3RpY3MgPVxuICAgICAgICBuZXcgU2V0KGlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbHRlcihzZiA9PiB0aGlzLmFkYXB0ZXIuaXNTaGltKHNmKSkpO1xuICAgIHRoaXMuaWdub3JlRm9yRW1pdCA9IHRoaXMuYWRhcHRlci5pZ25vcmVGb3JFbWl0O1xuXG4gICAgbGV0IGR0c0ZpbGVDb3VudCA9IDA7XG4gICAgbGV0IG5vbkR0c0ZpbGVDb3VudCA9IDA7XG4gICAgZm9yIChjb25zdCBzZiBvZiBpbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIGR0c0ZpbGVDb3VudCsrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9uRHRzRmlsZUNvdW50Kys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGl2ZVBlcmZSZWNvcmRlci5ldmVudENvdW50KFBlcmZFdmVudC5JbnB1dER0c0ZpbGUsIGR0c0ZpbGVDb3VudCk7XG4gICAgbGl2ZVBlcmZSZWNvcmRlci5ldmVudENvdW50KFBlcmZFdmVudC5JbnB1dFRzRmlsZSwgbm9uRHRzRmlsZUNvdW50KTtcbiAgfVxuXG4gIGdldCBwZXJmUmVjb3JkZXIoKTogQWN0aXZlUGVyZlJlY29yZGVyIHtcbiAgICByZXR1cm4gdGhpcy5saXZlUGVyZlJlY29yZGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4cG9zZXMgdGhlIGBJbmNyZW1lbnRhbENvbXBpbGF0aW9uYCB1bmRlciBhbiBvbGQgcHJvcGVydHkgbmFtZSB0aGF0IHRoZSBDTEkgdXNlcywgYXZvaWRpbmcgYVxuICAgKiBjaGlja2VuLWFuZC1lZ2cgcHJvYmxlbSB3aXRoIHRoZSByZW5hbWUgdG8gYGluY3JlbWVudGFsQ29tcGlsYXRpb25gLlxuICAgKlxuICAgKiBUT0RPKGFseGh1Yik6IHJlbW92ZSB3aGVuIHRoZSBDTEkgdXNlcyB0aGUgbmV3IG5hbWUuXG4gICAqL1xuICBnZXQgaW5jcmVtZW50YWxEcml2ZXIoKTogSW5jcmVtZW50YWxDb21waWxhdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbjtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlV2l0aENoYW5nZWRSZXNvdXJjZXMoXG4gICAgICBjaGFuZ2VkUmVzb3VyY2VzOiBTZXQ8c3RyaW5nPiwgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXIpOiB2b2lkIHtcbiAgICB0aGlzLmxpdmVQZXJmUmVjb3JkZXIgPSBwZXJmUmVjb3JkZXI7XG4gICAgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLnRhcmdldCA9IHBlcmZSZWNvcmRlcjtcblxuICAgIHBlcmZSZWNvcmRlci5pblBoYXNlKFBlcmZQaGFzZS5SZXNvdXJjZVVwZGF0ZSwgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgLy8gQW5hbHlzaXMgaGFzbid0IGhhcHBlbmVkIHlldCwgc28gbm8gdXBkYXRlIGlzIG5lY2Vzc2FyeSAtIGFueSBjaGFuZ2VzIHRvIHJlc291cmNlcyB3aWxsXG4gICAgICAgIC8vIGJlIGNhcHR1cmVkIGJ5IHRoZSBpbml0YWwgYW5hbHlzaXMgcGFzcyBpdHNlbGYuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZXNvdXJjZU1hbmFnZXIuaW52YWxpZGF0ZSgpO1xuXG4gICAgICBjb25zdCBjbGFzc2VzVG9VcGRhdGUgPSBuZXcgU2V0PERlY2xhcmF0aW9uTm9kZT4oKTtcbiAgICAgIGZvciAoY29uc3QgcmVzb3VyY2VGaWxlIG9mIGNoYW5nZWRSZXNvdXJjZXMpIHtcbiAgICAgICAgZm9yIChjb25zdCB0ZW1wbGF0ZUNsYXNzIG9mIHRoaXMuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUocmVzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIGNsYXNzZXNUb1VwZGF0ZS5hZGQodGVtcGxhdGVDbGFzcyk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IHN0eWxlQ2xhc3Mgb2YgdGhpcy5nZXRDb21wb25lbnRzV2l0aFN0eWxlRmlsZShyZXNvdXJjZUZpbGUpKSB7XG4gICAgICAgICAgY2xhc3Nlc1RvVXBkYXRlLmFkZChzdHlsZUNsYXNzKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IGNsYXp6IG9mIGNsYXNzZXNUb1VwZGF0ZSkge1xuICAgICAgICB0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIudXBkYXRlUmVzb3VyY2VzKGNsYXp6KTtcbiAgICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oY2xhenopKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbXBpbGF0aW9uLnRlbXBsYXRlVHlwZUNoZWNrZXIuaW52YWxpZGF0ZUNsYXNzKGNsYXp6KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHJlc291cmNlIGRlcGVuZGVuY2llcyBvZiBhIGZpbGUuXG4gICAqXG4gICAqIElmIHRoZSBmaWxlIGlzIG5vdCBwYXJ0IG9mIHRoZSBjb21waWxhdGlvbiwgYW4gZW1wdHkgYXJyYXkgd2lsbCBiZSByZXR1cm5lZC5cbiAgICovXG4gIGdldFJlc291cmNlRGVwZW5kZW5jaWVzKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmdbXSB7XG4gICAgdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgcmV0dXJuIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5kZXBHcmFwaC5nZXRSZXNvdXJjZURlcGVuZGVuY2llcyhmaWxlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIEFuZ3VsYXItcmVsYXRlZCBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICovXG4gIGdldERpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkTWVzc2FnZVRleHREZXRhaWxzKFxuICAgICAgICBbLi4udGhpcy5nZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCksIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljcygpXSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBBbmd1bGFyLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIElmIGEgYHRzLlNvdXJjZUZpbGVgIGlzIHBhc3NlZCwgb25seSBkaWFnbm9zdGljcyByZWxhdGVkIHRvIHRoYXQgZmlsZSBhcmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXREaWFnbm9zdGljc0ZvckZpbGUoZmlsZTogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoW1xuICAgICAgLi4udGhpcy5nZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCkuZmlsdGVyKGRpYWcgPT4gZGlhZy5maWxlID09PSBmaWxlKSxcbiAgICAgIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljc0ZvckZpbGUoZmlsZSwgb3B0aW1pemVGb3IpXG4gICAgXSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIEFuZ3VsYXIuaW8gZXJyb3IgZ3VpZGUgbGlua3MgdG8gZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGFkZE1lc3NhZ2VUZXh0RGV0YWlscyhkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gZGlhZ25vc3RpY3MubWFwKGRpYWcgPT4ge1xuICAgICAgaWYgKGRpYWcuY29kZSAmJiBDT01QSUxFUl9FUlJPUlNfV0lUSF9HVUlERVMuaGFzKG5nRXJyb3JDb2RlKGRpYWcuY29kZSkpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4uZGlhZyxcbiAgICAgICAgICBtZXNzYWdlVGV4dDogZGlhZy5tZXNzYWdlVGV4dCArXG4gICAgICAgICAgICAgIGAuIEZpbmQgbW9yZSBhdCAke0VSUk9SX0RFVEFJTFNfUEFHRV9CQVNFX1VSTH0vTkcke25nRXJyb3JDb2RlKGRpYWcuY29kZSl9YFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRpYWc7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBzZXR1cC1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGN1cnJlbnQgYHRzLlByb2dyYW1gIGtub3duIHRvIHRoaXMgYE5nQ29tcGlsZXJgLlxuICAgKlxuICAgKiBDb21waWxhdGlvbiBiZWdpbnMgd2l0aCBhbiBpbnB1dCBgdHMuUHJvZ3JhbWAsIGFuZCBkdXJpbmcgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBvcGVyYXRpb25zIG5ld1xuICAgKiBgdHMuUHJvZ3JhbWBzIG1heSBiZSBwcm9kdWNlZCB1c2luZyB0aGUgYFByb2dyYW1Ecml2ZXJgLiBUaGUgbW9zdCByZWNlbnQgc3VjaCBgdHMuUHJvZ3JhbWAgdG9cbiAgICogYmUgcHJvZHVjZWQgaXMgYXZhaWxhYmxlIGhlcmUuXG4gICAqXG4gICAqIFRoaXMgYHRzLlByb2dyYW1gIHNlcnZlcyB0d28ga2V5IHB1cnBvc2VzOlxuICAgKlxuICAgKiAqIEFzIGFuIGluY3JlbWVudGFsIHN0YXJ0aW5nIHBvaW50IGZvciBjcmVhdGluZyB0aGUgbmV4dCBgdHMuUHJvZ3JhbWAgYmFzZWQgb24gZmlsZXMgdGhhdCB0aGVcbiAgICogICB1c2VyIGhhcyBjaGFuZ2VkIChmb3IgY2xpZW50cyB1c2luZyB0aGUgVFMgY29tcGlsZXIgcHJvZ3JhbSBBUElzKS5cbiAgICpcbiAgICogKiBBcyB0aGUgXCJiZWZvcmVcIiBwb2ludCBmb3IgYW4gaW5jcmVtZW50YWwgY29tcGlsYXRpb24gaW52b2NhdGlvbiwgdG8gZGV0ZXJtaW5lIHdoYXQncyBjaGFuZ2VkXG4gICAqICAgYmV0d2VlbiB0aGUgb2xkIGFuZCBuZXcgcHJvZ3JhbXMgKGZvciBhbGwgY29tcGlsYXRpb25zKS5cbiAgICovXG4gIGdldEN1cnJlbnRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQcm9ncmFtO1xuICB9XG5cbiAgZ2V0VGVtcGxhdGVUeXBlQ2hlY2tlcigpOiBUZW1wbGF0ZVR5cGVDaGVja2VyIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdUaGUgYFRlbXBsYXRlVHlwZUNoZWNrZXJgIGRvZXMgbm90IHdvcmsgd2l0aG91dCBgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcmAuJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmVuc3VyZUFuYWx5emVkKCkudGVtcGxhdGVUeXBlQ2hlY2tlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGB0cy5EZWNsYXJhdGlvbmBzIGZvciBhbnkgY29tcG9uZW50KHMpIHdoaWNoIHVzZSB0aGUgZ2l2ZW4gdGVtcGxhdGUgZmlsZS5cbiAgICovXG4gIGdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKHRlbXBsYXRlRmlsZVBhdGg6IHN0cmluZyk6IFJlYWRvbmx5U2V0PERlY2xhcmF0aW9uTm9kZT4ge1xuICAgIGNvbnN0IHtyZXNvdXJjZVJlZ2lzdHJ5fSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gcmVzb3VyY2VSZWdpc3RyeS5nZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlKHJlc29sdmUodGVtcGxhdGVGaWxlUGF0aCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgYHRzLkRlY2xhcmF0aW9uYHMgZm9yIGFueSBjb21wb25lbnQocykgd2hpY2ggdXNlIHRoZSBnaXZlbiB0ZW1wbGF0ZSBmaWxlLlxuICAgKi9cbiAgZ2V0Q29tcG9uZW50c1dpdGhTdHlsZUZpbGUoc3R5bGVGaWxlUGF0aDogc3RyaW5nKTogUmVhZG9ubHlTZXQ8RGVjbGFyYXRpb25Ob2RlPiB7XG4gICAgY29uc3Qge3Jlc291cmNlUmVnaXN0cnl9ID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIHJldHVybiByZXNvdXJjZVJlZ2lzdHJ5LmdldENvbXBvbmVudHNXaXRoU3R5bGUocmVzb2x2ZShzdHlsZUZpbGVQYXRoKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGV4dGVybmFsIHJlc291cmNlcyBmb3IgdGhlIGdpdmVuIGNvbXBvbmVudC5cbiAgICovXG4gIGdldENvbXBvbmVudFJlc291cmNlcyhjbGFzc0RlY2w6IERlY2xhcmF0aW9uTm9kZSk6IENvbXBvbmVudFJlc291cmNlc3xudWxsIHtcbiAgICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGNsYXNzRGVjbCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB7cmVzb3VyY2VSZWdpc3RyeX0gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29uc3Qgc3R5bGVzID0gcmVzb3VyY2VSZWdpc3RyeS5nZXRTdHlsZXMoY2xhc3NEZWNsKTtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHJlc291cmNlUmVnaXN0cnkuZ2V0VGVtcGxhdGUoY2xhc3NEZWNsKTtcbiAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7c3R5bGVzLCB0ZW1wbGF0ZX07XG4gIH1cblxuICBnZXRNZXRhKGNsYXNzRGVjbDogRGVjbGFyYXRpb25Ob2RlKTogUGlwZU1ldGF8RGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKGNsYXNzRGVjbCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKGNsYXNzRGVjbCk7XG4gICAgY29uc3Qge21ldGFSZWFkZXJ9ID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IG1ldGEgPSBtZXRhUmVhZGVyLmdldFBpcGVNZXRhZGF0YShyZWYpID8/IG1ldGFSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEocmVmKTtcbiAgICBpZiAobWV0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBtZXRhO1xuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm0gQW5ndWxhcidzIGFuYWx5c2lzIHN0ZXAgKGFzIGEgcHJlY3Vyc29yIHRvIGBnZXREaWFnbm9zdGljc2Agb3IgYHByZXBhcmVFbWl0YClcbiAgICogYXN5bmNocm9ub3VzbHkuXG4gICAqXG4gICAqIE5vcm1hbGx5LCB0aGlzIG9wZXJhdGlvbiBoYXBwZW5zIGxhemlseSB3aGVuZXZlciBgZ2V0RGlhZ25vc3RpY3NgIG9yIGBwcmVwYXJlRW1pdGAgYXJlIGNhbGxlZC5cbiAgICogSG93ZXZlciwgY2VydGFpbiBjb25zdW1lcnMgbWF5IHdpc2ggdG8gYWxsb3cgZm9yIGFuIGFzeW5jaHJvbm91cyBwaGFzZSBvZiBhbmFseXNpcywgd2hlcmVcbiAgICogcmVzb3VyY2VzIHN1Y2ggYXMgYHN0eWxlVXJsc2AgYXJlIHJlc29sdmVkIGFzeW5jaG9ub3VzbHkuIEluIHRoZXNlIGNhc2VzIGBhbmFseXplQXN5bmNgIG11c3QgYmVcbiAgICogY2FsbGVkIGZpcnN0LCBhbmQgaXRzIGBQcm9taXNlYCBhd2FpdGVkIHByaW9yIHRvIGNhbGxpbmcgYW55IG90aGVyIEFQSXMgb2YgYE5nQ29tcGlsZXJgLlxuICAgKi9cbiAgYXN5bmMgYW5hbHl6ZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuQW5hbHlzaXMsIGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuXG4gICAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMuaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYW5hbHlzaXNQcm9taXNlID0gdGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmFuYWx5emVBc3luYyhzZik7XG4gICAgICAgIGlmIChhbmFseXNpc1Byb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHByb21pc2VzLnB1c2goYW5hbHlzaXNQcm9taXNlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5BbmFseXNpcyk7XG4gICAgICB0aGlzLnJlc29sdmVDb21waWxhdGlvbih0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3QgbGF6eSByb3V0ZXMgZGV0ZWN0ZWQgZHVyaW5nIGFuYWx5c2lzLlxuICAgKlxuICAgKiBUaGlzIGNhbiBiZSBjYWxsZWQgZm9yIG9uZSBzcGVjaWZpYyByb3V0ZSwgb3IgdG8gcmV0cmlldmUgYWxsIHRvcC1sZXZlbCByb3V0ZXMuXG4gICAqL1xuICBsaXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlPzogc3RyaW5nKTogTGF6eVJvdXRlW10ge1xuICAgIGlmIChlbnRyeVJvdXRlKSB7XG4gICAgICAvLyBodHRzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvYmxvYi81MDczMmUxNTYvcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvY29tcGlsZXJfaG9zdC50cyNMMTc1LUwxODgpLlxuICAgICAgLy9cbiAgICAgIC8vIGBAYW5ndWxhci9jbGlgIHdpbGwgYWx3YXlzIGNhbGwgdGhpcyBBUEkgd2l0aCBhbiBhYnNvbHV0ZSBwYXRoLCBzbyB0aGUgcmVzb2x1dGlvbiBzdGVwIGlzXG4gICAgICAvLyBub3QgbmVjZXNzYXJ5LCBidXQga2VlcGluZyBpdCBiYWNrd2FyZHMgY29tcGF0aWJsZSBpbiBjYXNlIHNvbWVvbmUgZWxzZSBpcyB1c2luZyB0aGUgQVBJLlxuXG4gICAgICAvLyBSZWxhdGl2ZSBlbnRyeSBwYXRocyBhcmUgZGlzYWxsb3dlZC5cbiAgICAgIGlmIChlbnRyeVJvdXRlLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBsaXN0IGxhenkgcm91dGVzOiBSZXNvbHV0aW9uIG9mIHJlbGF0aXZlIHBhdGhzICgke1xuICAgICAgICAgICAgZW50cnlSb3V0ZX0pIGlzIG5vdCBzdXBwb3J0ZWQuYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vbi1yZWxhdGl2ZSBlbnRyeSBwYXRocyBmYWxsIGludG8gb25lIG9mIHRoZSBmb2xsb3dpbmcgY2F0ZWdvcmllczpcbiAgICAgIC8vIC0gQWJzb2x1dGUgc3lzdGVtIHBhdGhzIChlLmcuIGAvZm9vL2Jhci9teS1wcm9qZWN0L215LW1vZHVsZWApLCB3aGljaCBhcmUgdW5hZmZlY3RlZCBieSB0aGVcbiAgICAgIC8vICAgbG9naWMgYmVsb3cuXG4gICAgICAvLyAtIFBhdGhzIHRvIGVudGVybmFsIG1vZHVsZXMgKGUuZy4gYHNvbWUtbGliYCkuXG4gICAgICAvLyAtIFBhdGhzIG1hcHBlZCB0byBkaXJlY3RvcmllcyBpbiBgdHNjb25maWcuanNvbmAgKGUuZy4gYHNoYXJlZC9teS1tb2R1bGVgKS5cbiAgICAgIC8vICAgKFNlZSBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9tb2R1bGUtcmVzb2x1dGlvbi5odG1sI3BhdGgtbWFwcGluZy4pXG4gICAgICAvL1xuICAgICAgLy8gSW4gYWxsIGNhc2VzIGFib3ZlLCB0aGUgYGNvbnRhaW5pbmdGaWxlYCBhcmd1bWVudCBpcyBpZ25vcmVkLCBzbyB3ZSBjYW4ganVzdCB0YWtlIHRoZSBmaXJzdFxuICAgICAgLy8gb2YgdGhlIHJvb3QgZmlsZXMuXG4gICAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IHRoaXMuaW5wdXRQcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKVswXTtcbiAgICAgIGNvbnN0IFtlbnRyeVBhdGgsIG1vZHVsZU5hbWVdID0gZW50cnlSb3V0ZS5zcGxpdCgnIycpO1xuICAgICAgY29uc3QgcmVzb2x2ZWRNb2R1bGUgPVxuICAgICAgICAgIHJlc29sdmVNb2R1bGVOYW1lKGVudHJ5UGF0aCwgY29udGFpbmluZ0ZpbGUsIHRoaXMub3B0aW9ucywgdGhpcy5hZGFwdGVyLCBudWxsKTtcblxuICAgICAgaWYgKHJlc29sdmVkTW9kdWxlKSB7XG4gICAgICAgIGVudHJ5Um91dGUgPSBlbnRyeVBvaW50S2V5Rm9yKHJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUsIG1vZHVsZU5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIHJldHVybiBjb21waWxhdGlvbi5yb3V0ZUFuYWx5emVyLmxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZldGNoIHRyYW5zZm9ybWVycyBhbmQgb3RoZXIgaW5mb3JtYXRpb24gd2hpY2ggaXMgbmVjZXNzYXJ5IGZvciBhIGNvbnN1bWVyIHRvIGBlbWl0YCB0aGVcbiAgICogcHJvZ3JhbSB3aXRoIEFuZ3VsYXItYWRkZWQgZGVmaW5pdGlvbnMuXG4gICAqL1xuICBwcmVwYXJlRW1pdCgpOiB7XG4gICAgdHJhbnNmb3JtZXJzOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnMsXG4gIH0ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgY29uc3QgY29yZUltcG9ydHNGcm9tID0gY29tcGlsYXRpb24uaXNDb3JlID8gZ2V0UjNTeW1ib2xzRmlsZSh0aGlzLmlucHV0UHJvZ3JhbSkgOiBudWxsO1xuICAgIGxldCBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXI7XG4gICAgaWYgKGNvcmVJbXBvcnRzRnJvbSAhPT0gbnVsbCkge1xuICAgICAgaW1wb3J0UmV3cml0ZXIgPSBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIoY29yZUltcG9ydHNGcm9tLmZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW1wb3J0UmV3cml0ZXIgPSBuZXcgTm9vcEltcG9ydFJld3JpdGVyKCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGVmYXVsdEltcG9ydFRyYWNrZXIgPSBuZXcgRGVmYXVsdEltcG9ydFRyYWNrZXIoKTtcblxuICAgIGNvbnN0IGJlZm9yZSA9IFtcbiAgICAgIGl2eVRyYW5zZm9ybUZhY3RvcnkoXG4gICAgICAgICAgY29tcGlsYXRpb24udHJhaXRDb21waWxlciwgY29tcGlsYXRpb24ucmVmbGVjdG9yLCBpbXBvcnRSZXdyaXRlciwgZGVmYXVsdEltcG9ydFRyYWNrZXIsXG4gICAgICAgICAgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLCBjb21waWxhdGlvbi5pc0NvcmUsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCksXG4gICAgICBhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24udHJhaXRDb21waWxlci5leHBvcnRTdGF0ZW1lbnRzKSxcbiAgICAgIGRlZmF1bHRJbXBvcnRUcmFja2VyLmltcG9ydFByZXNlcnZpbmdUcmFuc2Zvcm1lcigpLFxuICAgIF07XG5cbiAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uczogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+W10gPSBbXTtcbiAgICBpZiAoY29tcGlsYXRpb24uZHRzVHJhbnNmb3JtcyAhPT0gbnVsbCkge1xuICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnMucHVzaChcbiAgICAgICAgICBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24uZHRzVHJhbnNmb3JtcywgaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IGFkZCBhbGlhc2luZyByZS1leHBvcnRzIHRvIHRoZSAuZC50cyBvdXRwdXQgaWYgdGhlIGBBbGlhc2luZ0hvc3RgIHJlcXVlc3RzIGl0LlxuICAgIGlmIChjb21waWxhdGlvbi5hbGlhc2luZ0hvc3QgIT09IG51bGwgJiYgY29tcGlsYXRpb24uYWxpYXNpbmdIb3N0LmFsaWFzRXhwb3J0c0luRHRzKSB7XG4gICAgICBhZnRlckRlY2xhcmF0aW9ucy5wdXNoKGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmV4cG9ydFN0YXRlbWVudHMpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5hZGFwdGVyLmZhY3RvcnlUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICBiZWZvcmUucHVzaChcbiAgICAgICAgICBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtKHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlci5zb3VyY2VJbmZvLCBpbXBvcnRSZXdyaXRlcikpO1xuICAgIH1cbiAgICBiZWZvcmUucHVzaChpdnlTd2l0Y2hUcmFuc2Zvcm0pO1xuXG4gICAgcmV0dXJuIHt0cmFuc2Zvcm1lcnM6IHtiZWZvcmUsIGFmdGVyRGVjbGFyYXRpb25zfSBhcyB0cy5DdXN0b21UcmFuc2Zvcm1lcnN9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1biB0aGUgaW5kZXhpbmcgcHJvY2VzcyBhbmQgcmV0dXJuIGEgYE1hcGAgb2YgYWxsIGluZGV4ZWQgY29tcG9uZW50cy5cbiAgICpcbiAgICogU2VlIHRoZSBgaW5kZXhpbmdgIHBhY2thZ2UgZm9yIG1vcmUgZGV0YWlscy5cbiAgICovXG4gIGdldEluZGV4ZWRDb21wb25lbnRzKCk6IE1hcDxEZWNsYXJhdGlvbk5vZGUsIEluZGV4ZWRDb21wb25lbnQ+IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBjb250ZXh0ID0gbmV3IEluZGV4aW5nQ29udGV4dCgpO1xuICAgIGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuaW5kZXgoY29udGV4dCk7XG4gICAgcmV0dXJuIGdlbmVyYXRlQW5hbHlzaXMoY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdCBpMThuIG1lc3NhZ2VzIGludG8gdGhlIGBYaTE4bkNvbnRleHRgLlxuICAgKi9cbiAgeGkxOG4oY3R4OiBYaTE4bkNvbnRleHQpOiB2b2lkIHtcbiAgICAvLyBOb3RlIHRoYXQgdGhlICdyZXNvbHZlJyBwaGFzZSBpcyBub3Qgc3RyaWN0bHkgbmVjZXNzYXJ5IGZvciB4aTE4biwgYnV0IHRoaXMgaXMgbm90IGN1cnJlbnRseVxuICAgIC8vIG9wdGltaXplZC5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLnhpMThuKGN0eCk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFuYWx5emVkKHRoaXM6IE5nQ29tcGlsZXIpOiBMYXp5Q29tcGlsYXRpb25TdGF0ZSB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHRoaXMuYW5hbHl6ZVN5bmMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsYXRpb24hO1xuICB9XG5cbiAgcHJpdmF0ZSBhbmFseXplU3luYygpOiB2b2lkIHtcbiAgICB0aGlzLnBlcmZSZWNvcmRlci5pblBoYXNlKFBlcmZQaGFzZS5BbmFseXNpcywgKCkgPT4ge1xuICAgICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG4gICAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMuaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmFuYWx5emVTeW5jKHNmKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIubWVtb3J5KFBlcmZDaGVja3BvaW50LkFuYWx5c2lzKTtcblxuICAgICAgdGhpcy5yZXNvbHZlQ29tcGlsYXRpb24odGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUNvbXBpbGF0aW9uKHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXIpOiB2b2lkIHtcbiAgICB0aGlzLnBlcmZSZWNvcmRlci5pblBoYXNlKFBlcmZQaGFzZS5SZXNvbHZlLCAoKSA9PiB7XG4gICAgICB0cmFpdENvbXBpbGVyLnJlc29sdmUoKTtcblxuICAgICAgLy8gQXQgdGhpcyBwb2ludCwgYW5hbHlzaXMgaXMgY29tcGxldGUgYW5kIHRoZSBjb21waWxlciBjYW4gbm93IGNhbGN1bGF0ZSB3aGljaCBmaWxlcyBuZWVkIHRvXG4gICAgICAvLyBiZSBlbWl0dGVkLCBzbyBkbyB0aGF0LlxuICAgICAgdGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnJlY29yZFN1Y2Nlc3NmdWxBbmFseXNpcyh0cmFpdENvbXBpbGVyKTtcblxuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIubWVtb3J5KFBlcmZDaGVja3BvaW50LlJlc29sdmUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgZnVsbFRlbXBsYXRlVHlwZUNoZWNrKCk6IGJvb2xlYW4ge1xuICAgIC8vIERldGVybWluZSB0aGUgc3RyaWN0bmVzcyBsZXZlbCBvZiB0eXBlIGNoZWNraW5nIGJhc2VkIG9uIGNvbXBpbGVyIG9wdGlvbnMuIEFzXG4gICAgLy8gYHN0cmljdFRlbXBsYXRlc2AgaXMgYSBzdXBlcnNldCBvZiBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCwgdGhlIGZvcm1lciBpbXBsaWVzIHRoZSBsYXR0ZXIuXG4gICAgLy8gQWxzbyBzZWUgYHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zYCB3aGVyZSBpdCBpcyB2ZXJpZmllZCB0aGF0IGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgXG4gICAgLy8gaXMgbm90IGRpc2FibGVkIHdoZW4gYHN0cmljdFRlbXBsYXRlc2AgaXMgZW5hYmxlZC5cbiAgICBjb25zdCBzdHJpY3RUZW1wbGF0ZXMgPSAhIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXM7XG4gICAgcmV0dXJuIHN0cmljdFRlbXBsYXRlcyB8fCAhIXRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2s7XG4gIH1cblxuICBwcml2YXRlIGdldFR5cGVDaGVja2luZ0NvbmZpZygpOiBUeXBlQ2hlY2tpbmdDb25maWcge1xuICAgIC8vIERldGVybWluZSB0aGUgc3RyaWN0bmVzcyBsZXZlbCBvZiB0eXBlIGNoZWNraW5nIGJhc2VkIG9uIGNvbXBpbGVyIG9wdGlvbnMuIEFzXG4gICAgLy8gYHN0cmljdFRlbXBsYXRlc2AgaXMgYSBzdXBlcnNldCBvZiBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCwgdGhlIGZvcm1lciBpbXBsaWVzIHRoZSBsYXR0ZXIuXG4gICAgLy8gQWxzbyBzZWUgYHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zYCB3aGVyZSBpdCBpcyB2ZXJpZmllZCB0aGF0IGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgXG4gICAgLy8gaXMgbm90IGRpc2FibGVkIHdoZW4gYHN0cmljdFRlbXBsYXRlc2AgaXMgZW5hYmxlZC5cbiAgICBjb25zdCBzdHJpY3RUZW1wbGF0ZXMgPSAhIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXM7XG5cbiAgICBjb25zdCB1c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzID0gdGhpcy5wcm9ncmFtRHJpdmVyLnN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucztcblxuICAgIC8vIEZpcnN0IHNlbGVjdCBhIHR5cGUtY2hlY2tpbmcgY29uZmlndXJhdGlvbiwgYmFzZWQgb24gd2hldGhlciBmdWxsIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgaXNcbiAgICAvLyByZXF1ZXN0ZWQuXG4gICAgbGV0IHR5cGVDaGVja2luZ0NvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnO1xuICAgIGlmICh0aGlzLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiB0cnVlLFxuICAgICAgICBhbHdheXNDaGVja1NjaGVtYUluVGVtcGxhdGVCb2RpZXM6IHRydWUsXG4gICAgICAgIGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBzdHJpY3ROdWxsSW5wdXRCaW5kaW5nczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1R5cGVPZkF0dHJpYnV0ZXM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgLy8gRXZlbiBpbiBmdWxsIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgbW9kZSwgRE9NIGJpbmRpbmcgY2hlY2tzIGFyZSBub3QgcXVpdGUgcmVhZHkgeWV0LlxuICAgICAgICBjaGVja1R5cGVPZkRvbUJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgLy8gQ2hlY2tpbmcgb2YgRE9NIGV2ZW50cyBjdXJyZW50bHkgaGFzIGFuIGFkdmVyc2UgZWZmZWN0IG9uIGRldmVsb3BlciBleHBlcmllbmNlLFxuICAgICAgICAvLyBlLmcuIGZvciBgPGlucHV0IChibHVyKT1cInVwZGF0ZSgkZXZlbnQudGFyZ2V0LnZhbHVlKVwiPmAgZW5hYmxpbmcgdGhpcyBjaGVjayByZXN1bHRzIGluOlxuICAgICAgICAvLyAtIGVycm9yIFRTMjUzMTogT2JqZWN0IGlzIHBvc3NpYmx5ICdudWxsJy5cbiAgICAgICAgLy8gLSBlcnJvciBUUzIzMzk6IFByb3BlcnR5ICd2YWx1ZScgZG9lcyBub3QgZXhpc3Qgb24gdHlwZSAnRXZlbnRUYXJnZXQnLlxuICAgICAgICBjaGVja1R5cGVPZkRvbUV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgLy8gTm9uLURPTSByZWZlcmVuY2VzIGhhdmUgdGhlIGNvcnJlY3QgdHlwZSBpbiBWaWV3IEVuZ2luZSBzbyB0aGVyZSBpcyBubyBzdHJpY3RuZXNzIGZsYWcuXG4gICAgICAgIGNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlczogdHJ1ZSxcbiAgICAgICAgLy8gUGlwZXMgYXJlIGNoZWNrZWQgaW4gVmlldyBFbmdpbmUgc28gdGhlcmUgaXMgbm8gc3RyaWN0bmVzcyBmbGFnLlxuICAgICAgICBjaGVja1R5cGVPZlBpcGVzOiB0cnVlLFxuICAgICAgICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIHVzZUNvbnRleHRHZW5lcmljVHlwZTogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBzdHJpY3RMaXRlcmFsVHlwZXM6IHRydWUsXG4gICAgICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IHRoaXMuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgdXNlSW5saW5lVHlwZUNvbnN0cnVjdG9ycyxcbiAgICAgICAgLy8gV2FybmluZ3MgZm9yIHN1Ym9wdGltYWwgdHlwZSBpbmZlcmVuY2UgYXJlIG9ubHkgZW5hYmxlZCBpZiBpbiBMYW5ndWFnZSBTZXJ2aWNlIG1vZGVcbiAgICAgICAgLy8gKHByb3ZpZGluZyB0aGUgZnVsbCBUZW1wbGF0ZVR5cGVDaGVja2VyIEFQSSkgYW5kIGlmIHN0cmljdCBtb2RlIGlzIG5vdCBlbmFibGVkLiBJbiBzdHJpY3RcbiAgICAgICAgLy8gbW9kZSwgdGhlIHVzZXIgaXMgaW4gZnVsbCBjb250cm9sIG9mIHR5cGUgaW5mZXJlbmNlLlxuICAgICAgICBzdWdnZXN0aW9uc0ZvclN1Ym9wdGltYWxUeXBlSW5mZXJlbmNlOiB0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIgJiYgIXN0cmljdFRlbXBsYXRlcyxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IGZhbHNlLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiBmYWxzZSxcbiAgICAgICAgLy8gRW5hYmxlIGRlZXAgc2NoZW1hIGNoZWNraW5nIGluIFwiYmFzaWNcIiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUgb25seSBpZiBDbG9zdXJlXG4gICAgICAgIC8vIGNvbXBpbGF0aW9uIGlzIHJlcXVlc3RlZCwgd2hpY2ggaXMgYSBnb29kIHByb3h5IGZvciBcIm9ubHkgaW4gZ29vZ2xlM1wiLlxuICAgICAgICBhbHdheXNDaGVja1NjaGVtYUluVGVtcGxhdGVCb2RpZXM6IHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkF0dHJpYnV0ZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbUJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tRXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogZmFsc2UsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IGZhbHNlLFxuICAgICAgICB1c2VDb250ZXh0R2VuZXJpY1R5cGU6IGZhbHNlLFxuICAgICAgICBzdHJpY3RMaXRlcmFsVHlwZXM6IGZhbHNlLFxuICAgICAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiB0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgIHVzZUlubGluZVR5cGVDb25zdHJ1Y3RvcnMsXG4gICAgICAgIC8vIEluIFwiYmFzaWNcIiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIG5vIHdhcm5pbmdzIGFyZSBwcm9kdWNlZCBzaW5jZSBtb3N0IHRoaW5ncyBhcmVcbiAgICAgICAgLy8gbm90IGNoZWNrZWQgYW55d2F5cy5cbiAgICAgICAgc3VnZ2VzdGlvbnNGb3JTdWJvcHRpbWFsVHlwZUluZmVyZW5jZTogZmFsc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEFwcGx5IGV4cGxpY2l0bHkgY29uZmlndXJlZCBzdHJpY3RuZXNzIGZsYWdzIG9uIHRvcCBvZiB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgLy8gYmFzZWQgb24gXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIi5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzID0gdGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRBY2Nlc3NNb2RpZmllcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmhvbm9yQWNjZXNzTW9kaWZpZXJzRm9ySW5wdXRCaW5kaW5ncyA9XG4gICAgICAgICAgdGhpcy5vcHRpb25zLnN0cmljdElucHV0QWNjZXNzTW9kaWZpZXJzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdE51bGxJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncyA9IHRoaXMub3B0aW9ucy5zdHJpY3ROdWxsSW5wdXRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZk91dHB1dEV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzO1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0RG9tRXZlbnRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZEb21FdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0RG9tRXZlbnRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzID0gdGhpcy5vcHRpb25zLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0RG9tTG9jYWxSZWZUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzID0gdGhpcy5vcHRpb25zLnN0cmljdERvbUxvY2FsUmVmVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0QXR0cmlidXRlVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mQXR0cmlidXRlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RBdHRyaWJ1dGVUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RDb250ZXh0R2VuZXJpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnVzZUNvbnRleHRHZW5lcmljVHlwZSA9IHRoaXMub3B0aW9ucy5zdHJpY3RDb250ZXh0R2VuZXJpY3M7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0TGl0ZXJhbFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3RMaXRlcmFsVHlwZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0TGl0ZXJhbFR5cGVzO1xuICAgIH1cblxuICAgIHJldHVybiB0eXBlQ2hlY2tpbmdDb25maWc7XG4gIH1cblxuICBwcml2YXRlIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICAvLyBHZXQgdGhlIGRpYWdub3N0aWNzLlxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMuaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSB8fCB0aGlzLmFkYXB0ZXIuaXNTaGltKHNmKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZGlhZ25vc3RpY3MucHVzaChcbiAgICAgICAgICAuLi5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yRmlsZShzZiwgT3B0aW1pemVGb3IuV2hvbGVQcm9ncmFtKSk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCk7XG4gICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsU3RhdGUodGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnN0YXRlLCBwcm9ncmFtKTtcbiAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljc0ZvckZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUsIG9wdGltaXplRm9yOiBPcHRpbWl6ZUZvcik6XG4gICAgICBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIC8vIEdldCB0aGUgZGlhZ25vc3RpY3MuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmICghc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIXRoaXMuYWRhcHRlci5pc1NoaW0oc2YpKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNvbXBpbGF0aW9uLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmLCBvcHRpbWl6ZUZvcikpO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpO1xuICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneS5zZXRJbmNyZW1lbnRhbFN0YXRlKHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5zdGF0ZSwgcHJvZ3JhbSk7XG4gICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIGdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBpZiAodGhpcy5ub25UZW1wbGF0ZURpYWdub3N0aWNzID09PSBudWxsKSB7XG4gICAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICAgIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcyA9IFsuLi5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmRpYWdub3N0aWNzXTtcbiAgICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwgJiYgY29tcGlsYXRpb24uZXhwb3J0UmVmZXJlbmNlR3JhcGggIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5ub25UZW1wbGF0ZURpYWdub3N0aWNzLnB1c2goLi4uY2hlY2tGb3JQcml2YXRlRXhwb3J0cyhcbiAgICAgICAgICAgIHRoaXMuZW50cnlQb2ludCwgdGhpcy5pbnB1dFByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgY29tcGlsYXRpb24uZXhwb3J0UmVmZXJlbmNlR3JhcGgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcztcbiAgfVxuXG4gIHByaXZhdGUgbWFrZUNvbXBpbGF0aW9uKCk6IExhenlDb21waWxhdGlvblN0YXRlIHtcbiAgICBjb25zdCBjaGVja2VyID0gdGhpcy5pbnB1dFByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICAgIGNvbnN0IHJlZmxlY3RvciA9IG5ldyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QoY2hlY2tlcik7XG5cbiAgICAvLyBDb25zdHJ1Y3QgdGhlIFJlZmVyZW5jZUVtaXR0ZXIuXG4gICAgbGV0IHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXI7XG4gICAgbGV0IGFsaWFzaW5nSG9zdDogQWxpYXNpbmdIb3N0fG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmFkYXB0ZXIudW5pZmllZE1vZHVsZXNIb3N0ID09PSBudWxsIHx8ICF0aGlzLm9wdGlvbnMuX3VzZUhvc3RGb3JJbXBvcnRHZW5lcmF0aW9uKSB7XG4gICAgICBsZXQgbG9jYWxJbXBvcnRTdHJhdGVneTogUmVmZXJlbmNlRW1pdFN0cmF0ZWd5O1xuXG4gICAgICAvLyBUaGUgc3RyYXRlZ3kgdXNlZCBmb3IgbG9jYWwsIGluLXByb2plY3QgaW1wb3J0cyBkZXBlbmRzIG9uIHdoZXRoZXIgVFMgaGFzIGJlZW4gY29uZmlndXJlZFxuICAgICAgLy8gd2l0aCByb290RGlycy4gSWYgc28sIHRoZW4gbXVsdGlwbGUgZGlyZWN0b3JpZXMgbWF5IGJlIG1hcHBlZCBpbiB0aGUgc2FtZSBcIm1vZHVsZVxuICAgICAgLy8gbmFtZXNwYWNlXCIgYW5kIHRoZSBsb2dpYyBvZiBgTG9naWNhbFByb2plY3RTdHJhdGVneWAgaXMgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgY29ycmVjdFxuICAgICAgLy8gaW1wb3J0cyB3aGljaCBtYXkgY3Jvc3MgdGhlc2UgbXVsdGlwbGUgZGlyZWN0b3JpZXMuIE90aGVyd2lzZSwgcGxhaW4gcmVsYXRpdmUgaW1wb3J0cyBhcmVcbiAgICAgIC8vIHN1ZmZpY2llbnQuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnJvb3REaXIgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgICh0aGlzLm9wdGlvbnMucm9vdERpcnMgIT09IHVuZGVmaW5lZCAmJiB0aGlzLm9wdGlvbnMucm9vdERpcnMubGVuZ3RoID4gMCkpIHtcbiAgICAgICAgLy8gcm9vdERpcnMgbG9naWMgaXMgaW4gZWZmZWN0IC0gdXNlIHRoZSBgTG9naWNhbFByb2plY3RTdHJhdGVneWAgZm9yIGluLXByb2plY3QgcmVsYXRpdmVcbiAgICAgICAgLy8gaW1wb3J0cy5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSA9IG5ldyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5KFxuICAgICAgICAgICAgcmVmbGVjdG9yLCBuZXcgTG9naWNhbEZpbGVTeXN0ZW0oWy4uLnRoaXMuYWRhcHRlci5yb290RGlyc10sIHRoaXMuYWRhcHRlcikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gUGxhaW4gcmVsYXRpdmUgaW1wb3J0cyBhcmUgYWxsIHRoYXQncyBuZWVkZWQuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3kgPSBuZXcgUmVsYXRpdmVQYXRoU3RyYXRlZ3kocmVmbGVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBkb2Vzbid0IGhhdmUgZmlsZU5hbWVUb01vZHVsZU5hbWUsIHNvIGJ1aWxkIGFuIE5QTS1jZW50cmljIHJlZmVyZW5jZVxuICAgICAgLy8gcmVzb2x1dGlvbiBzdHJhdGVneS5cbiAgICAgIHJlZkVtaXR0ZXIgPSBuZXcgUmVmZXJlbmNlRW1pdHRlcihbXG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gdXNlIGxvY2FsIGlkZW50aWZpZXJzIGlmIGF2YWlsYWJsZS5cbiAgICAgICAgbmV3IExvY2FsSWRlbnRpZmllclN0cmF0ZWd5KCksXG4gICAgICAgIC8vIE5leHQsIGF0dGVtcHQgdG8gdXNlIGFuIGFic29sdXRlIGltcG9ydC5cbiAgICAgICAgbmV3IEFic29sdXRlTW9kdWxlU3RyYXRlZ3kodGhpcy5pbnB1dFByb2dyYW0sIGNoZWNrZXIsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHJlZmxlY3RvciksXG4gICAgICAgIC8vIEZpbmFsbHksIGNoZWNrIGlmIHRoZSByZWZlcmVuY2UgaXMgYmVpbmcgd3JpdHRlbiBpbnRvIGEgZmlsZSB3aXRoaW4gdGhlIHByb2plY3QncyAudHNcbiAgICAgICAgLy8gc291cmNlcywgYW5kIHVzZSBhIHJlbGF0aXZlIGltcG9ydCBpZiBzby4gSWYgdGhpcyBmYWlscywgUmVmZXJlbmNlRW1pdHRlciB3aWxsIHRocm93XG4gICAgICAgIC8vIGFuIGVycm9yLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5LFxuICAgICAgXSk7XG5cbiAgICAgIC8vIElmIGFuIGVudHJ5cG9pbnQgaXMgcHJlc2VudCwgdGhlbiBhbGwgdXNlciBpbXBvcnRzIHNob3VsZCBiZSBkaXJlY3RlZCB0aHJvdWdoIHRoZVxuICAgICAgLy8gZW50cnlwb2ludCBhbmQgcHJpdmF0ZSBleHBvcnRzIGFyZSBub3QgbmVlZGVkLiBUaGUgY29tcGlsZXIgd2lsbCB2YWxpZGF0ZSB0aGF0IGFsbCBwdWJsaWNseVxuICAgICAgLy8gdmlzaWJsZSBkaXJlY3RpdmVzL3BpcGVzIGFyZSBpbXBvcnRhYmxlIHZpYSB0aGlzIGVudHJ5cG9pbnQuXG4gICAgICBpZiAodGhpcy5lbnRyeVBvaW50ID09PSBudWxsICYmIHRoaXMub3B0aW9ucy5nZW5lcmF0ZURlZXBSZWV4cG9ydHMgPT09IHRydWUpIHtcbiAgICAgICAgLy8gTm8gZW50cnlwb2ludCBpcyBwcmVzZW50IGFuZCBkZWVwIHJlLWV4cG9ydHMgd2VyZSByZXF1ZXN0ZWQsIHNvIGNvbmZpZ3VyZSB0aGUgYWxpYXNpbmdcbiAgICAgICAgLy8gc3lzdGVtIHRvIGdlbmVyYXRlIHRoZW0uXG4gICAgICAgIGFsaWFzaW5nSG9zdCA9IG5ldyBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0KHJlZmxlY3Rvcik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBDb21waWxlckhvc3Qgc3VwcG9ydHMgZmlsZU5hbWVUb01vZHVsZU5hbWUsIHNvIHVzZSB0aGF0IHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgIHJlZkVtaXR0ZXIgPSBuZXcgUmVmZXJlbmNlRW1pdHRlcihbXG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gdXNlIGxvY2FsIGlkZW50aWZpZXJzIGlmIGF2YWlsYWJsZS5cbiAgICAgICAgbmV3IExvY2FsSWRlbnRpZmllclN0cmF0ZWd5KCksXG4gICAgICAgIC8vIFRoZW4gdXNlIGFsaWFzZWQgcmVmZXJlbmNlcyAodGhpcyBpcyBhIHdvcmthcm91bmQgdG8gU3RyaWN0RGVwcyBjaGVja3MpLlxuICAgICAgICBuZXcgQWxpYXNTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBmaWxlTmFtZVRvTW9kdWxlTmFtZSB0byBlbWl0IGltcG9ydHMuXG4gICAgICAgIG5ldyBVbmlmaWVkTW9kdWxlc1N0cmF0ZWd5KHJlZmxlY3RvciwgdGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCksXG4gICAgICBdKTtcbiAgICAgIGFsaWFzaW5nSG9zdCA9IG5ldyBVbmlmaWVkTW9kdWxlc0FsaWFzaW5nSG9zdCh0aGlzLmFkYXB0ZXIudW5pZmllZE1vZHVsZXNIb3N0KTtcbiAgICB9XG5cbiAgICBjb25zdCBldmFsdWF0b3IgPVxuICAgICAgICBuZXcgUGFydGlhbEV2YWx1YXRvcihyZWZsZWN0b3IsIGNoZWNrZXIsIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5kZXBHcmFwaCk7XG4gICAgY29uc3QgZHRzUmVhZGVyID0gbmV3IER0c01ldGFkYXRhUmVhZGVyKGNoZWNrZXIsIHJlZmxlY3Rvcik7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVnaXN0cnkgPSBuZXcgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlciA9IGxvY2FsTWV0YVJlZ2lzdHJ5O1xuICAgIGNvbnN0IGRlcFNjb3BlUmVhZGVyID0gbmV3IE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcihkdHNSZWFkZXIsIGFsaWFzaW5nSG9zdCk7XG4gICAgY29uc3Qgc2NvcGVSZWdpc3RyeSA9XG4gICAgICAgIG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkobG9jYWxNZXRhUmVhZGVyLCBkZXBTY29wZVJlYWRlciwgcmVmRW1pdHRlciwgYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIgPSBzY29wZVJlZ2lzdHJ5O1xuICAgIGNvbnN0IHNlbWFudGljRGVwR3JhcGhVcGRhdGVyID0gdGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyO1xuICAgIGNvbnN0IG1ldGFSZWdpc3RyeSA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnkoW2xvY2FsTWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5XSk7XG4gICAgY29uc3QgaW5qZWN0YWJsZVJlZ2lzdHJ5ID0gbmV3IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5KHJlZmxlY3Rvcik7XG5cbiAgICBjb25zdCBtZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW2xvY2FsTWV0YVJlYWRlciwgZHRzUmVhZGVyXSk7XG4gICAgY29uc3QgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSA9IG5ldyBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5KHNjb3BlUmVhZGVyLCBtZXRhUmVhZGVyKTtcblxuXG4gICAgLy8gSWYgYSBmbGF0IG1vZHVsZSBlbnRyeXBvaW50IHdhcyBzcGVjaWZpZWQsIHRoZW4gdHJhY2sgcmVmZXJlbmNlcyB2aWEgYSBgUmVmZXJlbmNlR3JhcGhgIGluXG4gICAgLy8gb3JkZXIgdG8gcHJvZHVjZSBwcm9wZXIgZGlhZ25vc3RpY3MgZm9yIGluY29ycmVjdGx5IGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMvZXRjLiBJZiB0aGVyZVxuICAgIC8vIGlzIG5vIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgdGhlbiBkb24ndCBwYXkgdGhlIGNvc3Qgb2YgdHJhY2tpbmcgcmVmZXJlbmNlcy5cbiAgICBsZXQgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBSZWZlcmVuY2VzUmVnaXN0cnk7XG4gICAgbGV0IGV4cG9ydFJlZmVyZW5jZUdyYXBoOiBSZWZlcmVuY2VHcmFwaHxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsKSB7XG4gICAgICBleHBvcnRSZWZlcmVuY2VHcmFwaCA9IG5ldyBSZWZlcmVuY2VHcmFwaCgpO1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IFJlZmVyZW5jZUdyYXBoQWRhcHRlcihleHBvcnRSZWZlcmVuY2VHcmFwaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5KCk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm91dGVBbmFseXplciA9IG5ldyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIodGhpcy5tb2R1bGVSZXNvbHZlciwgZXZhbHVhdG9yKTtcblxuICAgIGNvbnN0IGR0c1RyYW5zZm9ybXMgPSBuZXcgRHRzVHJhbnNmb3JtUmVnaXN0cnkoKTtcblxuICAgIGNvbnN0IGlzQ29yZSA9IGlzQW5ndWxhckNvcmVQYWNrYWdlKHRoaXMuaW5wdXRQcm9ncmFtKTtcblxuICAgIGNvbnN0IHJlc291cmNlUmVnaXN0cnkgPSBuZXcgUmVzb3VyY2VSZWdpc3RyeSgpO1xuXG4gICAgY29uc3QgY29tcGlsYXRpb25Nb2RlID1cbiAgICAgICAgdGhpcy5vcHRpb25zLmNvbXBpbGF0aW9uTW9kZSA9PT0gJ3BhcnRpYWwnID8gQ29tcGlsYXRpb25Nb2RlLlBBUlRJQUwgOiBDb21waWxhdGlvbk1vZGUuRlVMTDtcblxuICAgIC8vIEN5Y2xlcyBhcmUgaGFuZGxlZCBpbiBmdWxsIGNvbXBpbGF0aW9uIG1vZGUgYnkgXCJyZW1vdGUgc2NvcGluZ1wiLlxuICAgIC8vIFwiUmVtb3RlIHNjb3BpbmdcIiBkb2VzIG5vdCB3b3JrIHdlbGwgd2l0aCB0cmVlIHNoYWtpbmcgZm9yIGxpYnJhcmllcy5cbiAgICAvLyBTbyBpbiBwYXJ0aWFsIGNvbXBpbGF0aW9uIG1vZGUsIHdoZW4gYnVpbGRpbmcgYSBsaWJyYXJ5LCBhIGN5Y2xlIHdpbGwgY2F1c2UgYW4gZXJyb3IuXG4gICAgY29uc3QgY3ljbGVIYW5kbGluZ1N0cmF0ZWd5ID0gY29tcGlsYXRpb25Nb2RlID09PSBDb21waWxhdGlvbk1vZGUuRlVMTCA/XG4gICAgICAgIEN5Y2xlSGFuZGxpbmdTdHJhdGVneS5Vc2VSZW1vdGVTY29waW5nIDpcbiAgICAgICAgQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LkVycm9yO1xuXG4gICAgLy8gU2V0IHVwIHRoZSBJdnlDb21waWxhdGlvbiwgd2hpY2ggbWFuYWdlcyBzdGF0ZSBmb3IgdGhlIEl2eSB0cmFuc2Zvcm1lci5cbiAgICBjb25zdCBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbHxudWxsLCB1bmtub3duPltdID0gW1xuICAgICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgbWV0YVJlYWRlciwgc2NvcGVSZWFkZXIsIHNjb3BlUmVnaXN0cnksXG4gICAgICAgICAgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSwgcmVzb3VyY2VSZWdpc3RyeSwgaXNDb3JlLCB0aGlzLnJlc291cmNlTWFuYWdlcixcbiAgICAgICAgICB0aGlzLmFkYXB0ZXIucm9vdERpcnMsIHRoaXMub3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzIHx8IGZhbHNlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHMgIT09IGZhbHNlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ICE9PSBmYWxzZSwgdGhpcy51c2VQb2lzb25lZERhdGEsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcywgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5jeWNsZUFuYWx5emVyLFxuICAgICAgICAgIGN5Y2xlSGFuZGxpbmdTdHJhdGVneSwgcmVmRW1pdHRlciwgdGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLmRlcEdyYXBoLFxuICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSwgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpLFxuXG4gICAgICAvLyBUT0RPKGFseGh1Yik6IHVuZGVyc3RhbmQgd2h5IHRoZSBjYXN0IGhlcmUgaXMgbmVjZXNzYXJ5IChzb21ldGhpbmcgdG8gZG8gd2l0aCBgbnVsbGBcbiAgICAgIC8vIG5vdCBiZWluZyBhc3NpZ25hYmxlIHRvIGB1bmtub3duYCB3aGVuIHdyYXBwZWQgaW4gYFJlYWRvbmx5YCkuXG4gICAgICAvLyBjbGFuZy1mb3JtYXQgb2ZmXG4gICAgICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgbWV0YVJlYWRlcixcbiAgICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSwgaXNDb3JlLCBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcixcbiAgICAgICAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsIC8qKiBjb21waWxlVW5kZWNvcmF0ZWRDbGFzc2VzV2l0aEFuZ3VsYXJGZWF0dXJlcyAqLyBmYWxzZSxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIsXG4gICAgICAgICkgYXMgUmVhZG9ubHk8RGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbCB8IG51bGwsdW5rbm93bj4+LFxuICAgICAgLy8gY2xhbmctZm9ybWF0IG9uXG4gICAgICAvLyBQaXBlIGhhbmRsZXIgbXVzdCBiZSBiZWZvcmUgaW5qZWN0YWJsZSBoYW5kbGVyIGluIGxpc3Qgc28gcGlwZSBmYWN0b3JpZXMgYXJlIHByaW50ZWRcbiAgICAgIC8vIGJlZm9yZSBpbmplY3RhYmxlIGZhY3RvcmllcyAoc28gaW5qZWN0YWJsZSBmYWN0b3JpZXMgY2FuIGRlbGVnYXRlIHRvIHRoZW0pXG4gICAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBpc0NvcmUsXG4gICAgICAgICAgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyKSxcbiAgICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGlzQ29yZSwgdGhpcy5vcHRpb25zLnN0cmljdEluamVjdGlvblBhcmFtZXRlcnMgfHwgZmFsc2UsIGluamVjdGFibGVSZWdpc3RyeSxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpLFxuICAgICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlYWRlciwgbWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LCByZWZlcmVuY2VzUmVnaXN0cnksIGlzQ29yZSxcbiAgICAgICAgICByb3V0ZUFuYWx5emVyLCByZWZFbWl0dGVyLCB0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgICBpbmplY3RhYmxlUmVnaXN0cnksIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgdGhpcy5vcHRpb25zLmkxOG5JbkxvY2FsZSksXG4gICAgXTtcblxuICAgIGNvbnN0IHRyYWl0Q29tcGlsZXIgPSBuZXcgVHJhaXRDb21waWxlcihcbiAgICAgICAgaGFuZGxlcnMsIHJlZmxlY3RvciwgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLCB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24sXG4gICAgICAgIHRoaXMub3B0aW9ucy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICE9PSBmYWxzZSwgY29tcGlsYXRpb25Nb2RlLCBkdHNUcmFuc2Zvcm1zLFxuICAgICAgICBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcik7XG5cbiAgICAvLyBUZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1heSB1c2UgdGhlIGBQcm9ncmFtRHJpdmVyYCB0byBwcm9kdWNlIG5ldyBgdHMuUHJvZ3JhbWAocykuIElmIHRoaXNcbiAgICAvLyBoYXBwZW5zLCB0aGV5IG5lZWQgdG8gYmUgdHJhY2tlZCBieSB0aGUgYE5nQ29tcGlsZXJgLlxuICAgIGNvbnN0IG5vdGlmeWluZ0RyaXZlciA9XG4gICAgICAgIG5ldyBOb3RpZnlpbmdQcm9ncmFtRHJpdmVyV3JhcHBlcih0aGlzLnByb2dyYW1Ecml2ZXIsIChwcm9ncmFtOiB0cy5Qcm9ncmFtKSA9PiB7XG4gICAgICAgICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsU3RhdGUodGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnN0YXRlLCBwcm9ncmFtKTtcbiAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gcHJvZ3JhbTtcbiAgICAgICAgfSk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gbmV3IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsKFxuICAgICAgICB0aGlzLmlucHV0UHJvZ3JhbSwgbm90aWZ5aW5nRHJpdmVyLCB0cmFpdENvbXBpbGVyLCB0aGlzLmdldFR5cGVDaGVja2luZ0NvbmZpZygpLCByZWZFbWl0dGVyLFxuICAgICAgICByZWZsZWN0b3IsIHRoaXMuYWRhcHRlciwgdGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLCBzY29wZVJlZ2lzdHJ5LCB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlzQ29yZSxcbiAgICAgIHRyYWl0Q29tcGlsZXIsXG4gICAgICByZWZsZWN0b3IsXG4gICAgICBzY29wZVJlZ2lzdHJ5LFxuICAgICAgZHRzVHJhbnNmb3JtcyxcbiAgICAgIGV4cG9ydFJlZmVyZW5jZUdyYXBoLFxuICAgICAgcm91dGVBbmFseXplcixcbiAgICAgIG1ldGFSZWFkZXIsXG4gICAgICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgYWxpYXNpbmdIb3N0LFxuICAgICAgcmVmRW1pdHRlcixcbiAgICAgIHRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICByZXNvdXJjZVJlZ2lzdHJ5LFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgdGhlIGdpdmVuIGBQcm9ncmFtYCBpcyBAYW5ndWxhci9jb3JlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVBhY2thZ2UocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IGJvb2xlYW4ge1xuICAvLyBMb29rIGZvciBpdHNfanVzdF9hbmd1bGFyLnRzIHNvbWV3aGVyZSBpbiB0aGUgcHJvZ3JhbS5cbiAgY29uc3QgcjNTeW1ib2xzID0gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtKTtcbiAgaWYgKHIzU3ltYm9scyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIExvb2sgZm9yIHRoZSBjb25zdGFudCBJVFNfSlVTVF9BTkdVTEFSIGluIHRoYXQgZmlsZS5cbiAgcmV0dXJuIHIzU3ltYm9scy5zdGF0ZW1lbnRzLnNvbWUoc3RtdCA9PiB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBtdXN0IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gc3RhdGVtZW50LlxuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGJlIGV4cG9ydGVkLlxuICAgIGlmIChzdG10Lm1vZGlmaWVycyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICFzdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGRlY2xhcmUgSVRTX0pVU1RfQU5HVUxBUi5cbiAgICByZXR1cm4gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLnNvbWUoZGVjbCA9PiB7XG4gICAgICAvLyBUaGUgZGVjbGFyYXRpb24gbXVzdCBtYXRjaCB0aGUgbmFtZS5cbiAgICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkgfHwgZGVjbC5uYW1lLnRleHQgIT09ICdJVFNfSlVTVF9BTkdVTEFSJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBJdCBtdXN0IGluaXRpYWxpemUgdGhlIHZhcmlhYmxlIHRvIHRydWUuXG4gICAgICBpZiAoZGVjbC5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkIHx8IGRlY2wuaW5pdGlhbGl6ZXIua2luZCAhPT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGRlZmluaXRpb24gbWF0Y2hlcy5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSAncjNfc3ltYm9scy50cycgZmlsZSBpbiB0aGUgZ2l2ZW4gYFByb2dyYW1gLCBvciByZXR1cm4gYG51bGxgIGlmIGl0IHdhc24ndCB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maW5kKGZpbGUgPT4gZmlsZS5maWxlTmFtZS5pbmRleE9mKCdyM19zeW1ib2xzLnRzJykgPj0gMCkgfHwgbnVsbDtcbn1cblxuLyoqXG4gKiBTaW5jZSBcInN0cmljdFRlbXBsYXRlc1wiIGlzIGEgdHJ1ZSBzdXBlcnNldCBvZiB0eXBlIGNoZWNraW5nIGNhcGFiaWxpdGllcyBjb21wYXJlZCB0b1xuICogXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiwgaXQgaXMgcmVxdWlyZWQgdGhhdCB0aGUgbGF0dGVyIGlzIG5vdCBleHBsaWNpdGx5IGRpc2FibGVkIGlmIHRoZVxuICogZm9ybWVyIGlzIGVuYWJsZWQuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zKG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zKTogdHMuRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKG9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrID09PSBmYWxzZSAmJiBvcHRpb25zLnN0cmljdFRlbXBsYXRlcyA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLkNPTkZJR19TVFJJQ1RfVEVNUExBVEVTX0lNUExJRVNfRlVMTF9URU1QTEFURV9UWVBFQ0hFQ0spLFxuICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgc3RhcnQ6IHVuZGVmaW5lZCxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgYEFuZ3VsYXIgY29tcGlsZXIgb3B0aW9uIFwic3RyaWN0VGVtcGxhdGVzXCIgaXMgZW5hYmxlZCwgaG93ZXZlciBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIGRpc2FibGVkLlxuXG5IYXZpbmcgdGhlIFwic3RyaWN0VGVtcGxhdGVzXCIgZmxhZyBlbmFibGVkIGltcGxpZXMgdGhhdCBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIGFsc28gZW5hYmxlZCwgc29cbnRoZSBsYXR0ZXIgY2FuIG5vdCBiZSBleHBsaWNpdGx5IGRpc2FibGVkLlxuXG5PbmUgb2YgdGhlIGZvbGxvd2luZyBhY3Rpb25zIGlzIHJlcXVpcmVkOlxuMS4gUmVtb3ZlIHRoZSBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIG9wdGlvbi5cbjIuIFJlbW92ZSBcInN0cmljdFRlbXBsYXRlc1wiIG9yIHNldCBpdCB0byAnZmFsc2UnLlxuXG5Nb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB0ZW1wbGF0ZSB0eXBlIGNoZWNraW5nIGNvbXBpbGVyIG9wdGlvbnMgY2FuIGJlIGZvdW5kIGluIHRoZSBkb2N1bWVudGF0aW9uOlxuaHR0cHM6Ly92OS5hbmd1bGFyLmlvL2d1aWRlL3RlbXBsYXRlLXR5cGVjaGVjayN0ZW1wbGF0ZS10eXBlLWNoZWNraW5nYCxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmNsYXNzIFJlZmVyZW5jZUdyYXBoQWRhcHRlciBpbXBsZW1lbnRzIFJlZmVyZW5jZXNSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZ3JhcGg6IFJlZmVyZW5jZUdyYXBoKSB7fVxuXG4gIGFkZChzb3VyY2U6IERlY2xhcmF0aW9uTm9kZSwgLi4ucmVmZXJlbmNlczogUmVmZXJlbmNlPERlY2xhcmF0aW9uTm9kZT5bXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qge25vZGV9IG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCBzb3VyY2VGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNvdXJjZUZpbGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IHJlY29yZCBsb2NhbCByZWZlcmVuY2VzIChub3QgcmVmZXJlbmNlcyBpbnRvIC5kLnRzIGZpbGVzKS5cbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQgfHwgIWlzRHRzUGF0aChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICB0aGlzLmdyYXBoLmFkZChzb3VyY2UsIG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBOb3RpZnlpbmdQcm9ncmFtRHJpdmVyV3JhcHBlciBpbXBsZW1lbnRzIFByb2dyYW1Ecml2ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZGVsZWdhdGU6IFByb2dyYW1Ecml2ZXIsIHByaXZhdGUgbm90aWZ5TmV3UHJvZ3JhbTogKHByb2dyYW06IHRzLlByb2dyYW0pID0+IHZvaWQpIHt9XG5cbiAgZ2V0IHN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucygpIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5zdXBwb3J0c0lubGluZU9wZXJhdGlvbnM7XG4gIH1cblxuICBnZXRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFByb2dyYW0oKTtcbiAgfVxuXG4gIHVwZGF0ZUZpbGVzKGNvbnRlbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVVcGRhdGU+LCB1cGRhdGVNb2RlOiBVcGRhdGVNb2RlKTogdm9pZCB7XG4gICAgdGhpcy5kZWxlZ2F0ZS51cGRhdGVGaWxlcyhjb250ZW50cywgdXBkYXRlTW9kZSk7XG4gICAgdGhpcy5ub3RpZnlOZXdQcm9ncmFtKHRoaXMuZGVsZWdhdGUuZ2V0UHJvZ3JhbSgpKTtcbiAgfVxuXG4gIGdldFNvdXJjZUZpbGVWZXJzaW9uID0gdGhpcy5kZWxlZ2F0ZS5nZXRTb3VyY2VGaWxlVmVyc2lvbj8uYmluZCh0aGlzKTtcbn1cblxuZnVuY3Rpb24gdmVyc2lvbk1hcEZyb21Qcm9ncmFtKFxuICAgIHByb2dyYW06IHRzLlByb2dyYW0sIGRyaXZlcjogUHJvZ3JhbURyaXZlcik6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPnxudWxsIHtcbiAgaWYgKGRyaXZlci5nZXRTb3VyY2VGaWxlVmVyc2lvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCB2ZXJzaW9ucyA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBwb3NzaWJseVJlZGlyZWN0ZWRTb3VyY2VGaWxlIG9mIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgIGNvbnN0IHNmID0gdG9VbnJlZGlyZWN0ZWRTb3VyY2VGaWxlKHBvc3NpYmx5UmVkaXJlY3RlZFNvdXJjZUZpbGUpO1xuICAgIHZlcnNpb25zLnNldChhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKSwgZHJpdmVyLmdldFNvdXJjZUZpbGVWZXJzaW9uKHNmKSk7XG4gIH1cbiAgcmV0dXJuIHZlcnNpb25zO1xufVxuIl19