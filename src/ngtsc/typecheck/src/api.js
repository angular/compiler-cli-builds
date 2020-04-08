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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90eXBlY2hlY2svc3JjL2FwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Qm91bmRUYXJnZXQsIERpcmVjdGl2ZU1ldGEsIFNjaGVtYU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtUZW1wbGF0ZUd1YXJkTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuLyoqXG4gKiBFeHRlbnNpb24gb2YgYERpcmVjdGl2ZU1ldGFgIHRoYXQgaW5jbHVkZXMgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiByZXF1aXJlZCB0byB0eXBlLWNoZWNrIHRoZVxuICogdXNhZ2Ugb2YgYSBwYXJ0aWN1bGFyIGRpcmVjdGl2ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlQ2hlY2thYmxlRGlyZWN0aXZlTWV0YSBleHRlbmRzIERpcmVjdGl2ZU1ldGEge1xuICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPjtcbiAgcXVlcmllczogc3RyaW5nW107XG4gIG5nVGVtcGxhdGVHdWFyZHM6IFRlbXBsYXRlR3VhcmRNZXRhW107XG4gIGNvZXJjZWRJbnB1dEZpZWxkczogU2V0PHN0cmluZz47XG4gIGhhc05nVGVtcGxhdGVDb250ZXh0R3VhcmQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIFRlbXBsYXRlSWQgPSBzdHJpbmcme19fYnJhbmQ6ICdUZW1wbGF0ZUlkJ307XG5cbi8qKlxuICogTWV0YWRhdGEgcmVxdWlyZWQgaW4gYWRkaXRpb24gdG8gYSBjb21wb25lbnQgY2xhc3MgaW4gb3JkZXIgdG8gZ2VuZXJhdGUgYSB0eXBlIGNoZWNrIGJsb2NrIChUQ0IpXG4gKiBmb3IgdGhhdCBjb21wb25lbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZUNoZWNrQmxvY2tNZXRhZGF0YSB7XG4gIC8qKlxuICAgKiBBIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgY2xhc3Mgd2hpY2ggZ2F2ZSByaXNlIHRvIHRoaXMgVENCLlxuICAgKlxuICAgKiBUaGlzIGNhbiBiZSB1c2VkIHRvIG1hcCBlcnJvcnMgYmFjayB0byB0aGUgYHRzLkNsYXNzRGVjbGFyYXRpb25gIGZvciB0aGUgY29tcG9uZW50LlxuICAgKi9cbiAgaWQ6IFRlbXBsYXRlSWQ7XG5cbiAgLyoqXG4gICAqIFNlbWFudGljIGluZm9ybWF0aW9uIGFib3V0IHRoZSB0ZW1wbGF0ZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKi9cbiAgYm91bmRUYXJnZXQ6IEJvdW5kVGFyZ2V0PFR5cGVDaGVja2FibGVEaXJlY3RpdmVNZXRhPjtcblxuICAvKlxuICAgKiBQaXBlcyB1c2VkIGluIHRoZSB0ZW1wbGF0ZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKi9cbiAgcGlwZXM6IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPHRzLkNsYXNzRGVjbGFyYXRpb24+Pj47XG5cbiAgLyoqXG4gICAqIFNjaGVtYXMgdGhhdCBhcHBseSB0byB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUeXBlQ3Rvck1ldGFkYXRhIHtcbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSByZXF1ZXN0ZWQgdHlwZSBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICovXG4gIGZuTmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGdlbmVyYXRlIGEgYm9keSBmb3IgdGhlIGZ1bmN0aW9uIG9yIG5vdC5cbiAgICovXG4gIGJvZHk6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElucHV0LCBvdXRwdXQsIGFuZCBxdWVyeSBmaWVsZCBuYW1lcyBpbiB0aGUgdHlwZSB3aGljaCBzaG91bGQgYmUgaW5jbHVkZWQgYXMgY29uc3RydWN0b3IgaW5wdXQuXG4gICAqL1xuICBmaWVsZHM6IHtpbnB1dHM6IHN0cmluZ1tdOyBvdXRwdXRzOiBzdHJpbmdbXTsgcXVlcmllczogc3RyaW5nW107fTtcblxuICAvKipcbiAgICogYFNldGAgb2YgZmllbGQgbmFtZXMgd2hpY2ggaGF2ZSB0eXBlIGNvZXJjaW9uIGVuYWJsZWQuXG4gICAqL1xuICBjb2VyY2VkSW5wdXRGaWVsZHM6IFNldDxzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVDaGVja2luZ0NvbmZpZyB7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNoZWNrIHRoZSBsZWZ0LWhhbmQgc2lkZSB0eXBlIG9mIGJpbmRpbmcgb3BlcmF0aW9ucy5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGlmIHRoaXMgaXMgYGZhbHNlYCB0aGVuIHRoZSBleHByZXNzaW9uIGBbaW5wdXRdPVwiZXhwclwiYCB3aWxsIGhhdmUgYGV4cHJgIHR5cGUtXG4gICAqIGNoZWNrZWQsIGJ1dCBub3QgdGhlIGFzc2lnbm1lbnQgb2YgdGhlIHJlc3VsdGluZyB0eXBlIHRvIHRoZSBgaW5wdXRgIHByb3BlcnR5IG9mIHdoaWNoZXZlclxuICAgKiBkaXJlY3RpdmUgb3IgY29tcG9uZW50IGlzIHJlY2VpdmluZyB0aGUgYmluZGluZy4gSWYgc2V0IHRvIGB0cnVlYCwgYm90aCBzaWRlcyBvZiB0aGUgYXNzaWdubWVudFxuICAgKiBhcmUgY2hlY2tlZC5cbiAgICpcbiAgICogVGhpcyBmbGFnIG9ubHkgYWZmZWN0cyBiaW5kaW5ncyB0byBjb21wb25lbnRzL2RpcmVjdGl2ZXMuIEJpbmRpbmdzIHRvIHRoZSBET00gYXJlIGNoZWNrZWQgaWZcbiAgICogYGNoZWNrVHlwZU9mRG9tQmluZGluZ3NgIGlzIHNldC5cbiAgICovXG4gIGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nczogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byB1c2Ugc3RyaWN0IG51bGwgdHlwZXMgZm9yIGlucHV0IGJpbmRpbmdzIGZvciBkaXJlY3RpdmVzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgYXBwbGljYXRpb25zIHRoYXQgYXJlIGNvbXBpbGVkIHdpdGggVHlwZVNjcmlwdCdzIGBzdHJpY3ROdWxsQ2hlY2tzYCBlbmFibGVkXG4gICAqIHdpbGwgcHJvZHVjZSB0eXBlIGVycm9ycyBmb3IgYmluZGluZ3Mgd2hpY2ggY2FuIGV2YWx1YXRlIHRvIGB1bmRlZmluZWRgIG9yIGBudWxsYCB3aGVyZSB0aGVcbiAgICogaW5wdXRzJ3MgdHlwZSBkb2VzIG5vdCBpbmNsdWRlIGB1bmRlZmluZWRgIG9yIGBudWxsYCBpbiBpdHMgdHlwZS4gSWYgc2V0IHRvIGBmYWxzZWAsIGFsbFxuICAgKiBiaW5kaW5nIGV4cHJlc3Npb25zIGFyZSB3cmFwcGVkIGluIGEgbm9uLW51bGwgYXNzZXJ0aW9uIG9wZXJhdG9yIHRvIGVmZmVjdGl2ZWx5IGRpc2FibGUgc3RyaWN0XG4gICAqIG51bGwgY2hlY2tzLiBUaGlzIG1heSBiZSBwYXJ0aWN1bGFybHkgdXNlZnVsIHdoZW4gdGhlIGRpcmVjdGl2ZSBpcyBmcm9tIGEgbGlicmFyeSB0aGF0IGlzIG5vdFxuICAgKiBjb21waWxlZCB3aXRoIGBzdHJpY3ROdWxsQ2hlY2tzYCBlbmFibGVkLlxuICAgKlxuICAgKiBJZiBgY2hlY2tUeXBlT2ZJbnB1dEJpbmRpbmdzYCBpcyBzZXQgdG8gYGZhbHNlYCwgdGhpcyBmbGFnIGhhcyBubyBlZmZlY3QuXG4gICAqL1xuICBzdHJpY3ROdWxsSW5wdXRCaW5kaW5nczogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBjaGVjayB0ZXh0IGF0dHJpYnV0ZXMgdGhhdCBoYXBwZW4gdG8gYmUgY29uc3VtZWQgYnkgYSBkaXJlY3RpdmUgb3IgY29tcG9uZW50LlxuICAgKlxuICAgKiBGb3IgZXhhbXBsZSwgaW4gYSB0ZW1wbGF0ZSBjb250YWluaW5nIGA8aW5wdXQgbWF0SW5wdXQgZGlzYWJsZWQ+YCB0aGUgYGRpc2FibGVkYCBhdHRyaWJ1dGUgZW5kc1xuICAgKiB1cCBiZWluZyBjb25zdW1lZCBhcyBhbiBpbnB1dCB3aXRoIHR5cGUgYGJvb2xlYW5gIGJ5IHRoZSBgbWF0SW5wdXRgIGRpcmVjdGl2ZS4gQXQgcnVudGltZSwgdGhlXG4gICAqIGlucHV0IHdpbGwgYmUgc2V0IHRvIHRoZSBhdHRyaWJ1dGUncyBzdHJpbmcgdmFsdWUsIHdoaWNoIGlzIGFuIGVtcHR5IHN0cmluZyBmb3IgYXR0cmlidXRlc1xuICAgKiB3aXRob3V0IGEgdmFsdWUsIHNvIHdpdGggdGhpcyBmbGFnIHNldCB0byBgdHJ1ZWAsIGFuIGVycm9yIHdvdWxkIGJlIHJlcG9ydGVkLiBJZiBzZXQgdG9cbiAgICogYGZhbHNlYCwgdGV4dCBhdHRyaWJ1dGVzIHdpbGwgbmV2ZXIgcmVwb3J0IGFuIGVycm9yLlxuICAgKlxuICAgKiBOb3RlIHRoYXQgaWYgYGNoZWNrVHlwZU9mSW5wdXRCaW5kaW5nc2AgaXMgc2V0IHRvIGBmYWxzZWAsIHRoaXMgZmxhZyBoYXMgbm8gZWZmZWN0LlxuICAgKi9cbiAgY2hlY2tUeXBlT2ZBdHRyaWJ1dGVzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNoZWNrIHRoZSBsZWZ0LWhhbmQgc2lkZSB0eXBlIG9mIGJpbmRpbmcgb3BlcmF0aW9ucyB0byBET00gcHJvcGVydGllcy5cbiAgICpcbiAgICogQXMgYGNoZWNrVHlwZU9mQmluZGluZ3NgLCBidXQgb25seSBhcHBsaWVzIHRvIGJpbmRpbmdzIHRvIERPTSBwcm9wZXJ0aWVzLlxuICAgKlxuICAgKiBUaGlzIGRvZXMgbm90IGFmZmVjdCB0aGUgdXNlIG9mIHRoZSBgRG9tU2NoZW1hQ2hlY2tlcmAgdG8gdmFsaWRhdGUgdGhlIHRlbXBsYXRlIGFnYWluc3QgdGhlIERPTVxuICAgKiBzY2hlbWEuIFJhdGhlciwgdGhpcyBmbGFnIGlzIGFuIGV4cGVyaW1lbnRhbCwgbm90IHlldCBjb21wbGV0ZSBmZWF0dXJlIHdoaWNoIHVzZXMgdGhlXG4gICAqIGxpYi5kb20uZC50cyBET00gdHlwaW5ncyBpbiBUeXBlU2NyaXB0IHRvIHZhbGlkYXRlIHRoYXQgRE9NIGJpbmRpbmdzIGFyZSBvZiB0aGUgY29ycmVjdCB0eXBlXG4gICAqIGZvciBhc3NpZ25hYmlsaXR5IHRvIHRoZSB1bmRlcmx5aW5nIERPTSBlbGVtZW50IHByb3BlcnRpZXMuXG4gICAqL1xuICBjaGVja1R5cGVPZkRvbUJpbmRpbmdzOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGluZmVyIHRoZSB0eXBlIG9mIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSBpbiBldmVudCBiaW5kaW5ncyBmb3IgZGlyZWN0aXZlIG91dHB1dHMgb3JcbiAgICogYW5pbWF0aW9uIGV2ZW50cy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZSB0eXBlIG9mIGAkZXZlbnRgIHdpbGwgYmUgaW5mZXJyZWQgYmFzZWQgb24gdGhlIGdlbmVyaWMgdHlwZSBvZlxuICAgKiBgRXZlbnRFbWl0dGVyYC9gU3ViamVjdGAgb2YgdGhlIG91dHB1dC4gSWYgc2V0IHRvIGBmYWxzZWAsIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSB3aWxsIGJlIG9mXG4gICAqIHR5cGUgYGFueWAuXG4gICAqL1xuICBjaGVja1R5cGVPZk91dHB1dEV2ZW50czogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBpbmZlciB0aGUgdHlwZSBvZiB0aGUgYCRldmVudGAgdmFyaWFibGUgaW4gZXZlbnQgYmluZGluZ3MgZm9yIGFuaW1hdGlvbnMuXG4gICAqXG4gICAqIElmIHRoaXMgaXMgYHRydWVgLCB0aGUgdHlwZSBvZiBgJGV2ZW50YCB3aWxsIGJlIGBBbmltYXRpb25FdmVudGAgZnJvbSBgQGFuZ3VsYXIvYW5pbWF0aW9uc2AuXG4gICAqIElmIHNldCB0byBgZmFsc2VgLCB0aGUgYCRldmVudGAgdmFyaWFibGUgd2lsbCBiZSBvZiB0eXBlIGBhbnlgLlxuICAgKi9cbiAgY2hlY2tUeXBlT2ZBbmltYXRpb25FdmVudHM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW5mZXIgdGhlIHR5cGUgb2YgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIGluIGV2ZW50IGJpbmRpbmdzIHRvIERPTSBldmVudHMuXG4gICAqXG4gICAqIElmIHRoaXMgaXMgYHRydWVgLCB0aGUgdHlwZSBvZiBgJGV2ZW50YCB3aWxsIGJlIGluZmVycmVkIGJhc2VkIG9uIFR5cGVTY3JpcHQnc1xuICAgKiBgSFRNTEVsZW1lbnRFdmVudE1hcGAsIHdpdGggYSBmYWxsYmFjayB0byB0aGUgbmF0aXZlIGBFdmVudGAgdHlwZS4gSWYgc2V0IHRvIGBmYWxzZWAsIHRoZVxuICAgKiBgJGV2ZW50YCB2YXJpYWJsZSB3aWxsIGJlIG9mIHR5cGUgYGFueWAuXG4gICAqL1xuICBjaGVja1R5cGVPZkRvbUV2ZW50czogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBpbmZlciB0aGUgdHlwZSBvZiBsb2NhbCByZWZlcmVuY2VzIHRvIERPTSBlbGVtZW50cy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZSB0eXBlIG9mIGEgYCNyZWZgIHZhcmlhYmxlIG9uIGEgRE9NIG5vZGUgaW4gdGhlIHRlbXBsYXRlIHdpbGwgYmVcbiAgICogZGV0ZXJtaW5lZCBieSB0aGUgdHlwZSBvZiBgZG9jdW1lbnQuY3JlYXRlRWxlbWVudGAgZm9yIHRoZSBnaXZlbiBET00gbm9kZSB0eXBlLiBJZiBzZXQgdG9cbiAgICogYGZhbHNlYCwgdGhlIHR5cGUgb2YgYHJlZmAgZm9yIERPTSBub2RlcyB3aWxsIGJlIGBhbnlgLlxuICAgKi9cbiAgY2hlY2tUeXBlT2ZEb21SZWZlcmVuY2VzOiBib29sZWFuO1xuXG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW5mZXIgdGhlIHR5cGUgb2YgbG9jYWwgcmVmZXJlbmNlcy5cbiAgICpcbiAgICogSWYgdGhpcyBpcyBgdHJ1ZWAsIHRoZSB0eXBlIG9mIGEgYCNyZWZgIHZhcmlhYmxlIHRoYXQgcG9pbnRzIHRvIGEgZGlyZWN0aXZlIG9yIGBUZW1wbGF0ZVJlZmAgaW5cbiAgICogdGhlIHRlbXBsYXRlIHdpbGwgYmUgaW5mZXJyZWQgY29ycmVjdGx5LiBJZiBzZXQgdG8gYGZhbHNlYCwgdGhlIHR5cGUgb2YgYHJlZmAgZm9yIHdpbGwgYmVcbiAgICogYGFueWAuXG4gICAqL1xuICBjaGVja1R5cGVPZk5vbkRvbVJlZmVyZW5jZXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW5jbHVkZSB0eXBlIGluZm9ybWF0aW9uIGZyb20gcGlwZXMgaW4gdGhlIHR5cGUtY2hlY2tpbmcgb3BlcmF0aW9uLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlbiB0aGUgcGlwZSdzIHR5cGUgc2lnbmF0dXJlIGZvciBgdHJhbnNmb3JtKClgIHdpbGwgYmUgdXNlZCB0byBjaGVjayB0aGVcbiAgICogdXNhZ2Ugb2YgdGhlIHBpcGUuIElmIHRoaXMgaXMgYGZhbHNlYCwgdGhlbiB0aGUgcmVzdWx0IG9mIGFwcGx5aW5nIGEgcGlwZSB3aWxsIGJlIGBhbnlgLCBhbmRcbiAgICogdGhlIHR5cGVzIG9mIHRoZSBwaXBlJ3MgdmFsdWUgYW5kIGFyZ3VtZW50cyB3aWxsIG5vdCBiZSBtYXRjaGVkIGFnYWluc3QgdGhlIGB0cmFuc2Zvcm0oKWBcbiAgICogbWV0aG9kLlxuICAgKi9cbiAgY2hlY2tUeXBlT2ZQaXBlczogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBuYXJyb3cgdGhlIHR5cGVzIG9mIHRlbXBsYXRlIGNvbnRleHRzLlxuICAgKi9cbiAgYXBwbHlUZW1wbGF0ZUNvbnRleHRHdWFyZHM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gdXNlIGEgc3RyaWN0IHR5cGUgZm9yIG51bGwtc2FmZSBuYXZpZ2F0aW9uIG9wZXJhdGlvbnMuXG4gICAqXG4gICAqIElmIHRoaXMgaXMgYGZhbHNlYCwgdGhlbiB0aGUgcmV0dXJuIHR5cGUgb2YgYGE/LmJgIG9yIGBhPygpYCB3aWxsIGJlIGBhbnlgLiBJZiBzZXQgdG8gYHRydWVgLFxuICAgKiB0aGVuIHRoZSByZXR1cm4gdHlwZSBvZiBgYT8uYmAgZm9yIGV4YW1wbGUgd2lsbCBiZSB0aGUgc2FtZSBhcyB0aGUgdHlwZSBvZiB0aGUgdGVybmFyeVxuICAgKiBleHByZXNzaW9uIGBhICE9IG51bGwgPyBhLmIgOiBhYC5cbiAgICovXG4gIHN0cmljdFNhZmVOYXZpZ2F0aW9uVHlwZXM6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZGVzY2VuZCBpbnRvIHRlbXBsYXRlIGJvZGllcyBhbmQgY2hlY2sgYW55IGJpbmRpbmdzIHRoZXJlLlxuICAgKi9cbiAgY2hlY2tUZW1wbGF0ZUJvZGllczogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBjaGVjayByZXNvbHZhYmxlIHF1ZXJpZXMuXG4gICAqXG4gICAqIFRoaXMgaXMgY3VycmVudGx5IGFuIHVuc3VwcG9ydGVkIGZlYXR1cmUuXG4gICAqL1xuICBjaGVja1F1ZXJpZXM6IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBhbnkgZ2VuZXJpYyB0eXBlcyBvZiB0aGUgY29udGV4dCBjb21wb25lbnQuXG4gICAqXG4gICAqIElmIHRoaXMgaXMgYHRydWVgLCB0aGVuIGlmIHRoZSBjb250ZXh0IGNvbXBvbmVudCBoYXMgZ2VuZXJpYyB0eXBlcywgdGhvc2Ugd2lsbCBiZSBtaXJyb3JlZCBpblxuICAgKiB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBjb250ZXh0LiBJZiBgZmFsc2VgLCBhbnkgZ2VuZXJpYyB0eXBlIHBhcmFtZXRlcnMgb2YgdGhlIGNvbnRleHRcbiAgICogY29tcG9uZW50IHdpbGwgYmUgc2V0IHRvIGBhbnlgIGR1cmluZyB0eXBlLWNoZWNraW5nLlxuICAgKi9cbiAgdXNlQ29udGV4dEdlbmVyaWNUeXBlOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG9yIG5vdCB0byBpbmZlciB0eXBlcyBmb3Igb2JqZWN0IGFuZCBhcnJheSBsaXRlcmFscyBpbiB0aGUgdGVtcGxhdGUuXG4gICAqXG4gICAqIElmIHRoaXMgaXMgYHRydWVgLCB0aGVuIHRoZSB0eXBlIG9mIGFuIG9iamVjdCBvciBhbiBhcnJheSBsaXRlcmFsIGluIHRoZSB0ZW1wbGF0ZSB3aWxsIGJlIHRoZVxuICAgKiBzYW1lIHR5cGUgdGhhdCBUeXBlU2NyaXB0IHdvdWxkIGluZmVyIGlmIHRoZSBsaXRlcmFsIGFwcGVhcmVkIGluIGNvZGUuIElmIGBmYWxzZWAsIHRoZW4gc3VjaFxuICAgKiBsaXRlcmFscyBhcmUgY2FzdCB0byBgYW55YCB3aGVuIGRlY2xhcmVkLlxuICAgKi9cbiAgc3RyaWN0TGl0ZXJhbFR5cGVzOiBib29sZWFuO1xufVxuXG5cbmV4cG9ydCB0eXBlIFRlbXBsYXRlU291cmNlTWFwcGluZyA9XG4gICAgRGlyZWN0VGVtcGxhdGVTb3VyY2VNYXBwaW5nfEluZGlyZWN0VGVtcGxhdGVTb3VyY2VNYXBwaW5nfEV4dGVybmFsVGVtcGxhdGVTb3VyY2VNYXBwaW5nO1xuXG4vKipcbiAqIEEgbWFwcGluZyB0byBhbiBpbmxpbmUgdGVtcGxhdGUgaW4gYSBUUyBmaWxlLlxuICpcbiAqIGBQYXJzZVNvdXJjZVNwYW5gcyBmb3IgdGhpcyB0ZW1wbGF0ZSBzaG91bGQgYmUgYWNjdXJhdGUgZm9yIGRpcmVjdCByZXBvcnRpbmcgaW4gYSBUUyBlcnJvclxuICogbWVzc2FnZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RUZW1wbGF0ZVNvdXJjZU1hcHBpbmcge1xuICB0eXBlOiAnZGlyZWN0JztcbiAgbm9kZTogdHMuU3RyaW5nTGl0ZXJhbHx0cy5Ob1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbDtcbn1cblxuLyoqXG4gKiBBIG1hcHBpbmcgdG8gYSB0ZW1wbGF0ZSB3aGljaCBpcyBzdGlsbCBpbiBhIFRTIGZpbGUsIGJ1dCB3aGVyZSB0aGUgbm9kZSBwb3NpdGlvbnMgaW4gYW55XG4gKiBgUGFyc2VTb3VyY2VTcGFuYHMgYXJlIG5vdCBhY2N1cmF0ZSBmb3Igb25lIHJlYXNvbiBvciBhbm90aGVyLlxuICpcbiAqIFRoaXMgY2FuIG9jY3VyIGlmIHRoZSB0ZW1wbGF0ZSBleHByZXNzaW9uIHdhcyBpbnRlcnBvbGF0ZWQgaW4gYSB3YXkgd2hlcmUgdGhlIGNvbXBpbGVyIGNvdWxkIG5vdFxuICogY29uc3RydWN0IGEgY29udGlndW91cyBtYXBwaW5nIGZvciB0aGUgdGVtcGxhdGUgc3RyaW5nLiBUaGUgYG5vZGVgIHJlZmVycyB0byB0aGUgYHRlbXBsYXRlYFxuICogZXhwcmVzc2lvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbmRpcmVjdFRlbXBsYXRlU291cmNlTWFwcGluZyB7XG4gIHR5cGU6ICdpbmRpcmVjdCc7XG4gIGNvbXBvbmVudENsYXNzOiBDbGFzc0RlY2xhcmF0aW9uO1xuICBub2RlOiB0cy5FeHByZXNzaW9uO1xuICB0ZW1wbGF0ZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgbWFwcGluZyB0byBhIHRlbXBsYXRlIGRlY2xhcmVkIGluIGFuIGV4dGVybmFsIEhUTUwgZmlsZSwgd2hlcmUgbm9kZSBwb3NpdGlvbnMgaW5cbiAqIGBQYXJzZVNvdXJjZVNwYW5gcyByZXByZXNlbnQgYWNjdXJhdGUgb2Zmc2V0cyBpbnRvIHRoZSBleHRlcm5hbCBmaWxlLlxuICpcbiAqIEluIHRoaXMgY2FzZSwgdGhlIGdpdmVuIGBub2RlYCByZWZlcnMgdG8gdGhlIGB0ZW1wbGF0ZVVybGAgZXhwcmVzc2lvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFeHRlcm5hbFRlbXBsYXRlU291cmNlTWFwcGluZyB7XG4gIHR5cGU6ICdleHRlcm5hbCc7XG4gIGNvbXBvbmVudENsYXNzOiBDbGFzc0RlY2xhcmF0aW9uO1xuICBub2RlOiB0cy5FeHByZXNzaW9uO1xuICB0ZW1wbGF0ZTogc3RyaW5nO1xuICB0ZW1wbGF0ZVVybDogc3RyaW5nO1xufVxuIl19