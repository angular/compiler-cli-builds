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
        define("@angular/compiler-cli/src/ngtsc/imports", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports/src/alias", "@angular/compiler-cli/src/ngtsc/imports/src/core", "@angular/compiler-cli/src/ngtsc/imports/src/default", "@angular/compiler-cli/src/ngtsc/imports/src/emitter", "@angular/compiler-cli/src/ngtsc/imports/src/references", "@angular/compiler-cli/src/ngtsc/imports/src/resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var alias_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/alias");
    exports.AliasStrategy = alias_1.AliasStrategy;
    exports.FileToModuleAliasingHost = alias_1.FileToModuleAliasingHost;
    exports.PrivateExportAliasingHost = alias_1.PrivateExportAliasingHost;
    var core_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/core");
    exports.NoopImportRewriter = core_1.NoopImportRewriter;
    exports.R3SymbolsImportRewriter = core_1.R3SymbolsImportRewriter;
    exports.validateAndRewriteCoreSymbol = core_1.validateAndRewriteCoreSymbol;
    var default_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/default");
    exports.DefaultImportTracker = default_1.DefaultImportTracker;
    exports.NOOP_DEFAULT_IMPORT_RECORDER = default_1.NOOP_DEFAULT_IMPORT_RECORDER;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCwyRUFBNkc7SUFBckcsZ0NBQUEsYUFBYSxDQUFBO0lBQWdCLDJDQUFBLHdCQUF3QixDQUFBO0lBQUUsNENBQUEseUJBQXlCLENBQUE7SUFDeEYseUVBQXFIO0lBQTdGLG9DQUFBLGtCQUFrQixDQUFBO0lBQUUseUNBQUEsdUJBQXVCLENBQUE7SUFBRSw4Q0FBQSw0QkFBNEIsQ0FBQTtJQUNqRywrRUFBd0c7SUFBekUseUNBQUEsb0JBQW9CLENBQUE7SUFBRSxpREFBQSw0QkFBNEIsQ0FBQTtJQUNqRiwrRUFBdUw7SUFBL0ssMkNBQUEsc0JBQXNCLENBQUE7SUFBb0IseUNBQUEsb0JBQW9CLENBQUE7SUFBRSw0Q0FBQSx1QkFBdUIsQ0FBQTtJQUFFLDJDQUFBLHNCQUFzQixDQUFBO0lBQXlCLHFDQUFBLGdCQUFnQixDQUFBO0lBRWhLLHFGQUFxRTtJQUE3RCxrQ0FBQSxVQUFVLENBQUE7SUFBZ0IsaUNBQUEsU0FBUyxDQUFBO0lBQzNDLGlGQUE4QztJQUF0QyxvQ0FBQSxjQUFjLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCB7QWxpYXNTdHJhdGVneSwgQWxpYXNpbmdIb3N0LCBGaWxlVG9Nb2R1bGVBbGlhc2luZ0hvc3QsIFByaXZhdGVFeHBvcnRBbGlhc2luZ0hvc3R9IGZyb20gJy4vc3JjL2FsaWFzJztcbmV4cG9ydCB7SW1wb3J0UmV3cml0ZXIsIE5vb3BJbXBvcnRSZXdyaXRlciwgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIsIHZhbGlkYXRlQW5kUmV3cml0ZUNvcmVTeW1ib2x9IGZyb20gJy4vc3JjL2NvcmUnO1xuZXhwb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIERlZmF1bHRJbXBvcnRUcmFja2VyLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSfSBmcm9tICcuL3NyYy9kZWZhdWx0JztcbmV4cG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgRmlsZVRvTW9kdWxlSG9zdCwgRmlsZVRvTW9kdWxlU3RyYXRlZ3ksIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5LCBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5LCBSZWZlcmVuY2VFbWl0U3RyYXRlZ3ksIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4vc3JjL2VtaXR0ZXInO1xuZXhwb3J0IHtSZWV4cG9ydH0gZnJvbSAnLi9zcmMvcmVleHBvcnQnO1xuZXhwb3J0IHtJbXBvcnRNb2RlLCBPd25pbmdNb2R1bGUsIFJlZmVyZW5jZX0gZnJvbSAnLi9zcmMvcmVmZXJlbmNlcyc7XG5leHBvcnQge01vZHVsZVJlc29sdmVyfSBmcm9tICcuL3NyYy9yZXNvbHZlcic7XG4iXX0=