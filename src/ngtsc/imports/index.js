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
        define("@angular/compiler-cli/src/ngtsc/imports", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports/src/alias", "@angular/compiler-cli/src/ngtsc/imports/src/core", "@angular/compiler-cli/src/ngtsc/imports/src/emitter", "@angular/compiler-cli/src/ngtsc/imports/src/references", "@angular/compiler-cli/src/ngtsc/imports/src/resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var alias_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/alias");
    exports.AliasGenerator = alias_1.AliasGenerator;
    exports.AliasStrategy = alias_1.AliasStrategy;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwyRUFBMEQ7SUFBbEQsaUNBQUEsY0FBYyxDQUFBO0lBQUUsZ0NBQUEsYUFBYSxDQUFBO0lBQ3JDLHlFQUFxSDtJQUE3RixvQ0FBQSxrQkFBa0IsQ0FBQTtJQUFFLHlDQUFBLHVCQUF1QixDQUFBO0lBQUUsOENBQUEsNEJBQTRCLENBQUE7SUFDakcsK0VBQXVMO0lBQS9LLDJDQUFBLHNCQUFzQixDQUFBO0lBQW9CLHlDQUFBLG9CQUFvQixDQUFBO0lBQUUsNENBQUEsdUJBQXVCLENBQUE7SUFBRSwyQ0FBQSxzQkFBc0IsQ0FBQTtJQUF5QixxQ0FBQSxnQkFBZ0IsQ0FBQTtJQUVoSyxxRkFBcUU7SUFBN0Qsa0NBQUEsVUFBVSxDQUFBO0lBQWdCLGlDQUFBLFNBQVMsQ0FBQTtJQUMzQyxpRkFBOEM7SUFBdEMsb0NBQUEsY0FBYyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQge0FsaWFzR2VuZXJhdG9yLCBBbGlhc1N0cmF0ZWd5fSBmcm9tICcuL3NyYy9hbGlhcyc7XG5leHBvcnQge0ltcG9ydFJld3JpdGVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyLCB2YWxpZGF0ZUFuZFJld3JpdGVDb3JlU3ltYm9sfSBmcm9tICcuL3NyYy9jb3JlJztcbmV4cG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgRmlsZVRvTW9kdWxlSG9zdCwgRmlsZVRvTW9kdWxlU3RyYXRlZ3ksIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBSZWZlcmVuY2VFbWl0U3RyYXRlZ3ksIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4vc3JjL2VtaXR0ZXInO1xuZXhwb3J0IHtSZWV4cG9ydH0gZnJvbSAnLi9zcmMvcmVleHBvcnQnO1xuZXhwb3J0IHtJbXBvcnRNb2RlLCBPd25pbmdNb2R1bGUsIFJlZmVyZW5jZX0gZnJvbSAnLi9zcmMvcmVmZXJlbmNlcyc7XG5leHBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL3NyYy9yZXNvbHZlcic7XG4iXX0=