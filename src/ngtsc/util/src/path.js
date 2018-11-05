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
        define("@angular/compiler-cli/src/ngtsc/util/src/path", ["require", "exports", "canonical-path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /// <reference types="node" />
    var path = require("canonical-path");
    var TS_DTS_EXTENSION = /(\.d)?\.ts$/;
    function relativePathBetween(from, to) {
        var relative = path.relative(path.dirname(from), to).replace(TS_DTS_EXTENSION, '');
        if (relative === '') {
            return null;
        }
        // path.relative() does not include the leading './'.
        if (!relative.startsWith('.')) {
            relative = "./" + relative;
        }
        return relative;
    }
    exports.relativePathBetween = relativePathBetween;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdXRpbC9zcmMvcGF0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILDhCQUE4QjtJQUU5QixxQ0FBdUM7SUFFdkMsSUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUM7SUFFdkMsU0FBZ0IsbUJBQW1CLENBQUMsSUFBWSxFQUFFLEVBQVU7UUFDMUQsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVuRixJQUFJLFFBQVEsS0FBSyxFQUFFLEVBQUU7WUFDbkIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM3QixRQUFRLEdBQUcsT0FBSyxRQUFVLENBQUM7U0FDNUI7UUFFRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBYkQsa0RBYUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuXG5jb25zdCBUU19EVFNfRVhURU5TSU9OID0gLyhcXC5kKT9cXC50cyQvO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmVQYXRoQmV0d2Vlbihmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gIGxldCByZWxhdGl2ZSA9IHBhdGgucmVsYXRpdmUocGF0aC5kaXJuYW1lKGZyb20pLCB0bykucmVwbGFjZShUU19EVFNfRVhURU5TSU9OLCAnJyk7XG5cbiAgaWYgKHJlbGF0aXZlID09PSAnJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gcGF0aC5yZWxhdGl2ZSgpIGRvZXMgbm90IGluY2x1ZGUgdGhlIGxlYWRpbmcgJy4vJy5cbiAgaWYgKCFyZWxhdGl2ZS5zdGFydHNXaXRoKCcuJykpIHtcbiAgICByZWxhdGl2ZSA9IGAuLyR7cmVsYXRpdmV9YDtcbiAgfVxuXG4gIHJldHVybiByZWxhdGl2ZTtcbn1cbiJdfQ==