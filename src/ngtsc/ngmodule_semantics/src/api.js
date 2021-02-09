(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SemanticSymbol = void 0;
    /**
     * Represents a symbol that is recognizable across incremental rebuilds, which enables the captured
     * metadata to be compared to the prior compilation. This allows for semantic understanding of
     * the changes that have been made in a rebuild, which potentially enables more reuse of work
     * from the prior compilation.
     */
    var SemanticSymbol = /** @class */ (function () {
        function SemanticSymbol(
        /**
         * The path of the file that declares this symbol.
         */
        path, 
        /**
         * The declaration for this symbol.
         */
        decl, 
        /**
         * The identifier of this symbol, or null if no identifier could be determined. It should
         * uniquely identify the symbol relative to `file`. This is typically just the name of a
         * top-level class declaration, as that uniquely identifies the class within the file.
         *
         * If the identifier is null, then this symbol cannot be recognized across rebuilds. In that
         * case, the symbol is always assumed to have semantically changed to guarantee a proper
         * rebuild.
         */
        identifier) {
            this.path = path;
            this.decl = decl;
            this.identifier = identifier;
        }
        return SemanticSymbol;
    }());
    exports.SemanticSymbol = SemanticSymbol;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9uZ21vZHVsZV9zZW1hbnRpY3Mvc3JjL2FwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFnQkE7Ozs7O09BS0c7SUFDSDtRQUNFO1FBQ0k7O1dBRUc7UUFDYSxJQUFvQjtRQUVwQzs7V0FFRztRQUNhLElBQXNCO1FBRXRDOzs7Ozs7OztXQVFHO1FBQ2EsVUFBdUI7WUFoQnZCLFNBQUksR0FBSixJQUFJLENBQWdCO1lBS3BCLFNBQUksR0FBSixJQUFJLENBQWtCO1lBV3RCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFBRyxDQUFDO1FBOEJqRCxxQkFBQztJQUFELENBQUMsQUFuREQsSUFtREM7SUFuRHFCLHdDQUFjIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBkZWNsYXJhdGlvbiB0byBpdHMgc2VtYW50aWMgc3ltYm9sLiBJZiBubyBzZW1hbnRpYyBzeW1ib2wgaXMgYXZhaWxhYmxlIHRoZW4gYW5cbiAqIGBVbnJlc29sdmVkU3ltYm9sYCB0aGF0IHJlcHJlc2VudHMgYGRlY2xgIGlzIHJldHVybmVkLlxuICovXG5leHBvcnQgdHlwZSBTeW1ib2xSZXNvbHZlciA9IChkZWNsOiBDbGFzc0RlY2xhcmF0aW9uKSA9PiBTZW1hbnRpY1N5bWJvbDtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc3ltYm9sIHRoYXQgaXMgcmVjb2duaXphYmxlIGFjcm9zcyBpbmNyZW1lbnRhbCByZWJ1aWxkcywgd2hpY2ggZW5hYmxlcyB0aGUgY2FwdHVyZWRcbiAqIG1ldGFkYXRhIHRvIGJlIGNvbXBhcmVkIHRvIHRoZSBwcmlvciBjb21waWxhdGlvbi4gVGhpcyBhbGxvd3MgZm9yIHNlbWFudGljIHVuZGVyc3RhbmRpbmcgb2ZcbiAqIHRoZSBjaGFuZ2VzIHRoYXQgaGF2ZSBiZWVuIG1hZGUgaW4gYSByZWJ1aWxkLCB3aGljaCBwb3RlbnRpYWxseSBlbmFibGVzIG1vcmUgcmV1c2Ugb2Ygd29ya1xuICogZnJvbSB0aGUgcHJpb3IgY29tcGlsYXRpb24uXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTZW1hbnRpY1N5bWJvbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqXG4gICAgICAgKiBUaGUgcGF0aCBvZiB0aGUgZmlsZSB0aGF0IGRlY2xhcmVzIHRoaXMgc3ltYm9sLlxuICAgICAgICovXG4gICAgICBwdWJsaWMgcmVhZG9ubHkgcGF0aDogQWJzb2x1dGVGc1BhdGgsXG5cbiAgICAgIC8qKlxuICAgICAgICogVGhlIGRlY2xhcmF0aW9uIGZvciB0aGlzIHN5bWJvbC5cbiAgICAgICAqL1xuICAgICAgcHVibGljIHJlYWRvbmx5IGRlY2w6IENsYXNzRGVjbGFyYXRpb24sXG5cbiAgICAgIC8qKlxuICAgICAgICogVGhlIGlkZW50aWZpZXIgb2YgdGhpcyBzeW1ib2wsIG9yIG51bGwgaWYgbm8gaWRlbnRpZmllciBjb3VsZCBiZSBkZXRlcm1pbmVkLiBJdCBzaG91bGRcbiAgICAgICAqIHVuaXF1ZWx5IGlkZW50aWZ5IHRoZSBzeW1ib2wgcmVsYXRpdmUgdG8gYGZpbGVgLiBUaGlzIGlzIHR5cGljYWxseSBqdXN0IHRoZSBuYW1lIG9mIGFcbiAgICAgICAqIHRvcC1sZXZlbCBjbGFzcyBkZWNsYXJhdGlvbiwgYXMgdGhhdCB1bmlxdWVseSBpZGVudGlmaWVzIHRoZSBjbGFzcyB3aXRoaW4gdGhlIGZpbGUuXG4gICAgICAgKlxuICAgICAgICogSWYgdGhlIGlkZW50aWZpZXIgaXMgbnVsbCwgdGhlbiB0aGlzIHN5bWJvbCBjYW5ub3QgYmUgcmVjb2duaXplZCBhY3Jvc3MgcmVidWlsZHMuIEluIHRoYXRcbiAgICAgICAqIGNhc2UsIHRoZSBzeW1ib2wgaXMgYWx3YXlzIGFzc3VtZWQgdG8gaGF2ZSBzZW1hbnRpY2FsbHkgY2hhbmdlZCB0byBndWFyYW50ZWUgYSBwcm9wZXJcbiAgICAgICAqIHJlYnVpbGQuXG4gICAgICAgKi9cbiAgICAgIHB1YmxpYyByZWFkb25seSBpZGVudGlmaWVyOiBzdHJpbmd8bnVsbCkge31cblxuICAvKipcbiAgICogQWxsb3dzIHRoZSBzeW1ib2wgdG8gY29ubmVjdCBpdHNlbGYgdG8gb3RoZXIgc3ltYm9scy4gVGhpcyBpcyBjYWxsZWQgZm9yIGFsbCByZWdpc3RlcmVkXG4gICAqIHN5bWJvbHMsIGJlZm9yZSB0aGUgc3ltYm9sIGlzIGNvbXBhcmVkIGFnYWluc3QgaXRzIHByZXZpb3VzIHN5bWJvbCBpbiBgZGlmZmAuXG4gICAqXG4gICAqIEBwYXJhbSByZXNvbHZlIEEgZnVuY3Rpb24gdG8gb2J0YWluIHRoZSBzeW1ib2wgZm9yIGEgZGVjbGFyYXRpb24uXG4gICAqL1xuICBjb25uZWN0PyhyZXNvbHZlOiBTeW1ib2xSZXNvbHZlcik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgc3ltYm9sIHRvIGJlIGNvbXBhcmVkIHRvIHRoZSBzeW1ib2wgdGhhdCBoYWQgdGhlIHNhbWUgaWRlbnRpZmllciBpbiB0aGUgcHJldmlvdXNcbiAgICogY29tcGlsYXRpb24uIFRoZSByZXR1cm4gdmFsdWUgaW5kaWNhdGVzIGhvdyB0aGUgY2hhbmdlcyBhZmZlY3QgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIE5vdGU6IGBwcmV2aW91c1N5bWJvbGAgaXMgb2J0YWluZWQgZnJvbSB0aGUgbW9zdCByZWNlbnRseSBzdWNjZWVkZWQgY29tcGlsYXRpb24uIFN5bWJvbHMgb2ZcbiAgICogZmFpbGVkIGNvbXBpbGF0aW9ucyBhcmUgbmV2ZXIgcHJvdmlkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwcmV2aW91c1N5bWJvbCBUaGUgc3ltYm9sIGZyb20gYSBwcmlvciBjb21waWxhdGlvbi5cbiAgICovXG4gIGFic3RyYWN0IGlzUHVibGljQXBpQWZmZWN0ZWQocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sKTogYm9vbGVhbjtcblxuICAvKipcbiAgICogQWxsb3dzIHRoZSBzeW1ib2wgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgaXRzIGVtaXQgaXMgYWZmZWN0ZWQuIFRoZSBlcXVpdmFsZW50IHN5bWJvbCBmcm9tIGEgcHJpb3JcbiAgICogYnVpbGQgaXMgZ2l2ZW4sIGluIGFkZGl0aW9uIHRvIHRoZSBzZXQgb2Ygc3ltYm9scyBvZiB3aGljaCB0aGUgcHVibGljIEFQSSBoYXMgY2hhbmdlZC5cbiAgICpcbiAgICogQHBhcmFtIHByZXZpb3VzU3ltYm9sIFRoZSBlcXVpdmFsZW50IHN5bWJvbCBmcm9tIGEgcHJpb3IgY29tcGlsYXRpb24uIE5vdGUgdGhhdCBpdCBtYXkgYmUgYVxuICAgKiBkaWZmZXJlbnQgdHlwZSBvZiBzeW1ib2wsIGlmIGUuZy4gYSBDb21wb25lbnQgd2FzIGNoYW5nZWQgaW50byBhIERpcmVjdGl2ZSB3aXRoIHRoZSBzYW1lIG5hbWUuXG4gICAqIEBwYXJhbSBwdWJsaWNBcGlBZmZlY3RlZCBUaGUgc2V0IG9mIHN5bWJvbHMgd2hpY2ggb2Ygd2hpY2ggdGhlIHB1YmxpYyBBUEkgaGFzIGNoYW5nZWQuXG4gICAqL1xuICBpc0VtaXRBZmZlY3RlZD8ocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sLCBwdWJsaWNBcGlBZmZlY3RlZDogU2V0PFNlbWFudGljU3ltYm9sPik6IGJvb2xlYW47XG59XG4iXX0=