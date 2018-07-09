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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/directive", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_OBJECT = {};
    var DirectiveDecoratorHandler = /** @class */ (function () {
        function DirectiveDecoratorHandler(checker, scopeRegistry) {
            this.checker = checker;
            this.scopeRegistry = scopeRegistry;
        }
        DirectiveDecoratorHandler.prototype.detect = function (decorators) {
            return decorators.find(function (decorator) { return decorator.name === 'Directive' && decorator.from === '@angular/core'; });
        };
        DirectiveDecoratorHandler.prototype.analyze = function (node, decorator) {
            var analysis = extractDirectiveMetadata(node, decorator, this.checker);
            // If the directive has a selector, it should be registered with the `SelectorScopeRegistry` so
            // when this directive appears in an `@NgModule` scope, its selector can be determined.
            if (analysis && analysis.selector !== null) {
                this.scopeRegistry.registerSelector(node, analysis.selector);
            }
            return { analysis: analysis };
        };
        DirectiveDecoratorHandler.prototype.compile = function (node, analysis) {
            var pool = new compiler_1.ConstantPool();
            var res = compiler_1.compileDirectiveFromMetadata(analysis, pool, compiler_1.makeBindingParser());
            return {
                field: 'ngDirectiveDef',
                initializer: res.expression,
                statements: pool.statements,
                type: res.type,
            };
        };
        return DirectiveDecoratorHandler;
    }());
    exports.DirectiveDecoratorHandler = DirectiveDecoratorHandler;
    /**
     * Helper function to extract metadata from a `Directive` or `Component`.
     */
    function extractDirectiveMetadata(clazz, decorator, checker) {
        var meta = decorator.args[0];
        if (!ts.isObjectLiteralExpression(meta)) {
            throw new Error("Decorator argument must be literal.");
        }
        var directive = reflector_1.reflectObjectLiteral(meta);
        if (directive.has('jit')) {
            // The only allowed value is true, so there's no need to expand further.
            return undefined;
        }
        // Precompute a list of ts.ClassElements that have decorators. This includes things like @Input,
        // @Output, @HostBinding, etc.
        var decoratedElements = reflector_1.getDecoratedClassElements(clazz, checker);
        // Construct the map of inputs both from the @Directive/@Component decorator, and the decorated
        // fields.
        var inputsFromMeta = parseFieldToPropertyMapping(directive, 'inputs', checker);
        var inputsFromFields = parseDecoratedFields(findDecoratedFields(decoratedElements, '@angular/core', 'Input'), checker);
        // And outputs.
        var outputsFromMeta = parseFieldToPropertyMapping(directive, 'outputs', checker);
        var outputsFromFields = parseDecoratedFields(findDecoratedFields(decoratedElements, '@angular/core', 'Output'), checker);
        // Parse the selector.
        var selector = '';
        if (directive.has('selector')) {
            var resolved = metadata_1.staticallyResolve(directive.get('selector'), checker);
            if (typeof resolved !== 'string') {
                throw new Error("Selector must be a string");
            }
            selector = resolved;
        }
        // Determine if `ngOnChanges` is a lifecycle hook defined on the component.
        var usesOnChanges = reflector_1.reflectNonStaticField(clazz, 'ngOnChanges') !== null;
        return {
            name: clazz.name.text,
            deps: util_1.getConstructorDependencies(clazz, checker),
            host: {
                attributes: {},
                listeners: {},
                properties: {},
            },
            lifecycle: {
                usesOnChanges: usesOnChanges,
            },
            inputs: tslib_1.__assign({}, inputsFromMeta, inputsFromFields),
            outputs: tslib_1.__assign({}, outputsFromMeta, outputsFromFields),
            queries: [], selector: selector,
            type: new compiler_1.WrappedNodeExpr(clazz.name),
            typeSourceSpan: null,
        };
    }
    exports.extractDirectiveMetadata = extractDirectiveMetadata;
    function assertIsStringArray(value) {
        for (var i = 0; i < value.length; i++) {
            if (typeof value[i] !== 'string') {
                throw new Error("Failed to resolve @Directive.inputs[" + i + "] to a string");
            }
        }
        return true;
    }
    /**
     * Find all fields in the array of `DecoratedNode`s that have a decorator of the given type.
     */
    function findDecoratedFields(elements, decoratorModule, decoratorName) {
        return elements
            .map(function (entry) {
            var element = entry.element;
            // Only consider properties and accessors. Filter out everything else.
            if (!ts.isPropertyDeclaration(element) && !ts.isAccessor(element)) {
                return null;
            }
            // Extract the array of matching decorators (there could be more than one).
            var decorators = entry.decorators.filter(function (decorator) { return decorator.name === decoratorName && decorator.from === decoratorModule; });
            if (decorators.length === 0) {
                // No matching decorators, don't include this element.
                return null;
            }
            return { element: element, decorators: decorators };
        })
            // Filter out nulls.
            .filter(function (entry) { return entry !== null; });
    }
    /**
     * Interpret property mapping fields on the decorator (e.g. inputs or outputs) and return the
     * correctly shaped metadata object.
     */
    function parseFieldToPropertyMapping(directive, field, checker) {
        if (!directive.has(field)) {
            return EMPTY_OBJECT;
        }
        // Resolve the field of interest from the directive metadata to a string[].
        var metaValues = metadata_1.staticallyResolve(directive.get(field), checker);
        if (!Array.isArray(metaValues) || !assertIsStringArray(metaValues)) {
            throw new Error("Failed to resolve @Directive." + field);
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
    function parseDecoratedFields(fields, checker) {
        return fields.reduce(function (results, field) {
            var fieldName = field.element.name.text;
            field.decorators.forEach(function (decorator) {
                // The decorator either doesn't have an argument (@Input()) in which case the property
                // name is used, or it has one argument (@Output('named')).
                if (decorator.args.length === 0) {
                    results[fieldName] = fieldName;
                }
                else if (decorator.args.length === 1) {
                    var property = metadata_1.staticallyResolve(decorator.args[0], checker);
                    if (typeof property !== 'string') {
                        throw new Error("Decorator argument must resolve to a string");
                    }
                    results[fieldName] = property;
                }
                else {
                    // Too many arguments.
                    throw new Error("Decorator must have 0 or 1 arguments, got " + decorator.args.length + " argument(s)");
                }
            });
            return results;
        }, {});
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzSTtJQUN0SSwrQkFBaUM7SUFFakMscUVBQTREO0lBQzVELG9GQUFtSTtJQUluSSw2RUFBa0Q7SUFFbEQsSUFBTSxZQUFZLEdBQTRCLEVBQUUsQ0FBQztJQUVqRDtRQUNFLG1DQUFvQixPQUF1QixFQUFVLGFBQW9DO1lBQXJFLFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBQUcsQ0FBQztRQUU3RiwwQ0FBTSxHQUFOLFVBQU8sVUFBdUI7WUFDNUIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNsQixVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssZUFBZSxFQUFwRSxDQUFvRSxDQUFDLENBQUM7UUFDekYsQ0FBQztRQUVELDJDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFNBQW9CO1lBQ3JELElBQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXpFLCtGQUErRjtZQUMvRix1RkFBdUY7WUFDdkYsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQzFDLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUM5RDtZQUVELE9BQU8sRUFBQyxRQUFRLFVBQUEsRUFBQyxDQUFDO1FBQ3BCLENBQUM7UUFFRCwyQ0FBTyxHQUFQ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QUksQ0FBQztZQUM3RCxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFNBQVM7Z0JBQ2hDLHNGQUFzRjtnQkFDdEYsMkRBQTJEO2dCQUMzRCxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDL0IsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLFNBQVMsQ0FBQztpQkFDaEM7cUJBQU0sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQ3RDLElBQU0sUUFBUSxHQUFHLDRCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQy9ELElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFO3dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7cUJBQ2hFO29CQUNELE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxRQUFRLENBQUM7aUJBQy9CO3FCQUFNO29CQUNMLHNCQUFzQjtvQkFDdEIsTUFBTSxJQUFJLEtBQUssQ0FDWCwrQ0FBNkMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLGlCQUFjLENBQUMsQ0FBQztpQkFDdkY7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUMsRUFDRCxFQUE4QixDQUFDLENBQUM7SUFDdEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZURpcmVjdGl2ZUZyb21NZXRhZGF0YSwgbWFrZUJpbmRpbmdQYXJzZXJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlY29yYXRvciwgc3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7RGVjb3JhdGVkTm9kZSwgZ2V0RGVjb3JhdGVkQ2xhc3NFbGVtZW50cywgcmVmbGVjdE5vblN0YXRpY0ZpZWxkLCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vbWV0YWRhdGEvc3JjL3JlZmxlY3Rvcic7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge1NlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9zZWxlY3Rvcl9zY29wZSc7XG5pbXBvcnQge2dldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBFTVBUWV9PQkpFQ1Q6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbmV4cG9ydCBjbGFzcyBEaXJlY3RpdmVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxSM0RpcmVjdGl2ZU1ldGFkYXRhPiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogU2VsZWN0b3JTY29wZVJlZ2lzdHJ5KSB7fVxuXG4gIGRldGVjdChkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoXG4gICAgICAgIGRlY29yYXRvciA9PiBkZWNvcmF0b3IubmFtZSA9PT0gJ0RpcmVjdGl2ZScgJiYgZGVjb3JhdG9yLmZyb20gPT09ICdAYW5ndWxhci9jb3JlJyk7XG4gIH1cblxuICBhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8UjNEaXJlY3RpdmVNZXRhZGF0YT4ge1xuICAgIGNvbnN0IGFuYWx5c2lzID0gZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhKG5vZGUsIGRlY29yYXRvciwgdGhpcy5jaGVja2VyKTtcblxuICAgIC8vIElmIHRoZSBkaXJlY3RpdmUgaGFzIGEgc2VsZWN0b3IsIGl0IHNob3VsZCBiZSByZWdpc3RlcmVkIHdpdGggdGhlIGBTZWxlY3RvclNjb3BlUmVnaXN0cnlgIHNvXG4gICAgLy8gd2hlbiB0aGlzIGRpcmVjdGl2ZSBhcHBlYXJzIGluIGFuIGBATmdNb2R1bGVgIHNjb3BlLCBpdHMgc2VsZWN0b3IgY2FuIGJlIGRldGVybWluZWQuXG4gICAgaWYgKGFuYWx5c2lzICYmIGFuYWx5c2lzLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnNjb3BlUmVnaXN0cnkucmVnaXN0ZXJTZWxlY3Rvcihub2RlLCBhbmFseXNpcy5zZWxlY3Rvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHthbmFseXNpc307XG4gIH1cblxuICBjb21waWxlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSM0RpcmVjdGl2ZU1ldGFkYXRhKTogQ29tcGlsZVJlc3VsdCB7XG4gICAgY29uc3QgcG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgICBjb25zdCByZXMgPSBjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhKGFuYWx5c2lzLCBwb29sLCBtYWtlQmluZGluZ1BhcnNlcigpKTtcbiAgICByZXR1cm4ge1xuICAgICAgZmllbGQ6ICduZ0RpcmVjdGl2ZURlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sXG4gICAgICBzdGF0ZW1lbnRzOiBwb29sLnN0YXRlbWVudHMsXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGV4dHJhY3QgbWV0YWRhdGEgZnJvbSBhIGBEaXJlY3RpdmVgIG9yIGBDb21wb25lbnRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdERpcmVjdGl2ZU1ldGFkYXRhKFxuICAgIGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvciwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBSM0RpcmVjdGl2ZU1ldGFkYXRhfFxuICAgIHVuZGVmaW5lZCB7XG4gIGNvbnN0IG1ldGEgPSBkZWNvcmF0b3IuYXJnc1swXTtcbiAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCBiZSBsaXRlcmFsLmApO1xuICB9XG4gIGNvbnN0IGRpcmVjdGl2ZSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuXG4gIGlmIChkaXJlY3RpdmUuaGFzKCdqaXQnKSkge1xuICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvLyBQcmVjb21wdXRlIGEgbGlzdCBvZiB0cy5DbGFzc0VsZW1lbnRzIHRoYXQgaGF2ZSBkZWNvcmF0b3JzLiBUaGlzIGluY2x1ZGVzIHRoaW5ncyBsaWtlIEBJbnB1dCxcbiAgLy8gQE91dHB1dCwgQEhvc3RCaW5kaW5nLCBldGMuXG4gIGNvbnN0IGRlY29yYXRlZEVsZW1lbnRzID0gZ2V0RGVjb3JhdGVkQ2xhc3NFbGVtZW50cyhjbGF6eiwgY2hlY2tlcik7XG5cbiAgLy8gQ29uc3RydWN0IHRoZSBtYXAgb2YgaW5wdXRzIGJvdGggZnJvbSB0aGUgQERpcmVjdGl2ZS9AQ29tcG9uZW50IGRlY29yYXRvciwgYW5kIHRoZSBkZWNvcmF0ZWRcbiAgLy8gZmllbGRzLlxuICBjb25zdCBpbnB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdpbnB1dHMnLCBjaGVja2VyKTtcbiAgY29uc3QgaW5wdXRzRnJvbUZpZWxkcyA9IHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgICAgZmluZERlY29yYXRlZEZpZWxkcyhkZWNvcmF0ZWRFbGVtZW50cywgJ0Bhbmd1bGFyL2NvcmUnLCAnSW5wdXQnKSwgY2hlY2tlcik7XG5cbiAgLy8gQW5kIG91dHB1dHMuXG4gIGNvbnN0IG91dHB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdvdXRwdXRzJywgY2hlY2tlcik7XG4gIGNvbnN0IG91dHB1dHNGcm9tRmllbGRzID0gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgICBmaW5kRGVjb3JhdGVkRmllbGRzKGRlY29yYXRlZEVsZW1lbnRzLCAnQGFuZ3VsYXIvY29yZScsICdPdXRwdXQnKSwgY2hlY2tlcik7XG5cbiAgLy8gUGFyc2UgdGhlIHNlbGVjdG9yLlxuICBsZXQgc2VsZWN0b3IgPSAnJztcbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ3NlbGVjdG9yJykpIHtcbiAgICBjb25zdCByZXNvbHZlZCA9IHN0YXRpY2FsbHlSZXNvbHZlKGRpcmVjdGl2ZS5nZXQoJ3NlbGVjdG9yJykgISwgY2hlY2tlcik7XG4gICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgU2VsZWN0b3IgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBzZWxlY3RvciA9IHJlc29sdmVkO1xuICB9XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGBuZ09uQ2hhbmdlc2AgaXMgYSBsaWZlY3ljbGUgaG9vayBkZWZpbmVkIG9uIHRoZSBjb21wb25lbnQuXG4gIGNvbnN0IHVzZXNPbkNoYW5nZXMgPSByZWZsZWN0Tm9uU3RhdGljRmllbGQoY2xhenosICduZ09uQ2hhbmdlcycpICE9PSBudWxsO1xuXG4gIHJldHVybiB7XG4gICAgbmFtZTogY2xhenoubmFtZSAhLnRleHQsXG4gICAgZGVwczogZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIGNoZWNrZXIpLFxuICAgIGhvc3Q6IHtcbiAgICAgIGF0dHJpYnV0ZXM6IHt9LFxuICAgICAgbGlzdGVuZXJzOiB7fSxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgIH0sXG4gICAgbGlmZWN5Y2xlOiB7XG4gICAgICAgIHVzZXNPbkNoYW5nZXMsXG4gICAgfSxcbiAgICBpbnB1dHM6IHsuLi5pbnB1dHNGcm9tTWV0YSwgLi4uaW5wdXRzRnJvbUZpZWxkc30sXG4gICAgb3V0cHV0czogey4uLm91dHB1dHNGcm9tTWV0YSwgLi4ub3V0cHV0c0Zyb21GaWVsZHN9LFxuICAgIHF1ZXJpZXM6IFtdLCBzZWxlY3RvcixcbiAgICB0eXBlOiBuZXcgV3JhcHBlZE5vZGVFeHByKGNsYXp6Lm5hbWUgISksXG4gICAgdHlwZVNvdXJjZVNwYW46IG51bGwgISxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0SXNTdHJpbmdBcnJheSh2YWx1ZTogYW55W10pOiB2YWx1ZSBpcyBzdHJpbmdbXSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlW2ldICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmVzb2x2ZSBARGlyZWN0aXZlLmlucHV0c1ske2l9XSB0byBhIHN0cmluZ2ApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxudHlwZSBEZWNvcmF0ZWRQcm9wZXJ0eSA9IERlY29yYXRlZE5vZGU8dHMuUHJvcGVydHlEZWNsYXJhdGlvbnx0cy5BY2Nlc3NvckRlY2xhcmF0aW9uPjtcblxuLyoqXG4gKiBGaW5kIGFsbCBmaWVsZHMgaW4gdGhlIGFycmF5IG9mIGBEZWNvcmF0ZWROb2RlYHMgdGhhdCBoYXZlIGEgZGVjb3JhdG9yIG9mIHRoZSBnaXZlbiB0eXBlLlxuICovXG5mdW5jdGlvbiBmaW5kRGVjb3JhdGVkRmllbGRzKFxuICAgIGVsZW1lbnRzOiBEZWNvcmF0ZWROb2RlPHRzLkNsYXNzRWxlbWVudD5bXSwgZGVjb3JhdG9yTW9kdWxlOiBzdHJpbmcsXG4gICAgZGVjb3JhdG9yTmFtZTogc3RyaW5nKTogRGVjb3JhdGVkUHJvcGVydHlbXSB7XG4gIHJldHVybiBlbGVtZW50c1xuICAgICAgLm1hcChlbnRyeSA9PiB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSBlbnRyeS5lbGVtZW50O1xuICAgICAgICAvLyBPbmx5IGNvbnNpZGVyIHByb3BlcnRpZXMgYW5kIGFjY2Vzc29ycy4gRmlsdGVyIG91dCBldmVyeXRoaW5nIGVsc2UuXG4gICAgICAgIGlmICghdHMuaXNQcm9wZXJ0eURlY2xhcmF0aW9uKGVsZW1lbnQpICYmICF0cy5pc0FjY2Vzc29yKGVsZW1lbnQpKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRyYWN0IHRoZSBhcnJheSBvZiBtYXRjaGluZyBkZWNvcmF0b3JzICh0aGVyZSBjb3VsZCBiZSBtb3JlIHRoYW4gb25lKS5cbiAgICAgICAgY29uc3QgZGVjb3JhdG9ycyA9IGVudHJ5LmRlY29yYXRvcnMuZmlsdGVyKFxuICAgICAgICAgICAgZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSBkZWNvcmF0b3JOYW1lICYmIGRlY29yYXRvci5mcm9tID09PSBkZWNvcmF0b3JNb2R1bGUpO1xuICAgICAgICBpZiAoZGVjb3JhdG9ycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAvLyBObyBtYXRjaGluZyBkZWNvcmF0b3JzLCBkb24ndCBpbmNsdWRlIHRoaXMgZWxlbWVudC5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge2VsZW1lbnQsIGRlY29yYXRvcnN9O1xuICAgICAgfSlcbiAgICAgIC8vIEZpbHRlciBvdXQgbnVsbHMuXG4gICAgICAuZmlsdGVyKGVudHJ5ID0+IGVudHJ5ICE9PSBudWxsKSBhcyBEZWNvcmF0ZWRQcm9wZXJ0eVtdO1xufVxuXG4vKipcbiAqIEludGVycHJldCBwcm9wZXJ0eSBtYXBwaW5nIGZpZWxkcyBvbiB0aGUgZGVjb3JhdG9yIChlLmcuIGlucHV0cyBvciBvdXRwdXRzKSBhbmQgcmV0dXJuIHRoZVxuICogY29ycmVjdGx5IHNoYXBlZCBtZXRhZGF0YSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhcbiAgICBkaXJlY3RpdmU6IE1hcDxzdHJpbmcsIHRzLkV4cHJlc3Npb24+LCBmaWVsZDogc3RyaW5nLFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKToge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfSB7XG4gIGlmICghZGlyZWN0aXZlLmhhcyhmaWVsZCkpIHtcbiAgICByZXR1cm4gRU1QVFlfT0JKRUNUO1xuICB9XG5cbiAgLy8gUmVzb2x2ZSB0aGUgZmllbGQgb2YgaW50ZXJlc3QgZnJvbSB0aGUgZGlyZWN0aXZlIG1ldGFkYXRhIHRvIGEgc3RyaW5nW10uXG4gIGNvbnN0IG1ldGFWYWx1ZXMgPSBzdGF0aWNhbGx5UmVzb2x2ZShkaXJlY3RpdmUuZ2V0KGZpZWxkKSAhLCBjaGVja2VyKTtcbiAgaWYgKCFBcnJheS5pc0FycmF5KG1ldGFWYWx1ZXMpIHx8ICFhc3NlcnRJc1N0cmluZ0FycmF5KG1ldGFWYWx1ZXMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmVzb2x2ZSBARGlyZWN0aXZlLiR7ZmllbGR9YCk7XG4gIH1cblxuICByZXR1cm4gbWV0YVZhbHVlcy5yZWR1Y2UoXG4gICAgICAocmVzdWx0cywgdmFsdWUpID0+IHtcbiAgICAgICAgLy8gRWl0aGVyIHRoZSB2YWx1ZSBpcyAnZmllbGQnIG9yICdmaWVsZDogcHJvcGVydHknLiBJbiB0aGUgZmlyc3QgY2FzZSwgYHByb3BlcnR5YCB3aWxsXG4gICAgICAgIC8vIGJlIHVuZGVmaW5lZCwgaW4gd2hpY2ggY2FzZSB0aGUgZmllbGQgbmFtZSBzaG91bGQgYWxzbyBiZSB1c2VkIGFzIHRoZSBwcm9wZXJ0eSBuYW1lLlxuICAgICAgICBjb25zdCBbZmllbGQsIHByb3BlcnR5XSA9IHZhbHVlLnNwbGl0KCc6JywgMikubWFwKHN0ciA9PiBzdHIudHJpbSgpKTtcbiAgICAgICAgcmVzdWx0c1tmaWVsZF0gPSBwcm9wZXJ0eSB8fCBmaWVsZDtcbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9LFxuICAgICAge30gYXN7W2ZpZWxkOiBzdHJpbmddOiBzdHJpbmd9KTtcbn1cblxuLyoqXG4gKiBQYXJzZSBwcm9wZXJ0eSBkZWNvcmF0b3JzIChlLmcuIGBJbnB1dGAgb3IgYE91dHB1dGApIGFuZCByZXR1cm4gdGhlIGNvcnJlY3RseSBzaGFwZWQgbWV0YWRhdGFcbiAqIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgZmllbGRzOiBEZWNvcmF0ZWRQcm9wZXJ0eVtdLCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZ30ge1xuICByZXR1cm4gZmllbGRzLnJlZHVjZShcbiAgICAgIChyZXN1bHRzLCBmaWVsZCkgPT4ge1xuICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAoZmllbGQuZWxlbWVudC5uYW1lIGFzIHRzLklkZW50aWZpZXIpLnRleHQ7XG4gICAgICAgIGZpZWxkLmRlY29yYXRvcnMuZm9yRWFjaChkZWNvcmF0b3IgPT4ge1xuICAgICAgICAgIC8vIFRoZSBkZWNvcmF0b3IgZWl0aGVyIGRvZXNuJ3QgaGF2ZSBhbiBhcmd1bWVudCAoQElucHV0KCkpIGluIHdoaWNoIGNhc2UgdGhlIHByb3BlcnR5XG4gICAgICAgICAgLy8gbmFtZSBpcyB1c2VkLCBvciBpdCBoYXMgb25lIGFyZ3VtZW50IChAT3V0cHV0KCduYW1lZCcpKS5cbiAgICAgICAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXN1bHRzW2ZpZWxkTmFtZV0gPSBmaWVsZE5hbWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5ID0gc3RhdGljYWxseVJlc29sdmUoZGVjb3JhdG9yLmFyZ3NbMF0sIGNoZWNrZXIpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCByZXNvbHZlIHRvIGEgc3RyaW5nYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHRzW2ZpZWxkTmFtZV0gPSBwcm9wZXJ0eTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVG9vIG1hbnkgYXJndW1lbnRzLlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIGBEZWNvcmF0b3IgbXVzdCBoYXZlIDAgb3IgMSBhcmd1bWVudHMsIGdvdCAke2RlY29yYXRvci5hcmdzLmxlbmd0aH0gYXJndW1lbnQocylgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH0sXG4gICAgICB7fSBhc3tbZmllbGQ6IHN0cmluZ106IHN0cmluZ30pO1xufVxuIl19