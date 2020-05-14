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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/result", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KnownFn = exports.EnumValue = exports.ResolvedModule = void 0;
    /**
     * A collection of publicly exported declarations from a module. Each declaration is evaluated
     * lazily upon request.
     */
    var ResolvedModule = /** @class */ (function () {
        function ResolvedModule(exports, evaluate) {
            this.exports = exports;
            this.evaluate = evaluate;
        }
        ResolvedModule.prototype.getExport = function (name) {
            if (!this.exports.has(name)) {
                return undefined;
            }
            return this.evaluate(this.exports.get(name));
        };
        ResolvedModule.prototype.getExports = function () {
            var _this = this;
            var map = new Map();
            this.exports.forEach(function (decl, name) {
                map.set(name, _this.evaluate(decl));
            });
            return map;
        };
        return ResolvedModule;
    }());
    exports.ResolvedModule = ResolvedModule;
    /**
     * A value member of an enumeration.
     *
     * Contains a `Reference` to the enumeration itself, and the name of the referenced member.
     */
    var EnumValue = /** @class */ (function () {
        function EnumValue(enumRef, name, resolved) {
            this.enumRef = enumRef;
            this.name = name;
            this.resolved = resolved;
        }
        return EnumValue;
    }());
    exports.EnumValue = EnumValue;
    /**
     * An implementation of a known function that can be statically evaluated.
     * It could be a built-in function or method (such as `Array.prototype.slice`) or a TypeScript
     * helper (such as `__spread`).
     */
    var KnownFn = /** @class */ (function () {
        function KnownFn() {
        }
        return KnownFn;
    }());
    exports.KnownFn = KnownFn;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvci9zcmMvcmVzdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQW9DSDs7O09BR0c7SUFDSDtRQUNFLHdCQUNZLE9BQWlDLEVBQ2pDLFFBQThDO1lBRDlDLFlBQU8sR0FBUCxPQUFPLENBQTBCO1lBQ2pDLGFBQVEsR0FBUixRQUFRLENBQXNDO1FBQUcsQ0FBQztRQUU5RCxrQ0FBUyxHQUFULFVBQVUsSUFBWTtZQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzNCLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUVELG1DQUFVLEdBQVY7WUFBQSxpQkFNQztZQUxDLElBQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO1lBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUMsSUFBSSxFQUFFLElBQUk7Z0JBQzlCLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyQyxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQXBCRCxJQW9CQztJQXBCWSx3Q0FBYztJQXNCM0I7Ozs7T0FJRztJQUNIO1FBQ0UsbUJBQ2EsT0FBa0MsRUFBVyxJQUFZLEVBQ3pELFFBQXVCO1lBRHZCLFlBQU8sR0FBUCxPQUFPLENBQTJCO1lBQVcsU0FBSSxHQUFKLElBQUksQ0FBUTtZQUN6RCxhQUFRLEdBQVIsUUFBUSxDQUFlO1FBQUcsQ0FBQztRQUMxQyxnQkFBQztJQUFELENBQUMsQUFKRCxJQUlDO0lBSlksOEJBQVM7SUFNdEI7Ozs7T0FJRztJQUNIO1FBQUE7UUFFQSxDQUFDO1FBQUQsY0FBQztJQUFELENBQUMsQUFGRCxJQUVDO0lBRnFCLDBCQUFPIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbmltcG9ydCB7RHluYW1pY1ZhbHVlfSBmcm9tICcuL2R5bmFtaWMnO1xuXG5cbi8qKlxuICogQSB2YWx1ZSByZXN1bHRpbmcgZnJvbSBzdGF0aWMgcmVzb2x1dGlvbi5cbiAqXG4gKiBUaGlzIGNvdWxkIGJlIGEgcHJpbWl0aXZlLCBjb2xsZWN0aW9uIHR5cGUsIHJlZmVyZW5jZSB0byBhIGB0cy5Ob2RlYCB0aGF0IGRlY2xhcmVzIGFcbiAqIG5vbi1wcmltaXRpdmUgdmFsdWUsIG9yIGEgc3BlY2lhbCBgRHluYW1pY1ZhbHVlYCB0eXBlIHdoaWNoIGluZGljYXRlcyB0aGUgdmFsdWUgd2FzIG5vdFxuICogYXZhaWxhYmxlIHN0YXRpY2FsbHkuXG4gKi9cbmV4cG9ydCB0eXBlIFJlc29sdmVkVmFsdWUgPSBudW1iZXJ8Ym9vbGVhbnxzdHJpbmd8bnVsbHx1bmRlZmluZWR8UmVmZXJlbmNlfEVudW1WYWx1ZXxcbiAgICBSZXNvbHZlZFZhbHVlQXJyYXl8UmVzb2x2ZWRWYWx1ZU1hcHxSZXNvbHZlZE1vZHVsZXxLbm93bkZufER5bmFtaWNWYWx1ZTx1bmtub3duPjtcblxuLyoqXG4gKiBBbiBhcnJheSBvZiBgUmVzb2x2ZWRWYWx1ZWBzLlxuICpcbiAqIFRoaXMgaXMgYSByZWlmaWVkIHR5cGUgdG8gYWxsb3cgdGhlIGNpcmN1bGFyIHJlZmVyZW5jZSBvZiBgUmVzb2x2ZWRWYWx1ZWAgLT4gYFJlc29sdmVkVmFsdWVBcnJheWBcbiAqIC0+IGBSZXNvbHZlZFZhbHVlYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFZhbHVlQXJyYXkgZXh0ZW5kcyBBcnJheTxSZXNvbHZlZFZhbHVlPiB7fVxuXG4vKipcbiAqIEEgbWFwIG9mIHN0cmluZ3MgdG8gYFJlc29sdmVkVmFsdWVgcy5cbiAqXG4gKiBUaGlzIGlzIGEgcmVpZmllZCB0eXBlIHRvIGFsbG93IHRoZSBjaXJjdWxhciByZWZlcmVuY2Ugb2YgYFJlc29sdmVkVmFsdWVgIC0+IGBSZXNvbHZlZFZhbHVlTWFwYFxuICogLT4gYFJlc29sdmVkVmFsdWVgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmVkVmFsdWVNYXAgZXh0ZW5kcyBNYXA8c3RyaW5nLCBSZXNvbHZlZFZhbHVlPiB7fVxuXG4vKipcbiAqIEEgY29sbGVjdGlvbiBvZiBwdWJsaWNseSBleHBvcnRlZCBkZWNsYXJhdGlvbnMgZnJvbSBhIG1vZHVsZS4gRWFjaCBkZWNsYXJhdGlvbiBpcyBldmFsdWF0ZWRcbiAqIGxhemlseSB1cG9uIHJlcXVlc3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNvbHZlZE1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBleHBvcnRzOiBNYXA8c3RyaW5nLCBEZWNsYXJhdGlvbj4sXG4gICAgICBwcml2YXRlIGV2YWx1YXRlOiAoZGVjbDogRGVjbGFyYXRpb24pID0+IFJlc29sdmVkVmFsdWUpIHt9XG5cbiAgZ2V0RXhwb3J0KG5hbWU6IHN0cmluZyk6IFJlc29sdmVkVmFsdWUge1xuICAgIGlmICghdGhpcy5leHBvcnRzLmhhcyhuYW1lKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ldmFsdWF0ZSh0aGlzLmV4cG9ydHMuZ2V0KG5hbWUpISk7XG4gIH1cblxuICBnZXRFeHBvcnRzKCk6IFJlc29sdmVkVmFsdWVNYXAge1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBSZXNvbHZlZFZhbHVlPigpO1xuICAgIHRoaXMuZXhwb3J0cy5mb3JFYWNoKChkZWNsLCBuYW1lKSA9PiB7XG4gICAgICBtYXAuc2V0KG5hbWUsIHRoaXMuZXZhbHVhdGUoZGVjbCkpO1xuICAgIH0pO1xuICAgIHJldHVybiBtYXA7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHZhbHVlIG1lbWJlciBvZiBhbiBlbnVtZXJhdGlvbi5cbiAqXG4gKiBDb250YWlucyBhIGBSZWZlcmVuY2VgIHRvIHRoZSBlbnVtZXJhdGlvbiBpdHNlbGYsIGFuZCB0aGUgbmFtZSBvZiB0aGUgcmVmZXJlbmNlZCBtZW1iZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbnVtVmFsdWUge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IGVudW1SZWY6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4sIHJlYWRvbmx5IG5hbWU6IHN0cmluZyxcbiAgICAgIHJlYWRvbmx5IHJlc29sdmVkOiBSZXNvbHZlZFZhbHVlKSB7fVxufVxuXG4vKipcbiAqIEFuIGltcGxlbWVudGF0aW9uIG9mIGEga25vd24gZnVuY3Rpb24gdGhhdCBjYW4gYmUgc3RhdGljYWxseSBldmFsdWF0ZWQuXG4gKiBJdCBjb3VsZCBiZSBhIGJ1aWx0LWluIGZ1bmN0aW9uIG9yIG1ldGhvZCAoc3VjaCBhcyBgQXJyYXkucHJvdG90eXBlLnNsaWNlYCkgb3IgYSBUeXBlU2NyaXB0XG4gKiBoZWxwZXIgKHN1Y2ggYXMgYF9fc3ByZWFkYCkuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBLbm93bkZuIHtcbiAgYWJzdHJhY3QgZXZhbHVhdGUobm9kZTogdHMuQ2FsbEV4cHJlc3Npb24sIGFyZ3M6IFJlc29sdmVkVmFsdWVBcnJheSk6IFJlc29sdmVkVmFsdWU7XG59XG4iXX0=