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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/directive", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/scope/src/util", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/scope/src/util");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_OBJECT = {};
    var DirectiveDecoratorHandler = /** @class */ (function () {
        function DirectiveDecoratorHandler(reflector, evaluator, scopeRegistry, isCore) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.scopeRegistry = scopeRegistry;
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
            var directiveResult = extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.isCore);
            var analysis = directiveResult && directiveResult.metadata;
            // If the directive has a selector, it should be registered with the `SelectorScopeRegistry` so
            // when this directive appears in an `@NgModule` scope, its selector can be determined.
            if (analysis && analysis.selector !== null) {
                var ref = new imports_1.Reference(node);
                this.scopeRegistry.registerDirective(tslib_1.__assign({ ref: ref, name: node.name.text, selector: analysis.selector, exportAs: analysis.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.queries.map(function (query) { return query.propertyName; }), isComponent: false }, util_1.extractDirectiveGuards(node, this.reflector)));
            }
            if (analysis === undefined) {
                return {};
            }
            return {
                analysis: {
                    meta: analysis,
                    metadataStmt: metadata_1.generateSetClassMetadataCall(node, this.reflector, this.isCore),
                }
            };
        };
        DirectiveDecoratorHandler.prototype.compile = function (node, analysis, pool) {
            var res = compiler_1.compileDirectiveFromMetadata(analysis.meta, pool, compiler_1.makeBindingParser());
            var statements = res.statements;
            if (analysis.metadataStmt !== null) {
                statements.push(analysis.metadataStmt);
            }
            return {
                name: 'ngDirectiveDef',
                initializer: res.expression,
                statements: statements,
                type: res.type,
            };
        };
        return DirectiveDecoratorHandler;
    }());
    exports.DirectiveDecoratorHandler = DirectiveDecoratorHandler;
    /**
     * Helper function to extract metadata from a `Directive` or `Component`.
     */
    function extractDirectiveMetadata(clazz, decorator, reflector, evaluator, isCore, defaultSelector) {
        if (defaultSelector === void 0) { defaultSelector = null; }
        if (decorator.args === null || decorator.args.length !== 1) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.node, "Incorrect number of arguments to @" + decorator.name + " decorator");
        }
        var meta = util_2.unwrapExpression(decorator.args[0]);
        if (!ts.isObjectLiteralExpression(meta)) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, "@" + decorator.name + " argument must be literal.");
        }
        var directive = reflection_1.reflectObjectLiteral(meta);
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
        if (directive.has('queries')) {
            var queriesFromDecorator = extractQueriesFromDecorator(directive.get('queries'), reflector, evaluator, isCore);
            queries.push.apply(queries, tslib_1.__spread(queriesFromDecorator.content));
        }
        // Parse the selector.
        var selector = defaultSelector;
        if (directive.has('selector')) {
            var expr = directive.get('selector');
            var resolved = evaluator.evaluate(expr);
            if (typeof resolved !== 'string') {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "selector must be a string");
            }
            selector = resolved;
        }
        if (!selector) {
            throw new Error("Directive " + clazz.name.text + " has no selector, please add it!");
        }
        var host = extractHostBindings(directive, decoratedElements, evaluator, coreModule);
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
            deps: util_2.getValidConstructorDependencies(clazz, reflector, isCore), host: host,
            lifecycle: {
                usesOnChanges: usesOnChanges,
            },
            inputs: tslib_1.__assign({}, inputsFromMeta, inputsFromFields),
            outputs: tslib_1.__assign({}, outputsFromMeta, outputsFromFields), queries: queries, selector: selector,
            type: new compiler_1.WrappedNodeExpr(clazz.name),
            typeArgumentCount: reflector.getGenericArityOfClass(clazz) || 0,
            typeSourceSpan: null, usesInheritance: usesInheritance, exportAs: exportAs, providers: providers
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
            // Throw in case of `@Input() @ContentChild('foo') foo: any`, which is not supported in Ivy
            if (member.decorators.some(function (v) { return v.name === 'Input'; })) {
                throw new Error("Cannot combine @Input decorators with query decorators");
            }
            if (decorators.length !== 1) {
                throw new Error("Cannot have multiple query decorators on the same class member");
            }
            else if (!isPropertyTypeMember(member)) {
                throw new Error("Query decorator must go on a property-type member");
            }
            var decorator = decorators[0];
            return extractQueryMetadata(decorator.node, decorator.name, decorator.args || [], member.name, reflector, evaluator);
        });
    }
    exports.queriesFromFields = queriesFromFields;
    function isPropertyTypeMember(member) {
        return member.kind === reflection_1.ClassMemberKind.Getter || member.kind === reflection_1.ClassMemberKind.Setter ||
            member.kind === reflection_1.ClassMemberKind.Property;
    }
    function extractHostBindings(metadata, members, evaluator, coreModule) {
        var hostMetadata = {};
        if (metadata.has('host')) {
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
        var errors = compiler_1.verifyHostBindings(bindings, /* sourceSpan */ null);
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
    var QUERY_TYPES = new Set([
        'ContentChild',
        'ContentChildren',
        'ViewChild',
        'ViewChildren',
    ]);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFxUDtJQUNyUCwrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUF3QztJQUN4Qyx1RkFBa0Y7SUFDbEYseUVBQTZJO0lBRTdJLHVFQUE0RDtJQUM1RCx1RUFBaUg7SUFFakgscUZBQXdEO0lBQ3hELDZFQUFpSDtJQUVqSCxJQUFNLFlBQVksR0FBNEIsRUFBRSxDQUFDO0lBTWpEO1FBRUUsbUNBQ1ksU0FBeUIsRUFBVSxTQUEyQixFQUM5RCxhQUF1QyxFQUFVLE1BQWU7WUFEaEUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUM5RCxrQkFBYSxHQUFiLGFBQWEsQ0FBMEI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBRW5FLGVBQVUsR0FBRyw2QkFBaUIsQ0FBQyxPQUFPLENBQUM7UUFGK0IsQ0FBQztRQUloRiwwQ0FBTSxHQUFOLFVBQU8sSUFBb0IsRUFBRSxVQUE0QjtZQUN2RCxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxTQUFTLEdBQUcsMkJBQW9CLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0UsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO2dCQUMzQixPQUFPO29CQUNMLE9BQU8sRUFBRSxTQUFTLENBQUMsSUFBSTtvQkFDdkIsUUFBUSxFQUFFLFNBQVM7aUJBQ3BCLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxPQUFPLFNBQVMsQ0FBQzthQUNsQjtRQUNILENBQUM7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a0IsQ0FBQyxZQUFZLEVBQUUsb0JBQW9CLENBQUMsRUFBRTs0QkFDM0QsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ2pELHNEQUFzRCxDQUFDLENBQUM7eUJBQzdEO3dCQUNELElBQUksR0FBRyxZQUFZLENBQUM7cUJBQ3JCO2lCQUNGO2dCQUVELFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQU0sTUFBTSxDQUFDLElBQUksU0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFHLENBQUM7WUFDdEUsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNQLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUMxQixjQUFjO1FBQ2QsaUJBQWlCO1FBQ2pCLFdBQVc7UUFDWCxjQUFjO0tBQ2YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgUGFyc2VFcnJvciwgUGFyc2VkSG9zdEJpbmRpbmdzLCBSM0RpcmVjdGl2ZU1ldGFkYXRhLCBSM1F1ZXJ5TWV0YWRhdGEsIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VIb3N0QmluZGluZ3MsIHZlcmlmeUhvc3RCaW5kaW5nc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEeW5hbWljVmFsdWUsIEVudW1WYWx1ZSwgUGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc01lbWJlciwgQ2xhc3NNZW1iZXJLaW5kLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yLCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vc2NvcGUvc3JjL2xvY2FsJztcbmltcG9ydCB7ZXh0cmFjdERpcmVjdGl2ZUd1YXJkc30gZnJvbSAnLi4vLi4vc2NvcGUvc3JjL3V0aWwnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZX0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7ZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIHVud3JhcEV4cHJlc3Npb24sIHVud3JhcEZvcndhcmRSZWZ9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IEVNUFRZX09CSkVDVDoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVIYW5kbGVyRGF0YSB7XG4gIG1ldGE6IFIzRGlyZWN0aXZlTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG59XG5leHBvcnQgY2xhc3MgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEaXJlY3RpdmVIYW5kbGVyRGF0YSwgRGVjb3JhdG9yPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbikge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcblxuICBkZXRlY3Qobm9kZTogdHMuRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ0RpcmVjdGl2ZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8RGlyZWN0aXZlSGFuZGxlckRhdGE+IHtcbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPVxuICAgICAgICBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEobm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuaXNDb3JlKTtcbiAgICBjb25zdCBhbmFseXNpcyA9IGRpcmVjdGl2ZVJlc3VsdCAmJiBkaXJlY3RpdmVSZXN1bHQubWV0YWRhdGE7XG5cbiAgICAvLyBJZiB0aGUgZGlyZWN0aXZlIGhhcyBhIHNlbGVjdG9yLCBpdCBzaG91bGQgYmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5YCBzb1xuICAgIC8vIHdoZW4gdGhpcyBkaXJlY3RpdmUgYXBwZWFycyBpbiBhbiBgQE5nTW9kdWxlYCBzY29wZSwgaXRzIHNlbGVjdG9yIGNhbiBiZSBkZXRlcm1pbmVkLlxuICAgIGlmIChhbmFseXNpcyAmJiBhbmFseXNpcy5zZWxlY3RvciAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShub2RlKTtcbiAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZSh7XG4gICAgICAgIHJlZixcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lICEudGV4dCxcbiAgICAgICAgc2VsZWN0b3I6IGFuYWx5c2lzLnNlbGVjdG9yLFxuICAgICAgICBleHBvcnRBczogYW5hbHlzaXMuZXhwb3J0QXMsXG4gICAgICAgIGlucHV0czogYW5hbHlzaXMuaW5wdXRzLFxuICAgICAgICBvdXRwdXRzOiBhbmFseXNpcy5vdXRwdXRzLFxuICAgICAgICBxdWVyaWVzOiBhbmFseXNpcy5xdWVyaWVzLm1hcChxdWVyeSA9PiBxdWVyeS5wcm9wZXJ0eU5hbWUpLFxuICAgICAgICBpc0NvbXBvbmVudDogZmFsc2UsIC4uLmV4dHJhY3REaXJlY3RpdmVHdWFyZHMobm9kZSwgdGhpcy5yZWZsZWN0b3IpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGFuYWx5c2lzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgbWV0YTogYW5hbHlzaXMsXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUpLFxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBjb21waWxlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBEaXJlY3RpdmVIYW5kbGVyRGF0YSwgcG9vbDogQ29uc3RhbnRQb29sKTpcbiAgICAgIENvbXBpbGVSZXN1bHQge1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVEaXJlY3RpdmVGcm9tTWV0YWRhdGEoYW5hbHlzaXMubWV0YSwgcG9vbCwgbWFrZUJpbmRpbmdQYXJzZXIoKSk7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IHJlcy5zdGF0ZW1lbnRzO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIHN0YXRlbWVudHMucHVzaChhbmFseXNpcy5tZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ25nRGlyZWN0aXZlRGVmJyxcbiAgICAgIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbixcbiAgICAgIHN0YXRlbWVudHM6IHN0YXRlbWVudHMsXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGV4dHJhY3QgbWV0YWRhdGEgZnJvbSBhIGBEaXJlY3RpdmVgIG9yIGBDb21wb25lbnRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhKFxuICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvciwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsIGlzQ29yZTogYm9vbGVhbiwgZGVmYXVsdFNlbGVjdG9yOiBzdHJpbmcgfCBudWxsID0gbnVsbCk6IHtcbiAgZGVjb3JhdG9yOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPixcbiAgbWV0YWRhdGE6IFIzRGlyZWN0aXZlTWV0YWRhdGEsXG4gIGRlY29yYXRlZEVsZW1lbnRzOiBDbGFzc01lbWJlcltdLFxufXx1bmRlZmluZWQge1xuICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEAke2RlY29yYXRvci5uYW1lfSBkZWNvcmF0b3JgKTtcbiAgfVxuICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG4gIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsIGBAJHtkZWNvcmF0b3IubmFtZX0gYXJndW1lbnQgbXVzdCBiZSBsaXRlcmFsLmApO1xuICB9XG4gIGNvbnN0IGRpcmVjdGl2ZSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuXG4gIGlmIChkaXJlY3RpdmUuaGFzKCdqaXQnKSkge1xuICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBtZW1iZXJzID0gcmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKGNsYXp6KTtcblxuICAvLyBQcmVjb21wdXRlIGEgbGlzdCBvZiB0cy5DbGFzc0VsZW1lbnRzIHRoYXQgaGF2ZSBkZWNvcmF0b3JzLiBUaGlzIGluY2x1ZGVzIHRoaW5ncyBsaWtlIEBJbnB1dCxcbiAgLy8gQE91dHB1dCwgQEhvc3RCaW5kaW5nLCBldGMuXG4gIGNvbnN0IGRlY29yYXRlZEVsZW1lbnRzID1cbiAgICAgIG1lbWJlcnMuZmlsdGVyKG1lbWJlciA9PiAhbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5kZWNvcmF0b3JzICE9PSBudWxsKTtcblxuICBjb25zdCBjb3JlTW9kdWxlID0gaXNDb3JlID8gdW5kZWZpbmVkIDogJ0Bhbmd1bGFyL2NvcmUnO1xuXG4gIC8vIENvbnN0cnVjdCB0aGUgbWFwIG9mIGlucHV0cyBib3RoIGZyb20gdGhlIEBEaXJlY3RpdmUvQENvbXBvbmVudFxuICAvLyBkZWNvcmF0b3IsIGFuZCB0aGUgZGVjb3JhdGVkXG4gIC8vIGZpZWxkcy5cbiAgY29uc3QgaW5wdXRzRnJvbU1ldGEgPSBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoZGlyZWN0aXZlLCAnaW5wdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3QgaW5wdXRzRnJvbUZpZWxkcyA9IHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0lucHV0JywgY29yZU1vZHVsZSksIGV2YWx1YXRvcixcbiAgICAgIHJlc29sdmVJbnB1dCk7XG5cbiAgLy8gQW5kIG91dHB1dHMuXG4gIGNvbnN0IG91dHB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdvdXRwdXRzJywgZXZhbHVhdG9yKTtcbiAgY29uc3Qgb3V0cHV0c0Zyb21GaWVsZHMgPSBwYXJzZURlY29yYXRlZEZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdPdXRwdXQnLCBjb3JlTW9kdWxlKSwgZXZhbHVhdG9yLFxuICAgICAgcmVzb2x2ZU91dHB1dCkgYXN7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9O1xuICAvLyBDb25zdHJ1Y3QgdGhlIGxpc3Qgb2YgcXVlcmllcy5cbiAgY29uc3QgY29udGVudENoaWxkRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0NvbnRlbnRDaGlsZCcsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuICBjb25zdCBjb250ZW50Q2hpbGRyZW5Gcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnQ29udGVudENoaWxkcmVuJywgY29yZU1vZHVsZSksIHJlZmxlY3RvcixcbiAgICAgIGV2YWx1YXRvcik7XG5cbiAgY29uc3QgcXVlcmllcyA9IFsuLi5jb250ZW50Q2hpbGRGcm9tRmllbGRzLCAuLi5jb250ZW50Q2hpbGRyZW5Gcm9tRmllbGRzXTtcblxuICBpZiAoZGlyZWN0aXZlLmhhcygncXVlcmllcycpKSB7XG4gICAgY29uc3QgcXVlcmllc0Zyb21EZWNvcmF0b3IgPVxuICAgICAgICBleHRyYWN0UXVlcmllc0Zyb21EZWNvcmF0b3IoZGlyZWN0aXZlLmdldCgncXVlcmllcycpICEsIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBpc0NvcmUpO1xuICAgIHF1ZXJpZXMucHVzaCguLi5xdWVyaWVzRnJvbURlY29yYXRvci5jb250ZW50KTtcbiAgfVxuXG4gIC8vIFBhcnNlIHRoZSBzZWxlY3Rvci5cbiAgbGV0IHNlbGVjdG9yID0gZGVmYXVsdFNlbGVjdG9yO1xuICBpZiAoZGlyZWN0aXZlLmhhcygnc2VsZWN0b3InKSkge1xuICAgIGNvbnN0IGV4cHIgPSBkaXJlY3RpdmUuZ2V0KCdzZWxlY3RvcicpICE7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsIGBzZWxlY3RvciBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgfVxuICAgIHNlbGVjdG9yID0gcmVzb2x2ZWQ7XG4gIH1cbiAgaWYgKCFzZWxlY3Rvcikge1xuICAgIHRocm93IG5ldyBFcnJvcihgRGlyZWN0aXZlICR7Y2xhenoubmFtZSAhLnRleHR9IGhhcyBubyBzZWxlY3RvciwgcGxlYXNlIGFkZCBpdCFgKTtcbiAgfVxuXG4gIGNvbnN0IGhvc3QgPSBleHRyYWN0SG9zdEJpbmRpbmdzKGRpcmVjdGl2ZSwgZGVjb3JhdGVkRWxlbWVudHMsIGV2YWx1YXRvciwgY29yZU1vZHVsZSk7XG5cbiAgY29uc3QgcHJvdmlkZXJzOiBFeHByZXNzaW9ufG51bGwgPVxuICAgICAgZGlyZWN0aXZlLmhhcygncHJvdmlkZXJzJykgPyBuZXcgV3JhcHBlZE5vZGVFeHByKGRpcmVjdGl2ZS5nZXQoJ3Byb3ZpZGVycycpICEpIDogbnVsbDtcblxuICAvLyBEZXRlcm1pbmUgaWYgYG5nT25DaGFuZ2VzYCBpcyBhIGxpZmVjeWNsZSBob29rIGRlZmluZWQgb24gdGhlIGNvbXBvbmVudC5cbiAgY29uc3QgdXNlc09uQ2hhbmdlcyA9IG1lbWJlcnMuc29tZShcbiAgICAgIG1lbWJlciA9PiAhbWVtYmVyLmlzU3RhdGljICYmIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuTWV0aG9kICYmXG4gICAgICAgICAgbWVtYmVyLm5hbWUgPT09ICduZ09uQ2hhbmdlcycpO1xuXG4gIC8vIFBhcnNlIGV4cG9ydEFzLlxuICBsZXQgZXhwb3J0QXM6IHN0cmluZ1tdfG51bGwgPSBudWxsO1xuICBpZiAoZGlyZWN0aXZlLmhhcygnZXhwb3J0QXMnKSkge1xuICAgIGNvbnN0IGV4cHIgPSBkaXJlY3RpdmUuZ2V0KCdleHBvcnRBcycpICE7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsIGBleHBvcnRBcyBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgfVxuICAgIGV4cG9ydEFzID0gcmVzb2x2ZWQuc3BsaXQoJywnKS5tYXAocGFydCA9PiBwYXJ0LnRyaW0oKSk7XG4gIH1cblxuICAvLyBEZXRlY3QgaWYgdGhlIGNvbXBvbmVudCBpbmhlcml0cyBmcm9tIGFub3RoZXIgY2xhc3NcbiAgY29uc3QgdXNlc0luaGVyaXRhbmNlID0gcmVmbGVjdG9yLmhhc0Jhc2VDbGFzcyhjbGF6eik7XG4gIGNvbnN0IG1ldGFkYXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhID0ge1xuICAgIG5hbWU6IGNsYXp6Lm5hbWUgIS50ZXh0LFxuICAgIGRlcHM6IGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgaXNDb3JlKSwgaG9zdCxcbiAgICBsaWZlY3ljbGU6IHtcbiAgICAgICAgdXNlc09uQ2hhbmdlcyxcbiAgICB9LFxuICAgIGlucHV0czogey4uLmlucHV0c0Zyb21NZXRhLCAuLi5pbnB1dHNGcm9tRmllbGRzfSxcbiAgICBvdXRwdXRzOiB7Li4ub3V0cHV0c0Zyb21NZXRhLCAuLi5vdXRwdXRzRnJvbUZpZWxkc30sIHF1ZXJpZXMsIHNlbGVjdG9yLFxuICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSAhKSxcbiAgICB0eXBlQXJndW1lbnRDb3VudDogcmVmbGVjdG9yLmdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xhenopIHx8IDAsXG4gICAgdHlwZVNvdXJjZVNwYW46IG51bGwgISwgdXNlc0luaGVyaXRhbmNlLCBleHBvcnRBcywgcHJvdmlkZXJzXG4gIH07XG4gIHJldHVybiB7ZGVjb3JhdGVkRWxlbWVudHMsIGRlY29yYXRvcjogZGlyZWN0aXZlLCBtZXRhZGF0YX07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0UXVlcnlNZXRhZGF0YShcbiAgICBleHByTm9kZTogdHMuTm9kZSwgbmFtZTogc3RyaW5nLCBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+LCBwcm9wZXJ0eU5hbWU6IHN0cmluZyxcbiAgICByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBSM1F1ZXJ5TWV0YWRhdGEge1xuICBpZiAoYXJncy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGV4cHJOb2RlLCBgQCR7bmFtZX0gbXVzdCBoYXZlIGFyZ3VtZW50c2ApO1xuICB9XG4gIGNvbnN0IGZpcnN0ID0gbmFtZSA9PT0gJ1ZpZXdDaGlsZCcgfHwgbmFtZSA9PT0gJ0NvbnRlbnRDaGlsZCc7XG4gIGNvbnN0IG5vZGUgPSB1bndyYXBGb3J3YXJkUmVmKGFyZ3NbMF0sIHJlZmxlY3Rvcik7XG4gIGNvbnN0IGFyZyA9IGV2YWx1YXRvci5ldmFsdWF0ZShub2RlKTtcblxuICAvKiogV2hldGhlciBvciBub3QgdGhpcyBxdWVyeSBzaG91bGQgY29sbGVjdCBvbmx5IHN0YXRpYyByZXN1bHRzIChzZWUgdmlldy9hcGkudHMpICAqL1xuICBsZXQgaXNTdGF0aWM6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAvLyBFeHRyYWN0IHRoZSBwcmVkaWNhdGVcbiAgbGV0IHByZWRpY2F0ZTogRXhwcmVzc2lvbnxzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgaWYgKGFyZyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgIHByZWRpY2F0ZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICBwcmVkaWNhdGUgPSBbYXJnXTtcbiAgfSBlbHNlIGlmIChpc1N0cmluZ0FycmF5T3JEaWUoYXJnLCAnQCcgKyBuYW1lKSkge1xuICAgIHByZWRpY2F0ZSA9IGFyZyBhcyBzdHJpbmdbXTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgbm9kZSwgYEAke25hbWV9IHByZWRpY2F0ZSBjYW5ub3QgYmUgaW50ZXJwcmV0ZWRgKTtcbiAgfVxuXG4gIC8vIEV4dHJhY3QgdGhlIHJlYWQgYW5kIGRlc2NlbmRhbnRzIG9wdGlvbnMuXG4gIGxldCByZWFkOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAvLyBUaGUgZGVmYXVsdCB2YWx1ZSBmb3IgZGVzY2VuZGFudHMgaXMgdHJ1ZSBmb3IgZXZlcnkgZGVjb3JhdG9yIGV4Y2VwdCBAQ29udGVudENoaWxkcmVuLlxuICBsZXQgZGVzY2VuZGFudHM6IGJvb2xlYW4gPSBuYW1lICE9PSAnQ29udGVudENoaWxkcmVuJztcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAyKSB7XG4gICAgY29uc3Qgb3B0aW9uc0V4cHIgPSB1bndyYXBFeHByZXNzaW9uKGFyZ3NbMV0pO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihvcHRpb25zRXhwcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQCR7bmFtZX0gb3B0aW9ucyBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsYCk7XG4gICAgfVxuICAgIGNvbnN0IG9wdGlvbnMgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChvcHRpb25zRXhwcik7XG4gICAgaWYgKG9wdGlvbnMuaGFzKCdyZWFkJykpIHtcbiAgICAgIHJlYWQgPSBuZXcgV3JhcHBlZE5vZGVFeHByKG9wdGlvbnMuZ2V0KCdyZWFkJykgISk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuaGFzKCdkZXNjZW5kYW50cycpKSB7XG4gICAgICBjb25zdCBkZXNjZW5kYW50c1ZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlKG9wdGlvbnMuZ2V0KCdkZXNjZW5kYW50cycpICEpO1xuICAgICAgaWYgKHR5cGVvZiBkZXNjZW5kYW50c1ZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBAJHtuYW1lfSBvcHRpb25zLmRlc2NlbmRhbnRzIG11c3QgYmUgYSBib29sZWFuYCk7XG4gICAgICB9XG4gICAgICBkZXNjZW5kYW50cyA9IGRlc2NlbmRhbnRzVmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuaGFzKCdzdGF0aWMnKSkge1xuICAgICAgY29uc3Qgc3RhdGljVmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGUob3B0aW9ucy5nZXQoJ3N0YXRpYycpICEpO1xuICAgICAgaWYgKHR5cGVvZiBzdGF0aWNWYWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgbm9kZSwgYEAke25hbWV9IG9wdGlvbnMuc3RhdGljIG11c3QgYmUgYSBib29sZWFuYCk7XG4gICAgICB9XG4gICAgICBpc1N0YXRpYyA9IHN0YXRpY1ZhbHVlO1xuICAgIH1cblxuICB9IGVsc2UgaWYgKGFyZ3MubGVuZ3RoID4gMikge1xuICAgIC8vIFRvbyBtYW55IGFyZ3VtZW50cy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYEAke25hbWV9IGhhcyB0b28gbWFueSBhcmd1bWVudHNgKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcHJvcGVydHlOYW1lLFxuICAgIHByZWRpY2F0ZSxcbiAgICBmaXJzdCxcbiAgICBkZXNjZW5kYW50cyxcbiAgICByZWFkLFxuICAgIHN0YXRpYzogaXNTdGF0aWMsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0UXVlcmllc0Zyb21EZWNvcmF0b3IoXG4gICAgcXVlcnlEYXRhOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgaXNDb3JlOiBib29sZWFuKToge1xuICBjb250ZW50OiBSM1F1ZXJ5TWV0YWRhdGFbXSxcbiAgdmlldzogUjNRdWVyeU1ldGFkYXRhW10sXG59IHtcbiAgY29uc3QgY29udGVudDogUjNRdWVyeU1ldGFkYXRhW10gPSBbXSwgdmlldzogUjNRdWVyeU1ldGFkYXRhW10gPSBbXTtcbiAgY29uc3QgZXhwciA9IHVud3JhcEV4cHJlc3Npb24ocXVlcnlEYXRhKTtcbiAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKHF1ZXJ5RGF0YSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYHF1ZXJpZXMgbWV0YWRhdGEgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbGApO1xuICB9XG4gIHJlZmxlY3RPYmplY3RMaXRlcmFsKHF1ZXJ5RGF0YSkuZm9yRWFjaCgocXVlcnlFeHByLCBwcm9wZXJ0eU5hbWUpID0+IHtcbiAgICBxdWVyeUV4cHIgPSB1bndyYXBFeHByZXNzaW9uKHF1ZXJ5RXhwcik7XG4gICAgaWYgKCF0cy5pc05ld0V4cHJlc3Npb24ocXVlcnlFeHByKSB8fCAhdHMuaXNJZGVudGlmaWVyKHF1ZXJ5RXhwci5leHByZXNzaW9uKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBxdWVyeSBtZXRhZGF0YSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIGEgcXVlcnkgdHlwZWApO1xuICAgIH1cbiAgICBjb25zdCB0eXBlID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihxdWVyeUV4cHIuZXhwcmVzc2lvbik7XG4gICAgaWYgKHR5cGUgPT09IG51bGwgfHwgKCFpc0NvcmUgJiYgdHlwZS5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScpIHx8XG4gICAgICAgICFRVUVSWV9UWVBFUy5oYXModHlwZS5uYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBxdWVyeSBtZXRhZGF0YSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIGEgcXVlcnkgdHlwZWApO1xuICAgIH1cblxuICAgIGNvbnN0IHF1ZXJ5ID0gZXh0cmFjdFF1ZXJ5TWV0YWRhdGEoXG4gICAgICAgIHF1ZXJ5RXhwciwgdHlwZS5uYW1lLCBxdWVyeUV4cHIuYXJndW1lbnRzIHx8IFtdLCBwcm9wZXJ0eU5hbWUsIHJlZmxlY3RvciwgZXZhbHVhdG9yKTtcbiAgICBpZiAodHlwZS5uYW1lLnN0YXJ0c1dpdGgoJ0NvbnRlbnQnKSkge1xuICAgICAgY29udGVudC5wdXNoKHF1ZXJ5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmlldy5wdXNoKHF1ZXJ5KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4ge2NvbnRlbnQsIHZpZXd9O1xufVxuXG5mdW5jdGlvbiBpc1N0cmluZ0FycmF5T3JEaWUodmFsdWU6IGFueSwgbmFtZTogc3RyaW5nKTogdmFsdWUgaXMgc3RyaW5nW10ge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKykge1xuICAgIGlmICh0eXBlb2YgdmFsdWVbaV0gIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byByZXNvbHZlICR7bmFtZX1bJHtpfV0gdG8gYSBzdHJpbmdgKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUZpZWxkQXJyYXlWYWx1ZShcbiAgICBkaXJlY3RpdmU6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBmaWVsZDogc3RyaW5nLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBudWxsfFxuICAgIHN0cmluZ1tdIHtcbiAgaWYgKCFkaXJlY3RpdmUuaGFzKGZpZWxkKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gUmVzb2x2ZSB0aGUgZmllbGQgb2YgaW50ZXJlc3QgZnJvbSB0aGUgZGlyZWN0aXZlIG1ldGFkYXRhIHRvIGEgc3RyaW5nW10uXG4gIGNvbnN0IHZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRpcmVjdGl2ZS5nZXQoZmllbGQpICEpO1xuICBpZiAoIWlzU3RyaW5nQXJyYXlPckRpZSh2YWx1ZSwgZmllbGQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmVzb2x2ZSBARGlyZWN0aXZlLiR7ZmllbGR9YCk7XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogSW50ZXJwcmV0IHByb3BlcnR5IG1hcHBpbmcgZmllbGRzIG9uIHRoZSBkZWNvcmF0b3IgKGUuZy4gaW5wdXRzIG9yIG91dHB1dHMpIGFuZCByZXR1cm4gdGhlXG4gKiBjb3JyZWN0bHkgc2hhcGVkIG1ldGFkYXRhIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VGaWVsZFRvUHJvcGVydHlNYXBwaW5nKFxuICAgIGRpcmVjdGl2ZTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGZpZWxkOiBzdHJpbmcsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKToge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfSB7XG4gIGNvbnN0IG1ldGFWYWx1ZXMgPSBwYXJzZUZpZWxkQXJyYXlWYWx1ZShkaXJlY3RpdmUsIGZpZWxkLCBldmFsdWF0b3IpO1xuICBpZiAoIW1ldGFWYWx1ZXMpIHtcbiAgICByZXR1cm4gRU1QVFlfT0JKRUNUO1xuICB9XG5cbiAgcmV0dXJuIG1ldGFWYWx1ZXMucmVkdWNlKFxuICAgICAgKHJlc3VsdHMsIHZhbHVlKSA9PiB7XG4gICAgICAgIC8vIEVpdGhlciB0aGUgdmFsdWUgaXMgJ2ZpZWxkJyBvciAnZmllbGQ6IHByb3BlcnR5Jy4gSW4gdGhlIGZpcnN0IGNhc2UsIGBwcm9wZXJ0eWAgd2lsbFxuICAgICAgICAvLyBiZSB1bmRlZmluZWQsIGluIHdoaWNoIGNhc2UgdGhlIGZpZWxkIG5hbWUgc2hvdWxkIGFsc28gYmUgdXNlZCBhcyB0aGUgcHJvcGVydHkgbmFtZS5cbiAgICAgICAgY29uc3QgW2ZpZWxkLCBwcm9wZXJ0eV0gPSB2YWx1ZS5zcGxpdCgnOicsIDIpLm1hcChzdHIgPT4gc3RyLnRyaW0oKSk7XG4gICAgICAgIHJlc3VsdHNbZmllbGRdID0gcHJvcGVydHkgfHwgZmllbGQ7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfSxcbiAgICAgIHt9IGFze1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfSk7XG59XG5cbi8qKlxuICogUGFyc2UgcHJvcGVydHkgZGVjb3JhdG9ycyAoZS5nLiBgSW5wdXRgIG9yIGBPdXRwdXRgKSBhbmQgcmV0dXJuIHRoZSBjb3JyZWN0bHkgc2hhcGVkIG1ldGFkYXRhXG4gKiBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgIGZpZWxkczoge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfVtdLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgbWFwVmFsdWVSZXNvbHZlcjogKHB1YmxpY05hbWU6IHN0cmluZywgaW50ZXJuYWxOYW1lOiBzdHJpbmcpID0+XG4gICAgICAgIHN0cmluZyB8IFtzdHJpbmcsIHN0cmluZ10pOiB7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddfSB7XG4gIHJldHVybiBmaWVsZHMucmVkdWNlKFxuICAgICAgKHJlc3VsdHMsIGZpZWxkKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGZpZWxkLm1lbWJlci5uYW1lO1xuICAgICAgICBmaWVsZC5kZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgICAgICAvLyBUaGUgZGVjb3JhdG9yIGVpdGhlciBkb2Vzbid0IGhhdmUgYW4gYXJndW1lbnQgKEBJbnB1dCgpKSBpbiB3aGljaCBjYXNlIHRoZSBwcm9wZXJ0eVxuICAgICAgICAgIC8vIG5hbWUgaXMgdXNlZCwgb3IgaXQgaGFzIG9uZSBhcmd1bWVudCAoQE91dHB1dCgnbmFtZWQnKSkuXG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzID09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXN1bHRzW2ZpZWxkTmFtZV0gPSBmaWVsZE5hbWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5ID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzBdKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgcmVzb2x2ZSB0byBhIHN0cmluZ2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0c1tmaWVsZE5hbWVdID0gbWFwVmFsdWVSZXNvbHZlcihwcm9wZXJ0eSwgZmllbGROYW1lKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVG9vIG1hbnkgYXJndW1lbnRzLlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIGBEZWNvcmF0b3IgbXVzdCBoYXZlIDAgb3IgMSBhcmd1bWVudHMsIGdvdCAke2RlY29yYXRvci5hcmdzLmxlbmd0aH0gYXJndW1lbnQocylgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH0sXG4gICAgICB7fSBhc3tbZmllbGQ6IHN0cmluZ106IHN0cmluZyB8IFtzdHJpbmcsIHN0cmluZ119KTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZUlucHV0KHB1YmxpY05hbWU6IHN0cmluZywgaW50ZXJuYWxOYW1lOiBzdHJpbmcpOiBbc3RyaW5nLCBzdHJpbmddIHtcbiAgcmV0dXJuIFtwdWJsaWNOYW1lLCBpbnRlcm5hbE5hbWVdO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlT3V0cHV0KHB1YmxpY05hbWU6IHN0cmluZywgaW50ZXJuYWxOYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHB1YmxpY05hbWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICBmaWVsZHM6IHttZW1iZXI6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXX1bXSwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBSM1F1ZXJ5TWV0YWRhdGFbXSB7XG4gIHJldHVybiBmaWVsZHMubWFwKCh7bWVtYmVyLCBkZWNvcmF0b3JzfSkgPT4ge1xuICAgIC8vIFRocm93IGluIGNhc2Ugb2YgYEBJbnB1dCgpIEBDb250ZW50Q2hpbGQoJ2ZvbycpIGZvbzogYW55YCwgd2hpY2ggaXMgbm90IHN1cHBvcnRlZCBpbiBJdnlcbiAgICBpZiAobWVtYmVyLmRlY29yYXRvcnMgIS5zb21lKHYgPT4gdi5uYW1lID09PSAnSW5wdXQnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgY29tYmluZSBASW5wdXQgZGVjb3JhdG9ycyB3aXRoIHF1ZXJ5IGRlY29yYXRvcnNgKTtcbiAgICB9XG4gICAgaWYgKGRlY29yYXRvcnMubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBoYXZlIG11bHRpcGxlIHF1ZXJ5IGRlY29yYXRvcnMgb24gdGhlIHNhbWUgY2xhc3MgbWVtYmVyYCk7XG4gICAgfSBlbHNlIGlmICghaXNQcm9wZXJ0eVR5cGVNZW1iZXIobWVtYmVyKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBRdWVyeSBkZWNvcmF0b3IgbXVzdCBnbyBvbiBhIHByb3BlcnR5LXR5cGUgbWVtYmVyYCk7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGRlY29yYXRvcnNbMF07XG4gICAgcmV0dXJuIGV4dHJhY3RRdWVyeU1ldGFkYXRhKFxuICAgICAgICBkZWNvcmF0b3Iubm9kZSwgZGVjb3JhdG9yLm5hbWUsIGRlY29yYXRvci5hcmdzIHx8IFtdLCBtZW1iZXIubmFtZSwgcmVmbGVjdG9yLCBldmFsdWF0b3IpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaXNQcm9wZXJ0eVR5cGVNZW1iZXIobWVtYmVyOiBDbGFzc01lbWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5HZXR0ZXIgfHwgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5TZXR0ZXIgfHxcbiAgICAgIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuUHJvcGVydHk7XG59XG5cbnR5cGUgU3RyaW5nTWFwPFQ+ID0ge1xuICBba2V5OiBzdHJpbmddOiBUO1xufTtcblxuZnVuY3Rpb24gZXh0cmFjdEhvc3RCaW5kaW5ncyhcbiAgICBtZXRhZGF0YTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBjb3JlTW9kdWxlOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBQYXJzZWRIb3N0QmluZGluZ3Mge1xuICBsZXQgaG9zdE1ldGFkYXRhOiBTdHJpbmdNYXA8c3RyaW5nfEV4cHJlc3Npb24+ID0ge307XG4gIGlmIChtZXRhZGF0YS5oYXMoJ2hvc3QnKSkge1xuICAgIGNvbnN0IGV4cHIgPSBtZXRhZGF0YS5nZXQoJ2hvc3QnKSAhO1xuICAgIGNvbnN0IGhvc3RNZXRhTWFwID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICghKGhvc3RNZXRhTWFwIGluc3RhbmNlb2YgTWFwKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBleHByLCBgRGVjb3JhdG9yIGhvc3QgbWV0YWRhdGEgbXVzdCBiZSBhbiBvYmplY3RgKTtcbiAgICB9XG4gICAgaG9zdE1ldGFNYXAuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgLy8gUmVzb2x2ZSBFbnVtIHJlZmVyZW5jZXMgdG8gdGhlaXIgZGVjbGFyZWQgdmFsdWUuXG4gICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbnVtVmFsdWUpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXNvbHZlZDtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBEZWNvcmF0b3IgaG9zdCBtZXRhZGF0YSBtdXN0IGJlIGEgc3RyaW5nIC0+IHN0cmluZyBvYmplY3QsIGJ1dCBmb3VuZCB1bnBhcnNlYWJsZSBrZXkgJHtrZXl9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgaG9zdE1ldGFkYXRhW2tleV0gPSB2YWx1ZTtcbiAgICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgICAgaG9zdE1ldGFkYXRhW2tleV0gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHZhbHVlLm5vZGUgYXMgdHMuRXhwcmVzc2lvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgRGVjb3JhdG9yIGhvc3QgbWV0YWRhdGEgbXVzdCBiZSBhIHN0cmluZyAtPiBzdHJpbmcgb2JqZWN0LCBidXQgZm91bmQgdW5wYXJzZWFibGUgdmFsdWUgJHt2YWx1ZX1gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGJpbmRpbmdzID0gcGFyc2VIb3N0QmluZGluZ3MoaG9zdE1ldGFkYXRhKTtcblxuICAvLyBUT0RPOiBjcmVhdGUgYW5kIHByb3ZpZGUgcHJvcGVyIHNvdXJjZVNwYW4gdG8gbWFrZSBlcnJvciBtZXNzYWdlIG1vcmUgZGVzY3JpcHRpdmUgKEZXLTk5NSlcbiAgY29uc3QgZXJyb3JzID0gdmVyaWZ5SG9zdEJpbmRpbmdzKGJpbmRpbmdzLCAvKiBzb3VyY2VTcGFuICovIG51bGwgISk7XG4gIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgLy8gVE9ETzogcHJvdmlkZSBtb3JlIGdyYW51bGFyIGRpYWdub3N0aWMgYW5kIG91dHB1dCBzcGVjaWZpYyBob3N0IGV4cHJlc3Npb24gdGhhdCB0cmlnZ2VyZWRcbiAgICAgICAgLy8gYW4gZXJyb3IgaW5zdGVhZCBvZiB0aGUgd2hvbGUgaG9zdCBvYmplY3RcbiAgICAgICAgRXJyb3JDb2RlLkhPU1RfQklORElOR19QQVJTRV9FUlJPUiwgbWV0YWRhdGEuZ2V0KCdob3N0JykgISxcbiAgICAgICAgZXJyb3JzLm1hcCgoZXJyb3I6IFBhcnNlRXJyb3IpID0+IGVycm9yLm1zZykuam9pbignXFxuJykpO1xuICB9XG5cbiAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihtZW1iZXJzLCAnSG9zdEJpbmRpbmcnLCBjb3JlTW9kdWxlKVxuICAgICAgLmZvckVhY2goKHttZW1iZXIsIGRlY29yYXRvcnN9KSA9PiB7XG4gICAgICAgIGRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgICAgIGxldCBob3N0UHJvcGVydHlOYW1lOiBzdHJpbmcgPSBtZW1iZXIubmFtZTtcbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwgJiYgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEBIb3N0QmluZGluZygpIGNhbiBoYXZlIGF0IG1vc3Qgb25lIGFyZ3VtZW50YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzBdKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQEhvc3RCaW5kaW5nKCkncyBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGhvc3RQcm9wZXJ0eU5hbWUgPSByZXNvbHZlZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBiaW5kaW5ncy5wcm9wZXJ0aWVzW2hvc3RQcm9wZXJ0eU5hbWVdID0gbWVtYmVyLm5hbWU7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihtZW1iZXJzLCAnSG9zdExpc3RlbmVyJywgY29yZU1vZHVsZSlcbiAgICAgIC5mb3JFYWNoKCh7bWVtYmVyLCBkZWNvcmF0b3JzfSkgPT4ge1xuICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgICAgICBsZXQgZXZlbnROYW1lOiBzdHJpbmcgPSBtZW1iZXIubmFtZTtcbiAgICAgICAgICBsZXQgYXJnczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgIT09IG51bGwgJiYgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLmFyZ3NbMl0sXG4gICAgICAgICAgICAgICAgICBgQEhvc3RMaXN0ZW5lcigpIGNhbiBoYXZlIGF0IG1vc3QgdHdvIGFyZ3VtZW50c2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGRlY29yYXRvci5hcmdzWzBdLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0TGlzdGVuZXIoKSdzIGV2ZW50IG5hbWUgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBldmVudE5hbWUgPSByZXNvbHZlZDtcblxuICAgICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZEFyZ3MgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMV0pO1xuICAgICAgICAgICAgICBpZiAoIWlzU3RyaW5nQXJyYXlPckRpZShyZXNvbHZlZEFyZ3MsICdASG9zdExpc3RlbmVyLmFyZ3MnKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBkZWNvcmF0b3IuYXJnc1sxXSxcbiAgICAgICAgICAgICAgICAgICAgYEBIb3N0TGlzdGVuZXIgc2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcgYXJyYXlgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBhcmdzID0gcmVzb2x2ZWRBcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGJpbmRpbmdzLmxpc3RlbmVyc1tldmVudE5hbWVdID0gYCR7bWVtYmVyLm5hbWV9KCR7YXJncy5qb2luKCcsJyl9KWA7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIHJldHVybiBiaW5kaW5ncztcbn1cblxuY29uc3QgUVVFUllfVFlQRVMgPSBuZXcgU2V0KFtcbiAgJ0NvbnRlbnRDaGlsZCcsXG4gICdDb250ZW50Q2hpbGRyZW4nLFxuICAnVmlld0NoaWxkJyxcbiAgJ1ZpZXdDaGlsZHJlbicsXG5dKTtcbiJdfQ==