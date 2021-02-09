(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isArrayEqual = exports.referenceEquality = exports.isSymbolEqual = void 0;
    /**
     * Determines whether the provided symbols represent the same declaration.
     */
    function isSymbolEqual(a, b) {
        if (a.decl === b.decl) {
            // If the declaration is identical then it must represent the same symbol.
            return true;
        }
        if (a.identifier === null || b.identifier === null) {
            // Unidentifiable symbols are assumed to be different.
            return false;
        }
        return a.path === b.path && a.identifier === b.identifier;
    }
    exports.isSymbolEqual = isSymbolEqual;
    function referenceEquality(a, b) {
        return a === b;
    }
    exports.referenceEquality = referenceEquality;
    /**
     * Determines if the provided arrays are equal to each other, using the provided equality tester
     * that is called for all entries in the array.
     */
    function isArrayEqual(a, b, equalityTester) {
        if (equalityTester === void 0) { equalityTester = referenceEquality; }
        if (a === null || b === null) {
            return a === b;
        }
        if (a.length !== b.length) {
            return false;
        }
        return !a.some(function (item, index) { return !equalityTester(item, b[index]); });
    }
    exports.isArrayEqual = isArrayEqual;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvbmdtb2R1bGVfc2VtYW50aWNzL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBOztPQUVHO0lBQ0gsU0FBZ0IsYUFBYSxDQUFDLENBQWlCLEVBQUUsQ0FBaUI7UUFDaEUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUU7WUFDckIsMEVBQTBFO1lBQzFFLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFJLENBQUMsQ0FBQyxVQUFVLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ2xELHNEQUFzRDtZQUN0RCxPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDO0lBQzVELENBQUM7SUFaRCxzQ0FZQztJQUVELFNBQWdCLGlCQUFpQixDQUFJLENBQUksRUFBRSxDQUFJO1FBQzdDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRkQsOENBRUM7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixZQUFZLENBQ3hCLENBQW9CLEVBQUUsQ0FBb0IsRUFDMUMsY0FBMkQ7UUFBM0QsK0JBQUEsRUFBQSxrQ0FBMkQ7UUFDN0QsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDNUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2hCO1FBRUQsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUU7WUFDekIsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSSxFQUFFLEtBQUssSUFBSyxPQUFBLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBL0IsQ0FBK0IsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFaRCxvQ0FZQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi9hcGknO1xuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgcHJvdmlkZWQgc3ltYm9scyByZXByZXNlbnQgdGhlIHNhbWUgZGVjbGFyYXRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bWJvbEVxdWFsKGE6IFNlbWFudGljU3ltYm9sLCBiOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICBpZiAoYS5kZWNsID09PSBiLmRlY2wpIHtcbiAgICAvLyBJZiB0aGUgZGVjbGFyYXRpb24gaXMgaWRlbnRpY2FsIHRoZW4gaXQgbXVzdCByZXByZXNlbnQgdGhlIHNhbWUgc3ltYm9sLlxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKGEuaWRlbnRpZmllciA9PT0gbnVsbCB8fCBiLmlkZW50aWZpZXIgPT09IG51bGwpIHtcbiAgICAvLyBVbmlkZW50aWZpYWJsZSBzeW1ib2xzIGFyZSBhc3N1bWVkIHRvIGJlIGRpZmZlcmVudC5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gYS5wYXRoID09PSBiLnBhdGggJiYgYS5pZGVudGlmaWVyID09PSBiLmlkZW50aWZpZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZlcmVuY2VFcXVhbGl0eTxUPihhOiBULCBiOiBUKTogYm9vbGVhbiB7XG4gIHJldHVybiBhID09PSBiO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIHByb3ZpZGVkIGFycmF5cyBhcmUgZXF1YWwgdG8gZWFjaCBvdGhlciwgdXNpbmcgdGhlIHByb3ZpZGVkIGVxdWFsaXR5IHRlc3RlclxuICogdGhhdCBpcyBjYWxsZWQgZm9yIGFsbCBlbnRyaWVzIGluIHRoZSBhcnJheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQXJyYXlFcXVhbDxUPihcbiAgICBhOiByZWFkb25seSBUW118bnVsbCwgYjogcmVhZG9ubHkgVFtdfG51bGwsXG4gICAgZXF1YWxpdHlUZXN0ZXI6IChhOiBULCBiOiBUKSA9PiBib29sZWFuID0gcmVmZXJlbmNlRXF1YWxpdHkpOiBib29sZWFuIHtcbiAgaWYgKGEgPT09IG51bGwgfHwgYiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBhID09PSBiO1xuICB9XG5cbiAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiAhYS5zb21lKChpdGVtLCBpbmRleCkgPT4gIWVxdWFsaXR5VGVzdGVyKGl0ZW0sIGJbaW5kZXhdKSk7XG59XG4iXX0=