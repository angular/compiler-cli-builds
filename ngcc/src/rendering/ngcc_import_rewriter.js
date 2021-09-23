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
                return (0, imports_1.validateAndRewriteCoreSymbol)(symbol);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdjY19pbXBvcnRfcmV3cml0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL25nY2NfaW1wb3J0X3Jld3JpdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILG1FQUF3RjtJQUV4RjtRQUFBO1FBc0JBLENBQUM7UUFyQkMsbURBQWtCLEdBQWxCLFVBQW1CLE1BQWMsRUFBRSxTQUFpQjtZQUNsRCxJQUFJLFNBQVMsS0FBSyxlQUFlLEVBQUU7Z0JBQ2pDLHNGQUFzRjtnQkFDdEYsWUFBWTtnQkFDWixPQUFPLEtBQUssQ0FBQzthQUNkO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSxDQUFDO2FBQ2I7UUFDSCxDQUFDO1FBRUQsOENBQWEsR0FBYixVQUFjLE1BQWMsRUFBRSxTQUFpQjtZQUM3QyxJQUFJLFNBQVMsS0FBSyxlQUFlLEVBQUU7Z0JBQ2pDLE9BQU8sSUFBQSxzQ0FBNEIsRUFBQyxNQUFNLENBQUMsQ0FBQzthQUM3QztpQkFBTTtnQkFDTCxPQUFPLE1BQU0sQ0FBQzthQUNmO1FBQ0gsQ0FBQztRQUVELGlEQUFnQixHQUFoQixVQUFpQixrQkFBMEIsRUFBRSxlQUF1QjtZQUNsRSxPQUFPLGtCQUFrQixDQUFDO1FBQzVCLENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUF0QkQsSUFzQkM7SUF0Qlksd0RBQXNCIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtJbXBvcnRSZXdyaXRlciwgdmFsaWRhdGVBbmRSZXdyaXRlQ29yZVN5bWJvbH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuXG5leHBvcnQgY2xhc3MgTmdjY0ZsYXRJbXBvcnRSZXdyaXRlciBpbXBsZW1lbnRzIEltcG9ydFJld3JpdGVyIHtcbiAgc2hvdWxkSW1wb3J0U3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGlmIChzcGVjaWZpZXIgPT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgLy8gRG9uJ3QgdXNlIGltcG9ydHMgZm9yIEBhbmd1bGFyL2NvcmUgc3ltYm9scyBpbiBhIGZsYXQgYnVuZGxlLCBhcyB0aGV5J2xsIGJlIHZpc2libGVcbiAgICAgIC8vIGRpcmVjdGx5LlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXdyaXRlU3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHNwZWNpZmllciA9PT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm4gdmFsaWRhdGVBbmRSZXdyaXRlQ29yZVN5bWJvbChzeW1ib2wpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc3ltYm9sO1xuICAgIH1cbiAgfVxuXG4gIHJld3JpdGVTcGVjaWZpZXIob3JpZ2luYWxNb2R1bGVQYXRoOiBzdHJpbmcsIGluQ29udGV4dE9mRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gb3JpZ2luYWxNb2R1bGVQYXRoO1xuICB9XG59XG4iXX0=