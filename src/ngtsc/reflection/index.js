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
        define("@angular/compiler-cli/src/ngtsc/reflection", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/reflection/src/host", "@angular/compiler-cli/src/ngtsc/reflection/src/type_to_value", "@angular/compiler-cli/src/ngtsc/reflection/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/reflection/src/host"), exports);
    var type_to_value_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/type_to_value");
    exports.typeNodeToValueExpr = type_to_value_1.typeNodeToValueExpr;
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/reflection/src/typescript");
    exports.TypeScriptReflectionHost = typescript_1.TypeScriptReflectionHost;
    exports.filterToMembersWithDecorator = typescript_1.filterToMembersWithDecorator;
    exports.reflectIdentifierOfDeclaration = typescript_1.reflectIdentifierOfDeclaration;
    exports.reflectNameOfDeclaration = typescript_1.reflectNameOfDeclaration;
    exports.reflectObjectLiteral = typescript_1.reflectObjectLiteral;
    exports.reflectTypeEntityToDeclaration = typescript_1.reflectTypeEntityToDeclaration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3JlZmxlY3Rpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOEZBQTJCO0lBQzNCLDhGQUF3RDtJQUFoRCw4Q0FBQSxtQkFBbUIsQ0FBQTtJQUMzQix3RkFBd007SUFBaE0sZ0RBQUEsd0JBQXdCLENBQUE7SUFBRSxvREFBQSw0QkFBNEIsQ0FBQTtJQUFFLHNEQUFBLDhCQUE4QixDQUFBO0lBQUUsZ0RBQUEsd0JBQXdCLENBQUE7SUFBRSw0Q0FBQSxvQkFBb0IsQ0FBQTtJQUFFLHNEQUFBLDhCQUE4QixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQgKiBmcm9tICcuL3NyYy9ob3N0JztcbmV4cG9ydCB7dHlwZU5vZGVUb1ZhbHVlRXhwcn0gZnJvbSAnLi9zcmMvdHlwZV90b192YWx1ZSc7XG5leHBvcnQge1R5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCwgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvciwgcmVmbGVjdElkZW50aWZpZXJPZkRlY2xhcmF0aW9uLCByZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24sIHJlZmxlY3RPYmplY3RMaXRlcmFsLCByZWZsZWN0VHlwZUVudGl0eVRvRGVjbGFyYXRpb259IGZyb20gJy4vc3JjL3R5cGVzY3JpcHQnOyJdfQ==