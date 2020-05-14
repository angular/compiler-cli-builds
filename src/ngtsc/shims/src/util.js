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
        return file_system_1.absoluteFrom(fileName.replace(TS_EXTENSIONS, suffix));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2Mvc2hpbXMvc3JjL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsMkVBQStEO0lBRS9ELElBQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQztJQUVqQzs7T0FFRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLFFBQXdCLEVBQUUsTUFBYztRQUN2RSxPQUFPLDBCQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRkQsNENBRUM7SUFFRCxTQUFnQixtQkFBbUIsQ0FDL0Isa0JBQTBCLEVBQUUsZ0JBQXdCLEVBQUUsU0FBaUI7UUFDekUsSUFBSSxVQUFrQixDQUFDO1FBQ3ZCLElBQUksZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQzFDLFVBQVUsR0FBRyxrQkFBa0IsR0FBRyxRQUFRLEdBQUcsU0FBUyxDQUFDO1NBQ3hEO2FBQU07WUFDTCxVQUFVLEdBQUcsa0JBQWtCLEdBQUcsU0FBUyxDQUFDO1NBQzdDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztJQVZELGtEQVVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbSwgQWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcblxuY29uc3QgVFNfRVhURU5TSU9OUyA9IC9cXC50c3g/JC9pO1xuXG4vKipcbiAqIFJlcGxhY2UgdGhlIC50cyBvciAudHN4IGV4dGVuc2lvbiBvZiBhIGZpbGUgd2l0aCB0aGUgc2hpbSBmaWxlbmFtZSBzdWZmaXguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlU2hpbUZpbGVOYW1lKGZpbGVOYW1lOiBBYnNvbHV0ZUZzUGF0aCwgc3VmZml4OiBzdHJpbmcpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gIHJldHVybiBhYnNvbHV0ZUZyb20oZmlsZU5hbWUucmVwbGFjZShUU19FWFRFTlNJT05TLCBzdWZmaXgpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlZE1vZHVsZU5hbWUoXG4gICAgb3JpZ2luYWxNb2R1bGVOYW1lOiBzdHJpbmcsIG9yaWdpbmFsRmlsZU5hbWU6IHN0cmluZywgZ2VuU3VmZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgbW9kdWxlTmFtZTogc3RyaW5nO1xuICBpZiAob3JpZ2luYWxGaWxlTmFtZS5lbmRzV2l0aCgnL2luZGV4LnRzJykpIHtcbiAgICBtb2R1bGVOYW1lID0gb3JpZ2luYWxNb2R1bGVOYW1lICsgJy9pbmRleCcgKyBnZW5TdWZmaXg7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlTmFtZSA9IG9yaWdpbmFsTW9kdWxlTmFtZSArIGdlblN1ZmZpeDtcbiAgfVxuXG4gIHJldHVybiBtb2R1bGVOYW1lO1xufVxuIl19