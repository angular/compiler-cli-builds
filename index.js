(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler", "@angular/compiler-cli/src/version", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/entry_points", "@angular/compiler-cli/src/perform_compile", "@angular/compiler-cli/src/tooling", "@angular/compiler-cli/src/transformers/util", "@angular/compiler-cli/src/ngtsc/tsc_plugin", "@angular/compiler-cli/src/ngtsc/program"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgtscProgram = exports.NgTscPlugin = exports.ngToTsDiagnostic = exports.VERSION = exports.StaticSymbol = exports.StaticReflector = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var compiler_1 = require("@angular/compiler");
    Object.defineProperty(exports, "StaticReflector", { enumerable: true, get: function () { return compiler_1.StaticReflector; } });
    Object.defineProperty(exports, "StaticSymbol", { enumerable: true, get: function () { return compiler_1.StaticSymbol; } });
    var version_1 = require("@angular/compiler-cli/src/version");
    Object.defineProperty(exports, "VERSION", { enumerable: true, get: function () { return version_1.VERSION; } });
    (0, tslib_1.__exportStar)(require("@angular/compiler-cli/src/metadata/index"), exports);
    (0, tslib_1.__exportStar)(require("@angular/compiler-cli/src/transformers/api"), exports);
    (0, tslib_1.__exportStar)(require("@angular/compiler-cli/src/transformers/entry_points"), exports);
    (0, tslib_1.__exportStar)(require("@angular/compiler-cli/src/perform_compile"), exports);
    (0, tslib_1.__exportStar)(require("@angular/compiler-cli/src/tooling"), exports);
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    Object.defineProperty(exports, "ngToTsDiagnostic", { enumerable: true, get: function () { return util_1.ngToTsDiagnostic; } });
    var tsc_plugin_1 = require("@angular/compiler-cli/src/ngtsc/tsc_plugin");
    Object.defineProperty(exports, "NgTscPlugin", { enumerable: true, get: function () { return tsc_plugin_1.NgTscPlugin; } });
    var program_1 = require("@angular/compiler-cli/src/ngtsc/program");
    Object.defineProperty(exports, "NgtscProgram", { enumerable: true, get: function () { return program_1.NgtscProgram; } });
    (0, file_system_1.setFileSystem)(new file_system_1.NodeJSFileSystem());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUF3RTtJQUV4RSw4Q0FBeUg7SUFBeEQsMkdBQUEsZUFBZSxPQUFBO0lBQUUsd0dBQUEsWUFBWSxPQUFBO0lBQzlGLDZEQUFzQztJQUE5QixrR0FBQSxPQUFPLE9BQUE7SUFFZix3RkFBK0I7SUFDL0IsMEZBQXVDO0lBQ3ZDLG1HQUFnRDtJQUVoRCx5RkFBc0M7SUFDdEMsaUZBQThCO0lBSzlCLG9FQUF5RDtJQUFqRCx3R0FBQSxnQkFBZ0IsT0FBQTtJQUN4Qix5RUFBbUQ7SUFBM0MseUdBQUEsV0FBVyxPQUFBO0lBQ25CLG1FQUFpRDtJQUF6Qyx1R0FBQSxZQUFZLE9BQUE7SUFFcEIsSUFBQSwyQkFBYSxFQUFDLElBQUksOEJBQWdCLEVBQUUsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge05vZGVKU0ZpbGVTeXN0ZW0sIHNldEZpbGVTeXN0ZW19IGZyb20gJy4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuZXhwb3J0IHtBb3RDb21waWxlckhvc3QsIEFvdENvbXBpbGVySG9zdCBhcyBTdGF0aWNSZWZsZWN0b3JIb3N0LCBTdGF0aWNSZWZsZWN0b3IsIFN0YXRpY1N5bWJvbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuZXhwb3J0IHtWRVJTSU9OfSBmcm9tICcuL3NyYy92ZXJzaW9uJztcblxuZXhwb3J0ICogZnJvbSAnLi9zcmMvbWV0YWRhdGEnO1xuZXhwb3J0ICogZnJvbSAnLi9zcmMvdHJhbnNmb3JtZXJzL2FwaSc7XG5leHBvcnQgKiBmcm9tICcuL3NyYy90cmFuc2Zvcm1lcnMvZW50cnlfcG9pbnRzJztcblxuZXhwb3J0ICogZnJvbSAnLi9zcmMvcGVyZm9ybV9jb21waWxlJztcbmV4cG9ydCAqIGZyb20gJy4vc3JjL3Rvb2xpbmcnO1xuXG4vLyBUT0RPKHRib3NjaCk6IHJlbW92ZSB0aGlzIG9uY2UgdXNhZ2VzIGluIEczIGFyZSBjaGFuZ2VkIHRvIGBDb21waWxlck9wdGlvbnNgXG5leHBvcnQge0NvbXBpbGVyT3B0aW9ucyBhcyBBbmd1bGFyQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3NyYy90cmFuc2Zvcm1lcnMvYXBpJztcblxuZXhwb3J0IHtuZ1RvVHNEaWFnbm9zdGljfSBmcm9tICcuL3NyYy90cmFuc2Zvcm1lcnMvdXRpbCc7XG5leHBvcnQge05nVHNjUGx1Z2lufSBmcm9tICcuL3NyYy9uZ3RzYy90c2NfcGx1Z2luJztcbmV4cG9ydCB7Tmd0c2NQcm9ncmFtfSBmcm9tICcuL3NyYy9uZ3RzYy9wcm9ncmFtJztcblxuc2V0RmlsZVN5c3RlbShuZXcgTm9kZUpTRmlsZVN5c3RlbSgpKTtcbiJdfQ==