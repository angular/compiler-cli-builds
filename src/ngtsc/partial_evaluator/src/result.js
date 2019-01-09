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
        function EnumValue(enumRef, name) {
            this.enumRef = enumRef;
            this.name = name;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdWx0LmpzIiwic291cmNlUm9vdCI6Ii4uLy4uLy4uLy4uLy4uLyIsInNvdXJjZXMiOlsicGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9wYXJ0aWFsX2V2YWx1YXRvci9zcmMvcmVzdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBaUJIOzs7O09BSUc7SUFDSDtRQUFBO1lBQ0U7Ozs7ZUFJRztZQUNLLGVBQVUsR0FBRyxJQUFJLENBQUM7UUFDNUIsQ0FBQztRQUFELG1CQUFDO0lBQUQsQ0FBQyxBQVBELElBT0M7SUFQWSxvQ0FBWTtJQVN6Qjs7O09BR0c7SUFDVSxRQUFBLGFBQWEsR0FBaUIsSUFBSSxZQUFZLEVBQUUsQ0FBQztJQUU5RDs7T0FFRztJQUNILFNBQWdCLGNBQWMsQ0FBQyxLQUFVO1FBQ3ZDLE9BQU8sS0FBSyxLQUFLLHFCQUFhLENBQUM7SUFDakMsQ0FBQztJQUZELHdDQUVDO0lBa0JEOzs7O09BSUc7SUFDSDtRQUNFLG1CQUFxQixPQUFzQyxFQUFXLElBQVk7WUFBN0QsWUFBTyxHQUFQLE9BQU8sQ0FBK0I7WUFBVyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQUcsQ0FBQztRQUN4RixnQkFBQztJQUFELENBQUMsQUFGRCxJQUVDO0lBRlksOEJBQVM7SUFJdEI7O09BRUc7SUFDSDtRQUFBO1FBQThGLENBQUM7UUFBRCxnQkFBQztJQUFELENBQUMsQUFBL0YsSUFBK0Y7SUFBekUsOEJBQVMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5cblxuLyoqXG4gKiBBIHZhbHVlIHJlc3VsdGluZyBmcm9tIHN0YXRpYyByZXNvbHV0aW9uLlxuICpcbiAqIFRoaXMgY291bGQgYmUgYSBwcmltaXRpdmUsIGNvbGxlY3Rpb24gdHlwZSwgcmVmZXJlbmNlIHRvIGEgYHRzLk5vZGVgIHRoYXQgZGVjbGFyZXMgYVxuICogbm9uLXByaW1pdGl2ZSB2YWx1ZSwgb3IgYSBzcGVjaWFsIGBEeW5hbWljVmFsdWVgIHR5cGUgd2hpY2ggaW5kaWNhdGVzIHRoZSB2YWx1ZSB3YXMgbm90XG4gKiBhdmFpbGFibGUgc3RhdGljYWxseS5cbiAqL1xuZXhwb3J0IHR5cGUgUmVzb2x2ZWRWYWx1ZSA9IG51bWJlciB8IGJvb2xlYW4gfCBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkIHwgUmVmZXJlbmNlIHwgRW51bVZhbHVlIHxcbiAgICBSZXNvbHZlZFZhbHVlQXJyYXkgfCBSZXNvbHZlZFZhbHVlTWFwIHwgQnVpbHRpbkZuIHwgRHluYW1pY1ZhbHVlO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSB2YWx1ZSB3aGljaCBjYW5ub3QgYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LlxuICpcbiAqIFVzZSBgaXNEeW5hbWljVmFsdWVgIHRvIGRldGVybWluZSB3aGV0aGVyIGEgYFJlc29sdmVkVmFsdWVgIGlzIGEgYER5bmFtaWNWYWx1ZWAuXG4gKi9cbmV4cG9ydCBjbGFzcyBEeW5hbWljVmFsdWUge1xuICAvKipcbiAgICogVGhpcyBpcyBuZWVkZWQgc28gdGhlIFwiaXMgRHluYW1pY1ZhbHVlXCIgYXNzZXJ0aW9uIG9mIGBpc0R5bmFtaWNWYWx1ZWAgYWN0dWFsbHkgaGFzIG1lYW5pbmcuXG4gICAqXG4gICAqIE90aGVyd2lzZSwgXCJpcyBEeW5hbWljVmFsdWVcIiBpcyBha2luIHRvIFwiaXMge31cIiB3aGljaCBkb2Vzbid0IHRyaWdnZXIgbmFycm93aW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBfaXNEeW5hbWljID0gdHJ1ZTtcbn1cblxuLyoqXG4gKiBBbiBpbnRlcm5hbCBmbHl3ZWlnaHQgZm9yIGBEeW5hbWljVmFsdWVgLiBFdmVudHVhbGx5IHRoZSBkeW5hbWljIHZhbHVlIHdpbGwgY2FycnkgaW5mb3JtYXRpb25cbiAqIG9uIHRoZSBsb2NhdGlvbiBvZiB0aGUgbm9kZSB0aGF0IGNvdWxkIG5vdCBiZSBzdGF0aWNhbGx5IGNvbXB1dGVkLlxuICovXG5leHBvcnQgY29uc3QgRFlOQU1JQ19WQUxVRTogRHluYW1pY1ZhbHVlID0gbmV3IER5bmFtaWNWYWx1ZSgpO1xuXG4vKipcbiAqIFVzZWQgdG8gdGVzdCB3aGV0aGVyIGEgYFJlc29sdmVkVmFsdWVgIGlzIGEgYER5bmFtaWNWYWx1ZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0R5bmFtaWNWYWx1ZSh2YWx1ZTogYW55KTogdmFsdWUgaXMgRHluYW1pY1ZhbHVlIHtcbiAgcmV0dXJuIHZhbHVlID09PSBEWU5BTUlDX1ZBTFVFO1xufVxuXG4vKipcbiAqIEFuIGFycmF5IG9mIGBSZXNvbHZlZFZhbHVlYHMuXG4gKlxuICogVGhpcyBpcyBhIHJlaWZpZWQgdHlwZSB0byBhbGxvdyB0aGUgY2lyY3VsYXIgcmVmZXJlbmNlIG9mIGBSZXNvbHZlZFZhbHVlYCAtPiBgUmVzb2x2ZWRWYWx1ZUFycmF5YFxuICogLT5cbiAqIGBSZXNvbHZlZFZhbHVlYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFZhbHVlQXJyYXkgZXh0ZW5kcyBBcnJheTxSZXNvbHZlZFZhbHVlPiB7fVxuXG4vKipcbiAqIEEgbWFwIG9mIHN0cmluZ3MgdG8gYFJlc29sdmVkVmFsdWVgcy5cbiAqXG4gKiBUaGlzIGlzIGEgcmVpZmllZCB0eXBlIHRvIGFsbG93IHRoZSBjaXJjdWxhciByZWZlcmVuY2Ugb2YgYFJlc29sdmVkVmFsdWVgIC0+IGBSZXNvbHZlZFZhbHVlTWFwYCAtPlxuICogYFJlc29sdmVkVmFsdWVgLlxuICovIGV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWRWYWx1ZU1hcCBleHRlbmRzIE1hcDxzdHJpbmcsIFJlc29sdmVkVmFsdWU+IHt9XG5cbi8qKlxuICogQSB2YWx1ZSBtZW1iZXIgb2YgYW4gZW51bWVyYXRpb24uXG4gKlxuICogQ29udGFpbnMgYSBgUmVmZXJlbmNlYCB0byB0aGUgZW51bWVyYXRpb24gaXRzZWxmLCBhbmQgdGhlIG5hbWUgb2YgdGhlIHJlZmVyZW5jZWQgbWVtYmVyLlxuICovXG5leHBvcnQgY2xhc3MgRW51bVZhbHVlIHtcbiAgY29uc3RydWN0b3IocmVhZG9ubHkgZW51bVJlZjogUmVmZXJlbmNlPHRzLkVudW1EZWNsYXJhdGlvbj4sIHJlYWRvbmx5IG5hbWU6IHN0cmluZykge31cbn1cblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiBhIGJ1aWx0aW4gZnVuY3Rpb24sIHN1Y2ggYXMgYEFycmF5LnByb3RvdHlwZS5zbGljZWAuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCdWlsdGluRm4geyBhYnN0cmFjdCBldmFsdWF0ZShhcmdzOiBSZXNvbHZlZFZhbHVlQXJyYXkpOiBSZXNvbHZlZFZhbHVlOyB9XG4iXX0=