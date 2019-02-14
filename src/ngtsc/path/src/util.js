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
        define("@angular/compiler-cli/src/ngtsc/path/src/util", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //  TODO(alxhub): Unify this file with `util/src/path`.
    var TS_DTS_JS_EXTENSION = /(?:\.d)?\.ts$|\.js$/;
    /**
     * Convert Windows-style paths to POSIX paths.
     */
    function normalizeSeparators(path) {
        // TODO: normalize path only for OS that need it.
        return path.replace(/\\/g, '/');
    }
    exports.normalizeSeparators = normalizeSeparators;
    /**
     * Remove a .ts, .d.ts, or .js extension from a file name.
     */
    function stripExtension(path) {
        return path.replace(TS_DTS_JS_EXTENSION, '');
    }
    exports.stripExtension = stripExtension;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGF0aC9zcmMvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHVEQUF1RDtJQUV2RCxJQUFNLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDO0lBRWxEOztPQUVHO0lBQ0gsU0FBZ0IsbUJBQW1CLENBQUMsSUFBWTtRQUM5QyxpREFBaUQ7UUFDakQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBSEQsa0RBR0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLGNBQWMsQ0FBQyxJQUFZO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRkQsd0NBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vICBUT0RPKGFseGh1Yik6IFVuaWZ5IHRoaXMgZmlsZSB3aXRoIGB1dGlsL3NyYy9wYXRoYC5cblxuY29uc3QgVFNfRFRTX0pTX0VYVEVOU0lPTiA9IC8oPzpcXC5kKT9cXC50cyR8XFwuanMkLztcblxuLyoqXG4gKiBDb252ZXJ0IFdpbmRvd3Mtc3R5bGUgcGF0aHMgdG8gUE9TSVggcGF0aHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTZXBhcmF0b3JzKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIFRPRE86IG5vcm1hbGl6ZSBwYXRoIG9ubHkgZm9yIE9TIHRoYXQgbmVlZCBpdC5cbiAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuXG4vKipcbiAqIFJlbW92ZSBhIC50cywgLmQudHMsIG9yIC5qcyBleHRlbnNpb24gZnJvbSBhIGZpbGUgbmFtZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwRXh0ZW5zaW9uKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLnJlcGxhY2UoVFNfRFRTX0pTX0VYVEVOU0lPTiwgJycpO1xufVxuIl19