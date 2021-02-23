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
    function freshCompilationTicket(tsProgram, options, incrementalBuildStrategy, typeCheckingProgramStrategy, enableTemplateTypeChecker, usePoisonedData) {
        return {
            kind: CompilationTicketKind.Fresh,
            tsProgram: tsProgram,
            options: options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            typeCheckingProgramStrategy: typeCheckingProgramStrategy,
            enableTemplateTypeChecker: enableTemplateTypeChecker,
            usePoisonedData: usePoisonedData,
        };
    }
    exports.freshCompilationTicket = freshCompilationTicket;
    /**
     * Create a `CompilationTicket` as efficiently as possible, based on a previous `NgCompiler`
     * instance and a new `ts.Program`.
     */
    function incrementalFromCompilerTicket(oldCompiler, newProgram, incrementalBuildStrategy, typeCheckingProgramStrategy, modifiedResourceFiles) {
        var oldProgram = oldCompiler.getNextProgram();
        var oldDriver = oldCompiler.incrementalStrategy.getIncrementalDriver(oldProgram);
        if (oldDriver === null) {
            // No incremental step is possible here, since no IncrementalDriver was found for the old
            // program.
            return freshCompilationTicket(newProgram, oldCompiler.options, incrementalBuildStrategy, typeCheckingProgramStrategy, oldCompiler.enableTemplateTypeChecker, oldCompiler.usePoisonedData);
        }
        var newDriver = incremental_1.IncrementalDriver.reconcile(oldProgram, oldDriver, newProgram, modifiedResourceFiles);
        return {
            kind: CompilationTicketKind.IncrementalTypeScript,
            enableTemplateTypeChecker: oldCompiler.enableTemplateTypeChecker,
            usePoisonedData: oldCompiler.usePoisonedData,
            options: oldCompiler.options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            typeCheckingProgramStrategy: typeCheckingProgramStrategy,
            newDriver: newDriver,
            oldProgram: oldProgram,
            newProgram: newProgram,
        };
    }
    exports.incrementalFromCompilerTicket = incrementalFromCompilerTicket;
    /**
     * Create a `CompilationTicket` directly from an old `ts.Program` and associated Angular compilation
     * state, along with a new `ts.Program`.
     */
    function incrementalFromDriverTicket(oldProgram, oldDriver, newProgram, options, incrementalBuildStrategy, typeCheckingProgramStrategy, modifiedResourceFiles, enableTemplateTypeChecker, usePoisonedData) {
        var newDriver = incremental_1.IncrementalDriver.reconcile(oldProgram, oldDriver, newProgram, modifiedResourceFiles);
        return {
            kind: CompilationTicketKind.IncrementalTypeScript,
            oldProgram: oldProgram,
            newProgram: newProgram,
            options: options,
            incrementalBuildStrategy: incrementalBuildStrategy,
            newDriver: newDriver,
            typeCheckingProgramStrategy: typeCheckingProgramStrategy,
            enableTemplateTypeChecker: enableTemplateTypeChecker,
            usePoisonedData: usePoisonedData,
        };
    }
    exports.incrementalFromDriverTicket = incrementalFromDriverTicket;
    function resourceChangeTicket(compiler, modifiedResourceFiles) {
        return {
            kind: CompilationTicketKind.IncrementalResource,
            compiler: compiler,
            modifiedResourceFiles: modifiedResourceFiles,
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
        function NgCompiler(adapter, options, tsProgram, typeCheckingProgramStrategy, incrementalStrategy, incrementalDriver, enableTemplateTypeChecker, usePoisonedData, perfRecorder) {
            var _a;
            var _this = this;
            if (perfRecorder === void 0) { perfRecorder = perf_1.NOOP_PERF_RECORDER; }
            this.adapter = adapter;
            this.options = options;
            this.tsProgram = tsProgram;
            this.typeCheckingProgramStrategy = typeCheckingProgramStrategy;
            this.incrementalStrategy = incrementalStrategy;
            this.incrementalDriver = incrementalDriver;
            this.enableTemplateTypeChecker = enableTemplateTypeChecker;
            this.usePoisonedData = usePoisonedData;
            this.perfRecorder = perfRecorder;
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
            (_a = this.constructionDiagnostics).push.apply(_a, tslib_1.__spread(this.adapter.constructionDiagnostics));
            var incompatibleTypeCheckOptionsDiagnostic = verifyCompatibleTypeCheckOptions(this.options);
            if (incompatibleTypeCheckOptionsDiagnostic !== null) {
                this.constructionDiagnostics.push(incompatibleTypeCheckOptionsDiagnostic);
            }
            this.nextProgram = tsProgram;
            this.closureCompilerEnabled = !!this.options.annotateForClosureCompiler;
            this.entryPoint =
                adapter.entryPoint !== null ? typescript_1.getSourceFileOrNull(tsProgram, adapter.entryPoint) : null;
            var moduleResolutionCache = ts.createModuleResolutionCache(this.adapter.getCurrentDirectory(), 
            // Note: this used to be an arrow-function closure. However, JS engines like v8 have some
            // strange behaviors with retaining the lexical scope of the closure. Even if this function
            // doesn't retain a reference to `this`, if other closures in the constructor here reference
            // `this` internally then a closure created here would retain them. This can cause major
            // memory leak issues since the `moduleResolutionCache` is a long-lived object and finds its
            // way into all kinds of places inside TS internal objects.
            this.adapter.getCanonicalFileName.bind(this.adapter));
            this.moduleResolver =
                new imports_1.ModuleResolver(tsProgram, this.options, this.adapter, moduleResolutionCache);
            this.resourceManager = new resource_1.AdapterResourceLoader(adapter, this.options);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(new cycles_1.ImportGraph(this.moduleResolver));
            this.incrementalStrategy.setIncrementalDriver(this.incrementalDriver, tsProgram);
            this.ignoreForDiagnostics =
                new Set(tsProgram.getSourceFiles().filter(function (sf) { return _this.adapter.isShim(sf); }));
            this.ignoreForEmit = this.adapter.ignoreForEmit;
        }
        /**
         * Convert a `CompilationTicket` into an `NgCompiler` instance for the requested compilation.
         *
         * Depending on the nature of the compilation request, the `NgCompiler` instance may be reused
         * from a previous compilation and updated with any changes, it may be a new instance which
         * incrementally reuses state from a previous compilation, or it may represent a fresh compilation
         * entirely.
         */
        NgCompiler.fromTicket = function (ticket, adapter, perfRecorder) {
            switch (ticket.kind) {
                case CompilationTicketKind.Fresh:
                    return new NgCompiler(adapter, ticket.options, ticket.tsProgram, ticket.typeCheckingProgramStrategy, ticket.incrementalBuildStrategy, incremental_1.IncrementalDriver.fresh(ticket.tsProgram), ticket.enableTemplateTypeChecker, ticket.usePoisonedData, perfRecorder);
                case CompilationTicketKind.IncrementalTypeScript:
                    return new NgCompiler(adapter, ticket.options, ticket.newProgram, ticket.typeCheckingProgramStrategy, ticket.incrementalBuildStrategy, ticket.newDriver, ticket.enableTemplateTypeChecker, ticket.usePoisonedData, perfRecorder);
                case CompilationTicketKind.IncrementalResource:
                    var compiler = ticket.compiler;
                    compiler.updateWithChangedResources(ticket.modifiedResourceFiles);
                    return compiler;
            }
        };
        NgCompiler.prototype.updateWithChangedResources = function (changedResources) {
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
            if (this.compilation === null) {
                // Analysis hasn't happened yet, so no update is necessary - any changes to resources will be
                // captured by the inital analysis pass itself.
                return;
            }
            this.resourceManager.invalidate();
            var classesToUpdate = new Set();
            try {
                for (var changedResources_1 = tslib_1.__values(changedResources), changedResources_1_1 = changedResources_1.next(); !changedResources_1_1.done; changedResources_1_1 = changedResources_1.next()) {
                    var resourceFile = changedResources_1_1.value;
                    try {
                        for (var _e = (e_2 = void 0, tslib_1.__values(this.getComponentsWithTemplateFile(resourceFile))), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var templateClass = _f.value;
                            classesToUpdate.add(templateClass);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    try {
                        for (var _g = (e_3 = void 0, tslib_1.__values(this.getComponentsWithStyleFile(resourceFile))), _h = _g.next(); !_h.done; _h = _g.next()) {
                            var styleClass = _h.value;
                            classesToUpdate.add(styleClass);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_h && !_h.done && (_c = _g.return)) _c.call(_g);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (changedResources_1_1 && !changedResources_1_1.done && (_a = changedResources_1.return)) _a.call(changedResources_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                for (var classesToUpdate_1 = tslib_1.__values(classesToUpdate), classesToUpdate_1_1 = classesToUpdate_1.next(); !classesToUpdate_1_1.done; classesToUpdate_1_1 = classesToUpdate_1.next()) {
                    var clazz = classesToUpdate_1_1.value;
                    this.compilation.traitCompiler.updateResources(clazz);
                    if (!ts.isClassDeclaration(clazz)) {
                        continue;
                    }
                    this.compilation.templateTypeChecker.invalidateClass(clazz);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (classesToUpdate_1_1 && !classesToUpdate_1_1.done && (_d = classesToUpdate_1.return)) _d.call(classesToUpdate_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
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
            return this.addMessageTextDetails(tslib_1.__spread(this.getNonTemplateDiagnostics(), this.getTemplateDiagnostics()));
        };
        /**
         * Get all Angular-related diagnostics for this compilation.
         *
         * If a `ts.SourceFile` is passed, only diagnostics related to that file are returned.
         */
        NgCompiler.prototype.getDiagnosticsForFile = function (file, optimizeFor) {
            return this.addMessageTextDetails(tslib_1.__spread(this.getNonTemplateDiagnostics().filter(function (diag) { return diag.file === file; }), this.getTemplateDiagnosticsForFile(file, optimizeFor)));
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
         * Get the `ts.Program` to use as a starting point when spawning a subsequent incremental
         * compilation.
         *
         * The `NgCompiler` spawns an internal incremental TypeScript compilation (inheriting the
         * consumer's `ts.Program` into a new one for the purposes of template type-checking). After this
         * operation, the consumer's `ts.Program` is no longer usable for starting a new incremental
         * compilation. `getNextProgram` retrieves the `ts.Program` which can be used instead.
         */
        NgCompiler.prototype.getNextProgram = function () {
            return this.nextProgram;
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
                var analyzeSpan, promises, _loop_1, this_1, _a, _b, sf;
                var e_5, _c;
                var _this = this;
                return tslib_1.__generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (this.compilation !== null) {
                                return [2 /*return*/];
                            }
                            this.compilation = this.makeCompilation();
                            analyzeSpan = this.perfRecorder.start('analyze');
                            promises = [];
                            _loop_1 = function (sf) {
                                if (sf.isDeclarationFile) {
                                    return "continue";
                                }
                                var analyzeFileSpan = this_1.perfRecorder.start('analyzeFile', sf);
                                var analysisPromise = this_1.compilation.traitCompiler.analyzeAsync(sf);
                                this_1.scanForMwp(sf);
                                if (analysisPromise === undefined) {
                                    this_1.perfRecorder.stop(analyzeFileSpan);
                                }
                                else if (this_1.perfRecorder.enabled) {
                                    analysisPromise = analysisPromise.then(function () { return _this.perfRecorder.stop(analyzeFileSpan); });
                                }
                                if (analysisPromise !== undefined) {
                                    promises.push(analysisPromise);
                                }
                            };
                            this_1 = this;
                            try {
                                for (_a = tslib_1.__values(this.tsProgram.getSourceFiles()), _b = _a.next(); !_b.done; _b = _a.next()) {
                                    sf = _b.value;
                                    _loop_1(sf);
                                }
                            }
                            catch (e_5_1) { e_5 = { error: e_5_1 }; }
                            finally {
                                try {
                                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                }
                                finally { if (e_5) throw e_5.error; }
                            }
                            return [4 /*yield*/, Promise.all(promises)];
                        case 1:
                            _d.sent();
                            this.perfRecorder.stop(analyzeSpan);
                            this.resolveCompilation(this.compilation.traitCompiler);
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
                // Note:
                // This resolution step is here to match the implementation of the old `AotCompilerHost` (see
                // https://github.com/angular/angular/blob/50732e156/packages/compiler-cli/src/transformers/compiler_host.ts#L175-L188).
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
                var containingFile = this.tsProgram.getRootFileNames()[0];
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
            var coreImportsFrom = compilation.isCore ? getR3SymbolsFile(this.tsProgram) : null;
            var importRewriter;
            if (coreImportsFrom !== null) {
                importRewriter = new imports_1.R3SymbolsImportRewriter(coreImportsFrom.fileName);
            }
            else {
                importRewriter = new imports_1.NoopImportRewriter();
            }
            var before = [
                transform_1.ivyTransformFactory(compilation.traitCompiler, compilation.reflector, importRewriter, compilation.defaultImportTracker, compilation.isCore, this.closureCompilerEnabled),
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
            var e_6, _a;
            var analyzeSpan = this.perfRecorder.start('analyze');
            this.compilation = this.makeCompilation();
            try {
                for (var _b = tslib_1.__values(this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    if (sf.isDeclarationFile) {
                        continue;
                    }
                    var analyzeFileSpan = this.perfRecorder.start('analyzeFile', sf);
                    this.compilation.traitCompiler.analyzeSync(sf);
                    this.scanForMwp(sf);
                    this.perfRecorder.stop(analyzeFileSpan);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
            }
            this.perfRecorder.stop(analyzeSpan);
            this.resolveCompilation(this.compilation.traitCompiler);
        };
        NgCompiler.prototype.resolveCompilation = function (traitCompiler) {
            traitCompiler.resolve();
            // At this point, analysis is complete and the compiler can now calculate which files need to
            // be emitted, so do that.
            this.incrementalDriver.recordSuccessfulAnalysis(traitCompiler);
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
            var e_7, _a;
            var compilation = this.ensureAnalyzed();
            // Get the diagnostics.
            var typeCheckSpan = this.perfRecorder.start('typeCheckDiagnostics');
            var diagnostics = [];
            try {
                for (var _b = tslib_1.__values(this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    if (sf.isDeclarationFile || this.adapter.isShim(sf)) {
                        continue;
                    }
                    diagnostics.push.apply(diagnostics, tslib_1.__spread(compilation.templateTypeChecker.getDiagnosticsForFile(sf, api_1.OptimizeFor.WholeProgram)));
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_7) throw e_7.error; }
            }
            var program = this.typeCheckingProgramStrategy.getProgram();
            this.perfRecorder.stop(typeCheckSpan);
            this.incrementalStrategy.setIncrementalDriver(this.incrementalDriver, program);
            this.nextProgram = program;
            return diagnostics;
        };
        NgCompiler.prototype.getTemplateDiagnosticsForFile = function (sf, optimizeFor) {
            var compilation = this.ensureAnalyzed();
            // Get the diagnostics.
            var typeCheckSpan = this.perfRecorder.start('typeCheckDiagnostics');
            var diagnostics = [];
            if (!sf.isDeclarationFile && !this.adapter.isShim(sf)) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(compilation.templateTypeChecker.getDiagnosticsForFile(sf, optimizeFor)));
            }
            var program = this.typeCheckingProgramStrategy.getProgram();
            this.perfRecorder.stop(typeCheckSpan);
            this.incrementalStrategy.setIncrementalDriver(this.incrementalDriver, program);
            this.nextProgram = program;
            return diagnostics;
        };
        NgCompiler.prototype.getNonTemplateDiagnostics = function () {
            var _a;
            if (this.nonTemplateDiagnostics === null) {
                var compilation = this.ensureAnalyzed();
                this.nonTemplateDiagnostics = tslib_1.__spread(compilation.traitCompiler.diagnostics);
                if (this.entryPoint !== null && compilation.exportReferenceGraph !== null) {
                    (_a = this.nonTemplateDiagnostics).push.apply(_a, tslib_1.__spread(entry_point_1.checkForPrivateExports(this.entryPoint, this.tsProgram.getTypeChecker(), compilation.exportReferenceGraph)));
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
            var checker = this.tsProgram.getTypeChecker();
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
                    localImportStrategy = new imports_1.LogicalProjectStrategy(reflector, new file_system_1.LogicalFileSystem(tslib_1.__spread(this.adapter.rootDirs), this.adapter));
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
                    new imports_1.AbsoluteModuleStrategy(this.tsProgram, checker, this.moduleResolver, reflector),
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
            var isCore = isAngularCorePackage(this.tsProgram);
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
                new annotations_1.ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, this.resourceManager, this.adapter.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.usePoisonedData, this.options.i18nNormalizeLineEndingsInICUs, this.moduleResolver, this.cycleAnalyzer, cycleHandlingStrategy, refEmitter, defaultImportTracker, this.incrementalDriver.depGraph, injectableRegistry, semanticDepGraphUpdater, this.closureCompilerEnabled),
                // TODO(alxhub): understand why the cast here is necessary (something to do with `null`
                // not being assignable to `unknown` when wrapped in `Readonly`).
                // clang-format off
                new annotations_1.DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, defaultImportTracker, injectableRegistry, isCore, this.closureCompilerEnabled, config_1.compileUndecoratedClassesWithAngularFeatures),
                // clang-format on
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, defaultImportTracker, injectableRegistry, isCore),
                new annotations_1.InjectableDecoratorHandler(reflector, defaultImportTracker, isCore, this.options.strictInjectionParameters || false, injectableRegistry),
                new annotations_1.NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, this.adapter.factoryTracker, defaultImportTracker, this.closureCompilerEnabled, injectableRegistry, this.options.i18nInLocale),
            ];
            var traitCompiler = new transform_1.TraitCompiler(handlers, reflector, this.perfRecorder, this.incrementalDriver, this.options.compileNonExportedClasses !== false, compilationMode, dtsTransforms, semanticDepGraphUpdater);
            var templateTypeChecker = new typecheck_1.TemplateTypeCheckerImpl(this.tsProgram, this.typeCheckingProgramStrategy, traitCompiler, this.getTypeCheckingConfig(), refEmitter, reflector, this.adapter, this.incrementalDriver, scopeRegistry, typeCheckScopeRegistry);
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
            var e_8, _a;
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
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (references_1_1 && !references_1_1.done && (_a = references_1.return)) _a.call(references_1);
                }
                finally { if (e_8) throw e_8.error; }
            }
        };
        return ReferenceGraphAdapter;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsMkVBQStNO0lBQy9NLGlFQUErRTtJQUMvRSwyRUFBbUg7SUFDbkgsMkVBQXlFO0lBQ3pFLDJFQUE2RDtJQUM3RCxtRUFBK1g7SUFDL1gsMkVBQThFO0lBQzlFLG1FQUFrRjtJQUNsRixxRUFBeU07SUFDek0sMkZBQXFFO0lBRXJFLHVGQUF5RDtJQUN6RCw2REFBNEQ7SUFDNUQseUVBQW9HO0lBQ3BHLHFFQUFxRDtJQUNyRCxtRUFBc0U7SUFDdEUsK0RBQW1JO0lBQ25JLCtEQUFzRDtJQUN0RCxpRUFBZ0Q7SUFDaEQsdUVBQWdMO0lBQ2hMLHVFQUF3RDtJQUN4RCxxRUFBc0g7SUFDdEgsa0ZBQTRGO0lBRzVGLDBFQUFzRTtJQTBCdEU7O09BRUc7SUFDSCxJQUFZLHFCQUlYO0lBSkQsV0FBWSxxQkFBcUI7UUFDL0IsbUVBQUssQ0FBQTtRQUNMLG1HQUFxQixDQUFBO1FBQ3JCLCtGQUFtQixDQUFBO0lBQ3JCLENBQUMsRUFKVyxxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQUloQztJQThDRDs7T0FFRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxTQUFxQixFQUFFLE9BQTBCLEVBQ2pELHdCQUFrRCxFQUNsRCwyQkFBd0QsRUFBRSx5QkFBa0MsRUFDNUYsZUFBd0I7UUFDMUIsT0FBTztZQUNMLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxLQUFLO1lBQ2pDLFNBQVMsV0FBQTtZQUNULE9BQU8sU0FBQTtZQUNQLHdCQUF3QiwwQkFBQTtZQUN4QiwyQkFBMkIsNkJBQUE7WUFDM0IseUJBQXlCLDJCQUFBO1lBQ3pCLGVB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SSxVQUFVLEtBQUssU0FBUyxJQUFJLENBQUMsc0JBQVMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7d0JBQy9ELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztxQkFDOUI7aUJBQ0Y7Ozs7Ozs7OztRQUNILENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUFoQkQsSUFnQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5LCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEN5Y2xlSGFuZGxpbmdTdHJhdGVneSwgSW1wb3J0R3JhcGh9IGZyb20gJy4uLy4uL2N5Y2xlcyc7XG5pbXBvcnQge0NPTVBJTEVSX0VSUk9SU19XSVRIX0dVSURFUywgRVJST1JfREVUQUlMU19QQUdFX0JBU0VfVVJMLCBFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2NoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIFJlZmVyZW5jZUdyYXBofSBmcm9tICcuLi8uLi9lbnRyeV9wb2ludCc7XG5pbXBvcnQge0xvZ2ljYWxGaWxlU3lzdGVtLCByZXNvbHZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0Fic29sdXRlTW9kdWxlU3RyYXRlZ3ksIEFsaWFzaW5nSG9zdCwgQWxpYXNTdHJhdGVneSwgRGVmYXVsdEltcG9ydFRyYWNrZXIsIEltcG9ydFJld3JpdGVyLCBMb2NhbElkZW50aWZpZXJTdHJhdGVneSwgTG9naWNhbFByb2plY3RTdHJhdGVneSwgTW9kdWxlUmVzb2x2ZXIsIE5vb3BJbXBvcnRSZXdyaXRlciwgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCwgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5LCBSZWZlcmVuY2VFbWl0dGVyLCBSZWxhdGl2ZVBhdGhTdHJhdGVneSwgVW5pZmllZE1vZHVsZXNBbGlhc2luZ0hvc3QsIFVuaWZpZWRNb2R1bGVzU3RyYXRlZ3l9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksIEluY3JlbWVudGFsRHJpdmVyfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbCc7XG5pbXBvcnQge2dlbmVyYXRlQW5hbHlzaXMsIEluZGV4ZWRDb21wb25lbnQsIEluZGV4aW5nQ29udGV4dH0gZnJvbSAnLi4vLi4vaW5kZXhlcic7XG5pbXBvcnQge0NvbXBvbmVudFJlc291cmNlcywgQ29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIExvY2FsTWV0YWRhdGFSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIFJlc291cmNlUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXJ9IGZyb20gJy4uLy4uL21vZHVsZXdpdGhwcm92aWRlcnMnO1xuaW1wb3J0IHtTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi4vLi4vbmdtb2R1bGVfc2VtYW50aWNzJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtOT09QX1BFUkZfUkVDT1JERVIsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0RlY2xhcmF0aW9uTm9kZSwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24sIFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0FkYXB0ZXJSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi4vLi4vcmVzb3VyY2UnO1xuaW1wb3J0IHtlbnRyeVBvaW50S2V5Rm9yLCBOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIsIFR5cGVDaGVja1Njb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7Z2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybX0gZnJvbSAnLi4vLi4vc2hpbXMnO1xuaW1wb3J0IHtpdnlTd2l0Y2hUcmFuc2Zvcm19IGZyb20gJy4uLy4uL3N3aXRjaCc7XG5pbXBvcnQge2FsaWFzVHJhbnNmb3JtRmFjdG9yeSwgQ29tcGlsYXRpb25Nb2RlLCBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnksIERlY29yYXRvckhhbmRsZXIsIER0c1RyYW5zZm9ybVJlZ2lzdHJ5LCBpdnlUcmFuc2Zvcm1GYWN0b3J5LCBUcmFpdENvbXBpbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtUZW1wbGF0ZVR5cGVDaGVja2VySW1wbH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7T3B0aW1pemVGb3IsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2luZ0NvbmZpZywgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5fSBmcm9tICcuLi8uLi90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZU9yTnVsbCwgaXNEdHNQYXRoLCByZXNvbHZlTW9kdWxlTmFtZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0xhenlSb3V0ZSwgTmdDb21waWxlckFkYXB0ZXIsIE5nQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge2NvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzfSBmcm9tICcuL2NvbmZpZyc7XG5cbi8qKlxuICogU3RhdGUgaW5mb3JtYXRpb24gYWJvdXQgYSBjb21waWxhdGlvbiB3aGljaCBpcyBvbmx5IGdlbmVyYXRlZCBvbmNlIHNvbWUgZGF0YSBpcyByZXF1ZXN0ZWQgZnJvbVxuICogdGhlIGBOZ0NvbXBpbGVyYCAoZm9yIGV4YW1wbGUsIGJ5IGNhbGxpbmcgYGdldERpYWdub3N0aWNzYCkuXG4gKi9cbmludGVyZmFjZSBMYXp5Q29tcGlsYXRpb25TdGF0ZSB7XG4gIGlzQ29yZTogYm9vbGVhbjtcbiAgdHJhaXRDb21waWxlcjogVHJhaXRDb21waWxlcjtcbiAgcmVmbGVjdG9yOiBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3Q7XG4gIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyO1xuICBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnk7XG4gIHR5cGVDaGVja1Njb3BlUmVnaXN0cnk6IFR5cGVDaGVja1Njb3BlUmVnaXN0cnk7XG4gIGV4cG9ydFJlZmVyZW5jZUdyYXBoOiBSZWZlcmVuY2VHcmFwaHxudWxsO1xuICByb3V0ZUFuYWx5emVyOiBOZ01vZHVsZVJvdXRlQW5hbHl6ZXI7XG4gIGR0c1RyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVJlZ2lzdHJ5O1xuICBtd3BTY2FubmVyOiBNb2R1bGVXaXRoUHJvdmlkZXJzU2Nhbm5lcjtcbiAgZGVmYXVsdEltcG9ydFRyYWNrZXI6IERlZmF1bHRJbXBvcnRUcmFja2VyO1xuICBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsO1xuICByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyO1xuICB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyO1xuICByZXNvdXJjZVJlZ2lzdHJ5OiBSZXNvdXJjZVJlZ2lzdHJ5O1xufVxuXG5cblxuLyoqXG4gKiBEaXNjcmltaW5hbnQgdHlwZSBmb3IgYSBgQ29tcGlsYXRpb25UaWNrZXRgLlxuICovXG5leHBvcnQgZW51bSBDb21waWxhdGlvblRpY2tldEtpbmQge1xuICBGcmVzaCxcbiAgSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICBJbmNyZW1lbnRhbFJlc291cmNlLFxufVxuXG4vKipcbiAqIEJlZ2luIGFuIEFuZ3VsYXIgY29tcGlsYXRpb24gb3BlcmF0aW9uIGZyb20gc2NyYXRjaC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGcmVzaENvbXBpbGF0aW9uVGlja2V0IHtcbiAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoO1xuICBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucztcbiAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k7XG4gIHR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneTogVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5O1xuICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuO1xuICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW47XG4gIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbn1cblxuLyoqXG4gKiBCZWdpbiBhbiBBbmd1bGFyIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiB0aGF0IGluY29ycG9yYXRlcyBjaGFuZ2VzIHRvIFR5cGVTY3JpcHQgY29kZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFR5cGVTY3JpcHRDb21waWxhdGlvblRpY2tldCB7XG4gIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQ7XG4gIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zO1xuICBvbGRQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneTtcbiAgdHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3k7XG4gIG5ld0RyaXZlcjogSW5jcmVtZW50YWxEcml2ZXI7XG4gIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQge1xuICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZTtcbiAgY29tcGlsZXI6IE5nQ29tcGlsZXI7XG4gIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz47XG59XG5cbi8qKlxuICogQSByZXF1ZXN0IHRvIGJlZ2luIEFuZ3VsYXIgY29tcGlsYXRpb24sIGVpdGhlciBzdGFydGluZyBmcm9tIHNjcmF0Y2ggb3IgZnJvbSBhIGtub3duIHByaW9yIHN0YXRlLlxuICpcbiAqIGBDb21waWxhdGlvblRpY2tldGBzIGFyZSB1c2VkIHRvIGluaXRpYWxpemUgKG9yIHVwZGF0ZSkgYW4gYE5nQ29tcGlsZXJgIGluc3RhbmNlLCB0aGUgY29yZSBvZiB0aGVcbiAqIEFuZ3VsYXIgY29tcGlsZXIuIFRoZXkgYWJzdHJhY3QgdGhlIHN0YXJ0aW5nIHN0YXRlIG9mIGNvbXBpbGF0aW9uIGFuZCBhbGxvdyBgTmdDb21waWxlcmAgdG8gYmVcbiAqIG1hbmFnZWQgaW5kZXBlbmRlbnRseSBvZiBhbnkgaW5jcmVtZW50YWwgY29tcGlsYXRpb24gbGlmZWN5Y2xlLlxuICovXG5leHBvcnQgdHlwZSBDb21waWxhdGlvblRpY2tldCA9IEZyZXNoQ29tcGlsYXRpb25UaWNrZXR8SW5jcmVtZW50YWxUeXBlU2NyaXB0Q29tcGlsYXRpb25UaWNrZXR8XG4gICAgSW5jcmVtZW50YWxSZXNvdXJjZUNvbXBpbGF0aW9uVGlja2V0O1xuXG4vKipcbiAqIENyZWF0ZSBhIGBDb21waWxhdGlvblRpY2tldGAgZm9yIGEgYnJhbmQgbmV3IGNvbXBpbGF0aW9uLCB1c2luZyBubyBwcmlvciBzdGF0ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyZXNoQ29tcGlsYXRpb25UaWNrZXQoXG4gICAgdHNQcm9ncmFtOiB0cy5Qcm9ncmFtLCBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICB0eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSwgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbixcbiAgICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4pOiBDb21waWxhdGlvblRpY2tldCB7XG4gIHJldHVybiB7XG4gICAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoLFxuICAgIHRzUHJvZ3JhbSxcbiAgICBvcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICB0eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICB1c2VQb2lzb25lZERhdGEsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBhcyBlZmZpY2llbnRseSBhcyBwb3NzaWJsZSwgYmFzZWQgb24gYSBwcmV2aW91cyBgTmdDb21waWxlcmBcbiAqIGluc3RhbmNlIGFuZCBhIG5ldyBgdHMuUHJvZ3JhbWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmNyZW1lbnRhbEZyb21Db21waWxlclRpY2tldChcbiAgICBvbGRDb21waWxlcjogTmdDb21waWxlciwgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICB0eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3k6IFR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+KTogQ29tcGlsYXRpb25UaWNrZXQge1xuICBjb25zdCBvbGRQcm9ncmFtID0gb2xkQ29tcGlsZXIuZ2V0TmV4dFByb2dyYW0oKTtcbiAgY29uc3Qgb2xkRHJpdmVyID0gb2xkQ29tcGlsZXIuaW5jcmVtZW50YWxTdHJhdGVneS5nZXRJbmNyZW1lbnRhbERyaXZlcihvbGRQcm9ncmFtKTtcbiAgaWYgKG9sZERyaXZlciA9PT0gbnVsbCkge1xuICAgIC8vIE5vIGluY3JlbWVudGFsIHN0ZXAgaXMgcG9zc2libGUgaGVyZSwgc2luY2Ugbm8gSW5jcmVtZW50YWxEcml2ZXIgd2FzIGZvdW5kIGZvciB0aGUgb2xkXG4gICAgLy8gcHJvZ3JhbS5cbiAgICByZXR1cm4gZnJlc2hDb21waWxhdGlvblRpY2tldChcbiAgICAgICAgbmV3UHJvZ3JhbSwgb2xkQ29tcGlsZXIub3B0aW9ucywgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCB0eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgICAgIG9sZENvbXBpbGVyLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsIG9sZENvbXBpbGVyLnVzZVBvaXNvbmVkRGF0YSk7XG4gIH1cblxuICBjb25zdCBuZXdEcml2ZXIgPVxuICAgICAgSW5jcmVtZW50YWxEcml2ZXIucmVjb25jaWxlKG9sZFByb2dyYW0sIG9sZERyaXZlciwgbmV3UHJvZ3JhbSwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzKTtcblxuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQsXG4gICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogb2xkQ29tcGlsZXIuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICB1c2VQb2lzb25lZERhdGE6IG9sZENvbXBpbGVyLnVzZVBvaXNvbmVkRGF0YSxcbiAgICBvcHRpb25zOiBvbGRDb21waWxlci5vcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICB0eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgbmV3RHJpdmVyLFxuICAgIG9sZFByb2dyYW0sXG4gICAgbmV3UHJvZ3JhbSxcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGRpcmVjdGx5IGZyb20gYW4gb2xkIGB0cy5Qcm9ncmFtYCBhbmQgYXNzb2NpYXRlZCBBbmd1bGFyIGNvbXBpbGF0aW9uXG4gKiBzdGF0ZSwgYWxvbmcgd2l0aCBhIG5ldyBgdHMuUHJvZ3JhbWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbmNyZW1lbnRhbEZyb21Ecml2ZXJUaWNrZXQoXG4gICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlciwgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucywgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgdHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz4sXG4gICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbiwgdXNlUG9pc29uZWREYXRhOiBib29sZWFuKTogQ29tcGlsYXRpb25UaWNrZXQge1xuICBjb25zdCBuZXdEcml2ZXIgPVxuICAgICAgSW5jcmVtZW50YWxEcml2ZXIucmVjb25jaWxlKG9sZFByb2dyYW0sIG9sZERyaXZlciwgbmV3UHJvZ3JhbSwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzKTtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICAgIG9sZFByb2dyYW0sXG4gICAgbmV3UHJvZ3JhbSxcbiAgICBvcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBuZXdEcml2ZXIsXG4gICAgdHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb3VyY2VDaGFuZ2VUaWNrZXQoY29tcGlsZXI6IE5nQ29tcGlsZXIsIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz4pOlxuICAgIEluY3JlbWVudGFsUmVzb3VyY2VDb21waWxhdGlvblRpY2tldCB7XG4gIHJldHVybiB7XG4gICAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsUmVzb3VyY2UsXG4gICAgY29tcGlsZXIsXG4gICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzLFxuICB9O1xufVxuXG5cbi8qKlxuICogVGhlIGhlYXJ0IG9mIHRoZSBBbmd1bGFyIEl2eSBjb21waWxlci5cbiAqXG4gKiBUaGUgYE5nQ29tcGlsZXJgIHByb3ZpZGVzIGFuIEFQSSBmb3IgcGVyZm9ybWluZyBBbmd1bGFyIGNvbXBpbGF0aW9uIHdpdGhpbiBhIGN1c3RvbSBUeXBlU2NyaXB0XG4gKiBjb21waWxlci4gRWFjaCBpbnN0YW5jZSBvZiBgTmdDb21waWxlcmAgc3VwcG9ydHMgYSBzaW5nbGUgY29tcGlsYXRpb24sIHdoaWNoIG1pZ2h0IGJlXG4gKiBpbmNyZW1lbnRhbC5cbiAqXG4gKiBgTmdDb21waWxlcmAgaXMgbGF6eSwgYW5kIGRvZXMgbm90IHBlcmZvcm0gYW55IG9mIHRoZSB3b3JrIG9mIHRoZSBjb21waWxhdGlvbiB1bnRpbCBvbmUgb2YgaXRzXG4gKiBvdXRwdXQgbWV0aG9kcyAoZS5nLiBgZ2V0RGlhZ25vc3RpY3NgKSBpcyBjYWxsZWQuXG4gKlxuICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ0NvbXBpbGVyIHtcbiAgLyoqXG4gICAqIExhemlseSBldmFsdWF0ZWQgc3RhdGUgb2YgdGhlIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIGNyZWF0ZWQgb24gZGVtYW5kIGJ5IGNhbGxpbmcgYGVuc3VyZUFuYWx5emVkYC5cbiAgICovXG4gIHByaXZhdGUgY29tcGlsYXRpb246IExhenlDb21waWxhdGlvblN0YXRlfG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBBbnkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgY29uc3RydWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhlc2UgYXJlIGRpYWdub3N0aWNzIHdoaWNoIGFyb3NlIGR1cmluZyBzZXR1cCBvZiB0aGUgaG9zdCBhbmQvb3IgcHJvZ3JhbS5cbiAgICovXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBOb24tdGVtcGxhdGUgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgcHJvZ3JhbSBpdHNlbGYuIERvZXMgbm90IGluY2x1ZGUgdGVtcGxhdGVcbiAgICogZGlhZ25vc3RpY3MgYmVjYXVzZSB0aGUgdGVtcGxhdGUgdHlwZSBjaGVja2VyIG1lbW9pemVzIHRoZW0gaXRzZWxmLlxuICAgKlxuICAgKiBUaGlzIGlzIHNldCBieSAoYW5kIG1lbW9pemVzKSBgZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljc2AuXG4gICAqL1xuICBwcml2YXRlIG5vblRlbXBsYXRlRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgbmV4dFByb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgZW50cnlQb2ludDogdHMuU291cmNlRmlsZXxudWxsO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICByZWFkb25seSBpZ25vcmVGb3JEaWFnbm9zdGljczogU2V0PHRzLlNvdXJjZUZpbGU+O1xuICByZWFkb25seSBpZ25vcmVGb3JFbWl0OiBTZXQ8dHMuU291cmNlRmlsZT47XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGludG8gYW4gYE5nQ29tcGlsZXJgIGluc3RhbmNlIGZvciB0aGUgcmVxdWVzdGVkIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBEZXBlbmRpbmcgb24gdGhlIG5hdHVyZSBvZiB0aGUgY29tcGlsYXRpb24gcmVxdWVzdCwgdGhlIGBOZ0NvbXBpbGVyYCBpbnN0YW5jZSBtYXkgYmUgcmV1c2VkXG4gICAqIGZyb20gYSBwcmV2aW91cyBjb21waWxhdGlvbiBhbmQgdXBkYXRlZCB3aXRoIGFueSBjaGFuZ2VzLCBpdCBtYXkgYmUgYSBuZXcgaW5zdGFuY2Ugd2hpY2hcbiAgICogaW5jcmVtZW50YWxseSByZXVzZXMgc3RhdGUgZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uLCBvciBpdCBtYXkgcmVwcmVzZW50IGEgZnJlc2ggY29tcGlsYXRpb25cbiAgICogZW50aXJlbHkuXG4gICAqL1xuICBzdGF0aWMgZnJvbVRpY2tldChcbiAgICAgIHRpY2tldDogQ29tcGlsYXRpb25UaWNrZXQsIGFkYXB0ZXI6IE5nQ29tcGlsZXJBZGFwdGVyLCBwZXJmUmVjb3JkZXI/OiBQZXJmUmVjb3JkZXIpIHtcbiAgICBzd2l0Y2ggKHRpY2tldC5raW5kKSB7XG4gICAgICBjYXNlIENvbXBpbGF0aW9uVGlja2V0S2luZC5GcmVzaDpcbiAgICAgICAgcmV0dXJuIG5ldyBOZ0NvbXBpbGVyKFxuICAgICAgICAgICAgYWRhcHRlcixcbiAgICAgICAgICAgIHRpY2tldC5vcHRpb25zLFxuICAgICAgICAgICAgdGlja2V0LnRzUHJvZ3JhbSxcbiAgICAgICAgICAgIHRpY2tldC50eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgICAgICAgICB0aWNrZXQuaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgICAgICAgICAgSW5jcmVtZW50YWxEcml2ZXIuZnJlc2godGlja2V0LnRzUHJvZ3JhbSksXG4gICAgICAgICAgICB0aWNrZXQuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgICAgIHRpY2tldC51c2VQb2lzb25lZERhdGEsXG4gICAgICAgICAgICBwZXJmUmVjb3JkZXIsXG4gICAgICAgICk7XG4gICAgICBjYXNlIENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQ6XG4gICAgICAgIHJldHVybiBuZXcgTmdDb21waWxlcihcbiAgICAgICAgICAgIGFkYXB0ZXIsXG4gICAgICAgICAgICB0aWNrZXQub3B0aW9ucyxcbiAgICAgICAgICAgIHRpY2tldC5uZXdQcm9ncmFtLFxuICAgICAgICAgICAgdGlja2V0LnR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneSxcbiAgICAgICAgICAgIHRpY2tldC5pbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICAgICAgICB0aWNrZXQubmV3RHJpdmVyLFxuICAgICAgICAgICAgdGlja2V0LmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgICAgICB0aWNrZXQudXNlUG9pc29uZWREYXRhLFxuICAgICAgICAgICAgcGVyZlJlY29yZGVyLFxuICAgICAgICApO1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZTpcbiAgICAgICAgY29uc3QgY29tcGlsZXIgPSB0aWNrZXQuY29tcGlsZXI7XG4gICAgICAgIGNvbXBpbGVyLnVwZGF0ZVdpdGhDaGFuZ2VkUmVzb3VyY2VzKHRpY2tldC5tb2RpZmllZFJlc291cmNlRmlsZXMpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXI7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgYWRhcHRlcjogTmdDb21waWxlckFkYXB0ZXIsXG4gICAgICByZWFkb25seSBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgdHNQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgcmVhZG9ubHkgdHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgICByZWFkb25seSBpbmNyZW1lbnRhbFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgICByZWFkb25seSBpbmNyZW1lbnRhbERyaXZlcjogSW5jcmVtZW50YWxEcml2ZXIsXG4gICAgICByZWFkb25seSBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuLFxuICAgICAgcmVhZG9ubHkgdXNlUG9pc29uZWREYXRhOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBwZXJmUmVjb3JkZXI6IFBlcmZSZWNvcmRlciA9IE5PT1BfUEVSRl9SRUNPUkRFUixcbiAgKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuYWRhcHRlci5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcyk7XG4gICAgY29uc3QgaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMgPSB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xuICAgIGlmIChpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljKTtcbiAgICB9XG5cbiAgICB0aGlzLm5leHRQcm9ncmFtID0gdHNQcm9ncmFtO1xuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhdGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID1cbiAgICAgICAgYWRhcHRlci5lbnRyeVBvaW50ICE9PSBudWxsID8gZ2V0U291cmNlRmlsZU9yTnVsbCh0c1Byb2dyYW0sIGFkYXB0ZXIuZW50cnlQb2ludCkgOiBudWxsO1xuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmFkYXB0ZXIuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgICAgICAvLyBOb3RlOiB0aGlzIHVzZWQgdG8gYmUgYW4gYXJyb3ctZnVuY3Rpb24gY2xvc3VyZS4gSG93ZXZlciwgSlMgZW5naW5lcyBsaWtlIHY4IGhhdmUgc29tZVxuICAgICAgICAvLyBzdHJhbmdlIGJlaGF2aW9ycyB3aXRoIHJldGFpbmluZyB0aGUgbGV4aWNhbCBzY29wZSBvZiB0aGUgY2xvc3VyZS4gRXZlbiBpZiB0aGlzIGZ1bmN0aW9uXG4gICAgICAgIC8vIGRvZXNuJ3QgcmV0YWluIGEgcmVmZXJlbmNlIHRvIGB0aGlzYCwgaWYgb3RoZXIgY2xvc3VyZXMgaW4gdGhlIGNvbnN0cnVjdG9yIGhlcmUgcmVmZXJlbmNlXG4gICAgICAgIC8vIGB0aGlzYCBpbnRlcm5hbGx5IHRoZW4gYSBjbG9zdXJlIGNyZWF0ZWQgaGVyZSB3b3VsZCByZXRhaW4gdGhlbS4gVGhpcyBjYW4gY2F1c2UgbWFqb3JcbiAgICAgICAgLy8gbWVtb3J5IGxlYWsgaXNzdWVzIHNpbmNlIHRoZSBgbW9kdWxlUmVzb2x1dGlvbkNhY2hlYCBpcyBhIGxvbmctbGl2ZWQgb2JqZWN0IGFuZCBmaW5kcyBpdHNcbiAgICAgICAgLy8gd2F5IGludG8gYWxsIGtpbmRzIG9mIHBsYWNlcyBpbnNpZGUgVFMgaW50ZXJuYWwgb2JqZWN0cy5cbiAgICAgICAgdGhpcy5hZGFwdGVyLmdldENhbm9uaWNhbEZpbGVOYW1lLmJpbmQodGhpcy5hZGFwdGVyKSk7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHZlciA9XG4gICAgICAgIG5ldyBNb2R1bGVSZXNvbHZlcih0c1Byb2dyYW0sIHRoaXMub3B0aW9ucywgdGhpcy5hZGFwdGVyLCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUpO1xuICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyID0gbmV3IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcihhZGFwdGVyLCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMuY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKG5ldyBJbXBvcnRHcmFwaCh0aGlzLm1vZHVsZVJlc29sdmVyKSk7XG4gICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsRHJpdmVyKHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsIHRzUHJvZ3JhbSk7XG5cbiAgICB0aGlzLmlnbm9yZUZvckRpYWdub3N0aWNzID1cbiAgICAgICAgbmV3IFNldCh0c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gdGhpcy5hZGFwdGVyLmlzU2hpbShzZikpKTtcbiAgICB0aGlzLmlnbm9yZUZvckVtaXQgPSB0aGlzLmFkYXB0ZXIuaWdub3JlRm9yRW1pdDtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlV2l0aENoYW5nZWRSZXNvdXJjZXMoY2hhbmdlZFJlc291cmNlczogU2V0PHN0cmluZz4pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgLy8gQW5hbHlzaXMgaGFzbid0IGhhcHBlbmVkIHlldCwgc28gbm8gdXBkYXRlIGlzIG5lY2Vzc2FyeSAtIGFueSBjaGFuZ2VzIHRvIHJlc291cmNlcyB3aWxsIGJlXG4gICAgICAvLyBjYXB0dXJlZCBieSB0aGUgaW5pdGFsIGFuYWx5c2lzIHBhc3MgaXRzZWxmLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyLmludmFsaWRhdGUoKTtcblxuICAgIGNvbnN0IGNsYXNzZXNUb1VwZGF0ZSA9IG5ldyBTZXQ8RGVjbGFyYXRpb25Ob2RlPigpO1xuICAgIGZvciAoY29uc3QgcmVzb3VyY2VGaWxlIG9mIGNoYW5nZWRSZXNvdXJjZXMpIHtcbiAgICAgIGZvciAoY29uc3QgdGVtcGxhdGVDbGFzcyBvZiB0aGlzLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKHJlc291cmNlRmlsZSkpIHtcbiAgICAgICAgY2xhc3Nlc1RvVXBkYXRlLmFkZCh0ZW1wbGF0ZUNsYXNzKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBzdHlsZUNsYXNzIG9mIHRoaXMuZ2V0Q29tcG9uZW50c1dpdGhTdHlsZUZpbGUocmVzb3VyY2VGaWxlKSkge1xuICAgICAgICBjbGFzc2VzVG9VcGRhdGUuYWRkKHN0eWxlQ2xhc3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgY2xhenogb2YgY2xhc3Nlc1RvVXBkYXRlKSB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIudXBkYXRlUmVzb3VyY2VzKGNsYXp6KTtcbiAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmludmFsaWRhdGVDbGFzcyhjbGF6eik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgZGVwZW5kZW5jaWVzIG9mIGEgZmlsZS5cbiAgICpcbiAgICogSWYgdGhlIGZpbGUgaXMgbm90IHBhcnQgb2YgdGhlIGNvbXBpbGF0aW9uLCBhbiBlbXB0eSBhcnJheSB3aWxsIGJlIHJldHVybmVkLlxuICAgKi9cbiAgZ2V0UmVzb3VyY2VEZXBlbmRlbmNpZXMoZmlsZTogdHMuU291cmNlRmlsZSk6IHN0cmluZ1tdIHtcbiAgICB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICByZXR1cm4gdGhpcy5pbmNyZW1lbnRhbERyaXZlci5kZXBHcmFwaC5nZXRSZXNvdXJjZURlcGVuZGVuY2llcyhmaWxlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIEFuZ3VsYXItcmVsYXRlZCBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICovXG4gIGdldERpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkTWVzc2FnZVRleHREZXRhaWxzKFxuICAgICAgICBbLi4udGhpcy5nZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCksIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljcygpXSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBBbmd1bGFyLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIElmIGEgYHRzLlNvdXJjZUZpbGVgIGlzIHBhc3NlZCwgb25seSBkaWFnbm9zdGljcyByZWxhdGVkIHRvIHRoYXQgZmlsZSBhcmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXREaWFnbm9zdGljc0ZvckZpbGUoZmlsZTogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5hZGRNZXNzYWdlVGV4dERldGFpbHMoW1xuICAgICAgLi4udGhpcy5nZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCkuZmlsdGVyKGRpYWcgPT4gZGlhZy5maWxlID09PSBmaWxlKSxcbiAgICAgIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljc0ZvckZpbGUoZmlsZSwgb3B0aW1pemVGb3IpXG4gICAgXSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIEFuZ3VsYXIuaW8gZXJyb3IgZ3VpZGUgbGlua3MgdG8gZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGFkZE1lc3NhZ2VUZXh0RGV0YWlscyhkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gZGlhZ25vc3RpY3MubWFwKGRpYWcgPT4ge1xuICAgICAgaWYgKGRpYWcuY29kZSAmJiBDT01QSUxFUl9FUlJPUlNfV0lUSF9HVUlERVMuaGFzKG5nRXJyb3JDb2RlKGRpYWcuY29kZSkpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4uZGlhZyxcbiAgICAgICAgICBtZXNzYWdlVGV4dDogZGlhZy5tZXNzYWdlVGV4dCArXG4gICAgICAgICAgICAgIGAuIEZpbmQgbW9yZSBhdCAke0VSUk9SX0RFVEFJTFNfUEFHRV9CQVNFX1VSTH0vTkcke25nRXJyb3JDb2RlKGRpYWcuY29kZSl9YFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRpYWc7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBzZXR1cC1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGB0cy5Qcm9ncmFtYCB0byB1c2UgYXMgYSBzdGFydGluZyBwb2ludCB3aGVuIHNwYXduaW5nIGEgc3Vic2VxdWVudCBpbmNyZW1lbnRhbFxuICAgKiBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhlIGBOZ0NvbXBpbGVyYCBzcGF3bnMgYW4gaW50ZXJuYWwgaW5jcmVtZW50YWwgVHlwZVNjcmlwdCBjb21waWxhdGlvbiAoaW5oZXJpdGluZyB0aGVcbiAgICogY29uc3VtZXIncyBgdHMuUHJvZ3JhbWAgaW50byBhIG5ldyBvbmUgZm9yIHRoZSBwdXJwb3NlcyBvZiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nKS4gQWZ0ZXIgdGhpc1xuICAgKiBvcGVyYXRpb24sIHRoZSBjb25zdW1lcidzIGB0cy5Qcm9ncmFtYCBpcyBubyBsb25nZXIgdXNhYmxlIGZvciBzdGFydGluZyBhIG5ldyBpbmNyZW1lbnRhbFxuICAgKiBjb21waWxhdGlvbi4gYGdldE5leHRQcm9ncmFtYCByZXRyaWV2ZXMgdGhlIGB0cy5Qcm9ncmFtYCB3aGljaCBjYW4gYmUgdXNlZCBpbnN0ZWFkLlxuICAgKi9cbiAgZ2V0TmV4dFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMubmV4dFByb2dyYW07XG4gIH1cblxuICBnZXRUZW1wbGF0ZVR5cGVDaGVja2VyKCk6IFRlbXBsYXRlVHlwZUNoZWNrZXIge1xuICAgIGlmICghdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ1RoZSBgVGVtcGxhdGVUeXBlQ2hlY2tlcmAgZG9lcyBub3Qgd29yayB3aXRob3V0IGBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyYC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKS50ZW1wbGF0ZVR5cGVDaGVja2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyB0aGUgYHRzLkRlY2xhcmF0aW9uYHMgZm9yIGFueSBjb21wb25lbnQocykgd2hpY2ggdXNlIHRoZSBnaXZlbiB0ZW1wbGF0ZSBmaWxlLlxuICAgKi9cbiAgZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZUZpbGUodGVtcGxhdGVGaWxlUGF0aDogc3RyaW5nKTogUmVhZG9ubHlTZXQ8RGVjbGFyYXRpb25Ob2RlPiB7XG4gICAgY29uc3Qge3Jlc291cmNlUmVnaXN0cnl9ID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIHJldHVybiByZXNvdXJjZVJlZ2lzdHJ5LmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGUocmVzb2x2ZSh0ZW1wbGF0ZUZpbGVQYXRoKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBgdHMuRGVjbGFyYXRpb25gcyBmb3IgYW55IGNvbXBvbmVudChzKSB3aGljaCB1c2UgdGhlIGdpdmVuIHRlbXBsYXRlIGZpbGUuXG4gICAqL1xuICBnZXRDb21wb25lbnRzV2l0aFN0eWxlRmlsZShzdHlsZUZpbGVQYXRoOiBzdHJpbmcpOiBSZWFkb25seVNldDxEZWNsYXJhdGlvbk5vZGU+IHtcbiAgICBjb25zdCB7cmVzb3VyY2VSZWdpc3RyeX0gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIHJlc291cmNlUmVnaXN0cnkuZ2V0Q29tcG9uZW50c1dpdGhTdHlsZShyZXNvbHZlKHN0eWxlRmlsZVBhdGgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgZXh0ZXJuYWwgcmVzb3VyY2VzIGZvciB0aGUgZ2l2ZW4gY29tcG9uZW50LlxuICAgKi9cbiAgZ2V0Q29tcG9uZW50UmVzb3VyY2VzKGNsYXNzRGVjbDogRGVjbGFyYXRpb25Ob2RlKTogQ29tcG9uZW50UmVzb3VyY2VzfG51bGwge1xuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oY2xhc3NEZWNsKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHtyZXNvdXJjZVJlZ2lzdHJ5fSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBzdHlsZXMgPSByZXNvdXJjZVJlZ2lzdHJ5LmdldFN0eWxlcyhjbGFzc0RlY2wpO1xuICAgIGNvbnN0IHRlbXBsYXRlID0gcmVzb3VyY2VSZWdpc3RyeS5nZXRUZW1wbGF0ZShjbGFzc0RlY2wpO1xuICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtzdHlsZXMsIHRlbXBsYXRlfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIEFuZ3VsYXIncyBhbmFseXNpcyBzdGVwIChhcyBhIHByZWN1cnNvciB0byBgZ2V0RGlhZ25vc3RpY3NgIG9yIGBwcmVwYXJlRW1pdGApXG4gICAqIGFzeW5jaHJvbm91c2x5LlxuICAgKlxuICAgKiBOb3JtYWxseSwgdGhpcyBvcGVyYXRpb24gaGFwcGVucyBsYXppbHkgd2hlbmV2ZXIgYGdldERpYWdub3N0aWNzYCBvciBgcHJlcGFyZUVtaXRgIGFyZSBjYWxsZWQuXG4gICAqIEhvd2V2ZXIsIGNlcnRhaW4gY29uc3VtZXJzIG1heSB3aXNoIHRvIGFsbG93IGZvciBhbiBhc3luY2hyb25vdXMgcGhhc2Ugb2YgYW5hbHlzaXMsIHdoZXJlXG4gICAqIHJlc291cmNlcyBzdWNoIGFzIGBzdHlsZVVybHNgIGFyZSByZXNvbHZlZCBhc3luY2hvbm91c2x5LiBJbiB0aGVzZSBjYXNlcyBgYW5hbHl6ZUFzeW5jYCBtdXN0IGJlXG4gICAqIGNhbGxlZCBmaXJzdCwgYW5kIGl0cyBgUHJvbWlzZWAgYXdhaXRlZCBwcmlvciB0byBjYWxsaW5nIGFueSBvdGhlciBBUElzIG9mIGBOZ0NvbXBpbGVyYC5cbiAgICovXG4gIGFzeW5jIGFuYWx5emVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcblxuICAgIGNvbnN0IGFuYWx5emVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emUnKTtcbiAgICBjb25zdCBwcm9taXNlczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFuYWx5emVGaWxlU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplRmlsZScsIHNmKTtcbiAgICAgIGxldCBhbmFseXNpc1Byb21pc2UgPSB0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuYW5hbHl6ZUFzeW5jKHNmKTtcbiAgICAgIHRoaXMuc2NhbkZvck13cChzZik7XG4gICAgICBpZiAoYW5hbHlzaXNQcm9taXNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplRmlsZVNwYW4pO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnBlcmZSZWNvcmRlci5lbmFibGVkKSB7XG4gICAgICAgIGFuYWx5c2lzUHJvbWlzZSA9IGFuYWx5c2lzUHJvbWlzZS50aGVuKCgpID0+IHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKSk7XG4gICAgICB9XG4gICAgICBpZiAoYW5hbHlzaXNQcm9taXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcHJvbWlzZXMucHVzaChhbmFseXNpc1Byb21pc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcblxuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZVNwYW4pO1xuXG4gICAgdGhpcy5yZXNvbHZlQ29tcGlsYXRpb24odGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGxhenkgcm91dGVzIGRldGVjdGVkIGR1cmluZyBhbmFseXNpcy5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgY2FsbGVkIGZvciBvbmUgc3BlY2lmaWMgcm91dGUsIG9yIHRvIHJldHJpZXZlIGFsbCB0b3AtbGV2ZWwgcm91dGVzLlxuICAgKi9cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdIHtcbiAgICBpZiAoZW50cnlSb3V0ZSkge1xuICAgICAgLy8gTm90ZTpcbiAgICAgIC8vIFRoaXMgcmVzb2x1dGlvbiBzdGVwIGlzIGhlcmUgdG8gbWF0Y2ggdGhlIGltcGxlbWVudGF0aW9uIG9mIHRoZSBvbGQgYEFvdENvbXBpbGVySG9zdGAgKHNlZVxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9ibG9iLzUwNzMyZTE1Ni9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL3RyYW5zZm9ybWVycy9jb21waWxlcl9ob3N0LnRzI0wxNzUtTDE4OCkuXG4gICAgICAvL1xuICAgICAgLy8gYEBhbmd1bGFyL2NsaWAgd2lsbCBhbHdheXMgY2FsbCB0aGlzIEFQSSB3aXRoIGFuIGFic29sdXRlIHBhdGgsIHNvIHRoZSByZXNvbHV0aW9uIHN0ZXAgaXNcbiAgICAgIC8vIG5vdCBuZWNlc3NhcnksIGJ1dCBrZWVwaW5nIGl0IGJhY2t3YXJkcyBjb21wYXRpYmxlIGluIGNhc2Ugc29tZW9uZSBlbHNlIGlzIHVzaW5nIHRoZSBBUEkuXG5cbiAgICAgIC8vIFJlbGF0aXZlIGVudHJ5IHBhdGhzIGFyZSBkaXNhbGxvd2VkLlxuICAgICAgaWYgKGVudHJ5Um91dGUuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGxpc3QgbGF6eSByb3V0ZXM6IFJlc29sdXRpb24gb2YgcmVsYXRpdmUgcGF0aHMgKCR7XG4gICAgICAgICAgICBlbnRyeVJvdXRlfSkgaXMgbm90IHN1cHBvcnRlZC5gKTtcbiAgICAgIH1cblxuICAgICAgLy8gTm9uLXJlbGF0aXZlIGVudHJ5IHBhdGhzIGZhbGwgaW50byBvbmUgb2YgdGhlIGZvbGxvd2luZyBjYXRlZ29yaWVzOlxuICAgICAgLy8gLSBBYnNvbHV0ZSBzeXN0ZW0gcGF0aHMgKGUuZy4gYC9mb28vYmFyL215LXByb2plY3QvbXktbW9kdWxlYCksIHdoaWNoIGFyZSB1bmFmZmVjdGVkIGJ5IHRoZVxuICAgICAgLy8gICBsb2dpYyBiZWxvdy5cbiAgICAgIC8vIC0gUGF0aHMgdG8gZW50ZXJuYWwgbW9kdWxlcyAoZS5nLiBgc29tZS1saWJgKS5cbiAgICAgIC8vIC0gUGF0aHMgbWFwcGVkIHRvIGRpcmVjdG9yaWVzIGluIGB0c2NvbmZpZy5qc29uYCAoZS5nLiBgc2hhcmVkL215LW1vZHVsZWApLlxuICAgICAgLy8gICAoU2VlIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL21vZHVsZS1yZXNvbHV0aW9uLmh0bWwjcGF0aC1tYXBwaW5nLilcbiAgICAgIC8vXG4gICAgICAvLyBJbiBhbGwgY2FzZXMgYWJvdmUsIHRoZSBgY29udGFpbmluZ0ZpbGVgIGFyZ3VtZW50IGlzIGlnbm9yZWQsIHNvIHdlIGNhbiBqdXN0IHRha2UgdGhlIGZpcnN0XG4gICAgICAvLyBvZiB0aGUgcm9vdCBmaWxlcy5cbiAgICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gdGhpcy50c1Byb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpWzBdO1xuICAgICAgY29uc3QgW2VudHJ5UGF0aCwgbW9kdWxlTmFtZV0gPSBlbnRyeVJvdXRlLnNwbGl0KCcjJyk7XG4gICAgICBjb25zdCByZXNvbHZlZE1vZHVsZSA9XG4gICAgICAgICAgcmVzb2x2ZU1vZHVsZU5hbWUoZW50cnlQYXRoLCBjb250YWluaW5nRmlsZSwgdGhpcy5vcHRpb25zLCB0aGlzLmFkYXB0ZXIsIG51bGwpO1xuXG4gICAgICBpZiAocmVzb2x2ZWRNb2R1bGUpIHtcbiAgICAgICAgZW50cnlSb3V0ZSA9IGVudHJ5UG9pbnRLZXlGb3IocmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSwgbW9kdWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIGNvbXBpbGF0aW9uLnJvdXRlQW5hbHl6ZXIubGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZSk7XG4gIH1cblxuICAvKipcbiAgICogRmV0Y2ggdHJhbnNmb3JtZXJzIGFuZCBvdGhlciBpbmZvcm1hdGlvbiB3aGljaCBpcyBuZWNlc3NhcnkgZm9yIGEgY29uc3VtZXIgdG8gYGVtaXRgIHRoZVxuICAgKiBwcm9ncmFtIHdpdGggQW5ndWxhci1hZGRlZCBkZWZpbml0aW9ucy5cbiAgICovXG4gIHByZXBhcmVFbWl0KCk6IHtcbiAgICB0cmFuc2Zvcm1lcnM6IHRzLkN1c3RvbVRyYW5zZm9ybWVycyxcbiAgfSB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICBjb25zdCBjb3JlSW1wb3J0c0Zyb20gPSBjb21waWxhdGlvbi5pc0NvcmUgPyBnZXRSM1N5bWJvbHNGaWxlKHRoaXMudHNQcm9ncmFtKSA6IG51bGw7XG4gICAgbGV0IGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcjtcbiAgICBpZiAoY29yZUltcG9ydHNGcm9tICE9PSBudWxsKSB7XG4gICAgICBpbXBvcnRSZXdyaXRlciA9IG5ldyBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlcihjb3JlSW1wb3J0c0Zyb20uZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbXBvcnRSZXdyaXRlciA9IG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKTtcbiAgICB9XG5cbiAgICBjb25zdCBiZWZvcmUgPSBbXG4gICAgICBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIsIGNvbXBpbGF0aW9uLnJlZmxlY3RvciwgaW1wb3J0UmV3cml0ZXIsXG4gICAgICAgICAgY29tcGlsYXRpb24uZGVmYXVsdEltcG9ydFRyYWNrZXIsIGNvbXBpbGF0aW9uLmlzQ29yZSwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkKSxcbiAgICAgIGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmV4cG9ydFN0YXRlbWVudHMpLFxuICAgICAgY29tcGlsYXRpb24uZGVmYXVsdEltcG9ydFRyYWNrZXIuaW1wb3J0UHJlc2VydmluZ1RyYW5zZm9ybWVyKCksXG4gICAgXTtcblxuICAgIGNvbnN0IGFmdGVyRGVjbGFyYXRpb25zOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT5bXSA9IFtdO1xuICAgIGlmIChjb21waWxhdGlvbi5kdHNUcmFuc2Zvcm1zICE9PSBudWxsKSB7XG4gICAgICBhZnRlckRlY2xhcmF0aW9ucy5wdXNoKFxuICAgICAgICAgIGRlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi5kdHNUcmFuc2Zvcm1zLCBpbXBvcnRSZXdyaXRlcikpO1xuICAgIH1cblxuICAgIC8vIE9ubHkgYWRkIGFsaWFzaW5nIHJlLWV4cG9ydHMgdG8gdGhlIC5kLnRzIG91dHB1dCBpZiB0aGUgYEFsaWFzaW5nSG9zdGAgcmVxdWVzdHMgaXQuXG4gICAgaWYgKGNvbXBpbGF0aW9uLmFsaWFzaW5nSG9zdCAhPT0gbnVsbCAmJiBjb21waWxhdGlvbi5hbGlhc2luZ0hvc3QuYWxpYXNFeHBvcnRzSW5EdHMpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zLnB1c2goYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZXhwb3J0U3RhdGVtZW50cykpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIGJlZm9yZS5wdXNoKFxuICAgICAgICAgIGdlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm0odGhpcy5hZGFwdGVyLmZhY3RvcnlUcmFja2VyLnNvdXJjZUluZm8sIGltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuICAgIGJlZm9yZS5wdXNoKGl2eVN3aXRjaFRyYW5zZm9ybSk7XG5cbiAgICByZXR1cm4ge3RyYW5zZm9ybWVyczoge2JlZm9yZSwgYWZ0ZXJEZWNsYXJhdGlvbnN9IGFzIHRzLkN1c3RvbVRyYW5zZm9ybWVyc307XG4gIH1cblxuICAvKipcbiAgICogUnVuIHRoZSBpbmRleGluZyBwcm9jZXNzIGFuZCByZXR1cm4gYSBgTWFwYCBvZiBhbGwgaW5kZXhlZCBjb21wb25lbnRzLlxuICAgKlxuICAgKiBTZWUgdGhlIGBpbmRleGluZ2AgcGFja2FnZSBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKi9cbiAgZ2V0SW5kZXhlZENvbXBvbmVudHMoKTogTWFwPERlY2xhcmF0aW9uTm9kZSwgSW5kZXhlZENvbXBvbmVudD4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBuZXcgSW5kZXhpbmdDb250ZXh0KCk7XG4gICAgY29tcGlsYXRpb24udHJhaXRDb21waWxlci5pbmRleChjb250ZXh0KTtcbiAgICByZXR1cm4gZ2VuZXJhdGVBbmFseXNpcyhjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQW5hbHl6ZWQodGhpczogTmdDb21waWxlcik6IExhenlDb21waWxhdGlvblN0YXRlIHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5hbmFseXplU3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxhdGlvbiE7XG4gIH1cblxuICBwcml2YXRlIGFuYWx5emVTeW5jKCk6IHZvaWQge1xuICAgIGNvbnN0IGFuYWx5emVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emUnKTtcbiAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcbiAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGFuYWx5emVGaWxlU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplRmlsZScsIHNmKTtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplU3luYyhzZik7XG4gICAgICB0aGlzLnNjYW5Gb3JNd3Aoc2YpO1xuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplRmlsZVNwYW4pO1xuICAgIH1cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVTcGFuKTtcblxuICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlcik7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVDb21waWxhdGlvbih0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgdHJhaXRDb21waWxlci5yZXNvbHZlKCk7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBhbmFseXNpcyBpcyBjb21wbGV0ZSBhbmQgdGhlIGNvbXBpbGVyIGNhbiBub3cgY2FsY3VsYXRlIHdoaWNoIGZpbGVzIG5lZWQgdG9cbiAgICAvLyBiZSBlbWl0dGVkLCBzbyBkbyB0aGF0LlxuICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIucmVjb3JkU3VjY2Vzc2Z1bEFuYWx5c2lzKHRyYWl0Q29tcGlsZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgZnVsbFRlbXBsYXRlVHlwZUNoZWNrKCk6IGJvb2xlYW4ge1xuICAgIC8vIERldGVybWluZSB0aGUgc3RyaWN0bmVzcyBsZXZlbCBvZiB0eXBlIGNoZWNraW5nIGJhc2VkIG9uIGNvbXBpbGVyIG9wdGlvbnMuIEFzXG4gICAgLy8gYHN0cmljdFRlbXBsYXRlc2AgaXMgYSBzdXBlcnNldCBvZiBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCwgdGhlIGZvcm1lciBpbXBsaWVzIHRoZSBsYXR0ZXIuXG4gICAgLy8gQWxzbyBzZWUgYHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zYCB3aGVyZSBpdCBpcyB2ZXJpZmllZCB0aGF0IGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgXG4gICAgLy8gaXMgbm90IGRpc2FibGVkIHdoZW4gYHN0cmljdFRlbXBsYXRlc2AgaXMgZW5hYmxlZC5cbiAgICBjb25zdCBzdHJpY3RUZW1wbGF0ZXMgPSAhIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXM7XG4gICAgcmV0dXJuIHN0cmljdFRlbXBsYXRlcyB8fCAhIXRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2s7XG4gIH1cblxuICBwcml2YXRlIGdldFR5cGVDaGVja2luZ0NvbmZpZygpOiBUeXBlQ2hlY2tpbmdDb25maWcge1xuICAgIC8vIERldGVybWluZSB0aGUgc3RyaWN0bmVzcyBsZXZlbCBvZiB0eXBlIGNoZWNraW5nIGJhc2VkIG9uIGNvbXBpbGVyIG9wdGlvbnMuIEFzXG4gICAgLy8gYHN0cmljdFRlbXBsYXRlc2AgaXMgYSBzdXBlcnNldCBvZiBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCwgdGhlIGZvcm1lciBpbXBsaWVzIHRoZSBsYXR0ZXIuXG4gICAgLy8gQWxzbyBzZWUgYHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zYCB3aGVyZSBpdCBpcyB2ZXJpZmllZCB0aGF0IGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgXG4gICAgLy8gaXMgbm90IGRpc2FibGVkIHdoZW4gYHN0cmljdFRlbXBsYXRlc2AgaXMgZW5hYmxlZC5cbiAgICBjb25zdCBzdHJpY3RUZW1wbGF0ZXMgPSAhIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXM7XG5cbiAgICAvLyBGaXJzdCBzZWxlY3QgYSB0eXBlLWNoZWNraW5nIGNvbmZpZ3VyYXRpb24sIGJhc2VkIG9uIHdoZXRoZXIgZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGlzXG4gICAgLy8gcmVxdWVzdGVkLlxuICAgIGxldCB0eXBlQ2hlY2tpbmdDb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZztcbiAgICBpZiAodGhpcy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogdHJ1ZSxcbiAgICAgICAgYWx3YXlzQ2hlY2tTY2hlbWFJblRlbXBsYXRlQm9kaWVzOiB0cnVlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIEV2ZW4gaW4gZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIERPTSBiaW5kaW5nIGNoZWNrcyBhcmUgbm90IHF1aXRlIHJlYWR5IHlldC5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIENoZWNraW5nIG9mIERPTSBldmVudHMgY3VycmVudGx5IGhhcyBhbiBhZHZlcnNlIGVmZmVjdCBvbiBkZXZlbG9wZXIgZXhwZXJpZW5jZSxcbiAgICAgICAgLy8gZS5nLiBmb3IgYDxpbnB1dCAoYmx1cik9XCJ1cGRhdGUoJGV2ZW50LnRhcmdldC52YWx1ZSlcIj5gIGVuYWJsaW5nIHRoaXMgY2hlY2sgcmVzdWx0cyBpbjpcbiAgICAgICAgLy8gLSBlcnJvciBUUzI1MzE6IE9iamVjdCBpcyBwb3NzaWJseSAnbnVsbCcuXG4gICAgICAgIC8vIC0gZXJyb3IgVFMyMzM5OiBQcm9wZXJ0eSAndmFsdWUnIGRvZXMgbm90IGV4aXN0IG9uIHR5cGUgJ0V2ZW50VGFyZ2V0Jy5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIE5vbi1ET00gcmVmZXJlbmNlcyBoYXZlIHRoZSBjb3JyZWN0IHR5cGUgaW4gVmlldyBFbmdpbmUgc28gdGhlcmUgaXMgbm8gc3RyaWN0bmVzcyBmbGFnLlxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IHRydWUsXG4gICAgICAgIC8vIFBpcGVzIGFyZSBjaGVja2VkIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogdHJ1ZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICB1c2VDb250ZXh0R2VuZXJpY1R5cGU6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgc3RyaWN0TGl0ZXJhbFR5cGVzOiB0cnVlLFxuICAgICAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiB0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcgPSB7XG4gICAgICAgIGFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogZmFsc2UsXG4gICAgICAgIC8vIEVuYWJsZSBkZWVwIHNjaGVtYSBjaGVja2luZyBpbiBcImJhc2ljXCIgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlIG9ubHkgaWYgQ2xvc3VyZVxuICAgICAgICAvLyBjb21waWxhdGlvbiBpcyByZXF1ZXN0ZWQsIHdoaWNoIGlzIGEgZ29vZCBwcm94eSBmb3IgXCJvbmx5IGluIGdvb2dsZTNcIi5cbiAgICAgICAgYWx3YXlzQ2hlY2tTY2hlbWFJblRlbXBsYXRlQm9kaWVzOiB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsXG4gICAgICAgIGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbUV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IGZhbHNlLFxuICAgICAgICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzOiBmYWxzZSxcbiAgICAgICAgdXNlQ29udGV4dEdlbmVyaWNUeXBlOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TGl0ZXJhbFR5cGVzOiBmYWxzZSxcbiAgICAgICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBBcHBseSBleHBsaWNpdGx5IGNvbmZpZ3VyZWQgc3RyaWN0bmVzcyBmbGFncyBvbiB0b3Agb2YgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgIC8vIGJhc2VkIG9uIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0QWNjZXNzTW9kaWZpZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5ob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3MgPVxuICAgICAgICAgIHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dEFjY2Vzc01vZGlmaWVycztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3ROdWxsSW5wdXRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbElucHV0VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tRXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUxvY2FsUmVmVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3REb21Mb2NhbFJlZlR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdEF0dHJpYnV0ZVR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkF0dHJpYnV0ZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0QXR0cmlidXRlVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUgPSB0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TGl0ZXJhbFR5cGVzID0gdGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcztcbiAgICB9XG5cbiAgICByZXR1cm4gdHlwZUNoZWNraW5nQ29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCB0eXBlQ2hlY2tTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ3R5cGVDaGVja0RpYWdub3N0aWNzJyk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlIHx8IHRoaXMuYWRhcHRlci5pc1NoaW0oc2YpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBkaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgIC4uLmNvbXBpbGF0aW9uLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmLCBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW0pKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy50eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpO1xuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AodHlwZUNoZWNrU3Bhbik7XG4gICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsRHJpdmVyKHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsIHByb2dyYW0pO1xuICAgIHRoaXMubmV4dFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCB0eXBlQ2hlY2tTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ3R5cGVDaGVja0RpYWdub3N0aWNzJyk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGlmICghc2YuaXNEZWNsYXJhdGlvbkZpbGUgJiYgIXRoaXMuYWRhcHRlci5pc1NoaW0oc2YpKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNvbXBpbGF0aW9uLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmLCBvcHRpbWl6ZUZvcikpO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneS5nZXRQcm9ncmFtKCk7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcCh0eXBlQ2hlY2tTcGFuKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxEcml2ZXIodGhpcy5pbmNyZW1lbnRhbERyaXZlciwgcHJvZ3JhbSk7XG4gICAgdGhpcy5uZXh0UHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIGdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICBpZiAodGhpcy5ub25UZW1wbGF0ZURpYWdub3N0aWNzID09PSBudWxsKSB7XG4gICAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICAgIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcyA9IFsuLi5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmRpYWdub3N0aWNzXTtcbiAgICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwgJiYgY29tcGlsYXRpb24uZXhwb3J0UmVmZXJlbmNlR3JhcGggIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5ub25UZW1wbGF0ZURpYWdub3N0aWNzLnB1c2goLi4uY2hlY2tGb3JQcml2YXRlRXhwb3J0cyhcbiAgICAgICAgICAgIHRoaXMuZW50cnlQb2ludCwgdGhpcy50c1Byb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgY29tcGlsYXRpb24uZXhwb3J0UmVmZXJlbmNlR3JhcGgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcztcbiAgfVxuXG4gIHByaXZhdGUgc2NhbkZvck13cChzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMuY29tcGlsYXRpb24hLm13cFNjYW5uZXIuc2NhbihzZiwge1xuICAgICAgYWRkVHlwZVJlcGxhY2VtZW50OiAobm9kZTogdHMuRGVjbGFyYXRpb24sIHR5cGU6IFR5cGUpOiB2b2lkID0+IHtcbiAgICAgICAgLy8gT25seSBvYnRhaW4gdGhlIHJldHVybiB0eXBlIHRyYW5zZm9ybSBmb3IgdGhlIHNvdXJjZSBmaWxlIG9uY2UgdGhlcmUncyBhIHR5cGUgdG8gcmVwbGFjZSxcbiAgICAgICAgLy8gc28gdGhhdCBubyB0cmFuc2Zvcm0gaXMgYWxsb2NhdGVkIHdoZW4gdGhlcmUncyBub3RoaW5nIHRvIGRvLlxuICAgICAgICB0aGlzLmNvbXBpbGF0aW9uIS5kdHNUcmFuc2Zvcm1zIS5nZXRSZXR1cm5UeXBlVHJhbnNmb3JtKHNmKS5hZGRUeXBlUmVwbGFjZW1lbnQobm9kZSwgdHlwZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIG1ha2VDb21waWxhdGlvbigpOiBMYXp5Q29tcGlsYXRpb25TdGF0ZSB7XG4gICAgY29uc3QgY2hlY2tlciA9IHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICBjb25zdCByZWZsZWN0b3IgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KGNoZWNrZXIpO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBSZWZlcmVuY2VFbWl0dGVyLlxuICAgIGxldCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyO1xuICAgIGxldCBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCA9PT0gbnVsbCB8fCAhdGhpcy5vcHRpb25zLl91c2VIb3N0Rm9ySW1wb3J0R2VuZXJhdGlvbikge1xuICAgICAgbGV0IGxvY2FsSW1wb3J0U3RyYXRlZ3k6IFJlZmVyZW5jZUVtaXRTdHJhdGVneTtcblxuICAgICAgLy8gVGhlIHN0cmF0ZWd5IHVzZWQgZm9yIGxvY2FsLCBpbi1wcm9qZWN0IGltcG9ydHMgZGVwZW5kcyBvbiB3aGV0aGVyIFRTIGhhcyBiZWVuIGNvbmZpZ3VyZWRcbiAgICAgIC8vIHdpdGggcm9vdERpcnMuIElmIHNvLCB0aGVuIG11bHRpcGxlIGRpcmVjdG9yaWVzIG1heSBiZSBtYXBwZWQgaW4gdGhlIHNhbWUgXCJtb2R1bGVcbiAgICAgIC8vIG5hbWVzcGFjZVwiIGFuZCB0aGUgbG9naWMgb2YgYExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3lgIGlzIHJlcXVpcmVkIHRvIGdlbmVyYXRlIGNvcnJlY3RcbiAgICAgIC8vIGltcG9ydHMgd2hpY2ggbWF5IGNyb3NzIHRoZXNlIG11bHRpcGxlIGRpcmVjdG9yaWVzLiBPdGhlcndpc2UsIHBsYWluIHJlbGF0aXZlIGltcG9ydHMgYXJlXG4gICAgICAvLyBzdWZmaWNpZW50LlxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5yb290RGlyICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAodGhpcy5vcHRpb25zLnJvb3REaXJzICE9PSB1bmRlZmluZWQgJiYgdGhpcy5vcHRpb25zLnJvb3REaXJzLmxlbmd0aCA+IDApKSB7XG4gICAgICAgIC8vIHJvb3REaXJzIGxvZ2ljIGlzIGluIGVmZmVjdCAtIHVzZSB0aGUgYExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3lgIGZvciBpbi1wcm9qZWN0IHJlbGF0aXZlXG4gICAgICAgIC8vIGltcG9ydHMuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3kgPSBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneShcbiAgICAgICAgICAgIHJlZmxlY3RvciwgbmV3IExvZ2ljYWxGaWxlU3lzdGVtKFsuLi50aGlzLmFkYXB0ZXIucm9vdERpcnNdLCB0aGlzLmFkYXB0ZXIpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFBsYWluIHJlbGF0aXZlIGltcG9ydHMgYXJlIGFsbCB0aGF0J3MgbmVlZGVkLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID0gbmV3IFJlbGF0aXZlUGF0aFN0cmF0ZWd5KHJlZmxlY3Rvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBDb21waWxlckhvc3QgZG9lc24ndCBoYXZlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyBidWlsZCBhbiBOUE0tY2VudHJpYyByZWZlcmVuY2VcbiAgICAgIC8vIHJlc29sdXRpb24gc3RyYXRlZ3kuXG4gICAgICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBOZXh0LCBhdHRlbXB0IHRvIHVzZSBhbiBhYnNvbHV0ZSBpbXBvcnQuXG4gICAgICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KHRoaXMudHNQcm9ncmFtLCBjaGVja2VyLCB0aGlzLm1vZHVsZVJlc29sdmVyLCByZWZsZWN0b3IpLFxuICAgICAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgcmVmZXJlbmNlIGlzIGJlaW5nIHdyaXR0ZW4gaW50byBhIGZpbGUgd2l0aGluIHRoZSBwcm9qZWN0J3MgLnRzXG4gICAgICAgIC8vIHNvdXJjZXMsIGFuZCB1c2UgYSByZWxhdGl2ZSBpbXBvcnQgaWYgc28uIElmIHRoaXMgZmFpbHMsIFJlZmVyZW5jZUVtaXR0ZXIgd2lsbCB0aHJvd1xuICAgICAgICAvLyBhbiBlcnJvci5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSxcbiAgICAgIF0pO1xuXG4gICAgICAvLyBJZiBhbiBlbnRyeXBvaW50IGlzIHByZXNlbnQsIHRoZW4gYWxsIHVzZXIgaW1wb3J0cyBzaG91bGQgYmUgZGlyZWN0ZWQgdGhyb3VnaCB0aGVcbiAgICAgIC8vIGVudHJ5cG9pbnQgYW5kIHByaXZhdGUgZXhwb3J0cyBhcmUgbm90IG5lZWRlZC4gVGhlIGNvbXBpbGVyIHdpbGwgdmFsaWRhdGUgdGhhdCBhbGwgcHVibGljbHlcbiAgICAgIC8vIHZpc2libGUgZGlyZWN0aXZlcy9waXBlcyBhcmUgaW1wb3J0YWJsZSB2aWEgdGhpcyBlbnRyeXBvaW50LlxuICAgICAgaWYgKHRoaXMuZW50cnlQb2ludCA9PT0gbnVsbCAmJiB0aGlzLm9wdGlvbnMuZ2VuZXJhdGVEZWVwUmVleHBvcnRzID09PSB0cnVlKSB7XG4gICAgICAgIC8vIE5vIGVudHJ5cG9pbnQgaXMgcHJlc2VudCBhbmQgZGVlcCByZS1leHBvcnRzIHdlcmUgcmVxdWVzdGVkLCBzbyBjb25maWd1cmUgdGhlIGFsaWFzaW5nXG4gICAgICAgIC8vIHN5c3RlbSB0byBnZW5lcmF0ZSB0aGVtLlxuICAgICAgICBhbGlhc2luZ0hvc3QgPSBuZXcgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdChyZWZsZWN0b3IpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IHN1cHBvcnRzIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyB1c2UgdGhhdCB0byBlbWl0IGltcG9ydHMuXG4gICAgICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBhbGlhc2VkIHJlZmVyZW5jZXMgKHRoaXMgaXMgYSB3b3JrYXJvdW5kIHRvIFN0cmljdERlcHMgY2hlY2tzKS5cbiAgICAgICAgbmV3IEFsaWFzU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgZmlsZU5hbWVUb01vZHVsZU5hbWUgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgICBuZXcgVW5pZmllZE1vZHVsZXNTdHJhdGVneShyZWZsZWN0b3IsIHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QpLFxuICAgICAgXSk7XG4gICAgICBhbGlhc2luZ0hvc3QgPSBuZXcgVW5pZmllZE1vZHVsZXNBbGlhc2luZ0hvc3QodGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCk7XG4gICAgfVxuXG4gICAgY29uc3QgZXZhbHVhdG9yID0gbmV3IFBhcnRpYWxFdmFsdWF0b3IocmVmbGVjdG9yLCBjaGVja2VyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmRlcEdyYXBoKTtcbiAgICBjb25zdCBkdHNSZWFkZXIgPSBuZXcgRHRzTWV0YWRhdGFSZWFkZXIoY2hlY2tlciwgcmVmbGVjdG9yKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyID0gbG9jYWxNZXRhUmVnaXN0cnk7XG4gICAgY29uc3QgZGVwU2NvcGVSZWFkZXIgPSBuZXcgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyKGR0c1JlYWRlciwgYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlZ2lzdHJ5ID1cbiAgICAgICAgbmV3IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeShsb2NhbE1ldGFSZWFkZXIsIGRlcFNjb3BlUmVhZGVyLCByZWZFbWl0dGVyLCBhbGlhc2luZ0hvc3QpO1xuICAgIGNvbnN0IHNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlciA9IHNjb3BlUmVnaXN0cnk7XG4gICAgY29uc3Qgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgPSB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmdldFNlbWFudGljRGVwR3JhcGhVcGRhdGVyKCk7XG4gICAgY29uc3QgbWV0YVJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbbG9jYWxNZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnldKTtcbiAgICBjb25zdCBpbmplY3RhYmxlUmVnaXN0cnkgPSBuZXcgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnkocmVmbGVjdG9yKTtcblxuICAgIGNvbnN0IG1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbbG9jYWxNZXRhUmVhZGVyLCBkdHNSZWFkZXJdKTtcbiAgICBjb25zdCB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5ID0gbmV3IFR5cGVDaGVja1Njb3BlUmVnaXN0cnkoc2NvcGVSZWFkZXIsIG1ldGFSZWFkZXIpO1xuXG5cbiAgICAvLyBJZiBhIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgd2FzIHNwZWNpZmllZCwgdGhlbiB0cmFjayByZWZlcmVuY2VzIHZpYSBhIGBSZWZlcmVuY2VHcmFwaGAgaW5cbiAgICAvLyBvcmRlciB0byBwcm9kdWNlIHByb3BlciBkaWFnbm9zdGljcyBmb3IgaW5jb3JyZWN0bHkgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy9ldGMuIElmIHRoZXJlXG4gICAgLy8gaXMgbm8gZmxhdCBtb2R1bGUgZW50cnlwb2ludCB0aGVuIGRvbid0IHBheSB0aGUgY29zdCBvZiB0cmFja2luZyByZWZlcmVuY2VzLlxuICAgIGxldCByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeTtcbiAgICBsZXQgZXhwb3J0UmVmZXJlbmNlR3JhcGg6IFJlZmVyZW5jZUdyYXBofG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwpIHtcbiAgICAgIGV4cG9ydFJlZmVyZW5jZUdyYXBoID0gbmV3IFJlZmVyZW5jZUdyYXBoKCk7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgUmVmZXJlbmNlR3JhcGhBZGFwdGVyKGV4cG9ydFJlZmVyZW5jZUdyYXBoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IE5vb3BSZWZlcmVuY2VzUmVnaXN0cnkoKTtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZUFuYWx5emVyID0gbmV3IE5nTW9kdWxlUm91dGVBbmFseXplcih0aGlzLm1vZHVsZVJlc29sdmVyLCBldmFsdWF0b3IpO1xuXG4gICAgY29uc3QgZHRzVHJhbnNmb3JtcyA9IG5ldyBEdHNUcmFuc2Zvcm1SZWdpc3RyeSgpO1xuXG4gICAgY29uc3QgbXdwU2Nhbm5lciA9IG5ldyBNb2R1bGVXaXRoUHJvdmlkZXJzU2Nhbm5lcihyZWZsZWN0b3IsIGV2YWx1YXRvciwgcmVmRW1pdHRlcik7XG5cbiAgICBjb25zdCBpc0NvcmUgPSBpc0FuZ3VsYXJDb3JlUGFja2FnZSh0aGlzLnRzUHJvZ3JhbSk7XG5cbiAgICBjb25zdCBkZWZhdWx0SW1wb3J0VHJhY2tlciA9IG5ldyBEZWZhdWx0SW1wb3J0VHJhY2tlcigpO1xuICAgIGNvbnN0IHJlc291cmNlUmVnaXN0cnkgPSBuZXcgUmVzb3VyY2VSZWdpc3RyeSgpO1xuXG4gICAgY29uc3QgY29tcGlsYXRpb25Nb2RlID1cbiAgICAgICAgdGhpcy5vcHRpb25zLmNvbXBpbGF0aW9uTW9kZSA9PT0gJ3BhcnRpYWwnID8gQ29tcGlsYXRpb25Nb2RlLlBBUlRJQUwgOiBDb21waWxhdGlvbk1vZGUuRlVMTDtcblxuICAgIC8vIEN5Y2xlcyBhcmUgaGFuZGxlZCBpbiBmdWxsIGNvbXBpbGF0aW9uIG1vZGUgYnkgXCJyZW1vdGUgc2NvcGluZ1wiLlxuICAgIC8vIFwiUmVtb3RlIHNjb3BpbmdcIiBkb2VzIG5vdCB3b3JrIHdlbGwgd2l0aCB0cmVlIHNoYWtpbmcgZm9yIGxpYnJhcmllcy5cbiAgICAvLyBTbyBpbiBwYXJ0aWFsIGNvbXBpbGF0aW9uIG1vZGUsIHdoZW4gYnVpbGRpbmcgYSBsaWJyYXJ5LCBhIGN5Y2xlIHdpbGwgY2F1c2UgYW4gZXJyb3IuXG4gICAgY29uc3QgY3ljbGVIYW5kbGluZ1N0cmF0ZWd5ID0gY29tcGlsYXRpb25Nb2RlID09PSBDb21waWxhdGlvbk1vZGUuRlVMTCA/XG4gICAgICAgIEN5Y2xlSGFuZGxpbmdTdHJhdGVneS5Vc2VSZW1vdGVTY29waW5nIDpcbiAgICAgICAgQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LkVycm9yO1xuXG4gICAgLy8gU2V0IHVwIHRoZSBJdnlDb21waWxhdGlvbiwgd2hpY2ggbWFuYWdlcyBzdGF0ZSBmb3IgdGhlIEl2eSB0cmFuc2Zvcm1lci5cbiAgICBjb25zdCBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbHxudWxsLCB1bmtub3duPltdID0gW1xuICAgICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgbWV0YVJlYWRlciwgc2NvcGVSZWFkZXIsIHNjb3BlUmVnaXN0cnksXG4gICAgICAgICAgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSwgcmVzb3VyY2VSZWdpc3RyeSwgaXNDb3JlLCB0aGlzLnJlc291cmNlTWFuYWdlcixcbiAgICAgICAgICB0aGlzLmFkYXB0ZXIucm9vdERpcnMsIHRoaXMub3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzIHx8IGZhbHNlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHMgIT09IGZhbHNlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ICE9PSBmYWxzZSwgdGhpcy51c2VQb2lzb25lZERhdGEsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcywgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5jeWNsZUFuYWx5emVyLFxuICAgICAgICAgIGN5Y2xlSGFuZGxpbmdTdHJhdGVneSwgcmVmRW1pdHRlciwgZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIuZGVwR3JhcGgsXG4gICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlciwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkKSxcblxuICAgICAgLy8gVE9ETyhhbHhodWIpOiB1bmRlcnN0YW5kIHdoeSB0aGUgY2FzdCBoZXJlIGlzIG5lY2Vzc2FyeSAoc29tZXRoaW5nIHRvIGRvIHdpdGggYG51bGxgXG4gICAgICAvLyBub3QgYmVpbmcgYXNzaWduYWJsZSB0byBgdW5rbm93bmAgd2hlbiB3cmFwcGVkIGluIGBSZWFkb25seWApLlxuICAgICAgLy8gY2xhbmctZm9ybWF0IG9mZlxuICAgICAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIG1ldGFSZWFkZXIsXG4gICAgICAgICAgICBkZWZhdWx0SW1wb3J0VHJhY2tlciwgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBpc0NvcmUsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgICAgIGNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzLFxuICAgICAgICApIGFzIFJlYWRvbmx5PERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2wgfCBudWxsLHVua25vd24+PixcbiAgICAgIC8vIGNsYW5nLWZvcm1hdCBvblxuICAgICAgLy8gUGlwZSBoYW5kbGVyIG11c3QgYmUgYmVmb3JlIGluamVjdGFibGUgaGFuZGxlciBpbiBsaXN0IHNvIHBpcGUgZmFjdG9yaWVzIGFyZSBwcmludGVkXG4gICAgICAvLyBiZWZvcmUgaW5qZWN0YWJsZSBmYWN0b3JpZXMgKHNvIGluamVjdGFibGUgZmFjdG9yaWVzIGNhbiBkZWxlZ2F0ZSB0byB0aGVtKVxuICAgICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIGRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSwgaXNDb3JlKSxcbiAgICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGRlZmF1bHRJbXBvcnRUcmFja2VyLCBpc0NvcmUsIHRoaXMub3B0aW9ucy5zdHJpY3RJbmplY3Rpb25QYXJhbWV0ZXJzIHx8IGZhbHNlLFxuICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSksXG4gICAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVhZGVyLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIHJlZmVyZW5jZXNSZWdpc3RyeSwgaXNDb3JlLFxuICAgICAgICAgIHJvdXRlQW5hbHl6ZXIsIHJlZkVtaXR0ZXIsIHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciwgZGVmYXVsdEltcG9ydFRyYWNrZXIsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLCBpbmplY3RhYmxlUmVnaXN0cnksIHRoaXMub3B0aW9ucy5pMThuSW5Mb2NhbGUpLFxuICAgIF07XG5cbiAgICBjb25zdCB0cmFpdENvbXBpbGVyID0gbmV3IFRyYWl0Q29tcGlsZXIoXG4gICAgICAgIGhhbmRsZXJzLCByZWZsZWN0b3IsIHRoaXMucGVyZlJlY29yZGVyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyLFxuICAgICAgICB0aGlzLm9wdGlvbnMuY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlcyAhPT0gZmFsc2UsIGNvbXBpbGF0aW9uTW9kZSwgZHRzVHJhbnNmb3JtcyxcbiAgICAgICAgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIpO1xuXG4gICAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IG5ldyBUZW1wbGF0ZVR5cGVDaGVja2VySW1wbChcbiAgICAgICAgdGhpcy50c1Byb2dyYW0sIHRoaXMudHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5LCB0cmFpdENvbXBpbGVyLFxuICAgICAgICB0aGlzLmdldFR5cGVDaGVja2luZ0NvbmZpZygpLCByZWZFbWl0dGVyLCByZWZsZWN0b3IsIHRoaXMuYWRhcHRlciwgdGhpcy5pbmNyZW1lbnRhbERyaXZlcixcbiAgICAgICAgc2NvcGVSZWdpc3RyeSwgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaXNDb3JlLFxuICAgICAgdHJhaXRDb21waWxlcixcbiAgICAgIHJlZmxlY3RvcixcbiAgICAgIHNjb3BlUmVnaXN0cnksXG4gICAgICBkdHNUcmFuc2Zvcm1zLFxuICAgICAgZXhwb3J0UmVmZXJlbmNlR3JhcGgsXG4gICAgICByb3V0ZUFuYWx5emVyLFxuICAgICAgbXdwU2Nhbm5lcixcbiAgICAgIG1ldGFSZWFkZXIsXG4gICAgICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgZGVmYXVsdEltcG9ydFRyYWNrZXIsXG4gICAgICBhbGlhc2luZ0hvc3QsXG4gICAgICByZWZFbWl0dGVyLFxuICAgICAgdGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgIHJlc291cmNlUmVnaXN0cnksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgZ2l2ZW4gYFByb2dyYW1gIGlzIEBhbmd1bGFyL2NvcmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUGFja2FnZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogYm9vbGVhbiB7XG4gIC8vIExvb2sgZm9yIGl0c19qdXN0X2FuZ3VsYXIudHMgc29tZXdoZXJlIGluIHRoZSBwcm9ncmFtLlxuICBjb25zdCByM1N5bWJvbHMgPSBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW0pO1xuICBpZiAocjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIGNvbnN0YW50IElUU19KVVNUX0FOR1VMQVIgaW4gdGhhdCBmaWxlLlxuICByZXR1cm4gcjNTeW1ib2xzLnN0YXRlbWVudHMuc29tZShzdG10ID0+IHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IG11c3QgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgYmUgZXhwb3J0ZWQuXG4gICAgaWYgKHN0bXQubW9kaWZpZXJzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXN0bXQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgZGVjbGFyZSBJVFNfSlVTVF9BTkdVTEFSLlxuICAgIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuc29tZShkZWNsID0+IHtcbiAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBtdXN0IG1hdGNoIHRoZSBuYW1lLlxuICAgICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSB8fCBkZWNsLm5hbWUudGV4dCAhPT0gJ0lUU19KVVNUX0FOR1VMQVInKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEl0IG11c3QgaW5pdGlhbGl6ZSB0aGUgdmFyaWFibGUgdG8gdHJ1ZS5cbiAgICAgIGlmIChkZWNsLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQgfHwgZGVjbC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgZGVmaW5pdGlvbiBtYXRjaGVzLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlICdyM19zeW1ib2xzLnRzJyBmaWxlIGluIHRoZSBnaXZlbiBgUHJvZ3JhbWAsIG9yIHJldHVybiBgbnVsbGAgaWYgaXQgd2Fzbid0IHRoZXJlLlxuICovXG5mdW5jdGlvbiBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbmQoZmlsZSA9PiBmaWxlLmZpbGVOYW1lLmluZGV4T2YoJ3IzX3N5bWJvbHMudHMnKSA+PSAwKSB8fCBudWxsO1xufVxuXG4vKipcbiAqIFNpbmNlIFwic3RyaWN0VGVtcGxhdGVzXCIgaXMgYSB0cnVlIHN1cGVyc2V0IG9mIHR5cGUgY2hlY2tpbmcgY2FwYWJpbGl0aWVzIGNvbXBhcmVkIHRvXG4gKiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiLCBpdCBpcyByZXF1aXJlZCB0aGF0IHRoZSBsYXR0ZXIgaXMgbm90IGV4cGxpY2l0bHkgZGlzYWJsZWQgaWYgdGhlXG4gKiBmb3JtZXIgaXMgZW5hYmxlZC5cbiAqL1xuZnVuY3Rpb24gdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnMob3B0aW9uczogTmdDb21waWxlck9wdGlvbnMpOiB0cy5EaWFnbm9zdGljfG51bGwge1xuICBpZiAob3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2sgPT09IGZhbHNlICYmIG9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICBjb2RlOiBuZ0Vycm9yQ29kZShFcnJvckNvZGUuQ09ORklHX1NUUklDVF9URU1QTEFURVNfSU1QTElFU19GVUxMX1RFTVBMQVRFX1RZUEVDSEVDSyksXG4gICAgICBmaWxlOiB1bmRlZmluZWQsXG4gICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBtZXNzYWdlVGV4dDpcbiAgICAgICAgICBgQW5ndWxhciBjb21waWxlciBvcHRpb24gXCJzdHJpY3RUZW1wbGF0ZXNcIiBpcyBlbmFibGVkLCBob3dldmVyIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgZGlzYWJsZWQuXG5cbkhhdmluZyB0aGUgXCJzdHJpY3RUZW1wbGF0ZXNcIiBmbGFnIGVuYWJsZWQgaW1wbGllcyB0aGF0IFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgYWxzbyBlbmFibGVkLCBzb1xudGhlIGxhdHRlciBjYW4gbm90IGJlIGV4cGxpY2l0bHkgZGlzYWJsZWQuXG5cbk9uZSBvZiB0aGUgZm9sbG93aW5nIGFjdGlvbnMgaXMgcmVxdWlyZWQ6XG4xLiBSZW1vdmUgdGhlIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgb3B0aW9uLlxuMi4gUmVtb3ZlIFwic3RyaWN0VGVtcGxhdGVzXCIgb3Igc2V0IGl0IHRvICdmYWxzZScuXG5cbk1vcmUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHRlbXBsYXRlIHR5cGUgY2hlY2tpbmcgY29tcGlsZXIgb3B0aW9ucyBjYW4gYmUgZm91bmQgaW4gdGhlIGRvY3VtZW50YXRpb246XG5odHRwczovL3Y5LmFuZ3VsYXIuaW8vZ3VpZGUvdGVtcGxhdGUtdHlwZWNoZWNrI3RlbXBsYXRlLXR5cGUtY2hlY2tpbmdgLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuY2xhc3MgUmVmZXJlbmNlR3JhcGhBZGFwdGVyIGltcGxlbWVudHMgUmVmZXJlbmNlc1JlZ2lzdHJ5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBncmFwaDogUmVmZXJlbmNlR3JhcGgpIHt9XG5cbiAgYWRkKHNvdXJjZTogRGVjbGFyYXRpb25Ob2RlLCAuLi5yZWZlcmVuY2VzOiBSZWZlcmVuY2U8RGVjbGFyYXRpb25Ob2RlPltdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB7bm9kZX0gb2YgcmVmZXJlbmNlcykge1xuICAgICAgbGV0IHNvdXJjZUZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc291cmNlRmlsZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgcmVjb3JkIGxvY2FsIHJlZmVyZW5jZXMgKG5vdCByZWZlcmVuY2VzIGludG8gLmQudHMgZmlsZXMpLlxuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCB8fCAhaXNEdHNQYXRoKHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgIHRoaXMuZ3JhcGguYWRkKHNvdXJjZSwgbm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=