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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/builtin", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ObjectAssignBuiltinFn = exports.ArrayConcatBuiltinFn = exports.ArraySliceBuiltinFn = void 0;
    var tslib_1 = require("tslib");
    var dynamic_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic");
    var result_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result");
    var ArraySliceBuiltinFn = /** @class */ (function (_super) {
        tslib_1.__extends(ArraySliceBuiltinFn, _super);
        function ArraySliceBuiltinFn(lhs) {
            var _this = _super.call(this) || this;
            _this.lhs = lhs;
            return _this;
        }
        ArraySliceBuiltinFn.prototype.evaluate = function (node, args) {
            if (args.length === 0) {
                return this.lhs;
            }
            else {
                return dynamic_1.DynamicValue.fromUnknown(node);
            }
        };
        return ArraySliceBuiltinFn;
    }(result_1.KnownFn));
    exports.ArraySliceBuiltinFn = ArraySliceBuiltinFn;
    var ArrayConcatBuiltinFn = /** @class */ (function (_super) {
        tslib_1.__extends(ArrayConcatBuiltinFn, _super);
        function ArrayConcatBuiltinFn(lhs) {
            var _this = _super.call(this) || this;
            _this.lhs = lhs;
            return _this;
        }
        ArrayConcatBuiltinFn.prototype.evaluate = function (node, args) {
            var e_1, _a;
            var result = tslib_1.__spread(this.lhs);
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
        return ArrayConcatBuiltinFn;
    }(result_1.KnownFn));
    exports.ArrayConcatBuiltinFn = ArrayConcatBuiltinFn;
    var ObjectAssignBuiltinFn = /** @class */ (function (_super) {
        tslib_1.__extends(ObjectAssignBuiltinFn, _super);
        function ObjectAssignBuiltinFn() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ObjectAssignBuiltinFn.prototype.evaluate = function (node, args) {
            var e_2, _a, e_3, _b;
            if (args.length === 0) {
                return dynamic_1.DynamicValue.fromUnsupportedSyntax(node);
            }
            try {
                for (var args_2 = tslib_1.__values(args), args_2_1 = args_2.next(); !args_2_1.done; args_2_1 = args_2.next()) {
                    var arg = args_2_1.value;
                    if (arg instanceof dynamic_1.DynamicValue) {
                        return dynamic_1.DynamicValue.fromDynamicInput(node, arg);
                    }
                    else if (!(arg instanceof Map)) {
                        return dynamic_1.DynamicValue.fromUnsupportedSyntax(node);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (args_2_1 && !args_2_1.done && (_a = args_2.return)) _a.call(args_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
            var _c = tslib_1.__read(args), target = _c[0], sources = _c.slice(1);
            try {
                for (var sources_1 = tslib_1.__values(sources), sources_1_1 = sources_1.next(); !sources_1_1.done; sources_1_1 = sources_1.next()) {
                    var source = sources_1_1.value;
                    source.forEach(function (value, key) { return target.set(key, value); });
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (sources_1_1 && !sources_1_1.done && (_b = sources_1.return)) _b.call(sources_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return target;
        };
        return ObjectAssignBuiltinFn;
    }(result_1.KnownFn));
    exports.ObjectAssignBuiltinFn = ObjectAssignBuiltinFn;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbHRpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3Ivc3JjL2J1aWx0aW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUlILHlGQUF1QztJQUN2Qyx1RkFBb0U7SUFFcEU7UUFBeUMsK0NBQU87UUFDOUMsNkJBQW9CLEdBQXVCO1lBQTNDLFlBQ0UsaUJBQU8sU0FDUjtZQUZtQixTQUFHLEdBQUgsR0FBRyxDQUFvQjs7UUFFM0MsQ0FBQztRQUVELHNDQUFRLEdBQVIsVUFBUyxJQUF1QixFQUFFLElBQXdCO1lBQ3hELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3JCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQzthQUNqQjtpQkFBTTtnQkFDTCxPQUFPLHNCQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ3ZDO1FBQ0gsQ0FBQztRQUNILDBCQUFDO0lBQUQsQ0FBQyxBQVpELENBQXlDLGdCQUFPLEdBWS9DO0lBWlksa0RBQW1CO0lBY2hDO1FBQTBDLGdEQUFPO1FBQy9DLDhCQUFvQixHQUF1QjtZQUEzQyxZQUNFLGlCQUFPLFNBQ1I7WUFGbUIsU0FBRyxHQUFILEdBQUcsQ0FBb0I7O1FBRTNDLENBQUM7UUFFRCx1Q0FBUSxHQUFSLFVBQVMsSUFBdUIsRUFBRSxJQUF3Qjs7WUFDeEQsSUFBTSxNQUFNLG9CQUEyQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7O2dCQUNqRCxLQUFrQixJQUFBLFNBQUEsaUJBQUEsSUFBSSxDQUFBLDBCQUFBLDRDQUFFO29CQUFuQixJQUFNLEdBQUcsaUJBQUE7b0JBQ1osSUFBSSxHQUFHLFlBQVksc0JBQVksRUFBRTt3QkFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxzQkFBWSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO3FCQUN2RDt5QkFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7d0JBQzdCLE1BQU0sQ0FBQyxJQUFJLE9BQVgsTUFBTSxtQkFBUyxHQUFHLEdBQUU7cUJBQ3JCO3lCQUFNO3dCQUNMLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2xCO2lCQUNGOzs7Ozs7Ozs7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBbEJELENBQTBDLGdCQUFPLEdBa0JoRDtJQWxCWSxvREFBb0I7SUFvQmpDO1FBQTJDLGlEQUFPO1FBQWxEOztRQWtCQSxDQUFDO1FBakJDLHdDQUFRLEdBQVIsVUFBUyxJQUF1QixFQUFFLElBQXdCOztZQUN4RCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUNyQixPQUFPLHNCQUFZLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDakQ7O2dCQUNELEtBQWtCLElBQUEsU0FBQSxpQkFBQSxJQUFJLENBQUEsMEJBQUEsNENBQUU7b0JBQW5CLElBQU0sR0FBRyxpQkFBQTtvQkFDWixJQUFJLEdBQUcsWUFBWSxzQkFBWSxFQUFFO3dCQUMvQixPQUFPLHNCQUFZLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO3FCQUNqRDt5QkFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLFlBQVksR0FBRyxDQUFDLEVBQUU7d0JBQ2hDLE9BQU8sc0JBQVksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDakQ7aUJBQ0Y7Ozs7Ozs7OztZQUNLLElBQUEsS0FBQSxlQUF1QixJQUFvQyxDQUFBLEVBQTFELE1BQU0sUUFBQSxFQUFLLE9BQU8sY0FBd0MsQ0FBQzs7Z0JBQ2xFLEtBQXFCLElBQUEsWUFBQSxpQkFBQSxPQUFPLENBQUEsZ0NBQUEscURBQUU7b0JBQXpCLElBQU0sTUFBTSxvQkFBQTtvQkFDZixNQUFNLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSyxPQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUF0QixDQUFzQixDQUFDLENBQUM7aUJBQ3hEOzs7Ozs7Ozs7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBbEJELENBQTJDLGdCQUFPLEdBa0JqRDtJQWxCWSxzREFBcUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0R5bmFtaWNWYWx1ZX0gZnJvbSAnLi9keW5hbWljJztcbmltcG9ydCB7S25vd25GbiwgUmVzb2x2ZWRWYWx1ZSwgUmVzb2x2ZWRWYWx1ZUFycmF5fSBmcm9tICcuL3Jlc3VsdCc7XG5cbmV4cG9ydCBjbGFzcyBBcnJheVNsaWNlQnVpbHRpbkZuIGV4dGVuZHMgS25vd25GbiB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbGhzOiBSZXNvbHZlZFZhbHVlQXJyYXkpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgZXZhbHVhdGUobm9kZTogdHMuQ2FsbEV4cHJlc3Npb24sIGFyZ3M6IFJlc29sdmVkVmFsdWVBcnJheSk6IFJlc29sdmVkVmFsdWUge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXMubGhzO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gRHluYW1pY1ZhbHVlLmZyb21Vbmtub3duKG5vZGUpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQXJyYXlDb25jYXRCdWlsdGluRm4gZXh0ZW5kcyBLbm93bkZuIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBsaHM6IFJlc29sdmVkVmFsdWVBcnJheSkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBldmFsdWF0ZShub2RlOiB0cy5DYWxsRXhwcmVzc2lvbiwgYXJnczogUmVzb2x2ZWRWYWx1ZUFycmF5KTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgcmVzdWx0OiBSZXNvbHZlZFZhbHVlQXJyYXkgPSBbLi4udGhpcy5saHNdO1xuICAgIGZvciAoY29uc3QgYXJnIG9mIGFyZ3MpIHtcbiAgICAgIGlmIChhcmcgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goRHluYW1pY1ZhbHVlLmZyb21EeW5hbWljSW5wdXQobm9kZSwgYXJnKSk7XG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkge1xuICAgICAgICByZXN1bHQucHVzaCguLi5hcmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0LnB1c2goYXJnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgT2JqZWN0QXNzaWduQnVpbHRpbkZuIGV4dGVuZHMgS25vd25GbiB7XG4gIGV2YWx1YXRlKG5vZGU6IHRzLkNhbGxFeHByZXNzaW9uLCBhcmdzOiBSZXNvbHZlZFZhbHVlQXJyYXkpOiBSZXNvbHZlZFZhbHVlIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbVVuc3VwcG9ydGVkU3ludGF4KG5vZGUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGFyZyBvZiBhcmdzKSB7XG4gICAgICBpZiAoYXJnIGluc3RhbmNlb2YgRHluYW1pY1ZhbHVlKSB7XG4gICAgICAgIHJldHVybiBEeW5hbWljVmFsdWUuZnJvbUR5bmFtaWNJbnB1dChub2RlLCBhcmcpO1xuICAgICAgfSBlbHNlIGlmICghKGFyZyBpbnN0YW5jZW9mIE1hcCkpIHtcbiAgICAgICAgcmV0dXJuIER5bmFtaWNWYWx1ZS5mcm9tVW5zdXBwb3J0ZWRTeW50YXgobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IFt0YXJnZXQsIC4uLnNvdXJjZXNdID0gYXJncyBhcyBNYXA8c3RyaW5nLCBSZXNvbHZlZFZhbHVlPltdO1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMpIHtcbiAgICAgIHNvdXJjZS5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB0YXJnZXQuc2V0KGtleSwgdmFsdWUpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxufVxuIl19