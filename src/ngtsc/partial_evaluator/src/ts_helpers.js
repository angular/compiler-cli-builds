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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/ts_helpers", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SpreadHelperFn = exports.AssignHelperFn = void 0;
    var tslib_1 = require("tslib");
    var builtin_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin");
    var dynamic_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic");
    var result_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result");
    // Use the same implementation we use for `Object.assign()`. Semantically these functions are the
    // same, so they can also share the same evaluation code.
    var AssignHelperFn = /** @class */ (function (_super) {
        tslib_1.__extends(AssignHelperFn, _super);
        function AssignHelperFn() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return AssignHelperFn;
    }(builtin_1.ObjectAssignBuiltinFn));
    exports.AssignHelperFn = AssignHelperFn;
    // Used for both `__spread()` and `__spreadArrays()` TypeScript helper functions.
    var SpreadHelperFn = /** @class */ (function (_super) {
        tslib_1.__extends(SpreadHelperFn, _super);
        function SpreadHelperFn() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SpreadHelperFn.prototype.evaluate = function (node, args) {
            var e_1, _a;
            var result = [];
            try {
                for (var args_1 = tslib_1.__values(args), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
                    var arg = args_1_1.value;
                    if (arg instanceof dynamic_1.DynamicValue) {
                        result.push(dynamic_1.DynamicValue.fromDynamicInput(node, arg));
                    }
                    else if (Array.isArray(arg)) {
                        result.push.apply(result, tslib_1.__spread(arg));
                    }
                    else {
                        result.push(arg);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (args_1_1 && !args_1_1.done && (_a = args_1.return)) _a.call(args_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return result;
        };
        return SpreadHelperFn;
    }(result_1.KnownFn));
    exports.SpreadHelperFn = SpreadHelperFn;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3Ivc3JjL3RzX2hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUlILHlGQUFnRDtJQUNoRCx5RkFBdUM7SUFDdkMsdUZBQXFEO0lBR3JELGlHQUFpRztJQUNqRyx5REFBeUQ7SUFDekQ7UUFBb0MsMENBQXFCO1FBQXpEOztRQUEyRCxDQUFDO1FBQUQscUJBQUM7SUFBRCxDQUFDLEFBQTVELENBQW9DLCtCQUFxQixHQUFHO0lBQS9DLHdDQUFjO0lBRTNCLGlGQUFpRjtJQUNqRjtRQUFvQywwQ0FBTztRQUEzQzs7UUFnQkEsQ0FBQztRQWZDLGlDQUFRLEdBQVIsVUFBUyxJQUFhLEVBQUUsSUFBd0I7O1lBQzlDLElBQU0sTUFBTSxHQUF1QixFQUFFLENBQUM7O2dCQUV0QyxLQUFrQixJQUFBLFNBQUEsaUJBQUEsSUFBSSxDQUFBLDBCQUFBLDRDQUFFO29CQUFuQixJQUFNLEdBQUcsaUJBQUE7b0JBQ1osSUFBSSxHQUFHLFlBQVksc0JBQVksRUFBRTt3QkFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxzQkFBWSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO3FCQUN2RDt5QkFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7d0JBQzdCLE1BQU0sQ0FBQyxJQUFJLE9BQVgsTUFBTSxtQkFBUyxHQUFHLEdBQUU7cUJBQ3JCO3lCQUFNO3dCQUNMLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2xCO2lCQUNGOzs7Ozs7Ozs7WUFFRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBaEJELENBQW9DLGdCQUFPLEdBZ0IxQztJQWhCWSx3Q0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7T2JqZWN0QXNzaWduQnVpbHRpbkZufSBmcm9tICcuL2J1aWx0aW4nO1xuaW1wb3J0IHtEeW5hbWljVmFsdWV9IGZyb20gJy4vZHluYW1pYyc7XG5pbXBvcnQge0tub3duRm4sIFJlc29sdmVkVmFsdWVBcnJheX0gZnJvbSAnLi9yZXN1bHQnO1xuXG5cbi8vIFVzZSB0aGUgc2FtZSBpbXBsZW1lbnRhdGlvbiB3ZSB1c2UgZm9yIGBPYmplY3QuYXNzaWduKClgLiBTZW1hbnRpY2FsbHkgdGhlc2UgZnVuY3Rpb25zIGFyZSB0aGVcbi8vIHNhbWUsIHNvIHRoZXkgY2FuIGFsc28gc2hhcmUgdGhlIHNhbWUgZXZhbHVhdGlvbiBjb2RlLlxuZXhwb3J0IGNsYXNzIEFzc2lnbkhlbHBlckZuIGV4dGVuZHMgT2JqZWN0QXNzaWduQnVpbHRpbkZuIHt9XG5cbi8vIFVzZWQgZm9yIGJvdGggYF9fc3ByZWFkKClgIGFuZCBgX19zcHJlYWRBcnJheXMoKWAgVHlwZVNjcmlwdCBoZWxwZXIgZnVuY3Rpb25zLlxuZXhwb3J0IGNsYXNzIFNwcmVhZEhlbHBlckZuIGV4dGVuZHMgS25vd25GbiB7XG4gIGV2YWx1YXRlKG5vZGU6IHRzLk5vZGUsIGFyZ3M6IFJlc29sdmVkVmFsdWVBcnJheSk6IFJlc29sdmVkVmFsdWVBcnJheSB7XG4gICAgY29uc3QgcmVzdWx0OiBSZXNvbHZlZFZhbHVlQXJyYXkgPSBbXTtcblxuICAgIGZvciAoY29uc3QgYXJnIG9mIGFyZ3MpIHtcbiAgICAgIGlmIChhcmcgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgYXJnKSk7XG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkge1xuICAgICAgICByZXN1bHQucHVzaCguLi5hcmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0LnB1c2goYXJnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iXX0=