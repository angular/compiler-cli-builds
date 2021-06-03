/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { __awaiter } from "tslib";
import * as ts from 'typescript';
import { ComponentDecoratorHandler, DirectiveDecoratorHandler, InjectableDecoratorHandler, NgModuleDecoratorHandler, NoopReferencesRegistry, PipeDecoratorHandler } from '../../annotations';
import { CycleAnalyzer, ImportGraph } from '../../cycles';
import { COMPILER_ERRORS_WITH_GUIDES, ERROR_DETAILS_PAGE_BASE_URL, ErrorCode, ngErrorCode } from '../../diagnostics';
import { checkForPrivateExports, ReferenceGraph } from '../../entry_point';
import { absoluteFromSourceFile, LogicalFileSystem, resolve } from '../../file_system';
import { AbsoluteModuleStrategy, AliasStrategy, DefaultImportTracker, LocalIdentifierStrategy, LogicalProjectStrategy, ModuleResolver, NoopImportRewriter, PrivateExportAliasingHost, R3SymbolsImportRewriter, Reference, ReferenceEmitter, RelativePathStrategy, UnifiedModulesAliasingHost, UnifiedModulesStrategy } from '../../imports';
import { IncrementalCompilation } from '../../incremental';
import { generateAnalysis, IndexingContext } from '../../indexer';
import { CompoundMetadataReader, CompoundMetadataRegistry, DtsMetadataReader, InjectableClassRegistry, LocalMetadataRegistry, ResourceRegistry } from '../../metadata';
import { PartialEvaluator } from '../../partial_evaluator';
import { ActivePerfRecorder, DelegatingPerfRecorder, PerfCheckpoint, PerfEvent, PerfPhase } from '../../perf';
import { isNamedClassDeclaration, TypeScriptReflectionHost } from '../../reflection';
import { AdapterResourceLoader } from '../../resource';
import { entryPointKeyFor, NgModuleRouteAnalyzer } from '../../routing';
import { LocalModuleScopeRegistry, MetadataDtsModuleScopeResolver, TypeCheckScopeRegistry } from '../../scope';
import { generatedFactoryTransform } from '../../shims';
import { ivySwitchTransform } from '../../switch';
import { aliasTransformFactory, CompilationMode, declarationTransformFactory, DtsTransformRegistry, ivyTransformFactory, TraitCompiler } from '../../transform';
import { TemplateTypeCheckerImpl } from '../../typecheck';
import { OptimizeFor } from '../../typecheck/api';
import { getSourceFileOrNull, isDtsPath, resolveModuleName, toUnredirectedSourceFile } from '../../util/src/typescript';
import { compileUndecoratedClassesWithAngularFeatures } from './config';
/**
 * Discriminant type for a `CompilationTicket`.
 */
export var CompilationTicketKind;
(function (CompilationTicketKind) {
    CompilationTicketKind[CompilationTicketKind["Fresh"] = 0] = "Fresh";
    CompilationTicketKind[CompilationTicketKind["IncrementalTypeScript"] = 1] = "IncrementalTypeScript";
    CompilationTicketKind[CompilationTicketKind["IncrementalResource"] = 2] = "IncrementalResource";
})(CompilationTicketKind || (CompilationTicketKind = {}));
/**
 * Create a `CompilationTicket` for a brand new compilation, using no prior state.
 */
export function freshCompilationTicket(tsProgram, options, incrementalBuildStrategy, programDriver, perfRecorder, enableTemplateTypeChecker, usePoisonedData) {
    return {
        kind: CompilationTicketKind.Fresh,
        tsProgram,
        options,
        incrementalBuildStrategy,
        programDriver,
        enableTemplateTypeChecker,
        usePoisonedData,
        perfRecorder: perfRecorder !== null && perfRecorder !== void 0 ? perfRecorder : ActivePerfRecorder.zeroedToNow(),
    };
}
/**
 * Create a `CompilationTicket` as efficiently as possible, based on a previous `NgCompiler`
 * instance and a new `ts.Program`.
 */
export function incrementalFromCompilerTicket(oldCompiler, newProgram, incrementalBuildStrategy, programDriver, modifiedResourceFiles, perfRecorder) {
    const oldProgram = oldCompiler.getCurrentProgram();
    const oldState = oldCompiler.incrementalStrategy.getIncrementalState(oldProgram);
    if (oldState === null) {
        // No incremental step is possible here, since no IncrementalDriver was found for the old
        // program.
        return freshCompilationTicket(newProgram, oldCompiler.options, incrementalBuildStrategy, programDriver, perfRecorder, oldCompiler.enableTemplateTypeChecker, oldCompiler.usePoisonedData);
    }
    if (perfRecorder === null) {
        perfRecorder = ActivePerfRecorder.zeroedToNow();
    }
    const incrementalCompilation = IncrementalCompilation.incremental(newProgram, versionMapFromProgram(newProgram, programDriver), oldProgram, oldState, modifiedResourceFiles, perfRecorder);
    return {
        kind: CompilationTicketKind.IncrementalTypeScript,
        enableTemplateTypeChecker: oldCompiler.enableTemplateTypeChecker,
        usePoisonedData: oldCompiler.usePoisonedData,
        options: oldCompiler.options,
        incrementalBuildStrategy,
        incrementalCompilation,
        programDriver,
        newProgram,
        perfRecorder,
    };
}
/**
 * Create a `CompilationTicket` directly from an old `ts.Program` and associated Angular compilation
 * state, along with a new `ts.Program`.
 */
export function incrementalFromStateTicket(oldProgram, oldState, newProgram, options, incrementalBuildStrategy, programDriver, modifiedResourceFiles, perfRecorder, enableTemplateTypeChecker, usePoisonedData) {
    if (perfRecorder === null) {
        perfRecorder = ActivePerfRecorder.zeroedToNow();
    }
    const incrementalCompilation = IncrementalCompilation.incremental(newProgram, versionMapFromProgram(newProgram, programDriver), oldProgram, oldState, modifiedResourceFiles, perfRecorder);
    return {
        kind: CompilationTicketKind.IncrementalTypeScript,
        newProgram,
        options,
        incrementalBuildStrategy,
        incrementalCompilation,
        programDriver,
        enableTemplateTypeChecker,
        usePoisonedData,
        perfRecorder,
    };
}
export function resourceChangeTicket(compiler, modifiedResourceFiles) {
    return {
        kind: CompilationTicketKind.IncrementalResource,
        compiler,
        modifiedResourceFiles,
        perfRecorder: ActivePerfRecorder.zeroedToNow(),
    };
}
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
export class NgCompiler {
    constructor(adapter, options, inputProgram, programDriver, incrementalStrategy, incrementalCompilation, enableTemplateTypeChecker, usePoisonedData, livePerfRecorder) {
        this.adapter = adapter;
        this.options = options;
        this.inputProgram = inputProgram;
        this.programDriver = programDriver;
        this.incrementalStrategy = incrementalStrategy;
        this.incrementalCompilation = incrementalCompilation;
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
        this.delegatingPerfRecorder = new DelegatingPerfRecorder(this.perfRecorder);
        this.constructionDiagnostics.push(...this.adapter.constructionDiagnostics);
        const incompatibleTypeCheckOptionsDiagnostic = verifyCompatibleTypeCheckOptions(this.options);
        if (incompatibleTypeCheckOptionsDiagnostic !== null) {
            this.constructionDiagnostics.push(incompatibleTypeCheckOptionsDiagnostic);
        }
        this.currentProgram = inputProgram;
        this.closureCompilerEnabled = !!this.options.annotateForClosureCompiler;
        this.entryPoint =
            adapter.entryPoint !== null ? getSourceFileOrNull(inputProgram, adapter.entryPoint) : null;
        const moduleResolutionCache = ts.createModuleResolutionCache(this.adapter.getCurrentDirectory(), 
        // doen't retain a reference to `this`, if other closures in the constructor here reference
        // `this` internally then a closure created here would retain them. This can cause major
        // memory leak issues since the `moduleResolutionCache` is a long-lived object and finds its
        // way into all kinds of places inside TS internal objects.
        this.adapter.getCanonicalFileName.bind(this.adapter));
        this.moduleResolver =
            new ModuleResolver(inputProgram, this.options, this.adapter, moduleResolutionCache);
        this.resourceManager = new AdapterResourceLoader(adapter, this.options);
        this.cycleAnalyzer = new CycleAnalyzer(new ImportGraph(inputProgram.getTypeChecker(), this.delegatingPerfRecorder));
        this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, inputProgram);
        this.ignoreForDiagnostics =
            new Set(inputProgram.getSourceFiles().filter(sf => this.adapter.isShim(sf)));
        this.ignoreForEmit = this.adapter.ignoreForEmit;
        let dtsFileCount = 0;
        let nonDtsFileCount = 0;
        for (const sf of inputProgram.getSourceFiles()) {
            if (sf.isDeclarationFile) {
                dtsFileCount++;
            }
            else {
                nonDtsFileCount++;
            }
        }
        livePerfRecorder.eventCount(PerfEvent.InputDtsFile, dtsFileCount);
        livePerfRecorder.eventCount(PerfEvent.InputTsFile, nonDtsFileCount);
    }
    /**
     * Convert a `CompilationTicket` into an `NgCompiler` instance for the requested compilation.
     *
     * Depending on the nature of the compilation request, the `NgCompiler` instance may be reused
     * from a previous compilation and updated with any changes, it may be a new instance which
     * incrementally reuses state from a previous compilation, or it may represent a fresh
     * compilation entirely.
     */
    static fromTicket(ticket, adapter) {
        switch (ticket.kind) {
            case CompilationTicketKind.Fresh:
                return new NgCompiler(adapter, ticket.options, ticket.tsProgram, ticket.programDriver, ticket.incrementalBuildStrategy, IncrementalCompilation.fresh(ticket.tsProgram, versionMapFromProgram(ticket.tsProgram, ticket.programDriver)), ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
            case CompilationTicketKind.IncrementalTypeScript:
                return new NgCompiler(adapter, ticket.options, ticket.newProgram, ticket.programDriver, ticket.incrementalBuildStrategy, ticket.incrementalCompilation, ticket.enableTemplateTypeChecker, ticket.usePoisonedData, ticket.perfRecorder);
            case CompilationTicketKind.IncrementalResource:
                const compiler = ticket.compiler;
                compiler.updateWithChangedResources(ticket.modifiedResourceFiles, ticket.perfRecorder);
                return compiler;
        }
    }
    get perfRecorder() {
        return this.livePerfRecorder;
    }
    /**
     * Exposes the `IncrementalCompilation` under an old property name that the CLI uses, avoiding a
     * chicken-and-egg problem with the rename to `incrementalCompilation`.
     *
     * TODO(alxhub): remove when the CLI uses the new name.
     */
    get incrementalDriver() {
        return this.incrementalCompilation;
    }
    updateWithChangedResources(changedResources, perfRecorder) {
        this.livePerfRecorder = perfRecorder;
        this.delegatingPerfRecorder.target = perfRecorder;
        perfRecorder.inPhase(PerfPhase.ResourceUpdate, () => {
            if (this.compilation === null) {
                // Analysis hasn't happened yet, so no update is necessary - any changes to resources will
                // be captured by the inital analysis pass itself.
                return;
            }
            this.resourceManager.invalidate();
            const classesToUpdate = new Set();
            for (const resourceFile of changedResources) {
                for (const templateClass of this.getComponentsWithTemplateFile(resourceFile)) {
                    classesToUpdate.add(templateClass);
                }
                for (const styleClass of this.getComponentsWithStyleFile(resourceFile)) {
                    classesToUpdate.add(styleClass);
                }
            }
            for (const clazz of classesToUpdate) {
                this.compilation.traitCompiler.updateResources(clazz);
                if (!ts.isClassDeclaration(clazz)) {
                    continue;
                }
                this.compilation.templateTypeChecker.invalidateClass(clazz);
            }
        });
    }
    /**
     * Get the resource dependencies of a file.
     *
     * If the file is not part of the compilation, an empty array will be returned.
     */
    getResourceDependencies(file) {
        this.ensureAnalyzed();
        return this.incrementalCompilation.depGraph.getResourceDependencies(file);
    }
    /**
     * Get all Angular-related diagnostics for this compilation.
     */
    getDiagnostics() {
        return this.addMessageTextDetails([...this.getNonTemplateDiagnostics(), ...this.getTemplateDiagnostics()]);
    }
    /**
     * Get all Angular-related diagnostics for this compilation.
     *
     * If a `ts.SourceFile` is passed, only diagnostics related to that file are returned.
     */
    getDiagnosticsForFile(file, optimizeFor) {
        return this.addMessageTextDetails([
            ...this.getNonTemplateDiagnostics().filter(diag => diag.file === file),
            ...this.getTemplateDiagnosticsForFile(file, optimizeFor)
        ]);
    }
    /**
     * Add Angular.io error guide links to diagnostics for this compilation.
     */
    addMessageTextDetails(diagnostics) {
        return diagnostics.map(diag => {
            if (diag.code && COMPILER_ERRORS_WITH_GUIDES.has(ngErrorCode(diag.code))) {
                return Object.assign(Object.assign({}, diag), { messageText: diag.messageText +
                        `. Find more at ${ERROR_DETAILS_PAGE_BASE_URL}/NG${ngErrorCode(diag.code)}` });
            }
            return diag;
        });
    }
    /**
     * Get all setup-related diagnostics for this compilation.
     */
    getOptionDiagnostics() {
        return this.constructionDiagnostics;
    }
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
    getCurrentProgram() {
        return this.currentProgram;
    }
    getTemplateTypeChecker() {
        if (!this.enableTemplateTypeChecker) {
            throw new Error('The `TemplateTypeChecker` does not work without `enableTemplateTypeChecker`.');
        }
        return this.ensureAnalyzed().templateTypeChecker;
    }
    /**
     * Retrieves the `ts.Declaration`s for any component(s) which use the given template file.
     */
    getComponentsWithTemplateFile(templateFilePath) {
        const { resourceRegistry } = this.ensureAnalyzed();
        return resourceRegistry.getComponentsWithTemplate(resolve(templateFilePath));
    }
    /**
     * Retrieves the `ts.Declaration`s for any component(s) which use the given template file.
     */
    getComponentsWithStyleFile(styleFilePath) {
        const { resourceRegistry } = this.ensureAnalyzed();
        return resourceRegistry.getComponentsWithStyle(resolve(styleFilePath));
    }
    /**
     * Retrieves external resources for the given component.
     */
    getComponentResources(classDecl) {
        if (!isNamedClassDeclaration(classDecl)) {
            return null;
        }
        const { resourceRegistry } = this.ensureAnalyzed();
        const styles = resourceRegistry.getStyles(classDecl);
        const template = resourceRegistry.getTemplate(classDecl);
        if (template === null) {
            return null;
        }
        return { styles, template };
    }
    getMeta(classDecl) {
        var _a;
        if (!isNamedClassDeclaration(classDecl)) {
            return null;
        }
        const ref = new Reference(classDecl);
        const { metaReader } = this.ensureAnalyzed();
        const meta = (_a = metaReader.getPipeMetadata(ref)) !== null && _a !== void 0 ? _a : metaReader.getDirectiveMetadata(ref);
        if (meta === null) {
            return null;
        }
        return meta;
    }
    /**
     * Perform Angular's analysis step (as a precursor to `getDiagnostics` or `prepareEmit`)
     * asynchronously.
     *
     * Normally, this operation happens lazily whenever `getDiagnostics` or `prepareEmit` are called.
     * However, certain consumers may wish to allow for an asynchronous phase of analysis, where
     * resources such as `styleUrls` are resolved asynchonously. In these cases `analyzeAsync` must be
     * called first, and its `Promise` awaited prior to calling any other APIs of `NgCompiler`.
     */
    analyzeAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.compilation !== null) {
                return;
            }
            yield this.perfRecorder.inPhase(PerfPhase.Analysis, () => __awaiter(this, void 0, void 0, function* () {
                this.compilation = this.makeCompilation();
                const promises = [];
                for (const sf of this.inputProgram.getSourceFiles()) {
                    if (sf.isDeclarationFile) {
                        continue;
                    }
                    let analysisPromise = this.compilation.traitCompiler.analyzeAsync(sf);
                    if (analysisPromise !== undefined) {
                        promises.push(analysisPromise);
                    }
                }
                yield Promise.all(promises);
                this.perfRecorder.memory(PerfCheckpoint.Analysis);
                this.resolveCompilation(this.compilation.traitCompiler);
            }));
        });
    }
    /**
     * List lazy routes detected during analysis.
     *
     * This can be called for one specific route, or to retrieve all top-level routes.
     */
    listLazyRoutes(entryRoute) {
        if (entryRoute) {
            // htts://github.com/angular/angular/blob/50732e156/packages/compiler-cli/src/transformers/compiler_host.ts#L175-L188).
            //
            // `@angular/cli` will always call this API with an absolute path, so the resolution step is
            // not necessary, but keeping it backwards compatible in case someone else is using the API.
            // Relative entry paths are disallowed.
            if (entryRoute.startsWith('.')) {
                throw new Error(`Failed to list lazy routes: Resolution of relative paths (${entryRoute}) is not supported.`);
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
            const containingFile = this.inputProgram.getRootFileNames()[0];
            const [entryPath, moduleName] = entryRoute.split('#');
            const resolvedModule = resolveModuleName(entryPath, containingFile, this.options, this.adapter, null);
            if (resolvedModule) {
                entryRoute = entryPointKeyFor(resolvedModule.resolvedFileName, moduleName);
            }
        }
        const compilation = this.ensureAnalyzed();
        return compilation.routeAnalyzer.listLazyRoutes(entryRoute);
    }
    /**
     * Fetch transformers and other information which is necessary for a consumer to `emit` the
     * program with Angular-added definitions.
     */
    prepareEmit() {
        const compilation = this.ensureAnalyzed();
        const coreImportsFrom = compilation.isCore ? getR3SymbolsFile(this.inputProgram) : null;
        let importRewriter;
        if (coreImportsFrom !== null) {
            importRewriter = new R3SymbolsImportRewriter(coreImportsFrom.fileName);
        }
        else {
            importRewriter = new NoopImportRewriter();
        }
        const defaultImportTracker = new DefaultImportTracker();
        const before = [
            ivyTransformFactory(compilation.traitCompiler, compilation.reflector, importRewriter, defaultImportTracker, this.delegatingPerfRecorder, compilation.isCore, this.closureCompilerEnabled),
            aliasTransformFactory(compilation.traitCompiler.exportStatements),
            defaultImportTracker.importPreservingTransformer(),
        ];
        const afterDeclarations = [];
        if (compilation.dtsTransforms !== null) {
            afterDeclarations.push(declarationTransformFactory(compilation.dtsTransforms, importRewriter));
        }
        // Only add aliasing re-exports to the .d.ts output if the `AliasingHost` requests it.
        if (compilation.aliasingHost !== null && compilation.aliasingHost.aliasExportsInDts) {
            afterDeclarations.push(aliasTransformFactory(compilation.traitCompiler.exportStatements));
        }
        if (this.adapter.factoryTracker !== null) {
            before.push(generatedFactoryTransform(this.adapter.factoryTracker.sourceInfo, importRewriter));
        }
        before.push(ivySwitchTransform);
        return { transformers: { before, afterDeclarations } };
    }
    /**
     * Run the indexing process and return a `Map` of all indexed components.
     *
     * See the `indexing` package for more details.
     */
    getIndexedComponents() {
        const compilation = this.ensureAnalyzed();
        const context = new IndexingContext();
        compilation.traitCompiler.index(context);
        return generateAnalysis(context);
    }
    ensureAnalyzed() {
        if (this.compilation === null) {
            this.analyzeSync();
        }
        return this.compilation;
    }
    analyzeSync() {
        this.perfRecorder.inPhase(PerfPhase.Analysis, () => {
            this.compilation = this.makeCompilation();
            for (const sf of this.inputProgram.getSourceFiles()) {
                if (sf.isDeclarationFile) {
                    continue;
                }
                this.compilation.traitCompiler.analyzeSync(sf);
            }
            this.perfRecorder.memory(PerfCheckpoint.Analysis);
            this.resolveCompilation(this.compilation.traitCompiler);
        });
    }
    resolveCompilation(traitCompiler) {
        this.perfRecorder.inPhase(PerfPhase.Resolve, () => {
            traitCompiler.resolve();
            // At this point, analysis is complete and the compiler can now calculate which files need to
            // be emitted, so do that.
            this.incrementalCompilation.recordSuccessfulAnalysis(traitCompiler);
            this.perfRecorder.memory(PerfCheckpoint.Resolve);
        });
    }
    get fullTemplateTypeCheck() {
        // Determine the strictness level of type checking based on compiler options. As
        // `strictTemplates` is a superset of `fullTemplateTypeCheck`, the former implies the latter.
        // Also see `verifyCompatibleTypeCheckOptions` where it is verified that `fullTemplateTypeCheck`
        // is not disabled when `strictTemplates` is enabled.
        const strictTemplates = !!this.options.strictTemplates;
        return strictTemplates || !!this.options.fullTemplateTypeCheck;
    }
    getTypeCheckingConfig() {
        // Determine the strictness level of type checking based on compiler options. As
        // `strictTemplates` is a superset of `fullTemplateTypeCheck`, the former implies the latter.
        // Also see `verifyCompatibleTypeCheckOptions` where it is verified that `fullTemplateTypeCheck`
        // is not disabled when `strictTemplates` is enabled.
        const strictTemplates = !!this.options.strictTemplates;
        const useInlineTypeConstructors = this.programDriver.supportsInlineOperations;
        // First select a type-checking configuration, based on whether full template type-checking is
        // requested.
        let typeCheckingConfig;
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
                useInlineTypeConstructors,
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
                useInlineTypeConstructors,
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
    }
    getTemplateDiagnostics() {
        const compilation = this.ensureAnalyzed();
        // Get the diagnostics.
        const diagnostics = [];
        for (const sf of this.inputProgram.getSourceFiles()) {
            if (sf.isDeclarationFile || this.adapter.isShim(sf)) {
                continue;
            }
            diagnostics.push(...compilation.templateTypeChecker.getDiagnosticsForFile(sf, OptimizeFor.WholeProgram));
        }
        const program = this.programDriver.getProgram();
        this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
        this.currentProgram = program;
        return diagnostics;
    }
    getTemplateDiagnosticsForFile(sf, optimizeFor) {
        const compilation = this.ensureAnalyzed();
        // Get the diagnostics.
        const diagnostics = [];
        if (!sf.isDeclarationFile && !this.adapter.isShim(sf)) {
            diagnostics.push(...compilation.templateTypeChecker.getDiagnosticsForFile(sf, optimizeFor));
        }
        const program = this.programDriver.getProgram();
        this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
        this.currentProgram = program;
        return diagnostics;
    }
    getNonTemplateDiagnostics() {
        if (this.nonTemplateDiagnostics === null) {
            const compilation = this.ensureAnalyzed();
            this.nonTemplateDiagnostics = [...compilation.traitCompiler.diagnostics];
            if (this.entryPoint !== null && compilation.exportReferenceGraph !== null) {
                this.nonTemplateDiagnostics.push(...checkForPrivateExports(this.entryPoint, this.inputProgram.getTypeChecker(), compilation.exportReferenceGraph));
            }
        }
        return this.nonTemplateDiagnostics;
    }
    makeCompilation() {
        const checker = this.inputProgram.getTypeChecker();
        const reflector = new TypeScriptReflectionHost(checker);
        // Construct the ReferenceEmitter.
        let refEmitter;
        let aliasingHost = null;
        if (this.adapter.unifiedModulesHost === null || !this.options._useHostForImportGeneration) {
            let localImportStrategy;
            // The strategy used for local, in-project imports depends on whether TS has been configured
            // with rootDirs. If so, then multiple directories may be mapped in the same "module
            // namespace" and the logic of `LogicalProjectStrategy` is required to generate correct
            // imports which may cross these multiple directories. Otherwise, plain relative imports are
            // sufficient.
            if (this.options.rootDir !== undefined ||
                (this.options.rootDirs !== undefined && this.options.rootDirs.length > 0)) {
                // rootDirs logic is in effect - use the `LogicalProjectStrategy` for in-project relative
                // imports.
                localImportStrategy = new LogicalProjectStrategy(reflector, new LogicalFileSystem([...this.adapter.rootDirs], this.adapter));
            }
            else {
                // Plain relative imports are all that's needed.
                localImportStrategy = new RelativePathStrategy(reflector);
            }
            // The CompilerHost doesn't have fileNameToModuleName, so build an NPM-centric reference
            // resolution strategy.
            refEmitter = new ReferenceEmitter([
                // First, try to use local identifiers if available.
                new LocalIdentifierStrategy(),
                // Next, attempt to use an absolute import.
                new AbsoluteModuleStrategy(this.inputProgram, checker, this.moduleResolver, reflector),
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
                aliasingHost = new PrivateExportAliasingHost(reflector);
            }
        }
        else {
            // The CompilerHost supports fileNameToModuleName, so use that to emit imports.
            refEmitter = new ReferenceEmitter([
                // First, try to use local identifiers if available.
                new LocalIdentifierStrategy(),
                // Then use aliased references (this is a workaround to StrictDeps checks).
                new AliasStrategy(),
                // Then use fileNameToModuleName to emit imports.
                new UnifiedModulesStrategy(reflector, this.adapter.unifiedModulesHost),
            ]);
            aliasingHost = new UnifiedModulesAliasingHost(this.adapter.unifiedModulesHost);
        }
        const evaluator = new PartialEvaluator(reflector, checker, this.incrementalCompilation.depGraph);
        const dtsReader = new DtsMetadataReader(checker, reflector);
        const localMetaRegistry = new LocalMetadataRegistry();
        const localMetaReader = localMetaRegistry;
        const depScopeReader = new MetadataDtsModuleScopeResolver(dtsReader, aliasingHost);
        const scopeRegistry = new LocalModuleScopeRegistry(localMetaReader, depScopeReader, refEmitter, aliasingHost);
        const scopeReader = scopeRegistry;
        const semanticDepGraphUpdater = this.incrementalCompilation.semanticDepGraphUpdater;
        const metaRegistry = new CompoundMetadataRegistry([localMetaRegistry, scopeRegistry]);
        const injectableRegistry = new InjectableClassRegistry(reflector);
        const metaReader = new CompoundMetadataReader([localMetaReader, dtsReader]);
        const typeCheckScopeRegistry = new TypeCheckScopeRegistry(scopeReader, metaReader);
        // If a flat module entrypoint was specified, then track references via a `ReferenceGraph` in
        // order to produce proper diagnostics for incorrectly exported directives/pipes/etc. If there
        // is no flat module entrypoint then don't pay the cost of tracking references.
        let referencesRegistry;
        let exportReferenceGraph = null;
        if (this.entryPoint !== null) {
            exportReferenceGraph = new ReferenceGraph();
            referencesRegistry = new ReferenceGraphAdapter(exportReferenceGraph);
        }
        else {
            referencesRegistry = new NoopReferencesRegistry();
        }
        const routeAnalyzer = new NgModuleRouteAnalyzer(this.moduleResolver, evaluator);
        const dtsTransforms = new DtsTransformRegistry();
        const isCore = isAngularCorePackage(this.inputProgram);
        const resourceRegistry = new ResourceRegistry();
        const compilationMode = this.options.compilationMode === 'partial' ? CompilationMode.PARTIAL : CompilationMode.FULL;
        // Cycles are handled in full compilation mode by "remote scoping".
        // "Remote scoping" does not work well with tree shaking for libraries.
        // So in partial compilation mode, when building a library, a cycle will cause an error.
        const cycleHandlingStrategy = compilationMode === CompilationMode.FULL ?
            0 /* UseRemoteScoping */ :
            1 /* Error */;
        // Set up the IvyCompilation, which manages state for the Ivy transformer.
        const handlers = [
            new ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, this.resourceManager, this.adapter.rootDirs, this.options.preserveWhitespaces || false, this.options.i18nUseExternalIds !== false, this.options.enableI18nLegacyMessageIdFormat !== false, this.usePoisonedData, this.options.i18nNormalizeLineEndingsInICUs, this.moduleResolver, this.cycleAnalyzer, cycleHandlingStrategy, refEmitter, this.incrementalCompilation.depGraph, injectableRegistry, semanticDepGraphUpdater, this.closureCompilerEnabled, this.delegatingPerfRecorder),
            // TODO(alxhub): understand why the cast here is necessary (something to do with `null`
            // not being assignable to `unknown` when wrapped in `Readonly`).
            // clang-format off
            new DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, injectableRegistry, isCore, semanticDepGraphUpdater, this.closureCompilerEnabled, compileUndecoratedClassesWithAngularFeatures, this.delegatingPerfRecorder),
            // clang-format on
            // Pipe handler must be before injectable handler in list so pipe factories are printed
            // before injectable factories (so injectable factories can delegate to them)
            new PipeDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, injectableRegistry, isCore, this.delegatingPerfRecorder),
            new InjectableDecoratorHandler(reflector, isCore, this.options.strictInjectionParameters || false, injectableRegistry, this.delegatingPerfRecorder),
            new NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, this.adapter.factoryTracker, this.closureCompilerEnabled, injectableRegistry, this.delegatingPerfRecorder, this.options.i18nInLocale),
        ];
        const traitCompiler = new TraitCompiler(handlers, reflector, this.delegatingPerfRecorder, this.incrementalCompilation, this.options.compileNonExportedClasses !== false, compilationMode, dtsTransforms, semanticDepGraphUpdater);
        // Template type-checking may use the `ProgramDriver` to produce new `ts.Program`(s). If this
        // happens, they need to be tracked by the `NgCompiler`.
        const notifyingDriver = new NotifyingProgramDriverWrapper(this.programDriver, (program) => {
            this.incrementalStrategy.setIncrementalState(this.incrementalCompilation.state, program);
            this.currentProgram = program;
        });
        const templateTypeChecker = new TemplateTypeCheckerImpl(this.inputProgram, notifyingDriver, traitCompiler, this.getTypeCheckingConfig(), refEmitter, reflector, this.adapter, this.incrementalCompilation, scopeRegistry, typeCheckScopeRegistry, this.delegatingPerfRecorder);
        return {
            isCore,
            traitCompiler,
            reflector,
            scopeRegistry,
            dtsTransforms,
            exportReferenceGraph,
            routeAnalyzer,
            metaReader,
            typeCheckScopeRegistry,
            aliasingHost,
            refEmitter,
            templateTypeChecker,
            resourceRegistry,
        };
    }
}
/**
 * Determine if the given `Program` is @angular/core.
 */
export function isAngularCorePackage(program) {
    // Look for its_just_angular.ts somewhere in the program.
    const r3Symbols = getR3SymbolsFile(program);
    if (r3Symbols === null) {
        return false;
    }
    // Look for the constant ITS_JUST_ANGULAR in that file.
    return r3Symbols.statements.some(stmt => {
        // The statement must be a variable declaration statement.
        if (!ts.isVariableStatement(stmt)) {
            return false;
        }
        // It must be exported.
        if (stmt.modifiers === undefined ||
            !stmt.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
            return false;
        }
        // It must declare ITS_JUST_ANGULAR.
        return stmt.declarationList.declarations.some(decl => {
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
    return program.getSourceFiles().find(file => file.fileName.indexOf('r3_symbols.ts') >= 0) || null;
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
            code: ngErrorCode(ErrorCode.CONFIG_STRICT_TEMPLATES_IMPLIES_FULL_TEMPLATE_TYPECHECK),
            file: undefined,
            start: undefined,
            length: undefined,
            messageText: `Angular compiler option "strictTemplates" is enabled, however "fullTemplateTypeCheck" is disabled.

Having the "strictTemplates" flag enabled implies that "fullTemplateTypeCheck" is also enabled, so
the latter can not be explicitly disabled.

One of the following actions is required:
1. Remove the "fullTemplateTypeCheck" option.
2. Remove "strictTemplates" or set it to 'false'.

More information about the template type checking compiler options can be found in the documentation:
https://v9.angular.io/guide/template-typecheck#template-type-checking`,
        };
    }
    return null;
}
class ReferenceGraphAdapter {
    constructor(graph) {
        this.graph = graph;
    }
    add(source, ...references) {
        for (const { node } of references) {
            let sourceFile = node.getSourceFile();
            if (sourceFile === undefined) {
                sourceFile = ts.getOriginalNode(node).getSourceFile();
            }
            // Only record local references (not references into .d.ts files).
            if (sourceFile === undefined || !isDtsPath(sourceFile.fileName)) {
                this.graph.add(source, node);
            }
        }
    }
}
class NotifyingProgramDriverWrapper {
    constructor(delegate, notifyNewProgram) {
        var _a;
        this.delegate = delegate;
        this.notifyNewProgram = notifyNewProgram;
        this.getSourceFileVersion = (_a = this.delegate.getSourceFileVersion) === null || _a === void 0 ? void 0 : _a.bind(this);
    }
    get supportsInlineOperations() {
        return this.delegate.supportsInlineOperations;
    }
    getProgram() {
        return this.delegate.getProgram();
    }
    updateFiles(contents, updateMode) {
        this.delegate.updateFiles(contents, updateMode);
        this.notifyNewProgram(this.delegate.getProgram());
    }
}
function versionMapFromProgram(program, driver) {
    if (driver.getSourceFileVersion === undefined) {
        return null;
    }
    const versions = new Map();
    for (const possiblyRedirectedSourceFile of program.getSourceFiles()) {
        const sf = toUnredirectedSourceFile(possiblyRedirectedSourceFile);
        versions.set(absoluteFromSourceFile(sf), driver.getSourceFileVersion(sf));
    }
    return versions;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvc3JjL2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7QUFFSCxPQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVqQyxPQUFPLEVBQUMseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsMEJBQTBCLEVBQUUsd0JBQXdCLEVBQUUsc0JBQXNCLEVBQUUsb0JBQW9CLEVBQXFCLE1BQU0sbUJBQW1CLENBQUM7QUFDL00sT0FBTyxFQUFDLGFBQWEsRUFBeUIsV0FBVyxFQUFDLE1BQU0sY0FBYyxDQUFDO0FBQy9FLE9BQU8sRUFBQywyQkFBMkIsRUFBRSwyQkFBMkIsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDbkgsT0FBTyxFQUFDLHNCQUFzQixFQUFFLGNBQWMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ3pFLE9BQU8sRUFBQyxzQkFBc0IsRUFBa0IsaUJBQWlCLEVBQUUsT0FBTyxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDckcsT0FBTyxFQUFDLHNCQUFzQixFQUFnQixhQUFhLEVBQUUsb0JBQW9CLEVBQWtCLHVCQUF1QixFQUFFLHNCQUFzQixFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSx5QkFBeUIsRUFBRSx1QkFBdUIsRUFBRSxTQUFTLEVBQXlCLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLDBCQUEwQixFQUFFLHNCQUFzQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQy9YLE9BQU8sRUFBMkIsc0JBQXNCLEVBQW1CLE1BQU0sbUJBQW1CLENBQUM7QUFFckcsT0FBTyxFQUFDLGdCQUFnQixFQUFvQixlQUFlLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFDbEYsT0FBTyxFQUFxQixzQkFBc0IsRUFB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QztJQUVELFVBQVU7UUFDUixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDcEMsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUFxQyxFQUFFLFVBQXNCO1FBQ3ZFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7Q0FHRjtBQUVELFNBQVMscUJBQXFCLENBQzFCLE9BQW1CLEVBQUUsTUFBcUI7SUFDNUMsSUFBSSxNQUFNLENBQUMsb0JBQW9CLEtBQUssU0FBUyxFQUFFO1FBQzdDLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztJQUNuRCxLQUFLLE1BQU0sNEJBQTRCLElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFO1FBQ25FLE1BQU0sRUFBRSxHQUFHLHdCQUF3QixDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDbEUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUMzRTtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi4vLi4vYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBDeWNsZUhhbmRsaW5nU3RyYXRlZ3ksIEltcG9ydEdyYXBofSBmcm9tICcuLi8uLi9jeWNsZXMnO1xuaW1wb3J0IHtDT01QSUxFUl9FUlJPUlNfV0lUSF9HVUlERVMsIEVSUk9SX0RFVEFJTFNfUEFHRV9CQVNFX1VSTCwgRXJyb3JDb2RlLCBuZ0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjaGVja0ZvclByaXZhdGVFeHBvcnRzLCBSZWZlcmVuY2VHcmFwaH0gZnJvbSAnLi4vLi4vZW50cnlfcG9pbnQnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aCwgTG9naWNhbEZpbGVTeXN0ZW0sIHJlc29sdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgQWxpYXNpbmdIb3N0LCBBbGlhc1N0cmF0ZWd5LCBEZWZhdWx0SW1wb3J0VHJhY2tlciwgSW1wb3J0UmV3cml0ZXIsIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBNb2R1bGVSZXNvbHZlciwgTm9vcEltcG9ydFJld3JpdGVyLCBQcml2YXRlRXhwb3J0QWxpYXNpbmdIb3N0LCBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0U3RyYXRlZ3ksIFJlZmVyZW5jZUVtaXR0ZXIsIFJlbGF0aXZlUGF0aFN0cmF0ZWd5LCBVbmlmaWVkTW9kdWxlc0FsaWFzaW5nSG9zdCwgVW5pZmllZE1vZHVsZXNTdHJhdGVneX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGRTdHJhdGVneSwgSW5jcmVtZW50YWxDb21waWxhdGlvbiwgSW5jcmVtZW50YWxTdGF0ZX0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvc2VtYW50aWNfZ3JhcGgnO1xuaW1wb3J0IHtnZW5lcmF0ZUFuYWx5c2lzLCBJbmRleGVkQ29tcG9uZW50LCBJbmRleGluZ0NvbnRleHR9IGZyb20gJy4uLy4uL2luZGV4ZXInO1xuaW1wb3J0IHtDb21wb25lbnRSZXNvdXJjZXMsIENvbXBvdW5kTWV0YWRhdGFSZWFkZXIsIENvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgRGlyZWN0aXZlTWV0YSwgRHRzTWV0YWRhdGFSZWFkZXIsIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBMb2NhbE1ldGFkYXRhUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyLCBQaXBlTWV0YSwgUmVzb3VyY2VSZWdpc3RyeX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0FjdGl2ZVBlcmZSZWNvcmRlciwgRGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgUGVyZkNoZWNrcG9pbnQsIFBlcmZFdmVudCwgUGVyZlBoYXNlfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7UHJvZ3JhbURyaXZlciwgVXBkYXRlTW9kZX0gZnJvbSAnLi4vLi4vcHJvZ3JhbV9kcml2ZXInO1xuaW1wb3J0IHtEZWNsYXJhdGlvbk5vZGUsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBUeXBlU2NyaXB0UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtBZGFwdGVyUmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4uLy4uL3Jlc291cmNlJztcbmltcG9ydCB7ZW50cnlQb2ludEtleUZvciwgTmdNb2R1bGVSb3V0ZUFuYWx5emVyfSBmcm9tICcuLi8uLi9yb3V0aW5nJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXIsIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgTWV0YWRhdGFEdHNNb2R1bGVTY29wZVJlc29sdmVyLCBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge2dlbmVyYXRlZEZhY3RvcnlUcmFuc2Zvcm19IGZyb20gJy4uLy4uL3NoaW1zJztcbmltcG9ydCB7aXZ5U3dpdGNoVHJhbnNmb3JtfSBmcm9tICcuLi8uLi9zd2l0Y2gnO1xuaW1wb3J0IHthbGlhc1RyYW5zZm9ybUZhY3RvcnksIENvbXBpbGF0aW9uTW9kZSwgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5LCBEZWNvcmF0b3JIYW5kbGVyLCBEdHNUcmFuc2Zvcm1SZWdpc3RyeSwgaXZ5VHJhbnNmb3JtRmFjdG9yeSwgVHJhaXRDb21waWxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7VGVtcGxhdGVUeXBlQ2hlY2tlckltcGx9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge09wdGltaXplRm9yLCBUZW1wbGF0ZVR5cGVDaGVja2VyLCBUeXBlQ2hlY2tpbmdDb25maWd9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlT3JOdWxsLCBpc0R0c1BhdGgsIHJlc29sdmVNb2R1bGVOYW1lLCB0b1VucmVkaXJlY3RlZFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtMYXp5Um91dGUsIE5nQ29tcGlsZXJBZGFwdGVyLCBOZ0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi4vYXBpJztcblxuaW1wb3J0IHtjb21waWxlVW5kZWNvcmF0ZWRDbGFzc2VzV2l0aEFuZ3VsYXJGZWF0dXJlc30gZnJvbSAnLi9jb25maWcnO1xuXG4vKipcbiAqIFN0YXRlIGluZm9ybWF0aW9uIGFib3V0IGEgY29tcGlsYXRpb24gd2hpY2ggaXMgb25seSBnZW5lcmF0ZWQgb25jZSBzb21lIGRhdGEgaXMgcmVxdWVzdGVkIGZyb21cbiAqIHRoZSBgTmdDb21waWxlcmAgKGZvciBleGFtcGxlLCBieSBjYWxsaW5nIGBnZXREaWFnbm9zdGljc2ApLlxuICovXG5pbnRlcmZhY2UgTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICBpc0NvcmU6IGJvb2xlYW47XG4gIHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXI7XG4gIHJlZmxlY3RvcjogVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0O1xuICBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcjtcbiAgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5O1xuICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5OiBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5O1xuICBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbDtcbiAgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyO1xuICBkdHNUcmFuc2Zvcm1zOiBEdHNUcmFuc2Zvcm1SZWdpc3RyeTtcbiAgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbDtcbiAgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcjtcbiAgdGVtcGxhdGVUeXBlQ2hlY2tlcjogVGVtcGxhdGVUeXBlQ2hlY2tlcjtcbiAgcmVzb3VyY2VSZWdpc3RyeTogUmVzb3VyY2VSZWdpc3RyeTtcbn1cblxuXG5cbi8qKlxuICogRGlzY3JpbWluYW50IHR5cGUgZm9yIGEgYENvbXBpbGF0aW9uVGlja2V0YC5cbiAqL1xuZXhwb3J0IGVudW0gQ29tcGlsYXRpb25UaWNrZXRLaW5kIHtcbiAgRnJlc2gsXG4gIEluY3JlbWVudGFsVHlwZVNjcmlwdCxcbiAgSW5jcmVtZW50YWxSZXNvdXJjZSxcbn1cblxuLyoqXG4gKiBCZWdpbiBhbiBBbmd1bGFyIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiBmcm9tIHNjcmF0Y2guXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRnJlc2hDb21waWxhdGlvblRpY2tldCB7XG4gIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5GcmVzaDtcbiAgb3B0aW9uczogTmdDb21waWxlck9wdGlvbnM7XG4gIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5O1xuICBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyO1xuICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuO1xuICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW47XG4gIHRzUHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXI7XG59XG5cbi8qKlxuICogQmVnaW4gYW4gQW5ndWxhciBjb21waWxhdGlvbiBvcGVyYXRpb24gdGhhdCBpbmNvcnBvcmF0ZXMgY2hhbmdlcyB0byBUeXBlU2NyaXB0IGNvZGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW5jcmVtZW50YWxUeXBlU2NyaXB0Q29tcGlsYXRpb25UaWNrZXQge1xuICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0O1xuICBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucztcbiAgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5OiBJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k7XG4gIGluY3JlbWVudGFsQ29tcGlsYXRpb246IEluY3JlbWVudGFsQ29tcGlsYXRpb247XG4gIHByb2dyYW1Ecml2ZXI6IFByb2dyYW1Ecml2ZXI7XG4gIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW47XG4gIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbjtcbiAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5jcmVtZW50YWxSZXNvdXJjZUNvbXBpbGF0aW9uVGlja2V0IHtcbiAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsUmVzb3VyY2U7XG4gIGNvbXBpbGVyOiBOZ0NvbXBpbGVyO1xuICBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+O1xuICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcjtcbn1cblxuLyoqXG4gKiBBIHJlcXVlc3QgdG8gYmVnaW4gQW5ndWxhciBjb21waWxhdGlvbiwgZWl0aGVyIHN0YXJ0aW5nIGZyb20gc2NyYXRjaCBvciBmcm9tIGEga25vd24gcHJpb3Igc3RhdGUuXG4gKlxuICogYENvbXBpbGF0aW9uVGlja2V0YHMgYXJlIHVzZWQgdG8gaW5pdGlhbGl6ZSAob3IgdXBkYXRlKSBhbiBgTmdDb21waWxlcmAgaW5zdGFuY2UsIHRoZSBjb3JlIG9mIHRoZVxuICogQW5ndWxhciBjb21waWxlci4gVGhleSBhYnN0cmFjdCB0aGUgc3RhcnRpbmcgc3RhdGUgb2YgY29tcGlsYXRpb24gYW5kIGFsbG93IGBOZ0NvbXBpbGVyYCB0byBiZVxuICogbWFuYWdlZCBpbmRlcGVuZGVudGx5IG9mIGFueSBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiBsaWZlY3ljbGUuXG4gKi9cbmV4cG9ydCB0eXBlIENvbXBpbGF0aW9uVGlja2V0ID0gRnJlc2hDb21waWxhdGlvblRpY2tldHxJbmNyZW1lbnRhbFR5cGVTY3JpcHRDb21waWxhdGlvblRpY2tldHxcbiAgICBJbmNyZW1lbnRhbFJlc291cmNlQ29tcGlsYXRpb25UaWNrZXQ7XG5cbi8qKlxuICogQ3JlYXRlIGEgYENvbXBpbGF0aW9uVGlja2V0YCBmb3IgYSBicmFuZCBuZXcgY29tcGlsYXRpb24sIHVzaW5nIG5vIHByaW9yIHN0YXRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJlc2hDb21waWxhdGlvblRpY2tldChcbiAgICB0c1Byb2dyYW06IHRzLlByb2dyYW0sIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyfG51bGwsIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IGJvb2xlYW4sXG4gICAgdXNlUG9pc29uZWREYXRhOiBib29sZWFuKTogQ29tcGlsYXRpb25UaWNrZXQge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IENvbXBpbGF0aW9uVGlja2V0S2luZC5GcmVzaCxcbiAgICB0c1Byb2dyYW0sXG4gICAgb3B0aW9ucyxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgcHJvZ3JhbURyaXZlcixcbiAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgIHVzZVBvaXNvbmVkRGF0YSxcbiAgICBwZXJmUmVjb3JkZXI6IHBlcmZSZWNvcmRlciA/PyBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKSxcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGFzIGVmZmljaWVudGx5IGFzIHBvc3NpYmxlLCBiYXNlZCBvbiBhIHByZXZpb3VzIGBOZ0NvbXBpbGVyYFxuICogaW5zdGFuY2UgYW5kIGEgbmV3IGB0cy5Qcm9ncmFtYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluY3JlbWVudGFsRnJvbUNvbXBpbGVyVGlja2V0KFxuICAgIG9sZENvbXBpbGVyOiBOZ0NvbXBpbGVyLCBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgIGluY3JlbWVudGFsQnVpbGRTdHJhdGVneTogSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLFxuICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PEFic29sdXRlRnNQYXRoPixcbiAgICBwZXJmUmVjb3JkZXI6IEFjdGl2ZVBlcmZSZWNvcmRlcnxudWxsKTogQ29tcGlsYXRpb25UaWNrZXQge1xuICBjb25zdCBvbGRQcm9ncmFtID0gb2xkQ29tcGlsZXIuZ2V0Q3VycmVudFByb2dyYW0oKTtcbiAgY29uc3Qgb2xkU3RhdGUgPSBvbGRDb21waWxlci5pbmNyZW1lbnRhbFN0cmF0ZWd5LmdldEluY3JlbWVudGFsU3RhdGUob2xkUHJvZ3JhbSk7XG4gIGlmIChvbGRTdGF0ZSA9PT0gbnVsbCkge1xuICAgIC8vIE5vIGluY3JlbWVudGFsIHN0ZXAgaXMgcG9zc2libGUgaGVyZSwgc2luY2Ugbm8gSW5jcmVtZW50YWxEcml2ZXIgd2FzIGZvdW5kIGZvciB0aGUgb2xkXG4gICAgLy8gcHJvZ3JhbS5cbiAgICByZXR1cm4gZnJlc2hDb21waWxhdGlvblRpY2tldChcbiAgICAgICAgbmV3UHJvZ3JhbSwgb2xkQ29tcGlsZXIub3B0aW9ucywgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LCBwcm9ncmFtRHJpdmVyLCBwZXJmUmVjb3JkZXIsXG4gICAgICAgIG9sZENvbXBpbGVyLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsIG9sZENvbXBpbGVyLnVzZVBvaXNvbmVkRGF0YSk7XG4gIH1cblxuICBpZiAocGVyZlJlY29yZGVyID09PSBudWxsKSB7XG4gICAgcGVyZlJlY29yZGVyID0gQWN0aXZlUGVyZlJlY29yZGVyLnplcm9lZFRvTm93KCk7XG4gIH1cblxuICBjb25zdCBpbmNyZW1lbnRhbENvbXBpbGF0aW9uID0gSW5jcmVtZW50YWxDb21waWxhdGlvbi5pbmNyZW1lbnRhbChcbiAgICAgIG5ld1Byb2dyYW0sIHZlcnNpb25NYXBGcm9tUHJvZ3JhbShuZXdQcm9ncmFtLCBwcm9ncmFtRHJpdmVyKSwgb2xkUHJvZ3JhbSwgb2xkU3RhdGUsXG4gICAgICBtb2RpZmllZFJlc291cmNlRmlsZXMsIHBlcmZSZWNvcmRlcik7XG5cbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxUeXBlU2NyaXB0LFxuICAgIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXI6IG9sZENvbXBpbGVyLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgdXNlUG9pc29uZWREYXRhOiBvbGRDb21waWxlci51c2VQb2lzb25lZERhdGEsXG4gICAgb3B0aW9uczogb2xkQ29tcGlsZXIub3B0aW9ucyxcbiAgICBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3ksXG4gICAgaW5jcmVtZW50YWxDb21waWxhdGlvbixcbiAgICBwcm9ncmFtRHJpdmVyLFxuICAgIG5ld1Byb2dyYW0sXG4gICAgcGVyZlJlY29yZGVyLFxuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIGBDb21waWxhdGlvblRpY2tldGAgZGlyZWN0bHkgZnJvbSBhbiBvbGQgYHRzLlByb2dyYW1gIGFuZCBhc3NvY2lhdGVkIEFuZ3VsYXIgY29tcGlsYXRpb25cbiAqIHN0YXRlLCBhbG9uZyB3aXRoIGEgbmV3IGB0cy5Qcm9ncmFtYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluY3JlbWVudGFsRnJvbVN0YXRlVGlja2V0KFxuICAgIG9sZFByb2dyYW06IHRzLlByb2dyYW0sIG9sZFN0YXRlOiBJbmNyZW1lbnRhbFN0YXRlLCBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgIG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zLCBpbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICBwcm9ncmFtRHJpdmVyOiBQcm9ncmFtRHJpdmVyLCBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD4sXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXJ8bnVsbCwgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogYm9vbGVhbixcbiAgICB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4pOiBDb21waWxhdGlvblRpY2tldCB7XG4gIGlmIChwZXJmUmVjb3JkZXIgPT09IG51bGwpIHtcbiAgICBwZXJmUmVjb3JkZXIgPSBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKTtcbiAgfVxuICBjb25zdCBpbmNyZW1lbnRhbENvbXBpbGF0aW9uID0gSW5jcmVtZW50YWxDb21waWxhdGlvbi5pbmNyZW1lbnRhbChcbiAgICAgIG5ld1Byb2dyYW0sIHZlcnNpb25NYXBGcm9tUHJvZ3JhbShuZXdQcm9ncmFtLCBwcm9ncmFtRHJpdmVyKSwgb2xkUHJvZ3JhbSwgb2xkU3RhdGUsXG4gICAgICBtb2RpZmllZFJlc291cmNlRmlsZXMsIHBlcmZSZWNvcmRlcik7XG4gIHJldHVybiB7XG4gICAga2luZDogQ29tcGlsYXRpb25UaWNrZXRLaW5kLkluY3JlbWVudGFsVHlwZVNjcmlwdCxcbiAgICBuZXdQcm9ncmFtLFxuICAgIG9wdGlvbnMsXG4gICAgaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgIGluY3JlbWVudGFsQ29tcGlsYXRpb24sXG4gICAgcHJvZ3JhbURyaXZlcixcbiAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgIHVzZVBvaXNvbmVkRGF0YSxcbiAgICBwZXJmUmVjb3JkZXIsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvdXJjZUNoYW5nZVRpY2tldChjb21waWxlcjogTmdDb21waWxlciwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8c3RyaW5nPik6XG4gICAgSW5jcmVtZW50YWxSZXNvdXJjZUNvbXBpbGF0aW9uVGlja2V0IHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZSxcbiAgICBjb21waWxlcixcbiAgICBtb2RpZmllZFJlc291cmNlRmlsZXMsXG4gICAgcGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXIuemVyb2VkVG9Ob3coKSxcbiAgfTtcbn1cblxuXG4vKipcbiAqIFRoZSBoZWFydCBvZiB0aGUgQW5ndWxhciBJdnkgY29tcGlsZXIuXG4gKlxuICogVGhlIGBOZ0NvbXBpbGVyYCBwcm92aWRlcyBhbiBBUEkgZm9yIHBlcmZvcm1pbmcgQW5ndWxhciBjb21waWxhdGlvbiB3aXRoaW4gYSBjdXN0b20gVHlwZVNjcmlwdFxuICogY29tcGlsZXIuIEVhY2ggaW5zdGFuY2Ugb2YgYE5nQ29tcGlsZXJgIHN1cHBvcnRzIGEgc2luZ2xlIGNvbXBpbGF0aW9uLCB3aGljaCBtaWdodCBiZVxuICogaW5jcmVtZW50YWwuXG4gKlxuICogYE5nQ29tcGlsZXJgIGlzIGxhenksIGFuZCBkb2VzIG5vdCBwZXJmb3JtIGFueSBvZiB0aGUgd29yayBvZiB0aGUgY29tcGlsYXRpb24gdW50aWwgb25lIG9mIGl0c1xuICogb3V0cHV0IG1ldGhvZHMgKGUuZy4gYGdldERpYWdub3N0aWNzYCkgaXMgY2FsbGVkLlxuICpcbiAqIFNlZSB0aGUgUkVBRE1FLm1kIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgTmdDb21waWxlciB7XG4gIC8qKlxuICAgKiBMYXppbHkgZXZhbHVhdGVkIHN0YXRlIG9mIHRoZSBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhpcyBpcyBjcmVhdGVkIG9uIGRlbWFuZCBieSBjYWxsaW5nIGBlbnN1cmVBbmFseXplZGAuXG4gICAqL1xuICBwcml2YXRlIGNvbXBpbGF0aW9uOiBMYXp5Q29tcGlsYXRpb25TdGF0ZXxudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogQW55IGRpYWdub3N0aWNzIHJlbGF0ZWQgdG8gdGhlIGNvbnN0cnVjdGlvbiBvZiB0aGUgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIFRoZXNlIGFyZSBkaWFnbm9zdGljcyB3aGljaCBhcm9zZSBkdXJpbmcgc2V0dXAgb2YgdGhlIGhvc3QgYW5kL29yIHByb2dyYW0uXG4gICAqL1xuICBwcml2YXRlIGNvbnN0cnVjdGlvbkRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAvKipcbiAgICogTm9uLXRlbXBsYXRlIGRpYWdub3N0aWNzIHJlbGF0ZWQgdG8gdGhlIHByb2dyYW0gaXRzZWxmLiBEb2VzIG5vdCBpbmNsdWRlIHRlbXBsYXRlXG4gICAqIGRpYWdub3N0aWNzIGJlY2F1c2UgdGhlIHRlbXBsYXRlIHR5cGUgY2hlY2tlciBtZW1vaXplcyB0aGVtIGl0c2VsZi5cbiAgICpcbiAgICogVGhpcyBpcyBzZXQgYnkgKGFuZCBtZW1vaXplcykgYGdldE5vblRlbXBsYXRlRGlhZ25vc3RpY3NgLlxuICAgKi9cbiAgcHJpdmF0ZSBub25UZW1wbGF0ZURpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW118bnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBjbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGN1cnJlbnRQcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBwcml2YXRlIGVudHJ5UG9pbnQ6IHRzLlNvdXJjZUZpbGV8bnVsbDtcbiAgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXI7XG4gIHByaXZhdGUgcmVzb3VyY2VNYW5hZ2VyOiBBZGFwdGVyUmVzb3VyY2VMb2FkZXI7XG4gIHByaXZhdGUgY3ljbGVBbmFseXplcjogQ3ljbGVBbmFseXplcjtcbiAgcmVhZG9ubHkgaWdub3JlRm9yRGlhZ25vc3RpY3M6IFNldDx0cy5Tb3VyY2VGaWxlPjtcbiAgcmVhZG9ubHkgaWdub3JlRm9yRW1pdDogU2V0PHRzLlNvdXJjZUZpbGU+O1xuXG4gIC8qKlxuICAgKiBgTmdDb21waWxlcmAgY2FuIGJlIHJldXNlZCBmb3IgbXVsdGlwbGUgY29tcGlsYXRpb25zIChmb3IgcmVzb3VyY2Utb25seSBjaGFuZ2VzKSwgYW5kIGVhY2hcbiAgICogbmV3IGNvbXBpbGF0aW9uIHVzZXMgYSBmcmVzaCBgUGVyZlJlY29yZGVyYC4gVGh1cywgY2xhc3NlcyBjcmVhdGVkIHdpdGggYSBsaWZlc3BhbiBvZiB0aGVcbiAgICogYE5nQ29tcGlsZXJgIHVzZSBhIGBEZWxlZ2F0aW5nUGVyZlJlY29yZGVyYCBzbyB0aGUgYFBlcmZSZWNvcmRlcmAgdGhleSB3cml0ZSB0byBjYW4gYmUgdXBkYXRlZFxuICAgKiB3aXRoIGVhY2ggZnJlc2ggY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGRlbGVnYXRpbmdQZXJmUmVjb3JkZXIgPSBuZXcgRGVsZWdhdGluZ1BlcmZSZWNvcmRlcih0aGlzLnBlcmZSZWNvcmRlcik7XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgYSBgQ29tcGlsYXRpb25UaWNrZXRgIGludG8gYW4gYE5nQ29tcGlsZXJgIGluc3RhbmNlIGZvciB0aGUgcmVxdWVzdGVkIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBEZXBlbmRpbmcgb24gdGhlIG5hdHVyZSBvZiB0aGUgY29tcGlsYXRpb24gcmVxdWVzdCwgdGhlIGBOZ0NvbXBpbGVyYCBpbnN0YW5jZSBtYXkgYmUgcmV1c2VkXG4gICAqIGZyb20gYSBwcmV2aW91cyBjb21waWxhdGlvbiBhbmQgdXBkYXRlZCB3aXRoIGFueSBjaGFuZ2VzLCBpdCBtYXkgYmUgYSBuZXcgaW5zdGFuY2Ugd2hpY2hcbiAgICogaW5jcmVtZW50YWxseSByZXVzZXMgc3RhdGUgZnJvbSBhIHByZXZpb3VzIGNvbXBpbGF0aW9uLCBvciBpdCBtYXkgcmVwcmVzZW50IGEgZnJlc2hcbiAgICogY29tcGlsYXRpb24gZW50aXJlbHkuXG4gICAqL1xuICBzdGF0aWMgZnJvbVRpY2tldCh0aWNrZXQ6IENvbXBpbGF0aW9uVGlja2V0LCBhZGFwdGVyOiBOZ0NvbXBpbGVyQWRhcHRlcikge1xuICAgIHN3aXRjaCAodGlja2V0LmtpbmQpIHtcbiAgICAgIGNhc2UgQ29tcGlsYXRpb25UaWNrZXRLaW5kLkZyZXNoOlxuICAgICAgICByZXR1cm4gbmV3IE5nQ29tcGlsZXIoXG4gICAgICAgICAgICBhZGFwdGVyLFxuICAgICAgICAgICAgdGlja2V0Lm9wdGlvbnMsXG4gICAgICAgICAgICB0aWNrZXQudHNQcm9ncmFtLFxuICAgICAgICAgICAgdGlja2V0LnByb2dyYW1Ecml2ZXIsXG4gICAgICAgICAgICB0aWNrZXQuaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgICAgICAgICAgSW5jcmVtZW50YWxDb21waWxhdGlvbi5mcmVzaChcbiAgICAgICAgICAgICAgICB0aWNrZXQudHNQcm9ncmFtLCB2ZXJzaW9uTWFwRnJvbVByb2dyYW0odGlja2V0LnRzUHJvZ3JhbSwgdGlja2V0LnByb2dyYW1Ecml2ZXIpKSxcbiAgICAgICAgICAgIHRpY2tldC5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICAgICAgdGlja2V0LnVzZVBvaXNvbmVkRGF0YSxcbiAgICAgICAgICAgIHRpY2tldC5wZXJmUmVjb3JkZXIsXG4gICAgICAgICk7XG4gICAgICBjYXNlIENvbXBpbGF0aW9uVGlja2V0S2luZC5JbmNyZW1lbnRhbFR5cGVTY3JpcHQ6XG4gICAgICAgIHJldHVybiBuZXcgTmdDb21waWxlcihcbiAgICAgICAgICAgIGFkYXB0ZXIsXG4gICAgICAgICAgICB0aWNrZXQub3B0aW9ucyxcbiAgICAgICAgICAgIHRpY2tldC5uZXdQcm9ncmFtLFxuICAgICAgICAgICAgdGlja2V0LnByb2dyYW1Ecml2ZXIsXG4gICAgICAgICAgICB0aWNrZXQuaW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5LFxuICAgICAgICAgICAgdGlja2V0LmluY3JlbWVudGFsQ29tcGlsYXRpb24sXG4gICAgICAgICAgICB0aWNrZXQuZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgICAgICAgIHRpY2tldC51c2VQb2lzb25lZERhdGEsXG4gICAgICAgICAgICB0aWNrZXQucGVyZlJlY29yZGVyLFxuICAgICAgICApO1xuICAgICAgY2FzZSBDb21waWxhdGlvblRpY2tldEtpbmQuSW5jcmVtZW50YWxSZXNvdXJjZTpcbiAgICAgICAgY29uc3QgY29tcGlsZXIgPSB0aWNrZXQuY29tcGlsZXI7XG4gICAgICAgIGNvbXBpbGVyLnVwZGF0ZVdpdGhDaGFuZ2VkUmVzb3VyY2VzKHRpY2tldC5tb2RpZmllZFJlc291cmNlRmlsZXMsIHRpY2tldC5wZXJmUmVjb3JkZXIpO1xuICAgICAgICByZXR1cm4gY29tcGlsZXI7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgYWRhcHRlcjogTmdDb21waWxlckFkYXB0ZXIsXG4gICAgICByZWFkb25seSBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHByaXZhdGUgaW5wdXRQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgcmVhZG9ubHkgcHJvZ3JhbURyaXZlcjogUHJvZ3JhbURyaXZlcixcbiAgICAgIHJlYWRvbmx5IGluY3JlbWVudGFsU3RyYXRlZ3k6IEluY3JlbWVudGFsQnVpbGRTdHJhdGVneSxcbiAgICAgIHJlYWRvbmx5IGluY3JlbWVudGFsQ29tcGlsYXRpb246IEluY3JlbWVudGFsQ29tcGlsYXRpb24sXG4gICAgICByZWFkb25seSBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiBib29sZWFuLFxuICAgICAgcmVhZG9ubHkgdXNlUG9pc29uZWREYXRhOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBsaXZlUGVyZlJlY29yZGVyOiBBY3RpdmVQZXJmUmVjb3JkZXIsXG4gICkge1xuICAgIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MucHVzaCguLi50aGlzLmFkYXB0ZXIuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MpO1xuICAgIGNvbnN0IGluY29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnNEaWFnbm9zdGljID0gdmVyaWZ5Q29tcGF0aWJsZVR5cGVDaGVja09wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICBpZiAoaW5jb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc0RpYWdub3N0aWMgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3MucHVzaChpbmNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zRGlhZ25vc3RpYyk7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IGlucHV0UHJvZ3JhbTtcbiAgICB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQgPSAhIXRoaXMub3B0aW9ucy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjtcblxuICAgIHRoaXMuZW50cnlQb2ludCA9XG4gICAgICAgIGFkYXB0ZXIuZW50cnlQb2ludCAhPT0gbnVsbCA/IGdldFNvdXJjZUZpbGVPck51bGwoaW5wdXRQcm9ncmFtLCBhZGFwdGVyLmVudHJ5UG9pbnQpIDogbnVsbDtcblxuICAgIGNvbnN0IG1vZHVsZVJlc29sdXRpb25DYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShcbiAgICAgICAgdGhpcy5hZGFwdGVyLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgICAgICAgLy8gZG9lbid0IHJldGFpbiBhIHJlZmVyZW5jZSB0byBgdGhpc2AsIGlmIG90aGVyIGNsb3N1cmVzIGluIHRoZSBjb25zdHJ1Y3RvciBoZXJlIHJlZmVyZW5jZVxuICAgICAgICAvLyBgdGhpc2AgaW50ZXJuYWxseSB0aGVuIGEgY2xvc3VyZSBjcmVhdGVkIGhlcmUgd291bGQgcmV0YWluIHRoZW0uIFRoaXMgY2FuIGNhdXNlIG1ham9yXG4gICAgICAgIC8vIG1lbW9yeSBsZWFrIGlzc3VlcyBzaW5jZSB0aGUgYG1vZHVsZVJlc29sdXRpb25DYWNoZWAgaXMgYSBsb25nLWxpdmVkIG9iamVjdCBhbmQgZmluZHMgaXRzXG4gICAgICAgIC8vIHdheSBpbnRvIGFsbCBraW5kcyBvZiBwbGFjZXMgaW5zaWRlIFRTIGludGVybmFsIG9iamVjdHMuXG4gICAgICAgIHRoaXMuYWRhcHRlci5nZXRDYW5vbmljYWxGaWxlTmFtZS5iaW5kKHRoaXMuYWRhcHRlcikpO1xuICAgIHRoaXMubW9kdWxlUmVzb2x2ZXIgPVxuICAgICAgICBuZXcgTW9kdWxlUmVzb2x2ZXIoaW5wdXRQcm9ncmFtLCB0aGlzLm9wdGlvbnMsIHRoaXMuYWRhcHRlciwgbW9kdWxlUmVzb2x1dGlvbkNhY2hlKTtcbiAgICB0aGlzLnJlc291cmNlTWFuYWdlciA9IG5ldyBBZGFwdGVyUmVzb3VyY2VMb2FkZXIoYWRhcHRlciwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIgPSBuZXcgQ3ljbGVBbmFseXplcihcbiAgICAgICAgbmV3IEltcG9ydEdyYXBoKGlucHV0UHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLCB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxTdGF0ZSh0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc3RhdGUsIGlucHV0UHJvZ3JhbSk7XG5cbiAgICB0aGlzLmlnbm9yZUZvckRpYWdub3N0aWNzID1cbiAgICAgICAgbmV3IFNldChpbnB1dFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gdGhpcy5hZGFwdGVyLmlzU2hpbShzZikpKTtcbiAgICB0aGlzLmlnbm9yZUZvckVtaXQgPSB0aGlzLmFkYXB0ZXIuaWdub3JlRm9yRW1pdDtcblxuICAgIGxldCBkdHNGaWxlQ291bnQgPSAwO1xuICAgIGxldCBub25EdHNGaWxlQ291bnQgPSAwO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgaW5wdXRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICBkdHNGaWxlQ291bnQrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vbkR0c0ZpbGVDb3VudCsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxpdmVQZXJmUmVjb3JkZXIuZXZlbnRDb3VudChQZXJmRXZlbnQuSW5wdXREdHNGaWxlLCBkdHNGaWxlQ291bnQpO1xuICAgIGxpdmVQZXJmUmVjb3JkZXIuZXZlbnRDb3VudChQZXJmRXZlbnQuSW5wdXRUc0ZpbGUsIG5vbkR0c0ZpbGVDb3VudCk7XG4gIH1cblxuICBnZXQgcGVyZlJlY29yZGVyKCk6IEFjdGl2ZVBlcmZSZWNvcmRlciB7XG4gICAgcmV0dXJuIHRoaXMubGl2ZVBlcmZSZWNvcmRlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHBvc2VzIHRoZSBgSW5jcmVtZW50YWxDb21waWxhdGlvbmAgdW5kZXIgYW4gb2xkIHByb3BlcnR5IG5hbWUgdGhhdCB0aGUgQ0xJIHVzZXMsIGF2b2lkaW5nIGFcbiAgICogY2hpY2tlbi1hbmQtZWdnIHByb2JsZW0gd2l0aCB0aGUgcmVuYW1lIHRvIGBpbmNyZW1lbnRhbENvbXBpbGF0aW9uYC5cbiAgICpcbiAgICogVE9ETyhhbHhodWIpOiByZW1vdmUgd2hlbiB0aGUgQ0xJIHVzZXMgdGhlIG5ldyBuYW1lLlxuICAgKi9cbiAgZ2V0IGluY3JlbWVudGFsRHJpdmVyKCk6IEluY3JlbWVudGFsQ29tcGlsYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb247XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVdpdGhDaGFuZ2VkUmVzb3VyY2VzKFxuICAgICAgY2hhbmdlZFJlc291cmNlczogU2V0PHN0cmluZz4sIHBlcmZSZWNvcmRlcjogQWN0aXZlUGVyZlJlY29yZGVyKTogdm9pZCB7XG4gICAgdGhpcy5saXZlUGVyZlJlY29yZGVyID0gcGVyZlJlY29yZGVyO1xuICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlci50YXJnZXQgPSBwZXJmUmVjb3JkZXI7XG5cbiAgICBwZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuUmVzb3VyY2VVcGRhdGUsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICAgIC8vIEFuYWx5c2lzIGhhc24ndCBoYXBwZW5lZCB5ZXQsIHNvIG5vIHVwZGF0ZSBpcyBuZWNlc3NhcnkgLSBhbnkgY2hhbmdlcyB0byByZXNvdXJjZXMgd2lsbFxuICAgICAgICAvLyBiZSBjYXB0dXJlZCBieSB0aGUgaW5pdGFsIGFuYWx5c2lzIHBhc3MgaXRzZWxmLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMucmVzb3VyY2VNYW5hZ2VyLmludmFsaWRhdGUoKTtcblxuICAgICAgY29uc3QgY2xhc3Nlc1RvVXBkYXRlID0gbmV3IFNldDxEZWNsYXJhdGlvbk5vZGU+KCk7XG4gICAgICBmb3IgKGNvbnN0IHJlc291cmNlRmlsZSBvZiBjaGFuZ2VkUmVzb3VyY2VzKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGVtcGxhdGVDbGFzcyBvZiB0aGlzLmdldENvbXBvbmVudHNXaXRoVGVtcGxhdGVGaWxlKHJlc291cmNlRmlsZSkpIHtcbiAgICAgICAgICBjbGFzc2VzVG9VcGRhdGUuYWRkKHRlbXBsYXRlQ2xhc3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBzdHlsZUNsYXNzIG9mIHRoaXMuZ2V0Q29tcG9uZW50c1dpdGhTdHlsZUZpbGUocmVzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIGNsYXNzZXNUb1VwZGF0ZS5hZGQoc3R5bGVDbGFzcyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBjbGF6eiBvZiBjbGFzc2VzVG9VcGRhdGUpIHtcbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyLnVwZGF0ZVJlc291cmNlcyhjbGF6eik7XG4gICAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6KSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmludmFsaWRhdGVDbGFzcyhjbGF6eik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSBkZXBlbmRlbmNpZXMgb2YgYSBmaWxlLlxuICAgKlxuICAgKiBJZiB0aGUgZmlsZSBpcyBub3QgcGFydCBvZiB0aGUgY29tcGlsYXRpb24sIGFuIGVtcHR5IGFycmF5IHdpbGwgYmUgcmV0dXJuZWQuXG4gICAqL1xuICBnZXRSZXNvdXJjZURlcGVuZGVuY2llcyhmaWxlOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nW10ge1xuICAgIHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIHJldHVybiB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uZGVwR3JhcGguZ2V0UmVzb3VyY2VEZXBlbmRlbmNpZXMoZmlsZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBBbmd1bGFyLXJlbGF0ZWQgZGlhZ25vc3RpY3MgZm9yIHRoaXMgY29tcGlsYXRpb24uXG4gICAqL1xuICBnZXREaWFnbm9zdGljcygpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmFkZE1lc3NhZ2VUZXh0RGV0YWlscyhcbiAgICAgICAgWy4uLnRoaXMuZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljcygpLCAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3MoKV0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgQW5ndWxhci1yZWxhdGVkIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBJZiBhIGB0cy5Tb3VyY2VGaWxlYCBpcyBwYXNzZWQsIG9ubHkgZGlhZ25vc3RpY3MgcmVsYXRlZCB0byB0aGF0IGZpbGUgYXJlIHJldHVybmVkLlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKGZpbGU6IHRzLlNvdXJjZUZpbGUsIG9wdGltaXplRm9yOiBPcHRpbWl6ZUZvcik6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkTWVzc2FnZVRleHREZXRhaWxzKFtcbiAgICAgIC4uLnRoaXMuZ2V0Tm9uVGVtcGxhdGVEaWFnbm9zdGljcygpLmZpbHRlcihkaWFnID0+IGRpYWcuZmlsZSA9PT0gZmlsZSksXG4gICAgICAuLi50aGlzLmdldFRlbXBsYXRlRGlhZ25vc3RpY3NGb3JGaWxlKGZpbGUsIG9wdGltaXplRm9yKVxuICAgIF0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBBbmd1bGFyLmlvIGVycm9yIGd1aWRlIGxpbmtzIHRvIGRpYWdub3N0aWNzIGZvciB0aGlzIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBhZGRNZXNzYWdlVGV4dERldGFpbHMoZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIGRpYWdub3N0aWNzLm1hcChkaWFnID0+IHtcbiAgICAgIGlmIChkaWFnLmNvZGUgJiYgQ09NUElMRVJfRVJST1JTX1dJVEhfR1VJREVTLmhhcyhuZ0Vycm9yQ29kZShkaWFnLmNvZGUpKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLmRpYWcsXG4gICAgICAgICAgbWVzc2FnZVRleHQ6IGRpYWcubWVzc2FnZVRleHQgK1xuICAgICAgICAgICAgICBgLiBGaW5kIG1vcmUgYXQgJHtFUlJPUl9ERVRBSUxTX1BBR0VfQkFTRV9VUkx9L05HJHtuZ0Vycm9yQ29kZShkaWFnLmNvZGUpfWBcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkaWFnO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgc2V0dXAtcmVsYXRlZCBkaWFnbm9zdGljcyBmb3IgdGhpcyBjb21waWxhdGlvbi5cbiAgICovXG4gIGdldE9wdGlvbkRpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuY29uc3RydWN0aW9uRGlhZ25vc3RpY3M7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBjdXJyZW50IGB0cy5Qcm9ncmFtYCBrbm93biB0byB0aGlzIGBOZ0NvbXBpbGVyYC5cbiAgICpcbiAgICogQ29tcGlsYXRpb24gYmVnaW5zIHdpdGggYW4gaW5wdXQgYHRzLlByb2dyYW1gLCBhbmQgZHVyaW5nIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgb3BlcmF0aW9ucyBuZXdcbiAgICogYHRzLlByb2dyYW1gcyBtYXkgYmUgcHJvZHVjZWQgdXNpbmcgdGhlIGBQcm9ncmFtRHJpdmVyYC4gVGhlIG1vc3QgcmVjZW50IHN1Y2ggYHRzLlByb2dyYW1gIHRvXG4gICAqIGJlIHByb2R1Y2VkIGlzIGF2YWlsYWJsZSBoZXJlLlxuICAgKlxuICAgKiBUaGlzIGB0cy5Qcm9ncmFtYCBzZXJ2ZXMgdHdvIGtleSBwdXJwb3NlczpcbiAgICpcbiAgICogKiBBcyBhbiBpbmNyZW1lbnRhbCBzdGFydGluZyBwb2ludCBmb3IgY3JlYXRpbmcgdGhlIG5leHQgYHRzLlByb2dyYW1gIGJhc2VkIG9uIGZpbGVzIHRoYXQgdGhlXG4gICAqICAgdXNlciBoYXMgY2hhbmdlZCAoZm9yIGNsaWVudHMgdXNpbmcgdGhlIFRTIGNvbXBpbGVyIHByb2dyYW0gQVBJcykuXG4gICAqXG4gICAqICogQXMgdGhlIFwiYmVmb3JlXCIgcG9pbnQgZm9yIGFuIGluY3JlbWVudGFsIGNvbXBpbGF0aW9uIGludm9jYXRpb24sIHRvIGRldGVybWluZSB3aGF0J3MgY2hhbmdlZFxuICAgKiAgIGJldHdlZW4gdGhlIG9sZCBhbmQgbmV3IHByb2dyYW1zIChmb3IgYWxsIGNvbXBpbGF0aW9ucykuXG4gICAqL1xuICBnZXRDdXJyZW50UHJvZ3JhbSgpOiB0cy5Qcm9ncmFtIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UHJvZ3JhbTtcbiAgfVxuXG4gIGdldFRlbXBsYXRlVHlwZUNoZWNrZXIoKTogVGVtcGxhdGVUeXBlQ2hlY2tlciB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnVGhlIGBUZW1wbGF0ZVR5cGVDaGVja2VyYCBkb2VzIG5vdCB3b3JrIHdpdGhvdXQgYGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXJgLicpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lbnN1cmVBbmFseXplZCgpLnRlbXBsYXRlVHlwZUNoZWNrZXI7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIHRoZSBgdHMuRGVjbGFyYXRpb25gcyBmb3IgYW55IGNvbXBvbmVudChzKSB3aGljaCB1c2UgdGhlIGdpdmVuIHRlbXBsYXRlIGZpbGUuXG4gICAqL1xuICBnZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlRmlsZSh0ZW1wbGF0ZUZpbGVQYXRoOiBzdHJpbmcpOiBSZWFkb25seVNldDxEZWNsYXJhdGlvbk5vZGU+IHtcbiAgICBjb25zdCB7cmVzb3VyY2VSZWdpc3RyeX0gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgcmV0dXJuIHJlc291cmNlUmVnaXN0cnkuZ2V0Q29tcG9uZW50c1dpdGhUZW1wbGF0ZShyZXNvbHZlKHRlbXBsYXRlRmlsZVBhdGgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgdGhlIGB0cy5EZWNsYXJhdGlvbmBzIGZvciBhbnkgY29tcG9uZW50KHMpIHdoaWNoIHVzZSB0aGUgZ2l2ZW4gdGVtcGxhdGUgZmlsZS5cbiAgICovXG4gIGdldENvbXBvbmVudHNXaXRoU3R5bGVGaWxlKHN0eWxlRmlsZVBhdGg6IHN0cmluZyk6IFJlYWRvbmx5U2V0PERlY2xhcmF0aW9uTm9kZT4ge1xuICAgIGNvbnN0IHtyZXNvdXJjZVJlZ2lzdHJ5fSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gcmVzb3VyY2VSZWdpc3RyeS5nZXRDb21wb25lbnRzV2l0aFN0eWxlKHJlc29sdmUoc3R5bGVGaWxlUGF0aCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBleHRlcm5hbCByZXNvdXJjZXMgZm9yIHRoZSBnaXZlbiBjb21wb25lbnQuXG4gICAqL1xuICBnZXRDb21wb25lbnRSZXNvdXJjZXMoY2xhc3NEZWNsOiBEZWNsYXJhdGlvbk5vZGUpOiBDb21wb25lbnRSZXNvdXJjZXN8bnVsbCB7XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjbGFzc0RlY2wpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qge3Jlc291cmNlUmVnaXN0cnl9ID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuICAgIGNvbnN0IHN0eWxlcyA9IHJlc291cmNlUmVnaXN0cnkuZ2V0U3R5bGVzKGNsYXNzRGVjbCk7XG4gICAgY29uc3QgdGVtcGxhdGUgPSByZXNvdXJjZVJlZ2lzdHJ5LmdldFRlbXBsYXRlKGNsYXNzRGVjbCk7XG4gICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge3N0eWxlcywgdGVtcGxhdGV9O1xuICB9XG5cbiAgZ2V0TWV0YShjbGFzc0RlY2w6IERlY2xhcmF0aW9uTm9kZSk6IFBpcGVNZXRhfERpcmVjdGl2ZU1ldGF8bnVsbCB7XG4gICAgaWYgKCFpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbihjbGFzc0RlY2wpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShjbGFzc0RlY2wpO1xuICAgIGNvbnN0IHttZXRhUmVhZGVyfSA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICBjb25zdCBtZXRhID0gbWV0YVJlYWRlci5nZXRQaXBlTWV0YWRhdGEocmVmKSA/PyBtZXRhUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKHJlZik7XG4gICAgaWYgKG1ldGEgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIEFuZ3VsYXIncyBhbmFseXNpcyBzdGVwIChhcyBhIHByZWN1cnNvciB0byBgZ2V0RGlhZ25vc3RpY3NgIG9yIGBwcmVwYXJlRW1pdGApXG4gICAqIGFzeW5jaHJvbm91c2x5LlxuICAgKlxuICAgKiBOb3JtYWxseSwgdGhpcyBvcGVyYXRpb24gaGFwcGVucyBsYXppbHkgd2hlbmV2ZXIgYGdldERpYWdub3N0aWNzYCBvciBgcHJlcGFyZUVtaXRgIGFyZSBjYWxsZWQuXG4gICAqIEhvd2V2ZXIsIGNlcnRhaW4gY29uc3VtZXJzIG1heSB3aXNoIHRvIGFsbG93IGZvciBhbiBhc3luY2hyb25vdXMgcGhhc2Ugb2YgYW5hbHlzaXMsIHdoZXJlXG4gICAqIHJlc291cmNlcyBzdWNoIGFzIGBzdHlsZVVybHNgIGFyZSByZXNvbHZlZCBhc3luY2hvbm91c2x5LiBJbiB0aGVzZSBjYXNlcyBgYW5hbHl6ZUFzeW5jYCBtdXN0IGJlXG4gICAqIGNhbGxlZCBmaXJzdCwgYW5kIGl0cyBgUHJvbWlzZWAgYXdhaXRlZCBwcmlvciB0byBjYWxsaW5nIGFueSBvdGhlciBBUElzIG9mIGBOZ0NvbXBpbGVyYC5cbiAgICovXG4gIGFzeW5jIGFuYWx5emVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5jb21waWxhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLkFuYWx5c2lzLCBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmNvbXBpbGF0aW9uID0gdGhpcy5tYWtlQ29tcGlsYXRpb24oKTtcblxuICAgICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplQXN5bmMoc2YpO1xuICAgICAgICBpZiAoYW5hbHlzaXNQcm9taXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKGFuYWx5c2lzUHJvbWlzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuXG4gICAgICB0aGlzLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuQW5hbHlzaXMpO1xuICAgICAgdGhpcy5yZXNvbHZlQ29tcGlsYXRpb24odGhpcy5jb21waWxhdGlvbi50cmFpdENvbXBpbGVyKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGxhenkgcm91dGVzIGRldGVjdGVkIGR1cmluZyBhbmFseXNpcy5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgY2FsbGVkIGZvciBvbmUgc3BlY2lmaWMgcm91dGUsIG9yIHRvIHJldHJpZXZlIGFsbCB0b3AtbGV2ZWwgcm91dGVzLlxuICAgKi9cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdIHtcbiAgICBpZiAoZW50cnlSb3V0ZSkge1xuICAgICAgLy8gaHR0czovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyL2Jsb2IvNTA3MzJlMTU2L3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2NvbXBpbGVyX2hvc3QudHMjTDE3NS1MMTg4KS5cbiAgICAgIC8vXG4gICAgICAvLyBgQGFuZ3VsYXIvY2xpYCB3aWxsIGFsd2F5cyBjYWxsIHRoaXMgQVBJIHdpdGggYW4gYWJzb2x1dGUgcGF0aCwgc28gdGhlIHJlc29sdXRpb24gc3RlcCBpc1xuICAgICAgLy8gbm90IG5lY2Vzc2FyeSwgYnV0IGtlZXBpbmcgaXQgYmFja3dhcmRzIGNvbXBhdGlibGUgaW4gY2FzZSBzb21lb25lIGVsc2UgaXMgdXNpbmcgdGhlIEFQSS5cblxuICAgICAgLy8gUmVsYXRpdmUgZW50cnkgcGF0aHMgYXJlIGRpc2FsbG93ZWQuXG4gICAgICBpZiAoZW50cnlSb3V0ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gbGlzdCBsYXp5IHJvdXRlczogUmVzb2x1dGlvbiBvZiByZWxhdGl2ZSBwYXRocyAoJHtcbiAgICAgICAgICAgIGVudHJ5Um91dGV9KSBpcyBub3Qgc3VwcG9ydGVkLmApO1xuICAgICAgfVxuXG4gICAgICAvLyBOb24tcmVsYXRpdmUgZW50cnkgcGF0aHMgZmFsbCBpbnRvIG9uZSBvZiB0aGUgZm9sbG93aW5nIGNhdGVnb3JpZXM6XG4gICAgICAvLyAtIEFic29sdXRlIHN5c3RlbSBwYXRocyAoZS5nLiBgL2Zvby9iYXIvbXktcHJvamVjdC9teS1tb2R1bGVgKSwgd2hpY2ggYXJlIHVuYWZmZWN0ZWQgYnkgdGhlXG4gICAgICAvLyAgIGxvZ2ljIGJlbG93LlxuICAgICAgLy8gLSBQYXRocyB0byBlbnRlcm5hbCBtb2R1bGVzIChlLmcuIGBzb21lLWxpYmApLlxuICAgICAgLy8gLSBQYXRocyBtYXBwZWQgdG8gZGlyZWN0b3JpZXMgaW4gYHRzY29uZmlnLmpzb25gIChlLmcuIGBzaGFyZWQvbXktbW9kdWxlYCkuXG4gICAgICAvLyAgIChTZWUgaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svbW9kdWxlLXJlc29sdXRpb24uaHRtbCNwYXRoLW1hcHBpbmcuKVxuICAgICAgLy9cbiAgICAgIC8vIEluIGFsbCBjYXNlcyBhYm92ZSwgdGhlIGBjb250YWluaW5nRmlsZWAgYXJndW1lbnQgaXMgaWdub3JlZCwgc28gd2UgY2FuIGp1c3QgdGFrZSB0aGUgZmlyc3RcbiAgICAgIC8vIG9mIHRoZSByb290IGZpbGVzLlxuICAgICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSB0aGlzLmlucHV0UHJvZ3JhbS5nZXRSb290RmlsZU5hbWVzKClbMF07XG4gICAgICBjb25zdCBbZW50cnlQYXRoLCBtb2R1bGVOYW1lXSA9IGVudHJ5Um91dGUuc3BsaXQoJyMnKTtcbiAgICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID1cbiAgICAgICAgICByZXNvbHZlTW9kdWxlTmFtZShlbnRyeVBhdGgsIGNvbnRhaW5pbmdGaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuYWRhcHRlciwgbnVsbCk7XG5cbiAgICAgIGlmIChyZXNvbHZlZE1vZHVsZSkge1xuICAgICAgICBlbnRyeVJvdXRlID0gZW50cnlQb2ludEtleUZvcihyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lLCBtb2R1bGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcbiAgICByZXR1cm4gY29tcGlsYXRpb24ucm91dGVBbmFseXplci5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGZXRjaCB0cmFuc2Zvcm1lcnMgYW5kIG90aGVyIGluZm9ybWF0aW9uIHdoaWNoIGlzIG5lY2Vzc2FyeSBmb3IgYSBjb25zdW1lciB0byBgZW1pdGAgdGhlXG4gICAqIHByb2dyYW0gd2l0aCBBbmd1bGFyLWFkZGVkIGRlZmluaXRpb25zLlxuICAgKi9cbiAgcHJlcGFyZUVtaXQoKToge1xuICAgIHRyYW5zZm9ybWVyczogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICB9IHtcbiAgICBjb25zdCBjb21waWxhdGlvbiA9IHRoaXMuZW5zdXJlQW5hbHl6ZWQoKTtcblxuICAgIGNvbnN0IGNvcmVJbXBvcnRzRnJvbSA9IGNvbXBpbGF0aW9uLmlzQ29yZSA/IGdldFIzU3ltYm9sc0ZpbGUodGhpcy5pbnB1dFByb2dyYW0pIDogbnVsbDtcbiAgICBsZXQgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyO1xuICAgIGlmIChjb3JlSW1wb3J0c0Zyb20gIT09IG51bGwpIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyKGNvcmVJbXBvcnRzRnJvbS5maWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGltcG9ydFJld3JpdGVyID0gbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGRlZmF1bHRJbXBvcnRUcmFja2VyID0gbmV3IERlZmF1bHRJbXBvcnRUcmFja2VyKCk7XG5cbiAgICBjb25zdCBiZWZvcmUgPSBbXG4gICAgICBpdnlUcmFuc2Zvcm1GYWN0b3J5KFxuICAgICAgICAgIGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIsIGNvbXBpbGF0aW9uLnJlZmxlY3RvciwgaW1wb3J0UmV3cml0ZXIsIGRlZmF1bHRJbXBvcnRUcmFja2VyLFxuICAgICAgICAgIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgY29tcGlsYXRpb24uaXNDb3JlLCB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQpLFxuICAgICAgYWxpYXNUcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLnRyYWl0Q29tcGlsZXIuZXhwb3J0U3RhdGVtZW50cyksXG4gICAgICBkZWZhdWx0SW1wb3J0VHJhY2tlci5pbXBvcnRQcmVzZXJ2aW5nVHJhbnNmb3JtZXIoKSxcbiAgICBdO1xuXG4gICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnM6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdID0gW107XG4gICAgaWYgKGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMgIT09IG51bGwpIHtcbiAgICAgIGFmdGVyRGVjbGFyYXRpb25zLnB1c2goXG4gICAgICAgICAgZGVjbGFyYXRpb25UcmFuc2Zvcm1GYWN0b3J5KGNvbXBpbGF0aW9uLmR0c1RyYW5zZm9ybXMsIGltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuXG4gICAgLy8gT25seSBhZGQgYWxpYXNpbmcgcmUtZXhwb3J0cyB0byB0aGUgLmQudHMgb3V0cHV0IGlmIHRoZSBgQWxpYXNpbmdIb3N0YCByZXF1ZXN0cyBpdC5cbiAgICBpZiAoY29tcGlsYXRpb24uYWxpYXNpbmdIb3N0ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmFsaWFzaW5nSG9zdC5hbGlhc0V4cG9ydHNJbkR0cykge1xuICAgICAgYWZ0ZXJEZWNsYXJhdGlvbnMucHVzaChhbGlhc1RyYW5zZm9ybUZhY3RvcnkoY29tcGlsYXRpb24udHJhaXRDb21waWxlci5leHBvcnRTdGF0ZW1lbnRzKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYWRhcHRlci5mYWN0b3J5VHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgYmVmb3JlLnB1c2goXG4gICAgICAgICAgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybSh0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIuc291cmNlSW5mbywgaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgYmVmb3JlLnB1c2goaXZ5U3dpdGNoVHJhbnNmb3JtKTtcblxuICAgIHJldHVybiB7dHJhbnNmb3JtZXJzOiB7YmVmb3JlLCBhZnRlckRlY2xhcmF0aW9uc30gYXMgdHMuQ3VzdG9tVHJhbnNmb3JtZXJzfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gdGhlIGluZGV4aW5nIHByb2Nlc3MgYW5kIHJldHVybiBhIGBNYXBgIG9mIGFsbCBpbmRleGVkIGNvbXBvbmVudHMuXG4gICAqXG4gICAqIFNlZSB0aGUgYGluZGV4aW5nYCBwYWNrYWdlIGZvciBtb3JlIGRldGFpbHMuXG4gICAqL1xuICBnZXRJbmRleGVkQ29tcG9uZW50cygpOiBNYXA8RGVjbGFyYXRpb25Ob2RlLCBJbmRleGVkQ29tcG9uZW50PiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBJbmRleGluZ0NvbnRleHQoKTtcbiAgICBjb21waWxhdGlvbi50cmFpdENvbXBpbGVyLmluZGV4KGNvbnRleHQpO1xuICAgIHJldHVybiBnZW5lcmF0ZUFuYWx5c2lzKGNvbnRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVBbmFseXplZCh0aGlzOiBOZ0NvbXBpbGVyKTogTGF6eUNvbXBpbGF0aW9uU3RhdGUge1xuICAgIGlmICh0aGlzLmNvbXBpbGF0aW9uID09PSBudWxsKSB7XG4gICAgICB0aGlzLmFuYWx5emVTeW5jKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbXBpbGF0aW9uITtcbiAgfVxuXG4gIHByaXZhdGUgYW5hbHl6ZVN5bmMoKTogdm9pZCB7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuQW5hbHlzaXMsICgpID0+IHtcbiAgICAgIHRoaXMuY29tcGlsYXRpb24gPSB0aGlzLm1ha2VDb21waWxhdGlvbigpO1xuICAgICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlci5hbmFseXplU3luYyhzZik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5BbmFseXNpcyk7XG5cbiAgICAgIHRoaXMucmVzb2x2ZUNvbXBpbGF0aW9uKHRoaXMuY29tcGlsYXRpb24udHJhaXRDb21waWxlcik7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVDb21waWxhdGlvbih0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgdGhpcy5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuUmVzb2x2ZSwgKCkgPT4ge1xuICAgICAgdHJhaXRDb21waWxlci5yZXNvbHZlKCk7XG5cbiAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIGFuYWx5c2lzIGlzIGNvbXBsZXRlIGFuZCB0aGUgY29tcGlsZXIgY2FuIG5vdyBjYWxjdWxhdGUgd2hpY2ggZmlsZXMgbmVlZCB0b1xuICAgICAgLy8gYmUgZW1pdHRlZCwgc28gZG8gdGhhdC5cbiAgICAgIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5yZWNvcmRTdWNjZXNzZnVsQW5hbHlzaXModHJhaXRDb21waWxlcik7XG5cbiAgICAgIHRoaXMucGVyZlJlY29yZGVyLm1lbW9yeShQZXJmQ2hlY2twb2ludC5SZXNvbHZlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGZ1bGxUZW1wbGF0ZVR5cGVDaGVjaygpOiBib29sZWFuIHtcbiAgICAvLyBEZXRlcm1pbmUgdGhlIHN0cmljdG5lc3MgbGV2ZWwgb2YgdHlwZSBjaGVja2luZyBiYXNlZCBvbiBjb21waWxlciBvcHRpb25zLiBBc1xuICAgIC8vIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGEgc3VwZXJzZXQgb2YgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2AsIHRoZSBmb3JtZXIgaW1wbGllcyB0aGUgbGF0dGVyLlxuICAgIC8vIEFsc28gc2VlIGB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc2Agd2hlcmUgaXQgaXMgdmVyaWZpZWQgdGhhdCBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYFxuICAgIC8vIGlzIG5vdCBkaXNhYmxlZCB3aGVuIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGVuYWJsZWQuXG4gICAgY29uc3Qgc3RyaWN0VGVtcGxhdGVzID0gISF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzO1xuICAgIHJldHVybiBzdHJpY3RUZW1wbGF0ZXMgfHwgISF0aGlzLm9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBlQ2hlY2tpbmdDb25maWcoKTogVHlwZUNoZWNraW5nQ29uZmlnIHtcbiAgICAvLyBEZXRlcm1pbmUgdGhlIHN0cmljdG5lc3MgbGV2ZWwgb2YgdHlwZSBjaGVja2luZyBiYXNlZCBvbiBjb21waWxlciBvcHRpb25zLiBBc1xuICAgIC8vIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGEgc3VwZXJzZXQgb2YgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2AsIHRoZSBmb3JtZXIgaW1wbGllcyB0aGUgbGF0dGVyLlxuICAgIC8vIEFsc28gc2VlIGB2ZXJpZnlDb21wYXRpYmxlVHlwZUNoZWNrT3B0aW9uc2Agd2hlcmUgaXQgaXMgdmVyaWZpZWQgdGhhdCBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYFxuICAgIC8vIGlzIG5vdCBkaXNhYmxlZCB3aGVuIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIGVuYWJsZWQuXG4gICAgY29uc3Qgc3RyaWN0VGVtcGxhdGVzID0gISF0aGlzLm9wdGlvbnMuc3RyaWN0VGVtcGxhdGVzO1xuXG4gICAgY29uc3QgdXNlSW5saW5lVHlwZUNvbnN0cnVjdG9ycyA9IHRoaXMucHJvZ3JhbURyaXZlci5zdXBwb3J0c0lubGluZU9wZXJhdGlvbnM7XG5cbiAgICAvLyBGaXJzdCBzZWxlY3QgYSB0eXBlLWNoZWNraW5nIGNvbmZpZ3VyYXRpb24sIGJhc2VkIG9uIHdoZXRoZXIgZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGlzXG4gICAgLy8gcmVxdWVzdGVkLlxuICAgIGxldCB0eXBlQ2hlY2tpbmdDb25maWc6IFR5cGVDaGVja2luZ0NvbmZpZztcbiAgICBpZiAodGhpcy5mdWxsVGVtcGxhdGVUeXBlQ2hlY2spIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZyA9IHtcbiAgICAgICAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogdHJ1ZSxcbiAgICAgICAgYWx3YXlzQ2hlY2tTY2hlbWFJblRlbXBsYXRlQm9kaWVzOiB0cnVlLFxuICAgICAgICBjaGVja1R5cGVPZklucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TnVsbElucHV0QmluZGluZ3M6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIEV2ZW4gaW4gZnVsbCB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1vZGUsIERPTSBiaW5kaW5nIGNoZWNrcyBhcmUgbm90IHF1aXRlIHJlYWR5IHlldC5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIGNoZWNrVHlwZU9mQW5pbWF0aW9uRXZlbnRzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIENoZWNraW5nIG9mIERPTSBldmVudHMgY3VycmVudGx5IGhhcyBhbiBhZHZlcnNlIGVmZmVjdCBvbiBkZXZlbG9wZXIgZXhwZXJpZW5jZSxcbiAgICAgICAgLy8gZS5nLiBmb3IgYDxpbnB1dCAoYmx1cik9XCJ1cGRhdGUoJGV2ZW50LnRhcmdldC52YWx1ZSlcIj5gIGVuYWJsaW5nIHRoaXMgY2hlY2sgcmVzdWx0cyBpbjpcbiAgICAgICAgLy8gLSBlcnJvciBUUzI1MzE6IE9iamVjdCBpcyBwb3NzaWJseSAnbnVsbCcuXG4gICAgICAgIC8vIC0gZXJyb3IgVFMyMzM5OiBQcm9wZXJ0eSAndmFsdWUnIGRvZXMgbm90IGV4aXN0IG9uIHR5cGUgJ0V2ZW50VGFyZ2V0Jy5cbiAgICAgICAgY2hlY2tUeXBlT2ZEb21FdmVudHM6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICAgIC8vIE5vbi1ET00gcmVmZXJlbmNlcyBoYXZlIHRoZSBjb3JyZWN0IHR5cGUgaW4gVmlldyBFbmdpbmUgc28gdGhlcmUgaXMgbm8gc3RyaWN0bmVzcyBmbGFnLlxuICAgICAgICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IHRydWUsXG4gICAgICAgIC8vIFBpcGVzIGFyZSBjaGVja2VkIGluIFZpZXcgRW5naW5lIHNvIHRoZXJlIGlzIG5vIHN0cmljdG5lc3MgZmxhZy5cbiAgICAgICAgY2hlY2tUeXBlT2ZQaXBlczogdHJ1ZSxcbiAgICAgICAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogc3RyaWN0VGVtcGxhdGVzLFxuICAgICAgICB1c2VDb250ZXh0R2VuZXJpY1R5cGU6IHN0cmljdFRlbXBsYXRlcyxcbiAgICAgICAgc3RyaWN0TGl0ZXJhbFR5cGVzOiB0cnVlLFxuICAgICAgICBlbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyOiB0aGlzLmVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICAgIHVzZUlubGluZVR5cGVDb25zdHJ1Y3RvcnMsXG4gICAgICAgIC8vIFdhcm5pbmdzIGZvciBzdWJvcHRpbWFsIHR5cGUgaW5mZXJlbmNlIGFyZSBvbmx5IGVuYWJsZWQgaWYgaW4gTGFuZ3VhZ2UgU2VydmljZSBtb2RlXG4gICAgICAgIC8vIChwcm92aWRpbmcgdGhlIGZ1bGwgVGVtcGxhdGVUeXBlQ2hlY2tlciBBUEkpIGFuZCBpZiBzdHJpY3QgbW9kZSBpcyBub3QgZW5hYmxlZC4gSW4gc3RyaWN0XG4gICAgICAgIC8vIG1vZGUsIHRoZSB1c2VyIGlzIGluIGZ1bGwgY29udHJvbCBvZiB0eXBlIGluZmVyZW5jZS5cbiAgICAgICAgc3VnZ2VzdGlvbnNGb3JTdWJvcHRpbWFsVHlwZUluZmVyZW5jZTogdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyICYmICFzdHJpY3RUZW1wbGF0ZXMsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcgPSB7XG4gICAgICAgIGFwcGx5VGVtcGxhdGVDb250ZXh0R3VhcmRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tRdWVyaWVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUZW1wbGF0ZUJvZGllczogZmFsc2UsXG4gICAgICAgIC8vIEVuYWJsZSBkZWVwIHNjaGVtYSBjaGVja2luZyBpbiBcImJhc2ljXCIgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlIG9ubHkgaWYgQ2xvc3VyZVxuICAgICAgICAvLyBjb21waWxhdGlvbiBpcyByZXF1ZXN0ZWQsIHdoaWNoIGlzIGEgZ29vZCBwcm94eSBmb3IgXCJvbmx5IGluIGdvb2dsZTNcIi5cbiAgICAgICAgYWx3YXlzQ2hlY2tTY2hlbWFJblRlbXBsYXRlQm9kaWVzOiB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsXG4gICAgICAgIGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nczogZmFsc2UsXG4gICAgICAgIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgaG9ub3JBY2Nlc3NNb2RpZmllcnNGb3JJbnB1dEJpbmRpbmdzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZEb21CaW5kaW5nczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBmYWxzZSxcbiAgICAgICAgY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHM6IGZhbHNlLFxuICAgICAgICBjaGVja1R5cGVPZkRvbUV2ZW50czogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlczogZmFsc2UsXG4gICAgICAgIGNoZWNrVHlwZU9mUGlwZXM6IGZhbHNlLFxuICAgICAgICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzOiBmYWxzZSxcbiAgICAgICAgdXNlQ29udGV4dEdlbmVyaWNUeXBlOiBmYWxzZSxcbiAgICAgICAgc3RyaWN0TGl0ZXJhbFR5cGVzOiBmYWxzZSxcbiAgICAgICAgZW5hYmxlVGVtcGxhdGVUeXBlQ2hlY2tlcjogdGhpcy5lbmFibGVUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgICB1c2VJbmxpbmVUeXBlQ29uc3RydWN0b3JzLFxuICAgICAgICAvLyBJbiBcImJhc2ljXCIgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBtb2RlLCBubyB3YXJuaW5ncyBhcmUgcHJvZHVjZWQgc2luY2UgbW9zdCB0aGluZ3MgYXJlXG4gICAgICAgIC8vIG5vdCBjaGVja2VkIGFueXdheXMuXG4gICAgICAgIHN1Z2dlc3Rpb25zRm9yU3Vib3B0aW1hbFR5cGVJbmZlcmVuY2U6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBBcHBseSBleHBsaWNpdGx5IGNvbmZpZ3VyZWQgc3RyaWN0bmVzcyBmbGFncyBvbiB0b3Agb2YgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgIC8vIGJhc2VkIG9uIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZklucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0SW5wdXRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5hcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdElucHV0QWNjZXNzTW9kaWZpZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5ob25vckFjY2Vzc01vZGlmaWVyc0ZvcklucHV0QmluZGluZ3MgPVxuICAgICAgICAgIHRoaXMub3B0aW9ucy5zdHJpY3RJbnB1dEFjY2Vzc01vZGlmaWVycztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdHJpY3ROdWxsSW5wdXRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TnVsbElucHV0QmluZGluZ3MgPSB0aGlzLm9wdGlvbnMuc3RyaWN0TnVsbElucHV0VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuY2hlY2tUeXBlT2ZPdXRwdXRFdmVudHMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0T3V0cHV0RXZlbnRUeXBlcztcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50cyA9IHRoaXMub3B0aW9ucy5zdHJpY3RPdXRwdXRFdmVudFR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tRXZlbnRzID0gdGhpcy5vcHRpb25zLnN0cmljdERvbUV2ZW50VHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdERvbUxvY2FsUmVmVHlwZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdHlwZUNoZWNraW5nQ29uZmlnLmNoZWNrVHlwZU9mRG9tUmVmZXJlbmNlcyA9IHRoaXMub3B0aW9ucy5zdHJpY3REb21Mb2NhbFJlZlR5cGVzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdEF0dHJpYnV0ZVR5cGVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy5jaGVja1R5cGVPZkF0dHJpYnV0ZXMgPSB0aGlzLm9wdGlvbnMuc3RyaWN0QXR0cmlidXRlVHlwZXM7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHR5cGVDaGVja2luZ0NvbmZpZy51c2VDb250ZXh0R2VuZXJpY1R5cGUgPSB0aGlzLm9wdGlvbnMuc3RyaWN0Q29udGV4dEdlbmVyaWNzO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0eXBlQ2hlY2tpbmdDb25maWcuc3RyaWN0TGl0ZXJhbFR5cGVzID0gdGhpcy5vcHRpb25zLnN0cmljdExpdGVyYWxUeXBlcztcbiAgICB9XG5cbiAgICByZXR1cm4gdHlwZUNoZWNraW5nQ29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUZW1wbGF0ZURpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uID0gdGhpcy5lbnN1cmVBbmFseXplZCgpO1xuXG4gICAgLy8gR2V0IHRoZSBkaWFnbm9zdGljcy5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLmlucHV0UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgdGhpcy5hZGFwdGVyLmlzU2hpbShzZikpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAgLi4uY29tcGlsYXRpb24udGVtcGxhdGVUeXBlQ2hlY2tlci5nZXREaWFnbm9zdGljc0ZvckZpbGUoc2YsIE9wdGltaXplRm9yLldob2xlUHJvZ3JhbSkpO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2dyYW0gPSB0aGlzLnByb2dyYW1Ecml2ZXIuZ2V0UHJvZ3JhbSgpO1xuICAgIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneS5zZXRJbmNyZW1lbnRhbFN0YXRlKHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5zdGF0ZSwgcHJvZ3JhbSk7XG4gICAgdGhpcy5jdXJyZW50UHJvZ3JhbSA9IHByb2dyYW07XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIGdldFRlbXBsYXRlRGlhZ25vc3RpY3NGb3JGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlLCBvcHRpbWl6ZUZvcjogT3B0aW1pemVGb3IpOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7XG4gICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG5cbiAgICAvLyBHZXQgdGhlIGRpYWdub3N0aWNzLlxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlICYmICF0aGlzLmFkYXB0ZXIuaXNTaGltKHNmKSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5jb21waWxhdGlvbi50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yRmlsZShzZiwgb3B0aW1pemVGb3IpKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9ncmFtID0gdGhpcy5wcm9ncmFtRHJpdmVyLmdldFByb2dyYW0oKTtcbiAgICB0aGlzLmluY3JlbWVudGFsU3RyYXRlZ3kuc2V0SW5jcmVtZW50YWxTdGF0ZSh0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uc3RhdGUsIHByb2dyYW0pO1xuICAgIHRoaXMuY3VycmVudFByb2dyYW0gPSBwcm9ncmFtO1xuXG4gICAgcmV0dXJuIGRpYWdub3N0aWNzO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXROb25UZW1wbGF0ZURpYWdub3N0aWNzKCk6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgaWYgKHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcyA9PT0gbnVsbCkge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmVuc3VyZUFuYWx5emVkKCk7XG4gICAgICB0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3MgPSBbLi4uY29tcGlsYXRpb24udHJhaXRDb21waWxlci5kaWFnbm9zdGljc107XG4gICAgICBpZiAodGhpcy5lbnRyeVBvaW50ICE9PSBudWxsICYmIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMubm9uVGVtcGxhdGVEaWFnbm9zdGljcy5wdXNoKC4uLmNoZWNrRm9yUHJpdmF0ZUV4cG9ydHMoXG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQsIHRoaXMuaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCksIGNvbXBpbGF0aW9uLmV4cG9ydFJlZmVyZW5jZUdyYXBoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm5vblRlbXBsYXRlRGlhZ25vc3RpY3M7XG4gIH1cblxuICBwcml2YXRlIG1ha2VDb21waWxhdGlvbigpOiBMYXp5Q29tcGlsYXRpb25TdGF0ZSB7XG4gICAgY29uc3QgY2hlY2tlciA9IHRoaXMuaW5wdXRQcm9ncmFtLmdldFR5cGVDaGVja2VyKCk7XG5cbiAgICBjb25zdCByZWZsZWN0b3IgPSBuZXcgVHlwZVNjcmlwdFJlZmxlY3Rpb25Ib3N0KGNoZWNrZXIpO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBSZWZlcmVuY2VFbWl0dGVyLlxuICAgIGxldCByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyO1xuICAgIGxldCBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCA9PT0gbnVsbCB8fCAhdGhpcy5vcHRpb25zLl91c2VIb3N0Rm9ySW1wb3J0R2VuZXJhdGlvbikge1xuICAgICAgbGV0IGxvY2FsSW1wb3J0U3RyYXRlZ3k6IFJlZmVyZW5jZUVtaXRTdHJhdGVneTtcblxuICAgICAgLy8gVGhlIHN0cmF0ZWd5IHVzZWQgZm9yIGxvY2FsLCBpbi1wcm9qZWN0IGltcG9ydHMgZGVwZW5kcyBvbiB3aGV0aGVyIFRTIGhhcyBiZWVuIGNvbmZpZ3VyZWRcbiAgICAgIC8vIHdpdGggcm9vdERpcnMuIElmIHNvLCB0aGVuIG11bHRpcGxlIGRpcmVjdG9yaWVzIG1heSBiZSBtYXBwZWQgaW4gdGhlIHNhbWUgXCJtb2R1bGVcbiAgICAgIC8vIG5hbWVzcGFjZVwiIGFuZCB0aGUgbG9naWMgb2YgYExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3lgIGlzIHJlcXVpcmVkIHRvIGdlbmVyYXRlIGNvcnJlY3RcbiAgICAgIC8vIGltcG9ydHMgd2hpY2ggbWF5IGNyb3NzIHRoZXNlIG11bHRpcGxlIGRpcmVjdG9yaWVzLiBPdGhlcndpc2UsIHBsYWluIHJlbGF0aXZlIGltcG9ydHMgYXJlXG4gICAgICAvLyBzdWZmaWNpZW50LlxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5yb290RGlyICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAodGhpcy5vcHRpb25zLnJvb3REaXJzICE9PSB1bmRlZmluZWQgJiYgdGhpcy5vcHRpb25zLnJvb3REaXJzLmxlbmd0aCA+IDApKSB7XG4gICAgICAgIC8vIHJvb3REaXJzIGxvZ2ljIGlzIGluIGVmZmVjdCAtIHVzZSB0aGUgYExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3lgIGZvciBpbi1wcm9qZWN0IHJlbGF0aXZlXG4gICAgICAgIC8vIGltcG9ydHMuXG4gICAgICAgIGxvY2FsSW1wb3J0U3RyYXRlZ3kgPSBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneShcbiAgICAgICAgICAgIHJlZmxlY3RvciwgbmV3IExvZ2ljYWxGaWxlU3lzdGVtKFsuLi50aGlzLmFkYXB0ZXIucm9vdERpcnNdLCB0aGlzLmFkYXB0ZXIpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFBsYWluIHJlbGF0aXZlIGltcG9ydHMgYXJlIGFsbCB0aGF0J3MgbmVlZGVkLlxuICAgICAgICBsb2NhbEltcG9ydFN0cmF0ZWd5ID0gbmV3IFJlbGF0aXZlUGF0aFN0cmF0ZWd5KHJlZmxlY3Rvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBDb21waWxlckhvc3QgZG9lc24ndCBoYXZlIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyBidWlsZCBhbiBOUE0tY2VudHJpYyByZWZlcmVuY2VcbiAgICAgIC8vIHJlc29sdXRpb24gc3RyYXRlZ3kuXG4gICAgICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBOZXh0LCBhdHRlbXB0IHRvIHVzZSBhbiBhYnNvbHV0ZSBpbXBvcnQuXG4gICAgICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KHRoaXMuaW5wdXRQcm9ncmFtLCBjaGVja2VyLCB0aGlzLm1vZHVsZVJlc29sdmVyLCByZWZsZWN0b3IpLFxuICAgICAgICAvLyBGaW5hbGx5LCBjaGVjayBpZiB0aGUgcmVmZXJlbmNlIGlzIGJlaW5nIHdyaXR0ZW4gaW50byBhIGZpbGUgd2l0aGluIHRoZSBwcm9qZWN0J3MgLnRzXG4gICAgICAgIC8vIHNvdXJjZXMsIGFuZCB1c2UgYSByZWxhdGl2ZSBpbXBvcnQgaWYgc28uIElmIHRoaXMgZmFpbHMsIFJlZmVyZW5jZUVtaXR0ZXIgd2lsbCB0aHJvd1xuICAgICAgICAvLyBhbiBlcnJvci5cbiAgICAgICAgbG9jYWxJbXBvcnRTdHJhdGVneSxcbiAgICAgIF0pO1xuXG4gICAgICAvLyBJZiBhbiBlbnRyeXBvaW50IGlzIHByZXNlbnQsIHRoZW4gYWxsIHVzZXIgaW1wb3J0cyBzaG91bGQgYmUgZGlyZWN0ZWQgdGhyb3VnaCB0aGVcbiAgICAgIC8vIGVudHJ5cG9pbnQgYW5kIHByaXZhdGUgZXhwb3J0cyBhcmUgbm90IG5lZWRlZC4gVGhlIGNvbXBpbGVyIHdpbGwgdmFsaWRhdGUgdGhhdCBhbGwgcHVibGljbHlcbiAgICAgIC8vIHZpc2libGUgZGlyZWN0aXZlcy9waXBlcyBhcmUgaW1wb3J0YWJsZSB2aWEgdGhpcyBlbnRyeXBvaW50LlxuICAgICAgaWYgKHRoaXMuZW50cnlQb2ludCA9PT0gbnVsbCAmJiB0aGlzLm9wdGlvbnMuZ2VuZXJhdGVEZWVwUmVleHBvcnRzID09PSB0cnVlKSB7XG4gICAgICAgIC8vIE5vIGVudHJ5cG9pbnQgaXMgcHJlc2VudCBhbmQgZGVlcCByZS1leHBvcnRzIHdlcmUgcmVxdWVzdGVkLCBzbyBjb25maWd1cmUgdGhlIGFsaWFzaW5nXG4gICAgICAgIC8vIHN5c3RlbSB0byBnZW5lcmF0ZSB0aGVtLlxuICAgICAgICBhbGlhc2luZ0hvc3QgPSBuZXcgUHJpdmF0ZUV4cG9ydEFsaWFzaW5nSG9zdChyZWZsZWN0b3IpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgQ29tcGlsZXJIb3N0IHN1cHBvcnRzIGZpbGVOYW1lVG9Nb2R1bGVOYW1lLCBzbyB1c2UgdGhhdCB0byBlbWl0IGltcG9ydHMuXG4gICAgICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIHVzZSBsb2NhbCBpZGVudGlmaWVycyBpZiBhdmFpbGFibGUuXG4gICAgICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgICAgICAvLyBUaGVuIHVzZSBhbGlhc2VkIHJlZmVyZW5jZXMgKHRoaXMgaXMgYSB3b3JrYXJvdW5kIHRvIFN0cmljdERlcHMgY2hlY2tzKS5cbiAgICAgICAgbmV3IEFsaWFzU3RyYXRlZ3koKSxcbiAgICAgICAgLy8gVGhlbiB1c2UgZmlsZU5hbWVUb01vZHVsZU5hbWUgdG8gZW1pdCBpbXBvcnRzLlxuICAgICAgICBuZXcgVW5pZmllZE1vZHVsZXNTdHJhdGVneShyZWZsZWN0b3IsIHRoaXMuYWRhcHRlci51bmlmaWVkTW9kdWxlc0hvc3QpLFxuICAgICAgXSk7XG4gICAgICBhbGlhc2luZ0hvc3QgPSBuZXcgVW5pZmllZE1vZHVsZXNBbGlhc2luZ0hvc3QodGhpcy5hZGFwdGVyLnVuaWZpZWRNb2R1bGVzSG9zdCk7XG4gICAgfVxuXG4gICAgY29uc3QgZXZhbHVhdG9yID1cbiAgICAgICAgbmV3IFBhcnRpYWxFdmFsdWF0b3IocmVmbGVjdG9yLCBjaGVja2VyLCB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24uZGVwR3JhcGgpO1xuICAgIGNvbnN0IGR0c1JlYWRlciA9IG5ldyBEdHNNZXRhZGF0YVJlYWRlcihjaGVja2VyLCByZWZsZWN0b3IpO1xuICAgIGNvbnN0IGxvY2FsTWV0YVJlZ2lzdHJ5ID0gbmV3IExvY2FsTWV0YWRhdGFSZWdpc3RyeSgpO1xuICAgIGNvbnN0IGxvY2FsTWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXIgPSBsb2NhbE1ldGFSZWdpc3RyeTtcbiAgICBjb25zdCBkZXBTY29wZVJlYWRlciA9IG5ldyBNZXRhZGF0YUR0c01vZHVsZVNjb3BlUmVzb2x2ZXIoZHRzUmVhZGVyLCBhbGlhc2luZ0hvc3QpO1xuICAgIGNvbnN0IHNjb3BlUmVnaXN0cnkgPVxuICAgICAgICBuZXcgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5KGxvY2FsTWV0YVJlYWRlciwgZGVwU2NvcGVSZWFkZXIsIHJlZkVtaXR0ZXIsIGFsaWFzaW5nSG9zdCk7XG4gICAgY29uc3Qgc2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyID0gc2NvcGVSZWdpc3RyeTtcbiAgICBjb25zdCBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlciA9IHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjtcbiAgICBjb25zdCBtZXRhUmVnaXN0cnkgPSBuZXcgQ29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5KFtsb2NhbE1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeV0pO1xuICAgIGNvbnN0IGluamVjdGFibGVSZWdpc3RyeSA9IG5ldyBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeShyZWZsZWN0b3IpO1xuXG4gICAgY29uc3QgbWV0YVJlYWRlciA9IG5ldyBDb21wb3VuZE1ldGFkYXRhUmVhZGVyKFtsb2NhbE1ldGFSZWFkZXIsIGR0c1JlYWRlcl0pO1xuICAgIGNvbnN0IHR5cGVDaGVja1Njb3BlUmVnaXN0cnkgPSBuZXcgVHlwZUNoZWNrU2NvcGVSZWdpc3RyeShzY29wZVJlYWRlciwgbWV0YVJlYWRlcik7XG5cblxuICAgIC8vIElmIGEgZmxhdCBtb2R1bGUgZW50cnlwb2ludCB3YXMgc3BlY2lmaWVkLCB0aGVuIHRyYWNrIHJlZmVyZW5jZXMgdmlhIGEgYFJlZmVyZW5jZUdyYXBoYCBpblxuICAgIC8vIG9yZGVyIHRvIHByb2R1Y2UgcHJvcGVyIGRpYWdub3N0aWNzIGZvciBpbmNvcnJlY3RseSBleHBvcnRlZCBkaXJlY3RpdmVzL3BpcGVzL2V0Yy4gSWYgdGhlcmVcbiAgICAvLyBpcyBubyBmbGF0IG1vZHVsZSBlbnRyeXBvaW50IHRoZW4gZG9uJ3QgcGF5IHRoZSBjb3N0IG9mIHRyYWNraW5nIHJlZmVyZW5jZXMuXG4gICAgbGV0IHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5O1xuICAgIGxldCBleHBvcnRSZWZlcmVuY2VHcmFwaDogUmVmZXJlbmNlR3JhcGh8bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMuZW50cnlQb2ludCAhPT0gbnVsbCkge1xuICAgICAgZXhwb3J0UmVmZXJlbmNlR3JhcGggPSBuZXcgUmVmZXJlbmNlR3JhcGgoKTtcbiAgICAgIHJlZmVyZW5jZXNSZWdpc3RyeSA9IG5ldyBSZWZlcmVuY2VHcmFwaEFkYXB0ZXIoZXhwb3J0UmVmZXJlbmNlR3JhcGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWZlcmVuY2VzUmVnaXN0cnkgPSBuZXcgTm9vcFJlZmVyZW5jZXNSZWdpc3RyeSgpO1xuICAgIH1cblxuICAgIGNvbnN0IHJvdXRlQW5hbHl6ZXIgPSBuZXcgTmdNb2R1bGVSb3V0ZUFuYWx5emVyKHRoaXMubW9kdWxlUmVzb2x2ZXIsIGV2YWx1YXRvcik7XG5cbiAgICBjb25zdCBkdHNUcmFuc2Zvcm1zID0gbmV3IER0c1RyYW5zZm9ybVJlZ2lzdHJ5KCk7XG5cbiAgICBjb25zdCBpc0NvcmUgPSBpc0FuZ3VsYXJDb3JlUGFja2FnZSh0aGlzLmlucHV0UHJvZ3JhbSk7XG5cbiAgICBjb25zdCByZXNvdXJjZVJlZ2lzdHJ5ID0gbmV3IFJlc291cmNlUmVnaXN0cnkoKTtcblxuICAgIGNvbnN0IGNvbXBpbGF0aW9uTW9kZSA9XG4gICAgICAgIHRoaXMub3B0aW9ucy5jb21waWxhdGlvbk1vZGUgPT09ICdwYXJ0aWFsJyA/IENvbXBpbGF0aW9uTW9kZS5QQVJUSUFMIDogQ29tcGlsYXRpb25Nb2RlLkZVTEw7XG5cbiAgICAvLyBDeWNsZXMgYXJlIGhhbmRsZWQgaW4gZnVsbCBjb21waWxhdGlvbiBtb2RlIGJ5IFwicmVtb3RlIHNjb3BpbmdcIi5cbiAgICAvLyBcIlJlbW90ZSBzY29waW5nXCIgZG9lcyBub3Qgd29yayB3ZWxsIHdpdGggdHJlZSBzaGFraW5nIGZvciBsaWJyYXJpZXMuXG4gICAgLy8gU28gaW4gcGFydGlhbCBjb21waWxhdGlvbiBtb2RlLCB3aGVuIGJ1aWxkaW5nIGEgbGlicmFyeSwgYSBjeWNsZSB3aWxsIGNhdXNlIGFuIGVycm9yLlxuICAgIGNvbnN0IGN5Y2xlSGFuZGxpbmdTdHJhdGVneSA9IGNvbXBpbGF0aW9uTW9kZSA9PT0gQ29tcGlsYXRpb25Nb2RlLkZVTEwgP1xuICAgICAgICBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuVXNlUmVtb3RlU2NvcGluZyA6XG4gICAgICAgIEN5Y2xlSGFuZGxpbmdTdHJhdGVneS5FcnJvcjtcblxuICAgIC8vIFNldCB1cCB0aGUgSXZ5Q29tcGlsYXRpb24sIHdoaWNoIG1hbmFnZXMgc3RhdGUgZm9yIHRoZSBJdnkgdHJhbnNmb3JtZXIuXG4gICAgY29uc3QgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8dW5rbm93biwgdW5rbm93biwgU2VtYW50aWNTeW1ib2x8bnVsbCwgdW5rbm93bj5bXSA9IFtcbiAgICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIG1ldGFSZWFkZXIsIHNjb3BlUmVhZGVyLCBzY29wZVJlZ2lzdHJ5LFxuICAgICAgICAgIHR5cGVDaGVja1Njb3BlUmVnaXN0cnksIHJlc291cmNlUmVnaXN0cnksIGlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsXG4gICAgICAgICAgdGhpcy5hZGFwdGVyLnJvb3REaXJzLCB0aGlzLm9wdGlvbnMucHJlc2VydmVXaGl0ZXNwYWNlcyB8fCBmYWxzZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaTE4blVzZUV4dGVybmFsSWRzICE9PSBmYWxzZSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCAhPT0gZmFsc2UsIHRoaXMudXNlUG9pc29uZWREYXRhLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMsIHRoaXMubW9kdWxlUmVzb2x2ZXIsIHRoaXMuY3ljbGVBbmFseXplcixcbiAgICAgICAgICBjeWNsZUhhbmRsaW5nU3RyYXRlZ3ksIHJlZkVtaXR0ZXIsIHRoaXMuaW5jcmVtZW50YWxDb21waWxhdGlvbi5kZXBHcmFwaCxcbiAgICAgICAgICBpbmplY3RhYmxlUmVnaXN0cnksIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyLCB0aGlzLmNsb3N1cmVDb21waWxlckVuYWJsZWQsXG4gICAgICAgICAgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyKSxcblxuICAgICAgLy8gVE9ETyhhbHhodWIpOiB1bmRlcnN0YW5kIHdoeSB0aGUgY2FzdCBoZXJlIGlzIG5lY2Vzc2FyeSAoc29tZXRoaW5nIHRvIGRvIHdpdGggYG51bGxgXG4gICAgICAvLyBub3QgYmVpbmcgYXNzaWduYWJsZSB0byBgdW5rbm93bmAgd2hlbiB3cmFwcGVkIGluIGBSZWFkb25seWApLlxuICAgICAgLy8gY2xhbmctZm9ybWF0IG9mZlxuICAgICAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICAgIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBtZXRhUmVnaXN0cnksIHNjb3BlUmVnaXN0cnksIG1ldGFSZWFkZXIsXG4gICAgICAgICAgICBpbmplY3RhYmxlUmVnaXN0cnksIGlzQ29yZSwgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIsXG4gICAgICAgICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkLCBjb21waWxlVW5kZWNvcmF0ZWRDbGFzc2VzV2l0aEFuZ3VsYXJGZWF0dXJlcyxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIsXG4gICAgICAgICkgYXMgUmVhZG9ubHk8RGVjb3JhdG9ySGFuZGxlcjx1bmtub3duLCB1bmtub3duLCBTZW1hbnRpY1N5bWJvbCB8IG51bGwsdW5rbm93bj4+LFxuICAgICAgLy8gY2xhbmctZm9ybWF0IG9uXG4gICAgICAvLyBQaXBlIGhhbmRsZXIgbXVzdCBiZSBiZWZvcmUgaW5qZWN0YWJsZSBoYW5kbGVyIGluIGxpc3Qgc28gcGlwZSBmYWN0b3JpZXMgYXJlIHByaW50ZWRcbiAgICAgIC8vIGJlZm9yZSBpbmplY3RhYmxlIGZhY3RvcmllcyAoc28gaW5qZWN0YWJsZSBmYWN0b3JpZXMgY2FuIGRlbGVnYXRlIHRvIHRoZW0pXG4gICAgICBuZXcgUGlwZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgICAgcmVmbGVjdG9yLCBldmFsdWF0b3IsIG1ldGFSZWdpc3RyeSwgc2NvcGVSZWdpc3RyeSwgaW5qZWN0YWJsZVJlZ2lzdHJ5LCBpc0NvcmUsXG4gICAgICAgICAgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyKSxcbiAgICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGlzQ29yZSwgdGhpcy5vcHRpb25zLnN0cmljdEluamVjdGlvblBhcmFtZXRlcnMgfHwgZmFsc2UsIGluamVjdGFibGVSZWdpc3RyeSxcbiAgICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpLFxuICAgICAgbmV3IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgICByZWZsZWN0b3IsIGV2YWx1YXRvciwgbWV0YVJlYWRlciwgbWV0YVJlZ2lzdHJ5LCBzY29wZVJlZ2lzdHJ5LCByZWZlcmVuY2VzUmVnaXN0cnksIGlzQ29yZSxcbiAgICAgICAgICByb3V0ZUFuYWx5emVyLCByZWZFbWl0dGVyLCB0aGlzLmFkYXB0ZXIuZmFjdG9yeVRyYWNrZXIsIHRoaXMuY2xvc3VyZUNvbXBpbGVyRW5hYmxlZCxcbiAgICAgICAgICBpbmplY3RhYmxlUmVnaXN0cnksIHRoaXMuZGVsZWdhdGluZ1BlcmZSZWNvcmRlciwgdGhpcy5vcHRpb25zLmkxOG5JbkxvY2FsZSksXG4gICAgXTtcblxuICAgIGNvbnN0IHRyYWl0Q29tcGlsZXIgPSBuZXcgVHJhaXRDb21waWxlcihcbiAgICAgICAgaGFuZGxlcnMsIHJlZmxlY3RvciwgdGhpcy5kZWxlZ2F0aW5nUGVyZlJlY29yZGVyLCB0aGlzLmluY3JlbWVudGFsQ29tcGlsYXRpb24sXG4gICAgICAgIHRoaXMub3B0aW9ucy5jb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzICE9PSBmYWxzZSwgY29tcGlsYXRpb25Nb2RlLCBkdHNUcmFuc2Zvcm1zLFxuICAgICAgICBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcik7XG5cbiAgICAvLyBUZW1wbGF0ZSB0eXBlLWNoZWNraW5nIG1heSB1c2UgdGhlIGBQcm9ncmFtRHJpdmVyYCB0byBwcm9kdWNlIG5ldyBgdHMuUHJvZ3JhbWAocykuIElmIHRoaXNcbiAgICAvLyBoYXBwZW5zLCB0aGV5IG5lZWQgdG8gYmUgdHJhY2tlZCBieSB0aGUgYE5nQ29tcGlsZXJgLlxuICAgIGNvbnN0IG5vdGlmeWluZ0RyaXZlciA9XG4gICAgICAgIG5ldyBOb3RpZnlpbmdQcm9ncmFtRHJpdmVyV3JhcHBlcih0aGlzLnByb2dyYW1Ecml2ZXIsIChwcm9ncmFtOiB0cy5Qcm9ncmFtKSA9PiB7XG4gICAgICAgICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LnNldEluY3JlbWVudGFsU3RhdGUodGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnN0YXRlLCBwcm9ncmFtKTtcbiAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9ncmFtID0gcHJvZ3JhbTtcbiAgICAgICAgfSk7XG5cbiAgICBjb25zdCB0ZW1wbGF0ZVR5cGVDaGVja2VyID0gbmV3IFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsKFxuICAgICAgICB0aGlzLmlucHV0UHJvZ3JhbSwgbm90aWZ5aW5nRHJpdmVyLCB0cmFpdENvbXBpbGVyLCB0aGlzLmdldFR5cGVDaGVja2luZ0NvbmZpZygpLCByZWZFbWl0dGVyLFxuICAgICAgICByZWZsZWN0b3IsIHRoaXMuYWRhcHRlciwgdGhpcy5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLCBzY29wZVJlZ2lzdHJ5LCB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgICB0aGlzLmRlbGVnYXRpbmdQZXJmUmVjb3JkZXIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlzQ29yZSxcbiAgICAgIHRyYWl0Q29tcGlsZXIsXG4gICAgICByZWZsZWN0b3IsXG4gICAgICBzY29wZVJlZ2lzdHJ5LFxuICAgICAgZHRzVHJhbnNmb3JtcyxcbiAgICAgIGV4cG9ydFJlZmVyZW5jZUdyYXBoLFxuICAgICAgcm91dGVBbmFseXplcixcbiAgICAgIG1ldGFSZWFkZXIsXG4gICAgICB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgYWxpYXNpbmdIb3N0LFxuICAgICAgcmVmRW1pdHRlcixcbiAgICAgIHRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICByZXNvdXJjZVJlZ2lzdHJ5LFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgdGhlIGdpdmVuIGBQcm9ncmFtYCBpcyBAYW5ndWxhci9jb3JlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNBbmd1bGFyQ29yZVBhY2thZ2UocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IGJvb2xlYW4ge1xuICAvLyBMb29rIGZvciBpdHNfanVzdF9hbmd1bGFyLnRzIHNvbWV3aGVyZSBpbiB0aGUgcHJvZ3JhbS5cbiAgY29uc3QgcjNTeW1ib2xzID0gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtKTtcbiAgaWYgKHIzU3ltYm9scyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIExvb2sgZm9yIHRoZSBjb25zdGFudCBJVFNfSlVTVF9BTkdVTEFSIGluIHRoYXQgZmlsZS5cbiAgcmV0dXJuIHIzU3ltYm9scy5zdGF0ZW1lbnRzLnNvbWUoc3RtdCA9PiB7XG4gICAgLy8gVGhlIHN0YXRlbWVudCBtdXN0IGJlIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gc3RhdGVtZW50LlxuICAgIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGJlIGV4cG9ydGVkLlxuICAgIGlmIChzdG10Lm1vZGlmaWVycyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICFzdG10Lm1vZGlmaWVycy5zb21lKG1vZCA9PiBtb2Qua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHBvcnRLZXl3b3JkKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBJdCBtdXN0IGRlY2xhcmUgSVRTX0pVU1RfQU5HVUxBUi5cbiAgICByZXR1cm4gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLnNvbWUoZGVjbCA9PiB7XG4gICAgICAvLyBUaGUgZGVjbGFyYXRpb24gbXVzdCBtYXRjaCB0aGUgbmFtZS5cbiAgICAgIGlmICghdHMuaXNJZGVudGlmaWVyKGRlY2wubmFtZSkgfHwgZGVjbC5uYW1lLnRleHQgIT09ICdJVFNfSlVTVF9BTkdVTEFSJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBJdCBtdXN0IGluaXRpYWxpemUgdGhlIHZhcmlhYmxlIHRvIHRydWUuXG4gICAgICBpZiAoZGVjbC5pbml0aWFsaXplciA9PT0gdW5kZWZpbmVkIHx8IGRlY2wuaW5pdGlhbGl6ZXIua2luZCAhPT0gdHMuU3ludGF4S2luZC5UcnVlS2V5d29yZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGRlZmluaXRpb24gbWF0Y2hlcy5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBGaW5kIHRoZSAncjNfc3ltYm9scy50cycgZmlsZSBpbiB0aGUgZ2l2ZW4gYFByb2dyYW1gLCBvciByZXR1cm4gYG51bGxgIGlmIGl0IHdhc24ndCB0aGVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UjNTeW1ib2xzRmlsZShwcm9ncmFtOiB0cy5Qcm9ncmFtKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maW5kKGZpbGUgPT4gZmlsZS5maWxlTmFtZS5pbmRleE9mKCdyM19zeW1ib2xzLnRzJykgPj0gMCkgfHwgbnVsbDtcbn1cblxuLyoqXG4gKiBTaW5jZSBcInN0cmljdFRlbXBsYXRlc1wiIGlzIGEgdHJ1ZSBzdXBlcnNldCBvZiB0eXBlIGNoZWNraW5nIGNhcGFiaWxpdGllcyBjb21wYXJlZCB0b1xuICogXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiwgaXQgaXMgcmVxdWlyZWQgdGhhdCB0aGUgbGF0dGVyIGlzIG5vdCBleHBsaWNpdGx5IGRpc2FibGVkIGlmIHRoZVxuICogZm9ybWVyIGlzIGVuYWJsZWQuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmeUNvbXBhdGlibGVUeXBlQ2hlY2tPcHRpb25zKG9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zKTogdHMuRGlhZ25vc3RpY3xudWxsIHtcbiAgaWYgKG9wdGlvbnMuZnVsbFRlbXBsYXRlVHlwZUNoZWNrID09PSBmYWxzZSAmJiBvcHRpb25zLnN0cmljdFRlbXBsYXRlcyA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgY29kZTogbmdFcnJvckNvZGUoRXJyb3JDb2RlLkNPTkZJR19TVFJJQ1RfVEVNUExBVEVTX0lNUExJRVNfRlVMTF9URU1QTEFURV9UWVBFQ0hFQ0spLFxuICAgICAgZmlsZTogdW5kZWZpbmVkLFxuICAgICAgc3RhcnQ6IHVuZGVmaW5lZCxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgbWVzc2FnZVRleHQ6XG4gICAgICAgICAgYEFuZ3VsYXIgY29tcGlsZXIgb3B0aW9uIFwic3RyaWN0VGVtcGxhdGVzXCIgaXMgZW5hYmxlZCwgaG93ZXZlciBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIGRpc2FibGVkLlxuXG5IYXZpbmcgdGhlIFwic3RyaWN0VGVtcGxhdGVzXCIgZmxhZyBlbmFibGVkIGltcGxpZXMgdGhhdCBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIGFsc28gZW5hYmxlZCwgc29cbnRoZSBsYXR0ZXIgY2FuIG5vdCBiZSBleHBsaWNpdGx5IGRpc2FibGVkLlxuXG5PbmUgb2YgdGhlIGZvbGxvd2luZyBhY3Rpb25zIGlzIHJlcXVpcmVkOlxuMS4gUmVtb3ZlIHRoZSBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIG9wdGlvbi5cbjIuIFJlbW92ZSBcInN0cmljdFRlbXBsYXRlc1wiIG9yIHNldCBpdCB0byAnZmFsc2UnLlxuXG5Nb3JlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB0ZW1wbGF0ZSB0eXBlIGNoZWNraW5nIGNvbXBpbGVyIG9wdGlvbnMgY2FuIGJlIGZvdW5kIGluIHRoZSBkb2N1bWVudGF0aW9uOlxuaHR0cHM6Ly92OS5hbmd1bGFyLmlvL2d1aWRlL3RlbXBsYXRlLXR5cGVjaGVjayN0ZW1wbGF0ZS10eXBlLWNoZWNraW5nYCxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmNsYXNzIFJlZmVyZW5jZUdyYXBoQWRhcHRlciBpbXBsZW1lbnRzIFJlZmVyZW5jZXNSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZ3JhcGg6IFJlZmVyZW5jZUdyYXBoKSB7fVxuXG4gIGFkZChzb3VyY2U6IERlY2xhcmF0aW9uTm9kZSwgLi4ucmVmZXJlbmNlczogUmVmZXJlbmNlPERlY2xhcmF0aW9uTm9kZT5bXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3Qge25vZGV9IG9mIHJlZmVyZW5jZXMpIHtcbiAgICAgIGxldCBzb3VyY2VGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICBpZiAoc291cmNlRmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNvdXJjZUZpbGUgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkuZ2V0U291cmNlRmlsZSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IHJlY29yZCBsb2NhbCByZWZlcmVuY2VzIChub3QgcmVmZXJlbmNlcyBpbnRvIC5kLnRzIGZpbGVzKS5cbiAgICAgIGlmIChzb3VyY2VGaWxlID09PSB1bmRlZmluZWQgfHwgIWlzRHRzUGF0aChzb3VyY2VGaWxlLmZpbGVOYW1lKSkge1xuICAgICAgICB0aGlzLmdyYXBoLmFkZChzb3VyY2UsIG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBOb3RpZnlpbmdQcm9ncmFtRHJpdmVyV3JhcHBlciBpbXBsZW1lbnRzIFByb2dyYW1Ecml2ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZGVsZWdhdGU6IFByb2dyYW1Ecml2ZXIsIHByaXZhdGUgbm90aWZ5TmV3UHJvZ3JhbTogKHByb2dyYW06IHRzLlByb2dyYW0pID0+IHZvaWQpIHt9XG5cbiAgZ2V0IHN1cHBvcnRzSW5saW5lT3BlcmF0aW9ucygpIHtcbiAgICByZXR1cm4gdGhpcy5kZWxlZ2F0ZS5zdXBwb3J0c0lubGluZU9wZXJhdGlvbnM7XG4gIH1cblxuICBnZXRQcm9ncmFtKCk6IHRzLlByb2dyYW0ge1xuICAgIHJldHVybiB0aGlzLmRlbGVnYXRlLmdldFByb2dyYW0oKTtcbiAgfVxuXG4gIHVwZGF0ZUZpbGVzKGNvbnRlbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4sIHVwZGF0ZU1vZGU6IFVwZGF0ZU1vZGUpOiB2b2lkIHtcbiAgICB0aGlzLmRlbGVnYXRlLnVwZGF0ZUZpbGVzKGNvbnRlbnRzLCB1cGRhdGVNb2RlKTtcbiAgICB0aGlzLm5vdGlmeU5ld1Byb2dyYW0odGhpcy5kZWxlZ2F0ZS5nZXRQcm9ncmFtKCkpO1xuICB9XG5cbiAgZ2V0U291cmNlRmlsZVZlcnNpb24gPSB0aGlzLmRlbGVnYXRlLmdldFNvdXJjZUZpbGVWZXJzaW9uPy5iaW5kKHRoaXMpO1xufVxuXG5mdW5jdGlvbiB2ZXJzaW9uTWFwRnJvbVByb2dyYW0oXG4gICAgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgZHJpdmVyOiBQcm9ncmFtRHJpdmVyKTogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+fG51bGwge1xuICBpZiAoZHJpdmVyLmdldFNvdXJjZUZpbGVWZXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHZlcnNpb25zID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHBvc3NpYmx5UmVkaXJlY3RlZFNvdXJjZUZpbGUgb2YgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgY29uc3Qgc2YgPSB0b1VucmVkaXJlY3RlZFNvdXJjZUZpbGUocG9zc2libHlSZWRpcmVjdGVkU291cmNlRmlsZSk7XG4gICAgdmVyc2lvbnMuc2V0KGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpLCBkcml2ZXIuZ2V0U291cmNlRmlsZVZlcnNpb24oc2YpKTtcbiAgfVxuICByZXR1cm4gdmVyc2lvbnM7XG59XG4iXX0=