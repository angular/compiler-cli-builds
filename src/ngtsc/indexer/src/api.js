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
        IdentifierKind[IdentifierKind["Property"] = 0] = "Property";
        IdentifierKind[IdentifierKind["Method"] = 1] = "Method";
        IdentifierKind[IdentifierKind["Element"] = 2] = "Element";
        IdentifierKind[IdentifierKind["Attribute"] = 3] = "Attribute";
    })(IdentifierKind = exports.IdentifierKind || (exports.IdentifierKind = {}));
    /**
     * Describes the absolute byte offsets of a text anchor in a source code.
     */
    var AbsoluteSourceSpan = /** @class */ (function () {
        function AbsoluteSourceSpan(start, end) {
            this.start = start;
            this.end = end;
        }
        return AbsoluteSourceSpan;
    }());
    exports.AbsoluteSourceSpan = AbsoluteSourceSpan;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmRleGVyL3NyYy9hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFNSDs7T0FFRztJQUNILElBQVksY0FLWDtJQUxELFdBQVksY0FBYztRQUN4QiwyREFBUSxDQUFBO1FBQ1IsdURBQU0sQ0FBQTtRQUNOLHlEQUFPLENBQUE7UUFDUCw2REFBUyxDQUFBO0lBQ1gsQ0FBQyxFQUxXLGNBQWMsR0FBZCxzQkFBYyxLQUFkLHNCQUFjLFFBS3pCO0lBK0NEOztPQUVHO0lBQ0g7UUFDRSw0QkFBbUIsS0FBYSxFQUFTLEdBQVc7WUFBakMsVUFBSyxHQUFMLEtBQUssQ0FBUTtZQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBRyxDQUFDO1FBQzFELHlCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UGFyc2VTb3VyY2VGaWxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbi8qKlxuICogRGVzY3JpYmVzIHRoZSBraW5kIG9mIGlkZW50aWZpZXIgZm91bmQgaW4gYSB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGVudW0gSWRlbnRpZmllcktpbmQge1xuICBQcm9wZXJ0eSxcbiAgTWV0aG9kLFxuICBFbGVtZW50LFxuICBBdHRyaWJ1dGUsXG59XG5cbi8qKlxuICogRGVzY3JpYmVzIGEgc2VtYW50aWNhbGx5LWludGVyZXN0aW5nIGlkZW50aWZpZXIgaW4gYSB0ZW1wbGF0ZSwgc3VjaCBhcyBhbiBpbnRlcnBvbGF0ZWQgdmFyaWFibGVcbiAqIG9yIHNlbGVjdG9yLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlSWRlbnRpZmllciB7XG4gIG5hbWU6IHN0cmluZztcbiAgc3BhbjogQWJzb2x1dGVTb3VyY2VTcGFuO1xuICBraW5kOiBJZGVudGlmaWVyS2luZDtcbn1cblxuLyoqIERlc2NyaWJlcyBhIHByb3BlcnR5IGFjY2Vzc2VkIGluIGEgdGVtcGxhdGUuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb3BlcnR5SWRlbnRpZmllciBleHRlbmRzIFRlbXBsYXRlSWRlbnRpZmllciB7IGtpbmQ6IElkZW50aWZpZXJLaW5kLlByb3BlcnR5OyB9XG5cbi8qKiBEZXNjcmliZXMgYSBtZXRob2QgYWNjZXNzZWQgaW4gYSB0ZW1wbGF0ZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWV0aG9kSWRlbnRpZmllciBleHRlbmRzIFRlbXBsYXRlSWRlbnRpZmllciB7IGtpbmQ6IElkZW50aWZpZXJLaW5kLk1ldGhvZDsgfVxuXG4vKiogRGVzY3JpYmVzIGFuIGVsZW1lbnQgYXR0cmlidXRlIGluIGEgdGVtcGxhdGUuICovXG5leHBvcnQgaW50ZXJmYWNlIEF0dHJpYnV0ZUlkZW50aWZpZXIgZXh0ZW5kcyBUZW1wbGF0ZUlkZW50aWZpZXIgeyBraW5kOiBJZGVudGlmaWVyS2luZC5BdHRyaWJ1dGU7IH1cblxuLyoqIEEgcmVmZXJlbmNlIHRvIGEgZGlyZWN0aXZlIG5vZGUgYW5kIGl0cyBzZWxlY3Rvci4gKi9cbmludGVyZmFjZSBEaXJlY3RpdmVSZWZlcmVuY2Uge1xuICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uO1xuICBzZWxlY3Rvcjogc3RyaW5nO1xufVxuLyoqXG4gKiBEZXNjcmliZXMgYW4gaW5kZXhlZCBlbGVtZW50IGluIGEgdGVtcGxhdGUuIFRoZSBuYW1lIG9mIGFuIGBFbGVtZW50SWRlbnRpZmllcmAgaXMgdGhlIGVudGlyZVxuICogZWxlbWVudCB0YWcsIHdoaWNoIGNhbiBiZSBwYXJzZWQgYnkgYW4gaW5kZXhlciB0byBkZXRlcm1pbmUgd2hlcmUgdXNlZCBkaXJlY3RpdmVzIHNob3VsZCBiZVxuICogcmVmZXJlbmNlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbGVtZW50SWRlbnRpZmllciBleHRlbmRzIFRlbXBsYXRlSWRlbnRpZmllciB7XG4gIGtpbmQ6IElkZW50aWZpZXJLaW5kLkVsZW1lbnQ7XG5cbiAgLyoqIEF0dHJpYnV0ZXMgb24gYW4gZWxlbWVudC4gKi9cbiAgYXR0cmlidXRlczogU2V0PEF0dHJpYnV0ZUlkZW50aWZpZXI+O1xuXG4gIC8qKiBEaXJlY3RpdmVzIGFwcGxpZWQgdG8gYW4gZWxlbWVudC4gKi9cbiAgdXNlZERpcmVjdGl2ZXM6IFNldDxEaXJlY3RpdmVSZWZlcmVuY2U+O1xufVxuXG4vKipcbiAqIElkZW50aWZpZXJzIHJlY29yZGVkIGF0IHRoZSB0b3AgbGV2ZWwgb2YgdGhlIHRlbXBsYXRlLCB3aXRob3V0IGFueSBjb250ZXh0IGFib3V0IHRoZSBIVE1MIG5vZGVzXG4gKiB0aGV5IHdlcmUgZGlzY292ZXJlZCBpbi5cbiAqL1xuZXhwb3J0IHR5cGUgVG9wTGV2ZWxJZGVudGlmaWVyID0gUHJvcGVydHlJZGVudGlmaWVyIHwgTWV0aG9kSWRlbnRpZmllciB8IEVsZW1lbnRJZGVudGlmaWVyO1xuXG4vKipcbiAqIERlc2NyaWJlcyB0aGUgYWJzb2x1dGUgYnl0ZSBvZmZzZXRzIG9mIGEgdGV4dCBhbmNob3IgaW4gYSBzb3VyY2UgY29kZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEFic29sdXRlU291cmNlU3BhbiB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBzdGFydDogbnVtYmVyLCBwdWJsaWMgZW5kOiBudW1iZXIpIHt9XG59XG5cbi8qKlxuICogRGVzY3JpYmVzIGFuIGFuYWx5emVkLCBpbmRleGVkIGNvbXBvbmVudCBhbmQgaXRzIHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4ZWRDb21wb25lbnQge1xuICBuYW1lOiBzdHJpbmc7XG4gIHNlbGVjdG9yOiBzdHJpbmd8bnVsbDtcbiAgZmlsZTogUGFyc2VTb3VyY2VGaWxlO1xuICB0ZW1wbGF0ZToge1xuICAgIGlkZW50aWZpZXJzOiBTZXQ8VG9wTGV2ZWxJZGVudGlmaWVyPixcbiAgICB1c2VkQ29tcG9uZW50czogU2V0PHRzLkRlY2xhcmF0aW9uPixcbiAgICBpc0lubGluZTogYm9vbGVhbixcbiAgICBmaWxlOiBQYXJzZVNvdXJjZUZpbGU7XG4gIH07XG59XG4iXX0=