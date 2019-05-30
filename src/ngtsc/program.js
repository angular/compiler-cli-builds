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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/transformers/nocollapse_hack", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/annotations/src/base_def", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource_loader", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/transform/src/alias", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
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
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var incremental_1 = require("@angular/compiler-cli/src/ngtsc/incremental");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var resource_loader_1 = require("@angular/compiler-cli/src/ngtsc/resource_loader");
    var routing_1 = require("@angular/compiler-cli/src/ngtsc/routing");
    var scope_1 = require("@angular/compiler-cli/src/ngtsc/scope");
    var shims_1 = require("@angular/compiler-cli/src/ngtsc/shims");
    var switch_1 = require("@angular/compiler-cli/src/ngtsc/switch");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var alias_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/alias");
    var typecheck_1 = require("@angular/compiler-cli/src/ngtsc/typecheck");
    var path_2 = require("@angular/compiler-cli/src/ngtsc/util/src/path");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var NgtscProgram = /** @class */ (function () {
        function NgtscProgram(rootNames, options, host, oldProgram) {
            var _this = this;
            this.options = options;
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
            this.refEmitter = null;
            this.fileToModuleHost = null;
            this.perfRecorder = perf_1.NOOP_PERF_RECORDER;
            this.perfTracker = null;
            if (shouldEnablePerfTracing(options)) {
                this.perfTracker = perf_1.PerfTracker.zeroedToNow();
                this.perfRecorder = this.perfTracker;
            }
            this.rootDirs = typescript_1.getRootDirs(host, options);
            this.closureCompilerEnabled = !!options.annotateForClosureCompiler;
            this.resourceManager = new resource_loader_1.HostResourceLoader(host, options);
            var shouldGenerateShims = options.allowEmptyCodegenFiles || false;
            var normalizedRootNames = rootNames.map(function (n) { return path_1.AbsoluteFsPath.from(n); });
            this.host = host;
            if (host.fileNameToModuleName !== undefined) {
                this.fileToModuleHost = host;
            }
            var rootFiles = tslib_1.__spread(rootNames);
            var generators = [];
            if (shouldGenerateShims) {
                // Summary generation.
                var summaryGenerator = shims_1.SummaryGenerator.forRootFiles(normalizedRootNames);
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
                rootFiles.push.apply(rootFiles, tslib_1.__spread(factoryFileNames, summaryGenerator.getSummaryFileNames()));
                generators.push(summaryGenerator, factoryGenerator);
            }
            this.typeCheckFilePath = typecheck_1.typeCheckFilePath(this.rootDirs);
            generators.push(new shims_1.TypeCheckShimGenerator(this.typeCheckFilePath));
            rootFiles.push(this.typeCheckFilePath);
            var entryPoint = null;
            if (options.flatModuleOutFile !== undefined) {
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
                    var flatModuleOutFile = path_2.normalizeSeparators(options.flatModuleOutFile);
                    this.flatIndexGenerator =
                        new entry_point_1.FlatIndexGenerator(entryPoint, flatModuleOutFile, flatModuleId);
                    generators.push(this.flatIndexGenerator);
                    rootFiles.push(this.flatIndexGenerator.flatIndexPath);
                }
            }
            if (generators.length > 0) {
                this.host = new shims_1.GeneratedShimsHostWrapper(host, generators);
            }
            this.tsProgram =
                ts.createProgram(rootFiles, options, this.host, oldProgram && oldProgram.reuseTsProgram);
            this.reuseTsProgram = this.tsProgram;
            this.entryPoint = entryPoint !== null ? this.tsProgram.getSourceFile(entryPoint) || null : null;
            this.moduleResolver = new imports_1.ModuleResolver(this.tsProgram, options, this.host);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(new cycles_1.ImportGraph(this.moduleResolver));
            this.defaultImportTracker = new imports_1.DefaultImportTracker();
            if (oldProgram === undefined) {
                this.incrementalState = incremental_1.IncrementalState.fresh();
            }
            else {
                this.incrementalState = incremental_1.IncrementalState.reconcile(oldProgram.incrementalState, oldProgram.reuseTsProgram, this.tsProgram);
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
            var _this = this;
            var e_1, _a;
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
                transform_1.ivyTransformFactory(compilation, this.reflector, this.importRewriter, this.defaultImportTracker, this.isCore, this.closureCompilerEnabled),
                alias_1.aliasTransformFactory(compilation.exportStatements),
                this.defaultImportTracker.importPreservingTransformer(),
            ];
            var afterDeclarationsTransforms = [
                transform_1.declarationTransformFactory(compilation),
            ];
            if (this.factoryToSourceInfo !== null) {
                beforeTransforms.push(shims_1.generatedFactoryTransform(this.factoryToSourceInfo, this.importRewriter));
            }
            beforeTransforms.push(switch_1.ivySwitchTransform);
            if (customTransforms && customTransforms.beforeTs) {
                beforeTransforms.push.apply(beforeTransforms, tslib_1.__spread(customTransforms.beforeTs));
            }
            var emitSpan = this.perfRecorder.start('emit');
            var emitResults = [];
            var typeCheckFile = this.tsProgram.getSourceFile(this.typeCheckFilePath);
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
                    checkTypeOfBindings: true,
                    checkTypeOfPipes: true,
                    strictSafeNavigationTypes: true,
                };
            }
            else {
                typeCheckingConfig = {
                    applyTemplateContextGuards: false,
                    checkQueries: false,
                    checkTemplateBodies: false,
                    checkTypeOfBindings: false,
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
        NgtscProgram.prototype.makeCompilation = function () {
            var checker = this.tsProgram.getTypeChecker();
            var aliasGenerator = null;
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
                    new imports_1.LogicalProjectStrategy(checker, new path_1.LogicalFileSystem(this.rootDirs)),
                ]);
            }
            else {
                // The CompilerHost supports fileNameToModuleName, so use that to emit imports.
                this.refEmitter = new imports_1.ReferenceEmitter([
                    // First, try to use local identifiers if available.
                    new imports_1.LocalIdentifierStrategy(),
                    // Then use aliased references (this is a workaround to StrictDeps checks).
                    new imports_1.AliasStrategy(),
                    // Then use fileNameToModuleName to emit imports.
                    new imports_1.FileToModuleStrategy(checker, this.fileToModuleHost),
                ]);
                aliasGenerator = new imports_1.AliasGenerator(this.fileToModuleHost);
            }
            var evaluator = new partial_evaluator_1.PartialEvaluator(this.reflector, checker, this.incrementalState);
            var dtsReader = new metadata_1.DtsMetadataReader(checker, this.reflector);
            var localMetaRegistry = new metadata_1.LocalMetadataRegistry();
            var localMetaReader = new metadata_1.CompoundMetadataReader([localMetaRegistry, this.incrementalState]);
            var depScopeReader = new scope_1.MetadataDtsModuleScopeResolver(dtsReader, aliasGenerator);
            var scopeRegistry = new scope_1.LocalModuleScopeRegistry(localMetaReader, depScopeReader, this.refEmitter, aliasGenerator);
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
                new annotations_1.ComponentDecoratorHandler(this.reflector, evaluator, metaRegistry, this.metaReader, scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.moduleResolver, this.cycleAnalyzer, this.refEmitter, this.defaultImportTracker),
                new annotations_1.DirectiveDecoratorHandler(this.reflector, evaluator, metaRegistry, this.defaultImportTracker, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflector, this.defaultImportTracker, this.isCore, this.options.strictInjectionParameters || false),
                new annotations_1.NgModuleDecoratorHandler(this.reflector, evaluator, metaRegistry, scopeRegistry, referencesRegistry, this.isCore, this.routeAnalyzer, this.refEmitter, this.defaultImportTracker, this.options.i18nInLocale),
                new annotations_1.PipeDecoratorHandler(this.reflector, evaluator, metaRegistry, this.defaultImportTracker, this.isCore),
            ];
            return new transform_1.IvyCompilation(handlers, this.reflector, this.importRewriter, this.incrementalState, this.perfRecorder, this.sourceToFactorySymbols, scopeRegistry);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsMEZBQStEO0lBRS9ELDJFQUEyTTtJQUMzTSxxRkFBbUU7SUFDbkUsaUVBQW9EO0lBQ3BELDJFQUFxRDtJQUNyRCwyRUFBa0g7SUFDbEgsbUVBQXlTO0lBQ3pTLDJFQUErQztJQUMvQyxxRUFBc0k7SUFDdEksdUZBQXFEO0lBQ3JELDZEQUF5RDtJQUN6RCw2REFBcUU7SUFDckUseUVBQXNEO0lBQ3RELG1GQUFxRDtJQUNyRCxtRUFBa0U7SUFDbEUsK0RBQWlGO0lBQ2pGLCtEQUFxSztJQUNySyxpRUFBNEM7SUFDNUMsdUVBQTZGO0lBQzdGLDZFQUE0RDtJQUM1RCx1RUFBb0Y7SUFDcEYsc0VBQW9EO0lBQ3BELGtGQUFnRjtJQUVoRjtRQWdDRSxzQkFDSSxTQUFnQyxFQUFVLE9BQTRCLEVBQ3RFLElBQXNCLEVBQUUsVUFBeUI7WUFGckQsaUJBNkZDO1lBNUY2QyxZQUFPLEdBQVAsT0FBTyxDQUFxQjtZQTdCbEUsZ0JBQVcsR0FBNkIsU0FBUyxDQUFDO1lBQ2xELHdCQUFtQixHQUFrQyxJQUFJLENBQUM7WUFDMUQsMkJBQXNCLEdBQWtDLElBQUksQ0FBQztZQUU3RCxxQkFBZ0IsR0FBaUMsU0FBUyxDQUFDO1lBQzNELG9CQUFlLEdBQTZCLFNBQVMsQ0FBQztZQUN0RCxlQUFVLEdBQXVDLFNBQVMsQ0FBQztZQUMzRCxZQUFPLEdBQXNCLFNBQVMsQ0FBQztZQUl2Qyx5QkFBb0IsR0FBd0IsSUFBSSxDQUFDO1lBQ2pELHVCQUFrQixHQUE0QixJQUFJLENBQUM7WUFDbkQsa0JBQWEsR0FBK0IsSUFBSSxDQUFDO1lBRWpELDRCQUF1QixHQUFvQixFQUFFLENBQUM7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QyxDQUFDO3FCQUM5QjtpQkFDRjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQWhCRCxJQWdCQztJQWhCWSxzREFBcUI7SUFrQmxDLFNBQVMsdUJBQXVCLENBQUMsT0FBNEI7UUFDM0QsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxDQUFDO0lBQ2hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7R2VuZXJhdGVkRmlsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7bm9jb2xsYXBzZUhhY2t9IGZyb20gJy4uL3RyYW5zZm9ybWVycy9ub2NvbGxhcHNlX2hhY2snO1xuXG5pbXBvcnQge0NvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIE5vb3BSZWZlcmVuY2VzUmVnaXN0cnksIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4vYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtCYXNlRGVmRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi9hbm5vdGF0aW9ucy9zcmMvYmFzZV9kZWYnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBJbXBvcnRHcmFwaH0gZnJvbSAnLi9jeWNsZXMnO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RmxhdEluZGV4R2VuZXJhdG9yLCBSZWZlcmVuY2VHcmFwaCwgY2hlY2tGb3JQcml2YXRlRXhwb3J0cywgZmluZEZsYXRJbmRleEVudHJ5UG9pbnR9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5LCBBbGlhc0dlbmVyYXRvciwgQWxpYXNTdHJhdGVneSwgRGVmYXVsdEltcG9ydFRyYWNrZXIsIEZpbGVUb01vZHVsZUhvc3QsIEZpbGVUb01vZHVsZVN0cmF0ZWd5LCBJbXBvcnRSZXdyaXRlciwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsU3RhdGV9IGZyb20gJy4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtDb21wb3VuZE1ldGFkYXRhUmVhZGVyLCBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnksIER0c01ldGFkYXRhUmVhZGVyLCBMb2NhbE1ldGFkYXRhUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBMb2dpY2FsRmlsZVN5c3RlbX0gZnJvbSAnLi9wYXRoJztcbmltcG9ydCB7Tk9PUF9QRVJGX1JFQ09SREVSLCBQZXJmUmVjb3JkZXIsIFBlcmZUcmFja2VyfSBmcm9tICcuL3BlcmYnO1xuaW1wb3J0IHtUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0hvc3RSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9yZXNvdXJjZV9sb2FkZXInO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXIsIGVudHJ5UG9pbnRLZXlGb3J9IGZyb20gJy4vcm91dGluZyc7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyfSBmcm9tICcuL3Njb3BlJztcbmltcG9ydCB7RmFjdG9yeUdlbmVyYXRvciwgRmFjdG9yeUluZm8sIEdlbmVyYXRlZFNoaW1zSG9zdFdyYXBwZXIsIFNoaW1HZW5lcmF0b3IsIFN1bW1hcnlHZW5lcmF0b3IsIFR5cGVDaGVja1NoaW1HZW5lcmF0b3IsIGdlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm19IGZyb20gJy4vc2hpbXMnO1xuaW1wb3J0IHtpdnlTd2l0Y2hUcmFuc2Zvcm19IGZyb20gJy4vc3dpdGNoJztcbmltcG9ydCB7SXZ5Q29tcGlsYXRpb24sIGRlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeSwgaXZ5VHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHthbGlhc1RyYW5zZm9ybUZhY3Rvcnl9IGZyb20gJy4vdHJhbnNmb3JtL3NyYy9hbGlhcyc7XG5pbXBvcnQge1R5cGVDaGVja0NvbnRleHQsIFR5cGVDaGVja2luZ0NvbmZpZywgdHlwZUNoZWNrRmlsZVBhdGh9IGZyb20gJy4vdHlwZWNoZWNrJztcbmltcG9ydCB7bm9ybWFsaXplU2VwYXJhdG9yc30gZnJvbSAnLi91dGlsL3NyYy9wYXRoJztcbmltcG9ydCB7Z2V0Um9vdERpcnMsIGlzRHRzUGF0aCwgcmVzb2x2ZU1vZHVsZU5hbWV9IGZyb20gJy4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBjbGFzcyBOZ3RzY1Byb2dyYW0gaW1wbGVtZW50cyBhcGkuUHJvZ3JhbSB7XG4gIHByaXZhdGUgdHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIHJldXNlVHNQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIHJlc291cmNlTWFuYWdlcjogSG9zdFJlc291cmNlTG9hZGVyO1xuICBwcml2YXRlIGNvbXBpbGF0aW9uOiBJdnlDb21waWxhdGlvbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgZmFjdG9yeVRvU291cmNlSW5mbzogTWFwPHN0cmluZywgRmFjdG9yeUluZm8+fG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNvdXJjZVRvRmFjdG9yeVN5bWJvbHM6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBob3N0OiB0cy5Db21waWxlckhvc3Q7XG4gIHByaXZhdGUgX2NvcmVJbXBvcnRzRnJvbTogdHMuU291cmNlRmlsZXxudWxsfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcmVmbGVjdG9yOiBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9pc0NvcmU6IGJvb2xlYW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgZW50cnlQb2ludDogdHMuU291cmNlRmlsZXxudWxsO1xuICBwcml2YXRlIGV4cG9ydFJlZmVyZW5jZUdyYXBoOiBSZWZlcmVuY2VHcmFwaHxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBmbGF0SW5kZXhHZW5lcmF0b3I6IEZsYXRJbmRleEdlbmVyYXRvcnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByb3V0ZUFuYWx5emVyOiBOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ8bnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rpb25EaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIHByaXZhdGUgbW9kdWxlUmVzb2x2ZXI6IE1vZHVsZVJlc29sdmVyO1xuICBwcml2YXRlIGN5Y2xlQW5hbHl6ZXI6IEN5Y2xlQW5hbHl6ZXI7XG4gIHByaXZhdGUgbWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXJ8bnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyfG51bGwgPSBudWxsO1xuICBwcml2YXRlIGZpbGVUb01vZHVsZUhvc3Q6IEZpbGVUb01vZHVsZUhvc3R8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZGVmYXVsdEltcG9ydFRyYWNrZXI6IERlZmF1bHRJbXBvcnRUcmFja2VyO1xuICBwcml2YXRlIHBlcmZSZWNvcmRlcjogUGVyZlJlY29yZGVyID0gTk9PUF9QRVJGX1JFQ09SREVSO1xuICBwcml2YXRlIHBlcmZUcmFja2VyOiBQZXJmVHJhY2tlcnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBpbmNyZW1lbnRhbFN0YXRlOiBJbmNyZW1lbnRhbFN0YXRlO1xuICBwcml2YXRlIHR5cGVDaGVja0ZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJvb3ROYW1lczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBwcml2YXRlIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMsXG4gICAgICBob3N0OiBhcGkuQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogTmd0c2NQcm9ncmFtKSB7XG4gICAgaWYgKHNob3VsZEVuYWJsZVBlcmZUcmFjaW5nKG9wdGlvbnMpKSB7XG4gICAgICB0aGlzLnBlcmZUcmFja2VyID0gUGVyZlRyYWNrZXIuemVyb2VkVG9Ob3coKTtcbiAgICAgIHRoaXMucGVyZlJlY29yZGVyID0gdGhpcy5wZXJmVHJhY2tlcjtcbiAgICB9XG5cbiAgICB0aGlzLnJvb3REaXJzID0gZ2V0Um9vdERpcnMoaG9zdCwgb3B0aW9ucyk7XG4gICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkID0gISFvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyID0gbmV3IEhvc3RSZXNvdXJjZUxvYWRlcihob3N0LCBvcHRpb25zKTtcbiAgICBjb25zdCBzaG91bGRHZW5lcmF0ZVNoaW1zID0gb3B0aW9ucy5hbGxvd0VtcHR5Q29kZWdlbkZpbGVzIHx8IGZhbHNlO1xuICAgIGNvbnN0IG5vcm1hbGl6ZWRSb290TmFtZXMgPSByb290TmFtZXMubWFwKG4gPT4gQWJzb2x1dGVGc1BhdGguZnJvbShuKSk7XG4gICAgdGhpcy5ob3N0ID0gaG9zdDtcbiAgICBpZiAoaG9zdC5maWxlTmFtZVRvTW9kdWxlTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmZpbGVUb01vZHVsZUhvc3QgPSBob3N0IGFzIEZpbGVUb01vZHVsZUhvc3Q7XG4gICAgfVxuICAgIGxldCByb290RmlsZXMgPSBbLi4ucm9vdE5hbWVzXTtcblxuICAgIGNvbnN0IGdlbmVyYXRvcnM6IFNoaW1HZW5lcmF0b3JbXSA9IFtdO1xuICAgIGlmIChzaG91bGRHZW5lcmF0ZVNoaW1zKSB7XG4gICAgICAvLyBTdW1tYXJ5IGdlbmVyYXRpb24uXG4gICAgICBjb25zdCBzdW1tYXJ5R2VuZXJhdG9yID0gU3VtbWFyeUdlbmVyYXRvci5mb3JSb290RmlsZXMobm9ybWFsaXplZFJvb3ROYW1lcyk7XG5cbiAgICAgIC8vIEZhY3RvcnkgZ2VuZXJhdGlvbi5cbiAgICAgIGNvbnN0IGZhY3RvcnlHZW5lcmF0b3IgPSBGYWN0b3J5R2VuZXJhdG9yLmZvclJvb3RGaWxlcyhub3JtYWxpemVkUm9vdE5hbWVzKTtcbiAgICAgIGNvbnN0IGZhY3RvcnlGaWxlTWFwID0gZmFjdG9yeUdlbmVyYXRvci5mYWN0b3J5RmlsZU1hcDtcbiAgICAgIHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz4oKTtcbiAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scyA9IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKTtcbiAgICAgIGZhY3RvcnlGaWxlTWFwLmZvckVhY2goKHNvdXJjZUZpbGVQYXRoLCBmYWN0b3J5UGF0aCkgPT4ge1xuICAgICAgICBjb25zdCBtb2R1bGVTeW1ib2xOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgIS5zZXQoc291cmNlRmlsZVBhdGgsIG1vZHVsZVN5bWJvbE5hbWVzKTtcbiAgICAgICAgdGhpcy5mYWN0b3J5VG9Tb3VyY2VJbmZvICEuc2V0KGZhY3RvcnlQYXRoLCB7c291cmNlRmlsZVBhdGgsIG1vZHVsZVN5bWJvbE5hbWVzfSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZmFjdG9yeUZpbGVOYW1lcyA9IEFycmF5LmZyb20oZmFjdG9yeUZpbGVNYXAua2V5cygpKTtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLmZhY3RvcnlGaWxlTmFtZXMsIC4uLnN1bW1hcnlHZW5lcmF0b3IuZ2V0U3VtbWFyeUZpbGVOYW1lcygpKTtcbiAgICAgIGdlbmVyYXRvcnMucHVzaChzdW1tYXJ5R2VuZXJhdG9yLCBmYWN0b3J5R2VuZXJhdG9yKTtcbiAgICB9XG5cbiAgICB0aGlzLnR5cGVDaGVja0ZpbGVQYXRoID0gdHlwZUNoZWNrRmlsZVBhdGgodGhpcy5yb290RGlycyk7XG4gICAgZ2VuZXJhdG9ycy5wdXNoKG5ldyBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yKHRoaXMudHlwZUNoZWNrRmlsZVBhdGgpKTtcbiAgICByb290RmlsZXMucHVzaCh0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKTtcblxuICAgIGxldCBlbnRyeVBvaW50OiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgaWYgKG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZW50cnlQb2ludCA9IGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50KG5vcm1hbGl6ZWRSb290TmFtZXMpO1xuICAgICAgaWYgKGVudHJ5UG9pbnQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBlcnJvciBtZXNzYWdlIHRhbGtzIHNwZWNpZmljYWxseSBhYm91dCBoYXZpbmcgYSBzaW5nbGUgLnRzIGZpbGUgaW4gXCJmaWxlc1wiLiBIb3dldmVyXG4gICAgICAgIC8vIHRoZSBhY3R1YWwgbG9naWMgaXMgYSBiaXQgbW9yZSBwZXJtaXNzaXZlLiBJZiBhIHNpbmdsZSBmaWxlIGV4aXN0cywgdGhhdCB3aWxsIGJlIHRha2VuLFxuICAgICAgICAvLyBvdGhlcndpc2UgdGhlIGhpZ2hlc3QgbGV2ZWwgKHNob3J0ZXN0IHBhdGgpIFwiaW5kZXgudHNcIiBmaWxlIHdpbGwgYmUgdXNlZCBhcyB0aGUgZmxhdFxuICAgICAgICAvLyBtb2R1bGUgZW50cnkgcG9pbnQgaW5zdGVhZC4gSWYgbmVpdGhlciBvZiB0aGVzZSBjb25kaXRpb25zIGFwcGx5LCB0aGUgZXJyb3IgYmVsb3cgaXNcbiAgICAgICAgLy8gZ2l2ZW4uXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZSB1c2VyIGlzIG5vdCBpbmZvcm1lZCBhYm91dCB0aGUgXCJpbmRleC50c1wiIG9wdGlvbiBhcyB0aGlzIGJlaGF2aW9yIGlzIGRlcHJlY2F0ZWQgLVxuICAgICAgICAvLyBhbiBleHBsaWNpdCBlbnRyeXBvaW50IHNob3VsZCBhbHdheXMgYmUgc3BlY2lmaWVkLlxuICAgICAgICB0aGlzLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLkNPTkZJR19GTEFUX01PRFVMRV9OT19JTkRFWCksXG4gICAgICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICAgICdBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbiBcImZsYXRNb2R1bGVPdXRGaWxlXCIgcmVxdWlyZXMgb25lIGFuZCBvbmx5IG9uZSAudHMgZmlsZSBpbiB0aGUgXCJmaWxlc1wiIGZpZWxkLicsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZmxhdE1vZHVsZUlkID0gb3B0aW9ucy5mbGF0TW9kdWxlSWQgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgZmxhdE1vZHVsZU91dEZpbGUgPSBub3JtYWxpemVTZXBhcmF0b3JzKG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUpO1xuICAgICAgICB0aGlzLmZsYXRJbmRleEdlbmVyYXRvciA9XG4gICAgICAgICAgICBuZXcgRmxhdEluZGV4R2VuZXJhdG9yKGVudHJ5UG9pbnQsIGZsYXRNb2R1bGVPdXRGaWxlLCBmbGF0TW9kdWxlSWQpO1xuICAgICAgICBnZW5lcmF0b3JzLnB1c2godGhpcy5mbGF0SW5kZXhHZW5lcmF0b3IpO1xuICAgICAgICByb290RmlsZXMucHVzaCh0aGlzLmZsYXRJbmRleEdlbmVyYXRvci5mbGF0SW5kZXhQYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZ2VuZXJhdG9ycy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLmhvc3QgPSBuZXcgR2VuZXJhdGVkU2hpbXNIb3N0V3JhcHBlcihob3N0LCBnZW5lcmF0b3JzKTtcbiAgICB9XG5cbiAgICB0aGlzLnRzUHJvZ3JhbSA9XG4gICAgICAgIHRzLmNyZWF0ZVByb2dyYW0ocm9vdEZpbGVzLCBvcHRpb25zLCB0aGlzLmhvc3QsIG9sZFByb2dyYW0gJiYgb2xkUHJvZ3JhbS5yZXVzZVRzUHJvZ3JhbSk7XG4gICAgdGhpcy5yZXVzZVRzUHJvZ3JhbSA9IHRoaXMudHNQcm9ncmFtO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID0gZW50cnlQb2ludCAhPT0gbnVsbCA/IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZW50cnlQb2ludCkgfHwgbnVsbCA6IG51bGw7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnRzUHJvZ3JhbSwgb3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcihuZXcgSW1wb3J0R3JhcGgodGhpcy5tb2R1bGVSZXNvbHZlcikpO1xuICAgIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIgPSBuZXcgRGVmYXVsdEltcG9ydFRyYWNrZXIoKTtcbiAgICBpZiAob2xkUHJvZ3JhbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmluY3JlbWVudGFsU3RhdGUgPSBJbmNyZW1lbnRhbFN0YXRlLmZyZXNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaW5jcmVtZW50YWxTdGF0ZSA9IEluY3JlbWVudGFsU3RhdGUucmVjb25jaWxlKFxuICAgICAgICAgIG9sZFByb2dyYW0uaW5jcmVtZW50YWxTdGF0ZSwgb2xkUHJvZ3JhbS5yZXVzZVRzUHJvZ3JhbSwgdGhpcy50c1Byb2dyYW0pO1xuICAgIH1cbiAgfVxuXG4gIGdldFRzUHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHsgcmV0dXJuIHRoaXMudHNQcm9ncmFtOyB9XG5cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRPcHRpb25zRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpY3xhcGkuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0VHNTeW50YWN0aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8YXBpLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBnZXRUc1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZXx1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nU2VtYW50aWNEaWFnbm9zdGljcyhcbiAgICAgIGZpbGVOYW1lPzogc3RyaW5nfHVuZGVmaW5lZCwgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3MgPSBbLi4uY29tcGlsYXRpb24uZGlhZ25vc3RpY3MsIC4uLnRoaXMuZ2V0VGVtcGxhdGVEaWFnbm9zdGljcygpXTtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsICYmIHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGggIT09IG51bGwpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uY2hlY2tGb3JQcml2YXRlRXhwb3J0cyhcbiAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQsIHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGgpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgYXN5bmMgbG9hZE5nU3RydWN0dXJlQXN5bmMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG4gICAgfVxuICAgIGNvbnN0IGFuYWx5emVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emUnKTtcbiAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZmlsZSA9PiAhZmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmaWxlID0+IHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFuYWx5emVGaWxlU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplRmlsZScsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhbmFseXNpc1Byb21pc2UgPSB0aGlzLmNvbXBpbGF0aW9uICEuYW5hbHl6ZUFzeW5jKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbmFseXNpc1Byb21pc2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplRmlsZVNwYW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wZXJmUmVjb3JkZXIuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5hbHlzaXNQcm9taXNlID0gYW5hbHlzaXNQcm9taXNlLnRoZW4oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCkgPT4gdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplRmlsZVNwYW4pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFuYWx5c2lzUHJvbWlzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigocmVzdWx0KTogcmVzdWx0IGlzIFByb21pc2U8dm9pZD4gPT4gcmVzdWx0ICE9PSB1bmRlZmluZWQpKTtcbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVTcGFuKTtcbiAgICB0aGlzLmNvbXBpbGF0aW9uLnJlc29sdmUoKTtcbiAgfVxuXG4gIGxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGU/OiBzdHJpbmd8dW5kZWZpbmVkKTogYXBpLkxhenlSb3V0ZVtdIHtcbiAgICBpZiAoZW50cnlSb3V0ZSkge1xuICAgICAgLy8gTm90ZTpcbiAgICAgIC8vIFRoaXMgcmVzb2x1dGlvbiBzdGVwIGlzIGhlcmUgdG8gbWF0Y2ggdGhlIGltcGxlbWVudGF0aW9uIG9mIHRoZSBvbGQgYEFvdENvbXBpbGVySG9zdGAgKHNlZVxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9ibG9iLzUwNzMyZTE1Ni9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL3RyYW5zZm9ybWVycy9jb21waWxlcl9ob3N0LnRzI0wxNzUtTDE4OCkuXG4gICAgICAvL1xuICAgICAgLy8gYEBhbmd1bGFyL2NsaWAgd2lsbCBhbHdheXMgY2FsbCB0aGlzIEFQSSB3aXRoIGFuIGFic29sdXRlIHBhdGgsIHNvIHRoZSByZXNvbHV0aW9uIHN0ZXAgaXNcbiAgICAgIC8vIG5vdCBuZWNlc3NhcnksIGJ1dCBrZWVwaW5nIGl0IGJhY2t3YXJkcyBjb21wYXRpYmxlIGluIGNhc2Ugc29tZW9uZSBlbHNlIGlzIHVzaW5nIHRoZSBBUEkuXG5cbiAgICAgIC8vIFJlbGF0aXZlIGVudHJ5IHBhdGhzIGFyZSBkaXNhbGxvd2VkLlxuICAgICAgaWYgKGVudHJ5Um91dGUuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gbGlzdCBsYXp5IHJvdXRlczogUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyAoJHtlbnRyeVJvdXRlfSkgaXMgbm90IHN1cHBvcnRlZC5gKTtcbiAgICAgIH1cblxuICAgICAgLy8gTm9uLXJlbGF0aXZlIGVudHJ5IHBhdGhzIGZhbGwgaW50byBvbmUgb2YgdGhlIGZvbGxvd2luZyBjYXRlZ29yaWVzOlxuICAgICAgLy8gLSBBYnNvbHV0ZSBzeXN0ZW0gcGF0aHMgKGUuZy4gYC9mb28vYmFyL215LXByb2plY3QvbXktbW9kdWxlYCksIHdoaWNoIGFyZSB1bmFmZmVjdGVkIGJ5IHRoZVxuICAgICAgLy8gICBsb2dpYyBiZWxvdy5cbiAgICAgIC8vIC0gUGF0aHMgdG8gZW50ZXJuYWwgbW9kdWxlcyAoZS5nLiBgc29tZS1saWJgKS5cbiAgICAgIC8vIC0gUGF0aHMgbWFwcGVkIHRvIGRpcmVjdG9yaWVzIGluIGB0c2NvbmZpZy5qc29uYCAoZS5nLiBgc2hhcmVkL215LW1vZHVsZWApLlxuICAgICAgLy8gICAoU2VlIGh0dHBzOi8vd3d3LnR5cGVzY3JpcHRsYW5nLm9yZy9kb2NzL2hhbmRib29rL21vZHVsZS1yZXNvbHV0aW9uLmh0bWwjcGF0aC1tYXBwaW5nLilcbiAgICAgIC8vXG4gICAgICAvLyBJbiBhbGwgY2FzZXMgYWJvdmUsIHRoZSBgY29udGFpbmluZ0ZpbGVgIGFyZ3VtZW50IGlzIGlnbm9yZWQsIHNvIHdlIGNhbiBqdXN0IHRha2UgdGhlIGZpcnN0XG4gICAgICAvLyBvZiB0aGUgcm9vdCBmaWxlcy5cbiAgICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gdGhpcy50c1Byb2dyYW0uZ2V0Um9vdEZpbGVOYW1lcygpWzBdO1xuICAgICAgY29uc3QgW2VudHJ5UGF0aCwgbW9kdWxlTmFtZV0gPSBlbnRyeVJvdXRlLnNwbGl0KCcjJyk7XG4gICAgICBjb25zdCByZXNvbHZlZE1vZHVsZSA9IHJlc29sdmVNb2R1bGVOYW1lKGVudHJ5UGF0aCwgY29udGFpbmluZ0ZpbGUsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcblxuICAgICAgaWYgKHJlc29sdmVkTW9kdWxlKSB7XG4gICAgICAgIGVudHJ5Um91dGUgPSBlbnRyeVBvaW50S2V5Rm9yKHJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUsIG1vZHVsZU5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZUFuYWx5emVyICEubGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZSk7XG4gIH1cblxuICBnZXRMaWJyYXJ5U3VtbWFyaWVzKCk6IE1hcDxzdHJpbmcsIGFwaS5MaWJyYXJ5U3VtbWFyeT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRHZW5lcmF0ZWRGaWxlcygpOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0RW1pdHRlZFNvdXJjZUZpbGVzKCk6IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFuYWx5emVkKCk6IEl2eUNvbXBpbGF0aW9uIHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBhbmFseXplU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplJyk7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcbiAgICAgIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpXG4gICAgICAgICAgLmZvckVhY2goZmlsZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhbmFseXplRmlsZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZUZpbGUnLCBmaWxlKTtcbiAgICAgICAgICAgIHRoaXMuY29tcGlsYXRpb24gIS5hbmFseXplU3luYyhmaWxlKTtcbiAgICAgICAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKTtcbiAgICAgICAgICB9KTtcbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZVNwYW4pO1xuICAgICAgdGhpcy5jb21waWxhdGlvbi5yZXNvbHZlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbXBpbGF0aW9uO1xuICB9XG5cbiAgZW1pdChvcHRzPzoge1xuICAgIGVtaXRGbGFncz86IGFwaS5FbWl0RmxhZ3MsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBhcGkuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IGFwaS5Uc0VtaXRDYWxsYmFjayxcbiAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBhcGkuVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2tcbiAgfSk6IHRzLkVtaXRSZXN1bHQge1xuICAgIGNvbnN0IGVtaXRDYWxsYmFjayA9IG9wdHMgJiYgb3B0cy5lbWl0Q2FsbGJhY2sgfHwgZGVmYXVsdEVtaXRDYWxsYmFjaztcblxuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgY29uc3Qgd3JpdGVGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9XG4gICAgICAgIChmaWxlTmFtZTogc3RyaW5nLCBkYXRhOiBzdHJpbmcsIHdyaXRlQnl0ZU9yZGVyTWFyazogYm9vbGVhbixcbiAgICAgICAgIG9uRXJyb3I6ICgobWVzc2FnZTogc3RyaW5nKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCxcbiAgICAgICAgIHNvdXJjZUZpbGVzOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+fCB1bmRlZmluZWQpID0+IHtcbiAgICAgICAgICBpZiAodGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkICYmIGZpbGVOYW1lLmVuZHNXaXRoKCcuanMnKSkge1xuICAgICAgICAgICAgZGF0YSA9IG5vY29sbGFwc2VIYWNrKGRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmhvc3Qud3JpdGVGaWxlKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKTtcbiAgICAgICAgfTtcblxuICAgIGNvbnN0IGN1c3RvbVRyYW5zZm9ybXMgPSBvcHRzICYmIG9wdHMuY3VzdG9tVHJhbnNmb3JtZXJzO1xuXG4gICAgY29uc3QgYmVmb3JlVHJhbnNmb3JtcyA9IFtcbiAgICAgIGl2eVRyYW5zZm9ybUZhY3RvcnkoXG4gICAgICAgICAgY29tcGlsYXRpb24sIHRoaXMucmVmbGVjdG9yLCB0aGlzLmltcG9ydFJld3JpdGVyLCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQpLFxuICAgICAgYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLmV4cG9ydFN0YXRlbWVudHMpIGFzIHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPixcbiAgICAgIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIuaW1wb3J0UHJlc2VydmluZ1RyYW5zZm9ybWVyKCksXG4gICAgXTtcbiAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMgPSBbXG4gICAgICBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24pLFxuICAgIF07XG5cblxuICAgIGlmICh0aGlzLmZhY3RvcnlUb1NvdXJjZUluZm8gIT09IG51bGwpIHtcbiAgICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaChcbiAgICAgICAgICBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtKHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbywgdGhpcy5pbXBvcnRSZXdyaXRlcikpO1xuICAgIH1cbiAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goaXZ5U3dpdGNoVHJhbnNmb3JtKTtcbiAgICBpZiAoY3VzdG9tVHJhbnNmb3JtcyAmJiBjdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzKSB7XG4gICAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goLi4uY3VzdG9tVHJhbnNmb3Jtcy5iZWZvcmVUcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZW1pdFNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnZW1pdCcpO1xuICAgIGNvbnN0IGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10gPSBbXTtcblxuICAgIGNvbnN0IHR5cGVDaGVja0ZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHRoaXMudHlwZUNoZWNrRmlsZVBhdGgpO1xuXG4gICAgZm9yIChjb25zdCB0YXJnZXRTb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICh0YXJnZXRTb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlIHx8IHRhcmdldFNvdXJjZUZpbGUgPT09IHR5cGVDaGVja0ZpbGUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmluY3JlbWVudGFsU3RhdGUuc2FmZVRvU2tpcCh0YXJnZXRTb3VyY2VGaWxlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmlsZUVtaXRTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2VtaXRGaWxlJywgdGFyZ2V0U291cmNlRmlsZSk7XG4gICAgICBlbWl0UmVzdWx0cy5wdXNoKGVtaXRDYWxsYmFjayh7XG4gICAgICAgIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZW1pdE9ubHlEdHNGaWxlczogZmFsc2UsIHdyaXRlRmlsZSxcbiAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgYmVmb3JlOiBiZWZvcmVUcmFuc2Zvcm1zLFxuICAgICAgICAgIGFmdGVyOiBjdXN0b21UcmFuc2Zvcm1zICYmIGN1c3RvbVRyYW5zZm9ybXMuYWZ0ZXJUcyxcbiAgICAgICAgICBhZnRlckRlY2xhcmF0aW9uczogYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zLFxuICAgICAgICB9LFxuICAgICAgfSkpO1xuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChmaWxlRW1pdFNwYW4pO1xuICAgIH1cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGVtaXRTcGFuKTtcblxuICAgIGlmICh0aGlzLnBlcmZUcmFja2VyICE9PSBudWxsICYmIHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucGVyZlRyYWNrZXIuc2VyaWFsaXplVG9GaWxlKHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlLCB0aGlzLmhvc3QpO1xuICAgIH1cblxuICAgIC8vIFJ1biB0aGUgZW1pdCwgaW5jbHVkaW5nIGEgY3VzdG9tIHRyYW5zZm9ybWVyIHRoYXQgd2lsbCBkb3dubGV2ZWwgdGhlIEl2eSBkZWNvcmF0b3JzIGluIGNvZGUuXG4gICAgcmV0dXJuICgob3B0cyAmJiBvcHRzLm1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaykgfHwgbWVyZ2VFbWl0UmVzdWx0cykoZW1pdFJlc3VsdHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIC8vIFNraXAgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpZiBpdCdzIGRpc2FibGVkLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuaXZ5VGVtcGxhdGVUeXBlQ2hlY2sgPT09IGZhbHNlICYmXG4gICAgICAgIHRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2sgIT09IHRydWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIC8vIFJ1biB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nLlxuXG4gICAgLy8gRmlyc3Qgc2VsZWN0IGEgdHlwZS1jaGVja2luZyBjb25maWd1cmF0aW9uLCBiYXNlZCBvbiB3aGV0aGVyIGZ1bGwgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpc1xuICAgIC8vIHJlcXVlc3RlZC5cbiAgICBsZXQgdHlwZUNoZWNraW5nQ29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWc7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IHRydWUsXG4gICAgICAgIGNoZWNrUXVlcmllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVGVtcGxhdGVCb2RpZXM6IHRydWUsXG4gICAgICAgIGNoZWNrVHlwZU9mQmluZGluZ3M6IHRydWUsXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IHRydWUsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IHRydWUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcgPSB7XG4gICAgICAgIGFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZlBpcGVzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogZmFsc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEV4ZWN1dGUgdGhlIHR5cGVDaGVjayBwaGFzZSBvZiBlYWNoIGRlY29yYXRvciBpbiB0aGUgcHJvZ3JhbS5cbiAgICBjb25zdCBwcmVwU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCd0eXBlQ2hlY2tQcmVwJyk7XG4gICAgY29uc3QgY3R4ID0gbmV3IFR5cGVDaGVja0NvbnRleHQodHlwZUNoZWNraW5nQ29uZmlnLCB0aGlzLnJlZkVtaXR0ZXIgISwgdGhpcy50eXBlQ2hlY2tGaWxlUGF0aCk7XG4gICAgY29tcGlsYXRpb24udHlwZUNoZWNrKGN0eCk7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChwcmVwU3Bhbik7XG5cbiAgICAvLyBHZXQgdGhlIGRpYWdub3N0aWNzLlxuICAgIGNvbnN0IHR5cGVDaGVja1NwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgndHlwZUNoZWNrRGlhZ25vc3RpY3MnKTtcbiAgICBjb25zdCB7ZGlhZ25vc3RpY3MsIHByb2dyYW19ID1cbiAgICAgICAgY3R4LmNhbGN1bGF0ZVRlbXBsYXRlRGlhZ25vc3RpY3ModGhpcy50c1Byb2dyYW0sIHRoaXMuaG9zdCwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKHR5cGVDaGVja1NwYW4pO1xuICAgIHRoaXMucmV1c2VUc1Byb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlQ29tcGlsYXRpb24oKTogSXZ5Q29tcGlsYXRpb24ge1xuICAgIGNvbnN0IGNoZWNrZXIgPSB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgbGV0IGFsaWFzR2VuZXJhdG9yOiBBbGlhc0dlbmVyYXRvcnxudWxsID0gbnVsbDtcbiAgICAvLyBDb25zdHJ1Y3QgdGhlIFJlZmVyZW5jZUVtaXR0ZXIuXG4gICAgaWYgKHRoaXMuZmlsZVRvTW9kdWxlSG9zdCA9PT0gbnVsbCB8fCAhdGhpcy5vcHRpb25zLl91c2VIb3N0Rm9ySW1wb3J0R2VuZXJhdGlvbikge1xuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBkb2Vzbid0IGhhdmUgZmlsZU5hbWVUb01vZHVsZU5hbWUsIHNvIGJ1aWxkIGFuIE5QTS1jZW50cmljIHJlZmVyZW5jZVxuICAgICAgLy8gcmVzb2x1dGlvbiBzdHJhdGVneS5cbiAgICAgIHRoaXMucmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gTmV4dCwgYXR0ZW1wdCB0byB1c2UgYW4gYWJzb2x1dGUgaW1wb3J0LlxuICAgICAgICBuZXcgQWJzb2x1dGVNb2R1bGVTdHJhdGVneShcbiAgICAgICAgICAgIHRoaXMudHNQcm9ncmFtLCBjaGVja2VyLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgcmVmZXJlbmNlIGlzIGJlaW5nIHdyaXR0ZW4gaW50byBhIGZpbGUgd2l0aGluIHRoZSBwcm9qZWN0J3MgbG9naWNhbFxuICAgICAgICAvLyBmaWxlIHN5c3RlbSwgYW5kIHVzZSBhIHJlbGF0aXZlIGltcG9ydCBpZiBzby4gSWYgdGhpcyBmYWlscywgUmVmZXJlbmNlRW1pdHRlciB3aWxsIHRocm93XG4gICAgICAgIC8vIGFuIGVycm9yLlxuICAgICAgICBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneShjaGVja2VyLCBuZXcgTG9naWNhbEZpbGVTeXN0ZW0odGhpcy5yb290RGlycykpLFxuICAgICAgXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBDb21waWxlckhvc3Qgc3VwcG9ydHMgZmlsZU5hbWVUb01vZHVsZU5hbWUsIHNvIHVzZSB0aGF0IHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgIHRoaXMucmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgYWxpYXNlZCByZWZlcmVuY2VzICh0aGlzIGlzIGEgd29ya2Fyb3VuZCB0byBTdHJpY3REZXBzIGNoZWNrcykuXG4gICAgICAgIG5ldyBBbGlhc1N0cmF0ZWd5KCksXG4gICAgICAgIC8vIFRoZW4gdXNlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lIHRvIGVtaXQgaW1wb3J0cy5cbiAgICAgICAgbmV3IEZpbGVUb01vZHVsZVN0cmF0ZWd5KGNoZWNrZXIsIHRoaXMuZmlsZVRvTW9kdWxlSG9zdCksXG4gICAgICBdKTtcbiAgICAgIGFsaWFzR2VuZXJhdG9yID0gbmV3IEFsaWFzR2VuZXJhdG9yKHRoaXMuZmlsZVRvTW9kdWxlSG9zdCk7XG4gICAgfVxuXG4gICAgY29uc3QgZXZhbHVhdG9yID0gbmV3IFBhcnRpYWxFdmFsdWF0b3IodGhpcy5yZWZsZWN0b3IsIGNoZWNrZXIsIHRoaXMuaW5jcmVtZW50YWxTdGF0ZSk7XG4gICAgY29uc3QgZHRzUmVhZGVyID0gbmV3IER0c01ldGFkYXRhUmVhZGVyKGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWFkZXIgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlYWRlcihbbG9jYWxNZXRhUmVnaXN0cnksIHRoaXMuaW5jcmVtZW50YWxTdGF0ZV0pO1xuICAgIGNvbnN0IGRlcFNjb3BlUmVhZGVyID0gbmV3IE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcihkdHNSZWFkZXIsIGFsaWFzR2VuZXJhdG9yKTtcbiAgICBjb25zdCBzY29wZVJlZ2lzdHJ5ID0gbmV3IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeShcbiAgICAgICAgbG9jYWxNZXRhUmVhZGVyLCBkZXBTY29wZVJlYWRlciwgdGhpcy5yZWZFbWl0dGVyLCBhbGlhc0dlbmVyYXRvcik7XG4gICAgY29uc3QgbWV0YVJlZ2lzdHJ5ID1cbiAgICAgICAgbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbbG9jYWxNZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIHRoaXMuaW5jcmVtZW50YWxTdGF0ZV0pO1xuXG4gICAgdGhpcy5tZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW2xvY2FsTWV0YVJlYWRlciwgZHRzUmVhZGVyXSk7XG5cblxuICAgIC8vIElmIGEgZmxhdCBtb2R1bGUgZW50cnlwb2ludCB3YXMgc3BlY2lmaWVkLCB0aGVuIHRyYWNrIHJlZmVyZW5jZXMgdmlhIGEgYFJlZmVyZW5jZUdyYXBoYFxuICAgIC8vIGluXG4gICAgLy8gb3JkZXIgdG8gcHJvZHVjZSBwcm9wZXIgZGlhZ25vc3RpY3MgZm9yIGluY29ycmVjdGx5IGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMvZXRjLiBJZlxuICAgIC8vIHRoZXJlXG4gICAgLy8gaXMgbm8gZmxhdCBtb2R1bGUgZW50cnlwb2ludCB0aGVuIGRvbid0IHBheSB0aGUgY29zdCBvZiB0cmFja2luZyByZWZlcmVuY2VzLlxuICAgIGxldCByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeTtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoID0gbmV3IFJlZmVyZW5jZUdyYXBoKCk7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgUmVmZXJlbmNlR3JhcGhBZGFwdGVyKHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSgpO1xuICAgIH1cblxuICAgIHRoaXMucm91dGVBbmFseXplciA9IG5ldyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIodGhpcy5tb2R1bGVSZXNvbHZlciwgZXZhbHVhdG9yKTtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnMgPSBbXG4gICAgICBuZXcgQmFzZURlZkRlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCB0aGlzLm1ldGFSZWFkZXIgISwgc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgdGhpcy5yZXNvdXJjZU1hbmFnZXIsIHRoaXMucm9vdERpcnMsIHRoaXMub3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzIHx8IGZhbHNlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHMgIT09IGZhbHNlLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsXG4gICAgICAgICAgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyKSxcbiAgICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycyB8fCBmYWxzZSksXG4gICAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgcmVmZXJlbmNlc1JlZ2lzdHJ5LCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICB0aGlzLnJvdXRlQW5hbHl6ZXIsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlcixcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaTE4bkluTG9jYWxlKSxcbiAgICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICB0aGlzLnJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuaXNDb3JlKSxcbiAgICBdO1xuXG4gICAgcmV0dXJuIG5ldyBJdnlDb21waWxhdGlvbihcbiAgICAgICAgaGFuZGxlcnMsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmltcG9ydFJld3JpdGVyLCB0aGlzLmluY3JlbWVudGFsU3RhdGUsIHRoaXMucGVyZlJlY29yZGVyLFxuICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMsIHNjb3BlUmVnaXN0cnkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgcmVmbGVjdG9yKCk6IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCB7XG4gICAgaWYgKHRoaXMuX3JlZmxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9yZWZsZWN0b3IgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmVmbGVjdG9yO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgY29yZUltcG9ydHNGcm9tKCk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgaWYgKHRoaXMuX2NvcmVJbXBvcnRzRnJvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb3JlSW1wb3J0c0Zyb20gPSB0aGlzLmlzQ29yZSAmJiBnZXRSM1N5bWJvbHNGaWxlKHRoaXMudHNQcm9ncmFtKSB8fCBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29yZUltcG9ydHNGcm9tO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaXNDb3JlKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9pc0NvcmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5faXNDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy50c1Byb2dyYW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faXNDb3JlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaW1wb3J0UmV3cml0ZXIoKTogSW1wb3J0UmV3cml0ZXIge1xuICAgIGlmICh0aGlzLl9pbXBvcnRSZXdyaXRlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjb3JlSW1wb3J0c0Zyb20gPSB0aGlzLmNvcmVJbXBvcnRzRnJvbTtcbiAgICAgIHRoaXMuX2ltcG9ydFJld3JpdGVyID0gY29yZUltcG9ydHNGcm9tICE9PSBudWxsID9cbiAgICAgICAgICBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIoY29yZUltcG9ydHNGcm9tLmZpbGVOYW1lKSA6XG4gICAgICAgICAgbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faW1wb3J0UmV3cml0ZXI7XG4gIH1cbn1cblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogYXBpLlRzRW1pdENhbGxiYWNrID1cbiAgICAoe3Byb2dyYW0sIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnN9KSA9PlxuICAgICAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cblxuICByZXR1cm4ge2RpYWdub3N0aWNzLCBlbWl0U2tpcHBlZCwgZW1pdHRlZEZpbGVzfTtcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSAncjNfc3ltYm9scy50cycgZmlsZSBpbiB0aGUgZ2l2ZW4gYFByb2dyYW1gLCBvciByZXR1cm4gYG51bGxgIGlmIGl0IHdhc24ndCB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maW5kKGZpbGUgPT4gZmlsZS5maWxlTmFtZS5pbmRleE9mKCdyM19zeW1ib2xzLnRzJykgPj0gMCkgfHwgbnVsbDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgdGhlIGdpdmVuIGBQcm9ncmFtYCBpcyBAYW5ndWxhci9jb3JlLlxuICovXG5mdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUGFja2FnZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogYm9vbGVhbiB7XG4gIC8vIExvb2sgZm9yIGl0c19qdXN0X2FuZ3VsYXIudHMgc29tZXdoZXJlIGluIHRoZSBwcm9ncmFtLlxuICBjb25zdCByM1N5bWJvbHMgPSBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW0pO1xuICBpZiAocjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIGNvbnN0YW50IElUU19KVVNUX0FOR1VMQVIgaW4gdGhhdCBmaWxlLlxuICByZXR1cm4gcjNTeW1ib2xzLnN0YXRlbWVudHMuc29tZShzdG10ID0+IHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IG11c3QgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgYmUgZXhwb3J0ZWQuXG4gICAgaWYgKHN0bXQubW9kaWZpZXJzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXN0bXQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgZGVjbGFyZSBJVFNfSlVTVF9BTkdVTEFSLlxuICAgIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuc29tZShkZWNsID0+IHtcbiAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBtdXN0IG1hdGNoIHRoZSBuYW1lLlxuICAgICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSB8fCBkZWNsLm5hbWUudGV4dCAhPT0gJ0lUU19KVVNUX0FOR1VMQVInKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEl0IG11c3QgaW5pdGlhbGl6ZSB0aGUgdmFyaWFibGUgdG8gdHJ1ZS5cbiAgICAgIGlmIChkZWNsLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQgfHwgZGVjbC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgZGVmaW5pdGlvbiBtYXRjaGVzLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlR3JhcGhBZGFwdGVyIGltcGxlbWVudHMgUmVmZXJlbmNlc1JlZ2lzdHJ5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBncmFwaDogUmVmZXJlbmNlR3JhcGgpIHt9XG5cbiAgYWRkKHNvdXJjZTogdHMuRGVjbGFyYXRpb24sIC4uLnJlZmVyZW5jZXM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qge25vZGV9IG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCBzb3VyY2VGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNvdXJjZUZpbGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IHJlY29yZCBsb2NhbCByZWZlcmVuY2VzIChub3QgcmVmZXJlbmNlcyBpbnRvIC5kLnRzIGZpbGVzKS5cbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQgfHwgIWlzRHRzUGF0aChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICB0aGlzLmdyYXBoLmFkZChzb3VyY2UsIG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzaG91bGRFbmFibGVQZXJmVHJhY2luZyhvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKTogYm9vbGVhbiB7XG4gIHJldHVybiBvcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZDtcbn1cbiJdfQ==