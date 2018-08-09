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
        define("@angular/compiler-cli/src/ngtsc/factories", ["require", "exports", "@angular/compiler-cli/src/ngtsc/factories/src/generator", "@angular/compiler-cli/src/ngtsc/factories/src/host", "@angular/compiler-cli/src/ngtsc/factories/src/transform"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var generator_1 = require("@angular/compiler-cli/src/ngtsc/factories/src/generator");
    exports.FactoryGenerator = generator_1.FactoryGenerator;
    var host_1 = require("@angular/compiler-cli/src/ngtsc/factories/src/host");
    exports.GeneratedFactoryHostWrapper = host_1.GeneratedFactoryHostWrapper;
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/factories/src/transform");
    exports.generatedFactoryTransform = transform_1.generatedFactoryTransform;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZhY3Rvcmllcy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHFGQUFpRDtJQUF6Qyx1Q0FBQSxnQkFBZ0IsQ0FBQTtJQUN4QiwyRUFBdUQ7SUFBL0MsNkNBQUEsMkJBQTJCLENBQUE7SUFDbkMscUZBQXVFO0lBQWxELGdEQUFBLHlCQUF5QixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQge0ZhY3RvcnlHZW5lcmF0b3J9IGZyb20gJy4vc3JjL2dlbmVyYXRvcic7XG5leHBvcnQge0dlbmVyYXRlZEZhY3RvcnlIb3N0V3JhcHBlcn0gZnJvbSAnLi9zcmMvaG9zdCc7XG5leHBvcnQge0ZhY3RvcnlJbmZvLCBnZW5lcmF0ZWRGYWN0b3J5VHJhbnNmb3JtfSBmcm9tICcuL3NyYy90cmFuc2Zvcm0nO1xuIl19