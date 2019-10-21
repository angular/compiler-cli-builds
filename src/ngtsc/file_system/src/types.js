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
        define("@angular/compiler-cli/src/ngtsc/file_system/src/types", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtL3NyYy90eXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8qKlxuICogQSBgc3RyaW5nYCByZXByZXNlbnRpbmcgYSBzcGVjaWZpYyB0eXBlIG9mIHBhdGgsIHdpdGggYSBwYXJ0aWN1bGFyIGJyYW5kIGBCYC5cbiAqXG4gKiBBIGBzdHJpbmdgIGlzIG5vdCBhc3NpZ25hYmxlIHRvIGEgYEJyYW5kZWRQYXRoYCwgYnV0IGEgYEJyYW5kZWRQYXRoYCBpcyBhc3NpZ25hYmxlIHRvIGEgYHN0cmluZ2AuXG4gKiBUd28gYEJyYW5kZWRQYXRoYHMgd2l0aCBkaWZmZXJlbnQgYnJhbmRzIGFyZSBub3QgbXV0dWFsbHkgYXNzaWduYWJsZS5cbiAqL1xuZXhwb3J0IHR5cGUgQnJhbmRlZFBhdGg8QiBleHRlbmRzIHN0cmluZz4gPSBzdHJpbmcgJiB7XG4gIF9icmFuZDogQjtcbn07XG5cbi8qKlxuICogQSBmdWxseSBxdWFsaWZpZWQgcGF0aCBpbiB0aGUgZmlsZSBzeXN0ZW0sIGluIFBPU0lYIGZvcm0uXG4gKi9cbmV4cG9ydCB0eXBlIEFic29sdXRlRnNQYXRoID0gQnJhbmRlZFBhdGg8J0Fic29sdXRlRnNQYXRoJz47XG5cbi8qKlxuICogQSBwYXRoIHRoYXQncyByZWxhdGl2ZSB0byBhbm90aGVyICh1bnNwZWNpZmllZCkgcm9vdC5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IG5lY2Vzc2FyaWx5IGhhdmUgdG8gcmVmZXIgdG8gYSBwaHlzaWNhbCBmaWxlLlxuICovXG5leHBvcnQgdHlwZSBQYXRoU2VnbWVudCA9IEJyYW5kZWRQYXRoPCdQYXRoU2VnbWVudCc+O1xuXG4vKipcbiAqIEEgYmFzaWMgaW50ZXJmYWNlIHRvIGFic3RyYWN0IHRoZSB1bmRlcmx5aW5nIGZpbGUtc3lzdGVtLlxuICpcbiAqIFRoaXMgbWFrZXMgaXQgZWFzaWVyIHRvIHByb3ZpZGUgbW9jayBmaWxlLXN5c3RlbXMgaW4gdW5pdCB0ZXN0cyxcbiAqIGJ1dCBhbHNvIHRvIGNyZWF0ZSBjbGV2ZXIgZmlsZS1zeXN0ZW1zIHRoYXQgaGF2ZSBmZWF0dXJlcyBzdWNoIGFzIGNhY2hpbmcuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVN5c3RlbSB7XG4gIGV4aXN0cyhwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW47XG4gIHJlYWRGaWxlKHBhdGg6IEFic29sdXRlRnNQYXRoKTogc3RyaW5nO1xuICB3cml0ZUZpbGUocGF0aDogQWJzb2x1dGVGc1BhdGgsIGRhdGE6IHN0cmluZyk6IHZvaWQ7XG4gIHN5bWxpbmsodGFyZ2V0OiBBYnNvbHV0ZUZzUGF0aCwgcGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkO1xuICByZWFkZGlyKHBhdGg6IEFic29sdXRlRnNQYXRoKTogUGF0aFNlZ21lbnRbXTtcbiAgbHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHM7XG4gIHN0YXQocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBGaWxlU3RhdHM7XG4gIHB3ZCgpOiBBYnNvbHV0ZUZzUGF0aDtcbiAgZXh0bmFtZShwYXRoOiBBYnNvbHV0ZUZzUGF0aHxQYXRoU2VnbWVudCk6IHN0cmluZztcbiAgY29weUZpbGUoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCk6IHZvaWQ7XG4gIG1vdmVGaWxlKGZyb206IEFic29sdXRlRnNQYXRoLCB0bzogQWJzb2x1dGVGc1BhdGgpOiB2b2lkO1xuICBlbnN1cmVEaXIocGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkO1xuICBpc0Nhc2VTZW5zaXRpdmUoKTogYm9vbGVhbjtcbiAgaXNSb290KHBhdGg6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbjtcbiAgaXNSb290ZWQocGF0aDogc3RyaW5nKTogYm9vbGVhbjtcbiAgcmVzb2x2ZSguLi5wYXRoczogc3RyaW5nW10pOiBBYnNvbHV0ZUZzUGF0aDtcbiAgZGlybmFtZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4oZmlsZTogVCk6IFQ7XG4gIGpvaW48VCBleHRlbmRzIFBhdGhTdHJpbmc+KGJhc2VQYXRoOiBULCAuLi5wYXRoczogc3RyaW5nW10pOiBUO1xuICByZWxhdGl2ZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4oZnJvbTogVCwgdG86IFQpOiBQYXRoU2VnbWVudDtcbiAgYmFzZW5hbWUoZmlsZVBhdGg6IHN0cmluZywgZXh0ZW5zaW9uPzogc3RyaW5nKTogUGF0aFNlZ21lbnQ7XG4gIHJlYWxwYXRoKGZpbGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoO1xuICBnZXREZWZhdWx0TGliTG9jYXRpb24oKTogQWJzb2x1dGVGc1BhdGg7XG4gIG5vcm1hbGl6ZTxUIGV4dGVuZHMgUGF0aFN0cmluZz4ocGF0aDogVCk6IFQ7XG59XG5cbmV4cG9ydCB0eXBlIFBhdGhTdHJpbmcgPSBzdHJpbmcgfCBBYnNvbHV0ZUZzUGF0aCB8IFBhdGhTZWdtZW50O1xuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGFuIG9iamVjdCBpbiB0aGUgRmlsZVN5c3RlbS5cbiAqIFRoaXMgaXMgYW5hbG9nb3VzIHRvIHRoZSBgZnMuU3RhdHNgIGNsYXNzIGluIE5vZGUuanMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVN0YXRzIHtcbiAgaXNGaWxlKCk6IGJvb2xlYW47XG4gIGlzRGlyZWN0b3J5KCk6IGJvb2xlYW47XG4gIGlzU3ltYm9saWNMaW5rKCk6IGJvb2xlYW47XG59XG4iXX0=