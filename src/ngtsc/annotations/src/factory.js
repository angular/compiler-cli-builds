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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/factory", ["require", "exports", "@angular/compiler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    function compileNgFactoryDefField(metadata) {
        var res = compiler_1.compileFactoryFromMetadata(metadata);
        return { name: 'ɵfac', initializer: res.factory, statements: res.statements, type: res.type };
    }
    exports.compileNgFactoryDefField = compileNgFactoryDefField;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2ZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBbUY7SUFJbkYsU0FBZ0Isd0JBQXdCLENBQUMsUUFBOEI7UUFDckUsSUFBTSxHQUFHLEdBQUcscUNBQTBCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsT0FBTyxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUMsQ0FBQztJQUM5RixDQUFDO0lBSEQsNERBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UjNGYWN0b3J5RGVmTWV0YWRhdGEsIGNvbXBpbGVGYWN0b3J5RnJvbU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5cbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZChtZXRhZGF0YTogUjNGYWN0b3J5RGVmTWV0YWRhdGEpOiBDb21waWxlUmVzdWx0IHtcbiAgY29uc3QgcmVzID0gY29tcGlsZUZhY3RvcnlGcm9tTWV0YWRhdGEobWV0YWRhdGEpO1xuICByZXR1cm4ge25hbWU6ICfJtWZhYycsIGluaXRpYWxpemVyOiByZXMuZmFjdG9yeSwgc3RhdGVtZW50czogcmVzLnN0YXRlbWVudHMsIHR5cGU6IHJlcy50eXBlfTtcbn1cbiJdfQ==