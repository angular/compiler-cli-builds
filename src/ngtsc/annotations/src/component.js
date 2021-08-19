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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/core", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ComponentDecoratorHandler = exports.ComponentSymbol = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var core_1 = require("@angular/compiler/src/core");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var semantic_graph_1 = require("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
    var directive_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/directive");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var ng_module_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_MAP = new Map();
    var EMPTY_ARRAY = [];
    /**
     * Represents an Angular component.
     */
    var ComponentSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(ComponentSymbol, _super);
        function ComponentSymbol() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.usedDirectives = [];
            _this.usedPipes = [];
            _this.isRemotelyScoped = false;
            return _this;
        }
        ComponentSymbol.prototype.isEmitAffected = function (previousSymbol, publicApiAffected) {
            if (!(previousSymbol instanceof ComponentSymbol)) {
                return true;
            }
            // Create an equality function that considers symbols equal if they represent the same
            // declaration, but only if the symbol in the current compilation does not have its public API
            // affected.
            var isSymbolUnaffected = function (current, previous) {
                return semantic_graph_1.isReferenceEqual(current, previous) && !publicApiAffected.has(current.symbol);
            };
            // The emit of a component is affected if either of the following is true:
            //  1. The component used to be remotely scoped but no longer is, or vice versa.
            //  2. The list of used directives has changed or any of those directives have had their public
            //     API changed. If the used directives have been reordered but not otherwise affected then
            //     the component must still be re-emitted, as this may affect directive instantiation order.
            //  3. The list of used pipes has changed, or any of those pipes have had their public API
            //     changed.
            return this.isRemotelyScoped !== previousSymbol.isRemotelyScoped ||
                !semantic_graph_1.isArrayEqual(this.usedDirectives, previousSymbol.usedDirectives, isSymbolUnaffected) ||
                !semantic_graph_1.isArrayEqual(this.usedPipes, previousSymbol.usedPipes, isSymbolUnaffected);
        };
        ComponentSymbol.prototype.isTypeCheckBlockAffected = function (previousSymbol, typeCheckApiAffected) {
            if (!(previousSymbol instanceof ComponentSymbol)) {
                return true;
            }
            // To verify that a used directive is not affected we need to verify that its full inheritance
            // chain is not present in `typeCheckApiAffected`.
            var isInheritanceChainAffected = function (symbol) {
                var currentSymbol = symbol;
                while (currentSymbol instanceof directive_1.DirectiveSymbol) {
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
            var isDirectiveUnaffected = function (current, previous) {
                return semantic_graph_1.isReferenceEqual(current, previous) && !isInheritanceChainAffected(current.symbol);
            };
            // Create an equality function that considers pipes equal if they represent the same
            // declaration and if the symbol in the current compilation does not have its type-check
            // API affected.
            var isPipeUnaffected = function (current, previous) {
                return semantic_graph_1.isReferenceEqual(current, previous) && !typeCheckApiAffected.has(current.symbol);
            };
            // The emit of a type-check block of a component is affected if either of the following is true:
            //  1. The list of used directives has changed or any of those directives have had their
            //     type-check API changed.
            //  2. The list of used pipes has changed, or any of those pipes have had their type-check API
            //     changed.
            return !semantic_graph_1.isArrayEqual(this.usedDirectives, previousSymbol.usedDirectives, isDirectiveUnaffected) ||
                !semantic_graph_1.isArrayEqual(this.usedPipes, previousSymbol.usedPipes, isPipeUnaffected);
        };
        return ComponentSymbol;
    }(directive_1.DirectiveSymbol));
    exports.ComponentSymbol = ComponentSymbol;
    /**
     * `DecoratorHandler` which handles the `@Component` annotation.
     */
    var ComponentDecoratorHandler = /** @class */ (function () {
        function ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds, enableI18nLegacyMessageIdFormat, usePoisonedData, i18nNormalizeLineEndingsInICUs, moduleResolver, cycleAnalyzer, cycleHandlingStrategy, refEmitter, depTracker, injectableRegistry, semanticDepGraphUpdater, annotateForClosureCompiler, perf) {
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
            this.elementSchemaRegistry = new compiler_1.DomElementSchemaRegistry();
            /**
             * During the asynchronous preanalyze phase, it's necessary to parse the template to extract
             * any potential <link> tags which might need to be loaded. This cache ensures that work is not
             * thrown away, and the parsed template is reused during the analyze phase.
             */
            this.preanalyzeTemplateCache = new Map();
            this.preanalyzeStylesCache = new Map();
            this.precedence = transform_1.HandlerPrecedence.PRIMARY;
            this.name = ComponentDecoratorHandler.name;
        }
        ComponentDecoratorHandler.prototype.detect = function (node, decorators) {
            if (!decorators) {
                return undefined;
            }
            var decorator = util_1.findAngularDecorator(decorators, 'Component', this.isCore);
            if (decorator !== undefined) {
                return {
                    trigger: decorator.node,
                    decorator: decorator,
                    metadata: decorator,
                };
            }
            else {
                return undefined;
            }
        };
        ComponentDecoratorHandler.prototype.preanalyze = function (node, decorator) {
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
            var _this = this;
            // If preloading isn't possible, then skip this step.
            if (!this.resourceLoader.canPreload) {
                return undefined;
            }
            var meta = this._resolveLiteral(decorator);
            var component = reflection_1.reflectObjectLiteral(meta);
            var containingFile = node.getSourceFile().fileName;
            var resolveStyleUrl = function (styleUrl) {
                try {
                    var resourceUrl = _this.resourceLoader.resolve(styleUrl, containingFile);
                    return _this.resourceLoader.preload(resourceUrl, { type: 'style', containingFile: containingFile });
                }
                catch (_a) {
                    // Don't worry about failures to preload. We can handle this problem during analysis by
                    // producing a diagnostic.
                    return undefined;
                }
            };
            // A Promise that waits for the template and all <link>ed styles within it to be preloaded.
            var templateAndTemplateStyleResources = this._preloadAndParseTemplate(node, decorator, component, containingFile)
                .then(function (template) {
                if (template === null) {
                    return undefined;
                }
                return Promise.all(template.styleUrls.map(function (styleUrl) { return resolveStyleUrl(styleUrl); }))
                    .then(function () { return undefined; });
            });
            // Extract all the styleUrls in the decorator.
            var componentStyleUrls = this._extractComponentStyleUrls(component);
            // Extract inline styles, process, and cache for use in synchronous analyze phase
            var inlineStyles;
            if (component.has('styles')) {
                var litStyles = directive_1.parseFieldArrayValue(component, 'styles', this.evaluator);
                if (litStyles === null) {
                    this.preanalyzeStylesCache.set(node, null);
                }
                else {
                    inlineStyles = Promise
                        .all(litStyles.map(function (style) { return _this.resourceLoader.preprocessInline(style, { type: 'style', containingFile: containingFile }); }))
                        .then(function (styles) {
                        _this.preanalyzeStylesCache.set(node, styles);
                    });
                }
            }
            else {
                this.preanalyzeStylesCache.set(node, null);
            }
            // Wait for both the template and all styleUrl resources to resolve.
            return Promise
                .all(tslib_1.__spreadArray([
                templateAndTemplateStyleResources, inlineStyles
            ], tslib_1.__read(componentStyleUrls.map(function (styleUrl) { return resolveStyleUrl(styleUrl.url); }))))
                .then(function () { return undefined; });
        };
        ComponentDecoratorHandler.prototype.analyze = function (node, decorator, flags) {
            var e_1, _a;
            var _this = this;
            var _b, _c;
            if (flags === void 0) { flags = transform_1.HandlerFlags.NONE; }
            this.perf.eventCount(perf_1.PerfEvent.AnalyzeComponent);
            var containingFile = node.getSourceFile().fileName;
            this.literalCache.delete(decorator);
            var diagnostics;
            var isPoisoned = false;
            // @Component inherits @Directive, so begin by extracting the @Directive metadata and building
            // on it.
            var directiveResult = directive_1.extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.isCore, flags, this.annotateForClosureCompiler, this.elementSchemaRegistry.getDefaultComponentElementName());
            if (directiveResult === undefined) {
                // `extractDirectiveMetadata` returns undefined when the @Directive has `jit: true`. In this
                // case, compilation of the decorator is skipped. Returning an empty object signifies
                // that no analysis was produced.
                return {};
            }
            // Next, read the `@Component`-specific fields.
            var component = directiveResult.decorator, metadata = directiveResult.metadata, inputs = directiveResult.inputs, outputs = directiveResult.outputs;
            var encapsulation = (_b = this._resolveEnumValue(component, 'encapsulation', 'ViewEncapsulation')) !== null && _b !== void 0 ? _b : core_1.ViewEncapsulation.Emulated;
            var changeDetection = this._resolveEnumValue(component, 'changeDetection', 'ChangeDetectionStrategy');
            var animations = null;
            if (component.has('animations')) {
                animations = new compiler_1.WrappedNodeExpr(component.get('animations'));
            }
            // Go through the root directories for this project, and select the one with the smallest
            // relative path representation.
            var relativeContextFilePath = this.rootDirs.reduce(function (previous, rootDir) {
                var candidate = file_system_1.relative(file_system_1.absoluteFrom(rootDir), file_system_1.absoluteFrom(containingFile));
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
            var viewProvidersRequiringFactory = null;
            var providersRequiringFactory = null;
            var wrappedViewProviders = null;
            if (component.has('viewProviders')) {
                var viewProviders = component.get('viewProviders');
                viewProvidersRequiringFactory =
                    util_1.resolveProvidersRequiringFactory(viewProviders, this.reflector, this.evaluator);
                wrappedViewProviders = new compiler_1.WrappedNodeExpr(this.annotateForClosureCompiler ? util_1.wrapFunctionExpressionsInParens(viewProviders) :
                    viewProviders);
            }
            if (component.has('providers')) {
                providersRequiringFactory = util_1.resolveProvidersRequiringFactory(component.get('providers'), this.reflector, this.evaluator);
            }
            // Parse the template.
            // If a preanalyze phase was executed, the template may already exist in parsed form, so check
            // the preanalyzeTemplateCache.
            // Extract a closure of the template parsing code so that it can be reparsed with different
            // options if needed, like in the indexing pipeline.
            var template;
            if (this.preanalyzeTemplateCache.has(node)) {
                // The template was parsed in preanalyze. Use it and delete it to save memory.
                var preanalyzed = this.preanalyzeTemplateCache.get(node);
                this.preanalyzeTemplateCache.delete(node);
                template = preanalyzed;
            }
            else {
                var templateDecl = this.parseTemplateDeclaration(decorator, component, containingFile);
                template = this.extractTemplate(node, templateDecl);
            }
            var templateResource = template.declaration.isInline ? { path: null, expression: component.get('template') } : {
                path: file_system_1.absoluteFrom(template.declaration.resolvedTemplateUrl),
                expression: template.sourceMapping.node
            };
            // Figure out the set of styles. The ordering here is important: external resources (styleUrls)
            // precede inline styles, and styles defined in the template override styles defined in the
            // component.
            var styles = [];
            var styleResources = this._extractStyleResources(component, containingFile);
            var styleUrls = tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(this._extractComponentStyleUrls(component))), tslib_1.__read(this._extractTemplateStyleUrls(template)));
            try {
                for (var styleUrls_1 = tslib_1.__values(styleUrls), styleUrls_1_1 = styleUrls_1.next(); !styleUrls_1_1.done; styleUrls_1_1 = styleUrls_1.next()) {
                    var styleUrl = styleUrls_1_1.value;
                    try {
                        var resourceUrl = this.resourceLoader.resolve(styleUrl.url, containingFile);
                        var resourceStr = this.resourceLoader.load(resourceUrl);
                        styles.push(resourceStr);
                        if (this.depTracker !== null) {
                            this.depTracker.addResourceDependency(node.getSourceFile(), file_system_1.absoluteFrom(resourceUrl));
                        }
                    }
                    catch (_d) {
                        if (diagnostics === undefined) {
                            diagnostics = [];
                        }
                        var resourceType = styleUrl.source === 2 /* StylesheetFromDecorator */ ?
                            2 /* StylesheetFromDecorator */ :
                            1 /* StylesheetFromTemplate */;
                        diagnostics.push(this.makeResourceNotFoundError(styleUrl.url, styleUrl.nodeForError, resourceType)
                            .toDiagnostic());
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (styleUrls_1_1 && !styleUrls_1_1.done && (_a = styleUrls_1.return)) _a.call(styleUrls_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (encapsulation === core_1.ViewEncapsulation.ShadowDom && metadata.selector !== null) {
                var selectorError = checkCustomElementSelectorForErrors(metadata.selector);
                if (selectorError !== null) {
                    if (diagnostics === undefined) {
                        diagnostics = [];
                    }
                    diagnostics.push(diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR, component.get('selector'), selectorError));
                }
            }
            // If inline styles were preprocessed use those
            var inlineStyles = null;
            if (this.preanalyzeStylesCache.has(node)) {
                inlineStyles = this.preanalyzeStylesCache.get(node);
                this.preanalyzeStylesCache.delete(node);
                if (inlineStyles !== null) {
                    styles.push.apply(styles, tslib_1.__spreadArray([], tslib_1.__read(inlineStyles)));
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
                    var litStyles = directive_1.parseFieldArrayValue(component, 'styles', this.evaluator);
                    if (litStyles !== null) {
                        inlineStyles = tslib_1.__spreadArray([], tslib_1.__read(litStyles));
                        styles.push.apply(styles, tslib_1.__spreadArray([], tslib_1.__read(litStyles)));
                    }
                }
            }
            if (template.styles.length > 0) {
                styles.push.apply(styles, tslib_1.__spreadArray([], tslib_1.__read(template.styles)));
            }
            var output = {
                analysis: {
                    baseClass: util_1.readBaseClass(node, this.reflector, this.evaluator),
                    inputs: inputs,
                    outputs: outputs,
                    meta: tslib_1.__assign(tslib_1.__assign({}, metadata), { template: {
                            nodes: template.nodes,
                            ngContentSelectors: template.ngContentSelectors,
                        }, encapsulation: encapsulation, interpolation: (_c = template.interpolationConfig) !== null && _c !== void 0 ? _c : compiler_1.DEFAULT_INTERPOLATION_CONFIG, styles: styles, 
                        // These will be replaced during the compilation step, after all `NgModule`s have been
                        // analyzed and the full compilation scope for the component can be realized.
                        animations: animations, viewProviders: wrappedViewProviders, i18nUseExternalIds: this.i18nUseExternalIds, relativeContextFilePath: relativeContextFilePath }),
                    typeCheckMeta: metadata_1.extractDirectiveTypeCheckMeta(node, inputs, this.reflector),
                    classMetadata: metadata_2.extractClassMetadata(node, this.reflector, this.isCore, this.annotateForClosureCompiler, function (dec) { return _this._transformDecoratorToInlineResources(dec, component, styles, template); }),
                    template: template,
                    providersRequiringFactory: providersRequiringFactory,
                    viewProvidersRequiringFactory: viewProvidersRequiringFactory,
                    inlineStyles: inlineStyles,
                    styleUrls: styleUrls,
                    resources: {
                        styles: styleResources,
                        template: templateResource,
                    },
                    isPoisoned: isPoisoned,
                },
                diagnostics: diagnostics,
            };
            if (changeDetection !== null) {
                output.analysis.meta.changeDetection = changeDetection;
            }
            return output;
        };
        ComponentDecoratorHandler.prototype.symbol = function (node, analysis) {
            var typeParameters = semantic_graph_1.extractSemanticTypeParameters(node);
            return new ComponentSymbol(node, analysis.meta.selector, analysis.inputs, analysis.outputs, analysis.meta.exportAs, analysis.typeCheckMeta, typeParameters);
        };
        ComponentDecoratorHandler.prototype.register = function (node, analysis) {
            // Register this component's information with the `MetadataRegistry`. This ensures that
            // the information about the component is available during the compile() phase.
            var ref = new imports_1.Reference(node);
            this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign(tslib_1.__assign({ type: metadata_1.MetaType.Directive, ref: ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.meta.queries.map(function (query) { return query.propertyName; }), isComponent: true, baseClass: analysis.baseClass }, analysis.typeCheckMeta), { isPoisoned: analysis.isPoisoned, isStructural: false }));
            this.resourceRegistry.registerResources(analysis.resources, node);
            this.injectableRegistry.registerInjectable(node);
        };
        ComponentDecoratorHandler.prototype.index = function (context, node, analysis) {
            var e_2, _a;
            if (analysis.isPoisoned && !this.usePoisonedData) {
                return null;
            }
            var scope = this.scopeReader.getScopeForComponent(node);
            var selector = analysis.meta.selector;
            var matcher = new compiler_1.SelectorMatcher();
            if (scope !== null) {
                if ((scope.compilation.isPoisoned || scope.exported.isPoisoned) && !this.usePoisonedData) {
                    // Don't bother indexing components which had erroneous scopes, unless specifically
                    // requested.
                    return null;
                }
                try {
                    for (var _b = tslib_1.__values(scope.compilation.directives), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var directive = _c.value;
                        if (directive.selector !== null) {
                            matcher.addSelectables(compiler_1.CssSelector.parse(directive.selector), directive);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            var binder = new compiler_1.R3TargetBinder(matcher);
            var boundTemplate = binder.bind({ template: analysis.template.diagNodes });
            context.addComponent({
                declaration: node,
                selector: selector,
                boundTemplate: boundTemplate,
                templateMeta: {
                    isInline: analysis.template.declaration.isInline,
                    file: analysis.template.file,
                },
            });
        };
        ComponentDecoratorHandler.prototype.typeCheck = function (ctx, node, meta) {
            if (this.typeCheckScopeRegistry === null || !ts.isClassDeclaration(node)) {
                return;
            }
            if (meta.isPoisoned && !this.usePoisonedData) {
                return;
            }
            var scope = this.typeCheckScopeRegistry.getTypeCheckScope(node);
            if (scope.isPoisoned && !this.usePoisonedData) {
                // Don't type-check components that had errors in their scopes, unless requested.
                return;
            }
            var binder = new compiler_1.R3TargetBinder(scope.matcher);
            ctx.addTemplate(new imports_1.Reference(node), binder, meta.template.diagNodes, scope.pipes, scope.schemas, meta.template.sourceMapping, meta.template.file, meta.template.errors);
        };
        ComponentDecoratorHandler.prototype.extendedTemplateCheck = function (component, extendedTemplateChecker) {
            return extendedTemplateChecker.getExtendedTemplateDiagnosticsForComponent(component);
        };
        ComponentDecoratorHandler.prototype.resolve = function (node, analysis, symbol) {
            var e_3, _a, e_4, _b, e_5, _c, e_6, _d, e_7, _e, e_8, _f, e_9, _g, e_10, _h, e_11, _j;
            var _this = this;
            if (this.semanticDepGraphUpdater !== null && analysis.baseClass instanceof imports_1.Reference) {
                symbol.baseClass = this.semanticDepGraphUpdater.getSymbol(analysis.baseClass.node);
            }
            if (analysis.isPoisoned && !this.usePoisonedData) {
                return {};
            }
            var context = node.getSourceFile();
            // Check whether this component was registered with an NgModule. If so, it should be compiled
            // under that module's compilation scope.
            var scope = this.scopeReader.getScopeForComponent(node);
            var metadata = analysis.meta;
            var data = {
                directives: EMPTY_ARRAY,
                pipes: EMPTY_MAP,
                declarationListEmitMode: 0 /* Direct */,
            };
            if (scope !== null && (!scope.compilation.isPoisoned || this.usePoisonedData)) {
                var matcher = new compiler_1.SelectorMatcher();
                try {
                    for (var _k = tslib_1.__values(scope.compilation.directives), _l = _k.next(); !_l.done; _l = _k.next()) {
                        var dir = _l.value;
                        if (dir.selector !== null) {
                            matcher.addSelectables(compiler_1.CssSelector.parse(dir.selector), dir);
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_l && !_l.done && (_a = _k.return)) _a.call(_k);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                var pipes = new Map();
                try {
                    for (var _m = tslib_1.__values(scope.compilation.pipes), _o = _m.next(); !_o.done; _o = _m.next()) {
                        var pipe = _o.value;
                        pipes.set(pipe.name, pipe.ref);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_o && !_o.done && (_b = _m.return)) _b.call(_m);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                // Next, the component template AST is bound using the R3TargetBinder. This produces a
                // BoundTarget, which is similar to a ts.TypeChecker.
                var binder = new compiler_1.R3TargetBinder(matcher);
                var bound = binder.bind({ template: metadata.template.nodes });
                var usedDirectives = bound.getUsedDirectives().map(function (directive) {
                    var type = _this.refEmitter.emit(directive.ref, context);
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
                var usedPipes = [];
                try {
                    for (var _p = tslib_1.__values(bound.getUsedPipes()), _q = _p.next(); !_q.done; _q = _p.next()) {
                        var pipeName = _q.value;
                        if (!pipes.has(pipeName)) {
                            continue;
                        }
                        var pipe = pipes.get(pipeName);
                        var type = this.refEmitter.emit(pipe, context);
                        usedPipes.push({
                            ref: pipe,
                            pipeName: pipeName,
                            expression: type.expression,
                            importedFile: type.importedFile,
                        });
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_q && !_q.done && (_c = _p.return)) _c.call(_p);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                if (this.semanticDepGraphUpdater !== null) {
                    symbol.usedDirectives = usedDirectives.map(function (dir) { return _this.semanticDepGraphUpdater.getSemanticReference(dir.ref.node, dir.type); });
                    symbol.usedPipes = usedPipes.map(function (pipe) {
                        return _this.semanticDepGraphUpdater.getSemanticReference(pipe.ref.node, pipe.expression);
                    });
                }
                // Scan through the directives/pipes actually used in the template and check whether any
                // import which needs to be generated would create a cycle.
                var cyclesFromDirectives = new Map();
                try {
                    for (var usedDirectives_1 = tslib_1.__values(usedDirectives), usedDirectives_1_1 = usedDirectives_1.next(); !usedDirectives_1_1.done; usedDirectives_1_1 = usedDirectives_1.next()) {
                        var usedDirective = usedDirectives_1_1.value;
                        var cycle = this._checkForCyclicImport(usedDirective.importedFile, usedDirective.type, context);
                        if (cycle !== null) {
                            cyclesFromDirectives.set(usedDirective, cycle);
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (usedDirectives_1_1 && !usedDirectives_1_1.done && (_d = usedDirectives_1.return)) _d.call(usedDirectives_1);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
                var cyclesFromPipes = new Map();
                try {
                    for (var usedPipes_1 = tslib_1.__values(usedPipes), usedPipes_1_1 = usedPipes_1.next(); !usedPipes_1_1.done; usedPipes_1_1 = usedPipes_1.next()) {
                        var usedPipe = usedPipes_1_1.value;
                        var cycle = this._checkForCyclicImport(usedPipe.importedFile, usedPipe.expression, context);
                        if (cycle !== null) {
                            cyclesFromPipes.set(usedPipe, cycle);
                        }
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (usedPipes_1_1 && !usedPipes_1_1.done && (_e = usedPipes_1.return)) _e.call(usedPipes_1);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
                var cycleDetected = cyclesFromDirectives.size !== 0 || cyclesFromPipes.size !== 0;
                if (!cycleDetected) {
                    try {
                        // No cycle was detected. Record the imports that need to be created in the cycle detector
                        // so that future cyclic import checks consider their production.
                        for (var usedDirectives_2 = tslib_1.__values(usedDirectives), usedDirectives_2_1 = usedDirectives_2.next(); !usedDirectives_2_1.done; usedDirectives_2_1 = usedDirectives_2.next()) {
                            var _r = usedDirectives_2_1.value, type = _r.type, importedFile = _r.importedFile;
                            this._recordSyntheticImport(importedFile, type, context);
                        }
                    }
                    catch (e_8_1) { e_8 = { error: e_8_1 }; }
                    finally {
                        try {
                            if (usedDirectives_2_1 && !usedDirectives_2_1.done && (_f = usedDirectives_2.return)) _f.call(usedDirectives_2);
                        }
                        finally { if (e_8) throw e_8.error; }
                    }
                    try {
                        for (var usedPipes_2 = tslib_1.__values(usedPipes), usedPipes_2_1 = usedPipes_2.next(); !usedPipes_2_1.done; usedPipes_2_1 = usedPipes_2.next()) {
                            var _s = usedPipes_2_1.value, expression = _s.expression, importedFile = _s.importedFile;
                            this._recordSyntheticImport(importedFile, expression, context);
                        }
                    }
                    catch (e_9_1) { e_9 = { error: e_9_1 }; }
                    finally {
                        try {
                            if (usedPipes_2_1 && !usedPipes_2_1.done && (_g = usedPipes_2.return)) _g.call(usedPipes_2);
                        }
                        finally { if (e_9) throw e_9.error; }
                    }
                    // Check whether the directive/pipe arrays in ɵcmp need to be wrapped in closures.
                    // This is required if any directive/pipe reference is to a declaration in the same file
                    // but declared after this component.
                    var wrapDirectivesAndPipesInClosure = usedDirectives.some(function (dir) { return util_1.isExpressionForwardReference(dir.type, node.name, context); }) ||
                        usedPipes.some(function (pipe) { return util_1.isExpressionForwardReference(pipe.expression, node.name, context); });
                    data.directives = usedDirectives;
                    data.pipes = new Map(usedPipes.map(function (pipe) { return [pipe.pipeName, pipe.expression]; }));
                    data.declarationListEmitMode = wrapDirectivesAndPipesInClosure ?
                        1 /* Closure */ :
                        0 /* Direct */;
                }
                else {
                    if (this.cycleHandlingStrategy === 0 /* UseRemoteScoping */) {
                        // Declaring the directiveDefs/pipeDefs arrays directly would require imports that would
                        // create a cycle. Instead, mark this component as requiring remote scoping, so that the
                        // NgModule file will take care of setting the directives for the component.
                        this.scopeRegistry.setComponentRemoteScope(node, usedDirectives.map(function (dir) { return dir.ref; }), usedPipes.map(function (pipe) { return pipe.ref; }));
                        symbol.isRemotelyScoped = true;
                        // If a semantic graph is being tracked, record the fact that this component is remotely
                        // scoped with the declaring NgModule symbol as the NgModule's emit becomes dependent on
                        // the directive/pipe usages of this component.
                        if (this.semanticDepGraphUpdater !== null) {
                            var moduleSymbol = this.semanticDepGraphUpdater.getSymbol(scope.ngModule);
                            if (!(moduleSymbol instanceof ng_module_1.NgModuleSymbol)) {
                                throw new Error("AssertionError: Expected " + scope.ngModule.name + " to be an NgModuleSymbol.");
                            }
                            moduleSymbol.addRemotelyScopedComponent(symbol, symbol.usedDirectives, symbol.usedPipes);
                        }
                    }
                    else {
                        // We are not able to handle this cycle so throw an error.
                        var relatedMessages = [];
                        try {
                            for (var cyclesFromDirectives_1 = tslib_1.__values(cyclesFromDirectives), cyclesFromDirectives_1_1 = cyclesFromDirectives_1.next(); !cyclesFromDirectives_1_1.done; cyclesFromDirectives_1_1 = cyclesFromDirectives_1.next()) {
                                var _t = tslib_1.__read(cyclesFromDirectives_1_1.value, 2), dir = _t[0], cycle = _t[1];
                                relatedMessages.push(makeCyclicImportInfo(dir.ref, dir.isComponent ? 'component' : 'directive', cycle));
                            }
                        }
                        catch (e_10_1) { e_10 = { error: e_10_1 }; }
                        finally {
                            try {
                                if (cyclesFromDirectives_1_1 && !cyclesFromDirectives_1_1.done && (_h = cyclesFromDirectives_1.return)) _h.call(cyclesFromDirectives_1);
                            }
                            finally { if (e_10) throw e_10.error; }
                        }
                        try {
                            for (var cyclesFromPipes_1 = tslib_1.__values(cyclesFromPipes), cyclesFromPipes_1_1 = cyclesFromPipes_1.next(); !cyclesFromPipes_1_1.done; cyclesFromPipes_1_1 = cyclesFromPipes_1.next()) {
                                var _u = tslib_1.__read(cyclesFromPipes_1_1.value, 2), pipe = _u[0], cycle = _u[1];
                                relatedMessages.push(makeCyclicImportInfo(pipe.ref, 'pipe', cycle));
                            }
                        }
                        catch (e_11_1) { e_11 = { error: e_11_1 }; }
                        finally {
                            try {
                                if (cyclesFromPipes_1_1 && !cyclesFromPipes_1_1.done && (_j = cyclesFromPipes_1.return)) _j.call(cyclesFromPipes_1);
                            }
                            finally { if (e_11) throw e_11.error; }
                        }
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.IMPORT_CYCLE_DETECTED, node, 'One or more import cycles would need to be created to compile this component, ' +
                            'which is not supported by the current compiler configuration.', relatedMessages);
                    }
                }
            }
            var diagnostics = [];
            if (analysis.providersRequiringFactory !== null &&
                analysis.meta.providers instanceof compiler_1.WrappedNodeExpr) {
                var providerDiagnostics = diagnostics_2.getProviderDiagnostics(analysis.providersRequiringFactory, analysis.meta.providers.node, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(providerDiagnostics)));
            }
            if (analysis.viewProvidersRequiringFactory !== null &&
                analysis.meta.viewProviders instanceof compiler_1.WrappedNodeExpr) {
                var viewProviderDiagnostics = diagnostics_2.getProviderDiagnostics(analysis.viewProvidersRequiringFactory, analysis.meta.viewProviders.node, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(viewProviderDiagnostics)));
            }
            var directiveDiagnostics = diagnostics_2.getDirectiveDiagnostics(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, 'Component');
            if (directiveDiagnostics !== null) {
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(directiveDiagnostics)));
            }
            if (diagnostics.length > 0) {
                return { diagnostics: diagnostics };
            }
            return { data: data };
        };
        ComponentDecoratorHandler.prototype.xi18n = function (ctx, node, analysis) {
            var _a;
            ctx.updateFromTemplate(analysis.template.content, analysis.template.declaration.resolvedTemplateUrl, (_a = analysis.template.interpolationConfig) !== null && _a !== void 0 ? _a : compiler_1.DEFAULT_INTERPOLATION_CONFIG);
        };
        ComponentDecoratorHandler.prototype.updateResources = function (node, analysis) {
            var e_12, _a, e_13, _b, e_14, _c;
            var containingFile = node.getSourceFile().fileName;
            // If the template is external, re-parse it.
            var templateDecl = analysis.template.declaration;
            if (!templateDecl.isInline) {
                analysis.template = this.extractTemplate(node, templateDecl);
            }
            // Update any external stylesheets and rebuild the combined 'styles' list.
            // TODO(alxhub): write tests for styles when the primary compiler uses the updateResources path
            var styles = [];
            if (analysis.styleUrls !== null) {
                try {
                    for (var _d = tslib_1.__values(analysis.styleUrls), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var styleUrl = _e.value;
                        try {
                            var resolvedStyleUrl = this.resourceLoader.resolve(styleUrl.url, containingFile);
                            var styleText = this.resourceLoader.load(resolvedStyleUrl);
                            styles.push(styleText);
                        }
                        catch (e) {
                            // Resource resolve failures should already be in the diagnostics list from the analyze
                            // stage. We do not need to do anything with them when updating resources.
                        }
                    }
                }
                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                    }
                    finally { if (e_12) throw e_12.error; }
                }
            }
            if (analysis.inlineStyles !== null) {
                try {
                    for (var _f = tslib_1.__values(analysis.inlineStyles), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var styleText = _g.value;
                        styles.push(styleText);
                    }
                }
                catch (e_13_1) { e_13 = { error: e_13_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_13) throw e_13.error; }
                }
            }
            try {
                for (var _h = tslib_1.__values(analysis.template.styles), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var styleText = _j.value;
                    styles.push(styleText);
                }
            }
            catch (e_14_1) { e_14 = { error: e_14_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                }
                finally { if (e_14) throw e_14.error; }
            }
            analysis.meta.styles = styles;
        };
        ComponentDecoratorHandler.prototype.compileFull = function (node, analysis, resolution, pool) {
            if (analysis.template.errors !== null && analysis.template.errors.length > 0) {
                return [];
            }
            var meta = tslib_1.__assign(tslib_1.__assign({}, analysis.meta), resolution);
            var fac = factory_1.compileNgFactoryDefField(util_1.toFactoryMetadata(meta, compiler_1.FactoryTarget.Component));
            var def = compiler_1.compileComponentFromMetadata(meta, pool, compiler_1.makeBindingParser());
            var classMetadata = analysis.classMetadata !== null ?
                compiler_1.compileClassMetadata(analysis.classMetadata).toStmt() :
                null;
            return util_1.compileResults(fac, def, classMetadata, 'ɵcmp');
        };
        ComponentDecoratorHandler.prototype.compilePartial = function (node, analysis, resolution) {
            if (analysis.template.errors !== null && analysis.template.errors.length > 0) {
                return [];
            }
            var templateInfo = {
                content: analysis.template.content,
                sourceUrl: analysis.template.declaration.resolvedTemplateUrl,
                isInline: analysis.template.declaration.isInline,
                inlineTemplateLiteralExpression: analysis.template.sourceMapping.type === 'direct' ?
                    new compiler_1.WrappedNodeExpr(analysis.template.sourceMapping.node) :
                    null,
            };
            var meta = tslib_1.__assign(tslib_1.__assign({}, analysis.meta), resolution);
            var fac = factory_1.compileDeclareFactory(util_1.toFactoryMetadata(meta, compiler_1.FactoryTarget.Component));
            var def = compiler_1.compileDeclareComponentFromMetadata(meta, analysis.template, templateInfo);
            var classMetadata = analysis.classMetadata !== null ?
                compiler_1.compileDeclareClassMetadata(analysis.classMetadata).toStmt() :
                null;
            return util_1.compileResults(fac, def, classMetadata, 'ɵcmp');
        };
        /**
         * Transforms the given decorator to inline external resources. i.e. if the decorator
         * resolves to `@Component`, the `templateUrl` and `styleUrls` metadata fields will be
         * transformed to their semantically-equivalent inline variants.
         *
         * This method is used for serializing decorators into the class metadata. The emitted
         * class metadata should not refer to external resources as this would be inconsistent
         * with the component definitions/declarations which already inline external resources.
         *
         * Additionally, the references to external resources would require libraries to ship
         * external resources exclusively for the class metadata.
         */
        ComponentDecoratorHandler.prototype._transformDecoratorToInlineResources = function (dec, component, styles, template) {
            var e_15, _a;
            if (dec.name !== 'Component') {
                return dec;
            }
            // If no external resources are referenced, preserve the original decorator
            // for the best source map experience when the decorator is emitted in TS.
            if (!component.has('templateUrl') && !component.has('styleUrls')) {
                return dec;
            }
            var metadata = new Map(component);
            // Set the `template` property if the `templateUrl` property is set.
            if (metadata.has('templateUrl')) {
                metadata.delete('templateUrl');
                metadata.set('template', ts.createStringLiteral(template.content));
            }
            // Set the `styles` property if the `styleUrls` property is set.
            if (metadata.has('styleUrls')) {
                metadata.delete('styleUrls');
                metadata.set('styles', ts.createArrayLiteral(styles.map(function (s) { return ts.createStringLiteral(s); })));
            }
            // Convert the metadata to TypeScript AST object literal element nodes.
            var newMetadataFields = [];
            try {
                for (var _b = tslib_1.__values(metadata.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_1.__read(_c.value, 2), name_1 = _d[0], value = _d[1];
                    newMetadataFields.push(ts.createPropertyAssignment(name_1, value));
                }
            }
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_15) throw e_15.error; }
            }
            // Return the original decorator with the overridden metadata argument.
            return tslib_1.__assign(tslib_1.__assign({}, dec), { args: [ts.createObjectLiteral(newMetadataFields)] });
        };
        ComponentDecoratorHandler.prototype._resolveLiteral = function (decorator) {
            if (this.literalCache.has(decorator)) {
                return this.literalCache.get(decorator);
            }
            if (decorator.args === null || decorator.args.length !== 1) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(decorator), "Incorrect number of arguments to @Component decorator");
            }
            var meta = util_1.unwrapExpression(decorator.args[0]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, "Decorator argument must be literal.");
            }
            this.literalCache.set(decorator, meta);
            return meta;
        };
        ComponentDecoratorHandler.prototype._resolveEnumValue = function (component, field, enumSymbolName) {
            var resolved = null;
            if (component.has(field)) {
                var expr = component.get(field);
                var value = this.evaluator.evaluate(expr);
                if (value instanceof partial_evaluator_1.EnumValue && util_1.isAngularCoreReference(value.enumRef, enumSymbolName)) {
                    resolved = value.resolved;
                }
                else {
                    throw diagnostics_2.createValueHasWrongTypeError(expr, value, field + " must be a member of " + enumSymbolName + " enum from @angular/core");
                }
            }
            return resolved;
        };
        ComponentDecoratorHandler.prototype._extractComponentStyleUrls = function (component) {
            if (!component.has('styleUrls')) {
                return [];
            }
            return this._extractStyleUrlsFromExpression(component.get('styleUrls'));
        };
        ComponentDecoratorHandler.prototype._extractStyleUrlsFromExpression = function (styleUrlsExpr) {
            var e_16, _a, e_17, _b;
            var styleUrls = [];
            if (ts.isArrayLiteralExpression(styleUrlsExpr)) {
                try {
                    for (var _c = tslib_1.__values(styleUrlsExpr.elements), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var styleUrlExpr = _d.value;
                        if (ts.isSpreadElement(styleUrlExpr)) {
                            styleUrls.push.apply(styleUrls, tslib_1.__spreadArray([], tslib_1.__read(this._extractStyleUrlsFromExpression(styleUrlExpr.expression))));
                        }
                        else {
                            var styleUrl = this.evaluator.evaluate(styleUrlExpr);
                            if (typeof styleUrl !== 'string') {
                                throw diagnostics_2.createValueHasWrongTypeError(styleUrlExpr, styleUrl, 'styleUrl must be a string');
                            }
                            styleUrls.push({
                                url: styleUrl,
                                source: 2 /* StylesheetFromDecorator */,
                                nodeForError: styleUrlExpr,
                            });
                        }
                    }
                }
                catch (e_16_1) { e_16 = { error: e_16_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_16) throw e_16.error; }
                }
            }
            else {
                var evaluatedStyleUrls = this.evaluator.evaluate(styleUrlsExpr);
                if (!isStringArray(evaluatedStyleUrls)) {
                    throw diagnostics_2.createValueHasWrongTypeError(styleUrlsExpr, evaluatedStyleUrls, 'styleUrls must be an array of strings');
                }
                try {
                    for (var evaluatedStyleUrls_1 = tslib_1.__values(evaluatedStyleUrls), evaluatedStyleUrls_1_1 = evaluatedStyleUrls_1.next(); !evaluatedStyleUrls_1_1.done; evaluatedStyleUrls_1_1 = evaluatedStyleUrls_1.next()) {
                        var styleUrl = evaluatedStyleUrls_1_1.value;
                        styleUrls.push({
                            url: styleUrl,
                            source: 2 /* StylesheetFromDecorator */,
                            nodeForError: styleUrlsExpr,
                        });
                    }
                }
                catch (e_17_1) { e_17 = { error: e_17_1 }; }
                finally {
                    try {
                        if (evaluatedStyleUrls_1_1 && !evaluatedStyleUrls_1_1.done && (_b = evaluatedStyleUrls_1.return)) _b.call(evaluatedStyleUrls_1);
                    }
                    finally { if (e_17) throw e_17.error; }
                }
            }
            return styleUrls;
        };
        ComponentDecoratorHandler.prototype._extractStyleResources = function (component, containingFile) {
            var e_18, _a, e_19, _b;
            var styles = new Set();
            function stringLiteralElements(array) {
                return array.elements.filter(function (e) { return ts.isStringLiteralLike(e); });
            }
            // If styleUrls is a literal array, process each resource url individually and
            // register ones that are string literals.
            var styleUrlsExpr = component.get('styleUrls');
            if (styleUrlsExpr !== undefined && ts.isArrayLiteralExpression(styleUrlsExpr)) {
                try {
                    for (var _c = tslib_1.__values(stringLiteralElements(styleUrlsExpr)), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var expression = _d.value;
                        try {
                            var resourceUrl = this.resourceLoader.resolve(expression.text, containingFile);
                            styles.add({ path: file_system_1.absoluteFrom(resourceUrl), expression: expression });
                        }
                        catch (_e) {
                            // Errors in style resource extraction do not need to be handled here. We will produce
                            // diagnostics for each one that fails in the analysis, after we evaluate the `styleUrls`
                            // expression to determine _all_ style resources, not just the string literals.
                        }
                    }
                }
                catch (e_18_1) { e_18 = { error: e_18_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_18) throw e_18.error; }
                }
            }
            var stylesExpr = component.get('styles');
            if (stylesExpr !== undefined && ts.isArrayLiteralExpression(stylesExpr)) {
                try {
                    for (var _f = tslib_1.__values(stringLiteralElements(stylesExpr)), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var expression = _g.value;
                        styles.add({ path: null, expression: expression });
                    }
                }
                catch (e_19_1) { e_19 = { error: e_19_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_19) throw e_19.error; }
                }
            }
            return styles;
        };
        ComponentDecoratorHandler.prototype._preloadAndParseTemplate = function (node, decorator, component, containingFile) {
            var _this = this;
            if (component.has('templateUrl')) {
                // Extract the templateUrl and preload it.
                var templateUrlExpr = component.get('templateUrl');
                var templateUrl = this.evaluator.evaluate(templateUrlExpr);
                if (typeof templateUrl !== 'string') {
                    throw diagnostics_2.createValueHasWrongTypeError(templateUrlExpr, templateUrl, 'templateUrl must be a string');
                }
                try {
                    var resourceUrl = this.resourceLoader.resolve(templateUrl, containingFile);
                    var templatePromise = this.resourceLoader.preload(resourceUrl, { type: 'template', containingFile: containingFile });
                    // If the preload worked, then actually load and parse the template, and wait for any style
                    // URLs to resolve.
                    if (templatePromise !== undefined) {
                        return templatePromise.then(function () {
                            var templateDecl = _this.parseTemplateDeclaration(decorator, component, containingFile);
                            var template = _this.extractTemplate(node, templateDecl);
                            _this.preanalyzeTemplateCache.set(node, template);
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
                var templateDecl = this.parseTemplateDeclaration(decorator, component, containingFile);
                var template = this.extractTemplate(node, templateDecl);
                this.preanalyzeTemplateCache.set(node, template);
                return Promise.resolve(template);
            }
        };
        ComponentDecoratorHandler.prototype.extractTemplate = function (node, template) {
            if (template.isInline) {
                var sourceStr = void 0;
                var sourceParseRange = null;
                var templateContent = void 0;
                var sourceMapping = void 0;
                var escapedString = false;
                var sourceMapUrl = void 0;
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
                    var resolvedTemplate = this.evaluator.evaluate(template.expression);
                    if (typeof resolvedTemplate !== 'string') {
                        throw diagnostics_2.createValueHasWrongTypeError(template.expression, resolvedTemplate, 'template must be a string');
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
                return tslib_1.__assign(tslib_1.__assign({}, this._parseTemplate(template, sourceStr, sourceParseRange, escapedString, sourceMapUrl)), { content: templateContent, sourceMapping: sourceMapping, declaration: template });
            }
            else {
                var templateContent = this.resourceLoader.load(template.resolvedTemplateUrl);
                if (this.depTracker !== null) {
                    this.depTracker.addResourceDependency(node.getSourceFile(), file_system_1.absoluteFrom(template.resolvedTemplateUrl));
                }
                return tslib_1.__assign(tslib_1.__assign({}, this._parseTemplate(template, /* sourceStr */ templateContent, /* sourceParseRange */ null, 
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
        };
        ComponentDecoratorHandler.prototype._parseTemplate = function (template, sourceStr, sourceParseRange, escapedString, sourceMapUrl) {
            // We always normalize line endings if the template has been escaped (i.e. is inline).
            var i18nNormalizeLineEndingsInICUs = escapedString || this.i18nNormalizeLineEndingsInICUs;
            var parsedTemplate = compiler_1.parseTemplate(sourceStr, sourceMapUrl !== null && sourceMapUrl !== void 0 ? sourceMapUrl : '', {
                preserveWhitespaces: template.preserveWhitespaces,
                interpolationConfig: template.interpolationConfig,
                range: sourceParseRange !== null && sourceParseRange !== void 0 ? sourceParseRange : undefined,
                escapedString: escapedString,
                enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
                i18nNormalizeLineEndingsInICUs: i18nNormalizeLineEndingsInICUs,
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
            var diagNodes = compiler_1.parseTemplate(sourceStr, sourceMapUrl !== null && sourceMapUrl !== void 0 ? sourceMapUrl : '', {
                preserveWhitespaces: true,
                preserveLineEndings: true,
                interpolationConfig: template.interpolationConfig,
                range: sourceParseRange !== null && sourceParseRange !== void 0 ? sourceParseRange : undefined,
                escapedString: escapedString,
                enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
                i18nNormalizeLineEndingsInICUs: i18nNormalizeLineEndingsInICUs,
                leadingTriviaChars: [],
                alwaysAttemptHtmlToR3AstConversion: this.usePoisonedData,
            }).nodes;
            return tslib_1.__assign(tslib_1.__assign({}, parsedTemplate), { diagNodes: diagNodes, file: new compiler_1.ParseSourceFile(sourceStr, sourceMapUrl !== null && sourceMapUrl !== void 0 ? sourceMapUrl : '') });
        };
        ComponentDecoratorHandler.prototype.parseTemplateDeclaration = function (decorator, component, containingFile) {
            var preserveWhitespaces = this.defaultPreserveWhitespaces;
            if (component.has('preserveWhitespaces')) {
                var expr = component.get('preserveWhitespaces');
                var value = this.evaluator.evaluate(expr);
                if (typeof value !== 'boolean') {
                    throw diagnostics_2.createValueHasWrongTypeError(expr, value, 'preserveWhitespaces must be a boolean');
                }
                preserveWhitespaces = value;
            }
            var interpolationConfig = compiler_1.DEFAULT_INTERPOLATION_CONFIG;
            if (component.has('interpolation')) {
                var expr = component.get('interpolation');
                var value = this.evaluator.evaluate(expr);
                if (!Array.isArray(value) || value.length !== 2 ||
                    !value.every(function (element) { return typeof element === 'string'; })) {
                    throw diagnostics_2.createValueHasWrongTypeError(expr, value, 'interpolation must be an array with 2 elements of string type');
                }
                interpolationConfig = compiler_1.InterpolationConfig.fromArray(value);
            }
            if (component.has('templateUrl')) {
                var templateUrlExpr = component.get('templateUrl');
                var templateUrl = this.evaluator.evaluate(templateUrlExpr);
                if (typeof templateUrl !== 'string') {
                    throw diagnostics_2.createValueHasWrongTypeError(templateUrlExpr, templateUrl, 'templateUrl must be a string');
                }
                try {
                    var resourceUrl = this.resourceLoader.resolve(templateUrl, containingFile);
                    return {
                        isInline: false,
                        interpolationConfig: interpolationConfig,
                        preserveWhitespaces: preserveWhitespaces,
                        templateUrl: templateUrl,
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
                    interpolationConfig: interpolationConfig,
                    preserveWhitespaces: preserveWhitespaces,
                    expression: component.get('template'),
                    templateUrl: containingFile,
                    resolvedTemplateUrl: containingFile,
                };
            }
            else {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_MISSING_TEMPLATE, reflection_1.Decorator.nodeForError(decorator), 'component is missing a template');
            }
        };
        ComponentDecoratorHandler.prototype._resolveImportedFile = function (importedFile, expr, origin) {
            // If `importedFile` is not 'unknown' then it accurately reflects the source file that is
            // being imported.
            if (importedFile !== 'unknown') {
                return importedFile;
            }
            // Otherwise `expr` has to be inspected to determine the file that is being imported. If `expr`
            // is not an `ExternalExpr` then it does not correspond with an import, so return null in that
            // case.
            if (!(expr instanceof compiler_1.ExternalExpr)) {
                return null;
            }
            // Figure out what file is being imported.
            return this.moduleResolver.resolveModule(expr.value.moduleName, origin.fileName);
        };
        /**
         * Check whether adding an import from `origin` to the source-file corresponding to `expr` would
         * create a cyclic import.
         *
         * @returns a `Cycle` object if a cycle would be created, otherwise `null`.
         */
        ComponentDecoratorHandler.prototype._checkForCyclicImport = function (importedFile, expr, origin) {
            var imported = this._resolveImportedFile(importedFile, expr, origin);
            if (imported === null) {
                return null;
            }
            // Check whether the import is legal.
            return this.cycleAnalyzer.wouldCreateCycle(origin, imported);
        };
        ComponentDecoratorHandler.prototype._recordSyntheticImport = function (importedFile, expr, origin) {
            var imported = this._resolveImportedFile(importedFile, expr, origin);
            if (imported === null) {
                return;
            }
            this.cycleAnalyzer.recordSyntheticImport(origin, imported);
        };
        ComponentDecoratorHandler.prototype.makeResourceNotFoundError = function (file, nodeForError, resourceType) {
            var errorText;
            switch (resourceType) {
                case 0 /* Template */:
                    errorText = "Could not find template file '" + file + "'.";
                    break;
                case 1 /* StylesheetFromTemplate */:
                    errorText = "Could not find stylesheet file '" + file + "' linked from the template.";
                    break;
                case 2 /* StylesheetFromDecorator */:
                    errorText = "Could not find stylesheet file '" + file + "'.";
                    break;
            }
            return new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_RESOURCE_NOT_FOUND, nodeForError, errorText);
        };
        ComponentDecoratorHandler.prototype._extractTemplateStyleUrls = function (template) {
            if (template.styleUrls === null) {
                return [];
            }
            var nodeForError = getTemplateDeclarationNodeForError(template.declaration);
            return template.styleUrls.map(function (url) { return ({ url: url, source: 1 /* StylesheetFromTemplate */, nodeForError: nodeForError }); });
        };
        return ComponentDecoratorHandler;
    }());
    exports.ComponentDecoratorHandler = ComponentDecoratorHandler;
    function getTemplateRange(templateExpr) {
        var startPos = templateExpr.getStart() + 1;
        var _a = ts.getLineAndCharacterOfPosition(templateExpr.getSourceFile(), startPos), line = _a.line, character = _a.character;
        return {
            startPos: startPos,
            startLine: line,
            startCol: character,
            endPos: templateExpr.getEnd() - 1,
        };
    }
    /** Determines if the result of an evaluation is a string array. */
    function isStringArray(resolvedValue) {
        return Array.isArray(resolvedValue) && resolvedValue.every(function (elem) { return typeof elem === 'string'; });
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
        var name = ref.debugName || '(unknown)';
        var path = cycle.getPath().map(function (sf) { return sf.fileName; }).join(' -> ');
        var message = "The " + type + " '" + name + "' is used in the template but importing it would create a cycle: ";
        return diagnostics_1.makeRelatedInformation(ref.node, message + path);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBdWpCO0lBQ3ZqQixtREFBNkQ7SUFDN0QsK0JBQWlDO0lBR2pDLDJFQUEwRztJQUMxRywyRUFBeUQ7SUFDekQsbUVBQXdGO0lBRXhGLDZGQUEySztJQUUzSyxxRUFBK087SUFDL08sdUZBQW1GO0lBQ25GLDZEQUFtRDtJQUNuRCx5RUFBb0g7SUFFcEgsdUVBQThJO0lBTzlJLDJGQUE0RztJQUM1Ryx1RkFBNEY7SUFDNUYsbUZBQTBFO0lBQzFFLHFGQUFnRDtJQUNoRCx1RkFBMkM7SUFDM0MsNkVBQXlPO0lBRXpPLElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0lBQ2hELElBQU0sV0FBVyxHQUFVLEVBQUUsQ0FBQztJQStFOUI7O09BRUc7SUFDSDtRQUFxQywyQ0FBZTtRQUFwRDtZQUFBLHFFQXNFQztZQXJFQyxvQkFBYyxHQUF3QixFQUFFLENBQUM7WUFDekMsZUFBUyxHQUF3QixFQUFFLENBQUM7WUFDcEMsc0JBQWdCLEdBQUcsS0FBSyxDQUFDOztRQW1FM0IsQ0FBQztRQWpFVSx3Q0FBYyxHQUF2QixVQUF3QixjQUE4QixFQUFFLGlCQUFzQztZQUU1RixJQUFJLENBQUMsQ0FBQyxjQUFjLFlBQVksZUFBZSxDQUFDLEVBQUU7Z0JBQ2hELE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxzRkFBc0Y7WUFDdEYsOEZBQThGO1lBQzlGLFlBQVk7WUFDWixJQUFNLGtCQUFrQixHQUFHLFVBQUMsT0FBMEIsRUFBRSxRQUEyQjtnQkFDL0UsT0FBQSxpQ0FBZ0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUks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SUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDaEYsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRTtZQUM5QixPQUFPLHFGQUFxRixDQUFDO1NBQzlGO1FBRUQsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzFCLE9BQU8sMkVBQTJFLENBQUM7U0FDcEY7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMzQixPQUFPLHNGQUFzRixDQUFDO1NBQy9GO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZUNsYXNzTWV0YWRhdGEsIGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEsIGNvbXBpbGVEZWNsYXJlQ2xhc3NNZXRhZGF0YSwgY29tcGlsZURlY2xhcmVDb21wb25lbnRGcm9tTWV0YWRhdGEsIENvbnN0YW50UG9vbCwgQ3NzU2VsZWN0b3IsIERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLCBEZWNsYXJlQ29tcG9uZW50VGVtcGxhdGVJbmZvLCBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgRmFjdG9yeVRhcmdldCwgSW50ZXJwb2xhdGlvbkNvbmZpZywgTGV4ZXJSYW5nZSwgbWFrZUJpbmRpbmdQYXJzZXIsIFBhcnNlZFRlbXBsYXRlLCBQYXJzZVNvdXJjZUZpbGUsIHBhcnNlVGVtcGxhdGUsIFIzQ2xhc3NNZXRhZGF0YSwgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNUYXJnZXRCaW5kZXIsIFIzVXNlZERpcmVjdGl2ZU1ldGFkYXRhLCBTZWxlY3Rvck1hdGNoZXIsIFN0YXRlbWVudCwgVG1wbEFzdE5vZGUsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtWaWV3RW5jYXBzdWxhdGlvbn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2NvcmUnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q3ljbGUsIEN5Y2xlQW5hbHl6ZXIsIEN5Y2xlSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi4vLi4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvciwgbWFrZURpYWdub3N0aWMsIG1ha2VSZWxhdGVkSW5mb3JtYXRpb259IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCByZWxhdGl2ZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtJbXBvcnRlZEZpbGUsIE1vZHVsZVJlc29sdmVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEZXBlbmRlbmN5VHJhY2tlcn0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvYXBpJztcbmltcG9ydCB7ZXh0cmFjdFNlbWFudGljVHlwZVBhcmFtZXRlcnMsIGlzQXJyYXlFcXVhbCwgaXNSZWZlcmVuY2VFcXVhbCwgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIsIFNlbWFudGljUmVmZXJlbmNlLCBTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvc2VtYW50aWNfZ3JhcGgnO1xuaW1wb3J0IHtJbmRleGluZ0NvbnRleHR9IGZyb20gJy4uLy4uL2luZGV4ZXInO1xuaW1wb3J0IHtDbGFzc1Byb3BlcnR5TWFwcGluZywgQ29tcG9uZW50UmVzb3VyY2VzLCBEaXJlY3RpdmVNZXRhLCBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBleHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YSwgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5LCBNZXRhVHlwZSwgUmVzb3VyY2UsIFJlc291cmNlUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7RW51bVZhbHVlLCBQYXJ0aWFsRXZhbHVhdG9yLCBSZXNvbHZlZFZhbHVlfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge1BlcmZFdmVudCwgUGVyZlJlY29yZGVyfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25Ob2RlLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIFR5cGVDaGVja1Njb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlckZsYWdzLCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBUeXBlQ2hlY2tDb250ZXh0fSBmcm9tICcuLi8uLi90eXBlY2hlY2svYXBpJztcbmltcG9ydCB7RXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXJ9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9leHRlbmRlZC9hcGknO1xuaW1wb3J0IHtTdWJzZXRPZktleXN9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtYaTE4bkNvbnRleHR9IGZyb20gJy4uLy4uL3hpMThuJztcblxuaW1wb3J0IHtSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yLCBnZXREaXJlY3RpdmVEaWFnbm9zdGljcywgZ2V0UHJvdmlkZXJEaWFnbm9zdGljc30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RpcmVjdGl2ZVN5bWJvbCwgZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhLCBwYXJzZUZpZWxkQXJyYXlWYWx1ZX0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHtjb21waWxlRGVjbGFyZUZhY3RvcnksIGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZH0gZnJvbSAnLi9mYWN0b3J5JztcbmltcG9ydCB7ZXh0cmFjdENsYXNzTWV0YWRhdGF9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtOZ01vZHVsZVN5bWJvbH0gZnJvbSAnLi9uZ19tb2R1bGUnO1xuaW1wb3J0IHtjb21waWxlUmVzdWx0cywgZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGlzQW5ndWxhckNvcmVSZWZlcmVuY2UsIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UsIHJlYWRCYXNlQ2xhc3MsIHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LCB0b0ZhY3RvcnlNZXRhZGF0YSwgdW53cmFwRXhwcmVzc2lvbiwgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVuc30gZnJvbSAnLi91dGlsJztcblxuY29uc3QgRU1QVFlfTUFQID0gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KCk7XG5jb25zdCBFTVBUWV9BUlJBWTogYW55W10gPSBbXTtcblxuLyoqXG4gKiBUaGVzZSBmaWVsZHMgb2YgYFIzQ29tcG9uZW50TWV0YWRhdGFgIGFyZSB1cGRhdGVkIGluIHRoZSBgcmVzb2x2ZWAgcGhhc2UuXG4gKlxuICogVGhlIGBrZXlvZiBSM0NvbXBvbmVudE1ldGFkYXRhICZgIGNvbmRpdGlvbiBlbnN1cmVzIHRoYXQgb25seSBmaWVsZHMgb2YgYFIzQ29tcG9uZW50TWV0YWRhdGFgIGNhblxuICogYmUgaW5jbHVkZWQgaGVyZS5cbiAqL1xuZXhwb3J0IHR5cGUgQ29tcG9uZW50TWV0YWRhdGFSZXNvbHZlZEZpZWxkcyA9XG4gICAgU3Vic2V0T2ZLZXlzPFIzQ29tcG9uZW50TWV0YWRhdGEsICdkaXJlY3RpdmVzJ3wncGlwZXMnfCdkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSc+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvbmVudEFuYWx5c2lzRGF0YSB7XG4gIC8qKlxuICAgKiBgbWV0YWAgaW5jbHVkZXMgdGhvc2UgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCB3aGljaCBhcmUgY2FsY3VsYXRlZCBhdCBgYW5hbHl6ZWAgdGltZVxuICAgKiAobm90IGR1cmluZyByZXNvbHZlKS5cbiAgICovXG4gIG1ldGE6IE9taXQ8UjNDb21wb25lbnRNZXRhZGF0YSwgQ29tcG9uZW50TWV0YWRhdGFSZXNvbHZlZEZpZWxkcz47XG4gIGJhc2VDbGFzczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+fCdkeW5hbWljJ3xudWxsO1xuICB0eXBlQ2hlY2tNZXRhOiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhO1xuICB0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlO1xuICBjbGFzc01ldGFkYXRhOiBSM0NsYXNzTWV0YWRhdGF8bnVsbDtcblxuICBpbnB1dHM6IENsYXNzUHJvcGVydHlNYXBwaW5nO1xuICBvdXRwdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZztcblxuICAvKipcbiAgICogUHJvdmlkZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBgcHJvdmlkZXJzYCBmaWVsZCBvZiB0aGUgY29tcG9uZW50IGFubm90YXRpb24gd2hpY2ggd2lsbCByZXF1aXJlXG4gICAqIGFuIEFuZ3VsYXIgZmFjdG9yeSBkZWZpbml0aW9uIGF0IHJ1bnRpbWUuXG4gICAqL1xuICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlcnMgZXh0cmFjdGVkIGZyb20gdGhlIGB2aWV3UHJvdmlkZXJzYCBmaWVsZCBvZiB0aGUgY29tcG9uZW50IGFubm90YXRpb24gd2hpY2ggd2lsbFxuICAgKiByZXF1aXJlIGFuIEFuZ3VsYXIgZmFjdG9yeSBkZWZpbml0aW9uIGF0IHJ1bnRpbWUuXG4gICAqL1xuICB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcblxuICByZXNvdXJjZXM6IENvbXBvbmVudFJlc291cmNlcztcblxuICAvKipcbiAgICogYHN0eWxlVXJsc2AgZXh0cmFjdGVkIGZyb20gdGhlIGRlY29yYXRvciwgaWYgcHJlc2VudC5cbiAgICovXG4gIHN0eWxlVXJsczogU3R5bGVVcmxNZXRhW118bnVsbDtcblxuICAvKipcbiAgICogSW5saW5lIHN0eWxlc2hlZXRzIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNvcmF0b3IsIGlmIHByZXNlbnQuXG4gICAqL1xuICBpbmxpbmVTdHlsZXM6IHN0cmluZ1tdfG51bGw7XG5cbiAgaXNQb2lzb25lZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgQ29tcG9uZW50UmVzb2x1dGlvbkRhdGEgPSBQaWNrPFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuXG4vKipcbiAqIFRoZSBsaXRlcmFsIHN0eWxlIHVybCBleHRyYWN0ZWQgZnJvbSB0aGUgZGVjb3JhdG9yLCBhbG9uZyB3aXRoIG1ldGFkYXRhIGZvciBkaWFnbm9zdGljcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdHlsZVVybE1ldGEge1xuICB1cmw6IHN0cmluZztcbiAgbm9kZUZvckVycm9yOiB0cy5Ob2RlO1xuICBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGV8XG4gICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgb3JpZ2luIG9mIGEgcmVzb3VyY2UgaW4gdGhlIGFwcGxpY2F0aW9uIGNvZGUuIFRoaXMgaXMgdXNlZCBmb3IgY3JlYXRpbmdcbiAqIGRpYWdub3N0aWNzLCBzbyB3ZSBjYW4gcG9pbnQgdG8gdGhlIHJvb3QgY2F1c2Ugb2YgYW4gZXJyb3IgaW4gdGhlIGFwcGxpY2F0aW9uIGNvZGUuXG4gKlxuICogQSB0ZW1wbGF0ZSByZXNvdXJjZSBjb21lcyBmcm9tIHRoZSBgdGVtcGxhdGVVcmxgIHByb3BlcnR5IG9uIHRoZSBjb21wb25lbnQgZGVjb3JhdG9yLlxuICpcbiAqIFN0eWxlc2hlZXRzIHJlc291cmNlcyBjYW4gY29tZSBmcm9tIGVpdGhlciB0aGUgYHN0eWxlVXJsc2AgcHJvcGVydHkgb24gdGhlIGNvbXBvbmVudCBkZWNvcmF0b3IsXG4gKiBvciBmcm9tIGlubGluZSBgc3R5bGVgIHRhZ3MgYW5kIHN0eWxlIGxpbmtzIG9uIHRoZSBleHRlcm5hbCB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3Mge1xuICBUZW1wbGF0ZSxcbiAgU3R5bGVzaGVldEZyb21UZW1wbGF0ZSxcbiAgU3R5bGVzaGVldEZyb21EZWNvcmF0b3IsXG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBBbmd1bGFyIGNvbXBvbmVudC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN5bWJvbCBleHRlbmRzIERpcmVjdGl2ZVN5bWJvbCB7XG4gIHVzZWREaXJlY3RpdmVzOiBTZW1hbnRpY1JlZmVyZW5jZVtdID0gW107XG4gIHVzZWRQaXBlczogU2VtYW50aWNSZWZlcmVuY2VbXSA9IFtdO1xuICBpc1JlbW90ZWx5U2NvcGVkID0gZmFsc2U7XG5cbiAgb3ZlcnJpZGUgaXNFbWl0QWZmZWN0ZWQocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sLCBwdWJsaWNBcGlBZmZlY3RlZDogU2V0PFNlbWFudGljU3ltYm9sPik6XG4gICAgICBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIENvbXBvbmVudFN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhbiBlcXVhbGl0eSBmdW5jdGlvbiB0aGF0IGNvbnNpZGVycyBzeW1ib2xzIGVxdWFsIGlmIHRoZXkgcmVwcmVzZW50IHRoZSBzYW1lXG4gICAgLy8gZGVjbGFyYXRpb24sIGJ1dCBvbmx5IGlmIHRoZSBzeW1ib2wgaW4gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gZG9lcyBub3QgaGF2ZSBpdHMgcHVibGljIEFQSVxuICAgIC8vIGFmZmVjdGVkLlxuICAgIGNvbnN0IGlzU3ltYm9sVW5hZmZlY3RlZCA9IChjdXJyZW50OiBTZW1hbnRpY1JlZmVyZW5jZSwgcHJldmlvdXM6IFNlbWFudGljUmVmZXJlbmNlKSA9PlxuICAgICAgICBpc1JlZmVyZW5jZUVxdWFsKGN1cnJlbnQsIHByZXZpb3VzKSAmJiAhcHVibGljQXBpQWZmZWN0ZWQuaGFzKGN1cnJlbnQuc3ltYm9sKTtcblxuICAgIC8vIFRoZSBlbWl0IG9mIGEgY29tcG9uZW50IGlzIGFmZmVjdGVkIGlmIGVpdGhlciBvZiB0aGUgZm9sbG93aW5nIGlzIHRydWU6XG4gICAgLy8gIDEuIFRoZSBjb21wb25lbnQgdXNlZCB0byBiZSByZW1vdGVseSBzY29wZWQgYnV0IG5vIGxvbmdlciBpcywgb3IgdmljZSB2ZXJzYS5cbiAgICAvLyAgMi4gVGhlIGxpc3Qgb2YgdXNlZCBkaXJlY3RpdmVzIGhhcyBjaGFuZ2VkIG9yIGFueSBvZiB0aG9zZSBkaXJlY3RpdmVzIGhhdmUgaGFkIHRoZWlyIHB1YmxpY1xuICAgIC8vICAgICBBUEkgY2hhbmdlZC4gSWYgdGhlIHVzZWQgZGlyZWN0aXZlcyBoYXZlIGJlZW4gcmVvcmRlcmVkIGJ1dCBub3Qgb3RoZXJ3aXNlIGFmZmVjdGVkIHRoZW5cbiAgICAvLyAgICAgdGhlIGNvbXBvbmVudCBtdXN0IHN0aWxsIGJlIHJlLWVtaXR0ZWQsIGFzIHRoaXMgbWF5IGFmZmVjdCBkaXJlY3RpdmUgaW5zdGFudGlhdGlvbiBvcmRlci5cbiAgICAvLyAgMy4gVGhlIGxpc3Qgb2YgdXNlZCBwaXBlcyBoYXMgY2hhbmdlZCwgb3IgYW55IG9mIHRob3NlIHBpcGVzIGhhdmUgaGFkIHRoZWlyIHB1YmxpYyBBUElcbiAgICAvLyAgICAgY2hhbmdlZC5cbiAgICByZXR1cm4gdGhpcy5pc1JlbW90ZWx5U2NvcGVkICE9PSBwcmV2aW91c1N5bWJvbC5pc1JlbW90ZWx5U2NvcGVkIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy51c2VkRGlyZWN0aXZlcywgcHJldmlvdXNTeW1ib2wudXNlZERpcmVjdGl2ZXMsIGlzU3ltYm9sVW5hZmZlY3RlZCkgfHxcbiAgICAgICAgIWlzQXJyYXlFcXVhbCh0aGlzLnVzZWRQaXBlcywgcHJldmlvdXNTeW1ib2wudXNlZFBpcGVzLCBpc1N5bWJvbFVuYWZmZWN0ZWQpO1xuICB9XG5cbiAgb3ZlcnJpZGUgaXNUeXBlQ2hlY2tCbG9ja0FmZmVjdGVkKFxuICAgICAgcHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sLCB0eXBlQ2hlY2tBcGlBZmZlY3RlZDogU2V0PFNlbWFudGljU3ltYm9sPik6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgQ29tcG9uZW50U3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gVG8gdmVyaWZ5IHRoYXQgYSB1c2VkIGRpcmVjdGl2ZSBpcyBub3QgYWZmZWN0ZWQgd2UgbmVlZCB0byB2ZXJpZnkgdGhhdCBpdHMgZnVsbCBpbmhlcml0YW5jZVxuICAgIC8vIGNoYWluIGlzIG5vdCBwcmVzZW50IGluIGB0eXBlQ2hlY2tBcGlBZmZlY3RlZGAuXG4gICAgY29uc3QgaXNJbmhlcml0YW5jZUNoYWluQWZmZWN0ZWQgPSAoc3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4gPT4ge1xuICAgICAgbGV0IGN1cnJlbnRTeW1ib2w6IFNlbWFudGljU3ltYm9sfG51bGwgPSBzeW1ib2w7XG4gICAgICB3aGlsZSAoY3VycmVudFN5bWJvbCBpbnN0YW5jZW9mIERpcmVjdGl2ZVN5bWJvbCkge1xuICAgICAgICBpZiAodHlwZUNoZWNrQXBpQWZmZWN0ZWQuaGFzKGN1cnJlbnRTeW1ib2wpKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudFN5bWJvbCA9IGN1cnJlbnRTeW1ib2wuYmFzZUNsYXNzO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIC8vIENyZWF0ZSBhbiBlcXVhbGl0eSBmdW5jdGlvbiB0aGF0IGNvbnNpZGVycyBkaXJlY3RpdmVzIGVxdWFsIGlmIHRoZXkgcmVwcmVzZW50IHRoZSBzYW1lXG4gICAgLy8gZGVjbGFyYXRpb24gYW5kIGlmIHRoZSBzeW1ib2wgYW5kIGFsbCBzeW1ib2xzIGl0IGluaGVyaXRzIGZyb20gaW4gdGhlIGN1cnJlbnQgY29tcGlsYXRpb25cbiAgICAvLyBkbyBub3QgaGF2ZSB0aGVpciB0eXBlLWNoZWNrIEFQSSBhZmZlY3RlZC5cbiAgICBjb25zdCBpc0RpcmVjdGl2ZVVuYWZmZWN0ZWQgPSAoY3VycmVudDogU2VtYW50aWNSZWZlcmVuY2UsIHByZXZpb3VzOiBTZW1hbnRpY1JlZmVyZW5jZSkgPT5cbiAgICAgICAgaXNSZWZlcmVuY2VFcXVhbChjdXJyZW50LCBwcmV2aW91cykgJiYgIWlzSW5oZXJpdGFuY2VDaGFpbkFmZmVjdGVkKGN1cnJlbnQuc3ltYm9sKTtcblxuICAgIC8vIENyZWF0ZSBhbiBlcXVhbGl0eSBmdW5jdGlvbiB0aGF0IGNvbnNpZGVycyBwaXBlcyBlcXVhbCBpZiB0aGV5IHJlcHJlc2VudCB0aGUgc2FtZVxuICAgIC8vIGRlY2xhcmF0aW9uIGFuZCBpZiB0aGUgc3ltYm9sIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIGRvZXMgbm90IGhhdmUgaXRzIHR5cGUtY2hlY2tcbiAgICAvLyBBUEkgYWZmZWN0ZWQuXG4gICAgY29uc3QgaXNQaXBlVW5hZmZlY3RlZCA9IChjdXJyZW50OiBTZW1hbnRpY1JlZmVyZW5jZSwgcHJldmlvdXM6IFNlbWFudGljUmVmZXJlbmNlKSA9PlxuICAgICAgICBpc1JlZmVyZW5jZUVxdWFsKGN1cnJlbnQsIHByZXZpb3VzKSAmJiAhdHlwZUNoZWNrQXBpQWZmZWN0ZWQuaGFzKGN1cnJlbnQuc3ltYm9sKTtcblxuICAgIC8vIFRoZSBlbWl0IG9mIGEgdHlwZS1jaGVjayBibG9jayBvZiBhIGNvbXBvbmVudCBpcyBhZmZlY3RlZCBpZiBlaXRoZXIgb2YgdGhlIGZvbGxvd2luZyBpcyB0cnVlOlxuICAgIC8vICAxLiBUaGUgbGlzdCBvZiB1c2VkIGRpcmVjdGl2ZXMgaGFzIGNoYW5nZWQgb3IgYW55IG9mIHRob3NlIGRpcmVjdGl2ZXMgaGF2ZSBoYWQgdGhlaXJcbiAgICAvLyAgICAgdHlwZS1jaGVjayBBUEkgY2hhbmdlZC5cbiAgICAvLyAgMi4gVGhlIGxpc3Qgb2YgdXNlZCBwaXBlcyBoYXMgY2hhbmdlZCwgb3IgYW55IG9mIHRob3NlIHBpcGVzIGhhdmUgaGFkIHRoZWlyIHR5cGUtY2hlY2sgQVBJXG4gICAgLy8gICAgIGNoYW5nZWQuXG4gICAgcmV0dXJuICFpc0FycmF5RXF1YWwoXG4gICAgICAgICAgICAgICB0aGlzLnVzZWREaXJlY3RpdmVzLCBwcmV2aW91c1N5bWJvbC51c2VkRGlyZWN0aXZlcywgaXNEaXJlY3RpdmVVbmFmZmVjdGVkKSB8fFxuICAgICAgICAhaXNBcnJheUVxdWFsKHRoaXMudXNlZFBpcGVzLCBwcmV2aW91c1N5bWJvbC51c2VkUGlwZXMsIGlzUGlwZVVuYWZmZWN0ZWQpO1xuICB9XG59XG5cbi8qKlxuICogYERlY29yYXRvckhhbmRsZXJgIHdoaWNoIGhhbmRsZXMgdGhlIGBAQ29tcG9uZW50YCBhbm5vdGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3IsIENvbXBvbmVudEFuYWx5c2lzRGF0YSwgQ29tcG9uZW50U3ltYm9sLCBDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcixcbiAgICAgIHByaXZhdGUgc2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLCBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgdHlwZUNoZWNrU2NvcGVSZWdpc3RyeTogVHlwZUNoZWNrU2NvcGVSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgcmVzb3VyY2VSZWdpc3RyeTogUmVzb3VyY2VSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJlc291cmNlTG9hZGVyOiBSZXNvdXJjZUxvYWRlciwgcHJpdmF0ZSByb290RGlyczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0UHJlc2VydmVXaGl0ZXNwYWNlczogYm9vbGVhbiwgcHJpdmF0ZSBpMThuVXNlRXh0ZXJuYWxJZHM6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IGJvb2xlYW4sIHByaXZhdGUgdXNlUG9pc29uZWREYXRhOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM6IGJvb2xlYW58dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXIsIHByaXZhdGUgY3ljbGVBbmFseXplcjogQ3ljbGVBbmFseXplcixcbiAgICAgIHByaXZhdGUgY3ljbGVIYW5kbGluZ1N0cmF0ZWd5OiBDeWNsZUhhbmRsaW5nU3RyYXRlZ3ksIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHByaXZhdGUgZGVwVHJhY2tlcjogRGVwZW5kZW5jeVRyYWNrZXJ8bnVsbCxcbiAgICAgIHByaXZhdGUgaW5qZWN0YWJsZVJlZ2lzdHJ5OiBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyfG51bGwsXG4gICAgICBwcml2YXRlIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyOiBib29sZWFuLCBwcml2YXRlIHBlcmY6IFBlcmZSZWNvcmRlcikge31cblxuICBwcml2YXRlIGxpdGVyYWxDYWNoZSA9IG5ldyBNYXA8RGVjb3JhdG9yLCB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbj4oKTtcbiAgcHJpdmF0ZSBlbGVtZW50U2NoZW1hUmVnaXN0cnkgPSBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCk7XG5cbiAgLyoqXG4gICAqIER1cmluZyB0aGUgYXN5bmNocm9ub3VzIHByZWFuYWx5emUgcGhhc2UsIGl0J3MgbmVjZXNzYXJ5IHRvIHBhcnNlIHRoZSB0ZW1wbGF0ZSB0byBleHRyYWN0XG4gICAqIGFueSBwb3RlbnRpYWwgPGxpbms+IHRhZ3Mgd2hpY2ggbWlnaHQgbmVlZCB0byBiZSBsb2FkZWQuIFRoaXMgY2FjaGUgZW5zdXJlcyB0aGF0IHdvcmsgaXMgbm90XG4gICAqIHRocm93biBhd2F5LCBhbmQgdGhlIHBhcnNlZCB0ZW1wbGF0ZSBpcyByZXVzZWQgZHVyaW5nIHRoZSBhbmFseXplIHBoYXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBwcmVhbmFseXplVGVtcGxhdGVDYWNoZSA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2U+KCk7XG4gIHByaXZhdGUgcHJlYW5hbHl6ZVN0eWxlc0NhY2hlID0gbmV3IE1hcDxEZWNsYXJhdGlvbk5vZGUsIHN0cmluZ1tdfG51bGw+KCk7XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG4gIHJlYWRvbmx5IG5hbWUgPSBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLm5hbWU7XG5cbiAgZGV0ZWN0KG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ0NvbXBvbmVudCcsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBkZWNvcmF0b3IsXG4gICAgICAgIG1ldGFkYXRhOiBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHByZWFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3I+KTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIC8vIEluIHByZWFuYWx5emUsIHJlc291cmNlIFVSTHMgYXNzb2NpYXRlZCB3aXRoIHRoZSBjb21wb25lbnQgYXJlIGFzeW5jaHJvbm91c2x5IHByZWxvYWRlZCB2aWFcbiAgICAvLyB0aGUgcmVzb3VyY2VMb2FkZXIuIFRoaXMgaXMgdGhlIG9ubHkgdGltZSBhc3luYyBvcGVyYXRpb25zIGFyZSBhbGxvd2VkIGZvciBhIGNvbXBvbmVudC5cbiAgICAvLyBUaGVzZSByZXNvdXJjZXMgYXJlOlxuICAgIC8vXG4gICAgLy8gLSB0aGUgdGVtcGxhdGVVcmwsIGlmIHRoZXJlIGlzIG9uZVxuICAgIC8vIC0gYW55IHN0eWxlVXJscyBpZiBwcmVzZW50XG4gICAgLy8gLSBhbnkgc3R5bGVzaGVldHMgcmVmZXJlbmNlZCBmcm9tIDxsaW5rPiB0YWdzIGluIHRoZSB0ZW1wbGF0ZSBpdHNlbGZcbiAgICAvL1xuICAgIC8vIEFzIGEgcmVzdWx0IG9mIHRoZSBsYXN0IG9uZSwgdGhlIHRlbXBsYXRlIG11c3QgYmUgcGFyc2VkIGFzIHBhcnQgb2YgcHJlYW5hbHlzaXMgdG8gZXh0cmFjdFxuICAgIC8vIDxsaW5rPiB0YWdzLCB3aGljaCBtYXkgaW52b2x2ZSB3YWl0aW5nIGZvciB0aGUgdGVtcGxhdGVVcmwgdG8gYmUgcmVzb2x2ZWQgZmlyc3QuXG5cbiAgICAvLyBJZiBwcmVsb2FkaW5nIGlzbid0IHBvc3NpYmxlLCB0aGVuIHNraXAgdGhpcyBzdGVwLlxuICAgIGlmICghdGhpcy5yZXNvdXJjZUxvYWRlci5jYW5QcmVsb2FkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGEgPSB0aGlzLl9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3IpO1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICBjb25zdCByZXNvbHZlU3R5bGVVcmwgPSAoc3R5bGVVcmw6IHN0cmluZyk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5yZXNvdXJjZUxvYWRlci5yZXNvbHZlKHN0eWxlVXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQocmVzb3VyY2VVcmwsIHt0eXBlOiAnc3R5bGUnLCBjb250YWluaW5nRmlsZX0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIERvbid0IHdvcnJ5IGFib3V0IGZhaWx1cmVzIHRvIHByZWxvYWQuIFdlIGNhbiBoYW5kbGUgdGhpcyBwcm9ibGVtIGR1cmluZyBhbmFseXNpcyBieVxuICAgICAgICAvLyBwcm9kdWNpbmcgYSBkaWFnbm9zdGljLlxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBBIFByb21pc2UgdGhhdCB3YWl0cyBmb3IgdGhlIHRlbXBsYXRlIGFuZCBhbGwgPGxpbms+ZWQgc3R5bGVzIHdpdGhpbiBpdCB0byBiZSBwcmVsb2FkZWQuXG4gICAgY29uc3QgdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzID1cbiAgICAgICAgdGhpcy5fcHJlbG9hZEFuZFBhcnNlVGVtcGxhdGUobm9kZSwgZGVjb3JhdG9yLCBjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKVxuICAgICAgICAgICAgLnRoZW4oKHRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2V8bnVsbCk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkID0+IHtcbiAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh0ZW1wbGF0ZS5zdHlsZVVybHMubWFwKHN0eWxlVXJsID0+IHJlc29sdmVTdHlsZVVybChzdHlsZVVybCkpKVxuICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgLy8gRXh0cmFjdCBhbGwgdGhlIHN0eWxlVXJscyBpbiB0aGUgZGVjb3JhdG9yLlxuICAgIGNvbnN0IGNvbXBvbmVudFN0eWxlVXJscyA9IHRoaXMuX2V4dHJhY3RDb21wb25lbnRTdHlsZVVybHMoY29tcG9uZW50KTtcblxuICAgIC8vIEV4dHJhY3QgaW5saW5lIHN0eWxlcywgcHJvY2VzcywgYW5kIGNhY2hlIGZvciB1c2UgaW4gc3luY2hyb25vdXMgYW5hbHl6ZSBwaGFzZVxuICAgIGxldCBpbmxpbmVTdHlsZXM7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3N0eWxlcycpKSB7XG4gICAgICBjb25zdCBsaXRTdHlsZXMgPSBwYXJzZUZpZWxkQXJyYXlWYWx1ZShjb21wb25lbnQsICdzdHlsZXMnLCB0aGlzLmV2YWx1YXRvcik7XG4gICAgICBpZiAobGl0U3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMucHJlYW5hbHl6ZVN0eWxlc0NhY2hlLnNldChub2RlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlubGluZVN0eWxlcyA9IFByb21pc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hbGwobGl0U3R5bGVzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZSA9PiB0aGlzLnJlc291cmNlTG9hZGVyLnByZXByb2Nlc3NJbmxpbmUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlLCB7dHlwZTogJ3N0eWxlJywgY29udGFpbmluZ0ZpbGV9KSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihzdHlsZXMgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByZWFuYWx5emVTdHlsZXNDYWNoZS5zZXQobm9kZSwgc3R5bGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnByZWFuYWx5emVTdHlsZXNDYWNoZS5zZXQobm9kZSwgbnVsbCk7XG4gICAgfVxuXG4gICAgLy8gV2FpdCBmb3IgYm90aCB0aGUgdGVtcGxhdGUgYW5kIGFsbCBzdHlsZVVybCByZXNvdXJjZXMgdG8gcmVzb2x2ZS5cbiAgICByZXR1cm4gUHJvbWlzZVxuICAgICAgICAuYWxsKFtcbiAgICAgICAgICB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXMsIGlubGluZVN0eWxlcyxcbiAgICAgICAgICAuLi5jb21wb25lbnRTdHlsZVVybHMubWFwKHN0eWxlVXJsID0+IHJlc29sdmVTdHlsZVVybChzdHlsZVVybC51cmwpKVxuICAgICAgICBdKVxuICAgICAgICAudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICB9XG5cbiAgYW5hbHl6ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPixcbiAgICAgIGZsYWdzOiBIYW5kbGVyRmxhZ3MgPSBIYW5kbGVyRmxhZ3MuTk9ORSk6IEFuYWx5c2lzT3V0cHV0PENvbXBvbmVudEFuYWx5c2lzRGF0YT4ge1xuICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5BbmFseXplQ29tcG9uZW50KTtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIHRoaXMubGl0ZXJhbENhY2hlLmRlbGV0ZShkZWNvcmF0b3IpO1xuXG4gICAgbGV0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW118dW5kZWZpbmVkO1xuICAgIGxldCBpc1BvaXNvbmVkID0gZmFsc2U7XG4gICAgLy8gQENvbXBvbmVudCBpbmhlcml0cyBARGlyZWN0aXZlLCBzbyBiZWdpbiBieSBleHRyYWN0aW5nIHRoZSBARGlyZWN0aXZlIG1ldGFkYXRhIGFuZCBidWlsZGluZ1xuICAgIC8vIG9uIGl0LlxuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9IGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICAgICAgbm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuaXNDb3JlLCBmbGFncyxcbiAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcixcbiAgICAgICAgdGhpcy5lbGVtZW50U2NoZW1hUmVnaXN0cnkuZ2V0RGVmYXVsdENvbXBvbmVudEVsZW1lbnROYW1lKCkpO1xuICAgIGlmIChkaXJlY3RpdmVSZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YWAgcmV0dXJucyB1bmRlZmluZWQgd2hlbiB0aGUgQERpcmVjdGl2ZSBoYXMgYGppdDogdHJ1ZWAuIEluIHRoaXNcbiAgICAgIC8vIGNhc2UsIGNvbXBpbGF0aW9uIG9mIHRoZSBkZWNvcmF0b3IgaXMgc2tpcHBlZC4gUmV0dXJuaW5nIGFuIGVtcHR5IG9iamVjdCBzaWduaWZpZXNcbiAgICAgIC8vIHRoYXQgbm8gYW5hbHlzaXMgd2FzIHByb2R1Y2VkLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8vIE5leHQsIHJlYWQgdGhlIGBAQ29tcG9uZW50YC1zcGVjaWZpYyBmaWVsZHMuXG4gICAgY29uc3Qge2RlY29yYXRvcjogY29tcG9uZW50LCBtZXRhZGF0YSwgaW5wdXRzLCBvdXRwdXRzfSA9IGRpcmVjdGl2ZVJlc3VsdDtcbiAgICBjb25zdCBlbmNhcHN1bGF0aW9uOiBudW1iZXIgPVxuICAgICAgICB0aGlzLl9yZXNvbHZlRW51bVZhbHVlKGNvbXBvbmVudCwgJ2VuY2Fwc3VsYXRpb24nLCAnVmlld0VuY2Fwc3VsYXRpb24nKSA/P1xuICAgICAgICBWaWV3RW5jYXBzdWxhdGlvbi5FbXVsYXRlZDtcbiAgICBjb25zdCBjaGFuZ2VEZXRlY3Rpb246IG51bWJlcnxudWxsID1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZUVudW1WYWx1ZShjb21wb25lbnQsICdjaGFuZ2VEZXRlY3Rpb24nLCAnQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3knKTtcblxuICAgIGxldCBhbmltYXRpb25zOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdhbmltYXRpb25zJykpIHtcbiAgICAgIGFuaW1hdGlvbnMgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNvbXBvbmVudC5nZXQoJ2FuaW1hdGlvbnMnKSEpO1xuICAgIH1cblxuICAgIC8vIEdvIHRocm91Z2ggdGhlIHJvb3QgZGlyZWN0b3JpZXMgZm9yIHRoaXMgcHJvamVjdCwgYW5kIHNlbGVjdCB0aGUgb25lIHdpdGggdGhlIHNtYWxsZXN0XG4gICAgLy8gcmVsYXRpdmUgcGF0aCByZXByZXNlbnRhdGlvbi5cbiAgICBjb25zdCByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aCA9IHRoaXMucm9vdERpcnMucmVkdWNlPHN0cmluZ3x1bmRlZmluZWQ+KChwcmV2aW91cywgcm9vdERpcikgPT4ge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcmVsYXRpdmUoYWJzb2x1dGVGcm9tKHJvb3REaXIpLCBhYnNvbHV0ZUZyb20oY29udGFpbmluZ0ZpbGUpKTtcbiAgICAgIGlmIChwcmV2aW91cyA9PT0gdW5kZWZpbmVkIHx8IGNhbmRpZGF0ZS5sZW5ndGggPCBwcmV2aW91cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cztcbiAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQpITtcblxuXG4gICAgLy8gTm90ZSB0aGF0IHdlIGNvdWxkIHRlY2huaWNhbGx5IGNvbWJpbmUgdGhlIGB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeWAgYW5kXG4gICAgLy8gYHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnlgIGludG8gYSBzaW5nbGUgc2V0LCBidXQgd2Uga2VlcCB0aGUgc2VwYXJhdGUgc28gdGhhdFxuICAgIC8vIHdlIGNhbiBkaXN0aW5ndWlzaCB3aGVyZSBhbiBlcnJvciBpcyBjb21pbmcgZnJvbSB3aGVuIGxvZ2dpbmcgdGhlIGRpYWdub3N0aWNzIGluIGByZXNvbHZlYC5cbiAgICBsZXQgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGwgPSBudWxsO1xuICAgIGxldCBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsID0gbnVsbDtcbiAgICBsZXQgd3JhcHBlZFZpZXdQcm92aWRlcnM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoY29tcG9uZW50Lmhhcygndmlld1Byb3ZpZGVycycpKSB7XG4gICAgICBjb25zdCB2aWV3UHJvdmlkZXJzID0gY29tcG9uZW50LmdldCgndmlld1Byb3ZpZGVycycpITtcbiAgICAgIHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ID1cbiAgICAgICAgICByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSh2aWV3UHJvdmlkZXJzLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgd3JhcHBlZFZpZXdQcm92aWRlcnMgPSBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgPyB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKHZpZXdQcm92aWRlcnMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlld1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3Byb3ZpZGVycycpKSB7XG4gICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ID0gcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkoXG4gICAgICAgICAgY29tcG9uZW50LmdldCgncHJvdmlkZXJzJykhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHRoZSB0ZW1wbGF0ZS5cbiAgICAvLyBJZiBhIHByZWFuYWx5emUgcGhhc2Ugd2FzIGV4ZWN1dGVkLCB0aGUgdGVtcGxhdGUgbWF5IGFscmVhZHkgZXhpc3QgaW4gcGFyc2VkIGZvcm0sIHNvIGNoZWNrXG4gICAgLy8gdGhlIHByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLlxuICAgIC8vIEV4dHJhY3QgYSBjbG9zdXJlIG9mIHRoZSB0ZW1wbGF0ZSBwYXJzaW5nIGNvZGUgc28gdGhhdCBpdCBjYW4gYmUgcmVwYXJzZWQgd2l0aCBkaWZmZXJlbnRcbiAgICAvLyBvcHRpb25zIGlmIG5lZWRlZCwgbGlrZSBpbiB0aGUgaW5kZXhpbmcgcGlwZWxpbmUuXG4gICAgbGV0IHRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2U7XG4gICAgaWYgKHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUgd2FzIHBhcnNlZCBpbiBwcmVhbmFseXplLiBVc2UgaXQgYW5kIGRlbGV0ZSBpdCB0byBzYXZlIG1lbW9yeS5cbiAgICAgIGNvbnN0IHByZWFuYWx5emVkID0gdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5nZXQobm9kZSkhO1xuICAgICAgdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5kZWxldGUobm9kZSk7XG5cbiAgICAgIHRlbXBsYXRlID0gcHJlYW5hbHl6ZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlRGVjbCA9IHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlUmVzb3VyY2UgPVxuICAgICAgICB0ZW1wbGF0ZS5kZWNsYXJhdGlvbi5pc0lubGluZSA/IHtwYXRoOiBudWxsLCBleHByZXNzaW9uOiBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpIX0gOiB7XG4gICAgICAgICAgcGF0aDogYWJzb2x1dGVGcm9tKHRlbXBsYXRlLmRlY2xhcmF0aW9uLnJlc29sdmVkVGVtcGxhdGVVcmwpLFxuICAgICAgICAgIGV4cHJlc3Npb246IHRlbXBsYXRlLnNvdXJjZU1hcHBpbmcubm9kZVxuICAgICAgICB9O1xuXG4gICAgLy8gRmlndXJlIG91dCB0aGUgc2V0IG9mIHN0eWxlcy4gVGhlIG9yZGVyaW5nIGhlcmUgaXMgaW1wb3J0YW50OiBleHRlcm5hbCByZXNvdXJjZXMgKHN0eWxlVXJscylcbiAgICAvLyBwcmVjZWRlIGlubGluZSBzdHlsZXMsIGFuZCBzdHlsZXMgZGVmaW5lZCBpbiB0aGUgdGVtcGxhdGUgb3ZlcnJpZGUgc3R5bGVzIGRlZmluZWQgaW4gdGhlXG4gICAgLy8gY29tcG9uZW50LlxuICAgIGxldCBzdHlsZXM6IHN0cmluZ1tdID0gW107XG5cbiAgICBjb25zdCBzdHlsZVJlc291cmNlcyA9IHRoaXMuX2V4dHJhY3RTdHlsZVJlc291cmNlcyhjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICBjb25zdCBzdHlsZVVybHM6IFN0eWxlVXJsTWV0YVtdID0gW1xuICAgICAgLi4udGhpcy5fZXh0cmFjdENvbXBvbmVudFN0eWxlVXJscyhjb21wb25lbnQpLCAuLi50aGlzLl9leHRyYWN0VGVtcGxhdGVTdHlsZVVybHModGVtcGxhdGUpXG4gICAgXTtcblxuICAgIGZvciAoY29uc3Qgc3R5bGVVcmwgb2Ygc3R5bGVVcmxzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybC51cmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VTdHIgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQocmVzb3VyY2VVcmwpO1xuICAgICAgICBzdHlsZXMucHVzaChyZXNvdXJjZVN0cik7XG4gICAgICAgIGlmICh0aGlzLmRlcFRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgICAgICB0aGlzLmRlcFRyYWNrZXIuYWRkUmVzb3VyY2VEZXBlbmRlbmN5KG5vZGUuZ2V0U291cmNlRmlsZSgpLCBhYnNvbHV0ZUZyb20ocmVzb3VyY2VVcmwpKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIGlmIChkaWFnbm9zdGljcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXNvdXJjZVR5cGUgPVxuICAgICAgICAgICAgc3R5bGVVcmwuc291cmNlID09PSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvciA/XG4gICAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvciA6XG4gICAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbVRlbXBsYXRlO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgICAgdGhpcy5tYWtlUmVzb3VyY2VOb3RGb3VuZEVycm9yKHN0eWxlVXJsLnVybCwgc3R5bGVVcmwubm9kZUZvckVycm9yLCByZXNvdXJjZVR5cGUpXG4gICAgICAgICAgICAgICAgLnRvRGlhZ25vc3RpYygpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZW5jYXBzdWxhdGlvbiA9PT0gVmlld0VuY2Fwc3VsYXRpb24uU2hhZG93RG9tICYmIG1ldGFkYXRhLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBzZWxlY3RvckVycm9yID0gY2hlY2tDdXN0b21FbGVtZW50U2VsZWN0b3JGb3JFcnJvcnMobWV0YWRhdGEuc2VsZWN0b3IpO1xuICAgICAgaWYgKHNlbGVjdG9yRXJyb3IgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKGRpYWdub3N0aWNzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2gobWFrZURpYWdub3N0aWMoXG4gICAgICAgICAgICBFcnJvckNvZGUuQ09NUE9ORU5UX0lOVkFMSURfU0hBRE9XX0RPTV9TRUxFQ1RPUiwgY29tcG9uZW50LmdldCgnc2VsZWN0b3InKSEsXG4gICAgICAgICAgICBzZWxlY3RvckVycm9yKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgaW5saW5lIHN0eWxlcyB3ZXJlIHByZXByb2Nlc3NlZCB1c2UgdGhvc2VcbiAgICBsZXQgaW5saW5lU3R5bGVzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5wcmVhbmFseXplU3R5bGVzQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICBpbmxpbmVTdHlsZXMgPSB0aGlzLnByZWFuYWx5emVTdHlsZXNDYWNoZS5nZXQobm9kZSkhO1xuICAgICAgdGhpcy5wcmVhbmFseXplU3R5bGVzQ2FjaGUuZGVsZXRlKG5vZGUpO1xuICAgICAgaWYgKGlubGluZVN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgICBzdHlsZXMucHVzaCguLi5pbmxpbmVTdHlsZXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBQcmVwcm9jZXNzaW5nIGlzIG9ubHkgc3VwcG9ydGVkIGFzeW5jaHJvbm91c2x5XG4gICAgICAvLyBJZiBubyBzdHlsZSBjYWNoZSBlbnRyeSBpcyBwcmVzZW50IGFzeW5jaHJvbm91cyBwcmVhbmFseXplIHdhcyBub3QgZXhlY3V0ZWQuXG4gICAgICAvLyBUaGlzIHByb3RlY3RzIGFnYWluc3QgYWNjaWRlbnRhbCBkaWZmZXJlbmNlcyBpbiByZXNvdXJjZSBjb250ZW50cyB3aGVuIHByZWFuYWx5c2lzXG4gICAgICAvLyBpcyBub3QgdXNlZCB3aXRoIGEgcHJvdmlkZWQgdHJhbnNmb3JtUmVzb3VyY2UgaG9vayBvbiB0aGUgUmVzb3VyY2VIb3N0LlxuICAgICAgaWYgKHRoaXMucmVzb3VyY2VMb2FkZXIuY2FuUHJlcHJvY2Vzcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lubGluZSByZXNvdXJjZSBwcm9jZXNzaW5nIHJlcXVpcmVzIGFzeW5jaHJvbm91cyBwcmVhbmFseXplLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29tcG9uZW50Lmhhcygnc3R5bGVzJykpIHtcbiAgICAgICAgY29uc3QgbGl0U3R5bGVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoY29tcG9uZW50LCAnc3R5bGVzJywgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgICBpZiAobGl0U3R5bGVzICE9PSBudWxsKSB7XG4gICAgICAgICAgaW5saW5lU3R5bGVzID0gWy4uLmxpdFN0eWxlc107XG4gICAgICAgICAgc3R5bGVzLnB1c2goLi4ubGl0U3R5bGVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGVtcGxhdGUuc3R5bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHN0eWxlcy5wdXNoKC4uLnRlbXBsYXRlLnN0eWxlcyk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0OiBBbmFseXNpc091dHB1dDxDb21wb25lbnRBbmFseXNpc0RhdGE+ID0ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgYmFzZUNsYXNzOiByZWFkQmFzZUNsYXNzKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciksXG4gICAgICAgIGlucHV0cyxcbiAgICAgICAgb3V0cHV0cyxcbiAgICAgICAgbWV0YToge1xuICAgICAgICAgIC4uLm1ldGFkYXRhLFxuICAgICAgICAgIHRlbXBsYXRlOiB7XG4gICAgICAgICAgICBub2RlczogdGVtcGxhdGUubm9kZXMsXG4gICAgICAgICAgICBuZ0NvbnRlbnRTZWxlY3RvcnM6IHRlbXBsYXRlLm5nQ29udGVudFNlbGVjdG9ycyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVuY2Fwc3VsYXRpb24sXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbjogdGVtcGxhdGUuaW50ZXJwb2xhdGlvbkNvbmZpZyA/PyBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHLFxuICAgICAgICAgIHN0eWxlcyxcblxuICAgICAgICAgIC8vIFRoZXNlIHdpbGwgYmUgcmVwbGFjZWQgZHVyaW5nIHRoZSBjb21waWxhdGlvbiBzdGVwLCBhZnRlciBhbGwgYE5nTW9kdWxlYHMgaGF2ZSBiZWVuXG4gICAgICAgICAgLy8gYW5hbHl6ZWQgYW5kIHRoZSBmdWxsIGNvbXBpbGF0aW9uIHNjb3BlIGZvciB0aGUgY29tcG9uZW50IGNhbiBiZSByZWFsaXplZC5cbiAgICAgICAgICBhbmltYXRpb25zLFxuICAgICAgICAgIHZpZXdQcm92aWRlcnM6IHdyYXBwZWRWaWV3UHJvdmlkZXJzLFxuICAgICAgICAgIGkxOG5Vc2VFeHRlcm5hbElkczogdGhpcy5pMThuVXNlRXh0ZXJuYWxJZHMsXG4gICAgICAgICAgcmVsYXRpdmVDb250ZXh0RmlsZVBhdGgsXG4gICAgICAgIH0sXG4gICAgICAgIHR5cGVDaGVja01ldGE6IGV4dHJhY3REaXJlY3RpdmVUeXBlQ2hlY2tNZXRhKG5vZGUsIGlucHV0cywgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgICBjbGFzc01ldGFkYXRhOiBleHRyYWN0Q2xhc3NNZXRhZGF0YShcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmlzQ29yZSwgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcixcbiAgICAgICAgICAgIGRlYyA9PiB0aGlzLl90cmFuc2Zvcm1EZWNvcmF0b3JUb0lubGluZVJlc291cmNlcyhkZWMsIGNvbXBvbmVudCwgc3R5bGVzLCB0ZW1wbGF0ZSkpLFxuICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSxcbiAgICAgICAgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksXG4gICAgICAgIGlubGluZVN0eWxlcyxcbiAgICAgICAgc3R5bGVVcmxzLFxuICAgICAgICByZXNvdXJjZXM6IHtcbiAgICAgICAgICBzdHlsZXM6IHN0eWxlUmVzb3VyY2VzLFxuICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVJlc291cmNlLFxuICAgICAgICB9LFxuICAgICAgICBpc1BvaXNvbmVkLFxuICAgICAgfSxcbiAgICAgIGRpYWdub3N0aWNzLFxuICAgIH07XG4gICAgaWYgKGNoYW5nZURldGVjdGlvbiAhPT0gbnVsbCkge1xuICAgICAgb3V0cHV0LmFuYWx5c2lzIS5tZXRhLmNoYW5nZURldGVjdGlvbiA9IGNoYW5nZURldGVjdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuXG4gIHN5bWJvbChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPik6IENvbXBvbmVudFN5bWJvbCB7XG4gICAgY29uc3QgdHlwZVBhcmFtZXRlcnMgPSBleHRyYWN0U2VtYW50aWNUeXBlUGFyYW1ldGVycyhub2RlKTtcblxuICAgIHJldHVybiBuZXcgQ29tcG9uZW50U3ltYm9sKFxuICAgICAgICBub2RlLCBhbmFseXNpcy5tZXRhLnNlbGVjdG9yLCBhbmFseXNpcy5pbnB1dHMsIGFuYWx5c2lzLm91dHB1dHMsIGFuYWx5c2lzLm1ldGEuZXhwb3J0QXMsXG4gICAgICAgIGFuYWx5c2lzLnR5cGVDaGVja01ldGEsIHR5cGVQYXJhbWV0ZXJzKTtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRBbmFseXNpc0RhdGEpOiB2b2lkIHtcbiAgICAvLyBSZWdpc3RlciB0aGlzIGNvbXBvbmVudCdzIGluZm9ybWF0aW9uIHdpdGggdGhlIGBNZXRhZGF0YVJlZ2lzdHJ5YC4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbXBvbmVudCBpcyBhdmFpbGFibGUgZHVyaW5nIHRoZSBjb21waWxlKCkgcGhhc2UuXG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShub2RlKTtcbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKHtcbiAgICAgIHR5cGU6IE1ldGFUeXBlLkRpcmVjdGl2ZSxcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IG5vZGUubmFtZS50ZXh0LFxuICAgICAgc2VsZWN0b3I6IGFuYWx5c2lzLm1ldGEuc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogYW5hbHlzaXMubWV0YS5leHBvcnRBcyxcbiAgICAgIGlucHV0czogYW5hbHlzaXMuaW5wdXRzLFxuICAgICAgb3V0cHV0czogYW5hbHlzaXMub3V0cHV0cyxcbiAgICAgIHF1ZXJpZXM6IGFuYWx5c2lzLm1ldGEucXVlcmllcy5tYXAocXVlcnkgPT4gcXVlcnkucHJvcGVydHlOYW1lKSxcbiAgICAgIGlzQ29tcG9uZW50OiB0cnVlLFxuICAgICAgYmFzZUNsYXNzOiBhbmFseXNpcy5iYXNlQ2xhc3MsXG4gICAgICAuLi5hbmFseXNpcy50eXBlQ2hlY2tNZXRhLFxuICAgICAgaXNQb2lzb25lZDogYW5hbHlzaXMuaXNQb2lzb25lZCxcbiAgICAgIGlzU3RydWN0dXJhbDogZmFsc2UsXG4gICAgfSk7XG5cbiAgICB0aGlzLnJlc291cmNlUmVnaXN0cnkucmVnaXN0ZXJSZXNvdXJjZXMoYW5hbHlzaXMucmVzb3VyY2VzLCBub2RlKTtcbiAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7XG4gIH1cblxuICBpbmRleChcbiAgICAgIGNvbnRleHQ6IEluZGV4aW5nQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pIHtcbiAgICBpZiAoYW5hbHlzaXMuaXNQb2lzb25lZCAmJiAhdGhpcy51c2VQb2lzb25lZERhdGEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBhbmFseXNpcy5tZXRhLnNlbGVjdG9yO1xuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBpZiAoKHNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQgfHwgc2NvcGUuZXhwb3J0ZWQuaXNQb2lzb25lZCkgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICAgIC8vIERvbid0IGJvdGhlciBpbmRleGluZyBjb21wb25lbnRzIHdoaWNoIGhhZCBlcnJvbmVvdXMgc2NvcGVzLCB1bmxlc3Mgc3BlY2lmaWNhbGx5XG4gICAgICAgIC8vIHJlcXVlc3RlZC5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgaWYgKGRpcmVjdGl2ZS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyZWN0aXZlLnNlbGVjdG9yKSwgZGlyZWN0aXZlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBiaW5kZXIgPSBuZXcgUjNUYXJnZXRCaW5kZXIobWF0Y2hlcik7XG4gICAgY29uc3QgYm91bmRUZW1wbGF0ZSA9IGJpbmRlci5iaW5kKHt0ZW1wbGF0ZTogYW5hbHlzaXMudGVtcGxhdGUuZGlhZ05vZGVzfSk7XG5cbiAgICBjb250ZXh0LmFkZENvbXBvbmVudCh7XG4gICAgICBkZWNsYXJhdGlvbjogbm9kZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgYm91bmRUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlTWV0YToge1xuICAgICAgICBpc0lubGluZTogYW5hbHlzaXMudGVtcGxhdGUuZGVjbGFyYXRpb24uaXNJbmxpbmUsXG4gICAgICAgIGZpbGU6IGFuYWx5c2lzLnRlbXBsYXRlLmZpbGUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgdHlwZUNoZWNrKGN0eDogVHlwZUNoZWNrQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPik6XG4gICAgICB2b2lkIHtcbiAgICBpZiAodGhpcy50eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5ID09PSBudWxsIHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobWV0YS5pc1BvaXNvbmVkICYmICF0aGlzLnVzZVBvaXNvbmVkRGF0YSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IHRoaXMudHlwZUNoZWNrU2NvcGVSZWdpc3RyeS5nZXRUeXBlQ2hlY2tTY29wZShub2RlKTtcbiAgICBpZiAoc2NvcGUuaXNQb2lzb25lZCAmJiAhdGhpcy51c2VQb2lzb25lZERhdGEpIHtcbiAgICAgIC8vIERvbid0IHR5cGUtY2hlY2sgY29tcG9uZW50cyB0aGF0IGhhZCBlcnJvcnMgaW4gdGhlaXIgc2NvcGVzLCB1bmxlc3MgcmVxdWVzdGVkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihzY29wZS5tYXRjaGVyKTtcbiAgICBjdHguYWRkVGVtcGxhdGUoXG4gICAgICAgIG5ldyBSZWZlcmVuY2Uobm9kZSksIGJpbmRlciwgbWV0YS50ZW1wbGF0ZS5kaWFnTm9kZXMsIHNjb3BlLnBpcGVzLCBzY29wZS5zY2hlbWFzLFxuICAgICAgICBtZXRhLnRlbXBsYXRlLnNvdXJjZU1hcHBpbmcsIG1ldGEudGVtcGxhdGUuZmlsZSwgbWV0YS50ZW1wbGF0ZS5lcnJvcnMpO1xuICB9XG5cbiAgZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrKFxuICAgICAgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLFxuICAgICAgZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXI6IEV4dGVuZGVkVGVtcGxhdGVDaGVja2VyKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gZXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXIuZ2V0RXh0ZW5kZWRUZW1wbGF0ZURpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG4gIH1cblxuICByZXNvbHZlKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICBzeW1ib2w6IENvbXBvbmVudFN5bWJvbCk6IFJlc29sdmVSZXN1bHQ8Q29tcG9uZW50UmVzb2x1dGlvbkRhdGE+IHtcbiAgICBpZiAodGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlciAhPT0gbnVsbCAmJiBhbmFseXNpcy5iYXNlQ2xhc3MgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIHN5bWJvbC5iYXNlQ2xhc3MgPSB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLmdldFN5bWJvbChhbmFseXNpcy5iYXNlQ2xhc3Mubm9kZSk7XG4gICAgfVxuXG4gICAgaWYgKGFuYWx5c2lzLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBjb21wb25lbnQgd2FzIHJlZ2lzdGVyZWQgd2l0aCBhbiBOZ01vZHVsZS4gSWYgc28sIGl0IHNob3VsZCBiZSBjb21waWxlZFxuICAgIC8vIHVuZGVyIHRoYXQgbW9kdWxlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGxldCBtZXRhZGF0YSA9IGFuYWx5c2lzLm1ldGEgYXMgUmVhZG9ubHk8UjNDb21wb25lbnRNZXRhZGF0YT47XG5cbiAgICBjb25zdCBkYXRhOiBDb21wb25lbnRSZXNvbHV0aW9uRGF0YSA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IEVNUFRZX0FSUkFZLFxuICAgICAgcGlwZXM6IEVNUFRZX01BUCxcbiAgICAgIGRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlOiBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZS5EaXJlY3QsXG4gICAgfTtcblxuICAgIGlmIChzY29wZSAhPT0gbnVsbCAmJiAoIXNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQgfHwgdGhpcy51c2VQb2lzb25lZERhdGEpKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIHJlc29sdmUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICAvL1xuICAgICAgLy8gRmlyc3QgaXQgbmVlZHMgdG8gYmUgZGV0ZXJtaW5lZCBpZiBhY3R1YWxseSBpbXBvcnRpbmcgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgdXNlZCBpbiB0aGVcbiAgICAgIC8vIHRlbXBsYXRlIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLiBDdXJyZW50bHkgbmd0c2MgcmVmdXNlcyB0byBnZW5lcmF0ZSBjeWNsZXMsIHNvIGFuIG9wdGlvblxuICAgICAgLy8ga25vd24gYXMgXCJyZW1vdGUgc2NvcGluZ1wiIGlzIHVzZWQgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLiBJbiByZW1vdGUgc2NvcGluZywgdGhlXG4gICAgICAvLyBtb2R1bGUgZmlsZSBzZXRzIHRoZSBkaXJlY3RpdmVzL3BpcGVzIG9uIHRoZSDJtWNtcCBvZiB0aGUgY29tcG9uZW50LCB3aXRob3V0XG4gICAgICAvLyByZXF1aXJpbmcgbmV3IGltcG9ydHMgKGJ1dCBhbHNvIGluIGEgd2F5IHRoYXQgYnJlYWtzIHRyZWUgc2hha2luZykuXG4gICAgICAvL1xuICAgICAgLy8gRGV0ZXJtaW5pbmcgdGhpcyBpcyBjaGFsbGVuZ2luZywgYmVjYXVzZSB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyByZXNwb25zaWJsZSBmb3JcbiAgICAgIC8vIG1hdGNoaW5nIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSB0ZW1wbGF0ZTsgaG93ZXZlciwgdGhhdCBkb2Vzbid0IHJ1biB1bnRpbCB0aGUgYWN0dWFsXG4gICAgICAvLyBjb21waWxlKCkgc3RlcC4gSXQncyBub3QgcG9zc2libGUgdG8gcnVuIHRlbXBsYXRlIGNvbXBpbGF0aW9uIHNvb25lciBhcyBpdCByZXF1aXJlcyB0aGVcbiAgICAgIC8vIENvbnN0YW50UG9vbCBmb3IgdGhlIG92ZXJhbGwgZmlsZSBiZWluZyBjb21waWxlZCAod2hpY2ggaXNuJ3QgYXZhaWxhYmxlIHVudGlsIHRoZVxuICAgICAgLy8gdHJhbnNmb3JtIHN0ZXApLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQsIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIG1hdGNoZWQgaW5kZXBlbmRlbnRseSBoZXJlLCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXNcbiAgICAgIC8vIGlzIGFuIGFsdGVybmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIHRlbXBsYXRlIG1hdGNoaW5nIHdoaWNoIGlzIHVzZWQgZm9yIHRlbXBsYXRlXG4gICAgICAvLyB0eXBlLWNoZWNraW5nIGFuZCB3aWxsIGV2ZW50dWFsbHkgcmVwbGFjZSBtYXRjaGluZyBpbiB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlci5cblxuXG4gICAgICAvLyBTZXQgdXAgdGhlIFIzVGFyZ2V0QmluZGVyLCBhcyB3ZWxsIGFzIGEgJ2RpcmVjdGl2ZXMnIGFycmF5IGFuZCBhICdwaXBlcycgbWFwIHRoYXQgYXJlXG4gICAgICAvLyBsYXRlciBmZWQgdG8gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuIEZpcnN0LCBhIFNlbGVjdG9yTWF0Y2hlciBpcyBjb25zdHJ1Y3RlZCB0b1xuICAgICAgLy8gbWF0Y2ggZGlyZWN0aXZlcyB0aGF0IGFyZSBpbiBzY29wZS5cbiAgICAgIHR5cGUgTWF0Y2hlZERpcmVjdGl2ZSA9IERpcmVjdGl2ZU1ldGEme3NlbGVjdG9yOiBzdHJpbmd9O1xuICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8TWF0Y2hlZERpcmVjdGl2ZT4oKTtcblxuICAgICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBpZiAoZGlyLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShkaXIuc2VsZWN0b3IpLCBkaXIgYXMgTWF0Y2hlZERpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5jb21waWxhdGlvbi5waXBlcykge1xuICAgICAgICBwaXBlcy5zZXQocGlwZS5uYW1lLCBwaXBlLnJlZik7XG4gICAgICB9XG5cbiAgICAgIC8vIE5leHQsIHRoZSBjb21wb25lbnQgdGVtcGxhdGUgQVNUIGlzIGJvdW5kIHVzaW5nIHRoZSBSM1RhcmdldEJpbmRlci4gVGhpcyBwcm9kdWNlcyBhXG4gICAgICAvLyBCb3VuZFRhcmdldCwgd2hpY2ggaXMgc2ltaWxhciB0byBhIHRzLlR5cGVDaGVja2VyLlxuICAgICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgICAgY29uc3QgYm91bmQgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IG1ldGFkYXRhLnRlbXBsYXRlLm5vZGVzfSk7XG5cbiAgICAgIC8vIFRoZSBCb3VuZFRhcmdldCBrbm93cyB3aGljaCBkaXJlY3RpdmVzIGFuZCBwaXBlcyBtYXRjaGVkIHRoZSB0ZW1wbGF0ZS5cbiAgICAgIHR5cGUgVXNlZERpcmVjdGl2ZSA9XG4gICAgICAgICAgUjNVc2VkRGlyZWN0aXZlTWV0YWRhdGEme3JlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBpbXBvcnRlZEZpbGU6IEltcG9ydGVkRmlsZX07XG4gICAgICBjb25zdCB1c2VkRGlyZWN0aXZlczogVXNlZERpcmVjdGl2ZVtdID0gYm91bmQuZ2V0VXNlZERpcmVjdGl2ZXMoKS5tYXAoZGlyZWN0aXZlID0+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGRpcmVjdGl2ZS5yZWYsIGNvbnRleHQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlZjogZGlyZWN0aXZlLnJlZixcbiAgICAgICAgICB0eXBlOiB0eXBlLmV4cHJlc3Npb24sXG4gICAgICAgICAgaW1wb3J0ZWRGaWxlOiB0eXBlLmltcG9ydGVkRmlsZSxcbiAgICAgICAgICBzZWxlY3RvcjogZGlyZWN0aXZlLnNlbGVjdG9yLFxuICAgICAgICAgIGlucHV0czogZGlyZWN0aXZlLmlucHV0cy5wcm9wZXJ0eU5hbWVzLFxuICAgICAgICAgIG91dHB1dHM6IGRpcmVjdGl2ZS5vdXRwdXRzLnByb3BlcnR5TmFtZXMsXG4gICAgICAgICAgZXhwb3J0QXM6IGRpcmVjdGl2ZS5leHBvcnRBcyxcbiAgICAgICAgICBpc0NvbXBvbmVudDogZGlyZWN0aXZlLmlzQ29tcG9uZW50LFxuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIHR5cGUgVXNlZFBpcGUgPSB7XG4gICAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LFxuICAgICAgICBwaXBlTmFtZTogc3RyaW5nLFxuICAgICAgICBleHByZXNzaW9uOiBFeHByZXNzaW9uLFxuICAgICAgICBpbXBvcnRlZEZpbGU6IEltcG9ydGVkRmlsZSxcbiAgICAgIH07XG4gICAgICBjb25zdCB1c2VkUGlwZXM6IFVzZWRQaXBlW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgcGlwZU5hbWUgb2YgYm91bmQuZ2V0VXNlZFBpcGVzKCkpIHtcbiAgICAgICAgaWYgKCFwaXBlcy5oYXMocGlwZU5hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGlwZSA9IHBpcGVzLmdldChwaXBlTmFtZSkhO1xuICAgICAgICBjb25zdCB0eXBlID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocGlwZSwgY29udGV4dCk7XG4gICAgICAgIHVzZWRQaXBlcy5wdXNoKHtcbiAgICAgICAgICByZWY6IHBpcGUsXG4gICAgICAgICAgcGlwZU5hbWUsXG4gICAgICAgICAgZXhwcmVzc2lvbjogdHlwZS5leHByZXNzaW9uLFxuICAgICAgICAgIGltcG9ydGVkRmlsZTogdHlwZS5pbXBvcnRlZEZpbGUsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgIT09IG51bGwpIHtcbiAgICAgICAgc3ltYm9sLnVzZWREaXJlY3RpdmVzID0gdXNlZERpcmVjdGl2ZXMubWFwKFxuICAgICAgICAgICAgZGlyID0+IHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIhLmdldFNlbWFudGljUmVmZXJlbmNlKGRpci5yZWYubm9kZSwgZGlyLnR5cGUpKTtcbiAgICAgICAgc3ltYm9sLnVzZWRQaXBlcyA9IHVzZWRQaXBlcy5tYXAoXG4gICAgICAgICAgICBwaXBlID0+XG4gICAgICAgICAgICAgICAgdGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlciEuZ2V0U2VtYW50aWNSZWZlcmVuY2UocGlwZS5yZWYubm9kZSwgcGlwZS5leHByZXNzaW9uKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFNjYW4gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcy9waXBlcyBhY3R1YWxseSB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgY2hlY2sgd2hldGhlciBhbnlcbiAgICAgIC8vIGltcG9ydCB3aGljaCBuZWVkcyB0byBiZSBnZW5lcmF0ZWQgd291bGQgY3JlYXRlIGEgY3ljbGUuXG4gICAgICBjb25zdCBjeWNsZXNGcm9tRGlyZWN0aXZlcyA9IG5ldyBNYXA8VXNlZERpcmVjdGl2ZSwgQ3ljbGU+KCk7XG4gICAgICBmb3IgKGNvbnN0IHVzZWREaXJlY3RpdmUgb2YgdXNlZERpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3QgY3ljbGUgPVxuICAgICAgICAgICAgdGhpcy5fY2hlY2tGb3JDeWNsaWNJbXBvcnQodXNlZERpcmVjdGl2ZS5pbXBvcnRlZEZpbGUsIHVzZWREaXJlY3RpdmUudHlwZSwgY29udGV4dCk7XG4gICAgICAgIGlmIChjeWNsZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGN5Y2xlc0Zyb21EaXJlY3RpdmVzLnNldCh1c2VkRGlyZWN0aXZlLCBjeWNsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGN5Y2xlc0Zyb21QaXBlcyA9IG5ldyBNYXA8VXNlZFBpcGUsIEN5Y2xlPigpO1xuICAgICAgZm9yIChjb25zdCB1c2VkUGlwZSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgY29uc3QgY3ljbGUgPVxuICAgICAgICAgICAgdGhpcy5fY2hlY2tGb3JDeWNsaWNJbXBvcnQodXNlZFBpcGUuaW1wb3J0ZWRGaWxlLCB1c2VkUGlwZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKGN5Y2xlICE9PSBudWxsKSB7XG4gICAgICAgICAgY3ljbGVzRnJvbVBpcGVzLnNldCh1c2VkUGlwZSwgY3ljbGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGN5Y2xlRGV0ZWN0ZWQgPSBjeWNsZXNGcm9tRGlyZWN0aXZlcy5zaXplICE9PSAwIHx8IGN5Y2xlc0Zyb21QaXBlcy5zaXplICE9PSAwO1xuICAgICAgaWYgKCFjeWNsZURldGVjdGVkKSB7XG4gICAgICAgIC8vIE5vIGN5Y2xlIHdhcyBkZXRlY3RlZC4gUmVjb3JkIHRoZSBpbXBvcnRzIHRoYXQgbmVlZCB0byBiZSBjcmVhdGVkIGluIHRoZSBjeWNsZSBkZXRlY3RvclxuICAgICAgICAvLyBzbyB0aGF0IGZ1dHVyZSBjeWNsaWMgaW1wb3J0IGNoZWNrcyBjb25zaWRlciB0aGVpciBwcm9kdWN0aW9uLlxuICAgICAgICBmb3IgKGNvbnN0IHt0eXBlLCBpbXBvcnRlZEZpbGV9IG9mIHVzZWREaXJlY3RpdmVzKSB7XG4gICAgICAgICAgdGhpcy5fcmVjb3JkU3ludGhldGljSW1wb3J0KGltcG9ydGVkRmlsZSwgdHlwZSwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCB7ZXhwcmVzc2lvbiwgaW1wb3J0ZWRGaWxlfSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgICB0aGlzLl9yZWNvcmRTeW50aGV0aWNJbXBvcnQoaW1wb3J0ZWRGaWxlLCBleHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGFycmF5cyBpbiDJtWNtcCBuZWVkIHRvIGJlIHdyYXBwZWQgaW4gY2xvc3VyZXMuXG4gICAgICAgIC8vIFRoaXMgaXMgcmVxdWlyZWQgaWYgYW55IGRpcmVjdGl2ZS9waXBlIHJlZmVyZW5jZSBpcyB0byBhIGRlY2xhcmF0aW9uIGluIHRoZSBzYW1lIGZpbGVcbiAgICAgICAgLy8gYnV0IGRlY2xhcmVkIGFmdGVyIHRoaXMgY29tcG9uZW50LlxuICAgICAgICBjb25zdCB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID1cbiAgICAgICAgICAgIHVzZWREaXJlY3RpdmVzLnNvbWUoXG4gICAgICAgICAgICAgICAgZGlyID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoZGlyLnR5cGUsIG5vZGUubmFtZSwgY29udGV4dCkpIHx8XG4gICAgICAgICAgICB1c2VkUGlwZXMuc29tZShcbiAgICAgICAgICAgICAgICBwaXBlID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocGlwZS5leHByZXNzaW9uLCBub2RlLm5hbWUsIGNvbnRleHQpKTtcblxuICAgICAgICBkYXRhLmRpcmVjdGl2ZXMgPSB1c2VkRGlyZWN0aXZlcztcbiAgICAgICAgZGF0YS5waXBlcyA9IG5ldyBNYXAodXNlZFBpcGVzLm1hcChwaXBlID0+IFtwaXBlLnBpcGVOYW1lLCBwaXBlLmV4cHJlc3Npb25dKSk7XG4gICAgICAgIGRhdGEuZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUgPSB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID9cbiAgICAgICAgICAgIERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkNsb3N1cmUgOlxuICAgICAgICAgICAgRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUuRGlyZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuY3ljbGVIYW5kbGluZ1N0cmF0ZWd5ID09PSBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuVXNlUmVtb3RlU2NvcGluZykge1xuICAgICAgICAgIC8vIERlY2xhcmluZyB0aGUgZGlyZWN0aXZlRGVmcy9waXBlRGVmcyBhcnJheXMgZGlyZWN0bHkgd291bGQgcmVxdWlyZSBpbXBvcnRzIHRoYXQgd291bGRcbiAgICAgICAgICAvLyBjcmVhdGUgYSBjeWNsZS4gSW5zdGVhZCwgbWFyayB0aGlzIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcsIHNvIHRoYXQgdGhlXG4gICAgICAgICAgLy8gTmdNb2R1bGUgZmlsZSB3aWxsIHRha2UgY2FyZSBvZiBzZXR0aW5nIHRoZSBkaXJlY3RpdmVzIGZvciB0aGUgY29tcG9uZW50LlxuICAgICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5zZXRDb21wb25lbnRSZW1vdGVTY29wZShcbiAgICAgICAgICAgICAgbm9kZSwgdXNlZERpcmVjdGl2ZXMubWFwKGRpciA9PiBkaXIucmVmKSwgdXNlZFBpcGVzLm1hcChwaXBlID0+IHBpcGUucmVmKSk7XG4gICAgICAgICAgc3ltYm9sLmlzUmVtb3RlbHlTY29wZWQgPSB0cnVlO1xuXG4gICAgICAgICAgLy8gSWYgYSBzZW1hbnRpYyBncmFwaCBpcyBiZWluZyB0cmFja2VkLCByZWNvcmQgdGhlIGZhY3QgdGhhdCB0aGlzIGNvbXBvbmVudCBpcyByZW1vdGVseVxuICAgICAgICAgIC8vIHNjb3BlZCB3aXRoIHRoZSBkZWNsYXJpbmcgTmdNb2R1bGUgc3ltYm9sIGFzIHRoZSBOZ01vZHVsZSdzIGVtaXQgYmVjb21lcyBkZXBlbmRlbnQgb25cbiAgICAgICAgICAvLyB0aGUgZGlyZWN0aXZlL3BpcGUgdXNhZ2VzIG9mIHRoaXMgY29tcG9uZW50LlxuICAgICAgICAgIGlmICh0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCBtb2R1bGVTeW1ib2wgPSB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLmdldFN5bWJvbChzY29wZS5uZ01vZHVsZSk7XG4gICAgICAgICAgICBpZiAoIShtb2R1bGVTeW1ib2wgaW5zdGFuY2VvZiBOZ01vZHVsZVN5bWJvbCkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgYEFzc2VydGlvbkVycm9yOiBFeHBlY3RlZCAke3Njb3BlLm5nTW9kdWxlLm5hbWV9IHRvIGJlIGFuIE5nTW9kdWxlU3ltYm9sLmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtb2R1bGVTeW1ib2wuYWRkUmVtb3RlbHlTY29wZWRDb21wb25lbnQoXG4gICAgICAgICAgICAgICAgc3ltYm9sLCBzeW1ib2wudXNlZERpcmVjdGl2ZXMsIHN5bWJvbC51c2VkUGlwZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBXZSBhcmUgbm90IGFibGUgdG8gaGFuZGxlIHRoaXMgY3ljbGUgc28gdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgY29uc3QgcmVsYXRlZE1lc3NhZ2VzOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtkaXIsIGN5Y2xlXSBvZiBjeWNsZXNGcm9tRGlyZWN0aXZlcykge1xuICAgICAgICAgICAgcmVsYXRlZE1lc3NhZ2VzLnB1c2goXG4gICAgICAgICAgICAgICAgbWFrZUN5Y2xpY0ltcG9ydEluZm8oZGlyLnJlZiwgZGlyLmlzQ29tcG9uZW50ID8gJ2NvbXBvbmVudCcgOiAnZGlyZWN0aXZlJywgY3ljbGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBbcGlwZSwgY3ljbGVdIG9mIGN5Y2xlc0Zyb21QaXBlcykge1xuICAgICAgICAgICAgcmVsYXRlZE1lc3NhZ2VzLnB1c2gobWFrZUN5Y2xpY0ltcG9ydEluZm8ocGlwZS5yZWYsICdwaXBlJywgY3ljbGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuSU1QT1JUX0NZQ0xFX0RFVEVDVEVELCBub2RlLFxuICAgICAgICAgICAgICAnT25lIG9yIG1vcmUgaW1wb3J0IGN5Y2xlcyB3b3VsZCBuZWVkIHRvIGJlIGNyZWF0ZWQgdG8gY29tcGlsZSB0aGlzIGNvbXBvbmVudCwgJyArXG4gICAgICAgICAgICAgICAgICAnd2hpY2ggaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgY3VycmVudCBjb21waWxlciBjb25maWd1cmF0aW9uLicsXG4gICAgICAgICAgICAgIHJlbGF0ZWRNZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICBpZiAoYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSAhPT0gbnVsbCAmJlxuICAgICAgICBhbmFseXNpcy5tZXRhLnByb3ZpZGVycyBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcikge1xuICAgICAgY29uc3QgcHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMhLm5vZGUsXG4gICAgICAgICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5wcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoYW5hbHlzaXMudmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgIT09IG51bGwgJiZcbiAgICAgICAgYW5hbHlzaXMubWV0YS52aWV3UHJvdmlkZXJzIGluc3RhbmNlb2YgV3JhcHBlZE5vZGVFeHByKSB7XG4gICAgICBjb25zdCB2aWV3UHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMudmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIGFuYWx5c2lzLm1ldGEudmlld1Byb3ZpZGVycyEubm9kZSxcbiAgICAgICAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeSk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnZpZXdQcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVEaWFnbm9zdGljcyA9IGdldERpcmVjdGl2ZURpYWdub3N0aWNzKFxuICAgICAgICBub2RlLCB0aGlzLm1ldGFSZWFkZXIsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCAnQ29tcG9uZW50Jyk7XG4gICAgaWYgKGRpcmVjdGl2ZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmRpcmVjdGl2ZURpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtkaWFnbm9zdGljc307XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkYXRhfTtcbiAgfVxuXG4gIHhpMThuKGN0eDogWGkxOG5Db250ZXh0LCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPik6XG4gICAgICB2b2lkIHtcbiAgICBjdHgudXBkYXRlRnJvbVRlbXBsYXRlKFxuICAgICAgICBhbmFseXNpcy50ZW1wbGF0ZS5jb250ZW50LCBhbmFseXNpcy50ZW1wbGF0ZS5kZWNsYXJhdGlvbi5yZXNvbHZlZFRlbXBsYXRlVXJsLFxuICAgICAgICBhbmFseXNpcy50ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uQ29uZmlnID8/IERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUcpO1xuICB9XG5cbiAgdXBkYXRlUmVzb3VyY2VzKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRBbmFseXNpc0RhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuXG4gICAgLy8gSWYgdGhlIHRlbXBsYXRlIGlzIGV4dGVybmFsLCByZS1wYXJzZSBpdC5cbiAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPSBhbmFseXNpcy50ZW1wbGF0ZS5kZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRlbXBsYXRlRGVjbC5pc0lubGluZSkge1xuICAgICAgYW5hbHlzaXMudGVtcGxhdGUgPSB0aGlzLmV4dHJhY3RUZW1wbGF0ZShub2RlLCB0ZW1wbGF0ZURlY2wpO1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSBhbnkgZXh0ZXJuYWwgc3R5bGVzaGVldHMgYW5kIHJlYnVpbGQgdGhlIGNvbWJpbmVkICdzdHlsZXMnIGxpc3QuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB3cml0ZSB0ZXN0cyBmb3Igc3R5bGVzIHdoZW4gdGhlIHByaW1hcnkgY29tcGlsZXIgdXNlcyB0aGUgdXBkYXRlUmVzb3VyY2VzIHBhdGhcbiAgICBsZXQgc3R5bGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChhbmFseXNpcy5zdHlsZVVybHMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3Qgc3R5bGVVcmwgb2YgYW5hbHlzaXMuc3R5bGVVcmxzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWRTdHlsZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybC51cmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgICBjb25zdCBzdHlsZVRleHQgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQocmVzb2x2ZWRTdHlsZVVybCk7XG4gICAgICAgICAgc3R5bGVzLnB1c2goc3R5bGVUZXh0KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFJlc291cmNlIHJlc29sdmUgZmFpbHVyZXMgc2hvdWxkIGFscmVhZHkgYmUgaW4gdGhlIGRpYWdub3N0aWNzIGxpc3QgZnJvbSB0aGUgYW5hbHl6ZVxuICAgICAgICAgIC8vIHN0YWdlLiBXZSBkbyBub3QgbmVlZCB0byBkbyBhbnl0aGluZyB3aXRoIHRoZW0gd2hlbiB1cGRhdGluZyByZXNvdXJjZXMuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGFuYWx5c2lzLmlubGluZVN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzdHlsZVRleHQgb2YgYW5hbHlzaXMuaW5saW5lU3R5bGVzKSB7XG4gICAgICAgIHN0eWxlcy5wdXNoKHN0eWxlVGV4dCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3R5bGVUZXh0IG9mIGFuYWx5c2lzLnRlbXBsYXRlLnN0eWxlcykge1xuICAgICAgc3R5bGVzLnB1c2goc3R5bGVUZXh0KTtcbiAgICB9XG5cbiAgICBhbmFseXNpcy5tZXRhLnN0eWxlcyA9IHN0eWxlcztcbiAgfVxuXG4gIGNvbXBpbGVGdWxsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICByZXNvbHV0aW9uOiBSZWFkb25seTxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4sIHBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgaWYgKGFuYWx5c2lzLnRlbXBsYXRlLmVycm9ycyAhPT0gbnVsbCAmJiBhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBtZXRhOiBSM0NvbXBvbmVudE1ldGFkYXRhID0gey4uLmFuYWx5c2lzLm1ldGEsIC4uLnJlc29sdXRpb259O1xuICAgIGNvbnN0IGZhYyA9IGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZCh0b0ZhY3RvcnlNZXRhZGF0YShtZXRhLCBGYWN0b3J5VGFyZ2V0LkNvbXBvbmVudCkpO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgY29uc3QgY2xhc3NNZXRhZGF0YSA9IGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEgIT09IG51bGwgP1xuICAgICAgICBjb21waWxlQ2xhc3NNZXRhZGF0YShhbmFseXNpcy5jbGFzc01ldGFkYXRhKS50b1N0bXQoKSA6XG4gICAgICAgIG51bGw7XG4gICAgcmV0dXJuIGNvbXBpbGVSZXN1bHRzKGZhYywgZGVmLCBjbGFzc01ldGFkYXRhLCAnybVjbXAnKTtcbiAgfVxuXG4gIGNvbXBpbGVQYXJ0aWFsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICByZXNvbHV0aW9uOiBSZWFkb25seTxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGlmIChhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMgIT09IG51bGwgJiYgYW5hbHlzaXMudGVtcGxhdGUuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvOiBEZWNsYXJlQ29tcG9uZW50VGVtcGxhdGVJbmZvID0ge1xuICAgICAgY29udGVudDogYW5hbHlzaXMudGVtcGxhdGUuY29udGVudCxcbiAgICAgIHNvdXJjZVVybDogYW5hbHlzaXMudGVtcGxhdGUuZGVjbGFyYXRpb24ucmVzb2x2ZWRUZW1wbGF0ZVVybCxcbiAgICAgIGlzSW5saW5lOiBhbmFseXNpcy50ZW1wbGF0ZS5kZWNsYXJhdGlvbi5pc0lubGluZSxcbiAgICAgIGlubGluZVRlbXBsYXRlTGl0ZXJhbEV4cHJlc3Npb246IGFuYWx5c2lzLnRlbXBsYXRlLnNvdXJjZU1hcHBpbmcudHlwZSA9PT0gJ2RpcmVjdCcgP1xuICAgICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIoYW5hbHlzaXMudGVtcGxhdGUuc291cmNlTWFwcGluZy5ub2RlKSA6XG4gICAgICAgICAgbnVsbCxcbiAgICB9O1xuICAgIGNvbnN0IG1ldGE6IFIzQ29tcG9uZW50TWV0YWRhdGEgPSB7Li4uYW5hbHlzaXMubWV0YSwgLi4ucmVzb2x1dGlvbn07XG4gICAgY29uc3QgZmFjID0gY29tcGlsZURlY2xhcmVGYWN0b3J5KHRvRmFjdG9yeU1ldGFkYXRhKG1ldGEsIEZhY3RvcnlUYXJnZXQuQ29tcG9uZW50KSk7XG4gICAgY29uc3QgZGVmID0gY29tcGlsZURlY2xhcmVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgYW5hbHlzaXMudGVtcGxhdGUsIHRlbXBsYXRlSW5mbyk7XG4gICAgY29uc3QgY2xhc3NNZXRhZGF0YSA9IGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEgIT09IG51bGwgP1xuICAgICAgICBjb21waWxlRGVjbGFyZUNsYXNzTWV0YWRhdGEoYW5hbHlzaXMuY2xhc3NNZXRhZGF0YSkudG9TdG10KCkgOlxuICAgICAgICBudWxsO1xuICAgIHJldHVybiBjb21waWxlUmVzdWx0cyhmYWMsIGRlZiwgY2xhc3NNZXRhZGF0YSwgJ8m1Y21wJyk7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtcyB0aGUgZ2l2ZW4gZGVjb3JhdG9yIHRvIGlubGluZSBleHRlcm5hbCByZXNvdXJjZXMuIGkuZS4gaWYgdGhlIGRlY29yYXRvclxuICAgKiByZXNvbHZlcyB0byBgQENvbXBvbmVudGAsIHRoZSBgdGVtcGxhdGVVcmxgIGFuZCBgc3R5bGVVcmxzYCBtZXRhZGF0YSBmaWVsZHMgd2lsbCBiZVxuICAgKiB0cmFuc2Zvcm1lZCB0byB0aGVpciBzZW1hbnRpY2FsbHktZXF1aXZhbGVudCBpbmxpbmUgdmFyaWFudHMuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgZm9yIHNlcmlhbGl6aW5nIGRlY29yYXRvcnMgaW50byB0aGUgY2xhc3MgbWV0YWRhdGEuIFRoZSBlbWl0dGVkXG4gICAqIGNsYXNzIG1ldGFkYXRhIHNob3VsZCBub3QgcmVmZXIgdG8gZXh0ZXJuYWwgcmVzb3VyY2VzIGFzIHRoaXMgd291bGQgYmUgaW5jb25zaXN0ZW50XG4gICAqIHdpdGggdGhlIGNvbXBvbmVudCBkZWZpbml0aW9ucy9kZWNsYXJhdGlvbnMgd2hpY2ggYWxyZWFkeSBpbmxpbmUgZXh0ZXJuYWwgcmVzb3VyY2VzLlxuICAgKlxuICAgKiBBZGRpdGlvbmFsbHksIHRoZSByZWZlcmVuY2VzIHRvIGV4dGVybmFsIHJlc291cmNlcyB3b3VsZCByZXF1aXJlIGxpYnJhcmllcyB0byBzaGlwXG4gICAqIGV4dGVybmFsIHJlc291cmNlcyBleGNsdXNpdmVseSBmb3IgdGhlIGNsYXNzIG1ldGFkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBfdHJhbnNmb3JtRGVjb3JhdG9yVG9JbmxpbmVSZXNvdXJjZXMoXG4gICAgICBkZWM6IERlY29yYXRvciwgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgc3R5bGVzOiBzdHJpbmdbXSxcbiAgICAgIHRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2UpOiBEZWNvcmF0b3Ige1xuICAgIGlmIChkZWMubmFtZSAhPT0gJ0NvbXBvbmVudCcpIHtcbiAgICAgIHJldHVybiBkZWM7XG4gICAgfVxuXG4gICAgLy8gSWYgbm8gZXh0ZXJuYWwgcmVzb3VyY2VzIGFyZSByZWZlcmVuY2VkLCBwcmVzZXJ2ZSB0aGUgb3JpZ2luYWwgZGVjb3JhdG9yXG4gICAgLy8gZm9yIHRoZSBiZXN0IHNvdXJjZSBtYXAgZXhwZXJpZW5jZSB3aGVuIHRoZSBkZWNvcmF0b3IgaXMgZW1pdHRlZCBpbiBUUy5cbiAgICBpZiAoIWNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykgJiYgIWNvbXBvbmVudC5oYXMoJ3N0eWxlVXJscycpKSB7XG4gICAgICByZXR1cm4gZGVjO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGFkYXRhID0gbmV3IE1hcChjb21wb25lbnQpO1xuXG4gICAgLy8gU2V0IHRoZSBgdGVtcGxhdGVgIHByb3BlcnR5IGlmIHRoZSBgdGVtcGxhdGVVcmxgIHByb3BlcnR5IGlzIHNldC5cbiAgICBpZiAobWV0YWRhdGEuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBtZXRhZGF0YS5kZWxldGUoJ3RlbXBsYXRlVXJsJyk7XG4gICAgICBtZXRhZGF0YS5zZXQoJ3RlbXBsYXRlJywgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbCh0ZW1wbGF0ZS5jb250ZW50KSk7XG4gICAgfVxuXG4gICAgLy8gU2V0IHRoZSBgc3R5bGVzYCBwcm9wZXJ0eSBpZiB0aGUgYHN0eWxlVXJsc2AgcHJvcGVydHkgaXMgc2V0LlxuICAgIGlmIChtZXRhZGF0YS5oYXMoJ3N0eWxlVXJscycpKSB7XG4gICAgICBtZXRhZGF0YS5kZWxldGUoJ3N0eWxlVXJscycpO1xuICAgICAgbWV0YWRhdGEuc2V0KCdzdHlsZXMnLCB0cy5jcmVhdGVBcnJheUxpdGVyYWwoc3R5bGVzLm1hcChzID0+IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwocykpKSk7XG4gICAgfVxuXG4gICAgLy8gQ29udmVydCB0aGUgbWV0YWRhdGEgdG8gVHlwZVNjcmlwdCBBU1Qgb2JqZWN0IGxpdGVyYWwgZWxlbWVudCBub2Rlcy5cbiAgICBjb25zdCBuZXdNZXRhZGF0YUZpZWxkczogdHMuT2JqZWN0TGl0ZXJhbEVsZW1lbnRMaWtlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgbWV0YWRhdGEuZW50cmllcygpKSB7XG4gICAgICBuZXdNZXRhZGF0YUZpZWxkcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChuYW1lLCB2YWx1ZSkpO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgb3JpZ2luYWwgZGVjb3JhdG9yIHdpdGggdGhlIG92ZXJyaWRkZW4gbWV0YWRhdGEgYXJndW1lbnQuXG4gICAgcmV0dXJuIHsuLi5kZWMsIGFyZ3M6IFt0cy5jcmVhdGVPYmplY3RMaXRlcmFsKG5ld01ldGFkYXRhRmllbGRzKV19O1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgaWYgKHRoaXMubGl0ZXJhbENhY2hlLmhhcyhkZWNvcmF0b3IpKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXRlcmFsQ2FjaGUuZ2V0KGRlY29yYXRvcikhO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQ29tcG9uZW50IGRlY29yYXRvcmApO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSwgYERlY29yYXRvciBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuc2V0KGRlY29yYXRvciwgbWV0YSk7XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlRW51bVZhbHVlKFxuICAgICAgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZW51bVN5bWJvbE5hbWU6IHN0cmluZyk6IG51bWJlcnxudWxsIHtcbiAgICBsZXQgcmVzb2x2ZWQ6IG51bWJlcnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcyhmaWVsZCkpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KGZpZWxkKSE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpIGFzIGFueTtcbiAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVudW1WYWx1ZSAmJiBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHZhbHVlLmVudW1SZWYsIGVudW1TeW1ib2xOYW1lKSkge1xuICAgICAgICByZXNvbHZlZCA9IHZhbHVlLnJlc29sdmVkIGFzIG51bWJlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBleHByLCB2YWx1ZSwgYCR7ZmllbGR9IG11c3QgYmUgYSBtZW1iZXIgb2YgJHtlbnVtU3ltYm9sTmFtZX0gZW51bSBmcm9tIEBhbmd1bGFyL2NvcmVgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc29sdmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdENvbXBvbmVudFN0eWxlVXJscyhcbiAgICAgIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICApOiBTdHlsZVVybE1ldGFbXSB7XG4gICAgaWYgKCFjb21wb25lbnQuaGFzKCdzdHlsZVVybHMnKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9leHRyYWN0U3R5bGVVcmxzRnJvbUV4cHJlc3Npb24oY29tcG9uZW50LmdldCgnc3R5bGVVcmxzJykhKTtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RTdHlsZVVybHNGcm9tRXhwcmVzc2lvbihzdHlsZVVybHNFeHByOiB0cy5FeHByZXNzaW9uKTogU3R5bGVVcmxNZXRhW10ge1xuICAgIGNvbnN0IHN0eWxlVXJsczogU3R5bGVVcmxNZXRhW10gPSBbXTtcblxuICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVVcmxzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3Qgc3R5bGVVcmxFeHByIG9mIHN0eWxlVXJsc0V4cHIuZWxlbWVudHMpIHtcbiAgICAgICAgaWYgKHRzLmlzU3ByZWFkRWxlbWVudChzdHlsZVVybEV4cHIpKSB7XG4gICAgICAgICAgc3R5bGVVcmxzLnB1c2goLi4udGhpcy5fZXh0cmFjdFN0eWxlVXJsc0Zyb21FeHByZXNzaW9uKHN0eWxlVXJsRXhwci5leHByZXNzaW9uKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3Qgc3R5bGVVcmwgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShzdHlsZVVybEV4cHIpO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiBzdHlsZVVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3Ioc3R5bGVVcmxFeHByLCBzdHlsZVVybCwgJ3N0eWxlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHlsZVVybHMucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHN0eWxlVXJsLFxuICAgICAgICAgICAgc291cmNlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcixcbiAgICAgICAgICAgIG5vZGVGb3JFcnJvcjogc3R5bGVVcmxFeHByLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGV2YWx1YXRlZFN0eWxlVXJscyA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHN0eWxlVXJsc0V4cHIpO1xuICAgICAgaWYgKCFpc1N0cmluZ0FycmF5KGV2YWx1YXRlZFN0eWxlVXJscykpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIHN0eWxlVXJsc0V4cHIsIGV2YWx1YXRlZFN0eWxlVXJscywgJ3N0eWxlVXJscyBtdXN0IGJlIGFuIGFycmF5IG9mIHN0cmluZ3MnKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBzdHlsZVVybCBvZiBldmFsdWF0ZWRTdHlsZVVybHMpIHtcbiAgICAgICAgc3R5bGVVcmxzLnB1c2goe1xuICAgICAgICAgIHVybDogc3R5bGVVcmwsXG4gICAgICAgICAgc291cmNlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcixcbiAgICAgICAgICBub2RlRm9yRXJyb3I6IHN0eWxlVXJsc0V4cHIsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdHlsZVVybHM7XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0U3R5bGVSZXNvdXJjZXMoY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6XG4gICAgICBSZWFkb25seVNldDxSZXNvdXJjZT4ge1xuICAgIGNvbnN0IHN0eWxlcyA9IG5ldyBTZXQ8UmVzb3VyY2U+KCk7XG4gICAgZnVuY3Rpb24gc3RyaW5nTGl0ZXJhbEVsZW1lbnRzKGFycmF5OiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uKTogdHMuU3RyaW5nTGl0ZXJhbExpa2VbXSB7XG4gICAgICByZXR1cm4gYXJyYXkuZWxlbWVudHMuZmlsdGVyKFxuICAgICAgICAgIChlOiB0cy5FeHByZXNzaW9uKTogZSBpcyB0cy5TdHJpbmdMaXRlcmFsTGlrZSA9PiB0cy5pc1N0cmluZ0xpdGVyYWxMaWtlKGUpKTtcbiAgICB9XG5cbiAgICAvLyBJZiBzdHlsZVVybHMgaXMgYSBsaXRlcmFsIGFycmF5LCBwcm9jZXNzIGVhY2ggcmVzb3VyY2UgdXJsIGluZGl2aWR1YWxseSBhbmRcbiAgICAvLyByZWdpc3RlciBvbmVzIHRoYXQgYXJlIHN0cmluZyBsaXRlcmFscy5cbiAgICBjb25zdCBzdHlsZVVybHNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVVcmxzJyk7XG4gICAgaWYgKHN0eWxlVXJsc0V4cHIgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVVcmxzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3QgZXhwcmVzc2lvbiBvZiBzdHJpbmdMaXRlcmFsRWxlbWVudHMoc3R5bGVVcmxzRXhwcikpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShleHByZXNzaW9uLnRleHQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgICBzdHlsZXMuYWRkKHtwYXRoOiBhYnNvbHV0ZUZyb20ocmVzb3VyY2VVcmwpLCBleHByZXNzaW9ufSk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIEVycm9ycyBpbiBzdHlsZSByZXNvdXJjZSBleHRyYWN0aW9uIGRvIG5vdCBuZWVkIHRvIGJlIGhhbmRsZWQgaGVyZS4gV2Ugd2lsbCBwcm9kdWNlXG4gICAgICAgICAgLy8gZGlhZ25vc3RpY3MgZm9yIGVhY2ggb25lIHRoYXQgZmFpbHMgaW4gdGhlIGFuYWx5c2lzLCBhZnRlciB3ZSBldmFsdWF0ZSB0aGUgYHN0eWxlVXJsc2BcbiAgICAgICAgICAvLyBleHByZXNzaW9uIHRvIGRldGVybWluZSBfYWxsXyBzdHlsZSByZXNvdXJjZXMsIG5vdCBqdXN0IHRoZSBzdHJpbmcgbGl0ZXJhbHMuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZXNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVzJyk7XG4gICAgaWYgKHN0eWxlc0V4cHIgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3QgZXhwcmVzc2lvbiBvZiBzdHJpbmdMaXRlcmFsRWxlbWVudHMoc3R5bGVzRXhwcikpIHtcbiAgICAgICAgc3R5bGVzLmFkZCh7cGF0aDogbnVsbCwgZXhwcmVzc2lvbn0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdHlsZXM7XG4gIH1cblxuICBwcml2YXRlIF9wcmVsb2FkQW5kUGFyc2VUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICAgICAgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IFByb21pc2U8UGFyc2VkVGVtcGxhdGVXaXRoU291cmNlfG51bGw+IHtcbiAgICBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGVVcmwnKSkge1xuICAgICAgLy8gRXh0cmFjdCB0aGUgdGVtcGxhdGVVcmwgYW5kIHByZWxvYWQgaXQuXG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybEV4cHIsIHRlbXBsYXRlVXJsLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVQcm9taXNlID1cbiAgICAgICAgICAgIHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCwge3R5cGU6ICd0ZW1wbGF0ZScsIGNvbnRhaW5pbmdGaWxlfSk7XG5cbiAgICAgICAgLy8gSWYgdGhlIHByZWxvYWQgd29ya2VkLCB0aGVuIGFjdHVhbGx5IGxvYWQgYW5kIHBhcnNlIHRoZSB0ZW1wbGF0ZSwgYW5kIHdhaXQgZm9yIGFueSBzdHlsZVxuICAgICAgICAvLyBVUkxzIHRvIHJlc29sdmUuXG4gICAgICAgIGlmICh0ZW1wbGF0ZVByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiB0ZW1wbGF0ZVByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPVxuICAgICAgICAgICAgICAgIHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgICAgICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyB0aGlzLm1ha2VSZXNvdXJjZU5vdEZvdW5kRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybCwgdGVtcGxhdGVVcmxFeHByLCBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5UZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlRGVjbCA9IHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRlbXBsYXRlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RUZW1wbGF0ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCB0ZW1wbGF0ZTogVGVtcGxhdGVEZWNsYXJhdGlvbik6XG4gICAgICBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2Uge1xuICAgIGlmICh0ZW1wbGF0ZS5pc0lubGluZSkge1xuICAgICAgbGV0IHNvdXJjZVN0cjogc3RyaW5nO1xuICAgICAgbGV0IHNvdXJjZVBhcnNlUmFuZ2U6IExleGVyUmFuZ2V8bnVsbCA9IG51bGw7XG4gICAgICBsZXQgdGVtcGxhdGVDb250ZW50OiBzdHJpbmc7XG4gICAgICBsZXQgc291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuICAgICAgbGV0IGVzY2FwZWRTdHJpbmcgPSBmYWxzZTtcbiAgICAgIGxldCBzb3VyY2VNYXBVcmw6IHN0cmluZ3xudWxsO1xuICAgICAgLy8gV2Ugb25seSBzdXBwb3J0IFNvdXJjZU1hcHMgZm9yIGlubGluZSB0ZW1wbGF0ZXMgdGhhdCBhcmUgc2ltcGxlIHN0cmluZyBsaXRlcmFscy5cbiAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwodGVtcGxhdGUuZXhwcmVzc2lvbikgfHxcbiAgICAgICAgICB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKHRlbXBsYXRlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIC8vIHRoZSBzdGFydCBhbmQgZW5kIG9mIHRoZSBgdGVtcGxhdGVFeHByYCBub2RlIGluY2x1ZGVzIHRoZSBxdW90YXRpb24gbWFya3MsIHdoaWNoIHdlIG11c3RcbiAgICAgICAgLy8gc3RyaXBcbiAgICAgICAgc291cmNlUGFyc2VSYW5nZSA9IGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGUuZXhwcmVzc2lvbik7XG4gICAgICAgIHNvdXJjZVN0ciA9IHRlbXBsYXRlLmV4cHJlc3Npb24uZ2V0U291cmNlRmlsZSgpLnRleHQ7XG4gICAgICAgIHRlbXBsYXRlQ29udGVudCA9IHRlbXBsYXRlLmV4cHJlc3Npb24udGV4dDtcbiAgICAgICAgZXNjYXBlZFN0cmluZyA9IHRydWU7XG4gICAgICAgIHNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgICAgdHlwZTogJ2RpcmVjdCcsXG4gICAgICAgICAgbm9kZTogdGVtcGxhdGUuZXhwcmVzc2lvbixcbiAgICAgICAgfTtcbiAgICAgICAgc291cmNlTWFwVXJsID0gdGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkVGVtcGxhdGUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZS5leHByZXNzaW9uKTtcbiAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZFRlbXBsYXRlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIHRlbXBsYXRlLmV4cHJlc3Npb24sIHJlc29sdmVkVGVtcGxhdGUsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgZG8gbm90IHBhcnNlIHRoZSB0ZW1wbGF0ZSBkaXJlY3RseSBmcm9tIHRoZSBzb3VyY2UgZmlsZSB1c2luZyBhIGxleGVyIHJhbmdlLCBzb1xuICAgICAgICAvLyB0aGUgdGVtcGxhdGUgc291cmNlIGFuZCBjb250ZW50IGFyZSBzZXQgdG8gdGhlIHN0YXRpY2FsbHkgcmVzb2x2ZWQgdGVtcGxhdGUuXG4gICAgICAgIHNvdXJjZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgICAgIHRlbXBsYXRlQ29udGVudCA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgICAgIHNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgICAgdHlwZTogJ2luZGlyZWN0JyxcbiAgICAgICAgICBub2RlOiB0ZW1wbGF0ZS5leHByZXNzaW9uLFxuICAgICAgICAgIGNvbXBvbmVudENsYXNzOiBub2RlLFxuICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZUNvbnRlbnQsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW5kaXJlY3QgdGVtcGxhdGVzIGNhbm5vdCBiZSBtYXBwZWQgdG8gYSBwYXJ0aWN1bGFyIGJ5dGUgcmFuZ2Ugb2YgYW55IGlucHV0IGZpbGUsIHNpbmNlXG4gICAgICAgIC8vIHRoZXkncmUgY29tcHV0ZWQgYnkgZXhwcmVzc2lvbnMgdGhhdCBtYXkgc3BhbiBtYW55IGZpbGVzLiBEb24ndCBhdHRlbXB0IHRvIG1hcCB0aGVtIGJhY2tcbiAgICAgICAgLy8gdG8gYSBnaXZlbiBmaWxlLlxuICAgICAgICBzb3VyY2VNYXBVcmwgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi50aGlzLl9wYXJzZVRlbXBsYXRlKHRlbXBsYXRlLCBzb3VyY2VTdHIsIHNvdXJjZVBhcnNlUmFuZ2UsIGVzY2FwZWRTdHJpbmcsIHNvdXJjZU1hcFVybCksXG4gICAgICAgIGNvbnRlbnQ6IHRlbXBsYXRlQ29udGVudCxcbiAgICAgICAgc291cmNlTWFwcGluZyxcbiAgICAgICAgZGVjbGFyYXRpb246IHRlbXBsYXRlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGVDb250ZW50ID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHRlbXBsYXRlLnJlc29sdmVkVGVtcGxhdGVVcmwpO1xuICAgICAgaWYgKHRoaXMuZGVwVHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmRlcFRyYWNrZXIuYWRkUmVzb3VyY2VEZXBlbmRlbmN5KFxuICAgICAgICAgICAgbm9kZS5nZXRTb3VyY2VGaWxlKCksIGFic29sdXRlRnJvbSh0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLnRoaXMuX3BhcnNlVGVtcGxhdGUoXG4gICAgICAgICAgICB0ZW1wbGF0ZSwgLyogc291cmNlU3RyICovIHRlbXBsYXRlQ29udGVudCwgLyogc291cmNlUGFyc2VSYW5nZSAqLyBudWxsLFxuICAgICAgICAgICAgLyogZXNjYXBlZFN0cmluZyAqLyBmYWxzZSxcbiAgICAgICAgICAgIC8qIHNvdXJjZU1hcFVybCAqLyB0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsKSxcbiAgICAgICAgY29udGVudDogdGVtcGxhdGVDb250ZW50LFxuICAgICAgICBzb3VyY2VNYXBwaW5nOiB7XG4gICAgICAgICAgdHlwZTogJ2V4dGVybmFsJyxcbiAgICAgICAgICBjb21wb25lbnRDbGFzczogbm9kZSxcbiAgICAgICAgICAvLyBUT0RPKGFseGh1Yik6IFRTIGluIGczIGlzIHVuYWJsZSB0byBtYWtlIHRoaXMgaW5mZXJlbmNlIG9uIGl0cyBvd24sIHNvIGNhc3QgaXQgaGVyZVxuICAgICAgICAgIC8vIHVudGlsIGczIGlzIGFibGUgdG8gZmlndXJlIHRoaXMgb3V0LlxuICAgICAgICAgIG5vZGU6ICh0ZW1wbGF0ZSBhcyBFeHRlcm5hbFRlbXBsYXRlRGVjbGFyYXRpb24pLnRlbXBsYXRlVXJsRXhwcmVzc2lvbixcbiAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVDb250ZW50LFxuICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsLFxuICAgICAgICB9LFxuICAgICAgICBkZWNsYXJhdGlvbjogdGVtcGxhdGUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3BhcnNlVGVtcGxhdGUoXG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGVEZWNsYXJhdGlvbiwgc291cmNlU3RyOiBzdHJpbmcsIHNvdXJjZVBhcnNlUmFuZ2U6IExleGVyUmFuZ2V8bnVsbCxcbiAgICAgIGVzY2FwZWRTdHJpbmc6IGJvb2xlYW4sIHNvdXJjZU1hcFVybDogc3RyaW5nfG51bGwpOiBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSB7XG4gICAgLy8gV2UgYWx3YXlzIG5vcm1hbGl6ZSBsaW5lIGVuZGluZ3MgaWYgdGhlIHRlbXBsYXRlIGhhcyBiZWVuIGVzY2FwZWQgKGkuZS4gaXMgaW5saW5lKS5cbiAgICBjb25zdCBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgPSBlc2NhcGVkU3RyaW5nIHx8IHRoaXMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzO1xuXG4gICAgY29uc3QgcGFyc2VkVGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKHNvdXJjZVN0ciwgc291cmNlTWFwVXJsID8/ICcnLCB7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0ZW1wbGF0ZS5wcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZzogdGVtcGxhdGUuaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgIHJhbmdlOiBzb3VyY2VQYXJzZVJhbmdlID8/IHVuZGVmaW5lZCxcbiAgICAgIGVzY2FwZWRTdHJpbmcsXG4gICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiB0aGlzLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMsXG4gICAgICBhbHdheXNBdHRlbXB0SHRtbFRvUjNBc3RDb252ZXJzaW9uOiB0aGlzLnVzZVBvaXNvbmVkRGF0YSxcbiAgICB9KTtcblxuICAgIC8vIFVuZm9ydHVuYXRlbHksIHRoZSBwcmltYXJ5IHBhcnNlIG9mIHRoZSB0ZW1wbGF0ZSBhYm92ZSBtYXkgbm90IGNvbnRhaW4gYWNjdXJhdGUgc291cmNlIG1hcFxuICAgIC8vIGluZm9ybWF0aW9uLiBJZiB1c2VkIGRpcmVjdGx5LCBpdCB3b3VsZCByZXN1bHQgaW4gaW5jb3JyZWN0IGNvZGUgbG9jYXRpb25zIGluIHRlbXBsYXRlXG4gICAgLy8gZXJyb3JzLCBldGMuIFRoZXJlIGFyZSB0aHJlZSBtYWluIHByb2JsZW1zOlxuICAgIC8vXG4gICAgLy8gMS4gYHByZXNlcnZlV2hpdGVzcGFjZXM6IGZhbHNlYCBhbm5paGlsYXRlcyB0aGUgY29ycmVjdG5lc3Mgb2YgdGVtcGxhdGUgc291cmNlIG1hcHBpbmcsIGFzXG4gICAgLy8gICAgdGhlIHdoaXRlc3BhY2UgdHJhbnNmb3JtYXRpb24gY2hhbmdlcyB0aGUgY29udGVudHMgb2YgSFRNTCB0ZXh0IG5vZGVzIGJlZm9yZSB0aGV5J3JlXG4gICAgLy8gICAgcGFyc2VkIGludG8gQW5ndWxhciBleHByZXNzaW9ucy5cbiAgICAvLyAyLiBgcHJlc2VydmVMaW5lRW5kaW5nczogZmFsc2VgIGNhdXNlcyBncm93aW5nIG1pc2FsaWdubWVudHMgaW4gdGVtcGxhdGVzIHRoYXQgdXNlICdcXHJcXG4nXG4gICAgLy8gICAgbGluZSBlbmRpbmdzLCBieSBub3JtYWxpemluZyB0aGVtIHRvICdcXG4nLlxuICAgIC8vIDMuIEJ5IGRlZmF1bHQsIHRoZSB0ZW1wbGF0ZSBwYXJzZXIgc3RyaXBzIGxlYWRpbmcgdHJpdmlhIGNoYXJhY3RlcnMgKGxpa2Ugc3BhY2VzLCB0YWJzLCBhbmRcbiAgICAvLyAgICBuZXdsaW5lcykuIFRoaXMgYWxzbyBkZXN0cm95cyBzb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbi5cbiAgICAvL1xuICAgIC8vIEluIG9yZGVyIHRvIGd1YXJhbnRlZSB0aGUgY29ycmVjdG5lc3Mgb2YgZGlhZ25vc3RpY3MsIHRlbXBsYXRlcyBhcmUgcGFyc2VkIGEgc2Vjb25kIHRpbWVcbiAgICAvLyB3aXRoIHRoZSBhYm92ZSBvcHRpb25zIHNldCB0byBwcmVzZXJ2ZSBzb3VyY2UgbWFwcGluZ3MuXG5cbiAgICBjb25zdCB7bm9kZXM6IGRpYWdOb2Rlc30gPSBwYXJzZVRlbXBsYXRlKHNvdXJjZVN0ciwgc291cmNlTWFwVXJsID8/ICcnLCB7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgcHJlc2VydmVMaW5lRW5kaW5nczogdHJ1ZSxcbiAgICAgIGludGVycG9sYXRpb25Db25maWc6IHRlbXBsYXRlLmludGVycG9sYXRpb25Db25maWcsXG4gICAgICByYW5nZTogc291cmNlUGFyc2VSYW5nZSA/PyB1bmRlZmluZWQsXG4gICAgICBlc2NhcGVkU3RyaW5nLFxuICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogdGhpcy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgICAgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICAgIGFsd2F5c0F0dGVtcHRIdG1sVG9SM0FzdENvbnZlcnNpb246IHRoaXMudXNlUG9pc29uZWREYXRhLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnBhcnNlZFRlbXBsYXRlLFxuICAgICAgZGlhZ05vZGVzLFxuICAgICAgZmlsZTogbmV3IFBhcnNlU291cmNlRmlsZShzb3VyY2VTdHIsIHNvdXJjZU1hcFVybCA/PyAnJyksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKFxuICAgICAgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICBjb250YWluaW5nRmlsZTogc3RyaW5nKTogVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gICAgbGV0IHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4gPSB0aGlzLmRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHZhbHVlLCAncHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IGJlIGEgYm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyA9IHZhbHVlO1xuICAgIH1cblxuICAgIGxldCBpbnRlcnBvbGF0aW9uQ29uZmlnID0gREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRztcbiAgICBpZiAoY29tcG9uZW50LmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgnaW50ZXJwb2xhdGlvbicpITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlLmxlbmd0aCAhPT0gMiB8fFxuICAgICAgICAgICF2YWx1ZS5ldmVyeShlbGVtZW50ID0+IHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGV4cHIsIHZhbHVlLCAnaW50ZXJwb2xhdGlvbiBtdXN0IGJlIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cyBvZiBzdHJpbmcgdHlwZScpO1xuICAgICAgfVxuICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyA9IEludGVycG9sYXRpb25Db25maWcuZnJvbUFycmF5KHZhbHVlIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xuICAgIH1cblxuICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybEV4cHIsIHRlbXBsYXRlVXJsLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpc0lubGluZTogZmFsc2UsXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICAgIHRlbXBsYXRlVXJsLFxuICAgICAgICAgIHRlbXBsYXRlVXJsRXhwcmVzc2lvbjogdGVtcGxhdGVVcmxFeHByLFxuICAgICAgICAgIHJlc29sdmVkVGVtcGxhdGVVcmw6IHJlc291cmNlVXJsLFxuICAgICAgICB9O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyB0aGlzLm1ha2VSZXNvdXJjZU5vdEZvdW5kRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybCwgdGVtcGxhdGVVcmxFeHByLCBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5UZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc0lubGluZTogdHJ1ZSxcbiAgICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyxcbiAgICAgICAgZXhwcmVzc2lvbjogY29tcG9uZW50LmdldCgndGVtcGxhdGUnKSEsXG4gICAgICAgIHRlbXBsYXRlVXJsOiBjb250YWluaW5nRmlsZSxcbiAgICAgICAgcmVzb2x2ZWRUZW1wbGF0ZVVybDogY29udGFpbmluZ0ZpbGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9NSVNTSU5HX1RFTVBMQVRFLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgJ2NvbXBvbmVudCBpcyBtaXNzaW5nIGEgdGVtcGxhdGUnKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlSW1wb3J0ZWRGaWxlKGltcG9ydGVkRmlsZTogSW1wb3J0ZWRGaWxlLCBleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICAvLyBJZiBgaW1wb3J0ZWRGaWxlYCBpcyBub3QgJ3Vua25vd24nIHRoZW4gaXQgYWNjdXJhdGVseSByZWZsZWN0cyB0aGUgc291cmNlIGZpbGUgdGhhdCBpc1xuICAgIC8vIGJlaW5nIGltcG9ydGVkLlxuICAgIGlmIChpbXBvcnRlZEZpbGUgIT09ICd1bmtub3duJykge1xuICAgICAgcmV0dXJuIGltcG9ydGVkRmlsZTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgYGV4cHJgIGhhcyB0byBiZSBpbnNwZWN0ZWQgdG8gZGV0ZXJtaW5lIHRoZSBmaWxlIHRoYXQgaXMgYmVpbmcgaW1wb3J0ZWQuIElmIGBleHByYFxuICAgIC8vIGlzIG5vdCBhbiBgRXh0ZXJuYWxFeHByYCB0aGVuIGl0IGRvZXMgbm90IGNvcnJlc3BvbmQgd2l0aCBhbiBpbXBvcnQsIHNvIHJldHVybiBudWxsIGluIHRoYXRcbiAgICAvLyBjYXNlLlxuICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBGaWd1cmUgb3V0IHdoYXQgZmlsZSBpcyBiZWluZyBpbXBvcnRlZC5cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlKGV4cHIudmFsdWUubW9kdWxlTmFtZSEsIG9yaWdpbi5maWxlTmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhZGRpbmcgYW4gaW1wb3J0IGZyb20gYG9yaWdpbmAgdG8gdGhlIHNvdXJjZS1maWxlIGNvcnJlc3BvbmRpbmcgdG8gYGV4cHJgIHdvdWxkXG4gICAqIGNyZWF0ZSBhIGN5Y2xpYyBpbXBvcnQuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgYEN5Y2xlYCBvYmplY3QgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLCBvdGhlcndpc2UgYG51bGxgLlxuICAgKi9cbiAgcHJpdmF0ZSBfY2hlY2tGb3JDeWNsaWNJbXBvcnQoXG4gICAgICBpbXBvcnRlZEZpbGU6IEltcG9ydGVkRmlsZSwgZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogQ3ljbGV8bnVsbCB7XG4gICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLl9yZXNvbHZlSW1wb3J0ZWRGaWxlKGltcG9ydGVkRmlsZSwgZXhwciwgb3JpZ2luKTtcbiAgICBpZiAoaW1wb3J0ZWQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSBpbXBvcnQgaXMgbGVnYWwuXG4gICAgcmV0dXJuIHRoaXMuY3ljbGVBbmFseXplci53b3VsZENyZWF0ZUN5Y2xlKG9yaWdpbiwgaW1wb3J0ZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVjb3JkU3ludGhldGljSW1wb3J0KFxuICAgICAgaW1wb3J0ZWRGaWxlOiBJbXBvcnRlZEZpbGUsIGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGltcG9ydGVkID0gdGhpcy5fcmVzb2x2ZUltcG9ydGVkRmlsZShpbXBvcnRlZEZpbGUsIGV4cHIsIG9yaWdpbik7XG4gICAgaWYgKGltcG9ydGVkID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jeWNsZUFuYWx5emVyLnJlY29yZFN5bnRoZXRpY0ltcG9ydChvcmlnaW4sIGltcG9ydGVkKTtcbiAgfVxuXG4gIHByaXZhdGUgbWFrZVJlc291cmNlTm90Rm91bmRFcnJvcihcbiAgICAgIGZpbGU6IHN0cmluZywgbm9kZUZvckVycm9yOiB0cy5Ob2RlLFxuICAgICAgcmVzb3VyY2VUeXBlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcyk6IEZhdGFsRGlhZ25vc3RpY0Vycm9yIHtcbiAgICBsZXQgZXJyb3JUZXh0OiBzdHJpbmc7XG4gICAgc3dpdGNoIChyZXNvdXJjZVR5cGUpIHtcbiAgICAgIGNhc2UgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuVGVtcGxhdGU6XG4gICAgICAgIGVycm9yVGV4dCA9IGBDb3VsZCBub3QgZmluZCB0ZW1wbGF0ZSBmaWxlICcke2ZpbGV9Jy5gO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZTpcbiAgICAgICAgZXJyb3JUZXh0ID0gYENvdWxkIG5vdCBmaW5kIHN0eWxlc2hlZXQgZmlsZSAnJHtmaWxlfScgbGlua2VkIGZyb20gdGhlIHRlbXBsYXRlLmA7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcjpcbiAgICAgICAgZXJyb3JUZXh0ID0gYENvdWxkIG5vdCBmaW5kIHN0eWxlc2hlZXQgZmlsZSAnJHtmaWxlfScuYDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9SRVNPVVJDRV9OT1RfRk9VTkQsIG5vZGVGb3JFcnJvciwgZXJyb3JUZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RUZW1wbGF0ZVN0eWxlVXJscyh0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlKTogU3R5bGVVcmxNZXRhW10ge1xuICAgIGlmICh0ZW1wbGF0ZS5zdHlsZVVybHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlRm9yRXJyb3IgPSBnZXRUZW1wbGF0ZURlY2xhcmF0aW9uTm9kZUZvckVycm9yKHRlbXBsYXRlLmRlY2xhcmF0aW9uKTtcbiAgICByZXR1cm4gdGVtcGxhdGUuc3R5bGVVcmxzLm1hcChcbiAgICAgICAgdXJsID0+ICh7dXJsLCBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGUsIG5vZGVGb3JFcnJvcn0pKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZVJhbmdlKHRlbXBsYXRlRXhwcjogdHMuRXhwcmVzc2lvbikge1xuICBjb25zdCBzdGFydFBvcyA9IHRlbXBsYXRlRXhwci5nZXRTdGFydCgpICsgMTtcbiAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPVxuICAgICAgdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24odGVtcGxhdGVFeHByLmdldFNvdXJjZUZpbGUoKSwgc3RhcnRQb3MpO1xuICByZXR1cm4ge1xuICAgIHN0YXJ0UG9zLFxuICAgIHN0YXJ0TGluZTogbGluZSxcbiAgICBzdGFydENvbDogY2hhcmFjdGVyLFxuICAgIGVuZFBvczogdGVtcGxhdGVFeHByLmdldEVuZCgpIC0gMSxcbiAgfTtcbn1cblxuLyoqIERldGVybWluZXMgaWYgdGhlIHJlc3VsdCBvZiBhbiBldmFsdWF0aW9uIGlzIGEgc3RyaW5nIGFycmF5LiAqL1xuZnVuY3Rpb24gaXNTdHJpbmdBcnJheShyZXNvbHZlZFZhbHVlOiBSZXNvbHZlZFZhbHVlKTogcmVzb2x2ZWRWYWx1ZSBpcyBzdHJpbmdbXSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHJlc29sdmVkVmFsdWUpICYmIHJlc29sdmVkVmFsdWUuZXZlcnkoZWxlbSA9PiB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycpO1xufVxuXG4vKiogRGV0ZXJtaW5lcyB0aGUgbm9kZSB0byB1c2UgZm9yIGRlYnVnZ2luZyBwdXJwb3NlcyBmb3IgdGhlIGdpdmVuIFRlbXBsYXRlRGVjbGFyYXRpb24uICovXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZURlY2xhcmF0aW9uTm9kZUZvckVycm9yKGRlY2xhcmF0aW9uOiBUZW1wbGF0ZURlY2xhcmF0aW9uKTogdHMuTm9kZSB7XG4gIC8vIFRPRE8oemFyZW5kKTogQ2hhbmdlIHRoaXMgdG8gaWYvZWxzZSB3aGVuIHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIGczLiBUaGlzIHVzZXMgYSBzd2l0Y2hcbiAgLy8gYmVjYXVzZSBpZi9lbHNlIGZhaWxzIHRvIGNvbXBpbGUgb24gZzMuIFRoYXQgaXMgYmVjYXVzZSBnMyBjb21waWxlcyB0aGlzIGluIG5vbi1zdHJpY3QgbW9kZVxuICAvLyB3aGVyZSB0eXBlIGluZmVyZW5jZSBkb2VzIG5vdCB3b3JrIGNvcnJlY3RseS5cbiAgc3dpdGNoIChkZWNsYXJhdGlvbi5pc0lubGluZSkge1xuICAgIGNhc2UgdHJ1ZTpcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbi5leHByZXNzaW9uO1xuICAgIGNhc2UgZmFsc2U6XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb24udGVtcGxhdGVVcmxFeHByZXNzaW9uO1xuICB9XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRlbXBsYXRlIHdoaWNoIHdhcyBleHRyYWN0ZWQgZHVyaW5nIHBhcnNpbmcuXG4gKlxuICogVGhpcyBjb250YWlucyB0aGUgYWN0dWFsIHBhcnNlZCB0ZW1wbGF0ZSBhcyB3ZWxsIGFzIGFueSBtZXRhZGF0YSBjb2xsZWN0ZWQgZHVyaW5nIGl0cyBwYXJzaW5nLFxuICogc29tZSBvZiB3aGljaCBtaWdodCBiZSB1c2VmdWwgZm9yIHJlLXBhcnNpbmcgdGhlIHRlbXBsYXRlIHdpdGggZGlmZmVyZW50IG9wdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkQ29tcG9uZW50VGVtcGxhdGUgZXh0ZW5kcyBQYXJzZWRUZW1wbGF0ZSB7XG4gIC8qKlxuICAgKiBUaGUgdGVtcGxhdGUgQVNULCBwYXJzZWQgaW4gYSBtYW5uZXIgd2hpY2ggcHJlc2VydmVzIHNvdXJjZSBtYXAgaW5mb3JtYXRpb24gZm9yIGRpYWdub3N0aWNzLlxuICAgKlxuICAgKiBOb3QgdXNlZnVsIGZvciBlbWl0LlxuICAgKi9cbiAgZGlhZ05vZGVzOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBUaGUgYFBhcnNlU291cmNlRmlsZWAgZm9yIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIGZpbGU6IFBhcnNlU291cmNlRmlsZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2UgZXh0ZW5kcyBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSB7XG4gIC8qKiBUaGUgc3RyaW5nIGNvbnRlbnRzIG9mIHRoZSB0ZW1wbGF0ZS4gKi9cbiAgY29udGVudDogc3RyaW5nO1xuICBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gIGRlY2xhcmF0aW9uOiBUZW1wbGF0ZURlY2xhcmF0aW9uO1xufVxuXG4vKipcbiAqIENvbW1vbiBmaWVsZHMgZXh0cmFjdGVkIGZyb20gdGhlIGRlY2xhcmF0aW9uIG9mIGEgdGVtcGxhdGUuXG4gKi9cbmludGVyZmFjZSBDb21tb25UZW1wbGF0ZURlY2xhcmF0aW9uIHtcbiAgcHJlc2VydmVXaGl0ZXNwYWNlczogYm9vbGVhbjtcbiAgaW50ZXJwb2xhdGlvbkNvbmZpZzogSW50ZXJwb2xhdGlvbkNvbmZpZztcbiAgdGVtcGxhdGVVcmw6IHN0cmluZztcbiAgcmVzb2x2ZWRUZW1wbGF0ZVVybDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNsYXJhdGlvbiBvZiBhbiBpbmxpbmUgdGVtcGxhdGUuXG4gKi9cbmludGVyZmFjZSBJbmxpbmVUZW1wbGF0ZURlY2xhcmF0aW9uIGV4dGVuZHMgQ29tbW9uVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gIGlzSW5saW5lOiB0cnVlO1xuICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNsYXJhdGlvbiBvZiBhbiBleHRlcm5hbCB0ZW1wbGF0ZS5cbiAqL1xuaW50ZXJmYWNlIEV4dGVybmFsVGVtcGxhdGVEZWNsYXJhdGlvbiBleHRlbmRzIENvbW1vblRlbXBsYXRlRGVjbGFyYXRpb24ge1xuICBpc0lubGluZTogZmFsc2U7XG4gIHRlbXBsYXRlVXJsRXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcbn1cblxuLyoqXG4gKiBUaGUgZGVjbGFyYXRpb24gb2YgYSB0ZW1wbGF0ZSBleHRyYWN0ZWQgZnJvbSBhIGNvbXBvbmVudCBkZWNvcmF0b3IuXG4gKlxuICogVGhpcyBkYXRhIGlzIGV4dHJhY3RlZCBhbmQgc3RvcmVkIHNlcGFyYXRlbHkgdG8gZmFjaWxpdGF0ZSByZS1pbnRlcnByZXRpbmcgdGhlIHRlbXBsYXRlXG4gKiBkZWNsYXJhdGlvbiB3aGVuZXZlciB0aGUgY29tcGlsZXIgaXMgbm90aWZpZWQgb2YgYSBjaGFuZ2UgdG8gYSB0ZW1wbGF0ZSBmaWxlLiBXaXRoIHRoaXNcbiAqIGluZm9ybWF0aW9uLCBgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcmAgaXMgYWJsZSB0byByZS1yZWFkIHRoZSB0ZW1wbGF0ZSBhbmQgdXBkYXRlIHRoZSBjb21wb25lbnRcbiAqIHJlY29yZCB3aXRob3V0IG5lZWRpbmcgdG8gcGFyc2UgdGhlIG9yaWdpbmFsIGRlY29yYXRvciBhZ2Fpbi5cbiAqL1xudHlwZSBUZW1wbGF0ZURlY2xhcmF0aW9uID0gSW5saW5lVGVtcGxhdGVEZWNsYXJhdGlvbnxFeHRlcm5hbFRlbXBsYXRlRGVjbGFyYXRpb247XG5cbi8qKlxuICogR2VuZXJhdGUgYSBkaWFnbm9zdGljIHJlbGF0ZWQgaW5mb3JtYXRpb24gb2JqZWN0IHRoYXQgZGVzY3JpYmVzIGEgcG90ZW50aWFsIGN5Y2xpYyBpbXBvcnQgcGF0aC5cbiAqL1xuZnVuY3Rpb24gbWFrZUN5Y2xpY0ltcG9ydEluZm8oXG4gICAgcmVmOiBSZWZlcmVuY2UsIHR5cGU6IHN0cmluZywgY3ljbGU6IEN5Y2xlKTogdHMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbiB7XG4gIGNvbnN0IG5hbWUgPSByZWYuZGVidWdOYW1lIHx8ICcodW5rbm93biknO1xuICBjb25zdCBwYXRoID0gY3ljbGUuZ2V0UGF0aCgpLm1hcChzZiA9PiBzZi5maWxlTmFtZSkuam9pbignIC0+ICcpO1xuICBjb25zdCBtZXNzYWdlID1cbiAgICAgIGBUaGUgJHt0eXBlfSAnJHtuYW1lfScgaXMgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYnV0IGltcG9ydGluZyBpdCB3b3VsZCBjcmVhdGUgYSBjeWNsZTogYDtcbiAgcmV0dXJuIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24ocmVmLm5vZGUsIG1lc3NhZ2UgKyBwYXRoKTtcbn1cblxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgc2VsZWN0b3IgaXMgYSB2YWxpZCBjdXN0b20gZWxlbWVudCB0YWcgbmFtZS5cbiAqIEJhc2VkIGxvb3NlbHkgb24gaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy92YWxpZGF0ZS1lbGVtZW50LW5hbWUuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrQ3VzdG9tRWxlbWVudFNlbGVjdG9yRm9yRXJyb3JzKHNlbGVjdG9yOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gIC8vIEF2b2lkIGZsYWdnaW5nIGNvbXBvbmVudHMgd2l0aCBhbiBhdHRyaWJ1dGUgb3IgY2xhc3Mgc2VsZWN0b3IuIFRoaXMgaXNuJ3QgYnVsbGV0cHJvb2Ygc2luY2UgaXRcbiAgLy8gd29uJ3QgY2F0Y2ggY2FzZXMgbGlrZSBgZm9vW11iYXJgLCBidXQgd2UgZG9uJ3QgbmVlZCBpdCB0byBiZS4gVGhpcyBpcyBtYWlubHkgdG8gYXZvaWQgZmxhZ2dpbmdcbiAgLy8gc29tZXRoaW5nIGxpa2UgYGZvby1iYXJbYmF6XWAgaW5jb3JyZWN0bHkuXG4gIGlmIChzZWxlY3Rvci5pbmNsdWRlcygnLicpIHx8IChzZWxlY3Rvci5pbmNsdWRlcygnWycpICYmIHNlbGVjdG9yLmluY2x1ZGVzKCddJykpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoISgvXlthLXpdLy50ZXN0KHNlbGVjdG9yKSkpIHtcbiAgICByZXR1cm4gJ1NlbGVjdG9yIG9mIGEgU2hhZG93RG9tLWVuY2Fwc3VsYXRlZCBjb21wb25lbnQgbXVzdCBzdGFydCB3aXRoIGEgbG93ZXIgY2FzZSBsZXR0ZXIuJztcbiAgfVxuXG4gIGlmICgvW0EtWl0vLnRlc3Qoc2VsZWN0b3IpKSB7XG4gICAgcmV0dXJuICdTZWxlY3RvciBvZiBhIFNoYWRvd0RvbS1lbmNhcHN1bGF0ZWQgY29tcG9uZW50IG11c3QgYWxsIGJlIGluIGxvd2VyIGNhc2UuJztcbiAgfVxuXG4gIGlmICghc2VsZWN0b3IuaW5jbHVkZXMoJy0nKSkge1xuICAgIHJldHVybiAnU2VsZWN0b3Igb2YgYSBjb21wb25lbnQgdGhhdCB1c2VzIFZpZXdFbmNhcHN1bGF0aW9uLlNoYWRvd0RvbSBtdXN0IGNvbnRhaW4gYSBoeXBoZW4uJztcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIl19