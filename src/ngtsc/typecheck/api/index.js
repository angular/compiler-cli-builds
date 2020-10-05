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
        define("@angular/compiler-cli/src/ngtsc/typecheck/api", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/typecheck/api/api", "@angular/compiler-cli/src/ngtsc/typecheck/api/checker", "@angular/compiler-cli/src/ngtsc/typecheck/api/context", "@angular/compiler-cli/src/ngtsc/typecheck/api/symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/api/api"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/api/checker"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/api/context"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/api/symbols"), exports);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsNEZBQXNCO0lBQ3RCLGdHQUEwQjtJQUMxQixnR0FBMEI7SUFDMUIsZ0dBQTBCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCAqIGZyb20gJy4vYXBpJztcbmV4cG9ydCAqIGZyb20gJy4vY2hlY2tlcic7XG5leHBvcnQgKiBmcm9tICcuL2NvbnRleHQnO1xuZXhwb3J0ICogZnJvbSAnLi9zeW1ib2xzJztcbiJdfQ==