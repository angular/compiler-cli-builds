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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/pipe", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Represents an Angular pipe.
     */
    var PipeSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(PipeSymbol, _super);
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
        function PipeDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, defaultImportRecorder, injectableRegistry, isCore, perf) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaRegistry = metaRegistry;
            this.scopeRegistry = scopeRegistry;
            this.defaultImportRecorder = defaultImportRecorder;
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
            var decorator = util_1.findAngularDecorator(decorators, 'Pipe', this.isCore);
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
            var type = util_1.wrapTypeReference(this.reflector, clazz);
            var internalType = new compiler_1.WrappedNodeExpr(this.reflector.getInternalNameOfClass(clazz));
            if (decorator.args === null) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, reflection_1.Decorator.nodeForError(decorator), "@Pipe must be called");
            }
            if (decorator.args.length !== 1) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(decorator), '@Pipe must have exactly one argument');
            }
            var meta = util_1.unwrapExpression(decorator.args[0]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, '@Pipe must have a literal argument');
            }
            var pipe = reflection_1.reflectObjectLiteral(meta);
            if (!pipe.has('name')) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.PIPE_MISSING_NAME, meta, "@Pipe decorator is missing name field");
            }
            var pipeNameExpr = pipe.get('name');
            var pipeName = this.evaluator.evaluate(pipeNameExpr);
            if (typeof pipeName !== 'string') {
                throw diagnostics_2.createValueHasWrongTypeError(pipeNameExpr, pipeName, "@Pipe.name must be a string");
            }
            var pure = true;
            if (pipe.has('pure')) {
                var expr = pipe.get('pure');
                var pureValue = this.evaluator.evaluate(expr);
                if (typeof pureValue !== 'boolean') {
                    throw diagnostics_2.createValueHasWrongTypeError(expr, pureValue, "@Pipe.pure must be a boolean");
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
                        deps: util_1.getValidConstructorDependencies(clazz, this.reflector, this.defaultImportRecorder, this.isCore),
                        pure: pure,
                    },
                    metadataStmt: metadata_1.generateSetClassMetadataCall(clazz, this.reflector, this.defaultImportRecorder, this.isCore),
                },
            };
        };
        PipeDecoratorHandler.prototype.symbol = function (node, analysis) {
            return new PipeSymbol(node, analysis.meta.name);
        };
        PipeDecoratorHandler.prototype.register = function (node, analysis) {
            var ref = new imports_1.Reference(node);
            this.metaRegistry.registerPipeMetadata({ ref: ref, name: analysis.meta.pipeName });
            this.injectableRegistry.registerInjectable(node);
        };
        PipeDecoratorHandler.prototype.resolve = function (node) {
            var duplicateDeclData = this.scopeRegistry.getDuplicateDeclarations(node);
            if (duplicateDeclData !== null) {
                // This pipe was declared twice (or more).
                return {
                    diagnostics: [util_1.makeDuplicateDeclarationError(node, duplicateDeclData, 'Pipe')],
                };
            }
            return {};
        };
        PipeDecoratorHandler.prototype.compileFull = function (node, analysis) {
            var res = compiler_1.compilePipeFromMetadata(analysis.meta);
            return this.compilePipe(analysis, res);
        };
        PipeDecoratorHandler.prototype.compilePartial = function (node, analysis) {
            var res = compiler_1.compileDeclarePipeFromMetadata(analysis.meta);
            return this.compilePipe(analysis, res);
        };
        PipeDecoratorHandler.prototype.compilePipe = function (analysis, def) {
            var factoryRes = factory_1.compileNgFactoryDefField(tslib_1.__assign(tslib_1.__assign({}, analysis.meta), { injectFn: compiler_1.Identifiers.directiveInject, target: compiler_1.R3FactoryTarget.Pipe }));
            if (analysis.metadataStmt !== null) {
                factoryRes.statements.push(analysis.metadataStmt);
            }
            return [
                factoryRes, {
                    name: 'ɵpipe',
                    initializer: def.expression,
                    statements: [],
                    type: def.type,
                }
            ];
        };
        return PipeDecoratorHandler;
    }());
    exports.PipeDecoratorHandler = PipeDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3BpcGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUErSztJQUMvSywrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUErRDtJQUMvRCw2RkFBZ0U7SUFHaEUsNkRBQW1EO0lBQ25ELHlFQUFtRztJQUVuRyx1RUFBZ0k7SUFFaEksMkZBQTJEO0lBQzNELG1GQUFtRDtJQUNuRCxxRkFBd0Q7SUFDeEQsNkVBQWlKO0lBT2pKOztPQUVHO0lBQ0g7UUFBZ0Msc0NBQWM7UUFDNUMsb0JBQVksSUFBc0IsRUFBa0IsSUFBWTtZQUFoRSxZQUNFLGtCQUFNLElBQUksQ0FBQyxTQUNaO1lBRm1ELFVBQUksR0FBSixJQUFJLENBQVE7O1FBRWhFLENBQUM7UUFFRCx3Q0FBbUIsR0FBbkIsVUFBb0IsY0FBOEI7WUFDaEQsSUFBSSxDQUFDLENBQUMsY0FBYyxZQUFZLFVBQVUsQ0FBQyxFQUFFO2dCQUMzQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDM0MsQ0FBQztRQUVELDJDQUFzQixHQUF0QixVQUF1QixjQUE4QjtZQUNuRCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBQ0gsaUJBQUM7SUFBRCxDQUFDLEFBaEJELENBQWdDLCtCQUFjLEdBZ0I3QztJQWhCWSxnQ0FBVTtJQWtCdkI7UUFFRSw4QkFDWSxTQUF5QixFQUFVLFNBQTJCLEVBQzlELFlBQThCLEVBQVUsYUFBdUMsRUFDL0UscUJBQTRDLEVBQzVDLGtCQUEyQyxFQUFVLE1BQWUsRUFDcEUsSUFBa0I7WUFKbEIs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VyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRU8sMENBQVcsR0FBbkIsVUFBb0IsUUFBbUMsRUFBRSxHQUFjO1lBQ3JFLElBQU0sVUFBVSxHQUFHLGtDQUF3Qix1Q0FDdEMsUUFBUSxDQUFDLElBQUksS0FDaEIsUUFBUSxFQUFFLHNCQUFXLENBQUMsZUFBZSxFQUNyQyxNQUFNLEVBQUUsMEJBQWUsQ0FBQyxJQUFJLElBQzVCLENBQUM7WUFDSCxJQUFJLFFBQVEsQ0FBQyxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUNsQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDbkQ7WUFDRCxPQUFPO2dCQUNMLFVBQVUsRUFBRTtvQkFDVixJQUFJLEVBQUUsT0FBTztvQkFDYixXQUFXLEVBQUUsR0FBRyxDQUFDLFVBQVU7b0JBQzNCLFVBQVUsRUFBRSxFQUFFO29CQUNkLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtpQkFDZjthQUNGLENBQUM7UUFDSixDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBOUlELElBOElDO0lBOUlZLG9EQUFvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbXBpbGVEZWNsYXJlUGlwZUZyb21NZXRhZGF0YSwgY29tcGlsZVBpcGVGcm9tTWV0YWRhdGEsIElkZW50aWZpZXJzLCBSM0ZhY3RvcnlUYXJnZXQsIFIzUGlwZURlZiwgUjNQaXBlTWV0YWRhdGEsIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgUmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7U2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7SW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIE1ldGFkYXRhUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtQZXJmRXZlbnQsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlLCBSZXNvbHZlUmVzdWx0fSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge2NyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3J9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtmaW5kQW5ndWxhckRlY29yYXRvciwgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgbWFrZUR1cGxpY2F0ZURlY2xhcmF0aW9uRXJyb3IsIHVud3JhcEV4cHJlc3Npb24sIHdyYXBUeXBlUmVmZXJlbmNlfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBpcGVIYW5kbGVyRGF0YSB7XG4gIG1ldGE6IFIzUGlwZU1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBwaXBlLlxuICovXG5leHBvcnQgY2xhc3MgUGlwZVN5bWJvbCBleHRlbmRzIFNlbWFudGljU3ltYm9sIHtcbiAgY29uc3RydWN0b3IoZGVjbDogQ2xhc3NEZWNsYXJhdGlvbiwgcHVibGljIHJlYWRvbmx5IG5hbWU6IHN0cmluZykge1xuICAgIHN1cGVyKGRlY2wpO1xuICB9XG5cbiAgaXNQdWJsaWNBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIFBpcGVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5uYW1lICE9PSBwcmV2aW91c1N5bWJvbC5uYW1lO1xuICB9XG5cbiAgaXNUeXBlQ2hlY2tBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGlwZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8RGVjb3JhdG9yLCBQaXBlSGFuZGxlckRhdGEsIFBpcGVTeW1ib2wsIHVua25vd24+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBtZXRhUmVnaXN0cnk6IE1ldGFkYXRhUmVnaXN0cnksIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgaW5qZWN0YWJsZVJlZ2lzdHJ5OiBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHBlcmY6IFBlcmZSZWNvcmRlcikge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgcmVhZG9ubHkgbmFtZSA9IFBpcGVEZWNvcmF0b3JIYW5kbGVyLm5hbWU7XG5cbiAgZGV0ZWN0KG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ1BpcGUnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgZGVjb3JhdG9yOiBkZWNvcmF0b3IsXG4gICAgICAgIG1ldGFkYXRhOiBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPik6XG4gICAgICBBbmFseXNpc091dHB1dDxQaXBlSGFuZGxlckRhdGE+IHtcbiAgICB0aGlzLnBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuQW5hbHl6ZVBpcGUpO1xuXG4gICAgY29uc3QgbmFtZSA9IGNsYXp6Lm5hbWUudGV4dDtcbiAgICBjb25zdCB0eXBlID0gd3JhcFR5cGVSZWZlcmVuY2UodGhpcy5yZWZsZWN0b3IsIGNsYXp6KTtcbiAgICBjb25zdCBpbnRlcm5hbFR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRoaXMucmVmbGVjdG9yLmdldEludGVybmFsTmFtZU9mQ2xhc3MoY2xhenopKTtcblxuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfTk9UX0NBTExFRCwgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBAUGlwZSBtdXN0IGJlIGNhbGxlZGApO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgICdAUGlwZSBtdXN0IGhhdmUgZXhhY3RseSBvbmUgYXJndW1lbnQnKTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLCAnQFBpcGUgbXVzdCBoYXZlIGEgbGl0ZXJhbCBhcmd1bWVudCcpO1xuICAgIH1cbiAgICBjb25zdCBwaXBlID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG5cbiAgICBpZiAoIXBpcGUuaGFzKCduYW1lJykpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuUElQRV9NSVNTSU5HX05BTUUsIG1ldGEsIGBAUGlwZSBkZWNvcmF0b3IgaXMgbWlzc2luZyBuYW1lIGZpZWxkYCk7XG4gICAgfVxuICAgIGNvbnN0IHBpcGVOYW1lRXhwciA9IHBpcGUuZ2V0KCduYW1lJykhO1xuICAgIGNvbnN0IHBpcGVOYW1lID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocGlwZU5hbWVFeHByKTtcbiAgICBpZiAodHlwZW9mIHBpcGVOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihwaXBlTmFtZUV4cHIsIHBpcGVOYW1lLCBgQFBpcGUubmFtZSBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgfVxuXG4gICAgbGV0IHB1cmUgPSB0cnVlO1xuICAgIGlmIChwaXBlLmhhcygncHVyZScpKSB7XG4gICAgICBjb25zdCBleHByID0gcGlwZS5nZXQoJ3B1cmUnKSE7XG4gICAgICBjb25zdCBwdXJlVmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICh0eXBlb2YgcHVyZVZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihleHByLCBwdXJlVmFsdWUsIGBAUGlwZS5wdXJlIG11c3QgYmUgYSBib29sZWFuYCk7XG4gICAgICB9XG4gICAgICBwdXJlID0gcHVyZVZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIGludGVybmFsVHlwZSxcbiAgICAgICAgICB0eXBlQXJndW1lbnRDb3VudDogdGhpcy5yZWZsZWN0b3IuZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6eikgfHwgMCxcbiAgICAgICAgICBwaXBlTmFtZSxcbiAgICAgICAgICBkZXBzOiBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgICAgICAgICAgICBjbGF6eiwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICAgICAgcHVyZSxcbiAgICAgICAgfSxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgY2xhenosIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgc3ltYm9sKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxQaXBlSGFuZGxlckRhdGE+KTogUGlwZVN5bWJvbCB7XG4gICAgcmV0dXJuIG5ldyBQaXBlU3ltYm9sKG5vZGUsIGFuYWx5c2lzLm1ldGEubmFtZSk7XG4gIH1cblxuICByZWdpc3Rlcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8UGlwZUhhbmRsZXJEYXRhPik6IHZvaWQge1xuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2Uobm9kZSk7XG4gICAgdGhpcy5tZXRhUmVnaXN0cnkucmVnaXN0ZXJQaXBlTWV0YWRhdGEoe3JlZiwgbmFtZTogYW5hbHlzaXMubWV0YS5waXBlTmFtZX0pO1xuXG4gICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkucmVnaXN0ZXJJbmplY3RhYmxlKG5vZGUpO1xuICB9XG5cbiAgcmVzb2x2ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogUmVzb2x2ZVJlc3VsdDx1bmtub3duPiB7XG4gICAgY29uc3QgZHVwbGljYXRlRGVjbERhdGEgPSB0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0RHVwbGljYXRlRGVjbGFyYXRpb25zKG5vZGUpO1xuICAgIGlmIChkdXBsaWNhdGVEZWNsRGF0YSAhPT0gbnVsbCkge1xuICAgICAgLy8gVGhpcyBwaXBlIHdhcyBkZWNsYXJlZCB0d2ljZSAob3IgbW9yZSkuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBkaWFnbm9zdGljczogW21ha2VEdXBsaWNhdGVEZWNsYXJhdGlvbkVycm9yKG5vZGUsIGR1cGxpY2F0ZURlY2xEYXRhLCAnUGlwZScpXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgY29tcGlsZUZ1bGwobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PFBpcGVIYW5kbGVyRGF0YT4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVQaXBlRnJvbU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEpO1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVQaXBlKGFuYWx5c2lzLCByZXMpO1xuICB9XG5cbiAgY29tcGlsZVBhcnRpYWwobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PFBpcGVIYW5kbGVyRGF0YT4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVEZWNsYXJlUGlwZUZyb21NZXRhZGF0YShhbmFseXNpcy5tZXRhKTtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlUGlwZShhbmFseXNpcywgcmVzKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcGlsZVBpcGUoYW5hbHlzaXM6IFJlYWRvbmx5PFBpcGVIYW5kbGVyRGF0YT4sIGRlZjogUjNQaXBlRGVmKSB7XG4gICAgY29uc3QgZmFjdG9yeVJlcyA9IGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZCh7XG4gICAgICAuLi5hbmFseXNpcy5tZXRhLFxuICAgICAgaW5qZWN0Rm46IElkZW50aWZpZXJzLmRpcmVjdGl2ZUluamVjdCxcbiAgICAgIHRhcmdldDogUjNGYWN0b3J5VGFyZ2V0LlBpcGUsXG4gICAgfSk7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgZmFjdG9yeVJlcy5zdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgcmV0dXJuIFtcbiAgICAgIGZhY3RvcnlSZXMsIHtcbiAgICAgICAgbmFtZTogJ8m1cGlwZScsXG4gICAgICAgIGluaXRpYWxpemVyOiBkZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IGRlZi50eXBlLFxuICAgICAgfVxuICAgIF07XG4gIH1cbn1cbiJdfQ==