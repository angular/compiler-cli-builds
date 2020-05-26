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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/inheritance", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.flattenInheritedDirectiveMetadata = void 0;
    var tslib_1 = require("tslib");
    /**
     * Given a reference to a directive, return a flattened version of its `DirectiveMeta` metadata
     * which includes metadata from its entire inheritance chain.
     *
     * The returned `DirectiveMeta` will either have `baseClass: null` if the inheritance chain could be
     * fully resolved, or `baseClass: 'dynamic'` if the inheritance chain could not be completely
     * followed.
     */
    function flattenInheritedDirectiveMetadata(reader, dir) {
        var topMeta = reader.getDirectiveMetadata(dir);
        if (topMeta === null) {
            throw new Error("Metadata not found for directive: " + dir.debugName);
        }
        var inputs = {};
        var outputs = {};
        var coercedInputFields = new Set();
        var isDynamic = false;
        var addMetadata = function (meta) {
            var e_1, _a;
            if (meta.baseClass === 'dynamic') {
                isDynamic = true;
            }
            else if (meta.baseClass !== null) {
                var baseMeta = reader.getDirectiveMetadata(meta.baseClass);
                if (baseMeta !== null) {
                    addMetadata(baseMeta);
                }
                else {
                    // Missing metadata for the base class means it's effectively dynamic.
                    isDynamic = true;
                }
            }
            inputs = tslib_1.__assign(tslib_1.__assign({}, inputs), meta.inputs);
            outputs = tslib_1.__assign(tslib_1.__assign({}, outputs), meta.outputs);
            try {
                for (var _b = tslib_1.__values(meta.coercedInputFields), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var coercedInputField = _c.value;
                    coercedInputFields.add(coercedInputField);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        addMetadata(topMeta);
        return tslib_1.__assign(tslib_1.__assign({}, topMeta), { inputs: inputs,
            outputs: outputs,
            coercedInputFields: coercedInputFields, baseClass: isDynamic ? 'dynamic' : null });
    }
    exports.flattenInheritedDirectiveMetadata = flattenInheritedDirectiveMetadata;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5oZXJpdGFuY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL3NyYy9pbmhlcml0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBTUg7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLGlDQUFpQyxDQUM3QyxNQUFzQixFQUFFLEdBQWdDO1FBQzFELElBQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqRCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7WUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBcUMsR0FBRyxDQUFDLFNBQVcsQ0FBQyxDQUFDO1NBQ3ZFO1FBRUQsSUFBSSxNQUFNLEdBQTZDLEVBQUUsQ0FBQztRQUMxRCxJQUFJLE9BQU8sR0FBNEIsRUFBRSxDQUFDO1FBQzFDLElBQUksa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUMzQyxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFFdEIsSUFBTSxXQUFXLEdBQUcsVUFBQyxJQUFtQjs7WUFDdEMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTtnQkFDaEMsU0FBUyxHQUFHLElBQUksQ0FBQzthQUNsQjtpQkFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO2dCQUNsQyxJQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7b0JBQ3JCLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDdkI7cUJBQU07b0JBQ0wsc0VBQXNFO29CQUN0RSxTQUFTLEdBQUcsSUFBSSxDQUFDO2lCQUNsQjthQUNGO1lBQ0QsTUFBTSx5Q0FBTyxNQUFNLEdBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLE9BQU8seUNBQU8sT0FBTyxHQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzs7Z0JBRXhDLEtBQWdDLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsa0JBQWtCLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXBELElBQU0saUJBQWlCLFdBQUE7b0JBQzFCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2lCQUMzQzs7Ozs7Ozs7O1FBQ0gsQ0FBQyxDQUFDO1FBRUYsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXJCLDZDQUNLLE9BQU8sS0FDVixNQUFNLFFBQUE7WUFDTixPQUFPLFNBQUE7WUFDUCxrQkFBa0Isb0JBQUEsRUFDbEIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQ3ZDO0lBQ0osQ0FBQztJQXpDRCw4RUF5Q0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXJ9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbi8qKlxuICogR2l2ZW4gYSByZWZlcmVuY2UgdG8gYSBkaXJlY3RpdmUsIHJldHVybiBhIGZsYXR0ZW5lZCB2ZXJzaW9uIG9mIGl0cyBgRGlyZWN0aXZlTWV0YWAgbWV0YWRhdGFcbiAqIHdoaWNoIGluY2x1ZGVzIG1ldGFkYXRhIGZyb20gaXRzIGVudGlyZSBpbmhlcml0YW5jZSBjaGFpbi5cbiAqXG4gKiBUaGUgcmV0dXJuZWQgYERpcmVjdGl2ZU1ldGFgIHdpbGwgZWl0aGVyIGhhdmUgYGJhc2VDbGFzczogbnVsbGAgaWYgdGhlIGluaGVyaXRhbmNlIGNoYWluIGNvdWxkIGJlXG4gKiBmdWxseSByZXNvbHZlZCwgb3IgYGJhc2VDbGFzczogJ2R5bmFtaWMnYCBpZiB0aGUgaW5oZXJpdGFuY2UgY2hhaW4gY291bGQgbm90IGJlIGNvbXBsZXRlbHlcbiAqIGZvbGxvd2VkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmxhdHRlbkluaGVyaXRlZERpcmVjdGl2ZU1ldGFkYXRhKFxuICAgIHJlYWRlcjogTWV0YWRhdGFSZWFkZXIsIGRpcjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogRGlyZWN0aXZlTWV0YSB7XG4gIGNvbnN0IHRvcE1ldGEgPSByZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGlyKTtcbiAgaWYgKHRvcE1ldGEgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1ldGFkYXRhIG5vdCBmb3VuZCBmb3IgZGlyZWN0aXZlOiAke2Rpci5kZWJ1Z05hbWV9YCk7XG4gIH1cblxuICBsZXQgaW5wdXRzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfFtzdHJpbmcsIHN0cmluZ119ID0ge307XG4gIGxldCBvdXRwdXRzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBsZXQgY29lcmNlZElucHV0RmllbGRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGxldCBpc0R5bmFtaWMgPSBmYWxzZTtcblxuICBjb25zdCBhZGRNZXRhZGF0YSA9IChtZXRhOiBEaXJlY3RpdmVNZXRhKTogdm9pZCA9PiB7XG4gICAgaWYgKG1ldGEuYmFzZUNsYXNzID09PSAnZHluYW1pYycpIHtcbiAgICAgIGlzRHluYW1pYyA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChtZXRhLmJhc2VDbGFzcyAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgYmFzZU1ldGEgPSByZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEobWV0YS5iYXNlQ2xhc3MpO1xuICAgICAgaWYgKGJhc2VNZXRhICE9PSBudWxsKSB7XG4gICAgICAgIGFkZE1ldGFkYXRhKGJhc2VNZXRhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE1pc3NpbmcgbWV0YWRhdGEgZm9yIHRoZSBiYXNlIGNsYXNzIG1lYW5zIGl0J3MgZWZmZWN0aXZlbHkgZHluYW1pYy5cbiAgICAgICAgaXNEeW5hbWljID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaW5wdXRzID0gey4uLmlucHV0cywgLi4ubWV0YS5pbnB1dHN9O1xuICAgIG91dHB1dHMgPSB7Li4ub3V0cHV0cywgLi4ubWV0YS5vdXRwdXRzfTtcblxuICAgIGZvciAoY29uc3QgY29lcmNlZElucHV0RmllbGQgb2YgbWV0YS5jb2VyY2VkSW5wdXRGaWVsZHMpIHtcbiAgICAgIGNvZXJjZWRJbnB1dEZpZWxkcy5hZGQoY29lcmNlZElucHV0RmllbGQpO1xuICAgIH1cbiAgfTtcblxuICBhZGRNZXRhZGF0YSh0b3BNZXRhKTtcblxuICByZXR1cm4ge1xuICAgIC4uLnRvcE1ldGEsXG4gICAgaW5wdXRzLFxuICAgIG91dHB1dHMsXG4gICAgY29lcmNlZElucHV0RmllbGRzLFxuICAgIGJhc2VDbGFzczogaXNEeW5hbWljID8gJ2R5bmFtaWMnIDogbnVsbCxcbiAgfTtcbn1cbiJdfQ==