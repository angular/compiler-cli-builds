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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/factory", ["require", "exports", "@angular/compiler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.compileDeclareFactory = exports.compileNgFactoryDefField = void 0;
    var compiler_1 = require("@angular/compiler");
    function compileNgFactoryDefField(metadata) {
        var res = (0, compiler_1.compileFactoryFunction)(metadata);
        return { name: 'ɵfac', initializer: res.expression, statements: res.statements, type: res.type };
    }
    exports.compileNgFactoryDefField = compileNgFactoryDefField;
    function compileDeclareFactory(metadata) {
        var res = (0, compiler_1.compileDeclareFactoryFunction)(metadata);
        return { name: 'ɵfac', initializer: res.expression, statements: res.statements, type: res.type };
    }
    exports.compileDeclareFactory = compileDeclareFactory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2ZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTJHO0lBTTNHLFNBQWdCLHdCQUF3QixDQUFDLFFBQTJCO1FBQ2xFLElBQU0sR0FBRyxHQUFHLElBQUEsaUNBQXNCLEVBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0MsT0FBTyxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUMsQ0FBQztJQUNqRyxDQUFDO0lBSEQsNERBR0M7SUFFRCxTQUFnQixxQkFBcUIsQ0FBQyxRQUEyQjtRQUMvRCxJQUFNLEdBQUcsR0FBRyxJQUFBLHdDQUE2QixFQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFDLENBQUM7SUFDakcsQ0FBQztJQUhELHNEQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZURlY2xhcmVGYWN0b3J5RnVuY3Rpb24sIGNvbXBpbGVGYWN0b3J5RnVuY3Rpb24sIFIzRmFjdG9yeU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5cbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuZXhwb3J0IHR5cGUgQ29tcGlsZUZhY3RvcnlGbiA9IChtZXRhZGF0YTogUjNGYWN0b3J5TWV0YWRhdGEpID0+IENvbXBpbGVSZXN1bHQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlTmdGYWN0b3J5RGVmRmllbGQobWV0YWRhdGE6IFIzRmFjdG9yeU1ldGFkYXRhKTogQ29tcGlsZVJlc3VsdCB7XG4gIGNvbnN0IHJlcyA9IGNvbXBpbGVGYWN0b3J5RnVuY3Rpb24obWV0YWRhdGEpO1xuICByZXR1cm4ge25hbWU6ICfJtWZhYycsIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbiwgc3RhdGVtZW50czogcmVzLnN0YXRlbWVudHMsIHR5cGU6IHJlcy50eXBlfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVEZWNsYXJlRmFjdG9yeShtZXRhZGF0YTogUjNGYWN0b3J5TWV0YWRhdGEpOiBDb21waWxlUmVzdWx0IHtcbiAgY29uc3QgcmVzID0gY29tcGlsZURlY2xhcmVGYWN0b3J5RnVuY3Rpb24obWV0YWRhdGEpO1xuICByZXR1cm4ge25hbWU6ICfJtWZhYycsIGluaXRpYWxpemVyOiByZXMuZXhwcmVzc2lvbiwgc3RhdGVtZW50czogcmVzLnN0YXRlbWVudHMsIHR5cGU6IHJlcy50eXBlfTtcbn1cbiJdfQ==