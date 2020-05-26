(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/util/src/path", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.normalizeSeparators = exports.relativePathBetween = void 0;
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var TS_DTS_JS_EXTENSION = /(?:\.d)?\.ts$|\.js$/;
    function relativePathBetween(from, to) {
        var relativePath = file_system_1.relative(file_system_1.dirname(file_system_1.resolve(from)), file_system_1.resolve(to)).replace(TS_DTS_JS_EXTENSION, '');
        if (relativePath === '') {
            return null;
        }
        // path.relative() does not include the leading './'.
        if (!relativePath.startsWith('.')) {
            relativePath = "./" + relativePath;
        }
        return relativePath;
    }
    exports.relativePathBetween = relativePathBetween;
    function normalizeSeparators(path) {
        // TODO: normalize path only for OS that need it.
        return path.replace(/\\/g, '/');
    }
    exports.normalizeSeparators = normalizeSeparators;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdXRpbC9zcmMvcGF0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBNkQ7SUFFN0QsSUFBTSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQztJQUVsRCxTQUFnQixtQkFBbUIsQ0FBQyxJQUFZLEVBQUUsRUFBVTtRQUMxRCxJQUFJLFlBQVksR0FBRyxzQkFBUSxDQUFDLHFCQUFPLENBQUMscUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLHFCQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFbEcsSUFBSSxZQUFZLEtBQUssRUFBRSxFQUFFO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxxREFBcUQ7UUFDckQsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDakMsWUFBWSxHQUFHLE9BQUssWUFBYyxDQUFDO1NBQ3BDO1FBRUQsT0FBTyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQWJELGtEQWFDO0lBRUQsU0FBZ0IsbUJBQW1CLENBQUMsSUFBWTtRQUM5QyxpREFBaUQ7UUFDakQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBSEQsa0RBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2Rpcm5hbWUsIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5cbmNvbnN0IFRTX0RUU19KU19FWFRFTlNJT04gPSAvKD86XFwuZCk/XFwudHMkfFxcLmpzJC87XG5cbmV4cG9ydCBmdW5jdGlvbiByZWxhdGl2ZVBhdGhCZXR3ZWVuKGZyb206IHN0cmluZywgdG86IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgbGV0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKGRpcm5hbWUocmVzb2x2ZShmcm9tKSksIHJlc29sdmUodG8pKS5yZXBsYWNlKFRTX0RUU19KU19FWFRFTlNJT04sICcnKTtcblxuICBpZiAocmVsYXRpdmVQYXRoID09PSAnJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gcGF0aC5yZWxhdGl2ZSgpIGRvZXMgbm90IGluY2x1ZGUgdGhlIGxlYWRpbmcgJy4vJy5cbiAgaWYgKCFyZWxhdGl2ZVBhdGguc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgcmVsYXRpdmVQYXRoID0gYC4vJHtyZWxhdGl2ZVBhdGh9YDtcbiAgfVxuXG4gIHJldHVybiByZWxhdGl2ZVBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTZXBhcmF0b3JzKHBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIFRPRE86IG5vcm1hbGl6ZSBwYXRoIG9ubHkgZm9yIE9TIHRoYXQgbmVlZCBpdC5cbiAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuIl19