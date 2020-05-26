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
        define("@angular/compiler-cli/ngcc/src/rendering/ngcc_import_rewriter", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgccFlatImportRewriter = void 0;
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var NgccFlatImportRewriter = /** @class */ (function () {
        function NgccFlatImportRewriter() {
        }
        NgccFlatImportRewriter.prototype.shouldImportSymbol = function (symbol, specifier) {
            if (specifier === '@angular/core') {
                // Don't use imports for @angular/core symbols in a flat bundle, as they'll be visible
                // directly.
                return false;
            }
            else {
                return true;
            }
        };
        NgccFlatImportRewriter.prototype.rewriteSymbol = function (symbol, specifier) {
            if (specifier === '@angular/core') {
                return imports_1.validateAndRewriteCoreSymbol(symbol);
            }
            else {
                return symbol;
            }
        };
        NgccFlatImportRewriter.prototype.rewriteSpecifier = function (originalModulePath, inContextOfFile) {
            return originalModulePath;
        };
        return NgccFlatImportRewriter;
    }());
    exports.NgccFlatImportRewriter = NgccFlatImportRewriter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19pbXBvcnRfcmV3cml0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL25nY2NfaW1wb3J0X3Jld3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILG1FQUF3RjtJQUV4RjtRQUFBO1FBc0JBLENBQUM7UUFyQkMsbURBQWtCLEdBQWxCLFVBQW1CLE1BQWMsRUFBRSxTQUFpQjtZQUNsRCxJQUFJLFNBQVMsS0FBSyxlQUFlLEVBQUU7Z0JBQ2pDLHNGQUFzRjtnQkFDdEYsWUFBWTtnQkFDWixPQUFPLEtBQUssQ0FBQzthQUNkO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDO2FBQ2I7UUFDSCxDQUFDO1FBRUQsOENBQWEsR0FBYixVQUFjLE1BQWMsRUFBRSxTQUFpQjtZQUM3QyxJQUFJLFNBQVMsS0FBSyxlQUFlLEVBQUU7Z0JBQ2pDLE9BQU8sc0NBQTRCLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDN0M7aUJBQU07Z0JBQ0wsT0FBTyxNQUFNLENBQUM7YUFDZjtRQUNILENBQUM7UUFFRCxpREFBZ0IsR0FBaEIsVUFBaUIsa0JBQTBCLEVBQUUsZUFBdUI7WUFDbEUsT0FBTyxrQkFBa0IsQ0FBQztRQUM1QixDQUFDO1FBQ0gsNkJBQUM7SUFBRCxDQUFDLEFBdEJELElBc0JDO0lBdEJZLHdEQUFzQiIsInNvdXJjZXNDb250ZW50IjpbIlxuLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0ltcG9ydFJld3JpdGVyLCB2YWxpZGF0ZUFuZFJld3JpdGVDb3JlU3ltYm9sfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5cbmV4cG9ydCBjbGFzcyBOZ2NjRmxhdEltcG9ydFJld3JpdGVyIGltcGxlbWVudHMgSW1wb3J0UmV3cml0ZXIge1xuICBzaG91bGRJbXBvcnRTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKHNwZWNpZmllciA9PT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICAvLyBEb24ndCB1c2UgaW1wb3J0cyBmb3IgQGFuZ3VsYXIvY29yZSBzeW1ib2xzIGluIGEgZmxhdCBidW5kbGUsIGFzIHRoZXknbGwgYmUgdmlzaWJsZVxuICAgICAgLy8gZGlyZWN0bHkuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJld3JpdGVTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBpZiAoc3BlY2lmaWVyID09PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIHJldHVybiB2YWxpZGF0ZUFuZFJld3JpdGVDb3JlU3ltYm9sKHN5bWJvbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzeW1ib2w7XG4gICAgfVxuICB9XG5cbiAgcmV3cml0ZVNwZWNpZmllcihvcmlnaW5hbE1vZHVsZVBhdGg6IHN0cmluZywgaW5Db250ZXh0T2ZGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBvcmlnaW5hbE1vZHVsZVBhdGg7XG4gIH1cbn1cbiJdfQ==