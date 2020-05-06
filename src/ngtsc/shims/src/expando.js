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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwYW5kby5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL2V4cGFuZG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFNSDs7T0FFRztJQUNVLFFBQUEsV0FBVyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQztJQThCakQ7O09BRUc7SUFDSCxTQUFnQixVQUFVLENBQUMsRUFBaUI7UUFDMUMsT0FBUSxFQUFnQyxDQUFDLG1CQUFXLENBQUMsS0FBSyxTQUFTLENBQUM7SUFDdEUsQ0FBQztJQUZELGdDQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixlQUFlLENBQUMsRUFBaUI7UUFDL0MsSUFBTSxLQUFLLEdBQUcsRUFBK0IsQ0FBQztRQUM5QyxJQUFJLEtBQUssQ0FBQyxtQkFBVyxDQUFDLEtBQUssU0FBUyxFQUFFO1lBQ3BDLDhEQUE4RDtZQUM5RCxPQUFPLEtBQUssQ0FBQyxtQkFBVyxDQUFFLENBQUM7U0FDNUI7UUFFRCxvRUFBb0U7UUFDcEUsSUFBTSxTQUFTLEdBQW9CO1lBQ2pDLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFFBQVEsRUFBRSxJQUFJO1lBQ2QsdUJBQXVCLEVBQUUsSUFBSTtTQUM5QixDQUFDO1FBQ0YsS0FBSyxDQUFDLG1CQUFXLENBQUMsR0FBRyxTQUFTLENBQUM7UUFDL0IsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQWZELDBDQWVDO0lBbUJEOztPQUVHO0lBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsRUFBaUI7UUFDcEQsT0FBTyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLG1CQUFXLENBQUMsQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDO0lBQzdELENBQUM7SUFGRCxvREFFQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsTUFBTSxDQUFDLEVBQWlCO1FBQ3RDLE9BQU8sVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFXLENBQUMsQ0FBQyxRQUFRLEtBQUssSUFBSSxJQUFJLEVBQUUsQ0FBQyxtQkFBVyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDakcsQ0FBQztJQUZELHdCQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFtQixFQUFFLEVBQWlCO1FBQ3JFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMvQixPQUFPO1NBQ1I7UUFDRCxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUM7SUFDaEUsQ0FBQztJQUxELDRDQUtDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuXG4vKipcbiAqIEEgYFN5bWJvbGAgd2hpY2ggaXMgdXNlZCB0byBwYXRjaCBleHRlbnNpb24gZGF0YSBvbnRvIGB0cy5Tb3VyY2VGaWxlYHMuXG4gKi9cbmV4cG9ydCBjb25zdCBOZ0V4dGVuc2lvbiA9IFN5bWJvbCgnTmdFeHRlbnNpb24nKTtcblxuLyoqXG4gKiBDb250ZW50cyBvZiB0aGUgYE5nRXh0ZW5zaW9uYCBwcm9wZXJ0eSBvZiBhIGB0cy5Tb3VyY2VGaWxlYC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ0V4dGVuc2lvbkRhdGEge1xuICBpc1RvcExldmVsU2hpbTogYm9vbGVhbjtcbiAgZmlsZVNoaW06IE5nRmlsZVNoaW1EYXRhfG51bGw7XG4gIG9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzOiBSZWFkb25seUFycmF5PHRzLkZpbGVSZWZlcmVuY2U+fG51bGw7XG59XG5cbi8qKlxuICogQSBgdHMuU291cmNlRmlsZWAgd2hpY2ggbWF5IG9yIG1heSBub3QgaGF2ZSBgTmdFeHRlbnNpb25gIGRhdGEuXG4gKi9cbmludGVyZmFjZSBNYXliZU5nRXh0ZW5kZWRTb3VyY2VGaWxlIGV4dGVuZHMgdHMuU291cmNlRmlsZSB7XG4gIFtOZ0V4dGVuc2lvbl0/OiBOZ0V4dGVuc2lvbkRhdGE7XG59XG5cbi8qKlxuICogQSBgdHMuU291cmNlRmlsZWAgd2hpY2ggaGFzIGBOZ0V4dGVuc2lvbmAgZGF0YS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ0V4dGVuZGVkU291cmNlRmlsZSBleHRlbmRzIHRzLlNvdXJjZUZpbGUge1xuICAvKipcbiAgICogT3ZlcnJpZGVzIHRoZSB0eXBlIG9mIGByZWZlcmVuY2VkRmlsZXNgIHRvIGJlIHdyaXRlYWJsZS5cbiAgICovXG4gIHJlZmVyZW5jZWRGaWxlczogdHMuRmlsZVJlZmVyZW5jZVtdO1xuXG4gIFtOZ0V4dGVuc2lvbl06IE5nRXh0ZW5zaW9uRGF0YTtcbn1cblxuLyoqXG4gKiBOYXJyb3dzIGEgYHRzLlNvdXJjZUZpbGVgIGlmIGl0IGhhcyBhbiBgTmdFeHRlbnNpb25gIHByb3BlcnR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNFeHRlbmRlZChzZjogdHMuU291cmNlRmlsZSk6IHNmIGlzIE5nRXh0ZW5kZWRTb3VyY2VGaWxlIHtcbiAgcmV0dXJuIChzZiBhcyBNYXliZU5nRXh0ZW5kZWRTb3VyY2VGaWxlKVtOZ0V4dGVuc2lvbl0gIT09IHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBgTmdFeHRlbnNpb25EYXRhYCBmb3IgYSBnaXZlbiBgdHMuU291cmNlRmlsZWAsIGFkZGluZyBpdCBpZiBub25lIGV4aXN0cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNmRXh0ZW5zaW9uRGF0YShzZjogdHMuU291cmNlRmlsZSk6IE5nRXh0ZW5zaW9uRGF0YSB7XG4gIGNvbnN0IGV4dFNmID0gc2YgYXMgTWF5YmVOZ0V4dGVuZGVkU291cmNlRmlsZTtcbiAgaWYgKGV4dFNmW05nRXh0ZW5zaW9uXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gVGhlIGZpbGUgYWxyZWFkeSBoYXMgZXh0ZW5zaW9uIGRhdGEsIHNvIHJldHVybiBpdCBkaXJlY3RseS5cbiAgICByZXR1cm4gZXh0U2ZbTmdFeHRlbnNpb25dITtcbiAgfVxuXG4gIC8vIFRoZSBmaWxlIGhhcyBubyBleGlzdGluZyBleHRlbnNpb24gZGF0YSwgc28gYWRkIGl0IGFuZCByZXR1cm4gaXQuXG4gIGNvbnN0IGV4dGVuc2lvbjogTmdFeHRlbnNpb25EYXRhID0ge1xuICAgIGlzVG9wTGV2ZWxTaGltOiBmYWxzZSxcbiAgICBmaWxlU2hpbTogbnVsbCxcbiAgICBvcmlnaW5hbFJlZmVyZW5jZWRGaWxlczogbnVsbCxcbiAgfTtcbiAgZXh0U2ZbTmdFeHRlbnNpb25dID0gZXh0ZW5zaW9uO1xuICByZXR1cm4gZXh0ZW5zaW9uO1xufVxuXG4vKipcbiAqIERhdGEgYXNzb2NpYXRlZCB3aXRoIGEgcGVyLXNoaW0gaW5zdGFuY2UgYHRzLlNvdXJjZUZpbGVgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nRmlsZVNoaW1EYXRhIHtcbiAgZ2VuZXJhdGVkRnJvbTogQWJzb2x1dGVGc1BhdGg7XG4gIGV4dGVuc2lvbjogc3RyaW5nO1xufVxuXG4vKipcbiAqIEFuIGBOZ0V4dGVuZGVkU291cmNlRmlsZWAgdGhhdCBpcyBhIHBlci1maWxlIHNoaW0gYW5kIGhhcyBgTmdGaWxlU2hpbURhdGFgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nRmlsZVNoaW1Tb3VyY2VGaWxlIGV4dGVuZHMgTmdFeHRlbmRlZFNvdXJjZUZpbGUge1xuICBbTmdFeHRlbnNpb25dOiBOZ0V4dGVuc2lvbkRhdGEme1xuICAgIGZpbGVTaGltOiBOZ0ZpbGVTaGltRGF0YSxcbiAgfTtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGBzZmAgaXMgYSBwZXItZmlsZSBzaGltIGB0cy5Tb3VyY2VGaWxlYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRmlsZVNoaW1Tb3VyY2VGaWxlKHNmOiB0cy5Tb3VyY2VGaWxlKTogc2YgaXMgTmdGaWxlU2hpbVNvdXJjZUZpbGUge1xuICByZXR1cm4gaXNFeHRlbmRlZChzZikgJiYgc2ZbTmdFeHRlbnNpb25dLmZpbGVTaGltICE9PSBudWxsO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYHNmYCBpcyBhIHNoaW0gYHRzLlNvdXJjZUZpbGVgIChlaXRoZXIgYSBwZXItZmlsZSBzaGltIG9yIGEgdG9wLWxldmVsIHNoaW0pLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTaGltKHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gIHJldHVybiBpc0V4dGVuZGVkKHNmKSAmJiAoc2ZbTmdFeHRlbnNpb25dLmZpbGVTaGltICE9PSBudWxsIHx8IHNmW05nRXh0ZW5zaW9uXS5pc1RvcExldmVsU2hpbSk7XG59XG5cbi8qKlxuICogQ29weSBhbnkgc2hpbSBkYXRhIGZyb20gb25lIGB0cy5Tb3VyY2VGaWxlYCB0byBhbm90aGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29weUZpbGVTaGltRGF0YShmcm9tOiB0cy5Tb3VyY2VGaWxlLCB0bzogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICBpZiAoIWlzRmlsZVNoaW1Tb3VyY2VGaWxlKGZyb20pKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHNmRXh0ZW5zaW9uRGF0YSh0bykuZmlsZVNoaW0gPSBzZkV4dGVuc2lvbkRhdGEoZnJvbSkuZmlsZVNoaW07XG59XG4iXX0=