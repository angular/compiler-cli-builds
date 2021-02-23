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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvbmdtb2R1bGVfc2VtYW50aWNzL3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBOztPQUVHO0lBQ0gsU0FBZ0IsYUFBYSxDQUFDLENBQWlCLEVBQUUsQ0FBaUI7UUFDaEUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUU7WUFDckIsMEVBQTBFO1lBQzFFLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFJLENBQUMsQ0FBQyxVQUFVLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ2xELHNEQUFzRDtZQUN0RCxPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDO0lBQzVELENBQUM7SUFaRCxzQ0FZQztJQUVEOzs7T0FHRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLENBQW9CLEVBQUUsQ0FBb0I7UUFDekUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN0QyxzRkFBc0Y7WUFDdEYsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDbEQseUZBQXlGO1lBQ3pGLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFFRCxPQUFPLENBQUMsQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQztJQUN2QyxDQUFDO0lBWkQsNENBWUM7SUFFRCxTQUFnQixpQkFBaUIsQ0FBSSxDQUFJLEVBQUUsQ0FBSTtRQUM3QyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakIsQ0FBQztJQUZELDhDQUVDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBZ0IsWUFBWSxDQUN4QixDQUFvQixFQUFFLENBQW9CLEVBQzFDLGNBQTJEO1FBQTNELCtCQUFBLEVBQUEsa0NBQTJEO1FBQzdELElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNoQjtRQUVELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFO1lBQ3pCLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFFRCxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUksRUFBRSxLQUFLLElBQUssT0FBQSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQS9CLENBQStCLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBWkQsb0NBWUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7U2VtYW50aWNSZWZlcmVuY2UsIFNlbWFudGljU3ltYm9sfSBmcm9tICcuL2FwaSc7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBwcm92aWRlZCBzeW1ib2xzIHJlcHJlc2VudCB0aGUgc2FtZSBkZWNsYXJhdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3ltYm9sRXF1YWwoYTogU2VtYW50aWNTeW1ib2wsIGI6IFNlbWFudGljU3ltYm9sKTogYm9vbGVhbiB7XG4gIGlmIChhLmRlY2wgPT09IGIuZGVjbCkge1xuICAgIC8vIElmIHRoZSBkZWNsYXJhdGlvbiBpcyBpZGVudGljYWwgdGhlbiBpdCBtdXN0IHJlcHJlc2VudCB0aGUgc2FtZSBzeW1ib2wuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAoYS5pZGVudGlmaWVyID09PSBudWxsIHx8IGIuaWRlbnRpZmllciA9PT0gbnVsbCkge1xuICAgIC8vIFVuaWRlbnRpZmlhYmxlIHN5bWJvbHMgYXJlIGFzc3VtZWQgdG8gYmUgZGlmZmVyZW50LlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBhLnBhdGggPT09IGIucGF0aCAmJiBhLmlkZW50aWZpZXIgPT09IGIuaWRlbnRpZmllcjtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHByb3ZpZGVkIHJlZmVyZW5jZXMgdG8gYSBzZW1hbnRpYyBzeW1ib2wgYXJlIHN0aWxsIGVxdWFsLCBpLmUuIHJlcHJlc2VudFxuICogdGhlIHNhbWUgc3ltYm9sIGFuZCBhcmUgaW1wb3J0ZWQgYnkgdGhlIHNhbWUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVmZXJlbmNlRXF1YWwoYTogU2VtYW50aWNSZWZlcmVuY2UsIGI6IFNlbWFudGljUmVmZXJlbmNlKTogYm9vbGVhbiB7XG4gIGlmICghaXNTeW1ib2xFcXVhbChhLnN5bWJvbCwgYi5zeW1ib2wpKSB7XG4gICAgLy8gSWYgdGhlIHJlZmVyZW5jZSdzIHRhcmdldCBzeW1ib2xzIGFyZSBkaWZmZXJlbnQsIHRoZSByZWZlcmVuY2UgaXRzZWxmIGlzIGRpZmZlcmVudC5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoYS5pbXBvcnRQYXRoID09PSBudWxsIHx8IGIuaW1wb3J0UGF0aCA9PT0gbnVsbCkge1xuICAgIC8vIElmIG5vIGltcG9ydCBwYXRoIGlzIGtub3duIGZvciBlaXRoZXIgb2YgdGhlIHJlZmVyZW5jZXMgdGhleSBhcmUgY29uc2lkZXJlZCBkaWZmZXJlbnQuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIGEuaW1wb3J0UGF0aCA9PT0gYi5pbXBvcnRQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmZXJlbmNlRXF1YWxpdHk8VD4oYTogVCwgYjogVCk6IGJvb2xlYW4ge1xuICByZXR1cm4gYSA9PT0gYjtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHRoZSBwcm92aWRlZCBhcnJheXMgYXJlIGVxdWFsIHRvIGVhY2ggb3RoZXIsIHVzaW5nIHRoZSBwcm92aWRlZCBlcXVhbGl0eSB0ZXN0ZXJcbiAqIHRoYXQgaXMgY2FsbGVkIGZvciBhbGwgZW50cmllcyBpbiB0aGUgYXJyYXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0FycmF5RXF1YWw8VD4oXG4gICAgYTogcmVhZG9ubHkgVFtdfG51bGwsIGI6IHJlYWRvbmx5IFRbXXxudWxsLFxuICAgIGVxdWFsaXR5VGVzdGVyOiAoYTogVCwgYjogVCkgPT4gYm9vbGVhbiA9IHJlZmVyZW5jZUVxdWFsaXR5KTogYm9vbGVhbiB7XG4gIGlmIChhID09PSBudWxsIHx8IGIgPT09IG51bGwpIHtcbiAgICByZXR1cm4gYSA9PT0gYjtcbiAgfVxuXG4gIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gIWEuc29tZSgoaXRlbSwgaW5kZXgpID0+ICFlcXVhbGl0eVRlc3RlcihpdGVtLCBiW2luZGV4XSkpO1xufVxuIl19