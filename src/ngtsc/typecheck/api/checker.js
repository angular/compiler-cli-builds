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
        define("@angular/compiler-cli/src/ngtsc/typecheck/api/checker", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OptimizeFor = void 0;
    /**
     * Describes the scope of the caller's interest in template type-checking results.
     */
    var OptimizeFor;
    (function (OptimizeFor) {
        /**
         * Indicates that a consumer of a `TemplateTypeChecker` is only interested in results for a given
         * file, and wants them as fast as possible.
         *
         * Calling `TemplateTypeChecker` methods successively for multiple files while specifying
         * `OptimizeFor.SingleFile` can result in significant unnecessary overhead overall.
         */
        OptimizeFor[OptimizeFor["SingleFile"] = 0] = "SingleFile";
        /**
         * Indicates that a consumer of a `TemplateTypeChecker` intends to query for results pertaining to
         * the entire user program, and so the type-checker should internally optimize for this case.
         *
         * Initial calls to retrieve type-checking information may take longer, but repeated calls to
         * gather information for the whole user program will be significantly faster with this mode of
         * optimization.
         */
        OptimizeFor[OptimizeFor["WholeProgram"] = 1] = "WholeProgram";
    })(OptimizeFor = exports.OptimizeFor || (exports.OptimizeFor = {}));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaS9jaGVja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQThHSDs7T0FFRztJQUNILElBQVksV0FtQlg7SUFuQkQsV0FBWSxXQUFXO1FBQ3JCOzs7Ozs7V0FNRztRQUNILHlEQUFVLENBQUE7UUFFVjs7Ozs7OztXQU9HO1FBQ0gsNkRBQVksQ0FBQTtJQUNkLENBQUMsRUFuQlcsV0FBVyxHQUFYLG1CQUFXLEtBQVgsbUJBQVcsUUFtQnRCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QVNULCBQYXJzZUVycm9yLCBUbXBsQXN0Tm9kZSwgVG1wbEFzdFRlbXBsYXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtHbG9iYWxDb21wbGV0aW9ufSBmcm9tICcuL2NvbXBsZXRpb24nO1xuaW1wb3J0IHtEaXJlY3RpdmVJblNjb3BlLCBQaXBlSW5TY29wZX0gZnJvbSAnLi9zY29wZSc7XG5pbXBvcnQge1N5bWJvbH0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqXG4gKiBJbnRlcmZhY2UgdG8gdGhlIEFuZ3VsYXIgVGVtcGxhdGUgVHlwZSBDaGVja2VyIHRvIGV4dHJhY3QgZGlhZ25vc3RpY3MgYW5kIGludGVsbGlnZW5jZSBmcm9tIHRoZVxuICogY29tcGlsZXIncyB1bmRlcnN0YW5kaW5nIG9mIGNvbXBvbmVudCB0ZW1wbGF0ZXMuXG4gKlxuICogVGhpcyBpbnRlcmZhY2UgaXMgYW5hbG9nb3VzIHRvIFR5cGVTY3JpcHQncyBvd24gYHRzLlR5cGVDaGVja2VyYCBBUEkuXG4gKlxuICogSW4gZ2VuZXJhbCwgdGhpcyBpbnRlcmZhY2Ugc3VwcG9ydHMgdHdvIGtpbmRzIG9mIG9wZXJhdGlvbnM6XG4gKiAgLSB1cGRhdGluZyBUeXBlIENoZWNrIEJsb2NrcyAoVENCKXMgdGhhdCBjYXB0dXJlIHRoZSB0ZW1wbGF0ZSBpbiB0aGUgZm9ybSBvZiBUeXBlU2NyaXB0IGNvZGVcbiAqICAtIHF1ZXJ5aW5nIGluZm9ybWF0aW9uIGFib3V0IGF2YWlsYWJsZSBUQ0JzLCBpbmNsdWRpbmcgZGlhZ25vc3RpY3NcbiAqXG4gKiBPbmNlIGEgVENCIGlzIGF2YWlsYWJsZSwgaW5mb3JtYXRpb24gYWJvdXQgaXQgY2FuIGJlIHF1ZXJpZWQuIElmIG5vIFRDQiBpcyBhdmFpbGFibGUgdG8gYW5zd2VyIGFcbiAqIHF1ZXJ5LCBkZXBlbmRpbmcgb24gdGhlIG1ldGhvZCBlaXRoZXIgYG51bGxgIHdpbGwgYmUgcmV0dXJuZWQgb3IgYW4gZXJyb3Igd2lsbCBiZSB0aHJvd24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVUeXBlQ2hlY2tlciB7XG4gIC8qKlxuICAgKiBDbGVhciBhbGwgb3ZlcnJpZGVzIGFuZCByZXR1cm4gdGhlIHRlbXBsYXRlIHR5cGUtY2hlY2tlciB0byB0aGUgb3JpZ2luYWwgaW5wdXQgcHJvZ3JhbSBzdGF0ZS5cbiAgICovXG4gIHJlc2V0T3ZlcnJpZGVzKCk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSB0ZW1wbGF0ZSBpbiB1c2UgZm9yIHRoZSBnaXZlbiBjb21wb25lbnQuXG4gICAqXG4gICAqIElmIHRoZSB0ZW1wbGF0ZSBoYXMgYmVlbiBvdmVycmlkZGVuIHZpYSBgb3ZlcnJpZGVDb21wb25lbnRUZW1wbGF0ZWAsIHRoaXMgd2lsbCByZXRyaWV2ZSB0aGVcbiAgICogb3ZlcnJpZGRlbiB0ZW1wbGF0ZSBub2Rlcy5cbiAgICovXG4gIGdldFRlbXBsYXRlKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IFRtcGxBc3ROb2RlW118bnVsbDtcblxuICAvKipcbiAgICogUHJvdmlkZSBhIG5ldyB0ZW1wbGF0ZSBzdHJpbmcgdGhhdCB3aWxsIGJlIHVzZWQgaW4gcGxhY2Ugb2YgdGhlIHVzZXItZGVmaW5lZCB0ZW1wbGF0ZSB3aGVuXG4gICAqIGNoZWNraW5nIG9yIG9wZXJhdGluZyBvbiB0aGUgZ2l2ZW4gY29tcG9uZW50LlxuICAgKlxuICAgKiBUaGUgY29tcGlsZXIgd2lsbCBwYXJzZSB0aGlzIHRlbXBsYXRlIGZvciBkaWFnbm9zdGljcywgYW5kIHdpbGwgcmV0dXJuIGFueSBwYXJzaW5nIGVycm9ycyBpZiBpdFxuICAgKiBpcyBub3QgdmFsaWQuIElmIHRoZSB0ZW1wbGF0ZSBjYW5ub3QgYmUgcGFyc2VkIGNvcnJlY3RseSwgbm8gb3ZlcnJpZGUgd2lsbCBvY2N1ci5cbiAgICovXG4gIG92ZXJyaWRlQ29tcG9uZW50VGVtcGxhdGUoY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCB0ZW1wbGF0ZTogc3RyaW5nKTpcbiAgICAgIHtub2RlczogVG1wbEFzdE5vZGVbXSwgZXJyb3JzPzogUGFyc2VFcnJvcltdfTtcblxuICAvKipcbiAgICogR2V0IGFsbCBgdHMuRGlhZ25vc3RpY2BzIGN1cnJlbnRseSBhdmFpbGFibGUgZm9yIHRoZSBnaXZlbiBgdHMuU291cmNlRmlsZWAuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHdpbGwgZmFpbCAodGhyb3cpIGlmIHRoZXJlIGFyZSBjb21wb25lbnRzIHdpdGhpbiB0aGUgYHRzLlNvdXJjZUZpbGVgIHRoYXQgZG8gbm90XG4gICAqIGhhdmUgVENCcyBhdmFpbGFibGUuXG4gICAqXG4gICAqIEdlbmVyYXRpbmcgYSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHByb2dyYW0gaXMgZXhwZW5zaXZlLCBhbmQgaW4gc29tZSB3b3JrZmxvd3MgKGUuZy4gY2hlY2tpbmdcbiAgICogYW4gZW50aXJlIHByb2dyYW0gYmVmb3JlIGVtaXQpLCBpdCBzaG91bGQgaWRlYWxseSBvbmx5IGJlIGRvbmUgb25jZS4gVGhlIGBvcHRpbWl6ZUZvcmAgZmxhZ1xuICAgKiBhbGxvd3MgdGhlIGNhbGxlciB0byBoaW50IHRvIGBnZXREaWFnbm9zdGljc0ZvckZpbGVgICh3aGljaCBpbnRlcm5hbGx5IHdpbGwgY3JlYXRlIGEgdGVtcGxhdGVcbiAgICogdHlwZS1jaGVja2luZyBwcm9ncmFtIGlmIG5lZWRlZCkgd2hldGhlciB0aGUgY2FsbGVyIGlzIGludGVyZXN0ZWQgaW4ganVzdCB0aGUgcmVzdWx0cyBvZiB0aGVcbiAgICogc2luZ2xlIGZpbGUsIG9yIHdoZXRoZXIgdGhleSBwbGFuIHRvIHF1ZXJ5IGFib3V0IG90aGVyIGZpbGVzIGluIHRoZSBwcm9ncmFtLiBCYXNlZCBvbiB0aGlzXG4gICAqIGZsYWcsIGBnZXREaWFnbm9zdGljc0ZvckZpbGVgIHdpbGwgZGV0ZXJtaW5lIGhvdyBtdWNoIG9mIHRoZSB1c2VyJ3MgcHJvZ3JhbSB0byBwcmVwYXJlIGZvclxuICAgKiBjaGVja2luZyBhcyBwYXJ0IG9mIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHByb2dyYW0gaXQgY3JlYXRlcy5cbiAgICovXG4gIGdldERpYWdub3N0aWNzRm9yRmlsZShzZjogdHMuU291cmNlRmlsZSwgb3B0aW1pemVGb3I6IE9wdGltaXplRm9yKTogdHMuRGlhZ25vc3RpY1tdO1xuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGB0cy5EaWFnbm9zdGljYHMgY3VycmVudGx5IGF2YWlsYWJsZSB0aGF0IHBlcnRhaW4gdG8gdGhlIGdpdmVuIGNvbXBvbmVudC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYWx3YXlzIHJ1bnMgaW4gYE9wdGltaXplRm9yLlNpbmdsZUZpbGVgIG1vZGUuXG4gICAqL1xuICBnZXREaWFnbm9zdGljc0ZvckNvbXBvbmVudChjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiB0cy5EaWFnbm9zdGljW107XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSB0b3AtbGV2ZWwgbm9kZSByZXByZXNlbnRpbmcgdGhlIFRDQiBmb3IgdGhlIGdpdmVuIGNvbXBvbmVudC5cbiAgICpcbiAgICogVGhpcyBjYW4gcmV0dXJuIGBudWxsYCBpZiB0aGVyZSBpcyBubyBUQ0IgYXZhaWxhYmxlIGZvciB0aGUgY29tcG9uZW50LlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBhbHdheXMgcnVucyBpbiBgT3B0aW1pemVGb3IuU2luZ2xlRmlsZWAgbW9kZS5cbiAgICovXG4gIGdldFR5cGVDaGVja0Jsb2NrKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IHRzLk5vZGV8bnVsbDtcblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgYFN5bWJvbGAgZm9yIHRoZSBub2RlIGluIGEgY29tcG9uZW50J3MgdGVtcGxhdGUuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGNhbiByZXR1cm4gYG51bGxgIGlmIGEgdmFsaWQgYFN5bWJvbGAgY2Fubm90IGJlIGRldGVybWluZWQgZm9yIHRoZSBub2RlLlxuICAgKlxuICAgKiBAc2VlIFN5bWJvbFxuICAgKi9cbiAgZ2V0U3ltYm9sT2ZOb2RlKG5vZGU6IEFTVHxUbXBsQXN0Tm9kZSwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogU3ltYm9sfG51bGw7XG5cbiAgLyoqXG4gICAqIEdldCBcImdsb2JhbFwiIGBDb21wbGV0aW9uYHMgaW4gdGhlIGdpdmVuIGNvbnRleHQuXG4gICAqXG4gICAqIEdsb2JhbCBjb21wbGV0aW9ucyBhcmUgY29tcGxldGlvbnMgaW4gdGhlIGdsb2JhbCBjb250ZXh0LCBhcyBvcHBvc2VkIHRvIGNvbXBsZXRpb25zIHdpdGhpbiBhblxuICAgKiBleGlzdGluZyBleHByZXNzaW9uLiBGb3IgZXhhbXBsZSwgY29tcGxldGluZyBpbnNpZGUgYSBuZXcgaW50ZXJwb2xhdGlvbiBleHByZXNzaW9uIChge3t8fX1gKSBvclxuICAgKiBpbnNpZGUgYSBuZXcgcHJvcGVydHkgYmluZGluZyBgW2lucHV0XT1cInxcIiBzaG91bGQgcmV0cmlldmUgZ2xvYmFsIGNvbXBsZXRpb25zLCB3aGljaCB3aWxsXG4gICAqIGluY2x1ZGUgY29tcGxldGlvbnMgZnJvbSB0aGUgdGVtcGxhdGUncyBjb250ZXh0IGNvbXBvbmVudCwgYXMgd2VsbCBhcyBhbnkgbG9jYWwgcmVmZXJlbmNlcyBvclxuICAgKiB0ZW1wbGF0ZSB2YXJpYWJsZXMgd2hpY2ggYXJlIGluIHNjb3BlIGZvciB0aGF0IGV4cHJlc3Npb24uXG4gICAqL1xuICBnZXRHbG9iYWxDb21wbGV0aW9ucyhjb250ZXh0OiBUbXBsQXN0VGVtcGxhdGV8bnVsbCwgY29tcG9uZW50OiB0cy5DbGFzc0RlY2xhcmF0aW9uKTpcbiAgICAgIEdsb2JhbENvbXBsZXRpb258bnVsbDtcblxuICAvKipcbiAgICogR2V0IGJhc2ljIG1ldGFkYXRhIG9uIHRoZSBkaXJlY3RpdmVzIHdoaWNoIGFyZSBpbiBzY29wZSBmb3IgdGhlIGdpdmVuIGNvbXBvbmVudC5cbiAgICovXG4gIGdldERpcmVjdGl2ZXNJblNjb3BlKGNvbXBvbmVudDogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IERpcmVjdGl2ZUluU2NvcGVbXXxudWxsO1xuXG4gIC8qKlxuICAgKiBHZXQgYmFzaWMgbWV0YWRhdGEgb24gdGhlIHBpcGVzIHdoaWNoIGFyZSBpbiBzY29wZSBmb3IgdGhlIGdpdmVuIGNvbXBvbmVudC5cbiAgICovXG4gIGdldFBpcGVzSW5TY29wZShjb21wb25lbnQ6IHRzLkNsYXNzRGVjbGFyYXRpb24pOiBQaXBlSW5TY29wZVtdfG51bGw7XG59XG5cbi8qKlxuICogRGVzY3JpYmVzIHRoZSBzY29wZSBvZiB0aGUgY2FsbGVyJ3MgaW50ZXJlc3QgaW4gdGVtcGxhdGUgdHlwZS1jaGVja2luZyByZXN1bHRzLlxuICovXG5leHBvcnQgZW51bSBPcHRpbWl6ZUZvciB7XG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCBhIGNvbnN1bWVyIG9mIGEgYFRlbXBsYXRlVHlwZUNoZWNrZXJgIGlzIG9ubHkgaW50ZXJlc3RlZCBpbiByZXN1bHRzIGZvciBhIGdpdmVuXG4gICAqIGZpbGUsIGFuZCB3YW50cyB0aGVtIGFzIGZhc3QgYXMgcG9zc2libGUuXG4gICAqXG4gICAqIENhbGxpbmcgYFRlbXBsYXRlVHlwZUNoZWNrZXJgIG1ldGhvZHMgc3VjY2Vzc2l2ZWx5IGZvciBtdWx0aXBsZSBmaWxlcyB3aGlsZSBzcGVjaWZ5aW5nXG4gICAqIGBPcHRpbWl6ZUZvci5TaW5nbGVGaWxlYCBjYW4gcmVzdWx0IGluIHNpZ25pZmljYW50IHVubmVjZXNzYXJ5IG92ZXJoZWFkIG92ZXJhbGwuXG4gICAqL1xuICBTaW5nbGVGaWxlLFxuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgdGhhdCBhIGNvbnN1bWVyIG9mIGEgYFRlbXBsYXRlVHlwZUNoZWNrZXJgIGludGVuZHMgdG8gcXVlcnkgZm9yIHJlc3VsdHMgcGVydGFpbmluZyB0b1xuICAgKiB0aGUgZW50aXJlIHVzZXIgcHJvZ3JhbSwgYW5kIHNvIHRoZSB0eXBlLWNoZWNrZXIgc2hvdWxkIGludGVybmFsbHkgb3B0aW1pemUgZm9yIHRoaXMgY2FzZS5cbiAgICpcbiAgICogSW5pdGlhbCBjYWxscyB0byByZXRyaWV2ZSB0eXBlLWNoZWNraW5nIGluZm9ybWF0aW9uIG1heSB0YWtlIGxvbmdlciwgYnV0IHJlcGVhdGVkIGNhbGxzIHRvXG4gICAqIGdhdGhlciBpbmZvcm1hdGlvbiBmb3IgdGhlIHdob2xlIHVzZXIgcHJvZ3JhbSB3aWxsIGJlIHNpZ25pZmljYW50bHkgZmFzdGVyIHdpdGggdGhpcyBtb2RlIG9mXG4gICAqIG9wdGltaXphdGlvbi5cbiAgICovXG4gIFdob2xlUHJvZ3JhbSxcbn1cbiJdfQ==