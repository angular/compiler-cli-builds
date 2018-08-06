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
        // TODO: find all the package tyoes to transform
        // TODO: error/warning logging/handling etc
        var transformer = new package_transformer_1.PackageTransformer();
        transformer.transform(packagePath, 'fesm2015');
        return 0;
    }
    exports.mainNgcc = mainNgcc;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDZCQUE2QjtJQUM3Qix3R0FBbUU7SUFFbkUsa0JBQXlCLElBQWM7UUFDckMsSUFBTSxXQUFXLEdBQUcsY0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXJDLGdEQUFnRDtRQUNoRCwyQ0FBMkM7UUFFM0MsSUFBTSxXQUFXLEdBQUcsSUFBSSx3Q0FBa0IsRUFBRSxDQUFDO1FBQzdDLFdBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRS9DLE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQVZELDRCQVVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtyZXNvbHZlfSBmcm9tICdwYXRoJztcbmltcG9ydCB7UGFja2FnZVRyYW5zZm9ybWVyfSBmcm9tICcuL3RyYW5zZm9ybS9wYWNrYWdlX3RyYW5zZm9ybWVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIG1haW5OZ2NjKGFyZ3M6IHN0cmluZ1tdKTogbnVtYmVyIHtcbiAgY29uc3QgcGFja2FnZVBhdGggPSByZXNvbHZlKGFyZ3NbMF0pO1xuXG4gIC8vIFRPRE86IGZpbmQgYWxsIHRoZSBwYWNrYWdlIHR5b2VzIHRvIHRyYW5zZm9ybVxuICAvLyBUT0RPOiBlcnJvci93YXJuaW5nIGxvZ2dpbmcvaGFuZGxpbmcgZXRjXG5cbiAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgUGFja2FnZVRyYW5zZm9ybWVyKCk7XG4gIHRyYW5zZm9ybWVyLnRyYW5zZm9ybShwYWNrYWdlUGF0aCwgJ2Zlc20yMDE1Jyk7XG5cbiAgcmV0dXJuIDA7XG59XG4iXX0=