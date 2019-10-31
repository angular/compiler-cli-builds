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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/inheritance", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/resource_recorder", "@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
    var resource_recorder_1 = require("@angular/compiler-cli/src/ngtsc/util/src/resource_recorder");
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
        function ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds, i18nLegacyMessageIdFormat, moduleResolver, cycleAnalyzer, refEmitter, defaultImportRecorder, resourceDependencies) {
            if (resourceDependencies === void 0) { resourceDependencies = new resource_recorder_1.NoopResourceDependencyRecorder(); }
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
            this.i18nLegacyMessageIdFormat = i18nLegacyMessageIdFormat;
            this.moduleResolver = moduleResolver;
            this.cycleAnalyzer = cycleAnalyzer;
            this.refEmitter = refEmitter;
            this.defaultImportRecorder = defaultImportRecorder;
            this.resourceDependencies = resourceDependencies;
            this.literalCache = new Map();
            this.elementSchemaRegistry = new compiler_1.DomElementSchemaRegistry();
            /**
             * During the asynchronous preanalyze phase, it's necessary to parse the template to extract
             * any potential <link> tags which might need to be loaded. This cache ensures that work is not
             * thrown away, and the parsed template is reused during the analyze phase.
             */
            this.preanalyzeTemplateCache = new Map();
            this.precedence = transform_1.HandlerPrecedence.PRIMARY;
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
            var directiveResult = directive_1.extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.defaultImportRecorder, this.isCore, flags, this.elementSchemaRegistry.getDefaultComponentElementName());
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
                new compiler_1.WrappedNodeExpr(component.get('viewProviders')) :
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
            // Register this component's information with the `MetadataRegistry`. This ensures that
            // the information about the component is available during the compile() phase.
            var ref = new imports_1.Reference(node);
            this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign(tslib_1.__assign({ ref: ref, name: node.name.text, selector: metadata.selector, exportAs: metadata.exportAs, inputs: metadata.inputs, outputs: metadata.outputs, queries: metadata.queries.map(function (query) { return query.propertyName; }), isComponent: true }, metadata_1.extractDirectiveGuards(node, this.reflector)), { baseClass: util_1.readBaseClass(node, this.reflector, this.evaluator) }));
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
                        this.resourceDependencies.recordResourceDependency(node.getSourceFile(), resourceUrl);
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
                    meta: tslib_1.__assign(tslib_1.__assign({}, metadata), { template: template,
                        encapsulation: encapsulation, interpolation: template.interpolation, styles: styles || [], 
                        // These will be replaced during the compilation step, after all `NgModule`s have been
                        // analyzed and the full compilation scope for the component can be realized.
                        pipes: EMPTY_MAP, directives: EMPTY_ARRAY, wrapDirectivesAndPipesInClosure: false, //
                        animations: animations,
                        viewProviders: viewProviders, i18nUseExternalIds: this.i18nUseExternalIds, relativeContextFilePath: relativeContextFilePath }),
                    metadataStmt: metadata_2.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore),
                    parsedTemplate: template, parseTemplate: parseTemplate, templateSourceMapping: templateSourceMapping,
                },
                typeCheck: true,
            };
            if (changeDetection !== null) {
                output.analysis.meta.changeDetection = changeDetection;
            }
            return output;
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
                    metadata.directives = directives;
                    metadata.pipes = pipes_1;
                    metadata.wrapDirectivesAndPipesInClosure = wrapDirectivesAndPipesInClosure;
                }
                else {
                    // Declaring the directiveDefs/pipeDefs arrays directly would require imports that would
                    // create a cycle. Instead, mark this component as requiring remote scoping, so that the
                    // NgModule file will take care of setting the directives for the component.
                    this.scopeRegistry.setComponentAsRequiringRemoteScoping(node);
                }
            }
            return {};
        };
        ComponentDecoratorHandler.prototype.compile = function (node, analysis, pool) {
            var meta = analysis.meta;
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
            this.resourceDependencies.recordResourceDependency(node.getSourceFile(), resourceUrl);
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
            return tslib_1.__assign(tslib_1.__assign({ interpolation: interpolation }, compiler_1.parseTemplate(templateStr, templateUrl, tslib_1.__assign({ preserveWhitespaces: preserveWhitespaces, interpolationConfig: interpolation, range: templateRange, escapedString: escapedString, i18nLegacyMessageIdFormat: this.i18nLegacyMessageIdFormat }, options))), { template: templateStr, templateUrl: templateUrl, isInline: component.has('template'), file: new compiler_1.ParseSourceFile(templateStr, templateUrl) });
        };
        ComponentDecoratorHandler.prototype._expressionToImportedFile = function (expr, origin) {
            if (!(expr instanceof compiler_1.ExternalExpr)) {
                return null;
            }
            // Figure out what file is being imported.
            return this.moduleResolver.resolveModuleName(expr.value.moduleName, origin);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUErYTtJQUMvYSwrQkFBaUM7SUFHakMsMkVBQWtFO0lBQ2xFLDJFQUF5RDtJQUN6RCxtRUFBaUc7SUFFakcscUVBQXVHO0lBQ3ZHLHdGQUFpRjtJQUNqRix1RkFBb0U7SUFDcEUseUVBQW1HO0lBRW5HLHVFQUE4STtJQUU5SSxnR0FBNEc7SUFDNUcsNEdBQWdGO0lBR2hGLHVGQUEyRTtJQUMzRSxtRkFBbUQ7SUFDbkQscUZBQXdEO0lBQ3hELDZFQUFtSTtJQUVuSSxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztJQUNoRCxJQUFNLFdBQVcsR0FBVSxFQUFFLENBQUM7SUFVOUI7O09BRUc7SUFDSDtRQUVFLG1DQUNZLFNBQXlCLEVBQVUsU0FBMkIsRUFDOUQsWUFBOEIsRUFBVSxVQUEwQixFQUNsRSxXQUFpQyxFQUFVLGFBQXVDLEVBQ2xGLE1BQWUsRUFBVSxjQUE4QixFQUFVLFFBQWtCLEVBQ25GLDBCQUFtQyxFQUFVLGtCQUEyQixFQUN4RSx5QkFBaUMsRUFBVSxjQUE4QixFQUN6RSxhQUE0QixFQUFVLFVBQTRCLEVBQ2xFLHFCQUE0QyxFQUM1QyxvQkFDNkQ7WUFEN0QscUNBQUEsRUFBQSwyQkFDNkIsa0RBQThCLEVBQUU7WUFUN0QsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUM5RCxpQkFBWSxHQUFaLFlBQVksQ0FBa0I7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFnQjtZQUNsRSxnQkFBVyxHQUFYLFdBQVcsQ0FBc0I7WUFBVSxrQkFBYSxHQUFiLGFBQWEsQ0FB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Iiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgQ3NzU2VsZWN0b3IsIERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUcsIERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSwgRXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBJZGVudGlmaWVycywgSW50ZXJwb2xhdGlvbkNvbmZpZywgTGV4ZXJSYW5nZSwgUGFyc2VFcnJvciwgUGFyc2VTb3VyY2VGaWxlLCBQYXJzZVRlbXBsYXRlT3B0aW9ucywgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNGYWN0b3J5VGFyZ2V0LCBSM1RhcmdldEJpbmRlciwgU2NoZW1hTWV0YWRhdGEsIFNlbGVjdG9yTWF0Y2hlciwgU3RhdGVtZW50LCBUbXBsQXN0Tm9kZSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q3ljbGVBbmFseXplcn0gZnJvbSAnLi4vLi4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIHJlbGF0aXZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgTW9kdWxlUmVzb2x2ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luZGV4aW5nQ29udGV4dH0gZnJvbSAnLi4vLi4vaW5kZXhlcic7XG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5LCBleHRyYWN0RGlyZWN0aXZlR3VhcmRzfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge2ZsYXR0ZW5Jbmhlcml0ZWREaXJlY3RpdmVNZXRhZGF0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEvc3JjL2luaGVyaXRhbmNlJztcbmltcG9ydCB7RW51bVZhbHVlLCBQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXIsIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyRmxhZ3MsIEhhbmRsZXJQcmVjZWRlbmNlLCBSZXNvbHZlUmVzdWx0fSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtUZW1wbGF0ZVNvdXJjZU1hcHBpbmcsIFR5cGVDaGVja0NvbnRleHR9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge05vb3BSZXNvdXJjZURlcGVuZGVuY3lSZWNvcmRlciwgUmVzb3VyY2VEZXBlbmRlbmN5UmVjb3JkZXJ9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3Jlc291cmNlX3JlY29yZGVyJztcbmltcG9ydCB7dHNTb3VyY2VNYXBCdWcyOTMwMEZpeGVkfSBmcm9tICcuLi8uLi91dGlsL3NyYy90c19zb3VyY2VfbWFwX2J1Z18yOTMwMCc7XG5cbmltcG9ydCB7UmVzb3VyY2VMb2FkZXJ9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhLCBwYXJzZUZpZWxkQXJyYXlWYWx1ZX0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHtjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmaW5kQW5ndWxhckRlY29yYXRvciwgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSwgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgcmVhZEJhc2VDbGFzcywgdW53cmFwRXhwcmVzc2lvbn0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgRU1QVFlfTUFQID0gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KCk7XG5jb25zdCBFTVBUWV9BUlJBWTogYW55W10gPSBbXTtcblxuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRIYW5kbGVyRGF0YSB7XG4gIG1ldGE6IFIzQ29tcG9uZW50TWV0YWRhdGE7XG4gIHBhcnNlZFRlbXBsYXRlOiBQYXJzZWRUZW1wbGF0ZTtcbiAgdGVtcGxhdGVTb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG4gIHBhcnNlVGVtcGxhdGU6IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IFBhcnNlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCB3aGljaCBoYW5kbGVzIHRoZSBgQENvbXBvbmVudGAgYW5ub3RhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudERlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8Q29tcG9uZW50SGFuZGxlckRhdGEsIERlY29yYXRvcj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcixcbiAgICAgIHByaXZhdGUgc2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLCBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLCBwcml2YXRlIHJlc291cmNlTG9hZGVyOiBSZXNvdXJjZUxvYWRlciwgcHJpdmF0ZSByb290RGlyczogc3RyaW5nW10sXG4gICAgICBwcml2YXRlIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuLCBwcml2YXRlIGkxOG5Vc2VFeHRlcm5hbElkczogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgaTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdDogc3RyaW5nLCBwcml2YXRlIG1vZHVsZVJlc29sdmVyOiBNb2R1bGVSZXNvbHZlcixcbiAgICAgIHByaXZhdGUgY3ljbGVBbmFseXplcjogQ3ljbGVBbmFseXplciwgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgcmVzb3VyY2VEZXBlbmRlbmNpZXM6XG4gICAgICAgICAgUmVzb3VyY2VEZXBlbmRlbmN5UmVjb3JkZXIgPSBuZXcgTm9vcFJlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyKCkpIHt9XG5cbiAgcHJpdmF0ZSBsaXRlcmFsQ2FjaGUgPSBuZXcgTWFwPERlY29yYXRvciwgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24+KCk7XG4gIHByaXZhdGUgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5ID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuXG4gIC8qKlxuICAgKiBEdXJpbmcgdGhlIGFzeW5jaHJvbm91cyBwcmVhbmFseXplIHBoYXNlLCBpdCdzIG5lY2Vzc2FyeSB0byBwYXJzZSB0aGUgdGVtcGxhdGUgdG8gZXh0cmFjdFxuICAgKiBhbnkgcG90ZW50aWFsIDxsaW5rPiB0YWdzIHdoaWNoIG1pZ2h0IG5lZWQgdG8gYmUgbG9hZGVkLiBUaGlzIGNhY2hlIGVuc3VyZXMgdGhhdCB3b3JrIGlzIG5vdFxuICAgKiB0aHJvd24gYXdheSwgYW5kIHRoZSBwYXJzZWQgdGVtcGxhdGUgaXMgcmV1c2VkIGR1cmluZyB0aGUgYW5hbHl6ZSBwaGFzZS5cbiAgICovXG4gIHByaXZhdGUgcHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBQcmVhbmFseXplZFRlbXBsYXRlPigpO1xuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdDb21wb25lbnQnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJlYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICAvLyBJbiBwcmVhbmFseXplLCByZXNvdXJjZSBVUkxzIGFzc29jaWF0ZWQgd2l0aCB0aGUgY29tcG9uZW50IGFyZSBhc3luY2hyb25vdXNseSBwcmVsb2FkZWQgdmlhXG4gICAgLy8gdGhlIHJlc291cmNlTG9hZGVyLiBUaGlzIGlzIHRoZSBvbmx5IHRpbWUgYXN5bmMgb3BlcmF0aW9ucyBhcmUgYWxsb3dlZCBmb3IgYSBjb21wb25lbnQuXG4gICAgLy8gVGhlc2UgcmVzb3VyY2VzIGFyZTpcbiAgICAvL1xuICAgIC8vIC0gdGhlIHRlbXBsYXRlVXJsLCBpZiB0aGVyZSBpcyBvbmVcbiAgICAvLyAtIGFueSBzdHlsZVVybHMgaWYgcHJlc2VudFxuICAgIC8vIC0gYW55IHN0eWxlc2hlZXRzIHJlZmVyZW5jZWQgZnJvbSA8bGluaz4gdGFncyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmXG4gICAgLy9cbiAgICAvLyBBcyBhIHJlc3VsdCBvZiB0aGUgbGFzdCBvbmUsIHRoZSB0ZW1wbGF0ZSBtdXN0IGJlIHBhcnNlZCBhcyBwYXJ0IG9mIHByZWFuYWx5c2lzIHRvIGV4dHJhY3RcbiAgICAvLyA8bGluaz4gdGFncywgd2hpY2ggbWF5IGludm9sdmUgd2FpdGluZyBmb3IgdGhlIHRlbXBsYXRlVXJsIHRvIGJlIHJlc29sdmVkIGZpcnN0LlxuXG4gICAgLy8gSWYgcHJlbG9hZGluZyBpc24ndCBwb3NzaWJsZSwgdGhlbiBza2lwIHRoaXMgc3RlcC5cbiAgICBpZiAoIXRoaXMucmVzb3VyY2VMb2FkZXIuY2FuUHJlbG9hZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0gdGhpcy5fcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yKTtcbiAgICBjb25zdCBjb21wb25lbnQgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuXG4gICAgLy8gQ29udmVydCBhIHN0eWxlVXJsIHN0cmluZyBpbnRvIGEgUHJvbWlzZSB0byBwcmVsb2FkIGl0LlxuICAgIGNvbnN0IHJlc29sdmVTdHlsZVVybCA9IChzdHlsZVVybDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgY29uc3QgcHJvbWlzZSA9IHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCk7XG4gICAgICByZXR1cm4gcHJvbWlzZSB8fCBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9O1xuXG4gICAgLy8gQSBQcm9taXNlIHRoYXQgd2FpdHMgZm9yIHRoZSB0ZW1wbGF0ZSBhbmQgYWxsIDxsaW5rPmVkIHN0eWxlcyB3aXRoaW4gaXQgdG8gYmUgcHJlbG9hZGVkLlxuICAgIGNvbnN0IHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcyA9XG4gICAgICAgIHRoaXMuX3ByZWxvYWRBbmRQYXJzZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSkudGhlbih0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGVtcGxhdGUuc3R5bGVVcmxzLm1hcChyZXNvbHZlU3R5bGVVcmwpKS50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIC8vIEV4dHJhY3QgYWxsIHRoZSBzdHlsZVVybHMgaW4gdGhlIGRlY29yYXRvci5cbiAgICBjb25zdCBzdHlsZVVybHMgPSB0aGlzLl9leHRyYWN0U3R5bGVVcmxzKGNvbXBvbmVudCwgW10pO1xuXG4gICAgaWYgKHN0eWxlVXJscyA9PT0gbnVsbCkge1xuICAgICAgLy8gQSBmYXN0IHBhdGggZXhpc3RzIGlmIHRoZXJlIGFyZSBubyBzdHlsZVVybHMsIHRvIGp1c3Qgd2FpdCBmb3JcbiAgICAgIC8vIHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcy5cbiAgICAgIHJldHVybiB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFdhaXQgZm9yIGJvdGggdGhlIHRlbXBsYXRlIGFuZCBhbGwgc3R5bGVVcmwgcmVzb3VyY2VzIHRvIHJlc29sdmUuXG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW3RlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcywgLi4uc3R5bGVVcmxzLm1hcChyZXNvbHZlU3R5bGVVcmwpXSlcbiAgICAgICAgICAudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGZsYWdzOiBIYW5kbGVyRmxhZ3MgPSBIYW5kbGVyRmxhZ3MuTk9ORSk6XG4gICAgICBBbmFseXNpc091dHB1dDxDb21wb25lbnRIYW5kbGVyRGF0YT4ge1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuZGVsZXRlKGRlY29yYXRvcik7XG5cbiAgICAvLyBAQ29tcG9uZW50IGluaGVyaXRzIEBEaXJlY3RpdmUsIHNvIGJlZ2luIGJ5IGV4dHJhY3RpbmcgdGhlIEBEaXJlY3RpdmUgbWV0YWRhdGEgYW5kIGJ1aWxkaW5nXG4gICAgLy8gb24gaXQuXG4gICAgY29uc3QgZGlyZWN0aXZlUmVzdWx0ID0gZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhKFxuICAgICAgICBub2RlLCBkZWNvcmF0b3IsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICBmbGFncywgdGhpcy5lbGVtZW50U2NoZW1hUmVnaXN0cnkuZ2V0RGVmYXVsdENvbXBvbmVudEVsZW1lbnROYW1lKCkpO1xuICAgIGlmIChkaXJlY3RpdmVSZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YWAgcmV0dXJucyB1bmRlZmluZWQgd2hlbiB0aGUgQERpcmVjdGl2ZSBoYXMgYGppdDogdHJ1ZWAuIEluIHRoaXNcbiAgICAgIC8vIGNhc2UsIGNvbXBpbGF0aW9uIG9mIHRoZSBkZWNvcmF0b3IgaXMgc2tpcHBlZC4gUmV0dXJuaW5nIGFuIGVtcHR5IG9iamVjdCBzaWduaWZpZXNcbiAgICAgIC8vIHRoYXQgbm8gYW5hbHlzaXMgd2FzIHByb2R1Y2VkLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8vIE5leHQsIHJlYWQgdGhlIGBAQ29tcG9uZW50YC1zcGVjaWZpYyBmaWVsZHMuXG4gICAgY29uc3Qge2RlY29yYXRvcjogY29tcG9uZW50LCBtZXRhZGF0YX0gPSBkaXJlY3RpdmVSZXN1bHQ7XG5cbiAgICAvLyBHbyB0aHJvdWdoIHRoZSByb290IGRpcmVjdG9yaWVzIGZvciB0aGlzIHByb2plY3QsIGFuZCBzZWxlY3QgdGhlIG9uZSB3aXRoIHRoZSBzbWFsbGVzdFxuICAgIC8vIHJlbGF0aXZlIHBhdGggcmVwcmVzZW50YXRpb24uXG4gICAgY29uc3QgcmVsYXRpdmVDb250ZXh0RmlsZVBhdGggPSB0aGlzLnJvb3REaXJzLnJlZHVjZTxzdHJpbmd8dW5kZWZpbmVkPigocHJldmlvdXMsIHJvb3REaXIpID0+IHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHJlbGF0aXZlKGFic29sdXRlRnJvbShyb290RGlyKSwgYWJzb2x1dGVGcm9tKGNvbnRhaW5pbmdGaWxlKSk7XG4gICAgICBpZiAocHJldmlvdXMgPT09IHVuZGVmaW5lZCB8fCBjYW5kaWRhdGUubGVuZ3RoIDwgcHJldmlvdXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcHJldmlvdXM7XG4gICAgICB9XG4gICAgfSwgdW5kZWZpbmVkKSAhO1xuXG4gICAgY29uc3Qgdmlld1Byb3ZpZGVyczogRXhwcmVzc2lvbnxudWxsID0gY29tcG9uZW50Lmhhcygndmlld1Byb3ZpZGVycycpID9cbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihjb21wb25lbnQuZ2V0KCd2aWV3UHJvdmlkZXJzJykgISkgOlxuICAgICAgICBudWxsO1xuXG4gICAgLy8gUGFyc2UgdGhlIHRlbXBsYXRlLlxuICAgIC8vIElmIGEgcHJlYW5hbHl6ZSBwaGFzZSB3YXMgZXhlY3V0ZWQsIHRoZSB0ZW1wbGF0ZSBtYXkgYWxyZWFkeSBleGlzdCBpbiBwYXJzZWQgZm9ybSwgc28gY2hlY2tcbiAgICAvLyB0aGUgcHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuXG4gICAgLy8gRXh0cmFjdCBhIGNsb3N1cmUgb2YgdGhlIHRlbXBsYXRlIHBhcnNpbmcgY29kZSBzbyB0aGF0IGl0IGNhbiBiZSByZXBhcnNlZCB3aXRoIGRpZmZlcmVudFxuICAgIC8vIG9wdGlvbnMgaWYgbmVlZGVkLCBsaWtlIGluIHRoZSBpbmRleGluZyBwaXBlbGluZS5cbiAgICBsZXQgcGFyc2VUZW1wbGF0ZTogKG9wdGlvbnM/OiBQYXJzZVRlbXBsYXRlT3B0aW9ucykgPT4gUGFyc2VkVGVtcGxhdGU7XG4gICAgLy8gVHJhY2sgdGhlIG9yaWdpbiBvZiB0aGUgdGVtcGxhdGUgdG8gZGV0ZXJtaW5lIGhvdyB0aGUgUGFyc2VTb3VyY2VTcGFucyBzaG91bGQgYmUgaW50ZXJwcmV0ZWQuXG4gICAgbGV0IHRlbXBsYXRlU291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuICAgIGlmICh0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmhhcyhub2RlKSkge1xuICAgICAgLy8gVGhlIHRlbXBsYXRlIHdhcyBwYXJzZWQgaW4gcHJlYW5hbHl6ZS4gVXNlIGl0IGFuZCBkZWxldGUgaXQgdG8gc2F2ZSBtZW1vcnkuXG4gICAgICBjb25zdCBwcmVhbmFseXplZCA9IHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuZ2V0KG5vZGUpICE7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmRlbGV0ZShub2RlKTtcblxuICAgICAgcGFyc2VUZW1wbGF0ZSA9IHByZWFuYWx5emVkLnBhcnNlVGVtcGxhdGU7XG4gICAgICB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcgPSBwcmVhbmFseXplZC50ZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSB0ZW1wbGF0ZSB3YXMgbm90IGFscmVhZHkgcGFyc2VkLiBFaXRoZXIgdGhlcmUncyBhIHRlbXBsYXRlVXJsLCBvciBhbiBpbmxpbmUgdGVtcGxhdGUuXG4gICAgICBpZiAoY29tcG9uZW50LmhhcygndGVtcGxhdGVVcmwnKSkge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZVVybEV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZVVybCcpICE7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZVVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgdGVtcGxhdGVVcmxFeHByLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5yZXNvdXJjZUxvYWRlci5yZXNvbHZlKHRlbXBsYXRlVXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgIGNvbnN0IGV4dGVybmFsID1cbiAgICAgICAgICAgIHRoaXMuX2V4dHJhY3RFeHRlcm5hbFRlbXBsYXRlKG5vZGUsIGNvbXBvbmVudCwgdGVtcGxhdGVVcmxFeHByLCByZXNvdXJjZVVybCk7XG5cbiAgICAgICAgcGFyc2VUZW1wbGF0ZSA9IGV4dGVybmFsLnBhcnNlVGVtcGxhdGU7XG4gICAgICAgIHRlbXBsYXRlU291cmNlTWFwcGluZyA9IGV4dGVybmFsLnRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEV4cGVjdCBhbiBpbmxpbmUgdGVtcGxhdGUgdG8gYmUgcHJlc2VudC5cbiAgICAgICAgY29uc3QgaW5saW5lID0gdGhpcy5fZXh0cmFjdElubGluZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG5cbiAgICAgICAgcGFyc2VUZW1wbGF0ZSA9IGlubGluZS5wYXJzZVRlbXBsYXRlO1xuICAgICAgICB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcgPSBpbmxpbmUudGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUoKTtcblxuICAgIGlmICh0ZW1wbGF0ZS5lcnJvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFcnJvcnMgcGFyc2luZyB0ZW1wbGF0ZTogJHt0ZW1wbGF0ZS5lcnJvcnMubWFwKGUgPT4gZS50b1N0cmluZygpKS5qb2luKCcsICcpfWApO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIHRoaXMgY29tcG9uZW50J3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgYE1ldGFkYXRhUmVnaXN0cnlgLiBUaGlzIGVuc3VyZXMgdGhhdFxuICAgIC8vIHRoZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY29tcG9uZW50IGlzIGF2YWlsYWJsZSBkdXJpbmcgdGhlIGNvbXBpbGUoKSBwaGFzZS5cbiAgICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKG5vZGUpO1xuICAgIHRoaXMubWV0YVJlZ2lzdHJ5LnJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEoe1xuICAgICAgcmVmLFxuICAgICAgbmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgICBzZWxlY3RvcjogbWV0YWRhdGEuc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogbWV0YWRhdGEuZXhwb3J0QXMsXG4gICAgICBpbnB1dHM6IG1ldGFkYXRhLmlucHV0cyxcbiAgICAgIG91dHB1dHM6IG1ldGFkYXRhLm91dHB1dHMsXG4gICAgICBxdWVyaWVzOiBtZXRhZGF0YS5xdWVyaWVzLm1hcChxdWVyeSA9PiBxdWVyeS5wcm9wZXJ0eU5hbWUpLFxuICAgICAgaXNDb21wb25lbnQ6IHRydWUsIC4uLmV4dHJhY3REaXJlY3RpdmVHdWFyZHMobm9kZSwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgYmFzZUNsYXNzOiByZWFkQmFzZUNsYXNzKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciksXG4gICAgfSk7XG5cbiAgICAvLyBGaWd1cmUgb3V0IHRoZSBzZXQgb2Ygc3R5bGVzLiBUaGUgb3JkZXJpbmcgaGVyZSBpcyBpbXBvcnRhbnQ6IGV4dGVybmFsIHJlc291cmNlcyAoc3R5bGVVcmxzKVxuICAgIC8vIHByZWNlZGUgaW5saW5lIHN0eWxlcywgYW5kIHN0eWxlcyBkZWZpbmVkIGluIHRoZSB0ZW1wbGF0ZSBvdmVycmlkZSBzdHlsZXMgZGVmaW5lZCBpbiB0aGVcbiAgICAvLyBjb21wb25lbnQuXG4gICAgbGV0IHN0eWxlczogc3RyaW5nW118bnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCBzdHlsZVVybHMgPSB0aGlzLl9leHRyYWN0U3R5bGVVcmxzKGNvbXBvbmVudCwgdGVtcGxhdGUuc3R5bGVVcmxzKTtcbiAgICBpZiAoc3R5bGVVcmxzICE9PSBudWxsKSB7XG4gICAgICBpZiAoc3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgIHN0eWxlcyA9IFtdO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBzdHlsZVVybCBvZiBzdHlsZVVybHMpIHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUoc3R5bGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgY29uc3QgcmVzb3VyY2VTdHIgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQocmVzb3VyY2VVcmwpO1xuICAgICAgICBzdHlsZXMucHVzaChyZXNvdXJjZVN0cik7XG4gICAgICAgIHRoaXMucmVzb3VyY2VEZXBlbmRlbmNpZXMucmVjb3JkUmVzb3VyY2VEZXBlbmRlbmN5KG5vZGUuZ2V0U291cmNlRmlsZSgpLCByZXNvdXJjZVVybCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjb21wb25lbnQuaGFzKCdzdHlsZXMnKSkge1xuICAgICAgY29uc3QgbGl0U3R5bGVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoY29tcG9uZW50LCAnc3R5bGVzJywgdGhpcy5ldmFsdWF0b3IpO1xuICAgICAgaWYgKGxpdFN0eWxlcyAhPT0gbnVsbCkge1xuICAgICAgICBpZiAoc3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgICAgc3R5bGVzID0gbGl0U3R5bGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0eWxlcy5wdXNoKC4uLmxpdFN0eWxlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRlbXBsYXRlLnN0eWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAoc3R5bGVzID09PSBudWxsKSB7XG4gICAgICAgIHN0eWxlcyA9IHRlbXBsYXRlLnN0eWxlcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0eWxlcy5wdXNoKC4uLnRlbXBsYXRlLnN0eWxlcyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZW5jYXBzdWxhdGlvbjogbnVtYmVyID1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZUVudW1WYWx1ZShjb21wb25lbnQsICdlbmNhcHN1bGF0aW9uJywgJ1ZpZXdFbmNhcHN1bGF0aW9uJykgfHwgMDtcblxuICAgIGNvbnN0IGNoYW5nZURldGVjdGlvbjogbnVtYmVyfG51bGwgPVxuICAgICAgICB0aGlzLl9yZXNvbHZlRW51bVZhbHVlKGNvbXBvbmVudCwgJ2NoYW5nZURldGVjdGlvbicsICdDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneScpO1xuXG4gICAgbGV0IGFuaW1hdGlvbnM6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ2FuaW1hdGlvbnMnKSkge1xuICAgICAgYW5pbWF0aW9ucyA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY29tcG9uZW50LmdldCgnYW5pbWF0aW9ucycpICEpO1xuICAgIH1cblxuICAgIGNvbnN0IG91dHB1dCA9IHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG1ldGE6IHtcbiAgICAgICAgICAuLi5tZXRhZGF0YSxcbiAgICAgICAgICB0ZW1wbGF0ZSxcbiAgICAgICAgICBlbmNhcHN1bGF0aW9uLFxuICAgICAgICAgIGludGVycG9sYXRpb246IHRlbXBsYXRlLmludGVycG9sYXRpb24sXG4gICAgICAgICAgc3R5bGVzOiBzdHlsZXMgfHwgW10sXG5cbiAgICAgICAgICAvLyBUaGVzZSB3aWxsIGJlIHJlcGxhY2VkIGR1cmluZyB0aGUgY29tcGlsYXRpb24gc3RlcCwgYWZ0ZXIgYWxsIGBOZ01vZHVsZWBzIGhhdmUgYmVlblxuICAgICAgICAgIC8vIGFuYWx5emVkIGFuZCB0aGUgZnVsbCBjb21waWxhdGlvbiBzY29wZSBmb3IgdGhlIGNvbXBvbmVudCBjYW4gYmUgcmVhbGl6ZWQuXG4gICAgICAgICAgcGlwZXM6IEVNUFRZX01BUCxcbiAgICAgICAgICBkaXJlY3RpdmVzOiBFTVBUWV9BUlJBWSxcbiAgICAgICAgICB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlOiBmYWxzZSwgIC8vXG4gICAgICAgICAgYW5pbWF0aW9ucyxcbiAgICAgICAgICB2aWV3UHJvdmlkZXJzLFxuICAgICAgICAgIGkxOG5Vc2VFeHRlcm5hbElkczogdGhpcy5pMThuVXNlRXh0ZXJuYWxJZHMsIHJlbGF0aXZlQ29udGV4dEZpbGVQYXRoXG4gICAgICAgIH0sXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgICBwYXJzZWRUZW1wbGF0ZTogdGVtcGxhdGUsIHBhcnNlVGVtcGxhdGUsIHRlbXBsYXRlU291cmNlTWFwcGluZyxcbiAgICAgIH0sXG4gICAgICB0eXBlQ2hlY2s6IHRydWUsXG4gICAgfTtcbiAgICBpZiAoY2hhbmdlRGV0ZWN0aW9uICE9PSBudWxsKSB7XG4gICAgICAob3V0cHV0LmFuYWx5c2lzLm1ldGEgYXMgUjNDb21wb25lbnRNZXRhZGF0YSkuY2hhbmdlRGV0ZWN0aW9uID0gY2hhbmdlRGV0ZWN0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9XG5cbiAgaW5kZXgoY29udGV4dDogSW5kZXhpbmdDb250ZXh0LCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogQ29tcG9uZW50SGFuZGxlckRhdGEpIHtcbiAgICAvLyBUaGUgY29tcG9uZW50IHRlbXBsYXRlIG1heSBoYXZlIGJlZW4gcHJldmlvdXNseSBwYXJzZWQgd2l0aG91dCBwcmVzZXJ2aW5nIHdoaXRlc3BhY2Ugb3Igd2l0aFxuICAgIC8vIGBsZWFkaW5nVHJpdmlhQ2hhcmBzLCBib3RoIG9mIHdoaWNoIG1heSBtYW5pcHVsYXRlIHRoZSBBU1QgaW50byBhIGZvcm0gbm90IHJlcHJlc2VudGF0aXZlIG9mXG4gICAgLy8gdGhlIHNvdXJjZSBjb2RlLCBtYWtpbmcgaXQgdW5zdWl0YWJsZSBmb3IgaW5kZXhpbmcuIFRoZSB0ZW1wbGF0ZSBpcyByZXBhcnNlZCB3aXRoIHByZXNlcnZpbmdcbiAgICAvLyBvcHRpb25zIHRvIHJlbWVkeSB0aGlzLlxuICAgIGNvbnN0IHRlbXBsYXRlID0gYW5hbHlzaXMucGFyc2VUZW1wbGF0ZSh7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICB9KTtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBhbmFseXNpcy5tZXRhLnNlbGVjdG9yO1xuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGlmIChkaXJlY3RpdmUuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgIGNvbnN0IGJvdW5kVGVtcGxhdGUgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IHRlbXBsYXRlLm5vZGVzfSk7XG5cbiAgICBjb250ZXh0LmFkZENvbXBvbmVudCh7XG4gICAgICBkZWNsYXJhdGlvbjogbm9kZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgYm91bmRUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlTWV0YToge1xuICAgICAgICBpc0lubGluZTogdGVtcGxhdGUuaXNJbmxpbmUsXG4gICAgICAgIGZpbGU6IHRlbXBsYXRlLmZpbGUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgdHlwZUNoZWNrKGN0eDogVHlwZUNoZWNrQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogQ29tcG9uZW50SGFuZGxlckRhdGEpOiB2b2lkIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRoZXJlIGFyZSBpc3N1ZXMgd2l0aCBwYXJzaW5nIHRoZSB0ZW1wbGF0ZSB1bmRlciBjZXJ0YWluIGNvbmZpZ3VyYXRpb25zIChuYW1lbHkgd2l0aFxuICAgIC8vIGBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBmYWxzZWApIHdoaWNoIGNhdXNlIGluYWNjdXJhdGUgcG9zaXRpb25hbCBpbmZvcm1hdGlvbiB3aXRoaW4gdGhlXG4gICAgLy8gdGVtcGxhdGUgQVNULCBwYXJ0aWN1bGFybHkgd2l0aGluIGludGVycG9sYXRpb24gZXhwcmVzc2lvbnMuXG4gICAgLy9cbiAgICAvLyBUbyB3b3JrIGFyb3VuZCB0aGlzLCB0aGUgdGVtcGxhdGUgaXMgcmUtcGFyc2VkIHdpdGggc2V0dGluZ3MgdGhhdCBndWFyYW50ZWUgdGhlIHNwYW5zIGFyZSBhc1xuICAgIC8vIGFjY3VyYXRlIGFzIHBvc3NpYmxlLiBUaGlzIGlzIG9ubHkgYSB0ZW1wb3Jhcnkgc29sdXRpb24gdW50aWwgdGhlIHdoaXRlc3BhY2UgcmVtb3ZhbCBzdGVwIGNhblxuICAgIC8vIGJlIHJld3JpdHRlbiBhcyBhIHRyYW5zZm9ybSBhZ2FpbnN0IHRoZSBleHByZXNzaW9uIEFTVCBpbnN0ZWFkIG9mIGFnYWluc3QgdGhlIEhUTUwgQVNULlxuICAgIC8vXG4gICAgLy8gVE9ETyhhbHhodWIpOiByZW1vdmUgdGhpcyB3aGVuIHdoaXRlc3BhY2UgcmVtb3ZhbCBubyBsb25nZXIgY29ycnVwdHMgc3BhbiBpbmZvcm1hdGlvbi5cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IG1ldGEucGFyc2VUZW1wbGF0ZSh7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgY29uc3QgcGlwZXMgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+PigpO1xuICAgIGxldCBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdID0gW107XG5cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IG1ldGEgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBpZiAobWV0YS5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IGV4dE1ldGEgPSBmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGEodGhpcy5tZXRhUmVhZGVyLCBtZXRhLnJlZik7XG4gICAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShtZXRhLnNlbGVjdG9yKSwgZXh0TWV0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qge25hbWUsIHJlZn0gb2Ygc2NvcGUuY29tcGlsYXRpb24ucGlwZXMpIHtcbiAgICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmLm5vZGUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBub24tY2xhc3MgZGVjbGFyYXRpb24gJHt0cy5TeW50YXhLaW5kW3JlZi5ub2RlLmtpbmRdfSBmb3IgcGlwZSAke3JlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcGlwZXMuc2V0KG5hbWUsIHJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pO1xuICAgICAgfVxuICAgICAgc2NoZW1hcyA9IHNjb3BlLnNjaGVtYXM7XG4gICAgfVxuXG4gICAgY29uc3QgYm91bmQgPSBuZXcgUjNUYXJnZXRCaW5kZXIobWF0Y2hlcikuYmluZCh7dGVtcGxhdGU6IHRlbXBsYXRlLm5vZGVzfSk7XG4gICAgY3R4LmFkZFRlbXBsYXRlKFxuICAgICAgICBuZXcgUmVmZXJlbmNlKG5vZGUpLCBib3VuZCwgcGlwZXMsIHNjaGVtYXMsIG1ldGEudGVtcGxhdGVTb3VyY2VNYXBwaW5nLCB0ZW1wbGF0ZS5maWxlKTtcbiAgfVxuXG4gIHJlc29sdmUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IENvbXBvbmVudEhhbmRsZXJEYXRhKTogUmVzb2x2ZVJlc3VsdCB7XG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhpcyBjb21wb25lbnQgd2FzIHJlZ2lzdGVyZWQgd2l0aCBhbiBOZ01vZHVsZS4gSWYgc28sIGl0IHNob3VsZCBiZSBjb21waWxlZFxuICAgIC8vIHVuZGVyIHRoYXQgbW9kdWxlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGxldCBtZXRhZGF0YSA9IGFuYWx5c2lzLm1ldGE7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAvLyBSZXBsYWNlIHRoZSBlbXB0eSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGZyb20gdGhlIGFuYWx5emUoKSBzdGVwIHdpdGggYSBmdWxseSBleHBhbmRlZFxuICAgICAgLy8gc2NvcGUuIFRoaXMgaXMgcG9zc2libGUgbm93IGJlY2F1c2UgZHVyaW5nIHJlc29sdmUoKSB0aGUgd2hvbGUgY29tcGlsYXRpb24gdW5pdCBoYXMgYmVlblxuICAgICAgLy8gZnVsbHkgYW5hbHl6ZWQuXG4gICAgICAvL1xuICAgICAgLy8gRmlyc3QgaXQgbmVlZHMgdG8gYmUgZGV0ZXJtaW5lZCBpZiBhY3R1YWxseSBpbXBvcnRpbmcgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgdXNlZCBpbiB0aGVcbiAgICAgIC8vIHRlbXBsYXRlIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLiBDdXJyZW50bHkgbmd0c2MgcmVmdXNlcyB0byBnZW5lcmF0ZSBjeWNsZXMsIHNvIGFuIG9wdGlvblxuICAgICAgLy8ga25vd24gYXMgXCJyZW1vdGUgc2NvcGluZ1wiIGlzIHVzZWQgaWYgYSBjeWNsZSB3b3VsZCBiZSBjcmVhdGVkLiBJbiByZW1vdGUgc2NvcGluZywgdGhlXG4gICAgICAvLyBtb2R1bGUgZmlsZSBzZXRzIHRoZSBkaXJlY3RpdmVzL3BpcGVzIG9uIHRoZSDJtWNtcCBvZiB0aGUgY29tcG9uZW50LCB3aXRob3V0XG4gICAgICAvLyByZXF1aXJpbmcgbmV3IGltcG9ydHMgKGJ1dCBhbHNvIGluIGEgd2F5IHRoYXQgYnJlYWtzIHRyZWUgc2hha2luZykuXG4gICAgICAvL1xuICAgICAgLy8gRGV0ZXJtaW5pbmcgdGhpcyBpcyBjaGFsbGVuZ2luZywgYmVjYXVzZSB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyByZXNwb25zaWJsZSBmb3JcbiAgICAgIC8vIG1hdGNoaW5nIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSB0ZW1wbGF0ZTsgaG93ZXZlciwgdGhhdCBkb2Vzbid0IHJ1biB1bnRpbCB0aGUgYWN0dWFsXG4gICAgICAvLyBjb21waWxlKCkgc3RlcC4gSXQncyBub3QgcG9zc2libGUgdG8gcnVuIHRlbXBsYXRlIGNvbXBpbGF0aW9uIHNvb25lciBhcyBpdCByZXF1aXJlcyB0aGVcbiAgICAgIC8vIENvbnN0YW50UG9vbCBmb3IgdGhlIG92ZXJhbGwgZmlsZSBiZWluZyBjb21waWxlZCAod2hpY2ggaXNuJ3QgYXZhaWxhYmxlIHVudGlsIHRoZSB0cmFuc2Zvcm1cbiAgICAgIC8vIHN0ZXApLlxuICAgICAgLy9cbiAgICAgIC8vIEluc3RlYWQsIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIG1hdGNoZWQgaW5kZXBlbmRlbnRseSBoZXJlLCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXMgaXNcbiAgICAgIC8vIGFuIGFsdGVybmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIHRlbXBsYXRlIG1hdGNoaW5nIHdoaWNoIGlzIHVzZWQgZm9yIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmdcbiAgICAgIC8vIGFuZCB3aWxsIGV2ZW50dWFsbHkgcmVwbGFjZSBtYXRjaGluZyBpbiB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlci5cblxuXG4gICAgICAvLyBTZXQgdXAgdGhlIFIzVGFyZ2V0QmluZGVyLCBhcyB3ZWxsIGFzIGEgJ2RpcmVjdGl2ZXMnIGFycmF5IGFuZCBhICdwaXBlcycgbWFwIHRoYXQgYXJlIGxhdGVyXG4gICAgICAvLyBmZWQgdG8gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuIEZpcnN0LCBhIFNlbGVjdG9yTWF0Y2hlciBpcyBjb25zdHJ1Y3RlZCB0byBtYXRjaFxuICAgICAgLy8gZGlyZWN0aXZlcyB0aGF0IGFyZSBpbiBzY29wZS5cbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGEme2V4cHJlc3Npb246IEV4cHJlc3Npb259PigpO1xuICAgICAgY29uc3QgZGlyZWN0aXZlczoge3NlbGVjdG9yOiBzdHJpbmcsIGV4cHJlc3Npb246IEV4cHJlc3Npb259W10gPSBbXTtcblxuICAgICAgZm9yIChjb25zdCBkaXIgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBjb25zdCB7cmVmLCBzZWxlY3Rvcn0gPSBkaXI7XG4gICAgICAgIGlmIChzZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChyZWYsIGNvbnRleHQpO1xuICAgICAgICAgIGRpcmVjdGl2ZXMucHVzaCh7c2VsZWN0b3IsIGV4cHJlc3Npb259KTtcbiAgICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKHNlbGVjdG9yKSwgey4uLmRpciwgZXhwcmVzc2lvbn0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBFeHByZXNzaW9uPigpO1xuICAgICAgZm9yIChjb25zdCBwaXBlIG9mIHNjb3BlLmNvbXBpbGF0aW9uLnBpcGVzKSB7XG4gICAgICAgIHBpcGVzLnNldChwaXBlLm5hbWUsIHRoaXMucmVmRW1pdHRlci5lbWl0KHBpcGUucmVmLCBjb250ZXh0KSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5leHQsIHRoZSBjb21wb25lbnQgdGVtcGxhdGUgQVNUIGlzIGJvdW5kIHVzaW5nIHRoZSBSM1RhcmdldEJpbmRlci4gVGhpcyBwcm9kdWNlcyBhblxuICAgICAgLy8gQm91bmRUYXJnZXQsIHdoaWNoIGlzIHNpbWlsYXIgdG8gYSB0cy5UeXBlQ2hlY2tlci5cbiAgICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihtYXRjaGVyKTtcbiAgICAgIGNvbnN0IGJvdW5kID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlOiBtZXRhZGF0YS50ZW1wbGF0ZS5ub2Rlc30pO1xuXG4gICAgICAvLyBUaGUgQm91bmRUYXJnZXQga25vd3Mgd2hpY2ggZGlyZWN0aXZlcyBhbmQgcGlwZXMgbWF0Y2hlZCB0aGUgdGVtcGxhdGUuXG4gICAgICBjb25zdCB1c2VkRGlyZWN0aXZlcyA9IGJvdW5kLmdldFVzZWREaXJlY3RpdmVzKCk7XG4gICAgICBjb25zdCB1c2VkUGlwZXMgPSBib3VuZC5nZXRVc2VkUGlwZXMoKS5tYXAobmFtZSA9PiBwaXBlcy5nZXQobmFtZSkgISk7XG5cbiAgICAgIC8vIFNjYW4gdGhyb3VnaCB0aGUgZGlyZWN0aXZlcy9waXBlcyBhY3R1YWxseSB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBhbmQgY2hlY2sgd2hldGhlciBhbnlcbiAgICAgIC8vIGltcG9ydCB3aGljaCBuZWVkcyB0byBiZSBnZW5lcmF0ZWQgd291bGQgY3JlYXRlIGEgY3ljbGUuXG4gICAgICBjb25zdCBjeWNsZURldGVjdGVkID1cbiAgICAgICAgICB1c2VkRGlyZWN0aXZlcy5zb21lKGRpciA9PiB0aGlzLl9pc0N5Y2xpY0ltcG9ydChkaXIuZXhwcmVzc2lvbiwgY29udGV4dCkpIHx8XG4gICAgICAgICAgdXNlZFBpcGVzLnNvbWUocGlwZSA9PiB0aGlzLl9pc0N5Y2xpY0ltcG9ydChwaXBlLCBjb250ZXh0KSk7XG5cbiAgICAgIGlmICghY3ljbGVEZXRlY3RlZCkge1xuICAgICAgICAvLyBObyBjeWNsZSB3YXMgZGV0ZWN0ZWQuIFJlY29yZCB0aGUgaW1wb3J0cyB0aGF0IG5lZWQgdG8gYmUgY3JlYXRlZCBpbiB0aGUgY3ljbGUgZGV0ZWN0b3JcbiAgICAgICAgLy8gc28gdGhhdCBmdXR1cmUgY3ljbGljIGltcG9ydCBjaGVja3MgY29uc2lkZXIgdGhlaXIgcHJvZHVjdGlvbi5cbiAgICAgICAgZm9yIChjb25zdCB7ZXhwcmVzc2lvbn0gb2YgdXNlZERpcmVjdGl2ZXMpIHtcbiAgICAgICAgICB0aGlzLl9yZWNvcmRTeW50aGV0aWNJbXBvcnQoZXhwcmVzc2lvbiwgY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBwaXBlIG9mIHVzZWRQaXBlcykge1xuICAgICAgICAgIHRoaXMuX3JlY29yZFN5bnRoZXRpY0ltcG9ydChwaXBlLCBjb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGRpcmVjdGl2ZS9waXBlIGFycmF5cyBpbiDJtWNtcCBuZWVkIHRvIGJlIHdyYXBwZWQgaW4gY2xvc3VyZXMuXG4gICAgICAgIC8vIFRoaXMgaXMgcmVxdWlyZWQgaWYgYW55IGRpcmVjdGl2ZS9waXBlIHJlZmVyZW5jZSBpcyB0byBhIGRlY2xhcmF0aW9uIGluIHRoZSBzYW1lIGZpbGUgYnV0XG4gICAgICAgIC8vIGRlY2xhcmVkIGFmdGVyIHRoaXMgY29tcG9uZW50LlxuICAgICAgICBjb25zdCB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID1cbiAgICAgICAgICAgIHVzZWREaXJlY3RpdmVzLnNvbWUoXG4gICAgICAgICAgICAgICAgZGlyID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UoZGlyLmV4cHJlc3Npb24sIG5vZGUubmFtZSwgY29udGV4dCkpIHx8XG4gICAgICAgICAgICB1c2VkUGlwZXMuc29tZShwaXBlID0+IGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocGlwZSwgbm9kZS5uYW1lLCBjb250ZXh0KSk7XG5cbiAgICAgICAgLy8gQWN0dWFsIGNvbXBpbGF0aW9uIHN0aWxsIHVzZXMgdGhlIGZ1bGwgc2NvcGUsIG5vdCB0aGUgbmFycm93ZWQgc2NvcGUgZGV0ZXJtaW5lZCBieVxuICAgICAgICAvLyBSM1RhcmdldEJpbmRlci4gVGhpcyBpcyBhIGhlZGdlIGFnYWluc3QgcG90ZW50aWFsIGlzc3VlcyB3aXRoIHRoZSBSM1RhcmdldEJpbmRlciAtIHJpZ2h0XG4gICAgICAgIC8vIG5vdyB0aGUgVGVtcGxhdGVEZWZpbml0aW9uQnVpbGRlciBpcyB0aGUgXCJzb3VyY2Ugb2YgdHJ1dGhcIiBmb3Igd2hpY2ggZGlyZWN0aXZlcy9waXBlcyBhcmVcbiAgICAgICAgLy8gYWN0dWFsbHkgdXNlZCAodGhvdWdoIHRoZSB0d28gc2hvdWxkIGFncmVlIHBlcmZlY3RseSkuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRPRE8oYWx4aHViKTogc3dpdGNoIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIgb3ZlciB0byB1c2luZyBSM1RhcmdldEJpbmRlciBkaXJlY3RseS5cbiAgICAgICAgbWV0YWRhdGEuZGlyZWN0aXZlcyA9IGRpcmVjdGl2ZXM7XG4gICAgICAgIG1ldGFkYXRhLnBpcGVzID0gcGlwZXM7XG4gICAgICAgIG1ldGFkYXRhLndyYXBEaXJlY3RpdmVzQW5kUGlwZXNJbkNsb3N1cmUgPSB3cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGVjbGFyaW5nIHRoZSBkaXJlY3RpdmVEZWZzL3BpcGVEZWZzIGFycmF5cyBkaXJlY3RseSB3b3VsZCByZXF1aXJlIGltcG9ydHMgdGhhdCB3b3VsZFxuICAgICAgICAvLyBjcmVhdGUgYSBjeWNsZS4gSW5zdGVhZCwgbWFyayB0aGlzIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcsIHNvIHRoYXQgdGhlXG4gICAgICAgIC8vIE5nTW9kdWxlIGZpbGUgd2lsbCB0YWtlIGNhcmUgb2Ygc2V0dGluZyB0aGUgZGlyZWN0aXZlcyBmb3IgdGhlIGNvbXBvbmVudC5cbiAgICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LnNldENvbXBvbmVudEFzUmVxdWlyaW5nUmVtb3RlU2NvcGluZyhub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogQ29tcG9uZW50SGFuZGxlckRhdGEsIHBvb2w6IENvbnN0YW50UG9vbCk6XG4gICAgICBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IG1ldGEgPSBhbmFseXNpcy5tZXRhO1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVDb21wb25lbnRGcm9tTWV0YWRhdGEobWV0YSwgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgY29uc3QgZmFjdG9yeVJlcyA9IGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZChcbiAgICAgICAgey4uLm1ldGEsIGluamVjdEZuOiBJZGVudGlmaWVycy5kaXJlY3RpdmVJbmplY3QsIHRhcmdldDogUjNGYWN0b3J5VGFyZ2V0LkNvbXBvbmVudH0pO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIGZhY3RvcnlSZXMuc3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICBmYWN0b3J5UmVzLCB7XG4gICAgICAgIG5hbWU6ICfJtWNtcCcsXG4gICAgICAgIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IHJlcy50eXBlLFxuICAgICAgfVxuICAgIF07XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3I6IERlY29yYXRvcik6IHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uIHtcbiAgICBpZiAodGhpcy5saXRlcmFsQ2FjaGUuaGFzKGRlY29yYXRvcikpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpdGVyYWxDYWNoZS5nZXQoZGVjb3JhdG9yKSAhO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQ29tcG9uZW50IGRlY29yYXRvcmApO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSwgYERlY29yYXRvciBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuc2V0KGRlY29yYXRvciwgbWV0YSk7XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlRW51bVZhbHVlKFxuICAgICAgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZW51bVN5bWJvbE5hbWU6IHN0cmluZyk6IG51bWJlcnxudWxsIHtcbiAgICBsZXQgcmVzb2x2ZWQ6IG51bWJlcnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcyhmaWVsZCkpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KGZpZWxkKSAhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKSBhcyBhbnk7XG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbnVtVmFsdWUgJiYgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSh2YWx1ZS5lbnVtUmVmLCBlbnVtU3ltYm9sTmFtZSkpIHtcbiAgICAgICAgcmVzb2x2ZWQgPSB2YWx1ZS5yZXNvbHZlZCBhcyBudW1iZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsXG4gICAgICAgICAgICBgJHtmaWVsZH0gbXVzdCBiZSBhIG1lbWJlciBvZiAke2VudW1TeW1ib2xOYW1lfSBlbnVtIGZyb20gQGFuZ3VsYXIvY29yZWApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0U3R5bGVVcmxzKGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGV4dHJhVXJsczogc3RyaW5nW10pOlxuICAgICAgc3RyaW5nW118bnVsbCB7XG4gICAgaWYgKCFjb21wb25lbnQuaGFzKCdzdHlsZVVybHMnKSkge1xuICAgICAgcmV0dXJuIGV4dHJhVXJscy5sZW5ndGggPiAwID8gZXh0cmFVcmxzIDogbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZVVybHNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVVcmxzJykgITtcbiAgICBjb25zdCBzdHlsZVVybHMgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShzdHlsZVVybHNFeHByKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoc3R5bGVVcmxzKSB8fCAhc3R5bGVVcmxzLmV2ZXJ5KHVybCA9PiB0eXBlb2YgdXJsID09PSAnc3RyaW5nJykpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHN0eWxlVXJsc0V4cHIsICdzdHlsZVVybHMgbXVzdCBiZSBhbiBhcnJheSBvZiBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHN0eWxlVXJscy5wdXNoKC4uLmV4dHJhVXJscyk7XG4gICAgcmV0dXJuIHN0eWxlVXJscyBhcyBzdHJpbmdbXTtcbiAgfVxuXG4gIHByaXZhdGUgX3ByZWxvYWRBbmRQYXJzZVRlbXBsYXRlKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICBjb250YWluaW5nRmlsZTogc3RyaW5nKTogUHJvbWlzZTxQYXJzZWRUZW1wbGF0ZXxudWxsPiB7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgIC8vIEV4dHJhY3QgdGhlIHRlbXBsYXRlVXJsIGFuZCBwcmVsb2FkIGl0LlxuICAgICAgY29uc3QgdGVtcGxhdGVVcmxFeHByID0gY29tcG9uZW50LmdldCgndGVtcGxhdGVVcmwnKSAhO1xuICAgICAgY29uc3QgdGVtcGxhdGVVcmwgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZVVybEV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiB0ZW1wbGF0ZVVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZVVybEV4cHIsICd0ZW1wbGF0ZVVybCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZSh0ZW1wbGF0ZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgY29uc3QgdGVtcGxhdGVQcm9taXNlID0gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkKHJlc291cmNlVXJsKTtcblxuICAgICAgLy8gSWYgdGhlIHByZWxvYWQgd29ya2VkLCB0aGVuIGFjdHVhbGx5IGxvYWQgYW5kIHBhcnNlIHRoZSB0ZW1wbGF0ZSwgYW5kIHdhaXQgZm9yIGFueSBzdHlsZVxuICAgICAgLy8gVVJMcyB0byByZXNvbHZlLlxuICAgICAgaWYgKHRlbXBsYXRlUHJvbWlzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZVByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgY29uc3Qge3BhcnNlVGVtcGxhdGUsIHRlbXBsYXRlU291cmNlTWFwcGluZ30gPVxuICAgICAgICAgICAgICB0aGlzLl9leHRyYWN0RXh0ZXJuYWxUZW1wbGF0ZShub2RlLCBjb21wb25lbnQsIHRlbXBsYXRlVXJsRXhwciwgcmVzb3VyY2VVcmwpO1xuICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gcGFyc2VUZW1wbGF0ZSgpO1xuICAgICAgICAgIHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuc2V0KFxuICAgICAgICAgICAgICBub2RlLCB7Li4udGVtcGxhdGUsIHBhcnNlVGVtcGxhdGUsIHRlbXBsYXRlU291cmNlTWFwcGluZ30pO1xuICAgICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB7cGFyc2VUZW1wbGF0ZSwgdGVtcGxhdGVTb3VyY2VNYXBwaW5nfSA9XG4gICAgICAgICAgdGhpcy5fZXh0cmFjdElubGluZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUoKTtcbiAgICAgIHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuc2V0KG5vZGUsIHsuLi50ZW1wbGF0ZSwgcGFyc2VUZW1wbGF0ZSwgdGVtcGxhdGVTb3VyY2VNYXBwaW5nfSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRlbXBsYXRlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0RXh0ZXJuYWxUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIHRlbXBsYXRlVXJsRXhwcjogdHMuRXhwcmVzc2lvbixcbiAgICAgIHJlc291cmNlVXJsOiBzdHJpbmcpOiB7XG4gICAgcGFyc2VUZW1wbGF0ZTogKG9wdGlvbnM/OiBQYXJzZVRlbXBsYXRlT3B0aW9ucykgPT4gUGFyc2VkVGVtcGxhdGU7XG4gICAgdGVtcGxhdGVTb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmdcbiAgfSB7XG4gICAgY29uc3QgdGVtcGxhdGVTdHIgPSB0aGlzLnJlc291cmNlTG9hZGVyLmxvYWQocmVzb3VyY2VVcmwpO1xuICAgIHRoaXMucmVzb3VyY2VEZXBlbmRlbmNpZXMucmVjb3JkUmVzb3VyY2VEZXBlbmRlbmN5KG5vZGUuZ2V0U291cmNlRmlsZSgpLCByZXNvdXJjZVVybCk7XG4gICAgY29uc3QgcGFyc2VUZW1wbGF0ZSA9IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IHRoaXMuX3BhcnNlVGVtcGxhdGUoXG4gICAgICAgIGNvbXBvbmVudCwgdGVtcGxhdGVTdHIsIHNvdXJjZU1hcFVybChyZXNvdXJjZVVybCksXG4gICAgICAgIC8qIHRlbXBsYXRlUmFuZ2UgKi8gdW5kZWZpbmVkLFxuICAgICAgICAvKiBlc2NhcGVkU3RyaW5nICovIGZhbHNlLCBvcHRpb25zKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZyA9IHtcbiAgICAgIHR5cGU6ICdleHRlcm5hbCcsXG4gICAgICBjb21wb25lbnRDbGFzczogbm9kZSxcbiAgICAgIG5vZGU6IHRlbXBsYXRlVXJsRXhwcixcbiAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVN0cixcbiAgICAgIHRlbXBsYXRlVXJsOiByZXNvdXJjZVVybCxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtwYXJzZVRlbXBsYXRlLCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmd9O1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdElubGluZVRlbXBsYXRlKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gICAgICBjb250YWluaW5nRmlsZTogc3RyaW5nKToge1xuICAgIHBhcnNlVGVtcGxhdGU6IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IFBhcnNlZFRlbXBsYXRlO1xuICAgIHRlbXBsYXRlU291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nXG4gIH0ge1xuICAgIGlmICghY29tcG9uZW50LmhhcygndGVtcGxhdGUnKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5DT01QT05FTlRfTUlTU0lOR19URU1QTEFURSwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgICdjb21wb25lbnQgaXMgbWlzc2luZyBhIHRlbXBsYXRlJyk7XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlJykgITtcblxuICAgIGxldCB0ZW1wbGF0ZVN0cjogc3RyaW5nO1xuICAgIGxldCB0ZW1wbGF0ZVVybDogc3RyaW5nID0gJyc7XG4gICAgbGV0IHRlbXBsYXRlUmFuZ2U6IExleGVyUmFuZ2V8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgICBsZXQgZXNjYXBlZFN0cmluZyA9IGZhbHNlO1xuICAgIC8vIFdlIG9ubHkgc3VwcG9ydCBTb3VyY2VNYXBzIGZvciBpbmxpbmUgdGVtcGxhdGVzIHRoYXQgYXJlIHNpbXBsZSBzdHJpbmcgbGl0ZXJhbHMuXG4gICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbCh0ZW1wbGF0ZUV4cHIpIHx8IHRzLmlzTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwodGVtcGxhdGVFeHByKSkge1xuICAgICAgLy8gdGhlIHN0YXJ0IGFuZCBlbmQgb2YgdGhlIGB0ZW1wbGF0ZUV4cHJgIG5vZGUgaW5jbHVkZXMgdGhlIHF1b3RhdGlvbiBtYXJrcywgd2hpY2ggd2VcbiAgICAgIC8vIG11c3RcbiAgICAgIC8vIHN0cmlwXG4gICAgICB0ZW1wbGF0ZVJhbmdlID0gZ2V0VGVtcGxhdGVSYW5nZSh0ZW1wbGF0ZUV4cHIpO1xuICAgICAgdGVtcGxhdGVTdHIgPSB0ZW1wbGF0ZUV4cHIuZ2V0U291cmNlRmlsZSgpLnRleHQ7XG4gICAgICB0ZW1wbGF0ZVVybCA9IGNvbnRhaW5pbmdGaWxlO1xuICAgICAgZXNjYXBlZFN0cmluZyA9IHRydWU7XG4gICAgICB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgIHR5cGU6ICdkaXJlY3QnLFxuICAgICAgICBub2RlOiB0ZW1wbGF0ZUV4cHIgYXModHMuU3RyaW5nTGl0ZXJhbCB8IHRzLk5vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHJlc29sdmVkVGVtcGxhdGUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZUV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZFRlbXBsYXRlICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHRlbXBsYXRlRXhwciwgJ3RlbXBsYXRlIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIHRlbXBsYXRlU3RyID0gcmVzb2x2ZWRUZW1wbGF0ZTtcbiAgICAgIHRlbXBsYXRlU291cmNlTWFwcGluZyA9IHtcbiAgICAgICAgdHlwZTogJ2luZGlyZWN0JyxcbiAgICAgICAgbm9kZTogdGVtcGxhdGVFeHByLFxuICAgICAgICBjb21wb25lbnRDbGFzczogbm9kZSxcbiAgICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlU3RyLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXJzZVRlbXBsYXRlID0gKG9wdGlvbnM/OiBQYXJzZVRlbXBsYXRlT3B0aW9ucykgPT4gdGhpcy5fcGFyc2VUZW1wbGF0ZShcbiAgICAgICAgY29tcG9uZW50LCB0ZW1wbGF0ZVN0ciwgdGVtcGxhdGVVcmwsIHRlbXBsYXRlUmFuZ2UsIGVzY2FwZWRTdHJpbmcsIG9wdGlvbnMpO1xuXG4gICAgcmV0dXJuIHtwYXJzZVRlbXBsYXRlLCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmd9O1xuICB9XG5cbiAgcHJpdmF0ZSBfcGFyc2VUZW1wbGF0ZShcbiAgICAgIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIHRlbXBsYXRlU3RyOiBzdHJpbmcsIHRlbXBsYXRlVXJsOiBzdHJpbmcsXG4gICAgICB0ZW1wbGF0ZVJhbmdlOiBMZXhlclJhbmdlfHVuZGVmaW5lZCwgZXNjYXBlZFN0cmluZzogYm9vbGVhbixcbiAgICAgIG9wdGlvbnM6IFBhcnNlVGVtcGxhdGVPcHRpb25zID0ge30pOiBQYXJzZWRUZW1wbGF0ZSB7XG4gICAgbGV0IHByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4gPSB0aGlzLmRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KCdwcmVzZXJ2ZVdoaXRlc3BhY2VzJykgITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCAncHJlc2VydmVXaGl0ZXNwYWNlcyBtdXN0IGJlIGEgYm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlcyA9IHZhbHVlO1xuICAgIH1cblxuICAgIGxldCBpbnRlcnBvbGF0aW9uOiBJbnRlcnBvbGF0aW9uQ29uZmlnID0gREVGQVVMVF9JTlRFUlBPTEFUSU9OX0NPTkZJRztcbiAgICBpZiAoY29tcG9uZW50LmhhcygnaW50ZXJwb2xhdGlvbicpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgnaW50ZXJwb2xhdGlvbicpICE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZS5sZW5ndGggIT09IDIgfHxcbiAgICAgICAgICAhdmFsdWUuZXZlcnkoZWxlbWVudCA9PiB0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICAgICdpbnRlcnBvbGF0aW9uIG11c3QgYmUgYW4gYXJyYXkgd2l0aCAyIGVsZW1lbnRzIG9mIHN0cmluZyB0eXBlJyk7XG4gICAgICB9XG4gICAgICBpbnRlcnBvbGF0aW9uID0gSW50ZXJwb2xhdGlvbkNvbmZpZy5mcm9tQXJyYXkodmFsdWUgYXNbc3RyaW5nLCBzdHJpbmddKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaW50ZXJwb2xhdGlvbixcbiAgICAgIC4uLnBhcnNlVGVtcGxhdGUodGVtcGxhdGVTdHIsIHRlbXBsYXRlVXJsLCB7XG4gICAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMsXG4gICAgICAgIGludGVycG9sYXRpb25Db25maWc6IGludGVycG9sYXRpb24sXG4gICAgICAgIHJhbmdlOiB0ZW1wbGF0ZVJhbmdlLCBlc2NhcGVkU3RyaW5nLFxuICAgICAgICBpMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiB0aGlzLmkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQsIC4uLm9wdGlvbnMsXG4gICAgICB9KSxcbiAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVN0ciwgdGVtcGxhdGVVcmwsXG4gICAgICBpc0lubGluZTogY29tcG9uZW50LmhhcygndGVtcGxhdGUnKSxcbiAgICAgIGZpbGU6IG5ldyBQYXJzZVNvdXJjZUZpbGUodGVtcGxhdGVTdHIsIHRlbXBsYXRlVXJsKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfZXhwcmVzc2lvblRvSW1wb3J0ZWRGaWxlKGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGV8bnVsbCB7XG4gICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgd2hhdCBmaWxlIGlzIGJlaW5nIGltcG9ydGVkLlxuICAgIHJldHVybiB0aGlzLm1vZHVsZVJlc29sdmVyLnJlc29sdmVNb2R1bGVOYW1lKGV4cHIudmFsdWUubW9kdWxlTmFtZSAhLCBvcmlnaW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBfaXNDeWNsaWNJbXBvcnQoZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLl9leHByZXNzaW9uVG9JbXBvcnRlZEZpbGUoZXhwciwgb3JpZ2luKTtcbiAgICBpZiAoaW1wb3J0ZWQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSBpbXBvcnQgaXMgbGVnYWwuXG4gICAgcmV0dXJuIHRoaXMuY3ljbGVBbmFseXplci53b3VsZENyZWF0ZUN5Y2xlKG9yaWdpbiwgaW1wb3J0ZWQpO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVjb3JkU3ludGhldGljSW1wb3J0KGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGNvbnN0IGltcG9ydGVkID0gdGhpcy5fZXhwcmVzc2lvblRvSW1wb3J0ZWRGaWxlKGV4cHIsIG9yaWdpbik7XG4gICAgaWYgKGltcG9ydGVkID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jeWNsZUFuYWx5emVyLnJlY29yZFN5bnRoZXRpY0ltcG9ydChvcmlnaW4sIGltcG9ydGVkKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUZW1wbGF0ZVJhbmdlKHRlbXBsYXRlRXhwcjogdHMuRXhwcmVzc2lvbikge1xuICBjb25zdCBzdGFydFBvcyA9IHRlbXBsYXRlRXhwci5nZXRTdGFydCgpICsgMTtcbiAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPVxuICAgICAgdHMuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24odGVtcGxhdGVFeHByLmdldFNvdXJjZUZpbGUoKSwgc3RhcnRQb3MpO1xuICByZXR1cm4ge1xuICAgIHN0YXJ0UG9zLFxuICAgIHN0YXJ0TGluZTogbGluZSxcbiAgICBzdGFydENvbDogY2hhcmFjdGVyLFxuICAgIGVuZFBvczogdGVtcGxhdGVFeHByLmdldEVuZCgpIC0gMSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gc291cmNlTWFwVXJsKHJlc291cmNlVXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIXRzU291cmNlTWFwQnVnMjkzMDBGaXhlZCgpKSB7XG4gICAgLy8gQnkgcmVtb3ZpbmcgdGhlIHRlbXBsYXRlIFVSTCB3ZSBhcmUgdGVsbGluZyB0aGUgdHJhbnNsYXRvciBub3QgdG8gdHJ5IHRvXG4gICAgLy8gbWFwIHRoZSBleHRlcm5hbCBzb3VyY2UgZmlsZSB0byB0aGUgZ2VuZXJhdGVkIGNvZGUsIHNpbmNlIHRoZSB2ZXJzaW9uXG4gICAgLy8gb2YgVFMgdGhhdCBpcyBydW5uaW5nIGRvZXMgbm90IHN1cHBvcnQgaXQuXG4gICAgcmV0dXJuICcnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZXNvdXJjZVVybDtcbiAgfVxufVxuXG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHRlbXBsYXRlIHdoaWNoIHdhcyBleHRyYWN0ZWQgZHVyaW5nIHBhcnNpbmcuXG4gKlxuICogVGhpcyBjb250YWlucyB0aGUgYWN0dWFsIHBhcnNlZCB0ZW1wbGF0ZSBhcyB3ZWxsIGFzIGFueSBtZXRhZGF0YSBjb2xsZWN0ZWQgZHVyaW5nIGl0cyBwYXJzaW5nLFxuICogc29tZSBvZiB3aGljaCBtaWdodCBiZSB1c2VmdWwgZm9yIHJlLXBhcnNpbmcgdGhlIHRlbXBsYXRlIHdpdGggZGlmZmVyZW50IG9wdGlvbnMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkVGVtcGxhdGUge1xuICAvKipcbiAgICogVGhlIGBJbnRlcnBvbGF0aW9uQ29uZmlnYCBzcGVjaWZpZWQgYnkgdGhlIHVzZXIuXG4gICAqL1xuICBpbnRlcnBvbGF0aW9uOiBJbnRlcnBvbGF0aW9uQ29uZmlnO1xuXG4gIC8qKlxuICAgKiBBIGZ1bGwgcGF0aCB0byB0aGUgZmlsZSB3aGljaCBjb250YWlucyB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIFRoaXMgY2FuIGJlIGVpdGhlciB0aGUgb3JpZ2luYWwgLnRzIGZpbGUgaWYgdGhlIHRlbXBsYXRlIGlzIGlubGluZSwgb3IgdGhlIC5odG1sIGZpbGUgaWYgYW5cbiAgICogZXh0ZXJuYWwgZmlsZSB3YXMgdXNlZC5cbiAgICovXG4gIHRlbXBsYXRlVXJsOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBzdHJpbmcgY29udGVudHMgb2YgdGhlIHRlbXBsYXRlLlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBcImxvZ2ljYWxcIiB0ZW1wbGF0ZSBzdHJpbmcsIGFmdGVyIGV4cGFuc2lvbiBvZiBhbnkgZXNjYXBlZCBjaGFyYWN0ZXJzIChmb3IgaW5saW5lXG4gICAqIHRlbXBsYXRlcykuIFRoaXMgbWF5IGRpZmZlciBmcm9tIHRoZSBhY3R1YWwgdGVtcGxhdGUgYnl0ZXMgYXMgdGhleSBhcHBlYXIgaW4gdGhlIC50cyBmaWxlLlxuICAgKi9cbiAgdGVtcGxhdGU6IHN0cmluZztcblxuICAvKipcbiAgICogQW55IGVycm9ycyBmcm9tIHBhcnNpbmcgdGhlIHRlbXBsYXRlIHRoZSBmaXJzdCB0aW1lLlxuICAgKi9cbiAgZXJyb3JzPzogUGFyc2VFcnJvcltdfHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogVGhlIGFjdHVhbCBwYXJzZWQgdGVtcGxhdGUgbm9kZXMuXG4gICAqL1xuICBub2RlczogVG1wbEFzdE5vZGVbXTtcblxuICAvKipcbiAgICogQW55IHN0eWxlVXJscyBleHRyYWN0ZWQgZnJvbSB0aGUgbWV0YWRhdGEuXG4gICAqL1xuICBzdHlsZVVybHM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBBbnkgaW5saW5lIHN0eWxlcyBleHRyYWN0ZWQgZnJvbSB0aGUgbWV0YWRhdGEuXG4gICAqL1xuICBzdHlsZXM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSB0ZW1wbGF0ZSB3YXMgaW5saW5lLlxuICAgKi9cbiAgaXNJbmxpbmU6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBgUGFyc2VTb3VyY2VGaWxlYCBmb3IgdGhlIHRlbXBsYXRlLlxuICAgKi9cbiAgZmlsZTogUGFyc2VTb3VyY2VGaWxlO1xufVxuXG5pbnRlcmZhY2UgUHJlYW5hbHl6ZWRUZW1wbGF0ZSBleHRlbmRzIFBhcnNlZFRlbXBsYXRlIHtcbiAgcGFyc2VUZW1wbGF0ZTogKG9wdGlvbnM/OiBQYXJzZVRlbXBsYXRlT3B0aW9ucykgPT4gUGFyc2VkVGVtcGxhdGU7XG4gIHRlbXBsYXRlU291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xufVxuIl19