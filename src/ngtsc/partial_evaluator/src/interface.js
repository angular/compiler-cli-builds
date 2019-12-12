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
        function PartialEvaluator(host, checker, dependencyTracker) {
            this.host = host;
            this.checker = checker;
            this.dependencyTracker = dependencyTracker;
        }
        PartialEvaluator.prototype.evaluate = function (expr, foreignFunctionResolver) {
            var interpreter = new interpreter_1.StaticInterpreter(this.host, this.checker, this.dependencyTracker);
            return interpreter.visit(expr, {
                originatingFile: expr.getSourceFile(),
                absoluteModuleName: null,
                resolutionContext: expr.getSourceFile().fileName,
                scope: new Map(), foreignFunctionResolver: foreignFunctionResolver,
            });
        };
        return PartialEvaluator;
    }());
    exports.PartialEvaluator = PartialEvaluator;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJmYWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvci9zcmMvaW50ZXJmYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBUUgsaUdBQWdEO0lBT2hEO1FBQ0UsMEJBQ1ksSUFBb0IsRUFBVSxPQUF1QixFQUNyRCxpQkFBeUM7WUFEekMsU0FBSSxHQUFKLElBQUksQ0FBZ0I7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUNyRCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQXdCO1FBQUcsQ0FBQztRQUV6RCxtQ0FBUSxHQUFSLFVBQVMsSUFBbUIsRUFBRSx1QkFBaUQ7WUFDN0UsSUFBTSxXQUFXLEdBQUcsSUFBSSwrQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDM0YsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtnQkFDN0IsZUFBZSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ3JDLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLGlCQUFpQixFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRO2dCQUNoRCxLQUFLLEVBQUUsSUFBSSxHQUFHLEVBQTBDLEVBQUUsdUJBQXVCLHlCQUFBO2FBQ2xGLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDSCx1QkFBQztJQUFELENBQUMsQUFkRCxJQWNDO0lBZFksNENBQWdCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEZXBlbmRlbmN5VHJhY2tlcn0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvYXBpJztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge1N0YXRpY0ludGVycHJldGVyfSBmcm9tICcuL2ludGVycHJldGVyJztcbmltcG9ydCB7UmVzb2x2ZWRWYWx1ZX0gZnJvbSAnLi9yZXN1bHQnO1xuXG5leHBvcnQgdHlwZSBGb3JlaWduRnVuY3Rpb25SZXNvbHZlciA9XG4gICAgKG5vZGU6IFJlZmVyZW5jZTx0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbj4sXG4gICAgIGFyZ3M6IFJlYWRvbmx5QXJyYXk8dHMuRXhwcmVzc2lvbj4pID0+IHRzLkV4cHJlc3Npb24gfCBudWxsO1xuXG5leHBvcnQgY2xhc3MgUGFydGlhbEV2YWx1YXRvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBob3N0OiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgZGVwZW5kZW5jeVRyYWNrZXI6IERlcGVuZGVuY3lUcmFja2VyfG51bGwpIHt9XG5cbiAgZXZhbHVhdGUoZXhwcjogdHMuRXhwcmVzc2lvbiwgZm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXI/OiBGb3JlaWduRnVuY3Rpb25SZXNvbHZlcik6IFJlc29sdmVkVmFsdWUge1xuICAgIGNvbnN0IGludGVycHJldGVyID0gbmV3IFN0YXRpY0ludGVycHJldGVyKHRoaXMuaG9zdCwgdGhpcy5jaGVja2VyLCB0aGlzLmRlcGVuZGVuY3lUcmFja2VyKTtcbiAgICByZXR1cm4gaW50ZXJwcmV0ZXIudmlzaXQoZXhwciwge1xuICAgICAgb3JpZ2luYXRpbmdGaWxlOiBleHByLmdldFNvdXJjZUZpbGUoKSxcbiAgICAgIGFic29sdXRlTW9kdWxlTmFtZTogbnVsbCxcbiAgICAgIHJlc29sdXRpb25Db250ZXh0OiBleHByLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSxcbiAgICAgIHNjb3BlOiBuZXcgTWFwPHRzLlBhcmFtZXRlckRlY2xhcmF0aW9uLCBSZXNvbHZlZFZhbHVlPigpLCBmb3JlaWduRnVuY3Rpb25SZXNvbHZlcixcbiAgICB9KTtcbiAgfVxufVxuIl19