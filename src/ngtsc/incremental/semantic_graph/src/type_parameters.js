(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph/src/type_parameters", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.areTypeParametersEqual = exports.extractSemanticTypeParameters = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph/src/util");
    /**
     * Converts the type parameters of the given class into their semantic representation. If the class
     * does not have any type parameters, then `null` is returned.
     */
    function extractSemanticTypeParameters(node) {
        if (!ts.isClassDeclaration(node) || node.typeParameters === undefined) {
            return null;
        }
        return node.typeParameters.map(function (typeParam) { return ({ hasGenericTypeBound: typeParam.constraint !== undefined }); });
    }
    exports.extractSemanticTypeParameters = extractSemanticTypeParameters;
    /**
     * Compares the list of type parameters to determine if they can be considered equal.
     */
    function areTypeParametersEqual(current, previous) {
        // First compare all type parameters one-to-one; any differences mean that the list of type
        // parameters has changed.
        if (!(0, util_1.isArrayEqual)(current, previous, isTypeParameterEqual)) {
            return false;
        }
        // If there is a current list of type parameters and if any of them has a generic type constraint,
        // then the meaning of that type parameter may have changed without us being aware; as such we
        // have to assume that the type parameters have in fact changed.
        if (current !== null && current.some(function (typeParam) { return typeParam.hasGenericTypeBound; })) {
            return false;
        }
        return true;
    }
    exports.areTypeParametersEqual = areTypeParametersEqual;
    function isTypeParameterEqual(a, b) {
        return a.hasGenericTypeBound === b.hasGenericTypeBound;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZV9wYXJhbWV0ZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmNyZW1lbnRhbC9zZW1hbnRpY19ncmFwaC9zcmMvdHlwZV9wYXJhbWV0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUdqQyw0RkFBb0M7SUFzQnBDOzs7T0FHRztJQUNILFNBQWdCLDZCQUE2QixDQUFDLElBQXNCO1FBRWxFLElBQUksQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUU7WUFDckUsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQzFCLFVBQUEsU0FBUyxJQUFJLE9BQUEsQ0FBQyxFQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFDLENBQUMsRUFBM0QsQ0FBMkQsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFSRCxzRUFRQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0Isc0JBQXNCLENBQ2xDLE9BQXFDLEVBQUUsUUFBc0M7UUFDL0UsMkZBQTJGO1FBQzNGLDBCQUEwQjtRQUMxQixJQUFJLENBQUMsSUFBQSxtQkFBWSxFQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsb0JBQW9CLENBQUMsRUFBRTtZQUMxRCxPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsa0dBQWtHO1FBQ2xHLDhGQUE4RjtRQUM5RixnRUFBZ0U7UUFDaEUsSUFBSSxPQUFPLEtBQUssSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsbUJBQW1CLEVBQTdCLENBQTZCLENBQUMsRUFBRTtZQUNoRixPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBaEJELHdEQWdCQztJQUVELFNBQVMsb0JBQW9CLENBQUMsQ0FBd0IsRUFBRSxDQUF3QjtRQUM5RSxPQUFPLENBQUMsQ0FBQyxtQkFBbUIsS0FBSyxDQUFDLENBQUMsbUJBQW1CLENBQUM7SUFDekQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge2lzQXJyYXlFcXVhbH0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBEZXNjcmliZXMgYSBnZW5lcmljIHR5cGUgcGFyYW1ldGVyIG9mIGEgc2VtYW50aWMgc3ltYm9sLiBBIGNsYXNzIGRlY2xhcmF0aW9uIHdpdGggdHlwZSBwYXJhbWV0ZXJzXG4gKiBuZWVkcyBzcGVjaWFsIGNvbnNpZGVyYXRpb24gaW4gY2VydGFpbiBjb250ZXh0cy4gRm9yIGV4YW1wbGUsIHRlbXBsYXRlIHR5cGUtY2hlY2sgYmxvY2tzIG1heVxuICogY29udGFpbiB0eXBlIGNvbnN0cnVjdG9ycyBvZiB1c2VkIGRpcmVjdGl2ZXMgd2hpY2ggaW5jbHVkZSB0aGUgdHlwZSBwYXJhbWV0ZXJzIG9mIHRoZSBkaXJlY3RpdmUuXG4gKiBBcyBhIGNvbnNlcXVlbmNlLCBpZiBhIGNoYW5nZSBpcyBtYWRlIHRoYXQgYWZmZWN0cyB0aGUgdHlwZSBwYXJhbWV0ZXJzIG9mIHNhaWQgZGlyZWN0aXZlLCBhbnlcbiAqIHRlbXBsYXRlIHR5cGUtY2hlY2sgYmxvY2tzIHRoYXQgdXNlIHRoZSBkaXJlY3RpdmUgbmVlZCB0byBiZSByZWdlbmVyYXRlZC5cbiAqXG4gKiBUaGlzIHR5cGUgcmVwcmVzZW50cyBhIHNpbmdsZSBnZW5lcmljIHR5cGUgcGFyYW1ldGVyLiBJdCBjdXJyZW50bHkgb25seSB0cmFja3Mgd2hldGhlciB0aGVcbiAqIHR5cGUgcGFyYW1ldGVyIGhhcyBhIGNvbnN0cmFpbnQsIGkuZS4gaGFzIGFuIGBleHRlbmRzYCBjbGF1c2UuIFdoZW4gYSBjb25zdHJhaW50IGlzIHByZXNlbnQsIHdlXG4gKiBjdXJyZW50bHkgYXNzdW1lIHRoYXQgdGhlIHR5cGUgcGFyYW1ldGVyIGlzIGFmZmVjdGVkIGluIGVhY2ggaW5jcmVtZW50YWwgcmVidWlsZDsgcHJvdmluZyB0aGF0XG4gKiBhIHR5cGUgcGFyYW1ldGVyIHdpdGggY29uc3RyYWludCBpcyBub3QgYWZmZWN0ZWQgaXMgbm9uLXRyaXZpYWwgYXMgaXQgcmVxdWlyZXMgZnVsbCBzZW1hbnRpY1xuICogdW5kZXJzdGFuZGluZyBvZiB0aGUgdHlwZSBjb25zdHJhaW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlbWFudGljVHlwZVBhcmFtZXRlciB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIGEgdHlwZSBjb25zdHJhaW50LCBpLmUuIGFuIGBleHRlbmRzYCBjbGF1c2UgaXMgcHJlc2VudCBvbiB0aGUgdHlwZSBwYXJhbWV0ZXIuXG4gICAqL1xuICBoYXNHZW5lcmljVHlwZUJvdW5kOiBib29sZWFuO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIHRoZSB0eXBlIHBhcmFtZXRlcnMgb2YgdGhlIGdpdmVuIGNsYXNzIGludG8gdGhlaXIgc2VtYW50aWMgcmVwcmVzZW50YXRpb24uIElmIHRoZSBjbGFzc1xuICogZG9lcyBub3QgaGF2ZSBhbnkgdHlwZSBwYXJhbWV0ZXJzLCB0aGVuIGBudWxsYCBpcyByZXR1cm5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RTZW1hbnRpY1R5cGVQYXJhbWV0ZXJzKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBTZW1hbnRpY1R5cGVQYXJhbWV0ZXJbXXxcbiAgICBudWxsIHtcbiAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgfHwgbm9kZS50eXBlUGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gbm9kZS50eXBlUGFyYW1ldGVycy5tYXAoXG4gICAgICB0eXBlUGFyYW0gPT4gKHtoYXNHZW5lcmljVHlwZUJvdW5kOiB0eXBlUGFyYW0uY29uc3RyYWludCAhPT0gdW5kZWZpbmVkfSkpO1xufVxuXG4vKipcbiAqIENvbXBhcmVzIHRoZSBsaXN0IG9mIHR5cGUgcGFyYW1ldGVycyB0byBkZXRlcm1pbmUgaWYgdGhleSBjYW4gYmUgY29uc2lkZXJlZCBlcXVhbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFyZVR5cGVQYXJhbWV0ZXJzRXF1YWwoXG4gICAgY3VycmVudDogU2VtYW50aWNUeXBlUGFyYW1ldGVyW118bnVsbCwgcHJldmlvdXM6IFNlbWFudGljVHlwZVBhcmFtZXRlcltdfG51bGwpOiBib29sZWFuIHtcbiAgLy8gRmlyc3QgY29tcGFyZSBhbGwgdHlwZSBwYXJhbWV0ZXJzIG9uZS10by1vbmU7IGFueSBkaWZmZXJlbmNlcyBtZWFuIHRoYXQgdGhlIGxpc3Qgb2YgdHlwZVxuICAvLyBwYXJhbWV0ZXJzIGhhcyBjaGFuZ2VkLlxuICBpZiAoIWlzQXJyYXlFcXVhbChjdXJyZW50LCBwcmV2aW91cywgaXNUeXBlUGFyYW1ldGVyRXF1YWwpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gSWYgdGhlcmUgaXMgYSBjdXJyZW50IGxpc3Qgb2YgdHlwZSBwYXJhbWV0ZXJzIGFuZCBpZiBhbnkgb2YgdGhlbSBoYXMgYSBnZW5lcmljIHR5cGUgY29uc3RyYWludCxcbiAgLy8gdGhlbiB0aGUgbWVhbmluZyBvZiB0aGF0IHR5cGUgcGFyYW1ldGVyIG1heSBoYXZlIGNoYW5nZWQgd2l0aG91dCB1cyBiZWluZyBhd2FyZTsgYXMgc3VjaCB3ZVxuICAvLyBoYXZlIHRvIGFzc3VtZSB0aGF0IHRoZSB0eXBlIHBhcmFtZXRlcnMgaGF2ZSBpbiBmYWN0IGNoYW5nZWQuXG4gIGlmIChjdXJyZW50ICE9PSBudWxsICYmIGN1cnJlbnQuc29tZSh0eXBlUGFyYW0gPT4gdHlwZVBhcmFtLmhhc0dlbmVyaWNUeXBlQm91bmQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGlzVHlwZVBhcmFtZXRlckVxdWFsKGE6IFNlbWFudGljVHlwZVBhcmFtZXRlciwgYjogU2VtYW50aWNUeXBlUGFyYW1ldGVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBhLmhhc0dlbmVyaWNUeXBlQm91bmQgPT09IGIuaGFzR2VuZXJpY1R5cGVCb3VuZDtcbn1cbiJdfQ==