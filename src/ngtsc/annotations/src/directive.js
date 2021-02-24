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
        function DirectiveSymbol(decl, selector, inputs, outputs, exportAs) {
            var _this = _super.call(this, decl) || this;
            _this.selector = selector;
            _this.inputs = inputs;
            _this.outputs = outputs;
            _this.exportAs = exportAs;
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
                !semantic_graph_1.isArrayEqual(this.inputs, previousSymbol.inputs) ||
                !semantic_graph_1.isArrayEqual(this.outputs, previousSymbol.outputs) ||
                !semantic_graph_1.isArrayEqual(this.exportAs, previousSymbol.exportAs);
        };
        return DirectiveSymbol;
    }(semantic_graph_1.SemanticSymbol));
    exports.DirectiveSymbol = DirectiveSymbol;
    var DirectiveDecoratorHandler = /** @class */ (function () {
        function DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, metaReader, defaultImportRecorder, injectableRegistry, isCore, annotateForClosureCompiler, compileUndecoratedClassesWithAngularFeatures) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaRegistry = metaRegistry;
            this.scopeRegistry = scopeRegistry;
            this.metaReader = metaReader;
            this.defaultImportRecorder = defaultImportRecorder;
            this.injectableRegistry = injectableRegistry;
            this.isCore = isCore;
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
            return new DirectiveSymbol(node, analysis.meta.selector, analysis.inputs.propertyNames, analysis.outputs.propertyNames, analysis.meta.exportAs);
        };
        DirectiveDecoratorHandler.prototype.register = function (node, analysis) {
            // Register this directive's information with the `MetadataRegistry`. This ensures that
            // the information about the directive is available during the compile() phase.
            var ref = new imports_1.Reference(node);
            this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign(tslib_1.__assign({ ref: ref, name: node.name.text, selector: analysis.meta.selector, exportAs: analysis.meta.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.meta.queries.map(function (query) { return query.propertyName; }), isComponent: false, baseClass: analysis.baseClass }, analysis.typeCheckMeta), { isPoisoned: analysis.isPoisoned, isStructural: analysis.isStructural }));
            this.injectableRegistry.registerInjectable(node);
        };
        DirectiveDecoratorHandler.prototype.resolve = function (node, analysis) {
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
            var initializer = _a.expression, type = _a.type;
            var factoryRes = factory_1.compileNgFactoryDefField(tslib_1.__assign(tslib_1.__assign({}, analysis.meta), { injectFn: compiler_1.Identifiers.directiveInject, target: compiler_1.R3FactoryTarget.Directive }));
            if (analysis.metadataStmt !== null) {
                factoryRes.statements.push(analysis.metadataStmt);
            }
            return [
                factoryRes,
                {
                    name: 'ɵdir',
                    initializer: initializer,
                    statements: [],
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
                    throw diagnostics_2.createValueHasWrongTypeError(emitDistinctChangesOnlyExpr, emitDistinctChangesOnlyValue, "@" + name + " options.emitDistinctChangesOnlys must be a boolean");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBbWE7SUFDbmEsbURBQStFO0lBQy9FLCtCQUFpQztJQUVqQywyRUFBa0U7SUFFbEUsbUVBQStEO0lBQy9ELDZGQUE4RTtJQUM5RSxxRUFBdUk7SUFDdkksMEVBQXNFO0lBQ3RFLHVGQUFrRjtJQUNsRix5RUFBK0o7SUFFL0osdUVBQThJO0lBRTlJLDJGQUE4SjtJQUM5SixtRkFBbUQ7SUFDbkQscUZBQXdEO0lBQ3hELDZFQUF1VDtJQUV2VCxJQUFNLFlBQVksR0FBNEIsRUFBRSxDQUFDO0lBQ2pELElBQU0sZ0JBQWdCLEdBQUc7UUFDdkIsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxhQUFhO1FBQ2hHLGNBQWM7S0FDZixDQUFDO0lBQ0YsSUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDOUIsYUFBYSxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQjtRQUM5RixvQkFBb0IsRUFBRSx1QkFBdUI7S0FDOUMsQ0FBQyxDQUFDO0lBY0g7OztPQUdHO0lBQ0g7UUFBcUMsMkNBQWM7UUFDakQseUJBQ0ksSUFBc0IsRUFBa0IsUUFBcUIsRUFDN0MsTUFBZ0IsRUFBa0IsT0FBaUIsRUFDbkQsUUFBdUI7WUFIM0MsWUFJRSxrQkFBTSxJQUFJLENBQUMsU0FDWjtZQUoyQyxjQUFRLEdBQVIsUUFBUSxDQUFhO1lBQzdDLFlBQU0sR0FBTixNQUFNLENBQVU7WUFBa0IsYUFBTyxHQUFQLE9BQU8sQ0FBVTtZQUNuRCxj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QVksRUFDL0Isd0RBQXdELENBQUMsQ0FBQzt5QkFDL0Q7d0JBQ0QsSUFBSSxHQUFHLFlBQVksQ0FBQztxQkFDckI7aUJBQ0Y7Z0JBRUQsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBTSxNQUFNLENBQUMsSUFBSSxTQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQUcsQ0FBQztZQUN0RSxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ1AsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQTdFRCxrREE2RUM7SUFFRCxJQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUMxQixjQUFjO1FBQ2QsaUJBQWlCO1FBQ2pCLFdBQVc7UUFDWCxjQUFjO0tBQ2YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZURlY2xhcmVEaXJlY3RpdmVGcm9tTWV0YWRhdGEsIGNvbXBpbGVEaXJlY3RpdmVGcm9tTWV0YWRhdGEsIENvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBnZXRTYWZlUHJvcGVydHlBY2Nlc3NTdHJpbmcsIElkZW50aWZpZXJzLCBtYWtlQmluZGluZ1BhcnNlciwgUGFyc2VkSG9zdEJpbmRpbmdzLCBQYXJzZUVycm9yLCBwYXJzZUhvc3RCaW5kaW5ncywgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzRGlyZWN0aXZlRGVmLCBSM0RpcmVjdGl2ZU1ldGFkYXRhLCBSM0ZhY3RvcnlUYXJnZXQsIFIzUXVlcnlNZXRhZGF0YSwgUjNSZXNvbHZlZERlcGVuZGVuY3lUeXBlLCBTdGF0ZW1lbnQsIHZlcmlmeUhvc3RCaW5kaW5ncywgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge2VtaXREaXN0aW5jdENoYW5nZXNPbmx5RGVmYXVsdFZhbHVlfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvY29yZSc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyLCBSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtpc0FycmF5RXF1YWwsIFNlbWFudGljU3ltYm9sfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9zZW1hbnRpY19ncmFwaCc7XG5pbXBvcnQge0NsYXNzUHJvcGVydHlNYXBwaW5nLCBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhLCBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZVR5cGVDaGVja01ldGF9IGZyb20gJy4uLy4uL21ldGFkYXRhL3NyYy91dGlsJztcbmltcG9ydCB7RHluYW1pY1ZhbHVlLCBFbnVtVmFsdWUsIFBhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjb3JhdG9yLCBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlckZsYWdzLCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yLCBnZXREaXJlY3RpdmVEaWFnbm9zdGljcywgZ2V0UHJvdmlkZXJEaWFnbm9zdGljcywgZ2V0VW5kZWNvcmF0ZWRDbGFzc1dpdGhBbmd1bGFyRmVhdHVyZXNEaWFnbm9zdGljfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Y29tcGlsZU5nRmFjdG9yeURlZkZpZWxkfSBmcm9tICcuL2ZhY3RvcnknO1xuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7Y3JlYXRlU291cmNlU3BhbiwgZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJEZWNvcmF0b3IsIHJlYWRCYXNlQ2xhc3MsIHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LCB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgdW53cmFwRXhwcmVzc2lvbiwgdW53cmFwRm9yd2FyZFJlZiwgdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucywgd3JhcFR5cGVSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX09CSkVDVDoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbmNvbnN0IEZJRUxEX0RFQ09SQVRPUlMgPSBbXG4gICdJbnB1dCcsICdPdXRwdXQnLCAnVmlld0NoaWxkJywgJ1ZpZXdDaGlsZHJlbicsICdDb250ZW50Q2hpbGQnLCAnQ29udGVudENoaWxkcmVuJywgJ0hvc3RCaW5kaW5nJyxcbiAgJ0hvc3RMaXN0ZW5lcidcbl07XG5jb25zdCBMSUZFQ1lDTEVfSE9PS1MgPSBuZXcgU2V0KFtcbiAgJ25nT25DaGFuZ2VzJywgJ25nT25Jbml0JywgJ25nT25EZXN0cm95JywgJ25nRG9DaGVjaycsICduZ0FmdGVyVmlld0luaXQnLCAnbmdBZnRlclZpZXdDaGVja2VkJyxcbiAgJ25nQWZ0ZXJDb250ZW50SW5pdCcsICduZ0FmdGVyQ29udGVudENoZWNrZWQnXG5dKTtcblxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVIYW5kbGVyRGF0YSB7XG4gIGJhc2VDbGFzczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+fCdkeW5hbWljJ3xudWxsO1xuICB0eXBlQ2hlY2tNZXRhOiBEaXJlY3RpdmVUeXBlQ2hlY2tNZXRhO1xuICBtZXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xuICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsO1xuICBpbnB1dHM6IENsYXNzUHJvcGVydHlNYXBwaW5nO1xuICBvdXRwdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZztcbiAgaXNQb2lzb25lZDogYm9vbGVhbjtcbiAgaXNTdHJ1Y3R1cmFsOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBkaXJlY3RpdmUuIENvbXBvbmVudHMgYXJlIHJlcHJlc2VudGVkIGJ5IGBDb21wb25lbnRTeW1ib2xgLCB3aGljaCBpbmhlcml0c1xuICogZnJvbSB0aGlzIHN5bWJvbC5cbiAqL1xuZXhwb3J0IGNsYXNzIERpcmVjdGl2ZVN5bWJvbCBleHRlbmRzIFNlbWFudGljU3ltYm9sIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBwdWJsaWMgcmVhZG9ubHkgc2VsZWN0b3I6IHN0cmluZ3xudWxsLFxuICAgICAgcHVibGljIHJlYWRvbmx5IGlucHV0czogc3RyaW5nW10sIHB1YmxpYyByZWFkb25seSBvdXRwdXRzOiBzdHJpbmdbXSxcbiAgICAgIHB1YmxpYyByZWFkb25seSBleHBvcnRBczogc3RyaW5nW118bnVsbCkge1xuICAgIHN1cGVyKGRlY2wpO1xuICB9XG5cbiAgaXNQdWJsaWNBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICAvLyBOb3RlOiBzaW5jZSBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGhhdmUgZXhhY3RseSB0aGUgc2FtZSBpdGVtcyBjb250cmlidXRpbmcgdG8gdGhlaXJcbiAgICAvLyBwdWJsaWMgQVBJLCBpdCBpcyBva2F5IGZvciBhIGRpcmVjdGl2ZSB0byBjaGFuZ2UgaW50byBhIGNvbXBvbmVudCBhbmQgdmljZSB2ZXJzYSB3aXRob3V0XG4gICAgLy8gdGhlIEFQSSBiZWluZyBhZmZlY3RlZC5cbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIERpcmVjdGl2ZVN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIGNvbXBvbmVudHMgaGF2ZSBhIHB1YmxpYyBBUEkgb2Y6XG4gICAgLy8gIDEuIFRoZWlyIHNlbGVjdG9yLlxuICAgIC8vICAyLiBUaGUgYmluZGluZyBuYW1lcyBvZiB0aGVpciBpbnB1dHMgYW5kIG91dHB1dHM7IGEgY2hhbmdlIGluIG9yZGVyaW5nIGlzIGFsc28gY29uc2lkZXJlZFxuICAgIC8vICAgICB0byBiZSBhIGNoYW5nZSBpbiBwdWJsaWMgQVBJLlxuICAgIC8vICAzLiBUaGUgbGlzdCBvZiBleHBvcnRBcyBuYW1lcyBhbmQgaXRzIG9yZGVyaW5nLlxuICAgIHJldHVybiB0aGlzLnNlbGVjdG9yICE9PSBwcmV2aW91c1N5bWJvbC5zZWxlY3RvciB8fFxuICAgICAgICAhaXNBcnJheUVxdWFsKHRoaXMuaW5wdXRzLCBwcmV2aW91c1N5bWJvbC5pbnB1dHMpIHx8XG4gICAgICAgICFpc0FycmF5RXF1YWwodGhpcy5vdXRwdXRzLCBwcmV2aW91c1N5bWJvbC5vdXRwdXRzKSB8fFxuICAgICAgICAhaXNBcnJheUVxdWFsKHRoaXMuZXhwb3J0QXMsIHByZXZpb3VzU3ltYm9sLmV4cG9ydEFzKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3J8bnVsbCwgRGlyZWN0aXZlSGFuZGxlckRhdGEsIERpcmVjdGl2ZVN5bWJvbCwgdW5rbm93bj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBpbmplY3RhYmxlUmVnaXN0cnk6IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGNvbXBpbGVVbmRlY29yYXRlZENsYXNzZXNXaXRoQW5ndWxhckZlYXR1cmVzOiBib29sZWFuKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuICByZWFkb25seSBuYW1lID0gRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTpcbiAgICAgIERldGVjdFJlc3VsdDxEZWNvcmF0b3J8bnVsbD58dW5kZWZpbmVkIHtcbiAgICAvLyBJZiBhIGNsYXNzIGlzIHVuZGVjb3JhdGVkIGJ1dCB1c2VzIEFuZ3VsYXIgZmVhdHVyZXMsIHdlIGRldGVjdCBpdCBhcyBhblxuICAgIC8vIGFic3RyYWN0IGRpcmVjdGl2ZS4gVGhpcyBpcyBhbiB1bnN1cHBvcnRlZCBwYXR0ZXJuIGFzIG9mIHYxMCwgYnV0IHdlIHdhbnRcbiAgICAvLyB0byBzdGlsbCBkZXRlY3QgdGhlc2UgcGF0dGVybnMgc28gdGhhdCB3ZSBjYW4gcmVwb3J0IGRpYWdub3N0aWNzLCBvciBjb21waWxlXG4gICAgLy8gdGhlbSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgaW4gbmdjYy5cbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIGNvbnN0IGFuZ3VsYXJGaWVsZCA9IHRoaXMuZmluZENsYXNzRmllbGRXaXRoQW5ndWxhckZlYXR1cmVzKG5vZGUpO1xuICAgICAgcmV0dXJuIGFuZ3VsYXJGaWVsZCA/IHt0cmlnZ2VyOiBhbmd1bGFyRmllbGQubm9kZSwgZGVjb3JhdG9yOiBudWxsLCBtZXRhZGF0YTogbnVsbH0gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ0RpcmVjdGl2ZScsIHRoaXMuaXNDb3JlKTtcbiAgICAgIHJldHVybiBkZWNvcmF0b3IgPyB7dHJpZ2dlcjogZGVjb3JhdG9yLm5vZGUsIGRlY29yYXRvciwgbWV0YWRhdGE6IGRlY29yYXRvcn0gOiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcnxudWxsPiwgZmxhZ3MgPSBIYW5kbGVyRmxhZ3MuTk9ORSk6XG4gICAgICBBbmFseXNpc091dHB1dDxEaXJlY3RpdmVIYW5kbGVyRGF0YT4ge1xuICAgIC8vIFNraXAgcHJvY2Vzc2luZyBvZiB0aGUgY2xhc3MgZGVjbGFyYXRpb24gaWYgY29tcGlsYXRpb24gb2YgdW5kZWNvcmF0ZWQgY2xhc3Nlc1xuICAgIC8vIHdpdGggQW5ndWxhciBmZWF0dXJlcyBpcyBkaXNhYmxlZC4gUHJldmlvdXNseSBpbiBuZ3RzYywgc3VjaCBjbGFzc2VzIGhhdmUgYWx3YXlzXG4gICAgLy8gYmVlbiBwcm9jZXNzZWQsIGJ1dCB3ZSB3YW50IHRvIGVuZm9yY2UgYSBjb25zaXN0ZW50IGRlY29yYXRvciBtZW50YWwgbW9kZWwuXG4gICAgLy8gU2VlOiBodHRwczovL3Y5LmFuZ3VsYXIuaW8vZ3VpZGUvbWlncmF0aW9uLXVuZGVjb3JhdGVkLWNsYXNzZXMuXG4gICAgaWYgKHRoaXMuY29tcGlsZVVuZGVjb3JhdGVkQ2xhc3Nlc1dpdGhBbmd1bGFyRmVhdHVyZXMgPT09IGZhbHNlICYmIGRlY29yYXRvciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtkaWFnbm9zdGljczogW2dldFVuZGVjb3JhdGVkQ2xhc3NXaXRoQW5ndWxhckZlYXR1cmVzRGlhZ25vc3RpYyhub2RlKV19O1xuICAgIH1cblxuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9IGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICAgICAgbm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgZmxhZ3MsIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpO1xuICAgIGlmIChkaXJlY3RpdmVSZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgICBjb25zdCBhbmFseXNpcyA9IGRpcmVjdGl2ZVJlc3VsdC5tZXRhZGF0YTtcblxuICAgIGxldCBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiBTZXQ8UmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PnxudWxsID0gbnVsbDtcbiAgICBpZiAoZGlyZWN0aXZlUmVzdWx0ICE9PSB1bmRlZmluZWQgJiYgZGlyZWN0aXZlUmVzdWx0LmRlY29yYXRvci5oYXMoJ3Byb3ZpZGVycycpKSB7XG4gICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ID0gcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkoXG4gICAgICAgICAgZGlyZWN0aXZlUmVzdWx0LmRlY29yYXRvci5nZXQoJ3Byb3ZpZGVycycpISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgaW5wdXRzOiBkaXJlY3RpdmVSZXN1bHQuaW5wdXRzLFxuICAgICAgICBvdXRwdXRzOiBkaXJlY3RpdmVSZXN1bHQub3V0cHV0cyxcbiAgICAgICAgbWV0YTogYW5hbHlzaXMsXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgICB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSxcbiAgICAgICAgYmFzZUNsYXNzOiByZWFkQmFzZUNsYXNzKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciksXG4gICAgICAgIHR5cGVDaGVja01ldGE6IGV4dHJhY3REaXJlY3RpdmVUeXBlQ2hlY2tNZXRhKG5vZGUsIGRpcmVjdGl2ZVJlc3VsdC5pbnB1dHMsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgICAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSxcbiAgICAgICAgaXNQb2lzb25lZDogZmFsc2UsXG4gICAgICAgIGlzU3RydWN0dXJhbDogZGlyZWN0aXZlUmVzdWx0LmlzU3RydWN0dXJhbCxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgc3ltYm9sKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxEaXJlY3RpdmVIYW5kbGVyRGF0YT4pOiBEaXJlY3RpdmVTeW1ib2wge1xuICAgIHJldHVybiBuZXcgRGlyZWN0aXZlU3ltYm9sKFxuICAgICAgICBub2RlLCBhbmFseXNpcy5tZXRhLnNlbGVjdG9yLCBhbmFseXNpcy5pbnB1dHMucHJvcGVydHlOYW1lcywgYW5hbHlzaXMub3V0cHV0cy5wcm9wZXJ0eU5hbWVzLFxuICAgICAgICBhbmFseXNpcy5tZXRhLmV4cG9ydEFzKTtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxEaXJlY3RpdmVIYW5kbGVyRGF0YT4pOiB2b2lkIHtcbiAgICAvLyBSZWdpc3RlciB0aGlzIGRpcmVjdGl2ZSdzIGluZm9ybWF0aW9uIHdpdGggdGhlIGBNZXRhZGF0YVJlZ2lzdHJ5YC4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGRpcmVjdGl2ZSBpcyBhdmFpbGFibGUgZHVyaW5nIHRoZSBjb21waWxlKCkgcGhhc2UuXG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShub2RlKTtcbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKHtcbiAgICAgIHJlZixcbiAgICAgIG5hbWU6IG5vZGUubmFtZS50ZXh0LFxuICAgICAgc2VsZWN0b3I6IGFuYWx5c2lzLm1ldGEuc2VsZWN0b3IsXG4gICAgICBleHBvcnRBczogYW5hbHlzaXMubWV0YS5leHBvcnRBcyxcbiAgICAgIGlucHV0czogYW5hbHlzaXMuaW5wdXRzLFxuICAgICAgb3V0cHV0czogYW5hbHlzaXMub3V0cHV0cyxcbiAgICAgIHF1ZXJpZXM6IGFuYWx5c2lzLm1ldGEucXVlcmllcy5tYXAocXVlcnkgPT4gcXVlcnkucHJvcGVydHlOYW1lKSxcbiAgICAgIGlzQ29tcG9uZW50OiBmYWxzZSxcbiAgICAgIGJhc2VDbGFzczogYW5hbHlzaXMuYmFzZUNsYXNzLFxuICAgICAgLi4uYW5hbHlzaXMudHlwZUNoZWNrTWV0YSxcbiAgICAgIGlzUG9pc29uZWQ6IGFuYWx5c2lzLmlzUG9pc29uZWQsXG4gICAgICBpc1N0cnVjdHVyYWw6IGFuYWx5c2lzLmlzU3RydWN0dXJhbCxcbiAgICB9KTtcblxuICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5LnJlZ2lzdGVySW5qZWN0YWJsZShub2RlKTtcbiAgfVxuXG4gIHJlc29sdmUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IERpcmVjdGl2ZUhhbmRsZXJEYXRhKTogUmVzb2x2ZVJlc3VsdDx1bmtub3duPiB7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgaWYgKGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgIT09IG51bGwgJiZcbiAgICAgICAgYW5hbHlzaXMubWV0YS5wcm92aWRlcnMgaW5zdGFuY2VvZiBXcmFwcGVkTm9kZUV4cHIpIHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyRGlhZ25vc3RpY3MgPSBnZXRQcm92aWRlckRpYWdub3N0aWNzKFxuICAgICAgICAgIGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIGFuYWx5c2lzLm1ldGEucHJvdmlkZXJzIS5ub2RlLFxuICAgICAgICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5KTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4ucHJvdmlkZXJEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlyZWN0aXZlRGlhZ25vc3RpY3MgPSBnZXREaXJlY3RpdmVEaWFnbm9zdGljcyhcbiAgICAgICAgbm9kZSwgdGhpcy5tZXRhUmVhZGVyLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgJ0RpcmVjdGl2ZScpO1xuICAgIGlmIChkaXJlY3RpdmVEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5kaXJlY3RpdmVEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtkaWFnbm9zdGljczogZGlhZ25vc3RpY3MubGVuZ3RoID4gMCA/IGRpYWdub3N0aWNzIDogdW5kZWZpbmVkfTtcbiAgfVxuXG4gIGNvbXBpbGVGdWxsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PERpcmVjdGl2ZUhhbmRsZXJEYXRhPixcbiAgICAgIHJlc29sdXRpb246IFJlYWRvbmx5PHVua25vd24+LCBwb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVEaXJlY3RpdmVGcm9tTWV0YWRhdGEoYW5hbHlzaXMubWV0YSwgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZURpcmVjdGl2ZShhbmFseXNpcywgZGVmKTtcbiAgfVxuXG4gIGNvbXBpbGVQYXJ0aWFsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PERpcmVjdGl2ZUhhbmRsZXJEYXRhPixcbiAgICAgIHJlc29sdXRpb246IFJlYWRvbmx5PHVua25vd24+KTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlRGVjbGFyZURpcmVjdGl2ZUZyb21NZXRhZGF0YShhbmFseXNpcy5tZXRhKTtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlRGlyZWN0aXZlKGFuYWx5c2lzLCBkZWYpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21waWxlRGlyZWN0aXZlKFxuICAgICAgYW5hbHlzaXM6IFJlYWRvbmx5PERpcmVjdGl2ZUhhbmRsZXJEYXRhPixcbiAgICAgIHtleHByZXNzaW9uOiBpbml0aWFsaXplciwgdHlwZX06IFIzRGlyZWN0aXZlRGVmKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBmYWN0b3J5UmVzID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKHtcbiAgICAgIC4uLmFuYWx5c2lzLm1ldGEsXG4gICAgICBpbmplY3RGbjogSWRlbnRpZmllcnMuZGlyZWN0aXZlSW5qZWN0LFxuICAgICAgdGFyZ2V0OiBSM0ZhY3RvcnlUYXJnZXQuRGlyZWN0aXZlLFxuICAgIH0pO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIGZhY3RvcnlSZXMuc3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICBmYWN0b3J5UmVzLCB7XG4gICAgICAgIG5hbWU6ICfJtWRpcicsXG4gICAgICAgIGluaXRpYWxpemVyLFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgICAgdHlwZSxcbiAgICAgIH1cbiAgICBdO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiBhIGdpdmVuIGNsYXNzIHVzZXMgQW5ndWxhciBmZWF0dXJlcyBhbmQgcmV0dXJucyB0aGUgVHlwZVNjcmlwdCBub2RlXG4gICAqIHRoYXQgaW5kaWNhdGVkIHRoZSB1c2FnZS4gQ2xhc3NlcyBhcmUgY29uc2lkZXJlZCB1c2luZyBBbmd1bGFyIGZlYXR1cmVzIGlmIHRoZXlcbiAgICogY29udGFpbiBjbGFzcyBtZW1iZXJzIHRoYXQgYXJlIGVpdGhlciBkZWNvcmF0ZWQgd2l0aCBhIGtub3duIEFuZ3VsYXIgZGVjb3JhdG9yLFxuICAgKiBvciBpZiB0aGV5IGNvcnJlc3BvbmQgdG8gYSBrbm93biBBbmd1bGFyIGxpZmVjeWNsZSBob29rLlxuICAgKi9cbiAgcHJpdmF0ZSBmaW5kQ2xhc3NGaWVsZFdpdGhBbmd1bGFyRmVhdHVyZXMobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IENsYXNzTWVtYmVyfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKG5vZGUpLmZpbmQobWVtYmVyID0+IHtcbiAgICAgIGlmICghbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuTWV0aG9kICYmXG4gICAgICAgICAgTElGRUNZQ0xFX0hPT0tTLmhhcyhtZW1iZXIubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBpZiAobWVtYmVyLmRlY29yYXRvcnMpIHtcbiAgICAgICAgcmV0dXJuIG1lbWJlci5kZWNvcmF0b3JzLnNvbWUoXG4gICAgICAgICAgICBkZWNvcmF0b3IgPT4gRklFTERfREVDT1JBVE9SUy5zb21lKFxuICAgICAgICAgICAgICAgIGRlY29yYXRvck5hbWUgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgZGVjb3JhdG9yTmFtZSwgdGhpcy5pc0NvcmUpKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gZXh0cmFjdCBtZXRhZGF0YSBmcm9tIGEgYERpcmVjdGl2ZWAgb3IgYENvbXBvbmVudGAuIGBEaXJlY3RpdmVgcyB3aXRob3V0IGFcbiAqIHNlbGVjdG9yIGFyZSBhbGxvd2VkIHRvIGJlIHVzZWQgZm9yIGFic3RyYWN0IGJhc2UgY2xhc3Nlcy4gVGhlc2UgYWJzdHJhY3QgZGlyZWN0aXZlcyBzaG91bGQgbm90XG4gKiBhcHBlYXIgaW4gdGhlIGRlY2xhcmF0aW9ucyBvZiBhbiBgTmdNb2R1bGVgIGFuZCBhZGRpdGlvbmFsIHZlcmlmaWNhdGlvbiBpcyBkb25lIHdoZW4gcHJvY2Vzc2luZ1xuICogdGhlIG1vZHVsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3J8bnVsbD4sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlOiBib29sZWFuLFxuICAgIGZsYWdzOiBIYW5kbGVyRmxhZ3MsIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyOiBib29sZWFuLFxuICAgIGRlZmF1bHRTZWxlY3Rvcjogc3RyaW5nfG51bGwgPSBudWxsKToge1xuICBkZWNvcmF0b3I6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICBtZXRhZGF0YTogUjNEaXJlY3RpdmVNZXRhZGF0YSxcbiAgaW5wdXRzOiBDbGFzc1Byb3BlcnR5TWFwcGluZyxcbiAgb3V0cHV0czogQ2xhc3NQcm9wZXJ0eU1hcHBpbmcsXG4gIGlzU3RydWN0dXJhbDogYm9vbGVhbjtcbn18dW5kZWZpbmVkIHtcbiAgbGV0IGRpcmVjdGl2ZTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj47XG4gIGlmIChkZWNvcmF0b3IgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgZGlyZWN0aXZlID0gbmV3IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+KCk7XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yYCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLFxuICAgICAgICAgIGBAJHtkZWNvcmF0b3IubmFtZX0gYXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbGApO1xuICAgIH1cbiAgICBkaXJlY3RpdmUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcbiAgfVxuXG4gIGlmIChkaXJlY3RpdmUuaGFzKCdqaXQnKSkge1xuICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBtZW1iZXJzID0gcmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KTtcblxuICAvLyBQcmVjb21wdXRlIGEgbGlzdCBvZiB0cy5DbGFzc0VsZW1lbnRzIHRoYXQgaGF2ZSBkZWNvcmF0b3JzLiBUaGlzIGluY2x1ZGVzIHRoaW5ncyBsaWtlIEBJbnB1dCxcbiAgLy8gQE91dHB1dCwgQEhvc3RCaW5kaW5nLCBldGMuXG4gIGNvbnN0IGRlY29yYXRlZEVsZW1lbnRzID1cbiAgICAgIG1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiAhbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5kZWNvcmF0b3JzICE9PSBudWxsKTtcblxuICBjb25zdCBjb3JlTW9kdWxlID0gaXNDb3JlID8gdW5kZWZpbmVkIDogJ0Bhbmd1bGFyL2NvcmUnO1xuXG4gIC8vIENvbnN0cnVjdCB0aGUgbWFwIG9mIGlucHV0cyBib3RoIGZyb20gdGhlIEBEaXJlY3RpdmUvQENvbXBvbmVudFxuICAvLyBkZWNvcmF0b3IsIGFuZCB0aGUgZGVjb3JhdGVkXG4gIC8vIGZpZWxkcy5cbiAgY29uc3QgaW5wdXRzRnJvbU1ldGEgPSBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoZGlyZWN0aXZlLCAnaW5wdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3QgaW5wdXRzRnJvbUZpZWxkcyA9IHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0lucHV0JywgY29yZU1vZHVsZSksIGV2YWx1YXRvcixcbiAgICAgIHJlc29sdmVJbnB1dCk7XG5cbiAgLy8gQW5kIG91dHB1dHMuXG4gIGNvbnN0IG91dHB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdvdXRwdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3Qgb3V0cHV0c0Zyb21GaWVsZHMgPVxuICAgICAgcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ091dHB1dCcsIGNvcmVNb2R1bGUpLCBldmFsdWF0b3IsXG4gICAgICAgICAgcmVzb2x2ZU91dHB1dCkgYXMge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfTtcbiAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHF1ZXJpZXMuXG4gIGNvbnN0IGNvbnRlbnRDaGlsZEZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdDb250ZW50Q2hpbGQnLCBjb3JlTW9kdWxlKSwgcmVmbGVjdG9yLFxuICAgICAgZXZhbHVhdG9yKTtcbiAgY29uc3QgY29udGVudENoaWxkcmVuRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0NvbnRlbnRDaGlsZHJlbicsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuXG4gIGNvbnN0IHF1ZXJpZXMgPSBbLi4uY29udGVudENoaWxkRnJvbUZpZWxkcywgLi4uY29udGVudENoaWxkcmVuRnJvbUZpZWxkc107XG5cbiAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHZpZXcgcXVlcmllcy5cbiAgY29uc3Qgdmlld0NoaWxkRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ1ZpZXdDaGlsZCcsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuICBjb25zdCB2aWV3Q2hpbGRyZW5Gcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnVmlld0NoaWxkcmVuJywgY29yZU1vZHVsZSksIHJlZmxlY3RvcixcbiAgICAgIGV2YWx1YXRvcik7XG4gIGNvbnN0IHZpZXdRdWVyaWVzID0gWy4uLnZpZXdDaGlsZEZyb21GaWVsZHMsIC4uLnZpZXdDaGlsZHJlbkZyb21GaWVsZHNdO1xuXG4gIGlmIChkaXJlY3RpdmUuaGFzKCdxdWVyaWVzJykpIHtcbiAgICBjb25zdCBxdWVyaWVzRnJvbURlY29yYXRvciA9XG4gICAgICAgIGV4dHJhY3RRdWVyaWVzRnJvbURlY29yYXRvcihkaXJlY3RpdmUuZ2V0KCdxdWVyaWVzJykhLCByZWZsZWN0b3IsIGV2YWx1YXRvciwgaXNDb3JlKTtcbiAgICBxdWVyaWVzLnB1c2goLi4ucXVlcmllc0Zyb21EZWNvcmF0b3IuY29udGVudCk7XG4gICAgdmlld1F1ZXJpZXMucHVzaCguLi5xdWVyaWVzRnJvbURlY29yYXRvci52aWV3KTtcbiAgfVxuXG4gIC8vIFBhcnNlIHRoZSBzZWxlY3Rvci5cbiAgbGV0IHNlbGVjdG9yID0gZGVmYXVsdFNlbGVjdG9yO1xuICBpZiAoZGlyZWN0aXZlLmhhcygnc2VsZWN0b3InKSkge1xuICAgIGNvbnN0IGV4cHIgPSBkaXJlY3RpdmUuZ2V0KCdzZWxlY3RvcicpITtcbiAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihleHByLCByZXNvbHZlZCwgYHNlbGVjdG9yIG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICB9XG4gICAgLy8gdXNlIGRlZmF1bHQgc2VsZWN0b3IgaW4gY2FzZSBzZWxlY3RvciBpcyBhbiBlbXB0eSBzdHJpbmdcbiAgICBzZWxlY3RvciA9IHJlc29sdmVkID09PSAnJyA/IGRlZmF1bHRTZWxlY3RvciA6IHJlc29sdmVkO1xuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuRElSRUNUSVZFX01JU1NJTkdfU0VMRUNUT1IsIGV4cHIsXG4gICAgICAgICAgYERpcmVjdGl2ZSAke2NsYXp6Lm5hbWUudGV4dH0gaGFzIG5vIHNlbGVjdG9yLCBwbGVhc2UgYWRkIGl0IWApO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGhvc3QgPSBleHRyYWN0SG9zdEJpbmRpbmdzKGRlY29yYXRlZEVsZW1lbnRzLCBldmFsdWF0b3IsIGNvcmVNb2R1bGUsIGRpcmVjdGl2ZSk7XG5cbiAgY29uc3QgcHJvdmlkZXJzOiBFeHByZXNzaW9ufG51bGwgPSBkaXJlY3RpdmUuaGFzKCdwcm92aWRlcnMnKSA/XG4gICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyID9cbiAgICAgICAgICAgICAgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucyhkaXJlY3RpdmUuZ2V0KCdwcm92aWRlcnMnKSEpIDpcbiAgICAgICAgICAgICAgZGlyZWN0aXZlLmdldCgncHJvdmlkZXJzJykhKSA6XG4gICAgICBudWxsO1xuXG4gIC8vIERldGVybWluZSBpZiBgbmdPbkNoYW5nZXNgIGlzIGEgbGlmZWN5Y2xlIGhvb2sgZGVmaW5lZCBvbiB0aGUgY29tcG9uZW50LlxuICBjb25zdCB1c2VzT25DaGFuZ2VzID0gbWVtYmVycy5zb21lKFxuICAgICAgbWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5NZXRob2QgJiZcbiAgICAgICAgICBtZW1iZXIubmFtZSA9PT0gJ25nT25DaGFuZ2VzJyk7XG5cbiAgLy8gUGFyc2UgZXhwb3J0QXMuXG4gIGxldCBleHBvcnRBczogc3RyaW5nW118bnVsbCA9IG51bGw7XG4gIGlmIChkaXJlY3RpdmUuaGFzKCdleHBvcnRBcycpKSB7XG4gICAgY29uc3QgZXhwciA9IGRpcmVjdGl2ZS5nZXQoJ2V4cG9ydEFzJykhO1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHJlc29sdmVkLCBgZXhwb3J0QXMgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBleHBvcnRBcyA9IHJlc29sdmVkLnNwbGl0KCcsJykubWFwKHBhcnQgPT4gcGFydC50cmltKCkpO1xuICB9XG5cbiAgY29uc3QgcmF3Q3RvckRlcHMgPSBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZSk7XG4gIGxldCBjdG9yRGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXwnaW52YWxpZCd8bnVsbDtcblxuICAvLyBOb24tYWJzdHJhY3QgZGlyZWN0aXZlcyAodGhvc2Ugd2l0aCBhIHNlbGVjdG9yKSByZXF1aXJlIHZhbGlkIGNvbnN0cnVjdG9yIGRlcGVuZGVuY2llcywgd2hlcmVhc1xuICAvLyBhYnN0cmFjdCBkaXJlY3RpdmVzIGFyZSBhbGxvd2VkIHRvIGhhdmUgaW52YWxpZCBkZXBlbmRlbmNpZXMsIGdpdmVuIHRoYXQgYSBzdWJjbGFzcyBtYXkgY2FsbFxuICAvLyB0aGUgY29uc3RydWN0b3IgZXhwbGljaXRseS5cbiAgaWYgKHNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgY3RvckRlcHMgPSB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByYXdDdG9yRGVwcyk7XG4gIH0gZWxzZSB7XG4gICAgY3RvckRlcHMgPSB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhyYXdDdG9yRGVwcyk7XG4gIH1cblxuICBjb25zdCBpc1N0cnVjdHVyYWwgPSBjdG9yRGVwcyAhPT0gbnVsbCAmJiBjdG9yRGVwcyAhPT0gJ2ludmFsaWQnICYmIGN0b3JEZXBzLnNvbWUoZGVwID0+IHtcbiAgICBpZiAoZGVwLnJlc29sdmVkICE9PSBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUuVG9rZW4gfHwgIShkZXAudG9rZW4gaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChkZXAudG9rZW4udmFsdWUubW9kdWxlTmFtZSAhPT0gJ0Bhbmd1bGFyL2NvcmUnIHx8IGRlcC50b2tlbi52YWx1ZS5uYW1lICE9PSAnVGVtcGxhdGVSZWYnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuXG4gIC8vIERldGVjdCBpZiB0aGUgY29tcG9uZW50IGluaGVyaXRzIGZyb20gYW5vdGhlciBjbGFzc1xuICBjb25zdCB1c2VzSW5oZXJpdGFuY2UgPSByZWZsZWN0b3IuaGFzQmFzZUNsYXNzKGNsYXp6KTtcbiAgY29uc3QgdHlwZSA9IHdyYXBUeXBlUmVmZXJlbmNlKHJlZmxlY3RvciwgY2xhenopO1xuICBjb25zdCBpbnRlcm5hbFR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHJlZmxlY3Rvci5nZXRJbnRlcm5hbE5hbWVPZkNsYXNzKGNsYXp6KSk7XG5cbiAgY29uc3QgaW5wdXRzID0gQ2xhc3NQcm9wZXJ0eU1hcHBpbmcuZnJvbU1hcHBlZE9iamVjdCh7Li4uaW5wdXRzRnJvbU1ldGEsIC4uLmlucHV0c0Zyb21GaWVsZHN9KTtcbiAgY29uc3Qgb3V0cHV0cyA9IENsYXNzUHJvcGVydHlNYXBwaW5nLmZyb21NYXBwZWRPYmplY3Qoey4uLm91dHB1dHNGcm9tTWV0YSwgLi4ub3V0cHV0c0Zyb21GaWVsZHN9KTtcblxuICBjb25zdCBtZXRhZGF0YTogUjNEaXJlY3RpdmVNZXRhZGF0YSA9IHtcbiAgICBuYW1lOiBjbGF6ei5uYW1lLnRleHQsXG4gICAgZGVwczogY3RvckRlcHMsXG4gICAgaG9zdCxcbiAgICBsaWZlY3ljbGU6IHtcbiAgICAgIHVzZXNPbkNoYW5nZXMsXG4gICAgfSxcbiAgICBpbnB1dHM6IGlucHV0cy50b0pvaW50TWFwcGVkT2JqZWN0KCksXG4gICAgb3V0cHV0czogb3V0cHV0cy50b0RpcmVjdE1hcHBlZE9iamVjdCgpLFxuICAgIHF1ZXJpZXMsXG4gICAgdmlld1F1ZXJpZXMsXG4gICAgc2VsZWN0b3IsXG4gICAgZnVsbEluaGVyaXRhbmNlOiAhIShmbGFncyAmIEhhbmRsZXJGbGFncy5GVUxMX0lOSEVSSVRBTkNFKSxcbiAgICB0eXBlLFxuICAgIGludGVybmFsVHlwZSxcbiAgICB0eXBlQXJndW1lbnRDb3VudDogcmVmbGVjdG9yLmdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xhenopIHx8IDAsXG4gICAgdHlwZVNvdXJjZVNwYW46IGNyZWF0ZVNvdXJjZVNwYW4oY2xhenoubmFtZSksXG4gICAgdXNlc0luaGVyaXRhbmNlLFxuICAgIGV4cG9ydEFzLFxuICAgIHByb3ZpZGVyc1xuICB9O1xuICByZXR1cm4ge1xuICAgIGRlY29yYXRvcjogZGlyZWN0aXZlLFxuICAgIG1ldGFkYXRhLFxuICAgIGlucHV0cyxcbiAgICBvdXRwdXRzLFxuICAgIGlzU3RydWN0dXJhbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RRdWVyeU1ldGFkYXRhKFxuICAgIGV4cHJOb2RlOiB0cy5Ob2RlLCBuYW1lOiBzdHJpbmcsIGFyZ3M6IFJlYWRvbmx5QXJyYXk8dHMuRXhwcmVzc2lvbj4sIHByb3BlcnR5TmFtZTogc3RyaW5nLFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFIzUXVlcnlNZXRhZGF0YSB7XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZXhwck5vZGUsIGBAJHtuYW1lfSBtdXN0IGhhdmUgYXJndW1lbnRzYCk7XG4gIH1cbiAgY29uc3QgZmlyc3QgPSBuYW1lID09PSAnVmlld0NoaWxkJyB8fCBuYW1lID09PSAnQ29udGVudENoaWxkJztcbiAgY29uc3Qgbm9kZSA9IHVud3JhcEZvcndhcmRSZWYoYXJnc1swXSwgcmVmbGVjdG9yKTtcbiAgY29uc3QgYXJnID0gZXZhbHVhdG9yLmV2YWx1YXRlKG5vZGUpO1xuXG4gIC8qKiBXaGV0aGVyIG9yIG5vdCB0aGlzIHF1ZXJ5IHNob3VsZCBjb2xsZWN0IG9ubHkgc3RhdGljIHJlc3VsdHMgKHNlZSB2aWV3L2FwaS50cykgICovXG4gIGxldCBpc1N0YXRpYzogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8vIEV4dHJhY3QgdGhlIHByZWRpY2F0ZVxuICBsZXQgcHJlZGljYXRlOiBFeHByZXNzaW9ufHN0cmluZ1tdfG51bGwgPSBudWxsO1xuICBpZiAoYXJnIGluc3RhbmNlb2YgUmVmZXJlbmNlIHx8IGFyZyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgIC8vIFJlZmVyZW5jZXMgYW5kIHByZWRpY2F0ZXMgdGhhdCBjb3VsZCBub3QgYmUgZXZhbHVhdGVkIHN0YXRpY2FsbHkgYXJlIGVtaXR0ZWQgYXMgaXMuXG4gICAgcHJlZGljYXRlID0gbmV3IFdyYXBwZWROb2RlRXhwcihub2RlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgYXJnID09PSAnc3RyaW5nJykge1xuICAgIHByZWRpY2F0ZSA9IFthcmddO1xuICB9IGVsc2UgaWYgKGlzU3RyaW5nQXJyYXlPckRpZShhcmcsIGBAJHtuYW1lfSBwcmVkaWNhdGVgLCBub2RlKSkge1xuICAgIHByZWRpY2F0ZSA9IGFyZztcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKG5vZGUsIGFyZywgYEAke25hbWV9IHByZWRpY2F0ZSBjYW5ub3QgYmUgaW50ZXJwcmV0ZWRgKTtcbiAgfVxuXG4gIC8vIEV4dHJhY3QgdGhlIHJlYWQgYW5kIGRlc2NlbmRhbnRzIG9wdGlvbnMuXG4gIGxldCByZWFkOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAvLyBUaGUgZGVmYXVsdCB2YWx1ZSBmb3IgZGVzY2VuZGFudHMgaXMgdHJ1ZSBmb3IgZXZlcnkgZGVjb3JhdG9yIGV4Y2VwdCBAQ29udGVudENoaWxkcmVuLlxuICBsZXQgZGVzY2VuZGFudHM6IGJvb2xlYW4gPSBuYW1lICE9PSAnQ29udGVudENoaWxkcmVuJztcbiAgbGV0IGVtaXREaXN0aW5jdENoYW5nZXNPbmx5OiBib29sZWFuID0gZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlEZWZhdWx0VmFsdWU7XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMikge1xuICAgIGNvbnN0IG9wdGlvbnNFeHByID0gdW53cmFwRXhwcmVzc2lvbihhcmdzWzFdKTtcbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ob3B0aW9uc0V4cHIpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG9wdGlvbnNFeHByLFxuICAgICAgICAgIGBAJHtuYW1lfSBvcHRpb25zIG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWxgKTtcbiAgICB9XG4gICAgY29uc3Qgb3B0aW9ucyA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG9wdGlvbnNFeHByKTtcbiAgICBpZiAob3B0aW9ucy5oYXMoJ3JlYWQnKSkge1xuICAgICAgcmVhZCA9IG5ldyBXcmFwcGVkTm9kZUV4cHIob3B0aW9ucy5nZXQoJ3JlYWQnKSEpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmhhcygnZGVzY2VuZGFudHMnKSkge1xuICAgICAgY29uc3QgZGVzY2VuZGFudHNFeHByID0gb3B0aW9ucy5nZXQoJ2Rlc2NlbmRhbnRzJykhO1xuICAgICAgY29uc3QgZGVzY2VuZGFudHNWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZXNjZW5kYW50c0V4cHIpO1xuICAgICAgaWYgKHR5cGVvZiBkZXNjZW5kYW50c1ZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgIGRlc2NlbmRhbnRzRXhwciwgZGVzY2VuZGFudHNWYWx1ZSwgYEAke25hbWV9IG9wdGlvbnMuZGVzY2VuZGFudHMgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIGRlc2NlbmRhbnRzID0gZGVzY2VuZGFudHNWYWx1ZTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5oYXMoJ2VtaXREaXN0aW5jdENoYW5nZXNPbmx5JykpIHtcbiAgICAgIGNvbnN0IGVtaXREaXN0aW5jdENoYW5nZXNPbmx5RXhwciA9IG9wdGlvbnMuZ2V0KCdlbWl0RGlzdGluY3RDaGFuZ2VzT25seScpITtcbiAgICAgIGNvbnN0IGVtaXREaXN0aW5jdENoYW5nZXNPbmx5VmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGUoZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlFeHByKTtcbiAgICAgIGlmICh0eXBlb2YgZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlWYWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBlbWl0RGlzdGluY3RDaGFuZ2VzT25seUV4cHIsIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5VmFsdWUsXG4gICAgICAgICAgICBgQCR7bmFtZX0gb3B0aW9ucy5lbWl0RGlzdGluY3RDaGFuZ2VzT25seXMgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIGVtaXREaXN0aW5jdENoYW5nZXNPbmx5ID0gZW1pdERpc3RpbmN0Q2hhbmdlc09ubHlWYWx1ZTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5oYXMoJ3N0YXRpYycpKSB7XG4gICAgICBjb25zdCBzdGF0aWNWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShvcHRpb25zLmdldCgnc3RhdGljJykhKTtcbiAgICAgIGlmICh0eXBlb2Ygc3RhdGljVmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgbm9kZSwgc3RhdGljVmFsdWUsIGBAJHtuYW1lfSBvcHRpb25zLnN0YXRpYyBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgfVxuICAgICAgaXNTdGF0aWMgPSBzdGF0aWNWYWx1ZTtcbiAgICB9XG5cbiAgfSBlbHNlIGlmIChhcmdzLmxlbmd0aCA+IDIpIHtcbiAgICAvLyBUb28gbWFueSBhcmd1bWVudHMuXG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBub2RlLCBgQCR7bmFtZX0gaGFzIHRvbyBtYW55IGFyZ3VtZW50c2ApO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwcm9wZXJ0eU5hbWUsXG4gICAgcHJlZGljYXRlLFxuICAgIGZpcnN0LFxuICAgIGRlc2NlbmRhbnRzLFxuICAgIHJlYWQsXG4gICAgc3RhdGljOiBpc1N0YXRpYyxcbiAgICBlbWl0RGlzdGluY3RDaGFuZ2VzT25seSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RRdWVyaWVzRnJvbURlY29yYXRvcihcbiAgICBxdWVyeURhdGE6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBpc0NvcmU6IGJvb2xlYW4pOiB7XG4gIGNvbnRlbnQ6IFIzUXVlcnlNZXRhZGF0YVtdLFxuICB2aWV3OiBSM1F1ZXJ5TWV0YWRhdGFbXSxcbn0ge1xuICBjb25zdCBjb250ZW50OiBSM1F1ZXJ5TWV0YWRhdGFbXSA9IFtdLCB2aWV3OiBSM1F1ZXJ5TWV0YWRhdGFbXSA9IFtdO1xuICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocXVlcnlEYXRhKSkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBxdWVyeURhdGEsXG4gICAgICAgICdEZWNvcmF0b3IgcXVlcmllcyBtZXRhZGF0YSBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsJyk7XG4gIH1cbiAgcmVmbGVjdE9iamVjdExpdGVyYWwocXVlcnlEYXRhKS5mb3JFYWNoKChxdWVyeUV4cHIsIHByb3BlcnR5TmFtZSkgPT4ge1xuICAgIHF1ZXJ5RXhwciA9IHVud3JhcEV4cHJlc3Npb24ocXVlcnlFeHByKTtcbiAgICBpZiAoIXRzLmlzTmV3RXhwcmVzc2lvbihxdWVyeUV4cHIpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBxdWVyeURhdGEsXG4gICAgICAgICAgJ0RlY29yYXRvciBxdWVyeSBtZXRhZGF0YSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIGEgcXVlcnkgdHlwZScpO1xuICAgIH1cbiAgICBjb25zdCBxdWVyeVR5cGUgPSB0cy5pc1Byb3BlcnR5QWNjZXNzRXhwcmVzc2lvbihxdWVyeUV4cHIuZXhwcmVzc2lvbikgP1xuICAgICAgICBxdWVyeUV4cHIuZXhwcmVzc2lvbi5uYW1lIDpcbiAgICAgICAgcXVlcnlFeHByLmV4cHJlc3Npb247XG4gICAgaWYgKCF0cy5pc0lkZW50aWZpZXIocXVlcnlUeXBlKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcXVlcnlEYXRhLFxuICAgICAgICAgICdEZWNvcmF0b3IgcXVlcnkgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBhIHF1ZXJ5IHR5cGUnKTtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIocXVlcnlUeXBlKTtcbiAgICBpZiAodHlwZSA9PT0gbnVsbCB8fCAoIWlzQ29yZSAmJiB0eXBlLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykgfHxcbiAgICAgICAgIVFVRVJZX1RZUEVTLmhhcyh0eXBlLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBxdWVyeURhdGEsXG4gICAgICAgICAgJ0RlY29yYXRvciBxdWVyeSBtZXRhZGF0YSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIGEgcXVlcnkgdHlwZScpO1xuICAgIH1cblxuICAgIGNvbnN0IHF1ZXJ5ID0gZXh0cmFjdFF1ZXJ5TWV0YWRhdGEoXG4gICAgICAgIHF1ZXJ5RXhwciwgdHlwZS5uYW1lLCBxdWVyeUV4cHIuYXJndW1lbnRzIHx8IFtdLCBwcm9wZXJ0eU5hbWUsIHJlZmxlY3RvciwgZXZhbHVhdG9yKTtcbiAgICBpZiAodHlwZS5uYW1lLnN0YXJ0c1dpdGgoJ0NvbnRlbnQnKSkge1xuICAgICAgY29udGVudC5wdXNoKHF1ZXJ5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmlldy5wdXNoKHF1ZXJ5KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4ge2NvbnRlbnQsIHZpZXd9O1xufVxuXG5mdW5jdGlvbiBpc1N0cmluZ0FycmF5T3JEaWUodmFsdWU6IGFueSwgbmFtZTogc3RyaW5nLCBub2RlOiB0cy5FeHByZXNzaW9uKTogdmFsdWUgaXMgc3RyaW5nW10ge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0eXBlb2YgdmFsdWVbaV0gIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgIG5vZGUsIHZhbHVlW2ldLCBgRmFpbGVkIHRvIHJlc29sdmUgJHtuYW1lfSBhdCBwb3NpdGlvbiAke2l9IHRvIGEgc3RyaW5nYCk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VGaWVsZEFycmF5VmFsdWUoXG4gICAgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogbnVsbHxcbiAgICBzdHJpbmdbXSB7XG4gIGlmICghZGlyZWN0aXZlLmhhcyhmaWVsZCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJlc29sdmUgdGhlIGZpZWxkIG9mIGludGVyZXN0IGZyb20gdGhlIGRpcmVjdGl2ZSBtZXRhZGF0YSB0byBhIHN0cmluZ1tdLlxuICBjb25zdCBleHByZXNzaW9uID0gZGlyZWN0aXZlLmdldChmaWVsZCkhO1xuICBjb25zdCB2YWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByZXNzaW9uKTtcbiAgaWYgKCFpc1N0cmluZ0FycmF5T3JEaWUodmFsdWUsIGZpZWxkLCBleHByZXNzaW9uKSkge1xuICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgIGV4cHJlc3Npb24sIHZhbHVlLCBgRmFpbGVkIHRvIHJlc29sdmUgQERpcmVjdGl2ZS4ke2ZpZWxkfSB0byBhIHN0cmluZyBhcnJheWApO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEludGVycHJldCBwcm9wZXJ0eSBtYXBwaW5nIGZpZWxkcyBvbiB0aGUgZGVjb3JhdG9yIChlLmcuIGlucHV0cyBvciBvdXRwdXRzKSBhbmQgcmV0dXJuIHRoZVxuICogY29ycmVjdGx5IHNoYXBlZCBtZXRhZGF0YSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhcbiAgICBkaXJlY3RpdmU6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBmaWVsZDogc3RyaW5nLFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCBtZXRhVmFsdWVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoZGlyZWN0aXZlLCBmaWVsZCwgZXZhbHVhdG9yKTtcbiAgaWYgKCFtZXRhVmFsdWVzKSB7XG4gICAgcmV0dXJuIEVNUFRZX09CSkVDVDtcbiAgfVxuXG4gIHJldHVybiBtZXRhVmFsdWVzLnJlZHVjZSgocmVzdWx0cywgdmFsdWUpID0+IHtcbiAgICAvLyBFaXRoZXIgdGhlIHZhbHVlIGlzICdmaWVsZCcgb3IgJ2ZpZWxkOiBwcm9wZXJ0eScuIEluIHRoZSBmaXJzdCBjYXNlLCBgcHJvcGVydHlgIHdpbGxcbiAgICAvLyBiZSB1bmRlZmluZWQsIGluIHdoaWNoIGNhc2UgdGhlIGZpZWxkIG5hbWUgc2hvdWxkIGFsc28gYmUgdXNlZCBhcyB0aGUgcHJvcGVydHkgbmFtZS5cbiAgICBjb25zdCBbZmllbGQsIHByb3BlcnR5XSA9IHZhbHVlLnNwbGl0KCc6JywgMikubWFwKHN0ciA9PiBzdHIudHJpbSgpKTtcbiAgICByZXN1bHRzW2ZpZWxkXSA9IHByb3BlcnR5IHx8IGZpZWxkO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9LCB7fSBhcyB7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9KTtcbn1cblxuLyoqXG4gKiBQYXJzZSBwcm9wZXJ0eSBkZWNvcmF0b3JzIChlLmcuIGBJbnB1dGAgb3IgYE91dHB1dGApIGFuZCByZXR1cm4gdGhlIGNvcnJlY3RseSBzaGFwZWQgbWV0YWRhdGFcbiAqIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgZmllbGRzOiB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBtYXBWYWx1ZVJlc29sdmVyOiAocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZykgPT5cbiAgICAgICAgc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXSk6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddfSB7XG4gIHJldHVybiBmaWVsZHMucmVkdWNlKChyZXN1bHRzLCBmaWVsZCkgPT4ge1xuICAgIGNvbnN0IGZpZWxkTmFtZSA9IGZpZWxkLm1lbWJlci5uYW1lO1xuICAgIGZpZWxkLmRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgLy8gVGhlIGRlY29yYXRvciBlaXRoZXIgZG9lc24ndCBoYXZlIGFuIGFyZ3VtZW50IChASW5wdXQoKSkgaW4gd2hpY2ggY2FzZSB0aGUgcHJvcGVydHlcbiAgICAgIC8vIG5hbWUgaXMgdXNlZCwgb3IgaXQgaGFzIG9uZSBhcmd1bWVudCAoQE91dHB1dCgnbmFtZWQnKSkuXG4gICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmVzdWx0c1tmaWVsZE5hbWVdID0gZmllbGROYW1lO1xuICAgICAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgY29uc3QgcHJvcGVydHkgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSwgcHJvcGVydHksXG4gICAgICAgICAgICAgIGBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgcmVzb2x2ZSB0byBhIHN0cmluZ2ApO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdHNbZmllbGROYW1lXSA9IG1hcFZhbHVlUmVzb2x2ZXIocHJvcGVydHksIGZpZWxkTmFtZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUb28gbWFueSBhcmd1bWVudHMuXG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgICAgIGBAJHtkZWNvcmF0b3IubmFtZX0gY2FuIGhhdmUgYXQgbW9zdCBvbmUgYXJndW1lbnQsIGdvdCAke1xuICAgICAgICAgICAgICAgIGRlY29yYXRvci5hcmdzLmxlbmd0aH0gYXJndW1lbnQocylgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfSwge30gYXMge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXX0pO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlSW5wdXQocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZyk6IFtzdHJpbmcsIHN0cmluZ10ge1xuICByZXR1cm4gW3B1YmxpY05hbWUsIGludGVybmFsTmFtZV07XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVPdXRwdXQocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZykge1xuICByZXR1cm4gcHVibGljTmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgIGZpZWxkczoge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfVtdLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFIzUXVlcnlNZXRhZGF0YVtdIHtcbiAgcmV0dXJuIGZpZWxkcy5tYXAoKHttZW1iZXIsIGRlY29yYXRvcnN9KSA9PiB7XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZGVjb3JhdG9yc1swXTtcbiAgICBjb25zdCBub2RlID0gbWVtYmVyLm5vZGUgfHwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpO1xuXG4gICAgLy8gVGhyb3cgaW4gY2FzZSBvZiBgQElucHV0KCkgQENvbnRlbnRDaGlsZCgnZm9vJykgZm9vOiBhbnlgLCB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGluIEl2eVxuICAgIGlmIChtZW1iZXIuZGVjb3JhdG9ycyEuc29tZSh2ID0+IHYubmFtZSA9PT0gJ0lucHV0JykpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0NPTExJU0lPTiwgbm9kZSxcbiAgICAgICAgICAnQ2Fubm90IGNvbWJpbmUgQElucHV0IGRlY29yYXRvcnMgd2l0aCBxdWVyeSBkZWNvcmF0b3JzJyk7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQ09MTElTSU9OLCBub2RlLFxuICAgICAgICAgICdDYW5ub3QgaGF2ZSBtdWx0aXBsZSBxdWVyeSBkZWNvcmF0b3JzIG9uIHRoZSBzYW1lIGNsYXNzIG1lbWJlcicpO1xuICAgIH0gZWxzZSBpZiAoIWlzUHJvcGVydHlUeXBlTWVtYmVyKG1lbWJlcikpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX1VORVhQRUNURUQsIG5vZGUsXG4gICAgICAgICAgJ1F1ZXJ5IGRlY29yYXRvciBtdXN0IGdvIG9uIGEgcHJvcGVydHktdHlwZSBtZW1iZXInKTtcbiAgICB9XG4gICAgcmV0dXJuIGV4dHJhY3RRdWVyeU1ldGFkYXRhKFxuICAgICAgICBub2RlLCBkZWNvcmF0b3IubmFtZSwgZGVjb3JhdG9yLmFyZ3MgfHwgW10sIG1lbWJlci5uYW1lLCByZWZsZWN0b3IsIGV2YWx1YXRvcik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpc1Byb3BlcnR5VHlwZU1lbWJlcihtZW1iZXI6IENsYXNzTWVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLkdldHRlciB8fCBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLlNldHRlciB8fFxuICAgICAgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbn1cblxudHlwZSBTdHJpbmdNYXA8VD4gPSB7XG4gIFtrZXk6IHN0cmluZ106IFQ7XG59O1xuXG5mdW5jdGlvbiBldmFsdWF0ZUhvc3RFeHByZXNzaW9uQmluZGluZ3MoXG4gICAgaG9zdEV4cHI6IHRzLkV4cHJlc3Npb24sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFBhcnNlZEhvc3RCaW5kaW5ncyB7XG4gIGNvbnN0IGhvc3RNZXRhTWFwID0gZXZhbHVhdG9yLmV2YWx1YXRlKGhvc3RFeHByKTtcbiAgaWYgKCEoaG9zdE1ldGFNYXAgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgaG9zdEV4cHIsIGhvc3RNZXRhTWFwLCBgRGVjb3JhdG9yIGhvc3QgbWV0YWRhdGEgbXVzdCBiZSBhbiBvYmplY3RgKTtcbiAgfVxuICBjb25zdCBob3N0TWV0YWRhdGE6IFN0cmluZ01hcDxzdHJpbmd8RXhwcmVzc2lvbj4gPSB7fTtcbiAgaG9zdE1ldGFNYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgIC8vIFJlc29sdmUgRW51bSByZWZlcmVuY2VzIHRvIHRoZWlyIGRlY2xhcmVkIHZhbHVlLlxuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVudW1WYWx1ZSkge1xuICAgICAgdmFsdWUgPSB2YWx1ZS5yZXNvbHZlZDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgaG9zdEV4cHIsIGtleSxcbiAgICAgICAgICBgRGVjb3JhdG9yIGhvc3QgbWV0YWRhdGEgbXVzdCBiZSBhIHN0cmluZyAtPiBzdHJpbmcgb2JqZWN0LCBidXQgZm91bmQgdW5wYXJzZWFibGUga2V5YCk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgaG9zdE1ldGFkYXRhW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICBob3N0TWV0YWRhdGFba2V5XSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodmFsdWUubm9kZSBhcyB0cy5FeHByZXNzaW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICBob3N0RXhwciwgdmFsdWUsXG4gICAgICAgICAgYERlY29yYXRvciBob3N0IG1ldGFkYXRhIG11c3QgYmUgYSBzdHJpbmcgLT4gc3RyaW5nIG9iamVjdCwgYnV0IGZvdW5kIHVucGFyc2VhYmxlIHZhbHVlYCk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBiaW5kaW5ncyA9IHBhcnNlSG9zdEJpbmRpbmdzKGhvc3RNZXRhZGF0YSk7XG5cbiAgY29uc3QgZXJyb3JzID0gdmVyaWZ5SG9zdEJpbmRpbmdzKGJpbmRpbmdzLCBjcmVhdGVTb3VyY2VTcGFuKGhvc3RFeHByKSk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgLy8gVE9ETzogcHJvdmlkZSBtb3JlIGdyYW51bGFyIGRpYWdub3N0aWMgYW5kIG91dHB1dCBzcGVjaWZpYyBob3N0IGV4cHJlc3Npb24gdGhhdFxuICAgICAgICAvLyB0cmlnZ2VyZWQgYW4gZXJyb3IgaW5zdGVhZCBvZiB0aGUgd2hvbGUgaG9zdCBvYmplY3QuXG4gICAgICAgIEVycm9yQ29kZS5IT1NUX0JJTkRJTkdfUEFSU0VfRVJST1IsIGhvc3RFeHByLFxuICAgICAgICBlcnJvcnMubWFwKChlcnJvcjogUGFyc2VFcnJvcikgPT4gZXJyb3IubXNnKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICByZXR1cm4gYmluZGluZ3M7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0SG9zdEJpbmRpbmdzKFxuICAgIG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvciwgY29yZU1vZHVsZTogc3RyaW5nfHVuZGVmaW5lZCxcbiAgICBtZXRhZGF0YT86IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+KTogUGFyc2VkSG9zdEJpbmRpbmdzIHtcbiAgbGV0IGJpbmRpbmdzOiBQYXJzZWRIb3N0QmluZGluZ3M7XG4gIGlmIChtZXRhZGF0YSAmJiBtZXRhZGF0YS5oYXMoJ2hvc3QnKSkge1xuICAgIGJpbmRpbmdzID0gZXZhbHVhdGVIb3N0RXhwcmVzc2lvbkJpbmRpbmdzKG1ldGFkYXRhLmdldCgnaG9zdCcpISwgZXZhbHVhdG9yKTtcbiAgfSBlbHNlIHtcbiAgICBiaW5kaW5ncyA9IHBhcnNlSG9zdEJpbmRpbmdzKHt9KTtcbiAgfVxuXG4gIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVycywgJ0hvc3RCaW5kaW5nJywgY29yZU1vZHVsZSlcbiAgICAgIC5mb3JFYWNoKCh7bWVtYmVyLCBkZWNvcmF0b3JzfSkgPT4ge1xuICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgICAgICBsZXQgaG9zdFByb3BlcnR5TmFtZTogc3RyaW5nID0gbWVtYmVyLm5hbWU7XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0QmluZGluZyBjYW4gaGF2ZSBhdCBtb3N0IG9uZSBhcmd1bWVudCwgZ290ICR7XG4gICAgICAgICAgICAgICAgICAgICAgZGVjb3JhdG9yLmFyZ3MubGVuZ3RofSBhcmd1bWVudChzKWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgICAgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLCByZXNvbHZlZCxcbiAgICAgICAgICAgICAgICAgIGBASG9zdEJpbmRpbmcncyBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGhvc3RQcm9wZXJ0eU5hbWUgPSByZXNvbHZlZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTaW5jZSB0aGlzIGlzIGEgZGVjb3JhdG9yLCB3ZSBrbm93IHRoYXQgdGhlIHZhbHVlIGlzIGEgY2xhc3MgbWVtYmVyLiBBbHdheXMgYWNjZXNzIGl0XG4gICAgICAgICAgLy8gdGhyb3VnaCBgdGhpc2Agc28gdGhhdCBmdXJ0aGVyIGRvd24gdGhlIGxpbmUgaXQgY2FuJ3QgYmUgY29uZnVzZWQgZm9yIGEgbGl0ZXJhbCB2YWx1ZVxuICAgICAgICAgIC8vIChlLmcuIGlmIHRoZXJlJ3MgYSBwcm9wZXJ0eSBjYWxsZWQgYHRydWVgKS4gVGhlcmUgaXMgbm8gc2l6ZSBwZW5hbHR5LCBiZWNhdXNlIGFsbFxuICAgICAgICAgIC8vIHZhbHVlcyAoZXhjZXB0IGxpdGVyYWxzKSBhcmUgY29udmVydGVkIHRvIGBjdHgucHJvcE5hbWVgIGV2ZW50dWFsbHkuXG4gICAgICAgICAgYmluZGluZ3MucHJvcGVydGllc1tob3N0UHJvcGVydHlOYW1lXSA9IGdldFNhZmVQcm9wZXJ0eUFjY2Vzc1N0cmluZygndGhpcycsIG1lbWJlci5uYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKG1lbWJlcnMsICdIb3N0TGlzdGVuZXInLCBjb3JlTW9kdWxlKVxuICAgICAgLmZvckVhY2goKHttZW1iZXIsIGRlY29yYXRvcnN9KSA9PiB7XG4gICAgICAgIGRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgICAgIGxldCBldmVudE5hbWU6IHN0cmluZyA9IG1lbWJlci5uYW1lO1xuICAgICAgICAgIGxldCBhcmdzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncyAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWNvcmF0b3IuYXJnc1syXSxcbiAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyIGNhbiBoYXZlIGF0IG1vc3QgdHdvIGFyZ3VtZW50c2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgICAgZGVjb3JhdG9yLmFyZ3NbMF0sIHJlc29sdmVkLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0TGlzdGVuZXIncyBldmVudCBuYW1lIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXZlbnROYW1lID0gcmVzb2x2ZWQ7XG5cbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgICAgY29uc3QgZXhwcmVzc2lvbiA9IGRlY29yYXRvci5hcmdzWzFdO1xuICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZEFyZ3MgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMV0pO1xuICAgICAgICAgICAgICBpZiAoIWlzU3RyaW5nQXJyYXlPckRpZShyZXNvbHZlZEFyZ3MsICdASG9zdExpc3RlbmVyLmFyZ3MnLCBleHByZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgIGRlY29yYXRvci5hcmdzWzFdLCByZXNvbHZlZEFyZ3MsXG4gICAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyJ3Mgc2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcgYXJyYXlgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBhcmdzID0gcmVzb2x2ZWRBcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGJpbmRpbmdzLmxpc3RlbmVyc1tldmVudE5hbWVdID0gYCR7bWVtYmVyLm5hbWV9KCR7YXJncy5qb2luKCcsJyl9KWA7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIHJldHVybiBiaW5kaW5ncztcbn1cblxuY29uc3QgUVVFUllfVFlQRVMgPSBuZXcgU2V0KFtcbiAgJ0NvbnRlbnRDaGlsZCcsXG4gICdDb250ZW50Q2hpbGRyZW4nLFxuICAnVmlld0NoaWxkJyxcbiAgJ1ZpZXdDaGlsZHJlbicsXG5dKTtcbiJdfQ==