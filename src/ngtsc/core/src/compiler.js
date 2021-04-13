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
                new annotations_1.ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, this.resourceManager, this.adapter.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.usePoisonedData, this.options.i18nNormalizeLineEndingsInICUs, this.moduleResolver, this.cycleAnalyzer, cycleHandlingStrategy, refEmitter, this.incrementalDriver.depGraph, injectableRegistry, semanticDepGraphUpdater, this.closureCompilerEnabled, this.delegatingPerfRecorder),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsMkVBQStNO0lBQy9NLGlFQUErRTtJQUMvRSwyRUFBbUg7SUFDbkgsMkVBQXlFO0lBQ3pFLDJFQUE2RTtJQUM3RSxtRUFBK1g7SUFDL1gsMkVBQThFO0lBRTlFLG1FQUFrRjtJQUNsRixxRUFBeU07SUFDek0sMkZBQXFFO0lBQ3JFLHVGQUF5RDtJQUN6RCw2REFBNEc7SUFFNUcseUVBQW9HO0lBQ3BHLHFFQUFxRDtJQUNyRCxtRUFBc0U7SUFDdEUsK0RBQW1JO0lBQ25JLCtEQUFzRDtJQUN0RCxpRUFBZ0Q7SUFDaEQsdUVBQWdMO0lBQ2hMLHVFQUF3RDtJQUN4RCxxRUFBeUY7SUFDekYsa0ZBQTRGO0lBRzVGLDBFQUFzRTtJQXlCdEU7O09BRUc7SUFDSCxJQUFZLHFCQUlYO0lBSkQsV0FBWSxxQkFBcUI7UUFDL0IsbUVBQUssQ0FBQTtRQUNMLG1HQUFxQixDQUFBO1FBQ3JCLCtGQUFtQixDQUFBO0lBQ3JCLENBQUMsRUFKVyxxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQUloQztJQWlERDs7T0FFRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxTQUFxQixFQUFFLE9BQTBCLEVBQ2pELHdCQUFrRCxFQUFFLGFBQTRCLEVBQ2hGLFlBQXFDLEVBQUUseUJBQWtDLEVBQ3pFLGVBQXdCO1FBQzFCLE9BQU87WUFDTCxJQUFJLEVBQUUscUJBQXFCLENBQUMsS0FBSztZQUNqQyxTQUFTLFdBQUE7WUFDVCxPQUFPLFNBQUE7WUFDUCx3QkFBd0IsMEJBQUE7WUFDeEIsYUFBYSxlQUFBO1lBQ2IseUJBQXlCLDJCQUFBO1lB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SUFnQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5LCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEN5Y2xlSGFuZGxpbmdTdHJhdGVneSwgSW1wb3J0R3JhcGh9IGZyb20gJy4uLy4uL2N5Y2xlcyc7XG5pbXBvcnQge0NPTVBJTEVSX0VSUk9SU19XSVRIX0dVSURFUywgRVJST1JfREVUQUlMU19QQUdFX0JBU0VfVVJMLCBFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2NoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIFJlZmVyZW5jZUdyYXBofSBmcm9tICcuLi8uLi9lbnRyeV9wb2ludCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBMb2dpY2FsRmlsZVN5c3RlbSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5LCBBbGlhc2luZ0hvc3QsIEFsaWFzU3RyYXRlZ3ksIERlZmF1bHRJbXBvcnRUcmFja2VyLCBJbXBvcnRSZXdyaXRlciwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXRTdHJhdGVneSwgUmVmZXJlbmNlRW1pdHRlciwgUmVsYXRpdmVQYXRoU3RyYXRlZ3ksIFVuaWZpZWRNb2R1bGVzQWxpYXNpbmdIb3N0LCBVbmlmaWVkTW9kdWxlc1N0cmF0ZWd5fSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBJbmNyZW1lbnRhbERyaXZlcn0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvc2VtYW50aWNfZ3JhcGgnO1xuaW1wb3J0IHtnZW5lcmF0ZUFuYWx5c2lzLCBJbmRleGVkQ29tcG9uZW50LCBJbmRleGluZ0NvbnRleHR9IGZyb20gJy4uLy4uL2luZGV4ZXInO1xuaW1wb3J0IHtDb21wb25lbnRSZXNvdXJjZXMsIENvbXBvdW5kTWV0YWRhdGFSZWFkZXIsIENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgRHRzTWV0YWRhdGFSZWFkZXIsIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBMb2NhbE1ldGFkYXRhUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyLCBSZXNvdXJjZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnNTY2FubmVyfSBmcm9tICcuLi8uLi9tb2R1bGV3aXRocHJvdmlkZXJzJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtBY3RpdmVQZXJmUmVjb3JkZXIsIERlbGVnYXRpbmdQZXJmUmVjb3JkZXIsIFBlcmZDaGVja3BvaW50LCBQZXJmRXZlbnQsIFBlcmZQaGFzZX0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge1Byb2dyYW1Ecml2ZXIsIFVwZGF0ZU1vZGV9IGZyb20gJy4uLy4uL3Byb2dyYW1fZHJpdmVyJztcbmltcG9ydCB7RGVjbGFyYXRpb25Ob2RlLCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbiwgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QWRhcHRlclJlc291cmNlTG9hZGVyfSBmcm9tICcuLi8uLi9yZXNvdXJjZSc7XG5pbXBvcnQge2VudHJ5UG9pbnRLZXlGb3IsIE5nTW9kdWxlUm91dGVBbmFseXplcn0gZnJvbSAnLi4vLi4vcm91dGluZyc7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlciwgVHlwZUNoZWNrU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtfSBmcm9tICcuLi8uLi9zaGltcyc7XG5pbXBvcnQge2l2eVN3aXRjaFRyYW5zZm9ybX0gZnJvbSAnLi4vLi4vc3dpdGNoJztcbmltcG9ydCB7YWxpYXNUcmFuc2Zvcm1GYWN0b3J5LCBDb21waWxhdGlvbk1vZGUsIGRlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeSwgRGVjb3JhdG9ySGFuZGxlciwgRHRzVHJhbnNmb3JtUmVnaXN0cnksIGl2eVRyYW5zZm9ybUZhY3RvcnksIFRyYWl0Q29tcGlsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge1RlbXBsYXRlVHlwZUNoZWNrZXJJbXBsfSBmcm9tICcuLi8uLi90eXBlY2hlY2snO1xuaW1wb3J0IHtPcHRpbWl6ZUZvciwgVGVtcGxhdGVUeXBlQ2hlY2tlciwgVHlwZUNoZWNraW5nQ29uZmlnfSBmcm9tICcuLi8uLi90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZU9yTnVsbCwgaXNEdHNQYXRoLCByZXNvbHZlTW9kdWxlTmFtZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0xhenlSb3V0ZSwgTmdDb21waWxlckFkYXB0ZXIsIE5nQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2NvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzfSBmcm9tICcuL2NvbmZpZyc7XG5cbi8qKlxuICogU3RhdGUgaW5mb3JtYXRpb24gYWJvdXQgYSBjb21waWxhdGlvbiB3aGljaCBpcyBvbmx5IGdlbmVyYXRlZCBvbmNlIHNvbWUgZGF0YSBpcyByZXF1ZXN0ZWQgZnJvbVxuICogdGhlIGBOZ0NvbXBpbGVyYCAoZm9yIGV4YW1wbGUsIGJ5IGNhbGxpbmcgYGdldERpYWdub3N0aWNzYCkuXG4gKi9cbmludGVyZmFjZSBMYXp5Q29tcGlsYXRpb25TdGF0ZSB7XG4gIGlzQ29yZTogYm9vbGVhbjtcbiAgdHJhaXRDb21waWxlcjogVHJhaXRDb21waWxlcjtcbiAgcmVmbGVjdG9yOiBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3Q7XG4gIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyO1xuICBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnk7XG4gIHR5cGVDaGVja1Njb3BlUmVnaXN0cnk6IFR5cGVDaGVja1Njb3BlUmVnaXN0cnk7XG4gIGV4cG9ydFJlZmVyZW5jZUdyYXBoOiBSZWZlcmVuY2VHcmFwaHxudWxsO1xuICByb3V0ZUFuYWx5emVyOiBOZ01vZHVsZVJvdXRlQW5hbHl6ZXI7XG4gIGR0c1RyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVJlZ2lzdHJ5O1xuICBtd3BTY2FubmVyOiBNb2R1bGVXaXRoUHJvdmlkZXJzU2Nhbm5lcjtcbiAgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbDtcbiAgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcjtcbiAgdGVtcGxhdGVUeXBlQ2hlY2tlcjogVGVtcGxhdGVUeXBlQ2hlY2tlcjtcbiAgcmVzb3VyY2VSZWdpc3RyeTogUmVzb3VyY2VSZWdpc3RyeTtcbn1cblxuXG5cbi8qKlxuICogRGlzY3JpbWluYW50IHR5cGUgZm9yIGEgYENvbXBpbGF0aW9uVGlja2V0YC5cbiAqL1xuZXhwb3J0IGVudW0gQ29tcGlsYXRpb25UaWNrZXRLaW5kIHtcbiAgRnJlc2gsXG4gIEluY3JlbWVudGFsVHlwZVNjcmlwdCxcbiAgSW5jcmVtZW50YWxSZXNvdXJjZSxcbn1cblxuLyoqXG4gKiBCZWdpbiBhbiBBbmd1bGFyIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiBmcm9tIHNjcmF0Y2guXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRnJlc2hDb21waWxhdGlvblRpY2tldCB7XG4gIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5GcmVzaDtcbiAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnM7XG4gIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5O1xuICBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyO1xuICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuO1xuICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW47XG4gIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXI7XG59XG5cbi8qKlxuICogQmVnaW4gYW4gQW5ndWxhciBjb21waWxhdGlvbiBvcGVyYXRpb24gdGhhdCBpbmNvcnBvcmF0ZXMgY2hhbmdlcyB0byBUeXBlU2NyaXB0IGNvZGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW5jcmVtZW50YWxUeXBlU2NyaXB0Q29tcGlsYXRpb25UaWNrZXQge1xuICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0O1xuICBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucztcbiAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k7XG4gIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXI7XG4gIG5ld0RyaXZlcjogSW5jcmVtZW50YWxEcml2ZXI7XG4gIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbjtcbiAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5jcmVtZW50YWxSZXNvdXJjZUNvbXBpbGF0aW9uVGlja2V0IHtcbiAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsUmVzb3VyY2U7XG4gIGNvbXBpbGVyOiBOZ0NvbXBpbGVyO1xuICBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+O1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuLyoqXG4gKiBBIHJlcXVlc3QgdG8gYmVnaW4gQW5ndWxhciBjb21waWxhdGlvbiwgZWl0aGVyIHN0YXJ0aW5nIGZyb20gc2NyYXRjaCBvciBmcm9tIGEga25vd24gcHJpb3Igc3RhdGUuXG4gKlxuICogYENvbXBpbGF0aW9uVGlja2V0YHMgYXJlIHVzZWQgdG8gaW5pdGlhbGl6ZSAob3IgdXBkYXRlKSBhbiBgTmdDb21waWxlcmAgaW5zdGFuY2UsIHRoZSBjb3JlIG9mIHRoZVxuICogQW5ndWxhciBjb21waWxlci4gVGhleSBhYnN0cmFjdCB0aGUgc3RhcnRpbmcgc3RhdGUgb2YgY29tcGlsYXRpb24gYW5kIGFsbG93IGBOZ0NvbXBpbGVyYCB0byBiZVxuICogbWFuYWdlZCBpbmRlcGVuZGVudGx5IG9mIGFueSBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiBsaWZlY3ljbGUuXG4gKi9cbmV4cG9ydCB0eXBlIENvbXBpbGF0aW9uVGlja2V0ID0gRnJlc2hDb21waWxhdGlvblRpY2tldHxJbmNyZW1lbnRhbFR5cGVTY3JpcHRDb21waWxhdGlvblRpY2tldHxcbiAgICBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQ7XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBmb3IgYSBicmFuZCBuZXcgY29tcGlsYXRpb24sIHVzaW5nIG5vIHByaW9yIHN0YXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJlc2hDb21waWxhdGlvblRpY2tldChcbiAgICB0c1Byb2dyYW06IHRzLlByb2dyYW0sIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyfG51bGwsIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW4sXG4gICAgdXNlUG9pc29uZWREYXRhOiBib29sZWFuKTogQ29tcGlsYXRpb25UaWNrZXQge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5GcmVzaCxcbiAgICB0c1Byb2dyYW0sXG4gICAgb3B0aW9ucyxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgcHJvZ3JhbURyaXZlcixcbiAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgIHVzZVBvaXNvbmVkRGF0YSxcbiAgICBwZXJmUmVjb3JkZXI6IHBlcmZSZWNvcmRlciA/PyBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKSxcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGFzIGVmZmljaWVudGx5IGFzIHBvc3NpYmxlLCBiYXNlZCBvbiBhIHByZXZpb3VzIGBOZ0NvbXBpbGVyYFxuICogaW5zdGFuY2UgYW5kIGEgbmV3IGB0cy5Qcm9ncmFtYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluY3JlbWVudGFsRnJvbUNvbXBpbGVyVGlja2V0KFxuICAgIG9sZENvbXBpbGVyOiBOZ0NvbXBpbGVyLCBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz4sIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyfG51bGwpOiBDb21waWxhdGlvblRpY2tldCB7XG4gIGNvbnN0IG9sZFByb2dyYW0gPSBvbGRDb21waWxlci5nZXRDdXJyZW50UHJvZ3JhbSgpO1xuICBjb25zdCBvbGREcml2ZXIgPSBvbGRDb21waWxlci5pbmNyZW1lbnRhbFN0cmF0ZWd5LmdldEluY3JlbWVudGFsRHJpdmVyKG9sZFByb2dyYW0pO1xuICBpZiAob2xkRHJpdmVyID09PSBudWxsKSB7XG4gICAgLy8gTm8gaW5jcmVtZW50YWwgc3RlcCBpcyBwb3NzaWJsZSBoZXJlLCBzaW5jZSBubyBJbmNyZW1lbnRhbERyaXZlciB3YXMgZm91bmQgZm9yIHRoZSBvbGRcbiAgICAvLyBwcm9ncmFtLlxuICAgIHJldHVybiBmcmVzaENvbXBpbGF0aW9uVGlja2V0KFxuICAgICAgICBuZXdQcm9ncmFtLCBvbGRDb21waWxlci5vcHRpb25zLCBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIHByb2dyYW1Ecml2ZXIsIHBlcmZSZWNvcmRlcixcbiAgICAgICAgb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciwgb2xkQ29tcGlsZXIudXNlUG9pc29uZWREYXRhKTtcbiAgfVxuXG4gIGlmIChwZXJmUmVjb3JkZXIgPT09IG51bGwpIHtcbiAgICBwZXJmUmVjb3JkZXIgPSBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKTtcbiAgfVxuXG4gIGNvbnN0IG5ld0RyaXZlciA9IEluY3JlbWVudGFsRHJpdmVyLnJlY29uY2lsZShcbiAgICAgIG9sZFByb2dyYW0sIG9sZERyaXZlciwgbmV3UHJvZ3JhbSwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzLCBwZXJmUmVjb3JkZXIpO1xuXG4gIHJldHVybiB7XG4gICAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsVHlwZVNjcmlwdCxcbiAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBvbGRDb21waWxlci5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgIHVzZVBvaXNvbmVkRGF0YTogb2xkQ29tcGlsZXIudXNlUG9pc29uZWREYXRhLFxuICAgIG9wdGlvbnM6IG9sZENvbXBpbGVyLm9wdGlvbnMsXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgIHByb2dyYW1Ecml2ZXIsXG4gICAgbmV3RHJpdmVyLFxuICAgIG9sZFByb2dyYW0sXG4gICAgbmV3UHJvZ3JhbSxcbiAgICBwZXJmUmVjb3JkZXIsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBkaXJlY3RseSBmcm9tIGFuIG9sZCBgdHMuUHJvZ3JhbWAgYW5kIGFzc29jaWF0ZWQgQW5ndWxhciBjb21waWxhdGlvblxuICogc3RhdGUsIGFsb25nIHdpdGggYSBuZXcgYHRzLlByb2dyYW1gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50YWxGcm9tRHJpdmVyVGlja2V0KFxuICAgIG9sZFByb2dyYW06IHRzLlByb2dyYW0sIG9sZERyaXZlcjogSW5jcmVtZW50YWxEcml2ZXIsIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXIsIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz4sXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXJ8bnVsbCwgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbixcbiAgICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4pOiBDb21waWxhdGlvblRpY2tldCB7XG4gIGlmIChwZXJmUmVjb3JkZXIgPT09IG51bGwpIHtcbiAgICBwZXJmUmVjb3JkZXIgPSBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKTtcbiAgfVxuICBjb25zdCBuZXdEcml2ZXIgPSBJbmNyZW1lbnRhbERyaXZlci5yZWNvbmNpbGUoXG4gICAgICBvbGRQcm9ncmFtLCBvbGREcml2ZXIsIG5ld1Byb2dyYW0sIG1vZGlmaWVkUmVzb3VyY2VGaWxlcywgcGVyZlJlY29yZGVyKTtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICAgIG9sZFByb2dyYW0sXG4gICAgbmV3UHJvZ3JhbSxcbiAgICBvcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBuZXdEcml2ZXIsXG4gICAgcHJvZ3JhbURyaXZlcixcbiAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgIHVzZVBvaXNvbmVkRGF0YSxcbiAgICBwZXJmUmVjb3JkZXIsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvdXJjZUNoYW5nZVRpY2tldChjb21waWxlcjogTmdDb21waWxlciwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8c3RyaW5nPik6XG4gICAgSW5jcmVtZW50YWxSZXNvdXJjZUNvbXBpbGF0aW9uVGlja2V0IHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZSxcbiAgICBjb21waWxlcixcbiAgICBtb2RpZmllZFJlc291cmNlRmlsZXMsXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKSxcbiAgfTtcbn1cblxuXG4vKipcbiAqIFRoZSBoZWFydCBvZiB0aGUgQW5ndWxhciBJdnkgY29tcGlsZXIuXG4gKlxuICogVGhlIGBOZ0NvbXBpbGVyYCBwcm92aWRlcyBhbiBBUEkgZm9yIHBlcmZvcm1pbmcgQW5ndWxhciBjb21waWxhdGlvbiB3aXRoaW4gYSBjdXN0b20gVHlwZVNjcmlwdFxuICogY29tcGlsZXIuIEVhY2ggaW5zdGFuY2Ugb2YgYE5nQ29tcGlsZXJgIHN1cHBvcnRzIGEgc2luZ2xlIGNvbXBpbGF0aW9uLCB3aGljaCBtaWdodCBiZVxuICogaW5jcmVtZW50YWwuXG4gKlxuICogYE5nQ29tcGlsZXJgIGlzIGxhenksIGFuZCBkb2VzIG5vdCBwZXJmb3JtIGFueSBvZiB0aGUgd29yayBvZiB0aGUgY29tcGlsYXRpb24gdW50aWwgb25lIG9mIGl0c1xuICogb3V0cHV0IG1ldGhvZHMgKGUuZy4gYGdldERpYWdub3N0aWNzYCkgaXMgY2FsbGVkLlxuICpcbiAqIFNlZSB0aGUgUkVBRE1FLm1kIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgTmdDb21waWxlciB7XG4gIC8qKlxuICAgKiBMYXppbHkgZXZhbHVhdGVkIHN0YXRlIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhpcyBpcyBjcmVhdGVkIG9uIGRlbWFuZCBieSBjYWxsaW5nIGBlbnN1cmVBbmFseXplZGAuXG4gICAqL1xuICBwcml2YXRlIGNvbXBpbGF0aW9uOiBMYXp5Q29tcGlsYXRpb25TdGF0ZXxudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogQW55IGRpYWdub3N0aWNzIHJlbGF0ZWQgdG8gdGhlIGNvbnN0cnVjdGlvbiBvZiB0aGUgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIFRoZXNlIGFyZSBkaWFnbm9zdGljcyB3aGljaCBhcm9zZSBkdXJpbmcgc2V0dXAgb2YgdGhlIGhvc3QgYW5kL29yIHByb2dyYW0uXG4gICAqL1xuICBwcml2YXRlIGNvbnN0cnVjdGlvbkRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAvKipcbiAgICogTm9uLXRlbXBsYXRlIGRpYWdub3N0aWNzIHJlbGF0ZWQgdG8gdGhlIHByb2dyYW0gaXRzZWxmLiBEb2VzIG5vdCBpbmNsdWRlIHRlbXBsYXRlXG4gICAqIGRpYWdub3N0aWNzIGJlY2F1c2UgdGhlIHRlbXBsYXRlIHR5cGUgY2hlY2tlciBtZW1vaXplcyB0aGVtIGl0c2VsZi5cbiAgICpcbiAgICogVGhpcyBpcyBzZXQgYnkgKGFuZCBtZW1vaXplcykgYGdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3NgLlxuICAgKi9cbiAgcHJpdmF0ZSBub25UZW1wbGF0ZURpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW118bnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBjbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGN1cnJlbnRQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIGVudHJ5UG9pbnQ6IHRzLlNvdXJjZUZpbGV8bnVsbDtcbiAgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXI7XG4gIHByaXZhdGUgcmVzb3VyY2VNYW5hZ2VyOiBBZGFwdGVyUmVzb3VyY2VMb2FkZXI7XG4gIHByaXZhdGUgY3ljbGVBbmFseXplcjogQ3ljbGVBbmFseXplcjtcbiAgcmVhZG9ubHkgaWdub3JlRm9yRGlhZ25vc3RpY3M6IFNldDx0cy5Tb3VyY2VGaWxlPjtcbiAgcmVhZG9ubHkgaWdub3JlRm9yRW1pdDogU2V0PHRzLlNvdXJjZUZpbGU+O1xuXG4gIC8qKlxuICAgKiBgTmdDb21waWxlcmAgY2FuIGJlIHJldXNlZCBmb3IgbXVsdGlwbGUgY29tcGlsYXRpb25zIChmb3IgcmVzb3VyY2Utb25seSBjaGFuZ2VzKSwgYW5kIGVhY2hcbiAgICogbmV3IGNvbXBpbGF0aW9uIHVzZXMgYSBmcmVzaCBgUGVyZlJlY29yZGVyYC4gVGh1cywgY2xhc3NlcyBjcmVhdGVkIHdpdGggYSBsaWZlc3BhbiBvZiB0aGVcbiAgICogYE5nQ29tcGlsZXJgIHVzZSBhIGBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyYCBzbyB0aGUgYFBlcmZSZWNvcmRlcmAgdGhleSB3cml0ZSB0byBjYW4gYmUgdXBkYXRlZFxuICAgKiB3aXRoIGVhY2ggZnJlc2ggY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGRlbGVnYXRpbmdQZXJmUmVjb3JkZXIgPSBuZXcgRGVsZWdhdGluZ1BlcmZSZWNvcmRlcih0aGlzLnBlcmZSZWNvcmRlcik7XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGludG8gYW4gYE5nQ29tcGlsZXJgIGluc3RhbmNlIGZvciB0aGUgcmVxdWVzdGVkIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBEZXBlbmRpbmcgb24gdGhlIG5hdHVyZSBvZiB0aGUgY29tcGlsYXRpb24gcmVxdWVzdCwgdGhlIGBOZ0NvbXBpbGVyYCBpbnN0YW5jZSBtYXkgYmUgcmV1c2VkXG4gICAqIGZyb20gYSBwcmV2aW91cyBjb21waWxhdGlvbiBhbmQgdXBkYXRlZCB3aXRoIGFueSBjaGFuZ2VzLCBpdCBtYXkgYmUgYSBuZXcgaW5zdGFuY2Ugd2hpY2hcbiAgICogaW5jcmVtZW50YWxseSByZXVzZXMgc3RhdGUgZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uLCBvciBpdCBtYXkgcmVwcmVzZW50IGEgZnJlc2hcbiAgICogY29tcGlsYXRpb24gZW50aXJlbHkuXG4gICAqL1xuICBzdGF0aWMgZnJvbVRpY2tldCh0aWNrZXQ6IENvbXBpbGF0aW9uVGlja2V0LCBhZGFwdGVyOiBOZ0NvbXBpbGVyQWRhcHRlcikge1xuICAgIHN3aXRjaCAodGlja2V0LmtpbmQpIHtcbiAgICAgIGNhc2UgQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoOlxuICAgICAgICByZXR1cm4gbmV3IE5nQ29tcGlsZXIoXG4gICAgICAgICAgICBhZGFwdGVyLFxuICAgICAgICAgICAgdGlja2V0Lm9wdGlvbnMsXG4gICAgICAgICAgICB0aWNrZXQudHNQcm9ncmFtLFxuICAgICAgICAgICAgdGlja2V0LnByb2dyYW1Ecml2ZXIsXG4gICAgICAgICAgICB0aWNrZXQuaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgICAgICAgICAgSW5jcmVtZW50YWxEcml2ZXIuZnJlc2godGlja2V0LnRzUHJvZ3JhbSksXG4gICAgICAgICAgICB0aWNrZXQuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgICAgIHRpY2tldC51c2VQb2lzb25lZERhdGEsXG4gICAgICAgICAgICB0aWNrZXQucGVyZlJlY29yZGVyLFxuICAgICAgICApO1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0OlxuICAgICAgICByZXR1cm4gbmV3IE5nQ29tcGlsZXIoXG4gICAgICAgICAgICBhZGFwdGVyLFxuICAgICAgICAgICAgdGlja2V0Lm9wdGlvbnMsXG4gICAgICAgICAgICB0aWNrZXQubmV3UHJvZ3JhbSxcbiAgICAgICAgICAgIHRpY2tldC5wcm9ncmFtRHJpdmVyLFxuICAgICAgICAgICAgdGlja2V0LmluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICAgICAgICAgIHRpY2tldC5uZXdEcml2ZXIsXG4gICAgICAgICAgICB0aWNrZXQuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgICAgIHRpY2tldC51c2VQb2lzb25lZERhdGEsXG4gICAgICAgICAgICB0aWNrZXQucGVyZlJlY29yZGVyLFxuICAgICAgICApO1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZTpcbiAgICAgICAgY29uc3QgY29tcGlsZXIgPSB0aWNrZXQuY29tcGlsZXI7XG4gICAgICAgIGNvbXBpbGVyLnVwZGF0ZVdpdGhDaGFuZ2VkUmVzb3VyY2VzKHRpY2tldC5tb2RpZmllZFJlc291cmNlRmlsZXMsIHRpY2tldC5wZXJmUmVjb3JkZXIpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXI7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgYWRhcHRlcjogTmdDb21waWxlckFkYXB0ZXIsXG4gICAgICByZWFkb25seSBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgaW5wdXRQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgcmVhZG9ubHkgcHJvZ3JhbURyaXZlcjogUHJvZ3JhbURyaXZlcixcbiAgICAgIHJlYWRvbmx5IGluY3JlbWVudGFsU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICAgIHJlYWRvbmx5IGluY3JlbWVudGFsRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlcixcbiAgICAgIHJlYWRvbmx5IGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW4sXG4gICAgICByZWFkb25seSB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGxpdmVQZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcixcbiAgKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuYWRhcHRlci5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcyk7XG4gICAgY29uc3QgaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMgPSB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xuICAgIGlmIChpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljKTtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gaW5wdXRQcm9ncmFtO1xuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhdGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID1cbiAgICAgICAgYWRhcHRlci5lbnRyeVBvaW50ICE9PSBudWxsID8gZ2V0U291cmNlRmlsZU9yTnVsbChpbnB1dFByb2dyYW0sIGFkYXB0ZXIuZW50cnlQb2ludCkgOiBudWxsO1xuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmFkYXB0ZXIuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgICAgICAvLyBkb2VuJ3QgcmV0YWluIGEgcmVmZXJlbmNlIHRvIGB0aGlzYCwgaWYgb3RoZXIgY2xvc3VyZXMgaW4gdGhlIGNvbnN0cnVjdG9yIGhlcmUgcmVmZXJlbmNlXG4gICAgICAgIC8vIGB0aGlzYCBpbnRlcm5hbGx5IHRoZW4gYSBjbG9zdXJlIGNyZWF0ZWQgaGVyZSB3b3VsZCByZXRhaW4gdGhlbS4gVGhpcyBjYW4gY2F1c2UgbWFqb3JcbiAgICAgICAgLy8gbWVtb3J5IGxlYWsgaXNzdWVzIHNpbmNlIHRoZSBgbW9kdWxlUmVzb2x1dGlvbkNhY2hlYCBpcyBhIGxvbmctbGl2ZWQgb2JqZWN0IGFuZCBmaW5kcyBpdHNcbiAgICAgICAgLy8gd2F5IGludG8gYWxsIGtpbmRzIG9mIHBsYWNlcyBpbnNpZGUgVFMgaW50ZXJuYWwgb2JqZWN0cy5cbiAgICAgICAgdGhpcy5hZGFwdGVyLmdldENhbm9uaWNhbEZpbGVOYW1lLmJpbmQodGhpcy5hZGFwdGVyKSk7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHZlciA9XG4gICAgICAgIG5ldyBNb2R1bGVSZXNvbHZlcihpbnB1dFByb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5hZGFwdGVyLCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUpO1xuICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyID0gbmV3IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcihhZGFwdGVyLCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMuY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKFxuICAgICAgICBuZXcgSW1wb3J0R3JhcGgoaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcikpO1xuICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneS5zZXRJbmNyZW1lbnRhbERyaXZlcih0aGlzLmluY3JlbWVudGFsRHJpdmVyLCBpbnB1dFByb2dyYW0pO1xuXG4gICAgdGhpcy5pZ25vcmVGb3JEaWFnbm9zdGljcyA9XG4gICAgICAgIG5ldyBTZXQoaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKHNmID0+IHRoaXMuYWRhcHRlci5pc1NoaW0oc2YpKSk7XG4gICAgdGhpcy5pZ25vcmVGb3JFbWl0ID0gdGhpcy5hZGFwdGVyLmlnbm9yZUZvckVtaXQ7XG5cbiAgICBsZXQgZHRzRmlsZUNvdW50ID0gMDtcbiAgICBsZXQgbm9uRHRzRmlsZUNvdW50ID0gMDtcbiAgICBmb3IgKGNvbnN0IHNmIG9mIGlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgZHRzRmlsZUNvdW50Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub25EdHNGaWxlQ291bnQrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsaXZlUGVyZlJlY29yZGVyLmV2ZW50Q291bnQoUGVyZkV2ZW50LklucHV0RHRzRmlsZSwgZHRzRmlsZUNvdW50KTtcbiAgICBsaXZlUGVyZlJlY29yZGVyLmV2ZW50Q291bnQoUGVyZkV2ZW50LklucHV0VHNGaWxlLCBub25EdHNGaWxlQ291bnQpO1xuICB9XG5cbiAgZ2V0IHBlcmZSZWNvcmRlcigpOiBBY3RpdmVQZXJmUmVjb3JkZXIge1xuICAgIHJldHVybiB0aGlzLmxpdmVQZXJmUmVjb3JkZXI7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVdpdGhDaGFuZ2VkUmVzb3VyY2VzKFxuICAgICAgY2hhbmdlZFJlc291cmNlczogU2V0PHN0cmluZz4sIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyKTogdm9pZCB7XG4gICAgdGhpcy5saXZlUGVyZlJlY29yZGVyID0gcGVyZlJlY29yZGVyO1xuICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlci50YXJnZXQgPSBwZXJmUmVjb3JkZXI7XG5cbiAgICBwZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuUmVzb3VyY2VVcGRhdGUsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICAgIC8vIEFuYWx5c2lzIGhhc24ndCBoYXBwZW5lZCB5ZXQsIHNvIG5vIHVwZGF0ZSBpcyBuZWNlc3NhcnkgLSBhbnkgY2hhbmdlcyB0byByZXNvdXJjZXMgd2lsbFxuICAgICAgICAvLyBiZSBjYXB0dXJlZCBieSB0aGUgaW5pdGFsIGFuYWx5c2lzIHBhc3MgaXRzZWxmLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyLmludmFsaWRhdGUoKTtcblxuICAgICAgY29uc3QgY2xhc3Nlc1RvVXBkYXRlID0gbmV3IFNldDxEZWNsYXJhdGlvbk5vZGU+KCk7XG4gICAgICBmb3IgKGNvbnN0IHJlc291cmNlRmlsZSBvZiBjaGFuZ2VkUmVzb3VyY2VzKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGVtcGxhdGVDbGFzcyBvZiB0aGlzLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKHJlc291cmNlRmlsZSkpIHtcbiAgICAgICAgICBjbGFzc2VzVG9VcGRhdGUuYWRkKHRlbXBsYXRlQ2xhc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBzdHlsZUNsYXNzIG9mIHRoaXMuZ2V0Q29tcG9uZW50c1dpdGhTdHlsZUZpbGUocmVzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIGNsYXNzZXNUb1VwZGF0ZS5hZGQoc3R5bGVDbGFzcyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBjbGF6eiBvZiBjbGFzc2VzVG9VcGRhdGUpIHtcbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLnVwZGF0ZVJlc291cmNlcyhjbGF6eik7XG4gICAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmludmFsaWRhdGVDbGFzcyhjbGF6eik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSBkZXBlbmRlbmNpZXMgb2YgYSBmaWxlLlxuICAgKlxuICAgKiBJZiB0aGUgZmlsZSBpcyBub3QgcGFydCBvZiB0aGUgY29tcGlsYXRpb24sIGFuIGVtcHR5IGFycmF5IHdpbGwgYmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXRSZXNvdXJjZURlcGVuZGVuY2llcyhmaWxlOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nW10ge1xuICAgIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIHJldHVybiB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmRlcEdyYXBoLmdldFJlc291cmNlRGVwZW5kZW5jaWVzKGZpbGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgQW5ndWxhci1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoXG4gICAgICAgIFsuLi50aGlzLmdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3MoKSwgLi4udGhpcy5nZXRUZW1wbGF0ZURpYWdub3N0aWNzKCldKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIEFuZ3VsYXItcmVsYXRlZCBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICpcbiAgICogSWYgYSBgdHMuU291cmNlRmlsZWAgaXMgcGFzc2VkLCBvbmx5IGRpYWdub3N0aWNzIHJlbGF0ZWQgdG8gdGhhdCBmaWxlIGFyZSByZXR1cm5lZC5cbiAgICovXG4gIGdldERpYWdub3N0aWNzRm9yRmlsZShmaWxlOiB0cy5Tb3VyY2VGaWxlLCBvcHRpbWl6ZUZvcjogT3B0aW1pemVGb3IpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmFkZE1lc3NhZ2VUZXh0RGV0YWlscyhbXG4gICAgICAuLi50aGlzLmdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3MoKS5maWx0ZXIoZGlhZyA9PiBkaWFnLmZpbGUgPT09IGZpbGUpLFxuICAgICAgLi4udGhpcy5nZXRUZW1wbGF0ZURpYWdub3N0aWNzRm9yRmlsZShmaWxlLCBvcHRpbWl6ZUZvcilcbiAgICBdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgQW5ndWxhci5pbyBlcnJvciBndWlkZSBsaW5rcyB0byBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgYWRkTWVzc2FnZVRleHREZXRhaWxzKGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10pOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiBkaWFnbm9zdGljcy5tYXAoZGlhZyA9PiB7XG4gICAgICBpZiAoZGlhZy5jb2RlICYmIENPTVBJTEVSX0VSUk9SU19XSVRIX0dVSURFUy5oYXMobmdFcnJvckNvZGUoZGlhZy5jb2RlKSkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5kaWFnLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OiBkaWFnLm1lc3NhZ2VUZXh0ICtcbiAgICAgICAgICAgICAgYC4gRmluZCBtb3JlIGF0ICR7RVJST1JfREVUQUlMU19QQUdFX0JBU0VfVVJMfS9ORyR7bmdFcnJvckNvZGUoZGlhZy5jb2RlKX1gXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gZGlhZztcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIHNldHVwLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqL1xuICBnZXRPcHRpb25EaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY3VycmVudCBgdHMuUHJvZ3JhbWAga25vd24gdG8gdGhpcyBgTmdDb21waWxlcmAuXG4gICAqXG4gICAqIENvbXBpbGF0aW9uIGJlZ2lucyB3aXRoIGFuIGlucHV0IGB0cy5Qcm9ncmFtYCwgYW5kIGR1cmluZyB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG9wZXJhdGlvbnMgbmV3XG4gICAqIGB0cy5Qcm9ncmFtYHMgbWF5IGJlIHByb2R1Y2VkIHVzaW5nIHRoZSBgUHJvZ3JhbURyaXZlcmAuIFRoZSBtb3N0IHJlY2VudCBzdWNoIGB0cy5Qcm9ncmFtYCB0b1xuICAgKiBiZSBwcm9kdWNlZCBpcyBhdmFpbGFibGUgaGVyZS5cbiAgICpcbiAgICogVGhpcyBgdHMuUHJvZ3JhbWAgc2VydmVzIHR3byBrZXkgcHVycG9zZXM6XG4gICAqXG4gICAqICogQXMgYW4gaW5jcmVtZW50YWwgc3RhcnRpbmcgcG9pbnQgZm9yIGNyZWF0aW5nIHRoZSBuZXh0IGB0cy5Qcm9ncmFtYCBiYXNlZCBvbiBmaWxlcyB0aGF0IHRoZVxuICAgKiAgIHVzZXIgaGFzIGNoYW5nZWQgKGZvciBjbGllbnRzIHVzaW5nIHRoZSBUUyBjb21waWxlciBwcm9ncmFtIEFQSXMpLlxuICAgKlxuICAgKiAqIEFzIHRoZSBcImJlZm9yZVwiIHBvaW50IGZvciBhbiBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiBpbnZvY2F0aW9uLCB0byBkZXRlcm1pbmUgd2hhdCdzIGNoYW5nZWRcbiAgICogICBiZXR3ZWVuIHRoZSBvbGQgYW5kIG5ldyBwcm9ncmFtcyAoZm9yIGFsbCBjb21waWxhdGlvbnMpLlxuICAgKi9cbiAgZ2V0Q3VycmVudFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFByb2dyYW07XG4gIH1cblxuICBnZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk6IFRlbXBsYXRlVHlwZUNoZWNrZXIge1xuICAgIGlmICghdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1RoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlcmAgZG9lcyBub3Qgd29yayB3aXRob3V0IGBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyYC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKS50ZW1wbGF0ZVR5cGVDaGVja2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgYHRzLkRlY2xhcmF0aW9uYHMgZm9yIGFueSBjb21wb25lbnQocykgd2hpY2ggdXNlIHRoZSBnaXZlbiB0ZW1wbGF0ZSBmaWxlLlxuICAgKi9cbiAgZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUodGVtcGxhdGVGaWxlUGF0aDogc3RyaW5nKTogUmVhZG9ubHlTZXQ8RGVjbGFyYXRpb25Ob2RlPiB7XG4gICAgY29uc3Qge3Jlc291cmNlUmVnaXN0cnl9ID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIHJldHVybiByZXNvdXJjZVJlZ2lzdHJ5LmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGUocmVzb2x2ZSh0ZW1wbGF0ZUZpbGVQYXRoKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBgdHMuRGVjbGFyYXRpb25gcyBmb3IgYW55IGNvbXBvbmVudChzKSB3aGljaCB1c2UgdGhlIGdpdmVuIHRlbXBsYXRlIGZpbGUuXG4gICAqL1xuICBnZXRDb21wb25lbnRzV2l0aFN0eWxlRmlsZShzdHlsZUZpbGVQYXRoOiBzdHJpbmcpOiBSZWFkb25seVNldDxEZWNsYXJhdGlvbk5vZGU+IHtcbiAgICBjb25zdCB7cmVzb3VyY2VSZWdpc3RyeX0gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIHJlc291cmNlUmVnaXN0cnkuZ2V0Q29tcG9uZW50c1dpdGhTdHlsZShyZXNvbHZlKHN0eWxlRmlsZVBhdGgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgZXh0ZXJuYWwgcmVzb3VyY2VzIGZvciB0aGUgZ2l2ZW4gY29tcG9uZW50LlxuICAgKi9cbiAgZ2V0Q29tcG9uZW50UmVzb3VyY2VzKGNsYXNzRGVjbDogRGVjbGFyYXRpb25Ob2RlKTogQ29tcG9uZW50UmVzb3VyY2VzfG51bGwge1xuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oY2xhc3NEZWNsKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHtyZXNvdXJjZVJlZ2lzdHJ5fSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBzdHlsZXMgPSByZXNvdXJjZVJlZ2lzdHJ5LmdldFN0eWxlcyhjbGFzc0RlY2wpO1xuICAgIGNvbnN0IHRlbXBsYXRlID0gcmVzb3VyY2VSZWdpc3RyeS5nZXRUZW1wbGF0ZShjbGFzc0RlY2wpO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtzdHlsZXMsIHRlbXBsYXRlfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIEFuZ3VsYXIncyBhbmFseXNpcyBzdGVwIChhcyBhIHByZWN1cnNvciB0byBgZ2V0RGlhZ25vc3RpY3NgIG9yIGBwcmVwYXJlRW1pdGApXG4gICAqIGFzeW5jaHJvbm91c2x5LlxuICAgKlxuICAgKiBOb3JtYWxseSwgdGhpcyBvcGVyYXRpb24gaGFwcGVucyBsYXppbHkgd2hlbmV2ZXIgYGdldERpYWdub3N0aWNzYCBvciBgcHJlcGFyZUVtaXRgIGFyZSBjYWxsZWQuXG4gICAqIEhvd2V2ZXIsIGNlcnRhaW4gY29uc3VtZXJzIG1heSB3aXNoIHRvIGFsbG93IGZvciBhbiBhc3luY2hyb25vdXMgcGhhc2Ugb2YgYW5hbHlzaXMsIHdoZXJlXG4gICAqIHJlc291cmNlcyBzdWNoIGFzIGBzdHlsZVVybHNgIGFyZSByZXNvbHZlZCBhc3luY2hvbm91c2x5LiBJbiB0aGVzZSBjYXNlcyBgYW5hbHl6ZUFzeW5jYCBtdXN0IGJlXG4gICAqIGNhbGxlZCBmaXJzdCwgYW5kIGl0cyBgUHJvbWlzZWAgYXdhaXRlZCBwcmlvciB0byBjYWxsaW5nIGFueSBvdGhlciBBUElzIG9mIGBOZ0NvbXBpbGVyYC5cbiAgICovXG4gIGFzeW5jIGFuYWx5emVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLkFuYWx5c2lzLCBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcblxuICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplQXN5bmMoc2YpO1xuICAgICAgICB0aGlzLnNjYW5Gb3JNd3Aoc2YpO1xuICAgICAgICBpZiAoYW5hbHlzaXNQcm9taXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGFuYWx5c2lzUHJvbWlzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuQW5hbHlzaXMpO1xuICAgICAgdGhpcy5yZXNvbHZlQ29tcGlsYXRpb24odGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGxhenkgcm91dGVzIGRldGVjdGVkIGR1cmluZyBhbmFseXNpcy5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgY2FsbGVkIGZvciBvbmUgc3BlY2lmaWMgcm91dGUsIG9yIHRvIHJldHJpZXZlIGFsbCB0b3AtbGV2ZWwgcm91dGVzLlxuICAgKi9cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdIHtcbiAgICBpZiAoZW50cnlSb3V0ZSkge1xuICAgICAgLy8gaHR0czovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvNTA3MzJlMTU2L3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMjTDE3NS1MMTg4KS5cbiAgICAgIC8vXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCB3aWxsIGFsd2F5cyBjYWxsIHRoaXMgQVBJIHdpdGggYW4gYWJzb2x1dGUgcGF0aCwgc28gdGhlIHJlc29sdXRpb24gc3RlcCBpc1xuICAgICAgLy8gbm90IG5lY2Vzc2FyeSwgYnV0IGtlZXBpbmcgaXQgYmFja3dhcmRzIGNvbXBhdGlibGUgaW4gY2FzZSBzb21lb25lIGVsc2UgaXMgdXNpbmcgdGhlIEFQSS5cblxuICAgICAgLy8gUmVsYXRpdmUgZW50cnkgcGF0aHMgYXJlIGRpc2FsbG93ZWQuXG4gICAgICBpZiAoZW50cnlSb3V0ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gbGlzdCBsYXp5IHJvdXRlczogUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyAoJHtcbiAgICAgICAgICAgIGVudHJ5Um91dGV9KSBpcyBub3Qgc3VwcG9ydGVkLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tcmVsYXRpdmUgZW50cnkgcGF0aHMgZmFsbCBpbnRvIG9uZSBvZiB0aGUgZm9sbG93aW5nIGNhdGVnb3JpZXM6XG4gICAgICAvLyAtIEFic29sdXRlIHN5c3RlbSBwYXRocyAoZS5nLiBgL2Zvby9iYXIvbXktcHJvamVjdC9teS1tb2R1bGVgKSwgd2hpY2ggYXJlIHVuYWZmZWN0ZWQgYnkgdGhlXG4gICAgICAvLyAgIGxvZ2ljIGJlbG93LlxuICAgICAgLy8gLSBQYXRocyB0byBlbnRlcm5hbCBtb2R1bGVzIChlLmcuIGBzb21lLWxpYmApLlxuICAgICAgLy8gLSBQYXRocyBtYXBwZWQgdG8gZGlyZWN0b3JpZXMgaW4gYHRzY29uZmlnLmpzb25gIChlLmcuIGBzaGFyZWQvbXktbW9kdWxlYCkuXG4gICAgICAvLyAgIChTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbCNwYXRoLW1hcHBpbmcuKVxuICAgICAgLy9cbiAgICAgIC8vIEluIGFsbCBjYXNlcyBhYm92ZSwgdGhlIGBjb250YWluaW5nRmlsZWAgYXJndW1lbnQgaXMgaWdub3JlZCwgc28gd2UgY2FuIGp1c3QgdGFrZSB0aGUgZmlyc3RcbiAgICAgIC8vIG9mIHRoZSByb290IGZpbGVzLlxuICAgICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSB0aGlzLmlucHV0UHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKClbMF07XG4gICAgICBjb25zdCBbZW50cnlQYXRoLCBtb2R1bGVOYW1lXSA9IGVudHJ5Um91dGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID1cbiAgICAgICAgICByZXNvbHZlTW9kdWxlTmFtZShlbnRyeVBhdGgsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuYWRhcHRlciwgbnVsbCk7XG5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBlbnRyeVJvdXRlID0gZW50cnlQb2ludEtleUZvcihyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLCBtb2R1bGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gY29tcGlsYXRpb24ucm91dGVBbmFseXplci5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCB0cmFuc2Zvcm1lcnMgYW5kIG90aGVyIGluZm9ybWF0aW9uIHdoaWNoIGlzIG5lY2Vzc2FyeSBmb3IgYSBjb25zdW1lciB0byBgZW1pdGAgdGhlXG4gICAqIHByb2dyYW0gd2l0aCBBbmd1bGFyLWFkZGVkIGRlZmluaXRpb25zLlxuICAgKi9cbiAgcHJlcGFyZUVtaXQoKToge1xuICAgIHRyYW5zZm9ybWVyczogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICB9IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IGNvcmVJbXBvcnRzRnJvbSA9IGNvbXBpbGF0aW9uLmlzQ29yZSA/IGdldFIzU3ltYm9sc0ZpbGUodGhpcy5pbnB1dFByb2dyYW0pIDogbnVsbDtcbiAgICBsZXQgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyO1xuICAgIGlmIChjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwpIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyKGNvcmVJbXBvcnRzRnJvbS5maWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmF1bHRJbXBvcnRUcmFja2VyID0gbmV3IERlZmF1bHRJbXBvcnRUcmFja2VyKCk7XG5cbiAgICBjb25zdCBiZWZvcmUgPSBbXG4gICAgICBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIsIGNvbXBpbGF0aW9uLnJlZmxlY3RvciwgaW1wb3J0UmV3cml0ZXIsIGRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgY29tcGlsYXRpb24uaXNDb3JlLCB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQpLFxuICAgICAgYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZXhwb3J0U3RhdGVtZW50cyksXG4gICAgICBkZWZhdWx0SW1wb3J0VHJhY2tlci5pbXBvcnRQcmVzZXJ2aW5nVHJhbnNmb3JtZXIoKSxcbiAgICBdO1xuXG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnM6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdID0gW107XG4gICAgaWYgKGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMgIT09IG51bGwpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zLnB1c2goXG4gICAgICAgICAgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMsIGltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuXG4gICAgLy8gT25seSBhZGQgYWxpYXNpbmcgcmUtZXhwb3J0cyB0byB0aGUgLmQudHMgb3V0cHV0IGlmIHRoZSBgQWxpYXNpbmdIb3N0YCByZXF1ZXN0cyBpdC5cbiAgICBpZiAoY29tcGlsYXRpb24uYWxpYXNpbmdIb3N0ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmFsaWFzaW5nSG9zdC5hbGlhc0V4cG9ydHNJbkR0cykge1xuICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnMucHVzaChhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24udHJhaXRDb21waWxlci5leHBvcnRTdGF0ZW1lbnRzKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgYmVmb3JlLnB1c2goXG4gICAgICAgICAgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybSh0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIuc291cmNlSW5mbywgaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgYmVmb3JlLnB1c2goaXZ5U3dpdGNoVHJhbnNmb3JtKTtcblxuICAgIHJldHVybiB7dHJhbnNmb3JtZXJzOiB7YmVmb3JlLCBhZnRlckRlY2xhcmF0aW9uc30gYXMgdHMuQ3VzdG9tVHJhbnNmb3JtZXJzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gdGhlIGluZGV4aW5nIHByb2Nlc3MgYW5kIHJldHVybiBhIGBNYXBgIG9mIGFsbCBpbmRleGVkIGNvbXBvbmVudHMuXG4gICAqXG4gICAqIFNlZSB0aGUgYGluZGV4aW5nYCBwYWNrYWdlIGZvciBtb3JlIGRldGFpbHMuXG4gICAqL1xuICBnZXRJbmRleGVkQ29tcG9uZW50cygpOiBNYXA8RGVjbGFyYXRpb25Ob2RlLCBJbmRleGVkQ29tcG9uZW50PiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBJbmRleGluZ0NvbnRleHQoKTtcbiAgICBjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmluZGV4KGNvbnRleHQpO1xuICAgIHJldHVybiBnZW5lcmF0ZUFuYWx5c2lzKGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbmFseXplZCh0aGlzOiBOZ0NvbXBpbGVyKTogTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICB0aGlzLmFuYWx5emVTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbXBpbGF0aW9uITtcbiAgfVxuXG4gIHByaXZhdGUgYW5hbHl6ZVN5bmMoKTogdm9pZCB7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuQW5hbHlzaXMsICgpID0+IHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplU3luYyhzZik7XG4gICAgICAgIHRoaXMuc2NhbkZvck13cChzZik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5BbmFseXNpcyk7XG5cbiAgICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlcik7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVDb21waWxhdGlvbih0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuUmVzb2x2ZSwgKCkgPT4ge1xuICAgICAgdHJhaXRDb21waWxlci5yZXNvbHZlKCk7XG5cbiAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIGFuYWx5c2lzIGlzIGNvbXBsZXRlIGFuZCB0aGUgY29tcGlsZXIgY2FuIG5vdyBjYWxjdWxhdGUgd2hpY2ggZmlsZXMgbmVlZCB0b1xuICAgICAgLy8gYmUgZW1pdHRlZCwgc28gZG8gdGhhdC5cbiAgICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIucmVjb3JkU3VjY2Vzc2Z1bEFuYWx5c2lzKHRyYWl0Q29tcGlsZXIpO1xuXG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuUmVzb2x2ZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldCBmdWxsVGVtcGxhdGVUeXBlQ2hlY2soKTogYm9vbGVhbiB7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBzdHJpY3RuZXNzIGxldmVsIG9mIHR5cGUgY2hlY2tpbmcgYmFzZWQgb24gY29tcGlsZXIgb3B0aW9ucy4gQXNcbiAgICAvLyBgc3RyaWN0VGVtcGxhdGVzYCBpcyBhIHN1cGVyc2V0IG9mIGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgLCB0aGUgZm9ybWVyIGltcGxpZXMgdGhlIGxhdHRlci5cbiAgICAvLyBBbHNvIHNlZSBgdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNgIHdoZXJlIGl0IGlzIHZlcmlmaWVkIHRoYXQgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2BcbiAgICAvLyBpcyBub3QgZGlzYWJsZWQgd2hlbiBgc3RyaWN0VGVtcGxhdGVzYCBpcyBlbmFibGVkLlxuICAgIGNvbnN0IHN0cmljdFRlbXBsYXRlcyA9ICEhdGhpcy5vcHRpb25zLnN0cmljdFRlbXBsYXRlcztcbiAgICByZXR1cm4gc3RyaWN0VGVtcGxhdGVzIHx8ICEhdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHlwZUNoZWNraW5nQ29uZmlnKCk6IFR5cGVDaGVja2luZ0NvbmZpZyB7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBzdHJpY3RuZXNzIGxldmVsIG9mIHR5cGUgY2hlY2tpbmcgYmFzZWQgb24gY29tcGlsZXIgb3B0aW9ucy4gQXNcbiAgICAvLyBgc3RyaWN0VGVtcGxhdGVzYCBpcyBhIHN1cGVyc2V0IG9mIGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgLCB0aGUgZm9ybWVyIGltcGxpZXMgdGhlIGxhdHRlci5cbiAgICAvLyBBbHNvIHNlZSBgdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNgIHdoZXJlIGl0IGlzIHZlcmlmaWVkIHRoYXQgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2BcbiAgICAvLyBpcyBub3QgZGlzYWJsZWQgd2hlbiBgc3RyaWN0VGVtcGxhdGVzYCBpcyBlbmFibGVkLlxuICAgIGNvbnN0IHN0cmljdFRlbXBsYXRlcyA9ICEhdGhpcy5vcHRpb25zLnN0cmljdFRlbXBsYXRlcztcblxuICAgIGNvbnN0IHVzZUlubGluZVR5cGVDb25zdHJ1Y3RvcnMgPSB0aGlzLnByb2dyYW1Ecml2ZXIuc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zO1xuXG4gICAgLy8gRmlyc3Qgc2VsZWN0IGEgdHlwZS1jaGVja2luZyBjb25maWd1cmF0aW9uLCBiYXNlZCBvbiB3aGV0aGVyIGZ1bGwgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpc1xuICAgIC8vIHJlcXVlc3RlZC5cbiAgICBsZXQgdHlwZUNoZWNraW5nQ29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWc7XG4gICAgaWYgKHRoaXMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcgPSB7XG4gICAgICAgIGFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrUXVlcmllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVGVtcGxhdGVCb2RpZXM6IHRydWUsXG4gICAgICAgIGFsd2F5c0NoZWNrU2NoZW1hSW5UZW1wbGF0ZUJvZGllczogdHJ1ZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGhvbm9yQWNjZXNzTW9kaWZpZXJzRm9ySW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQXR0cmlidXRlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBFdmVuIGluIGZ1bGwgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlLCBET00gYmluZGluZyBjaGVja3MgYXJlIG5vdCBxdWl0ZSByZWFkeSB5ZXQuXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBDaGVja2luZyBvZiBET00gZXZlbnRzIGN1cnJlbnRseSBoYXMgYW4gYWR2ZXJzZSBlZmZlY3Qgb24gZGV2ZWxvcGVyIGV4cGVyaWVuY2UsXG4gICAgICAgIC8vIGUuZy4gZm9yIGA8aW5wdXQgKGJsdXIpPVwidXBkYXRlKCRldmVudC50YXJnZXQudmFsdWUpXCI+YCBlbmFibGluZyB0aGlzIGNoZWNrIHJlc3VsdHMgaW46XG4gICAgICAgIC8vIC0gZXJyb3IgVFMyNTMxOiBPYmplY3QgaXMgcG9zc2libHkgJ251bGwnLlxuICAgICAgICAvLyAtIGVycm9yIFRTMjMzOTogUHJvcGVydHkgJ3ZhbHVlJyBkb2VzIG5vdCBleGlzdCBvbiB0eXBlICdFdmVudFRhcmdldCcuXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBOb24tRE9NIHJlZmVyZW5jZXMgaGF2ZSB0aGUgY29ycmVjdCB0eXBlIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzOiB0cnVlLFxuICAgICAgICAvLyBQaXBlcyBhcmUgY2hlY2tlZCBpbiBWaWV3IEVuZ2luZSBzbyB0aGVyZSBpcyBubyBzdHJpY3RuZXNzIGZsYWcuXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IHRydWUsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgdXNlQ29udGV4dEdlbmVyaWNUeXBlOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIHN0cmljdExpdGVyYWxUeXBlczogdHJ1ZSxcbiAgICAgICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICB1c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzLFxuICAgICAgICAvLyBXYXJuaW5ncyBmb3Igc3Vib3B0aW1hbCB0eXBlIGluZmVyZW5jZSBhcmUgb25seSBlbmFibGVkIGlmIGluIExhbmd1YWdlIFNlcnZpY2UgbW9kZVxuICAgICAgICAvLyAocHJvdmlkaW5nIHRoZSBmdWxsIFRlbXBsYXRlVHlwZUNoZWNrZXIgQVBJKSBhbmQgaWYgc3RyaWN0IG1vZGUgaXMgbm90IGVuYWJsZWQuIEluIHN0cmljdFxuICAgICAgICAvLyBtb2RlLCB0aGUgdXNlciBpcyBpbiBmdWxsIGNvbnRyb2wgb2YgdHlwZSBpbmZlcmVuY2UuXG4gICAgICAgIHN1Z2dlc3Rpb25zRm9yU3Vib3B0aW1hbFR5cGVJbmZlcmVuY2U6IHRoaXMuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlciAmJiAhc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogZmFsc2UsXG4gICAgICAgIGNoZWNrUXVlcmllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVGVtcGxhdGVCb2RpZXM6IGZhbHNlLFxuICAgICAgICAvLyBFbmFibGUgZGVlcCBzY2hlbWEgY2hlY2tpbmcgaW4gXCJiYXNpY1wiIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgbW9kZSBvbmx5IGlmIENsb3N1cmVcbiAgICAgICAgLy8gY29tcGlsYXRpb24gaXMgcmVxdWVzdGVkLCB3aGljaCBpcyBhIGdvb2QgcHJveHkgZm9yIFwib25seSBpbiBnb29nbGUzXCIuXG4gICAgICAgIGFsd2F5c0NoZWNrU2NoZW1hSW5UZW1wbGF0ZUJvZGllczogdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBzdHJpY3ROdWxsSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGhvbm9yQWNjZXNzTW9kaWZpZXJzRm9ySW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQXR0cmlidXRlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZlBpcGVzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogZmFsc2UsXG4gICAgICAgIHVzZUNvbnRleHRHZW5lcmljVHlwZTogZmFsc2UsXG4gICAgICAgIHN0cmljdExpdGVyYWxUeXBlczogZmFsc2UsXG4gICAgICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IHRoaXMuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgdXNlSW5saW5lVHlwZUNvbnN0cnVjdG9ycyxcbiAgICAgICAgLy8gSW4gXCJiYXNpY1wiIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgbW9kZSwgbm8gd2FybmluZ3MgYXJlIHByb2R1Y2VkIHNpbmNlIG1vc3QgdGhpbmdzIGFyZVxuICAgICAgICAvLyBub3QgY2hlY2tlZCBhbnl3YXlzLlxuICAgICAgICBzdWdnZXN0aW9uc0ZvclN1Ym9wdGltYWxUeXBlSW5mZXJlbmNlOiBmYWxzZSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gQXBwbHkgZXhwbGljaXRseSBjb25maWd1cmVkIHN0cmljdG5lc3MgZmxhZ3Mgb24gdG9wIG9mIHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAvLyBiYXNlZCBvbiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzID0gdGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXM7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dEFjY2Vzc01vZGlmaWVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzID1cbiAgICAgICAgICB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRBY2Nlc3NNb2RpZmllcnM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbElucHV0VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzID0gdGhpcy5vcHRpb25zLnN0cmljdE51bGxJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXM7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3REb21FdmVudFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkRvbUV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3REb21FdmVudFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3REb21Mb2NhbFJlZlR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkRvbVJlZmVyZW5jZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0RG9tTG9jYWxSZWZUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RBdHRyaWJ1dGVUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzID0gdGhpcy5vcHRpb25zLnN0cmljdEF0dHJpYnV0ZVR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdENvbnRleHRHZW5lcmljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcudXNlQ29udGV4dEdlbmVyaWNUeXBlID0gdGhpcy5vcHRpb25zLnN0cmljdENvbnRleHRHZW5lcmljcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RMaXRlcmFsVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdExpdGVyYWxUeXBlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RMaXRlcmFsVHlwZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHR5cGVDaGVja2luZ0NvbmZpZztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIC8vIEdldCB0aGUgZGlhZ25vc3RpY3MuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy5pbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlIHx8IHRoaXMuYWRhcHRlci5pc1NoaW0oc2YpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBkaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgIC4uLmNvbXBpbGF0aW9uLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmLCBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW0pKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxEcml2ZXIodGhpcy5pbmNyZW1lbnRhbERyaXZlciwgcHJvZ3JhbSk7XG4gICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIGdldFRlbXBsYXRlRGlhZ25vc3RpY3NGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBvcHRpbWl6ZUZvcjogT3B0aW1pemVGb3IpOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICAvLyBHZXQgdGhlIGRpYWdub3N0aWNzLlxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlICYmICF0aGlzLmFkYXB0ZXIuaXNTaGltKHNmKSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yRmlsZShzZiwgb3B0aW1pemVGb3IpKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxEcml2ZXIodGhpcy5pbmNyZW1lbnRhbERyaXZlciwgcHJvZ3JhbSk7XG4gICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIGdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBpZiAodGhpcy5ub25UZW1wbGF0ZURpYWdub3N0aWNzID09PSBudWxsKSB7XG4gICAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICAgIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcyA9IFsuLi5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmRpYWdub3N0aWNzXTtcbiAgICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwgJiYgY29tcGlsYXRpb24uZXhwb3J0UmVmZXJlbmNlR3JhcGggIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5ub25UZW1wbGF0ZURpYWdub3N0aWNzLnB1c2goLi4uY2hlY2tGb3JQcml2YXRlRXhwb3J0cyhcbiAgICAgICAgICAgIHRoaXMuZW50cnlQb2ludCwgdGhpcy5pbnB1dFByb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgY29tcGlsYXRpb24uZXhwb3J0UmVmZXJlbmNlR3JhcGgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcztcbiAgfVxuXG4gIHByaXZhdGUgc2NhbkZvck13cChzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMuY29tcGlsYXRpb24hLm13cFNjYW5uZXIuc2NhbihzZiwge1xuICAgICAgYWRkVHlwZVJlcGxhY2VtZW50OiAobm9kZTogdHMuRGVjbGFyYXRpb24sIHR5cGU6IFR5cGUpOiB2b2lkID0+IHtcbiAgICAgICAgLy8gT25seSBvYnRhaW4gdGhlIHJldHVybiB0eXBlIHRyYW5zZm9ybSBmb3IgdGhlIHNvdXJjZSBmaWxlIG9uY2UgdGhlcmUncyBhIHR5cGUgdG8gcmVwbGFjZSxcbiAgICAgICAgLy8gc28gdGhhdCBubyB0cmFuc2Zvcm0gaXMgYWxsb2NhdGVkIHdoZW4gdGhlcmUncyBub3RoaW5nIHRvIGRvLlxuICAgICAgICB0aGlzLmNvbXBpbGF0aW9uIS5kdHNUcmFuc2Zvcm1zIS5nZXRSZXR1cm5UeXBlVHJhbnNmb3JtKHNmKS5hZGRUeXBlUmVwbGFjZW1lbnQobm9kZSwgdHlwZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIG1ha2VDb21waWxhdGlvbigpOiBMYXp5Q29tcGlsYXRpb25TdGF0ZSB7XG4gICAgY29uc3QgY2hlY2tlciA9IHRoaXMuaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICBjb25zdCByZWZsZWN0b3IgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KGNoZWNrZXIpO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBSZWZlcmVuY2VFbWl0dGVyLlxuICAgIGxldCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyO1xuICAgIGxldCBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCA9PT0gbnVsbCB8fCAhdGhpcy5vcHRpb25zLl91c2VIb3N0Rm9ySW1wb3J0R2VuZXJhdGlvbikge1xuICAgICAgbGV0IGxvY2FsSW1wb3J0U3RyYXRlZ3k6IFJlZmVyZW5jZUVtaXRTdHJhdGVneTtcblxuICAgICAgLy8gVGhlIHN0cmF0ZWd5IHVzZWQgZm9yIGxvY2FsLCBpbi1wcm9qZWN0IGltcG9ydHMgZGVwZW5kcyBvbiB3aGV0aGVyIFRTIGhhcyBiZWVuIGNvbmZpZ3VyZWRcbiAgICAgIC8vIHdpdGggcm9vdERpcnMuIElmIHNvLCB0aGVuIG11bHRpcGxlIGRpcmVjdG9yaWVzIG1heSBiZSBtYXBwZWQgaW4gdGhlIHNhbWUgXCJtb2R1bGVcbiAgICAgIC8vIG5hbWVzcGFjZVwiIGFuZCB0aGUgbG9naWMgb2YgYExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3lgIGlzIHJlcXVpcmVkIHRvIGdlbmVyYXRlIGNvcnJlY3RcbiAgICAgIC8vIGltcG9ydHMgd2hpY2ggbWF5IGNyb3NzIHRoZXNlIG11bHRpcGxlIGRpcmVjdG9yaWVzLiBPdGhlcndpc2UsIHBsYWluIHJlbGF0aXZlIGltcG9ydHMgYXJlXG4gICAgICAvLyBzdWZmaWNpZW50LlxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5yb290RGlyICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAodGhpcy5vcHRpb25zLnJvb3REaXJzICE9PSB1bmRlZmluZWQgJiYgdGhpcy5vcHRpb25zLnJvb3REaXJzLmxlbmd0aCA+IDApKSB7XG4gICAgICAgIC8vIHJvb3REaXJzIGxvZ2ljIGlzIGluIGVmZmVjdCAtIHVzZSB0aGUgYExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3lgIGZvciBpbi1wcm9qZWN0IHJlbGF0aXZlXG4gICAgICAgIC8vIGltcG9ydHMuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3kgPSBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneShcbiAgICAgICAgICAgIHJlZmxlY3RvciwgbmV3IExvZ2ljYWxGaWxlU3lzdGVtKFsuLi50aGlzLmFkYXB0ZXIucm9vdERpcnNdLCB0aGlzLmFkYXB0ZXIpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFBsYWluIHJlbGF0aXZlIGltcG9ydHMgYXJlIGFsbCB0aGF0J3MgbmVlZGVkLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID0gbmV3IFJlbGF0aXZlUGF0aFN0cmF0ZWd5KHJlZmxlY3Rvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBDb21waWxlckhvc3QgZG9lc24ndCBoYXZlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyBidWlsZCBhbiBOUE0tY2VudHJpYyByZWZlcmVuY2VcbiAgICAgIC8vIHJlc29sdXRpb24gc3RyYXRlZ3kuXG4gICAgICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBOZXh0LCBhdHRlbXB0IHRvIHVzZSBhbiBhYnNvbHV0ZSBpbXBvcnQuXG4gICAgICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KHRoaXMuaW5wdXRQcm9ncmFtLCBjaGVja2VyLCB0aGlzLm1vZHVsZVJlc29sdmVyLCByZWZsZWN0b3IpLFxuICAgICAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgcmVmZXJlbmNlIGlzIGJlaW5nIHdyaXR0ZW4gaW50byBhIGZpbGUgd2l0aGluIHRoZSBwcm9qZWN0J3MgLnRzXG4gICAgICAgIC8vIHNvdXJjZXMsIGFuZCB1c2UgYSByZWxhdGl2ZSBpbXBvcnQgaWYgc28uIElmIHRoaXMgZmFpbHMsIFJlZmVyZW5jZUVtaXR0ZXIgd2lsbCB0aHJvd1xuICAgICAgICAvLyBhbiBlcnJvci5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSxcbiAgICAgIF0pO1xuXG4gICAgICAvLyBJZiBhbiBlbnRyeXBvaW50IGlzIHByZXNlbnQsIHRoZW4gYWxsIHVzZXIgaW1wb3J0cyBzaG91bGQgYmUgZGlyZWN0ZWQgdGhyb3VnaCB0aGVcbiAgICAgIC8vIGVudHJ5cG9pbnQgYW5kIHByaXZhdGUgZXhwb3J0cyBhcmUgbm90IG5lZWRlZC4gVGhlIGNvbXBpbGVyIHdpbGwgdmFsaWRhdGUgdGhhdCBhbGwgcHVibGljbHlcbiAgICAgIC8vIHZpc2libGUgZGlyZWN0aXZlcy9waXBlcyBhcmUgaW1wb3J0YWJsZSB2aWEgdGhpcyBlbnRyeXBvaW50LlxuICAgICAgaWYgKHRoaXMuZW50cnlQb2ludCA9PT0gbnVsbCAmJiB0aGlzLm9wdGlvbnMuZ2VuZXJhdGVEZWVwUmVleHBvcnRzID09PSB0cnVlKSB7XG4gICAgICAgIC8vIE5vIGVudHJ5cG9pbnQgaXMgcHJlc2VudCBhbmQgZGVlcCByZS1leHBvcnRzIHdlcmUgcmVxdWVzdGVkLCBzbyBjb25maWd1cmUgdGhlIGFsaWFzaW5nXG4gICAgICAgIC8vIHN5c3RlbSB0byBnZW5lcmF0ZSB0aGVtLlxuICAgICAgICBhbGlhc2luZ0hvc3QgPSBuZXcgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdChyZWZsZWN0b3IpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IHN1cHBvcnRzIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyB1c2UgdGhhdCB0byBlbWl0IGltcG9ydHMuXG4gICAgICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBhbGlhc2VkIHJlZmVyZW5jZXMgKHRoaXMgaXMgYSB3b3JrYXJvdW5kIHRvIFN0cmljdERlcHMgY2hlY2tzKS5cbiAgICAgICAgbmV3IEFsaWFzU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgZmlsZU5hbWVUb01vZHVsZU5hbWUgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgICBuZXcgVW5pZmllZE1vZHVsZXNTdHJhdGVneShyZWZsZWN0b3IsIHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QpLFxuICAgICAgXSk7XG4gICAgICBhbGlhc2luZ0hvc3QgPSBuZXcgVW5pZmllZE1vZHVsZXNBbGlhc2luZ0hvc3QodGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCk7XG4gICAgfVxuXG4gICAgY29uc3QgZXZhbHVhdG9yID0gbmV3IFBhcnRpYWxFdmFsdWF0b3IocmVmbGVjdG9yLCBjaGVja2VyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmRlcEdyYXBoKTtcbiAgICBjb25zdCBkdHNSZWFkZXIgPSBuZXcgRHRzTWV0YWRhdGFSZWFkZXIoY2hlY2tlciwgcmVmbGVjdG9yKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyID0gbG9jYWxNZXRhUmVnaXN0cnk7XG4gICAgY29uc3QgZGVwU2NvcGVSZWFkZXIgPSBuZXcgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyKGR0c1JlYWRlciwgYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlZ2lzdHJ5ID1cbiAgICAgICAgbmV3IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeShsb2NhbE1ldGFSZWFkZXIsIGRlcFNjb3BlUmVhZGVyLCByZWZFbWl0dGVyLCBhbGlhc2luZ0hvc3QpO1xuICAgIGNvbnN0IHNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlciA9IHNjb3BlUmVnaXN0cnk7XG4gICAgY29uc3Qgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgPSB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmdldFNlbWFudGljRGVwR3JhcGhVcGRhdGVyKCk7XG4gICAgY29uc3QgbWV0YVJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbbG9jYWxNZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnldKTtcbiAgICBjb25zdCBpbmplY3RhYmxlUmVnaXN0cnkgPSBuZXcgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnkocmVmbGVjdG9yKTtcblxuICAgIGNvbnN0IG1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbbG9jYWxNZXRhUmVhZGVyLCBkdHNSZWFkZXJdKTtcbiAgICBjb25zdCB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5ID0gbmV3IFR5cGVDaGVja1Njb3BlUmVnaXN0cnkoc2NvcGVSZWFkZXIsIG1ldGFSZWFkZXIpO1xuXG5cbiAgICAvLyBJZiBhIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgd2FzIHNwZWNpZmllZCwgdGhlbiB0cmFjayByZWZlcmVuY2VzIHZpYSBhIGBSZWZlcmVuY2VHcmFwaGAgaW5cbiAgICAvLyBvcmRlciB0byBwcm9kdWNlIHByb3BlciBkaWFnbm9zdGljcyBmb3IgaW5jb3JyZWN0bHkgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy9ldGMuIElmIHRoZXJlXG4gICAgLy8gaXMgbm8gZmxhdCBtb2R1bGUgZW50cnlwb2ludCB0aGVuIGRvbid0IHBheSB0aGUgY29zdCBvZiB0cmFja2luZyByZWZlcmVuY2VzLlxuICAgIGxldCByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeTtcbiAgICBsZXQgZXhwb3J0UmVmZXJlbmNlR3JhcGg6IFJlZmVyZW5jZUdyYXBofG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwpIHtcbiAgICAgIGV4cG9ydFJlZmVyZW5jZUdyYXBoID0gbmV3IFJlZmVyZW5jZUdyYXBoKCk7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgUmVmZXJlbmNlR3JhcGhBZGFwdGVyKGV4cG9ydFJlZmVyZW5jZUdyYXBoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IE5vb3BSZWZlcmVuY2VzUmVnaXN0cnkoKTtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZUFuYWx5emVyID0gbmV3IE5nTW9kdWxlUm91dGVBbmFseXplcih0aGlzLm1vZHVsZVJlc29sdmVyLCBldmFsdWF0b3IpO1xuXG4gICAgY29uc3QgZHRzVHJhbnNmb3JtcyA9IG5ldyBEdHNUcmFuc2Zvcm1SZWdpc3RyeSgpO1xuXG4gICAgY29uc3QgbXdwU2Nhbm5lciA9IG5ldyBNb2R1bGVXaXRoUHJvdmlkZXJzU2Nhbm5lcihyZWZsZWN0b3IsIGV2YWx1YXRvciwgcmVmRW1pdHRlcik7XG5cbiAgICBjb25zdCBpc0NvcmUgPSBpc0FuZ3VsYXJDb3JlUGFja2FnZSh0aGlzLmlucHV0UHJvZ3JhbSk7XG5cbiAgICBjb25zdCByZXNvdXJjZVJlZ2lzdHJ5ID0gbmV3IFJlc291cmNlUmVnaXN0cnkoKTtcblxuICAgIGNvbnN0IGNvbXBpbGF0aW9uTW9kZSA9XG4gICAgICAgIHRoaXMub3B0aW9ucy5jb21waWxhdGlvbk1vZGUgPT09ICdwYXJ0aWFsJyA/IENvbXBpbGF0aW9uTW9kZS5QQVJUSUFMIDogQ29tcGlsYXRpb25Nb2RlLkZVTEw7XG5cbiAgICAvLyBDeWNsZXMgYXJlIGhhbmRsZWQgaW4gZnVsbCBjb21waWxhdGlvbiBtb2RlIGJ5IFwicmVtb3RlIHNjb3BpbmdcIi5cbiAgICAvLyBcIlJlbW90ZSBzY29waW5nXCIgZG9lcyBub3Qgd29yayB3ZWxsIHdpdGggdHJlZSBzaGFraW5nIGZvciBsaWJyYXJpZXMuXG4gICAgLy8gU28gaW4gcGFydGlhbCBjb21waWxhdGlvbiBtb2RlLCB3aGVuIGJ1aWxkaW5nIGEgbGlicmFyeSwgYSBjeWNsZSB3aWxsIGNhdXNlIGFuIGVycm9yLlxuICAgIGNvbnN0IGN5Y2xlSGFuZGxpbmdTdHJhdGVneSA9IGNvbXBpbGF0aW9uTW9kZSA9PT0gQ29tcGlsYXRpb25Nb2RlLkZVTEwgP1xuICAgICAgICBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuVXNlUmVtb3RlU2NvcGluZyA6XG4gICAgICAgIEN5Y2xlSGFuZGxpbmdTdHJhdGVneS5FcnJvcjtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj5bXSA9IFtcbiAgICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIG1ldGFSZWFkZXIsIHNjb3BlUmVhZGVyLCBzY29wZVJlZ2lzdHJ5LFxuICAgICAgICAgIHR5cGVDaGVja1Njb3BlUmVnaXN0cnksIHJlc291cmNlUmVnaXN0cnksIGlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsXG4gICAgICAgICAgdGhpcy5hZGFwdGVyLnJvb3REaXJzLCB0aGlzLm9wdGlvbnMucHJlc2VydmVXaGl0ZXNwYWNlcyB8fCBmYWxzZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaTE4blVzZUV4dGVybmFsSWRzICE9PSBmYWxzZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCAhPT0gZmFsc2UsIHRoaXMudXNlUG9pc29uZWREYXRhLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMuY3ljbGVBbmFseXplcixcbiAgICAgICAgICBjeWNsZUhhbmRsaW5nU3RyYXRlZ3ksIHJlZkVtaXR0ZXIsIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIuZGVwR3JhcGgsIGluamVjdGFibGVSZWdpc3RyeSxcbiAgICAgICAgICBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlciwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLCB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpLFxuXG4gICAgICAvLyBUT0RPKGFseGh1Yik6IHVuZGVyc3RhbmQgd2h5IHRoZSBjYXN0IGhlcmUgaXMgbmVjZXNzYXJ5IChzb21ldGhpbmcgdG8gZG8gd2l0aCBgbnVsbGBcbiAgICAgIC8vIG5vdCBiZWluZyBhc3NpZ25hYmxlIHRvIGB1bmtub3duYCB3aGVuIHdyYXBwZWQgaW4gYFJlYWRvbmx5YCkuXG4gICAgICAvLyBjbGFuZy1mb3JtYXQgb2ZmXG4gICAgICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgbWV0YVJlYWRlcixcbiAgICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSwgaXNDb3JlLCBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcixcbiAgICAgICAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsIGNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlcixcbiAgICAgICAgKSBhcyBSZWFkb25seTxEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIFNlbWFudGljU3ltYm9sIHwgbnVsbCx1bmtub3duPj4sXG4gICAgICAvLyBjbGFuZy1mb3JtYXQgb25cbiAgICAgIC8vIFBpcGUgaGFuZGxlciBtdXN0IGJlIGJlZm9yZSBpbmplY3RhYmxlIGhhbmRsZXIgaW4gbGlzdCBzbyBwaXBlIGZhY3RvcmllcyBhcmUgcHJpbnRlZFxuICAgICAgLy8gYmVmb3JlIGluamVjdGFibGUgZmFjdG9yaWVzIChzbyBpbmplY3RhYmxlIGZhY3RvcmllcyBjYW4gZGVsZWdhdGUgdG8gdGhlbSlcbiAgICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LCBpbmplY3RhYmxlUmVnaXN0cnksIGlzQ29yZSxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpLFxuICAgICAgbmV3IEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgaXNDb3JlLCB0aGlzLm9wdGlvbnMuc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycyB8fCBmYWxzZSwgaW5qZWN0YWJsZVJlZ2lzdHJ5LFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciksXG4gICAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVhZGVyLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIHJlZmVyZW5jZXNSZWdpc3RyeSwgaXNDb3JlLFxuICAgICAgICAgIHJvdXRlQW5hbHl6ZXIsIHJlZkVtaXR0ZXIsIHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSwgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLCB0aGlzLm9wdGlvbnMuaTE4bkluTG9jYWxlKSxcbiAgICBdO1xuXG4gICAgY29uc3QgdHJhaXRDb21waWxlciA9IG5ldyBUcmFpdENvbXBpbGVyKFxuICAgICAgICBoYW5kbGVycywgcmVmbGVjdG9yLCB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIsIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsXG4gICAgICAgIHRoaXMub3B0aW9ucy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICE9PSBmYWxzZSwgY29tcGlsYXRpb25Nb2RlLCBkdHNUcmFuc2Zvcm1zLFxuICAgICAgICBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcik7XG5cbiAgICAvLyBUZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1heSB1c2UgdGhlIGBQcm9ncmFtRHJpdmVyYCB0byBwcm9kdWNlIG5ldyBgdHMuUHJvZ3JhbWAocykuIElmIHRoaXNcbiAgICAvLyBoYXBwZW5zLCB0aGV5IG5lZWQgdG8gYmUgdHJhY2tlZCBieSB0aGUgYE5nQ29tcGlsZXJgLlxuICAgIGNvbnN0IG5vdGlmeWluZ0RyaXZlciA9XG4gICAgICAgIG5ldyBOb3RpZnlpbmdQcm9ncmFtRHJpdmVyV3JhcHBlcih0aGlzLnByb2dyYW1Ecml2ZXIsIChwcm9ncmFtOiB0cy5Qcm9ncmFtKSA9PiB7XG4gICAgICAgICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsRHJpdmVyKHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsIHByb2dyYW0pO1xuICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuICAgICAgICB9KTtcblxuICAgIGNvbnN0IHRlbXBsYXRlVHlwZUNoZWNrZXIgPSBuZXcgVGVtcGxhdGVUeXBlQ2hlY2tlckltcGwoXG4gICAgICAgIHRoaXMuaW5wdXRQcm9ncmFtLCBub3RpZnlpbmdEcml2ZXIsIHRyYWl0Q29tcGlsZXIsIHRoaXMuZ2V0VHlwZUNoZWNraW5nQ29uZmlnKCksIHJlZkVtaXR0ZXIsXG4gICAgICAgIHJlZmxlY3RvciwgdGhpcy5hZGFwdGVyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyLCBzY29wZVJlZ2lzdHJ5LCB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlzQ29yZSxcbiAgICAgIHRyYWl0Q29tcGlsZXIsXG4gICAgICByZWZsZWN0b3IsXG4gICAgICBzY29wZVJlZ2lzdHJ5LFxuICAgICAgZHRzVHJhbnNmb3JtcyxcbiAgICAgIGV4cG9ydFJlZmVyZW5jZUdyYXBoLFxuICAgICAgcm91dGVBbmFseXplcixcbiAgICAgIG13cFNjYW5uZXIsXG4gICAgICBtZXRhUmVhZGVyLFxuICAgICAgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSxcbiAgICAgIGFsaWFzaW5nSG9zdCxcbiAgICAgIHJlZkVtaXR0ZXIsXG4gICAgICB0ZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgcmVzb3VyY2VSZWdpc3RyeSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHRoZSBnaXZlbiBgUHJvZ3JhbWAgaXMgQGFuZ3VsYXIvY29yZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQW5ndWxhckNvcmVQYWNrYWdlKHByb2dyYW06IHRzLlByb2dyYW0pOiBib29sZWFuIHtcbiAgLy8gTG9vayBmb3IgaXRzX2p1c3RfYW5ndWxhci50cyBzb21ld2hlcmUgaW4gdGhlIHByb2dyYW0uXG4gIGNvbnN0IHIzU3ltYm9scyA9IGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbSk7XG4gIGlmIChyM1N5bWJvbHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBMb29rIGZvciB0aGUgY29uc3RhbnQgSVRTX0pVU1RfQU5HVUxBUiBpbiB0aGF0IGZpbGUuXG4gIHJldHVybiByM1N5bWJvbHMuc3RhdGVtZW50cy5zb21lKHN0bXQgPT4ge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgbXVzdCBiZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHN0YXRlbWVudC5cbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RtdCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBiZSBleHBvcnRlZC5cbiAgICBpZiAoc3RtdC5tb2RpZmllcnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAhc3RtdC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBkZWNsYXJlIElUU19KVVNUX0FOR1VMQVIuXG4gICAgcmV0dXJuIHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5zb21lKGRlY2wgPT4ge1xuICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIG11c3QgbWF0Y2ggdGhlIG5hbWUuXG4gICAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpIHx8IGRlY2wubmFtZS50ZXh0ICE9PSAnSVRTX0pVU1RfQU5HVUxBUicpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gSXQgbXVzdCBpbml0aWFsaXplIHRoZSB2YXJpYWJsZSB0byB0cnVlLlxuICAgICAgaWYgKGRlY2wuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCB8fCBkZWNsLmluaXRpYWxpemVyLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVHJ1ZUtleXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBkZWZpbml0aW9uIG1hdGNoZXMuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogRmluZCB0aGUgJ3IzX3N5bWJvbHMudHMnIGZpbGUgaW4gdGhlIGdpdmVuIGBQcm9ncmFtYCwgb3IgcmV0dXJuIGBudWxsYCBpZiBpdCB3YXNuJ3QgdGhlcmUuXG4gKi9cbmZ1bmN0aW9uIGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmluZChmaWxlID0+IGZpbGUuZmlsZU5hbWUuaW5kZXhPZigncjNfc3ltYm9scy50cycpID49IDApIHx8IG51bGw7XG59XG5cbi8qKlxuICogU2luY2UgXCJzdHJpY3RUZW1wbGF0ZXNcIiBpcyBhIHRydWUgc3VwZXJzZXQgb2YgdHlwZSBjaGVja2luZyBjYXBhYmlsaXRpZXMgY29tcGFyZWQgdG9cbiAqIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIsIGl0IGlzIHJlcXVpcmVkIHRoYXQgdGhlIGxhdHRlciBpcyBub3QgZXhwbGljaXRseSBkaXNhYmxlZCBpZiB0aGVcbiAqIGZvcm1lciBpcyBlbmFibGVkLlxuICovXG5mdW5jdGlvbiB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9ucyhvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyk6IHRzLkRpYWdub3N0aWN8bnVsbCB7XG4gIGlmIChvcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjayA9PT0gZmFsc2UgJiYgb3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXMgPT09IHRydWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIGNvZGU6IG5nRXJyb3JDb2RlKEVycm9yQ29kZS5DT05GSUdfU1RSSUNUX1RFTVBMQVRFU19JTVBMSUVTX0ZVTExfVEVNUExBVEVfVFlQRUNIRUNLKSxcbiAgICAgIGZpbGU6IHVuZGVmaW5lZCxcbiAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgIGBBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbiBcInN0cmljdFRlbXBsYXRlc1wiIGlzIGVuYWJsZWQsIGhvd2V2ZXIgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBkaXNhYmxlZC5cblxuSGF2aW5nIHRoZSBcInN0cmljdFRlbXBsYXRlc1wiIGZsYWcgZW5hYmxlZCBpbXBsaWVzIHRoYXQgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBhbHNvIGVuYWJsZWQsIHNvXG50aGUgbGF0dGVyIGNhbiBub3QgYmUgZXhwbGljaXRseSBkaXNhYmxlZC5cblxuT25lIG9mIHRoZSBmb2xsb3dpbmcgYWN0aW9ucyBpcyByZXF1aXJlZDpcbjEuIFJlbW92ZSB0aGUgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBvcHRpb24uXG4yLiBSZW1vdmUgXCJzdHJpY3RUZW1wbGF0ZXNcIiBvciBzZXQgaXQgdG8gJ2ZhbHNlJy5cblxuTW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb21waWxlciBvcHRpb25zIGNhbiBiZSBmb3VuZCBpbiB0aGUgZG9jdW1lbnRhdGlvbjpcbmh0dHBzOi8vdjkuYW5ndWxhci5pby9ndWlkZS90ZW1wbGF0ZS10eXBlY2hlY2sjdGVtcGxhdGUtdHlwZS1jaGVja2luZ2AsXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5jbGFzcyBSZWZlcmVuY2VHcmFwaEFkYXB0ZXIgaW1wbGVtZW50cyBSZWZlcmVuY2VzUmVnaXN0cnkge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGdyYXBoOiBSZWZlcmVuY2VHcmFwaCkge31cblxuICBhZGQoc291cmNlOiBEZWNsYXJhdGlvbk5vZGUsIC4uLnJlZmVyZW5jZXM6IFJlZmVyZW5jZTxEZWNsYXJhdGlvbk5vZGU+W10pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHtub2RlfSBvZiByZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgc291cmNlRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzb3VyY2VGaWxlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSByZWNvcmQgbG9jYWwgcmVmZXJlbmNlcyAobm90IHJlZmVyZW5jZXMgaW50byAuZC50cyBmaWxlcykuXG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkIHx8ICFpc0R0c1BhdGgoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgdGhpcy5ncmFwaC5hZGQoc291cmNlLCBub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgTm90aWZ5aW5nUHJvZ3JhbURyaXZlcldyYXBwZXIgaW1wbGVtZW50cyBQcm9ncmFtRHJpdmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGRlbGVnYXRlOiBQcm9ncmFtRHJpdmVyLCBwcml2YXRlIG5vdGlmeU5ld1Byb2dyYW06IChwcm9ncmFtOiB0cy5Qcm9ncmFtKSA9PiB2b2lkKSB7fVxuXG4gIGdldCBzdXBwb3J0c0lubGluZU9wZXJhdGlvbnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGVsZWdhdGUuc3VwcG9ydHNJbmxpbmVPcGVyYXRpb25zO1xuICB9XG5cbiAgZ2V0UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5nZXRQcm9ncmFtKCk7XG4gIH1cblxuICB1cGRhdGVGaWxlcyhjb250ZW50czogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+LCB1cGRhdGVNb2RlOiBVcGRhdGVNb2RlKTogdm9pZCB7XG4gICAgdGhpcy5kZWxlZ2F0ZS51cGRhdGVGaWxlcyhjb250ZW50cywgdXBkYXRlTW9kZSk7XG4gICAgdGhpcy5ub3RpZnlOZXdQcm9ncmFtKHRoaXMuZGVsZWdhdGUuZ2V0UHJvZ3JhbSgpKTtcbiAgfVxufVxuIl19