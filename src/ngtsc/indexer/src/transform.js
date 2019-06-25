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
        define("@angular/compiler-cli/src/ngtsc/indexer/src/transform", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Generates `IndexedComponent` entries from a `IndexingContext`, which has information
     * about components discovered in the program registered in it.
     *
     * The context must be populated before `generateAnalysis` is called.
     */
    function generateAnalysis(context) {
        throw new Error('Method not implemented.');
    }
    exports.generateAnalysis = generateAnalysis;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmRleGVyL3NyYy90cmFuc2Zvcm0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFNSDs7Ozs7T0FLRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLE9BQXdCO1FBQ3ZELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRkQsNENBRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtJbmRleGVkQ29tcG9uZW50fSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0luZGV4aW5nQ29udGV4dH0gZnJvbSAnLi9jb250ZXh0JztcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYEluZGV4ZWRDb21wb25lbnRgIGVudHJpZXMgZnJvbSBhIGBJbmRleGluZ0NvbnRleHRgLCB3aGljaCBoYXMgaW5mb3JtYXRpb25cbiAqIGFib3V0IGNvbXBvbmVudHMgZGlzY292ZXJlZCBpbiB0aGUgcHJvZ3JhbSByZWdpc3RlcmVkIGluIGl0LlxuICpcbiAqIFRoZSBjb250ZXh0IG11c3QgYmUgcG9wdWxhdGVkIGJlZm9yZSBgZ2VuZXJhdGVBbmFseXNpc2AgaXMgY2FsbGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBbmFseXNpcyhjb250ZXh0OiBJbmRleGluZ0NvbnRleHQpOiBNYXA8dHMuRGVjbGFyYXRpb24sIEluZGV4ZWRDb21wb25lbnQ+IHtcbiAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xufVxuIl19