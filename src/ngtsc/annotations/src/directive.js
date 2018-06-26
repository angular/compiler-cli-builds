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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/directive", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/host", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/host");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var EMPTY_OBJECT = {};
    var DirectiveDecoratorHandler = /** @class */ (function () {
        function DirectiveDecoratorHandler(checker, reflector, scopeRegistry) {
            this.checker = checker;
            this.reflector = reflector;
            this.scopeRegistry = scopeRegistry;
        }
        DirectiveDecoratorHandler.prototype.detect = function (decorators) {
            return decorators.find(function (decorator) { return decorator.name === 'Directive' && util_1.isAngularCore(decorator); });
        };
        DirectiveDecoratorHandler.prototype.analyze = function (node, decorator) {
            var analysis = extractDirectiveMetadata(node, decorator, this.checker, this.reflector);
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
                name: 'ngDirectiveDef',
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
    function extractDirectiveMetadata(clazz, decorator, checker, reflector) {
        if (decorator.args === null || decorator.args.length !== 1) {
            throw new Error("Incorrect number of arguments to @" + decorator.name + " decorator");
        }
        var meta = decorator.args[0];
        if (!ts.isObjectLiteralExpression(meta)) {
            throw new Error("Decorator argument must be literal.");
        }
        var directive = metadata_1.reflectObjectLiteral(meta);
        if (directive.has('jit')) {
            // The only allowed value is true, so there's no need to expand further.
            return undefined;
        }
        var members = reflector.getMembersOfClass(clazz);
        // Precompute a list of ts.ClassElements that have decorators. This includes things like @Input,
        // @Output, @HostBinding, etc.
        var decoratedElements = members.filter(function (member) { return !member.isStatic && member.decorators !== null; });
        // Construct the map of inputs both from the @Directive/@Component
        // decorator, and the decorated
        // fields.
        var inputsFromMeta = parseFieldToPropertyMapping(directive, 'inputs', checker);
        var inputsFromFields = parseDecoratedFields(reflector_1.filterToMembersWithDecorator(decoratedElements, 'Input', '@angular/core'), checker);
        // And outputs.
        var outputsFromMeta = parseFieldToPropertyMapping(directive, 'outputs', checker);
        var outputsFromFields = parseDecoratedFields(reflector_1.filterToMembersWithDecorator(decoratedElements, '@angular/core', 'Output'), checker);
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
        var usesOnChanges = members.find(function (member) { return member.isStatic && member.kind === host_1.ClassMemberKind.Method &&
            member.name === 'ngOnChanges'; }) !== undefined;
        return {
            name: clazz.name.text,
            deps: util_1.getConstructorDependencies(clazz, reflector),
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
            var fieldName = field.member.name;
            field.decorators.forEach(function (decorator) {
                // The decorator either doesn't have an argument (@Input()) in which case the property
                // name is used, or it has one argument (@Output('named')).
                if (decorator.args == null || decorator.args.length === 0) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFzSTtJQUN0SSwrQkFBaUM7SUFFakMsNkRBQTJGO0lBQzNGLHFFQUF1RTtJQUN2RSxvRkFBMEU7SUFJMUUsNkVBQWlFO0lBRWpFLElBQU0sWUFBWSxHQUE0QixFQUFFLENBQUM7SUFFakQ7UUFDRSxtQ0FDWSxPQUF1QixFQUFVLFNBQXlCLEVBQzFELGFBQW9DO1lBRHBDLFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDMUQsa0JBQWEsR0FBYixhQUFhLENBQXVCO1FBQUcsQ0FBQztRQUVwRCwwQ0FBTSxHQUFOLFVBQU8sVUFBdUI7WUFDNUIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksb0JBQWEsQ0FBQyxTQUFTLENBQUMsRUFBMUQsQ0FBMEQsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7UUFFRCwyQ0FBTyxHQUFQLFVBQVEsSUFBeUIsRUFBRSxTQUFvQjtZQUNyRCxJQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXpGLCtGQUErRjtZQUMvRix1RkFBdUY7WUFDdkYsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQzFDLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQzth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QUcsU0FBUyxDQUFDO2lCQUNoQztxQkFBTSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDdEMsSUFBTSxRQUFRLEdBQUcsNEJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDL0QsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUU7d0JBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztxQkFDaEU7b0JBQ0QsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLFFBQVEsQ0FBQztpQkFDL0I7cUJBQU07b0JBQ0wsc0JBQXNCO29CQUN0QixNQUFNLElBQUksS0FBSyxDQUNYLCtDQUE2QyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0saUJBQWMsQ0FBQyxDQUFDO2lCQUN2RjtZQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQyxFQUNELEVBQThCLENBQUMsQ0FBQztJQUN0QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgUjNEaXJlY3RpdmVNZXRhZGF0YSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlRGlyZWN0aXZlRnJvbU1ldGFkYXRhLCBtYWtlQmluZGluZ1BhcnNlcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NNZW1iZXIsIENsYXNzTWVtYmVyS2luZCwgRGVjb3JhdG9yLCBJbXBvcnQsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9ob3N0JztcbmltcG9ydCB7cmVmbGVjdE9iamVjdExpdGVyYWwsIHN0YXRpY2FsbHlSZXNvbHZlfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge2ZpbHRlclRvTWVtYmVyc1dpdGhEZWNvcmF0b3J9IGZyb20gJy4uLy4uL21ldGFkYXRhL3NyYy9yZWZsZWN0b3InO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vc2VsZWN0b3Jfc2NvcGUnO1xuaW1wb3J0IHtnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNBbmd1bGFyQ29yZX0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgRU1QVFlfT0JKRUNUOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG5leHBvcnQgY2xhc3MgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzIERlY29yYXRvckhhbmRsZXI8UjNEaXJlY3RpdmVNZXRhZGF0YT4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogU2VsZWN0b3JTY29wZVJlZ2lzdHJ5KSB7fVxuXG4gIGRldGVjdChkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnRGlyZWN0aXZlJyAmJiBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpO1xuICB9XG5cbiAgYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PFIzRGlyZWN0aXZlTWV0YWRhdGE+IHtcbiAgICBjb25zdCBhbmFseXNpcyA9IGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShub2RlLCBkZWNvcmF0b3IsIHRoaXMuY2hlY2tlciwgdGhpcy5yZWZsZWN0b3IpO1xuXG4gICAgLy8gSWYgdGhlIGRpcmVjdGl2ZSBoYXMgYSBzZWxlY3RvciwgaXQgc2hvdWxkIGJlIHJlZ2lzdGVyZWQgd2l0aCB0aGUgYFNlbGVjdG9yU2NvcGVSZWdpc3RyeWAgc29cbiAgICAvLyB3aGVuIHRoaXMgZGlyZWN0aXZlIGFwcGVhcnMgaW4gYW4gYEBOZ01vZHVsZWAgc2NvcGUsIGl0cyBzZWxlY3RvciBjYW4gYmUgZGV0ZXJtaW5lZC5cbiAgICBpZiAoYW5hbHlzaXMgJiYgYW5hbHlzaXMuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3RlclNlbGVjdG9yKG5vZGUsIGFuYWx5c2lzLnNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge2FuYWx5c2lzfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFIzRGlyZWN0aXZlTWV0YWRhdGEpOiBDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCBwb29sID0gbmV3IENvbnN0YW50UG9vbCgpO1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVEaXJlY3RpdmVGcm9tTWV0YWRhdGEoYW5hbHlzaXMsIHBvb2wsIG1ha2VCaW5kaW5nUGFyc2VyKCkpO1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnbmdEaXJlY3RpdmVEZWYnLFxuICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgc3RhdGVtZW50czogcG9vbC5zdGF0ZW1lbnRzLFxuICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBleHRyYWN0IG1ldGFkYXRhIGZyb20gYSBgRGlyZWN0aXZlYCBvciBgQ29tcG9uZW50YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3REaXJlY3RpdmVNZXRhZGF0YShcbiAgICBjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiBSM0RpcmVjdGl2ZU1ldGFkYXRhfHVuZGVmaW5lZCB7XG4gIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEAke2RlY29yYXRvci5uYW1lfSBkZWNvcmF0b3JgKTtcbiAgfVxuICBjb25zdCBtZXRhID0gZGVjb3JhdG9yLmFyZ3NbMF07XG4gIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgfVxuICBjb25zdCBkaXJlY3RpdmUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICBpZiAoZGlyZWN0aXZlLmhhcygnaml0JykpIHtcbiAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgY29uc3QgbWVtYmVycyA9IHJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhjbGF6eik7XG5cbiAgLy8gUHJlY29tcHV0ZSBhIGxpc3Qgb2YgdHMuQ2xhc3NFbGVtZW50cyB0aGF0IGhhdmUgZGVjb3JhdG9ycy4gVGhpcyBpbmNsdWRlcyB0aGluZ3MgbGlrZSBASW5wdXQsXG4gIC8vIEBPdXRwdXQsIEBIb3N0QmluZGluZywgZXRjLlxuICBjb25zdCBkZWNvcmF0ZWRFbGVtZW50cyA9XG4gICAgICBtZW1iZXJzLmZpbHRlcihtZW1iZXIgPT4gIW1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIuZGVjb3JhdG9ycyAhPT0gbnVsbCk7XG5cbiAgLy8gQ29uc3RydWN0IHRoZSBtYXAgb2YgaW5wdXRzIGJvdGggZnJvbSB0aGUgQERpcmVjdGl2ZS9AQ29tcG9uZW50XG4gIC8vIGRlY29yYXRvciwgYW5kIHRoZSBkZWNvcmF0ZWRcbiAgLy8gZmllbGRzLlxuICBjb25zdCBpbnB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdpbnB1dHMnLCBjaGVja2VyKTtcbiAgY29uc3QgaW5wdXRzRnJvbUZpZWxkcyA9IHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgICAgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvcihkZWNvcmF0ZWRFbGVtZW50cywgJ0lucHV0JywgJ0Bhbmd1bGFyL2NvcmUnKSwgY2hlY2tlcik7XG5cbiAgLy8gQW5kIG91dHB1dHMuXG4gIGNvbnN0IG91dHB1dHNGcm9tTWV0YSA9IHBhcnNlRmllbGRUb1Byb3BlcnR5TWFwcGluZyhkaXJlY3RpdmUsICdvdXRwdXRzJywgY2hlY2tlcik7XG4gIGNvbnN0IG91dHB1dHNGcm9tRmllbGRzID0gcGFyc2VEZWNvcmF0ZWRGaWVsZHMoXG4gICAgICBmaWx0ZXJUb01lbWJlcnNXaXRoRGVjb3JhdG9yKGRlY29yYXRlZEVsZW1lbnRzLCAnQGFuZ3VsYXIvY29yZScsICdPdXRwdXQnKSwgY2hlY2tlcik7XG5cbiAgLy8gUGFyc2UgdGhlIHNlbGVjdG9yLlxuICBsZXQgc2VsZWN0b3IgPSAnJztcbiAgaWYgKGRpcmVjdGl2ZS5oYXMoJ3NlbGVjdG9yJykpIHtcbiAgICBjb25zdCByZXNvbHZlZCA9IHN0YXRpY2FsbHlSZXNvbHZlKGRpcmVjdGl2ZS5nZXQoJ3NlbGVjdG9yJykgISwgY2hlY2tlcik7XG4gICAgaWYgKHR5cGVvZiByZXNvbHZlZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgU2VsZWN0b3IgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICBzZWxlY3RvciA9IHJlc29sdmVkO1xuICB9XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGBuZ09uQ2hhbmdlc2AgaXMgYSBsaWZlY3ljbGUgaG9vayBkZWZpbmVkIG9uIHRoZSBjb21wb25lbnQuXG4gIGNvbnN0IHVzZXNPbkNoYW5nZXMgPSBtZW1iZXJzLmZpbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVtYmVyID0+IG1lbWJlci5pc1N0YXRpYyAmJiBtZW1iZXIua2luZCA9PT0gQ2xhc3NNZW1iZXJLaW5kLk1ldGhvZCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZW1iZXIubmFtZSA9PT0gJ25nT25DaGFuZ2VzJykgIT09IHVuZGVmaW5lZDtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6IGNsYXp6Lm5hbWUgIS50ZXh0LFxuICAgIGRlcHM6IGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IpLFxuICAgIGhvc3Q6IHtcbiAgICAgIGF0dHJpYnV0ZXM6IHt9LFxuICAgICAgbGlzdGVuZXJzOiB7fSxcbiAgICAgIHByb3BlcnRpZXM6IHt9LFxuICAgIH0sXG4gICAgbGlmZWN5Y2xlOiB7XG4gICAgICAgIHVzZXNPbkNoYW5nZXMsXG4gICAgfSxcbiAgICBpbnB1dHM6IHsuLi5pbnB1dHNGcm9tTWV0YSwgLi4uaW5wdXRzRnJvbUZpZWxkc30sXG4gICAgb3V0cHV0czogey4uLm91dHB1dHNGcm9tTWV0YSwgLi4ub3V0cHV0c0Zyb21GaWVsZHN9LFxuICAgIHF1ZXJpZXM6IFtdLCBzZWxlY3RvcixcbiAgICB0eXBlOiBuZXcgV3JhcHBlZE5vZGVFeHByKGNsYXp6Lm5hbWUgISksXG4gICAgdHlwZVNvdXJjZVNwYW46IG51bGwgISxcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0SXNTdHJpbmdBcnJheSh2YWx1ZTogYW55W10pOiB2YWx1ZSBpcyBzdHJpbmdbXSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlW2ldICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gcmVzb2x2ZSBARGlyZWN0aXZlLmlucHV0c1ske2l9XSB0byBhIHN0cmluZ2ApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBJbnRlcnByZXQgcHJvcGVydHkgbWFwcGluZyBmaWVsZHMgb24gdGhlIGRlY29yYXRvciAoZS5nLiBpbnB1dHMgb3Igb3V0cHV0cykgYW5kIHJldHVybiB0aGVcbiAqIGNvcnJlY3RseSBzaGFwZWQgbWV0YWRhdGEgb2JqZWN0LlxuICovXG5mdW5jdGlvbiBwYXJzZUZpZWxkVG9Qcm9wZXJ0eU1hcHBpbmcoXG4gICAgZGlyZWN0aXZlOiBNYXA8c3RyaW5nLCB0cy5FeHByZXNzaW9uPiwgZmllbGQ6IHN0cmluZyxcbiAgICBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IHtbZmllbGQ6IHN0cmluZ106IHN0cmluZ30ge1xuICBpZiAoIWRpcmVjdGl2ZS5oYXMoZmllbGQpKSB7XG4gICAgcmV0dXJuIEVNUFRZX09CSkVDVDtcbiAgfVxuXG4gIC8vIFJlc29sdmUgdGhlIGZpZWxkIG9mIGludGVyZXN0IGZyb20gdGhlIGRpcmVjdGl2ZSBtZXRhZGF0YSB0byBhIHN0cmluZ1tdLlxuICBjb25zdCBtZXRhVmFsdWVzID0gc3RhdGljYWxseVJlc29sdmUoZGlyZWN0aXZlLmdldChmaWVsZCkgISwgY2hlY2tlcik7XG4gIGlmICghQXJyYXkuaXNBcnJheShtZXRhVmFsdWVzKSB8fCAhYXNzZXJ0SXNTdHJpbmdBcnJheShtZXRhVmFsdWVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJlc29sdmUgQERpcmVjdGl2ZS4ke2ZpZWxkfWApO1xuICB9XG5cbiAgcmV0dXJuIG1ldGFWYWx1ZXMucmVkdWNlKFxuICAgICAgKHJlc3VsdHMsIHZhbHVlKSA9PiB7XG4gICAgICAgIC8vIEVpdGhlciB0aGUgdmFsdWUgaXMgJ2ZpZWxkJyBvciAnZmllbGQ6IHByb3BlcnR5Jy4gSW4gdGhlIGZpcnN0IGNhc2UsIGBwcm9wZXJ0eWAgd2lsbFxuICAgICAgICAvLyBiZSB1bmRlZmluZWQsIGluIHdoaWNoIGNhc2UgdGhlIGZpZWxkIG5hbWUgc2hvdWxkIGFsc28gYmUgdXNlZCBhcyB0aGUgcHJvcGVydHkgbmFtZS5cbiAgICAgICAgY29uc3QgW2ZpZWxkLCBwcm9wZXJ0eV0gPSB2YWx1ZS5zcGxpdCgnOicsIDIpLm1hcChzdHIgPT4gc3RyLnRyaW0oKSk7XG4gICAgICAgIHJlc3VsdHNbZmllbGRdID0gcHJvcGVydHkgfHwgZmllbGQ7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfSxcbiAgICAgIHt9IGFze1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfSk7XG59XG5cbi8qKlxuICogUGFyc2UgcHJvcGVydHkgZGVjb3JhdG9ycyAoZS5nLiBgSW5wdXRgIG9yIGBPdXRwdXRgKSBhbmQgcmV0dXJuIHRoZSBjb3JyZWN0bHkgc2hhcGVkIG1ldGFkYXRhXG4gKiBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlRGVjb3JhdGVkRmllbGRzKFxuICAgIGZpZWxkczoge21lbWJlcjogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcnM6IERlY29yYXRvcltdfVtdLFxuICAgIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKToge1tmaWVsZDogc3RyaW5nXTogc3RyaW5nfSB7XG4gIHJldHVybiBmaWVsZHMucmVkdWNlKFxuICAgICAgKHJlc3VsdHMsIGZpZWxkKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGZpZWxkLm1lbWJlci5uYW1lO1xuICAgICAgICBmaWVsZC5kZWNvcmF0b3JzLmZvckVhY2goZGVjb3JhdG9yID0+IHtcbiAgICAgICAgICAvLyBUaGUgZGVjb3JhdG9yIGVpdGhlciBkb2Vzbid0IGhhdmUgYW4gYXJndW1lbnQgKEBJbnB1dCgpKSBpbiB3aGljaCBjYXNlIHRoZSBwcm9wZXJ0eVxuICAgICAgICAgIC8vIG5hbWUgaXMgdXNlZCwgb3IgaXQgaGFzIG9uZSBhcmd1bWVudCAoQE91dHB1dCgnbmFtZWQnKSkuXG4gICAgICAgICAgaWYgKGRlY29yYXRvci5hcmdzID09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXN1bHRzW2ZpZWxkTmFtZV0gPSBmaWVsZE5hbWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5ID0gc3RhdGljYWxseVJlc29sdmUoZGVjb3JhdG9yLmFyZ3NbMF0sIGNoZWNrZXIpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCByZXNvbHZlIHRvIGEgc3RyaW5nYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHRzW2ZpZWxkTmFtZV0gPSBwcm9wZXJ0eTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVG9vIG1hbnkgYXJndW1lbnRzLlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgIGBEZWNvcmF0b3IgbXVzdCBoYXZlIDAgb3IgMSBhcmd1bWVudHMsIGdvdCAke2RlY29yYXRvci5hcmdzLmxlbmd0aH0gYXJndW1lbnQocylgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH0sXG4gICAgICB7fSBhc3tbZmllbGQ6IHN0cmluZ106IHN0cmluZ30pO1xufVxuIl19