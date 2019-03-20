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
        define("@angular/compiler-cli/ngcc", ["require", "exports", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/main"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var main_1 = require("@angular/compiler-cli/ngcc/src/main");
    exports.process = main_1.mainNgcc;
    function hasBeenProcessed(packageJson, format) {
        // We are wrapping this function to hide the internal types.
        return build_marker_1.hasBeenProcessed(packageJson, format);
    }
    exports.hasBeenProcessed = hasBeenProcessed;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHFGQUFrRjtJQUdsRiw0REFBNEQ7SUFBdkMseUJBQUEsUUFBUSxDQUFXO0lBRXhDLFNBQWdCLGdCQUFnQixDQUFDLFdBQW1CLEVBQUUsTUFBYztRQUNsRSw0REFBNEQ7UUFDNUQsT0FBTywrQkFBaUIsQ0FBQyxXQUFvQyxFQUFFLE1BQWdDLENBQUMsQ0FBQztJQUNuRyxDQUFDO0lBSEQsNENBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZCBhcyBfaGFzQmVlblByb2Nlc3NlZH0gZnJvbSAnLi9zcmMvcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludFBhY2thZ2VKc29ufSBmcm9tICcuL3NyYy9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5cbmV4cG9ydCB7TmdjY09wdGlvbnMsIG1haW5OZ2NjIGFzIHByb2Nlc3N9IGZyb20gJy4vc3JjL21haW4nO1xuXG5leHBvcnQgZnVuY3Rpb24gaGFzQmVlblByb2Nlc3NlZChwYWNrYWdlSnNvbjogb2JqZWN0LCBmb3JtYXQ6IHN0cmluZykge1xuICAvLyBXZSBhcmUgd3JhcHBpbmcgdGhpcyBmdW5jdGlvbiB0byBoaWRlIHRoZSBpbnRlcm5hbCB0eXBlcy5cbiAgcmV0dXJuIF9oYXNCZWVuUHJvY2Vzc2VkKHBhY2thZ2VKc29uIGFzIEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgZm9ybWF0IGFzIEVudHJ5UG9pbnRKc29uUHJvcGVydHkpO1xufVxuIl19