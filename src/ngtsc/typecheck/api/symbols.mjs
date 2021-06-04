/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export var SymbolKind;
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
})(SymbolKind || (SymbolKind = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHlwZWNoZWNrL2FwaS9zeW1ib2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQVVILE1BQU0sQ0FBTixJQUFZLFVBWVg7QUFaRCxXQUFZLFVBQVU7SUFDcEIsNkNBQUssQ0FBQTtJQUNMLCtDQUFNLENBQUE7SUFDTixpREFBTyxDQUFBO0lBQ1AscURBQVMsQ0FBQTtJQUNULG1EQUFRLENBQUE7SUFDUixxREFBUyxDQUFBO0lBQ1QsaURBQU8sQ0FBQTtJQUNQLG1EQUFRLENBQUE7SUFDUix1REFBVSxDQUFBO0lBQ1YsdURBQVUsQ0FBQTtJQUNWLDRDQUFJLENBQUE7QUFDTixDQUFDLEVBWlcsVUFBVSxLQUFWLFVBQVUsUUFZckIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtUbXBsQXN0RWxlbWVudCwgVG1wbEFzdFJlZmVyZW5jZSwgVG1wbEFzdFRlbXBsYXRlLCBUbXBsQXN0VmFyaWFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1N5bWJvbFdpdGhWYWx1ZURlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEaXJlY3RpdmVJblNjb3BlfSBmcm9tICcuL3Njb3BlJztcblxuZXhwb3J0IGVudW0gU3ltYm9sS2luZCB7XG4gIElucHV0LFxuICBPdXRwdXQsXG4gIEJpbmRpbmcsXG4gIFJlZmVyZW5jZSxcbiAgVmFyaWFibGUsXG4gIERpcmVjdGl2ZSxcbiAgRWxlbWVudCxcbiAgVGVtcGxhdGUsXG4gIEV4cHJlc3Npb24sXG4gIERvbUJpbmRpbmcsXG4gIFBpcGUsXG59XG5cbi8qKlxuICogQSByZXByZXNlbnRhdGlvbiBvZiBhbiBlbnRpdHkgaW4gdGhlIGBUZW1wbGF0ZUFzdGAuXG4gKi9cbmV4cG9ydCB0eXBlIFN5bWJvbCA9IElucHV0QmluZGluZ1N5bWJvbHxPdXRwdXRCaW5kaW5nU3ltYm9sfEVsZW1lbnRTeW1ib2x8UmVmZXJlbmNlU3ltYm9sfFxuICAgIFZhcmlhYmxlU3ltYm9sfEV4cHJlc3Npb25TeW1ib2x8RGlyZWN0aXZlU3ltYm9sfFRlbXBsYXRlU3ltYm9sfERvbUJpbmRpbmdTeW1ib2x8UGlwZVN5bWJvbDtcblxuLyoqXG4gKiBBIGBTeW1ib2xgIHdoaWNoIGRlY2xhcmVzIGEgbmV3IG5hbWVkIGVudGl0eSBpbiB0aGUgdGVtcGxhdGUgc2NvcGUuXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlRGVjbGFyYXRpb25TeW1ib2wgPSBSZWZlcmVuY2VTeW1ib2x8VmFyaWFibGVTeW1ib2w7XG5cbi8qKiBJbmZvcm1hdGlvbiBhYm91dCB3aGVyZSBhIGB0cy5Ob2RlYCBjYW4gYmUgZm91bmQgaW4gdGhlIHR5cGUgY2hlY2sgYmxvY2sgc2hpbSBmaWxlLiAqL1xuZXhwb3J0IGludGVyZmFjZSBTaGltTG9jYXRpb24ge1xuICAvKipcbiAgICogVGhlIGZ1bGx5IHF1YWxpZmllZCBwYXRoIG9mIHRoZSBmaWxlIHdoaWNoIGNvbnRhaW5zIHRoZSBnZW5lcmF0ZWQgVHlwZVNjcmlwdCB0eXBlIGNoZWNrXG4gICAqIGNvZGUgZm9yIHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZS5cbiAgICovXG4gIHNoaW1QYXRoOiBBYnNvbHV0ZUZzUGF0aDtcblxuICAvKiogVGhlIGxvY2F0aW9uIGluIHRoZSBzaGltIGZpbGUgd2hlcmUgbm9kZSBhcHBlYXJzLiAqL1xuICBwb3NpdGlvbkluU2hpbUZpbGU6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBBIGdlbmVyaWMgcmVwcmVzZW50YXRpb24gb2Ygc29tZSBub2RlIGluIGEgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHNOb2RlU3ltYm9sSW5mbyB7XG4gIC8qKiBUaGUgYHRzLlR5cGVgIG9mIHRoZSB0ZW1wbGF0ZSBub2RlLiAqL1xuICB0c1R5cGU6IHRzLlR5cGU7XG5cbiAgLyoqIFRoZSBgdHMuU3ltYm9sYCBmb3IgdGhlIHRlbXBsYXRlIG5vZGUgKi9cbiAgdHNTeW1ib2w6IHRzLlN5bWJvbHxudWxsO1xuXG4gIC8qKiBUaGUgcG9zaXRpb24gb2YgdGhlIG1vc3QgcmVsZXZhbnQgcGFydCBvZiB0aGUgdGVtcGxhdGUgbm9kZS4gKi9cbiAgc2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb247XG59XG5cbi8qKlxuICogQSByZXByZXNlbnRhdGlvbiBvZiBhbiBleHByZXNzaW9uIGluIGEgY29tcG9uZW50IHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV4cHJlc3Npb25TeW1ib2wge1xuICBraW5kOiBTeW1ib2xLaW5kLkV4cHJlc3Npb247XG5cbiAgLyoqIFRoZSBgdHMuVHlwZWAgb2YgdGhlIGV4cHJlc3Npb24gQVNULiAqL1xuICB0c1R5cGU6IHRzLlR5cGU7XG5cbiAgLyoqXG4gICAqIFRoZSBgdHMuU3ltYm9sYCBvZiB0aGUgZW50aXR5LiBUaGlzIGNvdWxkIGJlIGBudWxsYCwgZm9yIGV4YW1wbGUgYEFTVGAgZXhwcmVzc2lvblxuICAgKiBge3tmb28uYmFyICsgZm9vLmJhen19YCBkb2VzIG5vdCBoYXZlIGEgYHRzLlN5bWJvbGAgYnV0IGBmb28uYmFyYCBhbmQgYGZvby5iYXpgIGJvdGggZG8uXG4gICAqL1xuICB0c1N5bWJvbDogdHMuU3ltYm9sfG51bGw7XG5cbiAgLyoqIFRoZSBwb3NpdGlvbiBvZiB0aGUgbW9zdCByZWxldmFudCBwYXJ0IG9mIHRoZSBleHByZXNzaW9uLiAqL1xuICBzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbjtcbn1cblxuLyoqIFJlcHJlc2VudHMgZWl0aGVyIGFuIGlucHV0IG9yIG91dHB1dCBiaW5kaW5nIGluIGEgdGVtcGxhdGUuICovXG5leHBvcnQgaW50ZXJmYWNlIEJpbmRpbmdTeW1ib2wge1xuICBraW5kOiBTeW1ib2xLaW5kLkJpbmRpbmc7XG5cbiAgLyoqIFRoZSBgdHMuVHlwZWAgb2YgdGhlIGNsYXNzIG1lbWJlciBvbiB0aGUgZGlyZWN0aXZlIHRoYXQgaXMgdGhlIHRhcmdldCBvZiB0aGUgYmluZGluZy4gKi9cbiAgdHNUeXBlOiB0cy5UeXBlO1xuXG4gIC8qKiBUaGUgYHRzLlN5bWJvbGAgb2YgdGhlIGNsYXNzIG1lbWJlciBvbiB0aGUgZGlyZWN0aXZlIHRoYXQgaXMgdGhlIHRhcmdldCBvZiB0aGUgYmluZGluZy4gKi9cbiAgdHNTeW1ib2w6IHRzLlN5bWJvbDtcblxuICAvKipcbiAgICogVGhlIGBEaXJlY3RpdmVTeW1ib2xgIG9yIGBFbGVtZW50U3ltYm9sYCBmb3IgdGhlIERpcmVjdGl2ZSwgQ29tcG9uZW50LCBvciBgSFRNTEVsZW1lbnRgIHdpdGhcbiAgICogdGhlIGJpbmRpbmcuXG4gICAqL1xuICB0YXJnZXQ6IERpcmVjdGl2ZVN5bWJvbHxFbGVtZW50U3ltYm9sfFRlbXBsYXRlU3ltYm9sO1xuXG4gIC8qKiBUaGUgbG9jYXRpb24gaW4gdGhlIHNoaW0gZmlsZSB3aGVyZSB0aGUgZmllbGQgYWNjZXNzIGZvciB0aGUgYmluZGluZyBhcHBlYXJzLiAqL1xuICBzaGltTG9jYXRpb246IFNoaW1Mb2NhdGlvbjtcbn1cblxuLyoqXG4gKiBBIHJlcHJlc2VudGF0aW9uIG9mIGFuIGlucHV0IGJpbmRpbmcgaW4gYSBjb21wb25lbnQgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW5wdXRCaW5kaW5nU3ltYm9sIHtcbiAga2luZDogU3ltYm9sS2luZC5JbnB1dDtcblxuICAvKiogQSBzaW5nbGUgaW5wdXQgbWF5IGJlIGJvdW5kIHRvIG11bHRpcGxlIGNvbXBvbmVudHMgb3IgZGlyZWN0aXZlcy4gKi9cbiAgYmluZGluZ3M6IEJpbmRpbmdTeW1ib2xbXTtcbn1cblxuLyoqXG4gKiBBIHJlcHJlc2VudGF0aW9uIG9mIGFuIG91dHB1dCBiaW5kaW5nIGluIGEgY29tcG9uZW50IHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE91dHB1dEJpbmRpbmdTeW1ib2wge1xuICBraW5kOiBTeW1ib2xLaW5kLk91dHB1dDtcblxuICAvKiogQSBzaW5nbGUgb3V0cHV0IG1heSBiZSBib3VuZCB0byBtdWx0aXBsZSBjb21wb25lbnRzIG9yIGRpcmVjdGl2ZXMuICovXG4gIGJpbmRpbmdzOiBCaW5kaW5nU3ltYm9sW107XG59XG5cbi8qKlxuICogQSByZXByZXNlbnRhdGlvbiBvZiBhIGxvY2FsIHJlZmVyZW5jZSBpbiBhIGNvbXBvbmVudCB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWZlcmVuY2VTeW1ib2wge1xuICBraW5kOiBTeW1ib2xLaW5kLlJlZmVyZW5jZTtcblxuICAvKipcbiAgICogVGhlIGB0cy5UeXBlYCBvZiB0aGUgUmVmZXJlbmNlIHZhbHVlLlxuICAgKlxuICAgKiBgVG1wbEFzdFRlbXBsYXRlYCAtIFRoZSB0eXBlIG9mIHRoZSBgVGVtcGxhdGVSZWZgXG4gICAqIGBUbXBsQXN0RWxlbWVudGAgLSBUaGUgYHRzLlR5cGVgIGZvciB0aGUgYEhUTUxFbGVtZW50YC5cbiAgICogRGlyZWN0aXZlIC0gVGhlIGB0cy5UeXBlYCBmb3IgdGhlIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgdHNUeXBlOiB0cy5UeXBlO1xuXG4gIC8qKlxuICAgKiBUaGUgYHRzLlN5bWJvbGAgZm9yIHRoZSBSZWZlcmVuY2UgdmFsdWUuXG4gICAqXG4gICAqIGBUbXBsQXN0VGVtcGxhdGVgIC0gQSBgVGVtcGxhdGVSZWZgIHN5bWJvbC5cbiAgICogYFRtcGxBc3RFbGVtZW50YCAtIFRoZSBzeW1ib2wgZm9yIHRoZSBgSFRNTEVsZW1lbnRgLlxuICAgKiBEaXJlY3RpdmUgLSBUaGUgc3ltYm9sIGZvciB0aGUgY2xhc3MgZGVjbGFyYXRpb24gb2YgdGhlIGRpcmVjdGl2ZS5cbiAgICovXG4gIHRzU3ltYm9sOiB0cy5TeW1ib2w7XG5cbiAgLyoqXG4gICAqIERlcGVuZGluZyBvbiB0aGUgdHlwZSBvZiB0aGUgcmVmZXJlbmNlLCB0aGlzIGlzIG9uZSBvZiB0aGUgZm9sbG93aW5nOlxuICAgKiAgLSBgVG1wbEFzdEVsZW1lbnRgIHdoZW4gdGhlIGxvY2FsIHJlZiByZWZlcnMgdG8gdGhlIEhUTUwgZWxlbWVudFxuICAgKiAgLSBgVG1wbEFzdFRlbXBsYXRlYCB3aGVuIHRoZSByZWYgcmVmZXJzIHRvIGFuIGBuZy10ZW1wbGF0ZWBcbiAgICogIC0gYHRzLkNsYXNzRGVjbGFyYXRpb25gIHdoZW4gdGhlIGxvY2FsIHJlZiByZWZlcnMgdG8gYSBEaXJlY3RpdmUgaW5zdGFuY2UgKCNyZWY9XCJteUV4cG9ydEFzXCIpXG4gICAqL1xuICB0YXJnZXQ6IFRtcGxBc3RFbGVtZW50fFRtcGxBc3RUZW1wbGF0ZXx0cy5DbGFzc0RlY2xhcmF0aW9uO1xuXG4gIC8qKlxuICAgKiBUaGUgbm9kZSBpbiB0aGUgYFRlbXBsYXRlQXN0YCB3aGVyZSB0aGUgc3ltYm9sIGlzIGRlY2xhcmVkLiBUaGF0IGlzLCBub2RlIGZvciB0aGUgYCNyZWZgIG9yXG4gICAqIGAjcmVmPVwiZXhwb3J0QXNcImAuXG4gICAqL1xuICBkZWNsYXJhdGlvbjogVG1wbEFzdFJlZmVyZW5jZTtcblxuICAvKipcbiAgICogVGhlIGxvY2F0aW9uIGluIHRoZSBzaGltIGZpbGUgb2YgYSB2YXJpYWJsZSB0aGF0IGhvbGRzIHRoZSB0eXBlIG9mIHRoZSBsb2NhbCByZWYuXG4gICAqIEZvciBleGFtcGxlLCBhIHJlZmVyZW5jZSBkZWNsYXJhdGlvbiBsaWtlIHRoZSBmb2xsb3dpbmc6XG4gICAqIGBgYFxuICAgKiB2YXIgX3QxID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAqIHZhciBfdDIgPSBfdDE7IC8vIFRoaXMgaXMgdGhlIHJlZmVyZW5jZSBkZWNsYXJhdGlvblxuICAgKiBgYGBcbiAgICogVGhpcyBgdGFyZ2V0TG9jYXRpb25gIGlzIGBbX3QxIHZhcmlhYmxlIGRlY2xhcmF0aW9uXS5nZXRTdGFydCgpYC5cbiAgICovXG4gIHRhcmdldExvY2F0aW9uOiBTaGltTG9jYXRpb247XG5cbiAgLyoqXG4gICAqIFRoZSBsb2NhdGlvbiBpbiB0aGUgVENCIGZvciB0aGUgaWRlbnRpZmllciBub2RlIGluIHRoZSByZWZlcmVuY2UgdmFyaWFibGUgZGVjbGFyYXRpb24uXG4gICAqIEZvciBleGFtcGxlLCBnaXZlbiBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uIHN0YXRlbWVudCBmb3IgYSB0ZW1wbGF0ZSByZWZlcmVuY2U6XG4gICAqIGB2YXIgX3QyID0gX3QxYCwgdGhpcyBsb2NhdGlvbiBpcyBgW190MiBub2RlXS5nZXRTdGFydCgpYC4gVGhpcyBsb2NhdGlvbiBjYW5cbiAgICogYmUgdXNlZCB0byBmaW5kIHJlZmVyZW5jZXMgdG8gdGhlIHZhcmlhYmxlIHdpdGhpbiB0aGUgdGVtcGxhdGUuXG4gICAqL1xuICByZWZlcmVuY2VWYXJMb2NhdGlvbjogU2hpbUxvY2F0aW9uO1xufVxuXG4vKipcbiAqIEEgcmVwcmVzZW50YXRpb24gb2YgYSBjb250ZXh0IHZhcmlhYmxlIGluIGEgY29tcG9uZW50IHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFZhcmlhYmxlU3ltYm9sIHtcbiAga2luZDogU3ltYm9sS2luZC5WYXJpYWJsZTtcblxuICAvKipcbiAgICogVGhlIGB0cy5UeXBlYCBvZiB0aGUgZW50aXR5LlxuICAgKlxuICAgKiBUaGlzIHdpbGwgYmUgYGFueWAgaWYgdGhlcmUgaXMgbm8gYG5nVGVtcGxhdGVDb250ZXh0R3VhcmRgLlxuICAgKi9cbiAgdHNUeXBlOiB0cy5UeXBlO1xuXG4gIC8qKlxuICAgKiBUaGUgYHRzLlN5bWJvbGAgZm9yIHRoZSBjb250ZXh0IHZhcmlhYmxlLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgYmUgYG51bGxgIGlmIHRoZXJlIGlzIG5vIGBuZ1RlbXBsYXRlQ29udGV4dEd1YXJkYC5cbiAgICovXG4gIHRzU3ltYm9sOiB0cy5TeW1ib2x8bnVsbDtcblxuICAvKipcbiAgICogVGhlIG5vZGUgaW4gdGhlIGBUZW1wbGF0ZUFzdGAgd2hlcmUgdGhlIHZhcmlhYmxlIGlzIGRlY2xhcmVkLiBUaGF0IGlzLCB0aGUgbm9kZSBmb3IgdGhlIGBsZXQtYFxuICAgKiBub2RlIGluIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIGRlY2xhcmF0aW9uOiBUbXBsQXN0VmFyaWFibGU7XG5cbiAgLyoqXG4gICAqIFRoZSBsb2NhdGlvbiBpbiB0aGUgc2hpbSBmaWxlIGZvciB0aGUgaWRlbnRpZmllciB0aGF0IHdhcyBkZWNsYXJlZCBmb3IgdGhlIHRlbXBsYXRlIHZhcmlhYmxlLlxuICAgKi9cbiAgbG9jYWxWYXJMb2NhdGlvbjogU2hpbUxvY2F0aW9uO1xuXG4gIC8qKlxuICAgKiBUaGUgbG9jYXRpb24gaW4gdGhlIHNoaW0gZmlsZSBmb3IgdGhlIGluaXRpYWxpemVyIG5vZGUgb2YgdGhlIHZhcmlhYmxlIHRoYXQgcmVwcmVzZW50cyB0aGVcbiAgICogdGVtcGxhdGUgdmFyaWFibGUuXG4gICAqL1xuICBpbml0aWFsaXplckxvY2F0aW9uOiBTaGltTG9jYXRpb247XG59XG5cbi8qKlxuICogQSByZXByZXNlbnRhdGlvbiBvZiBhbiBlbGVtZW50IGluIGEgY29tcG9uZW50IHRlbXBsYXRlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVsZW1lbnRTeW1ib2wge1xuICBraW5kOiBTeW1ib2xLaW5kLkVsZW1lbnQ7XG5cbiAgLyoqIFRoZSBgdHMuVHlwZWAgZm9yIHRoZSBgSFRNTEVsZW1lbnRgLiAqL1xuICB0c1R5cGU6IHRzLlR5cGU7XG5cbiAgLyoqIFRoZSBgdHMuU3ltYm9sYCBmb3IgdGhlIGBIVE1MRWxlbWVudGAuICovXG4gIHRzU3ltYm9sOiB0cy5TeW1ib2x8bnVsbDtcblxuICAvKiogQSBsaXN0IG9mIGRpcmVjdGl2ZXMgYXBwbGllZCB0byB0aGUgZWxlbWVudC4gKi9cbiAgZGlyZWN0aXZlczogRGlyZWN0aXZlU3ltYm9sW107XG5cbiAgLyoqIFRoZSBsb2NhdGlvbiBpbiB0aGUgc2hpbSBmaWxlIGZvciB0aGUgdmFyaWFibGUgdGhhdCBob2xkcyB0aGUgdHlwZSBvZiB0aGUgZWxlbWVudC4gKi9cbiAgc2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb247XG5cbiAgdGVtcGxhdGVOb2RlOiBUbXBsQXN0RWxlbWVudDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVN5bWJvbCB7XG4gIGtpbmQ6IFN5bWJvbEtpbmQuVGVtcGxhdGU7XG5cbiAgLyoqIEEgbGlzdCBvZiBkaXJlY3RpdmVzIGFwcGxpZWQgdG8gdGhlIGVsZW1lbnQuICovXG4gIGRpcmVjdGl2ZXM6IERpcmVjdGl2ZVN5bWJvbFtdO1xuXG4gIHRlbXBsYXRlTm9kZTogVG1wbEFzdFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEEgcmVwcmVzZW50YXRpb24gb2YgYSBkaXJlY3RpdmUvY29tcG9uZW50IHdob3NlIHNlbGVjdG9yIG1hdGNoZXMgYSBub2RlIGluIGEgY29tcG9uZW50XG4gKiB0ZW1wbGF0ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEaXJlY3RpdmVTeW1ib2wgZXh0ZW5kcyBEaXJlY3RpdmVJblNjb3BlIHtcbiAga2luZDogU3ltYm9sS2luZC5EaXJlY3RpdmU7XG5cbiAgLyoqIFRoZSBgdHMuVHlwZWAgZm9yIHRoZSBjbGFzcyBkZWNsYXJhdGlvbi4gKi9cbiAgdHNUeXBlOiB0cy5UeXBlO1xuXG4gIC8qKiBUaGUgbG9jYXRpb24gaW4gdGhlIHNoaW0gZmlsZSBmb3IgdGhlIHZhcmlhYmxlIHRoYXQgaG9sZHMgdGhlIHR5cGUgb2YgdGhlIGRpcmVjdGl2ZS4gKi9cbiAgc2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb247XG59XG5cbi8qKlxuICogQSByZXByZXNlbnRhdGlvbiBvZiBhbiBhdHRyaWJ1dGUgb24gYW4gZWxlbWVudCBvciB0ZW1wbGF0ZS4gVGhlc2UgYmluZGluZ3MgYXJlbid0IGN1cnJlbnRseVxuICogdHlwZS1jaGVja2VkIChzZWUgYGNoZWNrVHlwZU9mRG9tQmluZGluZ3NgKSBzbyB0aGV5IHdvbid0IGhhdmUgYSBgdHMuVHlwZWAsIGB0cy5TeW1ib2xgLCBvciBzaGltXG4gKiBsb2NhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEb21CaW5kaW5nU3ltYm9sIHtcbiAga2luZDogU3ltYm9sS2luZC5Eb21CaW5kaW5nO1xuXG4gIC8qKiBUaGUgc3ltYm9sIGZvciB0aGUgZWxlbWVudCBvciB0ZW1wbGF0ZSBvZiB0aGUgdGV4dCBhdHRyaWJ1dGUuICovXG4gIGhvc3Q6IEVsZW1lbnRTeW1ib2x8VGVtcGxhdGVTeW1ib2w7XG59XG5cbi8qKlxuICogQSByZXByZXNlbnRhdGlvbiBmb3IgYSBjYWxsIHRvIGEgcGlwZSdzIHRyYW5zZm9ybSBtZXRob2QgaW4gdGhlIFRDQi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQaXBlU3ltYm9sIHtcbiAga2luZDogU3ltYm9sS2luZC5QaXBlO1xuXG4gIC8qKiBUaGUgYHRzLlR5cGVgIG9mIHRoZSB0cmFuc2Zvcm0gbm9kZS4gKi9cbiAgdHNUeXBlOiB0cy5UeXBlO1xuXG4gIC8qKlxuICAgKiBUaGUgYHRzLlN5bWJvbGAgZm9yIHRoZSB0cmFuc2Zvcm0gY2FsbC4gVGhpcyBjb3VsZCBiZSBgbnVsbGAgd2hlbiBgY2hlY2tUeXBlT2ZQaXBlc2AgaXMgc2V0IHRvXG4gICAqIGBmYWxzZWAgYmVjYXVzZSB0aGUgdHJhbnNmb3JtIGNhbGwgd291bGQgYmUgb2YgdGhlIGZvcm0gYChfcGlwZTEgYXMgYW55KS50cmFuc2Zvcm0oKWBcbiAgICovXG4gIHRzU3ltYm9sOiB0cy5TeW1ib2x8bnVsbDtcblxuICAvKiogVGhlIHBvc2l0aW9uIG9mIHRoZSB0cmFuc2Zvcm0gY2FsbCBpbiB0aGUgdGVtcGxhdGUuICovXG4gIHNoaW1Mb2NhdGlvbjogU2hpbUxvY2F0aW9uO1xuXG4gIC8qKiBUaGUgc3ltYm9sIGZvciB0aGUgcGlwZSBjbGFzcyBhcyBhbiBpbnN0YW5jZSB0aGF0IGFwcGVhcnMgaW4gdGhlIFRDQi4gKi9cbiAgY2xhc3NTeW1ib2w6IENsYXNzU3ltYm9sO1xufVxuXG4vKiogUmVwcmVzZW50cyBhbiBpbnN0YW5jZSBvZiBhIGNsYXNzIGZvdW5kIGluIHRoZSBUQ0IsIGkuZS4gYHZhciBfcGlwZTE6IE15UGlwZSA9IG51bGwhOyAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGFzc1N5bWJvbCB7XG4gIC8qKiBUaGUgYHRzLlR5cGVgIG9mIGNsYXNzLiAqL1xuICB0c1R5cGU6IHRzLlR5cGU7XG5cbiAgLyoqIFRoZSBgdHMuU3ltYm9sYCBmb3IgY2xhc3MuICovXG4gIHRzU3ltYm9sOiBTeW1ib2xXaXRoVmFsdWVEZWNsYXJhdGlvbjtcblxuICAvKiogVGhlIHBvc2l0aW9uIGZvciB0aGUgdmFyaWFibGUgZGVjbGFyYXRpb24gZm9yIHRoZSBjbGFzcyBpbnN0YW5jZS4gKi9cbiAgc2hpbUxvY2F0aW9uOiBTaGltTG9jYXRpb247XG59XG4iXX0=