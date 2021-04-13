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
        define("@angular/compiler-cli/linker/src/file_linker/linker_options", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_LINKER_OPTIONS = void 0;
    /**
     * The default linker options to use if properties are not provided.
     */
    exports.DEFAULT_LINKER_OPTIONS = {
        sourceMapping: true,
        linkerJitMode: false,
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyX29wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9saW5rZXJfb3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFxQkg7O09BRUc7SUFDVSxRQUFBLHNCQUFzQixHQUFrQjtRQUNuRCxhQUFhLEVBQUUsSUFBSTtRQUNuQixhQUFhLEVBQUUsS0FBSztLQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8qKlxuICogT3B0aW9ucyB0byBjb25maWd1cmUgdGhlIGxpbmtpbmcgYmVoYXZpb3IuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlua2VyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBzb3VyY2UtbWFwcGluZyB0byBjb21wdXRlIHRoZSBvcmlnaW5hbCBzb3VyY2UgZm9yIGV4dGVybmFsIHRlbXBsYXRlcy5cbiAgICogVGhlIGRlZmF1bHQgaXMgYHRydWVgLlxuICAgKi9cbiAgc291cmNlTWFwcGluZzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhpcyBvcHRpb24gdGVsbHMgdGhlIGxpbmtlciB0byBnZW5lcmF0ZSBpbmZvcm1hdGlvbiB1c2VkIGJ5IGEgZG93bnN0cmVhbSBKSVQgY29tcGlsZXIuXG4gICAqXG4gICAqIFNwZWNpZmljYWxseSwgaW4gSklUIG1vZGUsIE5nTW9kdWxlIGRlZmluaXRpb25zIG11c3QgZGVzY3JpYmUgdGhlIGBkZWNsYXJhdGlvbnNgLCBgaW1wb3J0c2AsXG4gICAqIGBleHBvcnRzYCwgZXRjLCB3aGljaCBhcmUgb3RoZXJ3aXNlIG5vdCBuZWVkZWQuXG4gICAqL1xuICBsaW5rZXJKaXRNb2RlOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGxpbmtlciBvcHRpb25zIHRvIHVzZSBpZiBwcm9wZXJ0aWVzIGFyZSBub3QgcHJvdmlkZWQuXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX0xJTktFUl9PUFRJT05TOiBMaW5rZXJPcHRpb25zID0ge1xuICBzb3VyY2VNYXBwaW5nOiB0cnVlLFxuICBsaW5rZXJKaXRNb2RlOiBmYWxzZSxcbn07XG4iXX0=