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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/pipe", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PipeDecoratorHandler = exports.PipeSymbol = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var semantic_graph_1 = require("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Represents an Angular pipe.
     */
    var PipeSymbol = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(PipeSymbol, _super);
        function PipeSymbol(decl, name) {
            var _this = _super.call(this, decl) || this;
            _this.name = name;
            return _this;
        }
        PipeSymbol.prototype.isPublicApiAffected = function (previousSymbol) {
            if (!(previousSymbol instanceof PipeSymbol)) {
                return true;
            }
            return this.name !== previousSymbol.name;
        };
        PipeSymbol.prototype.isTypeCheckApiAffected = function (previousSymbol) {
            return this.isPublicApiAffected(previousSymbol);
        };
        return PipeSymbol;
    }(semantic_graph_1.SemanticSymbol));
    exports.PipeSymbol = PipeSymbol;
    var PipeDecoratorHandler = /** @class */ (function () {
        function PipeDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, injectableRegistry, isCore, perf) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaRegistry = metaRegistry;
            this.scopeRegistry = scopeRegistry;
            this.injectableRegistry = injectableRegistry;
            this.isCore = isCore;
            this.perf = perf;
            this.precedence = transform_1.HandlerPrecedence.PRIMARY;
            this.name = PipeDecoratorHandler.name;
        }
        PipeDecoratorHandler.prototype.detect = function (node, decorators) {
            if (!decorators) {
                return undefined;
            }
            var decorator = (0, util_1.findAngularDecorator)(decorators, 'Pipe', this.isCore);
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
        PipeDecoratorHandler.prototype.analyze = function (clazz, decorator) {
            this.perf.eventCount(perf_1.PerfEvent.AnalyzePipe);
            var name = clazz.name.text;
            var type = (0, util_1.wrapTypeReference)(this.reflector, clazz);
            var internalType = new compiler_1.WrappedNodeExpr(this.reflector.getInternalNameOfClass(clazz));
            if (decorator.args === null) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, reflection_1.Decorator.nodeForError(decorator), "@Pipe must be called");
            }
            if (decorator.args.length !== 1) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(decorator), '@Pipe must have exactly one argument');
            }
            var meta = (0, util_1.unwrapExpression)(decorator.args[0]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, '@Pipe must have a literal argument');
            }
            var pipe = (0, reflection_1.reflectObjectLiteral)(meta);
            if (!pipe.has('name')) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.PIPE_MISSING_NAME, meta, "@Pipe decorator is missing name field");
            }
            var pipeNameExpr = pipe.get('name');
            var pipeName = this.evaluator.evaluate(pipeNameExpr);
            if (typeof pipeName !== 'string') {
                throw (0, diagnostics_2.createValueHasWrongTypeError)(pipeNameExpr, pipeName, "@Pipe.name must be a string");
            }
            var pure = true;
            if (pipe.has('pure')) {
                var expr = pipe.get('pure');
                var pureValue = this.evaluator.evaluate(expr);
                if (typeof pureValue !== 'boolean') {
                    throw (0, diagnostics_2.createValueHasWrongTypeError)(expr, pureValue, "@Pipe.pure must be a boolean");
                }
                pure = pureValue;
            }
            return {
                analysis: {
                    meta: {
                        name: name,
                        type: type,
                        internalType: internalType,
                        typeArgumentCount: this.reflector.getGenericArityOfClass(clazz) || 0,
                        pipeName: pipeName,
                        deps: (0, util_1.getValidConstructorDependencies)(clazz, this.reflector, this.isCore),
                        pure: pure,
                    },
                    classMetadata: (0, metadata_2.extractClassMetadata)(clazz, this.reflector, this.isCore),
                    pipeNameExpr: pipeNameExpr,
                },
            };
        };
        PipeDecoratorHandler.prototype.symbol = function (node, analysis) {
            return new PipeSymbol(node, analysis.meta.name);
        };
        PipeDecoratorHandler.prototype.register = function (node, analysis) {
            var ref = new imports_1.Reference(node);
            this.metaRegistry.registerPipeMetadata({ type: metadata_1.MetaType.Pipe, ref: ref, name: analysis.meta.pipeName, nameExpr: analysis.pipeNameExpr });
            this.injectableRegistry.registerInjectable(node);
        };
        PipeDecoratorHandler.prototype.resolve = function (node) {
            var duplicateDeclData = this.scopeRegistry.getDuplicateDeclarations(node);
            if (duplicateDeclData !== null) {
                // This pipe was declared twice (or more).
                return {
                    diagnostics: [(0, util_1.makeDuplicateDeclarationError)(node, duplicateDeclData, 'Pipe')],
                };
            }
            return {};
        };
        PipeDecoratorHandler.prototype.compileFull = function (node, analysis) {
            var fac = (0, factory_1.compileNgFactoryDefField)((0, util_1.toFactoryMetadata)(analysis.meta, compiler_1.FactoryTarget.Pipe));
            var def = (0, compiler_1.compilePipeFromMetadata)(analysis.meta);
            var classMetadata = analysis.classMetadata !== null ?
                (0, compiler_1.compileClassMetadata)(analysis.classMetadata).toStmt() :
                null;
            return (0, util_1.compileResults)(fac, def, classMetadata, 'ɵpipe');
        };
        PipeDecoratorHandler.prototype.compilePartial = function (node, analysis) {
            var fac = (0, factory_1.compileDeclareFactory)((0, util_1.toFactoryMetadata)(analysis.meta, compiler_1.FactoryTarget.Pipe));
            var def = (0, compiler_1.compileDeclarePipeFromMetadata)(analysis.meta);
            var classMetadata = analysis.classMetadata !== null ?
                (0, compiler_1.compileDeclareClassMetadata)(analysis.classMetadata).toStmt() :
                null;
            return (0, util_1.compileResults)(fac, def, classMetadata, 'ɵpipe');
        };
        return PipeDecoratorHandler;
    }());
    exports.PipeDecoratorHandler = PipeDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3BpcGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF5TjtJQUN6TiwrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUF3QztJQUN4Qyw2RkFBZ0U7SUFDaEUscUVBQW1GO0lBRW5GLDZEQUFtRDtJQUNuRCx5RUFBbUc7SUFFbkcsdUVBQWdJO0lBRWhJLDJGQUEyRDtJQUMzRCxtRkFBMEU7SUFDMUUscUZBQWdEO0lBQ2hELDZFQUFvTDtJQVFwTDs7T0FFRztJQUNIO1FBQWdDLDJDQUFjO1FBQzVDLG9CQUFZLElBQXNCLEVBQWtCLElBQVk7WUFBaEUsWUFDRSxrQkFBTSxJQUFJLENBQUMsU0FDWjtZQUZtRCxVQUFJLEdBQUosSUFBSSxDQUFROztRQUVoRSxDQUFDO1FBRVEsd0NBQW1CLEdBQTVCLFVBQTZCLGNBQThCO1lBQ3pELElBQUksQ0FBQyxDQUFDLGNBQWMsWUFBWSxVQUFVLENBQUMsRUFBRTtnQkFDM0MsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxjQUFjLENBQUMsSUFBSSxDQUFDO1FBQzNDLENBQUM7UUFFUSwyQ0FBc0IsR0FBL0IsVUFBZ0MsY0FBOEI7WUFDNUQsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUNILGlCQUFDO0lBQUQsQ0FBQyxBQWhCRCxDQUFnQywrQkFBYyxHQWdCN0M7SUFoQlksZ0NBQVU7SUFrQnZCO1FBRUUsOEJBQ1ksU0FBeUIsRUFBVSxTQUEyQixFQUM5RCxZQUE4QixFQUFVLGFBQXVDLEVBQy9FLGtCQUEyQyxFQUFVLE1BQWUsRUFDcEUsSUFBa0I7WUFIbEIs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YUFBYSxLQUFLLElBQUksQ0FBQyxDQUFDO2dCQUNuRCxJQUFBLCtCQUFvQixFQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUM7WUFDVCxPQUFPLElBQUEscUJBQWMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQsNkNBQWMsR0FBZCxVQUFlLElBQXNCLEVBQUUsUUFBbUM7WUFDeEUsSUFBTSxHQUFHLEdBQUcsSUFBQSwrQkFBcUIsRUFBQyxJQUFBLHdCQUFpQixFQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3hGLElBQU0sR0FBRyxHQUFHLElBQUEseUNBQThCLEVBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFELElBQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLEtBQUssSUFBSSxDQUFDLENBQUM7Z0JBQ25ELElBQUEsc0NBQTJCLEVBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQzlELElBQUksQ0FBQztZQUNULE9BQU8sSUFBQSxxQkFBYyxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUFsSUQsSUFrSUM7SUFsSVksb0RBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZUNsYXNzTWV0YWRhdGEsIGNvbXBpbGVEZWNsYXJlQ2xhc3NNZXRhZGF0YSwgY29tcGlsZURlY2xhcmVQaXBlRnJvbU1ldGFkYXRhLCBjb21waWxlUGlwZUZyb21NZXRhZGF0YSwgRmFjdG9yeVRhcmdldCwgUjNDbGFzc01ldGFkYXRhLCBSM1BpcGVNZXRhZGF0YSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7U2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7SW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIE1ldGFkYXRhUmVnaXN0cnksIE1ldGFUeXBlfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7UGVyZkV2ZW50LCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Y29tcGlsZURlY2xhcmVGYWN0b3J5LCBjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2V4dHJhY3RDbGFzc01ldGFkYXRhfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7Y29tcGlsZVJlc3VsdHMsIGZpbmRBbmd1bGFyRGVjb3JhdG9yLCBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBtYWtlRHVwbGljYXRlRGVjbGFyYXRpb25FcnJvciwgdG9GYWN0b3J5TWV0YWRhdGEsIHVud3JhcEV4cHJlc3Npb24sIHdyYXBUeXBlUmVmZXJlbmNlfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBpcGVIYW5kbGVyRGF0YSB7XG4gIG1ldGE6IFIzUGlwZU1ldGFkYXRhO1xuICBjbGFzc01ldGFkYXRhOiBSM0NsYXNzTWV0YWRhdGF8bnVsbDtcbiAgcGlwZU5hbWVFeHByOiB0cy5FeHByZXNzaW9uO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBwaXBlLlxuICovXG5leHBvcnQgY2xhc3MgUGlwZVN5bWJvbCBleHRlbmRzIFNlbWFudGljU3ltYm9sIHtcbiAgY29uc3RydWN0b3IoZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgcHVibGljIHJlYWRvbmx5IG5hbWU6IHN0cmluZykge1xuICAgIHN1cGVyKGRlY2wpO1xuICB9XG5cbiAgb3ZlcnJpZGUgaXNQdWJsaWNBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIFBpcGVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5uYW1lICE9PSBwcmV2aW91c1N5bWJvbC5uYW1lO1xuICB9XG5cbiAgb3ZlcnJpZGUgaXNUeXBlQ2hlY2tBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGlwZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8RGVjb3JhdG9yLCBQaXBlSGFuZGxlckRhdGEsIFBpcGVTeW1ib2wsIHVua25vd24+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBtZXRhUmVnaXN0cnk6IE1ldGFkYXRhUmVnaXN0cnksIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBpbmplY3RhYmxlUmVnaXN0cnk6IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgcGVyZjogUGVyZlJlY29yZGVyKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuICByZWFkb25seSBuYW1lID0gUGlwZURlY29yYXRvckhhbmRsZXIubmFtZTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnUGlwZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBkZWNvcmF0b3I6IGRlY29yYXRvcixcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3I+KTpcbiAgICAgIEFuYWx5c2lzT3V0cHV0PFBpcGVIYW5kbGVyRGF0YT4ge1xuICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5BbmFseXplUGlwZSk7XG5cbiAgICBjb25zdCBuYW1lID0gY2xhenoubmFtZS50ZXh0O1xuICAgIGNvbnN0IHR5cGUgPSB3cmFwVHlwZVJlZmVyZW5jZSh0aGlzLnJlZmxlY3RvciwgY2xhenopO1xuICAgIGNvbnN0IGludGVybmFsVHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6eikpO1xuXG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9OT1RfQ0FMTEVELCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgYEBQaXBlIG11c3QgYmUgY2FsbGVkYCk7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgJ0BQaXBlIG11c3QgaGF2ZSBleGFjdGx5IG9uZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsICdAUGlwZSBtdXN0IGhhdmUgYSBsaXRlcmFsIGFyZ3VtZW50Jyk7XG4gICAgfVxuICAgIGNvbnN0IHBpcGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmICghcGlwZS5oYXMoJ25hbWUnKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5QSVBFX01JU1NJTkdfTkFNRSwgbWV0YSwgYEBQaXBlIGRlY29yYXRvciBpcyBtaXNzaW5nIG5hbWUgZmllbGRgKTtcbiAgICB9XG4gICAgY29uc3QgcGlwZU5hbWVFeHByID0gcGlwZS5nZXQoJ25hbWUnKSE7XG4gICAgY29uc3QgcGlwZU5hbWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShwaXBlTmFtZUV4cHIpO1xuICAgIGlmICh0eXBlb2YgcGlwZU5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKHBpcGVOYW1lRXhwciwgcGlwZU5hbWUsIGBAUGlwZS5uYW1lIG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICB9XG5cbiAgICBsZXQgcHVyZSA9IHRydWU7XG4gICAgaWYgKHBpcGUuaGFzKCdwdXJlJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBwaXBlLmdldCgncHVyZScpITtcbiAgICAgIGNvbnN0IHB1cmVWYWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiBwdXJlVmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHB1cmVWYWx1ZSwgYEBQaXBlLnB1cmUgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIHB1cmUgPSBwdXJlVmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG1ldGE6IHtcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgICAgIHR5cGVBcmd1bWVudENvdW50OiB0aGlzLnJlZmxlY3Rvci5nZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6KSB8fCAwLFxuICAgICAgICAgIHBpcGVOYW1lLFxuICAgICAgICAgIGRlcHM6IGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoY2xhenosIHRoaXMucmVmbGVjdG9yLCB0aGlzLmlzQ29yZSksXG4gICAgICAgICAgcHVyZSxcbiAgICAgICAgfSxcbiAgICAgICAgY2xhc3NNZXRhZGF0YTogZXh0cmFjdENsYXNzTWV0YWRhdGEoY2xhenosIHRoaXMucmVmbGVjdG9yLCB0aGlzLmlzQ29yZSksXG4gICAgICAgIHBpcGVOYW1lRXhwcixcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHN5bWJvbChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8UGlwZUhhbmRsZXJEYXRhPik6IFBpcGVTeW1ib2wge1xuICAgIHJldHVybiBuZXcgUGlwZVN5bWJvbChub2RlLCBhbmFseXNpcy5tZXRhLm5hbWUpO1xuICB9XG5cbiAgcmVnaXN0ZXIobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PFBpcGVIYW5kbGVyRGF0YT4pOiB2b2lkIHtcbiAgICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKG5vZGUpO1xuICAgIHRoaXMubWV0YVJlZ2lzdHJ5LnJlZ2lzdGVyUGlwZU1ldGFkYXRhKFxuICAgICAgICB7dHlwZTogTWV0YVR5cGUuUGlwZSwgcmVmLCBuYW1lOiBhbmFseXNpcy5tZXRhLnBpcGVOYW1lLCBuYW1lRXhwcjogYW5hbHlzaXMucGlwZU5hbWVFeHByfSk7XG5cbiAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBSZXNvbHZlUmVzdWx0PHVua25vd24+IHtcbiAgICBjb25zdCBkdXBsaWNhdGVEZWNsRGF0YSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXREdXBsaWNhdGVEZWNsYXJhdGlvbnMobm9kZSk7XG4gICAgaWYgKGR1cGxpY2F0ZURlY2xEYXRhICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGlzIHBpcGUgd2FzIGRlY2xhcmVkIHR3aWNlIChvciBtb3JlKS5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRpYWdub3N0aWNzOiBbbWFrZUR1cGxpY2F0ZURlY2xhcmF0aW9uRXJyb3Iobm9kZSwgZHVwbGljYXRlRGVjbERhdGEsICdQaXBlJyldLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge307XG4gIH1cblxuICBjb21waWxlRnVsbChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8UGlwZUhhbmRsZXJEYXRhPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgZmFjID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKHRvRmFjdG9yeU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEsIEZhY3RvcnlUYXJnZXQuUGlwZSkpO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVQaXBlRnJvbU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEpO1xuICAgIGNvbnN0IGNsYXNzTWV0YWRhdGEgPSBhbmFseXNpcy5jbGFzc01ldGFkYXRhICE9PSBudWxsID9cbiAgICAgICAgY29tcGlsZUNsYXNzTWV0YWRhdGEoYW5hbHlzaXMuY2xhc3NNZXRhZGF0YSkudG9TdG10KCkgOlxuICAgICAgICBudWxsO1xuICAgIHJldHVybiBjb21waWxlUmVzdWx0cyhmYWMsIGRlZiwgY2xhc3NNZXRhZGF0YSwgJ8m1cGlwZScpO1xuICB9XG5cbiAgY29tcGlsZVBhcnRpYWwobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PFBpcGVIYW5kbGVyRGF0YT4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGZhYyA9IGNvbXBpbGVEZWNsYXJlRmFjdG9yeSh0b0ZhY3RvcnlNZXRhZGF0YShhbmFseXNpcy5tZXRhLCBGYWN0b3J5VGFyZ2V0LlBpcGUpKTtcbiAgICBjb25zdCBkZWYgPSBjb21waWxlRGVjbGFyZVBpcGVGcm9tTWV0YWRhdGEoYW5hbHlzaXMubWV0YSk7XG4gICAgY29uc3QgY2xhc3NNZXRhZGF0YSA9IGFuYWx5c2lzLmNsYXNzTWV0YWRhdGEgIT09IG51bGwgP1xuICAgICAgICBjb21waWxlRGVjbGFyZUNsYXNzTWV0YWRhdGEoYW5hbHlzaXMuY2xhc3NNZXRhZGF0YSkudG9TdG10KCkgOlxuICAgICAgICBudWxsO1xuICAgIHJldHVybiBjb21waWxlUmVzdWx0cyhmYWMsIGRlZiwgY2xhc3NNZXRhZGF0YSwgJ8m1cGlwZScpO1xuICB9XG59XG4iXX0=