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
        define("@angular/compiler-cli/src/ngtsc/indexer/src/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Describes the kind of identifier found in a template.
     */
    var IdentifierKind;
    (function (IdentifierKind) {
    })(IdentifierKind = exports.IdentifierKind || (exports.IdentifierKind = {}));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmRleGVyL3NyYy9hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFLSDs7T0FFRztJQUNILElBQVksY0FDWDtJQURELFdBQVksY0FBYztJQUMxQixDQUFDLEVBRFcsY0FBYyxHQUFkLHNCQUFjLEtBQWQsc0JBQWMsUUFDekIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UGFyc2VTb3VyY2VGaWxlLCBQYXJzZVNwYW59IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIERlc2NyaWJlcyB0aGUga2luZCBvZiBpZGVudGlmaWVyIGZvdW5kIGluIGEgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBlbnVtIElkZW50aWZpZXJLaW5kIHtcbn1cblxuLyoqXG4gKiBEZXNjcmliZXMgYSBzZW1hbnRpY2FsbHktaW50ZXJlc3RpbmcgaWRlbnRpZmllciBpbiBhIHRlbXBsYXRlLCBzdWNoIGFzIGFuIGludGVycG9sYXRlZCB2YXJpYWJsZVxuICogb3Igc2VsZWN0b3IuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVJZGVudGlmaWVyIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzcGFuOiBQYXJzZVNwYW47XG4gIGtpbmQ6IElkZW50aWZpZXJLaW5kO1xuICBmaWxlOiBQYXJzZVNvdXJjZUZpbGU7XG59XG5cbi8qKlxuICogRGVzY3JpYmVzIGFuIGFuYWx5emVkLCBpbmRleGVkIGNvbXBvbmVudCBhbmQgaXRzIHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4ZWRDb21wb25lbnQge1xuICBuYW1lOiBzdHJpbmc7XG4gIHNlbGVjdG9yOiBzdHJpbmd8bnVsbDtcbiAgc291cmNlRmlsZTogc3RyaW5nO1xuICBjb250ZW50OiBzdHJpbmc7XG4gIHRlbXBsYXRlOiB7XG4gICAgaWRlbnRpZmllcnM6IFNldDxUZW1wbGF0ZUlkZW50aWZpZXI+LFxuICAgIHVzZWRDb21wb25lbnRzOiBTZXQ8dHMuQ2xhc3NEZWNsYXJhdGlvbj4sXG4gIH07XG59XG4iXX0=