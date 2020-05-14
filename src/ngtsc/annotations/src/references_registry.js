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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/references_registry", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoopReferencesRegistry = void 0;
    /**
     * This registry does nothing, since ngtsc does not currently need
     * this functionality.
     * The ngcc tool implements a working version for its purposes.
     */
    var NoopReferencesRegistry = /** @class */ (function () {
        function NoopReferencesRegistry() {
        }
        NoopReferencesRegistry.prototype.add = function (source) {
            var references = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                references[_i - 1] = arguments[_i];
            }
        };
        return NoopReferencesRegistry;
    }());
    exports.NoopReferencesRegistry = NoopReferencesRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlc19yZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3JlZmVyZW5jZXNfcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBaUJIOzs7O09BSUc7SUFDSDtRQUFBO1FBRUEsQ0FBQztRQURDLG9DQUFHLEdBQUgsVUFBSSxNQUFzQjtZQUFFLG9CQUEwQztpQkFBMUMsVUFBMEMsRUFBMUMscUJBQTBDLEVBQTFDLElBQTBDO2dCQUExQyxtQ0FBMEM7O1FBQVMsQ0FBQztRQUNsRiw2QkFBQztJQUFELENBQUMsQUFGRCxJQUVDO0lBRlksd0RBQXNCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcblxuLyoqXG4gKiBJbXBsZW1lbnQgdGhpcyBpbnRlcmZhY2UgaWYgeW91IHdhbnQgRGVjb3JhdG9ySGFuZGxlcnMgdG8gcmVnaXN0ZXJcbiAqIHJlZmVyZW5jZXMgdGhhdCB0aGV5IGZpbmQgaW4gdGhlaXIgYW5hbHlzaXMgb2YgdGhlIGNvZGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVmZXJlbmNlc1JlZ2lzdHJ5IHtcbiAgLyoqXG4gICAqIFJlZ2lzdGVyIG9uZSBvciBtb3JlIHJlZmVyZW5jZXMgaW4gdGhlIHJlZ2lzdHJ5LlxuICAgKiBAcGFyYW0gcmVmZXJlbmNlcyBBIGNvbGxlY3Rpb24gb2YgcmVmZXJlbmNlcyB0byByZWdpc3Rlci5cbiAgICovXG4gIGFkZChzb3VyY2U6IHRzLkRlY2xhcmF0aW9uLCAuLi5yZWZlcmVuY2VzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W10pOiB2b2lkO1xufVxuXG4vKipcbiAqIFRoaXMgcmVnaXN0cnkgZG9lcyBub3RoaW5nLCBzaW5jZSBuZ3RzYyBkb2VzIG5vdCBjdXJyZW50bHkgbmVlZFxuICogdGhpcyBmdW5jdGlvbmFsaXR5LlxuICogVGhlIG5nY2MgdG9vbCBpbXBsZW1lbnRzIGEgd29ya2luZyB2ZXJzaW9uIGZvciBpdHMgcHVycG9zZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb29wUmVmZXJlbmNlc1JlZ2lzdHJ5IGltcGxlbWVudHMgUmVmZXJlbmNlc1JlZ2lzdHJ5IHtcbiAgYWRkKHNvdXJjZTogdHMuRGVjbGFyYXRpb24sIC4uLnJlZmVyZW5jZXM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXSk6IHZvaWQge31cbn0iXX0=