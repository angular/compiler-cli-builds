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
        define("@angular/compiler-cli/src/ngtsc/program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/transformers/nocollapse_hack", "@angular/compiler-cli/src/typescript_support", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/entry_point", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental", "@angular/compiler-cli/src/ngtsc/indexer", "@angular/compiler-cli/src/ngtsc/indexer/src/transform", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/modulewithproviders", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/resource_loader", "@angular/compiler-cli/src/ngtsc/routing", "@angular/compiler-cli/src/ngtsc/scope", "@angular/compiler-cli/src/ngtsc/shims", "@angular/compiler-cli/src/ngtsc/switch", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/transform/src/alias", "@angular/compiler-cli/src/ngtsc/typecheck", "@angular/compiler-cli/src/ngtsc/util/src/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
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
    var modulewithproviders_1 = require("@angular/compiler-cli/src/ngtsc/modulewithproviders");
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
            this.options = options;
            this.host = host;
            this.compilation = undefined;
            this._coreImportsFrom = undefined;
            this._importRewriter = undefined;
            this._reflector = undefined;
            this._isCore = undefined;
            this.exportReferenceGraph = null;
            this.flatIndexGenerator = null;
            this.routeAnalyzer = null;
            this.scopeRegistry = null;
            this.constructionDiagnostics = [];
            this.metaReader = null;
            this.aliasingHost = null;
            this.refEmitter = null;
            this.fileToModuleHost = null;
            this.perfRecorder = perf_1.NOOP_PERF_RECORDER;
            this.perfTracker = null;
            this.factoryTracker = null;
            this.dtsTransforms = null;
            this.mwpScanner = null;
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
                var factoryFileNames = Array.from(factoryFileMap.keys());
                rootFiles.push.apply(rootFiles, tslib_1.__spread(factoryFileNames));
                generators.push(factoryGenerator);
                this.factoryTracker = new shims_1.FactoryTracker(factoryGenerator);
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
                this.incrementalDriver = incremental_1.IncrementalDriver.fresh(this.tsProgram);
            }
            else {
                this.incrementalDriver = incremental_1.IncrementalDriver.reconcile(oldProgram.reuseTsProgram, oldProgram.incrementalDriver, this.tsProgram, this.modifiedResourceFiles);
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
                var analyzeSpan, promises, _loop_1, this_1, _a, _b, sf;
                var e_1, _c;
                var _this = this;
                return tslib_1.__generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            if (this.compilation === undefined) {
                                this.compilation = this.makeCompilation();
                            }
                            analyzeSpan = this.perfRecorder.start('analyze');
                            promises = [];
                            _loop_1 = function (sf) {
                                if (sf.isDeclarationFile) {
                                    return "continue";
                                }
                                var analyzeFileSpan = this_1.perfRecorder.start('analyzeFile', sf);
                                var analysisPromise = this_1.compilation.analyzeAsync(sf);
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
                            this.resolveCompilation(this.compilation);
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
        NgtscProgram.prototype.scanForMwp = function (sf) {
            var _this = this;
            this.mwpScanner.scan(sf, {
                addTypeReplacement: function (node, type) {
                    // Only obtain the return type transform for the source file once there's a type to replace,
                    // so that no transform is allocated when there's nothing to do.
                    _this.dtsTransforms.getReturnTypeTransform(sf).addTypeReplacement(node, type);
                }
            });
        };
        NgtscProgram.prototype.ensureAnalyzed = function () {
            var e_2, _a;
            if (this.compilation === undefined) {
                var analyzeSpan = this.perfRecorder.start('analyze');
                this.compilation = this.makeCompilation();
                try {
                    for (var _b = tslib_1.__values(this.tsProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var sf = _c.value;
                        if (sf.isDeclarationFile) {
                            continue;
                        }
                        var analyzeFileSpan = this.perfRecorder.start('analyzeFile', sf);
                        this.compilation.analyzeSync(sf);
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
                this.resolveCompilation(this.compilation);
            }
            return this.compilation;
        };
        NgtscProgram.prototype.resolveCompilation = function (compilation) {
            compilation.resolve();
            this.recordNgModuleScopeDependencies();
            // At this point, analysis is complete and the compiler can now calculate which files need to
            // be emitted, so do that.
            this.incrementalDriver.recordSuccessfulAnalysis(compilation);
        };
        NgtscProgram.prototype.emit = function (opts) {
            var e_3, _a;
            var _this = this;
            var emitCallback = opts && opts.emitCallback || defaultEmitCallback;
            var compilation = this.ensureAnalyzed();
            var writeFile = function (fileName, data, writeByteOrderMark, onError, sourceFiles) {
                var e_4, _a;
                if (sourceFiles !== undefined) {
                    try {
                        // Record successful writes for any `ts.SourceFile` (that's not a declaration file)
                        // that's an input to this write.
                        for (var sourceFiles_1 = tslib_1.__values(sourceFiles), sourceFiles_1_1 = sourceFiles_1.next(); !sourceFiles_1_1.done; sourceFiles_1_1 = sourceFiles_1.next()) {
                            var writtenSf = sourceFiles_1_1.value;
                            if (writtenSf.isDeclarationFile) {
                                continue;
                            }
                            _this.incrementalDriver.recordSuccessfulEmit(writtenSf);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (sourceFiles_1_1 && !sourceFiles_1_1.done && (_a = sourceFiles_1.return)) _a.call(sourceFiles_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
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
            var afterDeclarationsTransforms = [];
            if (this.dtsTransforms !== null) {
                afterDeclarationsTransforms.push(transform_2.declarationTransformFactory(this.dtsTransforms, this.importRewriter));
            }
            // Only add aliasing re-exports to the .d.ts output if the `AliasingHost` requests it.
            if (this.aliasingHost !== null && this.aliasingHost.aliasExportsInDts) {
                afterDeclarationsTransforms.push(alias_1.aliasTransformFactory(compilation.exportStatements));
            }
            if (this.factoryTracker !== null) {
                beforeTransforms.push(shims_1.generatedFactoryTransform(this.factoryTracker.sourceInfo, this.importRewriter));
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
                    if (this.incrementalDriver.safeToSkipEmit(targetSourceFile)) {
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
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
                    localImportStrategy =
                        new imports_1.LogicalProjectStrategy(this.reflector, new file_system_1.LogicalFileSystem(this.rootDirs));
                }
                else {
                    // Plain relative imports are all that's needed.
                    localImportStrategy = new imports_1.RelativePathStrategy(this.reflector);
                }
                // The CompilerHost doesn't have fileNameToModuleName, so build an NPM-centric reference
                // resolution strategy.
                this.refEmitter = new imports_1.ReferenceEmitter([
                    // First, try to use local identifiers if available.
                    new imports_1.LocalIdentifierStrategy(),
                    // Next, attempt to use an absolute import.
                    new imports_1.AbsoluteModuleStrategy(this.tsProgram, checker, this.options, this.host, this.reflector),
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
            var evaluator = new partial_evaluator_1.PartialEvaluator(this.reflector, checker, this.incrementalDriver.depGraph);
            var dtsReader = new metadata_1.DtsMetadataReader(checker, this.reflector);
            var localMetaRegistry = new metadata_1.LocalMetadataRegistry();
            var localMetaReader = localMetaRegistry;
            var depScopeReader = new scope_1.MetadataDtsModuleScopeResolver(dtsReader, this.aliasingHost);
            this.scopeRegistry = new scope_1.LocalModuleScopeRegistry(localMetaReader, depScopeReader, this.refEmitter, this.aliasingHost);
            var scopeReader = this.scopeRegistry;
            var metaRegistry = new metadata_1.CompoundMetadataRegistry([localMetaRegistry, this.scopeRegistry]);
            this.metaReader = new metadata_1.CompoundMetadataReader([localMetaReader, dtsReader]);
            // If a flat module entrypoint was specified, then track references via a `ReferenceGraph` in
            // order to produce proper diagnostics for incorrectly exported directives/pipes/etc. If there
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
            this.dtsTransforms = new transform_2.DtsTransformRegistry();
            this.mwpScanner = new modulewithproviders_1.ModuleWithProvidersScanner(this.reflector, evaluator, this.refEmitter);
            // Set up the IvyCompilation, which manages state for the Ivy transformer.
            var handlers = [
                new annotations_1.ComponentDecoratorHandler(this.reflector, evaluator, metaRegistry, this.metaReader, scopeReader, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.moduleResolver, this.cycleAnalyzer, this.refEmitter, this.defaultImportTracker, this.incrementalDriver.depGraph, this.closureCompilerEnabled),
                // TODO(alxhub): understand why the cast here is necessary (something to do with `null` not
                // being assignable to `unknown` when wrapped in `Readonly`).
                new annotations_1.DirectiveDecoratorHandler(this.reflector, evaluator, metaRegistry, this.defaultImportTracker, this.isCore, this.closureCompilerEnabled),
                // Pipe handler must be before injectable handler in list so pipe factories are printed
                // before injectable factories (so injectable factories can delegate to them)
                new annotations_1.PipeDecoratorHandler(this.reflector, evaluator, metaRegistry, this.defaultImportTracker, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflector, this.defaultImportTracker, this.isCore, this.options.strictInjectionParameters || false),
                new annotations_1.NgModuleDecoratorHandler(this.reflector, evaluator, this.metaReader, metaRegistry, this.scopeRegistry, referencesRegistry, this.isCore, this.routeAnalyzer, this.refEmitter, this.factoryTracker, this.defaultImportTracker, this.closureCompilerEnabled, this.options.i18nInLocale),
            ];
            return new transform_2.TraitCompiler(handlers, this.reflector, this.perfRecorder, this.incrementalDriver, this.options.compileNonExportedClasses !== false, this.dtsTransforms);
        };
        /**
         * Reifies the inter-dependencies of NgModules and the components within their compilation scopes
         * into the `IncrementalDriver`'s dependency graph.
         */
        NgtscProgram.prototype.recordNgModuleScopeDependencies = function () {
            var e_5, _a, e_6, _b, e_7, _c;
            var recordSpan = this.perfRecorder.start('recordDependencies');
            var depGraph = this.incrementalDriver.depGraph;
            try {
                for (var _d = tslib_1.__values(this.scopeRegistry.getCompilationScopes()), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var scope = _e.value;
                    var file = scope.declaration.getSourceFile();
                    var ngModuleFile = scope.ngModule.getSourceFile();
                    // A change to any dependency of the declaration causes the declaration to be invalidated,
                    // which requires the NgModule to be invalidated as well.
                    depGraph.addTransitiveDependency(ngModuleFile, file);
                    // A change to the NgModule file should cause the declaration itself to be invalidated.
                    depGraph.addDependency(file, ngModuleFile);
                    var meta = this.metaReader.getDirectiveMetadata(new imports_1.Reference(scope.declaration));
                    if (meta !== null && meta.isComponent) {
                        // If a component's template changes, it might have affected the import graph, and thus the
                        // remote scoping feature which is activated in the event of potential import cycles. Thus,
                        // the module depends not only on the transitive dependencies of the component, but on its
                        // resources as well.
                        depGraph.addTransitiveResources(ngModuleFile, file);
                        try {
                            // A change to any directive/pipe in the compilation scope should cause the component to be
                            // invalidated.
                            for (var _f = (e_6 = void 0, tslib_1.__values(scope.directives)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                var directive = _g.value;
                                // When a directive in scope is updated, the component needs to be recompiled as e.g. a
                                // selector may have changed.
                                depGraph.addTransitiveDependency(file, directive.ref.node.getSourceFile());
                            }
                        }
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                        try {
                            for (var _h = (e_7 = void 0, tslib_1.__values(scope.pipes)), _j = _h.next(); !_j.done; _j = _h.next()) {
                                var pipe = _j.value;
                                // When a pipe in scope is updated, the component needs to be recompiled as e.g. the
                                // pipe's name may have changed.
                                depGraph.addTransitiveDependency(file, pipe.ref.node.getSourceFile());
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_5) throw e_5.error; }
            }
            this.perfRecorder.stop(recordSpan);
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
        var e_8, _a;
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
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (emitResults_1_1 && !emitResults_1_1.done && (_a = emitResults_1.return)) _a.call(emitResults_1);
            }
            finally { if (e_8) throw e_8.error; }
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
    exports.ReferenceGraphAdapter = ReferenceGraphAdapter;
    function shouldEnablePerfTracing(options) {
        return options.tracePerformance !== undefined;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsMEZBQStEO0lBQy9ELG1GQUF1RTtJQUV2RSwyRUFBMk07SUFDM00saUVBQW9EO0lBQ3BELDJFQUFxRDtJQUNyRCwyRUFBa0g7SUFDbEgsMkVBQThFO0lBQzlFLG1FQUF5WTtJQUN6WSwyRUFBZ0Q7SUFDaEQsbUVBQTREO0lBQzVELG1GQUF5RDtJQUN6RCxxRUFBc0k7SUFDdEksMkZBQWlFO0lBQ2pFLHVGQUFxRDtJQUNyRCw2REFBcUU7SUFDckUseUVBQXNEO0lBQ3RELG1GQUFxRDtJQUNyRCxtRUFBa0U7SUFDbEUsK0RBQXFJO0lBQ3JJLCtEQUF3SztJQUN4SyxpRUFBNEM7SUFDNUMsdUVBQW9JO0lBQ3BJLDZFQUE0RDtJQUM1RCx1RUFBb0Y7SUFDcEYsc0VBQW9EO0lBQ3BELGtGQUFxRztJQUVyRztRQW9DRSxzQkFDSSxTQUFnQyxFQUFVLE9BQTRCLEVBQzlELElBQXNCLEVBQUUsVUFBeUI7WUFEZixZQUFPLEdBQVAsT0FBTyxDQUFxQjtZQUM5RCxTQUFJLEdBQUosSUFBSSxDQUFrQjtZQWxDMUIsZ0JBQVcsR0FBNEIsU0FBUyxDQUFDO1lBQ2pELHFCQUFnQixHQUFpQyxTQUFTLENBQUM7WUFDM0Qsb0JBQWUsR0FBNkIsU0FBUyxDQUFDO1lBQ3RELGVBQVUsR0FBdUMsU0FBUyxDQUFDO1lBQzNELFlBQU8sR0FBc0IsU0FBUyxDQUFDO1lBSXZDLHlCQUFvQixHQUF3QixJQUFJLENBQUM7WUFDakQsdUJBQWtCLEdBQTRCLElBQUksQ0FBQztZQUNuRCxrQkFBYSxHQUErQixJQUFJLENBQUM7WUFDakQsa0JBQWEsR0FBa0MsSUFBSSxDQUFDO1lBRXBELDRC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Q0FBQyxhQUFhLEVBQUUsQ0FBQztxQkFDdkQ7b0JBRUQsa0VBQWtFO29CQUNsRSxJQUFJLFVBQVUsS0FBSyxTQUFTLElBQUksQ0FBQyxzQkFBUyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTt3QkFDL0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO3FCQUM5QjtpQkFDRjs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUNILDRCQUFDO0lBQUQsQ0FBQyxBQWhCRCxJQWdCQztJQWhCWSxzREFBcUI7SUFrQmxDLFNBQVMsdUJBQXVCLENBQUMsT0FBNEI7UUFDM0QsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxDQUFDO0lBQ2hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7R2VuZXJhdGVkRmlsZSwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCB7bm9jb2xsYXBzZUhhY2t9IGZyb20gJy4uL3RyYW5zZm9ybWVycy9ub2NvbGxhcHNlX2hhY2snO1xuaW1wb3J0IHt2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbn0gZnJvbSAnLi4vdHlwZXNjcmlwdF9zdXBwb3J0JztcblxuaW1wb3J0IHtDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLCBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyLCBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciwgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLCBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5LCBQaXBlRGVjb3JhdG9ySGFuZGxlciwgUmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuL2Fubm90YXRpb25zJztcbmltcG9ydCB7Q3ljbGVBbmFseXplciwgSW1wb3J0R3JhcGh9IGZyb20gJy4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ZsYXRJbmRleEdlbmVyYXRvciwgUmVmZXJlbmNlR3JhcGgsIGNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMsIGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50fSBmcm9tICcuL2VudHJ5X3BvaW50JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIExvZ2ljYWxGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb219IGZyb20gJy4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5LCBBbGlhc1N0cmF0ZWd5LCBBbGlhc2luZ0hvc3QsIERlZmF1bHRJbXBvcnRUcmFja2VyLCBGaWxlVG9Nb2R1bGVBbGlhc2luZ0hvc3QsIEZpbGVUb01vZHVsZUhvc3QsIEZpbGVUb01vZHVsZVN0cmF0ZWd5LCBJbXBvcnRSZXdyaXRlciwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXRTdHJhdGVneSwgUmVmZXJlbmNlRW1pdHRlciwgUmVsYXRpdmVQYXRoU3RyYXRlZ3l9IGZyb20gJy4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsRHJpdmVyfSBmcm9tICcuL2luY3JlbWVudGFsJztcbmltcG9ydCB7SW5kZXhlZENvbXBvbmVudCwgSW5kZXhpbmdDb250ZXh0fSBmcm9tICcuL2luZGV4ZXInO1xuaW1wb3J0IHtnZW5lcmF0ZUFuYWx5c2lzfSBmcm9tICcuL2luZGV4ZXIvc3JjL3RyYW5zZm9ybSc7XG5pbXBvcnQge0NvbXBvdW5kTWV0YWRhdGFSZWFkZXIsIENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgRHRzTWV0YWRhdGFSZWFkZXIsIExvY2FsTWV0YWRhdGFSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXJ9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzU2Nhbm5lcn0gZnJvbSAnLi9tb2R1bGV3aXRocHJvdmlkZXJzJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge05PT1BfUEVSRl9SRUNPUkRFUiwgUGVyZlJlY29yZGVyLCBQZXJmVHJhY2tlcn0gZnJvbSAnLi9wZXJmJztcbmltcG9ydCB7VHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtIb3N0UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vcmVzb3VyY2VfbG9hZGVyJztcbmltcG9ydCB7TmdNb2R1bGVSb3V0ZUFuYWx5emVyLCBlbnRyeVBvaW50S2V5Rm9yfSBmcm9tICcuL3JvdXRpbmcnO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgQ29tcG91bmRDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4vc2NvcGUnO1xuaW1wb3J0IHtGYWN0b3J5R2VuZXJhdG9yLCBGYWN0b3J5VHJhY2tlciwgR2VuZXJhdGVkU2hpbXNIb3N0V3JhcHBlciwgU2hpbUdlbmVyYXRvciwgU3VtbWFyeUdlbmVyYXRvciwgVHlwZUNoZWNrU2hpbUdlbmVyYXRvciwgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybX0gZnJvbSAnLi9zaGltcyc7XG5pbXBvcnQge2l2eVN3aXRjaFRyYW5zZm9ybX0gZnJvbSAnLi9zd2l0Y2gnO1xuaW1wb3J0IHtEZWNvcmF0b3JIYW5kbGVyLCBEdHNUcmFuc2Zvcm1SZWdpc3RyeSwgVHJhaXRDb21waWxlciwgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5LCBpdnlUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL3RyYW5zZm9ybSc7XG5pbXBvcnQge2FsaWFzVHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi90cmFuc2Zvcm0vc3JjL2FsaWFzJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dCwgVHlwZUNoZWNraW5nQ29uZmlnLCB0eXBlQ2hlY2tGaWxlUGF0aH0gZnJvbSAnLi90eXBlY2hlY2snO1xuaW1wb3J0IHtub3JtYWxpemVTZXBhcmF0b3JzfSBmcm9tICcuL3V0aWwvc3JjL3BhdGgnO1xuaW1wb3J0IHtnZXRSb290RGlycywgZ2V0U291cmNlRmlsZU9yTnVsbCwgaXNEdHNQYXRoLCByZXNvbHZlTW9kdWxlTmFtZX0gZnJvbSAnLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuZXhwb3J0IGNsYXNzIE5ndHNjUHJvZ3JhbSBpbXBsZW1lbnRzIGFwaS5Qcm9ncmFtIHtcbiAgcHJpdmF0ZSB0c1Byb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgcmV1c2VUc1Byb2dyYW06IHRzLlByb2dyYW07XG4gIHByaXZhdGUgcmVzb3VyY2VNYW5hZ2VyOiBIb3N0UmVzb3VyY2VMb2FkZXI7XG4gIHByaXZhdGUgY29tcGlsYXRpb246IFRyYWl0Q29tcGlsZXJ8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9jb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGV8bnVsbHx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2ltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX3JlZmxlY3RvcjogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0fHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfaXNDb3JlOiBib29sZWFufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXTtcbiAgcHJpdmF0ZSBjbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGVudHJ5UG9pbnQ6IHRzLlNvdXJjZUZpbGV8bnVsbDtcbiAgcHJpdmF0ZSBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZmxhdEluZGV4R2VuZXJhdG9yOiBGbGF0SW5kZXhHZW5lcmF0b3J8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyfG51bGwgPSBudWxsO1xuICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeXxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNvbnN0cnVjdGlvbkRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXI7XG4gIHByaXZhdGUgY3ljbGVBbmFseXplcjogQ3ljbGVBbmFseXplcjtcbiAgcHJpdmF0ZSBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcnxudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGFsaWFzaW5nSG9zdDogQWxpYXNpbmdIb3N0fG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXJ8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZmlsZVRvTW9kdWxlSG9zdDogRmlsZVRvTW9kdWxlSG9zdHxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0VHJhY2tlcjogRGVmYXVsdEltcG9ydFRyYWNrZXI7XG4gIHByaXZhdGUgcGVyZlJlY29yZGVyOiBQZXJmUmVjb3JkZXIgPSBOT09QX1BFUkZfUkVDT1JERVI7XG4gIHByaXZhdGUgcGVyZlRyYWNrZXI6IFBlcmZUcmFja2VyfG51bGwgPSBudWxsO1xuICBwcml2YXRlIGluY3JlbWVudGFsRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlcjtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tGaWxlUGF0aDogQWJzb2x1dGVGc1BhdGg7XG4gIHByaXZhdGUgZmFjdG9yeVRyYWNrZXI6IEZhY3RvcnlUcmFja2VyfG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8c3RyaW5nPnxudWxsO1xuICBwcml2YXRlIGR0c1RyYW5zZm9ybXM6IER0c1RyYW5zZm9ybVJlZ2lzdHJ5fG51bGwgPSBudWxsO1xuICBwcml2YXRlIG13cFNjYW5uZXI6IE1vZHVsZVdpdGhQcm92aWRlcnNTY2FubmVyfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcm9vdE5hbWVzOiBSZWFkb25seUFycmF5PHN0cmluZz4sIHByaXZhdGUgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgaG9zdDogYXBpLkNvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IE5ndHNjUHJvZ3JhbSkge1xuICAgIGlmICghb3B0aW9ucy5kaXNhYmxlVHlwZVNjcmlwdFZlcnNpb25DaGVjaykge1xuICAgICAgdmVyaWZ5U3VwcG9ydGVkVHlwZVNjcmlwdFZlcnNpb24oKTtcbiAgICB9XG5cbiAgICBpZiAoc2hvdWxkRW5hYmxlUGVyZlRyYWNpbmcob3B0aW9ucykpIHtcbiAgICAgIHRoaXMucGVyZlRyYWNrZXIgPSBQZXJmVHJhY2tlci56ZXJvZWRUb05vdygpO1xuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIgPSB0aGlzLnBlcmZUcmFja2VyO1xuICAgIH1cblxuICAgIHRoaXMubW9kaWZpZWRSZXNvdXJjZUZpbGVzID1cbiAgICAgICAgdGhpcy5ob3N0LmdldE1vZGlmaWVkUmVzb3VyY2VGaWxlcyAmJiB0aGlzLmhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzKCkgfHwgbnVsbDtcbiAgICB0aGlzLnJvb3REaXJzID0gZ2V0Um9vdERpcnMoaG9zdCwgb3B0aW9ucyk7XG4gICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkID0gISFvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyID0gbmV3IEhvc3RSZXNvdXJjZUxvYWRlcihob3N0LCBvcHRpb25zKTtcbiAgICAvLyBUT0RPKGFseGh1Yik6IHJlbW92ZSB0aGUgZmFsbGJhY2sgdG8gYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyBhZnRlciB2ZXJpZnlpbmcgdGhhdCB0aGUgcmVzdCBvZlxuICAgIC8vIG91ciBidWlsZCB0b29saW5nIGlzIG5vIGxvbmdlciByZWx5aW5nIG9uIGl0LlxuICAgIGNvbnN0IGFsbG93RW1wdHlDb2RlZ2VuRmlsZXMgPSBvcHRpb25zLmFsbG93RW1wdHlDb2RlZ2VuRmlsZXMgfHwgZmFsc2U7XG4gICAgY29uc3Qgc2hvdWxkR2VuZXJhdGVGYWN0b3J5U2hpbXMgPSBvcHRpb25zLmdlbmVyYXRlTmdGYWN0b3J5U2hpbXMgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVOZ0ZhY3RvcnlTaGltcyA6XG4gICAgICAgIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXM7XG4gICAgY29uc3Qgc2hvdWxkR2VuZXJhdGVTdW1tYXJ5U2hpbXMgPSBvcHRpb25zLmdlbmVyYXRlTmdTdW1tYXJ5U2hpbXMgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVOZ1N1bW1hcnlTaGltcyA6XG4gICAgICAgIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXM7XG4gICAgY29uc3Qgbm9ybWFsaXplZFJvb3ROYW1lcyA9IHJvb3ROYW1lcy5tYXAobiA9PiBhYnNvbHV0ZUZyb20obikpO1xuICAgIGlmIChob3N0LmZpbGVOYW1lVG9Nb2R1bGVOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuZmlsZVRvTW9kdWxlSG9zdCA9IGhvc3QgYXMgRmlsZVRvTW9kdWxlSG9zdDtcbiAgICB9XG4gICAgbGV0IHJvb3RGaWxlcyA9IFsuLi5yb290TmFtZXNdO1xuXG4gICAgY29uc3QgZ2VuZXJhdG9yczogU2hpbUdlbmVyYXRvcltdID0gW107XG4gICAgbGV0IHN1bW1hcnlHZW5lcmF0b3I6IFN1bW1hcnlHZW5lcmF0b3J8bnVsbCA9IG51bGw7XG4gICAgaWYgKHNob3VsZEdlbmVyYXRlU3VtbWFyeVNoaW1zKSB7XG4gICAgICAvLyBTdW1tYXJ5IGdlbmVyYXRpb24uXG4gICAgICBzdW1tYXJ5R2VuZXJhdG9yID0gU3VtbWFyeUdlbmVyYXRvci5mb3JSb290RmlsZXMobm9ybWFsaXplZFJvb3ROYW1lcyk7XG4gICAgICBnZW5lcmF0b3JzLnB1c2goc3VtbWFyeUdlbmVyYXRvcik7XG4gICAgfVxuXG4gICAgaWYgKHNob3VsZEdlbmVyYXRlRmFjdG9yeVNoaW1zKSB7XG4gICAgICAvLyBGYWN0b3J5IGdlbmVyYXRpb24uXG4gICAgICBjb25zdCBmYWN0b3J5R2VuZXJhdG9yID0gRmFjdG9yeUdlbmVyYXRvci5mb3JSb290RmlsZXMobm9ybWFsaXplZFJvb3ROYW1lcyk7XG4gICAgICBjb25zdCBmYWN0b3J5RmlsZU1hcCA9IGZhY3RvcnlHZW5lcmF0b3IuZmFjdG9yeUZpbGVNYXA7XG5cbiAgICAgIGNvbnN0IGZhY3RvcnlGaWxlTmFtZXMgPSBBcnJheS5mcm9tKGZhY3RvcnlGaWxlTWFwLmtleXMoKSk7XG4gICAgICByb290RmlsZXMucHVzaCguLi5mYWN0b3J5RmlsZU5hbWVzKTtcbiAgICAgIGdlbmVyYXRvcnMucHVzaChmYWN0b3J5R2VuZXJhdG9yKTtcblxuICAgICAgdGhpcy5mYWN0b3J5VHJhY2tlciA9IG5ldyBGYWN0b3J5VHJhY2tlcihmYWN0b3J5R2VuZXJhdG9yKTtcbiAgICB9XG5cbiAgICAvLyBEb25lIHNlcGFyYXRlbHkgdG8gcHJlc2VydmUgdGhlIG9yZGVyIG9mIGZhY3RvcnkgZmlsZXMgYmVmb3JlIHN1bW1hcnkgZmlsZXMgaW4gcm9vdEZpbGVzLlxuICAgIC8vIFRPRE8oYWx4aHViKTogdmFsaWRhdGUgdGhhdCB0aGlzIGlzIG5lY2Vzc2FyeS5cbiAgICBpZiAoc2hvdWxkR2VuZXJhdGVTdW1tYXJ5U2hpbXMpIHtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLnN1bW1hcnlHZW5lcmF0b3IgIS5nZXRTdW1tYXJ5RmlsZU5hbWVzKCkpO1xuICAgIH1cblxuICAgIHRoaXMudHlwZUNoZWNrRmlsZVBhdGggPSB0eXBlQ2hlY2tGaWxlUGF0aCh0aGlzLnJvb3REaXJzKTtcbiAgICBnZW5lcmF0b3JzLnB1c2gobmV3IFR5cGVDaGVja1NoaW1HZW5lcmF0b3IodGhpcy50eXBlQ2hlY2tGaWxlUGF0aCkpO1xuICAgIHJvb3RGaWxlcy5wdXNoKHRoaXMudHlwZUNoZWNrRmlsZVBhdGgpO1xuXG4gICAgbGV0IGVudHJ5UG9pbnQ6IEFic29sdXRlRnNQYXRofG51bGwgPSBudWxsO1xuICAgIGlmIChvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlICE9IG51bGwgJiYgb3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSAhPT0gJycpIHtcbiAgICAgIGVudHJ5UG9pbnQgPSBmaW5kRmxhdEluZGV4RW50cnlQb2ludChub3JtYWxpemVkUm9vdE5hbWVzKTtcbiAgICAgIGlmIChlbnRyeVBvaW50ID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgZXJyb3IgbWVzc2FnZSB0YWxrcyBzcGVjaWZpY2FsbHkgYWJvdXQgaGF2aW5nIGEgc2luZ2xlIC50cyBmaWxlIGluIFwiZmlsZXNcIi4gSG93ZXZlclxuICAgICAgICAvLyB0aGUgYWN0dWFsIGxvZ2ljIGlzIGEgYml0IG1vcmUgcGVybWlzc2l2ZS4gSWYgYSBzaW5nbGUgZmlsZSBleGlzdHMsIHRoYXQgd2lsbCBiZSB0YWtlbixcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRoZSBoaWdoZXN0IGxldmVsIChzaG9ydGVzdCBwYXRoKSBcImluZGV4LnRzXCIgZmlsZSB3aWxsIGJlIHVzZWQgYXMgdGhlIGZsYXRcbiAgICAgICAgLy8gbW9kdWxlIGVudHJ5IHBvaW50IGluc3RlYWQuIElmIG5laXRoZXIgb2YgdGhlc2UgY29uZGl0aW9ucyBhcHBseSwgdGhlIGVycm9yIGJlbG93IGlzXG4gICAgICAgIC8vIGdpdmVuLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUaGUgdXNlciBpcyBub3QgaW5mb3JtZWQgYWJvdXQgdGhlIFwiaW5kZXgudHNcIiBvcHRpb24gYXMgdGhpcyBiZWhhdmlvciBpcyBkZXByZWNhdGVkIC1cbiAgICAgICAgLy8gYW4gZXhwbGljaXQgZW50cnlwb2ludCBzaG91bGQgYWx3YXlzIGJlIHNwZWNpZmllZC5cbiAgICAgICAgdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgIGNvZGU6IG5nRXJyb3JDb2RlKEVycm9yQ29kZS5DT05GSUdfRkxBVF9NT0RVTEVfTk9fSU5ERVgpLFxuICAgICAgICAgIGZpbGU6IHVuZGVmaW5lZCxcbiAgICAgICAgICBzdGFydDogdW5kZWZpbmVkLFxuICAgICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgICAgIG1lc3NhZ2VUZXh0OlxuICAgICAgICAgICAgICAnQW5ndWxhciBjb21waWxlciBvcHRpb24gXCJmbGF0TW9kdWxlT3V0RmlsZVwiIHJlcXVpcmVzIG9uZSBhbmQgb25seSBvbmUgLnRzIGZpbGUgaW4gdGhlIFwiZmlsZXNcIiBmaWVsZC4nLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGZsYXRNb2R1bGVJZCA9IG9wdGlvbnMuZmxhdE1vZHVsZUlkIHx8IG51bGw7XG4gICAgICAgIGNvbnN0IGZsYXRNb2R1bGVPdXRGaWxlID0gbm9ybWFsaXplU2VwYXJhdG9ycyhvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKTtcbiAgICAgICAgdGhpcy5mbGF0SW5kZXhHZW5lcmF0b3IgPVxuICAgICAgICAgICAgbmV3IEZsYXRJbmRleEdlbmVyYXRvcihlbnRyeVBvaW50LCBmbGF0TW9kdWxlT3V0RmlsZSwgZmxhdE1vZHVsZUlkKTtcbiAgICAgICAgZ2VuZXJhdG9ycy5wdXNoKHRoaXMuZmxhdEluZGV4R2VuZXJhdG9yKTtcbiAgICAgICAgcm9vdEZpbGVzLnB1c2godGhpcy5mbGF0SW5kZXhHZW5lcmF0b3IuZmxhdEluZGV4UGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGdlbmVyYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gRklYTUU6IFJlbW92ZSB0aGUgYW55IGNhc3Qgb25jZSBnb29nbGUzIGlzIGZ1bGx5IG9uIFRTMy42LlxuICAgICAgdGhpcy5ob3N0ID0gKG5ldyBHZW5lcmF0ZWRTaGltc0hvc3RXcmFwcGVyKGhvc3QsIGdlbmVyYXRvcnMpIGFzIGFueSk7XG4gICAgfVxuXG4gICAgdGhpcy50c1Byb2dyYW0gPVxuICAgICAgICB0cy5jcmVhdGVQcm9ncmFtKHJvb3RGaWxlcywgb3B0aW9ucywgdGhpcy5ob3N0LCBvbGRQcm9ncmFtICYmIG9sZFByb2dyYW0ucmV1c2VUc1Byb2dyYW0pO1xuICAgIHRoaXMucmV1c2VUc1Byb2dyYW0gPSB0aGlzLnRzUHJvZ3JhbTtcblxuICAgIHRoaXMuZW50cnlQb2ludCA9IGVudHJ5UG9pbnQgIT09IG51bGwgPyBnZXRTb3VyY2VGaWxlT3JOdWxsKHRoaXMudHNQcm9ncmFtLCBlbnRyeVBvaW50KSA6IG51bGw7XG4gICAgdGhpcy5tb2R1bGVSZXNvbHZlciA9IG5ldyBNb2R1bGVSZXNvbHZlcih0aGlzLnRzUHJvZ3JhbSwgb3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcihuZXcgSW1wb3J0R3JhcGgodGhpcy5tb2R1bGVSZXNvbHZlcikpO1xuICAgIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIgPSBuZXcgRGVmYXVsdEltcG9ydFRyYWNrZXIoKTtcbiAgICBpZiAob2xkUHJvZ3JhbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyID0gSW5jcmVtZW50YWxEcml2ZXIuZnJlc2godGhpcy50c1Byb2dyYW0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyID0gSW5jcmVtZW50YWxEcml2ZXIucmVjb25jaWxlKFxuICAgICAgICAgIG9sZFByb2dyYW0ucmV1c2VUc1Byb2dyYW0sIG9sZFByb2dyYW0uaW5jcmVtZW50YWxEcml2ZXIsIHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgIHRoaXMubW9kaWZpZWRSZXNvdXJjZUZpbGVzKTtcbiAgICB9XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7IHJldHVybiB0aGlzLnRzUHJvZ3JhbTsgfVxuXG4gIGdldFRzT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0T3B0aW9uc0RpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3MoXG4gICAgICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZXx1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PGFwaS5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBmaWxlTmFtZT86IHN0cmluZ3x1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gWy4uLmNvbXBpbGF0aW9uLmRpYWdub3N0aWNzLCAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKV07XG4gICAgaWYgKHRoaXMuZW50cnlQb2ludCAhPT0gbnVsbCAmJiB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgICAgICAgdGhpcy5lbnRyeVBvaW50LCB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoKSk7XG4gICAgfVxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGFzeW5jIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgIH1cbiAgICBjb25zdCBhbmFseXplU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplJyk7XG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhbmFseXplRmlsZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZUZpbGUnLCBzZik7XG4gICAgICBsZXQgYW5hbHlzaXNQcm9taXNlID0gdGhpcy5jb21waWxhdGlvbiAhLmFuYWx5emVBc3luYyhzZik7XG4gICAgICB0aGlzLnNjYW5Gb3JNd3Aoc2YpO1xuICAgICAgaWYgKGFuYWx5c2lzUHJvbWlzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5wZXJmUmVjb3JkZXIuZW5hYmxlZCkge1xuICAgICAgICBhbmFseXNpc1Byb21pc2UgPSBhbmFseXNpc1Byb21pc2UudGhlbigoKSA9PiB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVGaWxlU3BhbikpO1xuICAgICAgfVxuICAgICAgaWYgKGFuYWx5c2lzUHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHByb21pc2VzLnB1c2goYW5hbHlzaXNQcm9taXNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVTcGFuKTtcblxuICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24pO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZ3x1bmRlZmluZWQpOiBhcGkuTGF6eVJvdXRlW10ge1xuICAgIGlmIChlbnRyeVJvdXRlKSB7XG4gICAgICAvLyBOb3RlOlxuICAgICAgLy8gVGhpcyByZXNvbHV0aW9uIHN0ZXAgaXMgaGVyZSB0byBtYXRjaCB0aGUgaW1wbGVtZW50YXRpb24gb2YgdGhlIG9sZCBgQW90Q29tcGlsZXJIb3N0YCAoc2VlXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvNTA3MzJlMTU2L3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMjTDE3NS1MMTg4KS5cbiAgICAgIC8vXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCB3aWxsIGFsd2F5cyBjYWxsIHRoaXMgQVBJIHdpdGggYW4gYWJzb2x1dGUgcGF0aCwgc28gdGhlIHJlc29sdXRpb24gc3RlcCBpc1xuICAgICAgLy8gbm90IG5lY2Vzc2FyeSwgYnV0IGtlZXBpbmcgaXQgYmFja3dhcmRzIGNvbXBhdGlibGUgaW4gY2FzZSBzb21lb25lIGVsc2UgaXMgdXNpbmcgdGhlIEFQSS5cblxuICAgICAgLy8gUmVsYXRpdmUgZW50cnkgcGF0aHMgYXJlIGRpc2FsbG93ZWQuXG4gICAgICBpZiAoZW50cnlSb3V0ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEZhaWxlZCB0byBsaXN0IGxhenkgcm91dGVzOiBSZXNvbHV0aW9uIG9mIHJlbGF0aXZlIHBhdGhzICgke2VudHJ5Um91dGV9KSBpcyBub3Qgc3VwcG9ydGVkLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tcmVsYXRpdmUgZW50cnkgcGF0aHMgZmFsbCBpbnRvIG9uZSBvZiB0aGUgZm9sbG93aW5nIGNhdGVnb3JpZXM6XG4gICAgICAvLyAtIEFic29sdXRlIHN5c3RlbSBwYXRocyAoZS5nLiBgL2Zvby9iYXIvbXktcHJvamVjdC9teS1tb2R1bGVgKSwgd2hpY2ggYXJlIHVuYWZmZWN0ZWQgYnkgdGhlXG4gICAgICAvLyAgIGxvZ2ljIGJlbG93LlxuICAgICAgLy8gLSBQYXRocyB0byBlbnRlcm5hbCBtb2R1bGVzIChlLmcuIGBzb21lLWxpYmApLlxuICAgICAgLy8gLSBQYXRocyBtYXBwZWQgdG8gZGlyZWN0b3JpZXMgaW4gYHRzY29uZmlnLmpzb25gIChlLmcuIGBzaGFyZWQvbXktbW9kdWxlYCkuXG4gICAgICAvLyAgIChTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbCNwYXRoLW1hcHBpbmcuKVxuICAgICAgLy9cbiAgICAgIC8vIEluIGFsbCBjYXNlcyBhYm92ZSwgdGhlIGBjb250YWluaW5nRmlsZWAgYXJndW1lbnQgaXMgaWdub3JlZCwgc28gd2UgY2FuIGp1c3QgdGFrZSB0aGUgZmlyc3RcbiAgICAgIC8vIG9mIHRoZSByb290IGZpbGVzLlxuICAgICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKClbMF07XG4gICAgICBjb25zdCBbZW50cnlQYXRoLCBtb2R1bGVOYW1lXSA9IGVudHJ5Um91dGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID0gcmVzb2x2ZU1vZHVsZU5hbWUoZW50cnlQYXRoLCBjb250YWluaW5nRmlsZSwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpO1xuXG4gICAgICBpZiAocmVzb2x2ZWRNb2R1bGUpIHtcbiAgICAgICAgZW50cnlSb3V0ZSA9IGVudHJ5UG9pbnRLZXlGb3IocmVzb2x2ZWRNb2R1bGUucmVzb2x2ZWRGaWxlTmFtZSwgbW9kdWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIHJldHVybiB0aGlzLnJvdXRlQW5hbHl6ZXIgIS5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIGdldExpYnJhcnlTdW1tYXJpZXMoKTogTWFwPHN0cmluZywgYXBpLkxpYnJhcnlTdW1tYXJ5PiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk6IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIHByaXZhdGUgc2NhbkZvck13cChzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMubXdwU2Nhbm5lciAhLnNjYW4oc2YsIHtcbiAgICAgIGFkZFR5cGVSZXBsYWNlbWVudDogKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCB0eXBlOiBUeXBlKTogdm9pZCA9PiB7XG4gICAgICAgIC8vIE9ubHkgb2J0YWluIHRoZSByZXR1cm4gdHlwZSB0cmFuc2Zvcm0gZm9yIHRoZSBzb3VyY2UgZmlsZSBvbmNlIHRoZXJlJ3MgYSB0eXBlIHRvIHJlcGxhY2UsXG4gICAgICAgIC8vIHNvIHRoYXQgbm8gdHJhbnNmb3JtIGlzIGFsbG9jYXRlZCB3aGVuIHRoZXJlJ3Mgbm90aGluZyB0byBkby5cbiAgICAgICAgdGhpcy5kdHNUcmFuc2Zvcm1zICEuZ2V0UmV0dXJuVHlwZVRyYW5zZm9ybShzZikuYWRkVHlwZVJlcGxhY2VtZW50KG5vZGUsIHR5cGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbmFseXplZCgpOiBUcmFpdENvbXBpbGVyIHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBhbmFseXplU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplJyk7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcbiAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhbmFseXplRmlsZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZUZpbGUnLCBzZik7XG4gICAgICAgIHRoaXMuY29tcGlsYXRpb24gIS5hbmFseXplU3luYyhzZik7XG4gICAgICAgIHRoaXMuc2NhbkZvck13cChzZik7XG4gICAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZVNwYW4pO1xuXG4gICAgICB0aGlzLnJlc29sdmVDb21waWxhdGlvbih0aGlzLmNvbXBpbGF0aW9uKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsYXRpb247XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVDb21waWxhdGlvbihjb21waWxhdGlvbjogVHJhaXRDb21waWxlcik6IHZvaWQge1xuICAgIGNvbXBpbGF0aW9uLnJlc29sdmUoKTtcblxuICAgIHRoaXMucmVjb3JkTmdNb2R1bGVTY29wZURlcGVuZGVuY2llcygpO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgYW5hbHlzaXMgaXMgY29tcGxldGUgYW5kIHRoZSBjb21waWxlciBjYW4gbm93IGNhbGN1bGF0ZSB3aGljaCBmaWxlcyBuZWVkIHRvXG4gICAgLy8gYmUgZW1pdHRlZCwgc28gZG8gdGhhdC5cbiAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyLnJlY29yZFN1Y2Nlc3NmdWxBbmFseXNpcyhjb21waWxhdGlvbik7XG4gIH1cblxuICBlbWl0KG9wdHM/OiB7XG4gICAgZW1pdEZsYWdzPzogYXBpLkVtaXRGbGFncyxcbiAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuLFxuICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrPzogYXBpLlRzRW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IGFwaS5Uc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFja1xuICB9KTogdHMuRW1pdFJlc3VsdCB7XG4gICAgY29uc3QgZW1pdENhbGxiYWNrID0gb3B0cyAmJiBvcHRzLmVtaXRDYWxsYmFjayB8fCBkZWZhdWx0RW1pdENhbGxiYWNrO1xuXG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICBjb25zdCB3cml0ZUZpbGU6IHRzLldyaXRlRmlsZUNhbGxiYWNrID1cbiAgICAgICAgKGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgICAgb25FcnJvcjogKChtZXNzYWdlOiBzdHJpbmcpID0+IHZvaWQpIHwgdW5kZWZpbmVkLFxuICAgICAgICAgc291cmNlRmlsZXM6IFJlYWRvbmx5QXJyYXk8dHMuU291cmNlRmlsZT58IHVuZGVmaW5lZCkgPT4ge1xuICAgICAgICAgIGlmIChzb3VyY2VGaWxlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBSZWNvcmQgc3VjY2Vzc2Z1bCB3cml0ZXMgZm9yIGFueSBgdHMuU291cmNlRmlsZWAgKHRoYXQncyBub3QgYSBkZWNsYXJhdGlvbiBmaWxlKVxuICAgICAgICAgICAgLy8gdGhhdCdzIGFuIGlucHV0IHRvIHRoaXMgd3JpdGUuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHdyaXR0ZW5TZiBvZiBzb3VyY2VGaWxlcykge1xuICAgICAgICAgICAgICBpZiAod3JpdHRlblNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyLnJlY29yZFN1Y2Nlc3NmdWxFbWl0KHdyaXR0ZW5TZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgJiYgZmlsZU5hbWUuZW5kc1dpdGgoJy5qcycpKSB7XG4gICAgICAgICAgICBkYXRhID0gbm9jb2xsYXBzZUhhY2soZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuaG9zdC53cml0ZUZpbGUoZmlsZU5hbWUsIGRhdGEsIHdyaXRlQnl0ZU9yZGVyTWFyaywgb25FcnJvciwgc291cmNlRmlsZXMpO1xuICAgICAgICB9O1xuXG4gICAgY29uc3QgY3VzdG9tVHJhbnNmb3JtcyA9IG9wdHMgJiYgb3B0cy5jdXN0b21UcmFuc2Zvcm1lcnM7XG5cbiAgICBjb25zdCBiZWZvcmVUcmFuc2Zvcm1zID0gW1xuICAgICAgaXZ5VHJhbnNmb3JtRmFjdG9yeShcbiAgICAgICAgICBjb21waWxhdGlvbiwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaW1wb3J0UmV3cml0ZXIsIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCksXG4gICAgICBhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24uZXhwb3J0U3RhdGVtZW50cykgYXMgdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+LFxuICAgICAgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlci5pbXBvcnRQcmVzZXJ2aW5nVHJhbnNmb3JtZXIoKSxcbiAgICBdO1xuXG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuQnVuZGxlfHRzLlNvdXJjZUZpbGU+W10gPSBbXTtcbiAgICBpZiAodGhpcy5kdHNUcmFuc2Zvcm1zICE9PSBudWxsKSB7XG4gICAgICBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMucHVzaChcbiAgICAgICAgICBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnkodGhpcy5kdHNUcmFuc2Zvcm1zLCB0aGlzLmltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuXG4gICAgLy8gT25seSBhZGQgYWxpYXNpbmcgcmUtZXhwb3J0cyB0byB0aGUgLmQudHMgb3V0cHV0IGlmIHRoZSBgQWxpYXNpbmdIb3N0YCByZXF1ZXN0cyBpdC5cbiAgICBpZiAodGhpcy5hbGlhc2luZ0hvc3QgIT09IG51bGwgJiYgdGhpcy5hbGlhc2luZ0hvc3QuYWxpYXNFeHBvcnRzSW5EdHMpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zVHJhbnNmb3Jtcy5wdXNoKGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi5leHBvcnRTdGF0ZW1lbnRzKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZmFjdG9yeVRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaChcbiAgICAgICAgICBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtKHRoaXMuZmFjdG9yeVRyYWNrZXIuc291cmNlSW5mbywgdGhpcy5pbXBvcnRSZXdyaXRlcikpO1xuICAgIH1cbiAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goaXZ5U3dpdGNoVHJhbnNmb3JtKTtcbiAgICBpZiAoY3VzdG9tVHJhbnNmb3JtcyAmJiBjdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzKSB7XG4gICAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goLi4uY3VzdG9tVHJhbnNmb3Jtcy5iZWZvcmVUcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZW1pdFNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnZW1pdCcpO1xuICAgIGNvbnN0IGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10gPSBbXTtcblxuICAgIGNvbnN0IHR5cGVDaGVja0ZpbGUgPSBnZXRTb3VyY2VGaWxlT3JOdWxsKHRoaXMudHNQcm9ncmFtLCB0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKTtcblxuICAgIGZvciAoY29uc3QgdGFyZ2V0U291cmNlRmlsZSBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAodGFyZ2V0U291cmNlRmlsZS5pc0RlY2xhcmF0aW9uRmlsZSB8fCB0YXJnZXRTb3VyY2VGaWxlID09PSB0eXBlQ2hlY2tGaWxlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5pbmNyZW1lbnRhbERyaXZlci5zYWZlVG9Ta2lwRW1pdCh0YXJnZXRTb3VyY2VGaWxlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmlsZUVtaXRTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2VtaXRGaWxlJywgdGFyZ2V0U291cmNlRmlsZSk7XG4gICAgICBlbWl0UmVzdWx0cy5wdXNoKGVtaXRDYWxsYmFjayh7XG4gICAgICAgIHRhcmdldFNvdXJjZUZpbGUsXG4gICAgICAgIHByb2dyYW06IHRoaXMudHNQcm9ncmFtLFxuICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgICAgZW1pdE9ubHlEdHNGaWxlczogZmFsc2UsIHdyaXRlRmlsZSxcbiAgICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzOiB7XG4gICAgICAgICAgYmVmb3JlOiBiZWZvcmVUcmFuc2Zvcm1zLFxuICAgICAgICAgIGFmdGVyOiBjdXN0b21UcmFuc2Zvcm1zICYmIGN1c3RvbVRyYW5zZm9ybXMuYWZ0ZXJUcyxcbiAgICAgICAgICBhZnRlckRlY2xhcmF0aW9uczogYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zLFxuICAgICAgICB9LFxuICAgICAgfSkpO1xuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChmaWxlRW1pdFNwYW4pO1xuICAgIH1cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGVtaXRTcGFuKTtcblxuICAgIGlmICh0aGlzLnBlcmZUcmFja2VyICE9PSBudWxsICYmIHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMucGVyZlRyYWNrZXIuc2VyaWFsaXplVG9GaWxlKHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlLCB0aGlzLmhvc3QpO1xuICAgIH1cblxuICAgIC8vIFJ1biB0aGUgZW1pdCwgaW5jbHVkaW5nIGEgY3VzdG9tIHRyYW5zZm9ybWVyIHRoYXQgd2lsbCBkb3dubGV2ZWwgdGhlIEl2eSBkZWNvcmF0b3JzIGluIGNvZGUuXG4gICAgcmV0dXJuICgob3B0cyAmJiBvcHRzLm1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaykgfHwgbWVyZ2VFbWl0UmVzdWx0cykoZW1pdFJlc3VsdHMpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIC8vIFNraXAgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpZiBpdCdzIGRpc2FibGVkLlxuICAgIGlmICh0aGlzLm9wdGlvbnMuaXZ5VGVtcGxhdGVUeXBlQ2hlY2sgPT09IGZhbHNlICYmXG4gICAgICAgIHRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2sgIT09IHRydWUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIC8vIFJ1biB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nLlxuXG4gICAgLy8gRmlyc3Qgc2VsZWN0IGEgdHlwZS1jaGVja2luZyBjb25maWd1cmF0aW9uLCBiYXNlZCBvbiB3aGV0aGVyIGZ1bGwgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBpc1xuICAgIC8vIHJlcXVlc3RlZC5cbiAgICBsZXQgdHlwZUNoZWNraW5nQ29uZmlnOiBUeXBlQ2hlY2tpbmdDb25maWc7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIGNvbnN0IHN0cmljdFRlbXBsYXRlcyA9ICEhdGhpcy5vcHRpb25zLnN0cmljdFRlbXBsYXRlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogdHJ1ZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQXR0cmlidXRlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBFdmVuIGluIGZ1bGwgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlLCBET00gYmluZGluZyBjaGVja3MgYXJlIG5vdCBxdWl0ZSByZWFkeSB5ZXQuXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBDaGVja2luZyBvZiBET00gZXZlbnRzIGN1cnJlbnRseSBoYXMgYW4gYWR2ZXJzZSBlZmZlY3Qgb24gZGV2ZWxvcGVyIGV4cGVyaWVuY2UsXG4gICAgICAgIC8vIGUuZy4gZm9yIGA8aW5wdXQgKGJsdXIpPVwidXBkYXRlKCRldmVudC50YXJnZXQudmFsdWUpXCI+YCBlbmFibGluZyB0aGlzIGNoZWNrIHJlc3VsdHMgaW46XG4gICAgICAgIC8vIC0gZXJyb3IgVFMyNTMxOiBPYmplY3QgaXMgcG9zc2libHkgJ251bGwnLlxuICAgICAgICAvLyAtIGVycm9yIFRTMjMzOTogUHJvcGVydHkgJ3ZhbHVlJyBkb2VzIG5vdCBleGlzdCBvbiB0eXBlICdFdmVudFRhcmdldCcuXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICAvLyBOb24tRE9NIHJlZmVyZW5jZXMgaGF2ZSB0aGUgY29ycmVjdCB0eXBlIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzOiB0cnVlLFxuICAgICAgICAvLyBQaXBlcyBhcmUgY2hlY2tlZCBpbiBWaWV3IEVuZ2luZSBzbyB0aGVyZSBpcyBubyBzdHJpY3RuZXNzIGZsYWcuXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IHRydWUsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IGZhbHNlLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkF0dHJpYnV0ZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbUJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tRXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZOb25Eb21SZWZlcmVuY2VzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogZmFsc2UsXG4gICAgICAgIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBBcHBseSBleHBsaWNpdGx5IGNvbmZpZ3VyZWQgc3RyaWN0bmVzcyBmbGFncyBvbiB0b3Agb2YgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgIC8vIGJhc2VkIG9uIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdE51bGxJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3ROdWxsSW5wdXRCaW5kaW5ncyA9IHRoaXMub3B0aW9ucy5zdHJpY3ROdWxsSW5wdXRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZk91dHB1dEV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzO1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0RG9tRXZlbnRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZEb21FdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0RG9tRXZlbnRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzID0gdGhpcy5vcHRpb25zLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0RG9tTG9jYWxSZWZUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzID0gdGhpcy5vcHRpb25zLnN0cmljdERvbUxvY2FsUmVmVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0QXR0cmlidXRlVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mQXR0cmlidXRlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RBdHRyaWJ1dGVUeXBlcztcbiAgICB9XG5cbiAgICAvLyBFeGVjdXRlIHRoZSB0eXBlQ2hlY2sgcGhhc2Ugb2YgZWFjaCBkZWNvcmF0b3IgaW4gdGhlIHByb2dyYW0uXG4gICAgY29uc3QgcHJlcFNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgndHlwZUNoZWNrUHJlcCcpO1xuICAgIGNvbnN0IGN0eCA9IG5ldyBUeXBlQ2hlY2tDb250ZXh0KHR5cGVDaGVja2luZ0NvbmZpZywgdGhpcy5yZWZFbWl0dGVyICEsIHRoaXMudHlwZUNoZWNrRmlsZVBhdGgpO1xuICAgIGNvbXBpbGF0aW9uLnR5cGVDaGVjayhjdHgpO1xuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AocHJlcFNwYW4pO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCB0eXBlQ2hlY2tTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ3R5cGVDaGVja0RpYWdub3N0aWNzJyk7XG4gICAgY29uc3Qge2RpYWdub3N0aWNzLCBwcm9ncmFtfSA9XG4gICAgICAgIGN0eC5jYWxjdWxhdGVUZW1wbGF0ZURpYWdub3N0aWNzKHRoaXMudHNQcm9ncmFtLCB0aGlzLmhvc3QsIHRoaXMub3B0aW9ucyk7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcCh0eXBlQ2hlY2tTcGFuKTtcbiAgICB0aGlzLnJldXNlVHNQcm9ncmFtID0gcHJvZ3JhbTtcblxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldEluZGV4ZWRDb21wb25lbnRzKCk6IE1hcDx0cy5EZWNsYXJhdGlvbiwgSW5kZXhlZENvbXBvbmVudD4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGNvbnRleHQgPSBuZXcgSW5kZXhpbmdDb250ZXh0KCk7XG4gICAgY29tcGlsYXRpb24uaW5kZXgoY29udGV4dCk7XG4gICAgcmV0dXJuIGdlbmVyYXRlQW5hbHlzaXMoY29udGV4dCk7XG4gIH1cblxuICBwcml2YXRlIG1ha2VDb21waWxhdGlvbigpOiBUcmFpdENvbXBpbGVyIHtcbiAgICBjb25zdCBjaGVja2VyID0gdGhpcy50c1Byb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKTtcblxuICAgIC8vIENvbnN0cnVjdCB0aGUgUmVmZXJlbmNlRW1pdHRlci5cbiAgICBpZiAodGhpcy5maWxlVG9Nb2R1bGVIb3N0ID09PSBudWxsIHx8ICF0aGlzLm9wdGlvbnMuX3VzZUhvc3RGb3JJbXBvcnRHZW5lcmF0aW9uKSB7XG4gICAgICBsZXQgbG9jYWxJbXBvcnRTdHJhdGVneTogUmVmZXJlbmNlRW1pdFN0cmF0ZWd5O1xuXG4gICAgICAvLyBUaGUgc3RyYXRlZ3kgdXNlZCBmb3IgbG9jYWwsIGluLXByb2plY3QgaW1wb3J0cyBkZXBlbmRzIG9uIHdoZXRoZXIgVFMgaGFzIGJlZW4gY29uZmlndXJlZFxuICAgICAgLy8gd2l0aCByb290RGlycy4gSWYgc28sIHRoZW4gbXVsdGlwbGUgZGlyZWN0b3JpZXMgbWF5IGJlIG1hcHBlZCBpbiB0aGUgc2FtZSBcIm1vZHVsZVxuICAgICAgLy8gbmFtZXNwYWNlXCIgYW5kIHRoZSBsb2dpYyBvZiBgTG9naWNhbFByb2plY3RTdHJhdGVneWAgaXMgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgY29ycmVjdFxuICAgICAgLy8gaW1wb3J0cyB3aGljaCBtYXkgY3Jvc3MgdGhlc2UgbXVsdGlwbGUgZGlyZWN0b3JpZXMuIE90aGVyd2lzZSwgcGxhaW4gcmVsYXRpdmUgaW1wb3J0cyBhcmVcbiAgICAgIC8vIHN1ZmZpY2llbnQuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnJvb3REaXIgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgICh0aGlzLm9wdGlvbnMucm9vdERpcnMgIT09IHVuZGVmaW5lZCAmJiB0aGlzLm9wdGlvbnMucm9vdERpcnMubGVuZ3RoID4gMCkpIHtcbiAgICAgICAgLy8gcm9vdERpcnMgbG9naWMgaXMgaW4gZWZmZWN0IC0gdXNlIHRoZSBgTG9naWNhbFByb2plY3RTdHJhdGVneWAgZm9yIGluLXByb2plY3QgcmVsYXRpdmVcbiAgICAgICAgLy8gaW1wb3J0cy5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSA9XG4gICAgICAgICAgICBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneSh0aGlzLnJlZmxlY3RvciwgbmV3IExvZ2ljYWxGaWxlU3lzdGVtKHRoaXMucm9vdERpcnMpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFBsYWluIHJlbGF0aXZlIGltcG9ydHMgYXJlIGFsbCB0aGF0J3MgbmVlZGVkLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID0gbmV3IFJlbGF0aXZlUGF0aFN0cmF0ZWd5KHRoaXMucmVmbGVjdG9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBkb2Vzbid0IGhhdmUgZmlsZU5hbWVUb01vZHVsZU5hbWUsIHNvIGJ1aWxkIGFuIE5QTS1jZW50cmljIHJlZmVyZW5jZVxuICAgICAgLy8gcmVzb2x1dGlvbiBzdHJhdGVneS5cbiAgICAgIHRoaXMucmVmRW1pdHRlciA9IG5ldyBSZWZlcmVuY2VFbWl0dGVyKFtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byB1c2UgbG9jYWwgaWRlbnRpZmllcnMgaWYgYXZhaWxhYmxlLlxuICAgICAgICBuZXcgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gTmV4dCwgYXR0ZW1wdCB0byB1c2UgYW4gYWJzb2x1dGUgaW1wb3J0LlxuICAgICAgICBuZXcgQWJzb2x1dGVNb2R1bGVTdHJhdGVneShcbiAgICAgICAgICAgIHRoaXMudHNQcm9ncmFtLCBjaGVja2VyLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgcmVmZXJlbmNlIGlzIGJlaW5nIHdyaXR0ZW4gaW50byBhIGZpbGUgd2l0aGluIHRoZSBwcm9qZWN0J3MgLnRzXG4gICAgICAgIC8vIHNvdXJjZXMsIGFuZCB1c2UgYSByZWxhdGl2ZSBpbXBvcnQgaWYgc28uIElmIHRoaXMgZmFpbHMsIFJlZmVyZW5jZUVtaXR0ZXIgd2lsbCB0aHJvd1xuICAgICAgICAvLyBhbiBlcnJvci5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSxcbiAgICAgIF0pO1xuXG4gICAgICAvLyBJZiBhbiBlbnRyeXBvaW50IGlzIHByZXNlbnQsIHRoZW4gYWxsIHVzZXIgaW1wb3J0cyBzaG91bGQgYmUgZGlyZWN0ZWQgdGhyb3VnaCB0aGVcbiAgICAgIC8vIGVudHJ5cG9pbnQgYW5kIHByaXZhdGUgZXhwb3J0cyBhcmUgbm90IG5lZWRlZC4gVGhlIGNvbXBpbGVyIHdpbGwgdmFsaWRhdGUgdGhhdCBhbGwgcHVibGljbHlcbiAgICAgIC8vIHZpc2libGUgZGlyZWN0aXZlcy9waXBlcyBhcmUgaW1wb3J0YWJsZSB2aWEgdGhpcyBlbnRyeXBvaW50LlxuICAgICAgaWYgKHRoaXMuZW50cnlQb2ludCA9PT0gbnVsbCAmJiB0aGlzLm9wdGlvbnMuZ2VuZXJhdGVEZWVwUmVleHBvcnRzID09PSB0cnVlKSB7XG4gICAgICAgIC8vIE5vIGVudHJ5cG9pbnQgaXMgcHJlc2VudCBhbmQgZGVlcCByZS1leHBvcnRzIHdlcmUgcmVxdWVzdGVkLCBzbyBjb25maWd1cmUgdGhlIGFsaWFzaW5nXG4gICAgICAgIC8vIHN5c3RlbSB0byBnZW5lcmF0ZSB0aGVtLlxuICAgICAgICB0aGlzLmFsaWFzaW5nSG9zdCA9IG5ldyBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0KHRoaXMucmVmbGVjdG9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIENvbXBpbGVySG9zdCBzdXBwb3J0cyBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gdXNlIHRoYXQgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgdGhpcy5yZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBhbGlhc2VkIHJlZmVyZW5jZXMgKHRoaXMgaXMgYSB3b3JrYXJvdW5kIHRvIFN0cmljdERlcHMgY2hlY2tzKS5cbiAgICAgICAgbmV3IEFsaWFzU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgZmlsZU5hbWVUb01vZHVsZU5hbWUgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgICBuZXcgRmlsZVRvTW9kdWxlU3RyYXRlZ3kodGhpcy5yZWZsZWN0b3IsIHRoaXMuZmlsZVRvTW9kdWxlSG9zdCksXG4gICAgICBdKTtcbiAgICAgIHRoaXMuYWxpYXNpbmdIb3N0ID0gbmV3IEZpbGVUb01vZHVsZUFsaWFzaW5nSG9zdCh0aGlzLmZpbGVUb01vZHVsZUhvc3QpO1xuICAgIH1cblxuICAgIGNvbnN0IGV2YWx1YXRvciA9XG4gICAgICAgIG5ldyBQYXJ0aWFsRXZhbHVhdG9yKHRoaXMucmVmbGVjdG9yLCBjaGVja2VyLCB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmRlcEdyYXBoKTtcbiAgICBjb25zdCBkdHNSZWFkZXIgPSBuZXcgRHRzTWV0YWRhdGFSZWFkZXIoY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IpO1xuICAgIGNvbnN0IGxvY2FsTWV0YVJlZ2lzdHJ5ID0gbmV3IExvY2FsTWV0YWRhdGFSZWdpc3RyeSgpO1xuICAgIGNvbnN0IGxvY2FsTWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXIgPSBsb2NhbE1ldGFSZWdpc3RyeTtcbiAgICBjb25zdCBkZXBTY29wZVJlYWRlciA9IG5ldyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIoZHRzUmVhZGVyLCB0aGlzLmFsaWFzaW5nSG9zdCk7XG4gICAgdGhpcy5zY29wZVJlZ2lzdHJ5ID0gbmV3IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeShcbiAgICAgICAgbG9jYWxNZXRhUmVhZGVyLCBkZXBTY29wZVJlYWRlciwgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLmFsaWFzaW5nSG9zdCk7XG4gICAgY29uc3Qgc2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyID0gdGhpcy5zY29wZVJlZ2lzdHJ5O1xuICAgIGNvbnN0IG1ldGFSZWdpc3RyeSA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVnaXN0cnkoW2xvY2FsTWV0YVJlZ2lzdHJ5LCB0aGlzLnNjb3BlUmVnaXN0cnldKTtcblxuICAgIHRoaXMubWV0YVJlYWRlciA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVhZGVyKFtsb2NhbE1ldGFSZWFkZXIsIGR0c1JlYWRlcl0pO1xuXG5cbiAgICAvLyBJZiBhIGZsYXQgbW9kdWxlIGVudHJ5cG9pbnQgd2FzIHNwZWNpZmllZCwgdGhlbiB0cmFjayByZWZlcmVuY2VzIHZpYSBhIGBSZWZlcmVuY2VHcmFwaGAgaW5cbiAgICAvLyBvcmRlciB0byBwcm9kdWNlIHByb3BlciBkaWFnbm9zdGljcyBmb3IgaW5jb3JyZWN0bHkgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy9ldGMuIElmIHRoZXJlXG4gICAgLy8gaXMgbm8gZmxhdCBtb2R1bGUgZW50cnlwb2ludCB0aGVuIGRvbid0IHBheSB0aGUgY29zdCBvZiB0cmFja2luZyByZWZlcmVuY2VzLlxuICAgIGxldCByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeTtcbiAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoID0gbmV3IFJlZmVyZW5jZUdyYXBoKCk7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgUmVmZXJlbmNlR3JhcGhBZGFwdGVyKHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSgpO1xuICAgIH1cblxuICAgIHRoaXMucm91dGVBbmFseXplciA9IG5ldyBOZ01vZHVsZVJvdXRlQW5hbHl6ZXIodGhpcy5tb2R1bGVSZXNvbHZlciwgZXZhbHVhdG9yKTtcblxuICAgIHRoaXMuZHRzVHJhbnNmb3JtcyA9IG5ldyBEdHNUcmFuc2Zvcm1SZWdpc3RyeSgpO1xuXG4gICAgdGhpcy5td3BTY2FubmVyID0gbmV3IE1vZHVsZVdpdGhQcm92aWRlcnNTY2FubmVyKHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIHRoaXMucmVmRW1pdHRlcik7XG5cbiAgICAvLyBTZXQgdXAgdGhlIEl2eUNvbXBpbGF0aW9uLCB3aGljaCBtYW5hZ2VzIHN0YXRlIGZvciB0aGUgSXZ5IHRyYW5zZm9ybWVyLlxuICAgIGNvbnN0IGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+W10gPSBbXG4gICAgICBuZXcgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICB0aGlzLnJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHRoaXMubWV0YVJlYWRlciAhLCBzY29wZVJlYWRlcixcbiAgICAgICAgICB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMuaXNDb3JlLCB0aGlzLnJlc291cmNlTWFuYWdlciwgdGhpcy5yb290RGlycyxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMucHJlc2VydmVXaGl0ZXNwYWNlcyB8fCBmYWxzZSwgdGhpcy5vcHRpb25zLmkxOG5Vc2VFeHRlcm5hbElkcyAhPT0gZmFsc2UsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQgIT09IGZhbHNlLCB0aGlzLm1vZHVsZVJlc29sdmVyLFxuICAgICAgICAgIHRoaXMuY3ljbGVBbmFseXplciwgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIuZGVwR3JhcGgsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCksXG4gICAgICAvLyBUT0RPKGFseGh1Yik6IHVuZGVyc3RhbmQgd2h5IHRoZSBjYXN0IGhlcmUgaXMgbmVjZXNzYXJ5IChzb21ldGhpbmcgdG8gZG8gd2l0aCBgbnVsbGAgbm90XG4gICAgICAvLyBiZWluZyBhc3NpZ25hYmxlIHRvIGB1bmtub3duYCB3aGVuIHdyYXBwZWQgaW4gYFJlYWRvbmx5YCkuXG4gICAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICB0aGlzLnJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCkgYXMgUmVhZG9ubHk8RGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCB1bmtub3duPj4sXG4gICAgICAvLyBQaXBlIGhhbmRsZXIgbXVzdCBiZSBiZWZvcmUgaW5qZWN0YWJsZSBoYW5kbGVyIGluIGxpc3Qgc28gcGlwZSBmYWN0b3JpZXMgYXJlIHByaW50ZWRcbiAgICAgIC8vIGJlZm9yZSBpbmplY3RhYmxlIGZhY3RvcmllcyAoc28gaW5qZWN0YWJsZSBmYWN0b3JpZXMgY2FuIGRlbGVnYXRlIHRvIHRoZW0pXG4gICAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlZ2lzdHJ5LCB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmlzQ29yZSksXG4gICAgICBuZXcgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5zdHJpY3RJbmplY3Rpb25QYXJhbWV0ZXJzIHx8IGZhbHNlKSxcbiAgICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgdGhpcy5tZXRhUmVhZGVyLCBtZXRhUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeSxcbiAgICAgICAgICByZWZlcmVuY2VzUmVnaXN0cnksIHRoaXMuaXNDb3JlLCB0aGlzLnJvdXRlQW5hbHl6ZXIsIHRoaXMucmVmRW1pdHRlciwgdGhpcy5mYWN0b3J5VHJhY2tlcixcbiAgICAgICAgICB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLCB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsIHRoaXMub3B0aW9ucy5pMThuSW5Mb2NhbGUpLFxuICAgIF07XG5cbiAgICByZXR1cm4gbmV3IFRyYWl0Q29tcGlsZXIoXG4gICAgICAgIGhhbmRsZXJzLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5wZXJmUmVjb3JkZXIsIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIsXG4gICAgICAgIHRoaXMub3B0aW9ucy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICE9PSBmYWxzZSwgdGhpcy5kdHNUcmFuc2Zvcm1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWlmaWVzIHRoZSBpbnRlci1kZXBlbmRlbmNpZXMgb2YgTmdNb2R1bGVzIGFuZCB0aGUgY29tcG9uZW50cyB3aXRoaW4gdGhlaXIgY29tcGlsYXRpb24gc2NvcGVzXG4gICAqIGludG8gdGhlIGBJbmNyZW1lbnRhbERyaXZlcmAncyBkZXBlbmRlbmN5IGdyYXBoLlxuICAgKi9cbiAgcHJpdmF0ZSByZWNvcmROZ01vZHVsZVNjb3BlRGVwZW5kZW5jaWVzKCkge1xuICAgIGNvbnN0IHJlY29yZFNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgncmVjb3JkRGVwZW5kZW5jaWVzJyk7XG4gICAgY29uc3QgZGVwR3JhcGggPSB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmRlcEdyYXBoO1xuXG4gICAgZm9yIChjb25zdCBzY29wZSBvZiB0aGlzLnNjb3BlUmVnaXN0cnkgIS5nZXRDb21waWxhdGlvblNjb3BlcygpKSB7XG4gICAgICBjb25zdCBmaWxlID0gc2NvcGUuZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgY29uc3QgbmdNb2R1bGVGaWxlID0gc2NvcGUubmdNb2R1bGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgICAvLyBBIGNoYW5nZSB0byBhbnkgZGVwZW5kZW5jeSBvZiB0aGUgZGVjbGFyYXRpb24gY2F1c2VzIHRoZSBkZWNsYXJhdGlvbiB0byBiZSBpbnZhbGlkYXRlZCxcbiAgICAgIC8vIHdoaWNoIHJlcXVpcmVzIHRoZSBOZ01vZHVsZSB0byBiZSBpbnZhbGlkYXRlZCBhcyB3ZWxsLlxuICAgICAgZGVwR3JhcGguYWRkVHJhbnNpdGl2ZURlcGVuZGVuY3kobmdNb2R1bGVGaWxlLCBmaWxlKTtcblxuICAgICAgLy8gQSBjaGFuZ2UgdG8gdGhlIE5nTW9kdWxlIGZpbGUgc2hvdWxkIGNhdXNlIHRoZSBkZWNsYXJhdGlvbiBpdHNlbGYgdG8gYmUgaW52YWxpZGF0ZWQuXG4gICAgICBkZXBHcmFwaC5hZGREZXBlbmRlbmN5KGZpbGUsIG5nTW9kdWxlRmlsZSk7XG5cbiAgICAgIGNvbnN0IG1ldGEgPSB0aGlzLm1ldGFSZWFkZXIgIS5nZXREaXJlY3RpdmVNZXRhZGF0YShuZXcgUmVmZXJlbmNlKHNjb3BlLmRlY2xhcmF0aW9uKSk7XG4gICAgICBpZiAobWV0YSAhPT0gbnVsbCAmJiBtZXRhLmlzQ29tcG9uZW50KSB7XG4gICAgICAgIC8vIElmIGEgY29tcG9uZW50J3MgdGVtcGxhdGUgY2hhbmdlcywgaXQgbWlnaHQgaGF2ZSBhZmZlY3RlZCB0aGUgaW1wb3J0IGdyYXBoLCBhbmQgdGh1cyB0aGVcbiAgICAgICAgLy8gcmVtb3RlIHNjb3BpbmcgZmVhdHVyZSB3aGljaCBpcyBhY3RpdmF0ZWQgaW4gdGhlIGV2ZW50IG9mIHBvdGVudGlhbCBpbXBvcnQgY3ljbGVzLiBUaHVzLFxuICAgICAgICAvLyB0aGUgbW9kdWxlIGRlcGVuZHMgbm90IG9ubHkgb24gdGhlIHRyYW5zaXRpdmUgZGVwZW5kZW5jaWVzIG9mIHRoZSBjb21wb25lbnQsIGJ1dCBvbiBpdHNcbiAgICAgICAgLy8gcmVzb3VyY2VzIGFzIHdlbGwuXG4gICAgICAgIGRlcEdyYXBoLmFkZFRyYW5zaXRpdmVSZXNvdXJjZXMobmdNb2R1bGVGaWxlLCBmaWxlKTtcblxuICAgICAgICAvLyBBIGNoYW5nZSB0byBhbnkgZGlyZWN0aXZlL3BpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIHNob3VsZCBjYXVzZSB0aGUgY29tcG9uZW50IHRvIGJlXG4gICAgICAgIC8vIGludmFsaWRhdGVkLlxuICAgICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBzY29wZS5kaXJlY3RpdmVzKSB7XG4gICAgICAgICAgLy8gV2hlbiBhIGRpcmVjdGl2ZSBpbiBzY29wZSBpcyB1cGRhdGVkLCB0aGUgY29tcG9uZW50IG5lZWRzIHRvIGJlIHJlY29tcGlsZWQgYXMgZS5nLiBhXG4gICAgICAgICAgLy8gc2VsZWN0b3IgbWF5IGhhdmUgY2hhbmdlZC5cbiAgICAgICAgICBkZXBHcmFwaC5hZGRUcmFuc2l0aXZlRGVwZW5kZW5jeShmaWxlLCBkaXJlY3RpdmUucmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHBpcGUgb2Ygc2NvcGUucGlwZXMpIHtcbiAgICAgICAgICAvLyBXaGVuIGEgcGlwZSBpbiBzY29wZSBpcyB1cGRhdGVkLCB0aGUgY29tcG9uZW50IG5lZWRzIHRvIGJlIHJlY29tcGlsZWQgYXMgZS5nLiB0aGVcbiAgICAgICAgICAvLyBwaXBlJ3MgbmFtZSBtYXkgaGF2ZSBjaGFuZ2VkLlxuICAgICAgICAgIGRlcEdyYXBoLmFkZFRyYW5zaXRpdmVEZXBlbmRlbmN5KGZpbGUsIHBpcGUucmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKHJlY29yZFNwYW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgcmVmbGVjdG9yKCk6IFR5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCB7XG4gICAgaWYgKHRoaXMuX3JlZmxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9yZWZsZWN0b3IgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KHRoaXMudHNQcm9ncmFtLmdldFR5cGVDaGVja2VyKCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmVmbGVjdG9yO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgY29yZUltcG9ydHNGcm9tKCk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgaWYgKHRoaXMuX2NvcmVJbXBvcnRzRnJvbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9jb3JlSW1wb3J0c0Zyb20gPSB0aGlzLmlzQ29yZSAmJiBnZXRSM1N5bWJvbHNGaWxlKHRoaXMudHNQcm9ncmFtKSB8fCBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29yZUltcG9ydHNGcm9tO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaXNDb3JlKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9pc0NvcmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5faXNDb3JlID0gaXNBbmd1bGFyQ29yZVBhY2thZ2UodGhpcy50c1Byb2dyYW0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faXNDb3JlO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgaW1wb3J0UmV3cml0ZXIoKTogSW1wb3J0UmV3cml0ZXIge1xuICAgIGlmICh0aGlzLl9pbXBvcnRSZXdyaXRlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjb3JlSW1wb3J0c0Zyb20gPSB0aGlzLmNvcmVJbXBvcnRzRnJvbTtcbiAgICAgIHRoaXMuX2ltcG9ydFJld3JpdGVyID0gY29yZUltcG9ydHNGcm9tICE9PSBudWxsID9cbiAgICAgICAgICBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIoY29yZUltcG9ydHNGcm9tLmZpbGVOYW1lKSA6XG4gICAgICAgICAgbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faW1wb3J0UmV3cml0ZXI7XG4gIH1cbn1cblxuY29uc3QgZGVmYXVsdEVtaXRDYWxsYmFjazogYXBpLlRzRW1pdENhbGxiYWNrID1cbiAgICAoe3Byb2dyYW0sIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnN9KSA9PlxuICAgICAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgICAgICB0YXJnZXRTb3VyY2VGaWxlLCB3cml0ZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuLCBlbWl0T25seUR0c0ZpbGVzLCBjdXN0b21UcmFuc2Zvcm1lcnMpO1xuXG5mdW5jdGlvbiBtZXJnZUVtaXRSZXN1bHRzKGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0IHtcbiAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBsZXQgZW1pdFNraXBwZWQgPSBmYWxzZTtcbiAgY29uc3QgZW1pdHRlZEZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVyIG9mIGVtaXRSZXN1bHRzKSB7XG4gICAgZGlhZ25vc3RpY3MucHVzaCguLi5lci5kaWFnbm9zdGljcyk7XG4gICAgZW1pdFNraXBwZWQgPSBlbWl0U2tpcHBlZCB8fCBlci5lbWl0U2tpcHBlZDtcbiAgICBlbWl0dGVkRmlsZXMucHVzaCguLi4oZXIuZW1pdHRlZEZpbGVzIHx8IFtdKSk7XG4gIH1cblxuICByZXR1cm4ge2RpYWdub3N0aWNzLCBlbWl0U2tpcHBlZCwgZW1pdHRlZEZpbGVzfTtcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSAncjNfc3ltYm9scy50cycgZmlsZSBpbiB0aGUgZ2l2ZW4gYFByb2dyYW1gLCBvciByZXR1cm4gYG51bGxgIGlmIGl0IHdhc24ndCB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maW5kKGZpbGUgPT4gZmlsZS5maWxlTmFtZS5pbmRleE9mKCdyM19zeW1ib2xzLnRzJykgPj0gMCkgfHwgbnVsbDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgdGhlIGdpdmVuIGBQcm9ncmFtYCBpcyBAYW5ndWxhci9jb3JlLlxuICovXG5mdW5jdGlvbiBpc0FuZ3VsYXJDb3JlUGFja2FnZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogYm9vbGVhbiB7XG4gIC8vIExvb2sgZm9yIGl0c19qdXN0X2FuZ3VsYXIudHMgc29tZXdoZXJlIGluIHRoZSBwcm9ncmFtLlxuICBjb25zdCByM1N5bWJvbHMgPSBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW0pO1xuICBpZiAocjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gTG9vayBmb3IgdGhlIGNvbnN0YW50IElUU19KVVNUX0FOR1VMQVIgaW4gdGhhdCBmaWxlLlxuICByZXR1cm4gcjNTeW1ib2xzLnN0YXRlbWVudHMuc29tZShzdG10ID0+IHtcbiAgICAvLyBUaGUgc3RhdGVtZW50IG11c3QgYmUgYSB2YXJpYWJsZSBkZWNsYXJhdGlvbiBzdGF0ZW1lbnQuXG4gICAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgYmUgZXhwb3J0ZWQuXG4gICAgaWYgKHN0bXQubW9kaWZpZXJzID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgIXN0bXQubW9kaWZpZXJzLnNvbWUobW9kID0+IG1vZC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cG9ydEtleXdvcmQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEl0IG11c3QgZGVjbGFyZSBJVFNfSlVTVF9BTkdVTEFSLlxuICAgIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMuc29tZShkZWNsID0+IHtcbiAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBtdXN0IG1hdGNoIHRoZSBuYW1lLlxuICAgICAgaWYgKCF0cy5pc0lkZW50aWZpZXIoZGVjbC5uYW1lKSB8fCBkZWNsLm5hbWUudGV4dCAhPT0gJ0lUU19KVVNUX0FOR1VMQVInKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIEl0IG11c3QgaW5pdGlhbGl6ZSB0aGUgdmFyaWFibGUgdG8gdHJ1ZS5cbiAgICAgIGlmIChkZWNsLmluaXRpYWxpemVyID09PSB1bmRlZmluZWQgfHwgZGVjbC5pbml0aWFsaXplci5raW5kICE9PSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIFRoaXMgZGVmaW5pdGlvbiBtYXRjaGVzLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlR3JhcGhBZGFwdGVyIGltcGxlbWVudHMgUmVmZXJlbmNlc1JlZ2lzdHJ5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBncmFwaDogUmVmZXJlbmNlR3JhcGgpIHt9XG5cbiAgYWRkKHNvdXJjZTogdHMuRGVjbGFyYXRpb24sIC4uLnJlZmVyZW5jZXM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qge25vZGV9IG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCBzb3VyY2VGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNvdXJjZUZpbGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IHJlY29yZCBsb2NhbCByZWZlcmVuY2VzIChub3QgcmVmZXJlbmNlcyBpbnRvIC5kLnRzIGZpbGVzKS5cbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQgfHwgIWlzRHRzUGF0aChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICB0aGlzLmdyYXBoLmFkZChzb3VyY2UsIG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzaG91bGRFbmFibGVQZXJmVHJhY2luZyhvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zKTogYm9vbGVhbiB7XG4gIHJldHVybiBvcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZDtcbn1cbiJdfQ==