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
        define("@angular/compiler-cli/src/ngtsc/shims/src/util", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.generatedModuleName = exports.makeShimFileName = void 0;
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var TS_EXTENSIONS = /\.tsx?$/i;
    /**
     * Replace the .ts or .tsx extension of a file with the shim filename suffix.
     */
    function makeShimFileName(fileName, suffix) {
        return (0, file_system_1.absoluteFrom)(fileName.replace(TS_EXTENSIONS, suffix));
    }
    exports.makeShimFileName = makeShimFileName;
    function generatedModuleName(originalModuleName, originalFileName, genSuffix) {
        var moduleName;
        if (originalFileName.endsWith('/index.ts')) {
            moduleName = originalModuleName + '/index' + genSuffix;
        }
        else {
            moduleName = originalModuleName + genSuffix;
        }
        return moduleName;
    }
    exports.generatedModuleName = generatedModuleName;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsMkVBQStEO0lBRS9ELElBQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQztJQUVqQzs7T0FFRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLFFBQXdCLEVBQUUsTUFBYztRQUN2RSxPQUFPLElBQUEsMEJBQVksRUFBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFGRCw0Q0FFQztJQUVELFNBQWdCLG1CQUFtQixDQUMvQixrQkFBMEIsRUFBRSxnQkFBd0IsRUFBRSxTQUFpQjtRQUN6RSxJQUFJLFVBQWtCLENBQUM7UUFDdkIsSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDMUMsVUFBVSxHQUFHLGtCQUFrQixHQUFHLFFBQVEsR0FBRyxTQUFTLENBQUM7U0FDeEQ7YUFBTTtZQUNMLFVBQVUsR0FBRyxrQkFBa0IsR0FBRyxTQUFTLENBQUM7U0FDN0M7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBVkQsa0RBVUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIEFic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5cbmNvbnN0IFRTX0VYVEVOU0lPTlMgPSAvXFwudHN4PyQvaTtcblxuLyoqXG4gKiBSZXBsYWNlIHRoZSAudHMgb3IgLnRzeCBleHRlbnNpb24gb2YgYSBmaWxlIHdpdGggdGhlIHNoaW0gZmlsZW5hbWUgc3VmZml4LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFrZVNoaW1GaWxlTmFtZShmaWxlTmFtZTogQWJzb2x1dGVGc1BhdGgsIHN1ZmZpeDogc3RyaW5nKTogQWJzb2x1dGVGc1BhdGgge1xuICByZXR1cm4gYWJzb2x1dGVGcm9tKGZpbGVOYW1lLnJlcGxhY2UoVFNfRVhURU5TSU9OUywgc3VmZml4KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZWRNb2R1bGVOYW1lKFxuICAgIG9yaWdpbmFsTW9kdWxlTmFtZTogc3RyaW5nLCBvcmlnaW5hbEZpbGVOYW1lOiBzdHJpbmcsIGdlblN1ZmZpeDogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IG1vZHVsZU5hbWU6IHN0cmluZztcbiAgaWYgKG9yaWdpbmFsRmlsZU5hbWUuZW5kc1dpdGgoJy9pbmRleC50cycpKSB7XG4gICAgbW9kdWxlTmFtZSA9IG9yaWdpbmFsTW9kdWxlTmFtZSArICcvaW5kZXgnICsgZ2VuU3VmZml4O1xuICB9IGVsc2Uge1xuICAgIG1vZHVsZU5hbWUgPSBvcmlnaW5hbE1vZHVsZU5hbWUgKyBnZW5TdWZmaXg7XG4gIH1cblxuICByZXR1cm4gbW9kdWxlTmFtZTtcbn1cbiJdfQ==