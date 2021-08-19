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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9leHRlbmRlZC9zcmMvdGVtcGxhdGVfY2hlY2tzL2ludmFsaWRfYmFuYW5hX2luX2JveC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTBGO0lBQzFGLCtCQUFpQztJQUNqQywyRUFBcUQ7SUFHckQ7Ozs7T0FJRztJQUNIO1FBQUE7WUFDRSxTQUFJLEdBQW9DLElBQUksQ0FBQztRQVEvQyxDQUFDO1FBTkMscUNBQUcsR0FBSCxVQUFJLEdBQW9CLEVBQ3BCLFFBQXVCO1lBQ3pCLElBQU0sT0FBTyxHQUFHLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXZDLE9BQU8sT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBVEQsSUFTQztJQVRZLDBEQUF1QjtJQVdwQztRQUE0Qix5Q0FBdUI7UUFHakQsdUJBQTRCLEdBQW9CO1lBQWhELFlBQ0UsaUJBQU8sU0FDUjtZQUYyQixTQUFHLEdBQUgsR0FBRyxDQUFpQjtZQUZ4QyxpQkFBVyxHQUFvQixFQUFFLENBQUM7O1FBSTFDLENBQUM7UUFFRDs7Ozs7V0FLRztRQUNNLHVDQUFlLEdBQXhCLFVBQXlCLFVBQTZCO1lBQ3BELElBQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQzlDLElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3JELElBQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFJLElBQUksTUFBRyxFQUFFLE9BQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBSSxDQUFDLENBQUM7Z0JBQ3pGLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLHNCQUFzQixDQUMvQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQ3hFLHVCQUFTLENBQUMscUJBQXFCLEVBQy9CLHVGQUNJLG1CQUFtQiwrRUFDaUMsQ0FBQyxDQUFDLENBQUM7YUFDcEU7UUFDSCxDQUFDO1FBRUQsc0NBQWMsR0FBZCxVQUFlLFFBQXVCOztZQUNwQyxJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQzs7Z0JBQ3RCLEtBQW1CLElBQUEsYUFBQSxpQkFBQSxRQUFRLENBQUEsa0NBQUEsd0RBQUU7b0JBQXhCLElBQU0sSUFBSSxxQkFBQTtvQkFDYixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNsQjs7Ozs7Ozs7O1lBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQzFCLENBQUM7UUFDSCxvQkFBQztJQUFELENBQUMsQUFuQ0QsQ0FBNEIsa0NBQXVCLEdBbUNsRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1RtcGxBc3RCb3VuZEV2ZW50LCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFJlY3Vyc2l2ZVZpc2l0b3J9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtFcnJvckNvZGV9IGZyb20gJy4uLy4uLy4uLy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7VGVtcGxhdGVDaGVjaywgVGVtcGxhdGVDb250ZXh0LCBUZW1wbGF0ZURpYWdub3N0aWN9IGZyb20gJy4uLy4uLy4uL2FwaSc7XG5cbi8qKlxuICogRW5zdXJlcyB0aGUgdHdvLXdheSBiaW5kaW5nIHN5bnRheCBpcyBjb3JyZWN0LlxuICogUGFyZW50aGVzZXMgc2hvdWxkIGJlIGluc2lkZSB0aGUgYnJhY2tldHMgXCJbKCldXCIuXG4gKiBXaWxsIHJldHVybiBkaWFnbm9zdGljIGluZm9ybWF0aW9uIHdoZW4gXCIoW10pXCIgaXMgZm91bmQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnZhbGlkQmFuYW5hSW5Cb3hDaGVjayBpbXBsZW1lbnRzIFRlbXBsYXRlQ2hlY2s8RXJyb3JDb2RlLklOVkFMSURfQkFOQU5BX0lOX0JPWD4ge1xuICBjb2RlOiBFcnJvckNvZGUuSU5WQUxJRF9CQU5BTkFfSU5fQk9YID0gODEwMTtcblxuICBydW4oY3R4OiBUZW1wbGF0ZUNvbnRleHQsXG4gICAgICB0ZW1wbGF0ZTogVG1wbEFzdE5vZGVbXSk6IFRlbXBsYXRlRGlhZ25vc3RpYzxFcnJvckNvZGUuSU5WQUxJRF9CQU5BTkFfSU5fQk9YPltdIHtcbiAgICBjb25zdCB2aXNpdG9yID0gbmV3IEJhbmFuYVZpc2l0b3IoY3R4KTtcblxuICAgIHJldHVybiB2aXNpdG9yLmdldERpYWdub3N0aWNzKHRlbXBsYXRlKTtcbiAgfVxufVxuXG5jbGFzcyBCYW5hbmFWaXNpdG9yIGV4dGVuZHMgVG1wbEFzdFJlY3Vyc2l2ZVZpc2l0b3Ige1xuICBwcml2YXRlIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgY3R4OiBUZW1wbGF0ZUNvbnRleHQpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGZvciBvdXRwdXRzIHdpdGggbmFtZXMgc3Vycm91bmRlZCBpbiBicmFja2V0cyBcIltdXCIuXG4gICAqIFRoZSBzeW50YXggJyhbZm9vXSk9XCJiYXJcIicgd291bGQgYmUgaW50ZXJwcmV0ZWQgYXMgYW4gQE91dHB1dCgpXG4gICAqIHdpdGggbmFtZSAnW2Zvb10nLiBKdXN0IGxpa2UgJyhmb28pPVwiYmFyXCInIHdvdWxkIGhhdmUgdGhlIG5hbWUgJ2ZvbycuXG4gICAqIEdlbmVyYXRlIGRpYWdub3N0aWMgaW5mb3JtYXRpb24gZm9yIHRoZSBjYXNlcyBmb3VuZC5cbiAgICovXG4gIG92ZXJyaWRlIHZpc2l0Qm91bmRFdmVudChib3VuZEV2ZW50OiBUbXBsQXN0Qm91bmRFdmVudCkge1xuICAgIGNvbnN0IG5hbWUgPSBib3VuZEV2ZW50Lm5hbWU7XG4gICAgaWYgKG5hbWUuc3RhcnRzV2l0aCgnWycpICYmIG5hbWUuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgY29uc3QgYm91bmRTeW50YXggPSBib3VuZEV2ZW50LnNvdXJjZVNwYW4udG9TdHJpbmcoKTtcbiAgICAgIGNvbnN0IGV4cGVjdGVkQm91bmRTeW50YXggPSBib3VuZFN5bnRheC5yZXBsYWNlKGAoJHtuYW1lfSlgLCBgWygke25hbWUuc2xpY2UoMSwgLTEpfSldYCk7XG4gICAgICB0aGlzLmRpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAgdGhpcy5jdHgudGVtcGxhdGVUeXBlQ2hlY2tlci5tYWtlVGVtcGxhdGVEaWFnbm9zdGljPEVycm9yQ29kZS5JTlZBTElEX0JBTkFOQV9JTl9CT1g+KFxuICAgICAgICAgICAgICB0aGlzLmN0eC5jb21wb25lbnQsIGJvdW5kRXZlbnQuc291cmNlU3BhbiwgdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lldhcm5pbmcsXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5JTlZBTElEX0JBTkFOQV9JTl9CT1gsXG4gICAgICAgICAgICAgIGBJbiB0aGUgdHdvLXdheSBiaW5kaW5nIHN5bnRheCB0aGUgcGFyZW50aGVzZXMgc2hvdWxkIGJlIGluc2lkZSB0aGUgYnJhY2tldHMsIGV4LiAnJHtcbiAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQm91bmRTeW50YXh9Jy4gXG4gICAgICAgICAgICAgICAgRmluZCBtb3JlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9ndWlkZS90d28td2F5LWJpbmRpbmdgKSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RGlhZ25vc3RpY3ModGVtcGxhdGU6IFRtcGxBc3ROb2RlW10pOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIHRoaXMuZGlhZ25vc3RpY3MgPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5vZGUgb2YgdGVtcGxhdGUpIHtcbiAgICAgIG5vZGUudmlzaXQodGhpcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRpYWdub3N0aWNzO1xuICB9XG59XG4iXX0=