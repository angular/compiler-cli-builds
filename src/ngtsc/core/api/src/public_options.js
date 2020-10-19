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
        define("@angular/compiler-cli/src/ngtsc/core/api/src/public_options", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVibGljX29wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2NvcmUvYXBpL3NyYy9wdWJsaWNfb3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLyoqXG4gKiBPcHRpb25zIHN1cHBvcnRlZCBieSB0aGUgbGVnYWN5IFZpZXcgRW5naW5lIGNvbXBpbGVyLCB3aGljaCBhcmUgc3RpbGwgY29uc3VtZWQgYnkgdGhlIEFuZ3VsYXIgSXZ5XG4gKiBjb21waWxlciBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gKlxuICogVGhlc2UgYXJlIGV4cGVjdGVkIHRvIGJlIHJlbW92ZWQgYXQgc29tZSBwb2ludCBpbiB0aGUgZnV0dXJlLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMZWdhY3lOZ2NPcHRpb25zIHtcbiAgLyoqIGdlbmVyYXRlIGFsbCBwb3NzaWJsZSBnZW5lcmF0ZWQgZmlsZXMgICovXG4gIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHR5cGUgY2hlY2sgdGhlIGVudGlyZSB0ZW1wbGF0ZS5cbiAgICpcbiAgICogVGhpcyBmbGFnIGN1cnJlbnRseSBjb250cm9scyBhIGNvdXBsZSBhc3BlY3RzIG9mIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcsIGluY2x1ZGluZ1xuICAgKiB3aGV0aGVyIGVtYmVkZGVkIHZpZXdzIGFyZSBjaGVja2VkLlxuICAgKlxuICAgKiBGb3IgbWF4aW11bSB0eXBlLWNoZWNraW5nLCBzZXQgdGhpcyB0byBgdHJ1ZWAsIGFuZCBzZXQgYHN0cmljdFRlbXBsYXRlc2AgdG8gYHRydWVgLlxuICAgKlxuICAgKiBJdCBpcyBhbiBlcnJvciBmb3IgdGhpcyBmbGFnIHRvIGJlIGBmYWxzZWAsIHdoaWxlIGBzdHJpY3RUZW1wbGF0ZXNgIGlzIHNldCB0byBgdHJ1ZWAuXG4gICAqL1xuICBmdWxsVGVtcGxhdGVUeXBlQ2hlY2s/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGdlbmVyYXRlIGEgZmxhdCBtb2R1bGUgaW5kZXggb2YgdGhlIGdpdmVuIG5hbWUgYW5kIHRoZSBjb3JyZXNwb25kaW5nXG4gICAqIGZsYXQgbW9kdWxlIG1ldGFkYXRhLiBUaGlzIG9wdGlvbiBpcyBpbnRlbmRlZCB0byBiZSB1c2VkIHdoZW4gY3JlYXRpbmcgZmxhdFxuICAgKiBtb2R1bGVzIHNpbWlsYXIgdG8gaG93IGBAYW5ndWxhci9jb3JlYCBhbmQgYEBhbmd1bGFyL2NvbW1vbmAgYXJlIHBhY2thZ2VkLlxuICAgKiBXaGVuIHRoaXMgb3B0aW9uIGlzIHVzZWQgdGhlIGBwYWNrYWdlLmpzb25gIGZvciB0aGUgbGlicmFyeSBzaG91bGQgcmVmZXIgdG8gdGhlXG4gICAqIGdlbmVyYXRlZCBmbGF0IG1vZHVsZSBpbmRleCBpbnN0ZWFkIG9mIHRoZSBsaWJyYXJ5IGluZGV4IGZpbGUuIFdoZW4gdXNpbmcgdGhpc1xuICAgKiBvcHRpb24gb25seSBvbmUgLm1ldGFkYXRhLmpzb24gZmlsZSBpcyBwcm9kdWNlZCB0aGF0IGNvbnRhaW5zIGFsbCB0aGUgbWV0YWRhdGFcbiAgICogbmVjZXNzYXJ5IGZvciBzeW1ib2xzIGV4cG9ydGVkIGZyb20gdGhlIGxpYnJhcnkgaW5kZXguXG4gICAqIEluIHRoZSBnZW5lcmF0ZWQgLm5nZmFjdG9yeS50cyBmaWxlcyBmbGF0IG1vZHVsZSBpbmRleCBpcyB1c2VkIHRvIGltcG9ydCBzeW1ib2xzXG4gICAqIGluY2x1ZGluZyBib3RoIHRoZSBwdWJsaWMgQVBJIGZyb20gdGhlIGxpYnJhcnkgaW5kZXggYXMgd2VsbCBhcyBzaHJvd2RlZCBpbnRlcm5hbFxuICAgKiBzeW1ib2xzLlxuICAgKiBCeSBkZWZhdWx0IHRoZSAudHMgZmlsZSBzdXBwbGllZCBpbiB0aGUgYGZpbGVzYCBmaWVsZCBpcyBhc3N1bWVkIHRvIGJlIHRoZVxuICAgKiBsaWJyYXJ5IGluZGV4LiBJZiBtb3JlIHRoYW4gb25lIGlzIHNwZWNpZmllZCwgdXNlcyBgbGlicmFyeUluZGV4YCB0byBzZWxlY3QgdGhlXG4gICAqIGZpbGUgdG8gdXNlLiBJZiBtb3JlIHRoYW4gb25lIC50cyBmaWxlIGlzIHN1cHBsaWVkIGFuZCBubyBgbGlicmFyeUluZGV4YCBpcyBzdXBwbGllZFxuICAgKiBhbiBlcnJvciBpcyBwcm9kdWNlZC5cbiAgICogQSBmbGF0IG1vZHVsZSBpbmRleCAuZC50cyBhbmQgLmpzIHdpbGwgYmUgY3JlYXRlZCB3aXRoIHRoZSBnaXZlbiBgZmxhdE1vZHVsZU91dEZpbGVgXG4gICAqIG5hbWUgaW4gdGhlIHNhbWUgbG9jYXRpb24gYXMgdGhlIGxpYnJhcnkgaW5kZXggLmQudHMgZmlsZSBpcyBlbWl0dGVkLlxuICAgKiBGb3IgZXhhbXBsZSwgaWYgYSBsaWJyYXJ5IHVzZXMgYHB1YmxpY19hcGkudHNgIGZpbGUgYXMgdGhlIGxpYnJhcnkgaW5kZXggb2YgdGhlXG4gICAqIG1vZHVsZSB0aGUgYHRzY29uZmlnLmpzb25gIGBmaWxlc2AgZmllbGQgd291bGQgYmUgYFtcInB1YmxpY19hcGkudHNcIl1gLiBUaGVcbiAgICogYGZsYXRNb2R1bGVPdXRGaWxlYCBvcHRpb25zIGNvdWxkIHRoZW4gYmUgc2V0IHRvLCBmb3IgZXhhbXBsZSBgXCJpbmRleC5qc1wiYCwgd2hpY2hcbiAgICogcHJvZHVjZXMgYGluZGV4LmQudHNgIGFuZCAgYGluZGV4Lm1ldGFkYXRhLmpzb25gIGZpbGVzLiBUaGUgbGlicmFyeSdzXG4gICAqIGBwYWNrYWdlLmpzb25gJ3MgYG1vZHVsZWAgZmllbGQgd291bGQgYmUgYFwiaW5kZXguanNcImAgYW5kIHRoZSBgdHlwaW5nc2AgZmllbGQgd291bGRcbiAgICogYmUgYFwiaW5kZXguZC50c1wiYC5cbiAgICovXG4gIGZsYXRNb2R1bGVPdXRGaWxlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQcmVmZXJyZWQgbW9kdWxlIGlkIHRvIHVzZSBmb3IgaW1wb3J0aW5nIGZsYXQgbW9kdWxlLiBSZWZlcmVuY2VzIGdlbmVyYXRlZCBieSBgbmdjYFxuICAgKiB3aWxsIHVzZSB0aGlzIG1vZHVsZSBuYW1lIHdoZW4gaW1wb3J0aW5nIHN5bWJvbHMgZnJvbSB0aGUgZmxhdCBtb2R1bGUuIFRoaXMgaXMgb25seVxuICAgKiBtZWFuaW5nZnVsIHdoZW4gYGZsYXRNb2R1bGVPdXRGaWxlYCBpcyBhbHNvIHN1cHBsaWVkLiBJdCBpcyBvdGhlcndpc2UgaWdub3JlZC5cbiAgICovXG4gIGZsYXRNb2R1bGVJZD86IHN0cmluZztcblxuICAvKipcbiAgICogQWx3YXlzIHJlcG9ydCBlcnJvcnMgYSBwYXJhbWV0ZXIgaXMgc3VwcGxpZWQgd2hvc2UgaW5qZWN0aW9uIHR5cGUgY2Fubm90XG4gICAqIGJlIGRldGVybWluZWQuIFdoZW4gdGhpcyB2YWx1ZSBvcHRpb24gaXMgbm90IHByb3ZpZGVkIG9yIGlzIGBmYWxzZWAsIGNvbnN0cnVjdG9yXG4gICAqIHBhcmFtZXRlcnMgb2YgY2xhc3NlcyBtYXJrZWQgd2l0aCBgQEluamVjdGFibGVgIHdob3NlIHR5cGUgY2Fubm90IGJlIHJlc29sdmVkIHdpbGxcbiAgICogcHJvZHVjZSBhIHdhcm5pbmcuIFdpdGggdGhpcyBvcHRpb24gYHRydWVgLCB0aGV5IHByb2R1Y2UgYW4gZXJyb3IuIFdoZW4gdGhpcyBvcHRpb24gaXNcbiAgICogbm90IHByb3ZpZGVkIGlzIHRyZWF0ZWQgYXMgaWYgaXQgd2VyZSBgZmFsc2VgLlxuICAgKi9cbiAgc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcmVtb3ZlIGJsYW5rIHRleHQgbm9kZXMgZnJvbSBjb21waWxlZCB0ZW1wbGF0ZXMuIEl0IGlzIGBmYWxzZWAgYnkgZGVmYXVsdCBzdGFydGluZ1xuICAgKiBmcm9tIEFuZ3VsYXIgNi5cbiAgICovXG4gIHByZXNlcnZlV2hpdGVzcGFjZXM/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgd2hpY2ggd2VyZSBhZGRlZCB0byB0aGUgQW5ndWxhciBJdnkgY29tcGlsZXIgdG8gc3VwcG9ydCBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSB3aXRoXG4gKiBleGlzdGluZyBWaWV3IEVuZ2luZSBhcHBsaWNhdGlvbnMuXG4gKlxuICogVGhlc2UgYXJlIGV4cGVjdGVkIHRvIGJlIHJlbW92ZWQgYXQgc29tZSBwb2ludCBpbiB0aGUgZnV0dXJlLlxuICpcbiAqIEBwdWJsaWNBcGlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NDb21wYXRpYmlsaXR5T3B0aW9ucyB7XG4gIC8qKlxuICAgKiBDb250cm9scyB3aGV0aGVyIG5ndHNjIHdpbGwgZW1pdCBgLm5nZmFjdG9yeS5qc2Agc2hpbXMgZm9yIGVhY2ggY29tcGlsZWQgYC50c2AgZmlsZS5cbiAgICpcbiAgICogVGhlc2Ugc2hpbXMgc3VwcG9ydCBsZWdhY3kgaW1wb3J0cyBmcm9tIGBuZ2ZhY3RvcnlgIGZpbGVzLCBieSBleHBvcnRpbmcgYSBmYWN0b3J5IHNoaW1cbiAgICogZm9yIGVhY2ggY29tcG9uZW50IG9yIE5nTW9kdWxlIGluIHRoZSBvcmlnaW5hbCBgLnRzYCBmaWxlLlxuICAgKi9cbiAgZ2VuZXJhdGVOZ0ZhY3RvcnlTaGltcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIENvbnRyb2xzIHdoZXRoZXIgbmd0c2Mgd2lsbCBlbWl0IGAubmdzdW1tYXJ5LmpzYCBzaGltcyBmb3IgZWFjaCBjb21waWxlZCBgLnRzYCBmaWxlLlxuICAgKlxuICAgKiBUaGVzZSBzaGltcyBzdXBwb3J0IGxlZ2FjeSBpbXBvcnRzIGZyb20gYG5nc3VtbWFyeWAgZmlsZXMsIGJ5IGV4cG9ydGluZyBhbiBlbXB0eSBvYmplY3RcbiAgICogZm9yIGVhY2ggTmdNb2R1bGUgaW4gdGhlIG9yaWdpbmFsIGAudHNgIGZpbGUuIFRoZSBvbmx5IHB1cnBvc2Ugb2Ygc3VtbWFyaWVzIGlzIHRvIGZlZWQgdGhlbSB0b1xuICAgKiBgVGVzdEJlZGAsIHdoaWNoIGlzIGEgbm8tb3AgaW4gSXZ5LlxuICAgKi9cbiAgZ2VuZXJhdGVOZ1N1bW1hcnlTaGltcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRlbGxzIHRoZSBjb21waWxlciB0byBnZW5lcmF0ZSBkZWZpbml0aW9ucyB1c2luZyB0aGUgUmVuZGVyMyBzdHlsZSBjb2RlIGdlbmVyYXRpb24uXG4gICAqIFRoaXMgb3B0aW9uIGRlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICpcbiAgICogQWNjZXB0YWJsZSB2YWx1ZXMgYXJlIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBmYWxzZWAgLSBydW4gbmdjIG5vcm1hbGx5XG4gICAqIGB0cnVlYCAtIHJ1biB0aGUgbmd0c2MgY29tcGlsZXIgaW5zdGVhZCBvZiB0aGUgbm9ybWFsIG5nYyBjb21waWxlclxuICAgKiBgbmd0c2NgIC0gYWxpYXMgZm9yIGB0cnVlYFxuICAgKi9cbiAgZW5hYmxlSXZ5PzogYm9vbGVhbnwnbmd0c2MnO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgcmVsYXRlZCB0byB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGFuZCBpdHMgc3RyaWN0bmVzcy5cbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3RyaWN0VGVtcGxhdGVPcHRpb25zIHtcbiAgLyoqXG4gICAqIElmIGB0cnVlYCwgaW1wbGllcyBhbGwgdGVtcGxhdGUgc3RyaWN0bmVzcyBmbGFncyBiZWxvdyAodW5sZXNzIGluZGl2aWR1YWxseSBkaXNhYmxlZCkuXG4gICAqXG4gICAqIEhhcyBubyBlZmZlY3QgdW5sZXNzIGBmdWxsVGVtcGxhdGVUeXBlQ2hlY2tgIGlzIGFsc28gZW5hYmxlZC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYCwgZXZlbiBpZiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIHNldC5cbiAgICovXG4gIHN0cmljdFRlbXBsYXRlcz86IGJvb2xlYW47XG5cblxuICAvKipcbiAgICogV2hldGhlciB0byBjaGVjayB0aGUgdHlwZSBvZiBhIGJpbmRpbmcgdG8gYSBkaXJlY3RpdmUvY29tcG9uZW50IGlucHV0IGFnYWluc3QgdGhlIHR5cGUgb2YgdGhlXG4gICAqIGZpZWxkIG9uIHRoZSBkaXJlY3RpdmUvY29tcG9uZW50LlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSwgaWYgdGhpcyBpcyBgZmFsc2VgIHRoZW4gdGhlIGV4cHJlc3Npb24gYFtpbnB1dF09XCJleHByXCJgIHdpbGwgaGF2ZSBgZXhwcmAgdHlwZS1cbiAgICogY2hlY2tlZCwgYnV0IG5vdCB0aGUgYXNzaWdubWVudCBvZiB0aGUgcmVzdWx0aW5nIHR5cGUgdG8gdGhlIGBpbnB1dGAgcHJvcGVydHkgb2Ygd2hpY2hldmVyXG4gICAqIGRpcmVjdGl2ZSBvciBjb21wb25lbnQgaXMgcmVjZWl2aW5nIHRoZSBiaW5kaW5nLiBJZiBzZXQgdG8gYHRydWVgLCBib3RoIHNpZGVzIG9mIHRoZSBhc3NpZ25tZW50XG4gICAqIGFyZSBjaGVja2VkLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgLCBldmVuIGlmIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgc2V0LlxuICAgKi9cbiAgc3RyaWN0SW5wdXRUeXBlcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY2hlY2sgaWYgdGhlIGlucHV0IGJpbmRpbmcgYXR0ZW1wdHMgdG8gYXNzaWduIHRvIGEgcmVzdHJpY3RlZCBmaWVsZCAocmVhZG9ubHksXG4gICAqIHByaXZhdGUsIG9yIHByb3RlY3RlZCkgb24gdGhlIGRpcmVjdGl2ZS9jb21wb25lbnQuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiwgXCJzdHJpY3RUZW1wbGF0ZXNcIiBhbmQvb3JcbiAgICogXCJzdHJpY3RJbnB1dFR5cGVzXCIgaXMgc2V0LiBOb3RlIHRoYXQgaWYgYHN0cmljdElucHV0VHlwZXNgIGlzIG5vdCBzZXQsIG9yIHNldCB0byBgZmFsc2VgLCB0aGlzXG4gICAqIGZsYWcgaGFzIG5vIGVmZmVjdC5cbiAgICpcbiAgICogVHJhY2tpbmcgaXNzdWUgZm9yIGVuYWJsaW5nIHRoaXMgYnkgZGVmYXVsdDogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci9pc3N1ZXMvMzg0MDBcbiAgICovXG4gIHN0cmljdElucHV0QWNjZXNzTW9kaWZpZXJzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byB1c2Ugc3RyaWN0IG51bGwgdHlwZXMgZm9yIGlucHV0IGJpbmRpbmdzIGZvciBkaXJlY3RpdmVzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgYXBwbGljYXRpb25zIHRoYXQgYXJlIGNvbXBpbGVkIHdpdGggVHlwZVNjcmlwdCdzIGBzdHJpY3ROdWxsQ2hlY2tzYCBlbmFibGVkXG4gICAqIHdpbGwgcHJvZHVjZSB0eXBlIGVycm9ycyBmb3IgYmluZGluZ3Mgd2hpY2ggY2FuIGV2YWx1YXRlIHRvIGB1bmRlZmluZWRgIG9yIGBudWxsYCB3aGVyZSB0aGVcbiAgICogaW5wdXRzJ3MgdHlwZSBkb2VzIG5vdCBpbmNsdWRlIGB1bmRlZmluZWRgIG9yIGBudWxsYCBpbiBpdHMgdHlwZS4gSWYgc2V0IHRvIGBmYWxzZWAsIGFsbFxuICAgKiBiaW5kaW5nIGV4cHJlc3Npb25zIGFyZSB3cmFwcGVkIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uIG9wZXJhdG9yIHRvIGVmZmVjdGl2ZWx5IGRpc2FibGUgc3RyaWN0XG4gICAqIG51bGwgY2hlY2tzLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgLCBldmVuIGlmIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgc2V0LiBOb3RlIHRoYXQgaWYgYHN0cmljdElucHV0VHlwZXNgIGlzXG4gICAqIG5vdCBzZXQsIG9yIHNldCB0byBgZmFsc2VgLCB0aGlzIGZsYWcgaGFzIG5vIGVmZmVjdC5cbiAgICovXG4gIHN0cmljdE51bGxJbnB1dFR5cGVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBjaGVjayB0ZXh0IGF0dHJpYnV0ZXMgdGhhdCBoYXBwZW4gdG8gYmUgY29uc3VtZWQgYnkgYSBkaXJlY3RpdmUgb3IgY29tcG9uZW50LlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSwgaW4gYSB0ZW1wbGF0ZSBjb250YWluaW5nIGA8aW5wdXQgbWF0SW5wdXQgZGlzYWJsZWQ+YCB0aGUgYGRpc2FibGVkYCBhdHRyaWJ1dGUgZW5kc1xuICAgKiB1cCBiZWluZyBjb25zdW1lZCBhcyBhbiBpbnB1dCB3aXRoIHR5cGUgYGJvb2xlYW5gIGJ5IHRoZSBgbWF0SW5wdXRgIGRpcmVjdGl2ZS4gQXQgcnVudGltZSwgdGhlXG4gICAqIGlucHV0IHdpbGwgYmUgc2V0IHRvIHRoZSBhdHRyaWJ1dGUncyBzdHJpbmcgdmFsdWUsIHdoaWNoIGlzIGFuIGVtcHR5IHN0cmluZyBmb3IgYXR0cmlidXRlc1xuICAgKiB3aXRob3V0IGEgdmFsdWUsIHNvIHdpdGggdGhpcyBmbGFnIHNldCB0byBgdHJ1ZWAsIGFuIGVycm9yIHdvdWxkIGJlIHJlcG9ydGVkLiBJZiBzZXQgdG9cbiAgICogYGZhbHNlYCwgdGV4dCBhdHRyaWJ1dGVzIHdpbGwgbmV2ZXIgcmVwb3J0IGFuIGVycm9yLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgLCBldmVuIGlmIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgc2V0LiBOb3RlIHRoYXQgaWYgYHN0cmljdElucHV0VHlwZXNgIGlzXG4gICAqIG5vdCBzZXQsIG9yIHNldCB0byBgZmFsc2VgLCB0aGlzIGZsYWcgaGFzIG5vIGVmZmVjdC5cbiAgICovXG4gIHN0cmljdEF0dHJpYnV0ZVR5cGVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byB1c2UgYSBzdHJpY3QgdHlwZSBmb3IgbnVsbC1zYWZlIG5hdmlnYXRpb24gb3BlcmF0aW9ucy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgZmFsc2VgLCB0aGVuIHRoZSByZXR1cm4gdHlwZSBvZiBgYT8uYmAgb3IgYGE/KClgIHdpbGwgYmUgYGFueWAuIElmIHNldCB0byBgdHJ1ZWAsXG4gICAqIHRoZW4gdGhlIHJldHVybiB0eXBlIG9mIGBhPy5iYCBmb3IgZXhhbXBsZSB3aWxsIGJlIHRoZSBzYW1lIGFzIHRoZSB0eXBlIG9mIHRoZSB0ZXJuYXJ5XG4gICAqIGV4cHJlc3Npb24gYGEgIT0gbnVsbCA/IGEuYiA6IGFgLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgLCBldmVuIGlmIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgc2V0LlxuICAgKi9cbiAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW5mZXIgdGhlIHR5cGUgb2YgbG9jYWwgcmVmZXJlbmNlcy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZSB0eXBlIG9mIGEgYCNyZWZgIHZhcmlhYmxlIG9uIGEgRE9NIG5vZGUgaW4gdGhlIHRlbXBsYXRlIHdpbGwgYmVcbiAgICogZGV0ZXJtaW5lZCBieSB0aGUgdHlwZSBvZiBgZG9jdW1lbnQuY3JlYXRlRWxlbWVudGAgZm9yIHRoZSBnaXZlbiBET00gbm9kZS4gSWYgc2V0IHRvIGBmYWxzZWAsXG4gICAqIHRoZSB0eXBlIG9mIGByZWZgIGZvciBET00gbm9kZXMgd2lsbCBiZSBgYW55YC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYCwgZXZlbiBpZiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIHNldC5cbiAgICovXG4gIHN0cmljdERvbUxvY2FsUmVmVHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGluZmVyIHRoZSB0eXBlIG9mIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSBpbiBldmVudCBiaW5kaW5ncyBmb3IgZGlyZWN0aXZlIG91dHB1dHMgb3JcbiAgICogYW5pbWF0aW9uIGV2ZW50cy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZSB0eXBlIG9mIGAkZXZlbnRgIHdpbGwgYmUgaW5mZXJyZWQgYmFzZWQgb24gdGhlIGdlbmVyaWMgdHlwZSBvZlxuICAgKiBgRXZlbnRFbWl0dGVyYC9gU3ViamVjdGAgb2YgdGhlIG91dHB1dC4gSWYgc2V0IHRvIGBmYWxzZWAsIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSB3aWxsIGJlIG9mXG4gICAqIHR5cGUgYGFueWAuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuXG4gICAqL1xuICBzdHJpY3RPdXRwdXRFdmVudFR5cGVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBpbmZlciB0aGUgdHlwZSBvZiB0aGUgYCRldmVudGAgdmFyaWFibGUgaW4gZXZlbnQgYmluZGluZ3MgdG8gRE9NIGV2ZW50cy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZSB0eXBlIG9mIGAkZXZlbnRgIHdpbGwgYmUgaW5mZXJyZWQgYmFzZWQgb24gVHlwZVNjcmlwdCdzXG4gICAqIGBIVE1MRWxlbWVudEV2ZW50TWFwYCwgd2l0aCBhIGZhbGxiYWNrIHRvIHRoZSBuYXRpdmUgYEV2ZW50YCB0eXBlLiBJZiBzZXQgdG8gYGZhbHNlYCwgdGhlXG4gICAqIGAkZXZlbnRgIHZhcmlhYmxlIHdpbGwgYmUgb2YgdHlwZSBgYW55YC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYCwgZXZlbiBpZiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIHNldC5cbiAgICovXG4gIHN0cmljdERvbUV2ZW50VHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGluY2x1ZGUgdGhlIGdlbmVyaWMgdHlwZSBvZiBjb21wb25lbnRzIHdoZW4gdHlwZS1jaGVja2luZyB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIElmIG5vIGNvbXBvbmVudCBoYXMgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMsIHRoaXMgc2V0dGluZyBoYXMgbm8gZWZmZWN0LlxuICAgKlxuICAgKiBJZiBhIGNvbXBvbmVudCBoYXMgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgYW5kIHRoaXMgc2V0dGluZyBpcyBgdHJ1ZWAsIHRob3NlIGdlbmVyaWMgcGFyYW1ldGVyc1xuICAgKiB3aWxsIGJlIGluY2x1ZGVkIGluIHRoZSBjb250ZXh0IHR5cGUgZm9yIHRoZSB0ZW1wbGF0ZS4gSWYgYGZhbHNlYCwgYW55IGdlbmVyaWMgcGFyYW1ldGVycyB3aWxsXG4gICAqIGJlIHNldCB0byBgYW55YCBpbiB0aGUgdGVtcGxhdGUgY29udGV4dCB0eXBlLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgLCBldmVuIGlmIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgc2V0LlxuICAgKi9cbiAgc3RyaWN0Q29udGV4dEdlbmVyaWNzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciBvYmplY3Qgb3IgYXJyYXkgbGl0ZXJhbHMgZGVmaW5lZCBpbiB0ZW1wbGF0ZXMgdXNlIHRoZWlyIGluZmVycmVkIHR5cGUsIG9yIGFyZVxuICAgKiBpbnRlcnByZXRlZCBhcyBgYW55YC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYCB1bmxlc3MgYGZ1bGxUZW1wbGF0ZVR5cGVDaGVja2Agb3IgYHN0cmljdFRlbXBsYXRlc2AgYXJlIHNldC5cbiAgICovXG4gIHN0cmljdExpdGVyYWxUeXBlcz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogT3B0aW9ucyB3aGljaCBjb250cm9sIGJlaGF2aW9yIHVzZWZ1bCBmb3IgXCJtb25vcmVwb1wiIGJ1aWxkIGNhc2VzIHVzaW5nIEJhemVsIChzdWNoIGFzIHRoZVxuICogaW50ZXJuYWwgR29vZ2xlIG1vbm9yZXBvLCBnMykuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEJhemVsQW5kRzNPcHRpb25zIHtcbiAgLyoqXG4gICAqIEVuYWJsZXMgdGhlIGdlbmVyYXRpb24gb2YgYWxpYXMgcmUtZXhwb3J0cyBvZiBkaXJlY3RpdmVzL3BpcGVzIHRoYXQgYXJlIHZpc2libGUgZnJvbSBhblxuICAgKiBOZ01vZHVsZSBmcm9tIHRoYXQgTmdNb2R1bGUncyBmaWxlLlxuICAgKlxuICAgKiBUaGlzIG9wdGlvbiBzaG91bGQgYmUgZGlzYWJsZWQgZm9yIGFwcGxpY2F0aW9uIGJ1aWxkcyBvciBmb3IgQW5ndWxhciBQYWNrYWdlIEZvcm1hdCBsaWJyYXJpZXNcbiAgICogKHdoZXJlIE5nTW9kdWxlcyBhbG9uZyB3aXRoIHRoZWlyIGRpcmVjdGl2ZXMvcGlwZXMgYXJlIGV4cG9ydGVkIHZpYSBhIHNpbmdsZSBlbnRyeXBvaW50KS5cbiAgICpcbiAgICogRm9yIG90aGVyIGxpYnJhcnkgY29tcGlsYXRpb25zIHdoaWNoIGFyZSBpbnRlbmRlZCB0byBiZSBwYXRoLW1hcHBlZCBpbnRvIGFuIGFwcGxpY2F0aW9uIGJ1aWxkXG4gICAqIChvciBhbm90aGVyIGxpYnJhcnkpLCBlbmFibGluZyB0aGlzIG9wdGlvbiBlbmFibGVzIHRoZSByZXN1bHRpbmcgZGVlcCBpbXBvcnRzIHRvIHdvcmtcbiAgICogY29ycmVjdGx5LlxuICAgKlxuICAgKiBBIGNvbnN1bWVyIG9mIHN1Y2ggYSBwYXRoLW1hcHBlZCBsaWJyYXJ5IHdpbGwgd3JpdGUgYW4gaW1wb3J0IGxpa2U6XG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogaW1wb3J0IHtMaWJNb2R1bGV9IGZyb20gJ2xpYi9kZWVwL3BhdGgvdG8vbW9kdWxlJztcbiAgICogYGBgXG4gICAqXG4gICAqIFRoZSBjb21waWxlciB3aWxsIGF0dGVtcHQgdG8gZ2VuZXJhdGUgaW1wb3J0cyBvZiBkaXJlY3RpdmVzL3BpcGVzIGZyb20gdGhhdCBzYW1lIG1vZHVsZVxuICAgKiBzcGVjaWZpZXIgKHRoZSBjb21waWxlciBkb2VzIG5vdCByZXdyaXRlIHRoZSB1c2VyJ3MgZ2l2ZW4gaW1wb3J0IHBhdGgsIHVubGlrZSBWaWV3IEVuZ2luZSkuXG4gICAqXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogaW1wb3J0IHtMaWJEaXIsIExpYkNtcCwgTGliUGlwZX0gZnJvbSAnbGliL2RlZXAvcGF0aC90by9tb2R1bGUnO1xuICAgKiBgYGBcbiAgICpcbiAgICogSXQgd291bGQgYmUgYnVyZGVuc29tZSBmb3IgdXNlcnMgdG8gaGF2ZSB0byByZS1leHBvcnQgYWxsIGRpcmVjdGl2ZXMvcGlwZXMgYWxvbmdzaWRlIGVhY2hcbiAgICogTmdNb2R1bGUgdG8gc3VwcG9ydCB0aGlzIGltcG9ydCBtb2RlbC4gRW5hYmxpbmcgdGhpcyBvcHRpb24gdGVsbHMgdGhlIGNvbXBpbGVyIHRvIGdlbmVyYXRlXG4gICAqIHByaXZhdGUgcmUtZXhwb3J0cyBhbG9uZ3NpZGUgdGhlIE5nTW9kdWxlIG9mIGFsbCB0aGUgZGlyZWN0aXZlcy9waXBlcyBpdCBtYWtlcyBhdmFpbGFibGUsIHRvXG4gICAqIHN1cHBvcnQgdGhlc2UgZnV0dXJlIGltcG9ydHMuXG4gICAqL1xuICBnZW5lcmF0ZURlZXBSZWV4cG9ydHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJbnNlcnQgSlNEb2MgdHlwZSBhbm5vdGF0aW9ucyBuZWVkZWQgYnkgQ2xvc3VyZSBDb21waWxlclxuICAgKi9cbiAgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgcmVsYXRlZCB0byBpMThuIGNvbXBpbGF0aW9uIHN1cHBvcnQuXG4gKlxuICogQHB1YmxpY0FwaVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEkxOG5PcHRpb25zIHtcbiAgLyoqXG4gICAqIExvY2FsZSBvZiB0aGUgaW1wb3J0ZWQgdHJhbnNsYXRpb25zXG4gICAqL1xuICBpMThuSW5Mb2NhbGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFJlbmRlciBgJGxvY2FsaXplYCBtZXNzYWdlcyB3aXRoIGxlZ2FjeSBmb3JtYXQgaWRzLlxuICAgKlxuICAgKiBUaGlzIGlzIG9ubHkgYWN0aXZlIGlmIHdlIGFyZSBidWlsZGluZyB3aXRoIGBlbmFibGVJdnk6IHRydWVgLlxuICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBmb3Igbm93IGlzIGB0cnVlYC5cbiAgICpcbiAgICogVXNlIHRoaXMgb3B0aW9uIHdoZW4gdXNlIGFyZSB1c2luZyB0aGUgYCRsb2NhbGl6ZWAgYmFzZWQgbG9jYWxpemF0aW9uIG1lc3NhZ2VzIGJ1dFxuICAgKiBoYXZlIG5vdCBtaWdyYXRlZCB0aGUgdHJhbnNsYXRpb24gZmlsZXMgdG8gdXNlIHRoZSBuZXcgYCRsb2NhbGl6ZWAgbWVzc2FnZSBpZCBmb3JtYXQuXG4gICAqL1xuICBlbmFibGVJMThuTGVnYWN5TWVzc2FnZUlkRm9ybWF0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0cmFuc2xhdGlvbiB2YXJpYWJsZSBuYW1lIHNob3VsZCBjb250YWluIGV4dGVybmFsIG1lc3NhZ2UgaWRcbiAgICogKHVzZWQgYnkgQ2xvc3VyZSBDb21waWxlcidzIG91dHB1dCBvZiBgZ29vZy5nZXRNc2dgIGZvciB0cmFuc2l0aW9uIHBlcmlvZClcbiAgICovXG4gIGkxOG5Vc2VFeHRlcm5hbElkcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIHRlbXBsYXRlcyBhcmUgc3RvcmVkIGluIGV4dGVybmFsIGZpbGVzIChlLmcuIHZpYSBgdGVtcGxhdGVVcmxgKSB0aGVuIHdlIG5lZWQgdG8gZGVjaWRlXG4gICAqIHdoZXRoZXIgb3Igbm90IHRvIG5vcm1hbGl6ZSB0aGUgbGluZS1lbmRpbmdzIChmcm9tIGBcXHJcXG5gIHRvIGBcXG5gKSB3aGVuIHByb2Nlc3NpbmcgSUNVXG4gICAqIGV4cHJlc3Npb25zLlxuICAgKlxuICAgKiBJZGVhbGx5IHdlIHdvdWxkIGFsd2F5cyBub3JtYWxpemUsIGJ1dCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB0aGlzIGZsYWcgYWxsb3dzIHRoZSB0ZW1wbGF0ZVxuICAgKiBwYXJzZXIgdG8gYXZvaWQgbm9ybWFsaXppbmcgbGluZSBlbmRpbmdzIGluIElDVSBleHByZXNzaW9ucy5cbiAgICpcbiAgICogSWYgYHRydWVgIHRoZW4gd2Ugd2lsbCBub3JtYWxpemUgSUNVIGV4cHJlc3Npb24gbGluZSBlbmRpbmdzLlxuICAgKiBUaGUgZGVmYXVsdCBpcyBgZmFsc2VgLCBidXQgdGhpcyB3aWxsIGJlIHN3aXRjaGVkIGluIGEgZnV0dXJlIG1ham9yIHJlbGVhc2UuXG4gICAqL1xuICBpMThuTm9ybWFsaXplTGluZUVuZGluZ3NJbklDVXM/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIE1pc2NlbGxhbmVvdXMgb3B0aW9ucyB0aGF0IGRvbid0IGZhbGwgaW50byBhbnkgb3RoZXIgY2F0ZWdvcnlcbiAqXG4gKiBAcHVibGljQXBpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWlzY09wdGlvbnMge1xuICAvKipcbiAgICogV2hldGhlciB0aGUgY29tcGlsZXIgc2hvdWxkIGF2b2lkIGdlbmVyYXRpbmcgY29kZSBmb3IgY2xhc3NlcyB0aGF0IGhhdmVuJ3QgYmVlbiBleHBvcnRlZC5cbiAgICogVGhpcyBpcyBvbmx5IGFjdGl2ZSB3aGVuIGJ1aWxkaW5nIHdpdGggYGVuYWJsZUl2eTogdHJ1ZWAuIERlZmF1bHRzIHRvIGB0cnVlYC5cbiAgICovXG4gIGNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBEaXNhYmxlIFR5cGVTY3JpcHQgVmVyc2lvbiBDaGVjay5cbiAgICovXG4gIGRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrPzogYm9vbGVhbjtcbn1cbiJdfQ==