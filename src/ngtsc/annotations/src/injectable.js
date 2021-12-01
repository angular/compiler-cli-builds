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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/injectable", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InjectableDecoratorHandler = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Adapts the `compileInjectable` compiler for `@Injectable` decorators to the Ivy compiler.
     */
    var InjectableDecoratorHandler = /** @class */ (function () {
        function InjectableDecoratorHandler(reflector, isCore, strictCtorDeps, injectableRegistry, perf, 
        /**
         * What to do if the injectable already contains a ɵprov property.
         *
         * If true then an error diagnostic is reported.
         * If false then there is no error and a new ɵprov property is not added.
         */
        errorOnDuplicateProv) {
            if (errorOnDuplicateProv === void 0) { errorOnDuplicateProv = true; }
            this.reflector = reflector;
            this.isCore = isCore;
            this.strictCtorDeps = strictCtorDeps;
            this.injectableRegistry = injectableRegistry;
            this.perf = perf;
            this.errorOnDuplicateProv = errorOnDuplicateProv;
            this.precedence = transform_1.HandlerPrecedence.SHARED;
            this.name = InjectableDecoratorHandler.name;
        }
        InjectableDecoratorHandler.prototype.detect = function (node, decorators) {
            if (!decorators) {
                return undefined;
            }
            var decorator = util_1.findAngularDecorator(decorators, 'Injectable', this.isCore);
            if (decorator !== undefined) {
                return {
                    trigger: decorator.node,
                    decorator: decorator,
                    metadata: decorator,
                };
            }
            else {
                return undefined;
            }
        };
        InjectableDecoratorHandler.prototype.analyze = function (node, decorator) {
            this.perf.eventCount(perf_1.PerfEvent.AnalyzeInjectable);
            var meta = extractInjectableMetadata(node, decorator, this.reflector);
            var decorators = this.reflector.getDecoratorsOfDeclaration(node);
            return {
                analysis: {
                    meta: meta,
                    ctorDeps: extractInjectableCtorDeps(node, meta, decorator, this.reflector, this.isCore, this.strictCtorDeps),
                    classMetadata: metadata_1.extractClassMetadata(node, this.reflector, this.isCore),
                    // Avoid generating multiple factories if a class has
                    // more Angular decorators, apart from Injectable.
                    needsFactory: !decorators ||
                        decorators.every(function (current) { return !util_1.isAngularCore(current) || current.name === 'Injectable'; })
                },
            };
        };
        InjectableDecoratorHandler.prototype.symbol = function () {
            return null;
        };
        InjectableDecoratorHandler.prototype.register = function (node) {
            this.injectableRegistry.registerInjectable(node);
        };
        InjectableDecoratorHandler.prototype.compileFull = function (node, analysis) {
            return this.compile(factory_1.compileNgFactoryDefField, function (meta) { return compiler_1.compileInjectable(meta, false); }, compiler_1.compileClassMetadata, node, analysis);
        };
        InjectableDecoratorHandler.prototype.compilePartial = function (node, analysis) {
            return this.compile(factory_1.compileDeclareFactory, compiler_1.compileDeclareInjectableFromMetadata, compiler_1.compileDeclareClassMetadata, node, analysis);
        };
        InjectableDecoratorHandler.prototype.compile = function (compileFactoryFn, compileInjectableFn, compileClassMetadataFn, node, analysis) {
            var results = [];
            if (analysis.needsFactory) {
                var meta = analysis.meta;
                var factoryRes = compileFactoryFn(util_1.toFactoryMetadata(tslib_1.__assign(tslib_1.__assign({}, meta), { deps: analysis.ctorDeps }), compiler_1.FactoryTarget.Injectable));
                if (analysis.classMetadata !== null) {
                    factoryRes.statements.push(compileClassMetadataFn(analysis.classMetadata).toStmt());
                }
                results.push(factoryRes);
            }
            var ɵprov = this.reflector.getMembersOfClass(node).find(function (member) { return member.name === 'ɵprov'; });
            if (ɵprov !== undefined && this.errorOnDuplicateProv) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.INJECTABLE_DUPLICATE_PROV, ɵprov.nameNode || ɵprov.node || node, 'Injectables cannot contain a static ɵprov property, because the compiler is going to generate one.');
            }
            if (ɵprov === undefined) {
                // Only add a new ɵprov if there is not one already
                var res = compileInjectableFn(analysis.meta);
                results.push({ name: 'ɵprov', initializer: res.expression, statements: res.statements, type: res.type });
            }
            return results;
        };
        return InjectableDecoratorHandler;
    }());
    exports.InjectableDecoratorHandler = InjectableDecoratorHandler;
    /**
     * Read metadata from the `@Injectable` decorator and produce the `IvyInjectableMetadata`, the
     * input metadata needed to run `compileInjectable`.
     *
     * A `null` return value indicates this is @Injectable has invalid data.
     */
    function extractInjectableMetadata(clazz, decorator, reflector) {
        var name = clazz.name.text;
        var type = util_1.wrapTypeReference(reflector, clazz);
        var internalType = new compiler_1.WrappedNodeExpr(reflector.getInternalNameOfClass(clazz));
        var typeArgumentCount = reflector.getGenericArityOfClass(clazz) || 0;
        if (decorator.args === null) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, reflection_1.Decorator.nodeForError(decorator), '@Injectable must be called');
        }
        if (decorator.args.length === 0) {
            return {
                name: name,
                type: type,
                typeArgumentCount: typeArgumentCount,
                internalType: internalType,
                providedIn: compiler_1.createMayBeForwardRefExpression(new compiler_1.LiteralExpr(null), 0 /* None */),
            };
        }
        else if (decorator.args.length === 1) {
            var metaNode = decorator.args[0];
            // Firstly make sure the decorator argument is an inline literal - if not, it's illegal to
            // transport references from one location to another. This is the problem that lowering
            // used to solve - if this restriction proves too undesirable we can re-implement lowering.
            if (!ts.isObjectLiteralExpression(metaNode)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, metaNode, "@Injectable argument must be an object literal");
            }
            // Resolve the fields of the literal into a map of field name to expression.
            var meta = reflection_1.reflectObjectLiteral(metaNode);
            var providedIn = meta.has('providedIn') ?
                getProviderExpression(meta.get('providedIn'), reflector) :
                compiler_1.createMayBeForwardRefExpression(new compiler_1.LiteralExpr(null), 0 /* None */);
            var deps = undefined;
            if ((meta.has('useClass') || meta.has('useFactory')) && meta.has('deps')) {
                var depsExpr = meta.get('deps');
                if (!ts.isArrayLiteralExpression(depsExpr)) {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_NOT_LITERAL, depsExpr, "@Injectable deps metadata must be an inline array");
                }
                deps = depsExpr.elements.map(function (dep) { return getDep(dep, reflector); });
            }
            var result = { name: name, type: type, typeArgumentCount: typeArgumentCount, internalType: internalType, providedIn: providedIn };
            if (meta.has('useValue')) {
                result.useValue = getProviderExpression(meta.get('useValue'), reflector);
            }
            else if (meta.has('useExisting')) {
                result.useExisting = getProviderExpression(meta.get('useExisting'), reflector);
            }
            else if (meta.has('useClass')) {
                result.useClass = getProviderExpression(meta.get('useClass'), reflector);
                result.deps = deps;
            }
            else if (meta.has('useFactory')) {
                result.useFactory = new compiler_1.WrappedNodeExpr(meta.get('useFactory'));
                result.deps = deps;
            }
            return result;
        }
        else {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.args[2], 'Too many arguments to @Injectable');
        }
    }
    /**
     * Get the `R3ProviderExpression` for this `expression`.
     *
     * The `useValue`, `useExisting` and `useClass` properties might be wrapped in a `ForwardRef`, which
     * needs to be unwrapped. This function will do that unwrapping and set a flag on the returned
     * object to indicate whether the value needed unwrapping.
     */
    function getProviderExpression(expression, reflector) {
        var forwardRefValue = util_1.tryUnwrapForwardRef(expression, reflector);
        return compiler_1.createMayBeForwardRefExpression(new compiler_1.WrappedNodeExpr(forwardRefValue !== null && forwardRefValue !== void 0 ? forwardRefValue : expression), forwardRefValue !== null ? 2 /* Unwrapped */ : 0 /* None */);
    }
    function extractInjectableCtorDeps(clazz, meta, decorator, reflector, isCore, strictCtorDeps) {
        if (decorator.args === null) {
            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, reflection_1.Decorator.nodeForError(decorator), '@Injectable must be called');
        }
        var ctorDeps = null;
        if (decorator.args.length === 0) {
            // Ideally, using @Injectable() would have the same effect as using @Injectable({...}), and be
            // subject to the same validation. However, existing Angular code abuses @Injectable, applying
            // it to things like abstract classes with constructors that were never meant for use with
            // Angular's DI.
            //
            // To deal with this, @Injectable() without an argument is more lenient, and if the
            // constructor signature does not work for DI then a factory definition (ɵfac) that throws is
            // generated.
            if (strictCtorDeps) {
                ctorDeps = util_1.getValidConstructorDependencies(clazz, reflector, isCore);
            }
            else {
                ctorDeps =
                    util_1.unwrapConstructorDependencies(util_1.getConstructorDependencies(clazz, reflector, isCore));
            }
            return ctorDeps;
        }
        else if (decorator.args.length === 1) {
            var rawCtorDeps = util_1.getConstructorDependencies(clazz, reflector, isCore);
            if (strictCtorDeps && meta.useValue === undefined && meta.useExisting === undefined &&
                meta.useClass === undefined && meta.useFactory === undefined) {
                // Since use* was not provided, validate the deps according to strictCtorDeps.
                ctorDeps = util_1.validateConstructorDependencies(clazz, rawCtorDeps);
            }
            else {
                ctorDeps = util_1.unwrapConstructorDependencies(rawCtorDeps);
            }
        }
        return ctorDeps;
    }
    function getDep(dep, reflector) {
        var meta = {
            token: new compiler_1.WrappedNodeExpr(dep),
            attributeNameType: null,
            host: false,
            optional: false,
            self: false,
            skipSelf: false,
        };
        function maybeUpdateDecorator(dec, reflector, token) {
            var source = reflector.getImportOfIdentifier(dec);
            if (source === null || source.from !== '@angular/core') {
                return false;
            }
            switch (source.name) {
                case 'Inject':
                    if (token !== undefined) {
                        meta.token = new compiler_1.WrappedNodeExpr(token);
                    }
                    break;
                case 'Optional':
                    meta.optional = true;
                    break;
                case 'SkipSelf':
                    meta.skipSelf = true;
                    break;
                case 'Self':
                    meta.self = true;
                    break;
                default:
                    return false;
            }
            return true;
        }
        if (ts.isArrayLiteralExpression(dep)) {
            dep.elements.forEach(function (el) {
                var isDecorator = false;
                if (ts.isIdentifier(el)) {
                    isDecorator = maybeUpdateDecorator(el, reflector);
                }
                else if (ts.isNewExpression(el) && ts.isIdentifier(el.expression)) {
                    var token = el.arguments && el.arguments.length > 0 && el.arguments[0] || undefined;
                    isDecorator = maybeUpdateDecorator(el.expression, reflector, token);
                }
                if (!isDecorator) {
                    meta.token = new compiler_1.WrappedNodeExpr(el);
                }
            });
        }
        return meta;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFxWDtJQUNyWCwrQkFBaUM7SUFFakMsMkVBQWtFO0lBRWxFLDZEQUFtRDtJQUNuRCx5RUFBbUc7SUFDbkcsdUVBQWlIO0lBRWpILG1GQUE0RjtJQUM1RixxRkFBZ0Q7SUFDaEQsNkVBQW1QO0lBU25QOztPQUVHO0lBQ0g7UUFFRSxvQ0FDWSxTQUF5QixFQUFVLE1BQWUsRUFBVSxjQUF1QixFQUNuRixrQkFBMkMsRUFBVSxJQUFrQjtRQUMvRTs7Ozs7V0FLRztRQUNLLG9CQUEyQjtZQUEzQixxQ0FBQSxFQUFBLDJCQUEyQjtZQVIzQixjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUNuRix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXlCO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBYztZQU92RSx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQU87WUFFOUIsZUFBVSxHQUFHLDZCQUFpQixDQUFDLE1BQU0sQ0FBQztZQUN0QyxTQUFJLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDO1FBSE4sQ0FBQztRQUszQywyQ0FBTSxHQUFOLFVBQU8sSUFBc0IsRUFBRSxVQUE0QjtZQUN6RCxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxTQUFTLEdBQUcsMkJBQW9CLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUUsSUFBSSxTQUFTLEtBQUssU0FBUyxF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QUFDO1FBRUQsSUFBSSxFQUFFLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDcEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQSxFQUFFO2dCQUNyQixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7Z0JBQ3hCLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDdkIsV0FBVyxHQUFHLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztpQkFDbkQ7cUJBQU0sSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNuRSxJQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQztvQkFDdEYsV0FBVyxHQUFHLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO2lCQUNyRTtnQkFDRCxJQUFJLENBQUMsV0FBVyxFQUFFO29CQUNoQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksMEJBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDdEM7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZUNsYXNzTWV0YWRhdGEsIENvbXBpbGVDbGFzc01ldGFkYXRhRm4sIGNvbXBpbGVEZWNsYXJlQ2xhc3NNZXRhZGF0YSwgY29tcGlsZURlY2xhcmVJbmplY3RhYmxlRnJvbU1ldGFkYXRhLCBjb21waWxlSW5qZWN0YWJsZSwgY3JlYXRlTWF5QmVGb3J3YXJkUmVmRXhwcmVzc2lvbiwgRmFjdG9yeVRhcmdldCwgRm9yd2FyZFJlZkhhbmRsaW5nLCBMaXRlcmFsRXhwciwgTWF5YmVGb3J3YXJkUmVmRXhwcmVzc2lvbiwgUjNDbGFzc01ldGFkYXRhLCBSM0NvbXBpbGVkRXhwcmVzc2lvbiwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzSW5qZWN0YWJsZU1ldGFkYXRhLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7SW5qZWN0YWJsZUNsYXNzUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7UGVyZkV2ZW50LCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge2NvbXBpbGVEZWNsYXJlRmFjdG9yeSwgQ29tcGlsZUZhY3RvcnlGbiwgY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkfSBmcm9tICcuL2ZhY3RvcnknO1xuaW1wb3J0IHtleHRyYWN0Q2xhc3NNZXRhZGF0YX0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge2ZpbmRBbmd1bGFyRGVjb3JhdG9yLCBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNBbmd1bGFyQ29yZSwgdG9GYWN0b3J5TWV0YWRhdGEsIHRyeVVud3JhcEZvcndhcmRSZWYsIHVud3JhcENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCB2YWxpZGF0ZUNvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCB3cmFwVHlwZVJlZmVyZW5jZX0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBJbmplY3RhYmxlSGFuZGxlckRhdGEge1xuICBtZXRhOiBSM0luamVjdGFibGVNZXRhZGF0YTtcbiAgY2xhc3NNZXRhZGF0YTogUjNDbGFzc01ldGFkYXRhfG51bGw7XG4gIGN0b3JEZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfCdpbnZhbGlkJ3xudWxsO1xuICBuZWVkc0ZhY3Rvcnk6IGJvb2xlYW47XG59XG5cbi8qKlxuICogQWRhcHRzIHRoZSBgY29tcGlsZUluamVjdGFibGVgIGNvbXBpbGVyIGZvciBgQEluamVjdGFibGVgIGRlY29yYXRvcnMgdG8gdGhlIEl2eSBjb21waWxlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEluamVjdGFibGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERlY29yYXRvciwgSW5qZWN0YWJsZUhhbmRsZXJEYXRhLCBudWxsLCB1bmtub3duPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbiwgcHJpdmF0ZSBzdHJpY3RDdG9yRGVwczogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgaW5qZWN0YWJsZVJlZ2lzdHJ5OiBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgcHJpdmF0ZSBwZXJmOiBQZXJmUmVjb3JkZXIsXG4gICAgICAvKipcbiAgICAgICAqIFdoYXQgdG8gZG8gaWYgdGhlIGluamVjdGFibGUgYWxyZWFkeSBjb250YWlucyBhIMm1cHJvdiBwcm9wZXJ0eS5cbiAgICAgICAqXG4gICAgICAgKiBJZiB0cnVlIHRoZW4gYW4gZXJyb3IgZGlhZ25vc3RpYyBpcyByZXBvcnRlZC5cbiAgICAgICAqIElmIGZhbHNlIHRoZW4gdGhlcmUgaXMgbm8gZXJyb3IgYW5kIGEgbmV3IMm1cHJvdiBwcm9wZXJ0eSBpcyBub3QgYWRkZWQuXG4gICAgICAgKi9cbiAgICAgIHByaXZhdGUgZXJyb3JPbkR1cGxpY2F0ZVByb3YgPSB0cnVlKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5TSEFSRUQ7XG4gIHJlYWRvbmx5IG5hbWUgPSBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdJbmplY3RhYmxlJywgdGhpcy5pc0NvcmUpO1xuICAgIGlmIChkZWNvcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJpZ2dlcjogZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIGRlY29yYXRvcjogZGVjb3JhdG9yLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPik6XG4gICAgICBBbmFseXNpc091dHB1dDxJbmplY3RhYmxlSGFuZGxlckRhdGE+IHtcbiAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuQW5hbHl6ZUluamVjdGFibGUpO1xuXG4gICAgY29uc3QgbWV0YSA9IGV4dHJhY3RJbmplY3RhYmxlTWV0YWRhdGEobm9kZSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgY29uc3QgZGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG1ldGEsXG4gICAgICAgIGN0b3JEZXBzOiBleHRyYWN0SW5qZWN0YWJsZUN0b3JEZXBzKFxuICAgICAgICAgICAgbm9kZSwgbWV0YSwgZGVjb3JhdG9yLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUsIHRoaXMuc3RyaWN0Q3RvckRlcHMpLFxuICAgICAgICBjbGFzc01ldGFkYXRhOiBleHRyYWN0Q2xhc3NNZXRhZGF0YShub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUpLFxuICAgICAgICAvLyBBdm9pZCBnZW5lcmF0aW5nIG11bHRpcGxlIGZhY3RvcmllcyBpZiBhIGNsYXNzIGhhc1xuICAgICAgICAvLyBtb3JlIEFuZ3VsYXIgZGVjb3JhdG9ycywgYXBhcnQgZnJvbSBJbmplY3RhYmxlLlxuICAgICAgICBuZWVkc0ZhY3Rvcnk6ICFkZWNvcmF0b3JzIHx8XG4gICAgICAgICAgICBkZWNvcmF0b3JzLmV2ZXJ5KGN1cnJlbnQgPT4gIWlzQW5ndWxhckNvcmUoY3VycmVudCkgfHwgY3VycmVudC5uYW1lID09PSAnSW5qZWN0YWJsZScpXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBzeW1ib2woKTogbnVsbCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZWdpc3Rlcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkucmVnaXN0ZXJJbmplY3RhYmxlKG5vZGUpO1xuICB9XG5cbiAgY29tcGlsZUZ1bGwobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PEluamVjdGFibGVIYW5kbGVyRGF0YT4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGUoXG4gICAgICAgIGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZCwgbWV0YSA9PiBjb21waWxlSW5qZWN0YWJsZShtZXRhLCBmYWxzZSksIGNvbXBpbGVDbGFzc01ldGFkYXRhLFxuICAgICAgICBub2RlLCBhbmFseXNpcyk7XG4gIH1cblxuICBjb21waWxlUGFydGlhbChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8SW5qZWN0YWJsZUhhbmRsZXJEYXRhPik6XG4gICAgICBDb21waWxlUmVzdWx0W10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGUoXG4gICAgICAgIGNvbXBpbGVEZWNsYXJlRmFjdG9yeSwgY29tcGlsZURlY2xhcmVJbmplY3RhYmxlRnJvbU1ldGFkYXRhLCBjb21waWxlRGVjbGFyZUNsYXNzTWV0YWRhdGEsXG4gICAgICAgIG5vZGUsIGFuYWx5c2lzKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcGlsZShcbiAgICAgIGNvbXBpbGVGYWN0b3J5Rm46IENvbXBpbGVGYWN0b3J5Rm4sXG4gICAgICBjb21waWxlSW5qZWN0YWJsZUZuOiAobWV0YTogUjNJbmplY3RhYmxlTWV0YWRhdGEpID0+IFIzQ29tcGlsZWRFeHByZXNzaW9uLFxuICAgICAgY29tcGlsZUNsYXNzTWV0YWRhdGFGbjogQ29tcGlsZUNsYXNzTWV0YWRhdGFGbiwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIGFuYWx5c2lzOiBSZWFkb25seTxJbmplY3RhYmxlSGFuZGxlckRhdGE+KTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCByZXN1bHRzOiBDb21waWxlUmVzdWx0W10gPSBbXTtcblxuICAgIGlmIChhbmFseXNpcy5uZWVkc0ZhY3RvcnkpIHtcbiAgICAgIGNvbnN0IG1ldGEgPSBhbmFseXNpcy5tZXRhO1xuICAgICAgY29uc3QgZmFjdG9yeVJlcyA9IGNvbXBpbGVGYWN0b3J5Rm4oXG4gICAgICAgICAgdG9GYWN0b3J5TWV0YWRhdGEoey4uLm1ldGEsIGRlcHM6IGFuYWx5c2lzLmN0b3JEZXBzfSwgRmFjdG9yeVRhcmdldC5JbmplY3RhYmxlKSk7XG4gICAgICBpZiAoYW5hbHlzaXMuY2xhc3NNZXRhZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICBmYWN0b3J5UmVzLnN0YXRlbWVudHMucHVzaChjb21waWxlQ2xhc3NNZXRhZGF0YUZuKGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEpLnRvU3RtdCgpKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdHMucHVzaChmYWN0b3J5UmVzKTtcbiAgICB9XG5cbiAgICBjb25zdCDJtXByb3YgPSB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhub2RlKS5maW5kKG1lbWJlciA9PiBtZW1iZXIubmFtZSA9PT0gJ8m1cHJvdicpO1xuICAgIGlmICjJtXByb3YgIT09IHVuZGVmaW5lZCAmJiB0aGlzLmVycm9yT25EdXBsaWNhdGVQcm92KSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLklOSkVDVEFCTEVfRFVQTElDQVRFX1BST1YsIMm1cHJvdi5uYW1lTm9kZSB8fCDJtXByb3Yubm9kZSB8fCBub2RlLFxuICAgICAgICAgICdJbmplY3RhYmxlcyBjYW5ub3QgY29udGFpbiBhIHN0YXRpYyDJtXByb3YgcHJvcGVydHksIGJlY2F1c2UgdGhlIGNvbXBpbGVyIGlzIGdvaW5nIHRvIGdlbmVyYXRlIG9uZS4nKTtcbiAgICB9XG5cbiAgICBpZiAoybVwcm92ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIE9ubHkgYWRkIGEgbmV3IMm1cHJvdiBpZiB0aGVyZSBpcyBub3Qgb25lIGFscmVhZHlcbiAgICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVJbmplY3RhYmxlRm4oYW5hbHlzaXMubWV0YSk7XG4gICAgICByZXN1bHRzLnB1c2goXG4gICAgICAgICAge25hbWU6ICfJtXByb3YnLCBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sIHN0YXRlbWVudHM6IHJlcy5zdGF0ZW1lbnRzLCB0eXBlOiByZXMudHlwZX0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG59XG5cbi8qKlxuICogUmVhZCBtZXRhZGF0YSBmcm9tIHRoZSBgQEluamVjdGFibGVgIGRlY29yYXRvciBhbmQgcHJvZHVjZSB0aGUgYEl2eUluamVjdGFibGVNZXRhZGF0YWAsIHRoZVxuICogaW5wdXQgbWV0YWRhdGEgbmVlZGVkIHRvIHJ1biBgY29tcGlsZUluamVjdGFibGVgLlxuICpcbiAqIEEgYG51bGxgIHJldHVybiB2YWx1ZSBpbmRpY2F0ZXMgdGhpcyBpcyBASW5qZWN0YWJsZSBoYXMgaW52YWxpZCBkYXRhLlxuICovXG5mdW5jdGlvbiBleHRyYWN0SW5qZWN0YWJsZU1ldGFkYXRhKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcixcbiAgICByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogUjNJbmplY3RhYmxlTWV0YWRhdGEge1xuICBjb25zdCBuYW1lID0gY2xhenoubmFtZS50ZXh0O1xuICBjb25zdCB0eXBlID0gd3JhcFR5cGVSZWZlcmVuY2UocmVmbGVjdG9yLCBjbGF6eik7XG4gIGNvbnN0IGludGVybmFsVHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIocmVmbGVjdG9yLmdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xhenopKTtcbiAgY29uc3QgdHlwZUFyZ3VtZW50Q291bnQgPSByZWZsZWN0b3IuZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6eikgfHwgMDtcbiAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX05PVF9DQUxMRUQsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgJ0BJbmplY3RhYmxlIG11c3QgYmUgY2FsbGVkJyk7XG4gIH1cbiAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgdHlwZSxcbiAgICAgIHR5cGVBcmd1bWVudENvdW50LFxuICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgcHJvdmlkZWRJbjogY3JlYXRlTWF5QmVGb3J3YXJkUmVmRXhwcmVzc2lvbihuZXcgTGl0ZXJhbEV4cHIobnVsbCksIEZvcndhcmRSZWZIYW5kbGluZy5Ob25lKSxcbiAgICB9O1xuICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IG1ldGFOb2RlID0gZGVjb3JhdG9yLmFyZ3NbMF07XG4gICAgLy8gRmlyc3RseSBtYWtlIHN1cmUgdGhlIGRlY29yYXRvciBhcmd1bWVudCBpcyBhbiBpbmxpbmUgbGl0ZXJhbCAtIGlmIG5vdCwgaXQncyBpbGxlZ2FsIHRvXG4gICAgLy8gdHJhbnNwb3J0IHJlZmVyZW5jZXMgZnJvbSBvbmUgbG9jYXRpb24gdG8gYW5vdGhlci4gVGhpcyBpcyB0aGUgcHJvYmxlbSB0aGF0IGxvd2VyaW5nXG4gICAgLy8gdXNlZCB0byBzb2x2ZSAtIGlmIHRoaXMgcmVzdHJpY3Rpb24gcHJvdmVzIHRvbyB1bmRlc2lyYWJsZSB3ZSBjYW4gcmUtaW1wbGVtZW50IGxvd2VyaW5nLlxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhTm9kZSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YU5vZGUsXG4gICAgICAgICAgYEBJbmplY3RhYmxlIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWxgKTtcbiAgICB9XG5cbiAgICAvLyBSZXNvbHZlIHRoZSBmaWVsZHMgb2YgdGhlIGxpdGVyYWwgaW50byBhIG1hcCBvZiBmaWVsZCBuYW1lIHRvIGV4cHJlc3Npb24uXG4gICAgY29uc3QgbWV0YSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGFOb2RlKTtcblxuICAgIGNvbnN0IHByb3ZpZGVkSW4gPSBtZXRhLmhhcygncHJvdmlkZWRJbicpID9cbiAgICAgICAgZ2V0UHJvdmlkZXJFeHByZXNzaW9uKG1ldGEuZ2V0KCdwcm92aWRlZEluJykhLCByZWZsZWN0b3IpIDpcbiAgICAgICAgY3JlYXRlTWF5QmVGb3J3YXJkUmVmRXhwcmVzc2lvbihuZXcgTGl0ZXJhbEV4cHIobnVsbCksIEZvcndhcmRSZWZIYW5kbGluZy5Ob25lKTtcblxuICAgIGxldCBkZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoKG1ldGEuaGFzKCd1c2VDbGFzcycpIHx8IG1ldGEuaGFzKCd1c2VGYWN0b3J5JykpICYmIG1ldGEuaGFzKCdkZXBzJykpIHtcbiAgICAgIGNvbnN0IGRlcHNFeHByID0gbWV0YS5nZXQoJ2RlcHMnKSE7XG4gICAgICBpZiAoIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXBzRXhwcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX05PVF9MSVRFUkFMLCBkZXBzRXhwcixcbiAgICAgICAgICAgIGBASW5qZWN0YWJsZSBkZXBzIG1ldGFkYXRhIG11c3QgYmUgYW4gaW5saW5lIGFycmF5YCk7XG4gICAgICB9XG4gICAgICBkZXBzID0gZGVwc0V4cHIuZWxlbWVudHMubWFwKGRlcCA9PiBnZXREZXAoZGVwLCByZWZsZWN0b3IpKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQ6IFIzSW5qZWN0YWJsZU1ldGFkYXRhID0ge25hbWUsIHR5cGUsIHR5cGVBcmd1bWVudENvdW50LCBpbnRlcm5hbFR5cGUsIHByb3ZpZGVkSW59O1xuICAgIGlmIChtZXRhLmhhcygndXNlVmFsdWUnKSkge1xuICAgICAgcmVzdWx0LnVzZVZhbHVlID0gZ2V0UHJvdmlkZXJFeHByZXNzaW9uKG1ldGEuZ2V0KCd1c2VWYWx1ZScpISwgcmVmbGVjdG9yKTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuaGFzKCd1c2VFeGlzdGluZycpKSB7XG4gICAgICByZXN1bHQudXNlRXhpc3RpbmcgPSBnZXRQcm92aWRlckV4cHJlc3Npb24obWV0YS5nZXQoJ3VzZUV4aXN0aW5nJykhLCByZWZsZWN0b3IpO1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUNsYXNzJykpIHtcbiAgICAgIHJlc3VsdC51c2VDbGFzcyA9IGdldFByb3ZpZGVyRXhwcmVzc2lvbihtZXRhLmdldCgndXNlQ2xhc3MnKSEsIHJlZmxlY3Rvcik7XG4gICAgICByZXN1bHQuZGVwcyA9IGRlcHM7XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRmFjdG9yeScpKSB7XG4gICAgICByZXN1bHQudXNlRmFjdG9yeSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3VzZUZhY3RvcnknKSEpO1xuICAgICAgcmVzdWx0LmRlcHMgPSBkZXBzO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLmFyZ3NbMl0sICdUb28gbWFueSBhcmd1bWVudHMgdG8gQEluamVjdGFibGUnKTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCB0aGUgYFIzUHJvdmlkZXJFeHByZXNzaW9uYCBmb3IgdGhpcyBgZXhwcmVzc2lvbmAuXG4gKlxuICogVGhlIGB1c2VWYWx1ZWAsIGB1c2VFeGlzdGluZ2AgYW5kIGB1c2VDbGFzc2AgcHJvcGVydGllcyBtaWdodCBiZSB3cmFwcGVkIGluIGEgYEZvcndhcmRSZWZgLCB3aGljaFxuICogbmVlZHMgdG8gYmUgdW53cmFwcGVkLiBUaGlzIGZ1bmN0aW9uIHdpbGwgZG8gdGhhdCB1bndyYXBwaW5nIGFuZCBzZXQgYSBmbGFnIG9uIHRoZSByZXR1cm5lZFxuICogb2JqZWN0IHRvIGluZGljYXRlIHdoZXRoZXIgdGhlIHZhbHVlIG5lZWRlZCB1bndyYXBwaW5nLlxuICovXG5mdW5jdGlvbiBnZXRQcm92aWRlckV4cHJlc3Npb24oXG4gICAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IE1heWJlRm9yd2FyZFJlZkV4cHJlc3Npb24ge1xuICBjb25zdCBmb3J3YXJkUmVmVmFsdWUgPSB0cnlVbndyYXBGb3J3YXJkUmVmKGV4cHJlc3Npb24sIHJlZmxlY3Rvcik7XG4gIHJldHVybiBjcmVhdGVNYXlCZUZvcndhcmRSZWZFeHByZXNzaW9uKFxuICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihmb3J3YXJkUmVmVmFsdWUgPz8gZXhwcmVzc2lvbiksXG4gICAgICBmb3J3YXJkUmVmVmFsdWUgIT09IG51bGwgPyBGb3J3YXJkUmVmSGFuZGxpbmcuVW53cmFwcGVkIDogRm9yd2FyZFJlZkhhbmRsaW5nLk5vbmUpO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0SW5qZWN0YWJsZUN0b3JEZXBzKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBtZXRhOiBSM0luamVjdGFibGVNZXRhZGF0YSwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgaXNDb3JlOiBib29sZWFuLCBzdHJpY3RDdG9yRGVwczogYm9vbGVhbikge1xuICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfTk9UX0NBTExFRCwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAnQEluamVjdGFibGUgbXVzdCBiZSBjYWxsZWQnKTtcbiAgfVxuXG4gIGxldCBjdG9yRGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXwnaW52YWxpZCd8bnVsbCA9IG51bGw7XG5cbiAgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIElkZWFsbHksIHVzaW5nIEBJbmplY3RhYmxlKCkgd291bGQgaGF2ZSB0aGUgc2FtZSBlZmZlY3QgYXMgdXNpbmcgQEluamVjdGFibGUoey4uLn0pLCBhbmQgYmVcbiAgICAvLyBzdWJqZWN0IHRvIHRoZSBzYW1lIHZhbGlkYXRpb24uIEhvd2V2ZXIsIGV4aXN0aW5nIEFuZ3VsYXIgY29kZSBhYnVzZXMgQEluamVjdGFibGUsIGFwcGx5aW5nXG4gICAgLy8gaXQgdG8gdGhpbmdzIGxpa2UgYWJzdHJhY3QgY2xhc3NlcyB3aXRoIGNvbnN0cnVjdG9ycyB0aGF0IHdlcmUgbmV2ZXIgbWVhbnQgZm9yIHVzZSB3aXRoXG4gICAgLy8gQW5ndWxhcidzIERJLlxuICAgIC8vXG4gICAgLy8gVG8gZGVhbCB3aXRoIHRoaXMsIEBJbmplY3RhYmxlKCkgd2l0aG91dCBhbiBhcmd1bWVudCBpcyBtb3JlIGxlbmllbnQsIGFuZCBpZiB0aGVcbiAgICAvLyBjb25zdHJ1Y3RvciBzaWduYXR1cmUgZG9lcyBub3Qgd29yayBmb3IgREkgdGhlbiBhIGZhY3RvcnkgZGVmaW5pdGlvbiAoybVmYWMpIHRoYXQgdGhyb3dzIGlzXG4gICAgLy8gZ2VuZXJhdGVkLlxuICAgIGlmIChzdHJpY3RDdG9yRGVwcykge1xuICAgICAgY3RvckRlcHMgPSBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKGNsYXp6LCByZWZsZWN0b3IsIGlzQ29yZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3JEZXBzID1cbiAgICAgICAgICB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBpc0NvcmUpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3RvckRlcHM7XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgcmF3Q3RvckRlcHMgPSBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBpc0NvcmUpO1xuXG4gICAgaWYgKHN0cmljdEN0b3JEZXBzICYmIG1ldGEudXNlVmFsdWUgPT09IHVuZGVmaW5lZCAmJiBtZXRhLnVzZUV4aXN0aW5nID09PSB1bmRlZmluZWQgJiZcbiAgICAgICAgbWV0YS51c2VDbGFzcyA9PT0gdW5kZWZpbmVkICYmIG1ldGEudXNlRmFjdG9yeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBTaW5jZSB1c2UqIHdhcyBub3QgcHJvdmlkZWQsIHZhbGlkYXRlIHRoZSBkZXBzIGFjY29yZGluZyB0byBzdHJpY3RDdG9yRGVwcy5cbiAgICAgIGN0b3JEZXBzID0gdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmF3Q3RvckRlcHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdG9yRGVwcyA9IHVud3JhcENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKHJhd0N0b3JEZXBzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY3RvckRlcHM7XG59XG5cbmZ1bmN0aW9uIGdldERlcChkZXA6IHRzLkV4cHJlc3Npb24sIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiBSM0RlcGVuZGVuY3lNZXRhZGF0YSB7XG4gIGNvbnN0IG1ldGE6IFIzRGVwZW5kZW5jeU1ldGFkYXRhID0ge1xuICAgIHRva2VuOiBuZXcgV3JhcHBlZE5vZGVFeHByKGRlcCksXG4gICAgYXR0cmlidXRlTmFtZVR5cGU6IG51bGwsXG4gICAgaG9zdDogZmFsc2UsXG4gICAgb3B0aW9uYWw6IGZhbHNlLFxuICAgIHNlbGY6IGZhbHNlLFxuICAgIHNraXBTZWxmOiBmYWxzZSxcbiAgfTtcblxuICBmdW5jdGlvbiBtYXliZVVwZGF0ZURlY29yYXRvcihcbiAgICAgIGRlYzogdHMuSWRlbnRpZmllciwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgdG9rZW4/OiB0cy5FeHByZXNzaW9uKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgc291cmNlID0gcmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcihkZWMpO1xuICAgIGlmIChzb3VyY2UgPT09IG51bGwgfHwgc291cmNlLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBzd2l0Y2ggKHNvdXJjZS5uYW1lKSB7XG4gICAgICBjYXNlICdJbmplY3QnOlxuICAgICAgICBpZiAodG9rZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG1ldGEudG9rZW4gPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ09wdGlvbmFsJzpcbiAgICAgICAgbWV0YS5vcHRpb25hbCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2tpcFNlbGYnOlxuICAgICAgICBtZXRhLnNraXBTZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdTZWxmJzpcbiAgICAgICAgbWV0YS5zZWxmID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXApKSB7XG4gICAgZGVwLmVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgbGV0IGlzRGVjb3JhdG9yID0gZmFsc2U7XG4gICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGVsKSkge1xuICAgICAgICBpc0RlY29yYXRvciA9IG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLCByZWZsZWN0b3IpO1xuICAgICAgfSBlbHNlIGlmICh0cy5pc05ld0V4cHJlc3Npb24oZWwpICYmIHRzLmlzSWRlbnRpZmllcihlbC5leHByZXNzaW9uKSkge1xuICAgICAgICBjb25zdCB0b2tlbiA9IGVsLmFyZ3VtZW50cyAmJiBlbC5hcmd1bWVudHMubGVuZ3RoID4gMCAmJiBlbC5hcmd1bWVudHNbMF0gfHwgdW5kZWZpbmVkO1xuICAgICAgICBpc0RlY29yYXRvciA9IG1heWJlVXBkYXRlRGVjb3JhdG9yKGVsLmV4cHJlc3Npb24sIHJlZmxlY3RvciwgdG9rZW4pO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0RlY29yYXRvcikge1xuICAgICAgICBtZXRhLnRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcihlbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIG1ldGE7XG59XG4iXX0=