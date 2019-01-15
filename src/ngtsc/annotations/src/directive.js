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
        var _a = compiler_1.parseHostBindings(hostMetadata), attributes = _a.attributes, listeners = _a.listeners, properties = _a.properties;
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
                properties[hostPropertyName] = member.name;
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
                listeners[eventName] = member.name + "(" + args.join(',') + ")";
            });
        });
        return { attributes: attributes, properties: properties, listeners: listeners };
    }
    var QUERY_TYPES = new Set([
        'ContentChild',
        'ContentChildren',
        'ViewChild',
        'ViewChildren',
    ]);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFpTTtJQUNqTSwrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUEyRDtJQUUzRCx5RUFBNkk7SUFHN0kscUZBQXdEO0lBRXhELDZFQUE2SDtJQUU3SCxJQUFNLFlBQVksR0FBNEIsRUFBRSxDQUFDO0lBTWpEO1FBRUUsbUNBQ1ksU0FBeUIsRUFBVSxTQUEyQixFQUM5RCxhQUFvQyxFQUFVLE1BQWU7WUFEN0QsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUM5RCxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQUcsQ0FBQztRQUU3RSwwQ0FBTSxHQUFOLFVBQU8sSUFBb0IsRUFBRSxVQUE0QjtZQUF6RCxpQkFNQztZQUxDLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQ2xCLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksQ0FBQyxLQUFJLENBQUMsTUFBTSxJQUFJLG9CQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBM0UsQ0FBMkUsQ0FBQyxDQUFDO1FBQ2hHLENBQUM7UUFFRCwyQ0FBTyxHQUFQLFVBQVEsSUFBeUIsRUFBRSxTQUFvQjtZQUNyRCxJQUFNLGVBQWUsR0FDakIsd0JBQXdCLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFB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LFdBQVc7UUFDWCxjQUFjO0tBQ2YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgUjNEaXJlY3RpdmVNZXRhZGF0YSwgUjNRdWVyeU1ldGFkYXRhLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZURpcmVjdGl2ZUZyb21NZXRhZGF0YSwgbWFrZUJpbmRpbmdQYXJzZXIsIHBhcnNlSG9zdEJpbmRpbmdzfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge1JlZmVyZW5jZSwgUmVzb2x2ZWRSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzTWVtYmVyLCBDbGFzc01lbWJlcktpbmQsIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1NlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9zZWxlY3Rvcl9zY29wZSc7XG5pbXBvcnQge2V4dHJhY3REaXJlY3RpdmVHdWFyZHMsIGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlLCB1bndyYXBFeHByZXNzaW9uLCB1bndyYXBGb3J3YXJkUmVmfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9PQkpFQ1Q6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGlyZWN0aXZlSGFuZGxlckRhdGEge1xuICBtZXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xufVxuZXhwb3J0IGNsYXNzIERpcmVjdGl2ZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8RGlyZWN0aXZlSGFuZGxlckRhdGEsIERlY29yYXRvcj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4pIHt9XG5cbiAgZGV0ZWN0KG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycy5maW5kKFxuICAgICAgICBkZWNvcmF0b3IgPT4gZGVjb3JhdG9yLm5hbWUgPT09ICdEaXJlY3RpdmUnICYmICh0aGlzLmlzQ29yZSB8fCBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpKTtcbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxEaXJlY3RpdmVIYW5kbGVyRGF0YT4ge1xuICAgIGNvbnN0IGRpcmVjdGl2ZVJlc3VsdCA9XG4gICAgICAgIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShub2RlLCBkZWNvcmF0b3IsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvciwgdGhpcy5pc0NvcmUpO1xuICAgIGNvbnN0IGFuYWx5c2lzID0gZGlyZWN0aXZlUmVzdWx0ICYmIGRpcmVjdGl2ZVJlc3VsdC5tZXRhZGF0YTtcblxuICAgIC8vIElmIHRoZSBkaXJlY3RpdmUgaGFzIGEgc2VsZWN0b3IsIGl0IHNob3VsZCBiZSByZWdpc3RlcmVkIHdpdGggdGhlIGBTZWxlY3RvclNjb3BlUmVnaXN0cnlgIHNvXG4gICAgLy8gd2hlbiB0aGlzIGRpcmVjdGl2ZSBhcHBlYXJzIGluIGFuIGBATmdNb2R1bGVgIHNjb3BlLCBpdHMgc2VsZWN0b3IgY2FuIGJlIGRldGVybWluZWQuXG4gICAgaWYgKGFuYWx5c2lzICYmIGFuYWx5c2lzLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICBsZXQgcmVmID0gbmV3IFJlc29sdmVkUmVmZXJlbmNlKG5vZGUsIG5vZGUubmFtZSAhKTtcbiAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3RlckRpcmVjdGl2ZShub2RlLCB7XG4gICAgICAgIHJlZixcbiAgICAgICAgZGlyZWN0aXZlOiByZWYsXG4gICAgICAgIG5hbWU6IG5vZGUubmFtZSAhLnRleHQsXG4gICAgICAgIHNlbGVjdG9yOiBhbmFseXNpcy5zZWxlY3RvcixcbiAgICAgICAgZXhwb3J0QXM6IGFuYWx5c2lzLmV4cG9ydEFzLFxuICAgICAgICBpbnB1dHM6IGFuYWx5c2lzLmlucHV0cyxcbiAgICAgICAgb3V0cHV0czogYW5hbHlzaXMub3V0cHV0cyxcbiAgICAgICAgcXVlcmllczogYW5hbHlzaXMucXVlcmllcy5tYXAocXVlcnkgPT4gcXVlcnkucHJvcGVydHlOYW1lKSxcbiAgICAgICAgaXNDb21wb25lbnQ6IGZhbHNlLCAuLi5leHRyYWN0RGlyZWN0aXZlR3VhcmRzKG5vZGUsIHRoaXMucmVmbGVjdG9yKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChhbmFseXNpcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG1ldGE6IGFuYWx5c2lzLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogRGlyZWN0aXZlSGFuZGxlckRhdGEsIHBvb2w6IENvbnN0YW50UG9vbCk6XG4gICAgICBDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCByZXMgPSBjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEsIHBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyKCkpO1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSByZXMuc3RhdGVtZW50cztcbiAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBzdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICduZ0RpcmVjdGl2ZURlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sXG4gICAgICBzdGF0ZW1lbnRzOiBzdGF0ZW1lbnRzLFxuICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBleHRyYWN0IG1ldGFkYXRhIGZyb20gYSBgRGlyZWN0aXZlYCBvciBgQ29tcG9uZW50YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLCBpc0NvcmU6IGJvb2xlYW4sIGRlZmF1bHRTZWxlY3Rvcjogc3RyaW5nIHwgbnVsbCA9IG51bGwpOiB7XG4gIGRlY29yYXRvcjogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sXG4gIG1ldGFkYXRhOiBSM0RpcmVjdGl2ZU1ldGFkYXRhLFxuICBkZWNvcmF0ZWRFbGVtZW50czogQ2xhc3NNZW1iZXJbXSxcbn18dW5kZWZpbmVkIHtcbiAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBAJHtkZWNvcmF0b3IubmFtZX0gZGVjb3JhdG9yYCk7XG4gIH1cbiAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLCBgQCR7ZGVjb3JhdG9yLm5hbWV9IGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgfVxuICBjb25zdCBkaXJlY3RpdmUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICBpZiAoZGlyZWN0aXZlLmhhcygnaml0JykpIHtcbiAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgbWVtYmVycyA9IHJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eik7XG5cbiAgLy8gUHJlY29tcHV0ZSBhIGxpc3Qgb2YgdHMuQ2xhc3NFbGVtZW50cyB0aGF0IGhhdmUgZGVjb3JhdG9ycy4gVGhpcyBpbmNsdWRlcyB0aGluZ3MgbGlrZSBASW5wdXQsXG4gIC8vIEBPdXRwdXQsIEBIb3N0QmluZGluZywgZXRjLlxuICBjb25zdCBkZWNvcmF0ZWRFbGVtZW50cyA9XG4gICAgICBtZW1iZXJzLmZpbHRlcihtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIuZGVjb3JhdG9ycyAhPT0gbnVsbCk7XG5cbiAgY29uc3QgY29yZU1vZHVsZSA9IGlzQ29yZSA/IHVuZGVmaW5lZCA6ICdAYW5ndWxhci9jb3JlJztcblxuICAvLyBDb25zdHJ1Y3QgdGhlIG1hcCBvZiBpbnB1dHMgYm90aCBmcm9tIHRoZSBARGlyZWN0aXZlL0BDb21wb25lbnRcbiAgLy8gZGVjb3JhdG9yLCBhbmQgdGhlIGRlY29yYXRlZFxuICAvLyBmaWVsZHMuXG4gIGNvbnN0IGlucHV0c0Zyb21NZXRhID0gcGFyc2VGaWVsZFRvUHJvcGVydHlNYXBwaW5nKGRpcmVjdGl2ZSwgJ2lucHV0cycsIGV2YWx1YXRvcik7XG4gIGNvbnN0IGlucHV0c0Zyb21GaWVsZHMgPSBwYXJzZURlY29yYXRlZEZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdJbnB1dCcsIGNvcmVNb2R1bGUpLCBldmFsdWF0b3IsXG4gICAgICByZXNvbHZlSW5wdXQpO1xuXG4gIC8vIEFuZCBvdXRwdXRzLlxuICBjb25zdCBvdXRwdXRzRnJvbU1ldGEgPSBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoZGlyZWN0aXZlLCAnb3V0cHV0cycsIGV2YWx1YXRvcik7XG4gIGNvbnN0IG91dHB1dHNGcm9tRmllbGRzID0gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnT3V0cHV0JywgY29yZU1vZHVsZSksIGV2YWx1YXRvcixcbiAgICAgIHJlc29sdmVPdXRwdXQpIGFze1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfTtcbiAgLy8gQ29uc3RydWN0IHRoZSBsaXN0IG9mIHF1ZXJpZXMuXG4gIGNvbnN0IGNvbnRlbnRDaGlsZEZyb21GaWVsZHMgPSBxdWVyaWVzRnJvbUZpZWxkcyhcbiAgICAgIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IoZGVjb3JhdGVkRWxlbWVudHMsICdDb250ZW50Q2hpbGQnLCBjb3JlTW9kdWxlKSwgcmVmbGVjdG9yLFxuICAgICAgZXZhbHVhdG9yKTtcbiAgY29uc3QgY29udGVudENoaWxkcmVuRnJvbUZpZWxkcyA9IHF1ZXJpZXNGcm9tRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0NvbnRlbnRDaGlsZHJlbicsIGNvcmVNb2R1bGUpLCByZWZsZWN0b3IsXG4gICAgICBldmFsdWF0b3IpO1xuXG4gIGNvbnN0IHF1ZXJpZXMgPSBbLi4uY29udGVudENoaWxkRnJvbUZpZWxkcywgLi4uY29udGVudENoaWxkcmVuRnJvbUZpZWxkc107XG5cbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ3F1ZXJpZXMnKSkge1xuICAgIGNvbnN0IHF1ZXJpZXNGcm9tRGVjb3JhdG9yID1cbiAgICAgICAgZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yKGRpcmVjdGl2ZS5nZXQoJ3F1ZXJpZXMnKSAhLCByZWZsZWN0b3IsIGV2YWx1YXRvciwgaXNDb3JlKTtcbiAgICBxdWVyaWVzLnB1c2goLi4ucXVlcmllc0Zyb21EZWNvcmF0b3IuY29udGVudCk7XG4gIH1cblxuICAvLyBQYXJzZSB0aGUgc2VsZWN0b3IuXG4gIGxldCBzZWxlY3RvciA9IGRlZmF1bHRTZWxlY3RvcjtcbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ3NlbGVjdG9yJykpIHtcbiAgICBjb25zdCBleHByID0gZGlyZWN0aXZlLmdldCgnc2VsZWN0b3InKSAhO1xuICAgIGNvbnN0IHJlc29sdmVkID0gZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCBgc2VsZWN0b3IgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBzZWxlY3RvciA9IHJlc29sdmVkO1xuICB9XG4gIGlmICghc2VsZWN0b3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYERpcmVjdGl2ZSAke2NsYXp6Lm5hbWUgIS50ZXh0fSBoYXMgbm8gc2VsZWN0b3IsIHBsZWFzZSBhZGQgaXQhYCk7XG4gIH1cblxuICBjb25zdCBob3N0ID0gZXh0cmFjdEhvc3RCaW5kaW5ncyhkaXJlY3RpdmUsIGRlY29yYXRlZEVsZW1lbnRzLCBldmFsdWF0b3IsIGNvcmVNb2R1bGUpO1xuXG4gIGNvbnN0IHByb3ZpZGVyczogRXhwcmVzc2lvbnxudWxsID1cbiAgICAgIGRpcmVjdGl2ZS5oYXMoJ3Byb3ZpZGVycycpID8gbmV3IFdyYXBwZWROb2RlRXhwcihkaXJlY3RpdmUuZ2V0KCdwcm92aWRlcnMnKSAhKSA6IG51bGw7XG5cbiAgLy8gUGFyc2UgZXhwb3J0QXMuXG4gIGxldCBleHBvcnRBczogc3RyaW5nW118bnVsbCA9IG51bGw7XG4gIGlmIChkaXJlY3RpdmUuaGFzKCdleHBvcnRBcycpKSB7XG4gICAgY29uc3QgZXhwciA9IGRpcmVjdGl2ZS5nZXQoJ2V4cG9ydEFzJykgITtcbiAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwciwgYGV4cG9ydEFzIG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICB9XG4gICAgZXhwb3J0QXMgPSByZXNvbHZlZC5zcGxpdCgnLCcpLm1hcChwYXJ0ID0+IHBhcnQudHJpbSgpKTtcbiAgfVxuXG4gIC8vIERldGVjdCBpZiB0aGUgY29tcG9uZW50IGluaGVyaXRzIGZyb20gYW5vdGhlciBjbGFzc1xuICBjb25zdCB1c2VzSW5oZXJpdGFuY2UgPSBjbGF6ei5oZXJpdGFnZUNsYXVzZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgY2xhenouaGVyaXRhZ2VDbGF1c2VzLnNvbWUoaGMgPT4gaGMudG9rZW4gPT09IHRzLlN5bnRheEtpbmQuRXh0ZW5kc0tleXdvcmQpO1xuICBjb25zdCBtZXRhZGF0YTogUjNEaXJlY3RpdmVNZXRhZGF0YSA9IHtcbiAgICBuYW1lOiBjbGF6ei5uYW1lICEudGV4dCxcbiAgICBkZXBzOiBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBpc0NvcmUpLCBob3N0LFxuICAgIGlucHV0czogey4uLmlucHV0c0Zyb21NZXRhLCAuLi5pbnB1dHNGcm9tRmllbGRzfSxcbiAgICBvdXRwdXRzOiB7Li4ub3V0cHV0c0Zyb21NZXRhLCAuLi5vdXRwdXRzRnJvbUZpZWxkc30sIHF1ZXJpZXMsIHNlbGVjdG9yLFxuICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSAhKSxcbiAgICB0eXBlQXJndW1lbnRDb3VudDogcmVmbGVjdG9yLmdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xhenopIHx8IDAsXG4gICAgdHlwZVNvdXJjZVNwYW46IG51bGwgISwgdXNlc0luaGVyaXRhbmNlLCBleHBvcnRBcywgcHJvdmlkZXJzXG4gIH07XG4gIHJldHVybiB7ZGVjb3JhdGVkRWxlbWVudHMsIGRlY29yYXRvcjogZGlyZWN0aXZlLCBtZXRhZGF0YX07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0UXVlcnlNZXRhZGF0YShcbiAgICBleHByTm9kZTogdHMuTm9kZSwgbmFtZTogc3RyaW5nLCBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+LCBwcm9wZXJ0eU5hbWU6IHN0cmluZyxcbiAgICByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IpOiBSM1F1ZXJ5TWV0YWRhdGEge1xuICBpZiAoYXJncy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGV4cHJOb2RlLCBgQCR7bmFtZX0gbXVzdCBoYXZlIGFyZ3VtZW50c2ApO1xuICB9XG4gIGNvbnN0IGZpcnN0ID0gbmFtZSA9PT0gJ1ZpZXdDaGlsZCcgfHwgbmFtZSA9PT0gJ0NvbnRlbnRDaGlsZCc7XG4gIGNvbnN0IG5vZGUgPSB1bndyYXBGb3J3YXJkUmVmKGFyZ3NbMF0sIHJlZmxlY3Rvcik7XG4gIGNvbnN0IGFyZyA9IGV2YWx1YXRvci5ldmFsdWF0ZShub2RlKTtcblxuICAvLyBFeHRyYWN0IHRoZSBwcmVkaWNhdGVcbiAgbGV0IHByZWRpY2F0ZTogRXhwcmVzc2lvbnxzdHJpbmdbXXxudWxsID0gbnVsbDtcbiAgaWYgKGFyZyBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgIHByZWRpY2F0ZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcbiAgICBwcmVkaWNhdGUgPSBbYXJnXTtcbiAgfSBlbHNlIGlmIChpc1N0cmluZ0FycmF5T3JEaWUoYXJnLCAnQCcgKyBuYW1lKSkge1xuICAgIHByZWRpY2F0ZSA9IGFyZyBhcyBzdHJpbmdbXTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgbm9kZSwgYEAke25hbWV9IHByZWRpY2F0ZSBjYW5ub3QgYmUgaW50ZXJwcmV0ZWRgKTtcbiAgfVxuXG4gIC8vIEV4dHJhY3QgdGhlIHJlYWQgYW5kIGRlc2NlbmRhbnRzIG9wdGlvbnMuXG4gIGxldCByZWFkOiBFeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAvLyBUaGUgZGVmYXVsdCB2YWx1ZSBmb3IgZGVzY2VuZGFudHMgaXMgdHJ1ZSBmb3IgZXZlcnkgZGVjb3JhdG9yIGV4Y2VwdCBAQ29udGVudENoaWxkcmVuLlxuICBsZXQgZGVzY2VuZGFudHM6IGJvb2xlYW4gPSBuYW1lICE9PSAnQ29udGVudENoaWxkcmVuJztcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAyKSB7XG4gICAgY29uc3Qgb3B0aW9uc0V4cHIgPSB1bndyYXBFeHByZXNzaW9uKGFyZ3NbMV0pO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihvcHRpb25zRXhwcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQCR7bmFtZX0gb3B0aW9ucyBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsYCk7XG4gICAgfVxuICAgIGNvbnN0IG9wdGlvbnMgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChvcHRpb25zRXhwcik7XG4gICAgaWYgKG9wdGlvbnMuaGFzKCdyZWFkJykpIHtcbiAgICAgIHJlYWQgPSBuZXcgV3JhcHBlZE5vZGVFeHByKG9wdGlvbnMuZ2V0KCdyZWFkJykgISk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuaGFzKCdkZXNjZW5kYW50cycpKSB7XG4gICAgICBjb25zdCBkZXNjZW5kYW50c1ZhbHVlID0gZXZhbHVhdG9yLmV2YWx1YXRlKG9wdGlvbnMuZ2V0KCdkZXNjZW5kYW50cycpICEpO1xuICAgICAgaWYgKHR5cGVvZiBkZXNjZW5kYW50c1ZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBAJHtuYW1lfSBvcHRpb25zLmRlc2NlbmRhbnRzIG11c3QgYmUgYSBib29sZWFuYCk7XG4gICAgICB9XG4gICAgICBkZXNjZW5kYW50cyA9IGRlc2NlbmRhbnRzVmFsdWU7XG4gICAgfVxuICB9IGVsc2UgaWYgKGFyZ3MubGVuZ3RoID4gMikge1xuICAgIC8vIFRvbyBtYW55IGFyZ3VtZW50cy5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYEAke25hbWV9IGhhcyB0b28gbWFueSBhcmd1bWVudHNgKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgICBwcm9wZXJ0eU5hbWUsIHByZWRpY2F0ZSwgZmlyc3QsIGRlc2NlbmRhbnRzLCByZWFkLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFF1ZXJpZXNGcm9tRGVjb3JhdG9yKFxuICAgIHF1ZXJ5RGF0YTogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgIGlzQ29yZTogYm9vbGVhbik6IHtcbiAgY29udGVudDogUjNRdWVyeU1ldGFkYXRhW10sXG4gIHZpZXc6IFIzUXVlcnlNZXRhZGF0YVtdLFxufSB7XG4gIGNvbnN0IGNvbnRlbnQ6IFIzUXVlcnlNZXRhZGF0YVtdID0gW10sIHZpZXc6IFIzUXVlcnlNZXRhZGF0YVtdID0gW107XG4gIGNvbnN0IGV4cHIgPSB1bndyYXBFeHByZXNzaW9uKHF1ZXJ5RGF0YSk7XG4gIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihxdWVyeURhdGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBxdWVyaWVzIG1ldGFkYXRhIG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWxgKTtcbiAgfVxuICByZWZsZWN0T2JqZWN0TGl0ZXJhbChxdWVyeURhdGEpLmZvckVhY2goKHF1ZXJ5RXhwciwgcHJvcGVydHlOYW1lKSA9PiB7XG4gICAgcXVlcnlFeHByID0gdW53cmFwRXhwcmVzc2lvbihxdWVyeUV4cHIpO1xuICAgIGlmICghdHMuaXNOZXdFeHByZXNzaW9uKHF1ZXJ5RXhwcikgfHwgIXRzLmlzSWRlbnRpZmllcihxdWVyeUV4cHIuZXhwcmVzc2lvbikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgcXVlcnkgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBhIHF1ZXJ5IHR5cGVgKTtcbiAgICB9XG4gICAgY29uc3QgdHlwZSA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIocXVlcnlFeHByLmV4cHJlc3Npb24pO1xuICAgIGlmICh0eXBlID09PSBudWxsIHx8ICghaXNDb3JlICYmIHR5cGUuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB8fFxuICAgICAgICAhUVVFUllfVFlQRVMuaGFzKHR5cGUubmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgcXVlcnkgbWV0YWRhdGEgbXVzdCBiZSBhbiBpbnN0YW5jZSBvZiBhIHF1ZXJ5IHR5cGVgKTtcbiAgICB9XG5cbiAgICBjb25zdCBxdWVyeSA9IGV4dHJhY3RRdWVyeU1ldGFkYXRhKFxuICAgICAgICBxdWVyeUV4cHIsIHR5cGUubmFtZSwgcXVlcnlFeHByLmFyZ3VtZW50cyB8fCBbXSwgcHJvcGVydHlOYW1lLCByZWZsZWN0b3IsIGV2YWx1YXRvcik7XG4gICAgaWYgKHR5cGUubmFtZS5zdGFydHNXaXRoKCdDb250ZW50JykpIHtcbiAgICAgIGNvbnRlbnQucHVzaChxdWVyeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZpZXcucHVzaChxdWVyeSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHtjb250ZW50LCB2aWV3fTtcbn1cblxuZnVuY3Rpb24gaXNTdHJpbmdBcnJheU9yRGllKHZhbHVlOiBhbnksIG5hbWU6IHN0cmluZyk6IHZhbHVlIGlzIHN0cmluZ1tdIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlW2ldICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmVzb2x2ZSAke25hbWV9WyR7aX1dIHRvIGEgc3RyaW5nYCk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VGaWVsZEFycmF5VmFsdWUoXG4gICAgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZywgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogbnVsbHxcbiAgICBzdHJpbmdbXSB7XG4gIGlmICghZGlyZWN0aXZlLmhhcyhmaWVsZCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFJlc29sdmUgdGhlIGZpZWxkIG9mIGludGVyZXN0IGZyb20gdGhlIGRpcmVjdGl2ZSBtZXRhZGF0YSB0byBhIHN0cmluZ1tdLlxuICBjb25zdCB2YWx1ZSA9IGV2YWx1YXRvci5ldmFsdWF0ZShkaXJlY3RpdmUuZ2V0KGZpZWxkKSAhKTtcbiAgaWYgKCFpc1N0cmluZ0FycmF5T3JEaWUodmFsdWUsIGZpZWxkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJlc29sdmUgQERpcmVjdGl2ZS4ke2ZpZWxkfWApO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIEludGVycHJldCBwcm9wZXJ0eSBtYXBwaW5nIGZpZWxkcyBvbiB0aGUgZGVjb3JhdG9yIChlLmcuIGlucHV0cyBvciBvdXRwdXRzKSBhbmQgcmV0dXJuIHRoZVxuICogY29ycmVjdGx5IHNoYXBlZCBtZXRhZGF0YSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhcbiAgICBkaXJlY3RpdmU6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBmaWVsZDogc3RyaW5nLFxuICAgIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcik6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZ30ge1xuICBjb25zdCBtZXRhVmFsdWVzID0gcGFyc2VGaWVsZEFycmF5VmFsdWUoZGlyZWN0aXZlLCBmaWVsZCwgZXZhbHVhdG9yKTtcbiAgaWYgKCFtZXRhVmFsdWVzKSB7XG4gICAgcmV0dXJuIEVNUFRZX09CSkVDVDtcbiAgfVxuXG4gIHJldHVybiBtZXRhVmFsdWVzLnJlZHVjZShcbiAgICAgIChyZXN1bHRzLCB2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBFaXRoZXIgdGhlIHZhbHVlIGlzICdmaWVsZCcgb3IgJ2ZpZWxkOiBwcm9wZXJ0eScuIEluIHRoZSBmaXJzdCBjYXNlLCBgcHJvcGVydHlgIHdpbGxcbiAgICAgICAgLy8gYmUgdW5kZWZpbmVkLCBpbiB3aGljaCBjYXNlIHRoZSBmaWVsZCBuYW1lIHNob3VsZCBhbHNvIGJlIHVzZWQgYXMgdGhlIHByb3BlcnR5IG5hbWUuXG4gICAgICAgIGNvbnN0IFtmaWVsZCwgcHJvcGVydHldID0gdmFsdWUuc3BsaXQoJzonLCAyKS5tYXAoc3RyID0+IHN0ci50cmltKCkpO1xuICAgICAgICByZXN1bHRzW2ZpZWxkXSA9IHByb3BlcnR5IHx8IGZpZWxkO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH0sXG4gICAgICB7fSBhc3tbZmllbGQ6IHN0cmluZ106IHN0cmluZ30pO1xufVxuXG4vKipcbiAqIFBhcnNlIHByb3BlcnR5IGRlY29yYXRvcnMgKGUuZy4gYElucHV0YCBvciBgT3V0cHV0YCkgYW5kIHJldHVybiB0aGUgY29ycmVjdGx5IHNoYXBlZCBtZXRhZGF0YVxuICogb2JqZWN0LlxuICovXG5mdW5jdGlvbiBwYXJzZURlY29yYXRlZEZpZWxkcyhcbiAgICBmaWVsZHM6IHttZW1iZXI6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXX1bXSwgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgIG1hcFZhbHVlUmVzb2x2ZXI6IChwdWJsaWNOYW1lOiBzdHJpbmcsIGludGVybmFsTmFtZTogc3RyaW5nKSA9PlxuICAgICAgICBzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddKToge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXX0ge1xuICByZXR1cm4gZmllbGRzLnJlZHVjZShcbiAgICAgIChyZXN1bHRzLCBmaWVsZCkgPT4ge1xuICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBmaWVsZC5tZW1iZXIubmFtZTtcbiAgICAgICAgZmllbGQuZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICAgICAgLy8gVGhlIGRlY29yYXRvciBlaXRoZXIgZG9lc24ndCBoYXZlIGFuIGFyZ3VtZW50IChASW5wdXQoKSkgaW4gd2hpY2ggY2FzZSB0aGUgcHJvcGVydHlcbiAgICAgICAgICAvLyBuYW1lIGlzIHVzZWQsIG9yIGl0IGhhcyBvbmUgYXJndW1lbnQgKEBPdXRwdXQoJ25hbWVkJykpLlxuICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmVzdWx0c1tmaWVsZE5hbWVdID0gZmllbGROYW1lO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0eSA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERlY29yYXRvciBhcmd1bWVudCBtdXN0IHJlc29sdmUgdG8gYSBzdHJpbmdgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdHNbZmllbGROYW1lXSA9IG1hcFZhbHVlUmVzb2x2ZXIocHJvcGVydHksIGZpZWxkTmFtZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRvbyBtYW55IGFyZ3VtZW50cy5cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICBgRGVjb3JhdG9yIG11c3QgaGF2ZSAwIG9yIDEgYXJndW1lbnRzLCBnb3QgJHtkZWNvcmF0b3IuYXJncy5sZW5ndGh9IGFyZ3VtZW50KHMpYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9LFxuICAgICAge30gYXN7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddfSk7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVJbnB1dChwdWJsaWNOYW1lOiBzdHJpbmcsIGludGVybmFsTmFtZTogc3RyaW5nKTogW3N0cmluZywgc3RyaW5nXSB7XG4gIHJldHVybiBbcHVibGljTmFtZSwgaW50ZXJuYWxOYW1lXTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZU91dHB1dChwdWJsaWNOYW1lOiBzdHJpbmcsIGludGVybmFsTmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiBwdWJsaWNOYW1lO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcXVlcmllc0Zyb21GaWVsZHMoXG4gICAgZmllbGRzOiB7bWVtYmVyOiBDbGFzc01lbWJlciwgZGVjb3JhdG9yczogRGVjb3JhdG9yW119W10sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKTogUjNRdWVyeU1ldGFkYXRhW10ge1xuICByZXR1cm4gZmllbGRzLm1hcCgoe21lbWJlciwgZGVjb3JhdG9yc30pID0+IHtcbiAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGhhdmUgbXVsdGlwbGUgcXVlcnkgZGVjb3JhdG9ycyBvbiB0aGUgc2FtZSBjbGFzcyBtZW1iZXJgKTtcbiAgICB9IGVsc2UgaWYgKCFpc1Byb3BlcnR5VHlwZU1lbWJlcihtZW1iZXIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFF1ZXJ5IGRlY29yYXRvciBtdXN0IGdvIG9uIGEgcHJvcGVydHktdHlwZSBtZW1iZXJgKTtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZGVjb3JhdG9yc1swXTtcbiAgICByZXR1cm4gZXh0cmFjdFF1ZXJ5TWV0YWRhdGEoXG4gICAgICAgIGRlY29yYXRvci5ub2RlLCBkZWNvcmF0b3IubmFtZSwgZGVjb3JhdG9yLmFyZ3MgfHwgW10sIG1lbWJlci5uYW1lLCByZWZsZWN0b3IsIGV2YWx1YXRvcik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpc1Byb3BlcnR5VHlwZU1lbWJlcihtZW1iZXI6IENsYXNzTWVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLkdldHRlciB8fCBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLlNldHRlciB8fFxuICAgICAgbWVtYmVyLmtpbmQgPT09IENsYXNzTWVtYmVyS2luZC5Qcm9wZXJ0eTtcbn1cblxudHlwZSBTdHJpbmdNYXAgPSB7XG4gIFtrZXk6IHN0cmluZ106IHN0cmluZ1xufTtcblxuZnVuY3Rpb24gZXh0cmFjdEhvc3RCaW5kaW5ncyhcbiAgICBtZXRhZGF0YTogTWFwPHN0cmluZywgdHMuRXhwcmVzc2lvbj4sIG1lbWJlcnM6IENsYXNzTWVtYmVyW10sIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICBjb3JlTW9kdWxlOiBzdHJpbmcgfCB1bmRlZmluZWQpOiB7XG4gIGF0dHJpYnV0ZXM6IFN0cmluZ01hcCxcbiAgbGlzdGVuZXJzOiBTdHJpbmdNYXAsXG4gIHByb3BlcnRpZXM6IFN0cmluZ01hcCxcbn0ge1xuICBsZXQgaG9zdE1ldGFkYXRhOiBTdHJpbmdNYXAgPSB7fTtcbiAgaWYgKG1ldGFkYXRhLmhhcygnaG9zdCcpKSB7XG4gICAgY29uc3QgZXhwciA9IG1ldGFkYXRhLmdldCgnaG9zdCcpICE7XG4gICAgY29uc3QgaG9zdE1ldGFNYXAgPSBldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgaWYgKCEoaG9zdE1ldGFNYXAgaW5zdGFuY2VvZiBNYXApKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIGV4cHIsIGBEZWNvcmF0b3IgaG9zdCBtZXRhZGF0YSBtdXN0IGJlIGFuIG9iamVjdGApO1xuICAgIH1cbiAgICBob3N0TWV0YU1hcC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJyB8fCB0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERlY29yYXRvciBob3N0IG1ldGFkYXRhIG11c3QgYmUgYSBzdHJpbmcgLT4gc3RyaW5nIG9iamVjdCwgZ290ICR7dmFsdWV9YCk7XG4gICAgICB9XG4gICAgICBob3N0TWV0YWRhdGFba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qge2F0dHJpYnV0ZXMsIGxpc3RlbmVycywgcHJvcGVydGllc30gPSBwYXJzZUhvc3RCaW5kaW5ncyhob3N0TWV0YWRhdGEpO1xuXG4gIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVycywgJ0hvc3RCaW5kaW5nJywgY29yZU1vZHVsZSlcbiAgICAgIC5mb3JFYWNoKCh7bWVtYmVyLCBkZWNvcmF0b3JzfSkgPT4ge1xuICAgICAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgICAgICBsZXQgaG9zdFByb3BlcnR5TmFtZTogc3RyaW5nID0gbWVtYmVyLm5hbWU7XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBASG9zdEJpbmRpbmcoKSBjYW4gaGF2ZSBhdCBtb3N0IG9uZSBhcmd1bWVudGApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGV2YWx1YXRvci5ldmFsdWF0ZShkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEBIb3N0QmluZGluZygpJ3MgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBob3N0UHJvcGVydHlOYW1lID0gcmVzb2x2ZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcHJvcGVydGllc1tob3N0UHJvcGVydHlOYW1lXSA9IG1lbWJlci5uYW1lO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gIGZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3IobWVtYmVycywgJ0hvc3RMaXN0ZW5lcicsIGNvcmVNb2R1bGUpXG4gICAgICAuZm9yRWFjaCgoe21lbWJlciwgZGVjb3JhdG9yc30pID0+IHtcbiAgICAgICAgZGVjb3JhdG9ycy5mb3JFYWNoKGRlY29yYXRvciA9PiB7XG4gICAgICAgICAgbGV0IGV2ZW50TmFtZTogc3RyaW5nID0gbWVtYmVyLm5hbWU7XG4gICAgICAgICAgbGV0IGFyZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzICE9PSBudWxsICYmIGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5hcmdzWzJdLFxuICAgICAgICAgICAgICAgICAgYEBIb3N0TGlzdGVuZXIoKSBjYW4gaGF2ZSBhdCBtb3N0IHR3byBhcmd1bWVudHNgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBldmFsdWF0b3IuZXZhbHVhdGUoZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBkZWNvcmF0b3IuYXJnc1swXSxcbiAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyKCkncyBldmVudCBuYW1lIGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXZlbnROYW1lID0gcmVzb2x2ZWQ7XG5cbiAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRBcmdzID0gZXZhbHVhdG9yLmV2YWx1YXRlKGRlY29yYXRvci5hcmdzWzFdKTtcbiAgICAgICAgICAgICAgaWYgKCFpc1N0cmluZ0FycmF5T3JEaWUocmVzb2x2ZWRBcmdzLCAnQEhvc3RMaXN0ZW5lci5hcmdzJykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZGVjb3JhdG9yLmFyZ3NbMV0sXG4gICAgICAgICAgICAgICAgICAgIGBASG9zdExpc3RlbmVyIHNlY29uZCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nIGFycmF5YCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXJncyA9IHJlc29sdmVkQXJncztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaXN0ZW5lcnNbZXZlbnROYW1lXSA9IGAke21lbWJlci5uYW1lfSgke2FyZ3Muam9pbignLCcpfSlgO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICByZXR1cm4ge2F0dHJpYnV0ZXMsIHByb3BlcnRpZXMsIGxpc3RlbmVyc307XG59XG5cbmNvbnN0IFFVRVJZX1RZUEVTID0gbmV3IFNldChbXG4gICdDb250ZW50Q2hpbGQnLFxuICAnQ29udGVudENoaWxkcmVuJyxcbiAgJ1ZpZXdDaGlsZCcsXG4gICdWaWV3Q2hpbGRyZW4nLFxuXSk7XG4iXX0=