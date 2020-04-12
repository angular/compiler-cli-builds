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
        define("@angular/compiler-cli/src/ngtsc/transform/src/trait", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var TraitState;
    (function (TraitState) {
        /**
         * Pending traits are freshly created and have never been analyzed.
         */
        TraitState[TraitState["PENDING"] = 1] = "PENDING";
        /**
         * Analyzed traits have successfully been analyzed, but are pending resolution.
         */
        TraitState[TraitState["ANALYZED"] = 2] = "ANALYZED";
        /**
         * Resolved traits have successfully been analyzed and resolved and are ready for compilation.
         */
        TraitState[TraitState["RESOLVED"] = 4] = "RESOLVED";
        /**
         * Errored traits have failed either analysis or resolution and as a result contain diagnostics
         * describing the failure(s).
         */
        TraitState[TraitState["ERRORED"] = 8] = "ERRORED";
        /**
         * Skipped traits are no longer considered for compilation.
         */
        TraitState[TraitState["SKIPPED"] = 16] = "SKIPPED";
    })(TraitState = exports.TraitState || (exports.TraitState = {}));
    /**
     * The value side of `Trait` exposes a helper to create a `Trait` in a pending state (by delegating
     * to `TraitImpl`).
     */
    exports.Trait = {
        pending: function (handler, detected) { return TraitImpl.pending(handler, detected); },
    };
    /**
     * An implementation of the `Trait` type which transitions safely between the various
     * `TraitState`s.
     */
    var TraitImpl = /** @class */ (function () {
        function TraitImpl(handler, detected) {
            this.state = TraitState.PENDING;
            this.analysis = null;
            this.resolution = null;
            this.diagnostics = null;
            this.handler = handler;
            this.detected = detected;
        }
        TraitImpl.prototype.toAnalyzed = function (analysis) {
            // Only pending traits can be analyzed.
            this.assertTransitionLegal(TraitState.PENDING, TraitState.ANALYZED);
            this.analysis = analysis;
            this.state = TraitState.ANALYZED;
            return this;
        };
        TraitImpl.prototype.toErrored = function (diagnostics) {
            // Pending traits (during analysis) or analyzed traits (during resolution) can produce
            // diagnostics and enter an errored state.
            this.assertTransitionLegal(TraitState.PENDING | TraitState.ANALYZED, TraitState.RESOLVED);
            this.diagnostics = diagnostics;
            this.analysis = null;
            this.state = TraitState.ERRORED;
            return this;
        };
        TraitImpl.prototype.toResolved = function (resolution) {
            // Only analyzed traits can be resolved.
            this.assertTransitionLegal(TraitState.ANALYZED, TraitState.RESOLVED);
            this.resolution = resolution;
            this.state = TraitState.RESOLVED;
            return this;
        };
        TraitImpl.prototype.toSkipped = function () {
            // Only pending traits can be skipped.
            this.assertTransitionLegal(TraitState.PENDING, TraitState.SKIPPED);
            this.state = TraitState.SKIPPED;
            return this;
        };
        /**
         * Verifies that the trait is currently in one of the `allowedState`s.
         *
         * If correctly used, the `Trait` type and transition methods prevent illegal transitions from
         * occurring. However, if a reference to the `TraitImpl` instance typed with the previous
         * interface is retained after calling one of its transition methods, it will allow for illegal
         * transitions to take place. Hence, this assertion provides a little extra runtime protection.
         */
        TraitImpl.prototype.assertTransitionLegal = function (allowedState, transitionTo) {
            if (!(this.state & allowedState)) {
                throw new Error("Assertion failure: cannot transition from " + TraitState[this.state] + " to " + TraitState[transitionTo] + ".");
            }
        };
        /**
         * Construct a new `TraitImpl` in the pending state.
         */
        TraitImpl.pending = function (handler, detected) {
            return new TraitImpl(handler, detected);
        };
        return TraitImpl;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvdHJhaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFLSCxJQUFZLFVBMEJYO0lBMUJELFdBQVksVUFBVTtRQUNwQjs7V0FFRztRQUNILGlEQUFjLENBQUE7UUFFZDs7V0FFRztRQUNILG1EQUFlLENBQUE7UUFFZjs7V0FFRztRQUNILG1EQUFlLENBQUE7UUFFZjs7O1dBR0c7UUFDSCxpREFBYyxDQUFBO1FBRWQ7O1dBRUc7UUFDSCxrREFBYyxDQUFBO0lBQ2hCLENBQUMsRUExQlcsVUFBVSxHQUFWLGtCQUFVLEtBQVYsa0JBQVUsUUEwQnJCO0lBa0JEOzs7T0FHRztJQUNVLFFBQUEsS0FBSyxHQUFHO1FBQ25CLE9BQU8sRUFBRSxVQUFVLE9BQWtDLEVBQUUsUUFBeUIsSUFDMUMsT0FBQSxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsRUFBcEMsQ0FBb0M7S0FDM0UsQ0FBQztJQW1JRjs7O09BR0c7SUFDSDtRQVFFLG1CQUFZLE9BQWtDLEVBQUUsUUFBeUI7WUFQekUsVUFBSyxHQUFlLFVBQVUsQ0FBQyxPQUFPLENBQUM7WUFHdkMsYUFBUSxHQUFxQixJQUFJLENBQUM7WUFDbEMsZUFBVSxHQUFxQixJQUFJLENBQUM7WUFDcEMsZ0JBQVcsR0FBeUIsSUFBSSxDQUFDO1lBR3ZDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQzNCLENBQUM7UUFFRCw4QkFBVSxHQUFWLFVBQVcsUUFBVztZQUNwQix1Q0FBdUM7WUFDdkMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUNqQyxPQUFPLElBQThCLENBQUM7UUFDeEMsQ0FBQztRQUVELDZCQUFTLEdBQVQsVUFBVSxXQUE0QjtZQUNwQyxzRkFBc0Y7WUFDdEYsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFGLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQztZQUNoQyxPQUFPLElBQTZCLENBQUM7UUFDdkMsQ0FBQztRQUVELDhCQUFVLEdBQVYsVUFBVyxVQUFhO1lBQ3RCLHdDQUF3QztZQUN4QyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDN0IsSUFBSSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ2pDLE9BQU8sSUFBOEIsQ0FBQztRQUN4QyxDQUFDO1FBRUQsNkJBQVMsR0FBVDtZQUNFLHNDQUFzQztZQUN0QyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkUsSUFBSSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ2hDLE9BQU8sSUFBNkIsQ0FBQztRQUN2QyxDQUFDO1FBRUQ7Ozs7Ozs7V0FPRztRQUNLLHlDQUFxQixHQUE3QixVQUE4QixZQUF3QixFQUFFLFlBQXdCO1lBQzlFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDLEVBQUU7Z0JBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NBQTZDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQy9FLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBRyxDQUFDLENBQUM7YUFDbEM7UUFDSCxDQUFDO1FBRUQ7O1dBRUc7UUFDSSxpQkFBTyxHQUFkLFVBQXdCLE9BQWtDLEVBQUUsUUFBeUI7WUFFbkYsT0FBTyxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUEwQixDQUFDO1FBQ25FLENBQUM7UUFDSCxnQkFBQztJQUFELENBQUMsQUFwRUQsSUFvRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHR9IGZyb20gJy4vYXBpJztcblxuZXhwb3J0IGVudW0gVHJhaXRTdGF0ZSB7XG4gIC8qKlxuICAgKiBQZW5kaW5nIHRyYWl0cyBhcmUgZnJlc2hseSBjcmVhdGVkIGFuZCBoYXZlIG5ldmVyIGJlZW4gYW5hbHl6ZWQuXG4gICAqL1xuICBQRU5ESU5HID0gMHgwMSxcblxuICAvKipcbiAgICogQW5hbHl6ZWQgdHJhaXRzIGhhdmUgc3VjY2Vzc2Z1bGx5IGJlZW4gYW5hbHl6ZWQsIGJ1dCBhcmUgcGVuZGluZyByZXNvbHV0aW9uLlxuICAgKi9cbiAgQU5BTFlaRUQgPSAweDAyLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCB0cmFpdHMgaGF2ZSBzdWNjZXNzZnVsbHkgYmVlbiBhbmFseXplZCBhbmQgcmVzb2x2ZWQgYW5kIGFyZSByZWFkeSBmb3IgY29tcGlsYXRpb24uXG4gICAqL1xuICBSRVNPTFZFRCA9IDB4MDQsXG5cbiAgLyoqXG4gICAqIEVycm9yZWQgdHJhaXRzIGhhdmUgZmFpbGVkIGVpdGhlciBhbmFseXNpcyBvciByZXNvbHV0aW9uIGFuZCBhcyBhIHJlc3VsdCBjb250YWluIGRpYWdub3N0aWNzXG4gICAqIGRlc2NyaWJpbmcgdGhlIGZhaWx1cmUocykuXG4gICAqL1xuICBFUlJPUkVEID0gMHgwOCxcblxuICAvKipcbiAgICogU2tpcHBlZCB0cmFpdHMgYXJlIG5vIGxvbmdlciBjb25zaWRlcmVkIGZvciBjb21waWxhdGlvbi5cbiAgICovXG4gIFNLSVBQRUQgPSAweDEwLFxufVxuXG4vKipcbiAqIEFuIEl2eSBhc3BlY3QgYWRkZWQgdG8gYSBjbGFzcyAoZm9yIGV4YW1wbGUsIHRoZSBjb21waWxhdGlvbiBvZiBhIGNvbXBvbmVudCBkZWZpbml0aW9uKS5cbiAqXG4gKiBUcmFpdHMgYXJlIGNyZWF0ZWQgd2hlbiBhIGBEZWNvcmF0b3JIYW5kbGVyYCBtYXRjaGVzIGEgY2xhc3MuIEVhY2ggdHJhaXQgYmVnaW5zIGluIGEgcGVuZGluZ1xuICogc3RhdGUgYW5kIHVuZGVyZ29lcyB0cmFuc2l0aW9ucyBhcyBjb21waWxhdGlvbiBwcm9jZWVkcyB0aHJvdWdoIHRoZSB2YXJpb3VzIHN0ZXBzLlxuICpcbiAqIEluIHByYWN0aWNlLCB0cmFpdHMgYXJlIGluc3RhbmNlcyBvZiB0aGUgcHJpdmF0ZSBjbGFzcyBgVHJhaXRJbXBsYCBkZWNsYXJlZCBiZWxvdy4gVGhyb3VnaCB0aGVcbiAqIHZhcmlvdXMgaW50ZXJmYWNlcyBpbmNsdWRlZCBpbiB0aGlzIHVuaW9uIHR5cGUsIHRoZSBsZWdhbCBBUEkgb2YgYSB0cmFpdCBpbiBhbnkgZ2l2ZW4gc3RhdGUgaXNcbiAqIHJlcHJlc2VudGVkIGluIHRoZSB0eXBlIHN5c3RlbS4gVGhpcyBpbmNsdWRlcyBhbnkgcG9zc2libGUgdHJhbnNpdGlvbnMgZnJvbSBvbmUgdHlwZSB0byB0aGUgbmV4dC5cbiAqXG4gKiBUaGlzIG5vdCBvbmx5IHNpbXBsaWZpZXMgdGhlIGltcGxlbWVudGF0aW9uLCBidXQgZW5zdXJlcyB0cmFpdHMgYXJlIG1vbm9tb3JwaGljIG9iamVjdHMgYXNcbiAqIHRoZXkncmUgYWxsIGp1c3QgXCJ2aWV3c1wiIGluIHRoZSB0eXBlIHN5c3RlbSBvZiB0aGUgc2FtZSBvYmplY3QgKHdoaWNoIG5ldmVyIGNoYW5nZXMgc2hhcGUpLlxuICovXG5leHBvcnQgdHlwZSBUcmFpdDxELCBBLCBSPiA9IFBlbmRpbmdUcmFpdDxELCBBLCBSPnwgU2tpcHBlZFRyYWl0PEQsIEEsIFI+fCBBbmFseXplZFRyYWl0PEQsIEEsIFI+fFxuICAgIFJlc29sdmVkVHJhaXQ8RCwgQSwgUj58IEVycm9yZWRUcmFpdDxELCBBLCBSPjtcblxuLyoqXG4gKiBUaGUgdmFsdWUgc2lkZSBvZiBgVHJhaXRgIGV4cG9zZXMgYSBoZWxwZXIgdG8gY3JlYXRlIGEgYFRyYWl0YCBpbiBhIHBlbmRpbmcgc3RhdGUgKGJ5IGRlbGVnYXRpbmdcbiAqIHRvIGBUcmFpdEltcGxgKS5cbiAqL1xuZXhwb3J0IGNvbnN0IFRyYWl0ID0ge1xuICBwZW5kaW5nOiA8RCwgQSwgUj4oaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxELCBBLCBSPiwgZGV0ZWN0ZWQ6IERldGVjdFJlc3VsdDxEPik6XG4gICAgICAgICAgICAgICBQZW5kaW5nVHJhaXQ8RCwgQSwgUj4gPT4gVHJhaXRJbXBsLnBlbmRpbmcoaGFuZGxlciwgZGV0ZWN0ZWQpLFxufTtcblxuLyoqXG4gKiBUaGUgcGFydCBvZiB0aGUgYFRyYWl0YCBpbnRlcmZhY2UgdGhhdCdzIGNvbW1vbiB0byBhbGwgdHJhaXQgc3RhdGVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRyYWl0QmFzZTxELCBBLCBSPiB7XG4gIC8qKlxuICAgKiBDdXJyZW50IHN0YXRlIG9mIHRoZSB0cmFpdC5cbiAgICpcbiAgICogVGhpcyB3aWxsIGJlIG5hcnJvd2VkIGluIHRoZSBpbnRlcmZhY2VzIGZvciBlYWNoIHNwZWNpZmljIHN0YXRlLlxuICAgKi9cbiAgc3RhdGU6IFRyYWl0U3RhdGU7XG5cbiAgLyoqXG4gICAqIFRoZSBgRGVjb3JhdG9ySGFuZGxlcmAgd2hpY2ggbWF0Y2hlZCBvbiB0aGUgY2xhc3MgdG8gY3JlYXRlIHRoaXMgdHJhaXQuXG4gICAqL1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPEQsIEEsIFI+O1xuXG4gIC8qKlxuICAgKiBUaGUgZGV0ZWN0aW9uIHJlc3VsdCAob2YgYGhhbmRsZXIuZGV0ZWN0YCkgd2hpY2ggaW5kaWNhdGVkIHRoYXQgdGhpcyB0cmFpdCBhcHBsaWVkIHRvIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogVGhpcyBpcyBtYWlubHkgdXNlZCB0byBjYWNoZSB0aGUgZGV0ZWN0aW9uIGJldHdlZW4gcHJlLWFuYWx5c2lzIGFuZCBhbmFseXNpcy5cbiAgICovXG4gIGRldGVjdGVkOiBEZXRlY3RSZXN1bHQ8RD47XG59XG5cbi8qKlxuICogQSB0cmFpdCBpbiB0aGUgcGVuZGluZyBzdGF0ZS5cbiAqXG4gKiBQZW5kaW5nIHRyYWl0cyBoYXZlIHlldCB0byBiZSBhbmFseXplZCBpbiBhbnkgd2F5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdUcmFpdDxELCBBLCBSPiBleHRlbmRzIFRyYWl0QmFzZTxELCBBLCBSPiB7XG4gIHN0YXRlOiBUcmFpdFN0YXRlLlBFTkRJTkc7XG5cbiAgLyoqXG4gICAqIFRoaXMgcGVuZGluZyB0cmFpdCBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQsIGFuZCBzaG91bGQgdHJhbnNpdGlvbiB0byB0aGUgXCJhbmFseXplZFwiXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgdG9BbmFseXplZChhbmFseXNpczogQSk6IEFuYWx5emVkVHJhaXQ8RCwgQSwgUj47XG5cbiAgLyoqXG4gICAqIFRoaXMgdHJhaXQgZmFpbGVkIGFuYWx5c2lzLCBhbmQgc2hvdWxkIHRyYW5zaXRpb24gdG8gdGhlIFwiZXJyb3JlZFwiIHN0YXRlIHdpdGggdGhlIHJlc3VsdGluZ1xuICAgKiBkaWFnbm9zdGljcy5cbiAgICovXG4gIHRvRXJyb3JlZChlcnJvcnM6IHRzLkRpYWdub3N0aWNbXSk6IEVycm9yZWRUcmFpdDxELCBBLCBSPjtcblxuICAvKipcbiAgICogRHVyaW5nIGFuYWx5c2lzIGl0IHdhcyBkZXRlcm1pbmVkIHRoYXQgdGhpcyB0cmFpdCBpcyBub3QgZWxpZ2libGUgZm9yIGNvbXBpbGF0aW9uIGFmdGVyIGFsbCxcbiAgICogYW5kIHNob3VsZCBiZSB0cmFuc2l0aW9uZWQgdG8gdGhlIFwic2tpcHBlZFwiIHN0YXRlLlxuICAgKi9cbiAgdG9Ta2lwcGVkKCk6IFNraXBwZWRUcmFpdDxELCBBLCBSPjtcbn1cblxuLyoqXG4gKiBBIHRyYWl0IGluIHRoZSBcImVycm9yZWRcIiBzdGF0ZS5cbiAqXG4gKiBFcnJvcmVkIHRyYWl0cyBjb250YWluIGB0cy5EaWFnbm9zdGljYHMgaW5kaWNhdGluZyBhbnkgcHJvYmxlbShzKSB3aXRoIHRoZSBjbGFzcy5cbiAqXG4gKiBUaGlzIGlzIGEgdGVybWluYWwgc3RhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JlZFRyYWl0PEQsIEEsIFI+IGV4dGVuZHMgVHJhaXRCYXNlPEQsIEEsIFI+IHtcbiAgc3RhdGU6IFRyYWl0U3RhdGUuRVJST1JFRDtcblxuICAvKipcbiAgICogRGlhZ25vc3RpY3Mgd2hpY2ggd2VyZSBwcm9kdWNlZCB3aGlsZSBhdHRlbXB0aW5nIHRvIGFuYWx5emUgdGhlIHRyYWl0LlxuICAgKi9cbiAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXTtcbn1cblxuLyoqXG4gKiBBIHRyYWl0IGluIHRoZSBcInNraXBwZWRcIiBzdGF0ZS5cbiAqXG4gKiBTa2lwcGVkIHRyYWl0cyBhcmVuJ3QgY29uc2lkZXJlZCBmb3IgY29tcGlsYXRpb24uXG4gKlxuICogVGhpcyBpcyBhIHRlcm1pbmFsIHN0YXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNraXBwZWRUcmFpdDxELCBBLCBSPiBleHRlbmRzIFRyYWl0QmFzZTxELCBBLCBSPiB7IHN0YXRlOiBUcmFpdFN0YXRlLlNLSVBQRUQ7IH1cblxuLyoqXG4gKiBUaGUgcGFydCBvZiB0aGUgYFRyYWl0YCBpbnRlcmZhY2UgZm9yIGFueSB0cmFpdCB3aGljaCBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQuXG4gKlxuICogTWFpbmx5LCB0aGlzIGlzIHVzZWQgdG8gc2hhcmUgdGhlIGNvbW1lbnQgb24gdGhlIGBhbmFseXNpc2AgZmllbGQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhaXRXaXRoQW5hbHlzaXM8QT4ge1xuICAvKipcbiAgICogVGhlIHJlc3VsdHMgcmV0dXJuZWQgYnkgYSBzdWNjZXNzZnVsIGFuYWx5c2lzIG9mIHRoZSBnaXZlbiBjbGFzcy9gRGVjb3JhdG9ySGFuZGxlcmBcbiAgICogY29tYmluYXRpb24uXG4gICAqL1xuICBhbmFseXNpczogUmVhZG9ubHk8QT47XG59XG5cbi8qKlxuICogQSB0cmFpdCBpbiB0aGUgXCJhbmFseXplZFwiIHN0YXRlLlxuICpcbiAqIEFuYWx5emVkIHRyYWl0cyBoYXZlIGFuYWx5c2lzIHJlc3VsdHMgYXZhaWxhYmxlLCBhbmQgYXJlIGVsaWdpYmxlIGZvciByZXNvbHV0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5emVkVHJhaXQ8RCwgQSwgUj4gZXh0ZW5kcyBUcmFpdEJhc2U8RCwgQSwgUj4sIFRyYWl0V2l0aEFuYWx5c2lzPEE+IHtcbiAgc3RhdGU6IFRyYWl0U3RhdGUuQU5BTFlaRUQ7XG5cbiAgLyoqXG4gICAqIFRoaXMgYW5hbHl6ZWQgdHJhaXQgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IHJlc29sdmVkLCBhbmQgc2hvdWxkIGJlIHRyYW5zaXRpb25lZCB0byB0aGVcbiAgICogXCJyZXNvbHZlZFwiIHN0YXRlLlxuICAgKi9cbiAgdG9SZXNvbHZlZChyZXNvbHV0aW9uOiBSKTogUmVzb2x2ZWRUcmFpdDxELCBBLCBSPjtcblxuICAvKipcbiAgICogVGhpcyB0cmFpdCBmYWlsZWQgcmVzb2x1dGlvbiwgYW5kIHNob3VsZCB0cmFuc2l0aW9uIHRvIHRoZSBcImVycm9yZWRcIiBzdGF0ZSB3aXRoIHRoZSByZXN1bHRpbmdcbiAgICogZGlhZ25vc3RpY3MuXG4gICAqL1xuICB0b0Vycm9yZWQoZXJyb3JzOiB0cy5EaWFnbm9zdGljW10pOiBFcnJvcmVkVHJhaXQ8RCwgQSwgUj47XG59XG5cbi8qKlxuICogQSB0cmFpdCBpbiB0aGUgXCJyZXNvbHZlZFwiIHN0YXRlLlxuICpcbiAqIFJlc29sdmVkIHRyYWl0cyBoYXZlIGJlZW4gc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGFuZCByZXNvbHZlZCwgY29udGFpbiBubyBlcnJvcnMsIGFuZCBhcmUgcmVhZHlcbiAqIGZvciB0aGUgY29tcGlsYXRpb24gcGhhc2UuXG4gKlxuICogVGhpcyBpcyBhIHRlcm1pbmFsIHN0YXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmVkVHJhaXQ8RCwgQSwgUj4gZXh0ZW5kcyBUcmFpdEJhc2U8RCwgQSwgUj4sIFRyYWl0V2l0aEFuYWx5c2lzPEE+IHtcbiAgc3RhdGU6IFRyYWl0U3RhdGUuUkVTT0xWRUQ7XG5cbiAgLyoqXG4gICAqIFRoZSByZXN1bHRzIHJldHVybmVkIGJ5IGEgc3VjY2Vzc2Z1bCByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBjbGFzcy9gRGVjb3JhdG9ySGFuZGxlcmBcbiAgICogY29tYmluYXRpb24uXG4gICAqL1xuICByZXNvbHV0aW9uOiBSZWFkb25seTxSPjtcbn1cblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgYFRyYWl0YCB0eXBlIHdoaWNoIHRyYW5zaXRpb25zIHNhZmVseSBiZXR3ZWVuIHRoZSB2YXJpb3VzXG4gKiBgVHJhaXRTdGF0ZWBzLlxuICovXG5jbGFzcyBUcmFpdEltcGw8RCwgQSwgUj4ge1xuICBzdGF0ZTogVHJhaXRTdGF0ZSA9IFRyYWl0U3RhdGUuUEVORElORztcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxELCBBLCBSPjtcbiAgZGV0ZWN0ZWQ6IERldGVjdFJlc3VsdDxEPjtcbiAgYW5hbHlzaXM6IFJlYWRvbmx5PEE+fG51bGwgPSBudWxsO1xuICByZXNvbHV0aW9uOiBSZWFkb25seTxSPnxudWxsID0gbnVsbDtcbiAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPEQsIEEsIFI+LCBkZXRlY3RlZDogRGV0ZWN0UmVzdWx0PEQ+KSB7XG4gICAgdGhpcy5oYW5kbGVyID0gaGFuZGxlcjtcbiAgICB0aGlzLmRldGVjdGVkID0gZGV0ZWN0ZWQ7XG4gIH1cblxuICB0b0FuYWx5emVkKGFuYWx5c2lzOiBBKTogQW5hbHl6ZWRUcmFpdDxELCBBLCBSPiB7XG4gICAgLy8gT25seSBwZW5kaW5nIHRyYWl0cyBjYW4gYmUgYW5hbHl6ZWQuXG4gICAgdGhpcy5hc3NlcnRUcmFuc2l0aW9uTGVnYWwoVHJhaXRTdGF0ZS5QRU5ESU5HLCBUcmFpdFN0YXRlLkFOQUxZWkVEKTtcbiAgICB0aGlzLmFuYWx5c2lzID0gYW5hbHlzaXM7XG4gICAgdGhpcy5zdGF0ZSA9IFRyYWl0U3RhdGUuQU5BTFlaRUQ7XG4gICAgcmV0dXJuIHRoaXMgYXMgQW5hbHl6ZWRUcmFpdDxELCBBLCBSPjtcbiAgfVxuXG4gIHRvRXJyb3JlZChkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKTogRXJyb3JlZFRyYWl0PEQsIEEsIFI+IHtcbiAgICAvLyBQZW5kaW5nIHRyYWl0cyAoZHVyaW5nIGFuYWx5c2lzKSBvciBhbmFseXplZCB0cmFpdHMgKGR1cmluZyByZXNvbHV0aW9uKSBjYW4gcHJvZHVjZVxuICAgIC8vIGRpYWdub3N0aWNzIGFuZCBlbnRlciBhbiBlcnJvcmVkIHN0YXRlLlxuICAgIHRoaXMuYXNzZXJ0VHJhbnNpdGlvbkxlZ2FsKFRyYWl0U3RhdGUuUEVORElORyB8IFRyYWl0U3RhdGUuQU5BTFlaRUQsIFRyYWl0U3RhdGUuUkVTT0xWRUQpO1xuICAgIHRoaXMuZGlhZ25vc3RpY3MgPSBkaWFnbm9zdGljcztcbiAgICB0aGlzLmFuYWx5c2lzID0gbnVsbDtcbiAgICB0aGlzLnN0YXRlID0gVHJhaXRTdGF0ZS5FUlJPUkVEO1xuICAgIHJldHVybiB0aGlzIGFzIEVycm9yZWRUcmFpdDxELCBBLCBSPjtcbiAgfVxuXG4gIHRvUmVzb2x2ZWQocmVzb2x1dGlvbjogUik6IFJlc29sdmVkVHJhaXQ8RCwgQSwgUj4ge1xuICAgIC8vIE9ubHkgYW5hbHl6ZWQgdHJhaXRzIGNhbiBiZSByZXNvbHZlZC5cbiAgICB0aGlzLmFzc2VydFRyYW5zaXRpb25MZWdhbChUcmFpdFN0YXRlLkFOQUxZWkVELCBUcmFpdFN0YXRlLlJFU09MVkVEKTtcbiAgICB0aGlzLnJlc29sdXRpb24gPSByZXNvbHV0aW9uO1xuICAgIHRoaXMuc3RhdGUgPSBUcmFpdFN0YXRlLlJFU09MVkVEO1xuICAgIHJldHVybiB0aGlzIGFzIFJlc29sdmVkVHJhaXQ8RCwgQSwgUj47XG4gIH1cblxuICB0b1NraXBwZWQoKTogU2tpcHBlZFRyYWl0PEQsIEEsIFI+IHtcbiAgICAvLyBPbmx5IHBlbmRpbmcgdHJhaXRzIGNhbiBiZSBza2lwcGVkLlxuICAgIHRoaXMuYXNzZXJ0VHJhbnNpdGlvbkxlZ2FsKFRyYWl0U3RhdGUuUEVORElORywgVHJhaXRTdGF0ZS5TS0lQUEVEKTtcbiAgICB0aGlzLnN0YXRlID0gVHJhaXRTdGF0ZS5TS0lQUEVEO1xuICAgIHJldHVybiB0aGlzIGFzIFNraXBwZWRUcmFpdDxELCBBLCBSPjtcbiAgfVxuXG4gIC8qKlxuICAgKiBWZXJpZmllcyB0aGF0IHRoZSB0cmFpdCBpcyBjdXJyZW50bHkgaW4gb25lIG9mIHRoZSBgYWxsb3dlZFN0YXRlYHMuXG4gICAqXG4gICAqIElmIGNvcnJlY3RseSB1c2VkLCB0aGUgYFRyYWl0YCB0eXBlIGFuZCB0cmFuc2l0aW9uIG1ldGhvZHMgcHJldmVudCBpbGxlZ2FsIHRyYW5zaXRpb25zIGZyb21cbiAgICogb2NjdXJyaW5nLiBIb3dldmVyLCBpZiBhIHJlZmVyZW5jZSB0byB0aGUgYFRyYWl0SW1wbGAgaW5zdGFuY2UgdHlwZWQgd2l0aCB0aGUgcHJldmlvdXNcbiAgICogaW50ZXJmYWNlIGlzIHJldGFpbmVkIGFmdGVyIGNhbGxpbmcgb25lIG9mIGl0cyB0cmFuc2l0aW9uIG1ldGhvZHMsIGl0IHdpbGwgYWxsb3cgZm9yIGlsbGVnYWxcbiAgICogdHJhbnNpdGlvbnMgdG8gdGFrZSBwbGFjZS4gSGVuY2UsIHRoaXMgYXNzZXJ0aW9uIHByb3ZpZGVzIGEgbGl0dGxlIGV4dHJhIHJ1bnRpbWUgcHJvdGVjdGlvbi5cbiAgICovXG4gIHByaXZhdGUgYXNzZXJ0VHJhbnNpdGlvbkxlZ2FsKGFsbG93ZWRTdGF0ZTogVHJhaXRTdGF0ZSwgdHJhbnNpdGlvblRvOiBUcmFpdFN0YXRlKTogdm9pZCB7XG4gICAgaWYgKCEodGhpcy5zdGF0ZSAmIGFsbG93ZWRTdGF0ZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uIGZhaWx1cmU6IGNhbm5vdCB0cmFuc2l0aW9uIGZyb20gJHtUcmFpdFN0YXRlW3RoaXMuc3RhdGVdfSB0byAke1xuICAgICAgICAgIFRyYWl0U3RhdGVbdHJhbnNpdGlvblRvXX0uYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhIG5ldyBgVHJhaXRJbXBsYCBpbiB0aGUgcGVuZGluZyBzdGF0ZS5cbiAgICovXG4gIHN0YXRpYyBwZW5kaW5nPEQsIEEsIFI+KGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8RCwgQSwgUj4sIGRldGVjdGVkOiBEZXRlY3RSZXN1bHQ8RD4pOlxuICAgICAgUGVuZGluZ1RyYWl0PEQsIEEsIFI+IHtcbiAgICByZXR1cm4gbmV3IFRyYWl0SW1wbChoYW5kbGVyLCBkZXRlY3RlZCkgYXMgUGVuZGluZ1RyYWl0PEQsIEEsIFI+O1xuICB9XG59XG4iXX0=