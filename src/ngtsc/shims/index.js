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
        define("@angular/compiler-cli/src/ngtsc/shims", ["require", "exports", "@angular/compiler-cli/src/ngtsc/shims/src/adapter", "@angular/compiler-cli/src/ngtsc/shims/src/expando", "@angular/compiler-cli/src/ngtsc/shims/src/factory_generator", "@angular/compiler-cli/src/ngtsc/shims/src/reference_tagger", "@angular/compiler-cli/src/ngtsc/shims/src/summary_generator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var adapter_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/adapter");
    Object.defineProperty(exports, "ShimAdapter", { enumerable: true, get: function () { return adapter_1.ShimAdapter; } });
    var expando_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/expando");
    Object.defineProperty(exports, "copyFileShimData", { enumerable: true, get: function () { return expando_1.copyFileShimData; } });
    Object.defineProperty(exports, "isShim", { enumerable: true, get: function () { return expando_1.isShim; } });
    var factory_generator_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/factory_generator");
    Object.defineProperty(exports, "FactoryGenerator", { enumerable: true, get: function () { return factory_generator_1.FactoryGenerator; } });
    Object.defineProperty(exports, "generatedFactoryTransform", { enumerable: true, get: function () { return factory_generator_1.generatedFactoryTransform; } });
    var reference_tagger_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/reference_tagger");
    Object.defineProperty(exports, "ShimReferenceTagger", { enumerable: true, get: function () { return reference_tagger_1.ShimReferenceTagger; } });
    var summary_generator_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/summary_generator");
    Object.defineProperty(exports, "SummaryGenerator", { enumerable: true, get: function () { return summary_generator_1.SummaryGenerator; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS0gsNkVBQTBDO0lBQWxDLHNHQUFBLFdBQVcsT0FBQTtJQUNuQiw2RUFBdUQ7SUFBL0MsMkdBQUEsZ0JBQWdCLE9BQUE7SUFBRSxpR0FBQSxNQUFNLE9BQUE7SUFDaEMsaUdBQWlIO0lBQXpHLHFIQUFBLGdCQUFnQixPQUFBO0lBQStCLDhIQUFBLHlCQUF5QixPQUFBO0lBQ2hGLCtGQUEyRDtJQUFuRCx1SEFBQSxtQkFBbUIsT0FBQTtJQUMzQixpR0FBeUQ7SUFBakQscUhBQUEsZ0JBQWdCLE9BQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cblxuZXhwb3J0IHtQZXJGaWxlU2hpbUdlbmVyYXRvciwgVG9wTGV2ZWxTaGltR2VuZXJhdG9yfSBmcm9tICcuL2FwaSc7XG5leHBvcnQge1NoaW1BZGFwdGVyfSBmcm9tICcuL3NyYy9hZGFwdGVyJztcbmV4cG9ydCB7Y29weUZpbGVTaGltRGF0YSwgaXNTaGltfSBmcm9tICcuL3NyYy9leHBhbmRvJztcbmV4cG9ydCB7RmFjdG9yeUdlbmVyYXRvciwgRmFjdG9yeUluZm8sIEZhY3RvcnlUcmFja2VyLCBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtfSBmcm9tICcuL3NyYy9mYWN0b3J5X2dlbmVyYXRvcic7XG5leHBvcnQge1NoaW1SZWZlcmVuY2VUYWdnZXJ9IGZyb20gJy4vc3JjL3JlZmVyZW5jZV90YWdnZXInO1xuZXhwb3J0IHtTdW1tYXJ5R2VuZXJhdG9yfSBmcm9tICcuL3NyYy9zdW1tYXJ5X2dlbmVyYXRvcic7XG4iXX0=