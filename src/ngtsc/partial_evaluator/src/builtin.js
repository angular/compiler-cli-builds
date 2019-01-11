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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var result_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result");
    var ArraySliceBuiltinFn = /** @class */ (function (_super) {
        tslib_1.__extends(ArraySliceBuiltinFn, _super);
        function ArraySliceBuiltinFn(lhs) {
            var _this = _super.call(this) || this;
            _this.lhs = lhs;
            return _this;
        }
        ArraySliceBuiltinFn.prototype.evaluate = function (args) {
            if (args.length === 0) {
                return this.lhs;
            }
            else {
                return result_1.DYNAMIC_VALUE;
            }
        };
        return ArraySliceBuiltinFn;
    }(result_1.BuiltinFn));
    exports.ArraySliceBuiltinFn = ArraySliceBuiltinFn;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbHRpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3Ivc3JjL2J1aWx0aW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsdUZBQXFGO0lBRXJGO1FBQXlDLCtDQUFTO1FBQ2hELDZCQUFvQixHQUF1QjtZQUEzQyxZQUErQyxpQkFBTyxTQUFHO1lBQXJDLFNBQUcsR0FBSCxHQUFHLENBQW9COztRQUFhLENBQUM7UUFFekQsc0NBQVEsR0FBUixVQUFTLElBQXdCO1lBQy9CLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3JCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQzthQUNqQjtpQkFBTTtnQkFDTCxPQUFPLHNCQUFhLENBQUM7YUFDdEI7UUFDSCxDQUFDO1FBQ0gsMEJBQUM7SUFBRCxDQUFDLEFBVkQsQ0FBeUMsa0JBQVMsR0FVakQ7SUFWWSxrREFBbUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QnVpbHRpbkZuLCBEWU5BTUlDX1ZBTFVFLCBSZXNvbHZlZFZhbHVlLCBSZXNvbHZlZFZhbHVlQXJyYXl9IGZyb20gJy4vcmVzdWx0JztcblxuZXhwb3J0IGNsYXNzIEFycmF5U2xpY2VCdWlsdGluRm4gZXh0ZW5kcyBCdWlsdGluRm4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGxoczogUmVzb2x2ZWRWYWx1ZUFycmF5KSB7IHN1cGVyKCk7IH1cblxuICBldmFsdWF0ZShhcmdzOiBSZXNvbHZlZFZhbHVlQXJyYXkpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzLmxocztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIERZTkFNSUNfVkFMVUU7XG4gICAgfVxuICB9XG59XG4iXX0=