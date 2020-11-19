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
        define("@angular/compiler-cli/src/ngtsc/translator", ["require", "exports", "@angular/compiler-cli/src/ngtsc/translator/src/context", "@angular/compiler-cli/src/ngtsc/translator/src/import_manager", "@angular/compiler-cli/src/ngtsc/translator/src/translator", "@angular/compiler-cli/src/ngtsc/translator/src/type_translator", "@angular/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory", "@angular/compiler-cli/src/ngtsc/translator/src/typescript_translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.translateStatement = exports.translateExpression = exports.TypeScriptAstFactory = exports.attachComments = exports.translateType = exports.ExpressionTranslatorVisitor = exports.ImportManager = exports.Context = void 0;
    var context_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/context");
    Object.defineProperty(exports, "Context", { enumerable: true, get: function () { return context_1.Context; } });
    var import_manager_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/import_manager");
    Object.defineProperty(exports, "ImportManager", { enumerable: true, get: function () { return import_manager_1.ImportManager; } });
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/translator");
    Object.defineProperty(exports, "ExpressionTranslatorVisitor", { enumerable: true, get: function () { return translator_1.ExpressionTranslatorVisitor; } });
    var type_translator_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/type_translator");
    Object.defineProperty(exports, "translateType", { enumerable: true, get: function () { return type_translator_1.translateType; } });
    var typescript_ast_factory_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory");
    Object.defineProperty(exports, "attachComments", { enumerable: true, get: function () { return typescript_ast_factory_1.attachComments; } });
    Object.defineProperty(exports, "TypeScriptAstFactory", { enumerable: true, get: function () { return typescript_ast_factory_1.TypeScriptAstFactory; } });
    var typescript_translator_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/typescript_translator");
    Object.defineProperty(exports, "translateExpression", { enumerable: true, get: function () { return typescript_translator_1.translateExpression; } });
    Object.defineProperty(exports, "translateStatement", { enumerable: true, get: function () { return typescript_translator_1.translateStatement; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zbGF0b3IvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUgsa0ZBQXNDO0lBQTlCLGtHQUFBLE9BQU8sT0FBQTtJQUNmLGdHQUFtRDtJQUEzQywrR0FBQSxhQUFhLE9BQUE7SUFDckIsd0ZBQXlHO0lBQWpHLHlIQUFBLDJCQUEyQixPQUFBO0lBQ25DLGtHQUFvRDtJQUE1QyxnSEFBQSxhQUFhLE9BQUE7SUFDckIsZ0hBQWtGO0lBQTFFLHdIQUFBLGNBQWMsT0FBQTtJQUFFLDhIQUFBLG9CQUFvQixPQUFBO0lBQzVDLDhHQUFvRjtJQUE1RSw0SEFBQSxtQkFBbUIsT0FBQTtJQUFFLDJIQUFBLGtCQUFrQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCB7QXN0RmFjdG9yeSwgQmluYXJ5T3BlcmF0b3IsIExlYWRpbmdDb21tZW50LCBPYmplY3RMaXRlcmFsUHJvcGVydHksIFNvdXJjZU1hcExvY2F0aW9uLCBTb3VyY2VNYXBSYW5nZSwgVGVtcGxhdGVFbGVtZW50LCBUZW1wbGF0ZUxpdGVyYWwsIFVuYXJ5T3BlcmF0b3IsIFZhcmlhYmxlRGVjbGFyYXRpb25UeXBlfSBmcm9tICcuL3NyYy9hcGkvYXN0X2ZhY3RvcnknO1xuZXhwb3J0IHtJbXBvcnQsIEltcG9ydEdlbmVyYXRvciwgTmFtZWRJbXBvcnR9IGZyb20gJy4vc3JjL2FwaS9pbXBvcnRfZ2VuZXJhdG9yJztcbmV4cG9ydCB7Q29udGV4dH0gZnJvbSAnLi9zcmMvY29udGV4dCc7XG5leHBvcnQge0ltcG9ydE1hbmFnZXJ9IGZyb20gJy4vc3JjL2ltcG9ydF9tYW5hZ2VyJztcbmV4cG9ydCB7RXhwcmVzc2lvblRyYW5zbGF0b3JWaXNpdG9yLCBSZWNvcmRXcmFwcGVkTm9kZUV4cHJGbiwgVHJhbnNsYXRvck9wdGlvbnN9IGZyb20gJy4vc3JjL3RyYW5zbGF0b3InO1xuZXhwb3J0IHt0cmFuc2xhdGVUeXBlfSBmcm9tICcuL3NyYy90eXBlX3RyYW5zbGF0b3InO1xuZXhwb3J0IHthdHRhY2hDb21tZW50cywgVHlwZVNjcmlwdEFzdEZhY3Rvcnl9IGZyb20gJy4vc3JjL3R5cGVzY3JpcHRfYXN0X2ZhY3RvcnknO1xuZXhwb3J0IHt0cmFuc2xhdGVFeHByZXNzaW9uLCB0cmFuc2xhdGVTdGF0ZW1lbnR9IGZyb20gJy4vc3JjL3R5cGVzY3JpcHRfdHJhbnNsYXRvcic7XG4iXX0=