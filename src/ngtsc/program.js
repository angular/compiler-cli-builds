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
            var _this = this;
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
            var moduleResolutionCache = ts.createModuleResolutionCache(this.host.getCurrentDirectory(), function (fileName) { return _this.host.getCanonicalFileName(fileName); });
            this.moduleResolver =
                new imports_1.ModuleResolver(this.tsProgram, options, this.host, moduleResolutionCache);
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
                var resolvedModule = typescript_1.resolveModuleName(entryPath, containingFile, this.options, this.host, null);
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
                    new imports_1.AbsoluteModuleStrategy(this.tsProgram, checker, this.moduleResolver, this.reflector),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFHSCwrQkFBaUM7SUFHakMsMEZBQStEO0lBQy9ELG1GQUF1RTtJQUV2RSwyRUFBMk07SUFDM00saUVBQW9EO0lBQ3BELDJFQUFxRDtJQUNyRCwyRUFBa0g7SUFDbEgsMkVBQThFO0lBQzlFLG1FQUF5WTtJQUN6WSwyRUFBZ0Q7SUFDaEQsbUVBQTREO0lBQzVELG1GQUF5RDtJQUN6RCxxRUFBc0k7SUFDdEksMkZBQWlFO0lBQ2pFLHVGQUFxRDtJQUNyRCw2REFBcUU7SUFDckUseUVBQXNEO0lBQ3RELG1GQUFxRDtJQUNyRCxtRUFBa0U7SUFDbEUsK0RBQXFJO0lBQ3JJLCtEQUF3SztJQUN4SyxpRUFBNEM7SUFDNUMsdUVBQW9JO0lBQ3BJLDZFQUE0RDtJQUM1RCx1RUFBb0Y7SUFDcEYsc0VBQW9EO0lBQ3BELGtGQUFxRztJQUVyRztRQW9DRSxzQkFDSSxTQUFnQyxFQUFVLE9BQTRCLEVBQzlELElBQXNCLEVBQUUsVUFBeUI7WUFGN0QsaUJBb0hDO1lBbkg2QyxZQUFPLEdBQVAsT0FBTyxDQUFxQjtZQUM5RCxTQUFJLEdBQUosSUFBSSxDQUFrQjtZQWxDMUIsZ0JBQVcsR0FBNEIsU0FBUyxDQUFDO1lBQ2pELHFCQUFnQixHQUFpQyxTQUFTLENBQUM7WUFDM0Qsb0JBQWUsR0FBNkIsU0FBUyxDQUFDO1lBQ3RELGVBQVUsR0FBdUMsU0FBUyxDQUFDO1lBQzNELFlBQU8sR0FBc0IsU0FBUyxDQUFDO1lBSXZDLHlCQUFvQixHQUF3QixJQUFJLENBQUM7WUFDakQsdUJBQWtCLEdBQTRCLElBQUksQ0FBQztZQUNuRCxrQkFBYSxHQUErQixJQUFJLENBQUM7WUFDakQsa0JBQWEsR0FBa0MsSUFBSSxDQUFDO1lBRXBELDRCQUF1QixHQUFvQixFQUFFLENBQUM7WUFHOUMsZUFBVSxHQUF3QixJQUFJLENBQUM7WUFFdkMsaUJBQVksR0FBc0IsSUFBSSxDQUFDO1lBQ3ZDLGVBQVUsR0FBMEIsSUFBSSxDQUFDO1lBQ3pDLHFCQUFnQixHQUEwQixJQUFJLENBQUM7WUFFL0MsaUJBQVksR0FBaUIseUJBQWtCLENBQUM7WUFDaEQsZ0JBQVcsR0FBcUIsSUFBSSxDQUFDO1lBR3JDLG1CQUFjLEdBQXdCLElBQUksQ0FBQztZQUczQyxrQkFBYSxHQUE4QixJQUFJLENBQUM7WUFDaEQsZUFBVSxHQUFvQyxJQUFJLENBQUM7WUFLekQsSUFBSSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRTtnQkFDMUMscURBQWdDLEVBQUUsQ0FBQzthQUNwQztZQUVELElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsa0JBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2FBQ3RDO1lBRUQsSUFBSSxDQUFDLHFCQUFxQjtnQkFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLElBQUksSUFBSSxDQUFDO1lBQ3ZGLElBQUksQ0FBQyxRQUFRLEdBQUcsd0JBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDLHNCQUFzQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUM7WUFDbkUsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLG9DQUFrQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUM3RCwrRkFBK0Y7WUFDL0YsZ0RBQWdEO1lBQ2hELElBQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixJQUFJLEtBQUssQ0FBQztZQUN2RSxJQUFNLDBCQUEwQixHQUFHLE9BQU8sQ0FBQyxzQkFBc0IsS0FBSyxTQUFTLENBQUMsQ0FBQztnQkFDN0UsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7Z0JBQ2hDLHNCQUFzQixDQUFDO1lBQzNCLElBQU0sMEJBQTBCLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUM3RSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztnQkFDaEMsc0JBQXNCLENBQUM7WUFDM0IsSUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsMEJBQVksQ0FBQyxDQUFDLENBQUMsRUFBZixDQUFlLENBQUMsQ0FBQztZQUNoRSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsS0FBSyxTQUFTLEVBQUU7Z0JBQzNDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUF3QixDQUFDO2FBQ2xEO1lBQ0QsSUFBSSxTQUFTLG9CQUFPLFNBQVMsQ0FBQyxDQUFDO1lBRS9CLElBQU0sVUFBVSxHQUFvQixFQUFFLENBQUM7WUFDdkMsSUFBSSxnQkFBZ0IsR0FBMEIsSUFBSSxDQUFDO1lBQ25ELElBQUksMEJBQTBCLEVBQUU7Z0JBQzlCLHNCQUFzQjtnQkFDdEIsZ0JBQWdCLEdBQUcsd0JBQWdCLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3RFLFVBQVUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzthQUNuQztZQUVELElBQUksMEJBQTBCLEVBQUU7Z0JBQzlCLHNCQUFzQjtnQkFDdEIsSUFBTSxnQkFBZ0IsR0FBRyx3QkFBZ0IsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDNUUsSUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsY0FBYyxDQUFDO2dCQUV2RCxJQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQzNELFNBQVMsQ0FBQyxJQUFJLE9BQWQsU0FBUyxtQkFBUyxnQkFBZ0IsR0FBRTtnQkFDcEMsVUFBVSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUVsQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksc0JBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQzVEO1lBRUQsNEZBQTRGO1lBQzVGLGlEQUFpRDtZQUNqRCxJQUFJLDBCQUEwQixFQUFFO2dCQUM5QixTQUFTLENBQUMsSUFBSSxPQUFkLFNBQVMsbUJBQVMsZ0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsR0FBRTthQUM3RDtZQUVELElBQUksQ0FBQyxpQkFBaUIsR0FBRyw2QkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUQsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLDhCQUFzQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDcEUsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUV2QyxJQUFJLFVBQVUsR0FBd0IsSUFBSSxDQUFDO1lBQzNDLElBQUksT0FBTyxDQUFDLGlCQUFpQixJQUFJLElBQUksSUFBSSxPQUFPLENBQUMsaUJBQWlCLEtBQUssRUFBRSxFQUFFO2dCQUN6RSxVQUFVLEdBQUcscUNBQXVCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO29CQUN2QiwyRkFBMkY7b0JBQzNGLDBGQUEwRjtvQkFDMUYsdUZBQXVGO29CQUN2Rix1RkFBdUY7b0JBQ3ZGLFNBQVM7b0JBQ1QsRUFBRTtvQkFDRix3RkFBd0Y7b0JBQ3hGLHFEQUFxRDtvQkFDckQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQzt3QkFDaEMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLO3dCQUNyQyxJQUFJLEVBQUUseUJBQVcsQ0FBQyx1QkFBUyxDQUFDLDJCQUEyQixDQUFDO3dCQUN4RCxJQUFJLEVBQUUsU0FBUzt3QkFDZixLQUFLLEVBQUUsU0FBUzt3QkFDaEIsTUFBTSxFQUFFLFNBQVM7d0JBQ2pCLFdBQVcsRUFDUCxzR0FBc0c7cUJBQzNHLENBQUMsQ0FBQztpQkFDSjtxQkFBTTtvQkFDTCxJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQztvQkFDbEQsSUFBTSxpQkFBaUIsR0FBRywwQkFBbUIsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztvQkFDekUsSUFBSSxDQUFDLGtCQUFrQjt3QkFDbkIsSUFBSSxnQ0FBa0IsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLENBQUM7b0JBQ3hFLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7b0JBQ3pDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO2lCQUN2RDthQUNGO1lBRUQsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDekIsNkRBQTZEO2dCQUM3RCxJQUFJLENBQUMsSUFBSSxHQUFJLElBQUksaUNBQXlCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBUyxDQUFDO2FBQ3RFO1lBRUQsSUFBSSxDQUFDLFNBQVM7Z0JBQ1YsRUFBRSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxJQUFJLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUM3RixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFFckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxnQ0FBbUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDL0YsSUFBTSxxQkFBcUIsR0FBRyxFQUFFLENBQUMsMkJBQTJCLENBQ3hELElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxVQUFBLFFBQVEsSUFBSSxPQUFBLEtBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLEVBQXhDLENBQXdDLENBQUMsQ0FBQztZQUMzRixJQUFJLENBQUMsY0FBYztnQkFDZixJQUFJLHdCQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2xGLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxzQkFBYSxDQUFDLElBQUksb0JBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUM3RSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSw4QkFBb0IsRUFBRSxDQUFDO1lBQ3ZELElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRTtnQkFDNUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLCtCQUFpQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDbEU7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLGlCQUFpQixHQUFHLCtCQUFpQixDQUFDLFNBQVMsQ0FDaEQsVUFBVSxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFDdkUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7YUFDakM7UUFDSCxDQUFDO1FBRUQsbUNBQVksR0FBWixjQUE2QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBRXJELDZDQUFzQixHQUF0QixVQUF1QixpQkFDUztZQUM5QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsNkNBQXNCLEdBQXRCLFVBQXVCLGlCQUNTO1lBQzlCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDO1FBQ3RDLENBQUM7UUFFRCxnREFBeUIsR0FBekIsVUFDSSxVQUFvQyxFQUNwQyxpQkFBa0Q7WUFDcEQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9FLENBQUM7UUFFRCxpREFBMEIsR0FBMUIsVUFBMkIsaUJBQ1M7WUFDbEMsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQsK0NBQXdCLEdBQXhCLFVBQ0ksVUFBb0MsRUFDcEMsaUJBQWtEO1lBQ3BELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUM5RSxDQUFDO1FBRUQsK0NBQXdCLEdBQXhCLFVBQ0ksUUFBMkIsRUFDM0IsaUJBQWtEO1lBQ3BELElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQyxJQUFNLFdBQVcsb0JBQU8sV0FBVyxDQUFDLFdBQVcsRUFBSyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1lBQ25GLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLG9CQUFvQixLQUFLLElBQUksRUFBRTtnQkFDbEUsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFBUyxvQ0FBc0IsQ0FDdEMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFFO2FBQ25GO1lBQ0QsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUVLLDJDQUFvQixHQUExQjs7Ozs7Ozs7NEJBQ0UsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsRUFBRTtnQ0FDbEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7NkJBQzNDOzRCQUNLLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDakQsUUFBUSxHQUFvQixFQUFFLENBQUM7Z0RBQzFCLEVBQUU7Z0NBQ1gsSUFBSSxFQUFFLENBQUMsaUJBQWlCLEVBQUU7O2lDQUV6QjtnQ0FFRCxJQUFNLGVBQWUsR0FBRyxPQUFLLFlBQVksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dDQUNuRSxJQUFJLGVBQWUsR0FBRyxPQUFLLFdBQWEsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7Z0NBQzFELE9BQUssVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dDQUNwQixJQUFJLGVBQWUsS0FBSyxTQUFTLEVBQUU7b0NBQ2pDLE9BQUssWUFBWSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztpQ0FDekM7cUNBQU0sSUFBSSxPQUFLLFlBQVksQ0FBQyxPQUFPLEVBQUU7b0NBQ3BDLGVBQWUsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQU0sT0FBQSxLQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBdkMsQ0FBdUMsQ0FBQyxDQUFDO2lDQUN2RjtnQ0FDRCxJQUFJLGVBQWUsS0FBSyxTQUFTLEVBQUU7b0NBQ2pDLFFBQVEsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7aUNBQ2hDOzs7O2dDQWZILEtBQWlCLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtvQ0FBckMsRUFBRTs0Q0FBRixFQUFFO2lDQWdCWjs7Ozs7Ozs7OzRCQUVELHFCQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUE7OzRCQUEzQixTQUEyQixDQUFDOzRCQUU1QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzs0QkFFcEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzs7Ozs7U0FDM0M7UUFFRCxxQ0FBYyxHQUFkLFVBQWUsVUFBNkI7WUFDMUMsSUFBSSxVQUFVLEVBQUU7Z0JBQ2QsUUFBUTtnQkFDUiw2RkFBNkY7Z0JBQzdGLHdIQUF3SDtnQkFDeEgsRUFBRTtnQkFDRiw0RkFBNEY7Z0JBQzVGLDRGQUE0RjtnQkFFNUYsdUNBQXVDO2dCQUN2QyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQzlCLE1BQU0sSUFBSSxLQUFLLENBQ1gsK0RBQTZELFVBQVUsd0JBQXFCLENBQUMsQ0FBQztpQkFDbkc7Z0JBRUQsc0VBQXNFO2dCQUN0RSw4RkFBOEY7Z0JBQzlGLGlCQUFpQjtnQkFDakIsaURBQWlEO2dCQUNqRCw4RUFBOEU7Z0JBQzlFLDRGQUE0RjtnQkFDNUYsRUFBRTtnQkFDRiw4RkFBOEY7Z0JBQzlGLHFCQUFxQjtnQkFDckIsSUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxJQUFBLDZDQUErQyxFQUE5QyxpQkFBUyxFQUFFLGtCQUFtQyxDQUFDO2dCQUN0RCxJQUFNLGNBQWMsR0FDaEIsOEJBQWlCLENBQUMsU0FBUyxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRWhGLElBQUksY0FBYyxFQUFFO29CQUNsQixVQUFVLEdBQUcsMEJBQWdCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxDQUFDO2lCQUM1RTthQUNGO1lBRUQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBSSxDQUFDLGFBQWUsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUVELDBDQUFtQixHQUFuQjtZQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsK0NBQXdCLEdBQXhCO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCw0Q0FBcUIsR0FBckI7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUVPLGlDQUFVLEdBQWxCLFVBQW1CLEVBQWlCO1lBQXBDLGlCQVFDO1lBUEMsSUFBSSxDQUFDLFVBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFO2dCQUN6QixrQkFBa0IsRUFBRSxVQUFDLElBQW9CLEVBQUUsSUFBVTtvQkFDbkQsNEZBQTRGO29CQUM1RixnRUFBZ0U7b0JBQ2hFLEtBQUksQ0FBQyxhQUFlLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNqRixDQUFDO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVPLHFDQUFjLEdBQXRCOztZQUNFLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUU7Z0JBQ2xDLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQzs7b0JBQzFDLEtBQWlCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFBLGdCQUFBLDRCQUFFO3dCQUE3QyxJQUFNLEVBQUUsV0FBQTt3QkFDWCxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRTs0QkFDeEIsU0FBUzt5QkFDVjt3QkFDRCxJQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ25FLElBQUksQ0FBQyxXQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNuQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNwQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztxQkFDekM7Ozs7Ozs7OztnQkFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFFcEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUMzQztZQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUMxQixDQUFDO1FBRU8seUNBQWtCLEdBQTFCLFVBQTJCLFdBQTBCO1lBQ25ELFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUV0QixJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQztZQUV2Qyw2RkFBNkY7WUFDN0YsMEJBQTBCO1lBQzFCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsMkJBQUksR0FBSixVQUFLLElBTUo7O1lBTkQsaUJBbUdDO1lBNUZDLElBQU0sWUFBWSxHQUFHLElBQUksSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLG1CQUFtQixDQUFDO1lBRXRFLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUUxQyxJQUFNLFNBQVMsR0FDWCxVQUFDLFFBQWdCLEVBQUUsSUFBWSxFQUFFLGtCQUEyQixFQUMzRCxPQUFnRCxFQUNoRCxXQUFvRDs7Z0JBQ25ELElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTs7d0JBQzdCLG1GQUFtRjt3QkFDbkYsaUNBQWlDO3dCQUNqQyxLQUF3QixJQUFBLGdCQUFBLGlCQUFBLFdBQVcsQ0FBQSx3Q0FBQSxpRUFBRTs0QkFBaEMsSUFBTSxTQUFTLHdCQUFBOzRCQUNsQixJQUFJLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRTtnQ0FDL0IsU0FBUzs2QkFDVjs0QkFFRCxLQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUM7eUJBQ3hEOzs7Ozs7Ozs7aUJBQ0Y7Z0JBQ0QsSUFBSSxLQUFJLENBQUMsc0JBQXNCLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDM0QsSUFBSSxHQUFHLGdDQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQzdCO2dCQUNELEtBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ2hGLENBQUMsQ0FBQztZQUVOLElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztZQUV6RCxJQUFNLGdCQUFnQixHQUFHO2dCQUN2QiwrQkFBbUIsQ0FDZixXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUN4RixJQUFJLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hDLDZCQUFxQixDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBeUM7Z0JBQzNGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywyQkFBMkIsRUFBRTthQUN4RCxDQUFDO1lBRUYsSUFBTSwyQkFBMkIsR0FBcUQsRUFBRSxDQUFDO1lBQ3pGLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxJQUFJLEVBQUU7Z0JBQy9CLDJCQUEyQixDQUFDLElBQUksQ0FDNUIsdUNBQTJCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzthQUMzRTtZQUVELHNGQUFzRjtZQUN0RixJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ3JFLDJCQUEyQixDQUFDLElBQUksQ0FBQyw2QkFBcUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2FBQ3ZGO1lBRUQsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLElBQUksRUFBRTtnQkFDaEMsZ0JBQWdCLENBQUMsSUFBSSxDQUNqQixpQ0FBeUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzthQUNyRjtZQUNELGdCQUFnQixDQUFDLElBQUksQ0FBQywyQkFBa0IsQ0FBQyxDQUFDO1lBQzFDLElBQUksZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsUUFBUSxFQUFFO2dCQUNqRCxnQkFBZ0IsQ0FBQyxJQUFJLE9BQXJCLGdCQUFnQixtQkFBUyxnQkFBZ0IsQ0FBQyxRQUFRLEdBQUU7YUFDckQ7WUFFRCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRCxJQUFNLFdBQVcsR0FBb0IsRUFBRSxDQUFDO1lBRXhDLElBQU0sYUFBYSxHQUFHLGdDQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7O2dCQUVsRixLQUErQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBM0QsSUFBTSxnQkFBZ0IsV0FBQTtvQkFDekIsSUFBSSxnQkFBZ0IsQ0FBQyxpQkFBaUIsSUFBSSxnQkFBZ0IsS0FBSyxhQUFhLEVBQUU7d0JBQzVFLFNBQVM7cUJBQ1Y7b0JBRUQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEVBQUU7d0JBQzNELFNBQVM7cUJBQ1Y7b0JBRUQsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUM7b0JBQzNFLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO3dCQUM1QixnQkFBZ0Isa0JBQUE7d0JBQ2hCLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUzt3QkFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO3dCQUNmLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTzt3QkFDckIsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLFNBQVMsV0FBQTt3QkFDbEMsa0JBQWtCLEVBQUU7NEJBQ2xCLE1BQU0sRUFBRSxnQkFBZ0I7NEJBQ3hCLEtBQUssRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPOzRCQUNuRCxpQkFBaUIsRUFBRSwyQkFBMkI7eUJBQy9DO3FCQUNGLENBQUMsQ0FBQyxDQUFDO29CQUNKLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2lCQUN0Qzs7Ozs7Ozs7O1lBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFakMsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixLQUFLLFNBQVMsRUFBRTtnQkFDNUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDNUU7WUFFRCwrRkFBK0Y7WUFDL0YsT0FBTyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDcEYsQ0FBQztRQUVPLDZDQUFzQixHQUE5QjtZQUNFLGdEQUFnRDtZQUNoRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEtBQUssS0FBSztnQkFDM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsS0FBSyxJQUFJLEVBQUU7Z0JBQy9DLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFFRCxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFMUMsOEJBQThCO1lBRTlCLDhGQUE4RjtZQUM5RixhQUFhO1lBQ2IsSUFBSSxrQkFBc0MsQ0FBQztZQUMzQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUU7Z0JBQ3RDLElBQU0sZUFBZSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQztnQkFDdkQsa0JBQWtCLEdBQUc7b0JBQ25CLDBCQUEwQixFQUFFLGVBQWU7b0JBQzNDLFlBQVksRUFBRSxLQUFLO29CQUNuQixtQkFBbUIsRUFBRSxJQUFJO29CQUN6Qix3QkFBd0IsRUFBRSxlQUFlO29CQUN6Qyx1QkFBdUIsRUFBRSxlQUFlO29CQUN4QyxxQkFBcUIsRUFBRSxlQUFlO29CQUN0Qyx3RkFBd0Y7b0JBQ3hGLHNCQUFzQixFQUFFLEtBQUs7b0JBQzdCLHVCQUF1QixFQUFFLGVBQWU7b0JBQ3hDLDBCQUEwQixFQUFFLGVBQWU7b0JBQzNDLGtGQUFrRjtvQkFDbEYsMEZBQTBGO29CQUMxRiw2Q0FBNkM7b0JBQzdDLHlFQUF5RTtvQkFDekUsb0JBQW9CLEVBQUUsZUFBZTtvQkFDckMsd0JBQXdCLEVBQUUsZUFBZTtvQkFDekMsMEZBQTBGO29CQUMxRiwyQkFBMkIsRUFBRSxJQUFJO29CQUNqQyxtRUFBbUU7b0JBQ25FLGdCQUFnQixFQUFFLElBQUk7b0JBQ3RCLHlCQUF5QixFQUFFLGVBQWU7aUJBQzNDLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxrQkFBa0IsR0FBRztvQkFDbkIsMEJBQTBCLEVBQUUsS0FBSztvQkFDakMsWUFBWSxFQUFFLEtBQUs7b0JBQ25CLG1CQUFtQixFQUFFLEtBQUs7b0JBQzFCLHdCQUF3QixFQUFFLEtBQUs7b0JBQy9CLHVCQUF1QixFQUFFLEtBQUs7b0JBQzlCLHFCQUFxQixFQUFFLEtBQUs7b0JBQzVCLHNCQUFzQixFQUFFLEtBQUs7b0JBQzdCLHVCQUF1QixFQUFFLEtBQUs7b0JBQzlCLDBCQUEwQixFQUFFLEtBQUs7b0JBQ2pDLG9CQUFvQixFQUFFLEtBQUs7b0JBQzNCLHdCQUF3QixFQUFFLEtBQUs7b0JBQy9CLDJCQUEyQixFQUFFLEtBQUs7b0JBQ2xDLGdCQUFnQixFQUFFLEtBQUs7b0JBQ3ZCLHlCQUF5QixFQUFFLEtBQUs7aUJBQ2pDLENBQUM7YUFDSDtZQUVELG1GQUFtRjtZQUNuRixvQ0FBb0M7WUFDcEMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixLQUFLLFNBQVMsRUFBRTtnQkFDL0Msa0JBQWtCLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDNUUsa0JBQWtCLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQzthQUMvRTtZQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsS0FBSyxTQUFTLEVBQUU7Z0JBQ25ELGtCQUFrQixDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUM7YUFDaEY7WUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEtBQUssU0FBUyxFQUFFO2dCQUNyRCxrQkFBa0IsQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDO2dCQUNqRixrQkFBa0IsQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDO2FBQ3JGO1lBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixLQUFLLFNBQVMsRUFBRTtnQkFDbEQsa0JBQWtCLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQzthQUM1RTtZQUNELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsS0FBSyxTQUFTLEVBQUU7Z0JBQ3hELGtCQUFrQixDQUFDLHlCQUF5QixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUM7YUFDdkY7WUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEtBQUssU0FBUyxFQUFFO2dCQUNyRCxrQkFBa0IsQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDO2FBQ25GO1lBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixLQUFLLFNBQVMsRUFBRTtnQkFDbkQsa0JBQWtCLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQzthQUM5RTtZQUVELGdFQUFnRTtZQUNoRSxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMxRCxJQUFNLEdBQUcsR0FBRyxJQUFJLDRCQUFnQixDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxVQUFZLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDaEcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVqQyx1QkFBdUI7WUFDdkIsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUNoRSxJQUFBLDhFQUN1RSxFQUR0RSw0QkFBVyxFQUFFLG9CQUN5RCxDQUFDO1lBQzlFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDO1lBRTlCLE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRCwyQ0FBb0IsR0FBcEI7WUFDRSxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUMsSUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBZSxFQUFFLENBQUM7WUFDdEMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzQixPQUFPLDRCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFFTyxzQ0FBZSxHQUF2QjtZQUNFLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFaEQsa0NBQWtDO1lBQ2xDLElBQUksSUFBSSxDQUFDLGdCQUFnQixLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUU7Z0JBQy9FLElBQUksbUJBQW1CLFNBQXVCLENBQUM7Z0JBRS9DLDRGQUE0RjtnQkFDNUYsb0ZBQW9GO2dCQUNwRix1RkFBdUY7Z0JBQ3ZGLDRGQUE0RjtnQkFDNUYsY0FBYztnQkFDZCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxLQUFLLFNBQVM7b0JBQ2xDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRTtvQkFDN0UseUZBQXlGO29CQUN6RixXQUFXO29CQUNYLG1CQUFtQjt3QkFDZixJQUFJLGdDQUFzQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSwrQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztpQkFDdEY7cUJBQU07b0JBQ0wsZ0RBQWdEO29CQUNoRCxtQkFBbUIsR0FBRyxJQUFJLDhCQUFvQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDaEU7Z0JBRUQsd0ZBQXdGO2dCQUN4Rix1QkFBdUI7Z0JBQ3ZCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSwwQkFBZ0IsQ0FBQztvQkFDckMsb0RBQW9EO29CQUNwRCxJQUFJLGlDQUF1QixFQUFFO29CQUM3QiwyQ0FBMkM7b0JBQzNDLElBQUksZ0NBQXNCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUN4Rix3RkFBd0Y7b0JBQ3hGLHVGQUF1RjtvQkFDdkYsWUFBWTtvQkFDWixtQkFBbUI7aUJBQ3BCLENBQUMsQ0FBQztnQkFFSCxvRkFBb0Y7Z0JBQ3BGLDhGQUE4RjtnQkFDOUYsK0RBQStEO2dCQUMvRCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEtBQUssSUFBSSxFQUFFO29CQUMzRSx5RkFBeUY7b0JBQ3pGLDJCQUEyQjtvQkFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLG1DQUF5QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDbkU7YUFDRjtpQkFBTTtnQkFDTCwrRUFBK0U7Z0JBQy9FLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSwwQkFBZ0IsQ0FBQztvQkFDckMsb0RBQW9EO29CQUNwRCxJQUFJLGlDQUF1QixFQUFFO29CQUM3QiwyRUFBMkU7b0JBQzNFLElBQUksdUJBQWEsRUFBRTtvQkFDbkIsaURBQWlEO29CQUNqRCxJQUFJLDhCQUFvQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDO2lCQUNoRSxDQUFDLENBQUM7Z0JBQ0gsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLGtDQUF3QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ3pFO1lBRUQsSUFBTSxTQUFTLEdBQ1gsSUFBSSxvQ0FBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbkYsSUFBTSxTQUFTLEdBQUcsSUFBSSw0QkFBaUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pFLElBQU0saUJBQWlCLEdBQUcsSUFBSSxnQ0FBcUIsRUFBRSxDQUFDO1lBQ3RELElBQU0sZUFBZSxHQUFtQixpQkFBaUIsQ0FBQztZQUMxRCxJQUFNLGNBQWMsR0FBRyxJQUFJLHNDQUE4QixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEYsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLGdDQUF3QixDQUM3QyxlQUFlLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3pFLElBQU0sV0FBVyxHQUF5QixJQUFJLENBQUMsYUFBYSxDQUFDO1lBQzdELElBQU0sWUFBWSxHQUFHLElBQUksbUNBQXdCLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUUzRixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksaUNBQXNCLENBQUMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUczRSw2RkFBNkY7WUFDN0YsOEZBQThGO1lBQzlGLCtFQUErRTtZQUMvRSxJQUFJLGtCQUFzQyxDQUFDO1lBQzNDLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUU7Z0JBQzVCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLDRCQUFjLEVBQUUsQ0FBQztnQkFDakQsa0JBQWtCLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQzthQUMzRTtpQkFBTTtnQkFDTCxrQkFBa0IsR0FBRyxJQUFJLG9DQUFzQixFQUFFLENBQUM7YUFDbkQ7WUFFRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksK0JBQXFCLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUUvRSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksZ0NBQW9CLEVBQUUsQ0FBQztZQUVoRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksZ0RBQTBCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRTdGLDBFQUEwRTtZQUMxRSxJQUFNLFFBQVEsR0FBa0Q7Z0JBQzlELElBQUksdUNBQXlCLENBQ3pCLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBWSxFQUFFLFdBQVcsRUFDdkUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFDcEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsSUFBSSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsS0FBSyxLQUFLLEVBQ3BGLElBQUksQ0FBQyxPQUFPLENBQUMsK0JBQStCLEtBQUssS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQzNFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsb0JBQW9CLEVBQzlELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDO2dCQUNqRSwyRkFBMkY7Z0JBQzNGLDZEQUE2RDtnQkFDN0QsSUFBSSx1Q0FBeUIsQ0FDekIsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUMvRSxJQUFJLENBQUMsc0JBQXNCLENBQTBEO2dCQUN6Rix1RkFBdUY7Z0JBQ3ZGLDZFQUE2RTtnQkFDN0UsSUFBSSxrQ0FBb0IsQ0FDcEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO2dCQUNwRixJQUFJLHdDQUEwQixDQUMxQixJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixJQUFJLEtBQUssQ0FBQztnQkFDcEQsSUFBSSxzQ0FBd0IsQ0FDeEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFDNUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFDekYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQzthQUN2RixDQUFDO1lBRUYsT0FBTyxJQUFJLHlCQUFhLENBQ3BCLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUNuRSxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixLQUFLLEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUVEOzs7V0FHRztRQUNLLHNEQUErQixHQUF2Qzs7WUFDRSxJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ2pFLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7O2dCQUVqRCxLQUFvQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLGFBQWUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBLGdCQUFBLDRCQUFFO29CQUE1RCxJQUFNLEtBQUssV0FBQTtvQkFDZCxJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUMvQyxJQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUVwRCwwRkFBMEY7b0JBQzFGLHlEQUF5RDtvQkFDekQsUUFBUSxDQUFDLHVCQUF1QixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFFckQsdUZBQXVGO29CQUN2RixRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFFM0MsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLG1CQUFTLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3RGLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO3dCQUNyQywyRkFBMkY7d0JBQzNGLDJGQUEyRjt3QkFDM0YsMEZBQTBGO3dCQUMxRixxQkFBcUI7d0JBQ3JCLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7OzRCQUVwRCwyRkFBMkY7NEJBQzNGLGVBQWU7NEJBQ2YsS0FBd0IsSUFBQSxvQkFBQSxpQkFBQSxLQUFLLENBQUMsVUFBVSxDQUFBLENBQUEsZ0JBQUEsNEJBQUU7Z0NBQXJDLElBQU0sU0FBUyxXQUFBO2dDQUNsQix1RkFBdUY7Z0NBQ3ZGLDZCQUE2QjtnQ0FDN0IsUUFBUSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDOzZCQUM1RTs7Ozs7Ozs7Ozs0QkFDRCxLQUFtQixJQUFBLG9CQUFBLGlCQUFBLEtBQUssQ0FBQyxLQUFLLENBQUEsQ0FBQSxnQkFBQSw0QkFBRTtnQ0FBM0IsSUFBTSxJQUFJLFdBQUE7Z0NBQ2Isb0ZBQW9GO2dDQUNwRixnQ0FBZ0M7Z0NBQ2hDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQzs2QkFDdkU7Ozs7Ozs7OztxQkFDRjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckMsQ0FBQztRQUVELHNCQUFZLG1DQUFTO2lCQUFyQjtnQkFDRSxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO29CQUNqQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUkscUNBQXdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO2lCQUNqRjtnQkFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDekIsQ0FBQzs7O1dBQUE7UUFFRCxzQkFBWSx5Q0FBZTtpQkFBM0I7Z0JBQ0UsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFO29CQUN2QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDO2lCQUNqRjtnQkFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUMvQixDQUFDOzs7V0FBQTtRQUVELHNCQUFZLGdDQUFNO2lCQUFsQjtnQkFDRSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFO29CQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztpQkFDckQ7Z0JBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3RCLENBQUM7OztXQUFBO1FBRUQsc0JBQVksd0NBQWM7aUJBQTFCO2dCQUNFLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxTQUFTLEVBQUU7b0JBQ3RDLElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7b0JBQzdDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxLQUFLLElBQUksQ0FBQyxDQUFDO3dCQUM3QyxJQUFJLGlDQUF1QixDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUN2RCxJQUFJLDRCQUFrQixFQUFFLENBQUM7aUJBQzlCO2dCQUNELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUM5QixDQUFDOzs7V0FBQTtRQUNILG1CQUFDO0lBQUQsQ0FBQyxBQTlzQkQsSUE4c0JDO0lBOXNCWSxvQ0FBWTtJQWd0QnpCLElBQU0sbUJBQW1CLEdBQ3JCLFVBQUMsRUFDb0I7WUFEbkIsb0JBQU8sRUFBRSxzQ0FBZ0IsRUFBRSx3QkFBUyxFQUFFLHdDQUFpQixFQUFFLHNDQUFnQixFQUN6RSwwQ0FBa0I7UUFDaEIsT0FBQSxPQUFPLENBQUMsSUFBSSxDQUNSLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsQ0FBQztJQUR6RixDQUN5RixDQUFDO0lBRWxHLFNBQVMsZ0JBQWdCLENBQUMsV0FBNEI7O1FBQ3BELElBQU0sV0FBVyxHQUFvQixFQUFFLENBQUM7UUFDeEMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQzs7WUFDbEMsS0FBaUIsSUFBQSxnQkFBQSxpQkFBQSxXQUFXLENBQUEsd0NBQUEsaUVBQUU7Z0JBQXpCLElBQU0sRUFBRSx3QkFBQTtnQkFDWCxXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLG1CQUFTLEVBQUUsQ0FBQyxXQUFXLEdBQUU7Z0JBQ3BDLFdBQVcsR0FBRyxXQUFXLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQztnQkFDNUMsWUFBWSxDQUFDLElBQUksT0FBakIsWUFBWSxtQkFBUyxDQUFDLEVBQUUsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLEdBQUU7YUFDL0M7Ozs7Ozs7OztRQUVELE9BQU8sRUFBQyxXQUFXLGFBQUEsRUFBRSxXQUFXLGFBQUEsRUFBRSxZQUFZLGNBQUEsRUFBQyxDQUFDO0lBQ2xELENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsZ0JBQWdCLENBQUMsT0FBbUI7UUFDM0MsT0FBTyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUEzQyxDQUEyQyxDQUFDLElBQUksSUFBSSxDQUFDO0lBQ3BHLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsb0JBQW9CLENBQUMsT0FBbUI7UUFDL0MseURBQXlEO1FBQ3pELElBQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLElBQUksU0FBUyxLQUFLLElBQUksRUFBRTtZQUN0QixPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsdURBQXVEO1FBQ3ZELE9BQU8sU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBQSxJQUFJO1lBQ25DLDBEQUEwRDtZQUMxRCxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNqQyxPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsdUJBQXVCO1lBQ3ZCLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTO2dCQUM1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBeEMsQ0FBd0MsQ0FBQyxFQUFFO2dCQUN6RSxPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0Qsb0NBQW9DO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSTtnQkFDaEQsdUNBQXVDO2dCQUN2QyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssa0JBQWtCLEVBQUU7b0JBQ3hFLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2dCQUNELDJDQUEyQztnQkFDM0MsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRTtvQkFDekYsT0FBTyxLQUFLLENBQUM7aUJBQ2Q7Z0JBQ0QsMkJBQTJCO2dCQUMzQixPQUFPLElBQUksQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7UUFDRSwrQkFBb0IsS0FBcUI7WUFBckIsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFBRyxDQUFDO1FBRTdDLG1DQUFHLEdBQUgsVUFBSSxNQUFzQjs7WUFBRSxvQkFBMEM7aUJBQTFDLFVBQTBDLEVBQTFDLHFCQUEwQyxFQUExQyxJQUEwQztnQkFBMUMsbUNBQTBDOzs7Z0JBQ3BFLEtBQXFCLElBQUEsZUFBQSxpQkFBQSxVQUFVLENBQUEsc0NBQUEsOERBQUU7b0JBQXJCLElBQUEsZ0NBQUk7b0JBQ2QsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUN0QyxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUU7d0JBQzVCLFVBQVUsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO3FCQUN2RDtvQkFFRCxrRUFBa0U7b0JBQ2xFLElBQUksVUFBVSxLQUFLLFNBQVMsSUFBSSxDQUFDLHNCQUFTLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO3dCQUMvRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7cUJBQzlCO2lCQUNGOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBaEJELElBZ0JDO0lBaEJZLHNEQUFxQjtJQWtCbEMsU0FBUyx1QkFBdUIsQ0FBQyxPQUE0QjtRQUMzRCxPQUFPLE9BQU8sQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLENBQUM7SUFDaEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtHZW5lcmF0ZWRGaWxlLCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4uL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHtub2NvbGxhcHNlSGFja30gZnJvbSAnLi4vdHJhbnNmb3JtZXJzL25vY29sbGFwc2VfaGFjayc7XG5pbXBvcnQge3ZlcmlmeVN1cHBvcnRlZFR5cGVTY3JpcHRWZXJzaW9ufSBmcm9tICcuLi90eXBlc2NyaXB0X3N1cHBvcnQnO1xuXG5pbXBvcnQge0NvbXBvbmVudERlY29yYXRvckhhbmRsZXIsIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIsIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyLCBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIsIE5vb3BSZWZlcmVuY2VzUmVnaXN0cnksIFBpcGVEZWNvcmF0b3JIYW5kbGVyLCBSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4vYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBJbXBvcnRHcmFwaH0gZnJvbSAnLi9jeWNsZXMnO1xuaW1wb3J0IHtFcnJvckNvZGUsIG5nRXJyb3JDb2RlfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RmxhdEluZGV4R2VuZXJhdG9yLCBSZWZlcmVuY2VHcmFwaCwgY2hlY2tGb3JQcml2YXRlRXhwb3J0cywgZmluZEZsYXRJbmRleEVudHJ5UG9pbnR9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgTG9naWNhbEZpbGVTeXN0ZW0sIGFic29sdXRlRnJvbX0gZnJvbSAnLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0Fic29sdXRlTW9kdWxlU3RyYXRlZ3ksIEFsaWFzU3RyYXRlZ3ksIEFsaWFzaW5nSG9zdCwgRGVmYXVsdEltcG9ydFRyYWNrZXIsIEZpbGVUb01vZHVsZUFsaWFzaW5nSG9zdCwgRmlsZVRvTW9kdWxlSG9zdCwgRmlsZVRvTW9kdWxlU3RyYXRlZ3ksIEltcG9ydFJld3JpdGVyLCBMb2NhbElkZW50aWZpZXJTdHJhdGVneSwgTG9naWNhbFByb2plY3RTdHJhdGVneSwgTW9kdWxlUmVzb2x2ZXIsIE5vb3BJbXBvcnRSZXdyaXRlciwgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdCwgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5LCBSZWZlcmVuY2VFbWl0dGVyLCBSZWxhdGl2ZVBhdGhTdHJhdGVneX0gZnJvbSAnLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxEcml2ZXJ9IGZyb20gJy4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtJbmRleGVkQ29tcG9uZW50LCBJbmRleGluZ0NvbnRleHR9IGZyb20gJy4vaW5kZXhlcic7XG5pbXBvcnQge2dlbmVyYXRlQW5hbHlzaXN9IGZyb20gJy4vaW5kZXhlci9zcmMvdHJhbnNmb3JtJztcbmltcG9ydCB7Q29tcG91bmRNZXRhZGF0YVJlYWRlciwgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBEdHNNZXRhZGF0YVJlYWRlciwgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlcn0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnNTY2FubmVyfSBmcm9tICcuL21vZHVsZXdpdGhwcm92aWRlcnMnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Tk9PUF9QRVJGX1JFQ09SREVSLCBQZXJmUmVjb3JkZXIsIFBlcmZUcmFja2VyfSBmcm9tICcuL3BlcmYnO1xuaW1wb3J0IHtUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0hvc3RSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9yZXNvdXJjZV9sb2FkZXInO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXIsIGVudHJ5UG9pbnRLZXlGb3J9IGZyb20gJy4vcm91dGluZyc7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBDb21wb3VuZENvbXBvbmVudFNjb3BlUmVhZGVyLCBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcn0gZnJvbSAnLi9zY29wZSc7XG5pbXBvcnQge0ZhY3RvcnlHZW5lcmF0b3IsIEZhY3RvcnlUcmFja2VyLCBHZW5lcmF0ZWRTaGltc0hvc3RXcmFwcGVyLCBTaGltR2VuZXJhdG9yLCBTdW1tYXJ5R2VuZXJhdG9yLCBUeXBlQ2hlY2tTaGltR2VuZXJhdG9yLCBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtfSBmcm9tICcuL3NoaW1zJztcbmltcG9ydCB7aXZ5U3dpdGNoVHJhbnNmb3JtfSBmcm9tICcuL3N3aXRjaCc7XG5pbXBvcnQge0RlY29yYXRvckhhbmRsZXIsIER0c1RyYW5zZm9ybVJlZ2lzdHJ5LCBUcmFpdENvbXBpbGVyLCBkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnksIGl2eVRyYW5zZm9ybUZhY3Rvcnl9IGZyb20gJy4vdHJhbnNmb3JtJztcbmltcG9ydCB7YWxpYXNUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL3RyYW5zZm9ybS9zcmMvYWxpYXMnO1xuaW1wb3J0IHtUeXBlQ2hlY2tDb250ZXh0LCBUeXBlQ2hlY2tpbmdDb25maWcsIHR5cGVDaGVja0ZpbGVQYXRofSBmcm9tICcuL3R5cGVjaGVjayc7XG5pbXBvcnQge25vcm1hbGl6ZVNlcGFyYXRvcnN9IGZyb20gJy4vdXRpbC9zcmMvcGF0aCc7XG5pbXBvcnQge2dldFJvb3REaXJzLCBnZXRTb3VyY2VGaWxlT3JOdWxsLCBpc0R0c1BhdGgsIHJlc29sdmVNb2R1bGVOYW1lfSBmcm9tICcuL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgY2xhc3MgTmd0c2NQcm9ncmFtIGltcGxlbWVudHMgYXBpLlByb2dyYW0ge1xuICBwcml2YXRlIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJpdmF0ZSByZXVzZVRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcHJpdmF0ZSByZXNvdXJjZU1hbmFnZXI6IEhvc3RSZXNvdXJjZUxvYWRlcjtcbiAgcHJpdmF0ZSBjb21waWxhdGlvbjogVHJhaXRDb21waWxlcnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIHByaXZhdGUgX2NvcmVJbXBvcnRzRnJvbTogdHMuU291cmNlRmlsZXxudWxsfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfcmVmbGVjdG9yOiBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIF9pc0NvcmU6IGJvb2xlYW58dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICBwcml2YXRlIHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuICBwcml2YXRlIGNsb3N1cmVDb21waWxlckVuYWJsZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgZW50cnlQb2ludDogdHMuU291cmNlRmlsZXxudWxsO1xuICBwcml2YXRlIGV4cG9ydFJlZmVyZW5jZUdyYXBoOiBSZWZlcmVuY2VHcmFwaHxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBmbGF0SW5kZXhHZW5lcmF0b3I6IEZsYXRJbmRleEdlbmVyYXRvcnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSByb3V0ZUFuYWx5emVyOiBOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5fG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgY29uc3RydWN0aW9uRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcjtcbiAgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyO1xuICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyfG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcnxudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBmaWxlVG9Nb2R1bGVIb3N0OiBGaWxlVG9Nb2R1bGVIb3N0fG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRlZmF1bHRJbXBvcnRUcmFja2VyOiBEZWZhdWx0SW1wb3J0VHJhY2tlcjtcbiAgcHJpdmF0ZSBwZXJmUmVjb3JkZXI6IFBlcmZSZWNvcmRlciA9IE5PT1BfUEVSRl9SRUNPUkRFUjtcbiAgcHJpdmF0ZSBwZXJmVHJhY2tlcjogUGVyZlRyYWNrZXJ8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgaW5jcmVtZW50YWxEcml2ZXI6IEluY3JlbWVudGFsRHJpdmVyO1xuICBwcml2YXRlIHR5cGVDaGVja0ZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aDtcbiAgcHJpdmF0ZSBmYWN0b3J5VHJhY2tlcjogRmFjdG9yeVRyYWNrZXJ8bnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+fG51bGw7XG4gIHByaXZhdGUgZHRzVHJhbnNmb3JtczogRHRzVHJhbnNmb3JtUmVnaXN0cnl8bnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbXdwU2Nhbm5lcjogTW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXJ8bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBob3N0OiBhcGkuQ29tcGlsZXJIb3N0LCBvbGRQcm9ncmFtPzogTmd0c2NQcm9ncmFtKSB7XG4gICAgaWYgKCFvcHRpb25zLmRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrKSB7XG4gICAgICB2ZXJpZnlTdXBwb3J0ZWRUeXBlU2NyaXB0VmVyc2lvbigpO1xuICAgIH1cblxuICAgIGlmIChzaG91bGRFbmFibGVQZXJmVHJhY2luZyhvcHRpb25zKSkge1xuICAgICAgdGhpcy5wZXJmVHJhY2tlciA9IFBlcmZUcmFja2VyLnplcm9lZFRvTm93KCk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlciA9IHRoaXMucGVyZlRyYWNrZXI7XG4gICAgfVxuXG4gICAgdGhpcy5tb2RpZmllZFJlc291cmNlRmlsZXMgPVxuICAgICAgICB0aGlzLmhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzICYmIHRoaXMuaG9zdC5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMoKSB8fCBudWxsO1xuICAgIHRoaXMucm9vdERpcnMgPSBnZXRSb290RGlycyhob3N0LCBvcHRpb25zKTtcbiAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgPSAhIW9wdGlvbnMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI7XG4gICAgdGhpcy5yZXNvdXJjZU1hbmFnZXIgPSBuZXcgSG9zdFJlc291cmNlTG9hZGVyKGhvc3QsIG9wdGlvbnMpO1xuICAgIC8vIFRPRE8oYWx4aHViKTogcmVtb3ZlIHRoZSBmYWxsYmFjayB0byBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzIGFmdGVyIHZlcmlmeWluZyB0aGF0IHRoZSByZXN0IG9mXG4gICAgLy8gb3VyIGJ1aWxkIHRvb2xpbmcgaXMgbm8gbG9uZ2VyIHJlbHlpbmcgb24gaXQuXG4gICAgY29uc3QgYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyA9IG9wdGlvbnMuYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyB8fCBmYWxzZTtcbiAgICBjb25zdCBzaG91bGRHZW5lcmF0ZUZhY3RvcnlTaGltcyA9IG9wdGlvbnMuZ2VuZXJhdGVOZ0ZhY3RvcnlTaGltcyAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgb3B0aW9ucy5nZW5lcmF0ZU5nRmFjdG9yeVNoaW1zIDpcbiAgICAgICAgYWxsb3dFbXB0eUNvZGVnZW5GaWxlcztcbiAgICBjb25zdCBzaG91bGRHZW5lcmF0ZVN1bW1hcnlTaGltcyA9IG9wdGlvbnMuZ2VuZXJhdGVOZ1N1bW1hcnlTaGltcyAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgb3B0aW9ucy5nZW5lcmF0ZU5nU3VtbWFyeVNoaW1zIDpcbiAgICAgICAgYWxsb3dFbXB0eUNvZGVnZW5GaWxlcztcbiAgICBjb25zdCBub3JtYWxpemVkUm9vdE5hbWVzID0gcm9vdE5hbWVzLm1hcChuID0+IGFic29sdXRlRnJvbShuKSk7XG4gICAgaWYgKGhvc3QuZmlsZU5hbWVUb01vZHVsZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5maWxlVG9Nb2R1bGVIb3N0ID0gaG9zdCBhcyBGaWxlVG9Nb2R1bGVIb3N0O1xuICAgIH1cbiAgICBsZXQgcm9vdEZpbGVzID0gWy4uLnJvb3ROYW1lc107XG5cbiAgICBjb25zdCBnZW5lcmF0b3JzOiBTaGltR2VuZXJhdG9yW10gPSBbXTtcbiAgICBsZXQgc3VtbWFyeUdlbmVyYXRvcjogU3VtbWFyeUdlbmVyYXRvcnxudWxsID0gbnVsbDtcbiAgICBpZiAoc2hvdWxkR2VuZXJhdGVTdW1tYXJ5U2hpbXMpIHtcbiAgICAgIC8vIFN1bW1hcnkgZ2VuZXJhdGlvbi5cbiAgICAgIHN1bW1hcnlHZW5lcmF0b3IgPSBTdW1tYXJ5R2VuZXJhdG9yLmZvclJvb3RGaWxlcyhub3JtYWxpemVkUm9vdE5hbWVzKTtcbiAgICAgIGdlbmVyYXRvcnMucHVzaChzdW1tYXJ5R2VuZXJhdG9yKTtcbiAgICB9XG5cbiAgICBpZiAoc2hvdWxkR2VuZXJhdGVGYWN0b3J5U2hpbXMpIHtcbiAgICAgIC8vIEZhY3RvcnkgZ2VuZXJhdGlvbi5cbiAgICAgIGNvbnN0IGZhY3RvcnlHZW5lcmF0b3IgPSBGYWN0b3J5R2VuZXJhdG9yLmZvclJvb3RGaWxlcyhub3JtYWxpemVkUm9vdE5hbWVzKTtcbiAgICAgIGNvbnN0IGZhY3RvcnlGaWxlTWFwID0gZmFjdG9yeUdlbmVyYXRvci5mYWN0b3J5RmlsZU1hcDtcblxuICAgICAgY29uc3QgZmFjdG9yeUZpbGVOYW1lcyA9IEFycmF5LmZyb20oZmFjdG9yeUZpbGVNYXAua2V5cygpKTtcbiAgICAgIHJvb3RGaWxlcy5wdXNoKC4uLmZhY3RvcnlGaWxlTmFtZXMpO1xuICAgICAgZ2VuZXJhdG9ycy5wdXNoKGZhY3RvcnlHZW5lcmF0b3IpO1xuXG4gICAgICB0aGlzLmZhY3RvcnlUcmFja2VyID0gbmV3IEZhY3RvcnlUcmFja2VyKGZhY3RvcnlHZW5lcmF0b3IpO1xuICAgIH1cblxuICAgIC8vIERvbmUgc2VwYXJhdGVseSB0byBwcmVzZXJ2ZSB0aGUgb3JkZXIgb2YgZmFjdG9yeSBmaWxlcyBiZWZvcmUgc3VtbWFyeSBmaWxlcyBpbiByb290RmlsZXMuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB2YWxpZGF0ZSB0aGF0IHRoaXMgaXMgbmVjZXNzYXJ5LlxuICAgIGlmIChzaG91bGRHZW5lcmF0ZVN1bW1hcnlTaGltcykge1xuICAgICAgcm9vdEZpbGVzLnB1c2goLi4uc3VtbWFyeUdlbmVyYXRvciAhLmdldFN1bW1hcnlGaWxlTmFtZXMoKSk7XG4gICAgfVxuXG4gICAgdGhpcy50eXBlQ2hlY2tGaWxlUGF0aCA9IHR5cGVDaGVja0ZpbGVQYXRoKHRoaXMucm9vdERpcnMpO1xuICAgIGdlbmVyYXRvcnMucHVzaChuZXcgVHlwZUNoZWNrU2hpbUdlbmVyYXRvcih0aGlzLnR5cGVDaGVja0ZpbGVQYXRoKSk7XG4gICAgcm9vdEZpbGVzLnB1c2godGhpcy50eXBlQ2hlY2tGaWxlUGF0aCk7XG5cbiAgICBsZXQgZW50cnlQb2ludDogQWJzb2x1dGVGc1BhdGh8bnVsbCA9IG51bGw7XG4gICAgaWYgKG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUgIT0gbnVsbCAmJiBvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlICE9PSAnJykge1xuICAgICAgZW50cnlQb2ludCA9IGZpbmRGbGF0SW5kZXhFbnRyeVBvaW50KG5vcm1hbGl6ZWRSb290TmFtZXMpO1xuICAgICAgaWYgKGVudHJ5UG9pbnQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBlcnJvciBtZXNzYWdlIHRhbGtzIHNwZWNpZmljYWxseSBhYm91dCBoYXZpbmcgYSBzaW5nbGUgLnRzIGZpbGUgaW4gXCJmaWxlc1wiLiBIb3dldmVyXG4gICAgICAgIC8vIHRoZSBhY3R1YWwgbG9naWMgaXMgYSBiaXQgbW9yZSBwZXJtaXNzaXZlLiBJZiBhIHNpbmdsZSBmaWxlIGV4aXN0cywgdGhhdCB3aWxsIGJlIHRha2VuLFxuICAgICAgICAvLyBvdGhlcndpc2UgdGhlIGhpZ2hlc3QgbGV2ZWwgKHNob3J0ZXN0IHBhdGgpIFwiaW5kZXgudHNcIiBmaWxlIHdpbGwgYmUgdXNlZCBhcyB0aGUgZmxhdFxuICAgICAgICAvLyBtb2R1bGUgZW50cnkgcG9pbnQgaW5zdGVhZC4gSWYgbmVpdGhlciBvZiB0aGVzZSBjb25kaXRpb25zIGFwcGx5LCB0aGUgZXJyb3IgYmVsb3cgaXNcbiAgICAgICAgLy8gZ2l2ZW4uXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZSB1c2VyIGlzIG5vdCBpbmZvcm1lZCBhYm91dCB0aGUgXCJpbmRleC50c1wiIG9wdGlvbiBhcyB0aGlzIGJlaGF2aW9yIGlzIGRlcHJlY2F0ZWQgLVxuICAgICAgICAvLyBhbiBleHBsaWNpdCBlbnRyeXBvaW50IHNob3VsZCBhbHdheXMgYmUgc3BlY2lmaWVkLlxuICAgICAgICB0aGlzLmNvbnN0cnVjdGlvbkRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLkNPTkZJR19GTEFUX01PRFVMRV9OT19JTkRFWCksXG4gICAgICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgICAgICdBbmd1bGFyIGNvbXBpbGVyIG9wdGlvbiBcImZsYXRNb2R1bGVPdXRGaWxlXCIgcmVxdWlyZXMgb25lIGFuZCBvbmx5IG9uZSAudHMgZmlsZSBpbiB0aGUgXCJmaWxlc1wiIGZpZWxkLicsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZmxhdE1vZHVsZUlkID0gb3B0aW9ucy5mbGF0TW9kdWxlSWQgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgZmxhdE1vZHVsZU91dEZpbGUgPSBub3JtYWxpemVTZXBhcmF0b3JzKG9wdGlvbnMuZmxhdE1vZHVsZU91dEZpbGUpO1xuICAgICAgICB0aGlzLmZsYXRJbmRleEdlbmVyYXRvciA9XG4gICAgICAgICAgICBuZXcgRmxhdEluZGV4R2VuZXJhdG9yKGVudHJ5UG9pbnQsIGZsYXRNb2R1bGVPdXRGaWxlLCBmbGF0TW9kdWxlSWQpO1xuICAgICAgICBnZW5lcmF0b3JzLnB1c2godGhpcy5mbGF0SW5kZXhHZW5lcmF0b3IpO1xuICAgICAgICByb290RmlsZXMucHVzaCh0aGlzLmZsYXRJbmRleEdlbmVyYXRvci5mbGF0SW5kZXhQYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZ2VuZXJhdG9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBGSVhNRTogUmVtb3ZlIHRoZSBhbnkgY2FzdCBvbmNlIGdvb2dsZTMgaXMgZnVsbHkgb24gVFMzLjYuXG4gICAgICB0aGlzLmhvc3QgPSAobmV3IEdlbmVyYXRlZFNoaW1zSG9zdFdyYXBwZXIoaG9zdCwgZ2VuZXJhdG9ycykgYXMgYW55KTtcbiAgICB9XG5cbiAgICB0aGlzLnRzUHJvZ3JhbSA9XG4gICAgICAgIHRzLmNyZWF0ZVByb2dyYW0ocm9vdEZpbGVzLCBvcHRpb25zLCB0aGlzLmhvc3QsIG9sZFByb2dyYW0gJiYgb2xkUHJvZ3JhbS5yZXVzZVRzUHJvZ3JhbSk7XG4gICAgdGhpcy5yZXVzZVRzUHJvZ3JhbSA9IHRoaXMudHNQcm9ncmFtO1xuXG4gICAgdGhpcy5lbnRyeVBvaW50ID0gZW50cnlQb2ludCAhPT0gbnVsbCA/IGdldFNvdXJjZUZpbGVPck51bGwodGhpcy50c1Byb2dyYW0sIGVudHJ5UG9pbnQpIDogbnVsbDtcbiAgICBjb25zdCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUgPSB0cy5jcmVhdGVNb2R1bGVSZXNvbHV0aW9uQ2FjaGUoXG4gICAgICAgIHRoaXMuaG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCksIGZpbGVOYW1lID0+IHRoaXMuaG9zdC5nZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZSkpO1xuICAgIHRoaXMubW9kdWxlUmVzb2x2ZXIgPVxuICAgICAgICBuZXcgTW9kdWxlUmVzb2x2ZXIodGhpcy50c1Byb2dyYW0sIG9wdGlvbnMsIHRoaXMuaG9zdCwgbW9kdWxlUmVzb2x1dGlvbkNhY2hlKTtcbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcihuZXcgSW1wb3J0R3JhcGgodGhpcy5tb2R1bGVSZXNvbHZlcikpO1xuICAgIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIgPSBuZXcgRGVmYXVsdEltcG9ydFRyYWNrZXIoKTtcbiAgICBpZiAob2xkUHJvZ3JhbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyID0gSW5jcmVtZW50YWxEcml2ZXIuZnJlc2godGhpcy50c1Byb2dyYW0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyID0gSW5jcmVtZW50YWxEcml2ZXIucmVjb25jaWxlKFxuICAgICAgICAgIG9sZFByb2dyYW0ucmV1c2VUc1Byb2dyYW0sIG9sZFByb2dyYW0uaW5jcmVtZW50YWxEcml2ZXIsIHRoaXMudHNQcm9ncmFtLFxuICAgICAgICAgIHRoaXMubW9kaWZpZWRSZXNvdXJjZUZpbGVzKTtcbiAgICB9XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7IHJldHVybiB0aGlzLnRzUHJvZ3JhbTsgfVxuXG4gIGdldFRzT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0T3B0aW9uc0RpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuKTtcbiAgfVxuXG4gIGdldE5nT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rpb25EaWFnbm9zdGljcztcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3MoXG4gICAgICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZXx1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIHJldHVybiB0aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PGFwaS5EaWFnbm9zdGljPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkLFxuICAgICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnx1bmRlZmluZWQpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHtcbiAgICByZXR1cm4gdGhpcy50c1Byb2dyYW0uZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gIH1cblxuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoXG4gICAgICBmaWxlTmFtZT86IHN0cmluZ3x1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gWy4uLmNvbXBpbGF0aW9uLmRpYWdub3N0aWNzLCAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKV07XG4gICAgaWYgKHRoaXMuZW50cnlQb2ludCAhPT0gbnVsbCAmJiB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgICAgICAgdGhpcy5lbnRyeVBvaW50LCB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCB0aGlzLmV4cG9ydFJlZmVyZW5jZUdyYXBoKSk7XG4gICAgfVxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIGFzeW5jIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgIH1cbiAgICBjb25zdCBhbmFseXplU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplJyk7XG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhbmFseXplRmlsZVNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnYW5hbHl6ZUZpbGUnLCBzZik7XG4gICAgICBsZXQgYW5hbHlzaXNQcm9taXNlID0gdGhpcy5jb21waWxhdGlvbiAhLmFuYWx5emVBc3luYyhzZik7XG4gICAgICB0aGlzLnNjYW5Gb3JNd3Aoc2YpO1xuICAgICAgaWYgKGFuYWx5c2lzUHJvbWlzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoYW5hbHl6ZUZpbGVTcGFuKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5wZXJmUmVjb3JkZXIuZW5hYmxlZCkge1xuICAgICAgICBhbmFseXNpc1Byb21pc2UgPSBhbmFseXNpc1Byb21pc2UudGhlbigoKSA9PiB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVGaWxlU3BhbikpO1xuICAgICAgfVxuICAgICAgaWYgKGFuYWx5c2lzUHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHByb21pc2VzLnB1c2goYW5hbHlzaXNQcm9taXNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG5cbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGFuYWx5emVTcGFuKTtcblxuICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24pO1xuICB9XG5cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZ3x1bmRlZmluZWQpOiBhcGkuTGF6eVJvdXRlW10ge1xuICAgIGlmIChlbnRyeVJvdXRlKSB7XG4gICAgICAvLyBOb3RlOlxuICAgICAgLy8gVGhpcyByZXNvbHV0aW9uIHN0ZXAgaXMgaGVyZSB0byBtYXRjaCB0aGUgaW1wbGVtZW50YXRpb24gb2YgdGhlIG9sZCBgQW90Q29tcGlsZXJIb3N0YCAoc2VlXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvNTA3MzJlMTU2L3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMjTDE3NS1MMTg4KS5cbiAgICAgIC8vXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCB3aWxsIGFsd2F5cyBjYWxsIHRoaXMgQVBJIHdpdGggYW4gYWJzb2x1dGUgcGF0aCwgc28gdGhlIHJlc29sdXRpb24gc3RlcCBpc1xuICAgICAgLy8gbm90IG5lY2Vzc2FyeSwgYnV0IGtlZXBpbmcgaXQgYmFja3dhcmRzIGNvbXBhdGlibGUgaW4gY2FzZSBzb21lb25lIGVsc2UgaXMgdXNpbmcgdGhlIEFQSS5cblxuICAgICAgLy8gUmVsYXRpdmUgZW50cnkgcGF0aHMgYXJlIGRpc2FsbG93ZWQuXG4gICAgICBpZiAoZW50cnlSb3V0ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEZhaWxlZCB0byBsaXN0IGxhenkgcm91dGVzOiBSZXNvbHV0aW9uIG9mIHJlbGF0aXZlIHBhdGhzICgke2VudHJ5Um91dGV9KSBpcyBub3Qgc3VwcG9ydGVkLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tcmVsYXRpdmUgZW50cnkgcGF0aHMgZmFsbCBpbnRvIG9uZSBvZiB0aGUgZm9sbG93aW5nIGNhdGVnb3JpZXM6XG4gICAgICAvLyAtIEFic29sdXRlIHN5c3RlbSBwYXRocyAoZS5nLiBgL2Zvby9iYXIvbXktcHJvamVjdC9teS1tb2R1bGVgKSwgd2hpY2ggYXJlIHVuYWZmZWN0ZWQgYnkgdGhlXG4gICAgICAvLyAgIGxvZ2ljIGJlbG93LlxuICAgICAgLy8gLSBQYXRocyB0byBlbnRlcm5hbCBtb2R1bGVzIChlLmcuIGBzb21lLWxpYmApLlxuICAgICAgLy8gLSBQYXRocyBtYXBwZWQgdG8gZGlyZWN0b3JpZXMgaW4gYHRzY29uZmlnLmpzb25gIChlLmcuIGBzaGFyZWQvbXktbW9kdWxlYCkuXG4gICAgICAvLyAgIChTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbCNwYXRoLW1hcHBpbmcuKVxuICAgICAgLy9cbiAgICAgIC8vIEluIGFsbCBjYXNlcyBhYm92ZSwgdGhlIGBjb250YWluaW5nRmlsZWAgYXJndW1lbnQgaXMgaWdub3JlZCwgc28gd2UgY2FuIGp1c3QgdGFrZSB0aGUgZmlyc3RcbiAgICAgIC8vIG9mIHRoZSByb290IGZpbGVzLlxuICAgICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSB0aGlzLnRzUHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKClbMF07XG4gICAgICBjb25zdCBbZW50cnlQYXRoLCBtb2R1bGVOYW1lXSA9IGVudHJ5Um91dGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID1cbiAgICAgICAgICByZXNvbHZlTW9kdWxlTmFtZShlbnRyeVBhdGgsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCwgbnVsbCk7XG5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBlbnRyeVJvdXRlID0gZW50cnlQb2ludEtleUZvcihyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLCBtb2R1bGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIHRoaXMucm91dGVBbmFseXplciAhLmxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGUpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBhcGkuTGlicmFyeVN1bW1hcnk+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG5cbiAgcHJpdmF0ZSBzY2FuRm9yTXdwKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgdGhpcy5td3BTY2FubmVyICEuc2NhbihzZiwge1xuICAgICAgYWRkVHlwZVJlcGxhY2VtZW50OiAobm9kZTogdHMuRGVjbGFyYXRpb24sIHR5cGU6IFR5cGUpOiB2b2lkID0+IHtcbiAgICAgICAgLy8gT25seSBvYnRhaW4gdGhlIHJldHVybiB0eXBlIHRyYW5zZm9ybSBmb3IgdGhlIHNvdXJjZSBmaWxlIG9uY2UgdGhlcmUncyBhIHR5cGUgdG8gcmVwbGFjZSxcbiAgICAgICAgLy8gc28gdGhhdCBubyB0cmFuc2Zvcm0gaXMgYWxsb2NhdGVkIHdoZW4gdGhlcmUncyBub3RoaW5nIHRvIGRvLlxuICAgICAgICB0aGlzLmR0c1RyYW5zZm9ybXMgIS5nZXRSZXR1cm5UeXBlVHJhbnNmb3JtKHNmKS5hZGRUeXBlUmVwbGFjZW1lbnQobm9kZSwgdHlwZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUFuYWx5emVkKCk6IFRyYWl0Q29tcGlsZXIge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGFuYWx5emVTcGFuID0gdGhpcy5wZXJmUmVjb3JkZXIuc3RhcnQoJ2FuYWx5emUnKTtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLnRzUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGFuYWx5emVGaWxlU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdhbmFseXplRmlsZScsIHNmKTtcbiAgICAgICAgdGhpcy5jb21waWxhdGlvbiAhLmFuYWx5emVTeW5jKHNmKTtcbiAgICAgICAgdGhpcy5zY2FuRm9yTXdwKHNmKTtcbiAgICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplRmlsZVNwYW4pO1xuICAgICAgfVxuICAgICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChhbmFseXplU3Bhbik7XG5cbiAgICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb21waWxhdGlvbjtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUNvbXBpbGF0aW9uKGNvbXBpbGF0aW9uOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgY29tcGlsYXRpb24ucmVzb2x2ZSgpO1xuXG4gICAgdGhpcy5yZWNvcmROZ01vZHVsZVNjb3BlRGVwZW5kZW5jaWVzKCk7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBhbmFseXNpcyBpcyBjb21wbGV0ZSBhbmQgdGhlIGNvbXBpbGVyIGNhbiBub3cgY2FsY3VsYXRlIHdoaWNoIGZpbGVzIG5lZWQgdG9cbiAgICAvLyBiZSBlbWl0dGVkLCBzbyBkbyB0aGF0LlxuICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIucmVjb3JkU3VjY2Vzc2Z1bEFuYWx5c2lzKGNvbXBpbGF0aW9uKTtcbiAgfVxuXG4gIGVtaXQob3B0cz86IHtcbiAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICBlbWl0Q2FsbGJhY2s/OiBhcGkuVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogYXBpLlRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrXG4gIH0pOiB0cy5FbWl0UmVzdWx0IHtcbiAgICBjb25zdCBlbWl0Q2FsbGJhY2sgPSBvcHRzICYmIG9wdHMuZW1pdENhbGxiYWNrIHx8IGRlZmF1bHRFbWl0Q2FsbGJhY2s7XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IHdyaXRlRmlsZTogdHMuV3JpdGVGaWxlQ2FsbGJhY2sgPVxuICAgICAgICAoZmlsZU5hbWU6IHN0cmluZywgZGF0YTogc3RyaW5nLCB3cml0ZUJ5dGVPcmRlck1hcms6IGJvb2xlYW4sXG4gICAgICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCkgfCB1bmRlZmluZWQsXG4gICAgICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnwgdW5kZWZpbmVkKSA9PiB7XG4gICAgICAgICAgaWYgKHNvdXJjZUZpbGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFJlY29yZCBzdWNjZXNzZnVsIHdyaXRlcyBmb3IgYW55IGB0cy5Tb3VyY2VGaWxlYCAodGhhdCdzIG5vdCBhIGRlY2xhcmF0aW9uIGZpbGUpXG4gICAgICAgICAgICAvLyB0aGF0J3MgYW4gaW5wdXQgdG8gdGhpcyB3cml0ZS5cbiAgICAgICAgICAgIGZvciAoY29uc3Qgd3JpdHRlblNmIG9mIHNvdXJjZUZpbGVzKSB7XG4gICAgICAgICAgICAgIGlmICh3cml0dGVuU2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIucmVjb3JkU3VjY2Vzc2Z1bEVtaXQod3JpdHRlblNmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCAmJiBmaWxlTmFtZS5lbmRzV2l0aCgnLmpzJykpIHtcbiAgICAgICAgICAgIGRhdGEgPSBub2NvbGxhcHNlSGFjayhkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5ob3N0LndyaXRlRmlsZShmaWxlTmFtZSwgZGF0YSwgd3JpdGVCeXRlT3JkZXJNYXJrLCBvbkVycm9yLCBzb3VyY2VGaWxlcyk7XG4gICAgICAgIH07XG5cbiAgICBjb25zdCBjdXN0b21UcmFuc2Zvcm1zID0gb3B0cyAmJiBvcHRzLmN1c3RvbVRyYW5zZm9ybWVycztcblxuICAgIGNvbnN0IGJlZm9yZVRyYW5zZm9ybXMgPSBbXG4gICAgICBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGNvbXBpbGF0aW9uLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pbXBvcnRSZXdyaXRlciwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkKSxcbiAgICAgIGFsaWFzVHJhbnNmb3JtRmFjdG9yeShjb21waWxhdGlvbi5leHBvcnRTdGF0ZW1lbnRzKSBhcyB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT4sXG4gICAgICB0aGlzLmRlZmF1bHRJbXBvcnRUcmFja2VyLmltcG9ydFByZXNlcnZpbmdUcmFuc2Zvcm1lcigpLFxuICAgIF07XG5cbiAgICBjb25zdCBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXM6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5CdW5kbGV8dHMuU291cmNlRmlsZT5bXSA9IFtdO1xuICAgIGlmICh0aGlzLmR0c1RyYW5zZm9ybXMgIT09IG51bGwpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zVHJhbnNmb3Jtcy5wdXNoKFxuICAgICAgICAgIGRlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeSh0aGlzLmR0c1RyYW5zZm9ybXMsIHRoaXMuaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG5cbiAgICAvLyBPbmx5IGFkZCBhbGlhc2luZyByZS1leHBvcnRzIHRvIHRoZSAuZC50cyBvdXRwdXQgaWYgdGhlIGBBbGlhc2luZ0hvc3RgIHJlcXVlc3RzIGl0LlxuICAgIGlmICh0aGlzLmFsaWFzaW5nSG9zdCAhPT0gbnVsbCAmJiB0aGlzLmFsaWFzaW5nSG9zdC5hbGlhc0V4cG9ydHNJbkR0cykge1xuICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zLnB1c2goYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLmV4cG9ydFN0YXRlbWVudHMpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5mYWN0b3J5VHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgYmVmb3JlVHJhbnNmb3Jtcy5wdXNoKFxuICAgICAgICAgIGdlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm0odGhpcy5mYWN0b3J5VHJhY2tlci5zb3VyY2VJbmZvLCB0aGlzLmltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaChpdnlTd2l0Y2hUcmFuc2Zvcm0pO1xuICAgIGlmIChjdXN0b21UcmFuc2Zvcm1zICYmIGN1c3RvbVRyYW5zZm9ybXMuYmVmb3JlVHMpIHtcbiAgICAgIGJlZm9yZVRyYW5zZm9ybXMucHVzaCguLi5jdXN0b21UcmFuc2Zvcm1zLmJlZm9yZVRzKTtcbiAgICB9XG5cbiAgICBjb25zdCBlbWl0U3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdlbWl0Jyk7XG4gICAgY29uc3QgZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSA9IFtdO1xuXG4gICAgY29uc3QgdHlwZUNoZWNrRmlsZSA9IGdldFNvdXJjZUZpbGVPck51bGwodGhpcy50c1Byb2dyYW0sIHRoaXMudHlwZUNoZWNrRmlsZVBhdGgpO1xuXG4gICAgZm9yIChjb25zdCB0YXJnZXRTb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICh0YXJnZXRTb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlIHx8IHRhcmdldFNvdXJjZUZpbGUgPT09IHR5cGVDaGVja0ZpbGUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmluY3JlbWVudGFsRHJpdmVyLnNhZmVUb1NraXBFbWl0KHRhcmdldFNvdXJjZUZpbGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmaWxlRW1pdFNwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgnZW1pdEZpbGUnLCB0YXJnZXRTb3VyY2VGaWxlKTtcbiAgICAgIGVtaXRSZXN1bHRzLnB1c2goZW1pdENhbGxiYWNrKHtcbiAgICAgICAgdGFyZ2V0U291cmNlRmlsZSxcbiAgICAgICAgcHJvZ3JhbTogdGhpcy50c1Byb2dyYW0sXG4gICAgICAgIGhvc3Q6IHRoaXMuaG9zdCxcbiAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICBlbWl0T25seUR0c0ZpbGVzOiBmYWxzZSwgd3JpdGVGaWxlLFxuICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHtcbiAgICAgICAgICBiZWZvcmU6IGJlZm9yZVRyYW5zZm9ybXMsXG4gICAgICAgICAgYWZ0ZXI6IGN1c3RvbVRyYW5zZm9ybXMgJiYgY3VzdG9tVHJhbnNmb3Jtcy5hZnRlclRzLFxuICAgICAgICAgIGFmdGVyRGVjbGFyYXRpb25zOiBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMsXG4gICAgICAgIH0sXG4gICAgICB9KSk7XG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKGZpbGVFbWl0U3Bhbik7XG4gICAgfVxuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AoZW1pdFNwYW4pO1xuXG4gICAgaWYgKHRoaXMucGVyZlRyYWNrZXIgIT09IG51bGwgJiYgdGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5wZXJmVHJhY2tlci5zZXJpYWxpemVUb0ZpbGUodGhpcy5vcHRpb25zLnRyYWNlUGVyZm9ybWFuY2UsIHRoaXMuaG9zdCk7XG4gICAgfVxuXG4gICAgLy8gUnVuIHRoZSBlbWl0LCBpbmNsdWRpbmcgYSBjdXN0b20gdHJhbnNmb3JtZXIgdGhhdCB3aWxsIGRvd25sZXZlbCB0aGUgSXZ5IGRlY29yYXRvcnMgaW4gY29kZS5cbiAgICByZXR1cm4gKChvcHRzICYmIG9wdHMubWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrKSB8fCBtZXJnZUVtaXRSZXN1bHRzKShlbWl0UmVzdWx0cyk7XG4gIH1cblxuICBwcml2YXRlIGdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgLy8gU2tpcCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGlmIGl0J3MgZGlzYWJsZWQuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pdnlUZW1wbGF0ZVR5cGVDaGVjayA9PT0gZmFsc2UgJiZcbiAgICAgICAgdGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjayAhPT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gUnVuIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcuXG5cbiAgICAvLyBGaXJzdCBzZWxlY3QgYSB0eXBlLWNoZWNraW5nIGNvbmZpZ3VyYXRpb24sIGJhc2VkIG9uIHdoZXRoZXIgZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGlzXG4gICAgLy8gcmVxdWVzdGVkLlxuICAgIGxldCB0eXBlQ2hlY2tpbmdDb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZztcbiAgICBpZiAodGhpcy5vcHRpb25zLmZ1bGxUZW1wbGF0ZVR5cGVDaGVjaykge1xuICAgICAgY29uc3Qgc3RyaWN0VGVtcGxhdGVzID0gISF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzO1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICBjaGVja1F1ZXJpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1RlbXBsYXRlQm9kaWVzOiB0cnVlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIEV2ZW4gaW4gZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIERPTSBiaW5kaW5nIGNoZWNrcyBhcmUgbm90IHF1aXRlIHJlYWR5IHlldC5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIENoZWNraW5nIG9mIERPTSBldmVudHMgY3VycmVudGx5IGhhcyBhbiBhZHZlcnNlIGVmZmVjdCBvbiBkZXZlbG9wZXIgZXhwZXJpZW5jZSxcbiAgICAgICAgLy8gZS5nLiBmb3IgYDxpbnB1dCAoYmx1cik9XCJ1cGRhdGUoJGV2ZW50LnRhcmdldC52YWx1ZSlcIj5gIGVuYWJsaW5nIHRoaXMgY2hlY2sgcmVzdWx0cyBpbjpcbiAgICAgICAgLy8gLSBlcnJvciBUUzI1MzE6IE9iamVjdCBpcyBwb3NzaWJseSAnbnVsbCcuXG4gICAgICAgIC8vIC0gZXJyb3IgVFMyMzM5OiBQcm9wZXJ0eSAndmFsdWUnIGRvZXMgbm90IGV4aXN0IG9uIHR5cGUgJ0V2ZW50VGFyZ2V0Jy5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIE5vbi1ET00gcmVmZXJlbmNlcyBoYXZlIHRoZSBjb3JyZWN0IHR5cGUgaW4gVmlldyBFbmdpbmUgc28gdGhlcmUgaXMgbm8gc3RyaWN0bmVzcyBmbGFnLlxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IHRydWUsXG4gICAgICAgIC8vIFBpcGVzIGFyZSBjaGVja2VkIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogdHJ1ZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnID0ge1xuICAgICAgICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogZmFsc2UsXG4gICAgICAgIGNoZWNrUXVlcmllczogZmFsc2UsXG4gICAgICAgIGNoZWNrVGVtcGxhdGVCb2RpZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBzdHJpY3ROdWxsSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQXR0cmlidXRlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZlBpcGVzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogZmFsc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEFwcGx5IGV4cGxpY2l0bHkgY29uZmlndXJlZCBzdHJpY3RuZXNzIGZsYWdzIG9uIHRvcCBvZiB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgLy8gYmFzZWQgb24gXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIi5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mSW5wdXRCaW5kaW5ncyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzID0gdGhpcy5vcHRpb25zLnN0cmljdElucHV0VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbElucHV0VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdE51bGxJbnB1dEJpbmRpbmdzID0gdGhpcy5vcHRpb25zLnN0cmljdE51bGxJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdE91dHB1dEV2ZW50VHlwZXM7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3REb21FdmVudFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkRvbUV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3REb21FdmVudFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLnN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3REb21Mb2NhbFJlZlR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkRvbVJlZmVyZW5jZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0RG9tTG9jYWxSZWZUeXBlcztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RBdHRyaWJ1dGVUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzID0gdGhpcy5vcHRpb25zLnN0cmljdEF0dHJpYnV0ZVR5cGVzO1xuICAgIH1cblxuICAgIC8vIEV4ZWN1dGUgdGhlIHR5cGVDaGVjayBwaGFzZSBvZiBlYWNoIGRlY29yYXRvciBpbiB0aGUgcHJvZ3JhbS5cbiAgICBjb25zdCBwcmVwU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCd0eXBlQ2hlY2tQcmVwJyk7XG4gICAgY29uc3QgY3R4ID0gbmV3IFR5cGVDaGVja0NvbnRleHQodHlwZUNoZWNraW5nQ29uZmlnLCB0aGlzLnJlZkVtaXR0ZXIgISwgdGhpcy50eXBlQ2hlY2tGaWxlUGF0aCk7XG4gICAgY29tcGlsYXRpb24udHlwZUNoZWNrKGN0eCk7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuc3RvcChwcmVwU3Bhbik7XG5cbiAgICAvLyBHZXQgdGhlIGRpYWdub3N0aWNzLlxuICAgIGNvbnN0IHR5cGVDaGVja1NwYW4gPSB0aGlzLnBlcmZSZWNvcmRlci5zdGFydCgndHlwZUNoZWNrRGlhZ25vc3RpY3MnKTtcbiAgICBjb25zdCB7ZGlhZ25vc3RpY3MsIHByb2dyYW19ID1cbiAgICAgICAgY3R4LmNhbGN1bGF0ZVRlbXBsYXRlRGlhZ25vc3RpY3ModGhpcy50c1Byb2dyYW0sIHRoaXMuaG9zdCwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLnBlcmZSZWNvcmRlci5zdG9wKHR5cGVDaGVja1NwYW4pO1xuICAgIHRoaXMucmV1c2VUc1Byb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgZ2V0SW5kZXhlZENvbXBvbmVudHMoKTogTWFwPHRzLkRlY2xhcmF0aW9uLCBJbmRleGVkQ29tcG9uZW50PiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBJbmRleGluZ0NvbnRleHQoKTtcbiAgICBjb21waWxhdGlvbi5pbmRleChjb250ZXh0KTtcbiAgICByZXR1cm4gZ2VuZXJhdGVBbmFseXNpcyhjb250ZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgbWFrZUNvbXBpbGF0aW9uKCk6IFRyYWl0Q29tcGlsZXIge1xuICAgIGNvbnN0IGNoZWNrZXIgPSB0aGlzLnRzUHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBSZWZlcmVuY2VFbWl0dGVyLlxuICAgIGlmICh0aGlzLmZpbGVUb01vZHVsZUhvc3QgPT09IG51bGwgfHwgIXRoaXMub3B0aW9ucy5fdXNlSG9zdEZvckltcG9ydEdlbmVyYXRpb24pIHtcbiAgICAgIGxldCBsb2NhbEltcG9ydFN0cmF0ZWd5OiBSZWZlcmVuY2VFbWl0U3RyYXRlZ3k7XG5cbiAgICAgIC8vIFRoZSBzdHJhdGVneSB1c2VkIGZvciBsb2NhbCwgaW4tcHJvamVjdCBpbXBvcnRzIGRlcGVuZHMgb24gd2hldGhlciBUUyBoYXMgYmVlbiBjb25maWd1cmVkXG4gICAgICAvLyB3aXRoIHJvb3REaXJzLiBJZiBzbywgdGhlbiBtdWx0aXBsZSBkaXJlY3RvcmllcyBtYXkgYmUgbWFwcGVkIGluIHRoZSBzYW1lIFwibW9kdWxlXG4gICAgICAvLyBuYW1lc3BhY2VcIiBhbmQgdGhlIGxvZ2ljIG9mIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBpcyByZXF1aXJlZCB0byBnZW5lcmF0ZSBjb3JyZWN0XG4gICAgICAvLyBpbXBvcnRzIHdoaWNoIG1heSBjcm9zcyB0aGVzZSBtdWx0aXBsZSBkaXJlY3Rvcmllcy4gT3RoZXJ3aXNlLCBwbGFpbiByZWxhdGl2ZSBpbXBvcnRzIGFyZVxuICAgICAgLy8gc3VmZmljaWVudC5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucm9vdERpciAhPT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgKHRoaXMub3B0aW9ucy5yb290RGlycyAhPT0gdW5kZWZpbmVkICYmIHRoaXMub3B0aW9ucy5yb290RGlycy5sZW5ndGggPiAwKSkge1xuICAgICAgICAvLyByb290RGlycyBsb2dpYyBpcyBpbiBlZmZlY3QgLSB1c2UgdGhlIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YCBmb3IgaW4tcHJvamVjdCByZWxhdGl2ZVxuICAgICAgICAvLyBpbXBvcnRzLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID1cbiAgICAgICAgICAgIG5ldyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5KHRoaXMucmVmbGVjdG9yLCBuZXcgTG9naWNhbEZpbGVTeXN0ZW0odGhpcy5yb290RGlycykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gUGxhaW4gcmVsYXRpdmUgaW1wb3J0cyBhcmUgYWxsIHRoYXQncyBuZWVkZWQuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3kgPSBuZXcgUmVsYXRpdmVQYXRoU3RyYXRlZ3kodGhpcy5yZWZsZWN0b3IpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IGRvZXNuJ3QgaGF2ZSBmaWxlTmFtZVRvTW9kdWxlTmFtZSwgc28gYnVpbGQgYW4gTlBNLWNlbnRyaWMgcmVmZXJlbmNlXG4gICAgICAvLyByZXNvbHV0aW9uIHN0cmF0ZWd5LlxuICAgICAgdGhpcy5yZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBOZXh0LCBhdHRlbXB0IHRvIHVzZSBhbiBhYnNvbHV0ZSBpbXBvcnQuXG4gICAgICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KHRoaXMudHNQcm9ncmFtLCBjaGVja2VyLCB0aGlzLm1vZHVsZVJlc29sdmVyLCB0aGlzLnJlZmxlY3RvciksXG4gICAgICAgIC8vIEZpbmFsbHksIGNoZWNrIGlmIHRoZSByZWZlcmVuY2UgaXMgYmVpbmcgd3JpdHRlbiBpbnRvIGEgZmlsZSB3aXRoaW4gdGhlIHByb2plY3QncyAudHNcbiAgICAgICAgLy8gc291cmNlcywgYW5kIHVzZSBhIHJlbGF0aXZlIGltcG9ydCBpZiBzby4gSWYgdGhpcyBmYWlscywgUmVmZXJlbmNlRW1pdHRlciB3aWxsIHRocm93XG4gICAgICAgIC8vIGFuIGVycm9yLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5LFxuICAgICAgXSk7XG5cbiAgICAgIC8vIElmIGFuIGVudHJ5cG9pbnQgaXMgcHJlc2VudCwgdGhlbiBhbGwgdXNlciBpbXBvcnRzIHNob3VsZCBiZSBkaXJlY3RlZCB0aHJvdWdoIHRoZVxuICAgICAgLy8gZW50cnlwb2ludCBhbmQgcHJpdmF0ZSBleHBvcnRzIGFyZSBub3QgbmVlZGVkLiBUaGUgY29tcGlsZXIgd2lsbCB2YWxpZGF0ZSB0aGF0IGFsbCBwdWJsaWNseVxuICAgICAgLy8gdmlzaWJsZSBkaXJlY3RpdmVzL3BpcGVzIGFyZSBpbXBvcnRhYmxlIHZpYSB0aGlzIGVudHJ5cG9pbnQuXG4gICAgICBpZiAodGhpcy5lbnRyeVBvaW50ID09PSBudWxsICYmIHRoaXMub3B0aW9ucy5nZW5lcmF0ZURlZXBSZWV4cG9ydHMgPT09IHRydWUpIHtcbiAgICAgICAgLy8gTm8gZW50cnlwb2ludCBpcyBwcmVzZW50IGFuZCBkZWVwIHJlLWV4cG9ydHMgd2VyZSByZXF1ZXN0ZWQsIHNvIGNvbmZpZ3VyZSB0aGUgYWxpYXNpbmdcbiAgICAgICAgLy8gc3lzdGVtIHRvIGdlbmVyYXRlIHRoZW0uXG4gICAgICAgIHRoaXMuYWxpYXNpbmdIb3N0ID0gbmV3IFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3QodGhpcy5yZWZsZWN0b3IpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IHN1cHBvcnRzIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyB1c2UgdGhhdCB0byBlbWl0IGltcG9ydHMuXG4gICAgICB0aGlzLnJlZkVtaXR0ZXIgPSBuZXcgUmVmZXJlbmNlRW1pdHRlcihbXG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gdXNlIGxvY2FsIGlkZW50aWZpZXJzIGlmIGF2YWlsYWJsZS5cbiAgICAgICAgbmV3IExvY2FsSWRlbnRpZmllclN0cmF0ZWd5KCksXG4gICAgICAgIC8vIFRoZW4gdXNlIGFsaWFzZWQgcmVmZXJlbmNlcyAodGhpcyBpcyBhIHdvcmthcm91bmQgdG8gU3RyaWN0RGVwcyBjaGVja3MpLlxuICAgICAgICBuZXcgQWxpYXNTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBmaWxlTmFtZVRvTW9kdWxlTmFtZSB0byBlbWl0IGltcG9ydHMuXG4gICAgICAgIG5ldyBGaWxlVG9Nb2R1bGVTdHJhdGVneSh0aGlzLnJlZmxlY3RvciwgdGhpcy5maWxlVG9Nb2R1bGVIb3N0KSxcbiAgICAgIF0pO1xuICAgICAgdGhpcy5hbGlhc2luZ0hvc3QgPSBuZXcgRmlsZVRvTW9kdWxlQWxpYXNpbmdIb3N0KHRoaXMuZmlsZVRvTW9kdWxlSG9zdCk7XG4gICAgfVxuXG4gICAgY29uc3QgZXZhbHVhdG9yID1cbiAgICAgICAgbmV3IFBhcnRpYWxFdmFsdWF0b3IodGhpcy5yZWZsZWN0b3IsIGNoZWNrZXIsIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIuZGVwR3JhcGgpO1xuICAgIGNvbnN0IGR0c1JlYWRlciA9IG5ldyBEdHNNZXRhZGF0YVJlYWRlcihjaGVja2VyLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVnaXN0cnkgPSBuZXcgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5KCk7XG4gICAgY29uc3QgbG9jYWxNZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlciA9IGxvY2FsTWV0YVJlZ2lzdHJ5O1xuICAgIGNvbnN0IGRlcFNjb3BlUmVhZGVyID0gbmV3IE1ldGFkYXRhRHRzTW9kdWxlU2NvcGVSZXNvbHZlcihkdHNSZWFkZXIsIHRoaXMuYWxpYXNpbmdIb3N0KTtcbiAgICB0aGlzLnNjb3BlUmVnaXN0cnkgPSBuZXcgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5KFxuICAgICAgICBsb2NhbE1ldGFSZWFkZXIsIGRlcFNjb3BlUmVhZGVyLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMuYWxpYXNpbmdIb3N0KTtcbiAgICBjb25zdCBzY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIgPSB0aGlzLnNjb3BlUmVnaXN0cnk7XG4gICAgY29uc3QgbWV0YVJlZ2lzdHJ5ID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeShbbG9jYWxNZXRhUmVnaXN0cnksIHRoaXMuc2NvcGVSZWdpc3RyeV0pO1xuXG4gICAgdGhpcy5tZXRhUmVhZGVyID0gbmV3IENvbXBvdW5kTWV0YWRhdGFSZWFkZXIoW2xvY2FsTWV0YVJlYWRlciwgZHRzUmVhZGVyXSk7XG5cblxuICAgIC8vIElmIGEgZmxhdCBtb2R1bGUgZW50cnlwb2ludCB3YXMgc3BlY2lmaWVkLCB0aGVuIHRyYWNrIHJlZmVyZW5jZXMgdmlhIGEgYFJlZmVyZW5jZUdyYXBoYCBpblxuICAgIC8vIG9yZGVyIHRvIHByb2R1Y2UgcHJvcGVyIGRpYWdub3N0aWNzIGZvciBpbmNvcnJlY3RseSBleHBvcnRlZCBkaXJlY3RpdmVzL3BpcGVzL2V0Yy4gSWYgdGhlcmVcbiAgICAvLyBpcyBubyBmbGF0IG1vZHVsZSBlbnRyeXBvaW50IHRoZW4gZG9uJ3QgcGF5IHRoZSBjb3N0IG9mIHRyYWNraW5nIHJlZmVyZW5jZXMuXG4gICAgbGV0IHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5O1xuICAgIGlmICh0aGlzLmVudHJ5UG9pbnQgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuZXhwb3J0UmVmZXJlbmNlR3JhcGggPSBuZXcgUmVmZXJlbmNlR3JhcGgoKTtcbiAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBSZWZlcmVuY2VHcmFwaEFkYXB0ZXIodGhpcy5leHBvcnRSZWZlcmVuY2VHcmFwaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5KCk7XG4gICAgfVxuXG4gICAgdGhpcy5yb3V0ZUFuYWx5emVyID0gbmV3IE5nTW9kdWxlUm91dGVBbmFseXplcih0aGlzLm1vZHVsZVJlc29sdmVyLCBldmFsdWF0b3IpO1xuXG4gICAgdGhpcy5kdHNUcmFuc2Zvcm1zID0gbmV3IER0c1RyYW5zZm9ybVJlZ2lzdHJ5KCk7XG5cbiAgICB0aGlzLm13cFNjYW5uZXIgPSBuZXcgTW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXIodGhpcy5yZWZsZWN0b3IsIGV2YWx1YXRvciwgdGhpcy5yZWZFbWl0dGVyKTtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgdW5rbm93bj5bXSA9IFtcbiAgICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgdGhpcy5tZXRhUmVhZGVyICEsIHNjb3BlUmVhZGVyLFxuICAgICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIHRoaXMucmVzb3VyY2VNYW5hZ2VyLCB0aGlzLnJvb3REaXJzLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5wcmVzZXJ2ZVdoaXRlc3BhY2VzIHx8IGZhbHNlLCB0aGlzLm9wdGlvbnMuaTE4blVzZUV4dGVybmFsSWRzICE9PSBmYWxzZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCAhPT0gZmFsc2UsIHRoaXMubW9kdWxlUmVzb2x2ZXIsXG4gICAgICAgICAgdGhpcy5jeWNsZUFuYWx5emVyLCB0aGlzLnJlZkVtaXR0ZXIsIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsXG4gICAgICAgICAgdGhpcy5pbmNyZW1lbnRhbERyaXZlci5kZXBHcmFwaCwgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkKSxcbiAgICAgIC8vIFRPRE8oYWx4aHViKTogdW5kZXJzdGFuZCB3aHkgdGhlIGNhc3QgaGVyZSBpcyBuZWNlc3NhcnkgKHNvbWV0aGluZyB0byBkbyB3aXRoIGBudWxsYCBub3RcbiAgICAgIC8vIGJlaW5nIGFzc2lnbmFibGUgdG8gYHVua25vd25gIHdoZW4gd3JhcHBlZCBpbiBgUmVhZG9ubHlgKS5cbiAgICAgIG5ldyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHRoaXMucmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkKSBhcyBSZWFkb25seTxEZWNvcmF0b3JIYW5kbGVyPHVua25vd24sIHVua25vd24sIHVua25vd24+PixcbiAgICAgIC8vIFBpcGUgaGFuZGxlciBtdXN0IGJlIGJlZm9yZSBpbmplY3RhYmxlIGhhbmRsZXIgaW4gbGlzdCBzbyBwaXBlIGZhY3RvcmllcyBhcmUgcHJpbnRlZFxuICAgICAgLy8gYmVmb3JlIGluamVjdGFibGUgZmFjdG9yaWVzIChzbyBpbmplY3RhYmxlIGZhY3RvcmllcyBjYW4gZGVsZWdhdGUgdG8gdGhlbSlcbiAgICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICB0aGlzLnJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0VHJhY2tlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLnN0cmljdEluamVjdGlvblBhcmFtZXRlcnMgfHwgZmFsc2UpLFxuICAgICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICB0aGlzLnJlZmxlY3RvciwgZXZhbHVhdG9yLCB0aGlzLm1ldGFSZWFkZXIsIG1ldGFSZWdpc3RyeSwgdGhpcy5zY29wZVJlZ2lzdHJ5LFxuICAgICAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSwgdGhpcy5pc0NvcmUsIHRoaXMucm91dGVBbmFseXplciwgdGhpcy5yZWZFbWl0dGVyLCB0aGlzLmZhY3RvcnlUcmFja2VyLFxuICAgICAgICAgIHRoaXMuZGVmYXVsdEltcG9ydFRyYWNrZXIsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCwgdGhpcy5vcHRpb25zLmkxOG5JbkxvY2FsZSksXG4gICAgXTtcblxuICAgIHJldHVybiBuZXcgVHJhaXRDb21waWxlcihcbiAgICAgICAgaGFuZGxlcnMsIHRoaXMucmVmbGVjdG9yLCB0aGlzLnBlcmZSZWNvcmRlciwgdGhpcy5pbmNyZW1lbnRhbERyaXZlcixcbiAgICAgICAgdGhpcy5vcHRpb25zLmNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXMgIT09IGZhbHNlLCB0aGlzLmR0c1RyYW5zZm9ybXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlaWZpZXMgdGhlIGludGVyLWRlcGVuZGVuY2llcyBvZiBOZ01vZHVsZXMgYW5kIHRoZSBjb21wb25lbnRzIHdpdGhpbiB0aGVpciBjb21waWxhdGlvbiBzY29wZXNcbiAgICogaW50byB0aGUgYEluY3JlbWVudGFsRHJpdmVyYCdzIGRlcGVuZGVuY3kgZ3JhcGguXG4gICAqL1xuICBwcml2YXRlIHJlY29yZE5nTW9kdWxlU2NvcGVEZXBlbmRlbmNpZXMoKSB7XG4gICAgY29uc3QgcmVjb3JkU3BhbiA9IHRoaXMucGVyZlJlY29yZGVyLnN0YXJ0KCdyZWNvcmREZXBlbmRlbmNpZXMnKTtcbiAgICBjb25zdCBkZXBHcmFwaCA9IHRoaXMuaW5jcmVtZW50YWxEcml2ZXIuZGVwR3JhcGg7XG5cbiAgICBmb3IgKGNvbnN0IHNjb3BlIG9mIHRoaXMuc2NvcGVSZWdpc3RyeSAhLmdldENvbXBpbGF0aW9uU2NvcGVzKCkpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSBzY29wZS5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBjb25zdCBuZ01vZHVsZUZpbGUgPSBzY29wZS5uZ01vZHVsZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICAgIC8vIEEgY2hhbmdlIHRvIGFueSBkZXBlbmRlbmN5IG9mIHRoZSBkZWNsYXJhdGlvbiBjYXVzZXMgdGhlIGRlY2xhcmF0aW9uIHRvIGJlIGludmFsaWRhdGVkLFxuICAgICAgLy8gd2hpY2ggcmVxdWlyZXMgdGhlIE5nTW9kdWxlIHRvIGJlIGludmFsaWRhdGVkIGFzIHdlbGwuXG4gICAgICBkZXBHcmFwaC5hZGRUcmFuc2l0aXZlRGVwZW5kZW5jeShuZ01vZHVsZUZpbGUsIGZpbGUpO1xuXG4gICAgICAvLyBBIGNoYW5nZSB0byB0aGUgTmdNb2R1bGUgZmlsZSBzaG91bGQgY2F1c2UgdGhlIGRlY2xhcmF0aW9uIGl0c2VsZiB0byBiZSBpbnZhbGlkYXRlZC5cbiAgICAgIGRlcEdyYXBoLmFkZERlcGVuZGVuY3koZmlsZSwgbmdNb2R1bGVGaWxlKTtcblxuICAgICAgY29uc3QgbWV0YSA9IHRoaXMubWV0YVJlYWRlciAhLmdldERpcmVjdGl2ZU1ldGFkYXRhKG5ldyBSZWZlcmVuY2Uoc2NvcGUuZGVjbGFyYXRpb24pKTtcbiAgICAgIGlmIChtZXRhICE9PSBudWxsICYmIG1ldGEuaXNDb21wb25lbnQpIHtcbiAgICAgICAgLy8gSWYgYSBjb21wb25lbnQncyB0ZW1wbGF0ZSBjaGFuZ2VzLCBpdCBtaWdodCBoYXZlIGFmZmVjdGVkIHRoZSBpbXBvcnQgZ3JhcGgsIGFuZCB0aHVzIHRoZVxuICAgICAgICAvLyByZW1vdGUgc2NvcGluZyBmZWF0dXJlIHdoaWNoIGlzIGFjdGl2YXRlZCBpbiB0aGUgZXZlbnQgb2YgcG90ZW50aWFsIGltcG9ydCBjeWNsZXMuIFRodXMsXG4gICAgICAgIC8vIHRoZSBtb2R1bGUgZGVwZW5kcyBub3Qgb25seSBvbiB0aGUgdHJhbnNpdGl2ZSBkZXBlbmRlbmNpZXMgb2YgdGhlIGNvbXBvbmVudCwgYnV0IG9uIGl0c1xuICAgICAgICAvLyByZXNvdXJjZXMgYXMgd2VsbC5cbiAgICAgICAgZGVwR3JhcGguYWRkVHJhbnNpdGl2ZVJlc291cmNlcyhuZ01vZHVsZUZpbGUsIGZpbGUpO1xuXG4gICAgICAgIC8vIEEgY2hhbmdlIHRvIGFueSBkaXJlY3RpdmUvcGlwZSBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUgc2hvdWxkIGNhdXNlIHRoZSBjb21wb25lbnQgdG8gYmVcbiAgICAgICAgLy8gaW52YWxpZGF0ZWQuXG4gICAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIHNjb3BlLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICAvLyBXaGVuIGEgZGlyZWN0aXZlIGluIHNjb3BlIGlzIHVwZGF0ZWQsIHRoZSBjb21wb25lbnQgbmVlZHMgdG8gYmUgcmVjb21waWxlZCBhcyBlLmcuIGFcbiAgICAgICAgICAvLyBzZWxlY3RvciBtYXkgaGF2ZSBjaGFuZ2VkLlxuICAgICAgICAgIGRlcEdyYXBoLmFkZFRyYW5zaXRpdmVEZXBlbmRlbmN5KGZpbGUsIGRpcmVjdGl2ZS5yZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5waXBlcykge1xuICAgICAgICAgIC8vIFdoZW4gYSBwaXBlIGluIHNjb3BlIGlzIHVwZGF0ZWQsIHRoZSBjb21wb25lbnQgbmVlZHMgdG8gYmUgcmVjb21waWxlZCBhcyBlLmcuIHRoZVxuICAgICAgICAgIC8vIHBpcGUncyBuYW1lIG1heSBoYXZlIGNoYW5nZWQuXG4gICAgICAgICAgZGVwR3JhcGguYWRkVHJhbnNpdGl2ZURlcGVuZGVuY3koZmlsZSwgcGlwZS5yZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucGVyZlJlY29yZGVyLnN0b3AocmVjb3JkU3Bhbik7XG4gIH1cblxuICBwcml2YXRlIGdldCByZWZsZWN0b3IoKTogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0IHtcbiAgICBpZiAodGhpcy5fcmVmbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3JlZmxlY3RvciA9IG5ldyBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3QodGhpcy50c1Byb2dyYW0uZ2V0VHlwZUNoZWNrZXIoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yZWZsZWN0b3I7XG4gIH1cblxuICBwcml2YXRlIGdldCBjb3JlSW1wb3J0c0Zyb20oKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICBpZiAodGhpcy5fY29yZUltcG9ydHNGcm9tID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2NvcmVJbXBvcnRzRnJvbSA9IHRoaXMuaXNDb3JlICYmIGdldFIzU3ltYm9sc0ZpbGUodGhpcy50c1Byb2dyYW0pIHx8IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9jb3JlSW1wb3J0c0Zyb207XG4gIH1cblxuICBwcml2YXRlIGdldCBpc0NvcmUoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX2lzQ29yZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9pc0NvcmUgPSBpc0FuZ3VsYXJDb3JlUGFja2FnZSh0aGlzLnRzUHJvZ3JhbSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pc0NvcmU7XG4gIH1cblxuICBwcml2YXRlIGdldCBpbXBvcnRSZXdyaXRlcigpOiBJbXBvcnRSZXdyaXRlciB7XG4gICAgaWYgKHRoaXMuX2ltcG9ydFJld3JpdGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGNvcmVJbXBvcnRzRnJvbSA9IHRoaXMuY29yZUltcG9ydHNGcm9tO1xuICAgICAgdGhpcy5faW1wb3J0UmV3cml0ZXIgPSBjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwgP1xuICAgICAgICAgIG5ldyBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlcihjb3JlSW1wb3J0c0Zyb20uZmlsZU5hbWUpIDpcbiAgICAgICAgICBuZXcgTm9vcEltcG9ydFJld3JpdGVyKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pbXBvcnRSZXdyaXRlcjtcbiAgfVxufVxuXG5jb25zdCBkZWZhdWx0RW1pdENhbGxiYWNrOiBhcGkuVHNFbWl0Q2FsbGJhY2sgPVxuICAgICh7cHJvZ3JhbSwgdGFyZ2V0U291cmNlRmlsZSwgd3JpdGVGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbiwgZW1pdE9ubHlEdHNGaWxlcyxcbiAgICAgIGN1c3RvbVRyYW5zZm9ybWVyc30pID0+XG4gICAgICAgIHByb2dyYW0uZW1pdChcbiAgICAgICAgICAgIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG5cbmZ1bmN0aW9uIG1lcmdlRW1pdFJlc3VsdHMoZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSk6IHRzLkVtaXRSZXN1bHQge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGxldCBlbWl0U2tpcHBlZCA9IGZhbHNlO1xuICBjb25zdCBlbWl0dGVkRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgZXIgb2YgZW1pdFJlc3VsdHMpIHtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmVyLmRpYWdub3N0aWNzKTtcbiAgICBlbWl0U2tpcHBlZCA9IGVtaXRTa2lwcGVkIHx8IGVyLmVtaXRTa2lwcGVkO1xuICAgIGVtaXR0ZWRGaWxlcy5wdXNoKC4uLihlci5lbWl0dGVkRmlsZXMgfHwgW10pKTtcbiAgfVxuXG4gIHJldHVybiB7ZGlhZ25vc3RpY3MsIGVtaXRTa2lwcGVkLCBlbWl0dGVkRmlsZXN9O1xufVxuXG4vKipcbiAqIEZpbmQgdGhlICdyM19zeW1ib2xzLnRzJyBmaWxlIGluIHRoZSBnaXZlbiBgUHJvZ3JhbWAsIG9yIHJldHVybiBgbnVsbGAgaWYgaXQgd2Fzbid0IHRoZXJlLlxuICovXG5mdW5jdGlvbiBnZXRSM1N5bWJvbHNGaWxlKHByb2dyYW06IHRzLlByb2dyYW0pOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZpbmQoZmlsZSA9PiBmaWxlLmZpbGVOYW1lLmluZGV4T2YoJ3IzX3N5bWJvbHMudHMnKSA+PSAwKSB8fCBudWxsO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB0aGUgZ2l2ZW4gYFByb2dyYW1gIGlzIEBhbmd1bGFyL2NvcmUuXG4gKi9cbmZ1bmN0aW9uIGlzQW5ndWxhckNvcmVQYWNrYWdlKHByb2dyYW06IHRzLlByb2dyYW0pOiBib29sZWFuIHtcbiAgLy8gTG9vayBmb3IgaXRzX2p1c3RfYW5ndWxhci50cyBzb21ld2hlcmUgaW4gdGhlIHByb2dyYW0uXG4gIGNvbnN0IHIzU3ltYm9scyA9IGdldFIzU3ltYm9sc0ZpbGUocHJvZ3JhbSk7XG4gIGlmIChyM1N5bWJvbHMgPT09IG51bGwpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBMb29rIGZvciB0aGUgY29uc3RhbnQgSVRTX0pVU1RfQU5HVUxBUiBpbiB0aGF0IGZpbGUuXG4gIHJldHVybiByM1N5bWJvbHMuc3RhdGVtZW50cy5zb21lKHN0bXQgPT4ge1xuICAgIC8vIFRoZSBzdGF0ZW1lbnQgbXVzdCBiZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHN0YXRlbWVudC5cbiAgICBpZiAoIXRzLmlzVmFyaWFibGVTdGF0ZW1lbnQoc3RtdCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBiZSBleHBvcnRlZC5cbiAgICBpZiAoc3RtdC5tb2RpZmllcnMgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAhc3RtdC5tb2RpZmllcnMuc29tZShtb2QgPT4gbW9kLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gSXQgbXVzdCBkZWNsYXJlIElUU19KVVNUX0FOR1VMQVIuXG4gICAgcmV0dXJuIHN0bXQuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucy5zb21lKGRlY2wgPT4ge1xuICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIG11c3QgbWF0Y2ggdGhlIG5hbWUuXG4gICAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihkZWNsLm5hbWUpIHx8IGRlY2wubmFtZS50ZXh0ICE9PSAnSVRTX0pVU1RfQU5HVUxBUicpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gSXQgbXVzdCBpbml0aWFsaXplIHRoZSB2YXJpYWJsZSB0byB0cnVlLlxuICAgICAgaWYgKGRlY2wuaW5pdGlhbGl6ZXIgPT09IHVuZGVmaW5lZCB8fCBkZWNsLmluaXRpYWxpemVyLmtpbmQgIT09IHRzLlN5bnRheEtpbmQuVHJ1ZUtleXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgLy8gVGhpcyBkZWZpbml0aW9uIG1hdGNoZXMuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2VHcmFwaEFkYXB0ZXIgaW1wbGVtZW50cyBSZWZlcmVuY2VzUmVnaXN0cnkge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGdyYXBoOiBSZWZlcmVuY2VHcmFwaCkge31cblxuICBhZGQoc291cmNlOiB0cy5EZWNsYXJhdGlvbiwgLi4ucmVmZXJlbmNlczogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB7bm9kZX0gb2YgcmVmZXJlbmNlcykge1xuICAgICAgbGV0IHNvdXJjZUZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc291cmNlRmlsZSA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgcmVjb3JkIGxvY2FsIHJlZmVyZW5jZXMgKG5vdCByZWZlcmVuY2VzIGludG8gLmQudHMgZmlsZXMpLlxuICAgICAgaWYgKHNvdXJjZUZpbGUgPT09IHVuZGVmaW5lZCB8fCAhaXNEdHNQYXRoKHNvdXJjZUZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICAgIHRoaXMuZ3JhcGguYWRkKHNvdXJjZSwgbm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNob3VsZEVuYWJsZVBlcmZUcmFjaW5nKG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMpOiBib29sZWFuIHtcbiAgcmV0dXJuIG9wdGlvbnMudHJhY2VQZXJmb3JtYW5jZSAhPT0gdW5kZWZpbmVkO1xufVxuIl19