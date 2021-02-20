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
        define("@angular/compiler-cli/src/ngtsc/transform/src/trait", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Trait = exports.TraitState = void 0;
    var TraitState;
    (function (TraitState) {
        /**
         * Pending traits are freshly created and have never been analyzed.
         */
        TraitState[TraitState["Pending"] = 0] = "Pending";
        /**
         * Analyzed traits have successfully been analyzed, but are pending resolution.
         */
        TraitState[TraitState["Analyzed"] = 1] = "Analyzed";
        /**
         * Resolved traits have successfully been analyzed and resolved and are ready for compilation.
         */
        TraitState[TraitState["Resolved"] = 2] = "Resolved";
        /**
         * Skipped traits are no longer considered for compilation.
         */
        TraitState[TraitState["Skipped"] = 3] = "Skipped";
    })(TraitState = exports.TraitState || (exports.TraitState = {}));
    /**
     * The value side of `Trait` exposes a helper to create a `Trait` in a pending state (by delegating
     * to `TraitImpl`).
     */
    exports.Trait = {
        pending: function (handler, detected) {
            return TraitImpl.pending(handler, detected);
        },
    };
    /**
     * An implementation of the `Trait` type which transitions safely between the various
     * `TraitState`s.
     */
    var TraitImpl = /** @class */ (function () {
        function TraitImpl(handler, detected) {
            this.state = TraitState.Pending;
            this.analysis = null;
            this.symbol = null;
            this.resolution = null;
            this.analysisDiagnostics = null;
            this.resolveDiagnostics = null;
            this.handler = handler;
            this.detected = detected;
        }
        TraitImpl.prototype.toAnalyzed = function (analysis, diagnostics, symbol) {
            // Only pending traits can be analyzed.
            this.assertTransitionLegal(TraitState.Pending, TraitState.Analyzed);
            this.analysis = analysis;
            this.analysisDiagnostics = diagnostics;
            this.symbol = symbol;
            this.state = TraitState.Analyzed;
            return this;
        };
        TraitImpl.prototype.toResolved = function (resolution, diagnostics) {
            // Only analyzed traits can be resolved.
            this.assertTransitionLegal(TraitState.Analyzed, TraitState.Resolved);
            if (this.analysis === null) {
                throw new Error("Cannot transition an Analyzed trait with a null analysis to Resolved");
            }
            this.resolution = resolution;
            this.state = TraitState.Resolved;
            this.resolveDiagnostics = diagnostics;
            return this;
        };
        TraitImpl.prototype.toSkipped = function () {
            // Only pending traits can be skipped.
            this.assertTransitionLegal(TraitState.Pending, TraitState.Skipped);
            this.state = TraitState.Skipped;
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
            if (!(this.state === allowedState)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvdHJhaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBTUgsSUFBWSxVQW9CWDtJQXBCRCxXQUFZLFVBQVU7UUFDcEI7O1dBRUc7UUFDSCxpREFBTyxDQUFBO1FBRVA7O1dBRUc7UUFDSCxtREFBUSxDQUFBO1FBRVI7O1dBRUc7UUFDSCxtREFBUSxDQUFBO1FBRVI7O1dBRUc7UUFDSCxpREFBTyxDQUFBO0lBQ1QsQ0FBQyxFQXBCVyxVQUFVLEdBQVYsa0JBQVUsS0FBVixrQkFBVSxRQW9CckI7SUFrQkQ7OztPQUdHO0lBQ1UsUUFBQSxLQUFLLEdBQUc7UUFDbkIsT0FBTyxFQUFFLFVBQ0wsT0FBcUMsRUFBRSxRQUF5QjtZQUNoRSxPQUFBLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztRQUFwQyxDQUFvQztLQUN6QyxDQUFDO0lBNkhGOzs7T0FHRztJQUNIO1FBVUUsbUJBQVksT0FBcUMsRUFBRSxRQUF5QjtZQVQ1RSxVQUFLLEdBQWUsVUFBVSxDQUFDLE9BQU8sQ0FBQztZQUd2QyxhQUFRLEdBQXFCLElBQUksQ0FBQztZQUNsQyxXQUFNLEdBQVcsSUFBSSxDQUFDO1lBQ3RCLGVBQVUsR0FBcUIsSUFBSSxDQUFDO1lBQ3BDLHdCQUFtQixHQUF5QixJQUFJLENBQUM7WUFDakQsdUJBQWtCLEdBQXlCLElBQUksQ0FBQztZQUc5QyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztZQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUMzQixDQUFDO1FBRUQsOEJBQVUsR0FBVixVQUFXLFFBQWdCLEVBQUUsV0FBaUMsRUFBRSxNQUFTO1lBRXZFLHVDQUF1QztZQUN2QyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7WUFDekIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFdBQVcsQ0FBQztZQUN2QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztZQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUM7WUFDakMsT0FBTyxJQUFpQyxDQUFDO1FBQzNDLENBQUM7UUFFRCw4QkFBVSxHQUFWLFVBQVcsVUFBa0IsRUFBRSxXQUFpQztZQUM5RCx3Q0FBd0M7WUFDeEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JFLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0VBQXNFLENBQUMsQ0FBQzthQUN6RjtZQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1lBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUNqQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsV0FBVyxDQUFDO1lBQ3RDLE9BQU8sSUFBaUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsNkJBQVMsR0FBVDtZQUNFLHNDQUFzQztZQUN0QyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkUsSUFBSSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ2hDLE9BQU8sSUFBZ0MsQ0FBQztRQUMxQyxDQUFDO1FBRUQ7Ozs7Ozs7V0FPRztRQUNLLHlDQUFxQixHQUE3QixVQUE4QixZQUF3QixFQUFFLFlBQXdCO1lBQzlFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssWUFBWSxDQUFDLEVBQUU7Z0JBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NBQTZDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQy9FLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBRyxDQUFDLENBQUM7YUFDbEM7UUFDSCxDQUFDO1FBRUQ7O1dBRUc7UUFDSSxpQkFBTyxHQUFkLFVBQ0ksT0FBcUMsRUFBRSxRQUF5QjtZQUNsRSxPQUFPLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQTZCLENBQUM7UUFDdEUsQ0FBQztRQUNILGdCQUFDO0lBQUQsQ0FBQyxBQW5FRCxJQW1FQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7U2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL25nbW9kdWxlX3NlbWFudGljcyc7XG5pbXBvcnQge0RlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdH0gZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgZW51bSBUcmFpdFN0YXRlIHtcbiAgLyoqXG4gICAqIFBlbmRpbmcgdHJhaXRzIGFyZSBmcmVzaGx5IGNyZWF0ZWQgYW5kIGhhdmUgbmV2ZXIgYmVlbiBhbmFseXplZC5cbiAgICovXG4gIFBlbmRpbmcsXG5cbiAgLyoqXG4gICAqIEFuYWx5emVkIHRyYWl0cyBoYXZlIHN1Y2Nlc3NmdWxseSBiZWVuIGFuYWx5emVkLCBidXQgYXJlIHBlbmRpbmcgcmVzb2x1dGlvbi5cbiAgICovXG4gIEFuYWx5emVkLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCB0cmFpdHMgaGF2ZSBzdWNjZXNzZnVsbHkgYmVlbiBhbmFseXplZCBhbmQgcmVzb2x2ZWQgYW5kIGFyZSByZWFkeSBmb3IgY29tcGlsYXRpb24uXG4gICAqL1xuICBSZXNvbHZlZCxcblxuICAvKipcbiAgICogU2tpcHBlZCB0cmFpdHMgYXJlIG5vIGxvbmdlciBjb25zaWRlcmVkIGZvciBjb21waWxhdGlvbi5cbiAgICovXG4gIFNraXBwZWQsXG59XG5cbi8qKlxuICogQW4gSXZ5IGFzcGVjdCBhZGRlZCB0byBhIGNsYXNzIChmb3IgZXhhbXBsZSwgdGhlIGNvbXBpbGF0aW9uIG9mIGEgY29tcG9uZW50IGRlZmluaXRpb24pLlxuICpcbiAqIFRyYWl0cyBhcmUgY3JlYXRlZCB3aGVuIGEgYERlY29yYXRvckhhbmRsZXJgIG1hdGNoZXMgYSBjbGFzcy4gRWFjaCB0cmFpdCBiZWdpbnMgaW4gYSBwZW5kaW5nXG4gKiBzdGF0ZSBhbmQgdW5kZXJnb2VzIHRyYW5zaXRpb25zIGFzIGNvbXBpbGF0aW9uIHByb2NlZWRzIHRocm91Z2ggdGhlIHZhcmlvdXMgc3RlcHMuXG4gKlxuICogSW4gcHJhY3RpY2UsIHRyYWl0cyBhcmUgaW5zdGFuY2VzIG9mIHRoZSBwcml2YXRlIGNsYXNzIGBUcmFpdEltcGxgIGRlY2xhcmVkIGJlbG93LiBUaHJvdWdoIHRoZVxuICogdmFyaW91cyBpbnRlcmZhY2VzIGluY2x1ZGVkIGluIHRoaXMgdW5pb24gdHlwZSwgdGhlIGxlZ2FsIEFQSSBvZiBhIHRyYWl0IGluIGFueSBnaXZlbiBzdGF0ZSBpc1xuICogcmVwcmVzZW50ZWQgaW4gdGhlIHR5cGUgc3lzdGVtLiBUaGlzIGluY2x1ZGVzIGFueSBwb3NzaWJsZSB0cmFuc2l0aW9ucyBmcm9tIG9uZSB0eXBlIHRvIHRoZSBuZXh0LlxuICpcbiAqIFRoaXMgbm90IG9ubHkgc2ltcGxpZmllcyB0aGUgaW1wbGVtZW50YXRpb24sIGJ1dCBlbnN1cmVzIHRyYWl0cyBhcmUgbW9ub21vcnBoaWMgb2JqZWN0cyBhc1xuICogdGhleSdyZSBhbGwganVzdCBcInZpZXdzXCIgaW4gdGhlIHR5cGUgc3lzdGVtIG9mIHRoZSBzYW1lIG9iamVjdCAod2hpY2ggbmV2ZXIgY2hhbmdlcyBzaGFwZSkuXG4gKi9cbmV4cG9ydCB0eXBlIFRyYWl0PEQsIEEsIFMgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbHxudWxsLCBSPiA9IFBlbmRpbmdUcmFpdDxELCBBLCBTLCBSPnxcbiAgICBTa2lwcGVkVHJhaXQ8RCwgQSwgUywgUj58QW5hbHl6ZWRUcmFpdDxELCBBLCBTLCBSPnxSZXNvbHZlZFRyYWl0PEQsIEEsIFMsIFI+O1xuXG4vKipcbiAqIFRoZSB2YWx1ZSBzaWRlIG9mIGBUcmFpdGAgZXhwb3NlcyBhIGhlbHBlciB0byBjcmVhdGUgYSBgVHJhaXRgIGluIGEgcGVuZGluZyBzdGF0ZSAoYnkgZGVsZWdhdGluZ1xuICogdG8gYFRyYWl0SW1wbGApLlxuICovXG5leHBvcnQgY29uc3QgVHJhaXQgPSB7XG4gIHBlbmRpbmc6IDxELCBBLCBTIGV4dGVuZHMgU2VtYW50aWNTeW1ib2x8bnVsbCwgUj4oXG4gICAgICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPEQsIEEsIFMsIFI+LCBkZXRlY3RlZDogRGV0ZWN0UmVzdWx0PEQ+KTogUGVuZGluZ1RyYWl0PEQsIEEsIFMsIFI+ID0+XG4gICAgICBUcmFpdEltcGwucGVuZGluZyhoYW5kbGVyLCBkZXRlY3RlZCksXG59O1xuXG4vKipcbiAqIFRoZSBwYXJ0IG9mIHRoZSBgVHJhaXRgIGludGVyZmFjZSB0aGF0J3MgY29tbW9uIHRvIGFsbCB0cmFpdCBzdGF0ZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhaXRCYXNlPEQsIEEsIFMgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbHxudWxsLCBSPiB7XG4gIC8qKlxuICAgKiBDdXJyZW50IHN0YXRlIG9mIHRoZSB0cmFpdC5cbiAgICpcbiAgICogVGhpcyB3aWxsIGJlIG5hcnJvd2VkIGluIHRoZSBpbnRlcmZhY2VzIGZvciBlYWNoIHNwZWNpZmljIHN0YXRlLlxuICAgKi9cbiAgc3RhdGU6IFRyYWl0U3RhdGU7XG5cbiAgLyoqXG4gICAqIFRoZSBgRGVjb3JhdG9ySGFuZGxlcmAgd2hpY2ggbWF0Y2hlZCBvbiB0aGUgY2xhc3MgdG8gY3JlYXRlIHRoaXMgdHJhaXQuXG4gICAqL1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPEQsIEEsIFMsIFI+O1xuXG4gIC8qKlxuICAgKiBUaGUgZGV0ZWN0aW9uIHJlc3VsdCAob2YgYGhhbmRsZXIuZGV0ZWN0YCkgd2hpY2ggaW5kaWNhdGVkIHRoYXQgdGhpcyB0cmFpdCBhcHBsaWVkIHRvIHRoZVxuICAgKiBjbGFzcy5cbiAgICpcbiAgICogVGhpcyBpcyBtYWlubHkgdXNlZCB0byBjYWNoZSB0aGUgZGV0ZWN0aW9uIGJldHdlZW4gcHJlLWFuYWx5c2lzIGFuZCBhbmFseXNpcy5cbiAgICovXG4gIGRldGVjdGVkOiBEZXRlY3RSZXN1bHQ8RD47XG59XG5cbi8qKlxuICogQSB0cmFpdCBpbiB0aGUgcGVuZGluZyBzdGF0ZS5cbiAqXG4gKiBQZW5kaW5nIHRyYWl0cyBoYXZlIHlldCB0byBiZSBhbmFseXplZCBpbiBhbnkgd2F5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBlbmRpbmdUcmFpdDxELCBBLCBTIGV4dGVuZHMgU2VtYW50aWNTeW1ib2x8bnVsbCwgUj4gZXh0ZW5kc1xuICAgIFRyYWl0QmFzZTxELCBBLCBTLCBSPiB7XG4gIHN0YXRlOiBUcmFpdFN0YXRlLlBlbmRpbmc7XG5cbiAgLyoqXG4gICAqIFRoaXMgcGVuZGluZyB0cmFpdCBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQsIGFuZCBzaG91bGQgdHJhbnNpdGlvbiB0byB0aGUgXCJhbmFseXplZFwiXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgdG9BbmFseXplZChhbmFseXNpczogQXxudWxsLCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdfG51bGwsIHN5bWJvbDogUyk6XG4gICAgICBBbmFseXplZFRyYWl0PEQsIEEsIFMsIFI+O1xuXG4gIC8qKlxuICAgKiBEdXJpbmcgYW5hbHlzaXMgaXQgd2FzIGRldGVybWluZWQgdGhhdCB0aGlzIHRyYWl0IGlzIG5vdCBlbGlnaWJsZSBmb3IgY29tcGlsYXRpb24gYWZ0ZXIgYWxsLFxuICAgKiBhbmQgc2hvdWxkIGJlIHRyYW5zaXRpb25lZCB0byB0aGUgXCJza2lwcGVkXCIgc3RhdGUuXG4gICAqL1xuICB0b1NraXBwZWQoKTogU2tpcHBlZFRyYWl0PEQsIEEsIFMsIFI+O1xufVxuXG4vKipcbiAqIEEgdHJhaXQgaW4gdGhlIFwic2tpcHBlZFwiIHN0YXRlLlxuICpcbiAqIFNraXBwZWQgdHJhaXRzIGFyZW4ndCBjb25zaWRlcmVkIGZvciBjb21waWxhdGlvbi5cbiAqXG4gKiBUaGlzIGlzIGEgdGVybWluYWwgc3RhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2tpcHBlZFRyYWl0PEQsIEEsIFMgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbHxudWxsLCBSPiBleHRlbmRzXG4gICAgVHJhaXRCYXNlPEQsIEEsIFMsIFI+IHtcbiAgc3RhdGU6IFRyYWl0U3RhdGUuU2tpcHBlZDtcbn1cblxuLyoqXG4gKiBBIHRyYWl0IGluIHRoZSBcImFuYWx5emVkXCIgc3RhdGUuXG4gKlxuICogQW5hbHl6ZWQgdHJhaXRzIGhhdmUgYW5hbHlzaXMgcmVzdWx0cyBhdmFpbGFibGUsIGFuZCBhcmUgZWxpZ2libGUgZm9yIHJlc29sdXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRUcmFpdDxELCBBLCBTIGV4dGVuZHMgU2VtYW50aWNTeW1ib2x8bnVsbCwgUj4gZXh0ZW5kc1xuICAgIFRyYWl0QmFzZTxELCBBLCBTLCBSPiB7XG4gIHN0YXRlOiBUcmFpdFN0YXRlLkFuYWx5emVkO1xuICBzeW1ib2w6IFM7XG5cbiAgLyoqXG4gICAqIEFuYWx5c2lzIHJlc3VsdHMgb2YgdGhlIGdpdmVuIHRyYWl0IChpZiBhYmxlIHRvIGJlIHByb2R1Y2VkKSwgb3IgYG51bGxgIGlmIGFuYWx5c2lzIGZhaWxlZFxuICAgKiBjb21wbGV0ZWx5LlxuICAgKi9cbiAgYW5hbHlzaXM6IFJlYWRvbmx5PEE+fG51bGw7XG5cbiAgLyoqXG4gICAqIEFueSBkaWFnbm9zdGljcyB0aGF0IHJlc3VsdGVkIGZyb20gYW5hbHlzaXMsIG9yIGBudWxsYCBpZiBub25lLlxuICAgKi9cbiAgYW5hbHlzaXNEaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdfG51bGw7XG5cbiAgLyoqXG4gICAqIFRoaXMgYW5hbHl6ZWQgdHJhaXQgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IHJlc29sdmVkLCBhbmQgc2hvdWxkIGJlIHRyYW5zaXRpb25lZCB0byB0aGVcbiAgICogXCJyZXNvbHZlZFwiIHN0YXRlLlxuICAgKi9cbiAgdG9SZXNvbHZlZChyZXNvbHV0aW9uOiBSfG51bGwsIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW118bnVsbCk6IFJlc29sdmVkVHJhaXQ8RCwgQSwgUywgUj47XG59XG5cbi8qKlxuICogQSB0cmFpdCBpbiB0aGUgXCJyZXNvbHZlZFwiIHN0YXRlLlxuICpcbiAqIFJlc29sdmVkIHRyYWl0cyBoYXZlIGJlZW4gc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGFuZCByZXNvbHZlZCwgY29udGFpbiBubyBlcnJvcnMsIGFuZCBhcmUgcmVhZHlcbiAqIGZvciB0aGUgY29tcGlsYXRpb24gcGhhc2UuXG4gKlxuICogVGhpcyBpcyBhIHRlcm1pbmFsIHN0YXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmVkVHJhaXQ8RCwgQSwgUyBleHRlbmRzIFNlbWFudGljU3ltYm9sfG51bGwsIFI+IGV4dGVuZHNcbiAgICBUcmFpdEJhc2U8RCwgQSwgUywgUj4ge1xuICBzdGF0ZTogVHJhaXRTdGF0ZS5SZXNvbHZlZDtcbiAgc3ltYm9sOiBTO1xuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCB0cmFpdHMgbXVzdCBoYXZlIHByb2R1Y2VkIHZhbGlkIGFuYWx5c2lzIHJlc3VsdHMuXG4gICAqL1xuICBhbmFseXNpczogUmVhZG9ubHk8QT47XG5cbiAgLyoqXG4gICAqIEFuYWx5c2lzIG1heSBoYXZlIHN0aWxsIHJlc3VsdGVkIGluIGRpYWdub3N0aWNzLlxuICAgKi9cbiAgYW5hbHlzaXNEaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdfG51bGw7XG5cbiAgLyoqXG4gICAqIERpYWdub3N0aWNzIHJlc3VsdGluZyBmcm9tIHJlc29sdXRpb24gYXJlIHRyYWNrZWQgc2VwYXJhdGVseSBmcm9tXG4gICAqL1xuICByZXNvbHZlRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsO1xuXG4gIC8qKlxuICAgKiBUaGUgcmVzdWx0cyByZXR1cm5lZCBieSBhIHN1Y2Nlc3NmdWwgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gY2xhc3MvYERlY29yYXRvckhhbmRsZXJgXG4gICAqIGNvbWJpbmF0aW9uLlxuICAgKi9cbiAgcmVzb2x1dGlvbjogUmVhZG9ubHk8Uj58bnVsbDtcbn1cblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgYFRyYWl0YCB0eXBlIHdoaWNoIHRyYW5zaXRpb25zIHNhZmVseSBiZXR3ZWVuIHRoZSB2YXJpb3VzXG4gKiBgVHJhaXRTdGF0ZWBzLlxuICovXG5jbGFzcyBUcmFpdEltcGw8RCwgQSwgUyBleHRlbmRzIFNlbWFudGljU3ltYm9sfG51bGwsIFI+IHtcbiAgc3RhdGU6IFRyYWl0U3RhdGUgPSBUcmFpdFN0YXRlLlBlbmRpbmc7XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8RCwgQSwgUywgUj47XG4gIGRldGVjdGVkOiBEZXRlY3RSZXN1bHQ8RD47XG4gIGFuYWx5c2lzOiBSZWFkb25seTxBPnxudWxsID0gbnVsbDtcbiAgc3ltYm9sOiBTfG51bGwgPSBudWxsO1xuICByZXNvbHV0aW9uOiBSZWFkb25seTxSPnxudWxsID0gbnVsbDtcbiAgYW5hbHlzaXNEaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdfG51bGwgPSBudWxsO1xuICByZXNvbHZlRGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPEQsIEEsIFMsIFI+LCBkZXRlY3RlZDogRGV0ZWN0UmVzdWx0PEQ+KSB7XG4gICAgdGhpcy5oYW5kbGVyID0gaGFuZGxlcjtcbiAgICB0aGlzLmRldGVjdGVkID0gZGV0ZWN0ZWQ7XG4gIH1cblxuICB0b0FuYWx5emVkKGFuYWx5c2lzOiBBfG51bGwsIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW118bnVsbCwgc3ltYm9sOiBTKTpcbiAgICAgIEFuYWx5emVkVHJhaXQ8RCwgQSwgUywgUj4ge1xuICAgIC8vIE9ubHkgcGVuZGluZyB0cmFpdHMgY2FuIGJlIGFuYWx5emVkLlxuICAgIHRoaXMuYXNzZXJ0VHJhbnNpdGlvbkxlZ2FsKFRyYWl0U3RhdGUuUGVuZGluZywgVHJhaXRTdGF0ZS5BbmFseXplZCk7XG4gICAgdGhpcy5hbmFseXNpcyA9IGFuYWx5c2lzO1xuICAgIHRoaXMuYW5hbHlzaXNEaWFnbm9zdGljcyA9IGRpYWdub3N0aWNzO1xuICAgIHRoaXMuc3ltYm9sID0gc3ltYm9sO1xuICAgIHRoaXMuc3RhdGUgPSBUcmFpdFN0YXRlLkFuYWx5emVkO1xuICAgIHJldHVybiB0aGlzIGFzIEFuYWx5emVkVHJhaXQ8RCwgQSwgUywgUj47XG4gIH1cblxuICB0b1Jlc29sdmVkKHJlc29sdXRpb246IFJ8bnVsbCwgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXXxudWxsKTogUmVzb2x2ZWRUcmFpdDxELCBBLCBTLCBSPiB7XG4gICAgLy8gT25seSBhbmFseXplZCB0cmFpdHMgY2FuIGJlIHJlc29sdmVkLlxuICAgIHRoaXMuYXNzZXJ0VHJhbnNpdGlvbkxlZ2FsKFRyYWl0U3RhdGUuQW5hbHl6ZWQsIFRyYWl0U3RhdGUuUmVzb2x2ZWQpO1xuICAgIGlmICh0aGlzLmFuYWx5c2lzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCB0cmFuc2l0aW9uIGFuIEFuYWx5emVkIHRyYWl0IHdpdGggYSBudWxsIGFuYWx5c2lzIHRvIFJlc29sdmVkYCk7XG4gICAgfVxuICAgIHRoaXMucmVzb2x1dGlvbiA9IHJlc29sdXRpb247XG4gICAgdGhpcy5zdGF0ZSA9IFRyYWl0U3RhdGUuUmVzb2x2ZWQ7XG4gICAgdGhpcy5yZXNvbHZlRGlhZ25vc3RpY3MgPSBkaWFnbm9zdGljcztcbiAgICByZXR1cm4gdGhpcyBhcyBSZXNvbHZlZFRyYWl0PEQsIEEsIFMsIFI+O1xuICB9XG5cbiAgdG9Ta2lwcGVkKCk6IFNraXBwZWRUcmFpdDxELCBBLCBTLCBSPiB7XG4gICAgLy8gT25seSBwZW5kaW5nIHRyYWl0cyBjYW4gYmUgc2tpcHBlZC5cbiAgICB0aGlzLmFzc2VydFRyYW5zaXRpb25MZWdhbChUcmFpdFN0YXRlLlBlbmRpbmcsIFRyYWl0U3RhdGUuU2tpcHBlZCk7XG4gICAgdGhpcy5zdGF0ZSA9IFRyYWl0U3RhdGUuU2tpcHBlZDtcbiAgICByZXR1cm4gdGhpcyBhcyBTa2lwcGVkVHJhaXQ8RCwgQSwgUywgUj47XG4gIH1cblxuICAvKipcbiAgICogVmVyaWZpZXMgdGhhdCB0aGUgdHJhaXQgaXMgY3VycmVudGx5IGluIG9uZSBvZiB0aGUgYGFsbG93ZWRTdGF0ZWBzLlxuICAgKlxuICAgKiBJZiBjb3JyZWN0bHkgdXNlZCwgdGhlIGBUcmFpdGAgdHlwZSBhbmQgdHJhbnNpdGlvbiBtZXRob2RzIHByZXZlbnQgaWxsZWdhbCB0cmFuc2l0aW9ucyBmcm9tXG4gICAqIG9jY3VycmluZy4gSG93ZXZlciwgaWYgYSByZWZlcmVuY2UgdG8gdGhlIGBUcmFpdEltcGxgIGluc3RhbmNlIHR5cGVkIHdpdGggdGhlIHByZXZpb3VzXG4gICAqIGludGVyZmFjZSBpcyByZXRhaW5lZCBhZnRlciBjYWxsaW5nIG9uZSBvZiBpdHMgdHJhbnNpdGlvbiBtZXRob2RzLCBpdCB3aWxsIGFsbG93IGZvciBpbGxlZ2FsXG4gICAqIHRyYW5zaXRpb25zIHRvIHRha2UgcGxhY2UuIEhlbmNlLCB0aGlzIGFzc2VydGlvbiBwcm92aWRlcyBhIGxpdHRsZSBleHRyYSBydW50aW1lIHByb3RlY3Rpb24uXG4gICAqL1xuICBwcml2YXRlIGFzc2VydFRyYW5zaXRpb25MZWdhbChhbGxvd2VkU3RhdGU6IFRyYWl0U3RhdGUsIHRyYW5zaXRpb25UbzogVHJhaXRTdGF0ZSk6IHZvaWQge1xuICAgIGlmICghKHRoaXMuc3RhdGUgPT09IGFsbG93ZWRTdGF0ZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uIGZhaWx1cmU6IGNhbm5vdCB0cmFuc2l0aW9uIGZyb20gJHtUcmFpdFN0YXRlW3RoaXMuc3RhdGVdfSB0byAke1xuICAgICAgICAgIFRyYWl0U3RhdGVbdHJhbnNpdGlvblRvXX0uYCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhIG5ldyBgVHJhaXRJbXBsYCBpbiB0aGUgcGVuZGluZyBzdGF0ZS5cbiAgICovXG4gIHN0YXRpYyBwZW5kaW5nPEQsIEEsIFMgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbHxudWxsLCBSPihcbiAgICAgIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8RCwgQSwgUywgUj4sIGRldGVjdGVkOiBEZXRlY3RSZXN1bHQ8RD4pOiBQZW5kaW5nVHJhaXQ8RCwgQSwgUywgUj4ge1xuICAgIHJldHVybiBuZXcgVHJhaXRJbXBsKGhhbmRsZXIsIGRldGVjdGVkKSBhcyBQZW5kaW5nVHJhaXQ8RCwgQSwgUywgUj47XG4gIH1cbn1cbiJdfQ==