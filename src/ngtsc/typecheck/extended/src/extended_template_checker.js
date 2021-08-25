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
        define("@angular/compiler-cli/src/ngtsc/typecheck/extended/src/extended_template_checker", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ExtendedTemplateCheckerImpl = void 0;
    var tslib_1 = require("tslib");
    var ExtendedTemplateCheckerImpl = /** @class */ (function () {
        function ExtendedTemplateCheckerImpl(templateTypeChecker, typeChecker, templateChecks) {
            this.templateTypeChecker = templateTypeChecker;
            this.typeChecker = typeChecker;
            this.templateChecks = templateChecks;
        }
        ExtendedTemplateCheckerImpl.prototype.getDiagnosticsForComponent = function (component) {
            var e_1, _a;
            var template = this.templateTypeChecker.getTemplate(component);
            // Skip checks if component has no template. This can happen if the user writes a
            // `@Component()` but doesn't add the template, could happen in the language service
            // when users are in the middle of typing code.
            if (template === null) {
                return [];
            }
            var diagnostics = [];
            var ctx = {
                templateTypeChecker: this.templateTypeChecker,
                typeChecker: this.typeChecker,
                component: component
            };
            try {
                for (var _b = tslib_1.__values(this.templateChecks), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var check = _c.value;
                    diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(deduplicateDiagnostics(check.run(ctx, template)))));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return diagnostics;
        };
        return ExtendedTemplateCheckerImpl;
    }());
    exports.ExtendedTemplateCheckerImpl = ExtendedTemplateCheckerImpl;
    // Filter out duplicated diagnostics, this is possible due to the way the compiler
    // handles desugaring and produces `AST`s. Ex.
    //
    // ```
    // <div *ngIf="true" (foo)="bar">test</div>
    // ```
    //
    // Would result in the following AST:
    //
    // ```
    // Template {
    //   outputs: [
    //    BoundEvent {
    //      name: 'foo',
    //      /.../
    //    }
    //   ],
    //   children: [
    //     Element {
    //       outputs: [
    //         BoundEvent {
    //           name: 'foo',
    //           /.../
    //         }
    //       ]
    //     }
    //   ],
    //   /.../
    // }
    // ```
    //
    // In this case a duplicated diagnostic could be generated for the output `foo`.
    // TODO(danieltrevino): handle duplicated diagnostics when they are being generated
    // to avoid extra work (could be directly in the visitor).
    // https://github.com/angular/angular/pull/42984#discussion_r684823926
    function deduplicateDiagnostics(diagnostics) {
        var e_2, _a;
        var result = [];
        var _loop_1 = function (newDiag) {
            var isDuplicateDiag = result.some(function (existingDiag) { return areDiagnosticsEqual(newDiag, existingDiag); });
            if (!isDuplicateDiag) {
                result.push(newDiag);
            }
        };
        try {
            for (var diagnostics_1 = tslib_1.__values(diagnostics), diagnostics_1_1 = diagnostics_1.next(); !diagnostics_1_1.done; diagnostics_1_1 = diagnostics_1.next()) {
                var newDiag = diagnostics_1_1.value;
                _loop_1(newDiag);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (diagnostics_1_1 && !diagnostics_1_1.done && (_a = diagnostics_1.return)) _a.call(diagnostics_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return result;
    }
    function areDiagnosticsEqual(first, second) {
        var _a, _b;
        return ((_a = first.file) === null || _a === void 0 ? void 0 : _a.fileName) === ((_b = second.file) === null || _b === void 0 ? void 0 : _b.fileName) && first.start === second.start &&
            first.length === second.length && first.code === second.code;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5kZWRfdGVtcGxhdGVfY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2V4dGVuZGVkL3NyYy9leHRlbmRlZF90ZW1wbGF0ZV9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFRSDtRQUNFLHFDQUNxQixtQkFBd0MsRUFDeEMsV0FBMkIsRUFDM0IsY0FBMEM7WUFGMUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtZQUN4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFDM0IsbUJBQWMsR0FBZCxjQUFjLENBQTRCO1FBQUcsQ0FBQztRQUVuRSxnRUFBMEIsR0FBMUIsVUFBMkIsU0FBOEI7O1lBQ3ZELElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDakUsaUZBQWlGO1lBQ2pGLG9GQUFvRjtZQUNwRiwrQ0FBK0M7WUFDL0MsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO2dCQUNyQixPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsSUFBTSxXQUFXLEdBQXlCLEVBQUUsQ0FBQztZQUU3QyxJQUFNLEdBQUcsR0FBRztnQkFDVixtQkFBbUIsRUFBRSxJQUFJLENBQUMsbUJBQW1CO2dCQUM3QyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQzdCLFNBQVMsV0FBQTthQUNTLENBQUM7O2dCQUVyQixLQUFvQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBcEMsSUFBTSxLQUFLLFdBQUE7b0JBQ2QsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVywyQ0FBUyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFFO2lCQUN2RTs7Ozs7Ozs7O1lBRUQsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUNILGtDQUFDO0lBQUQsQ0FBQyxBQTVCRCxJQTRCQztJQTVCWSxrRUFBMkI7SUErQnhDLGtGQUFrRjtJQUNsRiw4Q0FBOEM7SUFDOUMsRUFBRTtJQUNGLE1BQU07SUFDTiwyQ0FBMkM7SUFDM0MsTUFBTTtJQUNOLEVBQUU7SUFDRixxQ0FBcUM7SUFDckMsRUFBRTtJQUNGLE1BQU07SUFDTixhQUFhO0lBQ2IsZUFBZTtJQUNmLGtCQUFrQjtJQUNsQixvQkFBb0I7SUFDcEIsYUFBYTtJQUNiLE9BQU87SUFDUCxPQUFPO0lBQ1AsZ0JBQWdCO0lBQ2hCLGdCQUFnQjtJQUNoQixtQkFBbUI7SUFDbkIsdUJBQXVCO0lBQ3ZCLHlCQUF5QjtJQUN6QixrQkFBa0I7SUFDbEIsWUFBWTtJQUNaLFVBQVU7SUFDVixRQUFRO0lBQ1IsT0FBTztJQUNQLFVBQVU7SUFDVixJQUFJO0lBQ0osTUFBTTtJQUNOLEVBQUU7SUFDRixnRkFBZ0Y7SUFDaEYsbUZBQW1GO0lBQ25GLDBEQUEwRDtJQUMxRCxzRUFBc0U7SUFDdEUsU0FBUyxzQkFBc0IsQ0FBMEIsV0FBZ0I7O1FBQ3ZFLElBQU0sTUFBTSxHQUFRLEVBQUUsQ0FBQztnQ0FDWixPQUFPO1lBQ2hCLElBQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBQSxZQUFZLElBQUksT0FBQSxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLEVBQTFDLENBQTBDLENBQUMsQ0FBQztZQUNoRyxJQUFJLENBQUMsZUFBZSxFQUFFO2dCQUNwQixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3RCOzs7WUFKSCxLQUFzQixJQUFBLGdCQUFBLGlCQUFBLFdBQVcsQ0FBQSx3Q0FBQTtnQkFBNUIsSUFBTSxPQUFPLHdCQUFBO3dCQUFQLE9BQU87YUFLakI7Ozs7Ozs7OztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLEtBQW9CLEVBQUUsTUFBcUI7O1FBQ3RFLE9BQU8sQ0FBQSxNQUFBLEtBQUssQ0FBQyxJQUFJLDBDQUFFLFFBQVEsT0FBSyxNQUFBLE1BQU0sQ0FBQyxJQUFJLDBDQUFFLFFBQVEsQ0FBQSxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLEtBQUs7WUFDakYsS0FBSyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQztJQUNuRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZX0gZnJvbSAnLi4vLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtUZW1wbGF0ZURpYWdub3N0aWMsIFRlbXBsYXRlVHlwZUNoZWNrZXJ9IGZyb20gJy4uLy4uL2FwaSc7XG5pbXBvcnQge0V4dGVuZGVkVGVtcGxhdGVDaGVja2VyLCBUZW1wbGF0ZUNoZWNrLCBUZW1wbGF0ZUNvbnRleHR9IGZyb20gJy4uL2FwaSc7XG5cbmV4cG9ydCBjbGFzcyBFeHRlbmRlZFRlbXBsYXRlQ2hlY2tlckltcGwgaW1wbGVtZW50cyBFeHRlbmRlZFRlbXBsYXRlQ2hlY2tlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0ZW1wbGF0ZVR5cGVDaGVja2VyOiBUZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSByZWFkb25seSB0eXBlQ2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlQ2hlY2tzOiBUZW1wbGF0ZUNoZWNrPEVycm9yQ29kZT5bXSkge31cblxuICBnZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBUZW1wbGF0ZURpYWdub3N0aWNbXSB7XG4gICAgY29uc3QgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlVHlwZUNoZWNrZXIuZ2V0VGVtcGxhdGUoY29tcG9uZW50KTtcbiAgICAvLyBTa2lwIGNoZWNrcyBpZiBjb21wb25lbnQgaGFzIG5vIHRlbXBsYXRlLiBUaGlzIGNhbiBoYXBwZW4gaWYgdGhlIHVzZXIgd3JpdGVzIGFcbiAgICAvLyBgQENvbXBvbmVudCgpYCBidXQgZG9lc24ndCBhZGQgdGhlIHRlbXBsYXRlLCBjb3VsZCBoYXBwZW4gaW4gdGhlIGxhbmd1YWdlIHNlcnZpY2VcbiAgICAvLyB3aGVuIHVzZXJzIGFyZSBpbiB0aGUgbWlkZGxlIG9mIHR5cGluZyBjb2RlLlxuICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBkaWFnbm9zdGljczogVGVtcGxhdGVEaWFnbm9zdGljW10gPSBbXTtcblxuICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgIHRlbXBsYXRlVHlwZUNoZWNrZXI6IHRoaXMudGVtcGxhdGVUeXBlQ2hlY2tlcixcbiAgICAgIHR5cGVDaGVja2VyOiB0aGlzLnR5cGVDaGVja2VyLFxuICAgICAgY29tcG9uZW50XG4gICAgfSBhcyBUZW1wbGF0ZUNvbnRleHQ7XG5cbiAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHRoaXMudGVtcGxhdGVDaGVja3MpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uZGVkdXBsaWNhdGVEaWFnbm9zdGljcyhjaGVjay5ydW4oY3R4LCB0ZW1wbGF0ZSkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGlhZ25vc3RpY3M7XG4gIH1cbn1cblxuXG4vLyBGaWx0ZXIgb3V0IGR1cGxpY2F0ZWQgZGlhZ25vc3RpY3MsIHRoaXMgaXMgcG9zc2libGUgZHVlIHRvIHRoZSB3YXkgdGhlIGNvbXBpbGVyXG4vLyBoYW5kbGVzIGRlc3VnYXJpbmcgYW5kIHByb2R1Y2VzIGBBU1Rgcy4gRXguXG4vL1xuLy8gYGBgXG4vLyA8ZGl2ICpuZ0lmPVwidHJ1ZVwiIChmb28pPVwiYmFyXCI+dGVzdDwvZGl2PlxuLy8gYGBgXG4vL1xuLy8gV291bGQgcmVzdWx0IGluIHRoZSBmb2xsb3dpbmcgQVNUOlxuLy9cbi8vIGBgYFxuLy8gVGVtcGxhdGUge1xuLy8gICBvdXRwdXRzOiBbXG4vLyAgICBCb3VuZEV2ZW50IHtcbi8vICAgICAgbmFtZTogJ2ZvbycsXG4vLyAgICAgIC8uLi4vXG4vLyAgICB9XG4vLyAgIF0sXG4vLyAgIGNoaWxkcmVuOiBbXG4vLyAgICAgRWxlbWVudCB7XG4vLyAgICAgICBvdXRwdXRzOiBbXG4vLyAgICAgICAgIEJvdW5kRXZlbnQge1xuLy8gICAgICAgICAgIG5hbWU6ICdmb28nLFxuLy8gICAgICAgICAgIC8uLi4vXG4vLyAgICAgICAgIH1cbi8vICAgICAgIF1cbi8vICAgICB9XG4vLyAgIF0sXG4vLyAgIC8uLi4vXG4vLyB9XG4vLyBgYGBcbi8vXG4vLyBJbiB0aGlzIGNhc2UgYSBkdXBsaWNhdGVkIGRpYWdub3N0aWMgY291bGQgYmUgZ2VuZXJhdGVkIGZvciB0aGUgb3V0cHV0IGBmb29gLlxuLy8gVE9ETyhkYW5pZWx0cmV2aW5vKTogaGFuZGxlIGR1cGxpY2F0ZWQgZGlhZ25vc3RpY3Mgd2hlbiB0aGV5IGFyZSBiZWluZyBnZW5lcmF0ZWRcbi8vIHRvIGF2b2lkIGV4dHJhIHdvcmsgKGNvdWxkIGJlIGRpcmVjdGx5IGluIHRoZSB2aXNpdG9yKS5cbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvcHVsbC80Mjk4NCNkaXNjdXNzaW9uX3I2ODQ4MjM5MjZcbmZ1bmN0aW9uIGRlZHVwbGljYXRlRGlhZ25vc3RpY3M8VCBleHRlbmRzIHRzLkRpYWdub3N0aWM+KGRpYWdub3N0aWNzOiBUW10pOiBUW10ge1xuICBjb25zdCByZXN1bHQ6IFRbXSA9IFtdO1xuICBmb3IgKGNvbnN0IG5ld0RpYWcgb2YgZGlhZ25vc3RpY3MpIHtcbiAgICBjb25zdCBpc0R1cGxpY2F0ZURpYWcgPSByZXN1bHQuc29tZShleGlzdGluZ0RpYWcgPT4gYXJlRGlhZ25vc3RpY3NFcXVhbChuZXdEaWFnLCBleGlzdGluZ0RpYWcpKTtcbiAgICBpZiAoIWlzRHVwbGljYXRlRGlhZykge1xuICAgICAgcmVzdWx0LnB1c2gobmV3RGlhZyk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGFyZURpYWdub3N0aWNzRXF1YWwoZmlyc3Q6IHRzLkRpYWdub3N0aWMsIHNlY29uZDogdHMuRGlhZ25vc3RpYyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZmlyc3QuZmlsZT8uZmlsZU5hbWUgPT09IHNlY29uZC5maWxlPy5maWxlTmFtZSAmJiBmaXJzdC5zdGFydCA9PT0gc2Vjb25kLnN0YXJ0ICYmXG4gICAgICBmaXJzdC5sZW5ndGggPT09IHNlY29uZC5sZW5ndGggJiYgZmlyc3QuY29kZSA9PT0gc2Vjb25kLmNvZGU7XG59XG4iXX0=