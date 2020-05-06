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
        define("@angular/compiler-cli/src/ngtsc/scope/src/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9zY29wZS9zcmMvYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBQaXBlTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuXG4vKipcbiAqIERhdGEgZm9yIG9uZSBvZiBhIGdpdmVuIE5nTW9kdWxlJ3Mgc2NvcGVzIChlaXRoZXIgY29tcGlsYXRpb24gc2NvcGUgb3IgZXhwb3J0IHNjb3BlcykuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2NvcGVEYXRhIHtcbiAgLyoqXG4gICAqIERpcmVjdGl2ZXMgaW4gdGhlIGV4cG9ydGVkIHNjb3BlIG9mIHRoZSBtb2R1bGUuXG4gICAqL1xuICBkaXJlY3RpdmVzOiBEaXJlY3RpdmVNZXRhW107XG5cbiAgLyoqXG4gICAqIFBpcGVzIGluIHRoZSBleHBvcnRlZCBzY29wZSBvZiB0aGUgbW9kdWxlLlxuICAgKi9cbiAgcGlwZXM6IFBpcGVNZXRhW107XG5cbiAgLyoqXG4gICAqIE5nTW9kdWxlcyB3aGljaCBjb250cmlidXRlZCB0byB0aGUgc2NvcGUgb2YgdGhlIG1vZHVsZS5cbiAgICovXG4gIG5nTW9kdWxlczogQ2xhc3NEZWNsYXJhdGlvbltdO1xufVxuXG4vKipcbiAqIEFuIGV4cG9ydCBzY29wZSBvZiBhbiBOZ01vZHVsZSwgY29udGFpbmluZyB0aGUgZGlyZWN0aXZlcy9waXBlcyBpdCBjb250cmlidXRlcyB0byBvdGhlciBOZ01vZHVsZXNcbiAqIHdoaWNoIGltcG9ydCBpdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHBvcnRTY29wZSB7XG4gIC8qKlxuICAgKiBUaGUgc2NvcGUgZXhwb3J0ZWQgYnkgYW4gTmdNb2R1bGUsIGFuZCBhdmFpbGFibGUgZm9yIGltcG9ydC5cbiAgICovXG4gIGV4cG9ydGVkOiBTY29wZURhdGE7XG59XG4iXX0=