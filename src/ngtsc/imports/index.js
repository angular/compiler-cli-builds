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
        define("@angular/compiler-cli/src/ngtsc/imports", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports/src/core", "@angular/compiler-cli/src/ngtsc/imports/src/references", "@angular/compiler-cli/src/ngtsc/imports/src/resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var core_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/core");
    exports.NoopImportRewriter = core_1.NoopImportRewriter;
    exports.R3SymbolsImportRewriter = core_1.R3SymbolsImportRewriter;
    exports.validateAndRewriteCoreSymbol = core_1.validateAndRewriteCoreSymbol;
    var references_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/references");
    exports.AbsoluteReference = references_1.AbsoluteReference;
    exports.ImportMode = references_1.ImportMode;
    exports.NodeReference = references_1.NodeReference;
    exports.Reference = references_1.Reference;
    exports.ResolvedReference = references_1.ResolvedReference;
    var resolver_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/resolver");
    exports.TsReferenceResolver = resolver_1.TsReferenceResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCx5RUFBcUg7SUFBN0Ysb0NBQUEsa0JBQWtCLENBQUE7SUFBRSx5Q0FBQSx1QkFBdUIsQ0FBQTtJQUFFLDhDQUFBLDRCQUE0QixDQUFBO0lBQ2pHLHFGQUE0RztJQUFwRyx5Q0FBQSxpQkFBaUIsQ0FBQTtJQUFFLGtDQUFBLFVBQVUsQ0FBQTtJQUFFLHFDQUFBLGFBQWEsQ0FBQTtJQUFFLGlDQUFBLFNBQVMsQ0FBQTtJQUFFLHlDQUFBLGlCQUFpQixDQUFBO0lBQ2xGLGlGQUFzRTtJQUEzQyx5Q0FBQSxtQkFBbUIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IHtJbXBvcnRSZXdyaXRlciwgTm9vcEltcG9ydFJld3JpdGVyLCBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciwgdmFsaWRhdGVBbmRSZXdyaXRlQ29yZVN5bWJvbH0gZnJvbSAnLi9zcmMvY29yZSc7XG5leHBvcnQge0Fic29sdXRlUmVmZXJlbmNlLCBJbXBvcnRNb2RlLCBOb2RlUmVmZXJlbmNlLCBSZWZlcmVuY2UsIFJlc29sdmVkUmVmZXJlbmNlfSBmcm9tICcuL3NyYy9yZWZlcmVuY2VzJztcbmV4cG9ydCB7UmVmZXJlbmNlUmVzb2x2ZXIsIFRzUmVmZXJlbmNlUmVzb2x2ZXJ9IGZyb20gJy4vc3JjL3Jlc29sdmVyJztcbiJdfQ==