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
        define("@angular/compiler-cli/src/ngtsc/transform/src/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0vc3JjL2FwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgU3RhdGVtZW50LCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWNvcmF0b3J9IGZyb20gJy4uLy4uL2hvc3QnO1xuXG4vKipcbiAqIFByb3ZpZGVzIHRoZSBpbnRlcmZhY2UgYmV0d2VlbiBhIGRlY29yYXRvciBjb21waWxlciBmcm9tIEBhbmd1bGFyL2NvbXBpbGVyIGFuZCB0aGUgVHlwZXNjcmlwdFxuICogY29tcGlsZXIvdHJhbnNmb3JtLlxuICpcbiAqIFRoZSBkZWNvcmF0b3IgY29tcGlsZXJzIGluIEBhbmd1bGFyL2NvbXBpbGVyIGRvIG5vdCBkZXBlbmQgb24gVHlwZXNjcmlwdC4gVGhlIGhhbmRsZXIgaXNcbiAqIHJlc3BvbnNpYmxlIGZvciBleHRyYWN0aW5nIHRoZSBpbmZvcm1hdGlvbiByZXF1aXJlZCB0byBwZXJmb3JtIGNvbXBpbGF0aW9uIGZyb20gdGhlIGRlY29yYXRvcnNcbiAqIGFuZCBUeXBlc2NyaXB0IHNvdXJjZSwgaW52b2tpbmcgdGhlIGRlY29yYXRvciBjb21waWxlciwgYW5kIHJldHVybmluZyB0aGUgcmVzdWx0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlY29yYXRvckhhbmRsZXI8QT4ge1xuICAvKipcbiAgICogU2NhbiBhIHNldCBvZiByZWZsZWN0ZWQgZGVjb3JhdG9ycyBhbmQgZGV0ZXJtaW5lIGlmIHRoaXMgaGFuZGxlciBpcyByZXNwb25zaWJsZSBmb3IgY29tcGlsYXRpb25cbiAgICogb2Ygb25lIG9mIHRoZW0uXG4gICAqL1xuICBkZXRlY3QoZGVjb3JhdG9yOiBEZWNvcmF0b3JbXSk6IERlY29yYXRvcnx1bmRlZmluZWQ7XG5cblxuICAvKipcbiAgICogQXN5bmNocm9ub3VzbHkgcGVyZm9ybSBwcmUtYW5hbHlzaXMgb24gdGhlIGRlY29yYXRvci9jbGFzcyBjb21iaW5hdGlvbi5cbiAgICpcbiAgICogYHByZUFuYWx5emVgIGlzIG9wdGlvbmFsIGFuZCBpcyBub3QgZ3VhcmFudGVlZCB0byBiZSBjYWxsZWQgdGhyb3VnaCBhbGwgY29tcGlsYXRpb24gZmxvd3MuIEl0XG4gICAqIHdpbGwgb25seSBiZSBjYWxsZWQgaWYgYXN5bmNocm9uaWNpdHkgaXMgc3VwcG9ydGVkIGluIHRoZSBDb21waWxlckhvc3QuXG4gICAqL1xuICBwcmVhbmFseXplPyhub2RlOiB0cy5EZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogUGVyZm9ybSBhbmFseXNpcyBvbiB0aGUgZGVjb3JhdG9yL2NsYXNzIGNvbWJpbmF0aW9uLCBwcm9kdWNpbmcgaW5zdHJ1Y3Rpb25zIGZvciBjb21waWxhdGlvblxuICAgKiBpZiBzdWNjZXNzZnVsLCBvciBhbiBhcnJheSBvZiBkaWFnbm9zdGljIG1lc3NhZ2VzIGlmIHRoZSBhbmFseXNpcyBmYWlscyBvciB0aGUgZGVjb3JhdG9yXG4gICAqIGlzbid0IHZhbGlkLlxuICAgKi9cbiAgYW5hbHl6ZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxBPjtcblxuICAvKipcbiAgICogR2VuZXJhdGUgYSBkZXNjcmlwdGlvbiBvZiB0aGUgZmllbGQgd2hpY2ggc2hvdWxkIGJlIGFkZGVkIHRvIHRoZSBjbGFzcywgaW5jbHVkaW5nIGFueVxuICAgKiBpbml0aWFsaXphdGlvbiBjb2RlIHRvIGJlIGdlbmVyYXRlZC5cbiAgICovXG4gIGNvbXBpbGUobm9kZTogdHMuRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBBKTogQ29tcGlsZVJlc3VsdHxDb21waWxlUmVzdWx0W107XG59XG5cbi8qKlxuICogVGhlIG91dHB1dCBvZiBhbiBhbmFseXNpcyBvcGVyYXRpb24sIGNvbnNpc3Rpbmcgb2YgcG9zc2libHkgYW4gYXJiaXRyYXJ5IGFuYWx5c2lzIG9iamVjdCAodXNlZCBhc1xuICogdGhlIGlucHV0IHRvIGNvZGUgZ2VuZXJhdGlvbikgYW5kIHBvdGVudGlhbGx5IGRpYWdub3N0aWNzIGlmIHRoZXJlIHdlcmUgZXJyb3JzIHVuY292ZXJlZCBkdXJpbmdcbiAqIGFuYWx5c2lzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5c2lzT3V0cHV0PEE+IHtcbiAgYW5hbHlzaXM/OiBBO1xuICBkaWFnbm9zdGljcz86IHRzLkRpYWdub3N0aWNbXTtcbn1cblxuLyoqXG4gKiBBIGRlc2NyaXB0aW9uIG9mIHRoZSBzdGF0aWMgZmllbGQgdG8gYWRkIHRvIGEgY2xhc3MsIGluY2x1ZGluZyBhbiBpbml0aWFsaXphdGlvbiBleHByZXNzaW9uXG4gKiBhbmQgYSB0eXBlIGZvciB0aGUgLmQudHMgZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxlUmVzdWx0IHtcbiAgbmFtZTogc3RyaW5nO1xuICBpbml0aWFsaXplcjogRXhwcmVzc2lvbjtcbiAgc3RhdGVtZW50czogU3RhdGVtZW50W107XG4gIHR5cGU6IFR5cGU7XG59XG4iXX0=