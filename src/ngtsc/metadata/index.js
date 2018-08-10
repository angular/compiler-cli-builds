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
        define("@angular/compiler-cli/src/ngtsc/metadata", ["require", "exports", "@angular/compiler-cli/src/ngtsc/metadata/src/reflector", "@angular/compiler-cli/src/ngtsc/metadata/src/resolver"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var reflector_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/reflector");
    exports.TypeScriptReflectionHost = reflector_1.TypeScriptReflectionHost;
    exports.filterToMembersWithDecorator = reflector_1.filterToMembersWithDecorator;
    exports.findMember = reflector_1.findMember;
    exports.reflectObjectLiteral = reflector_1.reflectObjectLiteral;
    exports.reflectTypeEntityToDeclaration = reflector_1.reflectTypeEntityToDeclaration;
    var resolver_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/resolver");
    exports.AbsoluteReference = resolver_1.AbsoluteReference;
    exports.ImportMode = resolver_1.ImportMode;
    exports.Reference = resolver_1.Reference;
    exports.ResolvedReference = resolver_1.ResolvedReference;
    exports.isDynamicValue = resolver_1.isDynamicValue;
    exports.staticallyResolve = resolver_1.staticallyResolve;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsb0ZBQXlKO0lBQWpKLCtDQUFBLHdCQUF3QixDQUFBO0lBQUUsbURBQUEsNEJBQTRCLENBQUE7SUFBRSxpQ0FBQSxVQUFVLENBQUE7SUFBRSwyQ0FBQSxvQkFBb0IsQ0FBQTtJQUFFLHFEQUFBLDhCQUE4QixDQUFBO0lBQ2hJLGtGQUE2STtJQUFySSx1Q0FBQSxpQkFBaUIsQ0FBQTtJQUFFLGdDQUFBLFVBQVUsQ0FBQTtJQUFFLCtCQUFBLFNBQVMsQ0FBQTtJQUFFLHVDQUFBLGlCQUFpQixDQUFBO0lBQWlCLG9DQUFBLGNBQWMsQ0FBQTtJQUFFLHVDQUFBLGlCQUFpQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5leHBvcnQge1R5cGVTY3JpcHRSZWZsZWN0aW9uSG9zdCwgZmlsdGVyVG9NZW1iZXJzV2l0aERlY29yYXRvciwgZmluZE1lbWJlciwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHJlZmxlY3RUeXBlRW50aXR5VG9EZWNsYXJhdGlvbn0gZnJvbSAnLi9zcmMvcmVmbGVjdG9yJztcbmV4cG9ydCB7QWJzb2x1dGVSZWZlcmVuY2UsIEltcG9ydE1vZGUsIFJlZmVyZW5jZSwgUmVzb2x2ZWRSZWZlcmVuY2UsIFJlc29sdmVkVmFsdWUsIGlzRHluYW1pY1ZhbHVlLCBzdGF0aWNhbGx5UmVzb2x2ZX0gZnJvbSAnLi9zcmMvcmVzb2x2ZXInO1xuIl19