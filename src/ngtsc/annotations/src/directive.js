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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/directive", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/core", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/util", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extractHostBindings = exports.queriesFromFields = exports.parseFieldArrayValue = exports.extractQueriesFromDecorator = exports.extractQueryMetadata = exports.extractDirectiveMetadata = exports.DirectiveDecoratorHandler = exports.DirectiveSymbol = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var core_1 = require("@angular/compiler/src/core");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var semantic_graph_1 = require("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/util");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_OBJECT = {};
    var FIELD_DECORATORS = [
        'Input', 'Output', 'ViewChild', 'ViewChildren', 'ContentChild', 'ContentChildren', 'HostBinding',
        'HostListener'
    ];
    var LIFECYCLE_HOOKS = new Set([
        'ngOnChanges', 'ngOnInit', 'ngOnDestroy', 'ngDoCheck', 'ngAfterViewInit', 'ngAfterViewChecked',
        'ngAfterContentInit', 'ngAfterContentChecked'
    ]);
    /**
     * Represents an Angular directive. Components are represented by `ComponentSymbol`, which inherits
     * from this symbol.
     */
    var DirectiveSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(DirectiveSymbol, _super);
        function DirectiveSymbol(decl, selector, inputs, outputs, exportAs, typeCheckMeta, typeParameters) {
            var _this = _super.call(this, decl) || this;
            _this.selector = selector;
            _this.inputs = inputs;
            _this.outputs = outputs;
            _this.exportAs = exportAs;
            _this.typeCheckMeta = typeCheckMeta;
            _this.typeParameters = typeParameters;
            _this.baseClass = null;
            return _this;
        }
        DirectiveSymbol.prototype.isPublicApiAffected = function (previousSymbol) {
            // Note: since components and directives have exactly the same items contributing to their
            // public API, it is okay for a directive to change into a component and vice versa without
            // the API being affected.
            if (!(previousSymbol instanceof DirectiveSymbol)) {
                return true;
            }
            // Directives and components have a public API of:
            //  1. Their selector.
            //  2. The binding names of their inputs and outputs; a change in ordering is also considered
            //     to be a change in public API.
            //  3. The list of exportAs names and its ordering.
            return this.selector !== previousSymbol.selector ||
                !semantic_graph_1.isArrayEqual(this.inputs.propertyNames, previousSymbol.inputs.propertyNames) ||
                !semantic_graph_1.isArrayEqual(this.outputs.propertyNames, previousSymbol.outputs.propertyNames) ||
                !semantic_graph_1.isArrayEqual(this.exportAs, previousSymbol.exportAs);
        };
        DirectiveSymbol.prototype.isTypeCheckApiAffected = function (previousSymbol) {
            // If the public API of the directive has changed, then so has its type-check API.
            if (this.isPublicApiAffected(previousSymbol)) {
                return true;
            }
            if (!(previousSymbol instanceof DirectiveSymbol)) {
                return true;
            }
            // The type-check block also depends on the class property names, as writes property bindings
            // directly into the backing fields.
            if (!semantic_graph_1.isArrayEqual(Array.from(this.inputs), Array.from(previousSymbol.inputs), isInputMappingEqual) ||
                !semantic_graph_1.isArrayEqual(Array.from(this.outputs), Array.from(previousSymbol.outputs), isInputMappingEqual)) {
                return true;
            }
            // The type parameters of a directive are emitted into the type constructors in the type-check
            // block of a component, so if the type parameters are not considered equal then consider the
            // type-check API of this directive to be affected.
            if (!semantic_graph_1.areTypeParametersEqual(this.typeParameters, previousSymbol.typeParameters)) {
                return true;
            }
            // The type-check metadata is used during TCB code generation, so any changes should invalidate
            // prior type-check files.
            if (!isTypeCheckMetaEqual(this.typeCheckMeta, previousSymbol.typeCheckMeta)) {
                return true;
            }
            // Changing the base class of a directive means that its inputs/outputs etc may have changed,
            // so the type-check block of components that use this directive needs to be regenerated.
            if (!isBaseClassEqual(this.baseClass, previousSymbol.baseClass)) {
                return true;
            }
            return false;
        };
        return DirectiveSymbol;
    }(semantic_graph_1.SemanticSymbol));
    exports.DirectiveSymbol = DirectiveSymbol;
    function isInputMappingEqual(current, previous) {
        return current[0] === previous[0] && current[1] === previous[1];
    }
    function isTypeCheckMetaEqual(current, previous) {
        if (current.hasNgTemplateContextGuard !== previous.hasNgTemplateContextGuard) {
            return false;
        }
        if (current.isGeneric !== previous.isGeneric) {
            // Note: changes in the number of type parameters is also considered in `areTypeParametersEqual`
            // so this check is technically not needed; it is done anyway for completeness in terms of
            // whether the `DirectiveTypeCheckMeta` struct itself compares equal or not.
            return false;
        }
        if (!semantic_graph_1.isArrayEqual(current.ngTemplateGuards, previous.ngTemplateGuards, isTemplateGuardEqual)) {
            return false;
        }
        if (!semantic_graph_1.isSetEqual(current.coercedInputFields, previous.coercedInputFields)) {
            return false;
        }
        if (!semantic_graph_1.isSetEqual(current.restrictedInputFields, previous.restrictedInputFields)) {
            return false;
        }
        if (!semantic_graph_1.isSetEqual(current.stringLiteralInputFields, previous.stringLiteralInputFields)) {
            return false;
        }
        if (!semantic_graph_1.isSetEqual(current.undeclaredInputFields, previous.undeclaredInputFields)) {
            return false;
        }
        return true;
    }
    function isTemplateGuardEqual(current, previous) {
        return current.inputName === previous.inputName && current.type === previous.type;
    }
    function isBaseClassEqual(current, previous) {
        if (current === null || previous === null) {
            return current === previous;
        }
        return semantic_graph_1.isSymbolEqual(current, previous);
    }
    var DirectiveDecoratorHandler = /** @class */ (function () {
        function DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, injectableRegistry, isCore, semanticDepGraphUpdater, annotateForClosureCompiler, compileUndecoratedClassesWithAngularFeatures, perf) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaRegistry = metaRegistry;
            this.scopeRegistry = scopeRegistry;
            this.metaReader = metaReader;
            this.injectableRegistry = injectableRegistry;
            this.isCore = isCore;
            this.semanticDepGraphUpdater = semanticDepGraphUpdater;
            this.annotateForClosureCompiler = annotateForClosureCompiler;
            this.compileUndecoratedClassesWithAngularFeatures = compileUndecoratedClassesWithAngularFeatures;
            this.perf = perf;
            this.precedence = transform_1.HandlerPrecedence.PRIMARY;
            this.name = DirectiveDecoratorHandler.name;
        }
        DirectiveDecoratorHandler.prototype.detect = function (node, decorators) {
            // If a class is undecorated but uses Angular features, we detect it as an
            // abstract directive. This is an unsupported pattern as of v10, but we want
            // to still detect these patterns so that we can report diagnostics, or compile
            // them for backwards compatibility in ngcc.
            if (!decorators) {
                var angularField = this.findClassFieldWithAngularFeatures(node);
                return angularField ? { trigger: angularField.node, decorator: null, metadata: null } :
                    undefined;
            }
            else {
                var decorator = util_2.findAngularDecorator(decorators, 'Directive', this.isCore);
                return decorator ? { trigger: decorator.node, decorator: decorator, metadata: decorator } : undefined;
            }
        };
        DirectiveDecoratorHandler.prototype.analyze = function (node, decorator, flags) {
            if (flags === void 0) { flags = transform_1.HandlerFlags.NONE; }
            // Skip processing of the class declaration if compilation of undecorated classes
            // with Angular features is disabled. Previously in ngtsc, such classes have always
            // been processed, but we want to enforce a consistent decorator mental model.
            // See: https://v9.angular.io/guide/migration-undecorated-classes.
            if (this.compileUndecoratedClassesWithAngularFeatures === false && decorator === null) {
                return { diagnostics: [diagnostics_2.getUndecoratedClassWithAngularFeaturesDiagnostic(node)] };
            }
            this.perf.eventCount(perf_1.PerfEvent.AnalyzeDirective);
            var directiveResult = extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.isCore, flags, this.annotateForClosureCompiler);
            if (directiveResult === undefined) {
                return {};
            }
            var analysis = directiveResult.metadata;
            var providersRequiringFactory = null;
            if (directiveResult !== undefined && directiveResult.decorator.has('providers')) {
                providersRequiringFactory = util_2.resolveProvidersRequiringFactory(directiveResult.decorator.get('providers'), this.reflector, this.evaluator);
            }
            return {
                analysis: {
                    inputs: directiveResult.inputs,
                    outputs: directiveResult.outputs,
                    meta: analysis,
                    classMetadata: metadata_2.extractClassMetadata(node, this.reflector, this.isCore, this.annotateForClosureCompiler),
                    baseClass: util_2.readBaseClass(node, this.reflector, this.evaluator),
                    typeCheckMeta: util_1.extractDirectiveTypeCheckMeta(node, directiveResult.inputs, this.reflector),
                    providersRequiringFactory: providersRequiringFactory,
                    isPoisoned: false,
                    isStructural: directiveResult.isStructural,
                }
            };
        };
        DirectiveDecoratorHandler.prototype.symbol = function (node, analysis) {
            var typeParameters = semantic_graph_1.extractSemanticTypeParameters(node);
            return new DirectiveSymbol(node, analysis.meta.selector, analysis.inputs, analysis.outputs, analysis.meta.exportAs, analysis.typeCheckMeta, typeParameters);
        };
        DirectiveDecoratorHandler.prototype.register = function (node, analysis) {
            // Register this directive's information with the `MetadataRegistry`. This ensures that
            // the information about the directive is available during the compile() phase.
            var ref = new imports_1.Reference(node);
            this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign(tslib_1.__assign({ type: metadata_1.MetaType.Directive, ref: ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.meta.queries.map(function (query) { return query.propertyName; }), isComponent: false, baseClass: analysis.baseClass }, analysis.typeCheckMeta), { isPoisoned: analysis.isPoisoned, isStructural: analysis.isStructural }));
            this.injectableRegistry.registerInjectable(node);
        };
        DirectiveDecoratorHandler.prototype.resolve = function (node, analysis, symbol) {
            if (this.semanticDepGraphUpdater !== null && analysis.baseClass instanceof imports_1.Reference) {
                symbol.baseClass = this.semanticDepGraphUpdater.getSymbol(analysis.baseClass.node);
            }
            var diagnostics = [];
            if (analysis.providersRequiringFactory !== null &&
                analysis.meta.providers instanceof compiler_1.WrappedNodeExpr) {
                var providerDiagnostics = diagnostics_2.getProviderDiagnostics(analysis.providersRequiringFactory, analysis.meta.providers.node, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(providerDiagnostics)));
            }
            var directiveDiagnostics = diagnostics_2.getDirectiveDiagnostics(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, 'Directive');
            if (directiveDiagnostics !== null) {
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(directiveDiagnostics)));
            }
            return { diagnostics: diagnostics.length > 0 ? diagnostics : undefined };
        };
        DirectiveDecoratorHandler.prototype.compileFull = function (node, analysis, resolution, pool) {
            var fac = factory_1.compileNgFactoryDefField(util_2.toFactoryMetadata(analysis.meta, compiler_1.FactoryTarget.Directive));
            var def = compiler_1.compileDirectiveFromMetadata(analysis.meta, pool, compiler_1.makeBindingParser());
            var classMetadata = analysis.classMetadata !== null ?
                compiler_1.compileClassMetadata(analysis.classMetadata).toStmt() :
                null;
            return util_2.compileResults(fac, def, classMetadata, 'ɵdir');
        };
        DirectiveDecoratorHandler.prototype.compilePartial = function (node, analysis, resolution) {
            var fac = factory_1.compileDeclareFactory(util_2.toFactoryMetadata(analysis.meta, compiler_1.FactoryTarget.Directive));
            var def = compiler_1.compileDeclareDirectiveFromMetadata(analysis.meta);
            var classMetadata = analysis.classMetadata !== null ?
                compiler_1.compileDeclareClassMetadata(analysis.classMetadata).toStmt() :
                null;
            return util_2.compileResults(fac, def, classMetadata, 'ɵdir');
        };
        /**
         * Checks if a given class uses Angular features and returns the TypeScript node
         * that indicated the usage. Classes are considered using Angular features if they
         * contain class members that are either decorated with a known Angular decorator,
         * or if they correspond to a known Angular lifecycle hook.
         */
        DirectiveDecoratorHandler.prototype.findClassFieldWithAngularFeatures = function (node) {
            var _this = this;
            return this.reflector.getMembersOfClass(node).find(function (member) {
                if (!member.isStatic && member.kind === reflection_1.ClassMemberKind.Method &&
                    LIFECYCLE_HOOKS.has(member.name)) {
                    return true;
                }
                if (member.decorators) {
                    return member.decorators.some(function (decorator) { return FIELD_DECORATORS.some(function (decoratorName) { return util_2.isAngularDecorator(decorator, decoratorName, _this.isCore); }); });
                }
                return false;
            });
        };
        return DirectiveDecoratorHandler;
    }());
    exports.DirectiveDecoratorHandler = DirectiveDecoratorHandler;
    /**
     * Helper function to extract metadata from a `Directive` or `Component`. `Directive`s without a
     * selector are allowed to be used for abstract base classes. These abstract directives should not
     * appear in the declarations of an `NgModule` and additional verification is done when processing
     * the module.
     */
    function extractDirectiveMetadata(clazz, decorator, reflector, evaluator, isCore, flags, annotateForClosureCompiler, defaultSelector) {
        if (defaultSelector === void 0) { defaultSelector = null; }
        var directive;
        if (decorator === null || decorator.args === null || decorator.args.length === 0) {
            directive = new Map();
        }
        else if (decorator.args.length !== 1) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(decorator), "Incorrect number of arguments to @" + decorator.name + " decorator");
        }
        else {
            var meta = util_2.unwrapExpression(decorator.args[0]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, "@" + decorator.name + " argument must be an object literal");
            }
            directive = reflection_1.reflectObjectLiteral(meta);
        }
        if (directive.has('jit')) {
            // The only allowed value is true, so there's no need to expand further.
            return undefined;
        }
        var members = reflector.getMembersOfClass(clazz);
        // Precompute a list of ts.ClassElements that have decorators. This includes things like @Input,
        // @Output, @HostBinding, etc.
        var decoratedElements = members.filter(function (member) { return !member.isStatic && member.decorators !== null; });
        var coreModule = isCore ? undefined : '@angular/core';
        // Construct the map of inputs both from the @Directive/@Component
        // decorator, and the decorated
        // fields.
        var inputsFromMeta = parseFieldToPropertyMapping(directive, 'inputs', evaluator);
        var inputsFromFields = parseDecoratedFields(reflection_1.filterToMembersWithDecorator(decoratedElements, 'Input', coreModule), evaluator, resolveInput);
        // And outputs.
        var outputsFromMeta = parseFieldToPropertyMapping(directive, 'outputs', evaluator);
        var outputsFromFields = parseDecoratedFields(reflection_1.filterToMembersWithDecorator(decoratedElements, 'Output', coreModule), evaluator, resolveOutput);
        // Construct the list of queries.
        var contentChildFromFields = queriesFromFields(reflection_1.filterToMembersWithDecorator(decoratedElements, 'ContentChild', coreModule), reflector, evaluator);
        var contentChildrenFromFields = queriesFromFields(reflection_1.filterToMembersWithDecorator(decoratedElements, 'ContentChildren', coreModule), reflector, evaluator);
        var queries = tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(contentChildFromFields)), tslib_1.__read(contentChildrenFromFields));
        // Construct the list of view queries.
        var viewChildFromFields = queriesFromFields(reflection_1.filterToMembersWithDecorator(decoratedElements, 'ViewChild', coreModule), reflector, evaluator);
        var viewChildrenFromFields = queriesFromFields(reflection_1.filterToMembersWithDecorator(decoratedElements, 'ViewChildren', coreModule), reflector, evaluator);
        var viewQueries = tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(viewChildFromFields)), tslib_1.__read(viewChildrenFromFields));
        if (directive.has('queries')) {
            var queriesFromDecorator = extractQueriesFromDecorator(directive.get('queries'), reflector, evaluator, isCore);
            queries.push.apply(queries, tslib_1.__spreadArray([], tslib_1.__read(queriesFromDecorator.content)));
            viewQueries.push.apply(viewQueries, tslib_1.__spreadArray([], tslib_1.__read(queriesFromDecorator.view)));
        }
        // Parse the selector.
        var selector = defaultSelector;
        if (directive.has('selector')) {
            var expr = directive.get('selector');
            var resolved = evaluator.evaluate(expr);
            if (typeof resolved !== 'string') {
                throw diagnostics_2.createValueHasWrongTypeError(expr, resolved, "selector must be a string");
            }
            // use default selector in case selector is an empty string
            selector = resolved === '' ? defaultSelector : resolved;
            if (!selector) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DIRECTIVE_MISSING_SELECTOR, expr, "Directive " + clazz.name.text + " has no selector, please add it!");
            }
        }
        var host = extractHostBindings(decoratedElements, evaluator, coreModule, directive);
        var providers = directive.has('providers') ?
            new compiler_1.WrappedNodeExpr(annotateForClosureCompiler ?
                util_2.wrapFunctionExpressionsInParens(directive.get('providers')) :
                directive.get('providers')) :
            null;
        // Determine if `ngOnChanges` is a lifecycle hook defined on the component.
        var usesOnChanges = members.some(function (member) { return !member.isStatic && member.kind === reflection_1.ClassMemberKind.Method &&
            member.name === 'ngOnChanges'; });
        // Parse exportAs.
        var exportAs = null;
        if (directive.has('exportAs')) {
            var expr = directive.get('exportAs');
            var resolved = evaluator.evaluate(expr);
            if (typeof resolved !== 'string') {
                throw diagnostics_2.createValueHasWrongTypeError(expr, resolved, "exportAs must be a string");
            }
            exportAs = resolved.split(',').map(function (part) { return part.trim(); });
        }
        var rawCtorDeps = util_2.getConstructorDependencies(clazz, reflector, isCore);
        // Non-abstract directives (those with a selector) require valid constructor dependencies, whereas
        // abstract directives are allowed to have invalid dependencies, given that a subclass may call
        // the constructor explicitly.
        var ctorDeps = selector !== null ? util_2.validateConstructorDependencies(clazz, rawCtorDeps) :
            util_2.unwrapConstructorDependencies(rawCtorDeps);
        // Structural directives must have a `TemplateRef` dependency.
        var isStructural = ctorDeps !== null && ctorDeps !== 'invalid' &&
            ctorDeps.some(function (dep) { return (dep.token instanceof compiler_1.ExternalExpr) &&
                dep.token.value.moduleName === '@angular/core' &&
                dep.token.value.name === 'TemplateRef'; });
        // Detect if the component inherits from another class
        var usesInheritance = reflector.hasBaseClass(clazz);
        var type = util_2.wrapTypeReference(reflector, clazz);
        var internalType = new compiler_1.WrappedNodeExpr(reflector.getInternalNameOfClass(clazz));
        var inputs = metadata_1.ClassPropertyMapping.fromMappedObject(tslib_1.__assign(tslib_1.__assign({}, inputsFromMeta), inputsFromFields));
        var outputs = metadata_1.ClassPropertyMapping.fromMappedObject(tslib_1.__assign(tslib_1.__assign({}, outputsFromMeta), outputsFromFields));
        var metadata = {
            name: clazz.name.text,
            deps: ctorDeps,
            host: host,
            lifecycle: {
                usesOnChanges: usesOnChanges,
            },
            inputs: inputs.toJointMappedObject(),
            outputs: outputs.toDirectMappedObject(),
            queries: queries,
            viewQueries: viewQueries,
            selector: selector,
            fullInheritance: !!(flags & transform_1.HandlerFlags.FULL_INHERITANCE),
            type: type,
            internalType: internalType,
            typeArgumentCount: reflector.getGenericArityOfClass(clazz) || 0,
            typeSourceSpan: util_2.createSourceSpan(clazz.name),
            usesInheritance: usesInheritance,
            exportAs: exportAs,
            providers: providers
        };
        return {
            decorator: directive,
            metadata: metadata,
            inputs: inputs,
            outputs: outputs,
            isStructural: isStructural,
        };
    }
    exports.extractDirectiveMetadata = extractDirectiveMetadata;
    function extractQueryMetadata(exprNode, name, args, propertyName, reflector, evaluator) {
        if (args.length === 0) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, exprNode, "@" + name + " must have arguments");
        }
        var first = name === 'ViewChild' || name === 'ContentChild';
        var forwardReferenceTarget = util_2.tryUnwrapForwardRef(args[0], reflector);
        var node = forwardReferenceTarget !== null && forwardReferenceTarget !== void 0 ? forwardReferenceTarget : args[0];
        var arg = evaluator.evaluate(node);
        /** Whether or not this query should collect only static results (see view/api.ts)  */
        var isStatic = false;
        // Extract the predicate
        var predicate = null;
        if (arg instanceof imports_1.Reference || arg instanceof partial_evaluator_1.DynamicValue) {
            // References and predicates that could not be evaluated statically are emitted as is.
            predicate = compiler_1.createMayBeForwardRefExpression(new compiler_1.WrappedNodeExpr(node), forwardReferenceTarget !== null ? 2 /* Unwrapped */ : 0 /* None */);
        }
        else if (typeof arg === 'string') {
            predicate = [arg];
        }
        else if (isStringArrayOrDie(arg, "@" + name + " predicate", node)) {
            predicate = arg;
        }
        else {
            throw diagnostics_2.createValueHasWrongTypeError(node, arg, "@" + name + " predicate cannot be interpreted");
        }
        // Extract the read and descendants options.
        var read = null;
        // The default value for descendants is true for every decorator except @ContentChildren.
        var descendants = name !== 'ContentChildren';
        var emitDistinctChangesOnly = core_1.emitDistinctChangesOnlyDefaultValue;
        if (args.length === 2) {
            var optionsExpr = util_2.unwrapExpression(args[1]);
            if (!ts.isObjectLiteralExpression(optionsExpr)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, optionsExpr, "@" + name + " options must be an object literal");
            }
            var options = reflection_1.reflectObjectLiteral(optionsExpr);
            if (options.has('read')) {
                read = new compiler_1.WrappedNodeExpr(options.get('read'));
            }
            if (options.has('descendants')) {
                var descendantsExpr = options.get('descendants');
                var descendantsValue = evaluator.evaluate(descendantsExpr);
                if (typeof descendantsValue !== 'boolean') {
                    throw diagnostics_2.createValueHasWrongTypeError(descendantsExpr, descendantsValue, "@" + name + " options.descendants must be a boolean");
                }
                descendants = descendantsValue;
            }
            if (options.has('emitDistinctChangesOnly')) {
                var emitDistinctChangesOnlyExpr = options.get('emitDistinctChangesOnly');
                var emitDistinctChangesOnlyValue = evaluator.evaluate(emitDistinctChangesOnlyExpr);
                if (typeof emitDistinctChangesOnlyValue !== 'boolean') {
                    throw diagnostics_2.createValueHasWrongTypeError(emitDistinctChangesOnlyExpr, emitDistinctChangesOnlyValue, "@" + name + " options.emitDistinctChangesOnly must be a boolean");
                }
                emitDistinctChangesOnly = emitDistinctChangesOnlyValue;
            }
            if (options.has('static')) {
                var staticValue = evaluator.evaluate(options.get('static'));
                if (typeof staticValue !== 'boolean') {
                    throw diagnostics_2.createValueHasWrongTypeError(node, staticValue, "@" + name + " options.static must be a boolean");
                }
                isStatic = staticValue;
            }
        }
        else if (args.length > 2) {
            // Too many arguments.
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, node, "@" + name + " has too many arguments");
        }
        return {
            propertyName: propertyName,
            predicate: predicate,
            first: first,
            descendants: descendants,
            read: read,
            static: isStatic,
            emitDistinctChangesOnly: emitDistinctChangesOnly,
        };
    }
    exports.extractQueryMetadata = extractQueryMetadata;
    function extractQueriesFromDecorator(queryData, reflector, evaluator, isCore) {
        var content = [], view = [];
        if (!ts.isObjectLiteralExpression(queryData)) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, 'Decorator queries metadata must be an object literal');
        }
        reflection_1.reflectObjectLiteral(queryData).forEach(function (queryExpr, propertyName) {
            queryExpr = util_2.unwrapExpression(queryExpr);
            if (!ts.isNewExpression(queryExpr)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, 'Decorator query metadata must be an instance of a query type');
            }
            var queryType = ts.isPropertyAccessExpression(queryExpr.expression) ?
                queryExpr.expression.name :
                queryExpr.expression;
            if (!ts.isIdentifier(queryType)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, 'Decorator query metadata must be an instance of a query type');
            }
            var type = reflector.getImportOfIdentifier(queryType);
            if (type === null || (!isCore && type.from !== '@angular/core') ||
                !QUERY_TYPES.has(type.name)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, queryData, 'Decorator query metadata must be an instance of a query type');
            }
            var query = extractQueryMetadata(queryExpr, type.name, queryExpr.arguments || [], propertyName, reflector, evaluator);
            if (type.name.startsWith('Content')) {
                content.push(query);
            }
            else {
                view.push(query);
            }
        });
        return { content: content, view: view };
    }
    exports.extractQueriesFromDecorator = extractQueriesFromDecorator;
    function isStringArrayOrDie(value, name, node) {
        if (!Array.isArray(value)) {
            return false;
        }
        for (var i = 0; i < value.length; i++) {
            if (typeof value[i] !== 'string') {
                throw diagnostics_2.createValueHasWrongTypeError(node, value[i], "Failed to resolve " + name + " at position " + i + " to a string");
            }
        }
        return true;
    }
    function parseFieldArrayValue(directive, field, evaluator) {
        if (!directive.has(field)) {
            return null;
        }
        // Resolve the field of interest from the directive metadata to a string[].
        var expression = directive.get(field);
        var value = evaluator.evaluate(expression);
        if (!isStringArrayOrDie(value, field, expression)) {
            throw diagnostics_2.createValueHasWrongTypeError(expression, value, "Failed to resolve @Directive." + field + " to a string array");
        }
        return value;
    }
    exports.parseFieldArrayValue = parseFieldArrayValue;
    /**
     * Interpret property mapping fields on the decorator (e.g. inputs or outputs) and return the
     * correctly shaped metadata object.
     */
    function parseFieldToPropertyMapping(directive, field, evaluator) {
        var metaValues = parseFieldArrayValue(directive, field, evaluator);
        if (!metaValues) {
            return EMPTY_OBJECT;
        }
        return metaValues.reduce(function (results, value) {
            // Either the value is 'field' or 'field: property'. In the first case, `property` will
            // be undefined, in which case the field name should also be used as the property name.
            var _a = tslib_1.__read(value.split(':', 2).map(function (str) { return str.trim(); }), 2), field = _a[0], property = _a[1];
            results[field] = property || field;
            return results;
        }, {});
    }
    /**
     * Parse property decorators (e.g. `Input` or `Output`) and return the correctly shaped metadata
     * object.
     */
    function parseDecoratedFields(fields, evaluator, mapValueResolver) {
        return fields.reduce(function (results, field) {
            var fieldName = field.member.name;
            field.decorators.forEach(function (decorator) {
                // The decorator either doesn't have an argument (@Input()) in which case the property
                // name is used, or it has one argument (@Output('named')).
                if (decorator.args == null || decorator.args.length === 0) {
                    results[fieldName] = fieldName;
                }
                else if (decorator.args.length === 1) {
                    var property = evaluator.evaluate(decorator.args[0]);
                    if (typeof property !== 'string') {
                        throw diagnostics_2.createValueHasWrongTypeError(reflection_1.Decorator.nodeForError(decorator), property, "@" + decorator.name + " decorator argument must resolve to a string");
                    }
                    results[fieldName] = mapValueResolver(property, fieldName);
                }
                else {
                    // Too many arguments.
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(decorator), "@" + decorator.name + " can have at most one argument, got " + decorator.args.length + " argument(s)");
                }
            });
            return results;
        }, {});
    }
    function resolveInput(publicName, internalName) {
        return [publicName, internalName];
    }
    function resolveOutput(publicName, internalName) {
        return publicName;
    }
    function queriesFromFields(fields, reflector, evaluator) {
        return fields.map(function (_a) {
            var member = _a.member, decorators = _a.decorators;
            var decorator = decorators[0];
            var node = member.node || reflection_1.Decorator.nodeForError(decorator);
            // Throw in case of `@Input() @ContentChild('foo') foo: any`, which is not supported in Ivy
            if (member.decorators.some(function (v) { return v.name === 'Input'; })) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_COLLISION, node, 'Cannot combine @Input decorators with query decorators');
            }
            if (decorators.length !== 1) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_COLLISION, node, 'Cannot have multiple query decorators on the same class member');
            }
            else if (!isPropertyTypeMember(member)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_UNEXPECTED, node, 'Query decorator must go on a property-type member');
            }
            return extractQueryMetadata(node, decorator.name, decorator.args || [], member.name, reflector, evaluator);
        });
    }
    exports.queriesFromFields = queriesFromFields;
    function isPropertyTypeMember(member) {
        return member.kind === reflection_1.ClassMemberKind.Getter || member.kind === reflection_1.ClassMemberKind.Setter ||
            member.kind === reflection_1.ClassMemberKind.Property;
    }
    function evaluateHostExpressionBindings(hostExpr, evaluator) {
        var hostMetaMap = evaluator.evaluate(hostExpr);
        if (!(hostMetaMap instanceof Map)) {
            throw diagnostics_2.createValueHasWrongTypeError(hostExpr, hostMetaMap, "Decorator host metadata must be an object");
        }
        var hostMetadata = {};
        hostMetaMap.forEach(function (value, key) {
            // Resolve Enum references to their declared value.
            if (value instanceof partial_evaluator_1.EnumValue) {
                value = value.resolved;
            }
            if (typeof key !== 'string') {
                throw diagnostics_2.createValueHasWrongTypeError(hostExpr, key, "Decorator host metadata must be a string -> string object, but found unparseable key");
            }
            if (typeof value == 'string') {
                hostMetadata[key] = value;
            }
            else if (value instanceof partial_evaluator_1.DynamicValue) {
                hostMetadata[key] = new compiler_1.WrappedNodeExpr(value.node);
            }
            else {
                throw diagnostics_2.createValueHasWrongTypeError(hostExpr, value, "Decorator host metadata must be a string -> string object, but found unparseable value");
            }
        });
        var bindings = compiler_1.parseHostBindings(hostMetadata);
        var errors = compiler_1.verifyHostBindings(bindings, util_2.createSourceSpan(hostExpr));
        if (errors.length > 0) {
            throw new diagnostics_1.FatalDiagnosticError(
            // TODO: provide more granular diagnostic and output specific host expression that
            // triggered an error instead of the whole host object.
            diagnostics_1.ErrorCode.HOST_BINDING_PARSE_ERROR, hostExpr, errors.map(function (error) { return error.msg; }).join('\n'));
        }
        return bindings;
    }
    function extractHostBindings(members, evaluator, coreModule, metadata) {
        var bindings;
        if (metadata && metadata.has('host')) {
            bindings = evaluateHostExpressionBindings(metadata.get('host'), evaluator);
        }
        else {
            bindings = compiler_1.parseHostBindings({});
        }
        reflection_1.filterToMembersWithDecorator(members, 'HostBinding', coreModule)
            .forEach(function (_a) {
            var member = _a.member, decorators = _a.decorators;
            decorators.forEach(function (decorator) {
                var hostPropertyName = member.name;
                if (decorator.args !== null && decorator.args.length > 0) {
                    if (decorator.args.length !== 1) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(decorator), "@HostBinding can have at most one argument, got " + decorator.args.length + " argument(s)");
                    }
                    var resolved = evaluator.evaluate(decorator.args[0]);
                    if (typeof resolved !== 'string') {
                        throw diagnostics_2.createValueHasWrongTypeError(reflection_1.Decorator.nodeForError(decorator), resolved, "@HostBinding's argument must be a string");
                    }
                    hostPropertyName = resolved;
                }
                // Since this is a decorator, we know that the value is a class member. Always access it
                // through `this` so that further down the line it can't be confused for a literal value
                // (e.g. if there's a property called `true`). There is no size penalty, because all
                // values (except literals) are converted to `ctx.propName` eventually.
                bindings.properties[hostPropertyName] = compiler_1.getSafePropertyAccessString('this', member.name);
            });
        });
        reflection_1.filterToMembersWithDecorator(members, 'HostListener', coreModule)
            .forEach(function (_a) {
            var member = _a.member, decorators = _a.decorators;
            decorators.forEach(function (decorator) {
                var eventName = member.name;
                var args = [];
                if (decorator.args !== null && decorator.args.length > 0) {
                    if (decorator.args.length > 2) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.args[2], "@HostListener can have at most two arguments");
                    }
                    var resolved = evaluator.evaluate(decorator.args[0]);
                    if (typeof resolved !== 'string') {
                        throw diagnostics_2.createValueHasWrongTypeError(decorator.args[0], resolved, "@HostListener's event name argument must be a string");
                    }
                    eventName = resolved;
                    if (decorator.args.length === 2) {
                        var expression = decorator.args[1];
                        var resolvedArgs = evaluator.evaluate(decorator.args[1]);
                        if (!isStringArrayOrDie(resolvedArgs, '@HostListener.args', expression)) {
                            throw diagnostics_2.createValueHasWrongTypeError(decorator.args[1], resolvedArgs, "@HostListener's second argument must be a string array");
                        }
                        args = resolvedArgs;
                    }
                }
                bindings.listeners[eventName] = member.name + "(" + args.join(',') + ")";
            });
        });
        return bindings;
    }
    exports.extractHostBindings = extractHostBindings;
    var QUERY_TYPES = new Set([
        'ContentChild',
        'ContentChildren',
        'ViewChild',
        'ViewChildren',
    ]);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBMmY7SUFDM2YsbURBQStFO0lBQy9FLCtCQUFpQztJQUVqQywyRUFBa0U7SUFDbEUsbUVBQXdDO0lBQ3hDLDZGQUFnTjtJQUNoTixxRUFBNE07SUFDNU0sMEVBQXNFO0lBQ3RFLHVGQUFrRjtJQUNsRiw2REFBbUQ7SUFDbkQseUVBQStKO0lBRS9KLHVFQUE4STtJQUU5SSwyRkFBOEo7SUFDOUosbUZBQTBFO0lBQzFFLHFGQUFnRDtJQUNoRCw2RUFBNlY7SUFFN1YsSUFBTSxZQUFZLEdBQTRCLEVBQUUsQ0FBQztJQUNqRCxJQUFNLGdCQUFnQixHQUFHO1FBQ3ZCLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsYUFBYTtRQUNoRyxjQUFjO0tBQ2YsQ0FBQztJQUNGLElBQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDO1FBQzlCLGFBQWEsRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0I7UUFDOUYsb0JBQW9CLEVBQUUsdUJBQXVCO0tBQzlDLENBQUMsQ0FBQztJQWNIOzs7T0FHRztJQUNIO1FBQXFDLDJDQUFjO1FBR2pELHlCQUNJLElBQXNCLEVBQWtCLFFBQXFCLEVBQzdDLE1BQTRCLEVBQWtCLE9BQTZCLEVBQzNFLFFBQXVCLEVBQ3ZCLGFBQXFDLEVBQ3JDLGNBQTRDO1lBTGhFLFlBTUUsa0JBQU0sSUFBSSxDQUFDLFNBQ1o7WUFOMkMsY0FBUSxHQUFSLFFBQVEsQ0FBYTtZQUM3QyxZQUFNLEdBQU4sTUFBTSxD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RUFBRSxZQUFZLEVBQy9CLHdEQUF3RCxDQUFDLENBQUM7eUJBQy9EO3dCQUNELElBQUksR0FBRyxZQUFZLENBQUM7cUJBQ3JCO2lCQUNGO2dCQUVELFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQU0sTUFBTSxDQUFDLElBQUksU0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFHLENBQUM7WUFDdEUsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNQLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUE3RUQsa0RBNkVDO0lBRUQsSUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDMUIsY0FBYztRQUNkLGlCQUFpQjtRQUNqQixXQUFXO1FBQ1gsY0FBYztLQUNmLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbXBpbGVDbGFzc01ldGFkYXRhLCBjb21waWxlRGVjbGFyZUNsYXNzTWV0YWRhdGEsIGNvbXBpbGVEZWNsYXJlRGlyZWN0aXZlRnJvbU1ldGFkYXRhLCBjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhLCBDb25zdGFudFBvb2wsIGNyZWF0ZU1heUJlRm9yd2FyZFJlZkV4cHJlc3Npb24sIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgRmFjdG9yeVRhcmdldCwgRm9yd2FyZFJlZkhhbmRsaW5nLCBnZXRTYWZlUHJvcGVydHlBY2Nlc3NTdHJpbmcsIG1ha2VCaW5kaW5nUGFyc2VyLCBNYXliZUZvcndhcmRSZWZFeHByZXNzaW9uLCBQYXJzZWRIb3N0QmluZGluZ3MsIFBhcnNlRXJyb3IsIHBhcnNlSG9zdEJpbmRpbmdzLCBSM0NsYXNzTWV0YWRhdGEsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFIzRmFjdG9yeU1ldGFkYXRhLCBSM1F1ZXJ5TWV0YWRhdGEsIFN0YXRlbWVudCwgdmVyaWZ5SG9zdEJpbmRpbmdzLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7ZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlEZWZhdWx0VmFsdWV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jb3JlJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7YXJlVHlwZVBhcmFtZXRlcnNFcXVhbCwgZXh0cmFjdFNlbWFudGljVHlwZVBhcmFtZXRlcnMsIGlzQXJyYXlFcXVhbCwgaXNTZXRFcXVhbCwgaXNTeW1ib2xFcXVhbCwgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIsIFNlbWFudGljU3ltYm9sLCBTZW1hbnRpY1R5cGVQYXJhbWV0ZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7QmluZGluZ1Byb3BlcnR5TmFtZSwgQ2xhc3NQcm9wZXJ0eU1hcHBpbmcsIENsYXNzUHJvcGVydHlOYW1lLCBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnksIE1ldGFUeXBlLCBUZW1wbGF0ZUd1YXJkTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEvc3JjL3V0aWwnO1xuaW1wb3J0IHtEeW5hbWljVmFsdWUsIEVudW1WYWx1ZSwgUGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtQZXJmRXZlbnQsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIERlY29yYXRvciwgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJGbGFncywgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Y3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvciwgZ2V0RGlyZWN0aXZlRGlhZ25vc3RpY3MsIGdldFByb3ZpZGVyRGlhZ25vc3RpY3MsIGdldFVuZGVjb3JhdGVkQ2xhc3NXaXRoQW5ndWxhckZlYXR1cmVzRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2NvbXBpbGVEZWNsYXJlRmFjdG9yeSwgY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkfSBmcm9tICcuL2ZhY3RvcnknO1xuaW1wb3J0IHtleHRyYWN0Q2xhc3NNZXRhZGF0YX0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge2NvbXBpbGVSZXN1bHRzLCBjcmVhdGVTb3VyY2VTcGFuLCBmaW5kQW5ndWxhckRlY29yYXRvciwgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIGlzQW5ndWxhckRlY29yYXRvciwgcmVhZEJhc2VDbGFzcywgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIHRvRmFjdG9yeU1ldGFkYXRhLCB0cnlVbndyYXBGb3J3YXJkUmVmLCB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgdW53cmFwRXhwcmVzc2lvbiwgdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucywgd3JhcFR5cGVSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX09CSkVDVDoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbmNvbnN0IEZJRUxEX0RFQ09SQVRPUlMgPSBbXG4gICdJbnB1dCcsICdPdXRwdXQnLCAnVmlld0NoaWxkJywgJ1ZpZXdDaGlsZHJlbicsICdDb250ZW50Q2hpbGQnLCAnQ29udGVudENoaWxkcmVuJywgJ0hvc3RCaW5kaW5nJyxcbiAgJ0hvc3RMaXN0ZW5lcidcbl07XG5jb25zdCBMSUZFQ1lDTEVfSE9PS1MgPSBuZXcgU2V0KFtcbiAgJ25nT25DaGFuZ2VzJywgJ25nT25Jbml0JywgJ25nT25EZXN0cm95JywgJ25nRG9DaGVjaycsICduZ0FmdGVyVmlld0luaXQnLCAnbmdBZnRlclZpZXdDaGVja2VkJyxcbiAgJ25nQWZ0ZXJDb250ZW50SW5pdCcsICduZ0FmdGVyQ29udGVudENoZWNrZWQnXG5dKTtcblxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVIYW5kbGVyRGF0YSB7XG4gIGJhc2VDbGFzczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+fCdkeW5hbWljJ3xudWxsO1xuICB0eXBlQ2hlY2tNZXRhOiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhO1xuICBtZXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhO1xuICBjbGFzc01ldGFkYXRhOiBSM0NsYXNzTWV0YWRhdGF8bnVsbDtcbiAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcbiAgaW5wdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZztcbiAgb3V0cHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmc7XG4gIGlzUG9pc29uZWQ6IGJvb2xlYW47XG4gIGlzU3RydWN0dXJhbDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEFuZ3VsYXIgZGlyZWN0aXZlLiBDb21wb25lbnRzIGFyZSByZXByZXNlbnRlZCBieSBgQ29tcG9uZW50U3ltYm9sYCwgd2hpY2ggaW5oZXJpdHNcbiAqIGZyb20gdGhpcyBzeW1ib2wuXG4gKi9cbmV4cG9ydCBjbGFzcyBEaXJlY3RpdmVTeW1ib2wgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbCB7XG4gIGJhc2VDbGFzczogU2VtYW50aWNTeW1ib2x8bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBwdWJsaWMgcmVhZG9ubHkgc2VsZWN0b3I6IHN0cmluZ3xudWxsLFxuICAgICAgcHVibGljIHJlYWRvbmx5IGlucHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmcsIHB1YmxpYyByZWFkb25seSBvdXRwdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZyxcbiAgICAgIHB1YmxpYyByZWFkb25seSBleHBvcnRBczogc3RyaW5nW118bnVsbCxcbiAgICAgIHB1YmxpYyByZWFkb25seSB0eXBlQ2hlY2tNZXRhOiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLFxuICAgICAgcHVibGljIHJlYWRvbmx5IHR5cGVQYXJhbWV0ZXJzOiBTZW1hbnRpY1R5cGVQYXJhbWV0ZXJbXXxudWxsKSB7XG4gICAgc3VwZXIoZGVjbCk7XG4gIH1cblxuICBvdmVycmlkZSBpc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIC8vIE5vdGU6IHNpbmNlIGNvbXBvbmVudHMgYW5kIGRpcmVjdGl2ZXMgaGF2ZSBleGFjdGx5IHRoZSBzYW1lIGl0ZW1zIGNvbnRyaWJ1dGluZyB0byB0aGVpclxuICAgIC8vIHB1YmxpYyBBUEksIGl0IGlzIG9rYXkgZm9yIGEgZGlyZWN0aXZlIHRvIGNoYW5nZSBpbnRvIGEgY29tcG9uZW50IGFuZCB2aWNlIHZlcnNhIHdpdGhvdXRcbiAgICAvLyB0aGUgQVBJIGJlaW5nIGFmZmVjdGVkLlxuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgRGlyZWN0aXZlU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRGlyZWN0aXZlcyBhbmQgY29tcG9uZW50cyBoYXZlIGEgcHVibGljIEFQSSBvZjpcbiAgICAvLyAgMS4gVGhlaXIgc2VsZWN0b3IuXG4gICAgLy8gIDIuIFRoZSBiaW5kaW5nIG5hbWVzIG9mIHRoZWlyIGlucHV0cyBhbmQgb3V0cHV0czsgYSBjaGFuZ2UgaW4gb3JkZXJpbmcgaXMgYWxzbyBjb25zaWRlcmVkXG4gICAgLy8gICAgIHRvIGJlIGEgY2hhbmdlIGluIHB1YmxpYyBBUEkuXG4gICAgLy8gIDMuIFRoZSBsaXN0IG9mIGV4cG9ydEFzIG5hbWVzIGFuZCBpdHMgb3JkZXJpbmcuXG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3IgIT09IHByZXZpb3VzU3ltYm9sLnNlbGVjdG9yIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy5pbnB1dHMucHJvcGVydHlOYW1lcywgcHJldmlvdXNTeW1ib2wuaW5wdXRzLnByb3BlcnR5TmFtZXMpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy5vdXRwdXRzLnByb3BlcnR5TmFtZXMsIHByZXZpb3VzU3ltYm9sLm91dHB1dHMucHJvcGVydHlOYW1lcykgfHxcbiAgICAgICAgIWlzQXJyYXlFcXVhbCh0aGlzLmV4cG9ydEFzLCBwcmV2aW91c1N5bWJvbC5leHBvcnRBcyk7XG4gIH1cblxuICBvdmVycmlkZSBpc1R5cGVDaGVja0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIC8vIElmIHRoZSBwdWJsaWMgQVBJIG9mIHRoZSBkaXJlY3RpdmUgaGFzIGNoYW5nZWQsIHRoZW4gc28gaGFzIGl0cyB0eXBlLWNoZWNrIEFQSS5cbiAgICBpZiAodGhpcy5pc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBEaXJlY3RpdmVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgdHlwZS1jaGVjayBibG9jayBhbHNvIGRlcGVuZHMgb24gdGhlIGNsYXNzIHByb3BlcnR5IG5hbWVzLCBhcyB3cml0ZXMgcHJvcGVydHkgYmluZGluZ3NcbiAgICAvLyBkaXJlY3RseSBpbnRvIHRoZSBiYWNraW5nIGZpZWxkcy5cbiAgICBpZiAoIWlzQXJyYXlFcXVhbChcbiAgICAgICAgICAgIEFycmF5LmZyb20odGhpcy5pbnB1dHMpLCBBcnJheS5mcm9tKHByZXZpb3VzU3ltYm9sLmlucHV0cyksIGlzSW5wdXRNYXBwaW5nRXF1YWwpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwoXG4gICAgICAgICAgICBBcnJheS5mcm9tKHRoaXMub3V0cHV0cyksIEFycmF5LmZyb20ocHJldmlvdXNTeW1ib2wub3V0cHV0cyksIGlzSW5wdXRNYXBwaW5nRXF1YWwpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgdHlwZSBwYXJhbWV0ZXJzIG9mIGEgZGlyZWN0aXZlIGFyZSBlbWl0dGVkIGludG8gdGhlIHR5cGUgY29uc3RydWN0b3JzIGluIHRoZSB0eXBlLWNoZWNrXG4gICAgLy8gYmxvY2sgb2YgYSBjb21wb25lbnQsIHNvIGlmIHRoZSB0eXBlIHBhcmFtZXRlcnMgYXJlIG5vdCBjb25zaWRlcmVkIGVxdWFsIHRoZW4gY29uc2lkZXIgdGhlXG4gICAgLy8gdHlwZS1jaGVjayBBUEkgb2YgdGhpcyBkaXJlY3RpdmUgdG8gYmUgYWZmZWN0ZWQuXG4gICAgaWYgKCFhcmVUeXBlUGFyYW1ldGVyc0VxdWFsKHRoaXMudHlwZVBhcmFtZXRlcnMsIHByZXZpb3VzU3ltYm9sLnR5cGVQYXJhbWV0ZXJzKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gVGhlIHR5cGUtY2hlY2sgbWV0YWRhdGEgaXMgdXNlZCBkdXJpbmcgVENCIGNvZGUgZ2VuZXJhdGlvbiwgc28gYW55IGNoYW5nZXMgc2hvdWxkIGludmFsaWRhdGVcbiAgICAvLyBwcmlvciB0eXBlLWNoZWNrIGZpbGVzLlxuICAgIGlmICghaXNUeXBlQ2hlY2tNZXRhRXF1YWwodGhpcy50eXBlQ2hlY2tNZXRhLCBwcmV2aW91c1N5bWJvbC50eXBlQ2hlY2tNZXRhKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ2hhbmdpbmcgdGhlIGJhc2UgY2xhc3Mgb2YgYSBkaXJlY3RpdmUgbWVhbnMgdGhhdCBpdHMgaW5wdXRzL291dHB1dHMgZXRjIG1heSBoYXZlIGNoYW5nZWQsXG4gICAgLy8gc28gdGhlIHR5cGUtY2hlY2sgYmxvY2sgb2YgY29tcG9uZW50cyB0aGF0IHVzZSB0aGlzIGRpcmVjdGl2ZSBuZWVkcyB0byBiZSByZWdlbmVyYXRlZC5cbiAgICBpZiAoIWlzQmFzZUNsYXNzRXF1YWwodGhpcy5iYXNlQ2xhc3MsIHByZXZpb3VzU3ltYm9sLmJhc2VDbGFzcykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0lucHV0TWFwcGluZ0VxdWFsKFxuICAgIGN1cnJlbnQ6IFtDbGFzc1Byb3BlcnR5TmFtZSwgQmluZGluZ1Byb3BlcnR5TmFtZV0sXG4gICAgcHJldmlvdXM6IFtDbGFzc1Byb3BlcnR5TmFtZSwgQmluZGluZ1Byb3BlcnR5TmFtZV0pOiBib29sZWFuIHtcbiAgcmV0dXJuIGN1cnJlbnRbMF0gPT09IHByZXZpb3VzWzBdICYmIGN1cnJlbnRbMV0gPT09IHByZXZpb3VzWzFdO1xufVxuXG5mdW5jdGlvbiBpc1R5cGVDaGVja01ldGFFcXVhbChcbiAgICBjdXJyZW50OiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBwcmV2aW91czogRGlyZWN0aXZlVHlwZUNoZWNrTWV0YSk6IGJvb2xlYW4ge1xuICBpZiAoY3VycmVudC5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkICE9PSBwcmV2aW91cy5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChjdXJyZW50LmlzR2VuZXJpYyAhPT0gcHJldmlvdXMuaXNHZW5lcmljKSB7XG4gICAgLy8gTm90ZTogY2hhbmdlcyBpbiB0aGUgbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycyBpcyBhbHNvIGNvbnNpZGVyZWQgaW4gYGFyZVR5cGVQYXJhbWV0ZXJzRXF1YWxgXG4gICAgLy8gc28gdGhpcyBjaGVjayBpcyB0ZWNobmljYWxseSBub3QgbmVlZGVkOyBpdCBpcyBkb25lIGFueXdheSBmb3IgY29tcGxldGVuZXNzIGluIHRlcm1zIG9mXG4gICAgLy8gd2hldGhlciB0aGUgYERpcmVjdGl2ZVR5cGVDaGVja01ldGFgIHN0cnVjdCBpdHNlbGYgY29tcGFyZXMgZXF1YWwgb3Igbm90LlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzQXJyYXlFcXVhbChjdXJyZW50Lm5nVGVtcGxhdGVHdWFyZHMsIHByZXZpb3VzLm5nVGVtcGxhdGVHdWFyZHMsIGlzVGVtcGxhdGVHdWFyZEVxdWFsKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzU2V0RXF1YWwoY3VycmVudC5jb2VyY2VkSW5wdXRGaWVsZHMsIHByZXZpb3VzLmNvZXJjZWRJbnB1dEZpZWxkcykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFpc1NldEVxdWFsKGN1cnJlbnQucmVzdHJpY3RlZElucHV0RmllbGRzLCBwcmV2aW91cy5yZXN0cmljdGVkSW5wdXRGaWVsZHMpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghaXNTZXRFcXVhbChjdXJyZW50LnN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcywgcHJldmlvdXMuc3RyaW5nTGl0ZXJhbElucHV0RmllbGRzKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzU2V0RXF1YWwoY3VycmVudC51bmRlY2xhcmVkSW5wdXRGaWVsZHMsIHByZXZpb3VzLnVuZGVjbGFyZWRJbnB1dEZpZWxkcykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzVGVtcGxhdGVHdWFyZEVxdWFsKGN1cnJlbnQ6IFRlbXBsYXRlR3VhcmRNZXRhLCBwcmV2aW91czogVGVtcGxhdGVHdWFyZE1ldGEpOiBib29sZWFuIHtcbiAgcmV0dXJuIGN1cnJlbnQuaW5wdXROYW1lID09PSBwcmV2aW91cy5pbnB1dE5hbWUgJiYgY3VycmVudC50eXBlID09PSBwcmV2aW91cy50eXBlO1xufVxuXG5mdW5jdGlvbiBpc0Jhc2VDbGFzc0VxdWFsKGN1cnJlbnQ6IFNlbWFudGljU3ltYm9sfG51bGwsIHByZXZpb3VzOiBTZW1hbnRpY1N5bWJvbHxudWxsKTogYm9vbGVhbiB7XG4gIGlmIChjdXJyZW50ID09PSBudWxsIHx8IHByZXZpb3VzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGN1cnJlbnQgPT09IHByZXZpb3VzO1xuICB9XG5cbiAgcmV0dXJuIGlzU3ltYm9sRXF1YWwoY3VycmVudCwgcHJldmlvdXMpO1xufVxuXG5leHBvcnQgY2xhc3MgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3J8bnVsbCwgRGlyZWN0aXZlSGFuZGxlckRhdGEsIERpcmVjdGl2ZVN5bWJvbCwgdW5rbm93bj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksXG4gICAgICBwcml2YXRlIGlzQ29yZTogYm9vbGVhbiwgcHJpdmF0ZSBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjogU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXJ8bnVsbCxcbiAgICAgIHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzOiBib29sZWFuLCBwcml2YXRlIHBlcmY6IFBlcmZSZWNvcmRlcikge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgcmVhZG9ubHkgbmFtZSA9IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIubmFtZTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6XG4gICAgICBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yfG51bGw+fHVuZGVmaW5lZCB7XG4gICAgLy8gSWYgYSBjbGFzcyBpcyB1bmRlY29yYXRlZCBidXQgdXNlcyBBbmd1bGFyIGZlYXR1cmVzLCB3ZSBkZXRlY3QgaXQgYXMgYW5cbiAgICAvLyBhYnN0cmFjdCBkaXJlY3RpdmUuIFRoaXMgaXMgYW4gdW5zdXBwb3J0ZWQgcGF0dGVybiBhcyBvZiB2MTAsIGJ1dCB3ZSB3YW50XG4gICAgLy8gdG8gc3RpbGwgZGV0ZWN0IHRoZXNlIHBhdHRlcm5zIHNvIHRoYXQgd2UgY2FuIHJlcG9ydCBkaWFnbm9zdGljcywgb3IgY29tcGlsZVxuICAgIC8vIHRoZW0gZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGluIG5nY2MuXG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICBjb25zdCBhbmd1bGFyRmllbGQgPSB0aGlzLmZpbmRDbGFzc0ZpZWxkV2l0aEFuZ3VsYXJGZWF0dXJlcyhub2RlKTtcbiAgICAgIHJldHVybiBhbmd1bGFyRmllbGQgPyB7dHJpZ2dlcjogYW5ndWxhckZpZWxkLm5vZGUsIGRlY29yYXRvcjogbnVsbCwgbWV0YWRhdGE6IG51bGx9IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdEaXJlY3RpdmUnLCB0aGlzLmlzQ29yZSk7XG4gICAgICByZXR1cm4gZGVjb3JhdG9yID8ge3RyaWdnZXI6IGRlY29yYXRvci5ub2RlLCBkZWNvcmF0b3IsIG1ldGFkYXRhOiBkZWNvcmF0b3J9IDogdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3J8bnVsbD4sIGZsYWdzID0gSGFuZGxlckZsYWdzLk5PTkUpOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8RGlyZWN0aXZlSGFuZGxlckRhdGE+IHtcbiAgICAvLyBTa2lwIHByb2Nlc3Npbmcgb2YgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIGlmIGNvbXBpbGF0aW9uIG9mIHVuZGVjb3JhdGVkIGNsYXNzZXNcbiAgICAvLyB3aXRoIEFuZ3VsYXIgZmVhdHVyZXMgaXMgZGlzYWJsZWQuIFByZXZpb3VzbHkgaW4gbmd0c2MsIHN1Y2ggY2xhc3NlcyBoYXZlIGFsd2F5c1xuICAgIC8vIGJlZW4gcHJvY2Vzc2VkLCBidXQgd2Ugd2FudCB0byBlbmZvcmNlIGEgY29uc2lzdGVudCBkZWNvcmF0b3IgbWVudGFsIG1vZGVsLlxuICAgIC8vIFNlZTogaHR0cHM6Ly92OS5hbmd1bGFyLmlvL2d1aWRlL21pZ3JhdGlvbi11bmRlY29yYXRlZC1jbGFzc2VzLlxuICAgIGlmICh0aGlzLmNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzID09PSBmYWxzZSAmJiBkZWNvcmF0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3M6IFtnZXRVbmRlY29yYXRlZENsYXNzV2l0aEFuZ3VsYXJGZWF0dXJlc0RpYWdub3N0aWMobm9kZSldfTtcbiAgICB9XG5cbiAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuQW5hbHl6ZURpcmVjdGl2ZSk7XG5cbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPSBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmlzQ29yZSwgZmxhZ3MsXG4gICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpO1xuICAgIGlmIChkaXJlY3RpdmVSZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgICBjb25zdCBhbmFseXNpcyA9IGRpcmVjdGl2ZVJlc3VsdC5tZXRhZGF0YTtcblxuICAgIGxldCBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsID0gbnVsbDtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ICE9PSB1bmRlZmluZWQgJiYgZGlyZWN0aXZlUmVzdWx0LmRlY29yYXRvci5oYXMoJ3Byb3ZpZGVycycpKSB7XG4gICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ID0gcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkoXG4gICAgICAgICAgZGlyZWN0aXZlUmVzdWx0LmRlY29yYXRvci5nZXQoJ3Byb3ZpZGVycycpISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgaW5wdXRzOiBkaXJlY3RpdmVSZXN1bHQuaW5wdXRzLFxuICAgICAgICBvdXRwdXRzOiBkaXJlY3RpdmVSZXN1bHQub3V0cHV0cyxcbiAgICAgICAgbWV0YTogYW5hbHlzaXMsXG4gICAgICAgIGNsYXNzTWV0YWRhdGE6IGV4dHJhY3RDbGFzc01ldGFkYXRhKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlLCB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSxcbiAgICAgICAgYmFzZUNsYXNzOiByZWFkQmFzZUNsYXNzKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciksXG4gICAgICAgIHR5cGVDaGVja01ldGE6IGV4dHJhY3REaXJlY3RpdmVUeXBlQ2hlY2tNZXRhKG5vZGUsIGRpcmVjdGl2ZVJlc3VsdC5pbnB1dHMsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgICAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSxcbiAgICAgICAgaXNQb2lzb25lZDogZmFsc2UsXG4gICAgICAgIGlzU3RydWN0dXJhbDogZGlyZWN0aXZlUmVzdWx0LmlzU3RydWN0dXJhbCxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgc3ltYm9sKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxEaXJlY3RpdmVIYW5kbGVyRGF0YT4pOiBEaXJlY3RpdmVTeW1ib2wge1xuICAgIGNvbnN0IHR5cGVQYXJhbWV0ZXJzID0gZXh0cmFjdFNlbWFudGljVHlwZVBhcmFtZXRlcnMobm9kZSk7XG5cbiAgICByZXR1cm4gbmV3IERpcmVjdGl2ZVN5bWJvbChcbiAgICAgICAgbm9kZSwgYW5hbHlzaXMubWV0YS5zZWxlY3RvciwgYW5hbHlzaXMuaW5wdXRzLCBhbmFseXNpcy5vdXRwdXRzLCBhbmFseXNpcy5tZXRhLmV4cG9ydEFzLFxuICAgICAgICBhbmFseXNpcy50eXBlQ2hlY2tNZXRhLCB0eXBlUGFyYW1ldGVycyk7XG4gIH1cblxuICByZWdpc3Rlcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8RGlyZWN0aXZlSGFuZGxlckRhdGE+KTogdm9pZCB7XG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBkaXJlY3RpdmUncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBgTWV0YWRhdGFSZWdpc3RyeWAuIFRoaXMgZW5zdXJlcyB0aGF0XG4gICAgLy8gdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBkaXJlY3RpdmUgaXMgYXZhaWxhYmxlIGR1cmluZyB0aGUgY29tcGlsZSgpIHBoYXNlLlxuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgdGhpcy5tZXRhUmVnaXN0cnkucmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YSh7XG4gICAgICB0eXBlOiBNZXRhVHlwZS5EaXJlY3RpdmUsXG4gICAgICByZWYsXG4gICAgICBuYW1lOiBub2RlLm5hbWUudGV4dCxcbiAgICAgIHNlbGVjdG9yOiBhbmFseXNpcy5tZXRhLnNlbGVjdG9yLFxuICAgICAgZXhwb3J0QXM6IGFuYWx5c2lzLm1ldGEuZXhwb3J0QXMsXG4gICAgICBpbnB1dHM6IGFuYWx5c2lzLmlucHV0cyxcbiAgICAgIG91dHB1dHM6IGFuYWx5c2lzLm91dHB1dHMsXG4gICAgICBxdWVyaWVzOiBhbmFseXNpcy5tZXRhLnF1ZXJpZXMubWFwKHF1ZXJ5ID0+IHF1ZXJ5LnByb3BlcnR5TmFtZSksXG4gICAgICBpc0NvbXBvbmVudDogZmFsc2UsXG4gICAgICBiYXNlQ2xhc3M6IGFuYWx5c2lzLmJhc2VDbGFzcyxcbiAgICAgIC4uLmFuYWx5c2lzLnR5cGVDaGVja01ldGEsXG4gICAgICBpc1BvaXNvbmVkOiBhbmFseXNpcy5pc1BvaXNvbmVkLFxuICAgICAgaXNTdHJ1Y3R1cmFsOiBhbmFseXNpcy5pc1N0cnVjdHVyYWwsXG4gICAgfSk7XG5cbiAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBEaXJlY3RpdmVIYW5kbGVyRGF0YSwgc3ltYm9sOiBEaXJlY3RpdmVTeW1ib2wpOlxuICAgICAgUmVzb2x2ZVJlc3VsdDx1bmtub3duPiB7XG4gICAgaWYgKHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgIT09IG51bGwgJiYgYW5hbHlzaXMuYmFzZUNsYXNzIGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICBzeW1ib2wuYmFzZUNsYXNzID0gdGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlci5nZXRTeW1ib2woYW5hbHlzaXMuYmFzZUNsYXNzLm5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSAhPT0gbnVsbCAmJlxuICAgICAgICBhbmFseXNpcy5tZXRhLnByb3ZpZGVycyBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcikge1xuICAgICAgY29uc3QgcHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMhLm5vZGUsXG4gICAgICAgICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5wcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVEaWFnbm9zdGljcyA9IGdldERpcmVjdGl2ZURpYWdub3N0aWNzKFxuICAgICAgICBub2RlLCB0aGlzLm1ldGFSZWFkZXIsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCAnRGlyZWN0aXZlJyk7XG4gICAgaWYgKGRpcmVjdGl2ZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmRpcmVjdGl2ZURpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge2RpYWdub3N0aWNzOiBkaWFnbm9zdGljcy5sZW5ndGggPiAwID8gZGlhZ25vc3RpY3MgOiB1bmRlZmluZWR9O1xuICB9XG5cbiAgY29tcGlsZUZ1bGwoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8RGlyZWN0aXZlSGFuZGxlckRhdGE+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8dW5rbm93bj4sIHBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgZmFjID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKHRvRmFjdG9yeU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEsIEZhY3RvcnlUYXJnZXQuRGlyZWN0aXZlKSk7XG4gICAgY29uc3QgZGVmID0gY29tcGlsZURpcmVjdGl2ZUZyb21NZXRhZGF0YShhbmFseXNpcy5tZXRhLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICBjb25zdCBjbGFzc01ldGFkYXRhID0gYW5hbHlzaXMuY2xhc3NNZXRhZGF0YSAhPT0gbnVsbCA/XG4gICAgICAgIGNvbXBpbGVDbGFzc01ldGFkYXRhKGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEpLnRvU3RtdCgpIDpcbiAgICAgICAgbnVsbDtcbiAgICByZXR1cm4gY29tcGlsZVJlc3VsdHMoZmFjLCBkZWYsIGNsYXNzTWV0YWRhdGEsICfJtWRpcicpO1xuICB9XG5cbiAgY29tcGlsZVBhcnRpYWwoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8RGlyZWN0aXZlSGFuZGxlckRhdGE+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8dW5rbm93bj4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGZhYyA9IGNvbXBpbGVEZWNsYXJlRmFjdG9yeSh0b0ZhY3RvcnlNZXRhZGF0YShhbmFseXNpcy5tZXRhLCBGYWN0b3J5VGFyZ2V0LkRpcmVjdGl2ZSkpO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVEZWNsYXJlRGlyZWN0aXZlRnJvbU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEpO1xuICAgIGNvbnN0IGNsYXNzTWV0YWRhdGEgPSBhbmFseXNpcy5jbGFzc01ldGFkYXRhICE9PSBudWxsID9cbiAgICAgICAgY29tcGlsZURlY2xhcmVDbGFzc01ldGFkYXRhKGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEpLnRvU3RtdCgpIDpcbiAgICAgICAgbnVsbDtcbiAgICByZXR1cm4gY29tcGlsZVJlc3VsdHMoZmFjLCBkZWYsIGNsYXNzTWV0YWRhdGEsICfJtWRpcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiBhIGdpdmVuIGNsYXNzIHVzZXMgQW5ndWxhciBmZWF0dXJlcyBhbmQgcmV0dXJucyB0aGUgVHlwZVNjcmlwdCBub2RlXG4gICAqIHRoYXQgaW5kaWNhdGVkIHRoZSB1c2FnZS4gQ2xhc3NlcyBhcmUgY29uc2lkZXJlZCB1c2luZyBBbmd1bGFyIGZlYXR1cmVzIGlmIHRoZXlcbiAgICogY29udGFpbiBjbGFzcyBtZW1iZXJzIHRoYXQgYXJlIGVpdGhlciBkZWNvcmF0ZWQgd2l0aCBhIGtub3duIEFuZ3VsYXIgZGVjb3JhdG9yLFxuICAgKiBvciBpZiB0aGV5IGNvcnJlc3BvbmQgdG8gYSBrbm93biBBbmd1bGFyIGxpZmVjeWNsZSBob29rLlxuICAgKi9cbiAgcHJpdmF0ZSBmaW5kQ2xhc3NGaWVsZFdpdGhBbmd1bGFyRmVhdHVyZXMobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKG5vZGUpLmZpbmQobWVtYmVyID0+IHtcbiAgICAgIGlmICghbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuTWV0aG9kICYmXG4gICAgICAgICAgTElGRUNZQ0xFX0hPT0tTLmhhcyhtZW1iZXIubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAobWVtYmVyLmRlY29yYXRvcnMpIHtcbiAgICAgICAgcmV0dXJuIG1lbWJlci5kZWNvcmF0b3JzLnNvbWUoXG4gICAgICAgICAgICBkZWNvcmF0b3IgPT4gRklFTERfREVDT1JBVE9SUy5zb21lKFxuICAgICAgICAgICAgICAgIGRlY29yYXRvck5hbWUgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgZGVjb3JhdG9yTmFtZSwgdGhpcy5pc0NvcmUpKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gZXh0cmFjdCBtZXRhZGF0YSBmcm9tIGEgYERpcmVjdGl2ZWAgb3IgYENvbXBvbmVudGAuIGBEaXJlY3RpdmVgcyB3aXRob3V0IGFcbiAqIHNlbGVjdG9yIGFyZSBhbGxvd2VkIHRvIGJlIHVzZWQgZm9yIGFic3RyYWN0IGJhc2UgY2xhc3Nlcy4gVGhlc2UgYWJzdHJhY3QgZGlyZWN0aXZlcyBzaG91bGQgbm90XG4gKiBhcHBlYXIgaW4gdGhlIGRlY2xhcmF0aW9ucyBvZiBhbiBgTmdNb2R1bGVgIGFuZCBhZGRpdGlvbmFsIHZlcmlmaWNhdGlvbiBpcyBkb25lIHdoZW4gcHJvY2Vzc2luZ1xuICogdGhlIG1vZHVsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3J8bnVsbD4sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLCBpc0NvcmU6IGJvb2xlYW4sIGZsYWdzOiBIYW5kbGVyRmxhZ3MsXG4gICAgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sIGRlZmF1bHRTZWxlY3Rvcjogc3RyaW5nfG51bGwgPSBudWxsKToge1xuICBkZWNvcmF0b3I6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICBtZXRhZGF0YTogUjNEaXJlY3RpdmVNZXRhZGF0YSxcbiAgaW5wdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZyxcbiAgb3V0cHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmcsXG4gIGlzU3RydWN0dXJhbDogYm9vbGVhbjtcbn18dW5kZWZpbmVkIHtcbiAgbGV0IGRpcmVjdGl2ZTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj47XG4gIGlmIChkZWNvcmF0b3IgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgZGlyZWN0aXZlID0gbmV3IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+KCk7XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yYCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLFxuICAgICAgICAgIGBAJHtkZWNvcmF0b3IubmFtZX0gYXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbGApO1xuICAgIH1cbiAgICBkaXJlY3RpdmUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcbiAgfVxuXG4gIGlmIChkaXJlY3RpdmUuaGFzKCdqaXQnKSkge1xuICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBtZW1iZXJzID0gcmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KTtcblxuICAvLyBQcmVjb21wdXRlIGEgbGlzdCBvZiB0cy5DbGFzc0VsZW1lbnRzIHRoYXQgaGF2ZSBkZWNvcmF0b3JzLiBUaGlzIGluY2x1ZGVzIHRoaW5ncyBsaWtlIEBJbnB1dCxcbiAgLy8gQE91dHB1dCwgQEhvc3RCaW5kaW5nLCBldGMuXG4gIGNvbnN0IGRlY29yYXRlZEVsZW1lbnRzID1cbiAgICAgIG1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiAhbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5kZWNvcmF0b3JzICE9PSBudWxsKTtcblxuICBjb25zdCBjb3JlTW9kdWxlID0gaXNDb3JlID8gdW5kZWZpbmVkIDogJ0Bhbmd1bGFyL2NvcmUnO1xuXG4gIC8vIENvbnN0cnVjdCB0aGUgbWFwIG9mIGlucHV0cyBib3RoIGZyb20gdGhlIEBEaXJlY3RpdmUvQENvbXBvbmVudFxuICAvLyBkZWNvcmF0b3IsIGFuZCB0aGUgZGVjb3JhdGVkXG4gIC8vIGZpZWxkcy5cbiAgY29uc3QgaW5wdXRzRnJvbU1ldGEgPSBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoZGlyZWN0aXZlLCAnaW5wdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3QgaW5wdXRzRnJvbUZpZWxkcyA9IHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0lucHV0JywgY29yZU1vZHVsZSksIGV2YWx1YXRvcixcbiAgICAgIHJlc29sdmVJbnB1dCk7XG5cbiAgLy8gQW5kIG91dHB1dHMuXG4gIGNvbnN0IG91dHB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdvdXRwdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3Qgb3V0cHV0c0Zyb21GaWVsZHMgPVxuICAgICAgcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ091dHB1dCcsIGNvcmVNb2R1bGUpLCBldmFsdWF0b3IsXG4gICAgICAgICAgcmVzb2x2ZU91dHB1dCkgYXMge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfTtcbiAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHF1ZXJpZXMuXG4gIGNvbnN0IGNvbnRlbnRDaGlsZEZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdDb250ZW50Q2hpbGQnLCBjb3JlTW9kdWxlKSwgcmVmbGVjdG9yLFxuICAgICAgZXZhbHVhdG9yKTtcbiAgY29uc3QgY29udGVudENoaWxkcmVuRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0NvbnRlbnRDaGlsZHJlbicsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuXG4gIGNvbnN0IHF1ZXJpZXMgPSBbLi4uY29udGVudENoaWxkRnJvbUZpZWxkcywgLi4uY29udGVudENoaWxkcmVuRnJvbUZpZWxkc107XG5cbiAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHZpZXcgcXVlcmllcy5cbiAgY29uc3Qgdmlld0NoaWxkRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ1ZpZXdDaGlsZCcsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuICBjb25zdCB2aWV3Q2hpbGRyZW5Gcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnVmlld0NoaWxkcmVuJywgY29yZU1vZHVsZSksIHJlZmxlY3RvcixcbiAgICAgIGV2YWx1YXRvcik7XG4gIGNvbnN0IHZpZXdRdWVyaWVzID0gWy4uLnZpZXdDaGlsZEZyb21GaWVsZHMsIC4uLnZpZXdDaGlsZHJlbkZyb21GaWVsZHNdO1xuXG4gIGlmIChkaXJlY3RpdmUuaGFzKCdxdWVyaWVzJykpIHtcbiAgICBjb25zdCBxdWVyaWVzRnJvbURlY29yYXRvciA9XG4gICAgICAgIGV4dHJhY3RRdWVyaWVzRnJvbURlY29yYXRvcihkaXJlY3RpdmUuZ2V0KCdxdWVyaWVzJykhLCByZWZsZWN0b3IsIGV2YWx1YXRvciwgaXNDb3JlKTtcbiAgICBxdWVyaWVzLnB1c2goLi4ucXVlcmllc0Zyb21EZWNvcmF0b3IuY29udGVudCk7XG4gICAgdmlld1F1ZXJpZXMucHVzaCguLi5xdWVyaWVzRnJvbURlY29yYXRvci52aWV3KTtcbiAgfVxuXG4gIC8vIFBhcnNlIHRoZSBzZWxlY3Rvci5cbiAgbGV0IHNlbGVjdG9yID0gZGVmYXVsdFNlbGVjdG9yO1xuICBpZiAoZGlyZWN0aXZlLmhhcygnc2VsZWN0b3InKSkge1xuICAgIGNvbnN0IGV4cHIgPSBkaXJlY3RpdmUuZ2V0KCdzZWxlY3RvcicpITtcbiAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihleHByLCByZXNvbHZlZCwgYHNlbGVjdG9yIG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICB9XG4gICAgLy8gdXNlIGRlZmF1bHQgc2VsZWN0b3IgaW4gY2FzZSBzZWxlY3RvciBpcyBhbiBlbXB0eSBzdHJpbmdcbiAgICBzZWxlY3RvciA9IHJlc29sdmVkID09PSAnJyA/IGRlZmF1bHRTZWxlY3RvciA6IHJlc29sdmVkO1xuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuRElSRUNUSVZFX01JU1NJTkdfU0VMRUNUT1IsIGV4cHIsXG4gICAgICAgICAgYERpcmVjdGl2ZSAke2NsYXp6Lm5hbWUudGV4dH0gaGFzIG5vIHNlbGVjdG9yLCBwbGVhc2UgYWRkIGl0IWApO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGhvc3QgPSBleHRyYWN0SG9zdEJpbmRpbmdzKGRlY29yYXRlZEVsZW1lbnRzLCBldmFsdWF0b3IsIGNvcmVNb2R1bGUsIGRpcmVjdGl2ZSk7XG5cbiAgY29uc3QgcHJvdmlkZXJzOiBFeHByZXNzaW9ufG51bGwgPSBkaXJlY3RpdmUuaGFzKCdwcm92aWRlcnMnKSA/XG4gICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyID9cbiAgICAgICAgICAgICAgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyhkaXJlY3RpdmUuZ2V0KCdwcm92aWRlcnMnKSEpIDpcbiAgICAgICAgICAgICAgZGlyZWN0aXZlLmdldCgncHJvdmlkZXJzJykhKSA6XG4gICAgICBudWxsO1xuXG4gIC8vIERldGVybWluZSBpZiBgbmdPbkNoYW5nZXNgIGlzIGEgbGlmZWN5Y2xlIGhvb2sgZGVmaW5lZCBvbiB0aGUgY29tcG9uZW50LlxuICBjb25zdCB1c2VzT25DaGFuZ2VzID0gbWVtYmVycy5zb21lKFxuICAgICAgbWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiZcbiAgICAgICAgICBtZW1iZXIubmFtZSA9PT0gJ25nT25DaGFuZ2VzJyk7XG5cbiAgLy8gUGFyc2UgZXhwb3J0QXMuXG4gIGxldCBleHBvcnRBczogc3RyaW5nW118bnVsbCA9IG51bGw7XG4gIGlmIChkaXJlY3RpdmUuaGFzKCdleHBvcnRBcycpKSB7XG4gICAgY29uc3QgZXhwciA9IGRpcmVjdGl2ZS5nZXQoJ2V4cG9ydEFzJykhO1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHJlc29sdmVkLCBgZXhwb3J0QXMgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBleHBvcnRBcyA9IHJlc29sdmVkLnNwbGl0KCcsJykubWFwKHBhcnQgPT4gcGFydC50cmltKCkpO1xuICB9XG5cbiAgY29uc3QgcmF3Q3RvckRlcHMgPSBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBpc0NvcmUpO1xuXG4gIC8vIE5vbi1hYnN0cmFjdCBkaXJlY3RpdmVzICh0aG9zZSB3aXRoIGEgc2VsZWN0b3IpIHJlcXVpcmUgdmFsaWQgY29uc3RydWN0b3IgZGVwZW5kZW5jaWVzLCB3aGVyZWFzXG4gIC8vIGFic3RyYWN0IGRpcmVjdGl2ZXMgYXJlIGFsbG93ZWQgdG8gaGF2ZSBpbnZhbGlkIGRlcGVuZGVuY2llcywgZ2l2ZW4gdGhhdCBhIHN1YmNsYXNzIG1heSBjYWxsXG4gIC8vIHRoZSBjb25zdHJ1Y3RvciBleHBsaWNpdGx5LlxuICBjb25zdCBjdG9yRGVwcyA9IHNlbGVjdG9yICE9PSBudWxsID8gdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmF3Q3RvckRlcHMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVud3JhcENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKHJhd0N0b3JEZXBzKTtcblxuICAvLyBTdHJ1Y3R1cmFsIGRpcmVjdGl2ZXMgbXVzdCBoYXZlIGEgYFRlbXBsYXRlUmVmYCBkZXBlbmRlbmN5LlxuICBjb25zdCBpc1N0cnVjdHVyYWwgPSBjdG9yRGVwcyAhPT0gbnVsbCAmJiBjdG9yRGVwcyAhPT0gJ2ludmFsaWQnICYmXG4gICAgICBjdG9yRGVwcy5zb21lKFxuICAgICAgICAgIGRlcCA9PiAoZGVwLnRva2VuIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSAmJlxuICAgICAgICAgICAgICBkZXAudG9rZW4udmFsdWUubW9kdWxlTmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnICYmXG4gICAgICAgICAgICAgIGRlcC50b2tlbi52YWx1ZS5uYW1lID09PSAnVGVtcGxhdGVSZWYnKTtcblxuICAvLyBEZXRlY3QgaWYgdGhlIGNvbXBvbmVudCBpbmhlcml0cyBmcm9tIGFub3RoZXIgY2xhc3NcbiAgY29uc3QgdXNlc0luaGVyaXRhbmNlID0gcmVmbGVjdG9yLmhhc0Jhc2VDbGFzcyhjbGF6eik7XG4gIGNvbnN0IHR5cGUgPSB3cmFwVHlwZVJlZmVyZW5jZShyZWZsZWN0b3IsIGNsYXp6KTtcbiAgY29uc3QgaW50ZXJuYWxUeXBlID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6eikpO1xuXG4gIGNvbnN0IGlucHV0cyA9IENsYXNzUHJvcGVydHlNYXBwaW5nLmZyb21NYXBwZWRPYmplY3Qoey4uLmlucHV0c0Zyb21NZXRhLCAuLi5pbnB1dHNGcm9tRmllbGRzfSk7XG4gIGNvbnN0IG91dHB1dHMgPSBDbGFzc1Byb3BlcnR5TWFwcGluZy5mcm9tTWFwcGVkT2JqZWN0KHsuLi5vdXRwdXRzRnJvbU1ldGEsIC4uLm91dHB1dHNGcm9tRmllbGRzfSk7XG5cbiAgY29uc3QgbWV0YWRhdGE6IFIzRGlyZWN0aXZlTWV0YWRhdGEgPSB7XG4gICAgbmFtZTogY2xhenoubmFtZS50ZXh0LFxuICAgIGRlcHM6IGN0b3JEZXBzLFxuICAgIGhvc3QsXG4gICAgbGlmZWN5Y2xlOiB7XG4gICAgICB1c2VzT25DaGFuZ2VzLFxuICAgIH0sXG4gICAgaW5wdXRzOiBpbnB1dHMudG9Kb2ludE1hcHBlZE9iamVjdCgpLFxuICAgIG91dHB1dHM6IG91dHB1dHMudG9EaXJlY3RNYXBwZWRPYmplY3QoKSxcbiAgICBxdWVyaWVzLFxuICAgIHZpZXdRdWVyaWVzLFxuICAgIHNlbGVjdG9yLFxuICAgIGZ1bGxJbmhlcml0YW5jZTogISEoZmxhZ3MgJiBIYW5kbGVyRmxhZ3MuRlVMTF9JTkhFUklUQU5DRSksXG4gICAgdHlwZSxcbiAgICBpbnRlcm5hbFR5cGUsXG4gICAgdHlwZUFyZ3VtZW50Q291bnQ6IHJlZmxlY3Rvci5nZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6KSB8fCAwLFxuICAgIHR5cGVTb3VyY2VTcGFuOiBjcmVhdGVTb3VyY2VTcGFuKGNsYXp6Lm5hbWUpLFxuICAgIHVzZXNJbmhlcml0YW5jZSxcbiAgICBleHBvcnRBcyxcbiAgICBwcm92aWRlcnNcbiAgfTtcbiAgcmV0dXJuIHtcbiAgICBkZWNvcmF0b3I6IGRpcmVjdGl2ZSxcbiAgICBtZXRhZGF0YSxcbiAgICBpbnB1dHMsXG4gICAgb3V0cHV0cyxcbiAgICBpc1N0cnVjdHVyYWwsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0UXVlcnlNZXRhZGF0YShcbiAgICBleHByTm9kZTogdHMuTm9kZSwgbmFtZTogc3RyaW5nLCBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+LCBwcm9wZXJ0eU5hbWU6IHN0cmluZyxcbiAgICByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBSM1F1ZXJ5TWV0YWRhdGEge1xuICBpZiAoYXJncy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGV4cHJOb2RlLCBgQCR7bmFtZX0gbXVzdCBoYXZlIGFyZ3VtZW50c2ApO1xuICB9XG4gIGNvbnN0IGZpcnN0ID0gbmFtZSA9PT0gJ1ZpZXdDaGlsZCcgfHwgbmFtZSA9PT0gJ0NvbnRlbnRDaGlsZCc7XG4gIGNvbnN0IGZvcndhcmRSZWZlcmVuY2VUYXJnZXQgPSB0cnlVbndyYXBGb3J3YXJkUmVmKGFyZ3NbMF0sIHJlZmxlY3Rvcik7XG4gIGNvbnN0IG5vZGUgPSBmb3J3YXJkUmVmZXJlbmNlVGFyZ2V0ID8/IGFyZ3NbMF07XG5cbiAgY29uc3QgYXJnID0gZXZhbHVhdG9yLmV2YWx1YXRlKG5vZGUpO1xuXG4gIC8qKiBXaGV0aGVyIG9yIG5vdCB0aGlzIHF1ZXJ5IHNob3VsZCBjb2xsZWN0IG9ubHkgc3RhdGljIHJlc3VsdHMgKHNlZSB2aWV3L2FwaS50cykgICovXG4gIGxldCBpc1N0YXRpYzogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8vIEV4dHJhY3QgdGhlIHByZWRpY2F0ZVxuICBsZXQgcHJlZGljYXRlOiBNYXliZUZvcndhcmRSZWZFeHByZXNzaW9ufHN0cmluZ1tdfG51bGwgPSBudWxsO1xuICBpZiAoYXJnIGluc3RhbmNlb2YgUmVmZXJlbmNlIHx8IGFyZyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgIC8vIFJlZmVyZW5jZXMgYW5kIHByZWRpY2F0ZXMgdGhhdCBjb3VsZCBub3QgYmUgZXZhbHVhdGVkIHN0YXRpY2FsbHkgYXJlIGVtaXR0ZWQgYXMgaXMuXG4gICAgcHJlZGljYXRlID0gY3JlYXRlTWF5QmVGb3J3YXJkUmVmRXhwcmVzc2lvbihcbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihub2RlKSxcbiAgICAgICAgZm9yd2FyZFJlZmVyZW5jZVRhcmdldCAhPT0gbnVsbCA/IEZvcndhcmRSZWZIYW5kbGluZy5VbndyYXBwZWQgOiBGb3J3YXJkUmVmSGFuZGxpbmcuTm9uZSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICBwcmVkaWNhdGUgPSBbYXJnXTtcbiAgfSBlbHNlIGlmIChpc1N0cmluZ0FycmF5T3JEaWUoYXJnLCBgQCR7bmFtZX0gcHJlZGljYXRlYCwgbm9kZSkpIHtcbiAgICBwcmVkaWNhdGUgPSBhcmc7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihub2RlLCBhcmcsIGBAJHtuYW1lfSBwcmVkaWNhdGUgY2Fubm90IGJlIGludGVycHJldGVkYCk7XG4gIH1cblxuICAvLyBFeHRyYWN0IHRoZSByZWFkIGFuZCBkZXNjZW5kYW50cyBvcHRpb25zLlxuICBsZXQgcmVhZDogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgLy8gVGhlIGRlZmF1bHQgdmFsdWUgZm9yIGRlc2NlbmRhbnRzIGlzIHRydWUgZm9yIGV2ZXJ5IGRlY29yYXRvciBleGNlcHQgQENvbnRlbnRDaGlsZHJlbi5cbiAgbGV0IGRlc2NlbmRhbnRzOiBib29sZWFuID0gbmFtZSAhPT0gJ0NvbnRlbnRDaGlsZHJlbic7XG4gIGxldCBlbWl0RGlzdGluY3RDaGFuZ2VzT25seTogYm9vbGVhbiA9IGVtaXREaXN0aW5jdENoYW5nZXNPbmx5RGVmYXVsdFZhbHVlO1xuICBpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICBjb25zdCBvcHRpb25zRXhwciA9IHVud3JhcEV4cHJlc3Npb24oYXJnc1sxXSk7XG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG9wdGlvbnNFeHByKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBvcHRpb25zRXhwcixcbiAgICAgICAgICBgQCR7bmFtZX0gb3B0aW9ucyBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsYCk7XG4gICAgfVxuICAgIGNvbnN0IG9wdGlvbnMgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChvcHRpb25zRXhwcik7XG4gICAgaWYgKG9wdGlvbnMuaGFzKCdyZWFkJykpIHtcbiAgICAgIHJlYWQgPSBuZXcgV3JhcHBlZE5vZGVFeHByKG9wdGlvbnMuZ2V0KCdyZWFkJykhKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5oYXMoJ2Rlc2NlbmRhbnRzJykpIHtcbiAgICAgIGNvbnN0IGRlc2NlbmRhbnRzRXhwciA9IG9wdGlvbnMuZ2V0KCdkZXNjZW5kYW50cycpITtcbiAgICAgIGNvbnN0IGRlc2NlbmRhbnRzVmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVzY2VuZGFudHNFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgZGVzY2VuZGFudHNWYWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBkZXNjZW5kYW50c0V4cHIsIGRlc2NlbmRhbnRzVmFsdWUsIGBAJHtuYW1lfSBvcHRpb25zLmRlc2NlbmRhbnRzIG11c3QgYmUgYSBib29sZWFuYCk7XG4gICAgICB9XG4gICAgICBkZXNjZW5kYW50cyA9IGRlc2NlbmRhbnRzVmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuaGFzKCdlbWl0RGlzdGluY3RDaGFuZ2VzT25seScpKSB7XG4gICAgICBjb25zdCBlbWl0RGlzdGluY3RDaGFuZ2VzT25seUV4cHIgPSBvcHRpb25zLmdldCgnZW1pdERpc3RpbmN0Q2hhbmdlc09ubHknKSE7XG4gICAgICBjb25zdCBlbWl0RGlzdGluY3RDaGFuZ2VzT25seVZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlKGVtaXREaXN0aW5jdENoYW5nZXNPbmx5RXhwcik7XG4gICAgICBpZiAodHlwZW9mIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5VmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlFeHByLCBlbWl0RGlzdGluY3RDaGFuZ2VzT25seVZhbHVlLFxuICAgICAgICAgICAgYEAke25hbWV9IG9wdGlvbnMuZW1pdERpc3RpbmN0Q2hhbmdlc09ubHkgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5ID0gZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlWYWx1ZTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5oYXMoJ3N0YXRpYycpKSB7XG4gICAgICBjb25zdCBzdGF0aWNWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShvcHRpb25zLmdldCgnc3RhdGljJykhKTtcbiAgICAgIGlmICh0eXBlb2Ygc3RhdGljVmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgbm9kZSwgc3RhdGljVmFsdWUsIGBAJHtuYW1lfSBvcHRpb25zLnN0YXRpYyBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgfVxuICAgICAgaXNTdGF0aWMgPSBzdGF0aWNWYWx1ZTtcbiAgICB9XG5cbiAgfSBlbHNlIGlmIChhcmdzLmxlbmd0aCA+IDIpIHtcbiAgICAvLyBUb28gbWFueSBhcmd1bWVudHMuXG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBub2RlLCBgQCR7bmFtZX0gaGFzIHRvbyBtYW55IGFyZ3VtZW50c2ApO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwcm9wZXJ0eU5hbWUsXG4gICAgcHJlZGljYXRlLFxuICAgIGZpcnN0LFxuICAgIGRlc2NlbmRhbnRzLFxuICAgIHJlYWQsXG4gICAgc3RhdGljOiBpc1N0YXRpYyxcbiAgICBlbWl0RGlzdGluY3RDaGFuZ2VzT25seSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RRdWVyaWVzRnJvbURlY29yYXRvcihcbiAgICBxdWVyeURhdGE6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBpc0NvcmU6IGJvb2xlYW4pOiB7XG4gIGNvbnRlbnQ6IFIzUXVlcnlNZXRhZGF0YVtdLFxuICB2aWV3OiBSM1F1ZXJ5TWV0YWRhdGFbXSxcbn0ge1xuICBjb25zdCBjb250ZW50OiBSM1F1ZXJ5TWV0YWRhdGFbXSA9IFtdLCB2aWV3OiBSM1F1ZXJ5TWV0YWRhdGFbXSA9IFtdO1xuICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocXVlcnlEYXRhKSkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBxdWVyeURhdGEsXG4gICAgICAgICdEZWNvcmF0b3IgcXVlcmllcyBtZXRhZGF0YSBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsJyk7XG4gIH1cbiAgcmVmbGVjdE9iamVjdExpdGVyYWwocXVlcnlEYXRhKS5mb3JFYWNoKChxdWVyeUV4cHIsIHByb3BlcnR5TmFtZSkgPT4ge1xuICAgIHF1ZXJ5RXhwciA9IHVud3JhcEV4cHJlc3Npb24ocXVlcnlFeHByKTtcbiAgICBpZiAoIXRzLmlzTmV3RXhwcmVzc2lvbihxdWVyeUV4cHIpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBxdWVyeURhdGEsXG4gICAgICAgICAgJ0RlY29yYXRvciBxdWVyeSBtZXRhZGF0YSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIGEgcXVlcnkgdHlwZScpO1xuICAgIH1cbiAgICBjb25zdCBxdWVyeVR5cGUgPSB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihxdWVyeUV4cHIuZXhwcmVzc2lvbikgP1xuICAgICAgICBxdWVyeUV4cHIuZXhwcmVzc2lvbi5uYW1lIDpcbiAgICAgICAgcXVlcnlFeHByLmV4cHJlc3Npb247XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIocXVlcnlUeXBlKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcXVlcnlEYXRhLFxuICAgICAgICAgICdEZWNvcmF0b3IgcXVlcnkgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBhIHF1ZXJ5IHR5cGUnKTtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIocXVlcnlUeXBlKTtcbiAgICBpZiAodHlwZSA9PT0gbnVsbCB8fCAoIWlzQ29yZSAmJiB0eXBlLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykgfHxcbiAgICAgICAgIVFVRVJZX1RZUEVTLmhhcyh0eXBlLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBxdWVyeURhdGEsXG4gICAgICAgICAgJ0RlY29yYXRvciBxdWVyeSBtZXRhZGF0YSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIGEgcXVlcnkgdHlwZScpO1xuICAgIH1cblxuICAgIGNvbnN0IHF1ZXJ5ID0gZXh0cmFjdFF1ZXJ5TWV0YWRhdGEoXG4gICAgICAgIHF1ZXJ5RXhwciwgdHlwZS5uYW1lLCBxdWVyeUV4cHIuYXJndW1lbnRzIHx8IFtdLCBwcm9wZXJ0eU5hbWUsIHJlZmxlY3RvciwgZXZhbHVhdG9yKTtcbiAgICBpZiAodHlwZS5uYW1lLnN0YXJ0c1dpdGgoJ0NvbnRlbnQnKSkge1xuICAgICAgY29udGVudC5wdXNoKHF1ZXJ5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmlldy5wdXNoKHF1ZXJ5KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4ge2NvbnRlbnQsIHZpZXd9O1xufVxuXG5mdW5jdGlvbiBpc1N0cmluZ0FycmF5T3JEaWUodmFsdWU6IGFueSwgbmFtZTogc3RyaW5nLCBub2RlOiB0cy5FeHByZXNzaW9uKTogdmFsdWUgaXMgc3RyaW5nW10ge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0eXBlb2YgdmFsdWVbaV0gIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgIG5vZGUsIHZhbHVlW2ldLCBgRmFpbGVkIHRvIHJlc29sdmUgJHtuYW1lfSBhdCBwb3NpdGlvbiAke2l9IHRvIGEgc3RyaW5nYCk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VGaWVsZEFycmF5VmFsdWUoXG4gICAgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogbnVsbHxcbiAgICBzdHJpbmdbXSB7XG4gIGlmICghZGlyZWN0aXZlLmhhcyhmaWVsZCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJlc29sdmUgdGhlIGZpZWxkIG9mIGludGVyZXN0IGZyb20gdGhlIGRpcmVjdGl2ZSBtZXRhZGF0YSB0byBhIHN0cmluZ1tdLlxuICBjb25zdCBleHByZXNzaW9uID0gZGlyZWN0aXZlLmdldChmaWVsZCkhO1xuICBjb25zdCB2YWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByZXNzaW9uKTtcbiAgaWYgKCFpc1N0cmluZ0FycmF5T3JEaWUodmFsdWUsIGZpZWxkLCBleHByZXNzaW9uKSkge1xuICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgIGV4cHJlc3Npb24sIHZhbHVlLCBgRmFpbGVkIHRvIHJlc29sdmUgQERpcmVjdGl2ZS4ke2ZpZWxkfSB0byBhIHN0cmluZyBhcnJheWApO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEludGVycHJldCBwcm9wZXJ0eSBtYXBwaW5nIGZpZWxkcyBvbiB0aGUgZGVjb3JhdG9yIChlLmcuIGlucHV0cyBvciBvdXRwdXRzKSBhbmQgcmV0dXJuIHRoZVxuICogY29ycmVjdGx5IHNoYXBlZCBtZXRhZGF0YSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhcbiAgICBkaXJlY3RpdmU6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBmaWVsZDogc3RyaW5nLFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCBtZXRhVmFsdWVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoZGlyZWN0aXZlLCBmaWVsZCwgZXZhbHVhdG9yKTtcbiAgaWYgKCFtZXRhVmFsdWVzKSB7XG4gICAgcmV0dXJuIEVNUFRZX09CSkVDVDtcbiAgfVxuXG4gIHJldHVybiBtZXRhVmFsdWVzLnJlZHVjZSgocmVzdWx0cywgdmFsdWUpID0+IHtcbiAgICAvLyBFaXRoZXIgdGhlIHZhbHVlIGlzICdmaWVsZCcgb3IgJ2ZpZWxkOiBwcm9wZXJ0eScuIEluIHRoZSBmaXJzdCBjYXNlLCBgcHJvcGVydHlgIHdpbGxcbiAgICAvLyBiZSB1bmRlZmluZWQsIGluIHdoaWNoIGNhc2UgdGhlIGZpZWxkIG5hbWUgc2hvdWxkIGFsc28gYmUgdXNlZCBhcyB0aGUgcHJvcGVydHkgbmFtZS5cbiAgICBjb25zdCBbZmllbGQsIHByb3BlcnR5XSA9IHZhbHVlLnNwbGl0KCc6JywgMikubWFwKHN0ciA9PiBzdHIudHJpbSgpKTtcbiAgICByZXN1bHRzW2ZpZWxkXSA9IHByb3BlcnR5IHx8IGZpZWxkO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9LCB7fSBhcyB7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9KTtcbn1cblxuLyoqXG4gKiBQYXJzZSBwcm9wZXJ0eSBkZWNvcmF0b3JzIChlLmcuIGBJbnB1dGAgb3IgYE91dHB1dGApIGFuZCByZXR1cm4gdGhlIGNvcnJlY3RseSBzaGFwZWQgbWV0YWRhdGFcbiAqIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgZmllbGRzOiB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBtYXBWYWx1ZVJlc29sdmVyOiAocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZykgPT5cbiAgICAgICAgc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXSk6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddfSB7XG4gIHJldHVybiBmaWVsZHMucmVkdWNlKChyZXN1bHRzLCBmaWVsZCkgPT4ge1xuICAgIGNvbnN0IGZpZWxkTmFtZSA9IGZpZWxkLm1lbWJlci5uYW1lO1xuICAgIGZpZWxkLmRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgLy8gVGhlIGRlY29yYXRvciBlaXRoZXIgZG9lc24ndCBoYXZlIGFuIGFyZ3VtZW50IChASW5wdXQoKSkgaW4gd2hpY2ggY2FzZSB0aGUgcHJvcGVydHlcbiAgICAgIC8vIG5hbWUgaXMgdXNlZCwgb3IgaXQgaGFzIG9uZSBhcmd1bWVudCAoQE91dHB1dCgnbmFtZWQnKSkuXG4gICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmVzdWx0c1tmaWVsZE5hbWVdID0gZmllbGROYW1lO1xuICAgICAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgY29uc3QgcHJvcGVydHkgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSwgcHJvcGVydHksXG4gICAgICAgICAgICAgIGBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgcmVzb2x2ZSB0byBhIHN0cmluZ2ApO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdHNbZmllbGROYW1lXSA9IG1hcFZhbHVlUmVzb2x2ZXIocHJvcGVydHksIGZpZWxkTmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUb28gbWFueSBhcmd1bWVudHMuXG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgICAgIGBAJHtkZWNvcmF0b3IubmFtZX0gY2FuIGhhdmUgYXQgbW9zdCBvbmUgYXJndW1lbnQsIGdvdCAke1xuICAgICAgICAgICAgICAgIGRlY29yYXRvci5hcmdzLmxlbmd0aH0gYXJndW1lbnQocylgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSwge30gYXMge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXX0pO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlSW5wdXQocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZyk6IFtzdHJpbmcsIHN0cmluZ10ge1xuICByZXR1cm4gW3B1YmxpY05hbWUsIGludGVybmFsTmFtZV07XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVPdXRwdXQocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZykge1xuICByZXR1cm4gcHVibGljTmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgIGZpZWxkczoge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfVtdLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFIzUXVlcnlNZXRhZGF0YVtdIHtcbiAgcmV0dXJuIGZpZWxkcy5tYXAoKHttZW1iZXIsIGRlY29yYXRvcnN9KSA9PiB7XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZGVjb3JhdG9yc1swXTtcbiAgICBjb25zdCBub2RlID0gbWVtYmVyLm5vZGUgfHwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpO1xuXG4gICAgLy8gVGhyb3cgaW4gY2FzZSBvZiBgQElucHV0KCkgQENvbnRlbnRDaGlsZCgnZm9vJykgZm9vOiBhbnlgLCB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGluIEl2eVxuICAgIGlmIChtZW1iZXIuZGVjb3JhdG9ycyEuc29tZSh2ID0+IHYubmFtZSA9PT0gJ0lucHV0JykpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0NPTExJU0lPTiwgbm9kZSxcbiAgICAgICAgICAnQ2Fubm90IGNvbWJpbmUgQElucHV0IGRlY29yYXRvcnMgd2l0aCBxdWVyeSBkZWNvcmF0b3JzJyk7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQ09MTElTSU9OLCBub2RlLFxuICAgICAgICAgICdDYW5ub3QgaGF2ZSBtdWx0aXBsZSBxdWVyeSBkZWNvcmF0b3JzIG9uIHRoZSBzYW1lIGNsYXNzIG1lbWJlcicpO1xuICAgIH0gZWxzZSBpZiAoIWlzUHJvcGVydHlUeXBlTWVtYmVyKG1lbWJlcikpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX1VORVhQRUNURUQsIG5vZGUsXG4gICAgICAgICAgJ1F1ZXJ5IGRlY29yYXRvciBtdXN0IGdvIG9uIGEgcHJvcGVydHktdHlwZSBtZW1iZXInKTtcbiAgICB9XG4gICAgcmV0dXJuIGV4dHJhY3RRdWVyeU1ldGFkYXRhKFxuICAgICAgICBub2RlLCBkZWNvcmF0b3IubmFtZSwgZGVjb3JhdG9yLmFyZ3MgfHwgW10sIG1lbWJlci5uYW1lLCByZWZsZWN0b3IsIGV2YWx1YXRvcik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpc1Byb3BlcnR5VHlwZU1lbWJlcihtZW1iZXI6IENsYXNzTWVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLkdldHRlciB8fCBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLlNldHRlciB8fFxuICAgICAgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbn1cblxudHlwZSBTdHJpbmdNYXA8VD4gPSB7XG4gIFtrZXk6IHN0cmluZ106IFQ7XG59O1xuXG5mdW5jdGlvbiBldmFsdWF0ZUhvc3RFeHByZXNzaW9uQmluZGluZ3MoXG4gICAgaG9zdEV4cHI6IHRzLkV4cHJlc3Npb24sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFBhcnNlZEhvc3RCaW5kaW5ncyB7XG4gIGNvbnN0IGhvc3RNZXRhTWFwID0gZXZhbHVhdG9yLmV2YWx1YXRlKGhvc3RFeHByKTtcbiAgaWYgKCEoaG9zdE1ldGFNYXAgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgaG9zdEV4cHIsIGhvc3RNZXRhTWFwLCBgRGVjb3JhdG9yIGhvc3QgbWV0YWRhdGEgbXVzdCBiZSBhbiBvYmplY3RgKTtcbiAgfVxuICBjb25zdCBob3N0TWV0YWRhdGE6IFN0cmluZ01hcDxzdHJpbmd8RXhwcmVzc2lvbj4gPSB7fTtcbiAgaG9zdE1ldGFNYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgIC8vIFJlc29sdmUgRW51bSByZWZlcmVuY2VzIHRvIHRoZWlyIGRlY2xhcmVkIHZhbHVlLlxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVudW1WYWx1ZSkge1xuICAgICAgdmFsdWUgPSB2YWx1ZS5yZXNvbHZlZDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgaG9zdEV4cHIsIGtleSxcbiAgICAgICAgICBgRGVjb3JhdG9yIGhvc3QgbWV0YWRhdGEgbXVzdCBiZSBhIHN0cmluZyAtPiBzdHJpbmcgb2JqZWN0LCBidXQgZm91bmQgdW5wYXJzZWFibGUga2V5YCk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgaG9zdE1ldGFkYXRhW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICBob3N0TWV0YWRhdGFba2V5XSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodmFsdWUubm9kZSBhcyB0cy5FeHByZXNzaW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICBob3N0RXhwciwgdmFsdWUsXG4gICAgICAgICAgYERlY29yYXRvciBob3N0IG1ldGFkYXRhIG11c3QgYmUgYSBzdHJpbmcgLT4gc3RyaW5nIG9iamVjdCwgYnV0IGZvdW5kIHVucGFyc2VhYmxlIHZhbHVlYCk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBiaW5kaW5ncyA9IHBhcnNlSG9zdEJpbmRpbmdzKGhvc3RNZXRhZGF0YSk7XG5cbiAgY29uc3QgZXJyb3JzID0gdmVyaWZ5SG9zdEJpbmRpbmdzKGJpbmRpbmdzLCBjcmVhdGVTb3VyY2VTcGFuKGhvc3RFeHByKSk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgLy8gVE9ETzogcHJvdmlkZSBtb3JlIGdyYW51bGFyIGRpYWdub3N0aWMgYW5kIG91dHB1dCBzcGVjaWZpYyBob3N0IGV4cHJlc3Npb24gdGhhdFxuICAgICAgICAvLyB0cmlnZ2VyZWQgYW4gZXJyb3IgaW5zdGVhZCBvZiB0aGUgd2hvbGUgaG9zdCBvYmplY3QuXG4gICAgICAgIEVycm9yQ29kZS5IT1NUX0JJTkRJTkdfUEFSU0VfRVJST1IsIGhvc3RFeHByLFxuICAgICAgICBlcnJvcnMubWFwKChlcnJvcjogUGFyc2VFcnJvcikgPT4gZXJyb3IubXNnKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICByZXR1cm4gYmluZGluZ3M7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0SG9zdEJpbmRpbmdzKFxuICAgIG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvciwgY29yZU1vZHVsZTogc3RyaW5nfHVuZGVmaW5lZCxcbiAgICBtZXRhZGF0YT86IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+KTogUGFyc2VkSG9zdEJpbmRpbmdzIHtcbiAgbGV0IGJpbmRpbmdzOiBQYXJzZWRIb3N0QmluZGluZ3M7XG4gIGlmIChtZXRhZGF0YSAmJiBtZXRhZGF0YS5oYXMoJ2hvc3QnKSkge1xuICAgIGJpbmRpbmdzID0gZXZhbHVhdGVIb3N0RXhwcmVzc2lvbkJpbmRpbmdzKG1ldGFkYXRhLmdldCgnaG9zdCcpISwgZXZhbHVhdG9yKTtcbiAgfSBlbHNlIHtcbiAgICBiaW5kaW5ncyA9IHBhcnNlSG9zdEJpbmRpbmdzKHt9KTtcbiAgfVxuXG4gIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVycywgJ0hvc3RCaW5kaW5nJywgY29yZU1vZHVsZSlcbiAgICAgIC5mb3JFYWNoKCh7bWVtYmVyLCBkZWNvcmF0b3JzfSkgPT4ge1xuICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgICAgICBsZXQgaG9zdFByb3BlcnR5TmFtZTogc3RyaW5nID0gbWVtYmVyLm5hbWU7XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0QmluZGluZyBjYW4gaGF2ZSBhdCBtb3N0IG9uZSBhcmd1bWVudCwgZ290ICR7XG4gICAgICAgICAgICAgICAgICAgICAgZGVjb3JhdG9yLmFyZ3MubGVuZ3RofSBhcmd1bWVudChzKWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgICAgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLCByZXNvbHZlZCxcbiAgICAgICAgICAgICAgICAgIGBASG9zdEJpbmRpbmcncyBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGhvc3RQcm9wZXJ0eU5hbWUgPSByZXNvbHZlZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTaW5jZSB0aGlzIGlzIGEgZGVjb3JhdG9yLCB3ZSBrbm93IHRoYXQgdGhlIHZhbHVlIGlzIGEgY2xhc3MgbWVtYmVyLiBBbHdheXMgYWNjZXNzIGl0XG4gICAgICAgICAgLy8gdGhyb3VnaCBgdGhpc2Agc28gdGhhdCBmdXJ0aGVyIGRvd24gdGhlIGxpbmUgaXQgY2FuJ3QgYmUgY29uZnVzZWQgZm9yIGEgbGl0ZXJhbCB2YWx1ZVxuICAgICAgICAgIC8vIChlLmcuIGlmIHRoZXJlJ3MgYSBwcm9wZXJ0eSBjYWxsZWQgYHRydWVgKS4gVGhlcmUgaXMgbm8gc2l6ZSBwZW5hbHR5LCBiZWNhdXNlIGFsbFxuICAgICAgICAgIC8vIHZhbHVlcyAoZXhjZXB0IGxpdGVyYWxzKSBhcmUgY29udmVydGVkIHRvIGBjdHgucHJvcE5hbWVgIGV2ZW50dWFsbHkuXG4gICAgICAgICAgYmluZGluZ3MucHJvcGVydGllc1tob3N0UHJvcGVydHlOYW1lXSA9IGdldFNhZmVQcm9wZXJ0eUFjY2Vzc1N0cmluZygndGhpcycsIG1lbWJlci5uYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKG1lbWJlcnMsICdIb3N0TGlzdGVuZXInLCBjb3JlTW9kdWxlKVxuICAgICAgLmZvckVhY2goKHttZW1iZXIsIGRlY29yYXRvcnN9KSA9PiB7XG4gICAgICAgIGRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgICAgIGxldCBldmVudE5hbWU6IHN0cmluZyA9IG1lbWJlci5uYW1lO1xuICAgICAgICAgIGxldCBhcmdzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncyAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWNvcmF0b3IuYXJnc1syXSxcbiAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyIGNhbiBoYXZlIGF0IG1vc3QgdHdvIGFyZ3VtZW50c2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgICAgZGVjb3JhdG9yLmFyZ3NbMF0sIHJlc29sdmVkLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0TGlzdGVuZXIncyBldmVudCBuYW1lIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXZlbnROYW1lID0gcmVzb2x2ZWQ7XG5cbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IGRlY29yYXRvci5hcmdzWzFdO1xuICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZEFyZ3MgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMV0pO1xuICAgICAgICAgICAgICBpZiAoIWlzU3RyaW5nQXJyYXlPckRpZShyZXNvbHZlZEFyZ3MsICdASG9zdExpc3RlbmVyLmFyZ3MnLCBleHByZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgIGRlY29yYXRvci5hcmdzWzFdLCByZXNvbHZlZEFyZ3MsXG4gICAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyJ3Mgc2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcgYXJyYXlgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBhcmdzID0gcmVzb2x2ZWRBcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGJpbmRpbmdzLmxpc3RlbmVyc1tldmVudE5hbWVdID0gYCR7bWVtYmVyLm5hbWV9KCR7YXJncy5qb2luKCcsJyl9KWA7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIHJldHVybiBiaW5kaW5ncztcbn1cblxuY29uc3QgUVVFUllfVFlQRVMgPSBuZXcgU2V0KFtcbiAgJ0NvbnRlbnRDaGlsZCcsXG4gICdDb250ZW50Q2hpbGRyZW4nLFxuICAnVmlld0NoaWxkJyxcbiAgJ1ZpZXdDaGlsZHJlbicsXG5dKTtcbiJdfQ==