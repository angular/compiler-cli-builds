/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { compileClassMetadata, compileComponentFromMetadata, compileDeclareClassMetadata, compileDeclareComponentFromMetadata, CssSelector, DEFAULT_INTERPOLATION_CONFIG, DomElementSchemaRegistry, ExternalExpr, FactoryTarget, InterpolationConfig, makeBindingParser, ParseSourceFile, parseTemplate, R3TargetBinder, SelectorMatcher, WrappedNodeExpr } from '@angular/compiler';
import { ViewEncapsulation } from '@angular/compiler/src/core';
import * as ts from 'typescript';
import { ErrorCode, FatalDiagnosticError, makeDiagnostic, makeRelatedInformation } from '../../diagnostics';
import { absoluteFrom, relative } from '../../file_system';
import { Reference } from '../../imports';
import { extractSemanticTypeParameters, isArrayEqual, isReferenceEqual } from '../../incremental/semantic_graph';
import { extractDirectiveTypeCheckMeta, MetaType } from '../../metadata';
import { EnumValue } from '../../partial_evaluator';
import { PerfEvent } from '../../perf';
import { Decorator, reflectObjectLiteral } from '../../reflection';
import { HandlerFlags, HandlerPrecedence } from '../../transform';
import { createValueHasWrongTypeError, getDirectiveDiagnostics, getProviderDiagnostics } from './diagnostics';
import { DirectiveSymbol, extractDirectiveMetadata, parseFieldArrayValue } from './directive';
import { compileDeclareFactory, compileNgFactoryDefField } from './factory';
import { extractClassMetadata } from './metadata';
import { NgModuleSymbol } from './ng_module';
import { compileResults, findAngularDecorator, isAngularCoreReference, isExpressionForwardReference, readBaseClass, resolveProvidersRequiringFactory, toFactoryMetadata, unwrapExpression, wrapFunctionExpressionsInParens } from './util';
const EMPTY_MAP = new Map();
const EMPTY_ARRAY = [];
/**
 * Represents an Angular component.
 */
export class ComponentSymbol extends DirectiveSymbol {
    constructor() {
        super(...arguments);
        this.usedDirectives = [];
        this.usedPipes = [];
        this.isRemotelyScoped = false;
    }
    isEmitAffected(previousSymbol, publicApiAffected) {
        if (!(previousSymbol instanceof ComponentSymbol)) {
            return true;
        }
        // Create an equality function that considers symbols equal if they represent the same
        // declaration, but only if the symbol in the current compilation does not have its public API
        // affected.
        const isSymbolUnaffected = (current, previous) => isReferenceEqual(current, previous) && !publicApiAffected.has(current.symbol);
        // The emit of a component is affected if either of the following is true:
        //  1. The component used to be remotely scoped but no longer is, or vice versa.
        //  2. The list of used directives has changed or any of those directives have had their public
        //     API changed. If the used directives have been reordered but not otherwise affected then
        //     the component must still be re-emitted, as this may affect directive instantiation order.
        //  3. The list of used pipes has changed, or any of those pipes have had their public API
        //     changed.
        return this.isRemotelyScoped !== previousSymbol.isRemotelyScoped ||
            !isArrayEqual(this.usedDirectives, previousSymbol.usedDirectives, isSymbolUnaffected) ||
            !isArrayEqual(this.usedPipes, previousSymbol.usedPipes, isSymbolUnaffected);
    }
    isTypeCheckBlockAffected(previousSymbol, typeCheckApiAffected) {
        if (!(previousSymbol instanceof ComponentSymbol)) {
            return true;
        }
        // To verify that a used directive is not affected we need to verify that its full inheritance
        // chain is not present in `typeCheckApiAffected`.
        const isInheritanceChainAffected = (symbol) => {
            let currentSymbol = symbol;
            while (currentSymbol instanceof DirectiveSymbol) {
                if (typeCheckApiAffected.has(currentSymbol)) {
                    return true;
                }
                currentSymbol = currentSymbol.baseClass;
            }
            return false;
        };
        // Create an equality function that considers directives equal if they represent the same
        // declaration and if the symbol and all symbols it inherits from in the current compilation
        // do not have their type-check API affected.
        const isDirectiveUnaffected = (current, previous) => isReferenceEqual(current, previous) && !isInheritanceChainAffected(current.symbol);
        // Create an equality function that considers pipes equal if they represent the same
        // declaration and if the symbol in the current compilation does not have its type-check
        // API affected.
        const isPipeUnaffected = (current, previous) => isReferenceEqual(current, previous) && !typeCheckApiAffected.has(current.symbol);
        // The emit of a type-check block of a component is affected if either of the following is true:
        //  1. The list of used directives has changed or any of those directives have had their
        //     type-check API changed.
        //  2. The list of used pipes has changed, or any of those pipes have had their type-check API
        //     changed.
        return !isArrayEqual(this.usedDirectives, previousSymbol.usedDirectives, isDirectiveUnaffected) ||
            !isArrayEqual(this.usedPipes, previousSymbol.usedPipes, isPipeUnaffected);
    }
}
/**
 * `DecoratorHandler` which handles the `@Component` annotation.
 */
export class ComponentDecoratorHandler {
    constructor(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds, enableI18nLegacyMessageIdFormat, usePoisonedData, i18nNormalizeLineEndingsInICUs, moduleResolver, cycleAnalyzer, cycleHandlingStrategy, refEmitter, depTracker, injectableRegistry, semanticDepGraphUpdater, annotateForClosureCompiler, perf) {
        this.reflector = reflector;
        this.evaluator = evaluator;
        this.metaRegistry = metaRegistry;
        this.metaReader = metaReader;
        this.scopeReader = scopeReader;
        this.scopeRegistry = scopeRegistry;
        this.typeCheckScopeRegistry = typeCheckScopeRegistry;
        this.resourceRegistry = resourceRegistry;
        this.isCore = isCore;
        this.resourceLoader = resourceLoader;
        this.rootDirs = rootDirs;
        this.defaultPreserveWhitespaces = defaultPreserveWhitespaces;
        this.i18nUseExternalIds = i18nUseExternalIds;
        this.enableI18nLegacyMessageIdFormat = enableI18nLegacyMessageIdFormat;
        this.usePoisonedData = usePoisonedData;
        this.i18nNormalizeLineEndingsInICUs = i18nNormalizeLineEndingsInICUs;
        this.moduleResolver = moduleResolver;
        this.cycleAnalyzer = cycleAnalyzer;
        this.cycleHandlingStrategy = cycleHandlingStrategy;
        this.refEmitter = refEmitter;
        this.depTracker = depTracker;
        this.injectableRegistry = injectableRegistry;
        this.semanticDepGraphUpdater = semanticDepGraphUpdater;
        this.annotateForClosureCompiler = annotateForClosureCompiler;
        this.perf = perf;
        this.literalCache = new Map();
        this.elementSchemaRegistry = new DomElementSchemaRegistry();
        /**
         * During the asynchronous preanalyze phase, it's necessary to parse the template to extract
         * any potential <link> tags which might need to be loaded. This cache ensures that work is not
         * thrown away, and the parsed template is reused during the analyze phase.
         */
        this.preanalyzeTemplateCache = new Map();
        this.preanalyzeStylesCache = new Map();
        this.precedence = HandlerPrecedence.PRIMARY;
        this.name = ComponentDecoratorHandler.name;
    }
    detect(node, decorators) {
        if (!decorators) {
            return undefined;
        }
        const decorator = findAngularDecorator(decorators, 'Component', this.isCore);
        if (decorator !== undefined) {
            return {
                trigger: decorator.node,
                decorator,
                metadata: decorator,
            };
        }
        else {
            return undefined;
        }
    }
    preanalyze(node, decorator) {
        // In preanalyze, resource URLs associated with the component are asynchronously preloaded via
        // the resourceLoader. This is the only time async operations are allowed for a component.
        // These resources are:
        //
        // - the templateUrl, if there is one
        // - any styleUrls if present
        // - any stylesheets referenced from <link> tags in the template itself
        //
        // As a result of the last one, the template must be parsed as part of preanalysis to extract
        // <link> tags, which may involve waiting for the templateUrl to be resolved first.
        // If preloading isn't possible, then skip this step.
        if (!this.resourceLoader.canPreload) {
            return undefined;
        }
        const meta = this._resolveLiteral(decorator);
        const component = reflectObjectLiteral(meta);
        const containingFile = node.getSourceFile().fileName;
        const resolveStyleUrl = (styleUrl) => {
            try {
                const resourceUrl = this.resourceLoader.resolve(styleUrl, containingFile);
                return this.resourceLoader.preload(resourceUrl, { type: 'style', containingFile });
            }
            catch (_a) {
                // Don't worry about failures to preload. We can handle this problem during analysis by
                // producing a diagnostic.
                return undefined;
            }
        };
        // A Promise that waits for the template and all <link>ed styles within it to be preloaded.
        const templateAndTemplateStyleResources = this._preloadAndParseTemplate(node, decorator, component, containingFile)
            .then((template) => {
            if (template === null) {
                return undefined;
            }
            return Promise.all(template.styleUrls.map(styleUrl => resolveStyleUrl(styleUrl)))
                .then(() => undefined);
        });
        // Extract all the styleUrls in the decorator.
        const componentStyleUrls = this._extractComponentStyleUrls(component);
        // Extract inline styles, process, and cache for use in synchronous analyze phase
        let inlineStyles;
        if (component.has('styles')) {
            const litStyles = parseFieldArrayValue(component, 'styles', this.evaluator);
            if (litStyles === null) {
                this.preanalyzeStylesCache.set(node, null);
            }
            else {
                inlineStyles = Promise
                    .all(litStyles.map(style => this.resourceLoader.preprocessInline(style, { type: 'style', containingFile })))
                    .then(styles => {
                    this.preanalyzeStylesCache.set(node, styles);
                });
            }
        }
        else {
            this.preanalyzeStylesCache.set(node, null);
        }
        // Wait for both the template and all styleUrl resources to resolve.
        return Promise
            .all([
            templateAndTemplateStyleResources, inlineStyles,
            ...componentStyleUrls.map(styleUrl => resolveStyleUrl(styleUrl.url))
        ])
            .then(() => undefined);
    }
    analyze(node, decorator, flags = HandlerFlags.NONE) {
        var _a, _b;
        this.perf.eventCount(PerfEvent.AnalyzeComponent);
        const containingFile = node.getSourceFile().fileName;
        this.literalCache.delete(decorator);
        let diagnostics;
        let isPoisoned = false;
        // @Component inherits @Directive, so begin by extracting the @Directive metadata and building
        // on it.
        const directiveResult = extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.isCore, flags, this.annotateForClosureCompiler, this.elementSchemaRegistry.getDefaultComponentElementName());
        if (directiveResult === undefined) {
            // `extractDirectiveMetadata` returns undefined when the @Directive has `jit: true`. In this
            // case, compilation of the decorator is skipped. Returning an empty object signifies
            // that no analysis was produced.
            return {};
        }
        // Next, read the `@Component`-specific fields.
        const { decorator: component, metadata, inputs, outputs } = directiveResult;
        const encapsulation = (_a = this._resolveEnumValue(component, 'encapsulation', 'ViewEncapsulation')) !== null && _a !== void 0 ? _a : ViewEncapsulation.Emulated;
        const changeDetection = this._resolveEnumValue(component, 'changeDetection', 'ChangeDetectionStrategy');
        let animations = null;
        if (component.has('animations')) {
            animations = new WrappedNodeExpr(component.get('animations'));
        }
        // Go through the root directories for this project, and select the one with the smallest
        // relative path representation.
        const relativeContextFilePath = this.rootDirs.reduce((previous, rootDir) => {
            const candidate = relative(absoluteFrom(rootDir), absoluteFrom(containingFile));
            if (previous === undefined || candidate.length < previous.length) {
                return candidate;
            }
            else {
                return previous;
            }
        }, undefined);
        // Note that we could technically combine the `viewProvidersRequiringFactory` and
        // `providersRequiringFactory` into a single set, but we keep the separate so that
        // we can distinguish where an error is coming from when logging the diagnostics in `resolve`.
        let viewProvidersRequiringFactory = null;
        let providersRequiringFactory = null;
        let wrappedViewProviders = null;
        if (component.has('viewProviders')) {
            const viewProviders = component.get('viewProviders');
            viewProvidersRequiringFactory =
                resolveProvidersRequiringFactory(viewProviders, this.reflector, this.evaluator);
            wrappedViewProviders = new WrappedNodeExpr(this.annotateForClosureCompiler ? wrapFunctionExpressionsInParens(viewProviders) :
                viewProviders);
        }
        if (component.has('providers')) {
            providersRequiringFactory = resolveProvidersRequiringFactory(component.get('providers'), this.reflector, this.evaluator);
        }
        // Parse the template.
        // If a preanalyze phase was executed, the template may already exist in parsed form, so check
        // the preanalyzeTemplateCache.
        // Extract a closure of the template parsing code so that it can be reparsed with different
        // options if needed, like in the indexing pipeline.
        let template;
        if (this.preanalyzeTemplateCache.has(node)) {
            // The template was parsed in preanalyze. Use it and delete it to save memory.
            const preanalyzed = this.preanalyzeTemplateCache.get(node);
            this.preanalyzeTemplateCache.delete(node);
            template = preanalyzed;
        }
        else {
            const templateDecl = this.parseTemplateDeclaration(decorator, component, containingFile);
            template = this.extractTemplate(node, templateDecl);
        }
        const templateResource = template.declaration.isInline ? { path: null, expression: component.get('template') } : {
            path: absoluteFrom(template.declaration.resolvedTemplateUrl),
            expression: template.sourceMapping.node
        };
        // Figure out the set of styles. The ordering here is important: external resources (styleUrls)
        // precede inline styles, and styles defined in the template override styles defined in the
        // component.
        let styles = [];
        const styleResources = this._extractStyleResources(component, containingFile);
        const styleUrls = [
            ...this._extractComponentStyleUrls(component), ...this._extractTemplateStyleUrls(template)
        ];
        for (const styleUrl of styleUrls) {
            try {
                const resourceUrl = this.resourceLoader.resolve(styleUrl.url, containingFile);
                const resourceStr = this.resourceLoader.load(resourceUrl);
                styles.push(resourceStr);
                if (this.depTracker !== null) {
                    this.depTracker.addResourceDependency(node.getSourceFile(), absoluteFrom(resourceUrl));
                }
            }
            catch (_c) {
                if (diagnostics === undefined) {
                    diagnostics = [];
                }
                const resourceType = styleUrl.source === 2 /* StylesheetFromDecorator */ ?
                    2 /* StylesheetFromDecorator */ :
                    1 /* StylesheetFromTemplate */;
                diagnostics.push(this.makeResourceNotFoundError(styleUrl.url, styleUrl.nodeForError, resourceType)
                    .toDiagnostic());
            }
        }
        if (encapsulation === ViewEncapsulation.ShadowDom && metadata.selector !== null) {
            const selectorError = checkCustomElementSelectorForErrors(metadata.selector);
            if (selectorError !== null) {
                if (diagnostics === undefined) {
                    diagnostics = [];
                }
                diagnostics.push(makeDiagnostic(ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR, component.get('selector'), selectorError));
            }
        }
        // If inline styles were preprocessed use those
        let inlineStyles = null;
        if (this.preanalyzeStylesCache.has(node)) {
            inlineStyles = this.preanalyzeStylesCache.get(node);
            this.preanalyzeStylesCache.delete(node);
            if (inlineStyles !== null) {
                styles.push(...inlineStyles);
            }
        }
        else {
            // Preprocessing is only supported asynchronously
            // If no style cache entry is present asynchronous preanalyze was not executed.
            // This protects against accidental differences in resource contents when preanalysis
            // is not used with a provided transformResource hook on the ResourceHost.
            if (this.resourceLoader.canPreprocess) {
                throw new Error('Inline resource processing requires asynchronous preanalyze.');
            }
            if (component.has('styles')) {
                const litStyles = parseFieldArrayValue(component, 'styles', this.evaluator);
                if (litStyles !== null) {
                    inlineStyles = [...litStyles];
                    styles.push(...litStyles);
                }
            }
        }
        if (template.styles.length > 0) {
            styles.push(...template.styles);
        }
        const output = {
            analysis: {
                baseClass: readBaseClass(node, this.reflector, this.evaluator),
                inputs,
                outputs,
                meta: Object.assign(Object.assign({}, metadata), { template: {
                        nodes: template.nodes,
                        ngContentSelectors: template.ngContentSelectors,
                    }, encapsulation, interpolation: (_b = template.interpolationConfig) !== null && _b !== void 0 ? _b : DEFAULT_INTERPOLATION_CONFIG, styles,
                    // These will be replaced during the compilation step, after all `NgModule`s have been
                    // analyzed and the full compilation scope for the component can be realized.
                    animations, viewProviders: wrappedViewProviders, i18nUseExternalIds: this.i18nUseExternalIds, relativeContextFilePath }),
                typeCheckMeta: extractDirectiveTypeCheckMeta(node, inputs, this.reflector),
                classMetadata: extractClassMetadata(node, this.reflector, this.isCore, this.annotateForClosureCompiler),
                template,
                providersRequiringFactory,
                viewProvidersRequiringFactory,
                inlineStyles,
                styleUrls,
                resources: {
                    styles: styleResources,
                    template: templateResource,
                },
                isPoisoned,
            },
            diagnostics,
        };
        if (changeDetection !== null) {
            output.analysis.meta.changeDetection = changeDetection;
        }
        return output;
    }
    symbol(node, analysis) {
        const typeParameters = extractSemanticTypeParameters(node);
        return new ComponentSymbol(node, analysis.meta.selector, analysis.inputs, analysis.outputs, analysis.meta.exportAs, analysis.typeCheckMeta, typeParameters);
    }
    register(node, analysis) {
        // Register this component's information with the `MetadataRegistry`. This ensures that
        // the information about the component is available during the compile() phase.
        const ref = new Reference(node);
        this.metaRegistry.registerDirectiveMetadata(Object.assign(Object.assign({ type: MetaType.Directive, ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.meta.queries.map(query => query.propertyName), isComponent: true, baseClass: analysis.baseClass }, analysis.typeCheckMeta), { isPoisoned: analysis.isPoisoned, isStructural: false }));
        this.resourceRegistry.registerResources(analysis.resources, node);
        this.injectableRegistry.registerInjectable(node);
    }
    index(context, node, analysis) {
        if (analysis.isPoisoned && !this.usePoisonedData) {
            return null;
        }
        const scope = this.scopeReader.getScopeForComponent(node);
        const selector = analysis.meta.selector;
        const matcher = new SelectorMatcher();
        if (scope !== null) {
            if ((scope.compilation.isPoisoned || scope.exported.isPoisoned) && !this.usePoisonedData) {
                // Don't bother indexing components which had erroneous scopes, unless specifically
                // requested.
                return null;
            }
            for (const directive of scope.compilation.directives) {
                if (directive.selector !== null) {
                    matcher.addSelectables(CssSelector.parse(directive.selector), directive);
                }
            }
        }
        const binder = new R3TargetBinder(matcher);
        const boundTemplate = binder.bind({ template: analysis.template.diagNodes });
        context.addComponent({
            declaration: node,
            selector,
            boundTemplate,
            templateMeta: {
                isInline: analysis.template.declaration.isInline,
                file: analysis.template.file,
            },
        });
    }
    typeCheck(ctx, node, meta) {
        if (this.typeCheckScopeRegistry === null || !ts.isClassDeclaration(node)) {
            return;
        }
        if (meta.isPoisoned && !this.usePoisonedData) {
            return;
        }
        const scope = this.typeCheckScopeRegistry.getTypeCheckScope(node);
        if (scope.isPoisoned && !this.usePoisonedData) {
            // Don't type-check components that had errors in their scopes, unless requested.
            return;
        }
        const binder = new R3TargetBinder(scope.matcher);
        ctx.addTemplate(new Reference(node), binder, meta.template.diagNodes, scope.pipes, scope.schemas, meta.template.sourceMapping, meta.template.file, meta.template.errors);
    }
    resolve(node, analysis, symbol) {
        if (this.semanticDepGraphUpdater !== null && analysis.baseClass instanceof Reference) {
            symbol.baseClass = this.semanticDepGraphUpdater.getSymbol(analysis.baseClass.node);
        }
        if (analysis.isPoisoned && !this.usePoisonedData) {
            return {};
        }
        const context = node.getSourceFile();
        // Check whether this component was registered with an NgModule. If so, it should be compiled
        // under that module's compilation scope.
        const scope = this.scopeReader.getScopeForComponent(node);
        let metadata = analysis.meta;
        const data = {
            directives: EMPTY_ARRAY,
            pipes: EMPTY_MAP,
            declarationListEmitMode: 0 /* Direct */,
        };
        if (scope !== null && (!scope.compilation.isPoisoned || this.usePoisonedData)) {
            const matcher = new SelectorMatcher();
            for (const dir of scope.compilation.directives) {
                if (dir.selector !== null) {
                    matcher.addSelectables(CssSelector.parse(dir.selector), dir);
                }
            }
            const pipes = new Map();
            for (const pipe of scope.compilation.pipes) {
                pipes.set(pipe.name, pipe.ref);
            }
            // Next, the component template AST is bound using the R3TargetBinder. This produces a
            // BoundTarget, which is similar to a ts.TypeChecker.
            const binder = new R3TargetBinder(matcher);
            const bound = binder.bind({ template: metadata.template.nodes });
            const usedDirectives = bound.getUsedDirectives().map(directive => {
                const type = this.refEmitter.emit(directive.ref, context);
                return {
                    ref: directive.ref,
                    type: type.expression,
                    importedFile: type.importedFile,
                    selector: directive.selector,
                    inputs: directive.inputs.propertyNames,
                    outputs: directive.outputs.propertyNames,
                    exportAs: directive.exportAs,
                    isComponent: directive.isComponent,
                };
            });
            const usedPipes = [];
            for (const pipeName of bound.getUsedPipes()) {
                if (!pipes.has(pipeName)) {
                    continue;
                }
                const pipe = pipes.get(pipeName);
                const type = this.refEmitter.emit(pipe, context);
                usedPipes.push({
                    ref: pipe,
                    pipeName,
                    expression: type.expression,
                    importedFile: type.importedFile,
                });
            }
            if (this.semanticDepGraphUpdater !== null) {
                symbol.usedDirectives = usedDirectives.map(dir => this.semanticDepGraphUpdater.getSemanticReference(dir.ref.node, dir.type));
                symbol.usedPipes = usedPipes.map(pipe => this.semanticDepGraphUpdater.getSemanticReference(pipe.ref.node, pipe.expression));
            }
            // Scan through the directives/pipes actually used in the template and check whether any
            // import which needs to be generated would create a cycle.
            const cyclesFromDirectives = new Map();
            for (const usedDirective of usedDirectives) {
                const cycle = this._checkForCyclicImport(usedDirective.importedFile, usedDirective.type, context);
                if (cycle !== null) {
                    cyclesFromDirectives.set(usedDirective, cycle);
                }
            }
            const cyclesFromPipes = new Map();
            for (const usedPipe of usedPipes) {
                const cycle = this._checkForCyclicImport(usedPipe.importedFile, usedPipe.expression, context);
                if (cycle !== null) {
                    cyclesFromPipes.set(usedPipe, cycle);
                }
            }
            const cycleDetected = cyclesFromDirectives.size !== 0 || cyclesFromPipes.size !== 0;
            if (!cycleDetected) {
                // No cycle was detected. Record the imports that need to be created in the cycle detector
                // so that future cyclic import checks consider their production.
                for (const { type, importedFile } of usedDirectives) {
                    this._recordSyntheticImport(importedFile, type, context);
                }
                for (const { expression, importedFile } of usedPipes) {
                    this._recordSyntheticImport(importedFile, expression, context);
                }
                // Check whether the directive/pipe arrays in ɵcmp need to be wrapped in closures.
                // This is required if any directive/pipe reference is to a declaration in the same file
                // but declared after this component.
                const wrapDirectivesAndPipesInClosure = usedDirectives.some(dir => isExpressionForwardReference(dir.type, node.name, context)) ||
                    usedPipes.some(pipe => isExpressionForwardReference(pipe.expression, node.name, context));
                data.directives = usedDirectives;
                data.pipes = new Map(usedPipes.map(pipe => [pipe.pipeName, pipe.expression]));
                data.declarationListEmitMode = wrapDirectivesAndPipesInClosure ?
                    1 /* Closure */ :
                    0 /* Direct */;
            }
            else {
                if (this.cycleHandlingStrategy === 0 /* UseRemoteScoping */) {
                    // Declaring the directiveDefs/pipeDefs arrays directly would require imports that would
                    // create a cycle. Instead, mark this component as requiring remote scoping, so that the
                    // NgModule file will take care of setting the directives for the component.
                    this.scopeRegistry.setComponentRemoteScope(node, usedDirectives.map(dir => dir.ref), usedPipes.map(pipe => pipe.ref));
                    symbol.isRemotelyScoped = true;
                    // If a semantic graph is being tracked, record the fact that this component is remotely
                    // scoped with the declaring NgModule symbol as the NgModule's emit becomes dependent on
                    // the directive/pipe usages of this component.
                    if (this.semanticDepGraphUpdater !== null) {
                        const moduleSymbol = this.semanticDepGraphUpdater.getSymbol(scope.ngModule);
                        if (!(moduleSymbol instanceof NgModuleSymbol)) {
                            throw new Error(`AssertionError: Expected ${scope.ngModule.name} to be an NgModuleSymbol.`);
                        }
                        moduleSymbol.addRemotelyScopedComponent(symbol, symbol.usedDirectives, symbol.usedPipes);
                    }
                }
                else {
                    // We are not able to handle this cycle so throw an error.
                    const relatedMessages = [];
                    for (const [dir, cycle] of cyclesFromDirectives) {
                        relatedMessages.push(makeCyclicImportInfo(dir.ref, dir.isComponent ? 'component' : 'directive', cycle));
                    }
                    for (const [pipe, cycle] of cyclesFromPipes) {
                        relatedMessages.push(makeCyclicImportInfo(pipe.ref, 'pipe', cycle));
                    }
                    throw new FatalDiagnosticError(ErrorCode.IMPORT_CYCLE_DETECTED, node, 'One or more import cycles would need to be created to compile this component, ' +
                        'which is not supported by the current compiler configuration.', relatedMessages);
                }
            }
        }
        const diagnostics = [];
        if (analysis.providersRequiringFactory !== null &&
            analysis.meta.providers instanceof WrappedNodeExpr) {
            const providerDiagnostics = getProviderDiagnostics(analysis.providersRequiringFactory, analysis.meta.providers.node, this.injectableRegistry);
            diagnostics.push(...providerDiagnostics);
        }
        if (analysis.viewProvidersRequiringFactory !== null &&
            analysis.meta.viewProviders instanceof WrappedNodeExpr) {
            const viewProviderDiagnostics = getProviderDiagnostics(analysis.viewProvidersRequiringFactory, analysis.meta.viewProviders.node, this.injectableRegistry);
            diagnostics.push(...viewProviderDiagnostics);
        }
        const directiveDiagnostics = getDirectiveDiagnostics(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, 'Component');
        if (directiveDiagnostics !== null) {
            diagnostics.push(...directiveDiagnostics);
        }
        if (diagnostics.length > 0) {
            return { diagnostics };
        }
        return { data };
    }
    updateResources(node, analysis) {
        const containingFile = node.getSourceFile().fileName;
        // If the template is external, re-parse it.
        const templateDecl = analysis.template.declaration;
        if (!templateDecl.isInline) {
            analysis.template = this.extractTemplate(node, templateDecl);
        }
        // Update any external stylesheets and rebuild the combined 'styles' list.
        // TODO(alxhub): write tests for styles when the primary compiler uses the updateResources path
        let styles = [];
        if (analysis.styleUrls !== null) {
            for (const styleUrl of analysis.styleUrls) {
                try {
                    const resolvedStyleUrl = this.resourceLoader.resolve(styleUrl.url, containingFile);
                    const styleText = this.resourceLoader.load(resolvedStyleUrl);
                    styles.push(styleText);
                }
                catch (e) {
                    // Resource resolve failures should already be in the diagnostics list from the analyze
                    // stage. We do not need to do anything with them when updating resources.
                }
            }
        }
        if (analysis.inlineStyles !== null) {
            for (const styleText of analysis.inlineStyles) {
                styles.push(styleText);
            }
        }
        for (const styleText of analysis.template.styles) {
            styles.push(styleText);
        }
        analysis.meta.styles = styles;
    }
    compileFull(node, analysis, resolution, pool) {
        if (analysis.template.errors !== null && analysis.template.errors.length > 0) {
            return [];
        }
        const meta = Object.assign(Object.assign({}, analysis.meta), resolution);
        const fac = compileNgFactoryDefField(toFactoryMetadata(meta, FactoryTarget.Component));
        const def = compileComponentFromMetadata(meta, pool, makeBindingParser());
        const classMetadata = analysis.classMetadata !== null ?
            compileClassMetadata(analysis.classMetadata).toStmt() :
            null;
        return compileResults(fac, def, classMetadata, 'ɵcmp');
    }
    compilePartial(node, analysis, resolution) {
        if (analysis.template.errors !== null && analysis.template.errors.length > 0) {
            return [];
        }
        const templateInfo = {
            content: analysis.template.content,
            sourceUrl: analysis.template.declaration.resolvedTemplateUrl,
            isInline: analysis.template.declaration.isInline,
            inlineTemplateLiteralExpression: analysis.template.sourceMapping.type === 'direct' ?
                new WrappedNodeExpr(analysis.template.sourceMapping.node) :
                null,
        };
        const meta = Object.assign(Object.assign({}, analysis.meta), resolution);
        const fac = compileDeclareFactory(toFactoryMetadata(meta, FactoryTarget.Component));
        const def = compileDeclareComponentFromMetadata(meta, analysis.template, templateInfo);
        const classMetadata = analysis.classMetadata !== null ?
            compileDeclareClassMetadata(analysis.classMetadata).toStmt() :
            null;
        return compileResults(fac, def, classMetadata, 'ɵcmp');
    }
    _resolveLiteral(decorator) {
        if (this.literalCache.has(decorator)) {
            return this.literalCache.get(decorator);
        }
        if (decorator.args === null || decorator.args.length !== 1) {
            throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARITY_WRONG, Decorator.nodeForError(decorator), `Incorrect number of arguments to @Component decorator`);
        }
        const meta = unwrapExpression(decorator.args[0]);
        if (!ts.isObjectLiteralExpression(meta)) {
            throw new FatalDiagnosticError(ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, `Decorator argument must be literal.`);
        }
        this.literalCache.set(decorator, meta);
        return meta;
    }
    _resolveEnumValue(component, field, enumSymbolName) {
        let resolved = null;
        if (component.has(field)) {
            const expr = component.get(field);
            const value = this.evaluator.evaluate(expr);
            if (value instanceof EnumValue && isAngularCoreReference(value.enumRef, enumSymbolName)) {
                resolved = value.resolved;
            }
            else {
                throw createValueHasWrongTypeError(expr, value, `${field} must be a member of ${enumSymbolName} enum from @angular/core`);
            }
        }
        return resolved;
    }
    _extractComponentStyleUrls(component) {
        if (!component.has('styleUrls')) {
            return [];
        }
        return this._extractStyleUrlsFromExpression(component.get('styleUrls'));
    }
    _extractStyleUrlsFromExpression(styleUrlsExpr) {
        const styleUrls = [];
        if (ts.isArrayLiteralExpression(styleUrlsExpr)) {
            for (const styleUrlExpr of styleUrlsExpr.elements) {
                if (ts.isSpreadElement(styleUrlExpr)) {
                    styleUrls.push(...this._extractStyleUrlsFromExpression(styleUrlExpr.expression));
                }
                else {
                    const styleUrl = this.evaluator.evaluate(styleUrlExpr);
                    if (typeof styleUrl !== 'string') {
                        throw createValueHasWrongTypeError(styleUrlExpr, styleUrl, 'styleUrl must be a string');
                    }
                    styleUrls.push({
                        url: styleUrl,
                        source: 2 /* StylesheetFromDecorator */,
                        nodeForError: styleUrlExpr,
                    });
                }
            }
        }
        else {
            const evaluatedStyleUrls = this.evaluator.evaluate(styleUrlsExpr);
            if (!isStringArray(evaluatedStyleUrls)) {
                throw createValueHasWrongTypeError(styleUrlsExpr, evaluatedStyleUrls, 'styleUrls must be an array of strings');
            }
            for (const styleUrl of evaluatedStyleUrls) {
                styleUrls.push({
                    url: styleUrl,
                    source: 2 /* StylesheetFromDecorator */,
                    nodeForError: styleUrlsExpr,
                });
            }
        }
        return styleUrls;
    }
    _extractStyleResources(component, containingFile) {
        const styles = new Set();
        function stringLiteralElements(array) {
            return array.elements.filter((e) => ts.isStringLiteralLike(e));
        }
        // If styleUrls is a literal array, process each resource url individually and
        // register ones that are string literals.
        const styleUrlsExpr = component.get('styleUrls');
        if (styleUrlsExpr !== undefined && ts.isArrayLiteralExpression(styleUrlsExpr)) {
            for (const expression of stringLiteralElements(styleUrlsExpr)) {
                try {
                    const resourceUrl = this.resourceLoader.resolve(expression.text, containingFile);
                    styles.add({ path: absoluteFrom(resourceUrl), expression });
                }
                catch (_a) {
                    // Errors in style resource extraction do not need to be handled here. We will produce
                    // diagnostics for each one that fails in the analysis, after we evaluate the `styleUrls`
                    // expression to determine _all_ style resources, not just the string literals.
                }
            }
        }
        const stylesExpr = component.get('styles');
        if (stylesExpr !== undefined && ts.isArrayLiteralExpression(stylesExpr)) {
            for (const expression of stringLiteralElements(stylesExpr)) {
                styles.add({ path: null, expression });
            }
        }
        return styles;
    }
    _preloadAndParseTemplate(node, decorator, component, containingFile) {
        if (component.has('templateUrl')) {
            // Extract the templateUrl and preload it.
            const templateUrlExpr = component.get('templateUrl');
            const templateUrl = this.evaluator.evaluate(templateUrlExpr);
            if (typeof templateUrl !== 'string') {
                throw createValueHasWrongTypeError(templateUrlExpr, templateUrl, 'templateUrl must be a string');
            }
            try {
                const resourceUrl = this.resourceLoader.resolve(templateUrl, containingFile);
                const templatePromise = this.resourceLoader.preload(resourceUrl, { type: 'template', containingFile });
                // If the preload worked, then actually load and parse the template, and wait for any style
                // URLs to resolve.
                if (templatePromise !== undefined) {
                    return templatePromise.then(() => {
                        const templateDecl = this.parseTemplateDeclaration(decorator, component, containingFile);
                        const template = this.extractTemplate(node, templateDecl);
                        this.preanalyzeTemplateCache.set(node, template);
                        return template;
                    });
                }
                else {
                    return Promise.resolve(null);
                }
            }
            catch (e) {
                throw this.makeResourceNotFoundError(templateUrl, templateUrlExpr, 0 /* Template */);
            }
        }
        else {
            const templateDecl = this.parseTemplateDeclaration(decorator, component, containingFile);
            const template = this.extractTemplate(node, templateDecl);
            this.preanalyzeTemplateCache.set(node, template);
            return Promise.resolve(template);
        }
    }
    extractTemplate(node, template) {
        if (template.isInline) {
            let sourceStr;
            let sourceParseRange = null;
            let templateContent;
            let sourceMapping;
            let escapedString = false;
            let sourceMapUrl;
            // We only support SourceMaps for inline templates that are simple string literals.
            if (ts.isStringLiteral(template.expression) ||
                ts.isNoSubstitutionTemplateLiteral(template.expression)) {
                // the start and end of the `templateExpr` node includes the quotation marks, which we must
                // strip
                sourceParseRange = getTemplateRange(template.expression);
                sourceStr = template.expression.getSourceFile().text;
                templateContent = template.expression.text;
                escapedString = true;
                sourceMapping = {
                    type: 'direct',
                    node: template.expression,
                };
                sourceMapUrl = template.resolvedTemplateUrl;
            }
            else {
                const resolvedTemplate = this.evaluator.evaluate(template.expression);
                if (typeof resolvedTemplate !== 'string') {
                    throw createValueHasWrongTypeError(template.expression, resolvedTemplate, 'template must be a string');
                }
                // We do not parse the template directly from the source file using a lexer range, so
                // the template source and content are set to the statically resolved template.
                sourceStr = resolvedTemplate;
                templateContent = resolvedTemplate;
                sourceMapping = {
                    type: 'indirect',
                    node: template.expression,
                    componentClass: node,
                    template: templateContent,
                };
                // Indirect templates cannot be mapped to a particular byte range of any input file, since
                // they're computed by expressions that may span many files. Don't attempt to map them back
                // to a given file.
                sourceMapUrl = null;
            }
            return Object.assign(Object.assign({}, this._parseTemplate(template, sourceStr, sourceParseRange, escapedString, sourceMapUrl)), { content: templateContent, sourceMapping, declaration: template });
        }
        else {
            const templateContent = this.resourceLoader.load(template.resolvedTemplateUrl);
            if (this.depTracker !== null) {
                this.depTracker.addResourceDependency(node.getSourceFile(), absoluteFrom(template.resolvedTemplateUrl));
            }
            return Object.assign(Object.assign({}, this._parseTemplate(template, /* sourceStr */ templateContent, /* sourceParseRange */ null, 
            /* escapedString */ false, 
            /* sourceMapUrl */ template.resolvedTemplateUrl)), { content: templateContent, sourceMapping: {
                    type: 'external',
                    componentClass: node,
                    // TODO(alxhub): TS in g3 is unable to make this inference on its own, so cast it here
                    // until g3 is able to figure this out.
                    node: template.templateUrlExpression,
                    template: templateContent,
                    templateUrl: template.resolvedTemplateUrl,
                }, declaration: template });
        }
    }
    _parseTemplate(template, sourceStr, sourceParseRange, escapedString, sourceMapUrl) {
        // We always normalize line endings if the template has been escaped (i.e. is inline).
        const i18nNormalizeLineEndingsInICUs = escapedString || this.i18nNormalizeLineEndingsInICUs;
        const parsedTemplate = parseTemplate(sourceStr, sourceMapUrl !== null && sourceMapUrl !== void 0 ? sourceMapUrl : '', {
            preserveWhitespaces: template.preserveWhitespaces,
            interpolationConfig: template.interpolationConfig,
            range: sourceParseRange !== null && sourceParseRange !== void 0 ? sourceParseRange : undefined,
            escapedString,
            enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
            i18nNormalizeLineEndingsInICUs,
            alwaysAttemptHtmlToR3AstConversion: this.usePoisonedData,
        });
        // Unfortunately, the primary parse of the template above may not contain accurate source map
        // information. If used directly, it would result in incorrect code locations in template
        // errors, etc. There are three main problems:
        //
        // 1. `preserveWhitespaces: false` annihilates the correctness of template source mapping, as
        //    the whitespace transformation changes the contents of HTML text nodes before they're
        //    parsed into Angular expressions.
        // 2. `preserveLineEndings: false` causes growing misalignments in templates that use '\r\n'
        //    line endings, by normalizing them to '\n'.
        // 3. By default, the template parser strips leading trivia characters (like spaces, tabs, and
        //    newlines). This also destroys source mapping information.
        //
        // In order to guarantee the correctness of diagnostics, templates are parsed a second time
        // with the above options set to preserve source mappings.
        const { nodes: diagNodes } = parseTemplate(sourceStr, sourceMapUrl !== null && sourceMapUrl !== void 0 ? sourceMapUrl : '', {
            preserveWhitespaces: true,
            preserveLineEndings: true,
            interpolationConfig: template.interpolationConfig,
            range: sourceParseRange !== null && sourceParseRange !== void 0 ? sourceParseRange : undefined,
            escapedString,
            enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
            i18nNormalizeLineEndingsInICUs,
            leadingTriviaChars: [],
            alwaysAttemptHtmlToR3AstConversion: this.usePoisonedData,
        });
        return Object.assign(Object.assign({}, parsedTemplate), { diagNodes, file: new ParseSourceFile(sourceStr, sourceMapUrl !== null && sourceMapUrl !== void 0 ? sourceMapUrl : '') });
    }
    parseTemplateDeclaration(decorator, component, containingFile) {
        let preserveWhitespaces = this.defaultPreserveWhitespaces;
        if (component.has('preserveWhitespaces')) {
            const expr = component.get('preserveWhitespaces');
            const value = this.evaluator.evaluate(expr);
            if (typeof value !== 'boolean') {
                throw createValueHasWrongTypeError(expr, value, 'preserveWhitespaces must be a boolean');
            }
            preserveWhitespaces = value;
        }
        let interpolationConfig = DEFAULT_INTERPOLATION_CONFIG;
        if (component.has('interpolation')) {
            const expr = component.get('interpolation');
            const value = this.evaluator.evaluate(expr);
            if (!Array.isArray(value) || value.length !== 2 ||
                !value.every(element => typeof element === 'string')) {
                throw createValueHasWrongTypeError(expr, value, 'interpolation must be an array with 2 elements of string type');
            }
            interpolationConfig = InterpolationConfig.fromArray(value);
        }
        if (component.has('templateUrl')) {
            const templateUrlExpr = component.get('templateUrl');
            const templateUrl = this.evaluator.evaluate(templateUrlExpr);
            if (typeof templateUrl !== 'string') {
                throw createValueHasWrongTypeError(templateUrlExpr, templateUrl, 'templateUrl must be a string');
            }
            try {
                const resourceUrl = this.resourceLoader.resolve(templateUrl, containingFile);
                return {
                    isInline: false,
                    interpolationConfig,
                    preserveWhitespaces,
                    templateUrl,
                    templateUrlExpression: templateUrlExpr,
                    resolvedTemplateUrl: resourceUrl,
                };
            }
            catch (e) {
                throw this.makeResourceNotFoundError(templateUrl, templateUrlExpr, 0 /* Template */);
            }
        }
        else if (component.has('template')) {
            return {
                isInline: true,
                interpolationConfig,
                preserveWhitespaces,
                expression: component.get('template'),
                templateUrl: containingFile,
                resolvedTemplateUrl: containingFile,
            };
        }
        else {
            throw new FatalDiagnosticError(ErrorCode.COMPONENT_MISSING_TEMPLATE, Decorator.nodeForError(decorator), 'component is missing a template');
        }
    }
    _resolveImportedFile(importedFile, expr, origin) {
        // If `importedFile` is not 'unknown' then it accurately reflects the source file that is
        // being imported.
        if (importedFile !== 'unknown') {
            return importedFile;
        }
        // Otherwise `expr` has to be inspected to determine the file that is being imported. If `expr`
        // is not an `ExternalExpr` then it does not correspond with an import, so return null in that
        // case.
        if (!(expr instanceof ExternalExpr)) {
            return null;
        }
        // Figure out what file is being imported.
        return this.moduleResolver.resolveModule(expr.value.moduleName, origin.fileName);
    }
    /**
     * Check whether adding an import from `origin` to the source-file corresponding to `expr` would
     * create a cyclic import.
     *
     * @returns a `Cycle` object if a cycle would be created, otherwise `null`.
     */
    _checkForCyclicImport(importedFile, expr, origin) {
        const imported = this._resolveImportedFile(importedFile, expr, origin);
        if (imported === null) {
            return null;
        }
        // Check whether the import is legal.
        return this.cycleAnalyzer.wouldCreateCycle(origin, imported);
    }
    _recordSyntheticImport(importedFile, expr, origin) {
        const imported = this._resolveImportedFile(importedFile, expr, origin);
        if (imported === null) {
            return;
        }
        this.cycleAnalyzer.recordSyntheticImport(origin, imported);
    }
    makeResourceNotFoundError(file, nodeForError, resourceType) {
        let errorText;
        switch (resourceType) {
            case 0 /* Template */:
                errorText = `Could not find template file '${file}'.`;
                break;
            case 1 /* StylesheetFromTemplate */:
                errorText = `Could not find stylesheet file '${file}' linked from the template.`;
                break;
            case 2 /* StylesheetFromDecorator */:
                errorText = `Could not find stylesheet file '${file}'.`;
                break;
        }
        return new FatalDiagnosticError(ErrorCode.COMPONENT_RESOURCE_NOT_FOUND, nodeForError, errorText);
    }
    _extractTemplateStyleUrls(template) {
        if (template.styleUrls === null) {
            return [];
        }
        const nodeForError = getTemplateDeclarationNodeForError(template.declaration);
        return template.styleUrls.map(url => ({ url, source: 1 /* StylesheetFromTemplate */, nodeForError }));
    }
}
function getTemplateRange(templateExpr) {
    const startPos = templateExpr.getStart() + 1;
    const { line, character } = ts.getLineAndCharacterOfPosition(templateExpr.getSourceFile(), startPos);
    return {
        startPos,
        startLine: line,
        startCol: character,
        endPos: templateExpr.getEnd() - 1,
    };
}
/** Determines if the result of an evaluation is a string array. */
function isStringArray(resolvedValue) {
    return Array.isArray(resolvedValue) && resolvedValue.every(elem => typeof elem === 'string');
}
/** Determines the node to use for debugging purposes for the given TemplateDeclaration. */
function getTemplateDeclarationNodeForError(declaration) {
    // TODO(zarend): Change this to if/else when that is compatible with g3. This uses a switch
    // because if/else fails to compile on g3. That is because g3 compiles this in non-strict mode
    // where type inference does not work correctly.
    switch (declaration.isInline) {
        case true:
            return declaration.expression;
        case false:
            return declaration.templateUrlExpression;
    }
}
/**
 * Generate a diagnostic related information object that describes a potential cyclic import path.
 */
function makeCyclicImportInfo(ref, type, cycle) {
    const name = ref.debugName || '(unknown)';
    const path = cycle.getPath().map(sf => sf.fileName).join(' -> ');
    const message = `The ${type} '${name}' is used in the template but importing it would create a cycle: `;
    return makeRelatedInformation(ref.node, message + path);
}
/**
 * Checks whether a selector is a valid custom element tag name.
 * Based loosely on https://github.com/sindresorhus/validate-element-name.
 */
function checkCustomElementSelectorForErrors(selector) {
    // Avoid flagging components with an attribute or class selector. This isn't bulletproof since it
    // won't catch cases like `foo[]bar`, but we don't need it to be. This is mainly to avoid flagging
    // something like `foo-bar[baz]` incorrectly.
    if (selector.includes('.') || (selector.includes('[') && selector.includes(']'))) {
        return null;
    }
    if (!(/^[a-z]/.test(selector))) {
        return 'Selector of a ShadowDom-encapsulated component must start with a lower case letter.';
    }
    if (/[A-Z]/.test(selector)) {
        return 'Selector of a ShadowDom-encapsulated component must all be in lower case.';
    }
    if (!selector.includes('-')) {
        return 'Selector of a component that uses ViewEncapsulation.ShadowDom must contain a hyphen.';
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILE9BQU8sRUFBQyxvQkFBb0IsRUFBRSw0QkFBNEIsRUFBRSwyQkFBMkIsRUFBRSxtQ0FBbUMsRUFBZ0IsV0FBVyxFQUF5RCw0QkFBNEIsRUFBRSx3QkFBd0IsRUFBYyxZQUFZLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFjLGlCQUFpQixFQUFrQixlQUFlLEVBQUUsYUFBYSxFQUF3QyxjQUFjLEVBQTJCLGVBQWUsRUFBMEIsZUFBZSxFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDdmpCLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBR2pDLE9BQU8sRUFBQyxTQUFTLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUFDLE1BQU0sbUJBQW1CLENBQUM7QUFDMUcsT0FBTyxFQUFDLFlBQVksRUFBRSxRQUFRLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUN6RCxPQUFPLEVBQStCLFNBQVMsRUFBbUIsTUFBTSxlQUFlLENBQUM7QUFFeEYsT0FBTyxFQUFDLDZCQUE2QixFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBNkQsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzSyxPQUFPLEVBQWtGLDZCQUE2QixFQUE2RCxRQUFRLEVBQTZCLE1BQU0sZ0JBQWdCLENBQUM7QUFDL08sT0FBTyxFQUFDLFNBQVMsRUFBa0MsTUFBTSx5QkFBeUIsQ0FBQztBQUNuRixPQUFPLEVBQUMsU0FBUyxFQUFlLE1BQU0sWUFBWSxDQUFDO0FBQ25ELE9BQU8sRUFBb0MsU0FBUyxFQUFrQixv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QUksQ0FBQyxDQUFDO0FBQzFELENBQUM7QUFHRDs7O0dBR0c7QUFDSCxTQUFTLG1DQUFtQyxDQUFDLFFBQWdCO0lBQzNELGlHQUFpRztJQUNqRyxrR0FBa0c7SUFDbEcsNkNBQTZDO0lBQzdDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1FBQ2hGLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUU7UUFDOUIsT0FBTyxxRkFBcUYsQ0FBQztLQUM5RjtJQUVELElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUMxQixPQUFPLDJFQUEyRSxDQUFDO0tBQ3BGO0lBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDM0IsT0FBTyxzRkFBc0YsQ0FBQztLQUMvRjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbXBpbGVDbGFzc01ldGFkYXRhLCBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBjb21waWxlRGVjbGFyZUNsYXNzTWV0YWRhdGEsIGNvbXBpbGVEZWNsYXJlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBDb25zdGFudFBvb2wsIENzc1NlbGVjdG9yLCBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSwgRGVjbGFyZUNvbXBvbmVudFRlbXBsYXRlSW5mbywgREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRywgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEZhY3RvcnlUYXJnZXQsIEludGVycG9sYXRpb25Db25maWcsIExleGVyUmFuZ2UsIG1ha2VCaW5kaW5nUGFyc2VyLCBQYXJzZWRUZW1wbGF0ZSwgUGFyc2VTb3VyY2VGaWxlLCBwYXJzZVRlbXBsYXRlLCBSM0NsYXNzTWV0YWRhdGEsIFIzQ29tcG9uZW50TWV0YWRhdGEsIFIzVGFyZ2V0QmluZGVyLCBSM1VzZWREaXJlY3RpdmVNZXRhZGF0YSwgU2VsZWN0b3JNYXRjaGVyLCBTdGF0ZW1lbnQsIFRtcGxBc3ROb2RlLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Vmlld0VuY2Fwc3VsYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jb3JlJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0N5Y2xlLCBDeWNsZUFuYWx5emVyLCBDeWNsZUhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4uLy4uL2N5Y2xlcyc7XG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3IsIG1ha2VEaWFnbm9zdGljLCBtYWtlUmVsYXRlZEluZm9ybWF0aW9ufSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgcmVsYXRpdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7SW1wb3J0ZWRGaWxlLCBNb2R1bGVSZXNvbHZlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGVwZW5kZW5jeVRyYWNrZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge2V4dHJhY3RTZW1hbnRpY1R5cGVQYXJhbWV0ZXJzLCBpc0FycmF5RXF1YWwsIGlzUmVmZXJlbmNlRXF1YWwsIFNlbWFudGljRGVwR3JhcGhVcGRhdGVyLCBTZW1hbnRpY1JlZmVyZW5jZSwgU2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7SW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7Q2xhc3NQcm9wZXJ0eU1hcHBpbmcsIENvbXBvbmVudFJlc291cmNlcywgRGlyZWN0aXZlTWV0YSwgRGlyZWN0aXZlVHlwZUNoZWNrTWV0YSwgZXh0cmFjdERpcmVjdGl2ZVR5cGVDaGVja01ldGEsIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgTWV0YVR5cGUsIFJlc291cmNlLCBSZXNvdXJjZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0VudW1WYWx1ZSwgUGFydGlhbEV2YWx1YXRvciwgUmVzb2x2ZWRWYWx1ZX0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtQZXJmRXZlbnQsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uTm9kZSwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJGbGFncywgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge1N1YnNldE9mS2V5c30gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Y3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvciwgZ2V0RGlyZWN0aXZlRGlhZ25vc3RpY3MsIGdldFByb3ZpZGVyRGlhZ25vc3RpY3N9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEaXJlY3RpdmVTeW1ib2wsIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YSwgcGFyc2VGaWVsZEFycmF5VmFsdWV9IGZyb20gJy4vZGlyZWN0aXZlJztcbmltcG9ydCB7Y29tcGlsZURlY2xhcmVGYWN0b3J5LCBjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2V4dHJhY3RDbGFzc01ldGFkYXRhfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7TmdNb2R1bGVTeW1ib2x9IGZyb20gJy4vbmdfbW9kdWxlJztcbmltcG9ydCB7Y29tcGlsZVJlc3VsdHMsIGZpbmRBbmd1bGFyRGVjb3JhdG9yLCBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlLCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlLCByZWFkQmFzZUNsYXNzLCByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgdG9GYWN0b3J5TWV0YWRhdGEsIHVud3JhcEV4cHJlc3Npb24sIHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnN9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX01BUCA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuY29uc3QgRU1QVFlfQVJSQVk6IGFueVtdID0gW107XG5cbi8qKlxuICogVGhlc2UgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCBhcmUgdXBkYXRlZCBpbiB0aGUgYHJlc29sdmVgIHBoYXNlLlxuICpcbiAqIFRoZSBga2V5b2YgUjNDb21wb25lbnRNZXRhZGF0YSAmYCBjb25kaXRpb24gZW5zdXJlcyB0aGF0IG9ubHkgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCBjYW5cbiAqIGJlIGluY2x1ZGVkIGhlcmUuXG4gKi9cbmV4cG9ydCB0eXBlIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHMgPVxuICAgIFN1YnNldE9mS2V5czxSM0NvbXBvbmVudE1ldGFkYXRhLCAnZGlyZWN0aXZlcyd8J3BpcGVzJ3wnZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUnPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRBbmFseXNpc0RhdGEge1xuICAvKipcbiAgICogYG1ldGFgIGluY2x1ZGVzIHRob3NlIGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgd2hpY2ggYXJlIGNhbGN1bGF0ZWQgYXQgYGFuYWx5emVgIHRpbWVcbiAgICogKG5vdCBkdXJpbmcgcmVzb2x2ZSkuXG4gICAqL1xuICBtZXRhOiBPbWl0PFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuICBiYXNlQ2xhc3M6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPnwnZHluYW1pYyd8bnVsbDtcbiAgdHlwZUNoZWNrTWV0YTogRGlyZWN0aXZlVHlwZUNoZWNrTWV0YTtcbiAgdGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZTtcbiAgY2xhc3NNZXRhZGF0YTogUjNDbGFzc01ldGFkYXRhfG51bGw7XG5cbiAgaW5wdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZztcbiAgb3V0cHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmc7XG5cbiAgLyoqXG4gICAqIFByb3ZpZGVycyBleHRyYWN0ZWQgZnJvbSB0aGUgYHByb3ZpZGVyc2AgZmllbGQgb2YgdGhlIGNvbXBvbmVudCBhbm5vdGF0aW9uIHdoaWNoIHdpbGwgcmVxdWlyZVxuICAgKiBhbiBBbmd1bGFyIGZhY3RvcnkgZGVmaW5pdGlvbiBhdCBydW50aW1lLlxuICAgKi9cbiAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcblxuICAvKipcbiAgICogUHJvdmlkZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBgdmlld1Byb3ZpZGVyc2AgZmllbGQgb2YgdGhlIGNvbXBvbmVudCBhbm5vdGF0aW9uIHdoaWNoIHdpbGxcbiAgICogcmVxdWlyZSBhbiBBbmd1bGFyIGZhY3RvcnkgZGVmaW5pdGlvbiBhdCBydW50aW1lLlxuICAgKi9cbiAgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGw7XG5cbiAgcmVzb3VyY2VzOiBDb21wb25lbnRSZXNvdXJjZXM7XG5cbiAgLyoqXG4gICAqIGBzdHlsZVVybHNgIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNvcmF0b3IsIGlmIHByZXNlbnQuXG4gICAqL1xuICBzdHlsZVVybHM6IFN0eWxlVXJsTWV0YVtdfG51bGw7XG5cbiAgLyoqXG4gICAqIElubGluZSBzdHlsZXNoZWV0cyBleHRyYWN0ZWQgZnJvbSB0aGUgZGVjb3JhdG9yLCBpZiBwcmVzZW50LlxuICAgKi9cbiAgaW5saW5lU3R5bGVzOiBzdHJpbmdbXXxudWxsO1xuXG4gIGlzUG9pc29uZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIENvbXBvbmVudFJlc29sdXRpb25EYXRhID0gUGljazxSM0NvbXBvbmVudE1ldGFkYXRhLCBDb21wb25lbnRNZXRhZGF0YVJlc29sdmVkRmllbGRzPjtcblxuLyoqXG4gKiBUaGUgbGl0ZXJhbCBzdHlsZSB1cmwgZXh0cmFjdGVkIGZyb20gdGhlIGRlY29yYXRvciwgYWxvbmcgd2l0aCBtZXRhZGF0YSBmb3IgZGlhZ25vc3RpY3MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVVcmxNZXRhIHtcbiAgdXJsOiBzdHJpbmc7XG4gIG5vZGVGb3JFcnJvcjogdHMuTm9kZTtcbiAgc291cmNlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbVRlbXBsYXRlfFxuICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3I7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIG9yaWdpbiBvZiBhIHJlc291cmNlIGluIHRoZSBhcHBsaWNhdGlvbiBjb2RlLiBUaGlzIGlzIHVzZWQgZm9yIGNyZWF0aW5nXG4gKiBkaWFnbm9zdGljcywgc28gd2UgY2FuIHBvaW50IHRvIHRoZSByb290IGNhdXNlIG9mIGFuIGVycm9yIGluIHRoZSBhcHBsaWNhdGlvbiBjb2RlLlxuICpcbiAqIEEgdGVtcGxhdGUgcmVzb3VyY2UgY29tZXMgZnJvbSB0aGUgYHRlbXBsYXRlVXJsYCBwcm9wZXJ0eSBvbiB0aGUgY29tcG9uZW50IGRlY29yYXRvci5cbiAqXG4gKiBTdHlsZXNoZWV0cyByZXNvdXJjZXMgY2FuIGNvbWUgZnJvbSBlaXRoZXIgdGhlIGBzdHlsZVVybHNgIHByb3BlcnR5IG9uIHRoZSBjb21wb25lbnQgZGVjb3JhdG9yLFxuICogb3IgZnJvbSBpbmxpbmUgYHN0eWxlYCB0YWdzIGFuZCBzdHlsZSBsaW5rcyBvbiB0aGUgZXh0ZXJuYWwgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzIHtcbiAgVGVtcGxhdGUsXG4gIFN0eWxlc2hlZXRGcm9tVGVtcGxhdGUsXG4gIFN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yLFxufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBjb21wb25lbnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTeW1ib2wgZXh0ZW5kcyBEaXJlY3RpdmVTeW1ib2wge1xuICB1c2VkRGlyZWN0aXZlczogU2VtYW50aWNSZWZlcmVuY2VbXSA9IFtdO1xuICB1c2VkUGlwZXM6IFNlbWFudGljUmVmZXJlbmNlW10gPSBbXTtcbiAgaXNSZW1vdGVseVNjb3BlZCA9IGZhbHNlO1xuXG4gIGlzRW1pdEFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCwgcHVibGljQXBpQWZmZWN0ZWQ6IFNldDxTZW1hbnRpY1N5bWJvbD4pOiBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIENvbXBvbmVudFN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhbiBlcXVhbGl0eSBmdW5jdGlvbiB0aGF0IGNvbnNpZGVycyBzeW1ib2xzIGVxdWFsIGlmIHRoZXkgcmVwcmVzZW50IHRoZSBzYW1lXG4gICAgLy8gZGVjbGFyYXRpb24sIGJ1dCBvbmx5IGlmIHRoZSBzeW1ib2wgaW4gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gZG9lcyBub3QgaGF2ZSBpdHMgcHVibGljIEFQSVxuICAgIC8vIGFmZmVjdGVkLlxuICAgIGNvbnN0IGlzU3ltYm9sVW5hZmZlY3RlZCA9IChjdXJyZW50OiBTZW1hbnRpY1JlZmVyZW5jZSwgcHJldmlvdXM6IFNlbWFudGljUmVmZXJlbmNlKSA9PlxuICAgICAgICBpc1JlZmVyZW5jZUVxdWFsKGN1cnJlbnQsIHByZXZpb3VzKSAmJiAhcHVibGljQXBpQWZmZWN0ZWQuaGFzKGN1cnJlbnQuc3ltYm9sKTtcblxuICAgIC8vIFRoZSBlbWl0IG9mIGEgY29tcG9uZW50IGlzIGFmZmVjdGVkIGlmIGVpdGhlciBvZiB0aGUgZm9sbG93aW5nIGlzIHRydWU6XG4gICAgLy8gIDEuIFRoZSBjb21wb25lbnQgdXNlZCB0byBiZSByZW1vdGVseSBzY29wZWQgYnV0IG5vIGxvbmdlciBpcywgb3IgdmljZSB2ZXJzYS5cbiAgICAvLyAgMi4gVGhlIGxpc3Qgb2YgdXNlZCBkaXJlY3RpdmVzIGhhcyBjaGFuZ2VkIG9yIGFueSBvZiB0aG9zZSBkaXJlY3RpdmVzIGhhdmUgaGFkIHRoZWlyIHB1YmxpY1xuICAgIC8vICAgICBBUEkgY2hhbmdlZC4gSWYgdGhlIHVzZWQgZGlyZWN0aXZlcyBoYXZlIGJlZW4gcmVvcmRlcmVkIGJ1dCBub3Qgb3RoZXJ3aXNlIGFmZmVjdGVkIHRoZW5cbiAgICAvLyAgICAgdGhlIGNvbXBvbmVudCBtdXN0IHN0aWxsIGJlIHJlLWVtaXR0ZWQsIGFzIHRoaXMgbWF5IGFmZmVjdCBkaXJlY3RpdmUgaW5zdGFudGlhdGlvbiBvcmRlci5cbiAgICAvLyAgMy4gVGhlIGxpc3Qgb2YgdXNlZCBwaXBlcyBoYXMgY2hhbmdlZCwgb3IgYW55IG9mIHRob3NlIHBpcGVzIGhhdmUgaGFkIHRoZWlyIHB1YmxpYyBBUElcbiAgICAvLyAgICAgY2hhbmdlZC5cbiAgICByZXR1cm4gdGhpcy5pc1JlbW90ZWx5U2NvcGVkICE9PSBwcmV2aW91c1N5bWJvbC5pc1JlbW90ZWx5U2NvcGVkIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy51c2VkRGlyZWN0aXZlcywgcHJldmlvdXNTeW1ib2wudXNlZERpcmVjdGl2ZXMsIGlzU3ltYm9sVW5hZmZlY3RlZCkgfHxcbiAgICAgICAgIWlzQXJyYXlFcXVhbCh0aGlzLnVzZWRQaXBlcywgcHJldmlvdXNTeW1ib2wudXNlZFBpcGVzLCBpc1N5bWJvbFVuYWZmZWN0ZWQpO1xuICB9XG5cbiAgaXNUeXBlQ2hlY2tCbG9ja0FmZmVjdGVkKFxuICAgICAgcHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sLCB0eXBlQ2hlY2tBcGlBZmZlY3RlZDogU2V0PFNlbWFudGljU3ltYm9sPik6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgQ29tcG9uZW50U3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gVG8gdmVyaWZ5IHRoYXQgYSB1c2VkIGRpcmVjdGl2ZSBpcyBub3QgYWZmZWN0ZWQgd2UgbmVlZCB0byB2ZXJpZnkgdGhhdCBpdHMgZnVsbCBpbmhlcml0YW5jZVxuICAgIC8vIGNoYWluIGlzIG5vdCBwcmVzZW50IGluIGB0eXBlQ2hlY2tBcGlBZmZlY3RlZGAuXG4gICAgY29uc3QgaXNJbmhlcml0YW5jZUNoYWluQWZmZWN0ZWQgPSAoc3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4gPT4ge1xuICAgICAgbGV0IGN1cnJlbnRTeW1ib2w6IFNlbWFudGljU3ltYm9sfG51bGwgPSBzeW1ib2w7XG4gICAgICB3aGlsZSAoY3VycmVudFN5bWJvbCBpbnN0YW5jZW9mIERpcmVjdGl2ZVN5bWJvbCkge1xuICAgICAgICBpZiAodHlwZUNoZWNrQXBpQWZmZWN0ZWQuaGFzKGN1cnJlbnRTeW1ib2wpKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudFN5bWJvbCA9IGN1cnJlbnRTeW1ib2wuYmFzZUNsYXNzO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIC8vIENyZWF0ZSBhbiBlcXVhbGl0eSBmdW5jdGlvbiB0aGF0IGNvbnNpZGVycyBkaXJlY3RpdmVzIGVxdWFsIGlmIHRoZXkgcmVwcmVzZW50IHRoZSBzYW1lXG4gICAgLy8gZGVjbGFyYXRpb24gYW5kIGlmIHRoZSBzeW1ib2wgYW5kIGFsbCBzeW1ib2xzIGl0IGluaGVyaXRzIGZyb20gaW4gdGhlIGN1cnJlbnQgY29tcGlsYXRpb25cbiAgICAvLyBkbyBub3QgaGF2ZSB0aGVpciB0eXBlLWNoZWNrIEFQSSBhZmZlY3RlZC5cbiAgICBjb25zdCBpc0RpcmVjdGl2ZVVuYWZmZWN0ZWQgPSAoY3VycmVudDogU2VtYW50aWNSZWZlcmVuY2UsIHByZXZpb3VzOiBTZW1hbnRpY1JlZmVyZW5jZSkgPT5cbiAgICAgICAgaXNSZWZlcmVuY2VFcXVhbChjdXJyZW50LCBwcmV2aW91cykgJiYgIWlzSW5oZXJpdGFuY2VDaGFpbkFmZmVjdGVkKGN1cnJlbnQuc3ltYm9sKTtcblxuICAgIC8vIENyZWF0ZSBhbiBlcXVhbGl0eSBmdW5jdGlvbiB0aGF0IGNvbnNpZGVycyBwaXBlcyBlcXVhbCBpZiB0aGV5IHJlcHJlc2VudCB0aGUgc2FtZVxuICAgIC8vIGRlY2xhcmF0aW9uIGFuZCBpZiB0aGUgc3ltYm9sIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIGRvZXMgbm90IGhhdmUgaXRzIHR5cGUtY2hlY2tcbiAgICAvLyBBUEkgYWZmZWN0ZWQuXG4gICAgY29uc3QgaXNQaXBlVW5hZmZlY3RlZCA9IChjdXJyZW50OiBTZW1hbnRpY1JlZmVyZW5jZSwgcHJldmlvdXM6IFNlbWFudGljUmVmZXJlbmNlKSA9PlxuICAgICAgICBpc1JlZmVyZW5jZUVxdWFsKGN1cnJlbnQsIHByZXZpb3VzKSAmJiAhdHlwZUNoZWNrQXBpQWZmZWN0ZWQuaGFzKGN1cnJlbnQuc3ltYm9sKTtcblxuICAgIC8vIFRoZSBlbWl0IG9mIGEgdHlwZS1jaGVjayBibG9jayBvZiBhIGNvbXBvbmVudCBpcyBhZmZlY3RlZCBpZiBlaXRoZXIgb2YgdGhlIGZvbGxvd2luZyBpcyB0cnVlOlxuICAgIC8vICAxLiBUaGUgbGlzdCBvZiB1c2VkIGRpcmVjdGl2ZXMgaGFzIGNoYW5nZWQgb3IgYW55IG9mIHRob3NlIGRpcmVjdGl2ZXMgaGF2ZSBoYWQgdGhlaXJcbiAgICAvLyAgICAgdHlwZS1jaGVjayBBUEkgY2hhbmdlZC5cbiAgICAvLyAgMi4gVGhlIGxpc3Qgb2YgdXNlZCBwaXBlcyBoYXMgY2hhbmdlZCwgb3IgYW55IG9mIHRob3NlIHBpcGVzIGhhdmUgaGFkIHRoZWlyIHR5cGUtY2hlY2sgQVBJXG4gICAgLy8gICAgIGNoYW5nZWQuXG4gICAgcmV0dXJuICFpc0FycmF5RXF1YWwoXG4gICAgICAgICAgICAgICB0aGlzLnVzZWREaXJlY3RpdmVzLCBwcmV2aW91c1N5bWJvbC51c2VkRGlyZWN0aXZlcywgaXNEaXJlY3RpdmVVbmFmZmVjdGVkKSB8fFxuICAgICAgICAhaXNBcnJheUVxdWFsKHRoaXMudXNlZFBpcGVzLCBwcmV2aW91c1N5bWJvbC51c2VkUGlwZXMsIGlzUGlwZVVuYWZmZWN0ZWQpO1xuICB9XG59XG5cbi8qKlxuICogYERlY29yYXRvckhhbmRsZXJgIHdoaWNoIGhhbmRsZXMgdGhlIGBAQ29tcG9uZW50YCBhbm5vdGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3IsIENvbXBvbmVudEFuYWx5c2lzRGF0YSwgQ29tcG9uZW50U3ltYm9sLCBDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcixcbiAgICAgIHByaXZhdGUgc2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLCBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeTogVHlwZUNoZWNrU2NvcGVSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgcmVzb3VyY2VSZWdpc3RyeTogUmVzb3VyY2VSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJlc291cmNlTG9hZGVyOiBSZXNvdXJjZUxvYWRlciwgcHJpdmF0ZSByb290RGlyczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0UHJlc2VydmVXaGl0ZXNwYWNlczogYm9vbGVhbiwgcHJpdmF0ZSBpMThuVXNlRXh0ZXJuYWxJZHM6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IGJvb2xlYW4sIHByaXZhdGUgdXNlUG9pc29uZWREYXRhOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM6IGJvb2xlYW58dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXIsIHByaXZhdGUgY3ljbGVBbmFseXplcjogQ3ljbGVBbmFseXplcixcbiAgICAgIHByaXZhdGUgY3ljbGVIYW5kbGluZ1N0cmF0ZWd5OiBDeWNsZUhhbmRsaW5nU3RyYXRlZ3ksIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHByaXZhdGUgZGVwVHJhY2tlcjogRGVwZW5kZW5jeVRyYWNrZXJ8bnVsbCxcbiAgICAgIHByaXZhdGUgaW5qZWN0YWJsZVJlZ2lzdHJ5OiBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyfG51bGwsXG4gICAgICBwcml2YXRlIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyOiBib29sZWFuLCBwcml2YXRlIHBlcmY6IFBlcmZSZWNvcmRlcikge31cblxuICBwcml2YXRlIGxpdGVyYWxDYWNoZSA9IG5ldyBNYXA8RGVjb3JhdG9yLCB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbj4oKTtcbiAgcHJpdmF0ZSBlbGVtZW50U2NoZW1hUmVnaXN0cnkgPSBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCk7XG5cbiAgLyoqXG4gICAqIER1cmluZyB0aGUgYXN5bmNocm9ub3VzIHByZWFuYWx5emUgcGhhc2UsIGl0J3MgbmVjZXNzYXJ5IHRvIHBhcnNlIHRoZSB0ZW1wbGF0ZSB0byBleHRyYWN0XG4gICAqIGFueSBwb3RlbnRpYWwgPGxpbms+IHRhZ3Mgd2hpY2ggbWlnaHQgbmVlZCB0byBiZSBsb2FkZWQuIFRoaXMgY2FjaGUgZW5zdXJlcyB0aGF0IHdvcmsgaXMgbm90XG4gICAqIHRocm93biBhd2F5LCBhbmQgdGhlIHBhcnNlZCB0ZW1wbGF0ZSBpcyByZXVzZWQgZHVyaW5nIHRoZSBhbmFseXplIHBoYXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBwcmVhbmFseXplVGVtcGxhdGVDYWNoZSA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2U+KCk7XG4gIHByaXZhdGUgcHJlYW5hbHl6ZVN0eWxlc0NhY2hlID0gbmV3IE1hcDxEZWNsYXJhdGlvbk5vZGUsIHN0cmluZ1tdfG51bGw+KCk7XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG4gIHJlYWRvbmx5IG5hbWUgPSBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLm5hbWU7XG5cbiAgZGV0ZWN0KG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ0NvbXBvbmVudCcsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBkZWNvcmF0b3IsXG4gICAgICAgIG1ldGFkYXRhOiBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHByZWFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3I+KTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIC8vIEluIHByZWFuYWx5emUsIHJlc291cmNlIFVSTHMgYXNzb2NpYXRlZCB3aXRoIHRoZSBjb21wb25lbnQgYXJlIGFzeW5jaHJvbm91c2x5IHByZWxvYWRlZCB2aWFcbiAgICAvLyB0aGUgcmVzb3VyY2VMb2FkZXIuIFRoaXMgaXMgdGhlIG9ubHkgdGltZSBhc3luYyBvcGVyYXRpb25zIGFyZSBhbGxvd2VkIGZvciBhIGNvbXBvbmVudC5cbiAgICAvLyBUaGVzZSByZXNvdXJjZXMgYXJlOlxuICAgIC8vXG4gICAgLy8gLSB0aGUgdGVtcGxhdGVVcmwsIGlmIHRoZXJlIGlzIG9uZVxuICAgIC8vIC0gYW55IHN0eWxlVXJscyBpZiBwcmVzZW50XG4gICAgLy8gLSBhbnkgc3R5bGVzaGVldHMgcmVmZXJlbmNlZCBmcm9tIDxsaW5rPiB0YWdzIGluIHRoZSB0ZW1wbGF0ZSBpdHNlbGZcbiAgICAvL1xuICAgIC8vIEFzIGEgcmVzdWx0IG9mIHRoZSBsYXN0IG9uZSwgdGhlIHRlbXBsYXRlIG11c3QgYmUgcGFyc2VkIGFzIHBhcnQgb2YgcHJlYW5hbHlzaXMgdG8gZXh0cmFjdFxuICAgIC8vIDxsaW5rPiB0YWdzLCB3aGljaCBtYXkgaW52b2x2ZSB3YWl0aW5nIGZvciB0aGUgdGVtcGxhdGVVcmwgdG8gYmUgcmVzb2x2ZWQgZmlyc3QuXG5cbiAgICAvLyBJZiBwcmVsb2FkaW5nIGlzbid0IHBvc3NpYmxlLCB0aGVuIHNraXAgdGhpcyBzdGVwLlxuICAgIGlmICghdGhpcy5yZXNvdXJjZUxvYWRlci5jYW5QcmVsb2FkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGEgPSB0aGlzLl9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3IpO1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICBjb25zdCByZXNvbHZlU3R5bGVVcmwgPSAoc3R5bGVVcmw6IHN0cmluZyk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5yZXNvdXJjZUxvYWRlci5yZXNvbHZlKHN0eWxlVXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQocmVzb3VyY2VVcmwsIHt0eXBlOiAnc3R5bGUnLCBjb250YWluaW5nRmlsZX0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIERvbid0IHdvcnJ5IGFib3V0IGZhaWx1cmVzIHRvIHByZWxvYWQuIFdlIGNhbiBoYW5kbGUgdGhpcyBwcm9ibGVtIGR1cmluZyBhbmFseXNpcyBieVxuICAgICAgICAvLyBwcm9kdWNpbmcgYSBkaWFnbm9zdGljLlxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBBIFByb21pc2UgdGhhdCB3YWl0cyBmb3IgdGhlIHRlbXBsYXRlIGFuZCBhbGwgPGxpbms+ZWQgc3R5bGVzIHdpdGhpbiBpdCB0byBiZSBwcmVsb2FkZWQuXG4gICAgY29uc3QgdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzID1cbiAgICAgICAgdGhpcy5fcHJlbG9hZEFuZFBhcnNlVGVtcGxhdGUobm9kZSwgZGVjb3JhdG9yLCBjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKVxuICAgICAgICAgICAgLnRoZW4oKHRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2V8bnVsbCk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkID0+IHtcbiAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh0ZW1wbGF0ZS5zdHlsZVVybHMubWFwKHN0eWxlVXJsID0+IHJlc29sdmVTdHlsZVVybChzdHlsZVVybCkpKVxuICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgLy8gRXh0cmFjdCBhbGwgdGhlIHN0eWxlVXJscyBpbiB0aGUgZGVjb3JhdG9yLlxuICAgIGNvbnN0IGNvbXBvbmVudFN0eWxlVXJscyA9IHRoaXMuX2V4dHJhY3RDb21wb25lbnRTdHlsZVVybHMoY29tcG9uZW50KTtcblxuICAgIC8vIEV4dHJhY3QgaW5saW5lIHN0eWxlcywgcHJvY2VzcywgYW5kIGNhY2hlIGZvciB1c2UgaW4gc3luY2hyb25vdXMgYW5hbHl6ZSBwaGFzZVxuICAgIGxldCBpbmxpbmVTdHlsZXM7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3N0eWxlcycpKSB7XG4gICAgICBjb25zdCBsaXRTdHlsZXMgPSBwYXJzZUZpZWxkQXJyYXlWYWx1ZShjb21wb25lbnQsICdzdHlsZXMnLCB0aGlzLmV2YWx1YXRvcik7XG4gICAgICBpZiAobGl0U3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMucHJlYW5hbHl6ZVN0eWxlc0NhY2hlLnNldChub2RlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlubGluZVN0eWxlcyA9IFByb21pc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hbGwobGl0U3R5bGVzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZSA9PiB0aGlzLnJlc291cmNlTG9hZGVyLnByZXByb2Nlc3NJbmxpbmUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlLCB7dHlwZTogJ3N0eWxlJywgY29udGFpbmluZ0ZpbGV9KSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihzdHlsZXMgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByZWFuYWx5emVTdHlsZXNDYWNoZS5zZXQobm9kZSwgc3R5bGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnByZWFuYWx5emVTdHlsZXNDYWNoZS5zZXQobm9kZSwgbnVsbCk7XG4gICAgfVxuXG4gICAgLy8gV2FpdCBmb3IgYm90aCB0aGUgdGVtcGxhdGUgYW5kIGFsbCBzdHlsZVVybCByZXNvdXJjZXMgdG8gcmVzb2x2ZS5cbiAgICByZXR1cm4gUHJvbWlzZVxuICAgICAgICAuYWxsKFtcbiAgICAgICAgICB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXMsIGlubGluZVN0eWxlcyxcbiAgICAgICAgICAuLi5jb21wb25lbnRTdHlsZVVybHMubWFwKHN0eWxlVXJsID0+IHJlc29sdmVTdHlsZVVybChzdHlsZVVybC51cmwpKVxuICAgICAgICBdKVxuICAgICAgICAudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICB9XG5cbiAgYW5hbHl6ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPixcbiAgICAgIGZsYWdzOiBIYW5kbGVyRmxhZ3MgPSBIYW5kbGVyRmxhZ3MuTk9ORSk6IEFuYWx5c2lzT3V0cHV0PENvbXBvbmVudEFuYWx5c2lzRGF0YT4ge1xuICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5BbmFseXplQ29tcG9uZW50KTtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIHRoaXMubGl0ZXJhbENhY2hlLmRlbGV0ZShkZWNvcmF0b3IpO1xuXG4gICAgbGV0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW118dW5kZWZpbmVkO1xuICAgIGxldCBpc1BvaXNvbmVkID0gZmFsc2U7XG4gICAgLy8gQENvbXBvbmVudCBpbmhlcml0cyBARGlyZWN0aXZlLCBzbyBiZWdpbiBieSBleHRyYWN0aW5nIHRoZSBARGlyZWN0aXZlIG1ldGFkYXRhIGFuZCBidWlsZGluZ1xuICAgIC8vIG9uIGl0LlxuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9IGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICAgICAgbm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuaXNDb3JlLCBmbGFncyxcbiAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcixcbiAgICAgICAgdGhpcy5lbGVtZW50U2NoZW1hUmVnaXN0cnkuZ2V0RGVmYXVsdENvbXBvbmVudEVsZW1lbnROYW1lKCkpO1xuICAgIGlmIChkaXJlY3RpdmVSZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YWAgcmV0dXJucyB1bmRlZmluZWQgd2hlbiB0aGUgQERpcmVjdGl2ZSBoYXMgYGppdDogdHJ1ZWAuIEluIHRoaXNcbiAgICAgIC8vIGNhc2UsIGNvbXBpbGF0aW9uIG9mIHRoZSBkZWNvcmF0b3IgaXMgc2tpcHBlZC4gUmV0dXJuaW5nIGFuIGVtcHR5IG9iamVjdCBzaWduaWZpZXNcbiAgICAgIC8vIHRoYXQgbm8gYW5hbHlzaXMgd2FzIHByb2R1Y2VkLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8vIE5leHQsIHJlYWQgdGhlIGBAQ29tcG9uZW50YC1zcGVjaWZpYyBmaWVsZHMuXG4gICAgY29uc3Qge2RlY29yYXRvcjogY29tcG9uZW50LCBtZXRhZGF0YSwgaW5wdXRzLCBvdXRwdXRzfSA9IGRpcmVjdGl2ZVJlc3VsdDtcbiAgICBjb25zdCBlbmNhcHN1bGF0aW9uOiBudW1iZXIgPVxuICAgICAgICB0aGlzLl9yZXNvbHZlRW51bVZhbHVlKGNvbXBvbmVudCwgJ2VuY2Fwc3VsYXRpb24nLCAnVmlld0VuY2Fwc3VsYXRpb24nKSA/P1xuICAgICAgICBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZDtcbiAgICBjb25zdCBjaGFuZ2VEZXRlY3Rpb246IG51bWJlcnxudWxsID1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZUVudW1WYWx1ZShjb21wb25lbnQsICdjaGFuZ2VEZXRlY3Rpb24nLCAnQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3knKTtcblxuICAgIGxldCBhbmltYXRpb25zOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdhbmltYXRpb25zJykpIHtcbiAgICAgIGFuaW1hdGlvbnMgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNvbXBvbmVudC5nZXQoJ2FuaW1hdGlvbnMnKSEpO1xuICAgIH1cblxuICAgIC8vIEdvIHRocm91Z2ggdGhlIHJvb3QgZGlyZWN0b3JpZXMgZm9yIHRoaXMgcHJvamVjdCwgYW5kIHNlbGVjdCB0aGUgb25lIHdpdGggdGhlIHNtYWxsZXN0XG4gICAgLy8gcmVsYXRpdmUgcGF0aCByZXByZXNlbnRhdGlvbi5cbiAgICBjb25zdCByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aCA9IHRoaXMucm9vdERpcnMucmVkdWNlPHN0cmluZ3x1bmRlZmluZWQ+KChwcmV2aW91cywgcm9vdERpcikgPT4ge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcmVsYXRpdmUoYWJzb2x1dGVGcm9tKHJvb3REaXIpLCBhYnNvbHV0ZUZyb20oY29udGFpbmluZ0ZpbGUpKTtcbiAgICAgIGlmIChwcmV2aW91cyA9PT0gdW5kZWZpbmVkIHx8IGNhbmRpZGF0ZS5sZW5ndGggPCBwcmV2aW91cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cztcbiAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQpITtcblxuXG4gICAgLy8gTm90ZSB0aGF0IHdlIGNvdWxkIHRlY2huaWNhbGx5IGNvbWJpbmUgdGhlIGB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeWAgYW5kXG4gICAgLy8gYHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnlgIGludG8gYSBzaW5nbGUgc2V0LCBidXQgd2Uga2VlcCB0aGUgc2VwYXJhdGUgc28gdGhhdFxuICAgIC8vIHdlIGNhbiBkaXN0aW5ndWlzaCB3aGVyZSBhbiBlcnJvciBpcyBjb21pbmcgZnJvbSB3aGVuIGxvZ2dpbmcgdGhlIGRpYWdub3N0aWNzIGluIGByZXNvbHZlYC5cbiAgICBsZXQgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGwgPSBudWxsO1xuICAgIGxldCBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsID0gbnVsbDtcbiAgICBsZXQgd3JhcHBlZFZpZXdQcm92aWRlcnM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoY29tcG9uZW50Lmhhcygndmlld1Byb3ZpZGVycycpKSB7XG4gICAgICBjb25zdCB2aWV3UHJvdmlkZXJzID0gY29tcG9uZW50LmdldCgndmlld1Byb3ZpZGVycycpITtcbiAgICAgIHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ID1cbiAgICAgICAgICByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSh2aWV3UHJvdmlkZXJzLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgd3JhcHBlZFZpZXdQcm92aWRlcnMgPSBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgPyB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKHZpZXdQcm92aWRlcnMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlld1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3Byb3ZpZGVycycpKSB7XG4gICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ID0gcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkoXG4gICAgICAgICAgY29tcG9uZW50LmdldCgncHJvdmlkZXJzJykhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHRoZSB0ZW1wbGF0ZS5cbiAgICAvLyBJZiBhIHByZWFuYWx5emUgcGhhc2Ugd2FzIGV4ZWN1dGVkLCB0aGUgdGVtcGxhdGUgbWF5IGFscmVhZHkgZXhpc3QgaW4gcGFyc2VkIGZvcm0sIHNvIGNoZWNrXG4gICAgLy8gdGhlIHByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLlxuICAgIC8vIEV4dHJhY3QgYSBjbG9zdXJlIG9mIHRoZSB0ZW1wbGF0ZSBwYXJzaW5nIGNvZGUgc28gdGhhdCBpdCBjYW4gYmUgcmVwYXJzZWQgd2l0aCBkaWZmZXJlbnRcbiAgICAvLyBvcHRpb25zIGlmIG5lZWRlZCwgbGlrZSBpbiB0aGUgaW5kZXhpbmcgcGlwZWxpbmUuXG4gICAgbGV0IHRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2U7XG4gICAgaWYgKHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUgd2FzIHBhcnNlZCBpbiBwcmVhbmFseXplLiBVc2UgaXQgYW5kIGRlbGV0ZSBpdCB0byBzYXZlIG1lbW9yeS5cbiAgICAgIGNvbnN0IHByZWFuYWx5emVkID0gdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5nZXQobm9kZSkhO1xuICAgICAgdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5kZWxldGUobm9kZSk7XG5cbiAgICAgIHRlbXBsYXRlID0gcHJlYW5hbHl6ZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlRGVjbCA9IHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlUmVzb3VyY2UgPVxuICAgICAgICB0ZW1wbGF0ZS5kZWNsYXJhdGlvbi5pc0lubGluZSA/IHtwYXRoOiBudWxsLCBleHByZXNzaW9uOiBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpIX0gOiB7XG4gICAgICAgICAgcGF0aDogYWJzb2x1dGVGcm9tKHRlbXBsYXRlLmRlY2xhcmF0aW9uLnJlc29sdmVkVGVtcGxhdGVVcmwpLFxuICAgICAgICAgIGV4cHJlc3Npb246IHRlbXBsYXRlLnNvdXJjZU1hcHBpbmcubm9kZVxuICAgICAgICB9O1xuXG4gICAgLy8gRmlndXJlIG91dCB0aGUgc2V0IG9mIHN0eWxlcy4gVGhlIG9yZGVyaW5nIGhlcmUgaXMgaW1wb3J0YW50OiBleHRlcm5hbCByZXNvdXJjZXMgKHN0eWxlVXJscylcbiAgICAvLyBwcmVjZWRlIGlubGluZSBzdHlsZXMsIGFuZCBzdHlsZXMgZGVmaW5lZCBpbiB0aGUgdGVtcGxhdGUgb3ZlcnJpZGUgc3R5bGVzIGRlZmluZWQgaW4gdGhlXG4gICAgLy8gY29tcG9uZW50LlxuICAgIGxldCBzdHlsZXM6IHN0cmluZ1tdID0gW107XG5cbiAgICBjb25zdCBzdHlsZVJlc291cmNlcyA9IHRoaXMuX2V4dHJhY3RTdHlsZVJlc291cmNlcyhjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICBjb25zdCBzdHlsZVVybHM6IFN0eWxlVXJsTWV0YVtdID0gW1xuICAgICAgLi4udGhpcy5fZXh0cmFjdENvbXBvbmVudFN0eWxlVXJscyhjb21wb25lbnQpLCAuLi50aGlzLl9leHRyYWN0VGVtcGxhdGVTdHlsZVVybHModGVtcGxhdGUpXG4gICAgXTtcblxuICAgIGZvciAoY29uc3Qgc3R5bGVVcmwgb2Ygc3R5bGVVcmxzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybC51cmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VTdHIgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQocmVzb3VyY2VVcmwpO1xuICAgICAgICBzdHlsZXMucHVzaChyZXNvdXJjZVN0cik7XG4gICAgICAgIGlmICh0aGlzLmRlcFRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLmRlcFRyYWNrZXIuYWRkUmVzb3VyY2VEZXBlbmRlbmN5KG5vZGUuZ2V0U291cmNlRmlsZSgpLCBhYnNvbHV0ZUZyb20ocmVzb3VyY2VVcmwpKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIGlmIChkaWFnbm9zdGljcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXNvdXJjZVR5cGUgPVxuICAgICAgICAgICAgc3R5bGVVcmwuc291cmNlID09PSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvciA/XG4gICAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvciA6XG4gICAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbVRlbXBsYXRlO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgICAgdGhpcy5tYWtlUmVzb3VyY2VOb3RGb3VuZEVycm9yKHN0eWxlVXJsLnVybCwgc3R5bGVVcmwubm9kZUZvckVycm9yLCByZXNvdXJjZVR5cGUpXG4gICAgICAgICAgICAgICAgLnRvRGlhZ25vc3RpYygpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5jYXBzdWxhdGlvbiA9PT0gVmlld0VuY2Fwc3VsYXRpb24uU2hhZG93RG9tICYmIG1ldGFkYXRhLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBzZWxlY3RvckVycm9yID0gY2hlY2tDdXN0b21FbGVtZW50U2VsZWN0b3JGb3JFcnJvcnMobWV0YWRhdGEuc2VsZWN0b3IpO1xuICAgICAgaWYgKHNlbGVjdG9yRXJyb3IgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKGRpYWdub3N0aWNzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2gobWFrZURpYWdub3N0aWMoXG4gICAgICAgICAgICBFcnJvckNvZGUuQ09NUE9ORU5UX0lOVkFMSURfU0hBRE9XX0RPTV9TRUxFQ1RPUiwgY29tcG9uZW50LmdldCgnc2VsZWN0b3InKSEsXG4gICAgICAgICAgICBzZWxlY3RvckVycm9yKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgaW5saW5lIHN0eWxlcyB3ZXJlIHByZXByb2Nlc3NlZCB1c2UgdGhvc2VcbiAgICBsZXQgaW5saW5lU3R5bGVzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5wcmVhbmFseXplU3R5bGVzQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICBpbmxpbmVTdHlsZXMgPSB0aGlzLnByZWFuYWx5emVTdHlsZXNDYWNoZS5nZXQobm9kZSkhO1xuICAgICAgdGhpcy5wcmVhbmFseXplU3R5bGVzQ2FjaGUuZGVsZXRlKG5vZGUpO1xuICAgICAgaWYgKGlubGluZVN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgICBzdHlsZXMucHVzaCguLi5pbmxpbmVTdHlsZXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBQcmVwcm9jZXNzaW5nIGlzIG9ubHkgc3VwcG9ydGVkIGFzeW5jaHJvbm91c2x5XG4gICAgICAvLyBJZiBubyBzdHlsZSBjYWNoZSBlbnRyeSBpcyBwcmVzZW50IGFzeW5jaHJvbm91cyBwcmVhbmFseXplIHdhcyBub3QgZXhlY3V0ZWQuXG4gICAgICAvLyBUaGlzIHByb3RlY3RzIGFnYWluc3QgYWNjaWRlbnRhbCBkaWZmZXJlbmNlcyBpbiByZXNvdXJjZSBjb250ZW50cyB3aGVuIHByZWFuYWx5c2lzXG4gICAgICAvLyBpcyBub3QgdXNlZCB3aXRoIGEgcHJvdmlkZWQgdHJhbnNmb3JtUmVzb3VyY2UgaG9vayBvbiB0aGUgUmVzb3VyY2VIb3N0LlxuICAgICAgaWYgKHRoaXMucmVzb3VyY2VMb2FkZXIuY2FuUHJlcHJvY2Vzcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lubGluZSByZXNvdXJjZSBwcm9jZXNzaW5nIHJlcXVpcmVzIGFzeW5jaHJvbm91cyBwcmVhbmFseXplLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29tcG9uZW50Lmhhcygnc3R5bGVzJykpIHtcbiAgICAgICAgY29uc3QgbGl0U3R5bGVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoY29tcG9uZW50LCAnc3R5bGVzJywgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgICBpZiAobGl0U3R5bGVzICE9PSBudWxsKSB7XG4gICAgICAgICAgaW5saW5lU3R5bGVzID0gWy4uLmxpdFN0eWxlc107XG4gICAgICAgICAgc3R5bGVzLnB1c2goLi4ubGl0U3R5bGVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGVtcGxhdGUuc3R5bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHN0eWxlcy5wdXNoKC4uLnRlbXBsYXRlLnN0eWxlcyk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0OiBBbmFseXNpc091dHB1dDxDb21wb25lbnRBbmFseXNpc0RhdGE+ID0ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgYmFzZUNsYXNzOiByZWFkQmFzZUNsYXNzKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciksXG4gICAgICAgIGlucHV0cyxcbiAgICAgICAgb3V0cHV0cyxcbiAgICAgICAgbWV0YToge1xuICAgICAgICAgIC4uLm1ldGFkYXRhLFxuICAgICAgICAgIHRlbXBsYXRlOiB7XG4gICAgICAgICAgICBub2RlczogdGVtcGxhdGUubm9kZXMsXG4gICAgICAgICAgICBuZ0NvbnRlbnRTZWxlY3RvcnM6IHRlbXBsYXRlLm5nQ29udGVudFNlbGVjdG9ycyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVuY2Fwc3VsYXRpb24sXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbjogdGVtcGxhdGUuaW50ZXJwb2xhdGlvbkNvbmZpZyA/PyBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHLFxuICAgICAgICAgIHN0eWxlcyxcblxuICAgICAgICAgIC8vIFRoZXNlIHdpbGwgYmUgcmVwbGFjZWQgZHVyaW5nIHRoZSBjb21waWxhdGlvbiBzdGVwLCBhZnRlciBhbGwgYE5nTW9kdWxlYHMgaGF2ZSBiZWVuXG4gICAgICAgICAgLy8gYW5hbHl6ZWQgYW5kIHRoZSBmdWxsIGNvbXBpbGF0aW9uIHNjb3BlIGZvciB0aGUgY29tcG9uZW50IGNhbiBiZSByZWFsaXplZC5cbiAgICAgICAgICBhbmltYXRpb25zLFxuICAgICAgICAgIHZpZXdQcm92aWRlcnM6IHdyYXBwZWRWaWV3UHJvdmlkZXJzLFxuICAgICAgICAgIGkxOG5Vc2VFeHRlcm5hbElkczogdGhpcy5pMThuVXNlRXh0ZXJuYWxJZHMsXG4gICAgICAgICAgcmVsYXRpdmVDb250ZXh0RmlsZVBhdGgsXG4gICAgICAgIH0sXG4gICAgICAgIHR5cGVDaGVja01ldGE6IGV4dHJhY3REaXJlY3RpdmVUeXBlQ2hlY2tNZXRhKG5vZGUsIGlucHV0cywgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgICBjbGFzc01ldGFkYXRhOiBleHRyYWN0Q2xhc3NNZXRhZGF0YShcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmlzQ29yZSwgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciksXG4gICAgICAgIHRlbXBsYXRlLFxuICAgICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LFxuICAgICAgICB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSxcbiAgICAgICAgaW5saW5lU3R5bGVzLFxuICAgICAgICBzdHlsZVVybHMsXG4gICAgICAgIHJlc291cmNlczoge1xuICAgICAgICAgIHN0eWxlczogc3R5bGVSZXNvdXJjZXMsXG4gICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlUmVzb3VyY2UsXG4gICAgICAgIH0sXG4gICAgICAgIGlzUG9pc29uZWQsXG4gICAgICB9LFxuICAgICAgZGlhZ25vc3RpY3MsXG4gICAgfTtcbiAgICBpZiAoY2hhbmdlRGV0ZWN0aW9uICE9PSBudWxsKSB7XG4gICAgICBvdXRwdXQuYW5hbHlzaXMhLm1ldGEuY2hhbmdlRGV0ZWN0aW9uID0gY2hhbmdlRGV0ZWN0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9XG5cbiAgc3ltYm9sKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+KTogQ29tcG9uZW50U3ltYm9sIHtcbiAgICBjb25zdCB0eXBlUGFyYW1ldGVycyA9IGV4dHJhY3RTZW1hbnRpY1R5cGVQYXJhbWV0ZXJzKG5vZGUpO1xuXG4gICAgcmV0dXJuIG5ldyBDb21wb25lbnRTeW1ib2woXG4gICAgICAgIG5vZGUsIGFuYWx5c2lzLm1ldGEuc2VsZWN0b3IsIGFuYWx5c2lzLmlucHV0cywgYW5hbHlzaXMub3V0cHV0cywgYW5hbHlzaXMubWV0YS5leHBvcnRBcyxcbiAgICAgICAgYW5hbHlzaXMudHlwZUNoZWNrTWV0YSwgdHlwZVBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcmVnaXN0ZXIobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IENvbXBvbmVudEFuYWx5c2lzRGF0YSk6IHZvaWQge1xuICAgIC8vIFJlZ2lzdGVyIHRoaXMgY29tcG9uZW50J3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgYE1ldGFkYXRhUmVnaXN0cnlgLiBUaGlzIGVuc3VyZXMgdGhhdFxuICAgIC8vIHRoZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY29tcG9uZW50IGlzIGF2YWlsYWJsZSBkdXJpbmcgdGhlIGNvbXBpbGUoKSBwaGFzZS5cbiAgICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKG5vZGUpO1xuICAgIHRoaXMubWV0YVJlZ2lzdHJ5LnJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEoe1xuICAgICAgdHlwZTogTWV0YVR5cGUuRGlyZWN0aXZlLFxuICAgICAgcmVmLFxuICAgICAgbmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgICBzZWxlY3RvcjogYW5hbHlzaXMubWV0YS5zZWxlY3RvcixcbiAgICAgIGV4cG9ydEFzOiBhbmFseXNpcy5tZXRhLmV4cG9ydEFzLFxuICAgICAgaW5wdXRzOiBhbmFseXNpcy5pbnB1dHMsXG4gICAgICBvdXRwdXRzOiBhbmFseXNpcy5vdXRwdXRzLFxuICAgICAgcXVlcmllczogYW5hbHlzaXMubWV0YS5xdWVyaWVzLm1hcChxdWVyeSA9PiBxdWVyeS5wcm9wZXJ0eU5hbWUpLFxuICAgICAgaXNDb21wb25lbnQ6IHRydWUsXG4gICAgICBiYXNlQ2xhc3M6IGFuYWx5c2lzLmJhc2VDbGFzcyxcbiAgICAgIC4uLmFuYWx5c2lzLnR5cGVDaGVja01ldGEsXG4gICAgICBpc1BvaXNvbmVkOiBhbmFseXNpcy5pc1BvaXNvbmVkLFxuICAgICAgaXNTdHJ1Y3R1cmFsOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIHRoaXMucmVzb3VyY2VSZWdpc3RyeS5yZWdpc3RlclJlc291cmNlcyhhbmFseXNpcy5yZXNvdXJjZXMsIG5vZGUpO1xuICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5LnJlZ2lzdGVySW5qZWN0YWJsZShub2RlKTtcbiAgfVxuXG4gIGluZGV4KFxuICAgICAgY29udGV4dDogSW5kZXhpbmdDb250ZXh0LCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPikge1xuICAgIGlmIChhbmFseXNpcy5pc1BvaXNvbmVkICYmICF0aGlzLnVzZVBvaXNvbmVkRGF0YSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChub2RlKTtcbiAgICBjb25zdCBzZWxlY3RvciA9IGFuYWx5c2lzLm1ldGEuc2VsZWN0b3I7XG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8RGlyZWN0aXZlTWV0YT4oKTtcbiAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgIGlmICgoc2NvcGUuY29tcGlsYXRpb24uaXNQb2lzb25lZCB8fCBzY29wZS5leHBvcnRlZC5pc1BvaXNvbmVkKSAmJiAhdGhpcy51c2VQb2lzb25lZERhdGEpIHtcbiAgICAgICAgLy8gRG9uJ3QgYm90aGVyIGluZGV4aW5nIGNvbXBvbmVudHMgd2hpY2ggaGFkIGVycm9uZW91cyBzY29wZXMsIHVubGVzcyBzcGVjaWZpY2FsbHlcbiAgICAgICAgLy8gcmVxdWVzdGVkLlxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBpZiAoZGlyZWN0aXZlLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShkaXJlY3RpdmUuc2VsZWN0b3IpLCBkaXJlY3RpdmUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihtYXRjaGVyKTtcbiAgICBjb25zdCBib3VuZFRlbXBsYXRlID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlOiBhbmFseXNpcy50ZW1wbGF0ZS5kaWFnTm9kZXN9KTtcblxuICAgIGNvbnRleHQuYWRkQ29tcG9uZW50KHtcbiAgICAgIGRlY2xhcmF0aW9uOiBub2RlLFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBib3VuZFRlbXBsYXRlLFxuICAgICAgdGVtcGxhdGVNZXRhOiB7XG4gICAgICAgIGlzSW5saW5lOiBhbmFseXNpcy50ZW1wbGF0ZS5kZWNsYXJhdGlvbi5pc0lubGluZSxcbiAgICAgICAgZmlsZTogYW5hbHlzaXMudGVtcGxhdGUuZmlsZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICB0eXBlQ2hlY2soY3R4OiBUeXBlQ2hlY2tDb250ZXh0LCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBtZXRhOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+KTpcbiAgICAgIHZvaWQge1xuICAgIGlmICh0aGlzLnR5cGVDaGVja1Njb3BlUmVnaXN0cnkgPT09IG51bGwgfHwgIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChtZXRhLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy50eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LmdldFR5cGVDaGVja1Njb3BlKG5vZGUpO1xuICAgIGlmIChzY29wZS5pc1BvaXNvbmVkICYmICF0aGlzLnVzZVBvaXNvbmVkRGF0YSkge1xuICAgICAgLy8gRG9uJ3QgdHlwZS1jaGVjayBjb21wb25lbnRzIHRoYXQgaGFkIGVycm9ycyBpbiB0aGVpciBzY29wZXMsIHVubGVzcyByZXF1ZXN0ZWQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKHNjb3BlLm1hdGNoZXIpO1xuICAgIGN0eC5hZGRUZW1wbGF0ZShcbiAgICAgICAgbmV3IFJlZmVyZW5jZShub2RlKSwgYmluZGVyLCBtZXRhLnRlbXBsYXRlLmRpYWdOb2Rlcywgc2NvcGUucGlwZXMsIHNjb3BlLnNjaGVtYXMsXG4gICAgICAgIG1ldGEudGVtcGxhdGUuc291cmNlTWFwcGluZywgbWV0YS50ZW1wbGF0ZS5maWxlLCBtZXRhLnRlbXBsYXRlLmVycm9ycyk7XG4gIH1cblxuICByZXNvbHZlKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICBzeW1ib2w6IENvbXBvbmVudFN5bWJvbCk6IFJlc29sdmVSZXN1bHQ8Q29tcG9uZW50UmVzb2x1dGlvbkRhdGE+IHtcbiAgICBpZiAodGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlciAhPT0gbnVsbCAmJiBhbmFseXNpcy5iYXNlQ2xhc3MgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIHN5bWJvbC5iYXNlQ2xhc3MgPSB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLmdldFN5bWJvbChhbmFseXNpcy5iYXNlQ2xhc3Mubm9kZSk7XG4gICAgfVxuXG4gICAgaWYgKGFuYWx5c2lzLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBjb21wb25lbnQgd2FzIHJlZ2lzdGVyZWQgd2l0aCBhbiBOZ01vZHVsZS4gSWYgc28sIGl0IHNob3VsZCBiZSBjb21waWxlZFxuICAgIC8vIHVuZGVyIHRoYXQgbW9kdWxlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGxldCBtZXRhZGF0YSA9IGFuYWx5c2lzLm1ldGEgYXMgUmVhZG9ubHk8UjNDb21wb25lbnRNZXRhZGF0YT47XG5cbiAgICBjb25zdCBkYXRhOiBDb21wb25lbnRSZXNvbHV0aW9uRGF0YSA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IEVNUFRZX0FSUkFZLFxuICAgICAgcGlwZXM6IEVNUFRZX01BUCxcbiAgICAgIGRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlOiBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZS5EaXJlY3QsXG4gICAgfTtcblxuICAgIGlmIChzY29wZSAhPT0gbnVsbCAmJiAoIXNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQgfHwgdGhpcy51c2VQb2lzb25lZERhdGEpKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIHJlc29sdmUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICAvL1xuICAgICAgLy8gRmlyc3QgaXQgbmVlZHMgdG8gYmUgZGV0ZXJtaW5lZCBpZiBhY3R1YWxseSBpbXBvcnRpbmcgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgdXNlZCBpbiB0aGVcbiAgICAgIC8vIHRlbXBsYXRlIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLiBDdXJyZW50bHkgbmd0c2MgcmVmdXNlcyB0byBnZW5lcmF0ZSBjeWNsZXMsIHNvIGFuIG9wdGlvblxuICAgICAgLy8ga25vd24gYXMgXCJyZW1vdGUgc2NvcGluZ1wiIGlzIHVzZWQgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLiBJbiByZW1vdGUgc2NvcGluZywgdGhlXG4gICAgICAvLyBtb2R1bGUgZmlsZSBzZXRzIHRoZSBkaXJlY3RpdmVzL3BpcGVzIG9uIHRoZSDJtWNtcCBvZiB0aGUgY29tcG9uZW50LCB3aXRob3V0XG4gICAgICAvLyByZXF1aXJpbmcgbmV3IGltcG9ydHMgKGJ1dCBhbHNvIGluIGEgd2F5IHRoYXQgYnJlYWtzIHRyZWUgc2hha2luZykuXG4gICAgICAvL1xuICAgICAgLy8gRGV0ZXJtaW5pbmcgdGhpcyBpcyBjaGFsbGVuZ2luZywgYmVjYXVzZSB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyByZXNwb25zaWJsZSBmb3JcbiAgICAgIC8vIG1hdGNoaW5nIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSB0ZW1wbGF0ZTsgaG93ZXZlciwgdGhhdCBkb2Vzbid0IHJ1biB1bnRpbCB0aGUgYWN0dWFsXG4gICAgICAvLyBjb21waWxlKCkgc3RlcC4gSXQncyBub3QgcG9zc2libGUgdG8gcnVuIHRlbXBsYXRlIGNvbXBpbGF0aW9uIHNvb25lciBhcyBpdCByZXF1aXJlcyB0aGVcbiAgICAgIC8vIENvbnN0YW50UG9vbCBmb3IgdGhlIG92ZXJhbGwgZmlsZSBiZWluZyBjb21waWxlZCAod2hpY2ggaXNuJ3QgYXZhaWxhYmxlIHVudGlsIHRoZVxuICAgICAgLy8gdHJhbnNmb3JtIHN0ZXApLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQsIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIG1hdGNoZWQgaW5kZXBlbmRlbnRseSBoZXJlLCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXNcbiAgICAgIC8vIGlzIGFuIGFsdGVybmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIHRlbXBsYXRlIG1hdGNoaW5nIHdoaWNoIGlzIHVzZWQgZm9yIHRlbXBsYXRlXG4gICAgICAvLyB0eXBlLWNoZWNraW5nIGFuZCB3aWxsIGV2ZW50dWFsbHkgcmVwbGFjZSBtYXRjaGluZyBpbiB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlci5cblxuXG4gICAgICAvLyBTZXQgdXAgdGhlIFIzVGFyZ2V0QmluZGVyLCBhcyB3ZWxsIGFzIGEgJ2RpcmVjdGl2ZXMnIGFycmF5IGFuZCBhICdwaXBlcycgbWFwIHRoYXQgYXJlXG4gICAgICAvLyBsYXRlciBmZWQgdG8gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuIEZpcnN0LCBhIFNlbGVjdG9yTWF0Y2hlciBpcyBjb25zdHJ1Y3RlZCB0b1xuICAgICAgLy8gbWF0Y2ggZGlyZWN0aXZlcyB0aGF0IGFyZSBpbiBzY29wZS5cbiAgICAgIHR5cGUgTWF0Y2hlZERpcmVjdGl2ZSA9IERpcmVjdGl2ZU1ldGEme3NlbGVjdG9yOiBzdHJpbmd9O1xuICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8TWF0Y2hlZERpcmVjdGl2ZT4oKTtcblxuICAgICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBpZiAoZGlyLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShkaXIuc2VsZWN0b3IpLCBkaXIgYXMgTWF0Y2hlZERpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5jb21waWxhdGlvbi5waXBlcykge1xuICAgICAgICBwaXBlcy5zZXQocGlwZS5uYW1lLCBwaXBlLnJlZik7XG4gICAgICB9XG5cbiAgICAgIC8vIE5leHQsIHRoZSBjb21wb25lbnQgdGVtcGxhdGUgQVNUIGlzIGJvdW5kIHVzaW5nIHRoZSBSM1RhcmdldEJpbmRlci4gVGhpcyBwcm9kdWNlcyBhXG4gICAgICAvLyBCb3VuZFRhcmdldCwgd2hpY2ggaXMgc2ltaWxhciB0byBhIHRzLlR5cGVDaGVja2VyLlxuICAgICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgICAgY29uc3QgYm91bmQgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IG1ldGFkYXRhLnRlbXBsYXRlLm5vZGVzfSk7XG5cbiAgICAgIC8vIFRoZSBCb3VuZFRhcmdldCBrbm93cyB3aGljaCBkaXJlY3RpdmVzIGFuZCBwaXBlcyBtYXRjaGVkIHRoZSB0ZW1wbGF0ZS5cbiAgICAgIHR5cGUgVXNlZERpcmVjdGl2ZSA9XG4gICAgICAgICAgUjNVc2VkRGlyZWN0aXZlTWV0YWRhdGEme3JlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBpbXBvcnRlZEZpbGU6IEltcG9ydGVkRmlsZX07XG4gICAgICBjb25zdCB1c2VkRGlyZWN0aXZlczogVXNlZERpcmVjdGl2ZVtdID0gYm91bmQuZ2V0VXNlZERpcmVjdGl2ZXMoKS5tYXAoZGlyZWN0aXZlID0+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGRpcmVjdGl2ZS5yZWYsIGNvbnRleHQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlZjogZGlyZWN0aXZlLnJlZixcbiAgICAgICAgICB0eXBlOiB0eXBlLmV4cHJlc3Npb24sXG4gICAgICAgICAgaW1wb3J0ZWRGaWxlOiB0eXBlLmltcG9ydGVkRmlsZSxcbiAgICAgICAgICBzZWxlY3RvcjogZGlyZWN0aXZlLnNlbGVjdG9yLFxuICAgICAgICAgIGlucHV0czogZGlyZWN0aXZlLmlucHV0cy5wcm9wZXJ0eU5hbWVzLFxuICAgICAgICAgIG91dHB1dHM6IGRpcmVjdGl2ZS5vdXRwdXRzLnByb3BlcnR5TmFtZXMsXG4gICAgICAgICAgZXhwb3J0QXM6IGRpcmVjdGl2ZS5leHBvcnRBcyxcbiAgICAgICAgICBpc0NvbXBvbmVudDogZGlyZWN0aXZlLmlzQ29tcG9uZW50LFxuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIHR5cGUgVXNlZFBpcGUgPSB7XG4gICAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LFxuICAgICAgICBwaXBlTmFtZTogc3RyaW5nLFxuICAgICAgICBleHByZXNzaW9uOiBFeHByZXNzaW9uLFxuICAgICAgICBpbXBvcnRlZEZpbGU6IEltcG9ydGVkRmlsZSxcbiAgICAgIH07XG4gICAgICBjb25zdCB1c2VkUGlwZXM6IFVzZWRQaXBlW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgcGlwZU5hbWUgb2YgYm91bmQuZ2V0VXNlZFBpcGVzKCkpIHtcbiAgICAgICAgaWYgKCFwaXBlcy5oYXMocGlwZU5hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGlwZSA9IHBpcGVzLmdldChwaXBlTmFtZSkhO1xuICAgICAgICBjb25zdCB0eXBlID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocGlwZSwgY29udGV4dCk7XG4gICAgICAgIHVzZWRQaXBlcy5wdXNoKHtcbiAgICAgICAgICByZWY6IHBpcGUsXG4gICAgICAgICAgcGlwZU5hbWUsXG4gICAgICAgICAgZXhwcmVzc2lvbjogdHlwZS5leHByZXNzaW9uLFxuICAgICAgICAgIGltcG9ydGVkRmlsZTogdHlwZS5pbXBvcnRlZEZpbGUsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgIT09IG51bGwpIHtcbiAgICAgICAgc3ltYm9sLnVzZWREaXJlY3RpdmVzID0gdXNlZERpcmVjdGl2ZXMubWFwKFxuICAgICAgICAgICAgZGlyID0+IHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIhLmdldFNlbWFudGljUmVmZXJlbmNlKGRpci5yZWYubm9kZSwgZGlyLnR5cGUpKTtcbiAgICAgICAgc3ltYm9sLnVzZWRQaXBlcyA9IHVzZWRQaXBlcy5tYXAoXG4gICAgICAgICAgICBwaXBlID0+XG4gICAgICAgICAgICAgICAgdGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlciEuZ2V0U2VtYW50aWNSZWZlcmVuY2UocGlwZS5yZWYubm9kZSwgcGlwZS5leHByZXNzaW9uKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFNjYW4gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcy9waXBlcyBhY3R1YWxseSB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgY2hlY2sgd2hldGhlciBhbnlcbiAgICAgIC8vIGltcG9ydCB3aGljaCBuZWVkcyB0byBiZSBnZW5lcmF0ZWQgd291bGQgY3JlYXRlIGEgY3ljbGUuXG4gICAgICBjb25zdCBjeWNsZXNGcm9tRGlyZWN0aXZlcyA9IG5ldyBNYXA8VXNlZERpcmVjdGl2ZSwgQ3ljbGU+KCk7XG4gICAgICBmb3IgKGNvbnN0IHVzZWREaXJlY3RpdmUgb2YgdXNlZERpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3QgY3ljbGUgPVxuICAgICAgICAgICAgdGhpcy5fY2hlY2tGb3JDeWNsaWNJbXBvcnQodXNlZERpcmVjdGl2ZS5pbXBvcnRlZEZpbGUsIHVzZWREaXJlY3RpdmUudHlwZSwgY29udGV4dCk7XG4gICAgICAgIGlmIChjeWNsZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGN5Y2xlc0Zyb21EaXJlY3RpdmVzLnNldCh1c2VkRGlyZWN0aXZlLCBjeWNsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGN5Y2xlc0Zyb21QaXBlcyA9IG5ldyBNYXA8VXNlZFBpcGUsIEN5Y2xlPigpO1xuICAgICAgZm9yIChjb25zdCB1c2VkUGlwZSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgY29uc3QgY3ljbGUgPVxuICAgICAgICAgICAgdGhpcy5fY2hlY2tGb3JDeWNsaWNJbXBvcnQodXNlZFBpcGUuaW1wb3J0ZWRGaWxlLCB1c2VkUGlwZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKGN5Y2xlICE9PSBudWxsKSB7XG4gICAgICAgICAgY3ljbGVzRnJvbVBpcGVzLnNldCh1c2VkUGlwZSwgY3ljbGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGN5Y2xlRGV0ZWN0ZWQgPSBjeWNsZXNGcm9tRGlyZWN0aXZlcy5zaXplICE9PSAwIHx8IGN5Y2xlc0Zyb21QaXBlcy5zaXplICE9PSAwO1xuICAgICAgaWYgKCFjeWNsZURldGVjdGVkKSB7XG4gICAgICAgIC8vIE5vIGN5Y2xlIHdhcyBkZXRlY3RlZC4gUmVjb3JkIHRoZSBpbXBvcnRzIHRoYXQgbmVlZCB0byBiZSBjcmVhdGVkIGluIHRoZSBjeWNsZSBkZXRlY3RvclxuICAgICAgICAvLyBzbyB0aGF0IGZ1dHVyZSBjeWNsaWMgaW1wb3J0IGNoZWNrcyBjb25zaWRlciB0aGVpciBwcm9kdWN0aW9uLlxuICAgICAgICBmb3IgKGNvbnN0IHt0eXBlLCBpbXBvcnRlZEZpbGV9IG9mIHVzZWREaXJlY3RpdmVzKSB7XG4gICAgICAgICAgdGhpcy5fcmVjb3JkU3ludGhldGljSW1wb3J0KGltcG9ydGVkRmlsZSwgdHlwZSwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCB7ZXhwcmVzc2lvbiwgaW1wb3J0ZWRGaWxlfSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgICB0aGlzLl9yZWNvcmRTeW50aGV0aWNJbXBvcnQoaW1wb3J0ZWRGaWxlLCBleHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGFycmF5cyBpbiDJtWNtcCBuZWVkIHRvIGJlIHdyYXBwZWQgaW4gY2xvc3VyZXMuXG4gICAgICAgIC8vIFRoaXMgaXMgcmVxdWlyZWQgaWYgYW55IGRpcmVjdGl2ZS9waXBlIHJlZmVyZW5jZSBpcyB0byBhIGRlY2xhcmF0aW9uIGluIHRoZSBzYW1lIGZpbGVcbiAgICAgICAgLy8gYnV0IGRlY2xhcmVkIGFmdGVyIHRoaXMgY29tcG9uZW50LlxuICAgICAgICBjb25zdCB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID1cbiAgICAgICAgICAgIHVzZWREaXJlY3RpdmVzLnNvbWUoXG4gICAgICAgICAgICAgICAgZGlyID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoZGlyLnR5cGUsIG5vZGUubmFtZSwgY29udGV4dCkpIHx8XG4gICAgICAgICAgICB1c2VkUGlwZXMuc29tZShcbiAgICAgICAgICAgICAgICBwaXBlID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocGlwZS5leHByZXNzaW9uLCBub2RlLm5hbWUsIGNvbnRleHQpKTtcblxuICAgICAgICBkYXRhLmRpcmVjdGl2ZXMgPSB1c2VkRGlyZWN0aXZlcztcbiAgICAgICAgZGF0YS5waXBlcyA9IG5ldyBNYXAodXNlZFBpcGVzLm1hcChwaXBlID0+IFtwaXBlLnBpcGVOYW1lLCBwaXBlLmV4cHJlc3Npb25dKSk7XG4gICAgICAgIGRhdGEuZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUgPSB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID9cbiAgICAgICAgICAgIERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkNsb3N1cmUgOlxuICAgICAgICAgICAgRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUuRGlyZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuY3ljbGVIYW5kbGluZ1N0cmF0ZWd5ID09PSBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuVXNlUmVtb3RlU2NvcGluZykge1xuICAgICAgICAgIC8vIERlY2xhcmluZyB0aGUgZGlyZWN0aXZlRGVmcy9waXBlRGVmcyBhcnJheXMgZGlyZWN0bHkgd291bGQgcmVxdWlyZSBpbXBvcnRzIHRoYXQgd291bGRcbiAgICAgICAgICAvLyBjcmVhdGUgYSBjeWNsZS4gSW5zdGVhZCwgbWFyayB0aGlzIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcsIHNvIHRoYXQgdGhlXG4gICAgICAgICAgLy8gTmdNb2R1bGUgZmlsZSB3aWxsIHRha2UgY2FyZSBvZiBzZXR0aW5nIHRoZSBkaXJlY3RpdmVzIGZvciB0aGUgY29tcG9uZW50LlxuICAgICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5zZXRDb21wb25lbnRSZW1vdGVTY29wZShcbiAgICAgICAgICAgICAgbm9kZSwgdXNlZERpcmVjdGl2ZXMubWFwKGRpciA9PiBkaXIucmVmKSwgdXNlZFBpcGVzLm1hcChwaXBlID0+IHBpcGUucmVmKSk7XG4gICAgICAgICAgc3ltYm9sLmlzUmVtb3RlbHlTY29wZWQgPSB0cnVlO1xuXG4gICAgICAgICAgLy8gSWYgYSBzZW1hbnRpYyBncmFwaCBpcyBiZWluZyB0cmFja2VkLCByZWNvcmQgdGhlIGZhY3QgdGhhdCB0aGlzIGNvbXBvbmVudCBpcyByZW1vdGVseVxuICAgICAgICAgIC8vIHNjb3BlZCB3aXRoIHRoZSBkZWNsYXJpbmcgTmdNb2R1bGUgc3ltYm9sIGFzIHRoZSBOZ01vZHVsZSdzIGVtaXQgYmVjb21lcyBkZXBlbmRlbnQgb25cbiAgICAgICAgICAvLyB0aGUgZGlyZWN0aXZlL3BpcGUgdXNhZ2VzIG9mIHRoaXMgY29tcG9uZW50LlxuICAgICAgICAgIGlmICh0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCBtb2R1bGVTeW1ib2wgPSB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLmdldFN5bWJvbChzY29wZS5uZ01vZHVsZSk7XG4gICAgICAgICAgICBpZiAoIShtb2R1bGVTeW1ib2wgaW5zdGFuY2VvZiBOZ01vZHVsZVN5bWJvbCkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgYEFzc2VydGlvbkVycm9yOiBFeHBlY3RlZCAke3Njb3BlLm5nTW9kdWxlLm5hbWV9IHRvIGJlIGFuIE5nTW9kdWxlU3ltYm9sLmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtb2R1bGVTeW1ib2wuYWRkUmVtb3RlbHlTY29wZWRDb21wb25lbnQoXG4gICAgICAgICAgICAgICAgc3ltYm9sLCBzeW1ib2wudXNlZERpcmVjdGl2ZXMsIHN5bWJvbC51c2VkUGlwZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBXZSBhcmUgbm90IGFibGUgdG8gaGFuZGxlIHRoaXMgY3ljbGUgc28gdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgY29uc3QgcmVsYXRlZE1lc3NhZ2VzOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtkaXIsIGN5Y2xlXSBvZiBjeWNsZXNGcm9tRGlyZWN0aXZlcykge1xuICAgICAgICAgICAgcmVsYXRlZE1lc3NhZ2VzLnB1c2goXG4gICAgICAgICAgICAgICAgbWFrZUN5Y2xpY0ltcG9ydEluZm8oZGlyLnJlZiwgZGlyLmlzQ29tcG9uZW50ID8gJ2NvbXBvbmVudCcgOiAnZGlyZWN0aXZlJywgY3ljbGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBbcGlwZSwgY3ljbGVdIG9mIGN5Y2xlc0Zyb21QaXBlcykge1xuICAgICAgICAgICAgcmVsYXRlZE1lc3NhZ2VzLnB1c2gobWFrZUN5Y2xpY0ltcG9ydEluZm8ocGlwZS5yZWYsICdwaXBlJywgY3ljbGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuSU1QT1JUX0NZQ0xFX0RFVEVDVEVELCBub2RlLFxuICAgICAgICAgICAgICAnT25lIG9yIG1vcmUgaW1wb3J0IGN5Y2xlcyB3b3VsZCBuZWVkIHRvIGJlIGNyZWF0ZWQgdG8gY29tcGlsZSB0aGlzIGNvbXBvbmVudCwgJyArXG4gICAgICAgICAgICAgICAgICAnd2hpY2ggaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgY3VycmVudCBjb21waWxlciBjb25maWd1cmF0aW9uLicsXG4gICAgICAgICAgICAgIHJlbGF0ZWRNZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICBpZiAoYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSAhPT0gbnVsbCAmJlxuICAgICAgICBhbmFseXNpcy5tZXRhLnByb3ZpZGVycyBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcikge1xuICAgICAgY29uc3QgcHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMhLm5vZGUsXG4gICAgICAgICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5wcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoYW5hbHlzaXMudmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgIT09IG51bGwgJiZcbiAgICAgICAgYW5hbHlzaXMubWV0YS52aWV3UHJvdmlkZXJzIGluc3RhbmNlb2YgV3JhcHBlZE5vZGVFeHByKSB7XG4gICAgICBjb25zdCB2aWV3UHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMudmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIGFuYWx5c2lzLm1ldGEudmlld1Byb3ZpZGVycyEubm9kZSxcbiAgICAgICAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeSk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnZpZXdQcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVEaWFnbm9zdGljcyA9IGdldERpcmVjdGl2ZURpYWdub3N0aWNzKFxuICAgICAgICBub2RlLCB0aGlzLm1ldGFSZWFkZXIsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCAnQ29tcG9uZW50Jyk7XG4gICAgaWYgKGRpcmVjdGl2ZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmRpcmVjdGl2ZURpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtkaWFnbm9zdGljc307XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkYXRhfTtcbiAgfVxuXG4gIHVwZGF0ZVJlc291cmNlcyhub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogQ29tcG9uZW50QW5hbHlzaXNEYXRhKTogdm9pZCB7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcblxuICAgIC8vIElmIHRoZSB0ZW1wbGF0ZSBpcyBleHRlcm5hbCwgcmUtcGFyc2UgaXQuXG4gICAgY29uc3QgdGVtcGxhdGVEZWNsID0gYW5hbHlzaXMudGVtcGxhdGUuZGVjbGFyYXRpb247XG4gICAgaWYgKCF0ZW1wbGF0ZURlY2wuaXNJbmxpbmUpIHtcbiAgICAgIGFuYWx5c2lzLnRlbXBsYXRlID0gdGhpcy5leHRyYWN0VGVtcGxhdGUobm9kZSwgdGVtcGxhdGVEZWNsKTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgYW55IGV4dGVybmFsIHN0eWxlc2hlZXRzIGFuZCByZWJ1aWxkIHRoZSBjb21iaW5lZCAnc3R5bGVzJyBsaXN0LlxuICAgIC8vIFRPRE8oYWx4aHViKTogd3JpdGUgdGVzdHMgZm9yIHN0eWxlcyB3aGVuIHRoZSBwcmltYXJ5IGNvbXBpbGVyIHVzZXMgdGhlIHVwZGF0ZVJlc291cmNlcyBwYXRoXG4gICAgbGV0IHN0eWxlczogc3RyaW5nW10gPSBbXTtcbiAgICBpZiAoYW5hbHlzaXMuc3R5bGVVcmxzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IHN0eWxlVXJsIG9mIGFuYWx5c2lzLnN0eWxlVXJscykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkU3R5bGVVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUoc3R5bGVVcmwudXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgICAgY29uc3Qgc3R5bGVUZXh0ID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHJlc29sdmVkU3R5bGVVcmwpO1xuICAgICAgICAgIHN0eWxlcy5wdXNoKHN0eWxlVGV4dCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBSZXNvdXJjZSByZXNvbHZlIGZhaWx1cmVzIHNob3VsZCBhbHJlYWR5IGJlIGluIHRoZSBkaWFnbm9zdGljcyBsaXN0IGZyb20gdGhlIGFuYWx5emVcbiAgICAgICAgICAvLyBzdGFnZS4gV2UgZG8gbm90IG5lZWQgdG8gZG8gYW55dGhpbmcgd2l0aCB0aGVtIHdoZW4gdXBkYXRpbmcgcmVzb3VyY2VzLlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChhbmFseXNpcy5pbmxpbmVTdHlsZXMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3Qgc3R5bGVUZXh0IG9mIGFuYWx5c2lzLmlubGluZVN0eWxlcykge1xuICAgICAgICBzdHlsZXMucHVzaChzdHlsZVRleHQpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IHN0eWxlVGV4dCBvZiBhbmFseXNpcy50ZW1wbGF0ZS5zdHlsZXMpIHtcbiAgICAgIHN0eWxlcy5wdXNoKHN0eWxlVGV4dCk7XG4gICAgfVxuXG4gICAgYW5hbHlzaXMubWV0YS5zdHlsZXMgPSBzdHlsZXM7XG4gIH1cblxuICBjb21waWxlRnVsbChcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8Q29tcG9uZW50UmVzb2x1dGlvbkRhdGE+LCBwb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGlmIChhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMgIT09IG51bGwgJiYgYW5hbHlzaXMudGVtcGxhdGUuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgbWV0YTogUjNDb21wb25lbnRNZXRhZGF0YSA9IHsuLi5hbmFseXNpcy5tZXRhLCAuLi5yZXNvbHV0aW9ufTtcbiAgICBjb25zdCBmYWMgPSBjb21waWxlTmdGYWN0b3J5RGVmRmllbGQodG9GYWN0b3J5TWV0YWRhdGEobWV0YSwgRmFjdG9yeVRhcmdldC5Db21wb25lbnQpKTtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhKG1ldGEsIHBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyKCkpO1xuICAgIGNvbnN0IGNsYXNzTWV0YWRhdGEgPSBhbmFseXNpcy5jbGFzc01ldGFkYXRhICE9PSBudWxsID9cbiAgICAgICAgY29tcGlsZUNsYXNzTWV0YWRhdGEoYW5hbHlzaXMuY2xhc3NNZXRhZGF0YSkudG9TdG10KCkgOlxuICAgICAgICBudWxsO1xuICAgIHJldHVybiBjb21waWxlUmVzdWx0cyhmYWMsIGRlZiwgY2xhc3NNZXRhZGF0YSwgJ8m1Y21wJyk7XG4gIH1cblxuICBjb21waWxlUGFydGlhbChcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8Q29tcG9uZW50UmVzb2x1dGlvbkRhdGE+KTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBpZiAoYW5hbHlzaXMudGVtcGxhdGUuZXJyb3JzICE9PSBudWxsICYmIGFuYWx5c2lzLnRlbXBsYXRlLmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlSW5mbzogRGVjbGFyZUNvbXBvbmVudFRlbXBsYXRlSW5mbyA9IHtcbiAgICAgIGNvbnRlbnQ6IGFuYWx5c2lzLnRlbXBsYXRlLmNvbnRlbnQsXG4gICAgICBzb3VyY2VVcmw6IGFuYWx5c2lzLnRlbXBsYXRlLmRlY2xhcmF0aW9uLnJlc29sdmVkVGVtcGxhdGVVcmwsXG4gICAgICBpc0lubGluZTogYW5hbHlzaXMudGVtcGxhdGUuZGVjbGFyYXRpb24uaXNJbmxpbmUsXG4gICAgICBpbmxpbmVUZW1wbGF0ZUxpdGVyYWxFeHByZXNzaW9uOiBhbmFseXNpcy50ZW1wbGF0ZS5zb3VyY2VNYXBwaW5nLnR5cGUgPT09ICdkaXJlY3QnID9cbiAgICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGFuYWx5c2lzLnRlbXBsYXRlLnNvdXJjZU1hcHBpbmcubm9kZSkgOlxuICAgICAgICAgIG51bGwsXG4gICAgfTtcbiAgICBjb25zdCBtZXRhOiBSM0NvbXBvbmVudE1ldGFkYXRhID0gey4uLmFuYWx5c2lzLm1ldGEsIC4uLnJlc29sdXRpb259O1xuICAgIGNvbnN0IGZhYyA9IGNvbXBpbGVEZWNsYXJlRmFjdG9yeSh0b0ZhY3RvcnlNZXRhZGF0YShtZXRhLCBGYWN0b3J5VGFyZ2V0LkNvbXBvbmVudCkpO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVEZWNsYXJlQ29tcG9uZW50RnJvbU1ldGFkYXRhKG1ldGEsIGFuYWx5c2lzLnRlbXBsYXRlLCB0ZW1wbGF0ZUluZm8pO1xuICAgIGNvbnN0IGNsYXNzTWV0YWRhdGEgPSBhbmFseXNpcy5jbGFzc01ldGFkYXRhICE9PSBudWxsID9cbiAgICAgICAgY29tcGlsZURlY2xhcmVDbGFzc01ldGFkYXRhKGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEpLnRvU3RtdCgpIDpcbiAgICAgICAgbnVsbDtcbiAgICByZXR1cm4gY29tcGlsZVJlc3VsdHMoZmFjLCBkZWYsIGNsYXNzTWV0YWRhdGEsICfJtWNtcCcpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgaWYgKHRoaXMubGl0ZXJhbENhY2hlLmhhcyhkZWNvcmF0b3IpKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXRlcmFsQ2FjaGUuZ2V0KGRlY29yYXRvcikhO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQ29tcG9uZW50IGRlY29yYXRvcmApO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSwgYERlY29yYXRvciBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuc2V0KGRlY29yYXRvciwgbWV0YSk7XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlRW51bVZhbHVlKFxuICAgICAgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZW51bVN5bWJvbE5hbWU6IHN0cmluZyk6IG51bWJlcnxudWxsIHtcbiAgICBsZXQgcmVzb2x2ZWQ6IG51bWJlcnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcyhmaWVsZCkpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KGZpZWxkKSE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpIGFzIGFueTtcbiAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVudW1WYWx1ZSAmJiBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHZhbHVlLmVudW1SZWYsIGVudW1TeW1ib2xOYW1lKSkge1xuICAgICAgICByZXNvbHZlZCA9IHZhbHVlLnJlc29sdmVkIGFzIG51bWJlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBleHByLCB2YWx1ZSwgYCR7ZmllbGR9IG11c3QgYmUgYSBtZW1iZXIgb2YgJHtlbnVtU3ltYm9sTmFtZX0gZW51bSBmcm9tIEBhbmd1bGFyL2NvcmVgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc29sdmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdENvbXBvbmVudFN0eWxlVXJscyhcbiAgICAgIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICApOiBTdHlsZVVybE1ldGFbXSB7XG4gICAgaWYgKCFjb21wb25lbnQuaGFzKCdzdHlsZVVybHMnKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9leHRyYWN0U3R5bGVVcmxzRnJvbUV4cHJlc3Npb24oY29tcG9uZW50LmdldCgnc3R5bGVVcmxzJykhKTtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RTdHlsZVVybHNGcm9tRXhwcmVzc2lvbihzdHlsZVVybHNFeHByOiB0cy5FeHByZXNzaW9uKTogU3R5bGVVcmxNZXRhW10ge1xuICAgIGNvbnN0IHN0eWxlVXJsczogU3R5bGVVcmxNZXRhW10gPSBbXTtcblxuICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVVcmxzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3Qgc3R5bGVVcmxFeHByIG9mIHN0eWxlVXJsc0V4cHIuZWxlbWVudHMpIHtcbiAgICAgICAgaWYgKHRzLmlzU3ByZWFkRWxlbWVudChzdHlsZVVybEV4cHIpKSB7XG4gICAgICAgICAgc3R5bGVVcmxzLnB1c2goLi4udGhpcy5fZXh0cmFjdFN0eWxlVXJsc0Zyb21FeHByZXNzaW9uKHN0eWxlVXJsRXhwci5leHByZXNzaW9uKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3Qgc3R5bGVVcmwgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShzdHlsZVVybEV4cHIpO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiBzdHlsZVVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3Ioc3R5bGVVcmxFeHByLCBzdHlsZVVybCwgJ3N0eWxlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHlsZVVybHMucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHN0eWxlVXJsLFxuICAgICAgICAgICAgc291cmNlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcixcbiAgICAgICAgICAgIG5vZGVGb3JFcnJvcjogc3R5bGVVcmxFeHByLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGV2YWx1YXRlZFN0eWxlVXJscyA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHN0eWxlVXJsc0V4cHIpO1xuICAgICAgaWYgKCFpc1N0cmluZ0FycmF5KGV2YWx1YXRlZFN0eWxlVXJscykpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIHN0eWxlVXJsc0V4cHIsIGV2YWx1YXRlZFN0eWxlVXJscywgJ3N0eWxlVXJscyBtdXN0IGJlIGFuIGFycmF5IG9mIHN0cmluZ3MnKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBzdHlsZVVybCBvZiBldmFsdWF0ZWRTdHlsZVVybHMpIHtcbiAgICAgICAgc3R5bGVVcmxzLnB1c2goe1xuICAgICAgICAgIHVybDogc3R5bGVVcmwsXG4gICAgICAgICAgc291cmNlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcixcbiAgICAgICAgICBub2RlRm9yRXJyb3I6IHN0eWxlVXJsc0V4cHIsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdHlsZVVybHM7XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0U3R5bGVSZXNvdXJjZXMoY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6XG4gICAgICBSZWFkb25seVNldDxSZXNvdXJjZT4ge1xuICAgIGNvbnN0IHN0eWxlcyA9IG5ldyBTZXQ8UmVzb3VyY2U+KCk7XG4gICAgZnVuY3Rpb24gc3RyaW5nTGl0ZXJhbEVsZW1lbnRzKGFycmF5OiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uKTogdHMuU3RyaW5nTGl0ZXJhbExpa2VbXSB7XG4gICAgICByZXR1cm4gYXJyYXkuZWxlbWVudHMuZmlsdGVyKFxuICAgICAgICAgIChlOiB0cy5FeHByZXNzaW9uKTogZSBpcyB0cy5TdHJpbmdMaXRlcmFsTGlrZSA9PiB0cy5pc1N0cmluZ0xpdGVyYWxMaWtlKGUpKTtcbiAgICB9XG5cbiAgICAvLyBJZiBzdHlsZVVybHMgaXMgYSBsaXRlcmFsIGFycmF5LCBwcm9jZXNzIGVhY2ggcmVzb3VyY2UgdXJsIGluZGl2aWR1YWxseSBhbmRcbiAgICAvLyByZWdpc3RlciBvbmVzIHRoYXQgYXJlIHN0cmluZyBsaXRlcmFscy5cbiAgICBjb25zdCBzdHlsZVVybHNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVVcmxzJyk7XG4gICAgaWYgKHN0eWxlVXJsc0V4cHIgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVVcmxzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3QgZXhwcmVzc2lvbiBvZiBzdHJpbmdMaXRlcmFsRWxlbWVudHMoc3R5bGVVcmxzRXhwcikpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShleHByZXNzaW9uLnRleHQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgICBzdHlsZXMuYWRkKHtwYXRoOiBhYnNvbHV0ZUZyb20ocmVzb3VyY2VVcmwpLCBleHByZXNzaW9ufSk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIEVycm9ycyBpbiBzdHlsZSByZXNvdXJjZSBleHRyYWN0aW9uIGRvIG5vdCBuZWVkIHRvIGJlIGhhbmRsZWQgaGVyZS4gV2Ugd2lsbCBwcm9kdWNlXG4gICAgICAgICAgLy8gZGlhZ25vc3RpY3MgZm9yIGVhY2ggb25lIHRoYXQgZmFpbHMgaW4gdGhlIGFuYWx5c2lzLCBhZnRlciB3ZSBldmFsdWF0ZSB0aGUgYHN0eWxlVXJsc2BcbiAgICAgICAgICAvLyBleHByZXNzaW9uIHRvIGRldGVybWluZSBfYWxsXyBzdHlsZSByZXNvdXJjZXMsIG5vdCBqdXN0IHRoZSBzdHJpbmcgbGl0ZXJhbHMuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZXNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVzJyk7XG4gICAgaWYgKHN0eWxlc0V4cHIgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3QgZXhwcmVzc2lvbiBvZiBzdHJpbmdMaXRlcmFsRWxlbWVudHMoc3R5bGVzRXhwcikpIHtcbiAgICAgICAgc3R5bGVzLmFkZCh7cGF0aDogbnVsbCwgZXhwcmVzc2lvbn0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdHlsZXM7XG4gIH1cblxuICBwcml2YXRlIF9wcmVsb2FkQW5kUGFyc2VUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICAgICAgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IFByb21pc2U8UGFyc2VkVGVtcGxhdGVXaXRoU291cmNlfG51bGw+IHtcbiAgICBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGVVcmwnKSkge1xuICAgICAgLy8gRXh0cmFjdCB0aGUgdGVtcGxhdGVVcmwgYW5kIHByZWxvYWQgaXQuXG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybEV4cHIsIHRlbXBsYXRlVXJsLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVQcm9taXNlID1cbiAgICAgICAgICAgIHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCwge3R5cGU6ICd0ZW1wbGF0ZScsIGNvbnRhaW5pbmdGaWxlfSk7XG5cbiAgICAgICAgLy8gSWYgdGhlIHByZWxvYWQgd29ya2VkLCB0aGVuIGFjdHVhbGx5IGxvYWQgYW5kIHBhcnNlIHRoZSB0ZW1wbGF0ZSwgYW5kIHdhaXQgZm9yIGFueSBzdHlsZVxuICAgICAgICAvLyBVUkxzIHRvIHJlc29sdmUuXG4gICAgICAgIGlmICh0ZW1wbGF0ZVByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiB0ZW1wbGF0ZVByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPVxuICAgICAgICAgICAgICAgIHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgICAgICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyB0aGlzLm1ha2VSZXNvdXJjZU5vdEZvdW5kRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybCwgdGVtcGxhdGVVcmxFeHByLCBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5UZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlRGVjbCA9IHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRlbXBsYXRlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RUZW1wbGF0ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCB0ZW1wbGF0ZTogVGVtcGxhdGVEZWNsYXJhdGlvbik6XG4gICAgICBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2Uge1xuICAgIGlmICh0ZW1wbGF0ZS5pc0lubGluZSkge1xuICAgICAgbGV0IHNvdXJjZVN0cjogc3RyaW5nO1xuICAgICAgbGV0IHNvdXJjZVBhcnNlUmFuZ2U6IExleGVyUmFuZ2V8bnVsbCA9IG51bGw7XG4gICAgICBsZXQgdGVtcGxhdGVDb250ZW50OiBzdHJpbmc7XG4gICAgICBsZXQgc291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuICAgICAgbGV0IGVzY2FwZWRTdHJpbmcgPSBmYWxzZTtcbiAgICAgIGxldCBzb3VyY2VNYXBVcmw6IHN0cmluZ3xudWxsO1xuICAgICAgLy8gV2Ugb25seSBzdXBwb3J0IFNvdXJjZU1hcHMgZm9yIGlubGluZSB0ZW1wbGF0ZXMgdGhhdCBhcmUgc2ltcGxlIHN0cmluZyBsaXRlcmFscy5cbiAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwodGVtcGxhdGUuZXhwcmVzc2lvbikgfHxcbiAgICAgICAgICB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKHRlbXBsYXRlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIC8vIHRoZSBzdGFydCBhbmQgZW5kIG9mIHRoZSBgdGVtcGxhdGVFeHByYCBub2RlIGluY2x1ZGVzIHRoZSBxdW90YXRpb24gbWFya3MsIHdoaWNoIHdlIG11c3RcbiAgICAgICAgLy8gc3RyaXBcbiAgICAgICAgc291cmNlUGFyc2VSYW5nZSA9IGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGUuZXhwcmVzc2lvbik7XG4gICAgICAgIHNvdXJjZVN0ciA9IHRlbXBsYXRlLmV4cHJlc3Npb24uZ2V0U291cmNlRmlsZSgpLnRleHQ7XG4gICAgICAgIHRlbXBsYXRlQ29udGVudCA9IHRlbXBsYXRlLmV4cHJlc3Npb24udGV4dDtcbiAgICAgICAgZXNjYXBlZFN0cmluZyA9IHRydWU7XG4gICAgICAgIHNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgICAgdHlwZTogJ2RpcmVjdCcsXG4gICAgICAgICAgbm9kZTogdGVtcGxhdGUuZXhwcmVzc2lvbixcbiAgICAgICAgfTtcbiAgICAgICAgc291cmNlTWFwVXJsID0gdGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkVGVtcGxhdGUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZS5leHByZXNzaW9uKTtcbiAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZFRlbXBsYXRlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIHRlbXBsYXRlLmV4cHJlc3Npb24sIHJlc29sdmVkVGVtcGxhdGUsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgZG8gbm90IHBhcnNlIHRoZSB0ZW1wbGF0ZSBkaXJlY3RseSBmcm9tIHRoZSBzb3VyY2UgZmlsZSB1c2luZyBhIGxleGVyIHJhbmdlLCBzb1xuICAgICAgICAvLyB0aGUgdGVtcGxhdGUgc291cmNlIGFuZCBjb250ZW50IGFyZSBzZXQgdG8gdGhlIHN0YXRpY2FsbHkgcmVzb2x2ZWQgdGVtcGxhdGUuXG4gICAgICAgIHNvdXJjZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgICAgIHRlbXBsYXRlQ29udGVudCA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgICAgIHNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgICAgdHlwZTogJ2luZGlyZWN0JyxcbiAgICAgICAgICBub2RlOiB0ZW1wbGF0ZS5leHByZXNzaW9uLFxuICAgICAgICAgIGNvbXBvbmVudENsYXNzOiBub2RlLFxuICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZUNvbnRlbnQsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW5kaXJlY3QgdGVtcGxhdGVzIGNhbm5vdCBiZSBtYXBwZWQgdG8gYSBwYXJ0aWN1bGFyIGJ5dGUgcmFuZ2Ugb2YgYW55IGlucHV0IGZpbGUsIHNpbmNlXG4gICAgICAgIC8vIHRoZXkncmUgY29tcHV0ZWQgYnkgZXhwcmVzc2lvbnMgdGhhdCBtYXkgc3BhbiBtYW55IGZpbGVzLiBEb24ndCBhdHRlbXB0IHRvIG1hcCB0aGVtIGJhY2tcbiAgICAgICAgLy8gdG8gYSBnaXZlbiBmaWxlLlxuICAgICAgICBzb3VyY2VNYXBVcmwgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi50aGlzLl9wYXJzZVRlbXBsYXRlKHRlbXBsYXRlLCBzb3VyY2VTdHIsIHNvdXJjZVBhcnNlUmFuZ2UsIGVzY2FwZWRTdHJpbmcsIHNvdXJjZU1hcFVybCksXG4gICAgICAgIGNvbnRlbnQ6IHRlbXBsYXRlQ29udGVudCxcbiAgICAgICAgc291cmNlTWFwcGluZyxcbiAgICAgICAgZGVjbGFyYXRpb246IHRlbXBsYXRlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGVDb250ZW50ID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHRlbXBsYXRlLnJlc29sdmVkVGVtcGxhdGVVcmwpO1xuICAgICAgaWYgKHRoaXMuZGVwVHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmRlcFRyYWNrZXIuYWRkUmVzb3VyY2VEZXBlbmRlbmN5KFxuICAgICAgICAgICAgbm9kZS5nZXRTb3VyY2VGaWxlKCksIGFic29sdXRlRnJvbSh0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLnRoaXMuX3BhcnNlVGVtcGxhdGUoXG4gICAgICAgICAgICB0ZW1wbGF0ZSwgLyogc291cmNlU3RyICovIHRlbXBsYXRlQ29udGVudCwgLyogc291cmNlUGFyc2VSYW5nZSAqLyBudWxsLFxuICAgICAgICAgICAgLyogZXNjYXBlZFN0cmluZyAqLyBmYWxzZSxcbiAgICAgICAgICAgIC8qIHNvdXJjZU1hcFVybCAqLyB0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsKSxcbiAgICAgICAgY29udGVudDogdGVtcGxhdGVDb250ZW50LFxuICAgICAgICBzb3VyY2VNYXBwaW5nOiB7XG4gICAgICAgICAgdHlwZTogJ2V4dGVybmFsJyxcbiAgICAgICAgICBjb21wb25lbnRDbGFzczogbm9kZSxcbiAgICAgICAgICAvLyBUT0RPKGFseGh1Yik6IFRTIGluIGczIGlzIHVuYWJsZSB0byBtYWtlIHRoaXMgaW5mZXJlbmNlIG9uIGl0cyBvd24sIHNvIGNhc3QgaXQgaGVyZVxuICAgICAgICAgIC8vIHVudGlsIGczIGlzIGFibGUgdG8gZmlndXJlIHRoaXMgb3V0LlxuICAgICAgICAgIG5vZGU6ICh0ZW1wbGF0ZSBhcyBFeHRlcm5hbFRlbXBsYXRlRGVjbGFyYXRpb24pLnRlbXBsYXRlVXJsRXhwcmVzc2lvbixcbiAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVDb250ZW50LFxuICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsLFxuICAgICAgICB9LFxuICAgICAgICBkZWNsYXJhdGlvbjogdGVtcGxhdGUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3BhcnNlVGVtcGxhdGUoXG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGVEZWNsYXJhdGlvbiwgc291cmNlU3RyOiBzdHJpbmcsIHNvdXJjZVBhcnNlUmFuZ2U6IExleGVyUmFuZ2V8bnVsbCxcbiAgICAgIGVzY2FwZWRTdHJpbmc6IGJvb2xlYW4sIHNvdXJjZU1hcFVybDogc3RyaW5nfG51bGwpOiBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSB7XG4gICAgLy8gV2UgYWx3YXlzIG5vcm1hbGl6ZSBsaW5lIGVuZGluZ3MgaWYgdGhlIHRlbXBsYXRlIGhhcyBiZWVuIGVzY2FwZWQgKGkuZS4gaXMgaW5saW5lKS5cbiAgICBjb25zdCBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgPSBlc2NhcGVkU3RyaW5nIHx8IHRoaXMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzO1xuXG4gICAgY29uc3QgcGFyc2VkVGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKHNvdXJjZVN0ciwgc291cmNlTWFwVXJsID8/ICcnLCB7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0ZW1wbGF0ZS5wcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZzogdGVtcGxhdGUuaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgIHJhbmdlOiBzb3VyY2VQYXJzZVJhbmdlID8/IHVuZGVmaW5lZCxcbiAgICAgIGVzY2FwZWRTdHJpbmcsXG4gICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiB0aGlzLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMsXG4gICAgICBhbHdheXNBdHRlbXB0SHRtbFRvUjNBc3RDb252ZXJzaW9uOiB0aGlzLnVzZVBvaXNvbmVkRGF0YSxcbiAgICB9KTtcblxuICAgIC8vIFVuZm9ydHVuYXRlbHksIHRoZSBwcmltYXJ5IHBhcnNlIG9mIHRoZSB0ZW1wbGF0ZSBhYm92ZSBtYXkgbm90IGNvbnRhaW4gYWNjdXJhdGUgc291cmNlIG1hcFxuICAgIC8vIGluZm9ybWF0aW9uLiBJZiB1c2VkIGRpcmVjdGx5LCBpdCB3b3VsZCByZXN1bHQgaW4gaW5jb3JyZWN0IGNvZGUgbG9jYXRpb25zIGluIHRlbXBsYXRlXG4gICAgLy8gZXJyb3JzLCBldGMuIFRoZXJlIGFyZSB0aHJlZSBtYWluIHByb2JsZW1zOlxuICAgIC8vXG4gICAgLy8gMS4gYHByZXNlcnZlV2hpdGVzcGFjZXM6IGZhbHNlYCBhbm5paGlsYXRlcyB0aGUgY29ycmVjdG5lc3Mgb2YgdGVtcGxhdGUgc291cmNlIG1hcHBpbmcsIGFzXG4gICAgLy8gICAgdGhlIHdoaXRlc3BhY2UgdHJhbnNmb3JtYXRpb24gY2hhbmdlcyB0aGUgY29udGVudHMgb2YgSFRNTCB0ZXh0IG5vZGVzIGJlZm9yZSB0aGV5J3JlXG4gICAgLy8gICAgcGFyc2VkIGludG8gQW5ndWxhciBleHByZXNzaW9ucy5cbiAgICAvLyAyLiBgcHJlc2VydmVMaW5lRW5kaW5nczogZmFsc2VgIGNhdXNlcyBncm93aW5nIG1pc2FsaWdubWVudHMgaW4gdGVtcGxhdGVzIHRoYXQgdXNlICdcXHJcXG4nXG4gICAgLy8gICAgbGluZSBlbmRpbmdzLCBieSBub3JtYWxpemluZyB0aGVtIHRvICdcXG4nLlxuICAgIC8vIDMuIEJ5IGRlZmF1bHQsIHRoZSB0ZW1wbGF0ZSBwYXJzZXIgc3RyaXBzIGxlYWRpbmcgdHJpdmlhIGNoYXJhY3RlcnMgKGxpa2Ugc3BhY2VzLCB0YWJzLCBhbmRcbiAgICAvLyAgICBuZXdsaW5lcykuIFRoaXMgYWxzbyBkZXN0cm95cyBzb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbi5cbiAgICAvL1xuICAgIC8vIEluIG9yZGVyIHRvIGd1YXJhbnRlZSB0aGUgY29ycmVjdG5lc3Mgb2YgZGlhZ25vc3RpY3MsIHRlbXBsYXRlcyBhcmUgcGFyc2VkIGEgc2Vjb25kIHRpbWVcbiAgICAvLyB3aXRoIHRoZSBhYm92ZSBvcHRpb25zIHNldCB0byBwcmVzZXJ2ZSBzb3VyY2UgbWFwcGluZ3MuXG5cbiAgICBjb25zdCB7bm9kZXM6IGRpYWdOb2Rlc30gPSBwYXJzZVRlbXBsYXRlKHNvdXJjZVN0ciwgc291cmNlTWFwVXJsID8/ICcnLCB7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgcHJlc2VydmVMaW5lRW5kaW5nczogdHJ1ZSxcbiAgICAgIGludGVycG9sYXRpb25Db25maWc6IHRlbXBsYXRlLmludGVycG9sYXRpb25Db25maWcsXG4gICAgICByYW5nZTogc291cmNlUGFyc2VSYW5nZSA/PyB1bmRlZmluZWQsXG4gICAgICBlc2NhcGVkU3RyaW5nLFxuICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogdGhpcy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgICAgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICAgIGFsd2F5c0F0dGVtcHRIdG1sVG9SM0FzdENvbnZlcnNpb246IHRoaXMudXNlUG9pc29uZWREYXRhLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnBhcnNlZFRlbXBsYXRlLFxuICAgICAgZGlhZ05vZGVzLFxuICAgICAgZmlsZTogbmV3IFBhcnNlU291cmNlRmlsZShzb3VyY2VTdHIsIHNvdXJjZU1hcFVybCA/PyAnJyksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKFxuICAgICAgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICBjb250YWluaW5nRmlsZTogc3RyaW5nKTogVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gICAgbGV0IHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4gPSB0aGlzLmRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHZhbHVlLCAncHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IGJlIGEgYm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyA9IHZhbHVlO1xuICAgIH1cblxuICAgIGxldCBpbnRlcnBvbGF0aW9uQ29uZmlnID0gREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRztcbiAgICBpZiAoY29tcG9uZW50LmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgnaW50ZXJwb2xhdGlvbicpITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlLmxlbmd0aCAhPT0gMiB8fFxuICAgICAgICAgICF2YWx1ZS5ldmVyeShlbGVtZW50ID0+IHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGV4cHIsIHZhbHVlLCAnaW50ZXJwb2xhdGlvbiBtdXN0IGJlIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cyBvZiBzdHJpbmcgdHlwZScpO1xuICAgICAgfVxuICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyA9IEludGVycG9sYXRpb25Db25maWcuZnJvbUFycmF5KHZhbHVlIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xuICAgIH1cblxuICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybEV4cHIsIHRlbXBsYXRlVXJsLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpc0lubGluZTogZmFsc2UsXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICAgIHRlbXBsYXRlVXJsLFxuICAgICAgICAgIHRlbXBsYXRlVXJsRXhwcmVzc2lvbjogdGVtcGxhdGVVcmxFeHByLFxuICAgICAgICAgIHJlc29sdmVkVGVtcGxhdGVVcmw6IHJlc291cmNlVXJsLFxuICAgICAgICB9O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyB0aGlzLm1ha2VSZXNvdXJjZU5vdEZvdW5kRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybCwgdGVtcGxhdGVVcmxFeHByLCBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5UZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc0lubGluZTogdHJ1ZSxcbiAgICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyxcbiAgICAgICAgZXhwcmVzc2lvbjogY29tcG9uZW50LmdldCgndGVtcGxhdGUnKSEsXG4gICAgICAgIHRlbXBsYXRlVXJsOiBjb250YWluaW5nRmlsZSxcbiAgICAgICAgcmVzb2x2ZWRUZW1wbGF0ZVVybDogY29udGFpbmluZ0ZpbGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9NSVNTSU5HX1RFTVBMQVRFLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgJ2NvbXBvbmVudCBpcyBtaXNzaW5nIGEgdGVtcGxhdGUnKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlSW1wb3J0ZWRGaWxlKGltcG9ydGVkRmlsZTogSW1wb3J0ZWRGaWxlLCBleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICAvLyBJZiBgaW1wb3J0ZWRGaWxlYCBpcyBub3QgJ3Vua25vd24nIHRoZW4gaXQgYWNjdXJhdGVseSByZWZsZWN0cyB0aGUgc291cmNlIGZpbGUgdGhhdCBpc1xuICAgIC8vIGJlaW5nIGltcG9ydGVkLlxuICAgIGlmIChpbXBvcnRlZEZpbGUgIT09ICd1bmtub3duJykge1xuICAgICAgcmV0dXJuIGltcG9ydGVkRmlsZTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgYGV4cHJgIGhhcyB0byBiZSBpbnNwZWN0ZWQgdG8gZGV0ZXJtaW5lIHRoZSBmaWxlIHRoYXQgaXMgYmVpbmcgaW1wb3J0ZWQuIElmIGBleHByYFxuICAgIC8vIGlzIG5vdCBhbiBgRXh0ZXJuYWxFeHByYCB0aGVuIGl0IGRvZXMgbm90IGNvcnJlc3BvbmQgd2l0aCBhbiBpbXBvcnQsIHNvIHJldHVybiBudWxsIGluIHRoYXRcbiAgICAvLyBjYXNlLlxuICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBGaWd1cmUgb3V0IHdoYXQgZmlsZSBpcyBiZWluZyBpbXBvcnRlZC5cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlKGV4cHIudmFsdWUubW9kdWxlTmFtZSEsIG9yaWdpbi5maWxlTmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhZGRpbmcgYW4gaW1wb3J0IGZyb20gYG9yaWdpbmAgdG8gdGhlIHNvdXJjZS1maWxlIGNvcnJlc3BvbmRpbmcgdG8gYGV4cHJgIHdvdWxkXG4gICAqIGNyZWF0ZSBhIGN5Y2xpYyBpbXBvcnQuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgYEN5Y2xlYCBvYmplY3QgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLCBvdGhlcndpc2UgYG51bGxgLlxuICAgKi9cbiAgcHJpdmF0ZSBfY2hlY2tGb3JDeWNsaWNJbXBvcnQoXG4gICAgICBpbXBvcnRlZEZpbGU6IEltcG9ydGVkRmlsZSwgZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogQ3ljbGV8bnVsbCB7XG4gICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLl9yZXNvbHZlSW1wb3J0ZWRGaWxlKGltcG9ydGVkRmlsZSwgZXhwciwgb3JpZ2luKTtcbiAgICBpZiAoaW1wb3J0ZWQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSBpbXBvcnQgaXMgbGVnYWwuXG4gICAgcmV0dXJuIHRoaXMuY3ljbGVBbmFseXplci53b3VsZENyZWF0ZUN5Y2xlKG9yaWdpbiwgaW1wb3J0ZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVjb3JkU3ludGhldGljSW1wb3J0KFxuICAgICAgaW1wb3J0ZWRGaWxlOiBJbXBvcnRlZEZpbGUsIGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGltcG9ydGVkID0gdGhpcy5fcmVzb2x2ZUltcG9ydGVkRmlsZShpbXBvcnRlZEZpbGUsIGV4cHIsIG9yaWdpbik7XG4gICAgaWYgKGltcG9ydGVkID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jeWNsZUFuYWx5emVyLnJlY29yZFN5bnRoZXRpY0ltcG9ydChvcmlnaW4sIGltcG9ydGVkKTtcbiAgfVxuXG4gIHByaXZhdGUgbWFrZVJlc291cmNlTm90Rm91bmRFcnJvcihcbiAgICAgIGZpbGU6IHN0cmluZywgbm9kZUZvckVycm9yOiB0cy5Ob2RlLFxuICAgICAgcmVzb3VyY2VUeXBlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcyk6IEZhdGFsRGlhZ25vc3RpY0Vycm9yIHtcbiAgICBsZXQgZXJyb3JUZXh0OiBzdHJpbmc7XG4gICAgc3dpdGNoIChyZXNvdXJjZVR5cGUpIHtcbiAgICAgIGNhc2UgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuVGVtcGxhdGU6XG4gICAgICAgIGVycm9yVGV4dCA9IGBDb3VsZCBub3QgZmluZCB0ZW1wbGF0ZSBmaWxlICcke2ZpbGV9Jy5gO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZTpcbiAgICAgICAgZXJyb3JUZXh0ID0gYENvdWxkIG5vdCBmaW5kIHN0eWxlc2hlZXQgZmlsZSAnJHtmaWxlfScgbGlua2VkIGZyb20gdGhlIHRlbXBsYXRlLmA7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcjpcbiAgICAgICAgZXJyb3JUZXh0ID0gYENvdWxkIG5vdCBmaW5kIHN0eWxlc2hlZXQgZmlsZSAnJHtmaWxlfScuYDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9SRVNPVVJDRV9OT1RfRk9VTkQsIG5vZGVGb3JFcnJvciwgZXJyb3JUZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RUZW1wbGF0ZVN0eWxlVXJscyh0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlKTogU3R5bGVVcmxNZXRhW10ge1xuICAgIGlmICh0ZW1wbGF0ZS5zdHlsZVVybHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlRm9yRXJyb3IgPSBnZXRUZW1wbGF0ZURlY2xhcmF0aW9uTm9kZUZvckVycm9yKHRlbXBsYXRlLmRlY2xhcmF0aW9uKTtcbiAgICByZXR1cm4gdGVtcGxhdGUuc3R5bGVVcmxzLm1hcChcbiAgICAgICAgdXJsID0+ICh7dXJsLCBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGUsIG5vZGVGb3JFcnJvcn0pKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZVJhbmdlKHRlbXBsYXRlRXhwcjogdHMuRXhwcmVzc2lvbikge1xuICBjb25zdCBzdGFydFBvcyA9IHRlbXBsYXRlRXhwci5nZXRTdGFydCgpICsgMTtcbiAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPVxuICAgICAgdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24odGVtcGxhdGVFeHByLmdldFNvdXJjZUZpbGUoKSwgc3RhcnRQb3MpO1xuICByZXR1cm4ge1xuICAgIHN0YXJ0UG9zLFxuICAgIHN0YXJ0TGluZTogbGluZSxcbiAgICBzdGFydENvbDogY2hhcmFjdGVyLFxuICAgIGVuZFBvczogdGVtcGxhdGVFeHByLmdldEVuZCgpIC0gMSxcbiAgfTtcbn1cblxuLyoqIERldGVybWluZXMgaWYgdGhlIHJlc3VsdCBvZiBhbiBldmFsdWF0aW9uIGlzIGEgc3RyaW5nIGFycmF5LiAqL1xuZnVuY3Rpb24gaXNTdHJpbmdBcnJheShyZXNvbHZlZFZhbHVlOiBSZXNvbHZlZFZhbHVlKTogcmVzb2x2ZWRWYWx1ZSBpcyBzdHJpbmdbXSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHJlc29sdmVkVmFsdWUpICYmIHJlc29sdmVkVmFsdWUuZXZlcnkoZWxlbSA9PiB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycpO1xufVxuXG4vKiogRGV0ZXJtaW5lcyB0aGUgbm9kZSB0byB1c2UgZm9yIGRlYnVnZ2luZyBwdXJwb3NlcyBmb3IgdGhlIGdpdmVuIFRlbXBsYXRlRGVjbGFyYXRpb24uICovXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZURlY2xhcmF0aW9uTm9kZUZvckVycm9yKGRlY2xhcmF0aW9uOiBUZW1wbGF0ZURlY2xhcmF0aW9uKTogdHMuTm9kZSB7XG4gIC8vIFRPRE8oemFyZW5kKTogQ2hhbmdlIHRoaXMgdG8gaWYvZWxzZSB3aGVuIHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIGczLiBUaGlzIHVzZXMgYSBzd2l0Y2hcbiAgLy8gYmVjYXVzZSBpZi9lbHNlIGZhaWxzIHRvIGNvbXBpbGUgb24gZzMuIFRoYXQgaXMgYmVjYXVzZSBnMyBjb21waWxlcyB0aGlzIGluIG5vbi1zdHJpY3QgbW9kZVxuICAvLyB3aGVyZSB0eXBlIGluZmVyZW5jZSBkb2VzIG5vdCB3b3JrIGNvcnJlY3RseS5cbiAgc3dpdGNoIChkZWNsYXJhdGlvbi5pc0lubGluZSkge1xuICAgIGNhc2UgdHJ1ZTpcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbi5leHByZXNzaW9uO1xuICAgIGNhc2UgZmFsc2U6XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb24udGVtcGxhdGVVcmxFeHByZXNzaW9uO1xuICB9XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRlbXBsYXRlIHdoaWNoIHdhcyBleHRyYWN0ZWQgZHVyaW5nIHBhcnNpbmcuXG4gKlxuICogVGhpcyBjb250YWlucyB0aGUgYWN0dWFsIHBhcnNlZCB0ZW1wbGF0ZSBhcyB3ZWxsIGFzIGFueSBtZXRhZGF0YSBjb2xsZWN0ZWQgZHVyaW5nIGl0cyBwYXJzaW5nLFxuICogc29tZSBvZiB3aGljaCBtaWdodCBiZSB1c2VmdWwgZm9yIHJlLXBhcnNpbmcgdGhlIHRlbXBsYXRlIHdpdGggZGlmZmVyZW50IG9wdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkQ29tcG9uZW50VGVtcGxhdGUgZXh0ZW5kcyBQYXJzZWRUZW1wbGF0ZSB7XG4gIC8qKlxuICAgKiBUaGUgdGVtcGxhdGUgQVNULCBwYXJzZWQgaW4gYSBtYW5uZXIgd2hpY2ggcHJlc2VydmVzIHNvdXJjZSBtYXAgaW5mb3JtYXRpb24gZm9yIGRpYWdub3N0aWNzLlxuICAgKlxuICAgKiBOb3QgdXNlZnVsIGZvciBlbWl0LlxuICAgKi9cbiAgZGlhZ05vZGVzOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBUaGUgYFBhcnNlU291cmNlRmlsZWAgZm9yIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIGZpbGU6IFBhcnNlU291cmNlRmlsZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2UgZXh0ZW5kcyBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSB7XG4gIC8qKiBUaGUgc3RyaW5nIGNvbnRlbnRzIG9mIHRoZSB0ZW1wbGF0ZS4gKi9cbiAgY29udGVudDogc3RyaW5nO1xuICBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gIGRlY2xhcmF0aW9uOiBUZW1wbGF0ZURlY2xhcmF0aW9uO1xufVxuXG4vKipcbiAqIENvbW1vbiBmaWVsZHMgZXh0cmFjdGVkIGZyb20gdGhlIGRlY2xhcmF0aW9uIG9mIGEgdGVtcGxhdGUuXG4gKi9cbmludGVyZmFjZSBDb21tb25UZW1wbGF0ZURlY2xhcmF0aW9uIHtcbiAgcHJlc2VydmVXaGl0ZXNwYWNlczogYm9vbGVhbjtcbiAgaW50ZXJwb2xhdGlvbkNvbmZpZzogSW50ZXJwb2xhdGlvbkNvbmZpZztcbiAgdGVtcGxhdGVVcmw6IHN0cmluZztcbiAgcmVzb2x2ZWRUZW1wbGF0ZVVybDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNsYXJhdGlvbiBvZiBhbiBpbmxpbmUgdGVtcGxhdGUuXG4gKi9cbmludGVyZmFjZSBJbmxpbmVUZW1wbGF0ZURlY2xhcmF0aW9uIGV4dGVuZHMgQ29tbW9uVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gIGlzSW5saW5lOiB0cnVlO1xuICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNsYXJhdGlvbiBvZiBhbiBleHRlcm5hbCB0ZW1wbGF0ZS5cbiAqL1xuaW50ZXJmYWNlIEV4dGVybmFsVGVtcGxhdGVEZWNsYXJhdGlvbiBleHRlbmRzIENvbW1vblRlbXBsYXRlRGVjbGFyYXRpb24ge1xuICBpc0lubGluZTogZmFsc2U7XG4gIHRlbXBsYXRlVXJsRXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcbn1cblxuLyoqXG4gKiBUaGUgZGVjbGFyYXRpb24gb2YgYSB0ZW1wbGF0ZSBleHRyYWN0ZWQgZnJvbSBhIGNvbXBvbmVudCBkZWNvcmF0b3IuXG4gKlxuICogVGhpcyBkYXRhIGlzIGV4dHJhY3RlZCBhbmQgc3RvcmVkIHNlcGFyYXRlbHkgdG8gZmFjaWxpdGF0ZSByZS1pbnRlcnByZXRpbmcgdGhlIHRlbXBsYXRlXG4gKiBkZWNsYXJhdGlvbiB3aGVuZXZlciB0aGUgY29tcGlsZXIgaXMgbm90aWZpZWQgb2YgYSBjaGFuZ2UgdG8gYSB0ZW1wbGF0ZSBmaWxlLiBXaXRoIHRoaXNcbiAqIGluZm9ybWF0aW9uLCBgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcmAgaXMgYWJsZSB0byByZS1yZWFkIHRoZSB0ZW1wbGF0ZSBhbmQgdXBkYXRlIHRoZSBjb21wb25lbnRcbiAqIHJlY29yZCB3aXRob3V0IG5lZWRpbmcgdG8gcGFyc2UgdGhlIG9yaWdpbmFsIGRlY29yYXRvciBhZ2Fpbi5cbiAqL1xudHlwZSBUZW1wbGF0ZURlY2xhcmF0aW9uID0gSW5saW5lVGVtcGxhdGVEZWNsYXJhdGlvbnxFeHRlcm5hbFRlbXBsYXRlRGVjbGFyYXRpb247XG5cbi8qKlxuICogR2VuZXJhdGUgYSBkaWFnbm9zdGljIHJlbGF0ZWQgaW5mb3JtYXRpb24gb2JqZWN0IHRoYXQgZGVzY3JpYmVzIGEgcG90ZW50aWFsIGN5Y2xpYyBpbXBvcnQgcGF0aC5cbiAqL1xuZnVuY3Rpb24gbWFrZUN5Y2xpY0ltcG9ydEluZm8oXG4gICAgcmVmOiBSZWZlcmVuY2UsIHR5cGU6IHN0cmluZywgY3ljbGU6IEN5Y2xlKTogdHMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbiB7XG4gIGNvbnN0IG5hbWUgPSByZWYuZGVidWdOYW1lIHx8ICcodW5rbm93biknO1xuICBjb25zdCBwYXRoID0gY3ljbGUuZ2V0UGF0aCgpLm1hcChzZiA9PiBzZi5maWxlTmFtZSkuam9pbignIC0+ICcpO1xuICBjb25zdCBtZXNzYWdlID1cbiAgICAgIGBUaGUgJHt0eXBlfSAnJHtuYW1lfScgaXMgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYnV0IGltcG9ydGluZyBpdCB3b3VsZCBjcmVhdGUgYSBjeWNsZTogYDtcbiAgcmV0dXJuIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24ocmVmLm5vZGUsIG1lc3NhZ2UgKyBwYXRoKTtcbn1cblxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgc2VsZWN0b3IgaXMgYSB2YWxpZCBjdXN0b20gZWxlbWVudCB0YWcgbmFtZS5cbiAqIEJhc2VkIGxvb3NlbHkgb24gaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy92YWxpZGF0ZS1lbGVtZW50LW5hbWUuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrQ3VzdG9tRWxlbWVudFNlbGVjdG9yRm9yRXJyb3JzKHNlbGVjdG9yOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gIC8vIEF2b2lkIGZsYWdnaW5nIGNvbXBvbmVudHMgd2l0aCBhbiBhdHRyaWJ1dGUgb3IgY2xhc3Mgc2VsZWN0b3IuIFRoaXMgaXNuJ3QgYnVsbGV0cHJvb2Ygc2luY2UgaXRcbiAgLy8gd29uJ3QgY2F0Y2ggY2FzZXMgbGlrZSBgZm9vW11iYXJgLCBidXQgd2UgZG9uJ3QgbmVlZCBpdCB0byBiZS4gVGhpcyBpcyBtYWlubHkgdG8gYXZvaWQgZmxhZ2dpbmdcbiAgLy8gc29tZXRoaW5nIGxpa2UgYGZvby1iYXJbYmF6XWAgaW5jb3JyZWN0bHkuXG4gIGlmIChzZWxlY3Rvci5pbmNsdWRlcygnLicpIHx8IChzZWxlY3Rvci5pbmNsdWRlcygnWycpICYmIHNlbGVjdG9yLmluY2x1ZGVzKCddJykpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoISgvXlthLXpdLy50ZXN0KHNlbGVjdG9yKSkpIHtcbiAgICByZXR1cm4gJ1NlbGVjdG9yIG9mIGEgU2hhZG93RG9tLWVuY2Fwc3VsYXRlZCBjb21wb25lbnQgbXVzdCBzdGFydCB3aXRoIGEgbG93ZXIgY2FzZSBsZXR0ZXIuJztcbiAgfVxuXG4gIGlmICgvW0EtWl0vLnRlc3Qoc2VsZWN0b3IpKSB7XG4gICAgcmV0dXJuICdTZWxlY3RvciBvZiBhIFNoYWRvd0RvbS1lbmNhcHN1bGF0ZWQgY29tcG9uZW50IG11c3QgYWxsIGJlIGluIGxvd2VyIGNhc2UuJztcbiAgfVxuXG4gIGlmICghc2VsZWN0b3IuaW5jbHVkZXMoJy0nKSkge1xuICAgIHJldHVybiAnU2VsZWN0b3Igb2YgYSBjb21wb25lbnQgdGhhdCB1c2VzIFZpZXdFbmNhcHN1bGF0aW9uLlNoYWRvd0RvbSBtdXN0IGNvbnRhaW4gYSBoeXBoZW4uJztcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIl19