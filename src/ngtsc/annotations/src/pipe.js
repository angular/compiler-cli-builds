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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/pipe", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var PipeDecoratorHandler = /** @class */ (function () {
        function PipeDecoratorHandler(reflector, evaluator, metaRegistry, defaultImportRecorder, isCore) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaRegistry = metaRegistry;
            this.defaultImportRecorder = defaultImportRecorder;
            this.isCore = isCore;
            this.precedence = transform_1.HandlerPrecedence.PRIMARY;
        }
        PipeDecoratorHandler.prototype.detect = function (node, decorators) {
            if (!decorators) {
                return undefined;
            }
            var decorator = util_1.findAngularDecorator(decorators, 'Pipe', this.isCore);
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
        PipeDecoratorHandler.prototype.analyze = function (clazz, decorator) {
            var name = clazz.name.text;
            var type = new compiler_1.WrappedNodeExpr(clazz.name);
            if (decorator.args === null) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_NOT_CALLED, decorator.node, "@Pipe must be called");
            }
            if (decorator.args.length !== 1) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.node, '@Pipe must have exactly one argument');
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
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, pipeNameExpr, "@Pipe.name must be a string");
            }
            var ref = new imports_1.Reference(clazz);
            this.metaRegistry.registerPipeMetadata({ ref: ref, name: pipeName });
            var pure = true;
            if (pipe.has('pure')) {
                var expr = pipe.get('pure');
                var pureValue = this.evaluator.evaluate(expr);
                if (typeof pureValue !== 'boolean') {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "@Pipe.pure must be a boolean");
                }
                pure = pureValue;
            }
            return {
                analysis: {
                    meta: {
                        name: name,
                        type: type,
                        typeArgumentCount: this.reflector.getGenericArityOfClass(clazz) || 0, pipeName: pipeName,
                        deps: util_1.getValidConstructorDependencies(clazz, this.reflector, this.defaultImportRecorder, this.isCore),
                        pure: pure,
                    },
                    metadataStmt: metadata_1.generateSetClassMetadataCall(clazz, this.reflector, this.defaultImportRecorder, this.isCore),
                },
            };
        };
        PipeDecoratorHandler.prototype.compile = function (node, analysis) {
            var meta = analysis.meta;
            var res = compiler_1.compilePipeFromMetadata(meta);
            var factoryRes = factory_1.compileNgFactoryDefField(tslib_1.__assign(tslib_1.__assign({}, meta), { injectFn: compiler_1.Identifiers.directiveInject, isPipe: true }));
            if (analysis.metadataStmt !== null) {
                factoryRes.statements.push(analysis.metadataStmt);
            }
            return [
                factoryRes, {
                    name: 'ɵpipe',
                    initializer: res.expression,
                    statements: [],
                    type: res.type,
                }
            ];
        };
        return PipeDecoratorHandler;
    }());
    exports.PipeDecoratorHandler = PipeDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3BpcGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQW1IO0lBQ25ILCtCQUFpQztJQUVqQywyRUFBa0U7SUFDbEUsbUVBQStEO0lBRy9ELHlFQUFtRztJQUNuRyx1RUFBaUg7SUFFakgsbUZBQW1EO0lBQ25ELHFGQUF3RDtJQUN4RCw2RUFBK0Y7SUFPL0Y7UUFDRSw4QkFDWSxTQUF5QixFQUFVLFNBQTJCLEVBQzlELFlBQThCLEVBQVUscUJBQTRDLEVBQ3BGLE1BQWU7WUFGZixjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzlELGlCQUFZLEdBQVosWUFBWSxDQUFrQjtZQUFVLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7WUFDcEYsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUVsQixlQUFVLEdBQUcsNkJBQWlCLENBQUMsT0FBTyxDQUFDO1FBRmxCLENBQUM7UUFJL0IscUNBQU0sR0FBTixVQUFPLElBQXNCLEVBQUUsVUFBNEI7WUFDekQsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELElBQU0sU0FBUyxHQUFHLDJCQUFvQixDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hFLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtnQkFDM0IsT0FBTztvQkFDTCxPQUFPLEVBQUUsU0FBUyxDQUFDLElBQUk7b0JBQ3ZCLFFBQVEsRUFBRSxTQUFTO2lCQUNwQixDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsT0FBTyxTQUFTLENBQUM7YUFDbEI7UUFDSCxDQUFDO1FBRUQsc0NBQU8s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QUksQ0FBQyxNQUFNLENBQUM7d0JBQ25FLElBQUksTUFBQTtxQkFDTDtvQkFDRCxZQUFZLEVBQUUsdUNBQTRCLENBQ3RDLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO2lCQUNwRTthQUNGLENBQUM7UUFDSixDQUFDO1FBRUQsc0NBQU8sR0FBUCxVQUFRLElBQXNCLEVBQUUsUUFBeUI7WUFDdkQsSUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztZQUMzQixJQUFNLEdBQUcsR0FBRyxrQ0FBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQyxJQUFNLFVBQVUsR0FBRyxrQ0FBd0IsdUNBQ3RDLElBQUksS0FDUCxRQUFRLEVBQUUsc0JBQVcsQ0FBQyxlQUFlLEVBQ3JDLE1BQU0sRUFBRSxJQUFJLElBQ1osQ0FBQztZQUNILElBQUksUUFBUSxDQUFDLFlBQVksS0FBSyxJQUFJLEVBQUU7Z0JBQ2xDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUNuRDtZQUNELE9BQU87Z0JBQ0wsVUFBVSxFQUFFO29CQUNWLElBQUksRUFBRSxPQUFPO29CQUNiLFdBQVcsRUFBRSxHQUFHLENBQUMsVUFBVTtvQkFDM0IsVUFBVSxFQUFFLEVBQUU7b0JBQ2QsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2lCQUNmO2FBQ0YsQ0FBQztRQUNKLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUFyR0QsSUFxR0M7SUFyR1ksb0RBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0lkZW50aWZpZXJzLCBSM1BpcGVNZXRhZGF0YSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVQaXBlRnJvbU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgUmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7TWV0YWRhdGFSZWdpc3RyeX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Y29tcGlsZU5nRmFjdG9yeURlZkZpZWxkfSBmcm9tICcuL2ZhY3RvcnknO1xuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7ZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIHVud3JhcEV4cHJlc3Npb259IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGlwZUhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNQaXBlTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG59XG5cbmV4cG9ydCBjbGFzcyBQaXBlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzIERlY29yYXRvckhhbmRsZXI8UGlwZUhhbmRsZXJEYXRhLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBtZXRhUmVnaXN0cnk6IE1ldGFkYXRhUmVnaXN0cnksIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIGlzQ29yZTogYm9vbGVhbikge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnUGlwZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PFBpcGVIYW5kbGVyRGF0YT4ge1xuICAgIGNvbnN0IG5hbWUgPSBjbGF6ei5uYW1lLnRleHQ7XG4gICAgY29uc3QgdHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSk7XG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9OT1RfQ0FMTEVELCBkZWNvcmF0b3Iubm9kZSwgYEBQaXBlIG11c3QgYmUgY2FsbGVkYCk7XG4gICAgfVxuICAgIGlmIChkZWNvcmF0b3IuYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWNvcmF0b3Iubm9kZSwgJ0BQaXBlIG11c3QgaGF2ZSBleGFjdGx5IG9uZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSk7XG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsICdAUGlwZSBtdXN0IGhhdmUgYSBsaXRlcmFsIGFyZ3VtZW50Jyk7XG4gICAgfVxuICAgIGNvbnN0IHBpcGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmICghcGlwZS5oYXMoJ25hbWUnKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5QSVBFX01JU1NJTkdfTkFNRSwgbWV0YSwgYEBQaXBlIGRlY29yYXRvciBpcyBtaXNzaW5nIG5hbWUgZmllbGRgKTtcbiAgICB9XG4gICAgY29uc3QgcGlwZU5hbWVFeHByID0gcGlwZS5nZXQoJ25hbWUnKSAhO1xuICAgIGNvbnN0IHBpcGVOYW1lID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocGlwZU5hbWVFeHByKTtcbiAgICBpZiAodHlwZW9mIHBpcGVOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcGlwZU5hbWVFeHByLCBgQFBpcGUubmFtZSBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgfVxuICAgIGNvbnN0IHJlZiA9IG5ldyBSZWZlcmVuY2UoY2xhenopO1xuICAgIHRoaXMubWV0YVJlZ2lzdHJ5LnJlZ2lzdGVyUGlwZU1ldGFkYXRhKHtyZWYsIG5hbWU6IHBpcGVOYW1lfSk7XG5cbiAgICBsZXQgcHVyZSA9IHRydWU7XG4gICAgaWYgKHBpcGUuaGFzKCdwdXJlJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBwaXBlLmdldCgncHVyZScpICE7XG4gICAgICBjb25zdCBwdXJlVmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICh0eXBlb2YgcHVyZVZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCBgQFBpcGUucHVyZSBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgfVxuICAgICAgcHVyZSA9IHB1cmVWYWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgbWV0YToge1xuICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICB0eXBlQXJndW1lbnRDb3VudDogdGhpcy5yZWZsZWN0b3IuZ2V0R2VuZXJpY0FyaXR5T2ZDbGFzcyhjbGF6eikgfHwgMCwgcGlwZU5hbWUsXG4gICAgICAgICAgZGVwczogZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICAgICAgICAgICAgY2xhenosIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgICAgIHB1cmUsXG4gICAgICAgIH0sXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIGNsYXp6LCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFBpcGVIYW5kbGVyRGF0YSk6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgbWV0YSA9IGFuYWx5c2lzLm1ldGE7XG4gICAgY29uc3QgcmVzID0gY29tcGlsZVBpcGVGcm9tTWV0YWRhdGEobWV0YSk7XG4gICAgY29uc3QgZmFjdG9yeVJlcyA9IGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZCh7XG4gICAgICAuLi5tZXRhLFxuICAgICAgaW5qZWN0Rm46IElkZW50aWZpZXJzLmRpcmVjdGl2ZUluamVjdCxcbiAgICAgIGlzUGlwZTogdHJ1ZSxcbiAgICB9KTtcbiAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBmYWN0b3J5UmVzLnN0YXRlbWVudHMucHVzaChhbmFseXNpcy5tZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgICByZXR1cm4gW1xuICAgICAgZmFjdG9yeVJlcywge1xuICAgICAgICBuYW1lOiAnybVwaXBlJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgICAgdHlwZTogcmVzLnR5cGUsXG4gICAgICB9XG4gICAgXTtcbiAgfVxufVxuIl19