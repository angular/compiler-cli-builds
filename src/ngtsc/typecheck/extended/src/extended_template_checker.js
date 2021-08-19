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
        ExtendedTemplateCheckerImpl.prototype.getExtendedTemplateDiagnosticsForComponent = function (component) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5kZWRfdGVtcGxhdGVfY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2V4dGVuZGVkL3NyYy9leHRlbmRlZF90ZW1wbGF0ZV9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFRSDtRQUNFLHFDQUNxQixtQkFBd0MsRUFDeEMsV0FBMkIsRUFDM0IsY0FBMEM7WUFGMUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtZQUN4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFDM0IsbUJBQWMsR0FBZCxjQUFjLENBQTRCO1FBQUcsQ0FBQztRQUVuRSxnRkFBMEMsR0FBMUMsVUFBMkMsU0FBOEI7O1lBQ3ZFLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDakUsaUZBQWlGO1lBQ2pGLG9GQUFvRjtZQUNwRiwrQ0FBK0M7WUFDL0MsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO2dCQUNyQixPQUFPLEVBQUUsQ0FBQzthQUNYO1lBQ0QsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztZQUV4QyxJQUFNLEdBQUcsR0FBRztnQkFDVixtQkFBbUIsRUFBRSxJQUFJLENBQUMsbUJBQW1CO2dCQUM3QyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQzdCLFNBQVMsV0FBQTthQUNTLENBQUM7O2dCQUVyQixLQUFvQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLGNBQWMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBcEMsSUFBTSxLQUFLLFdBQUE7b0JBQ2QsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVywyQ0FBUyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFFO2lCQUN2RTs7Ozs7Ozs7O1lBRUQsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUNILGtDQUFDO0lBQUQsQ0FBQyxBQTVCRCxJQTRCQztJQTVCWSxrRUFBMkI7SUErQnhDLGtGQUFrRjtJQUNsRiw4Q0FBOEM7SUFDOUMsRUFBRTtJQUNGLE1BQU07SUFDTiwyQ0FBMkM7SUFDM0MsTUFBTTtJQUNOLEVBQUU7SUFDRixxQ0FBcUM7SUFDckMsRUFBRTtJQUNGLE1BQU07SUFDTixhQUFhO0lBQ2IsZUFBZTtJQUNmLGtCQUFrQjtJQUNsQixvQkFBb0I7SUFDcEIsYUFBYTtJQUNiLE9BQU87SUFDUCxPQUFPO0lBQ1AsZ0JBQWdCO0lBQ2hCLGdCQUFnQjtJQUNoQixtQkFBbUI7SUFDbkIsdUJBQXVCO0lBQ3ZCLHlCQUF5QjtJQUN6QixrQkFBa0I7SUFDbEIsWUFBWTtJQUNaLFVBQVU7SUFDVixRQUFRO0lBQ1IsT0FBTztJQUNQLFVBQVU7SUFDVixJQUFJO0lBQ0osTUFBTTtJQUNOLEVBQUU7SUFDRixnRkFBZ0Y7SUFDaEYsbUZBQW1GO0lBQ25GLDBEQUEwRDtJQUMxRCxzRUFBc0U7SUFDdEUsU0FBUyxzQkFBc0IsQ0FBQyxXQUE0Qjs7UUFDMUQsSUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQztnQ0FDeEIsT0FBTztZQUNoQixJQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQUEsWUFBWSxJQUFJLE9BQUEsbUJBQW1CLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxFQUExQyxDQUEwQyxDQUFDLENBQUM7WUFDaEcsSUFBSSxDQUFDLGVBQWUsRUFBRTtnQkFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUN0Qjs7O1lBSkgsS0FBc0IsSUFBQSxnQkFBQSxpQkFBQSxXQUFXLENBQUEsd0NBQUE7Z0JBQTVCLElBQU0sT0FBTyx3QkFBQTt3QkFBUCxPQUFPO2FBS2pCOzs7Ozs7Ozs7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQsU0FBUyxtQkFBbUIsQ0FBQyxLQUFvQixFQUFFLE1BQXFCOztRQUN0RSxPQUFPLENBQUEsTUFBQSxLQUFLLENBQUMsSUFBSSwwQ0FBRSxRQUFRLE9BQUssTUFBQSxNQUFNLENBQUMsSUFBSSwwQ0FBRSxRQUFRLENBQUEsSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLE1BQU0sQ0FBQyxLQUFLO1lBQ2pGLEtBQUssQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbkUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGV9IGZyb20gJy4uLy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7VGVtcGxhdGVUeXBlQ2hlY2tlcn0gZnJvbSAnLi4vLi4vYXBpJztcbmltcG9ydCB7RXh0ZW5kZWRUZW1wbGF0ZUNoZWNrZXIsIFRlbXBsYXRlQ2hlY2ssIFRlbXBsYXRlQ29udGV4dH0gZnJvbSAnLi4vYXBpJztcblxuZXhwb3J0IGNsYXNzIEV4dGVuZGVkVGVtcGxhdGVDaGVja2VySW1wbCBpbXBsZW1lbnRzIEV4dGVuZGVkVGVtcGxhdGVDaGVja2VyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHRlbXBsYXRlVHlwZUNoZWNrZXI6IFRlbXBsYXRlVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIHJlYWRvbmx5IHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgdGVtcGxhdGVDaGVja3M6IFRlbXBsYXRlQ2hlY2s8RXJyb3JDb2RlPltdKSB7fVxuXG4gIGdldEV4dGVuZGVkVGVtcGxhdGVEaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLmdldFRlbXBsYXRlKGNvbXBvbmVudCk7XG4gICAgLy8gU2tpcCBjaGVja3MgaWYgY29tcG9uZW50IGhhcyBubyB0ZW1wbGF0ZS4gVGhpcyBjYW4gaGFwcGVuIGlmIHRoZSB1c2VyIHdyaXRlcyBhXG4gICAgLy8gYEBDb21wb25lbnQoKWAgYnV0IGRvZXNuJ3QgYWRkIHRoZSB0ZW1wbGF0ZSwgY291bGQgaGFwcGVuIGluIHRoZSBsYW5ndWFnZSBzZXJ2aWNlXG4gICAgLy8gd2hlbiB1c2VycyBhcmUgaW4gdGhlIG1pZGRsZSBvZiB0eXBpbmcgY29kZS5cbiAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgY29uc3QgY3R4ID0ge1xuICAgICAgdGVtcGxhdGVUeXBlQ2hlY2tlcjogdGhpcy50ZW1wbGF0ZVR5cGVDaGVja2VyLFxuICAgICAgdHlwZUNoZWNrZXI6IHRoaXMudHlwZUNoZWNrZXIsXG4gICAgICBjb21wb25lbnRcbiAgICB9IGFzIFRlbXBsYXRlQ29udGV4dDtcblxuICAgIGZvciAoY29uc3QgY2hlY2sgb2YgdGhpcy50ZW1wbGF0ZUNoZWNrcykge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5kZWR1cGxpY2F0ZURpYWdub3N0aWNzKGNoZWNrLnJ1bihjdHgsIHRlbXBsYXRlKSkpO1xuICAgIH1cblxuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxufVxuXG5cbi8vIEZpbHRlciBvdXQgZHVwbGljYXRlZCBkaWFnbm9zdGljcywgdGhpcyBpcyBwb3NzaWJsZSBkdWUgdG8gdGhlIHdheSB0aGUgY29tcGlsZXJcbi8vIGhhbmRsZXMgZGVzdWdhcmluZyBhbmQgcHJvZHVjZXMgYEFTVGBzLiBFeC5cbi8vXG4vLyBgYGBcbi8vIDxkaXYgKm5nSWY9XCJ0cnVlXCIgKGZvbyk9XCJiYXJcIj50ZXN0PC9kaXY+XG4vLyBgYGBcbi8vXG4vLyBXb3VsZCByZXN1bHQgaW4gdGhlIGZvbGxvd2luZyBBU1Q6XG4vL1xuLy8gYGBgXG4vLyBUZW1wbGF0ZSB7XG4vLyAgIG91dHB1dHM6IFtcbi8vICAgIEJvdW5kRXZlbnQge1xuLy8gICAgICBuYW1lOiAnZm9vJyxcbi8vICAgICAgLy4uLi9cbi8vICAgIH1cbi8vICAgXSxcbi8vICAgY2hpbGRyZW46IFtcbi8vICAgICBFbGVtZW50IHtcbi8vICAgICAgIG91dHB1dHM6IFtcbi8vICAgICAgICAgQm91bmRFdmVudCB7XG4vLyAgICAgICAgICAgbmFtZTogJ2ZvbycsXG4vLyAgICAgICAgICAgLy4uLi9cbi8vICAgICAgICAgfVxuLy8gICAgICAgXVxuLy8gICAgIH1cbi8vICAgXSxcbi8vICAgLy4uLi9cbi8vIH1cbi8vIGBgYFxuLy9cbi8vIEluIHRoaXMgY2FzZSBhIGR1cGxpY2F0ZWQgZGlhZ25vc3RpYyBjb3VsZCBiZSBnZW5lcmF0ZWQgZm9yIHRoZSBvdXRwdXQgYGZvb2AuXG4vLyBUT0RPKGRhbmllbHRyZXZpbm8pOiBoYW5kbGUgZHVwbGljYXRlZCBkaWFnbm9zdGljcyB3aGVuIHRoZXkgYXJlIGJlaW5nIGdlbmVyYXRlZFxuLy8gdG8gYXZvaWQgZXh0cmEgd29yayAoY291bGQgYmUgZGlyZWN0bHkgaW4gdGhlIHZpc2l0b3IpLlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9wdWxsLzQyOTg0I2Rpc2N1c3Npb25fcjY4NDgyMzkyNlxuZnVuY3Rpb24gZGVkdXBsaWNhdGVEaWFnbm9zdGljcyhkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKTogdHMuRGlhZ25vc3RpY1tdIHtcbiAgY29uc3QgcmVzdWx0OiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgZm9yIChjb25zdCBuZXdEaWFnIG9mIGRpYWdub3N0aWNzKSB7XG4gICAgY29uc3QgaXNEdXBsaWNhdGVEaWFnID0gcmVzdWx0LnNvbWUoZXhpc3RpbmdEaWFnID0+IGFyZURpYWdub3N0aWNzRXF1YWwobmV3RGlhZywgZXhpc3RpbmdEaWFnKSk7XG4gICAgaWYgKCFpc0R1cGxpY2F0ZURpYWcpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG5ld0RpYWcpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBhcmVEaWFnbm9zdGljc0VxdWFsKGZpcnN0OiB0cy5EaWFnbm9zdGljLCBzZWNvbmQ6IHRzLkRpYWdub3N0aWMpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZpcnN0LmZpbGU/LmZpbGVOYW1lID09PSBzZWNvbmQuZmlsZT8uZmlsZU5hbWUgJiYgZmlyc3Quc3RhcnQgPT09IHNlY29uZC5zdGFydCAmJlxuICAgICAgZmlyc3QubGVuZ3RoID09PSBzZWNvbmQubGVuZ3RoICYmIGZpcnN0LmNvZGUgPT09IHNlY29uZC5jb2RlO1xufVxuIl19