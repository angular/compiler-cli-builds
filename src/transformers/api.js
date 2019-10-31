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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBS1UsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7SUFDekIsUUFBQSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7SUFDekIsUUFBQSxNQUFNLEdBQUcsU0FBc0IsQ0FBQztJQWtCN0MsU0FBZ0IsY0FBYyxDQUFDLFVBQWU7UUFDNUMsT0FBTyxVQUFVLElBQUksSUFBSSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDO0lBQy9ELENBQUM7SUFGRCx3Q0FFQztJQUVELFNBQWdCLGNBQWMsQ0FBQyxVQUFlO1FBQzVDLE9BQU8sVUFBVSxJQUFJLElBQUksSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQztJQUMvRCxDQUFDO0lBRkQsd0NBRUM7SUEyWkQsSUFBWSxTQVNYO0lBVEQsV0FBWSxTQUFTO1FBQ25CLHVDQUFZLENBQUE7UUFDWixxQ0FBVyxDQUFBO1FBQ1gsaURBQWlCLENBQUE7UUFDakIscURBQW1CLENBQUE7UUFDbkIsZ0RBQWdCLENBQUE7UUFFaEIsZ0RBQTRCLENBQUE7UUFDNUIsd0NBQWdELENBQUE7SUFDbEQsQ0FBQyxFQVRXLFNBQVMsR0FBVCxpQkFBUyxLQUFULGlCQUFTLFFBU3BCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0dlbmVyYXRlZEZpbGUsIFBhcnNlU291cmNlU3BhbiwgUG9zaXRpb259IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9FUlJPUl9DT0RFID0gMTAwO1xuZXhwb3J0IGNvbnN0IFVOS05PV05fRVJST1JfQ09ERSA9IDUwMDtcbmV4cG9ydCBjb25zdCBTT1VSQ0UgPSAnYW5ndWxhcicgYXMgJ2FuZ3VsYXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIERpYWdub3N0aWNNZXNzYWdlQ2hhaW4ge1xuICBtZXNzYWdlVGV4dDogc3RyaW5nO1xuICBwb3NpdGlvbj86IFBvc2l0aW9uO1xuICBuZXh0PzogRGlhZ25vc3RpY01lc3NhZ2VDaGFpbltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERpYWdub3N0aWMge1xuICBtZXNzYWdlVGV4dDogc3RyaW5nO1xuICBzcGFuPzogUGFyc2VTb3VyY2VTcGFuO1xuICBwb3NpdGlvbj86IFBvc2l0aW9uO1xuICBjaGFpbj86IERpYWdub3N0aWNNZXNzYWdlQ2hhaW47XG4gIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnk7XG4gIGNvZGU6IG51bWJlcjtcbiAgc291cmNlOiAnYW5ndWxhcic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RzRGlhZ25vc3RpYyhkaWFnbm9zdGljOiBhbnkpOiBkaWFnbm9zdGljIGlzIHRzLkRpYWdub3N0aWMge1xuICByZXR1cm4gZGlhZ25vc3RpYyAhPSBudWxsICYmIGRpYWdub3N0aWMuc291cmNlICE9PSAnYW5ndWxhcic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc05nRGlhZ25vc3RpYyhkaWFnbm9zdGljOiBhbnkpOiBkaWFnbm9zdGljIGlzIERpYWdub3N0aWMge1xuICByZXR1cm4gZGlhZ25vc3RpYyAhPSBudWxsICYmIGRpYWdub3N0aWMuc291cmNlID09PSAnYW5ndWxhcic7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25zIGV4dGVuZHMgdHMuQ29tcGlsZXJPcHRpb25zIHtcbiAgLy8gTk9URTogVGhlc2UgY29tbWVudHMgYW5kIGFpby9jb250ZW50L2d1aWRlcy9hb3QtY29tcGlsZXIubWQgc2hvdWxkIGJlIGtlcHQgaW4gc3luYy5cblxuICAvLyBXcml0ZSBzdGF0aXN0aWNzIGFib3V0IGNvbXBpbGF0aW9uIChlLmcuIHRvdGFsIHRpbWUsIC4uLilcbiAgLy8gTm90ZTogdGhpcyBpcyB0aGUgLS1kaWFnbm9zdGljcyBjb21tYW5kIGxpbmUgb3B0aW9uIGZyb20gVFMgKHdoaWNoIGlzIEBpbnRlcm5hbFxuICAvLyBvbiB0cy5Db21waWxlck9wdGlvbnMgaW50ZXJmYWNlKS5cbiAgZGlhZ25vc3RpY3M/OiBib29sZWFuO1xuXG4gIC8vIEFic29sdXRlIHBhdGggdG8gYSBkaXJlY3Rvcnkgd2hlcmUgZ2VuZXJhdGVkIGZpbGUgc3RydWN0dXJlIGlzIHdyaXR0ZW4uXG4gIC8vIElmIHVuc3BlY2lmaWVkLCBnZW5lcmF0ZWQgZmlsZXMgd2lsbCBiZSB3cml0dGVuIGFsb25nc2lkZSBzb3VyY2VzLlxuICAvLyBAZGVwcmVjYXRlZCAtIG5vIGVmZmVjdFxuICBnZW5EaXI/OiBzdHJpbmc7XG5cbiAgLy8gUGF0aCB0byB0aGUgZGlyZWN0b3J5IGNvbnRhaW5pbmcgdGhlIHRzY29uZmlnLmpzb24gZmlsZS5cbiAgYmFzZVBhdGg/OiBzdHJpbmc7XG5cbiAgLy8gRG9uJ3QgcHJvZHVjZSAubWV0YWRhdGEuanNvbiBmaWxlcyAodGhleSBkb24ndCB3b3JrIGZvciBidW5kbGVkIGVtaXQgd2l0aCAtLW91dClcbiAgc2tpcE1ldGFkYXRhRW1pdD86IGJvb2xlYW47XG5cbiAgLy8gUHJvZHVjZSBhbiBlcnJvciBpZiB0aGUgbWV0YWRhdGEgd3JpdHRlbiBmb3IgYSBjbGFzcyB3b3VsZCBwcm9kdWNlIGFuIGVycm9yIGlmIHVzZWQuXG4gIHN0cmljdE1ldGFkYXRhRW1pdD86IGJvb2xlYW47XG5cbiAgLy8gRG9uJ3QgcHJvZHVjZSAubmdmYWN0b3J5LmpzIG9yIC5uZ3N0eWxlLmpzIGZpbGVzXG4gIHNraXBUZW1wbGF0ZUNvZGVnZW4/OiBib29sZWFuO1xuXG4gIC8vIEFsd2F5cyByZXBvcnQgZXJyb3JzIHdoZW4gdGhlIHR5cGUgb2YgYSBwYXJhbWV0ZXIgc3VwcGxpZWQgd2hvc2UgaW5qZWN0aW9uIHR5cGUgY2Fubm90XG4gIC8vIGJlIGRldGVybWluZWQuIFdoZW4gdGhpcyB2YWx1ZSBvcHRpb24gaXMgbm90IHByb3ZpZGVkIG9yIGlzIGBmYWxzZWAsIGNvbnN0cnVjdG9yXG4gIC8vIHBhcmFtZXRlcnMgb2YgY2xhc3NlcyBtYXJrZWQgd2l0aCBgQEluamVjdGFibGVgIHdob3NlIHR5cGUgY2Fubm90IGJlIHJlc29sdmVkIHdpbGxcbiAgLy8gcHJvZHVjZSBhIHdhcm5pbmcuIFdpdGggdGhpcyBvcHRpb24gYHRydWVgLCB0aGV5IHByb2R1Y2UgYW4gZXJyb3IuIFdoZW4gdGhpcyBvcHRpb24gaXNcbiAgLy8gbm90IHByb3ZpZGVkIGlzIHRyZWF0ZWQgYXMgaWYgaXQgd2VyZSBgZmFsc2VgLlxuICBzdHJpY3RJbmplY3Rpb25QYXJhbWV0ZXJzPzogYm9vbGVhbjtcblxuICAvLyBXaGV0aGVyIHRvIGdlbmVyYXRlIGEgZmxhdCBtb2R1bGUgaW5kZXggb2YgdGhlIGdpdmVuIG5hbWUgYW5kIHRoZSBjb3JyZXNwb25kaW5nXG4gIC8vIGZsYXQgbW9kdWxlIG1ldGFkYXRhLiBUaGlzIG9wdGlvbiBpcyBpbnRlbmRlZCB0byBiZSB1c2VkIHdoZW4gY3JlYXRpbmcgZmxhdFxuICAvLyBtb2R1bGVzIHNpbWlsYXIgdG8gaG93IGBAYW5ndWxhci9jb3JlYCBhbmQgYEBhbmd1bGFyL2NvbW1vbmAgYXJlIHBhY2thZ2VkLlxuICAvLyBXaGVuIHRoaXMgb3B0aW9uIGlzIHVzZWQgdGhlIGBwYWNrYWdlLmpzb25gIGZvciB0aGUgbGlicmFyeSBzaG91bGQgcmVmZXJyZWQgdG8gdGhlXG4gIC8vIGdlbmVyYXRlZCBmbGF0IG1vZHVsZSBpbmRleCBpbnN0ZWFkIG9mIHRoZSBsaWJyYXJ5IGluZGV4IGZpbGUuIFdoZW4gdXNpbmcgdGhpc1xuICAvLyBvcHRpb24gb25seSBvbmUgLm1ldGFkYXRhLmpzb24gZmlsZSBpcyBwcm9kdWNlZCB0aGF0IGNvbnRhaW5zIGFsbCB0aGUgbWV0YWRhdGFcbiAgLy8gbmVjZXNzYXJ5IGZvciBzeW1ib2xzIGV4cG9ydGVkIGZyb20gdGhlIGxpYnJhcnkgaW5kZXguXG4gIC8vIEluIHRoZSBnZW5lcmF0ZWQgLm5nZmFjdG9yeS50cyBmaWxlcyBmbGF0IG1vZHVsZSBpbmRleCBpcyB1c2VkIHRvIGltcG9ydCBzeW1ib2xzXG4gIC8vIGluY2x1ZGVzIGJvdGggdGhlIHB1YmxpYyBBUEkgZnJvbSB0aGUgbGlicmFyeSBpbmRleCBhcyB3ZWxsIGFzIHNocm93ZGVkIGludGVybmFsXG4gIC8vIHN5bWJvbHMuXG4gIC8vIEJ5IGRlZmF1bHQgdGhlIC50cyBmaWxlIHN1cHBsaWVkIGluIHRoZSBgZmlsZXNgIGZpbGVzIGZpZWxkIGlzIGFzc3VtZWQgdG8gYmVcbiAgLy8gbGlicmFyeSBpbmRleC4gSWYgbW9yZSB0aGFuIG9uZSBpcyBzcGVjaWZpZWQsIHVzZXMgYGxpYnJhcnlJbmRleGAgdG8gc2VsZWN0IHRoZVxuICAvLyBmaWxlIHRvIHVzZS4gSWYgbW9yZSB0aGFuIG9uIC50cyBmaWxlIGlzIHN1cHBsaWVkIGFuZCBubyBgbGlicmFyeUluZGV4YCBpcyBzdXBwbGllZFxuICAvLyBhbiBlcnJvciBpcyBwcm9kdWNlZC5cbiAgLy8gQSBmbGF0IG1vZHVsZSBpbmRleCAuZC50cyBhbmQgLmpzIHdpbGwgYmUgY3JlYXRlZCB3aXRoIHRoZSBnaXZlbiBgZmxhdE1vZHVsZU91dEZpbGVgXG4gIC8vIG5hbWUgaW4gdGhlIHNhbWUgbG9jYXRpb24gYXMgdGhlIGxpYnJhcnkgaW5kZXggLmQudHMgZmlsZSBpcyBlbWl0dGVkLlxuICAvLyBGb3IgZXhhbXBsZSwgaWYgYSBsaWJyYXJ5IHVzZXMgYHB1YmxpY19hcGkudHNgIGZpbGUgYXMgdGhlIGxpYnJhcnkgaW5kZXggb2YgdGhlXG4gIC8vIG1vZHVsZSB0aGUgYHRzY29uZmlnLmpzb25gIGBmaWxlc2AgZmllbGQgd291bGQgYmUgYFtcInB1YmxpY19hcGkudHNcIl1gLiBUaGVcbiAgLy8gYGZsYXRNb2R1bGVPdXRGaWxlYCBvcHRpb25zIGNvdWxkIHRoZW4gYmUgc2V0IHRvLCBmb3IgZXhhbXBsZSBgXCJpbmRleC5qc1wiYCwgd2hpY2hcbiAgLy8gcHJvZHVjZXMgYGluZGV4LmQudHNgIGFuZCAgYGluZGV4Lm1ldGFkYXRhLmpzb25gIGZpbGVzLiBUaGUgbGlicmFyeSdzXG4gIC8vIGBwYWNrYWdlLmpzb25gJ3MgYG1vZHVsZWAgZmllbGQgd291bGQgYmUgYFwiaW5kZXguanNcImAgYW5kIHRoZSBgdHlwaW5nc2AgZmllbGQgd291bGRcbiAgLy8gYmUgYFwiaW5kZXguZC50c1wiYC5cbiAgZmxhdE1vZHVsZU91dEZpbGU/OiBzdHJpbmc7XG5cbiAgLy8gUHJlZmVycmVkIG1vZHVsZSBpZCB0byB1c2UgZm9yIGltcG9ydGluZyBmbGF0IG1vZHVsZS4gUmVmZXJlbmNlcyBnZW5lcmF0ZWQgYnkgYG5nY2BcbiAgLy8gd2lsbCB1c2UgdGhpcyBtb2R1bGUgbmFtZSB3aGVuIGltcG9ydGluZyBzeW1ib2xzIGZyb20gdGhlIGZsYXQgbW9kdWxlLiBUaGlzIGlzIG9ubHlcbiAgLy8gbWVhbmluZ2Z1bCB3aGVuIGBmbGF0TW9kdWxlT3V0RmlsZWAgaXMgYWxzbyBzdXBwbGllZC4gSXQgaXMgb3RoZXJ3aXNlIGlnbm9yZWQuXG4gIGZsYXRNb2R1bGVJZD86IHN0cmluZztcblxuICAvLyBBIHByZWZpeCB0byBpbnNlcnQgaW4gZ2VuZXJhdGVkIHByaXZhdGUgc3ltYm9scywgZS5nLiBmb3IgXCJteV9wcmVmaXhfXCIgd2VcbiAgLy8gd291bGQgZ2VuZXJhdGUgcHJpdmF0ZSBzeW1ib2xzIG5hbWVkIGxpa2UgYMm1bXlfcHJlZml4X2FgLlxuICBmbGF0TW9kdWxlUHJpdmF0ZVN5bWJvbFByZWZpeD86IHN0cmluZztcblxuICAvLyBXaGV0aGVyIHRvIGdlbmVyYXRlIGNvZGUgZm9yIGxpYnJhcnkgY29kZS5cbiAgLy8gSWYgdHJ1ZSwgcHJvZHVjZSAubmdmYWN0b3J5LnRzIGFuZCAubmdzdHlsZS50cyBmaWxlcyBmb3IgLmQudHMgaW5wdXRzLlxuICAvLyBEZWZhdWx0IGlzIHRydWUuXG4gIGdlbmVyYXRlQ29kZUZvckxpYnJhcmllcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gdHlwZSBjaGVjayB0aGUgZW50aXJlIHRlbXBsYXRlLlxuICAgKlxuICAgKiBUaGlzIGZsYWcgY3VycmVudGx5IGNvbnRyb2xzIGEgY291cGxlIGFzcGVjdHMgb2YgdGVtcGxhdGUgdHlwZS1jaGVja2luZywgaW5jbHVkaW5nXG4gICAqIHdoZXRoZXIgZW1iZWRkZWQgdmlld3MgYXJlIGNoZWNrZWQuXG4gICAqXG4gICAqIEZvciBtYXhpbXVtIHR5cGUtY2hlY2tpbmcsIHNldCB0aGlzIHRvIGB0cnVlYCwgYW5kIHNldCBgc3RyaWN0VGVtcGxhdGVzYCB0byBgdHJ1ZWAuXG4gICAqL1xuICBmdWxsVGVtcGxhdGVUeXBlQ2hlY2s/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJZiBgdHJ1ZWAsIGltcGxpZXMgYWxsIHRlbXBsYXRlIHN0cmljdG5lc3MgZmxhZ3MgYmVsb3cgKHVubGVzcyBpbmRpdmlkdWFsbHkgZGlzYWJsZWQpLlxuICAgKlxuICAgKiBIYXMgbm8gZWZmZWN0IHVubGVzcyBgZnVsbFRlbXBsYXRlVHlwZUNoZWNrYCBpcyBhbHNvIGVuYWJsZWQuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuXG4gICAqL1xuICBzdHJpY3RUZW1wbGF0ZXM/OiBib29sZWFuO1xuXG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gY2hlY2sgdGhlIHR5cGUgb2YgYSBiaW5kaW5nIHRvIGEgZGlyZWN0aXZlL2NvbXBvbmVudCBpbnB1dCBhZ2FpbnN0IHRoZSB0eXBlIG9mIHRoZVxuICAgKiBmaWVsZCBvbiB0aGUgZGlyZWN0aXZlL2NvbXBvbmVudC5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGlmIHRoaXMgaXMgYGZhbHNlYCB0aGVuIHRoZSBleHByZXNzaW9uIGBbaW5wdXRdPVwiZXhwclwiYCB3aWxsIGhhdmUgYGV4cHJgIHR5cGUtXG4gICAqIGNoZWNrZWQsIGJ1dCBub3QgdGhlIGFzc2lnbm1lbnQgb2YgdGhlIHJlc3VsdGluZyB0eXBlIHRvIHRoZSBgaW5wdXRgIHByb3BlcnR5IG9mIHdoaWNoZXZlclxuICAgKiBkaXJlY3RpdmUgb3IgY29tcG9uZW50IGlzIHJlY2VpdmluZyB0aGUgYmluZGluZy4gSWYgc2V0IHRvIGB0cnVlYCwgYm90aCBzaWRlcyBvZiB0aGUgYXNzaWdubWVudFxuICAgKiBhcmUgY2hlY2tlZC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYCwgZXZlbiBpZiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIHNldC5cbiAgICovXG4gIHN0cmljdElucHV0VHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBzdHJpY3QgbnVsbCB0eXBlcyBmb3IgaW5wdXQgYmluZGluZ3MgZm9yIGRpcmVjdGl2ZXMuXG4gICAqXG4gICAqIElmIHRoaXMgaXMgYHRydWVgLCBhcHBsaWNhdGlvbnMgdGhhdCBhcmUgY29tcGlsZWQgd2l0aCBUeXBlU2NyaXB0J3MgYHN0cmljdE51bGxDaGVja3NgIGVuYWJsZWRcbiAgICogd2lsbCBwcm9kdWNlIHR5cGUgZXJyb3JzIGZvciBiaW5kaW5ncyB3aGljaCBjYW4gZXZhbHVhdGUgdG8gYHVuZGVmaW5lZGAgb3IgYG51bGxgIHdoZXJlIHRoZVxuICAgKiBpbnB1dHMncyB0eXBlIGRvZXMgbm90IGluY2x1ZGUgYHVuZGVmaW5lZGAgb3IgYG51bGxgIGluIGl0cyB0eXBlLiBJZiBzZXQgdG8gYGZhbHNlYCwgYWxsXG4gICAqIGJpbmRpbmcgZXhwcmVzc2lvbnMgYXJlIHdyYXBwZWQgaW4gYSBub24tbnVsbCBhc3NlcnRpb24gb3BlcmF0b3IgdG8gZWZmZWN0aXZlbHkgZGlzYWJsZSBzdHJpY3RcbiAgICogbnVsbCBjaGVja3MuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuIE5vdGUgdGhhdCBpZiBgc3RyaWN0SW5wdXRUeXBlc2AgaXNcbiAgICogbm90IHNldCwgb3Igc2V0IHRvIGBmYWxzZWAsIHRoaXMgZmxhZyBoYXMgbm8gZWZmZWN0LlxuICAgKi9cbiAgc3RyaWN0TnVsbElucHV0VHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGNoZWNrIHRleHQgYXR0cmlidXRlcyB0aGF0IGhhcHBlbiB0byBiZSBjb25zdW1lZCBieSBhIGRpcmVjdGl2ZSBvciBjb21wb25lbnQuXG4gICAqXG4gICAqIEZvciBleGFtcGxlLCBpbiBhIHRlbXBsYXRlIGNvbnRhaW5pbmcgYDxpbnB1dCBtYXRJbnB1dCBkaXNhYmxlZD5gIHRoZSBgZGlzYWJsZWRgIGF0dHJpYnV0ZSBlbmRzXG4gICAqIHVwIGJlaW5nIGNvbnN1bWVkIGFzIGFuIGlucHV0IHdpdGggdHlwZSBgYm9vbGVhbmAgYnkgdGhlIGBtYXRJbnB1dGAgZGlyZWN0aXZlLiBBdCBydW50aW1lLCB0aGVcbiAgICogaW5wdXQgd2lsbCBiZSBzZXQgdG8gdGhlIGF0dHJpYnV0ZSdzIHN0cmluZyB2YWx1ZSwgd2hpY2ggaXMgYW4gZW1wdHkgc3RyaW5nIGZvciBhdHRyaWJ1dGVzXG4gICAqIHdpdGhvdXQgYSB2YWx1ZSwgc28gd2l0aCB0aGlzIGZsYWcgc2V0IHRvIGB0cnVlYCwgYW4gZXJyb3Igd291bGQgYmUgcmVwb3J0ZWQuIElmIHNldCB0b1xuICAgKiBgZmFsc2VgLCB0ZXh0IGF0dHJpYnV0ZXMgd2lsbCBuZXZlciByZXBvcnQgYW4gZXJyb3IuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuIE5vdGUgdGhhdCBpZiBgc3RyaWN0SW5wdXRUeXBlc2AgaXNcbiAgICogbm90IHNldCwgb3Igc2V0IHRvIGBmYWxzZWAsIHRoaXMgZmxhZyBoYXMgbm8gZWZmZWN0LlxuICAgKi9cbiAgc3RyaWN0QXR0cmlidXRlVHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBhIHN0cmljdCB0eXBlIGZvciBudWxsLXNhZmUgbmF2aWdhdGlvbiBvcGVyYXRpb25zLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGBmYWxzZWAsIHRoZW4gdGhlIHJldHVybiB0eXBlIG9mIGBhPy5iYCBvciBgYT8oKWAgd2lsbCBiZSBgYW55YC4gSWYgc2V0IHRvIGB0cnVlYCxcbiAgICogdGhlbiB0aGUgcmV0dXJuIHR5cGUgb2YgYGE/LmJgIGZvciBleGFtcGxlIHdpbGwgYmUgdGhlIHNhbWUgYXMgdGhlIHR5cGUgb2YgdGhlIHRlcm5hcnlcbiAgICogZXhwcmVzc2lvbiBgYSAhPSBudWxsID8gYS5iIDogYWAuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGBmYWxzZWAsIGV2ZW4gaWYgXCJmdWxsVGVtcGxhdGVUeXBlQ2hlY2tcIiBpcyBzZXQuXG4gICAqL1xuICBzdHJpY3RTYWZlTmF2aWdhdGlvblR5cGVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byBpbmZlciB0aGUgdHlwZSBvZiBsb2NhbCByZWZlcmVuY2VzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlIHR5cGUgb2YgYSBgI3JlZmAgdmFyaWFibGUgb24gYSBET00gbm9kZSBpbiB0aGUgdGVtcGxhdGUgd2lsbCBiZVxuICAgKiBkZXRlcm1pbmVkIGJ5IHRoZSB0eXBlIG9mIGBkb2N1bWVudC5jcmVhdGVFbGVtZW50YCBmb3IgdGhlIGdpdmVuIERPTSBub2RlLiBJZiBzZXQgdG8gYGZhbHNlYCxcbiAgICogdGhlIHR5cGUgb2YgYHJlZmAgZm9yIERPTSBub2RlcyB3aWxsIGJlIGBhbnlgLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgLCBldmVuIGlmIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgc2V0LlxuICAgKi9cbiAgc3RyaWN0RG9tTG9jYWxSZWZUeXBlcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gaW5mZXIgdGhlIHR5cGUgb2YgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIGluIGV2ZW50IGJpbmRpbmdzIGZvciBkaXJlY3RpdmUgb3V0cHV0cyBvclxuICAgKiBhbmltYXRpb24gZXZlbnRzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlIHR5cGUgb2YgYCRldmVudGAgd2lsbCBiZSBpbmZlcnJlZCBiYXNlZCBvbiB0aGUgZ2VuZXJpYyB0eXBlIG9mXG4gICAqIGBFdmVudEVtaXR0ZXJgL2BTdWJqZWN0YCBvZiB0aGUgb3V0cHV0LiBJZiBzZXQgdG8gYGZhbHNlYCwgdGhlIGAkZXZlbnRgIHZhcmlhYmxlIHdpbGwgYmUgb2ZcbiAgICogdHlwZSBgYW55YC5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYCwgZXZlbiBpZiBcImZ1bGxUZW1wbGF0ZVR5cGVDaGVja1wiIGlzIHNldC5cbiAgICovXG4gIHN0cmljdE91dHB1dEV2ZW50VHlwZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGluZmVyIHRoZSB0eXBlIG9mIHRoZSBgJGV2ZW50YCB2YXJpYWJsZSBpbiBldmVudCBiaW5kaW5ncyB0byBET00gZXZlbnRzLlxuICAgKlxuICAgKiBJZiB0aGlzIGlzIGB0cnVlYCwgdGhlIHR5cGUgb2YgYCRldmVudGAgd2lsbCBiZSBpbmZlcnJlZCBiYXNlZCBvbiBUeXBlU2NyaXB0J3NcbiAgICogYEhUTUxFbGVtZW50RXZlbnRNYXBgLCB3aXRoIGEgZmFsbGJhY2sgdG8gdGhlIG5hdGl2ZSBgRXZlbnRgIHR5cGUuIElmIHNldCB0byBgZmFsc2VgLCB0aGVcbiAgICogYCRldmVudGAgdmFyaWFibGUgd2lsbCBiZSBvZiB0eXBlIGBhbnlgLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgZmFsc2VgLCBldmVuIGlmIFwiZnVsbFRlbXBsYXRlVHlwZUNoZWNrXCIgaXMgc2V0LlxuICAgKi9cbiAgc3RyaWN0RG9tRXZlbnRUeXBlcz86IGJvb2xlYW47XG5cbiAgLy8gV2hldGhlciB0byB1c2UgdGhlIENvbXBpbGVySG9zdCdzIGZpbGVOYW1lVG9Nb2R1bGVOYW1lIHV0aWxpdHkgKGlmIGF2YWlsYWJsZSkgdG8gZ2VuZXJhdGVcbiAgLy8gaW1wb3J0IG1vZHVsZSBzcGVjaWZpZXJzLiBUaGlzIGlzIGZhbHNlIGJ5IGRlZmF1bHQsIGFuZCBleGlzdHMgdG8gc3VwcG9ydCBydW5uaW5nIG5ndHNjXG4gIC8vIHdpdGhpbiBHb29nbGUuIFRoaXMgb3B0aW9uIGlzIGludGVybmFsIGFuZCBpcyB1c2VkIGJ5IHRoZSBuZ19tb2R1bGUuYnpsIHJ1bGUgdG8gc3dpdGNoXG4gIC8vIGJlaGF2aW9yIGJldHdlZW4gQmF6ZWwgYW5kIEJsYXplLlxuICBfdXNlSG9zdEZvckltcG9ydEdlbmVyYXRpb24/OiBib29sZWFuO1xuXG4gIC8vIEluc2VydCBKU0RvYyB0eXBlIGFubm90YXRpb25zIG5lZWRlZCBieSBDbG9zdXJlIENvbXBpbGVyXG4gIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyPzogYm9vbGVhbjtcblxuICAvLyBNb2RpZnkgaG93IGFuZ3VsYXIgYW5ub3RhdGlvbnMgYXJlIGVtaXR0ZWQgdG8gaW1wcm92ZSB0cmVlLXNoYWtpbmcuXG4gIC8vIERlZmF1bHQgaXMgc3RhdGljIGZpZWxkcy5cbiAgLy8gZGVjb3JhdG9yczogTGVhdmUgdGhlIERlY29yYXRvcnMgaW4tcGxhY2UuIFRoaXMgbWFrZXMgY29tcGlsYXRpb24gZmFzdGVyLlxuICAvLyAgICAgICAgICAgICBUeXBlU2NyaXB0IHdpbGwgZW1pdCBjYWxscyB0byB0aGUgX19kZWNvcmF0ZSBoZWxwZXIuXG4gIC8vICAgICAgICAgICAgIGAtLWVtaXREZWNvcmF0b3JNZXRhZGF0YWAgY2FuIGJlIHVzZWQgZm9yIHJ1bnRpbWUgcmVmbGVjdGlvbi5cbiAgLy8gICAgICAgICAgICAgSG93ZXZlciwgdGhlIHJlc3VsdGluZyBjb2RlIHdpbGwgbm90IHByb3Blcmx5IHRyZWUtc2hha2UuXG4gIC8vIHN0YXRpYyBmaWVsZHM6IFJlcGxhY2UgZGVjb3JhdG9ycyB3aXRoIGEgc3RhdGljIGZpZWxkIGluIHRoZSBjbGFzcy5cbiAgLy8gICAgICAgICAgICAgICAgQWxsb3dzIGFkdmFuY2VkIHRyZWUtc2hha2VycyBsaWtlIENsb3N1cmUgQ29tcGlsZXIgdG8gcmVtb3ZlXG4gIC8vICAgICAgICAgICAgICAgIHVudXNlZCBjbGFzc2VzLlxuICBhbm5vdGF0aW9uc0FzPzogJ2RlY29yYXRvcnMnfCdzdGF0aWMgZmllbGRzJztcblxuICAvLyBQcmludCBleHRyYSBpbmZvcm1hdGlvbiB3aGlsZSBydW5uaW5nIHRoZSBjb21waWxlclxuICB0cmFjZT86IGJvb2xlYW47XG5cbiAgLy8gV2hldGhlciB0byBlbmFibGUgbG93ZXJpbmcgZXhwcmVzc2lvbnMgbGFtYmRhcyBhbmQgZXhwcmVzc2lvbnMgaW4gYSByZWZlcmVuY2UgdmFsdWVcbiAgLy8gcG9zaXRpb24uXG4gIGRpc2FibGVFeHByZXNzaW9uTG93ZXJpbmc/OiBib29sZWFuO1xuXG4gIC8vIERpc2FibGUgVHlwZVNjcmlwdCBWZXJzaW9uIENoZWNrLlxuICBkaXNhYmxlVHlwZVNjcmlwdFZlcnNpb25DaGVjaz86IGJvb2xlYW47XG5cbiAgLy8gTG9jYWxlIG9mIHRoZSBhcHBsaWNhdGlvblxuICBpMThuT3V0TG9jYWxlPzogc3RyaW5nO1xuICAvLyBFeHBvcnQgZm9ybWF0ICh4bGYsIHhsZjIgb3IgeG1iKVxuICBpMThuT3V0Rm9ybWF0Pzogc3RyaW5nO1xuICAvLyBQYXRoIHRvIHRoZSBleHRyYWN0ZWQgbWVzc2FnZSBmaWxlXG4gIGkxOG5PdXRGaWxlPzogc3RyaW5nO1xuXG4gIC8vIEltcG9ydCBmb3JtYXQgaWYgZGlmZmVyZW50IGZyb20gYGkxOG5Gb3JtYXRgXG4gIGkxOG5JbkZvcm1hdD86IHN0cmluZztcbiAgLy8gTG9jYWxlIG9mIHRoZSBpbXBvcnRlZCB0cmFuc2xhdGlvbnNcbiAgaTE4bkluTG9jYWxlPzogc3RyaW5nO1xuICAvLyBQYXRoIHRvIHRoZSB0cmFuc2xhdGlvbiBmaWxlXG4gIGkxOG5JbkZpbGU/OiBzdHJpbmc7XG4gIC8vIEhvdyB0byBoYW5kbGUgbWlzc2luZyBtZXNzYWdlc1xuICBpMThuSW5NaXNzaW5nVHJhbnNsYXRpb25zPzogJ2Vycm9yJ3wnd2FybmluZyd8J2lnbm9yZSc7XG4gIC8vIFdoZXRoZXIgdHJhbnNsYXRpb24gdmFyaWFibGUgbmFtZSBzaG91bGQgY29udGFpbiBleHRlcm5hbCBtZXNzYWdlIGlkXG4gIC8vICh1c2VkIGJ5IENsb3N1cmUgQ29tcGlsZXIncyBvdXRwdXQgb2YgYGdvb2cuZ2V0TXNnYCBmb3IgdHJhbnNpdGlvbiBwZXJpb2QpXG4gIGkxOG5Vc2VFeHRlcm5hbElkcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFJlbmRlciBgJGxvY2FsaXplYCBtZXNzYWdlIGlkcyB3aXRoIHRoZSBsZWdhY3kgZm9ybWF0ICh4bGYsIHhsZjIgb3IgeG1iKSBzcGVjaWZpZWQgaW5cbiAgICogYGkxOG5JbkZvcm1hdGAuXG4gICAqXG4gICAqIFRoaXMgaXMgb25seSBhY3RpdmUgaWYgd2UgYXJlIGJ1aWxkaW5nIHdpdGggYGVuYWJsZUl2eTogdHJ1ZWAgYW5kIGEgdmFsaWRcbiAgICogYGkxOG5JbkZvcm1hdGAgaGFzIGJlZW4gcHJvdmlkZWQuIFRoZSBkZWZhdWx0IHZhbHVlIGZvciBub3cgaXMgYHRydWVgLlxuICAgKlxuICAgKiBVc2UgdGhpcyBvcHRpb24gd2hlbiB1c2UgYXJlIHVzaW5nIHRoZSBgJGxvY2FsaXplYCBiYXNlZCBsb2NhbGl6YXRpb24gbWVzc2FnZXMgYnV0XG4gICAqIGhhdmUgbm90IG1pZ3JhdGVkIHRoZSB0cmFuc2xhdGlvbiBmaWxlcyB0byB1c2UgdGhlIG5ldyBgJGxvY2FsaXplYCBtZXNzYWdlIGlkIGZvcm1hdC5cbiAgICovXG4gIGVuYWJsZUkxOG5MZWdhY3lNZXNzYWdlSWRGb3JtYXQ/OiBib29sZWFuO1xuXG4gIC8vIFdoZXRoZXIgdG8gcmVtb3ZlIGJsYW5rIHRleHQgbm9kZXMgZnJvbSBjb21waWxlZCB0ZW1wbGF0ZXMuIEl0IGlzIGBmYWxzZWAgYnkgZGVmYXVsdCBzdGFydGluZ1xuICAvLyBmcm9tIEFuZ3VsYXIgNi5cbiAgcHJlc2VydmVXaGl0ZXNwYWNlcz86IGJvb2xlYW47XG5cbiAgLyoqIGdlbmVyYXRlIGFsbCBwb3NzaWJsZSBnZW5lcmF0ZWQgZmlsZXMgICovXG4gIGFsbG93RW1wdHlDb2RlZ2VuRmlsZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIGdlbmVyYXRlIC5uZ3N1bW1hcnkudHMgZmlsZXMgdGhhdCBhbGxvdyB0byB1c2UgQU9UZWQgYXJ0aWZhY3RzXG4gICAqIGluIEpJVCBtb2RlLiBUaGlzIGlzIG9mZiBieSBkZWZhdWx0LlxuICAgKi9cbiAgZW5hYmxlU3VtbWFyaWVzRm9ySml0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0byByZXBsYWNlIHRoZSBgdGVtcGxhdGVVcmxgIGFuZCBgc3R5bGVVcmxzYCBwcm9wZXJ0eSBpbiBhbGxcbiAgICogQENvbXBvbmVudCBkZWNvcmF0b3JzIHdpdGggaW5saW5lZCBjb250ZW50cyBpbiBgdGVtcGxhdGVgIGFuZCBgc3R5bGVzYFxuICAgKiBwcm9wZXJ0aWVzLlxuICAgKiBXaGVuIGVuYWJsZWQsIHRoZSAuanMgb3V0cHV0IG9mIG5nYyB3aWxsIGhhdmUgbm8gbGF6eS1sb2FkZWQgYHRlbXBsYXRlVXJsYFxuICAgKiBvciBgc3R5bGVVcmxgcy4gTm90ZSB0aGF0IHRoaXMgcmVxdWlyZXMgdGhhdCByZXNvdXJjZXMgYmUgYXZhaWxhYmxlIHRvXG4gICAqIGxvYWQgc3RhdGljYWxseSBhdCBjb21waWxlLXRpbWUuXG4gICAqL1xuICBlbmFibGVSZXNvdXJjZUlubGluaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQ29udHJvbHMgd2hldGhlciBuZ3RzYyB3aWxsIGVtaXQgYC5uZ2ZhY3RvcnkuanNgIHNoaW1zIGZvciBlYWNoIGNvbXBpbGVkIGAudHNgIGZpbGUuXG4gICAqXG4gICAqIFRoZXNlIHNoaW1zIHN1cHBvcnQgbGVnYWN5IGltcG9ydHMgZnJvbSBgbmdmYWN0b3J5YCBmaWxlcywgYnkgZXhwb3J0aW5nIGEgZmFjdG9yeSBzaGltXG4gICAqIGZvciBlYWNoIGNvbXBvbmVudCBvciBOZ01vZHVsZSBpbiB0aGUgb3JpZ2luYWwgYC50c2AgZmlsZS5cbiAgICovXG4gIGdlbmVyYXRlTmdGYWN0b3J5U2hpbXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBDb250cm9scyB3aGV0aGVyIG5ndHNjIHdpbGwgZW1pdCBgLm5nc3VtbWFyeS5qc2Agc2hpbXMgZm9yIGVhY2ggY29tcGlsZWQgYC50c2AgZmlsZS5cbiAgICpcbiAgICogVGhlc2Ugc2hpbXMgc3VwcG9ydCBsZWdhY3kgaW1wb3J0cyBmcm9tIGBuZ3N1bW1hcnlgIGZpbGVzLCBieSBleHBvcnRpbmcgYW4gZW1wdHkgb2JqZWN0XG4gICAqIGZvciBlYWNoIE5nTW9kdWxlIGluIHRoZSBvcmlnaW5hbCBgLnRzYCBmaWxlLiBUaGUgb25seSBwdXJwb3NlIG9mIHN1bW1hcmllcyBpcyB0byBmZWVkIHRoZW0gdG9cbiAgICogYFRlc3RCZWRgLCB3aGljaCBpcyBhIG5vLW9wIGluIEl2eS5cbiAgICovXG4gIGdlbmVyYXRlTmdTdW1tYXJ5U2hpbXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUZWxscyB0aGUgY29tcGlsZXIgdG8gZ2VuZXJhdGUgZGVmaW5pdGlvbnMgdXNpbmcgdGhlIFJlbmRlcjMgc3R5bGUgY29kZSBnZW5lcmF0aW9uLlxuICAgKiBUaGlzIG9wdGlvbiBkZWZhdWx0cyB0byBgdHJ1ZWAuXG4gICAqXG4gICAqIEFjY2VwdGFibGUgdmFsdWVzIGFyZSBhcyBmb2xsb3dzOlxuICAgKlxuICAgKiBgZmFsc2VgIC0gcnVuIG5nYyBub3JtYWxseVxuICAgKiBgdHJ1ZWAgLSBydW4gdGhlIG5ndHNjIGNvbXBpbGVyIGluc3RlYWQgb2YgdGhlIG5vcm1hbCBuZ2MgY29tcGlsZXJcbiAgICogYG5ndHNjYCAtIGFsaWFzIGZvciBgdHJ1ZWBcbiAgICpcbiAgICogQHB1YmxpY0FwaVxuICAgKi9cbiAgZW5hYmxlSXZ5PzogYm9vbGVhbnwnbmd0c2MnO1xuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgY29sbGVjdEFsbEVycm9ycz86IGJvb2xlYW47XG5cbiAgLyoqIEFuIG9wdGlvbiB0byBlbmFibGUgbmd0c2MncyBpbnRlcm5hbCBwZXJmb3JtYW5jZSB0cmFjaW5nLlxuICAgKlxuICAgKiBUaGlzIHNob3VsZCBiZSBhIHBhdGggdG8gYSBKU09OIGZpbGUgd2hlcmUgdHJhY2UgaW5mb3JtYXRpb24gd2lsbCBiZSB3cml0dGVuLiBBbiBvcHRpb25hbCAndHM6J1xuICAgKiBwcmVmaXggd2lsbCBjYXVzZSB0aGUgdHJhY2UgdG8gYmUgd3JpdHRlbiB2aWEgdGhlIFRTIGhvc3QgaW5zdGVhZCBvZiBkaXJlY3RseSB0byB0aGUgZmlsZXN5c3RlbVxuICAgKiAobm90IGFsbCBob3N0cyBzdXBwb3J0IHRoaXMgbW9kZSBvZiBvcGVyYXRpb24pLlxuICAgKlxuICAgKiBUaGlzIGlzIGN1cnJlbnRseSBub3QgZXhwb3NlZCB0byB1c2VycyBhcyB0aGUgdHJhY2UgZm9ybWF0IGlzIHN0aWxsIHVuc3RhYmxlLlxuICAgKlxuICAgKiBAaW50ZXJuYWwgKi9cbiAgdHJhY2VQZXJmb3JtYW5jZT86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciBOR0Mgc2hvdWxkIGdlbmVyYXRlIHJlLWV4cG9ydHMgZm9yIGV4dGVybmFsIHN5bWJvbHMgd2hpY2ggYXJlIHJlZmVyZW5jZWRcbiAgICogaW4gQW5ndWxhciBtZXRhZGF0YSAoZS5nLiBAQ29tcG9uZW50LCBASW5qZWN0LCBAVmlld0NoaWxkKS4gVGhpcyBjYW4gYmUgZW5hYmxlZCBpblxuICAgKiBvcmRlciB0byBhdm9pZCBkeW5hbWljYWxseSBnZW5lcmF0ZWQgbW9kdWxlIGRlcGVuZGVuY2llcyB3aGljaCBjYW4gYnJlYWsgc3RyaWN0XG4gICAqIGRlcGVuZGVuY3kgZW5mb3JjZW1lbnRzLiBUaGlzIGlzIG5vdCBlbmFibGVkIGJ5IGRlZmF1bHQuXG4gICAqIFJlYWQgbW9yZSBhYm91dCB0aGlzIGhlcmU6IGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzI1NjQ0LlxuICAgKi9cbiAgY3JlYXRlRXh0ZXJuYWxTeW1ib2xGYWN0b3J5UmVleHBvcnRzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVHVybiBvbiB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGluIHRoZSBJdnkgY29tcGlsZXIuXG4gICAqXG4gICAqIFRoaXMgaXMgYW4gaW50ZXJuYWwgZmxhZyBiZWluZyB1c2VkIHRvIHJvbGwgb3V0IHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgaW4gbmd0c2MuIFR1cm5pbmcgaXQgb25cbiAgICogYnkgZGVmYXVsdCBiZWZvcmUgaXQncyByZWFkeSBtaWdodCBicmVhayBvdGhlciB1c2VycyBhdHRlbXB0aW5nIHRvIHRlc3QgdGhlIG5ldyBjb21waWxlcidzXG4gICAqIGJlaGF2aW9yLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGl2eVRlbXBsYXRlVHlwZUNoZWNrPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRW5hYmxlcyB0aGUgZ2VuZXJhdGlvbiBvZiBhbGlhcyByZS1leHBvcnRzIG9mIGRpcmVjdGl2ZXMvcGlwZXMgdGhhdCBhcmUgdmlzaWJsZSBmcm9tIGFuXG4gICAqIE5nTW9kdWxlIGZyb20gdGhhdCBOZ01vZHVsZSdzIGZpbGUuXG4gICAqXG4gICAqIFRoaXMgb3B0aW9uIHNob3VsZCBiZSBkaXNhYmxlZCBmb3IgYXBwbGljYXRpb24gYnVpbGRzIG9yIGZvciBBbmd1bGFyIFBhY2thZ2UgRm9ybWF0IGxpYnJhcmllc1xuICAgKiAod2hlcmUgTmdNb2R1bGVzIGFsb25nIHdpdGggdGhlaXIgZGlyZWN0aXZlcy9waXBlcyBhcmUgZXhwb3J0ZWQgdmlhIGEgc2luZ2xlIGVudHJ5cG9pbnQpLlxuICAgKlxuICAgKiBGb3Igb3RoZXIgbGlicmFyeSBjb21waWxhdGlvbnMgd2hpY2ggYXJlIGludGVuZGVkIHRvIGJlIHBhdGgtbWFwcGVkIGludG8gYW4gYXBwbGljYXRpb24gYnVpbGRcbiAgICogKG9yIGFub3RoZXIgbGlicmFyeSksIGVuYWJsaW5nIHRoaXMgb3B0aW9uIGVuYWJsZXMgdGhlIHJlc3VsdGluZyBkZWVwIGltcG9ydHMgdG8gd29ya1xuICAgKiBjb3JyZWN0bHkuXG4gICAqXG4gICAqIEEgY29uc3VtZXIgb2Ygc3VjaCBhIHBhdGgtbWFwcGVkIGxpYnJhcnkgd2lsbCB3cml0ZSBhbiBpbXBvcnQgbGlrZTpcbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBpbXBvcnQge0xpYk1vZHVsZX0gZnJvbSAnbGliL2RlZXAvcGF0aC90by9tb2R1bGUnO1xuICAgKiBgYGBcbiAgICpcbiAgICogVGhlIGNvbXBpbGVyIHdpbGwgYXR0ZW1wdCB0byBnZW5lcmF0ZSBpbXBvcnRzIG9mIGRpcmVjdGl2ZXMvcGlwZXMgZnJvbSB0aGF0IHNhbWUgbW9kdWxlXG4gICAqIHNwZWNpZmllciAodGhlIGNvbXBpbGVyIGRvZXMgbm90IHJld3JpdGUgdGhlIHVzZXIncyBnaXZlbiBpbXBvcnQgcGF0aCwgdW5saWtlIFZpZXcgRW5naW5lKS5cbiAgICpcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBpbXBvcnQge0xpYkRpciwgTGliQ21wLCBMaWJQaXBlfSBmcm9tICdsaWIvZGVlcC9wYXRoL3RvL21vZHVsZSc7XG4gICAqIGBgYFxuICAgKlxuICAgKiBJdCB3b3VsZCBiZSBidXJkZW5zb21lIGZvciB1c2VycyB0byBoYXZlIHRvIHJlLWV4cG9ydCBhbGwgZGlyZWN0aXZlcy9waXBlcyBhbG9uZ3NpZGUgZWFjaFxuICAgKiBOZ01vZHVsZSB0byBzdXBwb3J0IHRoaXMgaW1wb3J0IG1vZGVsLiBFbmFibGluZyB0aGlzIG9wdGlvbiB0ZWxscyB0aGUgY29tcGlsZXIgdG8gZ2VuZXJhdGVcbiAgICogcHJpdmF0ZSByZS1leHBvcnRzIGFsb25nc2lkZSB0aGUgTmdNb2R1bGUgb2YgYWxsIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGl0IG1ha2VzIGF2YWlsYWJsZSwgdG9cbiAgICogc3VwcG9ydCB0aGVzZSBmdXR1cmUgaW1wb3J0cy5cbiAgICovXG4gIGdlbmVyYXRlRGVlcFJlZXhwb3J0cz86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJIb3N0IGV4dGVuZHMgdHMuQ29tcGlsZXJIb3N0IHtcbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgbW9kdWxlIG5hbWUgdGhhdCBpcyB1c2VkIGluIGFuIGBpbXBvcnRgIHRvIGEgZmlsZSBwYXRoLlxuICAgKiBJLmUuIGBwYXRoL3RvL2NvbnRhaW5pbmdGaWxlLnRzYCBjb250YWluaW5nIGBpbXBvcnQgey4uLn0gZnJvbSAnbW9kdWxlLW5hbWUnYC5cbiAgICovXG4gIG1vZHVsZU5hbWVUb0ZpbGVOYW1lPyhtb2R1bGVOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmd8bnVsbDtcbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgZmlsZSBwYXRoIHRvIGEgbW9kdWxlIG5hbWUgdGhhdCBjYW4gYmUgdXNlZCBhcyBhbiBgaW1wb3J0IC4uLmBcbiAgICogSS5lLiBgcGF0aC90by9pbXBvcnRlZEZpbGUudHNgIHNob3VsZCBiZSBpbXBvcnRlZCBieSBgcGF0aC90by9jb250YWluaW5nRmlsZS50c2AuXG4gICAqL1xuICBmaWxlTmFtZVRvTW9kdWxlTmFtZT8oaW1wb3J0ZWRGaWxlUGF0aDogc3RyaW5nLCBjb250YWluaW5nRmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZztcbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgZmlsZSBwYXRoIGZvciBhIHJlc291cmNlIHRoYXQgaXMgdXNlZCBpbiBhIHNvdXJjZSBmaWxlIG9yIGFub3RoZXIgcmVzb3VyY2VcbiAgICogaW50byBhIGZpbGVwYXRoLlxuICAgKi9cbiAgcmVzb3VyY2VOYW1lVG9GaWxlTmFtZT8ocmVzb3VyY2VOYW1lOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nfG51bGw7XG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIGZpbGUgbmFtZSBpbnRvIGEgcmVwcmVzZW50YXRpb24gdGhhdCBzaG91bGQgYmUgc3RvcmVkIGluIGEgc3VtbWFyeSBmaWxlLlxuICAgKiBUaGlzIGhhcyB0byBpbmNsdWRlIGNoYW5naW5nIHRoZSBzdWZmaXggYXMgd2VsbC5cbiAgICogRS5nLlxuICAgKiBgc29tZV9maWxlLnRzYCAtPiBgc29tZV9maWxlLmQudHNgXG4gICAqXG4gICAqIEBwYXJhbSByZWZlcnJpbmdTcmNGaWxlTmFtZSB0aGUgc291cmUgZmlsZSB0aGF0IHJlZmVycyB0byBmaWxlTmFtZVxuICAgKi9cbiAgdG9TdW1tYXJ5RmlsZU5hbWU/KGZpbGVOYW1lOiBzdHJpbmcsIHJlZmVycmluZ1NyY0ZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIGZpbGVOYW1lIHRoYXQgd2FzIHByb2Nlc3NlZCBieSBgdG9TdW1tYXJ5RmlsZU5hbWVgIGJhY2sgaW50byBhIHJlYWwgZmlsZU5hbWVcbiAgICogZ2l2ZW4gdGhlIGZpbGVOYW1lIG9mIHRoZSBsaWJyYXJ5IHRoYXQgaXMgcmVmZXJyaWcgdG8gaXQuXG4gICAqL1xuICBmcm9tU3VtbWFyeUZpbGVOYW1lPyhmaWxlTmFtZTogc3RyaW5nLCByZWZlcnJpbmdMaWJGaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nO1xuICAvKipcbiAgICogTG9hZCBhIHJlZmVyZW5jZWQgcmVzb3VyY2UgZWl0aGVyIHN0YXRpY2FsbHkgb3IgYXN5bmNocm9ub3VzbHkuIElmIHRoZSBob3N0IHJldHVybnMgYVxuICAgKiBgUHJvbWlzZTxzdHJpbmc+YCBpdCBpcyBhc3N1bWVkIHRoZSB1c2VyIG9mIHRoZSBjb3JyZXNwb25kaW5nIGBQcm9ncmFtYCB3aWxsIGNhbGxcbiAgICogYGxvYWROZ1N0cnVjdHVyZUFzeW5jKClgLiBSZXR1cm5pbmcgIGBQcm9taXNlPHN0cmluZz5gIG91dHNpZGUgYGxvYWROZ1N0cnVjdHVyZUFzeW5jKClgIHdpbGxcbiAgICogY2F1c2UgYSBkaWFnbm9zdGljcyBkaWFnbm9zdGljIGVycm9yIG9yIGFuIGV4Y2VwdGlvbiB0byBiZSB0aHJvd24uXG4gICAqL1xuICByZWFkUmVzb3VyY2U/KGZpbGVOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz58c3RyaW5nO1xuICAvKipcbiAgICogUHJvZHVjZSBhbiBBTUQgbW9kdWxlIG5hbWUgZm9yIHRoZSBzb3VyY2UgZmlsZS4gVXNlZCBpbiBCYXplbC5cbiAgICpcbiAgICogQW4gQU1EIG1vZHVsZSBjYW4gaGF2ZSBhbiBhcmJpdHJhcnkgbmFtZSwgc28gdGhhdCBpdCBpcyByZXF1aXJlJ2QgYnkgbmFtZVxuICAgKiByYXRoZXIgdGhhbiBieSBwYXRoLiBTZWUgaHR0cDovL3JlcXVpcmVqcy5vcmcvZG9jcy93aHlhbWQuaHRtbCNuYW1lZG1vZHVsZXNcbiAgICovXG4gIGFtZE1vZHVsZU5hbWU/KHNmOiB0cy5Tb3VyY2VGaWxlKTogc3RyaW5nfHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogR2V0IHRoZSBhYnNvbHV0ZSBwYXRocyB0byB0aGUgY2hhbmdlZCBmaWxlcyB0aGF0IHRyaWdnZXJlZCB0aGUgY3VycmVudCBjb21waWxhdGlvblxuICAgKiBvciBgdW5kZWZpbmVkYCBpZiB0aGlzIGlzIG5vdCBhbiBpbmNyZW1lbnRhbCBidWlsZC5cbiAgICovXG4gIGdldE1vZGlmaWVkUmVzb3VyY2VGaWxlcz8oKTogU2V0PHN0cmluZz58dW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZW51bSBFbWl0RmxhZ3Mge1xuICBEVFMgPSAxIDw8IDAsXG4gIEpTID0gMSA8PCAxLFxuICBNZXRhZGF0YSA9IDEgPDwgMixcbiAgSTE4bkJ1bmRsZSA9IDEgPDwgMyxcbiAgQ29kZWdlbiA9IDEgPDwgNCxcblxuICBEZWZhdWx0ID0gRFRTIHwgSlMgfCBDb2RlZ2VuLFxuICBBbGwgPSBEVFMgfCBKUyB8IE1ldGFkYXRhIHwgSTE4bkJ1bmRsZSB8IENvZGVnZW4sXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3VzdG9tVHJhbnNmb3JtZXJzIHtcbiAgYmVmb3JlVHM/OiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT5bXTtcbiAgYWZ0ZXJUcz86IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRzRW1pdEFyZ3VtZW50cyB7XG4gIHByb2dyYW06IHRzLlByb2dyYW07XG4gIGhvc3Q6IENvbXBpbGVySG9zdDtcbiAgb3B0aW9uczogQ29tcGlsZXJPcHRpb25zO1xuICB0YXJnZXRTb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZTtcbiAgd3JpdGVGaWxlPzogdHMuV3JpdGVGaWxlQ2FsbGJhY2s7XG4gIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW47XG4gIGVtaXRPbmx5RHRzRmlsZXM/OiBib29sZWFuO1xuICBjdXN0b21UcmFuc2Zvcm1lcnM/OiB0cy5DdXN0b21UcmFuc2Zvcm1lcnM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVHNFbWl0Q2FsbGJhY2sgeyAoYXJnczogVHNFbWl0QXJndW1lbnRzKTogdHMuRW1pdFJlc3VsdDsgfVxuZXhwb3J0IGludGVyZmFjZSBUc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayB7IChyZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10pOiB0cy5FbWl0UmVzdWx0OyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgTGlicmFyeVN1bW1hcnkge1xuICBmaWxlTmFtZTogc3RyaW5nO1xuICB0ZXh0OiBzdHJpbmc7XG4gIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExhenlSb3V0ZSB7XG4gIHJvdXRlOiBzdHJpbmc7XG4gIG1vZHVsZToge25hbWU6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZ307XG4gIHJlZmVyZW5jZWRNb2R1bGU6IHtuYW1lOiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmd9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFByb2dyYW0ge1xuICAvKipcbiAgICogUmV0cmlldmUgdGhlIFR5cGVTY3JpcHQgcHJvZ3JhbSB1c2VkIHRvIHByb2R1Y2Ugc2VtYW50aWMgZGlhZ25vc3RpY3MgYW5kIGVtaXQgdGhlIHNvdXJjZXMuXG4gICAqXG4gICAqIEFuZ3VsYXIgc3RydWN0dXJhbCBpbmZvcm1hdGlvbiBpcyByZXF1aXJlZCB0byBwcm9kdWNlIHRoZSBwcm9ncmFtLlxuICAgKi9cbiAgZ2V0VHNQcm9ncmFtKCk6IHRzLlByb2dyYW07XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIG9wdGlvbnMgZGlhZ25vc3RpY3MgZm9yIHRoZSBUeXBlU2NyaXB0IG9wdGlvbnMgdXNlZCB0byBjcmVhdGUgdGhlIHByb2dyYW0uIFRoaXMgaXNcbiAgICogZmFzdGVyIHRoYW4gY2FsbGluZyBgZ2V0VHNQcm9ncmFtKCkuZ2V0T3B0aW9uc0RpYWdub3N0aWNzKClgIHNpbmNlIGl0IGRvZXMgbm90IG5lZWQgdG9cbiAgICogY29sbGVjdCBBbmd1bGFyIHN0cnVjdHVyYWwgaW5mb3JtYXRpb24gdG8gcHJvZHVjZSB0aGUgZXJyb3JzLlxuICAgKi9cbiAgZ2V0VHNPcHRpb25EaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogUmV0cmlldmUgb3B0aW9ucyBkaWFnbm9zdGljcyBmb3IgdGhlIEFuZ3VsYXIgb3B0aW9ucyB1c2VkIHRvIGNyZWF0ZSB0aGUgcHJvZ3JhbS5cbiAgICovXG4gIGdldE5nT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8RGlhZ25vc3RpYz47XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSBzeW50YXggZGlhZ25vc3RpY3MgZnJvbSBUeXBlU2NyaXB0LiBUaGlzIGlzIGZhc3RlciB0aGFuIGNhbGxpbmdcbiAgICogYGdldFRzUHJvZ3JhbSgpLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKClgIHNpbmNlIGl0IGRvZXMgbm90IG5lZWQgdG8gY29sbGVjdCBBbmd1bGFyIHN0cnVjdHVyYWxcbiAgICogaW5mb3JtYXRpb24gdG8gcHJvZHVjZSB0aGUgZXJyb3JzLlxuICAgKi9cbiAgZ2V0VHNTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbik6XG4gICAgICBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+O1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgZGlhZ25vc3RpY3MgZm9yIHRoZSBzdHJ1Y3R1cmUgb2YgYW4gQW5ndWxhciBhcHBsaWNhdGlvbiBpcyBjb3JyZWN0bHkgZm9ybWVkLlxuICAgKiBUaGlzIGluY2x1ZGVzIHZhbGlkYXRpbmcgQW5ndWxhciBhbm5vdGF0aW9ucyBhbmQgdGhlIHN5bnRheCBvZiByZWZlcmVuY2VkIGFuZCBpbWJlZGRlZCBIVE1MXG4gICAqIGFuZCBDU1MuXG4gICAqXG4gICAqIE5vdGUgaXQgaXMgaW1wb3J0YW50IHRvIGRpc3BsYXlpbmcgVHlwZVNjcmlwdCBzZW1hbnRpYyBkaWFnbm9zdGljcyBhbG9uZyB3aXRoIEFuZ3VsYXJcbiAgICogc3RydWN0dXJhbCBkaWFnbm9zdGljcyBhcyBhbiBlcnJvciBpbiB0aGUgcHJvZ3JhbSBzdHJ1Y3R1cmUgbWlnaHQgY2F1c2UgZXJyb3JzIGRldGVjdGVkIGluXG4gICAqIHNlbWFudGljIGFuYWx5c2lzIGFuZCBhIHNlbWFudGljIGVycm9yIG1pZ2h0IGNhdXNlIGVycm9ycyBpbiBzcGVjaWZ5aW5nIHRoZSBwcm9ncmFtIHN0cnVjdHVyZS5cbiAgICpcbiAgICogQW5ndWxhciBzdHJ1Y3R1cmFsIGluZm9ybWF0aW9uIGlzIHJlcXVpcmVkIHRvIHByb2R1Y2UgdGhlc2UgZGlhZ25vc3RpY3MuXG4gICAqL1xuICBnZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcyhjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTogUmVhZG9ubHlBcnJheTxEaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogUmV0cmlldmUgdGhlIHNlbWFudGljIGRpYWdub3N0aWNzIGZyb20gVHlwZVNjcmlwdC4gVGhpcyBpcyBlcXVpdmFsZW50IHRvIGNhbGxpbmdcbiAgICogYGdldFRzUHJvZ3JhbSgpLmdldFNlbWFudGljRGlhZ25vc3RpY3MoKWAgZGlyZWN0bHkgYW5kIGlzIGluY2x1ZGVkIGZvciBjb21wbGV0ZW5lc3MuXG4gICAqL1xuICBnZXRUc1NlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZT86IHRzLlNvdXJjZUZpbGUsIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4pOlxuICAgICAgUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogUmV0cmlldmUgdGhlIEFuZ3VsYXIgc2VtYW50aWMgZGlhZ25vc3RpY3MuXG4gICAqXG4gICAqIEFuZ3VsYXIgc3RydWN0dXJhbCBpbmZvcm1hdGlvbiBpcyByZXF1aXJlZCB0byBwcm9kdWNlIHRoZXNlIGRpYWdub3N0aWNzLlxuICAgKi9cbiAgZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lPzogc3RyaW5nLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuKTpcbiAgICAgIFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpY3xEaWFnbm9zdGljPjtcblxuICAvKipcbiAgICogTG9hZCBBbmd1bGFyIHN0cnVjdHVyYWwgaW5mb3JtYXRpb24gYXN5bmNocm9ub3VzbHkuIElmIHRoaXMgbWV0aG9kIGlzIG5vdCBjYWxsZWQgdGhlbiB0aGVcbiAgICogQW5ndWxhciBzdHJ1Y3R1cmFsIGluZm9ybWF0aW9uLCBpbmNsdWRpbmcgcmVmZXJlbmNlZCBIVE1MIGFuZCBDU1MgZmlsZXMsIGFyZSBsb2FkZWRcbiAgICogc3luY2hyb25vdXNseS4gSWYgdGhlIHN1cHBsaWVkIEFuZ3VsYXIgY29tcGlsZXIgaG9zdCByZXR1cm5zIGEgcHJvbWlzZSBmcm9tIGBsb2FkUmVzb3VyY2UoKWBcbiAgICogd2lsbCBwcm9kdWNlIGEgZGlhZ25vc3RpYyBlcnJvciBtZXNzYWdlIG9yLCBgZ2V0VHNQcm9ncmFtKClgIG9yIGBlbWl0YCB0byB0aHJvdy5cbiAgICovXG4gIGxvYWROZ1N0cnVjdHVyZUFzeW5jKCk6IFByb21pc2U8dm9pZD47XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGxhenkgcm91dGVzIGluIHRoZSBwcm9ncmFtLlxuICAgKiBAcGFyYW0gZW50cnlSb3V0ZSBBIHJlZmVyZW5jZSB0byBhbiBOZ01vZHVsZSBsaWtlIGBzb21lTW9kdWxlI25hbWVgLiBJZiBnaXZlbixcbiAgICogICAgICAgICAgICAgIHdpbGwgcmVjdXJzaXZlbHkgYW5hbHl6ZSByb3V0ZXMgc3RhcnRpbmcgZnJvbSB0aGlzIHN5bWJvbCBvbmx5LlxuICAgKiAgICAgICAgICAgICAgT3RoZXJ3aXNlIHdpbGwgbGlzdCBhbGwgcm91dGVzIGZvciBhbGwgTmdNb2R1bGVzIGluIHRoZSBwcm9ncmFtL1xuICAgKi9cbiAgbGlzdExhenlSb3V0ZXMoZW50cnlSb3V0ZT86IHN0cmluZyk6IExhenlSb3V0ZVtdO1xuXG4gIC8qKlxuICAgKiBFbWl0IHRoZSBmaWxlcyByZXF1ZXN0ZWQgYnkgZW1pdEZsYWdzIGltcGxpZWQgYnkgdGhlIHByb2dyYW0uXG4gICAqXG4gICAqIEFuZ3VsYXIgc3RydWN0dXJhbCBpbmZvcm1hdGlvbiBpcyByZXF1aXJlZCB0byBlbWl0IGZpbGVzLlxuICAgKi9cbiAgZW1pdCh7ZW1pdEZsYWdzLCBjYW5jZWxsYXRpb25Ub2tlbiwgY3VzdG9tVHJhbnNmb3JtZXJzLCBlbWl0Q2FsbGJhY2ssXG4gICAgICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFja30/OiB7XG4gICAgZW1pdEZsYWdzPzogRW1pdEZsYWdzLFxuICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW4sXG4gICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgIGVtaXRDYWxsYmFjaz86IFRzRW1pdENhbGxiYWNrLFxuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IFRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrXG4gIH0pOiB0cy5FbWl0UmVzdWx0O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSAuZC50cyAvIC5uZ3N1bW1hcnkuanNvbiAvIC5uZ2ZhY3RvcnkuZC50cyBmaWxlcyBvZiBsaWJyYXJpZXMgdGhhdCBoYXZlIGJlZW4gZW1pdHRlZFxuICAgKiBpbiB0aGlzIHByb2dyYW0gb3IgcHJldmlvdXMgcHJvZ3JhbXMgd2l0aCBwYXRocyB0aGF0IGVtdWxhdGUgdGhlIGZhY3QgdGhhdCB0aGVzZSBsaWJyYXJpZXNcbiAgICogaGF2ZSBiZWVuIGNvbXBpbGVkIGJlZm9yZSB3aXRoIG5vIG91dERpci5cbiAgICovXG4gIGdldExpYnJhcnlTdW1tYXJpZXMoKTogTWFwPHN0cmluZywgTGlicmFyeVN1bW1hcnk+O1xuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGdldEVtaXR0ZWRHZW5lcmF0ZWRGaWxlcygpOiBNYXA8c3RyaW5nLCBHZW5lcmF0ZWRGaWxlPjtcblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBnZXRFbWl0dGVkU291cmNlRmlsZXMoKTogTWFwPHN0cmluZywgdHMuU291cmNlRmlsZT47XG59XG4iXX0=