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
        define("@angular/compiler-cli/src/ngcc/src/host/dts_mapper", ["require", "exports", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path_1 = require("path");
    /**
     * Map source files to their associated typings definitions files.
     */
    var DtsMapper = /** @class */ (function () {
        function DtsMapper(sourceRoot, dtsRoot) {
            this.sourceRoot = sourceRoot;
            this.dtsRoot = dtsRoot;
        }
        /**
         * Given the absolute path to a source file, return the absolute path to the corresponding `.d.ts`
         * file. Assume that source files and `.d.ts` files have the same directory layout and the names
         * of the `.d.ts` files can be derived by replacing the `.js` extension of the source file with
         * `.d.ts`.
         *
         * @param sourceFileName The absolute path to the source file whose corresponding `.d.ts` file
         *     should be returned.
         *
         * @returns The absolute path to the `.d.ts` file that corresponds to the specified source file.
         */
        DtsMapper.prototype.getDtsFileNameFor = function (sourceFileName) {
            var relativeSourcePath = path_1.relative(this.sourceRoot, sourceFileName);
            return path_1.resolve(this.dtsRoot, relativeSourcePath).replace(/\.js$/, '.d.ts');
        };
        return DtsMapper;
    }());
    exports.DtsMapper = DtsMapper;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzX21hcHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvaG9zdC9kdHNfbWFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsNkJBQXVDO0lBRXZDOztPQUVHO0lBQ0g7UUFDRSxtQkFBb0IsVUFBa0IsRUFBVSxPQUFlO1lBQTNDLGVBQVUsR0FBVixVQUFVLENBQVE7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQUcsQ0FBQztRQUVuRTs7Ozs7Ozs7OztXQVVHO1FBQ0gscUNBQWlCLEdBQWpCLFVBQWtCLGNBQXNCO1lBQ3RDLElBQU0sa0JBQWtCLEdBQUcsZUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDckUsT0FBTyxjQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUNILGdCQUFDO0lBQUQsQ0FBQyxBQWxCRCxJQWtCQztJQWxCWSw4QkFBUyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtyZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5cbi8qKlxuICogTWFwIHNvdXJjZSBmaWxlcyB0byB0aGVpciBhc3NvY2lhdGVkIHR5cGluZ3MgZGVmaW5pdGlvbnMgZmlsZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdHNNYXBwZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHNvdXJjZVJvb3Q6IHN0cmluZywgcHJpdmF0ZSBkdHNSb290OiBzdHJpbmcpIHt9XG5cbiAgLyoqXG4gICAqIEdpdmVuIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIGEgc291cmNlIGZpbGUsIHJldHVybiB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgY29ycmVzcG9uZGluZyBgLmQudHNgXG4gICAqIGZpbGUuIEFzc3VtZSB0aGF0IHNvdXJjZSBmaWxlcyBhbmQgYC5kLnRzYCBmaWxlcyBoYXZlIHRoZSBzYW1lIGRpcmVjdG9yeSBsYXlvdXQgYW5kIHRoZSBuYW1lc1xuICAgKiBvZiB0aGUgYC5kLnRzYCBmaWxlcyBjYW4gYmUgZGVyaXZlZCBieSByZXBsYWNpbmcgdGhlIGAuanNgIGV4dGVuc2lvbiBvZiB0aGUgc291cmNlIGZpbGUgd2l0aFxuICAgKiBgLmQudHNgLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRmlsZU5hbWUgVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHNvdXJjZSBmaWxlIHdob3NlIGNvcnJlc3BvbmRpbmcgYC5kLnRzYCBmaWxlXG4gICAqICAgICBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBgLmQudHNgIGZpbGUgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgc3BlY2lmaWVkIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgZ2V0RHRzRmlsZU5hbWVGb3Ioc291cmNlRmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVsYXRpdmVTb3VyY2VQYXRoID0gcmVsYXRpdmUodGhpcy5zb3VyY2VSb290LCBzb3VyY2VGaWxlTmFtZSk7XG4gICAgcmV0dXJuIHJlc29sdmUodGhpcy5kdHNSb290LCByZWxhdGl2ZVNvdXJjZVBhdGgpLnJlcGxhY2UoL1xcLmpzJC8sICcuZC50cycpO1xuICB9XG59XG4iXX0=