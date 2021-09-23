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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/ts_helpers", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReadHelperFn = exports.SpreadArrayHelperFn = exports.SpreadHelperFn = exports.AssignHelperFn = void 0;
    var tslib_1 = require("tslib");
    var builtin_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin");
    var dynamic_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic");
    var result_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result");
    // Use the same implementation we use for `Object.assign()`. Semantically these functions are the
    // same, so they can also share the same evaluation code.
    var AssignHelperFn = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(AssignHelperFn, _super);
        function AssignHelperFn() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return AssignHelperFn;
    }(builtin_1.ObjectAssignBuiltinFn));
    exports.AssignHelperFn = AssignHelperFn;
    // Used for both `__spread()` and `__spreadArrays()` TypeScript helper functions.
    var SpreadHelperFn = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(SpreadHelperFn, _super);
        function SpreadHelperFn() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SpreadHelperFn.prototype.evaluate = function (node, args) {
            var e_1, _a;
            var result = [];
            try {
                for (var args_1 = (0, tslib_1.__values)(args), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
                    var arg = args_1_1.value;
                    if (arg instanceof dynamic_1.DynamicValue) {
                        result.push(dynamic_1.DynamicValue.fromDynamicInput(node, arg));
                    }
                    else if (Array.isArray(arg)) {
                        result.push.apply(result, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(arg), false));
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
    // Used for `__spreadArray` TypeScript helper function.
    var SpreadArrayHelperFn = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(SpreadArrayHelperFn, _super);
        function SpreadArrayHelperFn() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SpreadArrayHelperFn.prototype.evaluate = function (node, args) {
            if (args.length !== 2) {
                return dynamic_1.DynamicValue.fromUnknown(node);
            }
            var _a = (0, tslib_1.__read)(args, 2), to = _a[0], from = _a[1];
            if (to instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, to);
            }
            else if (from instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, from);
            }
            if (!Array.isArray(to)) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node, to);
            }
            else if (!Array.isArray(from)) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node, from);
            }
            return to.concat(from);
        };
        return SpreadArrayHelperFn;
    }(result_1.KnownFn));
    exports.SpreadArrayHelperFn = SpreadArrayHelperFn;
    // Used for `__read` TypeScript helper function.
    var ReadHelperFn = /** @class */ (function (_super) {
        (0, tslib_1.__extends)(ReadHelperFn, _super);
        function ReadHelperFn() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ReadHelperFn.prototype.evaluate = function (node, args) {
            if (args.length !== 1) {
                // The `__read` helper accepts a second argument `n` but that case is not supported.
                return dynamic_1.DynamicValue.fromUnknown(node);
            }
            var _a = (0, tslib_1.__read)(args, 1), value = _a[0];
            if (value instanceof dynamic_1.DynamicValue) {
                return dynamic_1.DynamicValue.fromDynamicInput(node, value);
            }
            if (!Array.isArray(value)) {
                return dynamic_1.DynamicValue.fromInvalidExpressionType(node, value);
            }
            return value;
        };
        return ReadHelperFn;
    }(result_1.KnownFn));
    exports.ReadHelperFn = ReadHelperFn;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3Ivc3JjL3RzX2hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUlILHlGQUFnRDtJQUNoRCx5RkFBdUM7SUFDdkMsdUZBQW9FO0lBR3BFLGlHQUFpRztJQUNqRyx5REFBeUQ7SUFDekQ7UUFBb0MsK0NBQXFCO1FBQXpEOztRQUEyRCxDQUFDO1FBQUQscUJBQUM7SUFBRCxDQUFDLEFBQTVELENBQW9DLCtCQUFxQixHQUFHO0lBQS9DLHdDQUFjO0lBRTNCLGlGQUFpRjtJQUNqRjtRQUFvQywrQ0FBTztRQUEzQzs7UUFnQkEsQ0FBQztRQWZVLGlDQUFRLEdBQWpCLFVBQWtCLElBQWEsRUFBRSxJQUF3Qjs7WUFDdkQsSUFBTSxNQUFNLEdBQXVCLEVBQUUsQ0FBQzs7Z0JBRXRDLEtBQWtCLElBQUEsU0FBQSxzQkFBQSxJQUFJLENBQUEsMEJBQUEsNENBQUU7b0JBQW5CLElBQU0sR0FBRyxpQkFBQTtvQkFDWixJQUFJLEdBQUcsWUFBWSxzQkFBWSxFQUFFO3dCQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFZLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7cUJBQ3ZEO3lCQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTt3QkFDN0IsTUFBTSxDQUFDLElBQUksT0FBWCxNQUFNLHFEQUFTLEdBQUcsV0FBRTtxQkFDckI7eUJBQU07d0JBQ0wsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDbEI7aUJBQ0Y7Ozs7Ozs7OztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUFoQkQsQ0FBb0MsZ0JBQU8sR0FnQjFDO0lBaEJZLHdDQUFjO0lBa0IzQix1REFBdUQ7SUFDdkQ7UUFBeUMsb0RBQU87UUFBaEQ7O1FBcUJBLENBQUM7UUFwQlUsc0NBQVEsR0FBakIsVUFBa0IsSUFBYSxFQUFFLElBQXdCO1lBQ3ZELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3JCLE9BQU8sc0JBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkM7WUFFSyxJQUFBLEtBQUEsb0JBQWEsSUFBSSxJQUFBLEVBQWhCLEVBQUUsUUFBQSxFQUFFLElBQUksUUFBUSxDQUFDO1lBQ3hCLElBQUksRUFBRSxZQUFZLHNCQUFZLEVBQUU7Z0JBQzlCLE9BQU8sc0JBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDaEQ7aUJBQU0sSUFBSSxJQUFJLFlBQVksc0JBQVksRUFBRTtnQkFDdkMsT0FBTyxzQkFBWSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNsRDtZQUVELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUN0QixPQUFPLHNCQUFZLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ3pEO2lCQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMvQixPQUFPLHNCQUFZLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzNEO1lBRUQsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLENBQUM7UUFDSCwwQkFBQztJQUFELENBQUMsQUFyQkQsQ0FBeUMsZ0JBQU8sR0FxQi9DO0lBckJZLGtEQUFtQjtJQXVCaEMsZ0RBQWdEO0lBQ2hEO1FBQWtDLDZDQUFPO1FBQXpDOztRQWtCQSxDQUFDO1FBakJVLCtCQUFRLEdBQWpCLFVBQWtCLElBQWEsRUFBRSxJQUF3QjtZQUN2RCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNyQixvRkFBb0Y7Z0JBQ3BGLE9BQU8sc0JBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkM7WUFFSyxJQUFBLEtBQUEsb0JBQVUsSUFBSSxJQUFBLEVBQWIsS0FBSyxRQUFRLENBQUM7WUFDckIsSUFBSSxLQUFLLFlBQVksc0JBQVksRUFBRTtnQkFDakMsT0FBTyxzQkFBWSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQzthQUNuRDtZQUVELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN6QixPQUFPLHNCQUFZLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQzVEO1lBRUQsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0gsbUJBQUM7SUFBRCxDQUFDLEFBbEJELENBQWtDLGdCQUFPLEdBa0J4QztJQWxCWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtPYmplY3RBc3NpZ25CdWlsdGluRm59IGZyb20gJy4vYnVpbHRpbic7XG5pbXBvcnQge0R5bmFtaWNWYWx1ZX0gZnJvbSAnLi9keW5hbWljJztcbmltcG9ydCB7S25vd25GbiwgUmVzb2x2ZWRWYWx1ZSwgUmVzb2x2ZWRWYWx1ZUFycmF5fSBmcm9tICcuL3Jlc3VsdCc7XG5cblxuLy8gVXNlIHRoZSBzYW1lIGltcGxlbWVudGF0aW9uIHdlIHVzZSBmb3IgYE9iamVjdC5hc3NpZ24oKWAuIFNlbWFudGljYWxseSB0aGVzZSBmdW5jdGlvbnMgYXJlIHRoZVxuLy8gc2FtZSwgc28gdGhleSBjYW4gYWxzbyBzaGFyZSB0aGUgc2FtZSBldmFsdWF0aW9uIGNvZGUuXG5leHBvcnQgY2xhc3MgQXNzaWduSGVscGVyRm4gZXh0ZW5kcyBPYmplY3RBc3NpZ25CdWlsdGluRm4ge31cblxuLy8gVXNlZCBmb3IgYm90aCBgX19zcHJlYWQoKWAgYW5kIGBfX3NwcmVhZEFycmF5cygpYCBUeXBlU2NyaXB0IGhlbHBlciBmdW5jdGlvbnMuXG5leHBvcnQgY2xhc3MgU3ByZWFkSGVscGVyRm4gZXh0ZW5kcyBLbm93bkZuIHtcbiAgb3ZlcnJpZGUgZXZhbHVhdGUobm9kZTogdHMuTm9kZSwgYXJnczogUmVzb2x2ZWRWYWx1ZUFycmF5KTogUmVzb2x2ZWRWYWx1ZUFycmF5IHtcbiAgICBjb25zdCByZXN1bHQ6IFJlc29sdmVkVmFsdWVBcnJheSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBhcmcgb2YgYXJncykge1xuICAgICAgaWYgKGFyZyBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgICByZXN1bHQucHVzaChEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBhcmcpKTtcbiAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShhcmcpKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKC4uLmFyZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHQucHVzaChhcmcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxuLy8gVXNlZCBmb3IgYF9fc3ByZWFkQXJyYXlgIFR5cGVTY3JpcHQgaGVscGVyIGZ1bmN0aW9uLlxuZXhwb3J0IGNsYXNzIFNwcmVhZEFycmF5SGVscGVyRm4gZXh0ZW5kcyBLbm93bkZuIHtcbiAgb3ZlcnJpZGUgZXZhbHVhdGUobm9kZTogdHMuTm9kZSwgYXJnczogUmVzb2x2ZWRWYWx1ZUFycmF5KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoICE9PSAyKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKG5vZGUpO1xuICAgIH1cblxuICAgIGNvbnN0IFt0bywgZnJvbV0gPSBhcmdzO1xuICAgIGlmICh0byBpbnN0YW5jZW9mIER5bmFtaWNWYWx1ZSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIHRvKTtcbiAgICB9IGVsc2UgaWYgKGZyb20gaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBmcm9tKTtcbiAgICB9XG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodG8pKSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZSwgdG8pO1xuICAgIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoZnJvbSkpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlLCBmcm9tKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdG8uY29uY2F0KGZyb20pO1xuICB9XG59XG5cbi8vIFVzZWQgZm9yIGBfX3JlYWRgIFR5cGVTY3JpcHQgaGVscGVyIGZ1bmN0aW9uLlxuZXhwb3J0IGNsYXNzIFJlYWRIZWxwZXJGbiBleHRlbmRzIEtub3duRm4ge1xuICBvdmVycmlkZSBldmFsdWF0ZShub2RlOiB0cy5Ob2RlLCBhcmdzOiBSZXNvbHZlZFZhbHVlQXJyYXkpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBpZiAoYXJncy5sZW5ndGggIT09IDEpIHtcbiAgICAgIC8vIFRoZSBgX19yZWFkYCBoZWxwZXIgYWNjZXB0cyBhIHNlY29uZCBhcmd1bWVudCBgbmAgYnV0IHRoYXQgY2FzZSBpcyBub3Qgc3VwcG9ydGVkLlxuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5rbm93bihub2RlKTtcbiAgICB9XG5cbiAgICBjb25zdCBbdmFsdWVdID0gYXJncztcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKG5vZGUsIHZhbHVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cbiJdfQ==