(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/main", ["require", "exports", "path", "@angular/compiler-cli/src/ngcc/src/transform/package_transformer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var path_1 = require("path");
    var package_transformer_1 = require("@angular/compiler-cli/src/ngcc/src/transform/package_transformer");
    function mainNgcc(args) {
        var packagePath = path_1.resolve(args[0]);
        var format = args[1] || 'fesm2015';
        // TODO: find all the package types to transform
        // TODO: error/warning logging/handling etc
        var transformer = new package_transformer_1.PackageTransformer();
        transformer.transform(packagePath, format);
        return 0;
    }
    exports.mainNgcc = mainNgcc;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDZCQUE2QjtJQUM3Qix3R0FBbUU7SUFFbkUsa0JBQXlCLElBQWM7UUFDckMsSUFBTSxXQUFXLEdBQUcsY0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxVQUFVLENBQUM7UUFFckMsZ0RBQWdEO1FBQ2hELDJDQUEyQztRQUUzQyxJQUFNLFdBQVcsR0FBRyxJQUFJLHdDQUFrQixFQUFFLENBQUM7UUFDN0MsV0FBVyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFM0MsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBWEQsNEJBV0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge3Jlc29sdmV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQYWNrYWdlVHJhbnNmb3JtZXJ9IGZyb20gJy4vdHJhbnNmb3JtL3BhY2thZ2VfdHJhbnNmb3JtZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFpbk5nY2MoYXJnczogc3RyaW5nW10pOiBudW1iZXIge1xuICBjb25zdCBwYWNrYWdlUGF0aCA9IHJlc29sdmUoYXJnc1swXSk7XG4gIGNvbnN0IGZvcm1hdCA9IGFyZ3NbMV0gfHwgJ2Zlc20yMDE1JztcblxuICAvLyBUT0RPOiBmaW5kIGFsbCB0aGUgcGFja2FnZSB0eXBlcyB0byB0cmFuc2Zvcm1cbiAgLy8gVE9ETzogZXJyb3Ivd2FybmluZyBsb2dnaW5nL2hhbmRsaW5nIGV0Y1xuXG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gbmV3IFBhY2thZ2VUcmFuc2Zvcm1lcigpO1xuICB0cmFuc2Zvcm1lci50cmFuc2Zvcm0ocGFja2FnZVBhdGgsIGZvcm1hdCk7XG5cbiAgcmV0dXJuIDA7XG59XG4iXX0=