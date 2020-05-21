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
        define("@angular/compiler-cli/src/ngtsc/typecheck", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/typecheck/src/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/augmented_program", "@angular/compiler-cli/src/ngtsc/typecheck/src/checker", "@angular/compiler-cli/src/ngtsc/typecheck/src/context", "@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics", "@angular/compiler-cli/src/ngtsc/typecheck/src/shim", "@angular/compiler-cli/src/ngtsc/typecheck/src/host", "@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/src/api"), exports);
    var augmented_program_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/augmented_program");
    Object.defineProperty(exports, "ReusedProgramStrategy", { enumerable: true, get: function () { return augmented_program_1.ReusedProgramStrategy; } });
    var checker_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/checker");
    Object.defineProperty(exports, "TemplateTypeChecker", { enumerable: true, get: function () { return checker_1.TemplateTypeChecker; } });
    var context_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/context");
    Object.defineProperty(exports, "TypeCheckContext", { enumerable: true, get: function () { return context_1.TypeCheckContext; } });
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/diagnostics");
    Object.defineProperty(exports, "isTemplateDiagnostic", { enumerable: true, get: function () { return diagnostics_1.isTemplateDiagnostic; } });
    var shim_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/shim");
    Object.defineProperty(exports, "TypeCheckShimGenerator", { enumerable: true, get: function () { return shim_1.TypeCheckShimGenerator; } });
    var host_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/host");
    Object.defineProperty(exports, "TypeCheckProgramHost", { enumerable: true, get: function () { return host_1.TypeCheckProgramHost; } });
    var type_check_file_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/type_check_file");
    Object.defineProperty(exports, "typeCheckFilePath", { enumerable: true, get: function () { return type_check_file_1.typeCheckFilePath; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw0RkFBMEI7SUFDMUIscUdBQThEO0lBQXRELDBIQUFBLHFCQUFxQixPQUFBO0lBQzdCLGlGQUEyRTtJQUFuRSw4R0FBQSxtQkFBbUIsT0FBQTtJQUMzQixpRkFBK0M7SUFBdkMsMkdBQUEsZ0JBQWdCLE9BQUE7SUFDeEIseUZBQTJFO0lBQS9DLG1IQUFBLG9CQUFvQixPQUFBO0lBQ2hELDJFQUFrRDtJQUExQyw4R0FBQSxzQkFBc0IsT0FBQTtJQUM5QiwyRUFBZ0Q7SUFBeEMsNEdBQUEsb0JBQW9CLE9BQUE7SUFDNUIsaUdBQXdEO0lBQWhELG9IQUFBLGlCQUFpQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQgKiBmcm9tICcuL3NyYy9hcGknO1xuZXhwb3J0IHtSZXVzZWRQcm9ncmFtU3RyYXRlZ3l9IGZyb20gJy4vc3JjL2F1Z21lbnRlZF9wcm9ncmFtJztcbmV4cG9ydCB7VGVtcGxhdGVUeXBlQ2hlY2tlciwgUHJvZ3JhbVR5cGVDaGVja0FkYXB0ZXJ9IGZyb20gJy4vc3JjL2NoZWNrZXInO1xuZXhwb3J0IHtUeXBlQ2hlY2tDb250ZXh0fSBmcm9tICcuL3NyYy9jb250ZXh0JztcbmV4cG9ydCB7VGVtcGxhdGVEaWFnbm9zdGljLCBpc1RlbXBsYXRlRGlhZ25vc3RpY30gZnJvbSAnLi9zcmMvZGlhZ25vc3RpY3MnO1xuZXhwb3J0IHtUeXBlQ2hlY2tTaGltR2VuZXJhdG9yfSBmcm9tICcuL3NyYy9zaGltJztcbmV4cG9ydCB7VHlwZUNoZWNrUHJvZ3JhbUhvc3R9IGZyb20gJy4vc3JjL2hvc3QnO1xuZXhwb3J0IHt0eXBlQ2hlY2tGaWxlUGF0aH0gZnJvbSAnLi9zcmMvdHlwZV9jaGVja19maWxlJztcbiJdfQ==