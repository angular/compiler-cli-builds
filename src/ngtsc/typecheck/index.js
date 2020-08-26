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
        define("@angular/compiler-cli/src/ngtsc/typecheck", ["require", "exports", "@angular/compiler-cli/src/ngtsc/typecheck/src/augmented_program", "@angular/compiler-cli/src/ngtsc/typecheck/src/checker", "@angular/compiler-cli/src/ngtsc/typecheck/src/context", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/host", "@angular/compiler-cli/src/ngtsc/typecheck/src/shim", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.typeCheckFilePath = exports.TypeCheckShimGenerator = exports.TypeCheckProgramHost = exports.isTemplateDiagnostic = exports.TypeCheckContextImpl = exports.TemplateTypeCheckerImpl = exports.ReusedProgramStrategy = void 0;
    var augmented_program_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/augmented_program");
    Object.defineProperty(exports, "ReusedProgramStrategy", { enumerable: true, get: function () { return augmented_program_1.ReusedProgramStrategy; } });
    var checker_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/checker");
    Object.defineProperty(exports, "TemplateTypeCheckerImpl", { enumerable: true, get: function () { return checker_1.TemplateTypeCheckerImpl; } });
    var context_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/context");
    Object.defineProperty(exports, "TypeCheckContextImpl", { enumerable: true, get: function () { return context_1.TypeCheckContextImpl; } });
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    Object.defineProperty(exports, "isTemplateDiagnostic", { enumerable: true, get: function () { return diagnostics_1.isTemplateDiagnostic; } });
    var host_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/host");
    Object.defineProperty(exports, "TypeCheckProgramHost", { enumerable: true, get: function () { return host_1.TypeCheckProgramHost; } });
    var shim_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/shim");
    Object.defineProperty(exports, "TypeCheckShimGenerator", { enumerable: true, get: function () { return shim_1.TypeCheckShimGenerator; } });
    var type_check_file_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file");
    Object.defineProperty(exports, "typeCheckFilePath", { enumerable: true, get: function () { return type_check_file_1.typeCheckFilePath; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxxR0FBOEQ7SUFBdEQsMEhBQUEscUJBQXFCLE9BQUE7SUFDN0IsaUZBQTRFO0lBQTlDLGtIQUFBLHVCQUF1QixPQUFBO0lBQ3JELGlGQUFtRDtJQUEzQywrR0FBQSxvQkFBb0IsT0FBQTtJQUM1Qix5RkFBMkU7SUFBbkUsbUhBQUEsb0JBQW9CLE9BQUE7SUFDNUIsMkVBQWdEO0lBQXhDLDRHQUFBLG9CQUFvQixPQUFBO0lBQzVCLDJFQUFrRDtJQUExQyw4R0FBQSxzQkFBc0IsT0FBQTtJQUM5QixpR0FBd0Q7SUFBaEQsb0hBQUEsaUJBQWlCLE9BQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IHtSZXVzZWRQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJy4vc3JjL2F1Z21lbnRlZF9wcm9ncmFtJztcbmV4cG9ydCB7RmlsZVR5cGVDaGVja2luZ0RhdGEsIFRlbXBsYXRlVHlwZUNoZWNrZXJJbXBsfSBmcm9tICcuL3NyYy9jaGVja2VyJztcbmV4cG9ydCB7VHlwZUNoZWNrQ29udGV4dEltcGx9IGZyb20gJy4vc3JjL2NvbnRleHQnO1xuZXhwb3J0IHtpc1RlbXBsYXRlRGlhZ25vc3RpYywgVGVtcGxhdGVEaWFnbm9zdGljfSBmcm9tICcuL3NyYy9kaWFnbm9zdGljcyc7XG5leHBvcnQge1R5cGVDaGVja1Byb2dyYW1Ib3N0fSBmcm9tICcuL3NyYy9ob3N0JztcbmV4cG9ydCB7VHlwZUNoZWNrU2hpbUdlbmVyYXRvcn0gZnJvbSAnLi9zcmMvc2hpbSc7XG5leHBvcnQge3R5cGVDaGVja0ZpbGVQYXRofSBmcm9tICcuL3NyYy90eXBlX2NoZWNrX2ZpbGUnO1xuIl19