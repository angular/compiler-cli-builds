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
    exports.compileNgFactoryDefField = void 0;
    var compiler_1 = require("@angular/compiler");
    function compileNgFactoryDefField(metadata) {
        var res = compiler_1.compileFactoryFunction(metadata);
        return { name: 'ɵfac', initializer: res.factory, statements: res.statements, type: res.type };
    }
    exports.compileNgFactoryDefField = compileNgFactoryDefField;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2ZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTRFO0lBSTVFLFNBQWdCLHdCQUF3QixDQUFDLFFBQTJCO1FBQ2xFLElBQU0sR0FBRyxHQUFHLGlDQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFDLENBQUM7SUFDOUYsQ0FBQztJQUhELDREQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbXBpbGVGYWN0b3J5RnVuY3Rpb24sIFIzRmFjdG9yeU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5cbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZChtZXRhZGF0YTogUjNGYWN0b3J5TWV0YWRhdGEpOiBDb21waWxlUmVzdWx0IHtcbiAgY29uc3QgcmVzID0gY29tcGlsZUZhY3RvcnlGdW5jdGlvbihtZXRhZGF0YSk7XG4gIHJldHVybiB7bmFtZTogJ8m1ZmFjJywgaW5pdGlhbGl6ZXI6IHJlcy5mYWN0b3J5LCBzdGF0ZW1lbnRzOiByZXMuc3RhdGVtZW50cywgdHlwZTogcmVzLnR5cGV9O1xufVxuIl19