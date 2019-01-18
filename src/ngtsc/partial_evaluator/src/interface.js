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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interface", ["require", "exports", "@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var interpreter_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter");
    var PartialEvaluator = /** @class */ (function () {
        function PartialEvaluator(host, checker, refResolver) {
            this.host = host;
            this.checker = checker;
            this.refResolver = refResolver;
        }
        PartialEvaluator.prototype.evaluate = function (expr, foreignFunctionResolver) {
            var interpreter = new interpreter_1.StaticInterpreter(this.host, this.checker, this.refResolver);
            return interpreter.visit(expr, {
                absoluteModuleName: null,
                resolutionContext: expr.getSourceFile().fileName,
                scope: new Map(), foreignFunctionResolver: foreignFunctionResolver,
            });
        };
        return PartialEvaluator;
    }());
    exports.PartialEvaluator = PartialEvaluator;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJmYWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvci9zcmMvaW50ZXJmYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBT0gsaUdBQWdEO0lBT2hEO1FBQ0UsMEJBQ1ksSUFBb0IsRUFBVSxPQUF1QixFQUNyRCxXQUE4QjtZQUQ5QixTQUFJLEdBQUosSUFBSSxDQUFnQjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQ3JELGdCQUFXLEdBQVgsV0FBVyxDQUFtQjtRQUFHLENBQUM7UUFFOUMsbUNBQVEsR0FBUixVQUFTLElBQW1CLEVBQUUsdUJBQWlEO1lBQzdFLElBQU0sV0FBVyxHQUFHLElBQUksK0JBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNyRixPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFO2dCQUM3QixrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixpQkFBaUIsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUTtnQkFDaEQsS0FBSyxFQUFFLElBQUksR0FBRyxFQUEwQyxFQUFFLHVCQUF1Qix5QkFBQTthQUNsRixDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBYkQsSUFhQztJQWJZLDRDQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlLCBSZWZlcmVuY2VSZXNvbHZlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtTdGF0aWNJbnRlcnByZXRlcn0gZnJvbSAnLi9pbnRlcnByZXRlcic7XG5pbXBvcnQge1Jlc29sdmVkVmFsdWV9IGZyb20gJy4vcmVzdWx0JztcblxuZXhwb3J0IHR5cGUgRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIgPVxuICAgIChub2RlOiBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbj4sIGFyZ3M6IHRzLkV4cHJlc3Npb25bXSkgPT5cbiAgICAgICAgdHMuRXhwcmVzc2lvbiB8IG51bGw7XG5cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsRXZhbHVhdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSByZWZSZXNvbHZlcjogUmVmZXJlbmNlUmVzb2x2ZXIpIHt9XG5cbiAgZXZhbHVhdGUoZXhwcjogdHMuRXhwcmVzc2lvbiwgZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXI/OiBGb3JlaWduRnVuY3Rpb25SZXNvbHZlcik6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGludGVycHJldGVyID0gbmV3IFN0YXRpY0ludGVycHJldGVyKHRoaXMuaG9zdCwgdGhpcy5jaGVja2VyLCB0aGlzLnJlZlJlc29sdmVyKTtcbiAgICByZXR1cm4gaW50ZXJwcmV0ZXIudmlzaXQoZXhwciwge1xuICAgICAgYWJzb2x1dGVNb2R1bGVOYW1lOiBudWxsLFxuICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IGV4cHIuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lLFxuICAgICAgc2NvcGU6IG5ldyBNYXA8dHMuUGFyYW1ldGVyRGVjbGFyYXRpb24sIFJlc29sdmVkVmFsdWU+KCksIGZvcmVpZ25GdW5jdGlvblJlc29sdmVyLFxuICAgIH0pO1xuICB9XG59XG4iXX0=