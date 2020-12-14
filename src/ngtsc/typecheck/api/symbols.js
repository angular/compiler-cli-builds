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
        define("@angular/compiler-cli/src/ngtsc/typecheck/api/symbols", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SymbolKind = void 0;
    var SymbolKind;
    (function (SymbolKind) {
        SymbolKind[SymbolKind["Input"] = 0] = "Input";
        SymbolKind[SymbolKind["Output"] = 1] = "Output";
        SymbolKind[SymbolKind["Binding"] = 2] = "Binding";
        SymbolKind[SymbolKind["Reference"] = 3] = "Reference";
        SymbolKind[SymbolKind["Variable"] = 4] = "Variable";
        SymbolKind[SymbolKind["Directive"] = 5] = "Directive";
        SymbolKind[SymbolKind["Element"] = 6] = "Element";
        SymbolKind[SymbolKind["Template"] = 7] = "Template";
        SymbolKind[SymbolKind["Expression"] = 8] = "Expression";
        SymbolKind[SymbolKind["DomBinding"] = 9] = "DomBinding";
        SymbolKind[SymbolKind["Pipe"] = 10] = "Pipe";
    })(SymbolKind = exports.SymbolKind || (exports.SymbolKind = {}));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaS9zeW1ib2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQVNILElBQVksVUFZWDtJQVpELFdBQVksVUFBVTtRQUNwQiw2Q0FBSyxDQUFBO1FBQ0wsK0NBQU0sQ0FBQTtRQUNOLGlEQUFPLENBQUE7UUFDUCxxREFBUyxDQUFBO1FBQ1QsbURBQVEsQ0FBQTtRQUNSLHFEQUFTLENBQUE7UUFDVCxpREFBTyxDQUFBO1FBQ1AsbURBQVEsQ0FBQTtRQUNSLHVEQUFVLENBQUE7UUFDVix1REFBVSxDQUFBO1FBQ1YsNENBQUksQ0FBQTtJQUNOLENBQUMsRUFaVyxVQUFVLEdBQVYsa0JBQVUsS0FBVixrQkFBVSxRQVlyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1RtcGxBc3RFbGVtZW50LCBUbXBsQXN0UmVmZXJlbmNlLCBUbXBsQXN0VGVtcGxhdGUsIFRtcGxBc3RWYXJpYWJsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0RpcmVjdGl2ZUluU2NvcGV9IGZyb20gJy4vc2NvcGUnO1xuXG5leHBvcnQgZW51bSBTeW1ib2xLaW5kIHtcbiAgSW5wdXQsXG4gIE91dHB1dCxcbiAgQmluZGluZyxcbiAgUmVmZXJlbmNlLFxuICBWYXJpYWJsZSxcbiAgRGlyZWN0aXZlLFxuICBFbGVtZW50LFxuICBUZW1wbGF0ZSxcbiAgRXhwcmVzc2lvbixcbiAgRG9tQmluZGluZyxcbiAgUGlwZSxcbn1cblxuLyoqXG4gKiBBIHJlcHJlc2VudGF0aW9uIG9mIGFuIGVudGl0eSBpbiB0aGUgYFRlbXBsYXRlQXN0YC5cbiAqL1xuZXhwb3J0IHR5cGUgU3ltYm9sID0gSW5wdXRCaW5kaW5nU3ltYm9sfE91dHB1dEJpbmRpbmdTeW1ib2x8RWxlbWVudFN5bWJvbHxSZWZlcmVuY2VTeW1ib2x8XG4gICAgVmFyaWFibGVTeW1ib2x8RXhwcmVzc2lvblN5bWJvbHxEaXJlY3RpdmVTeW1ib2x8VGVtcGxhdGVTeW1ib2x8RG9tQmluZGluZ1N5bWJvbHxQaXBlU3ltYm9sO1xuXG4vKipcbiAqIEEgYFN5bWJvbGAgd2hpY2ggZGVjbGFyZXMgYSBuZXcgbmFtZWQgZW50aXR5IGluIHRoZSB0ZW1wbGF0ZSBzY29wZS5cbiAqL1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVEZWNsYXJhdGlvblN5bWJvbCA9IFJlZmVyZW5jZVN5bWJvbHxWYXJpYWJsZVN5bWJvbDtcblxuLyoqIEluZm9ybWF0aW9uIGFib3V0IHdoZXJlIGEgYHRzLk5vZGVgIGNhbiBiZSBmb3VuZCBpbiB0aGUgdHlwZSBjaGVjayBibG9jayBzaGltIGZpbGUuICovXG5leHBvcnQgaW50ZXJmYWNlIFNoaW1Mb2NhdGlvbiB7XG4gIC8qKlxuICAgKiBUaGUgZnVsbHkgcXVhbGlmaWVkIHBhdGggb2YgdGhlIGZpbGUgd2hpY2ggY29udGFpbnMgdGhlIGdlbmVyYXRlZCBUeXBlU2NyaXB0IHR5cGUgY2hlY2tcbiAgICogY29kZSBmb3IgdGhlIGNvbXBvbmVudCdzIHRlbXBsYXRlLlxuICAgKi9cbiAgc2hpbVBhdGg6IEFic29sdXRlRnNQYXRoO1xuXG4gIC8qKiBUaGUgbG9jYXRpb24gaW4gdGhlIHNoaW0gZmlsZSB3aGVyZSBub2RlIGFwcGVhcnMuICovXG4gIHBvc2l0aW9uSW5TaGltRmlsZTogbnVtYmVyO1xufVxuXG4vKipcbiAqIEEgZ2VuZXJpYyByZXByZXNlbnRhdGlvbiBvZiBzb21lIG5vZGUgaW4gYSB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUc05vZGVTeW1ib2xJbmZvIHtcbiAgLyoqIFRoZSBgdHMuVHlwZWAgb2YgdGhlIHRlbXBsYXRlIG5vZGUuICovXG4gIHRzVHlwZTogdHMuVHlwZTtcblxuICAvKiogVGhlIGB0cy5TeW1ib2xgIGZvciB0aGUgdGVtcGxhdGUgbm9kZSAqL1xuICB0c1N5bWJvbDogdHMuU3ltYm9sfG51bGw7XG5cbiAgLyoqIFRoZSBwb3NpdGlvbiBvZiB0aGUgbW9zdCByZWxldmFudCBwYXJ0IG9mIHRoZSB0ZW1wbGF0ZSBub2RlLiAqL1xuICBzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbjtcbn1cblxuLyoqXG4gKiBBIHJlcHJlc2VudGF0aW9uIG9mIGFuIGV4cHJlc3Npb24gaW4gYSBjb21wb25lbnQgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhwcmVzc2lvblN5bWJvbCB7XG4gIGtpbmQ6IFN5bWJvbEtpbmQuRXhwcmVzc2lvbjtcblxuICAvKiogVGhlIGB0cy5UeXBlYCBvZiB0aGUgZXhwcmVzc2lvbiBBU1QuICovXG4gIHRzVHlwZTogdHMuVHlwZTtcblxuICAvKipcbiAgICogVGhlIGB0cy5TeW1ib2xgIG9mIHRoZSBlbnRpdHkuIFRoaXMgY291bGQgYmUgYG51bGxgLCBmb3IgZXhhbXBsZSBgQVNUYCBleHByZXNzaW9uXG4gICAqIGB7e2Zvby5iYXIgKyBmb28uYmF6fX1gIGRvZXMgbm90IGhhdmUgYSBgdHMuU3ltYm9sYCBidXQgYGZvby5iYXJgIGFuZCBgZm9vLmJhemAgYm90aCBkby5cbiAgICovXG4gIHRzU3ltYm9sOiB0cy5TeW1ib2x8bnVsbDtcblxuICAvKiogVGhlIHBvc2l0aW9uIG9mIHRoZSBtb3N0IHJlbGV2YW50IHBhcnQgb2YgdGhlIGV4cHJlc3Npb24uICovXG4gIHNoaW1Mb2NhdGlvbjogU2hpbUxvY2F0aW9uO1xufVxuXG4vKiogUmVwcmVzZW50cyBlaXRoZXIgYW4gaW5wdXQgb3Igb3V0cHV0IGJpbmRpbmcgaW4gYSB0ZW1wbGF0ZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQmluZGluZ1N5bWJvbCB7XG4gIGtpbmQ6IFN5bWJvbEtpbmQuQmluZGluZztcblxuICAvKiogVGhlIGB0cy5UeXBlYCBvZiB0aGUgY2xhc3MgbWVtYmVyIG9uIHRoZSBkaXJlY3RpdmUgdGhhdCBpcyB0aGUgdGFyZ2V0IG9mIHRoZSBiaW5kaW5nLiAqL1xuICB0c1R5cGU6IHRzLlR5cGU7XG5cbiAgLyoqIFRoZSBgdHMuU3ltYm9sYCBvZiB0aGUgY2xhc3MgbWVtYmVyIG9uIHRoZSBkaXJlY3RpdmUgdGhhdCBpcyB0aGUgdGFyZ2V0IG9mIHRoZSBiaW5kaW5nLiAqL1xuICB0c1N5bWJvbDogdHMuU3ltYm9sO1xuXG4gIC8qKlxuICAgKiBUaGUgYERpcmVjdGl2ZVN5bWJvbGAgb3IgYEVsZW1lbnRTeW1ib2xgIGZvciB0aGUgRGlyZWN0aXZlLCBDb21wb25lbnQsIG9yIGBIVE1MRWxlbWVudGAgd2l0aFxuICAgKiB0aGUgYmluZGluZy5cbiAgICovXG4gIHRhcmdldDogRGlyZWN0aXZlU3ltYm9sfEVsZW1lbnRTeW1ib2x8VGVtcGxhdGVTeW1ib2w7XG5cbiAgLyoqIFRoZSBsb2NhdGlvbiBpbiB0aGUgc2hpbSBmaWxlIHdoZXJlIHRoZSBmaWVsZCBhY2Nlc3MgZm9yIHRoZSBiaW5kaW5nIGFwcGVhcnMuICovXG4gIHNoaW1Mb2NhdGlvbjogU2hpbUxvY2F0aW9uO1xufVxuXG4vKipcbiAqIEEgcmVwcmVzZW50YXRpb24gb2YgYW4gaW5wdXQgYmluZGluZyBpbiBhIGNvbXBvbmVudCB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJbnB1dEJpbmRpbmdTeW1ib2wge1xuICBraW5kOiBTeW1ib2xLaW5kLklucHV0O1xuXG4gIC8qKiBBIHNpbmdsZSBpbnB1dCBtYXkgYmUgYm91bmQgdG8gbXVsdGlwbGUgY29tcG9uZW50cyBvciBkaXJlY3RpdmVzLiAqL1xuICBiaW5kaW5nczogQmluZGluZ1N5bWJvbFtdO1xufVxuXG4vKipcbiAqIEEgcmVwcmVzZW50YXRpb24gb2YgYW4gb3V0cHV0IGJpbmRpbmcgaW4gYSBjb21wb25lbnQgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgT3V0cHV0QmluZGluZ1N5bWJvbCB7XG4gIGtpbmQ6IFN5bWJvbEtpbmQuT3V0cHV0O1xuXG4gIC8qKiBBIHNpbmdsZSBvdXRwdXQgbWF5IGJlIGJvdW5kIHRvIG11bHRpcGxlIGNvbXBvbmVudHMgb3IgZGlyZWN0aXZlcy4gKi9cbiAgYmluZGluZ3M6IEJpbmRpbmdTeW1ib2xbXTtcbn1cblxuLyoqXG4gKiBBIHJlcHJlc2VudGF0aW9uIG9mIGEgbG9jYWwgcmVmZXJlbmNlIGluIGEgY29tcG9uZW50IHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlZmVyZW5jZVN5bWJvbCB7XG4gIGtpbmQ6IFN5bWJvbEtpbmQuUmVmZXJlbmNlO1xuXG4gIC8qKlxuICAgKiBUaGUgYHRzLlR5cGVgIG9mIHRoZSBSZWZlcmVuY2UgdmFsdWUuXG4gICAqXG4gICAqIGBUbXBsQXN0VGVtcGxhdGVgIC0gVGhlIHR5cGUgb2YgdGhlIGBUZW1wbGF0ZVJlZmBcbiAgICogYFRtcGxBc3RFbGVtZW50YCAtIFRoZSBgdHMuVHlwZWAgZm9yIHRoZSBgSFRNTEVsZW1lbnRgLlxuICAgKiBEaXJlY3RpdmUgLSBUaGUgYHRzLlR5cGVgIGZvciB0aGUgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICB0c1R5cGU6IHRzLlR5cGU7XG5cbiAgLyoqXG4gICAqIFRoZSBgdHMuU3ltYm9sYCBmb3IgdGhlIFJlZmVyZW5jZSB2YWx1ZS5cbiAgICpcbiAgICogYFRtcGxBc3RUZW1wbGF0ZWAgLSBBIGBUZW1wbGF0ZVJlZmAgc3ltYm9sLlxuICAgKiBgVG1wbEFzdEVsZW1lbnRgIC0gVGhlIHN5bWJvbCBmb3IgdGhlIGBIVE1MRWxlbWVudGAuXG4gICAqIERpcmVjdGl2ZSAtIFRoZSBzeW1ib2wgZm9yIHRoZSBjbGFzcyBkZWNsYXJhdGlvbiBvZiB0aGUgZGlyZWN0aXZlLlxuICAgKi9cbiAgdHNTeW1ib2w6IHRzLlN5bWJvbDtcblxuICAvKipcbiAgICogRGVwZW5kaW5nIG9uIHRoZSB0eXBlIG9mIHRoZSByZWZlcmVuY2UsIHRoaXMgaXMgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG4gICAqICAtIGBUbXBsQXN0RWxlbWVudGAgd2hlbiB0aGUgbG9jYWwgcmVmIHJlZmVycyB0byB0aGUgSFRNTCBlbGVtZW50XG4gICAqICAtIGBUbXBsQXN0VGVtcGxhdGVgIHdoZW4gdGhlIHJlZiByZWZlcnMgdG8gYW4gYG5nLXRlbXBsYXRlYFxuICAgKiAgLSBgdHMuQ2xhc3NEZWNsYXJhdGlvbmAgd2hlbiB0aGUgbG9jYWwgcmVmIHJlZmVycyB0byBhIERpcmVjdGl2ZSBpbnN0YW5jZSAoI3JlZj1cIm15RXhwb3J0QXNcIilcbiAgICovXG4gIHRhcmdldDogVG1wbEFzdEVsZW1lbnR8VG1wbEFzdFRlbXBsYXRlfHRzLkNsYXNzRGVjbGFyYXRpb247XG5cbiAgLyoqXG4gICAqIFRoZSBub2RlIGluIHRoZSBgVGVtcGxhdGVBc3RgIHdoZXJlIHRoZSBzeW1ib2wgaXMgZGVjbGFyZWQuIFRoYXQgaXMsIG5vZGUgZm9yIHRoZSBgI3JlZmAgb3JcbiAgICogYCNyZWY9XCJleHBvcnRBc1wiYC5cbiAgICovXG4gIGRlY2xhcmF0aW9uOiBUbXBsQXN0UmVmZXJlbmNlO1xuXG4gIC8qKlxuICAgKiBUaGUgbG9jYXRpb24gaW4gdGhlIHNoaW0gZmlsZSBvZiBhIHZhcmlhYmxlIHRoYXQgaG9sZHMgdGhlIHR5cGUgb2YgdGhlIGxvY2FsIHJlZi5cbiAgICogRm9yIGV4YW1wbGUsIGEgcmVmZXJlbmNlIGRlY2xhcmF0aW9uIGxpa2UgdGhlIGZvbGxvd2luZzpcbiAgICogYGBgXG4gICAqIHZhciBfdDEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICogdmFyIF90MiA9IF90MTsgLy8gVGhpcyBpcyB0aGUgcmVmZXJlbmNlIGRlY2xhcmF0aW9uXG4gICAqIGBgYFxuICAgKiBUaGlzIGB0YXJnZXRMb2NhdGlvbmAgaXMgYFtfdDEgdmFyaWFibGUgZGVjbGFyYXRpb25dLmdldFN0YXJ0KClgLlxuICAgKi9cbiAgdGFyZ2V0TG9jYXRpb246IFNoaW1Mb2NhdGlvbjtcblxuICAvKipcbiAgICogVGhlIGxvY2F0aW9uIGluIHRoZSBUQ0IgZm9yIHRoZSBpZGVudGlmaWVyIG5vZGUgaW4gdGhlIHJlZmVyZW5jZSB2YXJpYWJsZSBkZWNsYXJhdGlvbi5cbiAgICogRm9yIGV4YW1wbGUsIGdpdmVuIGEgdmFyaWFibGUgZGVjbGFyYXRpb24gc3RhdGVtZW50IGZvciBhIHRlbXBsYXRlIHJlZmVyZW5jZTpcbiAgICogYHZhciBfdDIgPSBfdDFgLCB0aGlzIGxvY2F0aW9uIGlzIGBbX3QyIG5vZGVdLmdldFN0YXJ0KClgLiBUaGlzIGxvY2F0aW9uIGNhblxuICAgKiBiZSB1c2VkIHRvIGZpbmQgcmVmZXJlbmNlcyB0byB0aGUgdmFyaWFibGUgd2l0aGluIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIHJlZmVyZW5jZVZhckxvY2F0aW9uOiBTaGltTG9jYXRpb247XG59XG5cbi8qKlxuICogQSByZXByZXNlbnRhdGlvbiBvZiBhIGNvbnRleHQgdmFyaWFibGUgaW4gYSBjb21wb25lbnQgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVmFyaWFibGVTeW1ib2wge1xuICBraW5kOiBTeW1ib2xLaW5kLlZhcmlhYmxlO1xuXG4gIC8qKlxuICAgKiBUaGUgYHRzLlR5cGVgIG9mIHRoZSBlbnRpdHkuXG4gICAqXG4gICAqIFRoaXMgd2lsbCBiZSBgYW55YCBpZiB0aGVyZSBpcyBubyBgbmdUZW1wbGF0ZUNvbnRleHRHdWFyZGAuXG4gICAqL1xuICB0c1R5cGU6IHRzLlR5cGU7XG5cbiAgLyoqXG4gICAqIFRoZSBgdHMuU3ltYm9sYCBmb3IgdGhlIGNvbnRleHQgdmFyaWFibGUuXG4gICAqXG4gICAqIFRoaXMgd2lsbCBiZSBgbnVsbGAgaWYgdGhlcmUgaXMgbm8gYG5nVGVtcGxhdGVDb250ZXh0R3VhcmRgLlxuICAgKi9cbiAgdHNTeW1ib2w6IHRzLlN5bWJvbHxudWxsO1xuXG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgYFRlbXBsYXRlQXN0YCB3aGVyZSB0aGUgdmFyaWFibGUgaXMgZGVjbGFyZWQuIFRoYXQgaXMsIHRoZSBub2RlIGZvciB0aGUgYGxldC1gXG4gICAqIG5vZGUgaW4gdGhlIHRlbXBsYXRlLlxuICAgKi9cbiAgZGVjbGFyYXRpb246IFRtcGxBc3RWYXJpYWJsZTtcblxuICAvKipcbiAgICogVGhlIGxvY2F0aW9uIGluIHRoZSBzaGltIGZpbGUgZm9yIHRoZSBpZGVudGlmaWVyIHRoYXQgd2FzIGRlY2xhcmVkIGZvciB0aGUgdGVtcGxhdGUgdmFyaWFibGUuXG4gICAqL1xuICBsb2NhbFZhckxvY2F0aW9uOiBTaGltTG9jYXRpb247XG5cbiAgLyoqXG4gICAqIFRoZSBsb2NhdGlvbiBpbiB0aGUgc2hpbSBmaWxlIGZvciB0aGUgaW5pdGlhbGl6ZXIgbm9kZSBvZiB0aGUgdmFyaWFibGUgdGhhdCByZXByZXNlbnRzIHRoZVxuICAgKiB0ZW1wbGF0ZSB2YXJpYWJsZS5cbiAgICovXG4gIGluaXRpYWxpemVyTG9jYXRpb246IFNoaW1Mb2NhdGlvbjtcbn1cblxuLyoqXG4gKiBBIHJlcHJlc2VudGF0aW9uIG9mIGFuIGVsZW1lbnQgaW4gYSBjb21wb25lbnQgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRWxlbWVudFN5bWJvbCB7XG4gIGtpbmQ6IFN5bWJvbEtpbmQuRWxlbWVudDtcblxuICAvKiogVGhlIGB0cy5UeXBlYCBmb3IgdGhlIGBIVE1MRWxlbWVudGAuICovXG4gIHRzVHlwZTogdHMuVHlwZTtcblxuICAvKiogVGhlIGB0cy5TeW1ib2xgIGZvciB0aGUgYEhUTUxFbGVtZW50YC4gKi9cbiAgdHNTeW1ib2w6IHRzLlN5bWJvbHxudWxsO1xuXG4gIC8qKiBBIGxpc3Qgb2YgZGlyZWN0aXZlcyBhcHBsaWVkIHRvIHRoZSBlbGVtZW50LiAqL1xuICBkaXJlY3RpdmVzOiBEaXJlY3RpdmVTeW1ib2xbXTtcblxuICAvKiogVGhlIGxvY2F0aW9uIGluIHRoZSBzaGltIGZpbGUgZm9yIHRoZSB2YXJpYWJsZSB0aGF0IGhvbGRzIHRoZSB0eXBlIG9mIHRoZSBlbGVtZW50LiAqL1xuICBzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbjtcblxuICB0ZW1wbGF0ZU5vZGU6IFRtcGxBc3RFbGVtZW50O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlU3ltYm9sIHtcbiAga2luZDogU3ltYm9sS2luZC5UZW1wbGF0ZTtcblxuICAvKiogQSBsaXN0IG9mIGRpcmVjdGl2ZXMgYXBwbGllZCB0byB0aGUgZWxlbWVudC4gKi9cbiAgZGlyZWN0aXZlczogRGlyZWN0aXZlU3ltYm9sW107XG5cbiAgdGVtcGxhdGVOb2RlOiBUbXBsQXN0VGVtcGxhdGU7XG59XG5cbi8qKlxuICogQSByZXByZXNlbnRhdGlvbiBvZiBhIGRpcmVjdGl2ZS9jb21wb25lbnQgd2hvc2Ugc2VsZWN0b3IgbWF0Y2hlcyBhIG5vZGUgaW4gYSBjb21wb25lbnRcbiAqIHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERpcmVjdGl2ZVN5bWJvbCBleHRlbmRzIERpcmVjdGl2ZUluU2NvcGUge1xuICBraW5kOiBTeW1ib2xLaW5kLkRpcmVjdGl2ZTtcblxuICAvKiogVGhlIGB0cy5UeXBlYCBmb3IgdGhlIGNsYXNzIGRlY2xhcmF0aW9uLiAqL1xuICB0c1R5cGU6IHRzLlR5cGU7XG5cbiAgLyoqIFRoZSBsb2NhdGlvbiBpbiB0aGUgc2hpbSBmaWxlIGZvciB0aGUgdmFyaWFibGUgdGhhdCBob2xkcyB0aGUgdHlwZSBvZiB0aGUgZGlyZWN0aXZlLiAqL1xuICBzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbjtcbn1cblxuLyoqXG4gKiBBIHJlcHJlc2VudGF0aW9uIG9mIGFuIGF0dHJpYnV0ZSBvbiBhbiBlbGVtZW50IG9yIHRlbXBsYXRlLiBUaGVzZSBiaW5kaW5ncyBhcmVuJ3QgY3VycmVudGx5XG4gKiB0eXBlLWNoZWNrZWQgKHNlZSBgY2hlY2tUeXBlT2ZEb21CaW5kaW5nc2ApIHNvIHRoZXkgd29uJ3QgaGF2ZSBhIGB0cy5UeXBlYCwgYHRzLlN5bWJvbGAsIG9yIHNoaW1cbiAqIGxvY2F0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIERvbUJpbmRpbmdTeW1ib2wge1xuICBraW5kOiBTeW1ib2xLaW5kLkRvbUJpbmRpbmc7XG5cbiAgLyoqIFRoZSBzeW1ib2wgZm9yIHRoZSBlbGVtZW50IG9yIHRlbXBsYXRlIG9mIHRoZSB0ZXh0IGF0dHJpYnV0ZS4gKi9cbiAgaG9zdDogRWxlbWVudFN5bWJvbHxUZW1wbGF0ZVN5bWJvbDtcbn1cblxuLyoqXG4gKiBBIHJlcHJlc2VudGF0aW9uIGZvciBhIGNhbGwgdG8gYSBwaXBlJ3MgdHJhbnNmb3JtIG1ldGhvZCBpbiB0aGUgVENCLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBpcGVTeW1ib2wge1xuICBraW5kOiBTeW1ib2xLaW5kLlBpcGU7XG5cbiAgLyoqIFRoZSBgdHMuVHlwZWAgb2YgdGhlIHRyYW5zZm9ybSBub2RlLiAqL1xuICB0c1R5cGU6IHRzLlR5cGU7XG5cbiAgLyoqXG4gICAqIFRoZSBgdHMuU3ltYm9sYCBmb3IgdGhlIHRyYW5zZm9ybSBjYWxsLiBUaGlzIGNvdWxkIGJlIGBudWxsYCB3aGVuIGBjaGVja1R5cGVPZlBpcGVzYCBpcyBzZXQgdG9cbiAgICogYGZhbHNlYCBiZWNhdXNlIHRoZSB0cmFuc2Zvcm0gY2FsbCB3b3VsZCBiZSBvZiB0aGUgZm9ybSBgKF9waXBlMSBhcyBhbnkpLnRyYW5zZm9ybSgpYFxuICAgKi9cbiAgdHNTeW1ib2w6IHRzLlN5bWJvbHxudWxsO1xuXG4gIC8qKiBUaGUgcG9zaXRpb24gb2YgdGhlIHRyYW5zZm9ybSBjYWxsIGluIHRoZSB0ZW1wbGF0ZS4gKi9cbiAgc2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb247XG5cbiAgLyoqIFRoZSBzeW1ib2wgZm9yIHRoZSBwaXBlIGNsYXNzIGFzIGFuIGluc3RhbmNlIHRoYXQgYXBwZWFycyBpbiB0aGUgVENCLiAqL1xuICBjbGFzc1N5bWJvbDogQ2xhc3NTeW1ib2w7XG59XG5cbi8qKiBSZXByZXNlbnRzIGFuIGluc3RhbmNlIG9mIGEgY2xhc3MgZm91bmQgaW4gdGhlIFRDQiwgaS5lLiBgdmFyIF9waXBlMTogTXlQaXBlID0gbnVsbCE7ICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzU3ltYm9sIHtcbiAgLyoqIFRoZSBgdHMuVHlwZWAgb2YgY2xhc3MuICovXG4gIHRzVHlwZTogdHMuVHlwZTtcblxuICAvKiogVGhlIGB0cy5TeW1ib2xgIGZvciBjbGFzcy4gKi9cbiAgdHNTeW1ib2w6IHRzLlN5bWJvbDtcblxuICAvKiogVGhlIHBvc2l0aW9uIGZvciB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gZm9yIHRoZSBjbGFzcyBpbnN0YW5jZS4gKi9cbiAgc2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb247XG59XG4iXX0=