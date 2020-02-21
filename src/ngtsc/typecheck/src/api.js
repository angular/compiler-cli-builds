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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2FwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Qm91bmRUYXJnZXQsIERpcmVjdGl2ZU1ldGEsIFNjaGVtYU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtUZW1wbGF0ZUd1YXJkTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuLyoqXG4gKiBFeHRlbnNpb24gb2YgYERpcmVjdGl2ZU1ldGFgIHRoYXQgaW5jbHVkZXMgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiByZXF1aXJlZCB0byB0eXBlLWNoZWNrIHRoZVxuICogdXNhZ2Ugb2YgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSBleHRlbmRzIERpcmVjdGl2ZU1ldGEge1xuICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPjtcbiAgcXVlcmllczogc3RyaW5nW107XG4gIG5nVGVtcGxhdGVHdWFyZHM6IFRlbXBsYXRlR3VhcmRNZXRhW107XG4gIGNvZXJjZWRJbnB1dEZpZWxkczogU2V0PHN0cmluZz47XG4gIGhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIFRlbXBsYXRlSWQgPSBzdHJpbmcgJiB7X19icmFuZDogJ1RlbXBsYXRlSWQnfTtcblxuLyoqXG4gKiBNZXRhZGF0YSByZXF1aXJlZCBpbiBhZGRpdGlvbiB0byBhIGNvbXBvbmVudCBjbGFzcyBpbiBvcmRlciB0byBnZW5lcmF0ZSBhIHR5cGUgY2hlY2sgYmxvY2sgKFRDQilcbiAqIGZvciB0aGF0IGNvbXBvbmVudC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlQ2hlY2tCbG9ja01ldGFkYXRhIHtcbiAgLyoqXG4gICAqIEEgdW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjbGFzcyB3aGljaCBnYXZlIHJpc2UgdG8gdGhpcyBUQ0IuXG4gICAqXG4gICAqIFRoaXMgY2FuIGJlIHVzZWQgdG8gbWFwIGVycm9ycyBiYWNrIHRvIHRoZSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgZm9yIHRoZSBjb21wb25lbnQuXG4gICAqL1xuICBpZDogVGVtcGxhdGVJZDtcblxuICAvKipcbiAgICogU2VtYW50aWMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHRlbXBsYXRlIG9mIHRoZSBjb21wb25lbnQuXG4gICAqL1xuICBib3VuZFRhcmdldDogQm91bmRUYXJnZXQ8VHlwZUNoZWNrYWJsZURpcmVjdGl2ZU1ldGE+O1xuXG4gIC8qXG4gICAqIFBpcGVzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIG9mIHRoZSBjb21wb25lbnQuXG4gICAqL1xuICBwaXBlczogTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb248dHMuQ2xhc3NEZWNsYXJhdGlvbj4+PjtcblxuICAvKipcbiAgICogU2NoZW1hcyB0aGF0IGFwcGx5IHRvIHRoaXMgdGVtcGxhdGUuXG4gICAqL1xuICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVDdG9yTWV0YWRhdGEge1xuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIHJlcXVlc3RlZCB0eXBlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgKi9cbiAgZm5OYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZ2VuZXJhdGUgYSBib2R5IGZvciB0aGUgZnVuY3Rpb24gb3Igbm90LlxuICAgKi9cbiAgYm9keTogYm9vbGVhbjtcblxuICAvKipcbiAgICogSW5wdXQsIG91dHB1dCwgYW5kIHF1ZXJ5IGZpZWxkIG5hbWVzIGluIHRoZSB0eXBlIHdoaWNoIHNob3VsZCBiZSBpbmNsdWRlZCBhcyBjb25zdHJ1Y3RvciBpbnB1dC5cbiAgICovXG4gIGZpZWxkczoge2lucHV0czogc3RyaW5nW107IG91dHB1dHM6IHN0cmluZ1tdOyBxdWVyaWVzOiBzdHJpbmdbXTt9O1xuXG4gIC8qKlxuICAgKiBgU2V0YCBvZiBmaWVsZCBuYW1lcyB3aGljaCBoYXZlIHR5cGUgY29lcmNpb24gZW5hYmxlZC5cbiAgICovXG4gIGNvZXJjZWRJbnB1dEZpZWxkczogU2V0PHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZUNoZWNraW5nQ29uZmlnIHtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY2hlY2sgdGhlIGxlZnQtaGFuZCBzaWRlIHR5cGUgb2YgYmluZGluZyBvcGVyYXRpb25zLlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSwgaWYgdGhpcyBpcyBgZmFsc2VgIHRoZW4gdGhlIGV4cHJlc3Npb24gYFtpbnB1dF09XCJleHByXCJgIHdpbGwgaGF2ZSBgZXhwcmAgdHlwZS1cbiAgICogY2hlY2tlZCwgYnV0IG5vdCB0aGUgYXNzaWdubWVudCBvZiB0aGUgcmVzdWx0aW5nIHR5cGUgdG8gdGhlIGBpbnB1dGAgcHJvcGVydHkgb2Ygd2hpY2hldmVyXG4gICAqIGRpcmVjdGl2ZSBvciBjb21wb25lbnQgaXMgcmVjZWl2aW5nIHRoZSBiaW5kaW5nLiBJZiBzZXQgdG8gYHRydWVgLCBib3RoIHNpZGVzIG9mIHRoZSBhc3NpZ25tZW50XG4gICAqIGFyZSBjaGVja2VkLlxuICAgKlxuICAgKiBUaGlzIGZsYWcgb25seSBhZmZlY3RzIGJpbmRpbmdzIHRvIGNvbXBvbmVudHMvZGlyZWN0aXZlcy4gQmluZGluZ3MgdG8gdGhlIERPTSBhcmUgY2hlY2tlZCBpZlxuICAgKiBgY2hlY2tUeXBlT2ZEb21CaW5kaW5nc2AgaXMgc2V0LlxuICAgKi9cbiAgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBzdHJpY3QgbnVsbCB0eXBlcyBmb3IgaW5wdXQgYmluZGluZ3MgZm9yIGRpcmVjdGl2ZXMuXG4gICAqXG4gICAqIElmIHRoaXMgaXMgYHRydWVgLCBhcHBsaWNhdGlvbnMgdGhhdCBhcmUgY29tcGlsZWQgd2l0aCBUeXBlU2NyaXB0J3MgYHN0cmljdE51bGxDaGVja3NgIGVuYWJsZWRcbiAgICogd2lsbCBwcm9kdWNlIHR5cGUgZXJyb3JzIGZvciBiaW5kaW5ncyB3aGljaCBjYW4gZXZhbHVhdGUgdG8gYHVuZGVmaW5lZGAgb3IgYG51bGxgIHdoZXJlIHRoZVxuICAgKiBpbnB1dHMncyB0eXBlIGRvZXMgbm90IGluY2x1ZGUgYHVuZGVmaW5lZGAgb3IgYG51bGxgIGluIGl0cyB0eXBlLiBJZiBzZXQgdG8gYGZhbHNlYCwgYWxsXG4gICAqIGJpbmRpbmcgZXhwcmVzc2lvbnMgYXJlIHdyYXBwZWQgaW4gYSBub24tbnVsbCBhc3NlcnRpb24gb3BlcmF0b3IgdG8gZWZmZWN0aXZlbHkgZGlzYWJsZSBzdHJpY3RcbiAgICogbnVsbCBjaGVja3MuIFRoaXMgbWF5IGJlIHBhcnRpY3VsYXJseSB1c2VmdWwgd2hlbiB0aGUgZGlyZWN0aXZlIGlzIGZyb20gYSBsaWJyYXJ5IHRoYXQgaXMgbm90XG4gICAqIGNvbXBpbGVkIHdpdGggYHN0cmljdE51bGxDaGVja3NgIGVuYWJsZWQuXG4gICAqXG4gICAqIElmIGBjaGVja1R5cGVPZklucHV0QmluZGluZ3NgIGlzIHNldCB0byBgZmFsc2VgLCB0aGlzIGZsYWcgaGFzIG5vIGVmZmVjdC5cbiAgICovXG4gIHN0cmljdE51bGxJbnB1dEJpbmRpbmdzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNoZWNrIHRleHQgYXR0cmlidXRlcyB0aGF0IGhhcHBlbiB0byBiZSBjb25zdW1lZCBieSBhIGRpcmVjdGl2ZSBvciBjb21wb25lbnQuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBpbiBhIHRlbXBsYXRlIGNvbnRhaW5pbmcgYDxpbnB1dCBtYXRJbnB1dCBkaXNhYmxlZD5gIHRoZSBgZGlzYWJsZWRgIGF0dHJpYnV0ZSBlbmRzXG4gICAqIHVwIGJlaW5nIGNvbnN1bWVkIGFzIGFuIGlucHV0IHdpdGggdHlwZSBgYm9vbGVhbmAgYnkgdGhlIGBtYXRJbnB1dGAgZGlyZWN0aXZlLiBBdCBydW50aW1lLCB0aGVcbiAgICogaW5wdXQgd2lsbCBiZSBzZXQgdG8gdGhlIGF0dHJpYnV0ZSdzIHN0cmluZyB2YWx1ZSwgd2hpY2ggaXMgYW4gZW1wdHkgc3RyaW5nIGZvciBhdHRyaWJ1dGVzXG4gICAqIHdpdGhvdXQgYSB2YWx1ZSwgc28gd2l0aCB0aGlzIGZsYWcgc2V0IHRvIGB0cnVlYCwgYW4gZXJyb3Igd291bGQgYmUgcmVwb3J0ZWQuIElmIHNldCB0b1xuICAgKiBgZmFsc2VgLCB0ZXh0IGF0dHJpYnV0ZXMgd2lsbCBuZXZlciByZXBvcnQgYW4gZXJyb3IuXG4gICAqXG4gICAqIE5vdGUgdGhhdCBpZiBgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzYCBpcyBzZXQgdG8gYGZhbHNlYCwgdGhpcyBmbGFnIGhhcyBubyBlZmZlY3QuXG4gICAqL1xuICBjaGVja1R5cGVPZkF0dHJpYnV0ZXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY2hlY2sgdGhlIGxlZnQtaGFuZCBzaWRlIHR5cGUgb2YgYmluZGluZyBvcGVyYXRpb25zIHRvIERPTSBwcm9wZXJ0aWVzLlxuICAgKlxuICAgKiBBcyBgY2hlY2tUeXBlT2ZCaW5kaW5nc2AsIGJ1dCBvbmx5IGFwcGxpZXMgdG8gYmluZGluZ3MgdG8gRE9NIHByb3BlcnRpZXMuXG4gICAqXG4gICAqIFRoaXMgZG9lcyBub3QgYWZmZWN0IHRoZSB1c2Ugb2YgdGhlIGBEb21TY2hlbWFDaGVja2VyYCB0byB2YWxpZGF0ZSB0aGUgdGVtcGxhdGUgYWdhaW5zdCB0aGUgRE9NXG4gICAqIHNjaGVtYS4gUmF0aGVyLCB0aGlzIGZsYWcgaXMgYW4gZXhwZXJpbWVudGFsLCBub3QgeWV0IGNvbXBsZXRlIGZlYXR1cmUgd2hpY2ggdXNlcyB0aGVcbiAgICogbGliLmRvbS5kLnRzIERPTSB0eXBpbmdzIGluIFR5cGVTY3JpcHQgdG8gdmFsaWRhdGUgdGhhdCBET00gYmluZGluZ3MgYXJlIG9mIHRoZSBjb3JyZWN0IHR5cGVcbiAgICogZm9yIGFzc2lnbmFiaWxpdHkgdG8gdGhlIHVuZGVybHlpbmcgRE9NIGVsZW1lbnQgcHJvcGVydGllcy5cbiAgICovXG4gIGNoZWNrVHlwZU9mRG9tQmluZGluZ3M6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW5mZXIgdGhlIHR5cGUgb2YgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIGluIGV2ZW50IGJpbmRpbmdzIGZvciBkaXJlY3RpdmUgb3V0cHV0cyBvclxuICAgKiBhbmltYXRpb24gZXZlbnRzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlIHR5cGUgb2YgYCRldmVudGAgd2lsbCBiZSBpbmZlcnJlZCBiYXNlZCBvbiB0aGUgZ2VuZXJpYyB0eXBlIG9mXG4gICAqIGBFdmVudEVtaXR0ZXJgL2BTdWJqZWN0YCBvZiB0aGUgb3V0cHV0LiBJZiBzZXQgdG8gYGZhbHNlYCwgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIHdpbGwgYmUgb2ZcbiAgICogdHlwZSBgYW55YC5cbiAgICovXG4gIGNoZWNrVHlwZU9mT3V0cHV0RXZlbnRzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGluZmVyIHRoZSB0eXBlIG9mIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSBpbiBldmVudCBiaW5kaW5ncyBmb3IgYW5pbWF0aW9ucy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZSB0eXBlIG9mIGAkZXZlbnRgIHdpbGwgYmUgYEFuaW1hdGlvbkV2ZW50YCBmcm9tIGBAYW5ndWxhci9hbmltYXRpb25zYC5cbiAgICogSWYgc2V0IHRvIGBmYWxzZWAsIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSB3aWxsIGJlIG9mIHR5cGUgYGFueWAuXG4gICAqL1xuICBjaGVja1R5cGVPZkFuaW1hdGlvbkV2ZW50czogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBpbmZlciB0aGUgdHlwZSBvZiB0aGUgYCRldmVudGAgdmFyaWFibGUgaW4gZXZlbnQgYmluZGluZ3MgdG8gRE9NIGV2ZW50cy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZSB0eXBlIG9mIGAkZXZlbnRgIHdpbGwgYmUgaW5mZXJyZWQgYmFzZWQgb24gVHlwZVNjcmlwdCdzXG4gICAqIGBIVE1MRWxlbWVudEV2ZW50TWFwYCwgd2l0aCBhIGZhbGxiYWNrIHRvIHRoZSBuYXRpdmUgYEV2ZW50YCB0eXBlLiBJZiBzZXQgdG8gYGZhbHNlYCwgdGhlXG4gICAqIGAkZXZlbnRgIHZhcmlhYmxlIHdpbGwgYmUgb2YgdHlwZSBgYW55YC5cbiAgICovXG4gIGNoZWNrVHlwZU9mRG9tRXZlbnRzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGluZmVyIHRoZSB0eXBlIG9mIGxvY2FsIHJlZmVyZW5jZXMgdG8gRE9NIGVsZW1lbnRzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlIHR5cGUgb2YgYSBgI3JlZmAgdmFyaWFibGUgb24gYSBET00gbm9kZSBpbiB0aGUgdGVtcGxhdGUgd2lsbCBiZVxuICAgKiBkZXRlcm1pbmVkIGJ5IHRoZSB0eXBlIG9mIGBkb2N1bWVudC5jcmVhdGVFbGVtZW50YCBmb3IgdGhlIGdpdmVuIERPTSBub2RlIHR5cGUuIElmIHNldCB0b1xuICAgKiBgZmFsc2VgLCB0aGUgdHlwZSBvZiBgcmVmYCBmb3IgRE9NIG5vZGVzIHdpbGwgYmUgYGFueWAuXG4gICAqL1xuICBjaGVja1R5cGVPZkRvbVJlZmVyZW5jZXM6IGJvb2xlYW47XG5cblxuICAvKipcbiAgICogV2hldGhlciB0byBpbmZlciB0aGUgdHlwZSBvZiBsb2NhbCByZWZlcmVuY2VzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlIHR5cGUgb2YgYSBgI3JlZmAgdmFyaWFibGUgdGhhdCBwb2ludHMgdG8gYSBkaXJlY3RpdmUgb3IgYFRlbXBsYXRlUmVmYCBpblxuICAgKiB0aGUgdGVtcGxhdGUgd2lsbCBiZSBpbmZlcnJlZCBjb3JyZWN0bHkuIElmIHNldCB0byBgZmFsc2VgLCB0aGUgdHlwZSBvZiBgcmVmYCBmb3Igd2lsbCBiZVxuICAgKiBgYW55YC5cbiAgICovXG4gIGNoZWNrVHlwZU9mTm9uRG9tUmVmZXJlbmNlczogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBpbmNsdWRlIHR5cGUgaW5mb3JtYXRpb24gZnJvbSBwaXBlcyBpbiB0aGUgdHlwZS1jaGVja2luZyBvcGVyYXRpb24uXG4gICAqXG4gICAqIElmIHRoaXMgaXMgYHRydWVgLCB0aGVuIHRoZSBwaXBlJ3MgdHlwZSBzaWduYXR1cmUgZm9yIGB0cmFuc2Zvcm0oKWAgd2lsbCBiZSB1c2VkIHRvIGNoZWNrIHRoZVxuICAgKiB1c2FnZSBvZiB0aGUgcGlwZS4gSWYgdGhpcyBpcyBgZmFsc2VgLCB0aGVuIHRoZSByZXN1bHQgb2YgYXBwbHlpbmcgYSBwaXBlIHdpbGwgYmUgYGFueWAsIGFuZFxuICAgKiB0aGUgdHlwZXMgb2YgdGhlIHBpcGUncyB2YWx1ZSBhbmQgYXJndW1lbnRzIHdpbGwgbm90IGJlIG1hdGNoZWQgYWdhaW5zdCB0aGUgYHRyYW5zZm9ybSgpYFxuICAgKiBtZXRob2QuXG4gICAqL1xuICBjaGVja1R5cGVPZlBpcGVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIG5hcnJvdyB0aGUgdHlwZXMgb2YgdGVtcGxhdGUgY29udGV4dHMuXG4gICAqL1xuICBhcHBseVRlbXBsYXRlQ29udGV4dEd1YXJkczogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byB1c2UgYSBzdHJpY3QgdHlwZSBmb3IgbnVsbC1zYWZlIG5hdmlnYXRpb24gb3BlcmF0aW9ucy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgZmFsc2VgLCB0aGVuIHRoZSByZXR1cm4gdHlwZSBvZiBgYT8uYmAgb3IgYGE/KClgIHdpbGwgYmUgYGFueWAuIElmIHNldCB0byBgdHJ1ZWAsXG4gICAqIHRoZW4gdGhlIHJldHVybiB0eXBlIG9mIGBhPy5iYCBmb3IgZXhhbXBsZSB3aWxsIGJlIHRoZSBzYW1lIGFzIHRoZSB0eXBlIG9mIHRoZSB0ZXJuYXJ5XG4gICAqIGV4cHJlc3Npb24gYGEgIT0gbnVsbCA/IGEuYiA6IGFgLlxuICAgKi9cbiAgc3RyaWN0U2FmZU5hdmlnYXRpb25UeXBlczogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBkZXNjZW5kIGludG8gdGVtcGxhdGUgYm9kaWVzIGFuZCBjaGVjayBhbnkgYmluZGluZ3MgdGhlcmUuXG4gICAqL1xuICBjaGVja1RlbXBsYXRlQm9kaWVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNoZWNrIHJlc29sdmFibGUgcXVlcmllcy5cbiAgICpcbiAgICogVGhpcyBpcyBjdXJyZW50bHkgYW4gdW5zdXBwb3J0ZWQgZmVhdHVyZS5cbiAgICovXG4gIGNoZWNrUXVlcmllczogZmFsc2U7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gdXNlIGFueSBnZW5lcmljIHR5cGVzIG9mIHRoZSBjb250ZXh0IGNvbXBvbmVudC5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZW4gaWYgdGhlIGNvbnRleHQgY29tcG9uZW50IGhhcyBnZW5lcmljIHR5cGVzLCB0aG9zZSB3aWxsIGJlIG1pcnJvcmVkIGluXG4gICAqIHRoZSB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGNvbnRleHQuIElmIGBmYWxzZWAsIGFueSBnZW5lcmljIHR5cGUgcGFyYW1ldGVycyBvZiB0aGUgY29udGV4dFxuICAgKiBjb21wb25lbnQgd2lsbCBiZSBzZXQgdG8gYGFueWAgZHVyaW5nIHR5cGUtY2hlY2tpbmcuXG4gICAqL1xuICB1c2VDb250ZXh0R2VuZXJpY1R5cGU6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgb3Igbm90IHRvIGluZmVyIHR5cGVzIGZvciBvYmplY3QgYW5kIGFycmF5IGxpdGVyYWxzIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZW4gdGhlIHR5cGUgb2YgYW4gb2JqZWN0IG9yIGFuIGFycmF5IGxpdGVyYWwgaW4gdGhlIHRlbXBsYXRlIHdpbGwgYmUgdGhlXG4gICAqIHNhbWUgdHlwZSB0aGF0IFR5cGVTY3JpcHQgd291bGQgaW5mZXIgaWYgdGhlIGxpdGVyYWwgYXBwZWFyZWQgaW4gY29kZS4gSWYgYGZhbHNlYCwgdGhlbiBzdWNoXG4gICAqIGxpdGVyYWxzIGFyZSBjYXN0IHRvIGBhbnlgIHdoZW4gZGVjbGFyZWQuXG4gICAqL1xuICBzdHJpY3RMaXRlcmFsVHlwZXM6IGJvb2xlYW47XG59XG5cblxuZXhwb3J0IHR5cGUgVGVtcGxhdGVTb3VyY2VNYXBwaW5nID1cbiAgICBEaXJlY3RUZW1wbGF0ZVNvdXJjZU1hcHBpbmcgfCBJbmRpcmVjdFRlbXBsYXRlU291cmNlTWFwcGluZyB8IEV4dGVybmFsVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuXG4vKipcbiAqIEEgbWFwcGluZyB0byBhbiBpbmxpbmUgdGVtcGxhdGUgaW4gYSBUUyBmaWxlLlxuICpcbiAqIGBQYXJzZVNvdXJjZVNwYW5gcyBmb3IgdGhpcyB0ZW1wbGF0ZSBzaG91bGQgYmUgYWNjdXJhdGUgZm9yIGRpcmVjdCByZXBvcnRpbmcgaW4gYSBUUyBlcnJvclxuICogbWVzc2FnZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RUZW1wbGF0ZVNvdXJjZU1hcHBpbmcge1xuICB0eXBlOiAnZGlyZWN0JztcbiAgbm9kZTogdHMuU3RyaW5nTGl0ZXJhbHx0cy5Ob1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbDtcbn1cblxuLyoqXG4gKiBBIG1hcHBpbmcgdG8gYSB0ZW1wbGF0ZSB3aGljaCBpcyBzdGlsbCBpbiBhIFRTIGZpbGUsIGJ1dCB3aGVyZSB0aGUgbm9kZSBwb3NpdGlvbnMgaW4gYW55XG4gKiBgUGFyc2VTb3VyY2VTcGFuYHMgYXJlIG5vdCBhY2N1cmF0ZSBmb3Igb25lIHJlYXNvbiBvciBhbm90aGVyLlxuICpcbiAqIFRoaXMgY2FuIG9jY3VyIGlmIHRoZSB0ZW1wbGF0ZSBleHByZXNzaW9uIHdhcyBpbnRlcnBvbGF0ZWQgaW4gYSB3YXkgd2hlcmUgdGhlIGNvbXBpbGVyIGNvdWxkIG5vdFxuICogY29uc3RydWN0IGEgY29udGlndW91cyBtYXBwaW5nIGZvciB0aGUgdGVtcGxhdGUgc3RyaW5nLiBUaGUgYG5vZGVgIHJlZmVycyB0byB0aGUgYHRlbXBsYXRlYFxuICogZXhwcmVzc2lvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbmRpcmVjdFRlbXBsYXRlU291cmNlTWFwcGluZyB7XG4gIHR5cGU6ICdpbmRpcmVjdCc7XG4gIGNvbXBvbmVudENsYXNzOiBDbGFzc0RlY2xhcmF0aW9uO1xuICBub2RlOiB0cy5FeHByZXNzaW9uO1xuICB0ZW1wbGF0ZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgbWFwcGluZyB0byBhIHRlbXBsYXRlIGRlY2xhcmVkIGluIGFuIGV4dGVybmFsIEhUTUwgZmlsZSwgd2hlcmUgbm9kZSBwb3NpdGlvbnMgaW5cbiAqIGBQYXJzZVNvdXJjZVNwYW5gcyByZXByZXNlbnQgYWNjdXJhdGUgb2Zmc2V0cyBpbnRvIHRoZSBleHRlcm5hbCBmaWxlLlxuICpcbiAqIEluIHRoaXMgY2FzZSwgdGhlIGdpdmVuIGBub2RlYCByZWZlcnMgdG8gdGhlIGB0ZW1wbGF0ZVVybGAgZXhwcmVzc2lvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHRlcm5hbFRlbXBsYXRlU291cmNlTWFwcGluZyB7XG4gIHR5cGU6ICdleHRlcm5hbCc7XG4gIGNvbXBvbmVudENsYXNzOiBDbGFzc0RlY2xhcmF0aW9uO1xuICBub2RlOiB0cy5FeHByZXNzaW9uO1xuICB0ZW1wbGF0ZTogc3RyaW5nO1xuICB0ZW1wbGF0ZVVybDogc3RyaW5nO1xufVxuIl19