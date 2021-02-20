(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SemanticSymbol = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    /**
     * Represents a symbol that is recognizable across incremental rebuilds, which enables the captured
     * metadata to be compared to the prior compilation. This allows for semantic understanding of
     * the changes that have been made in a rebuild, which potentially enables more reuse of work
     * from the prior compilation.
     */
    var SemanticSymbol = /** @class */ (function () {
        function SemanticSymbol(
        /**
         * The declaration for this symbol.
         */
        decl) {
            this.decl = decl;
            this.path = file_system_1.absoluteFromSourceFile(decl.getSourceFile());
            this.identifier = getSymbolIdentifier(decl);
        }
        return SemanticSymbol;
    }());
    exports.SemanticSymbol = SemanticSymbol;
    function getSymbolIdentifier(decl) {
        if (!ts.isSourceFile(decl.parent)) {
            return null;
        }
        // If this is a top-level class declaration, the class name is used as unique identifier.
        // Other scenarios are currently not supported and causes the symbol not to be identified
        // across rebuilds, unless the declaration node has not changed.
        return decl.name.text;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9uZ21vZHVsZV9zZW1hbnRpY3Mvc3JjL2FwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFFakMsMkVBQXlFO0lBR3pFOzs7OztPQUtHO0lBQ0g7UUFpQkU7UUFDSTs7V0FFRztRQUNhLElBQXNCO1lBQXRCLFNBQUksR0FBSixJQUFJLENBQWtCO1lBRXhDLElBQUksQ0FBQyxJQUFJLEdBQUcsb0NBQXNCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFDekQsSUFBSSxDQUFDLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBNkJILHFCQUFDO0lBQUQsQ0FBQyxBQXRERCxJQXNEQztJQXREcUIsd0NBQWM7SUF3RHBDLFNBQVMsbUJBQW1CLENBQUMsSUFBc0I7UUFDakQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2pDLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCx5RkFBeUY7UUFDekYseUZBQXlGO1FBQ3pGLGdFQUFnRTtRQUNoRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBzeW1ib2wgdGhhdCBpcyByZWNvZ25pemFibGUgYWNyb3NzIGluY3JlbWVudGFsIHJlYnVpbGRzLCB3aGljaCBlbmFibGVzIHRoZSBjYXB0dXJlZFxuICogbWV0YWRhdGEgdG8gYmUgY29tcGFyZWQgdG8gdGhlIHByaW9yIGNvbXBpbGF0aW9uLiBUaGlzIGFsbG93cyBmb3Igc2VtYW50aWMgdW5kZXJzdGFuZGluZyBvZlxuICogdGhlIGNoYW5nZXMgdGhhdCBoYXZlIGJlZW4gbWFkZSBpbiBhIHJlYnVpbGQsIHdoaWNoIHBvdGVudGlhbGx5IGVuYWJsZXMgbW9yZSByZXVzZSBvZiB3b3JrXG4gKiBmcm9tIHRoZSBwcmlvciBjb21waWxhdGlvbi5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFNlbWFudGljU3ltYm9sIHtcbiAgLyoqXG4gICAqIFRoZSBwYXRoIG9mIHRoZSBmaWxlIHRoYXQgZGVjbGFyZXMgdGhpcyBzeW1ib2wuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcGF0aDogQWJzb2x1dGVGc1BhdGg7XG5cbiAgLyoqXG4gICAqIFRoZSBpZGVudGlmaWVyIG9mIHRoaXMgc3ltYm9sLCBvciBudWxsIGlmIG5vIGlkZW50aWZpZXIgY291bGQgYmUgZGV0ZXJtaW5lZC4gSXQgc2hvdWxkXG4gICAqIHVuaXF1ZWx5IGlkZW50aWZ5IHRoZSBzeW1ib2wgcmVsYXRpdmUgdG8gYGZpbGVgLiBUaGlzIGlzIHR5cGljYWxseSBqdXN0IHRoZSBuYW1lIG9mIGFcbiAgICogdG9wLWxldmVsIGNsYXNzIGRlY2xhcmF0aW9uLCBhcyB0aGF0IHVuaXF1ZWx5IGlkZW50aWZpZXMgdGhlIGNsYXNzIHdpdGhpbiB0aGUgZmlsZS5cbiAgICpcbiAgICogSWYgdGhlIGlkZW50aWZpZXIgaXMgbnVsbCwgdGhlbiB0aGlzIHN5bWJvbCBjYW5ub3QgYmUgcmVjb2duaXplZCBhY3Jvc3MgcmVidWlsZHMuIEluIHRoYXRcbiAgICogY2FzZSwgdGhlIHN5bWJvbCBpcyBhbHdheXMgYXNzdW1lZCB0byBoYXZlIHNlbWFudGljYWxseSBjaGFuZ2VkIHRvIGd1YXJhbnRlZSBhIHByb3BlclxuICAgKiByZWJ1aWxkLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGlkZW50aWZpZXI6IHN0cmluZ3xudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqXG4gICAgICAgKiBUaGUgZGVjbGFyYXRpb24gZm9yIHRoaXMgc3ltYm9sLlxuICAgICAgICovXG4gICAgICBwdWJsaWMgcmVhZG9ubHkgZGVjbDogQ2xhc3NEZWNsYXJhdGlvbixcbiAgKSB7XG4gICAgdGhpcy5wYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShkZWNsLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgdGhpcy5pZGVudGlmaWVyID0gZ2V0U3ltYm9sSWRlbnRpZmllcihkZWNsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHN5bWJvbCB0byBiZSBjb21wYXJlZCB0byB0aGUgZXF1aXZhbGVudCBzeW1ib2wgaW4gdGhlIHByZXZpb3VzIGNvbXBpbGF0aW9uLiBUaGVcbiAgICogcmV0dXJuIHZhbHVlIGluZGljYXRlcyB3aGV0aGVyIHRoZSBzeW1ib2wgaGFzIGJlZW4gY2hhbmdlZCBpbiBhIHdheSBzdWNoIHRoYXQgaXRzIHB1YmxpYyBBUElcbiAgICogaXMgYWZmZWN0ZWQuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGRldGVybWluZXMgd2hldGhlciBhIGNoYW5nZSB0byBfdGhpc18gc3ltYm9sIHJlcXVpcmUgdGhlIHN5bWJvbHMgdGhhdFxuICAgKiB1c2UgdG8gdGhpcyBzeW1ib2wgdG8gYmUgcmUtZW1pdHRlZC5cbiAgICpcbiAgICogTm90ZTogYHByZXZpb3VzU3ltYm9sYCBpcyBvYnRhaW5lZCBmcm9tIHRoZSBtb3N0IHJlY2VudGx5IHN1Y2NlZWRlZCBjb21waWxhdGlvbi4gU3ltYm9scyBvZlxuICAgKiBmYWlsZWQgY29tcGlsYXRpb25zIGFyZSBuZXZlciBwcm92aWRlZC5cbiAgICpcbiAgICogQHBhcmFtIHByZXZpb3VzU3ltYm9sIFRoZSBzeW1ib2wgZnJvbSBhIHByaW9yIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgYWJzdHJhY3QgaXNQdWJsaWNBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHN5bWJvbCB0byBkZXRlcm1pbmUgd2hldGhlciBpdHMgZW1pdCBpcyBhZmZlY3RlZC4gVGhlIGVxdWl2YWxlbnQgc3ltYm9sIGZyb20gYSBwcmlvclxuICAgKiBidWlsZCBpcyBnaXZlbiwgaW4gYWRkaXRpb24gdG8gdGhlIHNldCBvZiBzeW1ib2xzIG9mIHdoaWNoIHRoZSBwdWJsaWMgQVBJIGhhcyBjaGFuZ2VkLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBkZXRlcm1pbmVzIHdoZXRoZXIgYSBjaGFuZ2UgdG8gX290aGVyXyBzeW1ib2xzLCBpLmUuIHRob3NlIHByZXNlbnQgaW5cbiAgICogYHB1YmxpY0FwaUFmZmVjdGVkYCwgc2hvdWxkIGNhdXNlIF90aGlzXyBzeW1ib2wgdG8gYmUgcmUtZW1pdHRlZC5cbiAgICpcbiAgICogQHBhcmFtIHByZXZpb3VzU3ltYm9sIFRoZSBlcXVpdmFsZW50IHN5bWJvbCBmcm9tIGEgcHJpb3IgY29tcGlsYXRpb24uIE5vdGUgdGhhdCBpdCBtYXkgYmUgYVxuICAgKiBkaWZmZXJlbnQgdHlwZSBvZiBzeW1ib2wsIGlmIGUuZy4gYSBDb21wb25lbnQgd2FzIGNoYW5nZWQgaW50byBhIERpcmVjdGl2ZSB3aXRoIHRoZSBzYW1lIG5hbWUuXG4gICAqIEBwYXJhbSBwdWJsaWNBcGlBZmZlY3RlZCBUaGUgc2V0IG9mIHN5bWJvbHMgd2hpY2ggb2Ygd2hpY2ggdGhlIHB1YmxpYyBBUEkgaGFzIGNoYW5nZWQuXG4gICAqL1xuICBpc0VtaXRBZmZlY3RlZD8ocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sLCBwdWJsaWNBcGlBZmZlY3RlZDogU2V0PFNlbWFudGljU3ltYm9sPik6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIGdldFN5bWJvbElkZW50aWZpZXIoZGVjbDogQ2xhc3NEZWNsYXJhdGlvbik6IHN0cmluZ3xudWxsIHtcbiAgaWYgKCF0cy5pc1NvdXJjZUZpbGUoZGVjbC5wYXJlbnQpKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBJZiB0aGlzIGlzIGEgdG9wLWxldmVsIGNsYXNzIGRlY2xhcmF0aW9uLCB0aGUgY2xhc3MgbmFtZSBpcyB1c2VkIGFzIHVuaXF1ZSBpZGVudGlmaWVyLlxuICAvLyBPdGhlciBzY2VuYXJpb3MgYXJlIGN1cnJlbnRseSBub3Qgc3VwcG9ydGVkIGFuZCBjYXVzZXMgdGhlIHN5bWJvbCBub3QgdG8gYmUgaWRlbnRpZmllZFxuICAvLyBhY3Jvc3MgcmVidWlsZHMsIHVubGVzcyB0aGUgZGVjbGFyYXRpb24gbm9kZSBoYXMgbm90IGNoYW5nZWQuXG4gIHJldHVybiBkZWNsLm5hbWUudGV4dDtcbn1cbiJdfQ==