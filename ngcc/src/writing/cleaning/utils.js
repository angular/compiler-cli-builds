(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/writing/cleaning/utils", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isLocalDirectory = void 0;
    /**
     * Returns true if the given `path` is a directory (not a symlink) and actually exists.
     *
     * @param fs the current filesystem
     * @param path the path to check
     */
    function isLocalDirectory(fs, path) {
        if (fs.exists(path)) {
            var stat = fs.lstat(path);
            return stat.isDirectory();
        }
        else {
            return false;
        }
    }
    exports.isLocalDirectory = isLocalDirectory;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvd3JpdGluZy9jbGVhbmluZy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFTQTs7Ozs7T0FLRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLEVBQWMsRUFBRSxJQUFvQjtRQUNuRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbkIsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1QixPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUMzQjthQUFNO1lBQ0wsT0FBTyxLQUFLLENBQUM7U0FDZDtJQUNILENBQUM7SUFQRCw0Q0FPQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBgcGF0aGAgaXMgYSBkaXJlY3RvcnkgKG5vdCBhIHN5bWxpbmspIGFuZCBhY3R1YWxseSBleGlzdHMuXG4gKlxuICogQHBhcmFtIGZzIHRoZSBjdXJyZW50IGZpbGVzeXN0ZW1cbiAqIEBwYXJhbSBwYXRoIHRoZSBwYXRoIHRvIGNoZWNrXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0xvY2FsRGlyZWN0b3J5KGZzOiBGaWxlU3lzdGVtLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICBpZiAoZnMuZXhpc3RzKHBhdGgpKSB7XG4gICAgY29uc3Qgc3RhdCA9IGZzLmxzdGF0KHBhdGgpO1xuICAgIHJldHVybiBzdGF0LmlzRGlyZWN0b3J5KCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=