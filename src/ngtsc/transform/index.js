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
        define("@angular/compiler-cli/src/ngtsc/transform", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/transform/src/api", "@angular/compiler-cli/src/ngtsc/transform/src/compilation", "@angular/compiler-cli/src/ngtsc/transform/src/declaration", "@angular/compiler-cli/src/ngtsc/transform/src/transform"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/transform/src/api"), exports);
    var compilation_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/compilation");
    exports.TraitCompiler = compilation_1.TraitCompiler;
    var declaration_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/declaration");
    exports.declarationTransformFactory = declaration_1.declarationTransformFactory;
    exports.DtsTransformRegistry = declaration_1.DtsTransformRegistry;
    exports.IvyDeclarationDtsTransform = declaration_1.IvyDeclarationDtsTransform;
    exports.ReturnTypeTransform = declaration_1.ReturnTypeTransform;
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/transform");
    exports.ivyTransformFactory = transform_1.ivyTransformFactory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw0RkFBMEI7SUFDMUIseUZBQTZEO0lBQXhDLHNDQUFBLGFBQWEsQ0FBQTtJQUNsQyx5RkFBcUk7SUFBN0gsb0RBQUEsMkJBQTJCLENBQUE7SUFBRSw2Q0FBQSxvQkFBb0IsQ0FBQTtJQUFFLG1EQUFBLDBCQUEwQixDQUFBO0lBQUUsNENBQUEsbUJBQW1CLENBQUE7SUFDMUcscUZBQW9EO0lBQTVDLDBDQUFBLG1CQUFtQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQgKiBmcm9tICcuL3NyYy9hcGknO1xuZXhwb3J0IHtDbGFzc1JlY29yZCwgVHJhaXRDb21waWxlcn0gZnJvbSAnLi9zcmMvY29tcGlsYXRpb24nO1xuZXhwb3J0IHtkZWNsYXJhdGlvblRyYW5zZm9ybUZhY3RvcnksIER0c1RyYW5zZm9ybVJlZ2lzdHJ5LCBJdnlEZWNsYXJhdGlvbkR0c1RyYW5zZm9ybSwgUmV0dXJuVHlwZVRyYW5zZm9ybX0gZnJvbSAnLi9zcmMvZGVjbGFyYXRpb24nO1xuZXhwb3J0IHtpdnlUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL3NyYy90cmFuc2Zvcm0nO1xuIl19