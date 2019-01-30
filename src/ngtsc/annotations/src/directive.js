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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/directive", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_OBJECT = {};
    var DirectiveDecoratorHandler = /** @class */ (function () {
        function DirectiveDecoratorHandler(reflector, evaluator, scopeRegistry, isCore) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.scopeRegistry = scopeRegistry;
            this.isCore = isCore;
        }
        DirectiveDecoratorHandler.prototype.detect = function (node, decorators) {
            var _this = this;
            if (!decorators) {
                return undefined;
            }
            return decorators.find(function (decorator) { return decorator.name === 'Directive' && (_this.isCore || util_1.isAngularCore(decorator)); });
        };
        DirectiveDecoratorHandler.prototype.analyze = function (node, decorator) {
            var directiveResult = extractDirectiveMetadata(node, decorator, this.reflector, this.evaluator, this.isCore);
            var analysis = directiveResult && directiveResult.metadata;
            // If the directive has a selector, it should be registered with the `SelectorScopeRegistry` so
            // when this directive appears in an `@NgModule` scope, its selector can be determined.
            if (analysis && analysis.selector !== null) {
                var ref = new imports_1.ResolvedReference(node, node.name);
                this.scopeRegistry.registerDirective(node, tslib_1.__assign({ ref: ref, directive: ref, name: node.name.text, selector: analysis.selector, exportAs: analysis.exportAs, inputs: analysis.inputs, outputs: analysis.outputs, queries: analysis.queries.map(function (query) { return query.propertyName; }), isComponent: false }, util_1.extractDirectiveGuards(node, this.reflector)));
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
        var meta = util_1.unwrapExpression(decorator.args[0]);
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
        var usesInheritance = clazz.heritageClauses !== undefined &&
            clazz.heritageClauses.some(function (hc) { return hc.token === ts.SyntaxKind.ExtendsKeyword; });
        var metadata = {
            name: clazz.name.text,
            deps: util_1.getConstructorDependencies(clazz, reflector, isCore), host: host,
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
        var node = util_1.unwrapForwardRef(args[0], reflector);
        var arg = evaluator.evaluate(node);
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
            var optionsExpr = util_1.unwrapExpression(args[1]);
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
        }
        else if (args.length > 2) {
            // Too many arguments.
            throw new Error("@" + name + " has too many arguments");
        }
        return {
            propertyName: propertyName, predicate: predicate, first: first, descendants: descendants, read: read,
        };
    }
    exports.extractQueryMetadata = extractQueryMetadata;
    function extractQueriesFromDecorator(queryData, reflector, evaluator, isCore) {
        var content = [], view = [];
        var expr = util_1.unwrapExpression(queryData);
        if (!ts.isObjectLiteralExpression(queryData)) {
            throw new Error("queries metadata must be an object literal");
        }
        reflection_1.reflectObjectLiteral(queryData).forEach(function (queryExpr, propertyName) {
            queryExpr = util_1.unwrapExpression(queryExpr);
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
                if (typeof value !== 'string' || typeof key !== 'string') {
                    throw new Error("Decorator host metadata must be a string -> string object, got " + value);
                }
                hostMetadata[key] = value;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFpTztJQUNqTywrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUEyRDtJQUUzRCx5RUFBNkk7SUFHN0kscUZBQXdEO0lBRXhELDZFQUE2SDtJQUU3SCxJQUFNLFlBQVksR0FBNEIsRUFBRSxDQUFDO0lBTWpEO1FBRUUsbUNBQ1ksU0FBeUIsRUFBVSxTQUEyQixFQUM5RCxhQUFvQyxFQUFVLE1BQWU7WUFEN0QsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUM5RCxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQUcsQ0FBQztRQUU3RSwwQ0FBTSxHQUFOLFVBQU8sSUFBb0IsRUFBRSxVQUE0QjtZQUF6RCxpQkFNQztZQUxDLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQ2xCLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksQ0FBQyxLQUFJLENBQUMsTUFBTSxJQUFJLG9CQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBM0UsQ0FBMkUsQ0FBQyxDQUFDO1FBQ2hHLENBQUM7UUFFRCwyQ0FBTyxHQUFQLFVBQVEsSUFBeUIsRUFBRSxTQUFvQjtZQUNyRCxJQUFNLGVBQWUsR0FDakIsd0JBQXdCLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFB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QyxNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDakQsd0RBQXdELENBQUMsQ0FBQztxQkFDL0Q7b0JBRUQsU0FBUyxHQUFHLFFBQVEsQ0FBQztvQkFFckIsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7d0JBQy9CLElBQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUMzRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxFQUFFLG9CQUFvQixDQUFDLEVBQUU7NEJBQzNELE1BQU0sSUFBSSxrQ0FBb0IsQ0FDMUIsdUJBQVMsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNqRCxzREFBc0QsQ0FBQyxDQUFDO3lCQUM3RDt3QkFDRCxJQUFJLEdBQUcsWUFBWSxDQUFDO3FCQUNyQjtpQkFDRjtnQkFFRCxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFNLE1BQU0sQ0FBQyxJQUFJLFNBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBRyxDQUFDO1lBQ3RFLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDUCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRUQsSUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDMUIsY0FBYztRQUNkLGlCQUFpQjtRQUNqQixXQUFXO1FBQ1gsY0FBYztLQUNmLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIEV4cHJlc3Npb24sIFBhcnNlRXJyb3IsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFIzUXVlcnlNZXRhZGF0YSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVEaXJlY3RpdmVGcm9tTWV0YWRhdGEsIG1ha2VCaW5kaW5nUGFyc2VyLCBwYXJzZUhvc3RCaW5kaW5ncywgdmVyaWZ5SG9zdEJpbmRpbmdzfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge1JlZmVyZW5jZSwgUmVzb2x2ZWRSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1NlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9zZWxlY3Rvcl9zY29wZSc7XG5pbXBvcnQge2V4dHJhY3REaXJlY3RpdmVHdWFyZHMsIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlLCB1bndyYXBFeHByZXNzaW9uLCB1bndyYXBGb3J3YXJkUmVmfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9PQkpFQ1Q6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlSGFuZGxlckRhdGEge1xuICBtZXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xufVxuZXhwb3J0IGNsYXNzIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8RGlyZWN0aXZlSGFuZGxlckRhdGEsIERlY29yYXRvcj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4pIHt9XG5cbiAgZGV0ZWN0KG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycy5maW5kKFxuICAgICAgICBkZWNvcmF0b3IgPT4gZGVjb3JhdG9yLm5hbWUgPT09ICdEaXJlY3RpdmUnICYmICh0aGlzLmlzQ29yZSB8fCBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpKTtcbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxEaXJlY3RpdmVIYW5kbGVyRGF0YT4ge1xuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9XG4gICAgICAgIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShub2RlLCBkZWNvcmF0b3IsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5pc0NvcmUpO1xuICAgIGNvbnN0IGFuYWx5c2lzID0gZGlyZWN0aXZlUmVzdWx0ICYmIGRpcmVjdGl2ZVJlc3VsdC5tZXRhZGF0YTtcblxuICAgIC8vIElmIHRoZSBkaXJlY3RpdmUgaGFzIGEgc2VsZWN0b3IsIGl0IHNob3VsZCBiZSByZWdpc3RlcmVkIHdpdGggdGhlIGBTZWxlY3RvclNjb3BlUmVnaXN0cnlgIHNvXG4gICAgLy8gd2hlbiB0aGlzIGRpcmVjdGl2ZSBhcHBlYXJzIGluIGFuIGBATmdNb2R1bGVgIHNjb3BlLCBpdHMgc2VsZWN0b3IgY2FuIGJlIGRldGVybWluZWQuXG4gICAgaWYgKGFuYWx5c2lzICYmIGFuYWx5c2lzLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICBsZXQgcmVmID0gbmV3IFJlc29sdmVkUmVmZXJlbmNlKG5vZGUsIG5vZGUubmFtZSAhKTtcbiAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZShub2RlLCB7XG4gICAgICAgIHJlZixcbiAgICAgICAgZGlyZWN0aXZlOiByZWYsXG4gICAgICAgIG5hbWU6IG5vZGUubmFtZSAhLnRleHQsXG4gICAgICAgIHNlbGVjdG9yOiBhbmFseXNpcy5zZWxlY3RvcixcbiAgICAgICAgZXhwb3J0QXM6IGFuYWx5c2lzLmV4cG9ydEFzLFxuICAgICAgICBpbnB1dHM6IGFuYWx5c2lzLmlucHV0cyxcbiAgICAgICAgb3V0cHV0czogYW5hbHlzaXMub3V0cHV0cyxcbiAgICAgICAgcXVlcmllczogYW5hbHlzaXMucXVlcmllcy5tYXAocXVlcnkgPT4gcXVlcnkucHJvcGVydHlOYW1lKSxcbiAgICAgICAgaXNDb21wb25lbnQ6IGZhbHNlLCAuLi5leHRyYWN0RGlyZWN0aXZlR3VhcmRzKG5vZGUsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChhbmFseXNpcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG1ldGE6IGFuYWx5c2lzLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogRGlyZWN0aXZlSGFuZGxlckRhdGEsIHBvb2w6IENvbnN0YW50UG9vbCk6XG4gICAgICBDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCByZXMgPSBjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEsIHBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyKCkpO1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSByZXMuc3RhdGVtZW50cztcbiAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBzdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICduZ0RpcmVjdGl2ZURlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sXG4gICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzLFxuICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBleHRyYWN0IG1ldGFkYXRhIGZyb20gYSBgRGlyZWN0aXZlYCBvciBgQ29tcG9uZW50YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLCBpc0NvcmU6IGJvb2xlYW4sIGRlZmF1bHRTZWxlY3Rvcjogc3RyaW5nIHwgbnVsbCA9IG51bGwpOiB7XG4gIGRlY29yYXRvcjogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gIG1ldGFkYXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhLFxuICBkZWNvcmF0ZWRFbGVtZW50czogQ2xhc3NNZW1iZXJbXSxcbn18dW5kZWZpbmVkIHtcbiAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yYCk7XG4gIH1cbiAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLCBgQCR7ZGVjb3JhdG9yLm5hbWV9IGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgfVxuICBjb25zdCBkaXJlY3RpdmUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICBpZiAoZGlyZWN0aXZlLmhhcygnaml0JykpIHtcbiAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgbWVtYmVycyA9IHJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eik7XG5cbiAgLy8gUHJlY29tcHV0ZSBhIGxpc3Qgb2YgdHMuQ2xhc3NFbGVtZW50cyB0aGF0IGhhdmUgZGVjb3JhdG9ycy4gVGhpcyBpbmNsdWRlcyB0aGluZ3MgbGlrZSBASW5wdXQsXG4gIC8vIEBPdXRwdXQsIEBIb3N0QmluZGluZywgZXRjLlxuICBjb25zdCBkZWNvcmF0ZWRFbGVtZW50cyA9XG4gICAgICBtZW1iZXJzLmZpbHRlcihtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIuZGVjb3JhdG9ycyAhPT0gbnVsbCk7XG5cbiAgY29uc3QgY29yZU1vZHVsZSA9IGlzQ29yZSA/IHVuZGVmaW5lZCA6ICdAYW5ndWxhci9jb3JlJztcblxuICAvLyBDb25zdHJ1Y3QgdGhlIG1hcCBvZiBpbnB1dHMgYm90aCBmcm9tIHRoZSBARGlyZWN0aXZlL0BDb21wb25lbnRcbiAgLy8gZGVjb3JhdG9yLCBhbmQgdGhlIGRlY29yYXRlZFxuICAvLyBmaWVsZHMuXG4gIGNvbnN0IGlucHV0c0Zyb21NZXRhID0gcGFyc2VGaWVsZFRvUHJvcGVydHlNYXBwaW5nKGRpcmVjdGl2ZSwgJ2lucHV0cycsIGV2YWx1YXRvcik7XG4gIGNvbnN0IGlucHV0c0Zyb21GaWVsZHMgPSBwYXJzZURlY29yYXRlZEZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdJbnB1dCcsIGNvcmVNb2R1bGUpLCBldmFsdWF0b3IsXG4gICAgICByZXNvbHZlSW5wdXQpO1xuXG4gIC8vIEFuZCBvdXRwdXRzLlxuICBjb25zdCBvdXRwdXRzRnJvbU1ldGEgPSBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoZGlyZWN0aXZlLCAnb3V0cHV0cycsIGV2YWx1YXRvcik7XG4gIGNvbnN0IG91dHB1dHNGcm9tRmllbGRzID0gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnT3V0cHV0JywgY29yZU1vZHVsZSksIGV2YWx1YXRvcixcbiAgICAgIHJlc29sdmVPdXRwdXQpIGFze1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfTtcbiAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHF1ZXJpZXMuXG4gIGNvbnN0IGNvbnRlbnRDaGlsZEZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdDb250ZW50Q2hpbGQnLCBjb3JlTW9kdWxlKSwgcmVmbGVjdG9yLFxuICAgICAgZXZhbHVhdG9yKTtcbiAgY29uc3QgY29udGVudENoaWxkcmVuRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0NvbnRlbnRDaGlsZHJlbicsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuXG4gIGNvbnN0IHF1ZXJpZXMgPSBbLi4uY29udGVudENoaWxkRnJvbUZpZWxkcywgLi4uY29udGVudENoaWxkcmVuRnJvbUZpZWxkc107XG5cbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ3F1ZXJpZXMnKSkge1xuICAgIGNvbnN0IHF1ZXJpZXNGcm9tRGVjb3JhdG9yID1cbiAgICAgICAgZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yKGRpcmVjdGl2ZS5nZXQoJ3F1ZXJpZXMnKSAhLCByZWZsZWN0b3IsIGV2YWx1YXRvciwgaXNDb3JlKTtcbiAgICBxdWVyaWVzLnB1c2goLi4ucXVlcmllc0Zyb21EZWNvcmF0b3IuY29udGVudCk7XG4gIH1cblxuICAvLyBQYXJzZSB0aGUgc2VsZWN0b3IuXG4gIGxldCBzZWxlY3RvciA9IGRlZmF1bHRTZWxlY3RvcjtcbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ3NlbGVjdG9yJykpIHtcbiAgICBjb25zdCBleHByID0gZGlyZWN0aXZlLmdldCgnc2VsZWN0b3InKSAhO1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCBgc2VsZWN0b3IgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBzZWxlY3RvciA9IHJlc29sdmVkO1xuICB9XG4gIGlmICghc2VsZWN0b3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYERpcmVjdGl2ZSAke2NsYXp6Lm5hbWUgIS50ZXh0fSBoYXMgbm8gc2VsZWN0b3IsIHBsZWFzZSBhZGQgaXQhYCk7XG4gIH1cblxuICBjb25zdCBob3N0ID0gZXh0cmFjdEhvc3RCaW5kaW5ncyhkaXJlY3RpdmUsIGRlY29yYXRlZEVsZW1lbnRzLCBldmFsdWF0b3IsIGNvcmVNb2R1bGUpO1xuXG4gIGNvbnN0IHByb3ZpZGVyczogRXhwcmVzc2lvbnxudWxsID1cbiAgICAgIGRpcmVjdGl2ZS5oYXMoJ3Byb3ZpZGVycycpID8gbmV3IFdyYXBwZWROb2RlRXhwcihkaXJlY3RpdmUuZ2V0KCdwcm92aWRlcnMnKSAhKSA6IG51bGw7XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGBuZ09uQ2hhbmdlc2AgaXMgYSBsaWZlY3ljbGUgaG9vayBkZWZpbmVkIG9uIHRoZSBjb21wb25lbnQuXG4gIGNvbnN0IHVzZXNPbkNoYW5nZXMgPSBtZW1iZXJzLnNvbWUoXG4gICAgICBtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJlxuICAgICAgICAgIG1lbWJlci5uYW1lID09PSAnbmdPbkNoYW5nZXMnKTtcblxuICAvLyBQYXJzZSBleHBvcnRBcy5cbiAgbGV0IGV4cG9ydEFzOiBzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ2V4cG9ydEFzJykpIHtcbiAgICBjb25zdCBleHByID0gZGlyZWN0aXZlLmdldCgnZXhwb3J0QXMnKSAhO1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCBgZXhwb3J0QXMgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBleHBvcnRBcyA9IHJlc29sdmVkLnNwbGl0KCcsJykubWFwKHBhcnQgPT4gcGFydC50cmltKCkpO1xuICB9XG5cbiAgLy8gRGV0ZWN0IGlmIHRoZSBjb21wb25lbnQgaW5oZXJpdHMgZnJvbSBhbm90aGVyIGNsYXNzXG4gIGNvbnN0IHVzZXNJbmhlcml0YW5jZSA9IGNsYXp6Lmhlcml0YWdlQ2xhdXNlcyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICBjbGF6ei5oZXJpdGFnZUNsYXVzZXMuc29tZShoYyA9PiBoYy50b2tlbiA9PT0gdHMuU3ludGF4S2luZC5FeHRlbmRzS2V5d29yZCk7XG4gIGNvbnN0IG1ldGFkYXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhID0ge1xuICAgIG5hbWU6IGNsYXp6Lm5hbWUgIS50ZXh0LFxuICAgIGRlcHM6IGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGlzQ29yZSksIGhvc3QsXG4gICAgbGlmZWN5Y2xlOiB7XG4gICAgICAgIHVzZXNPbkNoYW5nZXMsXG4gICAgfSxcbiAgICBpbnB1dHM6IHsuLi5pbnB1dHNGcm9tTWV0YSwgLi4uaW5wdXRzRnJvbUZpZWxkc30sXG4gICAgb3V0cHV0czogey4uLm91dHB1dHNGcm9tTWV0YSwgLi4ub3V0cHV0c0Zyb21GaWVsZHN9LCBxdWVyaWVzLCBzZWxlY3RvcixcbiAgICB0eXBlOiBuZXcgV3JhcHBlZE5vZGVFeHByKGNsYXp6Lm5hbWUgISksXG4gICAgdHlwZUFyZ3VtZW50Q291bnQ6IHJlZmxlY3Rvci5nZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6KSB8fCAwLFxuICAgIHR5cGVTb3VyY2VTcGFuOiBudWxsICEsIHVzZXNJbmhlcml0YW5jZSwgZXhwb3J0QXMsIHByb3ZpZGVyc1xuICB9O1xuICByZXR1cm4ge2RlY29yYXRlZEVsZW1lbnRzLCBkZWNvcmF0b3I6IGRpcmVjdGl2ZSwgbWV0YWRhdGF9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFF1ZXJ5TWV0YWRhdGEoXG4gICAgZXhwck5vZGU6IHRzLk5vZGUsIG5hbWU6IHN0cmluZywgYXJnczogUmVhZG9ubHlBcnJheTx0cy5FeHByZXNzaW9uPiwgcHJvcGVydHlOYW1lOiBzdHJpbmcsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogUjNRdWVyeU1ldGFkYXRhIHtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBleHByTm9kZSwgYEAke25hbWV9IG11c3QgaGF2ZSBhcmd1bWVudHNgKTtcbiAgfVxuICBjb25zdCBmaXJzdCA9IG5hbWUgPT09ICdWaWV3Q2hpbGQnIHx8IG5hbWUgPT09ICdDb250ZW50Q2hpbGQnO1xuICBjb25zdCBub2RlID0gdW53cmFwRm9yd2FyZFJlZihhcmdzWzBdLCByZWZsZWN0b3IpO1xuICBjb25zdCBhcmcgPSBldmFsdWF0b3IuZXZhbHVhdGUobm9kZSk7XG5cbiAgLy8gRXh0cmFjdCB0aGUgcHJlZGljYXRlXG4gIGxldCBwcmVkaWNhdGU6IEV4cHJlc3Npb258c3RyaW5nW118bnVsbCA9IG51bGw7XG4gIGlmIChhcmcgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICBwcmVkaWNhdGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKG5vZGUpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgcHJlZGljYXRlID0gW2FyZ107XG4gIH0gZWxzZSBpZiAoaXNTdHJpbmdBcnJheU9yRGllKGFyZywgJ0AnICsgbmFtZSkpIHtcbiAgICBwcmVkaWNhdGUgPSBhcmcgYXMgc3RyaW5nW107XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIG5vZGUsIGBAJHtuYW1lfSBwcmVkaWNhdGUgY2Fubm90IGJlIGludGVycHJldGVkYCk7XG4gIH1cblxuICAvLyBFeHRyYWN0IHRoZSByZWFkIGFuZCBkZXNjZW5kYW50cyBvcHRpb25zLlxuICBsZXQgcmVhZDogRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgLy8gVGhlIGRlZmF1bHQgdmFsdWUgZm9yIGRlc2NlbmRhbnRzIGlzIHRydWUgZm9yIGV2ZXJ5IGRlY29yYXRvciBleGNlcHQgQENvbnRlbnRDaGlsZHJlbi5cbiAgbGV0IGRlc2NlbmRhbnRzOiBib29sZWFuID0gbmFtZSAhPT0gJ0NvbnRlbnRDaGlsZHJlbic7XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMikge1xuICAgIGNvbnN0IG9wdGlvbnNFeHByID0gdW53cmFwRXhwcmVzc2lvbihhcmdzWzFdKTtcbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ob3B0aW9uc0V4cHIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEAke25hbWV9IG9wdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbGApO1xuICAgIH1cbiAgICBjb25zdCBvcHRpb25zID0gcmVmbGVjdE9iamVjdExpdGVyYWwob3B0aW9uc0V4cHIpO1xuICAgIGlmIChvcHRpb25zLmhhcygncmVhZCcpKSB7XG4gICAgICByZWFkID0gbmV3IFdyYXBwZWROb2RlRXhwcihvcHRpb25zLmdldCgncmVhZCcpICEpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmhhcygnZGVzY2VuZGFudHMnKSkge1xuICAgICAgY29uc3QgZGVzY2VuZGFudHNWYWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShvcHRpb25zLmdldCgnZGVzY2VuZGFudHMnKSAhKTtcbiAgICAgIGlmICh0eXBlb2YgZGVzY2VuZGFudHNWYWx1ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQCR7bmFtZX0gb3B0aW9ucy5kZXNjZW5kYW50cyBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgfVxuICAgICAgZGVzY2VuZGFudHMgPSBkZXNjZW5kYW50c1ZhbHVlO1xuICAgIH1cbiAgfSBlbHNlIGlmIChhcmdzLmxlbmd0aCA+IDIpIHtcbiAgICAvLyBUb28gbWFueSBhcmd1bWVudHMuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBAJHtuYW1lfSBoYXMgdG9vIG1hbnkgYXJndW1lbnRzYCk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgICAgcHJvcGVydHlOYW1lLCBwcmVkaWNhdGUsIGZpcnN0LCBkZXNjZW5kYW50cywgcmVhZCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RRdWVyaWVzRnJvbURlY29yYXRvcihcbiAgICBxdWVyeURhdGE6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBpc0NvcmU6IGJvb2xlYW4pOiB7XG4gIGNvbnRlbnQ6IFIzUXVlcnlNZXRhZGF0YVtdLFxuICB2aWV3OiBSM1F1ZXJ5TWV0YWRhdGFbXSxcbn0ge1xuICBjb25zdCBjb250ZW50OiBSM1F1ZXJ5TWV0YWRhdGFbXSA9IFtdLCB2aWV3OiBSM1F1ZXJ5TWV0YWRhdGFbXSA9IFtdO1xuICBjb25zdCBleHByID0gdW53cmFwRXhwcmVzc2lvbihxdWVyeURhdGEpO1xuICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24ocXVlcnlEYXRhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgcXVlcmllcyBtZXRhZGF0YSBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsYCk7XG4gIH1cbiAgcmVmbGVjdE9iamVjdExpdGVyYWwocXVlcnlEYXRhKS5mb3JFYWNoKChxdWVyeUV4cHIsIHByb3BlcnR5TmFtZSkgPT4ge1xuICAgIHF1ZXJ5RXhwciA9IHVud3JhcEV4cHJlc3Npb24ocXVlcnlFeHByKTtcbiAgICBpZiAoIXRzLmlzTmV3RXhwcmVzc2lvbihxdWVyeUV4cHIpIHx8ICF0cy5pc0lkZW50aWZpZXIocXVlcnlFeHByLmV4cHJlc3Npb24pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHF1ZXJ5IG1ldGFkYXRhIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgYSBxdWVyeSB0eXBlYCk7XG4gICAgfVxuICAgIGNvbnN0IHR5cGUgPSByZWZsZWN0b3IuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHF1ZXJ5RXhwci5leHByZXNzaW9uKTtcbiAgICBpZiAodHlwZSA9PT0gbnVsbCB8fCAoIWlzQ29yZSAmJiB0eXBlLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykgfHxcbiAgICAgICAgIVFVRVJZX1RZUEVTLmhhcyh0eXBlLm5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHF1ZXJ5IG1ldGFkYXRhIG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgYSBxdWVyeSB0eXBlYCk7XG4gICAgfVxuXG4gICAgY29uc3QgcXVlcnkgPSBleHRyYWN0UXVlcnlNZXRhZGF0YShcbiAgICAgICAgcXVlcnlFeHByLCB0eXBlLm5hbWUsIHF1ZXJ5RXhwci5hcmd1bWVudHMgfHwgW10sIHByb3BlcnR5TmFtZSwgcmVmbGVjdG9yLCBldmFsdWF0b3IpO1xuICAgIGlmICh0eXBlLm5hbWUuc3RhcnRzV2l0aCgnQ29udGVudCcpKSB7XG4gICAgICBjb250ZW50LnB1c2gocXVlcnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2aWV3LnB1c2gocXVlcnkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiB7Y29udGVudCwgdmlld307XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nQXJyYXlPckRpZSh2YWx1ZTogYW55LCBuYW1lOiBzdHJpbmcpOiB2YWx1ZSBpcyBzdHJpbmdbXSB7XG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZVtpXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJlc29sdmUgJHtuYW1lfVske2l9XSB0byBhIHN0cmluZ2ApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRmllbGRBcnJheVZhbHVlKFxuICAgIGRpcmVjdGl2ZTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIGZpZWxkOiBzdHJpbmcsIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IG51bGx8XG4gICAgc3RyaW5nW10ge1xuICBpZiAoIWRpcmVjdGl2ZS5oYXMoZmllbGQpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBSZXNvbHZlIHRoZSBmaWVsZCBvZiBpbnRlcmVzdCBmcm9tIHRoZSBkaXJlY3RpdmUgbWV0YWRhdGEgdG8gYSBzdHJpbmdbXS5cbiAgY29uc3QgdmFsdWUgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGlyZWN0aXZlLmdldChmaWVsZCkgISk7XG4gIGlmICghaXNTdHJpbmdBcnJheU9yRGllKHZhbHVlLCBmaWVsZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byByZXNvbHZlIEBEaXJlY3RpdmUuJHtmaWVsZH1gKTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBJbnRlcnByZXQgcHJvcGVydHkgbWFwcGluZyBmaWVsZHMgb24gdGhlIGRlY29yYXRvciAoZS5nLiBpbnB1dHMgb3Igb3V0cHV0cykgYW5kIHJldHVybiB0aGVcbiAqIGNvcnJlY3RseSBzaGFwZWQgbWV0YWRhdGEgb2JqZWN0LlxuICovXG5mdW5jdGlvbiBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoXG4gICAgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZyxcbiAgICBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiB7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9IHtcbiAgY29uc3QgbWV0YVZhbHVlcyA9IHBhcnNlRmllbGRBcnJheVZhbHVlKGRpcmVjdGl2ZSwgZmllbGQsIGV2YWx1YXRvcik7XG4gIGlmICghbWV0YVZhbHVlcykge1xuICAgIHJldHVybiBFTVBUWV9PQkpFQ1Q7XG4gIH1cblxuICByZXR1cm4gbWV0YVZhbHVlcy5yZWR1Y2UoXG4gICAgICAocmVzdWx0cywgdmFsdWUpID0+IHtcbiAgICAgICAgLy8gRWl0aGVyIHRoZSB2YWx1ZSBpcyAnZmllbGQnIG9yICdmaWVsZDogcHJvcGVydHknLiBJbiB0aGUgZmlyc3QgY2FzZSwgYHByb3BlcnR5YCB3aWxsXG4gICAgICAgIC8vIGJlIHVuZGVmaW5lZCwgaW4gd2hpY2ggY2FzZSB0aGUgZmllbGQgbmFtZSBzaG91bGQgYWxzbyBiZSB1c2VkIGFzIHRoZSBwcm9wZXJ0eSBuYW1lLlxuICAgICAgICBjb25zdCBbZmllbGQsIHByb3BlcnR5XSA9IHZhbHVlLnNwbGl0KCc6JywgMikubWFwKHN0ciA9PiBzdHIudHJpbSgpKTtcbiAgICAgICAgcmVzdWx0c1tmaWVsZF0gPSBwcm9wZXJ0eSB8fCBmaWVsZDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9LFxuICAgICAge30gYXN7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9KTtcbn1cblxuLyoqXG4gKiBQYXJzZSBwcm9wZXJ0eSBkZWNvcmF0b3JzIChlLmcuIGBJbnB1dGAgb3IgYE91dHB1dGApIGFuZCByZXR1cm4gdGhlIGNvcnJlY3RseSBzaGFwZWQgbWV0YWRhdGFcbiAqIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgZmllbGRzOiB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBtYXBWYWx1ZVJlc29sdmVyOiAocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZykgPT5cbiAgICAgICAgc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXSk6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZyB8IFtzdHJpbmcsIHN0cmluZ119IHtcbiAgcmV0dXJuIGZpZWxkcy5yZWR1Y2UoXG4gICAgICAocmVzdWx0cywgZmllbGQpID0+IHtcbiAgICAgICAgY29uc3QgZmllbGROYW1lID0gZmllbGQubWVtYmVyLm5hbWU7XG4gICAgICAgIGZpZWxkLmRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgICAgIC8vIFRoZSBkZWNvcmF0b3IgZWl0aGVyIGRvZXNuJ3QgaGF2ZSBhbiBhcmd1bWVudCAoQElucHV0KCkpIGluIHdoaWNoIGNhc2UgdGhlIHByb3BlcnR5XG4gICAgICAgICAgLy8gbmFtZSBpcyB1c2VkLCBvciBpdCBoYXMgb25lIGFyZ3VtZW50IChAT3V0cHV0KCduYW1lZCcpKS5cbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdHNbZmllbGROYW1lXSA9IGZpZWxkTmFtZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgY29uc3QgcHJvcGVydHkgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCByZXNvbHZlIHRvIGEgc3RyaW5nYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHRzW2ZpZWxkTmFtZV0gPSBtYXBWYWx1ZVJlc29sdmVyKHByb3BlcnR5LCBmaWVsZE5hbWUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUb28gbWFueSBhcmd1bWVudHMuXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgYERlY29yYXRvciBtdXN0IGhhdmUgMCBvciAxIGFyZ3VtZW50cywgZ290ICR7ZGVjb3JhdG9yLmFyZ3MubGVuZ3RofSBhcmd1bWVudChzKWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfSxcbiAgICAgIHt9IGFze1tmaWVsZDogc3RyaW5nXTogc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXX0pO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlSW5wdXQocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZyk6IFtzdHJpbmcsIHN0cmluZ10ge1xuICByZXR1cm4gW3B1YmxpY05hbWUsIGludGVybmFsTmFtZV07XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVPdXRwdXQocHVibGljTmFtZTogc3RyaW5nLCBpbnRlcm5hbE5hbWU6IHN0cmluZykge1xuICByZXR1cm4gcHVibGljTmFtZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgIGZpZWxkczoge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfVtdLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IFIzUXVlcnlNZXRhZGF0YVtdIHtcbiAgcmV0dXJuIGZpZWxkcy5tYXAoKHttZW1iZXIsIGRlY29yYXRvcnN9KSA9PiB7XG4gICAgLy8gVGhyb3cgaW4gY2FzZSBvZiBgQElucHV0KCkgQENvbnRlbnRDaGlsZCgnZm9vJykgZm9vOiBhbnlgLCB3aGljaCBpcyBub3Qgc3VwcG9ydGVkIGluIEl2eVxuICAgIGlmIChtZW1iZXIuZGVjb3JhdG9ycyAhLnNvbWUodiA9PiB2Lm5hbWUgPT09ICdJbnB1dCcpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBjb21iaW5lIEBJbnB1dCBkZWNvcmF0b3JzIHdpdGggcXVlcnkgZGVjb3JhdG9yc2ApO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGhhdmUgbXVsdGlwbGUgcXVlcnkgZGVjb3JhdG9ycyBvbiB0aGUgc2FtZSBjbGFzcyBtZW1iZXJgKTtcbiAgICB9IGVsc2UgaWYgKCFpc1Byb3BlcnR5VHlwZU1lbWJlcihtZW1iZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFF1ZXJ5IGRlY29yYXRvciBtdXN0IGdvIG9uIGEgcHJvcGVydHktdHlwZSBtZW1iZXJgKTtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZGVjb3JhdG9yc1swXTtcbiAgICByZXR1cm4gZXh0cmFjdFF1ZXJ5TWV0YWRhdGEoXG4gICAgICAgIGRlY29yYXRvci5ub2RlLCBkZWNvcmF0b3IubmFtZSwgZGVjb3JhdG9yLmFyZ3MgfHwgW10sIG1lbWJlci5uYW1lLCByZWZsZWN0b3IsIGV2YWx1YXRvcik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpc1Byb3BlcnR5VHlwZU1lbWJlcihtZW1iZXI6IENsYXNzTWVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLkdldHRlciB8fCBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLlNldHRlciB8fFxuICAgICAgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbn1cblxudHlwZSBTdHJpbmdNYXAgPSB7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZ1xufTtcblxuZnVuY3Rpb24gZXh0cmFjdEhvc3RCaW5kaW5ncyhcbiAgICBtZXRhZGF0YTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBjb3JlTW9kdWxlOiBzdHJpbmcgfCB1bmRlZmluZWQpOiB7XG4gIGF0dHJpYnV0ZXM6IFN0cmluZ01hcCxcbiAgbGlzdGVuZXJzOiBTdHJpbmdNYXAsXG4gIHByb3BlcnRpZXM6IFN0cmluZ01hcCxcbn0ge1xuICBsZXQgaG9zdE1ldGFkYXRhOiBTdHJpbmdNYXAgPSB7fTtcbiAgaWYgKG1ldGFkYXRhLmhhcygnaG9zdCcpKSB7XG4gICAgY29uc3QgZXhwciA9IG1ldGFkYXRhLmdldCgnaG9zdCcpICE7XG4gICAgY29uc3QgaG9zdE1ldGFNYXAgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgaWYgKCEoaG9zdE1ldGFNYXAgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIGV4cHIsIGBEZWNvcmF0b3IgaG9zdCBtZXRhZGF0YSBtdXN0IGJlIGFuIG9iamVjdGApO1xuICAgIH1cbiAgICBob3N0TWV0YU1hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJyB8fCB0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERlY29yYXRvciBob3N0IG1ldGFkYXRhIG11c3QgYmUgYSBzdHJpbmcgLT4gc3RyaW5nIG9iamVjdCwgZ290ICR7dmFsdWV9YCk7XG4gICAgICB9XG4gICAgICBob3N0TWV0YWRhdGFba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgYmluZGluZ3MgPSBwYXJzZUhvc3RCaW5kaW5ncyhob3N0TWV0YWRhdGEpO1xuXG4gIC8vIFRPRE86IGNyZWF0ZSBhbmQgcHJvdmlkZSBwcm9wZXIgc291cmNlU3BhbiB0byBtYWtlIGVycm9yIG1lc3NhZ2UgbW9yZSBkZXNjcmlwdGl2ZSAoRlctOTk1KVxuICBjb25zdCBlcnJvcnMgPSB2ZXJpZnlIb3N0QmluZGluZ3MoYmluZGluZ3MsIC8qIHNvdXJjZVNwYW4gKi8gbnVsbCAhKTtcbiAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAvLyBUT0RPOiBwcm92aWRlIG1vcmUgZ3JhbnVsYXIgZGlhZ25vc3RpYyBhbmQgb3V0cHV0IHNwZWNpZmljIGhvc3QgZXhwcmVzc2lvbiB0aGF0IHRyaWdnZXJlZFxuICAgICAgICAvLyBhbiBlcnJvciBpbnN0ZWFkIG9mIHRoZSB3aG9sZSBob3N0IG9iamVjdFxuICAgICAgICBFcnJvckNvZGUuSE9TVF9CSU5ESU5HX1BBUlNFX0VSUk9SLCBtZXRhZGF0YS5nZXQoJ2hvc3QnKSAhLFxuICAgICAgICBlcnJvcnMubWFwKChlcnJvcjogUGFyc2VFcnJvcikgPT4gZXJyb3IubXNnKS5qb2luKCdcXG4nKSk7XG4gIH1cblxuICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKG1lbWJlcnMsICdIb3N0QmluZGluZycsIGNvcmVNb2R1bGUpXG4gICAgICAuZm9yRWFjaCgoe21lbWJlciwgZGVjb3JhdG9yc30pID0+IHtcbiAgICAgICAgZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICAgICAgbGV0IGhvc3RQcm9wZXJ0eU5hbWU6IHN0cmluZyA9IG1lbWJlci5uYW1lO1xuICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncyAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQEhvc3RCaW5kaW5nKCkgY2FuIGhhdmUgYXQgbW9zdCBvbmUgYXJndW1lbnRgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBASG9zdEJpbmRpbmcoKSdzIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaG9zdFByb3BlcnR5TmFtZSA9IHJlc29sdmVkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGJpbmRpbmdzLnByb3BlcnRpZXNbaG9zdFByb3BlcnR5TmFtZV0gPSBtZW1iZXIubmFtZTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKG1lbWJlcnMsICdIb3N0TGlzdGVuZXInLCBjb3JlTW9kdWxlKVxuICAgICAgLmZvckVhY2goKHttZW1iZXIsIGRlY29yYXRvcnN9KSA9PiB7XG4gICAgICAgIGRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgICAgIGxldCBldmVudE5hbWU6IHN0cmluZyA9IG1lbWJlci5uYW1lO1xuICAgICAgICAgIGxldCBhcmdzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncyAhPT0gbnVsbCAmJiBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWNvcmF0b3IuYXJnc1syXSxcbiAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyKCkgY2FuIGhhdmUgYXQgbW9zdCB0d28gYXJndW1lbnRzYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzBdKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZGVjb3JhdG9yLmFyZ3NbMF0sXG4gICAgICAgICAgICAgICAgICBgQEhvc3RMaXN0ZW5lcigpJ3MgZXZlbnQgbmFtZSBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV2ZW50TmFtZSA9IHJlc29sdmVkO1xuXG4gICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkQXJncyA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1sxXSk7XG4gICAgICAgICAgICAgIGlmICghaXNTdHJpbmdBcnJheU9yRGllKHJlc29sdmVkQXJncywgJ0BIb3N0TGlzdGVuZXIuYXJncycpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGRlY29yYXRvci5hcmdzWzFdLFxuICAgICAgICAgICAgICAgICAgICBgQEhvc3RMaXN0ZW5lciBzZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZyBhcnJheWApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFyZ3MgPSByZXNvbHZlZEFyZ3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYmluZGluZ3MubGlzdGVuZXJzW2V2ZW50TmFtZV0gPSBgJHttZW1iZXIubmFtZX0oJHthcmdzLmpvaW4oJywnKX0pYDtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5jb25zdCBRVUVSWV9UWVBFUyA9IG5ldyBTZXQoW1xuICAnQ29udGVudENoaWxkJyxcbiAgJ0NvbnRlbnRDaGlsZHJlbicsXG4gICdWaWV3Q2hpbGQnLFxuICAnVmlld0NoaWxkcmVuJyxcbl0pO1xuIl19