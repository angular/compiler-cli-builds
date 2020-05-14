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
    exports.PartialEvaluator = void 0;
    var interpreter_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/interpreter");
    var PartialEvaluator = /** @class */ (function () {
        function PartialEvaluator(host, checker, dependencyTracker) {
            this.host = host;
            this.checker = checker;
            this.dependencyTracker = dependencyTracker;
        }
        PartialEvaluator.prototype.evaluate = function (expr, foreignFunctionResolver) {
            var interpreter = new interpreter_1.StaticInterpreter(this.host, this.checker, this.dependencyTracker);
            var sourceFile = expr.getSourceFile();
            return interpreter.visit(expr, {
                originatingFile: sourceFile,
                absoluteModuleName: null,
                resolutionContext: sourceFile.fileName,
                scope: new Map(),
                foreignFunctionResolver: foreignFunctionResolver,
            });
        };
        return PartialEvaluator;
    }());
    exports.PartialEvaluator = PartialEvaluator;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJmYWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvci9zcmMvaW50ZXJmYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQVFILGlHQUFnRDtJQU9oRDtRQUNFLDBCQUNZLElBQW9CLEVBQVUsT0FBdUIsRUFDckQsaUJBQXlDO1lBRHpDLFNBQUksR0FBSixJQUFJLENBQWdCO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFDckQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUF3QjtRQUFHLENBQUM7UUFFekQsbUNBQVEsR0FBUixVQUFTLElBQW1CLEVBQUUsdUJBQWlEO1lBQzdFLElBQU0sV0FBVyxHQUFHLElBQUksK0JBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzNGLElBQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QyxPQUFPLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFO2dCQUM3QixlQUFlLEVBQUUsVUFBVTtnQkFDM0Isa0JBQWtCLEVBQUUsSUFBSTtnQkFDeEIsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLFFBQVE7Z0JBQ3RDLEtBQUssRUFBRSxJQUFJLEdBQUcsRUFBMEM7Z0JBQ3hELHVCQUF1Qix5QkFBQTthQUN4QixDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBaEJELElBZ0JDO0lBaEJZLDRDQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGVwZW5kZW5jeVRyYWNrZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL2FwaSc7XG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuaW1wb3J0IHtTdGF0aWNJbnRlcnByZXRlcn0gZnJvbSAnLi9pbnRlcnByZXRlcic7XG5pbXBvcnQge1Jlc29sdmVkVmFsdWV9IGZyb20gJy4vcmVzdWx0JztcblxuZXhwb3J0IHR5cGUgRm9yZWlnbkZ1bmN0aW9uUmVzb2x2ZXIgPVxuICAgIChub2RlOiBSZWZlcmVuY2U8dHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb24+LFxuICAgICBhcmdzOiBSZWFkb25seUFycmF5PHRzLkV4cHJlc3Npb24+KSA9PiB0cy5FeHByZXNzaW9ufG51bGw7XG5cbmV4cG9ydCBjbGFzcyBQYXJ0aWFsRXZhbHVhdG9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSBkZXBlbmRlbmN5VHJhY2tlcjogRGVwZW5kZW5jeVRyYWNrZXJ8bnVsbCkge31cblxuICBldmFsdWF0ZShleHByOiB0cy5FeHByZXNzaW9uLCBmb3JlaWduRnVuY3Rpb25SZXNvbHZlcj86IEZvcmVpZ25GdW5jdGlvblJlc29sdmVyKTogUmVzb2x2ZWRWYWx1ZSB7XG4gICAgY29uc3QgaW50ZXJwcmV0ZXIgPSBuZXcgU3RhdGljSW50ZXJwcmV0ZXIodGhpcy5ob3N0LCB0aGlzLmNoZWNrZXIsIHRoaXMuZGVwZW5kZW5jeVRyYWNrZXIpO1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBleHByLmdldFNvdXJjZUZpbGUoKTtcbiAgICByZXR1cm4gaW50ZXJwcmV0ZXIudmlzaXQoZXhwciwge1xuICAgICAgb3JpZ2luYXRpbmdGaWxlOiBzb3VyY2VGaWxlLFxuICAgICAgYWJzb2x1dGVNb2R1bGVOYW1lOiBudWxsLFxuICAgICAgcmVzb2x1dGlvbkNvbnRleHQ6IHNvdXJjZUZpbGUuZmlsZU5hbWUsXG4gICAgICBzY29wZTogbmV3IE1hcDx0cy5QYXJhbWV0ZXJEZWNsYXJhdGlvbiwgUmVzb2x2ZWRWYWx1ZT4oKSxcbiAgICAgIGZvcmVpZ25GdW5jdGlvblJlc29sdmVyLFxuICAgIH0pO1xuICB9XG59XG4iXX0=