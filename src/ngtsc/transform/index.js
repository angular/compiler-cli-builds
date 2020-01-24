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
        define("@angular/compiler-cli/src/ngtsc/transform", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/transform/src/api", "@angular/compiler-cli/src/ngtsc/transform/src/compilation", "@angular/compiler-cli/src/ngtsc/transform/src/declaration", "@angular/compiler-cli/src/ngtsc/transform/src/trait", "@angular/compiler-cli/src/ngtsc/transform/src/transform"], factory);
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
    var trait_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/trait");
    exports.Trait = trait_1.Trait;
    exports.TraitState = trait_1.TraitState;
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/transform");
    exports.ivyTransformFactory = transform_1.ivyTransformFactory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw0RkFBMEI7SUFDMUIseUZBQTZEO0lBQXhDLHNDQUFBLGFBQWEsQ0FBQTtJQUNsQyx5RkFBcUk7SUFBN0gsb0RBQUEsMkJBQTJCLENBQUE7SUFBRSw2Q0FBQSxvQkFBb0IsQ0FBQTtJQUFFLG1EQUFBLDBCQUEwQixDQUFBO0lBQUUsNENBQUEsbUJBQW1CLENBQUE7SUFDMUcsNkVBQXNIO0lBQXRDLHdCQUFBLEtBQUssQ0FBQTtJQUFFLDZCQUFBLFVBQVUsQ0FBQTtJQUNqRyxxRkFBb0Q7SUFBNUMsMENBQUEsbUJBQW1CLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCAqIGZyb20gJy4vc3JjL2FwaSc7XG5leHBvcnQge0NsYXNzUmVjb3JkLCBUcmFpdENvbXBpbGVyfSBmcm9tICcuL3NyYy9jb21waWxhdGlvbic7XG5leHBvcnQge2RlY2xhcmF0aW9uVHJhbnNmb3JtRmFjdG9yeSwgRHRzVHJhbnNmb3JtUmVnaXN0cnksIEl2eURlY2xhcmF0aW9uRHRzVHJhbnNmb3JtLCBSZXR1cm5UeXBlVHJhbnNmb3JtfSBmcm9tICcuL3NyYy9kZWNsYXJhdGlvbic7XG5leHBvcnQge0FuYWx5emVkVHJhaXQsIEVycm9yZWRUcmFpdCwgUGVuZGluZ1RyYWl0LCBSZXNvbHZlZFRyYWl0LCBTa2lwcGVkVHJhaXQsIFRyYWl0LCBUcmFpdFN0YXRlfSBmcm9tICcuL3NyYy90cmFpdCc7XG5leHBvcnQge2l2eVRyYW5zZm9ybUZhY3Rvcnl9IGZyb20gJy4vc3JjL3RyYW5zZm9ybSc7XG4iXX0=