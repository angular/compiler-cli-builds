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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJmYWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvci9zcmMvaW50ZXJmYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBT0gsaUdBQWdEO0lBT2hEO1FBQ0UsMEJBQ1ksSUFBb0IsRUFBVSxPQUF1QixFQUNyRCxXQUE4QjtZQUQ5QixTQUFJLEdBQUosSUFBSSxDQUFnQjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQ3JELGdCQUFXLEdBQVgsV0FBVyxDQUFtQjtRQUFHLENBQUM7UUFFOUMsbUNBQVEsR0FBUixVQUFTLElBQW1CLEVBQUUsdUJBQWlEO1lBQzdFLElBQU0sV0FBVyxHQUFHLElBQUksK0JBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNyRixPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFO2dCQUM3QixrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixpQkFBaUIsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUTtnQkFDaEQsS0FBSyxFQUFFLElBQUksR0FBRyxFQUEwQyxFQUFFLHVCQUF1Qix5QkFBQTthQUNsRixDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBYkQsSUFhQztJQWJZLDRDQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlLCBSZWZlcmVuY2VSZXNvbHZlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtTdGF0aWNJbnRlcnByZXRlcn0gZnJvbSAnLi9pbnRlcnByZXRlcic7XG5pbXBvcnQge1Jlc29sdmVkVmFsdWV9IGZyb20gJy4vcmVzdWx0JztcblxuZXhwb3J0IHR5cGUgRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIgPVxuICAgIChub2RlOiBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb24+LFxuICAgICBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+KSA9PiB0cy5FeHByZXNzaW9uIHwgbnVsbDtcblxuZXhwb3J0IGNsYXNzIFBhcnRpYWxFdmFsdWF0b3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaG9zdDogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIHJlZlJlc29sdmVyOiBSZWZlcmVuY2VSZXNvbHZlcikge31cblxuICBldmFsdWF0ZShleHByOiB0cy5FeHByZXNzaW9uLCBmb3JlaWduRnVuY3Rpb25SZXNvbHZlcj86IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyKTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgaW50ZXJwcmV0ZXIgPSBuZXcgU3RhdGljSW50ZXJwcmV0ZXIodGhpcy5ob3N0LCB0aGlzLmNoZWNrZXIsIHRoaXMucmVmUmVzb2x2ZXIpO1xuICAgIHJldHVybiBpbnRlcnByZXRlci52aXNpdChleHByLCB7XG4gICAgICBhYnNvbHV0ZU1vZHVsZU5hbWU6IG51bGwsXG4gICAgICByZXNvbHV0aW9uQ29udGV4dDogZXhwci5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUsXG4gICAgICBzY29wZTogbmV3IE1hcDx0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgUmVzb2x2ZWRWYWx1ZT4oKSwgZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==