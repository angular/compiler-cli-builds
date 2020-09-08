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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/inheritance", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/metadata/src/property_mapping"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.flattenInheritedDirectiveMetadata = void 0;
    var tslib_1 = require("tslib");
    var property_mapping_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/property_mapping");
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
        var coercedInputFields = new Set();
        var undeclaredInputFields = new Set();
        var restrictedInputFields = new Set();
        var stringLiteralInputFields = new Set();
        var isDynamic = false;
        var inputs = property_mapping_1.ClassPropertyMapping.empty();
        var outputs = property_mapping_1.ClassPropertyMapping.empty();
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
            inputs = property_mapping_1.ClassPropertyMapping.merge(inputs, meta.inputs);
            outputs = property_mapping_1.ClassPropertyMapping.merge(outputs, meta.outputs);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5oZXJpdGFuY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL3NyYy9pbmhlcml0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBTUgsa0dBQTJFO0lBRTNFOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixpQ0FBaUMsQ0FDN0MsTUFBc0IsRUFBRSxHQUFnQztRQUMxRCxJQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO1lBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXFDLEdBQUcsQ0FBQyxTQUFXLENBQUMsQ0FBQztTQUN2RTtRQUVELElBQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQXFCLENBQUM7UUFDeEQsSUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBcUIsQ0FBQztRQUMzRCxJQUFNLHFCQUFxQixHQUFHLElBQUksR0FBRyxFQUFxQixDQUFDO1FBQzNELElBQU0sd0JBQXdCLEdBQUcsSUFBSSxHQUFHLEVBQXFCLENBQUM7UUFDOUQsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLElBQUksTUFBTSxHQUFHLHVDQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzFDLElBQUksT0FBTyxHQUFHLHVDQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTNDLElBQU0sV0FBVyxHQUFHLFVBQUMsSUFBbUI7O1lBQ3RDLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTLEVBQUU7Z0JBQ2hDLFNBQVMsR0FBRyxJQUFJLENBQUM7YUFDbEI7aUJBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtnQkFDbEMsSUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO29CQUNyQixXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ3ZCO3FCQUFNO29CQUNMLHNFQUFzRTtvQkFDdEUsU0FBUyxHQUFHLElBQUksQ0FBQztpQkFDbEI7YUFDRjtZQUVELE1BQU0sR0FBRyx1Q0FBb0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RCxPQUFPLEdBQUcsdUNBQW9CLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7O2dCQUU1RCxLQUFnQyxJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLGtCQUFrQixDQUFBLGdCQUFBLDRCQUFFO29CQUFwRCxJQUFNLGlCQUFpQixXQUFBO29CQUMxQixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztpQkFDM0M7Ozs7Ozs7Ozs7Z0JBQ0QsS0FBbUMsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxxQkFBcUIsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBMUQsSUFBTSxvQkFBb0IsV0FBQTtvQkFDN0IscUJBQXFCLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7aUJBQ2pEOzs7Ozs7Ozs7O2dCQUNELEtBQW1DLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMscUJBQXFCLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTFELElBQU0sb0JBQW9CLFdBQUE7b0JBQzdCLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2lCQUNqRDs7Ozs7Ozs7OztnQkFDRCxLQUFvQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLHdCQUF3QixDQUFBLGdCQUFBLDRCQUFFO29CQUE5QyxJQUFNLEtBQUssV0FBQTtvQkFDZCx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQ3JDOzs7Ozs7Ozs7UUFDSCxDQUFDLENBQUM7UUFFRixXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFckIsNkNBQ0ssT0FBTyxLQUNWLE1BQU0sUUFBQTtZQUNOLE9BQU8sU0FBQTtZQUNQLGtCQUFrQixvQkFBQTtZQUNsQixxQkFBcUIsdUJBQUE7WUFDckIscUJBQXFCLHVCQUFBO1lBQ3JCLHdCQUF3QiwwQkFBQSxFQUN4QixTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksSUFDdkM7SUFDSixDQUFDO0lBekRELDhFQXlEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIE1ldGFkYXRhUmVhZGVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0NsYXNzUHJvcGVydHlNYXBwaW5nLCBDbGFzc1Byb3BlcnR5TmFtZX0gZnJvbSAnLi9wcm9wZXJ0eV9tYXBwaW5nJztcblxuLyoqXG4gKiBHaXZlbiBhIHJlZmVyZW5jZSB0byBhIGRpcmVjdGl2ZSwgcmV0dXJuIGEgZmxhdHRlbmVkIHZlcnNpb24gb2YgaXRzIGBEaXJlY3RpdmVNZXRhYCBtZXRhZGF0YVxuICogd2hpY2ggaW5jbHVkZXMgbWV0YWRhdGEgZnJvbSBpdHMgZW50aXJlIGluaGVyaXRhbmNlIGNoYWluLlxuICpcbiAqIFRoZSByZXR1cm5lZCBgRGlyZWN0aXZlTWV0YWAgd2lsbCBlaXRoZXIgaGF2ZSBgYmFzZUNsYXNzOiBudWxsYCBpZiB0aGUgaW5oZXJpdGFuY2UgY2hhaW4gY291bGQgYmVcbiAqIGZ1bGx5IHJlc29sdmVkLCBvciBgYmFzZUNsYXNzOiAnZHluYW1pYydgIGlmIHRoZSBpbmhlcml0YW5jZSBjaGFpbiBjb3VsZCBub3QgYmUgY29tcGxldGVseVxuICogZm9sbG93ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGEoXG4gICAgcmVhZGVyOiBNZXRhZGF0YVJlYWRlciwgZGlyOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBEaXJlY3RpdmVNZXRhIHtcbiAgY29uc3QgdG9wTWV0YSA9IHJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkaXIpO1xuICBpZiAodG9wTWV0YSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWV0YWRhdGEgbm90IGZvdW5kIGZvciBkaXJlY3RpdmU6ICR7ZGlyLmRlYnVnTmFtZX1gKTtcbiAgfVxuXG4gIGNvbnN0IGNvZXJjZWRJbnB1dEZpZWxkcyA9IG5ldyBTZXQ8Q2xhc3NQcm9wZXJ0eU5hbWU+KCk7XG4gIGNvbnN0IHVuZGVjbGFyZWRJbnB1dEZpZWxkcyA9IG5ldyBTZXQ8Q2xhc3NQcm9wZXJ0eU5hbWU+KCk7XG4gIGNvbnN0IHJlc3RyaWN0ZWRJbnB1dEZpZWxkcyA9IG5ldyBTZXQ8Q2xhc3NQcm9wZXJ0eU5hbWU+KCk7XG4gIGNvbnN0IHN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcyA9IG5ldyBTZXQ8Q2xhc3NQcm9wZXJ0eU5hbWU+KCk7XG4gIGxldCBpc0R5bmFtaWMgPSBmYWxzZTtcbiAgbGV0IGlucHV0cyA9IENsYXNzUHJvcGVydHlNYXBwaW5nLmVtcHR5KCk7XG4gIGxldCBvdXRwdXRzID0gQ2xhc3NQcm9wZXJ0eU1hcHBpbmcuZW1wdHkoKTtcblxuICBjb25zdCBhZGRNZXRhZGF0YSA9IChtZXRhOiBEaXJlY3RpdmVNZXRhKTogdm9pZCA9PiB7XG4gICAgaWYgKG1ldGEuYmFzZUNsYXNzID09PSAnZHluYW1pYycpIHtcbiAgICAgIGlzRHluYW1pYyA9IHRydWU7XG4gICAgfSBlbHNlIGlmIChtZXRhLmJhc2VDbGFzcyAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgYmFzZU1ldGEgPSByZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEobWV0YS5iYXNlQ2xhc3MpO1xuICAgICAgaWYgKGJhc2VNZXRhICE9PSBudWxsKSB7XG4gICAgICAgIGFkZE1ldGFkYXRhKGJhc2VNZXRhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE1pc3NpbmcgbWV0YWRhdGEgZm9yIHRoZSBiYXNlIGNsYXNzIG1lYW5zIGl0J3MgZWZmZWN0aXZlbHkgZHluYW1pYy5cbiAgICAgICAgaXNEeW5hbWljID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpbnB1dHMgPSBDbGFzc1Byb3BlcnR5TWFwcGluZy5tZXJnZShpbnB1dHMsIG1ldGEuaW5wdXRzKTtcbiAgICBvdXRwdXRzID0gQ2xhc3NQcm9wZXJ0eU1hcHBpbmcubWVyZ2Uob3V0cHV0cywgbWV0YS5vdXRwdXRzKTtcblxuICAgIGZvciAoY29uc3QgY29lcmNlZElucHV0RmllbGQgb2YgbWV0YS5jb2VyY2VkSW5wdXRGaWVsZHMpIHtcbiAgICAgIGNvZXJjZWRJbnB1dEZpZWxkcy5hZGQoY29lcmNlZElucHV0RmllbGQpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHVuZGVjbGFyZWRJbnB1dEZpZWxkIG9mIG1ldGEudW5kZWNsYXJlZElucHV0RmllbGRzKSB7XG4gICAgICB1bmRlY2xhcmVkSW5wdXRGaWVsZHMuYWRkKHVuZGVjbGFyZWRJbnB1dEZpZWxkKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCByZXN0cmljdGVkSW5wdXRGaWVsZCBvZiBtZXRhLnJlc3RyaWN0ZWRJbnB1dEZpZWxkcykge1xuICAgICAgcmVzdHJpY3RlZElucHV0RmllbGRzLmFkZChyZXN0cmljdGVkSW5wdXRGaWVsZCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgZmllbGQgb2YgbWV0YS5zdHJpbmdMaXRlcmFsSW5wdXRGaWVsZHMpIHtcbiAgICAgIHN0cmluZ0xpdGVyYWxJbnB1dEZpZWxkcy5hZGQoZmllbGQpO1xuICAgIH1cbiAgfTtcblxuICBhZGRNZXRhZGF0YSh0b3BNZXRhKTtcblxuICByZXR1cm4ge1xuICAgIC4uLnRvcE1ldGEsXG4gICAgaW5wdXRzLFxuICAgIG91dHB1dHMsXG4gICAgY29lcmNlZElucHV0RmllbGRzLFxuICAgIHVuZGVjbGFyZWRJbnB1dEZpZWxkcyxcbiAgICByZXN0cmljdGVkSW5wdXRGaWVsZHMsXG4gICAgc3RyaW5nTGl0ZXJhbElucHV0RmllbGRzLFxuICAgIGJhc2VDbGFzczogaXNEeW5hbWljID8gJ2R5bmFtaWMnIDogbnVsbCxcbiAgfTtcbn1cbiJdfQ==