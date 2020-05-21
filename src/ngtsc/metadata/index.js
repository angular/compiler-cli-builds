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
        define("@angular/compiler-cli/src/ngtsc/metadata", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/metadata/src/api", "@angular/compiler-cli/src/ngtsc/metadata/src/dts", "@angular/compiler-cli/src/ngtsc/metadata/src/registry", "@angular/compiler-cli/src/ngtsc/metadata/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    tslib_1.__exportStar(require("@angular/compiler-cli/src/ngtsc/metadata/src/api"), exports);
    var dts_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/dts");
    Object.defineProperty(exports, "DtsMetadataReader", { enumerable: true, get: function () { return dts_1.DtsMetadataReader; } });
    var registry_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/registry");
    Object.defineProperty(exports, "CompoundMetadataRegistry", { enumerable: true, get: function () { return registry_1.CompoundMetadataRegistry; } });
    Object.defineProperty(exports, "LocalMetadataRegistry", { enumerable: true, get: function () { return registry_1.LocalMetadataRegistry; } });
    Object.defineProperty(exports, "InjectableClassRegistry", { enumerable: true, get: function () { return registry_1.InjectableClassRegistry; } });
    var util_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/util");
    Object.defineProperty(exports, "extractDirectiveGuards", { enumerable: true, get: function () { return util_1.extractDirectiveGuards; } });
    Object.defineProperty(exports, "CompoundMetadataReader", { enumerable: true, get: function () { return util_1.CompoundMetadataReader; } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDJGQUEwQjtJQUMxQix3RUFBNEM7SUFBcEMsd0dBQUEsaUJBQWlCLE9BQUE7SUFDekIsa0ZBQXdHO0lBQWhHLG9IQUFBLHdCQUF3QixPQUFBO0lBQUUsaUhBQUEscUJBQXFCLE9BQUE7SUFBRSxtSEFBQSx1QkFBdUIsT0FBQTtJQUNoRiwwRUFBMEU7SUFBbEUsOEdBQUEsc0JBQXNCLE9BQUE7SUFBRSw4R0FBQSxzQkFBc0IsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuZXhwb3J0ICogZnJvbSAnLi9zcmMvYXBpJztcbmV4cG9ydCB7RHRzTWV0YWRhdGFSZWFkZXJ9IGZyb20gJy4vc3JjL2R0cyc7XG5leHBvcnQge0NvbXBvdW5kTWV0YWRhdGFSZWdpc3RyeSwgTG9jYWxNZXRhZGF0YVJlZ2lzdHJ5LCBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeX0gZnJvbSAnLi9zcmMvcmVnaXN0cnknO1xuZXhwb3J0IHtleHRyYWN0RGlyZWN0aXZlR3VhcmRzLCBDb21wb3VuZE1ldGFkYXRhUmVhZGVyfSBmcm9tICcuL3NyYy91dGlsJztcbiJdfQ==