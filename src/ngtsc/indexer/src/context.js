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
        define("@angular/compiler-cli/src/ngtsc/indexer/src/context", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Stores analysis information about components in a compilation for and provides methods for
     * querying information about components to be used in indexing.
     */
    var IndexingContext = /** @class */ (function () {
        function IndexingContext() {
        }
        return IndexingContext;
    }());
    exports.IndexingContext = IndexingContext;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW5kZXhlci9zcmMvY29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVIOzs7T0FHRztJQUNIO1FBQUE7UUFBOEIsQ0FBQztRQUFELHNCQUFDO0lBQUQsQ0FBQyxBQUEvQixJQUErQjtJQUFsQiwwQ0FBZSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLyoqXG4gKiBTdG9yZXMgYW5hbHlzaXMgaW5mb3JtYXRpb24gYWJvdXQgY29tcG9uZW50cyBpbiBhIGNvbXBpbGF0aW9uIGZvciBhbmQgcHJvdmlkZXMgbWV0aG9kcyBmb3JcbiAqIHF1ZXJ5aW5nIGluZm9ybWF0aW9uIGFib3V0IGNvbXBvbmVudHMgdG8gYmUgdXNlZCBpbiBpbmRleGluZy5cbiAqL1xuZXhwb3J0IGNsYXNzIEluZGV4aW5nQ29udGV4dCB7fVxuIl19