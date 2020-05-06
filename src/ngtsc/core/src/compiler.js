/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/core/src/compiler", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/indexer", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/modulewithproviders", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        function NgCompiler(host, options, tsProgram, typeCheckingProgramStrategy, oldProgram, perfRecorder) {
            var _a;
            var _this = this;
            if (oldProgram === void 0) { oldProgram = null; }
            if (perfRecorder === void 0) { perfRecorder = perf_1.NOOP_PERF_RECORDER; }
            this.host = host;
            this.options = options;
            this.tsProgram = tsProgram;
            this.typeCheckingProgramStrategy = typeCheckingProgramStrategy;
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
            (_a = this.constructionDiagnostics).push.apply(_a, tslib_1.__spread(this.host.diagnostics));
            var incompatibleTypeCheckOptionsDiagnostic = verifyCompatibleTypeCheckOptions(this.options);
            if (incompatibleTypeCheckOptionsDiagnostic !== null) {
                this.constructionDiagnostics.push(incompatibleTypeCheckOptionsDiagnostic);
            }
            this.nextProgram = tsProgram;
            this.closureCompilerEnabled = !!this.options.annotateForClosureCompiler;
            this.entryPoint =
                host.entryPoint !== null ? typescript_1.getSourceFileOrNull(tsProgram, host.entryPoint) : null;
            var moduleResolutionCache = ts.createModuleResolutionCache(this.host.getCurrentDirectory(), function (fileName) { return _this.host.getCanonicalFileName(fileName); });
            this.moduleResolver =
                new imports_1.ModuleResolver(tsProgram, this.options, this.host, moduleResolutionCache);
            this.resourceManager = new resource_1.HostResourceLoader(host, this.options);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(new cycles_1.ImportGraph(this.moduleResolver));
            var modifiedResourceFiles = null;
            if (this.host.getModifiedResourceFiles !== undefined) {
                modifiedResourceFiles = this.host.getModifiedResourceFiles() || null;
            }
            if (oldProgram === null) {
                this.incrementalDriver = incremental_1.IncrementalDriver.fresh(tsProgram);
            }
            else {
                var oldDriver = getIncrementalDriver(oldProgram);
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
            setIncrementalDriver(tsProgram, this.incrementalDriver);
            this.ignoreForDiagnostics =
                new Set(tsProgram.getSourceFiles().filter(function (sf) { return _this.host.isShim(sf); }));
            this.ignoreForEmit = this.host.ignoreForEmit;
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
                    else if (typecheck_1.isTemplateDiagnostic(diag) && diag.componentFile === file) {
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
                var resolvedModule = typescript_1.resolveModuleName(entryPath, containingFile, this.options, this.host, null);
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
            if (this.host.factoryTracker !== null) {
                before.push(shims_1.generatedFactoryTransform(this.host.factoryTracker.sourceInfo, importRewriter));
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
            enumerable: true,
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
            // Execute the typeCheck phase of each decorator in the program.
            var prepSpan = this.perfRecorder.start('typeCheckPrep');
            var results = compilation.templateTypeChecker.refresh();
            this.incrementalDriver.recordSuccessfulTypeCheck(results.perFileData);
            this.perfRecorder.stop(prepSpan);
            // Get the diagnostics.
            var typeCheckSpan = this.perfRecorder.start('typeCheckDiagnostics');
            var diagnostics = [];
            try {
                for (var _b = tslib_1.__values(this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    if (sf.isDeclarationFile || this.host.isShim(sf)) {
                        continue;
                    }
                    diagnostics.push.apply(diagnostics, tslib_1.__spread(compilation.templateTypeChecker.getDiagnosticsForFile(sf)));
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
            setIncrementalDriver(program, this.incrementalDriver);
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
            if (this.host.unifiedModulesHost === null || !this.options._useHostForImportGeneration) {
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
                    localImportStrategy = new imports_1.LogicalProjectStrategy(reflector, new file_system_1.LogicalFileSystem(tslib_1.__spread(this.host.rootDirs), this.host));
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
                    new imports_1.UnifiedModulesStrategy(reflector, this.host.unifiedModulesHost),
                ]);
                aliasingHost = new imports_1.UnifiedModulesAliasingHost(this.host.unifiedModulesHost);
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
                new annotations_1.ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, isCore, this.resourceManager, this.host.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.options.i18nNormalizeLineEndingsInICUs, this.moduleResolver, this.cycleAnalyzer, refEmitter, defaultImportTracker, this.incrementalDriver.depGraph, injectableRegistry, this.closureCompilerEnabled),
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
                new annotations_1.NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, this.host.factoryTracker, defaultImportTracker, this.closureCompilerEnabled, injectableRegistry, this.options.i18nInLocale),
            ];
            var traitCompiler = new transform_1.TraitCompiler(handlers, reflector, this.perfRecorder, this.incrementalDriver, this.options.compileNonExportedClasses !== false, dtsTransforms);
            var templateTypeChecker = new typecheck_1.TemplateTypeChecker(this.tsProgram, this.typeCheckingProgramStrategy, traitCompiler, this.getTypeCheckingConfig(), refEmitter, reflector, this.host, this.incrementalDriver);
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
    /**
     * Find the 'r3_symbols.ts' file in the given `Program`, or return `null` if it wasn't there.
     */
    function getR3SymbolsFile(program) {
        return program.getSourceFiles().find(function (file) { return file.fileName.indexOf('r3_symbols.ts') >= 0; }) || null;
    }
    /**
     * Symbol under which the `IncrementalDriver` is stored on a `ts.Program`.
     *
     * The TS model of incremental compilation is based around reuse of a previous `ts.Program` in the
     * construction of a new one. The `NgCompiler` follows this abstraction - passing in a previous
     * `ts.Program` is sufficient to trigger incremental compilation. This previous `ts.Program` need
     * not be from an Angular compilation (that is, it need not have been created from `NgCompiler`).
     *
     * If it is, though, Angular can benefit from reusing previous analysis work. This reuse is managed
     * by the `IncrementalDriver`, which is inherited from the old program to the new program. To
     * support this behind the API of passing an old `ts.Program`, the `IncrementalDriver` is stored on
     * the `ts.Program` under this symbol.
     */
    var SYM_INCREMENTAL_DRIVER = Symbol('NgIncrementalDriver');
    /**
     * Get an `IncrementalDriver` from the given `ts.Program` if one is present.
     *
     * See `SYM_INCREMENTAL_DRIVER` for more details.
     */
    function getIncrementalDriver(program) {
        var driver = program[SYM_INCREMENTAL_DRIVER];
        if (driver === undefined || !(driver instanceof incremental_1.IncrementalDriver)) {
            return null;
        }
        return driver;
    }
    /**
     * Save the given `IncrementalDriver` onto the given `ts.Program`, for retrieval in a subsequent
     * incremental compilation.
     *
     * See `SYM_INCREMENTAL_DRIVER` for more details.
     */
    function setIncrementalDriver(program, driver) {
        program[SYM_INCREMENTAL_DRIVER] = driver;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUdILCtCQUFpQztJQUVqQywyRUFBK007SUFDL00saUVBQXdEO0lBQ3hELDJFQUF5RDtJQUN6RCwyRUFBeUU7SUFDekUsMkVBQTBFO0lBQzFFLG1FQUErWDtJQUMvWCwyRUFBb0Q7SUFDcEQsbUVBQWtGO0lBQ2xGLHFFQUFtSztJQUNuSywyRkFBcUU7SUFDckUsdUZBQXlEO0lBQ3pELDZEQUE0RDtJQUM1RCx5RUFBMEQ7SUFDMUQscUVBQWtEO0lBQ2xELG1FQUFzRTtJQUN0RSwrREFBMkc7SUFDM0csK0RBQXNEO0lBQ3RELGlFQUFnRDtJQUNoRCx1RUFBK0o7SUFDL0osdUVBQTZJO0lBQzdJLGtGQUE0RjtJQTJCNUY7Ozs7Ozs7Ozs7O09BV0c7SUFDSDtRQWdDRSxvQkFDWSxJQUFvQixFQUFVLE9BQTBCLEVBQ3hELFNBQXFCLEVBQ3JCLDJCQUF3RCxFQUNoRSxVQUFrQyxFQUFVLFlBQStDOztZQUovRixpQkFpREM7WUE3Q0csMkJBQUEsRUFBQSxpQkFBa0M7WUFBVSw2QkFBQSxFQUFBLGVBQTZCLHlCQUFrQjtZQUhuRixTQUFJLEdBQUosSUFBSSxDQUFnQjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQW1CO1lBQ3hELGNBQVMsR0FBVCxTQUFTLENBQVk7WUFDckIsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtZQUNwQixpQkFBWSxHQUFaLFlBQVksQ0FBbUM7WUFuQy9GOzs7O2VBSUc7WUFDSyxnQkFBVyxHQUE4QixJQUFJLENBQUM7WUFFdEQ7Ozs7ZUFJRztZQUNLLDRCQUF1QixHQUFvQixFQUFFLENBQUM7WUFFdEQ7Ozs7ZUFJRztZQUNLLGdCQUFXLEdB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QWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztxQkFDdkQ7b0JBRUQsa0VBQWtFO29CQUNsRSxJQUFJLFVBQVUsS0FBSyxTQUFTLElBQUksQ0FBQyxzQkFBUyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTt3QkFDL0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO3FCQUM5QjtpQkFDRjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQWhCRCxJQWdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5LCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXIsIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi9jeWNsZXMnO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2NoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIFJlZmVyZW5jZUdyYXBofSBmcm9tICcuLi8uLi9lbnRyeV9wb2ludCc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGVPckVycm9yLCBMb2dpY2FsRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5LCBBbGlhc2luZ0hvc3QsIEFsaWFzU3RyYXRlZ3ksIERlZmF1bHRJbXBvcnRUcmFja2VyLCBJbXBvcnRSZXdyaXRlciwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXRTdHJhdGVneSwgUmVmZXJlbmNlRW1pdHRlciwgUmVsYXRpdmVQYXRoU3RyYXRlZ3ksIFVuaWZpZWRNb2R1bGVzQWxpYXNpbmdIb3N0LCBVbmlmaWVkTW9kdWxlc1N0cmF0ZWd5fSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxEcml2ZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsJztcbmltcG9ydCB7Z2VuZXJhdGVBbmFseXNpcywgSW5kZXhlZENvbXBvbmVudCwgSW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7Q29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIExvY2FsTWV0YWRhdGFSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXJ9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXJ9IGZyb20gJy4uLy4uL21vZHVsZXdpdGhwcm92aWRlcnMnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge05PT1BfUEVSRl9SRUNPUkRFUiwgUGVyZlJlY29yZGVyfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7VHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SG9zdFJlc291cmNlTG9hZGVyfSBmcm9tICcuLi8uLi9yZXNvdXJjZSc7XG5pbXBvcnQge2VudHJ5UG9pbnRLZXlGb3IsIE5nTW9kdWxlUm91dGVBbmFseXplcn0gZnJvbSAnLi4vLi4vcm91dGluZyc7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcn0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtfSBmcm9tICcuLi8uLi9zaGltcyc7XG5pbXBvcnQge2l2eVN3aXRjaFRyYW5zZm9ybX0gZnJvbSAnLi4vLi4vc3dpdGNoJztcbmltcG9ydCB7YWxpYXNUcmFuc2Zvcm1GYWN0b3J5LCBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnksIERlY29yYXRvckhhbmRsZXIsIER0c1RyYW5zZm9ybVJlZ2lzdHJ5LCBpdnlUcmFuc2Zvcm1GYWN0b3J5LCBUcmFpdENvbXBpbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtpc1RlbXBsYXRlRGlhZ25vc3RpYywgVGVtcGxhdGVUeXBlQ2hlY2tlciwgVHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNraW5nQ29uZmlnLCBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGVPck51bGwsIGlzRHRzUGF0aCwgcmVzb2x2ZU1vZHVsZU5hbWV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtMYXp5Um91dGUsIE5nQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge05nQ29tcGlsZXJIb3N0fSBmcm9tICcuL2hvc3QnO1xuXG5cblxuLyoqXG4gKiBTdGF0ZSBpbmZvcm1hdGlvbiBhYm91dCBhIGNvbXBpbGF0aW9uIHdoaWNoIGlzIG9ubHkgZ2VuZXJhdGVkIG9uY2Ugc29tZSBkYXRhIGlzIHJlcXVlc3RlZCBmcm9tXG4gKiB0aGUgYE5nQ29tcGlsZXJgIChmb3IgZXhhbXBsZSwgYnkgY2FsbGluZyBgZ2V0RGlhZ25vc3RpY3NgKS5cbiAqL1xuaW50ZXJmYWNlIExhenlDb21waWxhdGlvblN0YXRlIHtcbiAgaXNDb3JlOiBib29sZWFuO1xuICB0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyO1xuICByZWZsZWN0b3I6IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdDtcbiAgbWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXI7XG4gIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeTtcbiAgZXhwb3J0UmVmZXJlbmNlR3JhcGg6IFJlZmVyZW5jZUdyYXBofG51bGw7XG4gIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcjtcbiAgZHRzVHJhbnNmb3JtczogRHRzVHJhbnNmb3JtUmVnaXN0cnk7XG4gIG13cFNjYW5uZXI6IE1vZHVsZVdpdGhQcm92aWRlcnNTY2FubmVyO1xuICBkZWZhdWx0SW1wb3J0VHJhY2tlcjogRGVmYXVsdEltcG9ydFRyYWNrZXI7XG4gIGFsaWFzaW5nSG9zdDogQWxpYXNpbmdIb3N0fG51bGw7XG4gIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXI7XG4gIHRlbXBsYXRlVHlwZUNoZWNrZXI6IFRlbXBsYXRlVHlwZUNoZWNrZXI7XG59XG5cbi8qKlxuICogVGhlIGhlYXJ0IG9mIHRoZSBBbmd1bGFyIEl2eSBjb21waWxlci5cbiAqXG4gKiBUaGUgYE5nQ29tcGlsZXJgIHByb3ZpZGVzIGFuIEFQSSBmb3IgcGVyZm9ybWluZyBBbmd1bGFyIGNvbXBpbGF0aW9uIHdpdGhpbiBhIGN1c3RvbSBUeXBlU2NyaXB0XG4gKiBjb21waWxlci4gRWFjaCBpbnN0YW5jZSBvZiBgTmdDb21waWxlcmAgc3VwcG9ydHMgYSBzaW5nbGUgY29tcGlsYXRpb24sIHdoaWNoIG1pZ2h0IGJlXG4gKiBpbmNyZW1lbnRhbC5cbiAqXG4gKiBgTmdDb21waWxlcmAgaXMgbGF6eSwgYW5kIGRvZXMgbm90IHBlcmZvcm0gYW55IG9mIHRoZSB3b3JrIG9mIHRoZSBjb21waWxhdGlvbiB1bnRpbCBvbmUgb2YgaXRzXG4gKiBvdXRwdXQgbWV0aG9kcyAoZS5nLiBgZ2V0RGlhZ25vc3RpY3NgKSBpcyBjYWxsZWQuXG4gKlxuICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ0NvbXBpbGVyIHtcbiAgLyoqXG4gICAqIExhemlseSBldmFsdWF0ZWQgc3RhdGUgb2YgdGhlIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIGlzIGNyZWF0ZWQgb24gZGVtYW5kIGJ5IGNhbGxpbmcgYGVuc3VyZUFuYWx5emVkYC5cbiAgICovXG4gIHByaXZhdGUgY29tcGlsYXRpb246IExhenlDb21waWxhdGlvblN0YXRlfG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBBbnkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGUgY29uc3RydWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhlc2UgYXJlIGRpYWdub3N0aWNzIHdoaWNoIGFyb3NlIGR1cmluZyBzZXR1cCBvZiB0aGUgaG9zdCBhbmQvb3IgcHJvZ3JhbS5cbiAgICovXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBTZW1hbnRpYyBkaWFnbm9zdGljcyByZWxhdGVkIHRvIHRoZSBwcm9ncmFtIGl0c2VsZi5cbiAgICpcbiAgICogVGhpcyBpcyBzZXQgYnkgKGFuZCBtZW1vaXplcykgYGdldERpYWdub3N0aWNzYC5cbiAgICovXG4gIHByaXZhdGUgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgbmV4dFByb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgZW50cnlQb2ludDogdHMuU291cmNlRmlsZXxudWxsO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEhvc3RSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICByZWFkb25seSBpbmNyZW1lbnRhbERyaXZlcjogSW5jcmVtZW50YWxEcml2ZXI7XG4gIHJlYWRvbmx5IGlnbm9yZUZvckRpYWdub3N0aWNzOiBTZXQ8dHMuU291cmNlRmlsZT47XG4gIHJlYWRvbmx5IGlnbm9yZUZvckVtaXQ6IFNldDx0cy5Tb3VyY2VGaWxlPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaG9zdDogTmdDb21waWxlckhvc3QsIHByaXZhdGUgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnMsXG4gICAgICBwcml2YXRlIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5OiBUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksXG4gICAgICBvbGRQcm9ncmFtOiB0cy5Qcm9ncmFtfG51bGwgPSBudWxsLCBwcml2YXRlIHBlcmZSZWNvcmRlcjogUGVyZlJlY29yZGVyID0gTk9PUF9QRVJGX1JFQ09SREVSKSB7XG4gICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMuaG9zdC5kaWFnbm9zdGljcyk7XG4gICAgY29uc3QgaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMgPSB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9ucyh0aGlzLm9wdGlvbnMpO1xuICAgIGlmIChpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljKTtcbiAgICB9XG5cbiAgICB0aGlzLm5leHRQcm9ncmFtID0gdHNQcm9ncmFtO1xuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhdGhpcy5vcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID1cbiAgICAgICAgaG9zdC5lbnRyeVBvaW50ICE9PSBudWxsID8gZ2V0U291cmNlRmlsZU9yTnVsbCh0c1Byb2dyYW0sIGhvc3QuZW50cnlQb2ludCkgOiBudWxsO1xuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x1dGlvbkNhY2hlID0gdHMuY3JlYXRlTW9kdWxlUmVzb2x1dGlvbkNhY2hlKFxuICAgICAgICB0aGlzLmhvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpLCBmaWxlTmFtZSA9PiB0aGlzLmhvc3QuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpKTtcbiAgICB0aGlzLm1vZHVsZVJlc29sdmVyID1cbiAgICAgICAgbmV3IE1vZHVsZVJlc29sdmVyKHRzUHJvZ3JhbSwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QsIG1vZHVsZVJlc29sdXRpb25DYWNoZSk7XG4gICAgdGhpcy5yZXNvdXJjZU1hbmFnZXIgPSBuZXcgSG9zdFJlc291cmNlTG9hZGVyKGhvc3QsIHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5jeWNsZUFuYWx5emVyID0gbmV3IEN5Y2xlQW5hbHl6ZXIobmV3IEltcG9ydEdyYXBoKHRoaXMubW9kdWxlUmVzb2x2ZXIpKTtcblxuICAgIGxldCBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+fG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9IHRoaXMuaG9zdC5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMoKSB8fCBudWxsO1xuICAgIH1cblxuICAgIGlmIChvbGRQcm9ncmFtID09PSBudWxsKSB7XG4gICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyID0gSW5jcmVtZW50YWxEcml2ZXIuZnJlc2godHNQcm9ncmFtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgb2xkRHJpdmVyID0gZ2V0SW5jcmVtZW50YWxEcml2ZXIob2xkUHJvZ3JhbSk7XG4gICAgICBpZiAob2xkRHJpdmVyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIgPVxuICAgICAgICAgICAgSW5jcmVtZW50YWxEcml2ZXIucmVjb25jaWxlKG9sZFByb2dyYW0sIG9sZERyaXZlciwgdHNQcm9ncmFtLCBtb2RpZmllZFJlc291cmNlRmlsZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQSBwcmV2aW91cyB0cy5Qcm9ncmFtIHdhcyB1c2VkIHRvIGNyZWF0ZSB0aGUgY3VycmVudCBvbmUsIGJ1dCBpdCB3YXNuJ3QgZnJvbSBhblxuICAgICAgICAvLyBgTmdDb21waWxlcmAuIFRoYXQgZG9lc24ndCBodXJ0IGFueXRoaW5nLCBidXQgdGhlIEFuZ3VsYXIgYW5hbHlzaXMgd2lsbCBoYXZlIHRvIHN0YXJ0XG4gICAgICAgIC8vIGZyb20gYSBmcmVzaCBzdGF0ZS5cbiAgICAgICAgdGhpcy5pbmNyZW1lbnRhbERyaXZlciA9IEluY3JlbWVudGFsRHJpdmVyLmZyZXNoKHRzUHJvZ3JhbSk7XG4gICAgICB9XG4gICAgfVxuICAgIHNldEluY3JlbWVudGFsRHJpdmVyKHRzUHJvZ3JhbSwgdGhpcy5pbmNyZW1lbnRhbERyaXZlcik7XG5cbiAgICB0aGlzLmlnbm9yZUZvckRpYWdub3N0aWNzID1cbiAgICAgICAgbmV3IFNldCh0c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gdGhpcy5ob3N0LmlzU2hpbShzZikpKTtcblxuICAgIHRoaXMuaWdub3JlRm9yRW1pdCA9IHRoaXMuaG9zdC5pZ25vcmVGb3JFbWl0O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgQW5ndWxhci1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBJZiBhIGB0cy5Tb3VyY2VGaWxlYCBpcyBwYXNzZWQsIG9ubHkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGF0IGZpbGUgYXJlIHJldHVybmVkLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3MoZmlsZT86IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGlmICh0aGlzLmRpYWdub3N0aWNzID09PSBudWxsKSB7XG4gICAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICAgIHRoaXMuZGlhZ25vc3RpY3MgPVxuICAgICAgICAgIFsuLi5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmRpYWdub3N0aWNzLCAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKV07XG4gICAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuZGlhZ25vc3RpY3MucHVzaCguLi5jaGVja0ZvclByaXZhdGVFeHBvcnRzKFxuICAgICAgICAgICAgdGhpcy5lbnRyeVBvaW50LCB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCBjb21waWxhdGlvbi5leHBvcnRSZWZlcmVuY2VHcmFwaCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0aGlzLmRpYWdub3N0aWNzO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5kaWFnbm9zdGljcy5maWx0ZXIoZGlhZyA9PiB7XG4gICAgICAgIGlmIChkaWFnLmZpbGUgPT09IGZpbGUpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1RlbXBsYXRlRGlhZ25vc3RpYyhkaWFnKSAmJiBkaWFnLmNvbXBvbmVudEZpbGUgPT09IGZpbGUpIHtcbiAgICAgICAgICAvLyBUZW1wbGF0ZSBkaWFnbm9zdGljcyBhcmUgcmVwb3J0ZWQgd2hlbiBkaWFnbm9zdGljcyBmb3IgdGhlIGNvbXBvbmVudCBmaWxlIGFyZVxuICAgICAgICAgIC8vIHJlcXVlc3RlZCAoc2luY2Ugbm8gY29uc3VtZXIgb2YgYGdldERpYWdub3N0aWNzYCB3b3VsZCBldmVyIGFzayBmb3IgZGlhZ25vc3RpY3MgZnJvbVxuICAgICAgICAgIC8vIHRoZSBmYWtlIHRzLlNvdXJjZUZpbGUgZm9yIHRlbXBsYXRlcykuXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBzZXR1cC1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgZ2V0T3B0aW9uRGlhZ25vc3RpY3MoKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGB0cy5Qcm9ncmFtYCB0byB1c2UgYXMgYSBzdGFydGluZyBwb2ludCB3aGVuIHNwYXduaW5nIGEgc3Vic2VxdWVudCBpbmNyZW1lbnRhbFxuICAgKiBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhlIGBOZ0NvbXBpbGVyYCBzcGF3bnMgYW4gaW50ZXJuYWwgaW5jcmVtZW50YWwgVHlwZVNjcmlwdCBjb21waWxhdGlvbiAoaW5oZXJpdGluZyB0aGVcbiAgICogY29uc3VtZXIncyBgdHMuUHJvZ3JhbWAgaW50byBhIG5ldyBvbmUgZm9yIHRoZSBwdXJwb3NlcyBvZiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nKS4gQWZ0ZXIgdGhpc1xuICAgKiBvcGVyYXRpb24sIHRoZSBjb25zdW1lcidzIGB0cy5Qcm9ncmFtYCBpcyBubyBsb25nZXIgdXNhYmxlIGZvciBzdGFydGluZyBhIG5ldyBpbmNyZW1lbnRhbFxuICAgKiBjb21waWxhdGlvbi4gYGdldE5leHRQcm9ncmFtYCByZXRyaWV2ZXMgdGhlIGB0cy5Qcm9ncmFtYCB3aGljaCBjYW4gYmUgdXNlZCBpbnN0ZWFkLlxuICAgKi9cbiAgZ2V0TmV4dFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMubmV4dFByb2dyYW07XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBBbmd1bGFyJ3MgYW5hbHlzaXMgc3RlcCAoYXMgYSBwcmVjdXJzb3IgdG8gYGdldERpYWdub3N0aWNzYCBvciBgcHJlcGFyZUVtaXRgKVxuICAgKiBhc3luY2hyb25vdXNseS5cbiAgICpcbiAgICogTm9ybWFsbHksIHRoaXMgb3BlcmF0aW9uIGhhcHBlbnMgbGF6aWx5IHdoZW5ldmVyIGBnZXREaWFnbm9zdGljc2Agb3IgYHByZXBhcmVFbWl0YCBhcmUgY2FsbGVkLlxuICAgKiBIb3dldmVyLCBjZXJ0YWluIGNvbnN1bWVycyBtYXkgd2lzaCB0byBhbGxvdyBmb3IgYW4gYXN5bmNocm9ub3VzIHBoYXNlIG9mIGFuYWx5c2lzLCB3aGVyZVxuICAgKiByZXNvdXJjZXMgc3VjaCBhcyBgc3R5bGVVcmxzYCBhcmUgcmVzb2x2ZWQgYXN5bmNob25vdXNseS4gSW4gdGhlc2UgY2FzZXMgYGFuYWx5emVBc3luY2AgbXVzdCBiZVxuICAgKiBjYWxsZWQgZmlyc3QsIGFuZCBpdHMgYFByb21pc2VgIGF3YWl0ZWQgcHJpb3IgdG8gY2FsbGluZyBhbnkgb3RoZXIgQVBJcyBvZiBgTmdDb21waWxlcmAuXG4gICAqL1xuICBhc3luYyBhbmFseXplQXN5bmMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gIT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG5cbiAgICBjb25zdCBhbmFseXplU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplJyk7XG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhbmFseXplRmlsZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZUZpbGUnLCBzZik7XG4gICAgICBsZXQgYW5hbHlzaXNQcm9taXNlID0gdGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmFuYWx5emVBc3luYyhzZik7XG4gICAgICB0aGlzLnNjYW5Gb3JNd3Aoc2YpO1xuICAgICAgaWYgKGFuYWx5c2lzUHJvbWlzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5wZXJmUmVjb3JkZXIuZW5hYmxlZCkge1xuICAgICAgICBhbmFseXNpc1Byb21pc2UgPSBhbmFseXNpc1Byb21pc2UudGhlbigoKSA9PiB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVGaWxlU3BhbikpO1xuICAgICAgfVxuICAgICAgaWYgKGFuYWx5c2lzUHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHByb21pc2VzLnB1c2goYW5hbHlzaXNQcm9taXNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVTcGFuKTtcblxuICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlcik7XG4gIH1cblxuICAvKipcbiAgICogTGlzdCBsYXp5IHJvdXRlcyBkZXRlY3RlZCBkdXJpbmcgYW5hbHlzaXMuXG4gICAqXG4gICAqIFRoaXMgY2FuIGJlIGNhbGxlZCBmb3Igb25lIHNwZWNpZmljIHJvdXRlLCBvciB0byByZXRyaWV2ZSBhbGwgdG9wLWxldmVsIHJvdXRlcy5cbiAgICovXG4gIGxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGU/OiBzdHJpbmcpOiBMYXp5Um91dGVbXSB7XG4gICAgaWYgKGVudHJ5Um91dGUpIHtcbiAgICAgIC8vIE5vdGU6XG4gICAgICAvLyBUaGlzIHJlc29sdXRpb24gc3RlcCBpcyBoZXJlIHRvIG1hdGNoIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgb2xkIGBBb3RDb21waWxlckhvc3RgIChzZWVcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvYmxvYi81MDczMmUxNTYvcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvY29tcGlsZXJfaG9zdC50cyNMMTc1LUwxODgpLlxuICAgICAgLy9cbiAgICAgIC8vIGBAYW5ndWxhci9jbGlgIHdpbGwgYWx3YXlzIGNhbGwgdGhpcyBBUEkgd2l0aCBhbiBhYnNvbHV0ZSBwYXRoLCBzbyB0aGUgcmVzb2x1dGlvbiBzdGVwIGlzXG4gICAgICAvLyBub3QgbmVjZXNzYXJ5LCBidXQga2VlcGluZyBpdCBiYWNrd2FyZHMgY29tcGF0aWJsZSBpbiBjYXNlIHNvbWVvbmUgZWxzZSBpcyB1c2luZyB0aGUgQVBJLlxuXG4gICAgICAvLyBSZWxhdGl2ZSBlbnRyeSBwYXRocyBhcmUgZGlzYWxsb3dlZC5cbiAgICAgIGlmIChlbnRyeVJvdXRlLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBsaXN0IGxhenkgcm91dGVzOiBSZXNvbHV0aW9uIG9mIHJlbGF0aXZlIHBhdGhzICgke1xuICAgICAgICAgICAgZW50cnlSb3V0ZX0pIGlzIG5vdCBzdXBwb3J0ZWQuYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vbi1yZWxhdGl2ZSBlbnRyeSBwYXRocyBmYWxsIGludG8gb25lIG9mIHRoZSBmb2xsb3dpbmcgY2F0ZWdvcmllczpcbiAgICAgIC8vIC0gQWJzb2x1dGUgc3lzdGVtIHBhdGhzIChlLmcuIGAvZm9vL2Jhci9teS1wcm9qZWN0L215LW1vZHVsZWApLCB3aGljaCBhcmUgdW5hZmZlY3RlZCBieSB0aGVcbiAgICAgIC8vICAgbG9naWMgYmVsb3cuXG4gICAgICAvLyAtIFBhdGhzIHRvIGVudGVybmFsIG1vZHVsZXMgKGUuZy4gYHNvbWUtbGliYCkuXG4gICAgICAvLyAtIFBhdGhzIG1hcHBlZCB0byBkaXJlY3RvcmllcyBpbiBgdHNjb25maWcuanNvbmAgKGUuZy4gYHNoYXJlZC9teS1tb2R1bGVgKS5cbiAgICAgIC8vICAgKFNlZSBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9tb2R1bGUtcmVzb2x1dGlvbi5odG1sI3BhdGgtbWFwcGluZy4pXG4gICAgICAvL1xuICAgICAgLy8gSW4gYWxsIGNhc2VzIGFib3ZlLCB0aGUgYGNvbnRhaW5pbmdGaWxlYCBhcmd1bWVudCBpcyBpZ25vcmVkLCBzbyB3ZSBjYW4ganVzdCB0YWtlIHRoZSBmaXJzdFxuICAgICAgLy8gb2YgdGhlIHJvb3QgZmlsZXMuXG4gICAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IHRoaXMudHNQcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKVswXTtcbiAgICAgIGNvbnN0IFtlbnRyeVBhdGgsIG1vZHVsZU5hbWVdID0gZW50cnlSb3V0ZS5zcGxpdCgnIycpO1xuICAgICAgY29uc3QgcmVzb2x2ZWRNb2R1bGUgPVxuICAgICAgICAgIHJlc29sdmVNb2R1bGVOYW1lKGVudHJ5UGF0aCwgY29udGFpbmluZ0ZpbGUsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0LCBudWxsKTtcblxuICAgICAgaWYgKHJlc29sdmVkTW9kdWxlKSB7XG4gICAgICAgIGVudHJ5Um91dGUgPSBlbnRyeVBvaW50S2V5Rm9yKHJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUsIG1vZHVsZU5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIHJldHVybiBjb21waWxhdGlvbi5yb3V0ZUFuYWx5emVyLmxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZldGNoIHRyYW5zZm9ybWVycyBhbmQgb3RoZXIgaW5mb3JtYXRpb24gd2hpY2ggaXMgbmVjZXNzYXJ5IGZvciBhIGNvbnN1bWVyIHRvIGBlbWl0YCB0aGVcbiAgICogcHJvZ3JhbSB3aXRoIEFuZ3VsYXItYWRkZWQgZGVmaW5pdGlvbnMuXG4gICAqL1xuICBwcmVwYXJlRW1pdCgpOiB7XG4gICAgdHJhbnNmb3JtZXJzOiB0cy5DdXN0b21UcmFuc2Zvcm1lcnMsXG4gIH0ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgY29uc3QgY29yZUltcG9ydHNGcm9tID0gY29tcGlsYXRpb24uaXNDb3JlID8gZ2V0UjNTeW1ib2xzRmlsZSh0aGlzLnRzUHJvZ3JhbSkgOiBudWxsO1xuICAgIGxldCBpbXBvcnRSZXdyaXRlcjogSW1wb3J0UmV3cml0ZXI7XG4gICAgaWYgKGNvcmVJbXBvcnRzRnJvbSAhPT0gbnVsbCkge1xuICAgICAgaW1wb3J0UmV3cml0ZXIgPSBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIoY29yZUltcG9ydHNGcm9tLmZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW1wb3J0UmV3cml0ZXIgPSBuZXcgTm9vcEltcG9ydFJld3JpdGVyKCk7XG4gICAgfVxuXG4gICAgY29uc3QgYmVmb3JlID0gW1xuICAgICAgaXZ5VHJhbnNmb3JtRmFjdG9yeShcbiAgICAgICAgICBjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLCBjb21waWxhdGlvbi5yZWZsZWN0b3IsIGltcG9ydFJld3JpdGVyLFxuICAgICAgICAgIGNvbXBpbGF0aW9uLmRlZmF1bHRJbXBvcnRUcmFja2VyLCBjb21waWxhdGlvbi5pc0NvcmUsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCksXG4gICAgICBhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24udHJhaXRDb21waWxlci5leHBvcnRTdGF0ZW1lbnRzKSxcbiAgICAgIGNvbXBpbGF0aW9uLmRlZmF1bHRJbXBvcnRUcmFja2VyLmltcG9ydFByZXNlcnZpbmdUcmFuc2Zvcm1lcigpLFxuICAgIF07XG5cbiAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uczogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+W10gPSBbXTtcbiAgICBpZiAoY29tcGlsYXRpb24uZHRzVHJhbnNmb3JtcyAhPT0gbnVsbCkge1xuICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnMucHVzaChcbiAgICAgICAgICBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24uZHRzVHJhbnNmb3JtcywgaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IGFkZCBhbGlhc2luZyByZS1leHBvcnRzIHRvIHRoZSAuZC50cyBvdXRwdXQgaWYgdGhlIGBBbGlhc2luZ0hvc3RgIHJlcXVlc3RzIGl0LlxuICAgIGlmIChjb21waWxhdGlvbi5hbGlhc2luZ0hvc3QgIT09IG51bGwgJiYgY29tcGlsYXRpb24uYWxpYXNpbmdIb3N0LmFsaWFzRXhwb3J0c0luRHRzKSB7XG4gICAgICBhZnRlckRlY2xhcmF0aW9ucy5wdXNoKGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmV4cG9ydFN0YXRlbWVudHMpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ob3N0LmZhY3RvcnlUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICBiZWZvcmUucHVzaChnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtKHRoaXMuaG9zdC5mYWN0b3J5VHJhY2tlci5zb3VyY2VJbmZvLCBpbXBvcnRSZXdyaXRlcikpO1xuICAgIH1cbiAgICBiZWZvcmUucHVzaChpdnlTd2l0Y2hUcmFuc2Zvcm0pO1xuXG4gICAgcmV0dXJuIHt0cmFuc2Zvcm1lcnM6IHtiZWZvcmUsIGFmdGVyRGVjbGFyYXRpb25zfSBhcyB0cy5DdXN0b21UcmFuc2Zvcm1lcnN9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1biB0aGUgaW5kZXhpbmcgcHJvY2VzcyBhbmQgcmV0dXJuIGEgYE1hcGAgb2YgYWxsIGluZGV4ZWQgY29tcG9uZW50cy5cbiAgICpcbiAgICogU2VlIHRoZSBgaW5kZXhpbmdgIHBhY2thZ2UgZm9yIG1vcmUgZGV0YWlscy5cbiAgICovXG4gIGdldEluZGV4ZWRDb21wb25lbnRzKCk6IE1hcDx0cy5EZWNsYXJhdGlvbiwgSW5kZXhlZENvbXBvbmVudD4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBuZXcgSW5kZXhpbmdDb250ZXh0KCk7XG4gICAgY29tcGlsYXRpb24udHJhaXRDb21waWxlci5pbmRleChjb250ZXh0KTtcbiAgICByZXR1cm4gZ2VuZXJhdGVBbmFseXNpcyhjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQW5hbHl6ZWQodGhpczogTmdDb21waWxlcik6IExhenlDb21waWxhdGlvblN0YXRlIHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5hbmFseXplU3luYygpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxhdGlvbiE7XG4gIH1cblxuICBwcml2YXRlIGFuYWx5emVTeW5jKCk6IHZvaWQge1xuICAgIGNvbnN0IGFuYWx5emVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emUnKTtcbiAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcbiAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGFuYWx5emVGaWxlU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplRmlsZScsIHNmKTtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplU3luYyhzZik7XG4gICAgICB0aGlzLnNjYW5Gb3JNd3Aoc2YpO1xuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplRmlsZVNwYW4pO1xuICAgIH1cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVTcGFuKTtcblxuICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlcik7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVDb21waWxhdGlvbih0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgdHJhaXRDb21waWxlci5yZXNvbHZlKCk7XG5cbiAgICB0aGlzLnJlY29yZE5nTW9kdWxlU2NvcGVEZXBlbmRlbmNpZXMoKTtcblxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIGFuYWx5c2lzIGlzIGNvbXBsZXRlIGFuZCB0aGUgY29tcGlsZXIgY2FuIG5vdyBjYWxjdWxhdGUgd2hpY2ggZmlsZXMgbmVlZCB0b1xuICAgIC8vIGJlIGVtaXR0ZWQsIHNvIGRvIHRoYXQuXG4gICAgdGhpcy5pbmNyZW1lbnRhbERyaXZlci5yZWNvcmRTdWNjZXNzZnVsQW5hbHlzaXModHJhaXRDb21waWxlcik7XG4gIH1cblxuICBwcml2YXRlIGdldCBmdWxsVGVtcGxhdGVUeXBlQ2hlY2soKTogYm9vbGVhbiB7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBzdHJpY3RuZXNzIGxldmVsIG9mIHR5cGUgY2hlY2tpbmcgYmFzZWQgb24gY29tcGlsZXIgb3B0aW9ucy4gQXNcbiAgICAvLyBgc3RyaWN0VGVtcGxhdGVzYCBpcyBhIHN1cGVyc2V0IG9mIGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgLCB0aGUgZm9ybWVyIGltcGxpZXMgdGhlIGxhdHRlci5cbiAgICAvLyBBbHNvIHNlZSBgdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNgIHdoZXJlIGl0IGlzIHZlcmlmaWVkIHRoYXQgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2BcbiAgICAvLyBpcyBub3QgZGlzYWJsZWQgd2hlbiBgc3RyaWN0VGVtcGxhdGVzYCBpcyBlbmFibGVkLlxuICAgIGNvbnN0IHN0cmljdFRlbXBsYXRlcyA9ICEhdGhpcy5vcHRpb25zLnN0cmljdFRlbXBsYXRlcztcbiAgICByZXR1cm4gc3RyaWN0VGVtcGxhdGVzIHx8ICEhdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHlwZUNoZWNraW5nQ29uZmlnKCk6IFR5cGVDaGVja2luZ0NvbmZpZyB7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBzdHJpY3RuZXNzIGxldmVsIG9mIHR5cGUgY2hlY2tpbmcgYmFzZWQgb24gY29tcGlsZXIgb3B0aW9ucy4gQXNcbiAgICAvLyBgc3RyaWN0VGVtcGxhdGVzYCBpcyBhIHN1cGVyc2V0IG9mIGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgLCB0aGUgZm9ybWVyIGltcGxpZXMgdGhlIGxhdHRlci5cbiAgICAvLyBBbHNvIHNlZSBgdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNgIHdoZXJlIGl0IGlzIHZlcmlmaWVkIHRoYXQgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2BcbiAgICAvLyBpcyBub3QgZGlzYWJsZWQgd2hlbiBgc3RyaWN0VGVtcGxhdGVzYCBpcyBlbmFibGVkLlxuICAgIGNvbnN0IHN0cmljdFRlbXBsYXRlcyA9ICEhdGhpcy5vcHRpb25zLnN0cmljdFRlbXBsYXRlcztcblxuICAgIC8vIEZpcnN0IHNlbGVjdCBhIHR5cGUtY2hlY2tpbmcgY29uZmlndXJhdGlvbiwgYmFzZWQgb24gd2hldGhlciBmdWxsIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgaXNcbiAgICAvLyByZXF1ZXN0ZWQuXG4gICAgbGV0IHR5cGVDaGVja2luZ0NvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnO1xuICAgIGlmICh0aGlzLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiB0cnVlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIEV2ZW4gaW4gZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIERPTSBiaW5kaW5nIGNoZWNrcyBhcmUgbm90IHF1aXRlIHJlYWR5IHlldC5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIENoZWNraW5nIG9mIERPTSBldmVudHMgY3VycmVudGx5IGhhcyBhbiBhZHZlcnNlIGVmZmVjdCBvbiBkZXZlbG9wZXIgZXhwZXJpZW5jZSxcbiAgICAgICAgLy8gZS5nLiBmb3IgYDxpbnB1dCAoYmx1cik9XCJ1cGRhdGUoJGV2ZW50LnRhcmdldC52YWx1ZSlcIj5gIGVuYWJsaW5nIHRoaXMgY2hlY2sgcmVzdWx0cyBpbjpcbiAgICAgICAgLy8gLSBlcnJvciBUUzI1MzE6IE9iamVjdCBpcyBwb3NzaWJseSAnbnVsbCcuXG4gICAgICAgIC8vIC0gZXJyb3IgVFMyMzM5OiBQcm9wZXJ0eSAndmFsdWUnIGRvZXMgbm90IGV4aXN0IG9uIHR5cGUgJ0V2ZW50VGFyZ2V0Jy5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIE5vbi1ET00gcmVmZXJlbmNlcyBoYXZlIHRoZSBjb3JyZWN0IHR5cGUgaW4gVmlldyBFbmdpbmUgc28gdGhlcmUgaXMgbm8gc3RyaWN0bmVzcyBmbGFnLlxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IHRydWUsXG4gICAgICAgIC8vIFBpcGVzIGFyZSBjaGVja2VkIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogdHJ1ZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICB1c2VDb250ZXh0R2VuZXJpY1R5cGU6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgc3RyaWN0TGl0ZXJhbFR5cGVzOiB0cnVlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogZmFsc2UsXG4gICAgICAgIGNoZWNrUXVlcmllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVGVtcGxhdGVCb2RpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBzdHJpY3ROdWxsSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQXR0cmlidXRlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZlBpcGVzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogZmFsc2UsXG4gICAgICAgIHVzZUNvbnRleHRHZW5lcmljVHlwZTogZmFsc2UsXG4gICAgICAgIHN0cmljdExpdGVyYWxUeXBlczogZmFsc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEFwcGx5IGV4cGxpY2l0bHkgY29uZmlndXJlZCBzdHJpY3RuZXNzIGZsYWdzIG9uIHRvcCBvZiB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgLy8gYmFzZWQgb24gXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIi5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzID0gdGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbElucHV0VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzID0gdGhpcy5vcHRpb25zLnN0cmljdE51bGxJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXM7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3REb21FdmVudFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkRvbUV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3REb21FdmVudFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3REb21Mb2NhbFJlZlR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkRvbVJlZmVyZW5jZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0RG9tTG9jYWxSZWZUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RBdHRyaWJ1dGVUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzID0gdGhpcy5vcHRpb25zLnN0cmljdEF0dHJpYnV0ZVR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdENvbnRleHRHZW5lcmljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcudXNlQ29udGV4dEdlbmVyaWNUeXBlID0gdGhpcy5vcHRpb25zLnN0cmljdENvbnRleHRHZW5lcmljcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RMaXRlcmFsVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdExpdGVyYWxUeXBlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RMaXRlcmFsVHlwZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHR5cGVDaGVja2luZ0NvbmZpZztcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICAvLyBTa2lwIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgaWYgaXQncyBkaXNhYmxlZC5cbiAgICBpZiAodGhpcy5vcHRpb25zLml2eVRlbXBsYXRlVHlwZUNoZWNrID09PSBmYWxzZSAmJiAhdGhpcy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIC8vIEV4ZWN1dGUgdGhlIHR5cGVDaGVjayBwaGFzZSBvZiBlYWNoIGRlY29yYXRvciBpbiB0aGUgcHJvZ3JhbS5cbiAgICBjb25zdCBwcmVwU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCd0eXBlQ2hlY2tQcmVwJyk7XG4gICAgY29uc3QgcmVzdWx0cyA9IGNvbXBpbGF0aW9uLnRlbXBsYXRlVHlwZUNoZWNrZXIucmVmcmVzaCgpO1xuICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIucmVjb3JkU3VjY2Vzc2Z1bFR5cGVDaGVjayhyZXN1bHRzLnBlckZpbGVEYXRhKTtcbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKHByZXBTcGFuKTtcblxuICAgIC8vIEdldCB0aGUgZGlhZ25vc3RpY3MuXG4gICAgY29uc3QgdHlwZUNoZWNrU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCd0eXBlQ2hlY2tEaWFnbm9zdGljcycpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSB8fCB0aGlzLmhvc3QuaXNTaGltKHNmKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yRmlsZShzZikpO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnR5cGVDaGVja2luZ1Byb2dyYW1TdHJhdGVneS5nZXRQcm9ncmFtKCk7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcCh0eXBlQ2hlY2tTcGFuKTtcbiAgICBzZXRJbmNyZW1lbnRhbERyaXZlcihwcm9ncmFtLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyKTtcbiAgICB0aGlzLm5leHRQcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWlmaWVzIHRoZSBpbnRlci1kZXBlbmRlbmNpZXMgb2YgTmdNb2R1bGVzIGFuZCB0aGUgY29tcG9uZW50cyB3aXRoaW4gdGhlaXIgY29tcGlsYXRpb24gc2NvcGVzXG4gICAqIGludG8gdGhlIGBJbmNyZW1lbnRhbERyaXZlcmAncyBkZXBlbmRlbmN5IGdyYXBoLlxuICAgKi9cbiAgcHJpdmF0ZSByZWNvcmROZ01vZHVsZVNjb3BlRGVwZW5kZW5jaWVzKCkge1xuICAgIGNvbnN0IHJlY29yZFNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgncmVjb3JkRGVwZW5kZW5jaWVzJyk7XG4gICAgY29uc3QgZGVwR3JhcGggPSB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmRlcEdyYXBoO1xuXG4gICAgZm9yIChjb25zdCBzY29wZSBvZiB0aGlzLmNvbXBpbGF0aW9uIS5zY29wZVJlZ2lzdHJ5IS5nZXRDb21waWxhdGlvblNjb3BlcygpKSB7XG4gICAgICBjb25zdCBmaWxlID0gc2NvcGUuZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgY29uc3QgbmdNb2R1bGVGaWxlID0gc2NvcGUubmdNb2R1bGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgICAvLyBBIGNoYW5nZSB0byBhbnkgZGVwZW5kZW5jeSBvZiB0aGUgZGVjbGFyYXRpb24gY2F1c2VzIHRoZSBkZWNsYXJhdGlvbiB0byBiZSBpbnZhbGlkYXRlZCxcbiAgICAgIC8vIHdoaWNoIHJlcXVpcmVzIHRoZSBOZ01vZHVsZSB0byBiZSBpbnZhbGlkYXRlZCBhcyB3ZWxsLlxuICAgICAgZGVwR3JhcGguYWRkVHJhbnNpdGl2ZURlcGVuZGVuY3kobmdNb2R1bGVGaWxlLCBmaWxlKTtcblxuICAgICAgLy8gQSBjaGFuZ2UgdG8gdGhlIE5nTW9kdWxlIGZpbGUgc2hvdWxkIGNhdXNlIHRoZSBkZWNsYXJhdGlvbiBpdHNlbGYgdG8gYmUgaW52YWxpZGF0ZWQuXG4gICAgICBkZXBHcmFwaC5hZGREZXBlbmRlbmN5KGZpbGUsIG5nTW9kdWxlRmlsZSk7XG5cbiAgICAgIGNvbnN0IG1ldGEgPVxuICAgICAgICAgIHRoaXMuY29tcGlsYXRpb24hLm1ldGFSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEobmV3IFJlZmVyZW5jZShzY29wZS5kZWNsYXJhdGlvbikpO1xuICAgICAgaWYgKG1ldGEgIT09IG51bGwgJiYgbWV0YS5pc0NvbXBvbmVudCkge1xuICAgICAgICAvLyBJZiBhIGNvbXBvbmVudCdzIHRlbXBsYXRlIGNoYW5nZXMsIGl0IG1pZ2h0IGhhdmUgYWZmZWN0ZWQgdGhlIGltcG9ydCBncmFwaCwgYW5kIHRodXMgdGhlXG4gICAgICAgIC8vIHJlbW90ZSBzY29waW5nIGZlYXR1cmUgd2hpY2ggaXMgYWN0aXZhdGVkIGluIHRoZSBldmVudCBvZiBwb3RlbnRpYWwgaW1wb3J0IGN5Y2xlcy4gVGh1cyxcbiAgICAgICAgLy8gdGhlIG1vZHVsZSBkZXBlbmRzIG5vdCBvbmx5IG9uIHRoZSB0cmFuc2l0aXZlIGRlcGVuZGVuY2llcyBvZiB0aGUgY29tcG9uZW50LCBidXQgb24gaXRzXG4gICAgICAgIC8vIHJlc291cmNlcyBhcyB3ZWxsLlxuICAgICAgICBkZXBHcmFwaC5hZGRUcmFuc2l0aXZlUmVzb3VyY2VzKG5nTW9kdWxlRmlsZSwgZmlsZSk7XG5cbiAgICAgICAgLy8gQSBjaGFuZ2UgdG8gYW55IGRpcmVjdGl2ZS9waXBlIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBzaG91bGQgY2F1c2UgdGhlIGNvbXBvbmVudCB0byBiZVxuICAgICAgICAvLyBpbnZhbGlkYXRlZC5cbiAgICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2Ygc2NvcGUuZGlyZWN0aXZlcykge1xuICAgICAgICAgIC8vIFdoZW4gYSBkaXJlY3RpdmUgaW4gc2NvcGUgaXMgdXBkYXRlZCwgdGhlIGNvbXBvbmVudCBuZWVkcyB0byBiZSByZWNvbXBpbGVkIGFzIGUuZy4gYVxuICAgICAgICAgIC8vIHNlbGVjdG9yIG1heSBoYXZlIGNoYW5nZWQuXG4gICAgICAgICAgZGVwR3JhcGguYWRkVHJhbnNpdGl2ZURlcGVuZGVuY3koZmlsZSwgZGlyZWN0aXZlLnJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBwaXBlIG9mIHNjb3BlLnBpcGVzKSB7XG4gICAgICAgICAgLy8gV2hlbiBhIHBpcGUgaW4gc2NvcGUgaXMgdXBkYXRlZCwgdGhlIGNvbXBvbmVudCBuZWVkcyB0byBiZSByZWNvbXBpbGVkIGFzIGUuZy4gdGhlXG4gICAgICAgICAgLy8gcGlwZSdzIG5hbWUgbWF5IGhhdmUgY2hhbmdlZC5cbiAgICAgICAgICBkZXBHcmFwaC5hZGRUcmFuc2l0aXZlRGVwZW5kZW5jeShmaWxlLCBwaXBlLnJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb21wb25lbnRzIGRlcGVuZCBvbiB0aGUgZW50aXJlIGV4cG9ydCBzY29wZS4gSW4gYWRkaXRpb24gdG8gdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgb25cbiAgICAgICAgLy8gYWxsIGRpcmVjdGl2ZXMvcGlwZXMgaW4gdGhlIGV4cG9ydCBzY29wZSwgdGhleSBhbHNvIGRlcGVuZCBvbiBldmVyeSBOZ01vZHVsZSBpbiB0aGVcbiAgICAgICAgLy8gc2NvcGUsIGFzIGNoYW5nZXMgdG8gYSBtb2R1bGUgbWF5IGFkZCBuZXcgZGlyZWN0aXZlcy9waXBlcyB0byB0aGUgc2NvcGUuXG4gICAgICAgIGZvciAoY29uc3QgZGVwTW9kdWxlIG9mIHNjb3BlLm5nTW9kdWxlcykge1xuICAgICAgICAgIC8vIFRoZXJlIGlzIGEgY29ycmVjdG5lc3MgaXNzdWUgaGVyZS4gVG8gYmUgY29ycmVjdCwgdGhpcyBzaG91bGQgYmUgYSB0cmFuc2l0aXZlXG4gICAgICAgICAgLy8gZGVwZW5kZW5jeSBvbiB0aGUgZGVwTW9kdWxlIGZpbGUsIHNpbmNlIHRoZSBkZXBNb2R1bGUncyBleHBvcnRzIG1pZ2h0IGNoYW5nZSB2aWEgb25lIG9mXG4gICAgICAgICAgLy8gaXRzIGRlcGVuZGVuY2llcywgZXZlbiBpZiBkZXBNb2R1bGUncyBmaWxlIGl0c2VsZiBkb2Vzbid0IGNoYW5nZS4gSG93ZXZlciwgZG9pbmcgdGhpc1xuICAgICAgICAgIC8vIHdvdWxkIGFsc28gdHJpZ2dlciByZWNvbXBpbGF0aW9uIGlmIGEgbm9uLWV4cG9ydGVkIGNvbXBvbmVudCBvciBkaXJlY3RpdmUgY2hhbmdlZCxcbiAgICAgICAgICAvLyB3aGljaCBjYXVzZXMgcGVyZm9ybWFuY2UgaXNzdWVzIGZvciByZWJ1aWxkcy5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vIEdpdmVuIHRoZSByZWJ1aWxkIGlzc3VlIGlzIGFuIGVkZ2UgY2FzZSwgY3VycmVudGx5IHdlIGVyciBvbiB0aGUgc2lkZSBvZiBwZXJmb3JtYW5jZVxuICAgICAgICAgIC8vIGluc3RlYWQgb2YgY29ycmVjdG5lc3MuIEEgY29ycmVjdCBhbmQgcGVyZm9ybWFudCBkZXNpZ24gd291bGQgZGlzdGluZ3Vpc2ggYmV0d2VlblxuICAgICAgICAgIC8vIGNoYW5nZXMgdG8gdGhlIGRlcE1vZHVsZSB3aGljaCBhZmZlY3QgaXRzIGV4cG9ydCBzY29wZSBhbmQgY2hhbmdlcyB3aGljaCBkbyBub3QsIGFuZFxuICAgICAgICAgIC8vIG9ubHkgYWRkIGEgZGVwZW5kZW5jeSBmb3IgdGhlIGZvcm1lci4gVGhpcyBjb25jZXB0IGlzIGN1cnJlbnRseSBpbiBkZXZlbG9wbWVudC5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogZml4IGNvcnJlY3RuZXNzIGlzc3VlIGJ5IHVuZGVyc3RhbmRpbmcgdGhlIHNlbWFudGljcyBvZiB0aGUgZGVwZW5kZW5jeS5cbiAgICAgICAgICBkZXBHcmFwaC5hZGREZXBlbmRlbmN5KGZpbGUsIGRlcE1vZHVsZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBEaXJlY3RpdmVzIChub3QgY29tcG9uZW50cykgYW5kIHBpcGVzIG9ubHkgZGVwZW5kIG9uIHRoZSBOZ01vZHVsZSB3aGljaCBkaXJlY3RseSBkZWNsYXJlc1xuICAgICAgICAvLyB0aGVtLlxuICAgICAgICBkZXBHcmFwaC5hZGREZXBlbmRlbmN5KGZpbGUsIG5nTW9kdWxlRmlsZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AocmVjb3JkU3Bhbik7XG4gIH1cblxuICBwcml2YXRlIHNjYW5Gb3JNd3Aoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICB0aGlzLmNvbXBpbGF0aW9uIS5td3BTY2FubmVyLnNjYW4oc2YsIHtcbiAgICAgIGFkZFR5cGVSZXBsYWNlbWVudDogKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCB0eXBlOiBUeXBlKTogdm9pZCA9PiB7XG4gICAgICAgIC8vIE9ubHkgb2J0YWluIHRoZSByZXR1cm4gdHlwZSB0cmFuc2Zvcm0gZm9yIHRoZSBzb3VyY2UgZmlsZSBvbmNlIHRoZXJlJ3MgYSB0eXBlIHRvIHJlcGxhY2UsXG4gICAgICAgIC8vIHNvIHRoYXQgbm8gdHJhbnNmb3JtIGlzIGFsbG9jYXRlZCB3aGVuIHRoZXJlJ3Mgbm90aGluZyB0byBkby5cbiAgICAgICAgdGhpcy5jb21waWxhdGlvbiEuZHRzVHJhbnNmb3JtcyEuZ2V0UmV0dXJuVHlwZVRyYW5zZm9ybShzZikuYWRkVHlwZVJlcGxhY2VtZW50KG5vZGUsIHR5cGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlQ29tcGlsYXRpb24oKTogTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICAgIGNvbnN0IGNoZWNrZXIgPSB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgY29uc3QgcmVmbGVjdG9yID0gbmV3IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdChjaGVja2VyKTtcblxuICAgIC8vIENvbnN0cnVjdCB0aGUgUmVmZXJlbmNlRW1pdHRlci5cbiAgICBsZXQgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcjtcbiAgICBsZXQgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMuaG9zdC51bmlmaWVkTW9kdWxlc0hvc3QgPT09IG51bGwgfHwgIXRoaXMub3B0aW9ucy5fdXNlSG9zdEZvckltcG9ydEdlbmVyYXRpb24pIHtcbiAgICAgIGxldCBsb2NhbEltcG9ydFN0cmF0ZWd5OiBSZWZlcmVuY2VFbWl0U3RyYXRlZ3k7XG5cbiAgICAgIC8vIFRoZSBzdHJhdGVneSB1c2VkIGZvciBsb2NhbCwgaW4tcHJvamVjdCBpbXBvcnRzIGRlcGVuZHMgb24gd2hldGhlciBUUyBoYXMgYmVlbiBjb25maWd1cmVkXG4gICAgICAvLyB3aXRoIHJvb3REaXJzLiBJZiBzbywgdGhlbiBtdWx0aXBsZSBkaXJlY3RvcmllcyBtYXkgYmUgbWFwcGVkIGluIHRoZSBzYW1lIFwibW9kdWxlXG4gICAgICAvLyBuYW1lc3BhY2VcIiBhbmQgdGhlIGxvZ2ljIG9mIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBpcyByZXF1aXJlZCB0byBnZW5lcmF0ZSBjb3JyZWN0XG4gICAgICAvLyBpbXBvcnRzIHdoaWNoIG1heSBjcm9zcyB0aGVzZSBtdWx0aXBsZSBkaXJlY3Rvcmllcy4gT3RoZXJ3aXNlLCBwbGFpbiByZWxhdGl2ZSBpbXBvcnRzIGFyZVxuICAgICAgLy8gc3VmZmljaWVudC5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucm9vdERpciAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgKHRoaXMub3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkICYmIHRoaXMub3B0aW9ucy5yb290RGlycy5sZW5ndGggPiAwKSkge1xuICAgICAgICAvLyByb290RGlycyBsb2dpYyBpcyBpbiBlZmZlY3QgLSB1c2UgdGhlIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBmb3IgaW4tcHJvamVjdCByZWxhdGl2ZVxuICAgICAgICAvLyBpbXBvcnRzLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID0gbmV3IExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3koXG4gICAgICAgICAgICByZWZsZWN0b3IsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbShbLi4udGhpcy5ob3N0LnJvb3REaXJzXSwgdGhpcy5ob3N0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBQbGFpbiByZWxhdGl2ZSBpbXBvcnRzIGFyZSBhbGwgdGhhdCdzIG5lZWRlZC5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSA9IG5ldyBSZWxhdGl2ZVBhdGhTdHJhdGVneShyZWZsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IGRvZXNuJ3QgaGF2ZSBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gYnVpbGQgYW4gTlBNLWNlbnRyaWMgcmVmZXJlbmNlXG4gICAgICAvLyByZXNvbHV0aW9uIHN0cmF0ZWd5LlxuICAgICAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gTmV4dCwgYXR0ZW1wdCB0byB1c2UgYW4gYWJzb2x1dGUgaW1wb3J0LlxuICAgICAgICBuZXcgQWJzb2x1dGVNb2R1bGVTdHJhdGVneSh0aGlzLnRzUHJvZ3JhbSwgY2hlY2tlciwgdGhpcy5tb2R1bGVSZXNvbHZlciwgcmVmbGVjdG9yKSxcbiAgICAgICAgLy8gRmluYWxseSwgY2hlY2sgaWYgdGhlIHJlZmVyZW5jZSBpcyBiZWluZyB3cml0dGVuIGludG8gYSBmaWxlIHdpdGhpbiB0aGUgcHJvamVjdCdzIC50c1xuICAgICAgICAvLyBzb3VyY2VzLCBhbmQgdXNlIGEgcmVsYXRpdmUgaW1wb3J0IGlmIHNvLiBJZiB0aGlzIGZhaWxzLCBSZWZlcmVuY2VFbWl0dGVyIHdpbGwgdGhyb3dcbiAgICAgICAgLy8gYW4gZXJyb3IuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3ksXG4gICAgICBdKTtcblxuICAgICAgLy8gSWYgYW4gZW50cnlwb2ludCBpcyBwcmVzZW50LCB0aGVuIGFsbCB1c2VyIGltcG9ydHMgc2hvdWxkIGJlIGRpcmVjdGVkIHRocm91Z2ggdGhlXG4gICAgICAvLyBlbnRyeXBvaW50IGFuZCBwcml2YXRlIGV4cG9ydHMgYXJlIG5vdCBuZWVkZWQuIFRoZSBjb21waWxlciB3aWxsIHZhbGlkYXRlIHRoYXQgYWxsIHB1YmxpY2x5XG4gICAgICAvLyB2aXNpYmxlIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIGltcG9ydGFibGUgdmlhIHRoaXMgZW50cnlwb2ludC5cbiAgICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgPT09IG51bGwgJiYgdGhpcy5vcHRpb25zLmdlbmVyYXRlRGVlcFJlZXhwb3J0cyA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBObyBlbnRyeXBvaW50IGlzIHByZXNlbnQgYW5kIGRlZXAgcmUtZXhwb3J0cyB3ZXJlIHJlcXVlc3RlZCwgc28gY29uZmlndXJlIHRoZSBhbGlhc2luZ1xuICAgICAgICAvLyBzeXN0ZW0gdG8gZ2VuZXJhdGUgdGhlbS5cbiAgICAgICAgYWxpYXNpbmdIb3N0ID0gbmV3IFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QocmVmbGVjdG9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBzdXBwb3J0cyBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gdXNlIHRoYXQgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgcmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgYWxpYXNlZCByZWZlcmVuY2VzICh0aGlzIGlzIGEgd29ya2Fyb3VuZCB0byBTdHJpY3REZXBzIGNoZWNrcykuXG4gICAgICAgIG5ldyBBbGlhc1N0cmF0ZWd5KCksXG4gICAgICAgIC8vIFRoZW4gdXNlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lIHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgICAgbmV3IFVuaWZpZWRNb2R1bGVzU3RyYXRlZ3kocmVmbGVjdG9yLCB0aGlzLmhvc3QudW5pZmllZE1vZHVsZXNIb3N0KSxcbiAgICAgIF0pO1xuICAgICAgYWxpYXNpbmdIb3N0ID0gbmV3IFVuaWZpZWRNb2R1bGVzQWxpYXNpbmdIb3N0KHRoaXMuaG9zdC51bmlmaWVkTW9kdWxlc0hvc3QpO1xuICAgIH1cblxuICAgIGNvbnN0IGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHJlZmxlY3RvciwgY2hlY2tlciwgdGhpcy5pbmNyZW1lbnRhbERyaXZlci5kZXBHcmFwaCk7XG4gICAgY29uc3QgZHRzUmVhZGVyID0gbmV3IER0c01ldGFkYXRhUmVhZGVyKGNoZWNrZXIsIHJlZmxlY3Rvcik7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVnaXN0cnkgPSBuZXcgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlciA9IGxvY2FsTWV0YVJlZ2lzdHJ5O1xuICAgIGNvbnN0IGRlcFNjb3BlUmVhZGVyID0gbmV3IE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcihkdHNSZWFkZXIsIGFsaWFzaW5nSG9zdCk7XG4gICAgY29uc3Qgc2NvcGVSZWdpc3RyeSA9XG4gICAgICAgIG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkobG9jYWxNZXRhUmVhZGVyLCBkZXBTY29wZVJlYWRlciwgcmVmRW1pdHRlciwgYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIgPSBzY29wZVJlZ2lzdHJ5O1xuICAgIGNvbnN0IG1ldGFSZWdpc3RyeSA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnkoW2xvY2FsTWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5XSk7XG4gICAgY29uc3QgaW5qZWN0YWJsZVJlZ2lzdHJ5ID0gbmV3IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5KHJlZmxlY3Rvcik7XG5cbiAgICBjb25zdCBtZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW2xvY2FsTWV0YVJlYWRlciwgZHRzUmVhZGVyXSk7XG5cblxuICAgIC8vIElmIGEgZmxhdCBtb2R1bGUgZW50cnlwb2ludCB3YXMgc3BlY2lmaWVkLCB0aGVuIHRyYWNrIHJlZmVyZW5jZXMgdmlhIGEgYFJlZmVyZW5jZUdyYXBoYCBpblxuICAgIC8vIG9yZGVyIHRvIHByb2R1Y2UgcHJvcGVyIGRpYWdub3N0aWNzIGZvciBpbmNvcnJlY3RseSBleHBvcnRlZCBkaXJlY3RpdmVzL3BpcGVzL2V0Yy4gSWYgdGhlcmVcbiAgICAvLyBpcyBubyBmbGF0IG1vZHVsZSBlbnRyeXBvaW50IHRoZW4gZG9uJ3QgcGF5IHRoZSBjb3N0IG9mIHRyYWNraW5nIHJlZmVyZW5jZXMuXG4gICAgbGV0IHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5O1xuICAgIGxldCBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMuZW50cnlQb2ludCAhPT0gbnVsbCkge1xuICAgICAgZXhwb3J0UmVmZXJlbmNlR3JhcGggPSBuZXcgUmVmZXJlbmNlR3JhcGgoKTtcbiAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBSZWZlcmVuY2VHcmFwaEFkYXB0ZXIoZXhwb3J0UmVmZXJlbmNlR3JhcGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSgpO1xuICAgIH1cblxuICAgIGNvbnN0IHJvdXRlQW5hbHl6ZXIgPSBuZXcgTmdNb2R1bGVSb3V0ZUFuYWx5emVyKHRoaXMubW9kdWxlUmVzb2x2ZXIsIGV2YWx1YXRvcik7XG5cbiAgICBjb25zdCBkdHNUcmFuc2Zvcm1zID0gbmV3IER0c1RyYW5zZm9ybVJlZ2lzdHJ5KCk7XG5cbiAgICBjb25zdCBtd3BTY2FubmVyID0gbmV3IE1vZHVsZVdpdGhQcm92aWRlcnNTY2FubmVyKHJlZmxlY3RvciwgZXZhbHVhdG9yLCByZWZFbWl0dGVyKTtcblxuICAgIGNvbnN0IGlzQ29yZSA9IGlzQW5ndWxhckNvcmVQYWNrYWdlKHRoaXMudHNQcm9ncmFtKTtcblxuICAgIGNvbnN0IGRlZmF1bHRJbXBvcnRUcmFja2VyID0gbmV3IERlZmF1bHRJbXBvcnRUcmFja2VyKCk7XG5cbiAgICAvLyBTZXQgdXAgdGhlIEl2eUNvbXBpbGF0aW9uLCB3aGljaCBtYW5hZ2VzIHN0YXRlIGZvciB0aGUgSXZ5IHRyYW5zZm9ybWVyLlxuICAgIGNvbnN0IGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+W10gPSBbXG4gICAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCBtZXRhUmVhZGVyLCBzY29wZVJlYWRlciwgc2NvcGVSZWdpc3RyeSwgaXNDb3JlLFxuICAgICAgICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyLCB0aGlzLmhvc3Qucm9vdERpcnMsIHRoaXMub3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzIHx8IGZhbHNlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHMgIT09IGZhbHNlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ICE9PSBmYWxzZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsXG4gICAgICAgICAgcmVmRW1pdHRlciwgZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIuZGVwR3JhcGgsIGluamVjdGFibGVSZWdpc3RyeSxcbiAgICAgICAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQpLFxuICAgICAgLy8gVE9ETyhhbHhodWIpOiB1bmRlcnN0YW5kIHdoeSB0aGUgY2FzdCBoZXJlIGlzIG5lY2Vzc2FyeSAoc29tZXRoaW5nIHRvIGRvIHdpdGggYG51bGxgXG4gICAgICAvLyBub3QgYmVpbmcgYXNzaWduYWJsZSB0byBgdW5rbm93bmAgd2hlbiB3cmFwcGVkIGluIGBSZWFkb25seWApLlxuICAgICAgLy8gY2xhbmctZm9ybWF0IG9mZlxuICAgICAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIG1ldGFSZWFkZXIsXG4gICAgICAgICAgICBkZWZhdWx0SW1wb3J0VHJhY2tlciwgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBpc0NvcmUsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgICAgIC8vIEluIG5ndHNjIHdlIG5vIGxvbmdlciB3YW50IHRvIGNvbXBpbGUgdW5kZWNvcmF0ZWQgY2xhc3NlcyB3aXRoIEFuZ3VsYXIgZmVhdHVyZXMuXG4gICAgICAgICAgICAvLyBNaWdyYXRpb25zIGZvciB0aGVzZSBwYXR0ZXJucyByYW4gYXMgcGFydCBvZiBgbmcgdXBkYXRlYCBhbmQgd2Ugd2FudCB0byBlbnN1cmVcbiAgICAgICAgICAgIC8vIHRoYXQgcHJvamVjdHMgZG8gbm90IHJlZ3Jlc3MuIFNlZSBodHRwczovL2hhY2ttZC5pby9AYWx4L3J5ZllZdXZ6SCBmb3IgbW9yZSBkZXRhaWxzLlxuICAgICAgICAgICAgLyogY29tcGlsZVVuZGVjb3JhdGVkQ2xhc3Nlc1dpdGhBbmd1bGFyRmVhdHVyZXMgKi8gZmFsc2VcbiAgICAgICAgKSBhcyBSZWFkb25seTxEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+PixcbiAgICAgIC8vIGNsYW5nLWZvcm1hdCBvblxuICAgICAgLy8gUGlwZSBoYW5kbGVyIG11c3QgYmUgYmVmb3JlIGluamVjdGFibGUgaGFuZGxlciBpbiBsaXN0IHNvIHBpcGUgZmFjdG9yaWVzIGFyZSBwcmludGVkXG4gICAgICAvLyBiZWZvcmUgaW5qZWN0YWJsZSBmYWN0b3JpZXMgKHNvIGluamVjdGFibGUgZmFjdG9yaWVzIGNhbiBkZWxlZ2F0ZSB0byB0aGVtKVxuICAgICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIGRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSwgaXNDb3JlKSxcbiAgICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGRlZmF1bHRJbXBvcnRUcmFja2VyLCBpc0NvcmUsIHRoaXMub3B0aW9ucy5zdHJpY3RJbmplY3Rpb25QYXJhbWV0ZXJzIHx8IGZhbHNlLFxuICAgICAgICAgIGluamVjdGFibGVSZWdpc3RyeSksXG4gICAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVhZGVyLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIHJlZmVyZW5jZXNSZWdpc3RyeSwgaXNDb3JlLFxuICAgICAgICAgIHJvdXRlQW5hbHl6ZXIsIHJlZkVtaXR0ZXIsIHRoaXMuaG9zdC5mYWN0b3J5VHJhY2tlciwgZGVmYXVsdEltcG9ydFRyYWNrZXIsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLCBpbmplY3RhYmxlUmVnaXN0cnksIHRoaXMub3B0aW9ucy5pMThuSW5Mb2NhbGUpLFxuICAgIF07XG5cbiAgICBjb25zdCB0cmFpdENvbXBpbGVyID0gbmV3IFRyYWl0Q29tcGlsZXIoXG4gICAgICAgIGhhbmRsZXJzLCByZWZsZWN0b3IsIHRoaXMucGVyZlJlY29yZGVyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyLFxuICAgICAgICB0aGlzLm9wdGlvbnMuY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlcyAhPT0gZmFsc2UsIGR0c1RyYW5zZm9ybXMpO1xuXG4gICAgY29uc3QgdGVtcGxhdGVUeXBlQ2hlY2tlciA9IG5ldyBUZW1wbGF0ZVR5cGVDaGVja2VyKFxuICAgICAgICB0aGlzLnRzUHJvZ3JhbSwgdGhpcy50eXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksIHRyYWl0Q29tcGlsZXIsXG4gICAgICAgIHRoaXMuZ2V0VHlwZUNoZWNraW5nQ29uZmlnKCksIHJlZkVtaXR0ZXIsIHJlZmxlY3RvciwgdGhpcy5ob3N0LCB0aGlzLmluY3JlbWVudGFsRHJpdmVyKTtcblxuICAgIHJldHVybiB7XG4gICAgICBpc0NvcmUsXG4gICAgICB0cmFpdENvbXBpbGVyLFxuICAgICAgcmVmbGVjdG9yLFxuICAgICAgc2NvcGVSZWdpc3RyeSxcbiAgICAgIGR0c1RyYW5zZm9ybXMsXG4gICAgICBleHBvcnRSZWZlcmVuY2VHcmFwaCxcbiAgICAgIHJvdXRlQW5hbHl6ZXIsXG4gICAgICBtd3BTY2FubmVyLFxuICAgICAgbWV0YVJlYWRlcixcbiAgICAgIGRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgYWxpYXNpbmdIb3N0LFxuICAgICAgcmVmRW1pdHRlcixcbiAgICAgIHRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgZ2l2ZW4gYFByb2dyYW1gIGlzIEBhbmd1bGFyL2NvcmUuXG4gKi9cbmZ1bmN0aW9uIGlzQW5ndWxhckNvcmVQYWNrYWdlKHByb2dyYW06IHRzLlByb2dyYW0pOiBib29sZWFuIHtcbiAgLy8gTG9vayBmb3IgaXRzX2p1c3RfYW5ndWxhci50cyBzb21ld2hlcmUgaW4gdGhlIHByb2dyYW0uXG4gIGNvbnN0IHIzU3ltYm9scyA9IGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbSk7XG4gIGlmIChyM1N5bWJvbHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBMb29rIGZvciB0aGUgY29uc3RhbnQgSVRTX0pVU1RfQU5HVUxBUiBpbiB0aGF0IGZpbGUuXG4gIHJldHVybiByM1N5bWJvbHMuc3RhdGVtZW50cy5zb21lKHN0bXQgPT4ge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgbXVzdCBiZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHN0YXRlbWVudC5cbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RtdCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBiZSBleHBvcnRlZC5cbiAgICBpZiAoc3RtdC5tb2RpZmllcnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAhc3RtdC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBkZWNsYXJlIElUU19KVVNUX0FOR1VMQVIuXG4gICAgcmV0dXJuIHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5zb21lKGRlY2wgPT4ge1xuICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIG11c3QgbWF0Y2ggdGhlIG5hbWUuXG4gICAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpIHx8IGRlY2wubmFtZS50ZXh0ICE9PSAnSVRTX0pVU1RfQU5HVUxBUicpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gSXQgbXVzdCBpbml0aWFsaXplIHRoZSB2YXJpYWJsZSB0byB0cnVlLlxuICAgICAgaWYgKGRlY2wuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCB8fCBkZWNsLmluaXRpYWxpemVyLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVHJ1ZUtleXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBkZWZpbml0aW9uIG1hdGNoZXMuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogRmluZCB0aGUgJ3IzX3N5bWJvbHMudHMnIGZpbGUgaW4gdGhlIGdpdmVuIGBQcm9ncmFtYCwgb3IgcmV0dXJuIGBudWxsYCBpZiBpdCB3YXNuJ3QgdGhlcmUuXG4gKi9cbmZ1bmN0aW9uIGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmluZChmaWxlID0+IGZpbGUuZmlsZU5hbWUuaW5kZXhPZigncjNfc3ltYm9scy50cycpID49IDApIHx8IG51bGw7XG59XG5cbi8qKlxuICogU3ltYm9sIHVuZGVyIHdoaWNoIHRoZSBgSW5jcmVtZW50YWxEcml2ZXJgIGlzIHN0b3JlZCBvbiBhIGB0cy5Qcm9ncmFtYC5cbiAqXG4gKiBUaGUgVFMgbW9kZWwgb2YgaW5jcmVtZW50YWwgY29tcGlsYXRpb24gaXMgYmFzZWQgYXJvdW5kIHJldXNlIG9mIGEgcHJldmlvdXMgYHRzLlByb2dyYW1gIGluIHRoZVxuICogY29uc3RydWN0aW9uIG9mIGEgbmV3IG9uZS4gVGhlIGBOZ0NvbXBpbGVyYCBmb2xsb3dzIHRoaXMgYWJzdHJhY3Rpb24gLSBwYXNzaW5nIGluIGEgcHJldmlvdXNcbiAqIGB0cy5Qcm9ncmFtYCBpcyBzdWZmaWNpZW50IHRvIHRyaWdnZXIgaW5jcmVtZW50YWwgY29tcGlsYXRpb24uIFRoaXMgcHJldmlvdXMgYHRzLlByb2dyYW1gIG5lZWRcbiAqIG5vdCBiZSBmcm9tIGFuIEFuZ3VsYXIgY29tcGlsYXRpb24gKHRoYXQgaXMsIGl0IG5lZWQgbm90IGhhdmUgYmVlbiBjcmVhdGVkIGZyb20gYE5nQ29tcGlsZXJgKS5cbiAqXG4gKiBJZiBpdCBpcywgdGhvdWdoLCBBbmd1bGFyIGNhbiBiZW5lZml0IGZyb20gcmV1c2luZyBwcmV2aW91cyBhbmFseXNpcyB3b3JrLiBUaGlzIHJldXNlIGlzIG1hbmFnZWRcbiAqIGJ5IHRoZSBgSW5jcmVtZW50YWxEcml2ZXJgLCB3aGljaCBpcyBpbmhlcml0ZWQgZnJvbSB0aGUgb2xkIHByb2dyYW0gdG8gdGhlIG5ldyBwcm9ncmFtLiBUb1xuICogc3VwcG9ydCB0aGlzIGJlaGluZCB0aGUgQVBJIG9mIHBhc3NpbmcgYW4gb2xkIGB0cy5Qcm9ncmFtYCwgdGhlIGBJbmNyZW1lbnRhbERyaXZlcmAgaXMgc3RvcmVkIG9uXG4gKiB0aGUgYHRzLlByb2dyYW1gIHVuZGVyIHRoaXMgc3ltYm9sLlxuICovXG5jb25zdCBTWU1fSU5DUkVNRU5UQUxfRFJJVkVSID0gU3ltYm9sKCdOZ0luY3JlbWVudGFsRHJpdmVyJyk7XG5cbi8qKlxuICogR2V0IGFuIGBJbmNyZW1lbnRhbERyaXZlcmAgZnJvbSB0aGUgZ2l2ZW4gYHRzLlByb2dyYW1gIGlmIG9uZSBpcyBwcmVzZW50LlxuICpcbiAqIFNlZSBgU1lNX0lOQ1JFTUVOVEFMX0RSSVZFUmAgZm9yIG1vcmUgZGV0YWlscy5cbiAqL1xuZnVuY3Rpb24gZ2V0SW5jcmVtZW50YWxEcml2ZXIocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IEluY3JlbWVudGFsRHJpdmVyfG51bGwge1xuICBjb25zdCBkcml2ZXIgPSAocHJvZ3JhbSBhcyBhbnkpW1NZTV9JTkNSRU1FTlRBTF9EUklWRVJdO1xuICBpZiAoZHJpdmVyID09PSB1bmRlZmluZWQgfHwgIShkcml2ZXIgaW5zdGFuY2VvZiBJbmNyZW1lbnRhbERyaXZlcikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gZHJpdmVyO1xufVxuXG4vKipcbiAqIFNhdmUgdGhlIGdpdmVuIGBJbmNyZW1lbnRhbERyaXZlcmAgb250byB0aGUgZ2l2ZW4gYHRzLlByb2dyYW1gLCBmb3IgcmV0cmlldmFsIGluIGEgc3Vic2VxdWVudFxuICogaW5jcmVtZW50YWwgY29tcGlsYXRpb24uXG4gKlxuICogU2VlIGBTWU1fSU5DUkVNRU5UQUxfRFJJVkVSYCBmb3IgbW9yZSBkZXRhaWxzLlxuICovXG5mdW5jdGlvbiBzZXRJbmNyZW1lbnRhbERyaXZlcihwcm9ncmFtOiB0cy5Qcm9ncmFtLCBkcml2ZXI6IEluY3JlbWVudGFsRHJpdmVyKTogdm9pZCB7XG4gIChwcm9ncmFtIGFzIGFueSlbU1lNX0lOQ1JFTUVOVEFMX0RSSVZFUl0gPSBkcml2ZXI7XG59XG5cbi8qKlxuICogU2luY2UgXCJzdHJpY3RUZW1wbGF0ZXNcIiBpcyBhIHRydWUgc3VwZXJzZXQgb2YgdHlwZSBjaGVja2luZyBjYXBhYmlsaXRpZXMgY29tcGFyZWQgdG9cbiAqIFwic3RyaWN0VGVtcGxhdGVUeXBlQ2hlY2tcIiwgaXQgaXMgcmVxdWlyZWQgdGhhdCB0aGUgbGF0dGVyIGlzIG5vdCBleHBsaWNpdGx5IGRpc2FibGVkIGlmIHRoZVxuICogZm9ybWVyIGlzIGVuYWJsZWQuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zKG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zKTogdHMuRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKG9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrID09PSBmYWxzZSAmJiBvcHRpb25zLnN0cmljdFRlbXBsYXRlcyA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLkNPTkZJR19TVFJJQ1RfVEVNUExBVEVTX0lNUExJRVNfRlVMTF9URU1QTEFURV9UWVBFQ0hFQ0spLFxuICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgc3RhcnQ6IHVuZGVmaW5lZCxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgYEFuZ3VsYXIgY29tcGlsZXIgb3B0aW9uIFwic3RyaWN0VGVtcGxhdGVzXCIgaXMgZW5hYmxlZCwgaG93ZXZlciBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIGRpc2FibGVkLlxuXG5IYXZpbmcgdGhlIFwic3RyaWN0VGVtcGxhdGVzXCIgZmxhZyBlbmFibGVkIGltcGxpZXMgdGhhdCBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIGFsc28gZW5hYmxlZCwgc29cbnRoZSBsYXR0ZXIgY2FuIG5vdCBiZSBleHBsaWNpdGx5IGRpc2FibGVkLlxuXG5PbmUgb2YgdGhlIGZvbGxvd2luZyBhY3Rpb25zIGlzIHJlcXVpcmVkOlxuMS4gUmVtb3ZlIHRoZSBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIG9wdGlvbi5cbjIuIFJlbW92ZSBcInN0cmljdFRlbXBsYXRlc1wiIG9yIHNldCBpdCB0byAnZmFsc2UnLlxuXG5Nb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB0ZW1wbGF0ZSB0eXBlIGNoZWNraW5nIGNvbXBpbGVyIG9wdGlvbnMgY2FuIGJlIGZvdW5kIGluIHRoZSBkb2N1bWVudGF0aW9uOlxuaHR0cHM6Ly92OS5hbmd1bGFyLmlvL2d1aWRlL3RlbXBsYXRlLXR5cGVjaGVjayN0ZW1wbGF0ZS10eXBlLWNoZWNraW5nYCxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmNsYXNzIFJlZmVyZW5jZUdyYXBoQWRhcHRlciBpbXBsZW1lbnRzIFJlZmVyZW5jZXNSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZ3JhcGg6IFJlZmVyZW5jZUdyYXBoKSB7fVxuXG4gIGFkZChzb3VyY2U6IHRzLkRlY2xhcmF0aW9uLCAuLi5yZWZlcmVuY2VzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W10pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHtub2RlfSBvZiByZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgc291cmNlRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzb3VyY2VGaWxlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSByZWNvcmQgbG9jYWwgcmVmZXJlbmNlcyAobm90IHJlZmVyZW5jZXMgaW50byAuZC50cyBmaWxlcykuXG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkIHx8ICFpc0R0c1BhdGgoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgdGhpcy5ncmFwaC5hZGQoc291cmNlLCBub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==