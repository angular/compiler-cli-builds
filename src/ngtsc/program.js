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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/transformers/nocollapse_hack", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/indexer", "@angular/compiler-cli/src/ngtsc/indexer/src/transform", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource_loader", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/transform/src/alias", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var nocollapse_hack_1 = require("@angular/compiler-cli/src/transformers/nocollapse_hack");
    var typescript_support_1 = require("@angular/compiler-cli/src/typescript_support");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
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
            if (!options.disableTypeScriptVersionCheck) {
                typescript_support_1.verifySupportedTypeScriptVersion();
            }
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
                var strictTemplates = !!this.options.strictTemplates;
                typeCheckingConfig = {
                    applyTemplateContextGuards: true,
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
                };
            }
            // Apply explicitly configured strictness flags on top of the default configuration
            // based on "fullTemplateTypeCheck".
            if (this.options.strictInputTypes !== undefined) {
                typeCheckingConfig.checkTypeOfInputBindings = this.options.strictInputTypes;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsMEZBQStEO0lBQy9ELG1GQUF1RTtJQUV2RSwyRUFBMk07SUFDM00saUVBQW9EO0lBQ3BELDJFQUFxRDtJQUNyRCwyRUFBa0g7SUFDbEgsMkVBQThFO0lBQzlFLG1FQUE0VjtJQUM1ViwyRUFBK0M7SUFDL0MsbUVBQTREO0lBQzVELG1GQUF5RDtJQUN6RCxxRUFBc0k7SUFDdEksdUZBQXFEO0lBQ3JELDZEQUFxRTtJQUNyRSx5RUFBc0Q7SUFDdEQsbUZBQXFEO0lBQ3JELG1FQUFrRTtJQUNsRSwrREFBK0c7SUFDL0csK0RBQXFLO0lBQ3JLLGlFQUE0QztJQUM1Qyx1RUFBNkY7SUFDN0YsNkVBQTREO0lBQzVELHVFQUFvRjtJQUNwRixzRUFBb0Q7SUFDcEQsa0ZBQXFHO0lBRXJHO1FBa0NFLHNCQUNJLFNBQWdDLEVBQVUsT0FBNEIsRUFDOUQsSUFBc0IsRUFBRSxVQUF5QjtZQUY3RCxpQkFzSEM7WUFySDZDLFlBQU8sR0FBUCxPQUFPLENBQXFCO1lBQzlELFNBQUksR0FBSixJQUFJLENBQWtCO1lBaEMxQixnQkFBVyxHQUE2QixTQUFTLENBQUM7WUFDbEQsd0JBQW1CLEdBQWtDLElBQUksQ0FBQztZQUMxRCwyQkFBc0IsR0FBa0MsSUFBSSxDQUFDO1lBQzdELHFCQUFnQixHQUFpQyxTQUFTLENBQUM7WUFDM0Qsb0JBQWUsR0FBNkIsU0FBUyxDQUFDO1lBQ3RELGVBQVUsR0FBdUMsU0FBUyxDQUFDO1lBQzNELFlBQU8sR0FBc0IsU0FBUyxDQUFDO1lBSXZDLHlCQUFvQixHQUF3QixJQUFJLENBQUM7WUFDakQsdUJBQWtCLEdBQTRCLElBQUksQ0FBQztZQUNu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VUFBVSxDQUFBLHNDQUFBLDhEQUFFO29CQUFyQixJQUFBLGdDQUFJO29CQUNkLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDdEMsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFO3dCQUM1QixVQUFVLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztxQkFDdkQ7b0JBRUQsa0VBQWtFO29CQUNsRSxJQUFJLFVBQVUsS0FBSyxTQUFTLElBQUksQ0FBQyxzQkFBUyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTt3QkFDL0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO3FCQUM5QjtpQkFDRjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQWhCRCxJQWdCQztJQWhCWSxzREFBcUI7SUFrQmxDLFNBQVMsdUJBQXVCLENBQUMsT0FBNEI7UUFDM0QsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxDQUFDO0lBQ2hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7R2VuZXJhdGVkRmlsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7bm9jb2xsYXBzZUhhY2t9IGZyb20gJy4uL3RyYW5zZm9ybWVycy9ub2NvbGxhcHNlX2hhY2snO1xuaW1wb3J0IHt2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbn0gZnJvbSAnLi4vdHlwZXNjcmlwdF9zdXBwb3J0JztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5LCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuL2Fubm90YXRpb25zJztcbmltcG9ydCB7Q3ljbGVBbmFseXplciwgSW1wb3J0R3JhcGh9IGZyb20gJy4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ZsYXRJbmRleEdlbmVyYXRvciwgUmVmZXJlbmNlR3JhcGgsIGNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50fSBmcm9tICcuL2VudHJ5X3BvaW50JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIExvZ2ljYWxGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb219IGZyb20gJy4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5LCBBbGlhc1N0cmF0ZWd5LCBBbGlhc2luZ0hvc3QsIERlZmF1bHRJbXBvcnRUcmFja2VyLCBGaWxlVG9Nb2R1bGVBbGlhc2luZ0hvc3QsIEZpbGVUb01vZHVsZUhvc3QsIEZpbGVUb01vZHVsZVN0cmF0ZWd5LCBJbXBvcnRSZXdyaXRlciwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsU3RhdGV9IGZyb20gJy4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtJbmRleGVkQ29tcG9uZW50LCBJbmRleGluZ0NvbnRleHR9IGZyb20gJy4vaW5kZXhlcic7XG5pbXBvcnQge2dlbmVyYXRlQW5hbHlzaXN9IGZyb20gJy4vaW5kZXhlci9zcmMvdHJhbnNmb3JtJztcbmltcG9ydCB7Q29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlcn0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtOT09QX1BFUkZfUkVDT1JERVIsIFBlcmZSZWNvcmRlciwgUGVyZlRyYWNrZXJ9IGZyb20gJy4vcGVyZic7XG5pbXBvcnQge1R5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SG9zdFJlc291cmNlTG9hZGVyfSBmcm9tICcuL3Jlc291cmNlX2xvYWRlcic7XG5pbXBvcnQge05nTW9kdWxlUm91dGVBbmFseXplciwgZW50cnlQb2ludEtleUZvcn0gZnJvbSAnLi9yb3V0aW5nJztcbmltcG9ydCB7Q29tcG91bmRDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4vc2NvcGUnO1xuaW1wb3J0IHtGYWN0b3J5R2VuZXJhdG9yLCBGYWN0b3J5SW5mbywgR2VuZXJhdGVkU2hpbXNIb3N0V3JhcHBlciwgU2hpbUdlbmVyYXRvciwgU3VtbWFyeUdlbmVyYXRvciwgVHlwZUNoZWNrU2hpbUdlbmVyYXRvciwgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybX0gZnJvbSAnLi9zaGltcyc7XG5pbXBvcnQge2l2eVN3aXRjaFRyYW5zZm9ybX0gZnJvbSAnLi9zd2l0Y2gnO1xuaW1wb3J0IHtJdnlDb21waWxhdGlvbiwgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5LCBpdnlUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL3RyYW5zZm9ybSc7XG5pbXBvcnQge2FsaWFzVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi90cmFuc2Zvcm0vc3JjL2FsaWFzJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNraW5nQ29uZmlnLCB0eXBlQ2hlY2tGaWxlUGF0aH0gZnJvbSAnLi90eXBlY2hlY2snO1xuaW1wb3J0IHtub3JtYWxpemVTZXBhcmF0b3JzfSBmcm9tICcuL3V0aWwvc3JjL3BhdGgnO1xuaW1wb3J0IHtnZXRSb290RGlycywgZ2V0U291cmNlRmlsZU9yTnVsbCwgaXNEdHNQYXRoLCByZXNvbHZlTW9kdWxlTmFtZX0gZnJvbSAnLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuZXhwb3J0IGNsYXNzIE5ndHNjUHJvZ3JhbSBpbXBsZW1lbnRzIGFwaS5Qcm9ncmFtIHtcbiAgcHJpdmF0ZSB0c1Byb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgcmV1c2VUc1Byb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgcmVzb3VyY2VNYW5hZ2VyOiBIb3N0UmVzb3VyY2VMb2FkZXI7XG4gIHByaXZhdGUgY29tcGlsYXRpb246IEl2eUNvbXBpbGF0aW9ufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBmYWN0b3J5VG9Tb3VyY2VJbmZvOiBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz58bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc291cmNlVG9GYWN0b3J5U3ltYm9sczogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+fG51bGwgPSBudWxsO1xuICBwcml2YXRlIF9jb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGV8bnVsbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2ltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3JlZmxlY3RvcjogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfaXNDb3JlOiBib29sZWFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXTtcbiAgcHJpdmF0ZSBjbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGVudHJ5UG9pbnQ6IHRzLlNvdXJjZUZpbGV8bnVsbDtcbiAgcHJpdmF0ZSBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZmxhdEluZGV4R2VuZXJhdG9yOiBGbGF0SW5kZXhHZW5lcmF0b3J8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyfG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyfG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBmaWxlVG9Nb2R1bGVIb3N0OiBGaWxlVG9Nb2R1bGVIb3N0fG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRlZmF1bHRJbXBvcnRUcmFja2VyOiBEZWZhdWx0SW1wb3J0VHJhY2tlcjtcbiAgcHJpdmF0ZSBwZXJmUmVjb3JkZXI6IFBlcmZSZWNvcmRlciA9IE5PT1BfUEVSRl9SRUNPUkRFUjtcbiAgcHJpdmF0ZSBwZXJmVHJhY2tlcjogUGVyZlRyYWNrZXJ8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaW5jcmVtZW50YWxTdGF0ZTogSW5jcmVtZW50YWxTdGF0ZTtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tGaWxlUGF0aDogQWJzb2x1dGVGc1BhdGg7XG5cbiAgcHJpdmF0ZSBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+fG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBob3N0OiBhcGkuQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogTmd0c2NQcm9ncmFtKSB7XG4gICAgaWYgKCFvcHRpb25zLmRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrKSB7XG4gICAgICB2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbigpO1xuICAgIH1cblxuICAgIGlmIChzaG91bGRFbmFibGVQZXJmVHJhY2luZyhvcHRpb25zKSkge1xuICAgICAgdGhpcy5wZXJmVHJhY2tlciA9IFBlcmZUcmFja2VyLnplcm9lZFRvTm93KCk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlciA9IHRoaXMucGVyZlRyYWNrZXI7XG4gICAgfVxuXG4gICAgdGhpcy5tb2RpZmllZFJlc291cmNlRmlsZXMgPVxuICAgICAgICB0aGlzLmhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzICYmIHRoaXMuaG9zdC5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMoKSB8fCBudWxsO1xuICAgIHRoaXMucm9vdERpcnMgPSBnZXRSb290RGlycyhob3N0LCBvcHRpb25zKTtcbiAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgPSAhIW9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI7XG4gICAgdGhpcy5yZXNvdXJjZU1hbmFnZXIgPSBuZXcgSG9zdFJlc291cmNlTG9hZGVyKGhvc3QsIG9wdGlvbnMpO1xuICAgIC8vIFRPRE8oYWx4aHViKTogcmVtb3ZlIHRoZSBmYWxsYmFjayB0byBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzIGFmdGVyIHZlcmlmeWluZyB0aGF0IHRoZSByZXN0IG9mXG4gICAgLy8gb3VyIGJ1aWxkIHRvb2xpbmcgaXMgbm8gbG9uZ2VyIHJlbHlpbmcgb24gaXQuXG4gICAgY29uc3QgYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyA9IG9wdGlvbnMuYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyB8fCBmYWxzZTtcbiAgICBjb25zdCBzaG91bGRHZW5lcmF0ZUZhY3RvcnlTaGltcyA9IG9wdGlvbnMuZ2VuZXJhdGVOZ0ZhY3RvcnlTaGltcyAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgb3B0aW9ucy5nZW5lcmF0ZU5nRmFjdG9yeVNoaW1zIDpcbiAgICAgICAgYWxsb3dFbXB0eUNvZGVnZW5GaWxlcztcbiAgICBjb25zdCBzaG91bGRHZW5lcmF0ZVN1bW1hcnlTaGltcyA9IG9wdGlvbnMuZ2VuZXJhdGVOZ1N1bW1hcnlTaGltcyAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgb3B0aW9ucy5nZW5lcmF0ZU5nU3VtbWFyeVNoaW1zIDpcbiAgICAgICAgYWxsb3dFbXB0eUNvZGVnZW5GaWxlcztcbiAgICBjb25zdCBub3JtYWxpemVkUm9vdE5hbWVzID0gcm9vdE5hbWVzLm1hcChuID0+IGFic29sdXRlRnJvbShuKSk7XG4gICAgaWYgKGhvc3QuZmlsZU5hbWVUb01vZHVsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5maWxlVG9Nb2R1bGVIb3N0ID0gaG9zdCBhcyBGaWxlVG9Nb2R1bGVIb3N0O1xuICAgIH1cbiAgICBsZXQgcm9vdEZpbGVzID0gWy4uLnJvb3ROYW1lc107XG5cbiAgICBjb25zdCBnZW5lcmF0b3JzOiBTaGltR2VuZXJhdG9yW10gPSBbXTtcbiAgICBsZXQgc3VtbWFyeUdlbmVyYXRvcjogU3VtbWFyeUdlbmVyYXRvcnxudWxsID0gbnVsbDtcbiAgICBpZiAoc2hvdWxkR2VuZXJhdGVTdW1tYXJ5U2hpbXMpIHtcbiAgICAgIC8vIFN1bW1hcnkgZ2VuZXJhdGlvbi5cbiAgICAgIHN1bW1hcnlHZW5lcmF0b3IgPSBTdW1tYXJ5R2VuZXJhdG9yLmZvclJvb3RGaWxlcyhub3JtYWxpemVkUm9vdE5hbWVzKTtcbiAgICAgIGdlbmVyYXRvcnMucHVzaChzdW1tYXJ5R2VuZXJhdG9yKTtcbiAgICB9XG5cbiAgICBpZiAoc2hvdWxkR2VuZXJhdGVGYWN0b3J5U2hpbXMpIHtcbiAgICAgIC8vIEZhY3RvcnkgZ2VuZXJhdGlvbi5cbiAgICAgIGNvbnN0IGZhY3RvcnlHZW5lcmF0b3IgPSBGYWN0b3J5R2VuZXJhdG9yLmZvclJvb3RGaWxlcyhub3JtYWxpemVkUm9vdE5hbWVzKTtcbiAgICAgIGNvbnN0IGZhY3RvcnlGaWxlTWFwID0gZmFjdG9yeUdlbmVyYXRvci5mYWN0b3J5RmlsZU1hcDtcbiAgICAgIHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbyA9IG5ldyBNYXA8c3RyaW5nLCBGYWN0b3J5SW5mbz4oKTtcbiAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scyA9IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKTtcbiAgICAgIGZhY3RvcnlGaWxlTWFwLmZvckVhY2goKHNvdXJjZUZpbGVQYXRoLCBmYWN0b3J5UGF0aCkgPT4ge1xuICAgICAgICBjb25zdCBtb2R1bGVTeW1ib2xOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgIS5zZXQoc291cmNlRmlsZVBhdGgsIG1vZHVsZVN5bWJvbE5hbWVzKTtcbiAgICAgICAgdGhpcy5mYWN0b3J5VG9Tb3VyY2VJbmZvICEuc2V0KGZhY3RvcnlQYXRoLCB7c291cmNlRmlsZVBhdGgsIG1vZHVsZVN5bWJvbE5hbWVzfSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZmFjdG9yeUZpbGVOYW1lcyA9IEFycmF5LmZyb20oZmFjdG9yeUZpbGVNYXAua2V5cygpKTtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLmZhY3RvcnlGaWxlTmFtZXMpO1xuICAgICAgZ2VuZXJhdG9ycy5wdXNoKGZhY3RvcnlHZW5lcmF0b3IpO1xuICAgIH1cblxuICAgIC8vIERvbmUgc2VwYXJhdGVseSB0byBwcmVzZXJ2ZSB0aGUgb3JkZXIgb2YgZmFjdG9yeSBmaWxlcyBiZWZvcmUgc3VtbWFyeSBmaWxlcyBpbiByb290RmlsZXMuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB2YWxpZGF0ZSB0aGF0IHRoaXMgaXMgbmVjZXNzYXJ5LlxuICAgIGlmIChzaG91bGRHZW5lcmF0ZVN1bW1hcnlTaGltcykge1xuICAgICAgcm9vdEZpbGVzLnB1c2goLi4uc3VtbWFyeUdlbmVyYXRvciAhLmdldFN1bW1hcnlGaWxlTmFtZXMoKSk7XG4gICAgfVxuXG4gICAgdGhpcy50eXBlQ2hlY2tGaWxlUGF0aCA9IHR5cGVDaGVja0ZpbGVQYXRoKHRoaXMucm9vdERpcnMpO1xuICAgIGdlbmVyYXRvcnMucHVzaChuZXcgVHlwZUNoZWNrU2hpbUdlbmVyYXRvcih0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKSk7XG4gICAgcm9vdEZpbGVzLnB1c2godGhpcy50eXBlQ2hlY2tGaWxlUGF0aCk7XG5cbiAgICBsZXQgZW50cnlQb2ludDogQWJzb2x1dGVGc1BhdGh8bnVsbCA9IG51bGw7XG4gICAgaWYgKG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUgIT0gbnVsbCAmJiBvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlICE9PSAnJykge1xuICAgICAgZW50cnlQb2ludCA9IGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50KG5vcm1hbGl6ZWRSb290TmFtZXMpO1xuICAgICAgaWYgKGVudHJ5UG9pbnQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBlcnJvciBtZXNzYWdlIHRhbGtzIHNwZWNpZmljYWxseSBhYm91dCBoYXZpbmcgYSBzaW5nbGUgLnRzIGZpbGUgaW4gXCJmaWxlc1wiLiBIb3dldmVyXG4gICAgICAgIC8vIHRoZSBhY3R1YWwgbG9naWMgaXMgYSBiaXQgbW9yZSBwZXJtaXNzaXZlLiBJZiBhIHNpbmdsZSBmaWxlIGV4aXN0cywgdGhhdCB3aWxsIGJlIHRha2VuLFxuICAgICAgICAvLyBvdGhlcndpc2UgdGhlIGhpZ2hlc3QgbGV2ZWwgKHNob3J0ZXN0IHBhdGgpIFwiaW5kZXgudHNcIiBmaWxlIHdpbGwgYmUgdXNlZCBhcyB0aGUgZmxhdFxuICAgICAgICAvLyBtb2R1bGUgZW50cnkgcG9pbnQgaW5zdGVhZC4gSWYgbmVpdGhlciBvZiB0aGVzZSBjb25kaXRpb25zIGFwcGx5LCB0aGUgZXJyb3IgYmVsb3cgaXNcbiAgICAgICAgLy8gZ2l2ZW4uXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZSB1c2VyIGlzIG5vdCBpbmZvcm1lZCBhYm91dCB0aGUgXCJpbmRleC50c1wiIG9wdGlvbiBhcyB0aGlzIGJlaGF2aW9yIGlzIGRlcHJlY2F0ZWQgLVxuICAgICAgICAvLyBhbiBleHBsaWNpdCBlbnRyeXBvaW50IHNob3VsZCBhbHdheXMgYmUgc3BlY2lmaWVkLlxuICAgICAgICB0aGlzLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLkNPTkZJR19GTEFUX01PRFVMRV9OT19JTkRFWCksXG4gICAgICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICAgICdBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbiBcImZsYXRNb2R1bGVPdXRGaWxlXCIgcmVxdWlyZXMgb25lIGFuZCBvbmx5IG9uZSAudHMgZmlsZSBpbiB0aGUgXCJmaWxlc1wiIGZpZWxkLicsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZmxhdE1vZHVsZUlkID0gb3B0aW9ucy5mbGF0TW9kdWxlSWQgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgZmxhdE1vZHVsZU91dEZpbGUgPSBub3JtYWxpemVTZXBhcmF0b3JzKG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUpO1xuICAgICAgICB0aGlzLmZsYXRJbmRleEdlbmVyYXRvciA9XG4gICAgICAgICAgICBuZXcgRmxhdEluZGV4R2VuZXJhdG9yKGVudHJ5UG9pbnQsIGZsYXRNb2R1bGVPdXRGaWxlLCBmbGF0TW9kdWxlSWQpO1xuICAgICAgICBnZW5lcmF0b3JzLnB1c2godGhpcy5mbGF0SW5kZXhHZW5lcmF0b3IpO1xuICAgICAgICByb290RmlsZXMucHVzaCh0aGlzLmZsYXRJbmRleEdlbmVyYXRvci5mbGF0SW5kZXhQYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZ2VuZXJhdG9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBGSVhNRTogUmVtb3ZlIHRoZSBhbnkgY2FzdCBvbmNlIGdvb2dsZTMgaXMgZnVsbHkgb24gVFMzLjYuXG4gICAgICB0aGlzLmhvc3QgPSAobmV3IEdlbmVyYXRlZFNoaW1zSG9zdFdyYXBwZXIoaG9zdCwgZ2VuZXJhdG9ycykgYXMgYW55KTtcbiAgICB9XG5cbiAgICB0aGlzLnRzUHJvZ3JhbSA9XG4gICAgICAgIHRzLmNyZWF0ZVByb2dyYW0ocm9vdEZpbGVzLCBvcHRpb25zLCB0aGlzLmhvc3QsIG9sZFByb2dyYW0gJiYgb2xkUHJvZ3JhbS5yZXVzZVRzUHJvZ3JhbSk7XG4gICAgdGhpcy5yZXVzZVRzUHJvZ3JhbSA9IHRoaXMudHNQcm9ncmFtO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID0gZW50cnlQb2ludCAhPT0gbnVsbCA/IGdldFNvdXJjZUZpbGVPck51bGwodGhpcy50c1Byb2dyYW0sIGVudHJ5UG9pbnQpIDogbnVsbDtcbiAgICB0aGlzLm1vZHVsZVJlc29sdmVyID0gbmV3IE1vZHVsZVJlc29sdmVyKHRoaXMudHNQcm9ncmFtLCBvcHRpb25zLCB0aGlzLmhvc3QpO1xuICAgIHRoaXMuY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKG5ldyBJbXBvcnRHcmFwaCh0aGlzLm1vZHVsZVJlc29sdmVyKSk7XG4gICAgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciA9IG5ldyBEZWZhdWx0SW1wb3J0VHJhY2tlcigpO1xuICAgIGlmIChvbGRQcm9ncmFtID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuaW5jcmVtZW50YWxTdGF0ZSA9IEluY3JlbWVudGFsU3RhdGUuZnJlc2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbmNyZW1lbnRhbFN0YXRlID0gSW5jcmVtZW50YWxTdGF0ZS5yZWNvbmNpbGUoXG4gICAgICAgICAgb2xkUHJvZ3JhbS5pbmNyZW1lbnRhbFN0YXRlLCBvbGRQcm9ncmFtLnJldXNlVHNQcm9ncmFtLCB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgICB0aGlzLm1vZGlmaWVkUmVzb3VyY2VGaWxlcyk7XG4gICAgfVxuICB9XG5cbiAgZ2V0VHNQcm9ncmFtKCk6IHRzLlByb2dyYW0geyByZXR1cm4gdGhpcy50c1Byb2dyYW07IH1cblxuICBnZXRUc09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldE9wdGlvbnNEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58XG4gICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3M7XG4gIH1cblxuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U3ludGFjdGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTxhcGkuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGdldFRzU2VtYW50aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICB9XG5cbiAgZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgZmlsZU5hbWU/OiBzdHJpbmd8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IFsuLi5jb21waWxhdGlvbi5kaWFnbm9zdGljcywgLi4udGhpcy5nZXRUZW1wbGF0ZURpYWdub3N0aWNzKCldO1xuICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwgJiYgdGhpcy5leHBvcnRSZWZlcmVuY2VHcmFwaCAhPT0gbnVsbCkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5jaGVja0ZvclByaXZhdGVFeHBvcnRzKFxuICAgICAgICAgIHRoaXMuZW50cnlQb2ludCwgdGhpcy50c1Byb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSwgdGhpcy5leHBvcnRSZWZlcmVuY2VHcmFwaCkpO1xuICAgIH1cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBhc3luYyBsb2FkTmdTdHJ1Y3R1cmVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcbiAgICB9XG4gICAgY29uc3QgYW5hbHl6ZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZScpO1xuICAgIGF3YWl0IFByb21pc2UuYWxsKHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmaWxlID0+ICFmaWxlLmZpbGVOYW1lLmVuZHNXaXRoKCcuZC50cycpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGZpbGUgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYW5hbHl6ZUZpbGVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emVGaWxlJywgZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY29tcGlsYXRpb24gIS5hbmFseXplQXN5bmMoZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFuYWx5c2lzUHJvbWlzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVGaWxlU3Bhbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnBlcmZSZWNvcmRlci5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmFseXNpc1Byb21pc2UgPSBhbmFseXNpc1Byb21pc2UudGhlbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVGaWxlU3BhbikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYW5hbHlzaXNQcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChyZXN1bHQpOiByZXN1bHQgaXMgUHJvbWlzZTx2b2lkPiA9PiByZXN1bHQgIT09IHVuZGVmaW5lZCkpO1xuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZVNwYW4pO1xuICAgIHRoaXMuY29tcGlsYXRpb24ucmVzb2x2ZSgpO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZ3x1bmRlZmluZWQpOiBhcGkuTGF6eVJvdXRlW10ge1xuICAgIGlmIChlbnRyeVJvdXRlKSB7XG4gICAgICAvLyBOb3RlOlxuICAgICAgLy8gVGhpcyByZXNvbHV0aW9uIHN0ZXAgaXMgaGVyZSB0byBtYXRjaCB0aGUgaW1wbGVtZW50YXRpb24gb2YgdGhlIG9sZCBgQW90Q29tcGlsZXJIb3N0YCAoc2VlXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvNTA3MzJlMTU2L3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMjTDE3NS1MMTg4KS5cbiAgICAgIC8vXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCB3aWxsIGFsd2F5cyBjYWxsIHRoaXMgQVBJIHdpdGggYW4gYWJzb2x1dGUgcGF0aCwgc28gdGhlIHJlc29sdXRpb24gc3RlcCBpc1xuICAgICAgLy8gbm90IG5lY2Vzc2FyeSwgYnV0IGtlZXBpbmcgaXQgYmFja3dhcmRzIGNvbXBhdGlibGUgaW4gY2FzZSBzb21lb25lIGVsc2UgaXMgdXNpbmcgdGhlIEFQSS5cblxuICAgICAgLy8gUmVsYXRpdmUgZW50cnkgcGF0aHMgYXJlIGRpc2FsbG93ZWQuXG4gICAgICBpZiAoZW50cnlSb3V0ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEZhaWxlZCB0byBsaXN0IGxhenkgcm91dGVzOiBSZXNvbHV0aW9uIG9mIHJlbGF0aXZlIHBhdGhzICgke2VudHJ5Um91dGV9KSBpcyBub3Qgc3VwcG9ydGVkLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tcmVsYXRpdmUgZW50cnkgcGF0aHMgZmFsbCBpbnRvIG9uZSBvZiB0aGUgZm9sbG93aW5nIGNhdGVnb3JpZXM6XG4gICAgICAvLyAtIEFic29sdXRlIHN5c3RlbSBwYXRocyAoZS5nLiBgL2Zvby9iYXIvbXktcHJvamVjdC9teS1tb2R1bGVgKSwgd2hpY2ggYXJlIHVuYWZmZWN0ZWQgYnkgdGhlXG4gICAgICAvLyAgIGxvZ2ljIGJlbG93LlxuICAgICAgLy8gLSBQYXRocyB0byBlbnRlcm5hbCBtb2R1bGVzIChlLmcuIGBzb21lLWxpYmApLlxuICAgICAgLy8gLSBQYXRocyBtYXBwZWQgdG8gZGlyZWN0b3JpZXMgaW4gYHRzY29uZmlnLmpzb25gIChlLmcuIGBzaGFyZWQvbXktbW9kdWxlYCkuXG4gICAgICAvLyAgIChTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbCNwYXRoLW1hcHBpbmcuKVxuICAgICAgLy9cbiAgICAgIC8vIEluIGFsbCBjYXNlcyBhYm92ZSwgdGhlIGBjb250YWluaW5nRmlsZWAgYXJndW1lbnQgaXMgaWdub3JlZCwgc28gd2UgY2FuIGp1c3QgdGFrZSB0aGUgZmlyc3RcbiAgICAgIC8vIG9mIHRoZSByb290IGZpbGVzLlxuICAgICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKClbMF07XG4gICAgICBjb25zdCBbZW50cnlQYXRoLCBtb2R1bGVOYW1lXSA9IGVudHJ5Um91dGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID0gcmVzb2x2ZU1vZHVsZU5hbWUoZW50cnlQYXRoLCBjb250YWluaW5nRmlsZSwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpO1xuXG4gICAgICBpZiAocmVzb2x2ZWRNb2R1bGUpIHtcbiAgICAgICAgZW50cnlSb3V0ZSA9IGVudHJ5UG9pbnRLZXlGb3IocmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSwgbW9kdWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIHJldHVybiB0aGlzLnJvdXRlQW5hbHl6ZXIgIS5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIGdldExpYnJhcnlTdW1tYXJpZXMoKTogTWFwPHN0cmluZywgYXBpLkxpYnJhcnlTdW1tYXJ5PiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk6IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQW5hbHl6ZWQoKTogSXZ5Q29tcGlsYXRpb24ge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGFuYWx5emVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emUnKTtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgICAgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKVxuICAgICAgICAgIC5maWx0ZXIoZmlsZSA9PiAhZmlsZS5maWxlTmFtZS5lbmRzV2l0aCgnLmQudHMnKSlcbiAgICAgICAgICAuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFuYWx5emVGaWxlU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplRmlsZScsIGZpbGUpO1xuICAgICAgICAgICAgdGhpcy5jb21waWxhdGlvbiAhLmFuYWx5emVTeW5jKGZpbGUpO1xuICAgICAgICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplRmlsZVNwYW4pO1xuICAgICAgICAgIH0pO1xuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplU3Bhbik7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uLnJlc29sdmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsYXRpb247XG4gIH1cblxuICBlbWl0KG9wdHM/OiB7XG4gICAgZW1pdEZsYWdzPzogYXBpLkVtaXRGbGFncyxcbiAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuLFxuICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrPzogYXBpLlRzRW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IGFwaS5Uc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFja1xuICB9KTogdHMuRW1pdFJlc3VsdCB7XG4gICAgY29uc3QgZW1pdENhbGxiYWNrID0gb3B0cyAmJiBvcHRzLmVtaXRDYWxsYmFjayB8fCBkZWZhdWx0RW1pdENhbGxiYWNrO1xuXG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICBjb25zdCB3cml0ZUZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgKGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpIHwgdW5kZWZpbmVkLFxuICAgICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT58IHVuZGVmaW5lZCkgPT4ge1xuICAgICAgICAgIGlmICh0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgJiYgZmlsZU5hbWUuZW5kc1dpdGgoJy5qcycpKSB7XG4gICAgICAgICAgICBkYXRhID0gbm9jb2xsYXBzZUhhY2soZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuaG9zdC53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgY3VzdG9tVHJhbnNmb3JtcyA9IG9wdHMgJiYgb3B0cy5jdXN0b21UcmFuc2Zvcm1lcnM7XG5cbiAgICBjb25zdCBiZWZvcmVUcmFuc2Zvcm1zID0gW1xuICAgICAgaXZ5VHJhbnNmb3JtRmFjdG9yeShcbiAgICAgICAgICBjb21waWxhdGlvbiwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaW1wb3J0UmV3cml0ZXIsIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCksXG4gICAgICBhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24uZXhwb3J0U3RhdGVtZW50cykgYXMgdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+LFxuICAgICAgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlci5pbXBvcnRQcmVzZXJ2aW5nVHJhbnNmb3JtZXIoKSxcbiAgICBdO1xuICAgIGNvbnN0IGFmdGVyRGVjbGFyYXRpb25zVHJhbnNmb3JtcyA9IFtcbiAgICAgIGRlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbiksXG4gICAgXTtcblxuICAgIC8vIE9ubHkgYWRkIGFsaWFzaW5nIHJlLWV4cG9ydHMgdG8gdGhlIC5kLnRzIG91dHB1dCBpZiB0aGUgYEFsaWFzaW5nSG9zdGAgcmVxdWVzdHMgaXQuXG4gICAgaWYgKHRoaXMuYWxpYXNpbmdIb3N0ICE9PSBudWxsICYmIHRoaXMuYWxpYXNpbmdIb3N0LmFsaWFzRXhwb3J0c0luRHRzKSB7XG4gICAgICBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMucHVzaChhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24uZXhwb3J0U3RhdGVtZW50cykpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZhY3RvcnlUb1NvdXJjZUluZm8gIT09IG51bGwpIHtcbiAgICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaChcbiAgICAgICAgICBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtKHRoaXMuZmFjdG9yeVRvU291cmNlSW5mbywgdGhpcy5pbXBvcnRSZXdyaXRlcikpO1xuICAgIH1cbiAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goaXZ5U3dpdGNoVHJhbnNmb3JtKTtcbiAgICBpZiAoY3VzdG9tVHJhbnNmb3JtcyAmJiBjdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzKSB7XG4gICAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goLi4uY3VzdG9tVHJhbnNmb3Jtcy5iZWZvcmVUcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZW1pdFNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnZW1pdCcpO1xuICAgIGNvbnN0IGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10gPSBbXTtcblxuICAgIGNvbnN0IHR5cGVDaGVja0ZpbGUgPSBnZXRTb3VyY2VGaWxlT3JOdWxsKHRoaXMudHNQcm9ncmFtLCB0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKTtcblxuICAgIGZvciAoY29uc3QgdGFyZ2V0U291cmNlRmlsZSBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAodGFyZ2V0U291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSB8fCB0YXJnZXRTb3VyY2VGaWxlID09PSB0eXBlQ2hlY2tGaWxlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5pbmNyZW1lbnRhbFN0YXRlLnNhZmVUb1NraXAodGFyZ2V0U291cmNlRmlsZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpbGVFbWl0U3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdlbWl0RmlsZScsIHRhcmdldFNvdXJjZUZpbGUpO1xuICAgICAgZW1pdFJlc3VsdHMucHVzaChlbWl0Q2FsbGJhY2soe1xuICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLFxuICAgICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgaG9zdDogdGhpcy5ob3N0LFxuICAgICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICAgIGVtaXRPbmx5RHRzRmlsZXM6IGZhbHNlLCB3cml0ZUZpbGUsXG4gICAgICAgIGN1c3RvbVRyYW5zZm9ybWVyczoge1xuICAgICAgICAgIGJlZm9yZTogYmVmb3JlVHJhbnNmb3JtcyxcbiAgICAgICAgICBhZnRlcjogY3VzdG9tVHJhbnNmb3JtcyAmJiBjdXN0b21UcmFuc2Zvcm1zLmFmdGVyVHMsXG4gICAgICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnM6IGFmdGVyRGVjbGFyYXRpb25zVHJhbnNmb3JtcyxcbiAgICAgICAgfSxcbiAgICAgIH0pKTtcbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoZmlsZUVtaXRTcGFuKTtcbiAgICB9XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChlbWl0U3Bhbik7XG5cbiAgICBpZiAodGhpcy5wZXJmVHJhY2tlciAhPT0gbnVsbCAmJiB0aGlzLm9wdGlvbnMudHJhY2VQZXJmb3JtYW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnBlcmZUcmFja2VyLnNlcmlhbGl6ZVRvRmlsZSh0aGlzLm9wdGlvbnMudHJhY2VQZXJmb3JtYW5jZSwgdGhpcy5ob3N0KTtcbiAgICB9XG5cbiAgICAvLyBSdW4gdGhlIGVtaXQsIGluY2x1ZGluZyBhIGN1c3RvbSB0cmFuc2Zvcm1lciB0aGF0IHdpbGwgZG93bmxldmVsIHRoZSBJdnkgZGVjb3JhdG9ycyBpbiBjb2RlLlxuICAgIHJldHVybiAoKG9wdHMgJiYgb3B0cy5tZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2spIHx8IG1lcmdlRW1pdFJlc3VsdHMpKGVtaXRSZXN1bHRzKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VGVtcGxhdGVEaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICAvLyBTa2lwIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgaWYgaXQncyBkaXNhYmxlZC5cbiAgICBpZiAodGhpcy5vcHRpb25zLml2eVRlbXBsYXRlVHlwZUNoZWNrID09PSBmYWxzZSAmJlxuICAgICAgICB0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrICE9PSB0cnVlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICAvLyBSdW4gdGVtcGxhdGUgdHlwZS1jaGVja2luZy5cblxuICAgIC8vIEZpcnN0IHNlbGVjdCBhIHR5cGUtY2hlY2tpbmcgY29uZmlndXJhdGlvbiwgYmFzZWQgb24gd2hldGhlciBmdWxsIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgaXNcbiAgICAvLyByZXF1ZXN0ZWQuXG4gICAgbGV0IHR5cGVDaGVja2luZ0NvbmZpZzogVHlwZUNoZWNraW5nQ29uZmlnO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrKSB7XG4gICAgICBjb25zdCBzdHJpY3RUZW1wbGF0ZXMgPSAhIXRoaXMub3B0aW9ucy5zdHJpY3RUZW1wbGF0ZXM7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcgPSB7XG4gICAgICAgIGFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzOiB0cnVlLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiB0cnVlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIEV2ZW4gaW4gZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIERPTSBiaW5kaW5nIGNoZWNrcyBhcmUgbm90IHF1aXRlIHJlYWR5IHlldC5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIENoZWNraW5nIG9mIERPTSBldmVudHMgY3VycmVudGx5IGhhcyBhbiBhZHZlcnNlIGVmZmVjdCBvbiBkZXZlbG9wZXIgZXhwZXJpZW5jZSxcbiAgICAgICAgLy8gZS5nLiBmb3IgYDxpbnB1dCAoYmx1cik9XCJ1cGRhdGUoJGV2ZW50LnRhcmdldC52YWx1ZSlcIj5gIGVuYWJsaW5nIHRoaXMgY2hlY2sgcmVzdWx0cyBpbjpcbiAgICAgICAgLy8gLSBlcnJvciBUUzI1MzE6IE9iamVjdCBpcyBwb3NzaWJseSAnbnVsbCcuXG4gICAgICAgIC8vIC0gZXJyb3IgVFMyMzM5OiBQcm9wZXJ0eSAndmFsdWUnIGRvZXMgbm90IGV4aXN0IG9uIHR5cGUgJ0V2ZW50VGFyZ2V0Jy5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIE5vbi1ET00gcmVmZXJlbmNlcyBoYXZlIHRoZSBjb3JyZWN0IHR5cGUgaW4gVmlldyBFbmdpbmUgc28gdGhlcmUgaXMgbm8gc3RyaWN0bmVzcyBmbGFnLlxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IHRydWUsXG4gICAgICAgIC8vIFBpcGVzIGFyZSBjaGVja2VkIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogdHJ1ZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogZmFsc2UsXG4gICAgICAgIGNoZWNrUXVlcmllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVGVtcGxhdGVCb2RpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBzdHJpY3ROdWxsSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQXR0cmlidXRlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZlBpcGVzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogZmFsc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEFwcGx5IGV4cGxpY2l0bHkgY29uZmlndXJlZCBzdHJpY3RuZXNzIGZsYWdzIG9uIHRvcCBvZiB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgLy8gYmFzZWQgb24gXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIi5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdE51bGxJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncyA9IHRoaXMub3B0aW9ucy5zdHJpY3ROdWxsSW5wdXRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZk91dHB1dEV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzO1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0RG9tRXZlbnRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZEb21FdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0RG9tRXZlbnRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzID0gdGhpcy5vcHRpb25zLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0RG9tTG9jYWxSZWZUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzID0gdGhpcy5vcHRpb25zLnN0cmljdERvbUxvY2FsUmVmVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0QXR0cmlidXRlVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mQXR0cmlidXRlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RBdHRyaWJ1dGVUeXBlcztcbiAgICB9XG5cbiAgICAvLyBFeGVjdXRlIHRoZSB0eXBlQ2hlY2sgcGhhc2Ugb2YgZWFjaCBkZWNvcmF0b3IgaW4gdGhlIHByb2dyYW0uXG4gICAgY29uc3QgcHJlcFNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgndHlwZUNoZWNrUHJlcCcpO1xuICAgIGNvbnN0IGN0eCA9IG5ldyBUeXBlQ2hlY2tDb250ZXh0KHR5cGVDaGVja2luZ0NvbmZpZywgdGhpcy5yZWZFbWl0dGVyICEsIHRoaXMudHlwZUNoZWNrRmlsZVBhdGgpO1xuICAgIGNvbXBpbGF0aW9uLnR5cGVDaGVjayhjdHgpO1xuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AocHJlcFNwYW4pO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCB0eXBlQ2hlY2tTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ3R5cGVDaGVja0RpYWdub3N0aWNzJyk7XG4gICAgY29uc3Qge2RpYWdub3N0aWNzLCBwcm9ncmFtfSA9XG4gICAgICAgIGN0eC5jYWxjdWxhdGVUZW1wbGF0ZURpYWdub3N0aWNzKHRoaXMudHNQcm9ncmFtLCB0aGlzLmhvc3QsIHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcCh0eXBlQ2hlY2tTcGFuKTtcbiAgICB0aGlzLnJldXNlVHNQcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldEluZGV4ZWRDb21wb25lbnRzKCk6IE1hcDx0cy5EZWNsYXJhdGlvbiwgSW5kZXhlZENvbXBvbmVudD4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBuZXcgSW5kZXhpbmdDb250ZXh0KCk7XG4gICAgY29tcGlsYXRpb24uaW5kZXgoY29udGV4dCk7XG4gICAgcmV0dXJuIGdlbmVyYXRlQW5hbHlzaXMoY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIG1ha2VDb21waWxhdGlvbigpOiBJdnlDb21waWxhdGlvbiB7XG4gICAgY29uc3QgY2hlY2tlciA9IHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICAvLyBDb25zdHJ1Y3QgdGhlIFJlZmVyZW5jZUVtaXR0ZXIuXG4gICAgaWYgKHRoaXMuZmlsZVRvTW9kdWxlSG9zdCA9PT0gbnVsbCB8fCAhdGhpcy5vcHRpb25zLl91c2VIb3N0Rm9ySW1wb3J0R2VuZXJhdGlvbikge1xuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBkb2Vzbid0IGhhdmUgZmlsZU5hbWVUb01vZHVsZU5hbWUsIHNvIGJ1aWxkIGFuIE5QTS1jZW50cmljIHJlZmVyZW5jZVxuICAgICAgLy8gcmVzb2x1dGlvbiBzdHJhdGVneS5cbiAgICAgIHRoaXMucmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gTmV4dCwgYXR0ZW1wdCB0byB1c2UgYW4gYWJzb2x1dGUgaW1wb3J0LlxuICAgICAgICBuZXcgQWJzb2x1dGVNb2R1bGVTdHJhdGVneShcbiAgICAgICAgICAgIHRoaXMudHNQcm9ncmFtLCBjaGVja2VyLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgcmVmZXJlbmNlIGlzIGJlaW5nIHdyaXR0ZW4gaW50byBhIGZpbGUgd2l0aGluIHRoZSBwcm9qZWN0J3MgbG9naWNhbFxuICAgICAgICAvLyBmaWxlIHN5c3RlbSwgYW5kIHVzZSBhIHJlbGF0aXZlIGltcG9ydCBpZiBzby4gSWYgdGhpcyBmYWlscywgUmVmZXJlbmNlRW1pdHRlciB3aWxsIHRocm93XG4gICAgICAgIC8vIGFuIGVycm9yLlxuICAgICAgICBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneSh0aGlzLnJlZmxlY3RvciwgbmV3IExvZ2ljYWxGaWxlU3lzdGVtKHRoaXMucm9vdERpcnMpKSxcbiAgICAgIF0pO1xuXG4gICAgICAvLyBJZiBhbiBlbnRyeXBvaW50IGlzIHByZXNlbnQsIHRoZW4gYWxsIHVzZXIgaW1wb3J0cyBzaG91bGQgYmUgZGlyZWN0ZWQgdGhyb3VnaCB0aGVcbiAgICAgIC8vIGVudHJ5cG9pbnQgYW5kIHByaXZhdGUgZXhwb3J0cyBhcmUgbm90IG5lZWRlZC4gVGhlIGNvbXBpbGVyIHdpbGwgdmFsaWRhdGUgdGhhdCBhbGwgcHVibGljbHlcbiAgICAgIC8vIHZpc2libGUgZGlyZWN0aXZlcy9waXBlcyBhcmUgaW1wb3J0YWJsZSB2aWEgdGhpcyBlbnRyeXBvaW50LlxuICAgICAgaWYgKHRoaXMuZW50cnlQb2ludCA9PT0gbnVsbCAmJiB0aGlzLm9wdGlvbnMuZ2VuZXJhdGVEZWVwUmVleHBvcnRzID09PSB0cnVlKSB7XG4gICAgICAgIC8vIE5vIGVudHJ5cG9pbnQgaXMgcHJlc2VudCBhbmQgZGVlcCByZS1leHBvcnRzIHdlcmUgcmVxdWVzdGVkLCBzbyBjb25maWd1cmUgdGhlIGFsaWFzaW5nXG4gICAgICAgIC8vIHN5c3RlbSB0byBnZW5lcmF0ZSB0aGVtLlxuICAgICAgICB0aGlzLmFsaWFzaW5nSG9zdCA9IG5ldyBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0KHRoaXMucmVmbGVjdG9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBzdXBwb3J0cyBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gdXNlIHRoYXQgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgdGhpcy5yZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBhbGlhc2VkIHJlZmVyZW5jZXMgKHRoaXMgaXMgYSB3b3JrYXJvdW5kIHRvIFN0cmljdERlcHMgY2hlY2tzKS5cbiAgICAgICAgbmV3IEFsaWFzU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgZmlsZU5hbWVUb01vZHVsZU5hbWUgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgICBuZXcgRmlsZVRvTW9kdWxlU3RyYXRlZ3kodGhpcy5yZWZsZWN0b3IsIHRoaXMuZmlsZVRvTW9kdWxlSG9zdCksXG4gICAgICBdKTtcbiAgICAgIHRoaXMuYWxpYXNpbmdIb3N0ID0gbmV3IEZpbGVUb01vZHVsZUFsaWFzaW5nSG9zdCh0aGlzLmZpbGVUb01vZHVsZUhvc3QpO1xuICAgIH1cblxuICAgIGNvbnN0IGV2YWx1YXRvciA9IG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdG9yLCBjaGVja2VyLCB0aGlzLmluY3JlbWVudGFsU3RhdGUpO1xuICAgIGNvbnN0IGR0c1JlYWRlciA9IG5ldyBEdHNNZXRhZGF0YVJlYWRlcihjaGVja2VyLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVnaXN0cnkgPSBuZXcgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW2xvY2FsTWV0YVJlZ2lzdHJ5LCB0aGlzLmluY3JlbWVudGFsU3RhdGVdKTtcbiAgICBjb25zdCBkZXBTY29wZVJlYWRlciA9IG5ldyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIoZHRzUmVhZGVyLCB0aGlzLmFsaWFzaW5nSG9zdCk7XG4gICAgY29uc3Qgc2NvcGVSZWdpc3RyeSA9IG5ldyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkoXG4gICAgICAgIGxvY2FsTWV0YVJlYWRlciwgZGVwU2NvcGVSZWFkZXIsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5hbGlhc2luZ0hvc3QsIHRoaXMuaW5jcmVtZW50YWxTdGF0ZSk7XG4gICAgY29uc3Qgc2NvcGVSZWFkZXIgPSBuZXcgQ29tcG91bmRDb21wb25lbnRTY29wZVJlYWRlcihbc2NvcGVSZWdpc3RyeSwgdGhpcy5pbmNyZW1lbnRhbFN0YXRlXSk7XG4gICAgY29uc3QgbWV0YVJlZ2lzdHJ5ID1cbiAgICAgICAgbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbbG9jYWxNZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIHRoaXMuaW5jcmVtZW50YWxTdGF0ZV0pO1xuXG4gICAgdGhpcy5tZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW2xvY2FsTWV0YVJlYWRlciwgZHRzUmVhZGVyXSk7XG5cblxuICAgIC8vIElmIGEgZmxhdCBtb2R1bGUgZW50cnlwb2ludCB3YXMgc3BlY2lmaWVkLCB0aGVuIHRyYWNrIHJlZmVyZW5jZXMgdmlhIGEgYFJlZmVyZW5jZUdyYXBoYFxuICAgIC8vIGluXG4gICAgLy8gb3JkZXIgdG8gcHJvZHVjZSBwcm9wZXIgZGlhZ25vc3RpY3MgZm9yIGluY29ycmVjdGx5IGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMvZXRjLiBJZlxuICAgIC8vIHRoZXJlXG4gICAgLy8gaXMgbm8gZmxhdCBtb2R1bGUgZW50cnlwb2ludCB0aGVuIGRvbid0IHBheSB0aGUgY29zdCBvZiB0cmFja2luZyByZWZlcmVuY2VzLlxuICAgIGxldCByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeTtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoID0gbmV3IFJlZmVyZW5jZUdyYXBoKCk7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgUmVmZXJlbmNlR3JhcGhBZGFwdGVyKHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSgpO1xuICAgIH1cblxuICAgIHRoaXMucm91dGVBbmFseXplciA9IG5ldyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIodGhpcy5tb2R1bGVSZXNvbHZlciwgZXZhbHVhdG9yKTtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnMgPSBbXG4gICAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICB0aGlzLnJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHRoaXMubWV0YVJlYWRlciAhLCBzY29wZVJlYWRlciwgc2NvcGVSZWdpc3RyeSxcbiAgICAgICAgICB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsIHRoaXMucm9vdERpcnMsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLnByZXNlcnZlV2hpdGVzcGFjZXMgfHwgZmFsc2UsIHRoaXMub3B0aW9ucy5pMThuVXNlRXh0ZXJuYWxJZHMgIT09IGZhbHNlLFxuICAgICAgICAgIHRoaXMuZ2V0STE4bkxlZ2FjeU1lc3NhZ2VGb3JtYXQoKSwgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5jeWNsZUFuYWx5emVyLFxuICAgICAgICAgIHRoaXMucmVmRW1pdHRlciwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pbmNyZW1lbnRhbFN0YXRlKSxcbiAgICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgbmV3IEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycyB8fCBmYWxzZSksXG4gICAgICBuZXcgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIHRoaXMubWV0YVJlYWRlciwgbWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LFxuICAgICAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIHRoaXMucm91dGVBbmFseXplciwgdGhpcy5yZWZFbWl0dGVyLFxuICAgICAgICAgIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMub3B0aW9ucy5pMThuSW5Mb2NhbGUpLFxuICAgICAgbmV3IFBpcGVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pc0NvcmUpLFxuICAgIF07XG5cbiAgICByZXR1cm4gbmV3IEl2eUNvbXBpbGF0aW9uKFxuICAgICAgICBoYW5kbGVycywgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaW1wb3J0UmV3cml0ZXIsIHRoaXMuaW5jcmVtZW50YWxTdGF0ZSwgdGhpcy5wZXJmUmVjb3JkZXIsXG4gICAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scywgc2NvcGVSZWdpc3RyeSk7XG4gIH1cblxuICBwcml2YXRlIGdldEkxOG5MZWdhY3lNZXNzYWdlRm9ybWF0KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0ICE9PSBmYWxzZSAmJiB0aGlzLm9wdGlvbnMuaTE4bkluRm9ybWF0IHx8XG4gICAgICAgICcnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgcmVmbGVjdG9yKCk6IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCB7XG4gICAgaWYgKHRoaXMuX3JlZmxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9yZWZsZWN0b3IgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmVmbGVjdG9yO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgY29yZUltcG9ydHNGcm9tKCk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgaWYgKHRoaXMuX2NvcmVJbXBvcnRzRnJvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb3JlSW1wb3J0c0Zyb20gPSB0aGlzLmlzQ29yZSAmJiBnZXRSM1N5bWJvbHNGaWxlKHRoaXMudHNQcm9ncmFtKSB8fCBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29yZUltcG9ydHNGcm9tO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaXNDb3JlKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9pc0NvcmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5faXNDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy50c1Byb2dyYW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faXNDb3JlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaW1wb3J0UmV3cml0ZXIoKTogSW1wb3J0UmV3cml0ZXIge1xuICAgIGlmICh0aGlzLl9pbXBvcnRSZXdyaXRlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjb3JlSW1wb3J0c0Zyb20gPSB0aGlzLmNvcmVJbXBvcnRzRnJvbTtcbiAgICAgIHRoaXMuX2ltcG9ydFJld3JpdGVyID0gY29yZUltcG9ydHNGcm9tICE9PSBudWxsID9cbiAgICAgICAgICBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIoY29yZUltcG9ydHNGcm9tLmZpbGVOYW1lKSA6XG4gICAgICAgICAgbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faW1wb3J0UmV3cml0ZXI7XG4gIH1cbn1cblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogYXBpLlRzRW1pdENhbGxiYWNrID1cbiAgICAoe3Byb2dyYW0sIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnN9KSA9PlxuICAgICAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cblxuICByZXR1cm4ge2RpYWdub3N0aWNzLCBlbWl0U2tpcHBlZCwgZW1pdHRlZEZpbGVzfTtcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSAncjNfc3ltYm9scy50cycgZmlsZSBpbiB0aGUgZ2l2ZW4gYFByb2dyYW1gLCBvciByZXR1cm4gYG51bGxgIGlmIGl0IHdhc24ndCB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maW5kKGZpbGUgPT4gZmlsZS5maWxlTmFtZS5pbmRleE9mKCdyM19zeW1ib2xzLnRzJykgPj0gMCkgfHwgbnVsbDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgdGhlIGdpdmVuIGBQcm9ncmFtYCBpcyBAYW5ndWxhci9jb3JlLlxuICovXG5mdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUGFja2FnZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogYm9vbGVhbiB7XG4gIC8vIExvb2sgZm9yIGl0c19qdXN0X2FuZ3VsYXIudHMgc29tZXdoZXJlIGluIHRoZSBwcm9ncmFtLlxuICBjb25zdCByM1N5bWJvbHMgPSBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW0pO1xuICBpZiAocjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIGNvbnN0YW50IElUU19KVVNUX0FOR1VMQVIgaW4gdGhhdCBmaWxlLlxuICByZXR1cm4gcjNTeW1ib2xzLnN0YXRlbWVudHMuc29tZShzdG10ID0+IHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IG11c3QgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgYmUgZXhwb3J0ZWQuXG4gICAgaWYgKHN0bXQubW9kaWZpZXJzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXN0bXQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgZGVjbGFyZSBJVFNfSlVTVF9BTkdVTEFSLlxuICAgIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuc29tZShkZWNsID0+IHtcbiAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBtdXN0IG1hdGNoIHRoZSBuYW1lLlxuICAgICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSB8fCBkZWNsLm5hbWUudGV4dCAhPT0gJ0lUU19KVVNUX0FOR1VMQVInKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEl0IG11c3QgaW5pdGlhbGl6ZSB0aGUgdmFyaWFibGUgdG8gdHJ1ZS5cbiAgICAgIGlmIChkZWNsLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQgfHwgZGVjbC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgZGVmaW5pdGlvbiBtYXRjaGVzLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlR3JhcGhBZGFwdGVyIGltcGxlbWVudHMgUmVmZXJlbmNlc1JlZ2lzdHJ5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBncmFwaDogUmVmZXJlbmNlR3JhcGgpIHt9XG5cbiAgYWRkKHNvdXJjZTogdHMuRGVjbGFyYXRpb24sIC4uLnJlZmVyZW5jZXM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qge25vZGV9IG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCBzb3VyY2VGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNvdXJjZUZpbGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IHJlY29yZCBsb2NhbCByZWZlcmVuY2VzIChub3QgcmVmZXJlbmNlcyBpbnRvIC5kLnRzIGZpbGVzKS5cbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQgfHwgIWlzRHRzUGF0aChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICB0aGlzLmdyYXBoLmFkZChzb3VyY2UsIG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzaG91bGRFbmFibGVQZXJmVHJhY2luZyhvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKTogYm9vbGVhbiB7XG4gIHJldHVybiBvcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZDtcbn1cbiJdfQ==