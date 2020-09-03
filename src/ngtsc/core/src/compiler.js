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
        define("@angular/compiler-cli/src/ngtsc/core/src/compiler", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/indexer", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/modulewithproviders", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isAngularCorePackage = exports.NgCompiler = void 0;
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
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
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
        function NgCompiler(adapter, options, tsProgram, typeCheckingProgramStrategy, incrementalStrategy, oldProgram, perfRecorder) {
            var _a;
            var _this = this;
            if (oldProgram === void 0) { oldProgram = null; }
            if (perfRecorder === void 0) { perfRecorder = perf_1.NOOP_PERF_RECORDER; }
            this.adapter = adapter;
            this.options = options;
            this.tsProgram = tsProgram;
            this.typeCheckingProgramStrategy = typeCheckingProgramStrategy;
            this.incrementalStrategy = incrementalStrategy;
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
             * Semantic diagnostics related to the program itself.
             *
             * This is set by (and memoizes) `getDiagnostics`.
             */
            this.diagnostics = null;
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
            var modifiedResourceFiles = null;
            if (this.adapter.getModifiedResourceFiles !== undefined) {
                modifiedResourceFiles = this.adapter.getModifiedResourceFiles() || null;
            }
            if (oldProgram === null) {
                this.incrementalDriver = incremental_1.IncrementalDriver.fresh(tsProgram);
            }
            else {
                var oldDriver = this.incrementalStrategy.getIncrementalDriver(oldProgram);
                if (oldDriver !== null) {
                    this.incrementalDriver =
                        incremental_1.IncrementalDriver.reconcile(oldProgram, oldDriver, tsProgram, modifiedResourceFiles);
                }
                else {
                    // A previous ts.Program was used to create the current one, but it wasn't from an
                    // `NgCompiler`. That doesn't hurt anything, but the Angular analysis will have to start
                    // from a fresh state.
                    this.incrementalDriver = incremental_1.IncrementalDriver.fresh(tsProgram);
                }
            }
            this.incrementalStrategy.setIncrementalDriver(this.incrementalDriver, tsProgram);
            this.ignoreForDiagnostics =
                new Set(tsProgram.getSourceFiles().filter(function (sf) { return _this.adapter.isShim(sf); }));
            this.ignoreForEmit = this.adapter.ignoreForEmit;
        }
        /**
         * Get all Angular-related diagnostics for this compilation.
         *
         * If a `ts.SourceFile` is passed, only diagnostics related to that file are returned.
         */
        NgCompiler.prototype.getDiagnostics = function (file) {
            var _a;
            if (this.diagnostics === null) {
                var compilation = this.ensureAnalyzed();
                this.diagnostics = tslib_1.__spread(compilation.traitCompiler.diagnostics, this.getTemplateDiagnostics());
                if (this.entryPoint !== null && compilation.exportReferenceGraph !== null) {
                    (_a = this.diagnostics).push.apply(_a, tslib_1.__spread(entry_point_1.checkForPrivateExports(this.entryPoint, this.tsProgram.getTypeChecker(), compilation.exportReferenceGraph)));
                }
            }
            if (file === undefined) {
                return this.diagnostics;
            }
            else {
                return this.diagnostics.filter(function (diag) {
                    if (diag.file === file) {
                        return true;
                    }
                    else if (diagnostics_2.isTemplateDiagnostic(diag) && diag.componentFile === file) {
                        // Template diagnostics are reported when diagnostics for the component file are
                        // requested (since no consumer of `getDiagnostics` would ever ask for diagnostics from
                        // the fake ts.SourceFile for templates).
                        return true;
                    }
                    else {
                        return false;
                    }
                });
            }
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
            return this.ensureAnalyzed().templateTypeChecker;
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
                var e_1, _c;
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
                            catch (e_1_1) { e_1 = { error: e_1_1 }; }
                            finally {
                                try {
                                    if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                                }
                                finally { if (e_1) throw e_1.error; }
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
            var e_2, _a;
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            this.perfRecorder.stop(analyzeSpan);
            this.resolveCompilation(this.compilation.traitCompiler);
        };
        NgCompiler.prototype.resolveCompilation = function (traitCompiler) {
            traitCompiler.resolve();
            this.recordNgModuleScopeDependencies();
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
                };
            }
            else {
                typeCheckingConfig = {
                    applyTemplateContextGuards: false,
                    checkQueries: false,
                    checkTemplateBodies: false,
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
            var e_3, _a;
            // Skip template type-checking if it's disabled.
            if (this.options.ivyTemplateTypeCheck === false && !this.fullTemplateTypeCheck) {
                return [];
            }
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            var program = this.typeCheckingProgramStrategy.getProgram();
            this.perfRecorder.stop(typeCheckSpan);
            this.incrementalStrategy.setIncrementalDriver(this.incrementalDriver, program);
            this.nextProgram = program;
            return diagnostics;
        };
        /**
         * Reifies the inter-dependencies of NgModules and the components within their compilation scopes
         * into the `IncrementalDriver`'s dependency graph.
         */
        NgCompiler.prototype.recordNgModuleScopeDependencies = function () {
            var e_4, _a, e_5, _b, e_6, _c, e_7, _d;
            var recordSpan = this.perfRecorder.start('recordDependencies');
            var depGraph = this.incrementalDriver.depGraph;
            try {
                for (var _e = tslib_1.__values(this.compilation.scopeRegistry.getCompilationScopes()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var scope = _f.value;
                    var file = scope.declaration.getSourceFile();
                    var ngModuleFile = scope.ngModule.getSourceFile();
                    // A change to any dependency of the declaration causes the declaration to be invalidated,
                    // which requires the NgModule to be invalidated as well.
                    depGraph.addTransitiveDependency(ngModuleFile, file);
                    // A change to the NgModule file should cause the declaration itself to be invalidated.
                    depGraph.addDependency(file, ngModuleFile);
                    var meta = this.compilation.metaReader.getDirectiveMetadata(new imports_1.Reference(scope.declaration));
                    if (meta !== null && meta.isComponent) {
                        // If a component's template changes, it might have affected the import graph, and thus the
                        // remote scoping feature which is activated in the event of potential import cycles. Thus,
                        // the module depends not only on the transitive dependencies of the component, but on its
                        // resources as well.
                        depGraph.addTransitiveResources(ngModuleFile, file);
                        try {
                            // A change to any directive/pipe in the compilation scope should cause the component to be
                            // invalidated.
                            for (var _g = (e_5 = void 0, tslib_1.__values(scope.directives)), _h = _g.next(); !_h.done; _h = _g.next()) {
                                var directive = _h.value;
                                // When a directive in scope is updated, the component needs to be recompiled as e.g. a
                                // selector may have changed.
                                depGraph.addTransitiveDependency(file, directive.ref.node.getSourceFile());
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                        try {
                            for (var _j = (e_6 = void 0, tslib_1.__values(scope.pipes)), _k = _j.next(); !_k.done; _k = _j.next()) {
                                var pipe = _k.value;
                                // When a pipe in scope is updated, the component needs to be recompiled as e.g. the
                                // pipe's name may have changed.
                                depGraph.addTransitiveDependency(file, pipe.ref.node.getSourceFile());
                            }
                        }
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                        try {
                            // Components depend on the entire export scope. In addition to transitive dependencies on
                            // all directives/pipes in the export scope, they also depend on every NgModule in the
                            // scope, as changes to a module may add new directives/pipes to the scope.
                            for (var _l = (e_7 = void 0, tslib_1.__values(scope.ngModules)), _m = _l.next(); !_m.done; _m = _l.next()) {
                                var depModule = _m.value;
                                // There is a correctness issue here. To be correct, this should be a transitive
                                // dependency on the depModule file, since the depModule's exports might change via one of
                                // its dependencies, even if depModule's file itself doesn't change. However, doing this
                                // would also trigger recompilation if a non-exported component or directive changed,
                                // which causes performance issues for rebuilds.
                                //
                                // Given the rebuild issue is an edge case, currently we err on the side of performance
                                // instead of correctness. A correct and performant design would distinguish between
                                // changes to the depModule which affect its export scope and changes which do not, and
                                // only add a dependency for the former. This concept is currently in development.
                                //
                                // TODO(alxhub): fix correctness issue by understanding the semantics of the dependency.
                                depGraph.addDependency(file, depModule.getSourceFile());
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                    }
                    else {
                        // Directives (not components) and pipes only depend on the NgModule which directly declares
                        // them.
                        depGraph.addDependency(file, ngModuleFile);
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_4) throw e_4.error; }
            }
            this.perfRecorder.stop(recordSpan);
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
            var metaRegistry = new metadata_1.CompoundMetadataRegistry([localMetaRegistry, scopeRegistry]);
            var injectableRegistry = new metadata_1.InjectableClassRegistry(reflector);
            var metaReader = new metadata_1.CompoundMetadataReader([localMetaReader, dtsReader]);
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
            // Set up the IvyCompilation, which manages state for the Ivy transformer.
            var handlers = [
                new annotations_1.ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, isCore, this.resourceManager, this.adapter.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.options.i18nNormalizeLineEndingsInICUs, this.moduleResolver, this.cycleAnalyzer, refEmitter, defaultImportTracker, this.incrementalDriver.depGraph, injectableRegistry, this.closureCompilerEnabled),
                // TODO(alxhub): understand why the cast here is necessary (something to do with `null`
                // not being assignable to `unknown` when wrapped in `Readonly`).
                // clang-format off
                new annotations_1.DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, defaultImportTracker, injectableRegistry, isCore, this.closureCompilerEnabled, 
                // In ngtsc we no longer want to compile undecorated classes with Angular features.
                // Migrations for these patterns ran as part of `ng update` and we want to ensure
                // that projects do not regress. See https://hackmd.io/@alx/ryfYYuvzH for more details.
                /* compileUndecoratedClassesWithAngularFeatures */ false),
                // clang-format on
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, defaultImportTracker, injectableRegistry, isCore),
                new annotations_1.InjectableDecoratorHandler(reflector, defaultImportTracker, isCore, this.options.strictInjectionParameters || false, injectableRegistry),
                new annotations_1.NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, this.adapter.factoryTracker, defaultImportTracker, this.closureCompilerEnabled, injectableRegistry, this.options.i18nInLocale),
            ];
            var traitCompiler = new transform_1.TraitCompiler(handlers, reflector, this.perfRecorder, this.incrementalDriver, this.options.compileNonExportedClasses !== false, dtsTransforms);
            var templateTypeChecker = new typecheck_1.TemplateTypeCheckerImpl(this.tsProgram, this.typeCheckingProgramStrategy, traitCompiler, this.getTypeCheckingConfig(), refEmitter, reflector, this.adapter, this.incrementalDriver);
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
                defaultImportTracker: defaultImportTracker,
                aliasingHost: aliasingHost,
                refEmitter: refEmitter,
                templateTypeChecker: templateTypeChecker,
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
     * "strictTemplateTypeCheck", it is required that the latter is not explicitly disabled if the
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFFakMsMkVBQStNO0lBQy9NLGlFQUF3RDtJQUN4RCwyRUFBeUQ7SUFDekQsMkVBQXlFO0lBQ3pFLDJFQUFvRDtJQUNwRCxtRUFBK1g7SUFDL1gsMkVBQThFO0lBQzlFLG1FQUFrRjtJQUNsRixxRUFBbUs7SUFDbkssMkZBQXFFO0lBQ3JFLHVGQUF5RDtJQUN6RCw2REFBNEQ7SUFDNUQseUVBQTBEO0lBQzFELHFFQUFxRDtJQUNyRCxtRUFBc0U7SUFDdEUsK0RBQTJHO0lBQzNHLCtEQUFzRDtJQUN0RCxpRUFBZ0Q7SUFDaEQsdUVBQStKO0lBQy9KLHVFQUF3RDtJQUN4RCxxRUFBc0g7SUFDdEgscUZBQWlFO0lBQ2pFLGtGQUE0RjtJQXVCNUY7Ozs7Ozs7Ozs7O09BV0c7SUFDSDtRQWdDRSxvQkFDWSxPQUEwQixFQUFVLE9BQTBCLEVBQzlELFNBQXFCLEVBQ3JCLDJCQUF3RCxFQUN4RCxtQkFBNkMsRUFBRSxVQUFrQyxFQUNqRixZQUErQzs7WUFMM0QsaUJBeURDO1lBckQwRCwyQkFBQSxFQUFBLGlCQUFrQztZQUNqRiw2QkFBQSxFQUFBLGVBQTZCLHlCQUFrQjtZQUovQyxZQUFPLEdBQVAsT0FBTyxDQUFtQjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQW1CO1lBQzlELGNBQVMsR0FBVCxTQUFTLENBQVk7WUFDckIsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtZQUN4RCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQTBCO1lBQzdDLGlCQUFZLEdBQVosWUFBWSxDQUFtQztZQXBDM0Q7Ozs7ZUFJRztZQUNLLGdCQUFXLEdBQThCLElBQUks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QUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTt3QkFDL0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO3FCQUM5QjtpQkFDRjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQWhCRCxJQWdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1R5cGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIE5vb3BSZWZlcmVuY2VzUmVnaXN0cnksIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4uLy4uL2Fubm90YXRpb25zJztcbmltcG9ydCB7Q3ljbGVBbmFseXplciwgSW1wb3J0R3JhcGh9IGZyb20gJy4uLy4uL2N5Y2xlcyc7XG5pbXBvcnQge0Vycm9yQ29kZSwgbmdFcnJvckNvZGV9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Y2hlY2tGb3JQcml2YXRlRXhwb3J0cywgUmVmZXJlbmNlR3JhcGh9IGZyb20gJy4uLy4uL2VudHJ5X3BvaW50JztcbmltcG9ydCB7TG9naWNhbEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgQWxpYXNpbmdIb3N0LCBBbGlhc1N0cmF0ZWd5LCBEZWZhdWx0SW1wb3J0VHJhY2tlciwgSW1wb3J0UmV3cml0ZXIsIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBNb2R1bGVSZXNvbHZlciwgTm9vcEltcG9ydFJld3JpdGVyLCBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0LCBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0U3RyYXRlZ3ksIFJlZmVyZW5jZUVtaXR0ZXIsIFJlbGF0aXZlUGF0aFN0cmF0ZWd5LCBVbmlmaWVkTW9kdWxlc0FsaWFzaW5nSG9zdCwgVW5pZmllZE1vZHVsZXNTdHJhdGVneX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGRTdHJhdGVneSwgSW5jcmVtZW50YWxEcml2ZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsJztcbmltcG9ydCB7Z2VuZXJhdGVBbmFseXNpcywgSW5kZXhlZENvbXBvbmVudCwgSW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7Q29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIExvY2FsTWV0YWRhdGFSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXJ9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXJ9IGZyb20gJy4uLy4uL21vZHVsZXdpdGhwcm92aWRlcnMnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge05PT1BfUEVSRl9SRUNPUkRFUiwgUGVyZlJlY29yZGVyfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7VHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QWRhcHRlclJlc291cmNlTG9hZGVyfSBmcm9tICcuLi8uLi9yZXNvdXJjZSc7XG5pbXBvcnQge2VudHJ5UG9pbnRLZXlGb3IsIE5nTW9kdWxlUm91dGVBbmFseXplcn0gZnJvbSAnLi4vLi4vcm91dGluZyc7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcn0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtfSBmcm9tICcuLi8uLi9zaGltcyc7XG5pbXBvcnQge2l2eVN3aXRjaFRyYW5zZm9ybX0gZnJvbSAnLi4vLi4vc3dpdGNoJztcbmltcG9ydCB7YWxpYXNUcmFuc2Zvcm1GYWN0b3J5LCBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnksIERlY29yYXRvckhhbmRsZXIsIER0c1RyYW5zZm9ybVJlZ2lzdHJ5LCBpdnlUcmFuc2Zvcm1GYWN0b3J5LCBUcmFpdENvbXBpbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtUZW1wbGF0ZVR5cGVDaGVja2VySW1wbH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7T3B0aW1pemVGb3IsIFRlbXBsYXRlVHlwZUNoZWNrZXIsIFR5cGVDaGVja2luZ0NvbmZpZywgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5fSBmcm9tICcuLi8uLi90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7aXNUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGVPck51bGwsIGlzRHRzUGF0aCwgcmVzb2x2ZU1vZHVsZU5hbWV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtMYXp5Um91dGUsIE5nQ29tcGlsZXJBZGFwdGVyLCBOZ0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vYXBpJztcblxuLyoqXG4gKiBTdGF0ZSBpbmZvcm1hdGlvbiBhYm91dCBhIGNvbXBpbGF0aW9uIHdoaWNoIGlzIG9ubHkgZ2VuZXJhdGVkIG9uY2Ugc29tZSBkYXRhIGlzIHJlcXVlc3RlZCBmcm9tXG4gKiB0aGUgYE5nQ29tcGlsZXJgIChmb3IgZXhhbXBsZSwgYnkgY2FsbGluZyBgZ2V0RGlhZ25vc3RpY3NgKS5cbiAqL1xuaW50ZXJmYWNlIExhenlDb21waWxhdGlvblN0YXRlIHtcbiAgaXNDb3JlOiBib29sZWFuO1xuICB0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyO1xuICByZWZsZWN0b3I6IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdDtcbiAgbWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXI7XG4gIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeTtcbiAgZXhwb3J0UmVmZXJlbmNlR3JhcGg6IFJlZmVyZW5jZUdyYXBofG51bGw7XG4gIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcjtcbiAgZHRzVHJhbnNmb3JtczogRHRzVHJhbnNmb3JtUmVnaXN0cnk7XG4gIG13cFNjYW5uZXI6IE1vZHVsZVdpdGhQcm92aWRlcnNTY2FubmVyO1xuICBkZWZhdWx0SW1wb3J0VHJhY2tlcjogRGVmYXVsdEltcG9ydFRyYWNrZXI7XG4gIGFsaWFzaW5nSG9zdDogQWxpYXNpbmdIb3N0fG51bGw7XG4gIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXI7XG4gIHRlbXBsYXRlVHlwZUNoZWNrZXI6IFRlbXBsYXRlVHlwZUNoZWNrZXI7XG59XG5cbi8qKlxuICogVGhlIGhlYXJ0IG9mIHRoZSBBbmd1bGFyIEl2eSBjb21waWxlci5cbiAqXG4gKiBUaGUgYE5nQ29tcGlsZXJgIHByb3ZpZGVzIGFuIEFQSSBmb3IgcGVyZm9ybWluZyBBbmd1bGFyIGNvbXBpbGF0aW9uIHdpdGhpbiBhIGN1c3RvbSBUeXBlU2NyaXB0XG4gKiBjb21waWxlci4gRWFjaCBpbnN0YW5jZSBvZiBgTmdDb21waWxlcmAgc3VwcG9ydHMgYSBzaW5nbGUgY29tcGlsYXRpb24sIHdoaWNoIG1pZ2h0IGJlXG4gKiBpbmNyZW1lbnRhbC5cbiAqXG4gKiBgTmdDb21waWxlcmAgaXMgbGF6eSwgYW5kIGRvZXMgbm90IHBlcmZvcm0gYW55IG9mIHRoZSB3b3JrIG9mIHRoZSBjb21waWxhdGlvbiB1bnRpbCBvbmUgb2YgaXRzXG4gKiBvdXRwdXQgbWV0aG9kcyAoZS5nLiBgZ2V0RGlhZ25vc3RpY3NgKSBpcyBjYWxsZWQuXG4gKlxuICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ0NvbXBpbGVyIHtcbiAgLyoqXG4gICAqIExhemlseSBldmFsdWF0ZWQgc3RhdGUgb2YgdGhlIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIGNyZWF0ZWQgb24gZGVtYW5kIGJ5IGNhbGxpbmcgYGVuc3VyZUFuYWx5emVkYC5cbiAgICovXG4gIHByaXZhdGUgY29tcGlsYXRpb246IExhenlDb21waWxhdGlvblN0YXRlfG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBBbnkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgY29uc3RydWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhlc2UgYXJlIGRpYWdub3N0aWNzIHdoaWNoIGFyb3NlIGR1cmluZyBzZXR1cCBvZiB0aGUgaG9zdCBhbmQvb3IgcHJvZ3JhbS5cbiAgICovXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBTZW1hbnRpYyBkaWFnbm9zdGljcyByZWxhdGVkIHRvIHRoZSBwcm9ncmFtIGl0c2VsZi5cbiAgICpcbiAgICogVGhpcyBpcyBzZXQgYnkgKGFuZCBtZW1vaXplcykgYGdldERpYWdub3N0aWNzYC5cbiAgICovXG4gIHByaXZhdGUgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgbmV4dFByb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgZW50cnlQb2ludDogdHMuU291cmNlRmlsZXxudWxsO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEFkYXB0ZXJSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICByZWFkb25seSBpbmNyZW1lbnRhbERyaXZlcjogSW5jcmVtZW50YWxEcml2ZXI7XG4gIHJlYWRvbmx5IGlnbm9yZUZvckRpYWdub3N0aWNzOiBTZXQ8dHMuU291cmNlRmlsZT47XG4gIHJlYWRvbmx5IGlnbm9yZUZvckVtaXQ6IFNldDx0cy5Tb3VyY2VGaWxlPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgYWRhcHRlcjogTmdDb21waWxlckFkYXB0ZXIsIHByaXZhdGUgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsXG4gICAgICBwcml2YXRlIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgICBwcml2YXRlIGluY3JlbWVudGFsU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSwgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbXxudWxsID0gbnVsbCxcbiAgICAgIHByaXZhdGUgcGVyZlJlY29yZGVyOiBQZXJmUmVjb3JkZXIgPSBOT09QX1BFUkZfUkVDT1JERVIpIHtcbiAgICB0aGlzLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzLnB1c2goLi4udGhpcy5hZGFwdGVyLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzKTtcbiAgICBjb25zdCBpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyA9IHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zKHRoaXMub3B0aW9ucyk7XG4gICAgaWYgKGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzLnB1c2goaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMpO1xuICAgIH1cblxuICAgIHRoaXMubmV4dFByb2dyYW0gPSB0c1Byb2dyYW07XG4gICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkID0gISF0aGlzLm9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI7XG5cbiAgICB0aGlzLmVudHJ5UG9pbnQgPVxuICAgICAgICBhZGFwdGVyLmVudHJ5UG9pbnQgIT09IG51bGwgPyBnZXRTb3VyY2VGaWxlT3JOdWxsKHRzUHJvZ3JhbSwgYWRhcHRlci5lbnRyeVBvaW50KSA6IG51bGw7XG5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUoXG4gICAgICAgIHRoaXMuYWRhcHRlci5nZXRDdXJyZW50RGlyZWN0b3J5KCksXG4gICAgICAgIC8vIE5vdGU6IHRoaXMgdXNlZCB0byBiZSBhbiBhcnJvdy1mdW5jdGlvbiBjbG9zdXJlLiBIb3dldmVyLCBKUyBlbmdpbmVzIGxpa2UgdjggaGF2ZSBzb21lXG4gICAgICAgIC8vIHN0cmFuZ2UgYmVoYXZpb3JzIHdpdGggcmV0YWluaW5nIHRoZSBsZXhpY2FsIHNjb3BlIG9mIHRoZSBjbG9zdXJlLiBFdmVuIGlmIHRoaXMgZnVuY3Rpb25cbiAgICAgICAgLy8gZG9lc24ndCByZXRhaW4gYSByZWZlcmVuY2UgdG8gYHRoaXNgLCBpZiBvdGhlciBjbG9zdXJlcyBpbiB0aGUgY29uc3RydWN0b3IgaGVyZSByZWZlcmVuY2VcbiAgICAgICAgLy8gYHRoaXNgIGludGVybmFsbHkgdGhlbiBhIGNsb3N1cmUgY3JlYXRlZCBoZXJlIHdvdWxkIHJldGFpbiB0aGVtLiBUaGlzIGNhbiBjYXVzZSBtYWpvclxuICAgICAgICAvLyBtZW1vcnkgbGVhayBpc3N1ZXMgc2luY2UgdGhlIGBtb2R1bGVSZXNvbHV0aW9uQ2FjaGVgIGlzIGEgbG9uZy1saXZlZCBvYmplY3QgYW5kIGZpbmRzIGl0c1xuICAgICAgICAvLyB3YXkgaW50byBhbGwga2luZHMgb2YgcGxhY2VzIGluc2lkZSBUUyBpbnRlcm5hbCBvYmplY3RzLlxuICAgICAgICB0aGlzLmFkYXB0ZXIuZ2V0Q2Fub25pY2FsRmlsZU5hbWUuYmluZCh0aGlzLmFkYXB0ZXIpKTtcbiAgICB0aGlzLm1vZHVsZVJlc29sdmVyID1cbiAgICAgICAgbmV3IE1vZHVsZVJlc29sdmVyKHRzUHJvZ3JhbSwgdGhpcy5vcHRpb25zLCB0aGlzLmFkYXB0ZXIsIG1vZHVsZVJlc29sdXRpb25DYWNoZSk7XG4gICAgdGhpcy5yZXNvdXJjZU1hbmFnZXIgPSBuZXcgQWRhcHRlclJlc291cmNlTG9hZGVyKGFkYXB0ZXIsIHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5jeWNsZUFuYWx5emVyID0gbmV3IEN5Y2xlQW5hbHl6ZXIobmV3IEltcG9ydEdyYXBoKHRoaXMubW9kdWxlUmVzb2x2ZXIpKTtcblxuICAgIGxldCBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+fG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmFkYXB0ZXIuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9IHRoaXMuYWRhcHRlci5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMoKSB8fCBudWxsO1xuICAgIH1cblxuICAgIGlmIChvbGRQcm9ncmFtID09PSBudWxsKSB7XG4gICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyID0gSW5jcmVtZW50YWxEcml2ZXIuZnJlc2godHNQcm9ncmFtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgb2xkRHJpdmVyID0gdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LmdldEluY3JlbWVudGFsRHJpdmVyKG9sZFByb2dyYW0pO1xuICAgICAgaWYgKG9sZERyaXZlciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyID1cbiAgICAgICAgICAgIEluY3JlbWVudGFsRHJpdmVyLnJlY29uY2lsZShvbGRQcm9ncmFtLCBvbGREcml2ZXIsIHRzUHJvZ3JhbSwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEEgcHJldmlvdXMgdHMuUHJvZ3JhbSB3YXMgdXNlZCB0byBjcmVhdGUgdGhlIGN1cnJlbnQgb25lLCBidXQgaXQgd2Fzbid0IGZyb20gYW5cbiAgICAgICAgLy8gYE5nQ29tcGlsZXJgLiBUaGF0IGRvZXNuJ3QgaHVydCBhbnl0aGluZywgYnV0IHRoZSBBbmd1bGFyIGFuYWx5c2lzIHdpbGwgaGF2ZSB0byBzdGFydFxuICAgICAgICAvLyBmcm9tIGEgZnJlc2ggc3RhdGUuXG4gICAgICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIgPSBJbmNyZW1lbnRhbERyaXZlci5mcmVzaCh0c1Byb2dyYW0pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxEcml2ZXIodGhpcy5pbmNyZW1lbnRhbERyaXZlciwgdHNQcm9ncmFtKTtcblxuICAgIHRoaXMuaWdub3JlRm9yRGlhZ25vc3RpY3MgPVxuICAgICAgICBuZXcgU2V0KHRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbHRlcihzZiA9PiB0aGlzLmFkYXB0ZXIuaXNTaGltKHNmKSkpO1xuXG4gICAgdGhpcy5pZ25vcmVGb3JFbWl0ID0gdGhpcy5hZGFwdGVyLmlnbm9yZUZvckVtaXQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBBbmd1bGFyLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIElmIGEgYHRzLlNvdXJjZUZpbGVgIGlzIHBhc3NlZCwgb25seSBkaWFnbm9zdGljcyByZWxhdGVkIHRvIHRoYXQgZmlsZSBhcmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXREaWFnbm9zdGljcyhmaWxlPzogdHMuU291cmNlRmlsZSk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgaWYgKHRoaXMuZGlhZ25vc3RpY3MgPT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgICAgdGhpcy5kaWFnbm9zdGljcyA9XG4gICAgICAgICAgWy4uLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZGlhZ25vc3RpY3MsIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljcygpXTtcbiAgICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwgJiYgY29tcGlsYXRpb24uZXhwb3J0UmVmZXJlbmNlR3JhcGggIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5kaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQsIHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMuZGlhZ25vc3RpY3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmRpYWdub3N0aWNzLmZpbHRlcihkaWFnID0+IHtcbiAgICAgICAgaWYgKGRpYWcuZmlsZSA9PT0gZmlsZSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVGVtcGxhdGVEaWFnbm9zdGljKGRpYWcpICYmIGRpYWcuY29tcG9uZW50RmlsZSA9PT0gZmlsZSkge1xuICAgICAgICAgIC8vIFRlbXBsYXRlIGRpYWdub3N0aWNzIGFyZSByZXBvcnRlZCB3aGVuIGRpYWdub3N0aWNzIGZvciB0aGUgY29tcG9uZW50IGZpbGUgYXJlXG4gICAgICAgICAgLy8gcmVxdWVzdGVkIChzaW5jZSBubyBjb25zdW1lciBvZiBgZ2V0RGlhZ25vc3RpY3NgIHdvdWxkIGV2ZXIgYXNrIGZvciBkaWFnbm9zdGljcyBmcm9tXG4gICAgICAgICAgLy8gdGhlIGZha2UgdHMuU291cmNlRmlsZSBmb3IgdGVtcGxhdGVzKS5cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIHNldHVwLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqL1xuICBnZXRPcHRpb25EaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYHRzLlByb2dyYW1gIHRvIHVzZSBhcyBhIHN0YXJ0aW5nIHBvaW50IHdoZW4gc3Bhd25pbmcgYSBzdWJzZXF1ZW50IGluY3JlbWVudGFsXG4gICAqIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGUgYE5nQ29tcGlsZXJgIHNwYXducyBhbiBpbnRlcm5hbCBpbmNyZW1lbnRhbCBUeXBlU2NyaXB0IGNvbXBpbGF0aW9uIChpbmhlcml0aW5nIHRoZVxuICAgKiBjb25zdW1lcidzIGB0cy5Qcm9ncmFtYCBpbnRvIGEgbmV3IG9uZSBmb3IgdGhlIHB1cnBvc2VzIG9mIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcpLiBBZnRlciB0aGlzXG4gICAqIG9wZXJhdGlvbiwgdGhlIGNvbnN1bWVyJ3MgYHRzLlByb2dyYW1gIGlzIG5vIGxvbmdlciB1c2FibGUgZm9yIHN0YXJ0aW5nIGEgbmV3IGluY3JlbWVudGFsXG4gICAqIGNvbXBpbGF0aW9uLiBgZ2V0TmV4dFByb2dyYW1gIHJldHJpZXZlcyB0aGUgYHRzLlByb2dyYW1gIHdoaWNoIGNhbiBiZSB1c2VkIGluc3RlYWQuXG4gICAqL1xuICBnZXROZXh0UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy5uZXh0UHJvZ3JhbTtcbiAgfVxuXG4gIGdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTogVGVtcGxhdGVUeXBlQ2hlY2tlciB7XG4gICAgcmV0dXJuIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKS50ZW1wbGF0ZVR5cGVDaGVja2VyO1xuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm0gQW5ndWxhcidzIGFuYWx5c2lzIHN0ZXAgKGFzIGEgcHJlY3Vyc29yIHRvIGBnZXREaWFnbm9zdGljc2Agb3IgYHByZXBhcmVFbWl0YClcbiAgICogYXN5bmNocm9ub3VzbHkuXG4gICAqXG4gICAqIE5vcm1hbGx5LCB0aGlzIG9wZXJhdGlvbiBoYXBwZW5zIGxhemlseSB3aGVuZXZlciBgZ2V0RGlhZ25vc3RpY3NgIG9yIGBwcmVwYXJlRW1pdGAgYXJlIGNhbGxlZC5cbiAgICogSG93ZXZlciwgY2VydGFpbiBjb25zdW1lcnMgbWF5IHdpc2ggdG8gYWxsb3cgZm9yIGFuIGFzeW5jaHJvbm91cyBwaGFzZSBvZiBhbmFseXNpcywgd2hlcmVcbiAgICogcmVzb3VyY2VzIHN1Y2ggYXMgYHN0eWxlVXJsc2AgYXJlIHJlc29sdmVkIGFzeW5jaG9ub3VzbHkuIEluIHRoZXNlIGNhc2VzIGBhbmFseXplQXN5bmNgIG11c3QgYmVcbiAgICogY2FsbGVkIGZpcnN0LCBhbmQgaXRzIGBQcm9taXNlYCBhd2FpdGVkIHByaW9yIHRvIGNhbGxpbmcgYW55IG90aGVyIEFQSXMgb2YgYE5nQ29tcGlsZXJgLlxuICAgKi9cbiAgYXN5bmMgYW5hbHl6ZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uICE9PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuXG4gICAgY29uc3QgYW5hbHl6ZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZScpO1xuICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYW5hbHl6ZUZpbGVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emVGaWxlJywgc2YpO1xuICAgICAgbGV0IGFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplQXN5bmMoc2YpO1xuICAgICAgdGhpcy5zY2FuRm9yTXdwKHNmKTtcbiAgICAgIGlmIChhbmFseXNpc1Byb21pc2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVGaWxlU3Bhbik7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMucGVyZlJlY29yZGVyLmVuYWJsZWQpIHtcbiAgICAgICAgYW5hbHlzaXNQcm9taXNlID0gYW5hbHlzaXNQcm9taXNlLnRoZW4oKCkgPT4gdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplRmlsZVNwYW4pKTtcbiAgICAgIH1cbiAgICAgIGlmIChhbmFseXNpc1Byb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwcm9taXNlcy5wdXNoKGFuYWx5c2lzUHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplU3Bhbik7XG5cbiAgICB0aGlzLnJlc29sdmVDb21waWxhdGlvbih0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3QgbGF6eSByb3V0ZXMgZGV0ZWN0ZWQgZHVyaW5nIGFuYWx5c2lzLlxuICAgKlxuICAgKiBUaGlzIGNhbiBiZSBjYWxsZWQgZm9yIG9uZSBzcGVjaWZpYyByb3V0ZSwgb3IgdG8gcmV0cmlldmUgYWxsIHRvcC1sZXZlbCByb3V0ZXMuXG4gICAqL1xuICBsaXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlPzogc3RyaW5nKTogTGF6eVJvdXRlW10ge1xuICAgIGlmIChlbnRyeVJvdXRlKSB7XG4gICAgICAvLyBOb3RlOlxuICAgICAgLy8gVGhpcyByZXNvbHV0aW9uIHN0ZXAgaXMgaGVyZSB0byBtYXRjaCB0aGUgaW1wbGVtZW50YXRpb24gb2YgdGhlIG9sZCBgQW90Q29tcGlsZXJIb3N0YCAoc2VlXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvNTA3MzJlMTU2L3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMjTDE3NS1MMTg4KS5cbiAgICAgIC8vXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCB3aWxsIGFsd2F5cyBjYWxsIHRoaXMgQVBJIHdpdGggYW4gYWJzb2x1dGUgcGF0aCwgc28gdGhlIHJlc29sdXRpb24gc3RlcCBpc1xuICAgICAgLy8gbm90IG5lY2Vzc2FyeSwgYnV0IGtlZXBpbmcgaXQgYmFja3dhcmRzIGNvbXBhdGlibGUgaW4gY2FzZSBzb21lb25lIGVsc2UgaXMgdXNpbmcgdGhlIEFQSS5cblxuICAgICAgLy8gUmVsYXRpdmUgZW50cnkgcGF0aHMgYXJlIGRpc2FsbG93ZWQuXG4gICAgICBpZiAoZW50cnlSb3V0ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gbGlzdCBsYXp5IHJvdXRlczogUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyAoJHtcbiAgICAgICAgICAgIGVudHJ5Um91dGV9KSBpcyBub3Qgc3VwcG9ydGVkLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tcmVsYXRpdmUgZW50cnkgcGF0aHMgZmFsbCBpbnRvIG9uZSBvZiB0aGUgZm9sbG93aW5nIGNhdGVnb3JpZXM6XG4gICAgICAvLyAtIEFic29sdXRlIHN5c3RlbSBwYXRocyAoZS5nLiBgL2Zvby9iYXIvbXktcHJvamVjdC9teS1tb2R1bGVgKSwgd2hpY2ggYXJlIHVuYWZmZWN0ZWQgYnkgdGhlXG4gICAgICAvLyAgIGxvZ2ljIGJlbG93LlxuICAgICAgLy8gLSBQYXRocyB0byBlbnRlcm5hbCBtb2R1bGVzIChlLmcuIGBzb21lLWxpYmApLlxuICAgICAgLy8gLSBQYXRocyBtYXBwZWQgdG8gZGlyZWN0b3JpZXMgaW4gYHRzY29uZmlnLmpzb25gIChlLmcuIGBzaGFyZWQvbXktbW9kdWxlYCkuXG4gICAgICAvLyAgIChTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbCNwYXRoLW1hcHBpbmcuKVxuICAgICAgLy9cbiAgICAgIC8vIEluIGFsbCBjYXNlcyBhYm92ZSwgdGhlIGBjb250YWluaW5nRmlsZWAgYXJndW1lbnQgaXMgaWdub3JlZCwgc28gd2UgY2FuIGp1c3QgdGFrZSB0aGUgZmlyc3RcbiAgICAgIC8vIG9mIHRoZSByb290IGZpbGVzLlxuICAgICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKClbMF07XG4gICAgICBjb25zdCBbZW50cnlQYXRoLCBtb2R1bGVOYW1lXSA9IGVudHJ5Um91dGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID1cbiAgICAgICAgICByZXNvbHZlTW9kdWxlTmFtZShlbnRyeVBhdGgsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuYWRhcHRlciwgbnVsbCk7XG5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBlbnRyeVJvdXRlID0gZW50cnlQb2ludEtleUZvcihyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLCBtb2R1bGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gY29tcGlsYXRpb24ucm91dGVBbmFseXplci5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCB0cmFuc2Zvcm1lcnMgYW5kIG90aGVyIGluZm9ybWF0aW9uIHdoaWNoIGlzIG5lY2Vzc2FyeSBmb3IgYSBjb25zdW1lciB0byBgZW1pdGAgdGhlXG4gICAqIHByb2dyYW0gd2l0aCBBbmd1bGFyLWFkZGVkIGRlZmluaXRpb25zLlxuICAgKi9cbiAgcHJlcGFyZUVtaXQoKToge1xuICAgIHRyYW5zZm9ybWVyczogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICB9IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IGNvcmVJbXBvcnRzRnJvbSA9IGNvbXBpbGF0aW9uLmlzQ29yZSA/IGdldFIzU3ltYm9sc0ZpbGUodGhpcy50c1Byb2dyYW0pIDogbnVsbDtcbiAgICBsZXQgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyO1xuICAgIGlmIChjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwpIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyKGNvcmVJbXBvcnRzRnJvbS5maWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGJlZm9yZSA9IFtcbiAgICAgIGl2eVRyYW5zZm9ybUZhY3RvcnkoXG4gICAgICAgICAgY29tcGlsYXRpb24udHJhaXRDb21waWxlciwgY29tcGlsYXRpb24ucmVmbGVjdG9yLCBpbXBvcnRSZXdyaXRlcixcbiAgICAgICAgICBjb21waWxhdGlvbi5kZWZhdWx0SW1wb3J0VHJhY2tlciwgY29tcGlsYXRpb24uaXNDb3JlLCB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQpLFxuICAgICAgYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZXhwb3J0U3RhdGVtZW50cyksXG4gICAgICBjb21waWxhdGlvbi5kZWZhdWx0SW1wb3J0VHJhY2tlci5pbXBvcnRQcmVzZXJ2aW5nVHJhbnNmb3JtZXIoKSxcbiAgICBdO1xuXG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnM6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdID0gW107XG4gICAgaWYgKGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMgIT09IG51bGwpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zLnB1c2goXG4gICAgICAgICAgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMsIGltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuXG4gICAgLy8gT25seSBhZGQgYWxpYXNpbmcgcmUtZXhwb3J0cyB0byB0aGUgLmQudHMgb3V0cHV0IGlmIHRoZSBgQWxpYXNpbmdIb3N0YCByZXF1ZXN0cyBpdC5cbiAgICBpZiAoY29tcGlsYXRpb24uYWxpYXNpbmdIb3N0ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmFsaWFzaW5nSG9zdC5hbGlhc0V4cG9ydHNJbkR0cykge1xuICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnMucHVzaChhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24udHJhaXRDb21waWxlci5leHBvcnRTdGF0ZW1lbnRzKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgYmVmb3JlLnB1c2goXG4gICAgICAgICAgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybSh0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIuc291cmNlSW5mbywgaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgYmVmb3JlLnB1c2goaXZ5U3dpdGNoVHJhbnNmb3JtKTtcblxuICAgIHJldHVybiB7dHJhbnNmb3JtZXJzOiB7YmVmb3JlLCBhZnRlckRlY2xhcmF0aW9uc30gYXMgdHMuQ3VzdG9tVHJhbnNmb3JtZXJzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gdGhlIGluZGV4aW5nIHByb2Nlc3MgYW5kIHJldHVybiBhIGBNYXBgIG9mIGFsbCBpbmRleGVkIGNvbXBvbmVudHMuXG4gICAqXG4gICAqIFNlZSB0aGUgYGluZGV4aW5nYCBwYWNrYWdlIGZvciBtb3JlIGRldGFpbHMuXG4gICAqL1xuICBnZXRJbmRleGVkQ29tcG9uZW50cygpOiBNYXA8dHMuRGVjbGFyYXRpb24sIEluZGV4ZWRDb21wb25lbnQ+IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBjb250ZXh0ID0gbmV3IEluZGV4aW5nQ29udGV4dCgpO1xuICAgIGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuaW5kZXgoY29udGV4dCk7XG4gICAgcmV0dXJuIGdlbmVyYXRlQW5hbHlzaXMoY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFuYWx5emVkKHRoaXM6IE5nQ29tcGlsZXIpOiBMYXp5Q29tcGlsYXRpb25TdGF0ZSB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IG51bGwpIHtcbiAgICAgIHRoaXMuYW5hbHl6ZVN5bmMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsYXRpb24hO1xuICB9XG5cbiAgcHJpdmF0ZSBhbmFseXplU3luYygpOiB2b2lkIHtcbiAgICBjb25zdCBhbmFseXplU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplJyk7XG4gICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBhbmFseXplRmlsZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZUZpbGUnLCBzZik7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuYW5hbHl6ZVN5bmMoc2YpO1xuICAgICAgdGhpcy5zY2FuRm9yTXdwKHNmKTtcbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKTtcbiAgICB9XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplU3Bhbik7XG5cbiAgICB0aGlzLnJlc29sdmVDb21waWxhdGlvbih0aGlzLmNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlQ29tcGlsYXRpb24odHJhaXRDb21waWxlcjogVHJhaXRDb21waWxlcik6IHZvaWQge1xuICAgIHRyYWl0Q29tcGlsZXIucmVzb2x2ZSgpO1xuXG4gICAgdGhpcy5yZWNvcmROZ01vZHVsZVNjb3BlRGVwZW5kZW5jaWVzKCk7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBhbmFseXNpcyBpcyBjb21wbGV0ZSBhbmQgdGhlIGNvbXBpbGVyIGNhbiBub3cgY2FsY3VsYXRlIHdoaWNoIGZpbGVzIG5lZWQgdG9cbiAgICAvLyBiZSBlbWl0dGVkLCBzbyBkbyB0aGF0LlxuICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIucmVjb3JkU3VjY2Vzc2Z1bEFuYWx5c2lzKHRyYWl0Q29tcGlsZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgZnVsbFRlbXBsYXRlVHlwZUNoZWNrKCk6IGJvb2xlYW4ge1xuICAgIC8vIERldGVybWluZSB0aGUgc3RyaWN0bmVzcyBsZXZlbCBvZiB0eXBlIGNoZWNraW5nIGJhc2VkIG9uIGNvbXBpbGVyIG9wdGlvbnMuIEFzXG4gICAgLy8gYHN0cmljdFRlbXBsYXRlc2AgaXMgYSBzdXBlcnNldCBvZiBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCwgdGhlIGZvcm1lciBpbXBsaWVzIHRoZSBsYXR0ZXIuXG4gICAgLy8gQWxzbyBzZWUgYHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zYCB3aGVyZSBpdCBpcyB2ZXJpZmllZCB0aGF0IGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgXG4gICAgLy8gaXMgbm90IGRpc2FibGVkIHdoZW4gYHN0cmljdFRlbXBsYXRlc2AgaXMgZW5hYmxlZC5cbiAgICBjb25zdCBzdHJpY3RUZW1wbGF0ZXMgPSAhIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXM7XG4gICAgcmV0dXJuIHN0cmljdFRlbXBsYXRlcyB8fCAhIXRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2s7XG4gIH1cblxuICBwcml2YXRlIGdldFR5cGVDaGVja2luZ0NvbmZpZygpOiBUeXBlQ2hlY2tpbmdDb25maWcge1xuICAgIC8vIERldGVybWluZSB0aGUgc3RyaWN0bmVzcyBsZXZlbCBvZiB0eXBlIGNoZWNraW5nIGJhc2VkIG9uIGNvbXBpbGVyIG9wdGlvbnMuIEFzXG4gICAgLy8gYHN0cmljdFRlbXBsYXRlc2AgaXMgYSBzdXBlcnNldCBvZiBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCwgdGhlIGZvcm1lciBpbXBsaWVzIHRoZSBsYXR0ZXIuXG4gICAgLy8gQWxzbyBzZWUgYHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zYCB3aGVyZSBpdCBpcyB2ZXJpZmllZCB0aGF0IGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgXG4gICAgLy8gaXMgbm90IGRpc2FibGVkIHdoZW4gYHN0cmljdFRlbXBsYXRlc2AgaXMgZW5hYmxlZC5cbiAgICBjb25zdCBzdHJpY3RUZW1wbGF0ZXMgPSAhIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXM7XG5cbiAgICAvLyBGaXJzdCBzZWxlY3QgYSB0eXBlLWNoZWNraW5nIGNvbmZpZ3VyYXRpb24sIGJhc2VkIG9uIHdoZXRoZXIgZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGlzXG4gICAgLy8gcmVxdWVzdGVkLlxuICAgIGxldCB0eXBlQ2hlY2tpbmdDb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZztcbiAgICBpZiAodGhpcy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogdHJ1ZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGhvbm9yQWNjZXNzTW9kaWZpZXJzRm9ySW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQXR0cmlidXRlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBFdmVuIGluIGZ1bGwgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlLCBET00gYmluZGluZyBjaGVja3MgYXJlIG5vdCBxdWl0ZSByZWFkeSB5ZXQuXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBDaGVja2luZyBvZiBET00gZXZlbnRzIGN1cnJlbnRseSBoYXMgYW4gYWR2ZXJzZSBlZmZlY3Qgb24gZGV2ZWxvcGVyIGV4cGVyaWVuY2UsXG4gICAgICAgIC8vIGUuZy4gZm9yIGA8aW5wdXQgKGJsdXIpPVwidXBkYXRlKCRldmVudC50YXJnZXQudmFsdWUpXCI+YCBlbmFibGluZyB0aGlzIGNoZWNrIHJlc3VsdHMgaW46XG4gICAgICAgIC8vIC0gZXJyb3IgVFMyNTMxOiBPYmplY3QgaXMgcG9zc2libHkgJ251bGwnLlxuICAgICAgICAvLyAtIGVycm9yIFRTMjMzOTogUHJvcGVydHkgJ3ZhbHVlJyBkb2VzIG5vdCBleGlzdCBvbiB0eXBlICdFdmVudFRhcmdldCcuXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBOb24tRE9NIHJlZmVyZW5jZXMgaGF2ZSB0aGUgY29ycmVjdCB0eXBlIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzOiB0cnVlLFxuICAgICAgICAvLyBQaXBlcyBhcmUgY2hlY2tlZCBpbiBWaWV3IEVuZ2luZSBzbyB0aGVyZSBpcyBubyBzdHJpY3RuZXNzIGZsYWcuXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IHRydWUsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgdXNlQ29udGV4dEdlbmVyaWNUeXBlOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIHN0cmljdExpdGVyYWxUeXBlczogdHJ1ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IGZhbHNlLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkF0dHJpYnV0ZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbUJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tRXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogZmFsc2UsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IGZhbHNlLFxuICAgICAgICB1c2VDb250ZXh0R2VuZXJpY1R5cGU6IGZhbHNlLFxuICAgICAgICBzdHJpY3RMaXRlcmFsVHlwZXM6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBBcHBseSBleHBsaWNpdGx5IGNvbmZpZ3VyZWQgc3RyaWN0bmVzcyBmbGFncyBvbiB0b3Agb2YgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgIC8vIGJhc2VkIG9uIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0QWNjZXNzTW9kaWZpZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5ob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3MgPVxuICAgICAgICAgIHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dEFjY2Vzc01vZGlmaWVycztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3ROdWxsSW5wdXRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbElucHV0VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tRXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUxvY2FsUmVmVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3REb21Mb2NhbFJlZlR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdEF0dHJpYnV0ZVR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkF0dHJpYnV0ZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0QXR0cmlidXRlVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUgPSB0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TGl0ZXJhbFR5cGVzID0gdGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcztcbiAgICB9XG5cbiAgICByZXR1cm4gdHlwZUNoZWNraW5nQ29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIC8vIFNraXAgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpZiBpdCdzIGRpc2FibGVkLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuaXZ5VGVtcGxhdGVUeXBlQ2hlY2sgPT09IGZhbHNlICYmICF0aGlzLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCB0eXBlQ2hlY2tTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ3R5cGVDaGVja0RpYWdub3N0aWNzJyk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlIHx8IHRoaXMuYWRhcHRlci5pc1NoaW0oc2YpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBkaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgIC4uLmNvbXBpbGF0aW9uLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmLCBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW0pKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy50eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3kuZ2V0UHJvZ3JhbSgpO1xuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AodHlwZUNoZWNrU3Bhbik7XG4gICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsRHJpdmVyKHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsIHByb2dyYW0pO1xuICAgIHRoaXMubmV4dFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlaWZpZXMgdGhlIGludGVyLWRlcGVuZGVuY2llcyBvZiBOZ01vZHVsZXMgYW5kIHRoZSBjb21wb25lbnRzIHdpdGhpbiB0aGVpciBjb21waWxhdGlvbiBzY29wZXNcbiAgICogaW50byB0aGUgYEluY3JlbWVudGFsRHJpdmVyYCdzIGRlcGVuZGVuY3kgZ3JhcGguXG4gICAqL1xuICBwcml2YXRlIHJlY29yZE5nTW9kdWxlU2NvcGVEZXBlbmRlbmNpZXMoKSB7XG4gICAgY29uc3QgcmVjb3JkU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdyZWNvcmREZXBlbmRlbmNpZXMnKTtcbiAgICBjb25zdCBkZXBHcmFwaCA9IHRoaXMuaW5jcmVtZW50YWxEcml2ZXIuZGVwR3JhcGg7XG5cbiAgICBmb3IgKGNvbnN0IHNjb3BlIG9mIHRoaXMuY29tcGlsYXRpb24hLnNjb3BlUmVnaXN0cnkhLmdldENvbXBpbGF0aW9uU2NvcGVzKCkpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSBzY29wZS5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBjb25zdCBuZ01vZHVsZUZpbGUgPSBzY29wZS5uZ01vZHVsZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICAgIC8vIEEgY2hhbmdlIHRvIGFueSBkZXBlbmRlbmN5IG9mIHRoZSBkZWNsYXJhdGlvbiBjYXVzZXMgdGhlIGRlY2xhcmF0aW9uIHRvIGJlIGludmFsaWRhdGVkLFxuICAgICAgLy8gd2hpY2ggcmVxdWlyZXMgdGhlIE5nTW9kdWxlIHRvIGJlIGludmFsaWRhdGVkIGFzIHdlbGwuXG4gICAgICBkZXBHcmFwaC5hZGRUcmFuc2l0aXZlRGVwZW5kZW5jeShuZ01vZHVsZUZpbGUsIGZpbGUpO1xuXG4gICAgICAvLyBBIGNoYW5nZSB0byB0aGUgTmdNb2R1bGUgZmlsZSBzaG91bGQgY2F1c2UgdGhlIGRlY2xhcmF0aW9uIGl0c2VsZiB0byBiZSBpbnZhbGlkYXRlZC5cbiAgICAgIGRlcEdyYXBoLmFkZERlcGVuZGVuY3koZmlsZSwgbmdNb2R1bGVGaWxlKTtcblxuICAgICAgY29uc3QgbWV0YSA9XG4gICAgICAgICAgdGhpcy5jb21waWxhdGlvbiEubWV0YVJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShuZXcgUmVmZXJlbmNlKHNjb3BlLmRlY2xhcmF0aW9uKSk7XG4gICAgICBpZiAobWV0YSAhPT0gbnVsbCAmJiBtZXRhLmlzQ29tcG9uZW50KSB7XG4gICAgICAgIC8vIElmIGEgY29tcG9uZW50J3MgdGVtcGxhdGUgY2hhbmdlcywgaXQgbWlnaHQgaGF2ZSBhZmZlY3RlZCB0aGUgaW1wb3J0IGdyYXBoLCBhbmQgdGh1cyB0aGVcbiAgICAgICAgLy8gcmVtb3RlIHNjb3BpbmcgZmVhdHVyZSB3aGljaCBpcyBhY3RpdmF0ZWQgaW4gdGhlIGV2ZW50IG9mIHBvdGVudGlhbCBpbXBvcnQgY3ljbGVzLiBUaHVzLFxuICAgICAgICAvLyB0aGUgbW9kdWxlIGRlcGVuZHMgbm90IG9ubHkgb24gdGhlIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzIG9mIHRoZSBjb21wb25lbnQsIGJ1dCBvbiBpdHNcbiAgICAgICAgLy8gcmVzb3VyY2VzIGFzIHdlbGwuXG4gICAgICAgIGRlcEdyYXBoLmFkZFRyYW5zaXRpdmVSZXNvdXJjZXMobmdNb2R1bGVGaWxlLCBmaWxlKTtcblxuICAgICAgICAvLyBBIGNoYW5nZSB0byBhbnkgZGlyZWN0aXZlL3BpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIHNob3VsZCBjYXVzZSB0aGUgY29tcG9uZW50IHRvIGJlXG4gICAgICAgIC8vIGludmFsaWRhdGVkLlxuICAgICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBzY29wZS5kaXJlY3RpdmVzKSB7XG4gICAgICAgICAgLy8gV2hlbiBhIGRpcmVjdGl2ZSBpbiBzY29wZSBpcyB1cGRhdGVkLCB0aGUgY29tcG9uZW50IG5lZWRzIHRvIGJlIHJlY29tcGlsZWQgYXMgZS5nLiBhXG4gICAgICAgICAgLy8gc2VsZWN0b3IgbWF5IGhhdmUgY2hhbmdlZC5cbiAgICAgICAgICBkZXBHcmFwaC5hZGRUcmFuc2l0aXZlRGVwZW5kZW5jeShmaWxlLCBkaXJlY3RpdmUucmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHBpcGUgb2Ygc2NvcGUucGlwZXMpIHtcbiAgICAgICAgICAvLyBXaGVuIGEgcGlwZSBpbiBzY29wZSBpcyB1cGRhdGVkLCB0aGUgY29tcG9uZW50IG5lZWRzIHRvIGJlIHJlY29tcGlsZWQgYXMgZS5nLiB0aGVcbiAgICAgICAgICAvLyBwaXBlJ3MgbmFtZSBtYXkgaGF2ZSBjaGFuZ2VkLlxuICAgICAgICAgIGRlcEdyYXBoLmFkZFRyYW5zaXRpdmVEZXBlbmRlbmN5KGZpbGUsIHBpcGUucmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXBvbmVudHMgZGVwZW5kIG9uIHRoZSBlbnRpcmUgZXhwb3J0IHNjb3BlLiBJbiBhZGRpdGlvbiB0byB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcyBvblxuICAgICAgICAvLyBhbGwgZGlyZWN0aXZlcy9waXBlcyBpbiB0aGUgZXhwb3J0IHNjb3BlLCB0aGV5IGFsc28gZGVwZW5kIG9uIGV2ZXJ5IE5nTW9kdWxlIGluIHRoZVxuICAgICAgICAvLyBzY29wZSwgYXMgY2hhbmdlcyB0byBhIG1vZHVsZSBtYXkgYWRkIG5ldyBkaXJlY3RpdmVzL3BpcGVzIHRvIHRoZSBzY29wZS5cbiAgICAgICAgZm9yIChjb25zdCBkZXBNb2R1bGUgb2Ygc2NvcGUubmdNb2R1bGVzKSB7XG4gICAgICAgICAgLy8gVGhlcmUgaXMgYSBjb3JyZWN0bmVzcyBpc3N1ZSBoZXJlLiBUbyBiZSBjb3JyZWN0LCB0aGlzIHNob3VsZCBiZSBhIHRyYW5zaXRpdmVcbiAgICAgICAgICAvLyBkZXBlbmRlbmN5IG9uIHRoZSBkZXBNb2R1bGUgZmlsZSwgc2luY2UgdGhlIGRlcE1vZHVsZSdzIGV4cG9ydHMgbWlnaHQgY2hhbmdlIHZpYSBvbmUgb2ZcbiAgICAgICAgICAvLyBpdHMgZGVwZW5kZW5jaWVzLCBldmVuIGlmIGRlcE1vZHVsZSdzIGZpbGUgaXRzZWxmIGRvZXNuJ3QgY2hhbmdlLiBIb3dldmVyLCBkb2luZyB0aGlzXG4gICAgICAgICAgLy8gd291bGQgYWxzbyB0cmlnZ2VyIHJlY29tcGlsYXRpb24gaWYgYSBub24tZXhwb3J0ZWQgY29tcG9uZW50IG9yIGRpcmVjdGl2ZSBjaGFuZ2VkLFxuICAgICAgICAgIC8vIHdoaWNoIGNhdXNlcyBwZXJmb3JtYW5jZSBpc3N1ZXMgZm9yIHJlYnVpbGRzLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gR2l2ZW4gdGhlIHJlYnVpbGQgaXNzdWUgaXMgYW4gZWRnZSBjYXNlLCBjdXJyZW50bHkgd2UgZXJyIG9uIHRoZSBzaWRlIG9mIHBlcmZvcm1hbmNlXG4gICAgICAgICAgLy8gaW5zdGVhZCBvZiBjb3JyZWN0bmVzcy4gQSBjb3JyZWN0IGFuZCBwZXJmb3JtYW50IGRlc2lnbiB3b3VsZCBkaXN0aW5ndWlzaCBiZXR3ZWVuXG4gICAgICAgICAgLy8gY2hhbmdlcyB0byB0aGUgZGVwTW9kdWxlIHdoaWNoIGFmZmVjdCBpdHMgZXhwb3J0IHNjb3BlIGFuZCBjaGFuZ2VzIHdoaWNoIGRvIG5vdCwgYW5kXG4gICAgICAgICAgLy8gb25seSBhZGQgYSBkZXBlbmRlbmN5IGZvciB0aGUgZm9ybWVyLiBUaGlzIGNvbmNlcHQgaXMgY3VycmVudGx5IGluIGRldmVsb3BtZW50LlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBmaXggY29ycmVjdG5lc3MgaXNzdWUgYnkgdW5kZXJzdGFuZGluZyB0aGUgc2VtYW50aWNzIG9mIHRoZSBkZXBlbmRlbmN5LlxuICAgICAgICAgIGRlcEdyYXBoLmFkZERlcGVuZGVuY3koZmlsZSwgZGVwTW9kdWxlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIERpcmVjdGl2ZXMgKG5vdCBjb21wb25lbnRzKSBhbmQgcGlwZXMgb25seSBkZXBlbmQgb24gdGhlIE5nTW9kdWxlIHdoaWNoIGRpcmVjdGx5IGRlY2xhcmVzXG4gICAgICAgIC8vIHRoZW0uXG4gICAgICAgIGRlcEdyYXBoLmFkZERlcGVuZGVuY3koZmlsZSwgbmdNb2R1bGVGaWxlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChyZWNvcmRTcGFuKTtcbiAgfVxuXG4gIHByaXZhdGUgc2NhbkZvck13cChzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMuY29tcGlsYXRpb24hLm13cFNjYW5uZXIuc2NhbihzZiwge1xuICAgICAgYWRkVHlwZVJlcGxhY2VtZW50OiAobm9kZTogdHMuRGVjbGFyYXRpb24sIHR5cGU6IFR5cGUpOiB2b2lkID0+IHtcbiAgICAgICAgLy8gT25seSBvYnRhaW4gdGhlIHJldHVybiB0eXBlIHRyYW5zZm9ybSBmb3IgdGhlIHNvdXJjZSBmaWxlIG9uY2UgdGhlcmUncyBhIHR5cGUgdG8gcmVwbGFjZSxcbiAgICAgICAgLy8gc28gdGhhdCBubyB0cmFuc2Zvcm0gaXMgYWxsb2NhdGVkIHdoZW4gdGhlcmUncyBub3RoaW5nIHRvIGRvLlxuICAgICAgICB0aGlzLmNvbXBpbGF0aW9uIS5kdHNUcmFuc2Zvcm1zIS5nZXRSZXR1cm5UeXBlVHJhbnNmb3JtKHNmKS5hZGRUeXBlUmVwbGFjZW1lbnQobm9kZSwgdHlwZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIG1ha2VDb21waWxhdGlvbigpOiBMYXp5Q29tcGlsYXRpb25TdGF0ZSB7XG4gICAgY29uc3QgY2hlY2tlciA9IHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICBjb25zdCByZWZsZWN0b3IgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KGNoZWNrZXIpO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBSZWZlcmVuY2VFbWl0dGVyLlxuICAgIGxldCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyO1xuICAgIGxldCBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCA9PT0gbnVsbCB8fCAhdGhpcy5vcHRpb25zLl91c2VIb3N0Rm9ySW1wb3J0R2VuZXJhdGlvbikge1xuICAgICAgbGV0IGxvY2FsSW1wb3J0U3RyYXRlZ3k6IFJlZmVyZW5jZUVtaXRTdHJhdGVneTtcblxuICAgICAgLy8gVGhlIHN0cmF0ZWd5IHVzZWQgZm9yIGxvY2FsLCBpbi1wcm9qZWN0IGltcG9ydHMgZGVwZW5kcyBvbiB3aGV0aGVyIFRTIGhhcyBiZWVuIGNvbmZpZ3VyZWRcbiAgICAgIC8vIHdpdGggcm9vdERpcnMuIElmIHNvLCB0aGVuIG11bHRpcGxlIGRpcmVjdG9yaWVzIG1heSBiZSBtYXBwZWQgaW4gdGhlIHNhbWUgXCJtb2R1bGVcbiAgICAgIC8vIG5hbWVzcGFjZVwiIGFuZCB0aGUgbG9naWMgb2YgYExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3lgIGlzIHJlcXVpcmVkIHRvIGdlbmVyYXRlIGNvcnJlY3RcbiAgICAgIC8vIGltcG9ydHMgd2hpY2ggbWF5IGNyb3NzIHRoZXNlIG11bHRpcGxlIGRpcmVjdG9yaWVzLiBPdGhlcndpc2UsIHBsYWluIHJlbGF0aXZlIGltcG9ydHMgYXJlXG4gICAgICAvLyBzdWZmaWNpZW50LlxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5yb290RGlyICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAodGhpcy5vcHRpb25zLnJvb3REaXJzICE9PSB1bmRlZmluZWQgJiYgdGhpcy5vcHRpb25zLnJvb3REaXJzLmxlbmd0aCA+IDApKSB7XG4gICAgICAgIC8vIHJvb3REaXJzIGxvZ2ljIGlzIGluIGVmZmVjdCAtIHVzZSB0aGUgYExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3lgIGZvciBpbi1wcm9qZWN0IHJlbGF0aXZlXG4gICAgICAgIC8vIGltcG9ydHMuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3kgPSBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneShcbiAgICAgICAgICAgIHJlZmxlY3RvciwgbmV3IExvZ2ljYWxGaWxlU3lzdGVtKFsuLi50aGlzLmFkYXB0ZXIucm9vdERpcnNdLCB0aGlzLmFkYXB0ZXIpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFBsYWluIHJlbGF0aXZlIGltcG9ydHMgYXJlIGFsbCB0aGF0J3MgbmVlZGVkLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID0gbmV3IFJlbGF0aXZlUGF0aFN0cmF0ZWd5KHJlZmxlY3Rvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBDb21waWxlckhvc3QgZG9lc24ndCBoYXZlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyBidWlsZCBhbiBOUE0tY2VudHJpYyByZWZlcmVuY2VcbiAgICAgIC8vIHJlc29sdXRpb24gc3RyYXRlZ3kuXG4gICAgICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBOZXh0LCBhdHRlbXB0IHRvIHVzZSBhbiBhYnNvbHV0ZSBpbXBvcnQuXG4gICAgICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KHRoaXMudHNQcm9ncmFtLCBjaGVja2VyLCB0aGlzLm1vZHVsZVJlc29sdmVyLCByZWZsZWN0b3IpLFxuICAgICAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgcmVmZXJlbmNlIGlzIGJlaW5nIHdyaXR0ZW4gaW50byBhIGZpbGUgd2l0aGluIHRoZSBwcm9qZWN0J3MgLnRzXG4gICAgICAgIC8vIHNvdXJjZXMsIGFuZCB1c2UgYSByZWxhdGl2ZSBpbXBvcnQgaWYgc28uIElmIHRoaXMgZmFpbHMsIFJlZmVyZW5jZUVtaXR0ZXIgd2lsbCB0aHJvd1xuICAgICAgICAvLyBhbiBlcnJvci5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSxcbiAgICAgIF0pO1xuXG4gICAgICAvLyBJZiBhbiBlbnRyeXBvaW50IGlzIHByZXNlbnQsIHRoZW4gYWxsIHVzZXIgaW1wb3J0cyBzaG91bGQgYmUgZGlyZWN0ZWQgdGhyb3VnaCB0aGVcbiAgICAgIC8vIGVudHJ5cG9pbnQgYW5kIHByaXZhdGUgZXhwb3J0cyBhcmUgbm90IG5lZWRlZC4gVGhlIGNvbXBpbGVyIHdpbGwgdmFsaWRhdGUgdGhhdCBhbGwgcHVibGljbHlcbiAgICAgIC8vIHZpc2libGUgZGlyZWN0aXZlcy9waXBlcyBhcmUgaW1wb3J0YWJsZSB2aWEgdGhpcyBlbnRyeXBvaW50LlxuICAgICAgaWYgKHRoaXMuZW50cnlQb2ludCA9PT0gbnVsbCAmJiB0aGlzLm9wdGlvbnMuZ2VuZXJhdGVEZWVwUmVleHBvcnRzID09PSB0cnVlKSB7XG4gICAgICAgIC8vIE5vIGVudHJ5cG9pbnQgaXMgcHJlc2VudCBhbmQgZGVlcCByZS1leHBvcnRzIHdlcmUgcmVxdWVzdGVkLCBzbyBjb25maWd1cmUgdGhlIGFsaWFzaW5nXG4gICAgICAgIC8vIHN5c3RlbSB0byBnZW5lcmF0ZSB0aGVtLlxuICAgICAgICBhbGlhc2luZ0hvc3QgPSBuZXcgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdChyZWZsZWN0b3IpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IHN1cHBvcnRzIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyB1c2UgdGhhdCB0byBlbWl0IGltcG9ydHMuXG4gICAgICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBhbGlhc2VkIHJlZmVyZW5jZXMgKHRoaXMgaXMgYSB3b3JrYXJvdW5kIHRvIFN0cmljdERlcHMgY2hlY2tzKS5cbiAgICAgICAgbmV3IEFsaWFzU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgZmlsZU5hbWVUb01vZHVsZU5hbWUgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgICBuZXcgVW5pZmllZE1vZHVsZXNTdHJhdGVneShyZWZsZWN0b3IsIHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QpLFxuICAgICAgXSk7XG4gICAgICBhbGlhc2luZ0hvc3QgPSBuZXcgVW5pZmllZE1vZHVsZXNBbGlhc2luZ0hvc3QodGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCk7XG4gICAgfVxuXG4gICAgY29uc3QgZXZhbHVhdG9yID0gbmV3IFBhcnRpYWxFdmFsdWF0b3IocmVmbGVjdG9yLCBjaGVja2VyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmRlcEdyYXBoKTtcbiAgICBjb25zdCBkdHNSZWFkZXIgPSBuZXcgRHRzTWV0YWRhdGFSZWFkZXIoY2hlY2tlciwgcmVmbGVjdG9yKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyID0gbG9jYWxNZXRhUmVnaXN0cnk7XG4gICAgY29uc3QgZGVwU2NvcGVSZWFkZXIgPSBuZXcgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyKGR0c1JlYWRlciwgYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlZ2lzdHJ5ID1cbiAgICAgICAgbmV3IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeShsb2NhbE1ldGFSZWFkZXIsIGRlcFNjb3BlUmVhZGVyLCByZWZFbWl0dGVyLCBhbGlhc2luZ0hvc3QpO1xuICAgIGNvbnN0IHNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlciA9IHNjb3BlUmVnaXN0cnk7XG4gICAgY29uc3QgbWV0YVJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbbG9jYWxNZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnldKTtcbiAgICBjb25zdCBpbmplY3RhYmxlUmVnaXN0cnkgPSBuZXcgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnkocmVmbGVjdG9yKTtcblxuICAgIGNvbnN0IG1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbbG9jYWxNZXRhUmVhZGVyLCBkdHNSZWFkZXJdKTtcblxuXG4gICAgLy8gSWYgYSBmbGF0IG1vZHVsZSBlbnRyeXBvaW50IHdhcyBzcGVjaWZpZWQsIHRoZW4gdHJhY2sgcmVmZXJlbmNlcyB2aWEgYSBgUmVmZXJlbmNlR3JhcGhgIGluXG4gICAgLy8gb3JkZXIgdG8gcHJvZHVjZSBwcm9wZXIgZGlhZ25vc3RpY3MgZm9yIGluY29ycmVjdGx5IGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMvZXRjLiBJZiB0aGVyZVxuICAgIC8vIGlzIG5vIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgdGhlbiBkb24ndCBwYXkgdGhlIGNvc3Qgb2YgdHJhY2tpbmcgcmVmZXJlbmNlcy5cbiAgICBsZXQgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBSZWZlcmVuY2VzUmVnaXN0cnk7XG4gICAgbGV0IGV4cG9ydFJlZmVyZW5jZUdyYXBoOiBSZWZlcmVuY2VHcmFwaHxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsKSB7XG4gICAgICBleHBvcnRSZWZlcmVuY2VHcmFwaCA9IG5ldyBSZWZlcmVuY2VHcmFwaCgpO1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IFJlZmVyZW5jZUdyYXBoQWRhcHRlcihleHBvcnRSZWZlcmVuY2VHcmFwaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5KCk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm91dGVBbmFseXplciA9IG5ldyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIodGhpcy5tb2R1bGVSZXNvbHZlciwgZXZhbHVhdG9yKTtcblxuICAgIGNvbnN0IGR0c1RyYW5zZm9ybXMgPSBuZXcgRHRzVHJhbnNmb3JtUmVnaXN0cnkoKTtcblxuICAgIGNvbnN0IG13cFNjYW5uZXIgPSBuZXcgTW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXIocmVmbGVjdG9yLCBldmFsdWF0b3IsIHJlZkVtaXR0ZXIpO1xuXG4gICAgY29uc3QgaXNDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy50c1Byb2dyYW0pO1xuXG4gICAgY29uc3QgZGVmYXVsdEltcG9ydFRyYWNrZXIgPSBuZXcgRGVmYXVsdEltcG9ydFRyYWNrZXIoKTtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXSA9IFtcbiAgICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIG1ldGFSZWFkZXIsIHNjb3BlUmVhZGVyLCBzY29wZVJlZ2lzdHJ5LCBpc0NvcmUsXG4gICAgICAgICAgdGhpcy5yZXNvdXJjZU1hbmFnZXIsIHRoaXMuYWRhcHRlci5yb290RGlycywgdGhpcy5vcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMgfHwgZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyAhPT0gZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQgIT09IGZhbHNlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMuY3ljbGVBbmFseXplcixcbiAgICAgICAgICByZWZFbWl0dGVyLCBkZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pbmNyZW1lbnRhbERyaXZlci5kZXBHcmFwaCwgaW5qZWN0YWJsZVJlZ2lzdHJ5LFxuICAgICAgICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCksXG4gICAgICAvLyBUT0RPKGFseGh1Yik6IHVuZGVyc3RhbmQgd2h5IHRoZSBjYXN0IGhlcmUgaXMgbmVjZXNzYXJ5IChzb21ldGhpbmcgdG8gZG8gd2l0aCBgbnVsbGBcbiAgICAgIC8vIG5vdCBiZWluZyBhc3NpZ25hYmxlIHRvIGB1bmtub3duYCB3aGVuIHdyYXBwZWQgaW4gYFJlYWRvbmx5YCkuXG4gICAgICAvLyBjbGFuZy1mb3JtYXQgb2ZmXG4gICAgICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgbWV0YVJlYWRlcixcbiAgICAgICAgICAgIGRlZmF1bHRJbXBvcnRUcmFja2VyLCBpbmplY3RhYmxlUmVnaXN0cnksIGlzQ29yZSwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLFxuICAgICAgICAgICAgLy8gSW4gbmd0c2Mgd2Ugbm8gbG9uZ2VyIHdhbnQgdG8gY29tcGlsZSB1bmRlY29yYXRlZCBjbGFzc2VzIHdpdGggQW5ndWxhciBmZWF0dXJlcy5cbiAgICAgICAgICAgIC8vIE1pZ3JhdGlvbnMgZm9yIHRoZXNlIHBhdHRlcm5zIHJhbiBhcyBwYXJ0IG9mIGBuZyB1cGRhdGVgIGFuZCB3ZSB3YW50IHRvIGVuc3VyZVxuICAgICAgICAgICAgLy8gdGhhdCBwcm9qZWN0cyBkbyBub3QgcmVncmVzcy4gU2VlIGh0dHBzOi8vaGFja21kLmlvL0BhbHgvcnlmWVl1dnpIIGZvciBtb3JlIGRldGFpbHMuXG4gICAgICAgICAgICAvKiBjb21waWxlVW5kZWNvcmF0ZWRDbGFzc2VzV2l0aEFuZ3VsYXJGZWF0dXJlcyAqLyBmYWxzZVxuICAgICAgICApIGFzIFJlYWRvbmx5PERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj4+LFxuICAgICAgLy8gY2xhbmctZm9ybWF0IG9uXG4gICAgICAvLyBQaXBlIGhhbmRsZXIgbXVzdCBiZSBiZWZvcmUgaW5qZWN0YWJsZSBoYW5kbGVyIGluIGxpc3Qgc28gcGlwZSBmYWN0b3JpZXMgYXJlIHByaW50ZWRcbiAgICAgIC8vIGJlZm9yZSBpbmplY3RhYmxlIGZhY3RvcmllcyAoc28gaW5qZWN0YWJsZSBmYWN0b3JpZXMgY2FuIGRlbGVnYXRlIHRvIHRoZW0pXG4gICAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgZGVmYXVsdEltcG9ydFRyYWNrZXIsXG4gICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBpc0NvcmUpLFxuICAgICAgbmV3IEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZGVmYXVsdEltcG9ydFRyYWNrZXIsIGlzQ29yZSwgdGhpcy5vcHRpb25zLnN0cmljdEluamVjdGlvblBhcmFtZXRlcnMgfHwgZmFsc2UsXG4gICAgICAgICAgaW5qZWN0YWJsZVJlZ2lzdHJ5KSxcbiAgICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWFkZXIsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgcmVmZXJlbmNlc1JlZ2lzdHJ5LCBpc0NvcmUsXG4gICAgICAgICAgcm91dGVBbmFseXplciwgcmVmRW1pdHRlciwgdGhpcy5hZGFwdGVyLmZhY3RvcnlUcmFja2VyLCBkZWZhdWx0SW1wb3J0VHJhY2tlcixcbiAgICAgICAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsIGluamVjdGFibGVSZWdpc3RyeSwgdGhpcy5vcHRpb25zLmkxOG5JbkxvY2FsZSksXG4gICAgXTtcblxuICAgIGNvbnN0IHRyYWl0Q29tcGlsZXIgPSBuZXcgVHJhaXRDb21waWxlcihcbiAgICAgICAgaGFuZGxlcnMsIHJlZmxlY3RvciwgdGhpcy5wZXJmUmVjb3JkZXIsIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsXG4gICAgICAgIHRoaXMub3B0aW9ucy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICE9PSBmYWxzZSwgZHRzVHJhbnNmb3Jtcyk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gbmV3IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsKFxuICAgICAgICB0aGlzLnRzUHJvZ3JhbSwgdGhpcy50eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksIHRyYWl0Q29tcGlsZXIsXG4gICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNraW5nQ29uZmlnKCksIHJlZkVtaXR0ZXIsIHJlZmxlY3RvciwgdGhpcy5hZGFwdGVyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyKTtcblxuICAgIHJldHVybiB7XG4gICAgICBpc0NvcmUsXG4gICAgICB0cmFpdENvbXBpbGVyLFxuICAgICAgcmVmbGVjdG9yLFxuICAgICAgc2NvcGVSZWdpc3RyeSxcbiAgICAgIGR0c1RyYW5zZm9ybXMsXG4gICAgICBleHBvcnRSZWZlcmVuY2VHcmFwaCxcbiAgICAgIHJvdXRlQW5hbHl6ZXIsXG4gICAgICBtd3BTY2FubmVyLFxuICAgICAgbWV0YVJlYWRlcixcbiAgICAgIGRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgYWxpYXNpbmdIb3N0LFxuICAgICAgcmVmRW1pdHRlcixcbiAgICAgIHRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgZ2l2ZW4gYFByb2dyYW1gIGlzIEBhbmd1bGFyL2NvcmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUGFja2FnZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogYm9vbGVhbiB7XG4gIC8vIExvb2sgZm9yIGl0c19qdXN0X2FuZ3VsYXIudHMgc29tZXdoZXJlIGluIHRoZSBwcm9ncmFtLlxuICBjb25zdCByM1N5bWJvbHMgPSBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW0pO1xuICBpZiAocjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIGNvbnN0YW50IElUU19KVVNUX0FOR1VMQVIgaW4gdGhhdCBmaWxlLlxuICByZXR1cm4gcjNTeW1ib2xzLnN0YXRlbWVudHMuc29tZShzdG10ID0+IHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IG11c3QgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgYmUgZXhwb3J0ZWQuXG4gICAgaWYgKHN0bXQubW9kaWZpZXJzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXN0bXQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgZGVjbGFyZSBJVFNfSlVTVF9BTkdVTEFSLlxuICAgIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuc29tZShkZWNsID0+IHtcbiAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBtdXN0IG1hdGNoIHRoZSBuYW1lLlxuICAgICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSB8fCBkZWNsLm5hbWUudGV4dCAhPT0gJ0lUU19KVVNUX0FOR1VMQVInKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEl0IG11c3QgaW5pdGlhbGl6ZSB0aGUgdmFyaWFibGUgdG8gdHJ1ZS5cbiAgICAgIGlmIChkZWNsLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQgfHwgZGVjbC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgZGVmaW5pdGlvbiBtYXRjaGVzLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlICdyM19zeW1ib2xzLnRzJyBmaWxlIGluIHRoZSBnaXZlbiBgUHJvZ3JhbWAsIG9yIHJldHVybiBgbnVsbGAgaWYgaXQgd2Fzbid0IHRoZXJlLlxuICovXG5mdW5jdGlvbiBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbmQoZmlsZSA9PiBmaWxlLmZpbGVOYW1lLmluZGV4T2YoJ3IzX3N5bWJvbHMudHMnKSA+PSAwKSB8fCBudWxsO1xufVxuXG4vKipcbiAqIFNpbmNlIFwic3RyaWN0VGVtcGxhdGVzXCIgaXMgYSB0cnVlIHN1cGVyc2V0IG9mIHR5cGUgY2hlY2tpbmcgY2FwYWJpbGl0aWVzIGNvbXBhcmVkIHRvXG4gKiBcInN0cmljdFRlbXBsYXRlVHlwZUNoZWNrXCIsIGl0IGlzIHJlcXVpcmVkIHRoYXQgdGhlIGxhdHRlciBpcyBub3QgZXhwbGljaXRseSBkaXNhYmxlZCBpZiB0aGVcbiAqIGZvcm1lciBpcyBlbmFibGVkLlxuICovXG5mdW5jdGlvbiB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9ucyhvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyk6IHRzLkRpYWdub3N0aWN8bnVsbCB7XG4gIGlmIChvcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjayA9PT0gZmFsc2UgJiYgb3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXMgPT09IHRydWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIGNvZGU6IG5nRXJyb3JDb2RlKEVycm9yQ29kZS5DT05GSUdfU1RSSUNUX1RFTVBMQVRFU19JTVBMSUVTX0ZVTExfVEVNUExBVEVfVFlQRUNIRUNLKSxcbiAgICAgIGZpbGU6IHVuZGVmaW5lZCxcbiAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgIGBBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbiBcInN0cmljdFRlbXBsYXRlc1wiIGlzIGVuYWJsZWQsIGhvd2V2ZXIgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBkaXNhYmxlZC5cblxuSGF2aW5nIHRoZSBcInN0cmljdFRlbXBsYXRlc1wiIGZsYWcgZW5hYmxlZCBpbXBsaWVzIHRoYXQgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBhbHNvIGVuYWJsZWQsIHNvXG50aGUgbGF0dGVyIGNhbiBub3QgYmUgZXhwbGljaXRseSBkaXNhYmxlZC5cblxuT25lIG9mIHRoZSBmb2xsb3dpbmcgYWN0aW9ucyBpcyByZXF1aXJlZDpcbjEuIFJlbW92ZSB0aGUgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBvcHRpb24uXG4yLiBSZW1vdmUgXCJzdHJpY3RUZW1wbGF0ZXNcIiBvciBzZXQgaXQgdG8gJ2ZhbHNlJy5cblxuTW9yZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBjb21waWxlciBvcHRpb25zIGNhbiBiZSBmb3VuZCBpbiB0aGUgZG9jdW1lbnRhdGlvbjpcbmh0dHBzOi8vdjkuYW5ndWxhci5pby9ndWlkZS90ZW1wbGF0ZS10eXBlY2hlY2sjdGVtcGxhdGUtdHlwZS1jaGVja2luZ2AsXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5jbGFzcyBSZWZlcmVuY2VHcmFwaEFkYXB0ZXIgaW1wbGVtZW50cyBSZWZlcmVuY2VzUmVnaXN0cnkge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGdyYXBoOiBSZWZlcmVuY2VHcmFwaCkge31cblxuICBhZGQoc291cmNlOiB0cy5EZWNsYXJhdGlvbiwgLi4ucmVmZXJlbmNlczogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB7bm9kZX0gb2YgcmVmZXJlbmNlcykge1xuICAgICAgbGV0IHNvdXJjZUZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc291cmNlRmlsZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgcmVjb3JkIGxvY2FsIHJlZmVyZW5jZXMgKG5vdCByZWZlcmVuY2VzIGludG8gLmQudHMgZmlsZXMpLlxuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCB8fCAhaXNEdHNQYXRoKHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgIHRoaXMuZ3JhcGguYWRkKHNvdXJjZSwgbm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4iXX0=