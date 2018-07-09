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
        define("@angular/compiler-cli/src/ngtsc/metadata", ["require", "exports", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector", "@angular/compiler-cli/src/ngtsc/metadata/src/resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    exports.reflectConstructorParameters = reflector_1.reflectConstructorParameters;
    exports.reflectDecorator = reflector_1.reflectDecorator;
    var resolver_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/resolver");
    exports.Reference = resolver_1.Reference;
    exports.isDynamicValue = resolver_1.isDynamicValue;
    exports.staticallyResolve = resolver_1.staticallyResolve;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsb0ZBQXFHO0lBQXZFLG1EQUFBLDRCQUE0QixDQUFBO0lBQUUsdUNBQUEsZ0JBQWdCLENBQUE7SUFDNUUsa0ZBQTJGO0lBQW5GLCtCQUFBLFNBQVMsQ0FBQTtJQUFpQixvQ0FBQSxjQUFjLENBQUE7SUFBRSx1Q0FBQSxpQkFBaUIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0IHtEZWNvcmF0b3IsIFBhcmFtZXRlciwgcmVmbGVjdENvbnN0cnVjdG9yUGFyYW1ldGVycywgcmVmbGVjdERlY29yYXRvcn0gZnJvbSAnLi9zcmMvcmVmbGVjdG9yJztcbmV4cG9ydCB7UmVmZXJlbmNlLCBSZXNvbHZlZFZhbHVlLCBpc0R5bmFtaWNWYWx1ZSwgc3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4vc3JjL3Jlc29sdmVyJztcbiJdfQ==