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
        function ComponentDecoratorHandler(reflector, evaluator, metaRegistry, metaReader, scopeReader, scopeRegistry, isCore, resourceLoader, rootDirs, defaultPreserveWhitespaces, i18nUseExternalIds, moduleResolver, cycleAnalyzer, refEmitter, defaultImportRecorder, resourceDependencies) {
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
        ComponentDecoratorHandler.prototype.analyze = function (node, decorator) {
            var e_1, _a;
            var containingFile = node.getSourceFile().fileName;
            this.literalCache.delete(decorator);
            // @Component inherits @Directive, so begin by extracting the @Directive metadata and building
            // on it.
            var directiveResult = directive_1.extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.defaultImportRecorder, this.isCore, this.elementSchemaRegistry.getDefaultComponentElementName());
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
            // If the component has a selector, it should be registered with the
            // `LocalModuleScopeRegistry`
            // so that when this component appears in an `@NgModule` scope, its selector can be
            // determined.
            if (metadata.selector !== null) {
                var ref = new imports_1.Reference(node);
                this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign({ ref: ref, name: node.name.text, selector: metadata.selector, exportAs: metadata.exportAs, inputs: metadata.inputs, outputs: metadata.outputs, queries: metadata.queries.map(function (query) { return query.propertyName; }), isComponent: true }, metadata_1.extractDirectiveGuards(node, this.reflector), { baseClass: util_1.readBaseClass(node, this.reflector, this.evaluator) }));
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
                    meta: tslib_1.__assign({}, metadata, { template: template,
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
                        matcher.addSelectables(compiler_1.CssSelector.parse(directive.selector), directive);
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
                        var extMeta = inheritance_1.flattenInheritedDirectiveMetadata(this.metaReader, meta_1.ref);
                        matcher.addSelectables(compiler_1.CssSelector.parse(meta_1.selector), extMeta);
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
                // module file sets the directives/pipes on the ngComponentDef of the component, without
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
                        var expression = this.refEmitter.emit(ref, context);
                        directives.push({ selector: selector, expression: expression });
                        matcher.addSelectables(compiler_1.CssSelector.parse(selector), tslib_1.__assign({}, dir, { expression: expression }));
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
                    // Check whether the directive/pipe arrays in ngComponentDef need to be wrapped in closures.
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
            var factoryRes = factory_1.compileNgFactoryDefField(meta);
            if (analysis.metadataStmt !== null) {
                factoryRes.statements.push(analysis.metadataStmt);
            }
            return [
                factoryRes, {
                    name: 'ngComponentDef',
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
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.node, "Incorrect number of arguments to @Component decorator");
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
                        _this.preanalyzeTemplateCache.set(node, tslib_1.__assign({}, template, { parseTemplate: parseTemplate, templateSourceMapping: templateSourceMapping }));
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
                this.preanalyzeTemplateCache.set(node, tslib_1.__assign({}, template, { parseTemplate: parseTemplate_1, templateSourceMapping: templateSourceMapping }));
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
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_MISSING_TEMPLATE, decorator.node, 'component is missing a template');
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
            return tslib_1.__assign({ interpolation: interpolation }, compiler_1.parseTemplate(templateStr, templateUrl, tslib_1.__assign({ preserveWhitespaces: preserveWhitespaces, interpolationConfig: interpolation, range: templateRange, escapedString: escapedString }, options)), { template: templateStr, templateUrl: templateUrl, isInline: component.has('template'), file: new compiler_1.ParseSourceFile(templateStr, templateUrl) });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFpWjtJQUNqWiwrQkFBaUM7SUFHakMsMkVBQWtFO0lBQ2xFLDJFQUF5RDtJQUN6RCxtRUFBaUc7SUFFakcscUVBQXVHO0lBQ3ZHLHdGQUFpRjtJQUNqRix1RkFBb0U7SUFDcEUseUVBQW1HO0lBRW5HLHVFQUFnSTtJQUVoSSxnR0FBNEc7SUFDNUcsNEdBQWdGO0lBR2hGLHVGQUEyRTtJQUMzRSxtRkFBbUQ7SUFDbkQscUZBQXdEO0lBQ3hELDZFQUFtSTtJQUVuSSxJQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztJQUNoRCxJQUFNLFdBQVcsR0FBVSxFQUFFLENBQUM7SUFVOUI7O09BRUc7SUFDSDtRQUVFLG1DQUNZLFNBQXlCLEVBQVUsU0FBMkIsRUFDOUQsWUFBOEIsRUFBVSxVQUEwQixFQUNsRSxXQUFpQyxFQUFVLGFBQXVDLEVBQ2xGLE1BQWUsRUFBVSxjQUE4QixFQUFVLFFBQWtCLEVBQ25GLDBCQUFtQyxFQUFVLGtCQUEyQixFQUN4RSxjQUE4QixFQUFVLGFBQTRCLEVBQ3BFLFVBQTRCLEVBQVUscUJBQTRDLEVBQ2xGLG9CQUM2RDtZQUQ3RCxxQ0FBQSxFQUFBLDJCQUM2QixrREFBOEIsRUFBRTtZQVI3RCxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzlELGlCQUFZLEdBQVosWUFBWSxDQUFrQjtZQUFVLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQ2xFLGdCQUFXLEdBQVgsV0FBVyxDQUFzQjtZQUFVLGtCQUFhLEdBQWIsYUFBYSxDQUEwQjtZQUNsRixXQUFN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QUFDO1lBQzlELElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDckIsT0FBTzthQUNSO1lBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUNILGdDQUFDO0lBQUQsQ0FBQyxBQWhyQkQsSUFnckJDO0lBaHJCWSw4REFBeUI7SUFrckJ0QyxTQUFTLGdCQUFnQixDQUFDLFlBQTJCO1FBQ25ELElBQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkMsSUFBQSw2RUFDc0UsRUFEckUsY0FBSSxFQUFFLHdCQUMrRCxDQUFDO1FBQzdFLE9BQU87WUFDTCxRQUFRLFVBQUE7WUFDUixTQUFTLEVBQUUsSUFBSTtZQUNmLFFBQVEsRUFBRSxTQUFTO1lBQ25CLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztTQUNsQyxDQUFDO0lBQ0osQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFDLFdBQW1CO1FBQ3ZDLElBQUksQ0FBQyxrREFBd0IsRUFBRSxFQUFFO1lBQy9CLDJFQUEyRTtZQUMzRSx3RUFBd0U7WUFDeEUsNkNBQTZDO1lBQzdDLE9BQU8sRUFBRSxDQUFDO1NBQ1g7YUFBTTtZQUNMLE9BQU8sV0FBVyxDQUFDO1NBQ3BCO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIENzc1NlbGVjdG9yLCBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgSW50ZXJwb2xhdGlvbkNvbmZpZywgTGV4ZXJSYW5nZSwgUGFyc2VFcnJvciwgUGFyc2VTb3VyY2VGaWxlLCBQYXJzZVRlbXBsYXRlT3B0aW9ucywgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNUYXJnZXRCaW5kZXIsIFNjaGVtYU1ldGFkYXRhLCBTZWxlY3Rvck1hdGNoZXIsIFN0YXRlbWVudCwgVG1wbEFzdE5vZGUsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YSwgbWFrZUJpbmRpbmdQYXJzZXIsIHBhcnNlVGVtcGxhdGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0N5Y2xlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL2N5Y2xlcyc7XG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCByZWxhdGl2ZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIE1vZHVsZVJlc29sdmVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtJbmRleGluZ0NvbnRleHR9IGZyb20gJy4uLy4uL2luZGV4ZXInO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgZXh0cmFjdERpcmVjdGl2ZUd1YXJkc30gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGF9IGZyb20gJy4uLy4uL21ldGFkYXRhL3NyYy9pbmhlcml0YW5jZSc7XG5pbXBvcnQge0VudW1WYWx1ZSwgUGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge1RlbXBsYXRlU291cmNlTWFwcGluZywgVHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7Tm9vcFJlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyLCBSZXNvdXJjZURlcGVuZGVuY3lSZWNvcmRlcn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcmVzb3VyY2VfcmVjb3JkZXInO1xuaW1wb3J0IHt0c1NvdXJjZU1hcEJ1ZzI5MzAwRml4ZWR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3RzX3NvdXJjZV9tYXBfYnVnXzI5MzAwJztcblxuaW1wb3J0IHtSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEsIHBhcnNlRmllbGRBcnJheVZhbHVlfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQge2NvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZH0gZnJvbSAnLi9mYWN0b3J5JztcbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge2ZpbmRBbmd1bGFyRGVjb3JhdG9yLCBpc0FuZ3VsYXJDb3JlUmVmZXJlbmNlLCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlLCByZWFkQmFzZUNsYXNzLCB1bndyYXBFeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9NQVAgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcbmNvbnN0IEVNUFRZX0FSUkFZOiBhbnlbXSA9IFtdO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvbmVudEhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNDb21wb25lbnRNZXRhZGF0YTtcbiAgcGFyc2VkVGVtcGxhdGU6IFBhcnNlZFRlbXBsYXRlO1xuICB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcbiAgcGFyc2VUZW1wbGF0ZTogKG9wdGlvbnM/OiBQYXJzZVRlbXBsYXRlT3B0aW9ucykgPT4gUGFyc2VkVGVtcGxhdGU7XG59XG5cbi8qKlxuICogYERlY29yYXRvckhhbmRsZXJgIHdoaWNoIGhhbmRsZXMgdGhlIGBAQ29tcG9uZW50YCBhbm5vdGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxDb21wb25lbnRIYW5kbGVyRGF0YSwgRGVjb3JhdG9yPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICAgIHByaXZhdGUgbWV0YVJlZ2lzdHJ5OiBNZXRhZGF0YVJlZ2lzdHJ5LCBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLFxuICAgICAgcHJpdmF0ZSBzY29wZVJlYWRlcjogQ29tcG9uZW50U2NvcGVSZWFkZXIsIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sIHByaXZhdGUgcmVzb3VyY2VMb2FkZXI6IFJlc291cmNlTG9hZGVyLCBwcml2YXRlIHJvb3REaXJzOiBzdHJpbmdbXSxcbiAgICAgIHByaXZhdGUgZGVmYXVsdFByZXNlcnZlV2hpdGVzcGFjZXM6IGJvb2xlYW4sIHByaXZhdGUgaTE4blVzZUV4dGVybmFsSWRzOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXIsIHByaXZhdGUgY3ljbGVBbmFseXplcjogQ3ljbGVBbmFseXplcixcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgcmVzb3VyY2VEZXBlbmRlbmNpZXM6XG4gICAgICAgICAgUmVzb3VyY2VEZXBlbmRlbmN5UmVjb3JkZXIgPSBuZXcgTm9vcFJlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyKCkpIHt9XG5cbiAgcHJpdmF0ZSBsaXRlcmFsQ2FjaGUgPSBuZXcgTWFwPERlY29yYXRvciwgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24+KCk7XG4gIHByaXZhdGUgZWxlbWVudFNjaGVtYVJlZ2lzdHJ5ID0gbmV3IERvbUVsZW1lbnRTY2hlbWFSZWdpc3RyeSgpO1xuXG4gIC8qKlxuICAgKiBEdXJpbmcgdGhlIGFzeW5jaHJvbm91cyBwcmVhbmFseXplIHBoYXNlLCBpdCdzIG5lY2Vzc2FyeSB0byBwYXJzZSB0aGUgdGVtcGxhdGUgdG8gZXh0cmFjdFxuICAgKiBhbnkgcG90ZW50aWFsIDxsaW5rPiB0YWdzIHdoaWNoIG1pZ2h0IG5lZWQgdG8gYmUgbG9hZGVkLiBUaGlzIGNhY2hlIGVuc3VyZXMgdGhhdCB3b3JrIGlzIG5vdFxuICAgKiB0aHJvd24gYXdheSwgYW5kIHRoZSBwYXJzZWQgdGVtcGxhdGUgaXMgcmV1c2VkIGR1cmluZyB0aGUgYW5hbHl6ZSBwaGFzZS5cbiAgICovXG4gIHByaXZhdGUgcHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBQcmVhbmFseXplZFRlbXBsYXRlPigpO1xuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdDb21wb25lbnQnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgcHJlYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICAvLyBJbiBwcmVhbmFseXplLCByZXNvdXJjZSBVUkxzIGFzc29jaWF0ZWQgd2l0aCB0aGUgY29tcG9uZW50IGFyZSBhc3luY2hyb25vdXNseSBwcmVsb2FkZWQgdmlhXG4gICAgLy8gdGhlIHJlc291cmNlTG9hZGVyLiBUaGlzIGlzIHRoZSBvbmx5IHRpbWUgYXN5bmMgb3BlcmF0aW9ucyBhcmUgYWxsb3dlZCBmb3IgYSBjb21wb25lbnQuXG4gICAgLy8gVGhlc2UgcmVzb3VyY2VzIGFyZTpcbiAgICAvL1xuICAgIC8vIC0gdGhlIHRlbXBsYXRlVXJsLCBpZiB0aGVyZSBpcyBvbmVcbiAgICAvLyAtIGFueSBzdHlsZVVybHMgaWYgcHJlc2VudFxuICAgIC8vIC0gYW55IHN0eWxlc2hlZXRzIHJlZmVyZW5jZWQgZnJvbSA8bGluaz4gdGFncyBpbiB0aGUgdGVtcGxhdGUgaXRzZWxmXG4gICAgLy9cbiAgICAvLyBBcyBhIHJlc3VsdCBvZiB0aGUgbGFzdCBvbmUsIHRoZSB0ZW1wbGF0ZSBtdXN0IGJlIHBhcnNlZCBhcyBwYXJ0IG9mIHByZWFuYWx5c2lzIHRvIGV4dHJhY3RcbiAgICAvLyA8bGluaz4gdGFncywgd2hpY2ggbWF5IGludm9sdmUgd2FpdGluZyBmb3IgdGhlIHRlbXBsYXRlVXJsIHRvIGJlIHJlc29sdmVkIGZpcnN0LlxuXG4gICAgLy8gSWYgcHJlbG9hZGluZyBpc24ndCBwb3NzaWJsZSwgdGhlbiBza2lwIHRoaXMgc3RlcC5cbiAgICBpZiAoIXRoaXMucmVzb3VyY2VMb2FkZXIuY2FuUHJlbG9hZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBtZXRhID0gdGhpcy5fcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yKTtcbiAgICBjb25zdCBjb21wb25lbnQgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcbiAgICBjb25zdCBjb250YWluaW5nRmlsZSA9IG5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuXG4gICAgLy8gQ29udmVydCBhIHN0eWxlVXJsIHN0cmluZyBpbnRvIGEgUHJvbWlzZSB0byBwcmVsb2FkIGl0LlxuICAgIGNvbnN0IHJlc29sdmVTdHlsZVVybCA9IChzdHlsZVVybDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgY29uc3QgcHJvbWlzZSA9IHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCk7XG4gICAgICByZXR1cm4gcHJvbWlzZSB8fCBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9O1xuXG4gICAgLy8gQSBQcm9taXNlIHRoYXQgd2FpdHMgZm9yIHRoZSB0ZW1wbGF0ZSBhbmQgYWxsIDxsaW5rPmVkIHN0eWxlcyB3aXRoaW4gaXQgdG8gYmUgcHJlbG9hZGVkLlxuICAgIGNvbnN0IHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcyA9XG4gICAgICAgIHRoaXMuX3ByZWxvYWRBbmRQYXJzZVRlbXBsYXRlKG5vZGUsIGRlY29yYXRvciwgY29tcG9uZW50LCBjb250YWluaW5nRmlsZSkudGhlbih0ZW1wbGF0ZSA9PiB7XG4gICAgICAgICAgaWYgKHRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwodGVtcGxhdGUuc3R5bGVVcmxzLm1hcChyZXNvbHZlU3R5bGVVcmwpKS50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIC8vIEV4dHJhY3QgYWxsIHRoZSBzdHlsZVVybHMgaW4gdGhlIGRlY29yYXRvci5cbiAgICBjb25zdCBzdHlsZVVybHMgPSB0aGlzLl9leHRyYWN0U3R5bGVVcmxzKGNvbXBvbmVudCwgW10pO1xuXG4gICAgaWYgKHN0eWxlVXJscyA9PT0gbnVsbCkge1xuICAgICAgLy8gQSBmYXN0IHBhdGggZXhpc3RzIGlmIHRoZXJlIGFyZSBubyBzdHlsZVVybHMsIHRvIGp1c3Qgd2FpdCBmb3JcbiAgICAgIC8vIHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcy5cbiAgICAgIHJldHVybiB0ZW1wbGF0ZUFuZFRlbXBsYXRlU3R5bGVSZXNvdXJjZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFdhaXQgZm9yIGJvdGggdGhlIHRlbXBsYXRlIGFuZCBhbGwgc3R5bGVVcmwgcmVzb3VyY2VzIHRvIHJlc29sdmUuXG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW3RlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcywgLi4uc3R5bGVVcmxzLm1hcChyZXNvbHZlU3R5bGVVcmwpXSlcbiAgICAgICAgICAudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxDb21wb25lbnRIYW5kbGVyRGF0YT4ge1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuZGVsZXRlKGRlY29yYXRvcik7XG5cbiAgICAvLyBAQ29tcG9uZW50IGluaGVyaXRzIEBEaXJlY3RpdmUsIHNvIGJlZ2luIGJ5IGV4dHJhY3RpbmcgdGhlIEBEaXJlY3RpdmUgbWV0YWRhdGEgYW5kIGJ1aWxkaW5nXG4gICAgLy8gb24gaXQuXG4gICAgY29uc3QgZGlyZWN0aXZlUmVzdWx0ID0gZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhKFxuICAgICAgICBub2RlLCBkZWNvcmF0b3IsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICB0aGlzLmVsZW1lbnRTY2hlbWFSZWdpc3RyeS5nZXREZWZhdWx0Q29tcG9uZW50RWxlbWVudE5hbWUoKSk7XG4gICAgaWYgKGRpcmVjdGl2ZVJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBgZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhYCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIHRoZSBARGlyZWN0aXZlIGhhcyBgaml0OiB0cnVlYC4gSW4gdGhpc1xuICAgICAgLy8gY2FzZSwgY29tcGlsYXRpb24gb2YgdGhlIGRlY29yYXRvciBpcyBza2lwcGVkLiBSZXR1cm5pbmcgYW4gZW1wdHkgb2JqZWN0IHNpZ25pZmllc1xuICAgICAgLy8gdGhhdCBubyBhbmFseXNpcyB3YXMgcHJvZHVjZWQuXG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLy8gTmV4dCwgcmVhZCB0aGUgYEBDb21wb25lbnRgLXNwZWNpZmljIGZpZWxkcy5cbiAgICBjb25zdCB7ZGVjb3JhdG9yOiBjb21wb25lbnQsIG1ldGFkYXRhfSA9IGRpcmVjdGl2ZVJlc3VsdDtcblxuICAgIC8vIEdvIHRocm91Z2ggdGhlIHJvb3QgZGlyZWN0b3JpZXMgZm9yIHRoaXMgcHJvamVjdCwgYW5kIHNlbGVjdCB0aGUgb25lIHdpdGggdGhlIHNtYWxsZXN0XG4gICAgLy8gcmVsYXRpdmUgcGF0aCByZXByZXNlbnRhdGlvbi5cbiAgICBjb25zdCByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aCA9IHRoaXMucm9vdERpcnMucmVkdWNlPHN0cmluZ3x1bmRlZmluZWQ+KChwcmV2aW91cywgcm9vdERpcikgPT4ge1xuICAgICAgY29uc3QgY2FuZGlkYXRlID0gcmVsYXRpdmUoYWJzb2x1dGVGcm9tKHJvb3REaXIpLCBhYnNvbHV0ZUZyb20oY29udGFpbmluZ0ZpbGUpKTtcbiAgICAgIGlmIChwcmV2aW91cyA9PT0gdW5kZWZpbmVkIHx8IGNhbmRpZGF0ZS5sZW5ndGggPCBwcmV2aW91cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cztcbiAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQpICE7XG5cbiAgICBjb25zdCB2aWV3UHJvdmlkZXJzOiBFeHByZXNzaW9ufG51bGwgPSBjb21wb25lbnQuaGFzKCd2aWV3UHJvdmlkZXJzJykgP1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGNvbXBvbmVudC5nZXQoJ3ZpZXdQcm92aWRlcnMnKSAhKSA6XG4gICAgICAgIG51bGw7XG5cbiAgICAvLyBQYXJzZSB0aGUgdGVtcGxhdGUuXG4gICAgLy8gSWYgYSBwcmVhbmFseXplIHBoYXNlIHdhcyBleGVjdXRlZCwgdGhlIHRlbXBsYXRlIG1heSBhbHJlYWR5IGV4aXN0IGluIHBhcnNlZCBmb3JtLCBzbyBjaGVja1xuICAgIC8vIHRoZSBwcmVhbmFseXplVGVtcGxhdGVDYWNoZS5cbiAgICAvLyBFeHRyYWN0IGEgY2xvc3VyZSBvZiB0aGUgdGVtcGxhdGUgcGFyc2luZyBjb2RlIHNvIHRoYXQgaXQgY2FuIGJlIHJlcGFyc2VkIHdpdGggZGlmZmVyZW50XG4gICAgLy8gb3B0aW9ucyBpZiBuZWVkZWQsIGxpa2UgaW4gdGhlIGluZGV4aW5nIHBpcGVsaW5lLlxuICAgIGxldCBwYXJzZVRlbXBsYXRlOiAob3B0aW9ucz86IFBhcnNlVGVtcGxhdGVPcHRpb25zKSA9PiBQYXJzZWRUZW1wbGF0ZTtcbiAgICAvLyBUcmFjayB0aGUgb3JpZ2luIG9mIHRoZSB0ZW1wbGF0ZSB0byBkZXRlcm1pbmUgaG93IHRoZSBQYXJzZVNvdXJjZVNwYW5zIHNob3VsZCBiZSBpbnRlcnByZXRlZC5cbiAgICBsZXQgdGVtcGxhdGVTb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gICAgaWYgKHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuaGFzKG5vZGUpKSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUgd2FzIHBhcnNlZCBpbiBwcmVhbmFseXplLiBVc2UgaXQgYW5kIGRlbGV0ZSBpdCB0byBzYXZlIG1lbW9yeS5cbiAgICAgIGNvbnN0IHByZWFuYWx5emVkID0gdGhpcy5wcmVhbmFseXplVGVtcGxhdGVDYWNoZS5nZXQobm9kZSkgITtcbiAgICAgIHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuZGVsZXRlKG5vZGUpO1xuXG4gICAgICBwYXJzZVRlbXBsYXRlID0gcHJlYW5hbHl6ZWQucGFyc2VUZW1wbGF0ZTtcbiAgICAgIHRlbXBsYXRlU291cmNlTWFwcGluZyA9IHByZWFuYWx5emVkLnRlbXBsYXRlU291cmNlTWFwcGluZztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIHRlbXBsYXRlIHdhcyBub3QgYWxyZWFkeSBwYXJzZWQuIEVpdGhlciB0aGVyZSdzIGEgdGVtcGxhdGVVcmwsIG9yIGFuIGlubGluZSB0ZW1wbGF0ZS5cbiAgICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykgITtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVVcmwgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZVVybEV4cHIpO1xuICAgICAgICBpZiAodHlwZW9mIHRlbXBsYXRlVXJsICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZVVybEV4cHIsICd0ZW1wbGF0ZVVybCBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgY29uc3QgZXh0ZXJuYWwgPVxuICAgICAgICAgICAgdGhpcy5fZXh0cmFjdEV4dGVybmFsVGVtcGxhdGUobm9kZSwgY29tcG9uZW50LCB0ZW1wbGF0ZVVybEV4cHIsIHJlc291cmNlVXJsKTtcblxuICAgICAgICBwYXJzZVRlbXBsYXRlID0gZXh0ZXJuYWwucGFyc2VUZW1wbGF0ZTtcbiAgICAgICAgdGVtcGxhdGVTb3VyY2VNYXBwaW5nID0gZXh0ZXJuYWwudGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRXhwZWN0IGFuIGlubGluZSB0ZW1wbGF0ZSB0byBiZSBwcmVzZW50LlxuICAgICAgICBjb25zdCBpbmxpbmUgPSB0aGlzLl9leHRyYWN0SW5saW5lVGVtcGxhdGUobm9kZSwgZGVjb3JhdG9yLCBjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKTtcblxuICAgICAgICBwYXJzZVRlbXBsYXRlID0gaW5saW5lLnBhcnNlVGVtcGxhdGU7XG4gICAgICAgIHRlbXBsYXRlU291cmNlTWFwcGluZyA9IGlubGluZS50ZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHRlbXBsYXRlID0gcGFyc2VUZW1wbGF0ZSgpO1xuXG4gICAgaWYgKHRlbXBsYXRlLmVycm9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEVycm9ycyBwYXJzaW5nIHRlbXBsYXRlOiAke3RlbXBsYXRlLmVycm9ycy5tYXAoZSA9PiBlLnRvU3RyaW5nKCkpLmpvaW4oJywgJyl9YCk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIGNvbXBvbmVudCBoYXMgYSBzZWxlY3RvciwgaXQgc2hvdWxkIGJlIHJlZ2lzdGVyZWQgd2l0aCB0aGVcbiAgICAvLyBgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5YFxuICAgIC8vIHNvIHRoYXQgd2hlbiB0aGlzIGNvbXBvbmVudCBhcHBlYXJzIGluIGFuIGBATmdNb2R1bGVgIHNjb3BlLCBpdHMgc2VsZWN0b3IgY2FuIGJlXG4gICAgLy8gZGV0ZXJtaW5lZC5cbiAgICBpZiAobWV0YWRhdGEuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKHtcbiAgICAgICAgcmVmLFxuICAgICAgICBuYW1lOiBub2RlLm5hbWUudGV4dCxcbiAgICAgICAgc2VsZWN0b3I6IG1ldGFkYXRhLnNlbGVjdG9yLFxuICAgICAgICBleHBvcnRBczogbWV0YWRhdGEuZXhwb3J0QXMsXG4gICAgICAgIGlucHV0czogbWV0YWRhdGEuaW5wdXRzLFxuICAgICAgICBvdXRwdXRzOiBtZXRhZGF0YS5vdXRwdXRzLFxuICAgICAgICBxdWVyaWVzOiBtZXRhZGF0YS5xdWVyaWVzLm1hcChxdWVyeSA9PiBxdWVyeS5wcm9wZXJ0eU5hbWUpLFxuICAgICAgICBpc0NvbXBvbmVudDogdHJ1ZSwgLi4uZXh0cmFjdERpcmVjdGl2ZUd1YXJkcyhub2RlLCB0aGlzLnJlZmxlY3RvciksXG4gICAgICAgIGJhc2VDbGFzczogcmVhZEJhc2VDbGFzcyhub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRmlndXJlIG91dCB0aGUgc2V0IG9mIHN0eWxlcy4gVGhlIG9yZGVyaW5nIGhlcmUgaXMgaW1wb3J0YW50OiBleHRlcm5hbCByZXNvdXJjZXMgKHN0eWxlVXJscylcbiAgICAvLyBwcmVjZWRlIGlubGluZSBzdHlsZXMsIGFuZCBzdHlsZXMgZGVmaW5lZCBpbiB0aGUgdGVtcGxhdGUgb3ZlcnJpZGUgc3R5bGVzIGRlZmluZWQgaW4gdGhlXG4gICAgLy8gY29tcG9uZW50LlxuICAgIGxldCBzdHlsZXM6IHN0cmluZ1tdfG51bGwgPSBudWxsO1xuXG4gICAgY29uc3Qgc3R5bGVVcmxzID0gdGhpcy5fZXh0cmFjdFN0eWxlVXJscyhjb21wb25lbnQsIHRlbXBsYXRlLnN0eWxlVXJscyk7XG4gICAgaWYgKHN0eWxlVXJscyAhPT0gbnVsbCkge1xuICAgICAgaWYgKHN0eWxlcyA9PT0gbnVsbCkge1xuICAgICAgICBzdHlsZXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qgc3R5bGVVcmwgb2Ygc3R5bGVVcmxzKSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5yZXNvdXJjZUxvYWRlci5yZXNvbHZlKHN0eWxlVXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgICAgIGNvbnN0IHJlc291cmNlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHJlc291cmNlVXJsKTtcbiAgICAgICAgc3R5bGVzLnB1c2gocmVzb3VyY2VTdHIpO1xuICAgICAgICB0aGlzLnJlc291cmNlRGVwZW5kZW5jaWVzLnJlY29yZFJlc291cmNlRGVwZW5kZW5jeShub2RlLmdldFNvdXJjZUZpbGUoKSwgcmVzb3VyY2VVcmwpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY29tcG9uZW50Lmhhcygnc3R5bGVzJykpIHtcbiAgICAgIGNvbnN0IGxpdFN0eWxlcyA9IHBhcnNlRmllbGRBcnJheVZhbHVlKGNvbXBvbmVudCwgJ3N0eWxlcycsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICAgIGlmIChsaXRTdHlsZXMgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKHN0eWxlcyA9PT0gbnVsbCkge1xuICAgICAgICAgIHN0eWxlcyA9IGxpdFN0eWxlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHlsZXMucHVzaCguLi5saXRTdHlsZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0ZW1wbGF0ZS5zdHlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKHN0eWxlcyA9PT0gbnVsbCkge1xuICAgICAgICBzdHlsZXMgPSB0ZW1wbGF0ZS5zdHlsZXM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHlsZXMucHVzaCguLi50ZW1wbGF0ZS5zdHlsZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGVuY2Fwc3VsYXRpb246IG51bWJlciA9XG4gICAgICAgIHRoaXMuX3Jlc29sdmVFbnVtVmFsdWUoY29tcG9uZW50LCAnZW5jYXBzdWxhdGlvbicsICdWaWV3RW5jYXBzdWxhdGlvbicpIHx8IDA7XG5cbiAgICBjb25zdCBjaGFuZ2VEZXRlY3Rpb246IG51bWJlcnxudWxsID1cbiAgICAgICAgdGhpcy5fcmVzb2x2ZUVudW1WYWx1ZShjb21wb25lbnQsICdjaGFuZ2VEZXRlY3Rpb24nLCAnQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3knKTtcblxuICAgIGxldCBhbmltYXRpb25zOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChjb21wb25lbnQuaGFzKCdhbmltYXRpb25zJykpIHtcbiAgICAgIGFuaW1hdGlvbnMgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNvbXBvbmVudC5nZXQoJ2FuaW1hdGlvbnMnKSAhKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRwdXQgPSB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgLi4ubWV0YWRhdGEsXG4gICAgICAgICAgdGVtcGxhdGUsXG4gICAgICAgICAgZW5jYXBzdWxhdGlvbixcbiAgICAgICAgICBpbnRlcnBvbGF0aW9uOiB0ZW1wbGF0ZS5pbnRlcnBvbGF0aW9uLFxuICAgICAgICAgIHN0eWxlczogc3R5bGVzIHx8IFtdLFxuXG4gICAgICAgICAgLy8gVGhlc2Ugd2lsbCBiZSByZXBsYWNlZCBkdXJpbmcgdGhlIGNvbXBpbGF0aW9uIHN0ZXAsIGFmdGVyIGFsbCBgTmdNb2R1bGVgcyBoYXZlIGJlZW5cbiAgICAgICAgICAvLyBhbmFseXplZCBhbmQgdGhlIGZ1bGwgY29tcGlsYXRpb24gc2NvcGUgZm9yIHRoZSBjb21wb25lbnQgY2FuIGJlIHJlYWxpemVkLlxuICAgICAgICAgIHBpcGVzOiBFTVBUWV9NQVAsXG4gICAgICAgICAgZGlyZWN0aXZlczogRU1QVFlfQVJSQVksXG4gICAgICAgICAgd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZTogZmFsc2UsICAvL1xuICAgICAgICAgIGFuaW1hdGlvbnMsXG4gICAgICAgICAgdmlld1Byb3ZpZGVycyxcbiAgICAgICAgICBpMThuVXNlRXh0ZXJuYWxJZHM6IHRoaXMuaTE4blVzZUV4dGVybmFsSWRzLCByZWxhdGl2ZUNvbnRleHRGaWxlUGF0aFxuICAgICAgICB9LFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgICAgcGFyc2VkVGVtcGxhdGU6IHRlbXBsYXRlLCBwYXJzZVRlbXBsYXRlLCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcsXG4gICAgICB9LFxuICAgICAgdHlwZUNoZWNrOiB0cnVlLFxuICAgIH07XG4gICAgaWYgKGNoYW5nZURldGVjdGlvbiAhPT0gbnVsbCkge1xuICAgICAgKG91dHB1dC5hbmFseXNpcy5tZXRhIGFzIFIzQ29tcG9uZW50TWV0YWRhdGEpLmNoYW5nZURldGVjdGlvbiA9IGNoYW5nZURldGVjdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuXG4gIGluZGV4KGNvbnRleHQ6IEluZGV4aW5nQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IENvbXBvbmVudEhhbmRsZXJEYXRhKSB7XG4gICAgLy8gVGhlIGNvbXBvbmVudCB0ZW1wbGF0ZSBtYXkgaGF2ZSBiZWVuIHByZXZpb3VzbHkgcGFyc2VkIHdpdGhvdXQgcHJlc2VydmluZyB3aGl0ZXNwYWNlIG9yIHdpdGhcbiAgICAvLyBgbGVhZGluZ1RyaXZpYUNoYXJgcywgYm90aCBvZiB3aGljaCBtYXkgbWFuaXB1bGF0ZSB0aGUgQVNUIGludG8gYSBmb3JtIG5vdCByZXByZXNlbnRhdGl2ZSBvZlxuICAgIC8vIHRoZSBzb3VyY2UgY29kZSwgbWFraW5nIGl0IHVuc3VpdGFibGUgZm9yIGluZGV4aW5nLiBUaGUgdGVtcGxhdGUgaXMgcmVwYXJzZWQgd2l0aCBwcmVzZXJ2aW5nXG4gICAgLy8gb3B0aW9ucyB0byByZW1lZHkgdGhpcy5cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IGFuYWx5c2lzLnBhcnNlVGVtcGxhdGUoe1xuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczogdHJ1ZSxcbiAgICAgIGxlYWRpbmdUcml2aWFDaGFyczogW10sXG4gICAgfSk7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGNvbnN0IHNlbGVjdG9yID0gYW5hbHlzaXMubWV0YS5zZWxlY3RvcjtcbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcjxEaXJlY3RpdmVNZXRhPigpO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2Ygc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcykge1xuICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKGRpcmVjdGl2ZS5zZWxlY3RvciksIGRpcmVjdGl2ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGJpbmRlciA9IG5ldyBSM1RhcmdldEJpbmRlcihtYXRjaGVyKTtcbiAgICBjb25zdCBib3VuZFRlbXBsYXRlID0gYmluZGVyLmJpbmQoe3RlbXBsYXRlOiB0ZW1wbGF0ZS5ub2Rlc30pO1xuXG4gICAgY29udGV4dC5hZGRDb21wb25lbnQoe1xuICAgICAgZGVjbGFyYXRpb246IG5vZGUsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIGJvdW5kVGVtcGxhdGUsXG4gICAgICB0ZW1wbGF0ZU1ldGE6IHtcbiAgICAgICAgaXNJbmxpbmU6IHRlbXBsYXRlLmlzSW5saW5lLFxuICAgICAgICBmaWxlOiB0ZW1wbGF0ZS5maWxlLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIHR5cGVDaGVjayhjdHg6IFR5cGVDaGVja0NvbnRleHQsIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIG1ldGE6IENvbXBvbmVudEhhbmRsZXJEYXRhKTogdm9pZCB7XG4gICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUaGVyZSBhcmUgaXNzdWVzIHdpdGggcGFyc2luZyB0aGUgdGVtcGxhdGUgdW5kZXIgY2VydGFpbiBjb25maWd1cmF0aW9ucyAobmFtZWx5IHdpdGhcbiAgICAvLyBgcHJlc2VydmVXaGl0ZXNwYWNlczogZmFsc2VgKSB3aGljaCBjYXVzZSBpbmFjY3VyYXRlIHBvc2l0aW9uYWwgaW5mb3JtYXRpb24gd2l0aGluIHRoZVxuICAgIC8vIHRlbXBsYXRlIEFTVCwgcGFydGljdWxhcmx5IHdpdGhpbiBpbnRlcnBvbGF0aW9uIGV4cHJlc3Npb25zLlxuICAgIC8vXG4gICAgLy8gVG8gd29yayBhcm91bmQgdGhpcywgdGhlIHRlbXBsYXRlIGlzIHJlLXBhcnNlZCB3aXRoIHNldHRpbmdzIHRoYXQgZ3VhcmFudGVlIHRoZSBzcGFucyBhcmUgYXNcbiAgICAvLyBhY2N1cmF0ZSBhcyBwb3NzaWJsZS4gVGhpcyBpcyBvbmx5IGEgdGVtcG9yYXJ5IHNvbHV0aW9uIHVudGlsIHRoZSB3aGl0ZXNwYWNlIHJlbW92YWwgc3RlcCBjYW5cbiAgICAvLyBiZSByZXdyaXR0ZW4gYXMgYSB0cmFuc2Zvcm0gYWdhaW5zdCB0aGUgZXhwcmVzc2lvbiBBU1QgaW5zdGVhZCBvZiBhZ2FpbnN0IHRoZSBIVE1MIEFTVC5cbiAgICAvL1xuICAgIC8vIFRPRE8oYWx4aHViKTogcmVtb3ZlIHRoaXMgd2hlbiB3aGl0ZXNwYWNlIHJlbW92YWwgbm8gbG9uZ2VyIGNvcnJ1cHRzIHNwYW4gaW5mb3JtYXRpb24uXG4gICAgY29uc3QgdGVtcGxhdGUgPSBtZXRhLnBhcnNlVGVtcGxhdGUoe1xuICAgICAgcHJlc2VydmVXaGl0ZXNwYWNlczogdHJ1ZSxcbiAgICAgIGxlYWRpbmdUcml2aWFDaGFyczogW10sXG4gICAgfSk7XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcjxEaXJlY3RpdmVNZXRhPigpO1xuICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4oKTtcbiAgICBsZXQgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSA9IFtdO1xuXG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVhZGVyLmdldFNjb3BlRm9yQ29tcG9uZW50KG5vZGUpO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCBtZXRhIG9mIHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3QgZXh0TWV0YSA9IGZsYXR0ZW5Jbmhlcml0ZWREaXJlY3RpdmVNZXRhZGF0YSh0aGlzLm1ldGFSZWFkZXIsIG1ldGEucmVmKTtcbiAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShtZXRhLnNlbGVjdG9yKSwgZXh0TWV0YSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHtuYW1lLCByZWZ9IG9mIHNjb3BlLmNvbXBpbGF0aW9uLnBpcGVzKSB7XG4gICAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHJlZi5ub2RlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFVuZXhwZWN0ZWQgbm9uLWNsYXNzIGRlY2xhcmF0aW9uICR7dHMuU3ludGF4S2luZFtyZWYubm9kZS5raW5kXX0gZm9yIHBpcGUgJHtyZWYuZGVidWdOYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIHBpcGVzLnNldChuYW1lLCByZWYgYXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+KTtcbiAgICAgIH1cbiAgICAgIHNjaGVtYXMgPSBzY29wZS5zY2hlbWFzO1xuICAgIH1cblxuICAgIGNvbnN0IGJvdW5kID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpLmJpbmQoe3RlbXBsYXRlOiB0ZW1wbGF0ZS5ub2Rlc30pO1xuICAgIGN0eC5hZGRUZW1wbGF0ZShcbiAgICAgICAgbmV3IFJlZmVyZW5jZShub2RlKSwgYm91bmQsIHBpcGVzLCBzY2hlbWFzLCBtZXRhLnRlbXBsYXRlU291cmNlTWFwcGluZywgdGVtcGxhdGUuZmlsZSk7XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRIYW5kbGVyRGF0YSk6IFJlc29sdmVSZXN1bHQge1xuICAgIGNvbnN0IGNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgY29tcG9uZW50IHdhcyByZWdpc3RlcmVkIHdpdGggYW4gTmdNb2R1bGUuIElmIHNvLCBpdCBzaG91bGQgYmUgY29tcGlsZWRcbiAgICAvLyB1bmRlciB0aGF0IG1vZHVsZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChub2RlKTtcbiAgICBsZXQgbWV0YWRhdGEgPSBhbmFseXNpcy5tZXRhO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgLy8gUmVwbGFjZSB0aGUgZW1wdHkgY29tcG9uZW50cyBhbmQgZGlyZWN0aXZlcyBmcm9tIHRoZSBhbmFseXplKCkgc3RlcCB3aXRoIGEgZnVsbHkgZXhwYW5kZWRcbiAgICAgIC8vIHNjb3BlLiBUaGlzIGlzIHBvc3NpYmxlIG5vdyBiZWNhdXNlIGR1cmluZyByZXNvbHZlKCkgdGhlIHdob2xlIGNvbXBpbGF0aW9uIHVuaXQgaGFzIGJlZW5cbiAgICAgIC8vIGZ1bGx5IGFuYWx5emVkLlxuICAgICAgLy9cbiAgICAgIC8vIEZpcnN0IGl0IG5lZWRzIHRvIGJlIGRldGVybWluZWQgaWYgYWN0dWFsbHkgaW1wb3J0aW5nIHRoZSBkaXJlY3RpdmVzL3BpcGVzIHVzZWQgaW4gdGhlXG4gICAgICAvLyB0ZW1wbGF0ZSB3b3VsZCBjcmVhdGUgYSBjeWNsZS4gQ3VycmVudGx5IG5ndHNjIHJlZnVzZXMgdG8gZ2VuZXJhdGUgY3ljbGVzLCBzbyBhbiBvcHRpb25cbiAgICAgIC8vIGtub3duIGFzIFwicmVtb3RlIHNjb3BpbmdcIiBpcyB1c2VkIGlmIGEgY3ljbGUgd291bGQgYmUgY3JlYXRlZC4gSW4gcmVtb3RlIHNjb3BpbmcsIHRoZVxuICAgICAgLy8gbW9kdWxlIGZpbGUgc2V0cyB0aGUgZGlyZWN0aXZlcy9waXBlcyBvbiB0aGUgbmdDb21wb25lbnREZWYgb2YgdGhlIGNvbXBvbmVudCwgd2l0aG91dFxuICAgICAgLy8gcmVxdWlyaW5nIG5ldyBpbXBvcnRzIChidXQgYWxzbyBpbiBhIHdheSB0aGF0IGJyZWFrcyB0cmVlIHNoYWtpbmcpLlxuICAgICAgLy9cbiAgICAgIC8vIERldGVybWluaW5nIHRoaXMgaXMgY2hhbGxlbmdpbmcsIGJlY2F1c2UgdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIgaXMgcmVzcG9uc2libGUgZm9yXG4gICAgICAvLyBtYXRjaGluZyBkaXJlY3RpdmVzIGFuZCBwaXBlcyBpbiB0aGUgdGVtcGxhdGU7IGhvd2V2ZXIsIHRoYXQgZG9lc24ndCBydW4gdW50aWwgdGhlIGFjdHVhbFxuICAgICAgLy8gY29tcGlsZSgpIHN0ZXAuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHJ1biB0ZW1wbGF0ZSBjb21waWxhdGlvbiBzb29uZXIgYXMgaXQgcmVxdWlyZXMgdGhlXG4gICAgICAvLyBDb25zdGFudFBvb2wgZm9yIHRoZSBvdmVyYWxsIGZpbGUgYmVpbmcgY29tcGlsZWQgKHdoaWNoIGlzbid0IGF2YWlsYWJsZSB1bnRpbCB0aGUgdHJhbnNmb3JtXG4gICAgICAvLyBzdGVwKS5cbiAgICAgIC8vXG4gICAgICAvLyBJbnN0ZWFkLCBkaXJlY3RpdmVzL3BpcGVzIGFyZSBtYXRjaGVkIGluZGVwZW5kZW50bHkgaGVyZSwgdXNpbmcgdGhlIFIzVGFyZ2V0QmluZGVyLiBUaGlzIGlzXG4gICAgICAvLyBhbiBhbHRlcm5hdGl2ZSBpbXBsZW1lbnRhdGlvbiBvZiB0ZW1wbGF0ZSBtYXRjaGluZyB3aGljaCBpcyB1c2VkIGZvciB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nXG4gICAgICAvLyBhbmQgd2lsbCBldmVudHVhbGx5IHJlcGxhY2UgbWF0Y2hpbmcgaW4gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuXG5cblxuICAgICAgLy8gU2V0IHVwIHRoZSBSM1RhcmdldEJpbmRlciwgYXMgd2VsbCBhcyBhICdkaXJlY3RpdmVzJyBhcnJheSBhbmQgYSAncGlwZXMnIG1hcCB0aGF0IGFyZSBsYXRlclxuICAgICAgLy8gZmVkIHRvIHRoZSBUZW1wbGF0ZURlZmluaXRpb25CdWlsZGVyLiBGaXJzdCwgYSBTZWxlY3Rvck1hdGNoZXIgaXMgY29uc3RydWN0ZWQgdG8gbWF0Y2hcbiAgICAgIC8vIGRpcmVjdGl2ZXMgdGhhdCBhcmUgaW4gc2NvcGUuXG4gICAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcjxEaXJlY3RpdmVNZXRhJntleHByZXNzaW9uOiBFeHByZXNzaW9ufT4oKTtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZXM6IHtzZWxlY3Rvcjogc3RyaW5nLCBleHByZXNzaW9uOiBFeHByZXNzaW9ufVtdID0gW107XG5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3Qge3JlZiwgc2VsZWN0b3J9ID0gZGlyO1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocmVmLCBjb250ZXh0KTtcbiAgICAgICAgZGlyZWN0aXZlcy5wdXNoKHtzZWxlY3RvciwgZXhwcmVzc2lvbn0pO1xuICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKHNlbGVjdG9yKSwgey4uLmRpciwgZXhwcmVzc2lvbn0pO1xuICAgICAgfVxuICAgICAgY29uc3QgcGlwZXMgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5jb21waWxhdGlvbi5waXBlcykge1xuICAgICAgICBwaXBlcy5zZXQocGlwZS5uYW1lLCB0aGlzLnJlZkVtaXR0ZXIuZW1pdChwaXBlLnJlZiwgY29udGV4dCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBOZXh0LCB0aGUgY29tcG9uZW50IHRlbXBsYXRlIEFTVCBpcyBib3VuZCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXMgcHJvZHVjZXMgYW5cbiAgICAgIC8vIEJvdW5kVGFyZ2V0LCB3aGljaCBpcyBzaW1pbGFyIHRvIGEgdHMuVHlwZUNoZWNrZXIuXG4gICAgICBjb25zdCBiaW5kZXIgPSBuZXcgUjNUYXJnZXRCaW5kZXIobWF0Y2hlcik7XG4gICAgICBjb25zdCBib3VuZCA9IGJpbmRlci5iaW5kKHt0ZW1wbGF0ZTogbWV0YWRhdGEudGVtcGxhdGUubm9kZXN9KTtcblxuICAgICAgLy8gVGhlIEJvdW5kVGFyZ2V0IGtub3dzIHdoaWNoIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIG1hdGNoZWQgdGhlIHRlbXBsYXRlLlxuICAgICAgY29uc3QgdXNlZERpcmVjdGl2ZXMgPSBib3VuZC5nZXRVc2VkRGlyZWN0aXZlcygpO1xuICAgICAgY29uc3QgdXNlZFBpcGVzID0gYm91bmQuZ2V0VXNlZFBpcGVzKCkubWFwKG5hbWUgPT4gcGlwZXMuZ2V0KG5hbWUpICEpO1xuXG4gICAgICAvLyBTY2FuIHRocm91Z2ggdGhlIGRpcmVjdGl2ZXMvcGlwZXMgYWN0dWFsbHkgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYW5kIGNoZWNrIHdoZXRoZXIgYW55XG4gICAgICAvLyBpbXBvcnQgd2hpY2ggbmVlZHMgdG8gYmUgZ2VuZXJhdGVkIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLlxuICAgICAgY29uc3QgY3ljbGVEZXRlY3RlZCA9XG4gICAgICAgICAgdXNlZERpcmVjdGl2ZXMuc29tZShkaXIgPT4gdGhpcy5faXNDeWNsaWNJbXBvcnQoZGlyLmV4cHJlc3Npb24sIGNvbnRleHQpKSB8fFxuICAgICAgICAgIHVzZWRQaXBlcy5zb21lKHBpcGUgPT4gdGhpcy5faXNDeWNsaWNJbXBvcnQocGlwZSwgY29udGV4dCkpO1xuXG4gICAgICBpZiAoIWN5Y2xlRGV0ZWN0ZWQpIHtcbiAgICAgICAgLy8gTm8gY3ljbGUgd2FzIGRldGVjdGVkLiBSZWNvcmQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGNyZWF0ZWQgaW4gdGhlIGN5Y2xlIGRldGVjdG9yXG4gICAgICAgIC8vIHNvIHRoYXQgZnV0dXJlIGN5Y2xpYyBpbXBvcnQgY2hlY2tzIGNvbnNpZGVyIHRoZWlyIHByb2R1Y3Rpb24uXG4gICAgICAgIGZvciAoY29uc3Qge2V4cHJlc3Npb259IG9mIHVzZWREaXJlY3RpdmVzKSB7XG4gICAgICAgICAgdGhpcy5fcmVjb3JkU3ludGhldGljSW1wb3J0KGV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgcGlwZSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgICB0aGlzLl9yZWNvcmRTeW50aGV0aWNJbXBvcnQocGlwZSwgY29udGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSBkaXJlY3RpdmUvcGlwZSBhcnJheXMgaW4gbmdDb21wb25lbnREZWYgbmVlZCB0byBiZSB3cmFwcGVkIGluIGNsb3N1cmVzLlxuICAgICAgICAvLyBUaGlzIGlzIHJlcXVpcmVkIGlmIGFueSBkaXJlY3RpdmUvcGlwZSByZWZlcmVuY2UgaXMgdG8gYSBkZWNsYXJhdGlvbiBpbiB0aGUgc2FtZSBmaWxlIGJ1dFxuICAgICAgICAvLyBkZWNsYXJlZCBhZnRlciB0aGlzIGNvbXBvbmVudC5cbiAgICAgICAgY29uc3Qgd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZSA9XG4gICAgICAgICAgICB1c2VkRGlyZWN0aXZlcy5zb21lKFxuICAgICAgICAgICAgICAgIGRpciA9PiBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKGRpci5leHByZXNzaW9uLCBub2RlLm5hbWUsIGNvbnRleHQpKSB8fFxuICAgICAgICAgICAgdXNlZFBpcGVzLnNvbWUocGlwZSA9PiBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKHBpcGUsIG5vZGUubmFtZSwgY29udGV4dCkpO1xuXG4gICAgICAgIC8vIEFjdHVhbCBjb21waWxhdGlvbiBzdGlsbCB1c2VzIHRoZSBmdWxsIHNjb3BlLCBub3QgdGhlIG5hcnJvd2VkIHNjb3BlIGRldGVybWluZWQgYnlcbiAgICAgICAgLy8gUjNUYXJnZXRCaW5kZXIuIFRoaXMgaXMgYSBoZWRnZSBhZ2FpbnN0IHBvdGVudGlhbCBpc3N1ZXMgd2l0aCB0aGUgUjNUYXJnZXRCaW5kZXIgLSByaWdodFxuICAgICAgICAvLyBub3cgdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIgaXMgdGhlIFwic291cmNlIG9mIHRydXRoXCIgZm9yIHdoaWNoIGRpcmVjdGl2ZXMvcGlwZXMgYXJlXG4gICAgICAgIC8vIGFjdHVhbGx5IHVzZWQgKHRob3VnaCB0aGUgdHdvIHNob3VsZCBhZ3JlZSBwZXJmZWN0bHkpLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUT0RPKGFseGh1Yik6IHN3aXRjaCBUZW1wbGF0ZURlZmluaXRpb25CdWlsZGVyIG92ZXIgdG8gdXNpbmcgUjNUYXJnZXRCaW5kZXIgZGlyZWN0bHkuXG4gICAgICAgIG1ldGFkYXRhLmRpcmVjdGl2ZXMgPSBkaXJlY3RpdmVzO1xuICAgICAgICBtZXRhZGF0YS5waXBlcyA9IHBpcGVzO1xuICAgICAgICBtZXRhZGF0YS53cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID0gd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIERlY2xhcmluZyB0aGUgZGlyZWN0aXZlRGVmcy9waXBlRGVmcyBhcnJheXMgZGlyZWN0bHkgd291bGQgcmVxdWlyZSBpbXBvcnRzIHRoYXQgd291bGRcbiAgICAgICAgLy8gY3JlYXRlIGEgY3ljbGUuIEluc3RlYWQsIG1hcmsgdGhpcyBjb21wb25lbnQgYXMgcmVxdWlyaW5nIHJlbW90ZSBzY29waW5nLCBzbyB0aGF0IHRoZVxuICAgICAgICAvLyBOZ01vZHVsZSBmaWxlIHdpbGwgdGFrZSBjYXJlIG9mIHNldHRpbmcgdGhlIGRpcmVjdGl2ZXMgZm9yIHRoZSBjb21wb25lbnQuXG4gICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5zZXRDb21wb25lbnRBc1JlcXVpcmluZ1JlbW90ZVNjb3Bpbmcobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IENvbXBvbmVudEhhbmRsZXJEYXRhLCBwb29sOiBDb25zdGFudFBvb2wpOlxuICAgICAgQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBtZXRhID0gYW5hbHlzaXMubWV0YTtcbiAgICBjb25zdCByZXMgPSBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhKG1ldGEsIHBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyKCkpO1xuICAgIGNvbnN0IGZhY3RvcnlSZXMgPSBjb21waWxlTmdGYWN0b3J5RGVmRmllbGQobWV0YSk7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIFtcbiAgICAgIGZhY3RvcnlSZXMsIHtcbiAgICAgICAgbmFtZTogJ25nQ29tcG9uZW50RGVmJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgICB9XG4gICAgXTtcbiAgfVxuXG4gIHByaXZhdGUgX3Jlc29sdmVMaXRlcmFsKGRlY29yYXRvcjogRGVjb3JhdG9yKTogdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ge1xuICAgIGlmICh0aGlzLmxpdGVyYWxDYWNoZS5oYXMoZGVjb3JhdG9yKSkge1xuICAgICAgcmV0dXJuIHRoaXMubGl0ZXJhbENhY2hlLmdldChkZWNvcmF0b3IpICE7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgICBgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQENvbXBvbmVudCBkZWNvcmF0b3JgKTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsIGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCBiZSBsaXRlcmFsLmApO1xuICAgIH1cblxuICAgIHRoaXMubGl0ZXJhbENhY2hlLnNldChkZWNvcmF0b3IsIG1ldGEpO1xuICAgIHJldHVybiBtZXRhO1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVzb2x2ZUVudW1WYWx1ZShcbiAgICAgIGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGZpZWxkOiBzdHJpbmcsIGVudW1TeW1ib2xOYW1lOiBzdHJpbmcpOiBudW1iZXJ8bnVsbCB7XG4gICAgbGV0IHJlc29sdmVkOiBudW1iZXJ8bnVsbCA9IG51bGw7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoZmllbGQpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldChmaWVsZCkgITtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcikgYXMgYW55O1xuICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRW51bVZhbHVlICYmIGlzQW5ndWxhckNvcmVSZWZlcmVuY2UodmFsdWUuZW51bVJlZiwgZW51bVN5bWJvbE5hbWUpKSB7XG4gICAgICAgIHJlc29sdmVkID0gdmFsdWUucmVzb2x2ZWQgYXMgbnVtYmVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLFxuICAgICAgICAgICAgYCR7ZmllbGR9IG11c3QgYmUgYSBtZW1iZXIgb2YgJHtlbnVtU3ltYm9sTmFtZX0gZW51bSBmcm9tIEBhbmd1bGFyL2NvcmVgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc29sdmVkO1xuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdFN0eWxlVXJscyhjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBleHRyYVVybHM6IHN0cmluZ1tdKTpcbiAgICAgIHN0cmluZ1tdfG51bGwge1xuICAgIGlmICghY29tcG9uZW50Lmhhcygnc3R5bGVVcmxzJykpIHtcbiAgICAgIHJldHVybiBleHRyYVVybHMubGVuZ3RoID4gMCA/IGV4dHJhVXJscyA6IG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc3R5bGVVcmxzRXhwciA9IGNvbXBvbmVudC5nZXQoJ3N0eWxlVXJscycpICE7XG4gICAgY29uc3Qgc3R5bGVVcmxzID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoc3R5bGVVcmxzRXhwcik7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHN0eWxlVXJscykgfHwgIXN0eWxlVXJscy5ldmVyeSh1cmwgPT4gdHlwZW9mIHVybCA9PT0gJ3N0cmluZycpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBzdHlsZVVybHNFeHByLCAnc3R5bGVVcmxzIG11c3QgYmUgYW4gYXJyYXkgb2Ygc3RyaW5ncycpO1xuICAgIH1cbiAgICBzdHlsZVVybHMucHVzaCguLi5leHRyYVVybHMpO1xuICAgIHJldHVybiBzdHlsZVVybHMgYXMgc3RyaW5nW107XG4gIH1cblxuICBwcml2YXRlIF9wcmVsb2FkQW5kUGFyc2VUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICAgICAgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IFByb21pc2U8UGFyc2VkVGVtcGxhdGV8bnVsbD4ge1xuICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICAvLyBFeHRyYWN0IHRoZSB0ZW1wbGF0ZVVybCBhbmQgcHJlbG9hZCBpdC5cbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykgITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgdGVtcGxhdGVVcmxFeHByLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlUHJvbWlzZSA9IHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCk7XG5cbiAgICAgIC8vIElmIHRoZSBwcmVsb2FkIHdvcmtlZCwgdGhlbiBhY3R1YWxseSBsb2FkIGFuZCBwYXJzZSB0aGUgdGVtcGxhdGUsIGFuZCB3YWl0IGZvciBhbnkgc3R5bGVcbiAgICAgIC8vIFVSTHMgdG8gcmVzb2x2ZS5cbiAgICAgIGlmICh0ZW1wbGF0ZVByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGVQcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHtwYXJzZVRlbXBsYXRlLCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmd9ID1cbiAgICAgICAgICAgICAgdGhpcy5fZXh0cmFjdEV4dGVybmFsVGVtcGxhdGUobm9kZSwgY29tcG9uZW50LCB0ZW1wbGF0ZVVybEV4cHIsIHJlc291cmNlVXJsKTtcbiAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUoKTtcbiAgICAgICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChcbiAgICAgICAgICAgICAgbm9kZSwgey4uLnRlbXBsYXRlLCBwYXJzZVRlbXBsYXRlLCB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmd9KTtcbiAgICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qge3BhcnNlVGVtcGxhdGUsIHRlbXBsYXRlU291cmNlTWFwcGluZ30gPVxuICAgICAgICAgIHRoaXMuX2V4dHJhY3RJbmxpbmVUZW1wbGF0ZShub2RlLCBkZWNvcmF0b3IsIGNvbXBvbmVudCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBwYXJzZVRlbXBsYXRlKCk7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB7Li4udGVtcGxhdGUsIHBhcnNlVGVtcGxhdGUsIHRlbXBsYXRlU291cmNlTWFwcGluZ30pO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0ZW1wbGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZXh0cmFjdEV4dGVybmFsVGVtcGxhdGUoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCB0ZW1wbGF0ZVVybEV4cHI6IHRzLkV4cHJlc3Npb24sXG4gICAgICByZXNvdXJjZVVybDogc3RyaW5nKToge1xuICAgIHBhcnNlVGVtcGxhdGU6IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IFBhcnNlZFRlbXBsYXRlO1xuICAgIHRlbXBsYXRlU291cmNlTWFwcGluZzogVGVtcGxhdGVTb3VyY2VNYXBwaW5nXG4gIH0ge1xuICAgIGNvbnN0IHRlbXBsYXRlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHJlc291cmNlVXJsKTtcbiAgICB0aGlzLnJlc291cmNlRGVwZW5kZW5jaWVzLnJlY29yZFJlc291cmNlRGVwZW5kZW5jeShub2RlLmdldFNvdXJjZUZpbGUoKSwgcmVzb3VyY2VVcmwpO1xuICAgIGNvbnN0IHBhcnNlVGVtcGxhdGUgPSAob3B0aW9ucz86IFBhcnNlVGVtcGxhdGVPcHRpb25zKSA9PiB0aGlzLl9wYXJzZVRlbXBsYXRlKFxuICAgICAgICBjb21wb25lbnQsIHRlbXBsYXRlU3RyLCBzb3VyY2VNYXBVcmwocmVzb3VyY2VVcmwpLFxuICAgICAgICAvKiB0ZW1wbGF0ZVJhbmdlICovIHVuZGVmaW5lZCxcbiAgICAgICAgLyogZXNjYXBlZFN0cmluZyAqLyBmYWxzZSwgb3B0aW9ucyk7XG4gICAgY29uc3QgdGVtcGxhdGVTb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICB0eXBlOiAnZXh0ZXJuYWwnLFxuICAgICAgY29tcG9uZW50Q2xhc3M6IG5vZGUsXG4gICAgICBub2RlOiB0ZW1wbGF0ZVVybEV4cHIsXG4gICAgICB0ZW1wbGF0ZTogdGVtcGxhdGVTdHIsXG4gICAgICB0ZW1wbGF0ZVVybDogcmVzb3VyY2VVcmwsXG4gICAgfTtcblxuICAgIHJldHVybiB7cGFyc2VUZW1wbGF0ZSwgdGVtcGxhdGVTb3VyY2VNYXBwaW5nfTtcbiAgfVxuXG4gIHByaXZhdGUgX2V4dHJhY3RJbmxpbmVUZW1wbGF0ZShcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICAgICAgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHtcbiAgICBwYXJzZVRlbXBsYXRlOiAob3B0aW9ucz86IFBhcnNlVGVtcGxhdGVPcHRpb25zKSA9PiBQYXJzZWRUZW1wbGF0ZTtcbiAgICB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmc6IFRlbXBsYXRlU291cmNlTWFwcGluZ1xuICB9IHtcbiAgICBpZiAoIWNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlJykpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuQ09NUE9ORU5UX01JU1NJTkdfVEVNUExBVEUsIGRlY29yYXRvci5ub2RlLCAnY29tcG9uZW50IGlzIG1pc3NpbmcgYSB0ZW1wbGF0ZScpO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZUV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpICE7XG5cbiAgICBsZXQgdGVtcGxhdGVTdHI6IHN0cmluZztcbiAgICBsZXQgdGVtcGxhdGVVcmw6IHN0cmluZyA9ICcnO1xuICAgIGxldCB0ZW1wbGF0ZVJhbmdlOiBMZXhlclJhbmdlfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgdGVtcGxhdGVTb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG4gICAgbGV0IGVzY2FwZWRTdHJpbmcgPSBmYWxzZTtcbiAgICAvLyBXZSBvbmx5IHN1cHBvcnQgU291cmNlTWFwcyBmb3IgaW5saW5lIHRlbXBsYXRlcyB0aGF0IGFyZSBzaW1wbGUgc3RyaW5nIGxpdGVyYWxzLlxuICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwodGVtcGxhdGVFeHByKSB8fCB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKHRlbXBsYXRlRXhwcikpIHtcbiAgICAgIC8vIHRoZSBzdGFydCBhbmQgZW5kIG9mIHRoZSBgdGVtcGxhdGVFeHByYCBub2RlIGluY2x1ZGVzIHRoZSBxdW90YXRpb24gbWFya3MsIHdoaWNoIHdlXG4gICAgICAvLyBtdXN0XG4gICAgICAvLyBzdHJpcFxuICAgICAgdGVtcGxhdGVSYW5nZSA9IGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGVFeHByKTtcbiAgICAgIHRlbXBsYXRlU3RyID0gdGVtcGxhdGVFeHByLmdldFNvdXJjZUZpbGUoKS50ZXh0O1xuICAgICAgdGVtcGxhdGVVcmwgPSBjb250YWluaW5nRmlsZTtcbiAgICAgIGVzY2FwZWRTdHJpbmcgPSB0cnVlO1xuICAgICAgdGVtcGxhdGVTb3VyY2VNYXBwaW5nID0ge1xuICAgICAgICB0eXBlOiAnZGlyZWN0JyxcbiAgICAgICAgbm9kZTogdGVtcGxhdGVFeHByIGFzKHRzLlN0cmluZ0xpdGVyYWwgfCB0cy5Ob1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbCksXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCByZXNvbHZlZFRlbXBsYXRlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRUZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZUV4cHIsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgICB0ZW1wbGF0ZVNvdXJjZU1hcHBpbmcgPSB7XG4gICAgICAgIHR5cGU6ICdpbmRpcmVjdCcsXG4gICAgICAgIG5vZGU6IHRlbXBsYXRlRXhwcixcbiAgICAgICAgY29tcG9uZW50Q2xhc3M6IG5vZGUsXG4gICAgICAgIHRlbXBsYXRlOiB0ZW1wbGF0ZVN0cixcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgcGFyc2VUZW1wbGF0ZSA9IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IHRoaXMuX3BhcnNlVGVtcGxhdGUoXG4gICAgICAgIGNvbXBvbmVudCwgdGVtcGxhdGVTdHIsIHRlbXBsYXRlVXJsLCB0ZW1wbGF0ZVJhbmdlLCBlc2NhcGVkU3RyaW5nLCBvcHRpb25zKTtcblxuICAgIHJldHVybiB7cGFyc2VUZW1wbGF0ZSwgdGVtcGxhdGVTb3VyY2VNYXBwaW5nfTtcbiAgfVxuXG4gIHByaXZhdGUgX3BhcnNlVGVtcGxhdGUoXG4gICAgICBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCB0ZW1wbGF0ZVN0cjogc3RyaW5nLCB0ZW1wbGF0ZVVybDogc3RyaW5nLFxuICAgICAgdGVtcGxhdGVSYW5nZTogTGV4ZXJSYW5nZXx1bmRlZmluZWQsIGVzY2FwZWRTdHJpbmc6IGJvb2xlYW4sXG4gICAgICBvcHRpb25zOiBQYXJzZVRlbXBsYXRlT3B0aW9ucyA9IHt9KTogUGFyc2VkVGVtcGxhdGUge1xuICAgIGxldCBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuID0gdGhpcy5kZWZhdWx0UHJlc2VydmVXaGl0ZXNwYWNlcztcbiAgICBpZiAoY29tcG9uZW50LmhhcygncHJlc2VydmVXaGl0ZXNwYWNlcycpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgncHJlc2VydmVXaGl0ZXNwYWNlcycpICE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwciwgJ3ByZXNlcnZlV2hpdGVzcGFjZXMgbXVzdCBiZSBhIGJvb2xlYW4nKTtcbiAgICAgIH1cbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBsZXQgaW50ZXJwb2xhdGlvbjogSW50ZXJwb2xhdGlvbkNvbmZpZyA9IERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUc7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ2ludGVycG9sYXRpb24nKSkge1xuICAgICAgY29uc3QgZXhwciA9IGNvbXBvbmVudC5nZXQoJ2ludGVycG9sYXRpb24nKSAhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUubGVuZ3RoICE9PSAyIHx8XG4gICAgICAgICAgIXZhbHVlLmV2ZXJ5KGVsZW1lbnQgPT4gdHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSkge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsXG4gICAgICAgICAgICAnaW50ZXJwb2xhdGlvbiBtdXN0IGJlIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cyBvZiBzdHJpbmcgdHlwZScpO1xuICAgICAgfVxuICAgICAgaW50ZXJwb2xhdGlvbiA9IEludGVycG9sYXRpb25Db25maWcuZnJvbUFycmF5KHZhbHVlIGFzW3N0cmluZywgc3RyaW5nXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGludGVycG9sYXRpb24sXG4gICAgICAuLi5wYXJzZVRlbXBsYXRlKHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZVVybCwge1xuICAgICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnOiBpbnRlcnBvbGF0aW9uLFxuICAgICAgICByYW5nZTogdGVtcGxhdGVSYW5nZSwgZXNjYXBlZFN0cmluZywgLi4ub3B0aW9ucyxcbiAgICAgIH0pLFxuICAgICAgdGVtcGxhdGU6IHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZVVybCxcbiAgICAgIGlzSW5saW5lOiBjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZScpLFxuICAgICAgZmlsZTogbmV3IFBhcnNlU291cmNlRmlsZSh0ZW1wbGF0ZVN0ciwgdGVtcGxhdGVVcmwpLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIF9leHByZXNzaW9uVG9JbXBvcnRlZEZpbGUoZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZXxudWxsIHtcbiAgICBpZiAoIShleHByIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRmlndXJlIG91dCB3aGF0IGZpbGUgaXMgYmVpbmcgaW1wb3J0ZWQuXG4gICAgcmV0dXJuIHRoaXMubW9kdWxlUmVzb2x2ZXIucmVzb2x2ZU1vZHVsZU5hbWUoZXhwci52YWx1ZS5tb2R1bGVOYW1lICEsIG9yaWdpbik7XG4gIH1cblxuICBwcml2YXRlIF9pc0N5Y2xpY0ltcG9ydChleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgICBjb25zdCBpbXBvcnRlZCA9IHRoaXMuX2V4cHJlc3Npb25Ub0ltcG9ydGVkRmlsZShleHByLCBvcmlnaW4pO1xuICAgIGlmIChpbXBvcnRlZCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIENoZWNrIHdoZXRoZXIgdGhlIGltcG9ydCBpcyBsZWdhbC5cbiAgICByZXR1cm4gdGhpcy5jeWNsZUFuYWx5emVyLndvdWxkQ3JlYXRlQ3ljbGUob3JpZ2luLCBpbXBvcnRlZCk7XG4gIH1cblxuICBwcml2YXRlIF9yZWNvcmRTeW50aGV0aWNJbXBvcnQoZXhwcjogRXhwcmVzc2lvbiwgb3JpZ2luOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgY29uc3QgaW1wb3J0ZWQgPSB0aGlzLl9leHByZXNzaW9uVG9JbXBvcnRlZEZpbGUoZXhwciwgb3JpZ2luKTtcbiAgICBpZiAoaW1wb3J0ZWQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmN5Y2xlQW5hbHl6ZXIucmVjb3JkU3ludGhldGljSW1wb3J0KG9yaWdpbiwgaW1wb3J0ZWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGVFeHByOiB0cy5FeHByZXNzaW9uKSB7XG4gIGNvbnN0IHN0YXJ0UG9zID0gdGVtcGxhdGVFeHByLmdldFN0YXJ0KCkgKyAxO1xuICBjb25zdCB7bGluZSwgY2hhcmFjdGVyfSA9XG4gICAgICB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbih0ZW1wbGF0ZUV4cHIuZ2V0U291cmNlRmlsZSgpLCBzdGFydFBvcyk7XG4gIHJldHVybiB7XG4gICAgc3RhcnRQb3MsXG4gICAgc3RhcnRMaW5lOiBsaW5lLFxuICAgIHN0YXJ0Q29sOiBjaGFyYWN0ZXIsXG4gICAgZW5kUG9zOiB0ZW1wbGF0ZUV4cHIuZ2V0RW5kKCkgLSAxLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzb3VyY2VNYXBVcmwocmVzb3VyY2VVcmw6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghdHNTb3VyY2VNYXBCdWcyOTMwMEZpeGVkKCkpIHtcbiAgICAvLyBCeSByZW1vdmluZyB0aGUgdGVtcGxhdGUgVVJMIHdlIGFyZSB0ZWxsaW5nIHRoZSB0cmFuc2xhdG9yIG5vdCB0byB0cnkgdG9cbiAgICAvLyBtYXAgdGhlIGV4dGVybmFsIHNvdXJjZSBmaWxlIHRvIHRoZSBnZW5lcmF0ZWQgY29kZSwgc2luY2UgdGhlIHZlcnNpb25cbiAgICAvLyBvZiBUUyB0aGF0IGlzIHJ1bm5pbmcgZG9lcyBub3Qgc3VwcG9ydCBpdC5cbiAgICByZXR1cm4gJyc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlc291cmNlVXJsO1xuICB9XG59XG5cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdGVtcGxhdGUgd2hpY2ggd2FzIGV4dHJhY3RlZCBkdXJpbmcgcGFyc2luZy5cbiAqXG4gKiBUaGlzIGNvbnRhaW5zIHRoZSBhY3R1YWwgcGFyc2VkIHRlbXBsYXRlIGFzIHdlbGwgYXMgYW55IG1ldGFkYXRhIGNvbGxlY3RlZCBkdXJpbmcgaXRzIHBhcnNpbmcsXG4gKiBzb21lIG9mIHdoaWNoIG1pZ2h0IGJlIHVzZWZ1bCBmb3IgcmUtcGFyc2luZyB0aGUgdGVtcGxhdGUgd2l0aCBkaWZmZXJlbnQgb3B0aW9ucy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRUZW1wbGF0ZSB7XG4gIC8qKlxuICAgKiBUaGUgYEludGVycG9sYXRpb25Db25maWdgIHNwZWNpZmllZCBieSB0aGUgdXNlci5cbiAgICovXG4gIGludGVycG9sYXRpb246IEludGVycG9sYXRpb25Db25maWc7XG5cbiAgLyoqXG4gICAqIEEgZnVsbCBwYXRoIHRvIHRoZSBmaWxlIHdoaWNoIGNvbnRhaW5zIHRoZSB0ZW1wbGF0ZS5cbiAgICpcbiAgICogVGhpcyBjYW4gYmUgZWl0aGVyIHRoZSBvcmlnaW5hbCAudHMgZmlsZSBpZiB0aGUgdGVtcGxhdGUgaXMgaW5saW5lLCBvciB0aGUgLmh0bWwgZmlsZSBpZiBhblxuICAgKiBleHRlcm5hbCBmaWxlIHdhcyB1c2VkLlxuICAgKi9cbiAgdGVtcGxhdGVVcmw6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHN0cmluZyBjb250ZW50cyBvZiB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIFwibG9naWNhbFwiIHRlbXBsYXRlIHN0cmluZywgYWZ0ZXIgZXhwYW5zaW9uIG9mIGFueSBlc2NhcGVkIGNoYXJhY3RlcnMgKGZvciBpbmxpbmVcbiAgICogdGVtcGxhdGVzKS4gVGhpcyBtYXkgZGlmZmVyIGZyb20gdGhlIGFjdHVhbCB0ZW1wbGF0ZSBieXRlcyBhcyB0aGV5IGFwcGVhciBpbiB0aGUgLnRzIGZpbGUuXG4gICAqL1xuICB0ZW1wbGF0ZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBBbnkgZXJyb3JzIGZyb20gcGFyc2luZyB0aGUgdGVtcGxhdGUgdGhlIGZpcnN0IHRpbWUuXG4gICAqL1xuICBlcnJvcnM/OiBQYXJzZUVycm9yW118dW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBUaGUgYWN0dWFsIHBhcnNlZCB0ZW1wbGF0ZSBub2Rlcy5cbiAgICovXG4gIG5vZGVzOiBUbXBsQXN0Tm9kZVtdO1xuXG4gIC8qKlxuICAgKiBBbnkgc3R5bGVVcmxzIGV4dHJhY3RlZCBmcm9tIHRoZSBtZXRhZGF0YS5cbiAgICovXG4gIHN0eWxlVXJsczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIEFueSBpbmxpbmUgc3R5bGVzIGV4dHJhY3RlZCBmcm9tIHRoZSBtZXRhZGF0YS5cbiAgICovXG4gIHN0eWxlczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIHRlbXBsYXRlIHdhcyBpbmxpbmUuXG4gICAqL1xuICBpc0lubGluZTogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIGBQYXJzZVNvdXJjZUZpbGVgIGZvciB0aGUgdGVtcGxhdGUuXG4gICAqL1xuICBmaWxlOiBQYXJzZVNvdXJjZUZpbGU7XG59XG5cbmludGVyZmFjZSBQcmVhbmFseXplZFRlbXBsYXRlIGV4dGVuZHMgUGFyc2VkVGVtcGxhdGUge1xuICBwYXJzZVRlbXBsYXRlOiAob3B0aW9ucz86IFBhcnNlVGVtcGxhdGVPcHRpb25zKSA9PiBQYXJzZWRUZW1wbGF0ZTtcbiAgdGVtcGxhdGVTb3VyY2VNYXBwaW5nOiBUZW1wbGF0ZVNvdXJjZU1hcHBpbmc7XG59XG4iXX0=