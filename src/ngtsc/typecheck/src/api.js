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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6Ii4uLy4uLy4uLy4uLy4uLyIsInNvdXJjZXMiOlsicGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2FwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Qm91bmRUYXJnZXQsIERpcmVjdGl2ZU1ldGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuXG4vKipcbiAqIEV4dGVuc2lvbiBvZiBgRGlyZWN0aXZlTWV0YWAgdGhhdCBpbmNsdWRlcyBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIHJlcXVpcmVkIHRvIHR5cGUtY2hlY2sgdGhlXG4gKiB1c2FnZSBvZiBhIHBhcnRpY3VsYXIgZGlyZWN0aXZlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhIGV4dGVuZHMgRGlyZWN0aXZlTWV0YSB7XG4gIHJlZjogUmVmZXJlbmNlPHRzLkNsYXNzRGVjbGFyYXRpb24+O1xuICBxdWVyaWVzOiBzdHJpbmdbXTtcbiAgbmdUZW1wbGF0ZUd1YXJkczogc3RyaW5nW107XG4gIGhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQ6IGJvb2xlYW47XG59XG5cbi8qKlxuICogTWV0YWRhdGEgcmVxdWlyZWQgaW4gYWRkaXRpb24gdG8gYSBjb21wb25lbnQgY2xhc3MgaW4gb3JkZXIgdG8gZ2VuZXJhdGUgYSB0eXBlIGNoZWNrIGJsb2NrIChUQ0IpXG4gKiBmb3IgdGhhdCBjb21wb25lbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSB7XG4gIC8qKlxuICAgKiBTZW1hbnRpYyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdGVtcGxhdGUgb2YgdGhlIGNvbXBvbmVudC5cbiAgICovXG4gIGJvdW5kVGFyZ2V0OiBCb3VuZFRhcmdldDxUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YT47XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSByZXF1ZXN0ZWQgdHlwZSBjaGVjayBibG9jayBmdW5jdGlvbi5cbiAgICovXG4gIGZuTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVDdG9yTWV0YWRhdGEge1xuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIHJlcXVlc3RlZCB0eXBlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgKi9cbiAgZm5OYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZ2VuZXJhdGUgYSBib2R5IGZvciB0aGUgZnVuY3Rpb24gb3Igbm90LlxuICAgKi9cbiAgYm9keTogYm9vbGVhbjtcblxuICAvKipcbiAgICogSW5wdXQsIG91dHB1dCwgYW5kIHF1ZXJ5IGZpZWxkIG5hbWVzIGluIHRoZSB0eXBlIHdoaWNoIHNob3VsZCBiZSBpbmNsdWRlZCBhcyBjb25zdHJ1Y3RvciBpbnB1dC5cbiAgICovXG4gIGZpZWxkczoge2lucHV0czogc3RyaW5nW107IG91dHB1dHM6IHN0cmluZ1tdOyBxdWVyaWVzOiBzdHJpbmdbXTt9O1xufVxuIl19