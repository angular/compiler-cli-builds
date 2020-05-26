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
        define("@angular/compiler-cli/src/ngtsc/shims/src/reference_tagger", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/shims/src/expando", "@angular/compiler-cli/src/ngtsc/shims/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ShimReferenceTagger = void 0;
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
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
            if (!this.enabled || sf.isDeclarationFile || expando_1.isShim(sf) || this.tagged.has(sf) ||
                !typescript_1.isNonDeclarationTsPath(sf.fileName)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlX3RhZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL3JlZmVyZW5jZV90YWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUlILDJFQUF1RTtJQUN2RSxrRkFBaUU7SUFFakUsNkVBQTJGO0lBQzNGLHVFQUF3QztJQUV4Qzs7Ozs7T0FLRztJQUNIO1FBZUUsNkJBQVksY0FBd0I7WUFacEM7Ozs7ZUFJRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUUxQzs7ZUFFRztZQUNLLFlBQU8sR0FBWSxJQUFJLENBQUM7WUFHOUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsTUFBSSxTQUFTLFFBQUssRUFBbEIsQ0FBa0IsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRDs7V0FFRztRQUNILGlDQUFHLEdBQUgsVUFBSSxFQUFpQjs7WUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLGlCQUFpQixJQUFJLGdCQUFNLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxRSxDQUFDLG1DQUFzQixDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDeEMsT0FBTzthQUNSO1lBRUQseUJBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDO1lBQ2pFLElBQU0sZUFBZSxvQkFBTyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7WUFFaEQsSUFBTSxNQUFNLEdBQUcsb0NBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7O2dCQUMxQyxLQUFxQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBL0IsSUFBTSxNQUFNLFdBQUE7b0JBQ2YsZUFBZSxDQUFDLElBQUksQ0FBQzt3QkFDbkIsUUFBUSxFQUFFLHVCQUFnQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7d0JBQzFDLEdBQUcsRUFBRSxDQUFDO3dCQUNOLEdBQUcsRUFBRSxDQUFDO3FCQUNQLENBQUMsQ0FBQztpQkFDSjs7Ozs7Ozs7O1lBRUQsRUFBRSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7WUFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEIsQ0FBQztRQUVEOzs7V0FHRztRQUNILHNDQUFRLEdBQVI7O1lBQ0UsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7O2dCQUNyQixLQUFpQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBekIsSUFBTSxFQUFFLFdBQUE7b0JBQ1gsSUFBSSxDQUFDLG9CQUFZLENBQUMsRUFBRSxDQUFDLEVBQUU7d0JBQ3JCLFNBQVM7cUJBQ1Y7b0JBRUQsSUFBTSxhQUFhLEdBQUcseUJBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDMUMsSUFBSSxhQUFhLENBQUMsdUJBQXVCLEtBQUssSUFBSSxFQUFFO3dCQUNsRCxFQUFFLENBQUMsZUFBZSxHQUFHLGFBQWEsQ0FBQyx1QkFBOEMsQ0FBQztxQkFDbkY7aUJBQ0Y7Ozs7Ozs7OztZQUNELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsQ0FBQztRQUNILDBCQUFDO0lBQUQsQ0FBQyxBQTlERCxJQThEQztJQTlEWSxrREFBbUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtpc05vbkRlY2xhcmF0aW9uVHNQYXRofSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtpc0V4dGVuZGVkIGFzIGlzRXh0ZW5kZWRTZiwgaXNTaGltLCBOZ0V4dGVuc2lvbiwgc2ZFeHRlbnNpb25EYXRhfSBmcm9tICcuL2V4cGFuZG8nO1xuaW1wb3J0IHttYWtlU2hpbUZpbGVOYW1lfSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIE1hbmlwdWxhdGVzIHRoZSBgcmVmZXJlbmNlZEZpbGVzYCBwcm9wZXJ0eSBvZiBgdHMuU291cmNlRmlsZWBzIHRvIGFkZCByZWZlcmVuY2VzIHRvIHNoaW0gZmlsZXNcbiAqIGZvciBlYWNoIG9yaWdpbmFsIHNvdXJjZSBmaWxlLCBjYXVzaW5nIHRoZSBzaGltcyB0byBiZSBsb2FkZWQgaW50byB0aGUgcHJvZ3JhbSBhcyB3ZWxsLlxuICpcbiAqIGBTaGltUmVmZXJlbmNlVGFnZ2VyYHMgYXJlIGludGVuZGVkIHRvIG9wZXJhdGUgZHVyaW5nIHByb2dyYW0gY3JlYXRpb24gb25seS5cbiAqL1xuZXhwb3J0IGNsYXNzIFNoaW1SZWZlcmVuY2VUYWdnZXIge1xuICBwcml2YXRlIHN1ZmZpeGVzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogVHJhY2tzIHdoaWNoIG9yaWdpbmFsIGZpbGVzIGhhdmUgYmVlbiBwcm9jZXNzZWQgYW5kIGhhZCBzaGltcyBnZW5lcmF0ZWQgaWYgbmVjZXNzYXJ5LlxuICAgKlxuICAgKiBUaGlzIGlzIHVzZWQgdG8gYXZvaWQgZ2VuZXJhdGluZyBzaGltcyB0d2ljZSBmb3IgdGhlIHNhbWUgZmlsZS5cbiAgICovXG4gIHByaXZhdGUgdGFnZ2VkID0gbmV3IFNldDx0cy5Tb3VyY2VGaWxlPigpO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHNoaW0gdGFnZ2luZyBpcyBjdXJyZW50bHkgYmVpbmcgcGVyZm9ybWVkLlxuICAgKi9cbiAgcHJpdmF0ZSBlbmFibGVkOiBib29sZWFuID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihzaGltRXh0ZW5zaW9uczogc3RyaW5nW10pIHtcbiAgICB0aGlzLnN1ZmZpeGVzID0gc2hpbUV4dGVuc2lvbnMubWFwKGV4dGVuc2lvbiA9PiBgLiR7ZXh0ZW5zaW9ufS50c2ApO1xuICB9XG5cbiAgLyoqXG4gICAqIFRhZyBgc2ZgIHdpdGggYW55IG5lZWRlZCByZWZlcmVuY2VzIGlmIGl0J3Mgbm90IGEgc2hpbSBpdHNlbGYuXG4gICAqL1xuICB0YWcoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCB8fCBzZi5pc0RlY2xhcmF0aW9uRmlsZSB8fCBpc1NoaW0oc2YpIHx8IHRoaXMudGFnZ2VkLmhhcyhzZikgfHxcbiAgICAgICAgIWlzTm9uRGVjbGFyYXRpb25Uc1BhdGgoc2YuZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2ZFeHRlbnNpb25EYXRhKHNmKS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcyA9IHNmLnJlZmVyZW5jZWRGaWxlcztcbiAgICBjb25zdCByZWZlcmVuY2VkRmlsZXMgPSBbLi4uc2YucmVmZXJlbmNlZEZpbGVzXTtcblxuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGZvciAoY29uc3Qgc3VmZml4IG9mIHRoaXMuc3VmZml4ZXMpIHtcbiAgICAgIHJlZmVyZW5jZWRGaWxlcy5wdXNoKHtcbiAgICAgICAgZmlsZU5hbWU6IG1ha2VTaGltRmlsZU5hbWUoc2ZQYXRoLCBzdWZmaXgpLFxuICAgICAgICBwb3M6IDAsXG4gICAgICAgIGVuZDogMCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHNmLnJlZmVyZW5jZWRGaWxlcyA9IHJlZmVyZW5jZWRGaWxlcztcbiAgICB0aGlzLnRhZ2dlZC5hZGQoc2YpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc3RvcmUgdGhlIG9yaWdpbmFsIGByZWZlcmVuY2VkRmlsZXNgIHZhbHVlcyBvZiBhbGwgdGFnZ2VkIGB0cy5Tb3VyY2VGaWxlYHMgYW5kIGRpc2FibGUgdGhlXG4gICAqIGBTaGltUmVmZXJlbmNlVGFnZ2VyYC5cbiAgICovXG4gIGZpbmFsaXplKCk6IHZvaWQge1xuICAgIHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50YWdnZWQpIHtcbiAgICAgIGlmICghaXNFeHRlbmRlZFNmKHNmKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZXh0ZW5zaW9uRGF0YSA9IHNmRXh0ZW5zaW9uRGF0YShzZik7XG4gICAgICBpZiAoZXh0ZW5zaW9uRGF0YS5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcyAhPT0gbnVsbCkge1xuICAgICAgICBzZi5yZWZlcmVuY2VkRmlsZXMgPSBleHRlbnNpb25EYXRhLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzISBhcyB0cy5GaWxlUmVmZXJlbmNlW107XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMudGFnZ2VkLmNsZWFyKCk7XG4gIH1cbn1cbiJdfQ==