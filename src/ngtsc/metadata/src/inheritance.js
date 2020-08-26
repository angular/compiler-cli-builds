/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        var undeclaredInputFields = new Set();
        var restrictedInputFields = new Set();
        var stringLiteralInputFields = new Set();
        var isDynamic = false;
        var addMetadata = function (meta) {
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
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
                for (var _e = tslib_1.__values(meta.coercedInputFields), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var coercedInputField = _f.value;
                    coercedInputFields.add(coercedInputField);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                for (var _g = tslib_1.__values(meta.undeclaredInputFields), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var undeclaredInputField = _h.value;
                    undeclaredInputFields.add(undeclaredInputField);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                for (var _j = tslib_1.__values(meta.restrictedInputFields), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var restrictedInputField = _k.value;
                    restrictedInputFields.add(restrictedInputField);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                }
                finally { if (e_3) throw e_3.error; }
            }
            try {
                for (var _l = tslib_1.__values(meta.stringLiteralInputFields), _m = _l.next(); !_m.done; _m = _l.next()) {
                    var field = _m.value;
                    stringLiteralInputFields.add(field);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                }
                finally { if (e_4) throw e_4.error; }
            }
        };
        addMetadata(topMeta);
        return tslib_1.__assign(tslib_1.__assign({}, topMeta), { inputs: inputs,
            outputs: outputs,
            coercedInputFields: coercedInputFields,
            undeclaredInputFields: undeclaredInputFields,
            restrictedInputFields: restrictedInputFields,
            stringLiteralInputFields: stringLiteralInputFields, baseClass: isDynamic ? 'dynamic' : null });
    }
    exports.flattenInheritedDirectiveMetadata = flattenInheritedDirectiveMetadata;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5oZXJpdGFuY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL3NyYy9pbmhlcml0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBTUg7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLGlDQUFpQyxDQUM3QyxNQUFzQixFQUFFLEdBQWdDO1FBQzFELElBQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqRCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7WUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBcUMsR0FBRyxDQUFDLFNBQVcsQ0FBQyxDQUFDO1NBQ3ZFO1FBRUQsSUFBSSxNQUFNLEdBQTZDLEVBQUUsQ0FBQztRQUMxRCxJQUFJLE9BQU8sR0FBNEIsRUFBRSxDQUFDO1FBQzFDLElBQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUM3QyxJQUFNLHFCQUFxQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDaEQsSUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ2hELElBQU0sd0JBQXdCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNuRCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFFdEIsSUFBTSxXQUFXLEdBQUcsVUFBQyxJQUFtQjs7WUFDdEMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTtnQkFDaEMsU0FBUyxHQUFHLElBQUksQ0FBQzthQUNsQjtpQkFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO2dCQUNsQyxJQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7b0JBQ3JCLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDdkI7cUJBQU07b0JBQ0wsc0VBQXNFO29CQUN0RSxTQUFTLEdBQUcsSUFBSSxDQUFDO2lCQUNsQjthQUNGO1lBQ0QsTUFBTSx5Q0FBTyxNQUFNLEdBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLE9BQU8seUNBQU8sT0FBTyxHQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzs7Z0JBRXhDLEtBQWdDLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsa0JBQWtCLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXBELElBQU0saUJBQWlCLFdBQUE7b0JBQzFCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2lCQUMzQzs7Ozs7Ozs7OztnQkFDRCxLQUFtQyxJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLHFCQUFxQixDQUFBLGdCQUFBLDRCQUFFO29CQUExRCxJQUFNLG9CQUFvQixXQUFBO29CQUM3QixxQkFBcUIsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztpQkFDakQ7Ozs7Ozs7Ozs7Z0JBQ0QsS0FBbUMsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxxQkFBcUIsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBMUQsSUFBTSxvQkFBb0IsV0FBQTtvQkFDN0IscUJBQXFCLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7aUJBQ2pEOzs7Ozs7Ozs7O2dCQUNELEtBQW9CLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsd0JBQXdCLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTlDLElBQU0sS0FBSyxXQUFBO29CQUNkLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDckM7Ozs7Ozs7OztRQUNILENBQUMsQ0FBQztRQUVGLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVyQiw2Q0FDSyxPQUFPLEtBQ1YsTUFBTSxRQUFBO1lBQ04sT0FBTyxTQUFBO1lBQ1Asa0JBQWtCLG9CQUFBO1lBQ2xCLHFCQUFxQix1QkFBQTtZQUNyQixxQkFBcUIsdUJBQUE7WUFDckIsd0JBQXdCLDBCQUFBLEVBQ3hCLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUN2QztJQUNKLENBQUM7SUF4REQsOEVBd0RDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXJ9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5cbi8qKlxuICogR2l2ZW4gYSByZWZlcmVuY2UgdG8gYSBkaXJlY3RpdmUsIHJldHVybiBhIGZsYXR0ZW5lZCB2ZXJzaW9uIG9mIGl0cyBgRGlyZWN0aXZlTWV0YWAgbWV0YWRhdGFcbiAqIHdoaWNoIGluY2x1ZGVzIG1ldGFkYXRhIGZyb20gaXRzIGVudGlyZSBpbmhlcml0YW5jZSBjaGFpbi5cbiAqXG4gKiBUaGUgcmV0dXJuZWQgYERpcmVjdGl2ZU1ldGFgIHdpbGwgZWl0aGVyIGhhdmUgYGJhc2VDbGFzczogbnVsbGAgaWYgdGhlIGluaGVyaXRhbmNlIGNoYWluIGNvdWxkIGJlXG4gKiBmdWxseSByZXNvbHZlZCwgb3IgYGJhc2VDbGFzczogJ2R5bmFtaWMnYCBpZiB0aGUgaW5oZXJpdGFuY2UgY2hhaW4gY291bGQgbm90IGJlIGNvbXBsZXRlbHlcbiAqIGZvbGxvd2VkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmxhdHRlbkluaGVyaXRlZERpcmVjdGl2ZU1ldGFkYXRhKFxuICAgIHJlYWRlcjogTWV0YWRhdGFSZWFkZXIsIGRpcjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogRGlyZWN0aXZlTWV0YSB7XG4gIGNvbnN0IHRvcE1ldGEgPSByZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGlyKTtcbiAgaWYgKHRvcE1ldGEgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1ldGFkYXRhIG5vdCBmb3VuZCBmb3IgZGlyZWN0aXZlOiAke2Rpci5kZWJ1Z05hbWV9YCk7XG4gIH1cblxuICBsZXQgaW5wdXRzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfFtzdHJpbmcsIHN0cmluZ119ID0ge307XG4gIGxldCBvdXRwdXRzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICBjb25zdCBjb2VyY2VkSW5wdXRGaWVsZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgdW5kZWNsYXJlZElucHV0RmllbGRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHJlc3RyaWN0ZWRJbnB1dEZpZWxkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBzdHJpbmdMaXRlcmFsSW5wdXRGaWVsZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgbGV0IGlzRHluYW1pYyA9IGZhbHNlO1xuXG4gIGNvbnN0IGFkZE1ldGFkYXRhID0gKG1ldGE6IERpcmVjdGl2ZU1ldGEpOiB2b2lkID0+IHtcbiAgICBpZiAobWV0YS5iYXNlQ2xhc3MgPT09ICdkeW5hbWljJykge1xuICAgICAgaXNEeW5hbWljID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKG1ldGEuYmFzZUNsYXNzICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBiYXNlTWV0YSA9IHJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShtZXRhLmJhc2VDbGFzcyk7XG4gICAgICBpZiAoYmFzZU1ldGEgIT09IG51bGwpIHtcbiAgICAgICAgYWRkTWV0YWRhdGEoYmFzZU1ldGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTWlzc2luZyBtZXRhZGF0YSBmb3IgdGhlIGJhc2UgY2xhc3MgbWVhbnMgaXQncyBlZmZlY3RpdmVseSBkeW5hbWljLlxuICAgICAgICBpc0R5bmFtaWMgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBpbnB1dHMgPSB7Li4uaW5wdXRzLCAuLi5tZXRhLmlucHV0c307XG4gICAgb3V0cHV0cyA9IHsuLi5vdXRwdXRzLCAuLi5tZXRhLm91dHB1dHN9O1xuXG4gICAgZm9yIChjb25zdCBjb2VyY2VkSW5wdXRGaWVsZCBvZiBtZXRhLmNvZXJjZWRJbnB1dEZpZWxkcykge1xuICAgICAgY29lcmNlZElucHV0RmllbGRzLmFkZChjb2VyY2VkSW5wdXRGaWVsZCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdW5kZWNsYXJlZElucHV0RmllbGQgb2YgbWV0YS51bmRlY2xhcmVkSW5wdXRGaWVsZHMpIHtcbiAgICAgIHVuZGVjbGFyZWRJbnB1dEZpZWxkcy5hZGQodW5kZWNsYXJlZElucHV0RmllbGQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHJlc3RyaWN0ZWRJbnB1dEZpZWxkIG9mIG1ldGEucmVzdHJpY3RlZElucHV0RmllbGRzKSB7XG4gICAgICByZXN0cmljdGVkSW5wdXRGaWVsZHMuYWRkKHJlc3RyaWN0ZWRJbnB1dEZpZWxkKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBmaWVsZCBvZiBtZXRhLnN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcykge1xuICAgICAgc3RyaW5nTGl0ZXJhbElucHV0RmllbGRzLmFkZChmaWVsZCk7XG4gICAgfVxuICB9O1xuXG4gIGFkZE1ldGFkYXRhKHRvcE1ldGEpO1xuXG4gIHJldHVybiB7XG4gICAgLi4udG9wTWV0YSxcbiAgICBpbnB1dHMsXG4gICAgb3V0cHV0cyxcbiAgICBjb2VyY2VkSW5wdXRGaWVsZHMsXG4gICAgdW5kZWNsYXJlZElucHV0RmllbGRzLFxuICAgIHJlc3RyaWN0ZWRJbnB1dEZpZWxkcyxcbiAgICBzdHJpbmdMaXRlcmFsSW5wdXRGaWVsZHMsXG4gICAgYmFzZUNsYXNzOiBpc0R5bmFtaWMgPyAnZHluYW1pYycgOiBudWxsLFxuICB9O1xufVxuIl19