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
            var fac = factory_1.compileNgFactoryDefField(util_1.toFactoryMetadata(analysis.meta, compiler_1.FactoryTarget.Pipe));
            var def = compiler_1.compilePipeFromMetadata(analysis.meta);
            return util_1.compileResults(fac, def, analysis.metadataStmt, 'ɵpipe');
        };
        PipeDecoratorHandler.prototype.compilePartial = function (node, analysis) {
            var fac = factory_1.compileDeclareFactory(util_1.toFactoryMetadata(analysis.meta, compiler_1.FactoryTarget.Pipe));
            var def = compiler_1.compileDeclarePipeFromMetadata(analysis.meta);
            return util_1.compileResults(fac, def, analysis.metadataStmt, 'ɵpipe');
        };
        return PipeDecoratorHandler;
    }());
    exports.PipeDecoratorHandler = PipeDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3BpcGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFxSjtJQUNySiwrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUErRDtJQUMvRCw2RkFBZ0U7SUFHaEUsNkRBQW1EO0lBQ25ELHlFQUFtRztJQUVuRyx1RUFBZ0k7SUFFaEksMkZBQTJEO0lBQzNELG1GQUEwRTtJQUMxRSxxRkFBd0Q7SUFDeEQsNkVBQW9MO0lBT3BMOztPQUVHO0lBQ0g7UUFBZ0Msc0NBQWM7UUFDNUMsb0JBQVksSUFBc0IsRUFBa0IsSUFBWTtZQUFoRSxZQUNFLGtCQUFNLElBQUksQ0FBQyxTQUNaO1lBRm1ELFVBQUksR0FBSixJQUFJLENBQVE7O1FBRWhFLENBQUM7UUFFRCx3Q0FBbUIsR0FBbkIsVUFBb0IsY0FBOEI7WUFDaEQsSUFBSSxDQUFDLENBQUMsY0FBYyxZQUFZLFVBQVUsQ0FBQyxFQUFFO2dCQUMzQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDM0MsQ0FBQztRQUVELDJDQUFzQixHQUF0QixVQUF1QixjQUE4QjtZQUNuRCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBQ0gsaUJBQUM7SUFBRCxDQUFDLEFBaEJELENBQWdDLCtCQUFjLEdBZ0I3QztJQWhCWSxnQ0FBVTtJQWtCdkI7UUFFRSw4QkFDWSxTQUF5QixFQUFVLFNBQTJCLEVBQzlELFlBQThCLEVBQVUsYUFBdUMsRUFDL0UscUJBQTRDLEVBQzVDLGtCQUEyQyxFQUFVLE1BQWUsRUFDcEUsSUFBa0I7WUFKbEIs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RCw2Q0FBYyxHQUFkLFVBQWUsSUFBc0IsRUFBRSxRQUFtQztZQUN4RSxJQUFNLEdBQUcsR0FBRywrQkFBcUIsQ0FBQyx3QkFBaUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHdCQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN4RixJQUFNLEdBQUcsR0FBRyx5Q0FBOEIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUQsT0FBTyxxQkFBYyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBN0hELElBNkhDO0lBN0hZLG9EQUFvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbXBpbGVEZWNsYXJlUGlwZUZyb21NZXRhZGF0YSwgY29tcGlsZVBpcGVGcm9tTWV0YWRhdGEsIEZhY3RvcnlUYXJnZXQsIFIzUGlwZU1ldGFkYXRhLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIFJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge1NlbWFudGljU3ltYm9sfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbC9zZW1hbnRpY19ncmFwaCc7XG5pbXBvcnQge0luamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBNZXRhZGF0YVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7UGVyZkV2ZW50LCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCByZWZsZWN0T2JqZWN0TGl0ZXJhbH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Y29tcGlsZURlY2xhcmVGYWN0b3J5LCBjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtjb21waWxlUmVzdWx0cywgZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIG1ha2VEdXBsaWNhdGVEZWNsYXJhdGlvbkVycm9yLCB0b0ZhY3RvcnlNZXRhZGF0YSwgdW53cmFwRXhwcmVzc2lvbiwgd3JhcFR5cGVSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGlwZUhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNQaXBlTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBBbmd1bGFyIHBpcGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBQaXBlU3ltYm9sIGV4dGVuZHMgU2VtYW50aWNTeW1ib2wge1xuICBjb25zdHJ1Y3RvcihkZWNsOiBDbGFzc0RlY2xhcmF0aW9uLCBwdWJsaWMgcmVhZG9ubHkgbmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoZGVjbCk7XG4gIH1cblxuICBpc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgUGlwZVN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm5hbWUgIT09IHByZXZpb3VzU3ltYm9sLm5hbWU7XG4gIH1cblxuICBpc1R5cGVDaGVja0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzUHVibGljQXBpQWZmZWN0ZWQocHJldmlvdXNTeW1ib2wpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQaXBlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3IsIFBpcGVIYW5kbGVyRGF0YSwgUGlwZVN5bWJvbCwgdW5rbm93bj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBpbmplY3RhYmxlUmVnaXN0cnk6IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgcGVyZjogUGVyZlJlY29yZGVyKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuICByZWFkb25seSBuYW1lID0gUGlwZURlY29yYXRvckhhbmRsZXIubmFtZTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnUGlwZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBkZWNvcmF0b3I6IGRlY29yYXRvcixcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3I+KTpcbiAgICAgIEFuYWx5c2lzT3V0cHV0PFBpcGVIYW5kbGVyRGF0YT4ge1xuICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5BbmFseXplUGlwZSk7XG5cbiAgICBjb25zdCBuYW1lID0gY2xhenoubmFtZS50ZXh0O1xuICAgIGNvbnN0IHR5cGUgPSB3cmFwVHlwZVJlZmVyZW5jZSh0aGlzLnJlZmxlY3RvciwgY2xhenopO1xuICAgIGNvbnN0IGludGVybmFsVHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjbGF6eikpO1xuXG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9OT1RfQ0FMTEVELCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgYEBQaXBlIG11c3QgYmUgY2FsbGVkYCk7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgJ0BQaXBlIG11c3QgaGF2ZSBleGFjdGx5IG9uZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsICdAUGlwZSBtdXN0IGhhdmUgYSBsaXRlcmFsIGFyZ3VtZW50Jyk7XG4gICAgfVxuICAgIGNvbnN0IHBpcGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmICghcGlwZS5oYXMoJ25hbWUnKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5QSVBFX01JU1NJTkdfTkFNRSwgbWV0YSwgYEBQaXBlIGRlY29yYXRvciBpcyBtaXNzaW5nIG5hbWUgZmllbGRgKTtcbiAgICB9XG4gICAgY29uc3QgcGlwZU5hbWVFeHByID0gcGlwZS5nZXQoJ25hbWUnKSE7XG4gICAgY29uc3QgcGlwZU5hbWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShwaXBlTmFtZUV4cHIpO1xuICAgIGlmICh0eXBlb2YgcGlwZU5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKHBpcGVOYW1lRXhwciwgcGlwZU5hbWUsIGBAUGlwZS5uYW1lIG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICB9XG5cbiAgICBsZXQgcHVyZSA9IHRydWU7XG4gICAgaWYgKHBpcGUuaGFzKCdwdXJlJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBwaXBlLmdldCgncHVyZScpITtcbiAgICAgIGNvbnN0IHB1cmVWYWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIpO1xuICAgICAgaWYgKHR5cGVvZiBwdXJlVmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKGV4cHIsIHB1cmVWYWx1ZSwgYEBQaXBlLnB1cmUgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIHB1cmUgPSBwdXJlVmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG1ldGE6IHtcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgICAgIHR5cGVBcmd1bWVudENvdW50OiB0aGlzLnJlZmxlY3Rvci5nZXRHZW5lcmljQXJpdHlPZkNsYXNzKGNsYXp6KSB8fCAwLFxuICAgICAgICAgIHBpcGVOYW1lLFxuICAgICAgICAgIGRlcHM6IGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICAgICAgICAgIGNsYXp6LCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgICAgICBwdXJlLFxuICAgICAgICB9LFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBjbGF6eiwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBzeW1ib2wobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PFBpcGVIYW5kbGVyRGF0YT4pOiBQaXBlU3ltYm9sIHtcbiAgICByZXR1cm4gbmV3IFBpcGVTeW1ib2wobm9kZSwgYW5hbHlzaXMubWV0YS5uYW1lKTtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxQaXBlSGFuZGxlckRhdGE+KTogdm9pZCB7XG4gICAgY29uc3QgcmVmID0gbmV3IFJlZmVyZW5jZShub2RlKTtcbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3RlclBpcGVNZXRhZGF0YSh7cmVmLCBuYW1lOiBhbmFseXNpcy5tZXRhLnBpcGVOYW1lfSk7XG5cbiAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBSZXNvbHZlUmVzdWx0PHVua25vd24+IHtcbiAgICBjb25zdCBkdXBsaWNhdGVEZWNsRGF0YSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXREdXBsaWNhdGVEZWNsYXJhdGlvbnMobm9kZSk7XG4gICAgaWYgKGR1cGxpY2F0ZURlY2xEYXRhICE9PSBudWxsKSB7XG4gICAgICAvLyBUaGlzIHBpcGUgd2FzIGRlY2xhcmVkIHR3aWNlIChvciBtb3JlKS5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRpYWdub3N0aWNzOiBbbWFrZUR1cGxpY2F0ZURlY2xhcmF0aW9uRXJyb3Iobm9kZSwgZHVwbGljYXRlRGVjbERhdGEsICdQaXBlJyldLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge307XG4gIH1cblxuICBjb21waWxlRnVsbChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8UGlwZUhhbmRsZXJEYXRhPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgZmFjID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKHRvRmFjdG9yeU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEsIEZhY3RvcnlUYXJnZXQuUGlwZSkpO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVQaXBlRnJvbU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEpO1xuICAgIHJldHVybiBjb21waWxlUmVzdWx0cyhmYWMsIGRlZiwgYW5hbHlzaXMubWV0YWRhdGFTdG10LCAnybVwaXBlJyk7XG4gIH1cblxuICBjb21waWxlUGFydGlhbChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8UGlwZUhhbmRsZXJEYXRhPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgZmFjID0gY29tcGlsZURlY2xhcmVGYWN0b3J5KHRvRmFjdG9yeU1ldGFkYXRhKGFuYWx5c2lzLm1ldGEsIEZhY3RvcnlUYXJnZXQuUGlwZSkpO1xuICAgIGNvbnN0IGRlZiA9IGNvbXBpbGVEZWNsYXJlUGlwZUZyb21NZXRhZGF0YShhbmFseXNpcy5tZXRhKTtcbiAgICByZXR1cm4gY29tcGlsZVJlc3VsdHMoZmFjLCBkZWYsIGFuYWx5c2lzLm1ldGFkYXRhU3RtdCwgJ8m1cGlwZScpO1xuICB9XG59XG4iXX0=