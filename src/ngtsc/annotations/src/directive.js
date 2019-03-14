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
        function DirectiveDecoratorHandler(reflector, evaluator, scopeRegistry, defaultImportRecorder, isCore) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.scopeRegistry = scopeRegistry;
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
                this.scopeRegistry.registerDirective(tslib_1.__assign({ ref: ref, name: node.name.text, selector: analysis.selector, exportAs: analysis.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.queries.map(function (query) { return query.propertyName; }), isComponent: false }, util_1.extractDirectiveGuards(node, this.reflector)));
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
    function extractDirectiveMetadata(clazz, decorator, reflector, evaluator, defaultImportRecorder, isCore, defaultSelector) {
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
            deps: util_2.getValidConstructorDependencies(clazz, reflector, defaultImportRecorder, isCore), host: host,
            lifecycle: {
                usesOnChanges: usesOnChanges,
            },
            inputs: tslib_1.__assign({}, inputsFromMeta, inputsFromFields),
            outputs: tslib_1.__assign({}, outputsFromMeta, outputsFromFields), queries: queries, viewQueries: viewQueries, selector: selector,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFxUDtJQUNyUCwrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUErRDtJQUMvRCx1RkFBa0Y7SUFDbEYseUVBQTZJO0lBRTdJLHVFQUE0RDtJQUM1RCx1RUFBaUg7SUFFakgscUZBQXdEO0lBQ3hELDZFQUFpSDtJQUVqSCxJQUFNLFlBQVksR0FBNEIsRUFBRSxDQUFDO0lBTWpEO1FBRUUsbUNBQ1ksU0FBeUIsRUFBVSxTQUEyQixFQUM5RCxhQUF1QyxFQUN2QyxxQkFBNEMsRUFBVSxNQUFlO1lBRnJFLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBa0I7WUFDOUQsa0JBQWEsR0FBYixhQUFhLENBQTBCO1lBQ3ZDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBRXhFLGVBQVUsR0FBRyw2QkFBaUIsQ0FBQyxPQUFPLENBQUM7UUFGb0MsQ0FBQztRQUlyRiwwQ0FBTSxHQUFOLFVBQU8sSUFBb0IsRUFBRSxVQUE0QjtZQUN2RCxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxTQUFTLEdBQUcsMkJBQW9CLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0UsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFO2dCQUMzQixPQUFPO29CQUNMLE9BQU8sRUFBRSxTQUFTLENBQUMsSUFBSTtvQkFDdkIsUUFBUSxFQUFFLFNBQVM7aUJBQ3BCLENBQUM7YUFD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RCxJQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUMxQixjQUFjO1FBQ2QsaUJBQWlCO1FBQ2pCLFdBQVc7UUFDWCxjQUFjO0tBQ2YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgUGFyc2VFcnJvciwgUGFyc2VkSG9zdEJpbmRpbmdzLCBSM0RpcmVjdGl2ZU1ldGFkYXRhLCBSM1F1ZXJ5TWV0YWRhdGEsIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VIb3N0QmluZGluZ3MsIHZlcmlmeUhvc3RCaW5kaW5nc30gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIFJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0R5bmFtaWNWYWx1ZSwgRW51bVZhbHVlLCBQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZS9zcmMvbG9jYWwnO1xuaW1wb3J0IHtleHRyYWN0RGlyZWN0aXZlR3VhcmRzfSBmcm9tICcuLi8uLi9zY29wZS9zcmMvdXRpbCc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmaW5kQW5ndWxhckRlY29yYXRvciwgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgdW53cmFwRXhwcmVzc2lvbiwgdW53cmFwRm9yd2FyZFJlZn0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgRU1QVFlfT0JKRUNUOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZUhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNEaXJlY3RpdmVNZXRhZGF0YTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcbn1cbmV4cG9ydCBjbGFzcyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERpcmVjdGl2ZUhhbmRsZXJEYXRhLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbikge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcblxuICBkZXRlY3Qobm9kZTogdHMuRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ0RpcmVjdGl2ZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8RGlyZWN0aXZlSGFuZGxlckRhdGE+IHtcbiAgICBjb25zdCBkaXJlY3RpdmVSZXN1bHQgPSBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgICAgIG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpO1xuICAgIGNvbnN0IGFuYWx5c2lzID0gZGlyZWN0aXZlUmVzdWx0ICYmIGRpcmVjdGl2ZVJlc3VsdC5tZXRhZGF0YTtcblxuICAgIC8vIElmIHRoZSBkaXJlY3RpdmUgaGFzIGEgc2VsZWN0b3IsIGl0IHNob3VsZCBiZSByZWdpc3RlcmVkIHdpdGggdGhlIGBTZWxlY3RvclNjb3BlUmVnaXN0cnlgIHNvXG4gICAgLy8gd2hlbiB0aGlzIGRpcmVjdGl2ZSBhcHBlYXJzIGluIGFuIGBATmdNb2R1bGVgIHNjb3BlLCBpdHMgc2VsZWN0b3IgY2FuIGJlIGRldGVybWluZWQuXG4gICAgaWYgKGFuYWx5c2lzICYmIGFuYWx5c2lzLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKG5vZGUpO1xuICAgICAgdGhpcy5zY29wZVJlZ2lzdHJ5LnJlZ2lzdGVyRGlyZWN0aXZlKHtcbiAgICAgICAgcmVmLFxuICAgICAgICBuYW1lOiBub2RlLm5hbWUgIS50ZXh0LFxuICAgICAgICBzZWxlY3RvcjogYW5hbHlzaXMuc2VsZWN0b3IsXG4gICAgICAgIGV4cG9ydEFzOiBhbmFseXNpcy5leHBvcnRBcyxcbiAgICAgICAgaW5wdXRzOiBhbmFseXNpcy5pbnB1dHMsXG4gICAgICAgIG91dHB1dHM6IGFuYWx5c2lzLm91dHB1dHMsXG4gICAgICAgIHF1ZXJpZXM6IGFuYWx5c2lzLnF1ZXJpZXMubWFwKHF1ZXJ5ID0+IHF1ZXJ5LnByb3BlcnR5TmFtZSksXG4gICAgICAgIGlzQ29tcG9uZW50OiBmYWxzZSwgLi4uZXh0cmFjdERpcmVjdGl2ZUd1YXJkcyhub2RlLCB0aGlzLnJlZmxlY3RvciksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoYW5hbHlzaXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBtZXRhOiBhbmFseXNpcyxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IERpcmVjdGl2ZUhhbmRsZXJEYXRhLCBwb29sOiBDb25zdGFudFBvb2wpOlxuICAgICAgQ29tcGlsZVJlc3VsdCB7XG4gICAgY29uc3QgcmVzID0gY29tcGlsZURpcmVjdGl2ZUZyb21NZXRhZGF0YShhbmFseXNpcy5tZXRhLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gcmVzLnN0YXRlbWVudHM7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgc3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnbmdEaXJlY3RpdmVEZWYnLFxuICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgc3RhdGVtZW50czogc3RhdGVtZW50cyxcbiAgICAgIHR5cGU6IHJlcy50eXBlLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gZXh0cmFjdCBtZXRhZGF0YSBmcm9tIGEgYERpcmVjdGl2ZWAgb3IgYENvbXBvbmVudGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0RGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgY2xheno6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvciwgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIGlzQ29yZTogYm9vbGVhbixcbiAgICBkZWZhdWx0U2VsZWN0b3I6IHN0cmluZyB8IG51bGwgPSBudWxsKToge1xuICBkZWNvcmF0b3I6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LFxuICBtZXRhZGF0YTogUjNEaXJlY3RpdmVNZXRhZGF0YSxcbiAgZGVjb3JhdGVkRWxlbWVudHM6IENsYXNzTWVtYmVyW10sXG59fHVuZGVmaW5lZCB7XG4gIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5ub2RlLFxuICAgICAgICBgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQCR7ZGVjb3JhdG9yLm5hbWV9IGRlY29yYXRvcmApO1xuICB9XG4gIGNvbnN0IG1ldGEgPSB1bndyYXBFeHByZXNzaW9uKGRlY29yYXRvci5hcmdzWzBdKTtcbiAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSwgYEAke2RlY29yYXRvci5uYW1lfSBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gIH1cbiAgY29uc3QgZGlyZWN0aXZlID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG5cbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ2ppdCcpKSB7XG4gICAgLy8gVGhlIG9ubHkgYWxsb3dlZCB2YWx1ZSBpcyB0cnVlLCBzbyB0aGVyZSdzIG5vIG5lZWQgdG8gZXhwYW5kIGZ1cnRoZXIuXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGNvbnN0IG1lbWJlcnMgPSByZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3MoY2xhenopO1xuXG4gIC8vIFByZWNvbXB1dGUgYSBsaXN0IG9mIHRzLkNsYXNzRWxlbWVudHMgdGhhdCBoYXZlIGRlY29yYXRvcnMuIFRoaXMgaW5jbHVkZXMgdGhpbmdzIGxpa2UgQElucHV0LFxuICAvLyBAT3V0cHV0LCBASG9zdEJpbmRpbmcsIGV0Yy5cbiAgY29uc3QgZGVjb3JhdGVkRWxlbWVudHMgPVxuICAgICAgbWVtYmVycy5maWx0ZXIobWVtYmVyID0+ICFtZW1iZXIuaXNTdGF0aWMgJiYgbWVtYmVyLmRlY29yYXRvcnMgIT09IG51bGwpO1xuXG4gIGNvbnN0IGNvcmVNb2R1bGUgPSBpc0NvcmUgPyB1bmRlZmluZWQgOiAnQGFuZ3VsYXIvY29yZSc7XG5cbiAgLy8gQ29uc3RydWN0IHRoZSBtYXAgb2YgaW5wdXRzIGJvdGggZnJvbSB0aGUgQERpcmVjdGl2ZS9AQ29tcG9uZW50XG4gIC8vIGRlY29yYXRvciwgYW5kIHRoZSBkZWNvcmF0ZWRcbiAgLy8gZmllbGRzLlxuICBjb25zdCBpbnB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdpbnB1dHMnLCBldmFsdWF0b3IpO1xuICBjb25zdCBpbnB1dHNGcm9tRmllbGRzID0gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnSW5wdXQnLCBjb3JlTW9kdWxlKSwgZXZhbHVhdG9yLFxuICAgICAgcmVzb2x2ZUlucHV0KTtcblxuICAvLyBBbmQgb3V0cHV0cy5cbiAgY29uc3Qgb3V0cHV0c0Zyb21NZXRhID0gcGFyc2VGaWVsZFRvUHJvcGVydHlNYXBwaW5nKGRpcmVjdGl2ZSwgJ291dHB1dHMnLCBldmFsdWF0b3IpO1xuICBjb25zdCBvdXRwdXRzRnJvbUZpZWxkcyA9IHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ091dHB1dCcsIGNvcmVNb2R1bGUpLCBldmFsdWF0b3IsXG4gICAgICByZXNvbHZlT3V0cHV0KSBhc3tbZmllbGQ6IHN0cmluZ106IHN0cmluZ307XG4gIC8vIENvbnN0cnVjdCB0aGUgbGlzdCBvZiBxdWVyaWVzLlxuICBjb25zdCBjb250ZW50Q2hpbGRGcm9tRmllbGRzID0gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnQ29udGVudENoaWxkJywgY29yZU1vZHVsZSksIHJlZmxlY3RvcixcbiAgICAgIGV2YWx1YXRvcik7XG4gIGNvbnN0IGNvbnRlbnRDaGlsZHJlbkZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdDb250ZW50Q2hpbGRyZW4nLCBjb3JlTW9kdWxlKSwgcmVmbGVjdG9yLFxuICAgICAgZXZhbHVhdG9yKTtcblxuICBjb25zdCBxdWVyaWVzID0gWy4uLmNvbnRlbnRDaGlsZEZyb21GaWVsZHMsIC4uLmNvbnRlbnRDaGlsZHJlbkZyb21GaWVsZHNdO1xuXG4gIC8vIENvbnN0cnVjdCB0aGUgbGlzdCBvZiB2aWV3IHF1ZXJpZXMuXG4gIGNvbnN0IHZpZXdDaGlsZEZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdWaWV3Q2hpbGQnLCBjb3JlTW9kdWxlKSwgcmVmbGVjdG9yLFxuICAgICAgZXZhbHVhdG9yKTtcbiAgY29uc3Qgdmlld0NoaWxkcmVuRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ1ZpZXdDaGlsZHJlbicsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuICBjb25zdCB2aWV3UXVlcmllcyA9IFsuLi52aWV3Q2hpbGRGcm9tRmllbGRzLCAuLi52aWV3Q2hpbGRyZW5Gcm9tRmllbGRzXTtcblxuICBpZiAoZGlyZWN0aXZlLmhhcygncXVlcmllcycpKSB7XG4gICAgY29uc3QgcXVlcmllc0Zyb21EZWNvcmF0b3IgPVxuICAgICAgICBleHRyYWN0UXVlcmllc0Zyb21EZWNvcmF0b3IoZGlyZWN0aXZlLmdldCgncXVlcmllcycpICEsIHJlZmxlY3RvciwgZXZhbHVhdG9yLCBpc0NvcmUpO1xuICAgIHF1ZXJpZXMucHVzaCguLi5xdWVyaWVzRnJvbURlY29yYXRvci5jb250ZW50KTtcbiAgICB2aWV3UXVlcmllcy5wdXNoKC4uLnF1ZXJpZXNGcm9tRGVjb3JhdG9yLnZpZXcpO1xuICB9XG5cbiAgLy8gUGFyc2UgdGhlIHNlbGVjdG9yLlxuICBsZXQgc2VsZWN0b3IgPSBkZWZhdWx0U2VsZWN0b3I7XG4gIGlmIChkaXJlY3RpdmUuaGFzKCdzZWxlY3RvcicpKSB7XG4gICAgY29uc3QgZXhwciA9IGRpcmVjdGl2ZS5nZXQoJ3NlbGVjdG9yJykgITtcbiAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwciwgYHNlbGVjdG9yIG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICB9XG4gICAgLy8gdXNlIGRlZmF1bHQgc2VsZWN0b3IgaW4gY2FzZSBzZWxlY3RvciBpcyBhbiBlbXB0eSBzdHJpbmdcbiAgICBzZWxlY3RvciA9IHJlc29sdmVkID09PSAnJyA/IGRlZmF1bHRTZWxlY3RvciA6IHJlc29sdmVkO1xuICB9XG4gIGlmICghc2VsZWN0b3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYERpcmVjdGl2ZSAke2NsYXp6Lm5hbWUgIS50ZXh0fSBoYXMgbm8gc2VsZWN0b3IsIHBsZWFzZSBhZGQgaXQhYCk7XG4gIH1cblxuICBjb25zdCBob3N0ID0gZXh0cmFjdEhvc3RCaW5kaW5ncyhkaXJlY3RpdmUsIGRlY29yYXRlZEVsZW1lbnRzLCBldmFsdWF0b3IsIGNvcmVNb2R1bGUpO1xuXG4gIGNvbnN0IHByb3ZpZGVyczogRXhwcmVzc2lvbnxudWxsID1cbiAgICAgIGRpcmVjdGl2ZS5oYXMoJ3Byb3ZpZGVycycpID8gbmV3IFdyYXBwZWROb2RlRXhwcihkaXJlY3RpdmUuZ2V0KCdwcm92aWRlcnMnKSAhKSA6IG51bGw7XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGBuZ09uQ2hhbmdlc2AgaXMgYSBsaWZlY3ljbGUgaG9vayBkZWZpbmVkIG9uIHRoZSBjb21wb25lbnQuXG4gIGNvbnN0IHVzZXNPbkNoYW5nZXMgPSBtZW1iZXJzLnNvbWUoXG4gICAgICBtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJlxuICAgICAgICAgIG1lbWJlci5uYW1lID09PSAnbmdPbkNoYW5nZXMnKTtcblxuICAvLyBQYXJzZSBleHBvcnRBcy5cbiAgbGV0IGV4cG9ydEFzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ2V4cG9ydEFzJykpIHtcbiAgICBjb25zdCBleHByID0gZGlyZWN0aXZlLmdldCgnZXhwb3J0QXMnKSAhO1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCBgZXhwb3J0QXMgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBleHBvcnRBcyA9IHJlc29sdmVkLnNwbGl0KCcsJykubWFwKHBhcnQgPT4gcGFydC50cmltKCkpO1xuICB9XG5cbiAgLy8gRGV0ZWN0IGlmIHRoZSBjb21wb25lbnQgaW5oZXJpdHMgZnJvbSBhbm90aGVyIGNsYXNzXG4gIGNvbnN0IHVzZXNJbmhlcml0YW5jZSA9IHJlZmxlY3Rvci5oYXNCYXNlQ2xhc3MoY2xhenopO1xuICBjb25zdCBtZXRhZGF0YTogUjNEaXJlY3RpdmVNZXRhZGF0YSA9IHtcbiAgICBuYW1lOiBjbGF6ei5uYW1lICEudGV4dCxcbiAgICBkZXBzOiBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGRlZmF1bHRJbXBvcnRSZWNvcmRlciwgaXNDb3JlKSwgaG9zdCxcbiAgICBsaWZlY3ljbGU6IHtcbiAgICAgICAgdXNlc09uQ2hhbmdlcyxcbiAgICB9LFxuICAgIGlucHV0czogey4uLmlucHV0c0Zyb21NZXRhLCAuLi5pbnB1dHNGcm9tRmllbGRzfSxcbiAgICBvdXRwdXRzOiB7Li4ub3V0cHV0c0Zyb21NZXRhLCAuLi5vdXRwdXRzRnJvbUZpZWxkc30sIHF1ZXJpZXMsIHZpZXdRdWVyaWVzLCBzZWxlY3RvcixcbiAgICB0eXBlOiBuZXcgV3JhcHBlZE5vZGVFeHByKGNsYXp6Lm5hbWUgISksXG4gICAgdHlwZUFyZ3VtZW50Q291bnQ6IHJlZmxlY3Rvci5nZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6KSB8fCAwLFxuICAgIHR5cGVTb3VyY2VTcGFuOiBudWxsICEsIHVzZXNJbmhlcml0YW5jZSwgZXhwb3J0QXMsIHByb3ZpZGVyc1xuICB9O1xuICByZXR1cm4ge2RlY29yYXRlZEVsZW1lbnRzLCBkZWNvcmF0b3I6IGRpcmVjdGl2ZSwgbWV0YWRhdGF9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFF1ZXJ5TWV0YWRhdGEoXG4gICAgZXhwck5vZGU6IHRzLk5vZGUsIG5hbWU6IHN0cmluZywgYXJnczogUmVhZG9ubHlBcnJheTx0cy5FeHByZXNzaW9uPiwgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogUjNRdWVyeU1ldGFkYXRhIHtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBleHByTm9kZSwgYEAke25hbWV9IG11c3QgaGF2ZSBhcmd1bWVudHNgKTtcbiAgfVxuICBjb25zdCBmaXJzdCA9IG5hbWUgPT09ICdWaWV3Q2hpbGQnIHx8IG5hbWUgPT09ICdDb250ZW50Q2hpbGQnO1xuICBjb25zdCBub2RlID0gdW53cmFwRm9yd2FyZFJlZihhcmdzWzBdLCByZWZsZWN0b3IpO1xuICBjb25zdCBhcmcgPSBldmFsdWF0b3IuZXZhbHVhdGUobm9kZSk7XG5cbiAgLyoqIFdoZXRoZXIgb3Igbm90IHRoaXMgcXVlcnkgc2hvdWxkIGNvbGxlY3Qgb25seSBzdGF0aWMgcmVzdWx0cyAoc2VlIHZpZXcvYXBpLnRzKSAgKi9cbiAgbGV0IGlzU3RhdGljOiBib29sZWFuID0gZmFsc2U7XG5cbiAgLy8gRXh0cmFjdCB0aGUgcHJlZGljYXRlXG4gIGxldCBwcmVkaWNhdGU6IEV4cHJlc3Npb258c3RyaW5nW118bnVsbCA9IG51bGw7XG4gIGlmIChhcmcgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICBwcmVkaWNhdGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKG5vZGUpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgcHJlZGljYXRlID0gW2FyZ107XG4gIH0gZWxzZSBpZiAoaXNTdHJpbmdBcnJheU9yRGllKGFyZywgJ0AnICsgbmFtZSkpIHtcbiAgICBwcmVkaWNhdGUgPSBhcmcgYXMgc3RyaW5nW107XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIG5vZGUsIGBAJHtuYW1lfSBwcmVkaWNhdGUgY2Fubm90IGJlIGludGVycHJldGVkYCk7XG4gIH1cblxuICAvLyBFeHRyYWN0IHRoZSByZWFkIGFuZCBkZXNjZW5kYW50cyBvcHRpb25zLlxuICBsZXQgcmVhZDogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgLy8gVGhlIGRlZmF1bHQgdmFsdWUgZm9yIGRlc2NlbmRhbnRzIGlzIHRydWUgZm9yIGV2ZXJ5IGRlY29yYXRvciBleGNlcHQgQENvbnRlbnRDaGlsZHJlbi5cbiAgbGV0IGRlc2NlbmRhbnRzOiBib29sZWFuID0gbmFtZSAhPT0gJ0NvbnRlbnRDaGlsZHJlbic7XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMikge1xuICAgIGNvbnN0IG9wdGlvbnNFeHByID0gdW53cmFwRXhwcmVzc2lvbihhcmdzWzFdKTtcbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ob3B0aW9uc0V4cHIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEAke25hbWV9IG9wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbGApO1xuICAgIH1cbiAgICBjb25zdCBvcHRpb25zID0gcmVmbGVjdE9iamVjdExpdGVyYWwob3B0aW9uc0V4cHIpO1xuICAgIGlmIChvcHRpb25zLmhhcygncmVhZCcpKSB7XG4gICAgICByZWFkID0gbmV3IFdyYXBwZWROb2RlRXhwcihvcHRpb25zLmdldCgncmVhZCcpICEpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmhhcygnZGVzY2VuZGFudHMnKSkge1xuICAgICAgY29uc3QgZGVzY2VuZGFudHNWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShvcHRpb25zLmdldCgnZGVzY2VuZGFudHMnKSAhKTtcbiAgICAgIGlmICh0eXBlb2YgZGVzY2VuZGFudHNWYWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQCR7bmFtZX0gb3B0aW9ucy5kZXNjZW5kYW50cyBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgfVxuICAgICAgZGVzY2VuZGFudHMgPSBkZXNjZW5kYW50c1ZhbHVlO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmhhcygnc3RhdGljJykpIHtcbiAgICAgIGNvbnN0IHN0YXRpY1ZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlKG9wdGlvbnMuZ2V0KCdzdGF0aWMnKSAhKTtcbiAgICAgIGlmICh0eXBlb2Ygc3RhdGljVmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIG5vZGUsIGBAJHtuYW1lfSBvcHRpb25zLnN0YXRpYyBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgfVxuICAgICAgaXNTdGF0aWMgPSBzdGF0aWNWYWx1ZTtcbiAgICB9XG5cbiAgfSBlbHNlIGlmIChhcmdzLmxlbmd0aCA+IDIpIHtcbiAgICAvLyBUb28gbWFueSBhcmd1bWVudHMuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBAJHtuYW1lfSBoYXMgdG9vIG1hbnkgYXJndW1lbnRzYCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHByb3BlcnR5TmFtZSxcbiAgICBwcmVkaWNhdGUsXG4gICAgZmlyc3QsXG4gICAgZGVzY2VuZGFudHMsXG4gICAgcmVhZCxcbiAgICBzdGF0aWM6IGlzU3RhdGljLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yKFxuICAgIHF1ZXJ5RGF0YTogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgIGlzQ29yZTogYm9vbGVhbik6IHtcbiAgY29udGVudDogUjNRdWVyeU1ldGFkYXRhW10sXG4gIHZpZXc6IFIzUXVlcnlNZXRhZGF0YVtdLFxufSB7XG4gIGNvbnN0IGNvbnRlbnQ6IFIzUXVlcnlNZXRhZGF0YVtdID0gW10sIHZpZXc6IFIzUXVlcnlNZXRhZGF0YVtdID0gW107XG4gIGNvbnN0IGV4cHIgPSB1bndyYXBFeHByZXNzaW9uKHF1ZXJ5RGF0YSk7XG4gIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihxdWVyeURhdGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBxdWVyaWVzIG1ldGFkYXRhIG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWxgKTtcbiAgfVxuICByZWZsZWN0T2JqZWN0TGl0ZXJhbChxdWVyeURhdGEpLmZvckVhY2goKHF1ZXJ5RXhwciwgcHJvcGVydHlOYW1lKSA9PiB7XG4gICAgcXVlcnlFeHByID0gdW53cmFwRXhwcmVzc2lvbihxdWVyeUV4cHIpO1xuICAgIGlmICghdHMuaXNOZXdFeHByZXNzaW9uKHF1ZXJ5RXhwcikgfHwgIXRzLmlzSWRlbnRpZmllcihxdWVyeUV4cHIuZXhwcmVzc2lvbikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgcXVlcnkgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBhIHF1ZXJ5IHR5cGVgKTtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIocXVlcnlFeHByLmV4cHJlc3Npb24pO1xuICAgIGlmICh0eXBlID09PSBudWxsIHx8ICghaXNDb3JlICYmIHR5cGUuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB8fFxuICAgICAgICAhUVVFUllfVFlQRVMuaGFzKHR5cGUubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgcXVlcnkgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBhIHF1ZXJ5IHR5cGVgKTtcbiAgICB9XG5cbiAgICBjb25zdCBxdWVyeSA9IGV4dHJhY3RRdWVyeU1ldGFkYXRhKFxuICAgICAgICBxdWVyeUV4cHIsIHR5cGUubmFtZSwgcXVlcnlFeHByLmFyZ3VtZW50cyB8fCBbXSwgcHJvcGVydHlOYW1lLCByZWZsZWN0b3IsIGV2YWx1YXRvcik7XG4gICAgaWYgKHR5cGUubmFtZS5zdGFydHNXaXRoKCdDb250ZW50JykpIHtcbiAgICAgIGNvbnRlbnQucHVzaChxdWVyeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZpZXcucHVzaChxdWVyeSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHtjb250ZW50LCB2aWV3fTtcbn1cblxuZnVuY3Rpb24gaXNTdHJpbmdBcnJheU9yRGllKHZhbHVlOiBhbnksIG5hbWU6IHN0cmluZyk6IHZhbHVlIGlzIHN0cmluZ1tdIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlW2ldICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmVzb2x2ZSAke25hbWV9WyR7aX1dIHRvIGEgc3RyaW5nYCk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VGaWVsZEFycmF5VmFsdWUoXG4gICAgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogbnVsbHxcbiAgICBzdHJpbmdbXSB7XG4gIGlmICghZGlyZWN0aXZlLmhhcyhmaWVsZCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJlc29sdmUgdGhlIGZpZWxkIG9mIGludGVyZXN0IGZyb20gdGhlIGRpcmVjdGl2ZSBtZXRhZGF0YSB0byBhIHN0cmluZ1tdLlxuICBjb25zdCB2YWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShkaXJlY3RpdmUuZ2V0KGZpZWxkKSAhKTtcbiAgaWYgKCFpc1N0cmluZ0FycmF5T3JEaWUodmFsdWUsIGZpZWxkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJlc29sdmUgQERpcmVjdGl2ZS4ke2ZpZWxkfWApO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEludGVycHJldCBwcm9wZXJ0eSBtYXBwaW5nIGZpZWxkcyBvbiB0aGUgZGVjb3JhdG9yIChlLmcuIGlucHV0cyBvciBvdXRwdXRzKSBhbmQgcmV0dXJuIHRoZVxuICogY29ycmVjdGx5IHNoYXBlZCBtZXRhZGF0YSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhcbiAgICBkaXJlY3RpdmU6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBmaWVsZDogc3RyaW5nLFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCBtZXRhVmFsdWVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoZGlyZWN0aXZlLCBmaWVsZCwgZXZhbHVhdG9yKTtcbiAgaWYgKCFtZXRhVmFsdWVzKSB7XG4gICAgcmV0dXJuIEVNUFRZX09CSkVDVDtcbiAgfVxuXG4gIHJldHVybiBtZXRhVmFsdWVzLnJlZHVjZShcbiAgICAgIChyZXN1bHRzLCB2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBFaXRoZXIgdGhlIHZhbHVlIGlzICdmaWVsZCcgb3IgJ2ZpZWxkOiBwcm9wZXJ0eScuIEluIHRoZSBmaXJzdCBjYXNlLCBgcHJvcGVydHlgIHdpbGxcbiAgICAgICAgLy8gYmUgdW5kZWZpbmVkLCBpbiB3aGljaCBjYXNlIHRoZSBmaWVsZCBuYW1lIHNob3VsZCBhbHNvIGJlIHVzZWQgYXMgdGhlIHByb3BlcnR5IG5hbWUuXG4gICAgICAgIGNvbnN0IFtmaWVsZCwgcHJvcGVydHldID0gdmFsdWUuc3BsaXQoJzonLCAyKS5tYXAoc3RyID0+IHN0ci50cmltKCkpO1xuICAgICAgICByZXN1bHRzW2ZpZWxkXSA9IHByb3BlcnR5IHx8IGZpZWxkO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH0sXG4gICAgICB7fSBhc3tbZmllbGQ6IHN0cmluZ106IHN0cmluZ30pO1xufVxuXG4vKipcbiAqIFBhcnNlIHByb3BlcnR5IGRlY29yYXRvcnMgKGUuZy4gYElucHV0YCBvciBgT3V0cHV0YCkgYW5kIHJldHVybiB0aGUgY29ycmVjdGx5IHNoYXBlZCBtZXRhZGF0YVxuICogb2JqZWN0LlxuICovXG5mdW5jdGlvbiBwYXJzZURlY29yYXRlZEZpZWxkcyhcbiAgICBmaWVsZHM6IHttZW1iZXI6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXX1bXSwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgIG1hcFZhbHVlUmVzb2x2ZXI6IChwdWJsaWNOYW1lOiBzdHJpbmcsIGludGVybmFsTmFtZTogc3RyaW5nKSA9PlxuICAgICAgICBzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddKToge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXX0ge1xuICByZXR1cm4gZmllbGRzLnJlZHVjZShcbiAgICAgIChyZXN1bHRzLCBmaWVsZCkgPT4ge1xuICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBmaWVsZC5tZW1iZXIubmFtZTtcbiAgICAgICAgZmllbGQuZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICAgICAgLy8gVGhlIGRlY29yYXRvciBlaXRoZXIgZG9lc24ndCBoYXZlIGFuIGFyZ3VtZW50IChASW5wdXQoKSkgaW4gd2hpY2ggY2FzZSB0aGUgcHJvcGVydHlcbiAgICAgICAgICAvLyBuYW1lIGlzIHVzZWQsIG9yIGl0IGhhcyBvbmUgYXJndW1lbnQgKEBPdXRwdXQoJ25hbWVkJykpLlxuICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmVzdWx0c1tmaWVsZE5hbWVdID0gZmllbGROYW1lO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0eSA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERlY29yYXRvciBhcmd1bWVudCBtdXN0IHJlc29sdmUgdG8gYSBzdHJpbmdgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdHNbZmllbGROYW1lXSA9IG1hcFZhbHVlUmVzb2x2ZXIocHJvcGVydHksIGZpZWxkTmFtZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRvbyBtYW55IGFyZ3VtZW50cy5cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgRGVjb3JhdG9yIG11c3QgaGF2ZSAwIG9yIDEgYXJndW1lbnRzLCBnb3QgJHtkZWNvcmF0b3IuYXJncy5sZW5ndGh9IGFyZ3VtZW50KHMpYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9LFxuICAgICAge30gYXN7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddfSk7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVJbnB1dChwdWJsaWNOYW1lOiBzdHJpbmcsIGludGVybmFsTmFtZTogc3RyaW5nKTogW3N0cmluZywgc3RyaW5nXSB7XG4gIHJldHVybiBbcHVibGljTmFtZSwgaW50ZXJuYWxOYW1lXTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZU91dHB1dChwdWJsaWNOYW1lOiBzdHJpbmcsIGludGVybmFsTmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiBwdWJsaWNOYW1lO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgZmllbGRzOiB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogUjNRdWVyeU1ldGFkYXRhW10ge1xuICByZXR1cm4gZmllbGRzLm1hcCgoe21lbWJlciwgZGVjb3JhdG9yc30pID0+IHtcbiAgICAvLyBUaHJvdyBpbiBjYXNlIG9mIGBASW5wdXQoKSBAQ29udGVudENoaWxkKCdmb28nKSBmb286IGFueWAsIHdoaWNoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gSXZ5XG4gICAgaWYgKG1lbWJlci5kZWNvcmF0b3JzICEuc29tZSh2ID0+IHYubmFtZSA9PT0gJ0lucHV0JykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGNvbWJpbmUgQElucHV0IGRlY29yYXRvcnMgd2l0aCBxdWVyeSBkZWNvcmF0b3JzYCk7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgaGF2ZSBtdWx0aXBsZSBxdWVyeSBkZWNvcmF0b3JzIG9uIHRoZSBzYW1lIGNsYXNzIG1lbWJlcmApO1xuICAgIH0gZWxzZSBpZiAoIWlzUHJvcGVydHlUeXBlTWVtYmVyKG1lbWJlcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUXVlcnkgZGVjb3JhdG9yIG11c3QgZ28gb24gYSBwcm9wZXJ0eS10eXBlIG1lbWJlcmApO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBkZWNvcmF0b3JzWzBdO1xuICAgIHJldHVybiBleHRyYWN0UXVlcnlNZXRhZGF0YShcbiAgICAgICAgZGVjb3JhdG9yLm5vZGUsIGRlY29yYXRvci5uYW1lLCBkZWNvcmF0b3IuYXJncyB8fCBbXSwgbWVtYmVyLm5hbWUsIHJlZmxlY3RvciwgZXZhbHVhdG9yKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGlzUHJvcGVydHlUeXBlTWVtYmVyKG1lbWJlcjogQ2xhc3NNZW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuR2V0dGVyIHx8IG1lbWJlci5raW5kID09PSBDbGFzc01lbWJlcktpbmQuU2V0dGVyIHx8XG4gICAgICBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLlByb3BlcnR5O1xufVxuXG50eXBlIFN0cmluZ01hcDxUPiA9IHtcbiAgW2tleTogc3RyaW5nXTogVDtcbn07XG5cbmZ1bmN0aW9uIGV4dHJhY3RIb3N0QmluZGluZ3MoXG4gICAgbWV0YWRhdGE6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBtZW1iZXJzOiBDbGFzc01lbWJlcltdLCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgY29yZU1vZHVsZTogc3RyaW5nIHwgdW5kZWZpbmVkKTogUGFyc2VkSG9zdEJpbmRpbmdzIHtcbiAgbGV0IGhvc3RNZXRhZGF0YTogU3RyaW5nTWFwPHN0cmluZ3xFeHByZXNzaW9uPiA9IHt9O1xuICBpZiAobWV0YWRhdGEuaGFzKCdob3N0JykpIHtcbiAgICBjb25zdCBleHByID0gbWV0YWRhdGEuZ2V0KCdob3N0JykgITtcbiAgICBjb25zdCBob3N0TWV0YU1hcCA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICBpZiAoIShob3N0TWV0YU1hcCBpbnN0YW5jZW9mIE1hcCkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgZXhwciwgYERlY29yYXRvciBob3N0IG1ldGFkYXRhIG11c3QgYmUgYW4gb2JqZWN0YCk7XG4gICAgfVxuICAgIGhvc3RNZXRhTWFwLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIC8vIFJlc29sdmUgRW51bSByZWZlcmVuY2VzIHRvIHRoZWlyIGRlY2xhcmVkIHZhbHVlLlxuICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRW51bVZhbHVlKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUucmVzb2x2ZWQ7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBgRGVjb3JhdG9yIGhvc3QgbWV0YWRhdGEgbXVzdCBiZSBhIHN0cmluZyAtPiBzdHJpbmcgb2JqZWN0LCBidXQgZm91bmQgdW5wYXJzZWFibGUga2V5ICR7a2V5fWApO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHZhbHVlID09ICdzdHJpbmcnKSB7XG4gICAgICAgIGhvc3RNZXRhZGF0YVtrZXldID0gdmFsdWU7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgIGhvc3RNZXRhZGF0YVtrZXldID0gbmV3IFdyYXBwZWROb2RlRXhwcih2YWx1ZS5ub2RlIGFzIHRzLkV4cHJlc3Npb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYERlY29yYXRvciBob3N0IG1ldGFkYXRhIG11c3QgYmUgYSBzdHJpbmcgLT4gc3RyaW5nIG9iamVjdCwgYnV0IGZvdW5kIHVucGFyc2VhYmxlIHZhbHVlICR7dmFsdWV9YCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBiaW5kaW5ncyA9IHBhcnNlSG9zdEJpbmRpbmdzKGhvc3RNZXRhZGF0YSk7XG5cbiAgLy8gVE9ETzogY3JlYXRlIGFuZCBwcm92aWRlIHByb3BlciBzb3VyY2VTcGFuIHRvIG1ha2UgZXJyb3IgbWVzc2FnZSBtb3JlIGRlc2NyaXB0aXZlIChGVy05OTUpXG4gIGNvbnN0IGVycm9ycyA9IHZlcmlmeUhvc3RCaW5kaW5ncyhiaW5kaW5ncywgLyogc291cmNlU3BhbiAqLyBudWxsICEpO1xuICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIC8vIFRPRE86IHByb3ZpZGUgbW9yZSBncmFudWxhciBkaWFnbm9zdGljIGFuZCBvdXRwdXQgc3BlY2lmaWMgaG9zdCBleHByZXNzaW9uIHRoYXQgdHJpZ2dlcmVkXG4gICAgICAgIC8vIGFuIGVycm9yIGluc3RlYWQgb2YgdGhlIHdob2xlIGhvc3Qgb2JqZWN0XG4gICAgICAgIEVycm9yQ29kZS5IT1NUX0JJTkRJTkdfUEFSU0VfRVJST1IsIG1ldGFkYXRhLmdldCgnaG9zdCcpICEsXG4gICAgICAgIGVycm9ycy5tYXAoKGVycm9yOiBQYXJzZUVycm9yKSA9PiBlcnJvci5tc2cpLmpvaW4oJ1xcbicpKTtcbiAgfVxuXG4gIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVycywgJ0hvc3RCaW5kaW5nJywgY29yZU1vZHVsZSlcbiAgICAgIC5mb3JFYWNoKCh7bWVtYmVyLCBkZWNvcmF0b3JzfSkgPT4ge1xuICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgICAgICBsZXQgaG9zdFByb3BlcnR5TmFtZTogc3RyaW5nID0gbWVtYmVyLm5hbWU7XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBASG9zdEJpbmRpbmcoKSBjYW4gaGF2ZSBhdCBtb3N0IG9uZSBhcmd1bWVudGApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEBIb3N0QmluZGluZygpJ3MgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBob3N0UHJvcGVydHlOYW1lID0gcmVzb2x2ZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYmluZGluZ3MucHJvcGVydGllc1tob3N0UHJvcGVydHlOYW1lXSA9IG1lbWJlci5uYW1lO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVycywgJ0hvc3RMaXN0ZW5lcicsIGNvcmVNb2R1bGUpXG4gICAgICAuZm9yRWFjaCgoe21lbWJlciwgZGVjb3JhdG9yc30pID0+IHtcbiAgICAgICAgZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICAgICAgbGV0IGV2ZW50TmFtZTogc3RyaW5nID0gbWVtYmVyLm5hbWU7XG4gICAgICAgICAgbGV0IGFyZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5hcmdzWzJdLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0TGlzdGVuZXIoKSBjYW4gaGF2ZSBhdCBtb3N0IHR3byBhcmd1bWVudHNgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBkZWNvcmF0b3IuYXJnc1swXSxcbiAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyKCkncyBldmVudCBuYW1lIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXZlbnROYW1lID0gcmVzb2x2ZWQ7XG5cbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRBcmdzID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzFdKTtcbiAgICAgICAgICAgICAgaWYgKCFpc1N0cmluZ0FycmF5T3JEaWUocmVzb2x2ZWRBcmdzLCAnQEhvc3RMaXN0ZW5lci5hcmdzJykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZGVjb3JhdG9yLmFyZ3NbMV0sXG4gICAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyIHNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nIGFycmF5YCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXJncyA9IHJlc29sdmVkQXJncztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBiaW5kaW5ncy5saXN0ZW5lcnNbZXZlbnROYW1lXSA9IGAke21lbWJlci5uYW1lfSgke2FyZ3Muam9pbignLCcpfSlgO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICByZXR1cm4gYmluZGluZ3M7XG59XG5cbmNvbnN0IFFVRVJZX1RZUEVTID0gbmV3IFNldChbXG4gICdDb250ZW50Q2hpbGQnLFxuICAnQ29udGVudENoaWxkcmVuJyxcbiAgJ1ZpZXdDaGlsZCcsXG4gICdWaWV3Q2hpbGRyZW4nLFxuXSk7XG4iXX0=