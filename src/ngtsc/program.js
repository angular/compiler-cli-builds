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
                    if (this.incrementalState.safeToSkipEmit(targetSourceFile)) {
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
                    new imports_1.AbsoluteModuleStrategy(this.tsProgram, checker, this.options, this.host),
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
            var evaluator = new partial_evaluator_1.PartialEvaluator(this.reflector, checker);
            var dtsReader = new metadata_1.DtsMetadataReader(checker, this.reflector);
            var localMetaRegistry = new metadata_1.LocalMetadataRegistry();
            var depScopeReader = new scope_1.MetadataDtsModuleScopeResolver(dtsReader, aliasGenerator);
            var scopeRegistry = new scope_1.LocalModuleScopeRegistry(localMetaRegistry, depScopeReader, this.refEmitter, aliasGenerator);
            var metaRegistry = new metadata_1.CompoundMetadataRegistry([localMetaRegistry, scopeRegistry]);
            this.metaReader = new metadata_1.CompoundMetadataReader([localMetaRegistry, dtsReader]);
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
                new annotations_1.NgModuleDecoratorHandler(this.reflector, evaluator, metaRegistry, scopeRegistry, referencesRegistry, this.isCore, this.routeAnalyzer, this.refEmitter, this.defaultImportTracker),
                new annotations_1.PipeDecoratorHandler(this.reflector, evaluator, metaRegistry, this.defaultImportTracker, this.isCore),
            ];
            return new transform_1.IvyCompilation(handlers, checker, this.reflector, this.importRewriter, this.incrementalState, this.perfRecorder, this.sourceToFactorySymbols);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsMEZBQStEO0lBRS9ELDJFQUEyTTtJQUMzTSxxRkFBbUU7SUFDbkUsaUVBQW9EO0lBQ3BELDJFQUFxRDtJQUNyRCwyRUFBa0g7SUFDbEgsbUVBQXlTO0lBQ3pTLDJFQUErQztJQUMvQyxxRUFBc0k7SUFDdEksdUZBQXFEO0lBQ3JELDZEQUF5RDtJQUN6RCw2REFBcUU7SUFDckUseUVBQXNEO0lBQ3RELG1GQUFxRDtJQUNyRCxtRUFBa0U7SUFDbEUsK0RBQWlGO0lBQ2pGLCtEQUFxSztJQUNySyxpRUFBNEM7SUFDNUMsdUVBQTZGO0lBQzdGLDZFQUE0RDtJQUM1RCx1RUFBb0Y7SUFDcEYsc0VBQW9EO0lBQ3BELGtGQUFnRjtJQUVoRjtRQWdDRSxzQkFDSSxTQUFnQyxFQUFVLE9BQTRCLEVBQ3RFLElBQXNCLEVBQUUsVUFBeUI7WUFGckQsaUJBNkZDO1lBNUY2QyxZQUFPLEdBQVAsT0FBTyxDQUFxQjtZQTdCbEUsZ0JBQVcsR0FBNkIsU0FBUyxDQUFDO1lBQ2xELHdCQUFtQixHQUFrQyxJQUFJLENBQUM7WUFDMUQsMkJBQXNCLEdBQWtDLElBQUksQ0FBQztZQUU3RCxxQkFBZ0IsR0FBaUMsU0FBUyxDQUFDO1lBQzNELG9CQUFlLEdBQTZCLFNBQVMsQ0FBQztZQUN0RCxlQUFVLEdBQXVDLFNBQVMsQ0FBQztZQUMzRCxZQUFPLEdBQXNCLFNBQVMsQ0FBQztZQUl2Qyx5QkFBb0IsR0FBd0IsSUFBSSxDQUFDO1lBQ2pELHVCQUFrQixHQUE0QixJQUFJLENBQUM7WUFDbkQsa0JBQWEsR0FBK0IsSUFBSSxDQUFDO1lBRWpELDRCQUF1QixHQUFvQixFQUFFLENBQUM7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bnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0dlbmVyYXRlZEZpbGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnLi4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge25vY29sbGFwc2VIYWNrfSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvbm9jb2xsYXBzZV9oYWNrJztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5LCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuL2Fubm90YXRpb25zJztcbmltcG9ydCB7QmFzZURlZkRlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4vYW5ub3RhdGlvbnMvc3JjL2Jhc2VfZGVmJztcbmltcG9ydCB7Q3ljbGVBbmFseXplciwgSW1wb3J0R3JhcGh9IGZyb20gJy4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ZsYXRJbmRleEdlbmVyYXRvciwgUmVmZXJlbmNlR3JhcGgsIGNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50fSBmcm9tICcuL2VudHJ5X3BvaW50JztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgQWxpYXNHZW5lcmF0b3IsIEFsaWFzU3RyYXRlZ3ksIERlZmF1bHRJbXBvcnRUcmFja2VyLCBGaWxlVG9Nb2R1bGVIb3N0LCBGaWxlVG9Nb2R1bGVTdHJhdGVneSwgSW1wb3J0UmV3cml0ZXIsIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBNb2R1bGVSZXNvbHZlciwgTm9vcEltcG9ydFJld3JpdGVyLCBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuL2ltcG9ydHMnO1xuaW1wb3J0IHtJbmNyZW1lbnRhbFN0YXRlfSBmcm9tICcuL2luY3JlbWVudGFsJztcbmltcG9ydCB7Q29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlcn0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgTG9naWNhbEZpbGVTeXN0ZW19IGZyb20gJy4vcGF0aCc7XG5pbXBvcnQge05PT1BfUEVSRl9SRUNPUkRFUiwgUGVyZlJlY29yZGVyLCBQZXJmVHJhY2tlcn0gZnJvbSAnLi9wZXJmJztcbmltcG9ydCB7VHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtIb3N0UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vcmVzb3VyY2VfbG9hZGVyJztcbmltcG9ydCB7TmdNb2R1bGVSb3V0ZUFuYWx5emVyLCBlbnRyeVBvaW50S2V5Rm9yfSBmcm9tICcuL3JvdXRpbmcnO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcn0gZnJvbSAnLi9zY29wZSc7XG5pbXBvcnQge0ZhY3RvcnlHZW5lcmF0b3IsIEZhY3RvcnlJbmZvLCBHZW5lcmF0ZWRTaGltc0hvc3RXcmFwcGVyLCBTaGltR2VuZXJhdG9yLCBTdW1tYXJ5R2VuZXJhdG9yLCBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLCBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtfSBmcm9tICcuL3NoaW1zJztcbmltcG9ydCB7aXZ5U3dpdGNoVHJhbnNmb3JtfSBmcm9tICcuL3N3aXRjaCc7XG5pbXBvcnQge0l2eUNvbXBpbGF0aW9uLCBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnksIGl2eVRyYW5zZm9ybUZhY3Rvcnl9IGZyb20gJy4vdHJhbnNmb3JtJztcbmltcG9ydCB7YWxpYXNUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL3RyYW5zZm9ybS9zcmMvYWxpYXMnO1xuaW1wb3J0IHtUeXBlQ2hlY2tDb250ZXh0LCBUeXBlQ2hlY2tpbmdDb25maWcsIHR5cGVDaGVja0ZpbGVQYXRofSBmcm9tICcuL3R5cGVjaGVjayc7XG5pbXBvcnQge25vcm1hbGl6ZVNlcGFyYXRvcnN9IGZyb20gJy4vdXRpbC9zcmMvcGF0aCc7XG5pbXBvcnQge2dldFJvb3REaXJzLCBpc0R0c1BhdGgsIHJlc29sdmVNb2R1bGVOYW1lfSBmcm9tICcuL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgY2xhc3MgTmd0c2NQcm9ncmFtIGltcGxlbWVudHMgYXBpLlByb2dyYW0ge1xuICBwcml2YXRlIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJpdmF0ZSByZXVzZVRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEhvc3RSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjb21waWxhdGlvbjogSXZ5Q29tcGlsYXRpb258dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIGZhY3RvcnlUb1NvdXJjZUluZm86IE1hcDxzdHJpbmcsIEZhY3RvcnlJbmZvPnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBzb3VyY2VUb0ZhY3RvcnlTeW1ib2xzOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj58bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0O1xuICBwcml2YXRlIF9jb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGV8bnVsbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2ltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3JlZmxlY3RvcjogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfaXNDb3JlOiBib29sZWFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXTtcbiAgcHJpdmF0ZSBjbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGVudHJ5UG9pbnQ6IHRzLlNvdXJjZUZpbGV8bnVsbDtcbiAgcHJpdmF0ZSBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZmxhdEluZGV4R2VuZXJhdG9yOiBGbGF0SW5kZXhHZW5lcmF0b3J8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyfG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyfG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBmaWxlVG9Nb2R1bGVIb3N0OiBGaWxlVG9Nb2R1bGVIb3N0fG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRlZmF1bHRJbXBvcnRUcmFja2VyOiBEZWZhdWx0SW1wb3J0VHJhY2tlcjtcbiAgcHJpdmF0ZSBwZXJmUmVjb3JkZXI6IFBlcmZSZWNvcmRlciA9IE5PT1BfUEVSRl9SRUNPUkRFUjtcbiAgcHJpdmF0ZSBwZXJmVHJhY2tlcjogUGVyZlRyYWNrZXJ8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaW5jcmVtZW50YWxTdGF0ZTogSW5jcmVtZW50YWxTdGF0ZTtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tGaWxlUGF0aDogQWJzb2x1dGVGc1BhdGg7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgaG9zdDogYXBpLkNvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IE5ndHNjUHJvZ3JhbSkge1xuICAgIGlmIChzaG91bGRFbmFibGVQZXJmVHJhY2luZyhvcHRpb25zKSkge1xuICAgICAgdGhpcy5wZXJmVHJhY2tlciA9IFBlcmZUcmFja2VyLnplcm9lZFRvTm93KCk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlciA9IHRoaXMucGVyZlRyYWNrZXI7XG4gICAgfVxuXG4gICAgdGhpcy5yb290RGlycyA9IGdldFJvb3REaXJzKGhvc3QsIG9wdGlvbnMpO1xuICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCA9ICEhb3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjtcbiAgICB0aGlzLnJlc291cmNlTWFuYWdlciA9IG5ldyBIb3N0UmVzb3VyY2VMb2FkZXIoaG9zdCwgb3B0aW9ucyk7XG4gICAgY29uc3Qgc2hvdWxkR2VuZXJhdGVTaGltcyA9IG9wdGlvbnMuYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyB8fCBmYWxzZTtcbiAgICBjb25zdCBub3JtYWxpemVkUm9vdE5hbWVzID0gcm9vdE5hbWVzLm1hcChuID0+IEFic29sdXRlRnNQYXRoLmZyb20obikpO1xuICAgIHRoaXMuaG9zdCA9IGhvc3Q7XG4gICAgaWYgKGhvc3QuZmlsZU5hbWVUb01vZHVsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5maWxlVG9Nb2R1bGVIb3N0ID0gaG9zdCBhcyBGaWxlVG9Nb2R1bGVIb3N0O1xuICAgIH1cbiAgICBsZXQgcm9vdEZpbGVzID0gWy4uLnJvb3ROYW1lc107XG5cbiAgICBjb25zdCBnZW5lcmF0b3JzOiBTaGltR2VuZXJhdG9yW10gPSBbXTtcbiAgICBpZiAoc2hvdWxkR2VuZXJhdGVTaGltcykge1xuICAgICAgLy8gU3VtbWFyeSBnZW5lcmF0aW9uLlxuICAgICAgY29uc3Qgc3VtbWFyeUdlbmVyYXRvciA9IFN1bW1hcnlHZW5lcmF0b3IuZm9yUm9vdEZpbGVzKG5vcm1hbGl6ZWRSb290TmFtZXMpO1xuXG4gICAgICAvLyBGYWN0b3J5IGdlbmVyYXRpb24uXG4gICAgICBjb25zdCBmYWN0b3J5R2VuZXJhdG9yID0gRmFjdG9yeUdlbmVyYXRvci5mb3JSb290RmlsZXMobm9ybWFsaXplZFJvb3ROYW1lcyk7XG4gICAgICBjb25zdCBmYWN0b3J5RmlsZU1hcCA9IGZhY3RvcnlHZW5lcmF0b3IuZmFjdG9yeUZpbGVNYXA7XG4gICAgICB0aGlzLmZhY3RvcnlUb1NvdXJjZUluZm8gPSBuZXcgTWFwPHN0cmluZywgRmFjdG9yeUluZm8+KCk7XG4gICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7XG4gICAgICBmYWN0b3J5RmlsZU1hcC5mb3JFYWNoKChzb3VyY2VGaWxlUGF0aCwgZmFjdG9yeVBhdGgpID0+IHtcbiAgICAgICAgY29uc3QgbW9kdWxlU3ltYm9sTmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzICEuc2V0KHNvdXJjZUZpbGVQYXRoLCBtb2R1bGVTeW1ib2xOYW1lcyk7XG4gICAgICAgIHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbyAhLnNldChmYWN0b3J5UGF0aCwge3NvdXJjZUZpbGVQYXRoLCBtb2R1bGVTeW1ib2xOYW1lc30pO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGZhY3RvcnlGaWxlTmFtZXMgPSBBcnJheS5mcm9tKGZhY3RvcnlGaWxlTWFwLmtleXMoKSk7XG4gICAgICByb290RmlsZXMucHVzaCguLi5mYWN0b3J5RmlsZU5hbWVzLCAuLi5zdW1tYXJ5R2VuZXJhdG9yLmdldFN1bW1hcnlGaWxlTmFtZXMoKSk7XG4gICAgICBnZW5lcmF0b3JzLnB1c2goc3VtbWFyeUdlbmVyYXRvciwgZmFjdG9yeUdlbmVyYXRvcik7XG4gICAgfVxuXG4gICAgdGhpcy50eXBlQ2hlY2tGaWxlUGF0aCA9IHR5cGVDaGVja0ZpbGVQYXRoKHRoaXMucm9vdERpcnMpO1xuICAgIGdlbmVyYXRvcnMucHVzaChuZXcgVHlwZUNoZWNrU2hpbUdlbmVyYXRvcih0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKSk7XG4gICAgcm9vdEZpbGVzLnB1c2godGhpcy50eXBlQ2hlY2tGaWxlUGF0aCk7XG5cbiAgICBsZXQgZW50cnlQb2ludDogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGlmIChvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGVudHJ5UG9pbnQgPSBmaW5kRmxhdEluZGV4RW50cnlQb2ludChub3JtYWxpemVkUm9vdE5hbWVzKTtcbiAgICAgIGlmIChlbnRyeVBvaW50ID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgZXJyb3IgbWVzc2FnZSB0YWxrcyBzcGVjaWZpY2FsbHkgYWJvdXQgaGF2aW5nIGEgc2luZ2xlIC50cyBmaWxlIGluIFwiZmlsZXNcIi4gSG93ZXZlclxuICAgICAgICAvLyB0aGUgYWN0dWFsIGxvZ2ljIGlzIGEgYml0IG1vcmUgcGVybWlzc2l2ZS4gSWYgYSBzaW5nbGUgZmlsZSBleGlzdHMsIHRoYXQgd2lsbCBiZSB0YWtlbixcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBoaWdoZXN0IGxldmVsIChzaG9ydGVzdCBwYXRoKSBcImluZGV4LnRzXCIgZmlsZSB3aWxsIGJlIHVzZWQgYXMgdGhlIGZsYXRcbiAgICAgICAgLy8gbW9kdWxlIGVudHJ5IHBvaW50IGluc3RlYWQuIElmIG5laXRoZXIgb2YgdGhlc2UgY29uZGl0aW9ucyBhcHBseSwgdGhlIGVycm9yIGJlbG93IGlzXG4gICAgICAgIC8vIGdpdmVuLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGUgdXNlciBpcyBub3QgaW5mb3JtZWQgYWJvdXQgdGhlIFwiaW5kZXgudHNcIiBvcHRpb24gYXMgdGhpcyBiZWhhdmlvciBpcyBkZXByZWNhdGVkIC1cbiAgICAgICAgLy8gYW4gZXhwbGljaXQgZW50cnlwb2ludCBzaG91bGQgYWx3YXlzIGJlIHNwZWNpZmllZC5cbiAgICAgICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIGNvZGU6IG5nRXJyb3JDb2RlKEVycm9yQ29kZS5DT05GSUdfRkxBVF9NT0RVTEVfTk9fSU5ERVgpLFxuICAgICAgICAgIGZpbGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgICAgICAnQW5ndWxhciBjb21waWxlciBvcHRpb24gXCJmbGF0TW9kdWxlT3V0RmlsZVwiIHJlcXVpcmVzIG9uZSBhbmQgb25seSBvbmUgLnRzIGZpbGUgaW4gdGhlIFwiZmlsZXNcIiBmaWVsZC4nLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGZsYXRNb2R1bGVJZCA9IG9wdGlvbnMuZmxhdE1vZHVsZUlkIHx8IG51bGw7XG4gICAgICAgIGNvbnN0IGZsYXRNb2R1bGVPdXRGaWxlID0gbm9ybWFsaXplU2VwYXJhdG9ycyhvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKTtcbiAgICAgICAgdGhpcy5mbGF0SW5kZXhHZW5lcmF0b3IgPVxuICAgICAgICAgICAgbmV3IEZsYXRJbmRleEdlbmVyYXRvcihlbnRyeVBvaW50LCBmbGF0TW9kdWxlT3V0RmlsZSwgZmxhdE1vZHVsZUlkKTtcbiAgICAgICAgZ2VuZXJhdG9ycy5wdXNoKHRoaXMuZmxhdEluZGV4R2VuZXJhdG9yKTtcbiAgICAgICAgcm9vdEZpbGVzLnB1c2godGhpcy5mbGF0SW5kZXhHZW5lcmF0b3IuZmxhdEluZGV4UGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGdlbmVyYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5ob3N0ID0gbmV3IEdlbmVyYXRlZFNoaW1zSG9zdFdyYXBwZXIoaG9zdCwgZ2VuZXJhdG9ycyk7XG4gICAgfVxuXG4gICAgdGhpcy50c1Byb2dyYW0gPVxuICAgICAgICB0cy5jcmVhdGVQcm9ncmFtKHJvb3RGaWxlcywgb3B0aW9ucywgdGhpcy5ob3N0LCBvbGRQcm9ncmFtICYmIG9sZFByb2dyYW0ucmV1c2VUc1Byb2dyYW0pO1xuICAgIHRoaXMucmV1c2VUc1Byb2dyYW0gPSB0aGlzLnRzUHJvZ3JhbTtcblxuICAgIHRoaXMuZW50cnlQb2ludCA9IGVudHJ5UG9pbnQgIT09IG51bGwgPyB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGVudHJ5UG9pbnQpIHx8IG51bGwgOiBudWxsO1xuICAgIHRoaXMubW9kdWxlUmVzb2x2ZXIgPSBuZXcgTW9kdWxlUmVzb2x2ZXIodGhpcy50c1Byb2dyYW0sIG9wdGlvbnMsIHRoaXMuaG9zdCk7XG4gICAgdGhpcy5jeWNsZUFuYWx5emVyID0gbmV3IEN5Y2xlQW5hbHl6ZXIobmV3IEltcG9ydEdyYXBoKHRoaXMubW9kdWxlUmVzb2x2ZXIpKTtcbiAgICB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyID0gbmV3IERlZmF1bHRJbXBvcnRUcmFja2VyKCk7XG4gICAgaWYgKG9sZFByb2dyYW0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5pbmNyZW1lbnRhbFN0YXRlID0gSW5jcmVtZW50YWxTdGF0ZS5mcmVzaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluY3JlbWVudGFsU3RhdGUgPSBJbmNyZW1lbnRhbFN0YXRlLnJlY29uY2lsZShcbiAgICAgICAgICBvbGRQcm9ncmFtLmluY3JlbWVudGFsU3RhdGUsIG9sZFByb2dyYW0ucmV1c2VUc1Byb2dyYW0sIHRoaXMudHNQcm9ncmFtKTtcbiAgICB9XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7IHJldHVybiB0aGlzLnRzUHJvZ3JhbTsgfVxuXG4gIGdldFRzT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0T3B0aW9uc0RpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3MoXG4gICAgICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZXx1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PGFwaS5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBmaWxlTmFtZT86IHN0cmluZ3x1bmRlZmluZWQsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpY3xhcGkuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gWy4uLmNvbXBpbGF0aW9uLmRpYWdub3N0aWNzLCAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKV07XG4gICAgaWYgKHRoaXMuZW50cnlQb2ludCAhPT0gbnVsbCAmJiB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgICAgICAgdGhpcy5lbnRyeVBvaW50LCB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoKSk7XG4gICAgfVxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGFzeW5jIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgIH1cbiAgICBjb25zdCBhbmFseXplU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplJyk7XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwodGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZpbGUgPT4gIWZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5kLnRzJykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZmlsZSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhbmFseXplRmlsZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZUZpbGUnLCBmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYW5hbHlzaXNQcm9taXNlID0gdGhpcy5jb21waWxhdGlvbiAhLmFuYWx5emVBc3luYyhmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYW5hbHlzaXNQcm9taXNlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucGVyZlJlY29yZGVyLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuYWx5c2lzUHJvbWlzZSA9IGFuYWx5c2lzUHJvbWlzZS50aGVuKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgpID0+IHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhbmFseXNpc1Byb21pc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHJlc3VsdCk6IHJlc3VsdCBpcyBQcm9taXNlPHZvaWQ+ID0+IHJlc3VsdCAhPT0gdW5kZWZpbmVkKSk7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplU3Bhbik7XG4gICAgdGhpcy5jb21waWxhdGlvbi5yZXNvbHZlKCk7XG4gIH1cblxuICBsaXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlPzogc3RyaW5nfHVuZGVmaW5lZCk6IGFwaS5MYXp5Um91dGVbXSB7XG4gICAgaWYgKGVudHJ5Um91dGUpIHtcbiAgICAgIC8vIE5vdGU6XG4gICAgICAvLyBUaGlzIHJlc29sdXRpb24gc3RlcCBpcyBoZXJlIHRvIG1hdGNoIHRoZSBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgb2xkIGBBb3RDb21waWxlckhvc3RgIChzZWVcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvYmxvYi81MDczMmUxNTYvcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvY29tcGlsZXJfaG9zdC50cyNMMTc1LUwxODgpLlxuICAgICAgLy9cbiAgICAgIC8vIGBAYW5ndWxhci9jbGlgIHdpbGwgYWx3YXlzIGNhbGwgdGhpcyBBUEkgd2l0aCBhbiBhYnNvbHV0ZSBwYXRoLCBzbyB0aGUgcmVzb2x1dGlvbiBzdGVwIGlzXG4gICAgICAvLyBub3QgbmVjZXNzYXJ5LCBidXQga2VlcGluZyBpdCBiYWNrd2FyZHMgY29tcGF0aWJsZSBpbiBjYXNlIHNvbWVvbmUgZWxzZSBpcyB1c2luZyB0aGUgQVBJLlxuXG4gICAgICAvLyBSZWxhdGl2ZSBlbnRyeSBwYXRocyBhcmUgZGlzYWxsb3dlZC5cbiAgICAgIGlmIChlbnRyeVJvdXRlLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgRmFpbGVkIHRvIGxpc3QgbGF6eSByb3V0ZXM6IFJlc29sdXRpb24gb2YgcmVsYXRpdmUgcGF0aHMgKCR7ZW50cnlSb3V0ZX0pIGlzIG5vdCBzdXBwb3J0ZWQuYCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vbi1yZWxhdGl2ZSBlbnRyeSBwYXRocyBmYWxsIGludG8gb25lIG9mIHRoZSBmb2xsb3dpbmcgY2F0ZWdvcmllczpcbiAgICAgIC8vIC0gQWJzb2x1dGUgc3lzdGVtIHBhdGhzIChlLmcuIGAvZm9vL2Jhci9teS1wcm9qZWN0L215LW1vZHVsZWApLCB3aGljaCBhcmUgdW5hZmZlY3RlZCBieSB0aGVcbiAgICAgIC8vICAgbG9naWMgYmVsb3cuXG4gICAgICAvLyAtIFBhdGhzIHRvIGVudGVybmFsIG1vZHVsZXMgKGUuZy4gYHNvbWUtbGliYCkuXG4gICAgICAvLyAtIFBhdGhzIG1hcHBlZCB0byBkaXJlY3RvcmllcyBpbiBgdHNjb25maWcuanNvbmAgKGUuZy4gYHNoYXJlZC9teS1tb2R1bGVgKS5cbiAgICAgIC8vICAgKFNlZSBodHRwczovL3d3dy50eXBlc2NyaXB0bGFuZy5vcmcvZG9jcy9oYW5kYm9vay9tb2R1bGUtcmVzb2x1dGlvbi5odG1sI3BhdGgtbWFwcGluZy4pXG4gICAgICAvL1xuICAgICAgLy8gSW4gYWxsIGNhc2VzIGFib3ZlLCB0aGUgYGNvbnRhaW5pbmdGaWxlYCBhcmd1bWVudCBpcyBpZ25vcmVkLCBzbyB3ZSBjYW4ganVzdCB0YWtlIHRoZSBmaXJzdFxuICAgICAgLy8gb2YgdGhlIHJvb3QgZmlsZXMuXG4gICAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IHRoaXMudHNQcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKVswXTtcbiAgICAgIGNvbnN0IFtlbnRyeVBhdGgsIG1vZHVsZU5hbWVdID0gZW50cnlSb3V0ZS5zcGxpdCgnIycpO1xuICAgICAgY29uc3QgcmVzb2x2ZWRNb2R1bGUgPSByZXNvbHZlTW9kdWxlTmFtZShlbnRyeVBhdGgsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCk7XG5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBlbnRyeVJvdXRlID0gZW50cnlQb2ludEtleUZvcihyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLCBtb2R1bGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIHRoaXMucm91dGVBbmFseXplciAhLmxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGUpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBhcGkuTGlicmFyeVN1bW1hcnk+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbmFseXplZCgpOiBJdnlDb21waWxhdGlvbiB7XG4gICAgaWYgKHRoaXMuY29tcGlsYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgYW5hbHl6ZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZScpO1xuICAgICAgdGhpcy5jb21waWxhdGlvbiA9IHRoaXMubWFrZUNvbXBpbGF0aW9uKCk7XG4gICAgICB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpXG4gICAgICAgICAgLmZpbHRlcihmaWxlID0+ICFmaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKVxuICAgICAgICAgIC5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgYW5hbHl6ZUZpbGVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emVGaWxlJywgZmlsZSk7XG4gICAgICAgICAgICB0aGlzLmNvbXBpbGF0aW9uICEuYW5hbHl6ZVN5bmMoZmlsZSk7XG4gICAgICAgICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVGaWxlU3Bhbik7XG4gICAgICAgICAgfSk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVTcGFuKTtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24ucmVzb2x2ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxhdGlvbjtcbiAgfVxuXG4gIGVtaXQob3B0cz86IHtcbiAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICBlbWl0Q2FsbGJhY2s/OiBhcGkuVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogYXBpLlRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrXG4gIH0pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCBlbWl0Q2FsbGJhY2sgPSBvcHRzICYmIG9wdHMuZW1pdENhbGxiYWNrIHx8IGRlZmF1bHRFbWl0Q2FsbGJhY2s7XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IHdyaXRlRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPVxuICAgICAgICAoZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkgfCB1bmRlZmluZWQsXG4gICAgICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnwgdW5kZWZpbmVkKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCAmJiBmaWxlTmFtZS5lbmRzV2l0aCgnLmpzJykpIHtcbiAgICAgICAgICAgIGRhdGEgPSBub2NvbGxhcHNlSGFjayhkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5ob3N0LndyaXRlRmlsZShmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCBjdXN0b21UcmFuc2Zvcm1zID0gb3B0cyAmJiBvcHRzLmN1c3RvbVRyYW5zZm9ybWVycztcblxuICAgIGNvbnN0IGJlZm9yZVRyYW5zZm9ybXMgPSBbXG4gICAgICBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGNvbXBpbGF0aW9uLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pbXBvcnRSZXdyaXRlciwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkKSxcbiAgICAgIGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi5leHBvcnRTdGF0ZW1lbnRzKSBhcyB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4sXG4gICAgICB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLmltcG9ydFByZXNlcnZpbmdUcmFuc2Zvcm1lcigpLFxuICAgIF07XG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zID0gW1xuICAgICAgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uKSxcbiAgICBdO1xuXG5cbiAgICBpZiAodGhpcy5mYWN0b3J5VG9Tb3VyY2VJbmZvICE9PSBudWxsKSB7XG4gICAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goXG4gICAgICAgICAgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybSh0aGlzLmZhY3RvcnlUb1NvdXJjZUluZm8sIHRoaXMuaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgYmVmb3JlVHJhbnNmb3Jtcy5wdXNoKGl2eVN3aXRjaFRyYW5zZm9ybSk7XG4gICAgaWYgKGN1c3RvbVRyYW5zZm9ybXMgJiYgY3VzdG9tVHJhbnNmb3Jtcy5iZWZvcmVUcykge1xuICAgICAgYmVmb3JlVHJhbnNmb3Jtcy5wdXNoKC4uLmN1c3RvbVRyYW5zZm9ybXMuYmVmb3JlVHMpO1xuICAgIH1cblxuICAgIGNvbnN0IGVtaXRTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2VtaXQnKTtcbiAgICBjb25zdCBlbWl0UmVzdWx0czogdHMuRW1pdFJlc3VsdFtdID0gW107XG5cbiAgICBjb25zdCB0eXBlQ2hlY2tGaWxlID0gdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZSh0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKTtcblxuICAgIGZvciAoY29uc3QgdGFyZ2V0U291cmNlRmlsZSBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAodGFyZ2V0U291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSB8fCB0YXJnZXRTb3VyY2VGaWxlID09PSB0eXBlQ2hlY2tGaWxlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5pbmNyZW1lbnRhbFN0YXRlLnNhZmVUb1NraXBFbWl0KHRhcmdldFNvdXJjZUZpbGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmaWxlRW1pdFNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnZW1pdEZpbGUnLCB0YXJnZXRTb3VyY2VGaWxlKTtcbiAgICAgIGVtaXRSZXN1bHRzLnB1c2goZW1pdENhbGxiYWNrKHtcbiAgICAgICAgdGFyZ2V0U291cmNlRmlsZSxcbiAgICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICBlbWl0T25seUR0c0ZpbGVzOiBmYWxzZSwgd3JpdGVGaWxlLFxuICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHtcbiAgICAgICAgICBiZWZvcmU6IGJlZm9yZVRyYW5zZm9ybXMsXG4gICAgICAgICAgYWZ0ZXI6IGN1c3RvbVRyYW5zZm9ybXMgJiYgY3VzdG9tVHJhbnNmb3Jtcy5hZnRlclRzLFxuICAgICAgICAgIGFmdGVyRGVjbGFyYXRpb25zOiBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMsXG4gICAgICAgIH0sXG4gICAgICB9KSk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGZpbGVFbWl0U3Bhbik7XG4gICAgfVxuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoZW1pdFNwYW4pO1xuXG4gICAgaWYgKHRoaXMucGVyZlRyYWNrZXIgIT09IG51bGwgJiYgdGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wZXJmVHJhY2tlci5zZXJpYWxpemVUb0ZpbGUodGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UsIHRoaXMuaG9zdCk7XG4gICAgfVxuXG4gICAgLy8gUnVuIHRoZSBlbWl0LCBpbmNsdWRpbmcgYSBjdXN0b20gdHJhbnNmb3JtZXIgdGhhdCB3aWxsIGRvd25sZXZlbCB0aGUgSXZ5IGRlY29yYXRvcnMgaW4gY29kZS5cbiAgICByZXR1cm4gKChvcHRzICYmIG9wdHMubWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrKSB8fCBtZXJnZUVtaXRSZXN1bHRzKShlbWl0UmVzdWx0cyk7XG4gIH1cblxuICBwcml2YXRlIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgLy8gU2tpcCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGlmIGl0J3MgZGlzYWJsZWQuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pdnlUZW1wbGF0ZVR5cGVDaGVjayA9PT0gZmFsc2UgJiZcbiAgICAgICAgdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjayAhPT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gUnVuIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcuXG5cbiAgICAvLyBGaXJzdCBzZWxlY3QgYSB0eXBlLWNoZWNraW5nIGNvbmZpZ3VyYXRpb24sIGJhc2VkIG9uIHdoZXRoZXIgZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGlzXG4gICAgLy8gcmVxdWVzdGVkLlxuICAgIGxldCB0eXBlQ2hlY2tpbmdDb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZztcbiAgICBpZiAodGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogdHJ1ZSxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogdHJ1ZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZCaW5kaW5nczogdHJ1ZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogdHJ1ZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogdHJ1ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IGZhbHNlLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IGZhbHNlLFxuICAgICAgICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzOiBmYWxzZSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRXhlY3V0ZSB0aGUgdHlwZUNoZWNrIHBoYXNlIG9mIGVhY2ggZGVjb3JhdG9yIGluIHRoZSBwcm9ncmFtLlxuICAgIGNvbnN0IHByZXBTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ3R5cGVDaGVja1ByZXAnKTtcbiAgICBjb25zdCBjdHggPSBuZXcgVHlwZUNoZWNrQ29udGV4dCh0eXBlQ2hlY2tpbmdDb25maWcsIHRoaXMucmVmRW1pdHRlciAhLCB0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKTtcbiAgICBjb21waWxhdGlvbi50eXBlQ2hlY2soY3R4KTtcbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKHByZXBTcGFuKTtcblxuICAgIC8vIEdldCB0aGUgZGlhZ25vc3RpY3MuXG4gICAgY29uc3QgdHlwZUNoZWNrU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCd0eXBlQ2hlY2tEaWFnbm9zdGljcycpO1xuICAgIGNvbnN0IHtkaWFnbm9zdGljcywgcHJvZ3JhbX0gPVxuICAgICAgICBjdHguY2FsY3VsYXRlVGVtcGxhdGVEaWFnbm9zdGljcyh0aGlzLnRzUHJvZ3JhbSwgdGhpcy5ob3N0LCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AodHlwZUNoZWNrU3Bhbik7XG4gICAgdGhpcy5yZXVzZVRzUHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIG1ha2VDb21waWxhdGlvbigpOiBJdnlDb21waWxhdGlvbiB7XG4gICAgY29uc3QgY2hlY2tlciA9IHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICBsZXQgYWxpYXNHZW5lcmF0b3I6IEFsaWFzR2VuZXJhdG9yfG51bGwgPSBudWxsO1xuICAgIC8vIENvbnN0cnVjdCB0aGUgUmVmZXJlbmNlRW1pdHRlci5cbiAgICBpZiAodGhpcy5maWxlVG9Nb2R1bGVIb3N0ID09PSBudWxsIHx8ICF0aGlzLm9wdGlvbnMuX3VzZUhvc3RGb3JJbXBvcnRHZW5lcmF0aW9uKSB7XG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IGRvZXNuJ3QgaGF2ZSBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gYnVpbGQgYW4gTlBNLWNlbnRyaWMgcmVmZXJlbmNlXG4gICAgICAvLyByZXNvbHV0aW9uIHN0cmF0ZWd5LlxuICAgICAgdGhpcy5yZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBOZXh0LCBhdHRlbXB0IHRvIHVzZSBhbiBhYnNvbHV0ZSBpbXBvcnQuXG4gICAgICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KHRoaXMudHNQcm9ncmFtLCBjaGVja2VyLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCksXG4gICAgICAgIC8vIEZpbmFsbHksIGNoZWNrIGlmIHRoZSByZWZlcmVuY2UgaXMgYmVpbmcgd3JpdHRlbiBpbnRvIGEgZmlsZSB3aXRoaW4gdGhlIHByb2plY3QncyBsb2dpY2FsXG4gICAgICAgIC8vIGZpbGUgc3lzdGVtLCBhbmQgdXNlIGEgcmVsYXRpdmUgaW1wb3J0IGlmIHNvLiBJZiB0aGlzIGZhaWxzLCBSZWZlcmVuY2VFbWl0dGVyIHdpbGwgdGhyb3dcbiAgICAgICAgLy8gYW4gZXJyb3IuXG4gICAgICAgIG5ldyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5KGNoZWNrZXIsIG5ldyBMb2dpY2FsRmlsZVN5c3RlbSh0aGlzLnJvb3REaXJzKSksXG4gICAgICBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBzdXBwb3J0cyBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gdXNlIHRoYXQgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgdGhpcy5yZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBhbGlhc2VkIHJlZmVyZW5jZXMgKHRoaXMgaXMgYSB3b3JrYXJvdW5kIHRvIFN0cmljdERlcHMgY2hlY2tzKS5cbiAgICAgICAgbmV3IEFsaWFzU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgZmlsZU5hbWVUb01vZHVsZU5hbWUgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgICBuZXcgRmlsZVRvTW9kdWxlU3RyYXRlZ3koY2hlY2tlciwgdGhpcy5maWxlVG9Nb2R1bGVIb3N0KSxcbiAgICAgIF0pO1xuICAgICAgYWxpYXNHZW5lcmF0b3IgPSBuZXcgQWxpYXNHZW5lcmF0b3IodGhpcy5maWxlVG9Nb2R1bGVIb3N0KTtcbiAgICB9XG5cbiAgICBjb25zdCBldmFsdWF0b3IgPSBuZXcgUGFydGlhbEV2YWx1YXRvcih0aGlzLnJlZmxlY3RvciwgY2hlY2tlcik7XG4gICAgY29uc3QgZHRzUmVhZGVyID0gbmV3IER0c01ldGFkYXRhUmVhZGVyKGNoZWNrZXIsIHRoaXMucmVmbGVjdG9yKTtcbiAgICBjb25zdCBsb2NhbE1ldGFSZWdpc3RyeSA9IG5ldyBMb2NhbE1ldGFkYXRhUmVnaXN0cnkoKTtcbiAgICBjb25zdCBkZXBTY29wZVJlYWRlciA9IG5ldyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIoZHRzUmVhZGVyLCBhbGlhc0dlbmVyYXRvcik7XG4gICAgY29uc3Qgc2NvcGVSZWdpc3RyeSA9IG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkoXG4gICAgICAgIGxvY2FsTWV0YVJlZ2lzdHJ5LCBkZXBTY29wZVJlYWRlciwgdGhpcy5yZWZFbWl0dGVyLCBhbGlhc0dlbmVyYXRvcik7XG4gICAgY29uc3QgbWV0YVJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbbG9jYWxNZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnldKTtcblxuICAgIHRoaXMubWV0YVJlYWRlciA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVhZGVyKFtsb2NhbE1ldGFSZWdpc3RyeSwgZHRzUmVhZGVyXSk7XG5cblxuICAgIC8vIElmIGEgZmxhdCBtb2R1bGUgZW50cnlwb2ludCB3YXMgc3BlY2lmaWVkLCB0aGVuIHRyYWNrIHJlZmVyZW5jZXMgdmlhIGEgYFJlZmVyZW5jZUdyYXBoYFxuICAgIC8vIGluXG4gICAgLy8gb3JkZXIgdG8gcHJvZHVjZSBwcm9wZXIgZGlhZ25vc3RpY3MgZm9yIGluY29ycmVjdGx5IGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMvZXRjLiBJZlxuICAgIC8vIHRoZXJlXG4gICAgLy8gaXMgbm8gZmxhdCBtb2R1bGUgZW50cnlwb2ludCB0aGVuIGRvbid0IHBheSB0aGUgY29zdCBvZiB0cmFja2luZyByZWZlcmVuY2VzLlxuICAgIGxldCByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeTtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoID0gbmV3IFJlZmVyZW5jZUdyYXBoKCk7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgUmVmZXJlbmNlR3JhcGhBZGFwdGVyKHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSgpO1xuICAgIH1cblxuICAgIHRoaXMucm91dGVBbmFseXplciA9IG5ldyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIodGhpcy5tb2R1bGVSZXNvbHZlciwgZXZhbHVhdG9yKTtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnMgPSBbXG4gICAgICBuZXcgQmFzZURlZkRlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCB0aGlzLm1ldGFSZWFkZXIgISwgc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgdGhpcy5yZXNvdXJjZU1hbmFnZXIsIHRoaXMucm9vdERpcnMsIHRoaXMub3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzIHx8IGZhbHNlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHMgIT09IGZhbHNlLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLmN5Y2xlQW5hbHl6ZXIsXG4gICAgICAgICAgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyKSxcbiAgICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycyB8fCBmYWxzZSksXG4gICAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgcmVmZXJlbmNlc1JlZ2lzdHJ5LCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICB0aGlzLnJvdXRlQW5hbHl6ZXIsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciksXG4gICAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmlzQ29yZSksXG4gICAgXTtcblxuICAgIHJldHVybiBuZXcgSXZ5Q29tcGlsYXRpb24oXG4gICAgICAgIGhhbmRsZXJzLCBjaGVja2VyLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pbXBvcnRSZXdyaXRlciwgdGhpcy5pbmNyZW1lbnRhbFN0YXRlLFxuICAgICAgICB0aGlzLnBlcmZSZWNvcmRlciwgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IHJlZmxlY3RvcigpOiBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3Qge1xuICAgIGlmICh0aGlzLl9yZWZsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcmVmbGVjdG9yID0gbmV3IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCh0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3JlZmxlY3RvcjtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGNvcmVJbXBvcnRzRnJvbSgpOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICAgIGlmICh0aGlzLl9jb3JlSW1wb3J0c0Zyb20gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fY29yZUltcG9ydHNGcm9tID0gdGhpcy5pc0NvcmUgJiYgZ2V0UjNTeW1ib2xzRmlsZSh0aGlzLnRzUHJvZ3JhbSkgfHwgbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2NvcmVJbXBvcnRzRnJvbTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGlzQ29yZSgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5faXNDb3JlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2lzQ29yZSA9IGlzQW5ndWxhckNvcmVQYWNrYWdlKHRoaXMudHNQcm9ncmFtKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2lzQ29yZTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGltcG9ydFJld3JpdGVyKCk6IEltcG9ydFJld3JpdGVyIHtcbiAgICBpZiAodGhpcy5faW1wb3J0UmV3cml0ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgY29yZUltcG9ydHNGcm9tID0gdGhpcy5jb3JlSW1wb3J0c0Zyb207XG4gICAgICB0aGlzLl9pbXBvcnRSZXdyaXRlciA9IGNvcmVJbXBvcnRzRnJvbSAhPT0gbnVsbCA/XG4gICAgICAgICAgbmV3IFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyKGNvcmVJbXBvcnRzRnJvbS5maWxlTmFtZSkgOlxuICAgICAgICAgIG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2ltcG9ydFJld3JpdGVyO1xuICB9XG59XG5cbmNvbnN0IGRlZmF1bHRFbWl0Q2FsbGJhY2s6IGFwaS5Uc0VtaXRDYWxsYmFjayA9XG4gICAgKHtwcm9ncmFtLCB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLFxuICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzfSkgPT5cbiAgICAgICAgcHJvZ3JhbS5lbWl0KFxuICAgICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcywgY3VzdG9tVHJhbnNmb3JtZXJzKTtcblxuZnVuY3Rpb24gbWVyZ2VFbWl0UmVzdWx0cyhlbWl0UmVzdWx0czogdHMuRW1pdFJlc3VsdFtdKTogdHMuRW1pdFJlc3VsdCB7XG4gIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgbGV0IGVtaXRTa2lwcGVkID0gZmFsc2U7XG4gIGNvbnN0IGVtaXR0ZWRGaWxlczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBlciBvZiBlbWl0UmVzdWx0cykge1xuICAgIGRpYWdub3N0aWNzLnB1c2goLi4uZXIuZGlhZ25vc3RpY3MpO1xuICAgIGVtaXRTa2lwcGVkID0gZW1pdFNraXBwZWQgfHwgZXIuZW1pdFNraXBwZWQ7XG4gICAgZW1pdHRlZEZpbGVzLnB1c2goLi4uKGVyLmVtaXR0ZWRGaWxlcyB8fCBbXSkpO1xuICB9XG5cbiAgcmV0dXJuIHtkaWFnbm9zdGljcywgZW1pdFNraXBwZWQsIGVtaXR0ZWRGaWxlc307XG59XG5cbi8qKlxuICogRmluZCB0aGUgJ3IzX3N5bWJvbHMudHMnIGZpbGUgaW4gdGhlIGdpdmVuIGBQcm9ncmFtYCwgb3IgcmV0dXJuIGBudWxsYCBpZiBpdCB3YXNuJ3QgdGhlcmUuXG4gKi9cbmZ1bmN0aW9uIGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmluZChmaWxlID0+IGZpbGUuZmlsZU5hbWUuaW5kZXhPZigncjNfc3ltYm9scy50cycpID49IDApIHx8IG51bGw7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHRoZSBnaXZlbiBgUHJvZ3JhbWAgaXMgQGFuZ3VsYXIvY29yZS5cbiAqL1xuZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVBhY2thZ2UocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IGJvb2xlYW4ge1xuICAvLyBMb29rIGZvciBpdHNfanVzdF9hbmd1bGFyLnRzIHNvbWV3aGVyZSBpbiB0aGUgcHJvZ3JhbS5cbiAgY29uc3QgcjNTeW1ib2xzID0gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtKTtcbiAgaWYgKHIzU3ltYm9scyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIExvb2sgZm9yIHRoZSBjb25zdGFudCBJVFNfSlVTVF9BTkdVTEFSIGluIHRoYXQgZmlsZS5cbiAgcmV0dXJuIHIzU3ltYm9scy5zdGF0ZW1lbnRzLnNvbWUoc3RtdCA9PiB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBtdXN0IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gc3RhdGVtZW50LlxuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGJlIGV4cG9ydGVkLlxuICAgIGlmIChzdG10Lm1vZGlmaWVycyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICFzdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGRlY2xhcmUgSVRTX0pVU1RfQU5HVUxBUi5cbiAgICByZXR1cm4gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLnNvbWUoZGVjbCA9PiB7XG4gICAgICAvLyBUaGUgZGVjbGFyYXRpb24gbXVzdCBtYXRjaCB0aGUgbmFtZS5cbiAgICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkgfHwgZGVjbC5uYW1lLnRleHQgIT09ICdJVFNfSlVTVF9BTkdVTEFSJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBJdCBtdXN0IGluaXRpYWxpemUgdGhlIHZhcmlhYmxlIHRvIHRydWUuXG4gICAgICBpZiAoZGVjbC5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkIHx8IGRlY2wuaW5pdGlhbGl6ZXIua2luZCAhPT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGRlZmluaXRpb24gbWF0Y2hlcy5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIFJlZmVyZW5jZUdyYXBoQWRhcHRlciBpbXBsZW1lbnRzIFJlZmVyZW5jZXNSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZ3JhcGg6IFJlZmVyZW5jZUdyYXBoKSB7fVxuXG4gIGFkZChzb3VyY2U6IHRzLkRlY2xhcmF0aW9uLCAuLi5yZWZlcmVuY2VzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W10pOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHtub2RlfSBvZiByZWZlcmVuY2VzKSB7XG4gICAgICBsZXQgc291cmNlRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzb3VyY2VGaWxlID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSByZWNvcmQgbG9jYWwgcmVmZXJlbmNlcyAobm90IHJlZmVyZW5jZXMgaW50byAuZC50cyBmaWxlcykuXG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkIHx8ICFpc0R0c1BhdGgoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgdGhpcy5ncmFwaC5hZGQoc291cmNlLCBub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hvdWxkRW5hYmxlUGVyZlRyYWNpbmcob3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyk6IGJvb2xlYW4ge1xuICByZXR1cm4gb3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQ7XG59XG4iXX0=