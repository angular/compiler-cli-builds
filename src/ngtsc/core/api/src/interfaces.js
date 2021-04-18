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
        define("@angular/compiler-cli/src/ngtsc/core/api/src/interfaces", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJmYWNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvY29yZS9hcGkvc3JjL2ludGVyZmFjZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIEEgaG9zdCBiYWNrZWQgYnkgYSBidWlsZCBzeXN0ZW0gd2hpY2ggaGFzIGEgdW5pZmllZCB2aWV3IG9mIHRoZSBtb2R1bGUgbmFtZXNwYWNlLlxuICpcbiAqIFN1Y2ggYSBidWlsZCBzeXN0ZW0gc3VwcG9ydHMgdGhlIGBmaWxlTmFtZVRvTW9kdWxlTmFtZWAgbWV0aG9kIHByb3ZpZGVkIGJ5IGNlcnRhaW4gYnVpbGQgc3lzdGVtXG4gKiBpbnRlZ3JhdGlvbnMgKHN1Y2ggYXMgdGhlIGludGVncmF0aW9uIHdpdGggQmF6ZWwpLiBTZWUgdGhlIGRvY3Mgb24gYGZpbGVOYW1lVG9Nb2R1bGVOYW1lYCBmb3JcbiAqIG1vcmUgZGV0YWlscy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVbmlmaWVkTW9kdWxlc0hvc3Qge1xuICAvKipcbiAgICogQ29udmVydHMgYSBmaWxlIHBhdGggdG8gYSBtb2R1bGUgbmFtZSB0aGF0IGNhbiBiZSB1c2VkIGFzIGFuIGBpbXBvcnQgLi4uYC5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIHN1Y2ggYSBob3N0IG1pZ2h0IGRldGVybWluZSB0aGF0IGAvYWJzb2x1dGUvcGF0aC90by9tb25vcmVwby9saWIvaW1wb3J0ZWRGaWxlLnRzYFxuICAgKiBzaG91bGQgYmUgaW1wb3J0ZWQgdXNpbmcgYSBtb2R1bGUgc3BlY2lmaWVyIG9mIGBtb25vcmVwby9saWIvaW1wb3J0ZWRGaWxlYC5cbiAgICovXG4gIGZpbGVOYW1lVG9Nb2R1bGVOYW1lKGltcG9ydGVkRmlsZVBhdGg6IHN0cmluZywgY29udGFpbmluZ0ZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBob3N0IHdoaWNoIGFkZGl0aW9uYWxseSB0cmFja3MgYW5kIHByb2R1Y2VzIFwicmVzb3VyY2VzXCIgKEhUTUwgdGVtcGxhdGVzLCBDU1NcbiAqIGZpbGVzLCBldGMpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc291cmNlSG9zdCB7XG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIGZpbGUgcGF0aCBmb3IgYSByZXNvdXJjZSB0aGF0IGlzIHVzZWQgaW4gYSBzb3VyY2UgZmlsZSBvciBhbm90aGVyIHJlc291cmNlXG4gICAqIGludG8gYSBmaWxlcGF0aC5cbiAgICpcbiAgICogVGhlIG9wdGlvbmFsIGBmYWxsYmFja1Jlc29sdmVgIG1ldGhvZCBjYW4gYmUgdXNlZCBhcyBhIHdheSB0byBhdHRlbXB0IGEgZmFsbGJhY2sgcmVzb2x1dGlvbiBpZlxuICAgKiB0aGUgaW1wbGVtZW50YXRpb24ncyBgcmVzb3VyY2VOYW1lVG9GaWxlTmFtZWAgcmVzb2x1dGlvbiBmYWlscy5cbiAgICovXG4gIHJlc291cmNlTmFtZVRvRmlsZU5hbWUoXG4gICAgICByZXNvdXJjZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGVQYXRoOiBzdHJpbmcsXG4gICAgICBmYWxsYmFja1Jlc29sdmU/OiAodXJsOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpID0+IHN0cmluZyB8IG51bGwpOiBzdHJpbmd8bnVsbDtcblxuICAvKipcbiAgICogTG9hZCBhIHJlZmVyZW5jZWQgcmVzb3VyY2UgZWl0aGVyIHN0YXRpY2FsbHkgb3IgYXN5bmNocm9ub3VzbHkuIElmIHRoZSBob3N0IHJldHVybnMgYVxuICAgKiBgUHJvbWlzZTxzdHJpbmc+YCBpdCBpcyBhc3N1bWVkIHRoZSB1c2VyIG9mIHRoZSBjb3JyZXNwb25kaW5nIGBQcm9ncmFtYCB3aWxsIGNhbGxcbiAgICogYGxvYWROZ1N0cnVjdHVyZUFzeW5jKClgLiBSZXR1cm5pbmcgIGBQcm9taXNlPHN0cmluZz5gIG91dHNpZGUgYGxvYWROZ1N0cnVjdHVyZUFzeW5jKClgIHdpbGxcbiAgICogY2F1c2UgYSBkaWFnbm9zdGljcyBkaWFnbm9zdGljIGVycm9yIG9yIGFuIGV4Y2VwdGlvbiB0byBiZSB0aHJvd24uXG4gICAqL1xuICByZWFkUmVzb3VyY2UoZmlsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPnxzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYWJzb2x1dGUgcGF0aHMgdG8gdGhlIGNoYW5nZWQgZmlsZXMgdGhhdCB0cmlnZ2VyZWQgdGhlIGN1cnJlbnQgY29tcGlsYXRpb25cbiAgICogb3IgYHVuZGVmaW5lZGAgaWYgdGhpcyBpcyBub3QgYW4gaW5jcmVtZW50YWwgYnVpbGQuXG4gICAqL1xuICBnZXRNb2RpZmllZFJlc291cmNlRmlsZXM/KCk6IFNldDxzdHJpbmc+fHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogVHJhbnNmb3JtIGFuIGlubGluZSBvciBleHRlcm5hbCByZXNvdXJjZSBhc3luY2hyb25vdXNseS5cbiAgICogSXQgaXMgYXNzdW1lZCB0aGUgY29uc3VtZXIgb2YgdGhlIGNvcnJlc3BvbmRpbmcgYFByb2dyYW1gIHdpbGwgY2FsbFxuICAgKiBgbG9hZE5nU3RydWN0dXJlQXN5bmMoKWAuIFVzaW5nIG91dHNpZGUgYGxvYWROZ1N0cnVjdHVyZUFzeW5jKClgIHdpbGxcbiAgICogY2F1c2UgYSBkaWFnbm9zdGljcyBlcnJvciBvciBhbiBleGNlcHRpb24gdG8gYmUgdGhyb3duLlxuICAgKiBPbmx5IHN0eWxlIHJlc291cmNlcyBhcmUgY3VycmVudGx5IHN1cHBvcnRlZC5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgVGhlIHJlc291cmNlIGRhdGEgdG8gdHJhbnNmb3JtLlxuICAgKiBAcGFyYW0gY29udGV4dCBJbmZvcm1hdGlvbiByZWdhcmRpbmcgdGhlIHJlc291cmNlIHN1Y2ggYXMgdGhlIHR5cGUgYW5kIGNvbnRhaW5pbmcgZmlsZS5cbiAgICogQHJldHVybnMgQSBwcm9taXNlIG9mIGVpdGhlciB0aGUgdHJhbnNmb3JtZWQgcmVzb3VyY2UgZGF0YSBvciBudWxsIGlmIG5vIHRyYW5zZm9ybWF0aW9uIG9jY3Vycy5cbiAgICovXG4gIHRyYW5zZm9ybVJlc291cmNlP1xuICAgICAgKGRhdGE6IHN0cmluZywgY29udGV4dDogUmVzb3VyY2VIb3N0Q29udGV4dCk6IFByb21pc2U8VHJhbnNmb3JtUmVzb3VyY2VSZXN1bHR8bnVsbD47XG59XG5cbi8qKlxuICogQ29udGV4dHVhbCBpbmZvcm1hdGlvbiB1c2VkIGJ5IG1lbWJlcnMgb2YgdGhlIFJlc291cmNlSG9zdCBpbnRlcmZhY2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb3VyY2VIb3N0Q29udGV4dCB7XG4gIC8qKlxuICAgKiBUaGUgdHlwZSBvZiB0aGUgY29tcG9uZW50IHJlc291cmNlLiBUZW1wbGF0ZXMgYXJlIG5vdCB5ZXQgc3VwcG9ydGVkLlxuICAgKiAqIFJlc291cmNlcyByZWZlcmVuY2VkIHZpYSBhIGNvbXBvbmVudCdzIGBzdHlsZXNgIG9yIGBzdHlsZVVybHNgIHByb3BlcnRpZXMgYXJlIG9mXG4gICAqIHR5cGUgYHN0eWxlYC5cbiAgICovXG4gIHJlYWRvbmx5IHR5cGU6ICdzdHlsZSc7XG4gIC8qKlxuICAgKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcmVzb3VyY2UgZmlsZS4gSWYgdGhlIHJlc291cmNlIGlzIGlubGluZSwgdGhlIHZhbHVlIHdpbGwgYmUgbnVsbC5cbiAgICovXG4gIHJlYWRvbmx5IHJlc291cmNlRmlsZTogc3RyaW5nfG51bGw7XG4gIC8qKlxuICAgKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgZmlsZSB0aGF0IGNvbnRhaW5zIHRoZSByZXNvdXJjZSBvciByZWZlcmVuY2UgdG8gdGhlIHJlc291cmNlLlxuICAgKi9cbiAgcmVhZG9ubHkgY29udGFpbmluZ0ZpbGU6IHN0cmluZztcbn1cblxuLyoqXG4gKiBUaGUgc3VjY2Vzc2Z1bCB0cmFuc2Zvcm1hdGlvbiByZXN1bHQgb2YgdGhlIGBSZXNvdXJjZUhvc3QudHJhbnNmb3JtUmVzb3VyY2VgIGZ1bmN0aW9uLlxuICogVGhpcyBpbnRlcmZhY2UgbWF5IGJlIGV4cGFuZGVkIGluIHRoZSBmdXR1cmUgdG8gaW5jbHVkZSBkaWFnbm9zdGljIGluZm9ybWF0aW9uIGFuZCBzb3VyY2UgbWFwcGluZ1xuICogc3VwcG9ydC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFuc2Zvcm1SZXNvdXJjZVJlc3VsdCB7XG4gIC8qKlxuICAgKiBUaGUgY29udGVudCBnZW5lcmF0ZWQgYnkgdGhlIHRyYW5zZm9ybWF0aW9uLlxuICAgKi9cbiAgY29udGVudDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgYHRzLkNvbXBpbGVySG9zdGAgaW50ZXJmYWNlIHdoaWNoIHN1cHBvcnRzIHNvbWUgbnVtYmVyIG9mIG9wdGlvbmFsIG1ldGhvZHMgaW4gYWRkaXRpb24gdG8gdGhlXG4gKiBjb3JlIGludGVyZmFjZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHRlbmRlZFRzQ29tcGlsZXJIb3N0IGV4dGVuZHMgdHMuQ29tcGlsZXJIb3N0LCBQYXJ0aWFsPFJlc291cmNlSG9zdD4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYXJ0aWFsPFVuaWZpZWRNb2R1bGVzSG9zdD4ge31cblxuZXhwb3J0IGludGVyZmFjZSBMYXp5Um91dGUge1xuICByb3V0ZTogc3RyaW5nO1xuICBtb2R1bGU6IHtuYW1lOiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmd9O1xuICByZWZlcmVuY2VkTW9kdWxlOiB7bmFtZTogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nfTtcbn1cbiJdfQ==