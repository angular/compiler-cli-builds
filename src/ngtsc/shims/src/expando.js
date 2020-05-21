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
        define("@angular/compiler-cli/src/ngtsc/shims/src/expando", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.copyFileShimData = exports.isShim = exports.isFileShimSourceFile = exports.sfExtensionData = exports.isExtended = exports.NgExtension = void 0;
    /**
     * A `Symbol` which is used to patch extension data onto `ts.SourceFile`s.
     */
    exports.NgExtension = Symbol('NgExtension');
    /**
     * Narrows a `ts.SourceFile` if it has an `NgExtension` property.
     */
    function isExtended(sf) {
        return sf[exports.NgExtension] !== undefined;
    }
    exports.isExtended = isExtended;
    /**
     * Returns the `NgExtensionData` for a given `ts.SourceFile`, adding it if none exists.
     */
    function sfExtensionData(sf) {
        var extSf = sf;
        if (extSf[exports.NgExtension] !== undefined) {
            // The file already has extension data, so return it directly.
            return extSf[exports.NgExtension];
        }
        // The file has no existing extension data, so add it and return it.
        var extension = {
            isTopLevelShim: false,
            fileShim: null,
            originalReferencedFiles: null,
        };
        extSf[exports.NgExtension] = extension;
        return extension;
    }
    exports.sfExtensionData = sfExtensionData;
    /**
     * Check whether `sf` is a per-file shim `ts.SourceFile`.
     */
    function isFileShimSourceFile(sf) {
        return isExtended(sf) && sf[exports.NgExtension].fileShim !== null;
    }
    exports.isFileShimSourceFile = isFileShimSourceFile;
    /**
     * Check whether `sf` is a shim `ts.SourceFile` (either a per-file shim or a top-level shim).
     */
    function isShim(sf) {
        return isExtended(sf) && (sf[exports.NgExtension].fileShim !== null || sf[exports.NgExtension].isTopLevelShim);
    }
    exports.isShim = isShim;
    /**
     * Copy any shim data from one `ts.SourceFile` to another.
     */
    function copyFileShimData(from, to) {
        if (!isFileShimSourceFile(from)) {
            return;
        }
        sfExtensionData(to).fileShim = sfExtensionData(from).fileShim;
    }
    exports.copyFileShimData = copyFileShimData;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwYW5kby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2V4cGFuZG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBTUg7O09BRUc7SUFDVSxRQUFBLFdBQVcsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7SUE4QmpEOztPQUVHO0lBQ0gsU0FBZ0IsVUFBVSxDQUFDLEVBQWlCO1FBQzFDLE9BQVEsRUFBZ0MsQ0FBQyxtQkFBVyxDQUFDLEtBQUssU0FBUyxDQUFDO0lBQ3RFLENBQUM7SUFGRCxnQ0FFQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsZUFBZSxDQUFDLEVBQWlCO1FBQy9DLElBQU0sS0FBSyxHQUFHLEVBQStCLENBQUM7UUFDOUMsSUFBSSxLQUFLLENBQUMsbUJBQVcsQ0FBQyxLQUFLLFNBQVMsRUFBRTtZQUNwQyw4REFBOEQ7WUFDOUQsT0FBTyxLQUFLLENBQUMsbUJBQVcsQ0FBRSxDQUFDO1NBQzVCO1FBRUQsb0VBQW9FO1FBQ3BFLElBQU0sU0FBUyxHQUFvQjtZQUNqQyxjQUFjLEVBQUUsS0FBSztZQUNyQixRQUFRLEVBQUUsSUFBSTtZQUNkLHVCQUF1QixFQUFFLElBQUk7U0FDOUIsQ0FBQztRQUNGLEtBQUssQ0FBQyxtQkFBVyxDQUFDLEdBQUcsU0FBUyxDQUFDO1FBQy9CLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFmRCwwQ0FlQztJQW1CRDs7T0FFRztJQUNILFNBQWdCLG9CQUFvQixDQUFDLEVBQWlCO1FBQ3BELE9BQU8sVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxtQkFBVyxDQUFDLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQztJQUM3RCxDQUFDO0lBRkQsb0RBRUM7SUFFRDs7T0FFRztJQUNILFNBQWdCLE1BQU0sQ0FBQyxFQUFpQjtRQUN0QyxPQUFPLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBVyxDQUFDLENBQUMsUUFBUSxLQUFLLElBQUksSUFBSSxFQUFFLENBQUMsbUJBQVcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFGRCx3QkFFQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBbUIsRUFBRSxFQUFpQjtRQUNyRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDL0IsT0FBTztTQUNSO1FBQ0QsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDO0lBQ2hFLENBQUM7SUFMRCw0Q0FLQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcblxuLyoqXG4gKiBBIGBTeW1ib2xgIHdoaWNoIGlzIHVzZWQgdG8gcGF0Y2ggZXh0ZW5zaW9uIGRhdGEgb250byBgdHMuU291cmNlRmlsZWBzLlxuICovXG5leHBvcnQgY29uc3QgTmdFeHRlbnNpb24gPSBTeW1ib2woJ05nRXh0ZW5zaW9uJyk7XG5cbi8qKlxuICogQ29udGVudHMgb2YgdGhlIGBOZ0V4dGVuc2lvbmAgcHJvcGVydHkgb2YgYSBgdHMuU291cmNlRmlsZWAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdFeHRlbnNpb25EYXRhIHtcbiAgaXNUb3BMZXZlbFNoaW06IGJvb2xlYW47XG4gIGZpbGVTaGltOiBOZ0ZpbGVTaGltRGF0YXxudWxsO1xuICBvcmlnaW5hbFJlZmVyZW5jZWRGaWxlczogUmVhZG9ubHlBcnJheTx0cy5GaWxlUmVmZXJlbmNlPnxudWxsO1xufVxuXG4vKipcbiAqIEEgYHRzLlNvdXJjZUZpbGVgIHdoaWNoIG1heSBvciBtYXkgbm90IGhhdmUgYE5nRXh0ZW5zaW9uYCBkYXRhLlxuICovXG5pbnRlcmZhY2UgTWF5YmVOZ0V4dGVuZGVkU291cmNlRmlsZSBleHRlbmRzIHRzLlNvdXJjZUZpbGUge1xuICBbTmdFeHRlbnNpb25dPzogTmdFeHRlbnNpb25EYXRhO1xufVxuXG4vKipcbiAqIEEgYHRzLlNvdXJjZUZpbGVgIHdoaWNoIGhhcyBgTmdFeHRlbnNpb25gIGRhdGEuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdFeHRlbmRlZFNvdXJjZUZpbGUgZXh0ZW5kcyB0cy5Tb3VyY2VGaWxlIHtcbiAgLyoqXG4gICAqIE92ZXJyaWRlcyB0aGUgdHlwZSBvZiBgcmVmZXJlbmNlZEZpbGVzYCB0byBiZSB3cml0ZWFibGUuXG4gICAqL1xuICByZWZlcmVuY2VkRmlsZXM6IHRzLkZpbGVSZWZlcmVuY2VbXTtcblxuICBbTmdFeHRlbnNpb25dOiBOZ0V4dGVuc2lvbkRhdGE7XG59XG5cbi8qKlxuICogTmFycm93cyBhIGB0cy5Tb3VyY2VGaWxlYCBpZiBpdCBoYXMgYW4gYE5nRXh0ZW5zaW9uYCBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRXh0ZW5kZWQoc2Y6IHRzLlNvdXJjZUZpbGUpOiBzZiBpcyBOZ0V4dGVuZGVkU291cmNlRmlsZSB7XG4gIHJldHVybiAoc2YgYXMgTWF5YmVOZ0V4dGVuZGVkU291cmNlRmlsZSlbTmdFeHRlbnNpb25dICE9PSB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgYE5nRXh0ZW5zaW9uRGF0YWAgZm9yIGEgZ2l2ZW4gYHRzLlNvdXJjZUZpbGVgLCBhZGRpbmcgaXQgaWYgbm9uZSBleGlzdHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZkV4dGVuc2lvbkRhdGEoc2Y6IHRzLlNvdXJjZUZpbGUpOiBOZ0V4dGVuc2lvbkRhdGEge1xuICBjb25zdCBleHRTZiA9IHNmIGFzIE1heWJlTmdFeHRlbmRlZFNvdXJjZUZpbGU7XG4gIGlmIChleHRTZltOZ0V4dGVuc2lvbl0gIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIFRoZSBmaWxlIGFscmVhZHkgaGFzIGV4dGVuc2lvbiBkYXRhLCBzbyByZXR1cm4gaXQgZGlyZWN0bHkuXG4gICAgcmV0dXJuIGV4dFNmW05nRXh0ZW5zaW9uXSE7XG4gIH1cblxuICAvLyBUaGUgZmlsZSBoYXMgbm8gZXhpc3RpbmcgZXh0ZW5zaW9uIGRhdGEsIHNvIGFkZCBpdCBhbmQgcmV0dXJuIGl0LlxuICBjb25zdCBleHRlbnNpb246IE5nRXh0ZW5zaW9uRGF0YSA9IHtcbiAgICBpc1RvcExldmVsU2hpbTogZmFsc2UsXG4gICAgZmlsZVNoaW06IG51bGwsXG4gICAgb3JpZ2luYWxSZWZlcmVuY2VkRmlsZXM6IG51bGwsXG4gIH07XG4gIGV4dFNmW05nRXh0ZW5zaW9uXSA9IGV4dGVuc2lvbjtcbiAgcmV0dXJuIGV4dGVuc2lvbjtcbn1cblxuLyoqXG4gKiBEYXRhIGFzc29jaWF0ZWQgd2l0aCBhIHBlci1zaGltIGluc3RhbmNlIGB0cy5Tb3VyY2VGaWxlYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ0ZpbGVTaGltRGF0YSB7XG4gIGdlbmVyYXRlZEZyb206IEFic29sdXRlRnNQYXRoO1xuICBleHRlbnNpb246IHN0cmluZztcbn1cblxuLyoqXG4gKiBBbiBgTmdFeHRlbmRlZFNvdXJjZUZpbGVgIHRoYXQgaXMgYSBwZXItZmlsZSBzaGltIGFuZCBoYXMgYE5nRmlsZVNoaW1EYXRhYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ0ZpbGVTaGltU291cmNlRmlsZSBleHRlbmRzIE5nRXh0ZW5kZWRTb3VyY2VGaWxlIHtcbiAgW05nRXh0ZW5zaW9uXTogTmdFeHRlbnNpb25EYXRhJntcbiAgICBmaWxlU2hpbTogTmdGaWxlU2hpbURhdGEsXG4gIH07XG59XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBgc2ZgIGlzIGEgcGVyLWZpbGUgc2hpbSBgdHMuU291cmNlRmlsZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0ZpbGVTaGltU291cmNlRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHNmIGlzIE5nRmlsZVNoaW1Tb3VyY2VGaWxlIHtcbiAgcmV0dXJuIGlzRXh0ZW5kZWQoc2YpICYmIHNmW05nRXh0ZW5zaW9uXS5maWxlU2hpbSAhPT0gbnVsbDtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGBzZmAgaXMgYSBzaGltIGB0cy5Tb3VyY2VGaWxlYCAoZWl0aGVyIGEgcGVyLWZpbGUgc2hpbSBvciBhIHRvcC1sZXZlbCBzaGltKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU2hpbShzZjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gaXNFeHRlbmRlZChzZikgJiYgKHNmW05nRXh0ZW5zaW9uXS5maWxlU2hpbSAhPT0gbnVsbCB8fCBzZltOZ0V4dGVuc2lvbl0uaXNUb3BMZXZlbFNoaW0pO1xufVxuXG4vKipcbiAqIENvcHkgYW55IHNoaW0gZGF0YSBmcm9tIG9uZSBgdHMuU291cmNlRmlsZWAgdG8gYW5vdGhlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvcHlGaWxlU2hpbURhdGEoZnJvbTogdHMuU291cmNlRmlsZSwgdG86IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgaWYgKCFpc0ZpbGVTaGltU291cmNlRmlsZShmcm9tKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBzZkV4dGVuc2lvbkRhdGEodG8pLmZpbGVTaGltID0gc2ZFeHRlbnNpb25EYXRhKGZyb20pLmZpbGVTaGltO1xufVxuIl19