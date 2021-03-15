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
        enableI18nLegacyMessageIdFormat: true,
        i18nNormalizeLineEndingsInICUs: false,
        i18nUseExternalIds: false,
        sourceMapping: true,
        linkerJitMode: false,
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VyX29wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbGlua2VyL3NyYy9maWxlX2xpbmtlci9saW5rZXJfb3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUF1Q0g7O09BRUc7SUFDVSxRQUFBLHNCQUFzQixHQUFrQjtRQUNuRCwrQkFBK0IsRUFBRSxJQUFJO1FBQ3JDLDhCQUE4QixFQUFFLEtBQUs7UUFDckMsa0JBQWtCLEVBQUUsS0FBSztRQUN6QixhQUFhLEVBQUUsSUFBSTtRQUNuQixhQUFhLEVBQUUsS0FBSztLQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8qKlxuICogT3B0aW9ucyB0byBjb25maWd1cmUgdGhlIGxpbmtpbmcgYmVoYXZpb3IuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlua2VyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGdlbmVyYXRlIGxlZ2FjeSBpMThuIG1lc3NhZ2UgaWRzLlxuICAgKiBUaGUgZGVmYXVsdCBpcyBgdHJ1ZWAuXG4gICAqL1xuICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0OiBib29sZWFuO1xuICAvKipcbiAgICogV2hldGhlciB0byBjb252ZXJ0IGFsbCBsaW5lLWVuZGluZ3MgaW4gSUNVIGV4cHJlc3Npb25zIHRvIGBcXG5gIGNoYXJhY3RlcnMuXG4gICAqIFRoZSBkZWZhdWx0IGlzIGBmYWxzZWAuXG4gICAqL1xuICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdHJhbnNsYXRpb24gdmFyaWFibGUgbmFtZSBzaG91bGQgY29udGFpbiBleHRlcm5hbCBtZXNzYWdlIGlkXG4gICAqICh1c2VkIGJ5IENsb3N1cmUgQ29tcGlsZXIncyBvdXRwdXQgb2YgYGdvb2cuZ2V0TXNnYCBmb3IgdHJhbnNpdGlvbiBwZXJpb2QpXG4gICAqIFRoZSBkZWZhdWx0IGlzIGBmYWxzZWAuXG4gICAqL1xuICBpMThuVXNlRXh0ZXJuYWxJZHM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gdXNlIHNvdXJjZS1tYXBwaW5nIHRvIGNvbXB1dGUgdGhlIG9yaWdpbmFsIHNvdXJjZSBmb3IgZXh0ZXJuYWwgdGVtcGxhdGVzLlxuICAgKiBUaGUgZGVmYXVsdCBpcyBgdHJ1ZWAuXG4gICAqL1xuICBzb3VyY2VNYXBwaW5nOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGlzIG9wdGlvbiB0ZWxscyB0aGUgbGlua2VyIHRvIGdlbmVyYXRlIGluZm9ybWF0aW9uIHVzZWQgYnkgYSBkb3duc3RyZWFtIEpJVCBjb21waWxlci5cbiAgICpcbiAgICogU3BlY2lmaWNhbGx5LCBpbiBKSVQgbW9kZSwgTmdNb2R1bGUgZGVmaW5pdGlvbnMgbXVzdCBkZXNjcmliZSB0aGUgYGRlY2xhcmF0aW9uc2AsIGBpbXBvcnRzYCxcbiAgICogYGV4cG9ydHNgLCBldGMsIHdoaWNoIGFyZSBvdGhlcndpc2Ugbm90IG5lZWRlZC5cbiAgICovXG4gIGxpbmtlckppdE1vZGU6IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgbGlua2VyIG9wdGlvbnMgdG8gdXNlIGlmIHByb3BlcnRpZXMgYXJlIG5vdCBwcm92aWRlZC5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfTElOS0VSX09QVElPTlM6IExpbmtlck9wdGlvbnMgPSB7XG4gIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ6IHRydWUsXG4gIGkxOG5Ob3JtYWxpemVMaW5lRW5kaW5nc0luSUNVczogZmFsc2UsXG4gIGkxOG5Vc2VFeHRlcm5hbElkczogZmFsc2UsXG4gIHNvdXJjZU1hcHBpbmc6IHRydWUsXG4gIGxpbmtlckppdE1vZGU6IGZhbHNlLFxufTtcbiJdfQ==