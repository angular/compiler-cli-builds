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
        define("@angular/compiler-cli/src/ngtsc/core/api/src/public_options", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVibGljX29wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvYXBpL3NyYy9wdWJsaWNfb3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbi8qKlxuICogT3B0aW9ucyBzdXBwb3J0ZWQgYnkgdGhlIGxlZ2FjeSBWaWV3IEVuZ2luZSBjb21waWxlciwgd2hpY2ggYXJlIHN0aWxsIGNvbnN1bWVkIGJ5IHRoZSBBbmd1bGFyIEl2eVxuICogY29tcGlsZXIgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICpcbiAqIFRoZXNlIGFyZSBleHBlY3RlZCB0byBiZSByZW1vdmVkIGF0IHNvbWUgcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGVnYWN5TmdjT3B0aW9ucyB7XG4gIC8qKiBnZW5lcmF0ZSBhbGwgcG9zc2libGUgZ2VuZXJhdGVkIGZpbGVzICAqL1xuICBhbGxvd0VtcHR5Q29kZWdlbkZpbGVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byB0eXBlIGNoZWNrIHRoZSBlbnRpcmUgdGVtcGxhdGUuXG4gICAqXG4gICAqIFRoaXMgZmxhZyBjdXJyZW50bHkgY29udHJvbHMgYSBjb3VwbGUgYXNwZWN0cyBvZiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nLCBpbmNsdWRpbmdcbiAgICogd2hldGhlciBlbWJlZGRlZCB2aWV3cyBhcmUgY2hlY2tlZC5cbiAgICpcbiAgICogRm9yIG1heGltdW0gdHlwZS1jaGVja2luZywgc2V0IHRoaXMgdG8gYHRydWVgLCBhbmQgc2V0IGBzdHJpY3RUZW1wbGF0ZXNgIHRvIGB0cnVlYC5cbiAgICpcbiAgICogSXQgaXMgYW4gZXJyb3IgZm9yIHRoaXMgZmxhZyB0byBiZSBgZmFsc2VgLCB3aGlsZSBgc3RyaWN0VGVtcGxhdGVzYCBpcyBzZXQgdG8gYHRydWVgLlxuICAgKi9cbiAgZnVsbFRlbXBsYXRlVHlwZUNoZWNrPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBnZW5lcmF0ZSBhIGZsYXQgbW9kdWxlIGluZGV4IG9mIHRoZSBnaXZlbiBuYW1lIGFuZCB0aGUgY29ycmVzcG9uZGluZ1xuICAgKiBmbGF0IG1vZHVsZSBtZXRhZGF0YS4gVGhpcyBvcHRpb24gaXMgaW50ZW5kZWQgdG8gYmUgdXNlZCB3aGVuIGNyZWF0aW5nIGZsYXRcbiAgICogbW9kdWxlcyBzaW1pbGFyIHRvIGhvdyBgQGFuZ3VsYXIvY29yZWAgYW5kIGBAYW5ndWxhci9jb21tb25gIGFyZSBwYWNrYWdlZC5cbiAgICogV2hlbiB0aGlzIG9wdGlvbiBpcyB1c2VkIHRoZSBgcGFja2FnZS5qc29uYCBmb3IgdGhlIGxpYnJhcnkgc2hvdWxkIHJlZmVyIHRvIHRoZVxuICAgKiBnZW5lcmF0ZWQgZmxhdCBtb2R1bGUgaW5kZXggaW5zdGVhZCBvZiB0aGUgbGlicmFyeSBpbmRleCBmaWxlLiBXaGVuIHVzaW5nIHRoaXNcbiAgICogb3B0aW9uIG9ubHkgb25lIC5tZXRhZGF0YS5qc29uIGZpbGUgaXMgcHJvZHVjZWQgdGhhdCBjb250YWlucyBhbGwgdGhlIG1ldGFkYXRhXG4gICAqIG5lY2Vzc2FyeSBmb3Igc3ltYm9scyBleHBvcnRlZCBmcm9tIHRoZSBsaWJyYXJ5IGluZGV4LlxuICAgKiBJbiB0aGUgZ2VuZXJhdGVkIC5uZ2ZhY3RvcnkudHMgZmlsZXMgZmxhdCBtb2R1bGUgaW5kZXggaXMgdXNlZCB0byBpbXBvcnQgc3ltYm9sc1xuICAgKiBpbmNsdWRpbmcgYm90aCB0aGUgcHVibGljIEFQSSBmcm9tIHRoZSBsaWJyYXJ5IGluZGV4IGFzIHdlbGwgYXMgc2hyb3dkZWQgaW50ZXJuYWxcbiAgICogc3ltYm9scy5cbiAgICogQnkgZGVmYXVsdCB0aGUgLnRzIGZpbGUgc3VwcGxpZWQgaW4gdGhlIGBmaWxlc2AgZmllbGQgaXMgYXNzdW1lZCB0byBiZSB0aGVcbiAgICogbGlicmFyeSBpbmRleC4gSWYgbW9yZSB0aGFuIG9uZSBpcyBzcGVjaWZpZWQsIHVzZXMgYGxpYnJhcnlJbmRleGAgdG8gc2VsZWN0IHRoZVxuICAgKiBmaWxlIHRvIHVzZS4gSWYgbW9yZSB0aGFuIG9uZSAudHMgZmlsZSBpcyBzdXBwbGllZCBhbmQgbm8gYGxpYnJhcnlJbmRleGAgaXMgc3VwcGxpZWRcbiAgICogYW4gZXJyb3IgaXMgcHJvZHVjZWQuXG4gICAqIEEgZmxhdCBtb2R1bGUgaW5kZXggLmQudHMgYW5kIC5qcyB3aWxsIGJlIGNyZWF0ZWQgd2l0aCB0aGUgZ2l2ZW4gYGZsYXRNb2R1bGVPdXRGaWxlYFxuICAgKiBuYW1lIGluIHRoZSBzYW1lIGxvY2F0aW9uIGFzIHRoZSBsaWJyYXJ5IGluZGV4IC5kLnRzIGZpbGUgaXMgZW1pdHRlZC5cbiAgICogRm9yIGV4YW1wbGUsIGlmIGEgbGlicmFyeSB1c2VzIGBwdWJsaWNfYXBpLnRzYCBmaWxlIGFzIHRoZSBsaWJyYXJ5IGluZGV4IG9mIHRoZVxuICAgKiBtb2R1bGUgdGhlIGB0c2NvbmZpZy5qc29uYCBgZmlsZXNgIGZpZWxkIHdvdWxkIGJlIGBbXCJwdWJsaWNfYXBpLnRzXCJdYC4gVGhlXG4gICAqIGBmbGF0TW9kdWxlT3V0RmlsZWAgb3B0aW9ucyBjb3VsZCB0aGVuIGJlIHNldCB0bywgZm9yIGV4YW1wbGUgYFwiaW5kZXguanNcImAsIHdoaWNoXG4gICAqIHByb2R1Y2VzIGBpbmRleC5kLnRzYCBhbmQgIGBpbmRleC5tZXRhZGF0YS5qc29uYCBmaWxlcy4gVGhlIGxpYnJhcnknc1xuICAgKiBgcGFja2FnZS5qc29uYCdzIGBtb2R1bGVgIGZpZWxkIHdvdWxkIGJlIGBcImluZGV4LmpzXCJgIGFuZCB0aGUgYHR5cGluZ3NgIGZpZWxkIHdvdWxkXG4gICAqIGJlIGBcImluZGV4LmQudHNcImAuXG4gICAqL1xuICBmbGF0TW9kdWxlT3V0RmlsZT86IHN0cmluZztcblxuICAvKipcbiAgICogUHJlZmVycmVkIG1vZHVsZSBpZCB0byB1c2UgZm9yIGltcG9ydGluZyBmbGF0IG1vZHVsZS4gUmVmZXJlbmNlcyBnZW5lcmF0ZWQgYnkgYG5nY2BcbiAgICogd2lsbCB1c2UgdGhpcyBtb2R1bGUgbmFtZSB3aGVuIGltcG9ydGluZyBzeW1ib2xzIGZyb20gdGhlIGZsYXQgbW9kdWxlLiBUaGlzIGlzIG9ubHlcbiAgICogbWVhbmluZ2Z1bCB3aGVuIGBmbGF0TW9kdWxlT3V0RmlsZWAgaXMgYWxzbyBzdXBwbGllZC4gSXQgaXMgb3RoZXJ3aXNlIGlnbm9yZWQuXG4gICAqL1xuICBmbGF0TW9kdWxlSWQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEFsd2F5cyByZXBvcnQgZXJyb3JzIGEgcGFyYW1ldGVyIGlzIHN1cHBsaWVkIHdob3NlIGluamVjdGlvbiB0eXBlIGNhbm5vdFxuICAgKiBiZSBkZXRlcm1pbmVkLiBXaGVuIHRoaXMgdmFsdWUgb3B0aW9uIGlzIG5vdCBwcm92aWRlZCBvciBpcyBgZmFsc2VgLCBjb25zdHJ1Y3RvclxuICAgKiBwYXJhbWV0ZXJzIG9mIGNsYXNzZXMgbWFya2VkIHdpdGggYEBJbmplY3RhYmxlYCB3aG9zZSB0eXBlIGNhbm5vdCBiZSByZXNvbHZlZCB3aWxsXG4gICAqIHByb2R1Y2UgYSB3YXJuaW5nLiBXaXRoIHRoaXMgb3B0aW9uIGB0cnVlYCwgdGhleSBwcm9kdWNlIGFuIGVycm9yLiBXaGVuIHRoaXMgb3B0aW9uIGlzXG4gICAqIG5vdCBwcm92aWRlZCBpcyB0cmVhdGVkIGFzIGlmIGl0IHdlcmUgYGZhbHNlYC5cbiAgICovXG4gIHN0cmljdEluamVjdGlvblBhcmFtZXRlcnM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHJlbW92ZSBibGFuayB0ZXh0IG5vZGVzIGZyb20gY29tcGlsZWQgdGVtcGxhdGVzLiBJdCBpcyBgZmFsc2VgIGJ5IGRlZmF1bHQgc3RhcnRpbmdcbiAgICogZnJvbSBBbmd1bGFyIDYuXG4gICAqL1xuICBwcmVzZXJ2ZVdoaXRlc3BhY2VzPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBPcHRpb25zIHdoaWNoIHdlcmUgYWRkZWQgdG8gdGhlIEFuZ3VsYXIgSXZ5IGNvbXBpbGVyIHRvIHN1cHBvcnQgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgd2l0aFxuICogZXhpc3RpbmcgVmlldyBFbmdpbmUgYXBwbGljYXRpb25zLlxuICpcbiAqIFRoZXNlIGFyZSBleHBlY3RlZCB0byBiZSByZW1vdmVkIGF0IHNvbWUgcG9pbnQgaW4gdGhlIGZ1dHVyZS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjQ29tcGF0aWJpbGl0eU9wdGlvbnMge1xuICAvKipcbiAgICogQ29udHJvbHMgd2hldGhlciBuZ3RzYyB3aWxsIGVtaXQgYC5uZ2ZhY3RvcnkuanNgIHNoaW1zIGZvciBlYWNoIGNvbXBpbGVkIGAudHNgIGZpbGUuXG4gICAqXG4gICAqIFRoZXNlIHNoaW1zIHN1cHBvcnQgbGVnYWN5IGltcG9ydHMgZnJvbSBgbmdmYWN0b3J5YCBmaWxlcywgYnkgZXhwb3J0aW5nIGEgZmFjdG9yeSBzaGltXG4gICAqIGZvciBlYWNoIGNvbXBvbmVudCBvciBOZ01vZHVsZSBpbiB0aGUgb3JpZ2luYWwgYC50c2AgZmlsZS5cbiAgICovXG4gIGdlbmVyYXRlTmdGYWN0b3J5U2hpbXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBDb250cm9scyB3aGV0aGVyIG5ndHNjIHdpbGwgZW1pdCBgLm5nc3VtbWFyeS5qc2Agc2hpbXMgZm9yIGVhY2ggY29tcGlsZWQgYC50c2AgZmlsZS5cbiAgICpcbiAgICogVGhlc2Ugc2hpbXMgc3VwcG9ydCBsZWdhY3kgaW1wb3J0cyBmcm9tIGBuZ3N1bW1hcnlgIGZpbGVzLCBieSBleHBvcnRpbmcgYW4gZW1wdHkgb2JqZWN0XG4gICAqIGZvciBlYWNoIE5nTW9kdWxlIGluIHRoZSBvcmlnaW5hbCBgLnRzYCBmaWxlLiBUaGUgb25seSBwdXJwb3NlIG9mIHN1bW1hcmllcyBpcyB0byBmZWVkIHRoZW0gdG9cbiAgICogYFRlc3RCZWRgLCB3aGljaCBpcyBhIG5vLW9wIGluIEl2eS5cbiAgICovXG4gIGdlbmVyYXRlTmdTdW1tYXJ5U2hpbXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUZWxscyB0aGUgY29tcGlsZXIgdG8gZ2VuZXJhdGUgZGVmaW5pdGlvbnMgdXNpbmcgdGhlIFJlbmRlcjMgc3R5bGUgY29kZSBnZW5lcmF0aW9uLlxuICAgKiBUaGlzIG9wdGlvbiBkZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqXG4gICAqIEFjY2VwdGFibGUgdmFsdWVzIGFyZSBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgZmFsc2VgIC0gcnVuIG5nYyBub3JtYWxseVxuICAgKiBgdHJ1ZWAgLSBydW4gdGhlIG5ndHNjIGNvbXBpbGVyIGluc3RlYWQgb2YgdGhlIG5vcm1hbCBuZ2MgY29tcGlsZXJcbiAgICogYG5ndHNjYCAtIGFsaWFzIGZvciBgdHJ1ZWBcbiAgICovXG4gIGVuYWJsZUl2eT86IGJvb2xlYW58J25ndHNjJztcbn1cblxuLyoqXG4gKiBPcHRpb25zIHJlbGF0ZWQgdG8gdGVtcGxhdGUgdHlwZS1jaGVja2luZyBhbmQgaXRzIHN0cmljdG5lc3MuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN0cmljdFRlbXBsYXRlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBJZiBgdHJ1ZWAsIGltcGxpZXMgYWxsIHRlbXBsYXRlIHN0cmljdG5lc3MgZmxhZ3MgYmVsb3cgKHVubGVzcyBpbmRpdmlkdWFsbHkgZGlzYWJsZWQpLlxuICAgKlxuICAgKiBIYXMgbm8gZWZmZWN0IHVubGVzcyBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCBpcyBhbHNvIGVuYWJsZWQuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuXG4gICAqL1xuICBzdHJpY3RUZW1wbGF0ZXM/OiBib29sZWFuO1xuXG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY2hlY2sgdGhlIHR5cGUgb2YgYSBiaW5kaW5nIHRvIGEgZGlyZWN0aXZlL2NvbXBvbmVudCBpbnB1dCBhZ2FpbnN0IHRoZSB0eXBlIG9mIHRoZVxuICAgKiBmaWVsZCBvbiB0aGUgZGlyZWN0aXZlL2NvbXBvbmVudC5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGlmIHRoaXMgaXMgYGZhbHNlYCB0aGVuIHRoZSBleHByZXNzaW9uIGBbaW5wdXRdPVwiZXhwclwiYCB3aWxsIGhhdmUgYGV4cHJgIHR5cGUtXG4gICAqIGNoZWNrZWQsIGJ1dCBub3QgdGhlIGFzc2lnbm1lbnQgb2YgdGhlIHJlc3VsdGluZyB0eXBlIHRvIHRoZSBgaW5wdXRgIHByb3BlcnR5IG9mIHdoaWNoZXZlclxuICAgKiBkaXJlY3RpdmUgb3IgY29tcG9uZW50IGlzIHJlY2VpdmluZyB0aGUgYmluZGluZy4gSWYgc2V0IHRvIGB0cnVlYCwgYm90aCBzaWRlcyBvZiB0aGUgYXNzaWdubWVudFxuICAgKiBhcmUgY2hlY2tlZC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYCwgZXZlbiBpZiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIHNldC5cbiAgICovXG4gIHN0cmljdElucHV0VHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBzdHJpY3QgbnVsbCB0eXBlcyBmb3IgaW5wdXQgYmluZGluZ3MgZm9yIGRpcmVjdGl2ZXMuXG4gICAqXG4gICAqIElmIHRoaXMgaXMgYHRydWVgLCBhcHBsaWNhdGlvbnMgdGhhdCBhcmUgY29tcGlsZWQgd2l0aCBUeXBlU2NyaXB0J3MgYHN0cmljdE51bGxDaGVja3NgIGVuYWJsZWRcbiAgICogd2lsbCBwcm9kdWNlIHR5cGUgZXJyb3JzIGZvciBiaW5kaW5ncyB3aGljaCBjYW4gZXZhbHVhdGUgdG8gYHVuZGVmaW5lZGAgb3IgYG51bGxgIHdoZXJlIHRoZVxuICAgKiBpbnB1dHMncyB0eXBlIGRvZXMgbm90IGluY2x1ZGUgYHVuZGVmaW5lZGAgb3IgYG51bGxgIGluIGl0cyB0eXBlLiBJZiBzZXQgdG8gYGZhbHNlYCwgYWxsXG4gICAqIGJpbmRpbmcgZXhwcmVzc2lvbnMgYXJlIHdyYXBwZWQgaW4gYSBub24tbnVsbCBhc3NlcnRpb24gb3BlcmF0b3IgdG8gZWZmZWN0aXZlbHkgZGlzYWJsZSBzdHJpY3RcbiAgICogbnVsbCBjaGVja3MuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuIE5vdGUgdGhhdCBpZiBgc3RyaWN0SW5wdXRUeXBlc2AgaXNcbiAgICogbm90IHNldCwgb3Igc2V0IHRvIGBmYWxzZWAsIHRoaXMgZmxhZyBoYXMgbm8gZWZmZWN0LlxuICAgKi9cbiAgc3RyaWN0TnVsbElucHV0VHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNoZWNrIHRleHQgYXR0cmlidXRlcyB0aGF0IGhhcHBlbiB0byBiZSBjb25zdW1lZCBieSBhIGRpcmVjdGl2ZSBvciBjb21wb25lbnQuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBpbiBhIHRlbXBsYXRlIGNvbnRhaW5pbmcgYDxpbnB1dCBtYXRJbnB1dCBkaXNhYmxlZD5gIHRoZSBgZGlzYWJsZWRgIGF0dHJpYnV0ZSBlbmRzXG4gICAqIHVwIGJlaW5nIGNvbnN1bWVkIGFzIGFuIGlucHV0IHdpdGggdHlwZSBgYm9vbGVhbmAgYnkgdGhlIGBtYXRJbnB1dGAgZGlyZWN0aXZlLiBBdCBydW50aW1lLCB0aGVcbiAgICogaW5wdXQgd2lsbCBiZSBzZXQgdG8gdGhlIGF0dHJpYnV0ZSdzIHN0cmluZyB2YWx1ZSwgd2hpY2ggaXMgYW4gZW1wdHkgc3RyaW5nIGZvciBhdHRyaWJ1dGVzXG4gICAqIHdpdGhvdXQgYSB2YWx1ZSwgc28gd2l0aCB0aGlzIGZsYWcgc2V0IHRvIGB0cnVlYCwgYW4gZXJyb3Igd291bGQgYmUgcmVwb3J0ZWQuIElmIHNldCB0b1xuICAgKiBgZmFsc2VgLCB0ZXh0IGF0dHJpYnV0ZXMgd2lsbCBuZXZlciByZXBvcnQgYW4gZXJyb3IuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuIE5vdGUgdGhhdCBpZiBgc3RyaWN0SW5wdXRUeXBlc2AgaXNcbiAgICogbm90IHNldCwgb3Igc2V0IHRvIGBmYWxzZWAsIHRoaXMgZmxhZyBoYXMgbm8gZWZmZWN0LlxuICAgKi9cbiAgc3RyaWN0QXR0cmlidXRlVHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBhIHN0cmljdCB0eXBlIGZvciBudWxsLXNhZmUgbmF2aWdhdGlvbiBvcGVyYXRpb25zLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGBmYWxzZWAsIHRoZW4gdGhlIHJldHVybiB0eXBlIG9mIGBhPy5iYCBvciBgYT8oKWAgd2lsbCBiZSBgYW55YC4gSWYgc2V0IHRvIGB0cnVlYCxcbiAgICogdGhlbiB0aGUgcmV0dXJuIHR5cGUgb2YgYGE/LmJgIGZvciBleGFtcGxlIHdpbGwgYmUgdGhlIHNhbWUgYXMgdGhlIHR5cGUgb2YgdGhlIHRlcm5hcnlcbiAgICogZXhwcmVzc2lvbiBgYSAhPSBudWxsID8gYS5iIDogYWAuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuXG4gICAqL1xuICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBpbmZlciB0aGUgdHlwZSBvZiBsb2NhbCByZWZlcmVuY2VzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlIHR5cGUgb2YgYSBgI3JlZmAgdmFyaWFibGUgb24gYSBET00gbm9kZSBpbiB0aGUgdGVtcGxhdGUgd2lsbCBiZVxuICAgKiBkZXRlcm1pbmVkIGJ5IHRoZSB0eXBlIG9mIGBkb2N1bWVudC5jcmVhdGVFbGVtZW50YCBmb3IgdGhlIGdpdmVuIERPTSBub2RlLiBJZiBzZXQgdG8gYGZhbHNlYCxcbiAgICogdGhlIHR5cGUgb2YgYHJlZmAgZm9yIERPTSBub2RlcyB3aWxsIGJlIGBhbnlgLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgLCBldmVuIGlmIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgc2V0LlxuICAgKi9cbiAgc3RyaWN0RG9tTG9jYWxSZWZUeXBlcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW5mZXIgdGhlIHR5cGUgb2YgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIGluIGV2ZW50IGJpbmRpbmdzIGZvciBkaXJlY3RpdmUgb3V0cHV0cyBvclxuICAgKiBhbmltYXRpb24gZXZlbnRzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlIHR5cGUgb2YgYCRldmVudGAgd2lsbCBiZSBpbmZlcnJlZCBiYXNlZCBvbiB0aGUgZ2VuZXJpYyB0eXBlIG9mXG4gICAqIGBFdmVudEVtaXR0ZXJgL2BTdWJqZWN0YCBvZiB0aGUgb3V0cHV0LiBJZiBzZXQgdG8gYGZhbHNlYCwgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIHdpbGwgYmUgb2ZcbiAgICogdHlwZSBgYW55YC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYCwgZXZlbiBpZiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIHNldC5cbiAgICovXG4gIHN0cmljdE91dHB1dEV2ZW50VHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGluZmVyIHRoZSB0eXBlIG9mIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSBpbiBldmVudCBiaW5kaW5ncyB0byBET00gZXZlbnRzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlIHR5cGUgb2YgYCRldmVudGAgd2lsbCBiZSBpbmZlcnJlZCBiYXNlZCBvbiBUeXBlU2NyaXB0J3NcbiAgICogYEhUTUxFbGVtZW50RXZlbnRNYXBgLCB3aXRoIGEgZmFsbGJhY2sgdG8gdGhlIG5hdGl2ZSBgRXZlbnRgIHR5cGUuIElmIHNldCB0byBgZmFsc2VgLCB0aGVcbiAgICogYCRldmVudGAgdmFyaWFibGUgd2lsbCBiZSBvZiB0eXBlIGBhbnlgLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgLCBldmVuIGlmIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgc2V0LlxuICAgKi9cbiAgc3RyaWN0RG9tRXZlbnRUeXBlcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW5jbHVkZSB0aGUgZ2VuZXJpYyB0eXBlIG9mIGNvbXBvbmVudHMgd2hlbiB0eXBlLWNoZWNraW5nIHRoZSB0ZW1wbGF0ZS5cbiAgICpcbiAgICogSWYgbm8gY29tcG9uZW50IGhhcyBnZW5lcmljIHR5cGUgcGFyYW1ldGVycywgdGhpcyBzZXR0aW5nIGhhcyBubyBlZmZlY3QuXG4gICAqXG4gICAqIElmIGEgY29tcG9uZW50IGhhcyBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBhbmQgdGhpcyBzZXR0aW5nIGlzIGB0cnVlYCwgdGhvc2UgZ2VuZXJpYyBwYXJhbWV0ZXJzXG4gICAqIHdpbGwgYmUgaW5jbHVkZWQgaW4gdGhlIGNvbnRleHQgdHlwZSBmb3IgdGhlIHRlbXBsYXRlLiBJZiBgZmFsc2VgLCBhbnkgZ2VuZXJpYyBwYXJhbWV0ZXJzIHdpbGxcbiAgICogYmUgc2V0IHRvIGBhbnlgIGluIHRoZSB0ZW1wbGF0ZSBjb250ZXh0IHR5cGUuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuXG4gICAqL1xuICBzdHJpY3RDb250ZXh0R2VuZXJpY3M/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG9iamVjdCBvciBhcnJheSBsaXRlcmFscyBkZWZpbmVkIGluIHRlbXBsYXRlcyB1c2UgdGhlaXIgaW5mZXJyZWQgdHlwZSwgb3IgYXJlXG4gICAqIGludGVycHJldGVkIGFzIGBhbnlgLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgIHVubGVzcyBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCBvciBgc3RyaWN0VGVtcGxhdGVzYCBhcmUgc2V0LlxuICAgKi9cbiAgc3RyaWN0TGl0ZXJhbFR5cGVzPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBPcHRpb25zIHdoaWNoIGNvbnRyb2wgYmVoYXZpb3IgdXNlZnVsIGZvciBcIm1vbm9yZXBvXCIgYnVpbGQgY2FzZXMgdXNpbmcgQmF6ZWwgKHN1Y2ggYXMgdGhlXG4gKiBpbnRlcm5hbCBHb29nbGUgbW9ub3JlcG8sIGczKS5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQmF6ZWxBbmRHM09wdGlvbnMge1xuICAvKipcbiAgICogRW5hYmxlcyB0aGUgZ2VuZXJhdGlvbiBvZiBhbGlhcyByZS1leHBvcnRzIG9mIGRpcmVjdGl2ZXMvcGlwZXMgdGhhdCBhcmUgdmlzaWJsZSBmcm9tIGFuXG4gICAqIE5nTW9kdWxlIGZyb20gdGhhdCBOZ01vZHVsZSdzIGZpbGUuXG4gICAqXG4gICAqIFRoaXMgb3B0aW9uIHNob3VsZCBiZSBkaXNhYmxlZCBmb3IgYXBwbGljYXRpb24gYnVpbGRzIG9yIGZvciBBbmd1bGFyIFBhY2thZ2UgRm9ybWF0IGxpYnJhcmllc1xuICAgKiAod2hlcmUgTmdNb2R1bGVzIGFsb25nIHdpdGggdGhlaXIgZGlyZWN0aXZlcy9waXBlcyBhcmUgZXhwb3J0ZWQgdmlhIGEgc2luZ2xlIGVudHJ5cG9pbnQpLlxuICAgKlxuICAgKiBGb3Igb3RoZXIgbGlicmFyeSBjb21waWxhdGlvbnMgd2hpY2ggYXJlIGludGVuZGVkIHRvIGJlIHBhdGgtbWFwcGVkIGludG8gYW4gYXBwbGljYXRpb24gYnVpbGRcbiAgICogKG9yIGFub3RoZXIgbGlicmFyeSksIGVuYWJsaW5nIHRoaXMgb3B0aW9uIGVuYWJsZXMgdGhlIHJlc3VsdGluZyBkZWVwIGltcG9ydHMgdG8gd29ya1xuICAgKiBjb3JyZWN0bHkuXG4gICAqXG4gICAqIEEgY29uc3VtZXIgb2Ygc3VjaCBhIHBhdGgtbWFwcGVkIGxpYnJhcnkgd2lsbCB3cml0ZSBhbiBpbXBvcnQgbGlrZTpcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBpbXBvcnQge0xpYk1vZHVsZX0gZnJvbSAnbGliL2RlZXAvcGF0aC90by9tb2R1bGUnO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGNvbXBpbGVyIHdpbGwgYXR0ZW1wdCB0byBnZW5lcmF0ZSBpbXBvcnRzIG9mIGRpcmVjdGl2ZXMvcGlwZXMgZnJvbSB0aGF0IHNhbWUgbW9kdWxlXG4gICAqIHNwZWNpZmllciAodGhlIGNvbXBpbGVyIGRvZXMgbm90IHJld3JpdGUgdGhlIHVzZXIncyBnaXZlbiBpbXBvcnQgcGF0aCwgdW5saWtlIFZpZXcgRW5naW5lKS5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBpbXBvcnQge0xpYkRpciwgTGliQ21wLCBMaWJQaXBlfSBmcm9tICdsaWIvZGVlcC9wYXRoL3RvL21vZHVsZSc7XG4gICAqIGBgYFxuICAgKlxuICAgKiBJdCB3b3VsZCBiZSBidXJkZW5zb21lIGZvciB1c2VycyB0byBoYXZlIHRvIHJlLWV4cG9ydCBhbGwgZGlyZWN0aXZlcy9waXBlcyBhbG9uZ3NpZGUgZWFjaFxuICAgKiBOZ01vZHVsZSB0byBzdXBwb3J0IHRoaXMgaW1wb3J0IG1vZGVsLiBFbmFibGluZyB0aGlzIG9wdGlvbiB0ZWxscyB0aGUgY29tcGlsZXIgdG8gZ2VuZXJhdGVcbiAgICogcHJpdmF0ZSByZS1leHBvcnRzIGFsb25nc2lkZSB0aGUgTmdNb2R1bGUgb2YgYWxsIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGl0IG1ha2VzIGF2YWlsYWJsZSwgdG9cbiAgICogc3VwcG9ydCB0aGVzZSBmdXR1cmUgaW1wb3J0cy5cbiAgICovXG4gIGdlbmVyYXRlRGVlcFJlZXhwb3J0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEluc2VydCBKU0RvYyB0eXBlIGFubm90YXRpb25zIG5lZWRlZCBieSBDbG9zdXJlIENvbXBpbGVyXG4gICAqL1xuICBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcj86IGJvb2xlYW47XG59XG5cbi8qKlxuICogT3B0aW9ucyByZWxhdGVkIHRvIGkxOG4gY29tcGlsYXRpb24gc3VwcG9ydC5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSTE4bk9wdGlvbnMge1xuICAvKipcbiAgICogTG9jYWxlIG9mIHRoZSBpbXBvcnRlZCB0cmFuc2xhdGlvbnNcbiAgICovXG4gIGkxOG5JbkxvY2FsZT86IHN0cmluZztcblxuICAvKipcbiAgICogUmVuZGVyIGAkbG9jYWxpemVgIG1lc3NhZ2VzIHdpdGggbGVnYWN5IGZvcm1hdCBpZHMuXG4gICAqXG4gICAqIFRoaXMgaXMgb25seSBhY3RpdmUgaWYgd2UgYXJlIGJ1aWxkaW5nIHdpdGggYGVuYWJsZUl2eTogdHJ1ZWAuXG4gICAqIFRoZSBkZWZhdWx0IHZhbHVlIGZvciBub3cgaXMgYHRydWVgLlxuICAgKlxuICAgKiBVc2UgdGhpcyBvcHRpb24gd2hlbiB1c2UgYXJlIHVzaW5nIHRoZSBgJGxvY2FsaXplYCBiYXNlZCBsb2NhbGl6YXRpb24gbWVzc2FnZXMgYnV0XG4gICAqIGhhdmUgbm90IG1pZ3JhdGVkIHRoZSB0cmFuc2xhdGlvbiBmaWxlcyB0byB1c2UgdGhlIG5ldyBgJGxvY2FsaXplYCBtZXNzYWdlIGlkIGZvcm1hdC5cbiAgICovXG4gIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRyYW5zbGF0aW9uIHZhcmlhYmxlIG5hbWUgc2hvdWxkIGNvbnRhaW4gZXh0ZXJuYWwgbWVzc2FnZSBpZFxuICAgKiAodXNlZCBieSBDbG9zdXJlIENvbXBpbGVyJ3Mgb3V0cHV0IG9mIGBnb29nLmdldE1zZ2AgZm9yIHRyYW5zaXRpb24gcGVyaW9kKVxuICAgKi9cbiAgaTE4blVzZUV4dGVybmFsSWRzPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBNaXNjZWxsYW5lb3VzIG9wdGlvbnMgdGhhdCBkb24ndCBmYWxsIGludG8gYW55IG90aGVyIGNhdGVnb3J5XG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1pc2NPcHRpb25zIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGNvbXBpbGVyIHNob3VsZCBhdm9pZCBnZW5lcmF0aW5nIGNvZGUgZm9yIGNsYXNzZXMgdGhhdCBoYXZlbid0IGJlZW4gZXhwb3J0ZWQuXG4gICAqIFRoaXMgaXMgb25seSBhY3RpdmUgd2hlbiBidWlsZGluZyB3aXRoIGBlbmFibGVJdnk6IHRydWVgLiBEZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqL1xuICBjb21waWxlTm9uRXhwb3J0ZWRDbGFzc2VzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRGlzYWJsZSBUeXBlU2NyaXB0IFZlcnNpb24gQ2hlY2suXG4gICAqL1xuICBkaXNhYmxlVHlwZVNjcmlwdFZlcnNpb25DaGVjaz86IGJvb2xlYW47XG59Il19