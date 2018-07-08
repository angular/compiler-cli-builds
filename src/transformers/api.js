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
        define("@angular/compiler-cli/src/transformers/api", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_ERROR_CODE = 100;
    exports.UNKNOWN_ERROR_CODE = 500;
    exports.SOURCE = 'angular';
    function isTsDiagnostic(diagnostic) {
        return diagnostic != null && diagnostic.source !== 'angular';
    }
    exports.isTsDiagnostic = isTsDiagnostic;
    function isNgDiagnostic(diagnostic) {
        return diagnostic != null && diagnostic.source === 'angular';
    }
    exports.isNgDiagnostic = isNgDiagnostic;
    var EmitFlags;
    (function (EmitFlags) {
        EmitFlags[EmitFlags["DTS"] = 1] = "DTS";
        EmitFlags[EmitFlags["JS"] = 2] = "JS";
        EmitFlags[EmitFlags["Metadata"] = 4] = "Metadata";
        EmitFlags[EmitFlags["I18nBundle"] = 8] = "I18nBundle";
        EmitFlags[EmitFlags["Codegen"] = 16] = "Codegen";
        EmitFlags[EmitFlags["Default"] = 19] = "Default";
        EmitFlags[EmitFlags["All"] = 31] = "All";
    })(EmitFlags = exports.EmitFlags || (exports.EmitFlags = {}));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS1UsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7SUFDekIsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7SUFDekIsUUFBQSxNQUFNLEdBQUcsU0FBc0IsQ0FBQztJQWtCN0Msd0JBQStCLFVBQWU7UUFDNUMsT0FBTyxVQUFVLElBQUksSUFBSSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDO0lBQy9ELENBQUM7SUFGRCx3Q0FFQztJQUVELHdCQUErQixVQUFlO1FBQzVDLE9BQU8sVUFBVSxJQUFJLElBQUksSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQztJQUMvRCxDQUFDO0lBRkQsd0NBRUM7SUFpTkQsSUFBWSxTQVNYO0lBVEQsV0FBWSxTQUFTO1FBQ25CLHVDQUFZLENBQUE7UUFDWixxQ0FBVyxDQUFBO1FBQ1gsaURBQWlCLENBQUE7UUFDakIscURBQW1CLENBQUE7UUFDbkIsZ0RBQWdCLENBQUE7UUFFaEIsZ0RBQTRCLENBQUE7UUFDNUIsd0NBQWdELENBQUE7SUFDbEQsQ0FBQyxFQVRXLFNBQVMsR0FBVCxpQkFBUyxLQUFULGlCQUFTLFFBU3BCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0dlbmVyYXRlZEZpbGUsIFBhcnNlU291cmNlU3BhbiwgUG9zaXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9FUlJPUl9DT0RFID0gMTAwO1xuZXhwb3J0IGNvbnN0IFVOS05PV05fRVJST1JfQ09ERSA9IDUwMDtcbmV4cG9ydCBjb25zdCBTT1VSQ0UgPSAnYW5ndWxhcicgYXMgJ2FuZ3VsYXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICBtZXNzYWdlVGV4dDogc3RyaW5nO1xuICBwb3NpdGlvbj86IFBvc2l0aW9uO1xuICBuZXh0PzogRGlhZ25vc3RpY01lc3NhZ2VDaGFpbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaWFnbm9zdGljIHtcbiAgbWVzc2FnZVRleHQ6IHN0cmluZztcbiAgc3Bhbj86IFBhcnNlU291cmNlU3BhbjtcbiAgcG9zaXRpb24/OiBQb3NpdGlvbjtcbiAgY2hhaW4/OiBEaWFnbm9zdGljTWVzc2FnZUNoYWluO1xuICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5O1xuICBjb2RlOiBudW1iZXI7XG4gIHNvdXJjZTogJ2FuZ3VsYXInO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUc0RpYWdub3N0aWMoZGlhZ25vc3RpYzogYW55KTogZGlhZ25vc3RpYyBpcyB0cy5EaWFnbm9zdGljIHtcbiAgcmV0dXJuIGRpYWdub3N0aWMgIT0gbnVsbCAmJiBkaWFnbm9zdGljLnNvdXJjZSAhPT0gJ2FuZ3VsYXInO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOZ0RpYWdub3N0aWMoZGlhZ25vc3RpYzogYW55KTogZGlhZ25vc3RpYyBpcyBEaWFnbm9zdGljIHtcbiAgcmV0dXJuIGRpYWdub3N0aWMgIT0gbnVsbCAmJiBkaWFnbm9zdGljLnNvdXJjZSA9PT0gJ2FuZ3VsYXInO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9ucyBleHRlbmRzIHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIC8vIE5PVEU6IFRoZXNlIGNvbW1lbnRzIGFuZCBhaW8vY29udGVudC9ndWlkZXMvYW90LWNvbXBpbGVyLm1kIHNob3VsZCBiZSBrZXB0IGluIHN5bmMuXG5cbiAgLy8gV3JpdGUgc3RhdGlzdGljcyBhYm91dCBjb21waWxhdGlvbiAoZS5nLiB0b3RhbCB0aW1lLCAuLi4pXG4gIC8vIE5vdGU6IHRoaXMgaXMgdGhlIC0tZGlhZ25vc3RpY3MgY29tbWFuZCBsaW5lIG9wdGlvbiBmcm9tIFRTICh3aGljaCBpcyBAaW50ZXJuYWxcbiAgLy8gb24gdHMuQ29tcGlsZXJPcHRpb25zIGludGVyZmFjZSkuXG4gIGRpYWdub3N0aWNzPzogYm9vbGVhbjtcblxuICAvLyBBYnNvbHV0ZSBwYXRoIHRvIGEgZGlyZWN0b3J5IHdoZXJlIGdlbmVyYXRlZCBmaWxlIHN0cnVjdHVyZSBpcyB3cml0dGVuLlxuICAvLyBJZiB1bnNwZWNpZmllZCwgZ2VuZXJhdGVkIGZpbGVzIHdpbGwgYmUgd3JpdHRlbiBhbG9uZ3NpZGUgc291cmNlcy5cbiAgLy8gQGRlcHJlY2F0ZWQgLSBubyBlZmZlY3RcbiAgZ2VuRGlyPzogc3RyaW5nO1xuXG4gIC8vIFBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIHRoZSB0c2NvbmZpZy5qc29uIGZpbGUuXG4gIGJhc2VQYXRoPzogc3RyaW5nO1xuXG4gIC8vIERvbid0IHByb2R1Y2UgLm1ldGFkYXRhLmpzb24gZmlsZXMgKHRoZXkgZG9uJ3Qgd29yayBmb3IgYnVuZGxlZCBlbWl0IHdpdGggLS1vdXQpXG4gIHNraXBNZXRhZGF0YUVtaXQ/OiBib29sZWFuO1xuXG4gIC8vIFByb2R1Y2UgYW4gZXJyb3IgaWYgdGhlIG1ldGFkYXRhIHdyaXR0ZW4gZm9yIGEgY2xhc3Mgd291bGQgcHJvZHVjZSBhbiBlcnJvciBpZiB1c2VkLlxuICBzdHJpY3RNZXRhZGF0YUVtaXQ/OiBib29sZWFuO1xuXG4gIC8vIERvbid0IHByb2R1Y2UgLm5nZmFjdG9yeS5qcyBvciAubmdzdHlsZS5qcyBmaWxlc1xuICBza2lwVGVtcGxhdGVDb2RlZ2VuPzogYm9vbGVhbjtcblxuICAvLyBBbHdheXMgcmVwb3J0IGVycm9ycyB3aGVuIHRoZSB0eXBlIG9mIGEgcGFyYW1ldGVyIHN1cHBsaWVkIHdob3NlIGluamVjdGlvbiB0eXBlIGNhbm5vdFxuICAvLyBiZSBkZXRlcm1pbmVkLiBXaGVuIHRoaXMgdmFsdWUgb3B0aW9uIGlzIG5vdCBwcm92aWRlZCBvciBpcyBgZmFsc2VgLCBjb25zdHJ1Y3RvclxuICAvLyBwYXJhbWV0ZXJzIG9mIGNsYXNzZXMgbWFya2VkIHdpdGggYEBJbmplY3RhYmxlYCB3aG9zZSB0eXBlIGNhbm5vdCBiZSByZXNvbHZlZCB3aWxsXG4gIC8vIHByb2R1Y2UgYSB3YXJuaW5nLiBXaXRoIHRoaXMgb3B0aW9uIGB0cnVlYCwgdGhleSBwcm9kdWNlIGFuIGVycm9yLiBXaGVuIHRoaXMgb3B0aW9uIGlzXG4gIC8vIG5vdCBwcm92aWRlZCBpcyB0cmVhdGVkIGFzIGlmIGl0IHdlcmUgYGZhbHNlYC4gSW4gQW5ndWxhciA2LjAsIGlmIHRoaXMgb3B0aW9uIGlzIG5vdFxuICAvLyBwcm92aWRlZCwgaXQgd2lsbCBiZSB0cmVhdGVkIGFzIGB0cnVlYC5cbiAgc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycz86IGJvb2xlYW47XG5cbiAgLy8gV2hldGhlciB0byBnZW5lcmF0ZSBhIGZsYXQgbW9kdWxlIGluZGV4IG9mIHRoZSBnaXZlbiBuYW1lIGFuZCB0aGUgY29ycmVzcG9uZGluZ1xuICAvLyBmbGF0IG1vZHVsZSBtZXRhZGF0YS4gVGhpcyBvcHRpb24gaXMgaW50ZW5kZWQgdG8gYmUgdXNlZCB3aGVuIGNyZWF0aW5nIGZsYXRcbiAgLy8gbW9kdWxlcyBzaW1pbGFyIHRvIGhvdyBgQGFuZ3VsYXIvY29yZWAgYW5kIGBAYW5ndWxhci9jb21tb25gIGFyZSBwYWNrYWdlZC5cbiAgLy8gV2hlbiB0aGlzIG9wdGlvbiBpcyB1c2VkIHRoZSBgcGFja2FnZS5qc29uYCBmb3IgdGhlIGxpYnJhcnkgc2hvdWxkIHJlZmVycmVkIHRvIHRoZVxuICAvLyBnZW5lcmF0ZWQgZmxhdCBtb2R1bGUgaW5kZXggaW5zdGVhZCBvZiB0aGUgbGlicmFyeSBpbmRleCBmaWxlLiBXaGVuIHVzaW5nIHRoaXNcbiAgLy8gb3B0aW9uIG9ubHkgb25lIC5tZXRhZGF0YS5qc29uIGZpbGUgaXMgcHJvZHVjZWQgdGhhdCBjb250YWlucyBhbGwgdGhlIG1ldGFkYXRhXG4gIC8vIG5lY2Vzc2FyeSBmb3Igc3ltYm9scyBleHBvcnRlZCBmcm9tIHRoZSBsaWJyYXJ5IGluZGV4LlxuICAvLyBJbiB0aGUgZ2VuZXJhdGVkIC5uZ2ZhY3RvcnkudHMgZmlsZXMgZmxhdCBtb2R1bGUgaW5kZXggaXMgdXNlZCB0byBpbXBvcnQgc3ltYm9sc1xuICAvLyBpbmNsdWRlcyBib3RoIHRoZSBwdWJsaWMgQVBJIGZyb20gdGhlIGxpYnJhcnkgaW5kZXggYXMgd2VsbCBhcyBzaHJvd2RlZCBpbnRlcm5hbFxuICAvLyBzeW1ib2xzLlxuICAvLyBCeSBkZWZhdWx0IHRoZSAudHMgZmlsZSBzdXBwbGllZCBpbiB0aGUgYGZpbGVzYCBmaWxlcyBmaWVsZCBpcyBhc3N1bWVkIHRvIGJlXG4gIC8vIGxpYnJhcnkgaW5kZXguIElmIG1vcmUgdGhhbiBvbmUgaXMgc3BlY2lmaWVkLCB1c2VzIGBsaWJyYXJ5SW5kZXhgIHRvIHNlbGVjdCB0aGVcbiAgLy8gZmlsZSB0byB1c2UuIElmIG1vcmUgdGhhbiBvbiAudHMgZmlsZSBpcyBzdXBwbGllZCBhbmQgbm8gYGxpYnJhcnlJbmRleGAgaXMgc3VwcGxpZWRcbiAgLy8gYW4gZXJyb3IgaXMgcHJvZHVjZWQuXG4gIC8vIEEgZmxhdCBtb2R1bGUgaW5kZXggLmQudHMgYW5kIC5qcyB3aWxsIGJlIGNyZWF0ZWQgd2l0aCB0aGUgZ2l2ZW4gYGZsYXRNb2R1bGVPdXRGaWxlYFxuICAvLyBuYW1lIGluIHRoZSBzYW1lIGxvY2F0aW9uIGFzIHRoZSBsaWJyYXJ5IGluZGV4IC5kLnRzIGZpbGUgaXMgZW1pdHRlZC5cbiAgLy8gRm9yIGV4YW1wbGUsIGlmIGEgbGlicmFyeSB1c2VzIGBwdWJsaWNfYXBpLnRzYCBmaWxlIGFzIHRoZSBsaWJyYXJ5IGluZGV4IG9mIHRoZVxuICAvLyBtb2R1bGUgdGhlIGB0c2NvbmZpZy5qc29uYCBgZmlsZXNgIGZpZWxkIHdvdWxkIGJlIGBbXCJwdWJsaWNfYXBpLnRzXCJdYC4gVGhlXG4gIC8vIGBmbGF0TW9kdWxlT3V0RmlsZWAgb3B0aW9ucyBjb3VsZCB0aGVuIGJlIHNldCB0bywgZm9yIGV4YW1wbGUgYFwiaW5kZXguanNcImAsIHdoaWNoXG4gIC8vIHByb2R1Y2VzIGBpbmRleC5kLnRzYCBhbmQgIGBpbmRleC5tZXRhZGF0YS5qc29uYCBmaWxlcy4gVGhlIGxpYnJhcnknc1xuICAvLyBgcGFja2FnZS5qc29uYCdzIGBtb2R1bGVgIGZpZWxkIHdvdWxkIGJlIGBcImluZGV4LmpzXCJgIGFuZCB0aGUgYHR5cGluZ3NgIGZpZWxkIHdvdWxkXG4gIC8vIGJlIGBcImluZGV4LmQudHNcImAuXG4gIGZsYXRNb2R1bGVPdXRGaWxlPzogc3RyaW5nO1xuXG4gIC8vIFByZWZlcnJlZCBtb2R1bGUgaWQgdG8gdXNlIGZvciBpbXBvcnRpbmcgZmxhdCBtb2R1bGUuIFJlZmVyZW5jZXMgZ2VuZXJhdGVkIGJ5IGBuZ2NgXG4gIC8vIHdpbGwgdXNlIHRoaXMgbW9kdWxlIG5hbWUgd2hlbiBpbXBvcnRpbmcgc3ltYm9scyBmcm9tIHRoZSBmbGF0IG1vZHVsZS4gVGhpcyBpcyBvbmx5XG4gIC8vIG1lYW5pbmdmdWwgd2hlbiBgZmxhdE1vZHVsZU91dEZpbGVgIGlzIGFsc28gc3VwcGxpZWQuIEl0IGlzIG90aGVyd2lzZSBpZ25vcmVkLlxuICBmbGF0TW9kdWxlSWQ/OiBzdHJpbmc7XG5cbiAgLy8gQSBwcmVmaXggdG8gaW5zZXJ0IGluIGdlbmVyYXRlZCBwcml2YXRlIHN5bWJvbHMsIGUuZy4gZm9yIFwibXlfcHJlZml4X1wiIHdlXG4gIC8vIHdvdWxkIGdlbmVyYXRlIHByaXZhdGUgc3ltYm9scyBuYW1lZCBsaWtlIGDJtW15X3ByZWZpeF9hYC5cbiAgZmxhdE1vZHVsZVByaXZhdGVTeW1ib2xQcmVmaXg/OiBzdHJpbmc7XG5cbiAgLy8gV2hldGhlciB0byBnZW5lcmF0ZSBjb2RlIGZvciBsaWJyYXJ5IGNvZGUuXG4gIC8vIElmIHRydWUsIHByb2R1Y2UgLm5nZmFjdG9yeS50cyBhbmQgLm5nc3R5bGUudHMgZmlsZXMgZm9yIC5kLnRzIGlucHV0cy5cbiAgLy8gRGVmYXVsdCBpcyB0cnVlLlxuICBnZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXM/OiBib29sZWFuO1xuXG4gIC8vIFdoZXRoZXIgdG8gZW5hYmxlIGFsbCB0eXBlIGNoZWNrcyBmb3IgdGVtcGxhdGVzLlxuICAvLyBUaGlzIHdpbGwgYmUgdHJ1ZSBiZSBkZWZhdWx0IGluIEFuZ3VsYXIgNi5cbiAgZnVsbFRlbXBsYXRlVHlwZUNoZWNrPzogYm9vbGVhbjtcblxuICAvLyBJbnNlcnQgSlNEb2MgdHlwZSBhbm5vdGF0aW9ucyBuZWVkZWQgYnkgQ2xvc3VyZSBDb21waWxlclxuICBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcj86IGJvb2xlYW47XG5cbiAgLy8gTW9kaWZ5IGhvdyBhbmd1bGFyIGFubm90YXRpb25zIGFyZSBlbWl0dGVkIHRvIGltcHJvdmUgdHJlZS1zaGFraW5nLlxuICAvLyBEZWZhdWx0IGlzIHN0YXRpYyBmaWVsZHMuXG4gIC8vIGRlY29yYXRvcnM6IExlYXZlIHRoZSBEZWNvcmF0b3JzIGluLXBsYWNlLiBUaGlzIG1ha2VzIGNvbXBpbGF0aW9uIGZhc3Rlci5cbiAgLy8gICAgICAgICAgICAgVHlwZVNjcmlwdCB3aWxsIGVtaXQgY2FsbHMgdG8gdGhlIF9fZGVjb3JhdGUgaGVscGVyLlxuICAvLyAgICAgICAgICAgICBgLS1lbWl0RGVjb3JhdG9yTWV0YWRhdGFgIGNhbiBiZSB1c2VkIGZvciBydW50aW1lIHJlZmxlY3Rpb24uXG4gIC8vICAgICAgICAgICAgIEhvd2V2ZXIsIHRoZSByZXN1bHRpbmcgY29kZSB3aWxsIG5vdCBwcm9wZXJseSB0cmVlLXNoYWtlLlxuICAvLyBzdGF0aWMgZmllbGRzOiBSZXBsYWNlIGRlY29yYXRvcnMgd2l0aCBhIHN0YXRpYyBmaWVsZCBpbiB0aGUgY2xhc3MuXG4gIC8vICAgICAgICAgICAgICAgIEFsbG93cyBhZHZhbmNlZCB0cmVlLXNoYWtlcnMgbGlrZSBDbG9zdXJlIENvbXBpbGVyIHRvIHJlbW92ZVxuICAvLyAgICAgICAgICAgICAgICB1bnVzZWQgY2xhc3Nlcy5cbiAgYW5ub3RhdGlvbnNBcz86ICdkZWNvcmF0b3JzJ3wnc3RhdGljIGZpZWxkcyc7XG5cbiAgLy8gUHJpbnQgZXh0cmEgaW5mb3JtYXRpb24gd2hpbGUgcnVubmluZyB0aGUgY29tcGlsZXJcbiAgdHJhY2U/OiBib29sZWFuO1xuXG4gIC8vIFdoZXRoZXIgdG8gZW5hYmxlIGxvd2VyaW5nIGV4cHJlc3Npb25zIGxhbWJkYXMgYW5kIGV4cHJlc3Npb25zIGluIGEgcmVmZXJlbmNlIHZhbHVlXG4gIC8vIHBvc2l0aW9uLlxuICBkaXNhYmxlRXhwcmVzc2lvbkxvd2VyaW5nPzogYm9vbGVhbjtcblxuICAvLyBEaXNhYmxlIFR5cGVTY3JpcHQgVmVyc2lvbiBDaGVjay5cbiAgZGlzYWJsZVR5cGVTY3JpcHRWZXJzaW9uQ2hlY2s/OiBib29sZWFuO1xuXG4gIC8vIExvY2FsZSBvZiB0aGUgYXBwbGljYXRpb25cbiAgaTE4bk91dExvY2FsZT86IHN0cmluZztcbiAgLy8gRXhwb3J0IGZvcm1hdCAoeGxmLCB4bGYyIG9yIHhtYilcbiAgaTE4bk91dEZvcm1hdD86IHN0cmluZztcbiAgLy8gUGF0aCB0byB0aGUgZXh0cmFjdGVkIG1lc3NhZ2UgZmlsZVxuICBpMThuT3V0RmlsZT86IHN0cmluZztcblxuICAvLyBJbXBvcnQgZm9ybWF0IGlmIGRpZmZlcmVudCBmcm9tIGBpMThuRm9ybWF0YFxuICBpMThuSW5Gb3JtYXQ/OiBzdHJpbmc7XG4gIC8vIExvY2FsZSBvZiB0aGUgaW1wb3J0ZWQgdHJhbnNsYXRpb25zXG4gIGkxOG5JbkxvY2FsZT86IHN0cmluZztcbiAgLy8gUGF0aCB0byB0aGUgdHJhbnNsYXRpb24gZmlsZVxuICBpMThuSW5GaWxlPzogc3RyaW5nO1xuICAvLyBIb3cgdG8gaGFuZGxlIG1pc3NpbmcgbWVzc2FnZXNcbiAgaTE4bkluTWlzc2luZ1RyYW5zbGF0aW9ucz86ICdlcnJvcid8J3dhcm5pbmcnfCdpZ25vcmUnO1xuXG4gIC8vIFdoZXRoZXIgdG8gcmVtb3ZlIGJsYW5rIHRleHQgbm9kZXMgZnJvbSBjb21waWxlZCB0ZW1wbGF0ZXMuIEl0IGlzIGBmYWxzZWAgYnkgZGVmYXVsdCBzdGFydGluZ1xuICAvLyBmcm9tIEFuZ3VsYXIgNi5cbiAgcHJlc2VydmVXaGl0ZXNwYWNlcz86IGJvb2xlYW47XG5cbiAgLyoqIGdlbmVyYXRlIGFsbCBwb3NzaWJsZSBnZW5lcmF0ZWQgZmlsZXMgICovXG4gIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGdlbmVyYXRlIC5uZ3N1bW1hcnkudHMgZmlsZXMgdGhhdCBhbGxvdyB0byB1c2UgQU9UZWQgYXJ0aWZhY3RzXG4gICAqIGluIEpJVCBtb2RlLiBUaGlzIGlzIG9mZiBieSBkZWZhdWx0LlxuICAgKi9cbiAgZW5hYmxlU3VtbWFyaWVzRm9ySml0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byByZXBsYWNlIHRoZSBgdGVtcGxhdGVVcmxgIGFuZCBgc3R5bGVVcmxzYCBwcm9wZXJ0eSBpbiBhbGxcbiAgICogQENvbXBvbmVudCBkZWNvcmF0b3JzIHdpdGggaW5saW5lZCBjb250ZW50cyBpbiBgdGVtcGxhdGVgIGFuZCBgc3R5bGVzYFxuICAgKiBwcm9wZXJ0aWVzLlxuICAgKiBXaGVuIGVuYWJsZWQsIHRoZSAuanMgb3V0cHV0IG9mIG5nYyB3aWxsIGhhdmUgbm8gbGF6eS1sb2FkZWQgYHRlbXBsYXRlVXJsYFxuICAgKiBvciBgc3R5bGVVcmxgcy4gTm90ZSB0aGF0IHRoaXMgcmVxdWlyZXMgdGhhdCByZXNvdXJjZXMgYmUgYXZhaWxhYmxlIHRvXG4gICAqIGxvYWQgc3RhdGljYWxseSBhdCBjb21waWxlLXRpbWUuXG4gICAqL1xuICBlbmFibGVSZXNvdXJjZUlubGluaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGVsbHMgdGhlIGNvbXBpbGVyIHRvIGdlbmVyYXRlIGRlZmluaXRpb25zIHVzaW5nIHRoZSBSZW5kZXIzIHN0eWxlIGNvZGUgZ2VuZXJhdGlvbi5cbiAgICogVGhpcyBvcHRpb24gZGVmYXVsdHMgdG8gYGZhbHNlYC5cbiAgICpcbiAgICogTm90IGFsbCBmZWF0dXJlcyBhcmUgc3VwcG9ydGVkIHdpdGggdGhpcyBvcHRpb24gZW5hYmxlZC4gSXQgaXMgb25seSBzdXBwb3J0ZWRcbiAgICogZm9yIGV4cGVyaW1lbnRhdGlvbiBhbmQgdGVzdGluZyBvZiBSZW5kZXIzIHN0eWxlIGNvZGUgZ2VuZXJhdGlvbi5cbiAgICpcbiAgICogQWNjZXB0YWJsZSB2YWx1ZXMgYXJlIGFzIGZvbGxvd3M6XG4gICAqXG4gICAqIGBmYWxzZWAgLSBydW4gbmdjIG5vcm1hbGx5XG4gICAqIGB0cnVlYCAtIHJ1biBuZ2Mgd2l0aCBpdHMgdXN1YWwgZ2xvYmFsIGFuYWx5c2lzLCBidXQgY29tcGlsZSBkZWNvcmF0b3JzIHRvIEl2eSBmaWVsZHMgaW5zdGVhZFxuICAgKiAgb2YgcnVubmluZyB0aGUgVmlldyBFbmdpbmUgY29tcGlsZXJzXG4gICAqIGBuZ3RzY2AgLSBydW4gdGhlIG5ndHNjIGNvbXBpbGVyIGluc3RlYWQgb2YgdGhlIG5vcm1hbCBuZ2MgY29tcGlsZXJcbiAgICogYHRzY2AgLSBiZWhhdmUgbGlrZSBwbGFpbiB0c2MgYXMgbXVjaCBhcyBwb3NzaWJsZSAodXNlZCBmb3IgdGVzdGluZyBKSVQgY29kZSlcbiAgICpcbiAgICogQGV4cGVyaW1lbnRhbFxuICAgKi9cbiAgZW5hYmxlSXZ5PzogYm9vbGVhbnwnbmd0c2MnfCd0c2MnO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29sbGVjdEFsbEVycm9ycz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJIb3N0IGV4dGVuZHMgdHMuQ29tcGlsZXJIb3N0IHtcbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgbW9kdWxlIG5hbWUgdGhhdCBpcyB1c2VkIGluIGFuIGBpbXBvcnRgIHRvIGEgZmlsZSBwYXRoLlxuICAgKiBJLmUuIGBwYXRoL3RvL2NvbnRhaW5pbmdGaWxlLnRzYCBjb250YWluaW5nIGBpbXBvcnQgey4uLn0gZnJvbSAnbW9kdWxlLW5hbWUnYC5cbiAgICovXG4gIG1vZHVsZU5hbWVUb0ZpbGVOYW1lPyhtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmd8bnVsbDtcbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgZmlsZSBwYXRoIHRvIGEgbW9kdWxlIG5hbWUgdGhhdCBjYW4gYmUgdXNlZCBhcyBhbiBgaW1wb3J0IC4uLmBcbiAgICogSS5lLiBgcGF0aC90by9pbXBvcnRlZEZpbGUudHNgIHNob3VsZCBiZSBpbXBvcnRlZCBieSBgcGF0aC90by9jb250YWluaW5nRmlsZS50c2AuXG4gICAqL1xuICBmaWxlTmFtZVRvTW9kdWxlTmFtZT8oaW1wb3J0ZWRGaWxlUGF0aDogc3RyaW5nLCBjb250YWluaW5nRmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZztcbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgZmlsZSBwYXRoIGZvciBhIHJlc291cmNlIHRoYXQgaXMgdXNlZCBpbiBhIHNvdXJjZSBmaWxlIG9yIGFub3RoZXIgcmVzb3VyY2VcbiAgICogaW50byBhIGZpbGVwYXRoLlxuICAgKi9cbiAgcmVzb3VyY2VOYW1lVG9GaWxlTmFtZT8ocmVzb3VyY2VOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGw7XG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIGZpbGUgbmFtZSBpbnRvIGEgcmVwcmVzZW50YXRpb24gdGhhdCBzaG91bGQgYmUgc3RvcmVkIGluIGEgc3VtbWFyeSBmaWxlLlxuICAgKiBUaGlzIGhhcyB0byBpbmNsdWRlIGNoYW5naW5nIHRoZSBzdWZmaXggYXMgd2VsbC5cbiAgICogRS5nLlxuICAgKiBgc29tZV9maWxlLnRzYCAtPiBgc29tZV9maWxlLmQudHNgXG4gICAqXG4gICAqIEBwYXJhbSByZWZlcnJpbmdTcmNGaWxlTmFtZSB0aGUgc291cmUgZmlsZSB0aGF0IHJlZmVycyB0byBmaWxlTmFtZVxuICAgKi9cbiAgdG9TdW1tYXJ5RmlsZU5hbWU/KGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ1NyY0ZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIGZpbGVOYW1lIHRoYXQgd2FzIHByb2Nlc3NlZCBieSBgdG9TdW1tYXJ5RmlsZU5hbWVgIGJhY2sgaW50byBhIHJlYWwgZmlsZU5hbWVcbiAgICogZ2l2ZW4gdGhlIGZpbGVOYW1lIG9mIHRoZSBsaWJyYXJ5IHRoYXQgaXMgcmVmZXJyaWcgdG8gaXQuXG4gICAqL1xuICBmcm9tU3VtbWFyeUZpbGVOYW1lPyhmaWxlTmFtZTogc3RyaW5nLCByZWZlcnJpbmdMaWJGaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nO1xuICAvKipcbiAgICogTG9hZCBhIHJlZmVyZW5jZWQgcmVzb3VyY2UgZWl0aGVyIHN0YXRpY2FsbHkgb3IgYXN5bmNocm9ub3VzbHkuIElmIHRoZSBob3N0IHJldHVybnMgYVxuICAgKiBgUHJvbWlzZTxzdHJpbmc+YCBpdCBpcyBhc3N1bWVkIHRoZSB1c2VyIG9mIHRoZSBjb3JyZXNwb25kaW5nIGBQcm9ncmFtYCB3aWxsIGNhbGxcbiAgICogYGxvYWROZ1N0cnVjdHVyZUFzeW5jKClgLiBSZXR1cm5pbmcgIGBQcm9taXNlPHN0cmluZz5gIG91dHNpZGUgYGxvYWROZ1N0cnVjdHVyZUFzeW5jKClgIHdpbGxcbiAgICogY2F1c2UgYSBkaWFnbm9zdGljcyBkaWFnbm9zdGljIGVycm9yIG9yIGFuIGV4Y2VwdGlvbiB0byBiZSB0aHJvd24uXG4gICAqL1xuICByZWFkUmVzb3VyY2U/KGZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz58c3RyaW5nO1xuICAvKipcbiAgICogUHJvZHVjZSBhbiBBTUQgbW9kdWxlIG5hbWUgZm9yIHRoZSBzb3VyY2UgZmlsZS4gVXNlZCBpbiBCYXplbC5cbiAgICpcbiAgICogQW4gQU1EIG1vZHVsZSBjYW4gaGF2ZSBhbiBhcmJpdHJhcnkgbmFtZSwgc28gdGhhdCBpdCBpcyByZXF1aXJlJ2QgYnkgbmFtZVxuICAgKiByYXRoZXIgdGhhbiBieSBwYXRoLiBTZWUgaHR0cDovL3JlcXVpcmVqcy5vcmcvZG9jcy93aHlhbWQuaHRtbCNuYW1lZG1vZHVsZXNcbiAgICovXG4gIGFtZE1vZHVsZU5hbWU/KHNmOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nfHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGVudW0gRW1pdEZsYWdzIHtcbiAgRFRTID0gMSA8PCAwLFxuICBKUyA9IDEgPDwgMSxcbiAgTWV0YWRhdGEgPSAxIDw8IDIsXG4gIEkxOG5CdW5kbGUgPSAxIDw8IDMsXG4gIENvZGVnZW4gPSAxIDw8IDQsXG5cbiAgRGVmYXVsdCA9IERUUyB8IEpTIHwgQ29kZWdlbixcbiAgQWxsID0gRFRTIHwgSlMgfCBNZXRhZGF0YSB8IEkxOG5CdW5kbGUgfCBDb2RlZ2VuLFxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEN1c3RvbVRyYW5zZm9ybWVycyB7XG4gIGJlZm9yZVRzPzogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+W107XG4gIGFmdGVyVHM/OiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT5bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUc0VtaXRBcmd1bWVudHMge1xuICBwcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICBob3N0OiBDb21waWxlckhvc3Q7XG4gIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucztcbiAgdGFyZ2V0U291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGU7XG4gIHdyaXRlRmlsZT86IHRzLldyaXRlRmlsZUNhbGxiYWNrO1xuICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuO1xuICBlbWl0T25seUR0c0ZpbGVzPzogYm9vbGVhbjtcbiAgY3VzdG9tVHJhbnNmb3JtZXJzPzogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRzRW1pdENhbGxiYWNrIHsgKGFyZ3M6IFRzRW1pdEFyZ3VtZW50cyk6IHRzLkVtaXRSZXN1bHQ7IH1cbmV4cG9ydCBpbnRlcmZhY2UgVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2sgeyAocmVzdWx0czogdHMuRW1pdFJlc3VsdFtdKTogdHMuRW1pdFJlc3VsdDsgfVxuXG5leHBvcnQgaW50ZXJmYWNlIExpYnJhcnlTdW1tYXJ5IHtcbiAgZmlsZU5hbWU6IHN0cmluZztcbiAgdGV4dDogc3RyaW5nO1xuICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMYXp5Um91dGUge1xuICByb3V0ZTogc3RyaW5nO1xuICBtb2R1bGU6IHtuYW1lOiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmd9O1xuICByZWZlcmVuY2VkTW9kdWxlOiB7bmFtZT86IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZ307XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvZ3JhbSB7XG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgVHlwZVNjcmlwdCBwcm9ncmFtIHVzZWQgdG8gcHJvZHVjZSBzZW1hbnRpYyBkaWFnbm9zdGljcyBhbmQgZW1pdCB0aGUgc291cmNlcy5cbiAgICpcbiAgICogQW5ndWxhciBzdHJ1Y3R1cmFsIGluZm9ybWF0aW9uIGlzIHJlcXVpcmVkIHRvIHByb2R1Y2UgdGhlIHByb2dyYW0uXG4gICAqL1xuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbTtcblxuICAvKipcbiAgICogUmV0cmlldmUgb3B0aW9ucyBkaWFnbm9zdGljcyBmb3IgdGhlIFR5cGVTY3JpcHQgb3B0aW9ucyB1c2VkIHRvIGNyZWF0ZSB0aGUgcHJvZ3JhbS4gVGhpcyBpc1xuICAgKiBmYXN0ZXIgdGhhbiBjYWxsaW5nIGBnZXRUc1Byb2dyYW0oKS5nZXRPcHRpb25zRGlhZ25vc3RpY3MoKWAgc2luY2UgaXQgZG9lcyBub3QgbmVlZCB0b1xuICAgKiBjb2xsZWN0IEFuZ3VsYXIgc3RydWN0dXJhbCBpbmZvcm1hdGlvbiB0byBwcm9kdWNlIHRoZSBlcnJvcnMuXG4gICAqL1xuICBnZXRUc09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBvcHRpb25zIGRpYWdub3N0aWNzIGZvciB0aGUgQW5ndWxhciBvcHRpb25zIHVzZWQgdG8gY3JlYXRlIHRoZSBwcm9ncmFtLlxuICAgKi9cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogUmV0cmlldmUgdGhlIHN5bnRheCBkaWFnbm9zdGljcyBmcm9tIFR5cGVTY3JpcHQuIFRoaXMgaXMgZmFzdGVyIHRoYW4gY2FsbGluZ1xuICAgKiBgZ2V0VHNQcm9ncmFtKCkuZ2V0U3ludGFjdGljRGlhZ25vc3RpY3MoKWAgc2luY2UgaXQgZG9lcyBub3QgbmVlZCB0byBjb2xsZWN0IEFuZ3VsYXIgc3RydWN0dXJhbFxuICAgKiBpbmZvcm1hdGlvbiB0byBwcm9kdWNlIHRoZSBlcnJvcnMuXG4gICAqL1xuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz47XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSBkaWFnbm9zdGljcyBmb3IgdGhlIHN0cnVjdHVyZSBvZiBhbiBBbmd1bGFyIGFwcGxpY2F0aW9uIGlzIGNvcnJlY3RseSBmb3JtZWQuXG4gICAqIFRoaXMgaW5jbHVkZXMgdmFsaWRhdGluZyBBbmd1bGFyIGFubm90YXRpb25zIGFuZCB0aGUgc3ludGF4IG9mIHJlZmVyZW5jZWQgYW5kIGltYmVkZGVkIEhUTUxcbiAgICogYW5kIENTUy5cbiAgICpcbiAgICogTm90ZSBpdCBpcyBpbXBvcnRhbnQgdG8gZGlzcGxheWluZyBUeXBlU2NyaXB0IHNlbWFudGljIGRpYWdub3N0aWNzIGFsb25nIHdpdGggQW5ndWxhclxuICAgKiBzdHJ1Y3R1cmFsIGRpYWdub3N0aWNzIGFzIGFuIGVycm9yIGluIHRoZSBwcm9ncmFtIHN0cnVjdHVyZSBtaWdodCBjYXVzZSBlcnJvcnMgZGV0ZWN0ZWQgaW5cbiAgICogc2VtYW50aWMgYW5hbHlzaXMgYW5kIGEgc2VtYW50aWMgZXJyb3IgbWlnaHQgY2F1c2UgZXJyb3JzIGluIHNwZWNpZnlpbmcgdGhlIHByb2dyYW0gc3RydWN0dXJlLlxuICAgKlxuICAgKiBBbmd1bGFyIHN0cnVjdHVyYWwgaW5mb3JtYXRpb24gaXMgcmVxdWlyZWQgdG8gcHJvZHVjZSB0aGVzZSBkaWFnbm9zdGljcy5cbiAgICovXG4gIGdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgc2VtYW50aWMgZGlhZ25vc3RpY3MgZnJvbSBUeXBlU2NyaXB0LiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gY2FsbGluZ1xuICAgKiBgZ2V0VHNQcm9ncmFtKCkuZ2V0U2VtYW50aWNEaWFnbm9zdGljcygpYCBkaXJlY3RseSBhbmQgaXMgaW5jbHVkZWQgZm9yIGNvbXBsZXRlbmVzcy5cbiAgICovXG4gIGdldFRzU2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgQW5ndWxhciBzZW1hbnRpYyBkaWFnbm9zdGljcy5cbiAgICpcbiAgICogQW5ndWxhciBzdHJ1Y3R1cmFsIGluZm9ybWF0aW9uIGlzIHJlcXVpcmVkIHRvIHByb2R1Y2UgdGhlc2UgZGlhZ25vc3RpY3MuXG4gICAqL1xuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU/OiBzdHJpbmcsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogTG9hZCBBbmd1bGFyIHN0cnVjdHVyYWwgaW5mb3JtYXRpb24gYXN5bmNocm9ub3VzbHkuIElmIHRoaXMgbWV0aG9kIGlzIG5vdCBjYWxsZWQgdGhlbiB0aGVcbiAgICogQW5ndWxhciBzdHJ1Y3R1cmFsIGluZm9ybWF0aW9uLCBpbmNsdWRpbmcgcmVmZXJlbmNlZCBIVE1MIGFuZCBDU1MgZmlsZXMsIGFyZSBsb2FkZWRcbiAgICogc3luY2hyb25vdXNseS4gSWYgdGhlIHN1cHBsaWVkIEFuZ3VsYXIgY29tcGlsZXIgaG9zdCByZXR1cm5zIGEgcHJvbWlzZSBmcm9tIGBsb2FkUmVzb3VyY2UoKWBcbiAgICogd2lsbCBwcm9kdWNlIGEgZGlhZ25vc3RpYyBlcnJvciBtZXNzYWdlIG9yLCBgZ2V0VHNQcm9ncmFtKClgIG9yIGBlbWl0YCB0byB0aHJvdy5cbiAgICovXG4gIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD47XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGxhenkgcm91dGVzIGluIHRoZSBwcm9ncmFtLlxuICAgKiBAcGFyYW0gZW50cnlSb3V0ZSBBIHJlZmVyZW5jZSB0byBhbiBOZ01vZHVsZSBsaWtlIGBzb21lTW9kdWxlI25hbWVgLiBJZiBnaXZlbixcbiAgICogICAgICAgICAgICAgIHdpbGwgcmVjdXJzaXZlbHkgYW5hbHl6ZSByb3V0ZXMgc3RhcnRpbmcgZnJvbSB0aGlzIHN5bWJvbCBvbmx5LlxuICAgKiAgICAgICAgICAgICAgT3RoZXJ3aXNlIHdpbGwgbGlzdCBhbGwgcm91dGVzIGZvciBhbGwgTmdNb2R1bGVzIGluIHRoZSBwcm9ncmFtL1xuICAgKi9cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdO1xuXG4gIC8qKlxuICAgKiBFbWl0IHRoZSBmaWxlcyByZXF1ZXN0ZWQgYnkgZW1pdEZsYWdzIGltcGxpZWQgYnkgdGhlIHByb2dyYW0uXG4gICAqXG4gICAqIEFuZ3VsYXIgc3RydWN0dXJhbCBpbmZvcm1hdGlvbiBpcyByZXF1aXJlZCB0byBlbWl0IGZpbGVzLlxuICAgKi9cbiAgZW1pdCh7ZW1pdEZsYWdzLCBjYW5jZWxsYXRpb25Ub2tlbiwgY3VzdG9tVHJhbnNmb3JtZXJzLCBlbWl0Q2FsbGJhY2ssXG4gICAgICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFja30/OiB7XG4gICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrXG4gIH0pOiB0cy5FbWl0UmVzdWx0O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSAuZC50cyAvIC5uZ3N1bW1hcnkuanNvbiAvIC5uZ2ZhY3RvcnkuZC50cyBmaWxlcyBvZiBsaWJyYXJpZXMgdGhhdCBoYXZlIGJlZW4gZW1pdHRlZFxuICAgKiBpbiB0aGlzIHByb2dyYW0gb3IgcHJldmlvdXMgcHJvZ3JhbXMgd2l0aCBwYXRocyB0aGF0IGVtdWxhdGUgdGhlIGZhY3QgdGhhdCB0aGVzZSBsaWJyYXJpZXNcbiAgICogaGF2ZSBiZWVuIGNvbXBpbGVkIGJlZm9yZSB3aXRoIG5vIG91dERpci5cbiAgICovXG4gIGdldExpYnJhcnlTdW1tYXJpZXMoKTogTWFwPHN0cmluZywgTGlicmFyeVN1bW1hcnk+O1xuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGdldEVtaXR0ZWRHZW5lcmF0ZWRGaWxlcygpOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPjtcblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT47XG59XG4iXX0=