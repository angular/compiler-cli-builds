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
        define("@angular/compiler-cli/src/ngtsc/shims", ["require", "exports", "@angular/compiler-cli/src/ngtsc/shims/src/adapter", "@angular/compiler-cli/src/ngtsc/shims/src/expando", "@angular/compiler-cli/src/ngtsc/shims/src/factory_generator", "@angular/compiler-cli/src/ngtsc/shims/src/reference_tagger", "@angular/compiler-cli/src/ngtsc/shims/src/summary_generator"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var adapter_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/adapter");
    exports.ShimAdapter = adapter_1.ShimAdapter;
    var expando_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/expando");
    exports.copyFileShimData = expando_1.copyFileShimData;
    exports.isShim = expando_1.isShim;
    var factory_generator_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/factory_generator");
    exports.FactoryGenerator = factory_generator_1.FactoryGenerator;
    exports.generatedFactoryTransform = factory_generator_1.generatedFactoryTransform;
    var reference_tagger_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/reference_tagger");
    exports.ShimReferenceTagger = reference_tagger_1.ShimReferenceTagger;
    var summary_generator_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/summary_generator");
    exports.SummaryGenerator = summary_generator_1.SummaryGenerator;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NoaW1zL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS0gsNkVBQTBDO0lBQWxDLGdDQUFBLFdBQVcsQ0FBQTtJQUNuQiw2RUFBdUQ7SUFBL0MscUNBQUEsZ0JBQWdCLENBQUE7SUFBRSwyQkFBQSxNQUFNLENBQUE7SUFDaEMsaUdBQWlIO0lBQXpHLCtDQUFBLGdCQUFnQixDQUFBO0lBQStCLHdEQUFBLHlCQUF5QixDQUFBO0lBQ2hGLCtGQUEyRDtJQUFuRCxpREFBQSxtQkFBbUIsQ0FBQTtJQUMzQixpR0FBeUQ7SUFBakQsK0NBQUEsZ0JBQWdCLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwibm9kZVwiIC8+XG5cbmV4cG9ydCB7UGVyRmlsZVNoaW1HZW5lcmF0b3IsIFRvcExldmVsU2hpbUdlbmVyYXRvcn0gZnJvbSAnLi9hcGknO1xuZXhwb3J0IHtTaGltQWRhcHRlcn0gZnJvbSAnLi9zcmMvYWRhcHRlcic7XG5leHBvcnQge2NvcHlGaWxlU2hpbURhdGEsIGlzU2hpbX0gZnJvbSAnLi9zcmMvZXhwYW5kbyc7XG5leHBvcnQge0ZhY3RvcnlHZW5lcmF0b3IsIEZhY3RvcnlJbmZvLCBGYWN0b3J5VHJhY2tlciwgZ2VuZXJhdGVkRmFjdG9yeVRyYW5zZm9ybX0gZnJvbSAnLi9zcmMvZmFjdG9yeV9nZW5lcmF0b3InO1xuZXhwb3J0IHtTaGltUmVmZXJlbmNlVGFnZ2VyfSBmcm9tICcuL3NyYy9yZWZlcmVuY2VfdGFnZ2VyJztcbmV4cG9ydCB7U3VtbWFyeUdlbmVyYXRvcn0gZnJvbSAnLi9zcmMvc3VtbWFyeV9nZW5lcmF0b3InO1xuIl19