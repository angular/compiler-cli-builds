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
        define("@angular/compiler-cli/src/ngtsc/diagnostics/src/util", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.replaceTsWithNgInErrors = void 0;
    var ERROR_CODE_MATCHER = /(\u001b\[\d+m ?)TS-99(\d+: ?\u001b\[\d+m)/g;
    /**
     * During formatting of `ts.Diagnostic`s, the numeric code of each diagnostic is prefixed with the
     * hard-coded "TS" prefix. For Angular's own error codes, a prefix of "NG" is desirable. To achieve
     * this, all Angular error codes start with "-99" so that the sequence "TS-99" can be assumed to
     * correspond with an Angular specific error code. This function replaces those occurrences with
     * just "NG".
     *
     * @param errors The formatted diagnostics
     */
    function replaceTsWithNgInErrors(errors) {
        return errors.replace(ERROR_CODE_MATCHER, '$1NG$2');
    }
    exports.replaceTsWithNgInErrors = replaceTsWithNgInErrors;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZGlhZ25vc3RpY3Mvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsSUFBTSxrQkFBa0IsR0FBRyw0Q0FBNEMsQ0FBQztJQUV4RTs7Ozs7Ozs7T0FRRztJQUNILFNBQWdCLHVCQUF1QixDQUFDLE1BQWM7UUFDcEQsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFGRCwwREFFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuY29uc3QgRVJST1JfQ09ERV9NQVRDSEVSID0gLyhcXHUwMDFiXFxbXFxkK20gPylUUy05OShcXGQrOiA/XFx1MDAxYlxcW1xcZCttKS9nO1xuXG4vKipcbiAqIER1cmluZyBmb3JtYXR0aW5nIG9mIGB0cy5EaWFnbm9zdGljYHMsIHRoZSBudW1lcmljIGNvZGUgb2YgZWFjaCBkaWFnbm9zdGljIGlzIHByZWZpeGVkIHdpdGggdGhlXG4gKiBoYXJkLWNvZGVkIFwiVFNcIiBwcmVmaXguIEZvciBBbmd1bGFyJ3Mgb3duIGVycm9yIGNvZGVzLCBhIHByZWZpeCBvZiBcIk5HXCIgaXMgZGVzaXJhYmxlLiBUbyBhY2hpZXZlXG4gKiB0aGlzLCBhbGwgQW5ndWxhciBlcnJvciBjb2RlcyBzdGFydCB3aXRoIFwiLTk5XCIgc28gdGhhdCB0aGUgc2VxdWVuY2UgXCJUUy05OVwiIGNhbiBiZSBhc3N1bWVkIHRvXG4gKiBjb3JyZXNwb25kIHdpdGggYW4gQW5ndWxhciBzcGVjaWZpYyBlcnJvciBjb2RlLiBUaGlzIGZ1bmN0aW9uIHJlcGxhY2VzIHRob3NlIG9jY3VycmVuY2VzIHdpdGhcbiAqIGp1c3QgXCJOR1wiLlxuICpcbiAqIEBwYXJhbSBlcnJvcnMgVGhlIGZvcm1hdHRlZCBkaWFnbm9zdGljc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVwbGFjZVRzV2l0aE5nSW5FcnJvcnMoZXJyb3JzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3JzLnJlcGxhY2UoRVJST1JfQ09ERV9NQVRDSEVSLCAnJDFORyQyJyk7XG59XG4iXX0=