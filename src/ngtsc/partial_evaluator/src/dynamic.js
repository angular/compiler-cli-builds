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
        define("@angular/compiler-cli/src/ngtsc/partial_evaluator/src/dynamic", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DynamicValue = void 0;
    /**
     * Represents a value which cannot be determined statically.
     */
    var DynamicValue = /** @class */ (function () {
        function DynamicValue(node, reason, code) {
            this.node = node;
            this.reason = reason;
            this.code = code;
        }
        DynamicValue.fromDynamicInput = function (node, input) {
            return new DynamicValue(node, input, 0 /* DYNAMIC_INPUT */);
        };
        DynamicValue.fromDynamicString = function (node) {
            return new DynamicValue(node, undefined, 1 /* DYNAMIC_STRING */);
        };
        DynamicValue.fromExternalReference = function (node, ref) {
            return new DynamicValue(node, ref, 2 /* EXTERNAL_REFERENCE */);
        };
        DynamicValue.fromUnsupportedSyntax = function (node) {
            return new DynamicValue(node, undefined, 3 /* UNSUPPORTED_SYNTAX */);
        };
        DynamicValue.fromUnknownIdentifier = function (node) {
            return new DynamicValue(node, undefined, 4 /* UNKNOWN_IDENTIFIER */);
        };
        DynamicValue.fromInvalidExpressionType = function (node, value) {
            return new DynamicValue(node, value, 5 /* INVALID_EXPRESSION_TYPE */);
        };
        DynamicValue.fromUnknown = function (node) {
            return new DynamicValue(node, undefined, 6 /* UNKNOWN */);
        };
        DynamicValue.prototype.isFromDynamicInput = function () {
            return this.code === 0 /* DYNAMIC_INPUT */;
        };
        DynamicValue.prototype.isFromDynamicString = function () {
            return this.code === 1 /* DYNAMIC_STRING */;
        };
        DynamicValue.prototype.isFromExternalReference = function () {
            return this.code === 2 /* EXTERNAL_REFERENCE */;
        };
        DynamicValue.prototype.isFromUnsupportedSyntax = function () {
            return this.code === 3 /* UNSUPPORTED_SYNTAX */;
        };
        DynamicValue.prototype.isFromUnknownIdentifier = function () {
            return this.code === 4 /* UNKNOWN_IDENTIFIER */;
        };
        DynamicValue.prototype.isFromInvalidExpressionType = function () {
            return this.code === 5 /* INVALID_EXPRESSION_TYPE */;
        };
        DynamicValue.prototype.isFromUnknown = function () {
            return this.code === 6 /* UNKNOWN */;
        };
        return DynamicValue;
    }());
    exports.DynamicValue = DynamicValue;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1pYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3Ivc3JjL2R5bmFtaWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBeURIOztPQUVHO0lBQ0g7UUFDRSxzQkFDYSxJQUFhLEVBQVcsTUFBUyxFQUFVLElBQXdCO1lBQW5FLFNBQUksR0FBSixJQUFJLENBQVM7WUFBVyxXQUFNLEdBQU4sTUFBTSxDQUFHO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBb0I7UUFBRyxDQUFDO1FBRTdFLDZCQUFnQixHQUF2QixVQUF3QixJQUFhLEVBQUUsS0FBbUI7WUFDeEQsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsS0FBSyx3QkFBbUMsQ0FBQztRQUN6RSxDQUFDO1FBRU0sOEJBQWlCLEdBQXhCLFVBQXlCLElBQWE7WUFDcEMsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyx5QkFBb0MsQ0FBQztRQUM5RSxDQUFDO1FBRU0sa0NBQXFCLEdBQTVCLFVBQTZCLElBQWEsRUFBRSxHQUE4QjtZQUV4RSxPQUFPLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLDZCQUF3QyxDQUFDO1FBQzVFLENBQUM7UUFFTSxrQ0FBcUIsR0FBNUIsVUFBNkIsSUFBYTtZQUN4QyxPQUFPLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLDZCQUF3QyxDQUFDO1FBQ2xGLENBQUM7UUFFTSxrQ0FBcUIsR0FBNUIsVUFBNkIsSUFBbUI7WUFDOUMsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyw2QkFBd0MsQ0FBQztRQUNsRixDQUFDO1FBRU0sc0NBQXlCLEdBQWhDLFVBQWlDLElBQWEsRUFBRSxLQUFjO1lBQzVELE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLEtBQUssa0NBQTZDLENBQUM7UUFDbkYsQ0FBQztRQUVNLHdCQUFXLEdBQWxCLFVBQW1CLElBQWE7WUFDOUIsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyxrQkFBNkIsQ0FBQztRQUN2RSxDQUFDO1FBRUQseUNBQWtCLEdBQWxCO1lBQ0UsT0FBTyxJQUFJLENBQUMsSUFBSSwwQkFBcUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsMENBQW1CLEdBQW5CO1lBQ0UsT0FBTyxJQUFJLENBQUMsSUFBSSwyQkFBc0MsQ0FBQztRQUN6RCxDQUFDO1FBRUQsOENBQXVCLEdBQXZCO1lBQ0UsT0FBTyxJQUFJLENBQUMsSUFBSSwrQkFBMEMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsOENBQXVCLEdBQXZCO1lBQ0UsT0FBTyxJQUFJLENBQUMsSUFBSSwrQkFBMEMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsOENBQXVCLEdBQXZCO1lBQ0UsT0FBTyxJQUFJLENBQUMsSUFBSSwrQkFBMEMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsa0RBQTJCLEdBQTNCO1lBQ0UsT0FBTyxJQUFJLENBQUMsSUFBSSxvQ0FBK0MsQ0FBQztRQUNsRSxDQUFDO1FBRUQsb0NBQWEsR0FBYjtZQUNFLE9BQU8sSUFBSSxDQUFDLElBQUksb0JBQStCLENBQUM7UUFDbEQsQ0FBQztRQUNILG1CQUFDO0lBQUQsQ0FBQyxBQTVERCxJQTREQztJQTVEWSxvQ0FBWSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcblxuLyoqXG4gKiBUaGUgcmVhc29uIHdoeSBhIHZhbHVlIGNhbm5vdCBiZSBkZXRlcm1pbmVkIHN0YXRpY2FsbHkuXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIER5bmFtaWNWYWx1ZVJlYXNvbiB7XG4gIC8qKlxuICAgKiBBIHZhbHVlIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkIHN0YXRpY2FsbHksIGJlY2F1c2UgaXQgY29udGFpbnMgYSB0ZXJtIHRoYXQgY291bGQgbm90IGJlXG4gICAqIGRldGVybWluZWQgc3RhdGljYWxseS5cbiAgICogKEUuZy4gYSBwcm9wZXJ0eSBhc3NpZ25tZW50IG9yIGNhbGwgZXhwcmVzc2lvbiB3aGVyZSB0aGUgbGhzIGlzIGEgYER5bmFtaWNWYWx1ZWAsIGEgdGVtcGxhdGVcbiAgICogbGl0ZXJhbCB3aXRoIGEgZHluYW1pYyBleHByZXNzaW9uLCBhbiBvYmplY3QgbGl0ZXJhbCB3aXRoIGEgc3ByZWFkIGFzc2lnbm1lbnQgd2hpY2ggY291bGQgbm90XG4gICAqIGJlIGRldGVybWluZWQgc3RhdGljYWxseSwgZXRjLilcbiAgICovXG4gIERZTkFNSUNfSU5QVVQsXG5cbiAgLyoqXG4gICAqIEEgc3RyaW5nIGNvdWxkIG5vdCBiZSBzdGF0aWNhbGx5IGV2YWx1YXRlZC5cbiAgICogKEUuZy4gYSBkeW5hbWljYWxseSBjb25zdHJ1Y3RlZCBvYmplY3QgcHJvcGVydHkgbmFtZSBvciBhIHRlbXBsYXRlIGxpdGVyYWwgZXhwcmVzc2lvbiB0aGF0XG4gICAqIGNvdWxkIG5vdCBiZSBzdGF0aWNhbGx5IHJlc29sdmVkIHRvIGEgcHJpbWl0aXZlIHZhbHVlLilcbiAgICovXG4gIERZTkFNSUNfU1RSSU5HLFxuXG4gIC8qKlxuICAgKiBBbiBleHRlcm5hbCByZWZlcmVuY2UgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGEgdmFsdWUgd2hpY2ggY2FuIGJlIGV2YWx1YXRlZC5cbiAgICogRm9yIGV4YW1wbGUgYSBjYWxsIGV4cHJlc3Npb24gZm9yIGEgZnVuY3Rpb24gZGVjbGFyZWQgaW4gYC5kLnRzYCwgb3IgYWNjZXNzaW5nIG5hdGl2ZSBnbG9iYWxzXG4gICAqIHN1Y2ggYXMgYHdpbmRvd2AuXG4gICAqL1xuICBFWFRFUk5BTF9SRUZFUkVOQ0UsXG5cbiAgLyoqXG4gICAqIFN5bnRheCB0aGF0IGBTdGF0aWNJbnRlcnByZXRlcmAgZG9lc24ndCBrbm93IGhvdyB0byBldmFsdWF0ZSwgZm9yIGV4YW1wbGUgYSB0eXBlIG9mXG4gICAqIGB0cy5FeHByZXNzaW9uYCB0aGF0IGlzIG5vdCBzdXBwb3J0ZWQuXG4gICAqL1xuICBVTlNVUFBPUlRFRF9TWU5UQVgsXG5cbiAgLyoqXG4gICAqIEEgZGVjbGFyYXRpb24gb2YgYSBgdHMuSWRlbnRpZmllcmAgY291bGQgbm90IGJlIGZvdW5kLlxuICAgKi9cbiAgVU5LTk9XTl9JREVOVElGSUVSLFxuXG4gIC8qKlxuICAgKiBBIHZhbHVlIGNvdWxkIGJlIHJlc29sdmVkLCBidXQgaXMgbm90IGFuIGFjY2VwdGFibGUgdHlwZSBmb3IgdGhlIG9wZXJhdGlvbiBiZWluZyBwZXJmb3JtZWQuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBhdHRlbXB0aW5nIHRvIGNhbGwgYSBub24tY2FsbGFibGUgZXhwcmVzc2lvbi5cbiAgICovXG4gIElOVkFMSURfRVhQUkVTU0lPTl9UWVBFLFxuXG4gIC8qKlxuICAgKiBBIHZhbHVlIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkIHN0YXRpY2FsbHkgZm9yIGFueSByZWFzb24gb3RoZXIgdGhlIGFib3ZlLlxuICAgKi9cbiAgVU5LTk9XTixcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgdmFsdWUgd2hpY2ggY2Fubm90IGJlIGRldGVybWluZWQgc3RhdGljYWxseS5cbiAqL1xuZXhwb3J0IGNsYXNzIER5bmFtaWNWYWx1ZTxSID0gdW5rbm93bj4ge1xuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcmVhZG9ubHkgbm9kZTogdHMuTm9kZSwgcmVhZG9ubHkgcmVhc29uOiBSLCBwcml2YXRlIGNvZGU6IER5bmFtaWNWYWx1ZVJlYXNvbikge31cblxuICBzdGF0aWMgZnJvbUR5bmFtaWNJbnB1dChub2RlOiB0cy5Ob2RlLCBpbnB1dDogRHluYW1pY1ZhbHVlKTogRHluYW1pY1ZhbHVlPER5bmFtaWNWYWx1ZT4ge1xuICAgIHJldHVybiBuZXcgRHluYW1pY1ZhbHVlKG5vZGUsIGlucHV0LCBEeW5hbWljVmFsdWVSZWFzb24uRFlOQU1JQ19JTlBVVCk7XG4gIH1cblxuICBzdGF0aWMgZnJvbUR5bmFtaWNTdHJpbmcobm9kZTogdHMuTm9kZSk6IER5bmFtaWNWYWx1ZSB7XG4gICAgcmV0dXJuIG5ldyBEeW5hbWljVmFsdWUobm9kZSwgdW5kZWZpbmVkLCBEeW5hbWljVmFsdWVSZWFzb24uRFlOQU1JQ19TVFJJTkcpO1xuICB9XG5cbiAgc3RhdGljIGZyb21FeHRlcm5hbFJlZmVyZW5jZShub2RlOiB0cy5Ob2RlLCByZWY6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4pOlxuICAgICAgRHluYW1pY1ZhbHVlPFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4+IHtcbiAgICByZXR1cm4gbmV3IER5bmFtaWNWYWx1ZShub2RlLCByZWYsIER5bmFtaWNWYWx1ZVJlYXNvbi5FWFRFUk5BTF9SRUZFUkVOQ0UpO1xuICB9XG5cbiAgc3RhdGljIGZyb21VbnN1cHBvcnRlZFN5bnRheChub2RlOiB0cy5Ob2RlKTogRHluYW1pY1ZhbHVlIHtcbiAgICByZXR1cm4gbmV3IER5bmFtaWNWYWx1ZShub2RlLCB1bmRlZmluZWQsIER5bmFtaWNWYWx1ZVJlYXNvbi5VTlNVUFBPUlRFRF9TWU5UQVgpO1xuICB9XG5cbiAgc3RhdGljIGZyb21Vbmtub3duSWRlbnRpZmllcihub2RlOiB0cy5JZGVudGlmaWVyKTogRHluYW1pY1ZhbHVlIHtcbiAgICByZXR1cm4gbmV3IER5bmFtaWNWYWx1ZShub2RlLCB1bmRlZmluZWQsIER5bmFtaWNWYWx1ZVJlYXNvbi5VTktOT1dOX0lERU5USUZJRVIpO1xuICB9XG5cbiAgc3RhdGljIGZyb21JbnZhbGlkRXhwcmVzc2lvblR5cGUobm9kZTogdHMuTm9kZSwgdmFsdWU6IHVua25vd24pOiBEeW5hbWljVmFsdWU8dW5rbm93bj4ge1xuICAgIHJldHVybiBuZXcgRHluYW1pY1ZhbHVlKG5vZGUsIHZhbHVlLCBEeW5hbWljVmFsdWVSZWFzb24uSU5WQUxJRF9FWFBSRVNTSU9OX1RZUEUpO1xuICB9XG5cbiAgc3RhdGljIGZyb21Vbmtub3duKG5vZGU6IHRzLk5vZGUpOiBEeW5hbWljVmFsdWUge1xuICAgIHJldHVybiBuZXcgRHluYW1pY1ZhbHVlKG5vZGUsIHVuZGVmaW5lZCwgRHluYW1pY1ZhbHVlUmVhc29uLlVOS05PV04pO1xuICB9XG5cbiAgaXNGcm9tRHluYW1pY0lucHV0KHRoaXM6IER5bmFtaWNWYWx1ZTxSPik6IHRoaXMgaXMgRHluYW1pY1ZhbHVlPER5bmFtaWNWYWx1ZT4ge1xuICAgIHJldHVybiB0aGlzLmNvZGUgPT09IER5bmFtaWNWYWx1ZVJlYXNvbi5EWU5BTUlDX0lOUFVUO1xuICB9XG5cbiAgaXNGcm9tRHluYW1pY1N0cmluZyh0aGlzOiBEeW5hbWljVmFsdWU8Uj4pOiB0aGlzIGlzIER5bmFtaWNWYWx1ZSB7XG4gICAgcmV0dXJuIHRoaXMuY29kZSA9PT0gRHluYW1pY1ZhbHVlUmVhc29uLkRZTkFNSUNfU1RSSU5HO1xuICB9XG5cbiAgaXNGcm9tRXh0ZXJuYWxSZWZlcmVuY2UodGhpczogRHluYW1pY1ZhbHVlPFI+KTogdGhpcyBpcyBEeW5hbWljVmFsdWU8UmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPj4ge1xuICAgIHJldHVybiB0aGlzLmNvZGUgPT09IER5bmFtaWNWYWx1ZVJlYXNvbi5FWFRFUk5BTF9SRUZFUkVOQ0U7XG4gIH1cblxuICBpc0Zyb21VbnN1cHBvcnRlZFN5bnRheCh0aGlzOiBEeW5hbWljVmFsdWU8Uj4pOiB0aGlzIGlzIER5bmFtaWNWYWx1ZSB7XG4gICAgcmV0dXJuIHRoaXMuY29kZSA9PT0gRHluYW1pY1ZhbHVlUmVhc29uLlVOU1VQUE9SVEVEX1NZTlRBWDtcbiAgfVxuXG4gIGlzRnJvbVVua25vd25JZGVudGlmaWVyKHRoaXM6IER5bmFtaWNWYWx1ZTxSPik6IHRoaXMgaXMgRHluYW1pY1ZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy5jb2RlID09PSBEeW5hbWljVmFsdWVSZWFzb24uVU5LTk9XTl9JREVOVElGSUVSO1xuICB9XG5cbiAgaXNGcm9tSW52YWxpZEV4cHJlc3Npb25UeXBlKHRoaXM6IER5bmFtaWNWYWx1ZTxSPik6IHRoaXMgaXMgRHluYW1pY1ZhbHVlPHVua25vd24+IHtcbiAgICByZXR1cm4gdGhpcy5jb2RlID09PSBEeW5hbWljVmFsdWVSZWFzb24uSU5WQUxJRF9FWFBSRVNTSU9OX1RZUEU7XG4gIH1cblxuICBpc0Zyb21Vbmtub3duKHRoaXM6IER5bmFtaWNWYWx1ZTxSPik6IHRoaXMgaXMgRHluYW1pY1ZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy5jb2RlID09PSBEeW5hbWljVmFsdWVSZWFzb24uVU5LTk9XTjtcbiAgfVxufVxuIl19