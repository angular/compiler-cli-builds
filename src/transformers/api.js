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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS1UsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7SUFDekIsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7SUFDekIsUUFBQSxNQUFNLEdBQUcsU0FBc0IsQ0FBQztJQWtCN0MsU0FBZ0IsY0FBYyxDQUFDLFVBQWU7UUFDNUMsT0FBTyxVQUFVLElBQUksSUFBSSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDO0lBQy9ELENBQUM7SUFGRCx3Q0FFQztJQUVELFNBQWdCLGNBQWMsQ0FBQyxVQUFlO1FBQzVDLE9BQU8sVUFBVSxJQUFJLElBQUksSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQztJQUMvRCxDQUFDO0lBRkQsd0NBRUM7SUFzUUQsSUFBWSxTQVNYO0lBVEQsV0FBWSxTQUFTO1FBQ25CLHVDQUFZLENBQUE7UUFDWixxQ0FBVyxDQUFBO1FBQ1gsaURBQWlCLENBQUE7UUFDakIscURBQW1CLENBQUE7UUFDbkIsZ0RBQWdCLENBQUE7UUFFaEIsZ0RBQTRCLENBQUE7UUFDNUIsd0NBQWdELENBQUE7SUFDbEQsQ0FBQyxFQVRXLFNBQVMsR0FBVCxpQkFBUyxLQUFULGlCQUFTLFFBU3BCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0dlbmVyYXRlZEZpbGUsIFBhcnNlU291cmNlU3BhbiwgUG9zaXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9FUlJPUl9DT0RFID0gMTAwO1xuZXhwb3J0IGNvbnN0IFVOS05PV05fRVJST1JfQ09ERSA9IDUwMDtcbmV4cG9ydCBjb25zdCBTT1VSQ0UgPSAnYW5ndWxhcicgYXMgJ2FuZ3VsYXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICBtZXNzYWdlVGV4dDogc3RyaW5nO1xuICBwb3NpdGlvbj86IFBvc2l0aW9uO1xuICBuZXh0PzogRGlhZ25vc3RpY01lc3NhZ2VDaGFpbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaWFnbm9zdGljIHtcbiAgbWVzc2FnZVRleHQ6IHN0cmluZztcbiAgc3Bhbj86IFBhcnNlU291cmNlU3BhbjtcbiAgcG9zaXRpb24/OiBQb3NpdGlvbjtcbiAgY2hhaW4/OiBEaWFnbm9zdGljTWVzc2FnZUNoYWluO1xuICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5O1xuICBjb2RlOiBudW1iZXI7XG4gIHNvdXJjZTogJ2FuZ3VsYXInO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUc0RpYWdub3N0aWMoZGlhZ25vc3RpYzogYW55KTogZGlhZ25vc3RpYyBpcyB0cy5EaWFnbm9zdGljIHtcbiAgcmV0dXJuIGRpYWdub3N0aWMgIT0gbnVsbCAmJiBkaWFnbm9zdGljLnNvdXJjZSAhPT0gJ2FuZ3VsYXInO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOZ0RpYWdub3N0aWMoZGlhZ25vc3RpYzogYW55KTogZGlhZ25vc3RpYyBpcyBEaWFnbm9zdGljIHtcbiAgcmV0dXJuIGRpYWdub3N0aWMgIT0gbnVsbCAmJiBkaWFnbm9zdGljLnNvdXJjZSA9PT0gJ2FuZ3VsYXInO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9ucyBleHRlbmRzIHRzLkNvbXBpbGVyT3B0aW9ucyB7XG4gIC8vIE5PVEU6IFRoZXNlIGNvbW1lbnRzIGFuZCBhaW8vY29udGVudC9ndWlkZXMvYW90LWNvbXBpbGVyLm1kIHNob3VsZCBiZSBrZXB0IGluIHN5bmMuXG5cbiAgLy8gV3JpdGUgc3RhdGlzdGljcyBhYm91dCBjb21waWxhdGlvbiAoZS5nLiB0b3RhbCB0aW1lLCAuLi4pXG4gIC8vIE5vdGU6IHRoaXMgaXMgdGhlIC0tZGlhZ25vc3RpY3MgY29tbWFuZCBsaW5lIG9wdGlvbiBmcm9tIFRTICh3aGljaCBpcyBAaW50ZXJuYWxcbiAgLy8gb24gdHMuQ29tcGlsZXJPcHRpb25zIGludGVyZmFjZSkuXG4gIGRpYWdub3N0aWNzPzogYm9vbGVhbjtcblxuICAvLyBBYnNvbHV0ZSBwYXRoIHRvIGEgZGlyZWN0b3J5IHdoZXJlIGdlbmVyYXRlZCBmaWxlIHN0cnVjdHVyZSBpcyB3cml0dGVuLlxuICAvLyBJZiB1bnNwZWNpZmllZCwgZ2VuZXJhdGVkIGZpbGVzIHdpbGwgYmUgd3JpdHRlbiBhbG9uZ3NpZGUgc291cmNlcy5cbiAgLy8gQGRlcHJlY2F0ZWQgLSBubyBlZmZlY3RcbiAgZ2VuRGlyPzogc3RyaW5nO1xuXG4gIC8vIFBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIHRoZSB0c2NvbmZpZy5qc29uIGZpbGUuXG4gIGJhc2VQYXRoPzogc3RyaW5nO1xuXG4gIC8vIERvbid0IHByb2R1Y2UgLm1ldGFkYXRhLmpzb24gZmlsZXMgKHRoZXkgZG9uJ3Qgd29yayBmb3IgYnVuZGxlZCBlbWl0IHdpdGggLS1vdXQpXG4gIHNraXBNZXRhZGF0YUVtaXQ/OiBib29sZWFuO1xuXG4gIC8vIFByb2R1Y2UgYW4gZXJyb3IgaWYgdGhlIG1ldGFkYXRhIHdyaXR0ZW4gZm9yIGEgY2xhc3Mgd291bGQgcHJvZHVjZSBhbiBlcnJvciBpZiB1c2VkLlxuICBzdHJpY3RNZXRhZGF0YUVtaXQ/OiBib29sZWFuO1xuXG4gIC8vIERvbid0IHByb2R1Y2UgLm5nZmFjdG9yeS5qcyBvciAubmdzdHlsZS5qcyBmaWxlc1xuICBza2lwVGVtcGxhdGVDb2RlZ2VuPzogYm9vbGVhbjtcblxuICAvLyBBbHdheXMgcmVwb3J0IGVycm9ycyB3aGVuIHRoZSB0eXBlIG9mIGEgcGFyYW1ldGVyIHN1cHBsaWVkIHdob3NlIGluamVjdGlvbiB0eXBlIGNhbm5vdFxuICAvLyBiZSBkZXRlcm1pbmVkLiBXaGVuIHRoaXMgdmFsdWUgb3B0aW9uIGlzIG5vdCBwcm92aWRlZCBvciBpcyBgZmFsc2VgLCBjb25zdHJ1Y3RvclxuICAvLyBwYXJhbWV0ZXJzIG9mIGNsYXNzZXMgbWFya2VkIHdpdGggYEBJbmplY3RhYmxlYCB3aG9zZSB0eXBlIGNhbm5vdCBiZSByZXNvbHZlZCB3aWxsXG4gIC8vIHByb2R1Y2UgYSB3YXJuaW5nLiBXaXRoIHRoaXMgb3B0aW9uIGB0cnVlYCwgdGhleSBwcm9kdWNlIGFuIGVycm9yLiBXaGVuIHRoaXMgb3B0aW9uIGlzXG4gIC8vIG5vdCBwcm92aWRlZCBpcyB0cmVhdGVkIGFzIGlmIGl0IHdlcmUgYGZhbHNlYC4gSW4gQW5ndWxhciA2LjAsIGlmIHRoaXMgb3B0aW9uIGlzIG5vdFxuICAvLyBwcm92aWRlZCwgaXQgd2lsbCBiZSB0cmVhdGVkIGFzIGB0cnVlYC5cbiAgc3RyaWN0SW5qZWN0aW9uUGFyYW1ldGVycz86IGJvb2xlYW47XG5cbiAgLy8gV2hldGhlciB0byBnZW5lcmF0ZSBhIGZsYXQgbW9kdWxlIGluZGV4IG9mIHRoZSBnaXZlbiBuYW1lIGFuZCB0aGUgY29ycmVzcG9uZGluZ1xuICAvLyBmbGF0IG1vZHVsZSBtZXRhZGF0YS4gVGhpcyBvcHRpb24gaXMgaW50ZW5kZWQgdG8gYmUgdXNlZCB3aGVuIGNyZWF0aW5nIGZsYXRcbiAgLy8gbW9kdWxlcyBzaW1pbGFyIHRvIGhvdyBgQGFuZ3VsYXIvY29yZWAgYW5kIGBAYW5ndWxhci9jb21tb25gIGFyZSBwYWNrYWdlZC5cbiAgLy8gV2hlbiB0aGlzIG9wdGlvbiBpcyB1c2VkIHRoZSBgcGFja2FnZS5qc29uYCBmb3IgdGhlIGxpYnJhcnkgc2hvdWxkIHJlZmVycmVkIHRvIHRoZVxuICAvLyBnZW5lcmF0ZWQgZmxhdCBtb2R1bGUgaW5kZXggaW5zdGVhZCBvZiB0aGUgbGlicmFyeSBpbmRleCBmaWxlLiBXaGVuIHVzaW5nIHRoaXNcbiAgLy8gb3B0aW9uIG9ubHkgb25lIC5tZXRhZGF0YS5qc29uIGZpbGUgaXMgcHJvZHVjZWQgdGhhdCBjb250YWlucyBhbGwgdGhlIG1ldGFkYXRhXG4gIC8vIG5lY2Vzc2FyeSBmb3Igc3ltYm9scyBleHBvcnRlZCBmcm9tIHRoZSBsaWJyYXJ5IGluZGV4LlxuICAvLyBJbiB0aGUgZ2VuZXJhdGVkIC5uZ2ZhY3RvcnkudHMgZmlsZXMgZmxhdCBtb2R1bGUgaW5kZXggaXMgdXNlZCB0byBpbXBvcnQgc3ltYm9sc1xuICAvLyBpbmNsdWRlcyBib3RoIHRoZSBwdWJsaWMgQVBJIGZyb20gdGhlIGxpYnJhcnkgaW5kZXggYXMgd2VsbCBhcyBzaHJvd2RlZCBpbnRlcm5hbFxuICAvLyBzeW1ib2xzLlxuICAvLyBCeSBkZWZhdWx0IHRoZSAudHMgZmlsZSBzdXBwbGllZCBpbiB0aGUgYGZpbGVzYCBmaWxlcyBmaWVsZCBpcyBhc3N1bWVkIHRvIGJlXG4gIC8vIGxpYnJhcnkgaW5kZXguIElmIG1vcmUgdGhhbiBvbmUgaXMgc3BlY2lmaWVkLCB1c2VzIGBsaWJyYXJ5SW5kZXhgIHRvIHNlbGVjdCB0aGVcbiAgLy8gZmlsZSB0byB1c2UuIElmIG1vcmUgdGhhbiBvbiAudHMgZmlsZSBpcyBzdXBwbGllZCBhbmQgbm8gYGxpYnJhcnlJbmRleGAgaXMgc3VwcGxpZWRcbiAgLy8gYW4gZXJyb3IgaXMgcHJvZHVjZWQuXG4gIC8vIEEgZmxhdCBtb2R1bGUgaW5kZXggLmQudHMgYW5kIC5qcyB3aWxsIGJlIGNyZWF0ZWQgd2l0aCB0aGUgZ2l2ZW4gYGZsYXRNb2R1bGVPdXRGaWxlYFxuICAvLyBuYW1lIGluIHRoZSBzYW1lIGxvY2F0aW9uIGFzIHRoZSBsaWJyYXJ5IGluZGV4IC5kLnRzIGZpbGUgaXMgZW1pdHRlZC5cbiAgLy8gRm9yIGV4YW1wbGUsIGlmIGEgbGlicmFyeSB1c2VzIGBwdWJsaWNfYXBpLnRzYCBmaWxlIGFzIHRoZSBsaWJyYXJ5IGluZGV4IG9mIHRoZVxuICAvLyBtb2R1bGUgdGhlIGB0c2NvbmZpZy5qc29uYCBgZmlsZXNgIGZpZWxkIHdvdWxkIGJlIGBbXCJwdWJsaWNfYXBpLnRzXCJdYC4gVGhlXG4gIC8vIGBmbGF0TW9kdWxlT3V0RmlsZWAgb3B0aW9ucyBjb3VsZCB0aGVuIGJlIHNldCB0bywgZm9yIGV4YW1wbGUgYFwiaW5kZXguanNcImAsIHdoaWNoXG4gIC8vIHByb2R1Y2VzIGBpbmRleC5kLnRzYCBhbmQgIGBpbmRleC5tZXRhZGF0YS5qc29uYCBmaWxlcy4gVGhlIGxpYnJhcnknc1xuICAvLyBgcGFja2FnZS5qc29uYCdzIGBtb2R1bGVgIGZpZWxkIHdvdWxkIGJlIGBcImluZGV4LmpzXCJgIGFuZCB0aGUgYHR5cGluZ3NgIGZpZWxkIHdvdWxkXG4gIC8vIGJlIGBcImluZGV4LmQudHNcImAuXG4gIGZsYXRNb2R1bGVPdXRGaWxlPzogc3RyaW5nO1xuXG4gIC8vIFByZWZlcnJlZCBtb2R1bGUgaWQgdG8gdXNlIGZvciBpbXBvcnRpbmcgZmxhdCBtb2R1bGUuIFJlZmVyZW5jZXMgZ2VuZXJhdGVkIGJ5IGBuZ2NgXG4gIC8vIHdpbGwgdXNlIHRoaXMgbW9kdWxlIG5hbWUgd2hlbiBpbXBvcnRpbmcgc3ltYm9scyBmcm9tIHRoZSBmbGF0IG1vZHVsZS4gVGhpcyBpcyBvbmx5XG4gIC8vIG1lYW5pbmdmdWwgd2hlbiBgZmxhdE1vZHVsZU91dEZpbGVgIGlzIGFsc28gc3VwcGxpZWQuIEl0IGlzIG90aGVyd2lzZSBpZ25vcmVkLlxuICBmbGF0TW9kdWxlSWQ/OiBzdHJpbmc7XG5cbiAgLy8gQSBwcmVmaXggdG8gaW5zZXJ0IGluIGdlbmVyYXRlZCBwcml2YXRlIHN5bWJvbHMsIGUuZy4gZm9yIFwibXlfcHJlZml4X1wiIHdlXG4gIC8vIHdvdWxkIGdlbmVyYXRlIHByaXZhdGUgc3ltYm9scyBuYW1lZCBsaWtlIGDJtW15X3ByZWZpeF9hYC5cbiAgZmxhdE1vZHVsZVByaXZhdGVTeW1ib2xQcmVmaXg/OiBzdHJpbmc7XG5cbiAgLy8gV2hldGhlciB0byBnZW5lcmF0ZSBjb2RlIGZvciBsaWJyYXJ5IGNvZGUuXG4gIC8vIElmIHRydWUsIHByb2R1Y2UgLm5nZmFjdG9yeS50cyBhbmQgLm5nc3R5bGUudHMgZmlsZXMgZm9yIC5kLnRzIGlucHV0cy5cbiAgLy8gRGVmYXVsdCBpcyB0cnVlLlxuICBnZW5lcmF0ZUNvZGVGb3JMaWJyYXJpZXM/OiBib29sZWFuO1xuXG4gIC8vIFdoZXRoZXIgdG8gZW5hYmxlIGFsbCB0eXBlIGNoZWNrcyBmb3IgdGVtcGxhdGVzLlxuICAvLyBUaGlzIHdpbGwgYmUgdHJ1ZSBiZSBkZWZhdWx0IGluIEFuZ3VsYXIgNi5cbiAgZnVsbFRlbXBsYXRlVHlwZUNoZWNrPzogYm9vbGVhbjtcblxuICAvLyBXaGV0aGVyIHRvIHVzZSB0aGUgQ29tcGlsZXJIb3N0J3MgZmlsZU5hbWVUb01vZHVsZU5hbWUgdXRpbGl0eSAoaWYgYXZhaWxhYmxlKSB0byBnZW5lcmF0ZVxuICAvLyBpbXBvcnQgbW9kdWxlIHNwZWNpZmllcnMuIFRoaXMgaXMgZmFsc2UgYnkgZGVmYXVsdCwgYW5kIGV4aXN0cyB0byBzdXBwb3J0IHJ1bm5pbmcgbmd0c2NcbiAgLy8gd2l0aGluIEdvb2dsZS4gVGhpcyBvcHRpb24gaXMgaW50ZXJuYWwgYW5kIGlzIHVzZWQgYnkgdGhlIG5nX21vZHVsZS5iemwgcnVsZSB0byBzd2l0Y2hcbiAgLy8gYmVoYXZpb3IgYmV0d2VlbiBCYXplbCBhbmQgQmxhemUuXG4gIF91c2VIb3N0Rm9ySW1wb3J0R2VuZXJhdGlvbj86IGJvb2xlYW47XG5cbiAgLy8gSW5zZXJ0IEpTRG9jIHR5cGUgYW5ub3RhdGlvbnMgbmVlZGVkIGJ5IENsb3N1cmUgQ29tcGlsZXJcbiAgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI/OiBib29sZWFuO1xuXG4gIC8vIE1vZGlmeSBob3cgYW5ndWxhciBhbm5vdGF0aW9ucyBhcmUgZW1pdHRlZCB0byBpbXByb3ZlIHRyZWUtc2hha2luZy5cbiAgLy8gRGVmYXVsdCBpcyBzdGF0aWMgZmllbGRzLlxuICAvLyBkZWNvcmF0b3JzOiBMZWF2ZSB0aGUgRGVjb3JhdG9ycyBpbi1wbGFjZS4gVGhpcyBtYWtlcyBjb21waWxhdGlvbiBmYXN0ZXIuXG4gIC8vICAgICAgICAgICAgIFR5cGVTY3JpcHQgd2lsbCBlbWl0IGNhbGxzIHRvIHRoZSBfX2RlY29yYXRlIGhlbHBlci5cbiAgLy8gICAgICAgICAgICAgYC0tZW1pdERlY29yYXRvck1ldGFkYXRhYCBjYW4gYmUgdXNlZCBmb3IgcnVudGltZSByZWZsZWN0aW9uLlxuICAvLyAgICAgICAgICAgICBIb3dldmVyLCB0aGUgcmVzdWx0aW5nIGNvZGUgd2lsbCBub3QgcHJvcGVybHkgdHJlZS1zaGFrZS5cbiAgLy8gc3RhdGljIGZpZWxkczogUmVwbGFjZSBkZWNvcmF0b3JzIHdpdGggYSBzdGF0aWMgZmllbGQgaW4gdGhlIGNsYXNzLlxuICAvLyAgICAgICAgICAgICAgICBBbGxvd3MgYWR2YW5jZWQgdHJlZS1zaGFrZXJzIGxpa2UgQ2xvc3VyZSBDb21waWxlciB0byByZW1vdmVcbiAgLy8gICAgICAgICAgICAgICAgdW51c2VkIGNsYXNzZXMuXG4gIGFubm90YXRpb25zQXM/OiAnZGVjb3JhdG9ycyd8J3N0YXRpYyBmaWVsZHMnO1xuXG4gIC8vIFByaW50IGV4dHJhIGluZm9ybWF0aW9uIHdoaWxlIHJ1bm5pbmcgdGhlIGNvbXBpbGVyXG4gIHRyYWNlPzogYm9vbGVhbjtcblxuICAvLyBXaGV0aGVyIHRvIGVuYWJsZSBsb3dlcmluZyBleHByZXNzaW9ucyBsYW1iZGFzIGFuZCBleHByZXNzaW9ucyBpbiBhIHJlZmVyZW5jZSB2YWx1ZVxuICAvLyBwb3NpdGlvbi5cbiAgZGlzYWJsZUV4cHJlc3Npb25Mb3dlcmluZz86IGJvb2xlYW47XG5cbiAgLy8gRGlzYWJsZSBUeXBlU2NyaXB0IFZlcnNpb24gQ2hlY2suXG4gIGRpc2FibGVUeXBlU2NyaXB0VmVyc2lvbkNoZWNrPzogYm9vbGVhbjtcblxuICAvLyBMb2NhbGUgb2YgdGhlIGFwcGxpY2F0aW9uXG4gIGkxOG5PdXRMb2NhbGU/OiBzdHJpbmc7XG4gIC8vIEV4cG9ydCBmb3JtYXQgKHhsZiwgeGxmMiBvciB4bWIpXG4gIGkxOG5PdXRGb3JtYXQ/OiBzdHJpbmc7XG4gIC8vIFBhdGggdG8gdGhlIGV4dHJhY3RlZCBtZXNzYWdlIGZpbGVcbiAgaTE4bk91dEZpbGU/OiBzdHJpbmc7XG5cbiAgLy8gSW1wb3J0IGZvcm1hdCBpZiBkaWZmZXJlbnQgZnJvbSBgaTE4bkZvcm1hdGBcbiAgaTE4bkluRm9ybWF0Pzogc3RyaW5nO1xuICAvLyBMb2NhbGUgb2YgdGhlIGltcG9ydGVkIHRyYW5zbGF0aW9uc1xuICBpMThuSW5Mb2NhbGU/OiBzdHJpbmc7XG4gIC8vIFBhdGggdG8gdGhlIHRyYW5zbGF0aW9uIGZpbGVcbiAgaTE4bkluRmlsZT86IHN0cmluZztcbiAgLy8gSG93IHRvIGhhbmRsZSBtaXNzaW5nIG1lc3NhZ2VzXG4gIGkxOG5Jbk1pc3NpbmdUcmFuc2xhdGlvbnM/OiAnZXJyb3InfCd3YXJuaW5nJ3wnaWdub3JlJztcbiAgLy8gV2hldGhlciB0cmFuc2xhdGlvbiB2YXJpYWJsZSBuYW1lIHNob3VsZCBjb250YWluIGV4dGVybmFsIG1lc3NhZ2UgaWRcbiAgLy8gKHVzZWQgYnkgQ2xvc3VyZSBDb21waWxlcidzIG91dHB1dCBvZiBgZ29vZy5nZXRNc2dgIGZvciB0cmFuc2l0aW9uIHBlcmlvZClcbiAgaTE4blVzZUV4dGVybmFsSWRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogUmVuZGVyIGAkbG9jYWxpemVgIG1lc3NhZ2UgaWRzIHdpdGggdGhlIGxlZ2FjeSBmb3JtYXQgKHhsZiwgeGxmMiBvciB4bWIpIHNwZWNpZmllZCBpblxuICAgKiBgaTE4bkluRm9ybWF0YC5cbiAgICpcbiAgICogVGhpcyBpcyBvbmx5IGFjdGl2ZSBpZiB3ZSBhcmUgYnVpbGRpbmcgd2l0aCBgZW5hYmxlSXZ5OiB0cnVlYCBhbmQgYSB2YWxpZFxuICAgKiBgaTE4bkluRm9ybWF0YCBoYXMgYmVlbiBwcm92aWRlZC4gVGhlIGRlZmF1bHQgdmFsdWUgZm9yIG5vdyBpcyBgdHJ1ZWAuXG4gICAqXG4gICAqIFVzZSB0aGlzIG9wdGlvbiB3aGVuIHVzZSBhcmUgdXNpbmcgdGhlIGAkbG9jYWxpemVgIGJhc2VkIGxvY2FsaXphdGlvbiBtZXNzYWdlcyBidXRcbiAgICogaGF2ZSBub3QgbWlncmF0ZWQgdGhlIHRyYW5zbGF0aW9uIGZpbGVzIHRvIHVzZSB0aGUgbmV3IGAkbG9jYWxpemVgIG1lc3NhZ2UgaWQgZm9ybWF0LlxuICAgKi9cbiAgZW5hYmxlSTE4bkxlZ2FjeU1lc3NhZ2VJZEZvcm1hdD86IGJvb2xlYW47XG5cbiAgLy8gV2hldGhlciB0byByZW1vdmUgYmxhbmsgdGV4dCBub2RlcyBmcm9tIGNvbXBpbGVkIHRlbXBsYXRlcy4gSXQgaXMgYGZhbHNlYCBieSBkZWZhdWx0IHN0YXJ0aW5nXG4gIC8vIGZyb20gQW5ndWxhciA2LlxuICBwcmVzZXJ2ZVdoaXRlc3BhY2VzPzogYm9vbGVhbjtcblxuICAvKiogZ2VuZXJhdGUgYWxsIHBvc3NpYmxlIGdlbmVyYXRlZCBmaWxlcyAgKi9cbiAgYWxsb3dFbXB0eUNvZGVnZW5GaWxlcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gZ2VuZXJhdGUgLm5nc3VtbWFyeS50cyBmaWxlcyB0aGF0IGFsbG93IHRvIHVzZSBBT1RlZCBhcnRpZmFjdHNcbiAgICogaW4gSklUIG1vZGUuIFRoaXMgaXMgb2ZmIGJ5IGRlZmF1bHQuXG4gICAqL1xuICBlbmFibGVTdW1tYXJpZXNGb3JKaXQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHJlcGxhY2UgdGhlIGB0ZW1wbGF0ZVVybGAgYW5kIGBzdHlsZVVybHNgIHByb3BlcnR5IGluIGFsbFxuICAgKiBAQ29tcG9uZW50IGRlY29yYXRvcnMgd2l0aCBpbmxpbmVkIGNvbnRlbnRzIGluIGB0ZW1wbGF0ZWAgYW5kIGBzdHlsZXNgXG4gICAqIHByb3BlcnRpZXMuXG4gICAqIFdoZW4gZW5hYmxlZCwgdGhlIC5qcyBvdXRwdXQgb2YgbmdjIHdpbGwgaGF2ZSBubyBsYXp5LWxvYWRlZCBgdGVtcGxhdGVVcmxgXG4gICAqIG9yIGBzdHlsZVVybGBzLiBOb3RlIHRoYXQgdGhpcyByZXF1aXJlcyB0aGF0IHJlc291cmNlcyBiZSBhdmFpbGFibGUgdG9cbiAgICogbG9hZCBzdGF0aWNhbGx5IGF0IGNvbXBpbGUtdGltZS5cbiAgICovXG4gIGVuYWJsZVJlc291cmNlSW5saW5pbmc/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUZWxscyB0aGUgY29tcGlsZXIgdG8gZ2VuZXJhdGUgZGVmaW5pdGlvbnMgdXNpbmcgdGhlIFJlbmRlcjMgc3R5bGUgY29kZSBnZW5lcmF0aW9uLlxuICAgKiBUaGlzIG9wdGlvbiBkZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqXG4gICAqIEFjY2VwdGFibGUgdmFsdWVzIGFyZSBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgZmFsc2VgIC0gcnVuIG5nYyBub3JtYWxseVxuICAgKiBgdHJ1ZWAgLSBydW4gdGhlIG5ndHNjIGNvbXBpbGVyIGluc3RlYWQgb2YgdGhlIG5vcm1hbCBuZ2MgY29tcGlsZXJcbiAgICogYG5ndHNjYCAtIGFsaWFzIGZvciBgdHJ1ZWBcbiAgICpcbiAgICogQHB1YmxpY0FwaVxuICAgKi9cbiAgZW5hYmxlSXZ5PzogYm9vbGVhbnwnbmd0c2MnO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29sbGVjdEFsbEVycm9ycz86IGJvb2xlYW47XG5cbiAgLyoqIEFuIG9wdGlvbiB0byBlbmFibGUgbmd0c2MncyBpbnRlcm5hbCBwZXJmb3JtYW5jZSB0cmFjaW5nLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCBiZSBhIHBhdGggdG8gYSBKU09OIGZpbGUgd2hlcmUgdHJhY2UgaW5mb3JtYXRpb24gd2lsbCBiZSB3cml0dGVuLiBBbiBvcHRpb25hbCAndHM6J1xuICAgKiBwcmVmaXggd2lsbCBjYXVzZSB0aGUgdHJhY2UgdG8gYmUgd3JpdHRlbiB2aWEgdGhlIFRTIGhvc3QgaW5zdGVhZCBvZiBkaXJlY3RseSB0byB0aGUgZmlsZXN5c3RlbVxuICAgKiAobm90IGFsbCBob3N0cyBzdXBwb3J0IHRoaXMgbW9kZSBvZiBvcGVyYXRpb24pLlxuICAgKlxuICAgKiBUaGlzIGlzIGN1cnJlbnRseSBub3QgZXhwb3NlZCB0byB1c2VycyBhcyB0aGUgdHJhY2UgZm9ybWF0IGlzIHN0aWxsIHVuc3RhYmxlLlxuICAgKlxuICAgKiBAaW50ZXJuYWwgKi9cbiAgdHJhY2VQZXJmb3JtYW5jZT86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciBOR0Mgc2hvdWxkIGdlbmVyYXRlIHJlLWV4cG9ydHMgZm9yIGV4dGVybmFsIHN5bWJvbHMgd2hpY2ggYXJlIHJlZmVyZW5jZWRcbiAgICogaW4gQW5ndWxhciBtZXRhZGF0YSAoZS5nLiBAQ29tcG9uZW50LCBASW5qZWN0LCBAVmlld0NoaWxkKS4gVGhpcyBjYW4gYmUgZW5hYmxlZCBpblxuICAgKiBvcmRlciB0byBhdm9pZCBkeW5hbWljYWxseSBnZW5lcmF0ZWQgbW9kdWxlIGRlcGVuZGVuY2llcyB3aGljaCBjYW4gYnJlYWsgc3RyaWN0XG4gICAqIGRlcGVuZGVuY3kgZW5mb3JjZW1lbnRzLiBUaGlzIGlzIG5vdCBlbmFibGVkIGJ5IGRlZmF1bHQuXG4gICAqIFJlYWQgbW9yZSBhYm91dCB0aGlzIGhlcmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzI1NjQ0LlxuICAgKi9cbiAgY3JlYXRlRXh0ZXJuYWxTeW1ib2xGYWN0b3J5UmVleHBvcnRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVHVybiBvbiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGluIHRoZSBJdnkgY29tcGlsZXIuXG4gICAqXG4gICAqIFRoaXMgaXMgYW4gaW50ZXJuYWwgZmxhZyBiZWluZyB1c2VkIHRvIHJvbGwgb3V0IHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgaW4gbmd0c2MuIFR1cm5pbmcgaXQgb25cbiAgICogYnkgZGVmYXVsdCBiZWZvcmUgaXQncyByZWFkeSBtaWdodCBicmVhayBvdGhlciB1c2VycyBhdHRlbXB0aW5nIHRvIHRlc3QgdGhlIG5ldyBjb21waWxlcidzXG4gICAqIGJlaGF2aW9yLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGl2eVRlbXBsYXRlVHlwZUNoZWNrPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlckhvc3QgZXh0ZW5kcyB0cy5Db21waWxlckhvc3Qge1xuICAvKipcbiAgICogQ29udmVydHMgYSBtb2R1bGUgbmFtZSB0aGF0IGlzIHVzZWQgaW4gYW4gYGltcG9ydGAgdG8gYSBmaWxlIHBhdGguXG4gICAqIEkuZS4gYHBhdGgvdG8vY29udGFpbmluZ0ZpbGUudHNgIGNvbnRhaW5pbmcgYGltcG9ydCB7Li4ufSBmcm9tICdtb2R1bGUtbmFtZSdgLlxuICAgKi9cbiAgbW9kdWxlTmFtZVRvRmlsZU5hbWU/KG1vZHVsZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGU6IHN0cmluZyk6IHN0cmluZ3xudWxsO1xuICAvKipcbiAgICogQ29udmVydHMgYSBmaWxlIHBhdGggdG8gYSBtb2R1bGUgbmFtZSB0aGF0IGNhbiBiZSB1c2VkIGFzIGFuIGBpbXBvcnQgLi4uYFxuICAgKiBJLmUuIGBwYXRoL3RvL2ltcG9ydGVkRmlsZS50c2Agc2hvdWxkIGJlIGltcG9ydGVkIGJ5IGBwYXRoL3RvL2NvbnRhaW5pbmdGaWxlLnRzYC5cbiAgICovXG4gIGZpbGVOYW1lVG9Nb2R1bGVOYW1lPyhpbXBvcnRlZEZpbGVQYXRoOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nO1xuICAvKipcbiAgICogQ29udmVydHMgYSBmaWxlIHBhdGggZm9yIGEgcmVzb3VyY2UgdGhhdCBpcyB1c2VkIGluIGEgc291cmNlIGZpbGUgb3IgYW5vdGhlciByZXNvdXJjZVxuICAgKiBpbnRvIGEgZmlsZXBhdGguXG4gICAqL1xuICByZXNvdXJjZU5hbWVUb0ZpbGVOYW1lPyhyZXNvdXJjZU5hbWU6IHN0cmluZywgY29udGFpbmluZ0ZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmd8bnVsbDtcbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgZmlsZSBuYW1lIGludG8gYSByZXByZXNlbnRhdGlvbiB0aGF0IHNob3VsZCBiZSBzdG9yZWQgaW4gYSBzdW1tYXJ5IGZpbGUuXG4gICAqIFRoaXMgaGFzIHRvIGluY2x1ZGUgY2hhbmdpbmcgdGhlIHN1ZmZpeCBhcyB3ZWxsLlxuICAgKiBFLmcuXG4gICAqIGBzb21lX2ZpbGUudHNgIC0+IGBzb21lX2ZpbGUuZC50c2BcbiAgICpcbiAgICogQHBhcmFtIHJlZmVycmluZ1NyY0ZpbGVOYW1lIHRoZSBzb3VyZSBmaWxlIHRoYXQgcmVmZXJzIHRvIGZpbGVOYW1lXG4gICAqL1xuICB0b1N1bW1hcnlGaWxlTmFtZT8oZmlsZU5hbWU6IHN0cmluZywgcmVmZXJyaW5nU3JjRmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZztcbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgZmlsZU5hbWUgdGhhdCB3YXMgcHJvY2Vzc2VkIGJ5IGB0b1N1bW1hcnlGaWxlTmFtZWAgYmFjayBpbnRvIGEgcmVhbCBmaWxlTmFtZVxuICAgKiBnaXZlbiB0aGUgZmlsZU5hbWUgb2YgdGhlIGxpYnJhcnkgdGhhdCBpcyByZWZlcnJpZyB0byBpdC5cbiAgICovXG4gIGZyb21TdW1tYXJ5RmlsZU5hbWU/KGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ0xpYkZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBMb2FkIGEgcmVmZXJlbmNlZCByZXNvdXJjZSBlaXRoZXIgc3RhdGljYWxseSBvciBhc3luY2hyb25vdXNseS4gSWYgdGhlIGhvc3QgcmV0dXJucyBhXG4gICAqIGBQcm9taXNlPHN0cmluZz5gIGl0IGlzIGFzc3VtZWQgdGhlIHVzZXIgb2YgdGhlIGNvcnJlc3BvbmRpbmcgYFByb2dyYW1gIHdpbGwgY2FsbFxuICAgKiBgbG9hZE5nU3RydWN0dXJlQXN5bmMoKWAuIFJldHVybmluZyAgYFByb21pc2U8c3RyaW5nPmAgb3V0c2lkZSBgbG9hZE5nU3RydWN0dXJlQXN5bmMoKWAgd2lsbFxuICAgKiBjYXVzZSBhIGRpYWdub3N0aWNzIGRpYWdub3N0aWMgZXJyb3Igb3IgYW4gZXhjZXB0aW9uIHRvIGJlIHRocm93bi5cbiAgICovXG4gIHJlYWRSZXNvdXJjZT8oZmlsZU5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPnxzdHJpbmc7XG4gIC8qKlxuICAgKiBQcm9kdWNlIGFuIEFNRCBtb2R1bGUgbmFtZSBmb3IgdGhlIHNvdXJjZSBmaWxlLiBVc2VkIGluIEJhemVsLlxuICAgKlxuICAgKiBBbiBBTUQgbW9kdWxlIGNhbiBoYXZlIGFuIGFyYml0cmFyeSBuYW1lLCBzbyB0aGF0IGl0IGlzIHJlcXVpcmUnZCBieSBuYW1lXG4gICAqIHJhdGhlciB0aGFuIGJ5IHBhdGguIFNlZSBodHRwOi8vcmVxdWlyZWpzLm9yZy9kb2NzL3doeWFtZC5odG1sI25hbWVkbW9kdWxlc1xuICAgKi9cbiAgYW1kTW9kdWxlTmFtZT8oc2Y6IHRzLlNvdXJjZUZpbGUpOiBzdHJpbmd8dW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGFic29sdXRlIHBhdGhzIHRvIHRoZSBjaGFuZ2VkIGZpbGVzIHRoYXQgdHJpZ2dlcmVkIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uXG4gICAqIG9yIGB1bmRlZmluZWRgIGlmIHRoaXMgaXMgbm90IGFuIGluY3JlbWVudGFsIGJ1aWxkLlxuICAgKi9cbiAgZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzPygpOiBTZXQ8c3RyaW5nPnx1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBlbnVtIEVtaXRGbGFncyB7XG4gIERUUyA9IDEgPDwgMCxcbiAgSlMgPSAxIDw8IDEsXG4gIE1ldGFkYXRhID0gMSA8PCAyLFxuICBJMThuQnVuZGxlID0gMSA8PCAzLFxuICBDb2RlZ2VuID0gMSA8PCA0LFxuXG4gIERlZmF1bHQgPSBEVFMgfCBKUyB8IENvZGVnZW4sXG4gIEFsbCA9IERUUyB8IEpTIHwgTWV0YWRhdGEgfCBJMThuQnVuZGxlIHwgQ29kZWdlbixcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDdXN0b21UcmFuc2Zvcm1lcnMge1xuICBiZWZvcmVUcz86IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdO1xuICBhZnRlclRzPzogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNFbWl0QXJndW1lbnRzIHtcbiAgcHJvZ3JhbTogdHMuUHJvZ3JhbTtcbiAgaG9zdDogQ29tcGlsZXJIb3N0O1xuICBvcHRpb25zOiBDb21waWxlck9wdGlvbnM7XG4gIHRhcmdldFNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlO1xuICB3cml0ZUZpbGU/OiB0cy5Xcml0ZUZpbGVDYWxsYmFjaztcbiAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbjtcbiAgZW1pdE9ubHlEdHNGaWxlcz86IGJvb2xlYW47XG4gIGN1c3RvbVRyYW5zZm9ybWVycz86IHRzLkN1c3RvbVRyYW5zZm9ybWVycztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUc0VtaXRDYWxsYmFjayB7IChhcmdzOiBUc0VtaXRBcmd1bWVudHMpOiB0cy5FbWl0UmVzdWx0OyB9XG5leHBvcnQgaW50ZXJmYWNlIFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrIHsgKHJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSk6IHRzLkVtaXRSZXN1bHQ7IH1cblxuZXhwb3J0IGludGVyZmFjZSBMaWJyYXJ5U3VtbWFyeSB7XG4gIGZpbGVOYW1lOiBzdHJpbmc7XG4gIHRleHQ6IHN0cmluZztcbiAgc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGF6eVJvdXRlIHtcbiAgcm91dGU6IHN0cmluZztcbiAgbW9kdWxlOiB7bmFtZTogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nfTtcbiAgcmVmZXJlbmNlZE1vZHVsZToge25hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZ307XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvZ3JhbSB7XG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgVHlwZVNjcmlwdCBwcm9ncmFtIHVzZWQgdG8gcHJvZHVjZSBzZW1hbnRpYyBkaWFnbm9zdGljcyBhbmQgZW1pdCB0aGUgc291cmNlcy5cbiAgICpcbiAgICogQW5ndWxhciBzdHJ1Y3R1cmFsIGluZm9ybWF0aW9uIGlzIHJlcXVpcmVkIHRvIHByb2R1Y2UgdGhlIHByb2dyYW0uXG4gICAqL1xuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbTtcblxuICAvKipcbiAgICogUmV0cmlldmUgb3B0aW9ucyBkaWFnbm9zdGljcyBmb3IgdGhlIFR5cGVTY3JpcHQgb3B0aW9ucyB1c2VkIHRvIGNyZWF0ZSB0aGUgcHJvZ3JhbS4gVGhpcyBpc1xuICAgKiBmYXN0ZXIgdGhhbiBjYWxsaW5nIGBnZXRUc1Byb2dyYW0oKS5nZXRPcHRpb25zRGlhZ25vc3RpY3MoKWAgc2luY2UgaXQgZG9lcyBub3QgbmVlZCB0b1xuICAgKiBjb2xsZWN0IEFuZ3VsYXIgc3RydWN0dXJhbCBpbmZvcm1hdGlvbiB0byBwcm9kdWNlIHRoZSBlcnJvcnMuXG4gICAqL1xuICBnZXRUc09wdGlvbkRpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBvcHRpb25zIGRpYWdub3N0aWNzIGZvciB0aGUgQW5ndWxhciBvcHRpb25zIHVzZWQgdG8gY3JlYXRlIHRoZSBwcm9ncmFtLlxuICAgKi9cbiAgZ2V0TmdPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpY3xEaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogUmV0cmlldmUgdGhlIHN5bnRheCBkaWFnbm9zdGljcyBmcm9tIFR5cGVTY3JpcHQuIFRoaXMgaXMgZmFzdGVyIHRoYW4gY2FsbGluZ1xuICAgKiBgZ2V0VHNQcm9ncmFtKCkuZ2V0U3ludGFjdGljRGlhZ25vc3RpY3MoKWAgc2luY2UgaXQgZG9lcyBub3QgbmVlZCB0byBjb2xsZWN0IEFuZ3VsYXIgc3RydWN0dXJhbFxuICAgKiBpbmZvcm1hdGlvbiB0byBwcm9kdWNlIHRoZSBlcnJvcnMuXG4gICAqL1xuICBnZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz47XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSBkaWFnbm9zdGljcyBmb3IgdGhlIHN0cnVjdHVyZSBvZiBhbiBBbmd1bGFyIGFwcGxpY2F0aW9uIGlzIGNvcnJlY3RseSBmb3JtZWQuXG4gICAqIFRoaXMgaW5jbHVkZXMgdmFsaWRhdGluZyBBbmd1bGFyIGFubm90YXRpb25zIGFuZCB0aGUgc3ludGF4IG9mIHJlZmVyZW5jZWQgYW5kIGltYmVkZGVkIEhUTUxcbiAgICogYW5kIENTUy5cbiAgICpcbiAgICogTm90ZSBpdCBpcyBpbXBvcnRhbnQgdG8gZGlzcGxheWluZyBUeXBlU2NyaXB0IHNlbWFudGljIGRpYWdub3N0aWNzIGFsb25nIHdpdGggQW5ndWxhclxuICAgKiBzdHJ1Y3R1cmFsIGRpYWdub3N0aWNzIGFzIGFuIGVycm9yIGluIHRoZSBwcm9ncmFtIHN0cnVjdHVyZSBtaWdodCBjYXVzZSBlcnJvcnMgZGV0ZWN0ZWQgaW5cbiAgICogc2VtYW50aWMgYW5hbHlzaXMgYW5kIGEgc2VtYW50aWMgZXJyb3IgbWlnaHQgY2F1c2UgZXJyb3JzIGluIHNwZWNpZnlpbmcgdGhlIHByb2dyYW0gc3RydWN0dXJlLlxuICAgKlxuICAgKiBBbmd1bGFyIHN0cnVjdHVyYWwgaW5mb3JtYXRpb24gaXMgcmVxdWlyZWQgdG8gcHJvZHVjZSB0aGVzZSBkaWFnbm9zdGljcy5cbiAgICovXG4gIGdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOiBSZWFkb25seUFycmF5PERpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgc2VtYW50aWMgZGlhZ25vc3RpY3MgZnJvbSBUeXBlU2NyaXB0LiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gY2FsbGluZ1xuICAgKiBgZ2V0VHNQcm9ncmFtKCkuZ2V0U2VtYW50aWNEaWFnbm9zdGljcygpYCBkaXJlY3RseSBhbmQgaXMgaW5jbHVkZWQgZm9yIGNvbXBsZXRlbmVzcy5cbiAgICovXG4gIGdldFRzU2VtYW50aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgQW5ndWxhciBzZW1hbnRpYyBkaWFnbm9zdGljcy5cbiAgICpcbiAgICogQW5ndWxhciBzdHJ1Y3R1cmFsIGluZm9ybWF0aW9uIGlzIHJlcXVpcmVkIHRvIHByb2R1Y2UgdGhlc2UgZGlhZ25vc3RpY3MuXG4gICAqL1xuICBnZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWU/OiBzdHJpbmcsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljfERpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBMb2FkIEFuZ3VsYXIgc3RydWN0dXJhbCBpbmZvcm1hdGlvbiBhc3luY2hyb25vdXNseS4gSWYgdGhpcyBtZXRob2QgaXMgbm90IGNhbGxlZCB0aGVuIHRoZVxuICAgKiBBbmd1bGFyIHN0cnVjdHVyYWwgaW5mb3JtYXRpb24sIGluY2x1ZGluZyByZWZlcmVuY2VkIEhUTUwgYW5kIENTUyBmaWxlcywgYXJlIGxvYWRlZFxuICAgKiBzeW5jaHJvbm91c2x5LiBJZiB0aGUgc3VwcGxpZWQgQW5ndWxhciBjb21waWxlciBob3N0IHJldHVybnMgYSBwcm9taXNlIGZyb20gYGxvYWRSZXNvdXJjZSgpYFxuICAgKiB3aWxsIHByb2R1Y2UgYSBkaWFnbm9zdGljIGVycm9yIG1lc3NhZ2Ugb3IsIGBnZXRUc1Byb2dyYW0oKWAgb3IgYGVtaXRgIHRvIHRocm93LlxuICAgKi9cbiAgbG9hZE5nU3RydWN0dXJlQXN5bmMoKTogUHJvbWlzZTx2b2lkPjtcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbGF6eSByb3V0ZXMgaW4gdGhlIHByb2dyYW0uXG4gICAqIEBwYXJhbSBlbnRyeVJvdXRlIEEgcmVmZXJlbmNlIHRvIGFuIE5nTW9kdWxlIGxpa2UgYHNvbWVNb2R1bGUjbmFtZWAuIElmIGdpdmVuLFxuICAgKiAgICAgICAgICAgICAgd2lsbCByZWN1cnNpdmVseSBhbmFseXplIHJvdXRlcyBzdGFydGluZyBmcm9tIHRoaXMgc3ltYm9sIG9ubHkuXG4gICAqICAgICAgICAgICAgICBPdGhlcndpc2Ugd2lsbCBsaXN0IGFsbCByb3V0ZXMgZm9yIGFsbCBOZ01vZHVsZXMgaW4gdGhlIHByb2dyYW0vXG4gICAqL1xuICBsaXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlPzogc3RyaW5nKTogTGF6eVJvdXRlW107XG5cbiAgLyoqXG4gICAqIEVtaXQgdGhlIGZpbGVzIHJlcXVlc3RlZCBieSBlbWl0RmxhZ3MgaW1wbGllZCBieSB0aGUgcHJvZ3JhbS5cbiAgICpcbiAgICogQW5ndWxhciBzdHJ1Y3R1cmFsIGluZm9ybWF0aW9uIGlzIHJlcXVpcmVkIHRvIGVtaXQgZmlsZXMuXG4gICAqL1xuICBlbWl0KHtlbWl0RmxhZ3MsIGNhbmNlbGxhdGlvblRva2VuLCBjdXN0b21UcmFuc2Zvcm1lcnMsIGVtaXRDYWxsYmFjayxcbiAgICAgICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrfT86IHtcbiAgICBlbWl0RmxhZ3M/OiBFbWl0RmxhZ3MsXG4gICAgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbixcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZW1pdENhbGxiYWNrPzogVHNFbWl0Q2FsbGJhY2ssXG4gICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2tcbiAgfSk6IHRzLkVtaXRSZXN1bHQ7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIC5kLnRzIC8gLm5nc3VtbWFyeS5qc29uIC8gLm5nZmFjdG9yeS5kLnRzIGZpbGVzIG9mIGxpYnJhcmllcyB0aGF0IGhhdmUgYmVlbiBlbWl0dGVkXG4gICAqIGluIHRoaXMgcHJvZ3JhbSBvciBwcmV2aW91cyBwcm9ncmFtcyB3aXRoIHBhdGhzIHRoYXQgZW11bGF0ZSB0aGUgZmFjdCB0aGF0IHRoZXNlIGxpYnJhcmllc1xuICAgKiBoYXZlIGJlZW4gY29tcGlsZWQgYmVmb3JlIHdpdGggbm8gb3V0RGlyLlxuICAgKi9cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBMaWJyYXJ5U3VtbWFyeT47XG5cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgZ2V0RW1pdHRlZEdlbmVyYXRlZEZpbGVzKCk6IE1hcDxzdHJpbmcsIEdlbmVyYXRlZEZpbGU+O1xuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPjtcbn1cbiJdfQ==