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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ComponentDecoratorHandler = exports.ComponentSymbol = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var semantic_graph_1 = require("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var ts_source_map_bug_29300_1 = require("@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300");
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
            var isSymbolAffected = function (current, previous) {
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
                !semantic_graph_1.isArrayEqual(this.usedDirectives, previousSymbol.usedDirectives, isSymbolAffected) ||
                !semantic_graph_1.isArrayEqual(this.usedPipes, previousSymbol.usedPipes, isSymbolAffected);
        };
        return ComponentSymbol;
    }(directive_1.DirectiveSymbol));
    exports.ComponentSymbol = ComponentSymbol;
    /**
     * `DecoratorHandler` which handles the `@Component` annotation.
     */
    var ComponentDecoratorHandler = /** @class */ (function () {
        function ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds, enableI18nLegacyMessageIdFormat, usePoisonedData, i18nNormalizeLineEndingsInICUs, moduleResolver, cycleAnalyzer, cycleHandlingStrategy, refEmitter, defaultImportRecorder, depTracker, injectableRegistry, semanticDepGraphUpdater, annotateForClosureCompiler) {
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
            this.defaultImportRecorder = defaultImportRecorder;
            this.depTracker = depTracker;
            this.injectableRegistry = injectableRegistry;
            this.semanticDepGraphUpdater = semanticDepGraphUpdater;
            this.annotateForClosureCompiler = annotateForClosureCompiler;
            this.literalCache = new Map();
            this.elementSchemaRegistry = new compiler_1.DomElementSchemaRegistry();
            /**
             * During the asynchronous preanalyze phase, it's necessary to parse the template to extract
             * any potential <link> tags which might need to be loaded. This cache ensures that work is not
             * thrown away, and the parsed template is reused during the analyze phase.
             */
            this.preanalyzeTemplateCache = new Map();
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
            var resolveStyleUrl = function (styleUrl, nodeForError, resourceType) {
                var resourceUrl = _this._resolveResourceOrThrow(styleUrl, containingFile, nodeForError, resourceType);
                return _this.resourceLoader.preload(resourceUrl);
            };
            // A Promise that waits for the template and all <link>ed styles within it to be preloaded.
            var templateAndTemplateStyleResources = this._preloadAndParseTemplate(node, decorator, component, containingFile)
                .then(function (template) {
                if (template === null) {
                    return undefined;
                }
                var nodeForError = getTemplateDeclarationNodeForError(template.declaration);
                return Promise
                    .all(template.styleUrls.map(function (styleUrl) { return resolveStyleUrl(styleUrl, nodeForError, 1 /* StylesheetFromTemplate */); }))
                    .then(function () { return undefined; });
            });
            // Extract all the styleUrls in the decorator.
            var componentStyleUrls = this._extractComponentStyleUrls(component);
            if (componentStyleUrls === null) {
                // A fast path exists if there are no styleUrls, to just wait for
                // templateAndTemplateStyleResources.
                return templateAndTemplateStyleResources;
            }
            else {
                // Wait for both the template and all styleUrl resources to resolve.
                return Promise
                    .all(tslib_1.__spread([
                    templateAndTemplateStyleResources
                ], componentStyleUrls.map(function (styleUrl) { return resolveStyleUrl(styleUrl.url, styleUrl.nodeForError, 2 /* StylesheetFromDecorator */); })))
                    .then(function () { return undefined; });
            }
        };
        ComponentDecoratorHandler.prototype.analyze = function (node, decorator, flags) {
            var e_1, _a;
            var _b;
            if (flags === void 0) { flags = transform_1.HandlerFlags.NONE; }
            var containingFile = node.getSourceFile().fileName;
            this.literalCache.delete(decorator);
            // @Component inherits @Directive, so begin by extracting the @Directive metadata and building
            // on it.
            var directiveResult = directive_1.extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.defaultImportRecorder, this.isCore, flags, this.annotateForClosureCompiler, this.elementSchemaRegistry.getDefaultComponentElementName());
            if (directiveResult === undefined) {
                // `extractDirectiveMetadata` returns undefined when the @Directive has `jit: true`. In this
                // case, compilation of the decorator is skipped. Returning an empty object signifies
                // that no analysis was produced.
                return {};
            }
            // Next, read the `@Component`-specific fields.
            var component = directiveResult.decorator, metadata = directiveResult.metadata, inputs = directiveResult.inputs, outputs = directiveResult.outputs;
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
            var templateResource = template.isInline ? { path: null, expression: component.get('template') } : {
                path: file_system_1.absoluteFrom(template.declaration.resolvedTemplateUrl),
                expression: template.sourceMapping.node
            };
            // Figure out the set of styles. The ordering here is important: external resources (styleUrls)
            // precede inline styles, and styles defined in the template override styles defined in the
            // component.
            var styles = [];
            var styleResources = this._extractStyleResources(component, containingFile);
            var styleUrls = tslib_1.__spread(this._extractComponentStyleUrls(component), this._extractTemplateStyleUrls(template));
            try {
                for (var styleUrls_1 = tslib_1.__values(styleUrls), styleUrls_1_1 = styleUrls_1.next(); !styleUrls_1_1.done; styleUrls_1_1 = styleUrls_1.next()) {
                    var styleUrl = styleUrls_1_1.value;
                    var resourceType = styleUrl.source === 2 /* StylesheetFromDecorator */ ?
                        2 /* StylesheetFromDecorator */ :
                        1 /* StylesheetFromTemplate */;
                    var resourceUrl = this._resolveResourceOrThrow(styleUrl.url, containingFile, styleUrl.nodeForError, resourceType);
                    var resourceStr = this.resourceLoader.load(resourceUrl);
                    styles.push(resourceStr);
                    if (this.depTracker !== null) {
                        this.depTracker.addResourceDependency(node.getSourceFile(), file_system_1.absoluteFrom(resourceUrl));
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
            var inlineStyles = null;
            if (component.has('styles')) {
                var litStyles = directive_1.parseFieldArrayValue(component, 'styles', this.evaluator);
                if (litStyles !== null) {
                    inlineStyles = tslib_1.__spread(litStyles);
                    styles.push.apply(styles, tslib_1.__spread(litStyles));
                }
            }
            if (template.styles.length > 0) {
                styles.push.apply(styles, tslib_1.__spread(template.styles));
            }
            var encapsulation = this._resolveEnumValue(component, 'encapsulation', 'ViewEncapsulation') || 0;
            var changeDetection = this._resolveEnumValue(component, 'changeDetection', 'ChangeDetectionStrategy');
            var animations = null;
            if (component.has('animations')) {
                animations = new compiler_1.WrappedNodeExpr(component.get('animations'));
            }
            var output = {
                analysis: {
                    baseClass: util_1.readBaseClass(node, this.reflector, this.evaluator),
                    inputs: inputs,
                    outputs: outputs,
                    meta: tslib_1.__assign(tslib_1.__assign({}, metadata), { template: {
                            nodes: template.nodes,
                            ngContentSelectors: template.ngContentSelectors,
                        }, encapsulation: encapsulation, interpolation: (_b = template.interpolationConfig) !== null && _b !== void 0 ? _b : compiler_1.DEFAULT_INTERPOLATION_CONFIG, styles: styles,
                        // These will be replaced during the compilation step, after all `NgModule`s have been
                        // analyzed and the full compilation scope for the component can be realized.
                        animations: animations, viewProviders: wrappedViewProviders, i18nUseExternalIds: this.i18nUseExternalIds, relativeContextFilePath: relativeContextFilePath }),
                    typeCheckMeta: metadata_1.extractDirectiveTypeCheckMeta(node, inputs, this.reflector),
                    metadataStmt: metadata_2.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore, this.annotateForClosureCompiler),
                    template: template,
                    providersRequiringFactory: providersRequiringFactory,
                    viewProvidersRequiringFactory: viewProvidersRequiringFactory,
                    inlineStyles: inlineStyles,
                    styleUrls: styleUrls,
                    resources: {
                        styles: styleResources,
                        template: templateResource,
                    },
                    isPoisoned: false,
                },
            };
            if (changeDetection !== null) {
                output.analysis.meta.changeDetection = changeDetection;
            }
            return output;
        };
        ComponentDecoratorHandler.prototype.symbol = function (node, analysis) {
            return new ComponentSymbol(node, analysis.meta.selector, analysis.inputs.propertyNames, analysis.outputs.propertyNames, analysis.meta.exportAs);
        };
        ComponentDecoratorHandler.prototype.register = function (node, analysis) {
            // Register this component's information with the `MetadataRegistry`. This ensures that
            // the information about the component is available during the compile() phase.
            var ref = new imports_1.Reference(node);
            this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign(tslib_1.__assign({ ref: ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.meta.queries.map(function (query) { return query.propertyName; }), isComponent: true, baseClass: analysis.baseClass }, analysis.typeCheckMeta), { isPoisoned: analysis.isPoisoned, isStructural: false }));
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
                    isInline: analysis.template.isInline,
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
        ComponentDecoratorHandler.prototype.resolve = function (node, analysis, symbol) {
            var e_3, _a, e_4, _b, e_5, _c, e_6, _d, e_7, _e, e_8, _f, e_9, _g, e_10, _h, e_11, _j;
            var _this = this;
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
                    return {
                        ref: directive.ref,
                        type: _this.refEmitter.emit(directive.ref, context),
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
                        usedPipes.push({
                            ref: pipe,
                            pipeName: pipeName,
                            expression: this.refEmitter.emit(pipe, context),
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
                        var cycle = this._checkForCyclicImport(usedDirective.ref, usedDirective.type, context);
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
                        var cycle = this._checkForCyclicImport(usedPipe.ref, usedPipe.expression, context);
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
                            var type = usedDirectives_2_1.value.type;
                            this._recordSyntheticImport(type, context);
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
                            var expression = usedPipes_2_1.value.expression;
                            this._recordSyntheticImport(expression, context);
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
                                var _r = tslib_1.__read(cyclesFromDirectives_1_1.value, 2), dir = _r[0], cycle = _r[1];
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
                                var _s = tslib_1.__read(cyclesFromPipes_1_1.value, 2), pipe = _s[0], cycle = _s[1];
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
                diagnostics.push.apply(diagnostics, tslib_1.__spread(providerDiagnostics));
            }
            if (analysis.viewProvidersRequiringFactory !== null &&
                analysis.meta.viewProviders instanceof compiler_1.WrappedNodeExpr) {
                var viewProviderDiagnostics = diagnostics_2.getProviderDiagnostics(analysis.viewProvidersRequiringFactory, analysis.meta.viewProviders.node, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(viewProviderDiagnostics));
            }
            var directiveDiagnostics = diagnostics_2.getDirectiveDiagnostics(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, 'Component');
            if (directiveDiagnostics !== null) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(directiveDiagnostics));
            }
            if (diagnostics.length > 0) {
                return { diagnostics: diagnostics };
            }
            return { data: data };
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
                        var resourceType = styleUrl.source === 2 /* StylesheetFromDecorator */ ?
                            2 /* StylesheetFromDecorator */ :
                            1 /* StylesheetFromTemplate */;
                        var resolvedStyleUrl = this._resolveResourceOrThrow(styleUrl.url, containingFile, styleUrl.nodeForError, resourceType);
                        var styleText = this.resourceLoader.load(resolvedStyleUrl);
                        styles.push(styleText);
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
            var def = compiler_1.compileComponentFromMetadata(meta, pool, compiler_1.makeBindingParser());
            return this.compileComponent(analysis, def);
        };
        ComponentDecoratorHandler.prototype.compilePartial = function (node, analysis, resolution) {
            if (analysis.template.errors !== null && analysis.template.errors.length > 0) {
                return [];
            }
            var meta = tslib_1.__assign(tslib_1.__assign({}, analysis.meta), resolution);
            var def = compiler_1.compileDeclareComponentFromMetadata(meta, analysis.template);
            return this.compileComponent(analysis, def);
        };
        ComponentDecoratorHandler.prototype.compileComponent = function (analysis, _a) {
            var initializer = _a.expression, type = _a.type;
            var factoryRes = factory_1.compileNgFactoryDefField(tslib_1.__assign(tslib_1.__assign({}, analysis.meta), { injectFn: compiler_1.Identifiers.directiveInject, target: compiler_1.R3FactoryTarget.Component }));
            if (analysis.metadataStmt !== null) {
                factoryRes.statements.push(analysis.metadataStmt);
            }
            return [
                factoryRes,
                {
                    name: 'ɵcmp',
                    initializer: initializer,
                    statements: [],
                    type: type,
                }
            ];
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
            var e_15, _a, e_16, _b;
            var styleUrls = [];
            if (ts.isArrayLiteralExpression(styleUrlsExpr)) {
                try {
                    for (var _c = tslib_1.__values(styleUrlsExpr.elements), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var styleUrlExpr = _d.value;
                        if (ts.isSpreadElement(styleUrlExpr)) {
                            styleUrls.push.apply(styleUrls, tslib_1.__spread(this._extractStyleUrlsFromExpression(styleUrlExpr.expression)));
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
                catch (e_15_1) { e_15 = { error: e_15_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_15) throw e_15.error; }
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
                catch (e_16_1) { e_16 = { error: e_16_1 }; }
                finally {
                    try {
                        if (evaluatedStyleUrls_1_1 && !evaluatedStyleUrls_1_1.done && (_b = evaluatedStyleUrls_1.return)) _b.call(evaluatedStyleUrls_1);
                    }
                    finally { if (e_16) throw e_16.error; }
                }
            }
            return styleUrls;
        };
        ComponentDecoratorHandler.prototype._extractStyleResources = function (component, containingFile) {
            var e_17, _a, e_18, _b;
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
                        var resourceUrl = this._resolveResourceOrThrow(expression.text, containingFile, expression, 2 /* StylesheetFromDecorator */);
                        styles.add({ path: file_system_1.absoluteFrom(resourceUrl), expression: expression });
                    }
                }
                catch (e_17_1) { e_17 = { error: e_17_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_17) throw e_17.error; }
                }
            }
            var stylesExpr = component.get('styles');
            if (stylesExpr !== undefined && ts.isArrayLiteralExpression(stylesExpr)) {
                try {
                    for (var _e = tslib_1.__values(stringLiteralElements(stylesExpr)), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var expression = _f.value;
                        styles.add({ path: null, expression: expression });
                    }
                }
                catch (e_18_1) { e_18 = { error: e_18_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_18) throw e_18.error; }
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
                var resourceUrl = this._resolveResourceOrThrow(templateUrl, containingFile, templateUrlExpr, 0 /* Template */);
                var templatePromise = this.resourceLoader.preload(resourceUrl);
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
            else {
                var templateDecl = this.parseTemplateDeclaration(decorator, component, containingFile);
                var template = this.extractTemplate(node, templateDecl);
                this.preanalyzeTemplateCache.set(node, template);
                return Promise.resolve(template);
            }
        };
        ComponentDecoratorHandler.prototype.extractTemplate = function (node, template) {
            if (template.isInline) {
                var templateStr = void 0;
                var templateLiteral = null;
                var templateUrl = '';
                var templateRange = null;
                var sourceMapping = void 0;
                var escapedString = false;
                // We only support SourceMaps for inline templates that are simple string literals.
                if (ts.isStringLiteral(template.expression) ||
                    ts.isNoSubstitutionTemplateLiteral(template.expression)) {
                    // the start and end of the `templateExpr` node includes the quotation marks, which we must
                    // strip
                    templateRange = getTemplateRange(template.expression);
                    templateStr = template.expression.getSourceFile().text;
                    templateLiteral = template.expression;
                    templateUrl = template.templateUrl;
                    escapedString = true;
                    sourceMapping = {
                        type: 'direct',
                        node: template.expression,
                    };
                }
                else {
                    var resolvedTemplate = this.evaluator.evaluate(template.expression);
                    if (typeof resolvedTemplate !== 'string') {
                        throw diagnostics_2.createValueHasWrongTypeError(template.expression, resolvedTemplate, 'template must be a string');
                    }
                    templateStr = resolvedTemplate;
                    sourceMapping = {
                        type: 'indirect',
                        node: template.expression,
                        componentClass: node,
                        template: templateStr,
                    };
                }
                return tslib_1.__assign(tslib_1.__assign({}, this._parseTemplate(template, templateStr, templateRange, escapedString)), { sourceMapping: sourceMapping, declaration: template });
            }
            else {
                var templateStr = this.resourceLoader.load(template.resolvedTemplateUrl);
                if (this.depTracker !== null) {
                    this.depTracker.addResourceDependency(node.getSourceFile(), file_system_1.absoluteFrom(template.resolvedTemplateUrl));
                }
                return tslib_1.__assign(tslib_1.__assign({}, this._parseTemplate(template, templateStr, /* templateRange */ null, 
                /* escapedString */ false)), { sourceMapping: {
                        type: 'external',
                        componentClass: node,
                        // TODO(alxhub): TS in g3 is unable to make this inference on its own, so cast it here
                        // until g3 is able to figure this out.
                        node: template.templateUrlExpression,
                        template: templateStr,
                        templateUrl: template.resolvedTemplateUrl,
                    }, declaration: template });
            }
        };
        ComponentDecoratorHandler.prototype._parseTemplate = function (template, templateStr, templateRange, escapedString) {
            // We always normalize line endings if the template has been escaped (i.e. is inline).
            var i18nNormalizeLineEndingsInICUs = escapedString || this.i18nNormalizeLineEndingsInICUs;
            var parsedTemplate = compiler_1.parseTemplate(templateStr, template.sourceMapUrl, {
                preserveWhitespaces: template.preserveWhitespaces,
                interpolationConfig: template.interpolationConfig,
                range: templateRange !== null && templateRange !== void 0 ? templateRange : undefined,
                escapedString: escapedString,
                enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
                i18nNormalizeLineEndingsInICUs: i18nNormalizeLineEndingsInICUs,
                isInline: template.isInline,
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
            var diagNodes = compiler_1.parseTemplate(templateStr, template.sourceMapUrl, {
                preserveWhitespaces: true,
                preserveLineEndings: true,
                interpolationConfig: template.interpolationConfig,
                range: templateRange !== null && templateRange !== void 0 ? templateRange : undefined,
                escapedString: escapedString,
                enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
                i18nNormalizeLineEndingsInICUs: i18nNormalizeLineEndingsInICUs,
                leadingTriviaChars: [],
                isInline: template.isInline,
            }).nodes;
            return tslib_1.__assign(tslib_1.__assign({}, parsedTemplate), { diagNodes: diagNodes, template: template.isInline ? new compiler_1.WrappedNodeExpr(template.expression) : templateStr, templateUrl: template.resolvedTemplateUrl, isInline: template.isInline, file: new compiler_1.ParseSourceFile(templateStr, template.resolvedTemplateUrl) });
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
                var resourceUrl = this._resolveResourceOrThrow(templateUrl, containingFile, templateUrlExpr, 0 /* Template */);
                return {
                    isInline: false,
                    interpolationConfig: interpolationConfig,
                    preserveWhitespaces: preserveWhitespaces,
                    templateUrl: templateUrl,
                    templateUrlExpression: templateUrlExpr,
                    resolvedTemplateUrl: resourceUrl,
                    sourceMapUrl: sourceMapUrl(resourceUrl),
                };
            }
            else if (component.has('template')) {
                return {
                    isInline: true,
                    interpolationConfig: interpolationConfig,
                    preserveWhitespaces: preserveWhitespaces,
                    expression: component.get('template'),
                    templateUrl: containingFile,
                    resolvedTemplateUrl: containingFile,
                    sourceMapUrl: containingFile,
                };
            }
            else {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_MISSING_TEMPLATE, reflection_1.Decorator.nodeForError(decorator), 'component is missing a template');
            }
        };
        ComponentDecoratorHandler.prototype._expressionToImportedFile = function (expr, origin) {
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
        ComponentDecoratorHandler.prototype._checkForCyclicImport = function (ref, expr, origin) {
            var importedFile = this._expressionToImportedFile(expr, origin);
            if (importedFile === null) {
                return null;
            }
            // Check whether the import is legal.
            return this.cycleAnalyzer.wouldCreateCycle(origin, importedFile);
        };
        ComponentDecoratorHandler.prototype._recordSyntheticImport = function (expr, origin) {
            var imported = this._expressionToImportedFile(expr, origin);
            if (imported === null) {
                return;
            }
            this.cycleAnalyzer.recordSyntheticImport(origin, imported);
        };
        /**
         * Resolve the url of a resource relative to the file that contains the reference to it.
         *
         * Throws a FatalDiagnosticError when unable to resolve the file.
         */
        ComponentDecoratorHandler.prototype._resolveResourceOrThrow = function (file, basePath, nodeForError, resourceType) {
            try {
                return this.resourceLoader.resolve(file, basePath);
            }
            catch (e) {
                var errorText = void 0;
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
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_RESOURCE_NOT_FOUND, nodeForError, errorText);
            }
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
    function sourceMapUrl(resourceUrl) {
        if (!ts_source_map_bug_29300_1.tsSourceMapBug29300Fixed()) {
            // By removing the template URL we are telling the translator not to try to
            // map the external source file to the generated code, since the version
            // of TS that is running does not support it.
            return '';
        }
        else {
            return resourceUrl;
        }
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb2Y7SUFDcGYsK0JBQWlDO0lBR2pDLDJFQUEwRztJQUMxRywyRUFBeUQ7SUFDekQsbUVBQWlHO0lBRWpHLDZGQUE0STtJQUU1SSxxRUFBcU87SUFDck8sdUZBQW1GO0lBQ25GLHlFQUFvSDtJQUVwSCx1RUFBOEk7SUFFOUksNEdBQWdGO0lBSWhGLDJGQUE0RztJQUM1Ryx1RkFBNEY7SUFDNUYsbUZBQW1EO0lBQ25ELHFGQUF3RDtJQUN4RCx1RkFBMkM7SUFDM0MsNkVBQXNNO0lBRXRNLElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0lBQ2hELElBQU0sV0FBVyxHQUFVLEVBQUUsQ0FBQztJQStFOUI7O09BRUc7SUFDSDtRQUFxQywyQ0FBZTtRQUFwRDtZQUFBLHFFQTJCQztZQTFCQyxvQkFBYyxHQUF3QixFQUFFLENBQUM7WUFDekMsZUFBUyxHQUF3QixFQUFFLENBQUM7WUFDcEMsc0JBQWdCLEdBQUcsS0FBSyxDQUFDOztRQXdCM0IsQ0FBQztRQXRCQyx3Q0FBYyxHQUFkLFVBQWUsY0FBOEIsRUFBRSxpQkFBc0M7WUFDbkYsSUFBSSxDQUFDLENBQUMsY0FBYyxZQUFZLGVBQWUsQ0FBQyxFQUFFO2dCQUNoRCxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsc0ZBQXNGO1lBQ3RGLDhGQUE4RjtZQUM5RixZQUFZO1lBQ1osSUFBTSxnQkFBZ0IsR0FBRyxVQUFDLE9BQTBCLEVBQUUsUUFBMkI7Z0JBQzdFLE9BQUEsaUNBQWdCLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMs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LFVBQUEsSUFBSSxJQUFJLE9BQUEsT0FBTyxJQUFJLEtBQUssUUFBUSxFQUF4QixDQUF3QixDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUVELDJGQUEyRjtJQUMzRixTQUFTLGtDQUFrQyxDQUFDLFdBQWdDO1FBQzFFLDJGQUEyRjtRQUMzRiw4RkFBOEY7UUFDOUYsZ0RBQWdEO1FBQ2hELFFBQVEsV0FBVyxDQUFDLFFBQVEsRUFBRTtZQUM1QixLQUFLLElBQUk7Z0JBQ1AsT0FBTyxXQUFXLENBQUMsVUFBVSxDQUFDO1lBQ2hDLEtBQUssS0FBSztnQkFDUixPQUFPLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQztTQUM1QztJQUNILENBQUM7SUFzRUQ7O09BRUc7SUFDSCxTQUFTLG9CQUFvQixDQUN6QixHQUFjLEVBQUUsSUFBWSxFQUFFLEtBQVk7UUFDNUMsSUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsSUFBSSxXQUFXLENBQUM7UUFDMUMsSUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEVBQUUsQ0FBQyxRQUFRLEVBQVgsQ0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pFLElBQU0sT0FBTyxHQUNULFNBQU8sSUFBSSxVQUFLLElBQUksc0VBQW1FLENBQUM7UUFDNUYsT0FBTyxvQ0FBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMxRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YSwgY29tcGlsZURlY2xhcmVDb21wb25lbnRGcm9tTWV0YWRhdGEsIENvbnN0YW50UG9vbCwgQ3NzU2VsZWN0b3IsIERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLCBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgSWRlbnRpZmllcnMsIEludGVycG9sYXRpb25Db25maWcsIExleGVyUmFuZ2UsIG1ha2VCaW5kaW5nUGFyc2VyLCBQYXJzZWRUZW1wbGF0ZSwgUGFyc2VTb3VyY2VGaWxlLCBwYXJzZVRlbXBsYXRlLCBSM0NvbXBvbmVudERlZiwgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNGYWN0b3J5VGFyZ2V0LCBSM1RhcmdldEJpbmRlciwgUjNVc2VkRGlyZWN0aXZlTWV0YWRhdGEsIFNlbGVjdG9yTWF0Y2hlciwgU3RhdGVtZW50LCBUbXBsQXN0Tm9kZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDeWNsZSwgQ3ljbGVBbmFseXplciwgQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuLi8uLi9jeWNsZXMnO1xuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yLCBtYWtlRGlhZ25vc3RpYywgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIHJlbGF0aXZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgTW9kdWxlUmVzb2x2ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RlcGVuZGVuY3lUcmFja2VyfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtpc0FycmF5RXF1YWwsIGlzUmVmZXJlbmNlRXF1YWwsIFNlbWFudGljRGVwR3JhcGhVcGRhdGVyLCBTZW1hbnRpY1JlZmVyZW5jZSwgU2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7SW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7Q2xhc3NQcm9wZXJ0eU1hcHBpbmcsIENvbXBvbmVudFJlc291cmNlcywgRGlyZWN0aXZlTWV0YSwgRGlyZWN0aXZlVHlwZUNoZWNrTWV0YSwgZXh0cmFjdERpcmVjdGl2ZVR5cGVDaGVja01ldGEsIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgUmVzb3VyY2UsIFJlc291cmNlUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7RW51bVZhbHVlLCBQYXJ0aWFsRXZhbHVhdG9yLCBSZXNvbHZlZFZhbHVlfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uTm9kZSwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJGbGFncywgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge3RzU291cmNlTWFwQnVnMjkzMDBGaXhlZH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHNfc291cmNlX21hcF9idWdfMjkzMDAnO1xuaW1wb3J0IHtTdWJzZXRPZktleXN9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1Jlc291cmNlTG9hZGVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2NyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IsIGdldERpcmVjdGl2ZURpYWdub3N0aWNzLCBnZXRQcm92aWRlckRpYWdub3N0aWNzfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RGlyZWN0aXZlU3ltYm9sLCBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEsIHBhcnNlRmllbGRBcnJheVZhbHVlfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQge2NvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZH0gZnJvbSAnLi9mYWN0b3J5JztcbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge05nTW9kdWxlU3ltYm9sfSBmcm9tICcuL25nX21vZHVsZSc7XG5pbXBvcnQge2ZpbmRBbmd1bGFyRGVjb3JhdG9yLCBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlLCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlLCByZWFkQmFzZUNsYXNzLCByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgdW53cmFwRXhwcmVzc2lvbiwgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVuc30gZnJvbSAnLi91dGlsJztcblxuY29uc3QgRU1QVFlfTUFQID0gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KCk7XG5jb25zdCBFTVBUWV9BUlJBWTogYW55W10gPSBbXTtcblxuLyoqXG4gKiBUaGVzZSBmaWVsZHMgb2YgYFIzQ29tcG9uZW50TWV0YWRhdGFgIGFyZSB1cGRhdGVkIGluIHRoZSBgcmVzb2x2ZWAgcGhhc2UuXG4gKlxuICogVGhlIGBrZXlvZiBSM0NvbXBvbmVudE1ldGFkYXRhICZgIGNvbmRpdGlvbiBlbnN1cmVzIHRoYXQgb25seSBmaWVsZHMgb2YgYFIzQ29tcG9uZW50TWV0YWRhdGFgIGNhblxuICogYmUgaW5jbHVkZWQgaGVyZS5cbiAqL1xuZXhwb3J0IHR5cGUgQ29tcG9uZW50TWV0YWRhdGFSZXNvbHZlZEZpZWxkcyA9XG4gICAgU3Vic2V0T2ZLZXlzPFIzQ29tcG9uZW50TWV0YWRhdGEsICdkaXJlY3RpdmVzJ3wncGlwZXMnfCdkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSc+O1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvbmVudEFuYWx5c2lzRGF0YSB7XG4gIC8qKlxuICAgKiBgbWV0YWAgaW5jbHVkZXMgdGhvc2UgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCB3aGljaCBhcmUgY2FsY3VsYXRlZCBhdCBgYW5hbHl6ZWAgdGltZVxuICAgKiAobm90IGR1cmluZyByZXNvbHZlKS5cbiAgICovXG4gIG1ldGE6IE9taXQ8UjNDb21wb25lbnRNZXRhZGF0YSwgQ29tcG9uZW50TWV0YWRhdGFSZXNvbHZlZEZpZWxkcz47XG4gIGJhc2VDbGFzczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+fCdkeW5hbWljJ3xudWxsO1xuICB0eXBlQ2hlY2tNZXRhOiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhO1xuICB0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xuXG4gIGlucHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmc7XG4gIG91dHB1dHM6IENsYXNzUHJvcGVydHlNYXBwaW5nO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlcnMgZXh0cmFjdGVkIGZyb20gdGhlIGBwcm92aWRlcnNgIGZpZWxkIG9mIHRoZSBjb21wb25lbnQgYW5ub3RhdGlvbiB3aGljaCB3aWxsIHJlcXVpcmVcbiAgICogYW4gQW5ndWxhciBmYWN0b3J5IGRlZmluaXRpb24gYXQgcnVudGltZS5cbiAgICovXG4gIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGw7XG5cbiAgLyoqXG4gICAqIFByb3ZpZGVycyBleHRyYWN0ZWQgZnJvbSB0aGUgYHZpZXdQcm92aWRlcnNgIGZpZWxkIG9mIHRoZSBjb21wb25lbnQgYW5ub3RhdGlvbiB3aGljaCB3aWxsXG4gICAqIHJlcXVpcmUgYW4gQW5ndWxhciBmYWN0b3J5IGRlZmluaXRpb24gYXQgcnVudGltZS5cbiAgICovXG4gIHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsO1xuXG4gIHJlc291cmNlczogQ29tcG9uZW50UmVzb3VyY2VzO1xuXG4gIC8qKlxuICAgKiBgc3R5bGVVcmxzYCBleHRyYWN0ZWQgZnJvbSB0aGUgZGVjb3JhdG9yLCBpZiBwcmVzZW50LlxuICAgKi9cbiAgc3R5bGVVcmxzOiBTdHlsZVVybE1ldGFbXXxudWxsO1xuXG4gIC8qKlxuICAgKiBJbmxpbmUgc3R5bGVzaGVldHMgZXh0cmFjdGVkIGZyb20gdGhlIGRlY29yYXRvciwgaWYgcHJlc2VudC5cbiAgICovXG4gIGlubGluZVN0eWxlczogc3RyaW5nW118bnVsbDtcblxuICBpc1BvaXNvbmVkOiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBDb21wb25lbnRSZXNvbHV0aW9uRGF0YSA9IFBpY2s8UjNDb21wb25lbnRNZXRhZGF0YSwgQ29tcG9uZW50TWV0YWRhdGFSZXNvbHZlZEZpZWxkcz47XG5cbi8qKlxuICogVGhlIGxpdGVyYWwgc3R5bGUgdXJsIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNvcmF0b3IsIGFsb25nIHdpdGggbWV0YWRhdGEgZm9yIGRpYWdub3N0aWNzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0eWxlVXJsTWV0YSB7XG4gIHVybDogc3RyaW5nO1xuICBub2RlRm9yRXJyb3I6IHRzLk5vZGU7XG4gIHNvdXJjZTogUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZXxcbiAgICAgIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBvcmlnaW4gb2YgYSByZXNvdXJjZSBpbiB0aGUgYXBwbGljYXRpb24gY29kZS4gVGhpcyBpcyB1c2VkIGZvciBjcmVhdGluZ1xuICogZGlhZ25vc3RpY3MsIHNvIHdlIGNhbiBwb2ludCB0byB0aGUgcm9vdCBjYXVzZSBvZiBhbiBlcnJvciBpbiB0aGUgYXBwbGljYXRpb24gY29kZS5cbiAqXG4gKiBBIHRlbXBsYXRlIHJlc291cmNlIGNvbWVzIGZyb20gdGhlIGB0ZW1wbGF0ZVVybGAgcHJvcGVydHkgb24gdGhlIGNvbXBvbmVudCBkZWNvcmF0b3IuXG4gKlxuICogU3R5bGVzaGVldHMgcmVzb3VyY2VzIGNhbiBjb21lIGZyb20gZWl0aGVyIHRoZSBgc3R5bGVVcmxzYCBwcm9wZXJ0eSBvbiB0aGUgY29tcG9uZW50IGRlY29yYXRvcixcbiAqIG9yIGZyb20gaW5saW5lIGBzdHlsZWAgdGFncyBhbmQgc3R5bGUgbGlua3Mgb24gdGhlIGV4dGVybmFsIHRlbXBsYXRlLlxuICovXG5leHBvcnQgY29uc3QgZW51bSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcyB7XG4gIFRlbXBsYXRlLFxuICBTdHlsZXNoZWV0RnJvbVRlbXBsYXRlLFxuICBTdHlsZXNoZWV0RnJvbURlY29yYXRvcixcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEFuZ3VsYXIgY29tcG9uZW50LlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50U3ltYm9sIGV4dGVuZHMgRGlyZWN0aXZlU3ltYm9sIHtcbiAgdXNlZERpcmVjdGl2ZXM6IFNlbWFudGljUmVmZXJlbmNlW10gPSBbXTtcbiAgdXNlZFBpcGVzOiBTZW1hbnRpY1JlZmVyZW5jZVtdID0gW107XG4gIGlzUmVtb3RlbHlTY29wZWQgPSBmYWxzZTtcblxuICBpc0VtaXRBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wsIHB1YmxpY0FwaUFmZmVjdGVkOiBTZXQ8U2VtYW50aWNTeW1ib2w+KTogYm9vbGVhbiB7XG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBDb21wb25lbnRTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYW4gZXF1YWxpdHkgZnVuY3Rpb24gdGhhdCBjb25zaWRlcnMgc3ltYm9scyBlcXVhbCBpZiB0aGV5IHJlcHJlc2VudCB0aGUgc2FtZVxuICAgIC8vIGRlY2xhcmF0aW9uLCBidXQgb25seSBpZiB0aGUgc3ltYm9sIGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIGRvZXMgbm90IGhhdmUgaXRzIHB1YmxpYyBBUElcbiAgICAvLyBhZmZlY3RlZC5cbiAgICBjb25zdCBpc1N5bWJvbEFmZmVjdGVkID0gKGN1cnJlbnQ6IFNlbWFudGljUmVmZXJlbmNlLCBwcmV2aW91czogU2VtYW50aWNSZWZlcmVuY2UpID0+XG4gICAgICAgIGlzUmVmZXJlbmNlRXF1YWwoY3VycmVudCwgcHJldmlvdXMpICYmICFwdWJsaWNBcGlBZmZlY3RlZC5oYXMoY3VycmVudC5zeW1ib2wpO1xuXG4gICAgLy8gVGhlIGVtaXQgb2YgYSBjb21wb25lbnQgaXMgYWZmZWN0ZWQgaWYgZWl0aGVyIG9mIHRoZSBmb2xsb3dpbmcgaXMgdHJ1ZTpcbiAgICAvLyAgMS4gVGhlIGNvbXBvbmVudCB1c2VkIHRvIGJlIHJlbW90ZWx5IHNjb3BlZCBidXQgbm8gbG9uZ2VyIGlzLCBvciB2aWNlIHZlcnNhLlxuICAgIC8vICAyLiBUaGUgbGlzdCBvZiB1c2VkIGRpcmVjdGl2ZXMgaGFzIGNoYW5nZWQgb3IgYW55IG9mIHRob3NlIGRpcmVjdGl2ZXMgaGF2ZSBoYWQgdGhlaXIgcHVibGljXG4gICAgLy8gICAgIEFQSSBjaGFuZ2VkLiBJZiB0aGUgdXNlZCBkaXJlY3RpdmVzIGhhdmUgYmVlbiByZW9yZGVyZWQgYnV0IG5vdCBvdGhlcndpc2UgYWZmZWN0ZWQgdGhlblxuICAgIC8vICAgICB0aGUgY29tcG9uZW50IG11c3Qgc3RpbGwgYmUgcmUtZW1pdHRlZCwgYXMgdGhpcyBtYXkgYWZmZWN0IGRpcmVjdGl2ZSBpbnN0YW50aWF0aW9uIG9yZGVyLlxuICAgIC8vICAzLiBUaGUgbGlzdCBvZiB1c2VkIHBpcGVzIGhhcyBjaGFuZ2VkLCBvciBhbnkgb2YgdGhvc2UgcGlwZXMgaGF2ZSBoYWQgdGhlaXIgcHVibGljIEFQSVxuICAgIC8vICAgICBjaGFuZ2VkLlxuICAgIHJldHVybiB0aGlzLmlzUmVtb3RlbHlTY29wZWQgIT09IHByZXZpb3VzU3ltYm9sLmlzUmVtb3RlbHlTY29wZWQgfHxcbiAgICAgICAgIWlzQXJyYXlFcXVhbCh0aGlzLnVzZWREaXJlY3RpdmVzLCBwcmV2aW91c1N5bWJvbC51c2VkRGlyZWN0aXZlcywgaXNTeW1ib2xBZmZlY3RlZCkgfHxcbiAgICAgICAgIWlzQXJyYXlFcXVhbCh0aGlzLnVzZWRQaXBlcywgcHJldmlvdXNTeW1ib2wudXNlZFBpcGVzLCBpc1N5bWJvbEFmZmVjdGVkKTtcbiAgfVxufVxuXG4vKipcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCB3aGljaCBoYW5kbGVzIHRoZSBgQENvbXBvbmVudGAgYW5ub3RhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudERlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8RGVjb3JhdG9yLCBDb21wb25lbnRBbmFseXNpc0RhdGEsIENvbXBvbmVudFN5bWJvbCwgQ29tcG9uZW50UmVzb2x1dGlvbkRhdGE+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBtZXRhUmVnaXN0cnk6IE1ldGFkYXRhUmVnaXN0cnksIHByaXZhdGUgbWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXIsXG4gICAgICBwcml2YXRlIHNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlciwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHR5cGVDaGVja1Njb3BlUmVnaXN0cnk6IFR5cGVDaGVja1Njb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJlc291cmNlUmVnaXN0cnk6IFJlc291cmNlUmVnaXN0cnksIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSByZXNvdXJjZUxvYWRlcjogUmVzb3VyY2VMb2FkZXIsIHByaXZhdGUgcm9vdERpcnM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICAgIHByaXZhdGUgZGVmYXVsdFByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4sIHByaXZhdGUgaTE4blVzZUV4dGVybmFsSWRzOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuLCBwcml2YXRlIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzOiBib29sZWFufHVuZGVmaW5lZCxcbiAgICAgIHByaXZhdGUgbW9kdWxlUmVzb2x2ZXI6IE1vZHVsZVJlc29sdmVyLCBwcml2YXRlIGN5Y2xlQW5hbHl6ZXI6IEN5Y2xlQW5hbHl6ZXIsXG4gICAgICBwcml2YXRlIGN5Y2xlSGFuZGxpbmdTdHJhdGVneTogQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LCBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsXG4gICAgICBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBkZXBUcmFja2VyOiBEZXBlbmRlbmN5VHJhY2tlcnxudWxsLFxuICAgICAgcHJpdmF0ZSBpbmplY3RhYmxlUmVnaXN0cnk6IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjogU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXJ8bnVsbCxcbiAgICAgIHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4pIHt9XG5cbiAgcHJpdmF0ZSBsaXRlcmFsQ2FjaGUgPSBuZXcgTWFwPERlY29yYXRvciwgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24+KCk7XG4gIHByaXZhdGUgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5ID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuXG4gIC8qKlxuICAgKiBEdXJpbmcgdGhlIGFzeW5jaHJvbm91cyBwcmVhbmFseXplIHBoYXNlLCBpdCdzIG5lY2Vzc2FyeSB0byBwYXJzZSB0aGUgdGVtcGxhdGUgdG8gZXh0cmFjdFxuICAgKiBhbnkgcG90ZW50aWFsIDxsaW5rPiB0YWdzIHdoaWNoIG1pZ2h0IG5lZWQgdG8gYmUgbG9hZGVkLiBUaGlzIGNhY2hlIGVuc3VyZXMgdGhhdCB3b3JrIGlzIG5vdFxuICAgKiB0aHJvd24gYXdheSwgYW5kIHRoZSBwYXJzZWQgdGVtcGxhdGUgaXMgcmV1c2VkIGR1cmluZyB0aGUgYW5hbHl6ZSBwaGFzZS5cbiAgICovXG4gIHByaXZhdGUgcHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlPigpO1xuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuICByZWFkb25seSBuYW1lID0gQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdDb21wb25lbnQnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgZGVjb3JhdG9yLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBwcmVhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICAvLyBJbiBwcmVhbmFseXplLCByZXNvdXJjZSBVUkxzIGFzc29jaWF0ZWQgd2l0aCB0aGUgY29tcG9uZW50IGFyZSBhc3luY2hyb25vdXNseSBwcmVsb2FkZWQgdmlhXG4gICAgLy8gdGhlIHJlc291cmNlTG9hZGVyLiBUaGlzIGlzIHRoZSBvbmx5IHRpbWUgYXN5bmMgb3BlcmF0aW9ucyBhcmUgYWxsb3dlZCBmb3IgYSBjb21wb25lbnQuXG4gICAgLy8gVGhlc2UgcmVzb3VyY2VzIGFyZTpcbiAgICAvL1xuICAgIC8vIC0gdGhlIHRlbXBsYXRlVXJsLCBpZiB0aGVyZSBpcyBvbmVcbiAgICAvLyAtIGFueSBzdHlsZVVybHMgaWYgcHJlc2VudFxuICAgIC8vIC0gYW55IHN0eWxlc2hlZXRzIHJlZmVyZW5jZWQgZnJvbSA8bGluaz4gdGFncyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmXG4gICAgLy9cbiAgICAvLyBBcyBhIHJlc3VsdCBvZiB0aGUgbGFzdCBvbmUsIHRoZSB0ZW1wbGF0ZSBtdXN0IGJlIHBhcnNlZCBhcyBwYXJ0IG9mIHByZWFuYWx5c2lzIHRvIGV4dHJhY3RcbiAgICAvLyA8bGluaz4gdGFncywgd2hpY2ggbWF5IGludm9sdmUgd2FpdGluZyBmb3IgdGhlIHRlbXBsYXRlVXJsIHRvIGJlIHJlc29sdmVkIGZpcnN0LlxuXG4gICAgLy8gSWYgcHJlbG9hZGluZyBpc24ndCBwb3NzaWJsZSwgdGhlbiBza2lwIHRoaXMgc3RlcC5cbiAgICBpZiAoIXRoaXMucmVzb3VyY2VMb2FkZXIuY2FuUHJlbG9hZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0gdGhpcy5fcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yKTtcbiAgICBjb25zdCBjb21wb25lbnQgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuXG4gICAgY29uc3QgcmVzb2x2ZVN0eWxlVXJsID1cbiAgICAgICAgKHN0eWxlVXJsOiBzdHJpbmcsIG5vZGVGb3JFcnJvcjogdHMuTm9kZSxcbiAgICAgICAgIHJlc291cmNlVHlwZTogUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCA9PiB7XG4gICAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPVxuICAgICAgICAgICAgICB0aGlzLl9yZXNvbHZlUmVzb3VyY2VPclRocm93KHN0eWxlVXJsLCBjb250YWluaW5nRmlsZSwgbm9kZUZvckVycm9yLCByZXNvdXJjZVR5cGUpO1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQocmVzb3VyY2VVcmwpO1xuICAgICAgICB9O1xuXG4gICAgLy8gQSBQcm9taXNlIHRoYXQgd2FpdHMgZm9yIHRoZSB0ZW1wbGF0ZSBhbmQgYWxsIDxsaW5rPmVkIHN0eWxlcyB3aXRoaW4gaXQgdG8gYmUgcHJlbG9hZGVkLlxuICAgIGNvbnN0IHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcyA9XG4gICAgICAgIHRoaXMuX3ByZWxvYWRBbmRQYXJzZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSlcbiAgICAgICAgICAgIC50aGVuKCh0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlfG51bGwpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCA9PiB7XG4gICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBub2RlRm9yRXJyb3IgPSBnZXRUZW1wbGF0ZURlY2xhcmF0aW9uTm9kZUZvckVycm9yKHRlbXBsYXRlLmRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2VcbiAgICAgICAgICAgICAgICAgIC5hbGwodGVtcGxhdGUuc3R5bGVVcmxzLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICBzdHlsZVVybCA9PiByZXNvbHZlU3R5bGVVcmwoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlVXJsLCBub2RlRm9yRXJyb3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGUpKSlcbiAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICB9KTtcblxuICAgIC8vIEV4dHJhY3QgYWxsIHRoZSBzdHlsZVVybHMgaW4gdGhlIGRlY29yYXRvci5cbiAgICBjb25zdCBjb21wb25lbnRTdHlsZVVybHMgPSB0aGlzLl9leHRyYWN0Q29tcG9uZW50U3R5bGVVcmxzKGNvbXBvbmVudCk7XG5cbiAgICBpZiAoY29tcG9uZW50U3R5bGVVcmxzID09PSBudWxsKSB7XG4gICAgICAvLyBBIGZhc3QgcGF0aCBleGlzdHMgaWYgdGhlcmUgYXJlIG5vIHN0eWxlVXJscywgdG8ganVzdCB3YWl0IGZvclxuICAgICAgLy8gdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzLlxuICAgICAgcmV0dXJuIHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gV2FpdCBmb3IgYm90aCB0aGUgdGVtcGxhdGUgYW5kIGFsbCBzdHlsZVVybCByZXNvdXJjZXMgdG8gcmVzb2x2ZS5cbiAgICAgIHJldHVybiBQcm9taXNlXG4gICAgICAgICAgLmFsbChbXG4gICAgICAgICAgICB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXMsXG4gICAgICAgICAgICAuLi5jb21wb25lbnRTdHlsZVVybHMubWFwKFxuICAgICAgICAgICAgICAgIHN0eWxlVXJsID0+IHJlc29sdmVTdHlsZVVybChcbiAgICAgICAgICAgICAgICAgICAgc3R5bGVVcmwudXJsLCBzdHlsZVVybC5ub2RlRm9yRXJyb3IsXG4gICAgICAgICAgICAgICAgICAgIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yKSlcbiAgICAgICAgICBdKVxuICAgICAgICAgIC50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPixcbiAgICAgIGZsYWdzOiBIYW5kbGVyRmxhZ3MgPSBIYW5kbGVyRmxhZ3MuTk9ORSk6IEFuYWx5c2lzT3V0cHV0PENvbXBvbmVudEFuYWx5c2lzRGF0YT4ge1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuZGVsZXRlKGRlY29yYXRvcik7XG5cbiAgICAvLyBAQ29tcG9uZW50IGluaGVyaXRzIEBEaXJlY3RpdmUsIHNvIGJlZ2luIGJ5IGV4dHJhY3RpbmcgdGhlIEBEaXJlY3RpdmUgbWV0YWRhdGEgYW5kIGJ1aWxkaW5nXG4gICAgLy8gb24gaXQuXG4gICAgY29uc3QgZGlyZWN0aXZlUmVzdWx0ID0gZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhKFxuICAgICAgICBub2RlLCBkZWNvcmF0b3IsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICBmbGFncywgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcixcbiAgICAgICAgdGhpcy5lbGVtZW50U2NoZW1hUmVnaXN0cnkuZ2V0RGVmYXVsdENvbXBvbmVudEVsZW1lbnROYW1lKCkpO1xuICAgIGlmIChkaXJlY3RpdmVSZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YWAgcmV0dXJucyB1bmRlZmluZWQgd2hlbiB0aGUgQERpcmVjdGl2ZSBoYXMgYGppdDogdHJ1ZWAuIEluIHRoaXNcbiAgICAgIC8vIGNhc2UsIGNvbXBpbGF0aW9uIG9mIHRoZSBkZWNvcmF0b3IgaXMgc2tpcHBlZC4gUmV0dXJuaW5nIGFuIGVtcHR5IG9iamVjdCBzaWduaWZpZXNcbiAgICAgIC8vIHRoYXQgbm8gYW5hbHlzaXMgd2FzIHByb2R1Y2VkLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8vIE5leHQsIHJlYWQgdGhlIGBAQ29tcG9uZW50YC1zcGVjaWZpYyBmaWVsZHMuXG4gICAgY29uc3Qge2RlY29yYXRvcjogY29tcG9uZW50LCBtZXRhZGF0YSwgaW5wdXRzLCBvdXRwdXRzfSA9IGRpcmVjdGl2ZVJlc3VsdDtcblxuICAgIC8vIEdvIHRocm91Z2ggdGhlIHJvb3QgZGlyZWN0b3JpZXMgZm9yIHRoaXMgcHJvamVjdCwgYW5kIHNlbGVjdCB0aGUgb25lIHdpdGggdGhlIHNtYWxsZXN0XG4gICAgLy8gcmVsYXRpdmUgcGF0aCByZXByZXNlbnRhdGlvbi5cbiAgICBjb25zdCByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aCA9IHRoaXMucm9vdERpcnMucmVkdWNlPHN0cmluZ3x1bmRlZmluZWQ+KChwcmV2aW91cywgcm9vdERpcikgPT4ge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcmVsYXRpdmUoYWJzb2x1dGVGcm9tKHJvb3REaXIpLCBhYnNvbHV0ZUZyb20oY29udGFpbmluZ0ZpbGUpKTtcbiAgICAgIGlmIChwcmV2aW91cyA9PT0gdW5kZWZpbmVkIHx8IGNhbmRpZGF0ZS5sZW5ndGggPCBwcmV2aW91cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cztcbiAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQpITtcblxuXG4gICAgLy8gTm90ZSB0aGF0IHdlIGNvdWxkIHRlY2huaWNhbGx5IGNvbWJpbmUgdGhlIGB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeWAgYW5kXG4gICAgLy8gYHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnlgIGludG8gYSBzaW5nbGUgc2V0LCBidXQgd2Uga2VlcCB0aGUgc2VwYXJhdGUgc28gdGhhdFxuICAgIC8vIHdlIGNhbiBkaXN0aW5ndWlzaCB3aGVyZSBhbiBlcnJvciBpcyBjb21pbmcgZnJvbSB3aGVuIGxvZ2dpbmcgdGhlIGRpYWdub3N0aWNzIGluIGByZXNvbHZlYC5cbiAgICBsZXQgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGwgPSBudWxsO1xuICAgIGxldCBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsID0gbnVsbDtcbiAgICBsZXQgd3JhcHBlZFZpZXdQcm92aWRlcnM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG5cbiAgICBpZiAoY29tcG9uZW50Lmhhcygndmlld1Byb3ZpZGVycycpKSB7XG4gICAgICBjb25zdCB2aWV3UHJvdmlkZXJzID0gY29tcG9uZW50LmdldCgndmlld1Byb3ZpZGVycycpITtcbiAgICAgIHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ID1cbiAgICAgICAgICByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSh2aWV3UHJvdmlkZXJzLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgd3JhcHBlZFZpZXdQcm92aWRlcnMgPSBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgPyB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKHZpZXdQcm92aWRlcnMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmlld1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3Byb3ZpZGVycycpKSB7XG4gICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ID0gcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkoXG4gICAgICAgICAgY29tcG9uZW50LmdldCgncHJvdmlkZXJzJykhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpO1xuICAgIH1cblxuICAgIC8vIFBhcnNlIHRoZSB0ZW1wbGF0ZS5cbiAgICAvLyBJZiBhIHByZWFuYWx5emUgcGhhc2Ugd2FzIGV4ZWN1dGVkLCB0aGUgdGVtcGxhdGUgbWF5IGFscmVhZHkgZXhpc3QgaW4gcGFyc2VkIGZvcm0sIHNvIGNoZWNrXG4gICAgLy8gdGhlIHByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLlxuICAgIC8vIEV4dHJhY3QgYSBjbG9zdXJlIG9mIHRoZSB0ZW1wbGF0ZSBwYXJzaW5nIGNvZGUgc28gdGhhdCBpdCBjYW4gYmUgcmVwYXJzZWQgd2l0aCBkaWZmZXJlbnRcbiAgICAvLyBvcHRpb25zIGlmIG5lZWRlZCwgbGlrZSBpbiB0aGUgaW5kZXhpbmcgcGlwZWxpbmUuXG4gICAgbGV0IHRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2U7XG4gICAgaWYgKHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUgd2FzIHBhcnNlZCBpbiBwcmVhbmFseXplLiBVc2UgaXQgYW5kIGRlbGV0ZSBpdCB0byBzYXZlIG1lbW9yeS5cbiAgICAgIGNvbnN0IHByZWFuYWx5emVkID0gdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5nZXQobm9kZSkhO1xuICAgICAgdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5kZWxldGUobm9kZSk7XG5cbiAgICAgIHRlbXBsYXRlID0gcHJlYW5hbHl6ZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlRGVjbCA9IHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlUmVzb3VyY2UgPVxuICAgICAgICB0ZW1wbGF0ZS5pc0lubGluZSA/IHtwYXRoOiBudWxsLCBleHByZXNzaW9uOiBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpIX0gOiB7XG4gICAgICAgICAgcGF0aDogYWJzb2x1dGVGcm9tKHRlbXBsYXRlLmRlY2xhcmF0aW9uLnJlc29sdmVkVGVtcGxhdGVVcmwpLFxuICAgICAgICAgIGV4cHJlc3Npb246IHRlbXBsYXRlLnNvdXJjZU1hcHBpbmcubm9kZVxuICAgICAgICB9O1xuXG4gICAgLy8gRmlndXJlIG91dCB0aGUgc2V0IG9mIHN0eWxlcy4gVGhlIG9yZGVyaW5nIGhlcmUgaXMgaW1wb3J0YW50OiBleHRlcm5hbCByZXNvdXJjZXMgKHN0eWxlVXJscylcbiAgICAvLyBwcmVjZWRlIGlubGluZSBzdHlsZXMsIGFuZCBzdHlsZXMgZGVmaW5lZCBpbiB0aGUgdGVtcGxhdGUgb3ZlcnJpZGUgc3R5bGVzIGRlZmluZWQgaW4gdGhlXG4gICAgLy8gY29tcG9uZW50LlxuICAgIGxldCBzdHlsZXM6IHN0cmluZ1tdID0gW107XG5cbiAgICBjb25zdCBzdHlsZVJlc291cmNlcyA9IHRoaXMuX2V4dHJhY3RTdHlsZVJlc291cmNlcyhjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICBjb25zdCBzdHlsZVVybHM6IFN0eWxlVXJsTWV0YVtdID0gW1xuICAgICAgLi4udGhpcy5fZXh0cmFjdENvbXBvbmVudFN0eWxlVXJscyhjb21wb25lbnQpLCAuLi50aGlzLl9leHRyYWN0VGVtcGxhdGVTdHlsZVVybHModGVtcGxhdGUpXG4gICAgXTtcblxuICAgIGZvciAoY29uc3Qgc3R5bGVVcmwgb2Ygc3R5bGVVcmxzKSB7XG4gICAgICBjb25zdCByZXNvdXJjZVR5cGUgPSBzdHlsZVVybC5zb3VyY2UgPT09IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yID9cbiAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvciA6XG4gICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZTtcbiAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5fcmVzb2x2ZVJlc291cmNlT3JUaHJvdyhcbiAgICAgICAgICBzdHlsZVVybC51cmwsIGNvbnRhaW5pbmdGaWxlLCBzdHlsZVVybC5ub2RlRm9yRXJyb3IsIHJlc291cmNlVHlwZSk7XG4gICAgICBjb25zdCByZXNvdXJjZVN0ciA9IHRoaXMucmVzb3VyY2VMb2FkZXIubG9hZChyZXNvdXJjZVVybCk7XG5cbiAgICAgIHN0eWxlcy5wdXNoKHJlc291cmNlU3RyKTtcbiAgICAgIGlmICh0aGlzLmRlcFRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5kZXBUcmFja2VyLmFkZFJlc291cmNlRGVwZW5kZW5jeShub2RlLmdldFNvdXJjZUZpbGUoKSwgYWJzb2x1dGVGcm9tKHJlc291cmNlVXJsKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGlubGluZVN0eWxlczogc3RyaW5nW118bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3N0eWxlcycpKSB7XG4gICAgICBjb25zdCBsaXRTdHlsZXMgPSBwYXJzZUZpZWxkQXJyYXlWYWx1ZShjb21wb25lbnQsICdzdHlsZXMnLCB0aGlzLmV2YWx1YXRvcik7XG4gICAgICBpZiAobGl0U3R5bGVzICE9PSBudWxsKSB7XG4gICAgICAgIGlubGluZVN0eWxlcyA9IFsuLi5saXRTdHlsZXNdO1xuICAgICAgICBzdHlsZXMucHVzaCguLi5saXRTdHlsZXMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGVtcGxhdGUuc3R5bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHN0eWxlcy5wdXNoKC4uLnRlbXBsYXRlLnN0eWxlcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZW5jYXBzdWxhdGlvbjogbnVtYmVyID1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZUVudW1WYWx1ZShjb21wb25lbnQsICdlbmNhcHN1bGF0aW9uJywgJ1ZpZXdFbmNhcHN1bGF0aW9uJykgfHwgMDtcblxuICAgIGNvbnN0IGNoYW5nZURldGVjdGlvbjogbnVtYmVyfG51bGwgPVxuICAgICAgICB0aGlzLl9yZXNvbHZlRW51bVZhbHVlKGNvbXBvbmVudCwgJ2NoYW5nZURldGVjdGlvbicsICdDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneScpO1xuXG4gICAgbGV0IGFuaW1hdGlvbnM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ2FuaW1hdGlvbnMnKSkge1xuICAgICAgYW5pbWF0aW9ucyA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY29tcG9uZW50LmdldCgnYW5pbWF0aW9ucycpISk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0OiBBbmFseXNpc091dHB1dDxDb21wb25lbnRBbmFseXNpc0RhdGE+ID0ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgYmFzZUNsYXNzOiByZWFkQmFzZUNsYXNzKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciksXG4gICAgICAgIGlucHV0cyxcbiAgICAgICAgb3V0cHV0cyxcbiAgICAgICAgbWV0YToge1xuICAgICAgICAgIC4uLm1ldGFkYXRhLFxuICAgICAgICAgIHRlbXBsYXRlOiB7XG4gICAgICAgICAgICBub2RlczogdGVtcGxhdGUubm9kZXMsXG4gICAgICAgICAgICBuZ0NvbnRlbnRTZWxlY3RvcnM6IHRlbXBsYXRlLm5nQ29udGVudFNlbGVjdG9ycyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVuY2Fwc3VsYXRpb24sXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbjogdGVtcGxhdGUuaW50ZXJwb2xhdGlvbkNvbmZpZyA/PyBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHLFxuICAgICAgICAgIHN0eWxlcyxcblxuICAgICAgICAgIC8vIFRoZXNlIHdpbGwgYmUgcmVwbGFjZWQgZHVyaW5nIHRoZSBjb21waWxhdGlvbiBzdGVwLCBhZnRlciBhbGwgYE5nTW9kdWxlYHMgaGF2ZSBiZWVuXG4gICAgICAgICAgLy8gYW5hbHl6ZWQgYW5kIHRoZSBmdWxsIGNvbXBpbGF0aW9uIHNjb3BlIGZvciB0aGUgY29tcG9uZW50IGNhbiBiZSByZWFsaXplZC5cbiAgICAgICAgICBhbmltYXRpb25zLFxuICAgICAgICAgIHZpZXdQcm92aWRlcnM6IHdyYXBwZWRWaWV3UHJvdmlkZXJzLFxuICAgICAgICAgIGkxOG5Vc2VFeHRlcm5hbElkczogdGhpcy5pMThuVXNlRXh0ZXJuYWxJZHMsXG4gICAgICAgICAgcmVsYXRpdmVDb250ZXh0RmlsZVBhdGgsXG4gICAgICAgIH0sXG4gICAgICAgIHR5cGVDaGVja01ldGE6IGV4dHJhY3REaXJlY3RpdmVUeXBlQ2hlY2tNZXRhKG5vZGUsIGlucHV0cywgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciksXG4gICAgICAgIHRlbXBsYXRlLFxuICAgICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LFxuICAgICAgICB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSxcbiAgICAgICAgaW5saW5lU3R5bGVzLFxuICAgICAgICBzdHlsZVVybHMsXG4gICAgICAgIHJlc291cmNlczoge1xuICAgICAgICAgIHN0eWxlczogc3R5bGVSZXNvdXJjZXMsXG4gICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlUmVzb3VyY2UsXG4gICAgICAgIH0sXG4gICAgICAgIGlzUG9pc29uZWQ6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9O1xuICAgIGlmIChjaGFuZ2VEZXRlY3Rpb24gIT09IG51bGwpIHtcbiAgICAgIG91dHB1dC5hbmFseXNpcyEubWV0YS5jaGFuZ2VEZXRlY3Rpb24gPSBjaGFuZ2VEZXRlY3Rpb247XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cblxuICBzeW1ib2wobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pOiBDb21wb25lbnRTeW1ib2wge1xuICAgIHJldHVybiBuZXcgQ29tcG9uZW50U3ltYm9sKFxuICAgICAgICBub2RlLCBhbmFseXNpcy5tZXRhLnNlbGVjdG9yLCBhbmFseXNpcy5pbnB1dHMucHJvcGVydHlOYW1lcywgYW5hbHlzaXMub3V0cHV0cy5wcm9wZXJ0eU5hbWVzLFxuICAgICAgICBhbmFseXNpcy5tZXRhLmV4cG9ydEFzKTtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRBbmFseXNpc0RhdGEpOiB2b2lkIHtcbiAgICAvLyBSZWdpc3RlciB0aGlzIGNvbXBvbmVudCdzIGluZm9ybWF0aW9uIHdpdGggdGhlIGBNZXRhZGF0YVJlZ2lzdHJ5YC4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbXBvbmVudCBpcyBhdmFpbGFibGUgZHVyaW5nIHRoZSBjb21waWxlKCkgcGhhc2UuXG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShub2RlKTtcbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKHtcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IG5vZGUubmFtZS50ZXh0LFxuICAgICAgc2VsZWN0b3I6IGFuYWx5c2lzLm1ldGEuc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogYW5hbHlzaXMubWV0YS5leHBvcnRBcyxcbiAgICAgIGlucHV0czogYW5hbHlzaXMuaW5wdXRzLFxuICAgICAgb3V0cHV0czogYW5hbHlzaXMub3V0cHV0cyxcbiAgICAgIHF1ZXJpZXM6IGFuYWx5c2lzLm1ldGEucXVlcmllcy5tYXAocXVlcnkgPT4gcXVlcnkucHJvcGVydHlOYW1lKSxcbiAgICAgIGlzQ29tcG9uZW50OiB0cnVlLFxuICAgICAgYmFzZUNsYXNzOiBhbmFseXNpcy5iYXNlQ2xhc3MsXG4gICAgICAuLi5hbmFseXNpcy50eXBlQ2hlY2tNZXRhLFxuICAgICAgaXNQb2lzb25lZDogYW5hbHlzaXMuaXNQb2lzb25lZCxcbiAgICAgIGlzU3RydWN0dXJhbDogZmFsc2UsXG4gICAgfSk7XG5cbiAgICB0aGlzLnJlc291cmNlUmVnaXN0cnkucmVnaXN0ZXJSZXNvdXJjZXMoYW5hbHlzaXMucmVzb3VyY2VzLCBub2RlKTtcbiAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7XG4gIH1cblxuICBpbmRleChcbiAgICAgIGNvbnRleHQ6IEluZGV4aW5nQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pIHtcbiAgICBpZiAoYW5hbHlzaXMuaXNQb2lzb25lZCAmJiAhdGhpcy51c2VQb2lzb25lZERhdGEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBhbmFseXNpcy5tZXRhLnNlbGVjdG9yO1xuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBpZiAoKHNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQgfHwgc2NvcGUuZXhwb3J0ZWQuaXNQb2lzb25lZCkgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICAgIC8vIERvbid0IGJvdGhlciBpbmRleGluZyBjb21wb25lbnRzIHdoaWNoIGhhZCBlcnJvbmVvdXMgc2NvcGVzLCB1bmxlc3Mgc3BlY2lmaWNhbGx5XG4gICAgICAgIC8vIHJlcXVlc3RlZC5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgaWYgKGRpcmVjdGl2ZS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyZWN0aXZlLnNlbGVjdG9yKSwgZGlyZWN0aXZlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBiaW5kZXIgPSBuZXcgUjNUYXJnZXRCaW5kZXIobWF0Y2hlcik7XG4gICAgY29uc3QgYm91bmRUZW1wbGF0ZSA9IGJpbmRlci5iaW5kKHt0ZW1wbGF0ZTogYW5hbHlzaXMudGVtcGxhdGUuZGlhZ05vZGVzfSk7XG5cbiAgICBjb250ZXh0LmFkZENvbXBvbmVudCh7XG4gICAgICBkZWNsYXJhdGlvbjogbm9kZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgYm91bmRUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlTWV0YToge1xuICAgICAgICBpc0lubGluZTogYW5hbHlzaXMudGVtcGxhdGUuaXNJbmxpbmUsXG4gICAgICAgIGZpbGU6IGFuYWx5c2lzLnRlbXBsYXRlLmZpbGUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgdHlwZUNoZWNrKGN0eDogVHlwZUNoZWNrQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPik6XG4gICAgICB2b2lkIHtcbiAgICBpZiAodGhpcy50eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5ID09PSBudWxsIHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobWV0YS5pc1BvaXNvbmVkICYmICF0aGlzLnVzZVBvaXNvbmVkRGF0YSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IHRoaXMudHlwZUNoZWNrU2NvcGVSZWdpc3RyeS5nZXRUeXBlQ2hlY2tTY29wZShub2RlKTtcbiAgICBpZiAoc2NvcGUuaXNQb2lzb25lZCAmJiAhdGhpcy51c2VQb2lzb25lZERhdGEpIHtcbiAgICAgIC8vIERvbid0IHR5cGUtY2hlY2sgY29tcG9uZW50cyB0aGF0IGhhZCBlcnJvcnMgaW4gdGhlaXIgc2NvcGVzLCB1bmxlc3MgcmVxdWVzdGVkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihzY29wZS5tYXRjaGVyKTtcbiAgICBjdHguYWRkVGVtcGxhdGUoXG4gICAgICAgIG5ldyBSZWZlcmVuY2Uobm9kZSksIGJpbmRlciwgbWV0YS50ZW1wbGF0ZS5kaWFnTm9kZXMsIHNjb3BlLnBpcGVzLCBzY29wZS5zY2hlbWFzLFxuICAgICAgICBtZXRhLnRlbXBsYXRlLnNvdXJjZU1hcHBpbmcsIG1ldGEudGVtcGxhdGUuZmlsZSwgbWV0YS50ZW1wbGF0ZS5lcnJvcnMpO1xuICB9XG5cbiAgcmVzb2x2ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+LFxuICAgICAgc3ltYm9sOiBDb21wb25lbnRTeW1ib2wpOiBSZXNvbHZlUmVzdWx0PENvbXBvbmVudFJlc29sdXRpb25EYXRhPiB7XG4gICAgaWYgKGFuYWx5c2lzLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBjb21wb25lbnQgd2FzIHJlZ2lzdGVyZWQgd2l0aCBhbiBOZ01vZHVsZS4gSWYgc28sIGl0IHNob3VsZCBiZSBjb21waWxlZFxuICAgIC8vIHVuZGVyIHRoYXQgbW9kdWxlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGxldCBtZXRhZGF0YSA9IGFuYWx5c2lzLm1ldGEgYXMgUmVhZG9ubHk8UjNDb21wb25lbnRNZXRhZGF0YT47XG5cbiAgICBjb25zdCBkYXRhOiBDb21wb25lbnRSZXNvbHV0aW9uRGF0YSA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IEVNUFRZX0FSUkFZLFxuICAgICAgcGlwZXM6IEVNUFRZX01BUCxcbiAgICAgIGRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlOiBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZS5EaXJlY3QsXG4gICAgfTtcblxuICAgIGlmIChzY29wZSAhPT0gbnVsbCAmJiAoIXNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQgfHwgdGhpcy51c2VQb2lzb25lZERhdGEpKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIHJlc29sdmUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICAvL1xuICAgICAgLy8gRmlyc3QgaXQgbmVlZHMgdG8gYmUgZGV0ZXJtaW5lZCBpZiBhY3R1YWxseSBpbXBvcnRpbmcgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgdXNlZCBpbiB0aGVcbiAgICAgIC8vIHRlbXBsYXRlIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLiBDdXJyZW50bHkgbmd0c2MgcmVmdXNlcyB0byBnZW5lcmF0ZSBjeWNsZXMsIHNvIGFuIG9wdGlvblxuICAgICAgLy8ga25vd24gYXMgXCJyZW1vdGUgc2NvcGluZ1wiIGlzIHVzZWQgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLiBJbiByZW1vdGUgc2NvcGluZywgdGhlXG4gICAgICAvLyBtb2R1bGUgZmlsZSBzZXRzIHRoZSBkaXJlY3RpdmVzL3BpcGVzIG9uIHRoZSDJtWNtcCBvZiB0aGUgY29tcG9uZW50LCB3aXRob3V0XG4gICAgICAvLyByZXF1aXJpbmcgbmV3IGltcG9ydHMgKGJ1dCBhbHNvIGluIGEgd2F5IHRoYXQgYnJlYWtzIHRyZWUgc2hha2luZykuXG4gICAgICAvL1xuICAgICAgLy8gRGV0ZXJtaW5pbmcgdGhpcyBpcyBjaGFsbGVuZ2luZywgYmVjYXVzZSB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyByZXNwb25zaWJsZSBmb3JcbiAgICAgIC8vIG1hdGNoaW5nIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSB0ZW1wbGF0ZTsgaG93ZXZlciwgdGhhdCBkb2Vzbid0IHJ1biB1bnRpbCB0aGUgYWN0dWFsXG4gICAgICAvLyBjb21waWxlKCkgc3RlcC4gSXQncyBub3QgcG9zc2libGUgdG8gcnVuIHRlbXBsYXRlIGNvbXBpbGF0aW9uIHNvb25lciBhcyBpdCByZXF1aXJlcyB0aGVcbiAgICAgIC8vIENvbnN0YW50UG9vbCBmb3IgdGhlIG92ZXJhbGwgZmlsZSBiZWluZyBjb21waWxlZCAod2hpY2ggaXNuJ3QgYXZhaWxhYmxlIHVudGlsIHRoZVxuICAgICAgLy8gdHJhbnNmb3JtIHN0ZXApLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQsIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIG1hdGNoZWQgaW5kZXBlbmRlbnRseSBoZXJlLCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXNcbiAgICAgIC8vIGlzIGFuIGFsdGVybmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIHRlbXBsYXRlIG1hdGNoaW5nIHdoaWNoIGlzIHVzZWQgZm9yIHRlbXBsYXRlXG4gICAgICAvLyB0eXBlLWNoZWNraW5nIGFuZCB3aWxsIGV2ZW50dWFsbHkgcmVwbGFjZSBtYXRjaGluZyBpbiB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlci5cblxuXG4gICAgICAvLyBTZXQgdXAgdGhlIFIzVGFyZ2V0QmluZGVyLCBhcyB3ZWxsIGFzIGEgJ2RpcmVjdGl2ZXMnIGFycmF5IGFuZCBhICdwaXBlcycgbWFwIHRoYXQgYXJlXG4gICAgICAvLyBsYXRlciBmZWQgdG8gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuIEZpcnN0LCBhIFNlbGVjdG9yTWF0Y2hlciBpcyBjb25zdHJ1Y3RlZCB0b1xuICAgICAgLy8gbWF0Y2ggZGlyZWN0aXZlcyB0aGF0IGFyZSBpbiBzY29wZS5cbiAgICAgIHR5cGUgTWF0Y2hlZERpcmVjdGl2ZSA9IERpcmVjdGl2ZU1ldGEme3NlbGVjdG9yOiBzdHJpbmd9O1xuICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8TWF0Y2hlZERpcmVjdGl2ZT4oKTtcblxuICAgICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBpZiAoZGlyLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShkaXIuc2VsZWN0b3IpLCBkaXIgYXMgTWF0Y2hlZERpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5jb21waWxhdGlvbi5waXBlcykge1xuICAgICAgICBwaXBlcy5zZXQocGlwZS5uYW1lLCBwaXBlLnJlZik7XG4gICAgICB9XG5cbiAgICAgIC8vIE5leHQsIHRoZSBjb21wb25lbnQgdGVtcGxhdGUgQVNUIGlzIGJvdW5kIHVzaW5nIHRoZSBSM1RhcmdldEJpbmRlci4gVGhpcyBwcm9kdWNlcyBhXG4gICAgICAvLyBCb3VuZFRhcmdldCwgd2hpY2ggaXMgc2ltaWxhciB0byBhIHRzLlR5cGVDaGVja2VyLlxuICAgICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgICAgY29uc3QgYm91bmQgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IG1ldGFkYXRhLnRlbXBsYXRlLm5vZGVzfSk7XG5cbiAgICAgIC8vIFRoZSBCb3VuZFRhcmdldCBrbm93cyB3aGljaCBkaXJlY3RpdmVzIGFuZCBwaXBlcyBtYXRjaGVkIHRoZSB0ZW1wbGF0ZS5cbiAgICAgIHR5cGUgVXNlZERpcmVjdGl2ZSA9IFIzVXNlZERpcmVjdGl2ZU1ldGFkYXRhJntyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPn07XG4gICAgICBjb25zdCB1c2VkRGlyZWN0aXZlczogVXNlZERpcmVjdGl2ZVtdID0gYm91bmQuZ2V0VXNlZERpcmVjdGl2ZXMoKS5tYXAoZGlyZWN0aXZlID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICByZWY6IGRpcmVjdGl2ZS5yZWYsXG4gICAgICAgICAgdHlwZTogdGhpcy5yZWZFbWl0dGVyLmVtaXQoZGlyZWN0aXZlLnJlZiwgY29udGV4dCksXG4gICAgICAgICAgc2VsZWN0b3I6IGRpcmVjdGl2ZS5zZWxlY3RvcixcbiAgICAgICAgICBpbnB1dHM6IGRpcmVjdGl2ZS5pbnB1dHMucHJvcGVydHlOYW1lcyxcbiAgICAgICAgICBvdXRwdXRzOiBkaXJlY3RpdmUub3V0cHV0cy5wcm9wZXJ0eU5hbWVzLFxuICAgICAgICAgIGV4cG9ydEFzOiBkaXJlY3RpdmUuZXhwb3J0QXMsXG4gICAgICAgICAgaXNDb21wb25lbnQ6IGRpcmVjdGl2ZS5pc0NvbXBvbmVudCxcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgdHlwZSBVc2VkUGlwZSA9IHtyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiwgcGlwZU5hbWU6IHN0cmluZywgZXhwcmVzc2lvbjogRXhwcmVzc2lvbn07XG4gICAgICBjb25zdCB1c2VkUGlwZXM6IFVzZWRQaXBlW10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgcGlwZU5hbWUgb2YgYm91bmQuZ2V0VXNlZFBpcGVzKCkpIHtcbiAgICAgICAgaWYgKCFwaXBlcy5oYXMocGlwZU5hbWUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGlwZSA9IHBpcGVzLmdldChwaXBlTmFtZSkhO1xuICAgICAgICB1c2VkUGlwZXMucHVzaCh7XG4gICAgICAgICAgcmVmOiBwaXBlLFxuICAgICAgICAgIHBpcGVOYW1lLFxuICAgICAgICAgIGV4cHJlc3Npb246IHRoaXMucmVmRW1pdHRlci5lbWl0KHBpcGUsIGNvbnRleHQpLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyICE9PSBudWxsKSB7XG4gICAgICAgIHN5bWJvbC51c2VkRGlyZWN0aXZlcyA9IHVzZWREaXJlY3RpdmVzLm1hcChcbiAgICAgICAgICAgIGRpciA9PiB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyIS5nZXRTZW1hbnRpY1JlZmVyZW5jZShkaXIucmVmLm5vZGUsIGRpci50eXBlKSk7XG4gICAgICAgIHN5bWJvbC51c2VkUGlwZXMgPSB1c2VkUGlwZXMubWFwKFxuICAgICAgICAgICAgcGlwZSA9PlxuICAgICAgICAgICAgICAgIHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIhLmdldFNlbWFudGljUmVmZXJlbmNlKHBpcGUucmVmLm5vZGUsIHBpcGUuZXhwcmVzc2lvbikpO1xuICAgICAgfVxuXG4gICAgICAvLyBTY2FuIHRocm91Z2ggdGhlIGRpcmVjdGl2ZXMvcGlwZXMgYWN0dWFsbHkgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYW5kIGNoZWNrIHdoZXRoZXIgYW55XG4gICAgICAvLyBpbXBvcnQgd2hpY2ggbmVlZHMgdG8gYmUgZ2VuZXJhdGVkIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLlxuICAgICAgY29uc3QgY3ljbGVzRnJvbURpcmVjdGl2ZXMgPSBuZXcgTWFwPFVzZWREaXJlY3RpdmUsIEN5Y2xlPigpO1xuICAgICAgZm9yIChjb25zdCB1c2VkRGlyZWN0aXZlIG9mIHVzZWREaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IGN5Y2xlID0gdGhpcy5fY2hlY2tGb3JDeWNsaWNJbXBvcnQodXNlZERpcmVjdGl2ZS5yZWYsIHVzZWREaXJlY3RpdmUudHlwZSwgY29udGV4dCk7XG4gICAgICAgIGlmIChjeWNsZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGN5Y2xlc0Zyb21EaXJlY3RpdmVzLnNldCh1c2VkRGlyZWN0aXZlLCBjeWNsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGN5Y2xlc0Zyb21QaXBlcyA9IG5ldyBNYXA8VXNlZFBpcGUsIEN5Y2xlPigpO1xuICAgICAgZm9yIChjb25zdCB1c2VkUGlwZSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgY29uc3QgY3ljbGUgPSB0aGlzLl9jaGVja0ZvckN5Y2xpY0ltcG9ydCh1c2VkUGlwZS5yZWYsIHVzZWRQaXBlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgICBpZiAoY3ljbGUgIT09IG51bGwpIHtcbiAgICAgICAgICBjeWNsZXNGcm9tUGlwZXMuc2V0KHVzZWRQaXBlLCBjeWNsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgY3ljbGVEZXRlY3RlZCA9IGN5Y2xlc0Zyb21EaXJlY3RpdmVzLnNpemUgIT09IDAgfHwgY3ljbGVzRnJvbVBpcGVzLnNpemUgIT09IDA7XG4gICAgICBpZiAoIWN5Y2xlRGV0ZWN0ZWQpIHtcbiAgICAgICAgLy8gTm8gY3ljbGUgd2FzIGRldGVjdGVkLiBSZWNvcmQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGNyZWF0ZWQgaW4gdGhlIGN5Y2xlIGRldGVjdG9yXG4gICAgICAgIC8vIHNvIHRoYXQgZnV0dXJlIGN5Y2xpYyBpbXBvcnQgY2hlY2tzIGNvbnNpZGVyIHRoZWlyIHByb2R1Y3Rpb24uXG4gICAgICAgIGZvciAoY29uc3Qge3R5cGV9IG9mIHVzZWREaXJlY3RpdmVzKSB7XG4gICAgICAgICAgdGhpcy5fcmVjb3JkU3ludGhldGljSW1wb3J0KHR5cGUsIGNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qge2V4cHJlc3Npb259IG9mIHVzZWRQaXBlcykge1xuICAgICAgICAgIHRoaXMuX3JlY29yZFN5bnRoZXRpY0ltcG9ydChleHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGFycmF5cyBpbiDJtWNtcCBuZWVkIHRvIGJlIHdyYXBwZWQgaW4gY2xvc3VyZXMuXG4gICAgICAgIC8vIFRoaXMgaXMgcmVxdWlyZWQgaWYgYW55IGRpcmVjdGl2ZS9waXBlIHJlZmVyZW5jZSBpcyB0byBhIGRlY2xhcmF0aW9uIGluIHRoZSBzYW1lIGZpbGVcbiAgICAgICAgLy8gYnV0IGRlY2xhcmVkIGFmdGVyIHRoaXMgY29tcG9uZW50LlxuICAgICAgICBjb25zdCB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID1cbiAgICAgICAgICAgIHVzZWREaXJlY3RpdmVzLnNvbWUoXG4gICAgICAgICAgICAgICAgZGlyID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoZGlyLnR5cGUsIG5vZGUubmFtZSwgY29udGV4dCkpIHx8XG4gICAgICAgICAgICB1c2VkUGlwZXMuc29tZShcbiAgICAgICAgICAgICAgICBwaXBlID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocGlwZS5leHByZXNzaW9uLCBub2RlLm5hbWUsIGNvbnRleHQpKTtcblxuICAgICAgICBkYXRhLmRpcmVjdGl2ZXMgPSB1c2VkRGlyZWN0aXZlcztcbiAgICAgICAgZGF0YS5waXBlcyA9IG5ldyBNYXAodXNlZFBpcGVzLm1hcChwaXBlID0+IFtwaXBlLnBpcGVOYW1lLCBwaXBlLmV4cHJlc3Npb25dKSk7XG4gICAgICAgIGRhdGEuZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUgPSB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID9cbiAgICAgICAgICAgIERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkNsb3N1cmUgOlxuICAgICAgICAgICAgRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUuRGlyZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuY3ljbGVIYW5kbGluZ1N0cmF0ZWd5ID09PSBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuVXNlUmVtb3RlU2NvcGluZykge1xuICAgICAgICAgIC8vIERlY2xhcmluZyB0aGUgZGlyZWN0aXZlRGVmcy9waXBlRGVmcyBhcnJheXMgZGlyZWN0bHkgd291bGQgcmVxdWlyZSBpbXBvcnRzIHRoYXQgd291bGRcbiAgICAgICAgICAvLyBjcmVhdGUgYSBjeWNsZS4gSW5zdGVhZCwgbWFyayB0aGlzIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcsIHNvIHRoYXQgdGhlXG4gICAgICAgICAgLy8gTmdNb2R1bGUgZmlsZSB3aWxsIHRha2UgY2FyZSBvZiBzZXR0aW5nIHRoZSBkaXJlY3RpdmVzIGZvciB0aGUgY29tcG9uZW50LlxuICAgICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5zZXRDb21wb25lbnRSZW1vdGVTY29wZShcbiAgICAgICAgICAgICAgbm9kZSwgdXNlZERpcmVjdGl2ZXMubWFwKGRpciA9PiBkaXIucmVmKSwgdXNlZFBpcGVzLm1hcChwaXBlID0+IHBpcGUucmVmKSk7XG4gICAgICAgICAgc3ltYm9sLmlzUmVtb3RlbHlTY29wZWQgPSB0cnVlO1xuXG4gICAgICAgICAgLy8gSWYgYSBzZW1hbnRpYyBncmFwaCBpcyBiZWluZyB0cmFja2VkLCByZWNvcmQgdGhlIGZhY3QgdGhhdCB0aGlzIGNvbXBvbmVudCBpcyByZW1vdGVseVxuICAgICAgICAgIC8vIHNjb3BlZCB3aXRoIHRoZSBkZWNsYXJpbmcgTmdNb2R1bGUgc3ltYm9sIGFzIHRoZSBOZ01vZHVsZSdzIGVtaXQgYmVjb21lcyBkZXBlbmRlbnQgb25cbiAgICAgICAgICAvLyB0aGUgZGlyZWN0aXZlL3BpcGUgdXNhZ2VzIG9mIHRoaXMgY29tcG9uZW50LlxuICAgICAgICAgIGlmICh0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCBtb2R1bGVTeW1ib2wgPSB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLmdldFN5bWJvbChzY29wZS5uZ01vZHVsZSk7XG4gICAgICAgICAgICBpZiAoIShtb2R1bGVTeW1ib2wgaW5zdGFuY2VvZiBOZ01vZHVsZVN5bWJvbCkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgYEFzc2VydGlvbkVycm9yOiBFeHBlY3RlZCAke3Njb3BlLm5nTW9kdWxlLm5hbWV9IHRvIGJlIGFuIE5nTW9kdWxlU3ltYm9sLmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtb2R1bGVTeW1ib2wuYWRkUmVtb3RlbHlTY29wZWRDb21wb25lbnQoXG4gICAgICAgICAgICAgICAgc3ltYm9sLCBzeW1ib2wudXNlZERpcmVjdGl2ZXMsIHN5bWJvbC51c2VkUGlwZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBXZSBhcmUgbm90IGFibGUgdG8gaGFuZGxlIHRoaXMgY3ljbGUgc28gdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgY29uc3QgcmVsYXRlZE1lc3NhZ2VzOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uW10gPSBbXTtcbiAgICAgICAgICBmb3IgKGNvbnN0IFtkaXIsIGN5Y2xlXSBvZiBjeWNsZXNGcm9tRGlyZWN0aXZlcykge1xuICAgICAgICAgICAgcmVsYXRlZE1lc3NhZ2VzLnB1c2goXG4gICAgICAgICAgICAgICAgbWFrZUN5Y2xpY0ltcG9ydEluZm8oZGlyLnJlZiwgZGlyLmlzQ29tcG9uZW50ID8gJ2NvbXBvbmVudCcgOiAnZGlyZWN0aXZlJywgY3ljbGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCBbcGlwZSwgY3ljbGVdIG9mIGN5Y2xlc0Zyb21QaXBlcykge1xuICAgICAgICAgICAgcmVsYXRlZE1lc3NhZ2VzLnB1c2gobWFrZUN5Y2xpY0ltcG9ydEluZm8ocGlwZS5yZWYsICdwaXBlJywgY3ljbGUpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuSU1QT1JUX0NZQ0xFX0RFVEVDVEVELCBub2RlLFxuICAgICAgICAgICAgICAnT25lIG9yIG1vcmUgaW1wb3J0IGN5Y2xlcyB3b3VsZCBuZWVkIHRvIGJlIGNyZWF0ZWQgdG8gY29tcGlsZSB0aGlzIGNvbXBvbmVudCwgJyArXG4gICAgICAgICAgICAgICAgICAnd2hpY2ggaXMgbm90IHN1cHBvcnRlZCBieSB0aGUgY3VycmVudCBjb21waWxlciBjb25maWd1cmF0aW9uLicsXG4gICAgICAgICAgICAgIHJlbGF0ZWRNZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICBpZiAoYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSAhPT0gbnVsbCAmJlxuICAgICAgICBhbmFseXNpcy5tZXRhLnByb3ZpZGVycyBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcikge1xuICAgICAgY29uc3QgcHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMhLm5vZGUsXG4gICAgICAgICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5wcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoYW5hbHlzaXMudmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgIT09IG51bGwgJiZcbiAgICAgICAgYW5hbHlzaXMubWV0YS52aWV3UHJvdmlkZXJzIGluc3RhbmNlb2YgV3JhcHBlZE5vZGVFeHByKSB7XG4gICAgICBjb25zdCB2aWV3UHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMudmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIGFuYWx5c2lzLm1ldGEudmlld1Byb3ZpZGVycyEubm9kZSxcbiAgICAgICAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeSk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnZpZXdQcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVEaWFnbm9zdGljcyA9IGdldERpcmVjdGl2ZURpYWdub3N0aWNzKFxuICAgICAgICBub2RlLCB0aGlzLm1ldGFSZWFkZXIsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCAnQ29tcG9uZW50Jyk7XG4gICAgaWYgKGRpcmVjdGl2ZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmRpcmVjdGl2ZURpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtkaWFnbm9zdGljc307XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkYXRhfTtcbiAgfVxuXG4gIHVwZGF0ZVJlc291cmNlcyhub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogQ29tcG9uZW50QW5hbHlzaXNEYXRhKTogdm9pZCB7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcblxuICAgIC8vIElmIHRoZSB0ZW1wbGF0ZSBpcyBleHRlcm5hbCwgcmUtcGFyc2UgaXQuXG4gICAgY29uc3QgdGVtcGxhdGVEZWNsID0gYW5hbHlzaXMudGVtcGxhdGUuZGVjbGFyYXRpb247XG4gICAgaWYgKCF0ZW1wbGF0ZURlY2wuaXNJbmxpbmUpIHtcbiAgICAgIGFuYWx5c2lzLnRlbXBsYXRlID0gdGhpcy5leHRyYWN0VGVtcGxhdGUobm9kZSwgdGVtcGxhdGVEZWNsKTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgYW55IGV4dGVybmFsIHN0eWxlc2hlZXRzIGFuZCByZWJ1aWxkIHRoZSBjb21iaW5lZCAnc3R5bGVzJyBsaXN0LlxuICAgIC8vIFRPRE8oYWx4aHViKTogd3JpdGUgdGVzdHMgZm9yIHN0eWxlcyB3aGVuIHRoZSBwcmltYXJ5IGNvbXBpbGVyIHVzZXMgdGhlIHVwZGF0ZVJlc291cmNlcyBwYXRoXG4gICAgbGV0IHN0eWxlczogc3RyaW5nW10gPSBbXTtcbiAgICBpZiAoYW5hbHlzaXMuc3R5bGVVcmxzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IHN0eWxlVXJsIG9mIGFuYWx5c2lzLnN0eWxlVXJscykge1xuICAgICAgICBjb25zdCByZXNvdXJjZVR5cGUgPVxuICAgICAgICAgICAgc3R5bGVVcmwuc291cmNlID09PSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvciA/XG4gICAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvciA6XG4gICAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbVRlbXBsYXRlO1xuICAgICAgICBjb25zdCByZXNvbHZlZFN0eWxlVXJsID0gdGhpcy5fcmVzb2x2ZVJlc291cmNlT3JUaHJvdyhcbiAgICAgICAgICAgIHN0eWxlVXJsLnVybCwgY29udGFpbmluZ0ZpbGUsIHN0eWxlVXJsLm5vZGVGb3JFcnJvciwgcmVzb3VyY2VUeXBlKTtcbiAgICAgICAgY29uc3Qgc3R5bGVUZXh0ID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHJlc29sdmVkU3R5bGVVcmwpO1xuICAgICAgICBzdHlsZXMucHVzaChzdHlsZVRleHQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoYW5hbHlzaXMuaW5saW5lU3R5bGVzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IHN0eWxlVGV4dCBvZiBhbmFseXNpcy5pbmxpbmVTdHlsZXMpIHtcbiAgICAgICAgc3R5bGVzLnB1c2goc3R5bGVUZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBzdHlsZVRleHQgb2YgYW5hbHlzaXMudGVtcGxhdGUuc3R5bGVzKSB7XG4gICAgICBzdHlsZXMucHVzaChzdHlsZVRleHQpO1xuICAgIH1cblxuICAgIGFuYWx5c2lzLm1ldGEuc3R5bGVzID0gc3R5bGVzO1xuICB9XG5cbiAgY29tcGlsZUZ1bGwoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPixcbiAgICAgIHJlc29sdXRpb246IFJlYWRvbmx5PENvbXBvbmVudFJlc29sdXRpb25EYXRhPiwgcG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBpZiAoYW5hbHlzaXMudGVtcGxhdGUuZXJyb3JzICE9PSBudWxsICYmIGFuYWx5c2lzLnRlbXBsYXRlLmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IG1ldGE6IFIzQ29tcG9uZW50TWV0YWRhdGEgPSB7Li4uYW5hbHlzaXMubWV0YSwgLi4ucmVzb2x1dGlvbn07XG4gICAgY29uc3QgZGVmID0gY29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YShtZXRhLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlQ29tcG9uZW50KGFuYWx5c2lzLCBkZWYpO1xuICB9XG5cbiAgY29tcGlsZVBhcnRpYWwoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPixcbiAgICAgIHJlc29sdXRpb246IFJlYWRvbmx5PENvbXBvbmVudFJlc29sdXRpb25EYXRhPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgaWYgKGFuYWx5c2lzLnRlbXBsYXRlLmVycm9ycyAhPT0gbnVsbCAmJiBhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBtZXRhOiBSM0NvbXBvbmVudE1ldGFkYXRhID0gey4uLmFuYWx5c2lzLm1ldGEsIC4uLnJlc29sdXRpb259O1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVEZWNsYXJlQ29tcG9uZW50RnJvbU1ldGFkYXRhKG1ldGEsIGFuYWx5c2lzLnRlbXBsYXRlKTtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlQ29tcG9uZW50KGFuYWx5c2lzLCBkZWYpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21waWxlQ29tcG9uZW50KFxuICAgICAgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICB7ZXhwcmVzc2lvbjogaW5pdGlhbGl6ZXIsIHR5cGV9OiBSM0NvbXBvbmVudERlZik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgZmFjdG9yeVJlcyA9IGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZCh7XG4gICAgICAuLi5hbmFseXNpcy5tZXRhLFxuICAgICAgaW5qZWN0Rm46IElkZW50aWZpZXJzLmRpcmVjdGl2ZUluamVjdCxcbiAgICAgIHRhcmdldDogUjNGYWN0b3J5VGFyZ2V0LkNvbXBvbmVudCxcbiAgICB9KTtcbiAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBmYWN0b3J5UmVzLnN0YXRlbWVudHMucHVzaChhbmFseXNpcy5tZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgICByZXR1cm4gW1xuICAgICAgZmFjdG9yeVJlcywge1xuICAgICAgICBuYW1lOiAnybVjbXAnLFxuICAgICAgICBpbml0aWFsaXplcixcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGUsXG4gICAgICB9XG4gICAgXTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jlc29sdmVMaXRlcmFsKGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICAgIGlmICh0aGlzLmxpdGVyYWxDYWNoZS5oYXMoZGVjb3JhdG9yKSkge1xuICAgICAgcmV0dXJuIHRoaXMubGl0ZXJhbENhY2hlLmdldChkZWNvcmF0b3IpITtcbiAgICB9XG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgICBgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQENvbXBvbmVudCBkZWNvcmF0b3JgKTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsIGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCBiZSBsaXRlcmFsLmApO1xuICAgIH1cblxuICAgIHRoaXMubGl0ZXJhbENhY2hlLnNldChkZWNvcmF0b3IsIG1ldGEpO1xuICAgIHJldHVybiBtZXRhO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVzb2x2ZUVudW1WYWx1ZShcbiAgICAgIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGZpZWxkOiBzdHJpbmcsIGVudW1TeW1ib2xOYW1lOiBzdHJpbmcpOiBudW1iZXJ8bnVsbCB7XG4gICAgbGV0IHJlc29sdmVkOiBudW1iZXJ8bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoZmllbGQpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldChmaWVsZCkhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKSBhcyBhbnk7XG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbnVtVmFsdWUgJiYgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSh2YWx1ZS5lbnVtUmVmLCBlbnVtU3ltYm9sTmFtZSkpIHtcbiAgICAgICAgcmVzb2x2ZWQgPSB2YWx1ZS5yZXNvbHZlZCBhcyBudW1iZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgZXhwciwgdmFsdWUsIGAke2ZpZWxkfSBtdXN0IGJlIGEgbWVtYmVyIG9mICR7ZW51bVN5bWJvbE5hbWV9IGVudW0gZnJvbSBAYW5ndWxhci9jb3JlYCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXNvbHZlZDtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RDb21wb25lbnRTdHlsZVVybHMoXG4gICAgICBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICAgICAgKTogU3R5bGVVcmxNZXRhW10ge1xuICAgIGlmICghY29tcG9uZW50Lmhhcygnc3R5bGVVcmxzJykpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fZXh0cmFjdFN0eWxlVXJsc0Zyb21FeHByZXNzaW9uKGNvbXBvbmVudC5nZXQoJ3N0eWxlVXJscycpISk7XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0U3R5bGVVcmxzRnJvbUV4cHJlc3Npb24oc3R5bGVVcmxzRXhwcjogdHMuRXhwcmVzc2lvbik6IFN0eWxlVXJsTWV0YVtdIHtcbiAgICBjb25zdCBzdHlsZVVybHM6IFN0eWxlVXJsTWV0YVtdID0gW107XG5cbiAgICBpZiAodHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHN0eWxlVXJsc0V4cHIpKSB7XG4gICAgICBmb3IgKGNvbnN0IHN0eWxlVXJsRXhwciBvZiBzdHlsZVVybHNFeHByLmVsZW1lbnRzKSB7XG4gICAgICAgIGlmICh0cy5pc1NwcmVhZEVsZW1lbnQoc3R5bGVVcmxFeHByKSkge1xuICAgICAgICAgIHN0eWxlVXJscy5wdXNoKC4uLnRoaXMuX2V4dHJhY3RTdHlsZVVybHNGcm9tRXhwcmVzc2lvbihzdHlsZVVybEV4cHIuZXhwcmVzc2lvbikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHN0eWxlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoc3R5bGVVcmxFeHByKTtcblxuICAgICAgICAgIGlmICh0eXBlb2Ygc3R5bGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKHN0eWxlVXJsRXhwciwgc3R5bGVVcmwsICdzdHlsZVVybCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc3R5bGVVcmxzLnB1c2goe1xuICAgICAgICAgICAgdXJsOiBzdHlsZVVybCxcbiAgICAgICAgICAgIHNvdXJjZTogUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IsXG4gICAgICAgICAgICBub2RlRm9yRXJyb3I6IHN0eWxlVXJsRXhwcixcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBldmFsdWF0ZWRTdHlsZVVybHMgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShzdHlsZVVybHNFeHByKTtcbiAgICAgIGlmICghaXNTdHJpbmdBcnJheShldmFsdWF0ZWRTdHlsZVVybHMpKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBzdHlsZVVybHNFeHByLCBldmFsdWF0ZWRTdHlsZVVybHMsICdzdHlsZVVybHMgbXVzdCBiZSBhbiBhcnJheSBvZiBzdHJpbmdzJyk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3Qgc3R5bGVVcmwgb2YgZXZhbHVhdGVkU3R5bGVVcmxzKSB7XG4gICAgICAgIHN0eWxlVXJscy5wdXNoKHtcbiAgICAgICAgICB1cmw6IHN0eWxlVXJsLFxuICAgICAgICAgIHNvdXJjZTogUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IsXG4gICAgICAgICAgbm9kZUZvckVycm9yOiBzdHlsZVVybHNFeHByLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3R5bGVVcmxzO1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdFN0eWxlUmVzb3VyY2VzKGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOlxuICAgICAgUmVhZG9ubHlTZXQ8UmVzb3VyY2U+IHtcbiAgICBjb25zdCBzdHlsZXMgPSBuZXcgU2V0PFJlc291cmNlPigpO1xuICAgIGZ1bmN0aW9uIHN0cmluZ0xpdGVyYWxFbGVtZW50cyhhcnJheTogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbik6IHRzLlN0cmluZ0xpdGVyYWxMaWtlW10ge1xuICAgICAgcmV0dXJuIGFycmF5LmVsZW1lbnRzLmZpbHRlcihcbiAgICAgICAgICAoZTogdHMuRXhwcmVzc2lvbik6IGUgaXMgdHMuU3RyaW5nTGl0ZXJhbExpa2UgPT4gdHMuaXNTdHJpbmdMaXRlcmFsTGlrZShlKSk7XG4gICAgfVxuXG4gICAgLy8gSWYgc3R5bGVVcmxzIGlzIGEgbGl0ZXJhbCBhcnJheSwgcHJvY2VzcyBlYWNoIHJlc291cmNlIHVybCBpbmRpdmlkdWFsbHkgYW5kXG4gICAgLy8gcmVnaXN0ZXIgb25lcyB0aGF0IGFyZSBzdHJpbmcgbGl0ZXJhbHMuXG4gICAgY29uc3Qgc3R5bGVVcmxzRXhwciA9IGNvbXBvbmVudC5nZXQoJ3N0eWxlVXJscycpO1xuICAgIGlmIChzdHlsZVVybHNFeHByICE9PSB1bmRlZmluZWQgJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHN0eWxlVXJsc0V4cHIpKSB7XG4gICAgICBmb3IgKGNvbnN0IGV4cHJlc3Npb24gb2Ygc3RyaW5nTGl0ZXJhbEVsZW1lbnRzKHN0eWxlVXJsc0V4cHIpKSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5fcmVzb2x2ZVJlc291cmNlT3JUaHJvdyhcbiAgICAgICAgICAgIGV4cHJlc3Npb24udGV4dCwgY29udGFpbmluZ0ZpbGUsIGV4cHJlc3Npb24sXG4gICAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcik7XG4gICAgICAgIHN0eWxlcy5hZGQoe3BhdGg6IGFic29sdXRlRnJvbShyZXNvdXJjZVVybCksIGV4cHJlc3Npb259KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZXNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVzJyk7XG4gICAgaWYgKHN0eWxlc0V4cHIgIT09IHVuZGVmaW5lZCAmJiB0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oc3R5bGVzRXhwcikpIHtcbiAgICAgIGZvciAoY29uc3QgZXhwcmVzc2lvbiBvZiBzdHJpbmdMaXRlcmFsRWxlbWVudHMoc3R5bGVzRXhwcikpIHtcbiAgICAgICAgc3R5bGVzLmFkZCh7cGF0aDogbnVsbCwgZXhwcmVzc2lvbn0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdHlsZXM7XG4gIH1cblxuICBwcml2YXRlIF9wcmVsb2FkQW5kUGFyc2VUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICAgICAgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IFByb21pc2U8UGFyc2VkVGVtcGxhdGVXaXRoU291cmNlfG51bGw+IHtcbiAgICBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGVVcmwnKSkge1xuICAgICAgLy8gRXh0cmFjdCB0aGUgdGVtcGxhdGVVcmwgYW5kIHByZWxvYWQgaXQuXG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybEV4cHIsIHRlbXBsYXRlVXJsLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLl9yZXNvbHZlUmVzb3VyY2VPclRocm93KFxuICAgICAgICAgIHRlbXBsYXRlVXJsLCBjb250YWluaW5nRmlsZSwgdGVtcGxhdGVVcmxFeHByLCBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5UZW1wbGF0ZSk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVByb21pc2UgPSB0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQocmVzb3VyY2VVcmwpO1xuXG4gICAgICAvLyBJZiB0aGUgcHJlbG9hZCB3b3JrZWQsIHRoZW4gYWN0dWFsbHkgbG9hZCBhbmQgcGFyc2UgdGhlIHRlbXBsYXRlLCBhbmQgd2FpdCBmb3IgYW55IHN0eWxlXG4gICAgICAvLyBVUkxzIHRvIHJlc29sdmUuXG4gICAgICBpZiAodGVtcGxhdGVQcm9taXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlUHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPSB0aGlzLnBhcnNlVGVtcGxhdGVEZWNsYXJhdGlvbihkZWNvcmF0b3IsIGNvbXBvbmVudCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5leHRyYWN0VGVtcGxhdGUobm9kZSwgdGVtcGxhdGVEZWNsKTtcbiAgICAgICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlRGVjbCA9IHRoaXMucGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRlbXBsYXRlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RUZW1wbGF0ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCB0ZW1wbGF0ZTogVGVtcGxhdGVEZWNsYXJhdGlvbik6XG4gICAgICBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2Uge1xuICAgIGlmICh0ZW1wbGF0ZS5pc0lubGluZSkge1xuICAgICAgbGV0IHRlbXBsYXRlU3RyOiBzdHJpbmc7XG4gICAgICBsZXQgdGVtcGxhdGVMaXRlcmFsOiB0cy5Ob2RlfG51bGwgPSBudWxsO1xuICAgICAgbGV0IHRlbXBsYXRlVXJsOiBzdHJpbmcgPSAnJztcbiAgICAgIGxldCB0ZW1wbGF0ZVJhbmdlOiBMZXhlclJhbmdlfG51bGwgPSBudWxsO1xuICAgICAgbGV0IHNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgICAgIGxldCBlc2NhcGVkU3RyaW5nID0gZmFsc2U7XG4gICAgICAvLyBXZSBvbmx5IHN1cHBvcnQgU291cmNlTWFwcyBmb3IgaW5saW5lIHRlbXBsYXRlcyB0aGF0IGFyZSBzaW1wbGUgc3RyaW5nIGxpdGVyYWxzLlxuICAgICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbCh0ZW1wbGF0ZS5leHByZXNzaW9uKSB8fFxuICAgICAgICAgIHRzLmlzTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwodGVtcGxhdGUuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgLy8gdGhlIHN0YXJ0IGFuZCBlbmQgb2YgdGhlIGB0ZW1wbGF0ZUV4cHJgIG5vZGUgaW5jbHVkZXMgdGhlIHF1b3RhdGlvbiBtYXJrcywgd2hpY2ggd2UgbXVzdFxuICAgICAgICAvLyBzdHJpcFxuICAgICAgICB0ZW1wbGF0ZVJhbmdlID0gZ2V0VGVtcGxhdGVSYW5nZSh0ZW1wbGF0ZS5leHByZXNzaW9uKTtcbiAgICAgICAgdGVtcGxhdGVTdHIgPSB0ZW1wbGF0ZS5leHByZXNzaW9uLmdldFNvdXJjZUZpbGUoKS50ZXh0O1xuICAgICAgICB0ZW1wbGF0ZUxpdGVyYWwgPSB0ZW1wbGF0ZS5leHByZXNzaW9uO1xuICAgICAgICB0ZW1wbGF0ZVVybCA9IHRlbXBsYXRlLnRlbXBsYXRlVXJsO1xuICAgICAgICBlc2NhcGVkU3RyaW5nID0gdHJ1ZTtcbiAgICAgICAgc291cmNlTWFwcGluZyA9IHtcbiAgICAgICAgICB0eXBlOiAnZGlyZWN0JyxcbiAgICAgICAgICBub2RlOiB0ZW1wbGF0ZS5leHByZXNzaW9uLFxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWRUZW1wbGF0ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHRlbXBsYXRlLmV4cHJlc3Npb24pO1xuICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkVGVtcGxhdGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgdGVtcGxhdGUuZXhwcmVzc2lvbiwgcmVzb2x2ZWRUZW1wbGF0ZSwgJ3RlbXBsYXRlIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgICAgfVxuICAgICAgICB0ZW1wbGF0ZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgICAgIHNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgICAgdHlwZTogJ2luZGlyZWN0JyxcbiAgICAgICAgICBub2RlOiB0ZW1wbGF0ZS5leHByZXNzaW9uLFxuICAgICAgICAgIGNvbXBvbmVudENsYXNzOiBub2RlLFxuICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVN0cixcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4udGhpcy5fcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgdGVtcGxhdGVTdHIsIHRlbXBsYXRlUmFuZ2UsIGVzY2FwZWRTdHJpbmcpLFxuICAgICAgICBzb3VyY2VNYXBwaW5nLFxuICAgICAgICBkZWNsYXJhdGlvbjogdGVtcGxhdGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVN0ciA9IHRoaXMucmVzb3VyY2VMb2FkZXIubG9hZCh0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsKTtcbiAgICAgIGlmICh0aGlzLmRlcFRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5kZXBUcmFja2VyLmFkZFJlc291cmNlRGVwZW5kZW5jeShcbiAgICAgICAgICAgIG5vZGUuZ2V0U291cmNlRmlsZSgpLCBhYnNvbHV0ZUZyb20odGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAuLi50aGlzLl9wYXJzZVRlbXBsYXRlKFxuICAgICAgICAgICAgdGVtcGxhdGUsIHRlbXBsYXRlU3RyLCAvKiB0ZW1wbGF0ZVJhbmdlICovIG51bGwsXG4gICAgICAgICAgICAvKiBlc2NhcGVkU3RyaW5nICovIGZhbHNlKSxcbiAgICAgICAgc291cmNlTWFwcGluZzoge1xuICAgICAgICAgIHR5cGU6ICdleHRlcm5hbCcsXG4gICAgICAgICAgY29tcG9uZW50Q2xhc3M6IG5vZGUsXG4gICAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBUUyBpbiBnMyBpcyB1bmFibGUgdG8gbWFrZSB0aGlzIGluZmVyZW5jZSBvbiBpdHMgb3duLCBzbyBjYXN0IGl0IGhlcmVcbiAgICAgICAgICAvLyB1bnRpbCBnMyBpcyBhYmxlIHRvIGZpZ3VyZSB0aGlzIG91dC5cbiAgICAgICAgICBub2RlOiAodGVtcGxhdGUgYXMgRXh0ZXJuYWxUZW1wbGF0ZURlY2xhcmF0aW9uKS50ZW1wbGF0ZVVybEV4cHJlc3Npb24sXG4gICAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlU3RyLFxuICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsLFxuICAgICAgICB9LFxuICAgICAgICBkZWNsYXJhdGlvbjogdGVtcGxhdGUsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3BhcnNlVGVtcGxhdGUoXG4gICAgICB0ZW1wbGF0ZTogVGVtcGxhdGVEZWNsYXJhdGlvbiwgdGVtcGxhdGVTdHI6IHN0cmluZywgdGVtcGxhdGVSYW5nZTogTGV4ZXJSYW5nZXxudWxsLFxuICAgICAgZXNjYXBlZFN0cmluZzogYm9vbGVhbik6IFBhcnNlZENvbXBvbmVudFRlbXBsYXRlIHtcbiAgICAvLyBXZSBhbHdheXMgbm9ybWFsaXplIGxpbmUgZW5kaW5ncyBpZiB0aGUgdGVtcGxhdGUgaGFzIGJlZW4gZXNjYXBlZCAoaS5lLiBpcyBpbmxpbmUpLlxuICAgIGNvbnN0IGkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyA9IGVzY2FwZWRTdHJpbmcgfHwgdGhpcy5pMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM7XG5cbiAgICBjb25zdCBwYXJzZWRUZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUodGVtcGxhdGVTdHIsIHRlbXBsYXRlLnNvdXJjZU1hcFVybCwge1xuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczogdGVtcGxhdGUucHJlc2VydmVXaGl0ZXNwYWNlcyxcbiAgICAgIGludGVycG9sYXRpb25Db25maWc6IHRlbXBsYXRlLmludGVycG9sYXRpb25Db25maWcsXG4gICAgICByYW5nZTogdGVtcGxhdGVSYW5nZSA/PyB1bmRlZmluZWQsXG4gICAgICBlc2NhcGVkU3RyaW5nLFxuICAgICAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogdGhpcy5lbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0LFxuICAgICAgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLFxuICAgICAgaXNJbmxpbmU6IHRlbXBsYXRlLmlzSW5saW5lLFxuICAgIH0pO1xuXG4gICAgLy8gVW5mb3J0dW5hdGVseSwgdGhlIHByaW1hcnkgcGFyc2Ugb2YgdGhlIHRlbXBsYXRlIGFib3ZlIG1heSBub3QgY29udGFpbiBhY2N1cmF0ZSBzb3VyY2UgbWFwXG4gICAgLy8gaW5mb3JtYXRpb24uIElmIHVzZWQgZGlyZWN0bHksIGl0IHdvdWxkIHJlc3VsdCBpbiBpbmNvcnJlY3QgY29kZSBsb2NhdGlvbnMgaW4gdGVtcGxhdGVcbiAgICAvLyBlcnJvcnMsIGV0Yy4gVGhlcmUgYXJlIHRocmVlIG1haW4gcHJvYmxlbXM6XG4gICAgLy9cbiAgICAvLyAxLiBgcHJlc2VydmVXaGl0ZXNwYWNlczogZmFsc2VgIGFubmloaWxhdGVzIHRoZSBjb3JyZWN0bmVzcyBvZiB0ZW1wbGF0ZSBzb3VyY2UgbWFwcGluZywgYXNcbiAgICAvLyAgICB0aGUgd2hpdGVzcGFjZSB0cmFuc2Zvcm1hdGlvbiBjaGFuZ2VzIHRoZSBjb250ZW50cyBvZiBIVE1MIHRleHQgbm9kZXMgYmVmb3JlIHRoZXkncmVcbiAgICAvLyAgICBwYXJzZWQgaW50byBBbmd1bGFyIGV4cHJlc3Npb25zLlxuICAgIC8vIDIuIGBwcmVzZXJ2ZUxpbmVFbmRpbmdzOiBmYWxzZWAgY2F1c2VzIGdyb3dpbmcgbWlzYWxpZ25tZW50cyBpbiB0ZW1wbGF0ZXMgdGhhdCB1c2UgJ1xcclxcbidcbiAgICAvLyAgICBsaW5lIGVuZGluZ3MsIGJ5IG5vcm1hbGl6aW5nIHRoZW0gdG8gJ1xcbicuXG4gICAgLy8gMy4gQnkgZGVmYXVsdCwgdGhlIHRlbXBsYXRlIHBhcnNlciBzdHJpcHMgbGVhZGluZyB0cml2aWEgY2hhcmFjdGVycyAobGlrZSBzcGFjZXMsIHRhYnMsIGFuZFxuICAgIC8vICAgIG5ld2xpbmVzKS4gVGhpcyBhbHNvIGRlc3Ryb3lzIHNvdXJjZSBtYXBwaW5nIGluZm9ybWF0aW9uLlxuICAgIC8vXG4gICAgLy8gSW4gb3JkZXIgdG8gZ3VhcmFudGVlIHRoZSBjb3JyZWN0bmVzcyBvZiBkaWFnbm9zdGljcywgdGVtcGxhdGVzIGFyZSBwYXJzZWQgYSBzZWNvbmQgdGltZVxuICAgIC8vIHdpdGggdGhlIGFib3ZlIG9wdGlvbnMgc2V0IHRvIHByZXNlcnZlIHNvdXJjZSBtYXBwaW5ncy5cblxuICAgIGNvbnN0IHtub2RlczogZGlhZ05vZGVzfSA9IHBhcnNlVGVtcGxhdGUodGVtcGxhdGVTdHIsIHRlbXBsYXRlLnNvdXJjZU1hcFVybCwge1xuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczogdHJ1ZSxcbiAgICAgIHByZXNlcnZlTGluZUVuZGluZ3M6IHRydWUsXG4gICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnOiB0ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uQ29uZmlnLFxuICAgICAgcmFuZ2U6IHRlbXBsYXRlUmFuZ2UgPz8gdW5kZWZpbmVkLFxuICAgICAgZXNjYXBlZFN0cmluZyxcbiAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IHRoaXMuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICAgIGkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyxcbiAgICAgIGxlYWRpbmdUcml2aWFDaGFyczogW10sXG4gICAgICBpc0lubGluZTogdGVtcGxhdGUuaXNJbmxpbmUsXG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4ucGFyc2VkVGVtcGxhdGUsXG4gICAgICBkaWFnTm9kZXMsXG4gICAgICB0ZW1wbGF0ZTogdGVtcGxhdGUuaXNJbmxpbmUgPyBuZXcgV3JhcHBlZE5vZGVFeHByKHRlbXBsYXRlLmV4cHJlc3Npb24pIDogdGVtcGxhdGVTdHIsXG4gICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybCxcbiAgICAgIGlzSW5saW5lOiB0ZW1wbGF0ZS5pc0lubGluZSxcbiAgICAgIGZpbGU6IG5ldyBQYXJzZVNvdXJjZUZpbGUodGVtcGxhdGVTdHIsIHRlbXBsYXRlLnJlc29sdmVkVGVtcGxhdGVVcmwpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHBhcnNlVGVtcGxhdGVEZWNsYXJhdGlvbihcbiAgICAgIGRlY29yYXRvcjogRGVjb3JhdG9yLCBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICAgICAgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IFRlbXBsYXRlRGVjbGFyYXRpb24ge1xuICAgIGxldCBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuID0gdGhpcy5kZWZhdWx0UHJlc2VydmVXaGl0ZXNwYWNlcztcbiAgICBpZiAoY29tcG9uZW50LmhhcygncHJlc2VydmVXaGl0ZXNwYWNlcycpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgncHJlc2VydmVXaGl0ZXNwYWNlcycpITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihleHByLCB2YWx1ZSwgJ3ByZXNlcnZlV2hpdGVzcGFjZXMgbXVzdCBiZSBhIGJvb2xlYW4nKTtcbiAgICAgIH1cbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBsZXQgaW50ZXJwb2xhdGlvbkNvbmZpZyA9IERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUc7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ2ludGVycG9sYXRpb24nKSkge1xuICAgICAgY29uc3QgZXhwciA9IGNvbXBvbmVudC5nZXQoJ2ludGVycG9sYXRpb24nKSE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZS5sZW5ndGggIT09IDIgfHxcbiAgICAgICAgICAhdmFsdWUuZXZlcnkoZWxlbWVudCA9PiB0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBleHByLCB2YWx1ZSwgJ2ludGVycG9sYXRpb24gbXVzdCBiZSBhbiBhcnJheSB3aXRoIDIgZWxlbWVudHMgb2Ygc3RyaW5nIHR5cGUnKTtcbiAgICAgIH1cbiAgICAgIGludGVycG9sYXRpb25Db25maWcgPSBJbnRlcnBvbGF0aW9uQ29uZmlnLmZyb21BcnJheSh2YWx1ZSBhcyBbc3RyaW5nLCBzdHJpbmddKTtcbiAgICB9XG5cbiAgICBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGVVcmwnKSkge1xuICAgICAgY29uc3QgdGVtcGxhdGVVcmxFeHByID0gY29tcG9uZW50LmdldCgndGVtcGxhdGVVcmwnKSE7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybCA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHRlbXBsYXRlVXJsRXhwcik7XG4gICAgICBpZiAodHlwZW9mIHRlbXBsYXRlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgdGVtcGxhdGVVcmxFeHByLCB0ZW1wbGF0ZVVybCwgJ3RlbXBsYXRlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5fcmVzb2x2ZVJlc291cmNlT3JUaHJvdyhcbiAgICAgICAgICB0ZW1wbGF0ZVVybCwgY29udGFpbmluZ0ZpbGUsIHRlbXBsYXRlVXJsRXhwciwgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuVGVtcGxhdGUpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc0lubGluZTogZmFsc2UsXG4gICAgICAgIGludGVycG9sYXRpb25Db25maWcsXG4gICAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgICAgIHRlbXBsYXRlVXJsLFxuICAgICAgICB0ZW1wbGF0ZVVybEV4cHJlc3Npb246IHRlbXBsYXRlVXJsRXhwcixcbiAgICAgICAgcmVzb2x2ZWRUZW1wbGF0ZVVybDogcmVzb3VyY2VVcmwsXG4gICAgICAgIHNvdXJjZU1hcFVybDogc291cmNlTWFwVXJsKHJlc291cmNlVXJsKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpc0lubGluZTogdHJ1ZSxcbiAgICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyxcbiAgICAgICAgZXhwcmVzc2lvbjogY29tcG9uZW50LmdldCgndGVtcGxhdGUnKSEsXG4gICAgICAgIHRlbXBsYXRlVXJsOiBjb250YWluaW5nRmlsZSxcbiAgICAgICAgcmVzb2x2ZWRUZW1wbGF0ZVVybDogY29udGFpbmluZ0ZpbGUsXG4gICAgICAgIHNvdXJjZU1hcFVybDogY29udGFpbmluZ0ZpbGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9NSVNTSU5HX1RFTVBMQVRFLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgJ2NvbXBvbmVudCBpcyBtaXNzaW5nIGEgdGVtcGxhdGUnKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9leHByZXNzaW9uVG9JbXBvcnRlZEZpbGUoZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICBpZiAoIShleHByIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRmlndXJlIG91dCB3aGF0IGZpbGUgaXMgYmVpbmcgaW1wb3J0ZWQuXG4gICAgcmV0dXJuIHRoaXMubW9kdWxlUmVzb2x2ZXIucmVzb2x2ZU1vZHVsZShleHByLnZhbHVlLm1vZHVsZU5hbWUhLCBvcmlnaW4uZmlsZU5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYWRkaW5nIGFuIGltcG9ydCBmcm9tIGBvcmlnaW5gIHRvIHRoZSBzb3VyY2UtZmlsZSBjb3JyZXNwb25kaW5nIHRvIGBleHByYCB3b3VsZFxuICAgKiBjcmVhdGUgYSBjeWNsaWMgaW1wb3J0LlxuICAgKlxuICAgKiBAcmV0dXJucyBhIGBDeWNsZWAgb2JqZWN0IGlmIGEgY3ljbGUgd291bGQgYmUgY3JlYXRlZCwgb3RoZXJ3aXNlIGBudWxsYC5cbiAgICovXG4gIHByaXZhdGUgX2NoZWNrRm9yQ3ljbGljSW1wb3J0KHJlZjogUmVmZXJlbmNlLCBleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOiBDeWNsZVxuICAgICAgfG51bGwge1xuICAgIGNvbnN0IGltcG9ydGVkRmlsZSA9IHRoaXMuX2V4cHJlc3Npb25Ub0ltcG9ydGVkRmlsZShleHByLCBvcmlnaW4pO1xuICAgIGlmIChpbXBvcnRlZEZpbGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSBpbXBvcnQgaXMgbGVnYWwuXG4gICAgcmV0dXJuIHRoaXMuY3ljbGVBbmFseXplci53b3VsZENyZWF0ZUN5Y2xlKG9yaWdpbiwgaW1wb3J0ZWRGaWxlKTtcbiAgfVxuXG4gIHByaXZhdGUgX3JlY29yZFN5bnRoZXRpY0ltcG9ydChleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBpbXBvcnRlZCA9IHRoaXMuX2V4cHJlc3Npb25Ub0ltcG9ydGVkRmlsZShleHByLCBvcmlnaW4pO1xuICAgIGlmIChpbXBvcnRlZCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY3ljbGVBbmFseXplci5yZWNvcmRTeW50aGV0aWNJbXBvcnQob3JpZ2luLCBpbXBvcnRlZCk7XG4gIH1cblxuICAvKipcbiAgICogUmVzb2x2ZSB0aGUgdXJsIG9mIGEgcmVzb3VyY2UgcmVsYXRpdmUgdG8gdGhlIGZpbGUgdGhhdCBjb250YWlucyB0aGUgcmVmZXJlbmNlIHRvIGl0LlxuICAgKlxuICAgKiBUaHJvd3MgYSBGYXRhbERpYWdub3N0aWNFcnJvciB3aGVuIHVuYWJsZSB0byByZXNvbHZlIHRoZSBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVzb2x2ZVJlc291cmNlT3JUaHJvdyhcbiAgICAgIGZpbGU6IHN0cmluZywgYmFzZVBhdGg6IHN0cmluZywgbm9kZUZvckVycm9yOiB0cy5Ob2RlLFxuICAgICAgcmVzb3VyY2VUeXBlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcyk6IHN0cmluZyB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUoZmlsZSwgYmFzZVBhdGgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxldCBlcnJvclRleHQ6IHN0cmluZztcbiAgICAgIHN3aXRjaCAocmVzb3VyY2VUeXBlKSB7XG4gICAgICAgIGNhc2UgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuVGVtcGxhdGU6XG4gICAgICAgICAgZXJyb3JUZXh0ID0gYENvdWxkIG5vdCBmaW5kIHRlbXBsYXRlIGZpbGUgJyR7ZmlsZX0nLmA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZTpcbiAgICAgICAgICBlcnJvclRleHQgPSBgQ291bGQgbm90IGZpbmQgc3R5bGVzaGVldCBmaWxlICcke2ZpbGV9JyBsaW5rZWQgZnJvbSB0aGUgdGVtcGxhdGUuYDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcjpcbiAgICAgICAgICBlcnJvclRleHQgPSBgQ291bGQgbm90IGZpbmQgc3R5bGVzaGVldCBmaWxlICcke2ZpbGV9Jy5gO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9SRVNPVVJDRV9OT1RfRk9VTkQsIG5vZGVGb3JFcnJvciwgZXJyb3JUZXh0KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0VGVtcGxhdGVTdHlsZVVybHModGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZSk6IFN0eWxlVXJsTWV0YVtdIHtcbiAgICBpZiAodGVtcGxhdGUuc3R5bGVVcmxzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZUZvckVycm9yID0gZ2V0VGVtcGxhdGVEZWNsYXJhdGlvbk5vZGVGb3JFcnJvcih0ZW1wbGF0ZS5kZWNsYXJhdGlvbik7XG4gICAgcmV0dXJuIHRlbXBsYXRlLnN0eWxlVXJscy5tYXAoXG4gICAgICAgIHVybCA9PiAoe3VybCwgc291cmNlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbVRlbXBsYXRlLCBub2RlRm9yRXJyb3J9KSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VGVtcGxhdGVSYW5nZSh0ZW1wbGF0ZUV4cHI6IHRzLkV4cHJlc3Npb24pIHtcbiAgY29uc3Qgc3RhcnRQb3MgPSB0ZW1wbGF0ZUV4cHIuZ2V0U3RhcnQoKSArIDE7XG4gIGNvbnN0IHtsaW5lLCBjaGFyYWN0ZXJ9ID1cbiAgICAgIHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHRlbXBsYXRlRXhwci5nZXRTb3VyY2VGaWxlKCksIHN0YXJ0UG9zKTtcbiAgcmV0dXJuIHtcbiAgICBzdGFydFBvcyxcbiAgICBzdGFydExpbmU6IGxpbmUsXG4gICAgc3RhcnRDb2w6IGNoYXJhY3RlcixcbiAgICBlbmRQb3M6IHRlbXBsYXRlRXhwci5nZXRFbmQoKSAtIDEsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNvdXJjZU1hcFVybChyZXNvdXJjZVVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCF0c1NvdXJjZU1hcEJ1ZzI5MzAwRml4ZWQoKSkge1xuICAgIC8vIEJ5IHJlbW92aW5nIHRoZSB0ZW1wbGF0ZSBVUkwgd2UgYXJlIHRlbGxpbmcgdGhlIHRyYW5zbGF0b3Igbm90IHRvIHRyeSB0b1xuICAgIC8vIG1hcCB0aGUgZXh0ZXJuYWwgc291cmNlIGZpbGUgdG8gdGhlIGdlbmVyYXRlZCBjb2RlLCBzaW5jZSB0aGUgdmVyc2lvblxuICAgIC8vIG9mIFRTIHRoYXQgaXMgcnVubmluZyBkb2VzIG5vdCBzdXBwb3J0IGl0LlxuICAgIHJldHVybiAnJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmVzb3VyY2VVcmw7XG4gIH1cbn1cblxuLyoqIERldGVybWluZXMgaWYgdGhlIHJlc3VsdCBvZiBhbiBldmFsdWF0aW9uIGlzIGEgc3RyaW5nIGFycmF5LiAqL1xuZnVuY3Rpb24gaXNTdHJpbmdBcnJheShyZXNvbHZlZFZhbHVlOiBSZXNvbHZlZFZhbHVlKTogcmVzb2x2ZWRWYWx1ZSBpcyBzdHJpbmdbXSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHJlc29sdmVkVmFsdWUpICYmIHJlc29sdmVkVmFsdWUuZXZlcnkoZWxlbSA9PiB0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycpO1xufVxuXG4vKiogRGV0ZXJtaW5lcyB0aGUgbm9kZSB0byB1c2UgZm9yIGRlYnVnZ2luZyBwdXJwb3NlcyBmb3IgdGhlIGdpdmVuIFRlbXBsYXRlRGVjbGFyYXRpb24uICovXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZURlY2xhcmF0aW9uTm9kZUZvckVycm9yKGRlY2xhcmF0aW9uOiBUZW1wbGF0ZURlY2xhcmF0aW9uKTogdHMuTm9kZSB7XG4gIC8vIFRPRE8oemFyZW5kKTogQ2hhbmdlIHRoaXMgdG8gaWYvZWxzZSB3aGVuIHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIGczLiBUaGlzIHVzZXMgYSBzd2l0Y2hcbiAgLy8gYmVjYXVzZSBpZi9lbHNlIGZhaWxzIHRvIGNvbXBpbGUgb24gZzMuIFRoYXQgaXMgYmVjYXVzZSBnMyBjb21waWxlcyB0aGlzIGluIG5vbi1zdHJpY3QgbW9kZVxuICAvLyB3aGVyZSB0eXBlIGluZmVyZW5jZSBkb2VzIG5vdCB3b3JrIGNvcnJlY3RseS5cbiAgc3dpdGNoIChkZWNsYXJhdGlvbi5pc0lubGluZSkge1xuICAgIGNhc2UgdHJ1ZTpcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbi5leHByZXNzaW9uO1xuICAgIGNhc2UgZmFsc2U6XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb24udGVtcGxhdGVVcmxFeHByZXNzaW9uO1xuICB9XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRlbXBsYXRlIHdoaWNoIHdhcyBleHRyYWN0ZWQgZHVyaW5nIHBhcnNpbmcuXG4gKlxuICogVGhpcyBjb250YWlucyB0aGUgYWN0dWFsIHBhcnNlZCB0ZW1wbGF0ZSBhcyB3ZWxsIGFzIGFueSBtZXRhZGF0YSBjb2xsZWN0ZWQgZHVyaW5nIGl0cyBwYXJzaW5nLFxuICogc29tZSBvZiB3aGljaCBtaWdodCBiZSB1c2VmdWwgZm9yIHJlLXBhcnNpbmcgdGhlIHRlbXBsYXRlIHdpdGggZGlmZmVyZW50IG9wdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkQ29tcG9uZW50VGVtcGxhdGUgZXh0ZW5kcyBQYXJzZWRUZW1wbGF0ZSB7XG4gIC8qKlxuICAgKiBUcnVlIGlmIHRoZSBvcmlnaW5hbCB0ZW1wbGF0ZSB3YXMgc3RvcmVkIGlubGluZTtcbiAgICogRmFsc2UgaWYgdGhlIHRlbXBsYXRlIHdhcyBpbiBhbiBleHRlcm5hbCBmaWxlLlxuICAgKi9cbiAgaXNJbmxpbmU6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSB0ZW1wbGF0ZSBBU1QsIHBhcnNlZCBpbiBhIG1hbm5lciB3aGljaCBwcmVzZXJ2ZXMgc291cmNlIG1hcCBpbmZvcm1hdGlvbiBmb3IgZGlhZ25vc3RpY3MuXG4gICAqXG4gICAqIE5vdCB1c2VmdWwgZm9yIGVtaXQuXG4gICAqL1xuICBkaWFnTm9kZXM6IFRtcGxBc3ROb2RlW107XG5cbiAgLyoqXG4gICAqIFRoZSBgUGFyc2VTb3VyY2VGaWxlYCBmb3IgdGhlIHRlbXBsYXRlLlxuICAgKi9cbiAgZmlsZTogUGFyc2VTb3VyY2VGaWxlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZSBleHRlbmRzIFBhcnNlZENvbXBvbmVudFRlbXBsYXRlIHtcbiAgc291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuICBkZWNsYXJhdGlvbjogVGVtcGxhdGVEZWNsYXJhdGlvbjtcbn1cblxuLyoqXG4gKiBDb21tb24gZmllbGRzIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNsYXJhdGlvbiBvZiBhIHRlbXBsYXRlLlxuICovXG5pbnRlcmZhY2UgQ29tbW9uVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gIHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW47XG4gIGludGVycG9sYXRpb25Db25maWc6IEludGVycG9sYXRpb25Db25maWc7XG4gIHRlbXBsYXRlVXJsOiBzdHJpbmc7XG4gIHJlc29sdmVkVGVtcGxhdGVVcmw6IHN0cmluZztcbiAgc291cmNlTWFwVXJsOiBzdHJpbmc7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gZXh0cmFjdGVkIGZyb20gdGhlIGRlY2xhcmF0aW9uIG9mIGFuIGlubGluZSB0ZW1wbGF0ZS5cbiAqL1xuaW50ZXJmYWNlIElubGluZVRlbXBsYXRlRGVjbGFyYXRpb24gZXh0ZW5kcyBDb21tb25UZW1wbGF0ZURlY2xhcmF0aW9uIHtcbiAgaXNJbmxpbmU6IHRydWU7XG4gIGV4cHJlc3Npb246IHRzLkV4cHJlc3Npb247XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gZXh0cmFjdGVkIGZyb20gdGhlIGRlY2xhcmF0aW9uIG9mIGFuIGV4dGVybmFsIHRlbXBsYXRlLlxuICovXG5pbnRlcmZhY2UgRXh0ZXJuYWxUZW1wbGF0ZURlY2xhcmF0aW9uIGV4dGVuZHMgQ29tbW9uVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gIGlzSW5saW5lOiBmYWxzZTtcbiAgdGVtcGxhdGVVcmxFeHByZXNzaW9uOiB0cy5FeHByZXNzaW9uO1xufVxuXG4vKipcbiAqIFRoZSBkZWNsYXJhdGlvbiBvZiBhIHRlbXBsYXRlIGV4dHJhY3RlZCBmcm9tIGEgY29tcG9uZW50IGRlY29yYXRvci5cbiAqXG4gKiBUaGlzIGRhdGEgaXMgZXh0cmFjdGVkIGFuZCBzdG9yZWQgc2VwYXJhdGVseSB0byBmYWNpbGlhdGUgcmUtaW50ZXJwcmV0aW5nIHRoZSB0ZW1wbGF0ZVxuICogZGVjbGFyYXRpb24gd2hlbmV2ZXIgdGhlIGNvbXBpbGVyIGlzIG5vdGlmaWVkIG9mIGEgY2hhbmdlIHRvIGEgdGVtcGxhdGUgZmlsZS4gV2l0aCB0aGlzXG4gKiBpbmZvcm1hdGlvbiwgYENvbXBvbmVudERlY29yYXRvckhhbmRsZXJgIGlzIGFibGUgdG8gcmUtcmVhZCB0aGUgdGVtcGxhdGUgYW5kIHVwZGF0ZSB0aGUgY29tcG9uZW50XG4gKiByZWNvcmQgd2l0aG91dCBuZWVkaW5nIHRvIHBhcnNlIHRoZSBvcmlnaW5hbCBkZWNvcmF0b3IgYWdhaW4uXG4gKi9cbnR5cGUgVGVtcGxhdGVEZWNsYXJhdGlvbiA9IElubGluZVRlbXBsYXRlRGVjbGFyYXRpb258RXh0ZXJuYWxUZW1wbGF0ZURlY2xhcmF0aW9uO1xuXG4vKipcbiAqIEdlbmVyYXRlIGEgZGlhZ25vc3RpYyByZWxhdGVkIGluZm9ybWF0aW9uIG9iamVjdCB0aGF0IGRlc2NyaWJlcyBhIHBvdGVudGlhbCBjeWNsaWMgaW1wb3J0IHBhdGguXG4gKi9cbmZ1bmN0aW9uIG1ha2VDeWNsaWNJbXBvcnRJbmZvKFxuICAgIHJlZjogUmVmZXJlbmNlLCB0eXBlOiBzdHJpbmcsIGN5Y2xlOiBDeWNsZSk6IHRzLkRpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb24ge1xuICBjb25zdCBuYW1lID0gcmVmLmRlYnVnTmFtZSB8fCAnKHVua25vd24pJztcbiAgY29uc3QgcGF0aCA9IGN5Y2xlLmdldFBhdGgoKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpLmpvaW4oJyAtPiAnKTtcbiAgY29uc3QgbWVzc2FnZSA9XG4gICAgICBgVGhlICR7dHlwZX0gJyR7bmFtZX0nIGlzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIGJ1dCBpbXBvcnRpbmcgaXQgd291bGQgY3JlYXRlIGEgY3ljbGU6IGA7XG4gIHJldHVybiBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKHJlZi5ub2RlLCBtZXNzYWdlICsgcGF0aCk7XG59XG4iXX0=