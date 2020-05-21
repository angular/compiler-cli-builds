(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/utils", ["require", "exports", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/ngcc/src/rendering/ngcc_import_rewriter"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.stripExtension = exports.getImportRewriter = void 0;
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var ngcc_import_rewriter_1 = require("@angular/compiler-cli/ngcc/src/rendering/ngcc_import_rewriter");
    /**
     * Create an appropriate ImportRewriter given the parameters.
     */
    function getImportRewriter(r3SymbolsFile, isCore, isFlat) {
        if (isCore && isFlat) {
            return new ngcc_import_rewriter_1.NgccFlatImportRewriter();
        }
        else if (isCore) {
            return new imports_1.R3SymbolsImportRewriter(r3SymbolsFile.fileName);
        }
        else {
            return new imports_1.NoopImportRewriter();
        }
    }
    exports.getImportRewriter = getImportRewriter;
    function stripExtension(filePath) {
        return filePath.replace(/\.(js|d\.ts)$/, '');
    }
    exports.stripExtension = stripExtension;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVNBLG1FQUF1RztJQUN2RyxzR0FBOEQ7SUFZOUQ7O09BRUc7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsYUFBaUMsRUFBRSxNQUFlLEVBQUUsTUFBZTtRQUNyRSxJQUFJLE1BQU0sSUFBSSxNQUFNLEVBQUU7WUFDcEIsT0FBTyxJQUFJLDZDQUFzQixFQUFFLENBQUM7U0FDckM7YUFBTSxJQUFJLE1BQU0sRUFBRTtZQUNqQixPQUFPLElBQUksaUNBQXVCLENBQUMsYUFBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQzdEO2FBQU07WUFDTCxPQUFPLElBQUksNEJBQWtCLEVBQUUsQ0FBQztTQUNqQztJQUNILENBQUM7SUFURCw4Q0FTQztJQUVELFNBQWdCLGNBQWMsQ0FBbUIsUUFBVztRQUMxRCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBTSxDQUFDO0lBQ3BELENBQUM7SUFGRCx3Q0FFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7SW1wb3J0UmV3cml0ZXIsIE5vb3BJbXBvcnRSZXdyaXRlciwgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7TmdjY0ZsYXRJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi9uZ2NjX2ltcG9ydF9yZXdyaXRlcic7XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYSBmaWxlIHRoYXQgaGFzIGJlZW4gcmVuZGVyZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVRvV3JpdGUge1xuICAvKiogUGF0aCB0byB3aGVyZSB0aGUgZmlsZSBzaG91bGQgYmUgd3JpdHRlbi4gKi9cbiAgcGF0aDogQWJzb2x1dGVGc1BhdGg7XG4gIC8qKiBUaGUgY29udGVudHMgb2YgdGhlIGZpbGUgdG8gYmUgYmUgd3JpdHRlbi4gKi9cbiAgY29udGVudHM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gYXBwcm9wcmlhdGUgSW1wb3J0UmV3cml0ZXIgZ2l2ZW4gdGhlIHBhcmFtZXRlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRJbXBvcnRSZXdyaXRlcihcbiAgICByM1N5bWJvbHNGaWxlOiB0cy5Tb3VyY2VGaWxlfG51bGwsIGlzQ29yZTogYm9vbGVhbiwgaXNGbGF0OiBib29sZWFuKTogSW1wb3J0UmV3cml0ZXIge1xuICBpZiAoaXNDb3JlICYmIGlzRmxhdCkge1xuICAgIHJldHVybiBuZXcgTmdjY0ZsYXRJbXBvcnRSZXdyaXRlcigpO1xuICB9IGVsc2UgaWYgKGlzQ29yZSkge1xuICAgIHJldHVybiBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIocjNTeW1ib2xzRmlsZSEuZmlsZU5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgTm9vcEltcG9ydFJld3JpdGVyKCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwRXh0ZW5zaW9uPFQgZXh0ZW5kcyBzdHJpbmc+KGZpbGVQYXRoOiBUKTogVCB7XG4gIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC9cXC4oanN8ZFxcLnRzKSQvLCAnJykgYXMgVDtcbn1cbiJdfQ==