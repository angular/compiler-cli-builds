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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/pipe", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var PipeDecoratorHandler = /** @class */ (function () {
        function PipeDecoratorHandler(reflector, evaluator, scopeRegistry, isCore) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.scopeRegistry = scopeRegistry;
            this.isCore = isCore;
        }
        PipeDecoratorHandler.prototype.detect = function (node, decorators) {
            var _this = this;
            if (!decorators) {
                return undefined;
            }
            return decorators.find(function (decorator) { return decorator.name === 'Pipe' && (_this.isCore || util_1.isAngularCore(decorator)); });
        };
        PipeDecoratorHandler.prototype.analyze = function (clazz, decorator) {
            if (clazz.name === undefined) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ON_ANONYMOUS_CLASS, clazz, "@Pipes must have names");
            }
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
            this.scopeRegistry.registerPipe(clazz, pipeName);
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
                        pipeName: pipeName,
                        deps: util_1.getConstructorDependencies(clazz, this.reflector, this.isCore), pure: pure,
                    },
                    metadataStmt: metadata_1.generateSetClassMetadataCall(clazz, this.reflector, this.isCore),
                },
            };
        };
        PipeDecoratorHandler.prototype.compile = function (node, analysis) {
            var res = compiler_1.compilePipeFromMetadata(analysis.meta);
            var statements = res.statements;
            if (analysis.metadataStmt !== null) {
                statements.push(analysis.metadataStmt);
            }
            return {
                name: 'ngPipeDef',
                initializer: res.expression, statements: statements,
                type: res.type,
            };
        };
        return PipeDecoratorHandler;
    }());
    exports.PipeDecoratorHandler = PipeDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3BpcGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBbUg7SUFDbkgsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUVsRSx5RUFBaUY7SUFHakYscUZBQXdEO0lBRXhELDZFQUFtRjtJQU9uRjtRQUNFLDhCQUNZLFNBQXlCLEVBQVUsU0FBMkIsRUFDOUQsYUFBb0MsRUFBVSxNQUFlO1lBRDdELGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBa0I7WUFDOUQsa0JBQWEsR0FBYixhQUFhLENBQXVCO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUztRQUFHLENBQUM7UUFFN0UscUNBQU0sR0FBTixVQUFPLElBQW9CLEVBQUUsVUFBNEI7WUFBekQsaUJBTUM7WUFMQyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNsQixVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLENBQUMsS0FBSSxDQUFDLE1BQU0sSUFBSSxvQkFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQXRFLENBQXNFLENBQUMsQ0FBQztRQUMzRixDQUFDO1FBRUQsc0NBQU8sR0FBUCxVQUFRLEtBQTBCLEVBQUUsU0FBb0I7WUFDdEQsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtnQkFDNUIsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLDRCQUE0QixFQUFFLEtBQUssRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO2FBQzlFO1lBQ0QsSUFBTSxJQUFJLEdBQUcsS0FBSyxD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SUFBSSxDQUFDLENBQUM7WUFDbkQsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQztZQUNsQyxJQUFJLFFBQVEsQ0FBQyxZQUFZLEtBQUssSUFBSSxFQUFFO2dCQUNsQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUN4QztZQUNELE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLFdBQVcsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLFVBQVUsWUFBQTtnQkFDdkMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2FBQ2YsQ0FBQztRQUNKLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUFuRkQsSUFtRkM7SUFuRlksb0RBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xpdGVyYWxFeHByLCBSM1BpcGVNZXRhZGF0YSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVQaXBlRnJvbU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWx9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7U2VsZWN0b3JTY29wZVJlZ2lzdHJ5fSBmcm9tICcuL3NlbGVjdG9yX3Njb3BlJztcbmltcG9ydCB7Z2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIGlzQW5ndWxhckNvcmUsIHVud3JhcEV4cHJlc3Npb259IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGlwZUhhbmRsZXJEYXRhIHtcbiAgbWV0YTogUjNQaXBlTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG59XG5cbmV4cG9ydCBjbGFzcyBQaXBlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzIERlY29yYXRvckhhbmRsZXI8UGlwZUhhbmRsZXJEYXRhLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBTZWxlY3RvclNjb3BlUmVnaXN0cnksIHByaXZhdGUgaXNDb3JlOiBib29sZWFuKSB7fVxuXG4gIGRldGVjdChub2RlOiB0cy5EZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRvcnMuZmluZChcbiAgICAgICAgZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnUGlwZScgJiYgKHRoaXMuaXNDb3JlIHx8IGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkpO1xuICB9XG5cbiAgYW5hbHl6ZShjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxQaXBlSGFuZGxlckRhdGE+IHtcbiAgICBpZiAoY2xhenoubmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9PTl9BTk9OWU1PVVNfQ0xBU1MsIGNsYXp6LCBgQFBpcGVzIG11c3QgaGF2ZSBuYW1lc2ApO1xuICAgIH1cbiAgICBjb25zdCBuYW1lID0gY2xhenoubmFtZS50ZXh0O1xuICAgIGNvbnN0IHR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNsYXp6Lm5hbWUpO1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfTk9UX0NBTExFRCwgZGVjb3JhdG9yLm5vZGUsIGBAUGlwZSBtdXN0IGJlIGNhbGxlZGApO1xuICAgIH1cbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLm5vZGUsICdAUGlwZSBtdXN0IGhhdmUgZXhhY3RseSBvbmUgYXJndW1lbnQnKTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLCAnQFBpcGUgbXVzdCBoYXZlIGEgbGl0ZXJhbCBhcmd1bWVudCcpO1xuICAgIH1cbiAgICBjb25zdCBwaXBlID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG5cbiAgICBpZiAoIXBpcGUuaGFzKCduYW1lJykpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuUElQRV9NSVNTSU5HX05BTUUsIG1ldGEsIGBAUGlwZSBkZWNvcmF0b3IgaXMgbWlzc2luZyBuYW1lIGZpZWxkYCk7XG4gICAgfVxuICAgIGNvbnN0IHBpcGVOYW1lRXhwciA9IHBpcGUuZ2V0KCduYW1lJykgITtcbiAgICBjb25zdCBwaXBlTmFtZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHBpcGVOYW1lRXhwcik7XG4gICAgaWYgKHR5cGVvZiBwaXBlTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHBpcGVOYW1lRXhwciwgYEBQaXBlLm5hbWUgbXVzdCBiZSBhIHN0cmluZ2ApO1xuICAgIH1cbiAgICB0aGlzLnNjb3BlUmVnaXN0cnkucmVnaXN0ZXJQaXBlKGNsYXp6LCBwaXBlTmFtZSk7XG5cbiAgICBsZXQgcHVyZSA9IHRydWU7XG4gICAgaWYgKHBpcGUuaGFzKCdwdXJlJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBwaXBlLmdldCgncHVyZScpICE7XG4gICAgICBjb25zdCBwdXJlVmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGlmICh0eXBlb2YgcHVyZVZhbHVlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCBgQFBpcGUucHVyZSBtdXN0IGJlIGEgYm9vbGVhbmApO1xuICAgICAgfVxuICAgICAgcHVyZSA9IHB1cmVWYWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgbWV0YToge1xuICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICBwaXBlTmFtZSxcbiAgICAgICAgICBkZXBzOiBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSwgcHVyZSxcbiAgICAgICAgfSxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKGNsYXp6LCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUpLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUGlwZUhhbmRsZXJEYXRhKTogQ29tcGlsZVJlc3VsdCB7XG4gICAgY29uc3QgcmVzID0gY29tcGlsZVBpcGVGcm9tTWV0YWRhdGEoYW5hbHlzaXMubWV0YSk7XG4gICAgY29uc3Qgc3RhdGVtZW50cyA9IHJlcy5zdGF0ZW1lbnRzO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIHN0YXRlbWVudHMucHVzaChhbmFseXNpcy5tZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ25nUGlwZURlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sIHN0YXRlbWVudHMsXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9O1xuICB9XG59XG4iXX0=