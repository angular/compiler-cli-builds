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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator", ["require", "exports", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/diagnostics", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interface", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/diagnostics");
    Object.defineProperty(exports, "describeResolvedType", { enumerable: true, get: function () { return diagnostics_1.describeResolvedType; } });
    Object.defineProperty(exports, "traceDynamicValue", { enumerable: true, get: function () { return diagnostics_1.traceDynamicValue; } });
    var dynamic_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic");
    Object.defineProperty(exports, "DynamicValue", { enumerable: true, get: function () { return dynamic_1.DynamicValue; } });
    var interface_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interface");
    Object.defineProperty(exports, "PartialEvaluator", { enumerable: true, get: function () { return interface_1.PartialEvaluator; } });
    var result_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result");
    Object.defineProperty(exports, "EnumValue", { enumerable: true, get: function () { return result_1.EnumValue; } });
    Object.defineProperty(exports, "KnownFn", { enumerable: true, get: function () { return result_1.KnownFn; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhcnRpYWxfZXZhbHVhdG9yL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsaUdBQTBFO0lBQWxFLG1IQUFBLG9CQUFvQixPQUFBO0lBQUUsZ0hBQUEsaUJBQWlCLE9BQUE7SUFDL0MseUZBQTJDO0lBQW5DLHVHQUFBLFlBQVksT0FBQTtJQUNwQiw2RkFBMEU7SUFBekMsNkdBQUEsZ0JBQWdCLE9BQUE7SUFDakQsdUZBQXFHO0lBQTdGLG1HQUFBLFNBQVMsT0FBQTtJQUFFLGlHQUFBLE9BQU8sT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQge2Rlc2NyaWJlUmVzb2x2ZWRUeXBlLCB0cmFjZUR5bmFtaWNWYWx1ZX0gZnJvbSAnLi9zcmMvZGlhZ25vc3RpY3MnO1xuZXhwb3J0IHtEeW5hbWljVmFsdWV9IGZyb20gJy4vc3JjL2R5bmFtaWMnO1xuZXhwb3J0IHtGb3JlaWduRnVuY3Rpb25SZXNvbHZlciwgUGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi9zcmMvaW50ZXJmYWNlJztcbmV4cG9ydCB7RW51bVZhbHVlLCBLbm93bkZuLCBSZXNvbHZlZFZhbHVlLCBSZXNvbHZlZFZhbHVlQXJyYXksIFJlc29sdmVkVmFsdWVNYXB9IGZyb20gJy4vc3JjL3Jlc3VsdCc7XG4iXX0=