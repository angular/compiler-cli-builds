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
    exports.translateStatement = exports.translateExpression = exports.TypeScriptAstFactory = exports.createTemplateTail = exports.createTemplateMiddle = exports.attachComments = exports.translateType = exports.ImportManager = void 0;
    var import_manager_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/import_manager");
    Object.defineProperty(exports, "ImportManager", { enumerable: true, get: function () { return import_manager_1.ImportManager; } });
    var type_translator_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/type_translator");
    Object.defineProperty(exports, "translateType", { enumerable: true, get: function () { return type_translator_1.translateType; } });
    var typescript_ast_factory_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/typescript_ast_factory");
    Object.defineProperty(exports, "attachComments", { enumerable: true, get: function () { return typescript_ast_factory_1.attachComments; } });
    Object.defineProperty(exports, "createTemplateMiddle", { enumerable: true, get: function () { return typescript_ast_factory_1.createTemplateMiddle; } });
    Object.defineProperty(exports, "createTemplateTail", { enumerable: true, get: function () { return typescript_ast_factory_1.createTemplateTail; } });
    Object.defineProperty(exports, "TypeScriptAstFactory", { enumerable: true, get: function () { return typescript_ast_factory_1.TypeScriptAstFactory; } });
    var typescript_translator_1 = require("@angular/compiler-cli/src/ngtsc/translator/src/typescript_translator");
    Object.defineProperty(exports, "translateExpression", { enumerable: true, get: function () { return typescript_translator_1.translateExpression; } });
    Object.defineProperty(exports, "translateStatement", { enumerable: true, get: function () { return typescript_translator_1.translateStatement; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zbGF0b3IvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUgsZ0dBQW1EO0lBQTNDLCtHQUFBLGFBQWEsT0FBQTtJQUVyQixrR0FBb0Q7SUFBNUMsZ0hBQUEsYUFBYSxPQUFBO0lBQ3JCLGdIQUE0SDtJQUFwSCx3SEFBQSxjQUFjLE9BQUE7SUFBRSw4SEFBQSxvQkFBb0IsT0FBQTtJQUFFLDRIQUFBLGtCQUFrQixPQUFBO0lBQUUsOEhBQUEsb0JBQW9CLE9BQUE7SUFDdEYsOEdBQW9GO0lBQTVFLDRIQUFBLG1CQUFtQixPQUFBO0lBQUUsMkhBQUEsa0JBQWtCLE9BQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IHtBc3RGYWN0b3J5LCBCaW5hcnlPcGVyYXRvciwgTGVhZGluZ0NvbW1lbnQsIE9iamVjdExpdGVyYWxQcm9wZXJ0eSwgU291cmNlTWFwTG9jYXRpb24sIFNvdXJjZU1hcFJhbmdlLCBUZW1wbGF0ZUVsZW1lbnQsIFRlbXBsYXRlTGl0ZXJhbCwgVW5hcnlPcGVyYXRvciwgVmFyaWFibGVEZWNsYXJhdGlvblR5cGV9IGZyb20gJy4vc3JjL2FwaS9hc3RfZmFjdG9yeSc7XG5leHBvcnQge0ltcG9ydCwgSW1wb3J0R2VuZXJhdG9yLCBOYW1lZEltcG9ydH0gZnJvbSAnLi9zcmMvYXBpL2ltcG9ydF9nZW5lcmF0b3InO1xuZXhwb3J0IHtJbXBvcnRNYW5hZ2VyfSBmcm9tICcuL3NyYy9pbXBvcnRfbWFuYWdlcic7XG5leHBvcnQge1JlY29yZFdyYXBwZWROb2RlRXhwckZufSBmcm9tICcuL3NyYy90cmFuc2xhdG9yJztcbmV4cG9ydCB7dHJhbnNsYXRlVHlwZX0gZnJvbSAnLi9zcmMvdHlwZV90cmFuc2xhdG9yJztcbmV4cG9ydCB7YXR0YWNoQ29tbWVudHMsIGNyZWF0ZVRlbXBsYXRlTWlkZGxlLCBjcmVhdGVUZW1wbGF0ZVRhaWwsIFR5cGVTY3JpcHRBc3RGYWN0b3J5fSBmcm9tICcuL3NyYy90eXBlc2NyaXB0X2FzdF9mYWN0b3J5JztcbmV4cG9ydCB7dHJhbnNsYXRlRXhwcmVzc2lvbiwgdHJhbnNsYXRlU3RhdGVtZW50fSBmcm9tICcuL3NyYy90eXBlc2NyaXB0X3RyYW5zbGF0b3InO1xuIl19