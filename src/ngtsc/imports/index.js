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
        define("@angular/compiler-cli/src/ngtsc/imports", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports/src/core", "@angular/compiler-cli/src/ngtsc/imports/src/emitter", "@angular/compiler-cli/src/ngtsc/imports/src/references", "@angular/compiler-cli/src/ngtsc/imports/src/resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var core_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/core");
    exports.NoopImportRewriter = core_1.NoopImportRewriter;
    exports.R3SymbolsImportRewriter = core_1.R3SymbolsImportRewriter;
    exports.validateAndRewriteCoreSymbol = core_1.validateAndRewriteCoreSymbol;
    var emitter_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/emitter");
    exports.AbsoluteModuleStrategy = emitter_1.AbsoluteModuleStrategy;
    exports.FileToModuleStrategy = emitter_1.FileToModuleStrategy;
    exports.LocalIdentifierStrategy = emitter_1.LocalIdentifierStrategy;
    exports.LogicalProjectStrategy = emitter_1.LogicalProjectStrategy;
    exports.ReferenceEmitter = emitter_1.ReferenceEmitter;
    var references_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/references");
    exports.ImportMode = references_1.ImportMode;
    exports.Reference = references_1.Reference;
    var resolver_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/resolver");
    exports.ModuleResolver = resolver_1.ModuleResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCx5RUFBcUg7SUFBN0Ysb0NBQUEsa0JBQWtCLENBQUE7SUFBRSx5Q0FBQSx1QkFBdUIsQ0FBQTtJQUFFLDhDQUFBLDRCQUE0QixDQUFBO0lBQ2pHLCtFQUF1TDtJQUEvSywyQ0FBQSxzQkFBc0IsQ0FBQTtJQUFvQix5Q0FBQSxvQkFBb0IsQ0FBQTtJQUFFLDRDQUFBLHVCQUF1QixDQUFBO0lBQUUsMkNBQUEsc0JBQXNCLENBQUE7SUFBeUIscUNBQUEsZ0JBQWdCLENBQUE7SUFDaEsscUZBQXFFO0lBQTdELGtDQUFBLFVBQVUsQ0FBQTtJQUFnQixpQ0FBQSxTQUFTLENBQUE7SUFDM0MsaUZBQThDO0lBQXRDLG9DQUFBLGNBQWMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IHtJbXBvcnRSZXdyaXRlciwgTm9vcEltcG9ydFJld3JpdGVyLCBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciwgdmFsaWRhdGVBbmRSZXdyaXRlQ29yZVN5bWJvbH0gZnJvbSAnLi9zcmMvY29yZSc7XG5leHBvcnQge0Fic29sdXRlTW9kdWxlU3RyYXRlZ3ksIEZpbGVUb01vZHVsZUhvc3QsIEZpbGVUb01vZHVsZVN0cmF0ZWd5LCBMb2NhbElkZW50aWZpZXJTdHJhdGVneSwgTG9naWNhbFByb2plY3RTdHJhdGVneSwgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5LCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuL3NyYy9lbWl0dGVyJztcbmV4cG9ydCB7SW1wb3J0TW9kZSwgT3duaW5nTW9kdWxlLCBSZWZlcmVuY2V9IGZyb20gJy4vc3JjL3JlZmVyZW5jZXMnO1xuZXhwb3J0IHtNb2R1bGVSZXNvbHZlcn0gZnJvbSAnLi9zcmMvcmVzb2x2ZXInO1xuIl19