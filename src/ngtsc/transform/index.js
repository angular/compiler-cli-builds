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
        define("@angular/compiler-cli/src/ngtsc/transform", ["require", "exports", "@angular/compiler-cli/src/ngtsc/transform/src/compilation", "@angular/compiler-cli/src/ngtsc/transform/src/transform", "@angular/compiler-cli/src/ngtsc/transform/src/translator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compilation_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/compilation");
    exports.IvyCompilation = compilation_1.IvyCompilation;
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/transform");
    exports.ivyTransformFactory = transform_1.ivyTransformFactory;
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/translator");
    exports.ImportManager = translator_1.ImportManager;
    exports.translateStatement = translator_1.translateStatement;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUdILHlGQUFpRDtJQUF6Qyx1Q0FBQSxjQUFjLENBQUE7SUFDdEIscUZBQW9EO0lBQTVDLDBDQUFBLG1CQUFtQixDQUFBO0lBQzNCLHVGQUFtRTtJQUEzRCxxQ0FBQSxhQUFhLENBQUE7SUFBRSwwQ0FBQSxrQkFBa0IsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0ICogZnJvbSAnLi9zcmMvYXBpJztcbmV4cG9ydCB7SXZ5Q29tcGlsYXRpb259IGZyb20gJy4vc3JjL2NvbXBpbGF0aW9uJztcbmV4cG9ydCB7aXZ5VHJhbnNmb3JtRmFjdG9yeX0gZnJvbSAnLi9zcmMvdHJhbnNmb3JtJztcbmV4cG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlU3RhdGVtZW50fSBmcm9tICcuL3NyYy90cmFuc2xhdG9yJzsiXX0=