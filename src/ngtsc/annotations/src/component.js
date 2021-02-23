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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var ts_source_map_bug_29300_1 = require("@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
    var directive_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/directive");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var ng_module_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module");
    var util_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
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
                return util_1.isReferenceEqual(current, previous) && !publicApiAffected.has(current.symbol);
            };
            // The emit of a component is affected if either of the following is true:
            //  1. The component used to be remotely scoped but no longer is, or vice versa.
            //  2. The list of used directives has changed or any of those directives have had their public
            //     API changed. If the used directives have been reordered but not otherwise affected then
            //     the component must still be re-emitted, as this may affect directive instantiation order.
            //  3. The list of used pipes has changed, or any of those pipes have had their public API
            //     changed.
            return this.isRemotelyScoped !== previousSymbol.isRemotelyScoped ||
                !util_1.isArrayEqual(this.usedDirectives, previousSymbol.usedDirectives, isSymbolAffected) ||
                !util_1.isArrayEqual(this.usedPipes, previousSymbol.usedPipes, isSymbolAffected);
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
            var decorator = util_2.findAngularDecorator(decorators, 'Component', this.isCore);
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
                    util_2.resolveProvidersRequiringFactory(viewProviders, this.reflector, this.evaluator);
                wrappedViewProviders = new compiler_1.WrappedNodeExpr(this.annotateForClosureCompiler ? util_2.wrapFunctionExpressionsInParens(viewProviders) :
                    viewProviders);
            }
            if (component.has('providers')) {
                providersRequiringFactory = util_2.resolveProvidersRequiringFactory(component.get('providers'), this.reflector, this.evaluator);
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
                    baseClass: util_2.readBaseClass(node, this.reflector, this.evaluator),
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
                    var wrapDirectivesAndPipesInClosure = usedDirectives.some(function (dir) { return util_2.isExpressionForwardReference(dir.type, node.name, context); }) ||
                        usedPipes.some(function (pipe) { return util_2.isExpressionForwardReference(pipe.expression, node.name, context); });
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
            var meta = util_2.unwrapExpression(decorator.args[0]);
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
                if (value instanceof partial_evaluator_1.EnumValue && util_2.isAngularCoreReference(value.enumRef, enumSymbolName)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb2Y7SUFDcGYsK0JBQWlDO0lBR2pDLDJFQUEwRztJQUMxRywyRUFBeUQ7SUFDekQsbUVBQWlHO0lBR2pHLHFFQUFxTztJQUVyTyxvRkFBaUY7SUFDakYsdUZBQW1GO0lBQ25GLHlFQUFvSDtJQUVwSCx1RUFBOEk7SUFFOUksNEdBQWdGO0lBSWhGLDJGQUE0RztJQUM1Ryx1RkFBNEY7SUFDNUYsbUZBQW1EO0lBQ25ELHFGQUF3RDtJQUN4RCx1RkFBMkM7SUFDM0MsNkVBQXNNO0lBRXRNLElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0lBQ2hELElBQU0sV0FBVyxHQUFVLEVBQUUsQ0FBQztJQStFOUI7O09BRUc7SUFDSDtRQUFxQywyQ0FBZTtRQUFwRDtZQUFBLHFFQTJCQztZQTFCQyxvQkFBYyxHQUF3QixFQUFFLENBQUM7WUFDekMsZUFBUyxHQUF3QixFQUFFLENBQUM7WUFDcEMsc0JBQWdCLEdBQUcsS0FBSyxDQUFDOztRQXdCM0IsQ0FBQztRQXRCQyx3Q0FBYyxHQUFkLFVBQWUsY0FBOEIsRUFBRSxpQkFBc0M7WUFDbkYsSUFBSSxDQUFDLENBQUMsY0FBYyxZQUFZLGVBQWUsQ0FBQyxFQUFFO2dCQUNoRCxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsc0ZBQXNGO1lBQ3RGLDhGQUE4RjtZQUM5RixZQUFZO1lBQ1osSUFBTSxnQkFBZ0IsR0FBRyxVQUFDLE9BQTBCLEVBQUUsUUFBMkI7Z0JBQzdFLE9BQUEsdUJBQWdCLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMs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LFVBQUEsSUFBSSxJQUFJLE9BQUEsT0FBTyxJQUFJLEtBQUssUUFBUSxFQUF4QixDQUF3QixDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUVELDJGQUEyRjtJQUMzRixTQUFTLGtDQUFrQyxDQUFDLFdBQWdDO1FBQzFFLDJGQUEyRjtRQUMzRiw4RkFBOEY7UUFDOUYsZ0RBQWdEO1FBQ2hELFFBQVEsV0FBVyxDQUFDLFFBQVEsRUFBRTtZQUM1QixLQUFLLElBQUk7Z0JBQ1AsT0FBTyxXQUFXLENBQUMsVUFBVSxDQUFDO1lBQ2hDLEtBQUssS0FBSztnQkFDUixPQUFPLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQztTQUM1QztJQUNILENBQUM7SUFzRUQ7O09BRUc7SUFDSCxTQUFTLG9CQUFvQixDQUN6QixHQUFjLEVBQUUsSUFBWSxFQUFFLEtBQVk7UUFDNUMsSUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsSUFBSSxXQUFXLENBQUM7UUFDMUMsSUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEVBQUUsQ0FBQyxRQUFRLEVBQVgsQ0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pFLElBQU0sT0FBTyxHQUNULFNBQU8sSUFBSSxVQUFLLElBQUksc0VBQW1FLENBQUM7UUFDNUYsT0FBTyxvQ0FBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMxRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YSwgY29tcGlsZURlY2xhcmVDb21wb25lbnRGcm9tTWV0YWRhdGEsIENvbnN0YW50UG9vbCwgQ3NzU2VsZWN0b3IsIERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLCBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgSWRlbnRpZmllcnMsIEludGVycG9sYXRpb25Db25maWcsIExleGVyUmFuZ2UsIG1ha2VCaW5kaW5nUGFyc2VyLCBQYXJzZWRUZW1wbGF0ZSwgUGFyc2VTb3VyY2VGaWxlLCBwYXJzZVRlbXBsYXRlLCBSM0NvbXBvbmVudERlZiwgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNGYWN0b3J5VGFyZ2V0LCBSM1RhcmdldEJpbmRlciwgUjNVc2VkRGlyZWN0aXZlTWV0YWRhdGEsIFNlbGVjdG9yTWF0Y2hlciwgU3RhdGVtZW50LCBUbXBsQXN0Tm9kZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDeWNsZSwgQ3ljbGVBbmFseXplciwgQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5fSBmcm9tICcuLi8uLi9jeWNsZXMnO1xuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yLCBtYWtlRGlhZ25vc3RpYywgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIHJlbGF0aXZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgTW9kdWxlUmVzb2x2ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RlcGVuZGVuY3lUcmFja2VyfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtJbmRleGluZ0NvbnRleHR9IGZyb20gJy4uLy4uL2luZGV4ZXInO1xuaW1wb3J0IHtDbGFzc1Byb3BlcnR5TWFwcGluZywgQ29tcG9uZW50UmVzb3VyY2VzLCBEaXJlY3RpdmVNZXRhLCBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBleHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YSwgSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5LCBSZXNvdXJjZSwgUmVzb3VyY2VSZWdpc3RyeX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtTZW1hbnRpY0RlcEdyYXBoVXBkYXRlciwgU2VtYW50aWNSZWZlcmVuY2UsIFNlbWFudGljU3ltYm9sfSBmcm9tICcuLi8uLi9uZ21vZHVsZV9zZW1hbnRpY3MnO1xuaW1wb3J0IHtpc0FycmF5RXF1YWwsIGlzUmVmZXJlbmNlRXF1YWx9IGZyb20gJy4uLy4uL25nbW9kdWxlX3NlbWFudGljcy9zcmMvdXRpbCc7XG5pbXBvcnQge0VudW1WYWx1ZSwgUGFydGlhbEV2YWx1YXRvciwgUmVzb2x2ZWRWYWx1ZX0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbk5vZGUsIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXIsIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgVHlwZUNoZWNrU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyRmxhZ3MsIEhhbmRsZXJQcmVjZWRlbmNlLCBSZXNvbHZlUmVzdWx0fSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIFR5cGVDaGVja0NvbnRleHR9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9hcGknO1xuaW1wb3J0IHt0c1NvdXJjZU1hcEJ1ZzI5MzAwRml4ZWR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3RzX3NvdXJjZV9tYXBfYnVnXzI5MzAwJztcbmltcG9ydCB7U3Vic2V0T2ZLZXlzfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yLCBnZXREaXJlY3RpdmVEaWFnbm9zdGljcywgZ2V0UHJvdmlkZXJEaWFnbm9zdGljc30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RpcmVjdGl2ZVN5bWJvbCwgZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhLCBwYXJzZUZpZWxkQXJyYXlWYWx1ZX0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHtjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtOZ01vZHVsZVN5bWJvbH0gZnJvbSAnLi9uZ19tb2R1bGUnO1xuaW1wb3J0IHtmaW5kQW5ndWxhckRlY29yYXRvciwgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSwgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgcmVhZEJhc2VDbGFzcywgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIHVud3JhcEV4cHJlc3Npb24sIHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnN9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX01BUCA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuY29uc3QgRU1QVFlfQVJSQVk6IGFueVtdID0gW107XG5cbi8qKlxuICogVGhlc2UgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCBhcmUgdXBkYXRlZCBpbiB0aGUgYHJlc29sdmVgIHBoYXNlLlxuICpcbiAqIFRoZSBga2V5b2YgUjNDb21wb25lbnRNZXRhZGF0YSAmYCBjb25kaXRpb24gZW5zdXJlcyB0aGF0IG9ubHkgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCBjYW5cbiAqIGJlIGluY2x1ZGVkIGhlcmUuXG4gKi9cbmV4cG9ydCB0eXBlIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHMgPVxuICAgIFN1YnNldE9mS2V5czxSM0NvbXBvbmVudE1ldGFkYXRhLCAnZGlyZWN0aXZlcyd8J3BpcGVzJ3wnZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUnPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRBbmFseXNpc0RhdGEge1xuICAvKipcbiAgICogYG1ldGFgIGluY2x1ZGVzIHRob3NlIGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgd2hpY2ggYXJlIGNhbGN1bGF0ZWQgYXQgYGFuYWx5emVgIHRpbWVcbiAgICogKG5vdCBkdXJpbmcgcmVzb2x2ZSkuXG4gICAqL1xuICBtZXRhOiBPbWl0PFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuICBiYXNlQ2xhc3M6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPnwnZHluYW1pYyd8bnVsbDtcbiAgdHlwZUNoZWNrTWV0YTogRGlyZWN0aXZlVHlwZUNoZWNrTWV0YTtcbiAgdGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcblxuICBpbnB1dHM6IENsYXNzUHJvcGVydHlNYXBwaW5nO1xuICBvdXRwdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZztcblxuICAvKipcbiAgICogUHJvdmlkZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBgcHJvdmlkZXJzYCBmaWVsZCBvZiB0aGUgY29tcG9uZW50IGFubm90YXRpb24gd2hpY2ggd2lsbCByZXF1aXJlXG4gICAqIGFuIEFuZ3VsYXIgZmFjdG9yeSBkZWZpbml0aW9uIGF0IHJ1bnRpbWUuXG4gICAqL1xuICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlcnMgZXh0cmFjdGVkIGZyb20gdGhlIGB2aWV3UHJvdmlkZXJzYCBmaWVsZCBvZiB0aGUgY29tcG9uZW50IGFubm90YXRpb24gd2hpY2ggd2lsbFxuICAgKiByZXF1aXJlIGFuIEFuZ3VsYXIgZmFjdG9yeSBkZWZpbml0aW9uIGF0IHJ1bnRpbWUuXG4gICAqL1xuICB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcblxuICByZXNvdXJjZXM6IENvbXBvbmVudFJlc291cmNlcztcblxuICAvKipcbiAgICogYHN0eWxlVXJsc2AgZXh0cmFjdGVkIGZyb20gdGhlIGRlY29yYXRvciwgaWYgcHJlc2VudC5cbiAgICovXG4gIHN0eWxlVXJsczogU3R5bGVVcmxNZXRhW118bnVsbDtcblxuICAvKipcbiAgICogSW5saW5lIHN0eWxlc2hlZXRzIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNvcmF0b3IsIGlmIHByZXNlbnQuXG4gICAqL1xuICBpbmxpbmVTdHlsZXM6IHN0cmluZ1tdfG51bGw7XG5cbiAgaXNQb2lzb25lZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgQ29tcG9uZW50UmVzb2x1dGlvbkRhdGEgPSBQaWNrPFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuXG4vKipcbiAqIFRoZSBsaXRlcmFsIHN0eWxlIHVybCBleHRyYWN0ZWQgZnJvbSB0aGUgZGVjb3JhdG9yLCBhbG9uZyB3aXRoIG1ldGFkYXRhIGZvciBkaWFnbm9zdGljcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdHlsZVVybE1ldGEge1xuICB1cmw6IHN0cmluZztcbiAgbm9kZUZvckVycm9yOiB0cy5Ob2RlO1xuICBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGV8XG4gICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgb3JpZ2luIG9mIGEgcmVzb3VyY2UgaW4gdGhlIGFwcGxpY2F0aW9uIGNvZGUuIFRoaXMgaXMgdXNlZCBmb3IgY3JlYXRpbmdcbiAqIGRpYWdub3N0aWNzLCBzbyB3ZSBjYW4gcG9pbnQgdG8gdGhlIHJvb3QgY2F1c2Ugb2YgYW4gZXJyb3IgaW4gdGhlIGFwcGxpY2F0aW9uIGNvZGUuXG4gKlxuICogQSB0ZW1wbGF0ZSByZXNvdXJjZSBjb21lcyBmcm9tIHRoZSBgdGVtcGxhdGVVcmxgIHByb3BlcnR5IG9uIHRoZSBjb21wb25lbnQgZGVjb3JhdG9yLlxuICpcbiAqIFN0eWxlc2hlZXRzIHJlc291cmNlcyBjYW4gY29tZSBmcm9tIGVpdGhlciB0aGUgYHN0eWxlVXJsc2AgcHJvcGVydHkgb24gdGhlIGNvbXBvbmVudCBkZWNvcmF0b3IsXG4gKiBvciBmcm9tIGlubGluZSBgc3R5bGVgIHRhZ3MgYW5kIHN0eWxlIGxpbmtzIG9uIHRoZSBleHRlcm5hbCB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3Mge1xuICBUZW1wbGF0ZSxcbiAgU3R5bGVzaGVldEZyb21UZW1wbGF0ZSxcbiAgU3R5bGVzaGVldEZyb21EZWNvcmF0b3IsXG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBBbmd1bGFyIGNvbXBvbmVudC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN5bWJvbCBleHRlbmRzIERpcmVjdGl2ZVN5bWJvbCB7XG4gIHVzZWREaXJlY3RpdmVzOiBTZW1hbnRpY1JlZmVyZW5jZVtdID0gW107XG4gIHVzZWRQaXBlczogU2VtYW50aWNSZWZlcmVuY2VbXSA9IFtdO1xuICBpc1JlbW90ZWx5U2NvcGVkID0gZmFsc2U7XG5cbiAgaXNFbWl0QWZmZWN0ZWQocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sLCBwdWJsaWNBcGlBZmZlY3RlZDogU2V0PFNlbWFudGljU3ltYm9sPik6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgQ29tcG9uZW50U3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGFuIGVxdWFsaXR5IGZ1bmN0aW9uIHRoYXQgY29uc2lkZXJzIHN5bWJvbHMgZXF1YWwgaWYgdGhleSByZXByZXNlbnQgdGhlIHNhbWVcbiAgICAvLyBkZWNsYXJhdGlvbiwgYnV0IG9ubHkgaWYgdGhlIHN5bWJvbCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiBkb2VzIG5vdCBoYXZlIGl0cyBwdWJsaWMgQVBJXG4gICAgLy8gYWZmZWN0ZWQuXG4gICAgY29uc3QgaXNTeW1ib2xBZmZlY3RlZCA9IChjdXJyZW50OiBTZW1hbnRpY1JlZmVyZW5jZSwgcHJldmlvdXM6IFNlbWFudGljUmVmZXJlbmNlKSA9PlxuICAgICAgICBpc1JlZmVyZW5jZUVxdWFsKGN1cnJlbnQsIHByZXZpb3VzKSAmJiAhcHVibGljQXBpQWZmZWN0ZWQuaGFzKGN1cnJlbnQuc3ltYm9sKTtcblxuICAgIC8vIFRoZSBlbWl0IG9mIGEgY29tcG9uZW50IGlzIGFmZmVjdGVkIGlmIGVpdGhlciBvZiB0aGUgZm9sbG93aW5nIGlzIHRydWU6XG4gICAgLy8gIDEuIFRoZSBjb21wb25lbnQgdXNlZCB0byBiZSByZW1vdGVseSBzY29wZWQgYnV0IG5vIGxvbmdlciBpcywgb3IgdmljZSB2ZXJzYS5cbiAgICAvLyAgMi4gVGhlIGxpc3Qgb2YgdXNlZCBkaXJlY3RpdmVzIGhhcyBjaGFuZ2VkIG9yIGFueSBvZiB0aG9zZSBkaXJlY3RpdmVzIGhhdmUgaGFkIHRoZWlyIHB1YmxpY1xuICAgIC8vICAgICBBUEkgY2hhbmdlZC4gSWYgdGhlIHVzZWQgZGlyZWN0aXZlcyBoYXZlIGJlZW4gcmVvcmRlcmVkIGJ1dCBub3Qgb3RoZXJ3aXNlIGFmZmVjdGVkIHRoZW5cbiAgICAvLyAgICAgdGhlIGNvbXBvbmVudCBtdXN0IHN0aWxsIGJlIHJlLWVtaXR0ZWQsIGFzIHRoaXMgbWF5IGFmZmVjdCBkaXJlY3RpdmUgaW5zdGFudGlhdGlvbiBvcmRlci5cbiAgICAvLyAgMy4gVGhlIGxpc3Qgb2YgdXNlZCBwaXBlcyBoYXMgY2hhbmdlZCwgb3IgYW55IG9mIHRob3NlIHBpcGVzIGhhdmUgaGFkIHRoZWlyIHB1YmxpYyBBUElcbiAgICAvLyAgICAgY2hhbmdlZC5cbiAgICByZXR1cm4gdGhpcy5pc1JlbW90ZWx5U2NvcGVkICE9PSBwcmV2aW91c1N5bWJvbC5pc1JlbW90ZWx5U2NvcGVkIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy51c2VkRGlyZWN0aXZlcywgcHJldmlvdXNTeW1ib2wudXNlZERpcmVjdGl2ZXMsIGlzU3ltYm9sQWZmZWN0ZWQpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy51c2VkUGlwZXMsIHByZXZpb3VzU3ltYm9sLnVzZWRQaXBlcywgaXNTeW1ib2xBZmZlY3RlZCk7XG4gIH1cbn1cblxuLyoqXG4gKiBgRGVjb3JhdG9ySGFuZGxlcmAgd2hpY2ggaGFuZGxlcyB0aGUgYEBDb21wb25lbnRgIGFubm90YXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERlY29yYXRvciwgQ29tcG9uZW50QW5hbHlzaXNEYXRhLCBDb21wb25lbnRTeW1ib2wsIENvbXBvbmVudFJlc29sdXRpb25EYXRhPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICAgIHByaXZhdGUgbWV0YVJlZ2lzdHJ5OiBNZXRhZGF0YVJlZ2lzdHJ5LCBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLFxuICAgICAgcHJpdmF0ZSBzY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIsIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSB0eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5OiBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByZXNvdXJjZVJlZ2lzdHJ5OiBSZXNvdXJjZVJlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgcmVzb3VyY2VMb2FkZXI6IFJlc291cmNlTG9hZGVyLCBwcml2YXRlIHJvb3REaXJzOiBSZWFkb25seUFycmF5PHN0cmluZz4sXG4gICAgICBwcml2YXRlIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuLCBwcml2YXRlIGkxOG5Vc2VFeHRlcm5hbElkczogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogYm9vbGVhbiwgcHJpdmF0ZSB1c2VQb2lzb25lZERhdGE6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVczogYm9vbGVhbnx1bmRlZmluZWQsXG4gICAgICBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlciwgcHJpdmF0ZSBjeWNsZUFuYWx5emVyOiBDeWNsZUFuYWx5emVyLFxuICAgICAgcHJpdmF0ZSBjeWNsZUhhbmRsaW5nU3RyYXRlZ3k6IEN5Y2xlSGFuZGxpbmdTdHJhdGVneSwgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgZGVwVHJhY2tlcjogRGVwZW5kZW5jeVRyYWNrZXJ8bnVsbCxcbiAgICAgIHByaXZhdGUgaW5qZWN0YWJsZVJlZ2lzdHJ5OiBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyfG51bGwsXG4gICAgICBwcml2YXRlIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyOiBib29sZWFuKSB7fVxuXG4gIHByaXZhdGUgbGl0ZXJhbENhY2hlID0gbmV3IE1hcDxEZWNvcmF0b3IsIHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uPigpO1xuICBwcml2YXRlIGVsZW1lbnRTY2hlbWFSZWdpc3RyeSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcblxuICAvKipcbiAgICogRHVyaW5nIHRoZSBhc3luY2hyb25vdXMgcHJlYW5hbHl6ZSBwaGFzZSwgaXQncyBuZWNlc3NhcnkgdG8gcGFyc2UgdGhlIHRlbXBsYXRlIHRvIGV4dHJhY3RcbiAgICogYW55IHBvdGVudGlhbCA8bGluaz4gdGFncyB3aGljaCBtaWdodCBuZWVkIHRvIGJlIGxvYWRlZC4gVGhpcyBjYWNoZSBlbnN1cmVzIHRoYXQgd29yayBpcyBub3RcbiAgICogdGhyb3duIGF3YXksIGFuZCB0aGUgcGFyc2VkIHRlbXBsYXRlIGlzIHJldXNlZCBkdXJpbmcgdGhlIGFuYWx5emUgcGhhc2UuXG4gICAqL1xuICBwcml2YXRlIHByZWFuYWx5emVUZW1wbGF0ZUNhY2hlID0gbmV3IE1hcDxEZWNsYXJhdGlvbk5vZGUsIFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZT4oKTtcblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgcmVhZG9ubHkgbmFtZSA9IENvbXBvbmVudERlY29yYXRvckhhbmRsZXIubmFtZTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnQ29tcG9uZW50JywgdGhpcy5pc0NvcmUpO1xuICAgIGlmIChkZWNvcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJpZ2dlcjogZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIGRlY29yYXRvcixcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJlYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4pOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgLy8gSW4gcHJlYW5hbHl6ZSwgcmVzb3VyY2UgVVJMcyBhc3NvY2lhdGVkIHdpdGggdGhlIGNvbXBvbmVudCBhcmUgYXN5bmNocm9ub3VzbHkgcHJlbG9hZGVkIHZpYVxuICAgIC8vIHRoZSByZXNvdXJjZUxvYWRlci4gVGhpcyBpcyB0aGUgb25seSB0aW1lIGFzeW5jIG9wZXJhdGlvbnMgYXJlIGFsbG93ZWQgZm9yIGEgY29tcG9uZW50LlxuICAgIC8vIFRoZXNlIHJlc291cmNlcyBhcmU6XG4gICAgLy9cbiAgICAvLyAtIHRoZSB0ZW1wbGF0ZVVybCwgaWYgdGhlcmUgaXMgb25lXG4gICAgLy8gLSBhbnkgc3R5bGVVcmxzIGlmIHByZXNlbnRcbiAgICAvLyAtIGFueSBzdHlsZXNoZWV0cyByZWZlcmVuY2VkIGZyb20gPGxpbms+IHRhZ3MgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZlxuICAgIC8vXG4gICAgLy8gQXMgYSByZXN1bHQgb2YgdGhlIGxhc3Qgb25lLCB0aGUgdGVtcGxhdGUgbXVzdCBiZSBwYXJzZWQgYXMgcGFydCBvZiBwcmVhbmFseXNpcyB0byBleHRyYWN0XG4gICAgLy8gPGxpbms+IHRhZ3MsIHdoaWNoIG1heSBpbnZvbHZlIHdhaXRpbmcgZm9yIHRoZSB0ZW1wbGF0ZVVybCB0byBiZSByZXNvbHZlZCBmaXJzdC5cblxuICAgIC8vIElmIHByZWxvYWRpbmcgaXNuJ3QgcG9zc2libGUsIHRoZW4gc2tpcCB0aGlzIHN0ZXAuXG4gICAgaWYgKCF0aGlzLnJlc291cmNlTG9hZGVyLmNhblByZWxvYWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YSA9IHRoaXMuX3Jlc29sdmVMaXRlcmFsKGRlY29yYXRvcik7XG4gICAgY29uc3QgY29tcG9uZW50ID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcblxuICAgIGNvbnN0IHJlc29sdmVTdHlsZVVybCA9XG4gICAgICAgIChzdHlsZVVybDogc3RyaW5nLCBub2RlRm9yRXJyb3I6IHRzLk5vZGUsXG4gICAgICAgICByZXNvdXJjZVR5cGU6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlc291cmNlVXJsID1cbiAgICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZVJlc291cmNlT3JUaHJvdyhzdHlsZVVybCwgY29udGFpbmluZ0ZpbGUsIG5vZGVGb3JFcnJvciwgcmVzb3VyY2VUeXBlKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkKHJlc291cmNlVXJsKTtcbiAgICAgICAgfTtcblxuICAgIC8vIEEgUHJvbWlzZSB0aGF0IHdhaXRzIGZvciB0aGUgdGVtcGxhdGUgYW5kIGFsbCA8bGluaz5lZCBzdHlsZXMgd2l0aGluIGl0IHRvIGJlIHByZWxvYWRlZC5cbiAgICBjb25zdCB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXMgPVxuICAgICAgICB0aGlzLl9wcmVsb2FkQW5kUGFyc2VUZW1wbGF0ZShub2RlLCBkZWNvcmF0b3IsIGNvbXBvbmVudCwgY29udGFpbmluZ0ZpbGUpXG4gICAgICAgICAgICAudGhlbigodGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZXxudWxsKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQgPT4ge1xuICAgICAgICAgICAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY29uc3Qgbm9kZUZvckVycm9yID0gZ2V0VGVtcGxhdGVEZWNsYXJhdGlvbk5vZGVGb3JFcnJvcih0ZW1wbGF0ZS5kZWNsYXJhdGlvbik7XG4gICAgICAgICAgICAgIHJldHVybiBQcm9taXNlXG4gICAgICAgICAgICAgICAgICAuYWxsKHRlbXBsYXRlLnN0eWxlVXJscy5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgc3R5bGVVcmwgPT4gcmVzb2x2ZVN0eWxlVXJsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZVVybCwgbm9kZUZvckVycm9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbVRlbXBsYXRlKSkpXG4gICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAvLyBFeHRyYWN0IGFsbCB0aGUgc3R5bGVVcmxzIGluIHRoZSBkZWNvcmF0b3IuXG4gICAgY29uc3QgY29tcG9uZW50U3R5bGVVcmxzID0gdGhpcy5fZXh0cmFjdENvbXBvbmVudFN0eWxlVXJscyhjb21wb25lbnQpO1xuXG4gICAgaWYgKGNvbXBvbmVudFN0eWxlVXJscyA9PT0gbnVsbCkge1xuICAgICAgLy8gQSBmYXN0IHBhdGggZXhpc3RzIGlmIHRoZXJlIGFyZSBubyBzdHlsZVVybHMsIHRvIGp1c3Qgd2FpdCBmb3JcbiAgICAgIC8vIHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcy5cbiAgICAgIHJldHVybiB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFdhaXQgZm9yIGJvdGggdGhlIHRlbXBsYXRlIGFuZCBhbGwgc3R5bGVVcmwgcmVzb3VyY2VzIHRvIHJlc29sdmUuXG4gICAgICByZXR1cm4gUHJvbWlzZVxuICAgICAgICAgIC5hbGwoW1xuICAgICAgICAgICAgdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzLFxuICAgICAgICAgICAgLi4uY29tcG9uZW50U3R5bGVVcmxzLm1hcChcbiAgICAgICAgICAgICAgICBzdHlsZVVybCA9PiByZXNvbHZlU3R5bGVVcmwoXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlVXJsLnVybCwgc3R5bGVVcmwubm9kZUZvckVycm9yLFxuICAgICAgICAgICAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcikpXG4gICAgICAgICAgXSlcbiAgICAgICAgICAudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4sXG4gICAgICBmbGFnczogSGFuZGxlckZsYWdzID0gSGFuZGxlckZsYWdzLk5PTkUpOiBBbmFseXNpc091dHB1dDxDb21wb25lbnRBbmFseXNpc0RhdGE+IHtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIHRoaXMubGl0ZXJhbENhY2hlLmRlbGV0ZShkZWNvcmF0b3IpO1xuXG4gICAgLy8gQENvbXBvbmVudCBpbmhlcml0cyBARGlyZWN0aXZlLCBzbyBiZWdpbiBieSBleHRyYWN0aW5nIHRoZSBARGlyZWN0aXZlIG1ldGFkYXRhIGFuZCBidWlsZGluZ1xuICAgIC8vIG9uIGl0LlxuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9IGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICAgICAgbm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgZmxhZ3MsIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIsXG4gICAgICAgIHRoaXMuZWxlbWVudFNjaGVtYVJlZ2lzdHJ5LmdldERlZmF1bHRDb21wb25lbnRFbGVtZW50TmFtZSgpKTtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGFgIHJldHVybnMgdW5kZWZpbmVkIHdoZW4gdGhlIEBEaXJlY3RpdmUgaGFzIGBqaXQ6IHRydWVgLiBJbiB0aGlzXG4gICAgICAvLyBjYXNlLCBjb21waWxhdGlvbiBvZiB0aGUgZGVjb3JhdG9yIGlzIHNraXBwZWQuIFJldHVybmluZyBhbiBlbXB0eSBvYmplY3Qgc2lnbmlmaWVzXG4gICAgICAvLyB0aGF0IG5vIGFuYWx5c2lzIHdhcyBwcm9kdWNlZC5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBOZXh0LCByZWFkIHRoZSBgQENvbXBvbmVudGAtc3BlY2lmaWMgZmllbGRzLlxuICAgIGNvbnN0IHtkZWNvcmF0b3I6IGNvbXBvbmVudCwgbWV0YWRhdGEsIGlucHV0cywgb3V0cHV0c30gPSBkaXJlY3RpdmVSZXN1bHQ7XG5cbiAgICAvLyBHbyB0aHJvdWdoIHRoZSByb290IGRpcmVjdG9yaWVzIGZvciB0aGlzIHByb2plY3QsIGFuZCBzZWxlY3QgdGhlIG9uZSB3aXRoIHRoZSBzbWFsbGVzdFxuICAgIC8vIHJlbGF0aXZlIHBhdGggcmVwcmVzZW50YXRpb24uXG4gICAgY29uc3QgcmVsYXRpdmVDb250ZXh0RmlsZVBhdGggPSB0aGlzLnJvb3REaXJzLnJlZHVjZTxzdHJpbmd8dW5kZWZpbmVkPigocHJldmlvdXMsIHJvb3REaXIpID0+IHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHJlbGF0aXZlKGFic29sdXRlRnJvbShyb290RGlyKSwgYWJzb2x1dGVGcm9tKGNvbnRhaW5pbmdGaWxlKSk7XG4gICAgICBpZiAocHJldmlvdXMgPT09IHVuZGVmaW5lZCB8fCBjYW5kaWRhdGUubGVuZ3RoIDwgcHJldmlvdXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcHJldmlvdXM7XG4gICAgICB9XG4gICAgfSwgdW5kZWZpbmVkKSE7XG5cblxuICAgIC8vIE5vdGUgdGhhdCB3ZSBjb3VsZCB0ZWNobmljYWxseSBjb21iaW5lIHRoZSBgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnlgIGFuZFxuICAgIC8vIGBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5YCBpbnRvIGEgc2luZ2xlIHNldCwgYnV0IHdlIGtlZXAgdGhlIHNlcGFyYXRlIHNvIHRoYXRcbiAgICAvLyB3ZSBjYW4gZGlzdGluZ3Vpc2ggd2hlcmUgYW4gZXJyb3IgaXMgY29taW5nIGZyb20gd2hlbiBsb2dnaW5nIHRoZSBkaWFnbm9zdGljcyBpbiBgcmVzb2x2ZWAuXG4gICAgbGV0IHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsID0gbnVsbDtcbiAgICBsZXQgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbCA9IG51bGw7XG4gICAgbGV0IHdyYXBwZWRWaWV3UHJvdmlkZXJzOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuXG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3ZpZXdQcm92aWRlcnMnKSkge1xuICAgICAgY29uc3Qgdmlld1Byb3ZpZGVycyA9IGNvbXBvbmVudC5nZXQoJ3ZpZXdQcm92aWRlcnMnKSE7XG4gICAgICB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSA9XG4gICAgICAgICAgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnkodmlld1Byb3ZpZGVycywgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICAgIHdyYXBwZWRWaWV3UHJvdmlkZXJzID0gbmV3IFdyYXBwZWROb2RlRXhwcihcbiAgICAgICAgICB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyID8gd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyh2aWV3UHJvdmlkZXJzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXdQcm92aWRlcnMpO1xuICAgIH1cblxuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcm92aWRlcnMnKSkge1xuICAgICAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSA9IHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5KFxuICAgICAgICAgIGNvbXBvbmVudC5nZXQoJ3Byb3ZpZGVycycpISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSB0aGUgdGVtcGxhdGUuXG4gICAgLy8gSWYgYSBwcmVhbmFseXplIHBoYXNlIHdhcyBleGVjdXRlZCwgdGhlIHRlbXBsYXRlIG1heSBhbHJlYWR5IGV4aXN0IGluIHBhcnNlZCBmb3JtLCBzbyBjaGVja1xuICAgIC8vIHRoZSBwcmVhbmFseXplVGVtcGxhdGVDYWNoZS5cbiAgICAvLyBFeHRyYWN0IGEgY2xvc3VyZSBvZiB0aGUgdGVtcGxhdGUgcGFyc2luZyBjb2RlIHNvIHRoYXQgaXQgY2FuIGJlIHJlcGFyc2VkIHdpdGggZGlmZmVyZW50XG4gICAgLy8gb3B0aW9ucyBpZiBuZWVkZWQsIGxpa2UgaW4gdGhlIGluZGV4aW5nIHBpcGVsaW5lLlxuICAgIGxldCB0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlO1xuICAgIGlmICh0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmhhcyhub2RlKSkge1xuICAgICAgLy8gVGhlIHRlbXBsYXRlIHdhcyBwYXJzZWQgaW4gcHJlYW5hbHl6ZS4gVXNlIGl0IGFuZCBkZWxldGUgaXQgdG8gc2F2ZSBtZW1vcnkuXG4gICAgICBjb25zdCBwcmVhbmFseXplZCA9IHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuZ2V0KG5vZGUpITtcbiAgICAgIHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuZGVsZXRlKG5vZGUpO1xuXG4gICAgICB0ZW1wbGF0ZSA9IHByZWFuYWx5emVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPSB0aGlzLnBhcnNlVGVtcGxhdGVEZWNsYXJhdGlvbihkZWNvcmF0b3IsIGNvbXBvbmVudCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgdGVtcGxhdGUgPSB0aGlzLmV4dHJhY3RUZW1wbGF0ZShub2RlLCB0ZW1wbGF0ZURlY2wpO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZVJlc291cmNlID1cbiAgICAgICAgdGVtcGxhdGUuaXNJbmxpbmUgPyB7cGF0aDogbnVsbCwgZXhwcmVzc2lvbjogY29tcG9uZW50LmdldCgndGVtcGxhdGUnKSF9IDoge1xuICAgICAgICAgIHBhdGg6IGFic29sdXRlRnJvbSh0ZW1wbGF0ZS5kZWNsYXJhdGlvbi5yZXNvbHZlZFRlbXBsYXRlVXJsKSxcbiAgICAgICAgICBleHByZXNzaW9uOiB0ZW1wbGF0ZS5zb3VyY2VNYXBwaW5nLm5vZGVcbiAgICAgICAgfTtcblxuICAgIC8vIEZpZ3VyZSBvdXQgdGhlIHNldCBvZiBzdHlsZXMuIFRoZSBvcmRlcmluZyBoZXJlIGlzIGltcG9ydGFudDogZXh0ZXJuYWwgcmVzb3VyY2VzIChzdHlsZVVybHMpXG4gICAgLy8gcHJlY2VkZSBpbmxpbmUgc3R5bGVzLCBhbmQgc3R5bGVzIGRlZmluZWQgaW4gdGhlIHRlbXBsYXRlIG92ZXJyaWRlIHN0eWxlcyBkZWZpbmVkIGluIHRoZVxuICAgIC8vIGNvbXBvbmVudC5cbiAgICBsZXQgc3R5bGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3Qgc3R5bGVSZXNvdXJjZXMgPSB0aGlzLl9leHRyYWN0U3R5bGVSZXNvdXJjZXMoY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgY29uc3Qgc3R5bGVVcmxzOiBTdHlsZVVybE1ldGFbXSA9IFtcbiAgICAgIC4uLnRoaXMuX2V4dHJhY3RDb21wb25lbnRTdHlsZVVybHMoY29tcG9uZW50KSwgLi4udGhpcy5fZXh0cmFjdFRlbXBsYXRlU3R5bGVVcmxzKHRlbXBsYXRlKVxuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IHN0eWxlVXJsIG9mIHN0eWxlVXJscykge1xuICAgICAgY29uc3QgcmVzb3VyY2VUeXBlID0gc3R5bGVVcmwuc291cmNlID09PSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvciA/XG4gICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IgOlxuICAgICAgICAgIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGU7XG4gICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMuX3Jlc29sdmVSZXNvdXJjZU9yVGhyb3coXG4gICAgICAgICAgc3R5bGVVcmwudXJsLCBjb250YWluaW5nRmlsZSwgc3R5bGVVcmwubm9kZUZvckVycm9yLCByZXNvdXJjZVR5cGUpO1xuICAgICAgY29uc3QgcmVzb3VyY2VTdHIgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQocmVzb3VyY2VVcmwpO1xuXG4gICAgICBzdHlsZXMucHVzaChyZXNvdXJjZVN0cik7XG4gICAgICBpZiAodGhpcy5kZXBUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuZGVwVHJhY2tlci5hZGRSZXNvdXJjZURlcGVuZGVuY3kobm9kZS5nZXRTb3VyY2VGaWxlKCksIGFic29sdXRlRnJvbShyZXNvdXJjZVVybCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBpbmxpbmVTdHlsZXM6IHN0cmluZ1tdfG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdzdHlsZXMnKSkge1xuICAgICAgY29uc3QgbGl0U3R5bGVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoY29tcG9uZW50LCAnc3R5bGVzJywgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgaWYgKGxpdFN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgICBpbmxpbmVTdHlsZXMgPSBbLi4ubGl0U3R5bGVzXTtcbiAgICAgICAgc3R5bGVzLnB1c2goLi4ubGl0U3R5bGVzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlLnN0eWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBzdHlsZXMucHVzaCguLi50ZW1wbGF0ZS5zdHlsZXMpO1xuICAgIH1cblxuICAgIGNvbnN0IGVuY2Fwc3VsYXRpb246IG51bWJlciA9XG4gICAgICAgIHRoaXMuX3Jlc29sdmVFbnVtVmFsdWUoY29tcG9uZW50LCAnZW5jYXBzdWxhdGlvbicsICdWaWV3RW5jYXBzdWxhdGlvbicpIHx8IDA7XG5cbiAgICBjb25zdCBjaGFuZ2VEZXRlY3Rpb246IG51bWJlcnxudWxsID1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZUVudW1WYWx1ZShjb21wb25lbnQsICdjaGFuZ2VEZXRlY3Rpb24nLCAnQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3knKTtcblxuICAgIGxldCBhbmltYXRpb25zOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdhbmltYXRpb25zJykpIHtcbiAgICAgIGFuaW1hdGlvbnMgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNvbXBvbmVudC5nZXQoJ2FuaW1hdGlvbnMnKSEpO1xuICAgIH1cblxuICAgIGNvbnN0IG91dHB1dDogQW5hbHlzaXNPdXRwdXQ8Q29tcG9uZW50QW5hbHlzaXNEYXRhPiA9IHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIGJhc2VDbGFzczogcmVhZEJhc2VDbGFzcyhub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpLFxuICAgICAgICBpbnB1dHMsXG4gICAgICAgIG91dHB1dHMsXG4gICAgICAgIG1ldGE6IHtcbiAgICAgICAgICAuLi5tZXRhZGF0YSxcbiAgICAgICAgICB0ZW1wbGF0ZToge1xuICAgICAgICAgICAgbm9kZXM6IHRlbXBsYXRlLm5vZGVzLFxuICAgICAgICAgICAgbmdDb250ZW50U2VsZWN0b3JzOiB0ZW1wbGF0ZS5uZ0NvbnRlbnRTZWxlY3RvcnMsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBlbmNhcHN1bGF0aW9uLFxuICAgICAgICAgIGludGVycG9sYXRpb246IHRlbXBsYXRlLmludGVycG9sYXRpb25Db25maWcgPz8gREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRyxcbiAgICAgICAgICBzdHlsZXMsXG5cbiAgICAgICAgICAvLyBUaGVzZSB3aWxsIGJlIHJlcGxhY2VkIGR1cmluZyB0aGUgY29tcGlsYXRpb24gc3RlcCwgYWZ0ZXIgYWxsIGBOZ01vZHVsZWBzIGhhdmUgYmVlblxuICAgICAgICAgIC8vIGFuYWx5emVkIGFuZCB0aGUgZnVsbCBjb21waWxhdGlvbiBzY29wZSBmb3IgdGhlIGNvbXBvbmVudCBjYW4gYmUgcmVhbGl6ZWQuXG4gICAgICAgICAgYW5pbWF0aW9ucyxcbiAgICAgICAgICB2aWV3UHJvdmlkZXJzOiB3cmFwcGVkVmlld1Byb3ZpZGVycyxcbiAgICAgICAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IHRoaXMuaTE4blVzZUV4dGVybmFsSWRzLFxuICAgICAgICAgIHJlbGF0aXZlQ29udGV4dEZpbGVQYXRoLFxuICAgICAgICB9LFxuICAgICAgICB0eXBlQ2hlY2tNZXRhOiBleHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YShub2RlLCBpbnB1dHMsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpLFxuICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSxcbiAgICAgICAgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksXG4gICAgICAgIGlubGluZVN0eWxlcyxcbiAgICAgICAgc3R5bGVVcmxzLFxuICAgICAgICByZXNvdXJjZXM6IHtcbiAgICAgICAgICBzdHlsZXM6IHN0eWxlUmVzb3VyY2VzLFxuICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVJlc291cmNlLFxuICAgICAgICB9LFxuICAgICAgICBpc1BvaXNvbmVkOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgICBpZiAoY2hhbmdlRGV0ZWN0aW9uICE9PSBudWxsKSB7XG4gICAgICBvdXRwdXQuYW5hbHlzaXMhLm1ldGEuY2hhbmdlRGV0ZWN0aW9uID0gY2hhbmdlRGV0ZWN0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9XG5cbiAgc3ltYm9sKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+KTogQ29tcG9uZW50U3ltYm9sIHtcbiAgICByZXR1cm4gbmV3IENvbXBvbmVudFN5bWJvbChcbiAgICAgICAgbm9kZSwgYW5hbHlzaXMubWV0YS5zZWxlY3RvciwgYW5hbHlzaXMuaW5wdXRzLnByb3BlcnR5TmFtZXMsIGFuYWx5c2lzLm91dHB1dHMucHJvcGVydHlOYW1lcyxcbiAgICAgICAgYW5hbHlzaXMubWV0YS5leHBvcnRBcyk7XG4gIH1cblxuICByZWdpc3Rlcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogQ29tcG9uZW50QW5hbHlzaXNEYXRhKTogdm9pZCB7XG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBjb21wb25lbnQncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBgTWV0YWRhdGFSZWdpc3RyeWAuIFRoaXMgZW5zdXJlcyB0aGF0XG4gICAgLy8gdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjb21wb25lbnQgaXMgYXZhaWxhYmxlIGR1cmluZyB0aGUgY29tcGlsZSgpIHBoYXNlLlxuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgdGhpcy5tZXRhUmVnaXN0cnkucmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YSh7XG4gICAgICByZWYsXG4gICAgICBuYW1lOiBub2RlLm5hbWUudGV4dCxcbiAgICAgIHNlbGVjdG9yOiBhbmFseXNpcy5tZXRhLnNlbGVjdG9yLFxuICAgICAgZXhwb3J0QXM6IGFuYWx5c2lzLm1ldGEuZXhwb3J0QXMsXG4gICAgICBpbnB1dHM6IGFuYWx5c2lzLmlucHV0cyxcbiAgICAgIG91dHB1dHM6IGFuYWx5c2lzLm91dHB1dHMsXG4gICAgICBxdWVyaWVzOiBhbmFseXNpcy5tZXRhLnF1ZXJpZXMubWFwKHF1ZXJ5ID0+IHF1ZXJ5LnByb3BlcnR5TmFtZSksXG4gICAgICBpc0NvbXBvbmVudDogdHJ1ZSxcbiAgICAgIGJhc2VDbGFzczogYW5hbHlzaXMuYmFzZUNsYXNzLFxuICAgICAgLi4uYW5hbHlzaXMudHlwZUNoZWNrTWV0YSxcbiAgICAgIGlzUG9pc29uZWQ6IGFuYWx5c2lzLmlzUG9pc29uZWQsXG4gICAgICBpc1N0cnVjdHVyYWw6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgdGhpcy5yZXNvdXJjZVJlZ2lzdHJ5LnJlZ2lzdGVyUmVzb3VyY2VzKGFuYWx5c2lzLnJlc291cmNlcywgbm9kZSk7XG4gICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkucmVnaXN0ZXJJbmplY3RhYmxlKG5vZGUpO1xuICB9XG5cbiAgaW5kZXgoXG4gICAgICBjb250ZXh0OiBJbmRleGluZ0NvbnRleHQsIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+KSB7XG4gICAgaWYgKGFuYWx5c2lzLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGNvbnN0IHNlbGVjdG9yID0gYW5hbHlzaXMubWV0YS5zZWxlY3RvcjtcbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcjxEaXJlY3RpdmVNZXRhPigpO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgaWYgKChzY29wZS5jb21waWxhdGlvbi5pc1BvaXNvbmVkIHx8IHNjb3BlLmV4cG9ydGVkLmlzUG9pc29uZWQpICYmICF0aGlzLnVzZVBvaXNvbmVkRGF0YSkge1xuICAgICAgICAvLyBEb24ndCBib3RoZXIgaW5kZXhpbmcgY29tcG9uZW50cyB3aGljaCBoYWQgZXJyb25lb3VzIHNjb3BlcywgdW5sZXNzIHNwZWNpZmljYWxseVxuICAgICAgICAvLyByZXF1ZXN0ZWQuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGlmIChkaXJlY3RpdmUuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgIGNvbnN0IGJvdW5kVGVtcGxhdGUgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IGFuYWx5c2lzLnRlbXBsYXRlLmRpYWdOb2Rlc30pO1xuXG4gICAgY29udGV4dC5hZGRDb21wb25lbnQoe1xuICAgICAgZGVjbGFyYXRpb246IG5vZGUsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIGJvdW5kVGVtcGxhdGUsXG4gICAgICB0ZW1wbGF0ZU1ldGE6IHtcbiAgICAgICAgaXNJbmxpbmU6IGFuYWx5c2lzLnRlbXBsYXRlLmlzSW5saW5lLFxuICAgICAgICBmaWxlOiBhbmFseXNpcy50ZW1wbGF0ZS5maWxlLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHR5cGVDaGVjayhjdHg6IFR5cGVDaGVja0NvbnRleHQsIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIG1ldGE6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pOlxuICAgICAgdm9pZCB7XG4gICAgaWYgKHRoaXMudHlwZUNoZWNrU2NvcGVSZWdpc3RyeSA9PT0gbnVsbCB8fCAhdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKG1ldGEuaXNQb2lzb25lZCAmJiAhdGhpcy51c2VQb2lzb25lZERhdGEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnR5cGVDaGVja1Njb3BlUmVnaXN0cnkuZ2V0VHlwZUNoZWNrU2NvcGUobm9kZSk7XG4gICAgaWYgKHNjb3BlLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICAvLyBEb24ndCB0eXBlLWNoZWNrIGNvbXBvbmVudHMgdGhhdCBoYWQgZXJyb3JzIGluIHRoZWlyIHNjb3BlcywgdW5sZXNzIHJlcXVlc3RlZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBiaW5kZXIgPSBuZXcgUjNUYXJnZXRCaW5kZXIoc2NvcGUubWF0Y2hlcik7XG4gICAgY3R4LmFkZFRlbXBsYXRlKFxuICAgICAgICBuZXcgUmVmZXJlbmNlKG5vZGUpLCBiaW5kZXIsIG1ldGEudGVtcGxhdGUuZGlhZ05vZGVzLCBzY29wZS5waXBlcywgc2NvcGUuc2NoZW1hcyxcbiAgICAgICAgbWV0YS50ZW1wbGF0ZS5zb3VyY2VNYXBwaW5nLCBtZXRhLnRlbXBsYXRlLmZpbGUsIG1ldGEudGVtcGxhdGUuZXJyb3JzKTtcbiAgfVxuXG4gIHJlc29sdmUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPixcbiAgICAgIHN5bWJvbDogQ29tcG9uZW50U3ltYm9sKTogUmVzb2x2ZVJlc3VsdDxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4ge1xuICAgIGlmIChhbmFseXNpcy5pc1BvaXNvbmVkICYmICF0aGlzLnVzZVBvaXNvbmVkRGF0YSkge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgY29tcG9uZW50IHdhcyByZWdpc3RlcmVkIHdpdGggYW4gTmdNb2R1bGUuIElmIHNvLCBpdCBzaG91bGQgYmUgY29tcGlsZWRcbiAgICAvLyB1bmRlciB0aGF0IG1vZHVsZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChub2RlKTtcbiAgICBsZXQgbWV0YWRhdGEgPSBhbmFseXNpcy5tZXRhIGFzIFJlYWRvbmx5PFIzQ29tcG9uZW50TWV0YWRhdGE+O1xuXG4gICAgY29uc3QgZGF0YTogQ29tcG9uZW50UmVzb2x1dGlvbkRhdGEgPSB7XG4gICAgICBkaXJlY3RpdmVzOiBFTVBUWV9BUlJBWSxcbiAgICAgIHBpcGVzOiBFTVBUWV9NQVAsXG4gICAgICBkZWNsYXJhdGlvbkxpc3RFbWl0TW9kZTogRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUuRGlyZWN0LFxuICAgIH07XG5cbiAgICBpZiAoc2NvcGUgIT09IG51bGwgJiYgKCFzY29wZS5jb21waWxhdGlvbi5pc1BvaXNvbmVkIHx8IHRoaXMudXNlUG9pc29uZWREYXRhKSkge1xuICAgICAgLy8gUmVwbGFjZSB0aGUgZW1wdHkgY29tcG9uZW50cyBhbmQgZGlyZWN0aXZlcyBmcm9tIHRoZSBhbmFseXplKCkgc3RlcCB3aXRoIGEgZnVsbHkgZXhwYW5kZWRcbiAgICAgIC8vIHNjb3BlLiBUaGlzIGlzIHBvc3NpYmxlIG5vdyBiZWNhdXNlIGR1cmluZyByZXNvbHZlKCkgdGhlIHdob2xlIGNvbXBpbGF0aW9uIHVuaXQgaGFzIGJlZW5cbiAgICAgIC8vIGZ1bGx5IGFuYWx5emVkLlxuICAgICAgLy9cbiAgICAgIC8vIEZpcnN0IGl0IG5lZWRzIHRvIGJlIGRldGVybWluZWQgaWYgYWN0dWFsbHkgaW1wb3J0aW5nIHRoZSBkaXJlY3RpdmVzL3BpcGVzIHVzZWQgaW4gdGhlXG4gICAgICAvLyB0ZW1wbGF0ZSB3b3VsZCBjcmVhdGUgYSBjeWNsZS4gQ3VycmVudGx5IG5ndHNjIHJlZnVzZXMgdG8gZ2VuZXJhdGUgY3ljbGVzLCBzbyBhbiBvcHRpb25cbiAgICAgIC8vIGtub3duIGFzIFwicmVtb3RlIHNjb3BpbmdcIiBpcyB1c2VkIGlmIGEgY3ljbGUgd291bGQgYmUgY3JlYXRlZC4gSW4gcmVtb3RlIHNjb3BpbmcsIHRoZVxuICAgICAgLy8gbW9kdWxlIGZpbGUgc2V0cyB0aGUgZGlyZWN0aXZlcy9waXBlcyBvbiB0aGUgybVjbXAgb2YgdGhlIGNvbXBvbmVudCwgd2l0aG91dFxuICAgICAgLy8gcmVxdWlyaW5nIG5ldyBpbXBvcnRzIChidXQgYWxzbyBpbiBhIHdheSB0aGF0IGJyZWFrcyB0cmVlIHNoYWtpbmcpLlxuICAgICAgLy9cbiAgICAgIC8vIERldGVybWluaW5nIHRoaXMgaXMgY2hhbGxlbmdpbmcsIGJlY2F1c2UgdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIgaXMgcmVzcG9uc2libGUgZm9yXG4gICAgICAvLyBtYXRjaGluZyBkaXJlY3RpdmVzIGFuZCBwaXBlcyBpbiB0aGUgdGVtcGxhdGU7IGhvd2V2ZXIsIHRoYXQgZG9lc24ndCBydW4gdW50aWwgdGhlIGFjdHVhbFxuICAgICAgLy8gY29tcGlsZSgpIHN0ZXAuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHJ1biB0ZW1wbGF0ZSBjb21waWxhdGlvbiBzb29uZXIgYXMgaXQgcmVxdWlyZXMgdGhlXG4gICAgICAvLyBDb25zdGFudFBvb2wgZm9yIHRoZSBvdmVyYWxsIGZpbGUgYmVpbmcgY29tcGlsZWQgKHdoaWNoIGlzbid0IGF2YWlsYWJsZSB1bnRpbCB0aGVcbiAgICAgIC8vIHRyYW5zZm9ybSBzdGVwKS5cbiAgICAgIC8vXG4gICAgICAvLyBJbnN0ZWFkLCBkaXJlY3RpdmVzL3BpcGVzIGFyZSBtYXRjaGVkIGluZGVwZW5kZW50bHkgaGVyZSwgdXNpbmcgdGhlIFIzVGFyZ2V0QmluZGVyLiBUaGlzXG4gICAgICAvLyBpcyBhbiBhbHRlcm5hdGl2ZSBpbXBsZW1lbnRhdGlvbiBvZiB0ZW1wbGF0ZSBtYXRjaGluZyB3aGljaCBpcyB1c2VkIGZvciB0ZW1wbGF0ZVxuICAgICAgLy8gdHlwZS1jaGVja2luZyBhbmQgd2lsbCBldmVudHVhbGx5IHJlcGxhY2UgbWF0Y2hpbmcgaW4gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuXG5cblxuICAgICAgLy8gU2V0IHVwIHRoZSBSM1RhcmdldEJpbmRlciwgYXMgd2VsbCBhcyBhICdkaXJlY3RpdmVzJyBhcnJheSBhbmQgYSAncGlwZXMnIG1hcCB0aGF0IGFyZVxuICAgICAgLy8gbGF0ZXIgZmVkIHRvIHRoZSBUZW1wbGF0ZURlZmluaXRpb25CdWlsZGVyLiBGaXJzdCwgYSBTZWxlY3Rvck1hdGNoZXIgaXMgY29uc3RydWN0ZWQgdG9cbiAgICAgIC8vIG1hdGNoIGRpcmVjdGl2ZXMgdGhhdCBhcmUgaW4gc2NvcGUuXG4gICAgICB0eXBlIE1hdGNoZWREaXJlY3RpdmUgPSBEaXJlY3RpdmVNZXRhJntzZWxlY3Rvcjogc3RyaW5nfTtcbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPE1hdGNoZWREaXJlY3RpdmU+KCk7XG5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgaWYgKGRpci5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyLnNlbGVjdG9yKSwgZGlyIGFzIE1hdGNoZWREaXJlY3RpdmUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+KCk7XG4gICAgICBmb3IgKGNvbnN0IHBpcGUgb2Ygc2NvcGUuY29tcGlsYXRpb24ucGlwZXMpIHtcbiAgICAgICAgcGlwZXMuc2V0KHBpcGUubmFtZSwgcGlwZS5yZWYpO1xuICAgICAgfVxuXG4gICAgICAvLyBOZXh0LCB0aGUgY29tcG9uZW50IHRlbXBsYXRlIEFTVCBpcyBib3VuZCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXMgcHJvZHVjZXMgYVxuICAgICAgLy8gQm91bmRUYXJnZXQsIHdoaWNoIGlzIHNpbWlsYXIgdG8gYSB0cy5UeXBlQ2hlY2tlci5cbiAgICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihtYXRjaGVyKTtcbiAgICAgIGNvbnN0IGJvdW5kID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlOiBtZXRhZGF0YS50ZW1wbGF0ZS5ub2Rlc30pO1xuXG4gICAgICAvLyBUaGUgQm91bmRUYXJnZXQga25vd3Mgd2hpY2ggZGlyZWN0aXZlcyBhbmQgcGlwZXMgbWF0Y2hlZCB0aGUgdGVtcGxhdGUuXG4gICAgICB0eXBlIFVzZWREaXJlY3RpdmUgPSBSM1VzZWREaXJlY3RpdmVNZXRhZGF0YSZ7cmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj59O1xuICAgICAgY29uc3QgdXNlZERpcmVjdGl2ZXM6IFVzZWREaXJlY3RpdmVbXSA9IGJvdW5kLmdldFVzZWREaXJlY3RpdmVzKCkubWFwKGRpcmVjdGl2ZSA9PiB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcmVmOiBkaXJlY3RpdmUucmVmLFxuICAgICAgICAgIHR5cGU6IHRoaXMucmVmRW1pdHRlci5lbWl0KGRpcmVjdGl2ZS5yZWYsIGNvbnRleHQpLFxuICAgICAgICAgIHNlbGVjdG9yOiBkaXJlY3RpdmUuc2VsZWN0b3IsXG4gICAgICAgICAgaW5wdXRzOiBkaXJlY3RpdmUuaW5wdXRzLnByb3BlcnR5TmFtZXMsXG4gICAgICAgICAgb3V0cHV0czogZGlyZWN0aXZlLm91dHB1dHMucHJvcGVydHlOYW1lcyxcbiAgICAgICAgICBleHBvcnRBczogZGlyZWN0aXZlLmV4cG9ydEFzLFxuICAgICAgICAgIGlzQ29tcG9uZW50OiBkaXJlY3RpdmUuaXNDb21wb25lbnQsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIHR5cGUgVXNlZFBpcGUgPSB7cmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIHBpcGVOYW1lOiBzdHJpbmcsIGV4cHJlc3Npb246IEV4cHJlc3Npb259O1xuICAgICAgY29uc3QgdXNlZFBpcGVzOiBVc2VkUGlwZVtdID0gW107XG4gICAgICBmb3IgKGNvbnN0IHBpcGVOYW1lIG9mIGJvdW5kLmdldFVzZWRQaXBlcygpKSB7XG4gICAgICAgIGlmICghcGlwZXMuaGFzKHBpcGVOYW1lKSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBpcGUgPSBwaXBlcy5nZXQocGlwZU5hbWUpITtcbiAgICAgICAgdXNlZFBpcGVzLnB1c2goe1xuICAgICAgICAgIHJlZjogcGlwZSxcbiAgICAgICAgICBwaXBlTmFtZSxcbiAgICAgICAgICBleHByZXNzaW9uOiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChwaXBlLCBjb250ZXh0KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlciAhPT0gbnVsbCkge1xuICAgICAgICBzeW1ib2wudXNlZERpcmVjdGl2ZXMgPSB1c2VkRGlyZWN0aXZlcy5tYXAoXG4gICAgICAgICAgICBkaXIgPT4gdGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlciEuZ2V0U2VtYW50aWNSZWZlcmVuY2UoZGlyLnJlZi5ub2RlLCBkaXIudHlwZSkpO1xuICAgICAgICBzeW1ib2wudXNlZFBpcGVzID0gdXNlZFBpcGVzLm1hcChcbiAgICAgICAgICAgIHBpcGUgPT5cbiAgICAgICAgICAgICAgICB0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyIS5nZXRTZW1hbnRpY1JlZmVyZW5jZShwaXBlLnJlZi5ub2RlLCBwaXBlLmV4cHJlc3Npb24pKTtcbiAgICAgIH1cblxuICAgICAgLy8gU2NhbiB0aHJvdWdoIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGFjdHVhbGx5IHVzZWQgaW4gdGhlIHRlbXBsYXRlIGFuZCBjaGVjayB3aGV0aGVyIGFueVxuICAgICAgLy8gaW1wb3J0IHdoaWNoIG5lZWRzIHRvIGJlIGdlbmVyYXRlZCB3b3VsZCBjcmVhdGUgYSBjeWNsZS5cbiAgICAgIGNvbnN0IGN5Y2xlc0Zyb21EaXJlY3RpdmVzID0gbmV3IE1hcDxVc2VkRGlyZWN0aXZlLCBDeWNsZT4oKTtcbiAgICAgIGZvciAoY29uc3QgdXNlZERpcmVjdGl2ZSBvZiB1c2VkRGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCBjeWNsZSA9IHRoaXMuX2NoZWNrRm9yQ3ljbGljSW1wb3J0KHVzZWREaXJlY3RpdmUucmVmLCB1c2VkRGlyZWN0aXZlLnR5cGUsIGNvbnRleHQpO1xuICAgICAgICBpZiAoY3ljbGUgIT09IG51bGwpIHtcbiAgICAgICAgICBjeWNsZXNGcm9tRGlyZWN0aXZlcy5zZXQodXNlZERpcmVjdGl2ZSwgY3ljbGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBjeWNsZXNGcm9tUGlwZXMgPSBuZXcgTWFwPFVzZWRQaXBlLCBDeWNsZT4oKTtcbiAgICAgIGZvciAoY29uc3QgdXNlZFBpcGUgb2YgdXNlZFBpcGVzKSB7XG4gICAgICAgIGNvbnN0IGN5Y2xlID0gdGhpcy5fY2hlY2tGb3JDeWNsaWNJbXBvcnQodXNlZFBpcGUucmVmLCB1c2VkUGlwZS5leHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKGN5Y2xlICE9PSBudWxsKSB7XG4gICAgICAgICAgY3ljbGVzRnJvbVBpcGVzLnNldCh1c2VkUGlwZSwgY3ljbGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGN5Y2xlRGV0ZWN0ZWQgPSBjeWNsZXNGcm9tRGlyZWN0aXZlcy5zaXplICE9PSAwIHx8IGN5Y2xlc0Zyb21QaXBlcy5zaXplICE9PSAwO1xuICAgICAgaWYgKCFjeWNsZURldGVjdGVkKSB7XG4gICAgICAgIC8vIE5vIGN5Y2xlIHdhcyBkZXRlY3RlZC4gUmVjb3JkIHRoZSBpbXBvcnRzIHRoYXQgbmVlZCB0byBiZSBjcmVhdGVkIGluIHRoZSBjeWNsZSBkZXRlY3RvclxuICAgICAgICAvLyBzbyB0aGF0IGZ1dHVyZSBjeWNsaWMgaW1wb3J0IGNoZWNrcyBjb25zaWRlciB0aGVpciBwcm9kdWN0aW9uLlxuICAgICAgICBmb3IgKGNvbnN0IHt0eXBlfSBvZiB1c2VkRGlyZWN0aXZlcykge1xuICAgICAgICAgIHRoaXMuX3JlY29yZFN5bnRoZXRpY0ltcG9ydCh0eXBlLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHtleHByZXNzaW9ufSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgICB0aGlzLl9yZWNvcmRTeW50aGV0aWNJbXBvcnQoZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSBkaXJlY3RpdmUvcGlwZSBhcnJheXMgaW4gybVjbXAgbmVlZCB0byBiZSB3cmFwcGVkIGluIGNsb3N1cmVzLlxuICAgICAgICAvLyBUaGlzIGlzIHJlcXVpcmVkIGlmIGFueSBkaXJlY3RpdmUvcGlwZSByZWZlcmVuY2UgaXMgdG8gYSBkZWNsYXJhdGlvbiBpbiB0aGUgc2FtZSBmaWxlXG4gICAgICAgIC8vIGJ1dCBkZWNsYXJlZCBhZnRlciB0aGlzIGNvbXBvbmVudC5cbiAgICAgICAgY29uc3Qgd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZSA9XG4gICAgICAgICAgICB1c2VkRGlyZWN0aXZlcy5zb21lKFxuICAgICAgICAgICAgICAgIGRpciA9PiBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKGRpci50eXBlLCBub2RlLm5hbWUsIGNvbnRleHQpKSB8fFxuICAgICAgICAgICAgdXNlZFBpcGVzLnNvbWUoXG4gICAgICAgICAgICAgICAgcGlwZSA9PiBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKHBpcGUuZXhwcmVzc2lvbiwgbm9kZS5uYW1lLCBjb250ZXh0KSk7XG5cbiAgICAgICAgZGF0YS5kaXJlY3RpdmVzID0gdXNlZERpcmVjdGl2ZXM7XG4gICAgICAgIGRhdGEucGlwZXMgPSBuZXcgTWFwKHVzZWRQaXBlcy5tYXAocGlwZSA9PiBbcGlwZS5waXBlTmFtZSwgcGlwZS5leHByZXNzaW9uXSkpO1xuICAgICAgICBkYXRhLmRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlID0gd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZSA/XG4gICAgICAgICAgICBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZS5DbG9zdXJlIDpcbiAgICAgICAgICAgIERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkRpcmVjdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLmN5Y2xlSGFuZGxpbmdTdHJhdGVneSA9PT0gQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LlVzZVJlbW90ZVNjb3BpbmcpIHtcbiAgICAgICAgICAvLyBEZWNsYXJpbmcgdGhlIGRpcmVjdGl2ZURlZnMvcGlwZURlZnMgYXJyYXlzIGRpcmVjdGx5IHdvdWxkIHJlcXVpcmUgaW1wb3J0cyB0aGF0IHdvdWxkXG4gICAgICAgICAgLy8gY3JlYXRlIGEgY3ljbGUuIEluc3RlYWQsIG1hcmsgdGhpcyBjb21wb25lbnQgYXMgcmVxdWlyaW5nIHJlbW90ZSBzY29waW5nLCBzbyB0aGF0IHRoZVxuICAgICAgICAgIC8vIE5nTW9kdWxlIGZpbGUgd2lsbCB0YWtlIGNhcmUgb2Ygc2V0dGluZyB0aGUgZGlyZWN0aXZlcyBmb3IgdGhlIGNvbXBvbmVudC5cbiAgICAgICAgICB0aGlzLnNjb3BlUmVnaXN0cnkuc2V0Q29tcG9uZW50UmVtb3RlU2NvcGUoXG4gICAgICAgICAgICAgIG5vZGUsIHVzZWREaXJlY3RpdmVzLm1hcChkaXIgPT4gZGlyLnJlZiksIHVzZWRQaXBlcy5tYXAocGlwZSA9PiBwaXBlLnJlZikpO1xuICAgICAgICAgIHN5bWJvbC5pc1JlbW90ZWx5U2NvcGVkID0gdHJ1ZTtcblxuICAgICAgICAgIC8vIElmIGEgc2VtYW50aWMgZ3JhcGggaXMgYmVpbmcgdHJhY2tlZCwgcmVjb3JkIHRoZSBmYWN0IHRoYXQgdGhpcyBjb21wb25lbnQgaXMgcmVtb3RlbHlcbiAgICAgICAgICAvLyBzY29wZWQgd2l0aCB0aGUgZGVjbGFyaW5nIE5nTW9kdWxlIHN5bWJvbCBhcyB0aGUgTmdNb2R1bGUncyBlbWl0IGJlY29tZXMgZGVwZW5kZW50IG9uXG4gICAgICAgICAgLy8gdGhlIGRpcmVjdGl2ZS9waXBlIHVzYWdlcyBvZiB0aGlzIGNvbXBvbmVudC5cbiAgICAgICAgICBpZiAodGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc3QgbW9kdWxlU3ltYm9sID0gdGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlci5nZXRTeW1ib2woc2NvcGUubmdNb2R1bGUpO1xuICAgICAgICAgICAgaWYgKCEobW9kdWxlU3ltYm9sIGluc3RhbmNlb2YgTmdNb2R1bGVTeW1ib2wpKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICAgIGBBc3NlcnRpb25FcnJvcjogRXhwZWN0ZWQgJHtzY29wZS5uZ01vZHVsZS5uYW1lfSB0byBiZSBhbiBOZ01vZHVsZVN5bWJvbC5gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbW9kdWxlU3ltYm9sLmFkZFJlbW90ZWx5U2NvcGVkQ29tcG9uZW50KFxuICAgICAgICAgICAgICAgIHN5bWJvbCwgc3ltYm9sLnVzZWREaXJlY3RpdmVzLCBzeW1ib2wudXNlZFBpcGVzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG5vdCBhYmxlIHRvIGhhbmRsZSB0aGlzIGN5Y2xlIHNvIHRocm93IGFuIGVycm9yLlxuICAgICAgICAgIGNvbnN0IHJlbGF0ZWRNZXNzYWdlczogdHMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbltdID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBbZGlyLCBjeWNsZV0gb2YgY3ljbGVzRnJvbURpcmVjdGl2ZXMpIHtcbiAgICAgICAgICAgIHJlbGF0ZWRNZXNzYWdlcy5wdXNoKFxuICAgICAgICAgICAgICAgIG1ha2VDeWNsaWNJbXBvcnRJbmZvKGRpci5yZWYsIGRpci5pc0NvbXBvbmVudCA/ICdjb21wb25lbnQnIDogJ2RpcmVjdGl2ZScsIGN5Y2xlKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgW3BpcGUsIGN5Y2xlXSBvZiBjeWNsZXNGcm9tUGlwZXMpIHtcbiAgICAgICAgICAgIHJlbGF0ZWRNZXNzYWdlcy5wdXNoKG1ha2VDeWNsaWNJbXBvcnRJbmZvKHBpcGUucmVmLCAncGlwZScsIGN5Y2xlKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLklNUE9SVF9DWUNMRV9ERVRFQ1RFRCwgbm9kZSxcbiAgICAgICAgICAgICAgJ09uZSBvciBtb3JlIGltcG9ydCBjeWNsZXMgd291bGQgbmVlZCB0byBiZSBjcmVhdGVkIHRvIGNvbXBpbGUgdGhpcyBjb21wb25lbnQsICcgK1xuICAgICAgICAgICAgICAgICAgJ3doaWNoIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgY29tcGlsZXIgY29uZmlndXJhdGlvbi4nLFxuICAgICAgICAgICAgICByZWxhdGVkTWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgaWYgKGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgIT09IG51bGwgJiZcbiAgICAgICAgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMgaW5zdGFuY2VvZiBXcmFwcGVkTm9kZUV4cHIpIHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyRGlhZ25vc3RpY3MgPSBnZXRQcm92aWRlckRpYWdub3N0aWNzKFxuICAgICAgICAgIGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIGFuYWx5c2lzLm1ldGEucHJvdmlkZXJzIS5ub2RlLFxuICAgICAgICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5KTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4ucHJvdmlkZXJEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgaWYgKGFuYWx5c2lzLnZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ICE9PSBudWxsICYmXG4gICAgICAgIGFuYWx5c2lzLm1ldGEudmlld1Byb3ZpZGVycyBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcikge1xuICAgICAgY29uc3Qgdmlld1Byb3ZpZGVyRGlhZ25vc3RpY3MgPSBnZXRQcm92aWRlckRpYWdub3N0aWNzKFxuICAgICAgICAgIGFuYWx5c2lzLnZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LCBhbmFseXNpcy5tZXRhLnZpZXdQcm92aWRlcnMhLm5vZGUsXG4gICAgICAgICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi52aWV3UHJvdmlkZXJEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlRGlhZ25vc3RpY3MgPSBnZXREaXJlY3RpdmVEaWFnbm9zdGljcyhcbiAgICAgICAgbm9kZSwgdGhpcy5tZXRhUmVhZGVyLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgJ0NvbXBvbmVudCcpO1xuICAgIGlmIChkaXJlY3RpdmVEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5kaXJlY3RpdmVEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIHJldHVybiB7ZGF0YX07XG4gIH1cblxuICB1cGRhdGVSZXNvdXJjZXMobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IENvbXBvbmVudEFuYWx5c2lzRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICAvLyBJZiB0aGUgdGVtcGxhdGUgaXMgZXh0ZXJuYWwsIHJlLXBhcnNlIGl0LlxuICAgIGNvbnN0IHRlbXBsYXRlRGVjbCA9IGFuYWx5c2lzLnRlbXBsYXRlLmRlY2xhcmF0aW9uO1xuICAgIGlmICghdGVtcGxhdGVEZWNsLmlzSW5saW5lKSB7XG4gICAgICBhbmFseXNpcy50ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIGFueSBleHRlcm5hbCBzdHlsZXNoZWV0cyBhbmQgcmVidWlsZCB0aGUgY29tYmluZWQgJ3N0eWxlcycgbGlzdC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHdyaXRlIHRlc3RzIGZvciBzdHlsZXMgd2hlbiB0aGUgcHJpbWFyeSBjb21waWxlciB1c2VzIHRoZSB1cGRhdGVSZXNvdXJjZXMgcGF0aFxuICAgIGxldCBzdHlsZXM6IHN0cmluZ1tdID0gW107XG4gICAgaWYgKGFuYWx5c2lzLnN0eWxlVXJscyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzdHlsZVVybCBvZiBhbmFseXNpcy5zdHlsZVVybHMpIHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VUeXBlID1cbiAgICAgICAgICAgIHN0eWxlVXJsLnNvdXJjZSA9PT0gUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IgP1xuICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IgOlxuICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZTtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWRTdHlsZVVybCA9IHRoaXMuX3Jlc29sdmVSZXNvdXJjZU9yVGhyb3coXG4gICAgICAgICAgICBzdHlsZVVybC51cmwsIGNvbnRhaW5pbmdGaWxlLCBzdHlsZVVybC5ub2RlRm9yRXJyb3IsIHJlc291cmNlVHlwZSk7XG4gICAgICAgIGNvbnN0IHN0eWxlVGV4dCA9IHRoaXMucmVzb3VyY2VMb2FkZXIubG9hZChyZXNvbHZlZFN0eWxlVXJsKTtcbiAgICAgICAgc3R5bGVzLnB1c2goc3R5bGVUZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGFuYWx5c2lzLmlubGluZVN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzdHlsZVRleHQgb2YgYW5hbHlzaXMuaW5saW5lU3R5bGVzKSB7XG4gICAgICAgIHN0eWxlcy5wdXNoKHN0eWxlVGV4dCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3R5bGVUZXh0IG9mIGFuYWx5c2lzLnRlbXBsYXRlLnN0eWxlcykge1xuICAgICAgc3R5bGVzLnB1c2goc3R5bGVUZXh0KTtcbiAgICB9XG5cbiAgICBhbmFseXNpcy5tZXRhLnN0eWxlcyA9IHN0eWxlcztcbiAgfVxuXG4gIGNvbXBpbGVGdWxsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICByZXNvbHV0aW9uOiBSZWFkb25seTxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4sIHBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgaWYgKGFuYWx5c2lzLnRlbXBsYXRlLmVycm9ycyAhPT0gbnVsbCAmJiBhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBtZXRhOiBSM0NvbXBvbmVudE1ldGFkYXRhID0gey4uLmFuYWx5c2lzLm1ldGEsIC4uLnJlc29sdXRpb259O1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZUNvbXBvbmVudChhbmFseXNpcywgZGVmKTtcbiAgfVxuXG4gIGNvbXBpbGVQYXJ0aWFsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICByZXNvbHV0aW9uOiBSZWFkb25seTxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGlmIChhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMgIT09IG51bGwgJiYgYW5hbHlzaXMudGVtcGxhdGUuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgbWV0YTogUjNDb21wb25lbnRNZXRhZGF0YSA9IHsuLi5hbmFseXNpcy5tZXRhLCAuLi5yZXNvbHV0aW9ufTtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlRGVjbGFyZUNvbXBvbmVudEZyb21NZXRhZGF0YShtZXRhLCBhbmFseXNpcy50ZW1wbGF0ZSk7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZUNvbXBvbmVudChhbmFseXNpcywgZGVmKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcGlsZUNvbXBvbmVudChcbiAgICAgIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+LFxuICAgICAge2V4cHJlc3Npb246IGluaXRpYWxpemVyLCB0eXBlfTogUjNDb21wb25lbnREZWYpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGZhY3RvcnlSZXMgPSBjb21waWxlTmdGYWN0b3J5RGVmRmllbGQoe1xuICAgICAgLi4uYW5hbHlzaXMubWV0YSxcbiAgICAgIGluamVjdEZuOiBJZGVudGlmaWVycy5kaXJlY3RpdmVJbmplY3QsXG4gICAgICB0YXJnZXQ6IFIzRmFjdG9yeVRhcmdldC5Db21wb25lbnQsXG4gICAgfSk7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIFtcbiAgICAgIGZhY3RvcnlSZXMsIHtcbiAgICAgICAgbmFtZTogJ8m1Y21wJyxcbiAgICAgICAgaW5pdGlhbGl6ZXIsXG4gICAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgICAgICB0eXBlLFxuICAgICAgfVxuICAgIF07XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3I6IERlY29yYXRvcik6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBpZiAodGhpcy5saXRlcmFsQ2FjaGUuaGFzKGRlY29yYXRvcikpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpdGVyYWxDYWNoZS5nZXQoZGVjb3JhdG9yKSE7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBDb21wb25lbnQgZGVjb3JhdG9yYCk7XG4gICAgfVxuICAgIGNvbnN0IG1ldGEgPSB1bndyYXBFeHByZXNzaW9uKGRlY29yYXRvci5hcmdzWzBdKTtcblxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLCBgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgICB9XG5cbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5zZXQoZGVjb3JhdG9yLCBtZXRhKTtcbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jlc29sdmVFbnVtVmFsdWUoXG4gICAgICBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBmaWVsZDogc3RyaW5nLCBlbnVtU3ltYm9sTmFtZTogc3RyaW5nKTogbnVtYmVyfG51bGwge1xuICAgIGxldCByZXNvbHZlZDogbnVtYmVyfG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKGZpZWxkKSkge1xuICAgICAgY29uc3QgZXhwciA9IGNvbXBvbmVudC5nZXQoZmllbGQpITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcikgYXMgYW55O1xuICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRW51bVZhbHVlICYmIGlzQW5ndWxhckNvcmVSZWZlcmVuY2UodmFsdWUuZW51bVJlZiwgZW51bVN5bWJvbE5hbWUpKSB7XG4gICAgICAgIHJlc29sdmVkID0gdmFsdWUucmVzb2x2ZWQgYXMgbnVtYmVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGV4cHIsIHZhbHVlLCBgJHtmaWVsZH0gbXVzdCBiZSBhIG1lbWJlciBvZiAke2VudW1TeW1ib2xOYW1lfSBlbnVtIGZyb20gQGFuZ3VsYXIvY29yZWApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0Q29tcG9uZW50U3R5bGVVcmxzKFxuICAgICAgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPixcbiAgICAgICk6IFN0eWxlVXJsTWV0YVtdIHtcbiAgICBpZiAoIWNvbXBvbmVudC5oYXMoJ3N0eWxlVXJscycpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2V4dHJhY3RTdHlsZVVybHNGcm9tRXhwcmVzc2lvbihjb21wb25lbnQuZ2V0KCdzdHlsZVVybHMnKSEpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdFN0eWxlVXJsc0Zyb21FeHByZXNzaW9uKHN0eWxlVXJsc0V4cHI6IHRzLkV4cHJlc3Npb24pOiBTdHlsZVVybE1ldGFbXSB7XG4gICAgY29uc3Qgc3R5bGVVcmxzOiBTdHlsZVVybE1ldGFbXSA9IFtdO1xuXG4gICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihzdHlsZVVybHNFeHByKSkge1xuICAgICAgZm9yIChjb25zdCBzdHlsZVVybEV4cHIgb2Ygc3R5bGVVcmxzRXhwci5lbGVtZW50cykge1xuICAgICAgICBpZiAodHMuaXNTcHJlYWRFbGVtZW50KHN0eWxlVXJsRXhwcikpIHtcbiAgICAgICAgICBzdHlsZVVybHMucHVzaCguLi50aGlzLl9leHRyYWN0U3R5bGVVcmxzRnJvbUV4cHJlc3Npb24oc3R5bGVVcmxFeHByLmV4cHJlc3Npb24pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBzdHlsZVVybCA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHN0eWxlVXJsRXhwcik7XG5cbiAgICAgICAgICBpZiAodHlwZW9mIHN0eWxlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihzdHlsZVVybEV4cHIsIHN0eWxlVXJsLCAnc3R5bGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0eWxlVXJscy5wdXNoKHtcbiAgICAgICAgICAgIHVybDogc3R5bGVVcmwsXG4gICAgICAgICAgICBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yLFxuICAgICAgICAgICAgbm9kZUZvckVycm9yOiBzdHlsZVVybEV4cHIsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZXZhbHVhdGVkU3R5bGVVcmxzID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoc3R5bGVVcmxzRXhwcik7XG4gICAgICBpZiAoIWlzU3RyaW5nQXJyYXkoZXZhbHVhdGVkU3R5bGVVcmxzKSkge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgc3R5bGVVcmxzRXhwciwgZXZhbHVhdGVkU3R5bGVVcmxzLCAnc3R5bGVVcmxzIG11c3QgYmUgYW4gYXJyYXkgb2Ygc3RyaW5ncycpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHN0eWxlVXJsIG9mIGV2YWx1YXRlZFN0eWxlVXJscykge1xuICAgICAgICBzdHlsZVVybHMucHVzaCh7XG4gICAgICAgICAgdXJsOiBzdHlsZVVybCxcbiAgICAgICAgICBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yLFxuICAgICAgICAgIG5vZGVGb3JFcnJvcjogc3R5bGVVcmxzRXhwcixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0eWxlVXJscztcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RTdHlsZVJlc291cmNlcyhjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBjb250YWluaW5nRmlsZTogc3RyaW5nKTpcbiAgICAgIFJlYWRvbmx5U2V0PFJlc291cmNlPiB7XG4gICAgY29uc3Qgc3R5bGVzID0gbmV3IFNldDxSZXNvdXJjZT4oKTtcbiAgICBmdW5jdGlvbiBzdHJpbmdMaXRlcmFsRWxlbWVudHMoYXJyYXk6IHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24pOiB0cy5TdHJpbmdMaXRlcmFsTGlrZVtdIHtcbiAgICAgIHJldHVybiBhcnJheS5lbGVtZW50cy5maWx0ZXIoXG4gICAgICAgICAgKGU6IHRzLkV4cHJlc3Npb24pOiBlIGlzIHRzLlN0cmluZ0xpdGVyYWxMaWtlID0+IHRzLmlzU3RyaW5nTGl0ZXJhbExpa2UoZSkpO1xuICAgIH1cblxuICAgIC8vIElmIHN0eWxlVXJscyBpcyBhIGxpdGVyYWwgYXJyYXksIHByb2Nlc3MgZWFjaCByZXNvdXJjZSB1cmwgaW5kaXZpZHVhbGx5IGFuZFxuICAgIC8vIHJlZ2lzdGVyIG9uZXMgdGhhdCBhcmUgc3RyaW5nIGxpdGVyYWxzLlxuICAgIGNvbnN0IHN0eWxlVXJsc0V4cHIgPSBjb21wb25lbnQuZ2V0KCdzdHlsZVVybHMnKTtcbiAgICBpZiAoc3R5bGVVcmxzRXhwciAhPT0gdW5kZWZpbmVkICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihzdHlsZVVybHNFeHByKSkge1xuICAgICAgZm9yIChjb25zdCBleHByZXNzaW9uIG9mIHN0cmluZ0xpdGVyYWxFbGVtZW50cyhzdHlsZVVybHNFeHByKSkge1xuICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMuX3Jlc29sdmVSZXNvdXJjZU9yVGhyb3coXG4gICAgICAgICAgICBleHByZXNzaW9uLnRleHQsIGNvbnRhaW5pbmdGaWxlLCBleHByZXNzaW9uLFxuICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IpO1xuICAgICAgICBzdHlsZXMuYWRkKHtwYXRoOiBhYnNvbHV0ZUZyb20ocmVzb3VyY2VVcmwpLCBleHByZXNzaW9ufSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc3R5bGVzRXhwciA9IGNvbXBvbmVudC5nZXQoJ3N0eWxlcycpO1xuICAgIGlmIChzdHlsZXNFeHByICE9PSB1bmRlZmluZWQgJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHN0eWxlc0V4cHIpKSB7XG4gICAgICBmb3IgKGNvbnN0IGV4cHJlc3Npb24gb2Ygc3RyaW5nTGl0ZXJhbEVsZW1lbnRzKHN0eWxlc0V4cHIpKSB7XG4gICAgICAgIHN0eWxlcy5hZGQoe3BhdGg6IG51bGwsIGV4cHJlc3Npb259KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3R5bGVzO1xuICB9XG5cbiAgcHJpdmF0ZSBfcHJlbG9hZEFuZFBhcnNlVGVtcGxhdGUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvciwgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPixcbiAgICAgIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBQcm9taXNlPFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZXxudWxsPiB7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgIC8vIEV4dHJhY3QgdGhlIHRlbXBsYXRlVXJsIGFuZCBwcmVsb2FkIGl0LlxuICAgICAgY29uc3QgdGVtcGxhdGVVcmxFeHByID0gY29tcG9uZW50LmdldCgndGVtcGxhdGVVcmwnKSE7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybCA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHRlbXBsYXRlVXJsRXhwcik7XG4gICAgICBpZiAodHlwZW9mIHRlbXBsYXRlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgdGVtcGxhdGVVcmxFeHByLCB0ZW1wbGF0ZVVybCwgJ3RlbXBsYXRlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5fcmVzb2x2ZVJlc291cmNlT3JUaHJvdyhcbiAgICAgICAgICB0ZW1wbGF0ZVVybCwgY29udGFpbmluZ0ZpbGUsIHRlbXBsYXRlVXJsRXhwciwgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuVGVtcGxhdGUpO1xuICAgICAgY29uc3QgdGVtcGxhdGVQcm9taXNlID0gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkKHJlc291cmNlVXJsKTtcblxuICAgICAgLy8gSWYgdGhlIHByZWxvYWQgd29ya2VkLCB0aGVuIGFjdHVhbGx5IGxvYWQgYW5kIHBhcnNlIHRoZSB0ZW1wbGF0ZSwgYW5kIHdhaXQgZm9yIGFueSBzdHlsZVxuICAgICAgLy8gVVJMcyB0byByZXNvbHZlLlxuICAgICAgaWYgKHRlbXBsYXRlUHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZVByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3QgdGVtcGxhdGVEZWNsID0gdGhpcy5wYXJzZVRlbXBsYXRlRGVjbGFyYXRpb24oZGVjb3JhdG9yLCBjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgICAgICAgdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5zZXQobm9kZSwgdGVtcGxhdGUpO1xuICAgICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPSB0aGlzLnBhcnNlVGVtcGxhdGVEZWNsYXJhdGlvbihkZWNvcmF0b3IsIGNvbXBvbmVudCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLmV4dHJhY3RUZW1wbGF0ZShub2RlLCB0ZW1wbGF0ZURlY2wpO1xuICAgICAgdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5zZXQobm9kZSwgdGVtcGxhdGUpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0ZW1wbGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0VGVtcGxhdGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgdGVtcGxhdGU6IFRlbXBsYXRlRGVjbGFyYXRpb24pOlxuICAgICAgUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlIHtcbiAgICBpZiAodGVtcGxhdGUuaXNJbmxpbmUpIHtcbiAgICAgIGxldCB0ZW1wbGF0ZVN0cjogc3RyaW5nO1xuICAgICAgbGV0IHRlbXBsYXRlTGl0ZXJhbDogdHMuTm9kZXxudWxsID0gbnVsbDtcbiAgICAgIGxldCB0ZW1wbGF0ZVVybDogc3RyaW5nID0gJyc7XG4gICAgICBsZXQgdGVtcGxhdGVSYW5nZTogTGV4ZXJSYW5nZXxudWxsID0gbnVsbDtcbiAgICAgIGxldCBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gICAgICBsZXQgZXNjYXBlZFN0cmluZyA9IGZhbHNlO1xuICAgICAgLy8gV2Ugb25seSBzdXBwb3J0IFNvdXJjZU1hcHMgZm9yIGlubGluZSB0ZW1wbGF0ZXMgdGhhdCBhcmUgc2ltcGxlIHN0cmluZyBsaXRlcmFscy5cbiAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwodGVtcGxhdGUuZXhwcmVzc2lvbikgfHxcbiAgICAgICAgICB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKHRlbXBsYXRlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIC8vIHRoZSBzdGFydCBhbmQgZW5kIG9mIHRoZSBgdGVtcGxhdGVFeHByYCBub2RlIGluY2x1ZGVzIHRoZSBxdW90YXRpb24gbWFya3MsIHdoaWNoIHdlIG11c3RcbiAgICAgICAgLy8gc3RyaXBcbiAgICAgICAgdGVtcGxhdGVSYW5nZSA9IGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGUuZXhwcmVzc2lvbik7XG4gICAgICAgIHRlbXBsYXRlU3RyID0gdGVtcGxhdGUuZXhwcmVzc2lvbi5nZXRTb3VyY2VGaWxlKCkudGV4dDtcbiAgICAgICAgdGVtcGxhdGVMaXRlcmFsID0gdGVtcGxhdGUuZXhwcmVzc2lvbjtcbiAgICAgICAgdGVtcGxhdGVVcmwgPSB0ZW1wbGF0ZS50ZW1wbGF0ZVVybDtcbiAgICAgICAgZXNjYXBlZFN0cmluZyA9IHRydWU7XG4gICAgICAgIHNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgICAgdHlwZTogJ2RpcmVjdCcsXG4gICAgICAgICAgbm9kZTogdGVtcGxhdGUuZXhwcmVzc2lvbixcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkVGVtcGxhdGUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZS5leHByZXNzaW9uKTtcbiAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZFRlbXBsYXRlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIHRlbXBsYXRlLmV4cHJlc3Npb24sIHJlc29sdmVkVGVtcGxhdGUsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGVtcGxhdGVTdHIgPSByZXNvbHZlZFRlbXBsYXRlO1xuICAgICAgICBzb3VyY2VNYXBwaW5nID0ge1xuICAgICAgICAgIHR5cGU6ICdpbmRpcmVjdCcsXG4gICAgICAgICAgbm9kZTogdGVtcGxhdGUuZXhwcmVzc2lvbixcbiAgICAgICAgICBjb21wb25lbnRDbGFzczogbm9kZSxcbiAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVTdHIsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLnRoaXMuX3BhcnNlVGVtcGxhdGUodGVtcGxhdGUsIHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZVJhbmdlLCBlc2NhcGVkU3RyaW5nKSxcbiAgICAgICAgc291cmNlTWFwcGluZyxcbiAgICAgICAgZGVjbGFyYXRpb246IHRlbXBsYXRlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGVTdHIgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQodGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybCk7XG4gICAgICBpZiAodGhpcy5kZXBUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuZGVwVHJhY2tlci5hZGRSZXNvdXJjZURlcGVuZGVuY3koXG4gICAgICAgICAgICBub2RlLmdldFNvdXJjZUZpbGUoKSwgYWJzb2x1dGVGcm9tKHRlbXBsYXRlLnJlc29sdmVkVGVtcGxhdGVVcmwpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4udGhpcy5fcGFyc2VUZW1wbGF0ZShcbiAgICAgICAgICAgIHRlbXBsYXRlLCB0ZW1wbGF0ZVN0ciwgLyogdGVtcGxhdGVSYW5nZSAqLyBudWxsLFxuICAgICAgICAgICAgLyogZXNjYXBlZFN0cmluZyAqLyBmYWxzZSksXG4gICAgICAgIHNvdXJjZU1hcHBpbmc6IHtcbiAgICAgICAgICB0eXBlOiAnZXh0ZXJuYWwnLFxuICAgICAgICAgIGNvbXBvbmVudENsYXNzOiBub2RlLFxuICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogVFMgaW4gZzMgaXMgdW5hYmxlIHRvIG1ha2UgdGhpcyBpbmZlcmVuY2Ugb24gaXRzIG93biwgc28gY2FzdCBpdCBoZXJlXG4gICAgICAgICAgLy8gdW50aWwgZzMgaXMgYWJsZSB0byBmaWd1cmUgdGhpcyBvdXQuXG4gICAgICAgICAgbm9kZTogKHRlbXBsYXRlIGFzIEV4dGVybmFsVGVtcGxhdGVEZWNsYXJhdGlvbikudGVtcGxhdGVVcmxFeHByZXNzaW9uLFxuICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVN0cixcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybCxcbiAgICAgICAgfSxcbiAgICAgICAgZGVjbGFyYXRpb246IHRlbXBsYXRlLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9wYXJzZVRlbXBsYXRlKFxuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlRGVjbGFyYXRpb24sIHRlbXBsYXRlU3RyOiBzdHJpbmcsIHRlbXBsYXRlUmFuZ2U6IExleGVyUmFuZ2V8bnVsbCxcbiAgICAgIGVzY2FwZWRTdHJpbmc6IGJvb2xlYW4pOiBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSB7XG4gICAgLy8gV2UgYWx3YXlzIG5vcm1hbGl6ZSBsaW5lIGVuZGluZ3MgaWYgdGhlIHRlbXBsYXRlIGhhcyBiZWVuIGVzY2FwZWQgKGkuZS4gaXMgaW5saW5lKS5cbiAgICBjb25zdCBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgPSBlc2NhcGVkU3RyaW5nIHx8IHRoaXMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzO1xuXG4gICAgY29uc3QgcGFyc2VkVGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZS5zb3VyY2VNYXBVcmwsIHtcbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXM6IHRlbXBsYXRlLnByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnOiB0ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uQ29uZmlnLFxuICAgICAgcmFuZ2U6IHRlbXBsYXRlUmFuZ2UgPz8gdW5kZWZpbmVkLFxuICAgICAgZXNjYXBlZFN0cmluZyxcbiAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IHRoaXMuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICAgIGkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyxcbiAgICAgIGlzSW5saW5lOiB0ZW1wbGF0ZS5pc0lubGluZSxcbiAgICB9KTtcblxuICAgIC8vIFVuZm9ydHVuYXRlbHksIHRoZSBwcmltYXJ5IHBhcnNlIG9mIHRoZSB0ZW1wbGF0ZSBhYm92ZSBtYXkgbm90IGNvbnRhaW4gYWNjdXJhdGUgc291cmNlIG1hcFxuICAgIC8vIGluZm9ybWF0aW9uLiBJZiB1c2VkIGRpcmVjdGx5LCBpdCB3b3VsZCByZXN1bHQgaW4gaW5jb3JyZWN0IGNvZGUgbG9jYXRpb25zIGluIHRlbXBsYXRlXG4gICAgLy8gZXJyb3JzLCBldGMuIFRoZXJlIGFyZSB0aHJlZSBtYWluIHByb2JsZW1zOlxuICAgIC8vXG4gICAgLy8gMS4gYHByZXNlcnZlV2hpdGVzcGFjZXM6IGZhbHNlYCBhbm5paGlsYXRlcyB0aGUgY29ycmVjdG5lc3Mgb2YgdGVtcGxhdGUgc291cmNlIG1hcHBpbmcsIGFzXG4gICAgLy8gICAgdGhlIHdoaXRlc3BhY2UgdHJhbnNmb3JtYXRpb24gY2hhbmdlcyB0aGUgY29udGVudHMgb2YgSFRNTCB0ZXh0IG5vZGVzIGJlZm9yZSB0aGV5J3JlXG4gICAgLy8gICAgcGFyc2VkIGludG8gQW5ndWxhciBleHByZXNzaW9ucy5cbiAgICAvLyAyLiBgcHJlc2VydmVMaW5lRW5kaW5nczogZmFsc2VgIGNhdXNlcyBncm93aW5nIG1pc2FsaWdubWVudHMgaW4gdGVtcGxhdGVzIHRoYXQgdXNlICdcXHJcXG4nXG4gICAgLy8gICAgbGluZSBlbmRpbmdzLCBieSBub3JtYWxpemluZyB0aGVtIHRvICdcXG4nLlxuICAgIC8vIDMuIEJ5IGRlZmF1bHQsIHRoZSB0ZW1wbGF0ZSBwYXJzZXIgc3RyaXBzIGxlYWRpbmcgdHJpdmlhIGNoYXJhY3RlcnMgKGxpa2Ugc3BhY2VzLCB0YWJzLCBhbmRcbiAgICAvLyAgICBuZXdsaW5lcykuIFRoaXMgYWxzbyBkZXN0cm95cyBzb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbi5cbiAgICAvL1xuICAgIC8vIEluIG9yZGVyIHRvIGd1YXJhbnRlZSB0aGUgY29ycmVjdG5lc3Mgb2YgZGlhZ25vc3RpY3MsIHRlbXBsYXRlcyBhcmUgcGFyc2VkIGEgc2Vjb25kIHRpbWVcbiAgICAvLyB3aXRoIHRoZSBhYm92ZSBvcHRpb25zIHNldCB0byBwcmVzZXJ2ZSBzb3VyY2UgbWFwcGluZ3MuXG5cbiAgICBjb25zdCB7bm9kZXM6IGRpYWdOb2Rlc30gPSBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZS5zb3VyY2VNYXBVcmwsIHtcbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXM6IHRydWUsXG4gICAgICBwcmVzZXJ2ZUxpbmVFbmRpbmdzOiB0cnVlLFxuICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZzogdGVtcGxhdGUuaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgIHJhbmdlOiB0ZW1wbGF0ZVJhbmdlID8/IHVuZGVmaW5lZCxcbiAgICAgIGVzY2FwZWRTdHJpbmcsXG4gICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiB0aGlzLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMsXG4gICAgICBsZWFkaW5nVHJpdmlhQ2hhcnM6IFtdLFxuICAgICAgaXNJbmxpbmU6IHRlbXBsYXRlLmlzSW5saW5lLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLnBhcnNlZFRlbXBsYXRlLFxuICAgICAgZGlhZ05vZGVzLFxuICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlLmlzSW5saW5lID8gbmV3IFdyYXBwZWROb2RlRXhwcih0ZW1wbGF0ZS5leHByZXNzaW9uKSA6IHRlbXBsYXRlU3RyLFxuICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlLnJlc29sdmVkVGVtcGxhdGVVcmwsXG4gICAgICBpc0lubGluZTogdGVtcGxhdGUuaXNJbmxpbmUsXG4gICAgICBmaWxlOiBuZXcgUGFyc2VTb3VyY2VGaWxlKHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZVRlbXBsYXRlRGVjbGFyYXRpb24oXG4gICAgICBkZWNvcmF0b3I6IERlY29yYXRvciwgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPixcbiAgICAgIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBUZW1wbGF0ZURlY2xhcmF0aW9uIHtcbiAgICBsZXQgcHJlc2VydmVXaGl0ZXNwYWNlczogYm9vbGVhbiA9IHRoaXMuZGVmYXVsdFByZXNlcnZlV2hpdGVzcGFjZXM7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSkge1xuICAgICAgY29uc3QgZXhwciA9IGNvbXBvbmVudC5nZXQoJ3ByZXNlcnZlV2hpdGVzcGFjZXMnKSE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoZXhwciwgdmFsdWUsICdwcmVzZXJ2ZVdoaXRlc3BhY2VzIG11c3QgYmUgYSBib29sZWFuJyk7XG4gICAgICB9XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzID0gdmFsdWU7XG4gICAgfVxuXG4gICAgbGV0IGludGVycG9sYXRpb25Db25maWcgPSBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdpbnRlcnBvbGF0aW9uJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KCdpbnRlcnBvbGF0aW9uJykhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUubGVuZ3RoICE9PSAyIHx8XG4gICAgICAgICAgIXZhbHVlLmV2ZXJ5KGVsZW1lbnQgPT4gdHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSkge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgZXhwciwgdmFsdWUsICdpbnRlcnBvbGF0aW9uIG11c3QgYmUgYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzIG9mIHN0cmluZyB0eXBlJyk7XG4gICAgICB9XG4gICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnID0gSW50ZXJwb2xhdGlvbkNvbmZpZy5mcm9tQXJyYXkodmFsdWUgYXMgW3N0cmluZywgc3RyaW5nXSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykhO1xuICAgICAgY29uc3QgdGVtcGxhdGVVcmwgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZVVybEV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZVVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsRXhwciwgdGVtcGxhdGVVcmwsICd0ZW1wbGF0ZVVybCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMuX3Jlc29sdmVSZXNvdXJjZU9yVGhyb3coXG4gICAgICAgICAgdGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlLCB0ZW1wbGF0ZVVybEV4cHIsIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlRlbXBsYXRlKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNJbmxpbmU6IGZhbHNlLFxuICAgICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnLFxuICAgICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICB0ZW1wbGF0ZVVybCxcbiAgICAgICAgdGVtcGxhdGVVcmxFeHByZXNzaW9uOiB0ZW1wbGF0ZVVybEV4cHIsXG4gICAgICAgIHJlc29sdmVkVGVtcGxhdGVVcmw6IHJlc291cmNlVXJsLFxuICAgICAgICBzb3VyY2VNYXBVcmw6IHNvdXJjZU1hcFVybChyZXNvdXJjZVVybCksXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGUnKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNJbmxpbmU6IHRydWUsXG4gICAgICAgIGludGVycG9sYXRpb25Db25maWcsXG4gICAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgICAgIGV4cHJlc3Npb246IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlJykhLFxuICAgICAgICB0ZW1wbGF0ZVVybDogY29udGFpbmluZ0ZpbGUsXG4gICAgICAgIHJlc29sdmVkVGVtcGxhdGVVcmw6IGNvbnRhaW5pbmdGaWxlLFxuICAgICAgICBzb3VyY2VNYXBVcmw6IGNvbnRhaW5pbmdGaWxlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5DT01QT05FTlRfTUlTU0lOR19URU1QTEFURSwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgICdjb21wb25lbnQgaXMgbWlzc2luZyBhIHRlbXBsYXRlJyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZXhwcmVzc2lvblRvSW1wb3J0ZWRGaWxlKGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgd2hhdCBmaWxlIGlzIGJlaW5nIGltcG9ydGVkLlxuICAgIHJldHVybiB0aGlzLm1vZHVsZVJlc29sdmVyLnJlc29sdmVNb2R1bGUoZXhwci52YWx1ZS5tb2R1bGVOYW1lISwgb3JpZ2luLmZpbGVOYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGFkZGluZyBhbiBpbXBvcnQgZnJvbSBgb3JpZ2luYCB0byB0aGUgc291cmNlLWZpbGUgY29ycmVzcG9uZGluZyB0byBgZXhwcmAgd291bGRcbiAgICogY3JlYXRlIGEgY3ljbGljIGltcG9ydC5cbiAgICpcbiAgICogQHJldHVybnMgYSBgQ3ljbGVgIG9iamVjdCBpZiBhIGN5Y2xlIHdvdWxkIGJlIGNyZWF0ZWQsIG90aGVyd2lzZSBgbnVsbGAuXG4gICAqL1xuICBwcml2YXRlIF9jaGVja0ZvckN5Y2xpY0ltcG9ydChyZWY6IFJlZmVyZW5jZSwgZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogQ3ljbGVcbiAgICAgIHxudWxsIHtcbiAgICBjb25zdCBpbXBvcnRlZEZpbGUgPSB0aGlzLl9leHByZXNzaW9uVG9JbXBvcnRlZEZpbGUoZXhwciwgb3JpZ2luKTtcbiAgICBpZiAoaW1wb3J0ZWRGaWxlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgaW1wb3J0IGlzIGxlZ2FsLlxuICAgIHJldHVybiB0aGlzLmN5Y2xlQW5hbHl6ZXIud291bGRDcmVhdGVDeWNsZShvcmlnaW4sIGltcG9ydGVkRmlsZSk7XG4gIH1cblxuICBwcml2YXRlIF9yZWNvcmRTeW50aGV0aWNJbXBvcnQoZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLl9leHByZXNzaW9uVG9JbXBvcnRlZEZpbGUoZXhwciwgb3JpZ2luKTtcbiAgICBpZiAoaW1wb3J0ZWQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIucmVjb3JkU3ludGhldGljSW1wb3J0KG9yaWdpbiwgaW1wb3J0ZWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc29sdmUgdGhlIHVybCBvZiBhIHJlc291cmNlIHJlbGF0aXZlIHRvIHRoZSBmaWxlIHRoYXQgY29udGFpbnMgdGhlIHJlZmVyZW5jZSB0byBpdC5cbiAgICpcbiAgICogVGhyb3dzIGEgRmF0YWxEaWFnbm9zdGljRXJyb3Igd2hlbiB1bmFibGUgdG8gcmVzb2x2ZSB0aGUgZmlsZS5cbiAgICovXG4gIHByaXZhdGUgX3Jlc29sdmVSZXNvdXJjZU9yVGhyb3coXG4gICAgICBmaWxlOiBzdHJpbmcsIGJhc2VQYXRoOiBzdHJpbmcsIG5vZGVGb3JFcnJvcjogdHMuTm9kZSxcbiAgICAgIHJlc291cmNlVHlwZTogUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MpOiBzdHJpbmcge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvdXJjZUxvYWRlci5yZXNvbHZlKGZpbGUsIGJhc2VQYXRoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsZXQgZXJyb3JUZXh0OiBzdHJpbmc7XG4gICAgICBzd2l0Y2ggKHJlc291cmNlVHlwZSkge1xuICAgICAgICBjYXNlIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlRlbXBsYXRlOlxuICAgICAgICAgIGVycm9yVGV4dCA9IGBDb3VsZCBub3QgZmluZCB0ZW1wbGF0ZSBmaWxlICcke2ZpbGV9Jy5gO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGU6XG4gICAgICAgICAgZXJyb3JUZXh0ID0gYENvdWxkIG5vdCBmaW5kIHN0eWxlc2hlZXQgZmlsZSAnJHtmaWxlfScgbGlua2VkIGZyb20gdGhlIHRlbXBsYXRlLmA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3I6XG4gICAgICAgICAgZXJyb3JUZXh0ID0gYENvdWxkIG5vdCBmaW5kIHN0eWxlc2hlZXQgZmlsZSAnJHtmaWxlfScuYDtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5DT01QT05FTlRfUkVTT1VSQ0VfTk9UX0ZPVU5ELCBub2RlRm9yRXJyb3IsIGVycm9yVGV4dCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdFRlbXBsYXRlU3R5bGVVcmxzKHRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2UpOiBTdHlsZVVybE1ldGFbXSB7XG4gICAgaWYgKHRlbXBsYXRlLnN0eWxlVXJscyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IG5vZGVGb3JFcnJvciA9IGdldFRlbXBsYXRlRGVjbGFyYXRpb25Ob2RlRm9yRXJyb3IodGVtcGxhdGUuZGVjbGFyYXRpb24pO1xuICAgIHJldHVybiB0ZW1wbGF0ZS5zdHlsZVVybHMubWFwKFxuICAgICAgICB1cmwgPT4gKHt1cmwsIHNvdXJjZTogUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZSwgbm9kZUZvckVycm9yfSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGVFeHByOiB0cy5FeHByZXNzaW9uKSB7XG4gIGNvbnN0IHN0YXJ0UG9zID0gdGVtcGxhdGVFeHByLmdldFN0YXJ0KCkgKyAxO1xuICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9XG4gICAgICB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbih0ZW1wbGF0ZUV4cHIuZ2V0U291cmNlRmlsZSgpLCBzdGFydFBvcyk7XG4gIHJldHVybiB7XG4gICAgc3RhcnRQb3MsXG4gICAgc3RhcnRMaW5lOiBsaW5lLFxuICAgIHN0YXJ0Q29sOiBjaGFyYWN0ZXIsXG4gICAgZW5kUG9zOiB0ZW1wbGF0ZUV4cHIuZ2V0RW5kKCkgLSAxLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzb3VyY2VNYXBVcmwocmVzb3VyY2VVcmw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghdHNTb3VyY2VNYXBCdWcyOTMwMEZpeGVkKCkpIHtcbiAgICAvLyBCeSByZW1vdmluZyB0aGUgdGVtcGxhdGUgVVJMIHdlIGFyZSB0ZWxsaW5nIHRoZSB0cmFuc2xhdG9yIG5vdCB0byB0cnkgdG9cbiAgICAvLyBtYXAgdGhlIGV4dGVybmFsIHNvdXJjZSBmaWxlIHRvIHRoZSBnZW5lcmF0ZWQgY29kZSwgc2luY2UgdGhlIHZlcnNpb25cbiAgICAvLyBvZiBUUyB0aGF0IGlzIHJ1bm5pbmcgZG9lcyBub3Qgc3VwcG9ydCBpdC5cbiAgICByZXR1cm4gJyc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlc291cmNlVXJsO1xuICB9XG59XG5cbi8qKiBEZXRlcm1pbmVzIGlmIHRoZSByZXN1bHQgb2YgYW4gZXZhbHVhdGlvbiBpcyBhIHN0cmluZyBhcnJheS4gKi9cbmZ1bmN0aW9uIGlzU3RyaW5nQXJyYXkocmVzb2x2ZWRWYWx1ZTogUmVzb2x2ZWRWYWx1ZSk6IHJlc29sdmVkVmFsdWUgaXMgc3RyaW5nW10ge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShyZXNvbHZlZFZhbHVlKSAmJiByZXNvbHZlZFZhbHVlLmV2ZXJ5KGVsZW0gPT4gdHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnKTtcbn1cblxuLyoqIERldGVybWluZXMgdGhlIG5vZGUgdG8gdXNlIGZvciBkZWJ1Z2dpbmcgcHVycG9zZXMgZm9yIHRoZSBnaXZlbiBUZW1wbGF0ZURlY2xhcmF0aW9uLiAqL1xuZnVuY3Rpb24gZ2V0VGVtcGxhdGVEZWNsYXJhdGlvbk5vZGVGb3JFcnJvcihkZWNsYXJhdGlvbjogVGVtcGxhdGVEZWNsYXJhdGlvbik6IHRzLk5vZGUge1xuICAvLyBUT0RPKHphcmVuZCk6IENoYW5nZSB0aGlzIHRvIGlmL2Vsc2Ugd2hlbiB0aGF0IGlzIGNvbXBhdGlibGUgd2l0aCBnMy4gVGhpcyB1c2VzIGEgc3dpdGNoXG4gIC8vIGJlY2F1c2UgaWYvZWxzZSBmYWlscyB0byBjb21waWxlIG9uIGczLiBUaGF0IGlzIGJlY2F1c2UgZzMgY29tcGlsZXMgdGhpcyBpbiBub24tc3RyaWN0IG1vZGVcbiAgLy8gd2hlcmUgdHlwZSBpbmZlcmVuY2UgZG9lcyBub3Qgd29yayBjb3JyZWN0bHkuXG4gIHN3aXRjaCAoZGVjbGFyYXRpb24uaXNJbmxpbmUpIHtcbiAgICBjYXNlIHRydWU6XG4gICAgICByZXR1cm4gZGVjbGFyYXRpb24uZXhwcmVzc2lvbjtcbiAgICBjYXNlIGZhbHNlOlxuICAgICAgcmV0dXJuIGRlY2xhcmF0aW9uLnRlbXBsYXRlVXJsRXhwcmVzc2lvbjtcbiAgfVxufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSB0ZW1wbGF0ZSB3aGljaCB3YXMgZXh0cmFjdGVkIGR1cmluZyBwYXJzaW5nLlxuICpcbiAqIFRoaXMgY29udGFpbnMgdGhlIGFjdHVhbCBwYXJzZWQgdGVtcGxhdGUgYXMgd2VsbCBhcyBhbnkgbWV0YWRhdGEgY29sbGVjdGVkIGR1cmluZyBpdHMgcGFyc2luZyxcbiAqIHNvbWUgb2Ygd2hpY2ggbWlnaHQgYmUgdXNlZnVsIGZvciByZS1wYXJzaW5nIHRoZSB0ZW1wbGF0ZSB3aXRoIGRpZmZlcmVudCBvcHRpb25zLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZENvbXBvbmVudFRlbXBsYXRlIGV4dGVuZHMgUGFyc2VkVGVtcGxhdGUge1xuICAvKipcbiAgICogVHJ1ZSBpZiB0aGUgb3JpZ2luYWwgdGVtcGxhdGUgd2FzIHN0b3JlZCBpbmxpbmU7XG4gICAqIEZhbHNlIGlmIHRoZSB0ZW1wbGF0ZSB3YXMgaW4gYW4gZXh0ZXJuYWwgZmlsZS5cbiAgICovXG4gIGlzSW5saW5lOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgdGVtcGxhdGUgQVNULCBwYXJzZWQgaW4gYSBtYW5uZXIgd2hpY2ggcHJlc2VydmVzIHNvdXJjZSBtYXAgaW5mb3JtYXRpb24gZm9yIGRpYWdub3N0aWNzLlxuICAgKlxuICAgKiBOb3QgdXNlZnVsIGZvciBlbWl0LlxuICAgKi9cbiAgZGlhZ05vZGVzOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBUaGUgYFBhcnNlU291cmNlRmlsZWAgZm9yIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIGZpbGU6IFBhcnNlU291cmNlRmlsZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2UgZXh0ZW5kcyBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSB7XG4gIHNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgZGVjbGFyYXRpb246IFRlbXBsYXRlRGVjbGFyYXRpb247XG59XG5cbi8qKlxuICogQ29tbW9uIGZpZWxkcyBleHRyYWN0ZWQgZnJvbSB0aGUgZGVjbGFyYXRpb24gb2YgYSB0ZW1wbGF0ZS5cbiAqL1xuaW50ZXJmYWNlIENvbW1vblRlbXBsYXRlRGVjbGFyYXRpb24ge1xuICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuO1xuICBpbnRlcnBvbGF0aW9uQ29uZmlnOiBJbnRlcnBvbGF0aW9uQ29uZmlnO1xuICB0ZW1wbGF0ZVVybDogc3RyaW5nO1xuICByZXNvbHZlZFRlbXBsYXRlVXJsOiBzdHJpbmc7XG4gIHNvdXJjZU1hcFVybDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNsYXJhdGlvbiBvZiBhbiBpbmxpbmUgdGVtcGxhdGUuXG4gKi9cbmludGVyZmFjZSBJbmxpbmVUZW1wbGF0ZURlY2xhcmF0aW9uIGV4dGVuZHMgQ29tbW9uVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gIGlzSW5saW5lOiB0cnVlO1xuICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNsYXJhdGlvbiBvZiBhbiBleHRlcm5hbCB0ZW1wbGF0ZS5cbiAqL1xuaW50ZXJmYWNlIEV4dGVybmFsVGVtcGxhdGVEZWNsYXJhdGlvbiBleHRlbmRzIENvbW1vblRlbXBsYXRlRGVjbGFyYXRpb24ge1xuICBpc0lubGluZTogZmFsc2U7XG4gIHRlbXBsYXRlVXJsRXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcbn1cblxuLyoqXG4gKiBUaGUgZGVjbGFyYXRpb24gb2YgYSB0ZW1wbGF0ZSBleHRyYWN0ZWQgZnJvbSBhIGNvbXBvbmVudCBkZWNvcmF0b3IuXG4gKlxuICogVGhpcyBkYXRhIGlzIGV4dHJhY3RlZCBhbmQgc3RvcmVkIHNlcGFyYXRlbHkgdG8gZmFjaWxpYXRlIHJlLWludGVycHJldGluZyB0aGUgdGVtcGxhdGVcbiAqIGRlY2xhcmF0aW9uIHdoZW5ldmVyIHRoZSBjb21waWxlciBpcyBub3RpZmllZCBvZiBhIGNoYW5nZSB0byBhIHRlbXBsYXRlIGZpbGUuIFdpdGggdGhpc1xuICogaW5mb3JtYXRpb24sIGBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyYCBpcyBhYmxlIHRvIHJlLXJlYWQgdGhlIHRlbXBsYXRlIGFuZCB1cGRhdGUgdGhlIGNvbXBvbmVudFxuICogcmVjb3JkIHdpdGhvdXQgbmVlZGluZyB0byBwYXJzZSB0aGUgb3JpZ2luYWwgZGVjb3JhdG9yIGFnYWluLlxuICovXG50eXBlIFRlbXBsYXRlRGVjbGFyYXRpb24gPSBJbmxpbmVUZW1wbGF0ZURlY2xhcmF0aW9ufEV4dGVybmFsVGVtcGxhdGVEZWNsYXJhdGlvbjtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGRpYWdub3N0aWMgcmVsYXRlZCBpbmZvcm1hdGlvbiBvYmplY3QgdGhhdCBkZXNjcmliZXMgYSBwb3RlbnRpYWwgY3ljbGljIGltcG9ydCBwYXRoLlxuICovXG5mdW5jdGlvbiBtYWtlQ3ljbGljSW1wb3J0SW5mbyhcbiAgICByZWY6IFJlZmVyZW5jZSwgdHlwZTogc3RyaW5nLCBjeWNsZTogQ3ljbGUpOiB0cy5EaWFnbm9zdGljUmVsYXRlZEluZm9ybWF0aW9uIHtcbiAgY29uc3QgbmFtZSA9IHJlZi5kZWJ1Z05hbWUgfHwgJyh1bmtub3duKSc7XG4gIGNvbnN0IHBhdGggPSBjeWNsZS5nZXRQYXRoKCkubWFwKHNmID0+IHNmLmZpbGVOYW1lKS5qb2luKCcgLT4gJyk7XG4gIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgYFRoZSAke3R5cGV9ICcke25hbWV9JyBpcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBidXQgaW1wb3J0aW5nIGl0IHdvdWxkIGNyZWF0ZSBhIGN5Y2xlOiBgO1xuICByZXR1cm4gbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihyZWYubm9kZSwgbWVzc2FnZSArIHBhdGgpO1xufVxuIl19