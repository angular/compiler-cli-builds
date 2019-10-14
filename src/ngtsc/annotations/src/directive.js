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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/directive", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/metadata/src/util", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/util");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_OBJECT = {};
    var DirectiveDecoratorHandler = /** @class */ (function () {
        function DirectiveDecoratorHandler(reflector, evaluator, metaRegistry, defaultImportRecorder, isCore) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaRegistry = metaRegistry;
            this.defaultImportRecorder = defaultImportRecorder;
            this.isCore = isCore;
            this.precedence = transform_1.HandlerPrecedence.PRIMARY;
        }
        DirectiveDecoratorHandler.prototype.detect = function (node, decorators) {
            if (!decorators) {
                return undefined;
            }
            var decorator = util_2.findAngularDecorator(decorators, 'Directive', this.isCore);
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
        DirectiveDecoratorHandler.prototype.analyze = function (node, decorator) {
            var directiveResult = extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.defaultImportRecorder, this.isCore);
            var analysis = directiveResult && directiveResult.metadata;
            // If the directive has a selector, it should be registered with the `SelectorScopeRegistry` so
            // when this directive appears in an `@NgModule` scope, its selector can be determined.
            if (analysis && analysis.selector !== null) {
                var ref = new imports_1.Reference(node);
                this.metaRegistry.registerDirectiveMetadata(tslib_1.__assign({ ref: ref, name: node.name.text, selector: analysis.selector, exportAs: analysis.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.queries.map(function (query) { return query.propertyName; }), isComponent: false }, util_1.extractDirectiveGuards(node, this.reflector), { baseClass: util_2.readBaseClass(node, this.reflector, this.evaluator) }));
            }
            if (analysis && !analysis.selector) {
                this.metaRegistry.registerAbstractDirective(node);
            }
            if (analysis === undefined) {
                return {};
            }
            return {
                analysis: {
                    meta: analysis,
                    metadataStmt: metadata_1.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore),
                }
            };
        };
        DirectiveDecoratorHandler.prototype.compile = function (node, analysis, pool) {
            var meta = analysis.meta;
            var res = compiler_1.compileDirectiveFromMetadata(meta, pool, compiler_1.makeBindingParser());
            var factoryRes = factory_1.compileNgFactoryDefField(tslib_1.__assign({}, meta, { injectFn: compiler_1.Identifiers.directiveInject }));
            if (analysis.metadataStmt !== null) {
                factoryRes.statements.push(analysis.metadataStmt);
            }
            return [
                factoryRes, {
                    name: 'ɵdir',
                    initializer: res.expression,
                    statements: [],
                    type: res.type,
                }
            ];
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
    function extractDirectiveMetadata(clazz, decorator, reflector, evaluator, defaultImportRecorder, isCore, defaultSelector) {
        if (defaultSelector === void 0) { defaultSelector = null; }
        var directive;
        if (decorator.args === null || decorator.args.length === 0) {
            directive = new Map();
        }
        else if (decorator.args.length !== 1) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.node, "Incorrect number of arguments to @" + decorator.name + " decorator");
        }
        else {
            var meta = util_2.unwrapExpression(decorator.args[0]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, "@" + decorator.name + " argument must be literal.");
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
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "selector must be a string");
            }
            // use default selector in case selector is an empty string
            selector = resolved === '' ? defaultSelector : resolved;
            if (!selector) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DIRECTIVE_MISSING_SELECTOR, expr, "Directive " + clazz.name.text + " has no selector, please add it!");
            }
        }
        var host = extractHostBindings(decoratedElements, evaluator, coreModule, directive);
        var providers = directive.has('providers') ? new compiler_1.WrappedNodeExpr(directive.get('providers')) : null;
        // Determine if `ngOnChanges` is a lifecycle hook defined on the component.
        var usesOnChanges = members.some(function (member) { return !member.isStatic && member.kind === reflection_1.ClassMemberKind.Method &&
            member.name === 'ngOnChanges'; });
        // Parse exportAs.
        var exportAs = null;
        if (directive.has('exportAs')) {
            var expr = directive.get('exportAs');
            var resolved = evaluator.evaluate(expr);
            if (typeof resolved !== 'string') {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "exportAs must be a string");
            }
            exportAs = resolved.split(',').map(function (part) { return part.trim(); });
        }
        // Detect if the component inherits from another class
        var usesInheritance = reflector.hasBaseClass(clazz);
        var metadata = {
            name: clazz.name.text,
            deps: util_2.getValidConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore), host: host,
            lifecycle: {
                usesOnChanges: usesOnChanges,
            },
            inputs: tslib_1.__assign({}, inputsFromMeta, inputsFromFields),
            outputs: tslib_1.__assign({}, outputsFromMeta, outputsFromFields), queries: queries, viewQueries: viewQueries, selector: selector,
            type: new compiler_1.WrappedNodeExpr(clazz.name),
            typeArgumentCount: reflector.getGenericArityOfClass(clazz) || 0,
            typeSourceSpan: compiler_1.EMPTY_SOURCE_SPAN, usesInheritance: usesInheritance, exportAs: exportAs, providers: providers
        };
        return { decoratedElements: decoratedElements, decorator: directive, metadata: metadata };
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
        if (arg instanceof imports_1.Reference) {
            predicate = new compiler_1.WrappedNodeExpr(node);
        }
        else if (typeof arg === 'string') {
            predicate = [arg];
        }
        else if (isStringArrayOrDie(arg, '@' + name)) {
            predicate = arg;
        }
        else {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, node, "@" + name + " predicate cannot be interpreted");
        }
        // Extract the read and descendants options.
        var read = null;
        // The default value for descendants is true for every decorator except @ContentChildren.
        var descendants = name !== 'ContentChildren';
        if (args.length === 2) {
            var optionsExpr = util_2.unwrapExpression(args[1]);
            if (!ts.isObjectLiteralExpression(optionsExpr)) {
                throw new Error("@" + name + " options must be an object literal");
            }
            var options = reflection_1.reflectObjectLiteral(optionsExpr);
            if (options.has('read')) {
                read = new compiler_1.WrappedNodeExpr(options.get('read'));
            }
            if (options.has('descendants')) {
                var descendantsValue = evaluator.evaluate(options.get('descendants'));
                if (typeof descendantsValue !== 'boolean') {
                    throw new Error("@" + name + " options.descendants must be a boolean");
                }
                descendants = descendantsValue;
            }
            if (options.has('static')) {
                var staticValue = evaluator.evaluate(options.get('static'));
                if (typeof staticValue !== 'boolean') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, node, "@" + name + " options.static must be a boolean");
                }
                isStatic = staticValue;
            }
        }
        else if (args.length > 2) {
            // Too many arguments.
            throw new Error("@" + name + " has too many arguments");
        }
        return {
            propertyName: propertyName,
            predicate: predicate,
            first: first,
            descendants: descendants,
            read: read,
            static: isStatic,
        };
    }
    exports.extractQueryMetadata = extractQueryMetadata;
    function extractQueriesFromDecorator(queryData, reflector, evaluator, isCore) {
        var content = [], view = [];
        var expr = util_2.unwrapExpression(queryData);
        if (!ts.isObjectLiteralExpression(queryData)) {
            throw new Error("queries metadata must be an object literal");
        }
        reflection_1.reflectObjectLiteral(queryData).forEach(function (queryExpr, propertyName) {
            queryExpr = util_2.unwrapExpression(queryExpr);
            if (!ts.isNewExpression(queryExpr) || !ts.isIdentifier(queryExpr.expression)) {
                throw new Error("query metadata must be an instance of a query type");
            }
            var type = reflector.getImportOfIdentifier(queryExpr.expression);
            if (type === null || (!isCore && type.from !== '@angular/core') ||
                !QUERY_TYPES.has(type.name)) {
                throw new Error("query metadata must be an instance of a query type");
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
    function isStringArrayOrDie(value, name) {
        if (!Array.isArray(value)) {
            return false;
        }
        for (var i = 0; i < value.length; i++) {
            if (typeof value[i] !== 'string') {
                throw new Error("Failed to resolve " + name + "[" + i + "] to a string");
            }
        }
        return true;
    }
    function parseFieldArrayValue(directive, field, evaluator) {
        if (!directive.has(field)) {
            return null;
        }
        // Resolve the field of interest from the directive metadata to a string[].
        var value = evaluator.evaluate(directive.get(field));
        if (!isStringArrayOrDie(value, field)) {
            throw new Error("Failed to resolve @Directive." + field);
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
                        throw new Error("Decorator argument must resolve to a string");
                    }
                    results[fieldName] = mapValueResolver(property, fieldName);
                }
                else {
                    // Too many arguments.
                    throw new Error("Decorator must have 0 or 1 arguments, got " + decorator.args.length + " argument(s)");
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
            var node = member.node || decorator.node;
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
            return extractQueryMetadata(decorator.node, decorator.name, decorator.args || [], member.name, reflector, evaluator);
        });
    }
    exports.queriesFromFields = queriesFromFields;
    function isPropertyTypeMember(member) {
        return member.kind === reflection_1.ClassMemberKind.Getter || member.kind === reflection_1.ClassMemberKind.Setter ||
            member.kind === reflection_1.ClassMemberKind.Property;
    }
    function extractHostBindings(members, evaluator, coreModule, metadata) {
        var hostMetadata = {};
        if (metadata && metadata.has('host')) {
            var expr = metadata.get('host');
            var hostMetaMap = evaluator.evaluate(expr);
            if (!(hostMetaMap instanceof Map)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, expr, "Decorator host metadata must be an object");
            }
            hostMetaMap.forEach(function (value, key) {
                // Resolve Enum references to their declared value.
                if (value instanceof partial_evaluator_1.EnumValue) {
                    value = value.resolved;
                }
                if (typeof key !== 'string') {
                    throw new Error("Decorator host metadata must be a string -> string object, but found unparseable key " + key);
                }
                if (typeof value == 'string') {
                    hostMetadata[key] = value;
                }
                else if (value instanceof partial_evaluator_1.DynamicValue) {
                    hostMetadata[key] = new compiler_1.WrappedNodeExpr(value.node);
                }
                else {
                    throw new Error("Decorator host metadata must be a string -> string object, but found unparseable value " + value);
                }
            });
        }
        var bindings = compiler_1.parseHostBindings(hostMetadata);
        // TODO: create and provide proper sourceSpan to make error message more descriptive (FW-995)
        // For now, pass an incorrect (empty) but valid sourceSpan.
        var errors = compiler_1.verifyHostBindings(bindings, compiler_1.EMPTY_SOURCE_SPAN);
        if (errors.length > 0) {
            throw new diagnostics_1.FatalDiagnosticError(
            // TODO: provide more granular diagnostic and output specific host expression that triggered
            // an error instead of the whole host object
            diagnostics_1.ErrorCode.HOST_BINDING_PARSE_ERROR, metadata.get('host'), errors.map(function (error) { return error.msg; }).join('\n'));
        }
        reflection_1.filterToMembersWithDecorator(members, 'HostBinding', coreModule)
            .forEach(function (_a) {
            var member = _a.member, decorators = _a.decorators;
            decorators.forEach(function (decorator) {
                var hostPropertyName = member.name;
                if (decorator.args !== null && decorator.args.length > 0) {
                    if (decorator.args.length !== 1) {
                        throw new Error("@HostBinding() can have at most one argument");
                    }
                    var resolved = evaluator.evaluate(decorator.args[0]);
                    if (typeof resolved !== 'string') {
                        throw new Error("@HostBinding()'s argument must be a string");
                    }
                    hostPropertyName = resolved;
                }
                bindings.properties[hostPropertyName] = member.name;
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
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.args[2], "@HostListener() can have at most two arguments");
                    }
                    var resolved = evaluator.evaluate(decorator.args[0]);
                    if (typeof resolved !== 'string') {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, decorator.args[0], "@HostListener()'s event name argument must be a string");
                    }
                    eventName = resolved;
                    if (decorator.args.length === 2) {
                        var resolvedArgs = evaluator.evaluate(decorator.args[1]);
                        if (!isStringArrayOrDie(resolvedArgs, '@HostListener.args')) {
                            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, decorator.args[1], "@HostListener second argument must be a string array");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFxUjtJQUNyUiwrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUErRDtJQUUvRCwwRUFBK0Q7SUFDL0QsdUZBQWtGO0lBQ2xGLHlFQUErSjtJQUMvSix1RUFBaUg7SUFFakgsbUZBQW1EO0lBQ25ELHFGQUF3RDtJQUN4RCw2RUFBZ0k7SUFFaEksSUFBTSxZQUFZLEdBQTRCLEVBQUUsQ0FBQztJQU1qRDtRQUVFLG1DQUNZLFNBQXlCLEVBQVUsU0FBMkIsRUFDOUQsWUFBOEIsRUFBVSxxQkFBNEMsRUFDcEYsTUFBZTtZQUZmLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBa0I7WUFDOUQsaUJBQVksR0FBWixZQUFZLENBQWtCO1lBQVUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtZQUNwRixXQUFNLEdBQU4sTUFBTSxDQUFTO1lBRWxCLGVBQVUsR0FBRyw2QkFBaUIsQ0FBQyxPQUFPLENBQUM7UUFGbEIsQ0FBQztRQUkvQiwwQ0FBTSxHQUFOLFVBQU8sSUFBc0IsRUFBRSxVQUE0QjtZQUN6RCxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxTQUFTLEdBQUcsMkJBQW9CLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0UsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO2dCQUMzQixPQUFPO29CQUNMLE9BQU8sRUFBRSxTQUFTLENBQUMsSUFBSTtvQkFDdkIsUUFBUSxFQUFFLFNBQVM7aUJB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QUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDakQsd0RBQXdELENBQUMsQ0FBQztxQkFDL0Q7b0JBRUQsU0FBUyxHQUFHLFFBQVEsQ0FBQztvQkFFckIsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7d0JBQy9CLElBQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUMzRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxFQUFFLG9CQUFvQixDQUFDLEVBQUU7NEJBQzNELE1BQU0sSUFBSSxrQ0FBb0IsQ0FDMUIsdUJBQVMsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNqRCxzREFBc0QsQ0FBQyxDQUFDO3lCQUM3RDt3QkFDRCxJQUFJLEdBQUcsWUFBWSxDQUFDO3FCQUNyQjtpQkFDRjtnQkFFRCxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFNLE1BQU0sQ0FBQyxJQUFJLFNBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBRyxDQUFDO1lBQ3RFLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDUCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBdkdELGtEQXVHQztJQUVELElBQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDO1FBQzFCLGNBQWM7UUFDZCxpQkFBaUI7UUFDakIsV0FBVztRQUNYLGNBQWM7S0FDZixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFTVBUWV9TT1VSQ0VfU1BBTiwgRXhwcmVzc2lvbiwgSWRlbnRpZmllcnMsIFBhcnNlRXJyb3IsIFBhcnNlZEhvc3RCaW5kaW5ncywgUjNEaXJlY3RpdmVNZXRhZGF0YSwgUjNRdWVyeU1ldGFkYXRhLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZURpcmVjdGl2ZUZyb21NZXRhZGF0YSwgbWFrZUJpbmRpbmdQYXJzZXIsIHBhcnNlSG9zdEJpbmRpbmdzLCB2ZXJpZnlIb3N0QmluZGluZ3N9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyLCBSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtNZXRhZGF0YVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge2V4dHJhY3REaXJlY3RpdmVHdWFyZHN9IGZyb20gJy4uLy4uL21ldGFkYXRhL3NyYy91dGlsJztcbmltcG9ydCB7RHluYW1pY1ZhbHVlLCBFbnVtVmFsdWUsIFBhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvciwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZX0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmaW5kQW5ndWxhckRlY29yYXRvciwgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgcmVhZEJhc2VDbGFzcywgdW53cmFwRXhwcmVzc2lvbiwgdW53cmFwRm9yd2FyZFJlZn0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgRU1QVFlfT0JKRUNUOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZUhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNEaXJlY3RpdmVNZXRhZGF0YTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcbn1cbmV4cG9ydCBjbGFzcyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERpcmVjdGl2ZUhhbmRsZXJEYXRhLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBtZXRhUmVnaXN0cnk6IE1ldGFkYXRhUmVnaXN0cnksIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIGlzQ29yZTogYm9vbGVhbikge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnRGlyZWN0aXZlJywgdGhpcy5pc0NvcmUpO1xuICAgIGlmIChkZWNvcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJpZ2dlcjogZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIG1ldGFkYXRhOiBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxEaXJlY3RpdmVIYW5kbGVyRGF0YT4ge1xuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9IGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICAgICAgbm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSk7XG4gICAgY29uc3QgYW5hbHlzaXMgPSBkaXJlY3RpdmVSZXN1bHQgJiYgZGlyZWN0aXZlUmVzdWx0Lm1ldGFkYXRhO1xuXG4gICAgLy8gSWYgdGhlIGRpcmVjdGl2ZSBoYXMgYSBzZWxlY3RvciwgaXQgc2hvdWxkIGJlIHJlZ2lzdGVyZWQgd2l0aCB0aGUgYFNlbGVjdG9yU2NvcGVSZWdpc3RyeWAgc29cbiAgICAvLyB3aGVuIHRoaXMgZGlyZWN0aXZlIGFwcGVhcnMgaW4gYW4gYEBOZ01vZHVsZWAgc2NvcGUsIGl0cyBzZWxlY3RvciBjYW4gYmUgZGV0ZXJtaW5lZC5cbiAgICBpZiAoYW5hbHlzaXMgJiYgYW5hbHlzaXMuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKHtcbiAgICAgICAgcmVmLFxuICAgICAgICBuYW1lOiBub2RlLm5hbWUudGV4dCxcbiAgICAgICAgc2VsZWN0b3I6IGFuYWx5c2lzLnNlbGVjdG9yLFxuICAgICAgICBleHBvcnRBczogYW5hbHlzaXMuZXhwb3J0QXMsXG4gICAgICAgIGlucHV0czogYW5hbHlzaXMuaW5wdXRzLFxuICAgICAgICBvdXRwdXRzOiBhbmFseXNpcy5vdXRwdXRzLFxuICAgICAgICBxdWVyaWVzOiBhbmFseXNpcy5xdWVyaWVzLm1hcChxdWVyeSA9PiBxdWVyeS5wcm9wZXJ0eU5hbWUpLFxuICAgICAgICBpc0NvbXBvbmVudDogZmFsc2UsIC4uLmV4dHJhY3REaXJlY3RpdmVHdWFyZHMobm9kZSwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgICBiYXNlQ2xhc3M6IHJlYWRCYXNlQ2xhc3Mobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChhbmFseXNpcyAmJiAhYW5hbHlzaXMuc2VsZWN0b3IpIHtcbiAgICAgIHRoaXMubWV0YVJlZ2lzdHJ5LnJlZ2lzdGVyQWJzdHJhY3REaXJlY3RpdmUobm9kZSk7XG4gICAgfVxuXG4gICAgaWYgKGFuYWx5c2lzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgbWV0YTogYW5hbHlzaXMsXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBjb21waWxlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBEaXJlY3RpdmVIYW5kbGVyRGF0YSwgcG9vbDogQ29uc3RhbnRQb29sKTpcbiAgICAgIENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgbWV0YSA9IGFuYWx5c2lzLm1ldGE7XG4gICAgY29uc3QgcmVzID0gY29tcGlsZURpcmVjdGl2ZUZyb21NZXRhZGF0YShtZXRhLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICBjb25zdCBmYWN0b3J5UmVzID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKHsuLi5tZXRhLCBpbmplY3RGbjogSWRlbnRpZmllcnMuZGlyZWN0aXZlSW5qZWN0fSk7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIFtcbiAgICAgIGZhY3RvcnlSZXMsIHtcbiAgICAgICAgbmFtZTogJ8m1ZGlyJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgICB9XG4gICAgXTtcbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBleHRyYWN0IG1ldGFkYXRhIGZyb20gYSBgRGlyZWN0aXZlYCBvciBgQ29tcG9uZW50YC4gYERpcmVjdGl2ZWBzIHdpdGhvdXQgYVxuICogc2VsZWN0b3IgYXJlIGFsbG93ZWQgdG8gYmUgdXNlZCBmb3IgYWJzdHJhY3QgYmFzZSBjbGFzc2VzLiBUaGVzZSBhYnN0cmFjdCBkaXJlY3RpdmVzIHNob3VsZCBub3RcbiAqIGFwcGVhciBpbiB0aGUgZGVjbGFyYXRpb25zIG9mIGFuIGBOZ01vZHVsZWAgYW5kIGFkZGl0aW9uYWwgdmVyaWZpY2F0aW9uIGlzIGRvbmUgd2hlbiBwcm9jZXNzaW5nXG4gKiB0aGUgbW9kdWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvciwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgZGVmYXVsdFNlbGVjdG9yOiBzdHJpbmcgfCBudWxsID0gbnVsbCk6IHtcbiAgZGVjb3JhdG9yOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPixcbiAgbWV0YWRhdGE6IFIzRGlyZWN0aXZlTWV0YWRhdGEsXG4gIGRlY29yYXRlZEVsZW1lbnRzOiBDbGFzc01lbWJlcltdLFxufXx1bmRlZmluZWQge1xuICBsZXQgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPjtcbiAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIGRpcmVjdGl2ZSA9IG5ldyBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPigpO1xuICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yYCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLFxuICAgICAgICAgIGBAJHtkZWNvcmF0b3IubmFtZX0gYXJndW1lbnQgbXVzdCBiZSBsaXRlcmFsLmApO1xuICAgIH1cbiAgICBkaXJlY3RpdmUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcbiAgfVxuXG4gIGlmIChkaXJlY3RpdmUuaGFzKCdqaXQnKSkge1xuICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBtZW1iZXJzID0gcmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KTtcblxuICAvLyBQcmVjb21wdXRlIGEgbGlzdCBvZiB0cy5DbGFzc0VsZW1lbnRzIHRoYXQgaGF2ZSBkZWNvcmF0b3JzLiBUaGlzIGluY2x1ZGVzIHRoaW5ncyBsaWtlIEBJbnB1dCxcbiAgLy8gQE91dHB1dCwgQEhvc3RCaW5kaW5nLCBldGMuXG4gIGNvbnN0IGRlY29yYXRlZEVsZW1lbnRzID1cbiAgICAgIG1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiAhbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5kZWNvcmF0b3JzICE9PSBudWxsKTtcblxuICBjb25zdCBjb3JlTW9kdWxlID0gaXNDb3JlID8gdW5kZWZpbmVkIDogJ0Bhbmd1bGFyL2NvcmUnO1xuXG4gIC8vIENvbnN0cnVjdCB0aGUgbWFwIG9mIGlucHV0cyBib3RoIGZyb20gdGhlIEBEaXJlY3RpdmUvQENvbXBvbmVudFxuICAvLyBkZWNvcmF0b3IsIGFuZCB0aGUgZGVjb3JhdGVkXG4gIC8vIGZpZWxkcy5cbiAgY29uc3QgaW5wdXRzRnJvbU1ldGEgPSBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoZGlyZWN0aXZlLCAnaW5wdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3QgaW5wdXRzRnJvbUZpZWxkcyA9IHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0lucHV0JywgY29yZU1vZHVsZSksIGV2YWx1YXRvcixcbiAgICAgIHJlc29sdmVJbnB1dCk7XG5cbiAgLy8gQW5kIG91dHB1dHMuXG4gIGNvbnN0IG91dHB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdvdXRwdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3Qgb3V0cHV0c0Zyb21GaWVsZHMgPSBwYXJzZURlY29yYXRlZEZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdPdXRwdXQnLCBjb3JlTW9kdWxlKSwgZXZhbHVhdG9yLFxuICAgICAgcmVzb2x2ZU91dHB1dCkgYXN7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9O1xuICAvLyBDb25zdHJ1Y3QgdGhlIGxpc3Qgb2YgcXVlcmllcy5cbiAgY29uc3QgY29udGVudENoaWxkRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0NvbnRlbnRDaGlsZCcsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuICBjb25zdCBjb250ZW50Q2hpbGRyZW5Gcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnQ29udGVudENoaWxkcmVuJywgY29yZU1vZHVsZSksIHJlZmxlY3RvcixcbiAgICAgIGV2YWx1YXRvcik7XG5cbiAgY29uc3QgcXVlcmllcyA9IFsuLi5jb250ZW50Q2hpbGRGcm9tRmllbGRzLCAuLi5jb250ZW50Q2hpbGRyZW5Gcm9tRmllbGRzXTtcblxuICAvLyBDb25zdHJ1Y3QgdGhlIGxpc3Qgb2YgdmlldyBxdWVyaWVzLlxuICBjb25zdCB2aWV3Q2hpbGRGcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnVmlld0NoaWxkJywgY29yZU1vZHVsZSksIHJlZmxlY3RvcixcbiAgICAgIGV2YWx1YXRvcik7XG4gIGNvbnN0IHZpZXdDaGlsZHJlbkZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdWaWV3Q2hpbGRyZW4nLCBjb3JlTW9kdWxlKSwgcmVmbGVjdG9yLFxuICAgICAgZXZhbHVhdG9yKTtcbiAgY29uc3Qgdmlld1F1ZXJpZXMgPSBbLi4udmlld0NoaWxkRnJvbUZpZWxkcywgLi4udmlld0NoaWxkcmVuRnJvbUZpZWxkc107XG5cbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ3F1ZXJpZXMnKSkge1xuICAgIGNvbnN0IHF1ZXJpZXNGcm9tRGVjb3JhdG9yID1cbiAgICAgICAgZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yKGRpcmVjdGl2ZS5nZXQoJ3F1ZXJpZXMnKSAhLCByZWZsZWN0b3IsIGV2YWx1YXRvciwgaXNDb3JlKTtcbiAgICBxdWVyaWVzLnB1c2goLi4ucXVlcmllc0Zyb21EZWNvcmF0b3IuY29udGVudCk7XG4gICAgdmlld1F1ZXJpZXMucHVzaCguLi5xdWVyaWVzRnJvbURlY29yYXRvci52aWV3KTtcbiAgfVxuXG4gIC8vIFBhcnNlIHRoZSBzZWxlY3Rvci5cbiAgbGV0IHNlbGVjdG9yID0gZGVmYXVsdFNlbGVjdG9yO1xuICBpZiAoZGlyZWN0aXZlLmhhcygnc2VsZWN0b3InKSkge1xuICAgIGNvbnN0IGV4cHIgPSBkaXJlY3RpdmUuZ2V0KCdzZWxlY3RvcicpICE7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsIGBzZWxlY3RvciBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgfVxuICAgIC8vIHVzZSBkZWZhdWx0IHNlbGVjdG9yIGluIGNhc2Ugc2VsZWN0b3IgaXMgYW4gZW1wdHkgc3RyaW5nXG4gICAgc2VsZWN0b3IgPSByZXNvbHZlZCA9PT0gJycgPyBkZWZhdWx0U2VsZWN0b3IgOiByZXNvbHZlZDtcbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRJUkVDVElWRV9NSVNTSU5HX1NFTEVDVE9SLCBleHByLFxuICAgICAgICAgIGBEaXJlY3RpdmUgJHtjbGF6ei5uYW1lLnRleHR9IGhhcyBubyBzZWxlY3RvciwgcGxlYXNlIGFkZCBpdCFgKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBob3N0ID0gZXh0cmFjdEhvc3RCaW5kaW5ncyhkZWNvcmF0ZWRFbGVtZW50cywgZXZhbHVhdG9yLCBjb3JlTW9kdWxlLCBkaXJlY3RpdmUpO1xuXG4gIGNvbnN0IHByb3ZpZGVyczogRXhwcmVzc2lvbnxudWxsID1cbiAgICAgIGRpcmVjdGl2ZS5oYXMoJ3Byb3ZpZGVycycpID8gbmV3IFdyYXBwZWROb2RlRXhwcihkaXJlY3RpdmUuZ2V0KCdwcm92aWRlcnMnKSAhKSA6IG51bGw7XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGBuZ09uQ2hhbmdlc2AgaXMgYSBsaWZlY3ljbGUgaG9vayBkZWZpbmVkIG9uIHRoZSBjb21wb25lbnQuXG4gIGNvbnN0IHVzZXNPbkNoYW5nZXMgPSBtZW1iZXJzLnNvbWUoXG4gICAgICBtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJlxuICAgICAgICAgIG1lbWJlci5uYW1lID09PSAnbmdPbkNoYW5nZXMnKTtcblxuICAvLyBQYXJzZSBleHBvcnRBcy5cbiAgbGV0IGV4cG9ydEFzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ2V4cG9ydEFzJykpIHtcbiAgICBjb25zdCBleHByID0gZGlyZWN0aXZlLmdldCgnZXhwb3J0QXMnKSAhO1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCBgZXhwb3J0QXMgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBleHBvcnRBcyA9IHJlc29sdmVkLnNwbGl0KCcsJykubWFwKHBhcnQgPT4gcGFydC50cmltKCkpO1xuICB9XG5cbiAgLy8gRGV0ZWN0IGlmIHRoZSBjb21wb25lbnQgaW5oZXJpdHMgZnJvbSBhbm90aGVyIGNsYXNzXG4gIGNvbnN0IHVzZXNJbmhlcml0YW5jZSA9IHJlZmxlY3Rvci5oYXNCYXNlQ2xhc3MoY2xhenopO1xuICBjb25zdCBtZXRhZGF0YTogUjNEaXJlY3RpdmVNZXRhZGF0YSA9IHtcbiAgICBuYW1lOiBjbGF6ei5uYW1lLnRleHQsXG4gICAgZGVwczogZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBkZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZSksIGhvc3QsXG4gICAgbGlmZWN5Y2xlOiB7XG4gICAgICAgIHVzZXNPbkNoYW5nZXMsXG4gICAgfSxcbiAgICBpbnB1dHM6IHsuLi5pbnB1dHNGcm9tTWV0YSwgLi4uaW5wdXRzRnJvbUZpZWxkc30sXG4gICAgb3V0cHV0czogey4uLm91dHB1dHNGcm9tTWV0YSwgLi4ub3V0cHV0c0Zyb21GaWVsZHN9LCBxdWVyaWVzLCB2aWV3UXVlcmllcywgc2VsZWN0b3IsXG4gICAgdHlwZTogbmV3IFdyYXBwZWROb2RlRXhwcihjbGF6ei5uYW1lKSxcbiAgICB0eXBlQXJndW1lbnRDb3VudDogcmVmbGVjdG9yLmdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xhenopIHx8IDAsXG4gICAgdHlwZVNvdXJjZVNwYW46IEVNUFRZX1NPVVJDRV9TUEFOLCB1c2VzSW5oZXJpdGFuY2UsIGV4cG9ydEFzLCBwcm92aWRlcnNcbiAgfTtcbiAgcmV0dXJuIHtkZWNvcmF0ZWRFbGVtZW50cywgZGVjb3JhdG9yOiBkaXJlY3RpdmUsIG1ldGFkYXRhfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RRdWVyeU1ldGFkYXRhKFxuICAgIGV4cHJOb2RlOiB0cy5Ob2RlLCBuYW1lOiBzdHJpbmcsIGFyZ3M6IFJlYWRvbmx5QXJyYXk8dHMuRXhwcmVzc2lvbj4sIHByb3BlcnR5TmFtZTogc3RyaW5nLFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFIzUXVlcnlNZXRhZGF0YSB7XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZXhwck5vZGUsIGBAJHtuYW1lfSBtdXN0IGhhdmUgYXJndW1lbnRzYCk7XG4gIH1cbiAgY29uc3QgZmlyc3QgPSBuYW1lID09PSAnVmlld0NoaWxkJyB8fCBuYW1lID09PSAnQ29udGVudENoaWxkJztcbiAgY29uc3Qgbm9kZSA9IHVud3JhcEZvcndhcmRSZWYoYXJnc1swXSwgcmVmbGVjdG9yKTtcbiAgY29uc3QgYXJnID0gZXZhbHVhdG9yLmV2YWx1YXRlKG5vZGUpO1xuXG4gIC8qKiBXaGV0aGVyIG9yIG5vdCB0aGlzIHF1ZXJ5IHNob3VsZCBjb2xsZWN0IG9ubHkgc3RhdGljIHJlc3VsdHMgKHNlZSB2aWV3L2FwaS50cykgICovXG4gIGxldCBpc1N0YXRpYzogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8vIEV4dHJhY3QgdGhlIHByZWRpY2F0ZVxuICBsZXQgcHJlZGljYXRlOiBFeHByZXNzaW9ufHN0cmluZ1tdfG51bGwgPSBudWxsO1xuICBpZiAoYXJnIGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgcHJlZGljYXRlID0gbmV3IFdyYXBwZWROb2RlRXhwcihub2RlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgYXJnID09PSAnc3RyaW5nJykge1xuICAgIHByZWRpY2F0ZSA9IFthcmddO1xuICB9IGVsc2UgaWYgKGlzU3RyaW5nQXJyYXlPckRpZShhcmcsICdAJyArIG5hbWUpKSB7XG4gICAgcHJlZGljYXRlID0gYXJnO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBub2RlLCBgQCR7bmFtZX0gcHJlZGljYXRlIGNhbm5vdCBiZSBpbnRlcnByZXRlZGApO1xuICB9XG5cbiAgLy8gRXh0cmFjdCB0aGUgcmVhZCBhbmQgZGVzY2VuZGFudHMgb3B0aW9ucy5cbiAgbGV0IHJlYWQ6IEV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gIC8vIFRoZSBkZWZhdWx0IHZhbHVlIGZvciBkZXNjZW5kYW50cyBpcyB0cnVlIGZvciBldmVyeSBkZWNvcmF0b3IgZXhjZXB0IEBDb250ZW50Q2hpbGRyZW4uXG4gIGxldCBkZXNjZW5kYW50czogYm9vbGVhbiA9IG5hbWUgIT09ICdDb250ZW50Q2hpbGRyZW4nO1xuICBpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICBjb25zdCBvcHRpb25zRXhwciA9IHVud3JhcEV4cHJlc3Npb24oYXJnc1sxXSk7XG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG9wdGlvbnNFeHByKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBAJHtuYW1lfSBvcHRpb25zIG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWxgKTtcbiAgICB9XG4gICAgY29uc3Qgb3B0aW9ucyA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG9wdGlvbnNFeHByKTtcbiAgICBpZiAob3B0aW9ucy5oYXMoJ3JlYWQnKSkge1xuICAgICAgcmVhZCA9IG5ldyBXcmFwcGVkTm9kZUV4cHIob3B0aW9ucy5nZXQoJ3JlYWQnKSAhKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5oYXMoJ2Rlc2NlbmRhbnRzJykpIHtcbiAgICAgIGNvbnN0IGRlc2NlbmRhbnRzVmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGUob3B0aW9ucy5nZXQoJ2Rlc2NlbmRhbnRzJykgISk7XG4gICAgICBpZiAodHlwZW9mIGRlc2NlbmRhbnRzVmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEAke25hbWV9IG9wdGlvbnMuZGVzY2VuZGFudHMgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIGRlc2NlbmRhbnRzID0gZGVzY2VuZGFudHNWYWx1ZTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5oYXMoJ3N0YXRpYycpKSB7XG4gICAgICBjb25zdCBzdGF0aWNWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShvcHRpb25zLmdldCgnc3RhdGljJykgISk7XG4gICAgICBpZiAodHlwZW9mIHN0YXRpY1ZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBub2RlLCBgQCR7bmFtZX0gb3B0aW9ucy5zdGF0aWMgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIGlzU3RhdGljID0gc3RhdGljVmFsdWU7XG4gICAgfVxuXG4gIH0gZWxzZSBpZiAoYXJncy5sZW5ndGggPiAyKSB7XG4gICAgLy8gVG9vIG1hbnkgYXJndW1lbnRzLlxuICAgIHRocm93IG5ldyBFcnJvcihgQCR7bmFtZX0gaGFzIHRvbyBtYW55IGFyZ3VtZW50c2ApO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwcm9wZXJ0eU5hbWUsXG4gICAgcHJlZGljYXRlLFxuICAgIGZpcnN0LFxuICAgIGRlc2NlbmRhbnRzLFxuICAgIHJlYWQsXG4gICAgc3RhdGljOiBpc1N0YXRpYyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RRdWVyaWVzRnJvbURlY29yYXRvcihcbiAgICBxdWVyeURhdGE6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBpc0NvcmU6IGJvb2xlYW4pOiB7XG4gIGNvbnRlbnQ6IFIzUXVlcnlNZXRhZGF0YVtdLFxuICB2aWV3OiBSM1F1ZXJ5TWV0YWRhdGFbXSxcbn0ge1xuICBjb25zdCBjb250ZW50OiBSM1F1ZXJ5TWV0YWRhdGFbXSA9IFtdLCB2aWV3OiBSM1F1ZXJ5TWV0YWRhdGFbXSA9IFtdO1xuICBjb25zdCBleHByID0gdW53cmFwRXhwcmVzc2lvbihxdWVyeURhdGEpO1xuICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocXVlcnlEYXRhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgcXVlcmllcyBtZXRhZGF0YSBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsYCk7XG4gIH1cbiAgcmVmbGVjdE9iamVjdExpdGVyYWwocXVlcnlEYXRhKS5mb3JFYWNoKChxdWVyeUV4cHIsIHByb3BlcnR5TmFtZSkgPT4ge1xuICAgIHF1ZXJ5RXhwciA9IHVud3JhcEV4cHJlc3Npb24ocXVlcnlFeHByKTtcbiAgICBpZiAoIXRzLmlzTmV3RXhwcmVzc2lvbihxdWVyeUV4cHIpIHx8ICF0cy5pc0lkZW50aWZpZXIocXVlcnlFeHByLmV4cHJlc3Npb24pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHF1ZXJ5IG1ldGFkYXRhIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgYSBxdWVyeSB0eXBlYCk7XG4gICAgfVxuICAgIGNvbnN0IHR5cGUgPSByZWZsZWN0b3IuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHF1ZXJ5RXhwci5leHByZXNzaW9uKTtcbiAgICBpZiAodHlwZSA9PT0gbnVsbCB8fCAoIWlzQ29yZSAmJiB0eXBlLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykgfHxcbiAgICAgICAgIVFVRVJZX1RZUEVTLmhhcyh0eXBlLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHF1ZXJ5IG1ldGFkYXRhIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgYSBxdWVyeSB0eXBlYCk7XG4gICAgfVxuXG4gICAgY29uc3QgcXVlcnkgPSBleHRyYWN0UXVlcnlNZXRhZGF0YShcbiAgICAgICAgcXVlcnlFeHByLCB0eXBlLm5hbWUsIHF1ZXJ5RXhwci5hcmd1bWVudHMgfHwgW10sIHByb3BlcnR5TmFtZSwgcmVmbGVjdG9yLCBldmFsdWF0b3IpO1xuICAgIGlmICh0eXBlLm5hbWUuc3RhcnRzV2l0aCgnQ29udGVudCcpKSB7XG4gICAgICBjb250ZW50LnB1c2gocXVlcnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2aWV3LnB1c2gocXVlcnkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiB7Y29udGVudCwgdmlld307XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nQXJyYXlPckRpZSh2YWx1ZTogYW55LCBuYW1lOiBzdHJpbmcpOiB2YWx1ZSBpcyBzdHJpbmdbXSB7XG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZVtpXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJlc29sdmUgJHtuYW1lfVske2l9XSB0byBhIHN0cmluZ2ApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRmllbGRBcnJheVZhbHVlKFxuICAgIGRpcmVjdGl2ZTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGZpZWxkOiBzdHJpbmcsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IG51bGx8XG4gICAgc3RyaW5nW10ge1xuICBpZiAoIWRpcmVjdGl2ZS5oYXMoZmllbGQpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBSZXNvbHZlIHRoZSBmaWVsZCBvZiBpbnRlcmVzdCBmcm9tIHRoZSBkaXJlY3RpdmUgbWV0YWRhdGEgdG8gYSBzdHJpbmdbXS5cbiAgY29uc3QgdmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGlyZWN0aXZlLmdldChmaWVsZCkgISk7XG4gIGlmICghaXNTdHJpbmdBcnJheU9yRGllKHZhbHVlLCBmaWVsZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byByZXNvbHZlIEBEaXJlY3RpdmUuJHtmaWVsZH1gKTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBJbnRlcnByZXQgcHJvcGVydHkgbWFwcGluZyBmaWVsZHMgb24gdGhlIGRlY29yYXRvciAoZS5nLiBpbnB1dHMgb3Igb3V0cHV0cykgYW5kIHJldHVybiB0aGVcbiAqIGNvcnJlY3RseSBzaGFwZWQgbWV0YWRhdGEgb2JqZWN0LlxuICovXG5mdW5jdGlvbiBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoXG4gICAgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZyxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiB7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3QgbWV0YVZhbHVlcyA9IHBhcnNlRmllbGRBcnJheVZhbHVlKGRpcmVjdGl2ZSwgZmllbGQsIGV2YWx1YXRvcik7XG4gIGlmICghbWV0YVZhbHVlcykge1xuICAgIHJldHVybiBFTVBUWV9PQkpFQ1Q7XG4gIH1cblxuICByZXR1cm4gbWV0YVZhbHVlcy5yZWR1Y2UoXG4gICAgICAocmVzdWx0cywgdmFsdWUpID0+IHtcbiAgICAgICAgLy8gRWl0aGVyIHRoZSB2YWx1ZSBpcyAnZmllbGQnIG9yICdmaWVsZDogcHJvcGVydHknLiBJbiB0aGUgZmlyc3QgY2FzZSwgYHByb3BlcnR5YCB3aWxsXG4gICAgICAgIC8vIGJlIHVuZGVmaW5lZCwgaW4gd2hpY2ggY2FzZSB0aGUgZmllbGQgbmFtZSBzaG91bGQgYWxzbyBiZSB1c2VkIGFzIHRoZSBwcm9wZXJ0eSBuYW1lLlxuICAgICAgICBjb25zdCBbZmllbGQsIHByb3BlcnR5XSA9IHZhbHVlLnNwbGl0KCc6JywgMikubWFwKHN0ciA9PiBzdHIudHJpbSgpKTtcbiAgICAgICAgcmVzdWx0c1tmaWVsZF0gPSBwcm9wZXJ0eSB8fCBmaWVsZDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9LFxuICAgICAge30gYXN7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9KTtcbn1cblxuLyoqXG4gKiBQYXJzZSBwcm9wZXJ0eSBkZWNvcmF0b3JzIChlLmcuIGBJbnB1dGAgb3IgYE91dHB1dGApIGFuZCByZXR1cm4gdGhlIGNvcnJlY3RseSBzaGFwZWQgbWV0YWRhdGFcbiAqIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgZmllbGRzOiB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBtYXBWYWx1ZVJlc29sdmVyOiAocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZykgPT5cbiAgICAgICAgc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXSk6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZyB8IFtzdHJpbmcsIHN0cmluZ119IHtcbiAgcmV0dXJuIGZpZWxkcy5yZWR1Y2UoXG4gICAgICAocmVzdWx0cywgZmllbGQpID0+IHtcbiAgICAgICAgY29uc3QgZmllbGROYW1lID0gZmllbGQubWVtYmVyLm5hbWU7XG4gICAgICAgIGZpZWxkLmRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgICAgIC8vIFRoZSBkZWNvcmF0b3IgZWl0aGVyIGRvZXNuJ3QgaGF2ZSBhbiBhcmd1bWVudCAoQElucHV0KCkpIGluIHdoaWNoIGNhc2UgdGhlIHByb3BlcnR5XG4gICAgICAgICAgLy8gbmFtZSBpcyB1c2VkLCBvciBpdCBoYXMgb25lIGFyZ3VtZW50IChAT3V0cHV0KCduYW1lZCcpKS5cbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdHNbZmllbGROYW1lXSA9IGZpZWxkTmFtZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgcHJvcGVydHkgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCByZXNvbHZlIHRvIGEgc3RyaW5nYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHRzW2ZpZWxkTmFtZV0gPSBtYXBWYWx1ZVJlc29sdmVyKHByb3BlcnR5LCBmaWVsZE5hbWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUb28gbWFueSBhcmd1bWVudHMuXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYERlY29yYXRvciBtdXN0IGhhdmUgMCBvciAxIGFyZ3VtZW50cywgZ290ICR7ZGVjb3JhdG9yLmFyZ3MubGVuZ3RofSBhcmd1bWVudChzKWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfSxcbiAgICAgIHt9IGFze1tmaWVsZDogc3RyaW5nXTogc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXX0pO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlSW5wdXQocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZyk6IFtzdHJpbmcsIHN0cmluZ10ge1xuICByZXR1cm4gW3B1YmxpY05hbWUsIGludGVybmFsTmFtZV07XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVPdXRwdXQocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZykge1xuICByZXR1cm4gcHVibGljTmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgIGZpZWxkczoge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfVtdLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFIzUXVlcnlNZXRhZGF0YVtdIHtcbiAgcmV0dXJuIGZpZWxkcy5tYXAoKHttZW1iZXIsIGRlY29yYXRvcnN9KSA9PiB7XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZGVjb3JhdG9yc1swXTtcbiAgICBjb25zdCBub2RlID0gbWVtYmVyLm5vZGUgfHwgZGVjb3JhdG9yLm5vZGU7XG5cbiAgICAvLyBUaHJvdyBpbiBjYXNlIG9mIGBASW5wdXQoKSBAQ29udGVudENoaWxkKCdmb28nKSBmb286IGFueWAsIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gSXZ5XG4gICAgaWYgKG1lbWJlci5kZWNvcmF0b3JzICEuc29tZSh2ID0+IHYubmFtZSA9PT0gJ0lucHV0JykpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0NPTExJU0lPTiwgbm9kZSxcbiAgICAgICAgICAnQ2Fubm90IGNvbWJpbmUgQElucHV0IGRlY29yYXRvcnMgd2l0aCBxdWVyeSBkZWNvcmF0b3JzJyk7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQ09MTElTSU9OLCBub2RlLFxuICAgICAgICAgICdDYW5ub3QgaGF2ZSBtdWx0aXBsZSBxdWVyeSBkZWNvcmF0b3JzIG9uIHRoZSBzYW1lIGNsYXNzIG1lbWJlcicpO1xuICAgIH0gZWxzZSBpZiAoIWlzUHJvcGVydHlUeXBlTWVtYmVyKG1lbWJlcikpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX1VORVhQRUNURUQsIG5vZGUsXG4gICAgICAgICAgJ1F1ZXJ5IGRlY29yYXRvciBtdXN0IGdvIG9uIGEgcHJvcGVydHktdHlwZSBtZW1iZXInKTtcbiAgICB9XG4gICAgcmV0dXJuIGV4dHJhY3RRdWVyeU1ldGFkYXRhKFxuICAgICAgICBkZWNvcmF0b3Iubm9kZSwgZGVjb3JhdG9yLm5hbWUsIGRlY29yYXRvci5hcmdzIHx8IFtdLCBtZW1iZXIubmFtZSwgcmVmbGVjdG9yLCBldmFsdWF0b3IpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaXNQcm9wZXJ0eVR5cGVNZW1iZXIobWVtYmVyOiBDbGFzc01lbWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5HZXR0ZXIgfHwgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5TZXR0ZXIgfHxcbiAgICAgIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG59XG5cbnR5cGUgU3RyaW5nTWFwPFQ+ID0ge1xuICBba2V5OiBzdHJpbmddOiBUO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RIb3N0QmluZGluZ3MoXG4gICAgbWVtYmVyczogQ2xhc3NNZW1iZXJbXSwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLCBjb3JlTW9kdWxlOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgbWV0YWRhdGE/OiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPik6IFBhcnNlZEhvc3RCaW5kaW5ncyB7XG4gIGxldCBob3N0TWV0YWRhdGE6IFN0cmluZ01hcDxzdHJpbmd8RXhwcmVzc2lvbj4gPSB7fTtcbiAgaWYgKG1ldGFkYXRhICYmIG1ldGFkYXRhLmhhcygnaG9zdCcpKSB7XG4gICAgY29uc3QgZXhwciA9IG1ldGFkYXRhLmdldCgnaG9zdCcpICE7XG4gICAgY29uc3QgaG9zdE1ldGFNYXAgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgaWYgKCEoaG9zdE1ldGFNYXAgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIGV4cHIsIGBEZWNvcmF0b3IgaG9zdCBtZXRhZGF0YSBtdXN0IGJlIGFuIG9iamVjdGApO1xuICAgIH1cbiAgICBob3N0TWV0YU1hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAvLyBSZXNvbHZlIEVudW0gcmVmZXJlbmNlcyB0byB0aGVpciBkZWNsYXJlZCB2YWx1ZS5cbiAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVudW1WYWx1ZSkge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlc29sdmVkO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYERlY29yYXRvciBob3N0IG1ldGFkYXRhIG11c3QgYmUgYSBzdHJpbmcgLT4gc3RyaW5nIG9iamVjdCwgYnV0IGZvdW5kIHVucGFyc2VhYmxlIGtleSAke2tleX1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJykge1xuICAgICAgICBob3N0TWV0YWRhdGFba2V5XSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgICBob3N0TWV0YWRhdGFba2V5XSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodmFsdWUubm9kZSBhcyB0cy5FeHByZXNzaW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBEZWNvcmF0b3IgaG9zdCBtZXRhZGF0YSBtdXN0IGJlIGEgc3RyaW5nIC0+IHN0cmluZyBvYmplY3QsIGJ1dCBmb3VuZCB1bnBhcnNlYWJsZSB2YWx1ZSAke3ZhbHVlfWApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgYmluZGluZ3MgPSBwYXJzZUhvc3RCaW5kaW5ncyhob3N0TWV0YWRhdGEpO1xuXG4gIC8vIFRPRE86IGNyZWF0ZSBhbmQgcHJvdmlkZSBwcm9wZXIgc291cmNlU3BhbiB0byBtYWtlIGVycm9yIG1lc3NhZ2UgbW9yZSBkZXNjcmlwdGl2ZSAoRlctOTk1KVxuICAvLyBGb3Igbm93LCBwYXNzIGFuIGluY29ycmVjdCAoZW1wdHkpIGJ1dCB2YWxpZCBzb3VyY2VTcGFuLlxuICBjb25zdCBlcnJvcnMgPSB2ZXJpZnlIb3N0QmluZGluZ3MoYmluZGluZ3MsIEVNUFRZX1NPVVJDRV9TUEFOKTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAvLyBUT0RPOiBwcm92aWRlIG1vcmUgZ3JhbnVsYXIgZGlhZ25vc3RpYyBhbmQgb3V0cHV0IHNwZWNpZmljIGhvc3QgZXhwcmVzc2lvbiB0aGF0IHRyaWdnZXJlZFxuICAgICAgICAvLyBhbiBlcnJvciBpbnN0ZWFkIG9mIHRoZSB3aG9sZSBob3N0IG9iamVjdFxuICAgICAgICBFcnJvckNvZGUuSE9TVF9CSU5ESU5HX1BBUlNFX0VSUk9SLCBtZXRhZGF0YSAhLmdldCgnaG9zdCcpICEsXG4gICAgICAgIGVycm9ycy5tYXAoKGVycm9yOiBQYXJzZUVycm9yKSA9PiBlcnJvci5tc2cpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVycywgJ0hvc3RCaW5kaW5nJywgY29yZU1vZHVsZSlcbiAgICAgIC5mb3JFYWNoKCh7bWVtYmVyLCBkZWNvcmF0b3JzfSkgPT4ge1xuICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgICAgICBsZXQgaG9zdFByb3BlcnR5TmFtZTogc3RyaW5nID0gbWVtYmVyLm5hbWU7XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBASG9zdEJpbmRpbmcoKSBjYW4gaGF2ZSBhdCBtb3N0IG9uZSBhcmd1bWVudGApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEBIb3N0QmluZGluZygpJ3MgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBob3N0UHJvcGVydHlOYW1lID0gcmVzb2x2ZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYmluZGluZ3MucHJvcGVydGllc1tob3N0UHJvcGVydHlOYW1lXSA9IG1lbWJlci5uYW1lO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVycywgJ0hvc3RMaXN0ZW5lcicsIGNvcmVNb2R1bGUpXG4gICAgICAuZm9yRWFjaCgoe21lbWJlciwgZGVjb3JhdG9yc30pID0+IHtcbiAgICAgICAgZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICAgICAgbGV0IGV2ZW50TmFtZTogc3RyaW5nID0gbWVtYmVyLm5hbWU7XG4gICAgICAgICAgbGV0IGFyZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5hcmdzWzJdLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0TGlzdGVuZXIoKSBjYW4gaGF2ZSBhdCBtb3N0IHR3byBhcmd1bWVudHNgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBkZWNvcmF0b3IuYXJnc1swXSxcbiAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyKCkncyBldmVudCBuYW1lIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXZlbnROYW1lID0gcmVzb2x2ZWQ7XG5cbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRBcmdzID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzFdKTtcbiAgICAgICAgICAgICAgaWYgKCFpc1N0cmluZ0FycmF5T3JEaWUocmVzb2x2ZWRBcmdzLCAnQEhvc3RMaXN0ZW5lci5hcmdzJykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZGVjb3JhdG9yLmFyZ3NbMV0sXG4gICAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyIHNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nIGFycmF5YCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXJncyA9IHJlc29sdmVkQXJncztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBiaW5kaW5ncy5saXN0ZW5lcnNbZXZlbnROYW1lXSA9IGAke21lbWJlci5uYW1lfSgke2FyZ3Muam9pbignLCcpfSlgO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICByZXR1cm4gYmluZGluZ3M7XG59XG5cbmNvbnN0IFFVRVJZX1RZUEVTID0gbmV3IFNldChbXG4gICdDb250ZW50Q2hpbGQnLFxuICAnQ29udGVudENoaWxkcmVuJyxcbiAgJ1ZpZXdDaGlsZCcsXG4gICdWaWV3Q2hpbGRyZW4nLFxuXSk7XG4iXX0=