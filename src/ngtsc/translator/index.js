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
        define("@angular/compiler-cli/src/ngtsc/translator", ["require", "exports", "@angular/compiler-cli/src/ngtsc/translator/src/import_manager", "@angular/compiler-cli/src/ngtsc/translator/src/type_translator", "@angular/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory", "@angular/compiler-cli/src/ngtsc/translator/src/typescript_translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.translateStatement = exports.translateExpression = exports.TypeScriptAstFactory = exports.attachComments = exports.translateType = exports.ImportManager = void 0;
    var import_manager_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/import_manager");
    Object.defineProperty(exports, "ImportManager", { enumerable: true, get: function () { return import_manager_1.ImportManager; } });
    var type_translator_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/type_translator");
    Object.defineProperty(exports, "translateType", { enumerable: true, get: function () { return type_translator_1.translateType; } });
    var typescript_ast_factory_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory");
    Object.defineProperty(exports, "attachComments", { enumerable: true, get: function () { return typescript_ast_factory_1.attachComments; } });
    Object.defineProperty(exports, "TypeScriptAstFactory", { enumerable: true, get: function () { return typescript_ast_factory_1.TypeScriptAstFactory; } });
    var typescript_translator_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/typescript_translator");
    Object.defineProperty(exports, "translateExpression", { enumerable: true, get: function () { return typescript_translator_1.translateExpression; } });
    Object.defineProperty(exports, "translateStatement", { enumerable: true, get: function () { return typescript_translator_1.translateStatement; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zbGF0b3IvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUgsZ0dBQW1EO0lBQTNDLCtHQUFBLGFBQWEsT0FBQTtJQUVyQixrR0FBb0Q7SUFBNUMsZ0hBQUEsYUFBYSxPQUFBO0lBQ3JCLGdIQUFrRjtJQUExRSx3SEFBQSxjQUFjLE9BQUE7SUFBRSw4SEFBQSxvQkFBb0IsT0FBQTtJQUM1Qyw4R0FBb0Y7SUFBNUUsNEhBQUEsbUJBQW1CLE9BQUE7SUFBRSwySEFBQSxrQkFBa0IsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQge0FzdEZhY3RvcnksIEJpbmFyeU9wZXJhdG9yLCBMZWFkaW5nQ29tbWVudCwgT2JqZWN0TGl0ZXJhbFByb3BlcnR5LCBTb3VyY2VNYXBMb2NhdGlvbiwgU291cmNlTWFwUmFuZ2UsIFRlbXBsYXRlRWxlbWVudCwgVGVtcGxhdGVMaXRlcmFsLCBVbmFyeU9wZXJhdG9yfSBmcm9tICcuL3NyYy9hcGkvYXN0X2ZhY3RvcnknO1xuZXhwb3J0IHtJbXBvcnQsIEltcG9ydEdlbmVyYXRvciwgTmFtZWRJbXBvcnR9IGZyb20gJy4vc3JjL2FwaS9pbXBvcnRfZ2VuZXJhdG9yJztcbmV4cG9ydCB7SW1wb3J0TWFuYWdlcn0gZnJvbSAnLi9zcmMvaW1wb3J0X21hbmFnZXInO1xuZXhwb3J0IHtSZWNvcmRXcmFwcGVkTm9kZUV4cHJGbn0gZnJvbSAnLi9zcmMvdHJhbnNsYXRvcic7XG5leHBvcnQge3RyYW5zbGF0ZVR5cGV9IGZyb20gJy4vc3JjL3R5cGVfdHJhbnNsYXRvcic7XG5leHBvcnQge2F0dGFjaENvbW1lbnRzLCBUeXBlU2NyaXB0QXN0RmFjdG9yeX0gZnJvbSAnLi9zcmMvdHlwZXNjcmlwdF9hc3RfZmFjdG9yeSc7XG5leHBvcnQge3RyYW5zbGF0ZUV4cHJlc3Npb24sIHRyYW5zbGF0ZVN0YXRlbWVudH0gZnJvbSAnLi9zcmMvdHlwZXNjcmlwdF90cmFuc2xhdG9yJztcbiJdfQ==