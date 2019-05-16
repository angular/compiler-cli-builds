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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBUUEsbUVBQXVHO0lBRXZHLHNHQUE4RDtJQVk5RDs7T0FFRztJQUNILFNBQWdCLGlCQUFpQixDQUM3QixhQUFtQyxFQUFFLE1BQWUsRUFBRSxNQUFlO1FBQ3ZFLElBQUksTUFBTSxJQUFJLE1BQU0sRUFBRTtZQUNwQixPQUFPLElBQUksNkNBQXNCLEVBQUUsQ0FBQztTQUNyQzthQUFNLElBQUksTUFBTSxFQUFFO1lBQ2pCLE9BQU8sSUFBSSxpQ0FBdUIsQ0FBQyxhQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDOUQ7YUFBTTtZQUNMLE9BQU8sSUFBSSw0QkFBa0IsRUFBRSxDQUFDO1NBQ2pDO0lBQ0gsQ0FBQztJQVRELDhDQVNDO0lBRUQsU0FBZ0IsY0FBYyxDQUFtQixRQUFXO1FBQzFELE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFNLENBQUM7SUFDcEQsQ0FBQztJQUZELHdDQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0ltcG9ydFJld3JpdGVyLCBOb29wSW1wb3J0UmV3cml0ZXIsIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge05nY2NGbGF0SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4vbmdjY19pbXBvcnRfcmV3cml0ZXInO1xuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVUb1dyaXRlIHtcbiAgLyoqIFBhdGggdG8gd2hlcmUgdGhlIGZpbGUgc2hvdWxkIGJlIHdyaXR0ZW4uICovXG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuICAvKiogVGhlIGNvbnRlbnRzIG9mIHRoZSBmaWxlIHRvIGJlIGJlIHdyaXR0ZW4uICovXG4gIGNvbnRlbnRzOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIGFwcHJvcHJpYXRlIEltcG9ydFJld3JpdGVyIGdpdmVuIHRoZSBwYXJhbWV0ZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW1wb3J0UmV3cml0ZXIoXG4gICAgcjNTeW1ib2xzRmlsZTogdHMuU291cmNlRmlsZSB8IG51bGwsIGlzQ29yZTogYm9vbGVhbiwgaXNGbGF0OiBib29sZWFuKTogSW1wb3J0UmV3cml0ZXIge1xuICBpZiAoaXNDb3JlICYmIGlzRmxhdCkge1xuICAgIHJldHVybiBuZXcgTmdjY0ZsYXRJbXBvcnRSZXdyaXRlcigpO1xuICB9IGVsc2UgaWYgKGlzQ29yZSkge1xuICAgIHJldHVybiBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIocjNTeW1ib2xzRmlsZSAhLmZpbGVOYW1lKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcEV4dGVuc2lvbjxUIGV4dGVuZHMgc3RyaW5nPihmaWxlUGF0aDogVCk6IFQge1xuICByZXR1cm4gZmlsZVBhdGgucmVwbGFjZSgvXFwuKGpzfGRcXC50cykkLywgJycpIGFzIFQ7XG59XG4iXX0=