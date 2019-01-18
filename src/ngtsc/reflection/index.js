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
        define("@angular/compiler-cli/src/ngtsc/reflection", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/reflection/src/host", "@angular/compiler-cli/src/ngtsc/reflection/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/reflection/src/host"), exports);
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/typescript");
    exports.TypeScriptReflectionHost = typescript_1.TypeScriptReflectionHost;
    exports.filterToMembersWithDecorator = typescript_1.filterToMembersWithDecorator;
    exports.reflectIdentifierOfDeclaration = typescript_1.reflectIdentifierOfDeclaration;
    exports.reflectNameOfDeclaration = typescript_1.reflectNameOfDeclaration;
    exports.reflectObjectLiteral = typescript_1.reflectObjectLiteral;
    exports.reflectTypeEntityToDeclaration = typescript_1.reflectTypeEntityToDeclaration;
    exports.typeNodeToValueExpr = typescript_1.typeNodeToValueExpr;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3JlZmxlY3Rpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEZBQTJCO0lBQzNCLHdGQUE2TjtJQUFyTixnREFBQSx3QkFBd0IsQ0FBQTtJQUFFLG9EQUFBLDRCQUE0QixDQUFBO0lBQUUsc0RBQUEsOEJBQThCLENBQUE7SUFBRSxnREFBQSx3QkFBd0IsQ0FBQTtJQUFFLDRDQUFBLG9CQUFvQixDQUFBO0lBQUUsc0RBQUEsOEJBQThCLENBQUE7SUFBRSwyQ0FBQSxtQkFBbUIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0ICogZnJvbSAnLi9zcmMvaG9zdCc7XG5leHBvcnQge1R5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCwgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvciwgcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uLCByZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24sIHJlZmxlY3RPYmplY3RMaXRlcmFsLCByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb24sIHR5cGVOb2RlVG9WYWx1ZUV4cHJ9IGZyb20gJy4vc3JjL3R5cGVzY3JpcHQnOyJdfQ==