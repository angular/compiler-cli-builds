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
        (0, tslib_1.__extends)(DirectiveSymbol, _super);
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
                !(0, semantic_graph_1.isArrayEqual)(this.inputs.propertyNames, previousSymbol.inputs.propertyNames) ||
                !(0, semantic_graph_1.isArrayEqual)(this.outputs.propertyNames, previousSymbol.outputs.propertyNames) ||
                !(0, semantic_graph_1.isArrayEqual)(this.exportAs, previousSymbol.exportAs);
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
            if (!(0, semantic_graph_1.isArrayEqual)(Array.from(this.inputs), Array.from(previousSymbol.inputs), isInputMappingEqual) ||
                !(0, semantic_graph_1.isArrayEqual)(Array.from(this.outputs), Array.from(previousSymbol.outputs), isInputMappingEqual)) {
                return true;
            }
            // The type parameters of a directive are emitted into the type constructors in the type-check
            // block of a component, so if the type parameters are not considered equal then consider the
            // type-check API of this directive to be affected.
            if (!(0, semantic_graph_1.areTypeParametersEqual)(this.typeParameters, previousSymbol.typeParameters)) {
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
        if (!(0, semantic_graph_1.isArrayEqual)(current.ngTemplateGuards, previous.ngTemplateGuards, isTemplateGuardEqual)) {
            return false;
        }
        if (!(0, semantic_graph_1.isSetEqual)(current.coercedInputFields, previous.coercedInputFields)) {
            return false;
        }
        if (!(0, semantic_graph_1.isSetEqual)(current.restrictedInputFields, previous.restrictedInputFields)) {
            return false;
        }
        if (!(0, semantic_graph_1.isSetEqual)(current.stringLiteralInputFields, previous.stringLiteralInputFields)) {
            return false;
        }
        if (!(0, semantic_graph_1.isSetEqual)(current.undeclaredInputFields, previous.undeclaredInputFields)) {
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
        return (0, semantic_graph_1.isSymbolEqual)(current, previous);
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
                var decorator = (0, util_2.findAngularDecorator)(decorators, 'Directive', this.isCore);
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
                return { diagnostics: [(0, diagnostics_2.getUndecoratedClassWithAngularFeaturesDiagnostic)(node)] };
            }
            this.perf.eventCount(perf_1.PerfEvent.AnalyzeDirective);
            var directiveResult = extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.isCore, flags, this.annotateForClosureCompiler);
            if (directiveResult === undefined) {
                return {};
            }
            var analysis = directiveResult.metadata;
            var providersRequiringFactory = null;
            if (directiveResult !== undefined && directiveResult.decorator.has('providers')) {
                providersRequiringFactory = (0, util_2.resolveProvidersRequiringFactory)(directiveResult.decorator.get('providers'), this.reflector, this.evaluator);
            }
            return {
                analysis: {
                    inputs: directiveResult.inputs,
                    outputs: directiveResult.outputs,
                    meta: analysis,
                    classMetadata: (0, metadata_2.extractClassMetadata)(node, this.reflector, this.isCore, this.annotateForClosureCompiler),
                    baseClass: (0, util_2.readBaseClass)(node, this.reflector, this.evaluator),
                    typeCheckMeta: (0, util_1.extractDirectiveTypeCheckMeta)(node, directiveResult.inputs, this.reflector),
                    providersRequiringFactory: providersRequiringFactory,
                    isPoisoned: false,
                    isStructural: directiveResult.isStructural,
                }
            };
        };
        DirectiveDecoratorHandler.prototype.symbol = function (node, analysis) {
            var typeParameters = (0, semantic_graph_1.extractSemanticTypeParameters)(node);
            return new DirectiveSymbol(node, analysis.meta.selector, analysis.inputs, analysis.outputs, analysis.meta.exportAs, analysis.typeCheckMeta, typeParameters);
        };
        DirectiveDecoratorHandler.prototype.register = function (node, analysis) {
            // Register this directive's information with the `MetadataRegistry`. This ensures that
            // the information about the directive is available during the compile() phase.
            var ref = new imports_1.Reference(node);
            this.metaRegistry.registerDirectiveMetadata((0, tslib_1.__assign)((0, tslib_1.__assign)({ type: metadata_1.MetaType.Directive, ref: ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.meta.queries.map(function (query) { return query.propertyName; }), isComponent: false, baseClass: analysis.baseClass }, analysis.typeCheckMeta), { isPoisoned: analysis.isPoisoned, isStructural: analysis.isStructural }));
            this.injectableRegistry.registerInjectable(node);
        };
        DirectiveDecoratorHandler.prototype.resolve = function (node, analysis, symbol) {
            if (this.semanticDepGraphUpdater !== null && analysis.baseClass instanceof imports_1.Reference) {
                symbol.baseClass = this.semanticDepGraphUpdater.getSymbol(analysis.baseClass.node);
            }
            var diagnostics = [];
            if (analysis.providersRequiringFactory !== null &&
                analysis.meta.providers instanceof compiler_1.WrappedNodeExpr) {
                var providerDiagnostics = (0, diagnostics_2.getProviderDiagnostics)(analysis.providersRequiringFactory, analysis.meta.providers.node, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(providerDiagnostics), false));
            }
            var directiveDiagnostics = (0, diagnostics_2.getDirectiveDiagnostics)(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, 'Directive');
            if (directiveDiagnostics !== null) {
                diagnostics.push.apply(diagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(directiveDiagnostics), false));
            }
            return { diagnostics: diagnostics.length > 0 ? diagnostics : undefined };
        };
        DirectiveDecoratorHandler.prototype.compileFull = function (node, analysis, resolution, pool) {
            var fac = (0, factory_1.compileNgFactoryDefField)((0, util_2.toFactoryMetadata)(analysis.meta, compiler_1.FactoryTarget.Directive));
            var def = (0, compiler_1.compileDirectiveFromMetadata)(analysis.meta, pool, (0, compiler_1.makeBindingParser)());
            var classMetadata = analysis.classMetadata !== null ?
                (0, compiler_1.compileClassMetadata)(analysis.classMetadata).toStmt() :
                null;
            return (0, util_2.compileResults)(fac, def, classMetadata, 'ɵdir');
        };
        DirectiveDecoratorHandler.prototype.compilePartial = function (node, analysis, resolution) {
            var fac = (0, factory_1.compileDeclareFactory)((0, util_2.toFactoryMetadata)(analysis.meta, compiler_1.FactoryTarget.Directive));
            var def = (0, compiler_1.compileDeclareDirectiveFromMetadata)(analysis.meta);
            var classMetadata = analysis.classMetadata !== null ?
                (0, compiler_1.compileDeclareClassMetadata)(analysis.classMetadata).toStmt() :
                null;
            return (0, util_2.compileResults)(fac, def, classMetadata, 'ɵdir');
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
                    return member.decorators.some(function (decorator) { return FIELD_DECORATORS.some(function (decoratorName) { return (0, util_2.isAngularDecorator)(decorator, decoratorName, _this.isCore); }); });
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
            var meta = (0, util_2.unwrapExpression)(decorator.args[0]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, "@" + decorator.name + " argument must be an object literal");
            }
            directive = (0, reflection_1.reflectObjectLiteral)(meta);
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
        var inputsFromFields = parseDecoratedFields((0, reflection_1.filterToMembersWithDecorator)(decoratedElements, 'Input', coreModule), evaluator, resolveInput);
        // And outputs.
        var outputsFromMeta = parseFieldToPropertyMapping(directive, 'outputs', evaluator);
        var outputsFromFields = parseDecoratedFields((0, reflection_1.filterToMembersWithDecorator)(decoratedElements, 'Output', coreModule), evaluator, resolveOutput);
        // Construct the list of queries.
        var contentChildFromFields = queriesFromFields((0, reflection_1.filterToMembersWithDecorator)(decoratedElements, 'ContentChild', coreModule), reflector, evaluator);
        var contentChildrenFromFields = queriesFromFields((0, reflection_1.filterToMembersWithDecorator)(decoratedElements, 'ContentChildren', coreModule), reflector, evaluator);
        var queries = (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(contentChildFromFields), false), (0, tslib_1.__read)(contentChildrenFromFields), false);
        // Construct the list of view queries.
        var viewChildFromFields = queriesFromFields((0, reflection_1.filterToMembersWithDecorator)(decoratedElements, 'ViewChild', coreModule), reflector, evaluator);
        var viewChildrenFromFields = queriesFromFields((0, reflection_1.filterToMembersWithDecorator)(decoratedElements, 'ViewChildren', coreModule), reflector, evaluator);
        var viewQueries = (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(viewChildFromFields), false), (0, tslib_1.__read)(viewChildrenFromFields), false);
        if (directive.has('queries')) {
            var queriesFromDecorator = extractQueriesFromDecorator(directive.get('queries'), reflector, evaluator, isCore);
            queries.push.apply(queries, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(queriesFromDecorator.content), false));
            viewQueries.push.apply(viewQueries, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(queriesFromDecorator.view), false));
        }
        // Parse the selector.
        var selector = defaultSelector;
        if (directive.has('selector')) {
            var expr = directive.get('selector');
            var resolved = evaluator.evaluate(expr);
            if (typeof resolved !== 'string') {
                throw (0, diagnostics_2.createValueHasWrongTypeError)(expr, resolved, "selector must be a string");
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
                (0, util_2.wrapFunctionExpressionsInParens)(directive.get('providers')) :
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
                throw (0, diagnostics_2.createValueHasWrongTypeError)(expr, resolved, "exportAs must be a string");
            }
            exportAs = resolved.split(',').map(function (part) { return part.trim(); });
        }
        var rawCtorDeps = (0, util_2.getConstructorDependencies)(clazz, reflector, isCore);
        // Non-abstract directives (those with a selector) require valid constructor dependencies, whereas
        // abstract directives are allowed to have invalid dependencies, given that a subclass may call
        // the constructor explicitly.
        var ctorDeps = selector !== null ? (0, util_2.validateConstructorDependencies)(clazz, rawCtorDeps) :
            (0, util_2.unwrapConstructorDependencies)(rawCtorDeps);
        // Structural directives must have a `TemplateRef` dependency.
        var isStructural = ctorDeps !== null && ctorDeps !== 'invalid' &&
            ctorDeps.some(function (dep) { return (dep.token instanceof compiler_1.ExternalExpr) &&
                dep.token.value.moduleName === '@angular/core' &&
                dep.token.value.name === 'TemplateRef'; });
        // Detect if the component inherits from another class
        var usesInheritance = reflector.hasBaseClass(clazz);
        var type = (0, util_2.wrapTypeReference)(reflector, clazz);
        var internalType = new compiler_1.WrappedNodeExpr(reflector.getInternalNameOfClass(clazz));
        var inputs = metadata_1.ClassPropertyMapping.fromMappedObject((0, tslib_1.__assign)((0, tslib_1.__assign)({}, inputsFromMeta), inputsFromFields));
        var outputs = metadata_1.ClassPropertyMapping.fromMappedObject((0, tslib_1.__assign)((0, tslib_1.__assign)({}, outputsFromMeta), outputsFromFields));
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
            typeSourceSpan: (0, util_2.createSourceSpan)(clazz.name),
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
        var _a;
        if (args.length === 0) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, exprNode, "@" + name + " must have arguments");
        }
        var first = name === 'ViewChild' || name === 'ContentChild';
        var node = (_a = (0, util_2.tryUnwrapForwardRef)(args[0], reflector)) !== null && _a !== void 0 ? _a : args[0];
        var arg = evaluator.evaluate(node);
        /** Whether or not this query should collect only static results (see view/api.ts)  */
        var isStatic = false;
        // Extract the predicate
        var predicate = null;
        if (arg instanceof imports_1.Reference || arg instanceof partial_evaluator_1.DynamicValue) {
            // References and predicates that could not be evaluated statically are emitted as is.
            predicate = new compiler_1.WrappedNodeExpr(node);
        }
        else if (typeof arg === 'string') {
            predicate = [arg];
        }
        else if (isStringArrayOrDie(arg, "@" + name + " predicate", node)) {
            predicate = arg;
        }
        else {
            throw (0, diagnostics_2.createValueHasWrongTypeError)(node, arg, "@" + name + " predicate cannot be interpreted");
        }
        // Extract the read and descendants options.
        var read = null;
        // The default value for descendants is true for every decorator except @ContentChildren.
        var descendants = name !== 'ContentChildren';
        var emitDistinctChangesOnly = core_1.emitDistinctChangesOnlyDefaultValue;
        if (args.length === 2) {
            var optionsExpr = (0, util_2.unwrapExpression)(args[1]);
            if (!ts.isObjectLiteralExpression(optionsExpr)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, optionsExpr, "@" + name + " options must be an object literal");
            }
            var options = (0, reflection_1.reflectObjectLiteral)(optionsExpr);
            if (options.has('read')) {
                read = new compiler_1.WrappedNodeExpr(options.get('read'));
            }
            if (options.has('descendants')) {
                var descendantsExpr = options.get('descendants');
                var descendantsValue = evaluator.evaluate(descendantsExpr);
                if (typeof descendantsValue !== 'boolean') {
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(descendantsExpr, descendantsValue, "@" + name + " options.descendants must be a boolean");
                }
                descendants = descendantsValue;
            }
            if (options.has('emitDistinctChangesOnly')) {
                var emitDistinctChangesOnlyExpr = options.get('emitDistinctChangesOnly');
                var emitDistinctChangesOnlyValue = evaluator.evaluate(emitDistinctChangesOnlyExpr);
                if (typeof emitDistinctChangesOnlyValue !== 'boolean') {
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(emitDistinctChangesOnlyExpr, emitDistinctChangesOnlyValue, "@" + name + " options.emitDistinctChangesOnly must be a boolean");
                }
                emitDistinctChangesOnly = emitDistinctChangesOnlyValue;
            }
            if (options.has('static')) {
                var staticValue = evaluator.evaluate(options.get('static'));
                if (typeof staticValue !== 'boolean') {
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(node, staticValue, "@" + name + " options.static must be a boolean");
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
        (0, reflection_1.reflectObjectLiteral)(queryData).forEach(function (queryExpr, propertyName) {
            queryExpr = (0, util_2.unwrapExpression)(queryExpr);
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
                throw (0, diagnostics_2.createValueHasWrongTypeError)(node, value[i], "Failed to resolve " + name + " at position " + i + " to a string");
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
            throw (0, diagnostics_2.createValueHasWrongTypeError)(expression, value, "Failed to resolve @Directive." + field + " to a string array");
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
            var _a = (0, tslib_1.__read)(value.split(':', 2).map(function (str) { return str.trim(); }), 2), field = _a[0], property = _a[1];
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
                        throw (0, diagnostics_2.createValueHasWrongTypeError)(reflection_1.Decorator.nodeForError(decorator), property, "@" + decorator.name + " decorator argument must resolve to a string");
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
            throw (0, diagnostics_2.createValueHasWrongTypeError)(hostExpr, hostMetaMap, "Decorator host metadata must be an object");
        }
        var hostMetadata = {};
        hostMetaMap.forEach(function (value, key) {
            // Resolve Enum references to their declared value.
            if (value instanceof partial_evaluator_1.EnumValue) {
                value = value.resolved;
            }
            if (typeof key !== 'string') {
                throw (0, diagnostics_2.createValueHasWrongTypeError)(hostExpr, key, "Decorator host metadata must be a string -> string object, but found unparseable key");
            }
            if (typeof value == 'string') {
                hostMetadata[key] = value;
            }
            else if (value instanceof partial_evaluator_1.DynamicValue) {
                hostMetadata[key] = new compiler_1.WrappedNodeExpr(value.node);
            }
            else {
                throw (0, diagnostics_2.createValueHasWrongTypeError)(hostExpr, value, "Decorator host metadata must be a string -> string object, but found unparseable value");
            }
        });
        var bindings = (0, compiler_1.parseHostBindings)(hostMetadata);
        var errors = (0, compiler_1.verifyHostBindings)(bindings, (0, util_2.createSourceSpan)(hostExpr));
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
            bindings = (0, compiler_1.parseHostBindings)({});
        }
        (0, reflection_1.filterToMembersWithDecorator)(members, 'HostBinding', coreModule)
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
                        throw (0, diagnostics_2.createValueHasWrongTypeError)(reflection_1.Decorator.nodeForError(decorator), resolved, "@HostBinding's argument must be a string");
                    }
                    hostPropertyName = resolved;
                }
                // Since this is a decorator, we know that the value is a class member. Always access it
                // through `this` so that further down the line it can't be confused for a literal value
                // (e.g. if there's a property called `true`). There is no size penalty, because all
                // values (except literals) are converted to `ctx.propName` eventually.
                bindings.properties[hostPropertyName] = (0, compiler_1.getSafePropertyAccessString)('this', member.name);
            });
        });
        (0, reflection_1.filterToMembersWithDecorator)(members, 'HostListener', coreModule)
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
                        throw (0, diagnostics_2.createValueHasWrongTypeError)(decorator.args[0], resolved, "@HostListener's event name argument must be a string");
                    }
                    eventName = resolved;
                    if (decorator.args.length === 2) {
                        var expression = decorator.args[1];
                        var resolvedArgs = evaluator.evaluate(decorator.args[1]);
                        if (!isStringArrayOrDie(resolvedArgs, '@HostListener.args', expression)) {
                            throw (0, diagnostics_2.createValueHasWrongTypeError)(decorator.args[1], resolvedArgs, "@HostListener's second argument must be a string array");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBMmE7SUFDM2EsbURBQStFO0lBQy9FLCtCQUFpQztJQUVqQywyRUFBa0U7SUFDbEUsbUVBQXdDO0lBQ3hDLDZGQUFnTjtJQUNoTixxRUFBNE07SUFDNU0sMEVBQXNFO0lBQ3RFLHVGQUFrRjtJQUNsRiw2REFBbUQ7SUFDbkQseUVBQStKO0lBRS9KLHVFQUE4STtJQUU5SSwyRkFBOEo7SUFDOUosbUZBQTBFO0lBQzFFLHFGQUFnRDtJQUNoRCw2RUFBNlY7SUFFN1YsSUFBTSxZQUFZLEdBQTRCLEVBQUUsQ0FBQztJQUNqRCxJQUFNLGdCQUFnQixHQUFHO1FBQ3ZCLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsYUFBYTtRQUNoRyxjQUFjO0tBQ2YsQ0FBQztJQUNGLElBQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDO1FBQzlCLGFBQWEsRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0I7UUFDOUYsb0JBQW9CLEVBQUUsdUJBQXVCO0tBQzlDLENBQUMsQ0FBQztJQWNIOzs7T0FHRztJQUNIO1FBQXFDLGdEQUFjO1FBR2pELHlCQUNJLElBQXNCLEVBQWtCLFFBQXFCLEVBQzdDLE1BQTRCLEVBQWtCLE9BQTZCLEVBQzNFLFFBQXVCLEVBQ3ZCLGFBQXFDLEVBQ3JDLGNBQTRDO1lBTGhFLFlBTUUsa0JBQU0sSUFBSSxDQUFDLFNBQ1o7WUFOMkMsY0FBUSxHQUFSLFFBQVEsQ0FBYTtZQUM3QyxZQUFNLEdBQU4sTUFBTSxD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R0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNyQyxJQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDM0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxVQUFVLENBQUMsRUFBRTs0QkFDdkUsTUFBTSxJQUFBLDBDQUE0QixFQUM5QixTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFDL0Isd0RBQXdELENBQUMsQ0FBQzt5QkFDL0Q7d0JBQ0QsSUFBSSxHQUFHLFlBQVksQ0FBQztxQkFDckI7aUJBQ0Y7Z0JBRUQsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBTSxNQUFNLENBQUMsSUFBSSxTQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQUcsQ0FBQztZQUN0RSxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ1AsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQTdFRCxrREE2RUM7SUFFRCxJQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUMxQixjQUFjO1FBQ2QsaUJBQWlCO1FBQ2pCLFdBQVc7UUFDWCxjQUFjO0tBQ2YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZUNsYXNzTWV0YWRhdGEsIGNvbXBpbGVEZWNsYXJlQ2xhc3NNZXRhZGF0YSwgY29tcGlsZURlY2xhcmVEaXJlY3RpdmVGcm9tTWV0YWRhdGEsIGNvbXBpbGVEaXJlY3RpdmVGcm9tTWV0YWRhdGEsIENvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBGYWN0b3J5VGFyZ2V0LCBnZXRTYWZlUHJvcGVydHlBY2Nlc3NTdHJpbmcsIG1ha2VCaW5kaW5nUGFyc2VyLCBQYXJzZWRIb3N0QmluZGluZ3MsIFBhcnNlRXJyb3IsIHBhcnNlSG9zdEJpbmRpbmdzLCBSM0NsYXNzTWV0YWRhdGEsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFIzRmFjdG9yeU1ldGFkYXRhLCBSM1F1ZXJ5TWV0YWRhdGEsIFN0YXRlbWVudCwgdmVyaWZ5SG9zdEJpbmRpbmdzLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7ZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlEZWZhdWx0VmFsdWV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyL3NyYy9jb3JlJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7YXJlVHlwZVBhcmFtZXRlcnNFcXVhbCwgZXh0cmFjdFNlbWFudGljVHlwZVBhcmFtZXRlcnMsIGlzQXJyYXlFcXVhbCwgaXNTZXRFcXVhbCwgaXNTeW1ib2xFcXVhbCwgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIsIFNlbWFudGljU3ltYm9sLCBTZW1hbnRpY1R5cGVQYXJhbWV0ZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7QmluZGluZ1Byb3BlcnR5TmFtZSwgQ2xhc3NQcm9wZXJ0eU1hcHBpbmcsIENsYXNzUHJvcGVydHlOYW1lLCBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnksIE1ldGFUeXBlLCBUZW1wbGF0ZUd1YXJkTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEvc3JjL3V0aWwnO1xuaW1wb3J0IHtEeW5hbWljVmFsdWUsIEVudW1WYWx1ZSwgUGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtQZXJmRXZlbnQsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIERlY29yYXRvciwgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJGbGFncywgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Y3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvciwgZ2V0RGlyZWN0aXZlRGlhZ25vc3RpY3MsIGdldFByb3ZpZGVyRGlhZ25vc3RpY3MsIGdldFVuZGVjb3JhdGVkQ2xhc3NXaXRoQW5ndWxhckZlYXR1cmVzRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2NvbXBpbGVEZWNsYXJlRmFjdG9yeSwgY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkfSBmcm9tICcuL2ZhY3RvcnknO1xuaW1wb3J0IHtleHRyYWN0Q2xhc3NNZXRhZGF0YX0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge2NvbXBpbGVSZXN1bHRzLCBjcmVhdGVTb3VyY2VTcGFuLCBmaW5kQW5ndWxhckRlY29yYXRvciwgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIGlzQW5ndWxhckRlY29yYXRvciwgcmVhZEJhc2VDbGFzcywgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIHRvRmFjdG9yeU1ldGFkYXRhLCB0cnlVbndyYXBGb3J3YXJkUmVmLCB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgdW53cmFwRXhwcmVzc2lvbiwgdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucywgd3JhcFR5cGVSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX09CSkVDVDoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbmNvbnN0IEZJRUxEX0RFQ09SQVRPUlMgPSBbXG4gICdJbnB1dCcsICdPdXRwdXQnLCAnVmlld0NoaWxkJywgJ1ZpZXdDaGlsZHJlbicsICdDb250ZW50Q2hpbGQnLCAnQ29udGVudENoaWxkcmVuJywgJ0hvc3RCaW5kaW5nJyxcbiAgJ0hvc3RMaXN0ZW5lcidcbl07XG5jb25zdCBMSUZFQ1lDTEVfSE9PS1MgPSBuZXcgU2V0KFtcbiAgJ25nT25DaGFuZ2VzJywgJ25nT25Jbml0JywgJ25nT25EZXN0cm95JywgJ25nRG9DaGVjaycsICduZ0FmdGVyVmlld0luaXQnLCAnbmdBZnRlclZpZXdDaGVja2VkJyxcbiAgJ25nQWZ0ZXJDb250ZW50SW5pdCcsICduZ0FmdGVyQ29udGVudENoZWNrZWQnXG5dKTtcblxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVIYW5kbGVyRGF0YSB7XG4gIGJhc2VDbGFzczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+fCdkeW5hbWljJ3xudWxsO1xuICB0eXBlQ2hlY2tNZXRhOiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhO1xuICBtZXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhO1xuICBjbGFzc01ldGFkYXRhOiBSM0NsYXNzTWV0YWRhdGF8bnVsbDtcbiAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcbiAgaW5wdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZztcbiAgb3V0cHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmc7XG4gIGlzUG9pc29uZWQ6IGJvb2xlYW47XG4gIGlzU3RydWN0dXJhbDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEFuZ3VsYXIgZGlyZWN0aXZlLiBDb21wb25lbnRzIGFyZSByZXByZXNlbnRlZCBieSBgQ29tcG9uZW50U3ltYm9sYCwgd2hpY2ggaW5oZXJpdHNcbiAqIGZyb20gdGhpcyBzeW1ib2wuXG4gKi9cbmV4cG9ydCBjbGFzcyBEaXJlY3RpdmVTeW1ib2wgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbCB7XG4gIGJhc2VDbGFzczogU2VtYW50aWNTeW1ib2x8bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBwdWJsaWMgcmVhZG9ubHkgc2VsZWN0b3I6IHN0cmluZ3xudWxsLFxuICAgICAgcHVibGljIHJlYWRvbmx5IGlucHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmcsIHB1YmxpYyByZWFkb25seSBvdXRwdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZyxcbiAgICAgIHB1YmxpYyByZWFkb25seSBleHBvcnRBczogc3RyaW5nW118bnVsbCxcbiAgICAgIHB1YmxpYyByZWFkb25seSB0eXBlQ2hlY2tNZXRhOiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLFxuICAgICAgcHVibGljIHJlYWRvbmx5IHR5cGVQYXJhbWV0ZXJzOiBTZW1hbnRpY1R5cGVQYXJhbWV0ZXJbXXxudWxsKSB7XG4gICAgc3VwZXIoZGVjbCk7XG4gIH1cblxuICBvdmVycmlkZSBpc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIC8vIE5vdGU6IHNpbmNlIGNvbXBvbmVudHMgYW5kIGRpcmVjdGl2ZXMgaGF2ZSBleGFjdGx5IHRoZSBzYW1lIGl0ZW1zIGNvbnRyaWJ1dGluZyB0byB0aGVpclxuICAgIC8vIHB1YmxpYyBBUEksIGl0IGlzIG9rYXkgZm9yIGEgZGlyZWN0aXZlIHRvIGNoYW5nZSBpbnRvIGEgY29tcG9uZW50IGFuZCB2aWNlIHZlcnNhIHdpdGhvdXRcbiAgICAvLyB0aGUgQVBJIGJlaW5nIGFmZmVjdGVkLlxuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgRGlyZWN0aXZlU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRGlyZWN0aXZlcyBhbmQgY29tcG9uZW50cyBoYXZlIGEgcHVibGljIEFQSSBvZjpcbiAgICAvLyAgMS4gVGhlaXIgc2VsZWN0b3IuXG4gICAgLy8gIDIuIFRoZSBiaW5kaW5nIG5hbWVzIG9mIHRoZWlyIGlucHV0cyBhbmQgb3V0cHV0czsgYSBjaGFuZ2UgaW4gb3JkZXJpbmcgaXMgYWxzbyBjb25zaWRlcmVkXG4gICAgLy8gICAgIHRvIGJlIGEgY2hhbmdlIGluIHB1YmxpYyBBUEkuXG4gICAgLy8gIDMuIFRoZSBsaXN0IG9mIGV4cG9ydEFzIG5hbWVzIGFuZCBpdHMgb3JkZXJpbmcuXG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3IgIT09IHByZXZpb3VzU3ltYm9sLnNlbGVjdG9yIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy5pbnB1dHMucHJvcGVydHlOYW1lcywgcHJldmlvdXNTeW1ib2wuaW5wdXRzLnByb3BlcnR5TmFtZXMpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy5vdXRwdXRzLnByb3BlcnR5TmFtZXMsIHByZXZpb3VzU3ltYm9sLm91dHB1dHMucHJvcGVydHlOYW1lcykgfHxcbiAgICAgICAgIWlzQXJyYXlFcXVhbCh0aGlzLmV4cG9ydEFzLCBwcmV2aW91c1N5bWJvbC5leHBvcnRBcyk7XG4gIH1cblxuICBvdmVycmlkZSBpc1R5cGVDaGVja0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIC8vIElmIHRoZSBwdWJsaWMgQVBJIG9mIHRoZSBkaXJlY3RpdmUgaGFzIGNoYW5nZWQsIHRoZW4gc28gaGFzIGl0cyB0eXBlLWNoZWNrIEFQSS5cbiAgICBpZiAodGhpcy5pc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBEaXJlY3RpdmVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgdHlwZS1jaGVjayBibG9jayBhbHNvIGRlcGVuZHMgb24gdGhlIGNsYXNzIHByb3BlcnR5IG5hbWVzLCBhcyB3cml0ZXMgcHJvcGVydHkgYmluZGluZ3NcbiAgICAvLyBkaXJlY3RseSBpbnRvIHRoZSBiYWNraW5nIGZpZWxkcy5cbiAgICBpZiAoIWlzQXJyYXlFcXVhbChcbiAgICAgICAgICAgIEFycmF5LmZyb20odGhpcy5pbnB1dHMpLCBBcnJheS5mcm9tKHByZXZpb3VzU3ltYm9sLmlucHV0cyksIGlzSW5wdXRNYXBwaW5nRXF1YWwpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwoXG4gICAgICAgICAgICBBcnJheS5mcm9tKHRoaXMub3V0cHV0cyksIEFycmF5LmZyb20ocHJldmlvdXNTeW1ib2wub3V0cHV0cyksIGlzSW5wdXRNYXBwaW5nRXF1YWwpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgdHlwZSBwYXJhbWV0ZXJzIG9mIGEgZGlyZWN0aXZlIGFyZSBlbWl0dGVkIGludG8gdGhlIHR5cGUgY29uc3RydWN0b3JzIGluIHRoZSB0eXBlLWNoZWNrXG4gICAgLy8gYmxvY2sgb2YgYSBjb21wb25lbnQsIHNvIGlmIHRoZSB0eXBlIHBhcmFtZXRlcnMgYXJlIG5vdCBjb25zaWRlcmVkIGVxdWFsIHRoZW4gY29uc2lkZXIgdGhlXG4gICAgLy8gdHlwZS1jaGVjayBBUEkgb2YgdGhpcyBkaXJlY3RpdmUgdG8gYmUgYWZmZWN0ZWQuXG4gICAgaWYgKCFhcmVUeXBlUGFyYW1ldGVyc0VxdWFsKHRoaXMudHlwZVBhcmFtZXRlcnMsIHByZXZpb3VzU3ltYm9sLnR5cGVQYXJhbWV0ZXJzKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gVGhlIHR5cGUtY2hlY2sgbWV0YWRhdGEgaXMgdXNlZCBkdXJpbmcgVENCIGNvZGUgZ2VuZXJhdGlvbiwgc28gYW55IGNoYW5nZXMgc2hvdWxkIGludmFsaWRhdGVcbiAgICAvLyBwcmlvciB0eXBlLWNoZWNrIGZpbGVzLlxuICAgIGlmICghaXNUeXBlQ2hlY2tNZXRhRXF1YWwodGhpcy50eXBlQ2hlY2tNZXRhLCBwcmV2aW91c1N5bWJvbC50eXBlQ2hlY2tNZXRhKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ2hhbmdpbmcgdGhlIGJhc2UgY2xhc3Mgb2YgYSBkaXJlY3RpdmUgbWVhbnMgdGhhdCBpdHMgaW5wdXRzL291dHB1dHMgZXRjIG1heSBoYXZlIGNoYW5nZWQsXG4gICAgLy8gc28gdGhlIHR5cGUtY2hlY2sgYmxvY2sgb2YgY29tcG9uZW50cyB0aGF0IHVzZSB0aGlzIGRpcmVjdGl2ZSBuZWVkcyB0byBiZSByZWdlbmVyYXRlZC5cbiAgICBpZiAoIWlzQmFzZUNsYXNzRXF1YWwodGhpcy5iYXNlQ2xhc3MsIHByZXZpb3VzU3ltYm9sLmJhc2VDbGFzcykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0lucHV0TWFwcGluZ0VxdWFsKFxuICAgIGN1cnJlbnQ6IFtDbGFzc1Byb3BlcnR5TmFtZSwgQmluZGluZ1Byb3BlcnR5TmFtZV0sXG4gICAgcHJldmlvdXM6IFtDbGFzc1Byb3BlcnR5TmFtZSwgQmluZGluZ1Byb3BlcnR5TmFtZV0pOiBib29sZWFuIHtcbiAgcmV0dXJuIGN1cnJlbnRbMF0gPT09IHByZXZpb3VzWzBdICYmIGN1cnJlbnRbMV0gPT09IHByZXZpb3VzWzFdO1xufVxuXG5mdW5jdGlvbiBpc1R5cGVDaGVja01ldGFFcXVhbChcbiAgICBjdXJyZW50OiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBwcmV2aW91czogRGlyZWN0aXZlVHlwZUNoZWNrTWV0YSk6IGJvb2xlYW4ge1xuICBpZiAoY3VycmVudC5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkICE9PSBwcmV2aW91cy5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChjdXJyZW50LmlzR2VuZXJpYyAhPT0gcHJldmlvdXMuaXNHZW5lcmljKSB7XG4gICAgLy8gTm90ZTogY2hhbmdlcyBpbiB0aGUgbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycyBpcyBhbHNvIGNvbnNpZGVyZWQgaW4gYGFyZVR5cGVQYXJhbWV0ZXJzRXF1YWxgXG4gICAgLy8gc28gdGhpcyBjaGVjayBpcyB0ZWNobmljYWxseSBub3QgbmVlZGVkOyBpdCBpcyBkb25lIGFueXdheSBmb3IgY29tcGxldGVuZXNzIGluIHRlcm1zIG9mXG4gICAgLy8gd2hldGhlciB0aGUgYERpcmVjdGl2ZVR5cGVDaGVja01ldGFgIHN0cnVjdCBpdHNlbGYgY29tcGFyZXMgZXF1YWwgb3Igbm90LlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzQXJyYXlFcXVhbChjdXJyZW50Lm5nVGVtcGxhdGVHdWFyZHMsIHByZXZpb3VzLm5nVGVtcGxhdGVHdWFyZHMsIGlzVGVtcGxhdGVHdWFyZEVxdWFsKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzU2V0RXF1YWwoY3VycmVudC5jb2VyY2VkSW5wdXRGaWVsZHMsIHByZXZpb3VzLmNvZXJjZWRJbnB1dEZpZWxkcykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFpc1NldEVxdWFsKGN1cnJlbnQucmVzdHJpY3RlZElucHV0RmllbGRzLCBwcmV2aW91cy5yZXN0cmljdGVkSW5wdXRGaWVsZHMpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghaXNTZXRFcXVhbChjdXJyZW50LnN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcywgcHJldmlvdXMuc3RyaW5nTGl0ZXJhbElucHV0RmllbGRzKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzU2V0RXF1YWwoY3VycmVudC51bmRlY2xhcmVkSW5wdXRGaWVsZHMsIHByZXZpb3VzLnVuZGVjbGFyZWRJbnB1dEZpZWxkcykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzVGVtcGxhdGVHdWFyZEVxdWFsKGN1cnJlbnQ6IFRlbXBsYXRlR3VhcmRNZXRhLCBwcmV2aW91czogVGVtcGxhdGVHdWFyZE1ldGEpOiBib29sZWFuIHtcbiAgcmV0dXJuIGN1cnJlbnQuaW5wdXROYW1lID09PSBwcmV2aW91cy5pbnB1dE5hbWUgJiYgY3VycmVudC50eXBlID09PSBwcmV2aW91cy50eXBlO1xufVxuXG5mdW5jdGlvbiBpc0Jhc2VDbGFzc0VxdWFsKGN1cnJlbnQ6IFNlbWFudGljU3ltYm9sfG51bGwsIHByZXZpb3VzOiBTZW1hbnRpY1N5bWJvbHxudWxsKTogYm9vbGVhbiB7XG4gIGlmIChjdXJyZW50ID09PSBudWxsIHx8IHByZXZpb3VzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGN1cnJlbnQgPT09IHByZXZpb3VzO1xuICB9XG5cbiAgcmV0dXJuIGlzU3ltYm9sRXF1YWwoY3VycmVudCwgcHJldmlvdXMpO1xufVxuXG5leHBvcnQgY2xhc3MgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3J8bnVsbCwgRGlyZWN0aXZlSGFuZGxlckRhdGEsIERpcmVjdGl2ZVN5bWJvbCwgdW5rbm93bj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksXG4gICAgICBwcml2YXRlIGlzQ29yZTogYm9vbGVhbiwgcHJpdmF0ZSBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjogU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXJ8bnVsbCxcbiAgICAgIHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzOiBib29sZWFuLCBwcml2YXRlIHBlcmY6IFBlcmZSZWNvcmRlcikge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgcmVhZG9ubHkgbmFtZSA9IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIubmFtZTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6XG4gICAgICBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yfG51bGw+fHVuZGVmaW5lZCB7XG4gICAgLy8gSWYgYSBjbGFzcyBpcyB1bmRlY29yYXRlZCBidXQgdXNlcyBBbmd1bGFyIGZlYXR1cmVzLCB3ZSBkZXRlY3QgaXQgYXMgYW5cbiAgICAvLyBhYnN0cmFjdCBkaXJlY3RpdmUuIFRoaXMgaXMgYW4gdW5zdXBwb3J0ZWQgcGF0dGVybiBhcyBvZiB2MTAsIGJ1dCB3ZSB3YW50XG4gICAgLy8gdG8gc3RpbGwgZGV0ZWN0IHRoZXNlIHBhdHRlcm5zIHNvIHRoYXQgd2UgY2FuIHJlcG9ydCBkaWFnbm9zdGljcywgb3IgY29tcGlsZVxuICAgIC8vIHRoZW0gZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGluIG5nY2MuXG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICBjb25zdCBhbmd1bGFyRmllbGQgPSB0aGlzLmZpbmRDbGFzc0ZpZWxkV2l0aEFuZ3VsYXJGZWF0dXJlcyhub2RlKTtcbiAgICAgIHJldHVybiBhbmd1bGFyRmllbGQgPyB7dHJpZ2dlcjogYW5ndWxhckZpZWxkLm5vZGUsIGRlY29yYXRvcjogbnVsbCwgbWV0YWRhdGE6IG51bGx9IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdEaXJlY3RpdmUnLCB0aGlzLmlzQ29yZSk7XG4gICAgICByZXR1cm4gZGVjb3JhdG9yID8ge3RyaWdnZXI6IGRlY29yYXRvci5ub2RlLCBkZWNvcmF0b3IsIG1ldGFkYXRhOiBkZWNvcmF0b3J9IDogdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3J8bnVsbD4sIGZsYWdzID0gSGFuZGxlckZsYWdzLk5PTkUpOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8RGlyZWN0aXZlSGFuZGxlckRhdGE+IHtcbiAgICAvLyBTa2lwIHByb2Nlc3Npbmcgb2YgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIGlmIGNvbXBpbGF0aW9uIG9mIHVuZGVjb3JhdGVkIGNsYXNzZXNcbiAgICAvLyB3aXRoIEFuZ3VsYXIgZmVhdHVyZXMgaXMgZGlzYWJsZWQuIFByZXZpb3VzbHkgaW4gbmd0c2MsIHN1Y2ggY2xhc3NlcyBoYXZlIGFsd2F5c1xuICAgIC8vIGJlZW4gcHJvY2Vzc2VkLCBidXQgd2Ugd2FudCB0byBlbmZvcmNlIGEgY29uc2lzdGVudCBkZWNvcmF0b3IgbWVudGFsIG1vZGVsLlxuICAgIC8vIFNlZTogaHR0cHM6Ly92OS5hbmd1bGFyLmlvL2d1aWRlL21pZ3JhdGlvbi11bmRlY29yYXRlZC1jbGFzc2VzLlxuICAgIGlmICh0aGlzLmNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzID09PSBmYWxzZSAmJiBkZWNvcmF0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3M6IFtnZXRVbmRlY29yYXRlZENsYXNzV2l0aEFuZ3VsYXJGZWF0dXJlc0RpYWdub3N0aWMobm9kZSldfTtcbiAgICB9XG5cbiAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuQW5hbHl6ZURpcmVjdGl2ZSk7XG5cbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPSBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmlzQ29yZSwgZmxhZ3MsXG4gICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpO1xuICAgIGlmIChkaXJlY3RpdmVSZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgICBjb25zdCBhbmFseXNpcyA9IGRpcmVjdGl2ZVJlc3VsdC5tZXRhZGF0YTtcblxuICAgIGxldCBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsID0gbnVsbDtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ICE9PSB1bmRlZmluZWQgJiYgZGlyZWN0aXZlUmVzdWx0LmRlY29yYXRvci5oYXMoJ3Byb3ZpZGVycycpKSB7XG4gICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ID0gcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkoXG4gICAgICAgICAgZGlyZWN0aXZlUmVzdWx0LmRlY29yYXRvci5nZXQoJ3Byb3ZpZGVycycpISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgaW5wdXRzOiBkaXJlY3RpdmVSZXN1bHQuaW5wdXRzLFxuICAgICAgICBvdXRwdXRzOiBkaXJlY3RpdmVSZXN1bHQub3V0cHV0cyxcbiAgICAgICAgbWV0YTogYW5hbHlzaXMsXG4gICAgICAgIGNsYXNzTWV0YWRhdGE6IGV4dHJhY3RDbGFzc01ldGFkYXRhKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlLCB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSxcbiAgICAgICAgYmFzZUNsYXNzOiByZWFkQmFzZUNsYXNzKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciksXG4gICAgICAgIHR5cGVDaGVja01ldGE6IGV4dHJhY3REaXJlY3RpdmVUeXBlQ2hlY2tNZXRhKG5vZGUsIGRpcmVjdGl2ZVJlc3VsdC5pbnB1dHMsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgICAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSxcbiAgICAgICAgaXNQb2lzb25lZDogZmFsc2UsXG4gICAgICAgIGlzU3RydWN0dXJhbDogZGlyZWN0aXZlUmVzdWx0LmlzU3RydWN0dXJhbCxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgc3ltYm9sKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxEaXJlY3RpdmVIYW5kbGVyRGF0YT4pOiBEaXJlY3RpdmVTeW1ib2wge1xuICAgIGNvbnN0IHR5cGVQYXJhbWV0ZXJzID0gZXh0cmFjdFNlbWFudGljVHlwZVBhcmFtZXRlcnMobm9kZSk7XG5cbiAgICByZXR1cm4gbmV3IERpcmVjdGl2ZVN5bWJvbChcbiAgICAgICAgbm9kZSwgYW5hbHlzaXMubWV0YS5zZWxlY3RvciwgYW5hbHlzaXMuaW5wdXRzLCBhbmFseXNpcy5vdXRwdXRzLCBhbmFseXNpcy5tZXRhLmV4cG9ydEFzLFxuICAgICAgICBhbmFseXNpcy50eXBlQ2hlY2tNZXRhLCB0eXBlUGFyYW1ldGVycyk7XG4gIH1cblxuICByZWdpc3Rlcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8RGlyZWN0aXZlSGFuZGxlckRhdGE+KTogdm9pZCB7XG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBkaXJlY3RpdmUncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBgTWV0YWRhdGFSZWdpc3RyeWAuIFRoaXMgZW5zdXJlcyB0aGF0XG4gICAgLy8gdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBkaXJlY3RpdmUgaXMgYXZhaWxhYmxlIGR1cmluZyB0aGUgY29tcGlsZSgpIHBoYXNlLlxuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgdGhpcy5tZXRhUmVnaXN0cnkucmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YSh7XG4gICAgICB0eXBlOiBNZXRhVHlwZS5EaXJlY3RpdmUsXG4gICAgICByZWYsXG4gICAgICBuYW1lOiBub2RlLm5hbWUudGV4dCxcbiAgICAgIHNlbGVjdG9yOiBhbmFseXNpcy5tZXRhLnNlbGVjdG9yLFxuICAgICAgZXhwb3J0QXM6IGFuYWx5c2lzLm1ldGEuZXhwb3J0QXMsXG4gICAgICBpbnB1dHM6IGFuYWx5c2lzLmlucHV0cyxcbiAgICAgIG91dHB1dHM6IGFuYWx5c2lzLm91dHB1dHMsXG4gICAgICBxdWVyaWVzOiBhbmFseXNpcy5tZXRhLnF1ZXJpZXMubWFwKHF1ZXJ5ID0+IHF1ZXJ5LnByb3BlcnR5TmFtZSksXG4gICAgICBpc0NvbXBvbmVudDogZmFsc2UsXG4gICAgICBiYXNlQ2xhc3M6IGFuYWx5c2lzLmJhc2VDbGFzcyxcbiAgICAgIC4uLmFuYWx5c2lzLnR5cGVDaGVja01ldGEsXG4gICAgICBpc1BvaXNvbmVkOiBhbmFseXNpcy5pc1BvaXNvbmVkLFxuICAgICAgaXNTdHJ1Y3R1cmFsOiBhbmFseXNpcy5pc1N0cnVjdHVyYWwsXG4gICAgfSk7XG5cbiAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBEaXJlY3RpdmVIYW5kbGVyRGF0YSwgc3ltYm9sOiBEaXJlY3RpdmVTeW1ib2wpOlxuICAgICAgUmVzb2x2ZVJlc3VsdDx1bmtub3duPiB7XG4gICAgaWYgKHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIgIT09IG51bGwgJiYgYW5hbHlzaXMuYmFzZUNsYXNzIGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICBzeW1ib2wuYmFzZUNsYXNzID0gdGhpcy5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlci5nZXRTeW1ib2woYW5hbHlzaXMuYmFzZUNsYXNzLm5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBpZiAoYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSAhPT0gbnVsbCAmJlxuICAgICAgICBhbmFseXNpcy5tZXRhLnByb3ZpZGVycyBpbnN0YW5jZW9mIFdyYXBwZWROb2RlRXhwcikge1xuICAgICAgY29uc3QgcHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMhLm5vZGUsXG4gICAgICAgICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5wcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVEaWFnbm9zdGljcyA9IGdldERpcmVjdGl2ZURpYWdub3N0aWNzKFxuICAgICAgICBub2RlLCB0aGlzLm1ldGFSZWFkZXIsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCAnRGlyZWN0aXZlJyk7XG4gICAgaWYgKGRpcmVjdGl2ZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmRpcmVjdGl2ZURpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge2RpYWdub3N0aWNzOiBkaWFnbm9zdGljcy5sZW5ndGggPiAwID8gZGlhZ25vc3RpY3MgOiB1bmRlZmluZWR9O1xuICB9XG5cbiAgY29tcGlsZUZ1bGwoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8RGlyZWN0aXZlSGFuZGxlckRhdGE+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8dW5rbm93bj4sIHBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgZmFjID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKHRvRmFjdG9yeU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEsIEZhY3RvcnlUYXJnZXQuRGlyZWN0aXZlKSk7XG4gICAgY29uc3QgZGVmID0gY29tcGlsZURpcmVjdGl2ZUZyb21NZXRhZGF0YShhbmFseXNpcy5tZXRhLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICBjb25zdCBjbGFzc01ldGFkYXRhID0gYW5hbHlzaXMuY2xhc3NNZXRhZGF0YSAhPT0gbnVsbCA/XG4gICAgICAgIGNvbXBpbGVDbGFzc01ldGFkYXRhKGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEpLnRvU3RtdCgpIDpcbiAgICAgICAgbnVsbDtcbiAgICByZXR1cm4gY29tcGlsZVJlc3VsdHMoZmFjLCBkZWYsIGNsYXNzTWV0YWRhdGEsICfJtWRpcicpO1xuICB9XG5cbiAgY29tcGlsZVBhcnRpYWwoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8RGlyZWN0aXZlSGFuZGxlckRhdGE+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8dW5rbm93bj4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGZhYyA9IGNvbXBpbGVEZWNsYXJlRmFjdG9yeSh0b0ZhY3RvcnlNZXRhZGF0YShhbmFseXNpcy5tZXRhLCBGYWN0b3J5VGFyZ2V0LkRpcmVjdGl2ZSkpO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVEZWNsYXJlRGlyZWN0aXZlRnJvbU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEpO1xuICAgIGNvbnN0IGNsYXNzTWV0YWRhdGEgPSBhbmFseXNpcy5jbGFzc01ldGFkYXRhICE9PSBudWxsID9cbiAgICAgICAgY29tcGlsZURlY2xhcmVDbGFzc01ldGFkYXRhKGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEpLnRvU3RtdCgpIDpcbiAgICAgICAgbnVsbDtcbiAgICByZXR1cm4gY29tcGlsZVJlc3VsdHMoZmFjLCBkZWYsIGNsYXNzTWV0YWRhdGEsICfJtWRpcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiBhIGdpdmVuIGNsYXNzIHVzZXMgQW5ndWxhciBmZWF0dXJlcyBhbmQgcmV0dXJucyB0aGUgVHlwZVNjcmlwdCBub2RlXG4gICAqIHRoYXQgaW5kaWNhdGVkIHRoZSB1c2FnZS4gQ2xhc3NlcyBhcmUgY29uc2lkZXJlZCB1c2luZyBBbmd1bGFyIGZlYXR1cmVzIGlmIHRoZXlcbiAgICogY29udGFpbiBjbGFzcyBtZW1iZXJzIHRoYXQgYXJlIGVpdGhlciBkZWNvcmF0ZWQgd2l0aCBhIGtub3duIEFuZ3VsYXIgZGVjb3JhdG9yLFxuICAgKiBvciBpZiB0aGV5IGNvcnJlc3BvbmQgdG8gYSBrbm93biBBbmd1bGFyIGxpZmVjeWNsZSBob29rLlxuICAgKi9cbiAgcHJpdmF0ZSBmaW5kQ2xhc3NGaWVsZFdpdGhBbmd1bGFyRmVhdHVyZXMobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKG5vZGUpLmZpbmQobWVtYmVyID0+IHtcbiAgICAgIGlmICghbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuTWV0aG9kICYmXG4gICAgICAgICAgTElGRUNZQ0xFX0hPT0tTLmhhcyhtZW1iZXIubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAobWVtYmVyLmRlY29yYXRvcnMpIHtcbiAgICAgICAgcmV0dXJuIG1lbWJlci5kZWNvcmF0b3JzLnNvbWUoXG4gICAgICAgICAgICBkZWNvcmF0b3IgPT4gRklFTERfREVDT1JBVE9SUy5zb21lKFxuICAgICAgICAgICAgICAgIGRlY29yYXRvck5hbWUgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgZGVjb3JhdG9yTmFtZSwgdGhpcy5pc0NvcmUpKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gZXh0cmFjdCBtZXRhZGF0YSBmcm9tIGEgYERpcmVjdGl2ZWAgb3IgYENvbXBvbmVudGAuIGBEaXJlY3RpdmVgcyB3aXRob3V0IGFcbiAqIHNlbGVjdG9yIGFyZSBhbGxvd2VkIHRvIGJlIHVzZWQgZm9yIGFic3RyYWN0IGJhc2UgY2xhc3Nlcy4gVGhlc2UgYWJzdHJhY3QgZGlyZWN0aXZlcyBzaG91bGQgbm90XG4gKiBhcHBlYXIgaW4gdGhlIGRlY2xhcmF0aW9ucyBvZiBhbiBgTmdNb2R1bGVgIGFuZCBhZGRpdGlvbmFsIHZlcmlmaWNhdGlvbiBpcyBkb25lIHdoZW4gcHJvY2Vzc2luZ1xuICogdGhlIG1vZHVsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3J8bnVsbD4sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLCBpc0NvcmU6IGJvb2xlYW4sIGZsYWdzOiBIYW5kbGVyRmxhZ3MsXG4gICAgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sIGRlZmF1bHRTZWxlY3Rvcjogc3RyaW5nfG51bGwgPSBudWxsKToge1xuICBkZWNvcmF0b3I6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICBtZXRhZGF0YTogUjNEaXJlY3RpdmVNZXRhZGF0YSxcbiAgaW5wdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZyxcbiAgb3V0cHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmcsXG4gIGlzU3RydWN0dXJhbDogYm9vbGVhbjtcbn18dW5kZWZpbmVkIHtcbiAgbGV0IGRpcmVjdGl2ZTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj47XG4gIGlmIChkZWNvcmF0b3IgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgZGlyZWN0aXZlID0gbmV3IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+KCk7XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yYCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLFxuICAgICAgICAgIGBAJHtkZWNvcmF0b3IubmFtZX0gYXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbGApO1xuICAgIH1cbiAgICBkaXJlY3RpdmUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcbiAgfVxuXG4gIGlmIChkaXJlY3RpdmUuaGFzKCdqaXQnKSkge1xuICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBtZW1iZXJzID0gcmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KTtcblxuICAvLyBQcmVjb21wdXRlIGEgbGlzdCBvZiB0cy5DbGFzc0VsZW1lbnRzIHRoYXQgaGF2ZSBkZWNvcmF0b3JzLiBUaGlzIGluY2x1ZGVzIHRoaW5ncyBsaWtlIEBJbnB1dCxcbiAgLy8gQE91dHB1dCwgQEhvc3RCaW5kaW5nLCBldGMuXG4gIGNvbnN0IGRlY29yYXRlZEVsZW1lbnRzID1cbiAgICAgIG1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiAhbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5kZWNvcmF0b3JzICE9PSBudWxsKTtcblxuICBjb25zdCBjb3JlTW9kdWxlID0gaXNDb3JlID8gdW5kZWZpbmVkIDogJ0Bhbmd1bGFyL2NvcmUnO1xuXG4gIC8vIENvbnN0cnVjdCB0aGUgbWFwIG9mIGlucHV0cyBib3RoIGZyb20gdGhlIEBEaXJlY3RpdmUvQENvbXBvbmVudFxuICAvLyBkZWNvcmF0b3IsIGFuZCB0aGUgZGVjb3JhdGVkXG4gIC8vIGZpZWxkcy5cbiAgY29uc3QgaW5wdXRzRnJvbU1ldGEgPSBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoZGlyZWN0aXZlLCAnaW5wdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3QgaW5wdXRzRnJvbUZpZWxkcyA9IHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0lucHV0JywgY29yZU1vZHVsZSksIGV2YWx1YXRvcixcbiAgICAgIHJlc29sdmVJbnB1dCk7XG5cbiAgLy8gQW5kIG91dHB1dHMuXG4gIGNvbnN0IG91dHB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdvdXRwdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3Qgb3V0cHV0c0Zyb21GaWVsZHMgPVxuICAgICAgcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ091dHB1dCcsIGNvcmVNb2R1bGUpLCBldmFsdWF0b3IsXG4gICAgICAgICAgcmVzb2x2ZU91dHB1dCkgYXMge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfTtcbiAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHF1ZXJpZXMuXG4gIGNvbnN0IGNvbnRlbnRDaGlsZEZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdDb250ZW50Q2hpbGQnLCBjb3JlTW9kdWxlKSwgcmVmbGVjdG9yLFxuICAgICAgZXZhbHVhdG9yKTtcbiAgY29uc3QgY29udGVudENoaWxkcmVuRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0NvbnRlbnRDaGlsZHJlbicsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuXG4gIGNvbnN0IHF1ZXJpZXMgPSBbLi4uY29udGVudENoaWxkRnJvbUZpZWxkcywgLi4uY29udGVudENoaWxkcmVuRnJvbUZpZWxkc107XG5cbiAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHZpZXcgcXVlcmllcy5cbiAgY29uc3Qgdmlld0NoaWxkRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ1ZpZXdDaGlsZCcsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuICBjb25zdCB2aWV3Q2hpbGRyZW5Gcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnVmlld0NoaWxkcmVuJywgY29yZU1vZHVsZSksIHJlZmxlY3RvcixcbiAgICAgIGV2YWx1YXRvcik7XG4gIGNvbnN0IHZpZXdRdWVyaWVzID0gWy4uLnZpZXdDaGlsZEZyb21GaWVsZHMsIC4uLnZpZXdDaGlsZHJlbkZyb21GaWVsZHNdO1xuXG4gIGlmIChkaXJlY3RpdmUuaGFzKCdxdWVyaWVzJykpIHtcbiAgICBjb25zdCBxdWVyaWVzRnJvbURlY29yYXRvciA9XG4gICAgICAgIGV4dHJhY3RRdWVyaWVzRnJvbURlY29yYXRvcihkaXJlY3RpdmUuZ2V0KCdxdWVyaWVzJykhLCByZWZsZWN0b3IsIGV2YWx1YXRvciwgaXNDb3JlKTtcbiAgICBxdWVyaWVzLnB1c2goLi4ucXVlcmllc0Zyb21EZWNvcmF0b3IuY29udGVudCk7XG4gICAgdmlld1F1ZXJpZXMucHVzaCguLi5xdWVyaWVzRnJvbURlY29yYXRvci52aWV3KTtcbiAgfVxuXG4gIC8vIFBhcnNlIHRoZSBzZWxlY3Rvci5cbiAgbGV0IHNlbGVjdG9yID0gZGVmYXVsdFNlbGVjdG9yO1xuICBpZiAoZGlyZWN0aXZlLmhhcygnc2VsZWN0b3InKSkge1xuICAgIGNvbnN0IGV4cHIgPSBkaXJlY3RpdmUuZ2V0KCdzZWxlY3RvcicpITtcbiAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihleHByLCByZXNvbHZlZCwgYHNlbGVjdG9yIG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICB9XG4gICAgLy8gdXNlIGRlZmF1bHQgc2VsZWN0b3IgaW4gY2FzZSBzZWxlY3RvciBpcyBhbiBlbXB0eSBzdHJpbmdcbiAgICBzZWxlY3RvciA9IHJlc29sdmVkID09PSAnJyA/IGRlZmF1bHRTZWxlY3RvciA6IHJlc29sdmVkO1xuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuRElSRUNUSVZFX01JU1NJTkdfU0VMRUNUT1IsIGV4cHIsXG4gICAgICAgICAgYERpcmVjdGl2ZSAke2NsYXp6Lm5hbWUudGV4dH0gaGFzIG5vIHNlbGVjdG9yLCBwbGVhc2UgYWRkIGl0IWApO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGhvc3QgPSBleHRyYWN0SG9zdEJpbmRpbmdzKGRlY29yYXRlZEVsZW1lbnRzLCBldmFsdWF0b3IsIGNvcmVNb2R1bGUsIGRpcmVjdGl2ZSk7XG5cbiAgY29uc3QgcHJvdmlkZXJzOiBFeHByZXNzaW9ufG51bGwgPSBkaXJlY3RpdmUuaGFzKCdwcm92aWRlcnMnKSA/XG4gICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyID9cbiAgICAgICAgICAgICAgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyhkaXJlY3RpdmUuZ2V0KCdwcm92aWRlcnMnKSEpIDpcbiAgICAgICAgICAgICAgZGlyZWN0aXZlLmdldCgncHJvdmlkZXJzJykhKSA6XG4gICAgICBudWxsO1xuXG4gIC8vIERldGVybWluZSBpZiBgbmdPbkNoYW5nZXNgIGlzIGEgbGlmZWN5Y2xlIGhvb2sgZGVmaW5lZCBvbiB0aGUgY29tcG9uZW50LlxuICBjb25zdCB1c2VzT25DaGFuZ2VzID0gbWVtYmVycy5zb21lKFxuICAgICAgbWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiZcbiAgICAgICAgICBtZW1iZXIubmFtZSA9PT0gJ25nT25DaGFuZ2VzJyk7XG5cbiAgLy8gUGFyc2UgZXhwb3J0QXMuXG4gIGxldCBleHBvcnRBczogc3RyaW5nW118bnVsbCA9IG51bGw7XG4gIGlmIChkaXJlY3RpdmUuaGFzKCdleHBvcnRBcycpKSB7XG4gICAgY29uc3QgZXhwciA9IGRpcmVjdGl2ZS5nZXQoJ2V4cG9ydEFzJykhO1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHJlc29sdmVkLCBgZXhwb3J0QXMgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBleHBvcnRBcyA9IHJlc29sdmVkLnNwbGl0KCcsJykubWFwKHBhcnQgPT4gcGFydC50cmltKCkpO1xuICB9XG5cbiAgY29uc3QgcmF3Q3RvckRlcHMgPSBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBpc0NvcmUpO1xuXG4gIC8vIE5vbi1hYnN0cmFjdCBkaXJlY3RpdmVzICh0aG9zZSB3aXRoIGEgc2VsZWN0b3IpIHJlcXVpcmUgdmFsaWQgY29uc3RydWN0b3IgZGVwZW5kZW5jaWVzLCB3aGVyZWFzXG4gIC8vIGFic3RyYWN0IGRpcmVjdGl2ZXMgYXJlIGFsbG93ZWQgdG8gaGF2ZSBpbnZhbGlkIGRlcGVuZGVuY2llcywgZ2l2ZW4gdGhhdCBhIHN1YmNsYXNzIG1heSBjYWxsXG4gIC8vIHRoZSBjb25zdHJ1Y3RvciBleHBsaWNpdGx5LlxuICBjb25zdCBjdG9yRGVwcyA9IHNlbGVjdG9yICE9PSBudWxsID8gdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmF3Q3RvckRlcHMpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVud3JhcENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKHJhd0N0b3JEZXBzKTtcblxuICAvLyBTdHJ1Y3R1cmFsIGRpcmVjdGl2ZXMgbXVzdCBoYXZlIGEgYFRlbXBsYXRlUmVmYCBkZXBlbmRlbmN5LlxuICBjb25zdCBpc1N0cnVjdHVyYWwgPSBjdG9yRGVwcyAhPT0gbnVsbCAmJiBjdG9yRGVwcyAhPT0gJ2ludmFsaWQnICYmXG4gICAgICBjdG9yRGVwcy5zb21lKFxuICAgICAgICAgIGRlcCA9PiAoZGVwLnRva2VuIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSAmJlxuICAgICAgICAgICAgICBkZXAudG9rZW4udmFsdWUubW9kdWxlTmFtZSA9PT0gJ0Bhbmd1bGFyL2NvcmUnICYmXG4gICAgICAgICAgICAgIGRlcC50b2tlbi52YWx1ZS5uYW1lID09PSAnVGVtcGxhdGVSZWYnKTtcblxuICAvLyBEZXRlY3QgaWYgdGhlIGNvbXBvbmVudCBpbmhlcml0cyBmcm9tIGFub3RoZXIgY2xhc3NcbiAgY29uc3QgdXNlc0luaGVyaXRhbmNlID0gcmVmbGVjdG9yLmhhc0Jhc2VDbGFzcyhjbGF6eik7XG4gIGNvbnN0IHR5cGUgPSB3cmFwVHlwZVJlZmVyZW5jZShyZWZsZWN0b3IsIGNsYXp6KTtcbiAgY29uc3QgaW50ZXJuYWxUeXBlID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6eikpO1xuXG4gIGNvbnN0IGlucHV0cyA9IENsYXNzUHJvcGVydHlNYXBwaW5nLmZyb21NYXBwZWRPYmplY3Qoey4uLmlucHV0c0Zyb21NZXRhLCAuLi5pbnB1dHNGcm9tRmllbGRzfSk7XG4gIGNvbnN0IG91dHB1dHMgPSBDbGFzc1Byb3BlcnR5TWFwcGluZy5mcm9tTWFwcGVkT2JqZWN0KHsuLi5vdXRwdXRzRnJvbU1ldGEsIC4uLm91dHB1dHNGcm9tRmllbGRzfSk7XG5cbiAgY29uc3QgbWV0YWRhdGE6IFIzRGlyZWN0aXZlTWV0YWRhdGEgPSB7XG4gICAgbmFtZTogY2xhenoubmFtZS50ZXh0LFxuICAgIGRlcHM6IGN0b3JEZXBzLFxuICAgIGhvc3QsXG4gICAgbGlmZWN5Y2xlOiB7XG4gICAgICB1c2VzT25DaGFuZ2VzLFxuICAgIH0sXG4gICAgaW5wdXRzOiBpbnB1dHMudG9Kb2ludE1hcHBlZE9iamVjdCgpLFxuICAgIG91dHB1dHM6IG91dHB1dHMudG9EaXJlY3RNYXBwZWRPYmplY3QoKSxcbiAgICBxdWVyaWVzLFxuICAgIHZpZXdRdWVyaWVzLFxuICAgIHNlbGVjdG9yLFxuICAgIGZ1bGxJbmhlcml0YW5jZTogISEoZmxhZ3MgJiBIYW5kbGVyRmxhZ3MuRlVMTF9JTkhFUklUQU5DRSksXG4gICAgdHlwZSxcbiAgICBpbnRlcm5hbFR5cGUsXG4gICAgdHlwZUFyZ3VtZW50Q291bnQ6IHJlZmxlY3Rvci5nZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6KSB8fCAwLFxuICAgIHR5cGVTb3VyY2VTcGFuOiBjcmVhdGVTb3VyY2VTcGFuKGNsYXp6Lm5hbWUpLFxuICAgIHVzZXNJbmhlcml0YW5jZSxcbiAgICBleHBvcnRBcyxcbiAgICBwcm92aWRlcnNcbiAgfTtcbiAgcmV0dXJuIHtcbiAgICBkZWNvcmF0b3I6IGRpcmVjdGl2ZSxcbiAgICBtZXRhZGF0YSxcbiAgICBpbnB1dHMsXG4gICAgb3V0cHV0cyxcbiAgICBpc1N0cnVjdHVyYWwsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0UXVlcnlNZXRhZGF0YShcbiAgICBleHByTm9kZTogdHMuTm9kZSwgbmFtZTogc3RyaW5nLCBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+LCBwcm9wZXJ0eU5hbWU6IHN0cmluZyxcbiAgICByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBSM1F1ZXJ5TWV0YWRhdGEge1xuICBpZiAoYXJncy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGV4cHJOb2RlLCBgQCR7bmFtZX0gbXVzdCBoYXZlIGFyZ3VtZW50c2ApO1xuICB9XG4gIGNvbnN0IGZpcnN0ID0gbmFtZSA9PT0gJ1ZpZXdDaGlsZCcgfHwgbmFtZSA9PT0gJ0NvbnRlbnRDaGlsZCc7XG4gIGNvbnN0IG5vZGUgPSB0cnlVbndyYXBGb3J3YXJkUmVmKGFyZ3NbMF0sIHJlZmxlY3RvcikgPz8gYXJnc1swXTtcbiAgY29uc3QgYXJnID0gZXZhbHVhdG9yLmV2YWx1YXRlKG5vZGUpO1xuXG4gIC8qKiBXaGV0aGVyIG9yIG5vdCB0aGlzIHF1ZXJ5IHNob3VsZCBjb2xsZWN0IG9ubHkgc3RhdGljIHJlc3VsdHMgKHNlZSB2aWV3L2FwaS50cykgICovXG4gIGxldCBpc1N0YXRpYzogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8vIEV4dHJhY3QgdGhlIHByZWRpY2F0ZVxuICBsZXQgcHJlZGljYXRlOiBFeHByZXNzaW9ufHN0cmluZ1tdfG51bGwgPSBudWxsO1xuICBpZiAoYXJnIGluc3RhbmNlb2YgUmVmZXJlbmNlIHx8IGFyZyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgIC8vIFJlZmVyZW5jZXMgYW5kIHByZWRpY2F0ZXMgdGhhdCBjb3VsZCBub3QgYmUgZXZhbHVhdGVkIHN0YXRpY2FsbHkgYXJlIGVtaXR0ZWQgYXMgaXMuXG4gICAgcHJlZGljYXRlID0gbmV3IFdyYXBwZWROb2RlRXhwcihub2RlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgYXJnID09PSAnc3RyaW5nJykge1xuICAgIHByZWRpY2F0ZSA9IFthcmddO1xuICB9IGVsc2UgaWYgKGlzU3RyaW5nQXJyYXlPckRpZShhcmcsIGBAJHtuYW1lfSBwcmVkaWNhdGVgLCBub2RlKSkge1xuICAgIHByZWRpY2F0ZSA9IGFyZztcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKG5vZGUsIGFyZywgYEAke25hbWV9IHByZWRpY2F0ZSBjYW5ub3QgYmUgaW50ZXJwcmV0ZWRgKTtcbiAgfVxuXG4gIC8vIEV4dHJhY3QgdGhlIHJlYWQgYW5kIGRlc2NlbmRhbnRzIG9wdGlvbnMuXG4gIGxldCByZWFkOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAvLyBUaGUgZGVmYXVsdCB2YWx1ZSBmb3IgZGVzY2VuZGFudHMgaXMgdHJ1ZSBmb3IgZXZlcnkgZGVjb3JhdG9yIGV4Y2VwdCBAQ29udGVudENoaWxkcmVuLlxuICBsZXQgZGVzY2VuZGFudHM6IGJvb2xlYW4gPSBuYW1lICE9PSAnQ29udGVudENoaWxkcmVuJztcbiAgbGV0IGVtaXREaXN0aW5jdENoYW5nZXNPbmx5OiBib29sZWFuID0gZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlEZWZhdWx0VmFsdWU7XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMikge1xuICAgIGNvbnN0IG9wdGlvbnNFeHByID0gdW53cmFwRXhwcmVzc2lvbihhcmdzWzFdKTtcbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ob3B0aW9uc0V4cHIpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG9wdGlvbnNFeHByLFxuICAgICAgICAgIGBAJHtuYW1lfSBvcHRpb25zIG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWxgKTtcbiAgICB9XG4gICAgY29uc3Qgb3B0aW9ucyA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG9wdGlvbnNFeHByKTtcbiAgICBpZiAob3B0aW9ucy5oYXMoJ3JlYWQnKSkge1xuICAgICAgcmVhZCA9IG5ldyBXcmFwcGVkTm9kZUV4cHIob3B0aW9ucy5nZXQoJ3JlYWQnKSEpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmhhcygnZGVzY2VuZGFudHMnKSkge1xuICAgICAgY29uc3QgZGVzY2VuZGFudHNFeHByID0gb3B0aW9ucy5nZXQoJ2Rlc2NlbmRhbnRzJykhO1xuICAgICAgY29uc3QgZGVzY2VuZGFudHNWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZXNjZW5kYW50c0V4cHIpO1xuICAgICAgaWYgKHR5cGVvZiBkZXNjZW5kYW50c1ZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGRlc2NlbmRhbnRzRXhwciwgZGVzY2VuZGFudHNWYWx1ZSwgYEAke25hbWV9IG9wdGlvbnMuZGVzY2VuZGFudHMgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIGRlc2NlbmRhbnRzID0gZGVzY2VuZGFudHNWYWx1ZTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5oYXMoJ2VtaXREaXN0aW5jdENoYW5nZXNPbmx5JykpIHtcbiAgICAgIGNvbnN0IGVtaXREaXN0aW5jdENoYW5nZXNPbmx5RXhwciA9IG9wdGlvbnMuZ2V0KCdlbWl0RGlzdGluY3RDaGFuZ2VzT25seScpITtcbiAgICAgIGNvbnN0IGVtaXREaXN0aW5jdENoYW5nZXNPbmx5VmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGUoZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlWYWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBlbWl0RGlzdGluY3RDaGFuZ2VzT25seUV4cHIsIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5VmFsdWUsXG4gICAgICAgICAgICBgQCR7bmFtZX0gb3B0aW9ucy5lbWl0RGlzdGluY3RDaGFuZ2VzT25seSBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgfVxuICAgICAgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHkgPSBlbWl0RGlzdGluY3RDaGFuZ2VzT25seVZhbHVlO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmhhcygnc3RhdGljJykpIHtcbiAgICAgIGNvbnN0IHN0YXRpY1ZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlKG9wdGlvbnMuZ2V0KCdzdGF0aWMnKSEpO1xuICAgICAgaWYgKHR5cGVvZiBzdGF0aWNWYWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBub2RlLCBzdGF0aWNWYWx1ZSwgYEAke25hbWV9IG9wdGlvbnMuc3RhdGljIG11c3QgYmUgYSBib29sZWFuYCk7XG4gICAgICB9XG4gICAgICBpc1N0YXRpYyA9IHN0YXRpY1ZhbHVlO1xuICAgIH1cblxuICB9IGVsc2UgaWYgKGFyZ3MubGVuZ3RoID4gMikge1xuICAgIC8vIFRvbyBtYW55IGFyZ3VtZW50cy5cbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIG5vZGUsIGBAJHtuYW1lfSBoYXMgdG9vIG1hbnkgYXJndW1lbnRzYCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHByb3BlcnR5TmFtZSxcbiAgICBwcmVkaWNhdGUsXG4gICAgZmlyc3QsXG4gICAgZGVzY2VuZGFudHMsXG4gICAgcmVhZCxcbiAgICBzdGF0aWM6IGlzU3RhdGljLFxuICAgIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5LFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yKFxuICAgIHF1ZXJ5RGF0YTogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgIGlzQ29yZTogYm9vbGVhbik6IHtcbiAgY29udGVudDogUjNRdWVyeU1ldGFkYXRhW10sXG4gIHZpZXc6IFIzUXVlcnlNZXRhZGF0YVtdLFxufSB7XG4gIGNvbnN0IGNvbnRlbnQ6IFIzUXVlcnlNZXRhZGF0YVtdID0gW10sIHZpZXc6IFIzUXVlcnlNZXRhZGF0YVtdID0gW107XG4gIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihxdWVyeURhdGEpKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHF1ZXJ5RGF0YSxcbiAgICAgICAgJ0RlY29yYXRvciBxdWVyaWVzIG1ldGFkYXRhIG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWwnKTtcbiAgfVxuICByZWZsZWN0T2JqZWN0TGl0ZXJhbChxdWVyeURhdGEpLmZvckVhY2goKHF1ZXJ5RXhwciwgcHJvcGVydHlOYW1lKSA9PiB7XG4gICAgcXVlcnlFeHByID0gdW53cmFwRXhwcmVzc2lvbihxdWVyeUV4cHIpO1xuICAgIGlmICghdHMuaXNOZXdFeHByZXNzaW9uKHF1ZXJ5RXhwcikpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHF1ZXJ5RGF0YSxcbiAgICAgICAgICAnRGVjb3JhdG9yIHF1ZXJ5IG1ldGFkYXRhIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgYSBxdWVyeSB0eXBlJyk7XG4gICAgfVxuICAgIGNvbnN0IHF1ZXJ5VHlwZSA9IHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHF1ZXJ5RXhwci5leHByZXNzaW9uKSA/XG4gICAgICAgIHF1ZXJ5RXhwci5leHByZXNzaW9uLm5hbWUgOlxuICAgICAgICBxdWVyeUV4cHIuZXhwcmVzc2lvbjtcbiAgICBpZiAoIXRzLmlzSWRlbnRpZmllcihxdWVyeVR5cGUpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBxdWVyeURhdGEsXG4gICAgICAgICAgJ0RlY29yYXRvciBxdWVyeSBtZXRhZGF0YSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIGEgcXVlcnkgdHlwZScpO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihxdWVyeVR5cGUpO1xuICAgIGlmICh0eXBlID09PSBudWxsIHx8ICghaXNDb3JlICYmIHR5cGUuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB8fFxuICAgICAgICAhUVVFUllfVFlQRVMuaGFzKHR5cGUubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHF1ZXJ5RGF0YSxcbiAgICAgICAgICAnRGVjb3JhdG9yIHF1ZXJ5IG1ldGFkYXRhIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgYSBxdWVyeSB0eXBlJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcXVlcnkgPSBleHRyYWN0UXVlcnlNZXRhZGF0YShcbiAgICAgICAgcXVlcnlFeHByLCB0eXBlLm5hbWUsIHF1ZXJ5RXhwci5hcmd1bWVudHMgfHwgW10sIHByb3BlcnR5TmFtZSwgcmVmbGVjdG9yLCBldmFsdWF0b3IpO1xuICAgIGlmICh0eXBlLm5hbWUuc3RhcnRzV2l0aCgnQ29udGVudCcpKSB7XG4gICAgICBjb250ZW50LnB1c2gocXVlcnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2aWV3LnB1c2gocXVlcnkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiB7Y29udGVudCwgdmlld307XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nQXJyYXlPckRpZSh2YWx1ZTogYW55LCBuYW1lOiBzdHJpbmcsIG5vZGU6IHRzLkV4cHJlc3Npb24pOiB2YWx1ZSBpcyBzdHJpbmdbXSB7XG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZVtpXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgbm9kZSwgdmFsdWVbaV0sIGBGYWlsZWQgdG8gcmVzb2x2ZSAke25hbWV9IGF0IHBvc2l0aW9uICR7aX0gdG8gYSBzdHJpbmdgKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUZpZWxkQXJyYXlWYWx1ZShcbiAgICBkaXJlY3RpdmU6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBmaWVsZDogc3RyaW5nLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBudWxsfFxuICAgIHN0cmluZ1tdIHtcbiAgaWYgKCFkaXJlY3RpdmUuaGFzKGZpZWxkKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gUmVzb2x2ZSB0aGUgZmllbGQgb2YgaW50ZXJlc3QgZnJvbSB0aGUgZGlyZWN0aXZlIG1ldGFkYXRhIHRvIGEgc3RyaW5nW10uXG4gIGNvbnN0IGV4cHJlc3Npb24gPSBkaXJlY3RpdmUuZ2V0KGZpZWxkKSE7XG4gIGNvbnN0IHZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHJlc3Npb24pO1xuICBpZiAoIWlzU3RyaW5nQXJyYXlPckRpZSh2YWx1ZSwgZmllbGQsIGV4cHJlc3Npb24pKSB7XG4gICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgZXhwcmVzc2lvbiwgdmFsdWUsIGBGYWlsZWQgdG8gcmVzb2x2ZSBARGlyZWN0aXZlLiR7ZmllbGR9IHRvIGEgc3RyaW5nIGFycmF5YCk7XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogSW50ZXJwcmV0IHByb3BlcnR5IG1hcHBpbmcgZmllbGRzIG9uIHRoZSBkZWNvcmF0b3IgKGUuZy4gaW5wdXRzIG9yIG91dHB1dHMpIGFuZCByZXR1cm4gdGhlXG4gKiBjb3JyZWN0bHkgc2hhcGVkIG1ldGFkYXRhIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VGaWVsZFRvUHJvcGVydHlNYXBwaW5nKFxuICAgIGRpcmVjdGl2ZTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGZpZWxkOiBzdHJpbmcsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKToge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfSB7XG4gIGNvbnN0IG1ldGFWYWx1ZXMgPSBwYXJzZUZpZWxkQXJyYXlWYWx1ZShkaXJlY3RpdmUsIGZpZWxkLCBldmFsdWF0b3IpO1xuICBpZiAoIW1ldGFWYWx1ZXMpIHtcbiAgICByZXR1cm4gRU1QVFlfT0JKRUNUO1xuICB9XG5cbiAgcmV0dXJuIG1ldGFWYWx1ZXMucmVkdWNlKChyZXN1bHRzLCB2YWx1ZSkgPT4ge1xuICAgIC8vIEVpdGhlciB0aGUgdmFsdWUgaXMgJ2ZpZWxkJyBvciAnZmllbGQ6IHByb3BlcnR5Jy4gSW4gdGhlIGZpcnN0IGNhc2UsIGBwcm9wZXJ0eWAgd2lsbFxuICAgIC8vIGJlIHVuZGVmaW5lZCwgaW4gd2hpY2ggY2FzZSB0aGUgZmllbGQgbmFtZSBzaG91bGQgYWxzbyBiZSB1c2VkIGFzIHRoZSBwcm9wZXJ0eSBuYW1lLlxuICAgIGNvbnN0IFtmaWVsZCwgcHJvcGVydHldID0gdmFsdWUuc3BsaXQoJzonLCAyKS5tYXAoc3RyID0+IHN0ci50cmltKCkpO1xuICAgIHJlc3VsdHNbZmllbGRdID0gcHJvcGVydHkgfHwgZmllbGQ7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH0sIHt9IGFzIHtbZmllbGQ6IHN0cmluZ106IHN0cmluZ30pO1xufVxuXG4vKipcbiAqIFBhcnNlIHByb3BlcnR5IGRlY29yYXRvcnMgKGUuZy4gYElucHV0YCBvciBgT3V0cHV0YCkgYW5kIHJldHVybiB0aGUgY29ycmVjdGx5IHNoYXBlZCBtZXRhZGF0YVxuICogb2JqZWN0LlxuICovXG5mdW5jdGlvbiBwYXJzZURlY29yYXRlZEZpZWxkcyhcbiAgICBmaWVsZHM6IHttZW1iZXI6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXX1bXSwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgIG1hcFZhbHVlUmVzb2x2ZXI6IChwdWJsaWNOYW1lOiBzdHJpbmcsIGludGVybmFsTmFtZTogc3RyaW5nKSA9PlxuICAgICAgICBzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddKToge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfFtzdHJpbmcsIHN0cmluZ119IHtcbiAgcmV0dXJuIGZpZWxkcy5yZWR1Y2UoKHJlc3VsdHMsIGZpZWxkKSA9PiB7XG4gICAgY29uc3QgZmllbGROYW1lID0gZmllbGQubWVtYmVyLm5hbWU7XG4gICAgZmllbGQuZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICAvLyBUaGUgZGVjb3JhdG9yIGVpdGhlciBkb2Vzbid0IGhhdmUgYW4gYXJndW1lbnQgKEBJbnB1dCgpKSBpbiB3aGljaCBjYXNlIHRoZSBwcm9wZXJ0eVxuICAgICAgLy8gbmFtZSBpcyB1c2VkLCBvciBpdCBoYXMgb25lIGFyZ3VtZW50IChAT3V0cHV0KCduYW1lZCcpKS5cbiAgICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXN1bHRzW2ZpZWxkTmFtZV0gPSBmaWVsZE5hbWU7XG4gICAgICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBjb25zdCBwcm9wZXJ0eSA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLCBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgYEAke2RlY29yYXRvci5uYW1lfSBkZWNvcmF0b3IgYXJndW1lbnQgbXVzdCByZXNvbHZlIHRvIGEgc3RyaW5nYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0c1tmaWVsZE5hbWVdID0gbWFwVmFsdWVSZXNvbHZlcihwcm9wZXJ0eSwgZmllbGROYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRvbyBtYW55IGFyZ3VtZW50cy5cbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgICAgYEAke2RlY29yYXRvci5uYW1lfSBjYW4gaGF2ZSBhdCBtb3N0IG9uZSBhcmd1bWVudCwgZ290ICR7XG4gICAgICAgICAgICAgICAgZGVjb3JhdG9yLmFyZ3MubGVuZ3RofSBhcmd1bWVudChzKWApO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9LCB7fSBhcyB7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddfSk7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVJbnB1dChwdWJsaWNOYW1lOiBzdHJpbmcsIGludGVybmFsTmFtZTogc3RyaW5nKTogW3N0cmluZywgc3RyaW5nXSB7XG4gIHJldHVybiBbcHVibGljTmFtZSwgaW50ZXJuYWxOYW1lXTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZU91dHB1dChwdWJsaWNOYW1lOiBzdHJpbmcsIGludGVybmFsTmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiBwdWJsaWNOYW1lO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgZmllbGRzOiB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogUjNRdWVyeU1ldGFkYXRhW10ge1xuICByZXR1cm4gZmllbGRzLm1hcCgoe21lbWJlciwgZGVjb3JhdG9yc30pID0+IHtcbiAgICBjb25zdCBkZWNvcmF0b3IgPSBkZWNvcmF0b3JzWzBdO1xuICAgIGNvbnN0IG5vZGUgPSBtZW1iZXIubm9kZSB8fCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvcik7XG5cbiAgICAvLyBUaHJvdyBpbiBjYXNlIG9mIGBASW5wdXQoKSBAQ29udGVudENoaWxkKCdmb28nKSBmb286IGFueWAsIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gSXZ5XG4gICAgaWYgKG1lbWJlci5kZWNvcmF0b3JzIS5zb21lKHYgPT4gdi5uYW1lID09PSAnSW5wdXQnKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQ09MTElTSU9OLCBub2RlLFxuICAgICAgICAgICdDYW5ub3QgY29tYmluZSBASW5wdXQgZGVjb3JhdG9ycyB3aXRoIHF1ZXJ5IGRlY29yYXRvcnMnKTtcbiAgICB9XG4gICAgaWYgKGRlY29yYXRvcnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9DT0xMSVNJT04sIG5vZGUsXG4gICAgICAgICAgJ0Nhbm5vdCBoYXZlIG11bHRpcGxlIHF1ZXJ5IGRlY29yYXRvcnMgb24gdGhlIHNhbWUgY2xhc3MgbWVtYmVyJyk7XG4gICAgfSBlbHNlIGlmICghaXNQcm9wZXJ0eVR5cGVNZW1iZXIobWVtYmVyKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfVU5FWFBFQ1RFRCwgbm9kZSxcbiAgICAgICAgICAnUXVlcnkgZGVjb3JhdG9yIG11c3QgZ28gb24gYSBwcm9wZXJ0eS10eXBlIG1lbWJlcicpO1xuICAgIH1cbiAgICByZXR1cm4gZXh0cmFjdFF1ZXJ5TWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvci5uYW1lLCBkZWNvcmF0b3IuYXJncyB8fCBbXSwgbWVtYmVyLm5hbWUsIHJlZmxlY3RvciwgZXZhbHVhdG9yKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGlzUHJvcGVydHlUeXBlTWVtYmVyKG1lbWJlcjogQ2xhc3NNZW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuR2V0dGVyIHx8IG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuU2V0dGVyIHx8XG4gICAgICBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xufVxuXG50eXBlIFN0cmluZ01hcDxUPiA9IHtcbiAgW2tleTogc3RyaW5nXTogVDtcbn07XG5cbmZ1bmN0aW9uIGV2YWx1YXRlSG9zdEV4cHJlc3Npb25CaW5kaW5ncyhcbiAgICBob3N0RXhwcjogdHMuRXhwcmVzc2lvbiwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogUGFyc2VkSG9zdEJpbmRpbmdzIHtcbiAgY29uc3QgaG9zdE1ldGFNYXAgPSBldmFsdWF0b3IuZXZhbHVhdGUoaG9zdEV4cHIpO1xuICBpZiAoIShob3N0TWV0YU1hcCBpbnN0YW5jZW9mIE1hcCkpIHtcbiAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICBob3N0RXhwciwgaG9zdE1ldGFNYXAsIGBEZWNvcmF0b3IgaG9zdCBtZXRhZGF0YSBtdXN0IGJlIGFuIG9iamVjdGApO1xuICB9XG4gIGNvbnN0IGhvc3RNZXRhZGF0YTogU3RyaW5nTWFwPHN0cmluZ3xFeHByZXNzaW9uPiA9IHt9O1xuICBob3N0TWV0YU1hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgLy8gUmVzb2x2ZSBFbnVtIHJlZmVyZW5jZXMgdG8gdGhlaXIgZGVjbGFyZWQgdmFsdWUuXG4gICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRW51bVZhbHVlKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnJlc29sdmVkO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICBob3N0RXhwciwga2V5LFxuICAgICAgICAgIGBEZWNvcmF0b3IgaG9zdCBtZXRhZGF0YSBtdXN0IGJlIGEgc3RyaW5nIC0+IHN0cmluZyBvYmplY3QsIGJ1dCBmb3VuZCB1bnBhcnNlYWJsZSBrZXlgKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICBob3N0TWV0YWRhdGFba2V5XSA9IHZhbHVlO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIGhvc3RNZXRhZGF0YVtrZXldID0gbmV3IFdyYXBwZWROb2RlRXhwcih2YWx1ZS5ub2RlIGFzIHRzLkV4cHJlc3Npb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgIGhvc3RFeHByLCB2YWx1ZSxcbiAgICAgICAgICBgRGVjb3JhdG9yIGhvc3QgbWV0YWRhdGEgbXVzdCBiZSBhIHN0cmluZyAtPiBzdHJpbmcgb2JqZWN0LCBidXQgZm91bmQgdW5wYXJzZWFibGUgdmFsdWVgKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IGJpbmRpbmdzID0gcGFyc2VIb3N0QmluZGluZ3MoaG9zdE1ldGFkYXRhKTtcblxuICBjb25zdCBlcnJvcnMgPSB2ZXJpZnlIb3N0QmluZGluZ3MoYmluZGluZ3MsIGNyZWF0ZVNvdXJjZVNwYW4oaG9zdEV4cHIpKTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAvLyBUT0RPOiBwcm92aWRlIG1vcmUgZ3JhbnVsYXIgZGlhZ25vc3RpYyBhbmQgb3V0cHV0IHNwZWNpZmljIGhvc3QgZXhwcmVzc2lvbiB0aGF0XG4gICAgICAgIC8vIHRyaWdnZXJlZCBhbiBlcnJvciBpbnN0ZWFkIG9mIHRoZSB3aG9sZSBob3N0IG9iamVjdC5cbiAgICAgICAgRXJyb3JDb2RlLkhPU1RfQklORElOR19QQVJTRV9FUlJPUiwgaG9zdEV4cHIsXG4gICAgICAgIGVycm9ycy5tYXAoKGVycm9yOiBQYXJzZUVycm9yKSA9PiBlcnJvci5tc2cpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIHJldHVybiBiaW5kaW5ncztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RIb3N0QmluZGluZ3MoXG4gICAgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLCBjb3JlTW9kdWxlOiBzdHJpbmd8dW5kZWZpbmVkLFxuICAgIG1ldGFkYXRhPzogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4pOiBQYXJzZWRIb3N0QmluZGluZ3Mge1xuICBsZXQgYmluZGluZ3M6IFBhcnNlZEhvc3RCaW5kaW5ncztcbiAgaWYgKG1ldGFkYXRhICYmIG1ldGFkYXRhLmhhcygnaG9zdCcpKSB7XG4gICAgYmluZGluZ3MgPSBldmFsdWF0ZUhvc3RFeHByZXNzaW9uQmluZGluZ3MobWV0YWRhdGEuZ2V0KCdob3N0JykhLCBldmFsdWF0b3IpO1xuICB9IGVsc2Uge1xuICAgIGJpbmRpbmdzID0gcGFyc2VIb3N0QmluZGluZ3Moe30pO1xuICB9XG5cbiAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihtZW1iZXJzLCAnSG9zdEJpbmRpbmcnLCBjb3JlTW9kdWxlKVxuICAgICAgLmZvckVhY2goKHttZW1iZXIsIGRlY29yYXRvcnN9KSA9PiB7XG4gICAgICAgIGRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgICAgIGxldCBob3N0UHJvcGVydHlOYW1lOiBzdHJpbmcgPSBtZW1iZXIubmFtZTtcbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwgJiYgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgICAgICAgICBgQEhvc3RCaW5kaW5nIGNhbiBoYXZlIGF0IG1vc3Qgb25lIGFyZ3VtZW50LCBnb3QgJHtcbiAgICAgICAgICAgICAgICAgICAgICBkZWNvcmF0b3IuYXJncy5sZW5ndGh9IGFyZ3VtZW50KHMpYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzBdKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgICBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksIHJlc29sdmVkLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0QmluZGluZydzIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaG9zdFByb3BlcnR5TmFtZSA9IHJlc29sdmVkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNpbmNlIHRoaXMgaXMgYSBkZWNvcmF0b3IsIHdlIGtub3cgdGhhdCB0aGUgdmFsdWUgaXMgYSBjbGFzcyBtZW1iZXIuIEFsd2F5cyBhY2Nlc3MgaXRcbiAgICAgICAgICAvLyB0aHJvdWdoIGB0aGlzYCBzbyB0aGF0IGZ1cnRoZXIgZG93biB0aGUgbGluZSBpdCBjYW4ndCBiZSBjb25mdXNlZCBmb3IgYSBsaXRlcmFsIHZhbHVlXG4gICAgICAgICAgLy8gKGUuZy4gaWYgdGhlcmUncyBhIHByb3BlcnR5IGNhbGxlZCBgdHJ1ZWApLiBUaGVyZSBpcyBubyBzaXplIHBlbmFsdHksIGJlY2F1c2UgYWxsXG4gICAgICAgICAgLy8gdmFsdWVzIChleGNlcHQgbGl0ZXJhbHMpIGFyZSBjb252ZXJ0ZWQgdG8gYGN0eC5wcm9wTmFtZWAgZXZlbnR1YWxseS5cbiAgICAgICAgICBiaW5kaW5ncy5wcm9wZXJ0aWVzW2hvc3RQcm9wZXJ0eU5hbWVdID0gZ2V0U2FmZVByb3BlcnR5QWNjZXNzU3RyaW5nKCd0aGlzJywgbWVtYmVyLm5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVycywgJ0hvc3RMaXN0ZW5lcicsIGNvcmVNb2R1bGUpXG4gICAgICAuZm9yRWFjaCgoe21lbWJlciwgZGVjb3JhdG9yc30pID0+IHtcbiAgICAgICAgZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICAgICAgbGV0IGV2ZW50TmFtZTogc3RyaW5nID0gbWVtYmVyLm5hbWU7XG4gICAgICAgICAgbGV0IGFyZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5hcmdzWzJdLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0TGlzdGVuZXIgY2FuIGhhdmUgYXQgbW9zdCB0d28gYXJndW1lbnRzYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzBdKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgICBkZWNvcmF0b3IuYXJnc1swXSwgcmVzb2x2ZWQsXG4gICAgICAgICAgICAgICAgICBgQEhvc3RMaXN0ZW5lcidzIGV2ZW50IG5hbWUgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBldmVudE5hbWUgPSByZXNvbHZlZDtcblxuICAgICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgICBjb25zdCBleHByZXNzaW9uID0gZGVjb3JhdG9yLmFyZ3NbMV07XG4gICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkQXJncyA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1sxXSk7XG4gICAgICAgICAgICAgIGlmICghaXNTdHJpbmdBcnJheU9yRGllKHJlc29sdmVkQXJncywgJ0BIb3N0TGlzdGVuZXIuYXJncycsIGV4cHJlc3Npb24pKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgZGVjb3JhdG9yLmFyZ3NbMV0sIHJlc29sdmVkQXJncyxcbiAgICAgICAgICAgICAgICAgICAgYEBIb3N0TGlzdGVuZXIncyBzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZyBhcnJheWApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFyZ3MgPSByZXNvbHZlZEFyZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYmluZGluZ3MubGlzdGVuZXJzW2V2ZW50TmFtZV0gPSBgJHttZW1iZXIubmFtZX0oJHthcmdzLmpvaW4oJywnKX0pYDtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5jb25zdCBRVUVSWV9UWVBFUyA9IG5ldyBTZXQoW1xuICAnQ29udGVudENoaWxkJyxcbiAgJ0NvbnRlbnRDaGlsZHJlbicsXG4gICdWaWV3Q2hpbGQnLFxuICAnVmlld0NoaWxkcmVuJyxcbl0pO1xuIl19