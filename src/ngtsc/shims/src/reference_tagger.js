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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlX3RhZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL3JlZmVyZW5jZV90YWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBSUgsMkVBQXVFO0lBQ3ZFLGtGQUFpRTtJQUVqRSw2RUFBMkY7SUFDM0YsdUVBQXdDO0lBRXhDOzs7OztPQUtHO0lBQ0g7UUFlRSw2QkFBWSxjQUF3QjtZQVpwQzs7OztlQUlHO1lBQ0ssV0FBTSxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBRTFDOztlQUVHO1lBQ0ssWUFBTyxHQUFZLElBQUksQ0FBQztZQUc5QixJQUFJLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxNQUFJLFNBQVMsUUFBSyxFQUFsQixDQUFrQixDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVEOztXQUVHO1FBQ0gsaUNBQUcsR0FBSCxVQUFJLEVBQWlCOztZQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsaUJBQWlCLElBQUksZ0JBQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFFLENBQUMsbUNBQXNCLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN4QyxPQUFPO2FBQ1I7WUFFRCx5QkFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUM7WUFDakUsSUFBTSxlQUFlLG9CQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUVoRCxJQUFNLE1BQU0sR0FBRyxvQ0FBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQzs7Z0JBQzFDLEtBQXFCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFBLGdCQUFBLDRCQUFFO29CQUEvQixJQUFNLE1BQU0sV0FBQTtvQkFDZixlQUFlLENBQUMsSUFBSSxDQUFDO3dCQUNuQixRQUFRLEVBQUUsdUJBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQzt3QkFDMUMsR0FBRyxFQUFFLENBQUM7d0JBQ04sR0FBRyxFQUFFLENBQUM7cUJBQ1AsQ0FBQyxDQUFDO2lCQUNKOzs7Ozs7Ozs7WUFFRCxFQUFFLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztZQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBRUQ7OztXQUdHO1FBQ0gsc0NBQVEsR0FBUjs7WUFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQzs7Z0JBQ3JCLEtBQWlCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFBLGdCQUFBLDRCQUFFO29CQUF6QixJQUFNLEVBQUUsV0FBQTtvQkFDWCxJQUFJLENBQUMsb0JBQVksQ0FBQyxFQUFFLENBQUMsRUFBRTt3QkFDckIsU0FBUztxQkFDVjtvQkFFRCxJQUFNLGFBQWEsR0FBRyx5QkFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUMxQyxJQUFJLGFBQWEsQ0FBQyx1QkFBdUIsS0FBSyxJQUFJLEVBQUU7d0JBQ2xELEVBQUUsQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFDLHVCQUE4QyxDQUFDO3FCQUNuRjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixDQUFDO1FBQ0gsMEJBQUM7SUFBRCxDQUFDLEFBOURELElBOERDO0lBOURZLGtEQUFtQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2lzTm9uRGVjbGFyYXRpb25Uc1BhdGh9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lzRXh0ZW5kZWQgYXMgaXNFeHRlbmRlZFNmLCBpc1NoaW0sIE5nRXh0ZW5zaW9uLCBzZkV4dGVuc2lvbkRhdGF9IGZyb20gJy4vZXhwYW5kbyc7XG5pbXBvcnQge21ha2VTaGltRmlsZU5hbWV9IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogTWFuaXB1bGF0ZXMgdGhlIGByZWZlcmVuY2VkRmlsZXNgIHByb3BlcnR5IG9mIGB0cy5Tb3VyY2VGaWxlYHMgdG8gYWRkIHJlZmVyZW5jZXMgdG8gc2hpbSBmaWxlc1xuICogZm9yIGVhY2ggb3JpZ2luYWwgc291cmNlIGZpbGUsIGNhdXNpbmcgdGhlIHNoaW1zIHRvIGJlIGxvYWRlZCBpbnRvIHRoZSBwcm9ncmFtIGFzIHdlbGwuXG4gKlxuICogYFNoaW1SZWZlcmVuY2VUYWdnZXJgcyBhcmUgaW50ZW5kZWQgdG8gb3BlcmF0ZSBkdXJpbmcgcHJvZ3JhbSBjcmVhdGlvbiBvbmx5LlxuICovXG5leHBvcnQgY2xhc3MgU2hpbVJlZmVyZW5jZVRhZ2dlciB7XG4gIHByaXZhdGUgc3VmZml4ZXM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hpY2ggb3JpZ2luYWwgZmlsZXMgaGF2ZSBiZWVuIHByb2Nlc3NlZCBhbmQgaGFkIHNoaW1zIGdlbmVyYXRlZCBpZiBuZWNlc3NhcnkuXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCB0byBhdm9pZCBnZW5lcmF0aW5nIHNoaW1zIHR3aWNlIGZvciB0aGUgc2FtZSBmaWxlLlxuICAgKi9cbiAgcHJpdmF0ZSB0YWdnZWQgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgc2hpbSB0YWdnaW5nIGlzIGN1cnJlbnRseSBiZWluZyBwZXJmb3JtZWQuXG4gICAqL1xuICBwcml2YXRlIGVuYWJsZWQ6IGJvb2xlYW4gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKHNoaW1FeHRlbnNpb25zOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuc3VmZml4ZXMgPSBzaGltRXh0ZW5zaW9ucy5tYXAoZXh0ZW5zaW9uID0+IGAuJHtleHRlbnNpb259LnRzYCk7XG4gIH1cblxuICAvKipcbiAgICogVGFnIGBzZmAgd2l0aCBhbnkgbmVlZGVkIHJlZmVyZW5jZXMgaWYgaXQncyBub3QgYSBzaGltIGl0c2VsZi5cbiAgICovXG4gIHRhZyhzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lbmFibGVkIHx8IHNmLmlzRGVjbGFyYXRpb25GaWxlIHx8IGlzU2hpbShzZikgfHwgdGhpcy50YWdnZWQuaGFzKHNmKSB8fFxuICAgICAgICAhaXNOb25EZWNsYXJhdGlvblRzUGF0aChzZi5maWxlTmFtZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzZkV4dGVuc2lvbkRhdGEoc2YpLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzID0gc2YucmVmZXJlbmNlZEZpbGVzO1xuICAgIGNvbnN0IHJlZmVyZW5jZWRGaWxlcyA9IFsuLi5zZi5yZWZlcmVuY2VkRmlsZXNdO1xuXG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgZm9yIChjb25zdCBzdWZmaXggb2YgdGhpcy5zdWZmaXhlcykge1xuICAgICAgcmVmZXJlbmNlZEZpbGVzLnB1c2goe1xuICAgICAgICBmaWxlTmFtZTogbWFrZVNoaW1GaWxlTmFtZShzZlBhdGgsIHN1ZmZpeCksXG4gICAgICAgIHBvczogMCxcbiAgICAgICAgZW5kOiAwLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2YucmVmZXJlbmNlZEZpbGVzID0gcmVmZXJlbmNlZEZpbGVzO1xuICAgIHRoaXMudGFnZ2VkLmFkZChzZik7XG4gIH1cblxuICAvKipcbiAgICogUmVzdG9yZSB0aGUgb3JpZ2luYWwgYHJlZmVyZW5jZWRGaWxlc2AgdmFsdWVzIG9mIGFsbCB0YWdnZWQgYHRzLlNvdXJjZUZpbGVgcyBhbmQgZGlzYWJsZSB0aGVcbiAgICogYFNoaW1SZWZlcmVuY2VUYWdnZXJgLlxuICAgKi9cbiAgZmluYWxpemUoKTogdm9pZCB7XG4gICAgdGhpcy5lbmFibGVkID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBzZiBvZiB0aGlzLnRhZ2dlZCkge1xuICAgICAgaWYgKCFpc0V4dGVuZGVkU2Yoc2YpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBleHRlbnNpb25EYXRhID0gc2ZFeHRlbnNpb25EYXRhKHNmKTtcbiAgICAgIGlmIChleHRlbnNpb25EYXRhLm9yaWdpbmFsUmVmZXJlbmNlZEZpbGVzICE9PSBudWxsKSB7XG4gICAgICAgIHNmLnJlZmVyZW5jZWRGaWxlcyA9IGV4dGVuc2lvbkRhdGEub3JpZ2luYWxSZWZlcmVuY2VkRmlsZXMhIGFzIHRzLkZpbGVSZWZlcmVuY2VbXTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy50YWdnZWQuY2xlYXIoKTtcbiAgfVxufVxuIl19