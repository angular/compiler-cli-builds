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
        define("@angular/compiler-cli/src/ngtsc/typecheck/extended/src/template_checks/invalid_banana_in_box", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InvalidBananaInBoxCheck = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    /**
     * Ensures the two-way binding syntax is correct.
     * Parentheses should be inside the brackets "[()]".
     * Will return diagnostic information when "([])" is found.
     */
    var InvalidBananaInBoxCheck = /** @class */ (function () {
        function InvalidBananaInBoxCheck() {
            this.code = 8101;
        }
        InvalidBananaInBoxCheck.prototype.run = function (ctx, template) {
            var visitor = new BananaVisitor(ctx);
            return visitor.getDiagnostics(template);
        };
        return InvalidBananaInBoxCheck;
    }());
    exports.InvalidBananaInBoxCheck = InvalidBananaInBoxCheck;
    var BananaVisitor = /** @class */ (function (_super) {
        tslib_1.__extends(BananaVisitor, _super);
        function BananaVisitor(ctx) {
            var _this = _super.call(this) || this;
            _this.ctx = ctx;
            _this.diagnostics = [];
            return _this;
        }
        /**
         * Check for outputs with names surrounded in brackets "[]".
         * The syntax '([foo])="bar"' would be interpreted as an @Output()
         * with name '[foo]'. Just like '(foo)="bar"' would have the name 'foo'.
         * Generate diagnostic information for the cases found.
         */
        BananaVisitor.prototype.visitBoundEvent = function (boundEvent) {
            var name = boundEvent.name;
            if (name.startsWith('[') && name.endsWith(']')) {
                var boundSyntax = boundEvent.sourceSpan.toString();
                var expectedBoundSyntax = boundSyntax.replace("(" + name + ")", "[(" + name.slice(1, -1) + ")]");
                this.diagnostics.push(this.ctx.templateTypeChecker.makeTemplateDiagnostic(this.ctx.component, boundEvent.sourceSpan, ts.DiagnosticCategory.Warning, diagnostics_1.ErrorCode.INVALID_BANANA_IN_BOX, "In the two-way binding syntax the parentheses should be inside the brackets, ex. '" + expectedBoundSyntax + "'. \n                Find more at https://angular.io/guide/two-way-binding"));
            }
        };
        BananaVisitor.prototype.getDiagnostics = function (template) {
            var e_1, _a;
            this.diagnostics = [];
            try {
                for (var template_1 = tslib_1.__values(template), template_1_1 = template_1.next(); !template_1_1.done; template_1_1 = template_1.next()) {
                    var node = template_1_1.value;
                    node.visit(this);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (template_1_1 && !template_1_1.done && (_a = template_1.return)) _a.call(template_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return this.diagnostics;
        };
        return BananaVisitor;
    }(compiler_1.TmplAstRecursiveVisitor));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9leHRlbmRlZC9zcmMvdGVtcGxhdGVfY2hlY2tzL2ludmFsaWRfYmFuYW5hX2luX2JveC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTBGO0lBQzFGLCtCQUFpQztJQUVqQywyRUFBcUQ7SUFJckQ7Ozs7T0FJRztJQUNIO1FBQUE7WUFDRSxTQUFJLEdBQW9DLElBQUksQ0FBQztRQVEvQyxDQUFDO1FBTkMscUNBQUcsR0FBSCxVQUFJLEdBQW9CLEVBQ3BCLFFBQXVCO1lBQ3pCLElBQU0sT0FBTyxHQUFHLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXZDLE9BQU8sT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBVEQsSUFTQztJQVRZLDBEQUF1QjtJQVdwQztRQUE0Qix5Q0FBdUI7UUFHakQsdUJBQTRCLEdBQW9CO1lBQWhELFlBQ0UsaUJBQU8sU0FDUjtZQUYyQixTQUFHLEdBQUgsR0FBRyxDQUFpQjtZQUZ4QyxpQkFBVyxHQUE0RCxFQUFFLENBQUM7O1FBSWxGLENBQUM7UUFFRDs7Ozs7V0FLRztRQUNNLHVDQUFlLEdBQXhCLFVBQXlCLFVBQTZCO1lBQ3BELElBQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQzlDLElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3JELElBQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFJLElBQUksTUFBRyxFQUFFLE9BQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBSSxDQUFDLENBQUM7Z0JBQ3pGLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsc0JBQXNCLENBQ3JFLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFDeEUsdUJBQVMsQ0FBQyxxQkFBcUIsRUFDL0IsdUZBQ0ksbUJBQW1CLCtFQUNxQyxDQUFDLENBQUMsQ0FBQzthQUNwRTtRQUNILENBQUM7UUFFRCxzQ0FBYyxHQUFkLFVBQWUsUUFBdUI7O1lBQ3BDLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDOztnQkFDdEIsS0FBbUIsSUFBQSxhQUFBLGlCQUFBLFFBQVEsQ0FBQSxrQ0FBQSx3REFBRTtvQkFBeEIsSUFBTSxJQUFJLHFCQUFBO29CQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2xCOzs7Ozs7Ozs7WUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDMUIsQ0FBQztRQUNILG9CQUFDO0lBQUQsQ0FBQyxBQWxDRCxDQUE0QixrQ0FBdUIsR0FrQ2xEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7VG1wbEFzdEJvdW5kRXZlbnQsIFRtcGxBc3ROb2RlLCBUbXBsQXN0UmVjdXJzaXZlVmlzaXRvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlfSBmcm9tICcuLi8uLi8uLi8uLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge05nVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuLi8uLi8uLi8uLi9hcGknO1xuaW1wb3J0IHtUZW1wbGF0ZUNoZWNrLCBUZW1wbGF0ZUNvbnRleHR9IGZyb20gJy4uLy4uLy4uL2FwaSc7XG5cbi8qKlxuICogRW5zdXJlcyB0aGUgdHdvLXdheSBiaW5kaW5nIHN5bnRheCBpcyBjb3JyZWN0LlxuICogUGFyZW50aGVzZXMgc2hvdWxkIGJlIGluc2lkZSB0aGUgYnJhY2tldHMgXCJbKCldXCIuXG4gKiBXaWxsIHJldHVybiBkaWFnbm9zdGljIGluZm9ybWF0aW9uIHdoZW4gXCIoW10pXCIgaXMgZm91bmQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnZhbGlkQmFuYW5hSW5Cb3hDaGVjayBpbXBsZW1lbnRzIFRlbXBsYXRlQ2hlY2s8RXJyb3JDb2RlLklOVkFMSURfQkFOQU5BX0lOX0JPWD4ge1xuICBjb2RlOiBFcnJvckNvZGUuSU5WQUxJRF9CQU5BTkFfSU5fQk9YID0gODEwMTtcblxuICBydW4oY3R4OiBUZW1wbGF0ZUNvbnRleHQsXG4gICAgICB0ZW1wbGF0ZTogVG1wbEFzdE5vZGVbXSk6IE5nVGVtcGxhdGVEaWFnbm9zdGljPEVycm9yQ29kZS5JTlZBTElEX0JBTkFOQV9JTl9CT1g+W10ge1xuICAgIGNvbnN0IHZpc2l0b3IgPSBuZXcgQmFuYW5hVmlzaXRvcihjdHgpO1xuXG4gICAgcmV0dXJuIHZpc2l0b3IuZ2V0RGlhZ25vc3RpY3ModGVtcGxhdGUpO1xuICB9XG59XG5cbmNsYXNzIEJhbmFuYVZpc2l0b3IgZXh0ZW5kcyBUbXBsQXN0UmVjdXJzaXZlVmlzaXRvciB7XG4gIHByaXZhdGUgZGlhZ25vc3RpY3M6IE5nVGVtcGxhdGVEaWFnbm9zdGljPEVycm9yQ29kZS5JTlZBTElEX0JBTkFOQV9JTl9CT1g+W10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgY3R4OiBUZW1wbGF0ZUNvbnRleHQpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGZvciBvdXRwdXRzIHdpdGggbmFtZXMgc3Vycm91bmRlZCBpbiBicmFja2V0cyBcIltdXCIuXG4gICAqIFRoZSBzeW50YXggJyhbZm9vXSk9XCJiYXJcIicgd291bGQgYmUgaW50ZXJwcmV0ZWQgYXMgYW4gQE91dHB1dCgpXG4gICAqIHdpdGggbmFtZSAnW2Zvb10nLiBKdXN0IGxpa2UgJyhmb28pPVwiYmFyXCInIHdvdWxkIGhhdmUgdGhlIG5hbWUgJ2ZvbycuXG4gICAqIEdlbmVyYXRlIGRpYWdub3N0aWMgaW5mb3JtYXRpb24gZm9yIHRoZSBjYXNlcyBmb3VuZC5cbiAgICovXG4gIG92ZXJyaWRlIHZpc2l0Qm91bmRFdmVudChib3VuZEV2ZW50OiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgIGNvbnN0IG5hbWUgPSBib3VuZEV2ZW50Lm5hbWU7XG4gICAgaWYgKG5hbWUuc3RhcnRzV2l0aCgnWycpICYmIG5hbWUuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgY29uc3QgYm91bmRTeW50YXggPSBib3VuZEV2ZW50LnNvdXJjZVNwYW4udG9TdHJpbmcoKTtcbiAgICAgIGNvbnN0IGV4cGVjdGVkQm91bmRTeW50YXggPSBib3VuZFN5bnRheC5yZXBsYWNlKGAoJHtuYW1lfSlgLCBgWygke25hbWUuc2xpY2UoMSwgLTEpfSldYCk7XG4gICAgICB0aGlzLmRpYWdub3N0aWNzLnB1c2godGhpcy5jdHgudGVtcGxhdGVUeXBlQ2hlY2tlci5tYWtlVGVtcGxhdGVEaWFnbm9zdGljKFxuICAgICAgICAgIHRoaXMuY3R4LmNvbXBvbmVudCwgYm91bmRFdmVudC5zb3VyY2VTcGFuLCB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuV2FybmluZyxcbiAgICAgICAgICBFcnJvckNvZGUuSU5WQUxJRF9CQU5BTkFfSU5fQk9YLFxuICAgICAgICAgIGBJbiB0aGUgdHdvLXdheSBiaW5kaW5nIHN5bnRheCB0aGUgcGFyZW50aGVzZXMgc2hvdWxkIGJlIGluc2lkZSB0aGUgYnJhY2tldHMsIGV4LiAnJHtcbiAgICAgICAgICAgICAgZXhwZWN0ZWRCb3VuZFN5bnRheH0nLiBcbiAgICAgICAgICAgICAgICBGaW5kIG1vcmUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2d1aWRlL3R3by13YXktYmluZGluZ2ApKTtcbiAgICB9XG4gIH1cblxuICBnZXREaWFnbm9zdGljcyh0ZW1wbGF0ZTogVG1wbEFzdE5vZGVbXSk6IE5nVGVtcGxhdGVEaWFnbm9zdGljPEVycm9yQ29kZS5JTlZBTElEX0JBTkFOQV9JTl9CT1g+W10ge1xuICAgIHRoaXMuZGlhZ25vc3RpY3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5vZGUgb2YgdGVtcGxhdGUpIHtcbiAgICAgIG5vZGUudmlzaXQodGhpcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRpYWdub3N0aWNzO1xuICB9XG59XG4iXX0=