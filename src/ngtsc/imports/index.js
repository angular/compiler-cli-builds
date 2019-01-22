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
        define("@angular/compiler-cli/src/ngtsc/imports", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports/src/core", "@angular/compiler-cli/src/ngtsc/imports/src/references", "@angular/compiler-cli/src/ngtsc/imports/src/resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var core_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/core");
    exports.NoopImportRewriter = core_1.NoopImportRewriter;
    exports.R3SymbolsImportRewriter = core_1.R3SymbolsImportRewriter;
    exports.validateAndRewriteCoreSymbol = core_1.validateAndRewriteCoreSymbol;
    var references_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/references");
    exports.AbsoluteReference = references_1.AbsoluteReference;
    exports.ImportMode = references_1.ImportMode;
    exports.NodeReference = references_1.NodeReference;
    exports.Reference = references_1.Reference;
    exports.ResolvedReference = references_1.ResolvedReference;
    var resolver_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/resolver");
    exports.ModuleResolver = resolver_1.ModuleResolver;
    exports.TsReferenceResolver = resolver_1.TsReferenceResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCx5RUFBcUg7SUFBN0Ysb0NBQUEsa0JBQWtCLENBQUE7SUFBRSx5Q0FBQSx1QkFBdUIsQ0FBQTtJQUFFLDhDQUFBLDRCQUE0QixDQUFBO0lBQ2pHLHFGQUE0RztJQUFwRyx5Q0FBQSxpQkFBaUIsQ0FBQTtJQUFFLGtDQUFBLFVBQVUsQ0FBQTtJQUFFLHFDQUFBLGFBQWEsQ0FBQTtJQUFFLGlDQUFBLFNBQVMsQ0FBQTtJQUFFLHlDQUFBLGlCQUFpQixDQUFBO0lBQ2xGLGlGQUFzRjtJQUE5RSxvQ0FBQSxjQUFjLENBQUE7SUFBcUIseUNBQUEsbUJBQW1CLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCB7SW1wb3J0UmV3cml0ZXIsIE5vb3BJbXBvcnRSZXdyaXRlciwgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIsIHZhbGlkYXRlQW5kUmV3cml0ZUNvcmVTeW1ib2x9IGZyb20gJy4vc3JjL2NvcmUnO1xuZXhwb3J0IHtBYnNvbHV0ZVJlZmVyZW5jZSwgSW1wb3J0TW9kZSwgTm9kZVJlZmVyZW5jZSwgUmVmZXJlbmNlLCBSZXNvbHZlZFJlZmVyZW5jZX0gZnJvbSAnLi9zcmMvcmVmZXJlbmNlcyc7XG5leHBvcnQge01vZHVsZVJlc29sdmVyLCBSZWZlcmVuY2VSZXNvbHZlciwgVHNSZWZlcmVuY2VSZXNvbHZlcn0gZnJvbSAnLi9zcmMvcmVzb2x2ZXInO1xuIl19