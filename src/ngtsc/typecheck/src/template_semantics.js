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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/template_semantics", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    /**
     * Visits a template and records any semantic errors within its expressions.
     */
    var ExpressionSemanticVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(ExpressionSemanticVisitor, _super);
        function ExpressionSemanticVisitor(templateId, boundTarget, oob, sourceSpan) {
            var _this = _super.call(this) || this;
            _this.templateId = templateId;
            _this.boundTarget = boundTarget;
            _this.oob = oob;
            _this.sourceSpan = sourceSpan;
            return _this;
        }
        ExpressionSemanticVisitor.prototype.visitPropertyWrite = function (ast, context) {
            _super.prototype.visitPropertyWrite.call(this, ast, context);
            if (!(ast.receiver instanceof compiler_1.ImplicitReceiver)) {
                return;
            }
            var target = this.boundTarget.getExpressionTarget(ast);
            if (target instanceof compiler_1.TmplAstVariable) {
                // Template variables are read-only.
                var astSpan = diagnostics_1.toAbsoluteSpan(ast.span, this.sourceSpan);
                this.oob.illegalAssignmentToTemplateVar(this.templateId, ast, astSpan, target);
            }
        };
        ExpressionSemanticVisitor.visit = function (ast, sourceSpan, id, boundTarget, oob) {
            ast.visit(new ExpressionSemanticVisitor(id, boundTarget, oob, sourceSpan));
        };
        return ExpressionSemanticVisitor;
    }(compiler_1.RecursiveAstVisitor));
    exports.ExpressionSemanticVisitor = ExpressionSemanticVisitor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc2VtYW50aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3RlbXBsYXRlX3NlbWFudGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBMkk7SUFFM0kseUZBQTZDO0lBRzdDOztPQUVHO0lBQ0g7UUFBK0MscURBQW1CO1FBQ2hFLG1DQUNZLFVBQWtCLEVBQVUsV0FBNkIsRUFDekQsR0FBZ0MsRUFBVSxVQUEyQjtZQUZqRixZQUdFLGlCQUFPLFNBQ1I7WUFIVyxnQkFBVSxHQUFWLFVBQVUsQ0FBUTtZQUFVLGlCQUFXLEdBQVgsV0FBVyxDQUFrQjtZQUN6RCxTQUFHLEdBQUgsR0FBRyxDQUE2QjtZQUFVLGdCQUFVLEdBQVYsVUFBVSxDQUFpQjs7UUFFakYsQ0FBQztRQUVELHNEQUFrQixHQUFsQixVQUFtQixHQUFrQixFQUFFLE9BQVk7WUFDakQsaUJBQU0sa0JBQWtCLFlBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRXZDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLFlBQVksMkJBQWdCLENBQUMsRUFBRTtnQkFDL0MsT0FBTzthQUNSO1lBRUQsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN6RCxJQUFJLE1BQU0sWUFBWSwwQkFBZSxFQUFFO2dCQUNyQyxvQ0FBb0M7Z0JBQ3BDLElBQU0sT0FBTyxHQUFHLDRCQUFjLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzFELElBQUksQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ2hGO1FBQ0gsQ0FBQztRQUVNLCtCQUFLLEdBQVosVUFDSSxHQUFRLEVBQUUsVUFBMkIsRUFBRSxFQUFVLEVBQUUsV0FBNkIsRUFDaEYsR0FBZ0M7WUFDbEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLHlCQUF5QixDQUFDLEVBQUUsRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUNILGdDQUFDO0lBQUQsQ0FBQyxBQTNCRCxDQUErQyw4QkFBbUIsR0EyQmpFO0lBM0JZLDhEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEJvdW5kVGFyZ2V0LCBJbXBsaWNpdFJlY2VpdmVyLCBQYXJzZVNvdXJjZVNwYW4sIFByb3BlcnR5V3JpdGUsIFJlY3Vyc2l2ZUFzdFZpc2l0b3IsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuXG5pbXBvcnQge3RvQWJzb2x1dGVTcGFufSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7T3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyfSBmcm9tICcuL29vYic7XG5cbi8qKlxuICogVmlzaXRzIGEgdGVtcGxhdGUgYW5kIHJlY29yZHMgYW55IHNlbWFudGljIGVycm9ycyB3aXRoaW4gaXRzIGV4cHJlc3Npb25zLlxuICovXG5leHBvcnQgY2xhc3MgRXhwcmVzc2lvblNlbWFudGljVmlzaXRvciBleHRlbmRzIFJlY3Vyc2l2ZUFzdFZpc2l0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdGVtcGxhdGVJZDogc3RyaW5nLCBwcml2YXRlIGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxhbnk+LFxuICAgICAgcHJpdmF0ZSBvb2I6IE91dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlciwgcHJpdmF0ZSBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4pIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgdmlzaXRQcm9wZXJ0eVdyaXRlKGFzdDogUHJvcGVydHlXcml0ZSwgY29udGV4dDogYW55KTogdm9pZCB7XG4gICAgc3VwZXIudmlzaXRQcm9wZXJ0eVdyaXRlKGFzdCwgY29udGV4dCk7XG5cbiAgICBpZiAoIShhc3QucmVjZWl2ZXIgaW5zdGFuY2VvZiBJbXBsaWNpdFJlY2VpdmVyKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuYm91bmRUYXJnZXQuZ2V0RXhwcmVzc2lvblRhcmdldChhc3QpO1xuICAgIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBUbXBsQXN0VmFyaWFibGUpIHtcbiAgICAgIC8vIFRlbXBsYXRlIHZhcmlhYmxlcyBhcmUgcmVhZC1vbmx5LlxuICAgICAgY29uc3QgYXN0U3BhbiA9IHRvQWJzb2x1dGVTcGFuKGFzdC5zcGFuLCB0aGlzLnNvdXJjZVNwYW4pO1xuICAgICAgdGhpcy5vb2IuaWxsZWdhbEFzc2lnbm1lbnRUb1RlbXBsYXRlVmFyKHRoaXMudGVtcGxhdGVJZCwgYXN0LCBhc3RTcGFuLCB0YXJnZXQpO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyB2aXNpdChcbiAgICAgIGFzdDogQVNULCBzb3VyY2VTcGFuOiBQYXJzZVNvdXJjZVNwYW4sIGlkOiBzdHJpbmcsIGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxhbnk+LFxuICAgICAgb29iOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpOiB2b2lkIHtcbiAgICBhc3QudmlzaXQobmV3IEV4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3IoaWQsIGJvdW5kVGFyZ2V0LCBvb2IsIHNvdXJjZVNwYW4pKTtcbiAgfVxufVxuIl19