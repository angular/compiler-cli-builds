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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/template_semantics", ["require", "exports", "tslib", "@angular/compiler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ExpressionSemanticVisitor = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    /**
     * Visits a template and records any semantic errors within its expressions.
     */
    var ExpressionSemanticVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(ExpressionSemanticVisitor, _super);
        function ExpressionSemanticVisitor(templateId, boundTarget, oob) {
            var _this = _super.call(this) || this;
            _this.templateId = templateId;
            _this.boundTarget = boundTarget;
            _this.oob = oob;
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
                this.oob.illegalAssignmentToTemplateVar(this.templateId, ast, target);
            }
        };
        ExpressionSemanticVisitor.visit = function (ast, id, boundTarget, oob) {
            ast.visit(new ExpressionSemanticVisitor(id, boundTarget, oob));
        };
        return ExpressionSemanticVisitor;
    }(compiler_1.RecursiveAstVisitor));
    exports.ExpressionSemanticVisitor = ExpressionSemanticVisitor;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVfc2VtYW50aWNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL3RlbXBsYXRlX3NlbWFudGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTBIO0lBSzFIOztPQUVHO0lBQ0g7UUFBK0MscURBQW1CO1FBQ2hFLG1DQUNZLFVBQXNCLEVBQVUsV0FBNkIsRUFDN0QsR0FBZ0M7WUFGNUMsWUFHRSxpQkFBTyxTQUNSO1lBSFcsZ0JBQVUsR0FBVixVQUFVLENBQVk7WUFBVSxpQkFBVyxHQUFYLFdBQVcsQ0FBa0I7WUFDN0QsU0FBRyxHQUFILEdBQUcsQ0FBNkI7O1FBRTVDLENBQUM7UUFFRCxzREFBa0IsR0FBbEIsVUFBbUIsR0FBa0IsRUFBRSxPQUFZO1lBQ2pELGlCQUFNLGtCQUFrQixZQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUV2QyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxZQUFZLDJCQUFnQixDQUFDLEVBQUU7Z0JBQy9DLE9BQU87YUFDUjtZQUVELElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekQsSUFBSSxNQUFNLFlBQVksMEJBQWUsRUFBRTtnQkFDckMsb0NBQW9DO2dCQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ3ZFO1FBQ0gsQ0FBQztRQUVNLCtCQUFLLEdBQVosVUFDSSxHQUFRLEVBQUUsRUFBYyxFQUFFLFdBQTZCLEVBQ3ZELEdBQWdDO1lBQ2xDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSx5QkFBeUIsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUNILGdDQUFDO0lBQUQsQ0FBQyxBQTFCRCxDQUErQyw4QkFBbUIsR0EwQmpFO0lBMUJZLDhEQUF5QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtBU1QsIEJvdW5kVGFyZ2V0LCBJbXBsaWNpdFJlY2VpdmVyLCBQcm9wZXJ0eVdyaXRlLCBSZWN1cnNpdmVBc3RWaXNpdG9yLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcblxuaW1wb3J0IHtUZW1wbGF0ZUlkfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge091dE9mQmFuZERpYWdub3N0aWNSZWNvcmRlcn0gZnJvbSAnLi9vb2InO1xuXG4vKipcbiAqIFZpc2l0cyBhIHRlbXBsYXRlIGFuZCByZWNvcmRzIGFueSBzZW1hbnRpYyBlcnJvcnMgd2l0aGluIGl0cyBleHByZXNzaW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIEV4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3IgZXh0ZW5kcyBSZWN1cnNpdmVBc3RWaXNpdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHRlbXBsYXRlSWQ6IFRlbXBsYXRlSWQsIHByaXZhdGUgYm91bmRUYXJnZXQ6IEJvdW5kVGFyZ2V0PGFueT4sXG4gICAgICBwcml2YXRlIG9vYjogT3V0T2ZCYW5kRGlhZ25vc3RpY1JlY29yZGVyKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHZpc2l0UHJvcGVydHlXcml0ZShhc3Q6IFByb3BlcnR5V3JpdGUsIGNvbnRleHQ6IGFueSk6IHZvaWQge1xuICAgIHN1cGVyLnZpc2l0UHJvcGVydHlXcml0ZShhc3QsIGNvbnRleHQpO1xuXG4gICAgaWYgKCEoYXN0LnJlY2VpdmVyIGluc3RhbmNlb2YgSW1wbGljaXRSZWNlaXZlcikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmJvdW5kVGFyZ2V0LmdldEV4cHJlc3Npb25UYXJnZXQoYXN0KTtcbiAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgVG1wbEFzdFZhcmlhYmxlKSB7XG4gICAgICAvLyBUZW1wbGF0ZSB2YXJpYWJsZXMgYXJlIHJlYWQtb25seS5cbiAgICAgIHRoaXMub29iLmlsbGVnYWxBc3NpZ25tZW50VG9UZW1wbGF0ZVZhcih0aGlzLnRlbXBsYXRlSWQsIGFzdCwgdGFyZ2V0KTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgdmlzaXQoXG4gICAgICBhc3Q6IEFTVCwgaWQ6IFRlbXBsYXRlSWQsIGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxhbnk+LFxuICAgICAgb29iOiBPdXRPZkJhbmREaWFnbm9zdGljUmVjb3JkZXIpOiB2b2lkIHtcbiAgICBhc3QudmlzaXQobmV3IEV4cHJlc3Npb25TZW1hbnRpY1Zpc2l0b3IoaWQsIGJvdW5kVGFyZ2V0LCBvb2IpKTtcbiAgfVxufVxuIl19