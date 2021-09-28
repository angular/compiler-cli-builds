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
            var decorator = (0, util_1.findAngularDecorator)(decorators, 'Injectable', this.isCore);
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
                    classMetadata: (0, metadata_1.extractClassMetadata)(node, this.reflector, this.isCore),
                    // Avoid generating multiple factories if a class has
                    // more Angular decorators, apart from Injectable.
                    needsFactory: !decorators ||
                        decorators.every(function (current) { return !(0, util_1.isAngularCore)(current) || current.name === 'Injectable'; })
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
            return this.compile(factory_1.compileNgFactoryDefField, function (meta) { return (0, compiler_1.compileInjectable)(meta, false); }, compiler_1.compileClassMetadata, node, analysis);
        };
        InjectableDecoratorHandler.prototype.compilePartial = function (node, analysis) {
            return this.compile(factory_1.compileDeclareFactory, compiler_1.compileDeclareInjectableFromMetadata, compiler_1.compileDeclareClassMetadata, node, analysis);
        };
        InjectableDecoratorHandler.prototype.compile = function (compileFactoryFn, compileInjectableFn, compileClassMetadataFn, node, analysis) {
            var results = [];
            if (analysis.needsFactory) {
                var meta = analysis.meta;
                var factoryRes = compileFactoryFn((0, util_1.toFactoryMetadata)((0, tslib_1.__assign)((0, tslib_1.__assign)({}, meta), { deps: analysis.ctorDeps }), compiler_1.FactoryTarget.Injectable));
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
        var type = (0, util_1.wrapTypeReference)(reflector, clazz);
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
                providedIn: (0, compiler_1.createR3ProviderExpression)(new compiler_1.LiteralExpr(null), false),
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
            var meta = (0, reflection_1.reflectObjectLiteral)(metaNode);
            var providedIn = meta.has('providedIn') ?
                getProviderExpression(meta.get('providedIn'), reflector) :
                (0, compiler_1.createR3ProviderExpression)(new compiler_1.LiteralExpr(null), false);
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
        var forwardRefValue = (0, util_1.tryUnwrapForwardRef)(expression, reflector);
        return (0, compiler_1.createR3ProviderExpression)(new compiler_1.WrappedNodeExpr(forwardRefValue !== null && forwardRefValue !== void 0 ? forwardRefValue : expression), forwardRefValue !== null);
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
                ctorDeps = (0, util_1.getValidConstructorDependencies)(clazz, reflector, isCore);
            }
            else {
                ctorDeps =
                    (0, util_1.unwrapConstructorDependencies)((0, util_1.getConstructorDependencies)(clazz, reflector, isCore));
            }
            return ctorDeps;
        }
        else if (decorator.args.length === 1) {
            var rawCtorDeps = (0, util_1.getConstructorDependencies)(clazz, reflector, isCore);
            if (strictCtorDeps && meta.useValue === undefined && meta.useExisting === undefined &&
                meta.useClass === undefined && meta.useFactory === undefined) {
                // Since use* was not provided, validate the deps according to strictCtorDeps.
                ctorDeps = (0, util_1.validateConstructorDependencies)(clazz, rawCtorDeps);
            }
            else {
                ctorDeps = (0, util_1.unwrapConstructorDependencies)(rawCtorDeps);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2luamVjdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUE4VztJQUM5VywrQkFBaUM7SUFFakMsMkVBQWtFO0lBRWxFLDZEQUFtRDtJQUNuRCx5RUFBbUc7SUFDbkcsdUVBQWlIO0lBRWpILG1GQUE0RjtJQUM1RixxRkFBZ0Q7SUFDaEQsNkVBQW1QO0lBU25QOztPQUVHO0lBQ0g7UUFFRSxvQ0FDWSxTQUF5QixFQUFVLE1BQWUsRUFBVSxjQUF1QixFQUNuRixrQkFBMkMsRUFBVSxJQUFrQjtRQUMvRTs7Ozs7V0FLRztRQUNLLG9CQUEyQjtZQUEzQixxQ0FBQSxFQUFBLDJCQUEyQjtZQVIzQixjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBUztZQUNuRix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXlCO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBYztZQU92RSx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQU87WUFFOUIsZUFBVSxHQUFHLDZCQUFpQixDQUFDLE1BQU0sQ0FBQztZQUN0QyxTQUFJLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDO1FBSE4sQ0FBQztRQUszQywyQ0FBTSxHQUFOLFVBQU8sSUFBc0IsRUFBRSxVQUE0QjtZQUN6RCxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxTQUFTLEdBQUcsSUFBQSwyQkFBb0IsRUFBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5RSxJQUFJLFNBQVMsS0FBSyxT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QUM7b0JBQ2pCLE1BQU07Z0JBQ1I7b0JBQ0UsT0FBTyxLQUFLLENBQUM7YUFDaEI7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNwQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEVBQUU7Z0JBQ3JCLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztnQkFDeEIsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUN2QixXQUFXLEdBQUcsb0JBQW9CLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2lCQUNuRDtxQkFBTSxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ25FLElBQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDO29CQUN0RixXQUFXLEdBQUcsb0JBQW9CLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7aUJBQ3JFO2dCQUNELElBQUksQ0FBQyxXQUFXLEVBQUU7b0JBQ2hCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSwwQkFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUN0QztZQUNILENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtjb21waWxlQ2xhc3NNZXRhZGF0YSwgQ29tcGlsZUNsYXNzTWV0YWRhdGFGbiwgY29tcGlsZURlY2xhcmVDbGFzc01ldGFkYXRhLCBjb21waWxlRGVjbGFyZUluamVjdGFibGVGcm9tTWV0YWRhdGEsIGNvbXBpbGVJbmplY3RhYmxlLCBjcmVhdGVSM1Byb3ZpZGVyRXhwcmVzc2lvbiwgRXhwcmVzc2lvbiwgRmFjdG9yeVRhcmdldCwgTGl0ZXJhbEV4cHIsIFIzQ2xhc3NNZXRhZGF0YSwgUjNDb21waWxlZEV4cHJlc3Npb24sIFIzRGVwZW5kZW5jeU1ldGFkYXRhLCBSM0luamVjdGFibGVNZXRhZGF0YSwgUjNQcm92aWRlckV4cHJlc3Npb24sIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0luamVjdGFibGVDbGFzc1JlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BlcmZFdmVudCwgUGVyZlJlY29yZGVyfSBmcm9tICcuLi8uLi9wZXJmJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZX0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtjb21waWxlRGVjbGFyZUZhY3RvcnksIENvbXBpbGVGYWN0b3J5Rm4sIGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZH0gZnJvbSAnLi9mYWN0b3J5JztcbmltcG9ydCB7ZXh0cmFjdENsYXNzTWV0YWRhdGF9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmaW5kQW5ndWxhckRlY29yYXRvciwgZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIGlzQW5ndWxhckNvcmUsIHRvRmFjdG9yeU1ldGFkYXRhLCB0cnlVbndyYXBGb3J3YXJkUmVmLCB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgdmFsaWRhdGVDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgd3JhcFR5cGVSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5qZWN0YWJsZUhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNJbmplY3RhYmxlTWV0YWRhdGE7XG4gIGNsYXNzTWV0YWRhdGE6IFIzQ2xhc3NNZXRhZGF0YXxudWxsO1xuICBjdG9yRGVwczogUjNEZXBlbmRlbmN5TWV0YWRhdGFbXXwnaW52YWxpZCd8bnVsbDtcbiAgbmVlZHNGYWN0b3J5OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEFkYXB0cyB0aGUgYGNvbXBpbGVJbmplY3RhYmxlYCBjb21waWxlciBmb3IgYEBJbmplY3RhYmxlYCBkZWNvcmF0b3JzIHRvIHRoZSBJdnkgY29tcGlsZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3IsIEluamVjdGFibGVIYW5kbGVyRGF0YSwgbnVsbCwgdW5rbm93bj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sIHByaXZhdGUgc3RyaWN0Q3RvckRlcHM6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIHByaXZhdGUgcGVyZjogUGVyZlJlY29yZGVyLFxuICAgICAgLyoqXG4gICAgICAgKiBXaGF0IHRvIGRvIGlmIHRoZSBpbmplY3RhYmxlIGFscmVhZHkgY29udGFpbnMgYSDJtXByb3YgcHJvcGVydHkuXG4gICAgICAgKlxuICAgICAgICogSWYgdHJ1ZSB0aGVuIGFuIGVycm9yIGRpYWdub3N0aWMgaXMgcmVwb3J0ZWQuXG4gICAgICAgKiBJZiBmYWxzZSB0aGVuIHRoZXJlIGlzIG5vIGVycm9yIGFuZCBhIG5ldyDJtXByb3YgcHJvcGVydHkgaXMgbm90IGFkZGVkLlxuICAgICAgICovXG4gICAgICBwcml2YXRlIGVycm9yT25EdXBsaWNhdGVQcm92ID0gdHJ1ZSkge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuU0hBUkVEO1xuICByZWFkb25seSBuYW1lID0gSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIubmFtZTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnSW5qZWN0YWJsZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBkZWNvcmF0b3I6IGRlY29yYXRvcixcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4pOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8SW5qZWN0YWJsZUhhbmRsZXJEYXRhPiB7XG4gICAgdGhpcy5wZXJmLmV2ZW50Q291bnQoUGVyZkV2ZW50LkFuYWx5emVJbmplY3RhYmxlKTtcblxuICAgIGNvbnN0IG1ldGEgPSBleHRyYWN0SW5qZWN0YWJsZU1ldGFkYXRhKG5vZGUsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IpO1xuICAgIGNvbnN0IGRlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBtZXRhLFxuICAgICAgICBjdG9yRGVwczogZXh0cmFjdEluamVjdGFibGVDdG9yRGVwcyhcbiAgICAgICAgICAgIG5vZGUsIG1ldGEsIGRlY29yYXRvciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlLCB0aGlzLnN0cmljdEN0b3JEZXBzKSxcbiAgICAgICAgY2xhc3NNZXRhZGF0YTogZXh0cmFjdENsYXNzTWV0YWRhdGEobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSxcbiAgICAgICAgLy8gQXZvaWQgZ2VuZXJhdGluZyBtdWx0aXBsZSBmYWN0b3JpZXMgaWYgYSBjbGFzcyBoYXNcbiAgICAgICAgLy8gbW9yZSBBbmd1bGFyIGRlY29yYXRvcnMsIGFwYXJ0IGZyb20gSW5qZWN0YWJsZS5cbiAgICAgICAgbmVlZHNGYWN0b3J5OiAhZGVjb3JhdG9ycyB8fFxuICAgICAgICAgICAgZGVjb3JhdG9ycy5ldmVyeShjdXJyZW50ID0+ICFpc0FuZ3VsYXJDb3JlKGN1cnJlbnQpIHx8IGN1cnJlbnQubmFtZSA9PT0gJ0luamVjdGFibGUnKVxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgc3ltYm9sKCk6IG51bGwge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmVnaXN0ZXIobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5LnJlZ2lzdGVySW5qZWN0YWJsZShub2RlKTtcbiAgfVxuXG4gIGNvbXBpbGVGdWxsKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxJbmplY3RhYmxlSGFuZGxlckRhdGE+KTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlKFxuICAgICAgICBjb21waWxlTmdGYWN0b3J5RGVmRmllbGQsIG1ldGEgPT4gY29tcGlsZUluamVjdGFibGUobWV0YSwgZmFsc2UpLCBjb21waWxlQ2xhc3NNZXRhZGF0YSxcbiAgICAgICAgbm9kZSwgYW5hbHlzaXMpO1xuICB9XG5cbiAgY29tcGlsZVBhcnRpYWwobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PEluamVjdGFibGVIYW5kbGVyRGF0YT4pOlxuICAgICAgQ29tcGlsZVJlc3VsdFtdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlKFxuICAgICAgICBjb21waWxlRGVjbGFyZUZhY3RvcnksIGNvbXBpbGVEZWNsYXJlSW5qZWN0YWJsZUZyb21NZXRhZGF0YSwgY29tcGlsZURlY2xhcmVDbGFzc01ldGFkYXRhLFxuICAgICAgICBub2RlLCBhbmFseXNpcyk7XG4gIH1cblxuICBwcml2YXRlIGNvbXBpbGUoXG4gICAgICBjb21waWxlRmFjdG9yeUZuOiBDb21waWxlRmFjdG9yeUZuLFxuICAgICAgY29tcGlsZUluamVjdGFibGVGbjogKG1ldGE6IFIzSW5qZWN0YWJsZU1ldGFkYXRhKSA9PiBSM0NvbXBpbGVkRXhwcmVzc2lvbixcbiAgICAgIGNvbXBpbGVDbGFzc01ldGFkYXRhRm46IENvbXBpbGVDbGFzc01ldGFkYXRhRm4sIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sXG4gICAgICBhbmFseXNpczogUmVhZG9ubHk8SW5qZWN0YWJsZUhhbmRsZXJEYXRhPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgcmVzdWx0czogQ29tcGlsZVJlc3VsdFtdID0gW107XG5cbiAgICBpZiAoYW5hbHlzaXMubmVlZHNGYWN0b3J5KSB7XG4gICAgICBjb25zdCBtZXRhID0gYW5hbHlzaXMubWV0YTtcbiAgICAgIGNvbnN0IGZhY3RvcnlSZXMgPSBjb21waWxlRmFjdG9yeUZuKFxuICAgICAgICAgIHRvRmFjdG9yeU1ldGFkYXRhKHsuLi5tZXRhLCBkZXBzOiBhbmFseXNpcy5jdG9yRGVwc30sIEZhY3RvcnlUYXJnZXQuSW5qZWN0YWJsZSkpO1xuICAgICAgaWYgKGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goY29tcGlsZUNsYXNzTWV0YWRhdGFGbihhbmFseXNpcy5jbGFzc01ldGFkYXRhKS50b1N0bXQoKSk7XG4gICAgICB9XG4gICAgICByZXN1bHRzLnB1c2goZmFjdG9yeVJlcyk7XG4gICAgfVxuXG4gICAgY29uc3QgybVwcm92ID0gdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3Mobm9kZSkuZmluZChtZW1iZXIgPT4gbWVtYmVyLm5hbWUgPT09ICfJtXByb3YnKTtcbiAgICBpZiAoybVwcm92ICE9PSB1bmRlZmluZWQgJiYgdGhpcy5lcnJvck9uRHVwbGljYXRlUHJvdikge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5JTkpFQ1RBQkxFX0RVUExJQ0FURV9QUk9WLCDJtXByb3YubmFtZU5vZGUgfHwgybVwcm92Lm5vZGUgfHwgbm9kZSxcbiAgICAgICAgICAnSW5qZWN0YWJsZXMgY2Fubm90IGNvbnRhaW4gYSBzdGF0aWMgybVwcm92IHByb3BlcnR5LCBiZWNhdXNlIHRoZSBjb21waWxlciBpcyBnb2luZyB0byBnZW5lcmF0ZSBvbmUuJyk7XG4gICAgfVxuXG4gICAgaWYgKMm1cHJvdiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBPbmx5IGFkZCBhIG5ldyDJtXByb3YgaWYgdGhlcmUgaXMgbm90IG9uZSBhbHJlYWR5XG4gICAgICBjb25zdCByZXMgPSBjb21waWxlSW5qZWN0YWJsZUZuKGFuYWx5c2lzLm1ldGEpO1xuICAgICAgcmVzdWx0cy5wdXNoKFxuICAgICAgICAgIHtuYW1lOiAnybVwcm92JywgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLCBzdGF0ZW1lbnRzOiByZXMuc3RhdGVtZW50cywgdHlwZTogcmVzLnR5cGV9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxufVxuXG4vKipcbiAqIFJlYWQgbWV0YWRhdGEgZnJvbSB0aGUgYEBJbmplY3RhYmxlYCBkZWNvcmF0b3IgYW5kIHByb2R1Y2UgdGhlIGBJdnlJbmplY3RhYmxlTWV0YWRhdGFgLCB0aGVcbiAqIGlucHV0IG1ldGFkYXRhIG5lZWRlZCB0byBydW4gYGNvbXBpbGVJbmplY3RhYmxlYC5cbiAqXG4gKiBBIGBudWxsYCByZXR1cm4gdmFsdWUgaW5kaWNhdGVzIHRoaXMgaXMgQEluamVjdGFibGUgaGFzIGludmFsaWQgZGF0YS5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEluamVjdGFibGVNZXRhZGF0YShcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IsXG4gICAgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IFIzSW5qZWN0YWJsZU1ldGFkYXRhIHtcbiAgY29uc3QgbmFtZSA9IGNsYXp6Lm5hbWUudGV4dDtcbiAgY29uc3QgdHlwZSA9IHdyYXBUeXBlUmVmZXJlbmNlKHJlZmxlY3RvciwgY2xhenopO1xuICBjb25zdCBpbnRlcm5hbFR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHJlZmxlY3Rvci5nZXRJbnRlcm5hbE5hbWVPZkNsYXNzKGNsYXp6KSk7XG4gIGNvbnN0IHR5cGVBcmd1bWVudENvdW50ID0gcmVmbGVjdG9yLmdldEdlbmVyaWNBcml0eU9mQ2xhc3MoY2xhenopIHx8IDA7XG4gIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9OT1RfQ0FMTEVELCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICdASW5qZWN0YWJsZSBtdXN0IGJlIGNhbGxlZCcpO1xuICB9XG4gIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZSxcbiAgICAgIHR5cGUsXG4gICAgICB0eXBlQXJndW1lbnRDb3VudCxcbiAgICAgIGludGVybmFsVHlwZSxcbiAgICAgIHByb3ZpZGVkSW46IGNyZWF0ZVIzUHJvdmlkZXJFeHByZXNzaW9uKG5ldyBMaXRlcmFsRXhwcihudWxsKSwgZmFsc2UpLFxuICAgIH07XG4gIH0gZWxzZSBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgbWV0YU5vZGUgPSBkZWNvcmF0b3IuYXJnc1swXTtcbiAgICAvLyBGaXJzdGx5IG1ha2Ugc3VyZSB0aGUgZGVjb3JhdG9yIGFyZ3VtZW50IGlzIGFuIGlubGluZSBsaXRlcmFsIC0gaWYgbm90LCBpdCdzIGlsbGVnYWwgdG9cbiAgICAvLyB0cmFuc3BvcnQgcmVmZXJlbmNlcyBmcm9tIG9uZSBsb2NhdGlvbiB0byBhbm90aGVyLiBUaGlzIGlzIHRoZSBwcm9ibGVtIHRoYXQgbG93ZXJpbmdcbiAgICAvLyB1c2VkIHRvIHNvbHZlIC0gaWYgdGhpcyByZXN0cmljdGlvbiBwcm92ZXMgdG9vIHVuZGVzaXJhYmxlIHdlIGNhbiByZS1pbXBsZW1lbnQgbG93ZXJpbmcuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGFOb2RlKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhTm9kZSxcbiAgICAgICAgICBgQEluamVjdGFibGUgYXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbGApO1xuICAgIH1cblxuICAgIC8vIFJlc29sdmUgdGhlIGZpZWxkcyBvZiB0aGUgbGl0ZXJhbCBpbnRvIGEgbWFwIG9mIGZpZWxkIG5hbWUgdG8gZXhwcmVzc2lvbi5cbiAgICBjb25zdCBtZXRhID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YU5vZGUpO1xuXG4gICAgY29uc3QgcHJvdmlkZWRJbiA9IG1ldGEuaGFzKCdwcm92aWRlZEluJykgP1xuICAgICAgICBnZXRQcm92aWRlckV4cHJlc3Npb24obWV0YS5nZXQoJ3Byb3ZpZGVkSW4nKSEsIHJlZmxlY3RvcikgOlxuICAgICAgICBjcmVhdGVSM1Byb3ZpZGVyRXhwcmVzc2lvbihuZXcgTGl0ZXJhbEV4cHIobnVsbCksIGZhbHNlKTtcblxuICAgIGxldCBkZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAoKG1ldGEuaGFzKCd1c2VDbGFzcycpIHx8IG1ldGEuaGFzKCd1c2VGYWN0b3J5JykpICYmIG1ldGEuaGFzKCdkZXBzJykpIHtcbiAgICAgIGNvbnN0IGRlcHNFeHByID0gbWV0YS5nZXQoJ2RlcHMnKSE7XG4gICAgICBpZiAoIXRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihkZXBzRXhwcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX05PVF9MSVRFUkFMLCBkZXBzRXhwcixcbiAgICAgICAgICAgIGBASW5qZWN0YWJsZSBkZXBzIG1ldGFkYXRhIG11c3QgYmUgYW4gaW5saW5lIGFycmF5YCk7XG4gICAgICB9XG4gICAgICBkZXBzID0gZGVwc0V4cHIuZWxlbWVudHMubWFwKGRlcCA9PiBnZXREZXAoZGVwLCByZWZsZWN0b3IpKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQ6IFIzSW5qZWN0YWJsZU1ldGFkYXRhID0ge25hbWUsIHR5cGUsIHR5cGVBcmd1bWVudENvdW50LCBpbnRlcm5hbFR5cGUsIHByb3ZpZGVkSW59O1xuICAgIGlmIChtZXRhLmhhcygndXNlVmFsdWUnKSkge1xuICAgICAgcmVzdWx0LnVzZVZhbHVlID0gZ2V0UHJvdmlkZXJFeHByZXNzaW9uKG1ldGEuZ2V0KCd1c2VWYWx1ZScpISwgcmVmbGVjdG9yKTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuaGFzKCd1c2VFeGlzdGluZycpKSB7XG4gICAgICByZXN1bHQudXNlRXhpc3RpbmcgPSBnZXRQcm92aWRlckV4cHJlc3Npb24obWV0YS5nZXQoJ3VzZUV4aXN0aW5nJykhLCByZWZsZWN0b3IpO1xuICAgIH0gZWxzZSBpZiAobWV0YS5oYXMoJ3VzZUNsYXNzJykpIHtcbiAgICAgIHJlc3VsdC51c2VDbGFzcyA9IGdldFByb3ZpZGVyRXhwcmVzc2lvbihtZXRhLmdldCgndXNlQ2xhc3MnKSEsIHJlZmxlY3Rvcik7XG4gICAgICByZXN1bHQuZGVwcyA9IGRlcHM7XG4gICAgfSBlbHNlIGlmIChtZXRhLmhhcygndXNlRmFjdG9yeScpKSB7XG4gICAgICByZXN1bHQudXNlRmFjdG9yeSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIobWV0YS5nZXQoJ3VzZUZhY3RvcnknKSEpO1xuICAgICAgcmVzdWx0LmRlcHMgPSBkZXBzO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLmFyZ3NbMl0sICdUb28gbWFueSBhcmd1bWVudHMgdG8gQEluamVjdGFibGUnKTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCB0aGUgYFIzUHJvdmlkZXJFeHByZXNzaW9uYCBmb3IgdGhpcyBgZXhwcmVzc2lvbmAuXG4gKlxuICogVGhlIGB1c2VWYWx1ZWAsIGB1c2VFeGlzdGluZ2AgYW5kIGB1c2VDbGFzc2AgcHJvcGVydGllcyBtaWdodCBiZSB3cmFwcGVkIGluIGEgYEZvcndhcmRSZWZgLCB3aGljaFxuICogbmVlZHMgdG8gYmUgdW53cmFwcGVkLiBUaGlzIGZ1bmN0aW9uIHdpbGwgZG8gdGhhdCB1bndyYXBwaW5nIGFuZCBzZXQgYSBmbGFnIG9uIHRoZSByZXR1cm5lZFxuICogb2JqZWN0IHRvIGluZGljYXRlIHdoZXRoZXIgdGhlIHZhbHVlIG5lZWRlZCB1bndyYXBwaW5nLlxuICovXG5mdW5jdGlvbiBnZXRQcm92aWRlckV4cHJlc3Npb24oXG4gICAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbiwgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCk6IFIzUHJvdmlkZXJFeHByZXNzaW9uIHtcbiAgY29uc3QgZm9yd2FyZFJlZlZhbHVlID0gdHJ5VW53cmFwRm9yd2FyZFJlZihleHByZXNzaW9uLCByZWZsZWN0b3IpO1xuICByZXR1cm4gY3JlYXRlUjNQcm92aWRlckV4cHJlc3Npb24oXG4gICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKGZvcndhcmRSZWZWYWx1ZSA/PyBleHByZXNzaW9uKSwgZm9yd2FyZFJlZlZhbHVlICE9PSBudWxsKTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdEluamVjdGFibGVDdG9yRGVwcyhcbiAgICBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YTogUjNJbmplY3RhYmxlTWV0YWRhdGEsIGRlY29yYXRvcjogRGVjb3JhdG9yLFxuICAgIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIGlzQ29yZTogYm9vbGVhbiwgc3RyaWN0Q3RvckRlcHM6IGJvb2xlYW4pIHtcbiAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX05PVF9DQUxMRUQsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgJ0BJbmplY3RhYmxlIG11c3QgYmUgY2FsbGVkJyk7XG4gIH1cblxuICBsZXQgY3RvckRlcHM6IFIzRGVwZW5kZW5jeU1ldGFkYXRhW118J2ludmFsaWQnfG51bGwgPSBudWxsO1xuXG4gIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAvLyBJZGVhbGx5LCB1c2luZyBASW5qZWN0YWJsZSgpIHdvdWxkIGhhdmUgdGhlIHNhbWUgZWZmZWN0IGFzIHVzaW5nIEBJbmplY3RhYmxlKHsuLi59KSwgYW5kIGJlXG4gICAgLy8gc3ViamVjdCB0byB0aGUgc2FtZSB2YWxpZGF0aW9uLiBIb3dldmVyLCBleGlzdGluZyBBbmd1bGFyIGNvZGUgYWJ1c2VzIEBJbmplY3RhYmxlLCBhcHBseWluZ1xuICAgIC8vIGl0IHRvIHRoaW5ncyBsaWtlIGFic3RyYWN0IGNsYXNzZXMgd2l0aCBjb25zdHJ1Y3RvcnMgdGhhdCB3ZXJlIG5ldmVyIG1lYW50IGZvciB1c2Ugd2l0aFxuICAgIC8vIEFuZ3VsYXIncyBESS5cbiAgICAvL1xuICAgIC8vIFRvIGRlYWwgd2l0aCB0aGlzLCBASW5qZWN0YWJsZSgpIHdpdGhvdXQgYW4gYXJndW1lbnQgaXMgbW9yZSBsZW5pZW50LCBhbmQgaWYgdGhlXG4gICAgLy8gY29uc3RydWN0b3Igc2lnbmF0dXJlIGRvZXMgbm90IHdvcmsgZm9yIERJIHRoZW4gYSBmYWN0b3J5IGRlZmluaXRpb24gKMm1ZmFjKSB0aGF0IHRocm93cyBpc1xuICAgIC8vIGdlbmVyYXRlZC5cbiAgICBpZiAoc3RyaWN0Q3RvckRlcHMpIHtcbiAgICAgIGN0b3JEZXBzID0gZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgcmVmbGVjdG9yLCBpc0NvcmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdG9yRGVwcyA9XG4gICAgICAgICAgdW53cmFwQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgaXNDb3JlKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGN0b3JEZXBzO1xuICB9IGVsc2UgaWYgKGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IHJhd0N0b3JEZXBzID0gZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJlZmxlY3RvciwgaXNDb3JlKTtcblxuICAgIGlmIChzdHJpY3RDdG9yRGVwcyAmJiBtZXRhLnVzZVZhbHVlID09PSB1bmRlZmluZWQgJiYgbWV0YS51c2VFeGlzdGluZyA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAgIG1ldGEudXNlQ2xhc3MgPT09IHVuZGVmaW5lZCAmJiBtZXRhLnVzZUZhY3RvcnkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gU2luY2UgdXNlKiB3YXMgbm90IHByb3ZpZGVkLCB2YWxpZGF0ZSB0aGUgZGVwcyBhY2NvcmRpbmcgdG8gc3RyaWN0Q3RvckRlcHMuXG4gICAgICBjdG9yRGVwcyA9IHZhbGlkYXRlQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHJhd0N0b3JEZXBzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3RvckRlcHMgPSB1bndyYXBDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhyYXdDdG9yRGVwcyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGN0b3JEZXBzO1xufVxuXG5mdW5jdGlvbiBnZXREZXAoZGVwOiB0cy5FeHByZXNzaW9uLCByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KTogUjNEZXBlbmRlbmN5TWV0YWRhdGEge1xuICBjb25zdCBtZXRhOiBSM0RlcGVuZGVuY3lNZXRhZGF0YSA9IHtcbiAgICB0b2tlbjogbmV3IFdyYXBwZWROb2RlRXhwcihkZXApLFxuICAgIGF0dHJpYnV0ZU5hbWVUeXBlOiBudWxsLFxuICAgIGhvc3Q6IGZhbHNlLFxuICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICBzZWxmOiBmYWxzZSxcbiAgICBza2lwU2VsZjogZmFsc2UsXG4gIH07XG5cbiAgZnVuY3Rpb24gbWF5YmVVcGRhdGVEZWNvcmF0b3IoXG4gICAgICBkZWM6IHRzLklkZW50aWZpZXIsIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHRva2VuPzogdHMuRXhwcmVzc2lvbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHNvdXJjZSA9IHJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIoZGVjKTtcbiAgICBpZiAoc291cmNlID09PSBudWxsIHx8IHNvdXJjZS5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgc3dpdGNoIChzb3VyY2UubmFtZSkge1xuICAgICAgY2FzZSAnSW5qZWN0JzpcbiAgICAgICAgaWYgKHRva2VuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBtZXRhLnRva2VuID0gbmV3IFdyYXBwZWROb2RlRXhwcih0b2tlbik7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdPcHRpb25hbCc6XG4gICAgICAgIG1ldGEub3B0aW9uYWwgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1NraXBTZWxmJzpcbiAgICAgICAgbWV0YS5za2lwU2VsZiA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnU2VsZic6XG4gICAgICAgIG1ldGEuc2VsZiA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmICh0cy5pc0FycmF5TGl0ZXJhbEV4cHJlc3Npb24oZGVwKSkge1xuICAgIGRlcC5lbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGxldCBpc0RlY29yYXRvciA9IGZhbHNlO1xuICAgICAgaWYgKHRzLmlzSWRlbnRpZmllcihlbCkpIHtcbiAgICAgICAgaXNEZWNvcmF0b3IgPSBtYXliZVVwZGF0ZURlY29yYXRvcihlbCwgcmVmbGVjdG9yKTtcbiAgICAgIH0gZWxzZSBpZiAodHMuaXNOZXdFeHByZXNzaW9uKGVsKSAmJiB0cy5pc0lkZW50aWZpZXIoZWwuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBlbC5hcmd1bWVudHMgJiYgZWwuYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgZWwuYXJndW1lbnRzWzBdIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgaXNEZWNvcmF0b3IgPSBtYXliZVVwZGF0ZURlY29yYXRvcihlbC5leHByZXNzaW9uLCByZWZsZWN0b3IsIHRva2VuKTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNEZWNvcmF0b3IpIHtcbiAgICAgICAgbWV0YS50b2tlbiA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBtZXRhO1xufVxuIl19