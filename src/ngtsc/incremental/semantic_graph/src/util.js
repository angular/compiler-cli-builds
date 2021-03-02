(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph/src/util", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isSetEqual = exports.isArrayEqual = exports.referenceEquality = exports.isReferenceEqual = exports.isSymbolEqual = void 0;
    var tslib_1 = require("tslib");
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
    /**
     * Determines if the provided sets are equal to each other, using the provided equality tester.
     * Sets that only differ in ordering are considered equal.
     */
    function isSetEqual(a, b, equalityTester) {
        var e_1, _a, e_2, _b;
        if (equalityTester === void 0) { equalityTester = referenceEquality; }
        if (a === null || b === null) {
            return a === b;
        }
        if (a.size !== b.size) {
            return false;
        }
        try {
            for (var a_1 = tslib_1.__values(a), a_1_1 = a_1.next(); !a_1_1.done; a_1_1 = a_1.next()) {
                var itemA = a_1_1.value;
                var found = false;
                try {
                    for (var b_1 = (e_2 = void 0, tslib_1.__values(b)), b_1_1 = b_1.next(); !b_1_1.done; b_1_1 = b_1.next()) {
                        var itemB = b_1_1.value;
                        if (equalityTester(itemA, itemB)) {
                            found = true;
                            break;
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (b_1_1 && !b_1_1.done && (_b = b_1.return)) _b.call(b_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                if (!found) {
                    return false;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (a_1_1 && !a_1_1.done && (_a = a_1.return)) _a.call(a_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return true;
    }
    exports.isSetEqual = isSetEqual;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW5jcmVtZW50YWwvc2VtYW50aWNfZ3JhcGgvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVNBOztPQUVHO0lBQ0gsU0FBZ0IsYUFBYSxDQUFDLENBQWlCLEVBQUUsQ0FBaUI7UUFDaEUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUU7WUFDckIsMEVBQTBFO1lBQzFFLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFJLENBQUMsQ0FBQyxVQUFVLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ2xELHNEQUFzRDtZQUN0RCxPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDO0lBQzVELENBQUM7SUFaRCxzQ0FZQztJQUVEOzs7T0FHRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLENBQW9CLEVBQUUsQ0FBb0I7UUFDekUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN0QyxzRkFBc0Y7WUFDdEYsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyxJQUFJLEVBQUU7WUFDbEQseUZBQXlGO1lBQ3pGLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFFRCxPQUFPLENBQUMsQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQztJQUN2QyxDQUFDO0lBWkQsNENBWUM7SUFFRCxTQUFnQixpQkFBaUIsQ0FBSSxDQUFJLEVBQUUsQ0FBSTtRQUM3QyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakIsQ0FBQztJQUZELDhDQUVDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBZ0IsWUFBWSxDQUN4QixDQUFvQixFQUFFLENBQW9CLEVBQzFDLGNBQTJEO1FBQTNELCtCQUFBLEVBQUEsa0NBQTJEO1FBQzdELElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNoQjtRQUVELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFO1lBQ3pCLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFFRCxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUksRUFBRSxLQUFLLElBQUssT0FBQSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQS9CLENBQStCLENBQUMsQ0FBQztJQUNuRSxDQUFDO0lBWkQsb0NBWUM7SUFFRDs7O09BR0c7SUFDSCxTQUFnQixVQUFVLENBQ3RCLENBQXNCLEVBQUUsQ0FBc0IsRUFDOUMsY0FBMkQ7O1FBQTNELCtCQUFBLEVBQUEsa0NBQTJEO1FBQzdELElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNoQjtRQUVELElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFO1lBQ3JCLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7O1lBRUQsS0FBb0IsSUFBQSxNQUFBLGlCQUFBLENBQUMsQ0FBQSxvQkFBQSxtQ0FBRTtnQkFBbEIsSUFBTSxLQUFLLGNBQUE7Z0JBQ2QsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDOztvQkFDbEIsS0FBb0IsSUFBQSxxQkFBQSxpQkFBQSxDQUFDLENBQUEsQ0FBQSxvQkFBQSxtQ0FBRTt3QkFBbEIsSUFBTSxLQUFLLGNBQUE7d0JBQ2QsSUFBSSxjQUFjLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFOzRCQUNoQyxLQUFLLEdBQUcsSUFBSSxDQUFDOzRCQUNiLE1BQU07eUJBQ1A7cUJBQ0Y7Ozs7Ozs7OztnQkFDRCxJQUFJLENBQUMsS0FBSyxFQUFFO29CQUNWLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2FBQ0Y7Ozs7Ozs7OztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQXpCRCxnQ0F5QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7U2VtYW50aWNSZWZlcmVuY2UsIFNlbWFudGljU3ltYm9sfSBmcm9tICcuL2FwaSc7XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBwcm92aWRlZCBzeW1ib2xzIHJlcHJlc2VudCB0aGUgc2FtZSBkZWNsYXJhdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3ltYm9sRXF1YWwoYTogU2VtYW50aWNTeW1ib2wsIGI6IFNlbWFudGljU3ltYm9sKTogYm9vbGVhbiB7XG4gIGlmIChhLmRlY2wgPT09IGIuZGVjbCkge1xuICAgIC8vIElmIHRoZSBkZWNsYXJhdGlvbiBpcyBpZGVudGljYWwgdGhlbiBpdCBtdXN0IHJlcHJlc2VudCB0aGUgc2FtZSBzeW1ib2wuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAoYS5pZGVudGlmaWVyID09PSBudWxsIHx8IGIuaWRlbnRpZmllciA9PT0gbnVsbCkge1xuICAgIC8vIFVuaWRlbnRpZmlhYmxlIHN5bWJvbHMgYXJlIGFzc3VtZWQgdG8gYmUgZGlmZmVyZW50LlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBhLnBhdGggPT09IGIucGF0aCAmJiBhLmlkZW50aWZpZXIgPT09IGIuaWRlbnRpZmllcjtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHByb3ZpZGVkIHJlZmVyZW5jZXMgdG8gYSBzZW1hbnRpYyBzeW1ib2wgYXJlIHN0aWxsIGVxdWFsLCBpLmUuIHJlcHJlc2VudFxuICogdGhlIHNhbWUgc3ltYm9sIGFuZCBhcmUgaW1wb3J0ZWQgYnkgdGhlIHNhbWUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVmZXJlbmNlRXF1YWwoYTogU2VtYW50aWNSZWZlcmVuY2UsIGI6IFNlbWFudGljUmVmZXJlbmNlKTogYm9vbGVhbiB7XG4gIGlmICghaXNTeW1ib2xFcXVhbChhLnN5bWJvbCwgYi5zeW1ib2wpKSB7XG4gICAgLy8gSWYgdGhlIHJlZmVyZW5jZSdzIHRhcmdldCBzeW1ib2xzIGFyZSBkaWZmZXJlbnQsIHRoZSByZWZlcmVuY2UgaXRzZWxmIGlzIGRpZmZlcmVudC5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoYS5pbXBvcnRQYXRoID09PSBudWxsIHx8IGIuaW1wb3J0UGF0aCA9PT0gbnVsbCkge1xuICAgIC8vIElmIG5vIGltcG9ydCBwYXRoIGlzIGtub3duIGZvciBlaXRoZXIgb2YgdGhlIHJlZmVyZW5jZXMgdGhleSBhcmUgY29uc2lkZXJlZCBkaWZmZXJlbnQuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIGEuaW1wb3J0UGF0aCA9PT0gYi5pbXBvcnRQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmZXJlbmNlRXF1YWxpdHk8VD4oYTogVCwgYjogVCk6IGJvb2xlYW4ge1xuICByZXR1cm4gYSA9PT0gYjtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIGlmIHRoZSBwcm92aWRlZCBhcnJheXMgYXJlIGVxdWFsIHRvIGVhY2ggb3RoZXIsIHVzaW5nIHRoZSBwcm92aWRlZCBlcXVhbGl0eSB0ZXN0ZXJcbiAqIHRoYXQgaXMgY2FsbGVkIGZvciBhbGwgZW50cmllcyBpbiB0aGUgYXJyYXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0FycmF5RXF1YWw8VD4oXG4gICAgYTogcmVhZG9ubHkgVFtdfG51bGwsIGI6IHJlYWRvbmx5IFRbXXxudWxsLFxuICAgIGVxdWFsaXR5VGVzdGVyOiAoYTogVCwgYjogVCkgPT4gYm9vbGVhbiA9IHJlZmVyZW5jZUVxdWFsaXR5KTogYm9vbGVhbiB7XG4gIGlmIChhID09PSBudWxsIHx8IGIgPT09IG51bGwpIHtcbiAgICByZXR1cm4gYSA9PT0gYjtcbiAgfVxuXG4gIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gIWEuc29tZSgoaXRlbSwgaW5kZXgpID0+ICFlcXVhbGl0eVRlc3RlcihpdGVtLCBiW2luZGV4XSkpO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIHByb3ZpZGVkIHNldHMgYXJlIGVxdWFsIHRvIGVhY2ggb3RoZXIsIHVzaW5nIHRoZSBwcm92aWRlZCBlcXVhbGl0eSB0ZXN0ZXIuXG4gKiBTZXRzIHRoYXQgb25seSBkaWZmZXIgaW4gb3JkZXJpbmcgYXJlIGNvbnNpZGVyZWQgZXF1YWwuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1NldEVxdWFsPFQ+KFxuICAgIGE6IFJlYWRvbmx5U2V0PFQ+fG51bGwsIGI6IFJlYWRvbmx5U2V0PFQ+fG51bGwsXG4gICAgZXF1YWxpdHlUZXN0ZXI6IChhOiBULCBiOiBUKSA9PiBib29sZWFuID0gcmVmZXJlbmNlRXF1YWxpdHkpOiBib29sZWFuIHtcbiAgaWYgKGEgPT09IG51bGwgfHwgYiA9PT0gbnVsbCkge1xuICAgIHJldHVybiBhID09PSBiO1xuICB9XG5cbiAgaWYgKGEuc2l6ZSAhPT0gYi5zaXplKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yIChjb25zdCBpdGVtQSBvZiBhKSB7XG4gICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBpdGVtQiBvZiBiKSB7XG4gICAgICBpZiAoZXF1YWxpdHlUZXN0ZXIoaXRlbUEsIGl0ZW1CKSkge1xuICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG4iXX0=