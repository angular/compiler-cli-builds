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
    exports.reflectConstructorParameters = reflector_1.reflectConstructorParameters;
    exports.reflectDecorator = reflector_1.reflectDecorator;
    exports.reflectNonStaticField = reflector_1.reflectNonStaticField;
    exports.reflectObjectLiteral = reflector_1.reflectObjectLiteral;
    exports.reflectStaticField = reflector_1.reflectStaticField;
    exports.reflectTypeEntityToDeclaration = reflector_1.reflectTypeEntityToDeclaration;
    var resolver_1 = require("@angular/compiler-cli/src/ngtsc/metadata/src/resolver");
    exports.AbsoluteReference = resolver_1.AbsoluteReference;
    exports.Reference = resolver_1.Reference;
    exports.isDynamicValue = resolver_1.isDynamicValue;
    exports.staticallyResolve = resolver_1.staticallyResolve;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsb0ZBQXVNO0lBQXpLLG1EQUFBLDRCQUE0QixDQUFBO0lBQUUsdUNBQUEsZ0JBQWdCLENBQUE7SUFBRSw0Q0FBQSxxQkFBcUIsQ0FBQTtJQUFFLDJDQUFBLG9CQUFvQixDQUFBO0lBQUUseUNBQUEsa0JBQWtCLENBQUE7SUFBRSxxREFBQSw4QkFBOEIsQ0FBQTtJQUU3SyxrRkFBOEc7SUFBdEcsdUNBQUEsaUJBQWlCLENBQUE7SUFBRSwrQkFBQSxTQUFTLENBQUE7SUFBaUIsb0NBQUEsY0FBYyxDQUFBO0lBQUUsdUNBQUEsaUJBQWlCLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCB7RGVjb3JhdG9yLCBQYXJhbWV0ZXIsIHJlZmxlY3RDb25zdHJ1Y3RvclBhcmFtZXRlcnMsIHJlZmxlY3REZWNvcmF0b3IsIHJlZmxlY3ROb25TdGF0aWNGaWVsZCwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHJlZmxlY3RTdGF0aWNGaWVsZCwgcmVmbGVjdFR5cGVFbnRpdHlUb0RlY2xhcmF0aW9uLH0gZnJvbSAnLi9zcmMvcmVmbGVjdG9yJztcblxuZXhwb3J0IHtBYnNvbHV0ZVJlZmVyZW5jZSwgUmVmZXJlbmNlLCBSZXNvbHZlZFZhbHVlLCBpc0R5bmFtaWNWYWx1ZSwgc3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4vc3JjL3Jlc29sdmVyJztcbiJdfQ==