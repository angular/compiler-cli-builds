(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph/src/util", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isArrayEqual = exports.referenceEquality = exports.isReferenceEqual = exports.isSymbolEqual = void 0;
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
    /**
     * Determines whether the provided references to a semantic symbol are still equal, i.e. represent
     * the same symbol and are imported by the same path.
     */
    function isReferenceEqual(a, b) {
        if (!isSymbolEqual(a.symbol, b.symbol)) {
            // If the reference's target symbols are different, the reference itself is different.
            return false;
        }
        if (a.importPath === null || b.importPath === null) {
            // If no import path is known for either of the references they are considered different.
            return false;
        }
        return a.importPath === b.importPath;
    }
    exports.isReferenceEqual = isReferenceEqual;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW5jcmVtZW50YWwvc2VtYW50aWNfZ3JhcGgvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBU0E7O09BRUc7SUFDSCxTQUFnQixhQUFhLENBQUMsQ0FBaUIsRUFBRSxDQUFpQjtRQUNoRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRTtZQUNyQiwwRUFBMEU7WUFDMUUsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDbEQsc0RBQXNEO1lBQ3RELE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFFRCxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsVUFBVSxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUM7SUFDNUQsQ0FBQztJQVpELHNDQVlDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBZ0IsZ0JBQWdCLENBQUMsQ0FBb0IsRUFBRSxDQUFvQjtRQUN6RSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3RDLHNGQUFzRjtZQUN0RixPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsSUFBSSxDQUFDLENBQUMsVUFBVSxLQUFLLElBQUksSUFBSSxDQUFDLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtZQUNsRCx5RkFBeUY7WUFDekYsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELE9BQU8sQ0FBQyxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDO0lBQ3ZDLENBQUM7SUFaRCw0Q0FZQztJQUVELFNBQWdCLGlCQUFpQixDQUFJLENBQUksRUFBRSxDQUFJO1FBQzdDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRkQsOENBRUM7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixZQUFZLENBQ3hCLENBQW9CLEVBQUUsQ0FBb0IsRUFDMUMsY0FBMkQ7UUFBM0QsK0JBQUEsRUFBQSxrQ0FBMkQ7UUFDN0QsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDNUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2hCO1FBRUQsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUU7WUFDekIsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSSxFQUFFLEtBQUssSUFBSyxPQUFBLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBL0IsQ0FBK0IsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFaRCxvQ0FZQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtTZW1hbnRpY1JlZmVyZW5jZSwgU2VtYW50aWNTeW1ib2x9IGZyb20gJy4vYXBpJztcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHByb3ZpZGVkIHN5bWJvbHMgcmVwcmVzZW50IHRoZSBzYW1lIGRlY2xhcmF0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTeW1ib2xFcXVhbChhOiBTZW1hbnRpY1N5bWJvbCwgYjogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgaWYgKGEuZGVjbCA9PT0gYi5kZWNsKSB7XG4gICAgLy8gSWYgdGhlIGRlY2xhcmF0aW9uIGlzIGlkZW50aWNhbCB0aGVuIGl0IG11c3QgcmVwcmVzZW50IHRoZSBzYW1lIHN5bWJvbC5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChhLmlkZW50aWZpZXIgPT09IG51bGwgfHwgYi5pZGVudGlmaWVyID09PSBudWxsKSB7XG4gICAgLy8gVW5pZGVudGlmaWFibGUgc3ltYm9scyBhcmUgYXNzdW1lZCB0byBiZSBkaWZmZXJlbnQuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIGEucGF0aCA9PT0gYi5wYXRoICYmIGEuaWRlbnRpZmllciA9PT0gYi5pZGVudGlmaWVyO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgcHJvdmlkZWQgcmVmZXJlbmNlcyB0byBhIHNlbWFudGljIHN5bWJvbCBhcmUgc3RpbGwgZXF1YWwsIGkuZS4gcmVwcmVzZW50XG4gKiB0aGUgc2FtZSBzeW1ib2wgYW5kIGFyZSBpbXBvcnRlZCBieSB0aGUgc2FtZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZWZlcmVuY2VFcXVhbChhOiBTZW1hbnRpY1JlZmVyZW5jZSwgYjogU2VtYW50aWNSZWZlcmVuY2UpOiBib29sZWFuIHtcbiAgaWYgKCFpc1N5bWJvbEVxdWFsKGEuc3ltYm9sLCBiLnN5bWJvbCkpIHtcbiAgICAvLyBJZiB0aGUgcmVmZXJlbmNlJ3MgdGFyZ2V0IHN5bWJvbHMgYXJlIGRpZmZlcmVudCwgdGhlIHJlZmVyZW5jZSBpdHNlbGYgaXMgZGlmZmVyZW50LlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChhLmltcG9ydFBhdGggPT09IG51bGwgfHwgYi5pbXBvcnRQYXRoID09PSBudWxsKSB7XG4gICAgLy8gSWYgbm8gaW1wb3J0IHBhdGggaXMga25vd24gZm9yIGVpdGhlciBvZiB0aGUgcmVmZXJlbmNlcyB0aGV5IGFyZSBjb25zaWRlcmVkIGRpZmZlcmVudC5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gYS5pbXBvcnRQYXRoID09PSBiLmltcG9ydFBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWZlcmVuY2VFcXVhbGl0eTxUPihhOiBULCBiOiBUKTogYm9vbGVhbiB7XG4gIHJldHVybiBhID09PSBiO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIHByb3ZpZGVkIGFycmF5cyBhcmUgZXF1YWwgdG8gZWFjaCBvdGhlciwgdXNpbmcgdGhlIHByb3ZpZGVkIGVxdWFsaXR5IHRlc3RlclxuICogdGhhdCBpcyBjYWxsZWQgZm9yIGFsbCBlbnRyaWVzIGluIHRoZSBhcnJheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQXJyYXlFcXVhbDxUPihcbiAgICBhOiByZWFkb25seSBUW118bnVsbCwgYjogcmVhZG9ubHkgVFtdfG51bGwsXG4gICAgZXF1YWxpdHlUZXN0ZXI6IChhOiBULCBiOiBUKSA9PiBib29sZWFuID0gcmVmZXJlbmNlRXF1YWxpdHkpOiBib29sZWFuIHtcbiAgaWYgKGEgPT09IG51bGwgfHwgYiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBhID09PSBiO1xuICB9XG5cbiAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiAhYS5zb21lKChpdGVtLCBpbmRleCkgPT4gIWVxdWFsaXR5VGVzdGVyKGl0ZW0sIGJbaW5kZXhdKSk7XG59XG4iXX0=