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
    exports.Trait = exports.TraitState = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvdHJhaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBS0gsSUFBWSxVQTBCWDtJQTFCRCxXQUFZLFVBQVU7UUFDcEI7O1dBRUc7UUFDSCxpREFBYyxDQUFBO1FBRWQ7O1dBRUc7UUFDSCxtREFBZSxDQUFBO1FBRWY7O1dBRUc7UUFDSCxtREFBZSxDQUFBO1FBRWY7OztXQUdHO1FBQ0gsaURBQWMsQ0FBQTtRQUVkOztXQUVHO1FBQ0gsa0RBQWMsQ0FBQTtJQUNoQixDQUFDLEVBMUJXLFVBQVUsR0FBVixrQkFBVSxLQUFWLGtCQUFVLFFBMEJyQjtJQWtCRDs7O09BR0c7SUFDVSxRQUFBLEtBQUssR0FBRztRQUNuQixPQUFPLEVBQUUsVUFBVSxPQUFrQyxFQUFFLFFBQXlCLElBQ25ELE9BQUEsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLEVBQXBDLENBQW9DO0tBQ2xFLENBQUM7SUFxSUY7OztPQUdHO0lBQ0g7UUFRRSxtQkFBWSxPQUFrQyxFQUFFLFFBQXlCO1lBUHpFLFVBQUssR0FBZSxVQUFVLENBQUMsT0FBTyxDQUFDO1lBR3ZDLGFBQVEsR0FBcUIsSUFBSSxDQUFDO1lBQ2xDLGVBQVUsR0FBcUIsSUFBSSxDQUFDO1lBQ3BDLGdCQUFXLEdBQXlCLElBQUksQ0FBQztZQUd2QyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztZQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUMzQixDQUFDO1FBRUQsOEJBQVUsR0FBVixVQUFXLFFBQVc7WUFDcEIsdUNBQXVDO1lBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNwRSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztZQUN6QixJQUFJLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUM7WUFDakMsT0FBTyxJQUE4QixDQUFDO1FBQ3hDLENBQUM7UUFFRCw2QkFBUyxHQUFULFVBQVUsV0FBNEI7WUFDcEMsc0ZBQXNGO1lBQ3RGLDBDQUEwQztZQUMxQyxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxRixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztZQUMvQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztZQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUM7WUFDaEMsT0FBTyxJQUE2QixDQUFDO1FBQ3ZDLENBQUM7UUFFRCw4QkFBVSxHQUFWLFVBQVcsVUFBYTtZQUN0Qix3Q0FBd0M7WUFDeEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JFLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1lBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUNqQyxPQUFPLElBQThCLENBQUM7UUFDeEMsQ0FBQztRQUVELDZCQUFTLEdBQVQ7WUFDRSxzQ0FBc0M7WUFDdEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQztZQUNoQyxPQUFPLElBQTZCLENBQUM7UUFDdkMsQ0FBQztRQUVEOzs7Ozs7O1dBT0c7UUFDSyx5Q0FBcUIsR0FBN0IsVUFBOEIsWUFBd0IsRUFBRSxZQUF3QjtZQUM5RSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxFQUFFO2dCQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLCtDQUE2QyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUMvRSxVQUFVLENBQUMsWUFBWSxDQUFDLE1BQUcsQ0FBQyxDQUFDO2FBQ2xDO1FBQ0gsQ0FBQztRQUVEOztXQUVHO1FBQ0ksaUJBQU8sR0FBZCxVQUF3QixPQUFrQyxFQUFFLFFBQXlCO1lBRW5GLE9BQU8sSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBMEIsQ0FBQztRQUNuRSxDQUFDO1FBQ0gsZ0JBQUM7SUFBRCxDQUFDLEFBcEVELElBb0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7RGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0fSBmcm9tICcuL2FwaSc7XG5cbmV4cG9ydCBlbnVtIFRyYWl0U3RhdGUge1xuICAvKipcbiAgICogUGVuZGluZyB0cmFpdHMgYXJlIGZyZXNobHkgY3JlYXRlZCBhbmQgaGF2ZSBuZXZlciBiZWVuIGFuYWx5emVkLlxuICAgKi9cbiAgUEVORElORyA9IDB4MDEsXG5cbiAgLyoqXG4gICAqIEFuYWx5emVkIHRyYWl0cyBoYXZlIHN1Y2Nlc3NmdWxseSBiZWVuIGFuYWx5emVkLCBidXQgYXJlIHBlbmRpbmcgcmVzb2x1dGlvbi5cbiAgICovXG4gIEFOQUxZWkVEID0gMHgwMixcblxuICAvKipcbiAgICogUmVzb2x2ZWQgdHJhaXRzIGhhdmUgc3VjY2Vzc2Z1bGx5IGJlZW4gYW5hbHl6ZWQgYW5kIHJlc29sdmVkIGFuZCBhcmUgcmVhZHkgZm9yIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgUkVTT0xWRUQgPSAweDA0LFxuXG4gIC8qKlxuICAgKiBFcnJvcmVkIHRyYWl0cyBoYXZlIGZhaWxlZCBlaXRoZXIgYW5hbHlzaXMgb3IgcmVzb2x1dGlvbiBhbmQgYXMgYSByZXN1bHQgY29udGFpbiBkaWFnbm9zdGljc1xuICAgKiBkZXNjcmliaW5nIHRoZSBmYWlsdXJlKHMpLlxuICAgKi9cbiAgRVJST1JFRCA9IDB4MDgsXG5cbiAgLyoqXG4gICAqIFNraXBwZWQgdHJhaXRzIGFyZSBubyBsb25nZXIgY29uc2lkZXJlZCBmb3IgY29tcGlsYXRpb24uXG4gICAqL1xuICBTS0lQUEVEID0gMHgxMCxcbn1cblxuLyoqXG4gKiBBbiBJdnkgYXNwZWN0IGFkZGVkIHRvIGEgY2xhc3MgKGZvciBleGFtcGxlLCB0aGUgY29tcGlsYXRpb24gb2YgYSBjb21wb25lbnQgZGVmaW5pdGlvbikuXG4gKlxuICogVHJhaXRzIGFyZSBjcmVhdGVkIHdoZW4gYSBgRGVjb3JhdG9ySGFuZGxlcmAgbWF0Y2hlcyBhIGNsYXNzLiBFYWNoIHRyYWl0IGJlZ2lucyBpbiBhIHBlbmRpbmdcbiAqIHN0YXRlIGFuZCB1bmRlcmdvZXMgdHJhbnNpdGlvbnMgYXMgY29tcGlsYXRpb24gcHJvY2VlZHMgdGhyb3VnaCB0aGUgdmFyaW91cyBzdGVwcy5cbiAqXG4gKiBJbiBwcmFjdGljZSwgdHJhaXRzIGFyZSBpbnN0YW5jZXMgb2YgdGhlIHByaXZhdGUgY2xhc3MgYFRyYWl0SW1wbGAgZGVjbGFyZWQgYmVsb3cuIFRocm91Z2ggdGhlXG4gKiB2YXJpb3VzIGludGVyZmFjZXMgaW5jbHVkZWQgaW4gdGhpcyB1bmlvbiB0eXBlLCB0aGUgbGVnYWwgQVBJIG9mIGEgdHJhaXQgaW4gYW55IGdpdmVuIHN0YXRlIGlzXG4gKiByZXByZXNlbnRlZCBpbiB0aGUgdHlwZSBzeXN0ZW0uIFRoaXMgaW5jbHVkZXMgYW55IHBvc3NpYmxlIHRyYW5zaXRpb25zIGZyb20gb25lIHR5cGUgdG8gdGhlIG5leHQuXG4gKlxuICogVGhpcyBub3Qgb25seSBzaW1wbGlmaWVzIHRoZSBpbXBsZW1lbnRhdGlvbiwgYnV0IGVuc3VyZXMgdHJhaXRzIGFyZSBtb25vbW9ycGhpYyBvYmplY3RzIGFzXG4gKiB0aGV5J3JlIGFsbCBqdXN0IFwidmlld3NcIiBpbiB0aGUgdHlwZSBzeXN0ZW0gb2YgdGhlIHNhbWUgb2JqZWN0ICh3aGljaCBuZXZlciBjaGFuZ2VzIHNoYXBlKS5cbiAqL1xuZXhwb3J0IHR5cGUgVHJhaXQ8RCwgQSwgUj4gPSBQZW5kaW5nVHJhaXQ8RCwgQSwgUj58U2tpcHBlZFRyYWl0PEQsIEEsIFI+fEFuYWx5emVkVHJhaXQ8RCwgQSwgUj58XG4gICAgUmVzb2x2ZWRUcmFpdDxELCBBLCBSPnxFcnJvcmVkVHJhaXQ8RCwgQSwgUj47XG5cbi8qKlxuICogVGhlIHZhbHVlIHNpZGUgb2YgYFRyYWl0YCBleHBvc2VzIGEgaGVscGVyIHRvIGNyZWF0ZSBhIGBUcmFpdGAgaW4gYSBwZW5kaW5nIHN0YXRlIChieSBkZWxlZ2F0aW5nXG4gKiB0byBgVHJhaXRJbXBsYCkuXG4gKi9cbmV4cG9ydCBjb25zdCBUcmFpdCA9IHtcbiAgcGVuZGluZzogPEQsIEEsIFI+KGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8RCwgQSwgUj4sIGRldGVjdGVkOiBEZXRlY3RSZXN1bHQ8RD4pOlxuICAgICAgUGVuZGluZ1RyYWl0PEQsIEEsIFI+ID0+IFRyYWl0SW1wbC5wZW5kaW5nKGhhbmRsZXIsIGRldGVjdGVkKSxcbn07XG5cbi8qKlxuICogVGhlIHBhcnQgb2YgdGhlIGBUcmFpdGAgaW50ZXJmYWNlIHRoYXQncyBjb21tb24gdG8gYWxsIHRyYWl0IHN0YXRlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFpdEJhc2U8RCwgQSwgUj4ge1xuICAvKipcbiAgICogQ3VycmVudCBzdGF0ZSBvZiB0aGUgdHJhaXQuXG4gICAqXG4gICAqIFRoaXMgd2lsbCBiZSBuYXJyb3dlZCBpbiB0aGUgaW50ZXJmYWNlcyBmb3IgZWFjaCBzcGVjaWZpYyBzdGF0ZS5cbiAgICovXG4gIHN0YXRlOiBUcmFpdFN0YXRlO1xuXG4gIC8qKlxuICAgKiBUaGUgYERlY29yYXRvckhhbmRsZXJgIHdoaWNoIG1hdGNoZWQgb24gdGhlIGNsYXNzIHRvIGNyZWF0ZSB0aGlzIHRyYWl0LlxuICAgKi9cbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxELCBBLCBSPjtcblxuICAvKipcbiAgICogVGhlIGRldGVjdGlvbiByZXN1bHQgKG9mIGBoYW5kbGVyLmRldGVjdGApIHdoaWNoIGluZGljYXRlZCB0aGF0IHRoaXMgdHJhaXQgYXBwbGllZCB0byB0aGVcbiAgICogY2xhc3MuXG4gICAqXG4gICAqIFRoaXMgaXMgbWFpbmx5IHVzZWQgdG8gY2FjaGUgdGhlIGRldGVjdGlvbiBiZXR3ZWVuIHByZS1hbmFseXNpcyBhbmQgYW5hbHlzaXMuXG4gICAqL1xuICBkZXRlY3RlZDogRGV0ZWN0UmVzdWx0PEQ+O1xufVxuXG4vKipcbiAqIEEgdHJhaXQgaW4gdGhlIHBlbmRpbmcgc3RhdGUuXG4gKlxuICogUGVuZGluZyB0cmFpdHMgaGF2ZSB5ZXQgdG8gYmUgYW5hbHl6ZWQgaW4gYW55IHdheS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQZW5kaW5nVHJhaXQ8RCwgQSwgUj4gZXh0ZW5kcyBUcmFpdEJhc2U8RCwgQSwgUj4ge1xuICBzdGF0ZTogVHJhaXRTdGF0ZS5QRU5ESU5HO1xuXG4gIC8qKlxuICAgKiBUaGlzIHBlbmRpbmcgdHJhaXQgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IGFuYWx5emVkLCBhbmQgc2hvdWxkIHRyYW5zaXRpb24gdG8gdGhlIFwiYW5hbHl6ZWRcIlxuICAgKiBzdGF0ZS5cbiAgICovXG4gIHRvQW5hbHl6ZWQoYW5hbHlzaXM6IEEpOiBBbmFseXplZFRyYWl0PEQsIEEsIFI+O1xuXG4gIC8qKlxuICAgKiBUaGlzIHRyYWl0IGZhaWxlZCBhbmFseXNpcywgYW5kIHNob3VsZCB0cmFuc2l0aW9uIHRvIHRoZSBcImVycm9yZWRcIiBzdGF0ZSB3aXRoIHRoZSByZXN1bHRpbmdcbiAgICogZGlhZ25vc3RpY3MuXG4gICAqL1xuICB0b0Vycm9yZWQoZXJyb3JzOiB0cy5EaWFnbm9zdGljW10pOiBFcnJvcmVkVHJhaXQ8RCwgQSwgUj47XG5cbiAgLyoqXG4gICAqIER1cmluZyBhbmFseXNpcyBpdCB3YXMgZGV0ZXJtaW5lZCB0aGF0IHRoaXMgdHJhaXQgaXMgbm90IGVsaWdpYmxlIGZvciBjb21waWxhdGlvbiBhZnRlciBhbGwsXG4gICAqIGFuZCBzaG91bGQgYmUgdHJhbnNpdGlvbmVkIHRvIHRoZSBcInNraXBwZWRcIiBzdGF0ZS5cbiAgICovXG4gIHRvU2tpcHBlZCgpOiBTa2lwcGVkVHJhaXQ8RCwgQSwgUj47XG59XG5cbi8qKlxuICogQSB0cmFpdCBpbiB0aGUgXCJlcnJvcmVkXCIgc3RhdGUuXG4gKlxuICogRXJyb3JlZCB0cmFpdHMgY29udGFpbiBgdHMuRGlhZ25vc3RpY2BzIGluZGljYXRpbmcgYW55IHByb2JsZW0ocykgd2l0aCB0aGUgY2xhc3MuXG4gKlxuICogVGhpcyBpcyBhIHRlcm1pbmFsIHN0YXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yZWRUcmFpdDxELCBBLCBSPiBleHRlbmRzIFRyYWl0QmFzZTxELCBBLCBSPiB7XG4gIHN0YXRlOiBUcmFpdFN0YXRlLkVSUk9SRUQ7XG5cbiAgLyoqXG4gICAqIERpYWdub3N0aWNzIHdoaWNoIHdlcmUgcHJvZHVjZWQgd2hpbGUgYXR0ZW1wdGluZyB0byBhbmFseXplIHRoZSB0cmFpdC5cbiAgICovXG4gIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW107XG59XG5cbi8qKlxuICogQSB0cmFpdCBpbiB0aGUgXCJza2lwcGVkXCIgc3RhdGUuXG4gKlxuICogU2tpcHBlZCB0cmFpdHMgYXJlbid0IGNvbnNpZGVyZWQgZm9yIGNvbXBpbGF0aW9uLlxuICpcbiAqIFRoaXMgaXMgYSB0ZXJtaW5hbCBzdGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTa2lwcGVkVHJhaXQ8RCwgQSwgUj4gZXh0ZW5kcyBUcmFpdEJhc2U8RCwgQSwgUj4ge1xuICBzdGF0ZTogVHJhaXRTdGF0ZS5TS0lQUEVEO1xufVxuXG4vKipcbiAqIFRoZSBwYXJ0IG9mIHRoZSBgVHJhaXRgIGludGVyZmFjZSBmb3IgYW55IHRyYWl0IHdoaWNoIGhhcyBiZWVuIHN1Y2Nlc3NmdWxseSBhbmFseXplZC5cbiAqXG4gKiBNYWlubHksIHRoaXMgaXMgdXNlZCB0byBzaGFyZSB0aGUgY29tbWVudCBvbiB0aGUgYGFuYWx5c2lzYCBmaWVsZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFpdFdpdGhBbmFseXNpczxBPiB7XG4gIC8qKlxuICAgKiBUaGUgcmVzdWx0cyByZXR1cm5lZCBieSBhIHN1Y2Nlc3NmdWwgYW5hbHlzaXMgb2YgdGhlIGdpdmVuIGNsYXNzL2BEZWNvcmF0b3JIYW5kbGVyYFxuICAgKiBjb21iaW5hdGlvbi5cbiAgICovXG4gIGFuYWx5c2lzOiBSZWFkb25seTxBPjtcbn1cblxuLyoqXG4gKiBBIHRyYWl0IGluIHRoZSBcImFuYWx5emVkXCIgc3RhdGUuXG4gKlxuICogQW5hbHl6ZWQgdHJhaXRzIGhhdmUgYW5hbHlzaXMgcmVzdWx0cyBhdmFpbGFibGUsIGFuZCBhcmUgZWxpZ2libGUgZm9yIHJlc29sdXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRUcmFpdDxELCBBLCBSPiBleHRlbmRzIFRyYWl0QmFzZTxELCBBLCBSPiwgVHJhaXRXaXRoQW5hbHlzaXM8QT4ge1xuICBzdGF0ZTogVHJhaXRTdGF0ZS5BTkFMWVpFRDtcblxuICAvKipcbiAgICogVGhpcyBhbmFseXplZCB0cmFpdCBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgcmVzb2x2ZWQsIGFuZCBzaG91bGQgYmUgdHJhbnNpdGlvbmVkIHRvIHRoZVxuICAgKiBcInJlc29sdmVkXCIgc3RhdGUuXG4gICAqL1xuICB0b1Jlc29sdmVkKHJlc29sdXRpb246IFIpOiBSZXNvbHZlZFRyYWl0PEQsIEEsIFI+O1xuXG4gIC8qKlxuICAgKiBUaGlzIHRyYWl0IGZhaWxlZCByZXNvbHV0aW9uLCBhbmQgc2hvdWxkIHRyYW5zaXRpb24gdG8gdGhlIFwiZXJyb3JlZFwiIHN0YXRlIHdpdGggdGhlIHJlc3VsdGluZ1xuICAgKiBkaWFnbm9zdGljcy5cbiAgICovXG4gIHRvRXJyb3JlZChlcnJvcnM6IHRzLkRpYWdub3N0aWNbXSk6IEVycm9yZWRUcmFpdDxELCBBLCBSPjtcbn1cblxuLyoqXG4gKiBBIHRyYWl0IGluIHRoZSBcInJlc29sdmVkXCIgc3RhdGUuXG4gKlxuICogUmVzb2x2ZWQgdHJhaXRzIGhhdmUgYmVlbiBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYW5kIHJlc29sdmVkLCBjb250YWluIG5vIGVycm9ycywgYW5kIGFyZSByZWFkeVxuICogZm9yIHRoZSBjb21waWxhdGlvbiBwaGFzZS5cbiAqXG4gKiBUaGlzIGlzIGEgdGVybWluYWwgc3RhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWRUcmFpdDxELCBBLCBSPiBleHRlbmRzIFRyYWl0QmFzZTxELCBBLCBSPiwgVHJhaXRXaXRoQW5hbHlzaXM8QT4ge1xuICBzdGF0ZTogVHJhaXRTdGF0ZS5SRVNPTFZFRDtcblxuICAvKipcbiAgICogVGhlIHJlc3VsdHMgcmV0dXJuZWQgYnkgYSBzdWNjZXNzZnVsIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIGNsYXNzL2BEZWNvcmF0b3JIYW5kbGVyYFxuICAgKiBjb21iaW5hdGlvbi5cbiAgICovXG4gIHJlc29sdXRpb246IFJlYWRvbmx5PFI+O1xufVxuXG4vKipcbiAqIEFuIGltcGxlbWVudGF0aW9uIG9mIHRoZSBgVHJhaXRgIHR5cGUgd2hpY2ggdHJhbnNpdGlvbnMgc2FmZWx5IGJldHdlZW4gdGhlIHZhcmlvdXNcbiAqIGBUcmFpdFN0YXRlYHMuXG4gKi9cbmNsYXNzIFRyYWl0SW1wbDxELCBBLCBSPiB7XG4gIHN0YXRlOiBUcmFpdFN0YXRlID0gVHJhaXRTdGF0ZS5QRU5ESU5HO1xuICBoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPEQsIEEsIFI+O1xuICBkZXRlY3RlZDogRGV0ZWN0UmVzdWx0PEQ+O1xuICBhbmFseXNpczogUmVhZG9ubHk8QT58bnVsbCA9IG51bGw7XG4gIHJlc29sdXRpb246IFJlYWRvbmx5PFI+fG51bGwgPSBudWxsO1xuICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8RCwgQSwgUj4sIGRldGVjdGVkOiBEZXRlY3RSZXN1bHQ8RD4pIHtcbiAgICB0aGlzLmhhbmRsZXIgPSBoYW5kbGVyO1xuICAgIHRoaXMuZGV0ZWN0ZWQgPSBkZXRlY3RlZDtcbiAgfVxuXG4gIHRvQW5hbHl6ZWQoYW5hbHlzaXM6IEEpOiBBbmFseXplZFRyYWl0PEQsIEEsIFI+IHtcbiAgICAvLyBPbmx5IHBlbmRpbmcgdHJhaXRzIGNhbiBiZSBhbmFseXplZC5cbiAgICB0aGlzLmFzc2VydFRyYW5zaXRpb25MZWdhbChUcmFpdFN0YXRlLlBFTkRJTkcsIFRyYWl0U3RhdGUuQU5BTFlaRUQpO1xuICAgIHRoaXMuYW5hbHlzaXMgPSBhbmFseXNpcztcbiAgICB0aGlzLnN0YXRlID0gVHJhaXRTdGF0ZS5BTkFMWVpFRDtcbiAgICByZXR1cm4gdGhpcyBhcyBBbmFseXplZFRyYWl0PEQsIEEsIFI+O1xuICB9XG5cbiAgdG9FcnJvcmVkKGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10pOiBFcnJvcmVkVHJhaXQ8RCwgQSwgUj4ge1xuICAgIC8vIFBlbmRpbmcgdHJhaXRzIChkdXJpbmcgYW5hbHlzaXMpIG9yIGFuYWx5emVkIHRyYWl0cyAoZHVyaW5nIHJlc29sdXRpb24pIGNhbiBwcm9kdWNlXG4gICAgLy8gZGlhZ25vc3RpY3MgYW5kIGVudGVyIGFuIGVycm9yZWQgc3RhdGUuXG4gICAgdGhpcy5hc3NlcnRUcmFuc2l0aW9uTGVnYWwoVHJhaXRTdGF0ZS5QRU5ESU5HIHwgVHJhaXRTdGF0ZS5BTkFMWVpFRCwgVHJhaXRTdGF0ZS5SRVNPTFZFRCk7XG4gICAgdGhpcy5kaWFnbm9zdGljcyA9IGRpYWdub3N0aWNzO1xuICAgIHRoaXMuYW5hbHlzaXMgPSBudWxsO1xuICAgIHRoaXMuc3RhdGUgPSBUcmFpdFN0YXRlLkVSUk9SRUQ7XG4gICAgcmV0dXJuIHRoaXMgYXMgRXJyb3JlZFRyYWl0PEQsIEEsIFI+O1xuICB9XG5cbiAgdG9SZXNvbHZlZChyZXNvbHV0aW9uOiBSKTogUmVzb2x2ZWRUcmFpdDxELCBBLCBSPiB7XG4gICAgLy8gT25seSBhbmFseXplZCB0cmFpdHMgY2FuIGJlIHJlc29sdmVkLlxuICAgIHRoaXMuYXNzZXJ0VHJhbnNpdGlvbkxlZ2FsKFRyYWl0U3RhdGUuQU5BTFlaRUQsIFRyYWl0U3RhdGUuUkVTT0xWRUQpO1xuICAgIHRoaXMucmVzb2x1dGlvbiA9IHJlc29sdXRpb247XG4gICAgdGhpcy5zdGF0ZSA9IFRyYWl0U3RhdGUuUkVTT0xWRUQ7XG4gICAgcmV0dXJuIHRoaXMgYXMgUmVzb2x2ZWRUcmFpdDxELCBBLCBSPjtcbiAgfVxuXG4gIHRvU2tpcHBlZCgpOiBTa2lwcGVkVHJhaXQ8RCwgQSwgUj4ge1xuICAgIC8vIE9ubHkgcGVuZGluZyB0cmFpdHMgY2FuIGJlIHNraXBwZWQuXG4gICAgdGhpcy5hc3NlcnRUcmFuc2l0aW9uTGVnYWwoVHJhaXRTdGF0ZS5QRU5ESU5HLCBUcmFpdFN0YXRlLlNLSVBQRUQpO1xuICAgIHRoaXMuc3RhdGUgPSBUcmFpdFN0YXRlLlNLSVBQRUQ7XG4gICAgcmV0dXJuIHRoaXMgYXMgU2tpcHBlZFRyYWl0PEQsIEEsIFI+O1xuICB9XG5cbiAgLyoqXG4gICAqIFZlcmlmaWVzIHRoYXQgdGhlIHRyYWl0IGlzIGN1cnJlbnRseSBpbiBvbmUgb2YgdGhlIGBhbGxvd2VkU3RhdGVgcy5cbiAgICpcbiAgICogSWYgY29ycmVjdGx5IHVzZWQsIHRoZSBgVHJhaXRgIHR5cGUgYW5kIHRyYW5zaXRpb24gbWV0aG9kcyBwcmV2ZW50IGlsbGVnYWwgdHJhbnNpdGlvbnMgZnJvbVxuICAgKiBvY2N1cnJpbmcuIEhvd2V2ZXIsIGlmIGEgcmVmZXJlbmNlIHRvIHRoZSBgVHJhaXRJbXBsYCBpbnN0YW5jZSB0eXBlZCB3aXRoIHRoZSBwcmV2aW91c1xuICAgKiBpbnRlcmZhY2UgaXMgcmV0YWluZWQgYWZ0ZXIgY2FsbGluZyBvbmUgb2YgaXRzIHRyYW5zaXRpb24gbWV0aG9kcywgaXQgd2lsbCBhbGxvdyBmb3IgaWxsZWdhbFxuICAgKiB0cmFuc2l0aW9ucyB0byB0YWtlIHBsYWNlLiBIZW5jZSwgdGhpcyBhc3NlcnRpb24gcHJvdmlkZXMgYSBsaXR0bGUgZXh0cmEgcnVudGltZSBwcm90ZWN0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3NlcnRUcmFuc2l0aW9uTGVnYWwoYWxsb3dlZFN0YXRlOiBUcmFpdFN0YXRlLCB0cmFuc2l0aW9uVG86IFRyYWl0U3RhdGUpOiB2b2lkIHtcbiAgICBpZiAoISh0aGlzLnN0YXRlICYgYWxsb3dlZFN0YXRlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb24gZmFpbHVyZTogY2Fubm90IHRyYW5zaXRpb24gZnJvbSAke1RyYWl0U3RhdGVbdGhpcy5zdGF0ZV19IHRvICR7XG4gICAgICAgICAgVHJhaXRTdGF0ZVt0cmFuc2l0aW9uVG9dfS5gKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29uc3RydWN0IGEgbmV3IGBUcmFpdEltcGxgIGluIHRoZSBwZW5kaW5nIHN0YXRlLlxuICAgKi9cbiAgc3RhdGljIHBlbmRpbmc8RCwgQSwgUj4oaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxELCBBLCBSPiwgZGV0ZWN0ZWQ6IERldGVjdFJlc3VsdDxEPik6XG4gICAgICBQZW5kaW5nVHJhaXQ8RCwgQSwgUj4ge1xuICAgIHJldHVybiBuZXcgVHJhaXRJbXBsKGhhbmRsZXIsIGRldGVjdGVkKSBhcyBQZW5kaW5nVHJhaXQ8RCwgQSwgUj47XG4gIH1cbn1cbiJdfQ==