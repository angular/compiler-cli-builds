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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator", ["require", "exports", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interface", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var interface_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interface");
    exports.PartialEvaluator = interface_1.PartialEvaluator;
    var result_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result");
    exports.BuiltinFn = result_1.BuiltinFn;
    exports.DynamicValue = result_1.DynamicValue;
    exports.EnumValue = result_1.EnumValue;
    exports.isDynamicValue = result_1.isDynamicValue;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsNkZBQTBFO0lBQXpDLHVDQUFBLGdCQUFnQixDQUFBO0lBQ2pELHVGQUFxSTtJQUE3SCw2QkFBQSxTQUFTLENBQUE7SUFBRSxnQ0FBQSxZQUFZLENBQUE7SUFBRSw2QkFBQSxTQUFTLENBQUE7SUFBdUQsa0NBQUEsY0FBYyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQge0ZvcmVpZ25GdW5jdGlvblJlc29sdmVyLCBQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuL3NyYy9pbnRlcmZhY2UnO1xuZXhwb3J0IHtCdWlsdGluRm4sIER5bmFtaWNWYWx1ZSwgRW51bVZhbHVlLCBSZXNvbHZlZFZhbHVlLCBSZXNvbHZlZFZhbHVlQXJyYXksIFJlc29sdmVkVmFsdWVNYXAsIGlzRHluYW1pY1ZhbHVlfSBmcm9tICcuL3NyYy9yZXN1bHQnO1xuIl19