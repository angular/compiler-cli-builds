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
        define("@angular/compiler-cli/src/ngtsc/typecheck/extended/checks/nullish_coalescing_not_nullable", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/api", "@angular/compiler-cli/src/ngtsc/typecheck/extended/api"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NullishCoalescingNotNullableCheck = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/api");
    var api_2 = require("@angular/compiler-cli/src/ngtsc/typecheck/extended/api");
    /**
     * Ensures the left side of a nullish coalescing operation is nullable.
     * Returns diagnostics for the cases where the operator is useless.
     * This check should only be use if `strictNullChecks` is enabled,
     * otherwise it would produce inaccurate results.
     */
    var NullishCoalescingNotNullableCheck = /** @class */ (function (_super) {
        tslib_1.__extends(NullishCoalescingNotNullableCheck, _super);
        function NullishCoalescingNotNullableCheck() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.code = diagnostics_1.ErrorCode.NULLISH_COALESCING_NOT_NULLABLE;
            return _this;
        }
        NullishCoalescingNotNullableCheck.prototype.visitNode = function (ctx, component, node) {
            if (!(node instanceof compiler_1.Binary) || node.operation !== '??')
                return [];
            var symbolLeft = ctx.templateTypeChecker.getSymbolOfNode(node.left, component);
            if (symbolLeft.kind !== api_1.SymbolKind.Expression) {
                return [];
            }
            var typeLeft = symbolLeft.tsType;
            // If the left operand's type is different from its non-nullable self, then it must
            // contain a null or undefined so this nullish coalescing operator is useful. No diagnostic to
            // report.
            if (typeLeft.getNonNullableType() !== typeLeft)
                return [];
            var symbol = ctx.templateTypeChecker.getSymbolOfNode(node, component);
            if (symbol.kind !== api_1.SymbolKind.Expression) {
                return [];
            }
            var span = ctx.templateTypeChecker.getTemplateMappingAtShimLocation(symbol.shimLocation).span;
            var diagnostic = ctx.templateTypeChecker.makeTemplateDiagnostic(component, span, ts.DiagnosticCategory.Warning, diagnostics_1.ErrorCode.NULLISH_COALESCING_NOT_NULLABLE, "The left side of this nullish coalescing operation does not include 'null' or 'undefined' in its type, therefore the '??' operator can be safely removed.");
            return [diagnostic];
        };
        return NullishCoalescingNotNullableCheck;
    }(api_2.TemplateCheckWithVisitor));
    exports.NullishCoalescingNotNullableCheck = NullishCoalescingNotNullableCheck;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9leHRlbmRlZC9jaGVja3MvbnVsbGlzaF9jb2FsZXNjaW5nX25vdF9udWxsYWJsZS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJEO0lBQzNELCtCQUFpQztJQUVqQywyRUFBa0Q7SUFDbEQscUVBQThEO0lBQzlELDhFQUFvRTtJQUVwRTs7Ozs7T0FLRztJQUNIO1FBQ0ksNkRBQW1FO1FBRHZFO1lBQUEscUVBNkJDO1lBM0JVLFVBQUksR0FBRyx1QkFBUyxDQUFDLCtCQUF3QyxDQUFDOztRQTJCckUsQ0FBQztRQXpCVSxxREFBUyxHQUFsQixVQUFtQixHQUFvQixFQUFFLFNBQThCLEVBQUUsSUFBcUI7WUFFNUYsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLGlCQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUk7Z0JBQUUsT0FBTyxFQUFFLENBQUM7WUFFcEUsSUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBRSxDQUFDO1lBQ2xGLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxnQkFBVSxDQUFDLFVBQVUsRUFBRTtnQkFDN0MsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUNELElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFDbkMsbUZBQW1GO1lBQ25GLDhGQUE4RjtZQUM5RixVQUFVO1lBQ1YsSUFBSSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxRQUFRO2dCQUFFLE9BQU8sRUFBRSxDQUFDO1lBRTFELElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBRSxDQUFDO1lBQ3pFLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxnQkFBVSxDQUFDLFVBQVUsRUFBRTtnQkFDekMsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUNELElBQU0sSUFBSSxHQUNOLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFFLENBQUMsSUFBSSxDQUFDO1lBQ3hGLElBQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FDN0QsU0FBUyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLHVCQUFTLENBQUMsK0JBQStCLEVBQ3pGLDJKQUEySixDQUFDLENBQUM7WUFDakssT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3RCLENBQUM7UUFDSCx3Q0FBQztJQUFELENBQUMsQUE3QkQsQ0FDSSw4QkFBd0IsR0E0QjNCO0lBN0JZLDhFQUFpQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0FTVCwgQmluYXJ5LCBUbXBsQXN0Tm9kZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlfSBmcm9tICcuLi8uLi8uLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge05nVGVtcGxhdGVEaWFnbm9zdGljLCBTeW1ib2xLaW5kfSBmcm9tICcuLi8uLi8uLi9hcGknO1xuaW1wb3J0IHtUZW1wbGF0ZUNoZWNrV2l0aFZpc2l0b3IsIFRlbXBsYXRlQ29udGV4dH0gZnJvbSAnLi4vLi4vYXBpJztcblxuLyoqXG4gKiBFbnN1cmVzIHRoZSBsZWZ0IHNpZGUgb2YgYSBudWxsaXNoIGNvYWxlc2Npbmcgb3BlcmF0aW9uIGlzIG51bGxhYmxlLlxuICogUmV0dXJucyBkaWFnbm9zdGljcyBmb3IgdGhlIGNhc2VzIHdoZXJlIHRoZSBvcGVyYXRvciBpcyB1c2VsZXNzLlxuICogVGhpcyBjaGVjayBzaG91bGQgb25seSBiZSB1c2UgaWYgYHN0cmljdE51bGxDaGVja3NgIGlzIGVuYWJsZWQsXG4gKiBvdGhlcndpc2UgaXQgd291bGQgcHJvZHVjZSBpbmFjY3VyYXRlIHJlc3VsdHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBOdWxsaXNoQ29hbGVzY2luZ05vdE51bGxhYmxlQ2hlY2sgZXh0ZW5kc1xuICAgIFRlbXBsYXRlQ2hlY2tXaXRoVmlzaXRvcjxFcnJvckNvZGUuTlVMTElTSF9DT0FMRVNDSU5HX05PVF9OVUxMQUJMRT4ge1xuICBvdmVycmlkZSBjb2RlID0gRXJyb3JDb2RlLk5VTExJU0hfQ09BTEVTQ0lOR19OT1RfTlVMTEFCTEUgYXMgY29uc3Q7XG5cbiAgb3ZlcnJpZGUgdmlzaXROb2RlKGN0eDogVGVtcGxhdGVDb250ZXh0LCBjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24sIG5vZGU6IFRtcGxBc3ROb2RlfEFTVCk6XG4gICAgICBOZ1RlbXBsYXRlRGlhZ25vc3RpYzxFcnJvckNvZGUuTlVMTElTSF9DT0FMRVNDSU5HX05PVF9OVUxMQUJMRT5bXSB7XG4gICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIEJpbmFyeSkgfHwgbm9kZS5vcGVyYXRpb24gIT09ICc/PycpIHJldHVybiBbXTtcblxuICAgIGNvbnN0IHN5bWJvbExlZnQgPSBjdHgudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRTeW1ib2xPZk5vZGUobm9kZS5sZWZ0LCBjb21wb25lbnQpITtcbiAgICBpZiAoc3ltYm9sTGVmdC5raW5kICE9PSBTeW1ib2xLaW5kLkV4cHJlc3Npb24pIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgdHlwZUxlZnQgPSBzeW1ib2xMZWZ0LnRzVHlwZTtcbiAgICAvLyBJZiB0aGUgbGVmdCBvcGVyYW5kJ3MgdHlwZSBpcyBkaWZmZXJlbnQgZnJvbSBpdHMgbm9uLW51bGxhYmxlIHNlbGYsIHRoZW4gaXQgbXVzdFxuICAgIC8vIGNvbnRhaW4gYSBudWxsIG9yIHVuZGVmaW5lZCBzbyB0aGlzIG51bGxpc2ggY29hbGVzY2luZyBvcGVyYXRvciBpcyB1c2VmdWwuIE5vIGRpYWdub3N0aWMgdG9cbiAgICAvLyByZXBvcnQuXG4gICAgaWYgKHR5cGVMZWZ0LmdldE5vbk51bGxhYmxlVHlwZSgpICE9PSB0eXBlTGVmdCkgcmV0dXJuIFtdO1xuXG4gICAgY29uc3Qgc3ltYm9sID0gY3R4LnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0U3ltYm9sT2ZOb2RlKG5vZGUsIGNvbXBvbmVudCkhO1xuICAgIGlmIChzeW1ib2wua2luZCAhPT0gU3ltYm9sS2luZC5FeHByZXNzaW9uKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IHNwYW4gPVxuICAgICAgICBjdHgudGVtcGxhdGVUeXBlQ2hlY2tlci5nZXRUZW1wbGF0ZU1hcHBpbmdBdFNoaW1Mb2NhdGlvbihzeW1ib2wuc2hpbUxvY2F0aW9uKSEuc3BhbjtcbiAgICBjb25zdCBkaWFnbm9zdGljID0gY3R4LnRlbXBsYXRlVHlwZUNoZWNrZXIubWFrZVRlbXBsYXRlRGlhZ25vc3RpYyhcbiAgICAgICAgY29tcG9uZW50LCBzcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuV2FybmluZywgRXJyb3JDb2RlLk5VTExJU0hfQ09BTEVTQ0lOR19OT1RfTlVMTEFCTEUsXG4gICAgICAgIGBUaGUgbGVmdCBzaWRlIG9mIHRoaXMgbnVsbGlzaCBjb2FsZXNjaW5nIG9wZXJhdGlvbiBkb2VzIG5vdCBpbmNsdWRlICdudWxsJyBvciAndW5kZWZpbmVkJyBpbiBpdHMgdHlwZSwgdGhlcmVmb3JlIHRoZSAnPz8nIG9wZXJhdG9yIGNhbiBiZSBzYWZlbHkgcmVtb3ZlZC5gKTtcbiAgICByZXR1cm4gW2RpYWdub3N0aWNdO1xuICB9XG59XG4iXX0=