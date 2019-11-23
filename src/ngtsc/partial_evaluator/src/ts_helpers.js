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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/ts_helpers", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var dynamic_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic");
    function evaluateTsHelperInline(helper, node, args) {
        switch (helper) {
            case reflection_1.TsHelperFn.Spread:
            case reflection_1.TsHelperFn.SpreadArrays:
                return evaluateTsSpreadHelper(node, args);
            default:
                throw new Error("Cannot evaluate unknown helper " + helper + " inline");
        }
    }
    exports.evaluateTsHelperInline = evaluateTsHelperInline;
    function evaluateTsSpreadHelper(node, args) {
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
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNfaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3Ivc3JjL3RzX2hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUgseUVBQTRDO0lBRTVDLHlGQUF1QztJQUd2QyxTQUFnQixzQkFBc0IsQ0FDbEMsTUFBa0IsRUFBRSxJQUFhLEVBQUUsSUFBd0I7UUFDN0QsUUFBUSxNQUFNLEVBQUU7WUFDZCxLQUFLLHVCQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3ZCLEtBQUssdUJBQVUsQ0FBQyxZQUFZO2dCQUMxQixPQUFPLHNCQUFzQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1QztnQkFDRSxNQUFNLElBQUksS0FBSyxDQUFDLG9DQUFrQyxNQUFNLFlBQVMsQ0FBQyxDQUFDO1NBQ3RFO0lBQ0gsQ0FBQztJQVRELHdEQVNDO0lBRUQsU0FBUyxzQkFBc0IsQ0FBQyxJQUFhLEVBQUUsSUFBd0I7O1FBQ3JFLElBQU0sTUFBTSxHQUF1QixFQUFFLENBQUM7O1lBQ3RDLEtBQWtCLElBQUEsU0FBQSxpQkFBQSxJQUFJLENBQUEsMEJBQUEsNENBQUU7Z0JBQW5CLElBQU0sR0FBRyxpQkFBQTtnQkFDWixJQUFJLEdBQUcsWUFBWSxzQkFBWSxFQUFFO29CQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFZLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7aUJBQ3ZEO3FCQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDN0IsTUFBTSxDQUFDLElBQUksT0FBWCxNQUFNLG1CQUFTLEdBQUcsR0FBRTtpQkFDckI7cUJBQU07b0JBQ0wsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDbEI7YUFDRjs7Ozs7Ozs7O1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7VHNIZWxwZXJGbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7RHluYW1pY1ZhbHVlfSBmcm9tICcuL2R5bmFtaWMnO1xuaW1wb3J0IHtSZXNvbHZlZFZhbHVlLCBSZXNvbHZlZFZhbHVlQXJyYXl9IGZyb20gJy4vcmVzdWx0JztcblxuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlVHNIZWxwZXJJbmxpbmUoXG4gICAgaGVscGVyOiBUc0hlbHBlckZuLCBub2RlOiB0cy5Ob2RlLCBhcmdzOiBSZXNvbHZlZFZhbHVlQXJyYXkpOiBSZXNvbHZlZFZhbHVlIHtcbiAgc3dpdGNoIChoZWxwZXIpIHtcbiAgICBjYXNlIFRzSGVscGVyRm4uU3ByZWFkOlxuICAgIGNhc2UgVHNIZWxwZXJGbi5TcHJlYWRBcnJheXM6XG4gICAgICByZXR1cm4gZXZhbHVhdGVUc1NwcmVhZEhlbHBlcihub2RlLCBhcmdzKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgZXZhbHVhdGUgdW5rbm93biBoZWxwZXIgJHtoZWxwZXJ9IGlubGluZWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV2YWx1YXRlVHNTcHJlYWRIZWxwZXIobm9kZTogdHMuTm9kZSwgYXJnczogUmVzb2x2ZWRWYWx1ZUFycmF5KTogUmVzb2x2ZWRWYWx1ZUFycmF5IHtcbiAgY29uc3QgcmVzdWx0OiBSZXNvbHZlZFZhbHVlQXJyYXkgPSBbXTtcbiAgZm9yIChjb25zdCBhcmcgb2YgYXJncykge1xuICAgIGlmIChhcmcgaW5zdGFuY2VvZiBEeW5hbWljVmFsdWUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKER5bmFtaWNWYWx1ZS5mcm9tRHluYW1pY0lucHV0KG5vZGUsIGFyZykpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShhcmcpKSB7XG4gICAgICByZXN1bHQucHVzaCguLi5hcmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucHVzaChhcmcpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19