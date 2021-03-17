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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/directive", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/core", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/util", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
        function DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, defaultImportRecorder, injectableRegistry, isCore, semanticDepGraphUpdater, annotateForClosureCompiler, compileUndecoratedClassesWithAngularFeatures) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaRegistry = metaRegistry;
            this.scopeRegistry = scopeRegistry;
            this.metaReader = metaReader;
            this.defaultImportRecorder = defaultImportRecorder;
            this.injectableRegistry = injectableRegistry;
            this.isCore = isCore;
            this.semanticDepGraphUpdater = semanticDepGraphUpdater;
            this.annotateForClosureCompiler = annotateForClosureCompiler;
            this.compileUndecoratedClassesWithAngularFeatures = compileUndecoratedClassesWithAngularFeatures;
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
            var directiveResult = extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.defaultImportRecorder, this.isCore, flags, this.annotateForClosureCompiler);
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
                    metadataStmt: metadata_2.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore, this.annotateForClosureCompiler),
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
            this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign(tslib_1.__assign({ ref: ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.meta.queries.map(function (query) { return query.propertyName; }), isComponent: false, baseClass: analysis.baseClass }, analysis.typeCheckMeta), { isPoisoned: analysis.isPoisoned, isStructural: analysis.isStructural }));
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
                diagnostics.push.apply(diagnostics, tslib_1.__spread(providerDiagnostics));
            }
            var directiveDiagnostics = diagnostics_2.getDirectiveDiagnostics(node, this.metaReader, this.evaluator, this.reflector, this.scopeRegistry, 'Directive');
            if (directiveDiagnostics !== null) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(directiveDiagnostics));
            }
            return { diagnostics: diagnostics.length > 0 ? diagnostics : undefined };
        };
        DirectiveDecoratorHandler.prototype.compileFull = function (node, analysis, resolution, pool) {
            var def = compiler_1.compileDirectiveFromMetadata(analysis.meta, pool, compiler_1.makeBindingParser());
            return this.compileDirective(analysis, def);
        };
        DirectiveDecoratorHandler.prototype.compilePartial = function (node, analysis, resolution) {
            var def = compiler_1.compileDeclareDirectiveFromMetadata(analysis.meta);
            return this.compileDirective(analysis, def);
        };
        DirectiveDecoratorHandler.prototype.compileDirective = function (analysis, _a) {
            var initializer = _a.expression, statements = _a.statements, type = _a.type;
            var factoryRes = factory_1.compileNgFactoryDefField(tslib_1.__assign(tslib_1.__assign({}, analysis.meta), { injectFn: compiler_1.Identifiers.directiveInject, target: compiler_1.R3FactoryTarget.Directive }));
            if (analysis.metadataStmt !== null) {
                factoryRes.statements.push(analysis.metadataStmt);
            }
            return [
                factoryRes,
                {
                    name: 'ɵdir',
                    initializer: initializer,
                    statements: statements,
                    type: type,
                }
            ];
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
    function extractDirectiveMetadata(clazz, decorator, reflector, evaluator, defaultImportRecorder, isCore, flags, annotateForClosureCompiler, defaultSelector) {
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
        var queries = tslib_1.__spread(contentChildFromFields, contentChildrenFromFields);
        // Construct the list of view queries.
        var viewChildFromFields = queriesFromFields(reflection_1.filterToMembersWithDecorator(decoratedElements, 'ViewChild', coreModule), reflector, evaluator);
        var viewChildrenFromFields = queriesFromFields(reflection_1.filterToMembersWithDecorator(decoratedElements, 'ViewChildren', coreModule), reflector, evaluator);
        var viewQueries = tslib_1.__spread(viewChildFromFields, viewChildrenFromFields);
        if (directive.has('queries')) {
            var queriesFromDecorator = extractQueriesFromDecorator(directive.get('queries'), reflector, evaluator, isCore);
            queries.push.apply(queries, tslib_1.__spread(queriesFromDecorator.content));
            viewQueries.push.apply(viewQueries, tslib_1.__spread(queriesFromDecorator.view));
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
        var rawCtorDeps = util_2.getConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore);
        var ctorDeps;
        // Non-abstract directives (those with a selector) require valid constructor dependencies, whereas
        // abstract directives are allowed to have invalid dependencies, given that a subclass may call
        // the constructor explicitly.
        if (selector !== null) {
            ctorDeps = util_2.validateConstructorDependencies(clazz, rawCtorDeps);
        }
        else {
            ctorDeps = util_2.unwrapConstructorDependencies(rawCtorDeps);
        }
        var isStructural = ctorDeps !== null && ctorDeps !== 'invalid' && ctorDeps.some(function (dep) {
            if (dep.resolved !== compiler_1.R3ResolvedDependencyType.Token || !(dep.token instanceof compiler_1.ExternalExpr)) {
                return false;
            }
            if (dep.token.value.moduleName !== '@angular/core' || dep.token.value.name !== 'TemplateRef') {
                return false;
            }
            return true;
        });
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
        var node = util_2.unwrapForwardRef(args[0], reflector);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBeWE7SUFDemEsbURBQStFO0lBQy9FLCtCQUFpQztJQUVqQywyRUFBa0U7SUFDbEUsbUVBQStEO0lBQy9ELDZGQUFnTjtJQUNoTixxRUFBa007SUFDbE0sMEVBQXNFO0lBQ3RFLHVGQUFrRjtJQUNsRix5RUFBK0o7SUFFL0osdUVBQThJO0lBRTlJLDJGQUE4SjtJQUM5SixtRkFBbUQ7SUFDbkQscUZBQXdEO0lBQ3hELDZFQUF1VDtJQUV2VCxJQUFNLFlBQVksR0FBNEIsRUFBRSxDQUFDO0lBQ2pELElBQU0sZ0JBQWdCLEdBQUc7UUFDdkIsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxhQUFhO1FBQ2hHLGNBQWM7S0FDZixDQUFDO0lBQ0YsSUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDOUIsYUFBYSxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQjtRQUM5RixvQkFBb0IsRUFBRSx1QkFBdUI7S0FDOUMsQ0FBQyxDQUFDO0lBY0g7OztPQUdHO0lBQ0g7UUFBcUMsMkNBQWM7UUFHakQseUJBQ0ksSUFBc0IsRUFBa0IsUUFBcUIsRUFDN0MsTUFBNEIsRUFBa0IsT0FBNkIsRUFDM0UsUUFBdUIsRUFDdkIsYUFBcUMsRUFDckMsY0FBNEM7WUFMaEUsWUFNRSxrQkFBTSxJQUFJLENBQUMsU0FDWjtZQU4yQyxjQUFRLEdBQVIsUUFBUSxDQUFhO1lBQzdDLFlBQU0sR0FBTixNQUFNLENBQXNCO1lBQWtCLGFB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ckI7aUJBQ0Y7Z0JBRUQsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBTSxNQUFNLENBQUMsSUFBSSxTQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQUcsQ0FBQztZQUN0RSxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ1AsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQTdFRCxrREE2RUM7SUFFRCxJQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUMxQixjQUFjO1FBQ2QsaUJBQWlCO1FBQ2pCLFdBQVc7UUFDWCxjQUFjO0tBQ2YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZURlY2xhcmVEaXJlY3RpdmVGcm9tTWV0YWRhdGEsIGNvbXBpbGVEaXJlY3RpdmVGcm9tTWV0YWRhdGEsIENvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBnZXRTYWZlUHJvcGVydHlBY2Nlc3NTdHJpbmcsIElkZW50aWZpZXJzLCBtYWtlQmluZGluZ1BhcnNlciwgUGFyc2VkSG9zdEJpbmRpbmdzLCBQYXJzZUVycm9yLCBwYXJzZUhvc3RCaW5kaW5ncywgUjNDb21waWxlZEV4cHJlc3Npb24sIFIzRGVwZW5kZW5jeU1ldGFkYXRhLCBSM0RpcmVjdGl2ZU1ldGFkYXRhLCBSM0ZhY3RvcnlUYXJnZXQsIFIzUXVlcnlNZXRhZGF0YSwgUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLCBTdGF0ZW1lbnQsIHZlcmlmeUhvc3RCaW5kaW5ncywgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge2VtaXREaXN0aW5jdENoYW5nZXNPbmx5RGVmYXVsdFZhbHVlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvY29yZSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgUmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7YXJlVHlwZVBhcmFtZXRlcnNFcXVhbCwgZXh0cmFjdFNlbWFudGljVHlwZVBhcmFtZXRlcnMsIGlzQXJyYXlFcXVhbCwgaXNTZXRFcXVhbCwgaXNTeW1ib2xFcXVhbCwgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIsIFNlbWFudGljU3ltYm9sLCBTZW1hbnRpY1R5cGVQYXJhbWV0ZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7QmluZGluZ1Byb3BlcnR5TmFtZSwgQ2xhc3NQcm9wZXJ0eU1hcHBpbmcsIENsYXNzUHJvcGVydHlOYW1lLCBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnksIFRlbXBsYXRlR3VhcmRNZXRhfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge2V4dHJhY3REaXJlY3RpdmVUeXBlQ2hlY2tNZXRhfSBmcm9tICcuLi8uLi9tZXRhZGF0YS9zcmMvdXRpbCc7XG5pbXBvcnQge0R5bmFtaWNWYWx1ZSwgRW51bVZhbHVlLCBQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIERlY29yYXRvciwgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJGbGFncywgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Y3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvciwgZ2V0RGlyZWN0aXZlRGlhZ25vc3RpY3MsIGdldFByb3ZpZGVyRGlhZ25vc3RpY3MsIGdldFVuZGVjb3JhdGVkQ2xhc3NXaXRoQW5ndWxhckZlYXR1cmVzRGlhZ25vc3RpY30gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2NvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZH0gZnJvbSAnLi9mYWN0b3J5JztcbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge2NyZWF0ZVNvdXJjZVNwYW4sIGZpbmRBbmd1bGFyRGVjb3JhdG9yLCBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNBbmd1bGFyRGVjb3JhdG9yLCByZWFkQmFzZUNsYXNzLCByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIHVud3JhcEV4cHJlc3Npb24sIHVud3JhcEZvcndhcmRSZWYsIHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnMsIHdyYXBUeXBlUmVmZXJlbmNlfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9PQkpFQ1Q6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5jb25zdCBGSUVMRF9ERUNPUkFUT1JTID0gW1xuICAnSW5wdXQnLCAnT3V0cHV0JywgJ1ZpZXdDaGlsZCcsICdWaWV3Q2hpbGRyZW4nLCAnQ29udGVudENoaWxkJywgJ0NvbnRlbnRDaGlsZHJlbicsICdIb3N0QmluZGluZycsXG4gICdIb3N0TGlzdGVuZXInXG5dO1xuY29uc3QgTElGRUNZQ0xFX0hPT0tTID0gbmV3IFNldChbXG4gICduZ09uQ2hhbmdlcycsICduZ09uSW5pdCcsICduZ09uRGVzdHJveScsICduZ0RvQ2hlY2snLCAnbmdBZnRlclZpZXdJbml0JywgJ25nQWZ0ZXJWaWV3Q2hlY2tlZCcsXG4gICduZ0FmdGVyQ29udGVudEluaXQnLCAnbmdBZnRlckNvbnRlbnRDaGVja2VkJ1xuXSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlSGFuZGxlckRhdGEge1xuICBiYXNlQ2xhc3M6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPnwnZHluYW1pYyd8bnVsbDtcbiAgdHlwZUNoZWNrTWV0YTogRGlyZWN0aXZlVHlwZUNoZWNrTWV0YTtcbiAgbWV0YTogUjNEaXJlY3RpdmVNZXRhZGF0YTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcbiAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcbiAgaW5wdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZztcbiAgb3V0cHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmc7XG4gIGlzUG9pc29uZWQ6IGJvb2xlYW47XG4gIGlzU3RydWN0dXJhbDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIEFuZ3VsYXIgZGlyZWN0aXZlLiBDb21wb25lbnRzIGFyZSByZXByZXNlbnRlZCBieSBgQ29tcG9uZW50U3ltYm9sYCwgd2hpY2ggaW5oZXJpdHNcbiAqIGZyb20gdGhpcyBzeW1ib2wuXG4gKi9cbmV4cG9ydCBjbGFzcyBEaXJlY3RpdmVTeW1ib2wgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbCB7XG4gIGJhc2VDbGFzczogU2VtYW50aWNTeW1ib2x8bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBwdWJsaWMgcmVhZG9ubHkgc2VsZWN0b3I6IHN0cmluZ3xudWxsLFxuICAgICAgcHVibGljIHJlYWRvbmx5IGlucHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmcsIHB1YmxpYyByZWFkb25seSBvdXRwdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZyxcbiAgICAgIHB1YmxpYyByZWFkb25seSBleHBvcnRBczogc3RyaW5nW118bnVsbCxcbiAgICAgIHB1YmxpYyByZWFkb25seSB0eXBlQ2hlY2tNZXRhOiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLFxuICAgICAgcHVibGljIHJlYWRvbmx5IHR5cGVQYXJhbWV0ZXJzOiBTZW1hbnRpY1R5cGVQYXJhbWV0ZXJbXXxudWxsKSB7XG4gICAgc3VwZXIoZGVjbCk7XG4gIH1cblxuICBpc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIC8vIE5vdGU6IHNpbmNlIGNvbXBvbmVudHMgYW5kIGRpcmVjdGl2ZXMgaGF2ZSBleGFjdGx5IHRoZSBzYW1lIGl0ZW1zIGNvbnRyaWJ1dGluZyB0byB0aGVpclxuICAgIC8vIHB1YmxpYyBBUEksIGl0IGlzIG9rYXkgZm9yIGEgZGlyZWN0aXZlIHRvIGNoYW5nZSBpbnRvIGEgY29tcG9uZW50IGFuZCB2aWNlIHZlcnNhIHdpdGhvdXRcbiAgICAvLyB0aGUgQVBJIGJlaW5nIGFmZmVjdGVkLlxuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgRGlyZWN0aXZlU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gRGlyZWN0aXZlcyBhbmQgY29tcG9uZW50cyBoYXZlIGEgcHVibGljIEFQSSBvZjpcbiAgICAvLyAgMS4gVGhlaXIgc2VsZWN0b3IuXG4gICAgLy8gIDIuIFRoZSBiaW5kaW5nIG5hbWVzIG9mIHRoZWlyIGlucHV0cyBhbmQgb3V0cHV0czsgYSBjaGFuZ2UgaW4gb3JkZXJpbmcgaXMgYWxzbyBjb25zaWRlcmVkXG4gICAgLy8gICAgIHRvIGJlIGEgY2hhbmdlIGluIHB1YmxpYyBBUEkuXG4gICAgLy8gIDMuIFRoZSBsaXN0IG9mIGV4cG9ydEFzIG5hbWVzIGFuZCBpdHMgb3JkZXJpbmcuXG4gICAgcmV0dXJuIHRoaXMuc2VsZWN0b3IgIT09IHByZXZpb3VzU3ltYm9sLnNlbGVjdG9yIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy5pbnB1dHMucHJvcGVydHlOYW1lcywgcHJldmlvdXNTeW1ib2wuaW5wdXRzLnByb3BlcnR5TmFtZXMpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy5vdXRwdXRzLnByb3BlcnR5TmFtZXMsIHByZXZpb3VzU3ltYm9sLm91dHB1dHMucHJvcGVydHlOYW1lcykgfHxcbiAgICAgICAgIWlzQXJyYXlFcXVhbCh0aGlzLmV4cG9ydEFzLCBwcmV2aW91c1N5bWJvbC5leHBvcnRBcyk7XG4gIH1cblxuICBpc1R5cGVDaGVja0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIC8vIElmIHRoZSBwdWJsaWMgQVBJIG9mIHRoZSBkaXJlY3RpdmUgaGFzIGNoYW5nZWQsIHRoZW4gc28gaGFzIGl0cyB0eXBlLWNoZWNrIEFQSS5cbiAgICBpZiAodGhpcy5pc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBEaXJlY3RpdmVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgdHlwZS1jaGVjayBibG9jayBhbHNvIGRlcGVuZHMgb24gdGhlIGNsYXNzIHByb3BlcnR5IG5hbWVzLCBhcyB3cml0ZXMgcHJvcGVydHkgYmluZGluZ3NcbiAgICAvLyBkaXJlY3RseSBpbnRvIHRoZSBiYWNraW5nIGZpZWxkcy5cbiAgICBpZiAoIWlzQXJyYXlFcXVhbChcbiAgICAgICAgICAgIEFycmF5LmZyb20odGhpcy5pbnB1dHMpLCBBcnJheS5mcm9tKHByZXZpb3VzU3ltYm9sLmlucHV0cyksIGlzSW5wdXRNYXBwaW5nRXF1YWwpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwoXG4gICAgICAgICAgICBBcnJheS5mcm9tKHRoaXMub3V0cHV0cyksIEFycmF5LmZyb20ocHJldmlvdXNTeW1ib2wub3V0cHV0cyksIGlzSW5wdXRNYXBwaW5nRXF1YWwpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgdHlwZSBwYXJhbWV0ZXJzIG9mIGEgZGlyZWN0aXZlIGFyZSBlbWl0dGVkIGludG8gdGhlIHR5cGUgY29uc3RydWN0b3JzIGluIHRoZSB0eXBlLWNoZWNrXG4gICAgLy8gYmxvY2sgb2YgYSBjb21wb25lbnQsIHNvIGlmIHRoZSB0eXBlIHBhcmFtZXRlcnMgYXJlIG5vdCBjb25zaWRlcmVkIGVxdWFsIHRoZW4gY29uc2lkZXIgdGhlXG4gICAgLy8gdHlwZS1jaGVjayBBUEkgb2YgdGhpcyBkaXJlY3RpdmUgdG8gYmUgYWZmZWN0ZWQuXG4gICAgaWYgKCFhcmVUeXBlUGFyYW1ldGVyc0VxdWFsKHRoaXMudHlwZVBhcmFtZXRlcnMsIHByZXZpb3VzU3ltYm9sLnR5cGVQYXJhbWV0ZXJzKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gVGhlIHR5cGUtY2hlY2sgbWV0YWRhdGEgaXMgdXNlZCBkdXJpbmcgVENCIGNvZGUgZ2VuZXJhdGlvbiwgc28gYW55IGNoYW5nZXMgc2hvdWxkIGludmFsaWRhdGVcbiAgICAvLyBwcmlvciB0eXBlLWNoZWNrIGZpbGVzLlxuICAgIGlmICghaXNUeXBlQ2hlY2tNZXRhRXF1YWwodGhpcy50eXBlQ2hlY2tNZXRhLCBwcmV2aW91c1N5bWJvbC50eXBlQ2hlY2tNZXRhKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gQ2hhbmdpbmcgdGhlIGJhc2UgY2xhc3Mgb2YgYSBkaXJlY3RpdmUgbWVhbnMgdGhhdCBpdHMgaW5wdXRzL291dHB1dHMgZXRjIG1heSBoYXZlIGNoYW5nZWQsXG4gICAgLy8gc28gdGhlIHR5cGUtY2hlY2sgYmxvY2sgb2YgY29tcG9uZW50cyB0aGF0IHVzZSB0aGlzIGRpcmVjdGl2ZSBuZWVkcyB0byBiZSByZWdlbmVyYXRlZC5cbiAgICBpZiAoIWlzQmFzZUNsYXNzRXF1YWwodGhpcy5iYXNlQ2xhc3MsIHByZXZpb3VzU3ltYm9sLmJhc2VDbGFzcykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0lucHV0TWFwcGluZ0VxdWFsKFxuICAgIGN1cnJlbnQ6IFtDbGFzc1Byb3BlcnR5TmFtZSwgQmluZGluZ1Byb3BlcnR5TmFtZV0sXG4gICAgcHJldmlvdXM6IFtDbGFzc1Byb3BlcnR5TmFtZSwgQmluZGluZ1Byb3BlcnR5TmFtZV0pOiBib29sZWFuIHtcbiAgcmV0dXJuIGN1cnJlbnRbMF0gPT09IHByZXZpb3VzWzBdICYmIGN1cnJlbnRbMV0gPT09IHByZXZpb3VzWzFdO1xufVxuXG5mdW5jdGlvbiBpc1R5cGVDaGVja01ldGFFcXVhbChcbiAgICBjdXJyZW50OiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBwcmV2aW91czogRGlyZWN0aXZlVHlwZUNoZWNrTWV0YSk6IGJvb2xlYW4ge1xuICBpZiAoY3VycmVudC5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkICE9PSBwcmV2aW91cy5oYXNOZ1RlbXBsYXRlQ29udGV4dEd1YXJkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChjdXJyZW50LmlzR2VuZXJpYyAhPT0gcHJldmlvdXMuaXNHZW5lcmljKSB7XG4gICAgLy8gTm90ZTogY2hhbmdlcyBpbiB0aGUgbnVtYmVyIG9mIHR5cGUgcGFyYW1ldGVycyBpcyBhbHNvIGNvbnNpZGVyZWQgaW4gYGFyZVR5cGVQYXJhbWV0ZXJzRXF1YWxgXG4gICAgLy8gc28gdGhpcyBjaGVjayBpcyB0ZWNobmljYWxseSBub3QgbmVlZGVkOyBpdCBpcyBkb25lIGFueXdheSBmb3IgY29tcGxldGVuZXNzIGluIHRlcm1zIG9mXG4gICAgLy8gd2hldGhlciB0aGUgYERpcmVjdGl2ZVR5cGVDaGVja01ldGFgIHN0cnVjdCBpdHNlbGYgY29tcGFyZXMgZXF1YWwgb3Igbm90LlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzQXJyYXlFcXVhbChjdXJyZW50Lm5nVGVtcGxhdGVHdWFyZHMsIHByZXZpb3VzLm5nVGVtcGxhdGVHdWFyZHMsIGlzVGVtcGxhdGVHdWFyZEVxdWFsKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzU2V0RXF1YWwoY3VycmVudC5jb2VyY2VkSW5wdXRGaWVsZHMsIHByZXZpb3VzLmNvZXJjZWRJbnB1dEZpZWxkcykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFpc1NldEVxdWFsKGN1cnJlbnQucmVzdHJpY3RlZElucHV0RmllbGRzLCBwcmV2aW91cy5yZXN0cmljdGVkSW5wdXRGaWVsZHMpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghaXNTZXRFcXVhbChjdXJyZW50LnN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcywgcHJldmlvdXMuc3RyaW5nTGl0ZXJhbElucHV0RmllbGRzKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzU2V0RXF1YWwoY3VycmVudC51bmRlY2xhcmVkSW5wdXRGaWVsZHMsIHByZXZpb3VzLnVuZGVjbGFyZWRJbnB1dEZpZWxkcykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzVGVtcGxhdGVHdWFyZEVxdWFsKGN1cnJlbnQ6IFRlbXBsYXRlR3VhcmRNZXRhLCBwcmV2aW91czogVGVtcGxhdGVHdWFyZE1ldGEpOiBib29sZWFuIHtcbiAgcmV0dXJuIGN1cnJlbnQuaW5wdXROYW1lID09PSBwcmV2aW91cy5pbnB1dE5hbWUgJiYgY3VycmVudC50eXBlID09PSBwcmV2aW91cy50eXBlO1xufVxuXG5mdW5jdGlvbiBpc0Jhc2VDbGFzc0VxdWFsKGN1cnJlbnQ6IFNlbWFudGljU3ltYm9sfG51bGwsIHByZXZpb3VzOiBTZW1hbnRpY1N5bWJvbHxudWxsKTogYm9vbGVhbiB7XG4gIGlmIChjdXJyZW50ID09PSBudWxsIHx8IHByZXZpb3VzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGN1cnJlbnQgPT09IHByZXZpb3VzO1xuICB9XG5cbiAgcmV0dXJuIGlzU3ltYm9sRXF1YWwoY3VycmVudCwgcHJldmlvdXMpO1xufVxuXG5leHBvcnQgY2xhc3MgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3J8bnVsbCwgRGlyZWN0aXZlSGFuZGxlckRhdGEsIERpcmVjdGl2ZVN5bWJvbCwgdW5rbm93bj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBpbmplY3RhYmxlUmVnaXN0cnk6IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyfG51bGwsXG4gICAgICBwcml2YXRlIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBjb21waWxlVW5kZWNvcmF0ZWRDbGFzc2VzV2l0aEFuZ3VsYXJGZWF0dXJlczogYm9vbGVhbikge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgcmVhZG9ubHkgbmFtZSA9IERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIubmFtZTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6XG4gICAgICBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yfG51bGw+fHVuZGVmaW5lZCB7XG4gICAgLy8gSWYgYSBjbGFzcyBpcyB1bmRlY29yYXRlZCBidXQgdXNlcyBBbmd1bGFyIGZlYXR1cmVzLCB3ZSBkZXRlY3QgaXQgYXMgYW5cbiAgICAvLyBhYnN0cmFjdCBkaXJlY3RpdmUuIFRoaXMgaXMgYW4gdW5zdXBwb3J0ZWQgcGF0dGVybiBhcyBvZiB2MTAsIGJ1dCB3ZSB3YW50XG4gICAgLy8gdG8gc3RpbGwgZGV0ZWN0IHRoZXNlIHBhdHRlcm5zIHNvIHRoYXQgd2UgY2FuIHJlcG9ydCBkaWFnbm9zdGljcywgb3IgY29tcGlsZVxuICAgIC8vIHRoZW0gZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGluIG5nY2MuXG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICBjb25zdCBhbmd1bGFyRmllbGQgPSB0aGlzLmZpbmRDbGFzc0ZpZWxkV2l0aEFuZ3VsYXJGZWF0dXJlcyhub2RlKTtcbiAgICAgIHJldHVybiBhbmd1bGFyRmllbGQgPyB7dHJpZ2dlcjogYW5ndWxhckZpZWxkLm5vZGUsIGRlY29yYXRvcjogbnVsbCwgbWV0YWRhdGE6IG51bGx9IDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdEaXJlY3RpdmUnLCB0aGlzLmlzQ29yZSk7XG4gICAgICByZXR1cm4gZGVjb3JhdG9yID8ge3RyaWdnZXI6IGRlY29yYXRvci5ub2RlLCBkZWNvcmF0b3IsIG1ldGFkYXRhOiBkZWNvcmF0b3J9IDogdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3J8bnVsbD4sIGZsYWdzID0gSGFuZGxlckZsYWdzLk5PTkUpOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8RGlyZWN0aXZlSGFuZGxlckRhdGE+IHtcbiAgICAvLyBTa2lwIHByb2Nlc3Npbmcgb2YgdGhlIGNsYXNzIGRlY2xhcmF0aW9uIGlmIGNvbXBpbGF0aW9uIG9mIHVuZGVjb3JhdGVkIGNsYXNzZXNcbiAgICAvLyB3aXRoIEFuZ3VsYXIgZmVhdHVyZXMgaXMgZGlzYWJsZWQuIFByZXZpb3VzbHkgaW4gbmd0c2MsIHN1Y2ggY2xhc3NlcyBoYXZlIGFsd2F5c1xuICAgIC8vIGJlZW4gcHJvY2Vzc2VkLCBidXQgd2Ugd2FudCB0byBlbmZvcmNlIGEgY29uc2lzdGVudCBkZWNvcmF0b3IgbWVudGFsIG1vZGVsLlxuICAgIC8vIFNlZTogaHR0cHM6Ly92OS5hbmd1bGFyLmlvL2d1aWRlL21pZ3JhdGlvbi11bmRlY29yYXRlZC1jbGFzc2VzLlxuICAgIGlmICh0aGlzLmNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzID09PSBmYWxzZSAmJiBkZWNvcmF0b3IgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3M6IFtnZXRVbmRlY29yYXRlZENsYXNzV2l0aEFuZ3VsYXJGZWF0dXJlc0RpYWdub3N0aWMobm9kZSldfTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPSBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgIGZsYWdzLCB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKTtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gICAgY29uc3QgYW5hbHlzaXMgPSBkaXJlY3RpdmVSZXN1bHQubWV0YWRhdGE7XG5cbiAgICBsZXQgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbCA9IG51bGw7XG4gICAgaWYgKGRpcmVjdGl2ZVJlc3VsdCAhPT0gdW5kZWZpbmVkICYmIGRpcmVjdGl2ZVJlc3VsdC5kZWNvcmF0b3IuaGFzKCdwcm92aWRlcnMnKSkge1xuICAgICAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSA9IHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5KFxuICAgICAgICAgIGRpcmVjdGl2ZVJlc3VsdC5kZWNvcmF0b3IuZ2V0KCdwcm92aWRlcnMnKSEsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIGlucHV0czogZGlyZWN0aXZlUmVzdWx0LmlucHV0cyxcbiAgICAgICAgb3V0cHV0czogZGlyZWN0aXZlUmVzdWx0Lm91dHB1dHMsXG4gICAgICAgIG1ldGE6IGFuYWx5c2lzLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciksXG4gICAgICAgIGJhc2VDbGFzczogcmVhZEJhc2VDbGFzcyhub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpLFxuICAgICAgICB0eXBlQ2hlY2tNZXRhOiBleHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YShub2RlLCBkaXJlY3RpdmVSZXN1bHQuaW5wdXRzLCB0aGlzLnJlZmxlY3RvciksXG4gICAgICAgIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksXG4gICAgICAgIGlzUG9pc29uZWQ6IGZhbHNlLFxuICAgICAgICBpc1N0cnVjdHVyYWw6IGRpcmVjdGl2ZVJlc3VsdC5pc1N0cnVjdHVyYWwsXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHN5bWJvbChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8RGlyZWN0aXZlSGFuZGxlckRhdGE+KTogRGlyZWN0aXZlU3ltYm9sIHtcbiAgICBjb25zdCB0eXBlUGFyYW1ldGVycyA9IGV4dHJhY3RTZW1hbnRpY1R5cGVQYXJhbWV0ZXJzKG5vZGUpO1xuXG4gICAgcmV0dXJuIG5ldyBEaXJlY3RpdmVTeW1ib2woXG4gICAgICAgIG5vZGUsIGFuYWx5c2lzLm1ldGEuc2VsZWN0b3IsIGFuYWx5c2lzLmlucHV0cywgYW5hbHlzaXMub3V0cHV0cywgYW5hbHlzaXMubWV0YS5leHBvcnRBcyxcbiAgICAgICAgYW5hbHlzaXMudHlwZUNoZWNrTWV0YSwgdHlwZVBhcmFtZXRlcnMpO1xuICB9XG5cbiAgcmVnaXN0ZXIobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PERpcmVjdGl2ZUhhbmRsZXJEYXRhPik6IHZvaWQge1xuICAgIC8vIFJlZ2lzdGVyIHRoaXMgZGlyZWN0aXZlJ3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgYE1ldGFkYXRhUmVnaXN0cnlgLiBUaGlzIGVuc3VyZXMgdGhhdFxuICAgIC8vIHRoZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZGlyZWN0aXZlIGlzIGF2YWlsYWJsZSBkdXJpbmcgdGhlIGNvbXBpbGUoKSBwaGFzZS5cbiAgICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKG5vZGUpO1xuICAgIHRoaXMubWV0YVJlZ2lzdHJ5LnJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEoe1xuICAgICAgcmVmLFxuICAgICAgbmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgICBzZWxlY3RvcjogYW5hbHlzaXMubWV0YS5zZWxlY3RvcixcbiAgICAgIGV4cG9ydEFzOiBhbmFseXNpcy5tZXRhLmV4cG9ydEFzLFxuICAgICAgaW5wdXRzOiBhbmFseXNpcy5pbnB1dHMsXG4gICAgICBvdXRwdXRzOiBhbmFseXNpcy5vdXRwdXRzLFxuICAgICAgcXVlcmllczogYW5hbHlzaXMubWV0YS5xdWVyaWVzLm1hcChxdWVyeSA9PiBxdWVyeS5wcm9wZXJ0eU5hbWUpLFxuICAgICAgaXNDb21wb25lbnQ6IGZhbHNlLFxuICAgICAgYmFzZUNsYXNzOiBhbmFseXNpcy5iYXNlQ2xhc3MsXG4gICAgICAuLi5hbmFseXNpcy50eXBlQ2hlY2tNZXRhLFxuICAgICAgaXNQb2lzb25lZDogYW5hbHlzaXMuaXNQb2lzb25lZCxcbiAgICAgIGlzU3RydWN0dXJhbDogYW5hbHlzaXMuaXNTdHJ1Y3R1cmFsLFxuICAgIH0pO1xuXG4gICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkucmVnaXN0ZXJJbmplY3RhYmxlKG5vZGUpO1xuICB9XG5cbiAgcmVzb2x2ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogRGlyZWN0aXZlSGFuZGxlckRhdGEsIHN5bWJvbDogRGlyZWN0aXZlU3ltYm9sKTpcbiAgICAgIFJlc29sdmVSZXN1bHQ8dW5rbm93bj4ge1xuICAgIGlmICh0aGlzLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyICE9PSBudWxsICYmIGFuYWx5c2lzLmJhc2VDbGFzcyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgc3ltYm9sLmJhc2VDbGFzcyA9IHRoaXMuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIuZ2V0U3ltYm9sKGFuYWx5c2lzLmJhc2VDbGFzcy5ub2RlKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgaWYgKGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgIT09IG51bGwgJiZcbiAgICAgICAgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMgaW5zdGFuY2VvZiBXcmFwcGVkTm9kZUV4cHIpIHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyRGlhZ25vc3RpY3MgPSBnZXRQcm92aWRlckRpYWdub3N0aWNzKFxuICAgICAgICAgIGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIGFuYWx5c2lzLm1ldGEucHJvdmlkZXJzIS5ub2RlLFxuICAgICAgICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5KTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4ucHJvdmlkZXJEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlRGlhZ25vc3RpY3MgPSBnZXREaXJlY3RpdmVEaWFnbm9zdGljcyhcbiAgICAgICAgbm9kZSwgdGhpcy5tZXRhUmVhZGVyLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgJ0RpcmVjdGl2ZScpO1xuICAgIGlmIChkaXJlY3RpdmVEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5kaXJlY3RpdmVEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkaWFnbm9zdGljczogZGlhZ25vc3RpY3MubGVuZ3RoID4gMCA/IGRpYWdub3N0aWNzIDogdW5kZWZpbmVkfTtcbiAgfVxuXG4gIGNvbXBpbGVGdWxsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PERpcmVjdGl2ZUhhbmRsZXJEYXRhPixcbiAgICAgIHJlc29sdXRpb246IFJlYWRvbmx5PHVua25vd24+LCBwb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVEaXJlY3RpdmVGcm9tTWV0YWRhdGEoYW5hbHlzaXMubWV0YSwgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZURpcmVjdGl2ZShhbmFseXNpcywgZGVmKTtcbiAgfVxuXG4gIGNvbXBpbGVQYXJ0aWFsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PERpcmVjdGl2ZUhhbmRsZXJEYXRhPixcbiAgICAgIHJlc29sdXRpb246IFJlYWRvbmx5PHVua25vd24+KTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlRGVjbGFyZURpcmVjdGl2ZUZyb21NZXRhZGF0YShhbmFseXNpcy5tZXRhKTtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlRGlyZWN0aXZlKGFuYWx5c2lzLCBkZWYpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21waWxlRGlyZWN0aXZlKFxuICAgICAgYW5hbHlzaXM6IFJlYWRvbmx5PERpcmVjdGl2ZUhhbmRsZXJEYXRhPixcbiAgICAgIHtleHByZXNzaW9uOiBpbml0aWFsaXplciwgc3RhdGVtZW50cywgdHlwZX06IFIzQ29tcGlsZWRFeHByZXNzaW9uKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBmYWN0b3J5UmVzID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKHtcbiAgICAgIC4uLmFuYWx5c2lzLm1ldGEsXG4gICAgICBpbmplY3RGbjogSWRlbnRpZmllcnMuZGlyZWN0aXZlSW5qZWN0LFxuICAgICAgdGFyZ2V0OiBSM0ZhY3RvcnlUYXJnZXQuRGlyZWN0aXZlLFxuICAgIH0pO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIGZhY3RvcnlSZXMuc3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICBmYWN0b3J5UmVzLCB7XG4gICAgICAgIG5hbWU6ICfJtWRpcicsXG4gICAgICAgIGluaXRpYWxpemVyLFxuICAgICAgICBzdGF0ZW1lbnRzLFxuICAgICAgICB0eXBlLFxuICAgICAgfVxuICAgIF07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGEgZ2l2ZW4gY2xhc3MgdXNlcyBBbmd1bGFyIGZlYXR1cmVzIGFuZCByZXR1cm5zIHRoZSBUeXBlU2NyaXB0IG5vZGVcbiAgICogdGhhdCBpbmRpY2F0ZWQgdGhlIHVzYWdlLiBDbGFzc2VzIGFyZSBjb25zaWRlcmVkIHVzaW5nIEFuZ3VsYXIgZmVhdHVyZXMgaWYgdGhleVxuICAgKiBjb250YWluIGNsYXNzIG1lbWJlcnMgdGhhdCBhcmUgZWl0aGVyIGRlY29yYXRlZCB3aXRoIGEga25vd24gQW5ndWxhciBkZWNvcmF0b3IsXG4gICAqIG9yIGlmIHRoZXkgY29ycmVzcG9uZCB0byBhIGtub3duIEFuZ3VsYXIgbGlmZWN5Y2xlIGhvb2suXG4gICAqL1xuICBwcml2YXRlIGZpbmRDbGFzc0ZpZWxkV2l0aEFuZ3VsYXJGZWF0dXJlcyhub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogQ2xhc3NNZW1iZXJ8dW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3Mobm9kZSkuZmluZChtZW1iZXIgPT4ge1xuICAgICAgaWYgKCFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiZcbiAgICAgICAgICBMSUZFQ1lDTEVfSE9PS1MuaGFzKG1lbWJlci5uYW1lKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChtZW1iZXIuZGVjb3JhdG9ycykge1xuICAgICAgICByZXR1cm4gbWVtYmVyLmRlY29yYXRvcnMuc29tZShcbiAgICAgICAgICAgIGRlY29yYXRvciA9PiBGSUVMRF9ERUNPUkFUT1JTLnNvbWUoXG4gICAgICAgICAgICAgICAgZGVjb3JhdG9yTmFtZSA9PiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCBkZWNvcmF0b3JOYW1lLCB0aGlzLmlzQ29yZSkpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBleHRyYWN0IG1ldGFkYXRhIGZyb20gYSBgRGlyZWN0aXZlYCBvciBgQ29tcG9uZW50YC4gYERpcmVjdGl2ZWBzIHdpdGhvdXQgYVxuICogc2VsZWN0b3IgYXJlIGFsbG93ZWQgdG8gYmUgdXNlZCBmb3IgYWJzdHJhY3QgYmFzZSBjbGFzc2VzLiBUaGVzZSBhYnN0cmFjdCBkaXJlY3RpdmVzIHNob3VsZCBub3RcbiAqIGFwcGVhciBpbiB0aGUgZGVjbGFyYXRpb25zIG9mIGFuIGBOZ01vZHVsZWAgYW5kIGFkZGl0aW9uYWwgdmVyaWZpY2F0aW9uIGlzIGRvbmUgd2hlbiBwcm9jZXNzaW5nXG4gKiB0aGUgbW9kdWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcnxudWxsPiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgZmxhZ3M6IEhhbmRsZXJGbGFncywgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sXG4gICAgZGVmYXVsdFNlbGVjdG9yOiBzdHJpbmd8bnVsbCA9IG51bGwpOiB7XG4gIGRlY29yYXRvcjogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gIG1ldGFkYXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhLFxuICBpbnB1dHM6IENsYXNzUHJvcGVydHlNYXBwaW5nLFxuICBvdXRwdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZyxcbiAgaXNTdHJ1Y3R1cmFsOiBib29sZWFuO1xufXx1bmRlZmluZWQge1xuICBsZXQgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPjtcbiAgaWYgKGRlY29yYXRvciA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICBkaXJlY3RpdmUgPSBuZXcgTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4oKTtcbiAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEAke2RlY29yYXRvci5uYW1lfSBkZWNvcmF0b3JgKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsXG4gICAgICAgICAgYEAke2RlY29yYXRvci5uYW1lfSBhcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsYCk7XG4gICAgfVxuICAgIGRpcmVjdGl2ZSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuICB9XG5cbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ2ppdCcpKSB7XG4gICAgLy8gVGhlIG9ubHkgYWxsb3dlZCB2YWx1ZSBpcyB0cnVlLCBzbyB0aGVyZSdzIG5vIG5lZWQgdG8gZXhwYW5kIGZ1cnRoZXIuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IG1lbWJlcnMgPSByZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopO1xuXG4gIC8vIFByZWNvbXB1dGUgYSBsaXN0IG9mIHRzLkNsYXNzRWxlbWVudHMgdGhhdCBoYXZlIGRlY29yYXRvcnMuIFRoaXMgaW5jbHVkZXMgdGhpbmdzIGxpa2UgQElucHV0LFxuICAvLyBAT3V0cHV0LCBASG9zdEJpbmRpbmcsIGV0Yy5cbiAgY29uc3QgZGVjb3JhdGVkRWxlbWVudHMgPVxuICAgICAgbWVtYmVycy5maWx0ZXIobWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmRlY29yYXRvcnMgIT09IG51bGwpO1xuXG4gIGNvbnN0IGNvcmVNb2R1bGUgPSBpc0NvcmUgPyB1bmRlZmluZWQgOiAnQGFuZ3VsYXIvY29yZSc7XG5cbiAgLy8gQ29uc3RydWN0IHRoZSBtYXAgb2YgaW5wdXRzIGJvdGggZnJvbSB0aGUgQERpcmVjdGl2ZS9AQ29tcG9uZW50XG4gIC8vIGRlY29yYXRvciwgYW5kIHRoZSBkZWNvcmF0ZWRcbiAgLy8gZmllbGRzLlxuICBjb25zdCBpbnB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdpbnB1dHMnLCBldmFsdWF0b3IpO1xuICBjb25zdCBpbnB1dHNGcm9tRmllbGRzID0gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnSW5wdXQnLCBjb3JlTW9kdWxlKSwgZXZhbHVhdG9yLFxuICAgICAgcmVzb2x2ZUlucHV0KTtcblxuICAvLyBBbmQgb3V0cHV0cy5cbiAgY29uc3Qgb3V0cHV0c0Zyb21NZXRhID0gcGFyc2VGaWVsZFRvUHJvcGVydHlNYXBwaW5nKGRpcmVjdGl2ZSwgJ291dHB1dHMnLCBldmFsdWF0b3IpO1xuICBjb25zdCBvdXRwdXRzRnJvbUZpZWxkcyA9XG4gICAgICBwYXJzZURlY29yYXRlZEZpZWxkcyhcbiAgICAgICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnT3V0cHV0JywgY29yZU1vZHVsZSksIGV2YWx1YXRvcixcbiAgICAgICAgICByZXNvbHZlT3V0cHV0KSBhcyB7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9O1xuICAvLyBDb25zdHJ1Y3QgdGhlIGxpc3Qgb2YgcXVlcmllcy5cbiAgY29uc3QgY29udGVudENoaWxkRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0NvbnRlbnRDaGlsZCcsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuICBjb25zdCBjb250ZW50Q2hpbGRyZW5Gcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnQ29udGVudENoaWxkcmVuJywgY29yZU1vZHVsZSksIHJlZmxlY3RvcixcbiAgICAgIGV2YWx1YXRvcik7XG5cbiAgY29uc3QgcXVlcmllcyA9IFsuLi5jb250ZW50Q2hpbGRGcm9tRmllbGRzLCAuLi5jb250ZW50Q2hpbGRyZW5Gcm9tRmllbGRzXTtcblxuICAvLyBDb25zdHJ1Y3QgdGhlIGxpc3Qgb2YgdmlldyBxdWVyaWVzLlxuICBjb25zdCB2aWV3Q2hpbGRGcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnVmlld0NoaWxkJywgY29yZU1vZHVsZSksIHJlZmxlY3RvcixcbiAgICAgIGV2YWx1YXRvcik7XG4gIGNvbnN0IHZpZXdDaGlsZHJlbkZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdWaWV3Q2hpbGRyZW4nLCBjb3JlTW9kdWxlKSwgcmVmbGVjdG9yLFxuICAgICAgZXZhbHVhdG9yKTtcbiAgY29uc3Qgdmlld1F1ZXJpZXMgPSBbLi4udmlld0NoaWxkRnJvbUZpZWxkcywgLi4udmlld0NoaWxkcmVuRnJvbUZpZWxkc107XG5cbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ3F1ZXJpZXMnKSkge1xuICAgIGNvbnN0IHF1ZXJpZXNGcm9tRGVjb3JhdG9yID1cbiAgICAgICAgZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yKGRpcmVjdGl2ZS5nZXQoJ3F1ZXJpZXMnKSEsIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBpc0NvcmUpO1xuICAgIHF1ZXJpZXMucHVzaCguLi5xdWVyaWVzRnJvbURlY29yYXRvci5jb250ZW50KTtcbiAgICB2aWV3UXVlcmllcy5wdXNoKC4uLnF1ZXJpZXNGcm9tRGVjb3JhdG9yLnZpZXcpO1xuICB9XG5cbiAgLy8gUGFyc2UgdGhlIHNlbGVjdG9yLlxuICBsZXQgc2VsZWN0b3IgPSBkZWZhdWx0U2VsZWN0b3I7XG4gIGlmIChkaXJlY3RpdmUuaGFzKCdzZWxlY3RvcicpKSB7XG4gICAgY29uc3QgZXhwciA9IGRpcmVjdGl2ZS5nZXQoJ3NlbGVjdG9yJykhO1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHJlc29sdmVkLCBgc2VsZWN0b3IgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICAvLyB1c2UgZGVmYXVsdCBzZWxlY3RvciBpbiBjYXNlIHNlbGVjdG9yIGlzIGFuIGVtcHR5IHN0cmluZ1xuICAgIHNlbGVjdG9yID0gcmVzb2x2ZWQgPT09ICcnID8gZGVmYXVsdFNlbGVjdG9yIDogcmVzb2x2ZWQ7XG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ESVJFQ1RJVkVfTUlTU0lOR19TRUxFQ1RPUiwgZXhwcixcbiAgICAgICAgICBgRGlyZWN0aXZlICR7Y2xhenoubmFtZS50ZXh0fSBoYXMgbm8gc2VsZWN0b3IsIHBsZWFzZSBhZGQgaXQhYCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgaG9zdCA9IGV4dHJhY3RIb3N0QmluZGluZ3MoZGVjb3JhdGVkRWxlbWVudHMsIGV2YWx1YXRvciwgY29yZU1vZHVsZSwgZGlyZWN0aXZlKTtcblxuICBjb25zdCBwcm92aWRlcnM6IEV4cHJlc3Npb258bnVsbCA9IGRpcmVjdGl2ZS5oYXMoJ3Byb3ZpZGVycycpID9cbiAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIoXG4gICAgICAgICAgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgP1xuICAgICAgICAgICAgICB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKGRpcmVjdGl2ZS5nZXQoJ3Byb3ZpZGVycycpISkgOlxuICAgICAgICAgICAgICBkaXJlY3RpdmUuZ2V0KCdwcm92aWRlcnMnKSEpIDpcbiAgICAgIG51bGw7XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGBuZ09uQ2hhbmdlc2AgaXMgYSBsaWZlY3ljbGUgaG9vayBkZWZpbmVkIG9uIHRoZSBjb21wb25lbnQuXG4gIGNvbnN0IHVzZXNPbkNoYW5nZXMgPSBtZW1iZXJzLnNvbWUoXG4gICAgICBtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJlxuICAgICAgICAgIG1lbWJlci5uYW1lID09PSAnbmdPbkNoYW5nZXMnKTtcblxuICAvLyBQYXJzZSBleHBvcnRBcy5cbiAgbGV0IGV4cG9ydEFzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ2V4cG9ydEFzJykpIHtcbiAgICBjb25zdCBleHByID0gZGlyZWN0aXZlLmdldCgnZXhwb3J0QXMnKSE7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoZXhwciwgcmVzb2x2ZWQsIGBleHBvcnRBcyBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgfVxuICAgIGV4cG9ydEFzID0gcmVzb2x2ZWQuc3BsaXQoJywnKS5tYXAocGFydCA9PiBwYXJ0LnRyaW0oKSk7XG4gIH1cblxuICBjb25zdCByYXdDdG9yRGVwcyA9IGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlKTtcbiAgbGV0IGN0b3JEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfCdpbnZhbGlkJ3xudWxsO1xuXG4gIC8vIE5vbi1hYnN0cmFjdCBkaXJlY3RpdmVzICh0aG9zZSB3aXRoIGEgc2VsZWN0b3IpIHJlcXVpcmUgdmFsaWQgY29uc3RydWN0b3IgZGVwZW5kZW5jaWVzLCB3aGVyZWFzXG4gIC8vIGFic3RyYWN0IGRpcmVjdGl2ZXMgYXJlIGFsbG93ZWQgdG8gaGF2ZSBpbnZhbGlkIGRlcGVuZGVuY2llcywgZ2l2ZW4gdGhhdCBhIHN1YmNsYXNzIG1heSBjYWxsXG4gIC8vIHRoZSBjb25zdHJ1Y3RvciBleHBsaWNpdGx5LlxuICBpZiAoc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICBjdG9yRGVwcyA9IHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJhd0N0b3JEZXBzKTtcbiAgfSBlbHNlIHtcbiAgICBjdG9yRGVwcyA9IHVud3JhcENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKHJhd0N0b3JEZXBzKTtcbiAgfVxuXG4gIGNvbnN0IGlzU3RydWN0dXJhbCA9IGN0b3JEZXBzICE9PSBudWxsICYmIGN0b3JEZXBzICE9PSAnaW52YWxpZCcgJiYgY3RvckRlcHMuc29tZShkZXAgPT4ge1xuICAgIGlmIChkZXAucmVzb2x2ZWQgIT09IFIzUmVzb2x2ZWREZXBlbmRlbmN5VHlwZS5Ub2tlbiB8fCAhKGRlcC50b2tlbiBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGRlcC50b2tlbi52YWx1ZS5tb2R1bGVOYW1lICE9PSAnQGFuZ3VsYXIvY29yZScgfHwgZGVwLnRva2VuLnZhbHVlLm5hbWUgIT09ICdUZW1wbGF0ZVJlZicpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgLy8gRGV0ZWN0IGlmIHRoZSBjb21wb25lbnQgaW5oZXJpdHMgZnJvbSBhbm90aGVyIGNsYXNzXG4gIGNvbnN0IHVzZXNJbmhlcml0YW5jZSA9IHJlZmxlY3Rvci5oYXNCYXNlQ2xhc3MoY2xhenopO1xuICBjb25zdCB0eXBlID0gd3JhcFR5cGVSZWZlcmVuY2UocmVmbGVjdG9yLCBjbGF6eik7XG4gIGNvbnN0IGludGVybmFsVHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIocmVmbGVjdG9yLmdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xhenopKTtcblxuICBjb25zdCBpbnB1dHMgPSBDbGFzc1Byb3BlcnR5TWFwcGluZy5mcm9tTWFwcGVkT2JqZWN0KHsuLi5pbnB1dHNGcm9tTWV0YSwgLi4uaW5wdXRzRnJvbUZpZWxkc30pO1xuICBjb25zdCBvdXRwdXRzID0gQ2xhc3NQcm9wZXJ0eU1hcHBpbmcuZnJvbU1hcHBlZE9iamVjdCh7Li4ub3V0cHV0c0Zyb21NZXRhLCAuLi5vdXRwdXRzRnJvbUZpZWxkc30pO1xuXG4gIGNvbnN0IG1ldGFkYXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhID0ge1xuICAgIG5hbWU6IGNsYXp6Lm5hbWUudGV4dCxcbiAgICBkZXBzOiBjdG9yRGVwcyxcbiAgICBob3N0LFxuICAgIGxpZmVjeWNsZToge1xuICAgICAgdXNlc09uQ2hhbmdlcyxcbiAgICB9LFxuICAgIGlucHV0czogaW5wdXRzLnRvSm9pbnRNYXBwZWRPYmplY3QoKSxcbiAgICBvdXRwdXRzOiBvdXRwdXRzLnRvRGlyZWN0TWFwcGVkT2JqZWN0KCksXG4gICAgcXVlcmllcyxcbiAgICB2aWV3UXVlcmllcyxcbiAgICBzZWxlY3RvcixcbiAgICBmdWxsSW5oZXJpdGFuY2U6ICEhKGZsYWdzICYgSGFuZGxlckZsYWdzLkZVTExfSU5IRVJJVEFOQ0UpLFxuICAgIHR5cGUsXG4gICAgaW50ZXJuYWxUeXBlLFxuICAgIHR5cGVBcmd1bWVudENvdW50OiByZWZsZWN0b3IuZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6eikgfHwgMCxcbiAgICB0eXBlU291cmNlU3BhbjogY3JlYXRlU291cmNlU3BhbihjbGF6ei5uYW1lKSxcbiAgICB1c2VzSW5oZXJpdGFuY2UsXG4gICAgZXhwb3J0QXMsXG4gICAgcHJvdmlkZXJzXG4gIH07XG4gIHJldHVybiB7XG4gICAgZGVjb3JhdG9yOiBkaXJlY3RpdmUsXG4gICAgbWV0YWRhdGEsXG4gICAgaW5wdXRzLFxuICAgIG91dHB1dHMsXG4gICAgaXNTdHJ1Y3R1cmFsLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFF1ZXJ5TWV0YWRhdGEoXG4gICAgZXhwck5vZGU6IHRzLk5vZGUsIG5hbWU6IHN0cmluZywgYXJnczogUmVhZG9ubHlBcnJheTx0cy5FeHByZXNzaW9uPiwgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogUjNRdWVyeU1ldGFkYXRhIHtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBleHByTm9kZSwgYEAke25hbWV9IG11c3QgaGF2ZSBhcmd1bWVudHNgKTtcbiAgfVxuICBjb25zdCBmaXJzdCA9IG5hbWUgPT09ICdWaWV3Q2hpbGQnIHx8IG5hbWUgPT09ICdDb250ZW50Q2hpbGQnO1xuICBjb25zdCBub2RlID0gdW53cmFwRm9yd2FyZFJlZihhcmdzWzBdLCByZWZsZWN0b3IpO1xuICBjb25zdCBhcmcgPSBldmFsdWF0b3IuZXZhbHVhdGUobm9kZSk7XG5cbiAgLyoqIFdoZXRoZXIgb3Igbm90IHRoaXMgcXVlcnkgc2hvdWxkIGNvbGxlY3Qgb25seSBzdGF0aWMgcmVzdWx0cyAoc2VlIHZpZXcvYXBpLnRzKSAgKi9cbiAgbGV0IGlzU3RhdGljOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLy8gRXh0cmFjdCB0aGUgcHJlZGljYXRlXG4gIGxldCBwcmVkaWNhdGU6IEV4cHJlc3Npb258c3RyaW5nW118bnVsbCA9IG51bGw7XG4gIGlmIChhcmcgaW5zdGFuY2VvZiBSZWZlcmVuY2UgfHwgYXJnIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgLy8gUmVmZXJlbmNlcyBhbmQgcHJlZGljYXRlcyB0aGF0IGNvdWxkIG5vdCBiZSBldmFsdWF0ZWQgc3RhdGljYWxseSBhcmUgZW1pdHRlZCBhcyBpcy5cbiAgICBwcmVkaWNhdGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKG5vZGUpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgcHJlZGljYXRlID0gW2FyZ107XG4gIH0gZWxzZSBpZiAoaXNTdHJpbmdBcnJheU9yRGllKGFyZywgYEAke25hbWV9IHByZWRpY2F0ZWAsIG5vZGUpKSB7XG4gICAgcHJlZGljYXRlID0gYXJnO1xuICB9IGVsc2Uge1xuICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3Iobm9kZSwgYXJnLCBgQCR7bmFtZX0gcHJlZGljYXRlIGNhbm5vdCBiZSBpbnRlcnByZXRlZGApO1xuICB9XG5cbiAgLy8gRXh0cmFjdCB0aGUgcmVhZCBhbmQgZGVzY2VuZGFudHMgb3B0aW9ucy5cbiAgbGV0IHJlYWQ6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gIC8vIFRoZSBkZWZhdWx0IHZhbHVlIGZvciBkZXNjZW5kYW50cyBpcyB0cnVlIGZvciBldmVyeSBkZWNvcmF0b3IgZXhjZXB0IEBDb250ZW50Q2hpbGRyZW4uXG4gIGxldCBkZXNjZW5kYW50czogYm9vbGVhbiA9IG5hbWUgIT09ICdDb250ZW50Q2hpbGRyZW4nO1xuICBsZXQgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHk6IGJvb2xlYW4gPSBlbWl0RGlzdGluY3RDaGFuZ2VzT25seURlZmF1bHRWYWx1ZTtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAyKSB7XG4gICAgY29uc3Qgb3B0aW9uc0V4cHIgPSB1bndyYXBFeHByZXNzaW9uKGFyZ3NbMV0pO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihvcHRpb25zRXhwcikpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgb3B0aW9uc0V4cHIsXG4gICAgICAgICAgYEAke25hbWV9IG9wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbGApO1xuICAgIH1cbiAgICBjb25zdCBvcHRpb25zID0gcmVmbGVjdE9iamVjdExpdGVyYWwob3B0aW9uc0V4cHIpO1xuICAgIGlmIChvcHRpb25zLmhhcygncmVhZCcpKSB7XG4gICAgICByZWFkID0gbmV3IFdyYXBwZWROb2RlRXhwcihvcHRpb25zLmdldCgncmVhZCcpISk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuaGFzKCdkZXNjZW5kYW50cycpKSB7XG4gICAgICBjb25zdCBkZXNjZW5kYW50c0V4cHIgPSBvcHRpb25zLmdldCgnZGVzY2VuZGFudHMnKSE7XG4gICAgICBjb25zdCBkZXNjZW5kYW50c1ZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlc2NlbmRhbnRzRXhwcik7XG4gICAgICBpZiAodHlwZW9mIGRlc2NlbmRhbnRzVmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgZGVzY2VuZGFudHNFeHByLCBkZXNjZW5kYW50c1ZhbHVlLCBgQCR7bmFtZX0gb3B0aW9ucy5kZXNjZW5kYW50cyBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgfVxuICAgICAgZGVzY2VuZGFudHMgPSBkZXNjZW5kYW50c1ZhbHVlO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmhhcygnZW1pdERpc3RpbmN0Q2hhbmdlc09ubHknKSkge1xuICAgICAgY29uc3QgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlFeHByID0gb3B0aW9ucy5nZXQoJ2VtaXREaXN0aW5jdENoYW5nZXNPbmx5JykhO1xuICAgICAgY29uc3QgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShlbWl0RGlzdGluY3RDaGFuZ2VzT25seUV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiBlbWl0RGlzdGluY3RDaGFuZ2VzT25seVZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5RXhwciwgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlWYWx1ZSxcbiAgICAgICAgICAgIGBAJHtuYW1lfSBvcHRpb25zLmVtaXREaXN0aW5jdENoYW5nZXNPbmx5IG11c3QgYmUgYSBib29sZWFuYCk7XG4gICAgICB9XG4gICAgICBlbWl0RGlzdGluY3RDaGFuZ2VzT25seSA9IGVtaXREaXN0aW5jdENoYW5nZXNPbmx5VmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuaGFzKCdzdGF0aWMnKSkge1xuICAgICAgY29uc3Qgc3RhdGljVmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGUob3B0aW9ucy5nZXQoJ3N0YXRpYycpISk7XG4gICAgICBpZiAodHlwZW9mIHN0YXRpY1ZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIG5vZGUsIHN0YXRpY1ZhbHVlLCBgQCR7bmFtZX0gb3B0aW9ucy5zdGF0aWMgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIGlzU3RhdGljID0gc3RhdGljVmFsdWU7XG4gICAgfVxuXG4gIH0gZWxzZSBpZiAoYXJncy5sZW5ndGggPiAyKSB7XG4gICAgLy8gVG9vIG1hbnkgYXJndW1lbnRzLlxuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgbm9kZSwgYEAke25hbWV9IGhhcyB0b28gbWFueSBhcmd1bWVudHNgKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcHJvcGVydHlOYW1lLFxuICAgIHByZWRpY2F0ZSxcbiAgICBmaXJzdCxcbiAgICBkZXNjZW5kYW50cyxcbiAgICByZWFkLFxuICAgIHN0YXRpYzogaXNTdGF0aWMsXG4gICAgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0UXVlcmllc0Zyb21EZWNvcmF0b3IoXG4gICAgcXVlcnlEYXRhOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgaXNDb3JlOiBib29sZWFuKToge1xuICBjb250ZW50OiBSM1F1ZXJ5TWV0YWRhdGFbXSxcbiAgdmlldzogUjNRdWVyeU1ldGFkYXRhW10sXG59IHtcbiAgY29uc3QgY29udGVudDogUjNRdWVyeU1ldGFkYXRhW10gPSBbXSwgdmlldzogUjNRdWVyeU1ldGFkYXRhW10gPSBbXTtcbiAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHF1ZXJ5RGF0YSkpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcXVlcnlEYXRhLFxuICAgICAgICAnRGVjb3JhdG9yIHF1ZXJpZXMgbWV0YWRhdGEgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbCcpO1xuICB9XG4gIHJlZmxlY3RPYmplY3RMaXRlcmFsKHF1ZXJ5RGF0YSkuZm9yRWFjaCgocXVlcnlFeHByLCBwcm9wZXJ0eU5hbWUpID0+IHtcbiAgICBxdWVyeUV4cHIgPSB1bndyYXBFeHByZXNzaW9uKHF1ZXJ5RXhwcik7XG4gICAgaWYgKCF0cy5pc05ld0V4cHJlc3Npb24ocXVlcnlFeHByKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcXVlcnlEYXRhLFxuICAgICAgICAgICdEZWNvcmF0b3IgcXVlcnkgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBhIHF1ZXJ5IHR5cGUnKTtcbiAgICB9XG4gICAgY29uc3QgcXVlcnlUeXBlID0gdHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ocXVlcnlFeHByLmV4cHJlc3Npb24pID9cbiAgICAgICAgcXVlcnlFeHByLmV4cHJlc3Npb24ubmFtZSA6XG4gICAgICAgIHF1ZXJ5RXhwci5leHByZXNzaW9uO1xuICAgIGlmICghdHMuaXNJZGVudGlmaWVyKHF1ZXJ5VHlwZSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHF1ZXJ5RGF0YSxcbiAgICAgICAgICAnRGVjb3JhdG9yIHF1ZXJ5IG1ldGFkYXRhIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgYSBxdWVyeSB0eXBlJyk7XG4gICAgfVxuICAgIGNvbnN0IHR5cGUgPSByZWZsZWN0b3IuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHF1ZXJ5VHlwZSk7XG4gICAgaWYgKHR5cGUgPT09IG51bGwgfHwgKCFpc0NvcmUgJiYgdHlwZS5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScpIHx8XG4gICAgICAgICFRVUVSWV9UWVBFUy5oYXModHlwZS5uYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcXVlcnlEYXRhLFxuICAgICAgICAgICdEZWNvcmF0b3IgcXVlcnkgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBhIHF1ZXJ5IHR5cGUnKTtcbiAgICB9XG5cbiAgICBjb25zdCBxdWVyeSA9IGV4dHJhY3RRdWVyeU1ldGFkYXRhKFxuICAgICAgICBxdWVyeUV4cHIsIHR5cGUubmFtZSwgcXVlcnlFeHByLmFyZ3VtZW50cyB8fCBbXSwgcHJvcGVydHlOYW1lLCByZWZsZWN0b3IsIGV2YWx1YXRvcik7XG4gICAgaWYgKHR5cGUubmFtZS5zdGFydHNXaXRoKCdDb250ZW50JykpIHtcbiAgICAgIGNvbnRlbnQucHVzaChxdWVyeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZpZXcucHVzaChxdWVyeSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHtjb250ZW50LCB2aWV3fTtcbn1cblxuZnVuY3Rpb24gaXNTdHJpbmdBcnJheU9yRGllKHZhbHVlOiBhbnksIG5hbWU6IHN0cmluZywgbm9kZTogdHMuRXhwcmVzc2lvbik6IHZhbHVlIGlzIHN0cmluZ1tdIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlW2ldICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICBub2RlLCB2YWx1ZVtpXSwgYEZhaWxlZCB0byByZXNvbHZlICR7bmFtZX0gYXQgcG9zaXRpb24gJHtpfSB0byBhIHN0cmluZ2ApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRmllbGRBcnJheVZhbHVlKFxuICAgIGRpcmVjdGl2ZTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGZpZWxkOiBzdHJpbmcsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IG51bGx8XG4gICAgc3RyaW5nW10ge1xuICBpZiAoIWRpcmVjdGl2ZS5oYXMoZmllbGQpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBSZXNvbHZlIHRoZSBmaWVsZCBvZiBpbnRlcmVzdCBmcm9tIHRoZSBkaXJlY3RpdmUgbWV0YWRhdGEgdG8gYSBzdHJpbmdbXS5cbiAgY29uc3QgZXhwcmVzc2lvbiA9IGRpcmVjdGl2ZS5nZXQoZmllbGQpITtcbiAgY29uc3QgdmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcmVzc2lvbik7XG4gIGlmICghaXNTdHJpbmdBcnJheU9yRGllKHZhbHVlLCBmaWVsZCwgZXhwcmVzc2lvbikpIHtcbiAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICBleHByZXNzaW9uLCB2YWx1ZSwgYEZhaWxlZCB0byByZXNvbHZlIEBEaXJlY3RpdmUuJHtmaWVsZH0gdG8gYSBzdHJpbmcgYXJyYXlgKTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBJbnRlcnByZXQgcHJvcGVydHkgbWFwcGluZyBmaWVsZHMgb24gdGhlIGRlY29yYXRvciAoZS5nLiBpbnB1dHMgb3Igb3V0cHV0cykgYW5kIHJldHVybiB0aGVcbiAqIGNvcnJlY3RseSBzaGFwZWQgbWV0YWRhdGEgb2JqZWN0LlxuICovXG5mdW5jdGlvbiBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoXG4gICAgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZyxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiB7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3QgbWV0YVZhbHVlcyA9IHBhcnNlRmllbGRBcnJheVZhbHVlKGRpcmVjdGl2ZSwgZmllbGQsIGV2YWx1YXRvcik7XG4gIGlmICghbWV0YVZhbHVlcykge1xuICAgIHJldHVybiBFTVBUWV9PQkpFQ1Q7XG4gIH1cblxuICByZXR1cm4gbWV0YVZhbHVlcy5yZWR1Y2UoKHJlc3VsdHMsIHZhbHVlKSA9PiB7XG4gICAgLy8gRWl0aGVyIHRoZSB2YWx1ZSBpcyAnZmllbGQnIG9yICdmaWVsZDogcHJvcGVydHknLiBJbiB0aGUgZmlyc3QgY2FzZSwgYHByb3BlcnR5YCB3aWxsXG4gICAgLy8gYmUgdW5kZWZpbmVkLCBpbiB3aGljaCBjYXNlIHRoZSBmaWVsZCBuYW1lIHNob3VsZCBhbHNvIGJlIHVzZWQgYXMgdGhlIHByb3BlcnR5IG5hbWUuXG4gICAgY29uc3QgW2ZpZWxkLCBwcm9wZXJ0eV0gPSB2YWx1ZS5zcGxpdCgnOicsIDIpLm1hcChzdHIgPT4gc3RyLnRyaW0oKSk7XG4gICAgcmVzdWx0c1tmaWVsZF0gPSBwcm9wZXJ0eSB8fCBmaWVsZDtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSwge30gYXMge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfSk7XG59XG5cbi8qKlxuICogUGFyc2UgcHJvcGVydHkgZGVjb3JhdG9ycyAoZS5nLiBgSW5wdXRgIG9yIGBPdXRwdXRgKSBhbmQgcmV0dXJuIHRoZSBjb3JyZWN0bHkgc2hhcGVkIG1ldGFkYXRhXG4gKiBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgIGZpZWxkczoge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfVtdLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgbWFwVmFsdWVSZXNvbHZlcjogKHB1YmxpY05hbWU6IHN0cmluZywgaW50ZXJuYWxOYW1lOiBzdHJpbmcpID0+XG4gICAgICAgIHN0cmluZyB8IFtzdHJpbmcsIHN0cmluZ10pOiB7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd8W3N0cmluZywgc3RyaW5nXX0ge1xuICByZXR1cm4gZmllbGRzLnJlZHVjZSgocmVzdWx0cywgZmllbGQpID0+IHtcbiAgICBjb25zdCBmaWVsZE5hbWUgPSBmaWVsZC5tZW1iZXIubmFtZTtcbiAgICBmaWVsZC5kZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgIC8vIFRoZSBkZWNvcmF0b3IgZWl0aGVyIGRvZXNuJ3QgaGF2ZSBhbiBhcmd1bWVudCAoQElucHV0KCkpIGluIHdoaWNoIGNhc2UgdGhlIHByb3BlcnR5XG4gICAgICAvLyBuYW1lIGlzIHVzZWQsIG9yIGl0IGhhcyBvbmUgYXJndW1lbnQgKEBPdXRwdXQoJ25hbWVkJykpLlxuICAgICAgaWYgKGRlY29yYXRvci5hcmdzID09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJlc3VsdHNbZmllbGROYW1lXSA9IGZpZWxkTmFtZTtcbiAgICAgIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGNvbnN0IHByb3BlcnR5ID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzBdKTtcbiAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksIHByb3BlcnR5LFxuICAgICAgICAgICAgICBgQCR7ZGVjb3JhdG9yLm5hbWV9IGRlY29yYXRvciBhcmd1bWVudCBtdXN0IHJlc29sdmUgdG8gYSBzdHJpbmdgKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzW2ZpZWxkTmFtZV0gPSBtYXBWYWx1ZVJlc29sdmVyKHByb3BlcnR5LCBmaWVsZE5hbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVG9vIG1hbnkgYXJndW1lbnRzLlxuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgICBgQCR7ZGVjb3JhdG9yLm5hbWV9IGNhbiBoYXZlIGF0IG1vc3Qgb25lIGFyZ3VtZW50LCBnb3QgJHtcbiAgICAgICAgICAgICAgICBkZWNvcmF0b3IuYXJncy5sZW5ndGh9IGFyZ3VtZW50KHMpYCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH0sIHt9IGFzIHtbZmllbGQ6IHN0cmluZ106IHN0cmluZyB8IFtzdHJpbmcsIHN0cmluZ119KTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZUlucHV0KHB1YmxpY05hbWU6IHN0cmluZywgaW50ZXJuYWxOYW1lOiBzdHJpbmcpOiBbc3RyaW5nLCBzdHJpbmddIHtcbiAgcmV0dXJuIFtwdWJsaWNOYW1lLCBpbnRlcm5hbE5hbWVdO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlT3V0cHV0KHB1YmxpY05hbWU6IHN0cmluZywgaW50ZXJuYWxOYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHB1YmxpY05hbWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICBmaWVsZHM6IHttZW1iZXI6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXX1bXSwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBSM1F1ZXJ5TWV0YWRhdGFbXSB7XG4gIHJldHVybiBmaWVsZHMubWFwKCh7bWVtYmVyLCBkZWNvcmF0b3JzfSkgPT4ge1xuICAgIGNvbnN0IGRlY29yYXRvciA9IGRlY29yYXRvcnNbMF07XG4gICAgY29uc3Qgbm9kZSA9IG1lbWJlci5ub2RlIHx8IERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKTtcblxuICAgIC8vIFRocm93IGluIGNhc2Ugb2YgYEBJbnB1dCgpIEBDb250ZW50Q2hpbGQoJ2ZvbycpIGZvbzogYW55YCwgd2hpY2ggaXMgbm90IHN1cHBvcnRlZCBpbiBJdnlcbiAgICBpZiAobWVtYmVyLmRlY29yYXRvcnMhLnNvbWUodiA9PiB2Lm5hbWUgPT09ICdJbnB1dCcpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9DT0xMSVNJT04sIG5vZGUsXG4gICAgICAgICAgJ0Nhbm5vdCBjb21iaW5lIEBJbnB1dCBkZWNvcmF0b3JzIHdpdGggcXVlcnkgZGVjb3JhdG9ycycpO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0NPTExJU0lPTiwgbm9kZSxcbiAgICAgICAgICAnQ2Fubm90IGhhdmUgbXVsdGlwbGUgcXVlcnkgZGVjb3JhdG9ycyBvbiB0aGUgc2FtZSBjbGFzcyBtZW1iZXInKTtcbiAgICB9IGVsc2UgaWYgKCFpc1Byb3BlcnR5VHlwZU1lbWJlcihtZW1iZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9VTkVYUEVDVEVELCBub2RlLFxuICAgICAgICAgICdRdWVyeSBkZWNvcmF0b3IgbXVzdCBnbyBvbiBhIHByb3BlcnR5LXR5cGUgbWVtYmVyJyk7XG4gICAgfVxuICAgIHJldHVybiBleHRyYWN0UXVlcnlNZXRhZGF0YShcbiAgICAgICAgbm9kZSwgZGVjb3JhdG9yLm5hbWUsIGRlY29yYXRvci5hcmdzIHx8IFtdLCBtZW1iZXIubmFtZSwgcmVmbGVjdG9yLCBldmFsdWF0b3IpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaXNQcm9wZXJ0eVR5cGVNZW1iZXIobWVtYmVyOiBDbGFzc01lbWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5HZXR0ZXIgfHwgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5TZXR0ZXIgfHxcbiAgICAgIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG59XG5cbnR5cGUgU3RyaW5nTWFwPFQ+ID0ge1xuICBba2V5OiBzdHJpbmddOiBUO1xufTtcblxuZnVuY3Rpb24gZXZhbHVhdGVIb3N0RXhwcmVzc2lvbkJpbmRpbmdzKFxuICAgIGhvc3RFeHByOiB0cy5FeHByZXNzaW9uLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBQYXJzZWRIb3N0QmluZGluZ3Mge1xuICBjb25zdCBob3N0TWV0YU1hcCA9IGV2YWx1YXRvci5ldmFsdWF0ZShob3N0RXhwcik7XG4gIGlmICghKGhvc3RNZXRhTWFwIGluc3RhbmNlb2YgTWFwKSkge1xuICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgIGhvc3RFeHByLCBob3N0TWV0YU1hcCwgYERlY29yYXRvciBob3N0IG1ldGFkYXRhIG11c3QgYmUgYW4gb2JqZWN0YCk7XG4gIH1cbiAgY29uc3QgaG9zdE1ldGFkYXRhOiBTdHJpbmdNYXA8c3RyaW5nfEV4cHJlc3Npb24+ID0ge307XG4gIGhvc3RNZXRhTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAvLyBSZXNvbHZlIEVudW0gcmVmZXJlbmNlcyB0byB0aGVpciBkZWNsYXJlZCB2YWx1ZS5cbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbnVtVmFsdWUpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUucmVzb2x2ZWQ7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgIGhvc3RFeHByLCBrZXksXG4gICAgICAgICAgYERlY29yYXRvciBob3N0IG1ldGFkYXRhIG11c3QgYmUgYSBzdHJpbmcgLT4gc3RyaW5nIG9iamVjdCwgYnV0IGZvdW5kIHVucGFyc2VhYmxlIGtleWApO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgIGhvc3RNZXRhZGF0YVtrZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgaG9zdE1ldGFkYXRhW2tleV0gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHZhbHVlLm5vZGUgYXMgdHMuRXhwcmVzc2lvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgaG9zdEV4cHIsIHZhbHVlLFxuICAgICAgICAgIGBEZWNvcmF0b3IgaG9zdCBtZXRhZGF0YSBtdXN0IGJlIGEgc3RyaW5nIC0+IHN0cmluZyBvYmplY3QsIGJ1dCBmb3VuZCB1bnBhcnNlYWJsZSB2YWx1ZWApO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgYmluZGluZ3MgPSBwYXJzZUhvc3RCaW5kaW5ncyhob3N0TWV0YWRhdGEpO1xuXG4gIGNvbnN0IGVycm9ycyA9IHZlcmlmeUhvc3RCaW5kaW5ncyhiaW5kaW5ncywgY3JlYXRlU291cmNlU3Bhbihob3N0RXhwcikpO1xuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIC8vIFRPRE86IHByb3ZpZGUgbW9yZSBncmFudWxhciBkaWFnbm9zdGljIGFuZCBvdXRwdXQgc3BlY2lmaWMgaG9zdCBleHByZXNzaW9uIHRoYXRcbiAgICAgICAgLy8gdHJpZ2dlcmVkIGFuIGVycm9yIGluc3RlYWQgb2YgdGhlIHdob2xlIGhvc3Qgb2JqZWN0LlxuICAgICAgICBFcnJvckNvZGUuSE9TVF9CSU5ESU5HX1BBUlNFX0VSUk9SLCBob3N0RXhwcixcbiAgICAgICAgZXJyb3JzLm1hcCgoZXJyb3I6IFBhcnNlRXJyb3IpID0+IGVycm9yLm1zZykuam9pbignXFxuJykpO1xuICB9XG5cbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEhvc3RCaW5kaW5ncyhcbiAgICBtZW1iZXJzOiBDbGFzc01lbWJlcltdLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsIGNvcmVNb2R1bGU6IHN0cmluZ3x1bmRlZmluZWQsXG4gICAgbWV0YWRhdGE/OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPik6IFBhcnNlZEhvc3RCaW5kaW5ncyB7XG4gIGxldCBiaW5kaW5nczogUGFyc2VkSG9zdEJpbmRpbmdzO1xuICBpZiAobWV0YWRhdGEgJiYgbWV0YWRhdGEuaGFzKCdob3N0JykpIHtcbiAgICBiaW5kaW5ncyA9IGV2YWx1YXRlSG9zdEV4cHJlc3Npb25CaW5kaW5ncyhtZXRhZGF0YS5nZXQoJ2hvc3QnKSEsIGV2YWx1YXRvcik7XG4gIH0gZWxzZSB7XG4gICAgYmluZGluZ3MgPSBwYXJzZUhvc3RCaW5kaW5ncyh7fSk7XG4gIH1cblxuICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKG1lbWJlcnMsICdIb3N0QmluZGluZycsIGNvcmVNb2R1bGUpXG4gICAgICAuZm9yRWFjaCgoe21lbWJlciwgZGVjb3JhdG9yc30pID0+IHtcbiAgICAgICAgZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICAgICAgbGV0IGhvc3RQcm9wZXJ0eU5hbWU6IHN0cmluZyA9IG1lbWJlci5uYW1lO1xuICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncyAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgICAgICAgICAgIGBASG9zdEJpbmRpbmcgY2FuIGhhdmUgYXQgbW9zdCBvbmUgYXJndW1lbnQsIGdvdCAke1xuICAgICAgICAgICAgICAgICAgICAgIGRlY29yYXRvci5hcmdzLmxlbmd0aH0gYXJndW1lbnQocylgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgICAgIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSwgcmVzb2x2ZWQsXG4gICAgICAgICAgICAgICAgICBgQEhvc3RCaW5kaW5nJ3MgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBob3N0UHJvcGVydHlOYW1lID0gcmVzb2x2ZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2luY2UgdGhpcyBpcyBhIGRlY29yYXRvciwgd2Uga25vdyB0aGF0IHRoZSB2YWx1ZSBpcyBhIGNsYXNzIG1lbWJlci4gQWx3YXlzIGFjY2VzcyBpdFxuICAgICAgICAgIC8vIHRocm91Z2ggYHRoaXNgIHNvIHRoYXQgZnVydGhlciBkb3duIHRoZSBsaW5lIGl0IGNhbid0IGJlIGNvbmZ1c2VkIGZvciBhIGxpdGVyYWwgdmFsdWVcbiAgICAgICAgICAvLyAoZS5nLiBpZiB0aGVyZSdzIGEgcHJvcGVydHkgY2FsbGVkIGB0cnVlYCkuIFRoZXJlIGlzIG5vIHNpemUgcGVuYWx0eSwgYmVjYXVzZSBhbGxcbiAgICAgICAgICAvLyB2YWx1ZXMgKGV4Y2VwdCBsaXRlcmFscykgYXJlIGNvbnZlcnRlZCB0byBgY3R4LnByb3BOYW1lYCBldmVudHVhbGx5LlxuICAgICAgICAgIGJpbmRpbmdzLnByb3BlcnRpZXNbaG9zdFByb3BlcnR5TmFtZV0gPSBnZXRTYWZlUHJvcGVydHlBY2Nlc3NTdHJpbmcoJ3RoaXMnLCBtZW1iZXIubmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihtZW1iZXJzLCAnSG9zdExpc3RlbmVyJywgY29yZU1vZHVsZSlcbiAgICAgIC5mb3JFYWNoKCh7bWVtYmVyLCBkZWNvcmF0b3JzfSkgPT4ge1xuICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgICAgICBsZXQgZXZlbnROYW1lOiBzdHJpbmcgPSBtZW1iZXIubmFtZTtcbiAgICAgICAgICBsZXQgYXJnczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwgJiYgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLmFyZ3NbMl0sXG4gICAgICAgICAgICAgICAgICBgQEhvc3RMaXN0ZW5lciBjYW4gaGF2ZSBhdCBtb3N0IHR3byBhcmd1bWVudHNgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgICAgIGRlY29yYXRvci5hcmdzWzBdLCByZXNvbHZlZCxcbiAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyJ3MgZXZlbnQgbmFtZSBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV2ZW50TmFtZSA9IHJlc29sdmVkO1xuXG4gICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb24gPSBkZWNvcmF0b3IuYXJnc1sxXTtcbiAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRBcmdzID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzFdKTtcbiAgICAgICAgICAgICAgaWYgKCFpc1N0cmluZ0FycmF5T3JEaWUocmVzb2x2ZWRBcmdzLCAnQEhvc3RMaXN0ZW5lci5hcmdzJywgZXhwcmVzc2lvbikpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgICAgICBkZWNvcmF0b3IuYXJnc1sxXSwgcmVzb2x2ZWRBcmdzLFxuICAgICAgICAgICAgICAgICAgICBgQEhvc3RMaXN0ZW5lcidzIHNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nIGFycmF5YCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXJncyA9IHJlc29sdmVkQXJncztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBiaW5kaW5ncy5saXN0ZW5lcnNbZXZlbnROYW1lXSA9IGAke21lbWJlci5uYW1lfSgke2FyZ3Muam9pbignLCcpfSlgO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICByZXR1cm4gYmluZGluZ3M7XG59XG5cbmNvbnN0IFFVRVJZX1RZUEVTID0gbmV3IFNldChbXG4gICdDb250ZW50Q2hpbGQnLFxuICAnQ29udGVudENoaWxkcmVuJyxcbiAgJ1ZpZXdDaGlsZCcsXG4gICdWaWV3Q2hpbGRyZW4nLFxuXSk7XG4iXX0=