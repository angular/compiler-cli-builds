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
            if (!this.enabled || sf.isDeclarationFile || (0, expando_1.isShim)(sf) || this.tagged.has(sf) ||
                !(0, typescript_1.isNonDeclarationTsPath)(sf.fileName)) {
                return;
            }
            var ext = (0, expando_1.sfExtensionData)(sf);
            // If this file has never been tagged before, capture its `referencedFiles` in the extension
            // data.
            if (ext.originalReferencedFiles === null) {
                ext.originalReferencedFiles = sf.referencedFiles;
            }
            var referencedFiles = (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(ext.originalReferencedFiles), false);
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
            try {
                for (var _b = (0, tslib_1.__values)(this.suffixes), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var suffix = _c.value;
                    referencedFiles.push({
                        fileName: (0, util_1.makeShimFileName)(sfPath, suffix),
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
            ext.taggedReferenceFiles = referencedFiles;
            sf.referencedFiles = referencedFiles;
            this.tagged.add(sf);
        };
        /**
         * Disable the `ShimReferenceTagger` and free memory associated with tracking tagged files.
         */
        ShimReferenceTagger.prototype.finalize = function () {
            this.enabled = false;
            this.tagged.clear();
        };
        return ShimReferenceTagger;
    }());
    exports.ShimReferenceTagger = ShimReferenceTagger;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlX3RhZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL3JlZmVyZW5jZV90YWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUlILDJFQUF5RDtJQUN6RCxrRkFBaUU7SUFFakUsNkVBQWtEO0lBQ2xELHVFQUF3QztJQUV4Qzs7Ozs7T0FLRztJQUNIO1FBZUUsNkJBQVksY0FBd0I7WUFacEM7Ozs7ZUFJRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUUxQzs7ZUFFRztZQUNLLFlBQU8sR0FBWSxJQUFJLENBQUM7WUFHOUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsTUFBSSxTQUFTLFFBQUssRUFBbEIsQ0FBa0IsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRDs7V0FFRztRQUNILGlDQUFHLEdBQUgsVUFBSSxFQUFpQjs7WUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLGlCQUFpQixJQUFJLElBQUEsZ0JBQU0sRUFBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFFLENBQUMsSUFBQSxtQ0FBc0IsRUFBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3hDLE9BQU87YUFDUjtZQUVELElBQU0sR0FBRyxHQUFHLElBQUEseUJBQWUsRUFBQyxFQUFFLENBQUMsQ0FBQztZQUVoQyw0RkFBNEY7WUFDNUYsUUFBUTtZQUNSLElBQUksR0FBRyxDQUFDLHVCQUF1QixLQUFLLElBQUksRUFBRTtnQkFDeEMsR0FBRyxDQUFDLHVCQUF1QixHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUM7YUFDbEQ7WUFFRCxJQUFNLGVBQWUsc0RBQU8sR0FBRyxDQUFDLHVCQUF1QixTQUFDLENBQUM7WUFHekQsSUFBTSxNQUFNLEdBQUcsSUFBQSxvQ0FBc0IsRUFBQyxFQUFFLENBQUMsQ0FBQzs7Z0JBQzFDLEtBQXFCLElBQUEsS0FBQSxzQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFBLGdCQUFBLDRCQUFFO29CQUEvQixJQUFNLE1BQU0sV0FBQTtvQkFDZixlQUFlLENBQUMsSUFBSSxDQUFDO3dCQUNuQixRQUFRLEVBQUUsSUFBQSx1QkFBZ0IsRUFBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO3dCQUMxQyxHQUFHLEVBQUUsQ0FBQzt3QkFDTixHQUFHLEVBQUUsQ0FBQztxQkFDUCxDQUFDLENBQUM7aUJBQ0o7Ozs7Ozs7OztZQUVELEdBQUcsQ0FBQyxvQkFBb0IsR0FBRyxlQUFlLENBQUM7WUFDM0MsRUFBRSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7WUFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEIsQ0FBQztRQUVEOztXQUVHO1FBQ0gsc0NBQVEsR0FBUjtZQUNFLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsQ0FBQztRQUNILDBCQUFDO0lBQUQsQ0FBQyxBQTVERCxJQTREQztJQTVEWSxrREFBbUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtpc05vbkRlY2xhcmF0aW9uVHNQYXRofSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtpc1NoaW0sIHNmRXh0ZW5zaW9uRGF0YX0gZnJvbSAnLi9leHBhbmRvJztcbmltcG9ydCB7bWFrZVNoaW1GaWxlTmFtZX0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBNYW5pcHVsYXRlcyB0aGUgYHJlZmVyZW5jZWRGaWxlc2AgcHJvcGVydHkgb2YgYHRzLlNvdXJjZUZpbGVgcyB0byBhZGQgcmVmZXJlbmNlcyB0byBzaGltIGZpbGVzXG4gKiBmb3IgZWFjaCBvcmlnaW5hbCBzb3VyY2UgZmlsZSwgY2F1c2luZyB0aGUgc2hpbXMgdG8gYmUgbG9hZGVkIGludG8gdGhlIHByb2dyYW0gYXMgd2VsbC5cbiAqXG4gKiBgU2hpbVJlZmVyZW5jZVRhZ2dlcmBzIGFyZSBpbnRlbmRlZCB0byBvcGVyYXRlIGR1cmluZyBwcm9ncmFtIGNyZWF0aW9uIG9ubHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBTaGltUmVmZXJlbmNlVGFnZ2VyIHtcbiAgcHJpdmF0ZSBzdWZmaXhlczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB3aGljaCBvcmlnaW5hbCBmaWxlcyBoYXZlIGJlZW4gcHJvY2Vzc2VkIGFuZCBoYWQgc2hpbXMgZ2VuZXJhdGVkIGlmIG5lY2Vzc2FyeS5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIHRvIGF2b2lkIGdlbmVyYXRpbmcgc2hpbXMgdHdpY2UgZm9yIHRoZSBzYW1lIGZpbGUuXG4gICAqL1xuICBwcml2YXRlIHRhZ2dlZCA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcblxuICAvKipcbiAgICogV2hldGhlciBzaGltIHRhZ2dpbmcgaXMgY3VycmVudGx5IGJlaW5nIHBlcmZvcm1lZC5cbiAgICovXG4gIHByaXZhdGUgZW5hYmxlZDogYm9vbGVhbiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3Ioc2hpbUV4dGVuc2lvbnM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5zdWZmaXhlcyA9IHNoaW1FeHRlbnNpb25zLm1hcChleHRlbnNpb24gPT4gYC4ke2V4dGVuc2lvbn0udHNgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWcgYHNmYCB3aXRoIGFueSBuZWVkZWQgcmVmZXJlbmNlcyBpZiBpdCdzIG5vdCBhIHNoaW0gaXRzZWxmLlxuICAgKi9cbiAgdGFnKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQgfHwgc2YuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaXNTaGltKHNmKSB8fCB0aGlzLnRhZ2dlZC5oYXMoc2YpIHx8XG4gICAgICAgICFpc05vbkRlY2xhcmF0aW9uVHNQYXRoKHNmLmZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGV4dCA9IHNmRXh0ZW5zaW9uRGF0YShzZik7XG5cbiAgICAvLyBJZiB0aGlzIGZpbGUgaGFzIG5ldmVyIGJlZW4gdGFnZ2VkIGJlZm9yZSwgY2FwdHVyZSBpdHMgYHJlZmVyZW5jZWRGaWxlc2AgaW4gdGhlIGV4dGVuc2lvblxuICAgIC8vIGRhdGEuXG4gICAgaWYgKGV4dC5vcmlnaW5hbFJlZmVyZW5jZWRGaWxlcyA9PT0gbnVsbCkge1xuICAgICAgZXh0Lm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzID0gc2YucmVmZXJlbmNlZEZpbGVzO1xuICAgIH1cblxuICAgIGNvbnN0IHJlZmVyZW5jZWRGaWxlcyA9IFsuLi5leHQub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXNdO1xuXG5cbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICBmb3IgKGNvbnN0IHN1ZmZpeCBvZiB0aGlzLnN1ZmZpeGVzKSB7XG4gICAgICByZWZlcmVuY2VkRmlsZXMucHVzaCh7XG4gICAgICAgIGZpbGVOYW1lOiBtYWtlU2hpbUZpbGVOYW1lKHNmUGF0aCwgc3VmZml4KSxcbiAgICAgICAgcG9zOiAwLFxuICAgICAgICBlbmQ6IDAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBleHQudGFnZ2VkUmVmZXJlbmNlRmlsZXMgPSByZWZlcmVuY2VkRmlsZXM7XG4gICAgc2YucmVmZXJlbmNlZEZpbGVzID0gcmVmZXJlbmNlZEZpbGVzO1xuICAgIHRoaXMudGFnZ2VkLmFkZChzZik7XG4gIH1cblxuICAvKipcbiAgICogRGlzYWJsZSB0aGUgYFNoaW1SZWZlcmVuY2VUYWdnZXJgIGFuZCBmcmVlIG1lbW9yeSBhc3NvY2lhdGVkIHdpdGggdHJhY2tpbmcgdGFnZ2VkIGZpbGVzLlxuICAgKi9cbiAgZmluYWxpemUoKTogdm9pZCB7XG4gICAgdGhpcy5lbmFibGVkID0gZmFsc2U7XG4gICAgdGhpcy50YWdnZWQuY2xlYXIoKTtcbiAgfVxufVxuIl19