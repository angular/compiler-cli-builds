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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/inheritance", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/typecheck/diagnostics", "@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
    var inheritance_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/inheritance");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/diagnostics");
    var ts_source_map_bug_29300_1 = require("@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300");
    var diagnostics_3 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
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
        function ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds, enableI18nLegacyMessageIdFormat, i18nNormalizeLineEndingsInICUs, moduleResolver, cycleAnalyzer, refEmitter, defaultImportRecorder, depTracker, injectableRegistry, annotateForClosureCompiler) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaRegistry = metaRegistry;
            this.metaReader = metaReader;
            this.scopeReader = scopeReader;
            this.scopeRegistry = scopeRegistry;
            this.isCore = isCore;
            this.resourceLoader = resourceLoader;
            this.rootDirs = rootDirs;
            this.defaultPreserveWhitespaces = defaultPreserveWhitespaces;
            this.i18nUseExternalIds = i18nUseExternalIds;
            this.enableI18nLegacyMessageIdFormat = enableI18nLegacyMessageIdFormat;
            this.i18nNormalizeLineEndingsInICUs = i18nNormalizeLineEndingsInICUs;
            this.moduleResolver = moduleResolver;
            this.cycleAnalyzer = cycleAnalyzer;
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
            // Convert a styleUrl string into a Promise to preload it.
            var resolveStyleUrl = function (styleUrl) {
                var resourceUrl = _this.resourceLoader.resolve(styleUrl, containingFile);
                var promise = _this.resourceLoader.preload(resourceUrl);
                return promise || Promise.resolve();
            };
            // A Promise that waits for the template and all <link>ed styles within it to be preloaded.
            var templateAndTemplateStyleResources = this._preloadAndParseTemplate(node, decorator, component, containingFile).then(function (template) {
                if (template === null) {
                    return undefined;
                }
                else {
                    return Promise.all(template.styleUrls.map(resolveStyleUrl)).then(function () { return undefined; });
                }
            });
            // Extract all the styleUrls in the decorator.
            var styleUrls = this._extractStyleUrls(component, []);
            if (styleUrls === null) {
                // A fast path exists if there are no styleUrls, to just wait for
                // templateAndTemplateStyleResources.
                return templateAndTemplateStyleResources;
            }
            else {
                // Wait for both the template and all styleUrl resources to resolve.
                return Promise.all(tslib_1.__spread([templateAndTemplateStyleResources], styleUrls.map(resolveStyleUrl)))
                    .then(function () { return undefined; });
            }
        };
        ComponentDecoratorHandler.prototype.analyze = function (node, decorator, flags) {
            var e_1, _a;
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
            var component = directiveResult.decorator, metadata = directiveResult.metadata;
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
                // The template was not already parsed. Either there's a templateUrl, or an inline template.
                if (component.has('templateUrl')) {
                    var templateUrlExpr = component.get('templateUrl');
                    var templateUrl = this.evaluator.evaluate(templateUrlExpr);
                    if (typeof templateUrl !== 'string') {
                        throw diagnostics_3.createValueHasWrongTypeError(templateUrlExpr, templateUrl, 'templateUrl must be a string');
                    }
                    var resourceUrl = this.resourceLoader.resolve(templateUrl, containingFile);
                    template = this._extractExternalTemplate(node, component, templateUrlExpr, resourceUrl);
                }
                else {
                    // Expect an inline template to be present.
                    template = this._extractInlineTemplate(node, decorator, component, containingFile);
                }
            }
            var diagnostics = undefined;
            if (template.errors !== undefined) {
                // If there are any template parsing errors, convert them to `ts.Diagnostic`s for display.
                var id_1 = diagnostics_2.getTemplateId(node);
                diagnostics = template.errors.map(function (error) {
                    var span = error.span;
                    if (span.start.offset === span.end.offset) {
                        // Template errors can contain zero-length spans, if the error occurs at a single point.
                        // However, TypeScript does not handle displaying a zero-length diagnostic very well, so
                        // increase the ending offset by 1 for such errors, to ensure the position is shown in the
                        // diagnostic.
                        span.end.offset++;
                    }
                    return diagnostics_2.makeTemplateDiagnostic(id_1, template.sourceMapping, span, ts.DiagnosticCategory.Error, diagnostics_1.ngErrorCode(diagnostics_1.ErrorCode.TEMPLATE_PARSE_ERROR), error.msg);
                });
            }
            // Figure out the set of styles. The ordering here is important: external resources (styleUrls)
            // precede inline styles, and styles defined in the template override styles defined in the
            // component.
            var styles = null;
            var styleUrls = this._extractStyleUrls(component, template.styleUrls);
            if (styleUrls !== null) {
                if (styles === null) {
                    styles = [];
                }
                try {
                    for (var styleUrls_1 = tslib_1.__values(styleUrls), styleUrls_1_1 = styleUrls_1.next(); !styleUrls_1_1.done; styleUrls_1_1 = styleUrls_1.next()) {
                        var styleUrl = styleUrls_1_1.value;
                        var resourceUrl = this.resourceLoader.resolve(styleUrl, containingFile);
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
            }
            if (component.has('styles')) {
                var litStyles = directive_1.parseFieldArrayValue(component, 'styles', this.evaluator);
                if (litStyles !== null) {
                    if (styles === null) {
                        styles = litStyles;
                    }
                    else {
                        styles.push.apply(styles, tslib_1.__spread(litStyles));
                    }
                }
            }
            if (template.styles.length > 0) {
                if (styles === null) {
                    styles = template.styles;
                }
                else {
                    styles.push.apply(styles, tslib_1.__spread(template.styles));
                }
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
                    meta: tslib_1.__assign(tslib_1.__assign({}, metadata), { template: {
                            nodes: template.emitNodes,
                            ngContentSelectors: template.ngContentSelectors,
                        }, encapsulation: encapsulation, interpolation: template.interpolation, styles: styles || [], 
                        // These will be replaced during the compilation step, after all `NgModule`s have been
                        // analyzed and the full compilation scope for the component can be realized.
                        animations: animations, viewProviders: wrappedViewProviders, i18nUseExternalIds: this.i18nUseExternalIds, relativeContextFilePath: relativeContextFilePath }),
                    typeCheckMeta: metadata_1.extractDirectiveTypeCheckMeta(node, metadata.inputs, this.reflector),
                    metadataStmt: metadata_2.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore, this.annotateForClosureCompiler),
                    template: template,
                    providersRequiringFactory: providersRequiringFactory,
                    viewProvidersRequiringFactory: viewProvidersRequiringFactory,
                },
                diagnostics: diagnostics,
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
            this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign({ ref: ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.meta.inputs, outputs: analysis.meta.outputs, queries: analysis.meta.queries.map(function (query) { return query.propertyName; }), isComponent: true, baseClass: analysis.baseClass }, analysis.typeCheckMeta));
            this.injectableRegistry.registerInjectable(node);
        };
        ComponentDecoratorHandler.prototype.index = function (context, node, analysis) {
            var e_2, _a;
            var scope = this.scopeReader.getScopeForComponent(node);
            var selector = analysis.meta.selector;
            var matcher = new compiler_1.SelectorMatcher();
            if (scope === 'error') {
                // Don't bother indexing components which had erroneous scopes.
                return null;
            }
            if (scope !== null) {
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
            var e_3, _a, e_4, _b;
            if (!ts.isClassDeclaration(node)) {
                return;
            }
            var matcher = new compiler_1.SelectorMatcher();
            var pipes = new Map();
            var schemas = [];
            var scope = this.scopeReader.getScopeForComponent(node);
            if (scope === 'error') {
                // Don't type-check components that had errors in their scopes.
                return;
            }
            if (scope !== null) {
                try {
                    for (var _c = tslib_1.__values(scope.compilation.directives), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var meta_1 = _d.value;
                        if (meta_1.selector !== null) {
                            var extMeta = inheritance_1.flattenInheritedDirectiveMetadata(this.metaReader, meta_1.ref);
                            matcher.addSelectables(compiler_1.CssSelector.parse(meta_1.selector), extMeta);
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                try {
                    for (var _e = tslib_1.__values(scope.compilation.pipes), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var _g = _f.value, name_1 = _g.name, ref = _g.ref;
                        if (!ts.isClassDeclaration(ref.node)) {
                            throw new Error("Unexpected non-class declaration " + ts.SyntaxKind[ref.node.kind] + " for pipe " + ref.debugName);
                        }
                        pipes.set(name_1, ref);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                schemas = scope.schemas;
            }
            var binder = new compiler_1.R3TargetBinder(matcher);
            ctx.addTemplate(new imports_1.Reference(node), binder, meta.template.diagNodes, pipes, schemas, meta.template.sourceMapping, meta.template.file);
        };
        ComponentDecoratorHandler.prototype.resolve = function (node, analysis) {
            var e_5, _a, e_6, _b, e_7, _c, e_8, _d;
            var _this = this;
            var context = node.getSourceFile();
            // Check whether this component was registered with an NgModule. If so, it should be compiled
            // under that module's compilation scope.
            var scope = this.scopeReader.getScopeForComponent(node);
            var metadata = analysis.meta;
            var data = {
                directives: EMPTY_ARRAY,
                pipes: EMPTY_MAP,
                wrapDirectivesAndPipesInClosure: false,
            };
            if (scope !== null && scope !== 'error') {
                // Replace the empty components and directives from the analyze() step with a fully expanded
                // scope. This is possible now because during resolve() the whole compilation unit has been
                // fully analyzed.
                //
                // First it needs to be determined if actually importing the directives/pipes used in the
                // template would create a cycle. Currently ngtsc refuses to generate cycles, so an option
                // known as "remote scoping" is used if a cycle would be created. In remote scoping, the
                // module file sets the directives/pipes on the ɵcmp of the component, without
                // requiring new imports (but also in a way that breaks tree shaking).
                //
                // Determining this is challenging, because the TemplateDefinitionBuilder is responsible for
                // matching directives and pipes in the template; however, that doesn't run until the actual
                // compile() step. It's not possible to run template compilation sooner as it requires the
                // ConstantPool for the overall file being compiled (which isn't available until the transform
                // step).
                //
                // Instead, directives/pipes are matched independently here, using the R3TargetBinder. This is
                // an alternative implementation of template matching which is used for template type-checking
                // and will eventually replace matching in the TemplateDefinitionBuilder.
                // Set up the R3TargetBinder, as well as a 'directives' array and a 'pipes' map that are later
                // fed to the TemplateDefinitionBuilder. First, a SelectorMatcher is constructed to match
                // directives that are in scope.
                var matcher = new compiler_1.SelectorMatcher();
                var directives = [];
                try {
                    for (var _e = tslib_1.__values(scope.compilation.directives), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var dir = _f.value;
                        var ref = dir.ref, selector = dir.selector;
                        if (selector !== null) {
                            var expression = this.refEmitter.emit(ref, context);
                            directives.push({ selector: selector, expression: expression });
                            matcher.addSelectables(compiler_1.CssSelector.parse(selector), tslib_1.__assign(tslib_1.__assign({}, dir), { expression: expression }));
                        }
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                var pipes_1 = new Map();
                try {
                    for (var _g = tslib_1.__values(scope.compilation.pipes), _h = _g.next(); !_h.done; _h = _g.next()) {
                        var pipe = _h.value;
                        pipes_1.set(pipe.name, this.refEmitter.emit(pipe.ref, context));
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
                // Next, the component template AST is bound using the R3TargetBinder. This produces an
                // BoundTarget, which is similar to a ts.TypeChecker.
                var binder = new compiler_1.R3TargetBinder(matcher);
                var bound = binder.bind({ template: metadata.template.nodes });
                // The BoundTarget knows which directives and pipes matched the template.
                var usedDirectives = bound.getUsedDirectives();
                var usedPipes = bound.getUsedPipes().map(function (name) { return pipes_1.get(name); });
                // Scan through the directives/pipes actually used in the template and check whether any
                // import which needs to be generated would create a cycle.
                var cycleDetected = usedDirectives.some(function (dir) { return _this._isCyclicImport(dir.expression, context); }) ||
                    usedPipes.some(function (pipe) { return _this._isCyclicImport(pipe, context); });
                if (!cycleDetected) {
                    try {
                        // No cycle was detected. Record the imports that need to be created in the cycle detector
                        // so that future cyclic import checks consider their production.
                        for (var usedDirectives_1 = tslib_1.__values(usedDirectives), usedDirectives_1_1 = usedDirectives_1.next(); !usedDirectives_1_1.done; usedDirectives_1_1 = usedDirectives_1.next()) {
                            var expression = usedDirectives_1_1.value.expression;
                            this._recordSyntheticImport(expression, context);
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (usedDirectives_1_1 && !usedDirectives_1_1.done && (_c = usedDirectives_1.return)) _c.call(usedDirectives_1);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                    try {
                        for (var usedPipes_1 = tslib_1.__values(usedPipes), usedPipes_1_1 = usedPipes_1.next(); !usedPipes_1_1.done; usedPipes_1_1 = usedPipes_1.next()) {
                            var pipe = usedPipes_1_1.value;
                            this._recordSyntheticImport(pipe, context);
                        }
                    }
                    catch (e_8_1) { e_8 = { error: e_8_1 }; }
                    finally {
                        try {
                            if (usedPipes_1_1 && !usedPipes_1_1.done && (_d = usedPipes_1.return)) _d.call(usedPipes_1);
                        }
                        finally { if (e_8) throw e_8.error; }
                    }
                    // Check whether the directive/pipe arrays in ɵcmp need to be wrapped in closures.
                    // This is required if any directive/pipe reference is to a declaration in the same file but
                    // declared after this component.
                    var wrapDirectivesAndPipesInClosure = usedDirectives.some(function (dir) { return util_1.isExpressionForwardReference(dir.expression, node.name, context); }) ||
                        usedPipes.some(function (pipe) { return util_1.isExpressionForwardReference(pipe, node.name, context); });
                    // Actual compilation still uses the full scope, not the narrowed scope determined by
                    // R3TargetBinder. This is a hedge against potential issues with the R3TargetBinder - right
                    // now the TemplateDefinitionBuilder is the "source of truth" for which directives/pipes are
                    // actually used (though the two should agree perfectly).
                    //
                    // TODO(alxhub): switch TemplateDefinitionBuilder over to using R3TargetBinder directly.
                    data.directives = directives;
                    data.pipes = pipes_1;
                    data.wrapDirectivesAndPipesInClosure = wrapDirectivesAndPipesInClosure;
                }
                else {
                    // Declaring the directiveDefs/pipeDefs arrays directly would require imports that would
                    // create a cycle. Instead, mark this component as requiring remote scoping, so that the
                    // NgModule file will take care of setting the directives for the component.
                    this.scopeRegistry.setComponentAsRequiringRemoteScoping(node);
                }
            }
            var diagnostics = [];
            if (analysis.providersRequiringFactory !== null &&
                analysis.meta.providers instanceof compiler_1.WrappedNodeExpr) {
                var providerDiagnostics = diagnostics_3.getProviderDiagnostics(analysis.providersRequiringFactory, analysis.meta.providers.node, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(providerDiagnostics));
            }
            if (analysis.viewProvidersRequiringFactory !== null &&
                analysis.meta.viewProviders instanceof compiler_1.WrappedNodeExpr) {
                var viewProviderDiagnostics = diagnostics_3.getProviderDiagnostics(analysis.viewProvidersRequiringFactory, analysis.meta.viewProviders.node, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(viewProviderDiagnostics));
            }
            var directiveDiagnostics = diagnostics_3.getDirectiveDiagnostics(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, 'Component');
            if (directiveDiagnostics !== null) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(directiveDiagnostics));
            }
            if (diagnostics.length > 0) {
                return { diagnostics: diagnostics };
            }
            return { data: data };
        };
        ComponentDecoratorHandler.prototype.compile = function (node, analysis, resolution, pool) {
            var meta = tslib_1.__assign(tslib_1.__assign({}, analysis.meta), resolution);
            var res = compiler_1.compileComponentFromMetadata(meta, pool, compiler_1.makeBindingParser());
            var factoryRes = factory_1.compileNgFactoryDefField(tslib_1.__assign(tslib_1.__assign({}, meta), { injectFn: compiler_1.Identifiers.directiveInject, target: compiler_1.R3FactoryTarget.Component }));
            if (analysis.metadataStmt !== null) {
                factoryRes.statements.push(analysis.metadataStmt);
            }
            return [
                factoryRes, {
                    name: 'ɵcmp',
                    initializer: res.expression,
                    statements: [],
                    type: res.type,
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
                    throw diagnostics_3.createValueHasWrongTypeError(expr, value, field + " must be a member of " + enumSymbolName + " enum from @angular/core");
                }
            }
            return resolved;
        };
        ComponentDecoratorHandler.prototype._extractStyleUrls = function (component, extraUrls) {
            if (!component.has('styleUrls')) {
                return extraUrls.length > 0 ? extraUrls : null;
            }
            var styleUrlsExpr = component.get('styleUrls');
            var styleUrls = this.evaluator.evaluate(styleUrlsExpr);
            if (!Array.isArray(styleUrls) || !styleUrls.every(function (url) { return typeof url === 'string'; })) {
                throw diagnostics_3.createValueHasWrongTypeError(styleUrlsExpr, styleUrls, 'styleUrls must be an array of strings');
            }
            styleUrls.push.apply(styleUrls, tslib_1.__spread(extraUrls));
            return styleUrls;
        };
        ComponentDecoratorHandler.prototype._preloadAndParseTemplate = function (node, decorator, component, containingFile) {
            var _this = this;
            if (component.has('templateUrl')) {
                // Extract the templateUrl and preload it.
                var templateUrlExpr_1 = component.get('templateUrl');
                var templateUrl = this.evaluator.evaluate(templateUrlExpr_1);
                if (typeof templateUrl !== 'string') {
                    throw diagnostics_3.createValueHasWrongTypeError(templateUrlExpr_1, templateUrl, 'templateUrl must be a string');
                }
                var resourceUrl_1 = this.resourceLoader.resolve(templateUrl, containingFile);
                var templatePromise = this.resourceLoader.preload(resourceUrl_1);
                // If the preload worked, then actually load and parse the template, and wait for any style
                // URLs to resolve.
                if (templatePromise !== undefined) {
                    return templatePromise.then(function () {
                        var template = _this._extractExternalTemplate(node, component, templateUrlExpr_1, resourceUrl_1);
                        _this.preanalyzeTemplateCache.set(node, template);
                        return template;
                    });
                }
                else {
                    return Promise.resolve(null);
                }
            }
            else {
                var template = this._extractInlineTemplate(node, decorator, component, containingFile);
                this.preanalyzeTemplateCache.set(node, template);
                return Promise.resolve(template);
            }
        };
        ComponentDecoratorHandler.prototype._extractExternalTemplate = function (node, component, templateUrlExpr, resourceUrl) {
            var templateStr = this.resourceLoader.load(resourceUrl);
            if (this.depTracker !== null) {
                this.depTracker.addResourceDependency(node.getSourceFile(), file_system_1.absoluteFrom(resourceUrl));
            }
            var template = this._parseTemplate(component, templateStr, sourceMapUrl(resourceUrl), /* templateRange */ undefined, 
            /* escapedString */ false);
            return tslib_1.__assign(tslib_1.__assign({}, template), { sourceMapping: {
                    type: 'external',
                    componentClass: node,
                    node: templateUrlExpr,
                    template: templateStr,
                    templateUrl: resourceUrl,
                } });
        };
        ComponentDecoratorHandler.prototype._extractInlineTemplate = function (node, decorator, component, containingFile) {
            if (!component.has('template')) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_MISSING_TEMPLATE, reflection_1.Decorator.nodeForError(decorator), 'component is missing a template');
            }
            var templateExpr = component.get('template');
            var templateStr;
            var templateUrl = '';
            var templateRange = undefined;
            var sourceMapping;
            var escapedString = false;
            // We only support SourceMaps for inline templates that are simple string literals.
            if (ts.isStringLiteral(templateExpr) || ts.isNoSubstitutionTemplateLiteral(templateExpr)) {
                // the start and end of the `templateExpr` node includes the quotation marks, which we
                // must
                // strip
                templateRange = getTemplateRange(templateExpr);
                templateStr = templateExpr.getSourceFile().text;
                templateUrl = containingFile;
                escapedString = true;
                sourceMapping = {
                    type: 'direct',
                    node: templateExpr,
                };
            }
            else {
                var resolvedTemplate = this.evaluator.evaluate(templateExpr);
                if (typeof resolvedTemplate !== 'string') {
                    throw diagnostics_3.createValueHasWrongTypeError(templateExpr, resolvedTemplate, 'template must be a string');
                }
                templateStr = resolvedTemplate;
                sourceMapping = {
                    type: 'indirect',
                    node: templateExpr,
                    componentClass: node,
                    template: templateStr,
                };
            }
            var template = this._parseTemplate(component, templateStr, templateUrl, templateRange, escapedString);
            return tslib_1.__assign(tslib_1.__assign({}, template), { sourceMapping: sourceMapping });
        };
        ComponentDecoratorHandler.prototype._parseTemplate = function (component, templateStr, templateUrl, templateRange, escapedString) {
            var preserveWhitespaces = this.defaultPreserveWhitespaces;
            if (component.has('preserveWhitespaces')) {
                var expr = component.get('preserveWhitespaces');
                var value = this.evaluator.evaluate(expr);
                if (typeof value !== 'boolean') {
                    throw diagnostics_3.createValueHasWrongTypeError(expr, value, 'preserveWhitespaces must be a boolean');
                }
                preserveWhitespaces = value;
            }
            var interpolation = compiler_1.DEFAULT_INTERPOLATION_CONFIG;
            if (component.has('interpolation')) {
                var expr = component.get('interpolation');
                var value = this.evaluator.evaluate(expr);
                if (!Array.isArray(value) || value.length !== 2 ||
                    !value.every(function (element) { return typeof element === 'string'; })) {
                    throw diagnostics_3.createValueHasWrongTypeError(expr, value, 'interpolation must be an array with 2 elements of string type');
                }
                interpolation = compiler_1.InterpolationConfig.fromArray(value);
            }
            var _a = compiler_1.parseTemplate(templateStr, templateUrl, {
                preserveWhitespaces: preserveWhitespaces,
                interpolationConfig: interpolation,
                range: templateRange,
                escapedString: escapedString,
                enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
                i18nNormalizeLineEndingsInICUs: this.i18nNormalizeLineEndingsInICUs,
            }), errors = _a.errors, emitNodes = _a.nodes, styleUrls = _a.styleUrls, styles = _a.styles, ngContentSelectors = _a.ngContentSelectors;
            // Unfortunately, the primary parse of the template above may not contain accurate source map
            // information. If used directly, it would result in incorrect code locations in template
            // errors, etc. There are two main problems:
            //
            // 1. `preserveWhitespaces: false` annihilates the correctness of template source mapping, as
            //    the whitespace transformation changes the contents of HTML text nodes before they're
            //    parsed into Angular expressions.
            // 2. By default, the template parser strips leading trivia characters (like spaces, tabs, and
            //    newlines). This also destroys source mapping information.
            //
            // In order to guarantee the correctness of diagnostics, templates are parsed a second time with
            // the above options set to preserve source mappings.
            var diagNodes = compiler_1.parseTemplate(templateStr, templateUrl, {
                preserveWhitespaces: true,
                interpolationConfig: interpolation,
                range: templateRange,
                escapedString: escapedString,
                enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat,
                i18nNormalizeLineEndingsInICUs: this.i18nNormalizeLineEndingsInICUs,
                leadingTriviaChars: [],
            }).nodes;
            return {
                interpolation: interpolation,
                emitNodes: emitNodes,
                diagNodes: diagNodes,
                styleUrls: styleUrls,
                styles: styles,
                ngContentSelectors: ngContentSelectors,
                errors: errors,
                template: templateStr,
                templateUrl: templateUrl,
                isInline: component.has('template'),
                file: new compiler_1.ParseSourceFile(templateStr, templateUrl),
            };
        };
        ComponentDecoratorHandler.prototype._expressionToImportedFile = function (expr, origin) {
            if (!(expr instanceof compiler_1.ExternalExpr)) {
                return null;
            }
            // Figure out what file is being imported.
            return this.moduleResolver.resolveModule(expr.value.moduleName, origin.fileName);
        };
        ComponentDecoratorHandler.prototype._isCyclicImport = function (expr, origin) {
            var imported = this._expressionToImportedFile(expr, origin);
            if (imported === null) {
                return false;
            }
            // Check whether the import is legal.
            return this.cycleAnalyzer.wouldCreateCycle(origin, imported);
        };
        ComponentDecoratorHandler.prototype._recordSyntheticImport = function (expr, origin) {
            var imported = this._expressionToImportedFile(expr, origin);
            if (imported === null) {
                return;
            }
            this.cycleAnalyzer.recordSyntheticImport(origin, imported);
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK2E7SUFDL2EsK0JBQWlDO0lBR2pDLDJFQUErRTtJQUMvRSwyRUFBeUQ7SUFDekQsbUVBQWlHO0lBR2pHLHFFQUErSjtJQUMvSix3RkFBaUY7SUFDakYsdUZBQW9FO0lBQ3BFLHlFQUFtRztJQUVuRyx1RUFBOEk7SUFFOUkscUZBQWtGO0lBQ2xGLDRHQUFnRjtJQUloRiwyRkFBNEc7SUFDNUcsdUZBQTJFO0lBQzNFLG1GQUFtRDtJQUNuRCxxRkFBd0Q7SUFDeEQsNkVBQXFPO0lBRXJPLElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0lBQ2hELElBQU0sV0FBVyxHQUFVLEVBQUUsQ0FBQztJQXFDOUI7O09BRUc7SUFDSDtRQUVFLG1DQUNZLFNBQXlCLEVBQVUsU0FBMkIsRUFDOUQsWUFBOEIsRUFBVSxVQUEwQixFQUNsRSxXQUFpQyxFQUFVLGFBQXVDLEVBQ2xGLE1BQWUsRUFBVSxjQUE4QixFQUN2RCxRQUErQixFQUFVLDBCQUFtQyxFQUM1RSxrQkFBMkIsRUFBVSwrQkFBd0MsRUFDN0UsOEJBQWlELEVBQ2pELGNBQThCLEVBQVUsYUFBNEIsRUFDcEUsVUFBNEIsRUFBVSxxQkFBNEMsRUFDbEYsVUFBa0MsRUFDbEMsa0JBQTJDLEVBQzNDLDBCQUFtQztZQVhuQyxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzlELGlCQUFZLEdBQVosWUFBWSxDQUFrQjtZQUFVLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQ2xFLGdCQUFXLEdBQVgsV0FBVyxDQUFzQjtZQUFVLGtC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QUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILGdDQUFDO0lBQUQsQ0FBQyxBQXZ4QkQsSUF1eEJDO0lBdnhCWSw4REFBeUI7SUF5eEJ0QyxTQUFTLGdCQUFnQixDQUFDLFlBQTJCO1FBQ25ELElBQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkMsSUFBQSxLQUNGLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLEVBQUUsUUFBUSxDQUFDLEVBRHJFLElBQUksVUFBQSxFQUFFLFNBQVMsZUFDc0QsQ0FBQztRQUM3RSxPQUFPO1lBQ0wsUUFBUSxVQUFBO1lBQ1IsU0FBUyxFQUFFLElBQUk7WUFDZixRQUFRLEVBQUUsU0FBUztZQUNuQixNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUM7U0FDbEMsQ0FBQztJQUNKLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxXQUFtQjtRQUN2QyxJQUFJLENBQUMsa0RBQXdCLEVBQUUsRUFBRTtZQUMvQiwyRUFBMkU7WUFDM0Usd0VBQXdFO1lBQ3hFLDZDQUE2QztZQUM3QyxPQUFPLEVBQUUsQ0FBQztTQUNYO2FBQU07WUFDTCxPQUFPLFdBQVcsQ0FBQztTQUNwQjtJQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBDb25zdGFudFBvb2wsIENzc1NlbGVjdG9yLCBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgSWRlbnRpZmllcnMsIEludGVycG9sYXRpb25Db25maWcsIExleGVyUmFuZ2UsIG1ha2VCaW5kaW5nUGFyc2VyLCBQYXJzZUVycm9yLCBQYXJzZVNvdXJjZUZpbGUsIHBhcnNlVGVtcGxhdGUsIFBhcnNlVGVtcGxhdGVPcHRpb25zLCBSM0NvbXBvbmVudE1ldGFkYXRhLCBSM0ZhY3RvcnlUYXJnZXQsIFIzVGFyZ2V0QmluZGVyLCBTY2hlbWFNZXRhZGF0YSwgU2VsZWN0b3JNYXRjaGVyLCBTdGF0ZW1lbnQsIFRtcGxBc3ROb2RlLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL2N5Y2xlcyc7XG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3IsIG5nRXJyb3JDb2RlfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2Fic29sdXRlRnJvbSwgcmVsYXRpdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyLCBNb2R1bGVSZXNvbHZlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGVwZW5kZW5jeVRyYWNrZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge0luZGV4aW5nQ29udGV4dH0gZnJvbSAnLi4vLi4vaW5kZXhlcic7XG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIERpcmVjdGl2ZVR5cGVDaGVja01ldGEsIGV4dHJhY3REaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7ZmxhdHRlbkluaGVyaXRlZERpcmVjdGl2ZU1ldGFkYXRhfSBmcm9tICcuLi8uLi9tZXRhZGF0YS9zcmMvaW5oZXJpdGFuY2UnO1xuaW1wb3J0IHtFbnVtVmFsdWUsIFBhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJGbGFncywgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrL2FwaSc7XG5pbXBvcnQge2dldFRlbXBsYXRlSWQsIG1ha2VUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9kaWFnbm9zdGljcyc7XG5pbXBvcnQge3RzU291cmNlTWFwQnVnMjkzMDBGaXhlZH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHNfc291cmNlX21hcF9idWdfMjkzMDAnO1xuaW1wb3J0IHtTdWJzZXRPZktleXN9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1Jlc291cmNlTG9hZGVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge2NyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IsIGdldERpcmVjdGl2ZURpYWdub3N0aWNzLCBnZXRQcm92aWRlckRpYWdub3N0aWNzfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhLCBwYXJzZUZpZWxkQXJyYXlWYWx1ZX0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHtjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmaW5kQW5ndWxhckRlY29yYXRvciwgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSwgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgbWFrZUR1cGxpY2F0ZURlY2xhcmF0aW9uRXJyb3IsIHJlYWRCYXNlQ2xhc3MsIHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LCB1bndyYXBFeHByZXNzaW9uLCB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9NQVAgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcbmNvbnN0IEVNUFRZX0FSUkFZOiBhbnlbXSA9IFtdO1xuXG4vKipcbiAqIFRoZXNlIGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgYXJlIHVwZGF0ZWQgaW4gdGhlIGByZXNvbHZlYCBwaGFzZS5cbiAqXG4gKiBUaGUgYGtleW9mIFIzQ29tcG9uZW50TWV0YWRhdGEgJmAgY29uZGl0aW9uIGVuc3VyZXMgdGhhdCBvbmx5IGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgY2FuXG4gKiBiZSBpbmNsdWRlZCBoZXJlLlxuICovXG5leHBvcnQgdHlwZSBDb21wb25lbnRNZXRhZGF0YVJlc29sdmVkRmllbGRzID1cbiAgICBTdWJzZXRPZktleXM8UjNDb21wb25lbnRNZXRhZGF0YSwgJ2RpcmVjdGl2ZXMnfCdwaXBlcyd8J3dyYXBEaXJlY3RpdmVzQW5kUGlwZXNJbkNsb3N1cmUnPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRBbmFseXNpc0RhdGEge1xuICAvKipcbiAgICogYG1ldGFgIGluY2x1ZGVzIHRob3NlIGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgd2hpY2ggYXJlIGNhbGN1bGF0ZWQgYXQgYGFuYWx5emVgIHRpbWVcbiAgICogKG5vdCBkdXJpbmcgcmVzb2x2ZSkuXG4gICAqL1xuICBtZXRhOiBPbWl0PFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuICBiYXNlQ2xhc3M6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPnwnZHluYW1pYyd8bnVsbDtcbiAgdHlwZUNoZWNrTWV0YTogRGlyZWN0aXZlVHlwZUNoZWNrTWV0YTtcbiAgdGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcblxuICAvKipcbiAgICogUHJvdmlkZXJzIGV4dHJhY3RlZCBmcm9tIHRoZSBgcHJvdmlkZXJzYCBmaWVsZCBvZiB0aGUgY29tcG9uZW50IGFubm90YXRpb24gd2hpY2ggd2lsbCByZXF1aXJlXG4gICAqIGFuIEFuZ3VsYXIgZmFjdG9yeSBkZWZpbml0aW9uIGF0IHJ1bnRpbWUuXG4gICAqL1xuICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsO1xuXG4gIC8qKlxuICAgKiBQcm92aWRlcnMgZXh0cmFjdGVkIGZyb20gdGhlIGB2aWV3UHJvdmlkZXJzYCBmaWVsZCBvZiB0aGUgY29tcG9uZW50IGFubm90YXRpb24gd2hpY2ggd2lsbFxuICAgKiByZXF1aXJlIGFuIEFuZ3VsYXIgZmFjdG9yeSBkZWZpbml0aW9uIGF0IHJ1bnRpbWUuXG4gICAqL1xuICB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcbn1cblxuZXhwb3J0IHR5cGUgQ29tcG9uZW50UmVzb2x1dGlvbkRhdGEgPSBQaWNrPFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuXG4vKipcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCB3aGljaCBoYW5kbGVzIHRoZSBgQENvbXBvbmVudGAgYW5ub3RhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudERlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8RGVjb3JhdG9yLCBDb21wb25lbnRBbmFseXNpc0RhdGEsIENvbXBvbmVudFJlc29sdXRpb25EYXRhPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICAgIHByaXZhdGUgbWV0YVJlZ2lzdHJ5OiBNZXRhZGF0YVJlZ2lzdHJ5LCBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLFxuICAgICAgcHJpdmF0ZSBzY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIsIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sIHByaXZhdGUgcmVzb3VyY2VMb2FkZXI6IFJlc291cmNlTG9hZGVyLFxuICAgICAgcHJpdmF0ZSByb290RGlyczogUmVhZG9ubHlBcnJheTxzdHJpbmc+LCBwcml2YXRlIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBpMThuVXNlRXh0ZXJuYWxJZHM6IGJvb2xlYW4sIHByaXZhdGUgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzOiBib29sZWFufHVuZGVmaW5lZCxcbiAgICAgIHByaXZhdGUgbW9kdWxlUmVzb2x2ZXI6IE1vZHVsZVJlc29sdmVyLCBwcml2YXRlIGN5Y2xlQW5hbHl6ZXI6IEN5Y2xlQW5hbHl6ZXIsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIGRlcFRyYWNrZXI6IERlcGVuZGVuY3lUcmFja2VyfG51bGwsXG4gICAgICBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksXG4gICAgICBwcml2YXRlIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyOiBib29sZWFuKSB7fVxuXG4gIHByaXZhdGUgbGl0ZXJhbENhY2hlID0gbmV3IE1hcDxEZWNvcmF0b3IsIHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uPigpO1xuICBwcml2YXRlIGVsZW1lbnRTY2hlbWFSZWdpc3RyeSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcblxuICAvKipcbiAgICogRHVyaW5nIHRoZSBhc3luY2hyb25vdXMgcHJlYW5hbHl6ZSBwaGFzZSwgaXQncyBuZWNlc3NhcnkgdG8gcGFyc2UgdGhlIHRlbXBsYXRlIHRvIGV4dHJhY3RcbiAgICogYW55IHBvdGVudGlhbCA8bGluaz4gdGFncyB3aGljaCBtaWdodCBuZWVkIHRvIGJlIGxvYWRlZC4gVGhpcyBjYWNoZSBlbnN1cmVzIHRoYXQgd29yayBpcyBub3RcbiAgICogdGhyb3duIGF3YXksIGFuZCB0aGUgcGFyc2VkIHRlbXBsYXRlIGlzIHJldXNlZCBkdXJpbmcgdGhlIGFuYWx5emUgcGhhc2UuXG4gICAqL1xuICBwcml2YXRlIHByZWFuYWx5emVUZW1wbGF0ZUNhY2hlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlPigpO1xuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuICByZWFkb25seSBuYW1lID0gQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdDb21wb25lbnQnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgZGVjb3JhdG9yLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBwcmVhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICAvLyBJbiBwcmVhbmFseXplLCByZXNvdXJjZSBVUkxzIGFzc29jaWF0ZWQgd2l0aCB0aGUgY29tcG9uZW50IGFyZSBhc3luY2hyb25vdXNseSBwcmVsb2FkZWQgdmlhXG4gICAgLy8gdGhlIHJlc291cmNlTG9hZGVyLiBUaGlzIGlzIHRoZSBvbmx5IHRpbWUgYXN5bmMgb3BlcmF0aW9ucyBhcmUgYWxsb3dlZCBmb3IgYSBjb21wb25lbnQuXG4gICAgLy8gVGhlc2UgcmVzb3VyY2VzIGFyZTpcbiAgICAvL1xuICAgIC8vIC0gdGhlIHRlbXBsYXRlVXJsLCBpZiB0aGVyZSBpcyBvbmVcbiAgICAvLyAtIGFueSBzdHlsZVVybHMgaWYgcHJlc2VudFxuICAgIC8vIC0gYW55IHN0eWxlc2hlZXRzIHJlZmVyZW5jZWQgZnJvbSA8bGluaz4gdGFncyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmXG4gICAgLy9cbiAgICAvLyBBcyBhIHJlc3VsdCBvZiB0aGUgbGFzdCBvbmUsIHRoZSB0ZW1wbGF0ZSBtdXN0IGJlIHBhcnNlZCBhcyBwYXJ0IG9mIHByZWFuYWx5c2lzIHRvIGV4dHJhY3RcbiAgICAvLyA8bGluaz4gdGFncywgd2hpY2ggbWF5IGludm9sdmUgd2FpdGluZyBmb3IgdGhlIHRlbXBsYXRlVXJsIHRvIGJlIHJlc29sdmVkIGZpcnN0LlxuXG4gICAgLy8gSWYgcHJlbG9hZGluZyBpc24ndCBwb3NzaWJsZSwgdGhlbiBza2lwIHRoaXMgc3RlcC5cbiAgICBpZiAoIXRoaXMucmVzb3VyY2VMb2FkZXIuY2FuUHJlbG9hZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0gdGhpcy5fcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yKTtcbiAgICBjb25zdCBjb21wb25lbnQgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuXG4gICAgLy8gQ29udmVydCBhIHN0eWxlVXJsIHN0cmluZyBpbnRvIGEgUHJvbWlzZSB0byBwcmVsb2FkIGl0LlxuICAgIGNvbnN0IHJlc29sdmVTdHlsZVVybCA9IChzdHlsZVVybDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgY29uc3QgcHJvbWlzZSA9IHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCk7XG4gICAgICByZXR1cm4gcHJvbWlzZSB8fCBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9O1xuXG4gICAgLy8gQSBQcm9taXNlIHRoYXQgd2FpdHMgZm9yIHRoZSB0ZW1wbGF0ZSBhbmQgYWxsIDxsaW5rPmVkIHN0eWxlcyB3aXRoaW4gaXQgdG8gYmUgcHJlbG9hZGVkLlxuICAgIGNvbnN0IHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcyA9XG4gICAgICAgIHRoaXMuX3ByZWxvYWRBbmRQYXJzZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSkudGhlbih0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGVtcGxhdGUuc3R5bGVVcmxzLm1hcChyZXNvbHZlU3R5bGVVcmwpKS50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIC8vIEV4dHJhY3QgYWxsIHRoZSBzdHlsZVVybHMgaW4gdGhlIGRlY29yYXRvci5cbiAgICBjb25zdCBzdHlsZVVybHMgPSB0aGlzLl9leHRyYWN0U3R5bGVVcmxzKGNvbXBvbmVudCwgW10pO1xuXG4gICAgaWYgKHN0eWxlVXJscyA9PT0gbnVsbCkge1xuICAgICAgLy8gQSBmYXN0IHBhdGggZXhpc3RzIGlmIHRoZXJlIGFyZSBubyBzdHlsZVVybHMsIHRvIGp1c3Qgd2FpdCBmb3JcbiAgICAgIC8vIHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcy5cbiAgICAgIHJldHVybiB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFdhaXQgZm9yIGJvdGggdGhlIHRlbXBsYXRlIGFuZCBhbGwgc3R5bGVVcmwgcmVzb3VyY2VzIHRvIHJlc29sdmUuXG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW3RlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcywgLi4uc3R5bGVVcmxzLm1hcChyZXNvbHZlU3R5bGVVcmwpXSlcbiAgICAgICAgICAudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4sXG4gICAgICBmbGFnczogSGFuZGxlckZsYWdzID0gSGFuZGxlckZsYWdzLk5PTkUpOiBBbmFseXNpc091dHB1dDxDb21wb25lbnRBbmFseXNpc0RhdGE+IHtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIHRoaXMubGl0ZXJhbENhY2hlLmRlbGV0ZShkZWNvcmF0b3IpO1xuXG4gICAgLy8gQENvbXBvbmVudCBpbmhlcml0cyBARGlyZWN0aXZlLCBzbyBiZWdpbiBieSBleHRyYWN0aW5nIHRoZSBARGlyZWN0aXZlIG1ldGFkYXRhIGFuZCBidWlsZGluZ1xuICAgIC8vIG9uIGl0LlxuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9IGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICAgICAgbm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgZmxhZ3MsIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIsXG4gICAgICAgIHRoaXMuZWxlbWVudFNjaGVtYVJlZ2lzdHJ5LmdldERlZmF1bHRDb21wb25lbnRFbGVtZW50TmFtZSgpKTtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGFgIHJldHVybnMgdW5kZWZpbmVkIHdoZW4gdGhlIEBEaXJlY3RpdmUgaGFzIGBqaXQ6IHRydWVgLiBJbiB0aGlzXG4gICAgICAvLyBjYXNlLCBjb21waWxhdGlvbiBvZiB0aGUgZGVjb3JhdG9yIGlzIHNraXBwZWQuIFJldHVybmluZyBhbiBlbXB0eSBvYmplY3Qgc2lnbmlmaWVzXG4gICAgICAvLyB0aGF0IG5vIGFuYWx5c2lzIHdhcyBwcm9kdWNlZC5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBOZXh0LCByZWFkIHRoZSBgQENvbXBvbmVudGAtc3BlY2lmaWMgZmllbGRzLlxuICAgIGNvbnN0IHtkZWNvcmF0b3I6IGNvbXBvbmVudCwgbWV0YWRhdGF9ID0gZGlyZWN0aXZlUmVzdWx0O1xuXG4gICAgLy8gR28gdGhyb3VnaCB0aGUgcm9vdCBkaXJlY3RvcmllcyBmb3IgdGhpcyBwcm9qZWN0LCBhbmQgc2VsZWN0IHRoZSBvbmUgd2l0aCB0aGUgc21hbGxlc3RcbiAgICAvLyByZWxhdGl2ZSBwYXRoIHJlcHJlc2VudGF0aW9uLlxuICAgIGNvbnN0IHJlbGF0aXZlQ29udGV4dEZpbGVQYXRoID0gdGhpcy5yb290RGlycy5yZWR1Y2U8c3RyaW5nfHVuZGVmaW5lZD4oKHByZXZpb3VzLCByb290RGlyKSA9PiB7XG4gICAgICBjb25zdCBjYW5kaWRhdGUgPSByZWxhdGl2ZShhYnNvbHV0ZUZyb20ocm9vdERpciksIGFic29sdXRlRnJvbShjb250YWluaW5nRmlsZSkpO1xuICAgICAgaWYgKHByZXZpb3VzID09PSB1bmRlZmluZWQgfHwgY2FuZGlkYXRlLmxlbmd0aCA8IHByZXZpb3VzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzO1xuICAgICAgfVxuICAgIH0sIHVuZGVmaW5lZCkhO1xuXG5cbiAgICAvLyBOb3RlIHRoYXQgd2UgY291bGQgdGVjaG5pY2FsbHkgY29tYmluZSB0aGUgYHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5YCBhbmRcbiAgICAvLyBgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeWAgaW50byBhIHNpbmdsZSBzZXQsIGJ1dCB3ZSBrZWVwIHRoZSBzZXBhcmF0ZSBzbyB0aGF0XG4gICAgLy8gd2UgY2FuIGRpc3Rpbmd1aXNoIHdoZXJlIGFuIGVycm9yIGlzIGNvbWluZyBmcm9tIHdoZW4gbG9nZ2luZyB0aGUgZGlhZ25vc3RpY3MgaW4gYHJlc29sdmVgLlxuICAgIGxldCB2aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbCA9IG51bGw7XG4gICAgbGV0IHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGwgPSBudWxsO1xuICAgIGxldCB3cmFwcGVkVmlld1Byb3ZpZGVyczogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcblxuICAgIGlmIChjb21wb25lbnQuaGFzKCd2aWV3UHJvdmlkZXJzJykpIHtcbiAgICAgIGNvbnN0IHZpZXdQcm92aWRlcnMgPSBjb21wb25lbnQuZ2V0KCd2aWV3UHJvdmlkZXJzJykhO1xuICAgICAgdmlld1Byb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgPVxuICAgICAgICAgIHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5KHZpZXdQcm92aWRlcnMsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvcik7XG4gICAgICB3cmFwcGVkVmlld1Byb3ZpZGVycyA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoXG4gICAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciA/IHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnModmlld1Byb3ZpZGVycykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3UHJvdmlkZXJzKTtcbiAgICB9XG5cbiAgICBpZiAoY29tcG9uZW50LmhhcygncHJvdmlkZXJzJykpIHtcbiAgICAgIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgPSByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeShcbiAgICAgICAgICBjb21wb25lbnQuZ2V0KCdwcm92aWRlcnMnKSEsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvcik7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgdGhlIHRlbXBsYXRlLlxuICAgIC8vIElmIGEgcHJlYW5hbHl6ZSBwaGFzZSB3YXMgZXhlY3V0ZWQsIHRoZSB0ZW1wbGF0ZSBtYXkgYWxyZWFkeSBleGlzdCBpbiBwYXJzZWQgZm9ybSwgc28gY2hlY2tcbiAgICAvLyB0aGUgcHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuXG4gICAgLy8gRXh0cmFjdCBhIGNsb3N1cmUgb2YgdGhlIHRlbXBsYXRlIHBhcnNpbmcgY29kZSBzbyB0aGF0IGl0IGNhbiBiZSByZXBhcnNlZCB3aXRoIGRpZmZlcmVudFxuICAgIC8vIG9wdGlvbnMgaWYgbmVlZGVkLCBsaWtlIGluIHRoZSBpbmRleGluZyBwaXBlbGluZS5cbiAgICBsZXQgdGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlV2l0aFNvdXJjZTtcbiAgICBpZiAodGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5oYXMobm9kZSkpIHtcbiAgICAgIC8vIFRoZSB0ZW1wbGF0ZSB3YXMgcGFyc2VkIGluIHByZWFuYWx5emUuIFVzZSBpdCBhbmQgZGVsZXRlIGl0IHRvIHNhdmUgbWVtb3J5LlxuICAgICAgY29uc3QgcHJlYW5hbHl6ZWQgPSB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmdldChub2RlKSE7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmRlbGV0ZShub2RlKTtcblxuICAgICAgdGVtcGxhdGUgPSBwcmVhbmFseXplZDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIHRlbXBsYXRlIHdhcyBub3QgYWxyZWFkeSBwYXJzZWQuIEVpdGhlciB0aGVyZSdzIGEgdGVtcGxhdGVVcmwsIG9yIGFuIGlubGluZSB0ZW1wbGF0ZS5cbiAgICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykhO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZVVybCA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHRlbXBsYXRlVXJsRXhwcik7XG4gICAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmxFeHByLCB0ZW1wbGF0ZVVybCwgJ3RlbXBsYXRlVXJsIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZSh0ZW1wbGF0ZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgICB0ZW1wbGF0ZSA9IHRoaXMuX2V4dHJhY3RFeHRlcm5hbFRlbXBsYXRlKG5vZGUsIGNvbXBvbmVudCwgdGVtcGxhdGVVcmxFeHByLCByZXNvdXJjZVVybCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBFeHBlY3QgYW4gaW5saW5lIHRlbXBsYXRlIHRvIGJlIHByZXNlbnQuXG4gICAgICAgIHRlbXBsYXRlID0gdGhpcy5fZXh0cmFjdElubGluZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW118dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKHRlbXBsYXRlLmVycm9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgYW55IHRlbXBsYXRlIHBhcnNpbmcgZXJyb3JzLCBjb252ZXJ0IHRoZW0gdG8gYHRzLkRpYWdub3N0aWNgcyBmb3IgZGlzcGxheS5cbiAgICAgIGNvbnN0IGlkID0gZ2V0VGVtcGxhdGVJZChub2RlKTtcbiAgICAgIGRpYWdub3N0aWNzID0gdGVtcGxhdGUuZXJyb3JzLm1hcChlcnJvciA9PiB7XG4gICAgICAgIGNvbnN0IHNwYW4gPSBlcnJvci5zcGFuO1xuXG4gICAgICAgIGlmIChzcGFuLnN0YXJ0Lm9mZnNldCA9PT0gc3Bhbi5lbmQub2Zmc2V0KSB7XG4gICAgICAgICAgLy8gVGVtcGxhdGUgZXJyb3JzIGNhbiBjb250YWluIHplcm8tbGVuZ3RoIHNwYW5zLCBpZiB0aGUgZXJyb3Igb2NjdXJzIGF0IGEgc2luZ2xlIHBvaW50LlxuICAgICAgICAgIC8vIEhvd2V2ZXIsIFR5cGVTY3JpcHQgZG9lcyBub3QgaGFuZGxlIGRpc3BsYXlpbmcgYSB6ZXJvLWxlbmd0aCBkaWFnbm9zdGljIHZlcnkgd2VsbCwgc29cbiAgICAgICAgICAvLyBpbmNyZWFzZSB0aGUgZW5kaW5nIG9mZnNldCBieSAxIGZvciBzdWNoIGVycm9ycywgdG8gZW5zdXJlIHRoZSBwb3NpdGlvbiBpcyBzaG93biBpbiB0aGVcbiAgICAgICAgICAvLyBkaWFnbm9zdGljLlxuICAgICAgICAgIHNwYW4uZW5kLm9mZnNldCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1ha2VUZW1wbGF0ZURpYWdub3N0aWMoXG4gICAgICAgICAgICBpZCwgdGVtcGxhdGUuc291cmNlTWFwcGluZywgc3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgICAgICAgbmdFcnJvckNvZGUoRXJyb3JDb2RlLlRFTVBMQVRFX1BBUlNFX0VSUk9SKSwgZXJyb3IubXNnKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgdGhlIHNldCBvZiBzdHlsZXMuIFRoZSBvcmRlcmluZyBoZXJlIGlzIGltcG9ydGFudDogZXh0ZXJuYWwgcmVzb3VyY2VzIChzdHlsZVVybHMpXG4gICAgLy8gcHJlY2VkZSBpbmxpbmUgc3R5bGVzLCBhbmQgc3R5bGVzIGRlZmluZWQgaW4gdGhlIHRlbXBsYXRlIG92ZXJyaWRlIHN0eWxlcyBkZWZpbmVkIGluIHRoZVxuICAgIC8vIGNvbXBvbmVudC5cbiAgICBsZXQgc3R5bGVzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcblxuICAgIGNvbnN0IHN0eWxlVXJscyA9IHRoaXMuX2V4dHJhY3RTdHlsZVVybHMoY29tcG9uZW50LCB0ZW1wbGF0ZS5zdHlsZVVybHMpO1xuICAgIGlmIChzdHlsZVVybHMgIT09IG51bGwpIHtcbiAgICAgIGlmIChzdHlsZXMgPT09IG51bGwpIHtcbiAgICAgICAgc3R5bGVzID0gW107XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHN0eWxlVXJsIG9mIHN0eWxlVXJscykge1xuICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgICBjb25zdCByZXNvdXJjZVN0ciA9IHRoaXMucmVzb3VyY2VMb2FkZXIubG9hZChyZXNvdXJjZVVybCk7XG4gICAgICAgIHN0eWxlcy5wdXNoKHJlc291cmNlU3RyKTtcbiAgICAgICAgaWYgKHRoaXMuZGVwVHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgICAgIHRoaXMuZGVwVHJhY2tlci5hZGRSZXNvdXJjZURlcGVuZGVuY3kobm9kZS5nZXRTb3VyY2VGaWxlKCksIGFic29sdXRlRnJvbShyZXNvdXJjZVVybCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjb21wb25lbnQuaGFzKCdzdHlsZXMnKSkge1xuICAgICAgY29uc3QgbGl0U3R5bGVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoY29tcG9uZW50LCAnc3R5bGVzJywgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgaWYgKGxpdFN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoc3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgICAgc3R5bGVzID0gbGl0U3R5bGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0eWxlcy5wdXNoKC4uLmxpdFN0eWxlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlLnN0eWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAoc3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgIHN0eWxlcyA9IHRlbXBsYXRlLnN0eWxlcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0eWxlcy5wdXNoKC4uLnRlbXBsYXRlLnN0eWxlcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZW5jYXBzdWxhdGlvbjogbnVtYmVyID1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZUVudW1WYWx1ZShjb21wb25lbnQsICdlbmNhcHN1bGF0aW9uJywgJ1ZpZXdFbmNhcHN1bGF0aW9uJykgfHwgMDtcblxuICAgIGNvbnN0IGNoYW5nZURldGVjdGlvbjogbnVtYmVyfG51bGwgPVxuICAgICAgICB0aGlzLl9yZXNvbHZlRW51bVZhbHVlKGNvbXBvbmVudCwgJ2NoYW5nZURldGVjdGlvbicsICdDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneScpO1xuXG4gICAgbGV0IGFuaW1hdGlvbnM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ2FuaW1hdGlvbnMnKSkge1xuICAgICAgYW5pbWF0aW9ucyA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY29tcG9uZW50LmdldCgnYW5pbWF0aW9ucycpISk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0OiBBbmFseXNpc091dHB1dDxDb21wb25lbnRBbmFseXNpc0RhdGE+ID0ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgYmFzZUNsYXNzOiByZWFkQmFzZUNsYXNzKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciksXG4gICAgICAgIG1ldGE6IHtcbiAgICAgICAgICAuLi5tZXRhZGF0YSxcbiAgICAgICAgICB0ZW1wbGF0ZToge1xuICAgICAgICAgICAgbm9kZXM6IHRlbXBsYXRlLmVtaXROb2RlcyxcbiAgICAgICAgICAgIG5nQ29udGVudFNlbGVjdG9yczogdGVtcGxhdGUubmdDb250ZW50U2VsZWN0b3JzLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgZW5jYXBzdWxhdGlvbixcbiAgICAgICAgICBpbnRlcnBvbGF0aW9uOiB0ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uLFxuICAgICAgICAgIHN0eWxlczogc3R5bGVzIHx8IFtdLFxuXG4gICAgICAgICAgLy8gVGhlc2Ugd2lsbCBiZSByZXBsYWNlZCBkdXJpbmcgdGhlIGNvbXBpbGF0aW9uIHN0ZXAsIGFmdGVyIGFsbCBgTmdNb2R1bGVgcyBoYXZlIGJlZW5cbiAgICAgICAgICAvLyBhbmFseXplZCBhbmQgdGhlIGZ1bGwgY29tcGlsYXRpb24gc2NvcGUgZm9yIHRoZSBjb21wb25lbnQgY2FuIGJlIHJlYWxpemVkLlxuICAgICAgICAgIGFuaW1hdGlvbnMsXG4gICAgICAgICAgdmlld1Byb3ZpZGVyczogd3JhcHBlZFZpZXdQcm92aWRlcnMsXG4gICAgICAgICAgaTE4blVzZUV4dGVybmFsSWRzOiB0aGlzLmkxOG5Vc2VFeHRlcm5hbElkcyxcbiAgICAgICAgICByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aCxcbiAgICAgICAgfSxcbiAgICAgICAgdHlwZUNoZWNrTWV0YTogZXh0cmFjdERpcmVjdGl2ZVR5cGVDaGVja01ldGEobm9kZSwgbWV0YWRhdGEuaW5wdXRzLCB0aGlzLnJlZmxlY3RvciksXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgICB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSxcbiAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksXG4gICAgICAgIHZpZXdQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LFxuICAgICAgfSxcbiAgICAgIGRpYWdub3N0aWNzLFxuICAgIH07XG4gICAgaWYgKGNoYW5nZURldGVjdGlvbiAhPT0gbnVsbCkge1xuICAgICAgb3V0cHV0LmFuYWx5c2lzIS5tZXRhLmNoYW5nZURldGVjdGlvbiA9IGNoYW5nZURldGVjdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRBbmFseXNpc0RhdGEpOiB2b2lkIHtcbiAgICAvLyBSZWdpc3RlciB0aGlzIGNvbXBvbmVudCdzIGluZm9ybWF0aW9uIHdpdGggdGhlIGBNZXRhZGF0YVJlZ2lzdHJ5YC4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbXBvbmVudCBpcyBhdmFpbGFibGUgZHVyaW5nIHRoZSBjb21waWxlKCkgcGhhc2UuXG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShub2RlKTtcbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKHtcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IG5vZGUubmFtZS50ZXh0LFxuICAgICAgc2VsZWN0b3I6IGFuYWx5c2lzLm1ldGEuc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogYW5hbHlzaXMubWV0YS5leHBvcnRBcyxcbiAgICAgIGlucHV0czogYW5hbHlzaXMubWV0YS5pbnB1dHMsXG4gICAgICBvdXRwdXRzOiBhbmFseXNpcy5tZXRhLm91dHB1dHMsXG4gICAgICBxdWVyaWVzOiBhbmFseXNpcy5tZXRhLnF1ZXJpZXMubWFwKHF1ZXJ5ID0+IHF1ZXJ5LnByb3BlcnR5TmFtZSksXG4gICAgICBpc0NvbXBvbmVudDogdHJ1ZSxcbiAgICAgIGJhc2VDbGFzczogYW5hbHlzaXMuYmFzZUNsYXNzLFxuICAgICAgLi4uYW5hbHlzaXMudHlwZUNoZWNrTWV0YSxcbiAgICB9KTtcblxuICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5LnJlZ2lzdGVySW5qZWN0YWJsZShub2RlKTtcbiAgfVxuXG4gIGluZGV4KFxuICAgICAgY29udGV4dDogSW5kZXhpbmdDb250ZXh0LCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPikge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChub2RlKTtcbiAgICBjb25zdCBzZWxlY3RvciA9IGFuYWx5c2lzLm1ldGEuc2VsZWN0b3I7XG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8RGlyZWN0aXZlTWV0YT4oKTtcbiAgICBpZiAoc2NvcGUgPT09ICdlcnJvcicpIHtcbiAgICAgIC8vIERvbid0IGJvdGhlciBpbmRleGluZyBjb21wb25lbnRzIHdoaWNoIGhhZCBlcnJvbmVvdXMgc2NvcGVzLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGlmIChkaXJlY3RpdmUuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgIGNvbnN0IGJvdW5kVGVtcGxhdGUgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IGFuYWx5c2lzLnRlbXBsYXRlLmRpYWdOb2Rlc30pO1xuXG4gICAgY29udGV4dC5hZGRDb21wb25lbnQoe1xuICAgICAgZGVjbGFyYXRpb246IG5vZGUsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIGJvdW5kVGVtcGxhdGUsXG4gICAgICB0ZW1wbGF0ZU1ldGE6IHtcbiAgICAgICAgaXNJbmxpbmU6IGFuYWx5c2lzLnRlbXBsYXRlLmlzSW5saW5lLFxuICAgICAgICBmaWxlOiBhbmFseXNpcy50ZW1wbGF0ZS5maWxlLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHR5cGVDaGVjayhjdHg6IFR5cGVDaGVja0NvbnRleHQsIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIG1ldGE6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pOlxuICAgICAgdm9pZCB7XG4gICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcjxEaXJlY3RpdmVNZXRhPigpO1xuICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4oKTtcbiAgICBsZXQgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSA9IFtdO1xuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGlmIChzY29wZSA9PT0gJ2Vycm9yJykge1xuICAgICAgLy8gRG9uJ3QgdHlwZS1jaGVjayBjb21wb25lbnRzIHRoYXQgaGFkIGVycm9ycyBpbiB0aGVpciBzY29wZXMuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IG1ldGEgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBpZiAobWV0YS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IGV4dE1ldGEgPSBmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGEodGhpcy5tZXRhUmVhZGVyLCBtZXRhLnJlZik7XG4gICAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShtZXRhLnNlbGVjdG9yKSwgZXh0TWV0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qge25hbWUsIHJlZn0gb2Ygc2NvcGUuY29tcGlsYXRpb24ucGlwZXMpIHtcbiAgICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmLm5vZGUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIG5vbi1jbGFzcyBkZWNsYXJhdGlvbiAke1xuICAgICAgICAgICAgICB0cy5TeW50YXhLaW5kW3JlZi5ub2RlLmtpbmRdfSBmb3IgcGlwZSAke3JlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcGlwZXMuc2V0KG5hbWUsIHJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pO1xuICAgICAgfVxuICAgICAgc2NoZW1hcyA9IHNjb3BlLnNjaGVtYXM7XG4gICAgfVxuXG4gICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgIGN0eC5hZGRUZW1wbGF0ZShcbiAgICAgICAgbmV3IFJlZmVyZW5jZShub2RlKSwgYmluZGVyLCBtZXRhLnRlbXBsYXRlLmRpYWdOb2RlcywgcGlwZXMsIHNjaGVtYXMsXG4gICAgICAgIG1ldGEudGVtcGxhdGUuc291cmNlTWFwcGluZywgbWV0YS50ZW1wbGF0ZS5maWxlKTtcbiAgfVxuXG4gIHJlc29sdmUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pOlxuICAgICAgUmVzb2x2ZVJlc3VsdDxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4ge1xuICAgIGNvbnN0IGNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgY29tcG9uZW50IHdhcyByZWdpc3RlcmVkIHdpdGggYW4gTmdNb2R1bGUuIElmIHNvLCBpdCBzaG91bGQgYmUgY29tcGlsZWRcbiAgICAvLyB1bmRlciB0aGF0IG1vZHVsZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChub2RlKTtcbiAgICBsZXQgbWV0YWRhdGEgPSBhbmFseXNpcy5tZXRhIGFzIFJlYWRvbmx5PFIzQ29tcG9uZW50TWV0YWRhdGE+O1xuXG4gICAgY29uc3QgZGF0YTogQ29tcG9uZW50UmVzb2x1dGlvbkRhdGEgPSB7XG4gICAgICBkaXJlY3RpdmVzOiBFTVBUWV9BUlJBWSxcbiAgICAgIHBpcGVzOiBFTVBUWV9NQVAsXG4gICAgICB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlOiBmYWxzZSxcbiAgICB9O1xuXG4gICAgaWYgKHNjb3BlICE9PSBudWxsICYmIHNjb3BlICE9PSAnZXJyb3InKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIHJlc29sdmUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICAvL1xuICAgICAgLy8gRmlyc3QgaXQgbmVlZHMgdG8gYmUgZGV0ZXJtaW5lZCBpZiBhY3R1YWxseSBpbXBvcnRpbmcgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgdXNlZCBpbiB0aGVcbiAgICAgIC8vIHRlbXBsYXRlIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLiBDdXJyZW50bHkgbmd0c2MgcmVmdXNlcyB0byBnZW5lcmF0ZSBjeWNsZXMsIHNvIGFuIG9wdGlvblxuICAgICAgLy8ga25vd24gYXMgXCJyZW1vdGUgc2NvcGluZ1wiIGlzIHVzZWQgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLiBJbiByZW1vdGUgc2NvcGluZywgdGhlXG4gICAgICAvLyBtb2R1bGUgZmlsZSBzZXRzIHRoZSBkaXJlY3RpdmVzL3BpcGVzIG9uIHRoZSDJtWNtcCBvZiB0aGUgY29tcG9uZW50LCB3aXRob3V0XG4gICAgICAvLyByZXF1aXJpbmcgbmV3IGltcG9ydHMgKGJ1dCBhbHNvIGluIGEgd2F5IHRoYXQgYnJlYWtzIHRyZWUgc2hha2luZykuXG4gICAgICAvL1xuICAgICAgLy8gRGV0ZXJtaW5pbmcgdGhpcyBpcyBjaGFsbGVuZ2luZywgYmVjYXVzZSB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyByZXNwb25zaWJsZSBmb3JcbiAgICAgIC8vIG1hdGNoaW5nIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSB0ZW1wbGF0ZTsgaG93ZXZlciwgdGhhdCBkb2Vzbid0IHJ1biB1bnRpbCB0aGUgYWN0dWFsXG4gICAgICAvLyBjb21waWxlKCkgc3RlcC4gSXQncyBub3QgcG9zc2libGUgdG8gcnVuIHRlbXBsYXRlIGNvbXBpbGF0aW9uIHNvb25lciBhcyBpdCByZXF1aXJlcyB0aGVcbiAgICAgIC8vIENvbnN0YW50UG9vbCBmb3IgdGhlIG92ZXJhbGwgZmlsZSBiZWluZyBjb21waWxlZCAod2hpY2ggaXNuJ3QgYXZhaWxhYmxlIHVudGlsIHRoZSB0cmFuc2Zvcm1cbiAgICAgIC8vIHN0ZXApLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQsIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIG1hdGNoZWQgaW5kZXBlbmRlbnRseSBoZXJlLCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXMgaXNcbiAgICAgIC8vIGFuIGFsdGVybmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIHRlbXBsYXRlIG1hdGNoaW5nIHdoaWNoIGlzIHVzZWQgZm9yIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmdcbiAgICAgIC8vIGFuZCB3aWxsIGV2ZW50dWFsbHkgcmVwbGFjZSBtYXRjaGluZyBpbiB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlci5cblxuXG4gICAgICAvLyBTZXQgdXAgdGhlIFIzVGFyZ2V0QmluZGVyLCBhcyB3ZWxsIGFzIGEgJ2RpcmVjdGl2ZXMnIGFycmF5IGFuZCBhICdwaXBlcycgbWFwIHRoYXQgYXJlIGxhdGVyXG4gICAgICAvLyBmZWQgdG8gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuIEZpcnN0LCBhIFNlbGVjdG9yTWF0Y2hlciBpcyBjb25zdHJ1Y3RlZCB0byBtYXRjaFxuICAgICAgLy8gZGlyZWN0aXZlcyB0aGF0IGFyZSBpbiBzY29wZS5cbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGEme2V4cHJlc3Npb246IEV4cHJlc3Npb259PigpO1xuICAgICAgY29uc3QgZGlyZWN0aXZlczoge3NlbGVjdG9yOiBzdHJpbmcsIGV4cHJlc3Npb246IEV4cHJlc3Npb259W10gPSBbXTtcblxuICAgICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCB7cmVmLCBzZWxlY3Rvcn0gPSBkaXI7XG4gICAgICAgIGlmIChzZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChyZWYsIGNvbnRleHQpO1xuICAgICAgICAgIGRpcmVjdGl2ZXMucHVzaCh7c2VsZWN0b3IsIGV4cHJlc3Npb259KTtcbiAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKHNlbGVjdG9yKSwgey4uLmRpciwgZXhwcmVzc2lvbn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuICAgICAgZm9yIChjb25zdCBwaXBlIG9mIHNjb3BlLmNvbXBpbGF0aW9uLnBpcGVzKSB7XG4gICAgICAgIHBpcGVzLnNldChwaXBlLm5hbWUsIHRoaXMucmVmRW1pdHRlci5lbWl0KHBpcGUucmVmLCBjb250ZXh0KSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5leHQsIHRoZSBjb21wb25lbnQgdGVtcGxhdGUgQVNUIGlzIGJvdW5kIHVzaW5nIHRoZSBSM1RhcmdldEJpbmRlci4gVGhpcyBwcm9kdWNlcyBhblxuICAgICAgLy8gQm91bmRUYXJnZXQsIHdoaWNoIGlzIHNpbWlsYXIgdG8gYSB0cy5UeXBlQ2hlY2tlci5cbiAgICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihtYXRjaGVyKTtcbiAgICAgIGNvbnN0IGJvdW5kID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlOiBtZXRhZGF0YS50ZW1wbGF0ZS5ub2Rlc30pO1xuXG4gICAgICAvLyBUaGUgQm91bmRUYXJnZXQga25vd3Mgd2hpY2ggZGlyZWN0aXZlcyBhbmQgcGlwZXMgbWF0Y2hlZCB0aGUgdGVtcGxhdGUuXG4gICAgICBjb25zdCB1c2VkRGlyZWN0aXZlcyA9IGJvdW5kLmdldFVzZWREaXJlY3RpdmVzKCk7XG4gICAgICBjb25zdCB1c2VkUGlwZXMgPSBib3VuZC5nZXRVc2VkUGlwZXMoKS5tYXAobmFtZSA9PiBwaXBlcy5nZXQobmFtZSkhKTtcblxuICAgICAgLy8gU2NhbiB0aHJvdWdoIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGFjdHVhbGx5IHVzZWQgaW4gdGhlIHRlbXBsYXRlIGFuZCBjaGVjayB3aGV0aGVyIGFueVxuICAgICAgLy8gaW1wb3J0IHdoaWNoIG5lZWRzIHRvIGJlIGdlbmVyYXRlZCB3b3VsZCBjcmVhdGUgYSBjeWNsZS5cbiAgICAgIGNvbnN0IGN5Y2xlRGV0ZWN0ZWQgPVxuICAgICAgICAgIHVzZWREaXJlY3RpdmVzLnNvbWUoZGlyID0+IHRoaXMuX2lzQ3ljbGljSW1wb3J0KGRpci5leHByZXNzaW9uLCBjb250ZXh0KSkgfHxcbiAgICAgICAgICB1c2VkUGlwZXMuc29tZShwaXBlID0+IHRoaXMuX2lzQ3ljbGljSW1wb3J0KHBpcGUsIGNvbnRleHQpKTtcblxuICAgICAgaWYgKCFjeWNsZURldGVjdGVkKSB7XG4gICAgICAgIC8vIE5vIGN5Y2xlIHdhcyBkZXRlY3RlZC4gUmVjb3JkIHRoZSBpbXBvcnRzIHRoYXQgbmVlZCB0byBiZSBjcmVhdGVkIGluIHRoZSBjeWNsZSBkZXRlY3RvclxuICAgICAgICAvLyBzbyB0aGF0IGZ1dHVyZSBjeWNsaWMgaW1wb3J0IGNoZWNrcyBjb25zaWRlciB0aGVpciBwcm9kdWN0aW9uLlxuICAgICAgICBmb3IgKGNvbnN0IHtleHByZXNzaW9ufSBvZiB1c2VkRGlyZWN0aXZlcykge1xuICAgICAgICAgIHRoaXMuX3JlY29yZFN5bnRoZXRpY0ltcG9ydChleHByZXNzaW9uLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHBpcGUgb2YgdXNlZFBpcGVzKSB7XG4gICAgICAgICAgdGhpcy5fcmVjb3JkU3ludGhldGljSW1wb3J0KHBpcGUsIGNvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgZGlyZWN0aXZlL3BpcGUgYXJyYXlzIGluIMm1Y21wIG5lZWQgdG8gYmUgd3JhcHBlZCBpbiBjbG9zdXJlcy5cbiAgICAgICAgLy8gVGhpcyBpcyByZXF1aXJlZCBpZiBhbnkgZGlyZWN0aXZlL3BpcGUgcmVmZXJlbmNlIGlzIHRvIGEgZGVjbGFyYXRpb24gaW4gdGhlIHNhbWUgZmlsZSBidXRcbiAgICAgICAgLy8gZGVjbGFyZWQgYWZ0ZXIgdGhpcyBjb21wb25lbnQuXG4gICAgICAgIGNvbnN0IHdyYXBEaXJlY3RpdmVzQW5kUGlwZXNJbkNsb3N1cmUgPVxuICAgICAgICAgICAgdXNlZERpcmVjdGl2ZXMuc29tZShcbiAgICAgICAgICAgICAgICBkaXIgPT4gaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShkaXIuZXhwcmVzc2lvbiwgbm9kZS5uYW1lLCBjb250ZXh0KSkgfHxcbiAgICAgICAgICAgIHVzZWRQaXBlcy5zb21lKHBpcGUgPT4gaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShwaXBlLCBub2RlLm5hbWUsIGNvbnRleHQpKTtcblxuICAgICAgICAvLyBBY3R1YWwgY29tcGlsYXRpb24gc3RpbGwgdXNlcyB0aGUgZnVsbCBzY29wZSwgbm90IHRoZSBuYXJyb3dlZCBzY29wZSBkZXRlcm1pbmVkIGJ5XG4gICAgICAgIC8vIFIzVGFyZ2V0QmluZGVyLiBUaGlzIGlzIGEgaGVkZ2UgYWdhaW5zdCBwb3RlbnRpYWwgaXNzdWVzIHdpdGggdGhlIFIzVGFyZ2V0QmluZGVyIC0gcmlnaHRcbiAgICAgICAgLy8gbm93IHRoZSBUZW1wbGF0ZURlZmluaXRpb25CdWlsZGVyIGlzIHRoZSBcInNvdXJjZSBvZiB0cnV0aFwiIGZvciB3aGljaCBkaXJlY3RpdmVzL3BpcGVzIGFyZVxuICAgICAgICAvLyBhY3R1YWxseSB1c2VkICh0aG91Z2ggdGhlIHR3byBzaG91bGQgYWdyZWUgcGVyZmVjdGx5KS5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBzd2l0Y2ggVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBvdmVyIHRvIHVzaW5nIFIzVGFyZ2V0QmluZGVyIGRpcmVjdGx5LlxuICAgICAgICBkYXRhLmRpcmVjdGl2ZXMgPSBkaXJlY3RpdmVzO1xuICAgICAgICBkYXRhLnBpcGVzID0gcGlwZXM7XG4gICAgICAgIGRhdGEud3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZSA9IHdyYXBEaXJlY3RpdmVzQW5kUGlwZXNJbkNsb3N1cmU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBEZWNsYXJpbmcgdGhlIGRpcmVjdGl2ZURlZnMvcGlwZURlZnMgYXJyYXlzIGRpcmVjdGx5IHdvdWxkIHJlcXVpcmUgaW1wb3J0cyB0aGF0IHdvdWxkXG4gICAgICAgIC8vIGNyZWF0ZSBhIGN5Y2xlLiBJbnN0ZWFkLCBtYXJrIHRoaXMgY29tcG9uZW50IGFzIHJlcXVpcmluZyByZW1vdGUgc2NvcGluZywgc28gdGhhdCB0aGVcbiAgICAgICAgLy8gTmdNb2R1bGUgZmlsZSB3aWxsIHRha2UgY2FyZSBvZiBzZXR0aW5nIHRoZSBkaXJlY3RpdmVzIGZvciB0aGUgY29tcG9uZW50LlxuICAgICAgICB0aGlzLnNjb3BlUmVnaXN0cnkuc2V0Q29tcG9uZW50QXNSZXF1aXJpbmdSZW1vdGVTY29waW5nKG5vZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAgIGlmIChhbmFseXNpcy5wcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ICE9PSBudWxsICYmXG4gICAgICAgIGFuYWx5c2lzLm1ldGEucHJvdmlkZXJzIGluc3RhbmNlb2YgV3JhcHBlZE5vZGVFeHByKSB7XG4gICAgICBjb25zdCBwcm92aWRlckRpYWdub3N0aWNzID0gZ2V0UHJvdmlkZXJEaWFnbm9zdGljcyhcbiAgICAgICAgICBhbmFseXNpcy5wcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LCBhbmFseXNpcy5tZXRhLnByb3ZpZGVycyEubm9kZSxcbiAgICAgICAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeSk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnByb3ZpZGVyRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGlmIChhbmFseXNpcy52aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSAhPT0gbnVsbCAmJlxuICAgICAgICBhbmFseXNpcy5tZXRhLnZpZXdQcm92aWRlcnMgaW5zdGFuY2VvZiBXcmFwcGVkTm9kZUV4cHIpIHtcbiAgICAgIGNvbnN0IHZpZXdQcm92aWRlckRpYWdub3N0aWNzID0gZ2V0UHJvdmlkZXJEaWFnbm9zdGljcyhcbiAgICAgICAgICBhbmFseXNpcy52aWV3UHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgYW5hbHlzaXMubWV0YS52aWV3UHJvdmlkZXJzIS5ub2RlLFxuICAgICAgICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5KTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udmlld1Byb3ZpZGVyRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpcmVjdGl2ZURpYWdub3N0aWNzID0gZ2V0RGlyZWN0aXZlRGlhZ25vc3RpY3MoXG4gICAgICAgIG5vZGUsIHRoaXMubWV0YVJlYWRlciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMucmVmbGVjdG9yLCB0aGlzLnNjb3BlUmVnaXN0cnksICdDb21wb25lbnQnKTtcbiAgICBpZiAoZGlyZWN0aXZlRGlhZ25vc3RpY3MgIT09IG51bGwpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uZGlyZWN0aXZlRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4ge2RpYWdub3N0aWNzfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge2RhdGF9O1xuICB9XG5cbiAgY29tcGlsZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxDb21wb25lbnRBbmFseXNpc0RhdGE+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8Q29tcG9uZW50UmVzb2x1dGlvbkRhdGE+LCBwb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IG1ldGE6IFIzQ29tcG9uZW50TWV0YWRhdGEgPSB7Li4uYW5hbHlzaXMubWV0YSwgLi4ucmVzb2x1dGlvbn07XG4gICAgY29uc3QgcmVzID0gY29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YShtZXRhLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICBjb25zdCBmYWN0b3J5UmVzID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKFxuICAgICAgICB7Li4ubWV0YSwgaW5qZWN0Rm46IElkZW50aWZpZXJzLmRpcmVjdGl2ZUluamVjdCwgdGFyZ2V0OiBSM0ZhY3RvcnlUYXJnZXQuQ29tcG9uZW50fSk7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIFtcbiAgICAgIGZhY3RvcnlSZXMsIHtcbiAgICAgICAgbmFtZTogJ8m1Y21wJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgICB9XG4gICAgXTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jlc29sdmVMaXRlcmFsKGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICAgIGlmICh0aGlzLmxpdGVyYWxDYWNoZS5oYXMoZGVjb3JhdG9yKSkge1xuICAgICAgcmV0dXJuIHRoaXMubGl0ZXJhbENhY2hlLmdldChkZWNvcmF0b3IpITtcbiAgICB9XG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgICBgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQENvbXBvbmVudCBkZWNvcmF0b3JgKTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsIGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCBiZSBsaXRlcmFsLmApO1xuICAgIH1cblxuICAgIHRoaXMubGl0ZXJhbENhY2hlLnNldChkZWNvcmF0b3IsIG1ldGEpO1xuICAgIHJldHVybiBtZXRhO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVzb2x2ZUVudW1WYWx1ZShcbiAgICAgIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGZpZWxkOiBzdHJpbmcsIGVudW1TeW1ib2xOYW1lOiBzdHJpbmcpOiBudW1iZXJ8bnVsbCB7XG4gICAgbGV0IHJlc29sdmVkOiBudW1iZXJ8bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoZmllbGQpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldChmaWVsZCkhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKSBhcyBhbnk7XG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbnVtVmFsdWUgJiYgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSh2YWx1ZS5lbnVtUmVmLCBlbnVtU3ltYm9sTmFtZSkpIHtcbiAgICAgICAgcmVzb2x2ZWQgPSB2YWx1ZS5yZXNvbHZlZCBhcyBudW1iZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgZXhwciwgdmFsdWUsIGAke2ZpZWxkfSBtdXN0IGJlIGEgbWVtYmVyIG9mICR7ZW51bVN5bWJvbE5hbWV9IGVudW0gZnJvbSBAYW5ndWxhci9jb3JlYCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXNvbHZlZDtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RTdHlsZVVybHMoY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZXh0cmFVcmxzOiBzdHJpbmdbXSk6XG4gICAgICBzdHJpbmdbXXxudWxsIHtcbiAgICBpZiAoIWNvbXBvbmVudC5oYXMoJ3N0eWxlVXJscycpKSB7XG4gICAgICByZXR1cm4gZXh0cmFVcmxzLmxlbmd0aCA+IDAgPyBleHRyYVVybHMgOiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHN0eWxlVXJsc0V4cHIgPSBjb21wb25lbnQuZ2V0KCdzdHlsZVVybHMnKSE7XG4gICAgY29uc3Qgc3R5bGVVcmxzID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoc3R5bGVVcmxzRXhwcik7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHN0eWxlVXJscykgfHwgIXN0eWxlVXJscy5ldmVyeSh1cmwgPT4gdHlwZW9mIHVybCA9PT0gJ3N0cmluZycpKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgIHN0eWxlVXJsc0V4cHIsIHN0eWxlVXJscywgJ3N0eWxlVXJscyBtdXN0IGJlIGFuIGFycmF5IG9mIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgc3R5bGVVcmxzLnB1c2goLi4uZXh0cmFVcmxzKTtcbiAgICByZXR1cm4gc3R5bGVVcmxzIGFzIHN0cmluZ1tdO1xuICB9XG5cbiAgcHJpdmF0ZSBfcHJlbG9hZEFuZFBhcnNlVGVtcGxhdGUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvciwgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPixcbiAgICAgIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBQcm9taXNlPFBhcnNlZFRlbXBsYXRlfG51bGw+IHtcbiAgICBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGVVcmwnKSkge1xuICAgICAgLy8gRXh0cmFjdCB0aGUgdGVtcGxhdGVVcmwgYW5kIHByZWxvYWQgaXQuXG4gICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybEV4cHIsIHRlbXBsYXRlVXJsLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlUHJvbWlzZSA9IHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCk7XG5cbiAgICAgIC8vIElmIHRoZSBwcmVsb2FkIHdvcmtlZCwgdGhlbiBhY3R1YWxseSBsb2FkIGFuZCBwYXJzZSB0aGUgdGVtcGxhdGUsIGFuZCB3YWl0IGZvciBhbnkgc3R5bGVcbiAgICAgIC8vIFVSTHMgdG8gcmVzb2x2ZS5cbiAgICAgIGlmICh0ZW1wbGF0ZVByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGVQcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID1cbiAgICAgICAgICAgICAgdGhpcy5fZXh0cmFjdEV4dGVybmFsVGVtcGxhdGUobm9kZSwgY29tcG9uZW50LCB0ZW1wbGF0ZVVybEV4cHIsIHJlc291cmNlVXJsKTtcbiAgICAgICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5fZXh0cmFjdElubGluZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRlbXBsYXRlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0RXh0ZXJuYWxUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIHRlbXBsYXRlVXJsRXhwcjogdHMuRXhwcmVzc2lvbixcbiAgICAgIHJlc291cmNlVXJsOiBzdHJpbmcpOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2Uge1xuICAgIGNvbnN0IHRlbXBsYXRlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHJlc291cmNlVXJsKTtcbiAgICBpZiAodGhpcy5kZXBUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmRlcFRyYWNrZXIuYWRkUmVzb3VyY2VEZXBlbmRlbmN5KG5vZGUuZ2V0U291cmNlRmlsZSgpLCBhYnNvbHV0ZUZyb20ocmVzb3VyY2VVcmwpKTtcbiAgICB9XG5cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMuX3BhcnNlVGVtcGxhdGUoXG4gICAgICAgIGNvbXBvbmVudCwgdGVtcGxhdGVTdHIsIHNvdXJjZU1hcFVybChyZXNvdXJjZVVybCksIC8qIHRlbXBsYXRlUmFuZ2UgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBlc2NhcGVkU3RyaW5nICovIGZhbHNlKTtcblxuICAgIHJldHVybiB7XG4gICAgICAuLi50ZW1wbGF0ZSxcbiAgICAgIHNvdXJjZU1hcHBpbmc6IHtcbiAgICAgICAgdHlwZTogJ2V4dGVybmFsJyxcbiAgICAgICAgY29tcG9uZW50Q2xhc3M6IG5vZGUsXG4gICAgICAgIG5vZGU6IHRlbXBsYXRlVXJsRXhwcixcbiAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlU3RyLFxuICAgICAgICB0ZW1wbGF0ZVVybDogcmVzb3VyY2VVcmwsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0SW5saW5lVGVtcGxhdGUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvciwgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPixcbiAgICAgIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBQYXJzZWRUZW1wbGF0ZVdpdGhTb3VyY2Uge1xuICAgIGlmICghY29tcG9uZW50LmhhcygndGVtcGxhdGUnKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5DT01QT05FTlRfTUlTU0lOR19URU1QTEFURSwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgICdjb21wb25lbnQgaXMgbWlzc2luZyBhIHRlbXBsYXRlJyk7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlJykhO1xuXG4gICAgbGV0IHRlbXBsYXRlU3RyOiBzdHJpbmc7XG4gICAgbGV0IHRlbXBsYXRlVXJsOiBzdHJpbmcgPSAnJztcbiAgICBsZXQgdGVtcGxhdGVSYW5nZTogTGV4ZXJSYW5nZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IHNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgICBsZXQgZXNjYXBlZFN0cmluZyA9IGZhbHNlO1xuICAgIC8vIFdlIG9ubHkgc3VwcG9ydCBTb3VyY2VNYXBzIGZvciBpbmxpbmUgdGVtcGxhdGVzIHRoYXQgYXJlIHNpbXBsZSBzdHJpbmcgbGl0ZXJhbHMuXG4gICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbCh0ZW1wbGF0ZUV4cHIpIHx8IHRzLmlzTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwodGVtcGxhdGVFeHByKSkge1xuICAgICAgLy8gdGhlIHN0YXJ0IGFuZCBlbmQgb2YgdGhlIGB0ZW1wbGF0ZUV4cHJgIG5vZGUgaW5jbHVkZXMgdGhlIHF1b3RhdGlvbiBtYXJrcywgd2hpY2ggd2VcbiAgICAgIC8vIG11c3RcbiAgICAgIC8vIHN0cmlwXG4gICAgICB0ZW1wbGF0ZVJhbmdlID0gZ2V0VGVtcGxhdGVSYW5nZSh0ZW1wbGF0ZUV4cHIpO1xuICAgICAgdGVtcGxhdGVTdHIgPSB0ZW1wbGF0ZUV4cHIuZ2V0U291cmNlRmlsZSgpLnRleHQ7XG4gICAgICB0ZW1wbGF0ZVVybCA9IGNvbnRhaW5pbmdGaWxlO1xuICAgICAgZXNjYXBlZFN0cmluZyA9IHRydWU7XG4gICAgICBzb3VyY2VNYXBwaW5nID0ge1xuICAgICAgICB0eXBlOiAnZGlyZWN0JyxcbiAgICAgICAgbm9kZTogdGVtcGxhdGVFeHByIGFzICh0cy5TdHJpbmdMaXRlcmFsIHwgdHMuTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwpLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcmVzb2x2ZWRUZW1wbGF0ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHRlbXBsYXRlRXhwcik7XG4gICAgICBpZiAodHlwZW9mIHJlc29sdmVkVGVtcGxhdGUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICB0ZW1wbGF0ZUV4cHIsIHJlc29sdmVkVGVtcGxhdGUsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgICBzb3VyY2VNYXBwaW5nID0ge1xuICAgICAgICB0eXBlOiAnaW5kaXJlY3QnLFxuICAgICAgICBub2RlOiB0ZW1wbGF0ZUV4cHIsXG4gICAgICAgIGNvbXBvbmVudENsYXNzOiBub2RlLFxuICAgICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVTdHIsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHRlbXBsYXRlID1cbiAgICAgICAgdGhpcy5fcGFyc2VUZW1wbGF0ZShjb21wb25lbnQsIHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZVVybCwgdGVtcGxhdGVSYW5nZSwgZXNjYXBlZFN0cmluZyk7XG5cbiAgICByZXR1cm4gey4uLnRlbXBsYXRlLCBzb3VyY2VNYXBwaW5nfTtcbiAgfVxuXG4gIHByaXZhdGUgX3BhcnNlVGVtcGxhdGUoXG4gICAgICBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCB0ZW1wbGF0ZVN0cjogc3RyaW5nLCB0ZW1wbGF0ZVVybDogc3RyaW5nLFxuICAgICAgdGVtcGxhdGVSYW5nZTogTGV4ZXJSYW5nZXx1bmRlZmluZWQsIGVzY2FwZWRTdHJpbmc6IGJvb2xlYW4pOiBQYXJzZWRUZW1wbGF0ZSB7XG4gICAgbGV0IHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4gPSB0aGlzLmRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHZhbHVlLCAncHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IGJlIGEgYm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyA9IHZhbHVlO1xuICAgIH1cblxuICAgIGxldCBpbnRlcnBvbGF0aW9uOiBJbnRlcnBvbGF0aW9uQ29uZmlnID0gREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRztcbiAgICBpZiAoY29tcG9uZW50LmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgnaW50ZXJwb2xhdGlvbicpITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlLmxlbmd0aCAhPT0gMiB8fFxuICAgICAgICAgICF2YWx1ZS5ldmVyeShlbGVtZW50ID0+IHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGV4cHIsIHZhbHVlLCAnaW50ZXJwb2xhdGlvbiBtdXN0IGJlIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cyBvZiBzdHJpbmcgdHlwZScpO1xuICAgICAgfVxuICAgICAgaW50ZXJwb2xhdGlvbiA9IEludGVycG9sYXRpb25Db25maWcuZnJvbUFycmF5KHZhbHVlIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xuICAgIH1cblxuICAgIGNvbnN0IHtlcnJvcnMsIG5vZGVzOiBlbWl0Tm9kZXMsIHN0eWxlVXJscywgc3R5bGVzLCBuZ0NvbnRlbnRTZWxlY3RvcnN9ID1cbiAgICAgICAgcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZVN0ciwgdGVtcGxhdGVVcmwsIHtcbiAgICAgICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICAgIGludGVycG9sYXRpb25Db25maWc6IGludGVycG9sYXRpb24sXG4gICAgICAgICAgcmFuZ2U6IHRlbXBsYXRlUmFuZ2UsXG4gICAgICAgICAgZXNjYXBlZFN0cmluZyxcbiAgICAgICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiB0aGlzLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICAgICAgaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzOiB0aGlzLmkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVcyxcbiAgICAgICAgfSk7XG5cbiAgICAvLyBVbmZvcnR1bmF0ZWx5LCB0aGUgcHJpbWFyeSBwYXJzZSBvZiB0aGUgdGVtcGxhdGUgYWJvdmUgbWF5IG5vdCBjb250YWluIGFjY3VyYXRlIHNvdXJjZSBtYXBcbiAgICAvLyBpbmZvcm1hdGlvbi4gSWYgdXNlZCBkaXJlY3RseSwgaXQgd291bGQgcmVzdWx0IGluIGluY29ycmVjdCBjb2RlIGxvY2F0aW9ucyBpbiB0ZW1wbGF0ZVxuICAgIC8vIGVycm9ycywgZXRjLiBUaGVyZSBhcmUgdHdvIG1haW4gcHJvYmxlbXM6XG4gICAgLy9cbiAgICAvLyAxLiBgcHJlc2VydmVXaGl0ZXNwYWNlczogZmFsc2VgIGFubmloaWxhdGVzIHRoZSBjb3JyZWN0bmVzcyBvZiB0ZW1wbGF0ZSBzb3VyY2UgbWFwcGluZywgYXNcbiAgICAvLyAgICB0aGUgd2hpdGVzcGFjZSB0cmFuc2Zvcm1hdGlvbiBjaGFuZ2VzIHRoZSBjb250ZW50cyBvZiBIVE1MIHRleHQgbm9kZXMgYmVmb3JlIHRoZXkncmVcbiAgICAvLyAgICBwYXJzZWQgaW50byBBbmd1bGFyIGV4cHJlc3Npb25zLlxuICAgIC8vIDIuIEJ5IGRlZmF1bHQsIHRoZSB0ZW1wbGF0ZSBwYXJzZXIgc3RyaXBzIGxlYWRpbmcgdHJpdmlhIGNoYXJhY3RlcnMgKGxpa2Ugc3BhY2VzLCB0YWJzLCBhbmRcbiAgICAvLyAgICBuZXdsaW5lcykuIFRoaXMgYWxzbyBkZXN0cm95cyBzb3VyY2UgbWFwcGluZyBpbmZvcm1hdGlvbi5cbiAgICAvL1xuICAgIC8vIEluIG9yZGVyIHRvIGd1YXJhbnRlZSB0aGUgY29ycmVjdG5lc3Mgb2YgZGlhZ25vc3RpY3MsIHRlbXBsYXRlcyBhcmUgcGFyc2VkIGEgc2Vjb25kIHRpbWUgd2l0aFxuICAgIC8vIHRoZSBhYm92ZSBvcHRpb25zIHNldCB0byBwcmVzZXJ2ZSBzb3VyY2UgbWFwcGluZ3MuXG5cbiAgICBjb25zdCB7bm9kZXM6IGRpYWdOb2Rlc30gPSBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZVVybCwge1xuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczogdHJ1ZSxcbiAgICAgIGludGVycG9sYXRpb25Db25maWc6IGludGVycG9sYXRpb24sXG4gICAgICByYW5nZTogdGVtcGxhdGVSYW5nZSxcbiAgICAgIGVzY2FwZWRTdHJpbmcsXG4gICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiB0aGlzLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsXG4gICAgICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM6IHRoaXMuaTE4bk5vcm1hbGl6ZUxpbmVFbmRpbmdzSW5JQ1VzLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBpbnRlcnBvbGF0aW9uLFxuICAgICAgZW1pdE5vZGVzLFxuICAgICAgZGlhZ05vZGVzLFxuICAgICAgc3R5bGVVcmxzLFxuICAgICAgc3R5bGVzLFxuICAgICAgbmdDb250ZW50U2VsZWN0b3JzLFxuICAgICAgZXJyb3JzLFxuICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlU3RyLFxuICAgICAgdGVtcGxhdGVVcmwsXG4gICAgICBpc0lubGluZTogY29tcG9uZW50LmhhcygndGVtcGxhdGUnKSxcbiAgICAgIGZpbGU6IG5ldyBQYXJzZVNvdXJjZUZpbGUodGVtcGxhdGVTdHIsIHRlbXBsYXRlVXJsKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfZXhwcmVzc2lvblRvSW1wb3J0ZWRGaWxlKGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgd2hhdCBmaWxlIGlzIGJlaW5nIGltcG9ydGVkLlxuICAgIHJldHVybiB0aGlzLm1vZHVsZVJlc29sdmVyLnJlc29sdmVNb2R1bGUoZXhwci52YWx1ZS5tb2R1bGVOYW1lISwgb3JpZ2luLmZpbGVOYW1lKTtcbiAgfVxuXG4gIHByaXZhdGUgX2lzQ3ljbGljSW1wb3J0KGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGltcG9ydGVkID0gdGhpcy5fZXhwcmVzc2lvblRvSW1wb3J0ZWRGaWxlKGV4cHIsIG9yaWdpbik7XG4gICAgaWYgKGltcG9ydGVkID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgaW1wb3J0IGlzIGxlZ2FsLlxuICAgIHJldHVybiB0aGlzLmN5Y2xlQW5hbHl6ZXIud291bGRDcmVhdGVDeWNsZShvcmlnaW4sIGltcG9ydGVkKTtcbiAgfVxuXG4gIHByaXZhdGUgX3JlY29yZFN5bnRoZXRpY0ltcG9ydChleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBpbXBvcnRlZCA9IHRoaXMuX2V4cHJlc3Npb25Ub0ltcG9ydGVkRmlsZShleHByLCBvcmlnaW4pO1xuICAgIGlmIChpbXBvcnRlZCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY3ljbGVBbmFseXplci5yZWNvcmRTeW50aGV0aWNJbXBvcnQob3JpZ2luLCBpbXBvcnRlZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VGVtcGxhdGVSYW5nZSh0ZW1wbGF0ZUV4cHI6IHRzLkV4cHJlc3Npb24pIHtcbiAgY29uc3Qgc3RhcnRQb3MgPSB0ZW1wbGF0ZUV4cHIuZ2V0U3RhcnQoKSArIDE7XG4gIGNvbnN0IHtsaW5lLCBjaGFyYWN0ZXJ9ID1cbiAgICAgIHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHRlbXBsYXRlRXhwci5nZXRTb3VyY2VGaWxlKCksIHN0YXJ0UG9zKTtcbiAgcmV0dXJuIHtcbiAgICBzdGFydFBvcyxcbiAgICBzdGFydExpbmU6IGxpbmUsXG4gICAgc3RhcnRDb2w6IGNoYXJhY3RlcixcbiAgICBlbmRQb3M6IHRlbXBsYXRlRXhwci5nZXRFbmQoKSAtIDEsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNvdXJjZU1hcFVybChyZXNvdXJjZVVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCF0c1NvdXJjZU1hcEJ1ZzI5MzAwRml4ZWQoKSkge1xuICAgIC8vIEJ5IHJlbW92aW5nIHRoZSB0ZW1wbGF0ZSBVUkwgd2UgYXJlIHRlbGxpbmcgdGhlIHRyYW5zbGF0b3Igbm90IHRvIHRyeSB0b1xuICAgIC8vIG1hcCB0aGUgZXh0ZXJuYWwgc291cmNlIGZpbGUgdG8gdGhlIGdlbmVyYXRlZCBjb2RlLCBzaW5jZSB0aGUgdmVyc2lvblxuICAgIC8vIG9mIFRTIHRoYXQgaXMgcnVubmluZyBkb2VzIG5vdCBzdXBwb3J0IGl0LlxuICAgIHJldHVybiAnJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmVzb3VyY2VVcmw7XG4gIH1cbn1cblxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSB0ZW1wbGF0ZSB3aGljaCB3YXMgZXh0cmFjdGVkIGR1cmluZyBwYXJzaW5nLlxuICpcbiAqIFRoaXMgY29udGFpbnMgdGhlIGFjdHVhbCBwYXJzZWQgdGVtcGxhdGUgYXMgd2VsbCBhcyBhbnkgbWV0YWRhdGEgY29sbGVjdGVkIGR1cmluZyBpdHMgcGFyc2luZyxcbiAqIHNvbWUgb2Ygd2hpY2ggbWlnaHQgYmUgdXNlZnVsIGZvciByZS1wYXJzaW5nIHRoZSB0ZW1wbGF0ZSB3aXRoIGRpZmZlcmVudCBvcHRpb25zLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZFRlbXBsYXRlIHtcbiAgLyoqXG4gICAqIFRoZSBgSW50ZXJwb2xhdGlvbkNvbmZpZ2Agc3BlY2lmaWVkIGJ5IHRoZSB1c2VyLlxuICAgKi9cbiAgaW50ZXJwb2xhdGlvbjogSW50ZXJwb2xhdGlvbkNvbmZpZztcblxuICAvKipcbiAgICogQSBmdWxsIHBhdGggdG8gdGhlIGZpbGUgd2hpY2ggY29udGFpbnMgdGhlIHRlbXBsYXRlLlxuICAgKlxuICAgKiBUaGlzIGNhbiBiZSBlaXRoZXIgdGhlIG9yaWdpbmFsIC50cyBmaWxlIGlmIHRoZSB0ZW1wbGF0ZSBpcyBpbmxpbmUsIG9yIHRoZSAuaHRtbCBmaWxlIGlmIGFuXG4gICAqIGV4dGVybmFsIGZpbGUgd2FzIHVzZWQuXG4gICAqL1xuICB0ZW1wbGF0ZVVybDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgc3RyaW5nIGNvbnRlbnRzIG9mIHRoZSB0ZW1wbGF0ZS5cbiAgICpcbiAgICogVGhpcyBpcyB0aGUgXCJsb2dpY2FsXCIgdGVtcGxhdGUgc3RyaW5nLCBhZnRlciBleHBhbnNpb24gb2YgYW55IGVzY2FwZWQgY2hhcmFjdGVycyAoZm9yIGlubGluZVxuICAgKiB0ZW1wbGF0ZXMpLiBUaGlzIG1heSBkaWZmZXIgZnJvbSB0aGUgYWN0dWFsIHRlbXBsYXRlIGJ5dGVzIGFzIHRoZXkgYXBwZWFyIGluIHRoZSAudHMgZmlsZS5cbiAgICovXG4gIHRlbXBsYXRlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEFueSBlcnJvcnMgZnJvbSBwYXJzaW5nIHRoZSB0ZW1wbGF0ZSB0aGUgZmlyc3QgdGltZS5cbiAgICovXG4gIGVycm9ycz86IFBhcnNlRXJyb3JbXXx1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFRoZSB0ZW1wbGF0ZSBBU1QsIHBhcnNlZCBhY2NvcmRpbmcgdG8gdGhlIHVzZXIncyBzcGVjaWZpY2F0aW9ucy5cbiAgICovXG4gIGVtaXROb2RlczogVG1wbEFzdE5vZGVbXTtcblxuICAvKipcbiAgICogVGhlIHRlbXBsYXRlIEFTVCwgcGFyc2VkIGluIGEgbWFubmVyIHdoaWNoIHByZXNlcnZlcyBzb3VyY2UgbWFwIGluZm9ybWF0aW9uIGZvciBkaWFnbm9zdGljcy5cbiAgICpcbiAgICogTm90IHVzZWZ1bCBmb3IgZW1pdC5cbiAgICovXG4gIGRpYWdOb2RlczogVG1wbEFzdE5vZGVbXTtcblxuICAvKipcbiAgICpcbiAgICovXG5cbiAgLyoqXG4gICAqIEFueSBzdHlsZVVybHMgZXh0cmFjdGVkIGZyb20gdGhlIG1ldGFkYXRhLlxuICAgKi9cbiAgc3R5bGVVcmxzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogQW55IGlubGluZSBzdHlsZXMgZXh0cmFjdGVkIGZyb20gdGhlIG1ldGFkYXRhLlxuICAgKi9cbiAgc3R5bGVzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogQW55IG5nLWNvbnRlbnQgc2VsZWN0b3JzIGV4dHJhY3RlZCBmcm9tIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIG5nQ29udGVudFNlbGVjdG9yczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIHRlbXBsYXRlIHdhcyBpbmxpbmUuXG4gICAqL1xuICBpc0lubGluZTogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIGBQYXJzZVNvdXJjZUZpbGVgIGZvciB0aGUgdGVtcGxhdGUuXG4gICAqL1xuICBmaWxlOiBQYXJzZVNvdXJjZUZpbGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkVGVtcGxhdGVXaXRoU291cmNlIGV4dGVuZHMgUGFyc2VkVGVtcGxhdGUge1xuICBzb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG59XG4iXX0=