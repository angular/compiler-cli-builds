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
        define("@angular/compiler-cli/src/ngtsc/file_system/src/types", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtL3NyYy90eXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLyoqXG4gKiBBIGBzdHJpbmdgIHJlcHJlc2VudGluZyBhIHNwZWNpZmljIHR5cGUgb2YgcGF0aCwgd2l0aCBhIHBhcnRpY3VsYXIgYnJhbmQgYEJgLlxuICpcbiAqIEEgYHN0cmluZ2AgaXMgbm90IGFzc2lnbmFibGUgdG8gYSBgQnJhbmRlZFBhdGhgLCBidXQgYSBgQnJhbmRlZFBhdGhgIGlzIGFzc2lnbmFibGUgdG8gYSBgc3RyaW5nYC5cbiAqIFR3byBgQnJhbmRlZFBhdGhgcyB3aXRoIGRpZmZlcmVudCBicmFuZHMgYXJlIG5vdCBtdXR1YWxseSBhc3NpZ25hYmxlLlxuICovXG5leHBvcnQgdHlwZSBCcmFuZGVkUGF0aDxCIGV4dGVuZHMgc3RyaW5nPiA9IHN0cmluZyZ7XG4gIF9icmFuZDogQjtcbn07XG5cbi8qKlxuICogQSBmdWxseSBxdWFsaWZpZWQgcGF0aCBpbiB0aGUgZmlsZSBzeXN0ZW0sIGluIFBPU0lYIGZvcm0uXG4gKi9cbmV4cG9ydCB0eXBlIEFic29sdXRlRnNQYXRoID0gQnJhbmRlZFBhdGg8J0Fic29sdXRlRnNQYXRoJz47XG5cbi8qKlxuICogQSBwYXRoIHRoYXQncyByZWxhdGl2ZSB0byBhbm90aGVyICh1bnNwZWNpZmllZCkgcm9vdC5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IG5lY2Vzc2FyaWx5IGhhdmUgdG8gcmVmZXIgdG8gYSBwaHlzaWNhbCBmaWxlLlxuICovXG5leHBvcnQgdHlwZSBQYXRoU2VnbWVudCA9IEJyYW5kZWRQYXRoPCdQYXRoU2VnbWVudCc+O1xuXG4vKipcbiAqIEEgYmFzaWMgaW50ZXJmYWNlIHRvIGFic3RyYWN0IHRoZSB1bmRlcmx5aW5nIGZpbGUtc3lzdGVtLlxuICpcbiAqIFRoaXMgbWFrZXMgaXQgZWFzaWVyIHRvIHByb3ZpZGUgbW9jayBmaWxlLXN5c3RlbXMgaW4gdW5pdCB0ZXN0cyxcbiAqIGJ1dCBhbHNvIHRvIGNyZWF0ZSBjbGV2ZXIgZmlsZS1zeXN0ZW1zIHRoYXQgaGF2ZSBmZWF0dXJlcyBzdWNoIGFzIGNhY2hpbmcuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVN5c3RlbSB7XG4gIGV4aXN0cyhwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW47XG4gIHJlYWRGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoKTogc3RyaW5nO1xuICByZWFkRmlsZUJ1ZmZlcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFVpbnQ4QXJyYXk7XG4gIHdyaXRlRmlsZShwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGF0YTogc3RyaW5nfFVpbnQ4QXJyYXksIGV4Y2x1c2l2ZT86IGJvb2xlYW4pOiB2b2lkO1xuICByZW1vdmVGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZDtcbiAgc3ltbGluayh0YXJnZXQ6IEFic29sdXRlRnNQYXRoLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQ7XG4gIHJlYWRkaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBQYXRoU2VnbWVudFtdO1xuICBsc3RhdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVTdGF0cztcbiAgc3RhdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEZpbGVTdGF0cztcbiAgcHdkKCk6IEFic29sdXRlRnNQYXRoO1xuICBjaGRpcihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQ7XG4gIGV4dG5hbWUocGF0aDogQWJzb2x1dGVGc1BhdGh8UGF0aFNlZ21lbnQpOiBzdHJpbmc7XG4gIGNvcHlGaWxlKGZyb206IEFic29sdXRlRnNQYXRoLCB0bzogQWJzb2x1dGVGc1BhdGgpOiB2b2lkO1xuICBtb3ZlRmlsZShmcm9tOiBBYnNvbHV0ZUZzUGF0aCwgdG86IEFic29sdXRlRnNQYXRoKTogdm9pZDtcbiAgZW5zdXJlRGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogdm9pZDtcbiAgcmVtb3ZlRGVlcChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQ7XG4gIGlzQ2FzZVNlbnNpdGl2ZSgpOiBib29sZWFuO1xuICBpc1Jvb3QocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuO1xuICBpc1Jvb3RlZChwYXRoOiBzdHJpbmcpOiBib29sZWFuO1xuICByZXNvbHZlKC4uLnBhdGhzOiBzdHJpbmdbXSk6IEFic29sdXRlRnNQYXRoO1xuICBkaXJuYW1lPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihmaWxlOiBUKTogVDtcbiAgam9pbjxUIGV4dGVuZHMgUGF0aFN0cmluZz4oYmFzZVBhdGg6IFQsIC4uLnBhdGhzOiBzdHJpbmdbXSk6IFQ7XG4gIC8qKlxuICAgKiBDb21wdXRlIHRoZSByZWxhdGl2ZSBwYXRoIGJldHdlZW4gYGZyb21gIGFuZCBgdG9gLlxuICAgKlxuICAgKiBJbiBmaWxlLXN5c3RlbXMgdGhhdCBjYW4gaGF2ZSBtdWx0aXBsZSBmaWxlIHRyZWVzIHRoZSByZXR1cm5lZCBwYXRoIG1heSBub3QgYWN0dWFsbHkgYmVcbiAgICogXCJyZWxhdGl2ZVwiIChpLmUuIGBQYXRoU2VnbWVudGApLiBGb3IgZXhhbXBsZSwgV2luZG93cyBjYW4gaGF2ZSBtdWx0aXBsZSBkcml2ZXMgOlxuICAgKiBgcmVsYXRpdmUoJ2M6L2EvYicsICdkOi9hL2MnKWAgd291bGQgYmUgYGQ6L2EvYycuXG4gICAqL1xuICByZWxhdGl2ZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4oZnJvbTogVCwgdG86IFQpOiBQYXRoU2VnbWVudHxBYnNvbHV0ZUZzUGF0aDtcbiAgYmFzZW5hbWUoZmlsZVBhdGg6IHN0cmluZywgZXh0ZW5zaW9uPzogc3RyaW5nKTogUGF0aFNlZ21lbnQ7XG4gIHJlYWxwYXRoKGZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoO1xuICBnZXREZWZhdWx0TGliTG9jYXRpb24oKTogQWJzb2x1dGVGc1BhdGg7XG4gIG5vcm1hbGl6ZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4ocGF0aDogVCk6IFQ7XG59XG5cbmV4cG9ydCB0eXBlIFBhdGhTdHJpbmcgPSBzdHJpbmd8QWJzb2x1dGVGc1BhdGh8UGF0aFNlZ21lbnQ7XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYW4gb2JqZWN0IGluIHRoZSBGaWxlU3lzdGVtLlxuICogVGhpcyBpcyBhbmFsb2dvdXMgdG8gdGhlIGBmcy5TdGF0c2AgY2xhc3MgaW4gTm9kZS5qcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaWxlU3RhdHMge1xuICBpc0ZpbGUoKTogYm9vbGVhbjtcbiAgaXNEaXJlY3RvcnkoKTogYm9vbGVhbjtcbiAgaXNTeW1ib2xpY0xpbmsoKTogYm9vbGVhbjtcbn1cbiJdfQ==