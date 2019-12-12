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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/inheritance", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
    var ts_source_map_bug_29300_1 = require("@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300");
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
        function ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds, enableI18nLegacyMessageIdFormat, moduleResolver, cycleAnalyzer, refEmitter, defaultImportRecorder, depTracker, annotateForClosureCompiler) {
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
            this.moduleResolver = moduleResolver;
            this.cycleAnalyzer = cycleAnalyzer;
            this.refEmitter = refEmitter;
            this.defaultImportRecorder = defaultImportRecorder;
            this.depTracker = depTracker;
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
            var viewProviders = component.has('viewProviders') ?
                new compiler_1.WrappedNodeExpr(this.annotateForClosureCompiler ?
                    util_1.wrapFunctionExpressionsInParens(component.get('viewProviders')) :
                    component.get('viewProviders')) :
                null;
            // Parse the template.
            // If a preanalyze phase was executed, the template may already exist in parsed form, so check
            // the preanalyzeTemplateCache.
            // Extract a closure of the template parsing code so that it can be reparsed with different
            // options if needed, like in the indexing pipeline.
            var parseTemplate;
            // Track the origin of the template to determine how the ParseSourceSpans should be interpreted.
            var templateSourceMapping;
            if (this.preanalyzeTemplateCache.has(node)) {
                // The template was parsed in preanalyze. Use it and delete it to save memory.
                var preanalyzed = this.preanalyzeTemplateCache.get(node);
                this.preanalyzeTemplateCache.delete(node);
                parseTemplate = preanalyzed.parseTemplate;
                templateSourceMapping = preanalyzed.templateSourceMapping;
            }
            else {
                // The template was not already parsed. Either there's a templateUrl, or an inline template.
                if (component.has('templateUrl')) {
                    var templateUrlExpr = component.get('templateUrl');
                    var templateUrl = this.evaluator.evaluate(templateUrlExpr);
                    if (typeof templateUrl !== 'string') {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateUrlExpr, 'templateUrl must be a string');
                    }
                    var resourceUrl = this.resourceLoader.resolve(templateUrl, containingFile);
                    var external_1 = this._extractExternalTemplate(node, component, templateUrlExpr, resourceUrl);
                    parseTemplate = external_1.parseTemplate;
                    templateSourceMapping = external_1.templateSourceMapping;
                }
                else {
                    // Expect an inline template to be present.
                    var inline = this._extractInlineTemplate(node, decorator, component, containingFile);
                    parseTemplate = inline.parseTemplate;
                    templateSourceMapping = inline.templateSourceMapping;
                }
            }
            var template = parseTemplate();
            if (template.errors !== undefined) {
                throw new Error("Errors parsing template: " + template.errors.map(function (e) { return e.toString(); }).join(', '));
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
                            this.depTracker.addResourceDependency(node.getSourceFile(), resourceUrl);
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
                    meta: tslib_1.__assign(tslib_1.__assign({}, metadata), { template: template,
                        encapsulation: encapsulation, interpolation: template.interpolation, styles: styles || [], 
                        // These will be replaced during the compilation step, after all `NgModule`s have been
                        // analyzed and the full compilation scope for the component can be realized.
                        animations: animations,
                        viewProviders: viewProviders, i18nUseExternalIds: this.i18nUseExternalIds, relativeContextFilePath: relativeContextFilePath }),
                    guards: metadata_1.extractDirectiveGuards(node, this.reflector),
                    metadataStmt: metadata_2.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore, this.annotateForClosureCompiler),
                    parsedTemplate: template, parseTemplate: parseTemplate, templateSourceMapping: templateSourceMapping,
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
            this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign({ ref: ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.meta.inputs, outputs: analysis.meta.outputs, queries: analysis.meta.queries.map(function (query) { return query.propertyName; }), isComponent: true, baseClass: analysis.baseClass }, analysis.guards));
        };
        ComponentDecoratorHandler.prototype.index = function (context, node, analysis) {
            var e_2, _a;
            // The component template may have been previously parsed without preserving whitespace or with
            // `leadingTriviaChar`s, both of which may manipulate the AST into a form not representative of
            // the source code, making it unsuitable for indexing. The template is reparsed with preserving
            // options to remedy this.
            var template = analysis.parseTemplate({
                preserveWhitespaces: true,
                leadingTriviaChars: [],
            });
            var scope = this.scopeReader.getScopeForComponent(node);
            var selector = analysis.meta.selector;
            var matcher = new compiler_1.SelectorMatcher();
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
            var boundTemplate = binder.bind({ template: template.nodes });
            context.addComponent({
                declaration: node,
                selector: selector,
                boundTemplate: boundTemplate,
                templateMeta: {
                    isInline: template.isInline,
                    file: template.file,
                },
            });
        };
        ComponentDecoratorHandler.prototype.typeCheck = function (ctx, node, meta) {
            var e_3, _a, e_4, _b;
            if (!ts.isClassDeclaration(node)) {
                return;
            }
            // There are issues with parsing the template under certain configurations (namely with
            // `preserveWhitespaces: false`) which cause inaccurate positional information within the
            // template AST, particularly within interpolation expressions.
            //
            // To work around this, the template is re-parsed with settings that guarantee the spans are as
            // accurate as possible. This is only a temporary solution until the whitespace removal step can
            // be rewritten as a transform against the expression AST instead of against the HTML AST.
            //
            // TODO(alxhub): remove this when whitespace removal no longer corrupts span information.
            var template = meta.parseTemplate({
                preserveWhitespaces: true,
                leadingTriviaChars: [],
            });
            var matcher = new compiler_1.SelectorMatcher();
            var pipes = new Map();
            var schemas = [];
            var scope = this.scopeReader.getScopeForComponent(node);
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
            var bound = new compiler_1.R3TargetBinder(matcher).bind({ template: template.nodes });
            ctx.addTemplate(new imports_1.Reference(node), bound, pipes, schemas, meta.templateSourceMapping, template.file);
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
            if (scope !== null) {
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
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, field + " must be a member of " + enumSymbolName + " enum from @angular/core");
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
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, styleUrlsExpr, 'styleUrls must be an array of strings');
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
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateUrlExpr_1, 'templateUrl must be a string');
                }
                var resourceUrl_1 = this.resourceLoader.resolve(templateUrl, containingFile);
                var templatePromise = this.resourceLoader.preload(resourceUrl_1);
                // If the preload worked, then actually load and parse the template, and wait for any style
                // URLs to resolve.
                if (templatePromise !== undefined) {
                    return templatePromise.then(function () {
                        var _a = _this._extractExternalTemplate(node, component, templateUrlExpr_1, resourceUrl_1), parseTemplate = _a.parseTemplate, templateSourceMapping = _a.templateSourceMapping;
                        var template = parseTemplate();
                        _this.preanalyzeTemplateCache.set(node, tslib_1.__assign(tslib_1.__assign({}, template), { parseTemplate: parseTemplate, templateSourceMapping: templateSourceMapping }));
                        return template;
                    });
                }
                else {
                    return Promise.resolve(null);
                }
            }
            else {
                var _a = this._extractInlineTemplate(node, decorator, component, containingFile), parseTemplate_1 = _a.parseTemplate, templateSourceMapping = _a.templateSourceMapping;
                var template = parseTemplate_1();
                this.preanalyzeTemplateCache.set(node, tslib_1.__assign(tslib_1.__assign({}, template), { parseTemplate: parseTemplate_1, templateSourceMapping: templateSourceMapping }));
                return Promise.resolve(template);
            }
        };
        ComponentDecoratorHandler.prototype._extractExternalTemplate = function (node, component, templateUrlExpr, resourceUrl) {
            var _this = this;
            var templateStr = this.resourceLoader.load(resourceUrl);
            if (this.depTracker !== null) {
                this.depTracker.addResourceDependency(node.getSourceFile(), resourceUrl);
            }
            var parseTemplate = function (options) { return _this._parseTemplate(component, templateStr, sourceMapUrl(resourceUrl), 
            /* templateRange */ undefined, 
            /* escapedString */ false, options); };
            var templateSourceMapping = {
                type: 'external',
                componentClass: node,
                node: templateUrlExpr,
                template: templateStr,
                templateUrl: resourceUrl,
            };
            return { parseTemplate: parseTemplate, templateSourceMapping: templateSourceMapping };
        };
        ComponentDecoratorHandler.prototype._extractInlineTemplate = function (node, decorator, component, containingFile) {
            var _this = this;
            if (!component.has('template')) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_MISSING_TEMPLATE, reflection_1.Decorator.nodeForError(decorator), 'component is missing a template');
            }
            var templateExpr = component.get('template');
            var templateStr;
            var templateUrl = '';
            var templateRange = undefined;
            var templateSourceMapping;
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
                templateSourceMapping = {
                    type: 'direct',
                    node: templateExpr,
                };
            }
            else {
                var resolvedTemplate = this.evaluator.evaluate(templateExpr);
                if (typeof resolvedTemplate !== 'string') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateExpr, 'template must be a string');
                }
                templateStr = resolvedTemplate;
                templateSourceMapping = {
                    type: 'indirect',
                    node: templateExpr,
                    componentClass: node,
                    template: templateStr,
                };
            }
            var parseTemplate = function (options) { return _this._parseTemplate(component, templateStr, templateUrl, templateRange, escapedString, options); };
            return { parseTemplate: parseTemplate, templateSourceMapping: templateSourceMapping };
        };
        ComponentDecoratorHandler.prototype._parseTemplate = function (component, templateStr, templateUrl, templateRange, escapedString, options) {
            if (options === void 0) { options = {}; }
            var preserveWhitespaces = this.defaultPreserveWhitespaces;
            if (component.has('preserveWhitespaces')) {
                var expr = component.get('preserveWhitespaces');
                var value = this.evaluator.evaluate(expr);
                if (typeof value !== 'boolean') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, 'preserveWhitespaces must be a boolean');
                }
                preserveWhitespaces = value;
            }
            var interpolation = compiler_1.DEFAULT_INTERPOLATION_CONFIG;
            if (component.has('interpolation')) {
                var expr = component.get('interpolation');
                var value = this.evaluator.evaluate(expr);
                if (!Array.isArray(value) || value.length !== 2 ||
                    !value.every(function (element) { return typeof element === 'string'; })) {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, 'interpolation must be an array with 2 elements of string type');
                }
                interpolation = compiler_1.InterpolationConfig.fromArray(value);
            }
            return tslib_1.__assign(tslib_1.__assign({ interpolation: interpolation }, compiler_1.parseTemplate(templateStr, templateUrl, tslib_1.__assign({ preserveWhitespaces: preserveWhitespaces, interpolationConfig: interpolation, range: templateRange, escapedString: escapedString, enableI18nLegacyMessageIdFormat: this.enableI18nLegacyMessageIdFormat }, options))), { template: templateStr, templateUrl: templateUrl, isInline: component.has('template'), file: new compiler_1.ParseSourceFile(templateStr, templateUrl) });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUErYTtJQUMvYSwrQkFBaUM7SUFHakMsMkVBQWtFO0lBQ2xFLDJFQUF5RDtJQUN6RCxtRUFBaUc7SUFHakcscUVBQXVHO0lBQ3ZHLHdGQUFpRjtJQUNqRix1RkFBb0U7SUFDcEUseUVBQW1HO0lBRW5HLHVFQUE4STtJQUU5SSw0R0FBZ0Y7SUFJaEYsdUZBQTJFO0lBQzNFLG1GQUFtRDtJQUNuRCxxRkFBd0Q7SUFDeEQsNkVBQW9LO0lBRXBLLElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0lBQ2hELElBQU0sV0FBVyxHQUFVLEVBQUUsQ0FBQztJQTJCOUI7O09BRUc7SUFDSDtRQUVFLG1DQUNZLFNBQXlCLEVBQVUsU0FBMkIsRUFDOUQsWUFBOEIsRUFBVSxVQUEwQixFQUNsRSxXQUFpQyxFQUFVLGFBQXVDLEVBQ2xGLE1BQWUsRUFBVSxjQUE4QixFQUFVLFFBQWtCLEVBQ25GLDBCQUFtQyxFQUFVLGtCQUEyQixFQUN4RSwrQkFBd0MsRUFBVSxjQUE4QixFQUNoRixhQUE0QixFQUFVLFVBQTRCLEVBQ2xFLHFCQUE0QyxFQUM1QyxVQUFrQyxFQUFVLDBCQUFtQztZQVIvRSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzlELGlCQUFZLEdBQVosWUFBWSxDQUFrQjtZQUFVLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQ2xFLGdCQUFXLEdBQVgsV0FBVyxDQUFzQjtZQUFVLGtCQUFhLEdBQWIsYUFBYSxDQUEwQjtZQUNsRixXQUFNLEdBQU4sTUFBTSxDQUFTO1lBQVUsbUJB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QUFDO1FBQ0gsZ0NBQUM7SUFBRCxDQUFDLEFBNXNCRCxJQTRzQkM7SUE1c0JZLDhEQUF5QjtJQThzQnRDLFNBQVMsZ0JBQWdCLENBQUMsWUFBMkI7UUFDbkQsSUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QyxJQUFBLDZFQUNzRSxFQURyRSxjQUFJLEVBQUUsd0JBQytELENBQUM7UUFDN0UsT0FBTztZQUNMLFFBQVEsVUFBQTtZQUNSLFNBQVMsRUFBRSxJQUFJO1lBQ2YsUUFBUSxFQUFFLFNBQVM7WUFDbkIsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDO1NBQ2xDLENBQUM7SUFDSixDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsV0FBbUI7UUFDdkMsSUFBSSxDQUFDLGtEQUF3QixFQUFFLEVBQUU7WUFDL0IsMkVBQTJFO1lBQzNFLHdFQUF3RTtZQUN4RSw2Q0FBNkM7WUFDN0MsT0FBTyxFQUFFLENBQUM7U0FDWDthQUFNO1lBQ0wsT0FBTyxXQUFXLENBQUM7U0FDcEI7SUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgQ3NzU2VsZWN0b3IsIERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUcsIERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgRXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBJZGVudGlmaWVycywgSW50ZXJwb2xhdGlvbkNvbmZpZywgTGV4ZXJSYW5nZSwgUGFyc2VFcnJvciwgUGFyc2VTb3VyY2VGaWxlLCBQYXJzZVRlbXBsYXRlT3B0aW9ucywgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNGYWN0b3J5VGFyZ2V0LCBSM1RhcmdldEJpbmRlciwgU2NoZW1hTWV0YWRhdGEsIFNlbGVjdG9yTWF0Y2hlciwgU3RhdGVtZW50LCBUbXBsQXN0Tm9kZSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q3ljbGVBbmFseXplcn0gZnJvbSAnLi4vLi4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIHJlbGF0aXZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgTW9kdWxlUmVzb2x2ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RlcGVuZGVuY3lUcmFja2VyfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9hcGknO1xuaW1wb3J0IHtJbmRleGluZ0NvbnRleHR9IGZyb20gJy4uLy4uL2luZGV4ZXInO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgZXh0cmFjdERpcmVjdGl2ZUd1YXJkc30gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGF9IGZyb20gJy4uLy4uL21ldGFkYXRhL3NyYy9pbmhlcml0YW5jZSc7XG5pbXBvcnQge0VudW1WYWx1ZSwgUGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlckZsYWdzLCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7VGVtcGxhdGVTb3VyY2VNYXBwaW5nLCBUeXBlQ2hlY2tDb250ZXh0fSBmcm9tICcuLi8uLi90eXBlY2hlY2snO1xuaW1wb3J0IHt0c1NvdXJjZU1hcEJ1ZzI5MzAwRml4ZWR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3RzX3NvdXJjZV9tYXBfYnVnXzI5MzAwJztcbmltcG9ydCB7U3Vic2V0T2ZLZXlzfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEsIHBhcnNlRmllbGRBcnJheVZhbHVlfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQge2NvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZH0gZnJvbSAnLi9mYWN0b3J5JztcbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge2ZpbmRBbmd1bGFyRGVjb3JhdG9yLCBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlLCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlLCByZWFkQmFzZUNsYXNzLCB1bndyYXBFeHByZXNzaW9uLCB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9NQVAgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcbmNvbnN0IEVNUFRZX0FSUkFZOiBhbnlbXSA9IFtdO1xuXG4vKipcbiAqIFRoZXNlIGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgYXJlIHVwZGF0ZWQgaW4gdGhlIGByZXNvbHZlYCBwaGFzZS5cbiAqXG4gKiBUaGUgYGtleW9mIFIzQ29tcG9uZW50TWV0YWRhdGEgJmAgY29uZGl0aW9uIGVuc3VyZXMgdGhhdCBvbmx5IGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgY2FuXG4gKiBiZSBpbmNsdWRlZCBoZXJlLlxuICovXG5leHBvcnQgdHlwZSBDb21wb25lbnRNZXRhZGF0YVJlc29sdmVkRmllbGRzID1cbiAgICBTdWJzZXRPZktleXM8UjNDb21wb25lbnRNZXRhZGF0YSwgJ2RpcmVjdGl2ZXMnfCdwaXBlcyd8J3dyYXBEaXJlY3RpdmVzQW5kUGlwZXNJbkNsb3N1cmUnPjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRBbmFseXNpc0RhdGEge1xuICAvKipcbiAgICogYG1ldGFgIGluY2x1ZGVzIHRob3NlIGZpZWxkcyBvZiBgUjNDb21wb25lbnRNZXRhZGF0YWAgd2hpY2ggYXJlIGNhbGN1bGF0ZWQgYXQgYGFuYWx5emVgIHRpbWVcbiAgICogKG5vdCBkdXJpbmcgcmVzb2x2ZSkuXG4gICAqL1xuICBtZXRhOiBPbWl0PFIzQ29tcG9uZW50TWV0YWRhdGEsIENvbXBvbmVudE1ldGFkYXRhUmVzb2x2ZWRGaWVsZHM+O1xuICBiYXNlQ2xhc3M6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPnwnZHluYW1pYyd8bnVsbDtcbiAgZ3VhcmRzOiBSZXR1cm5UeXBlPHR5cGVvZiBleHRyYWN0RGlyZWN0aXZlR3VhcmRzPjtcbiAgcGFyc2VkVGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlO1xuICB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcbiAgcGFyc2VUZW1wbGF0ZTogKG9wdGlvbnM/OiBQYXJzZVRlbXBsYXRlT3B0aW9ucykgPT4gUGFyc2VkVGVtcGxhdGU7XG59XG5cbmV4cG9ydCB0eXBlIENvbXBvbmVudFJlc29sdXRpb25EYXRhID0gUGljazxSM0NvbXBvbmVudE1ldGFkYXRhLCBDb21wb25lbnRNZXRhZGF0YVJlc29sdmVkRmllbGRzPjtcblxuLyoqXG4gKiBgRGVjb3JhdG9ySGFuZGxlcmAgd2hpY2ggaGFuZGxlcyB0aGUgYEBDb21wb25lbnRgIGFubm90YXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERlY29yYXRvciwgQ29tcG9uZW50QW5hbHlzaXNEYXRhLCBDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcixcbiAgICAgIHByaXZhdGUgc2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLCBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLCBwcml2YXRlIHJlc291cmNlTG9hZGVyOiBSZXNvdXJjZUxvYWRlciwgcHJpdmF0ZSByb290RGlyczogc3RyaW5nW10sXG4gICAgICBwcml2YXRlIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuLCBwcml2YXRlIGkxOG5Vc2VFeHRlcm5hbElkczogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogYm9vbGVhbiwgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXIsXG4gICAgICBwcml2YXRlIGN5Y2xlQW5hbHl6ZXI6IEN5Y2xlQW5hbHl6ZXIsIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIGRlcFRyYWNrZXI6IERlcGVuZGVuY3lUcmFja2VyfG51bGwsIHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4pIHt9XG5cbiAgcHJpdmF0ZSBsaXRlcmFsQ2FjaGUgPSBuZXcgTWFwPERlY29yYXRvciwgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24+KCk7XG4gIHByaXZhdGUgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5ID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuXG4gIC8qKlxuICAgKiBEdXJpbmcgdGhlIGFzeW5jaHJvbm91cyBwcmVhbmFseXplIHBoYXNlLCBpdCdzIG5lY2Vzc2FyeSB0byBwYXJzZSB0aGUgdGVtcGxhdGUgdG8gZXh0cmFjdFxuICAgKiBhbnkgcG90ZW50aWFsIDxsaW5rPiB0YWdzIHdoaWNoIG1pZ2h0IG5lZWQgdG8gYmUgbG9hZGVkLiBUaGlzIGNhY2hlIGVuc3VyZXMgdGhhdCB3b3JrIGlzIG5vdFxuICAgKiB0aHJvd24gYXdheSwgYW5kIHRoZSBwYXJzZWQgdGVtcGxhdGUgaXMgcmV1c2VkIGR1cmluZyB0aGUgYW5hbHl6ZSBwaGFzZS5cbiAgICovXG4gIHByaXZhdGUgcHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBQcmVhbmFseXplZFRlbXBsYXRlPigpO1xuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuICByZWFkb25seSBuYW1lID0gQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdDb21wb25lbnQnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJlYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4pOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgLy8gSW4gcHJlYW5hbHl6ZSwgcmVzb3VyY2UgVVJMcyBhc3NvY2lhdGVkIHdpdGggdGhlIGNvbXBvbmVudCBhcmUgYXN5bmNocm9ub3VzbHkgcHJlbG9hZGVkIHZpYVxuICAgIC8vIHRoZSByZXNvdXJjZUxvYWRlci4gVGhpcyBpcyB0aGUgb25seSB0aW1lIGFzeW5jIG9wZXJhdGlvbnMgYXJlIGFsbG93ZWQgZm9yIGEgY29tcG9uZW50LlxuICAgIC8vIFRoZXNlIHJlc291cmNlcyBhcmU6XG4gICAgLy9cbiAgICAvLyAtIHRoZSB0ZW1wbGF0ZVVybCwgaWYgdGhlcmUgaXMgb25lXG4gICAgLy8gLSBhbnkgc3R5bGVVcmxzIGlmIHByZXNlbnRcbiAgICAvLyAtIGFueSBzdHlsZXNoZWV0cyByZWZlcmVuY2VkIGZyb20gPGxpbms+IHRhZ3MgaW4gdGhlIHRlbXBsYXRlIGl0c2VsZlxuICAgIC8vXG4gICAgLy8gQXMgYSByZXN1bHQgb2YgdGhlIGxhc3Qgb25lLCB0aGUgdGVtcGxhdGUgbXVzdCBiZSBwYXJzZWQgYXMgcGFydCBvZiBwcmVhbmFseXNpcyB0byBleHRyYWN0XG4gICAgLy8gPGxpbms+IHRhZ3MsIHdoaWNoIG1heSBpbnZvbHZlIHdhaXRpbmcgZm9yIHRoZSB0ZW1wbGF0ZVVybCB0byBiZSByZXNvbHZlZCBmaXJzdC5cblxuICAgIC8vIElmIHByZWxvYWRpbmcgaXNuJ3QgcG9zc2libGUsIHRoZW4gc2tpcCB0aGlzIHN0ZXAuXG4gICAgaWYgKCF0aGlzLnJlc291cmNlTG9hZGVyLmNhblByZWxvYWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YSA9IHRoaXMuX3Jlc29sdmVMaXRlcmFsKGRlY29yYXRvcik7XG4gICAgY29uc3QgY29tcG9uZW50ID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcblxuICAgIC8vIENvbnZlcnQgYSBzdHlsZVVybCBzdHJpbmcgaW50byBhIFByb21pc2UgdG8gcHJlbG9hZCBpdC5cbiAgICBjb25zdCByZXNvbHZlU3R5bGVVcmwgPSAoc3R5bGVVcmw6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUoc3R5bGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgIGNvbnN0IHByb21pc2UgPSB0aGlzLnJlc291cmNlTG9hZGVyLnByZWxvYWQocmVzb3VyY2VVcmwpO1xuICAgICAgcmV0dXJuIHByb21pc2UgfHwgUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfTtcblxuICAgIC8vIEEgUHJvbWlzZSB0aGF0IHdhaXRzIGZvciB0aGUgdGVtcGxhdGUgYW5kIGFsbCA8bGluaz5lZCBzdHlsZXMgd2l0aGluIGl0IHRvIGJlIHByZWxvYWRlZC5cbiAgICBjb25zdCB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXMgPVxuICAgICAgICB0aGlzLl9wcmVsb2FkQW5kUGFyc2VUZW1wbGF0ZShub2RlLCBkZWNvcmF0b3IsIGNvbXBvbmVudCwgY29udGFpbmluZ0ZpbGUpLnRoZW4odGVtcGxhdGUgPT4ge1xuICAgICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHRlbXBsYXRlLnN0eWxlVXJscy5tYXAocmVzb2x2ZVN0eWxlVXJsKSkudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAvLyBFeHRyYWN0IGFsbCB0aGUgc3R5bGVVcmxzIGluIHRoZSBkZWNvcmF0b3IuXG4gICAgY29uc3Qgc3R5bGVVcmxzID0gdGhpcy5fZXh0cmFjdFN0eWxlVXJscyhjb21wb25lbnQsIFtdKTtcblxuICAgIGlmIChzdHlsZVVybHMgPT09IG51bGwpIHtcbiAgICAgIC8vIEEgZmFzdCBwYXRoIGV4aXN0cyBpZiB0aGVyZSBhcmUgbm8gc3R5bGVVcmxzLCB0byBqdXN0IHdhaXQgZm9yXG4gICAgICAvLyB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXMuXG4gICAgICByZXR1cm4gdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBXYWl0IGZvciBib3RoIHRoZSB0ZW1wbGF0ZSBhbmQgYWxsIHN0eWxlVXJsIHJlc291cmNlcyB0byByZXNvbHZlLlxuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFt0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXMsIC4uLnN0eWxlVXJscy5tYXAocmVzb2x2ZVN0eWxlVXJsKV0pXG4gICAgICAgICAgLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3I+LFxuICAgICAgZmxhZ3M6IEhhbmRsZXJGbGFncyA9IEhhbmRsZXJGbGFncy5OT05FKTogQW5hbHlzaXNPdXRwdXQ8Q29tcG9uZW50QW5hbHlzaXNEYXRhPiB7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5kZWxldGUoZGVjb3JhdG9yKTtcblxuICAgIC8vIEBDb21wb25lbnQgaW5oZXJpdHMgQERpcmVjdGl2ZSwgc28gYmVnaW4gYnkgZXh0cmFjdGluZyB0aGUgQERpcmVjdGl2ZSBtZXRhZGF0YSBhbmQgYnVpbGRpbmdcbiAgICAvLyBvbiBpdC5cbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPSBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgIGZsYWdzLCB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyLFxuICAgICAgICB0aGlzLmVsZW1lbnRTY2hlbWFSZWdpc3RyeS5nZXREZWZhdWx0Q29tcG9uZW50RWxlbWVudE5hbWUoKSk7XG4gICAgaWYgKGRpcmVjdGl2ZVJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBgZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhYCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIHRoZSBARGlyZWN0aXZlIGhhcyBgaml0OiB0cnVlYC4gSW4gdGhpc1xuICAgICAgLy8gY2FzZSwgY29tcGlsYXRpb24gb2YgdGhlIGRlY29yYXRvciBpcyBza2lwcGVkLiBSZXR1cm5pbmcgYW4gZW1wdHkgb2JqZWN0IHNpZ25pZmllc1xuICAgICAgLy8gdGhhdCBubyBhbmFseXNpcyB3YXMgcHJvZHVjZWQuXG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLy8gTmV4dCwgcmVhZCB0aGUgYEBDb21wb25lbnRgLXNwZWNpZmljIGZpZWxkcy5cbiAgICBjb25zdCB7ZGVjb3JhdG9yOiBjb21wb25lbnQsIG1ldGFkYXRhfSA9IGRpcmVjdGl2ZVJlc3VsdDtcblxuICAgIC8vIEdvIHRocm91Z2ggdGhlIHJvb3QgZGlyZWN0b3JpZXMgZm9yIHRoaXMgcHJvamVjdCwgYW5kIHNlbGVjdCB0aGUgb25lIHdpdGggdGhlIHNtYWxsZXN0XG4gICAgLy8gcmVsYXRpdmUgcGF0aCByZXByZXNlbnRhdGlvbi5cbiAgICBjb25zdCByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aCA9IHRoaXMucm9vdERpcnMucmVkdWNlPHN0cmluZ3x1bmRlZmluZWQ+KChwcmV2aW91cywgcm9vdERpcikgPT4ge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcmVsYXRpdmUoYWJzb2x1dGVGcm9tKHJvb3REaXIpLCBhYnNvbHV0ZUZyb20oY29udGFpbmluZ0ZpbGUpKTtcbiAgICAgIGlmIChwcmV2aW91cyA9PT0gdW5kZWZpbmVkIHx8IGNhbmRpZGF0ZS5sZW5ndGggPCBwcmV2aW91cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cztcbiAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQpICE7XG5cbiAgICBjb25zdCB2aWV3UHJvdmlkZXJzOiBFeHByZXNzaW9ufG51bGwgPSBjb21wb25lbnQuaGFzKCd2aWV3UHJvdmlkZXJzJykgP1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciA/XG4gICAgICAgICAgICAgICAgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyhjb21wb25lbnQuZ2V0KCd2aWV3UHJvdmlkZXJzJykgISkgOlxuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5nZXQoJ3ZpZXdQcm92aWRlcnMnKSAhKSA6XG4gICAgICAgIG51bGw7XG5cbiAgICAvLyBQYXJzZSB0aGUgdGVtcGxhdGUuXG4gICAgLy8gSWYgYSBwcmVhbmFseXplIHBoYXNlIHdhcyBleGVjdXRlZCwgdGhlIHRlbXBsYXRlIG1heSBhbHJlYWR5IGV4aXN0IGluIHBhcnNlZCBmb3JtLCBzbyBjaGVja1xuICAgIC8vIHRoZSBwcmVhbmFseXplVGVtcGxhdGVDYWNoZS5cbiAgICAvLyBFeHRyYWN0IGEgY2xvc3VyZSBvZiB0aGUgdGVtcGxhdGUgcGFyc2luZyBjb2RlIHNvIHRoYXQgaXQgY2FuIGJlIHJlcGFyc2VkIHdpdGggZGlmZmVyZW50XG4gICAgLy8gb3B0aW9ucyBpZiBuZWVkZWQsIGxpa2UgaW4gdGhlIGluZGV4aW5nIHBpcGVsaW5lLlxuICAgIGxldCBwYXJzZVRlbXBsYXRlOiAob3B0aW9ucz86IFBhcnNlVGVtcGxhdGVPcHRpb25zKSA9PiBQYXJzZWRUZW1wbGF0ZTtcbiAgICAvLyBUcmFjayB0aGUgb3JpZ2luIG9mIHRoZSB0ZW1wbGF0ZSB0byBkZXRlcm1pbmUgaG93IHRoZSBQYXJzZVNvdXJjZVNwYW5zIHNob3VsZCBiZSBpbnRlcnByZXRlZC5cbiAgICBsZXQgdGVtcGxhdGVTb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gICAgaWYgKHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUgd2FzIHBhcnNlZCBpbiBwcmVhbmFseXplLiBVc2UgaXQgYW5kIGRlbGV0ZSBpdCB0byBzYXZlIG1lbW9yeS5cbiAgICAgIGNvbnN0IHByZWFuYWx5emVkID0gdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5nZXQobm9kZSkgITtcbiAgICAgIHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuZGVsZXRlKG5vZGUpO1xuXG4gICAgICBwYXJzZVRlbXBsYXRlID0gcHJlYW5hbHl6ZWQucGFyc2VUZW1wbGF0ZTtcbiAgICAgIHRlbXBsYXRlU291cmNlTWFwcGluZyA9IHByZWFuYWx5emVkLnRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIHRlbXBsYXRlIHdhcyBub3QgYWxyZWFkeSBwYXJzZWQuIEVpdGhlciB0aGVyZSdzIGEgdGVtcGxhdGVVcmwsIG9yIGFuIGlubGluZSB0ZW1wbGF0ZS5cbiAgICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykgITtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVVcmwgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZVVybEV4cHIpO1xuICAgICAgICBpZiAodHlwZW9mIHRlbXBsYXRlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZVVybEV4cHIsICd0ZW1wbGF0ZVVybCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgY29uc3QgZXh0ZXJuYWwgPVxuICAgICAgICAgICAgdGhpcy5fZXh0cmFjdEV4dGVybmFsVGVtcGxhdGUobm9kZSwgY29tcG9uZW50LCB0ZW1wbGF0ZVVybEV4cHIsIHJlc291cmNlVXJsKTtcblxuICAgICAgICBwYXJzZVRlbXBsYXRlID0gZXh0ZXJuYWwucGFyc2VUZW1wbGF0ZTtcbiAgICAgICAgdGVtcGxhdGVTb3VyY2VNYXBwaW5nID0gZXh0ZXJuYWwudGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRXhwZWN0IGFuIGlubGluZSB0ZW1wbGF0ZSB0byBiZSBwcmVzZW50LlxuICAgICAgICBjb25zdCBpbmxpbmUgPSB0aGlzLl9leHRyYWN0SW5saW5lVGVtcGxhdGUobm9kZSwgZGVjb3JhdG9yLCBjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKTtcblxuICAgICAgICBwYXJzZVRlbXBsYXRlID0gaW5saW5lLnBhcnNlVGVtcGxhdGU7XG4gICAgICAgIHRlbXBsYXRlU291cmNlTWFwcGluZyA9IGlubGluZS50ZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlID0gcGFyc2VUZW1wbGF0ZSgpO1xuXG4gICAgaWYgKHRlbXBsYXRlLmVycm9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEVycm9ycyBwYXJzaW5nIHRlbXBsYXRlOiAke3RlbXBsYXRlLmVycm9ycy5tYXAoZSA9PiBlLnRvU3RyaW5nKCkpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuXG4gICAgLy8gRmlndXJlIG91dCB0aGUgc2V0IG9mIHN0eWxlcy4gVGhlIG9yZGVyaW5nIGhlcmUgaXMgaW1wb3J0YW50OiBleHRlcm5hbCByZXNvdXJjZXMgKHN0eWxlVXJscylcbiAgICAvLyBwcmVjZWRlIGlubGluZSBzdHlsZXMsIGFuZCBzdHlsZXMgZGVmaW5lZCBpbiB0aGUgdGVtcGxhdGUgb3ZlcnJpZGUgc3R5bGVzIGRlZmluZWQgaW4gdGhlXG4gICAgLy8gY29tcG9uZW50LlxuICAgIGxldCBzdHlsZXM6IHN0cmluZ1tdfG51bGwgPSBudWxsO1xuXG4gICAgY29uc3Qgc3R5bGVVcmxzID0gdGhpcy5fZXh0cmFjdFN0eWxlVXJscyhjb21wb25lbnQsIHRlbXBsYXRlLnN0eWxlVXJscyk7XG4gICAgaWYgKHN0eWxlVXJscyAhPT0gbnVsbCkge1xuICAgICAgaWYgKHN0eWxlcyA9PT0gbnVsbCkge1xuICAgICAgICBzdHlsZXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qgc3R5bGVVcmwgb2Ygc3R5bGVVcmxzKSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5yZXNvdXJjZUxvYWRlci5yZXNvbHZlKHN0eWxlVXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgIGNvbnN0IHJlc291cmNlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHJlc291cmNlVXJsKTtcbiAgICAgICAgc3R5bGVzLnB1c2gocmVzb3VyY2VTdHIpO1xuICAgICAgICBpZiAodGhpcy5kZXBUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhpcy5kZXBUcmFja2VyLmFkZFJlc291cmNlRGVwZW5kZW5jeShub2RlLmdldFNvdXJjZUZpbGUoKSwgcmVzb3VyY2VVcmwpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjb21wb25lbnQuaGFzKCdzdHlsZXMnKSkge1xuICAgICAgY29uc3QgbGl0U3R5bGVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoY29tcG9uZW50LCAnc3R5bGVzJywgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgaWYgKGxpdFN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoc3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgICAgc3R5bGVzID0gbGl0U3R5bGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0eWxlcy5wdXNoKC4uLmxpdFN0eWxlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlLnN0eWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAoc3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgIHN0eWxlcyA9IHRlbXBsYXRlLnN0eWxlcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0eWxlcy5wdXNoKC4uLnRlbXBsYXRlLnN0eWxlcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZW5jYXBzdWxhdGlvbjogbnVtYmVyID1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZUVudW1WYWx1ZShjb21wb25lbnQsICdlbmNhcHN1bGF0aW9uJywgJ1ZpZXdFbmNhcHN1bGF0aW9uJykgfHwgMDtcblxuICAgIGNvbnN0IGNoYW5nZURldGVjdGlvbjogbnVtYmVyfG51bGwgPVxuICAgICAgICB0aGlzLl9yZXNvbHZlRW51bVZhbHVlKGNvbXBvbmVudCwgJ2NoYW5nZURldGVjdGlvbicsICdDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneScpO1xuXG4gICAgbGV0IGFuaW1hdGlvbnM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ2FuaW1hdGlvbnMnKSkge1xuICAgICAgYW5pbWF0aW9ucyA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY29tcG9uZW50LmdldCgnYW5pbWF0aW9ucycpICEpO1xuICAgIH1cblxuICAgIGNvbnN0IG91dHB1dDogQW5hbHlzaXNPdXRwdXQ8Q29tcG9uZW50QW5hbHlzaXNEYXRhPiA9IHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIGJhc2VDbGFzczogcmVhZEJhc2VDbGFzcyhub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpLFxuICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgLi4ubWV0YWRhdGEsXG4gICAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgICAgZW5jYXBzdWxhdGlvbixcbiAgICAgICAgICBpbnRlcnBvbGF0aW9uOiB0ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uLFxuICAgICAgICAgIHN0eWxlczogc3R5bGVzIHx8IFtdLFxuXG4gICAgICAgICAgLy8gVGhlc2Ugd2lsbCBiZSByZXBsYWNlZCBkdXJpbmcgdGhlIGNvbXBpbGF0aW9uIHN0ZXAsIGFmdGVyIGFsbCBgTmdNb2R1bGVgcyBoYXZlIGJlZW5cbiAgICAgICAgICAvLyBhbmFseXplZCBhbmQgdGhlIGZ1bGwgY29tcGlsYXRpb24gc2NvcGUgZm9yIHRoZSBjb21wb25lbnQgY2FuIGJlIHJlYWxpemVkLlxuICAgICAgICAgIGFuaW1hdGlvbnMsXG4gICAgICAgICAgdmlld1Byb3ZpZGVycyxcbiAgICAgICAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IHRoaXMuaTE4blVzZUV4dGVybmFsSWRzLCByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aCxcbiAgICAgICAgfSxcbiAgICAgICAgZ3VhcmRzOiBleHRyYWN0RGlyZWN0aXZlR3VhcmRzKG5vZGUsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpLFxuICAgICAgICBwYXJzZWRUZW1wbGF0ZTogdGVtcGxhdGUsIHBhcnNlVGVtcGxhdGUsIHRlbXBsYXRlU291cmNlTWFwcGluZyxcbiAgICAgIH0sXG4gICAgfTtcbiAgICBpZiAoY2hhbmdlRGV0ZWN0aW9uICE9PSBudWxsKSB7XG4gICAgICBvdXRwdXQuYW5hbHlzaXMgIS5tZXRhLmNoYW5nZURldGVjdGlvbiA9IGNoYW5nZURldGVjdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRBbmFseXNpc0RhdGEpOiB2b2lkIHtcbiAgICAvLyBSZWdpc3RlciB0aGlzIGNvbXBvbmVudCdzIGluZm9ybWF0aW9uIHdpdGggdGhlIGBNZXRhZGF0YVJlZ2lzdHJ5YC4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbXBvbmVudCBpcyBhdmFpbGFibGUgZHVyaW5nIHRoZSBjb21waWxlKCkgcGhhc2UuXG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShub2RlKTtcbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKHtcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IG5vZGUubmFtZS50ZXh0LFxuICAgICAgc2VsZWN0b3I6IGFuYWx5c2lzLm1ldGEuc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogYW5hbHlzaXMubWV0YS5leHBvcnRBcyxcbiAgICAgIGlucHV0czogYW5hbHlzaXMubWV0YS5pbnB1dHMsXG4gICAgICBvdXRwdXRzOiBhbmFseXNpcy5tZXRhLm91dHB1dHMsXG4gICAgICBxdWVyaWVzOiBhbmFseXNpcy5tZXRhLnF1ZXJpZXMubWFwKHF1ZXJ5ID0+IHF1ZXJ5LnByb3BlcnR5TmFtZSksXG4gICAgICBpc0NvbXBvbmVudDogdHJ1ZSxcbiAgICAgIGJhc2VDbGFzczogYW5hbHlzaXMuYmFzZUNsYXNzLCAuLi5hbmFseXNpcy5ndWFyZHMsXG4gICAgfSk7XG4gIH1cblxuICBpbmRleChcbiAgICAgIGNvbnRleHQ6IEluZGV4aW5nQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pIHtcbiAgICAvLyBUaGUgY29tcG9uZW50IHRlbXBsYXRlIG1heSBoYXZlIGJlZW4gcHJldmlvdXNseSBwYXJzZWQgd2l0aG91dCBwcmVzZXJ2aW5nIHdoaXRlc3BhY2Ugb3Igd2l0aFxuICAgIC8vIGBsZWFkaW5nVHJpdmlhQ2hhcmBzLCBib3RoIG9mIHdoaWNoIG1heSBtYW5pcHVsYXRlIHRoZSBBU1QgaW50byBhIGZvcm0gbm90IHJlcHJlc2VudGF0aXZlIG9mXG4gICAgLy8gdGhlIHNvdXJjZSBjb2RlLCBtYWtpbmcgaXQgdW5zdWl0YWJsZSBmb3IgaW5kZXhpbmcuIFRoZSB0ZW1wbGF0ZSBpcyByZXBhcnNlZCB3aXRoIHByZXNlcnZpbmdcbiAgICAvLyBvcHRpb25zIHRvIHJlbWVkeSB0aGlzLlxuICAgIGNvbnN0IHRlbXBsYXRlID0gYW5hbHlzaXMucGFyc2VUZW1wbGF0ZSh7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICB9KTtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBhbmFseXNpcy5tZXRhLnNlbGVjdG9yO1xuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGlmIChkaXJlY3RpdmUuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgIGNvbnN0IGJvdW5kVGVtcGxhdGUgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IHRlbXBsYXRlLm5vZGVzfSk7XG5cbiAgICBjb250ZXh0LmFkZENvbXBvbmVudCh7XG4gICAgICBkZWNsYXJhdGlvbjogbm9kZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgYm91bmRUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlTWV0YToge1xuICAgICAgICBpc0lubGluZTogdGVtcGxhdGUuaXNJbmxpbmUsXG4gICAgICAgIGZpbGU6IHRlbXBsYXRlLmZpbGUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgdHlwZUNoZWNrKGN0eDogVHlwZUNoZWNrQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPik6XG4gICAgICB2b2lkIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRoZXJlIGFyZSBpc3N1ZXMgd2l0aCBwYXJzaW5nIHRoZSB0ZW1wbGF0ZSB1bmRlciBjZXJ0YWluIGNvbmZpZ3VyYXRpb25zIChuYW1lbHkgd2l0aFxuICAgIC8vIGBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBmYWxzZWApIHdoaWNoIGNhdXNlIGluYWNjdXJhdGUgcG9zaXRpb25hbCBpbmZvcm1hdGlvbiB3aXRoaW4gdGhlXG4gICAgLy8gdGVtcGxhdGUgQVNULCBwYXJ0aWN1bGFybHkgd2l0aGluIGludGVycG9sYXRpb24gZXhwcmVzc2lvbnMuXG4gICAgLy9cbiAgICAvLyBUbyB3b3JrIGFyb3VuZCB0aGlzLCB0aGUgdGVtcGxhdGUgaXMgcmUtcGFyc2VkIHdpdGggc2V0dGluZ3MgdGhhdCBndWFyYW50ZWUgdGhlIHNwYW5zIGFyZSBhc1xuICAgIC8vIGFjY3VyYXRlIGFzIHBvc3NpYmxlLiBUaGlzIGlzIG9ubHkgYSB0ZW1wb3Jhcnkgc29sdXRpb24gdW50aWwgdGhlIHdoaXRlc3BhY2UgcmVtb3ZhbCBzdGVwIGNhblxuICAgIC8vIGJlIHJld3JpdHRlbiBhcyBhIHRyYW5zZm9ybSBhZ2FpbnN0IHRoZSBleHByZXNzaW9uIEFTVCBpbnN0ZWFkIG9mIGFnYWluc3QgdGhlIEhUTUwgQVNULlxuICAgIC8vXG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgdGhpcyB3aGVuIHdoaXRlc3BhY2UgcmVtb3ZhbCBubyBsb25nZXIgY29ycnVwdHMgc3BhbiBpbmZvcm1hdGlvbi5cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IG1ldGEucGFyc2VUZW1wbGF0ZSh7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgY29uc3QgcGlwZXMgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+PigpO1xuICAgIGxldCBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdID0gW107XG5cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IG1ldGEgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBpZiAobWV0YS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IGV4dE1ldGEgPSBmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGEodGhpcy5tZXRhUmVhZGVyLCBtZXRhLnJlZik7XG4gICAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShtZXRhLnNlbGVjdG9yKSwgZXh0TWV0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qge25hbWUsIHJlZn0gb2Ygc2NvcGUuY29tcGlsYXRpb24ucGlwZXMpIHtcbiAgICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmLm5vZGUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBub24tY2xhc3MgZGVjbGFyYXRpb24gJHt0cy5TeW50YXhLaW5kW3JlZi5ub2RlLmtpbmRdfSBmb3IgcGlwZSAke3JlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcGlwZXMuc2V0KG5hbWUsIHJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pO1xuICAgICAgfVxuICAgICAgc2NoZW1hcyA9IHNjb3BlLnNjaGVtYXM7XG4gICAgfVxuXG4gICAgY29uc3QgYm91bmQgPSBuZXcgUjNUYXJnZXRCaW5kZXIobWF0Y2hlcikuYmluZCh7dGVtcGxhdGU6IHRlbXBsYXRlLm5vZGVzfSk7XG4gICAgY3R4LmFkZFRlbXBsYXRlKFxuICAgICAgICBuZXcgUmVmZXJlbmNlKG5vZGUpLCBib3VuZCwgcGlwZXMsIHNjaGVtYXMsIG1ldGEudGVtcGxhdGVTb3VyY2VNYXBwaW5nLCB0ZW1wbGF0ZS5maWxlKTtcbiAgfVxuXG4gIHJlc29sdmUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PENvbXBvbmVudEFuYWx5c2lzRGF0YT4pOlxuICAgICAgUmVzb2x2ZVJlc3VsdDxDb21wb25lbnRSZXNvbHV0aW9uRGF0YT4ge1xuICAgIGNvbnN0IGNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgY29tcG9uZW50IHdhcyByZWdpc3RlcmVkIHdpdGggYW4gTmdNb2R1bGUuIElmIHNvLCBpdCBzaG91bGQgYmUgY29tcGlsZWRcbiAgICAvLyB1bmRlciB0aGF0IG1vZHVsZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChub2RlKTtcbiAgICBsZXQgbWV0YWRhdGEgPSBhbmFseXNpcy5tZXRhIGFzIFJlYWRvbmx5PFIzQ29tcG9uZW50TWV0YWRhdGE+O1xuXG4gICAgY29uc3QgZGF0YTogQ29tcG9uZW50UmVzb2x1dGlvbkRhdGEgPSB7XG4gICAgICBkaXJlY3RpdmVzOiBFTVBUWV9BUlJBWSxcbiAgICAgIHBpcGVzOiBFTVBUWV9NQVAsXG4gICAgICB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlOiBmYWxzZSxcbiAgICB9O1xuXG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIHJlc29sdmUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICAvL1xuICAgICAgLy8gRmlyc3QgaXQgbmVlZHMgdG8gYmUgZGV0ZXJtaW5lZCBpZiBhY3R1YWxseSBpbXBvcnRpbmcgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgdXNlZCBpbiB0aGVcbiAgICAgIC8vIHRlbXBsYXRlIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLiBDdXJyZW50bHkgbmd0c2MgcmVmdXNlcyB0byBnZW5lcmF0ZSBjeWNsZXMsIHNvIGFuIG9wdGlvblxuICAgICAgLy8ga25vd24gYXMgXCJyZW1vdGUgc2NvcGluZ1wiIGlzIHVzZWQgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLiBJbiByZW1vdGUgc2NvcGluZywgdGhlXG4gICAgICAvLyBtb2R1bGUgZmlsZSBzZXRzIHRoZSBkaXJlY3RpdmVzL3BpcGVzIG9uIHRoZSDJtWNtcCBvZiB0aGUgY29tcG9uZW50LCB3aXRob3V0XG4gICAgICAvLyByZXF1aXJpbmcgbmV3IGltcG9ydHMgKGJ1dCBhbHNvIGluIGEgd2F5IHRoYXQgYnJlYWtzIHRyZWUgc2hha2luZykuXG4gICAgICAvL1xuICAgICAgLy8gRGV0ZXJtaW5pbmcgdGhpcyBpcyBjaGFsbGVuZ2luZywgYmVjYXVzZSB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyByZXNwb25zaWJsZSBmb3JcbiAgICAgIC8vIG1hdGNoaW5nIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSB0ZW1wbGF0ZTsgaG93ZXZlciwgdGhhdCBkb2Vzbid0IHJ1biB1bnRpbCB0aGUgYWN0dWFsXG4gICAgICAvLyBjb21waWxlKCkgc3RlcC4gSXQncyBub3QgcG9zc2libGUgdG8gcnVuIHRlbXBsYXRlIGNvbXBpbGF0aW9uIHNvb25lciBhcyBpdCByZXF1aXJlcyB0aGVcbiAgICAgIC8vIENvbnN0YW50UG9vbCBmb3IgdGhlIG92ZXJhbGwgZmlsZSBiZWluZyBjb21waWxlZCAod2hpY2ggaXNuJ3QgYXZhaWxhYmxlIHVudGlsIHRoZSB0cmFuc2Zvcm1cbiAgICAgIC8vIHN0ZXApLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQsIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIG1hdGNoZWQgaW5kZXBlbmRlbnRseSBoZXJlLCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXMgaXNcbiAgICAgIC8vIGFuIGFsdGVybmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIHRlbXBsYXRlIG1hdGNoaW5nIHdoaWNoIGlzIHVzZWQgZm9yIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmdcbiAgICAgIC8vIGFuZCB3aWxsIGV2ZW50dWFsbHkgcmVwbGFjZSBtYXRjaGluZyBpbiB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlci5cblxuXG4gICAgICAvLyBTZXQgdXAgdGhlIFIzVGFyZ2V0QmluZGVyLCBhcyB3ZWxsIGFzIGEgJ2RpcmVjdGl2ZXMnIGFycmF5IGFuZCBhICdwaXBlcycgbWFwIHRoYXQgYXJlIGxhdGVyXG4gICAgICAvLyBmZWQgdG8gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuIEZpcnN0LCBhIFNlbGVjdG9yTWF0Y2hlciBpcyBjb25zdHJ1Y3RlZCB0byBtYXRjaFxuICAgICAgLy8gZGlyZWN0aXZlcyB0aGF0IGFyZSBpbiBzY29wZS5cbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGEme2V4cHJlc3Npb246IEV4cHJlc3Npb259PigpO1xuICAgICAgY29uc3QgZGlyZWN0aXZlczoge3NlbGVjdG9yOiBzdHJpbmcsIGV4cHJlc3Npb246IEV4cHJlc3Npb259W10gPSBbXTtcblxuICAgICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCB7cmVmLCBzZWxlY3Rvcn0gPSBkaXI7XG4gICAgICAgIGlmIChzZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChyZWYsIGNvbnRleHQpO1xuICAgICAgICAgIGRpcmVjdGl2ZXMucHVzaCh7c2VsZWN0b3IsIGV4cHJlc3Npb259KTtcbiAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKHNlbGVjdG9yKSwgey4uLmRpciwgZXhwcmVzc2lvbn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuICAgICAgZm9yIChjb25zdCBwaXBlIG9mIHNjb3BlLmNvbXBpbGF0aW9uLnBpcGVzKSB7XG4gICAgICAgIHBpcGVzLnNldChwaXBlLm5hbWUsIHRoaXMucmVmRW1pdHRlci5lbWl0KHBpcGUucmVmLCBjb250ZXh0KSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5leHQsIHRoZSBjb21wb25lbnQgdGVtcGxhdGUgQVNUIGlzIGJvdW5kIHVzaW5nIHRoZSBSM1RhcmdldEJpbmRlci4gVGhpcyBwcm9kdWNlcyBhblxuICAgICAgLy8gQm91bmRUYXJnZXQsIHdoaWNoIGlzIHNpbWlsYXIgdG8gYSB0cy5UeXBlQ2hlY2tlci5cbiAgICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihtYXRjaGVyKTtcbiAgICAgIGNvbnN0IGJvdW5kID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlOiBtZXRhZGF0YS50ZW1wbGF0ZS5ub2Rlc30pO1xuXG4gICAgICAvLyBUaGUgQm91bmRUYXJnZXQga25vd3Mgd2hpY2ggZGlyZWN0aXZlcyBhbmQgcGlwZXMgbWF0Y2hlZCB0aGUgdGVtcGxhdGUuXG4gICAgICBjb25zdCB1c2VkRGlyZWN0aXZlcyA9IGJvdW5kLmdldFVzZWREaXJlY3RpdmVzKCk7XG4gICAgICBjb25zdCB1c2VkUGlwZXMgPSBib3VuZC5nZXRVc2VkUGlwZXMoKS5tYXAobmFtZSA9PiBwaXBlcy5nZXQobmFtZSkgISk7XG5cbiAgICAgIC8vIFNjYW4gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcy9waXBlcyBhY3R1YWxseSB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgY2hlY2sgd2hldGhlciBhbnlcbiAgICAgIC8vIGltcG9ydCB3aGljaCBuZWVkcyB0byBiZSBnZW5lcmF0ZWQgd291bGQgY3JlYXRlIGEgY3ljbGUuXG4gICAgICBjb25zdCBjeWNsZURldGVjdGVkID1cbiAgICAgICAgICB1c2VkRGlyZWN0aXZlcy5zb21lKGRpciA9PiB0aGlzLl9pc0N5Y2xpY0ltcG9ydChkaXIuZXhwcmVzc2lvbiwgY29udGV4dCkpIHx8XG4gICAgICAgICAgdXNlZFBpcGVzLnNvbWUocGlwZSA9PiB0aGlzLl9pc0N5Y2xpY0ltcG9ydChwaXBlLCBjb250ZXh0KSk7XG5cbiAgICAgIGlmICghY3ljbGVEZXRlY3RlZCkge1xuICAgICAgICAvLyBObyBjeWNsZSB3YXMgZGV0ZWN0ZWQuIFJlY29yZCB0aGUgaW1wb3J0cyB0aGF0IG5lZWQgdG8gYmUgY3JlYXRlZCBpbiB0aGUgY3ljbGUgZGV0ZWN0b3JcbiAgICAgICAgLy8gc28gdGhhdCBmdXR1cmUgY3ljbGljIGltcG9ydCBjaGVja3MgY29uc2lkZXIgdGhlaXIgcHJvZHVjdGlvbi5cbiAgICAgICAgZm9yIChjb25zdCB7ZXhwcmVzc2lvbn0gb2YgdXNlZERpcmVjdGl2ZXMpIHtcbiAgICAgICAgICB0aGlzLl9yZWNvcmRTeW50aGV0aWNJbXBvcnQoZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBwaXBlIG9mIHVzZWRQaXBlcykge1xuICAgICAgICAgIHRoaXMuX3JlY29yZFN5bnRoZXRpY0ltcG9ydChwaXBlLCBjb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGFycmF5cyBpbiDJtWNtcCBuZWVkIHRvIGJlIHdyYXBwZWQgaW4gY2xvc3VyZXMuXG4gICAgICAgIC8vIFRoaXMgaXMgcmVxdWlyZWQgaWYgYW55IGRpcmVjdGl2ZS9waXBlIHJlZmVyZW5jZSBpcyB0byBhIGRlY2xhcmF0aW9uIGluIHRoZSBzYW1lIGZpbGUgYnV0XG4gICAgICAgIC8vIGRlY2xhcmVkIGFmdGVyIHRoaXMgY29tcG9uZW50LlxuICAgICAgICBjb25zdCB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID1cbiAgICAgICAgICAgIHVzZWREaXJlY3RpdmVzLnNvbWUoXG4gICAgICAgICAgICAgICAgZGlyID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoZGlyLmV4cHJlc3Npb24sIG5vZGUubmFtZSwgY29udGV4dCkpIHx8XG4gICAgICAgICAgICB1c2VkUGlwZXMuc29tZShwaXBlID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocGlwZSwgbm9kZS5uYW1lLCBjb250ZXh0KSk7XG5cbiAgICAgICAgLy8gQWN0dWFsIGNvbXBpbGF0aW9uIHN0aWxsIHVzZXMgdGhlIGZ1bGwgc2NvcGUsIG5vdCB0aGUgbmFycm93ZWQgc2NvcGUgZGV0ZXJtaW5lZCBieVxuICAgICAgICAvLyBSM1RhcmdldEJpbmRlci4gVGhpcyBpcyBhIGhlZGdlIGFnYWluc3QgcG90ZW50aWFsIGlzc3VlcyB3aXRoIHRoZSBSM1RhcmdldEJpbmRlciAtIHJpZ2h0XG4gICAgICAgIC8vIG5vdyB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyB0aGUgXCJzb3VyY2Ugb2YgdHJ1dGhcIiBmb3Igd2hpY2ggZGlyZWN0aXZlcy9waXBlcyBhcmVcbiAgICAgICAgLy8gYWN0dWFsbHkgdXNlZCAodGhvdWdoIHRoZSB0d28gc2hvdWxkIGFncmVlIHBlcmZlY3RseSkuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE8oYWx4aHViKTogc3dpdGNoIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIgb3ZlciB0byB1c2luZyBSM1RhcmdldEJpbmRlciBkaXJlY3RseS5cbiAgICAgICAgZGF0YS5kaXJlY3RpdmVzID0gZGlyZWN0aXZlcztcbiAgICAgICAgZGF0YS5waXBlcyA9IHBpcGVzO1xuICAgICAgICBkYXRhLndyYXBEaXJlY3RpdmVzQW5kUGlwZXNJbkNsb3N1cmUgPSB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGVjbGFyaW5nIHRoZSBkaXJlY3RpdmVEZWZzL3BpcGVEZWZzIGFycmF5cyBkaXJlY3RseSB3b3VsZCByZXF1aXJlIGltcG9ydHMgdGhhdCB3b3VsZFxuICAgICAgICAvLyBjcmVhdGUgYSBjeWNsZS4gSW5zdGVhZCwgbWFyayB0aGlzIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcsIHNvIHRoYXQgdGhlXG4gICAgICAgIC8vIE5nTW9kdWxlIGZpbGUgd2lsbCB0YWtlIGNhcmUgb2Ygc2V0dGluZyB0aGUgZGlyZWN0aXZlcyBmb3IgdGhlIGNvbXBvbmVudC5cbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LnNldENvbXBvbmVudEFzUmVxdWlyaW5nUmVtb3RlU2NvcGluZyhub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtkYXRhfTtcbiAgfVxuXG4gIGNvbXBpbGUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8Q29tcG9uZW50QW5hbHlzaXNEYXRhPixcbiAgICAgIHJlc29sdXRpb246IFJlYWRvbmx5PENvbXBvbmVudFJlc29sdXRpb25EYXRhPiwgcG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBtZXRhOiBSM0NvbXBvbmVudE1ldGFkYXRhID0gey4uLmFuYWx5c2lzLm1ldGEsIC4uLnJlc29sdXRpb259O1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgY29uc3QgZmFjdG9yeVJlcyA9IGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZChcbiAgICAgICAgey4uLm1ldGEsIGluamVjdEZuOiBJZGVudGlmaWVycy5kaXJlY3RpdmVJbmplY3QsIHRhcmdldDogUjNGYWN0b3J5VGFyZ2V0LkNvbXBvbmVudH0pO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIGZhY3RvcnlSZXMuc3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICBmYWN0b3J5UmVzLCB7XG4gICAgICAgIG5hbWU6ICfJtWNtcCcsXG4gICAgICAgIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IHJlcy50eXBlLFxuICAgICAgfVxuICAgIF07XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3I6IERlY29yYXRvcik6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBpZiAodGhpcy5saXRlcmFsQ2FjaGUuaGFzKGRlY29yYXRvcikpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpdGVyYWxDYWNoZS5nZXQoZGVjb3JhdG9yKSAhO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQ29tcG9uZW50IGRlY29yYXRvcmApO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSwgYERlY29yYXRvciBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuc2V0KGRlY29yYXRvciwgbWV0YSk7XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlRW51bVZhbHVlKFxuICAgICAgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZW51bVN5bWJvbE5hbWU6IHN0cmluZyk6IG51bWJlcnxudWxsIHtcbiAgICBsZXQgcmVzb2x2ZWQ6IG51bWJlcnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcyhmaWVsZCkpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KGZpZWxkKSAhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKSBhcyBhbnk7XG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbnVtVmFsdWUgJiYgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSh2YWx1ZS5lbnVtUmVmLCBlbnVtU3ltYm9sTmFtZSkpIHtcbiAgICAgICAgcmVzb2x2ZWQgPSB2YWx1ZS5yZXNvbHZlZCBhcyBudW1iZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsXG4gICAgICAgICAgICBgJHtmaWVsZH0gbXVzdCBiZSBhIG1lbWJlciBvZiAke2VudW1TeW1ib2xOYW1lfSBlbnVtIGZyb20gQGFuZ3VsYXIvY29yZWApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0U3R5bGVVcmxzKGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGV4dHJhVXJsczogc3RyaW5nW10pOlxuICAgICAgc3RyaW5nW118bnVsbCB7XG4gICAgaWYgKCFjb21wb25lbnQuaGFzKCdzdHlsZVVybHMnKSkge1xuICAgICAgcmV0dXJuIGV4dHJhVXJscy5sZW5ndGggPiAwID8gZXh0cmFVcmxzIDogbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZVVybHNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVVcmxzJykgITtcbiAgICBjb25zdCBzdHlsZVVybHMgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShzdHlsZVVybHNFeHByKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoc3R5bGVVcmxzKSB8fCAhc3R5bGVVcmxzLmV2ZXJ5KHVybCA9PiB0eXBlb2YgdXJsID09PSAnc3RyaW5nJykpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHN0eWxlVXJsc0V4cHIsICdzdHlsZVVybHMgbXVzdCBiZSBhbiBhcnJheSBvZiBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHN0eWxlVXJscy5wdXNoKC4uLmV4dHJhVXJscyk7XG4gICAgcmV0dXJuIHN0eWxlVXJscyBhcyBzdHJpbmdbXTtcbiAgfVxuXG4gIHByaXZhdGUgX3ByZWxvYWRBbmRQYXJzZVRlbXBsYXRlKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICBjb250YWluaW5nRmlsZTogc3RyaW5nKTogUHJvbWlzZTxQYXJzZWRUZW1wbGF0ZXxudWxsPiB7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgIC8vIEV4dHJhY3QgdGhlIHRlbXBsYXRlVXJsIGFuZCBwcmVsb2FkIGl0LlxuICAgICAgY29uc3QgdGVtcGxhdGVVcmxFeHByID0gY29tcG9uZW50LmdldCgndGVtcGxhdGVVcmwnKSAhO1xuICAgICAgY29uc3QgdGVtcGxhdGVVcmwgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZVVybEV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZVVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZVVybEV4cHIsICd0ZW1wbGF0ZVVybCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZSh0ZW1wbGF0ZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgY29uc3QgdGVtcGxhdGVQcm9taXNlID0gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkKHJlc291cmNlVXJsKTtcblxuICAgICAgLy8gSWYgdGhlIHByZWxvYWQgd29ya2VkLCB0aGVuIGFjdHVhbGx5IGxvYWQgYW5kIHBhcnNlIHRoZSB0ZW1wbGF0ZSwgYW5kIHdhaXQgZm9yIGFueSBzdHlsZVxuICAgICAgLy8gVVJMcyB0byByZXNvbHZlLlxuICAgICAgaWYgKHRlbXBsYXRlUHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZVByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3Qge3BhcnNlVGVtcGxhdGUsIHRlbXBsYXRlU291cmNlTWFwcGluZ30gPVxuICAgICAgICAgICAgICB0aGlzLl9leHRyYWN0RXh0ZXJuYWxUZW1wbGF0ZShub2RlLCBjb21wb25lbnQsIHRlbXBsYXRlVXJsRXhwciwgcmVzb3VyY2VVcmwpO1xuICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gcGFyc2VUZW1wbGF0ZSgpO1xuICAgICAgICAgIHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuc2V0KFxuICAgICAgICAgICAgICBub2RlLCB7Li4udGVtcGxhdGUsIHBhcnNlVGVtcGxhdGUsIHRlbXBsYXRlU291cmNlTWFwcGluZ30pO1xuICAgICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB7cGFyc2VUZW1wbGF0ZSwgdGVtcGxhdGVTb3VyY2VNYXBwaW5nfSA9XG4gICAgICAgICAgdGhpcy5fZXh0cmFjdElubGluZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUoKTtcbiAgICAgIHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuc2V0KG5vZGUsIHsuLi50ZW1wbGF0ZSwgcGFyc2VUZW1wbGF0ZSwgdGVtcGxhdGVTb3VyY2VNYXBwaW5nfSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRlbXBsYXRlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0RXh0ZXJuYWxUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIHRlbXBsYXRlVXJsRXhwcjogdHMuRXhwcmVzc2lvbixcbiAgICAgIHJlc291cmNlVXJsOiBzdHJpbmcpOiB7XG4gICAgcGFyc2VUZW1wbGF0ZTogKG9wdGlvbnM/OiBQYXJzZVRlbXBsYXRlT3B0aW9ucykgPT4gUGFyc2VkVGVtcGxhdGU7XG4gICAgdGVtcGxhdGVTb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmdcbiAgfSB7XG4gICAgY29uc3QgdGVtcGxhdGVTdHIgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQocmVzb3VyY2VVcmwpO1xuICAgIGlmICh0aGlzLmRlcFRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuZGVwVHJhY2tlci5hZGRSZXNvdXJjZURlcGVuZGVuY3kobm9kZS5nZXRTb3VyY2VGaWxlKCksIHJlc291cmNlVXJsKTtcbiAgICB9XG4gICAgY29uc3QgcGFyc2VUZW1wbGF0ZSA9IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IHRoaXMuX3BhcnNlVGVtcGxhdGUoXG4gICAgICAgIGNvbXBvbmVudCwgdGVtcGxhdGVTdHIsIHNvdXJjZU1hcFVybChyZXNvdXJjZVVybCksXG4gICAgICAgIC8qIHRlbXBsYXRlUmFuZ2UgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBlc2NhcGVkU3RyaW5nICovIGZhbHNlLCBvcHRpb25zKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZyA9IHtcbiAgICAgIHR5cGU6ICdleHRlcm5hbCcsXG4gICAgICBjb21wb25lbnRDbGFzczogbm9kZSxcbiAgICAgIG5vZGU6IHRlbXBsYXRlVXJsRXhwcixcbiAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVN0cixcbiAgICAgIHRlbXBsYXRlVXJsOiByZXNvdXJjZVVybCxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtwYXJzZVRlbXBsYXRlLCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmd9O1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdElubGluZVRlbXBsYXRlKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICBjb250YWluaW5nRmlsZTogc3RyaW5nKToge1xuICAgIHBhcnNlVGVtcGxhdGU6IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IFBhcnNlZFRlbXBsYXRlO1xuICAgIHRlbXBsYXRlU291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nXG4gIH0ge1xuICAgIGlmICghY29tcG9uZW50LmhhcygndGVtcGxhdGUnKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5DT01QT05FTlRfTUlTU0lOR19URU1QTEFURSwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgICdjb21wb25lbnQgaXMgbWlzc2luZyBhIHRlbXBsYXRlJyk7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlJykgITtcblxuICAgIGxldCB0ZW1wbGF0ZVN0cjogc3RyaW5nO1xuICAgIGxldCB0ZW1wbGF0ZVVybDogc3RyaW5nID0gJyc7XG4gICAgbGV0IHRlbXBsYXRlUmFuZ2U6IExleGVyUmFuZ2V8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgICBsZXQgZXNjYXBlZFN0cmluZyA9IGZhbHNlO1xuICAgIC8vIFdlIG9ubHkgc3VwcG9ydCBTb3VyY2VNYXBzIGZvciBpbmxpbmUgdGVtcGxhdGVzIHRoYXQgYXJlIHNpbXBsZSBzdHJpbmcgbGl0ZXJhbHMuXG4gICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbCh0ZW1wbGF0ZUV4cHIpIHx8IHRzLmlzTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwodGVtcGxhdGVFeHByKSkge1xuICAgICAgLy8gdGhlIHN0YXJ0IGFuZCBlbmQgb2YgdGhlIGB0ZW1wbGF0ZUV4cHJgIG5vZGUgaW5jbHVkZXMgdGhlIHF1b3RhdGlvbiBtYXJrcywgd2hpY2ggd2VcbiAgICAgIC8vIG11c3RcbiAgICAgIC8vIHN0cmlwXG4gICAgICB0ZW1wbGF0ZVJhbmdlID0gZ2V0VGVtcGxhdGVSYW5nZSh0ZW1wbGF0ZUV4cHIpO1xuICAgICAgdGVtcGxhdGVTdHIgPSB0ZW1wbGF0ZUV4cHIuZ2V0U291cmNlRmlsZSgpLnRleHQ7XG4gICAgICB0ZW1wbGF0ZVVybCA9IGNvbnRhaW5pbmdGaWxlO1xuICAgICAgZXNjYXBlZFN0cmluZyA9IHRydWU7XG4gICAgICB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgIHR5cGU6ICdkaXJlY3QnLFxuICAgICAgICBub2RlOiB0ZW1wbGF0ZUV4cHIgYXModHMuU3RyaW5nTGl0ZXJhbCB8IHRzLk5vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHJlc29sdmVkVGVtcGxhdGUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZUV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZFRlbXBsYXRlICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHRlbXBsYXRlRXhwciwgJ3RlbXBsYXRlIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIHRlbXBsYXRlU3RyID0gcmVzb2x2ZWRUZW1wbGF0ZTtcbiAgICAgIHRlbXBsYXRlU291cmNlTWFwcGluZyA9IHtcbiAgICAgICAgdHlwZTogJ2luZGlyZWN0JyxcbiAgICAgICAgbm9kZTogdGVtcGxhdGVFeHByLFxuICAgICAgICBjb21wb25lbnRDbGFzczogbm9kZSxcbiAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlU3RyLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJzZVRlbXBsYXRlID0gKG9wdGlvbnM/OiBQYXJzZVRlbXBsYXRlT3B0aW9ucykgPT4gdGhpcy5fcGFyc2VUZW1wbGF0ZShcbiAgICAgICAgY29tcG9uZW50LCB0ZW1wbGF0ZVN0ciwgdGVtcGxhdGVVcmwsIHRlbXBsYXRlUmFuZ2UsIGVzY2FwZWRTdHJpbmcsIG9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIHtwYXJzZVRlbXBsYXRlLCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmd9O1xuICB9XG5cbiAgcHJpdmF0ZSBfcGFyc2VUZW1wbGF0ZShcbiAgICAgIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIHRlbXBsYXRlU3RyOiBzdHJpbmcsIHRlbXBsYXRlVXJsOiBzdHJpbmcsXG4gICAgICB0ZW1wbGF0ZVJhbmdlOiBMZXhlclJhbmdlfHVuZGVmaW5lZCwgZXNjYXBlZFN0cmluZzogYm9vbGVhbixcbiAgICAgIG9wdGlvbnM6IFBhcnNlVGVtcGxhdGVPcHRpb25zID0ge30pOiBQYXJzZWRUZW1wbGF0ZSB7XG4gICAgbGV0IHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4gPSB0aGlzLmRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykgITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCAncHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IGJlIGEgYm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyA9IHZhbHVlO1xuICAgIH1cblxuICAgIGxldCBpbnRlcnBvbGF0aW9uOiBJbnRlcnBvbGF0aW9uQ29uZmlnID0gREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRztcbiAgICBpZiAoY29tcG9uZW50LmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgnaW50ZXJwb2xhdGlvbicpICE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZS5sZW5ndGggIT09IDIgfHxcbiAgICAgICAgICAhdmFsdWUuZXZlcnkoZWxlbWVudCA9PiB0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICAgICdpbnRlcnBvbGF0aW9uIG11c3QgYmUgYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzIG9mIHN0cmluZyB0eXBlJyk7XG4gICAgICB9XG4gICAgICBpbnRlcnBvbGF0aW9uID0gSW50ZXJwb2xhdGlvbkNvbmZpZy5mcm9tQXJyYXkodmFsdWUgYXNbc3RyaW5nLCBzdHJpbmddKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaW50ZXJwb2xhdGlvbixcbiAgICAgIC4uLnBhcnNlVGVtcGxhdGUodGVtcGxhdGVTdHIsIHRlbXBsYXRlVXJsLCB7XG4gICAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgICAgIGludGVycG9sYXRpb25Db25maWc6IGludGVycG9sYXRpb24sXG4gICAgICAgIHJhbmdlOiB0ZW1wbGF0ZVJhbmdlLCBlc2NhcGVkU3RyaW5nLFxuICAgICAgICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiB0aGlzLmVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsIC4uLm9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVN0ciwgdGVtcGxhdGVVcmwsXG4gICAgICBpc0lubGluZTogY29tcG9uZW50LmhhcygndGVtcGxhdGUnKSxcbiAgICAgIGZpbGU6IG5ldyBQYXJzZVNvdXJjZUZpbGUodGVtcGxhdGVTdHIsIHRlbXBsYXRlVXJsKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfZXhwcmVzc2lvblRvSW1wb3J0ZWRGaWxlKGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgd2hhdCBmaWxlIGlzIGJlaW5nIGltcG9ydGVkLlxuICAgIHJldHVybiB0aGlzLm1vZHVsZVJlc29sdmVyLnJlc29sdmVNb2R1bGUoZXhwci52YWx1ZS5tb2R1bGVOYW1lICEsIG9yaWdpbi5maWxlTmFtZSk7XG4gIH1cblxuICBwcml2YXRlIF9pc0N5Y2xpY0ltcG9ydChleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgICBjb25zdCBpbXBvcnRlZCA9IHRoaXMuX2V4cHJlc3Npb25Ub0ltcG9ydGVkRmlsZShleHByLCBvcmlnaW4pO1xuICAgIGlmIChpbXBvcnRlZCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGltcG9ydCBpcyBsZWdhbC5cbiAgICByZXR1cm4gdGhpcy5jeWNsZUFuYWx5emVyLndvdWxkQ3JlYXRlQ3ljbGUob3JpZ2luLCBpbXBvcnRlZCk7XG4gIH1cblxuICBwcml2YXRlIF9yZWNvcmRTeW50aGV0aWNJbXBvcnQoZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLl9leHByZXNzaW9uVG9JbXBvcnRlZEZpbGUoZXhwciwgb3JpZ2luKTtcbiAgICBpZiAoaW1wb3J0ZWQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIucmVjb3JkU3ludGhldGljSW1wb3J0KG9yaWdpbiwgaW1wb3J0ZWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGVFeHByOiB0cy5FeHByZXNzaW9uKSB7XG4gIGNvbnN0IHN0YXJ0UG9zID0gdGVtcGxhdGVFeHByLmdldFN0YXJ0KCkgKyAxO1xuICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9XG4gICAgICB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbih0ZW1wbGF0ZUV4cHIuZ2V0U291cmNlRmlsZSgpLCBzdGFydFBvcyk7XG4gIHJldHVybiB7XG4gICAgc3RhcnRQb3MsXG4gICAgc3RhcnRMaW5lOiBsaW5lLFxuICAgIHN0YXJ0Q29sOiBjaGFyYWN0ZXIsXG4gICAgZW5kUG9zOiB0ZW1wbGF0ZUV4cHIuZ2V0RW5kKCkgLSAxLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzb3VyY2VNYXBVcmwocmVzb3VyY2VVcmw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghdHNTb3VyY2VNYXBCdWcyOTMwMEZpeGVkKCkpIHtcbiAgICAvLyBCeSByZW1vdmluZyB0aGUgdGVtcGxhdGUgVVJMIHdlIGFyZSB0ZWxsaW5nIHRoZSB0cmFuc2xhdG9yIG5vdCB0byB0cnkgdG9cbiAgICAvLyBtYXAgdGhlIGV4dGVybmFsIHNvdXJjZSBmaWxlIHRvIHRoZSBnZW5lcmF0ZWQgY29kZSwgc2luY2UgdGhlIHZlcnNpb25cbiAgICAvLyBvZiBUUyB0aGF0IGlzIHJ1bm5pbmcgZG9lcyBub3Qgc3VwcG9ydCBpdC5cbiAgICByZXR1cm4gJyc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlc291cmNlVXJsO1xuICB9XG59XG5cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGVtcGxhdGUgd2hpY2ggd2FzIGV4dHJhY3RlZCBkdXJpbmcgcGFyc2luZy5cbiAqXG4gKiBUaGlzIGNvbnRhaW5zIHRoZSBhY3R1YWwgcGFyc2VkIHRlbXBsYXRlIGFzIHdlbGwgYXMgYW55IG1ldGFkYXRhIGNvbGxlY3RlZCBkdXJpbmcgaXRzIHBhcnNpbmcsXG4gKiBzb21lIG9mIHdoaWNoIG1pZ2h0IGJlIHVzZWZ1bCBmb3IgcmUtcGFyc2luZyB0aGUgdGVtcGxhdGUgd2l0aCBkaWZmZXJlbnQgb3B0aW9ucy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRUZW1wbGF0ZSB7XG4gIC8qKlxuICAgKiBUaGUgYEludGVycG9sYXRpb25Db25maWdgIHNwZWNpZmllZCBieSB0aGUgdXNlci5cbiAgICovXG4gIGludGVycG9sYXRpb246IEludGVycG9sYXRpb25Db25maWc7XG5cbiAgLyoqXG4gICAqIEEgZnVsbCBwYXRoIHRvIHRoZSBmaWxlIHdoaWNoIGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZS5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgZWl0aGVyIHRoZSBvcmlnaW5hbCAudHMgZmlsZSBpZiB0aGUgdGVtcGxhdGUgaXMgaW5saW5lLCBvciB0aGUgLmh0bWwgZmlsZSBpZiBhblxuICAgKiBleHRlcm5hbCBmaWxlIHdhcyB1c2VkLlxuICAgKi9cbiAgdGVtcGxhdGVVcmw6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHN0cmluZyBjb250ZW50cyBvZiB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIFwibG9naWNhbFwiIHRlbXBsYXRlIHN0cmluZywgYWZ0ZXIgZXhwYW5zaW9uIG9mIGFueSBlc2NhcGVkIGNoYXJhY3RlcnMgKGZvciBpbmxpbmVcbiAgICogdGVtcGxhdGVzKS4gVGhpcyBtYXkgZGlmZmVyIGZyb20gdGhlIGFjdHVhbCB0ZW1wbGF0ZSBieXRlcyBhcyB0aGV5IGFwcGVhciBpbiB0aGUgLnRzIGZpbGUuXG4gICAqL1xuICB0ZW1wbGF0ZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBBbnkgZXJyb3JzIGZyb20gcGFyc2luZyB0aGUgdGVtcGxhdGUgdGhlIGZpcnN0IHRpbWUuXG4gICAqL1xuICBlcnJvcnM/OiBQYXJzZUVycm9yW118dW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBUaGUgYWN0dWFsIHBhcnNlZCB0ZW1wbGF0ZSBub2Rlcy5cbiAgICovXG4gIG5vZGVzOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBBbnkgc3R5bGVVcmxzIGV4dHJhY3RlZCBmcm9tIHRoZSBtZXRhZGF0YS5cbiAgICovXG4gIHN0eWxlVXJsczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEFueSBpbmxpbmUgc3R5bGVzIGV4dHJhY3RlZCBmcm9tIHRoZSBtZXRhZGF0YS5cbiAgICovXG4gIHN0eWxlczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIHRlbXBsYXRlIHdhcyBpbmxpbmUuXG4gICAqL1xuICBpc0lubGluZTogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIGBQYXJzZVNvdXJjZUZpbGVgIGZvciB0aGUgdGVtcGxhdGUuXG4gICAqL1xuICBmaWxlOiBQYXJzZVNvdXJjZUZpbGU7XG59XG5cbmludGVyZmFjZSBQcmVhbmFseXplZFRlbXBsYXRlIGV4dGVuZHMgUGFyc2VkVGVtcGxhdGUge1xuICBwYXJzZVRlbXBsYXRlOiAob3B0aW9ucz86IFBhcnNlVGVtcGxhdGVPcHRpb25zKSA9PiBQYXJzZWRUZW1wbGF0ZTtcbiAgdGVtcGxhdGVTb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG59XG4iXX0=