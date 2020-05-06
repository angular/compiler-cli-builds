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
        define("@angular/compiler-cli/src/ngtsc/shims/src/reference_tagger", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/shims/src/expando", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var expando_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/expando");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/shims/src/util");
    /**
     * Manipulates the `referencedFiles` property of `ts.SourceFile`s to add references to shim files
     * for each original source file, causing the shims to be loaded into the program as well.
     *
     * `ShimReferenceTagger`s are intended to operate during program creation only.
     */
    var ShimReferenceTagger = /** @class */ (function () {
        function ShimReferenceTagger(shimExtensions) {
            /**
             * Tracks which original files have been processed and had shims generated if necessary.
             *
             * This is used to avoid generating shims twice for the same file.
             */
            this.tagged = new Set();
            /**
             * Whether shim tagging is currently being performed.
             */
            this.enabled = true;
            this.suffixes = shimExtensions.map(function (extension) { return "." + extension + ".ts"; });
        }
        /**
         * Tag `sf` with any needed references if it's not a shim itself.
         */
        ShimReferenceTagger.prototype.tag = function (sf) {
            var e_1, _a;
            if (!this.enabled || sf.isDeclarationFile || expando_1.isShim(sf) || this.tagged.has(sf)) {
                return;
            }
            expando_1.sfExtensionData(sf).originalReferencedFiles = sf.referencedFiles;
            var referencedFiles = tslib_1.__spread(sf.referencedFiles);
            var sfPath = file_system_1.absoluteFromSourceFile(sf);
            try {
                for (var _b = tslib_1.__values(this.suffixes), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var suffix = _c.value;
                    referencedFiles.push({
                        fileName: util_1.makeShimFileName(sfPath, suffix),
                        pos: 0,
                        end: 0,
                    });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            sf.referencedFiles = referencedFiles;
            this.tagged.add(sf);
        };
        /**
         * Restore the original `referencedFiles` values of all tagged `ts.SourceFile`s and disable the
         * `ShimReferenceTagger`.
         */
        ShimReferenceTagger.prototype.finalize = function () {
            var e_2, _a;
            this.enabled = false;
            try {
                for (var _b = tslib_1.__values(this.tagged), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    if (!expando_1.isExtended(sf)) {
                        continue;
                    }
                    var extensionData = expando_1.sfExtensionData(sf);
                    if (extensionData.originalReferencedFiles !== null) {
                        sf.referencedFiles = extensionData.originalReferencedFiles;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            this.tagged.clear();
        };
        return ShimReferenceTagger;
    }());
    exports.ShimReferenceTagger = ShimReferenceTagger;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlX3RhZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL3JlZmVyZW5jZV90YWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUgsMkVBQXVFO0lBRXZFLDZFQUEyRjtJQUMzRix1RUFBd0M7SUFFeEM7Ozs7O09BS0c7SUFDSDtRQWVFLDZCQUFZLGNBQXdCO1lBWnBDOzs7O2VBSUc7WUFDSyxXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQWlCLENBQUM7WUFFMUM7O2VBRUc7WUFDSyxZQUFPLEdBQVksSUFBSSxDQUFDO1lBRzlCLElBQUksQ0FBQyxRQUFRLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLE1BQUksU0FBUyxRQUFLLEVBQWxCLENBQWtCLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxpQ0FBRyxHQUFILFVBQUksRUFBaUI7O1lBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsSUFBSSxnQkFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUM5RSxPQUFPO2FBQ1I7WUFFRCx5QkFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUM7WUFDakUsSUFBTSxlQUFlLG9CQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUVoRCxJQUFNLE1BQU0sR0FBRyxvQ0FBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7Z0JBQzFDLEtBQXFCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFBLGdCQUFBLDRCQUFFO29CQUEvQixJQUFNLE1BQU0sV0FBQTtvQkFDZixlQUFlLENBQUMsSUFBSSxDQUFDO3dCQUNuQixRQUFRLEVBQUUsdUJBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQzt3QkFDMUMsR0FBRyxFQUFFLENBQUM7d0JBQ04sR0FBRyxFQUFFLENBQUM7cUJBQ1AsQ0FBQyxDQUFDO2lCQUNKOzs7Ozs7Ozs7WUFFRCxFQUFFLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztZQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBRUQ7OztXQUdHO1FBQ0gsc0NBQVEsR0FBUjs7WUFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQzs7Z0JBQ3JCLEtBQWlCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFBLGdCQUFBLDRCQUFFO29CQUF6QixJQUFNLEVBQUUsV0FBQTtvQkFDWCxJQUFJLENBQUMsb0JBQVksQ0FBQyxFQUFFLENBQUMsRUFBRTt3QkFDckIsU0FBUztxQkFDVjtvQkFFRCxJQUFNLGFBQWEsR0FBRyx5QkFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUMxQyxJQUFJLGFBQWEsQ0FBQyx1QkFBdUIsS0FBSyxJQUFJLEVBQUU7d0JBQ2xELEVBQUUsQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFDLHVCQUE4QyxDQUFDO3FCQUNuRjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixDQUFDO1FBQ0gsMEJBQUM7SUFBRCxDQUFDLEFBN0RELElBNkRDO0lBN0RZLGtEQUFtQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7aXNFeHRlbmRlZCBhcyBpc0V4dGVuZGVkU2YsIGlzU2hpbSwgTmdFeHRlbnNpb24sIHNmRXh0ZW5zaW9uRGF0YX0gZnJvbSAnLi9leHBhbmRvJztcbmltcG9ydCB7bWFrZVNoaW1GaWxlTmFtZX0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBNYW5pcHVsYXRlcyB0aGUgYHJlZmVyZW5jZWRGaWxlc2AgcHJvcGVydHkgb2YgYHRzLlNvdXJjZUZpbGVgcyB0byBhZGQgcmVmZXJlbmNlcyB0byBzaGltIGZpbGVzXG4gKiBmb3IgZWFjaCBvcmlnaW5hbCBzb3VyY2UgZmlsZSwgY2F1c2luZyB0aGUgc2hpbXMgdG8gYmUgbG9hZGVkIGludG8gdGhlIHByb2dyYW0gYXMgd2VsbC5cbiAqXG4gKiBgU2hpbVJlZmVyZW5jZVRhZ2dlcmBzIGFyZSBpbnRlbmRlZCB0byBvcGVyYXRlIGR1cmluZyBwcm9ncmFtIGNyZWF0aW9uIG9ubHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBTaGltUmVmZXJlbmNlVGFnZ2VyIHtcbiAgcHJpdmF0ZSBzdWZmaXhlczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB3aGljaCBvcmlnaW5hbCBmaWxlcyBoYXZlIGJlZW4gcHJvY2Vzc2VkIGFuZCBoYWQgc2hpbXMgZ2VuZXJhdGVkIGlmIG5lY2Vzc2FyeS5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIHRvIGF2b2lkIGdlbmVyYXRpbmcgc2hpbXMgdHdpY2UgZm9yIHRoZSBzYW1lIGZpbGUuXG4gICAqL1xuICBwcml2YXRlIHRhZ2dlZCA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcblxuICAvKipcbiAgICogV2hldGhlciBzaGltIHRhZ2dpbmcgaXMgY3VycmVudGx5IGJlaW5nIHBlcmZvcm1lZC5cbiAgICovXG4gIHByaXZhdGUgZW5hYmxlZDogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3Ioc2hpbUV4dGVuc2lvbnM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5zdWZmaXhlcyA9IHNoaW1FeHRlbnNpb25zLm1hcChleHRlbnNpb24gPT4gYC4ke2V4dGVuc2lvbn0udHNgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWcgYHNmYCB3aXRoIGFueSBuZWVkZWQgcmVmZXJlbmNlcyBpZiBpdCdzIG5vdCBhIHNoaW0gaXRzZWxmLlxuICAgKi9cbiAgdGFnKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQgfHwgc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaXNTaGltKHNmKSB8fCB0aGlzLnRhZ2dlZC5oYXMoc2YpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2ZFeHRlbnNpb25EYXRhKHNmKS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcyA9IHNmLnJlZmVyZW5jZWRGaWxlcztcbiAgICBjb25zdCByZWZlcmVuY2VkRmlsZXMgPSBbLi4uc2YucmVmZXJlbmNlZEZpbGVzXTtcblxuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGZvciAoY29uc3Qgc3VmZml4IG9mIHRoaXMuc3VmZml4ZXMpIHtcbiAgICAgIHJlZmVyZW5jZWRGaWxlcy5wdXNoKHtcbiAgICAgICAgZmlsZU5hbWU6IG1ha2VTaGltRmlsZU5hbWUoc2ZQYXRoLCBzdWZmaXgpLFxuICAgICAgICBwb3M6IDAsXG4gICAgICAgIGVuZDogMCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHNmLnJlZmVyZW5jZWRGaWxlcyA9IHJlZmVyZW5jZWRGaWxlcztcbiAgICB0aGlzLnRhZ2dlZC5hZGQoc2YpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc3RvcmUgdGhlIG9yaWdpbmFsIGByZWZlcmVuY2VkRmlsZXNgIHZhbHVlcyBvZiBhbGwgdGFnZ2VkIGB0cy5Tb3VyY2VGaWxlYHMgYW5kIGRpc2FibGUgdGhlXG4gICAqIGBTaGltUmVmZXJlbmNlVGFnZ2VyYC5cbiAgICovXG4gIGZpbmFsaXplKCk6IHZvaWQge1xuICAgIHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50YWdnZWQpIHtcbiAgICAgIGlmICghaXNFeHRlbmRlZFNmKHNmKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZXh0ZW5zaW9uRGF0YSA9IHNmRXh0ZW5zaW9uRGF0YShzZik7XG4gICAgICBpZiAoZXh0ZW5zaW9uRGF0YS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcyAhPT0gbnVsbCkge1xuICAgICAgICBzZi5yZWZlcmVuY2VkRmlsZXMgPSBleHRlbnNpb25EYXRhLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzISBhcyB0cy5GaWxlUmVmZXJlbmNlW107XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMudGFnZ2VkLmNsZWFyKCk7XG4gIH1cbn1cbiJdfQ==