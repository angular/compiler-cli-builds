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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ComponentDecoratorHandler = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var ts_source_map_bug_29300_1 = require("@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
    var directive_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/directive");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_MAP = new Map();
    var EMPTY_ARRAY = [];
    /**
     * `DecoratorHandler` which handles the `@Component` annotation.
     */
    var ComponentDecoratorHandler = /** @class */ (function () {
        function ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, typeCheckScopeRegistry, resourceRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds, enableI18nLegacyMessageIdFormat, usePoisonedData, i18nNormalizeLineEndingsInICUs, moduleResolver, cycleAnalyzer, cycleHandlingStrategy, refEmitter, defaultImportRecorder, depTracker, injectableRegistry, annotateForClosureCompiler) {
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
        ComponentDecoratorHandler.prototype.resolve = function (node, analysis) {
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
                if (cyclesFromDirectives.size === 0 && cyclesFromPipes.size === 0) {
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
                alwaysAttemptHtmlToR3AstConversion: this.usePoisonedData,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb2Y7SUFDcGYsK0JBQWlDO0lBR2pDLDJFQUEwRztJQUMxRywyRUFBeUQ7SUFDekQsbUVBQWlHO0lBR2pHLHFFQUFxTztJQUNyTyx1RkFBbUY7SUFDbkYseUVBQW9IO0lBRXBILHVFQUE4STtJQUU5SSw0R0FBZ0Y7SUFJaEYsMkZBQTRHO0lBQzVHLHVGQUEyRTtJQUMzRSxtRkFBbUQ7SUFDbkQscUZBQXdEO0lBQ3hELDZFQUFzTTtJQUV0TSxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztJQUNoRCxJQUFNLFdBQVcsR0FBVSxFQUFFLENBQUM7SUErRTlCOztPQUVHO0lBQ0g7UUFFRSxtQ0FDWSxTQUF5QixFQUFVLFNBQTJCLEVBQzlELFlBQThCLEVBQVUsVUFBMEIsRUFDbEUsV0FBaUMsRUFBVSxhQUF1QyxFQUNsRixzQkFBOEMsRUFDOUMsZ0JBQWtDLEVBQVUsTUFBZSxFQUMzRCxjQUE4QixFQUFVLFFBQStCLEVBQ3ZFLDBCQUFtQyxFQUFVLGtCQUEyQixFQUN4RSwrQkFBd0MsRUFBVSxlQUF3QixFQUMxRSw4QkFBaUQsRUFDakQsY0FBOEIsRUFBVSxhQUE0QixFQUNwRSxxQkFBNEMsRUFBVSxVQUE0QixFQUNsRixxQkFBNEMsRUFDNUMsVUFBa0MsRUFDbEMsa0JBQTJDLEVBQzNDLDBCQUFtQztZQWRuQyxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzlELGlCQUFZLEdBQVosWUFBWSxDQUFrQjtZQUFVLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQ2xFLGdCQUFX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a0MsQ0FBQyxXQUFnQztRQUMxRSwyRkFBMkY7UUFDM0YsOEZBQThGO1FBQzlGLGdEQUFnRDtRQUNoRCxRQUFRLFdBQVcsQ0FBQyxRQUFRLEVBQUU7WUFDNUIsS0FBSyxJQUFJO2dCQUNQLE9BQU8sV0FBVyxDQUFDLFVBQVUsQ0FBQztZQUNoQyxLQUFLLEtBQUs7Z0JBQ1IsT0FBTyxXQUFXLENBQUMscUJBQXFCLENBQUM7U0FDNUM7SUFDSCxDQUFDO0lBc0VEOztPQUVHO0lBQ0gsU0FBUyxvQkFBb0IsQ0FDekIsR0FBYyxFQUFFLElBQVksRUFBRSxLQUFZO1FBQzVDLElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxTQUFTLElBQUksV0FBVyxDQUFDO1FBQzFDLElBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxFQUFFLElBQUksT0FBQSxFQUFFLENBQUMsUUFBUSxFQUFYLENBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqRSxJQUFNLE9BQU8sR0FDVCxTQUFPLElBQUksVUFBSyxJQUFJLHNFQUFtRSxDQUFDO1FBQzVGLE9BQU8sb0NBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDMUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEsIGNvbXBpbGVEZWNsYXJlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBDb25zdGFudFBvb2wsIENzc1NlbGVjdG9yLCBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZSwgREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRywgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5LCBFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIElkZW50aWZpZXJzLCBJbnRlcnBvbGF0aW9uQ29uZmlnLCBMZXhlclJhbmdlLCBtYWtlQmluZGluZ1BhcnNlciwgUGFyc2VkVGVtcGxhdGUsIFBhcnNlU291cmNlRmlsZSwgcGFyc2VUZW1wbGF0ZSwgUjNDb21wb25lbnREZWYsIFIzQ29tcG9uZW50TWV0YWRhdGEsIFIzRmFjdG9yeVRhcmdldCwgUjNUYXJnZXRCaW5kZXIsIFIzVXNlZERpcmVjdGl2ZU1ldGFkYXRhLCBTZWxlY3Rvck1hdGNoZXIsIFN0YXRlbWVudCwgVG1wbEFzdE5vZGUsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q3ljbGUsIEN5Y2xlQW5hbHl6ZXIsIEN5Y2xlSGFuZGxpbmdTdHJhdGVneX0gZnJvbSAnLi4vLi4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvciwgbWFrZURpYWdub3N0aWMsIG1ha2VSZWxhdGVkSW5mb3JtYXRpb259IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCByZWxhdGl2ZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIE1vZHVsZVJlc29sdmVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEZXBlbmRlbmN5VHJhY2tlcn0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvYXBpJztcbmltcG9ydCB7SW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7Q2xhc3NQcm9wZXJ0eU1hcHBpbmcsIENvbXBvbmVudFJlc291cmNlcywgRGlyZWN0aXZlTWV0YSwgRGlyZWN0aXZlVHlwZUNoZWNrTWV0YSwgZXh0cmFjdERpcmVjdGl2ZVR5cGVDaGVja01ldGEsIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgUmVzb3VyY2UsIFJlc291cmNlUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7RW51bVZhbHVlLCBQYXJ0aWFsRXZhbHVhdG9yLCBSZXNvbHZlZFZhbHVlfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uTm9kZSwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJGbGFncywgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge3RzU291cmNlTWFwQnVnMjkzMDBGaXhlZH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHNfc291cmNlX21hcF9idWdfMjkzMDAnO1xuaW1wb3J0IHtTdWJzZXRPZktleXN9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1Jlc291cmNlTG9hZGVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2NyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IsIGdldERpcmVjdGl2ZURpYWdub3N0aWNzLCBnZXRQcm92aWRlckRpYWdub3N0aWNzfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhLCBwYXJzZUZpZWxkQXJyYXlWYWx1ZX0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHtjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmaW5kQW5ndWxhckRlY29yYXRvciwgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSwgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgcmVhZEJhc2VDbGFzcywgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIHVud3JhcEV4cHJlc3Npb24sIHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnN9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX01BUCA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuY29uc3QgRU1QVFlfQVJSQVk6IGFueVtdID0gW107XG5cbi8qKlxuICogVGhlc2UgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCBhcmUgdXBkYXRlZCBpbiB0aGUgYHJlc29sdmVgIHBoYXNlLlxuICpcbiAqIFRoZSBga2V5b2YgUjNDb21wb25lbnRNZXRhZGF0YSAmYCBjb25kaXRpb24gZW5zdXJlcyB0aGF0IG9ubHkgZmllbGRzIG9mIGBSM0NvbXBvbmVudE1ldGFkYXRhYCBjYW5cbiAqIGJlIGluY2x1ZGVkIGhlcmUuXG4gKi9cbmV4cG9ydCB0eXBlIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHMgPVxuICAgIFN1YnNldE9mS2V5czxSM0NvbXBvbmVudE1ldGFkYXRhLCAnZGlyZWN0aXZlcyd8J3BpcGVzJ3wnZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUnPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRBbmFseXNpc0RhdGEge1xuICAvKipcbiAgICogYG1ldGFgIGluY2x1ZGVzIHRob3NlIGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgd2hpY2ggYXJlIGNhbGN1bGF0ZWQgYXQgYGFuYWx5emVgIHRpbWVcbiAgICogKG5vdCBkdXJpbmcgcmVzb2x2ZSkuXG4gICAqL1xuICBtZXRhOiBPbWl0PFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuICBiYXNlQ2xhc3M6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPnwnZHluYW1pYyd8bnVsbDtcbiAgdHlwZUNoZWNrTWV0YTogRGlyZWN0aXZlVHlwZUNoZWNrTWV0YTtcbiAgdGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcblxuICBpbnB1dHM6IENsYXNzUHJvcGVydHlNYXBwaW5nO1xuICBvdXRwdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZztcblxuICAvKipcbiAgICogUHJvdmlkZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBgcHJvdmlkZXJzYCBmaWVsZCBvZiB0aGUgY29tcG9uZW50IGFubm90YXRpb24gd2hpY2ggd2lsbCByZXF1aXJlXG4gICAqIGFuIEFuZ3VsYXIgZmFjdG9yeSBkZWZpbml0aW9uIGF0IHJ1bnRpbWUuXG4gICAqL1xuICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlcnMgZXh0cmFjdGVkIGZyb20gdGhlIGB2aWV3UHJvdmlkZXJzYCBmaWVsZCBvZiB0aGUgY29tcG9uZW50IGFubm90YXRpb24gd2hpY2ggd2lsbFxuICAgKiByZXF1aXJlIGFuIEFuZ3VsYXIgZmFjdG9yeSBkZWZpbml0aW9uIGF0IHJ1bnRpbWUuXG4gICAqL1xuICB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcblxuICByZXNvdXJjZXM6IENvbXBvbmVudFJlc291cmNlcztcblxuICAvKipcbiAgICogYHN0eWxlVXJsc2AgZXh0cmFjdGVkIGZyb20gdGhlIGRlY29yYXRvciwgaWYgcHJlc2VudC5cbiAgICovXG4gIHN0eWxlVXJsczogU3R5bGVVcmxNZXRhW118bnVsbDtcblxuICAvKipcbiAgICogSW5saW5lIHN0eWxlc2hlZXRzIGV4dHJhY3RlZCBmcm9tIHRoZSBkZWNvcmF0b3IsIGlmIHByZXNlbnQuXG4gICAqL1xuICBpbmxpbmVTdHlsZXM6IHN0cmluZ1tdfG51bGw7XG5cbiAgaXNQb2lzb25lZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgQ29tcG9uZW50UmVzb2x1dGlvbkRhdGEgPSBQaWNrPFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuXG4vKipcbiAqIFRoZSBsaXRlcmFsIHN0eWxlIHVybCBleHRyYWN0ZWQgZnJvbSB0aGUgZGVjb3JhdG9yLCBhbG9uZyB3aXRoIG1ldGFkYXRhIGZvciBkaWFnbm9zdGljcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdHlsZVVybE1ldGEge1xuICB1cmw6IHN0cmluZztcbiAgbm9kZUZvckVycm9yOiB0cy5Ob2RlO1xuICBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGV8XG4gICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbURlY29yYXRvcjtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgb3JpZ2luIG9mIGEgcmVzb3VyY2UgaW4gdGhlIGFwcGxpY2F0aW9uIGNvZGUuIFRoaXMgaXMgdXNlZCBmb3IgY3JlYXRpbmdcbiAqIGRpYWdub3N0aWNzLCBzbyB3ZSBjYW4gcG9pbnQgdG8gdGhlIHJvb3QgY2F1c2Ugb2YgYW4gZXJyb3IgaW4gdGhlIGFwcGxpY2F0aW9uIGNvZGUuXG4gKlxuICogQSB0ZW1wbGF0ZSByZXNvdXJjZSBjb21lcyBmcm9tIHRoZSBgdGVtcGxhdGVVcmxgIHByb3BlcnR5IG9uIHRoZSBjb21wb25lbnQgZGVjb3JhdG9yLlxuICpcbiAqIFN0eWxlc2hlZXRzIHJlc291cmNlcyBjYW4gY29tZSBmcm9tIGVpdGhlciB0aGUgYHN0eWxlVXJsc2AgcHJvcGVydHkgb24gdGhlIGNvbXBvbmVudCBkZWNvcmF0b3IsXG4gKiBvciBmcm9tIGlubGluZSBgc3R5bGVgIHRhZ3MgYW5kIHN0eWxlIGxpbmtzIG9uIHRoZSBleHRlcm5hbCB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGVudW0gUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3Mge1xuICBUZW1wbGF0ZSxcbiAgU3R5bGVzaGVldEZyb21UZW1wbGF0ZSxcbiAgU3R5bGVzaGVldEZyb21EZWNvcmF0b3IsXG59XG5cbi8qKlxuICogYERlY29yYXRvckhhbmRsZXJgIHdoaWNoIGhhbmRsZXMgdGhlIGBAQ29tcG9uZW50YCBhbm5vdGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3IsIENvbXBvbmVudEFuYWx5c2lzRGF0YSwgQ29tcG9uZW50UmVzb2x1dGlvbkRhdGE+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBtZXRhUmVnaXN0cnk6IE1ldGFkYXRhUmVnaXN0cnksIHByaXZhdGUgbWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXIsXG4gICAgICBwcml2YXRlIHNjb3BlUmVhZGVyOiBDb21wb25lbnRTY29wZVJlYWRlciwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHR5cGVDaGVja1Njb3BlUmVnaXN0cnk6IFR5cGVDaGVja1Njb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJlc291cmNlUmVnaXN0cnk6IFJlc291cmNlUmVnaXN0cnksIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSByZXNvdXJjZUxvYWRlcjogUmVzb3VyY2VMb2FkZXIsIHByaXZhdGUgcm9vdERpcnM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPixcbiAgICAgIHByaXZhdGUgZGVmYXVsdFByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4sIHByaXZhdGUgaTE4blVzZUV4dGVybmFsSWRzOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuLCBwcml2YXRlIHVzZVBvaXNvbmVkRGF0YTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzOiBib29sZWFufHVuZGVmaW5lZCxcbiAgICAgIHByaXZhdGUgbW9kdWxlUmVzb2x2ZXI6IE1vZHVsZVJlc29sdmVyLCBwcml2YXRlIGN5Y2xlQW5hbHl6ZXI6IEN5Y2xlQW5hbHl6ZXIsXG4gICAgICBwcml2YXRlIGN5Y2xlSGFuZGxpbmdTdHJhdGVneTogQ3ljbGVIYW5kbGluZ1N0cmF0ZWd5LCBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsXG4gICAgICBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBkZXBUcmFja2VyOiBEZXBlbmRlbmN5VHJhY2tlcnxudWxsLFxuICAgICAgcHJpdmF0ZSBpbmplY3RhYmxlUmVnaXN0cnk6IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbikge31cblxuICBwcml2YXRlIGxpdGVyYWxDYWNoZSA9IG5ldyBNYXA8RGVjb3JhdG9yLCB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbj4oKTtcbiAgcHJpdmF0ZSBlbGVtZW50U2NoZW1hUmVnaXN0cnkgPSBuZXcgRG9tRWxlbWVudFNjaGVtYVJlZ2lzdHJ5KCk7XG5cbiAgLyoqXG4gICAqIER1cmluZyB0aGUgYXN5bmNocm9ub3VzIHByZWFuYWx5emUgcGhhc2UsIGl0J3MgbmVjZXNzYXJ5IHRvIHBhcnNlIHRoZSB0ZW1wbGF0ZSB0byBleHRyYWN0XG4gICAqIGFueSBwb3RlbnRpYWwgPGxpbms+IHRhZ3Mgd2hpY2ggbWlnaHQgbmVlZCB0byBiZSBsb2FkZWQuIFRoaXMgY2FjaGUgZW5zdXJlcyB0aGF0IHdvcmsgaXMgbm90XG4gICAqIHRocm93biBhd2F5LCBhbmQgdGhlIHBhcnNlZCB0ZW1wbGF0ZSBpcyByZXVzZWQgZHVyaW5nIHRoZSBhbmFseXplIHBoYXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBwcmVhbmFseXplVGVtcGxhdGVDYWNoZSA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2U+KCk7XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG4gIHJlYWRvbmx5IG5hbWUgPSBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyLm5hbWU7XG5cbiAgZGV0ZWN0KG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ0NvbXBvbmVudCcsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBkZWNvcmF0b3IsXG4gICAgICAgIG1ldGFkYXRhOiBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHByZWFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3I+KTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIC8vIEluIHByZWFuYWx5emUsIHJlc291cmNlIFVSTHMgYXNzb2NpYXRlZCB3aXRoIHRoZSBjb21wb25lbnQgYXJlIGFzeW5jaHJvbm91c2x5IHByZWxvYWRlZCB2aWFcbiAgICAvLyB0aGUgcmVzb3VyY2VMb2FkZXIuIFRoaXMgaXMgdGhlIG9ubHkgdGltZSBhc3luYyBvcGVyYXRpb25zIGFyZSBhbGxvd2VkIGZvciBhIGNvbXBvbmVudC5cbiAgICAvLyBUaGVzZSByZXNvdXJjZXMgYXJlOlxuICAgIC8vXG4gICAgLy8gLSB0aGUgdGVtcGxhdGVVcmwsIGlmIHRoZXJlIGlzIG9uZVxuICAgIC8vIC0gYW55IHN0eWxlVXJscyBpZiBwcmVzZW50XG4gICAgLy8gLSBhbnkgc3R5bGVzaGVldHMgcmVmZXJlbmNlZCBmcm9tIDxsaW5rPiB0YWdzIGluIHRoZSB0ZW1wbGF0ZSBpdHNlbGZcbiAgICAvL1xuICAgIC8vIEFzIGEgcmVzdWx0IG9mIHRoZSBsYXN0IG9uZSwgdGhlIHRlbXBsYXRlIG11c3QgYmUgcGFyc2VkIGFzIHBhcnQgb2YgcHJlYW5hbHlzaXMgdG8gZXh0cmFjdFxuICAgIC8vIDxsaW5rPiB0YWdzLCB3aGljaCBtYXkgaW52b2x2ZSB3YWl0aW5nIGZvciB0aGUgdGVtcGxhdGVVcmwgdG8gYmUgcmVzb2x2ZWQgZmlyc3QuXG5cbiAgICAvLyBJZiBwcmVsb2FkaW5nIGlzbid0IHBvc3NpYmxlLCB0aGVuIHNraXAgdGhpcyBzdGVwLlxuICAgIGlmICghdGhpcy5yZXNvdXJjZUxvYWRlci5jYW5QcmVsb2FkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGEgPSB0aGlzLl9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3IpO1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICBjb25zdCByZXNvbHZlU3R5bGVVcmwgPVxuICAgICAgICAoc3R5bGVVcmw6IHN0cmluZywgbm9kZUZvckVycm9yOiB0cy5Ob2RlLFxuICAgICAgICAgcmVzb3VyY2VUeXBlOiBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcyk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkID0+IHtcbiAgICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9XG4gICAgICAgICAgICAgIHRoaXMuX3Jlc29sdmVSZXNvdXJjZU9yVGhyb3coc3R5bGVVcmwsIGNvbnRhaW5pbmdGaWxlLCBub2RlRm9yRXJyb3IsIHJlc291cmNlVHlwZSk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCk7XG4gICAgICAgIH07XG5cbiAgICAvLyBBIFByb21pc2UgdGhhdCB3YWl0cyBmb3IgdGhlIHRlbXBsYXRlIGFuZCBhbGwgPGxpbms+ZWQgc3R5bGVzIHdpdGhpbiBpdCB0byBiZSBwcmVsb2FkZWQuXG4gICAgY29uc3QgdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzID1cbiAgICAgICAgdGhpcy5fcHJlbG9hZEFuZFBhcnNlVGVtcGxhdGUobm9kZSwgZGVjb3JhdG9yLCBjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKVxuICAgICAgICAgICAgLnRoZW4oKHRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2V8bnVsbCk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkID0+IHtcbiAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNvbnN0IG5vZGVGb3JFcnJvciA9IGdldFRlbXBsYXRlRGVjbGFyYXRpb25Ob2RlRm9yRXJyb3IodGVtcGxhdGUuZGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZVxuICAgICAgICAgICAgICAgICAgLmFsbCh0ZW1wbGF0ZS5zdHlsZVVybHMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgIHN0eWxlVXJsID0+IHJlc29sdmVTdHlsZVVybChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVVcmwsIG5vZGVGb3JFcnJvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZSkpKVxuICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgLy8gRXh0cmFjdCBhbGwgdGhlIHN0eWxlVXJscyBpbiB0aGUgZGVjb3JhdG9yLlxuICAgIGNvbnN0IGNvbXBvbmVudFN0eWxlVXJscyA9IHRoaXMuX2V4dHJhY3RDb21wb25lbnRTdHlsZVVybHMoY29tcG9uZW50KTtcblxuICAgIGlmIChjb21wb25lbnRTdHlsZVVybHMgPT09IG51bGwpIHtcbiAgICAgIC8vIEEgZmFzdCBwYXRoIGV4aXN0cyBpZiB0aGVyZSBhcmUgbm8gc3R5bGVVcmxzLCB0byBqdXN0IHdhaXQgZm9yXG4gICAgICAvLyB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXMuXG4gICAgICByZXR1cm4gdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBXYWl0IGZvciBib3RoIHRoZSB0ZW1wbGF0ZSBhbmQgYWxsIHN0eWxlVXJsIHJlc291cmNlcyB0byByZXNvbHZlLlxuICAgICAgcmV0dXJuIFByb21pc2VcbiAgICAgICAgICAuYWxsKFtcbiAgICAgICAgICAgIHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcyxcbiAgICAgICAgICAgIC4uLmNvbXBvbmVudFN0eWxlVXJscy5tYXAoXG4gICAgICAgICAgICAgICAgc3R5bGVVcmwgPT4gcmVzb2x2ZVN0eWxlVXJsKFxuICAgICAgICAgICAgICAgICAgICBzdHlsZVVybC51cmwsIHN0eWxlVXJsLm5vZGVGb3JFcnJvcixcbiAgICAgICAgICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IpKVxuICAgICAgICAgIF0pXG4gICAgICAgICAgLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3I+LFxuICAgICAgZmxhZ3M6IEhhbmRsZXJGbGFncyA9IEhhbmRsZXJGbGFncy5OT05FKTogQW5hbHlzaXNPdXRwdXQ8Q29tcG9uZW50QW5hbHlzaXNEYXRhPiB7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5kZWxldGUoZGVjb3JhdG9yKTtcblxuICAgIC8vIEBDb21wb25lbnQgaW5oZXJpdHMgQERpcmVjdGl2ZSwgc28gYmVnaW4gYnkgZXh0cmFjdGluZyB0aGUgQERpcmVjdGl2ZSBtZXRhZGF0YSBhbmQgYnVpbGRpbmdcbiAgICAvLyBvbiBpdC5cbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPSBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgIGZsYWdzLCB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyLFxuICAgICAgICB0aGlzLmVsZW1lbnRTY2hlbWFSZWdpc3RyeS5nZXREZWZhdWx0Q29tcG9uZW50RWxlbWVudE5hbWUoKSk7XG4gICAgaWYgKGRpcmVjdGl2ZVJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBgZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhYCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIHRoZSBARGlyZWN0aXZlIGhhcyBgaml0OiB0cnVlYC4gSW4gdGhpc1xuICAgICAgLy8gY2FzZSwgY29tcGlsYXRpb24gb2YgdGhlIGRlY29yYXRvciBpcyBza2lwcGVkLiBSZXR1cm5pbmcgYW4gZW1wdHkgb2JqZWN0IHNpZ25pZmllc1xuICAgICAgLy8gdGhhdCBubyBhbmFseXNpcyB3YXMgcHJvZHVjZWQuXG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLy8gTmV4dCwgcmVhZCB0aGUgYEBDb21wb25lbnRgLXNwZWNpZmljIGZpZWxkcy5cbiAgICBjb25zdCB7ZGVjb3JhdG9yOiBjb21wb25lbnQsIG1ldGFkYXRhLCBpbnB1dHMsIG91dHB1dHN9ID0gZGlyZWN0aXZlUmVzdWx0O1xuXG4gICAgLy8gR28gdGhyb3VnaCB0aGUgcm9vdCBkaXJlY3RvcmllcyBmb3IgdGhpcyBwcm9qZWN0LCBhbmQgc2VsZWN0IHRoZSBvbmUgd2l0aCB0aGUgc21hbGxlc3RcbiAgICAvLyByZWxhdGl2ZSBwYXRoIHJlcHJlc2VudGF0aW9uLlxuICAgIGNvbnN0IHJlbGF0aXZlQ29udGV4dEZpbGVQYXRoID0gdGhpcy5yb290RGlycy5yZWR1Y2U8c3RyaW5nfHVuZGVmaW5lZD4oKHByZXZpb3VzLCByb290RGlyKSA9PiB7XG4gICAgICBjb25zdCBjYW5kaWRhdGUgPSByZWxhdGl2ZShhYnNvbHV0ZUZyb20ocm9vdERpciksIGFic29sdXRlRnJvbShjb250YWluaW5nRmlsZSkpO1xuICAgICAgaWYgKHByZXZpb3VzID09PSB1bmRlZmluZWQgfHwgY2FuZGlkYXRlLmxlbmd0aCA8IHByZXZpb3VzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzO1xuICAgICAgfVxuICAgIH0sIHVuZGVmaW5lZCkhO1xuXG5cbiAgICAvLyBOb3RlIHRoYXQgd2UgY291bGQgdGVjaG5pY2FsbHkgY29tYmluZSB0aGUgYHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5YCBhbmRcbiAgICAvLyBgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeWAgaW50byBhIHNpbmdsZSBzZXQsIGJ1dCB3ZSBrZWVwIHRoZSBzZXBhcmF0ZSBzbyB0aGF0XG4gICAgLy8gd2UgY2FuIGRpc3Rpbmd1aXNoIHdoZXJlIGFuIGVycm9yIGlzIGNvbWluZyBmcm9tIHdoZW4gbG9nZ2luZyB0aGUgZGlhZ25vc3RpY3MgaW4gYHJlc29sdmVgLlxuICAgIGxldCB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbCA9IG51bGw7XG4gICAgbGV0IHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGwgPSBudWxsO1xuICAgIGxldCB3cmFwcGVkVmlld1Byb3ZpZGVyczogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIGlmIChjb21wb25lbnQuaGFzKCd2aWV3UHJvdmlkZXJzJykpIHtcbiAgICAgIGNvbnN0IHZpZXdQcm92aWRlcnMgPSBjb21wb25lbnQuZ2V0KCd2aWV3UHJvdmlkZXJzJykhO1xuICAgICAgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgPVxuICAgICAgICAgIHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5KHZpZXdQcm92aWRlcnMsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvcik7XG4gICAgICB3cmFwcGVkVmlld1Byb3ZpZGVycyA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoXG4gICAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciA/IHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnModmlld1Byb3ZpZGVycykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3UHJvdmlkZXJzKTtcbiAgICB9XG5cbiAgICBpZiAoY29tcG9uZW50LmhhcygncHJvdmlkZXJzJykpIHtcbiAgICAgIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgPSByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeShcbiAgICAgICAgICBjb21wb25lbnQuZ2V0KCdwcm92aWRlcnMnKSEsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvcik7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgdGhlIHRlbXBsYXRlLlxuICAgIC8vIElmIGEgcHJlYW5hbHl6ZSBwaGFzZSB3YXMgZXhlY3V0ZWQsIHRoZSB0ZW1wbGF0ZSBtYXkgYWxyZWFkeSBleGlzdCBpbiBwYXJzZWQgZm9ybSwgc28gY2hlY2tcbiAgICAvLyB0aGUgcHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuXG4gICAgLy8gRXh0cmFjdCBhIGNsb3N1cmUgb2YgdGhlIHRlbXBsYXRlIHBhcnNpbmcgY29kZSBzbyB0aGF0IGl0IGNhbiBiZSByZXBhcnNlZCB3aXRoIGRpZmZlcmVudFxuICAgIC8vIG9wdGlvbnMgaWYgbmVlZGVkLCBsaWtlIGluIHRoZSBpbmRleGluZyBwaXBlbGluZS5cbiAgICBsZXQgdGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZTtcbiAgICBpZiAodGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5oYXMobm9kZSkpIHtcbiAgICAgIC8vIFRoZSB0ZW1wbGF0ZSB3YXMgcGFyc2VkIGluIHByZWFuYWx5emUuIFVzZSBpdCBhbmQgZGVsZXRlIGl0IHRvIHNhdmUgbWVtb3J5LlxuICAgICAgY29uc3QgcHJlYW5hbHl6ZWQgPSB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmdldChub2RlKSE7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmRlbGV0ZShub2RlKTtcblxuICAgICAgdGVtcGxhdGUgPSBwcmVhbmFseXplZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGVEZWNsID0gdGhpcy5wYXJzZVRlbXBsYXRlRGVjbGFyYXRpb24oZGVjb3JhdG9yLCBjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgIHRlbXBsYXRlID0gdGhpcy5leHRyYWN0VGVtcGxhdGUobm9kZSwgdGVtcGxhdGVEZWNsKTtcbiAgICB9XG4gICAgY29uc3QgdGVtcGxhdGVSZXNvdXJjZSA9XG4gICAgICAgIHRlbXBsYXRlLmlzSW5saW5lID8ge3BhdGg6IG51bGwsIGV4cHJlc3Npb246IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlJykhfSA6IHtcbiAgICAgICAgICBwYXRoOiBhYnNvbHV0ZUZyb20odGVtcGxhdGUuZGVjbGFyYXRpb24ucmVzb2x2ZWRUZW1wbGF0ZVVybCksXG4gICAgICAgICAgZXhwcmVzc2lvbjogdGVtcGxhdGUuc291cmNlTWFwcGluZy5ub2RlXG4gICAgICAgIH07XG5cbiAgICAvLyBGaWd1cmUgb3V0IHRoZSBzZXQgb2Ygc3R5bGVzLiBUaGUgb3JkZXJpbmcgaGVyZSBpcyBpbXBvcnRhbnQ6IGV4dGVybmFsIHJlc291cmNlcyAoc3R5bGVVcmxzKVxuICAgIC8vIHByZWNlZGUgaW5saW5lIHN0eWxlcywgYW5kIHN0eWxlcyBkZWZpbmVkIGluIHRoZSB0ZW1wbGF0ZSBvdmVycmlkZSBzdHlsZXMgZGVmaW5lZCBpbiB0aGVcbiAgICAvLyBjb21wb25lbnQuXG4gICAgbGV0IHN0eWxlczogc3RyaW5nW10gPSBbXTtcblxuICAgIGNvbnN0IHN0eWxlUmVzb3VyY2VzID0gdGhpcy5fZXh0cmFjdFN0eWxlUmVzb3VyY2VzKGNvbXBvbmVudCwgY29udGFpbmluZ0ZpbGUpO1xuICAgIGNvbnN0IHN0eWxlVXJsczogU3R5bGVVcmxNZXRhW10gPSBbXG4gICAgICAuLi50aGlzLl9leHRyYWN0Q29tcG9uZW50U3R5bGVVcmxzKGNvbXBvbmVudCksIC4uLnRoaXMuX2V4dHJhY3RUZW1wbGF0ZVN0eWxlVXJscyh0ZW1wbGF0ZSlcbiAgICBdO1xuXG4gICAgZm9yIChjb25zdCBzdHlsZVVybCBvZiBzdHlsZVVybHMpIHtcbiAgICAgIGNvbnN0IHJlc291cmNlVHlwZSA9IHN0eWxlVXJsLnNvdXJjZSA9PT0gUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IgP1xuICAgICAgICAgIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yIDpcbiAgICAgICAgICBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbVRlbXBsYXRlO1xuICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLl9yZXNvbHZlUmVzb3VyY2VPclRocm93KFxuICAgICAgICAgIHN0eWxlVXJsLnVybCwgY29udGFpbmluZ0ZpbGUsIHN0eWxlVXJsLm5vZGVGb3JFcnJvciwgcmVzb3VyY2VUeXBlKTtcbiAgICAgIGNvbnN0IHJlc291cmNlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHJlc291cmNlVXJsKTtcblxuICAgICAgc3R5bGVzLnB1c2gocmVzb3VyY2VTdHIpO1xuICAgICAgaWYgKHRoaXMuZGVwVHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmRlcFRyYWNrZXIuYWRkUmVzb3VyY2VEZXBlbmRlbmN5KG5vZGUuZ2V0U291cmNlRmlsZSgpLCBhYnNvbHV0ZUZyb20ocmVzb3VyY2VVcmwpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgaW5saW5lU3R5bGVzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50Lmhhcygnc3R5bGVzJykpIHtcbiAgICAgIGNvbnN0IGxpdFN0eWxlcyA9IHBhcnNlRmllbGRBcnJheVZhbHVlKGNvbXBvbmVudCwgJ3N0eWxlcycsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICAgIGlmIChsaXRTdHlsZXMgIT09IG51bGwpIHtcbiAgICAgICAgaW5saW5lU3R5bGVzID0gWy4uLmxpdFN0eWxlc107XG4gICAgICAgIHN0eWxlcy5wdXNoKC4uLmxpdFN0eWxlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0ZW1wbGF0ZS5zdHlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgc3R5bGVzLnB1c2goLi4udGVtcGxhdGUuc3R5bGVzKTtcbiAgICB9XG5cbiAgICBjb25zdCBlbmNhcHN1bGF0aW9uOiBudW1iZXIgPVxuICAgICAgICB0aGlzLl9yZXNvbHZlRW51bVZhbHVlKGNvbXBvbmVudCwgJ2VuY2Fwc3VsYXRpb24nLCAnVmlld0VuY2Fwc3VsYXRpb24nKSB8fCAwO1xuXG4gICAgY29uc3QgY2hhbmdlRGV0ZWN0aW9uOiBudW1iZXJ8bnVsbCA9XG4gICAgICAgIHRoaXMuX3Jlc29sdmVFbnVtVmFsdWUoY29tcG9uZW50LCAnY2hhbmdlRGV0ZWN0aW9uJywgJ0NoYW5nZURldGVjdGlvblN0cmF0ZWd5Jyk7XG5cbiAgICBsZXQgYW5pbWF0aW9uczogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcygnYW5pbWF0aW9ucycpKSB7XG4gICAgICBhbmltYXRpb25zID0gbmV3IFdyYXBwZWROb2RlRXhwcihjb21wb25lbnQuZ2V0KCdhbmltYXRpb25zJykhKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRwdXQ6IEFuYWx5c2lzT3V0cHV0PENvbXBvbmVudEFuYWx5c2lzRGF0YT4gPSB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBiYXNlQ2xhc3M6IHJlYWRCYXNlQ2xhc3Mobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKSxcbiAgICAgICAgaW5wdXRzLFxuICAgICAgICBvdXRwdXRzLFxuICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgLi4ubWV0YWRhdGEsXG4gICAgICAgICAgdGVtcGxhdGU6IHtcbiAgICAgICAgICAgIG5vZGVzOiB0ZW1wbGF0ZS5ub2RlcyxcbiAgICAgICAgICAgIG5nQ29udGVudFNlbGVjdG9yczogdGVtcGxhdGUubmdDb250ZW50U2VsZWN0b3JzLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZW5jYXBzdWxhdGlvbixcbiAgICAgICAgICBpbnRlcnBvbGF0aW9uOiB0ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uQ29uZmlnID8/IERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUcsXG4gICAgICAgICAgc3R5bGVzLFxuXG4gICAgICAgICAgLy8gVGhlc2Ugd2lsbCBiZSByZXBsYWNlZCBkdXJpbmcgdGhlIGNvbXBpbGF0aW9uIHN0ZXAsIGFmdGVyIGFsbCBgTmdNb2R1bGVgcyBoYXZlIGJlZW5cbiAgICAgICAgICAvLyBhbmFseXplZCBhbmQgdGhlIGZ1bGwgY29tcGlsYXRpb24gc2NvcGUgZm9yIHRoZSBjb21wb25lbnQgY2FuIGJlIHJlYWxpemVkLlxuICAgICAgICAgIGFuaW1hdGlvbnMsXG4gICAgICAgICAgdmlld1Byb3ZpZGVyczogd3JhcHBlZFZpZXdQcm92aWRlcnMsXG4gICAgICAgICAgaTE4blVzZUV4dGVybmFsSWRzOiB0aGlzLmkxOG5Vc2VFeHRlcm5hbElkcyxcbiAgICAgICAgICByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aCxcbiAgICAgICAgfSxcbiAgICAgICAgdHlwZUNoZWNrTWV0YTogZXh0cmFjdERpcmVjdGl2ZVR5cGVDaGVja01ldGEobm9kZSwgaW5wdXRzLCB0aGlzLnJlZmxlY3RvciksXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgICB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksXG4gICAgICAgIHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LFxuICAgICAgICBpbmxpbmVTdHlsZXMsXG4gICAgICAgIHN0eWxlVXJscyxcbiAgICAgICAgcmVzb3VyY2VzOiB7XG4gICAgICAgICAgc3R5bGVzOiBzdHlsZVJlc291cmNlcyxcbiAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVSZXNvdXJjZSxcbiAgICAgICAgfSxcbiAgICAgICAgaXNQb2lzb25lZDogZmFsc2UsXG4gICAgICB9LFxuICAgIH07XG4gICAgaWYgKGNoYW5nZURldGVjdGlvbiAhPT0gbnVsbCkge1xuICAgICAgb3V0cHV0LmFuYWx5c2lzIS5tZXRhLmNoYW5nZURldGVjdGlvbiA9IGNoYW5nZURldGVjdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRBbmFseXNpc0RhdGEpOiB2b2lkIHtcbiAgICAvLyBSZWdpc3RlciB0aGlzIGNvbXBvbmVudCdzIGluZm9ybWF0aW9uIHdpdGggdGhlIGBNZXRhZGF0YVJlZ2lzdHJ5YC4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbXBvbmVudCBpcyBhdmFpbGFibGUgZHVyaW5nIHRoZSBjb21waWxlKCkgcGhhc2UuXG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShub2RlKTtcbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKHtcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IG5vZGUubmFtZS50ZXh0LFxuICAgICAgc2VsZWN0b3I6IGFuYWx5c2lzLm1ldGEuc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogYW5hbHlzaXMubWV0YS5leHBvcnRBcyxcbiAgICAgIGlucHV0czogYW5hbHlzaXMuaW5wdXRzLFxuICAgICAgb3V0cHV0czogYW5hbHlzaXMub3V0cHV0cyxcbiAgICAgIHF1ZXJpZXM6IGFuYWx5c2lzLm1ldGEucXVlcmllcy5tYXAocXVlcnkgPT4gcXVlcnkucHJvcGVydHlOYW1lKSxcbiAgICAgIGlzQ29tcG9uZW50OiB0cnVlLFxuICAgICAgYmFzZUNsYXNzOiBhbmFseXNpcy5iYXNlQ2xhc3MsXG4gICAgICAuLi5hbmFseXNpcy50eXBlQ2hlY2tNZXRhLFxuICAgICAgaXNQb2lzb25lZDogYW5hbHlzaXMuaXNQb2lzb25lZCxcbiAgICAgIGlzU3RydWN0dXJhbDogZmFsc2UsXG4gICAgfSk7XG5cbiAgICB0aGlzLnJlc291cmNlUmVnaXN0cnkucmVnaXN0ZXJSZXNvdXJjZXMoYW5hbHlzaXMucmVzb3VyY2VzLCBub2RlKTtcbiAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7XG4gIH1cblxuICBpbmRleChcbiAgICAgIGNvbnRleHQ6IEluZGV4aW5nQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pIHtcbiAgICBpZiAoYW5hbHlzaXMuaXNQb2lzb25lZCAmJiAhdGhpcy51c2VQb2lzb25lZERhdGEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBhbmFseXNpcy5tZXRhLnNlbGVjdG9yO1xuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBpZiAoKHNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQgfHwgc2NvcGUuZXhwb3J0ZWQuaXNQb2lzb25lZCkgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICAgIC8vIERvbid0IGJvdGhlciBpbmRleGluZyBjb21wb25lbnRzIHdoaWNoIGhhZCBlcnJvbmVvdXMgc2NvcGVzLCB1bmxlc3Mgc3BlY2lmaWNhbGx5XG4gICAgICAgIC8vIHJlcXVlc3RlZC5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgaWYgKGRpcmVjdGl2ZS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyZWN0aXZlLnNlbGVjdG9yKSwgZGlyZWN0aXZlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBiaW5kZXIgPSBuZXcgUjNUYXJnZXRCaW5kZXIobWF0Y2hlcik7XG4gICAgY29uc3QgYm91bmRUZW1wbGF0ZSA9IGJpbmRlci5iaW5kKHt0ZW1wbGF0ZTogYW5hbHlzaXMudGVtcGxhdGUuZGlhZ05vZGVzfSk7XG5cbiAgICBjb250ZXh0LmFkZENvbXBvbmVudCh7XG4gICAgICBkZWNsYXJhdGlvbjogbm9kZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgYm91bmRUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlTWV0YToge1xuICAgICAgICBpc0lubGluZTogYW5hbHlzaXMudGVtcGxhdGUuaXNJbmxpbmUsXG4gICAgICAgIGZpbGU6IGFuYWx5c2lzLnRlbXBsYXRlLmZpbGUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgdHlwZUNoZWNrKGN0eDogVHlwZUNoZWNrQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPik6XG4gICAgICB2b2lkIHtcbiAgICBpZiAodGhpcy50eXBlQ2hlY2tTY29wZVJlZ2lzdHJ5ID09PSBudWxsIHx8ICF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobWV0YS5pc1BvaXNvbmVkICYmICF0aGlzLnVzZVBvaXNvbmVkRGF0YSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IHRoaXMudHlwZUNoZWNrU2NvcGVSZWdpc3RyeS5nZXRUeXBlQ2hlY2tTY29wZShub2RlKTtcbiAgICBpZiAoc2NvcGUuaXNQb2lzb25lZCAmJiAhdGhpcy51c2VQb2lzb25lZERhdGEpIHtcbiAgICAgIC8vIERvbid0IHR5cGUtY2hlY2sgY29tcG9uZW50cyB0aGF0IGhhZCBlcnJvcnMgaW4gdGhlaXIgc2NvcGVzLCB1bmxlc3MgcmVxdWVzdGVkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihzY29wZS5tYXRjaGVyKTtcbiAgICBjdHguYWRkVGVtcGxhdGUoXG4gICAgICAgIG5ldyBSZWZlcmVuY2Uobm9kZSksIGJpbmRlciwgbWV0YS50ZW1wbGF0ZS5kaWFnTm9kZXMsIHNjb3BlLnBpcGVzLCBzY29wZS5zY2hlbWFzLFxuICAgICAgICBtZXRhLnRlbXBsYXRlLnNvdXJjZU1hcHBpbmcsIG1ldGEudGVtcGxhdGUuZmlsZSwgbWV0YS50ZW1wbGF0ZS5lcnJvcnMpO1xuICB9XG5cbiAgcmVzb2x2ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPik6XG4gICAgICBSZXNvbHZlUmVzdWx0PENvbXBvbmVudFJlc29sdXRpb25EYXRhPiB7XG4gICAgaWYgKGFuYWx5c2lzLmlzUG9pc29uZWQgJiYgIXRoaXMudXNlUG9pc29uZWREYXRhKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBjb21wb25lbnQgd2FzIHJlZ2lzdGVyZWQgd2l0aCBhbiBOZ01vZHVsZS4gSWYgc28sIGl0IHNob3VsZCBiZSBjb21waWxlZFxuICAgIC8vIHVuZGVyIHRoYXQgbW9kdWxlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGxldCBtZXRhZGF0YSA9IGFuYWx5c2lzLm1ldGEgYXMgUmVhZG9ubHk8UjNDb21wb25lbnRNZXRhZGF0YT47XG5cbiAgICBjb25zdCBkYXRhOiBDb21wb25lbnRSZXNvbHV0aW9uRGF0YSA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IEVNUFRZX0FSUkFZLFxuICAgICAgcGlwZXM6IEVNUFRZX01BUCxcbiAgICAgIGRlY2xhcmF0aW9uTGlzdEVtaXRNb2RlOiBEZWNsYXJhdGlvbkxpc3RFbWl0TW9kZS5EaXJlY3QsXG4gICAgfTtcblxuICAgIGlmIChzY29wZSAhPT0gbnVsbCAmJiAoIXNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQgfHwgdGhpcy51c2VQb2lzb25lZERhdGEpKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIHJlc29sdmUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICAvL1xuICAgICAgLy8gRmlyc3QgaXQgbmVlZHMgdG8gYmUgZGV0ZXJtaW5lZCBpZiBhY3R1YWxseSBpbXBvcnRpbmcgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgdXNlZCBpbiB0aGVcbiAgICAgIC8vIHRlbXBsYXRlIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLiBDdXJyZW50bHkgbmd0c2MgcmVmdXNlcyB0byBnZW5lcmF0ZSBjeWNsZXMsIHNvIGFuIG9wdGlvblxuICAgICAgLy8ga25vd24gYXMgXCJyZW1vdGUgc2NvcGluZ1wiIGlzIHVzZWQgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLiBJbiByZW1vdGUgc2NvcGluZywgdGhlXG4gICAgICAvLyBtb2R1bGUgZmlsZSBzZXRzIHRoZSBkaXJlY3RpdmVzL3BpcGVzIG9uIHRoZSDJtWNtcCBvZiB0aGUgY29tcG9uZW50LCB3aXRob3V0XG4gICAgICAvLyByZXF1aXJpbmcgbmV3IGltcG9ydHMgKGJ1dCBhbHNvIGluIGEgd2F5IHRoYXQgYnJlYWtzIHRyZWUgc2hha2luZykuXG4gICAgICAvL1xuICAgICAgLy8gRGV0ZXJtaW5pbmcgdGhpcyBpcyBjaGFsbGVuZ2luZywgYmVjYXVzZSB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyByZXNwb25zaWJsZSBmb3JcbiAgICAgIC8vIG1hdGNoaW5nIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSB0ZW1wbGF0ZTsgaG93ZXZlciwgdGhhdCBkb2Vzbid0IHJ1biB1bnRpbCB0aGUgYWN0dWFsXG4gICAgICAvLyBjb21waWxlKCkgc3RlcC4gSXQncyBub3QgcG9zc2libGUgdG8gcnVuIHRlbXBsYXRlIGNvbXBpbGF0aW9uIHNvb25lciBhcyBpdCByZXF1aXJlcyB0aGVcbiAgICAgIC8vIENvbnN0YW50UG9vbCBmb3IgdGhlIG92ZXJhbGwgZmlsZSBiZWluZyBjb21waWxlZCAod2hpY2ggaXNuJ3QgYXZhaWxhYmxlIHVudGlsIHRoZVxuICAgICAgLy8gdHJhbnNmb3JtIHN0ZXApLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQsIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIG1hdGNoZWQgaW5kZXBlbmRlbnRseSBoZXJlLCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXNcbiAgICAgIC8vIGlzIGFuIGFsdGVybmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIHRlbXBsYXRlIG1hdGNoaW5nIHdoaWNoIGlzIHVzZWQgZm9yIHRlbXBsYXRlXG4gICAgICAvLyB0eXBlLWNoZWNraW5nIGFuZCB3aWxsIGV2ZW50dWFsbHkgcmVwbGFjZSBtYXRjaGluZyBpbiB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlci5cblxuXG4gICAgICAvLyBTZXQgdXAgdGhlIFIzVGFyZ2V0QmluZGVyLCBhcyB3ZWxsIGFzIGEgJ2RpcmVjdGl2ZXMnIGFycmF5IGFuZCBhICdwaXBlcycgbWFwIHRoYXQgYXJlXG4gICAgICAvLyBsYXRlciBmZWQgdG8gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuIEZpcnN0LCBhIFNlbGVjdG9yTWF0Y2hlciBpcyBjb25zdHJ1Y3RlZCB0b1xuICAgICAgLy8gbWF0Y2ggZGlyZWN0aXZlcyB0aGF0IGFyZSBpbiBzY29wZS5cbiAgICAgIHR5cGUgTWF0Y2hlZERpcmVjdGl2ZSA9IERpcmVjdGl2ZU1ldGEme3NlbGVjdG9yOiBzdHJpbmd9O1xuICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8TWF0Y2hlZERpcmVjdGl2ZT4oKTtcblxuICAgICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBpZiAoZGlyLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShkaXIuc2VsZWN0b3IpLCBkaXIgYXMgTWF0Y2hlZERpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5jb21waWxhdGlvbi5waXBlcykge1xuICAgICAgICBwaXBlcy5zZXQocGlwZS5uYW1lLCBwaXBlLnJlZik7XG4gICAgICB9XG5cbiAgICAgIC8vIE5leHQsIHRoZSBjb21wb25lbnQgdGVtcGxhdGUgQVNUIGlzIGJvdW5kIHVzaW5nIHRoZSBSM1RhcmdldEJpbmRlci4gVGhpcyBwcm9kdWNlcyBhXG4gICAgICAvLyBCb3VuZFRhcmdldCwgd2hpY2ggaXMgc2ltaWxhciB0byBhIHRzLlR5cGVDaGVja2VyLlxuICAgICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgICAgY29uc3QgYm91bmQgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IG1ldGFkYXRhLnRlbXBsYXRlLm5vZGVzfSk7XG5cbiAgICAgIC8vIFRoZSBCb3VuZFRhcmdldCBrbm93cyB3aGljaCBkaXJlY3RpdmVzIGFuZCBwaXBlcyBtYXRjaGVkIHRoZSB0ZW1wbGF0ZS5cbiAgICAgIHR5cGUgVXNlZERpcmVjdGl2ZSA9IFIzVXNlZERpcmVjdGl2ZU1ldGFkYXRhJntyZWY6IFJlZmVyZW5jZX07XG4gICAgICBjb25zdCB1c2VkRGlyZWN0aXZlczogVXNlZERpcmVjdGl2ZVtdID0gYm91bmQuZ2V0VXNlZERpcmVjdGl2ZXMoKS5tYXAoZGlyZWN0aXZlID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICByZWY6IGRpcmVjdGl2ZS5yZWYsXG4gICAgICAgICAgdHlwZTogdGhpcy5yZWZFbWl0dGVyLmVtaXQoZGlyZWN0aXZlLnJlZiwgY29udGV4dCksXG4gICAgICAgICAgc2VsZWN0b3I6IGRpcmVjdGl2ZS5zZWxlY3RvcixcbiAgICAgICAgICBpbnB1dHM6IGRpcmVjdGl2ZS5pbnB1dHMucHJvcGVydHlOYW1lcyxcbiAgICAgICAgICBvdXRwdXRzOiBkaXJlY3RpdmUub3V0cHV0cy5wcm9wZXJ0eU5hbWVzLFxuICAgICAgICAgIGV4cG9ydEFzOiBkaXJlY3RpdmUuZXhwb3J0QXMsXG4gICAgICAgICAgaXNDb21wb25lbnQ6IGRpcmVjdGl2ZS5pc0NvbXBvbmVudCxcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuXG4gICAgICB0eXBlIFVzZWRQaXBlID0ge3JlZjogUmVmZXJlbmNlLCBwaXBlTmFtZTogc3RyaW5nLCBleHByZXNzaW9uOiBFeHByZXNzaW9ufTtcbiAgICAgIGNvbnN0IHVzZWRQaXBlczogVXNlZFBpcGVbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBwaXBlTmFtZSBvZiBib3VuZC5nZXRVc2VkUGlwZXMoKSkge1xuICAgICAgICBpZiAoIXBpcGVzLmhhcyhwaXBlTmFtZSkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwaXBlID0gcGlwZXMuZ2V0KHBpcGVOYW1lKSE7XG4gICAgICAgIHVzZWRQaXBlcy5wdXNoKHtcbiAgICAgICAgICByZWY6IHBpcGUsXG4gICAgICAgICAgcGlwZU5hbWUsXG4gICAgICAgICAgZXhwcmVzc2lvbjogdGhpcy5yZWZFbWl0dGVyLmVtaXQocGlwZSwgY29udGV4dCksXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBTY2FuIHRocm91Z2ggdGhlIGRpcmVjdGl2ZXMvcGlwZXMgYWN0dWFsbHkgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYW5kIGNoZWNrIHdoZXRoZXIgYW55XG4gICAgICAvLyBpbXBvcnQgd2hpY2ggbmVlZHMgdG8gYmUgZ2VuZXJhdGVkIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLlxuICAgICAgY29uc3QgY3ljbGVzRnJvbURpcmVjdGl2ZXMgPSBuZXcgTWFwPFVzZWREaXJlY3RpdmUsIEN5Y2xlPigpO1xuICAgICAgZm9yIChjb25zdCB1c2VkRGlyZWN0aXZlIG9mIHVzZWREaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IGN5Y2xlID0gdGhpcy5fY2hlY2tGb3JDeWNsaWNJbXBvcnQodXNlZERpcmVjdGl2ZS5yZWYsIHVzZWREaXJlY3RpdmUudHlwZSwgY29udGV4dCk7XG4gICAgICAgIGlmIChjeWNsZSAhPT0gbnVsbCkge1xuICAgICAgICAgIGN5Y2xlc0Zyb21EaXJlY3RpdmVzLnNldCh1c2VkRGlyZWN0aXZlLCBjeWNsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGN5Y2xlc0Zyb21QaXBlcyA9IG5ldyBNYXA8VXNlZFBpcGUsIEN5Y2xlPigpO1xuICAgICAgZm9yIChjb25zdCB1c2VkUGlwZSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgY29uc3QgY3ljbGUgPSB0aGlzLl9jaGVja0ZvckN5Y2xpY0ltcG9ydCh1c2VkUGlwZS5yZWYsIHVzZWRQaXBlLmV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgICBpZiAoY3ljbGUgIT09IG51bGwpIHtcbiAgICAgICAgICBjeWNsZXNGcm9tUGlwZXMuc2V0KHVzZWRQaXBlLCBjeWNsZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGN5Y2xlc0Zyb21EaXJlY3RpdmVzLnNpemUgPT09IDAgJiYgY3ljbGVzRnJvbVBpcGVzLnNpemUgPT09IDApIHtcbiAgICAgICAgLy8gTm8gY3ljbGUgd2FzIGRldGVjdGVkLiBSZWNvcmQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGNyZWF0ZWQgaW4gdGhlIGN5Y2xlIGRldGVjdG9yXG4gICAgICAgIC8vIHNvIHRoYXQgZnV0dXJlIGN5Y2xpYyBpbXBvcnQgY2hlY2tzIGNvbnNpZGVyIHRoZWlyIHByb2R1Y3Rpb24uXG4gICAgICAgIGZvciAoY29uc3Qge3R5cGV9IG9mIHVzZWREaXJlY3RpdmVzKSB7XG4gICAgICAgICAgdGhpcy5fcmVjb3JkU3ludGhldGljSW1wb3J0KHR5cGUsIGNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3Qge2V4cHJlc3Npb259IG9mIHVzZWRQaXBlcykge1xuICAgICAgICAgIHRoaXMuX3JlY29yZFN5bnRoZXRpY0ltcG9ydChleHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGFycmF5cyBpbiDJtWNtcCBuZWVkIHRvIGJlIHdyYXBwZWQgaW4gY2xvc3VyZXMuXG4gICAgICAgIC8vIFRoaXMgaXMgcmVxdWlyZWQgaWYgYW55IGRpcmVjdGl2ZS9waXBlIHJlZmVyZW5jZSBpcyB0byBhIGRlY2xhcmF0aW9uIGluIHRoZSBzYW1lIGZpbGVcbiAgICAgICAgLy8gYnV0IGRlY2xhcmVkIGFmdGVyIHRoaXMgY29tcG9uZW50LlxuICAgICAgICBjb25zdCB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID1cbiAgICAgICAgICAgIHVzZWREaXJlY3RpdmVzLnNvbWUoXG4gICAgICAgICAgICAgICAgZGlyID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoZGlyLnR5cGUsIG5vZGUubmFtZSwgY29udGV4dCkpIHx8XG4gICAgICAgICAgICB1c2VkUGlwZXMuc29tZShcbiAgICAgICAgICAgICAgICBwaXBlID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocGlwZS5leHByZXNzaW9uLCBub2RlLm5hbWUsIGNvbnRleHQpKTtcblxuICAgICAgICBkYXRhLmRpcmVjdGl2ZXMgPSB1c2VkRGlyZWN0aXZlcztcbiAgICAgICAgZGF0YS5waXBlcyA9IG5ldyBNYXAodXNlZFBpcGVzLm1hcChwaXBlID0+IFtwaXBlLnBpcGVOYW1lLCBwaXBlLmV4cHJlc3Npb25dKSk7XG4gICAgICAgIGRhdGEuZGVjbGFyYXRpb25MaXN0RW1pdE1vZGUgPSB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID9cbiAgICAgICAgICAgIERlY2xhcmF0aW9uTGlzdEVtaXRNb2RlLkNsb3N1cmUgOlxuICAgICAgICAgICAgRGVjbGFyYXRpb25MaXN0RW1pdE1vZGUuRGlyZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuY3ljbGVIYW5kbGluZ1N0cmF0ZWd5ID09PSBDeWNsZUhhbmRsaW5nU3RyYXRlZ3kuVXNlUmVtb3RlU2NvcGluZykge1xuICAgICAgICAgIC8vIERlY2xhcmluZyB0aGUgZGlyZWN0aXZlRGVmcy9waXBlRGVmcyBhcnJheXMgZGlyZWN0bHkgd291bGQgcmVxdWlyZSBpbXBvcnRzIHRoYXQgd291bGRcbiAgICAgICAgICAvLyBjcmVhdGUgYSBjeWNsZS4gSW5zdGVhZCwgbWFyayB0aGlzIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcsIHNvIHRoYXQgdGhlXG4gICAgICAgICAgLy8gTmdNb2R1bGUgZmlsZSB3aWxsIHRha2UgY2FyZSBvZiBzZXR0aW5nIHRoZSBkaXJlY3RpdmVzIGZvciB0aGUgY29tcG9uZW50LlxuICAgICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5zZXRDb21wb25lbnRSZW1vdGVTY29wZShcbiAgICAgICAgICAgICAgbm9kZSwgdXNlZERpcmVjdGl2ZXMubWFwKGRpciA9PiBkaXIucmVmKSwgdXNlZFBpcGVzLm1hcChwaXBlID0+IHBpcGUucmVmKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gV2UgYXJlIG5vdCBhYmxlIHRvIGhhbmRsZSB0aGlzIGN5Y2xlIHNvIHRocm93IGFuIGVycm9yLlxuICAgICAgICAgIGNvbnN0IHJlbGF0ZWRNZXNzYWdlczogdHMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbltdID0gW107XG4gICAgICAgICAgZm9yIChjb25zdCBbZGlyLCBjeWNsZV0gb2YgY3ljbGVzRnJvbURpcmVjdGl2ZXMpIHtcbiAgICAgICAgICAgIHJlbGF0ZWRNZXNzYWdlcy5wdXNoKFxuICAgICAgICAgICAgICAgIG1ha2VDeWNsaWNJbXBvcnRJbmZvKGRpci5yZWYsIGRpci5pc0NvbXBvbmVudCA/ICdjb21wb25lbnQnIDogJ2RpcmVjdGl2ZScsIGN5Y2xlKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgW3BpcGUsIGN5Y2xlXSBvZiBjeWNsZXNGcm9tUGlwZXMpIHtcbiAgICAgICAgICAgIHJlbGF0ZWRNZXNzYWdlcy5wdXNoKG1ha2VDeWNsaWNJbXBvcnRJbmZvKHBpcGUucmVmLCAncGlwZScsIGN5Y2xlKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLklNUE9SVF9DWUNMRV9ERVRFQ1RFRCwgbm9kZSxcbiAgICAgICAgICAgICAgJ09uZSBvciBtb3JlIGltcG9ydCBjeWNsZXMgd291bGQgbmVlZCB0byBiZSBjcmVhdGVkIHRvIGNvbXBpbGUgdGhpcyBjb21wb25lbnQsICcgK1xuICAgICAgICAgICAgICAgICAgJ3doaWNoIGlzIG5vdCBzdXBwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgY29tcGlsZXIgY29uZmlndXJhdGlvbi4nLFxuICAgICAgICAgICAgICByZWxhdGVkTWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgaWYgKGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgIT09IG51bGwgJiZcbiAgICAgICAgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMgaW5zdGFuY2VvZiBXcmFwcGVkTm9kZUV4cHIpIHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyRGlhZ25vc3RpY3MgPSBnZXRQcm92aWRlckRpYWdub3N0aWNzKFxuICAgICAgICAgIGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIGFuYWx5c2lzLm1ldGEucHJvdmlkZXJzIS5ub2RlLFxuICAgICAgICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5KTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4ucHJvdmlkZXJEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgaWYgKGFuYWx5c2lzLnZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ICE9PSBudWxsICYmXG4gICAgICAgIGFuYWx5c2lzLm1ldGEudmlld1Byb3ZpZGVycyBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcikge1xuICAgICAgY29uc3Qgdmlld1Byb3ZpZGVyRGlhZ25vc3RpY3MgPSBnZXRQcm92aWRlckRpYWdub3N0aWNzKFxuICAgICAgICAgIGFuYWx5c2lzLnZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LCBhbmFseXNpcy5tZXRhLnZpZXdQcm92aWRlcnMhLm5vZGUsXG4gICAgICAgICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi52aWV3UHJvdmlkZXJEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlRGlhZ25vc3RpY3MgPSBnZXREaXJlY3RpdmVEaWFnbm9zdGljcyhcbiAgICAgICAgbm9kZSwgdGhpcy5tZXRhUmVhZGVyLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgJ0NvbXBvbmVudCcpO1xuICAgIGlmIChkaXJlY3RpdmVEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5kaXJlY3RpdmVEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIHJldHVybiB7ZGF0YX07XG4gIH1cblxuICB1cGRhdGVSZXNvdXJjZXMobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IENvbXBvbmVudEFuYWx5c2lzRGF0YSk6IHZvaWQge1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICAvLyBJZiB0aGUgdGVtcGxhdGUgaXMgZXh0ZXJuYWwsIHJlLXBhcnNlIGl0LlxuICAgIGNvbnN0IHRlbXBsYXRlRGVjbCA9IGFuYWx5c2lzLnRlbXBsYXRlLmRlY2xhcmF0aW9uO1xuICAgIGlmICghdGVtcGxhdGVEZWNsLmlzSW5saW5lKSB7XG4gICAgICBhbmFseXNpcy50ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIGFueSBleHRlcm5hbCBzdHlsZXNoZWV0cyBhbmQgcmVidWlsZCB0aGUgY29tYmluZWQgJ3N0eWxlcycgbGlzdC5cbiAgICAvLyBUT0RPKGFseGh1Yik6IHdyaXRlIHRlc3RzIGZvciBzdHlsZXMgd2hlbiB0aGUgcHJpbWFyeSBjb21waWxlciB1c2VzIHRoZSB1cGRhdGVSZXNvdXJjZXMgcGF0aFxuICAgIGxldCBzdHlsZXM6IHN0cmluZ1tdID0gW107XG4gICAgaWYgKGFuYWx5c2lzLnN0eWxlVXJscyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzdHlsZVVybCBvZiBhbmFseXNpcy5zdHlsZVVybHMpIHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VUeXBlID1cbiAgICAgICAgICAgIHN0eWxlVXJsLnNvdXJjZSA9PT0gUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IgP1xuICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IgOlxuICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21UZW1wbGF0ZTtcbiAgICAgICAgY29uc3QgcmVzb2x2ZWRTdHlsZVVybCA9IHRoaXMuX3Jlc29sdmVSZXNvdXJjZU9yVGhyb3coXG4gICAgICAgICAgICBzdHlsZVVybC51cmwsIGNvbnRhaW5pbmdGaWxlLCBzdHlsZVVybC5ub2RlRm9yRXJyb3IsIHJlc291cmNlVHlwZSk7XG4gICAgICAgIGNvbnN0IHN0eWxlVGV4dCA9IHRoaXMucmVzb3VyY2VMb2FkZXIubG9hZChyZXNvbHZlZFN0eWxlVXJsKTtcbiAgICAgICAgc3R5bGVzLnB1c2goc3R5bGVUZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGFuYWx5c2lzLmlubGluZVN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBzdHlsZVRleHQgb2YgYW5hbHlzaXMuaW5saW5lU3R5bGVzKSB7XG4gICAgICAgIHN0eWxlcy5wdXNoKHN0eWxlVGV4dCk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3R5bGVUZXh0IG9mIGFuYWx5c2lzLnRlbXBsYXRlLnN0eWxlcykge1xuICAgICAgc3R5bGVzLnB1c2goc3R5bGVUZXh0KTtcbiAgICB9XG5cbiAgICBhbmFseXNpcy5tZXRhLnN0eWxlcyA9IHN0eWxlcztcbiAgfVxuXG4gIGNvbXBpbGVGdWxsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICByZXNvbHV0aW9uOiBSZWFkb25seTxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4sIHBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgaWYgKGFuYWx5c2lzLnRlbXBsYXRlLmVycm9ycyAhPT0gbnVsbCAmJiBhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBtZXRhOiBSM0NvbXBvbmVudE1ldGFkYXRhID0gey4uLmFuYWx5c2lzLm1ldGEsIC4uLnJlc29sdXRpb259O1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZUNvbXBvbmVudChhbmFseXNpcywgZGVmKTtcbiAgfVxuXG4gIGNvbXBpbGVQYXJ0aWFsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4sXG4gICAgICByZXNvbHV0aW9uOiBSZWFkb25seTxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGlmIChhbmFseXNpcy50ZW1wbGF0ZS5lcnJvcnMgIT09IG51bGwgJiYgYW5hbHlzaXMudGVtcGxhdGUuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgbWV0YTogUjNDb21wb25lbnRNZXRhZGF0YSA9IHsuLi5hbmFseXNpcy5tZXRhLCAuLi5yZXNvbHV0aW9ufTtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlRGVjbGFyZUNvbXBvbmVudEZyb21NZXRhZGF0YShtZXRhLCBhbmFseXNpcy50ZW1wbGF0ZSk7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZUNvbXBvbmVudChhbmFseXNpcywgZGVmKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcGlsZUNvbXBvbmVudChcbiAgICAgIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+LFxuICAgICAge2V4cHJlc3Npb246IGluaXRpYWxpemVyLCB0eXBlfTogUjNDb21wb25lbnREZWYpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGZhY3RvcnlSZXMgPSBjb21waWxlTmdGYWN0b3J5RGVmRmllbGQoe1xuICAgICAgLi4uYW5hbHlzaXMubWV0YSxcbiAgICAgIGluamVjdEZuOiBJZGVudGlmaWVycy5kaXJlY3RpdmVJbmplY3QsXG4gICAgICB0YXJnZXQ6IFIzRmFjdG9yeVRhcmdldC5Db21wb25lbnQsXG4gICAgfSk7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIFtcbiAgICAgIGZhY3RvcnlSZXMsIHtcbiAgICAgICAgbmFtZTogJ8m1Y21wJyxcbiAgICAgICAgaW5pdGlhbGl6ZXIsXG4gICAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgICAgICB0eXBlLFxuICAgICAgfVxuICAgIF07XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3I6IERlY29yYXRvcik6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBpZiAodGhpcy5saXRlcmFsQ2FjaGUuaGFzKGRlY29yYXRvcikpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpdGVyYWxDYWNoZS5nZXQoZGVjb3JhdG9yKSE7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBDb21wb25lbnQgZGVjb3JhdG9yYCk7XG4gICAgfVxuICAgIGNvbnN0IG1ldGEgPSB1bndyYXBFeHByZXNzaW9uKGRlY29yYXRvci5hcmdzWzBdKTtcblxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLCBgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgICB9XG5cbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5zZXQoZGVjb3JhdG9yLCBtZXRhKTtcbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jlc29sdmVFbnVtVmFsdWUoXG4gICAgICBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBmaWVsZDogc3RyaW5nLCBlbnVtU3ltYm9sTmFtZTogc3RyaW5nKTogbnVtYmVyfG51bGwge1xuICAgIGxldCByZXNvbHZlZDogbnVtYmVyfG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKGZpZWxkKSkge1xuICAgICAgY29uc3QgZXhwciA9IGNvbXBvbmVudC5nZXQoZmllbGQpITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcikgYXMgYW55O1xuICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRW51bVZhbHVlICYmIGlzQW5ndWxhckNvcmVSZWZlcmVuY2UodmFsdWUuZW51bVJlZiwgZW51bVN5bWJvbE5hbWUpKSB7XG4gICAgICAgIHJlc29sdmVkID0gdmFsdWUucmVzb2x2ZWQgYXMgbnVtYmVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGV4cHIsIHZhbHVlLCBgJHtmaWVsZH0gbXVzdCBiZSBhIG1lbWJlciBvZiAke2VudW1TeW1ib2xOYW1lfSBlbnVtIGZyb20gQGFuZ3VsYXIvY29yZWApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0Q29tcG9uZW50U3R5bGVVcmxzKFxuICAgICAgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPixcbiAgICAgICk6IFN0eWxlVXJsTWV0YVtdIHtcbiAgICBpZiAoIWNvbXBvbmVudC5oYXMoJ3N0eWxlVXJscycpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2V4dHJhY3RTdHlsZVVybHNGcm9tRXhwcmVzc2lvbihjb21wb25lbnQuZ2V0KCdzdHlsZVVybHMnKSEpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdFN0eWxlVXJsc0Zyb21FeHByZXNzaW9uKHN0eWxlVXJsc0V4cHI6IHRzLkV4cHJlc3Npb24pOiBTdHlsZVVybE1ldGFbXSB7XG4gICAgY29uc3Qgc3R5bGVVcmxzOiBTdHlsZVVybE1ldGFbXSA9IFtdO1xuXG4gICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihzdHlsZVVybHNFeHByKSkge1xuICAgICAgZm9yIChjb25zdCBzdHlsZVVybEV4cHIgb2Ygc3R5bGVVcmxzRXhwci5lbGVtZW50cykge1xuICAgICAgICBpZiAodHMuaXNTcHJlYWRFbGVtZW50KHN0eWxlVXJsRXhwcikpIHtcbiAgICAgICAgICBzdHlsZVVybHMucHVzaCguLi50aGlzLl9leHRyYWN0U3R5bGVVcmxzRnJvbUV4cHJlc3Npb24oc3R5bGVVcmxFeHByLmV4cHJlc3Npb24pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBzdHlsZVVybCA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHN0eWxlVXJsRXhwcik7XG5cbiAgICAgICAgICBpZiAodHlwZW9mIHN0eWxlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihzdHlsZVVybEV4cHIsIHN0eWxlVXJsLCAnc3R5bGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0eWxlVXJscy5wdXNoKHtcbiAgICAgICAgICAgIHVybDogc3R5bGVVcmwsXG4gICAgICAgICAgICBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yLFxuICAgICAgICAgICAgbm9kZUZvckVycm9yOiBzdHlsZVVybEV4cHIsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZXZhbHVhdGVkU3R5bGVVcmxzID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoc3R5bGVVcmxzRXhwcik7XG4gICAgICBpZiAoIWlzU3RyaW5nQXJyYXkoZXZhbHVhdGVkU3R5bGVVcmxzKSkge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgc3R5bGVVcmxzRXhwciwgZXZhbHVhdGVkU3R5bGVVcmxzLCAnc3R5bGVVcmxzIG11c3QgYmUgYW4gYXJyYXkgb2Ygc3RyaW5ncycpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHN0eWxlVXJsIG9mIGV2YWx1YXRlZFN0eWxlVXJscykge1xuICAgICAgICBzdHlsZVVybHMucHVzaCh7XG4gICAgICAgICAgdXJsOiBzdHlsZVVybCxcbiAgICAgICAgICBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yLFxuICAgICAgICAgIG5vZGVGb3JFcnJvcjogc3R5bGVVcmxzRXhwcixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0eWxlVXJscztcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RTdHlsZVJlc291cmNlcyhjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBjb250YWluaW5nRmlsZTogc3RyaW5nKTpcbiAgICAgIFJlYWRvbmx5U2V0PFJlc291cmNlPiB7XG4gICAgY29uc3Qgc3R5bGVzID0gbmV3IFNldDxSZXNvdXJjZT4oKTtcbiAgICBmdW5jdGlvbiBzdHJpbmdMaXRlcmFsRWxlbWVudHMoYXJyYXk6IHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24pOiB0cy5TdHJpbmdMaXRlcmFsTGlrZVtdIHtcbiAgICAgIHJldHVybiBhcnJheS5lbGVtZW50cy5maWx0ZXIoXG4gICAgICAgICAgKGU6IHRzLkV4cHJlc3Npb24pOiBlIGlzIHRzLlN0cmluZ0xpdGVyYWxMaWtlID0+IHRzLmlzU3RyaW5nTGl0ZXJhbExpa2UoZSkpO1xuICAgIH1cblxuICAgIC8vIElmIHN0eWxlVXJscyBpcyBhIGxpdGVyYWwgYXJyYXksIHByb2Nlc3MgZWFjaCByZXNvdXJjZSB1cmwgaW5kaXZpZHVhbGx5IGFuZFxuICAgIC8vIHJlZ2lzdGVyIG9uZXMgdGhhdCBhcmUgc3RyaW5nIGxpdGVyYWxzLlxuICAgIGNvbnN0IHN0eWxlVXJsc0V4cHIgPSBjb21wb25lbnQuZ2V0KCdzdHlsZVVybHMnKTtcbiAgICBpZiAoc3R5bGVVcmxzRXhwciAhPT0gdW5kZWZpbmVkICYmIHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihzdHlsZVVybHNFeHByKSkge1xuICAgICAgZm9yIChjb25zdCBleHByZXNzaW9uIG9mIHN0cmluZ0xpdGVyYWxFbGVtZW50cyhzdHlsZVVybHNFeHByKSkge1xuICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMuX3Jlc29sdmVSZXNvdXJjZU9yVGhyb3coXG4gICAgICAgICAgICBleHByZXNzaW9uLnRleHQsIGNvbnRhaW5pbmdGaWxlLCBleHByZXNzaW9uLFxuICAgICAgICAgICAgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuU3R5bGVzaGVldEZyb21EZWNvcmF0b3IpO1xuICAgICAgICBzdHlsZXMuYWRkKHtwYXRoOiBhYnNvbHV0ZUZyb20ocmVzb3VyY2VVcmwpLCBleHByZXNzaW9ufSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgc3R5bGVzRXhwciA9IGNvbXBvbmVudC5nZXQoJ3N0eWxlcycpO1xuICAgIGlmIChzdHlsZXNFeHByICE9PSB1bmRlZmluZWQgJiYgdHMuaXNBcnJheUxpdGVyYWxFeHByZXNzaW9uKHN0eWxlc0V4cHIpKSB7XG4gICAgICBmb3IgKGNvbnN0IGV4cHJlc3Npb24gb2Ygc3RyaW5nTGl0ZXJhbEVsZW1lbnRzKHN0eWxlc0V4cHIpKSB7XG4gICAgICAgIHN0eWxlcy5hZGQoe3BhdGg6IG51bGwsIGV4cHJlc3Npb259KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3R5bGVzO1xuICB9XG5cbiAgcHJpdmF0ZSBfcHJlbG9hZEFuZFBhcnNlVGVtcGxhdGUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvciwgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPixcbiAgICAgIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBQcm9taXNlPFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZXxudWxsPiB7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgIC8vIEV4dHJhY3QgdGhlIHRlbXBsYXRlVXJsIGFuZCBwcmVsb2FkIGl0LlxuICAgICAgY29uc3QgdGVtcGxhdGVVcmxFeHByID0gY29tcG9uZW50LmdldCgndGVtcGxhdGVVcmwnKSE7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybCA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHRlbXBsYXRlVXJsRXhwcik7XG4gICAgICBpZiAodHlwZW9mIHRlbXBsYXRlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgdGVtcGxhdGVVcmxFeHByLCB0ZW1wbGF0ZVVybCwgJ3RlbXBsYXRlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5fcmVzb2x2ZVJlc291cmNlT3JUaHJvdyhcbiAgICAgICAgICB0ZW1wbGF0ZVVybCwgY29udGFpbmluZ0ZpbGUsIHRlbXBsYXRlVXJsRXhwciwgUmVzb3VyY2VUeXBlRm9yRGlhZ25vc3RpY3MuVGVtcGxhdGUpO1xuICAgICAgY29uc3QgdGVtcGxhdGVQcm9taXNlID0gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkKHJlc291cmNlVXJsKTtcblxuICAgICAgLy8gSWYgdGhlIHByZWxvYWQgd29ya2VkLCB0aGVuIGFjdHVhbGx5IGxvYWQgYW5kIHBhcnNlIHRoZSB0ZW1wbGF0ZSwgYW5kIHdhaXQgZm9yIGFueSBzdHlsZVxuICAgICAgLy8gVVJMcyB0byByZXNvbHZlLlxuICAgICAgaWYgKHRlbXBsYXRlUHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZVByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3QgdGVtcGxhdGVEZWNsID0gdGhpcy5wYXJzZVRlbXBsYXRlRGVjbGFyYXRpb24oZGVjb3JhdG9yLCBjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuZXh0cmFjdFRlbXBsYXRlKG5vZGUsIHRlbXBsYXRlRGVjbCk7XG4gICAgICAgICAgdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5zZXQobm9kZSwgdGVtcGxhdGUpO1xuICAgICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZURlY2wgPSB0aGlzLnBhcnNlVGVtcGxhdGVEZWNsYXJhdGlvbihkZWNvcmF0b3IsIGNvbXBvbmVudCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLmV4dHJhY3RUZW1wbGF0ZShub2RlLCB0ZW1wbGF0ZURlY2wpO1xuICAgICAgdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5zZXQobm9kZSwgdGVtcGxhdGUpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0ZW1wbGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0VGVtcGxhdGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgdGVtcGxhdGU6IFRlbXBsYXRlRGVjbGFyYXRpb24pOlxuICAgICAgUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlIHtcbiAgICBpZiAodGVtcGxhdGUuaXNJbmxpbmUpIHtcbiAgICAgIGxldCB0ZW1wbGF0ZVN0cjogc3RyaW5nO1xuICAgICAgbGV0IHRlbXBsYXRlTGl0ZXJhbDogdHMuTm9kZXxudWxsID0gbnVsbDtcbiAgICAgIGxldCB0ZW1wbGF0ZVVybDogc3RyaW5nID0gJyc7XG4gICAgICBsZXQgdGVtcGxhdGVSYW5nZTogTGV4ZXJSYW5nZXxudWxsID0gbnVsbDtcbiAgICAgIGxldCBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gICAgICBsZXQgZXNjYXBlZFN0cmluZyA9IGZhbHNlO1xuICAgICAgLy8gV2Ugb25seSBzdXBwb3J0IFNvdXJjZU1hcHMgZm9yIGlubGluZSB0ZW1wbGF0ZXMgdGhhdCBhcmUgc2ltcGxlIHN0cmluZyBsaXRlcmFscy5cbiAgICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwodGVtcGxhdGUuZXhwcmVzc2lvbikgfHxcbiAgICAgICAgICB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKHRlbXBsYXRlLmV4cHJlc3Npb24pKSB7XG4gICAgICAgIC8vIHRoZSBzdGFydCBhbmQgZW5kIG9mIHRoZSBgdGVtcGxhdGVFeHByYCBub2RlIGluY2x1ZGVzIHRoZSBxdW90YXRpb24gbWFya3MsIHdoaWNoIHdlIG11c3RcbiAgICAgICAgLy8gc3RyaXBcbiAgICAgICAgdGVtcGxhdGVSYW5nZSA9IGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGUuZXhwcmVzc2lvbik7XG4gICAgICAgIHRlbXBsYXRlU3RyID0gdGVtcGxhdGUuZXhwcmVzc2lvbi5nZXRTb3VyY2VGaWxlKCkudGV4dDtcbiAgICAgICAgdGVtcGxhdGVMaXRlcmFsID0gdGVtcGxhdGUuZXhwcmVzc2lvbjtcbiAgICAgICAgdGVtcGxhdGVVcmwgPSB0ZW1wbGF0ZS50ZW1wbGF0ZVVybDtcbiAgICAgICAgZXNjYXBlZFN0cmluZyA9IHRydWU7XG4gICAgICAgIHNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgICAgdHlwZTogJ2RpcmVjdCcsXG4gICAgICAgICAgbm9kZTogdGVtcGxhdGUuZXhwcmVzc2lvbixcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkVGVtcGxhdGUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZS5leHByZXNzaW9uKTtcbiAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZFRlbXBsYXRlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIHRlbXBsYXRlLmV4cHJlc3Npb24sIHJlc29sdmVkVGVtcGxhdGUsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGVtcGxhdGVTdHIgPSByZXNvbHZlZFRlbXBsYXRlO1xuICAgICAgICBzb3VyY2VNYXBwaW5nID0ge1xuICAgICAgICAgIHR5cGU6ICdpbmRpcmVjdCcsXG4gICAgICAgICAgbm9kZTogdGVtcGxhdGUuZXhwcmVzc2lvbixcbiAgICAgICAgICBjb21wb25lbnRDbGFzczogbm9kZSxcbiAgICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVTdHIsXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLnRoaXMuX3BhcnNlVGVtcGxhdGUodGVtcGxhdGUsIHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZVJhbmdlLCBlc2NhcGVkU3RyaW5nKSxcbiAgICAgICAgc291cmNlTWFwcGluZyxcbiAgICAgICAgZGVjbGFyYXRpb246IHRlbXBsYXRlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGVTdHIgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQodGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybCk7XG4gICAgICBpZiAodGhpcy5kZXBUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuZGVwVHJhY2tlci5hZGRSZXNvdXJjZURlcGVuZGVuY3koXG4gICAgICAgICAgICBub2RlLmdldFNvdXJjZUZpbGUoKSwgYWJzb2x1dGVGcm9tKHRlbXBsYXRlLnJlc29sdmVkVGVtcGxhdGVVcmwpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4udGhpcy5fcGFyc2VUZW1wbGF0ZShcbiAgICAgICAgICAgIHRlbXBsYXRlLCB0ZW1wbGF0ZVN0ciwgLyogdGVtcGxhdGVSYW5nZSAqLyBudWxsLFxuICAgICAgICAgICAgLyogZXNjYXBlZFN0cmluZyAqLyBmYWxzZSksXG4gICAgICAgIHNvdXJjZU1hcHBpbmc6IHtcbiAgICAgICAgICB0eXBlOiAnZXh0ZXJuYWwnLFxuICAgICAgICAgIGNvbXBvbmVudENsYXNzOiBub2RlLFxuICAgICAgICAgIC8vIFRPRE8oYWx4aHViKTogVFMgaW4gZzMgaXMgdW5hYmxlIHRvIG1ha2UgdGhpcyBpbmZlcmVuY2Ugb24gaXRzIG93biwgc28gY2FzdCBpdCBoZXJlXG4gICAgICAgICAgLy8gdW50aWwgZzMgaXMgYWJsZSB0byBmaWd1cmUgdGhpcyBvdXQuXG4gICAgICAgICAgbm9kZTogKHRlbXBsYXRlIGFzIEV4dGVybmFsVGVtcGxhdGVEZWNsYXJhdGlvbikudGVtcGxhdGVVcmxFeHByZXNzaW9uLFxuICAgICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVN0cixcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybCxcbiAgICAgICAgfSxcbiAgICAgICAgZGVjbGFyYXRpb246IHRlbXBsYXRlLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9wYXJzZVRlbXBsYXRlKFxuICAgICAgdGVtcGxhdGU6IFRlbXBsYXRlRGVjbGFyYXRpb24sIHRlbXBsYXRlU3RyOiBzdHJpbmcsIHRlbXBsYXRlUmFuZ2U6IExleGVyUmFuZ2V8bnVsbCxcbiAgICAgIGVzY2FwZWRTdHJpbmc6IGJvb2xlYW4pOiBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSB7XG4gICAgLy8gV2UgYWx3YXlzIG5vcm1hbGl6ZSBsaW5lIGVuZGluZ3MgaWYgdGhlIHRlbXBsYXRlIGhhcyBiZWVuIGVzY2FwZWQgKGkuZS4gaXMgaW5saW5lKS5cbiAgICBjb25zdCBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXMgPSBlc2NhcGVkU3RyaW5nIHx8IHRoaXMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzO1xuXG4gICAgY29uc3QgcGFyc2VkVGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZS5zb3VyY2VNYXBVcmwsIHtcbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXM6IHRlbXBsYXRlLnByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnOiB0ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uQ29uZmlnLFxuICAgICAgcmFuZ2U6IHRlbXBsYXRlUmFuZ2UgPz8gdW5kZWZpbmVkLFxuICAgICAgZXNjYXBlZFN0cmluZyxcbiAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IHRoaXMuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICAgIGkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyxcbiAgICAgIGlzSW5saW5lOiB0ZW1wbGF0ZS5pc0lubGluZSxcbiAgICAgIGFsd2F5c0F0dGVtcHRIdG1sVG9SM0FzdENvbnZlcnNpb246IHRoaXMudXNlUG9pc29uZWREYXRhLFxuICAgIH0pO1xuXG4gICAgLy8gVW5mb3J0dW5hdGVseSwgdGhlIHByaW1hcnkgcGFyc2Ugb2YgdGhlIHRlbXBsYXRlIGFib3ZlIG1heSBub3QgY29udGFpbiBhY2N1cmF0ZSBzb3VyY2UgbWFwXG4gICAgLy8gaW5mb3JtYXRpb24uIElmIHVzZWQgZGlyZWN0bHksIGl0IHdvdWxkIHJlc3VsdCBpbiBpbmNvcnJlY3QgY29kZSBsb2NhdGlvbnMgaW4gdGVtcGxhdGVcbiAgICAvLyBlcnJvcnMsIGV0Yy4gVGhlcmUgYXJlIHRocmVlIG1haW4gcHJvYmxlbXM6XG4gICAgLy9cbiAgICAvLyAxLiBgcHJlc2VydmVXaGl0ZXNwYWNlczogZmFsc2VgIGFubmloaWxhdGVzIHRoZSBjb3JyZWN0bmVzcyBvZiB0ZW1wbGF0ZSBzb3VyY2UgbWFwcGluZywgYXNcbiAgICAvLyAgICB0aGUgd2hpdGVzcGFjZSB0cmFuc2Zvcm1hdGlvbiBjaGFuZ2VzIHRoZSBjb250ZW50cyBvZiBIVE1MIHRleHQgbm9kZXMgYmVmb3JlIHRoZXkncmVcbiAgICAvLyAgICBwYXJzZWQgaW50byBBbmd1bGFyIGV4cHJlc3Npb25zLlxuICAgIC8vIDIuIGBwcmVzZXJ2ZUxpbmVFbmRpbmdzOiBmYWxzZWAgY2F1c2VzIGdyb3dpbmcgbWlzYWxpZ25tZW50cyBpbiB0ZW1wbGF0ZXMgdGhhdCB1c2UgJ1xcclxcbidcbiAgICAvLyAgICBsaW5lIGVuZGluZ3MsIGJ5IG5vcm1hbGl6aW5nIHRoZW0gdG8gJ1xcbicuXG4gICAgLy8gMy4gQnkgZGVmYXVsdCwgdGhlIHRlbXBsYXRlIHBhcnNlciBzdHJpcHMgbGVhZGluZyB0cml2aWEgY2hhcmFjdGVycyAobGlrZSBzcGFjZXMsIHRhYnMsIGFuZFxuICAgIC8vICAgIG5ld2xpbmVzKS4gVGhpcyBhbHNvIGRlc3Ryb3lzIHNvdXJjZSBtYXBwaW5nIGluZm9ybWF0aW9uLlxuICAgIC8vXG4gICAgLy8gSW4gb3JkZXIgdG8gZ3VhcmFudGVlIHRoZSBjb3JyZWN0bmVzcyBvZiBkaWFnbm9zdGljcywgdGVtcGxhdGVzIGFyZSBwYXJzZWQgYSBzZWNvbmQgdGltZVxuICAgIC8vIHdpdGggdGhlIGFib3ZlIG9wdGlvbnMgc2V0IHRvIHByZXNlcnZlIHNvdXJjZSBtYXBwaW5ncy5cblxuICAgIGNvbnN0IHtub2RlczogZGlhZ05vZGVzfSA9IHBhcnNlVGVtcGxhdGUodGVtcGxhdGVTdHIsIHRlbXBsYXRlLnNvdXJjZU1hcFVybCwge1xuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczogdHJ1ZSxcbiAgICAgIHByZXNlcnZlTGluZUVuZGluZ3M6IHRydWUsXG4gICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnOiB0ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uQ29uZmlnLFxuICAgICAgcmFuZ2U6IHRlbXBsYXRlUmFuZ2UgPz8gdW5kZWZpbmVkLFxuICAgICAgZXNjYXBlZFN0cmluZyxcbiAgICAgIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IHRoaXMuZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdCxcbiAgICAgIGkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyxcbiAgICAgIGxlYWRpbmdUcml2aWFDaGFyczogW10sXG4gICAgICBpc0lubGluZTogdGVtcGxhdGUuaXNJbmxpbmUsXG4gICAgICBhbHdheXNBdHRlbXB0SHRtbFRvUjNBc3RDb252ZXJzaW9uOiB0aGlzLnVzZVBvaXNvbmVkRGF0YSxcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICAuLi5wYXJzZWRUZW1wbGF0ZSxcbiAgICAgIGRpYWdOb2RlcyxcbiAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZS5pc0lubGluZSA/IG5ldyBXcmFwcGVkTm9kZUV4cHIodGVtcGxhdGUuZXhwcmVzc2lvbikgOiB0ZW1wbGF0ZVN0cixcbiAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZS5yZXNvbHZlZFRlbXBsYXRlVXJsLFxuICAgICAgaXNJbmxpbmU6IHRlbXBsYXRlLmlzSW5saW5lLFxuICAgICAgZmlsZTogbmV3IFBhcnNlU291cmNlRmlsZSh0ZW1wbGF0ZVN0ciwgdGVtcGxhdGUucmVzb2x2ZWRUZW1wbGF0ZVVybCksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VUZW1wbGF0ZURlY2xhcmF0aW9uKFxuICAgICAgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICBjb250YWluaW5nRmlsZTogc3RyaW5nKTogVGVtcGxhdGVEZWNsYXJhdGlvbiB7XG4gICAgbGV0IHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4gPSB0aGlzLmRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHZhbHVlLCAncHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IGJlIGEgYm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyA9IHZhbHVlO1xuICAgIH1cblxuICAgIGxldCBpbnRlcnBvbGF0aW9uQ29uZmlnID0gREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRztcbiAgICBpZiAoY29tcG9uZW50LmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgnaW50ZXJwb2xhdGlvbicpITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlLmxlbmd0aCAhPT0gMiB8fFxuICAgICAgICAgICF2YWx1ZS5ldmVyeShlbGVtZW50ID0+IHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGV4cHIsIHZhbHVlLCAnaW50ZXJwb2xhdGlvbiBtdXN0IGJlIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cyBvZiBzdHJpbmcgdHlwZScpO1xuICAgICAgfVxuICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyA9IEludGVycG9sYXRpb25Db25maWcuZnJvbUFycmF5KHZhbHVlIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xuICAgIH1cblxuICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybEV4cHIsIHRlbXBsYXRlVXJsLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLl9yZXNvbHZlUmVzb3VyY2VPclRocm93KFxuICAgICAgICAgIHRlbXBsYXRlVXJsLCBjb250YWluaW5nRmlsZSwgdGVtcGxhdGVVcmxFeHByLCBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5UZW1wbGF0ZSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzSW5saW5lOiBmYWxzZSxcbiAgICAgICAgaW50ZXJwb2xhdGlvbkNvbmZpZyxcbiAgICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyxcbiAgICAgICAgdGVtcGxhdGVVcmwsXG4gICAgICAgIHRlbXBsYXRlVXJsRXhwcmVzc2lvbjogdGVtcGxhdGVVcmxFeHByLFxuICAgICAgICByZXNvbHZlZFRlbXBsYXRlVXJsOiByZXNvdXJjZVVybCxcbiAgICAgICAgc291cmNlTWFwVXJsOiBzb3VyY2VNYXBVcmwocmVzb3VyY2VVcmwpLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlJykpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzSW5saW5lOiB0cnVlLFxuICAgICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnLFxuICAgICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICBleHByZXNzaW9uOiBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpISxcbiAgICAgICAgdGVtcGxhdGVVcmw6IGNvbnRhaW5pbmdGaWxlLFxuICAgICAgICByZXNvbHZlZFRlbXBsYXRlVXJsOiBjb250YWluaW5nRmlsZSxcbiAgICAgICAgc291cmNlTWFwVXJsOiBjb250YWluaW5nRmlsZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuQ09NUE9ORU5UX01JU1NJTkdfVEVNUExBVEUsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgICAnY29tcG9uZW50IGlzIG1pc3NpbmcgYSB0ZW1wbGF0ZScpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2V4cHJlc3Npb25Ub0ltcG9ydGVkRmlsZShleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBGaWd1cmUgb3V0IHdoYXQgZmlsZSBpcyBiZWluZyBpbXBvcnRlZC5cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlKGV4cHIudmFsdWUubW9kdWxlTmFtZSEsIG9yaWdpbi5maWxlTmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhZGRpbmcgYW4gaW1wb3J0IGZyb20gYG9yaWdpbmAgdG8gdGhlIHNvdXJjZS1maWxlIGNvcnJlc3BvbmRpbmcgdG8gYGV4cHJgIHdvdWxkXG4gICAqIGNyZWF0ZSBhIGN5Y2xpYyBpbXBvcnQuXG4gICAqXG4gICAqIEByZXR1cm5zIGEgYEN5Y2xlYCBvYmplY3QgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLCBvdGhlcndpc2UgYG51bGxgLlxuICAgKi9cbiAgcHJpdmF0ZSBfY2hlY2tGb3JDeWNsaWNJbXBvcnQocmVmOiBSZWZlcmVuY2UsIGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IEN5Y2xlXG4gICAgICB8bnVsbCB7XG4gICAgY29uc3QgaW1wb3J0ZWRGaWxlID0gdGhpcy5fZXhwcmVzc2lvblRvSW1wb3J0ZWRGaWxlKGV4cHIsIG9yaWdpbik7XG4gICAgaWYgKGltcG9ydGVkRmlsZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGltcG9ydCBpcyBsZWdhbC5cbiAgICByZXR1cm4gdGhpcy5jeWNsZUFuYWx5emVyLndvdWxkQ3JlYXRlQ3ljbGUob3JpZ2luLCBpbXBvcnRlZEZpbGUpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVjb3JkU3ludGhldGljSW1wb3J0KGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGltcG9ydGVkID0gdGhpcy5fZXhwcmVzc2lvblRvSW1wb3J0ZWRGaWxlKGV4cHIsIG9yaWdpbik7XG4gICAgaWYgKGltcG9ydGVkID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jeWNsZUFuYWx5emVyLnJlY29yZFN5bnRoZXRpY0ltcG9ydChvcmlnaW4sIGltcG9ydGVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIHRoZSB1cmwgb2YgYSByZXNvdXJjZSByZWxhdGl2ZSB0byB0aGUgZmlsZSB0aGF0IGNvbnRhaW5zIHRoZSByZWZlcmVuY2UgdG8gaXQuXG4gICAqXG4gICAqIFRocm93cyBhIEZhdGFsRGlhZ25vc3RpY0Vycm9yIHdoZW4gdW5hYmxlIHRvIHJlc29sdmUgdGhlIGZpbGUuXG4gICAqL1xuICBwcml2YXRlIF9yZXNvbHZlUmVzb3VyY2VPclRocm93KFxuICAgICAgZmlsZTogc3RyaW5nLCBiYXNlUGF0aDogc3RyaW5nLCBub2RlRm9yRXJyb3I6IHRzLk5vZGUsXG4gICAgICByZXNvdXJjZVR5cGU6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzKTogc3RyaW5nIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShmaWxlLCBiYXNlUGF0aCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbGV0IGVycm9yVGV4dDogc3RyaW5nO1xuICAgICAgc3dpdGNoIChyZXNvdXJjZVR5cGUpIHtcbiAgICAgICAgY2FzZSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5UZW1wbGF0ZTpcbiAgICAgICAgICBlcnJvclRleHQgPSBgQ291bGQgbm90IGZpbmQgdGVtcGxhdGUgZmlsZSAnJHtmaWxlfScuYDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBSZXNvdXJjZVR5cGVGb3JEaWFnbm9zdGljcy5TdHlsZXNoZWV0RnJvbVRlbXBsYXRlOlxuICAgICAgICAgIGVycm9yVGV4dCA9IGBDb3VsZCBub3QgZmluZCBzdHlsZXNoZWV0IGZpbGUgJyR7ZmlsZX0nIGxpbmtlZCBmcm9tIHRoZSB0ZW1wbGF0ZS5gO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tRGVjb3JhdG9yOlxuICAgICAgICAgIGVycm9yVGV4dCA9IGBDb3VsZCBub3QgZmluZCBzdHlsZXNoZWV0IGZpbGUgJyR7ZmlsZX0nLmA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuQ09NUE9ORU5UX1JFU09VUkNFX05PVF9GT1VORCwgbm9kZUZvckVycm9yLCBlcnJvclRleHQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RUZW1wbGF0ZVN0eWxlVXJscyh0ZW1wbGF0ZTogUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlKTogU3R5bGVVcmxNZXRhW10ge1xuICAgIGlmICh0ZW1wbGF0ZS5zdHlsZVVybHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlRm9yRXJyb3IgPSBnZXRUZW1wbGF0ZURlY2xhcmF0aW9uTm9kZUZvckVycm9yKHRlbXBsYXRlLmRlY2xhcmF0aW9uKTtcbiAgICByZXR1cm4gdGVtcGxhdGUuc3R5bGVVcmxzLm1hcChcbiAgICAgICAgdXJsID0+ICh7dXJsLCBzb3VyY2U6IFJlc291cmNlVHlwZUZvckRpYWdub3N0aWNzLlN0eWxlc2hlZXRGcm9tVGVtcGxhdGUsIG5vZGVGb3JFcnJvcn0pKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZVJhbmdlKHRlbXBsYXRlRXhwcjogdHMuRXhwcmVzc2lvbikge1xuICBjb25zdCBzdGFydFBvcyA9IHRlbXBsYXRlRXhwci5nZXRTdGFydCgpICsgMTtcbiAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPVxuICAgICAgdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24odGVtcGxhdGVFeHByLmdldFNvdXJjZUZpbGUoKSwgc3RhcnRQb3MpO1xuICByZXR1cm4ge1xuICAgIHN0YXJ0UG9zLFxuICAgIHN0YXJ0TGluZTogbGluZSxcbiAgICBzdGFydENvbDogY2hhcmFjdGVyLFxuICAgIGVuZFBvczogdGVtcGxhdGVFeHByLmdldEVuZCgpIC0gMSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc291cmNlTWFwVXJsKHJlc291cmNlVXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIXRzU291cmNlTWFwQnVnMjkzMDBGaXhlZCgpKSB7XG4gICAgLy8gQnkgcmVtb3ZpbmcgdGhlIHRlbXBsYXRlIFVSTCB3ZSBhcmUgdGVsbGluZyB0aGUgdHJhbnNsYXRvciBub3QgdG8gdHJ5IHRvXG4gICAgLy8gbWFwIHRoZSBleHRlcm5hbCBzb3VyY2UgZmlsZSB0byB0aGUgZ2VuZXJhdGVkIGNvZGUsIHNpbmNlIHRoZSB2ZXJzaW9uXG4gICAgLy8gb2YgVFMgdGhhdCBpcyBydW5uaW5nIGRvZXMgbm90IHN1cHBvcnQgaXQuXG4gICAgcmV0dXJuICcnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZXNvdXJjZVVybDtcbiAgfVxufVxuXG4vKiogRGV0ZXJtaW5lcyBpZiB0aGUgcmVzdWx0IG9mIGFuIGV2YWx1YXRpb24gaXMgYSBzdHJpbmcgYXJyYXkuICovXG5mdW5jdGlvbiBpc1N0cmluZ0FycmF5KHJlc29sdmVkVmFsdWU6IFJlc29sdmVkVmFsdWUpOiByZXNvbHZlZFZhbHVlIGlzIHN0cmluZ1tdIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkocmVzb2x2ZWRWYWx1ZSkgJiYgcmVzb2x2ZWRWYWx1ZS5ldmVyeShlbGVtID0+IHR5cGVvZiBlbGVtID09PSAnc3RyaW5nJyk7XG59XG5cbi8qKiBEZXRlcm1pbmVzIHRoZSBub2RlIHRvIHVzZSBmb3IgZGVidWdnaW5nIHB1cnBvc2VzIGZvciB0aGUgZ2l2ZW4gVGVtcGxhdGVEZWNsYXJhdGlvbi4gKi9cbmZ1bmN0aW9uIGdldFRlbXBsYXRlRGVjbGFyYXRpb25Ob2RlRm9yRXJyb3IoZGVjbGFyYXRpb246IFRlbXBsYXRlRGVjbGFyYXRpb24pOiB0cy5Ob2RlIHtcbiAgLy8gVE9ETyh6YXJlbmQpOiBDaGFuZ2UgdGhpcyB0byBpZi9lbHNlIHdoZW4gdGhhdCBpcyBjb21wYXRpYmxlIHdpdGggZzMuIFRoaXMgdXNlcyBhIHN3aXRjaFxuICAvLyBiZWNhdXNlIGlmL2Vsc2UgZmFpbHMgdG8gY29tcGlsZSBvbiBnMy4gVGhhdCBpcyBiZWNhdXNlIGczIGNvbXBpbGVzIHRoaXMgaW4gbm9uLXN0cmljdCBtb2RlXG4gIC8vIHdoZXJlIHR5cGUgaW5mZXJlbmNlIGRvZXMgbm90IHdvcmsgY29ycmVjdGx5LlxuICBzd2l0Y2ggKGRlY2xhcmF0aW9uLmlzSW5saW5lKSB7XG4gICAgY2FzZSB0cnVlOlxuICAgICAgcmV0dXJuIGRlY2xhcmF0aW9uLmV4cHJlc3Npb247XG4gICAgY2FzZSBmYWxzZTpcbiAgICAgIHJldHVybiBkZWNsYXJhdGlvbi50ZW1wbGF0ZVVybEV4cHJlc3Npb247XG4gIH1cbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGVtcGxhdGUgd2hpY2ggd2FzIGV4dHJhY3RlZCBkdXJpbmcgcGFyc2luZy5cbiAqXG4gKiBUaGlzIGNvbnRhaW5zIHRoZSBhY3R1YWwgcGFyc2VkIHRlbXBsYXRlIGFzIHdlbGwgYXMgYW55IG1ldGFkYXRhIGNvbGxlY3RlZCBkdXJpbmcgaXRzIHBhcnNpbmcsXG4gKiBzb21lIG9mIHdoaWNoIG1pZ2h0IGJlIHVzZWZ1bCBmb3IgcmUtcGFyc2luZyB0aGUgdGVtcGxhdGUgd2l0aCBkaWZmZXJlbnQgb3B0aW9ucy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRDb21wb25lbnRUZW1wbGF0ZSBleHRlbmRzIFBhcnNlZFRlbXBsYXRlIHtcbiAgLyoqXG4gICAqIFRydWUgaWYgdGhlIG9yaWdpbmFsIHRlbXBsYXRlIHdhcyBzdG9yZWQgaW5saW5lO1xuICAgKiBGYWxzZSBpZiB0aGUgdGVtcGxhdGUgd2FzIGluIGFuIGV4dGVybmFsIGZpbGUuXG4gICAqL1xuICBpc0lubGluZTogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIHRlbXBsYXRlIEFTVCwgcGFyc2VkIGluIGEgbWFubmVyIHdoaWNoIHByZXNlcnZlcyBzb3VyY2UgbWFwIGluZm9ybWF0aW9uIGZvciBkaWFnbm9zdGljcy5cbiAgICpcbiAgICogTm90IHVzZWZ1bCBmb3IgZW1pdC5cbiAgICovXG4gIGRpYWdOb2RlczogVG1wbEFzdE5vZGVbXTtcblxuICAvKipcbiAgICogVGhlIGBQYXJzZVNvdXJjZUZpbGVgIGZvciB0aGUgdGVtcGxhdGUuXG4gICAqL1xuICBmaWxlOiBQYXJzZVNvdXJjZUZpbGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlIGV4dGVuZHMgUGFyc2VkQ29tcG9uZW50VGVtcGxhdGUge1xuICBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gIGRlY2xhcmF0aW9uOiBUZW1wbGF0ZURlY2xhcmF0aW9uO1xufVxuXG4vKipcbiAqIENvbW1vbiBmaWVsZHMgZXh0cmFjdGVkIGZyb20gdGhlIGRlY2xhcmF0aW9uIG9mIGEgdGVtcGxhdGUuXG4gKi9cbmludGVyZmFjZSBDb21tb25UZW1wbGF0ZURlY2xhcmF0aW9uIHtcbiAgcHJlc2VydmVXaGl0ZXNwYWNlczogYm9vbGVhbjtcbiAgaW50ZXJwb2xhdGlvbkNvbmZpZzogSW50ZXJwb2xhdGlvbkNvbmZpZztcbiAgdGVtcGxhdGVVcmw6IHN0cmluZztcbiAgcmVzb2x2ZWRUZW1wbGF0ZVVybDogc3RyaW5nO1xuICBzb3VyY2VNYXBVcmw6IHN0cmluZztcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBleHRyYWN0ZWQgZnJvbSB0aGUgZGVjbGFyYXRpb24gb2YgYW4gaW5saW5lIHRlbXBsYXRlLlxuICovXG5pbnRlcmZhY2UgSW5saW5lVGVtcGxhdGVEZWNsYXJhdGlvbiBleHRlbmRzIENvbW1vblRlbXBsYXRlRGVjbGFyYXRpb24ge1xuICBpc0lubGluZTogdHJ1ZTtcbiAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBleHRyYWN0ZWQgZnJvbSB0aGUgZGVjbGFyYXRpb24gb2YgYW4gZXh0ZXJuYWwgdGVtcGxhdGUuXG4gKi9cbmludGVyZmFjZSBFeHRlcm5hbFRlbXBsYXRlRGVjbGFyYXRpb24gZXh0ZW5kcyBDb21tb25UZW1wbGF0ZURlY2xhcmF0aW9uIHtcbiAgaXNJbmxpbmU6IGZhbHNlO1xuICB0ZW1wbGF0ZVVybEV4cHJlc3Npb246IHRzLkV4cHJlc3Npb247XG59XG5cbi8qKlxuICogVGhlIGRlY2xhcmF0aW9uIG9mIGEgdGVtcGxhdGUgZXh0cmFjdGVkIGZyb20gYSBjb21wb25lbnQgZGVjb3JhdG9yLlxuICpcbiAqIFRoaXMgZGF0YSBpcyBleHRyYWN0ZWQgYW5kIHN0b3JlZCBzZXBhcmF0ZWx5IHRvIGZhY2lsaWF0ZSByZS1pbnRlcnByZXRpbmcgdGhlIHRlbXBsYXRlXG4gKiBkZWNsYXJhdGlvbiB3aGVuZXZlciB0aGUgY29tcGlsZXIgaXMgbm90aWZpZWQgb2YgYSBjaGFuZ2UgdG8gYSB0ZW1wbGF0ZSBmaWxlLiBXaXRoIHRoaXNcbiAqIGluZm9ybWF0aW9uLCBgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlcmAgaXMgYWJsZSB0byByZS1yZWFkIHRoZSB0ZW1wbGF0ZSBhbmQgdXBkYXRlIHRoZSBjb21wb25lbnRcbiAqIHJlY29yZCB3aXRob3V0IG5lZWRpbmcgdG8gcGFyc2UgdGhlIG9yaWdpbmFsIGRlY29yYXRvciBhZ2Fpbi5cbiAqL1xudHlwZSBUZW1wbGF0ZURlY2xhcmF0aW9uID0gSW5saW5lVGVtcGxhdGVEZWNsYXJhdGlvbnxFeHRlcm5hbFRlbXBsYXRlRGVjbGFyYXRpb247XG5cbi8qKlxuICogR2VuZXJhdGUgYSBkaWFnbm9zdGljIHJlbGF0ZWQgaW5mb3JtYXRpb24gb2JqZWN0IHRoYXQgZGVzY3JpYmVzIGEgcG90ZW50aWFsIGN5Y2xpYyBpbXBvcnQgcGF0aC5cbiAqL1xuZnVuY3Rpb24gbWFrZUN5Y2xpY0ltcG9ydEluZm8oXG4gICAgcmVmOiBSZWZlcmVuY2UsIHR5cGU6IHN0cmluZywgY3ljbGU6IEN5Y2xlKTogdHMuRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbiB7XG4gIGNvbnN0IG5hbWUgPSByZWYuZGVidWdOYW1lIHx8ICcodW5rbm93biknO1xuICBjb25zdCBwYXRoID0gY3ljbGUuZ2V0UGF0aCgpLm1hcChzZiA9PiBzZi5maWxlTmFtZSkuam9pbignIC0+ICcpO1xuICBjb25zdCBtZXNzYWdlID1cbiAgICAgIGBUaGUgJHt0eXBlfSAnJHtuYW1lfScgaXMgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYnV0IGltcG9ydGluZyBpdCB3b3VsZCBjcmVhdGUgYSBjeWNsZTogYDtcbiAgcmV0dXJuIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24ocmVmLm5vZGUsIG1lc3NhZ2UgKyBwYXRoKTtcbn1cbiJdfQ==