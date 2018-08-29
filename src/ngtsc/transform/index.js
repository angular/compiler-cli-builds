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
        define("@angular/compiler-cli/src/ngtsc/transform", ["require", "exports", "@angular/compiler-cli/src/ngtsc/transform/src/compilation", "@angular/compiler-cli/src/ngtsc/transform/src/declaration", "@angular/compiler-cli/src/ngtsc/transform/src/transform", "@angular/compiler-cli/src/ngtsc/transform/src/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compilation_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/compilation");
    exports.IvyCompilation = compilation_1.IvyCompilation;
    var declaration_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/declaration");
    exports.DtsFileTransformer = declaration_1.DtsFileTransformer;
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/transform");
    exports.ivyTransformFactory = transform_1.ivyTransformFactory;
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/translator");
    exports.ImportManager = translator_1.ImportManager;
    exports.translateStatement = translator_1.translateStatement;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUdILHlGQUFpRDtJQUF6Qyx1Q0FBQSxjQUFjLENBQUE7SUFDdEIseUZBQXFEO0lBQTdDLDJDQUFBLGtCQUFrQixDQUFBO0lBQzFCLHFGQUFvRDtJQUE1QywwQ0FBQSxtQkFBbUIsQ0FBQTtJQUMzQix1RkFBbUU7SUFBM0QscUNBQUEsYUFBYSxDQUFBO0lBQUUsMENBQUEsa0JBQWtCLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCAqIGZyb20gJy4vc3JjL2FwaSc7XG5leHBvcnQge0l2eUNvbXBpbGF0aW9ufSBmcm9tICcuL3NyYy9jb21waWxhdGlvbic7XG5leHBvcnQge0R0c0ZpbGVUcmFuc2Zvcm1lcn0gZnJvbSAnLi9zcmMvZGVjbGFyYXRpb24nO1xuZXhwb3J0IHtpdnlUcmFuc2Zvcm1GYWN0b3J5fSBmcm9tICcuL3NyYy90cmFuc2Zvcm0nO1xuZXhwb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVTdGF0ZW1lbnR9IGZyb20gJy4vc3JjL3RyYW5zbGF0b3InO1xuIl19