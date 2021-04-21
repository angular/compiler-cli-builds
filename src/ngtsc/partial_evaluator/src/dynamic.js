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
        DynamicValue.fromComplexFunctionCall = function (node, fn) {
            return new DynamicValue(node, fn, 6 /* COMPLEX_FUNCTION_CALL */);
        };
        DynamicValue.fromDynamicType = function (node) {
            return new DynamicValue(node, undefined, 7 /* DYNAMIC_TYPE */);
        };
        DynamicValue.fromUnknown = function (node) {
            return new DynamicValue(node, undefined, 8 /* UNKNOWN */);
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
        DynamicValue.prototype.isFromComplexFunctionCall = function () {
            return this.code === 6 /* COMPLEX_FUNCTION_CALL */;
        };
        DynamicValue.prototype.isFromDynamicType = function () {
            return this.code === 7 /* DYNAMIC_TYPE */;
        };
        DynamicValue.prototype.isFromUnknown = function () {
            return this.code === 8 /* UNKNOWN */;
        };
        DynamicValue.prototype.accept = function (visitor) {
            switch (this.code) {
                case 0 /* DYNAMIC_INPUT */:
                    return visitor.visitDynamicInput(this);
                case 1 /* DYNAMIC_STRING */:
                    return visitor.visitDynamicString(this);
                case 2 /* EXTERNAL_REFERENCE */:
                    return visitor.visitExternalReference(this);
                case 3 /* UNSUPPORTED_SYNTAX */:
                    return visitor.visitUnsupportedSyntax(this);
                case 4 /* UNKNOWN_IDENTIFIER */:
                    return visitor.visitUnknownIdentifier(this);
                case 5 /* INVALID_EXPRESSION_TYPE */:
                    return visitor.visitInvalidExpressionType(this);
                case 6 /* COMPLEX_FUNCTION_CALL */:
                    return visitor.visitComplexFunctionCall(this);
                case 7 /* DYNAMIC_TYPE */:
                    return visitor.visitDynamicType(this);
                case 8 /* UNKNOWN */:
                    return visitor.visitUnknown(this);
            }
        };
        return DynamicValue;
    }());
    exports.DynamicValue = DynamicValue;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1pYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3Ivc3JjL2R5bmFtaWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBb0VIOztPQUVHO0lBQ0g7UUFDRSxzQkFDYSxJQUFhLEVBQVcsTUFBUyxFQUFVLElBQXdCO1lBQW5FLFNBQUksR0FBSixJQUFJLENBQVM7WUFBVyxXQUFNLEdBQU4sTUFBTSxDQUFHO1lBQVUsU0FBSSxHQUFKLElBQUksQ0FBb0I7UUFBRyxDQUFDO1FBRTdFLDZCQUFnQixHQUF2QixVQUF3QixJQUFhLEVBQUUsS0FBbUI7WUFDeEQsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsS0FBSyx3QkFBbUMsQ0FBQztRQUN6RSxDQUFDO1FBRU0sOEJBQWlCLEdBQXhCLFVBQXlCLElBQWE7WUFDcEMsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyx5QkFBb0MsQ0FBQztRQUM5RSxDQUFDO1FBRU0sa0NBQXFCLEdBQTVCLFVBQTZCLElBQWEsRUFBRSxHQUE4QjtZQUV4RSxPQUFPLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLDZCQUF3QyxDQUFDO1FBQzVFLENBQUM7UUFFTSxrQ0FBcUIsR0FBNUIsVUFBNkIsSUFBYTtZQUN4QyxPQUFPLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLDZCQUF3QyxDQUFDO1FBQ2xGLENBQUM7UUFFTSxrQ0FBcUIsR0FBNUIsVUFBNkIsSUFBbUI7WUFDOUMsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyw2QkFBd0MsQ0FBQztRQUNsRixDQUFDO1FBRU0sc0NBQXlCLEdBQWhDLFVBQWlDLElBQWEsRUFBRSxLQUFjO1lBQzVELE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLEtBQUssa0NBQTZDLENBQUM7UUFDbkYsQ0FBQztRQUVNLG9DQUF1QixHQUE5QixVQUErQixJQUFhLEVBQUUsRUFBc0I7WUFFbEUsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxnQ0FBMkMsQ0FBQztRQUM5RSxDQUFDO1FBRU0sNEJBQWUsR0FBdEIsVUFBdUIsSUFBaUI7WUFDdEMsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyx1QkFBa0MsQ0FBQztRQUM1RSxDQUFDO1FBRU0sd0JBQVcsR0FBbEIsVUFBbUIsSUFBYTtZQUM5QixPQUFPLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxTQUFTLGtCQUE2QixDQUFDO1FBQ3ZFLENBQUM7UUFFRCx5Q0FBa0IsR0FBbEI7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLDBCQUFxQyxDQUFDO1FBQ3hELENBQUM7UUFFRCwwQ0FBbUIsR0FBbkI7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLDJCQUFzQyxDQUFDO1FBQ3pELENBQUM7UUFFRCw4Q0FBdUIsR0FBdkI7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLCtCQUEwQyxDQUFDO1FBQzdELENBQUM7UUFFRCw4Q0FBdUIsR0FBdkI7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLCtCQUEwQyxDQUFDO1FBQzdELENBQUM7UUFFRCw4Q0FBdUIsR0FBdkI7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLCtCQUEwQyxDQUFDO1FBQzdELENBQUM7UUFFRCxrREFBMkIsR0FBM0I7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLG9DQUErQyxDQUFDO1FBQ2xFLENBQUM7UUFFRCxnREFBeUIsR0FBekI7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLGtDQUE2QyxDQUFDO1FBQ2hFLENBQUM7UUFFRCx3Q0FBaUIsR0FBakI7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLHlCQUFvQyxDQUFDO1FBQ3ZELENBQUM7UUFFRCxvQ0FBYSxHQUFiO1lBQ0UsT0FBTyxJQUFJLENBQUMsSUFBSSxvQkFBK0IsQ0FBQztRQUNsRCxDQUFDO1FBRUQsNkJBQU0sR0FBTixVQUFVLE9BQStCO1lBQ3ZDLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDakI7b0JBQ0UsT0FBTyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBNkMsQ0FBQyxDQUFDO2dCQUNsRjtvQkFDRSxPQUFPLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUM7b0JBQ0UsT0FBTyxPQUFPLENBQUMsc0JBQXNCLENBQ2pDLElBQTBELENBQUMsQ0FBQztnQkFDbEU7b0JBQ0UsT0FBTyxPQUFPLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzlDO29CQUNFLE9BQU8sT0FBTyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM5QztvQkFDRSxPQUFPLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEQ7b0JBQ0UsT0FBTyxPQUFPLENBQUMsd0JBQXdCLENBQ25DLElBQW1ELENBQUMsQ0FBQztnQkFDM0Q7b0JBQ0UsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3hDO29CQUNFLE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNyQztRQUNILENBQUM7UUFDSCxtQkFBQztJQUFELENBQUMsQUF0R0QsSUFzR0M7SUF0R1ksb0NBQVkiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RnVuY3Rpb25EZWZpbml0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuLyoqXG4gKiBUaGUgcmVhc29uIHdoeSBhIHZhbHVlIGNhbm5vdCBiZSBkZXRlcm1pbmVkIHN0YXRpY2FsbHkuXG4gKi9cbmV4cG9ydCBjb25zdCBlbnVtIER5bmFtaWNWYWx1ZVJlYXNvbiB7XG4gIC8qKlxuICAgKiBBIHZhbHVlIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkIHN0YXRpY2FsbHksIGJlY2F1c2UgaXQgY29udGFpbnMgYSB0ZXJtIHRoYXQgY291bGQgbm90IGJlXG4gICAqIGRldGVybWluZWQgc3RhdGljYWxseS5cbiAgICogKEUuZy4gYSBwcm9wZXJ0eSBhc3NpZ25tZW50IG9yIGNhbGwgZXhwcmVzc2lvbiB3aGVyZSB0aGUgbGhzIGlzIGEgYER5bmFtaWNWYWx1ZWAsIGEgdGVtcGxhdGVcbiAgICogbGl0ZXJhbCB3aXRoIGEgZHluYW1pYyBleHByZXNzaW9uLCBhbiBvYmplY3QgbGl0ZXJhbCB3aXRoIGEgc3ByZWFkIGFzc2lnbm1lbnQgd2hpY2ggY291bGQgbm90XG4gICAqIGJlIGRldGVybWluZWQgc3RhdGljYWxseSwgZXRjLilcbiAgICovXG4gIERZTkFNSUNfSU5QVVQsXG5cbiAgLyoqXG4gICAqIEEgc3RyaW5nIGNvdWxkIG5vdCBiZSBzdGF0aWNhbGx5IGV2YWx1YXRlZC5cbiAgICogKEUuZy4gYSBkeW5hbWljYWxseSBjb25zdHJ1Y3RlZCBvYmplY3QgcHJvcGVydHkgbmFtZSBvciBhIHRlbXBsYXRlIGxpdGVyYWwgZXhwcmVzc2lvbiB0aGF0XG4gICAqIGNvdWxkIG5vdCBiZSBzdGF0aWNhbGx5IHJlc29sdmVkIHRvIGEgcHJpbWl0aXZlIHZhbHVlLilcbiAgICovXG4gIERZTkFNSUNfU1RSSU5HLFxuXG4gIC8qKlxuICAgKiBBbiBleHRlcm5hbCByZWZlcmVuY2UgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGEgdmFsdWUgd2hpY2ggY2FuIGJlIGV2YWx1YXRlZC5cbiAgICogRm9yIGV4YW1wbGUgYSBjYWxsIGV4cHJlc3Npb24gZm9yIGEgZnVuY3Rpb24gZGVjbGFyZWQgaW4gYC5kLnRzYCwgb3IgYWNjZXNzaW5nIG5hdGl2ZSBnbG9iYWxzXG4gICAqIHN1Y2ggYXMgYHdpbmRvd2AuXG4gICAqL1xuICBFWFRFUk5BTF9SRUZFUkVOQ0UsXG5cbiAgLyoqXG4gICAqIFN5bnRheCB0aGF0IGBTdGF0aWNJbnRlcnByZXRlcmAgZG9lc24ndCBrbm93IGhvdyB0byBldmFsdWF0ZSwgZm9yIGV4YW1wbGUgYSB0eXBlIG9mXG4gICAqIGB0cy5FeHByZXNzaW9uYCB0aGF0IGlzIG5vdCBzdXBwb3J0ZWQuXG4gICAqL1xuICBVTlNVUFBPUlRFRF9TWU5UQVgsXG5cbiAgLyoqXG4gICAqIEEgZGVjbGFyYXRpb24gb2YgYSBgdHMuSWRlbnRpZmllcmAgY291bGQgbm90IGJlIGZvdW5kLlxuICAgKi9cbiAgVU5LTk9XTl9JREVOVElGSUVSLFxuXG4gIC8qKlxuICAgKiBBIHZhbHVlIGNvdWxkIGJlIHJlc29sdmVkLCBidXQgaXMgbm90IGFuIGFjY2VwdGFibGUgdHlwZSBmb3IgdGhlIG9wZXJhdGlvbiBiZWluZyBwZXJmb3JtZWQuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBhdHRlbXB0aW5nIHRvIGNhbGwgYSBub24tY2FsbGFibGUgZXhwcmVzc2lvbi5cbiAgICovXG4gIElOVkFMSURfRVhQUkVTU0lPTl9UWVBFLFxuXG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIGNhbGwgY291bGQgbm90IGJlIGV2YWx1YXRlZCBhcyB0aGUgZnVuY3Rpb24ncyBib2R5IGlzIG5vdCBhIHNpbmdsZSByZXR1cm4gc3RhdGVtZW50LlxuICAgKi9cbiAgQ09NUExFWF9GVU5DVElPTl9DQUxMLFxuXG4gIC8qKlxuICAgKiBBIHR5cGUgdGhhdCBjb3VsZCBub3QgYmUgc3RhdGljYWxseSBldmFsdWF0ZWQuXG4gICAqL1xuICBEWU5BTUlDX1RZUEUsXG5cbiAgLyoqXG4gICAqIEEgdmFsdWUgY291bGQgbm90IGJlIGRldGVybWluZWQgc3RhdGljYWxseSBmb3IgYW55IHJlYXNvbiBvdGhlciB0aGUgYWJvdmUuXG4gICAqL1xuICBVTktOT1dOLFxufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSB2YWx1ZSB3aGljaCBjYW5ub3QgYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LlxuICovXG5leHBvcnQgY2xhc3MgRHluYW1pY1ZhbHVlPFIgPSB1bmtub3duPiB7XG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICByZWFkb25seSBub2RlOiB0cy5Ob2RlLCByZWFkb25seSByZWFzb246IFIsIHByaXZhdGUgY29kZTogRHluYW1pY1ZhbHVlUmVhc29uKSB7fVxuXG4gIHN0YXRpYyBmcm9tRHluYW1pY0lucHV0KG5vZGU6IHRzLk5vZGUsIGlucHV0OiBEeW5hbWljVmFsdWUpOiBEeW5hbWljVmFsdWU8RHluYW1pY1ZhbHVlPiB7XG4gICAgcmV0dXJuIG5ldyBEeW5hbWljVmFsdWUobm9kZSwgaW5wdXQsIER5bmFtaWNWYWx1ZVJlYXNvbi5EWU5BTUlDX0lOUFVUKTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tRHluYW1pY1N0cmluZyhub2RlOiB0cy5Ob2RlKTogRHluYW1pY1ZhbHVlIHtcbiAgICByZXR1cm4gbmV3IER5bmFtaWNWYWx1ZShub2RlLCB1bmRlZmluZWQsIER5bmFtaWNWYWx1ZVJlYXNvbi5EWU5BTUlDX1NUUklORyk7XG4gIH1cblxuICBzdGF0aWMgZnJvbUV4dGVybmFsUmVmZXJlbmNlKG5vZGU6IHRzLk5vZGUsIHJlZjogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPik6XG4gICAgICBEeW5hbWljVmFsdWU8UmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPj4ge1xuICAgIHJldHVybiBuZXcgRHluYW1pY1ZhbHVlKG5vZGUsIHJlZiwgRHluYW1pY1ZhbHVlUmVhc29uLkVYVEVSTkFMX1JFRkVSRU5DRSk7XG4gIH1cblxuICBzdGF0aWMgZnJvbVVuc3VwcG9ydGVkU3ludGF4KG5vZGU6IHRzLk5vZGUpOiBEeW5hbWljVmFsdWUge1xuICAgIHJldHVybiBuZXcgRHluYW1pY1ZhbHVlKG5vZGUsIHVuZGVmaW5lZCwgRHluYW1pY1ZhbHVlUmVhc29uLlVOU1VQUE9SVEVEX1NZTlRBWCk7XG4gIH1cblxuICBzdGF0aWMgZnJvbVVua25vd25JZGVudGlmaWVyKG5vZGU6IHRzLklkZW50aWZpZXIpOiBEeW5hbWljVmFsdWUge1xuICAgIHJldHVybiBuZXcgRHluYW1pY1ZhbHVlKG5vZGUsIHVuZGVmaW5lZCwgRHluYW1pY1ZhbHVlUmVhc29uLlVOS05PV05fSURFTlRJRklFUik7XG4gIH1cblxuICBzdGF0aWMgZnJvbUludmFsaWRFeHByZXNzaW9uVHlwZShub2RlOiB0cy5Ob2RlLCB2YWx1ZTogdW5rbm93bik6IER5bmFtaWNWYWx1ZTx1bmtub3duPiB7XG4gICAgcmV0dXJuIG5ldyBEeW5hbWljVmFsdWUobm9kZSwgdmFsdWUsIER5bmFtaWNWYWx1ZVJlYXNvbi5JTlZBTElEX0VYUFJFU1NJT05fVFlQRSk7XG4gIH1cblxuICBzdGF0aWMgZnJvbUNvbXBsZXhGdW5jdGlvbkNhbGwobm9kZTogdHMuTm9kZSwgZm46IEZ1bmN0aW9uRGVmaW5pdGlvbik6XG4gICAgICBEeW5hbWljVmFsdWU8RnVuY3Rpb25EZWZpbml0aW9uPiB7XG4gICAgcmV0dXJuIG5ldyBEeW5hbWljVmFsdWUobm9kZSwgZm4sIER5bmFtaWNWYWx1ZVJlYXNvbi5DT01QTEVYX0ZVTkNUSU9OX0NBTEwpO1xuICB9XG5cbiAgc3RhdGljIGZyb21EeW5hbWljVHlwZShub2RlOiB0cy5UeXBlTm9kZSk6IER5bmFtaWNWYWx1ZSB7XG4gICAgcmV0dXJuIG5ldyBEeW5hbWljVmFsdWUobm9kZSwgdW5kZWZpbmVkLCBEeW5hbWljVmFsdWVSZWFzb24uRFlOQU1JQ19UWVBFKTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tVW5rbm93bihub2RlOiB0cy5Ob2RlKTogRHluYW1pY1ZhbHVlIHtcbiAgICByZXR1cm4gbmV3IER5bmFtaWNWYWx1ZShub2RlLCB1bmRlZmluZWQsIER5bmFtaWNWYWx1ZVJlYXNvbi5VTktOT1dOKTtcbiAgfVxuXG4gIGlzRnJvbUR5bmFtaWNJbnB1dCh0aGlzOiBEeW5hbWljVmFsdWU8Uj4pOiB0aGlzIGlzIER5bmFtaWNWYWx1ZTxEeW5hbWljVmFsdWU+IHtcbiAgICByZXR1cm4gdGhpcy5jb2RlID09PSBEeW5hbWljVmFsdWVSZWFzb24uRFlOQU1JQ19JTlBVVDtcbiAgfVxuXG4gIGlzRnJvbUR5bmFtaWNTdHJpbmcodGhpczogRHluYW1pY1ZhbHVlPFI+KTogdGhpcyBpcyBEeW5hbWljVmFsdWUge1xuICAgIHJldHVybiB0aGlzLmNvZGUgPT09IER5bmFtaWNWYWx1ZVJlYXNvbi5EWU5BTUlDX1NUUklORztcbiAgfVxuXG4gIGlzRnJvbUV4dGVybmFsUmVmZXJlbmNlKHRoaXM6IER5bmFtaWNWYWx1ZTxSPik6IHRoaXMgaXMgRHluYW1pY1ZhbHVlPFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4+IHtcbiAgICByZXR1cm4gdGhpcy5jb2RlID09PSBEeW5hbWljVmFsdWVSZWFzb24uRVhURVJOQUxfUkVGRVJFTkNFO1xuICB9XG5cbiAgaXNGcm9tVW5zdXBwb3J0ZWRTeW50YXgodGhpczogRHluYW1pY1ZhbHVlPFI+KTogdGhpcyBpcyBEeW5hbWljVmFsdWUge1xuICAgIHJldHVybiB0aGlzLmNvZGUgPT09IER5bmFtaWNWYWx1ZVJlYXNvbi5VTlNVUFBPUlRFRF9TWU5UQVg7XG4gIH1cblxuICBpc0Zyb21Vbmtub3duSWRlbnRpZmllcih0aGlzOiBEeW5hbWljVmFsdWU8Uj4pOiB0aGlzIGlzIER5bmFtaWNWYWx1ZSB7XG4gICAgcmV0dXJuIHRoaXMuY29kZSA9PT0gRHluYW1pY1ZhbHVlUmVhc29uLlVOS05PV05fSURFTlRJRklFUjtcbiAgfVxuXG4gIGlzRnJvbUludmFsaWRFeHByZXNzaW9uVHlwZSh0aGlzOiBEeW5hbWljVmFsdWU8Uj4pOiB0aGlzIGlzIER5bmFtaWNWYWx1ZTx1bmtub3duPiB7XG4gICAgcmV0dXJuIHRoaXMuY29kZSA9PT0gRHluYW1pY1ZhbHVlUmVhc29uLklOVkFMSURfRVhQUkVTU0lPTl9UWVBFO1xuICB9XG5cbiAgaXNGcm9tQ29tcGxleEZ1bmN0aW9uQ2FsbCh0aGlzOiBEeW5hbWljVmFsdWU8Uj4pOiB0aGlzIGlzIER5bmFtaWNWYWx1ZTxGdW5jdGlvbkRlZmluaXRpb24+IHtcbiAgICByZXR1cm4gdGhpcy5jb2RlID09PSBEeW5hbWljVmFsdWVSZWFzb24uQ09NUExFWF9GVU5DVElPTl9DQUxMO1xuICB9XG5cbiAgaXNGcm9tRHluYW1pY1R5cGUodGhpczogRHluYW1pY1ZhbHVlPFI+KTogdGhpcyBpcyBEeW5hbWljVmFsdWUge1xuICAgIHJldHVybiB0aGlzLmNvZGUgPT09IER5bmFtaWNWYWx1ZVJlYXNvbi5EWU5BTUlDX1RZUEU7XG4gIH1cblxuICBpc0Zyb21Vbmtub3duKHRoaXM6IER5bmFtaWNWYWx1ZTxSPik6IHRoaXMgaXMgRHluYW1pY1ZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy5jb2RlID09PSBEeW5hbWljVmFsdWVSZWFzb24uVU5LTk9XTjtcbiAgfVxuXG4gIGFjY2VwdDxSPih2aXNpdG9yOiBEeW5hbWljVmFsdWVWaXNpdG9yPFI+KTogUiB7XG4gICAgc3dpdGNoICh0aGlzLmNvZGUpIHtcbiAgICAgIGNhc2UgRHluYW1pY1ZhbHVlUmVhc29uLkRZTkFNSUNfSU5QVVQ6XG4gICAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0RHluYW1pY0lucHV0KHRoaXMgYXMgdW5rbm93biBhcyBEeW5hbWljVmFsdWU8RHluYW1pY1ZhbHVlPik7XG4gICAgICBjYXNlIER5bmFtaWNWYWx1ZVJlYXNvbi5EWU5BTUlDX1NUUklORzpcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXREeW5hbWljU3RyaW5nKHRoaXMpO1xuICAgICAgY2FzZSBEeW5hbWljVmFsdWVSZWFzb24uRVhURVJOQUxfUkVGRVJFTkNFOlxuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdEV4dGVybmFsUmVmZXJlbmNlKFxuICAgICAgICAgICAgdGhpcyBhcyB1bmtub3duIGFzIER5bmFtaWNWYWx1ZTxSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+Pik7XG4gICAgICBjYXNlIER5bmFtaWNWYWx1ZVJlYXNvbi5VTlNVUFBPUlRFRF9TWU5UQVg6XG4gICAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0VW5zdXBwb3J0ZWRTeW50YXgodGhpcyk7XG4gICAgICBjYXNlIER5bmFtaWNWYWx1ZVJlYXNvbi5VTktOT1dOX0lERU5USUZJRVI6XG4gICAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0VW5rbm93bklkZW50aWZpZXIodGhpcyk7XG4gICAgICBjYXNlIER5bmFtaWNWYWx1ZVJlYXNvbi5JTlZBTElEX0VYUFJFU1NJT05fVFlQRTpcbiAgICAgICAgcmV0dXJuIHZpc2l0b3IudmlzaXRJbnZhbGlkRXhwcmVzc2lvblR5cGUodGhpcyk7XG4gICAgICBjYXNlIER5bmFtaWNWYWx1ZVJlYXNvbi5DT01QTEVYX0ZVTkNUSU9OX0NBTEw6XG4gICAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0Q29tcGxleEZ1bmN0aW9uQ2FsbChcbiAgICAgICAgICAgIHRoaXMgYXMgdW5rbm93biBhcyBEeW5hbWljVmFsdWU8RnVuY3Rpb25EZWZpbml0aW9uPik7XG4gICAgICBjYXNlIER5bmFtaWNWYWx1ZVJlYXNvbi5EWU5BTUlDX1RZUEU6XG4gICAgICAgIHJldHVybiB2aXNpdG9yLnZpc2l0RHluYW1pY1R5cGUodGhpcyk7XG4gICAgICBjYXNlIER5bmFtaWNWYWx1ZVJlYXNvbi5VTktOT1dOOlxuICAgICAgICByZXR1cm4gdmlzaXRvci52aXNpdFVua25vd24odGhpcyk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRHluYW1pY1ZhbHVlVmlzaXRvcjxSPiB7XG4gIHZpc2l0RHluYW1pY0lucHV0KHZhbHVlOiBEeW5hbWljVmFsdWU8RHluYW1pY1ZhbHVlPik6IFI7XG4gIHZpc2l0RHluYW1pY1N0cmluZyh2YWx1ZTogRHluYW1pY1ZhbHVlKTogUjtcbiAgdmlzaXRFeHRlcm5hbFJlZmVyZW5jZSh2YWx1ZTogRHluYW1pY1ZhbHVlPFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4+KTogUjtcbiAgdmlzaXRVbnN1cHBvcnRlZFN5bnRheCh2YWx1ZTogRHluYW1pY1ZhbHVlKTogUjtcbiAgdmlzaXRVbmtub3duSWRlbnRpZmllcih2YWx1ZTogRHluYW1pY1ZhbHVlKTogUjtcbiAgdmlzaXRJbnZhbGlkRXhwcmVzc2lvblR5cGUodmFsdWU6IER5bmFtaWNWYWx1ZSk6IFI7XG4gIHZpc2l0Q29tcGxleEZ1bmN0aW9uQ2FsbCh2YWx1ZTogRHluYW1pY1ZhbHVlPEZ1bmN0aW9uRGVmaW5pdGlvbj4pOiBSO1xuICB2aXNpdER5bmFtaWNUeXBlKHZhbHVlOiBEeW5hbWljVmFsdWUpOiBSO1xuICB2aXNpdFVua25vd24odmFsdWU6IER5bmFtaWNWYWx1ZSk6IFI7XG59XG4iXX0=