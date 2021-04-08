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
    exports.isAngularCorePackage = exports.NgCompiler = exports.resourceChangeTicket = exports.incrementalFromDriverTicket = exports.incrementalFromCompilerTicket = exports.freshCompilationTicket = exports.CompilationTicketKind = void 0;
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
        var oldDriver = oldCompiler.incrementalStrategy.getIncrementalDriver(oldProgram);
        if (oldDriver === null) {
            // No incremental step is possible here, since no IncrementalDriver was found for the old
            // program.
            return freshCompilationTicket(newProgram, oldCompiler.options, incrementalBuildStrategy, programDriver, perfRecorder, oldCompiler.enableTemplateTypeChecker, oldCompiler.usePoisonedData);
        }
        if (perfRecorder === null) {
            perfRecorder = perf_1.ActivePerfRecorder.zeroedToNow();
        }
        var newDriver = incremental_1.IncrementalDriver.reconcile(oldProgram, oldDriver, newProgram, modifiedResourceFiles, perfRecorder);
        return {
            kind: CompilationTicketKind.IncrementalTypeScript,
            enableTemplateTypeChecker: oldCompiler.enableTemplateTypeChecker,
            usePoisonedData: oldCompiler.usePoisonedData,
            options: oldCompiler.options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            programDriver: programDriver,
            newDriver: newDriver,
            oldProgram: oldProgram,
            newProgram: newProgram,
            perfRecorder: perfRecorder,
        };
    }
    exports.incrementalFromCompilerTicket = incrementalFromCompilerTicket;
    /**
     * Create a `CompilationTicket` directly from an old `ts.Program` and associated Angular compilation
     * state, along with a new `ts.Program`.
     */
    function incrementalFromDriverTicket(oldProgram, oldDriver, newProgram, options, incrementalBuildStrategy, programDriver, modifiedResourceFiles, perfRecorder, enableTemplateTypeChecker, usePoisonedData) {
        if (perfRecorder === null) {
            perfRecorder = perf_1.ActivePerfRecorder.zeroedToNow();
        }
        var newDriver = incremental_1.IncrementalDriver.reconcile(oldProgram, oldDriver, newProgram, modifiedResourceFiles, perfRecorder);
        return {
            kind: CompilationTicketKind.IncrementalTypeScript,
            oldProgram: oldProgram,
            newProgram: newProgram,
            options: options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            newDriver: newDriver,
            programDriver: programDriver,
            enableTemplateTypeChecker: enableTemplateTypeChecker,
            usePoisonedData: usePoisonedData,
            perfRecorder: perfRecorder,
        };
    }
    exports.incrementalFromDriverTicket = incrementalFromDriverTicket;
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
        function NgCompiler(adapter, options, inputProgram, programDriver, incrementalStrategy, incrementalDriver, enableTemplateTypeChecker, usePoisonedData, livePerfRecorder) {
            var _a, e_1, _b;
            var _this = this;
            this.adapter = adapter;
            this.options = options;
            this.inputProgram = inputProgram;
            this.programDriver = programDriver;
            this.incrementalStrategy = incrementalStrategy;
            this.incrementalDriver = incrementalDriver;
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
            this.incrementalStrategy.setIncrementalDriver(this.incrementalDriver, inputProgram);
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
                    return new NgCompiler(adapter, ticket.options, ticket.tsProgram, ticket.programDriver, ticket.incrementalBuildStrategy, incremental_1.IncrementalDriver.fresh(ticket.tsProgram), ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
                case CompilationTicketKind.IncrementalTypeScript:
                    return new NgCompiler(adapter, ticket.options, ticket.newProgram, ticket.programDriver, ticket.incrementalBuildStrategy, ticket.newDriver, ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
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
            return this.incrementalDriver.depGraph.getResourceDependencies(file);
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
            var before = [
                transform_1.ivyTransformFactory(compilation.traitCompiler, compilation.reflector, importRewriter, compilation.defaultImportTracker, this.delegatingPerfRecorder, compilation.isCore, this.closureCompilerEnabled),
                transform_1.aliasTransformFactory(compilation.traitCompiler.exportStatements),
                compilation.defaultImportTracker.importPreservingTransformer(),
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
                _this.incrementalDriver.recordSuccessfulAnalysis(traitCompiler);
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
            this.incrementalStrategy.setIncrementalDriver(this.incrementalDriver, program);
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
            this.incrementalStrategy.setIncrementalDriver(this.incrementalDriver, program);
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
            var evaluator = new partial_evaluator_1.PartialEvaluator(reflector, checker, this.incrementalDriver.depGraph);
            var dtsReader = new metadata_1.DtsMetadataReader(checker, reflector);
            var localMetaRegistry = new metadata_1.LocalMetadataRegistry();
            var localMetaReader = localMetaRegistry;
            var depScopeReader = new scope_1.MetadataDtsModuleScopeResolver(dtsReader, aliasingHost);
            var scopeRegistry = new scope_1.LocalModuleScopeRegistry(localMetaReader, depScopeReader, refEmitter, aliasingHost);
            var scopeReader = scopeRegistry;
            var semanticDepGraphUpdater = this.incrementalDriver.getSemanticDepGraphUpdater();
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
            var defaultImportTracker = new imports_1.DefaultImportTracker();
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
                new annotations_1.ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, this.resourceManager, this.adapter.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.usePoisonedData, this.options.i18nNormalizeLineEndingsInICUs, this.moduleResolver, this.cycleAnalyzer, cycleHandlingStrategy, refEmitter, defaultImportTracker, this.incrementalDriver.depGraph, injectableRegistry, semanticDepGraphUpdater, this.closureCompilerEnabled, this.delegatingPerfRecorder),
                // TODO(alxhub): understand why the cast here is necessary (something to do with `null`
                // not being assignable to `unknown` when wrapped in `Readonly`).
                // clang-format off
                new annotations_1.DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, defaultImportTracker, injectableRegistry, isCore, semanticDepGraphUpdater, this.closureCompilerEnabled, config_1.compileUndecoratedClassesWithAngularFeatures, this.delegatingPerfRecorder),
                // clang-format on
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, defaultImportTracker, injectableRegistry, isCore, this.delegatingPerfRecorder),
                new annotations_1.InjectableDecoratorHandler(reflector, defaultImportTracker, isCore, this.options.strictInjectionParameters || false, injectableRegistry, this.delegatingPerfRecorder),
                new annotations_1.NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, this.adapter.factoryTracker, defaultImportTracker, this.closureCompilerEnabled, injectableRegistry, this.delegatingPerfRecorder, this.options.i18nInLocale),
            ];
            var traitCompiler = new transform_1.TraitCompiler(handlers, reflector, this.delegatingPerfRecorder, this.incrementalDriver, this.options.compileNonExportedClasses !== false, compilationMode, dtsTransforms, semanticDepGraphUpdater);
            // Template type-checking may use the `ProgramDriver` to produce new `ts.Program`(s). If this
            // happens, they need to be tracked by the `NgCompiler`.
            var notifyingDriver = new NotifyingProgramDriverWrapper(this.programDriver, function (program) {
                _this.incrementalStrategy.setIncrementalDriver(_this.incrementalDriver, program);
                _this.currentProgram = program;
            });
            var templateTypeChecker = new typecheck_1.TemplateTypeCheckerImpl(this.inputProgram, notifyingDriver, traitCompiler, this.getTypeCheckingConfig(), refEmitter, reflector, this.adapter, this.incrementalDriver, scopeRegistry, typeCheckScopeRegistry, this.delegatingPerfRecorder);
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
                defaultImportTracker: defaultImportTracker,
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
            this.delegate = delegate;
            this.notifyNewProgram = notifyNewProgram;
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsMkVBQStNO0lBQy9NLGlFQUErRTtJQUMvRSwyRUFBbUg7SUFDbkgsMkVBQXlFO0lBQ3pFLDJFQUE2RTtJQUM3RSxtRUFBK1g7SUFDL1gsMkVBQThFO0lBRTlFLG1FQUFrRjtJQUNsRixxRUFBeU07SUFDek0sMkZBQXFFO0lBQ3JFLHVGQUF5RDtJQUN6RCw2REFBNEc7SUFFNUcseUVBQW9HO0lBQ3BHLHFFQUFxRDtJQUNyRCxtRUFBc0U7SUFDdEUsK0RBQW1JO0lBQ25JLCtEQUFzRDtJQUN0RCxpRUFBZ0Q7SUFDaEQsdUVBQWdMO0lBQ2hMLHVFQUF3RDtJQUN4RCxxRUFBeUY7SUFDekYsa0ZBQTRGO0lBRzVGLDBFQUFzRTtJQTBCdEU7O09BRUc7SUFDSCxJQUFZLHFCQUlYO0lBSkQsV0FBWSxxQkFBcUI7UUFDL0IsbUVBQUssQ0FBQTtRQUNMLG1HQUFxQixDQUFBO1FBQ3JCLCtGQUFtQixDQUFBO0lBQ3JCLENBQUMsRUFKVyxxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQUloQztJQWlERDs7T0FFRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxTQUFxQixFQUFFLE9BQTBCLEVBQ2pELHdCQUFrRCxFQUFFLGFBQTRCLEVBQ2hGLFlBQXFDLEVBQUUseUJBQWtDLEVBQ3pFLGVBQXdCO1FBQzFCLE9BQU87WUFDTCxJQUFJLEVBQUUscUJBQXFCLENBQUMsS0FBSztZQUNqQyxTQUFTLFdBQUE7WUFDVCxPQUFPLFNBQUE7WUFDUCx3QkFBd0IsMEJBQUE7WUFDeEIsYUFBYSxlQUFBO1lBQ2IseUJBQXlCLDJCQUFBO1lB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aEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0gsb0NBQUM7SUFBRCxDQUFDLEFBaEJELElBZ0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7VHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vLi4vYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBDeWNsZUhhbmRsaW5nU3RyYXRlZ3ksIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi9jeWNsZXMnO1xuaW1wb3J0IHtDT01QSUxFUl9FUlJPUlNfV0lUSF9HVUlERVMsIEVSUk9SX0RFVEFJTFNfUEFHRV9CQVNFX1VSTCwgRXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjaGVja0ZvclByaXZhdGVFeHBvcnRzLCBSZWZlcmVuY2VHcmFwaH0gZnJvbSAnLi4vLi4vZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgTG9naWNhbEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgQWxpYXNpbmdIb3N0LCBBbGlhc1N0cmF0ZWd5LCBEZWZhdWx0SW1wb3J0VHJhY2tlciwgSW1wb3J0UmV3cml0ZXIsIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBNb2R1bGVSZXNvbHZlciwgTm9vcEltcG9ydFJld3JpdGVyLCBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0LCBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0U3RyYXRlZ3ksIFJlZmVyZW5jZUVtaXR0ZXIsIFJlbGF0aXZlUGF0aFN0cmF0ZWd5LCBVbmlmaWVkTW9kdWxlc0FsaWFzaW5nSG9zdCwgVW5pZmllZE1vZHVsZXNTdHJhdGVneX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGRTdHJhdGVneSwgSW5jcmVtZW50YWxEcml2ZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsJztcbmltcG9ydCB7U2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7Z2VuZXJhdGVBbmFseXNpcywgSW5kZXhlZENvbXBvbmVudCwgSW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7Q29tcG9uZW50UmVzb3VyY2VzLCBDb21wb3VuZE1ldGFkYXRhUmVhZGVyLCBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnksIER0c01ldGFkYXRhUmVhZGVyLCBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlciwgUmVzb3VyY2VSZWdpc3RyeX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzU2Nhbm5lcn0gZnJvbSAnLi4vLi4vbW9kdWxld2l0aHByb3ZpZGVycyc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7QWN0aXZlUGVyZlJlY29yZGVyLCBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyLCBQZXJmQ2hlY2twb2ludCwgUGVyZkV2ZW50LCBQZXJmUGhhc2V9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtQcm9ncmFtRHJpdmVyLCBVcGRhdGVNb2RlfSBmcm9tICcuLi8uLi9wcm9ncmFtX2RyaXZlcic7XG5pbXBvcnQge0RlY2xhcmF0aW9uTm9kZSwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0FkYXB0ZXJSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi4vLi4vcmVzb3VyY2UnO1xuaW1wb3J0IHtlbnRyeVBvaW50S2V5Rm9yLCBOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIsIFR5cGVDaGVja1Njb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7Z2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybX0gZnJvbSAnLi4vLi4vc2hpbXMnO1xuaW1wb3J0IHtpdnlTd2l0Y2hUcmFuc2Zvcm19IGZyb20gJy4uLy4uL3N3aXRjaCc7XG5pbXBvcnQge2FsaWFzVHJhbnNmb3JtRmFjdG9yeSwgQ29tcGlsYXRpb25Nb2RlLCBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnksIERlY29yYXRvckhhbmRsZXIsIER0c1RyYW5zZm9ybVJlZ2lzdHJ5LCBpdnlUcmFuc2Zvcm1GYWN0b3J5LCBUcmFpdENvbXBpbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtUZW1wbGF0ZVR5cGVDaGVja2VySW1wbH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7T3B0aW1pemVGb3IsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2luZ0NvbmZpZ30gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGVPck51bGwsIGlzRHRzUGF0aCwgcmVzb2x2ZU1vZHVsZU5hbWV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtMYXp5Um91dGUsIE5nQ29tcGlsZXJBZGFwdGVyLCBOZ0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtjb21waWxlVW5kZWNvcmF0ZWRDbGFzc2VzV2l0aEFuZ3VsYXJGZWF0dXJlc30gZnJvbSAnLi9jb25maWcnO1xuXG4vKipcbiAqIFN0YXRlIGluZm9ybWF0aW9uIGFib3V0IGEgY29tcGlsYXRpb24gd2hpY2ggaXMgb25seSBnZW5lcmF0ZWQgb25jZSBzb21lIGRhdGEgaXMgcmVxdWVzdGVkIGZyb21cbiAqIHRoZSBgTmdDb21waWxlcmAgKGZvciBleGFtcGxlLCBieSBjYWxsaW5nIGBnZXREaWFnbm9zdGljc2ApLlxuICovXG5pbnRlcmZhY2UgTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICBpc0NvcmU6IGJvb2xlYW47XG4gIHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXI7XG4gIHJlZmxlY3RvcjogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0O1xuICBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcjtcbiAgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5O1xuICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5OiBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5O1xuICBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbDtcbiAgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyO1xuICBkdHNUcmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1SZWdpc3RyeTtcbiAgbXdwU2Nhbm5lcjogTW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXI7XG4gIGRlZmF1bHRJbXBvcnRUcmFja2VyOiBEZWZhdWx0SW1wb3J0VHJhY2tlcjtcbiAgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbDtcbiAgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcjtcbiAgdGVtcGxhdGVUeXBlQ2hlY2tlcjogVGVtcGxhdGVUeXBlQ2hlY2tlcjtcbiAgcmVzb3VyY2VSZWdpc3RyeTogUmVzb3VyY2VSZWdpc3RyeTtcbn1cblxuXG5cbi8qKlxuICogRGlzY3JpbWluYW50IHR5cGUgZm9yIGEgYENvbXBpbGF0aW9uVGlja2V0YC5cbiAqL1xuZXhwb3J0IGVudW0gQ29tcGlsYXRpb25UaWNrZXRLaW5kIHtcbiAgRnJlc2gsXG4gIEluY3JlbWVudGFsVHlwZVNjcmlwdCxcbiAgSW5jcmVtZW50YWxSZXNvdXJjZSxcbn1cblxuLyoqXG4gKiBCZWdpbiBhbiBBbmd1bGFyIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiBmcm9tIHNjcmF0Y2guXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRnJlc2hDb21waWxhdGlvblRpY2tldCB7XG4gIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5GcmVzaDtcbiAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnM7XG4gIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5O1xuICBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyO1xuICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuO1xuICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW47XG4gIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXI7XG59XG5cbi8qKlxuICogQmVnaW4gYW4gQW5ndWxhciBjb21waWxhdGlvbiBvcGVyYXRpb24gdGhhdCBpbmNvcnBvcmF0ZXMgY2hhbmdlcyB0byBUeXBlU2NyaXB0IGNvZGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW5jcmVtZW50YWxUeXBlU2NyaXB0Q29tcGlsYXRpb25UaWNrZXQge1xuICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0O1xuICBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucztcbiAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k7XG4gIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXI7XG4gIG5ld0RyaXZlcjogSW5jcmVtZW50YWxEcml2ZXI7XG4gIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbjtcbiAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5jcmVtZW50YWxSZXNvdXJjZUNvbXBpbGF0aW9uVGlja2V0IHtcbiAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsUmVzb3VyY2U7XG4gIGNvbXBpbGVyOiBOZ0NvbXBpbGVyO1xuICBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+O1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuLyoqXG4gKiBBIHJlcXVlc3QgdG8gYmVnaW4gQW5ndWxhciBjb21waWxhdGlvbiwgZWl0aGVyIHN0YXJ0aW5nIGZyb20gc2NyYXRjaCBvciBmcm9tIGEga25vd24gcHJpb3Igc3RhdGUuXG4gKlxuICogYENvbXBpbGF0aW9uVGlja2V0YHMgYXJlIHVzZWQgdG8gaW5pdGlhbGl6ZSAob3IgdXBkYXRlKSBhbiBgTmdDb21waWxlcmAgaW5zdGFuY2UsIHRoZSBjb3JlIG9mIHRoZVxuICogQW5ndWxhciBjb21waWxlci4gVGhleSBhYnN0cmFjdCB0aGUgc3RhcnRpbmcgc3RhdGUgb2YgY29tcGlsYXRpb24gYW5kIGFsbG93IGBOZ0NvbXBpbGVyYCB0byBiZVxuICogbWFuYWdlZCBpbmRlcGVuZGVudGx5IG9mIGFueSBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiBsaWZlY3ljbGUuXG4gKi9cbmV4cG9ydCB0eXBlIENvbXBpbGF0aW9uVGlja2V0ID0gRnJlc2hDb21waWxhdGlvblRpY2tldHxJbmNyZW1lbnRhbFR5cGVTY3JpcHRDb21waWxhdGlvblRpY2tldHxcbiAgICBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQ7XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBmb3IgYSBicmFuZCBuZXcgY29tcGlsYXRpb24sIHVzaW5nIG5vIHByaW9yIHN0YXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJlc2hDb21waWxhdGlvblRpY2tldChcbiAgICB0c1Byb2dyYW06IHRzLlByb2dyYW0sIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyfG51bGwsIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW4sXG4gICAgdXNlUG9pc29uZWREYXRhOiBib29sZWFuKTogQ29tcGlsYXRpb25UaWNrZXQge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5GcmVzaCxcbiAgICB0c1Byb2dyYW0sXG4gICAgb3B0aW9ucyxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgcHJvZ3JhbURyaXZlcixcbiAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgIHVzZVBvaXNvbmVkRGF0YSxcbiAgICBwZXJmUmVjb3JkZXI6IHBlcmZSZWNvcmRlciA/PyBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKSxcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGFzIGVmZmljaWVudGx5IGFzIHBvc3NpYmxlLCBiYXNlZCBvbiBhIHByZXZpb3VzIGBOZ0NvbXBpbGVyYFxuICogaW5zdGFuY2UgYW5kIGEgbmV3IGB0cy5Qcm9ncmFtYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluY3JlbWVudGFsRnJvbUNvbXBpbGVyVGlja2V0KFxuICAgIG9sZENvbXBpbGVyOiBOZ0NvbXBpbGVyLCBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz4sIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyfG51bGwpOiBDb21waWxhdGlvblRpY2tldCB7XG4gIGNvbnN0IG9sZFByb2dyYW0gPSBvbGRDb21waWxlci5nZXRDdXJyZW50UHJvZ3JhbSgpO1xuICBjb25zdCBvbGREcml2ZXIgPSBvbGRDb21waWxlci5pbmNyZW1lbnRhbFN0cmF0ZWd5LmdldEluY3JlbWVudGFsRHJpdmVyKG9sZFByb2dyYW0pO1xuICBpZiAob2xkRHJpdmVyID09PSBudWxsKSB7XG4gICAgLy8gTm8gaW5jcmVtZW50YWwgc3RlcCBpcyBwb3NzaWJsZSBoZXJlLCBzaW5jZSBubyBJbmNyZW1lbnRhbERyaXZlciB3YXMgZm91bmQgZm9yIHRoZSBvbGRcbiAgICAvLyBwcm9ncmFtLlxuICAgIHJldHVybiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgICAgICBuZXdQcm9ncmFtLCBvbGRDb21waWxlci5vcHRpb25zLCBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXIsIHBlcmZSZWNvcmRlcixcbiAgICAgICAgb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciwgb2xkQ29tcGlsZXIudXNlUG9pc29uZWREYXRhKTtcbiAgfVxuXG4gIGlmIChwZXJmUmVjb3JkZXIgPT09IG51bGwpIHtcbiAgICBwZXJmUmVjb3JkZXIgPSBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKTtcbiAgfVxuXG4gIGNvbnN0IG5ld0RyaXZlciA9IEluY3JlbWVudGFsRHJpdmVyLnJlY29uY2lsZShcbiAgICAgIG9sZFByb2dyYW0sIG9sZERyaXZlciwgbmV3UHJvZ3JhbSwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzLCBwZXJmUmVjb3JkZXIpO1xuXG4gIHJldHVybiB7XG4gICAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsVHlwZVNjcmlwdCxcbiAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBvbGRDb21waWxlci5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgIHVzZVBvaXNvbmVkRGF0YTogb2xkQ29tcGlsZXIudXNlUG9pc29uZWREYXRhLFxuICAgIG9wdGlvbnM6IG9sZENvbXBpbGVyLm9wdGlvbnMsXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgIHByb2dyYW1Ecml2ZXIsXG4gICAgbmV3RHJpdmVyLFxuICAgIG9sZFByb2dyYW0sXG4gICAgbmV3UHJvZ3JhbSxcbiAgICBwZXJmUmVjb3JkZXIsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBkaXJlY3RseSBmcm9tIGFuIG9sZCBgdHMuUHJvZ3JhbWAgYW5kIGFzc29jaWF0ZWQgQW5ndWxhciBjb21waWxhdGlvblxuICogc3RhdGUsIGFsb25nIHdpdGggYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tRHJpdmVyVGlja2V0KFxuICAgIG9sZFByb2dyYW06IHRzLlByb2dyYW0sIG9sZERyaXZlcjogSW5jcmVtZW50YWxEcml2ZXIsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz4sXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXJ8bnVsbCwgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbixcbiAgICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4pOiBDb21waWxhdGlvblRpY2tldCB7XG4gIGlmIChwZXJmUmVjb3JkZXIgPT09IG51bGwpIHtcbiAgICBwZXJmUmVjb3JkZXIgPSBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKTtcbiAgfVxuICBjb25zdCBuZXdEcml2ZXIgPSBJbmNyZW1lbnRhbERyaXZlci5yZWNvbmNpbGUoXG4gICAgICBvbGRQcm9ncmFtLCBvbGREcml2ZXIsIG5ld1Byb2dyYW0sIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICAgIG9sZFByb2dyYW0sXG4gICAgbmV3UHJvZ3JhbSxcbiAgICBvcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBuZXdEcml2ZXIsXG4gICAgcHJvZ3JhbURyaXZlcixcbiAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgIHVzZVBvaXNvbmVkRGF0YSxcbiAgICBwZXJmUmVjb3JkZXIsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvdXJjZUNoYW5nZVRpY2tldChjb21waWxlcjogTmdDb21waWxlciwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8c3RyaW5nPik6XG4gICAgSW5jcmVtZW50YWxSZXNvdXJjZUNvbXBpbGF0aW9uVGlja2V0IHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZSxcbiAgICBjb21waWxlcixcbiAgICBtb2RpZmllZFJlc291cmNlRmlsZXMsXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKSxcbiAgfTtcbn1cblxuXG4vKipcbiAqIFRoZSBoZWFydCBvZiB0aGUgQW5ndWxhciBJdnkgY29tcGlsZXIuXG4gKlxuICogVGhlIGBOZ0NvbXBpbGVyYCBwcm92aWRlcyBhbiBBUEkgZm9yIHBlcmZvcm1pbmcgQW5ndWxhciBjb21waWxhdGlvbiB3aXRoaW4gYSBjdXN0b20gVHlwZVNjcmlwdFxuICogY29tcGlsZXIuIEVhY2ggaW5zdGFuY2Ugb2YgYE5nQ29tcGlsZXJgIHN1cHBvcnRzIGEgc2luZ2xlIGNvbXBpbGF0aW9uLCB3aGljaCBtaWdodCBiZVxuICogaW5jcmVtZW50YWwuXG4gKlxuICogYE5nQ29tcGlsZXJgIGlzIGxhenksIGFuZCBkb2VzIG5vdCBwZXJmb3JtIGFueSBvZiB0aGUgd29yayBvZiB0aGUgY29tcGlsYXRpb24gdW50aWwgb25lIG9mIGl0c1xuICogb3V0cHV0IG1ldGhvZHMgKGUuZy4gYGdldERpYWdub3N0aWNzYCkgaXMgY2FsbGVkLlxuICpcbiAqIFNlZSB0aGUgUkVBRE1FLm1kIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgTmdDb21waWxlciB7XG4gIC8qKlxuICAgKiBMYXppbHkgZXZhbHVhdGVkIHN0YXRlIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhpcyBpcyBjcmVhdGVkIG9uIGRlbWFuZCBieSBjYWxsaW5nIGBlbnN1cmVBbmFseXplZGAuXG4gICAqL1xuICBwcml2YXRlIGNvbXBpbGF0aW9uOiBMYXp5Q29tcGlsYXRpb25TdGF0ZXxudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogQW55IGRpYWdub3N0aWNzIHJlbGF0ZWQgdG8gdGhlIGNvbnN0cnVjdGlvbiBvZiB0aGUgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIFRoZXNlIGFyZSBkaWFnbm9zdGljcyB3aGljaCBhcm9zZSBkdXJpbmcgc2V0dXAgb2YgdGhlIGhvc3QgYW5kL29yIHByb2dyYW0uXG4gICAqL1xuICBwcml2YXRlIGNvbnN0cnVjdGlvbkRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAvKipcbiAgICogTm9uLXRlbXBsYXRlIGRpYWdub3N0aWNzIHJlbGF0ZWQgdG8gdGhlIHByb2dyYW0gaXRzZWxmLiBEb2VzIG5vdCBpbmNsdWRlIHRlbXBsYXRlXG4gICAqIGRpYWdub3N0aWNzIGJlY2F1c2UgdGhlIHRlbXBsYXRlIHR5cGUgY2hlY2tlciBtZW1vaXplcyB0aGVtIGl0c2VsZi5cbiAgICpcbiAgICogVGhpcyBpcyBzZXQgYnkgKGFuZCBtZW1vaXplcykgYGdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3NgLlxuICAgKi9cbiAgcHJpdmF0ZSBub25UZW1wbGF0ZURpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW118bnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBjbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGN1cnJlbnRQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIGVudHJ5UG9pbnQ6IHRzLlNvdXJjZUZpbGV8bnVsbDtcbiAgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXI7XG4gIHByaXZhdGUgcmVzb3VyY2VNYW5hZ2VyOiBBZGFwdGVyUmVzb3VyY2VMb2FkZXI7XG4gIHByaXZhdGUgY3ljbGVBbmFseXplcjogQ3ljbGVBbmFseXplcjtcbiAgcmVhZG9ubHkgaWdub3JlRm9yRGlhZ25vc3RpY3M6IFNldDx0cy5Tb3VyY2VGaWxlPjtcbiAgcmVhZG9ubHkgaWdub3JlRm9yRW1pdDogU2V0PHRzLlNvdXJjZUZpbGU+O1xuXG4gIC8qKlxuICAgKiBgTmdDb21waWxlcmAgY2FuIGJlIHJldXNlZCBmb3IgbXVsdGlwbGUgY29tcGlsYXRpb25zIChmb3IgcmVzb3VyY2Utb25seSBjaGFuZ2VzKSwgYW5kIGVhY2hcbiAgICogbmV3IGNvbXBpbGF0aW9uIHVzZXMgYSBmcmVzaCBgUGVyZlJlY29yZGVyYC4gVGh1cywgY2xhc3NlcyBjcmVhdGVkIHdpdGggYSBsaWZlc3BhbiBvZiB0aGVcbiAgICogYE5nQ29tcGlsZXJgIHVzZSBhIGBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyYCBzbyB0aGUgYFBlcmZSZWNvcmRlcmAgdGhleSB3cml0ZSB0byBjYW4gYmUgdXBkYXRlZFxuICAgKiB3aXRoIGVhY2ggZnJlc2ggY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGRlbGVnYXRpbmdQZXJmUmVjb3JkZXIgPSBuZXcgRGVsZWdhdGluZ1BlcmZSZWNvcmRlcih0aGlzLnBlcmZSZWNvcmRlcik7XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGludG8gYW4gYE5nQ29tcGlsZXJgIGluc3RhbmNlIGZvciB0aGUgcmVxdWVzdGVkIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBEZXBlbmRpbmcgb24gdGhlIG5hdHVyZSBvZiB0aGUgY29tcGlsYXRpb24gcmVxdWVzdCwgdGhlIGBOZ0NvbXBpbGVyYCBpbnN0YW5jZSBtYXkgYmUgcmV1c2VkXG4gICAqIGZyb20gYSBwcmV2aW91cyBjb21waWxhdGlvbiBhbmQgdXBkYXRlZCB3aXRoIGFueSBjaGFuZ2VzLCBpdCBtYXkgYmUgYSBuZXcgaW5zdGFuY2Ugd2hpY2hcbiAgICogaW5jcmVtZW50YWxseSByZXVzZXMgc3RhdGUgZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uLCBvciBpdCBtYXkgcmVwcmVzZW50IGEgZnJlc2hcbiAgICogY29tcGlsYXRpb24gZW50aXJlbHkuXG4gICAqL1xuICBzdGF0aWMgZnJvbVRpY2tldCh0aWNrZXQ6IENvbXBpbGF0aW9uVGlja2V0LCBhZGFwdGVyOiBOZ0NvbXBpbGVyQWRhcHRlcikge1xuICAgIHN3aXRjaCAodGlja2V0LmtpbmQpIHtcbiAgICAgIGNhc2UgQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoOlxuICAgICAgICByZXR1cm4gbmV3IE5nQ29tcGlsZXIoXG4gICAgICAgICAgICBhZGFwdGVyLFxuICAgICAgICAgICAgdGlja2V0Lm9wdGlvbnMsXG4gICAgICAgICAgICB0aWNrZXQudHNQcm9ncmFtLFxuICAgICAgICAgICAgdGlja2V0LnByb2dyYW1Ecml2ZXIsXG4gICAgICAgICAgICB0aWNrZXQuaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgICAgICAgICAgSW5jcmVtZW50YWxEcml2ZXIuZnJlc2godGlja2V0LnRzUHJvZ3JhbSksXG4gICAgICAgICAgICB0aWNrZXQuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgICAgIHRpY2tldC51c2VQb2lzb25lZERhdGEsXG4gICAgICAgICAgICB0aWNrZXQucGVyZlJlY29yZGVyLFxuICAgICAgICApO1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0OlxuICAgICAgICByZXR1cm4gbmV3IE5nQ29tcGlsZXIoXG4gICAgICAgICAgICBhZGFwdGVyLFxuICAgICAgICAgICAgdGlja2V0Lm9wdGlvbnMsXG4gICAgICAgICAgICB0aWNrZXQubmV3UHJvZ3JhbSxcbiAgICAgICAgICAgIHRpY2tldC5wcm9ncmFtRHJpdmVyLFxuICAgICAgICAgICAgdGlja2V0LmluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICAgICAgICAgIHRpY2tldC5uZXdEcml2ZXIsXG4gICAgICAgICAgICB0aWNrZXQuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgICAgIHRpY2tldC51c2VQb2lzb25lZERhdGEsXG4gICAgICAgICAgICB0aWNrZXQucGVyZlJlY29yZGVyLFxuICAgICAgICApO1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZTpcbiAgICAgICAgY29uc3QgY29tcGlsZXIgPSB0aWNrZXQuY29tcGlsZXI7XG4gICAgICAgIGNvbXBpbGVyLnVwZGF0ZVdpdGhDaGFuZ2VkUmVzb3VyY2VzKHRpY2tldC5tb2RpZmllZFJlc291cmNlRmlsZXMsIHRpY2tldC5wZXJmUmVjb3JkZXIpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXI7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgYWRhcHRlcjogTmdDb21waWxlckFkYXB0ZXIsXG4gICAgICByZWFkb25seSBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgaW5wdXRQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgcmVhZG9ubHkgcHJvZ3JhbURyaXZlcjogUHJvZ3JhbURyaXZlcixcbiAgICAgIHJlYWRvbmx5IGluY3JlbWVudGFsU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICAgIHJlYWRvbmx5IGluY3JlbWVudGFsRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlcixcbiAgICAgIHJlYWRvbmx5IGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW4sXG4gICAgICByZWFkb25seSB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGxpdmVQZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcixcbiAgKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuYWRhcHRlci5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcyk7XG4gICAgY29uc3QgaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMgPSB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xuICAgIGlmIChpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljKTtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gaW5wdXRQcm9ncmFtO1xuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhdGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID1cbiAgICAgICAgYWRhcHRlci5lbnRyeVBvaW50ICE9PSBudWxsID8gZ2V0U291cmNlRmlsZU9yTnVsbChpbnB1dFByb2dyYW0sIGFkYXB0ZXIuZW50cnlQb2ludCkgOiBudWxsO1xuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmFkYXB0ZXIuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgICAgICAvLyBkb2VuJ3QgcmV0YWluIGEgcmVmZXJlbmNlIHRvIGB0aGlzYCwgaWYgb3RoZXIgY2xvc3VyZXMgaW4gdGhlIGNvbnN0cnVjdG9yIGhlcmUgcmVmZXJlbmNlXG4gICAgICAgIC8vIGB0aGlzYCBpbnRlcm5hbGx5IHRoZW4gYSBjbG9zdXJlIGNyZWF0ZWQgaGVyZSB3b3VsZCByZXRhaW4gdGhlbS4gVGhpcyBjYW4gY2F1c2UgbWFqb3JcbiAgICAgICAgLy8gbWVtb3J5IGxlYWsgaXNzdWVzIHNpbmNlIHRoZSBgbW9kdWxlUmVzb2x1dGlvbkNhY2hlYCBpcyBhIGxvbmctbGl2ZWQgb2JqZWN0IGFuZCBmaW5kcyBpdHNcbiAgICAgICAgLy8gd2F5IGludG8gYWxsIGtpbmRzIG9mIHBsYWNlcyBpbnNpZGUgVFMgaW50ZXJuYWwgb2JqZWN0cy5cbiAgICAgICAgdGhpcy5hZGFwdGVyLmdldENhbm9uaWNhbEZpbGVOYW1lLmJpbmQodGhpcy5hZGFwdGVyKSk7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHZlciA9XG4gICAgICAgIG5ldyBNb2R1bGVSZXNvbHZlcihpbnB1dFByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5hZGFwdGVyLCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUpO1xuICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyID0gbmV3IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcihhZGFwdGVyLCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMuY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKFxuICAgICAgICBuZXcgSW1wb3J0R3JhcGgoaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcikpO1xuICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneS5zZXRJbmNyZW1lbnRhbERyaXZlcih0aGlzLmluY3JlbWVudGFsRHJpdmVyLCBpbnB1dFByb2dyYW0pO1xuXG4gICAgdGhpcy5pZ25vcmVGb3JEaWFnbm9zdGljcyA9XG4gICAgICAgIG5ldyBTZXQoaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKHNmID0+IHRoaXMuYWRhcHRlci5pc1NoaW0oc2YpKSk7XG4gICAgdGhpcy5pZ25vcmVGb3JFbWl0ID0gdGhpcy5hZGFwdGVyLmlnbm9yZUZvckVtaXQ7XG5cbiAgICBsZXQgZHRzRmlsZUNvdW50ID0gMDtcbiAgICBsZXQgbm9uRHRzRmlsZUNvdW50ID0gMDtcbiAgICBmb3IgKGNvbnN0IHNmIG9mIGlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgZHRzRmlsZUNvdW50Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub25EdHNGaWxlQ291bnQrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsaXZlUGVyZlJlY29yZGVyLmV2ZW50Q291bnQoUGVyZkV2ZW50LklucHV0RHRzRmlsZSwgZHRzRmlsZUNvdW50KTtcbiAgICBsaXZlUGVyZlJlY29yZGVyLmV2ZW50Q291bnQoUGVyZkV2ZW50LklucHV0VHNGaWxlLCBub25EdHNGaWxlQ291bnQpO1xuICB9XG5cbiAgZ2V0IHBlcmZSZWNvcmRlcigpOiBBY3RpdmVQZXJmUmVjb3JkZXIge1xuICAgIHJldHVybiB0aGlzLmxpdmVQZXJmUmVjb3JkZXI7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVdpdGhDaGFuZ2VkUmVzb3VyY2VzKFxuICAgICAgY2hhbmdlZFJlc291cmNlczogU2V0PHN0cmluZz4sIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyKTogdm9pZCB7XG4gICAgdGhpcy5saXZlUGVyZlJlY29yZGVyID0gcGVyZlJlY29yZGVyO1xuICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlci50YXJnZXQgPSBwZXJmUmVjb3JkZXI7XG5cbiAgICBwZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuUmVzb3VyY2VVcGRhdGUsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICAgIC8vIEFuYWx5c2lzIGhhc24ndCBoYXBwZW5lZCB5ZXQsIHNvIG5vIHVwZGF0ZSBpcyBuZWNlc3NhcnkgLSBhbnkgY2hhbmdlcyB0byByZXNvdXJjZXMgd2lsbFxuICAgICAgICAvLyBiZSBjYXB0dXJlZCBieSB0aGUgaW5pdGFsIGFuYWx5c2lzIHBhc3MgaXRzZWxmLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyLmludmFsaWRhdGUoKTtcblxuICAgICAgY29uc3QgY2xhc3Nlc1RvVXBkYXRlID0gbmV3IFNldDxEZWNsYXJhdGlvbk5vZGU+KCk7XG4gICAgICBmb3IgKGNvbnN0IHJlc291cmNlRmlsZSBvZiBjaGFuZ2VkUmVzb3VyY2VzKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGVtcGxhdGVDbGFzcyBvZiB0aGlzLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKHJlc291cmNlRmlsZSkpIHtcbiAgICAgICAgICBjbGFzc2VzVG9VcGRhdGUuYWRkKHRlbXBsYXRlQ2xhc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBzdHlsZUNsYXNzIG9mIHRoaXMuZ2V0Q29tcG9uZW50c1dpdGhTdHlsZUZpbGUocmVzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIGNsYXNzZXNUb1VwZGF0ZS5hZGQoc3R5bGVDbGFzcyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBjbGF6eiBvZiBjbGFzc2VzVG9VcGRhdGUpIHtcbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLnVwZGF0ZVJlc291cmNlcyhjbGF6eik7XG4gICAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmludmFsaWRhdGVDbGFzcyhjbGF6eik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSBkZXBlbmRlbmNpZXMgb2YgYSBmaWxlLlxuICAgKlxuICAgKiBJZiB0aGUgZmlsZSBpcyBub3QgcGFydCBvZiB0aGUgY29tcGlsYXRpb24sIGFuIGVtcHR5IGFycmF5IHdpbGwgYmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXRSZXNvdXJjZURlcGVuZGVuY2llcyhmaWxlOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nW10ge1xuICAgIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIHJldHVybiB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmRlcEdyYXBoLmdldFJlc291cmNlRGVwZW5kZW5jaWVzKGZpbGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgQW5ndWxhci1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoXG4gICAgICAgIFsuLi50aGlzLmdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3MoKSwgLi4udGhpcy5nZXRUZW1wbGF0ZURpYWdub3N0aWNzKCldKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIEFuZ3VsYXItcmVsYXRlZCBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICpcbiAgICogSWYgYSBgdHMuU291cmNlRmlsZWAgaXMgcGFzc2VkLCBvbmx5IGRpYWdub3N0aWNzIHJlbGF0ZWQgdG8gdGhhdCBmaWxlIGFyZSByZXR1cm5lZC5cbiAgICovXG4gIGdldERpYWdub3N0aWNzRm9yRmlsZShmaWxlOiB0cy5Tb3VyY2VGaWxlLCBvcHRpbWl6ZUZvcjogT3B0aW1pemVGb3IpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmFkZE1lc3NhZ2VUZXh0RGV0YWlscyhbXG4gICAgICAuLi50aGlzLmdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3MoKS5maWx0ZXIoZGlhZyA9PiBkaWFnLmZpbGUgPT09IGZpbGUpLFxuICAgICAgLi4udGhpcy5nZXRUZW1wbGF0ZURpYWdub3N0aWNzRm9yRmlsZShmaWxlLCBvcHRpbWl6ZUZvcilcbiAgICBdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgQW5ndWxhci5pbyBlcnJvciBndWlkZSBsaW5rcyB0byBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgYWRkTWVzc2FnZVRleHREZXRhaWxzKGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10pOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiBkaWFnbm9zdGljcy5tYXAoZGlhZyA9PiB7XG4gICAgICBpZiAoZGlhZy5jb2RlICYmIENPTVBJTEVSX0VSUk9SU19XSVRIX0dVSURFUy5oYXMobmdFcnJvckNvZGUoZGlhZy5jb2RlKSkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5kaWFnLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiBkaWFnLm1lc3NhZ2VUZXh0ICtcbiAgICAgICAgICAgICAgYC4gRmluZCBtb3JlIGF0ICR7RVJST1JfREVUQUlMU19QQUdFX0JBU0VfVVJMfS9ORyR7bmdFcnJvckNvZGUoZGlhZy5jb2RlKX1gXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gZGlhZztcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIHNldHVwLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqL1xuICBnZXRPcHRpb25EaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY3VycmVudCBgdHMuUHJvZ3JhbWAga25vd24gdG8gdGhpcyBgTmdDb21waWxlcmAuXG4gICAqXG4gICAqIENvbXBpbGF0aW9uIGJlZ2lucyB3aXRoIGFuIGlucHV0IGB0cy5Qcm9ncmFtYCwgYW5kIGR1cmluZyB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG9wZXJhdGlvbnMgbmV3XG4gICAqIGB0cy5Qcm9ncmFtYHMgbWF5IGJlIHByb2R1Y2VkIHVzaW5nIHRoZSBgUHJvZ3JhbURyaXZlcmAuIFRoZSBtb3N0IHJlY2VudCBzdWNoIGB0cy5Qcm9ncmFtYCB0b1xuICAgKiBiZSBwcm9kdWNlZCBpcyBhdmFpbGFibGUgaGVyZS5cbiAgICpcbiAgICogVGhpcyBgdHMuUHJvZ3JhbWAgc2VydmVzIHR3byBrZXkgcHVycG9zZXM6XG4gICAqXG4gICAqICogQXMgYW4gaW5jcmVtZW50YWwgc3RhcnRpbmcgcG9pbnQgZm9yIGNyZWF0aW5nIHRoZSBuZXh0IGB0cy5Qcm9ncmFtYCBiYXNlZCBvbiBmaWxlcyB0aGF0IHRoZVxuICAgKiAgIHVzZXIgaGFzIGNoYW5nZWQgKGZvciBjbGllbnRzIHVzaW5nIHRoZSBUUyBjb21waWxlciBwcm9ncmFtIEFQSXMpLlxuICAgKlxuICAgKiAqIEFzIHRoZSBcImJlZm9yZVwiIHBvaW50IGZvciBhbiBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiBpbnZvY2F0aW9uLCB0byBkZXRlcm1pbmUgd2hhdCdzIGNoYW5nZWRcbiAgICogICBiZXR3ZWVuIHRoZSBvbGQgYW5kIG5ldyBwcm9ncmFtcyAoZm9yIGFsbCBjb21waWxhdGlvbnMpLlxuICAgKi9cbiAgZ2V0Q3VycmVudFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFByb2dyYW07XG4gIH1cblxuICBnZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk6IFRlbXBsYXRlVHlwZUNoZWNrZXIge1xuICAgIGlmICghdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1RoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlcmAgZG9lcyBub3Qgd29yayB3aXRob3V0IGBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyYC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKS50ZW1wbGF0ZVR5cGVDaGVja2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgYHRzLkRlY2xhcmF0aW9uYHMgZm9yIGFueSBjb21wb25lbnQocykgd2hpY2ggdXNlIHRoZSBnaXZlbiB0ZW1wbGF0ZSBmaWxlLlxuICAgKi9cbiAgZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUodGVtcGxhdGVGaWxlUGF0aDogc3RyaW5nKTogUmVhZG9ubHlTZXQ8RGVjbGFyYXRpb25Ob2RlPiB7XG4gICAgY29uc3Qge3Jlc291cmNlUmVnaXN0cnl9ID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIHJldHVybiByZXNvdXJjZVJlZ2lzdHJ5LmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGUocmVzb2x2ZSh0ZW1wbGF0ZUZpbGVQYXRoKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBgdHMuRGVjbGFyYXRpb25gcyBmb3IgYW55IGNvbXBvbmVudChzKSB3aGljaCB1c2UgdGhlIGdpdmVuIHRlbXBsYXRlIGZpbGUuXG4gICAqL1xuICBnZXRDb21wb25lbnRzV2l0aFN0eWxlRmlsZShzdHlsZUZpbGVQYXRoOiBzdHJpbmcpOiBSZWFkb25seVNldDxEZWNsYXJhdGlvbk5vZGU+IHtcbiAgICBjb25zdCB7cmVzb3VyY2VSZWdpc3RyeX0gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIHJlc291cmNlUmVnaXN0cnkuZ2V0Q29tcG9uZW50c1dpdGhTdHlsZShyZXNvbHZlKHN0eWxlRmlsZVBhdGgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgZXh0ZXJuYWwgcmVzb3VyY2VzIGZvciB0aGUgZ2l2ZW4gY29tcG9uZW50LlxuICAgKi9cbiAgZ2V0Q29tcG9uZW50UmVzb3VyY2VzKGNsYXNzRGVjbDogRGVjbGFyYXRpb25Ob2RlKTogQ29tcG9uZW50UmVzb3VyY2VzfG51bGwge1xuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oY2xhc3NEZWNsKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHtyZXNvdXJjZVJlZ2lzdHJ5fSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBzdHlsZXMgPSByZXNvdXJjZVJlZ2lzdHJ5LmdldFN0eWxlcyhjbGFzc0RlY2wpO1xuICAgIGNvbnN0IHRlbXBsYXRlID0gcmVzb3VyY2VSZWdpc3RyeS5nZXRUZW1wbGF0ZShjbGFzc0RlY2wpO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtzdHlsZXMsIHRlbXBsYXRlfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIEFuZ3VsYXIncyBhbmFseXNpcyBzdGVwIChhcyBhIHByZWN1cnNvciB0byBgZ2V0RGlhZ25vc3RpY3NgIG9yIGBwcmVwYXJlRW1pdGApXG4gICAqIGFzeW5jaHJvbm91c2x5LlxuICAgKlxuICAgKiBOb3JtYWxseSwgdGhpcyBvcGVyYXRpb24gaGFwcGVucyBsYXppbHkgd2hlbmV2ZXIgYGdldERpYWdub3N0aWNzYCBvciBgcHJlcGFyZUVtaXRgIGFyZSBjYWxsZWQuXG4gICAqIEhvd2V2ZXIsIGNlcnRhaW4gY29uc3VtZXJzIG1heSB3aXNoIHRvIGFsbG93IGZvciBhbiBhc3luY2hyb25vdXMgcGhhc2Ugb2YgYW5hbHlzaXMsIHdoZXJlXG4gICAqIHJlc291cmNlcyBzdWNoIGFzIGBzdHlsZVVybHNgIGFyZSByZXNvbHZlZCBhc3luY2hvbm91c2x5LiBJbiB0aGVzZSBjYXNlcyBgYW5hbHl6ZUFzeW5jYCBtdXN0IGJlXG4gICAqIGNhbGxlZCBmaXJzdCwgYW5kIGl0cyBgUHJvbWlzZWAgYXdhaXRlZCBwcmlvciB0byBjYWxsaW5nIGFueSBvdGhlciBBUElzIG9mIGBOZ0NvbXBpbGVyYC5cbiAgICovXG4gIGFzeW5jIGFuYWx5emVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLkFuYWx5c2lzLCBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcblxuICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplQXN5bmMoc2YpO1xuICAgICAgICB0aGlzLnNjYW5Gb3JNd3Aoc2YpO1xuICAgICAgICBpZiAoYW5hbHlzaXNQcm9taXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGFuYWx5c2lzUHJvbWlzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuQW5hbHlzaXMpO1xuICAgICAgdGhpcy5yZXNvbHZlQ29tcGlsYXRpb24odGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGxhenkgcm91dGVzIGRldGVjdGVkIGR1cmluZyBhbmFseXNpcy5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgY2FsbGVkIGZvciBvbmUgc3BlY2lmaWMgcm91dGUsIG9yIHRvIHJldHJpZXZlIGFsbCB0b3AtbGV2ZWwgcm91dGVzLlxuICAgKi9cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdIHtcbiAgICBpZiAoZW50cnlSb3V0ZSkge1xuICAgICAgLy8gaHR0czovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvNTA3MzJlMTU2L3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMjTDE3NS1MMTg4KS5cbiAgICAgIC8vXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCB3aWxsIGFsd2F5cyBjYWxsIHRoaXMgQVBJIHdpdGggYW4gYWJzb2x1dGUgcGF0aCwgc28gdGhlIHJlc29sdXRpb24gc3RlcCBpc1xuICAgICAgLy8gbm90IG5lY2Vzc2FyeSwgYnV0IGtlZXBpbmcgaXQgYmFja3dhcmRzIGNvbXBhdGlibGUgaW4gY2FzZSBzb21lb25lIGVsc2UgaXMgdXNpbmcgdGhlIEFQSS5cblxuICAgICAgLy8gUmVsYXRpdmUgZW50cnkgcGF0aHMgYXJlIGRpc2FsbG93ZWQuXG4gICAgICBpZiAoZW50cnlSb3V0ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gbGlzdCBsYXp5IHJvdXRlczogUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyAoJHtcbiAgICAgICAgICAgIGVudHJ5Um91dGV9KSBpcyBub3Qgc3VwcG9ydGVkLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tcmVsYXRpdmUgZW50cnkgcGF0aHMgZmFsbCBpbnRvIG9uZSBvZiB0aGUgZm9sbG93aW5nIGNhdGVnb3JpZXM6XG4gICAgICAvLyAtIEFic29sdXRlIHN5c3RlbSBwYXRocyAoZS5nLiBgL2Zvby9iYXIvbXktcHJvamVjdC9teS1tb2R1bGVgKSwgd2hpY2ggYXJlIHVuYWZmZWN0ZWQgYnkgdGhlXG4gICAgICAvLyAgIGxvZ2ljIGJlbG93LlxuICAgICAgLy8gLSBQYXRocyB0byBlbnRlcm5hbCBtb2R1bGVzIChlLmcuIGBzb21lLWxpYmApLlxuICAgICAgLy8gLSBQYXRocyBtYXBwZWQgdG8gZGlyZWN0b3JpZXMgaW4gYHRzY29uZmlnLmpzb25gIChlLmcuIGBzaGFyZWQvbXktbW9kdWxlYCkuXG4gICAgICAvLyAgIChTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbCNwYXRoLW1hcHBpbmcuKVxuICAgICAgLy9cbiAgICAgIC8vIEluIGFsbCBjYXNlcyBhYm92ZSwgdGhlIGBjb250YWluaW5nRmlsZWAgYXJndW1lbnQgaXMgaWdub3JlZCwgc28gd2UgY2FuIGp1c3QgdGFrZSB0aGUgZmlyc3RcbiAgICAgIC8vIG9mIHRoZSByb290IGZpbGVzLlxuICAgICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSB0aGlzLmlucHV0UHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKClbMF07XG4gICAgICBjb25zdCBbZW50cnlQYXRoLCBtb2R1bGVOYW1lXSA9IGVudHJ5Um91dGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID1cbiAgICAgICAgICByZXNvbHZlTW9kdWxlTmFtZShlbnRyeVBhdGgsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuYWRhcHRlciwgbnVsbCk7XG5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBlbnRyeVJvdXRlID0gZW50cnlQb2ludEtleUZvcihyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLCBtb2R1bGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gY29tcGlsYXRpb24ucm91dGVBbmFseXplci5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCB0cmFuc2Zvcm1lcnMgYW5kIG90aGVyIGluZm9ybWF0aW9uIHdoaWNoIGlzIG5lY2Vzc2FyeSBmb3IgYSBjb25zdW1lciB0byBgZW1pdGAgdGhlXG4gICAqIHByb2dyYW0gd2l0aCBBbmd1bGFyLWFkZGVkIGRlZmluaXRpb25zLlxuICAgKi9cbiAgcHJlcGFyZUVtaXQoKToge1xuICAgIHRyYW5zZm9ybWVyczogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICB9IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IGNvcmVJbXBvcnRzRnJvbSA9IGNvbXBpbGF0aW9uLmlzQ29yZSA/IGdldFIzU3ltYm9sc0ZpbGUodGhpcy5pbnB1dFByb2dyYW0pIDogbnVsbDtcbiAgICBsZXQgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyO1xuICAgIGlmIChjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwpIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyKGNvcmVJbXBvcnRzRnJvbS5maWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGJlZm9yZSA9IFtcbiAgICAgIGl2eVRyYW5zZm9ybUZhY3RvcnkoXG4gICAgICAgICAgY29tcGlsYXRpb24udHJhaXRDb21waWxlciwgY29tcGlsYXRpb24ucmVmbGVjdG9yLCBpbXBvcnRSZXdyaXRlcixcbiAgICAgICAgICBjb21waWxhdGlvbi5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLCBjb21waWxhdGlvbi5pc0NvcmUsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkKSxcbiAgICAgIGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmV4cG9ydFN0YXRlbWVudHMpLFxuICAgICAgY29tcGlsYXRpb24uZGVmYXVsdEltcG9ydFRyYWNrZXIuaW1wb3J0UHJlc2VydmluZ1RyYW5zZm9ybWVyKCksXG4gICAgXTtcblxuICAgIGNvbnN0IGFmdGVyRGVjbGFyYXRpb25zOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT5bXSA9IFtdO1xuICAgIGlmIChjb21waWxhdGlvbi5kdHNUcmFuc2Zvcm1zICE9PSBudWxsKSB7XG4gICAgICBhZnRlckRlY2xhcmF0aW9ucy5wdXNoKFxuICAgICAgICAgIGRlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi5kdHNUcmFuc2Zvcm1zLCBpbXBvcnRSZXdyaXRlcikpO1xuICAgIH1cblxuICAgIC8vIE9ubHkgYWRkIGFsaWFzaW5nIHJlLWV4cG9ydHMgdG8gdGhlIC5kLnRzIG91dHB1dCBpZiB0aGUgYEFsaWFzaW5nSG9zdGAgcmVxdWVzdHMgaXQuXG4gICAgaWYgKGNvbXBpbGF0aW9uLmFsaWFzaW5nSG9zdCAhPT0gbnVsbCAmJiBjb21waWxhdGlvbi5hbGlhc2luZ0hvc3QuYWxpYXNFeHBvcnRzSW5EdHMpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zLnB1c2goYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZXhwb3J0U3RhdGVtZW50cykpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIGJlZm9yZS5wdXNoKFxuICAgICAgICAgIGdlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm0odGhpcy5hZGFwdGVyLmZhY3RvcnlUcmFja2VyLnNvdXJjZUluZm8sIGltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuICAgIGJlZm9yZS5wdXNoKGl2eVN3aXRjaFRyYW5zZm9ybSk7XG5cbiAgICByZXR1cm4ge3RyYW5zZm9ybWVyczoge2JlZm9yZSwgYWZ0ZXJEZWNsYXJhdGlvbnN9IGFzIHRzLkN1c3RvbVRyYW5zZm9ybWVyc307XG4gIH1cblxuICAvKipcbiAgICogUnVuIHRoZSBpbmRleGluZyBwcm9jZXNzIGFuZCByZXR1cm4gYSBgTWFwYCBvZiBhbGwgaW5kZXhlZCBjb21wb25lbnRzLlxuICAgKlxuICAgKiBTZWUgdGhlIGBpbmRleGluZ2AgcGFja2FnZSBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKi9cbiAgZ2V0SW5kZXhlZENvbXBvbmVudHMoKTogTWFwPERlY2xhcmF0aW9uTm9kZSwgSW5kZXhlZENvbXBvbmVudD4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBuZXcgSW5kZXhpbmdDb250ZXh0KCk7XG4gICAgY29tcGlsYXRpb24udHJhaXRDb21waWxlci5pbmRleChjb250ZXh0KTtcbiAgICByZXR1cm4gZ2VuZXJhdGVBbmFseXNpcyhjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQW5hbHl6ZWQodGhpczogTmdDb21waWxlcik6IExhenlDb21waWxhdGlvblN0YXRlIHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5hbmFseXplU3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxhdGlvbiE7XG4gIH1cblxuICBwcml2YXRlIGFuYWx5emVTeW5jKCk6IHZvaWQge1xuICAgIHRoaXMucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLkFuYWx5c2lzLCAoKSA9PiB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcbiAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy5pbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuYW5hbHl6ZVN5bmMoc2YpO1xuICAgICAgICB0aGlzLnNjYW5Gb3JNd3Aoc2YpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuQW5hbHlzaXMpO1xuXG4gICAgICB0aGlzLnJlc29sdmVDb21waWxhdGlvbih0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlQ29tcGlsYXRpb24odHJhaXRDb21waWxlcjogVHJhaXRDb21waWxlcik6IHZvaWQge1xuICAgIHRoaXMucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLlJlc29sdmUsICgpID0+IHtcbiAgICAgIHRyYWl0Q29tcGlsZXIucmVzb2x2ZSgpO1xuXG4gICAgICAvLyBBdCB0aGlzIHBvaW50LCBhbmFseXNpcyBpcyBjb21wbGV0ZSBhbmQgdGhlIGNvbXBpbGVyIGNhbiBub3cgY2FsY3VsYXRlIHdoaWNoIGZpbGVzIG5lZWQgdG9cbiAgICAgIC8vIGJlIGVtaXR0ZWQsIHNvIGRvIHRoYXQuXG4gICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyLnJlY29yZFN1Y2Nlc3NmdWxBbmFseXNpcyh0cmFpdENvbXBpbGVyKTtcblxuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIubWVtb3J5KFBlcmZDaGVja3BvaW50LlJlc29sdmUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgZnVsbFRlbXBsYXRlVHlwZUNoZWNrKCk6IGJvb2xlYW4ge1xuICAgIC8vIERldGVybWluZSB0aGUgc3RyaWN0bmVzcyBsZXZlbCBvZiB0eXBlIGNoZWNraW5nIGJhc2VkIG9uIGNvbXBpbGVyIG9wdGlvbnMuIEFzXG4gICAgLy8gYHN0cmljdFRlbXBsYXRlc2AgaXMgYSBzdXBlcnNldCBvZiBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCwgdGhlIGZvcm1lciBpbXBsaWVzIHRoZSBsYXR0ZXIuXG4gICAgLy8gQWxzbyBzZWUgYHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zYCB3aGVyZSBpdCBpcyB2ZXJpZmllZCB0aGF0IGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgXG4gICAgLy8gaXMgbm90IGRpc2FibGVkIHdoZW4gYHN0cmljdFRlbXBsYXRlc2AgaXMgZW5hYmxlZC5cbiAgICBjb25zdCBzdHJpY3RUZW1wbGF0ZXMgPSAhIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXM7XG4gICAgcmV0dXJuIHN0cmljdFRlbXBsYXRlcyB8fCAhIXRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2s7XG4gIH1cblxuICBwcml2YXRlIGdldFR5cGVDaGVja2luZ0NvbmZpZygpOiBUeXBlQ2hlY2tpbmdDb25maWcge1xuICAgIC8vIERldGVybWluZSB0aGUgc3RyaWN0bmVzcyBsZXZlbCBvZiB0eXBlIGNoZWNraW5nIGJhc2VkIG9uIGNvbXBpbGVyIG9wdGlvbnMuIEFzXG4gICAgLy8gYHN0cmljdFRlbXBsYXRlc2AgaXMgYSBzdXBlcnNldCBvZiBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCwgdGhlIGZvcm1lciBpbXBsaWVzIHRoZSBsYXR0ZXIuXG4gICAgLy8gQWxzbyBzZWUgYHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zYCB3aGVyZSBpdCBpcyB2ZXJpZmllZCB0aGF0IGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgXG4gICAgLy8gaXMgbm90IGRpc2FibGVkIHdoZW4gYHN0cmljdFRlbXBsYXRlc2AgaXMgZW5hYmxlZC5cbiAgICBjb25zdCBzdHJpY3RUZW1wbGF0ZXMgPSAhIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXM7XG5cbiAgICBjb25zdCB1c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzID0gdGhpcy5wcm9ncmFtRHJpdmVyLnN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucztcblxuICAgIC8vIEZpcnN0IHNlbGVjdCBhIHR5cGUtY2hlY2tpbmcgY29uZmlndXJhdGlvbiwgYmFzZWQgb24gd2hldGhlciBmdWxsIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgaXNcbiAgICAvLyByZXF1ZXN0ZWQuXG4gICAgbGV0IHR5cGVDaGVja2luZ0NvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnO1xuICAgIGlmICh0aGlzLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiB0cnVlLFxuICAgICAgICBhbHdheXNDaGVja1NjaGVtYUluVGVtcGxhdGVCb2RpZXM6IHRydWUsXG4gICAgICAgIGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBzdHJpY3ROdWxsSW5wdXRCaW5kaW5nczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1R5cGVPZkF0dHJpYnV0ZXM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgLy8gRXZlbiBpbiBmdWxsIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgbW9kZSwgRE9NIGJpbmRpbmcgY2hlY2tzIGFyZSBub3QgcXVpdGUgcmVhZHkgeWV0LlxuICAgICAgICBjaGVja1R5cGVPZkRvbUJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgLy8gQ2hlY2tpbmcgb2YgRE9NIGV2ZW50cyBjdXJyZW50bHkgaGFzIGFuIGFkdmVyc2UgZWZmZWN0IG9uIGRldmVsb3BlciBleHBlcmllbmNlLFxuICAgICAgICAvLyBlLmcuIGZvciBgPGlucHV0IChibHVyKT1cInVwZGF0ZSgkZXZlbnQudGFyZ2V0LnZhbHVlKVwiPmAgZW5hYmxpbmcgdGhpcyBjaGVjayByZXN1bHRzIGluOlxuICAgICAgICAvLyAtIGVycm9yIFRTMjUzMTogT2JqZWN0IGlzIHBvc3NpYmx5ICdudWxsJy5cbiAgICAgICAgLy8gLSBlcnJvciBUUzIzMzk6IFByb3BlcnR5ICd2YWx1ZScgZG9lcyBub3QgZXhpc3Qgb24gdHlwZSAnRXZlbnRUYXJnZXQnLlxuICAgICAgICBjaGVja1R5cGVPZkRvbUV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgLy8gTm9uLURPTSByZWZlcmVuY2VzIGhhdmUgdGhlIGNvcnJlY3QgdHlwZSBpbiBWaWV3IEVuZ2luZSBzbyB0aGVyZSBpcyBubyBzdHJpY3RuZXNzIGZsYWcuXG4gICAgICAgIGNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlczogdHJ1ZSxcbiAgICAgICAgLy8gUGlwZXMgYXJlIGNoZWNrZWQgaW4gVmlldyBFbmdpbmUgc28gdGhlcmUgaXMgbm8gc3RyaWN0bmVzcyBmbGFnLlxuICAgICAgICBjaGVja1R5cGVPZlBpcGVzOiB0cnVlLFxuICAgICAgICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIHVzZUNvbnRleHRHZW5lcmljVHlwZTogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBzdHJpY3RMaXRlcmFsVHlwZXM6IHRydWUsXG4gICAgICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IHRoaXMuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgdXNlSW5saW5lVHlwZUNvbnN0cnVjdG9ycyxcbiAgICAgICAgLy8gV2FybmluZ3MgZm9yIHN1Ym9wdGltYWwgdHlwZSBpbmZlcmVuY2UgYXJlIG9ubHkgZW5hYmxlZCBpZiBpbiBMYW5ndWFnZSBTZXJ2aWNlIG1vZGVcbiAgICAgICAgLy8gKHByb3ZpZGluZyB0aGUgZnVsbCBUZW1wbGF0ZVR5cGVDaGVja2VyIEFQSSkgYW5kIGlmIHN0cmljdCBtb2RlIGlzIG5vdCBlbmFibGVkLiBJbiBzdHJpY3RcbiAgICAgICAgLy8gbW9kZSwgdGhlIHVzZXIgaXMgaW4gZnVsbCBjb250cm9sIG9mIHR5cGUgaW5mZXJlbmNlLlxuICAgICAgICBzdWdnZXN0aW9uc0ZvclN1Ym9wdGltYWxUeXBlSW5mZXJlbmNlOiB0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIgJiYgIXN0cmljdFRlbXBsYXRlcyxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IGZhbHNlLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiBmYWxzZSxcbiAgICAgICAgLy8gRW5hYmxlIGRlZXAgc2NoZW1hIGNoZWNraW5nIGluIFwiYmFzaWNcIiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUgb25seSBpZiBDbG9zdXJlXG4gICAgICAgIC8vIGNvbXBpbGF0aW9uIGlzIHJlcXVlc3RlZCwgd2hpY2ggaXMgYSBnb29kIHByb3h5IGZvciBcIm9ubHkgaW4gZ29vZ2xlM1wiLlxuICAgICAgICBhbHdheXNDaGVja1NjaGVtYUluVGVtcGxhdGVCb2RpZXM6IHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkF0dHJpYnV0ZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbUJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tRXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogZmFsc2UsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IGZhbHNlLFxuICAgICAgICB1c2VDb250ZXh0R2VuZXJpY1R5cGU6IGZhbHNlLFxuICAgICAgICBzdHJpY3RMaXRlcmFsVHlwZXM6IGZhbHNlLFxuICAgICAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiB0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgIHVzZUlubGluZVR5cGVDb25zdHJ1Y3RvcnMsXG4gICAgICAgIC8vIEluIFwiYmFzaWNcIiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIG5vIHdhcm5pbmdzIGFyZSBwcm9kdWNlZCBzaW5jZSBtb3N0IHRoaW5ncyBhcmVcbiAgICAgICAgLy8gbm90IGNoZWNrZWQgYW55d2F5cy5cbiAgICAgICAgc3VnZ2VzdGlvbnNGb3JTdWJvcHRpbWFsVHlwZUluZmVyZW5jZTogZmFsc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEFwcGx5IGV4cGxpY2l0bHkgY29uZmlndXJlZCBzdHJpY3RuZXNzIGZsYWdzIG9uIHRvcCBvZiB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgLy8gYmFzZWQgb24gXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIi5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzID0gdGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRBY2Nlc3NNb2RpZmllcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmhvbm9yQWNjZXNzTW9kaWZpZXJzRm9ySW5wdXRCaW5kaW5ncyA9XG4gICAgICAgICAgdGhpcy5vcHRpb25zLnN0cmljdElucHV0QWNjZXNzTW9kaWZpZXJzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdE51bGxJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncyA9IHRoaXMub3B0aW9ucy5zdHJpY3ROdWxsSW5wdXRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZk91dHB1dEV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzO1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0RG9tRXZlbnRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZEb21FdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0RG9tRXZlbnRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzID0gdGhpcy5vcHRpb25zLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0RG9tTG9jYWxSZWZUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzID0gdGhpcy5vcHRpb25zLnN0cmljdERvbUxvY2FsUmVmVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0QXR0cmlidXRlVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mQXR0cmlidXRlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RBdHRyaWJ1dGVUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RDb250ZXh0R2VuZXJpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnVzZUNvbnRleHRHZW5lcmljVHlwZSA9IHRoaXMub3B0aW9ucy5zdHJpY3RDb250ZXh0R2VuZXJpY3M7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0TGl0ZXJhbFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3RMaXRlcmFsVHlwZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0TGl0ZXJhbFR5cGVzO1xuICAgIH1cblxuICAgIHJldHVybiB0eXBlQ2hlY2tpbmdDb25maWc7XG4gIH1cblxuICBwcml2YXRlIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICAvLyBHZXQgdGhlIGRpYWdub3N0aWNzLlxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMuaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSB8fCB0aGlzLmFkYXB0ZXIuaXNTaGltKHNmKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZGlhZ25vc3RpY3MucHVzaChcbiAgICAgICAgICAuLi5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yRmlsZShzZiwgT3B0aW1pemVGb3IuV2hvbGVQcm9ncmFtKSk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCk7XG4gICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsRHJpdmVyKHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsIHByb2dyYW0pO1xuICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgaWYgKCFzZi5pc0RlY2xhcmF0aW9uRmlsZSAmJiAhdGhpcy5hZGFwdGVyLmlzU2hpbShzZikpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY29tcGlsYXRpb24udGVtcGxhdGVUeXBlQ2hlY2tlci5nZXREaWFnbm9zdGljc0ZvckZpbGUoc2YsIG9wdGltaXplRm9yKSk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvZ3JhbSA9IHRoaXMucHJvZ3JhbURyaXZlci5nZXRQcm9ncmFtKCk7XG4gICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsRHJpdmVyKHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsIHByb2dyYW0pO1xuICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgaWYgKHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcyA9PT0gbnVsbCkge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgICB0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3MgPSBbLi4uY29tcGlsYXRpb24udHJhaXRDb21waWxlci5kaWFnbm9zdGljc107XG4gICAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQsIHRoaXMuaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIHNjYW5Gb3JNd3Aoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICB0aGlzLmNvbXBpbGF0aW9uIS5td3BTY2FubmVyLnNjYW4oc2YsIHtcbiAgICAgIGFkZFR5cGVSZXBsYWNlbWVudDogKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCB0eXBlOiBUeXBlKTogdm9pZCA9PiB7XG4gICAgICAgIC8vIE9ubHkgb2J0YWluIHRoZSByZXR1cm4gdHlwZSB0cmFuc2Zvcm0gZm9yIHRoZSBzb3VyY2UgZmlsZSBvbmNlIHRoZXJlJ3MgYSB0eXBlIHRvIHJlcGxhY2UsXG4gICAgICAgIC8vIHNvIHRoYXQgbm8gdHJhbnNmb3JtIGlzIGFsbG9jYXRlZCB3aGVuIHRoZXJlJ3Mgbm90aGluZyB0byBkby5cbiAgICAgICAgdGhpcy5jb21waWxhdGlvbiEuZHRzVHJhbnNmb3JtcyEuZ2V0UmV0dXJuVHlwZVRyYW5zZm9ybShzZikuYWRkVHlwZVJlcGxhY2VtZW50KG5vZGUsIHR5cGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlQ29tcGlsYXRpb24oKTogTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICAgIGNvbnN0IGNoZWNrZXIgPSB0aGlzLmlucHV0UHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgcmVmbGVjdG9yID0gbmV3IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdChjaGVja2VyKTtcblxuICAgIC8vIENvbnN0cnVjdCB0aGUgUmVmZXJlbmNlRW1pdHRlci5cbiAgICBsZXQgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcjtcbiAgICBsZXQgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QgPT09IG51bGwgfHwgIXRoaXMub3B0aW9ucy5fdXNlSG9zdEZvckltcG9ydEdlbmVyYXRpb24pIHtcbiAgICAgIGxldCBsb2NhbEltcG9ydFN0cmF0ZWd5OiBSZWZlcmVuY2VFbWl0U3RyYXRlZ3k7XG5cbiAgICAgIC8vIFRoZSBzdHJhdGVneSB1c2VkIGZvciBsb2NhbCwgaW4tcHJvamVjdCBpbXBvcnRzIGRlcGVuZHMgb24gd2hldGhlciBUUyBoYXMgYmVlbiBjb25maWd1cmVkXG4gICAgICAvLyB3aXRoIHJvb3REaXJzLiBJZiBzbywgdGhlbiBtdWx0aXBsZSBkaXJlY3RvcmllcyBtYXkgYmUgbWFwcGVkIGluIHRoZSBzYW1lIFwibW9kdWxlXG4gICAgICAvLyBuYW1lc3BhY2VcIiBhbmQgdGhlIGxvZ2ljIG9mIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBpcyByZXF1aXJlZCB0byBnZW5lcmF0ZSBjb3JyZWN0XG4gICAgICAvLyBpbXBvcnRzIHdoaWNoIG1heSBjcm9zcyB0aGVzZSBtdWx0aXBsZSBkaXJlY3Rvcmllcy4gT3RoZXJ3aXNlLCBwbGFpbiByZWxhdGl2ZSBpbXBvcnRzIGFyZVxuICAgICAgLy8gc3VmZmljaWVudC5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucm9vdERpciAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgKHRoaXMub3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkICYmIHRoaXMub3B0aW9ucy5yb290RGlycy5sZW5ndGggPiAwKSkge1xuICAgICAgICAvLyByb290RGlycyBsb2dpYyBpcyBpbiBlZmZlY3QgLSB1c2UgdGhlIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBmb3IgaW4tcHJvamVjdCByZWxhdGl2ZVxuICAgICAgICAvLyBpbXBvcnRzLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID0gbmV3IExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3koXG4gICAgICAgICAgICByZWZsZWN0b3IsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbShbLi4udGhpcy5hZGFwdGVyLnJvb3REaXJzXSwgdGhpcy5hZGFwdGVyKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBQbGFpbiByZWxhdGl2ZSBpbXBvcnRzIGFyZSBhbGwgdGhhdCdzIG5lZWRlZC5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSA9IG5ldyBSZWxhdGl2ZVBhdGhTdHJhdGVneShyZWZsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IGRvZXNuJ3QgaGF2ZSBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gYnVpbGQgYW4gTlBNLWNlbnRyaWMgcmVmZXJlbmNlXG4gICAgICAvLyByZXNvbHV0aW9uIHN0cmF0ZWd5LlxuICAgICAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gTmV4dCwgYXR0ZW1wdCB0byB1c2UgYW4gYWJzb2x1dGUgaW1wb3J0LlxuICAgICAgICBuZXcgQWJzb2x1dGVNb2R1bGVTdHJhdGVneSh0aGlzLmlucHV0UHJvZ3JhbSwgY2hlY2tlciwgdGhpcy5tb2R1bGVSZXNvbHZlciwgcmVmbGVjdG9yKSxcbiAgICAgICAgLy8gRmluYWxseSwgY2hlY2sgaWYgdGhlIHJlZmVyZW5jZSBpcyBiZWluZyB3cml0dGVuIGludG8gYSBmaWxlIHdpdGhpbiB0aGUgcHJvamVjdCdzIC50c1xuICAgICAgICAvLyBzb3VyY2VzLCBhbmQgdXNlIGEgcmVsYXRpdmUgaW1wb3J0IGlmIHNvLiBJZiB0aGlzIGZhaWxzLCBSZWZlcmVuY2VFbWl0dGVyIHdpbGwgdGhyb3dcbiAgICAgICAgLy8gYW4gZXJyb3IuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3ksXG4gICAgICBdKTtcblxuICAgICAgLy8gSWYgYW4gZW50cnlwb2ludCBpcyBwcmVzZW50LCB0aGVuIGFsbCB1c2VyIGltcG9ydHMgc2hvdWxkIGJlIGRpcmVjdGVkIHRocm91Z2ggdGhlXG4gICAgICAvLyBlbnRyeXBvaW50IGFuZCBwcml2YXRlIGV4cG9ydHMgYXJlIG5vdCBuZWVkZWQuIFRoZSBjb21waWxlciB3aWxsIHZhbGlkYXRlIHRoYXQgYWxsIHB1YmxpY2x5XG4gICAgICAvLyB2aXNpYmxlIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIGltcG9ydGFibGUgdmlhIHRoaXMgZW50cnlwb2ludC5cbiAgICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgPT09IG51bGwgJiYgdGhpcy5vcHRpb25zLmdlbmVyYXRlRGVlcFJlZXhwb3J0cyA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBObyBlbnRyeXBvaW50IGlzIHByZXNlbnQgYW5kIGRlZXAgcmUtZXhwb3J0cyB3ZXJlIHJlcXVlc3RlZCwgc28gY29uZmlndXJlIHRoZSBhbGlhc2luZ1xuICAgICAgICAvLyBzeXN0ZW0gdG8gZ2VuZXJhdGUgdGhlbS5cbiAgICAgICAgYWxpYXNpbmdIb3N0ID0gbmV3IFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QocmVmbGVjdG9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBzdXBwb3J0cyBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gdXNlIHRoYXQgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgYWxpYXNlZCByZWZlcmVuY2VzICh0aGlzIGlzIGEgd29ya2Fyb3VuZCB0byBTdHJpY3REZXBzIGNoZWNrcykuXG4gICAgICAgIG5ldyBBbGlhc1N0cmF0ZWd5KCksXG4gICAgICAgIC8vIFRoZW4gdXNlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lIHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgICAgbmV3IFVuaWZpZWRNb2R1bGVzU3RyYXRlZ3kocmVmbGVjdG9yLCB0aGlzLmFkYXB0ZXIudW5pZmllZE1vZHVsZXNIb3N0KSxcbiAgICAgIF0pO1xuICAgICAgYWxpYXNpbmdIb3N0ID0gbmV3IFVuaWZpZWRNb2R1bGVzQWxpYXNpbmdIb3N0KHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QpO1xuICAgIH1cblxuICAgIGNvbnN0IGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHJlZmxlY3RvciwgY2hlY2tlciwgdGhpcy5pbmNyZW1lbnRhbERyaXZlci5kZXBHcmFwaCk7XG4gICAgY29uc3QgZHRzUmVhZGVyID0gbmV3IER0c01ldGFkYXRhUmVhZGVyKGNoZWNrZXIsIHJlZmxlY3Rvcik7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVnaXN0cnkgPSBuZXcgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlciA9IGxvY2FsTWV0YVJlZ2lzdHJ5O1xuICAgIGNvbnN0IGRlcFNjb3BlUmVhZGVyID0gbmV3IE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcihkdHNSZWFkZXIsIGFsaWFzaW5nSG9zdCk7XG4gICAgY29uc3Qgc2NvcGVSZWdpc3RyeSA9XG4gICAgICAgIG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkobG9jYWxNZXRhUmVhZGVyLCBkZXBTY29wZVJlYWRlciwgcmVmRW1pdHRlciwgYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIgPSBzY29wZVJlZ2lzdHJ5O1xuICAgIGNvbnN0IHNlbWFudGljRGVwR3JhcGhVcGRhdGVyID0gdGhpcy5pbmNyZW1lbnRhbERyaXZlci5nZXRTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcigpO1xuICAgIGNvbnN0IG1ldGFSZWdpc3RyeSA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnkoW2xvY2FsTWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5XSk7XG4gICAgY29uc3QgaW5qZWN0YWJsZVJlZ2lzdHJ5ID0gbmV3IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5KHJlZmxlY3Rvcik7XG5cbiAgICBjb25zdCBtZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW2xvY2FsTWV0YVJlYWRlciwgZHRzUmVhZGVyXSk7XG4gICAgY29uc3QgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSA9IG5ldyBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5KHNjb3BlUmVhZGVyLCBtZXRhUmVhZGVyKTtcblxuXG4gICAgLy8gSWYgYSBmbGF0IG1vZHVsZSBlbnRyeXBvaW50IHdhcyBzcGVjaWZpZWQsIHRoZW4gdHJhY2sgcmVmZXJlbmNlcyB2aWEgYSBgUmVmZXJlbmNlR3JhcGhgIGluXG4gICAgLy8gb3JkZXIgdG8gcHJvZHVjZSBwcm9wZXIgZGlhZ25vc3RpY3MgZm9yIGluY29ycmVjdGx5IGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMvZXRjLiBJZiB0aGVyZVxuICAgIC8vIGlzIG5vIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgdGhlbiBkb24ndCBwYXkgdGhlIGNvc3Qgb2YgdHJhY2tpbmcgcmVmZXJlbmNlcy5cbiAgICBsZXQgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBSZWZlcmVuY2VzUmVnaXN0cnk7XG4gICAgbGV0IGV4cG9ydFJlZmVyZW5jZUdyYXBoOiBSZWZlcmVuY2VHcmFwaHxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsKSB7XG4gICAgICBleHBvcnRSZWZlcmVuY2VHcmFwaCA9IG5ldyBSZWZlcmVuY2VHcmFwaCgpO1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IFJlZmVyZW5jZUdyYXBoQWRhcHRlcihleHBvcnRSZWZlcmVuY2VHcmFwaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5KCk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm91dGVBbmFseXplciA9IG5ldyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIodGhpcy5tb2R1bGVSZXNvbHZlciwgZXZhbHVhdG9yKTtcblxuICAgIGNvbnN0IGR0c1RyYW5zZm9ybXMgPSBuZXcgRHRzVHJhbnNmb3JtUmVnaXN0cnkoKTtcblxuICAgIGNvbnN0IG13cFNjYW5uZXIgPSBuZXcgTW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXIocmVmbGVjdG9yLCBldmFsdWF0b3IsIHJlZkVtaXR0ZXIpO1xuXG4gICAgY29uc3QgaXNDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy5pbnB1dFByb2dyYW0pO1xuXG4gICAgY29uc3QgZGVmYXVsdEltcG9ydFRyYWNrZXIgPSBuZXcgRGVmYXVsdEltcG9ydFRyYWNrZXIoKTtcbiAgICBjb25zdCByZXNvdXJjZVJlZ2lzdHJ5ID0gbmV3IFJlc291cmNlUmVnaXN0cnkoKTtcblxuICAgIGNvbnN0IGNvbXBpbGF0aW9uTW9kZSA9XG4gICAgICAgIHRoaXMub3B0aW9ucy5jb21waWxhdGlvbk1vZGUgPT09ICdwYXJ0aWFsJyA/IENvbXBpbGF0aW9uTW9kZS5QQVJUSUFMIDogQ29tcGlsYXRpb25Nb2RlLkZVTEw7XG5cbiAgICAvLyBDeWNsZXMgYXJlIGhhbmRsZWQgaW4gZnVsbCBjb21waWxhdGlvbiBtb2RlIGJ5IFwicmVtb3RlIHNjb3BpbmdcIi5cbiAgICAvLyBcIlJlbW90ZSBzY29waW5nXCIgZG9lcyBub3Qgd29yayB3ZWxsIHdpdGggdHJlZSBzaGFraW5nIGZvciBsaWJyYXJpZXMuXG4gICAgLy8gU28gaW4gcGFydGlhbCBjb21waWxhdGlvbiBtb2RlLCB3aGVuIGJ1aWxkaW5nIGEgbGlicmFyeSwgYSBjeWNsZSB3aWxsIGNhdXNlIGFuIGVycm9yLlxuICAgIGNvbnN0IGN5Y2xlSGFuZGxpbmdTdHJhdGVneSA9IGNvbXBpbGF0aW9uTW9kZSA9PT0gQ29tcGlsYXRpb25Nb2RlLkZVTEwgP1xuICAgICAgICBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuVXNlUmVtb3RlU2NvcGluZyA6XG4gICAgICAgIEN5Y2xlSGFuZGxpbmdTdHJhdGVneS5FcnJvcjtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj5bXSA9IFtcbiAgICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIG1ldGFSZWFkZXIsIHNjb3BlUmVhZGVyLCBzY29wZVJlZ2lzdHJ5LFxuICAgICAgICAgIHR5cGVDaGVja1Njb3BlUmVnaXN0cnksIHJlc291cmNlUmVnaXN0cnksIGlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsXG4gICAgICAgICAgdGhpcy5hZGFwdGVyLnJvb3REaXJzLCB0aGlzLm9wdGlvbnMucHJlc2VydmVXaGl0ZXNwYWNlcyB8fCBmYWxzZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaTE4blVzZUV4dGVybmFsSWRzICE9PSBmYWxzZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCAhPT0gZmFsc2UsIHRoaXMudXNlUG9pc29uZWREYXRhLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMuY3ljbGVBbmFseXplcixcbiAgICAgICAgICBjeWNsZUhhbmRsaW5nU3RyYXRlZ3ksIHJlZkVtaXR0ZXIsIGRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmRlcEdyYXBoLFxuICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSwgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpLFxuXG4gICAgICAvLyBUT0RPKGFseGh1Yik6IHVuZGVyc3RhbmQgd2h5IHRoZSBjYXN0IGhlcmUgaXMgbmVjZXNzYXJ5IChzb21ldGhpbmcgdG8gZG8gd2l0aCBgbnVsbGBcbiAgICAgIC8vIG5vdCBiZWluZyBhc3NpZ25hYmxlIHRvIGB1bmtub3duYCB3aGVuIHdyYXBwZWQgaW4gYFJlYWRvbmx5YCkuXG4gICAgICAvLyBjbGFuZy1mb3JtYXQgb2ZmXG4gICAgICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgbWV0YVJlYWRlcixcbiAgICAgICAgICAgIGRlZmF1bHRJbXBvcnRUcmFja2VyLCBpbmplY3RhYmxlUmVnaXN0cnksIGlzQ29yZSwgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLCBjb21waWxlVW5kZWNvcmF0ZWRDbGFzc2VzV2l0aEFuZ3VsYXJGZWF0dXJlcyxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIsXG4gICAgICAgICkgYXMgUmVhZG9ubHk8RGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbCB8IG51bGwsdW5rbm93bj4+LFxuICAgICAgLy8gY2xhbmctZm9ybWF0IG9uXG4gICAgICAvLyBQaXBlIGhhbmRsZXIgbXVzdCBiZSBiZWZvcmUgaW5qZWN0YWJsZSBoYW5kbGVyIGluIGxpc3Qgc28gcGlwZSBmYWN0b3JpZXMgYXJlIHByaW50ZWRcbiAgICAgIC8vIGJlZm9yZSBpbmplY3RhYmxlIGZhY3RvcmllcyAoc28gaW5qZWN0YWJsZSBmYWN0b3JpZXMgY2FuIGRlbGVnYXRlIHRvIHRoZW0pXG4gICAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgZGVmYXVsdEltcG9ydFRyYWNrZXIsXG4gICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBpc0NvcmUsIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciksXG4gICAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBkZWZhdWx0SW1wb3J0VHJhY2tlciwgaXNDb3JlLCB0aGlzLm9wdGlvbnMuc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycyB8fCBmYWxzZSxcbiAgICAgICAgICBpbmplY3RhYmxlUmVnaXN0cnksIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciksXG4gICAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVhZGVyLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIHJlZmVyZW5jZXNSZWdpc3RyeSwgaXNDb3JlLFxuICAgICAgICAgIHJvdXRlQW5hbHl6ZXIsIHJlZkVtaXR0ZXIsIHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciwgZGVmYXVsdEltcG9ydFRyYWNrZXIsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLCBpbmplY3RhYmxlUmVnaXN0cnksIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcixcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaTE4bkluTG9jYWxlKSxcbiAgICBdO1xuXG4gICAgY29uc3QgdHJhaXRDb21waWxlciA9IG5ldyBUcmFpdENvbXBpbGVyKFxuICAgICAgICBoYW5kbGVycywgcmVmbGVjdG9yLCB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIsIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsXG4gICAgICAgIHRoaXMub3B0aW9ucy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICE9PSBmYWxzZSwgY29tcGlsYXRpb25Nb2RlLCBkdHNUcmFuc2Zvcm1zLFxuICAgICAgICBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcik7XG5cbiAgICAvLyBUZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1heSB1c2UgdGhlIGBQcm9ncmFtRHJpdmVyYCB0byBwcm9kdWNlIG5ldyBgdHMuUHJvZ3JhbWAocykuIElmIHRoaXNcbiAgICAvLyBoYXBwZW5zLCB0aGV5IG5lZWQgdG8gYmUgdHJhY2tlZCBieSB0aGUgYE5nQ29tcGlsZXJgLlxuICAgIGNvbnN0IG5vdGlmeWluZ0RyaXZlciA9XG4gICAgICAgIG5ldyBOb3RpZnlpbmdQcm9ncmFtRHJpdmVyV3JhcHBlcih0aGlzLnByb2dyYW1Ecml2ZXIsIChwcm9ncmFtOiB0cy5Qcm9ncmFtKSA9PiB7XG4gICAgICAgICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsRHJpdmVyKHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsIHByb2dyYW0pO1xuICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuICAgICAgICB9KTtcblxuICAgIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSBuZXcgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwoXG4gICAgICAgIHRoaXMuaW5wdXRQcm9ncmFtLCBub3RpZnlpbmdEcml2ZXIsIHRyYWl0Q29tcGlsZXIsIHRoaXMuZ2V0VHlwZUNoZWNraW5nQ29uZmlnKCksIHJlZkVtaXR0ZXIsXG4gICAgICAgIHJlZmxlY3RvciwgdGhpcy5hZGFwdGVyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyLCBzY29wZVJlZ2lzdHJ5LCB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlzQ29yZSxcbiAgICAgIHRyYWl0Q29tcGlsZXIsXG4gICAgICByZWZsZWN0b3IsXG4gICAgICBzY29wZVJlZ2lzdHJ5LFxuICAgICAgZHRzVHJhbnNmb3JtcyxcbiAgICAgIGV4cG9ydFJlZmVyZW5jZUdyYXBoLFxuICAgICAgcm91dGVBbmFseXplcixcbiAgICAgIG13cFNjYW5uZXIsXG4gICAgICBtZXRhUmVhZGVyLFxuICAgICAgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSxcbiAgICAgIGRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgYWxpYXNpbmdIb3N0LFxuICAgICAgcmVmRW1pdHRlcixcbiAgICAgIHRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICByZXNvdXJjZVJlZ2lzdHJ5LFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgdGhlIGdpdmVuIGBQcm9ncmFtYCBpcyBAYW5ndWxhci9jb3JlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVBhY2thZ2UocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IGJvb2xlYW4ge1xuICAvLyBMb29rIGZvciBpdHNfanVzdF9hbmd1bGFyLnRzIHNvbWV3aGVyZSBpbiB0aGUgcHJvZ3JhbS5cbiAgY29uc3QgcjNTeW1ib2xzID0gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtKTtcbiAgaWYgKHIzU3ltYm9scyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIExvb2sgZm9yIHRoZSBjb25zdGFudCBJVFNfSlVTVF9BTkdVTEFSIGluIHRoYXQgZmlsZS5cbiAgcmV0dXJuIHIzU3ltYm9scy5zdGF0ZW1lbnRzLnNvbWUoc3RtdCA9PiB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBtdXN0IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gc3RhdGVtZW50LlxuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGJlIGV4cG9ydGVkLlxuICAgIGlmIChzdG10Lm1vZGlmaWVycyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICFzdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGRlY2xhcmUgSVRTX0pVU1RfQU5HVUxBUi5cbiAgICByZXR1cm4gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLnNvbWUoZGVjbCA9PiB7XG4gICAgICAvLyBUaGUgZGVjbGFyYXRpb24gbXVzdCBtYXRjaCB0aGUgbmFtZS5cbiAgICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkgfHwgZGVjbC5uYW1lLnRleHQgIT09ICdJVFNfSlVTVF9BTkdVTEFSJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBJdCBtdXN0IGluaXRpYWxpemUgdGhlIHZhcmlhYmxlIHRvIHRydWUuXG4gICAgICBpZiAoZGVjbC5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkIHx8IGRlY2wuaW5pdGlhbGl6ZXIua2luZCAhPT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGRlZmluaXRpb24gbWF0Y2hlcy5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSAncjNfc3ltYm9scy50cycgZmlsZSBpbiB0aGUgZ2l2ZW4gYFByb2dyYW1gLCBvciByZXR1cm4gYG51bGxgIGlmIGl0IHdhc24ndCB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maW5kKGZpbGUgPT4gZmlsZS5maWxlTmFtZS5pbmRleE9mKCdyM19zeW1ib2xzLnRzJykgPj0gMCkgfHwgbnVsbDtcbn1cblxuLyoqXG4gKiBTaW5jZSBcInN0cmljdFRlbXBsYXRlc1wiIGlzIGEgdHJ1ZSBzdXBlcnNldCBvZiB0eXBlIGNoZWNraW5nIGNhcGFiaWxpdGllcyBjb21wYXJlZCB0b1xuICogXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiwgaXQgaXMgcmVxdWlyZWQgdGhhdCB0aGUgbGF0dGVyIGlzIG5vdCBleHBsaWNpdGx5IGRpc2FibGVkIGlmIHRoZVxuICogZm9ybWVyIGlzIGVuYWJsZWQuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zKG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zKTogdHMuRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKG9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrID09PSBmYWxzZSAmJiBvcHRpb25zLnN0cmljdFRlbXBsYXRlcyA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLkNPTkZJR19TVFJJQ1RfVEVNUExBVEVTX0lNUExJRVNfRlVMTF9URU1QTEFURV9UWVBFQ0hFQ0spLFxuICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgc3RhcnQ6IHVuZGVmaW5lZCxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgYEFuZ3VsYXIgY29tcGlsZXIgb3B0aW9uIFwic3RyaWN0VGVtcGxhdGVzXCIgaXMgZW5hYmxlZCwgaG93ZXZlciBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIGRpc2FibGVkLlxuXG5IYXZpbmcgdGhlIFwic3RyaWN0VGVtcGxhdGVzXCIgZmxhZyBlbmFibGVkIGltcGxpZXMgdGhhdCBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIGFsc28gZW5hYmxlZCwgc29cbnRoZSBsYXR0ZXIgY2FuIG5vdCBiZSBleHBsaWNpdGx5IGRpc2FibGVkLlxuXG5PbmUgb2YgdGhlIGZvbGxvd2luZyBhY3Rpb25zIGlzIHJlcXVpcmVkOlxuMS4gUmVtb3ZlIHRoZSBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIG9wdGlvbi5cbjIuIFJlbW92ZSBcInN0cmljdFRlbXBsYXRlc1wiIG9yIHNldCBpdCB0byAnZmFsc2UnLlxuXG5Nb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB0ZW1wbGF0ZSB0eXBlIGNoZWNraW5nIGNvbXBpbGVyIG9wdGlvbnMgY2FuIGJlIGZvdW5kIGluIHRoZSBkb2N1bWVudGF0aW9uOlxuaHR0cHM6Ly92OS5hbmd1bGFyLmlvL2d1aWRlL3RlbXBsYXRlLXR5cGVjaGVjayN0ZW1wbGF0ZS10eXBlLWNoZWNraW5nYCxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmNsYXNzIFJlZmVyZW5jZUdyYXBoQWRhcHRlciBpbXBsZW1lbnRzIFJlZmVyZW5jZXNSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZ3JhcGg6IFJlZmVyZW5jZUdyYXBoKSB7fVxuXG4gIGFkZChzb3VyY2U6IERlY2xhcmF0aW9uTm9kZSwgLi4ucmVmZXJlbmNlczogUmVmZXJlbmNlPERlY2xhcmF0aW9uTm9kZT5bXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qge25vZGV9IG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCBzb3VyY2VGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNvdXJjZUZpbGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IHJlY29yZCBsb2NhbCByZWZlcmVuY2VzIChub3QgcmVmZXJlbmNlcyBpbnRvIC5kLnRzIGZpbGVzKS5cbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQgfHwgIWlzRHRzUGF0aChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICB0aGlzLmdyYXBoLmFkZChzb3VyY2UsIG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBOb3RpZnlpbmdQcm9ncmFtRHJpdmVyV3JhcHBlciBpbXBsZW1lbnRzIFByb2dyYW1Ecml2ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZGVsZWdhdGU6IFByb2dyYW1Ecml2ZXIsIHByaXZhdGUgbm90aWZ5TmV3UHJvZ3JhbTogKHByb2dyYW06IHRzLlByb2dyYW0pID0+IHZvaWQpIHt9XG5cbiAgZ2V0IHN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucygpIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5zdXBwb3J0c0lubGluZU9wZXJhdGlvbnM7XG4gIH1cblxuICBnZXRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFByb2dyYW0oKTtcbiAgfVxuXG4gIHVwZGF0ZUZpbGVzKGNvbnRlbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4sIHVwZGF0ZU1vZGU6IFVwZGF0ZU1vZGUpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLnVwZGF0ZUZpbGVzKGNvbnRlbnRzLCB1cGRhdGVNb2RlKTtcbiAgICB0aGlzLm5vdGlmeU5ld1Byb2dyYW0odGhpcy5kZWxlZ2F0ZS5nZXRQcm9ncmFtKCkpO1xuICB9XG59XG4iXX0=