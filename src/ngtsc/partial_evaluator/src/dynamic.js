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
            return new DynamicValue(node, {}, 1 /* DYNAMIC_STRING */);
        };
        DynamicValue.fromExternalReference = function (node, ref) {
            return new DynamicValue(node, ref, 2 /* EXTERNAL_REFERENCE */);
        };
        DynamicValue.fromUnknownExpressionType = function (node) {
            return new DynamicValue(node, {}, 3 /* UNKNOWN_EXPRESSION_TYPE */);
        };
        DynamicValue.fromUnknownIdentifier = function (node) {
            return new DynamicValue(node, {}, 4 /* UNKNOWN_IDENTIFIER */);
        };
        DynamicValue.fromUnknown = function (node) {
            return new DynamicValue(node, {}, 5 /* UNKNOWN */);
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
        DynamicValue.prototype.isFromUnknownExpressionType = function () {
            return this.code === 3 /* UNKNOWN_EXPRESSION_TYPE */;
        };
        DynamicValue.prototype.isFromUnknownIdentifier = function () {
            return this.code === 4 /* UNKNOWN_IDENTIFIER */;
        };
        DynamicValue.prototype.isFromUnknown = function () {
            return this.code === 5 /* UNKNOWN */;
        };
        return DynamicValue;
    }());
    exports.DynamicValue = DynamicValue;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1pYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGFydGlhbF9ldmFsdWF0b3Ivc3JjL2R5bmFtaWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFnREg7O09BRUc7SUFDSDtRQUNFLHNCQUNhLElBQWEsRUFBVyxNQUFTLEVBQVUsSUFBd0I7WUFBbkUsU0FBSSxHQUFKLElBQUksQ0FBUztZQUFXLFdBQU0sR0FBTixNQUFNLENBQUc7WUFBVSxTQUFJLEdBQUosSUFBSSxDQUFvQjtRQUFHLENBQUM7UUFFN0UsNkJBQWdCLEdBQXZCLFVBQXdCLElBQWEsRUFBRSxLQUFtQjtZQUN4RCxPQUFPLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxLQUFLLHdCQUFtQyxDQUFDO1FBQ3pFLENBQUM7UUFFTSw4QkFBaUIsR0FBeEIsVUFBeUIsSUFBYTtZQUNwQyxPQUFPLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLHlCQUFvQyxDQUFDO1FBQ3ZFLENBQUM7UUFFTSxrQ0FBcUIsR0FBNUIsVUFBNkIsSUFBYSxFQUFFLEdBQThCO1lBRXhFLE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLEdBQUcsNkJBQXdDLENBQUM7UUFDNUUsQ0FBQztRQUVNLHNDQUF5QixHQUFoQyxVQUFpQyxJQUFhO1lBQzVDLE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsa0NBQTZDLENBQUM7UUFDaEYsQ0FBQztRQUVNLGtDQUFxQixHQUE1QixVQUE2QixJQUFtQjtZQUM5QyxPQUFPLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLDZCQUF3QyxDQUFDO1FBQzNFLENBQUM7UUFFTSx3QkFBVyxHQUFsQixVQUFtQixJQUFhO1lBQzlCLE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsa0JBQTZCLENBQUM7UUFDaEUsQ0FBQztRQUVELHlDQUFrQixHQUFsQjtZQUNFLE9BQU8sSUFBSSxDQUFDLElBQUksMEJBQXFDLENBQUM7UUFDeEQsQ0FBQztRQUVELDBDQUFtQixHQUFuQjtZQUNFLE9BQU8sSUFBSSxDQUFDLElBQUksMkJBQXNDLENBQUM7UUFDekQsQ0FBQztRQUVELDhDQUF1QixHQUF2QjtZQUNFLE9BQU8sSUFBSSxDQUFDLElBQUksK0JBQTBDLENBQUM7UUFDN0QsQ0FBQztRQUVELGtEQUEyQixHQUEzQjtZQUNFLE9BQU8sSUFBSSxDQUFDLElBQUksb0NBQStDLENBQUM7UUFDbEUsQ0FBQztRQUVELDhDQUF1QixHQUF2QjtZQUNFLE9BQU8sSUFBSSxDQUFDLElBQUksK0JBQTBDLENBQUM7UUFDN0QsQ0FBQztRQUVELG9DQUFhLEdBQWI7WUFDRSxPQUFPLElBQUksQ0FBQyxJQUFJLG9CQUErQixDQUFDO1FBQ2xELENBQUM7UUFDSCxtQkFBQztJQUFELENBQUMsQUFwREQsSUFvREM7SUFwRFksb0NBQVkiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5cbi8qKlxuICogVGhlIHJlYXNvbiB3aHkgYSB2YWx1ZSBjYW5ub3QgYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LlxuICovXG5leHBvcnQgY29uc3QgZW51bSBEeW5hbWljVmFsdWVSZWFzb24ge1xuICAvKipcbiAgICogQSB2YWx1ZSBjb3VsZCBub3QgYmUgZGV0ZXJtaW5lZCBzdGF0aWNhbGx5LCBiZWNhdXNlIGl0IGNvbnRhaW5zIGEgdGVybSB0aGF0IGNvdWxkIG5vdCBiZVxuICAgKiBkZXRlcm1pbmVkIHN0YXRpY2FsbHkuXG4gICAqIChFLmcuIGEgcHJvcGVydHkgYXNzaWdubWVudCBvciBjYWxsIGV4cHJlc3Npb24gd2hlcmUgdGhlIGxocyBpcyBhIGBEeW5hbWljVmFsdWVgLCBhIHRlbXBsYXRlXG4gICAqIGxpdGVyYWwgd2l0aCBhIGR5bmFtaWMgZXhwcmVzc2lvbiwgYW4gb2JqZWN0IGxpdGVyYWwgd2l0aCBhIHNwcmVhZCBhc3NpZ25tZW50IHdoaWNoIGNvdWxkIG5vdFxuICAgKiBiZSBkZXRlcm1pbmVkIHN0YXRpY2FsbHksIGV0Yy4pXG4gICAqL1xuICBEWU5BTUlDX0lOUFVULFxuXG4gIC8qKlxuICAgKiBBIHN0cmluZyBjb3VsZCBub3QgYmUgc3RhdGljYWxseSBldmFsdWF0ZWQuXG4gICAqIChFLmcuIGEgZHluYW1pY2FsbHkgY29uc3RydWN0ZWQgb2JqZWN0IHByb3BlcnR5IG5hbWUgb3IgYSB0ZW1wbGF0ZSBsaXRlcmFsIGV4cHJlc3Npb24gdGhhdFxuICAgKiBjb3VsZCBub3QgYmUgc3RhdGljYWxseSByZXNvbHZlZCB0byBhIHByaW1pdGl2ZSB2YWx1ZS4pXG4gICAqL1xuICBEWU5BTUlDX1NUUklORyxcblxuICAvKipcbiAgICogQW4gZXh0ZXJuYWwgcmVmZXJlbmNlIGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhIHZhbHVlIHdoaWNoIGNhbiBiZSBldmFsdWF0ZWQuXG4gICAqIChFLmcuIGEgY2FsbCBleHByZXNzaW9uIGZvciBhIGZ1bmN0aW9uIGRlY2xhcmVkIGluIGAuZC50c2AuKVxuICAgKi9cbiAgRVhURVJOQUxfUkVGRVJFTkNFLFxuXG4gIC8qKlxuICAgKiBBIHR5cGUgb2YgYHRzLkV4cHJlc3Npb25gIHRoYXQgYFN0YXRpY0ludGVycHJldGVyYCBkb2Vzbid0IGtub3cgaG93IHRvIGV2YWx1YXRlLlxuICAgKi9cbiAgVU5LTk9XTl9FWFBSRVNTSU9OX1RZUEUsXG5cbiAgLyoqXG4gICAqIEEgZGVjbGFyYXRpb24gb2YgYSBgdHMuSWRlbnRpZmllcmAgY291bGQgbm90IGJlIGZvdW5kLlxuICAgKi9cbiAgVU5LTk9XTl9JREVOVElGSUVSLFxuXG4gIC8qKlxuICAgKiBBIHZhbHVlIGNvdWxkIG5vdCBiZSBkZXRlcm1pbmVkIHN0YXRpY2FsbHkgZm9yIGFueSByZWFzb24gb3RoZXIgdGhlIGFib3ZlLlxuICAgKi9cbiAgVU5LTk9XTixcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgdmFsdWUgd2hpY2ggY2Fubm90IGJlIGRldGVybWluZWQgc3RhdGljYWxseS5cbiAqL1xuZXhwb3J0IGNsYXNzIER5bmFtaWNWYWx1ZTxSID0ge30+IHtcbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IG5vZGU6IHRzLk5vZGUsIHJlYWRvbmx5IHJlYXNvbjogUiwgcHJpdmF0ZSBjb2RlOiBEeW5hbWljVmFsdWVSZWFzb24pIHt9XG5cbiAgc3RhdGljIGZyb21EeW5hbWljSW5wdXQobm9kZTogdHMuTm9kZSwgaW5wdXQ6IER5bmFtaWNWYWx1ZSk6IER5bmFtaWNWYWx1ZTxEeW5hbWljVmFsdWU+IHtcbiAgICByZXR1cm4gbmV3IER5bmFtaWNWYWx1ZShub2RlLCBpbnB1dCwgRHluYW1pY1ZhbHVlUmVhc29uLkRZTkFNSUNfSU5QVVQpO1xuICB9XG5cbiAgc3RhdGljIGZyb21EeW5hbWljU3RyaW5nKG5vZGU6IHRzLk5vZGUpOiBEeW5hbWljVmFsdWUge1xuICAgIHJldHVybiBuZXcgRHluYW1pY1ZhbHVlKG5vZGUsIHt9LCBEeW5hbWljVmFsdWVSZWFzb24uRFlOQU1JQ19TVFJJTkcpO1xuICB9XG5cbiAgc3RhdGljIGZyb21FeHRlcm5hbFJlZmVyZW5jZShub2RlOiB0cy5Ob2RlLCByZWY6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4pOlxuICAgICAgRHluYW1pY1ZhbHVlPFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4+IHtcbiAgICByZXR1cm4gbmV3IER5bmFtaWNWYWx1ZShub2RlLCByZWYsIER5bmFtaWNWYWx1ZVJlYXNvbi5FWFRFUk5BTF9SRUZFUkVOQ0UpO1xuICB9XG5cbiAgc3RhdGljIGZyb21Vbmtub3duRXhwcmVzc2lvblR5cGUobm9kZTogdHMuTm9kZSk6IER5bmFtaWNWYWx1ZSB7XG4gICAgcmV0dXJuIG5ldyBEeW5hbWljVmFsdWUobm9kZSwge30sIER5bmFtaWNWYWx1ZVJlYXNvbi5VTktOT1dOX0VYUFJFU1NJT05fVFlQRSk7XG4gIH1cblxuICBzdGF0aWMgZnJvbVVua25vd25JZGVudGlmaWVyKG5vZGU6IHRzLklkZW50aWZpZXIpOiBEeW5hbWljVmFsdWUge1xuICAgIHJldHVybiBuZXcgRHluYW1pY1ZhbHVlKG5vZGUsIHt9LCBEeW5hbWljVmFsdWVSZWFzb24uVU5LTk9XTl9JREVOVElGSUVSKTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tVW5rbm93bihub2RlOiB0cy5Ob2RlKTogRHluYW1pY1ZhbHVlIHtcbiAgICByZXR1cm4gbmV3IER5bmFtaWNWYWx1ZShub2RlLCB7fSwgRHluYW1pY1ZhbHVlUmVhc29uLlVOS05PV04pO1xuICB9XG5cbiAgaXNGcm9tRHluYW1pY0lucHV0KHRoaXM6IER5bmFtaWNWYWx1ZTxSPik6IHRoaXMgaXMgRHluYW1pY1ZhbHVlPER5bmFtaWNWYWx1ZT4ge1xuICAgIHJldHVybiB0aGlzLmNvZGUgPT09IER5bmFtaWNWYWx1ZVJlYXNvbi5EWU5BTUlDX0lOUFVUO1xuICB9XG5cbiAgaXNGcm9tRHluYW1pY1N0cmluZyh0aGlzOiBEeW5hbWljVmFsdWU8Uj4pOiB0aGlzIGlzIER5bmFtaWNWYWx1ZSB7XG4gICAgcmV0dXJuIHRoaXMuY29kZSA9PT0gRHluYW1pY1ZhbHVlUmVhc29uLkRZTkFNSUNfU1RSSU5HO1xuICB9XG5cbiAgaXNGcm9tRXh0ZXJuYWxSZWZlcmVuY2UodGhpczogRHluYW1pY1ZhbHVlPFI+KTogdGhpcyBpcyBEeW5hbWljVmFsdWU8UmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPj4ge1xuICAgIHJldHVybiB0aGlzLmNvZGUgPT09IER5bmFtaWNWYWx1ZVJlYXNvbi5FWFRFUk5BTF9SRUZFUkVOQ0U7XG4gIH1cblxuICBpc0Zyb21Vbmtub3duRXhwcmVzc2lvblR5cGUodGhpczogRHluYW1pY1ZhbHVlPFI+KTogdGhpcyBpcyBEeW5hbWljVmFsdWUge1xuICAgIHJldHVybiB0aGlzLmNvZGUgPT09IER5bmFtaWNWYWx1ZVJlYXNvbi5VTktOT1dOX0VYUFJFU1NJT05fVFlQRTtcbiAgfVxuXG4gIGlzRnJvbVVua25vd25JZGVudGlmaWVyKHRoaXM6IER5bmFtaWNWYWx1ZTxSPik6IHRoaXMgaXMgRHluYW1pY1ZhbHVlIHtcbiAgICByZXR1cm4gdGhpcy5jb2RlID09PSBEeW5hbWljVmFsdWVSZWFzb24uVU5LTk9XTl9JREVOVElGSUVSO1xuICB9XG5cbiAgaXNGcm9tVW5rbm93bih0aGlzOiBEeW5hbWljVmFsdWU8Uj4pOiB0aGlzIGlzIER5bmFtaWNWYWx1ZSB7XG4gICAgcmV0dXJuIHRoaXMuY29kZSA9PT0gRHluYW1pY1ZhbHVlUmVhc29uLlVOS05PV047XG4gIH1cbn1cbiJdfQ==