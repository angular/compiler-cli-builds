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
        (0, tslib_1.__extends)(ComponentSymbol, _super);
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
                return (0, semantic_graph_1.isReferenceEqual)(current, previous) && !publicApiAffected.has(current.symbol);
            };
            // The emit of a component is affected if either of the following is true:
            //  1. The component used to be remotely scoped but no longer is, or vice versa.
            //  2. The list of used directives has changed or any of those directives have had their public
            //     API changed. If the used directives have been reordered but not otherwise affected then
            //     the component must still be re-emitted, as this may affect directive instantiation order.
            //  3. The list of used pipes has changed, or any of those pipes have had their public API
            //     changed.
            return this.isRemotelyScoped !== previousSymbol.isRemotelyScoped ||
                !(0, semantic_graph_1.isArrayEqual)(this.usedDirectives, previousSymbol.usedDirectives, isSymbolUnaffected) ||
                !(0, semantic_graph_1.isArrayEqual)(this.usedPipes, previousSymbol.usedPipes, isSymbolUnaffected);
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
                return (0, semantic_graph_1.isReferenceEqual)(current, previous) && !isInheritanceChainAffected(current.symbol);
            };
            // Create an equality function that considers pipes equal if they represent the same
            // declaration and if the symbol in the current compilation does not have its type-check
            // API affected.
            var isPipeUnaffected = function (current, previous) {
                return (0, semantic_graph_1.isReferenceEqual)(current, previous) && !typeCheckApiAffected.has(current.symbol);
            };
            // The emit of a type-check block of a component is affected if either of the following is true:
            //  1. The list of used directives has changed or any of those directives have had their
            //     type-check API changed.
            //  2. The list of used pipes has changed, or any of those pipes have had their type-check API
            //     changed.
            return !(0, semantic_graph_1.isArrayEqual)(this.usedDirectives, previousSymbol.usedDirectives, isDirectiveUnaffected) ||
                !(0, semantic_graph_1.isArrayEqual)(this.usedPipes, previousSymbol.usedPipes, isPipeUnaffected);
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
            var decorator = (0, util_1.findAngularDecorator)(decorators, 'Component', this.isCore);
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
            var component = (0, reflection_1.reflectObjectLiteral)(meta);
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
                var litStyles = (0, directive_1.parseFieldArrayValue)(component, 'styles', this.evaluator);
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
                .all((0, tslib_1.__spreadArray)([
                templateAndTemplateStyleResources, inlineStyles
            ], (0, tslib_1.__read)(componentStyleUrls.map(function (styleUrl) { return resolveStyleUrl(styleUrl.url); })), false))
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
            var directiveResult = (0, directive_1.extractDirectiveMetadata)(node, decorator, this.reflector, this.evaluator, this.isCore, flags, this.annotateForClosureCompiler, this.elementSchemaRegistry.getDefaultComponentElementName());
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
                var candidate = (0, file_system_1.relative)((0, file_system_1.absoluteFrom)(rootDir), (0, file_system_1.absoluteFrom)(containingFile));
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
                    (0, util_1.resolveProvidersRequiringFactory)(viewProviders, this.reflector, this.evaluator);
                wrappedViewProviders = new compiler_1.WrappedNodeExpr(this.annotateForClosureCompiler ? (0, util_1.wrapFunctionExpressionsInParens)(viewProviders) :
                    viewProviders);
            }
            if (component.has('providers')) {
                providersRequiringFactory = (0, util_1.resolveProvidersRequiringFactory)(component.get('providers'), this.reflector, this.evaluator);
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
                path: (0, file_system_1.absoluteFrom)(template.declaration.resolvedTemplateUrl),
                expression: template.sourceMapping.node
            };
            // Figure out the set of styles. The ordering here is important: external resources (styleUrls)
            // precede inline styles, and styles defined in the template override styles defined in the
            // component.
            var styles = [];
            var styleResources = this._extractStyleResources(component, containingFile);
            var styleUrls = (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(this._extractComponentStyleUrls(component)), false), (0, tslib_1.__read)(this._extractTemplateStyleUrls(template)), false);
            try {
                for (var styleUrls_1 = (0, tslib_1.__values)(styleUrls), styleUrls_1_1 = styleUrls_1.next(); !styleUrls_1_1.done; styleUrls_1_1 = styleUrls_1.next()) {
                    var styleUrl = styleUrls_1_1.value;
                    try {
                        var resourceUrl = this.resourceLoader.resolve(styleUrl.url, containingFile);
                        var resourceStr = this.resourceLoader.load(resourceUrl);
                        styles.push(resourceStr);
                        if (this.depTracker !== null) {
                            this.depTracker.addResourceDependency(node.getSourceFile(), (0, file_system_1.absoluteFrom)(resourceUrl));
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
                    diagnostics.push((0, diagnostics_1.makeDiagnostic)(diagnostics_1.ErrorCode.COMPONENT_INVALID_SHADOW_DOM_SELECTOR, component.get('selector'), selectorError));
                }
            }
            // If inline styles were preprocessed use those
            var inlineStyles = null;
            if (this.preanalyzeStylesCache.has(node)) {
                inlineStyles = this.preanalyzeStylesCache.get(node);
                this.preanalyzeStylesCache.delete(node);
                if (inlineStyles !== null) {
                    styles.push.apply(styles, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(inlineStyles), false));
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
                    var litStyles = (0, directive_1.parseFieldArrayValue)(component, 'styles', this.evaluator);
                    if (litStyles !== null) {
                        inlineStyles = (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(litStyles), false);
                        styles.push.apply(styles, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(litStyles), false));
                    }
                }
            }
            if (template.styles.length > 0) {
                styles.push.apply(styles, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(template.styles), false));
            }
            var output = {
                analysis: {
                    baseClass: (0, util_1.readBaseClass)(node, this.reflector, this.evaluator),
                    inputs: inputs,
                    outputs: outputs,
                    meta: (0, tslib_1.__assign)((0, tslib_1.__assign)({}, metadata), { template: {
                            nodes: template.nodes,
                            ngContentSelectors: template.ngContentSelectors,
                        }, encapsulation: encapsulation, interpolation: (_c = template.interpolationConfig) !== null && _c !== void 0 ? _c : compiler_1.DEFAULT_INTERPOLATION_CONFIG, styles: styles, 
                        // These will be replaced during the compilation step, after all `NgModule`s have been
                        // analyzed and the full compilation scope for the component can be realized.
                        animations: animations, viewProviders: wrappedViewProviders, i18nUseExternalIds: this.i18nUseExternalIds, relativeContextFilePath: relativeContextFilePath }),
                    typeCheckMeta: (0, metadata_1.extractDirectiveTypeCheckMeta)(node, inputs, this.reflector),
                    classMetadata: (0, metadata_2.extractClassMetadata)(node, this.reflector, this.isCore, this.annotateForClosureCompiler, function (dec) { return _this._transformDecoratorToInlineResources(dec, component, styles, template); }),
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
            var typeParameters = (0, semantic_graph_1.extractSemanticTypeParameters)(node);
            return new ComponentSymbol(node, analysis.meta.selector, analysis.inputs, analysis.outputs, analysis.meta.exportAs, analysis.typeCheckMeta, typeParameters);
        };
        ComponentDecoratorHandler.prototype.register = function (node, analysis) {
            // Register this component's information with the `MetadataRegistry`. This ensures that
            // the information about the component is available during the compile() phase.
            var ref = new imports_1.Reference(node);
            this.metaRegistry.registerDirectiveMetadata((0, tslib_1.__assign)((0, tslib_1.__assign)({ type: metadata_1.MetaType.Directive, ref: ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.meta.queries.map(function (query) { return query.propertyName; }), isComponent: true, baseClass: analysis.baseClass }, analysis.typeCheckMeta), { isPoisoned: analysis.isPoisoned, isStructural: false }));
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
                    for (var _b = (0, tslib_1.__values)(scope.compilation.directives), _c = _b.next(); !_c.done; _c = _b.next()) {
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
            return extendedTemplateChecker.getDiagnosticsForComponent(component);
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
                    for (var _k = (0, tslib_1.__values)(scope.compilation.directives), _l = _k.next(); !_l.done; _l = _k.next()) {
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
                    for (var _m = (0, tslib_1.__values)(scope.compilation.pipes), _o = _m.next(); !_o.done; _o = _m.next()) {
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
                    for (var _p = (0, tslib_1.__values)(bound.getUsedPipes()), _q = _p.next(); !_q.done; _q = _p.next()) {
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
                    for (var usedDirectives_1 = (0, tslib_1.__values)(usedDirectives), usedDirectives_1_1 = usedDirectives_1.next(); !usedDirectives_1_1.done; usedDirectives_1_1 = usedDirectives_1.next()) {
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
                    for (var usedPipes_1 = (0, tslib_1.__values)(usedPipes), usedPipes_1_1 = usedPipes_1.next(); !usedPipes_1_1.done; usedPipes_1_1 = usedPipes_1.next()) {
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
                        for (var usedDirectives_2 = (0, tslib_1.__values)(usedDirectives), usedDirectives_2_1 = usedDirectives_2.next(); !usedDirectives_2_1.done; usedDirectives_2_1 = usedDirectives_2.next()) {
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
                        for (var usedPipes_2 = (0, tslib_1.__values)(usedPipes), usedPipes_2_1 = usedPipes_2.next(); !usedPipes_2_1.done; usedPipes_2_1 = usedPipes_2.next()) {
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
                    var wrapDirectivesAndPipesInClosure = usedDirectives.some(function (dir) { return (0, util_1.isExpressionForwardReference)(dir.type, node.name, context); }) ||
                        usedPipes.some(function (pipe) { return (0, util_1.isExpressionForwardReference)(pipe.expression, node.name, context); });
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
                            for (var cyclesFromDirectives_1 = (0, tslib_1.__values)(cyclesFromDirectives), cyclesFromDirectives_1_1 = cyclesFromDirectives_1.next(); !cyclesFromDirectives_1_1.done; cyclesFromDirectives_1_1 = cyclesFromDirectives_1.next()) {
                                var _t = (0, tslib_1.__read)(cyclesFromDirectives_1_1.value, 2), dir = _t[0], cycle = _t[1];
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
                            for (var cyclesFromPipes_1 = (0, tslib_1.__values)(cyclesFromPipes), cyclesFromPipes_1_1 = cyclesFromPipes_1.next(); !cyclesFromPipes_1_1.done; cyclesFromPipes_1_1 = cyclesFromPipes_1.next()) {
                                var _u = (0, tslib_1.__read)(cyclesFromPipes_1_1.value, 2), pipe = _u[0], cycle = _u[1];
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
                var providerDiagnostics = (0, diagnostics_2.getProviderDiagnostics)(analysis.providersRequiringFactory, analysis.meta.providers.node, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(providerDiagnostics), false));
            }
            if (analysis.viewProvidersRequiringFactory !== null &&
                analysis.meta.viewProviders instanceof compiler_1.WrappedNodeExpr) {
                var viewProviderDiagnostics = (0, diagnostics_2.getProviderDiagnostics)(analysis.viewProvidersRequiringFactory, analysis.meta.viewProviders.node, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(viewProviderDiagnostics), false));
            }
            var directiveDiagnostics = (0, diagnostics_2.getDirectiveDiagnostics)(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, 'Component');
            if (directiveDiagnostics !== null) {
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(directiveDiagnostics), false));
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
                    for (var _d = (0, tslib_1.__values)(analysis.styleUrls), _e = _d.next(); !_e.done; _e = _d.next()) {
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
                    for (var _f = (0, tslib_1.__values)(analysis.inlineStyles), _g = _f.next(); !_g.done; _g = _f.next()) {
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
                for (var _h = (0, tslib_1.__values)(analysis.template.styles), _j = _h.next(); !_j.done; _j = _h.next()) {
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
            var meta = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, analysis.meta), resolution);
            var fac = (0, factory_1.compileNgFactoryDefField)((0, util_1.toFactoryMetadata)(meta, compiler_1.FactoryTarget.Component));
            var def = (0, compiler_1.compileComponentFromMetadata)(meta, pool, (0, compiler_1.makeBindingParser)());
            var classMetadata = analysis.classMetadata !== null ?
                (0, compiler_1.compileClassMetadata)(analysis.classMetadata).toStmt() :
                null;
            return (0, util_1.compileResults)(fac, def, classMetadata, 'ɵcmp');
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
            var meta = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, analysis.meta), resolution);
            var fac = (0, factory_1.compileDeclareFactory)((0, util_1.toFactoryMetadata)(meta, compiler_1.FactoryTarget.Component));
            var def = (0, compiler_1.compileDeclareComponentFromMetadata)(meta, analysis.template, templateInfo);
            var classMetadata = analysis.classMetadata !== null ?
                (0, compiler_1.compileDeclareClassMetadata)(analysis.classMetadata).toStmt() :
                null;
            return (0, util_1.compileResults)(fac, def, classMetadata, 'ɵcmp');
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
                for (var _b = (0, tslib_1.__values)(metadata.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = (0, tslib_1.__read)(_c.value, 2), name_1 = _d[0], value = _d[1];
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
            return (0, tslib_1.__assign)((0, tslib_1.__assign)({}, dec), { args: [ts.createObjectLiteral(newMetadataFields)] });
        };
        ComponentDecoratorHandler.prototype._resolveLiteral = function (decorator) {
            if (this.literalCache.has(decorator)) {
                return this.literalCache.get(decorator);
            }
            if (decorator.args === null || decorator.args.length !== 1) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(decorator), "Incorrect number of arguments to @Component decorator");
            }
            var meta = (0, util_1.unwrapExpression)(decorator.args[0]);
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
                if (value instanceof partial_evaluator_1.EnumValue && (0, util_1.isAngularCoreReference)(value.enumRef, enumSymbolName)) {
                    resolved = value.resolved;
                }
                else {
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(expr, value, field + " must be a member of " + enumSymbolName + " enum from @angular/core");
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
                    for (var _c = (0, tslib_1.__values)(styleUrlsExpr.elements), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var styleUrlExpr = _d.value;
                        if (ts.isSpreadElement(styleUrlExpr)) {
                            styleUrls.push.apply(styleUrls, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(this._extractStyleUrlsFromExpression(styleUrlExpr.expression)), false));
                        }
                        else {
                            var styleUrl = this.evaluator.evaluate(styleUrlExpr);
                            if (typeof styleUrl !== 'string') {
                                throw (0, diagnostics_2.createValueHasWrongTypeError)(styleUrlExpr, styleUrl, 'styleUrl must be a string');
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
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(styleUrlsExpr, evaluatedStyleUrls, 'styleUrls must be an array of strings');
                }
                try {
                    for (var evaluatedStyleUrls_1 = (0, tslib_1.__values)(evaluatedStyleUrls), evaluatedStyleUrls_1_1 = evaluatedStyleUrls_1.next(); !evaluatedStyleUrls_1_1.done; evaluatedStyleUrls_1_1 = evaluatedStyleUrls_1.next()) {
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
                    for (var _c = (0, tslib_1.__values)(stringLiteralElements(styleUrlsExpr)), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var expression = _d.value;
                        try {
                            var resourceUrl = this.resourceLoader.resolve(expression.text, containingFile);
                            styles.add({ path: (0, file_system_1.absoluteFrom)(resourceUrl), expression: expression });
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
                    for (var _f = (0, tslib_1.__values)(stringLiteralElements(stylesExpr)), _g = _f.next(); !_g.done; _g = _f.next()) {
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
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(templateUrlExpr, templateUrl, 'templateUrl must be a string');
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
                        throw (0, diagnostics_2.createValueHasWrongTypeError)(template.expression, resolvedTemplate, 'template must be a string');
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
                return (0, tslib_1.__assign)((0, tslib_1.__assign)({}, this._parseTemplate(template, sourceStr, sourceParseRange, escapedString, sourceMapUrl)), { content: templateContent, sourceMapping: sourceMapping, declaration: template });
            }
            else {
                var templateContent = this.resourceLoader.load(template.resolvedTemplateUrl);
                if (this.depTracker !== null) {
                    this.depTracker.addResourceDependency(node.getSourceFile(), (0, file_system_1.absoluteFrom)(template.resolvedTemplateUrl));
                }
                return (0, tslib_1.__assign)((0, tslib_1.__assign)({}, this._parseTemplate(template, /* sourceStr */ templateContent, /* sourceParseRange */ null, 
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
            var parsedTemplate = (0, compiler_1.parseTemplate)(sourceStr, sourceMapUrl !== null && sourceMapUrl !== void 0 ? sourceMapUrl : '', {
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
            var diagNodes = (0, compiler_1.parseTemplate)(sourceStr, sourceMapUrl !== null && sourceMapUrl !== void 0 ? sourceMapUrl : '', {
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
            return (0, tslib_1.__assign)((0, tslib_1.__assign)({}, parsedTemplate), { diagNodes: diagNodes, file: new compiler_1.ParseSourceFile(sourceStr, sourceMapUrl !== null && sourceMapUrl !== void 0 ? sourceMapUrl : '') });
        };
        ComponentDecoratorHandler.prototype.parseTemplateDeclaration = function (decorator, component, containingFile) {
            var preserveWhitespaces = this.defaultPreserveWhitespaces;
            if (component.has('preserveWhitespaces')) {
                var expr = component.get('preserveWhitespaces');
                var value = this.evaluator.evaluate(expr);
                if (typeof value !== 'boolean') {
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(expr, value, 'preserveWhitespaces must be a boolean');
                }
                preserveWhitespaces = value;
            }
            var interpolationConfig = compiler_1.DEFAULT_INTERPOLATION_CONFIG;
            if (component.has('interpolation')) {
                var expr = component.get('interpolation');
                var value = this.evaluator.evaluate(expr);
                if (!Array.isArray(value) || value.length !== 2 ||
                    !value.every(function (element) { return typeof element === 'string'; })) {
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(expr, value, 'interpolation must be an array with 2 elements of string type');
                }
                interpolationConfig = compiler_1.InterpolationConfig.fromArray(value);
            }
            if (component.has('templateUrl')) {
                var templateUrlExpr = component.get('templateUrl');
                var templateUrl = this.evaluator.evaluate(templateUrlExpr);
                if (typeof templateUrl !== 'string') {
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(templateUrlExpr, templateUrl, 'templateUrl must be a string');
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
        return (0, diagnostics_1.makeRelatedInformation)(ref.node, message + path);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBdWpCO0lBQ3ZqQixtREFBNkQ7SUFDN0QsK0JBQWlDO0lBR2pDLDJFQUEwRztJQUMxRywyRUFBeUQ7SUFDekQsbUVBQXdGO0lBRXhGLDZGQUEySztJQUUzSyxxRUFBK087SUFDL08sdUZBQW1GO0lBQ25GLDZEQUFtRDtJQUNuRCx5RUFBb0g7SUFFcEgsdUVBQThJO0lBTzlJLDJGQUE0RztJQUM1Ryx1RkFBNEY7SUFDNUYsbUZBQTBFO0lBQzFFLHFGQUFnRDtJQUNoRCx1RkFBMkM7SUFDM0MsNkVBQXlPO0lBRXpPLElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0lBQ2hELElBQU0sV0FBVyxHQUFVLEVBQUUsQ0FBQztJQStFOUI7O09BRUc7SUFDSDtRQUFxQyxnREFBZTtRQUFwRDtZQUFBLHFFQXNFQztZQXJFQyxvQkFBYyxHQUF3QixFQUFFLENBQUM7WUFDekMsZUFBUyxHQUF3QixFQUFFLENBQUM7WUFDcEMsc0JBQWdCLEdBQUcsS0FBSyxDQUFDOztRQW1FM0IsQ0FBQztRQWpFVSx3Q0FBYyxHQUF2QixVQUF3QixjQUE4QixFQUFFLGlCQUFzQztZQUU1RixJQUFJLENBQUMsQ0FBQyxjQUFjLFlBQVksZUFBZSxDQUFDLEVBQUU7Z0JBQ2hELE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxzRkFBc0Y7WUFDdEYsOEZBQThGO1lBQzlGLFlBQVk7WUFDWixJQUFNLGtCQUFrQixHQUFHLFVBQUMsT0FBMEIsRUFBRSxRQUEyQjtnQkFDL0UsT0FBQSxJQUFBLGlDQUFnQixFQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMs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QUNULFNBQU8sSUFBSSxVQUFLLElBQUksc0VBQW1FLENBQUM7UUFDNUYsT0FBTyxJQUFBLG9DQUFzQixFQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFHRDs7O09BR0c7SUFDSCxTQUFTLG1DQUFtQyxDQUFDLFFBQWdCO1FBQzNELGlHQUFpRztRQUNqRyxrR0FBa0c7UUFDbEcsNkNBQTZDO1FBQzdDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ2hGLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUU7WUFDOUIsT0FBTyxxRkFBcUYsQ0FBQztTQUM5RjtRQUVELElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMxQixPQUFPLDJFQUEyRSxDQUFDO1NBQ3BGO1FBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDM0IsT0FBTyxzRkFBc0YsQ0FBQztTQUMvRjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbXBpbGVDbGFzc01ldGFkYXRhLCBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBjb21waWxlRGVjbGFyZUNsYXNzTWV0YWRhdGEsIGNvbXBpbGVEZWNsYXJlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBDb25zdGFudFBvb2wsIENzc1NlbGVjdG9yLCBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSwgRGVjbGFyZUNvbXBvbmVudFRlbXBsYXRlSW5mbywgREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRywgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEZhY3RvcnlUYXJnZXQsIEludGVycG9sYXRpb25Db25maWcsIExleGVyUmFuZ2UsIG1ha2VCaW5kaW5nUGFyc2VyLCBQYXJzZWRUZW1wbGF0ZSwgUGFyc2VTb3VyY2VGaWxlLCBwYXJzZVRlbXBsYXRlLCBSM0NsYXNzTWV0YWRhdGEsIFIzQ29tcG9uZW50TWV0YWRhdGEsIFIzVGFyZ2V0QmluZGVyLCBSM1VzZWREaXJlY3RpdmVNZXRhZGF0YSwgU2VsZWN0b3JNYXRjaGVyLCBTdGF0ZW1lbnQsIFRtcGxBc3ROb2RlLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7Vmlld0VuY2Fwc3VsYXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jb3JlJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0N5Y2xlLCBDeWNsZUFuYWx5emVyLCBDeWNsZUhhbmRsaW5nU3RyYXRlZ3l9IGZyb20gJy4uLy4uL2N5Y2xlcyc7XG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3IsIG1ha2VEaWFnbm9zdGljLCBtYWtlUmVsYXRlZEluZm9ybWF0aW9ufSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgcmVsYXRpdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7SW1wb3J0ZWRGaWxlLCBNb2R1bGVSZXNvbHZlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGVwZW5kZW5jeVRyYWNrZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge2V4dHJhY3RTZW1hbnRpY1R5cGVQYXJhbWV0ZXJzLCBpc0FycmF5RXF1YWwsIGlzUmVmZXJlbmNlRXF1YWwsIFNlbWFudGljRGVwR3JhcGhVcGRhdGVyLCBTZW1hbnRpY1JlZmVyZW5jZSwgU2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7SW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7Q2xhc3NQcm9wZXJ0eU1hcHBpbmcsIENvbXBvbmVudFJlc291cmNlcywgRGlyZWN0aXZlTWV0YSwgRGlyZWN0aXZlVHlwZUNoZWNrTWV0YSwgZXh0cmFjdERpcmVjdGl2ZVR5cGVDaGVja01ldGEsIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgTWV0YVR5cGUsIFJlc291cmNlLCBSZXNvdXJjZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0VudW1WYWx1ZSwgUGFydGlhbEV2YWx1YXRvciwgUmVzb2x2ZWRWYWx1ZX0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtQZXJmRXZlbnQsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uTm9kZSwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJGbGFncywgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge0V4dGVuZGVkVGVtcGxhdGVDaGVja2VyfSBmcm9tICcuLi8uLi90eXBlY2hlY2svZXh0ZW5kZWQvYXBpJztcbmltcG9ydCB7U3Vic2V0T2ZLZXlzfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7WGkxOG5Db250ZXh0fSBmcm9tICcuLi8uLi94aTE4bic7XG5cbmltcG9ydCB7UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Y3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvciwgZ2V0RGlyZWN0aXZlRGlhZ25vc3RpY3MsIGdldFByb3ZpZGVyRGlhZ25vc3RpY3N9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEaXJlY3RpdmVTeW1ib2wsIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YSwgcGFyc2VGaWVsZEFycmF5VmFsdWV9IGZyb20gJy4vZGlyZWN0aXZlJztcbmltcG9ydCB7Y29tcGlsZURlY2xhcmVGYWN0b3J5LCBjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2V4dHJhY3RDbGFzc01ldGFkYXRhfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7TmdNb2R1bGVTeW1ib2x9IGZyb20gJy4vbmdfbW9kdWxlJztcbmltcG9ydCB7Y29tcGlsZVJlc3VsdHMsIGZpbmRBbmd1bGFyRGVjb3JhdG9yLCBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlLCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlLCByZWFkQmFzZUNsYXNzLCByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgdG9GYWN0b3J5TWV0YWRhdGEsIHVud3JhcEV4cHJlc3Npb24sIHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnN9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX01BUCA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuY29uc3QgRU1QVFlfQVJSQVk6IGFueVtdID0gW107XG5cbi8qKlxuICogVGhlc2UgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCBhcmUgdXBkYXRlZCBpbiB0aGUgYHJlc29sdmVgIHBoYXNlLlxuICpcbiAqIFRoZSBga2V5b2YgUjNDb21wb25lbnRNZXRhZGF0YSAmYCBjb25kaXRpb24gZW5zdXJlcyB0aGF0IG9ubHkgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCBjYW5cbiAqIGJlIGluY2x1ZGVkIGhlcmUuXG4gKi9cbmV4cG9ydCB0eXBlIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHMgPVxuICAgIFN1YnNldE9mS2V5czxSM0NvbXBvbmVudE1ldGFkYXRhLCAnZGlyZWN0aXZlcyd8J3BpcGVzJ3wnZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUnPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRBbmFseXNpc0RhdGEge1xuICAvKipcbiAgICogYG1ldGFgIGluY2x1ZGVzIHRob3NlIGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgd2hpY2ggYXJlIGNhbGN1bGF0ZWQgYXQgYGFuYWx5emVgIHRpbWVcbiAgICogKG5vdCBkdXJpbmcgcmVzb2x2ZSkuXG4gICAqL1xuICBtZXRhOiBPbWl0PFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuICBiYXNlQ2xhc3M6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPnwnZHluYW1pYyd8bnVsbDtcbiAgdHlwZUNoZWNrTWV0YTogRGlyZWN0aXZlVHlwZUNoZWNrTWV0YTtcbiAgdGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZTtcbiAgY2xhc3NNZXRhZGF0YTogUjNDbGFzc01ldGFkYXRhfG51bGw7XG5cbiAgaW5wdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZztcbiAgb3V0cHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmc7XG5cbiAgLyoqXG4gICAqIFByb3ZpZGVycyBleHRyYWN0ZWQgZnJvbSB0aGUgYHByb3ZpZGVyc2AgZmllbGQgb2YgdGhlIGNvbXBvbmVudCBhbm5vdGF0aW9uIHdoaWNoIHdpbGwgcmVxdWlyZVxuICAgKiBhbiBBbmd1bGFyIGZhY3RvcnkgZGVmaW5pdGlvbiBhdCBydW50aW1lLlxuICAgKi9cbiAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcblxuICAvKipcbiAgICogUHJvdmlkZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBgdmlld1Byb3ZpZGVyc2AgZmllbGQgb2YgdGhlIGNvbXBvbmVudCBhbm5vdGF0aW9uIHdoaWNoIHdpbGxcbiAgICogcmVxdWlyZSBhbiBBbmd1bGFyIGZhY3RvcnkgZGVmaW5pdGlvbiBhdCBydW50aW1lLlxuICAgKi9cbiAgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGw7XG5cbiAgcmVzb3VyY2VzOiBDb21wb25lbnRSZXNvdXJjZXM7XG5cbiAgLyoqXG4gICAqIGBzdHlsZVVybHNgIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNvcmF0b3IsIGlmIHByZXNlbnQuXG4gICAqL1xuICBzdHlsZVVybHM6IFN0eWxlVXJsTWV0YVtdfG51bGw7XG5cbiAgLyoqXG4gICAqIElubGluZSBzdHlsZXNoZWV0cyBleHRyYWN0ZWQgZnJvbSB0aGUgZGVjb3JhdG9yLCBpZiBwcmVzZW50LlxuICAgKi9cbiAgaW5saW5lU3R5bGVzOiBzdHJpbmdbXXxudWxsO1xuXG4gIGlzUG9pc29uZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIENvbXBvbmVudFJlc29sdXRpb25EYXRhID0gUGljazxSM0NvbXBvbmVudE1ldGFkYXRhLCBDb21wb25lbnRNZXRhZGF0YVJlc29sdmVkRmllbGRzPjtcblxuLyoqXG4gKiBUaGUgbGl0ZXJhbCBzdHlsZSB1cmwgZXh0cmFjdGVkIGZyb20gdGhlIGRlY29yYXRvciwgYWxvbmcgd2l0aCBtZXRhZGF0YSBmb3IgZGlhZ25vc3RpY3MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVVcmxNZXRhIHtcbiAgdXJsOiBzdHJpbmc7XG4gIG5vZGVGb3JFcnJvcjogdHMuTm9kZTtcbiAgc291cmNlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbVRlbXBsYXRlfFxuICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3I7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIG9yaWdpbiBvZiBhIHJlc291cmNlIGluIHRoZSBhcHBsaWNhdGlvbiBjb2RlLiBUaGlzIGlzIHVzZWQgZm9yIGNyZWF0aW5nXG4gKiBkaWFnbm9zdGljcywgc28gd2UgY2FuIHBvaW50IHRvIHRoZSByb290IGNhdXNlIG9mIGFuIGVycm9yIGluIHRoZSBhcHBsaWNhdGlvbiBjb2RlLlxuICpcbiAqIEEgdGVtcGxhdGUgcmVzb3VyY2UgY29tZXMgZnJvbSB0aGUgYHRlbXBsYXRlVXJsYCBwcm9wZXJ0eSBvbiB0aGUgY29tcG9uZW50IGRlY29yYXRvci5cbiAqXG4gKiBTdHlsZXNoZWV0cyByZXNvdXJjZXMgY2FuIGNvbWUgZnJvbSBlaXRoZXIgdGhlIGBzdHlsZVVybHNgIHByb3BlcnR5IG9uIHRoZSBjb21wb25lbnQgZGVjb3JhdG9yLFxuICogb3IgZnJvbSBpbmxpbmUgYHN0eWxlYCB0YWdzIGFuZCBzdHlsZSBsaW5rcyBvbiB0aGUgZXh0ZXJuYWwgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzIHtcbiAgVGVtcGxhdGUsXG4gIFN0eWxlc2hlZXRGcm9tVGVtcGxhdGUsXG4gIFN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yLFxufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBjb21wb25lbnQuXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTeW1ib2wgZXh0ZW5kcyBEaXJlY3RpdmVTeW1ib2wge1xuICB1c2VkRGlyZWN0aXZlczogU2VtYW50aWNSZWZlcmVuY2VbXSA9IFtdO1xuICB1c2VkUGlwZXM6IFNlbWFudGljUmVmZXJlbmNlW10gPSBbXTtcbiAgaXNSZW1vdGVseVNjb3BlZCA9IGZhbHNlO1xuXG4gIG92ZXJyaWRlIGlzRW1pdEFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCwgcHVibGljQXBpQWZmZWN0ZWQ6IFNldDxTZW1hbnRpY1N5bWJvbD4pOlxuICAgICAgYm9vbGVhbiB7XG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBDb21wb25lbnRTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYW4gZXF1YWxpdHkgZnVuY3Rpb24gdGhhdCBjb25zaWRlcnMgc3ltYm9scyBlcXVhbCBpZiB0aGV5IHJlcHJlc2VudCB0aGUgc2FtZVxuICAgIC8vIGRlY2xhcmF0aW9uLCBidXQgb25seSBpZiB0aGUgc3ltYm9sIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIGRvZXMgbm90IGhhdmUgaXRzIHB1YmxpYyBBUElcbiAgICAvLyBhZmZlY3RlZC5cbiAgICBjb25zdCBpc1N5bWJvbFVuYWZmZWN0ZWQgPSAoY3VycmVudDogU2VtYW50aWNSZWZlcmVuY2UsIHByZXZpb3VzOiBTZW1hbnRpY1JlZmVyZW5jZSkgPT5cbiAgICAgICAgaXNSZWZlcmVuY2VFcXVhbChjdXJyZW50LCBwcmV2aW91cykgJiYgIXB1YmxpY0FwaUFmZmVjdGVkLmhhcyhjdXJyZW50LnN5bWJvbCk7XG5cbiAgICAvLyBUaGUgZW1pdCBvZiBhIGNvbXBvbmVudCBpcyBhZmZlY3RlZCBpZiBlaXRoZXIgb2YgdGhlIGZvbGxvd2luZyBpcyB0cnVlOlxuICAgIC8vICAxLiBUaGUgY29tcG9uZW50IHVzZWQgdG8gYmUgcmVtb3RlbHkgc2NvcGVkIGJ1dCBubyBsb25nZXIgaXMsIG9yIHZpY2UgdmVyc2EuXG4gICAgLy8gIDIuIFRoZSBsaXN0IG9mIHVzZWQgZGlyZWN0aXZlcyBoYXMgY2hhbmdlZCBvciBhbnkgb2YgdGhvc2UgZGlyZWN0aXZlcyBoYXZlIGhhZCB0aGVpciBwdWJsaWNcbiAgICAvLyAgICAgQVBJIGNoYW5nZWQuIElmIHRoZSB1c2VkIGRpcmVjdGl2ZXMgaGF2ZSBiZWVuIHJlb3JkZXJlZCBidXQgbm90IG90aGVyd2lzZSBhZmZlY3RlZCB0aGVuXG4gICAgLy8gICAgIHRoZSBjb21wb25lbnQgbXVzdCBzdGlsbCBiZSByZS1lbWl0dGVkLCBhcyB0aGlzIG1heSBhZmZlY3QgZGlyZWN0aXZlIGluc3RhbnRpYXRpb24gb3JkZXIuXG4gICAgLy8gIDMuIFRoZSBsaXN0IG9mIHVzZWQgcGlwZXMgaGFzIGNoYW5nZWQsIG9yIGFueSBvZiB0aG9zZSBwaXBlcyBoYXZlIGhhZCB0aGVpciBwdWJsaWMgQVBJXG4gICAgLy8gICAgIGNoYW5nZWQuXG4gICAgcmV0dXJuIHRoaXMuaXNSZW1vdGVseVNjb3BlZCAhPT0gcHJldmlvdXNTeW1ib2wuaXNSZW1vdGVseVNjb3BlZCB8fFxuICAgICAgICAhaXNBcnJheUVxdWFsKHRoaXMudXNlZERpcmVjdGl2ZXMsIHByZXZpb3VzU3ltYm9sLnVzZWREaXJlY3RpdmVzLCBpc1N5bWJvbFVuYWZmZWN0ZWQpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy51c2VkUGlwZXMsIHByZXZpb3VzU3ltYm9sLnVzZWRQaXBlcywgaXNTeW1ib2xVbmFmZmVjdGVkKTtcbiAgfVxuXG4gIG92ZXJyaWRlIGlzVHlwZUNoZWNrQmxvY2tBZmZlY3RlZChcbiAgICAgIHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCwgdHlwZUNoZWNrQXBpQWZmZWN0ZWQ6IFNldDxTZW1hbnRpY1N5bWJvbD4pOiBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIENvbXBvbmVudFN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIFRvIHZlcmlmeSB0aGF0IGEgdXNlZCBkaXJlY3RpdmUgaXMgbm90IGFmZmVjdGVkIHdlIG5lZWQgdG8gdmVyaWZ5IHRoYXQgaXRzIGZ1bGwgaW5oZXJpdGFuY2VcbiAgICAvLyBjaGFpbiBpcyBub3QgcHJlc2VudCBpbiBgdHlwZUNoZWNrQXBpQWZmZWN0ZWRgLlxuICAgIGNvbnN0IGlzSW5oZXJpdGFuY2VDaGFpbkFmZmVjdGVkID0gKHN5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuID0+IHtcbiAgICAgIGxldCBjdXJyZW50U3ltYm9sOiBTZW1hbnRpY1N5bWJvbHxudWxsID0gc3ltYm9sO1xuICAgICAgd2hpbGUgKGN1cnJlbnRTeW1ib2wgaW5zdGFuY2VvZiBEaXJlY3RpdmVTeW1ib2wpIHtcbiAgICAgICAgaWYgKHR5cGVDaGVja0FwaUFmZmVjdGVkLmhhcyhjdXJyZW50U3ltYm9sKSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGN1cnJlbnRTeW1ib2wgPSBjdXJyZW50U3ltYm9sLmJhc2VDbGFzcztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgYW4gZXF1YWxpdHkgZnVuY3Rpb24gdGhhdCBjb25zaWRlcnMgZGlyZWN0aXZlcyBlcXVhbCBpZiB0aGV5IHJlcHJlc2VudCB0aGUgc2FtZVxuICAgIC8vIGRlY2xhcmF0aW9uIGFuZCBpZiB0aGUgc3ltYm9sIGFuZCBhbGwgc3ltYm9scyBpdCBpbmhlcml0cyBmcm9tIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uXG4gICAgLy8gZG8gbm90IGhhdmUgdGhlaXIgdHlwZS1jaGVjayBBUEkgYWZmZWN0ZWQuXG4gICAgY29uc3QgaXNEaXJlY3RpdmVVbmFmZmVjdGVkID0gKGN1cnJlbnQ6IFNlbWFudGljUmVmZXJlbmNlLCBwcmV2aW91czogU2VtYW50aWNSZWZlcmVuY2UpID0+XG4gICAgICAgIGlzUmVmZXJlbmNlRXF1YWwoY3VycmVudCwgcHJldmlvdXMpICYmICFpc0luaGVyaXRhbmNlQ2hhaW5BZmZlY3RlZChjdXJyZW50LnN5bWJvbCk7XG5cbiAgICAvLyBDcmVhdGUgYW4gZXF1YWxpdHkgZnVuY3Rpb24gdGhhdCBjb25zaWRlcnMgcGlwZXMgZXF1YWwgaWYgdGhleSByZXByZXNlbnQgdGhlIHNhbWVcbiAgICAvLyBkZWNsYXJhdGlvbiBhbmQgaWYgdGhlIHN5bWJvbCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiBkb2VzIG5vdCBoYXZlIGl0cyB0eXBlLWNoZWNrXG4gICAgLy8gQVBJIGFmZmVjdGVkLlxuICAgIGNvbnN0IGlzUGlwZVVuYWZmZWN0ZWQgPSAoY3VycmVudDogU2VtYW50aWNSZWZlcmVuY2UsIHByZXZpb3VzOiBTZW1hbnRpY1JlZmVyZW5jZSkgPT5cbiAgICAgICAgaXNSZWZlcmVuY2VFcXVhbChjdXJyZW50LCBwcmV2aW91cykgJiYgIXR5cGVDaGVja0FwaUFmZmVjdGVkLmhhcyhjdXJyZW50LnN5bWJvbCk7XG5cbiAgICAvLyBUaGUgZW1pdCBvZiBhIHR5cGUtY2hlY2sgYmxvY2sgb2YgYSBjb21wb25lbnQgaXMgYWZmZWN0ZWQgaWYgZWl0aGVyIG9mIHRoZSBmb2xsb3dpbmcgaXMgdHJ1ZTpcbiAgICAvLyAgMS4gVGhlIGxpc3Qgb2YgdXNlZCBkaXJlY3RpdmVzIGhhcyBjaGFuZ2VkIG9yIGFueSBvZiB0aG9zZSBkaXJlY3RpdmVzIGhhdmUgaGFkIHRoZWlyXG4gICAgLy8gICAgIHR5cGUtY2hlY2sgQVBJIGNoYW5nZWQuXG4gICAgLy8gIDIuIFRoZSBsaXN0IG9mIHVzZWQgcGlwZXMgaGFzIGNoYW5nZWQsIG9yIGFueSBvZiB0aG9zZSBwaXBlcyBoYXZlIGhhZCB0aGVpciB0eXBlLWNoZWNrIEFQSVxuICAgIC8vICAgICBjaGFuZ2VkLlxuICAgIHJldHVybiAhaXNBcnJheUVxdWFsKFxuICAgICAgICAgICAgICAgdGhpcy51c2VkRGlyZWN0aXZlcywgcHJldmlvdXNTeW1ib2wudXNlZERpcmVjdGl2ZXMsIGlzRGlyZWN0aXZlVW5hZmZlY3RlZCkgfHxcbiAgICAgICAgIWlzQXJyYXlFcXVhbCh0aGlzLnVzZWRQaXBlcywgcHJldmlvdXNTeW1ib2wudXNlZFBpcGVzLCBpc1BpcGVVbmFmZmVjdGVkKTtcbiAgfVxufVxuXG4vKipcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCB3aGljaCBoYW5kbGVzIHRoZSBgQENvbXBvbmVudGAgYW5ub3RhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudERlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8RGVjb3JhdG9yLCBDb21wb25lbnRBbmFseXNpc0RhdGEsIENvbXBvbmVudFN5bWJvbCwgQ29tcG9uZW50UmVzb2x1dGlvbkRhdGE+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBtZXRhUmVnaXN0cnk6IE1ldGFkYXRhUmVnaXN0cnksIHByaXZhdGUgbWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXIsXG4gICAgICBwcml2YXRlIHNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlciwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHR5cGVDaGVja1Njb3BlUmVnaXN0cnk6IFR5cGVDaGVja1Njb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJlc291cmNlUmVnaXN0cnk6IFJlc291cmNlUmVnaXN0cnksIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSByZXNvdXJjZUxvYWRlcjogUmVzb3VyY2VMb2FkZXIsIHByaXZhdGUgcm9vdERpcnM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICAgIHByaXZhdGUgZGVmYXVsdFByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4sIHByaXZhdGUgaTE4blVzZUV4dGVybmFsSWRzOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuLCBwcml2YXRlIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzOiBib29sZWFufHVuZGVmaW5lZCxcbiAgICAgIHByaXZhdGUgbW9kdWxlUmVzb2x2ZXI6IE1vZHVsZVJlc29sdmVyLCBwcml2YXRlIGN5Y2xlQW5hbHl6ZXI6IEN5Y2xlQW5hbHl6ZXIsXG4gICAgICBwcml2YXRlIGN5Y2xlSGFuZGxpbmdTdHJhdGVneTogQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LCBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsXG4gICAgICBwcml2YXRlIGRlcFRyYWNrZXI6IERlcGVuZGVuY3lUcmFja2VyfG51bGwsXG4gICAgICBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyOiBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcnxudWxsLFxuICAgICAgcHJpdmF0ZSBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbiwgcHJpdmF0ZSBwZXJmOiBQZXJmUmVjb3JkZXIpIHt9XG5cbiAgcHJpdmF0ZSBsaXRlcmFsQ2FjaGUgPSBuZXcgTWFwPERlY29yYXRvciwgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24+KCk7XG4gIHByaXZhdGUgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5ID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuXG4gIC8qKlxuICAgKiBEdXJpbmcgdGhlIGFzeW5jaHJvbm91cyBwcmVhbmFseXplIHBoYXNlLCBpdCdzIG5lY2Vzc2FyeSB0byBwYXJzZSB0aGUgdGVtcGxhdGUgdG8gZXh0cmFjdFxuICAgKiBhbnkgcG90ZW50aWFsIDxsaW5rPiB0YWdzIHdoaWNoIG1pZ2h0IG5lZWQgdG8gYmUgbG9hZGVkLiBUaGlzIGNhY2hlIGVuc3VyZXMgdGhhdCB3b3JrIGlzIG5vdFxuICAgKiB0aHJvd24gYXdheSwgYW5kIHRoZSBwYXJzZWQgdGVtcGxhdGUgaXMgcmV1c2VkIGR1cmluZyB0aGUgYW5hbHl6ZSBwaGFzZS5cbiAgICovXG4gIHByaXZhdGUgcHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlPigpO1xuICBwcml2YXRlIHByZWFuYWx5emVTdHlsZXNDYWNoZSA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCBzdHJpbmdbXXxudWxsPigpO1xuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuICByZWFkb25seSBuYW1lID0gQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdDb21wb25lbnQnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgZGVjb3JhdG9yLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBwcmVhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICAvLyBJbiBwcmVhbmFseXplLCByZXNvdXJjZSBVUkxzIGFzc29jaWF0ZWQgd2l0aCB0aGUgY29tcG9uZW50IGFyZSBhc3luY2hyb25vdXNseSBwcmVsb2FkZWQgdmlhXG4gICAgLy8gdGhlIHJlc291cmNlTG9hZGVyLiBUaGlzIGlzIHRoZSBvbmx5IHRpbWUgYXN5bmMgb3BlcmF0aW9ucyBhcmUgYWxsb3dlZCBmb3IgYSBjb21wb25lbnQuXG4gICAgLy8gVGhlc2UgcmVzb3VyY2VzIGFyZTpcbiAgICAvL1xuICAgIC8vIC0gdGhlIHRlbXBsYXRlVXJsLCBpZiB0aGVyZSBpcyBvbmVcbiAgICAvLyAtIGFueSBzdHlsZVVybHMgaWYgcHJlc2VudFxuICAgIC8vIC0gYW55IHN0eWxlc2hlZXRzIHJlZmVyZW5jZWQgZnJvbSA8bGluaz4gdGFncyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmXG4gICAgLy9cbiAgICAvLyBBcyBhIHJlc3VsdCBvZiB0aGUgbGFzdCBvbmUsIHRoZSB0ZW1wbGF0ZSBtdXN0IGJlIHBhcnNlZCBhcyBwYXJ0IG9mIHByZWFuYWx5c2lzIHRvIGV4dHJhY3RcbiAgICAvLyA8bGluaz4gdGFncywgd2hpY2ggbWF5IGludm9sdmUgd2FpdGluZyBmb3IgdGhlIHRlbXBsYXRlVXJsIHRvIGJlIHJlc29sdmVkIGZpcnN0LlxuXG4gICAgLy8gSWYgcHJlbG9hZGluZyBpc24ndCBwb3NzaWJsZSwgdGhlbiBza2lwIHRoaXMgc3RlcC5cbiAgICBpZiAoIXRoaXMucmVzb3VyY2VMb2FkZXIuY2FuUHJlbG9hZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0gdGhpcy5fcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yKTtcbiAgICBjb25zdCBjb21wb25lbnQgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuXG4gICAgY29uc3QgcmVzb2x2ZVN0eWxlVXJsID0gKHN0eWxlVXJsOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkKHJlc291cmNlVXJsLCB7dHlwZTogJ3N0eWxlJywgY29udGFpbmluZ0ZpbGV9KTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBEb24ndCB3b3JyeSBhYm91dCBmYWlsdXJlcyB0byBwcmVsb2FkLiBXZSBjYW4gaGFuZGxlIHRoaXMgcHJvYmxlbSBkdXJpbmcgYW5hbHlzaXMgYnlcbiAgICAgICAgLy8gcHJvZHVjaW5nIGEgZGlhZ25vc3RpYy5cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gQSBQcm9taXNlIHRoYXQgd2FpdHMgZm9yIHRoZSB0ZW1wbGF0ZSBhbmQgYWxsIDxsaW5rPmVkIHN0eWxlcyB3aXRoaW4gaXQgdG8gYmUgcHJlbG9hZGVkLlxuICAgIGNvbnN0IHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcyA9XG4gICAgICAgIHRoaXMuX3ByZWxvYWRBbmRQYXJzZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSlcbiAgICAgICAgICAgIC50aGVuKCh0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlfG51bGwpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCA9PiB7XG4gICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGVtcGxhdGUuc3R5bGVVcmxzLm1hcChzdHlsZVVybCA9PiByZXNvbHZlU3R5bGVVcmwoc3R5bGVVcmwpKSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICB9KTtcblxuICAgIC8vIEV4dHJhY3QgYWxsIHRoZSBzdHlsZVVybHMgaW4gdGhlIGRlY29yYXRvci5cbiAgICBjb25zdCBjb21wb25lbnRTdHlsZVVybHMgPSB0aGlzLl9leHRyYWN0Q29tcG9uZW50U3R5bGVVcmxzKGNvbXBvbmVudCk7XG5cbiAgICAvLyBFeHRyYWN0IGlubGluZSBzdHlsZXMsIHByb2Nlc3MsIGFuZCBjYWNoZSBmb3IgdXNlIGluIHN5bmNocm9ub3VzIGFuYWx5emUgcGhhc2VcbiAgICBsZXQgaW5saW5lU3R5bGVzO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdzdHlsZXMnKSkge1xuICAgICAgY29uc3QgbGl0U3R5bGVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoY29tcG9uZW50LCAnc3R5bGVzJywgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgaWYgKGxpdFN0eWxlcyA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLnByZWFuYWx5emVTdHlsZXNDYWNoZS5zZXQobm9kZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmxpbmVTdHlsZXMgPSBQcm9taXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuYWxsKGxpdFN0eWxlcy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGUgPT4gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVwcm9jZXNzSW5saW5lKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZSwge3R5cGU6ICdzdHlsZScsIGNvbnRhaW5pbmdGaWxlfSkpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oc3R5bGVzID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmVhbmFseXplU3R5bGVzQ2FjaGUuc2V0KG5vZGUsIHN0eWxlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wcmVhbmFseXplU3R5bGVzQ2FjaGUuc2V0KG5vZGUsIG51bGwpO1xuICAgIH1cblxuICAgIC8vIFdhaXQgZm9yIGJvdGggdGhlIHRlbXBsYXRlIGFuZCBhbGwgc3R5bGVVcmwgcmVzb3VyY2VzIHRvIHJlc29sdmUuXG4gICAgcmV0dXJuIFByb21pc2VcbiAgICAgICAgLmFsbChbXG4gICAgICAgICAgdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzLCBpbmxpbmVTdHlsZXMsXG4gICAgICAgICAgLi4uY29tcG9uZW50U3R5bGVVcmxzLm1hcChzdHlsZVVybCA9PiByZXNvbHZlU3R5bGVVcmwoc3R5bGVVcmwudXJsKSlcbiAgICAgICAgXSlcbiAgICAgICAgLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgfVxuXG4gIGFuYWx5emUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4sXG4gICAgICBmbGFnczogSGFuZGxlckZsYWdzID0gSGFuZGxlckZsYWdzLk5PTkUpOiBBbmFseXNpc091dHB1dDxDb21wb25lbnRBbmFseXNpc0RhdGE+IHtcbiAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuQW5hbHl6ZUNvbXBvbmVudCk7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5kZWxldGUoZGVjb3JhdG9yKTtcblxuICAgIGxldCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdfHVuZGVmaW5lZDtcbiAgICBsZXQgaXNQb2lzb25lZCA9IGZhbHNlO1xuICAgIC8vIEBDb21wb25lbnQgaW5oZXJpdHMgQERpcmVjdGl2ZSwgc28gYmVnaW4gYnkgZXh0cmFjdGluZyB0aGUgQERpcmVjdGl2ZSBtZXRhZGF0YSBhbmQgYnVpbGRpbmdcbiAgICAvLyBvbiBpdC5cbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPSBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmlzQ29yZSwgZmxhZ3MsXG4gICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIsXG4gICAgICAgIHRoaXMuZWxlbWVudFNjaGVtYVJlZ2lzdHJ5LmdldERlZmF1bHRDb21wb25lbnRFbGVtZW50TmFtZSgpKTtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGFgIHJldHVybnMgdW5kZWZpbmVkIHdoZW4gdGhlIEBEaXJlY3RpdmUgaGFzIGBqaXQ6IHRydWVgLiBJbiB0aGlzXG4gICAgICAvLyBjYXNlLCBjb21waWxhdGlvbiBvZiB0aGUgZGVjb3JhdG9yIGlzIHNraXBwZWQuIFJldHVybmluZyBhbiBlbXB0eSBvYmplY3Qgc2lnbmlmaWVzXG4gICAgICAvLyB0aGF0IG5vIGFuYWx5c2lzIHdhcyBwcm9kdWNlZC5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBOZXh0LCByZWFkIHRoZSBgQENvbXBvbmVudGAtc3BlY2lmaWMgZmllbGRzLlxuICAgIGNvbnN0IHtkZWNvcmF0b3I6IGNvbXBvbmVudCwgbWV0YWRhdGEsIGlucHV0cywgb3V0cHV0c30gPSBkaXJlY3RpdmVSZXN1bHQ7XG4gICAgY29uc3QgZW5jYXBzdWxhdGlvbjogbnVtYmVyID1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZUVudW1WYWx1ZShjb21wb25lbnQsICdlbmNhcHN1bGF0aW9uJywgJ1ZpZXdFbmNhcHN1bGF0aW9uJykgPz9cbiAgICAgICAgVmlld0VuY2Fwc3VsYXRpb24uRW11bGF0ZWQ7XG4gICAgY29uc3QgY2hhbmdlRGV0ZWN0aW9uOiBudW1iZXJ8bnVsbCA9XG4gICAgICAgIHRoaXMuX3Jlc29sdmVFbnVtVmFsdWUoY29tcG9uZW50LCAnY2hhbmdlRGV0ZWN0aW9uJywgJ0NoYW5nZURldGVjdGlvblN0cmF0ZWd5Jyk7XG5cbiAgICBsZXQgYW5pbWF0aW9uczogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcygnYW5pbWF0aW9ucycpKSB7XG4gICAgICBhbmltYXRpb25zID0gbmV3IFdyYXBwZWROb2RlRXhwcihjb21wb25lbnQuZ2V0KCdhbmltYXRpb25zJykhKTtcbiAgICB9XG5cbiAgICAvLyBHbyB0aHJvdWdoIHRoZSByb290IGRpcmVjdG9yaWVzIGZvciB0aGlzIHByb2plY3QsIGFuZCBzZWxlY3QgdGhlIG9uZSB3aXRoIHRoZSBzbWFsbGVzdFxuICAgIC8vIHJlbGF0aXZlIHBhdGggcmVwcmVzZW50YXRpb24uXG4gICAgY29uc3QgcmVsYXRpdmVDb250ZXh0RmlsZVBhdGggPSB0aGlzLnJvb3REaXJzLnJlZHVjZTxzdHJpbmd8dW5kZWZpbmVkPigocHJldmlvdXMsIHJvb3REaXIpID0+IHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHJlbGF0aXZlKGFic29sdXRlRnJvbShyb290RGlyKSwgYWJzb2x1dGVGcm9tKGNvbnRhaW5pbmdGaWxlKSk7XG4gICAgICBpZiAocHJldmlvdXMgPT09IHVuZGVmaW5lZCB8fCBjYW5kaWRhdGUubGVuZ3RoIDwgcHJldmlvdXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcHJldmlvdXM7XG4gICAgICB9XG4gICAgfSwgdW5kZWZpbmVkKSE7XG5cblxuICAgIC8vIE5vdGUgdGhhdCB3ZSBjb3VsZCB0ZWNobmljYWxseSBjb21iaW5lIHRoZSBgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnlgIGFuZFxuICAgIC8vIGBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5YCBpbnRvIGEgc2luZ2xlIHNldCwgYnV0IHdlIGtlZXAgdGhlIHNlcGFyYXRlIHNvIHRoYXRcbiAgICAvLyB3ZSBjYW4gZGlzdGluZ3Vpc2ggd2hlcmUgYW4gZXJyb3IgaXMgY29taW5nIGZyb20gd2hlbiBsb2dnaW5nIHRoZSBkaWFnbm9zdGljcyBpbiBgcmVzb2x2ZWAuXG4gICAgbGV0IHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsID0gbnVsbDtcbiAgICBsZXQgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbCA9IG51bGw7XG4gICAgbGV0IHdyYXBwZWRWaWV3UHJvdmlkZXJzOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3ZpZXdQcm92aWRlcnMnKSkge1xuICAgICAgY29uc3Qgdmlld1Byb3ZpZGVycyA9IGNvbXBvbmVudC5nZXQoJ3ZpZXdQcm92aWRlcnMnKSE7XG4gICAgICB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSA9XG4gICAgICAgICAgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnkodmlld1Byb3ZpZGVycywgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICAgIHdyYXBwZWRWaWV3UHJvdmlkZXJzID0gbmV3IFdyYXBwZWROb2RlRXhwcihcbiAgICAgICAgICB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyID8gd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyh2aWV3UHJvdmlkZXJzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXdQcm92aWRlcnMpO1xuICAgIH1cblxuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcm92aWRlcnMnKSkge1xuICAgICAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSA9IHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5KFxuICAgICAgICAgIGNvbXBvbmVudC5nZXQoJ3Byb3ZpZGVycycpISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSB0aGUgdGVtcGxhdGUuXG4gICAgLy8gSWYgYSBwcmVhbmFseXplIHBoYXNlIHdhcyBleGVjdXRlZCwgdGhlIHRlbXBsYXRlIG1heSBhbHJlYWR5IGV4aXN0IGluIHBhcnNlZCBmb3JtLCBzbyBjaGVja1xuICAgIC8vIHRoZSBwcmVhbmFseXplVGVtcGxhdGVDYWNoZS5cbiAgICAvLyBFeHRyYWN0IGEgY2xvc3VyZSBvZiB0aGUgdGVtcGxhdGUgcGFyc2luZyBjb2RlIHNvIHRoYXQgaXQgY2FuIGJlIHJlcGFyc2VkIHdpdGggZGlmZmVyZW50XG4gICAgLy8gb3B0aW9ucyBpZiBuZWVkZWQsIGxpa2UgaW4gdGhlIGluZGV4aW5nIHBpcGVsaW5lLlxuICAgIGxldCB0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlO1xuICAgIGlmICh0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmhhcyhub2RlKSkge1xuICAgICAgLy8gVGhlIHRlbXBsYXRlIHdhcyBwYXJzZWQgaW4gcHJlYW5hbHl6ZS4gVXNlIGl0IGFuZCBkZWxldGUgaXQgdG8gc2F2ZSBtZW1vcnkuXG4gICAgICBjb25zdCBwcmVhbmFseXplZCA9IHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICAgIHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuZGVsZXRlKG5vZGUpO1xuXG4gICAgICB0ZW1wbGF0ZSA9IHByZWFuYWx5emVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPSB0aGlzLnBhcnNlVGVtcGxhdGVEZWNsYXJhdGlvbihkZWNvcmF0b3IsIGNvbXBvbmVudCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgdGVtcGxhdGUgPSB0aGlzLmV4dHJhY3RUZW1wbGF0ZShub2RlLCB0ZW1wbGF0ZURlY2wpO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZVJlc291cmNlID1cbiAgICAgICAgdGVtcGxhdGUuZGVjbGFyYXRpb24uaXNJbmxpbmUgPyB7cGF0aDogbnVsbCwgZXhwcmVzc2lvbjogY29tcG9uZW50LmdldCgndGVtcGxhdGUnKSF9IDoge1xuICAgICAgICAgIHBhdGg6IGFic29sdXRlRnJvbSh0ZW1wbGF0ZS5kZWNsYXJhdGlvbi5yZXNvbHZlZFRlbXBsYXRlVXJsKSxcbiAgICAgICAgICBleHByZXNzaW9uOiB0ZW1wbGF0ZS5zb3VyY2VNYXBwaW5nLm5vZGVcbiAgICAgICAgfTtcblxuICAgIC8vIEZpZ3VyZSBvdXQgdGhlIHNldCBvZiBzdHlsZXMuIFRoZSBvcmRlcmluZyBoZXJlIGlzIGltcG9ydGFudDogZXh0ZXJuYWwgcmVzb3VyY2VzIChzdHlsZVVybHMpXG4gICAgLy8gcHJlY2VkZSBpbmxpbmUgc3R5bGVzLCBhbmQgc3R5bGVzIGRlZmluZWQgaW4gdGhlIHRlbXBsYXRlIG92ZXJyaWRlIHN0eWxlcyBkZWZpbmVkIGluIHRoZVxuICAgIC8vIGNvbXBvbmVudC5cbiAgICBsZXQgc3R5bGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3Qgc3R5bGVSZXNvdXJjZXMgPSB0aGlzLl9leHRyYWN0U3R5bGVSZXNvdXJjZXMoY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgY29uc3Qgc3R5bGVVcmxzOiBTdHlsZVVybE1ldGFbXSA9IFtcbiAgICAgIC4uLnRoaXMuX2V4dHJhY3RDb21wb25lbnRTdHlsZVVybHMoY29tcG9uZW50KSwgLi4udGhpcy5fZXh0cmFjdFRlbXBsYXRlU3R5bGVVcmxzKHRlbXBsYXRlKVxuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IHN0eWxlVXJsIG9mIHN0eWxlVXJscykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUoc3R5bGVVcmwudXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgIGNvbnN0IHJlc291cmNlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHJlc291cmNlVXJsKTtcbiAgICAgICAgc3R5bGVzLnB1c2gocmVzb3VyY2VTdHIpO1xuICAgICAgICBpZiAodGhpcy5kZXBUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5kZXBUcmFja2VyLmFkZFJlc291cmNlRGVwZW5kZW5jeShub2RlLmdldFNvdXJjZUZpbGUoKSwgYWJzb2x1dGVGcm9tKHJlc291cmNlVXJsKSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICBpZiAoZGlhZ25vc3RpY3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGRpYWdub3N0aWNzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzb3VyY2VUeXBlID1cbiAgICAgICAgICAgIHN0eWxlVXJsLnNvdXJjZSA9PT0gUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IgP1xuICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IgOlxuICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChcbiAgICAgICAgICAgIHRoaXMubWFrZVJlc291cmNlTm90Rm91bmRFcnJvcihzdHlsZVVybC51cmwsIHN0eWxlVXJsLm5vZGVGb3JFcnJvciwgcmVzb3VyY2VUeXBlKVxuICAgICAgICAgICAgICAgIC50b0RpYWdub3N0aWMoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVuY2Fwc3VsYXRpb24gPT09IFZpZXdFbmNhcHN1bGF0aW9uLlNoYWRvd0RvbSAmJiBtZXRhZGF0YS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgY29uc3Qgc2VsZWN0b3JFcnJvciA9IGNoZWNrQ3VzdG9tRWxlbWVudFNlbGVjdG9yRm9yRXJyb3JzKG1ldGFkYXRhLnNlbGVjdG9yKTtcbiAgICAgIGlmIChzZWxlY3RvckVycm9yICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChkaWFnbm9zdGljcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKG1ha2VEaWFnbm9zdGljKFxuICAgICAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9JTlZBTElEX1NIQURPV19ET01fU0VMRUNUT1IsIGNvbXBvbmVudC5nZXQoJ3NlbGVjdG9yJykhLFxuICAgICAgICAgICAgc2VsZWN0b3JFcnJvcikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIGlubGluZSBzdHlsZXMgd2VyZSBwcmVwcm9jZXNzZWQgdXNlIHRob3NlXG4gICAgbGV0IGlubGluZVN0eWxlczogc3RyaW5nW118bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMucHJlYW5hbHl6ZVN0eWxlc0NhY2hlLmhhcyhub2RlKSkge1xuICAgICAgaW5saW5lU3R5bGVzID0gdGhpcy5wcmVhbmFseXplU3R5bGVzQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICAgIHRoaXMucHJlYW5hbHl6ZVN0eWxlc0NhY2hlLmRlbGV0ZShub2RlKTtcbiAgICAgIGlmIChpbmxpbmVTdHlsZXMgIT09IG51bGwpIHtcbiAgICAgICAgc3R5bGVzLnB1c2goLi4uaW5saW5lU3R5bGVzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUHJlcHJvY2Vzc2luZyBpcyBvbmx5IHN1cHBvcnRlZCBhc3luY2hyb25vdXNseVxuICAgICAgLy8gSWYgbm8gc3R5bGUgY2FjaGUgZW50cnkgaXMgcHJlc2VudCBhc3luY2hyb25vdXMgcHJlYW5hbHl6ZSB3YXMgbm90IGV4ZWN1dGVkLlxuICAgICAgLy8gVGhpcyBwcm90ZWN0cyBhZ2FpbnN0IGFjY2lkZW50YWwgZGlmZmVyZW5jZXMgaW4gcmVzb3VyY2UgY29udGVudHMgd2hlbiBwcmVhbmFseXNpc1xuICAgICAgLy8gaXMgbm90IHVzZWQgd2l0aCBhIHByb3ZpZGVkIHRyYW5zZm9ybVJlc291cmNlIGhvb2sgb24gdGhlIFJlc291cmNlSG9zdC5cbiAgICAgIGlmICh0aGlzLnJlc291cmNlTG9hZGVyLmNhblByZXByb2Nlc3MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmxpbmUgcmVzb3VyY2UgcHJvY2Vzc2luZyByZXF1aXJlcyBhc3luY2hyb25vdXMgcHJlYW5hbHl6ZS4nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbXBvbmVudC5oYXMoJ3N0eWxlcycpKSB7XG4gICAgICAgIGNvbnN0IGxpdFN0eWxlcyA9IHBhcnNlRmllbGRBcnJheVZhbHVlKGNvbXBvbmVudCwgJ3N0eWxlcycsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICAgICAgaWYgKGxpdFN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgICAgIGlubGluZVN0eWxlcyA9IFsuLi5saXRTdHlsZXNdO1xuICAgICAgICAgIHN0eWxlcy5wdXNoKC4uLmxpdFN0eWxlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlLnN0eWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBzdHlsZXMucHVzaCguLi50ZW1wbGF0ZS5zdHlsZXMpO1xuICAgIH1cblxuICAgIGNvbnN0IG91dHB1dDogQW5hbHlzaXNPdXRwdXQ8Q29tcG9uZW50QW5hbHlzaXNEYXRhPiA9IHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIGJhc2VDbGFzczogcmVhZEJhc2VDbGFzcyhub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpLFxuICAgICAgICBpbnB1dHMsXG4gICAgICAgIG91dHB1dHMsXG4gICAgICAgIG1ldGE6IHtcbiAgICAgICAgICAuLi5tZXRhZGF0YSxcbiAgICAgICAgICB0ZW1wbGF0ZToge1xuICAgICAgICAgICAgbm9kZXM6IHRlbXBsYXRlLm5vZGVzLFxuICAgICAgICAgICAgbmdDb250ZW50U2VsZWN0b3JzOiB0ZW1wbGF0ZS5uZ0NvbnRlbnRTZWxlY3RvcnMsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBlbmNhcHN1bGF0aW9uLFxuICAgICAgICAgIGludGVycG9sYXRpb246IHRlbXBsYXRlLmludGVycG9sYXRpb25Db25maWcgPz8gREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRyxcbiAgICAgICAgICBzdHlsZXMsXG5cbiAgICAgICAgICAvLyBUaGVzZSB3aWxsIGJlIHJlcGxhY2VkIGR1cmluZyB0aGUgY29tcGlsYXRpb24gc3RlcCwgYWZ0ZXIgYWxsIGBOZ01vZHVsZWBzIGhhdmUgYmVlblxuICAgICAgICAgIC8vIGFuYWx5emVkIGFuZCB0aGUgZnVsbCBjb21waWxhdGlvbiBzY29wZSBmb3IgdGhlIGNvbXBvbmVudCBjYW4gYmUgcmVhbGl6ZWQuXG4gICAgICAgICAgYW5pbWF0aW9ucyxcbiAgICAgICAgICB2aWV3UHJvdmlkZXJzOiB3cmFwcGVkVmlld1Byb3ZpZGVycyxcbiAgICAgICAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IHRoaXMuaTE4blVzZUV4dGVybmFsSWRzLFxuICAgICAgICAgIHJlbGF0aXZlQ29udGV4dEZpbGVQYXRoLFxuICAgICAgICB9LFxuICAgICAgICB0eXBlQ2hlY2tNZXRhOiBleHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YShub2RlLCBpbnB1dHMsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgICAgY2xhc3NNZXRhZGF0YTogZXh0cmFjdENsYXNzTWV0YWRhdGEoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUsIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIsXG4gICAgICAgICAgICBkZWMgPT4gdGhpcy5fdHJhbnNmb3JtRGVjb3JhdG9yVG9JbmxpbmVSZXNvdXJjZXMoZGVjLCBjb21wb25lbnQsIHN0eWxlcywgdGVtcGxhdGUpKSxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksXG4gICAgICAgIHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LFxuICAgICAgICBpbmxpbmVTdHlsZXMsXG4gICAgICAgIHN0eWxlVXJscyxcbiAgICAgICAgcmVzb3VyY2VzOiB7XG4gICAgICAgICAgc3R5bGVzOiBzdHlsZVJlc291cmNlcyxcbiAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVSZXNvdXJjZSxcbiAgICAgICAgfSxcbiAgICAgICAgaXNQb2lzb25lZCxcbiAgICAgIH0sXG4gICAgICBkaWFnbm9zdGljcyxcbiAgICB9O1xuICAgIGlmIChjaGFuZ2VEZXRlY3Rpb24gIT09IG51bGwpIHtcbiAgICAgIG91dHB1dC5hbmFseXNpcyEubWV0YS5jaGFuZ2VEZXRlY3Rpb24gPSBjaGFuZ2VEZXRlY3Rpb247XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cblxuICBzeW1ib2wobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pOiBDb21wb25lbnRTeW1ib2wge1xuICAgIGNvbnN0IHR5cGVQYXJhbWV0ZXJzID0gZXh0cmFjdFNlbWFudGljVHlwZVBhcmFtZXRlcnMobm9kZSk7XG5cbiAgICByZXR1cm4gbmV3IENvbXBvbmVudFN5bWJvbChcbiAgICAgICAgbm9kZSwgYW5hbHlzaXMubWV0YS5zZWxlY3RvciwgYW5hbHlzaXMuaW5wdXRzLCBhbmFseXNpcy5vdXRwdXRzLCBhbmFseXNpcy5tZXRhLmV4cG9ydEFzLFxuICAgICAgICBhbmFseXNpcy50eXBlQ2hlY2tNZXRhLCB0eXBlUGFyYW1ldGVycyk7XG4gIH1cblxuICByZWdpc3Rlcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogQ29tcG9uZW50QW5hbHlzaXNEYXRhKTogdm9pZCB7XG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBjb21wb25lbnQncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBgTWV0YWRhdGFSZWdpc3RyeWAuIFRoaXMgZW5zdXJlcyB0aGF0XG4gICAgLy8gdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjb21wb25lbnQgaXMgYXZhaWxhYmxlIGR1cmluZyB0aGUgY29tcGlsZSgpIHBoYXNlLlxuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgdGhpcy5tZXRhUmVnaXN0cnkucmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YSh7XG4gICAgICB0eXBlOiBNZXRhVHlwZS5EaXJlY3RpdmUsXG4gICAgICByZWYsXG4gICAgICBuYW1lOiBub2RlLm5hbWUudGV4dCxcbiAgICAgIHNlbGVjdG9yOiBhbmFseXNpcy5tZXRhLnNlbGVjdG9yLFxuICAgICAgZXhwb3J0QXM6IGFuYWx5c2lzLm1ldGEuZXhwb3J0QXMsXG4gICAgICBpbnB1dHM6IGFuYWx5c2lzLmlucHV0cyxcbiAgICAgIG91dHB1dHM6IGFuYWx5c2lzLm91dHB1dHMsXG4gICAgICBxdWVyaWVzOiBhbmFseXNpcy5tZXRhLnF1ZXJpZXMubWFwKHF1ZXJ5ID0+IHF1ZXJ5LnByb3BlcnR5TmFtZSksXG4gICAgICBpc0NvbXBvbmVudDogdHJ1ZSxcbiAgICAgIGJhc2VDbGFzczogYW5hbHlzaXMuYmFzZUNsYXNzLFxuICAgICAgLi4uYW5hbHlzaXMudHlwZUNoZWNrTWV0YSxcbiAgICAgIGlzUG9pc29uZWQ6IGFuYWx5c2lzLmlzUG9pc29uZWQsXG4gICAgICBpc1N0cnVjdHVyYWw6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgdGhpcy5yZXNvdXJjZVJlZ2lzdHJ5LnJlZ2lzdGVyUmVzb3VyY2VzKGFuYWx5c2lzLnJlc291cmNlcywgbm9kZSk7XG4gICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkucmVnaXN0ZXJJbmplY3RhYmxlKG5vZGUpO1xuICB9XG5cbiAgaW5kZXgoXG4gICAgICBjb250ZXh0OiBJbmRleGluZ0NvbnRleHQsIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+KSB7XG4gICAgaWYgKGFuYWx5c2lzLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGNvbnN0IHNlbGVjdG9yID0gYW5hbHlzaXMubWV0YS5zZWxlY3RvcjtcbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcjxEaXJlY3RpdmVNZXRhPigpO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgaWYgKChzY29wZS5jb21waWxhdGlvbi5pc1BvaXNvbmVkIHx8IHNjb3BlLmV4cG9ydGVkLmlzUG9pc29uZWQpICYmICF0aGlzLnVzZVBvaXNvbmVkRGF0YSkge1xuICAgICAgICAvLyBEb24ndCBib3RoZXIgaW5kZXhpbmcgY29tcG9uZW50cyB3aGljaCBoYWQgZXJyb25lb3VzIHNjb3BlcywgdW5sZXNzIHNwZWNpZmljYWxseVxuICAgICAgICAvLyByZXF1ZXN0ZWQuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGlmIChkaXJlY3RpdmUuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgIGNvbnN0IGJvdW5kVGVtcGxhdGUgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IGFuYWx5c2lzLnRlbXBsYXRlLmRpYWdOb2Rlc30pO1xuXG4gICAgY29udGV4dC5hZGRDb21wb25lbnQoe1xuICAgICAgZGVjbGFyYXRpb246IG5vZGUsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIGJvdW5kVGVtcGxhdGUsXG4gICAgICB0ZW1wbGF0ZU1ldGE6IHtcbiAgICAgICAgaXNJbmxpbmU6IGFuYWx5c2lzLnRlbXBsYXRlLmRlY2xhcmF0aW9uLmlzSW5saW5lLFxuICAgICAgICBmaWxlOiBhbmFseXNpcy50ZW1wbGF0ZS5maWxlLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHR5cGVDaGVjayhjdHg6IFR5cGVDaGVja0NvbnRleHQsIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIG1ldGE6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pOlxuICAgICAgdm9pZCB7XG4gICAgaWYgKHRoaXMudHlwZUNoZWNrU2NvcGVSZWdpc3RyeSA9PT0gbnVsbCB8fCAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKG1ldGEuaXNQb2lzb25lZCAmJiAhdGhpcy51c2VQb2lzb25lZERhdGEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnR5cGVDaGVja1Njb3BlUmVnaXN0cnkuZ2V0VHlwZUNoZWNrU2NvcGUobm9kZSk7XG4gICAgaWYgKHNjb3BlLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICAvLyBEb24ndCB0eXBlLWNoZWNrIGNvbXBvbmVudHMgdGhhdCBoYWQgZXJyb3JzIGluIHRoZWlyIHNjb3BlcywgdW5sZXNzIHJlcXVlc3RlZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBiaW5kZXIgPSBuZXcgUjNUYXJnZXRCaW5kZXIoc2NvcGUubWF0Y2hlcik7XG4gICAgY3R4LmFkZFRlbXBsYXRlKFxuICAgICAgICBuZXcgUmVmZXJlbmNlKG5vZGUpLCBiaW5kZXIsIG1ldGEudGVtcGxhdGUuZGlhZ05vZGVzLCBzY29wZS5waXBlcywgc2NvcGUuc2NoZW1hcyxcbiAgICAgICAgbWV0YS50ZW1wbGF0ZS5zb3VyY2VNYXBwaW5nLCBtZXRhLnRlbXBsYXRlLmZpbGUsIG1ldGEudGVtcGxhdGUuZXJyb3JzKTtcbiAgfVxuXG4gIGV4dGVuZGVkVGVtcGxhdGVDaGVjayhcbiAgICAgIGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyOiBFeHRlbmRlZFRlbXBsYXRlQ2hlY2tlcik6IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIGV4dGVuZGVkVGVtcGxhdGVDaGVja2VyLmdldERpYWdub3N0aWNzRm9yQ29tcG9uZW50KGNvbXBvbmVudCk7XG4gIH1cblxuICByZXNvbHZlKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICBzeW1ib2w6IENvbXBvbmVudFN5bWJvbCk6IFJlc29sdmVSZXN1bHQ8Q29tcG9uZW50UmVzb2x1dGlvbkRhdGE+IHtcbiAgICBpZiAodGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlciAhPT0gbnVsbCAmJiBhbmFseXNpcy5iYXNlQ2xhc3MgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIHN5bWJvbC5iYXNlQ2xhc3MgPSB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLmdldFN5bWJvbChhbmFseXNpcy5iYXNlQ2xhc3Mubm9kZSk7XG4gICAgfVxuXG4gICAgaWYgKGFuYWx5c2lzLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBjb21wb25lbnQgd2FzIHJlZ2lzdGVyZWQgd2l0aCBhbiBOZ01vZHVsZS4gSWYgc28sIGl0IHNob3VsZCBiZSBjb21waWxlZFxuICAgIC8vIHVuZGVyIHRoYXQgbW9kdWxlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGxldCBtZXRhZGF0YSA9IGFuYWx5c2lzLm1ldGEgYXMgUmVhZG9ubHk8UjNDb21wb25lbnRNZXRhZGF0YT47XG5cbiAgICBjb25zdCBkYXRhOiBDb21wb25lbnRSZXNvbHV0aW9uRGF0YSA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IEVNUFRZX0FSUkFZLFxuICAgICAgcGlwZXM6IEVNUFRZX01BUCxcbiAgICAgIGRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlOiBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZS5EaXJlY3QsXG4gICAgfTtcblxuICAgIGlmIChzY29wZSAhPT0gbnVsbCAmJiAoIXNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQgfHwgdGhpcy51c2VQb2lzb25lZERhdGEpKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIHJlc29sdmUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICAvL1xuICAgICAgLy8gRmlyc3QgaXQgbmVlZHMgdG8gYmUgZGV0ZXJtaW5lZCBpZiBhY3R1YWxseSBpbXBvcnRpbmcgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgdXNlZCBpbiB0aGVcbiAgICAgIC8vIHRlbXBsYXRlIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLiBDdXJyZW50bHkgbmd0c2MgcmVmdXNlcyB0byBnZW5lcmF0ZSBjeWNsZXMsIHNvIGFuIG9wdGlvblxuICAgICAgLy8ga25vd24gYXMgXCJyZW1vdGUgc2NvcGluZ1wiIGlzIHVzZWQgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLiBJbiByZW1vdGUgc2NvcGluZywgdGhlXG4gICAgICAvLyBtb2R1bGUgZmlsZSBzZXRzIHRoZSBkaXJlY3RpdmVzL3BpcGVzIG9uIHRoZSDJtWNtcCBvZiB0aGUgY29tcG9uZW50LCB3aXRob3V0XG4gICAgICAvLyByZXF1aXJpbmcgbmV3IGltcG9ydHMgKGJ1dCBhbHNvIGluIGEgd2F5IHRoYXQgYnJlYWtzIHRyZWUgc2hha2luZykuXG4gICAgICAvL1xuICAgICAgLy8gRGV0ZXJtaW5pbmcgdGhpcyBpcyBjaGFsbGVuZ2luZywgYmVjYXVzZSB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyByZXNwb25zaWJsZSBmb3JcbiAgICAgIC8vIG1hdGNoaW5nIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSB0ZW1wbGF0ZTsgaG93ZXZlciwgdGhhdCBkb2Vzbid0IHJ1biB1bnRpbCB0aGUgYWN0dWFsXG4gICAgICAvLyBjb21waWxlKCkgc3RlcC4gSXQncyBub3QgcG9zc2libGUgdG8gcnVuIHRlbXBsYXRlIGNvbXBpbGF0aW9uIHNvb25lciBhcyBpdCByZXF1aXJlcyB0aGVcbiAgICAgIC8vIENvbnN0YW50UG9vbCBmb3IgdGhlIG92ZXJhbGwgZmlsZSBiZWluZyBjb21waWxlZCAod2hpY2ggaXNuJ3QgYXZhaWxhYmxlIHVudGlsIHRoZVxuICAgICAgLy8gdHJhbnNmb3JtIHN0ZXApLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQsIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIG1hdGNoZWQgaW5kZXBlbmRlbnRseSBoZXJlLCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXNcbiAgICAgIC8vIGlzIGFuIGFsdGVybmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIHRlbXBsYXRlIG1hdGNoaW5nIHdoaWNoIGlzIHVzZWQgZm9yIHRlbXBsYXRlXG4gICAgICAvLyB0eXBlLWNoZWNraW5nIGFuZCB3aWxsIGV2ZW50dWFsbHkgcmVwbGFjZSBtYXRjaGluZyBpbiB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlci5cblxuXG4gICAgICAvLyBTZXQgdXAgdGhlIFIzVGFyZ2V0QmluZGVyLCBhcyB3ZWxsIGFzIGEgJ2RpcmVjdGl2ZXMnIGFycmF5IGFuZCBhICdwaXBlcycgbWFwIHRoYXQgYXJlXG4gICAgICAvLyBsYXRlciBmZWQgdG8gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuIEZpcnN0LCBhIFNlbGVjdG9yTWF0Y2hlciBpcyBjb25zdHJ1Y3RlZCB0b1xuICAgICAgLy8gbWF0Y2ggZGlyZWN0aXZlcyB0aGF0IGFyZSBpbiBzY29wZS5cbiAgICAgIHR5cGUgTWF0Y2hlZERpcmVjdGl2ZSA9IERpcmVjdGl2ZU1ldGEme3NlbGVjdG9yOiBzdHJpbmd9O1xuICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8TWF0Y2hlZERpcmVjdGl2ZT4oKTtcblxuICAgICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBpZiAoZGlyLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShkaXIuc2VsZWN0b3IpLCBkaXIgYXMgTWF0Y2hlZERpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5jb21waWxhdGlvbi5waXBlcykge1xuICAgICAgICBwaXBlcy5zZXQocGlwZS5uYW1lLCBwaXBlLnJlZik7XG4gICAgICB9XG5cbiAgICAgIC8vIE5leHQsIHRoZSBjb21wb25lbnQgdGVtcGxhdGUgQVNUIGlzIGJvdW5kIHVzaW5nIHRoZSBSM1RhcmdldEJpbmRlci4gVGhpcyBwcm9kdWNlcyBhXG4gICAgICAvLyBCb3VuZFRhcmdldCwgd2hpY2ggaXMgc2ltaWxhciB0byBhIHRzLlR5cGVDaGVja2VyLlxuICAgICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgICAgY29uc3QgYm91bmQgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IG1ldGFkYXRhLnRlbXBsYXRlLm5vZGVzfSk7XG5cbiAgICAgIC8vIFRoZSBCb3VuZFRhcmdldCBrbm93cyB3aGljaCBkaXJlY3RpdmVzIGFuZCBwaXBlcyBtYXRjaGVkIHRoZSB0ZW1wbGF0ZS5cbiAgICAgIHR5cGUgVXNlZERpcmVjdGl2ZSA9XG4gICAgICAgICAgUjNVc2VkRGlyZWN0aXZlTWV0YWRhdGEme3JlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBpbXBvcnRlZEZpbGU6IEltcG9ydGVkRmlsZX07XG4gICAgICBjb25zdCB1c2VkRGlyZWN0aXZlczogVXNlZERpcmVjdGl2ZVtdID0gYm91bmQuZ2V0VXNlZERpcmVjdGl2ZXMoKS5tYXAoZGlyZWN0aXZlID0+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGRpcmVjdGl2ZS5yZWYsIGNvbnRleHQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlZjogZGlyZWN0aXZlLnJlZixcbiAgICAgICAgICB0eXBlOiB0eXBlLmV4cHJlc3Npb24sXG4gICAgICAgICAgaW1wb3J0ZWRGaWxlOiB0eXBlLmltcG9ydGVkRmlsZSxcbiAgICAgICAgICBzZWxlY3RvcjogZGlyZWN0aXZlLnNlbGVjdG9yLFxuICAgICAgICAgIGlucHV0czogZGlyZWN0aXZlLmlucHV0cy5wcm9wZXJ0eU5hbWVzLFxuICAgICAgICAgIG91dHB1dHM6IGRpcmVjdGl2ZS5vdXRwdXRzLnByb3BlcnR5TmFtZXMsXG4gICAgICAgICAgZXhwb3J0QXM6IGRpcmVjdGl2ZS5leHBvcnRBcyxcbiAgICAgICAgICBpc0NvbXBvbmVudDogZGlyZWN0aXZlLmlzQ29tcG9uZW50LFxuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIHR5cGUgVXNlZFBpcGUgPSB7XG4gICAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LFxuICAgICAgICBwaXBlTmFtZTogc3RyaW5nLFxuICAgICAgICBleHByZXNzaW9uOiBFeHByZXNzaW9uLFxuICAgICAgICBpbXBvcnRlZEZpbGU6IEltcG9ydGVkRmlsZSxcbiAgICAgIH07XG4gICAgICBjb25zdCB1c2VkUGlwZXM6IFVzZWRQaXBlW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgcGlwZU5hbWUgb2YgYm91bmQuZ2V0VXNlZFBpcGVzKCkpIHtcbiAgICAgICAgaWYgKCFwaXBlcy5oYXMocGlwZU5hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGlwZSA9IHBpcGVzLmdldChwaXBlTmFtZSkhO1xuICAgICAgICBjb25zdCB0eXBlID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocGlwZSwgY29udGV4dCk7XG4gICAgICAgIHVzZWRQaXBlcy5wdXNoKHtcbiAgICAgICAgICByZWY6IHBpcGUsXG4gICAgICAgICAgcGlwZU5hbWUsXG4gICAgICAgICAgZXhwcmVzc2lvbjogdHlwZS5leHByZXNzaW9uLFxuICAgICAgICAgIGltcG9ydGVkRmlsZTogdHlwZS5pbXBvcnRlZEZpbGUsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgIT09IG51bGwpIHtcbiAgICAgICAgc3ltYm9sLnVzZWREaXJlY3RpdmVzID0gdXNlZERpcmVjdGl2ZXMubWFwKFxuICAgICAgICAgICAgZGlyID0+IHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIhLmdldFNlbWFudGljUmVmZXJlbmNlKGRpci5yZWYubm9kZSwgZGlyLnR5cGUpKTtcbiAgICAgICAgc3ltYm9sLnVzZWRQaXBlcyA9IHVzZWRQaXBlcy5tYXAoXG4gICAgICAgICAgICBwaXBlID0+XG4gICAgICAgICAgICAgICAgdGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlciEuZ2V0U2VtYW50aWNSZWZlcmVuY2UocGlwZS5yZWYubm9kZSwgcGlwZS5leHByZXNzaW9uKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFNjYW4gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcy9waXBlcyBhY3R1YWxseSB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgY2hlY2sgd2hldGhlciBhbnlcbiAgICAgIC8vIGltcG9ydCB3aGljaCBuZWVkcyB0byBiZSBnZW5lcmF0ZWQgd291bGQgY3JlYXRlIGEgY3ljbGUuXG4gICAgICBjb25zdCBjeWNsZXNGcm9tRGlyZWN0aXZlcyA9IG5ldyBNYXA8VXNlZERpcmVjdGl2ZSwgQ3ljbGU+KCk7XG4gICAgICBmb3IgKGNvbnN0IHVzZWREaXJlY3RpdmUgb2YgdXNlZERpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3QgY3ljbGUgPVxuICAgICAgICAgICAgdGhpcy5fY2hlY2tGb3JDeWNsaWNJbXBvcnQodXNlZERpcmVjdGl2ZS5pbXBvcnRlZEZpbGUsIHVzZWREaXJlY3RpdmUudHlwZSwgY29udGV4dCk7XG4gICAgICAgIGlmIChjeWNsZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGN5Y2xlc0Zyb21EaXJlY3RpdmVzLnNldCh1c2VkRGlyZWN0aXZlLCBjeWNsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGN5Y2xlc0Zyb21QaXBlcyA9IG5ldyBNYXA8VXNlZFBpcGUsIEN5Y2xlPigpO1xuICAgICAgZm9yIChjb25zdCB1c2VkUGlwZSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgY29uc3QgY3ljbGUgPVxuICAgICAgICAgICAgdGhpcy5fY2hlY2tGb3JDeWNsaWNJbXBvcnQodXNlZFBpcGUuaW1wb3J0ZWRGaWxlLCB1c2VkUGlwZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKGN5Y2xlICE9PSBudWxsKSB7XG4gICAgICAgICAgY3ljbGVzRnJvbVBpcGVzLnNldCh1c2VkUGlwZSwgY3ljbGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGN5Y2xlRGV0ZWN0ZWQgPSBjeWNsZXNGcm9tRGlyZWN0aXZlcy5zaXplICE9PSAwIHx8IGN5Y2xlc0Zyb21QaXBlcy5zaXplICE9PSAwO1xuICAgICAgaWYgKCFjeWNsZURldGVjdGVkKSB7XG4gICAgICAgIC8vIE5vIGN5Y2xlIHdhcyBkZXRlY3RlZC4gUmVjb3JkIHRoZSBpbXBvcnRzIHRoYXQgbmVlZCB0byBiZSBjcmVhdGVkIGluIHRoZSBjeWNsZSBkZXRlY3RvclxuICAgICAgICAvLyBzbyB0aGF0IGZ1dHVyZSBjeWNsaWMgaW1wb3J0IGNoZWNrcyBjb25zaWRlciB0aGVpciBwcm9kdWN0aW9uLlxuICAgICAgICBmb3IgKGNvbnN0IHt0eXBlLCBpbXBvcnRlZEZpbGV9IG9mIHVzZWREaXJlY3RpdmVzKSB7XG4gICAgICAgICAgdGhpcy5fcmVjb3JkU3ludGhldGljSW1wb3J0KGltcG9ydGVkRmlsZSwgdHlwZSwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCB7ZXhwcmVzc2lvbiwgaW1wb3J0ZWRGaWxlfSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgICB0aGlzLl9yZWNvcmRTeW50aGV0aWNJbXBvcnQoaW1wb3J0ZWRGaWxlLCBleHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGFycmF5cyBpbiDJtWNtcCBuZWVkIHRvIGJlIHdyYXBwZWQgaW4gY2xvc3VyZXMuXG4gICAgICAgIC8vIFRoaXMgaXMgcmVxdWlyZWQgaWYgYW55IGRpcmVjdGl2ZS9waXBlIHJlZmVyZW5jZSBpcyB0byBhIGRlY2xhcmF0aW9uIGluIHRoZSBzYW1lIGZpbGVcbiAgICAgICAgLy8gYnV0IGRlY2xhcmVkIGFmdGVyIHRoaXMgY29tcG9uZW50LlxuICAgICAgICBjb25zdCB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID1cbiAgICAgICAgICAgIHVzZWREaXJlY3RpdmVzLnNvbWUoXG4gICAgICAgICAgICAgICAgZGlyID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoZGlyLnR5cGUsIG5vZGUubmFtZSwgY29udGV4dCkpIHx8XG4gICAgICAgICAgICB1c2VkUGlwZXMuc29tZShcbiAgICAgICAgICAgICAgICBwaXBlID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocGlwZS5leHByZXNzaW9uLCBub2RlLm5hbWUsIGNvbnRleHQpKTtcblxuICAgICAgICBkYXRhLmRpcmVjdGl2ZXMgPSB1c2VkRGlyZWN0aXZlcztcbiAgICAgICAgZGF0YS5waXBlcyA9IG5ldyBNYXAodXNlZFBpcGVzLm1hcChwaXBlID0+IFtwaXBlLnBpcGVOYW1lLCBwaXBlLmV4cHJlc3Npb25dKSk7XG4gICAgICAgIGRhdGEuZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUgPSB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID9cbiAgICAgICAgICAgIERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkNsb3N1cmUgOlxuICAgICAgICAgICAgRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUuRGlyZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuY3ljbGVIYW5kbGluZ1N0cmF0ZWd5ID09PSBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuVXNlUmVtb3RlU2NvcGluZykge1xuICAgICAgICAgIC8vIERlY2xhcmluZyB0aGUgZGlyZWN0aXZlRGVmcy9waXBlRGVmcyBhcnJheXMgZGlyZWN0bHkgd291bGQgcmVxdWlyZSBpbXBvcnRzIHRoYXQgd291bGRcbiAgICAgICAgICAvLyBjcmVhdGUgYSBjeWNsZS4gSW5zdGVhZCwgbWFyayB0aGlzIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcsIHNvIHRoYXQgdGhlXG4gICAgICAgICAgLy8gTmdNb2R1bGUgZmlsZSB3aWxsIHRha2UgY2FyZSBvZiBzZXR0aW5nIHRoZSBkaXJlY3RpdmVzIGZvciB0aGUgY29tcG9uZW50LlxuICAgICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5zZXRDb21wb25lbnRSZW1vdGVTY29wZShcbiAgICAgICAgICAgICAgbm9kZSwgdXNlZERpcmVjdGl2ZXMubWFwKGRpciA9PiBkaXIucmVmKSwgdXNlZFBpcGVzLm1hcChwaXBlID0+IHBpcGUucmVmKSk7XG4gICAgICAgICAgc3ltYm9sLmlzUmVtb3RlbHlTY29wZWQgPSB0cnVlO1xuXG4gICAgICAgICAgLy8gSWYgYSBzZW1hbnRpYyBncmFwaCBpcyBiZWluZyB0cmFja2VkLCByZWNvcmQgdGhlIGZhY3QgdGhhdCB0aGlzIGNvbXBvbmVudCBpcyByZW1vdGVseVxuICAgICAgICAgIC8vIHNjb3BlZCB3aXRoIHRoZSBkZWNsYXJpbmcgTmdNb2R1bGUgc3ltYm9sIGFzIHRoZSBOZ01vZHVsZSdzIGVtaXQgYmVjb21lcyBkZXBlbmRlbnQgb25cbiAgICAgICAgICAvLyB0aGUgZGlyZWN0aXZlL3BpcGUgdXNhZ2VzIG9mIHRoaXMgY29tcG9uZW50LlxuICAgICAgICAgIGlmICh0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCBtb2R1bGVTeW1ib2wgPSB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLmdldFN5bWJvbChzY29wZS5uZ01vZHVsZSk7XG4gICAgICAgICAgICBpZiAoIShtb2R1bGVTeW1ib2wgaW5zdGFuY2VvZiBOZ01vZHVsZVN5bWJvbCkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgYEFzc2VydGlvbkVycm9yOiBFeHBlY3RlZCAke3Njb3BlLm5nTW9kdWxlLm5hbWV9IHRvIGJlIGFuIE5nTW9kdWxlU3ltYm9sLmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtb2R1bGVTeW1ib2wuYWRkUmVtb3RlbHlTY29wZWRDb21wb25lbnQoXG4gICAgICAgICAgICAgICAgc3ltYm9sLCBzeW1ib2wudXNlZERpcmVjdGl2ZXMsIHN5bWJvbC51c2VkUGlwZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBXZSBhcmUgbm90IGFibGUgdG8gaGFuZGxlIHRoaXMgY3ljbGUgc28gdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgY29uc3QgcmVsYXRlZE1lc3NhZ2VzOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtkaXIsIGN5Y2xlXSBvZiBjeWNsZXNGcm9tRGlyZWN0aXZlcykge1xuICAgICAgICAgICAgcmVsYXRlZE1lc3NhZ2VzLnB1c2goXG4gICAgICAgICAgICAgICAgbWFrZUN5Y2xpY0ltcG9ydEluZm8oZGlyLnJlZiwgZGlyLmlzQ29tcG9uZW50ID8gJ2NvbXBvbmVudCcgOiAnZGlyZWN0aXZlJywgY3ljbGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBbcGlwZSwgY3ljbGVdIG9mIGN5Y2xlc0Zyb21QaXBlcykge1xuICAgICAgICAgICAgcmVsYXRlZE1lc3NhZ2VzLnB1c2gobWFrZUN5Y2xpY0ltcG9ydEluZm8ocGlwZS5yZWYsICdwaXBlJywgY3ljbGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuSU1QT1JUX0NZQ0xFX0RFVEVDVEVELCBub2RlLFxuICAgICAgICAgICAgICAnT25lIG9yIG1vcmUgaW1wb3J0IGN5Y2xlcyB3b3VsZCBuZWVkIHRvIGJlIGNyZWF0ZWQgdG8gY29tcGlsZSB0aGlzIGNvbXBvbmVudCwgJyArXG4gICAgICAgICAgICAgICAgICAnd2hpY2ggaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgY3VycmVudCBjb21waWxlciBjb25maWd1cmF0aW9uLicsXG4gICAgICAgICAgICAgIHJlbGF0ZWRNZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICBpZiAoYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSAhPT0gbnVsbCAmJlxuICAgICAgICBhbmFseXNpcy5tZXRhLnByb3ZpZGVycyBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcikge1xuICAgICAgY29uc3QgcHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMhLm5vZGUsXG4gICAgICAgICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5wcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoYW5hbHlzaXMudmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgIT09IG51bGwgJiZcbiAgICAgICAgYW5hbHlzaXMubWV0YS52aWV3UHJvdmlkZXJzIGluc3RhbmNlb2YgV3JhcHBlZE5vZGVFeHByKSB7XG4gICAgICBjb25zdCB2aWV3UHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMudmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIGFuYWx5c2lzLm1ldGEudmlld1Byb3ZpZGVycyEubm9kZSxcbiAgICAgICAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeSk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnZpZXdQcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVEaWFnbm9zdGljcyA9IGdldERpcmVjdGl2ZURpYWdub3N0aWNzKFxuICAgICAgICBub2RlLCB0aGlzLm1ldGFSZWFkZXIsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCAnQ29tcG9uZW50Jyk7XG4gICAgaWYgKGRpcmVjdGl2ZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmRpcmVjdGl2ZURpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtkaWFnbm9zdGljc307XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkYXRhfTtcbiAgfVxuXG4gIHhpMThuKGN0eDogWGkxOG5Db250ZXh0LCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPik6XG4gICAgICB2b2lkIHtcbiAgICBjdHgudXBkYXRlRnJvbVRlbXBsYXRlKFxuICAgICAgICBhbmFseXNpcy50ZW1wbGF0ZS5jb250ZW50LCBhbmFseXNpcy50ZW1wbGF0ZS5kZWNsYXJhdGlvbi5yZXNvbHZlZFRlbXBsYXRlVXJsLFxuICAgICAgICBhbmFseXNpcy50ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uQ29uZmlnID8/IERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUcpO1xuICB9XG5cbiAgdXBkYXRlUmVzb3VyY2VzKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRBbmFseXNpc0RhdGEpOiB2b2lkIHtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuXG4gICAgLy8gSWYgdGhlIHRlbXBsYXRlIGlzIGV4dGVybmFsLCByZS1wYXJzZSBpdC5cbiAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPSBhbmFseXNpcy50ZW1wbGF0ZS5kZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRlbXBsYXRlRGVjbC5pc0lubGluZSkge1xuICAgICAgYW5hbHlzaXMudGVtcGxhdGUgPSB0aGlzLmV4dHJhY3RUZW1wbGF0ZShub2RlLCB0ZW1wbGF0ZURlY2wpO1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSBhbnkgZXh0ZXJuYWwgc3R5bGVzaGVldHMgYW5kIHJlYnVpbGQgdGhlIGNvbWJpbmVkICdzdHlsZXMnIGxpc3QuXG4gICAgLy8gVE9ETyhhbHhodWIpOiB3cml0ZSB0ZXN0cyBmb3Igc3R5bGVzIHdoZW4gdGhlIHByaW1hcnkgY29tcGlsZXIgdXNlcyB0aGUgdXBkYXRlUmVzb3VyY2VzIHBhdGhcbiAgICBsZXQgc3R5bGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChhbmFseXNpcy5zdHlsZVVybHMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3Qgc3R5bGVVcmwgb2YgYW5hbHlzaXMuc3R5bGVVcmxzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWRTdHlsZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybC51cmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgICBjb25zdCBzdHlsZVRleHQgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQocmVzb2x2ZWRTdHlsZVVybCk7XG4gICAgICAgICAgc3R5bGVzLnB1c2goc3R5bGVUZXh0KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFJlc291cmNlIHJlc29sdmUgZmFpbHVyZXMgc2hvdWxkIGFscmVhZHkgYmUgaW4gdGhlIGRpYWdub3N0aWNzIGxpc3QgZnJvbSB0aGUgYW5hbHl6ZVxuICAgICAgICAgIC8vIHN0YWdlLiBXZSBkbyBub3QgbmVlZCB0byBkbyBhbnl0aGluZyB3aXRoIHRoZW0gd2hlbiB1cGRhdGluZyByZXNvdXJjZXMuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGFuYWx5c2lzLmlubGluZVN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzdHlsZVRleHQgb2YgYW5hbHlzaXMuaW5saW5lU3R5bGVzKSB7XG4gICAgICAgIHN0eWxlcy5wdXNoKHN0eWxlVGV4dCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3R5bGVUZXh0IG9mIGFuYWx5c2lzLnRlbXBsYXRlLnN0eWxlcykge1xuICAgICAgc3R5bGVzLnB1c2goc3R5bGVUZXh0KTtcbiAgICB9XG5cbiAgICBhbmFseXNpcy5tZXRhLnN0eWxlcyA9IHN0eWxlcztcbiAgfVxuXG4gIGNvbXBpbGVGdWxsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICByZXNvbHV0aW9uOiBSZWFkb25seTxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4sIHBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgaWYgKGFuYWx5c2lzLnRlbXBsYXRlLmVycm9ycyAhPT0gbnVsbCAmJiBhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBtZXRhOiBSM0NvbXBvbmVudE1ldGFkYXRhID0gey4uLmFuYWx5c2lzLm1ldGEsIC4uLnJlc29sdXRpb259O1xuICAgIGNvbnN0IGZhYyA9IGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZCh0b0ZhY3RvcnlNZXRhZGF0YShtZXRhLCBGYWN0b3J5VGFyZ2V0LkNvbXBvbmVudCkpO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgY29uc3QgY2xhc3NNZXRhZGF0YSA9IGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEgIT09IG51bGwgP1xuICAgICAgICBjb21waWxlQ2xhc3NNZXRhZGF0YShhbmFseXNpcy5jbGFzc01ldGFkYXRhKS50b1N0bXQoKSA6XG4gICAgICAgIG51bGw7XG4gICAgcmV0dXJuIGNvbXBpbGVSZXN1bHRzKGZhYywgZGVmLCBjbGFzc01ldGFkYXRhLCAnybVjbXAnKTtcbiAgfVxuXG4gIGNvbXBpbGVQYXJ0aWFsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICByZXNvbHV0aW9uOiBSZWFkb25seTxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGlmIChhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMgIT09IG51bGwgJiYgYW5hbHlzaXMudGVtcGxhdGUuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgdGVtcGxhdGVJbmZvOiBEZWNsYXJlQ29tcG9uZW50VGVtcGxhdGVJbmZvID0ge1xuICAgICAgY29udGVudDogYW5hbHlzaXMudGVtcGxhdGUuY29udGVudCxcbiAgICAgIHNvdXJjZVVybDogYW5hbHlzaXMudGVtcGxhdGUuZGVjbGFyYXRpb24ucmVzb2x2ZWRUZW1wbGF0ZVVybCxcbiAgICAgIGlzSW5saW5lOiBhbmFseXNpcy50ZW1wbGF0ZS5kZWNsYXJhdGlvbi5pc0lubGluZSxcbiAgICAgIGlubGluZVRlbXBsYXRlTGl0ZXJhbEV4cHJlc3Npb246IGFuYWx5c2lzLnRlbXBsYXRlLnNvdXJjZU1hcHBpbmcudHlwZSA9PT0gJ2RpcmVjdCcgP1xuICAgICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIoYW5hbHlzaXMudGVtcGxhdGUuc291cmNlTWFwcGluZy5ub2RlKSA6XG4gICAgICAgICAgbnVsbCxcbiAgICB9O1xuICAgIGNvbnN0IG1ldGE6IFIzQ29tcG9uZW50TWV0YWRhdGEgPSB7Li4uYW5hbHlzaXMubWV0YSwgLi4ucmVzb2x1dGlvbn07XG4gICAgY29uc3QgZmFjID0gY29tcGlsZURlY2xhcmVGYWN0b3J5KHRvRmFjdG9yeU1ldGFkYXRhKG1ldGEsIEZhY3RvcnlUYXJnZXQuQ29tcG9uZW50KSk7XG4gICAgY29uc3QgZGVmID0gY29tcGlsZURlY2xhcmVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgYW5hbHlzaXMudGVtcGxhdGUsIHRlbXBsYXRlSW5mbyk7XG4gICAgY29uc3QgY2xhc3NNZXRhZGF0YSA9IGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEgIT09IG51bGwgP1xuICAgICAgICBjb21waWxlRGVjbGFyZUNsYXNzTWV0YWRhdGEoYW5hbHlzaXMuY2xhc3NNZXRhZGF0YSkudG9TdG10KCkgOlxuICAgICAgICBudWxsO1xuICAgIHJldHVybiBjb21waWxlUmVzdWx0cyhmYWMsIGRlZiwgY2xhc3NNZXRhZGF0YSwgJ8m1Y21wJyk7XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtcyB0aGUgZ2l2ZW4gZGVjb3JhdG9yIHRvIGlubGluZSBleHRlcm5hbCByZXNvdXJjZXMuIGkuZS4gaWYgdGhlIGRlY29yYXRvclxuICAgKiByZXNvbHZlcyB0byBgQENvbXBvbmVudGAsIHRoZSBgdGVtcGxhdGVVcmxgIGFuZCBgc3R5bGVVcmxzYCBtZXRhZGF0YSBmaWVsZHMgd2lsbCBiZVxuICAgKiB0cmFuc2Zvcm1lZCB0byB0aGVpciBzZW1hbnRpY2FsbHktZXF1aXZhbGVudCBpbmxpbmUgdmFyaWFudHMuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgZm9yIHNlcmlhbGl6aW5nIGRlY29yYXRvcnMgaW50byB0aGUgY2xhc3MgbWV0YWRhdGEuIFRoZSBlbWl0dGVkXG4gICAqIGNsYXNzIG1ldGFkYXRhIHNob3VsZCBub3QgcmVmZXIgdG8gZXh0ZXJuYWwgcmVzb3VyY2VzIGFzIHRoaXMgd291bGQgYmUgaW5jb25zaXN0ZW50XG4gICAqIHdpdGggdGhlIGNvbXBvbmVudCBkZWZpbml0aW9ucy9kZWNsYXJhdGlvbnMgd2hpY2ggYWxyZWFkeSBpbmxpbmUgZXh0ZXJuYWwgcmVzb3VyY2VzLlxuICAgKlxuICAgKiBBZGRpdGlvbmFsbHksIHRoZSByZWZlcmVuY2VzIHRvIGV4dGVybmFsIHJlc291cmNlcyB3b3VsZCByZXF1aXJlIGxpYnJhcmllcyB0byBzaGlwXG4gICAqIGV4dGVybmFsIHJlc291cmNlcyBleGNsdXNpdmVseSBmb3IgdGhlIGNsYXNzIG1ldGFkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBfdHJhbnNmb3JtRGVjb3JhdG9yVG9JbmxpbmVSZXNvdXJjZXMoXG4gICAgICBkZWM6IERlY29yYXRvciwgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgc3R5bGVzOiBzdHJpbmdbXSxcbiAgICAgIHRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2UpOiBEZWNvcmF0b3Ige1xuICAgIGlmIChkZWMubmFtZSAhPT0gJ0NvbXBvbmVudCcpIHtcbiAgICAgIHJldHVybiBkZWM7XG4gICAgfVxuXG4gICAgLy8gSWYgbm8gZXh0ZXJuYWwgcmVzb3VyY2VzIGFyZSByZWZlcmVuY2VkLCBwcmVzZXJ2ZSB0aGUgb3JpZ2luYWwgZGVjb3JhdG9yXG4gICAgLy8gZm9yIHRoZSBiZXN0IHNvdXJjZSBtYXAgZXhwZXJpZW5jZSB3aGVuIHRoZSBkZWNvcmF0b3IgaXMgZW1pdHRlZCBpbiBUUy5cbiAgICBpZiAoIWNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykgJiYgIWNvbXBvbmVudC5oYXMoJ3N0eWxlVXJscycpKSB7XG4gICAgICByZXR1cm4gZGVjO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGFkYXRhID0gbmV3IE1hcChjb21wb25lbnQpO1xuXG4gICAgLy8gU2V0IHRoZSBgdGVtcGxhdGVgIHByb3BlcnR5IGlmIHRoZSBgdGVtcGxhdGVVcmxgIHByb3BlcnR5IGlzIHNldC5cbiAgICBpZiAobWV0YWRhdGEuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBtZXRhZGF0YS5kZWxldGUoJ3RlbXBsYXRlVXJsJyk7XG4gICAgICBtZXRhZGF0YS5zZXQoJ3RlbXBsYXRlJywgdHMuY3JlYXRlU3RyaW5nTGl0ZXJhbCh0ZW1wbGF0ZS5jb250ZW50KSk7XG4gICAgfVxuXG4gICAgLy8gU2V0IHRoZSBgc3R5bGVzYCBwcm9wZXJ0eSBpZiB0aGUgYHN0eWxlVXJsc2AgcHJvcGVydHkgaXMgc2V0LlxuICAgIGlmIChtZXRhZGF0YS5oYXMoJ3N0eWxlVXJscycpKSB7XG4gICAgICBtZXRhZGF0YS5kZWxldGUoJ3N0eWxlVXJscycpO1xuICAgICAgbWV0YWRhdGEuc2V0KCdzdHlsZXMnLCB0cy5jcmVhdGVBcnJheUxpdGVyYWwoc3R5bGVzLm1hcChzID0+IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwocykpKSk7XG4gICAgfVxuXG4gICAgLy8gQ29udmVydCB0aGUgbWV0YWRhdGEgdG8gVHlwZVNjcmlwdCBBU1Qgb2JqZWN0IGxpdGVyYWwgZWxlbWVudCBub2Rlcy5cbiAgICBjb25zdCBuZXdNZXRhZGF0YUZpZWxkczogdHMuT2JqZWN0TGl0ZXJhbEVsZW1lbnRMaWtlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgbWV0YWRhdGEuZW50cmllcygpKSB7XG4gICAgICBuZXdNZXRhZGF0YUZpZWxkcy5wdXNoKHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChuYW1lLCB2YWx1ZSkpO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgb3JpZ2luYWwgZGVjb3JhdG9yIHdpdGggdGhlIG92ZXJyaWRkZW4gbWV0YWRhdGEgYXJndW1lbnQuXG4gICAgcmV0dXJuIHsuLi5kZWMsIGFyZ3M6IFt0cy5jcmVhdGVPYmplY3RMaXRlcmFsKG5ld01ldGFkYXRhRmllbGRzKV19O1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgaWYgKHRoaXMubGl0ZXJhbENhY2hlLmhhcyhkZWNvcmF0b3IpKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXRlcmFsQ2FjaGUuZ2V0KGRlY29yYXRvcikhO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQ29tcG9uZW50IGRlY29yYXRvcmApO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSwgYERlY29yYXRvciBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuc2V0KGRlY29yYXRvciwgbWV0YSk7XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlRW51bVZhbHVlKFxuICAgICAgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZW51bVN5bWJvbE5hbWU6IHN0cmluZyk6IG51bWJlcnxudWxsIHtcbiAgICBsZXQgcmVzb2x2ZWQ6IG51bWJlcnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcyhmaWVsZCkpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KGZpZWxkKSE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpIGFzIGFueTtcbiAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVudW1WYWx1ZSAmJiBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlKHZhbHVlLmVudW1SZWYsIGVudW1TeW1ib2xOYW1lKSkge1xuICAgICAgICByZXNvbHZlZCA9IHZhbHVlLnJlc29sdmVkIGFzIG51bWJlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBleHByLCB2YWx1ZSwgYCR7ZmllbGR9IG11c3QgYmUgYSBtZW1iZXIgb2YgJHtlbnVtU3ltYm9sTmFtZX0gZW51bSBmcm9tIEBhbmd1bGFyL2NvcmVgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc29sdmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdENvbXBvbmVudFN0eWxlVXJscyhcbiAgICAgIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICApOiBTdHlsZVVybE1ldGFbXSB7XG4gICAgaWYgKCFjb21wb25lbnQuaGFzKCdzdHlsZVVybHMnKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9leHRyYWN0U3R5bGVVcmxzRnJvbUV4cHJlc3Npb24oY29tcG9uZW50LmdldCgnc3R5bGVVcmxzJykhKTtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RTdHlsZVVybHNGcm9tRXhwcmVzc2lvbihzdHlsZVVybHNFeHByOiB0cy5FeHByZXNzaW9uKTogU3R5bGVVcmxNZXRhW10ge1xuICAgIGNvbnN0IHN0eWxlVXJsczogU3R5bGVVcmxNZXRhW10gPSBbXTtcblxuICAgIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVVcmxzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3Qgc3R5bGVVcmxFeHByIG9mIHN0eWxlVXJsc0V4cHIuZWxlbWVudHMpIHtcbiAgICAgICAgaWYgKHRzLmlzU3ByZWFkRWxlbWVudChzdHlsZVVybEV4cHIpKSB7XG4gICAgICAgICAgc3R5bGVVcmxzLnB1c2goLi4udGhpcy5fZXh0cmFjdFN0eWxlVXJsc0Zyb21FeHByZXNzaW9uKHN0eWxlVXJsRXhwci5leHByZXNzaW9uKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3Qgc3R5bGVVcmwgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShzdHlsZVVybEV4cHIpO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiBzdHlsZVVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3Ioc3R5bGVVcmxFeHByLCBzdHlsZVVybCwgJ3N0eWxlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdHlsZVVybHMucHVzaCh7XG4gICAgICAgICAgICB1cmw6IHN0eWxlVXJsLFxuICAgICAgICAgICAgc291cmNlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcixcbiAgICAgICAgICAgIG5vZGVGb3JFcnJvcjogc3R5bGVVcmxFeHByLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGV2YWx1YXRlZFN0eWxlVXJscyA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHN0eWxlVXJsc0V4cHIpO1xuICAgICAgaWYgKCFpc1N0cmluZ0FycmF5KGV2YWx1YXRlZFN0eWxlVXJscykpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIHN0eWxlVXJsc0V4cHIsIGV2YWx1YXRlZFN0eWxlVXJscywgJ3N0eWxlVXJscyBtdXN0IGJlIGFuIGFycmF5IG9mIHN0cmluZ3MnKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBzdHlsZVVybCBvZiBldmFsdWF0ZWRTdHlsZVVybHMpIHtcbiAgICAgICAgc3R5bGVVcmxzLnB1c2goe1xuICAgICAgICAgIHVybDogc3R5bGVVcmwsXG4gICAgICAgICAgc291cmNlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcixcbiAgICAgICAgICBub2RlRm9yRXJyb3I6IHN0eWxlVXJsc0V4cHIsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdHlsZVVybHM7XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0U3R5bGVSZXNvdXJjZXMoY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6XG4gICAgICBSZWFkb25seVNldDxSZXNvdXJjZT4ge1xuICAgIGNvbnN0IHN0eWxlcyA9IG5ldyBTZXQ8UmVzb3VyY2U+KCk7XG4gICAgZnVuY3Rpb24gc3RyaW5nTGl0ZXJhbEVsZW1lbnRzKGFycmF5OiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uKTogdHMuU3RyaW5nTGl0ZXJhbExpa2VbXSB7XG4gICAgICByZXR1cm4gYXJyYXkuZWxlbWVudHMuZmlsdGVyKFxuICAgICAgICAgIChlOiB0cy5FeHByZXNzaW9uKTogZSBpcyB0cy5TdHJpbmdMaXRlcmFsTGlrZSA9PiB0cy5pc1N0cmluZ0xpdGVyYWxMaWtlKGUpKTtcbiAgICB9XG5cbiAgICAvLyBJZiBzdHlsZVVybHMgaXMgYSBsaXRlcmFsIGFycmF5LCBwcm9jZXNzIGVhY2ggcmVzb3VyY2UgdXJsIGluZGl2aWR1YWxseSBhbmRcbiAgICAvLyByZWdpc3RlciBvbmVzIHRoYXQgYXJlIHN0cmluZyBsaXRlcmFscy5cbiAgICBjb25zdCBzdHlsZVVybHNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVVcmxzJyk7XG4gICAgaWYgKHN0eWxlVXJsc0V4cHIgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVVcmxzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3QgZXhwcmVzc2lvbiBvZiBzdHJpbmdMaXRlcmFsRWxlbWVudHMoc3R5bGVVcmxzRXhwcikpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShleHByZXNzaW9uLnRleHQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgICBzdHlsZXMuYWRkKHtwYXRoOiBhYnNvbHV0ZUZyb20ocmVzb3VyY2VVcmwpLCBleHByZXNzaW9ufSk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIEVycm9ycyBpbiBzdHlsZSByZXNvdXJjZSBleHRyYWN0aW9uIGRvIG5vdCBuZWVkIHRvIGJlIGhhbmRsZWQgaGVyZS4gV2Ugd2lsbCBwcm9kdWNlXG4gICAgICAgICAgLy8gZGlhZ25vc3RpY3MgZm9yIGVhY2ggb25lIHRoYXQgZmFpbHMgaW4gdGhlIGFuYWx5c2lzLCBhZnRlciB3ZSBldmFsdWF0ZSB0aGUgYHN0eWxlVXJsc2BcbiAgICAgICAgICAvLyBleHByZXNzaW9uIHRvIGRldGVybWluZSBfYWxsXyBzdHlsZSByZXNvdXJjZXMsIG5vdCBqdXN0IHRoZSBzdHJpbmcgbGl0ZXJhbHMuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZXNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVzJyk7XG4gICAgaWYgKHN0eWxlc0V4cHIgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3QgZXhwcmVzc2lvbiBvZiBzdHJpbmdMaXRlcmFsRWxlbWVudHMoc3R5bGVzRXhwcikpIHtcbiAgICAgICAgc3R5bGVzLmFkZCh7cGF0aDogbnVsbCwgZXhwcmVzc2lvbn0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdHlsZXM7XG4gIH1cblxuICBwcml2YXRlIF9wcmVsb2FkQW5kUGFyc2VUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICAgICAgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IFByb21pc2U8UGFyc2VkVGVtcGxhdGVXaXRoU291cmNlfG51bGw+IHtcbiAgICBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGVVcmwnKSkge1xuICAgICAgLy8gRXh0cmFjdCB0aGUgdGVtcGxhdGVVcmwgYW5kIHByZWxvYWQgaXQuXG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybEV4cHIsIHRlbXBsYXRlVXJsLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVQcm9taXNlID1cbiAgICAgICAgICAgIHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCwge3R5cGU6ICd0ZW1wbGF0ZScsIGNvbnRhaW5pbmdGaWxlfSk7XG5cbiAgICAgICAgLy8gSWYgdGhlIHByZWxvYWQgd29ya2VkLCB0aGVuIGFjdHVhbGx5IGxvYWQgYW5kIHBhcnNlIHRoZSB0ZW1wbGF0ZSwgYW5kIHdhaXQgZm9yIGFueSBzdHlsZVxuICAgICAgICAvLyBVUkxzIHRvIHJlc29sdmUuXG4gICAgICAgIGlmICh0ZW1wbGF0ZVByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVybiB0ZW1wbGF0ZVByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPVxuICAgICAgICAgICAgICAgIHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgICAgICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyB0aGlzLm1ha2VSZXNvdXJjZU5vdEZvdW5kRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybCwgdGVtcGxhdGVVcmxFeHByLCBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5UZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlRGVjbCA9IHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRlbXBsYXRlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RUZW1wbGF0ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCB0ZW1wbGF0ZTogVGVtcGxhdGVEZWNsYXJhdGlvbik6XG4gICAgICBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2Uge1xuICAgIGlmICh0ZW1wbGF0ZS5pc0lubGluZSkge1xuICAgICAgbGV0IHNvdXJjZVN0cjogc3RyaW5nO1xuICAgICAgbGV0IHNvdXJjZVBhcnNlUmFuZ2U6IExleGVyUmFuZ2V8bnVsbCA9IG51bGw7XG4gICAgICBsZXQgdGVtcGxhdGVDb250ZW50OiBzdHJpbmc7XG4gICAgICBsZXQgc291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuICAgICAgbGV0IGVzY2FwZWRTdHJpbmcgPSBmYWxzZTtcbiAgICAgIGxldCBzb3VyY2VNYXBVcmw6IHN0cmluZ3xudWxsO1xuICAgICAgLy8gV2Ugb25seSBzdXBwb3J0IFNvdXJjZU1hcHMgZm9yIGlubGluZSB0ZW1wbGF0ZXMgdGhhdCBhcmUgc2ltcGxlIHN0cmluZyBsaXRlcmFscy5cbiAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwodGVtcGxhdGUuZXhwcmVzc2lvbikgfHxcbiAgICAgICAgICB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKHRlbXBsYXRlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIC8vIHRoZSBzdGFydCBhbmQgZW5kIG9mIHRoZSBgdGVtcGxhdGVFeHByYCBub2RlIGluY2x1ZGVzIHRoZSBxdW90YXRpb24gbWFya3MsIHdoaWNoIHdlIG11c3RcbiAgICAgICAgLy8gc3RyaXBcbiAgICAgICAgc291cmNlUGFyc2VSYW5nZSA9IGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGUuZXhwcmVzc2lvbik7XG4gICAgICAgIHNvdXJjZVN0ciA9IHRlbXBsYXRlLmV4cHJlc3Npb24uZ2V0U291cmNlRmlsZSgpLnRleHQ7XG4gICAgICAgIHRlbXBsYXRlQ29udGVudCA9IHRlbXBsYXRlLmV4cHJlc3Npb24udGV4dDtcbiAgICAgICAgZXNjYXBlZFN0cmluZyA9IHRydWU7XG4gICAgICAgIHNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgICAgdHlwZTogJ2RpcmVjdCcsXG4gICAgICAgICAgbm9kZTogdGVtcGxhdGUuZXhwcmVzc2lvbixcbiAgICAgICAgfTtcbiAgICAgICAgc291cmNlTWFwVXJsID0gdGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkVGVtcGxhdGUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZS5leHByZXNzaW9uKTtcbiAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZFRlbXBsYXRlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIHRlbXBsYXRlLmV4cHJlc3Npb24sIHJlc29sdmVkVGVtcGxhdGUsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgZG8gbm90IHBhcnNlIHRoZSB0ZW1wbGF0ZSBkaXJlY3RseSBmcm9tIHRoZSBzb3VyY2UgZmlsZSB1c2luZyBhIGxleGVyIHJhbmdlLCBzb1xuICAgICAgICAvLyB0aGUgdGVtcGxhdGUgc291cmNlIGFuZCBjb250ZW50IGFyZSBzZXQgdG8gdGhlIHN0YXRpY2FsbHkgcmVzb2x2ZWQgdGVtcGxhdGUuXG4gICAgICAgIHNvdXJjZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgICAgIHRlbXBsYXRlQ29udGVudCA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgICAgIHNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgICAgdHlwZTogJ2luZGlyZWN0JyxcbiAgICAgICAgICBub2RlOiB0ZW1wbGF0ZS5leHByZXNzaW9uLFxuICAgICAgICAgIGNvbXBvbmVudENsYXNzOiBub2RlLFxuICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZUNvbnRlbnQsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW5kaXJlY3QgdGVtcGxhdGVzIGNhbm5vdCBiZSBtYXBwZWQgdG8gYSBwYXJ0aWN1bGFyIGJ5dGUgcmFuZ2Ugb2YgYW55IGlucHV0IGZpbGUsIHNpbmNlXG4gICAgICAgIC8vIHRoZXkncmUgY29tcHV0ZWQgYnkgZXhwcmVzc2lvbnMgdGhhdCBtYXkgc3BhbiBtYW55IGZpbGVzLiBEb24ndCBhdHRlbXB0IHRvIG1hcCB0aGVtIGJhY2tcbiAgICAgICAgLy8gdG8gYSBnaXZlbiBmaWxlLlxuICAgICAgICBzb3VyY2VNYXBVcmwgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi50aGlzLl9wYXJzZVRlbXBsYXRlKHRlbXBsYXRlLCBzb3VyY2VTdHIsIHNvdXJjZVBhcnNlUmFuZ2UsIGVzY2FwZWRTdHJpbmcsIHNvdXJjZU1hcFVybCksXG4gICAgICAgIGNvbnRlbnQ6IHRlbXBsYXRlQ29udGVudCxcbiAgICAgICAgc291cmNlTWFwcGluZyxcbiAgICAgICAgZGVjbGFyYXRpb246IHRlbXBsYXRlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGVDb250ZW50ID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHRlbXBsYXRlLnJlc29sdmVkVGVtcGxhdGVVcmwpO1xuICAgICAgaWYgKHRoaXMuZGVwVHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmRlcFRyYWNrZXIuYWRkUmVzb3VyY2VEZXBlbmRlbmN5KFxuICAgICAgICAgICAgbm9kZS5nZXRTb3VyY2VGaWxlKCksIGFic29sdXRlRnJvbSh0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLnRoaXMuX3BhcnNlVGVtcGxhdGUoXG4gICAgICAgICAgICB0ZW1wbGF0ZSwgLyogc291cmNlU3RyICovIHRlbXBsYXRlQ29udGVudCwgLyogc291cmNlUGFyc2VSYW5nZSAqLyBudWxsLFxuICAgICAgICAgICAgLyogZXNjYXBlZFN0cmluZyAqLyBmYWxzZSxcbiAgICAgICAgICAgIC8qIHNvdXJjZU1hcFVybCAqLyB0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsKSxcbiAgICAgICAgY29udGVudDogdGVtcGxhdGVDb250ZW50LFxuICAgICAgICBzb3VyY2VNYXBwaW5nOiB7XG4gICAgICAgICAgdHlwZTogJ2V4dGVybmFsJyxcbiAgICAgICAgICBjb21wb25lbnRDbGFzczogbm9kZSxcbiAgICAgICAgICAvLyBUT0RPKGFseGh1Yik6IFRTIGluIGczIGlzIHVuYWJsZSB0byBtYWtlIHRoaXMgaW5mZXJlbmNlIG9uIGl0cyBvd24sIHNvIGNhc3QgaXQgaGVyZVxuICAgICAgICAgIC8vIHVudGlsIGczIGlzIGFibGUgdG8gZmlndXJlIHRoaXMgb3V0LlxuICAgICAgICAgIG5vZGU6ICh0ZW1wbGF0ZSBhcyBFeHRlcm5hbFRlbXBsYXRlRGVjbGFyYXRpb24pLnRlbXBsYXRlVXJsRXhwcmVzc2lvbixcbiAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVDb250ZW50LFxuICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsLFxuICAgICAgICB9LFxuICAgICAgICBkZWNsYXJhdGlvbjogdGVtcGxhdGUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3BhcnNlVGVtcGxhdGUoXG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGVEZWNsYXJhdGlvbiwgc291cmNlU3RyOiBzdHJpbmcsIHNvdXJjZVBhcnNlUmFuZ2U6IExleGVyUmFuZ2V8bnVsbCxcbiAgICAgIGVzY2FwZWRTdHJpbmc6IGJvb2xlYW4sIHNvdXJjZU1hcFVybDogc3RyaW5nfG51bGwpOiBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSB7XG4gICAgLy8gV2UgYWx3YXlzIG5vcm1hbGl6ZSBsaW5lIGVuZGluZ3MgaWYgdGhlIHRlbXBsYXRlIGhhcyBiZWVuIGVzY2FwZWQgKGkuZS4gaXMgaW5saW5lKS5cbiAgICBjb25zdCBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgPSBlc2NhcGVkU3RyaW5nIHx8IHRoaXMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzO1xuXG4gICAgY29uc3QgcGFyc2VkVGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKHNvdXJjZVN0ciwgc291cmNlTWFwVXJsID8/ICcnLCB7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0ZW1wbGF0ZS5wcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZzogdGVtcGxhdGUuaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgIHJhbmdlOiBzb3VyY2VQYXJzZVJhbmdlID8/IHVuZGVmaW5lZCxcbiAgICAgIGVzY2FwZWRTdHJpbmcsXG4gICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiB0aGlzLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMsXG4gICAgICBhbHdheXNBdHRlbXB0SHRtbFRvUjNBc3RDb252ZXJzaW9uOiB0aGlzLnVzZVBvaXNvbmVkRGF0YSxcbiAgICB9KTtcblxuICAgIC8vIFVuZm9ydHVuYXRlbHksIHRoZSBwcmltYXJ5IHBhcnNlIG9mIHRoZSB0ZW1wbGF0ZSBhYm92ZSBtYXkgbm90IGNvbnRhaW4gYWNjdXJhdGUgc291cmNlIG1hcFxuICAgIC8vIGluZm9ybWF0aW9uLiBJZiB1c2VkIGRpcmVjdGx5LCBpdCB3b3VsZCByZXN1bHQgaW4gaW5jb3JyZWN0IGNvZGUgbG9jYXRpb25zIGluIHRlbXBsYXRlXG4gICAgLy8gZXJyb3JzLCBldGMuIFRoZXJlIGFyZSB0aHJlZSBtYWluIHByb2JsZW1zOlxuICAgIC8vXG4gICAgLy8gMS4gYHByZXNlcnZlV2hpdGVzcGFjZXM6IGZhbHNlYCBhbm5paGlsYXRlcyB0aGUgY29ycmVjdG5lc3Mgb2YgdGVtcGxhdGUgc291cmNlIG1hcHBpbmcsIGFzXG4gICAgLy8gICAgdGhlIHdoaXRlc3BhY2UgdHJhbnNmb3JtYXRpb24gY2hhbmdlcyB0aGUgY29udGVudHMgb2YgSFRNTCB0ZXh0IG5vZGVzIGJlZm9yZSB0aGV5J3JlXG4gICAgLy8gICAgcGFyc2VkIGludG8gQW5ndWxhciBleHByZXNzaW9ucy5cbiAgICAvLyAyLiBgcHJlc2VydmVMaW5lRW5kaW5nczogZmFsc2VgIGNhdXNlcyBncm93aW5nIG1pc2FsaWdubWVudHMgaW4gdGVtcGxhdGVzIHRoYXQgdXNlICdcXHJcXG4nXG4gICAgLy8gICAgbGluZSBlbmRpbmdzLCBieSBub3JtYWxpemluZyB0aGVtIHRvICdcXG4nLlxuICAgIC8vIDMuIEJ5IGRlZmF1bHQsIHRoZSB0ZW1wbGF0ZSBwYXJzZXIgc3RyaXBzIGxlYWRpbmcgdHJpdmlhIGNoYXJhY3RlcnMgKGxpa2Ugc3BhY2VzLCB0YWJzLCBhbmRcbiAgICAvLyAgICBuZXdsaW5lcykuIFRoaXMgYWxzbyBkZXN0cm95cyBzb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbi5cbiAgICAvL1xuICAgIC8vIEluIG9yZGVyIHRvIGd1YXJhbnRlZSB0aGUgY29ycmVjdG5lc3Mgb2YgZGlhZ25vc3RpY3MsIHRlbXBsYXRlcyBhcmUgcGFyc2VkIGEgc2Vjb25kIHRpbWVcbiAgICAvLyB3aXRoIHRoZSBhYm92ZSBvcHRpb25zIHNldCB0byBwcmVzZXJ2ZSBzb3VyY2UgbWFwcGluZ3MuXG5cbiAgICBjb25zdCB7bm9kZXM6IGRpYWdOb2Rlc30gPSBwYXJzZVRlbXBsYXRlKHNvdXJjZVN0ciwgc291cmNlTWFwVXJsID8/ICcnLCB7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgcHJlc2VydmVMaW5lRW5kaW5nczogdHJ1ZSxcbiAgICAgIGludGVycG9sYXRpb25Db25maWc6IHRlbXBsYXRlLmludGVycG9sYXRpb25Db25maWcsXG4gICAgICByYW5nZTogc291cmNlUGFyc2VSYW5nZSA/PyB1bmRlZmluZWQsXG4gICAgICBlc2NhcGVkU3RyaW5nLFxuICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogdGhpcy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgICAgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICAgIGFsd2F5c0F0dGVtcHRIdG1sVG9SM0FzdENvbnZlcnNpb246IHRoaXMudXNlUG9pc29uZWREYXRhLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnBhcnNlZFRlbXBsYXRlLFxuICAgICAgZGlhZ05vZGVzLFxuICAgICAgZmlsZTogbmV3IFBhcnNlU291cmNlRmlsZShzb3VyY2VTdHIsIHNvdXJjZU1hcFVybCA/PyAnJyksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKFxuICAgICAgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICBjb250YWluaW5nRmlsZTogc3RyaW5nKTogVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gICAgbGV0IHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4gPSB0aGlzLmRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHZhbHVlLCAncHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IGJlIGEgYm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyA9IHZhbHVlO1xuICAgIH1cblxuICAgIGxldCBpbnRlcnBvbGF0aW9uQ29uZmlnID0gREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRztcbiAgICBpZiAoY29tcG9uZW50LmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgnaW50ZXJwb2xhdGlvbicpITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlLmxlbmd0aCAhPT0gMiB8fFxuICAgICAgICAgICF2YWx1ZS5ldmVyeShlbGVtZW50ID0+IHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGV4cHIsIHZhbHVlLCAnaW50ZXJwb2xhdGlvbiBtdXN0IGJlIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cyBvZiBzdHJpbmcgdHlwZScpO1xuICAgICAgfVxuICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyA9IEludGVycG9sYXRpb25Db25maWcuZnJvbUFycmF5KHZhbHVlIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xuICAgIH1cblxuICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybEV4cHIsIHRlbXBsYXRlVXJsLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpc0lubGluZTogZmFsc2UsXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICAgIHRlbXBsYXRlVXJsLFxuICAgICAgICAgIHRlbXBsYXRlVXJsRXhwcmVzc2lvbjogdGVtcGxhdGVVcmxFeHByLFxuICAgICAgICAgIHJlc29sdmVkVGVtcGxhdGVVcmw6IHJlc291cmNlVXJsLFxuICAgICAgICB9O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyB0aGlzLm1ha2VSZXNvdXJjZU5vdEZvdW5kRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybCwgdGVtcGxhdGVVcmxFeHByLCBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5UZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc0lubGluZTogdHJ1ZSxcbiAgICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyxcbiAgICAgICAgZXhwcmVzc2lvbjogY29tcG9uZW50LmdldCgndGVtcGxhdGUnKSEsXG4gICAgICAgIHRlbXBsYXRlVXJsOiBjb250YWluaW5nRmlsZSxcbiAgICAgICAgcmVzb2x2ZWRUZW1wbGF0ZVVybDogY29udGFpbmluZ0ZpbGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9NSVNTSU5HX1RFTVBMQVRFLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgJ2NvbXBvbmVudCBpcyBtaXNzaW5nIGEgdGVtcGxhdGUnKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlSW1wb3J0ZWRGaWxlKGltcG9ydGVkRmlsZTogSW1wb3J0ZWRGaWxlLCBleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICAvLyBJZiBgaW1wb3J0ZWRGaWxlYCBpcyBub3QgJ3Vua25vd24nIHRoZW4gaXQgYWNjdXJhdGVseSByZWZsZWN0cyB0aGUgc291cmNlIGZpbGUgdGhhdCBpc1xuICAgIC8vIGJlaW5nIGltcG9ydGVkLlxuICAgIGlmIChpbXBvcnRlZEZpbGUgIT09ICd1bmtub3duJykge1xuICAgICAgcmV0dXJuIGltcG9ydGVkRmlsZTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgYGV4cHJgIGhhcyB0byBiZSBpbnNwZWN0ZWQgdG8gZGV0ZXJtaW5lIHRoZSBmaWxlIHRoYXQgaXMgYmVpbmcgaW1wb3J0ZWQuIElmIGBleHByYFxuICAgIC8vIGlzIG5vdCBhbiBgRXh0ZXJuYWxFeHByYCB0aGVuIGl0IGRvZXMgbm90IGNvcnJlc3BvbmQgd2l0aCBhbiBpbXBvcnQsIHNvIHJldHVybiBudWxsIGluIHRoYXRcbiAgICAvLyBjYXNlLlxuICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBGaWd1cmUgb3V0IHdoYXQgZmlsZSBpcyBiZWluZyBpbXBvcnRlZC5cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlKGV4cHIudmFsdWUubW9kdWxlTmFtZSEsIG9yaWdpbi5maWxlTmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhZGRpbmcgYW4gaW1wb3J0IGZyb20gYG9yaWdpbmAgdG8gdGhlIHNvdXJjZS1maWxlIGNvcnJlc3BvbmRpbmcgdG8gYGV4cHJgIHdvdWxkXG4gICAqIGNyZWF0ZSBhIGN5Y2xpYyBpbXBvcnQuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgYEN5Y2xlYCBvYmplY3QgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLCBvdGhlcndpc2UgYG51bGxgLlxuICAgKi9cbiAgcHJpdmF0ZSBfY2hlY2tGb3JDeWNsaWNJbXBvcnQoXG4gICAgICBpbXBvcnRlZEZpbGU6IEltcG9ydGVkRmlsZSwgZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogQ3ljbGV8bnVsbCB7XG4gICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLl9yZXNvbHZlSW1wb3J0ZWRGaWxlKGltcG9ydGVkRmlsZSwgZXhwciwgb3JpZ2luKTtcbiAgICBpZiAoaW1wb3J0ZWQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSBpbXBvcnQgaXMgbGVnYWwuXG4gICAgcmV0dXJuIHRoaXMuY3ljbGVBbmFseXplci53b3VsZENyZWF0ZUN5Y2xlKG9yaWdpbiwgaW1wb3J0ZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVjb3JkU3ludGhldGljSW1wb3J0KFxuICAgICAgaW1wb3J0ZWRGaWxlOiBJbXBvcnRlZEZpbGUsIGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGltcG9ydGVkID0gdGhpcy5fcmVzb2x2ZUltcG9ydGVkRmlsZShpbXBvcnRlZEZpbGUsIGV4cHIsIG9yaWdpbik7XG4gICAgaWYgKGltcG9ydGVkID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jeWNsZUFuYWx5emVyLnJlY29yZFN5bnRoZXRpY0ltcG9ydChvcmlnaW4sIGltcG9ydGVkKTtcbiAgfVxuXG4gIHByaXZhdGUgbWFrZVJlc291cmNlTm90Rm91bmRFcnJvcihcbiAgICAgIGZpbGU6IHN0cmluZywgbm9kZUZvckVycm9yOiB0cy5Ob2RlLFxuICAgICAgcmVzb3VyY2VUeXBlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcyk6IEZhdGFsRGlhZ25vc3RpY0Vycm9yIHtcbiAgICBsZXQgZXJyb3JUZXh0OiBzdHJpbmc7XG4gICAgc3dpdGNoIChyZXNvdXJjZVR5cGUpIHtcbiAgICAgIGNhc2UgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuVGVtcGxhdGU6XG4gICAgICAgIGVycm9yVGV4dCA9IGBDb3VsZCBub3QgZmluZCB0ZW1wbGF0ZSBmaWxlICcke2ZpbGV9Jy5gO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZTpcbiAgICAgICAgZXJyb3JUZXh0ID0gYENvdWxkIG5vdCBmaW5kIHN0eWxlc2hlZXQgZmlsZSAnJHtmaWxlfScgbGlua2VkIGZyb20gdGhlIHRlbXBsYXRlLmA7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcjpcbiAgICAgICAgZXJyb3JUZXh0ID0gYENvdWxkIG5vdCBmaW5kIHN0eWxlc2hlZXQgZmlsZSAnJHtmaWxlfScuYDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9SRVNPVVJDRV9OT1RfRk9VTkQsIG5vZGVGb3JFcnJvciwgZXJyb3JUZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RUZW1wbGF0ZVN0eWxlVXJscyh0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlKTogU3R5bGVVcmxNZXRhW10ge1xuICAgIGlmICh0ZW1wbGF0ZS5zdHlsZVVybHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlRm9yRXJyb3IgPSBnZXRUZW1wbGF0ZURlY2xhcmF0aW9uTm9kZUZvckVycm9yKHRlbXBsYXRlLmRlY2xhcmF0aW9uKTtcbiAgICByZXR1cm4gdGVtcGxhdGUuc3R5bGVVcmxzLm1hcChcbiAgICAgICAgdXJsID0+ICh7dXJsLCBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGUsIG5vZGVGb3JFcnJvcn0pKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZVJhbmdlKHRlbXBsYXRlRXhwcjogdHMuRXhwcmVzc2lvbikge1xuICBjb25zdCBzdGFydFBvcyA9IHRlbXBsYXRlRXhwci5nZXRTdGFydCgpICsgMTtcbiAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPVxuICAgICAgdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24odGVtcGxhdGVFeHByLmdldFNvdXJjZUZpbGUoKSwgc3RhcnRQb3MpO1xuICByZXR1cm4ge1xuICAgIHN0YXJ0UG9zLFxuICAgIHN0YXJ0TGluZTogbGluZSxcbiAgICBzdGFydENvbDogY2hhcmFjdGVyLFxuICAgIGVuZFBvczogdGVtcGxhdGVFeHByLmdldEVuZCgpIC0gMSxcbiAgfTtcbn1cblxuLyoqIERldGVybWluZXMgaWYgdGhlIHJlc3VsdCBvZiBhbiBldmFsdWF0aW9uIGlzIGEgc3RyaW5nIGFycmF5LiAqL1xuZnVuY3Rpb24gaXNTdHJpbmdBcnJheShyZXNvbHZlZFZhbHVlOiBSZXNvbHZlZFZhbHVlKTogcmVzb2x2ZWRWYWx1ZSBpcyBzdHJpbmdbXSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHJlc29sdmVkVmFsdWUpICYmIHJlc29sdmVkVmFsdWUuZXZlcnkoZWxlbSA9PiB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycpO1xufVxuXG4vKiogRGV0ZXJtaW5lcyB0aGUgbm9kZSB0byB1c2UgZm9yIGRlYnVnZ2luZyBwdXJwb3NlcyBmb3IgdGhlIGdpdmVuIFRlbXBsYXRlRGVjbGFyYXRpb24uICovXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZURlY2xhcmF0aW9uTm9kZUZvckVycm9yKGRlY2xhcmF0aW9uOiBUZW1wbGF0ZURlY2xhcmF0aW9uKTogdHMuTm9kZSB7XG4gIC8vIFRPRE8oemFyZW5kKTogQ2hhbmdlIHRoaXMgdG8gaWYvZWxzZSB3aGVuIHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIGczLiBUaGlzIHVzZXMgYSBzd2l0Y2hcbiAgLy8gYmVjYXVzZSBpZi9lbHNlIGZhaWxzIHRvIGNvbXBpbGUgb24gZzMuIFRoYXQgaXMgYmVjYXVzZSBnMyBjb21waWxlcyB0aGlzIGluIG5vbi1zdHJpY3QgbW9kZVxuICAvLyB3aGVyZSB0eXBlIGluZmVyZW5jZSBkb2VzIG5vdCB3b3JrIGNvcnJlY3RseS5cbiAgc3dpdGNoIChkZWNsYXJhdGlvbi5pc0lubGluZSkge1xuICAgIGNhc2UgdHJ1ZTpcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbi5leHByZXNzaW9uO1xuICAgIGNhc2UgZmFsc2U6XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb24udGVtcGxhdGVVcmxFeHByZXNzaW9uO1xuICB9XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRlbXBsYXRlIHdoaWNoIHdhcyBleHRyYWN0ZWQgZHVyaW5nIHBhcnNpbmcuXG4gKlxuICogVGhpcyBjb250YWlucyB0aGUgYWN0dWFsIHBhcnNlZCB0ZW1wbGF0ZSBhcyB3ZWxsIGFzIGFueSBtZXRhZGF0YSBjb2xsZWN0ZWQgZHVyaW5nIGl0cyBwYXJzaW5nLFxuICogc29tZSBvZiB3aGljaCBtaWdodCBiZSB1c2VmdWwgZm9yIHJlLXBhcnNpbmcgdGhlIHRlbXBsYXRlIHdpdGggZGlmZmVyZW50IG9wdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkQ29tcG9uZW50VGVtcGxhdGUgZXh0ZW5kcyBQYXJzZWRUZW1wbGF0ZSB7XG4gIC8qKlxuICAgKiBUaGUgdGVtcGxhdGUgQVNULCBwYXJzZWQgaW4gYSBtYW5uZXIgd2hpY2ggcHJlc2VydmVzIHNvdXJjZSBtYXAgaW5mb3JtYXRpb24gZm9yIGRpYWdub3N0aWNzLlxuICAgKlxuICAgKiBOb3QgdXNlZnVsIGZvciBlbWl0LlxuICAgKi9cbiAgZGlhZ05vZGVzOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBUaGUgYFBhcnNlU291cmNlRmlsZWAgZm9yIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIGZpbGU6IFBhcnNlU291cmNlRmlsZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2UgZXh0ZW5kcyBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSB7XG4gIC8qKiBUaGUgc3RyaW5nIGNvbnRlbnRzIG9mIHRoZSB0ZW1wbGF0ZS4gKi9cbiAgY29udGVudDogc3RyaW5nO1xuICBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gIGRlY2xhcmF0aW9uOiBUZW1wbGF0ZURlY2xhcmF0aW9uO1xufVxuXG4vKipcbiAqIENvbW1vbiBmaWVsZHMgZXh0cmFjdGVkIGZyb20gdGhlIGRlY2xhcmF0aW9uIG9mIGEgdGVtcGxhdGUuXG4gKi9cbmludGVyZmFjZSBDb21tb25UZW1wbGF0ZURlY2xhcmF0aW9uIHtcbiAgcHJlc2VydmVXaGl0ZXNwYWNlczogYm9vbGVhbjtcbiAgaW50ZXJwb2xhdGlvbkNvbmZpZzogSW50ZXJwb2xhdGlvbkNvbmZpZztcbiAgdGVtcGxhdGVVcmw6IHN0cmluZztcbiAgcmVzb2x2ZWRUZW1wbGF0ZVVybDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNsYXJhdGlvbiBvZiBhbiBpbmxpbmUgdGVtcGxhdGUuXG4gKi9cbmludGVyZmFjZSBJbmxpbmVUZW1wbGF0ZURlY2xhcmF0aW9uIGV4dGVuZHMgQ29tbW9uVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gIGlzSW5saW5lOiB0cnVlO1xuICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNsYXJhdGlvbiBvZiBhbiBleHRlcm5hbCB0ZW1wbGF0ZS5cbiAqL1xuaW50ZXJmYWNlIEV4dGVybmFsVGVtcGxhdGVEZWNsYXJhdGlvbiBleHRlbmRzIENvbW1vblRlbXBsYXRlRGVjbGFyYXRpb24ge1xuICBpc0lubGluZTogZmFsc2U7XG4gIHRlbXBsYXRlVXJsRXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcbn1cblxuLyoqXG4gKiBUaGUgZGVjbGFyYXRpb24gb2YgYSB0ZW1wbGF0ZSBleHRyYWN0ZWQgZnJvbSBhIGNvbXBvbmVudCBkZWNvcmF0b3IuXG4gKlxuICogVGhpcyBkYXRhIGlzIGV4dHJhY3RlZCBhbmQgc3RvcmVkIHNlcGFyYXRlbHkgdG8gZmFjaWxpdGF0ZSByZS1pbnRlcnByZXRpbmcgdGhlIHRlbXBsYXRlXG4gKiBkZWNsYXJhdGlvbiB3aGVuZXZlciB0aGUgY29tcGlsZXIgaXMgbm90aWZpZWQgb2YgYSBjaGFuZ2UgdG8gYSB0ZW1wbGF0ZSBmaWxlLiBXaXRoIHRoaXNcbiAqIGluZm9ybWF0aW9uLCBgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcmAgaXMgYWJsZSB0byByZS1yZWFkIHRoZSB0ZW1wbGF0ZSBhbmQgdXBkYXRlIHRoZSBjb21wb25lbnRcbiAqIHJlY29yZCB3aXRob3V0IG5lZWRpbmcgdG8gcGFyc2UgdGhlIG9yaWdpbmFsIGRlY29yYXRvciBhZ2Fpbi5cbiAqL1xudHlwZSBUZW1wbGF0ZURlY2xhcmF0aW9uID0gSW5saW5lVGVtcGxhdGVEZWNsYXJhdGlvbnxFeHRlcm5hbFRlbXBsYXRlRGVjbGFyYXRpb247XG5cbi8qKlxuICogR2VuZXJhdGUgYSBkaWFnbm9zdGljIHJlbGF0ZWQgaW5mb3JtYXRpb24gb2JqZWN0IHRoYXQgZGVzY3JpYmVzIGEgcG90ZW50aWFsIGN5Y2xpYyBpbXBvcnQgcGF0aC5cbiAqL1xuZnVuY3Rpb24gbWFrZUN5Y2xpY0ltcG9ydEluZm8oXG4gICAgcmVmOiBSZWZlcmVuY2UsIHR5cGU6IHN0cmluZywgY3ljbGU6IEN5Y2xlKTogdHMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbiB7XG4gIGNvbnN0IG5hbWUgPSByZWYuZGVidWdOYW1lIHx8ICcodW5rbm93biknO1xuICBjb25zdCBwYXRoID0gY3ljbGUuZ2V0UGF0aCgpLm1hcChzZiA9PiBzZi5maWxlTmFtZSkuam9pbignIC0+ICcpO1xuICBjb25zdCBtZXNzYWdlID1cbiAgICAgIGBUaGUgJHt0eXBlfSAnJHtuYW1lfScgaXMgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYnV0IGltcG9ydGluZyBpdCB3b3VsZCBjcmVhdGUgYSBjeWNsZTogYDtcbiAgcmV0dXJuIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24ocmVmLm5vZGUsIG1lc3NhZ2UgKyBwYXRoKTtcbn1cblxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgc2VsZWN0b3IgaXMgYSB2YWxpZCBjdXN0b20gZWxlbWVudCB0YWcgbmFtZS5cbiAqIEJhc2VkIGxvb3NlbHkgb24gaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy92YWxpZGF0ZS1lbGVtZW50LW5hbWUuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrQ3VzdG9tRWxlbWVudFNlbGVjdG9yRm9yRXJyb3JzKHNlbGVjdG9yOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gIC8vIEF2b2lkIGZsYWdnaW5nIGNvbXBvbmVudHMgd2l0aCBhbiBhdHRyaWJ1dGUgb3IgY2xhc3Mgc2VsZWN0b3IuIFRoaXMgaXNuJ3QgYnVsbGV0cHJvb2Ygc2luY2UgaXRcbiAgLy8gd29uJ3QgY2F0Y2ggY2FzZXMgbGlrZSBgZm9vW11iYXJgLCBidXQgd2UgZG9uJ3QgbmVlZCBpdCB0byBiZS4gVGhpcyBpcyBtYWlubHkgdG8gYXZvaWQgZmxhZ2dpbmdcbiAgLy8gc29tZXRoaW5nIGxpa2UgYGZvby1iYXJbYmF6XWAgaW5jb3JyZWN0bHkuXG4gIGlmIChzZWxlY3Rvci5pbmNsdWRlcygnLicpIHx8IChzZWxlY3Rvci5pbmNsdWRlcygnWycpICYmIHNlbGVjdG9yLmluY2x1ZGVzKCddJykpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoISgvXlthLXpdLy50ZXN0KHNlbGVjdG9yKSkpIHtcbiAgICByZXR1cm4gJ1NlbGVjdG9yIG9mIGEgU2hhZG93RG9tLWVuY2Fwc3VsYXRlZCBjb21wb25lbnQgbXVzdCBzdGFydCB3aXRoIGEgbG93ZXIgY2FzZSBsZXR0ZXIuJztcbiAgfVxuXG4gIGlmICgvW0EtWl0vLnRlc3Qoc2VsZWN0b3IpKSB7XG4gICAgcmV0dXJuICdTZWxlY3RvciBvZiBhIFNoYWRvd0RvbS1lbmNhcHN1bGF0ZWQgY29tcG9uZW50IG11c3QgYWxsIGJlIGluIGxvd2VyIGNhc2UuJztcbiAgfVxuXG4gIGlmICghc2VsZWN0b3IuaW5jbHVkZXMoJy0nKSkge1xuICAgIHJldHVybiAnU2VsZWN0b3Igb2YgYSBjb21wb25lbnQgdGhhdCB1c2VzIFZpZXdFbmNhcHN1bGF0aW9uLlNoYWRvd0RvbSBtdXN0IGNvbnRhaW4gYSBoeXBoZW4uJztcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuIl19