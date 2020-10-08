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
        define("@angular/compiler-cli/src/ngtsc/typecheck/api", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/typecheck/api/api", "@angular/compiler-cli/src/ngtsc/typecheck/api/checker", "@angular/compiler-cli/src/ngtsc/typecheck/api/completion", "@angular/compiler-cli/src/ngtsc/typecheck/api/context", "@angular/compiler-cli/src/ngtsc/typecheck/api/symbols"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/api/api"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/api/checker"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/api/completion"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/api/context"), exports);
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/typecheck/api/symbols"), exports);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9hcGkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsNEZBQXNCO0lBQ3RCLGdHQUEwQjtJQUMxQixtR0FBNkI7SUFDN0IsZ0dBQTBCO0lBQzFCLGdHQUEwQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQgKiBmcm9tICcuL2FwaSc7XG5leHBvcnQgKiBmcm9tICcuL2NoZWNrZXInO1xuZXhwb3J0ICogZnJvbSAnLi9jb21wbGV0aW9uJztcbmV4cG9ydCAqIGZyb20gJy4vY29udGV4dCc7XG5leHBvcnQgKiBmcm9tICcuL3N5bWJvbHMnO1xuIl19