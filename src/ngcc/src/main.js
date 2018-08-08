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
        var packagePaths = args[0] ? [path_1.resolve(args[0])] : [];
        var formats = args[1] ? [args[1]] : ['fesm2015', 'esm2015', 'fesm5', 'esm5'];
        // TODO: find all the package types to transform
        // TODO: error/warning logging/handling etc
        var transformer = new package_transformer_1.PackageTransformer();
        packagePaths.forEach(function (packagePath) {
            formats.forEach(function (format) {
                console.warn("Compiling " + packagePath + ":" + format);
                transformer.transform(packagePath, format);
            });
        });
        return 0;
    }
    exports.mainNgcc = mainNgcc;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDZCQUE2QjtJQUM3Qix3R0FBbUU7SUFFbkUsa0JBQXlCLElBQWM7UUFDckMsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdkQsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRS9FLGdEQUFnRDtRQUNoRCwyQ0FBMkM7UUFFM0MsSUFBTSxXQUFXLEdBQUcsSUFBSSx3Q0FBa0IsRUFBRSxDQUFDO1FBQzdDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBQSxXQUFXO1lBQzlCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQSxNQUFNO2dCQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWEsV0FBVyxTQUFJLE1BQVEsQ0FBQyxDQUFDO2dCQUNuRCxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUM3QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBaEJELDRCQWdCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7cmVzb2x2ZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQge1BhY2thZ2VUcmFuc2Zvcm1lcn0gZnJvbSAnLi90cmFuc2Zvcm0vcGFja2FnZV90cmFuc2Zvcm1lcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWluTmdjYyhhcmdzOiBzdHJpbmdbXSk6IG51bWJlciB7XG4gIGNvbnN0IHBhY2thZ2VQYXRocyA9IGFyZ3NbMF0gPyBbcmVzb2x2ZShhcmdzWzBdKV0gOiBbXTtcbiAgY29uc3QgZm9ybWF0cyA9IGFyZ3NbMV0gPyBbYXJnc1sxXV0gOiBbJ2Zlc20yMDE1JywgJ2VzbTIwMTUnLCAnZmVzbTUnLCAnZXNtNSddO1xuXG4gIC8vIFRPRE86IGZpbmQgYWxsIHRoZSBwYWNrYWdlIHR5cGVzIHRvIHRyYW5zZm9ybVxuICAvLyBUT0RPOiBlcnJvci93YXJuaW5nIGxvZ2dpbmcvaGFuZGxpbmcgZXRjXG5cbiAgY29uc3QgdHJhbnNmb3JtZXIgPSBuZXcgUGFja2FnZVRyYW5zZm9ybWVyKCk7XG4gIHBhY2thZ2VQYXRocy5mb3JFYWNoKHBhY2thZ2VQYXRoID0+IHtcbiAgICBmb3JtYXRzLmZvckVhY2goZm9ybWF0ID0+IHtcbiAgICAgIGNvbnNvbGUud2FybihgQ29tcGlsaW5nICR7cGFja2FnZVBhdGh9OiR7Zm9ybWF0fWApO1xuICAgICAgdHJhbnNmb3JtZXIudHJhbnNmb3JtKHBhY2thZ2VQYXRoLCBmb3JtYXQpO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gMDtcbn1cbiJdfQ==