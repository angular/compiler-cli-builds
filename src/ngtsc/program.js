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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/transformers/nocollapse_hack", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/annotations/src/base_def", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/indexer", "@angular/compiler-cli/src/ngtsc/indexer/src/transform", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource_loader", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/transform/src/alias", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var nocollapse_hack_1 = require("@angular/compiler-cli/src/transformers/nocollapse_hack");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var base_def_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/base_def");
    var cycles_1 = require("@angular/compiler-cli/src/ngtsc/cycles");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var entry_point_1 = require("@angular/compiler-cli/src/ngtsc/entry_point");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var incremental_1 = require("@angular/compiler-cli/src/ngtsc/incremental");
    var indexer_1 = require("@angular/compiler-cli/src/ngtsc/indexer");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/indexer/src/transform");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var resource_loader_1 = require("@angular/compiler-cli/src/ngtsc/resource_loader");
    var routing_1 = require("@angular/compiler-cli/src/ngtsc/routing");
    var scope_1 = require("@angular/compiler-cli/src/ngtsc/scope");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var switch_1 = require("@angular/compiler-cli/src/ngtsc/switch");
    var transform_2 = require("@angular/compiler-cli/src/ngtsc/transform");
    var alias_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/alias");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var NgtscProgram = /** @class */ (function () {
        function NgtscProgram(rootNames, options, host, oldProgram) {
            var _this = this;
            this.options = options;
            this.host = host;
            this.compilation = undefined;
            this.factoryToSourceInfo = null;
            this.sourceToFactorySymbols = null;
            this._coreImportsFrom = undefined;
            this._importRewriter = undefined;
            this._reflector = undefined;
            this._isCore = undefined;
            this.exportReferenceGraph = null;
            this.flatIndexGenerator = null;
            this.routeAnalyzer = null;
            this.constructionDiagnostics = [];
            this.metaReader = null;
            this.aliasingHost = null;
            this.refEmitter = null;
            this.fileToModuleHost = null;
            this.perfRecorder = perf_1.NOOP_PERF_RECORDER;
            this.perfTracker = null;
            if (shouldEnablePerfTracing(options)) {
                this.perfTracker = perf_1.PerfTracker.zeroedToNow();
                this.perfRecorder = this.perfTracker;
            }
            this.modifiedResourceFiles =
                this.host.getModifiedResourceFiles && this.host.getModifiedResourceFiles() || null;
            this.rootDirs = typescript_1.getRootDirs(host, options);
            this.closureCompilerEnabled = !!options.annotateForClosureCompiler;
            this.resourceManager = new resource_loader_1.HostResourceLoader(host, options);
            // TODO(alxhub): remove the fallback to allowEmptyCodegenFiles after verifying that the rest of
            // our build tooling is no longer relying on it.
            var allowEmptyCodegenFiles = options.allowEmptyCodegenFiles || false;
            var shouldGenerateFactoryShims = options.generateNgFactoryShims !== undefined ?
                options.generateNgFactoryShims :
                allowEmptyCodegenFiles;
            var shouldGenerateSummaryShims = options.generateNgSummaryShims !== undefined ?
                options.generateNgSummaryShims :
                allowEmptyCodegenFiles;
            var normalizedRootNames = rootNames.map(function (n) { return file_system_1.absoluteFrom(n); });
            if (host.fileNameToModuleName !== undefined) {
                this.fileToModuleHost = host;
            }
            var rootFiles = tslib_1.__spread(rootNames);
            var generators = [];
            var summaryGenerator = null;
            if (shouldGenerateSummaryShims) {
                // Summary generation.
                summaryGenerator = shims_1.SummaryGenerator.forRootFiles(normalizedRootNames);
                generators.push(summaryGenerator);
            }
            if (shouldGenerateFactoryShims) {
                // Factory generation.
                var factoryGenerator = shims_1.FactoryGenerator.forRootFiles(normalizedRootNames);
                var factoryFileMap = factoryGenerator.factoryFileMap;
                this.factoryToSourceInfo = new Map();
                this.sourceToFactorySymbols = new Map();
                factoryFileMap.forEach(function (sourceFilePath, factoryPath) {
                    var moduleSymbolNames = new Set();
                    _this.sourceToFactorySymbols.set(sourceFilePath, moduleSymbolNames);
                    _this.factoryToSourceInfo.set(factoryPath, { sourceFilePath: sourceFilePath, moduleSymbolNames: moduleSymbolNames });
                });
                var factoryFileNames = Array.from(factoryFileMap.keys());
                rootFiles.push.apply(rootFiles, tslib_1.__spread(factoryFileNames));
                generators.push(factoryGenerator);
            }
            // Done separately to preserve the order of factory files before summary files in rootFiles.
            // TODO(alxhub): validate that this is necessary.
            if (shouldGenerateSummaryShims) {
                rootFiles.push.apply(rootFiles, tslib_1.__spread(summaryGenerator.getSummaryFileNames()));
            }
            this.typeCheckFilePath = typecheck_1.typeCheckFilePath(this.rootDirs);
            generators.push(new shims_1.TypeCheckShimGenerator(this.typeCheckFilePath));
            rootFiles.push(this.typeCheckFilePath);
            var entryPoint = null;
            if (options.flatModuleOutFile != null && options.flatModuleOutFile !== '') {
                entryPoint = entry_point_1.findFlatIndexEntryPoint(normalizedRootNames);
                if (entryPoint === null) {
                    // This error message talks specifically about having a single .ts file in "files". However
                    // the actual logic is a bit more permissive. If a single file exists, that will be taken,
                    // otherwise the highest level (shortest path) "index.ts" file will be used as the flat
                    // module entry point instead. If neither of these conditions apply, the error below is
                    // given.
                    //
                    // The user is not informed about the "index.ts" option as this behavior is deprecated -
                    // an explicit entrypoint should always be specified.
                    this.constructionDiagnostics.push({
                        category: ts.DiagnosticCategory.Error,
                        code: diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.CONFIG_FLAT_MODULE_NO_INDEX),
                        file: undefined,
                        start: undefined,
                        length: undefined,
                        messageText: 'Angular compiler option "flatModuleOutFile" requires one and only one .ts file in the "files" field.',
                    });
                }
                else {
                    var flatModuleId = options.flatModuleId || null;
                    var flatModuleOutFile = path_1.normalizeSeparators(options.flatModuleOutFile);
                    this.flatIndexGenerator =
                        new entry_point_1.FlatIndexGenerator(entryPoint, flatModuleOutFile, flatModuleId);
                    generators.push(this.flatIndexGenerator);
                    rootFiles.push(this.flatIndexGenerator.flatIndexPath);
                }
            }
            if (generators.length > 0) {
                // FIXME: Remove the any cast once google3 is fully on TS3.6.
                this.host = new shims_1.GeneratedShimsHostWrapper(host, generators);
            }
            this.tsProgram =
                ts.createProgram(rootFiles, options, this.host, oldProgram && oldProgram.reuseTsProgram);
            this.reuseTsProgram = this.tsProgram;
            this.entryPoint = entryPoint !== null ? typescript_1.getSourceFileOrNull(this.tsProgram, entryPoint) : null;
            this.moduleResolver = new imports_1.ModuleResolver(this.tsProgram, options, this.host);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(new cycles_1.ImportGraph(this.moduleResolver));
            this.defaultImportTracker = new imports_1.DefaultImportTracker();
            if (oldProgram === undefined) {
                this.incrementalState = incremental_1.IncrementalState.fresh();
            }
            else {
                this.incrementalState = incremental_1.IncrementalState.reconcile(oldProgram.incrementalState, oldProgram.reuseTsProgram, this.tsProgram, this.modifiedResourceFiles);
            }
        }
        NgtscProgram.prototype.getTsProgram = function () { return this.tsProgram; };
        NgtscProgram.prototype.getTsOptionDiagnostics = function (cancellationToken) {
            return this.tsProgram.getOptionsDiagnostics(cancellationToken);
        };
        NgtscProgram.prototype.getNgOptionDiagnostics = function (cancellationToken) {
            return this.constructionDiagnostics;
        };
        NgtscProgram.prototype.getTsSyntacticDiagnostics = function (sourceFile, cancellationToken) {
            return this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
        };
        NgtscProgram.prototype.getNgStructuralDiagnostics = function (cancellationToken) {
            return [];
        };
        NgtscProgram.prototype.getTsSemanticDiagnostics = function (sourceFile, cancellationToken) {
            return this.tsProgram.getSemanticDiagnostics(sourceFile, cancellationToken);
        };
        NgtscProgram.prototype.getNgSemanticDiagnostics = function (fileName, cancellationToken) {
            var compilation = this.ensureAnalyzed();
            var diagnostics = tslib_1.__spread(compilation.diagnostics, this.getTemplateDiagnostics());
            if (this.entryPoint !== null && this.exportReferenceGraph !== null) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(entry_point_1.checkForPrivateExports(this.entryPoint, this.tsProgram.getTypeChecker(), this.exportReferenceGraph)));
            }
            return diagnostics;
        };
        NgtscProgram.prototype.loadNgStructureAsync = function () {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var analyzeSpan;
                var _this = this;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.compilation === undefined) {
                                this.compilation = this.makeCompilation();
                            }
                            analyzeSpan = this.perfRecorder.start('analyze');
                            return [4 /*yield*/, Promise.all(this.tsProgram.getSourceFiles()
                                    .filter(function (file) { return !file.fileName.endsWith('.d.ts'); })
                                    .map(function (file) {
                                    var analyzeFileSpan = _this.perfRecorder.start('analyzeFile', file);
                                    var analysisPromise = _this.compilation.analyzeAsync(file);
                                    if (analysisPromise === undefined) {
                                        _this.perfRecorder.stop(analyzeFileSpan);
                                    }
                                    else if (_this.perfRecorder.enabled) {
                                        analysisPromise = analysisPromise.then(function () { return _this.perfRecorder.stop(analyzeFileSpan); });
                                    }
                                    return analysisPromise;
                                })
                                    .filter(function (result) { return result !== undefined; }))];
                        case 1:
                            _a.sent();
                            this.perfRecorder.stop(analyzeSpan);
                            this.compilation.resolve();
                            return [2 /*return*/];
                    }
                });
            });
        };
        NgtscProgram.prototype.listLazyRoutes = function (entryRoute) {
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
                var resolvedModule = typescript_1.resolveModuleName(entryPath, containingFile, this.options, this.host);
                if (resolvedModule) {
                    entryRoute = routing_1.entryPointKeyFor(resolvedModule.resolvedFileName, moduleName);
                }
            }
            this.ensureAnalyzed();
            return this.routeAnalyzer.listLazyRoutes(entryRoute);
        };
        NgtscProgram.prototype.getLibrarySummaries = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.getEmittedGeneratedFiles = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.getEmittedSourceFiles = function () {
            throw new Error('Method not implemented.');
        };
        NgtscProgram.prototype.ensureAnalyzed = function () {
            var _this = this;
            if (this.compilation === undefined) {
                var analyzeSpan = this.perfRecorder.start('analyze');
                this.compilation = this.makeCompilation();
                this.tsProgram.getSourceFiles()
                    .filter(function (file) { return !file.fileName.endsWith('.d.ts'); })
                    .forEach(function (file) {
                    var analyzeFileSpan = _this.perfRecorder.start('analyzeFile', file);
                    _this.compilation.analyzeSync(file);
                    _this.perfRecorder.stop(analyzeFileSpan);
                });
                this.perfRecorder.stop(analyzeSpan);
                this.compilation.resolve();
            }
            return this.compilation;
        };
        NgtscProgram.prototype.emit = function (opts) {
            var e_1, _a;
            var _this = this;
            var emitCallback = opts && opts.emitCallback || defaultEmitCallback;
            var compilation = this.ensureAnalyzed();
            var writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                if (_this.closureCompilerEnabled && fileName.endsWith('.js')) {
                    data = nocollapse_hack_1.nocollapseHack(data);
                }
                _this.host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
            };
            var customTransforms = opts && opts.customTransformers;
            var beforeTransforms = [
                transform_2.ivyTransformFactory(compilation, this.reflector, this.importRewriter, this.defaultImportTracker, this.isCore, this.closureCompilerEnabled),
                alias_1.aliasTransformFactory(compilation.exportStatements),
                this.defaultImportTracker.importPreservingTransformer(),
            ];
            var afterDeclarationsTransforms = [
                transform_2.declarationTransformFactory(compilation),
            ];
            // Only add aliasing re-exports to the .d.ts output if the `AliasingHost` requests it.
            if (this.aliasingHost !== null && this.aliasingHost.aliasExportsInDts) {
                afterDeclarationsTransforms.push(alias_1.aliasTransformFactory(compilation.exportStatements));
            }
            if (this.factoryToSourceInfo !== null) {
                beforeTransforms.push(shims_1.generatedFactoryTransform(this.factoryToSourceInfo, this.importRewriter));
            }
            beforeTransforms.push(switch_1.ivySwitchTransform);
            if (customTransforms && customTransforms.beforeTs) {
                beforeTransforms.push.apply(beforeTransforms, tslib_1.__spread(customTransforms.beforeTs));
            }
            var emitSpan = this.perfRecorder.start('emit');
            var emitResults = [];
            var typeCheckFile = typescript_1.getSourceFileOrNull(this.tsProgram, this.typeCheckFilePath);
            try {
                for (var _b = tslib_1.__values(this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var targetSourceFile = _c.value;
                    if (targetSourceFile.isDeclarationFile || targetSourceFile === typeCheckFile) {
                        continue;
                    }
                    if (this.incrementalState.safeToSkip(targetSourceFile)) {
                        continue;
                    }
                    var fileEmitSpan = this.perfRecorder.start('emitFile', targetSourceFile);
                    emitResults.push(emitCallback({
                        targetSourceFile: targetSourceFile,
                        program: this.tsProgram,
                        host: this.host,
                        options: this.options,
                        emitOnlyDtsFiles: false, writeFile: writeFile,
                        customTransformers: {
                            before: beforeTransforms,
                            after: customTransforms && customTransforms.afterTs,
                            afterDeclarations: afterDeclarationsTransforms,
                        },
                    }));
                    this.perfRecorder.stop(fileEmitSpan);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.perfRecorder.stop(emitSpan);
            if (this.perfTracker !== null && this.options.tracePerformance !== undefined) {
                this.perfTracker.serializeToFile(this.options.tracePerformance, this.host);
            }
            // Run the emit, including a custom transformer that will downlevel the Ivy decorators in code.
            return ((opts && opts.mergeEmitResultsCallback) || mergeEmitResults)(emitResults);
        };
        NgtscProgram.prototype.getTemplateDiagnostics = function () {
            // Skip template type-checking if it's disabled.
            if (this.options.ivyTemplateTypeCheck === false &&
                this.options.fullTemplateTypeCheck !== true) {
                return [];
            }
            var compilation = this.ensureAnalyzed();
            // Run template type-checking.
            // First select a type-checking configuration, based on whether full template type-checking is
            // requested.
            var typeCheckingConfig;
            if (this.options.fullTemplateTypeCheck) {
                typeCheckingConfig = {
                    applyTemplateContextGuards: true,
                    checkQueries: false,
                    checkTemplateBodies: true,
                    checkTypeOfInputBindings: true,
                    strictNullInputBindings: true,
                    // Even in full template type-checking mode, DOM binding checks are not quite ready yet.
                    checkTypeOfDomBindings: false,
                    checkTypeOfOutputEvents: true,
                    checkTypeOfAnimationEvents: true,
                    // Checking of DOM events currently has an adverse effect on developer experience,
                    // e.g. for `<input (blur)="update($event.target.value)">` enabling this check results in:
                    // - error TS2531: Object is possibly 'null'.
                    // - error TS2339: Property 'value' does not exist on type 'EventTarget'.
                    checkTypeOfDomEvents: false,
                    checkTypeOfPipes: true,
                    strictSafeNavigationTypes: true,
                };
            }
            else {
                typeCheckingConfig = {
                    applyTemplateContextGuards: false,
                    checkQueries: false,
                    checkTemplateBodies: false,
                    checkTypeOfInputBindings: false,
                    strictNullInputBindings: false,
                    checkTypeOfDomBindings: false,
                    checkTypeOfOutputEvents: false,
                    checkTypeOfAnimationEvents: false,
                    checkTypeOfDomEvents: false,
                    checkTypeOfPipes: false,
                    strictSafeNavigationTypes: false,
                };
            }
            // Execute the typeCheck phase of each decorator in the program.
            var prepSpan = this.perfRecorder.start('typeCheckPrep');
            var ctx = new typecheck_1.TypeCheckContext(typeCheckingConfig, this.refEmitter, this.typeCheckFilePath);
            compilation.typeCheck(ctx);
            this.perfRecorder.stop(prepSpan);
            // Get the diagnostics.
            var typeCheckSpan = this.perfRecorder.start('typeCheckDiagnostics');
            var _a = ctx.calculateTemplateDiagnostics(this.tsProgram, this.host, this.options), diagnostics = _a.diagnostics, program = _a.program;
            this.perfRecorder.stop(typeCheckSpan);
            this.reuseTsProgram = program;
            return diagnostics;
        };
        NgtscProgram.prototype.getIndexedComponents = function () {
            var compilation = this.ensureAnalyzed();
            var context = new indexer_1.IndexingContext();
            compilation.index(context);
            return transform_1.generateAnalysis(context);
        };
        NgtscProgram.prototype.makeCompilation = function () {
            var checker = this.tsProgram.getTypeChecker();
            // Construct the ReferenceEmitter.
            if (this.fileToModuleHost === null || !this.options._useHostForImportGeneration) {
                // The CompilerHost doesn't have fileNameToModuleName, so build an NPM-centric reference
                // resolution strategy.
                this.refEmitter = new imports_1.ReferenceEmitter([
                    // First, try to use local identifiers if available.
                    new imports_1.LocalIdentifierStrategy(),
                    // Next, attempt to use an absolute import.
                    new imports_1.AbsoluteModuleStrategy(this.tsProgram, checker, this.options, this.host, this.reflector),
                    // Finally, check if the reference is being written into a file within the project's logical
                    // file system, and use a relative import if so. If this fails, ReferenceEmitter will throw
                    // an error.
                    new imports_1.LogicalProjectStrategy(this.reflector, new file_system_1.LogicalFileSystem(this.rootDirs)),
                ]);
                // If an entrypoint is present, then all user imports should be directed through the
                // entrypoint and private exports are not needed. The compiler will validate that all publicly
                // visible directives/pipes are importable via this entrypoint.
                if (this.entryPoint === null && this.options.generateDeepReexports === true) {
                    // No entrypoint is present and deep re-exports were requested, so configure the aliasing
                    // system to generate them.
                    this.aliasingHost = new imports_1.PrivateExportAliasingHost(this.reflector);
                }
            }
            else {
                // The CompilerHost supports fileNameToModuleName, so use that to emit imports.
                this.refEmitter = new imports_1.ReferenceEmitter([
                    // First, try to use local identifiers if available.
                    new imports_1.LocalIdentifierStrategy(),
                    // Then use aliased references (this is a workaround to StrictDeps checks).
                    new imports_1.AliasStrategy(),
                    // Then use fileNameToModuleName to emit imports.
                    new imports_1.FileToModuleStrategy(this.reflector, this.fileToModuleHost),
                ]);
                this.aliasingHost = new imports_1.FileToModuleAliasingHost(this.fileToModuleHost);
            }
            var evaluator = new partial_evaluator_1.PartialEvaluator(this.reflector, checker, this.incrementalState);
            var dtsReader = new metadata_1.DtsMetadataReader(checker, this.reflector);
            var localMetaRegistry = new metadata_1.LocalMetadataRegistry();
            var localMetaReader = new metadata_1.CompoundMetadataReader([localMetaRegistry, this.incrementalState]);
            var depScopeReader = new scope_1.MetadataDtsModuleScopeResolver(dtsReader, this.aliasingHost);
            var scopeRegistry = new scope_1.LocalModuleScopeRegistry(localMetaReader, depScopeReader, this.refEmitter, this.aliasingHost, this.incrementalState);
            var scopeReader = new scope_1.CompoundComponentScopeReader([scopeRegistry, this.incrementalState]);
            var metaRegistry = new metadata_1.CompoundMetadataRegistry([localMetaRegistry, scopeRegistry, this.incrementalState]);
            this.metaReader = new metadata_1.CompoundMetadataReader([localMetaReader, dtsReader]);
            // If a flat module entrypoint was specified, then track references via a `ReferenceGraph`
            // in
            // order to produce proper diagnostics for incorrectly exported directives/pipes/etc. If
            // there
            // is no flat module entrypoint then don't pay the cost of tracking references.
            var referencesRegistry;
            if (this.entryPoint !== null) {
                this.exportReferenceGraph = new entry_point_1.ReferenceGraph();
                referencesRegistry = new ReferenceGraphAdapter(this.exportReferenceGraph);
            }
            else {
                referencesRegistry = new annotations_1.NoopReferencesRegistry();
            }
            this.routeAnalyzer = new routing_1.NgModuleRouteAnalyzer(this.moduleResolver, evaluator);
            // Set up the IvyCompilation, which manages state for the Ivy transformer.
            var handlers = [
                new base_def_1.BaseDefDecoratorHandler(this.reflector, evaluator, this.isCore),
                new annotations_1.ComponentDecoratorHandler(this.reflector, evaluator, metaRegistry, this.metaReader, scopeReader, scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.getI18nLegacyMessageFormat(), this.moduleResolver, this.cycleAnalyzer, this.refEmitter, this.defaultImportTracker, this.incrementalState),
                new annotations_1.DirectiveDecoratorHandler(this.reflector, evaluator, metaRegistry, this.defaultImportTracker, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflector, this.defaultImportTracker, this.isCore, this.options.strictInjectionParameters || false),
                new annotations_1.NgModuleDecoratorHandler(this.reflector, evaluator, this.metaReader, metaRegistry, scopeRegistry, referencesRegistry, this.isCore, this.routeAnalyzer, this.refEmitter, this.defaultImportTracker, this.options.i18nInLocale),
                new annotations_1.PipeDecoratorHandler(this.reflector, evaluator, metaRegistry, this.defaultImportTracker, this.isCore),
            ];
            return new transform_2.IvyCompilation(handlers, this.reflector, this.importRewriter, this.incrementalState, this.perfRecorder, this.sourceToFactorySymbols, scopeRegistry);
        };
        NgtscProgram.prototype.getI18nLegacyMessageFormat = function () {
            return this.options.enableI18nLegacyMessageIdFormat !== false && this.options.i18nInFormat ||
                '';
        };
        Object.defineProperty(NgtscProgram.prototype, "reflector", {
            get: function () {
                if (this._reflector === undefined) {
                    this._reflector = new reflection_1.TypeScriptReflectionHost(this.tsProgram.getTypeChecker());
                }
                return this._reflector;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NgtscProgram.prototype, "coreImportsFrom", {
            get: function () {
                if (this._coreImportsFrom === undefined) {
                    this._coreImportsFrom = this.isCore && getR3SymbolsFile(this.tsProgram) || null;
                }
                return this._coreImportsFrom;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NgtscProgram.prototype, "isCore", {
            get: function () {
                if (this._isCore === undefined) {
                    this._isCore = isAngularCorePackage(this.tsProgram);
                }
                return this._isCore;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NgtscProgram.prototype, "importRewriter", {
            get: function () {
                if (this._importRewriter === undefined) {
                    var coreImportsFrom = this.coreImportsFrom;
                    this._importRewriter = coreImportsFrom !== null ?
                        new imports_1.R3SymbolsImportRewriter(coreImportsFrom.fileName) :
                        new imports_1.NoopImportRewriter();
                }
                return this._importRewriter;
            },
            enumerable: true,
            configurable: true
        });
        return NgtscProgram;
    }());
    exports.NgtscProgram = NgtscProgram;
    var defaultEmitCallback = function (_a) {
        var program = _a.program, targetSourceFile = _a.targetSourceFile, writeFile = _a.writeFile, cancellationToken = _a.cancellationToken, emitOnlyDtsFiles = _a.emitOnlyDtsFiles, customTransformers = _a.customTransformers;
        return program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
    };
    function mergeEmitResults(emitResults) {
        var e_2, _a;
        var diagnostics = [];
        var emitSkipped = false;
        var emittedFiles = [];
        try {
            for (var emitResults_1 = tslib_1.__values(emitResults), emitResults_1_1 = emitResults_1.next(); !emitResults_1_1.done; emitResults_1_1 = emitResults_1.next()) {
                var er = emitResults_1_1.value;
                diagnostics.push.apply(diagnostics, tslib_1.__spread(er.diagnostics));
                emitSkipped = emitSkipped || er.emitSkipped;
                emittedFiles.push.apply(emittedFiles, tslib_1.__spread((er.emittedFiles || [])));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (emitResults_1_1 && !emitResults_1_1.done && (_a = emitResults_1.return)) _a.call(emitResults_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return { diagnostics: diagnostics, emitSkipped: emitSkipped, emittedFiles: emittedFiles };
    }
    /**
     * Find the 'r3_symbols.ts' file in the given `Program`, or return `null` if it wasn't there.
     */
    function getR3SymbolsFile(program) {
        return program.getSourceFiles().find(function (file) { return file.fileName.indexOf('r3_symbols.ts') >= 0; }) || null;
    }
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
    var ReferenceGraphAdapter = /** @class */ (function () {
        function ReferenceGraphAdapter(graph) {
            this.graph = graph;
        }
        ReferenceGraphAdapter.prototype.add = function (source) {
            var e_3, _a;
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (references_1_1 && !references_1_1.done && (_a = references_1.return)) _a.call(references_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        };
        return ReferenceGraphAdapter;
    }());
    exports.ReferenceGraphAdapter = ReferenceGraphAdapter;
    function shouldEnablePerfTracing(options) {
        return options.tracePerformance !== undefined;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsMEZBQStEO0lBRS9ELDJFQUEyTTtJQUMzTSxxRkFBbUU7SUFDbkUsaUVBQW9EO0lBQ3BELDJFQUFxRDtJQUNyRCwyRUFBa0g7SUFDbEgsMkVBQThFO0lBQzlFLG1FQUE0VjtJQUM1ViwyRUFBK0M7SUFDL0MsbUVBQTREO0lBQzVELG1GQUF5RDtJQUN6RCxxRUFBc0k7SUFDdEksdUZBQXFEO0lBQ3JELDZEQUFxRTtJQUNyRSx5RUFBc0Q7SUFDdEQsbUZBQXFEO0lBQ3JELG1FQUFrRTtJQUNsRSwrREFBK0c7SUFDL0csK0RBQXFLO0lBQ3JLLGlFQUE0QztJQUM1Qyx1RUFBNkY7SUFDN0YsNkVBQTREO0lBQzVELHVFQUFvRjtJQUNwRixzRUFBb0Q7SUFDcEQsa0ZBQXFHO0lBRXJHO1FBa0NFLHNCQUNJLFNBQWdDLEVBQVUsT0FBNEIsRUFDOUQsSUFBc0IsRUFBRSxVQUF5QjtZQUY3RCxpQkFrSEM7WUFqSDZDLFlBQU8sR0FBUCxPQUFPLENBQXFCO1lBQzlELFNBQUksR0FBSixJQUFJLENBQWtCO1lBaEMxQixnQkFBVyxHQUE2QixTQUFTLENBQUM7WUFDbEQsd0JBQW1CLEdBQWtDLElBQUksQ0FBQztZQUMxRCwyQkFBc0IsR0FBa0MsSUFBSSxDQUFDO1lBQzdELHFCQUFnQixHQUFpQyxTQUFTLENBQUM7WUFDM0Qsb0JBQWUsR0FBNkIsU0FBUyxDQUFDO1lBQ3RELGVBQVUsR0FBdUMsU0FBUyxDQUFDO1lBQzNELFlBQU8sR0FBc0IsU0FBUyxDQUFDO1lBSXZDLHlCQUFvQixHQUF3QixJQUFJLENBQUM7WUFDakQsdUJBQWtCLEdBQTRCLElBQUksQ0FBQztZQUNu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UUFBUSxDQUFDLEVBQUU7d0JBQy9ELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztxQkFDOUI7aUJBQ0Y7Ozs7Ozs7OztRQUNILENBQUM7UUFDSCw0QkFBQztJQUFELENBQUMsQUFoQkQsSUFnQkM7SUFoQlksc0RBQXFCO0lBa0JsQyxTQUFTLHVCQUF1QixDQUFDLE9BQTRCO1FBQzNELE9BQU8sT0FBTyxDQUFDLGdCQUFnQixLQUFLLFNBQVMsQ0FBQztJQUNoRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0dlbmVyYXRlZEZpbGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnLi4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge25vY29sbGFwc2VIYWNrfSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvbm9jb2xsYXBzZV9oYWNrJztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5LCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuL2Fubm90YXRpb25zJztcbmltcG9ydCB7QmFzZURlZkRlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4vYW5ub3RhdGlvbnMvc3JjL2Jhc2VfZGVmJztcbmltcG9ydCB7Q3ljbGVBbmFseXplciwgSW1wb3J0R3JhcGh9IGZyb20gJy4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ZsYXRJbmRleEdlbmVyYXRvciwgUmVmZXJlbmNlR3JhcGgsIGNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50fSBmcm9tICcuL2VudHJ5X3BvaW50JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIExvZ2ljYWxGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb219IGZyb20gJy4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5LCBBbGlhc1N0cmF0ZWd5LCBBbGlhc2luZ0hvc3QsIERlZmF1bHRJbXBvcnRUcmFja2VyLCBGaWxlVG9Nb2R1bGVBbGlhc2luZ0hvc3QsIEZpbGVUb01vZHVsZUhvc3QsIEZpbGVUb01vZHVsZVN0cmF0ZWd5LCBJbXBvcnRSZXdyaXRlciwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsU3RhdGV9IGZyb20gJy4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtJbmRleGVkQ29tcG9uZW50LCBJbmRleGluZ0NvbnRleHR9IGZyb20gJy4vaW5kZXhlcic7XG5pbXBvcnQge2dlbmVyYXRlQW5hbHlzaXN9IGZyb20gJy4vaW5kZXhlci9zcmMvdHJhbnNmb3JtJztcbmltcG9ydCB7Q29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlcn0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtOT09QX1BFUkZfUkVDT1JERVIsIFBlcmZSZWNvcmRlciwgUGVyZlRyYWNrZXJ9IGZyb20gJy4vcGVyZic7XG5pbXBvcnQge1R5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SG9zdFJlc291cmNlTG9hZGVyfSBmcm9tICcuL3Jlc291cmNlX2xvYWRlcic7XG5pbXBvcnQge05nTW9kdWxlUm91dGVBbmFseXplciwgZW50cnlQb2ludEtleUZvcn0gZnJvbSAnLi9yb3V0aW5nJztcbmltcG9ydCB7Q29tcG91bmRDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4vc2NvcGUnO1xuaW1wb3J0IHtGYWN0b3J5R2VuZXJhdG9yLCBGYWN0b3J5SW5mbywgR2VuZXJhdGVkU2hpbXNIb3N0V3JhcHBlciwgU2hpbUdlbmVyYXRvciwgU3VtbWFyeUdlbmVyYXRvciwgVHlwZUNoZWNrU2hpbUdlbmVyYXRvciwgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybX0gZnJvbSAnLi9zaGltcyc7XG5pbXBvcnQge2l2eVN3aXRjaFRyYW5zZm9ybX0gZnJvbSAnLi9zd2l0Y2gnO1xuaW1wb3J0IHtJdnlDb21waWxhdGlvbiwgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5LCBpdnlUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL3RyYW5zZm9ybSc7XG5pbXBvcnQge2FsaWFzVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi90cmFuc2Zvcm0vc3JjL2FsaWFzJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNraW5nQ29uZmlnLCB0eXBlQ2hlY2tGaWxlUGF0aH0gZnJvbSAnLi90eXBlY2hlY2snO1xuaW1wb3J0IHtub3JtYWxpemVTZXBhcmF0b3JzfSBmcm9tICcuL3V0aWwvc3JjL3BhdGgnO1xuaW1wb3J0IHtnZXRSb290RGlycywgZ2V0U291cmNlRmlsZU9yTnVsbCwgaXNEdHNQYXRoLCByZXNvbHZlTW9kdWxlTmFtZX0gZnJvbSAnLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuZXhwb3J0IGNsYXNzIE5ndHNjUHJvZ3JhbSBpbXBsZW1lbnRzIGFwaS5Qcm9ncmFtIHtcbiAgcHJpdmF0ZSB0c1Byb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgcmV1c2VUc1Byb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgcmVzb3VyY2VNYW5hZ2VyOiBIb3N0UmVzb3VyY2VMb2FkZXI7XG4gIHByaXZhdGUgY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9ufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBmYWN0b3J5VG9Tb3VyY2VJbmZvOiBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz58bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc291cmNlVG9GYWN0b3J5U3ltYm9sczogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+fG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9jb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGV8bnVsbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2ltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3JlZmxlY3RvcjogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfaXNDb3JlOiBib29sZWFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXTtcbiAgcHJpdmF0ZSBjbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGVudHJ5UG9pbnQ6IHRzLlNvdXJjZUZpbGV8bnVsbDtcbiAgcHJpdmF0ZSBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZmxhdEluZGV4R2VuZXJhdG9yOiBGbGF0SW5kZXhHZW5lcmF0b3J8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyfG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyfG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBmaWxlVG9Nb2R1bGVIb3N0OiBGaWxlVG9Nb2R1bGVIb3N0fG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRlZmF1bHRJbXBvcnRUcmFja2VyOiBEZWZhdWx0SW1wb3J0VHJhY2tlcjtcbiAgcHJpdmF0ZSBwZXJmUmVjb3JkZXI6IFBlcmZSZWNvcmRlciA9IE5PT1BfUEVSRl9SRUNPUkRFUjtcbiAgcHJpdmF0ZSBwZXJmVHJhY2tlcjogUGVyZlRyYWNrZXJ8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaW5jcmVtZW50YWxTdGF0ZTogSW5jcmVtZW50YWxTdGF0ZTtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tGaWxlUGF0aDogQWJzb2x1dGVGc1BhdGg7XG5cbiAgcHJpdmF0ZSBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+fG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBob3N0OiBhcGkuQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogTmd0c2NQcm9ncmFtKSB7XG4gICAgaWYgKHNob3VsZEVuYWJsZVBlcmZUcmFjaW5nKG9wdGlvbnMpKSB7XG4gICAgICB0aGlzLnBlcmZUcmFja2VyID0gUGVyZlRyYWNrZXIuemVyb2VkVG9Ob3coKTtcbiAgICAgIHRoaXMucGVyZlJlY29yZGVyID0gdGhpcy5wZXJmVHJhY2tlcjtcbiAgICB9XG5cbiAgICB0aGlzLm1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9XG4gICAgICAgIHRoaXMuaG9zdC5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMgJiYgdGhpcy5ob3N0LmdldE1vZGlmaWVkUmVzb3VyY2VGaWxlcygpIHx8IG51bGw7XG4gICAgdGhpcy5yb290RGlycyA9IGdldFJvb3REaXJzKGhvc3QsIG9wdGlvbnMpO1xuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhb3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjtcbiAgICB0aGlzLnJlc291cmNlTWFuYWdlciA9IG5ldyBIb3N0UmVzb3VyY2VMb2FkZXIoaG9zdCwgb3B0aW9ucyk7XG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgdGhlIGZhbGxiYWNrIHRvIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXMgYWZ0ZXIgdmVyaWZ5aW5nIHRoYXQgdGhlIHJlc3Qgb2ZcbiAgICAvLyBvdXIgYnVpbGQgdG9vbGluZyBpcyBubyBsb25nZXIgcmVseWluZyBvbiBpdC5cbiAgICBjb25zdCBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzID0gb3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzIHx8IGZhbHNlO1xuICAgIGNvbnN0IHNob3VsZEdlbmVyYXRlRmFjdG9yeVNoaW1zID0gb3B0aW9ucy5nZW5lcmF0ZU5nRmFjdG9yeVNoaW1zICE9PSB1bmRlZmluZWQgP1xuICAgICAgICBvcHRpb25zLmdlbmVyYXRlTmdGYWN0b3J5U2hpbXMgOlxuICAgICAgICBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzO1xuICAgIGNvbnN0IHNob3VsZEdlbmVyYXRlU3VtbWFyeVNoaW1zID0gb3B0aW9ucy5nZW5lcmF0ZU5nU3VtbWFyeVNoaW1zICE9PSB1bmRlZmluZWQgP1xuICAgICAgICBvcHRpb25zLmdlbmVyYXRlTmdTdW1tYXJ5U2hpbXMgOlxuICAgICAgICBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzO1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRSb290TmFtZXMgPSByb290TmFtZXMubWFwKG4gPT4gYWJzb2x1dGVGcm9tKG4pKTtcbiAgICBpZiAoaG9zdC5maWxlTmFtZVRvTW9kdWxlTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmZpbGVUb01vZHVsZUhvc3QgPSBob3N0IGFzIEZpbGVUb01vZHVsZUhvc3Q7XG4gICAgfVxuICAgIGxldCByb290RmlsZXMgPSBbLi4ucm9vdE5hbWVzXTtcblxuICAgIGNvbnN0IGdlbmVyYXRvcnM6IFNoaW1HZW5lcmF0b3JbXSA9IFtdO1xuICAgIGxldCBzdW1tYXJ5R2VuZXJhdG9yOiBTdW1tYXJ5R2VuZXJhdG9yfG51bGwgPSBudWxsO1xuICAgIGlmIChzaG91bGRHZW5lcmF0ZVN1bW1hcnlTaGltcykge1xuICAgICAgLy8gU3VtbWFyeSBnZW5lcmF0aW9uLlxuICAgICAgc3VtbWFyeUdlbmVyYXRvciA9IFN1bW1hcnlHZW5lcmF0b3IuZm9yUm9vdEZpbGVzKG5vcm1hbGl6ZWRSb290TmFtZXMpO1xuICAgICAgZ2VuZXJhdG9ycy5wdXNoKHN1bW1hcnlHZW5lcmF0b3IpO1xuICAgIH1cblxuICAgIGlmIChzaG91bGRHZW5lcmF0ZUZhY3RvcnlTaGltcykge1xuICAgICAgLy8gRmFjdG9yeSBnZW5lcmF0aW9uLlxuICAgICAgY29uc3QgZmFjdG9yeUdlbmVyYXRvciA9IEZhY3RvcnlHZW5lcmF0b3IuZm9yUm9vdEZpbGVzKG5vcm1hbGl6ZWRSb290TmFtZXMpO1xuICAgICAgY29uc3QgZmFjdG9yeUZpbGVNYXAgPSBmYWN0b3J5R2VuZXJhdG9yLmZhY3RvcnlGaWxlTWFwO1xuICAgICAgdGhpcy5mYWN0b3J5VG9Tb3VyY2VJbmZvID0gbmV3IE1hcDxzdHJpbmcsIEZhY3RvcnlJbmZvPigpO1xuICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpO1xuICAgICAgZmFjdG9yeUZpbGVNYXAuZm9yRWFjaCgoc291cmNlRmlsZVBhdGgsIGZhY3RvcnlQYXRoKSA9PiB7XG4gICAgICAgIGNvbnN0IG1vZHVsZVN5bWJvbE5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scyAhLnNldChzb3VyY2VGaWxlUGF0aCwgbW9kdWxlU3ltYm9sTmFtZXMpO1xuICAgICAgICB0aGlzLmZhY3RvcnlUb1NvdXJjZUluZm8gIS5zZXQoZmFjdG9yeVBhdGgsIHtzb3VyY2VGaWxlUGF0aCwgbW9kdWxlU3ltYm9sTmFtZXN9KTtcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBmYWN0b3J5RmlsZU5hbWVzID0gQXJyYXkuZnJvbShmYWN0b3J5RmlsZU1hcC5rZXlzKCkpO1xuICAgICAgcm9vdEZpbGVzLnB1c2goLi4uZmFjdG9yeUZpbGVOYW1lcyk7XG4gICAgICBnZW5lcmF0b3JzLnB1c2goZmFjdG9yeUdlbmVyYXRvcik7XG4gICAgfVxuXG4gICAgLy8gRG9uZSBzZXBhcmF0ZWx5IHRvIHByZXNlcnZlIHRoZSBvcmRlciBvZiBmYWN0b3J5IGZpbGVzIGJlZm9yZSBzdW1tYXJ5IGZpbGVzIGluIHJvb3RGaWxlcy5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHZhbGlkYXRlIHRoYXQgdGhpcyBpcyBuZWNlc3NhcnkuXG4gICAgaWYgKHNob3VsZEdlbmVyYXRlU3VtbWFyeVNoaW1zKSB7XG4gICAgICByb290RmlsZXMucHVzaCguLi5zdW1tYXJ5R2VuZXJhdG9yICEuZ2V0U3VtbWFyeUZpbGVOYW1lcygpKTtcbiAgICB9XG5cbiAgICB0aGlzLnR5cGVDaGVja0ZpbGVQYXRoID0gdHlwZUNoZWNrRmlsZVBhdGgodGhpcy5yb290RGlycyk7XG4gICAgZ2VuZXJhdG9ycy5wdXNoKG5ldyBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yKHRoaXMudHlwZUNoZWNrRmlsZVBhdGgpKTtcbiAgICByb290RmlsZXMucHVzaCh0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKTtcblxuICAgIGxldCBlbnRyeVBvaW50OiBBYnNvbHV0ZUZzUGF0aHxudWxsID0gbnVsbDtcbiAgICBpZiAob3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSAhPSBudWxsICYmIG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUgIT09ICcnKSB7XG4gICAgICBlbnRyeVBvaW50ID0gZmluZEZsYXRJbmRleEVudHJ5UG9pbnQobm9ybWFsaXplZFJvb3ROYW1lcyk7XG4gICAgICBpZiAoZW50cnlQb2ludCA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGlzIGVycm9yIG1lc3NhZ2UgdGFsa3Mgc3BlY2lmaWNhbGx5IGFib3V0IGhhdmluZyBhIHNpbmdsZSAudHMgZmlsZSBpbiBcImZpbGVzXCIuIEhvd2V2ZXJcbiAgICAgICAgLy8gdGhlIGFjdHVhbCBsb2dpYyBpcyBhIGJpdCBtb3JlIHBlcm1pc3NpdmUuIElmIGEgc2luZ2xlIGZpbGUgZXhpc3RzLCB0aGF0IHdpbGwgYmUgdGFrZW4sXG4gICAgICAgIC8vIG90aGVyd2lzZSB0aGUgaGlnaGVzdCBsZXZlbCAoc2hvcnRlc3QgcGF0aCkgXCJpbmRleC50c1wiIGZpbGUgd2lsbCBiZSB1c2VkIGFzIHRoZSBmbGF0XG4gICAgICAgIC8vIG1vZHVsZSBlbnRyeSBwb2ludCBpbnN0ZWFkLiBJZiBuZWl0aGVyIG9mIHRoZXNlIGNvbmRpdGlvbnMgYXBwbHksIHRoZSBlcnJvciBiZWxvdyBpc1xuICAgICAgICAvLyBnaXZlbi5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGhlIHVzZXIgaXMgbm90IGluZm9ybWVkIGFib3V0IHRoZSBcImluZGV4LnRzXCIgb3B0aW9uIGFzIHRoaXMgYmVoYXZpb3IgaXMgZGVwcmVjYXRlZCAtXG4gICAgICAgIC8vIGFuIGV4cGxpY2l0IGVudHJ5cG9pbnQgc2hvdWxkIGFsd2F5cyBiZSBzcGVjaWZpZWQuXG4gICAgICAgIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICBjb2RlOiBuZ0Vycm9yQ29kZShFcnJvckNvZGUuQ09ORklHX0ZMQVRfTU9EVUxFX05PX0lOREVYKSxcbiAgICAgICAgICBmaWxlOiB1bmRlZmluZWQsXG4gICAgICAgICAgc3RhcnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgICAgICBtZXNzYWdlVGV4dDpcbiAgICAgICAgICAgICAgJ0FuZ3VsYXIgY29tcGlsZXIgb3B0aW9uIFwiZmxhdE1vZHVsZU91dEZpbGVcIiByZXF1aXJlcyBvbmUgYW5kIG9ubHkgb25lIC50cyBmaWxlIGluIHRoZSBcImZpbGVzXCIgZmllbGQuJyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmbGF0TW9kdWxlSWQgPSBvcHRpb25zLmZsYXRNb2R1bGVJZCB8fCBudWxsO1xuICAgICAgICBjb25zdCBmbGF0TW9kdWxlT3V0RmlsZSA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMob3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSk7XG4gICAgICAgIHRoaXMuZmxhdEluZGV4R2VuZXJhdG9yID1cbiAgICAgICAgICAgIG5ldyBGbGF0SW5kZXhHZW5lcmF0b3IoZW50cnlQb2ludCwgZmxhdE1vZHVsZU91dEZpbGUsIGZsYXRNb2R1bGVJZCk7XG4gICAgICAgIGdlbmVyYXRvcnMucHVzaCh0aGlzLmZsYXRJbmRleEdlbmVyYXRvcik7XG4gICAgICAgIHJvb3RGaWxlcy5wdXNoKHRoaXMuZmxhdEluZGV4R2VuZXJhdG9yLmZsYXRJbmRleFBhdGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChnZW5lcmF0b3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIEZJWE1FOiBSZW1vdmUgdGhlIGFueSBjYXN0IG9uY2UgZ29vZ2xlMyBpcyBmdWxseSBvbiBUUzMuNi5cbiAgICAgIHRoaXMuaG9zdCA9IChuZXcgR2VuZXJhdGVkU2hpbXNIb3N0V3JhcHBlcihob3N0LCBnZW5lcmF0b3JzKSBhcyBhbnkpO1xuICAgIH1cblxuICAgIHRoaXMudHNQcm9ncmFtID1cbiAgICAgICAgdHMuY3JlYXRlUHJvZ3JhbShyb290RmlsZXMsIG9wdGlvbnMsIHRoaXMuaG9zdCwgb2xkUHJvZ3JhbSAmJiBvbGRQcm9ncmFtLnJldXNlVHNQcm9ncmFtKTtcbiAgICB0aGlzLnJldXNlVHNQcm9ncmFtID0gdGhpcy50c1Byb2dyYW07XG5cbiAgICB0aGlzLmVudHJ5UG9pbnQgPSBlbnRyeVBvaW50ICE9PSBudWxsID8gZ2V0U291cmNlRmlsZU9yTnVsbCh0aGlzLnRzUHJvZ3JhbSwgZW50cnlQb2ludCkgOiBudWxsO1xuICAgIHRoaXMubW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIodGhpcy50c1Byb2dyYW0sIG9wdGlvbnMsIHRoaXMuaG9zdCk7XG4gICAgdGhpcy5jeWNsZUFuYWx5emVyID0gbmV3IEN5Y2xlQW5hbHl6ZXIobmV3IEltcG9ydEdyYXBoKHRoaXMubW9kdWxlUmVzb2x2ZXIpKTtcbiAgICB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyID0gbmV3IERlZmF1bHRJbXBvcnRUcmFja2VyKCk7XG4gICAgaWYgKG9sZFByb2dyYW0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5pbmNyZW1lbnRhbFN0YXRlID0gSW5jcmVtZW50YWxTdGF0ZS5mcmVzaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluY3JlbWVudGFsU3RhdGUgPSBJbmNyZW1lbnRhbFN0YXRlLnJlY29uY2lsZShcbiAgICAgICAgICBvbGRQcm9ncmFtLmluY3JlbWVudGFsU3RhdGUsIG9sZFByb2dyYW0ucmV1c2VUc1Byb2dyYW0sIHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgIHRoaXMubW9kaWZpZWRSZXNvdXJjZUZpbGVzKTtcbiAgICB9XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7IHJldHVybiB0aGlzLnRzUHJvZ3JhbTsgfVxuXG4gIGdldFRzT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0T3B0aW9uc0RpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3MoXG4gICAgICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZXx1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PGFwaS5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBmaWxlTmFtZT86IHN0cmluZ3x1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gWy4uLmNvbXBpbGF0aW9uLmRpYWdub3N0aWNzLCAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKV07XG4gICAgaWYgKHRoaXMuZW50cnlQb2ludCAhPT0gbnVsbCAmJiB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgICAgICAgdGhpcy5lbnRyeVBvaW50LCB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoKSk7XG4gICAgfVxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGFzeW5jIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgIH1cbiAgICBjb25zdCBhbmFseXplU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplJyk7XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwodGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZmlsZSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhbmFseXplRmlsZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZUZpbGUnLCBmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYW5hbHlzaXNQcm9taXNlID0gdGhpcy5jb21waWxhdGlvbiAhLmFuYWx5emVBc3luYyhmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5hbHlzaXNQcm9taXNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucGVyZlJlY29yZGVyLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuYWx5c2lzUHJvbWlzZSA9IGFuYWx5c2lzUHJvbWlzZS50aGVuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhbmFseXNpc1Byb21pc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHJlc3VsdCk6IHJlc3VsdCBpcyBQcm9taXNlPHZvaWQ+ID0+IHJlc3VsdCAhPT0gdW5kZWZpbmVkKSk7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplU3Bhbik7XG4gICAgdGhpcy5jb21waWxhdGlvbi5yZXNvbHZlKCk7XG4gIH1cblxuICBsaXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlPzogc3RyaW5nfHVuZGVmaW5lZCk6IGFwaS5MYXp5Um91dGVbXSB7XG4gICAgaWYgKGVudHJ5Um91dGUpIHtcbiAgICAgIC8vIE5vdGU6XG4gICAgICAvLyBUaGlzIHJlc29sdXRpb24gc3RlcCBpcyBoZXJlIHRvIG1hdGNoIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgb2xkIGBBb3RDb21waWxlckhvc3RgIChzZWVcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvYmxvYi81MDczMmUxNTYvcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvY29tcGlsZXJfaG9zdC50cyNMMTc1LUwxODgpLlxuICAgICAgLy9cbiAgICAgIC8vIGBAYW5ndWxhci9jbGlgIHdpbGwgYWx3YXlzIGNhbGwgdGhpcyBBUEkgd2l0aCBhbiBhYnNvbHV0ZSBwYXRoLCBzbyB0aGUgcmVzb2x1dGlvbiBzdGVwIGlzXG4gICAgICAvLyBub3QgbmVjZXNzYXJ5LCBidXQga2VlcGluZyBpdCBiYWNrd2FyZHMgY29tcGF0aWJsZSBpbiBjYXNlIHNvbWVvbmUgZWxzZSBpcyB1c2luZyB0aGUgQVBJLlxuXG4gICAgICAvLyBSZWxhdGl2ZSBlbnRyeSBwYXRocyBhcmUgZGlzYWxsb3dlZC5cbiAgICAgIGlmIChlbnRyeVJvdXRlLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgRmFpbGVkIHRvIGxpc3QgbGF6eSByb3V0ZXM6IFJlc29sdXRpb24gb2YgcmVsYXRpdmUgcGF0aHMgKCR7ZW50cnlSb3V0ZX0pIGlzIG5vdCBzdXBwb3J0ZWQuYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vbi1yZWxhdGl2ZSBlbnRyeSBwYXRocyBmYWxsIGludG8gb25lIG9mIHRoZSBmb2xsb3dpbmcgY2F0ZWdvcmllczpcbiAgICAgIC8vIC0gQWJzb2x1dGUgc3lzdGVtIHBhdGhzIChlLmcuIGAvZm9vL2Jhci9teS1wcm9qZWN0L215LW1vZHVsZWApLCB3aGljaCBhcmUgdW5hZmZlY3RlZCBieSB0aGVcbiAgICAgIC8vICAgbG9naWMgYmVsb3cuXG4gICAgICAvLyAtIFBhdGhzIHRvIGVudGVybmFsIG1vZHVsZXMgKGUuZy4gYHNvbWUtbGliYCkuXG4gICAgICAvLyAtIFBhdGhzIG1hcHBlZCB0byBkaXJlY3RvcmllcyBpbiBgdHNjb25maWcuanNvbmAgKGUuZy4gYHNoYXJlZC9teS1tb2R1bGVgKS5cbiAgICAgIC8vICAgKFNlZSBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9tb2R1bGUtcmVzb2x1dGlvbi5odG1sI3BhdGgtbWFwcGluZy4pXG4gICAgICAvL1xuICAgICAgLy8gSW4gYWxsIGNhc2VzIGFib3ZlLCB0aGUgYGNvbnRhaW5pbmdGaWxlYCBhcmd1bWVudCBpcyBpZ25vcmVkLCBzbyB3ZSBjYW4ganVzdCB0YWtlIHRoZSBmaXJzdFxuICAgICAgLy8gb2YgdGhlIHJvb3QgZmlsZXMuXG4gICAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IHRoaXMudHNQcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKVswXTtcbiAgICAgIGNvbnN0IFtlbnRyeVBhdGgsIG1vZHVsZU5hbWVdID0gZW50cnlSb3V0ZS5zcGxpdCgnIycpO1xuICAgICAgY29uc3QgcmVzb2x2ZWRNb2R1bGUgPSByZXNvbHZlTW9kdWxlTmFtZShlbnRyeVBhdGgsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCk7XG5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBlbnRyeVJvdXRlID0gZW50cnlQb2ludEtleUZvcihyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLCBtb2R1bGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIHRoaXMucm91dGVBbmFseXplciAhLmxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGUpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBhcGkuTGlicmFyeVN1bW1hcnk+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbmFseXplZCgpOiBJdnlDb21waWxhdGlvbiB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgYW5hbHl6ZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZScpO1xuICAgICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG4gICAgICB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgLmZpbHRlcihmaWxlID0+ICFmaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKVxuICAgICAgICAgIC5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgYW5hbHl6ZUZpbGVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emVGaWxlJywgZmlsZSk7XG4gICAgICAgICAgICB0aGlzLmNvbXBpbGF0aW9uICEuYW5hbHl6ZVN5bmMoZmlsZSk7XG4gICAgICAgICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVGaWxlU3Bhbik7XG4gICAgICAgICAgfSk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVTcGFuKTtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24ucmVzb2x2ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxhdGlvbjtcbiAgfVxuXG4gIGVtaXQob3B0cz86IHtcbiAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICBlbWl0Q2FsbGJhY2s/OiBhcGkuVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogYXBpLlRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrXG4gIH0pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCBlbWl0Q2FsbGJhY2sgPSBvcHRzICYmIG9wdHMuZW1pdENhbGxiYWNrIHx8IGRlZmF1bHRFbWl0Q2FsbGJhY2s7XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IHdyaXRlRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPVxuICAgICAgICAoZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkgfCB1bmRlZmluZWQsXG4gICAgICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnwgdW5kZWZpbmVkKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCAmJiBmaWxlTmFtZS5lbmRzV2l0aCgnLmpzJykpIHtcbiAgICAgICAgICAgIGRhdGEgPSBub2NvbGxhcHNlSGFjayhkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5ob3N0LndyaXRlRmlsZShmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCBjdXN0b21UcmFuc2Zvcm1zID0gb3B0cyAmJiBvcHRzLmN1c3RvbVRyYW5zZm9ybWVycztcblxuICAgIGNvbnN0IGJlZm9yZVRyYW5zZm9ybXMgPSBbXG4gICAgICBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGNvbXBpbGF0aW9uLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pbXBvcnRSZXdyaXRlciwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkKSxcbiAgICAgIGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi5leHBvcnRTdGF0ZW1lbnRzKSBhcyB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4sXG4gICAgICB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLmltcG9ydFByZXNlcnZpbmdUcmFuc2Zvcm1lcigpLFxuICAgIF07XG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zID0gW1xuICAgICAgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uKSxcbiAgICBdO1xuXG4gICAgLy8gT25seSBhZGQgYWxpYXNpbmcgcmUtZXhwb3J0cyB0byB0aGUgLmQudHMgb3V0cHV0IGlmIHRoZSBgQWxpYXNpbmdIb3N0YCByZXF1ZXN0cyBpdC5cbiAgICBpZiAodGhpcy5hbGlhc2luZ0hvc3QgIT09IG51bGwgJiYgdGhpcy5hbGlhc2luZ0hvc3QuYWxpYXNFeHBvcnRzSW5EdHMpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zVHJhbnNmb3Jtcy5wdXNoKGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi5leHBvcnRTdGF0ZW1lbnRzKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbyAhPT0gbnVsbCkge1xuICAgICAgYmVmb3JlVHJhbnNmb3Jtcy5wdXNoKFxuICAgICAgICAgIGdlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm0odGhpcy5mYWN0b3J5VG9Tb3VyY2VJbmZvLCB0aGlzLmltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaChpdnlTd2l0Y2hUcmFuc2Zvcm0pO1xuICAgIGlmIChjdXN0b21UcmFuc2Zvcm1zICYmIGN1c3RvbVRyYW5zZm9ybXMuYmVmb3JlVHMpIHtcbiAgICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaCguLi5jdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzKTtcbiAgICB9XG5cbiAgICBjb25zdCBlbWl0U3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdlbWl0Jyk7XG4gICAgY29uc3QgZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSA9IFtdO1xuXG4gICAgY29uc3QgdHlwZUNoZWNrRmlsZSA9IGdldFNvdXJjZUZpbGVPck51bGwodGhpcy50c1Byb2dyYW0sIHRoaXMudHlwZUNoZWNrRmlsZVBhdGgpO1xuXG4gICAgZm9yIChjb25zdCB0YXJnZXRTb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICh0YXJnZXRTb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlIHx8IHRhcmdldFNvdXJjZUZpbGUgPT09IHR5cGVDaGVja0ZpbGUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmluY3JlbWVudGFsU3RhdGUuc2FmZVRvU2tpcCh0YXJnZXRTb3VyY2VGaWxlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmlsZUVtaXRTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2VtaXRGaWxlJywgdGFyZ2V0U291cmNlRmlsZSk7XG4gICAgICBlbWl0UmVzdWx0cy5wdXNoKGVtaXRDYWxsYmFjayh7XG4gICAgICAgIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZW1pdE9ubHlEdHNGaWxlczogZmFsc2UsIHdyaXRlRmlsZSxcbiAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgYmVmb3JlOiBiZWZvcmVUcmFuc2Zvcm1zLFxuICAgICAgICAgIGFmdGVyOiBjdXN0b21UcmFuc2Zvcm1zICYmIGN1c3RvbVRyYW5zZm9ybXMuYWZ0ZXJUcyxcbiAgICAgICAgICBhZnRlckRlY2xhcmF0aW9uczogYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zLFxuICAgICAgICB9LFxuICAgICAgfSkpO1xuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChmaWxlRW1pdFNwYW4pO1xuICAgIH1cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGVtaXRTcGFuKTtcblxuICAgIGlmICh0aGlzLnBlcmZUcmFja2VyICE9PSBudWxsICYmIHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucGVyZlRyYWNrZXIuc2VyaWFsaXplVG9GaWxlKHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlLCB0aGlzLmhvc3QpO1xuICAgIH1cblxuICAgIC8vIFJ1biB0aGUgZW1pdCwgaW5jbHVkaW5nIGEgY3VzdG9tIHRyYW5zZm9ybWVyIHRoYXQgd2lsbCBkb3dubGV2ZWwgdGhlIEl2eSBkZWNvcmF0b3JzIGluIGNvZGUuXG4gICAgcmV0dXJuICgob3B0cyAmJiBvcHRzLm1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaykgfHwgbWVyZ2VFbWl0UmVzdWx0cykoZW1pdFJlc3VsdHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIC8vIFNraXAgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpZiBpdCdzIGRpc2FibGVkLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuaXZ5VGVtcGxhdGVUeXBlQ2hlY2sgPT09IGZhbHNlICYmXG4gICAgICAgIHRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2sgIT09IHRydWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIC8vIFJ1biB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nLlxuXG4gICAgLy8gRmlyc3Qgc2VsZWN0IGEgdHlwZS1jaGVja2luZyBjb25maWd1cmF0aW9uLCBiYXNlZCBvbiB3aGV0aGVyIGZ1bGwgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpc1xuICAgIC8vIHJlcXVlc3RlZC5cbiAgICBsZXQgdHlwZUNoZWNraW5nQ29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWc7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IHRydWUsXG4gICAgICAgIGNoZWNrUXVlcmllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVGVtcGxhdGVCb2RpZXM6IHRydWUsXG4gICAgICAgIGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nczogdHJ1ZSxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IHRydWUsXG4gICAgICAgIC8vIEV2ZW4gaW4gZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIERPTSBiaW5kaW5nIGNoZWNrcyBhcmUgbm90IHF1aXRlIHJlYWR5IHlldC5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiB0cnVlLFxuICAgICAgICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogdHJ1ZSxcbiAgICAgICAgLy8gQ2hlY2tpbmcgb2YgRE9NIGV2ZW50cyBjdXJyZW50bHkgaGFzIGFuIGFkdmVyc2UgZWZmZWN0IG9uIGRldmVsb3BlciBleHBlcmllbmNlLFxuICAgICAgICAvLyBlLmcuIGZvciBgPGlucHV0IChibHVyKT1cInVwZGF0ZSgkZXZlbnQudGFyZ2V0LnZhbHVlKVwiPmAgZW5hYmxpbmcgdGhpcyBjaGVjayByZXN1bHRzIGluOlxuICAgICAgICAvLyAtIGVycm9yIFRTMjUzMTogT2JqZWN0IGlzIHBvc3NpYmx5ICdudWxsJy5cbiAgICAgICAgLy8gLSBlcnJvciBUUzIzMzk6IFByb3BlcnR5ICd2YWx1ZScgZG9lcyBub3QgZXhpc3Qgb24gdHlwZSAnRXZlbnRUYXJnZXQnLlxuICAgICAgICBjaGVja1R5cGVPZkRvbUV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IHRydWUsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IHRydWUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcgPSB7XG4gICAgICAgIGFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbUV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IGZhbHNlLFxuICAgICAgICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzOiBmYWxzZSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRXhlY3V0ZSB0aGUgdHlwZUNoZWNrIHBoYXNlIG9mIGVhY2ggZGVjb3JhdG9yIGluIHRoZSBwcm9ncmFtLlxuICAgIGNvbnN0IHByZXBTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ3R5cGVDaGVja1ByZXAnKTtcbiAgICBjb25zdCBjdHggPSBuZXcgVHlwZUNoZWNrQ29udGV4dCh0eXBlQ2hlY2tpbmdDb25maWcsIHRoaXMucmVmRW1pdHRlciAhLCB0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKTtcbiAgICBjb21waWxhdGlvbi50eXBlQ2hlY2soY3R4KTtcbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKHByZXBTcGFuKTtcblxuICAgIC8vIEdldCB0aGUgZGlhZ25vc3RpY3MuXG4gICAgY29uc3QgdHlwZUNoZWNrU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCd0eXBlQ2hlY2tEaWFnbm9zdGljcycpO1xuICAgIGNvbnN0IHtkaWFnbm9zdGljcywgcHJvZ3JhbX0gPVxuICAgICAgICBjdHguY2FsY3VsYXRlVGVtcGxhdGVEaWFnbm9zdGljcyh0aGlzLnRzUHJvZ3JhbSwgdGhpcy5ob3N0LCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AodHlwZUNoZWNrU3Bhbik7XG4gICAgdGhpcy5yZXVzZVRzUHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXRJbmRleGVkQ29tcG9uZW50cygpOiBNYXA8dHMuRGVjbGFyYXRpb24sIEluZGV4ZWRDb21wb25lbnQ+IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBjb250ZXh0ID0gbmV3IEluZGV4aW5nQ29udGV4dCgpO1xuICAgIGNvbXBpbGF0aW9uLmluZGV4KGNvbnRleHQpO1xuICAgIHJldHVybiBnZW5lcmF0ZUFuYWx5c2lzKGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlQ29tcGlsYXRpb24oKTogSXZ5Q29tcGlsYXRpb24ge1xuICAgIGNvbnN0IGNoZWNrZXIgPSB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBSZWZlcmVuY2VFbWl0dGVyLlxuICAgIGlmICh0aGlzLmZpbGVUb01vZHVsZUhvc3QgPT09IG51bGwgfHwgIXRoaXMub3B0aW9ucy5fdXNlSG9zdEZvckltcG9ydEdlbmVyYXRpb24pIHtcbiAgICAgIC8vIFRoZSBDb21waWxlckhvc3QgZG9lc24ndCBoYXZlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyBidWlsZCBhbiBOUE0tY2VudHJpYyByZWZlcmVuY2VcbiAgICAgIC8vIHJlc29sdXRpb24gc3RyYXRlZ3kuXG4gICAgICB0aGlzLnJlZkVtaXR0ZXIgPSBuZXcgUmVmZXJlbmNlRW1pdHRlcihbXG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gdXNlIGxvY2FsIGlkZW50aWZpZXJzIGlmIGF2YWlsYWJsZS5cbiAgICAgICAgbmV3IExvY2FsSWRlbnRpZmllclN0cmF0ZWd5KCksXG4gICAgICAgIC8vIE5leHQsIGF0dGVtcHQgdG8gdXNlIGFuIGFic29sdXRlIGltcG9ydC5cbiAgICAgICAgbmV3IEFic29sdXRlTW9kdWxlU3RyYXRlZ3koXG4gICAgICAgICAgICB0aGlzLnRzUHJvZ3JhbSwgY2hlY2tlciwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgICAgLy8gRmluYWxseSwgY2hlY2sgaWYgdGhlIHJlZmVyZW5jZSBpcyBiZWluZyB3cml0dGVuIGludG8gYSBmaWxlIHdpdGhpbiB0aGUgcHJvamVjdCdzIGxvZ2ljYWxcbiAgICAgICAgLy8gZmlsZSBzeXN0ZW0sIGFuZCB1c2UgYSByZWxhdGl2ZSBpbXBvcnQgaWYgc28uIElmIHRoaXMgZmFpbHMsIFJlZmVyZW5jZUVtaXR0ZXIgd2lsbCB0aHJvd1xuICAgICAgICAvLyBhbiBlcnJvci5cbiAgICAgICAgbmV3IExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3kodGhpcy5yZWZsZWN0b3IsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbSh0aGlzLnJvb3REaXJzKSksXG4gICAgICBdKTtcblxuICAgICAgLy8gSWYgYW4gZW50cnlwb2ludCBpcyBwcmVzZW50LCB0aGVuIGFsbCB1c2VyIGltcG9ydHMgc2hvdWxkIGJlIGRpcmVjdGVkIHRocm91Z2ggdGhlXG4gICAgICAvLyBlbnRyeXBvaW50IGFuZCBwcml2YXRlIGV4cG9ydHMgYXJlIG5vdCBuZWVkZWQuIFRoZSBjb21waWxlciB3aWxsIHZhbGlkYXRlIHRoYXQgYWxsIHB1YmxpY2x5XG4gICAgICAvLyB2aXNpYmxlIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIGltcG9ydGFibGUgdmlhIHRoaXMgZW50cnlwb2ludC5cbiAgICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgPT09IG51bGwgJiYgdGhpcy5vcHRpb25zLmdlbmVyYXRlRGVlcFJlZXhwb3J0cyA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBObyBlbnRyeXBvaW50IGlzIHByZXNlbnQgYW5kIGRlZXAgcmUtZXhwb3J0cyB3ZXJlIHJlcXVlc3RlZCwgc28gY29uZmlndXJlIHRoZSBhbGlhc2luZ1xuICAgICAgICAvLyBzeXN0ZW0gdG8gZ2VuZXJhdGUgdGhlbS5cbiAgICAgICAgdGhpcy5hbGlhc2luZ0hvc3QgPSBuZXcgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCh0aGlzLnJlZmxlY3Rvcik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBDb21waWxlckhvc3Qgc3VwcG9ydHMgZmlsZU5hbWVUb01vZHVsZU5hbWUsIHNvIHVzZSB0aGF0IHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgIHRoaXMucmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgYWxpYXNlZCByZWZlcmVuY2VzICh0aGlzIGlzIGEgd29ya2Fyb3VuZCB0byBTdHJpY3REZXBzIGNoZWNrcykuXG4gICAgICAgIG5ldyBBbGlhc1N0cmF0ZWd5KCksXG4gICAgICAgIC8vIFRoZW4gdXNlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lIHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgICAgbmV3IEZpbGVUb01vZHVsZVN0cmF0ZWd5KHRoaXMucmVmbGVjdG9yLCB0aGlzLmZpbGVUb01vZHVsZUhvc3QpLFxuICAgICAgXSk7XG4gICAgICB0aGlzLmFsaWFzaW5nSG9zdCA9IG5ldyBGaWxlVG9Nb2R1bGVBbGlhc2luZ0hvc3QodGhpcy5maWxlVG9Nb2R1bGVIb3N0KTtcbiAgICB9XG5cbiAgICBjb25zdCBldmFsdWF0b3IgPSBuZXcgUGFydGlhbEV2YWx1YXRvcih0aGlzLnJlZmxlY3RvciwgY2hlY2tlciwgdGhpcy5pbmNyZW1lbnRhbFN0YXRlKTtcbiAgICBjb25zdCBkdHNSZWFkZXIgPSBuZXcgRHRzTWV0YWRhdGFSZWFkZXIoY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IpO1xuICAgIGNvbnN0IGxvY2FsTWV0YVJlZ2lzdHJ5ID0gbmV3IExvY2FsTWV0YWRhdGFSZWdpc3RyeSgpO1xuICAgIGNvbnN0IGxvY2FsTWV0YVJlYWRlciA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVhZGVyKFtsb2NhbE1ldGFSZWdpc3RyeSwgdGhpcy5pbmNyZW1lbnRhbFN0YXRlXSk7XG4gICAgY29uc3QgZGVwU2NvcGVSZWFkZXIgPSBuZXcgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyKGR0c1JlYWRlciwgdGhpcy5hbGlhc2luZ0hvc3QpO1xuICAgIGNvbnN0IHNjb3BlUmVnaXN0cnkgPSBuZXcgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5KFxuICAgICAgICBsb2NhbE1ldGFSZWFkZXIsIGRlcFNjb3BlUmVhZGVyLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMuYWxpYXNpbmdIb3N0LCB0aGlzLmluY3JlbWVudGFsU3RhdGUpO1xuICAgIGNvbnN0IHNjb3BlUmVhZGVyID0gbmV3IENvbXBvdW5kQ29tcG9uZW50U2NvcGVSZWFkZXIoW3Njb3BlUmVnaXN0cnksIHRoaXMuaW5jcmVtZW50YWxTdGF0ZV0pO1xuICAgIGNvbnN0IG1ldGFSZWdpc3RyeSA9XG4gICAgICAgIG5ldyBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnkoW2xvY2FsTWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LCB0aGlzLmluY3JlbWVudGFsU3RhdGVdKTtcblxuICAgIHRoaXMubWV0YVJlYWRlciA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVhZGVyKFtsb2NhbE1ldGFSZWFkZXIsIGR0c1JlYWRlcl0pO1xuXG5cbiAgICAvLyBJZiBhIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgd2FzIHNwZWNpZmllZCwgdGhlbiB0cmFjayByZWZlcmVuY2VzIHZpYSBhIGBSZWZlcmVuY2VHcmFwaGBcbiAgICAvLyBpblxuICAgIC8vIG9yZGVyIHRvIHByb2R1Y2UgcHJvcGVyIGRpYWdub3N0aWNzIGZvciBpbmNvcnJlY3RseSBleHBvcnRlZCBkaXJlY3RpdmVzL3BpcGVzL2V0Yy4gSWZcbiAgICAvLyB0aGVyZVxuICAgIC8vIGlzIG5vIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgdGhlbiBkb24ndCBwYXkgdGhlIGNvc3Qgb2YgdHJhY2tpbmcgcmVmZXJlbmNlcy5cbiAgICBsZXQgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBSZWZlcmVuY2VzUmVnaXN0cnk7XG4gICAgaWYgKHRoaXMuZW50cnlQb2ludCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5leHBvcnRSZWZlcmVuY2VHcmFwaCA9IG5ldyBSZWZlcmVuY2VHcmFwaCgpO1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IFJlZmVyZW5jZUdyYXBoQWRhcHRlcih0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5ID0gbmV3IE5vb3BSZWZlcmVuY2VzUmVnaXN0cnkoKTtcbiAgICB9XG5cbiAgICB0aGlzLnJvdXRlQW5hbHl6ZXIgPSBuZXcgTmdNb2R1bGVSb3V0ZUFuYWx5emVyKHRoaXMubW9kdWxlUmVzb2x2ZXIsIGV2YWx1YXRvcik7XG5cbiAgICAvLyBTZXQgdXAgdGhlIEl2eUNvbXBpbGF0aW9uLCB3aGljaCBtYW5hZ2VzIHN0YXRlIGZvciB0aGUgSXZ5IHRyYW5zZm9ybWVyLlxuICAgIGNvbnN0IGhhbmRsZXJzID0gW1xuICAgICAgbmV3IEJhc2VEZWZEZWNvcmF0b3JIYW5kbGVyKHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIHRoaXMuaXNDb3JlKSxcbiAgICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgdGhpcy5tZXRhUmVhZGVyICEsIHNjb3BlUmVhZGVyLCBzY29wZVJlZ2lzdHJ5LFxuICAgICAgICAgIHRoaXMuaXNDb3JlLCB0aGlzLnJlc291cmNlTWFuYWdlciwgdGhpcy5yb290RGlycyxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMucHJlc2VydmVXaGl0ZXNwYWNlcyB8fCBmYWxzZSwgdGhpcy5vcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyAhPT0gZmFsc2UsXG4gICAgICAgICAgdGhpcy5nZXRJMThuTGVnYWN5TWVzc2FnZUZvcm1hdCgpLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsXG4gICAgICAgICAgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmluY3JlbWVudGFsU3RhdGUpLFxuICAgICAgbmV3IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmlzQ29yZSksXG4gICAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5zdHJpY3RJbmplY3Rpb25QYXJhbWV0ZXJzIHx8IGZhbHNlKSxcbiAgICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgdGhpcy5tZXRhUmVhZGVyLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksXG4gICAgICAgICAgcmVmZXJlbmNlc1JlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yb3V0ZUFuYWx5emVyLCB0aGlzLnJlZkVtaXR0ZXIsXG4gICAgICAgICAgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5vcHRpb25zLmkxOG5JbkxvY2FsZSksXG4gICAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmlzQ29yZSksXG4gICAgXTtcblxuICAgIHJldHVybiBuZXcgSXZ5Q29tcGlsYXRpb24oXG4gICAgICAgIGhhbmRsZXJzLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pbXBvcnRSZXdyaXRlciwgdGhpcy5pbmNyZW1lbnRhbFN0YXRlLCB0aGlzLnBlcmZSZWNvcmRlcixcbiAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzLCBzY29wZVJlZ2lzdHJ5KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0STE4bkxlZ2FjeU1lc3NhZ2VGb3JtYXQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQgIT09IGZhbHNlICYmIHRoaXMub3B0aW9ucy5pMThuSW5Gb3JtYXQgfHxcbiAgICAgICAgJyc7XG4gIH1cblxuICBwcml2YXRlIGdldCByZWZsZWN0b3IoKTogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IHtcbiAgICBpZiAodGhpcy5fcmVmbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3JlZmxlY3RvciA9IG5ldyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QodGhpcy50c1Byb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yZWZsZWN0b3I7XG4gIH1cblxuICBwcml2YXRlIGdldCBjb3JlSW1wb3J0c0Zyb20oKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICBpZiAodGhpcy5fY29yZUltcG9ydHNGcm9tID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2NvcmVJbXBvcnRzRnJvbSA9IHRoaXMuaXNDb3JlICYmIGdldFIzU3ltYm9sc0ZpbGUodGhpcy50c1Byb2dyYW0pIHx8IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb3JlSW1wb3J0c0Zyb207XG4gIH1cblxuICBwcml2YXRlIGdldCBpc0NvcmUoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX2lzQ29yZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9pc0NvcmUgPSBpc0FuZ3VsYXJDb3JlUGFja2FnZSh0aGlzLnRzUHJvZ3JhbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pc0NvcmU7XG4gIH1cblxuICBwcml2YXRlIGdldCBpbXBvcnRSZXdyaXRlcigpOiBJbXBvcnRSZXdyaXRlciB7XG4gICAgaWYgKHRoaXMuX2ltcG9ydFJld3JpdGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGNvcmVJbXBvcnRzRnJvbSA9IHRoaXMuY29yZUltcG9ydHNGcm9tO1xuICAgICAgdGhpcy5faW1wb3J0UmV3cml0ZXIgPSBjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwgP1xuICAgICAgICAgIG5ldyBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlcihjb3JlSW1wb3J0c0Zyb20uZmlsZU5hbWUpIDpcbiAgICAgICAgICBuZXcgTm9vcEltcG9ydFJld3JpdGVyKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pbXBvcnRSZXdyaXRlcjtcbiAgfVxufVxuXG5jb25zdCBkZWZhdWx0RW1pdENhbGxiYWNrOiBhcGkuVHNFbWl0Q2FsbGJhY2sgPVxuICAgICh7cHJvZ3JhbSwgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgIGN1c3RvbVRyYW5zZm9ybWVyc30pID0+XG4gICAgICAgIHByb2dyYW0uZW1pdChcbiAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG5cbmZ1bmN0aW9uIG1lcmdlRW1pdFJlc3VsdHMoZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSk6IHRzLkVtaXRSZXN1bHQge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGxldCBlbWl0U2tpcHBlZCA9IGZhbHNlO1xuICBjb25zdCBlbWl0dGVkRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgZXIgb2YgZW1pdFJlc3VsdHMpIHtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmVyLmRpYWdub3N0aWNzKTtcbiAgICBlbWl0U2tpcHBlZCA9IGVtaXRTa2lwcGVkIHx8IGVyLmVtaXRTa2lwcGVkO1xuICAgIGVtaXR0ZWRGaWxlcy5wdXNoKC4uLihlci5lbWl0dGVkRmlsZXMgfHwgW10pKTtcbiAgfVxuXG4gIHJldHVybiB7ZGlhZ25vc3RpY3MsIGVtaXRTa2lwcGVkLCBlbWl0dGVkRmlsZXN9O1xufVxuXG4vKipcbiAqIEZpbmQgdGhlICdyM19zeW1ib2xzLnRzJyBmaWxlIGluIHRoZSBnaXZlbiBgUHJvZ3JhbWAsIG9yIHJldHVybiBgbnVsbGAgaWYgaXQgd2Fzbid0IHRoZXJlLlxuICovXG5mdW5jdGlvbiBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbmQoZmlsZSA9PiBmaWxlLmZpbGVOYW1lLmluZGV4T2YoJ3IzX3N5bWJvbHMudHMnKSA+PSAwKSB8fCBudWxsO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgZ2l2ZW4gYFByb2dyYW1gIGlzIEBhbmd1bGFyL2NvcmUuXG4gKi9cbmZ1bmN0aW9uIGlzQW5ndWxhckNvcmVQYWNrYWdlKHByb2dyYW06IHRzLlByb2dyYW0pOiBib29sZWFuIHtcbiAgLy8gTG9vayBmb3IgaXRzX2p1c3RfYW5ndWxhci50cyBzb21ld2hlcmUgaW4gdGhlIHByb2dyYW0uXG4gIGNvbnN0IHIzU3ltYm9scyA9IGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbSk7XG4gIGlmIChyM1N5bWJvbHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBMb29rIGZvciB0aGUgY29uc3RhbnQgSVRTX0pVU1RfQU5HVUxBUiBpbiB0aGF0IGZpbGUuXG4gIHJldHVybiByM1N5bWJvbHMuc3RhdGVtZW50cy5zb21lKHN0bXQgPT4ge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgbXVzdCBiZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHN0YXRlbWVudC5cbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RtdCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBiZSBleHBvcnRlZC5cbiAgICBpZiAoc3RtdC5tb2RpZmllcnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAhc3RtdC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBkZWNsYXJlIElUU19KVVNUX0FOR1VMQVIuXG4gICAgcmV0dXJuIHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5zb21lKGRlY2wgPT4ge1xuICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIG11c3QgbWF0Y2ggdGhlIG5hbWUuXG4gICAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpIHx8IGRlY2wubmFtZS50ZXh0ICE9PSAnSVRTX0pVU1RfQU5HVUxBUicpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gSXQgbXVzdCBpbml0aWFsaXplIHRoZSB2YXJpYWJsZSB0byB0cnVlLlxuICAgICAgaWYgKGRlY2wuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCB8fCBkZWNsLmluaXRpYWxpemVyLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVHJ1ZUtleXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBkZWZpbml0aW9uIG1hdGNoZXMuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2VHcmFwaEFkYXB0ZXIgaW1wbGVtZW50cyBSZWZlcmVuY2VzUmVnaXN0cnkge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGdyYXBoOiBSZWZlcmVuY2VHcmFwaCkge31cblxuICBhZGQoc291cmNlOiB0cy5EZWNsYXJhdGlvbiwgLi4ucmVmZXJlbmNlczogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB7bm9kZX0gb2YgcmVmZXJlbmNlcykge1xuICAgICAgbGV0IHNvdXJjZUZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc291cmNlRmlsZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgcmVjb3JkIGxvY2FsIHJlZmVyZW5jZXMgKG5vdCByZWZlcmVuY2VzIGludG8gLmQudHMgZmlsZXMpLlxuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCB8fCAhaXNEdHNQYXRoKHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgIHRoaXMuZ3JhcGguYWRkKHNvdXJjZSwgbm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNob3VsZEVuYWJsZVBlcmZUcmFjaW5nKG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMpOiBib29sZWFuIHtcbiAgcmV0dXJuIG9wdGlvbnMudHJhY2VQZXJmb3JtYW5jZSAhPT0gdW5kZWZpbmVkO1xufVxuIl19