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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/component", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/inheritance", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/resource_recorder", "@angular/compiler-cli/src/ngtsc/util/src/ts_source_map_bug_29300", "@angular/compiler-cli/src/ngtsc/annotations/src/directive", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
            var _this = this;
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
            if (this.preanalyzeTemplateCache.has(node)) {
                // The template was parsed in preanalyze. Use it and delete it to save memory.
                var template_1 = this.preanalyzeTemplateCache.get(node);
                this.preanalyzeTemplateCache.delete(node);
                // A pre-analyzed template cannot be reparsed. Pre-analysis is never run with the indexing
                // pipeline.
                parseTemplate = function (options) {
                    if (options !== undefined) {
                        throw new Error("Cannot reparse a pre-analyzed template with new options");
                    }
                    return template_1;
                };
            }
            else {
                // The template was not already parsed. Either there's a templateUrl, or an inline template.
                if (component.has('templateUrl')) {
                    var templateUrlExpr = component.get('templateUrl');
                    var evalTemplateUrl = this.evaluator.evaluate(templateUrlExpr);
                    if (typeof evalTemplateUrl !== 'string') {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateUrlExpr, 'templateUrl must be a string');
                    }
                    var templateUrl_1 = this.resourceLoader.resolve(evalTemplateUrl, containingFile);
                    var templateStr_1 = this.resourceLoader.load(templateUrl_1);
                    this.resourceDependencies.recordResourceDependency(node.getSourceFile(), templateUrl_1);
                    parseTemplate = function (options) { return _this._parseTemplate(component, templateStr_1, sourceMapUrl(templateUrl_1), /* templateRange */ undefined, 
                    /* escapedString */ false, options); };
                }
                else {
                    // Expect an inline template to be present.
                    var inlineTemplate = this._extractInlineTemplate(component, containingFile);
                    if (inlineTemplate === null) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_MISSING_TEMPLATE, decorator.node, 'component is missing a template');
                    }
                    var templateStr_2 = inlineTemplate.templateStr, templateUrl_2 = inlineTemplate.templateUrl, templateRange_1 = inlineTemplate.templateRange, escapedString_1 = inlineTemplate.escapedString;
                    parseTemplate = function (options) { return _this._parseTemplate(component, templateStr_2, templateUrl_2, templateRange_1, escapedString_1, options); };
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
                    parsedTemplate: template, parseTemplate: parseTemplate,
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
            var scope = this.scopeReader.getScopeForComponent(node);
            var matcher = new compiler_1.SelectorMatcher();
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
                var bound = new compiler_1.R3TargetBinder(matcher).bind({ template: meta.parsedTemplate.nodes });
                var pipes = new Map();
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
                ctx.addTemplate(new imports_1.Reference(node), bound, pipes, meta.parsedTemplate.file);
            }
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
            var res = compiler_1.compileComponentFromMetadata(analysis.meta, pool, compiler_1.makeBindingParser());
            var statements = res.statements;
            if (analysis.metadataStmt !== null) {
                statements.push(analysis.metadataStmt);
            }
            return {
                name: 'ngComponentDef',
                initializer: res.expression, statements: statements,
                type: res.type,
            };
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
                var templateUrlExpr = component.get('templateUrl');
                var templateUrl = this.evaluator.evaluate(templateUrlExpr);
                if (typeof templateUrl !== 'string') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateUrlExpr, 'templateUrl must be a string');
                }
                var resourceUrl_1 = this.resourceLoader.resolve(templateUrl, containingFile);
                var templatePromise = this.resourceLoader.preload(resourceUrl_1);
                // If the preload worked, then actually load and parse the template, and wait for any style
                // URLs to resolve.
                if (templatePromise !== undefined) {
                    return templatePromise.then(function () {
                        var templateStr = _this.resourceLoader.load(resourceUrl_1);
                        _this.resourceDependencies.recordResourceDependency(node.getSourceFile(), resourceUrl_1);
                        var template = _this._parseTemplate(component, templateStr, sourceMapUrl(resourceUrl_1), /* templateRange */ undefined, 
                        /* escapedString */ false);
                        _this.preanalyzeTemplateCache.set(node, template);
                        return template;
                    });
                }
                else {
                    return Promise.resolve(null);
                }
            }
            else {
                var inlineTemplate = this._extractInlineTemplate(component, containingFile);
                if (inlineTemplate === null) {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.COMPONENT_MISSING_TEMPLATE, decorator.node, 'component is missing a template');
                }
                var templateStr = inlineTemplate.templateStr, templateUrl = inlineTemplate.templateUrl, escapedString = inlineTemplate.escapedString, templateRange = inlineTemplate.templateRange;
                var template = this._parseTemplate(component, templateStr, templateUrl, templateRange, escapedString);
                this.preanalyzeTemplateCache.set(node, template);
                return Promise.resolve(template);
            }
        };
        ComponentDecoratorHandler.prototype._extractInlineTemplate = function (component, containingFile) {
            // If there is no inline template, then return null.
            if (!component.has('template')) {
                return null;
            }
            var templateExpr = component.get('template');
            var templateStr;
            var templateUrl = '';
            var templateRange = undefined;
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
            }
            else {
                var resolvedTemplate = this.evaluator.evaluate(templateExpr);
                if (typeof resolvedTemplate !== 'string') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, templateExpr, 'template must be a string');
                }
                templateStr = resolvedTemplate;
            }
            return { templateStr: templateStr, templateUrl: templateUrl, templateRange: templateRange, escapedString: escapedString };
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
            return tslib_1.__assign({ interpolation: interpolation }, compiler_1.parseTemplate(templateStr, templateUrl, tslib_1.__assign({ preserveWhitespaces: preserveWhitespaces, interpolationConfig: interpolation, range: templateRange, escapedString: escapedString }, options)), { isInline: component.has('template'), file: new compiler_1.ParseSourceFile(templateStr, templateUrl) });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFpWTtJQUNqWSwrQkFBaUM7SUFHakMsMkVBQWtFO0lBQ2xFLDJFQUF5RDtJQUN6RCxtRUFBaUc7SUFFakcscUVBQXVHO0lBQ3ZHLHdGQUFpRjtJQUNqRix1RkFBb0U7SUFDcEUseUVBQW1HO0lBRW5HLHVFQUFnSTtJQUVoSSxnR0FBNEc7SUFDNUcsNEdBQWdGO0lBR2hGLHVGQUEyRTtJQUMzRSxxRkFBd0Q7SUFDeEQsNkVBQW1JO0lBRW5JLElBQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO0lBQ2hELElBQU0sV0FBVyxHQUFVLEVBQUUsQ0FBQztJQVM5Qjs7T0FFRztJQUNIO1FBRUUsbUNBQ1ksU0FBeUIsRUFBVSxTQUEyQixFQUM5RCxZQUE4QixFQUFVLFVBQTBCLEVBQ2xFLFdBQWlDLEVBQVUsYUFBdUMsRUFDbEYsTUFBZSxFQUFVLGNBQThCLEVBQVUsUUFBa0IsRUFDbkYsMEJBQW1DLEVBQVUsa0JBQTJCLEVBQ3hFLGNBQThCLEVBQVUsYUFBNEIsRUFDcEUsVUFBNEIsRUFBVSxxQkFBNEMsRUFDbEYsb0JBQzZEO1lBRDdELHFDQUFBLEVBQUEsMkJBQzZCLGtEQUE4QixFQUFFO1lBUjdELGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBa0I7WUFDOUQsaUJBQVksR0FBWixZQUFZLENBQWtCO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBZ0I7WUFDbEUsZ0JBQVcsR0FBWCxXQUFXLENBQXNCO1lBQVUsa0JBQWEsR0FBYixhQUFhLENBQTBCO1lBQ2xGLFdBQU0sR0FBTixNQUFNLENB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ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIENzc1NlbGVjdG9yLCBERUZBVUxUX0lOVEVSUE9MQVRJT05fQ09ORklHLCBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnksIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgSW50ZXJwb2xhdGlvbkNvbmZpZywgTGV4ZXJSYW5nZSwgUGFyc2VFcnJvciwgUGFyc2VTb3VyY2VGaWxlLCBQYXJzZVRlbXBsYXRlT3B0aW9ucywgUjNDb21wb25lbnRNZXRhZGF0YSwgUjNUYXJnZXRCaW5kZXIsIFNlbGVjdG9yTWF0Y2hlciwgU3RhdGVtZW50LCBUbXBsQXN0Tm9kZSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlQ29tcG9uZW50RnJvbU1ldGFkYXRhLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q3ljbGVBbmFseXplcn0gZnJvbSAnLi4vLi4vY3ljbGVzJztcbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHthYnNvbHV0ZUZyb20sIHJlbGF0aXZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgTW9kdWxlUmVzb2x2ZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luZGV4aW5nQ29udGV4dH0gZnJvbSAnLi4vLi4vaW5kZXhlcic7XG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5LCBleHRyYWN0RGlyZWN0aXZlR3VhcmRzfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge2ZsYXR0ZW5Jbmhlcml0ZWREaXJlY3RpdmVNZXRhZGF0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEvc3JjL2luaGVyaXRhbmNlJztcbmltcG9ydCB7RW51bVZhbHVlLCBQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXIsIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7Tm9vcFJlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyLCBSZXNvdXJjZURlcGVuZGVuY3lSZWNvcmRlcn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcmVzb3VyY2VfcmVjb3JkZXInO1xuaW1wb3J0IHt0c1NvdXJjZU1hcEJ1ZzI5MzAwRml4ZWR9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3RzX3NvdXJjZV9tYXBfYnVnXzI5MzAwJztcblxuaW1wb3J0IHtSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEsIHBhcnNlRmllbGRBcnJheVZhbHVlfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmaW5kQW5ndWxhckRlY29yYXRvciwgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSwgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgcmVhZEJhc2VDbGFzcywgdW53cmFwRXhwcmVzc2lvbn0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgRU1QVFlfTUFQID0gbmV3IE1hcDxzdHJpbmcsIEV4cHJlc3Npb24+KCk7XG5jb25zdCBFTVBUWV9BUlJBWTogYW55W10gPSBbXTtcblxuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRIYW5kbGVyRGF0YSB7XG4gIG1ldGE6IFIzQ29tcG9uZW50TWV0YWRhdGE7XG4gIHBhcnNlZFRlbXBsYXRlOiB7bm9kZXM6IFRtcGxBc3ROb2RlW107IGZpbGU6IFBhcnNlU291cmNlRmlsZX07XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG4gIHBhcnNlVGVtcGxhdGU6IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IFBhcnNlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIGBEZWNvcmF0b3JIYW5kbGVyYCB3aGljaCBoYW5kbGVzIHRoZSBgQENvbXBvbmVudGAgYW5ub3RhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudERlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8Q29tcG9uZW50SGFuZGxlckRhdGEsIERlY29yYXRvcj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlcixcbiAgICAgIHByaXZhdGUgc2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLCBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLCBwcml2YXRlIHJlc291cmNlTG9hZGVyOiBSZXNvdXJjZUxvYWRlciwgcHJpdmF0ZSByb290RGlyczogc3RyaW5nW10sXG4gICAgICBwcml2YXRlIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuLCBwcml2YXRlIGkxOG5Vc2VFeHRlcm5hbElkczogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgbW9kdWxlUmVzb2x2ZXI6IE1vZHVsZVJlc29sdmVyLCBwcml2YXRlIGN5Y2xlQW5hbHl6ZXI6IEN5Y2xlQW5hbHl6ZXIsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIHJlc291cmNlRGVwZW5kZW5jaWVzOlxuICAgICAgICAgIFJlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyID0gbmV3IE5vb3BSZXNvdXJjZURlcGVuZGVuY3lSZWNvcmRlcigpKSB7fVxuXG4gIHByaXZhdGUgbGl0ZXJhbENhY2hlID0gbmV3IE1hcDxEZWNvcmF0b3IsIHRzLk9iamVjdExpdGVyYWxFeHByZXNzaW9uPigpO1xuICBwcml2YXRlIGVsZW1lbnRTY2hlbWFSZWdpc3RyeSA9IG5ldyBEb21FbGVtZW50U2NoZW1hUmVnaXN0cnkoKTtcblxuICAvKipcbiAgICogRHVyaW5nIHRoZSBhc3luY2hyb25vdXMgcHJlYW5hbHl6ZSBwaGFzZSwgaXQncyBuZWNlc3NhcnkgdG8gcGFyc2UgdGhlIHRlbXBsYXRlIHRvIGV4dHJhY3RcbiAgICogYW55IHBvdGVudGlhbCA8bGluaz4gdGFncyB3aGljaCBtaWdodCBuZWVkIHRvIGJlIGxvYWRlZC4gVGhpcyBjYWNoZSBlbnN1cmVzIHRoYXQgd29yayBpcyBub3RcbiAgICogdGhyb3duIGF3YXksIGFuZCB0aGUgcGFyc2VkIHRlbXBsYXRlIGlzIHJldXNlZCBkdXJpbmcgdGhlIGFuYWx5emUgcGhhc2UuXG4gICAqL1xuICBwcml2YXRlIHByZWFuYWx5emVUZW1wbGF0ZUNhY2hlID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgUGFyc2VkVGVtcGxhdGU+KCk7XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG5cbiAgZGV0ZWN0KG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ0NvbXBvbmVudCcsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBwcmVhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIC8vIEluIHByZWFuYWx5emUsIHJlc291cmNlIFVSTHMgYXNzb2NpYXRlZCB3aXRoIHRoZSBjb21wb25lbnQgYXJlIGFzeW5jaHJvbm91c2x5IHByZWxvYWRlZCB2aWFcbiAgICAvLyB0aGUgcmVzb3VyY2VMb2FkZXIuIFRoaXMgaXMgdGhlIG9ubHkgdGltZSBhc3luYyBvcGVyYXRpb25zIGFyZSBhbGxvd2VkIGZvciBhIGNvbXBvbmVudC5cbiAgICAvLyBUaGVzZSByZXNvdXJjZXMgYXJlOlxuICAgIC8vXG4gICAgLy8gLSB0aGUgdGVtcGxhdGVVcmwsIGlmIHRoZXJlIGlzIG9uZVxuICAgIC8vIC0gYW55IHN0eWxlVXJscyBpZiBwcmVzZW50XG4gICAgLy8gLSBhbnkgc3R5bGVzaGVldHMgcmVmZXJlbmNlZCBmcm9tIDxsaW5rPiB0YWdzIGluIHRoZSB0ZW1wbGF0ZSBpdHNlbGZcbiAgICAvL1xuICAgIC8vIEFzIGEgcmVzdWx0IG9mIHRoZSBsYXN0IG9uZSwgdGhlIHRlbXBsYXRlIG11c3QgYmUgcGFyc2VkIGFzIHBhcnQgb2YgcHJlYW5hbHlzaXMgdG8gZXh0cmFjdFxuICAgIC8vIDxsaW5rPiB0YWdzLCB3aGljaCBtYXkgaW52b2x2ZSB3YWl0aW5nIGZvciB0aGUgdGVtcGxhdGVVcmwgdG8gYmUgcmVzb2x2ZWQgZmlyc3QuXG5cbiAgICAvLyBJZiBwcmVsb2FkaW5nIGlzbid0IHBvc3NpYmxlLCB0aGVuIHNraXAgdGhpcyBzdGVwLlxuICAgIGlmICghdGhpcy5yZXNvdXJjZUxvYWRlci5jYW5QcmVsb2FkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGEgPSB0aGlzLl9yZXNvbHZlTGl0ZXJhbChkZWNvcmF0b3IpO1xuICAgIGNvbnN0IGNvbXBvbmVudCA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuICAgIGNvbnN0IGNvbnRhaW5pbmdGaWxlID0gbm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG5cbiAgICAvLyBDb252ZXJ0IGEgc3R5bGVVcmwgc3RyaW5nIGludG8gYSBQcm9taXNlIHRvIHByZWxvYWQgaXQuXG4gICAgY29uc3QgcmVzb2x2ZVN0eWxlVXJsID0gKHN0eWxlVXJsOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc291cmNlVXJsID0gdGhpcy5yZXNvdXJjZUxvYWRlci5yZXNvbHZlKHN0eWxlVXJsLCBjb250YWluaW5nRmlsZSk7XG4gICAgICBjb25zdCBwcm9taXNlID0gdGhpcy5yZXNvdXJjZUxvYWRlci5wcmVsb2FkKHJlc291cmNlVXJsKTtcbiAgICAgIHJldHVybiBwcm9taXNlIHx8IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH07XG5cbiAgICAvLyBBIFByb21pc2UgdGhhdCB3YWl0cyBmb3IgdGhlIHRlbXBsYXRlIGFuZCBhbGwgPGxpbms+ZWQgc3R5bGVzIHdpdGhpbiBpdCB0byBiZSBwcmVsb2FkZWQuXG4gICAgY29uc3QgdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzID1cbiAgICAgICAgdGhpcy5fcHJlbG9hZEFuZFBhcnNlVGVtcGxhdGUobm9kZSwgZGVjb3JhdG9yLCBjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKS50aGVuKHRlbXBsYXRlID0+IHtcbiAgICAgICAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbCh0ZW1wbGF0ZS5zdHlsZVVybHMubWFwKHJlc29sdmVTdHlsZVVybCkpLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgLy8gRXh0cmFjdCBhbGwgdGhlIHN0eWxlVXJscyBpbiB0aGUgZGVjb3JhdG9yLlxuICAgIGNvbnN0IHN0eWxlVXJscyA9IHRoaXMuX2V4dHJhY3RTdHlsZVVybHMoY29tcG9uZW50LCBbXSk7XG5cbiAgICBpZiAoc3R5bGVVcmxzID09PSBudWxsKSB7XG4gICAgICAvLyBBIGZhc3QgcGF0aCBleGlzdHMgaWYgdGhlcmUgYXJlIG5vIHN0eWxlVXJscywgdG8ganVzdCB3YWl0IGZvclxuICAgICAgLy8gdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzLlxuICAgICAgcmV0dXJuIHRlbXBsYXRlQW5kVGVtcGxhdGVTdHlsZVJlc291cmNlcztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gV2FpdCBmb3IgYm90aCB0aGUgdGVtcGxhdGUgYW5kIGFsbCBzdHlsZVVybCByZXNvdXJjZXMgdG8gcmVzb2x2ZS5cbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChbdGVtcGxhdGVBbmRUZW1wbGF0ZVN0eWxlUmVzb3VyY2VzLCAuLi5zdHlsZVVybHMubWFwKHJlc29sdmVTdHlsZVVybCldKVxuICAgICAgICAgIC50aGVuKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PENvbXBvbmVudEhhbmRsZXJEYXRhPiB7XG4gICAgY29uc3QgY29udGFpbmluZ0ZpbGUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICB0aGlzLmxpdGVyYWxDYWNoZS5kZWxldGUoZGVjb3JhdG9yKTtcblxuICAgIC8vIEBDb21wb25lbnQgaW5oZXJpdHMgQERpcmVjdGl2ZSwgc28gYmVnaW4gYnkgZXh0cmFjdGluZyB0aGUgQERpcmVjdGl2ZSBtZXRhZGF0YSBhbmQgYnVpbGRpbmdcbiAgICAvLyBvbiBpdC5cbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPSBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgIHRoaXMuZWxlbWVudFNjaGVtYVJlZ2lzdHJ5LmdldERlZmF1bHRDb21wb25lbnRFbGVtZW50TmFtZSgpKTtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGFgIHJldHVybnMgdW5kZWZpbmVkIHdoZW4gdGhlIEBEaXJlY3RpdmUgaGFzIGBqaXQ6IHRydWVgLiBJbiB0aGlzXG4gICAgICAvLyBjYXNlLCBjb21waWxhdGlvbiBvZiB0aGUgZGVjb3JhdG9yIGlzIHNraXBwZWQuIFJldHVybmluZyBhbiBlbXB0eSBvYmplY3Qgc2lnbmlmaWVzXG4gICAgICAvLyB0aGF0IG5vIGFuYWx5c2lzIHdhcyBwcm9kdWNlZC5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBOZXh0LCByZWFkIHRoZSBgQENvbXBvbmVudGAtc3BlY2lmaWMgZmllbGRzLlxuICAgIGNvbnN0IHtkZWNvcmF0b3I6IGNvbXBvbmVudCwgbWV0YWRhdGF9ID0gZGlyZWN0aXZlUmVzdWx0O1xuXG4gICAgLy8gR28gdGhyb3VnaCB0aGUgcm9vdCBkaXJlY3RvcmllcyBmb3IgdGhpcyBwcm9qZWN0LCBhbmQgc2VsZWN0IHRoZSBvbmUgd2l0aCB0aGUgc21hbGxlc3RcbiAgICAvLyByZWxhdGl2ZSBwYXRoIHJlcHJlc2VudGF0aW9uLlxuICAgIGNvbnN0IHJlbGF0aXZlQ29udGV4dEZpbGVQYXRoID0gdGhpcy5yb290RGlycy5yZWR1Y2U8c3RyaW5nfHVuZGVmaW5lZD4oKHByZXZpb3VzLCByb290RGlyKSA9PiB7XG4gICAgICBjb25zdCBjYW5kaWRhdGUgPSByZWxhdGl2ZShhYnNvbHV0ZUZyb20ocm9vdERpciksIGFic29sdXRlRnJvbShjb250YWluaW5nRmlsZSkpO1xuICAgICAgaWYgKHByZXZpb3VzID09PSB1bmRlZmluZWQgfHwgY2FuZGlkYXRlLmxlbmd0aCA8IHByZXZpb3VzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzO1xuICAgICAgfVxuICAgIH0sIHVuZGVmaW5lZCkgITtcblxuICAgIGNvbnN0IHZpZXdQcm92aWRlcnM6IEV4cHJlc3Npb258bnVsbCA9IGNvbXBvbmVudC5oYXMoJ3ZpZXdQcm92aWRlcnMnKSA/XG4gICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIoY29tcG9uZW50LmdldCgndmlld1Byb3ZpZGVycycpICEpIDpcbiAgICAgICAgbnVsbDtcblxuICAgIC8vIFBhcnNlIHRoZSB0ZW1wbGF0ZS5cbiAgICAvLyBJZiBhIHByZWFuYWx5emUgcGhhc2Ugd2FzIGV4ZWN1dGVkLCB0aGUgdGVtcGxhdGUgbWF5IGFscmVhZHkgZXhpc3QgaW4gcGFyc2VkIGZvcm0sIHNvIGNoZWNrXG4gICAgLy8gdGhlIHByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLlxuICAgIC8vIEV4dHJhY3QgYSBjbG9zdXJlIG9mIHRoZSB0ZW1wbGF0ZSBwYXJzaW5nIGNvZGUgc28gdGhhdCBpdCBjYW4gYmUgcmVwYXJzZWQgd2l0aCBkaWZmZXJlbnRcbiAgICAvLyBvcHRpb25zIGlmIG5lZWRlZCwgbGlrZSBpbiB0aGUgaW5kZXhpbmcgcGlwZWxpbmUuXG4gICAgbGV0IHBhcnNlVGVtcGxhdGU6IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IFBhcnNlZFRlbXBsYXRlO1xuICAgIGlmICh0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmhhcyhub2RlKSkge1xuICAgICAgLy8gVGhlIHRlbXBsYXRlIHdhcyBwYXJzZWQgaW4gcHJlYW5hbHl6ZS4gVXNlIGl0IGFuZCBkZWxldGUgaXQgdG8gc2F2ZSBtZW1vcnkuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuZ2V0KG5vZGUpICE7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLmRlbGV0ZShub2RlKTtcblxuICAgICAgLy8gQSBwcmUtYW5hbHl6ZWQgdGVtcGxhdGUgY2Fubm90IGJlIHJlcGFyc2VkLiBQcmUtYW5hbHlzaXMgaXMgbmV2ZXIgcnVuIHdpdGggdGhlIGluZGV4aW5nXG4gICAgICAvLyBwaXBlbGluZS5cbiAgICAgIHBhcnNlVGVtcGxhdGUgPSAob3B0aW9ucz86IFBhcnNlVGVtcGxhdGVPcHRpb25zKSA9PiB7XG4gICAgICAgIGlmIChvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXBhcnNlIGEgcHJlLWFuYWx5emVkIHRlbXBsYXRlIHdpdGggbmV3IG9wdGlvbnNgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgdGVtcGxhdGUgd2FzIG5vdCBhbHJlYWR5IHBhcnNlZC4gRWl0aGVyIHRoZXJlJ3MgYSB0ZW1wbGF0ZVVybCwgb3IgYW4gaW5saW5lIHRlbXBsYXRlLlxuICAgICAgaWYgKGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlVXJsJykpIHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVVcmxFeHByID0gY29tcG9uZW50LmdldCgndGVtcGxhdGVVcmwnKSAhO1xuICAgICAgICBjb25zdCBldmFsVGVtcGxhdGVVcmwgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZSh0ZW1wbGF0ZVVybEV4cHIpO1xuICAgICAgICBpZiAodHlwZW9mIGV2YWxUZW1wbGF0ZVVybCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgdGVtcGxhdGVVcmxFeHByLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5yZXNvdXJjZUxvYWRlci5yZXNvbHZlKGV2YWxUZW1wbGF0ZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZVN0ciA9IHRoaXMucmVzb3VyY2VMb2FkZXIubG9hZCh0ZW1wbGF0ZVVybCk7XG4gICAgICAgIHRoaXMucmVzb3VyY2VEZXBlbmRlbmNpZXMucmVjb3JkUmVzb3VyY2VEZXBlbmRlbmN5KG5vZGUuZ2V0U291cmNlRmlsZSgpLCB0ZW1wbGF0ZVVybCk7XG5cbiAgICAgICAgcGFyc2VUZW1wbGF0ZSA9IChvcHRpb25zPzogUGFyc2VUZW1wbGF0ZU9wdGlvbnMpID0+IHRoaXMuX3BhcnNlVGVtcGxhdGUoXG4gICAgICAgICAgICBjb21wb25lbnQsIHRlbXBsYXRlU3RyLCBzb3VyY2VNYXBVcmwodGVtcGxhdGVVcmwpLCAvKiB0ZW1wbGF0ZVJhbmdlICovIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIC8qIGVzY2FwZWRTdHJpbmcgKi8gZmFsc2UsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRXhwZWN0IGFuIGlubGluZSB0ZW1wbGF0ZSB0byBiZSBwcmVzZW50LlxuICAgICAgICBjb25zdCBpbmxpbmVUZW1wbGF0ZSA9IHRoaXMuX2V4dHJhY3RJbmxpbmVUZW1wbGF0ZShjb21wb25lbnQsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgICAgaWYgKGlubGluZVRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuQ09NUE9ORU5UX01JU1NJTkdfVEVNUExBVEUsIGRlY29yYXRvci5ub2RlLFxuICAgICAgICAgICAgICAnY29tcG9uZW50IGlzIG1pc3NpbmcgYSB0ZW1wbGF0ZScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHt0ZW1wbGF0ZVN0ciwgdGVtcGxhdGVVcmwsIHRlbXBsYXRlUmFuZ2UsIGVzY2FwZWRTdHJpbmd9ID0gaW5saW5lVGVtcGxhdGU7XG4gICAgICAgIHBhcnNlVGVtcGxhdGUgPSAob3B0aW9ucz86IFBhcnNlVGVtcGxhdGVPcHRpb25zKSA9PiB0aGlzLl9wYXJzZVRlbXBsYXRlKFxuICAgICAgICAgICAgY29tcG9uZW50LCB0ZW1wbGF0ZVN0ciwgdGVtcGxhdGVVcmwsIHRlbXBsYXRlUmFuZ2UsIGVzY2FwZWRTdHJpbmcsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUoKTtcblxuICAgIGlmICh0ZW1wbGF0ZS5lcnJvcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBFcnJvcnMgcGFyc2luZyB0ZW1wbGF0ZTogJHt0ZW1wbGF0ZS5lcnJvcnMubWFwKGUgPT4gZS50b1N0cmluZygpKS5qb2luKCcsICcpfWApO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBjb21wb25lbnQgaGFzIGEgc2VsZWN0b3IsIGl0IHNob3VsZCBiZSByZWdpc3RlcmVkIHdpdGggdGhlXG4gICAgLy8gYExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeWBcbiAgICAvLyBzbyB0aGF0IHdoZW4gdGhpcyBjb21wb25lbnQgYXBwZWFycyBpbiBhbiBgQE5nTW9kdWxlYCBzY29wZSwgaXRzIHNlbGVjdG9yIGNhbiBiZVxuICAgIC8vIGRldGVybWluZWQuXG4gICAgaWYgKG1ldGFkYXRhLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKG5vZGUpO1xuICAgICAgdGhpcy5tZXRhUmVnaXN0cnkucmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YSh7XG4gICAgICAgIHJlZixcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgICAgIHNlbGVjdG9yOiBtZXRhZGF0YS5zZWxlY3RvcixcbiAgICAgICAgZXhwb3J0QXM6IG1ldGFkYXRhLmV4cG9ydEFzLFxuICAgICAgICBpbnB1dHM6IG1ldGFkYXRhLmlucHV0cyxcbiAgICAgICAgb3V0cHV0czogbWV0YWRhdGEub3V0cHV0cyxcbiAgICAgICAgcXVlcmllczogbWV0YWRhdGEucXVlcmllcy5tYXAocXVlcnkgPT4gcXVlcnkucHJvcGVydHlOYW1lKSxcbiAgICAgICAgaXNDb21wb25lbnQ6IHRydWUsIC4uLmV4dHJhY3REaXJlY3RpdmVHdWFyZHMobm9kZSwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgICBiYXNlQ2xhc3M6IHJlYWRCYXNlQ2xhc3Mobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZpZ3VyZSBvdXQgdGhlIHNldCBvZiBzdHlsZXMuIFRoZSBvcmRlcmluZyBoZXJlIGlzIGltcG9ydGFudDogZXh0ZXJuYWwgcmVzb3VyY2VzIChzdHlsZVVybHMpXG4gICAgLy8gcHJlY2VkZSBpbmxpbmUgc3R5bGVzLCBhbmQgc3R5bGVzIGRlZmluZWQgaW4gdGhlIHRlbXBsYXRlIG92ZXJyaWRlIHN0eWxlcyBkZWZpbmVkIGluIHRoZVxuICAgIC8vIGNvbXBvbmVudC5cbiAgICBsZXQgc3R5bGVzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcblxuICAgIGNvbnN0IHN0eWxlVXJscyA9IHRoaXMuX2V4dHJhY3RTdHlsZVVybHMoY29tcG9uZW50LCB0ZW1wbGF0ZS5zdHlsZVVybHMpO1xuICAgIGlmIChzdHlsZVVybHMgIT09IG51bGwpIHtcbiAgICAgIGlmIChzdHlsZXMgPT09IG51bGwpIHtcbiAgICAgICAgc3R5bGVzID0gW107XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHN0eWxlVXJsIG9mIHN0eWxlVXJscykge1xuICAgICAgICBjb25zdCByZXNvdXJjZVVybCA9IHRoaXMucmVzb3VyY2VMb2FkZXIucmVzb2x2ZShzdHlsZVVybCwgY29udGFpbmluZ0ZpbGUpO1xuICAgICAgICBjb25zdCByZXNvdXJjZVN0ciA9IHRoaXMucmVzb3VyY2VMb2FkZXIubG9hZChyZXNvdXJjZVVybCk7XG4gICAgICAgIHN0eWxlcy5wdXNoKHJlc291cmNlU3RyKTtcbiAgICAgICAgdGhpcy5yZXNvdXJjZURlcGVuZGVuY2llcy5yZWNvcmRSZXNvdXJjZURlcGVuZGVuY3kobm9kZS5nZXRTb3VyY2VGaWxlKCksIHJlc291cmNlVXJsKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ3N0eWxlcycpKSB7XG4gICAgICBjb25zdCBsaXRTdHlsZXMgPSBwYXJzZUZpZWxkQXJyYXlWYWx1ZShjb21wb25lbnQsICdzdHlsZXMnLCB0aGlzLmV2YWx1YXRvcik7XG4gICAgICBpZiAobGl0U3R5bGVzICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChzdHlsZXMgPT09IG51bGwpIHtcbiAgICAgICAgICBzdHlsZXMgPSBsaXRTdHlsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3R5bGVzLnB1c2goLi4ubGl0U3R5bGVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodGVtcGxhdGUuc3R5bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmIChzdHlsZXMgPT09IG51bGwpIHtcbiAgICAgICAgc3R5bGVzID0gdGVtcGxhdGUuc3R5bGVzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3R5bGVzLnB1c2goLi4udGVtcGxhdGUuc3R5bGVzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBlbmNhcHN1bGF0aW9uOiBudW1iZXIgPVxuICAgICAgICB0aGlzLl9yZXNvbHZlRW51bVZhbHVlKGNvbXBvbmVudCwgJ2VuY2Fwc3VsYXRpb24nLCAnVmlld0VuY2Fwc3VsYXRpb24nKSB8fCAwO1xuXG4gICAgY29uc3QgY2hhbmdlRGV0ZWN0aW9uOiBudW1iZXJ8bnVsbCA9XG4gICAgICAgIHRoaXMuX3Jlc29sdmVFbnVtVmFsdWUoY29tcG9uZW50LCAnY2hhbmdlRGV0ZWN0aW9uJywgJ0NoYW5nZURldGVjdGlvblN0cmF0ZWd5Jyk7XG5cbiAgICBsZXQgYW5pbWF0aW9uczogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcygnYW5pbWF0aW9ucycpKSB7XG4gICAgICBhbmltYXRpb25zID0gbmV3IFdyYXBwZWROb2RlRXhwcihjb21wb25lbnQuZ2V0KCdhbmltYXRpb25zJykgISk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0ID0ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgbWV0YToge1xuICAgICAgICAgIC4uLm1ldGFkYXRhLFxuICAgICAgICAgIHRlbXBsYXRlLFxuICAgICAgICAgIGVuY2Fwc3VsYXRpb24sXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbjogdGVtcGxhdGUuaW50ZXJwb2xhdGlvbixcbiAgICAgICAgICBzdHlsZXM6IHN0eWxlcyB8fCBbXSxcblxuICAgICAgICAgIC8vIFRoZXNlIHdpbGwgYmUgcmVwbGFjZWQgZHVyaW5nIHRoZSBjb21waWxhdGlvbiBzdGVwLCBhZnRlciBhbGwgYE5nTW9kdWxlYHMgaGF2ZSBiZWVuXG4gICAgICAgICAgLy8gYW5hbHl6ZWQgYW5kIHRoZSBmdWxsIGNvbXBpbGF0aW9uIHNjb3BlIGZvciB0aGUgY29tcG9uZW50IGNhbiBiZSByZWFsaXplZC5cbiAgICAgICAgICBwaXBlczogRU1QVFlfTUFQLFxuICAgICAgICAgIGRpcmVjdGl2ZXM6IEVNUFRZX0FSUkFZLFxuICAgICAgICAgIHdyYXBEaXJlY3RpdmVzQW5kUGlwZXNJbkNsb3N1cmU6IGZhbHNlLCAgLy9cbiAgICAgICAgICBhbmltYXRpb25zLFxuICAgICAgICAgIHZpZXdQcm92aWRlcnMsXG4gICAgICAgICAgaTE4blVzZUV4dGVybmFsSWRzOiB0aGlzLmkxOG5Vc2VFeHRlcm5hbElkcywgcmVsYXRpdmVDb250ZXh0RmlsZVBhdGhcbiAgICAgICAgfSxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICAgIHBhcnNlZFRlbXBsYXRlOiB0ZW1wbGF0ZSwgcGFyc2VUZW1wbGF0ZSxcbiAgICAgIH0sXG4gICAgICB0eXBlQ2hlY2s6IHRydWUsXG4gICAgfTtcbiAgICBpZiAoY2hhbmdlRGV0ZWN0aW9uICE9PSBudWxsKSB7XG4gICAgICAob3V0cHV0LmFuYWx5c2lzLm1ldGEgYXMgUjNDb21wb25lbnRNZXRhZGF0YSkuY2hhbmdlRGV0ZWN0aW9uID0gY2hhbmdlRGV0ZWN0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9XG5cbiAgaW5kZXgoY29udGV4dDogSW5kZXhpbmdDb250ZXh0LCBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogQ29tcG9uZW50SGFuZGxlckRhdGEpIHtcbiAgICAvLyBUaGUgY29tcG9uZW50IHRlbXBsYXRlIG1heSBoYXZlIGJlZW4gcHJldmlvdXNseSBwYXJzZWQgd2l0aG91dCBwcmVzZXJ2aW5nIHdoaXRlc3BhY2Ugb3Igd2l0aFxuICAgIC8vIGBsZWFkaW5nVHJpdmlhQ2hhcmBzLCBib3RoIG9mIHdoaWNoIG1heSBtYW5pcHVsYXRlIHRoZSBBU1QgaW50byBhIGZvcm0gbm90IHJlcHJlc2VudGF0aXZlIG9mXG4gICAgLy8gdGhlIHNvdXJjZSBjb2RlLCBtYWtpbmcgaXQgdW5zdWl0YWJsZSBmb3IgaW5kZXhpbmcuIFRoZSB0ZW1wbGF0ZSBpcyByZXBhcnNlZCB3aXRoIHByZXNlcnZpbmdcbiAgICAvLyBvcHRpb25zIHRvIHJlbWVkeSB0aGlzLlxuICAgIGNvbnN0IHRlbXBsYXRlID0gYW5hbHlzaXMucGFyc2VUZW1wbGF0ZSh7XG4gICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiB0cnVlLFxuICAgICAgbGVhZGluZ1RyaXZpYUNoYXJzOiBbXSxcbiAgICB9KTtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBhbmFseXNpcy5tZXRhLnNlbGVjdG9yO1xuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzKSB7XG4gICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UoZGlyZWN0aXZlLnNlbGVjdG9yKSwgZGlyZWN0aXZlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYmluZGVyID0gbmV3IFIzVGFyZ2V0QmluZGVyKG1hdGNoZXIpO1xuICAgIGNvbnN0IGJvdW5kVGVtcGxhdGUgPSBiaW5kZXIuYmluZCh7dGVtcGxhdGU6IHRlbXBsYXRlLm5vZGVzfSk7XG5cbiAgICBjb250ZXh0LmFkZENvbXBvbmVudCh7XG4gICAgICBkZWNsYXJhdGlvbjogbm9kZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgYm91bmRUZW1wbGF0ZSxcbiAgICAgIHRlbXBsYXRlTWV0YToge1xuICAgICAgICBpc0lubGluZTogdGVtcGxhdGUuaXNJbmxpbmUsXG4gICAgICAgIGZpbGU6IHRlbXBsYXRlLmZpbGUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgdHlwZUNoZWNrKGN0eDogVHlwZUNoZWNrQ29udGV4dCwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogQ29tcG9uZW50SGFuZGxlckRhdGEpOiB2b2lkIHtcbiAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8RGlyZWN0aXZlTWV0YT4oKTtcbiAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgbWV0YSBvZiBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbnN0IGV4dE1ldGEgPSBmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGEodGhpcy5tZXRhUmVhZGVyLCBtZXRhLnJlZik7XG4gICAgICAgIG1hdGNoZXIuYWRkU2VsZWN0YWJsZXMoQ3NzU2VsZWN0b3IucGFyc2UobWV0YS5zZWxlY3RvciksIGV4dE1ldGEpO1xuICAgICAgfVxuICAgICAgY29uc3QgYm91bmQgPSBuZXcgUjNUYXJnZXRCaW5kZXIobWF0Y2hlcikuYmluZCh7dGVtcGxhdGU6IG1ldGEucGFyc2VkVGVtcGxhdGUubm9kZXN9KTtcbiAgICAgIGNvbnN0IHBpcGVzID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj4oKTtcbiAgICAgIGZvciAoY29uc3Qge25hbWUsIHJlZn0gb2Ygc2NvcGUuY29tcGlsYXRpb24ucGlwZXMpIHtcbiAgICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmLm5vZGUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgVW5leHBlY3RlZCBub24tY2xhc3MgZGVjbGFyYXRpb24gJHt0cy5TeW50YXhLaW5kW3JlZi5ub2RlLmtpbmRdfSBmb3IgcGlwZSAke3JlZi5kZWJ1Z05hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcGlwZXMuc2V0KG5hbWUsIHJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pO1xuICAgICAgfVxuICAgICAgY3R4LmFkZFRlbXBsYXRlKG5ldyBSZWZlcmVuY2Uobm9kZSksIGJvdW5kLCBwaXBlcywgbWV0YS5wYXJzZWRUZW1wbGF0ZS5maWxlKTtcbiAgICB9XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBDb21wb25lbnRIYW5kbGVyRGF0YSk6IFJlc29sdmVSZXN1bHQge1xuICAgIGNvbnN0IGNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICAvLyBDaGVjayB3aGV0aGVyIHRoaXMgY29tcG9uZW50IHdhcyByZWdpc3RlcmVkIHdpdGggYW4gTmdNb2R1bGUuIElmIHNvLCBpdCBzaG91bGQgYmUgY29tcGlsZWRcbiAgICAvLyB1bmRlciB0aGF0IG1vZHVsZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlYWRlci5nZXRTY29wZUZvckNvbXBvbmVudChub2RlKTtcbiAgICBsZXQgbWV0YWRhdGEgPSBhbmFseXNpcy5tZXRhO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgLy8gUmVwbGFjZSB0aGUgZW1wdHkgY29tcG9uZW50cyBhbmQgZGlyZWN0aXZlcyBmcm9tIHRoZSBhbmFseXplKCkgc3RlcCB3aXRoIGEgZnVsbHkgZXhwYW5kZWRcbiAgICAgIC8vIHNjb3BlLiBUaGlzIGlzIHBvc3NpYmxlIG5vdyBiZWNhdXNlIGR1cmluZyByZXNvbHZlKCkgdGhlIHdob2xlIGNvbXBpbGF0aW9uIHVuaXQgaGFzIGJlZW5cbiAgICAgIC8vIGZ1bGx5IGFuYWx5emVkLlxuICAgICAgLy9cbiAgICAgIC8vIEZpcnN0IGl0IG5lZWRzIHRvIGJlIGRldGVybWluZWQgaWYgYWN0dWFsbHkgaW1wb3J0aW5nIHRoZSBkaXJlY3RpdmVzL3BpcGVzIHVzZWQgaW4gdGhlXG4gICAgICAvLyB0ZW1wbGF0ZSB3b3VsZCBjcmVhdGUgYSBjeWNsZS4gQ3VycmVudGx5IG5ndHNjIHJlZnVzZXMgdG8gZ2VuZXJhdGUgY3ljbGVzLCBzbyBhbiBvcHRpb25cbiAgICAgIC8vIGtub3duIGFzIFwicmVtb3RlIHNjb3BpbmdcIiBpcyB1c2VkIGlmIGEgY3ljbGUgd291bGQgYmUgY3JlYXRlZC4gSW4gcmVtb3RlIHNjb3BpbmcsIHRoZVxuICAgICAgLy8gbW9kdWxlIGZpbGUgc2V0cyB0aGUgZGlyZWN0aXZlcy9waXBlcyBvbiB0aGUgbmdDb21wb25lbnREZWYgb2YgdGhlIGNvbXBvbmVudCwgd2l0aG91dFxuICAgICAgLy8gcmVxdWlyaW5nIG5ldyBpbXBvcnRzIChidXQgYWxzbyBpbiBhIHdheSB0aGF0IGJyZWFrcyB0cmVlIHNoYWtpbmcpLlxuICAgICAgLy9cbiAgICAgIC8vIERldGVybWluaW5nIHRoaXMgaXMgY2hhbGxlbmdpbmcsIGJlY2F1c2UgdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIgaXMgcmVzcG9uc2libGUgZm9yXG4gICAgICAvLyBtYXRjaGluZyBkaXJlY3RpdmVzIGFuZCBwaXBlcyBpbiB0aGUgdGVtcGxhdGU7IGhvd2V2ZXIsIHRoYXQgZG9lc24ndCBydW4gdW50aWwgdGhlIGFjdHVhbFxuICAgICAgLy8gY29tcGlsZSgpIHN0ZXAuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHJ1biB0ZW1wbGF0ZSBjb21waWxhdGlvbiBzb29uZXIgYXMgaXQgcmVxdWlyZXMgdGhlXG4gICAgICAvLyBDb25zdGFudFBvb2wgZm9yIHRoZSBvdmVyYWxsIGZpbGUgYmVpbmcgY29tcGlsZWQgKHdoaWNoIGlzbid0IGF2YWlsYWJsZSB1bnRpbCB0aGUgdHJhbnNmb3JtXG4gICAgICAvLyBzdGVwKS5cbiAgICAgIC8vXG4gICAgICAvLyBJbnN0ZWFkLCBkaXJlY3RpdmVzL3BpcGVzIGFyZSBtYXRjaGVkIGluZGVwZW5kZW50bHkgaGVyZSwgdXNpbmcgdGhlIFIzVGFyZ2V0QmluZGVyLiBUaGlzIGlzXG4gICAgICAvLyBhbiBhbHRlcm5hdGl2ZSBpbXBsZW1lbnRhdGlvbiBvZiB0ZW1wbGF0ZSBtYXRjaGluZyB3aGljaCBpcyB1c2VkIGZvciB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nXG4gICAgICAvLyBhbmQgd2lsbCBldmVudHVhbGx5IHJlcGxhY2UgbWF0Y2hpbmcgaW4gdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIuXG5cblxuICAgICAgLy8gU2V0IHVwIHRoZSBSM1RhcmdldEJpbmRlciwgYXMgd2VsbCBhcyBhICdkaXJlY3RpdmVzJyBhcnJheSBhbmQgYSAncGlwZXMnIG1hcCB0aGF0IGFyZSBsYXRlclxuICAgICAgLy8gZmVkIHRvIHRoZSBUZW1wbGF0ZURlZmluaXRpb25CdWlsZGVyLiBGaXJzdCwgYSBTZWxlY3Rvck1hdGNoZXIgaXMgY29uc3RydWN0ZWQgdG8gbWF0Y2hcbiAgICAgIC8vIGRpcmVjdGl2ZXMgdGhhdCBhcmUgaW4gc2NvcGUuXG4gICAgICBjb25zdCBtYXRjaGVyID0gbmV3IFNlbGVjdG9yTWF0Y2hlcjxEaXJlY3RpdmVNZXRhJntleHByZXNzaW9uOiBFeHByZXNzaW9ufT4oKTtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZXM6IHtzZWxlY3Rvcjogc3RyaW5nLCBleHByZXNzaW9uOiBFeHByZXNzaW9ufVtdID0gW107XG5cbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29uc3Qge3JlZiwgc2VsZWN0b3J9ID0gZGlyO1xuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocmVmLCBjb250ZXh0KTtcbiAgICAgICAgZGlyZWN0aXZlcy5wdXNoKHtzZWxlY3RvciwgZXhwcmVzc2lvbn0pO1xuICAgICAgICBtYXRjaGVyLmFkZFNlbGVjdGFibGVzKENzc1NlbGVjdG9yLnBhcnNlKHNlbGVjdG9yKSwgey4uLmRpciwgZXhwcmVzc2lvbn0pO1xuICAgICAgfVxuICAgICAgY29uc3QgcGlwZXMgPSBuZXcgTWFwPHN0cmluZywgRXhwcmVzc2lvbj4oKTtcbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBzY29wZS5jb21waWxhdGlvbi5waXBlcykge1xuICAgICAgICBwaXBlcy5zZXQocGlwZS5uYW1lLCB0aGlzLnJlZkVtaXR0ZXIuZW1pdChwaXBlLnJlZiwgY29udGV4dCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBOZXh0LCB0aGUgY29tcG9uZW50IHRlbXBsYXRlIEFTVCBpcyBib3VuZCB1c2luZyB0aGUgUjNUYXJnZXRCaW5kZXIuIFRoaXMgcHJvZHVjZXMgYW5cbiAgICAgIC8vIEJvdW5kVGFyZ2V0LCB3aGljaCBpcyBzaW1pbGFyIHRvIGEgdHMuVHlwZUNoZWNrZXIuXG4gICAgICBjb25zdCBiaW5kZXIgPSBuZXcgUjNUYXJnZXRCaW5kZXIobWF0Y2hlcik7XG4gICAgICBjb25zdCBib3VuZCA9IGJpbmRlci5iaW5kKHt0ZW1wbGF0ZTogbWV0YWRhdGEudGVtcGxhdGUubm9kZXN9KTtcblxuICAgICAgLy8gVGhlIEJvdW5kVGFyZ2V0IGtub3dzIHdoaWNoIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIG1hdGNoZWQgdGhlIHRlbXBsYXRlLlxuICAgICAgY29uc3QgdXNlZERpcmVjdGl2ZXMgPSBib3VuZC5nZXRVc2VkRGlyZWN0aXZlcygpO1xuICAgICAgY29uc3QgdXNlZFBpcGVzID0gYm91bmQuZ2V0VXNlZFBpcGVzKCkubWFwKG5hbWUgPT4gcGlwZXMuZ2V0KG5hbWUpICEpO1xuXG4gICAgICAvLyBTY2FuIHRocm91Z2ggdGhlIGRpcmVjdGl2ZXMvcGlwZXMgYWN0dWFsbHkgdXNlZCBpbiB0aGUgdGVtcGxhdGUgYW5kIGNoZWNrIHdoZXRoZXIgYW55XG4gICAgICAvLyBpbXBvcnQgd2hpY2ggbmVlZHMgdG8gYmUgZ2VuZXJhdGVkIHdvdWxkIGNyZWF0ZSBhIGN5Y2xlLlxuICAgICAgY29uc3QgY3ljbGVEZXRlY3RlZCA9XG4gICAgICAgICAgdXNlZERpcmVjdGl2ZXMuc29tZShkaXIgPT4gdGhpcy5faXNDeWNsaWNJbXBvcnQoZGlyLmV4cHJlc3Npb24sIGNvbnRleHQpKSB8fFxuICAgICAgICAgIHVzZWRQaXBlcy5zb21lKHBpcGUgPT4gdGhpcy5faXNDeWNsaWNJbXBvcnQocGlwZSwgY29udGV4dCkpO1xuXG4gICAgICBpZiAoIWN5Y2xlRGV0ZWN0ZWQpIHtcbiAgICAgICAgLy8gTm8gY3ljbGUgd2FzIGRldGVjdGVkLiBSZWNvcmQgdGhlIGltcG9ydHMgdGhhdCBuZWVkIHRvIGJlIGNyZWF0ZWQgaW4gdGhlIGN5Y2xlIGRldGVjdG9yXG4gICAgICAgIC8vIHNvIHRoYXQgZnV0dXJlIGN5Y2xpYyBpbXBvcnQgY2hlY2tzIGNvbnNpZGVyIHRoZWlyIHByb2R1Y3Rpb24uXG4gICAgICAgIGZvciAoY29uc3Qge2V4cHJlc3Npb259IG9mIHVzZWREaXJlY3RpdmVzKSB7XG4gICAgICAgICAgdGhpcy5fcmVjb3JkU3ludGhldGljSW1wb3J0KGV4cHJlc3Npb24sIGNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgcGlwZSBvZiB1c2VkUGlwZXMpIHtcbiAgICAgICAgICB0aGlzLl9yZWNvcmRTeW50aGV0aWNJbXBvcnQocGlwZSwgY29udGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB3aGV0aGVyIHRoZSBkaXJlY3RpdmUvcGlwZSBhcnJheXMgaW4gbmdDb21wb25lbnREZWYgbmVlZCB0byBiZSB3cmFwcGVkIGluIGNsb3N1cmVzLlxuICAgICAgICAvLyBUaGlzIGlzIHJlcXVpcmVkIGlmIGFueSBkaXJlY3RpdmUvcGlwZSByZWZlcmVuY2UgaXMgdG8gYSBkZWNsYXJhdGlvbiBpbiB0aGUgc2FtZSBmaWxlIGJ1dFxuICAgICAgICAvLyBkZWNsYXJlZCBhZnRlciB0aGlzIGNvbXBvbmVudC5cbiAgICAgICAgY29uc3Qgd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZSA9XG4gICAgICAgICAgICB1c2VkRGlyZWN0aXZlcy5zb21lKFxuICAgICAgICAgICAgICAgIGRpciA9PiBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKGRpci5leHByZXNzaW9uLCBub2RlLm5hbWUsIGNvbnRleHQpKSB8fFxuICAgICAgICAgICAgdXNlZFBpcGVzLnNvbWUocGlwZSA9PiBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKHBpcGUsIG5vZGUubmFtZSwgY29udGV4dCkpO1xuXG4gICAgICAgIC8vIEFjdHVhbCBjb21waWxhdGlvbiBzdGlsbCB1c2VzIHRoZSBmdWxsIHNjb3BlLCBub3QgdGhlIG5hcnJvd2VkIHNjb3BlIGRldGVybWluZWQgYnlcbiAgICAgICAgLy8gUjNUYXJnZXRCaW5kZXIuIFRoaXMgaXMgYSBoZWRnZSBhZ2FpbnN0IHBvdGVudGlhbCBpc3N1ZXMgd2l0aCB0aGUgUjNUYXJnZXRCaW5kZXIgLSByaWdodFxuICAgICAgICAvLyBub3cgdGhlIFRlbXBsYXRlRGVmaW5pdGlvbkJ1aWxkZXIgaXMgdGhlIFwic291cmNlIG9mIHRydXRoXCIgZm9yIHdoaWNoIGRpcmVjdGl2ZXMvcGlwZXMgYXJlXG4gICAgICAgIC8vIGFjdHVhbGx5IHVzZWQgKHRob3VnaCB0aGUgdHdvIHNob3VsZCBhZ3JlZSBwZXJmZWN0bHkpLlxuICAgICAgICAvL1xuICAgICAgICAvLyBUT0RPKGFseGh1Yik6IHN3aXRjaCBUZW1wbGF0ZURlZmluaXRpb25CdWlsZGVyIG92ZXIgdG8gdXNpbmcgUjNUYXJnZXRCaW5kZXIgZGlyZWN0bHkuXG4gICAgICAgIG1ldGFkYXRhLmRpcmVjdGl2ZXMgPSBkaXJlY3RpdmVzO1xuICAgICAgICBtZXRhZGF0YS5waXBlcyA9IHBpcGVzO1xuICAgICAgICBtZXRhZGF0YS53cmFwRGlyZWN0aXZlc0FuZFBpcGVzSW5DbG9zdXJlID0gd3JhcERpcmVjdGl2ZXNBbmRQaXBlc0luQ2xvc3VyZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIERlY2xhcmluZyB0aGUgZGlyZWN0aXZlRGVmcy9waXBlRGVmcyBhcnJheXMgZGlyZWN0bHkgd291bGQgcmVxdWlyZSBpbXBvcnRzIHRoYXQgd291bGRcbiAgICAgICAgLy8gY3JlYXRlIGEgY3ljbGUuIEluc3RlYWQsIG1hcmsgdGhpcyBjb21wb25lbnQgYXMgcmVxdWlyaW5nIHJlbW90ZSBzY29waW5nLCBzbyB0aGF0IHRoZVxuICAgICAgICAvLyBOZ01vZHVsZSBmaWxlIHdpbGwgdGFrZSBjYXJlIG9mIHNldHRpbmcgdGhlIGRpcmVjdGl2ZXMgZm9yIHRoZSBjb21wb25lbnQuXG4gICAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5zZXRDb21wb25lbnRBc1JlcXVpcmluZ1JlbW90ZVNjb3Bpbmcobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IENvbXBvbmVudEhhbmRsZXJEYXRhLCBwb29sOiBDb25zdGFudFBvb2wpOlxuICAgICAgQ29tcGlsZVJlc3VsdCB7XG4gICAgY29uc3QgcmVzID0gY29tcGlsZUNvbXBvbmVudEZyb21NZXRhZGF0YShhbmFseXNpcy5tZXRhLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcblxuICAgIGNvbnN0IHN0YXRlbWVudHMgPSByZXMuc3RhdGVtZW50cztcbiAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBzdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICduZ0NvbXBvbmVudERlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sIHN0YXRlbWVudHMsXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBfcmVzb2x2ZUxpdGVyYWwoZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbiB7XG4gICAgaWYgKHRoaXMubGl0ZXJhbENhY2hlLmhhcyhkZWNvcmF0b3IpKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXRlcmFsQ2FjaGUuZ2V0KGRlY29yYXRvcikgITtcbiAgICB9XG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5ub2RlLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAQ29tcG9uZW50IGRlY29yYXRvcmApO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSwgYERlY29yYXRvciBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gICAgfVxuXG4gICAgdGhpcy5saXRlcmFsQ2FjaGUuc2V0KGRlY29yYXRvciwgbWV0YSk7XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlRW51bVZhbHVlKFxuICAgICAgY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZW51bVN5bWJvbE5hbWU6IHN0cmluZyk6IG51bWJlcnxudWxsIHtcbiAgICBsZXQgcmVzb2x2ZWQ6IG51bWJlcnxudWxsID0gbnVsbDtcbiAgICBpZiAoY29tcG9uZW50LmhhcyhmaWVsZCkpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBjb21wb25lbnQuZ2V0KGZpZWxkKSAhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKSBhcyBhbnk7XG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbnVtVmFsdWUgJiYgaXNBbmd1bGFyQ29yZVJlZmVyZW5jZSh2YWx1ZS5lbnVtUmVmLCBlbnVtU3ltYm9sTmFtZSkpIHtcbiAgICAgICAgcmVzb2x2ZWQgPSB2YWx1ZS5yZXNvbHZlZCBhcyBudW1iZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsXG4gICAgICAgICAgICBgJHtmaWVsZH0gbXVzdCBiZSBhIG1lbWJlciBvZiAke2VudW1TeW1ib2xOYW1lfSBlbnVtIGZyb20gQGFuZ3VsYXIvY29yZWApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0U3R5bGVVcmxzKGNvbXBvbmVudDogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGV4dHJhVXJsczogc3RyaW5nW10pOlxuICAgICAgc3RyaW5nW118bnVsbCB7XG4gICAgaWYgKCFjb21wb25lbnQuaGFzKCdzdHlsZVVybHMnKSkge1xuICAgICAgcmV0dXJuIGV4dHJhVXJscy5sZW5ndGggPiAwID8gZXh0cmFVcmxzIDogbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZVVybHNFeHByID0gY29tcG9uZW50LmdldCgnc3R5bGVVcmxzJykgITtcbiAgICBjb25zdCBzdHlsZVVybHMgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShzdHlsZVVybHNFeHByKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoc3R5bGVVcmxzKSB8fCAhc3R5bGVVcmxzLmV2ZXJ5KHVybCA9PiB0eXBlb2YgdXJsID09PSAnc3RyaW5nJykpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHN0eWxlVXJsc0V4cHIsICdzdHlsZVVybHMgbXVzdCBiZSBhbiBhcnJheSBvZiBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHN0eWxlVXJscy5wdXNoKC4uLmV4dHJhVXJscyk7XG4gICAgcmV0dXJuIHN0eWxlVXJscyBhcyBzdHJpbmdbXTtcbiAgfVxuXG4gIHByaXZhdGUgX3ByZWxvYWRBbmRQYXJzZVRlbXBsYXRlKFxuICAgICAgbm9kZTogdHMuRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICAgICAgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IFByb21pc2U8UGFyc2VkVGVtcGxhdGV8bnVsbD4ge1xuICAgIGlmIChjb21wb25lbnQuaGFzKCd0ZW1wbGF0ZVVybCcpKSB7XG4gICAgICAvLyBFeHRyYWN0IHRoZSB0ZW1wbGF0ZVVybCBhbmQgcHJlbG9hZCBpdC5cbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsRXhwciA9IGNvbXBvbmVudC5nZXQoJ3RlbXBsYXRlVXJsJykgITtcbiAgICAgIGNvbnN0IHRlbXBsYXRlVXJsID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVVcmxFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgdGVtcGxhdGVVcmwgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgdGVtcGxhdGVVcmxFeHByLCAndGVtcGxhdGVVcmwgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVzb3VyY2VVcmwgPSB0aGlzLnJlc291cmNlTG9hZGVyLnJlc29sdmUodGVtcGxhdGVVcmwsIGNvbnRhaW5pbmdGaWxlKTtcbiAgICAgIGNvbnN0IHRlbXBsYXRlUHJvbWlzZSA9IHRoaXMucmVzb3VyY2VMb2FkZXIucHJlbG9hZChyZXNvdXJjZVVybCk7XG5cbiAgICAgIC8vIElmIHRoZSBwcmVsb2FkIHdvcmtlZCwgdGhlbiBhY3R1YWxseSBsb2FkIGFuZCBwYXJzZSB0aGUgdGVtcGxhdGUsIGFuZCB3YWl0IGZvciBhbnkgc3R5bGVcbiAgICAgIC8vIFVSTHMgdG8gcmVzb2x2ZS5cbiAgICAgIGlmICh0ZW1wbGF0ZVByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGVQcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHRlbXBsYXRlU3RyID0gdGhpcy5yZXNvdXJjZUxvYWRlci5sb2FkKHJlc291cmNlVXJsKTtcbiAgICAgICAgICB0aGlzLnJlc291cmNlRGVwZW5kZW5jaWVzLnJlY29yZFJlc291cmNlRGVwZW5kZW5jeShub2RlLmdldFNvdXJjZUZpbGUoKSwgcmVzb3VyY2VVcmwpO1xuICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy5fcGFyc2VUZW1wbGF0ZShcbiAgICAgICAgICAgICAgY29tcG9uZW50LCB0ZW1wbGF0ZVN0ciwgc291cmNlTWFwVXJsKHJlc291cmNlVXJsKSwgLyogdGVtcGxhdGVSYW5nZSAqLyB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIC8qIGVzY2FwZWRTdHJpbmcgKi8gZmFsc2UpO1xuICAgICAgICAgIHRoaXMucHJlYW5hbHl6ZVRlbXBsYXRlQ2FjaGUuc2V0KG5vZGUsIHRlbXBsYXRlKTtcbiAgICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaW5saW5lVGVtcGxhdGUgPSB0aGlzLl9leHRyYWN0SW5saW5lVGVtcGxhdGUoY29tcG9uZW50LCBjb250YWluaW5nRmlsZSk7XG4gICAgICBpZiAoaW5saW5lVGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLkNPTVBPTkVOVF9NSVNTSU5HX1RFTVBMQVRFLCBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgICAgICdjb21wb25lbnQgaXMgbWlzc2luZyBhIHRlbXBsYXRlJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHt0ZW1wbGF0ZVN0ciwgdGVtcGxhdGVVcmwsIGVzY2FwZWRTdHJpbmcsIHRlbXBsYXRlUmFuZ2V9ID0gaW5saW5lVGVtcGxhdGU7XG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9XG4gICAgICAgICAgdGhpcy5fcGFyc2VUZW1wbGF0ZShjb21wb25lbnQsIHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZVVybCwgdGVtcGxhdGVSYW5nZSwgZXNjYXBlZFN0cmluZyk7XG4gICAgICB0aGlzLnByZWFuYWx5emVUZW1wbGF0ZUNhY2hlLnNldChub2RlLCB0ZW1wbGF0ZSk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRlbXBsYXRlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9leHRyYWN0SW5saW5lVGVtcGxhdGUoY29tcG9uZW50OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHtcbiAgICB0ZW1wbGF0ZVN0cjogc3RyaW5nLFxuICAgIHRlbXBsYXRlVXJsOiBzdHJpbmcsXG4gICAgdGVtcGxhdGVSYW5nZTogTGV4ZXJSYW5nZXx1bmRlZmluZWQsXG4gICAgZXNjYXBlZFN0cmluZzogYm9vbGVhblxuICB9fG51bGwge1xuICAgIC8vIElmIHRoZXJlIGlzIG5vIGlubGluZSB0ZW1wbGF0ZSwgdGhlbiByZXR1cm4gbnVsbC5cbiAgICBpZiAoIWNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlJykpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCB0ZW1wbGF0ZUV4cHIgPSBjb21wb25lbnQuZ2V0KCd0ZW1wbGF0ZScpICE7XG4gICAgbGV0IHRlbXBsYXRlU3RyOiBzdHJpbmc7XG4gICAgbGV0IHRlbXBsYXRlVXJsOiBzdHJpbmcgPSAnJztcbiAgICBsZXQgdGVtcGxhdGVSYW5nZTogTGV4ZXJSYW5nZXx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGVzY2FwZWRTdHJpbmcgPSBmYWxzZTtcbiAgICAvLyBXZSBvbmx5IHN1cHBvcnQgU291cmNlTWFwcyBmb3IgaW5saW5lIHRlbXBsYXRlcyB0aGF0IGFyZSBzaW1wbGUgc3RyaW5nIGxpdGVyYWxzLlxuICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwodGVtcGxhdGVFeHByKSB8fCB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKHRlbXBsYXRlRXhwcikpIHtcbiAgICAgIC8vIHRoZSBzdGFydCBhbmQgZW5kIG9mIHRoZSBgdGVtcGxhdGVFeHByYCBub2RlIGluY2x1ZGVzIHRoZSBxdW90YXRpb24gbWFya3MsIHdoaWNoIHdlXG4gICAgICAvLyBtdXN0XG4gICAgICAvLyBzdHJpcFxuICAgICAgdGVtcGxhdGVSYW5nZSA9IGdldFRlbXBsYXRlUmFuZ2UodGVtcGxhdGVFeHByKTtcbiAgICAgIHRlbXBsYXRlU3RyID0gdGVtcGxhdGVFeHByLmdldFNvdXJjZUZpbGUoKS50ZXh0O1xuICAgICAgdGVtcGxhdGVVcmwgPSBjb250YWluaW5nRmlsZTtcbiAgICAgIGVzY2FwZWRTdHJpbmcgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCByZXNvbHZlZFRlbXBsYXRlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUodGVtcGxhdGVFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRUZW1wbGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCB0ZW1wbGF0ZUV4cHIsICd0ZW1wbGF0ZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgICB9XG4gICAgICB0ZW1wbGF0ZVN0ciA9IHJlc29sdmVkVGVtcGxhdGU7XG4gICAgfVxuICAgIHJldHVybiB7dGVtcGxhdGVTdHIsIHRlbXBsYXRlVXJsLCB0ZW1wbGF0ZVJhbmdlLCBlc2NhcGVkU3RyaW5nfTtcbiAgfVxuXG4gIHByaXZhdGUgX3BhcnNlVGVtcGxhdGUoXG4gICAgICBjb21wb25lbnQ6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCB0ZW1wbGF0ZVN0cjogc3RyaW5nLCB0ZW1wbGF0ZVVybDogc3RyaW5nLFxuICAgICAgdGVtcGxhdGVSYW5nZTogTGV4ZXJSYW5nZXx1bmRlZmluZWQsIGVzY2FwZWRTdHJpbmc6IGJvb2xlYW4sXG4gICAgICBvcHRpb25zOiBQYXJzZVRlbXBsYXRlT3B0aW9ucyA9IHt9KTogUGFyc2VkVGVtcGxhdGUge1xuICAgIGxldCBwcmVzZXJ2ZVdoaXRlc3BhY2VzOiBib29sZWFuID0gdGhpcy5kZWZhdWx0UHJlc2VydmVXaGl0ZXNwYWNlcztcbiAgICBpZiAoY29tcG9uZW50LmhhcygncHJlc2VydmVXaGl0ZXNwYWNlcycpKSB7XG4gICAgICBjb25zdCBleHByID0gY29tcG9uZW50LmdldCgncHJlc2VydmVXaGl0ZXNwYWNlcycpICE7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwciwgJ3ByZXNlcnZlV2hpdGVzcGFjZXMgbXVzdCBiZSBhIGJvb2xlYW4nKTtcbiAgICAgIH1cbiAgICAgIHByZXNlcnZlV2hpdGVzcGFjZXMgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICBsZXQgaW50ZXJwb2xhdGlvbjogSW50ZXJwb2xhdGlvbkNvbmZpZyA9IERFRkFVTFRfSU5URVJQT0xBVElPTl9DT05GSUc7XG4gICAgaWYgKGNvbXBvbmVudC5oYXMoJ2ludGVycG9sYXRpb24nKSkge1xuICAgICAgY29uc3QgZXhwciA9IGNvbXBvbmVudC5nZXQoJ2ludGVycG9sYXRpb24nKSAhO1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUubGVuZ3RoICE9PSAyIHx8XG4gICAgICAgICAgIXZhbHVlLmV2ZXJ5KGVsZW1lbnQgPT4gdHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSkge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsXG4gICAgICAgICAgICAnaW50ZXJwb2xhdGlvbiBtdXN0IGJlIGFuIGFycmF5IHdpdGggMiBlbGVtZW50cyBvZiBzdHJpbmcgdHlwZScpO1xuICAgICAgfVxuICAgICAgaW50ZXJwb2xhdGlvbiA9IEludGVycG9sYXRpb25Db25maWcuZnJvbUFycmF5KHZhbHVlIGFzW3N0cmluZywgc3RyaW5nXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGludGVycG9sYXRpb24sXG4gICAgICAuLi5wYXJzZVRlbXBsYXRlKHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZVVybCwge1xuICAgICAgICBwcmVzZXJ2ZVdoaXRlc3BhY2VzLFxuICAgICAgICBpbnRlcnBvbGF0aW9uQ29uZmlnOiBpbnRlcnBvbGF0aW9uLFxuICAgICAgICByYW5nZTogdGVtcGxhdGVSYW5nZSwgZXNjYXBlZFN0cmluZywgLi4ub3B0aW9ucyxcbiAgICAgIH0pLFxuICAgICAgaXNJbmxpbmU6IGNvbXBvbmVudC5oYXMoJ3RlbXBsYXRlJyksXG4gICAgICBmaWxlOiBuZXcgUGFyc2VTb3VyY2VGaWxlKHRlbXBsYXRlU3RyLCB0ZW1wbGF0ZVVybCksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgX2V4cHJlc3Npb25Ub0ltcG9ydGVkRmlsZShleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlfG51bGwge1xuICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBGaWd1cmUgb3V0IHdoYXQgZmlsZSBpcyBiZWluZyBpbXBvcnRlZC5cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVSZXNvbHZlci5yZXNvbHZlTW9kdWxlTmFtZShleHByLnZhbHVlLm1vZHVsZU5hbWUgISwgb3JpZ2luKTtcbiAgfVxuXG4gIHByaXZhdGUgX2lzQ3ljbGljSW1wb3J0KGV4cHI6IEV4cHJlc3Npb24sIG9yaWdpbjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGltcG9ydGVkID0gdGhpcy5fZXhwcmVzc2lvblRvSW1wb3J0ZWRGaWxlKGV4cHIsIG9yaWdpbik7XG4gICAgaWYgKGltcG9ydGVkID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgd2hldGhlciB0aGUgaW1wb3J0IGlzIGxlZ2FsLlxuICAgIHJldHVybiB0aGlzLmN5Y2xlQW5hbHl6ZXIud291bGRDcmVhdGVDeWNsZShvcmlnaW4sIGltcG9ydGVkKTtcbiAgfVxuXG4gIHByaXZhdGUgX3JlY29yZFN5bnRoZXRpY0ltcG9ydChleHByOiBFeHByZXNzaW9uLCBvcmlnaW46IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBjb25zdCBpbXBvcnRlZCA9IHRoaXMuX2V4cHJlc3Npb25Ub0ltcG9ydGVkRmlsZShleHByLCBvcmlnaW4pO1xuICAgIGlmIChpbXBvcnRlZCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY3ljbGVBbmFseXplci5yZWNvcmRTeW50aGV0aWNJbXBvcnQob3JpZ2luLCBpbXBvcnRlZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0VGVtcGxhdGVSYW5nZSh0ZW1wbGF0ZUV4cHI6IHRzLkV4cHJlc3Npb24pIHtcbiAgY29uc3Qgc3RhcnRQb3MgPSB0ZW1wbGF0ZUV4cHIuZ2V0U3RhcnQoKSArIDE7XG4gIGNvbnN0IHtsaW5lLCBjaGFyYWN0ZXJ9ID1cbiAgICAgIHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHRlbXBsYXRlRXhwci5nZXRTb3VyY2VGaWxlKCksIHN0YXJ0UG9zKTtcbiAgcmV0dXJuIHtcbiAgICBzdGFydFBvcyxcbiAgICBzdGFydExpbmU6IGxpbmUsXG4gICAgc3RhcnRDb2w6IGNoYXJhY3RlcixcbiAgICBlbmRQb3M6IHRlbXBsYXRlRXhwci5nZXRFbmQoKSAtIDEsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNvdXJjZU1hcFVybChyZXNvdXJjZVVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCF0c1NvdXJjZU1hcEJ1ZzI5MzAwRml4ZWQoKSkge1xuICAgIC8vIEJ5IHJlbW92aW5nIHRoZSB0ZW1wbGF0ZSBVUkwgd2UgYXJlIHRlbGxpbmcgdGhlIHRyYW5zbGF0b3Igbm90IHRvIHRyeSB0b1xuICAgIC8vIG1hcCB0aGUgZXh0ZXJuYWwgc291cmNlIGZpbGUgdG8gdGhlIGdlbmVyYXRlZCBjb2RlLCBzaW5jZSB0aGUgdmVyc2lvblxuICAgIC8vIG9mIFRTIHRoYXQgaXMgcnVubmluZyBkb2VzIG5vdCBzdXBwb3J0IGl0LlxuICAgIHJldHVybiAnJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmVzb3VyY2VVcmw7XG4gIH1cbn1cblxuaW50ZXJmYWNlIFBhcnNlZFRlbXBsYXRlIHtcbiAgaW50ZXJwb2xhdGlvbjogSW50ZXJwb2xhdGlvbkNvbmZpZztcbiAgZXJyb3JzPzogUGFyc2VFcnJvcltdfHVuZGVmaW5lZDtcbiAgbm9kZXM6IFRtcGxBc3ROb2RlW107XG4gIHN0eWxlVXJsczogc3RyaW5nW107XG4gIHN0eWxlczogc3RyaW5nW107XG4gIGlzSW5saW5lOiBib29sZWFuO1xuICBmaWxlOiBQYXJzZVNvdXJjZUZpbGU7XG59XG4iXX0=