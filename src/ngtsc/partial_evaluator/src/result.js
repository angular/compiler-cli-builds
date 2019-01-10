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
    /**
     * Represents a value which cannot be determined statically.
     *
     * Use `isDynamicValue` to determine whether a `ResolvedValue` is a `DynamicValue`.
     */
    var DynamicValue = /** @class */ (function () {
        function DynamicValue() {
            /**
             * This is needed so the "is DynamicValue" assertion of `isDynamicValue` actually has meaning.
             *
             * Otherwise, "is DynamicValue" is akin to "is {}" which doesn't trigger narrowing.
             */
            this._isDynamic = true;
        }
        return DynamicValue;
    }());
    exports.DynamicValue = DynamicValue;
    /**
     * An internal flyweight for `DynamicValue`. Eventually the dynamic value will carry information
     * on the location of the node that could not be statically computed.
     */
    exports.DYNAMIC_VALUE = new DynamicValue();
    /**
     * Used to test whether a `ResolvedValue` is a `DynamicValue`.
     */
    function isDynamicValue(value) {
        return value === exports.DYNAMIC_VALUE;
    }
    exports.isDynamicValue = isDynamicValue;
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
     * An implementation of a builtin function, such as `Array.prototype.slice`.
     */
    var BuiltinFn = /** @class */ (function () {
        function BuiltinFn() {
        }
        return BuiltinFn;
    }());
    exports.BuiltinFn = BuiltinFn;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0LmpzIiwic291cmNlUm9vdCI6Ii4uLy4uLy4uLy4uLy4uLyIsInNvdXJjZXMiOlsicGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvci9zcmMvcmVzdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBaUJIOzs7O09BSUc7SUFDSDtRQUFBO1lBQ0U7Ozs7ZUFJRztZQUNLLGVBQVUsR0FBRyxJQUFJLENBQUM7UUFDNUIsQ0FBQztRQUFELG1CQUFDO0lBQUQsQ0FBQyxBQVBELElBT0M7SUFQWSxvQ0FBWTtJQVN6Qjs7O09BR0c7SUFDVSxRQUFBLGFBQWEsR0FBaUIsSUFBSSxZQUFZLEVBQUUsQ0FBQztJQUU5RDs7T0FFRztJQUNILFNBQWdCLGNBQWMsQ0FBQyxLQUFVO1FBQ3ZDLE9BQU8sS0FBSyxLQUFLLHFCQUFhLENBQUM7SUFDakMsQ0FBQztJQUZELHdDQUVDO0lBa0JEOzs7O09BSUc7SUFDSDtRQUNFLG1CQUNhLE9BQXNDLEVBQVcsSUFBWSxFQUM3RCxRQUF1QjtZQUR2QixZQUFPLEdBQVAsT0FBTyxDQUErQjtZQUFXLFNBQUksR0FBSixJQUFJLENBQVE7WUFDN0QsYUFBUSxHQUFSLFFBQVEsQ0FBZTtRQUFHLENBQUM7UUFDMUMsZ0JBQUM7SUFBRCxDQUFDLEFBSkQsSUFJQztJQUpZLDhCQUFTO0lBTXRCOztPQUVHO0lBQ0g7UUFBQTtRQUE4RixDQUFDO1FBQUQsZ0JBQUM7SUFBRCxDQUFDLEFBQS9GLElBQStGO0lBQXpFLDhCQUFTIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuXG5cbi8qKlxuICogQSB2YWx1ZSByZXN1bHRpbmcgZnJvbSBzdGF0aWMgcmVzb2x1dGlvbi5cbiAqXG4gKiBUaGlzIGNvdWxkIGJlIGEgcHJpbWl0aXZlLCBjb2xsZWN0aW9uIHR5cGUsIHJlZmVyZW5jZSB0byBhIGB0cy5Ob2RlYCB0aGF0IGRlY2xhcmVzIGFcbiAqIG5vbi1wcmltaXRpdmUgdmFsdWUsIG9yIGEgc3BlY2lhbCBgRHluYW1pY1ZhbHVlYCB0eXBlIHdoaWNoIGluZGljYXRlcyB0aGUgdmFsdWUgd2FzIG5vdFxuICogYXZhaWxhYmxlIHN0YXRpY2FsbHkuXG4gKi9cbmV4cG9ydCB0eXBlIFJlc29sdmVkVmFsdWUgPSBudW1iZXIgfCBib29sZWFuIHwgc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCB8IFJlZmVyZW5jZSB8IEVudW1WYWx1ZSB8XG4gICAgUmVzb2x2ZWRWYWx1ZUFycmF5IHwgUmVzb2x2ZWRWYWx1ZU1hcCB8IEJ1aWx0aW5GbiB8IER5bmFtaWNWYWx1ZTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgdmFsdWUgd2hpY2ggY2Fubm90IGJlIGRldGVybWluZWQgc3RhdGljYWxseS5cbiAqXG4gKiBVc2UgYGlzRHluYW1pY1ZhbHVlYCB0byBkZXRlcm1pbmUgd2hldGhlciBhIGBSZXNvbHZlZFZhbHVlYCBpcyBhIGBEeW5hbWljVmFsdWVgLlxuICovXG5leHBvcnQgY2xhc3MgRHluYW1pY1ZhbHVlIHtcbiAgLyoqXG4gICAqIFRoaXMgaXMgbmVlZGVkIHNvIHRoZSBcImlzIER5bmFtaWNWYWx1ZVwiIGFzc2VydGlvbiBvZiBgaXNEeW5hbWljVmFsdWVgIGFjdHVhbGx5IGhhcyBtZWFuaW5nLlxuICAgKlxuICAgKiBPdGhlcndpc2UsIFwiaXMgRHluYW1pY1ZhbHVlXCIgaXMgYWtpbiB0byBcImlzIHt9XCIgd2hpY2ggZG9lc24ndCB0cmlnZ2VyIG5hcnJvd2luZy5cbiAgICovXG4gIHByaXZhdGUgX2lzRHluYW1pYyA9IHRydWU7XG59XG5cbi8qKlxuICogQW4gaW50ZXJuYWwgZmx5d2VpZ2h0IGZvciBgRHluYW1pY1ZhbHVlYC4gRXZlbnR1YWxseSB0aGUgZHluYW1pYyB2YWx1ZSB3aWxsIGNhcnJ5IGluZm9ybWF0aW9uXG4gKiBvbiB0aGUgbG9jYXRpb24gb2YgdGhlIG5vZGUgdGhhdCBjb3VsZCBub3QgYmUgc3RhdGljYWxseSBjb21wdXRlZC5cbiAqL1xuZXhwb3J0IGNvbnN0IERZTkFNSUNfVkFMVUU6IER5bmFtaWNWYWx1ZSA9IG5ldyBEeW5hbWljVmFsdWUoKTtcblxuLyoqXG4gKiBVc2VkIHRvIHRlc3Qgd2hldGhlciBhIGBSZXNvbHZlZFZhbHVlYCBpcyBhIGBEeW5hbWljVmFsdWVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEeW5hbWljVmFsdWUodmFsdWU6IGFueSk6IHZhbHVlIGlzIER5bmFtaWNWYWx1ZSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gRFlOQU1JQ19WQUxVRTtcbn1cblxuLyoqXG4gKiBBbiBhcnJheSBvZiBgUmVzb2x2ZWRWYWx1ZWBzLlxuICpcbiAqIFRoaXMgaXMgYSByZWlmaWVkIHR5cGUgdG8gYWxsb3cgdGhlIGNpcmN1bGFyIHJlZmVyZW5jZSBvZiBgUmVzb2x2ZWRWYWx1ZWAgLT4gYFJlc29sdmVkVmFsdWVBcnJheWBcbiAqIC0+XG4gKiBgUmVzb2x2ZWRWYWx1ZWAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWRWYWx1ZUFycmF5IGV4dGVuZHMgQXJyYXk8UmVzb2x2ZWRWYWx1ZT4ge31cblxuLyoqXG4gKiBBIG1hcCBvZiBzdHJpbmdzIHRvIGBSZXNvbHZlZFZhbHVlYHMuXG4gKlxuICogVGhpcyBpcyBhIHJlaWZpZWQgdHlwZSB0byBhbGxvdyB0aGUgY2lyY3VsYXIgcmVmZXJlbmNlIG9mIGBSZXNvbHZlZFZhbHVlYCAtPiBgUmVzb2x2ZWRWYWx1ZU1hcGAgLT5cbiAqIGBSZXNvbHZlZFZhbHVlYC5cbiAqLyBleHBvcnQgaW50ZXJmYWNlIFJlc29sdmVkVmFsdWVNYXAgZXh0ZW5kcyBNYXA8c3RyaW5nLCBSZXNvbHZlZFZhbHVlPiB7fVxuXG4vKipcbiAqIEEgdmFsdWUgbWVtYmVyIG9mIGFuIGVudW1lcmF0aW9uLlxuICpcbiAqIENvbnRhaW5zIGEgYFJlZmVyZW5jZWAgdG8gdGhlIGVudW1lcmF0aW9uIGl0c2VsZiwgYW5kIHRoZSBuYW1lIG9mIHRoZSByZWZlcmVuY2VkIG1lbWJlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEVudW1WYWx1ZSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgZW51bVJlZjogUmVmZXJlbmNlPHRzLkVudW1EZWNsYXJhdGlvbj4sIHJlYWRvbmx5IG5hbWU6IHN0cmluZyxcbiAgICAgIHJlYWRvbmx5IHJlc29sdmVkOiBSZXNvbHZlZFZhbHVlKSB7fVxufVxuXG4vKipcbiAqIEFuIGltcGxlbWVudGF0aW9uIG9mIGEgYnVpbHRpbiBmdW5jdGlvbiwgc3VjaCBhcyBgQXJyYXkucHJvdG90eXBlLnNsaWNlYC5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJ1aWx0aW5GbiB7IGFic3RyYWN0IGV2YWx1YXRlKGFyZ3M6IFJlc29sdmVkVmFsdWVBcnJheSk6IFJlc29sdmVkVmFsdWU7IH1cbiJdfQ==