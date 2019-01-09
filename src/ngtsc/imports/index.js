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
        define("@angular/compiler-cli/src/ngtsc/imports", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports/src/references", "@angular/compiler-cli/src/ngtsc/imports/src/resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var references_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/references");
    exports.AbsoluteReference = references_1.AbsoluteReference;
    exports.ImportMode = references_1.ImportMode;
    exports.NodeReference = references_1.NodeReference;
    exports.Reference = references_1.Reference;
    exports.ResolvedReference = references_1.ResolvedReference;
    var resolver_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/resolver");
    exports.TsReferenceResolver = resolver_1.TsReferenceResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4vLi4vLi4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCxxRkFBNEc7SUFBcEcseUNBQUEsaUJBQWlCLENBQUE7SUFBRSxrQ0FBQSxVQUFVLENBQUE7SUFBRSxxQ0FBQSxhQUFhLENBQUE7SUFBRSxpQ0FBQSxTQUFTLENBQUE7SUFBRSx5Q0FBQSxpQkFBaUIsQ0FBQTtJQUNsRixpRkFBc0U7SUFBM0MseUNBQUEsbUJBQW1CLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCB7QWJzb2x1dGVSZWZlcmVuY2UsIEltcG9ydE1vZGUsIE5vZGVSZWZlcmVuY2UsIFJlZmVyZW5jZSwgUmVzb2x2ZWRSZWZlcmVuY2V9IGZyb20gJy4vc3JjL3JlZmVyZW5jZXMnO1xuZXhwb3J0IHtSZWZlcmVuY2VSZXNvbHZlciwgVHNSZWZlcmVuY2VSZXNvbHZlcn0gZnJvbSAnLi9zcmMvcmVzb2x2ZXInO1xuIl19