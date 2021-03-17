(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/src/helpers", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system/src/invalid_file_system", "@angular/compiler-cli/src/ngtsc/file_system/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.toRelativeImport = exports.isLocalRelativePath = exports.basename = exports.relative = exports.isRooted = exports.isRoot = exports.resolve = exports.join = exports.dirname = exports.relativeFrom = exports.absoluteFromSourceFile = exports.absoluteFrom = exports.setFileSystem = exports.getFileSystem = void 0;
    var tslib_1 = require("tslib");
    var invalid_file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/invalid_file_system");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/util");
    var fs = new invalid_file_system_1.InvalidFileSystem();
    function getFileSystem() {
        return fs;
    }
    exports.getFileSystem = getFileSystem;
    function setFileSystem(fileSystem) {
        fs = fileSystem;
    }
    exports.setFileSystem = setFileSystem;
    /**
     * Convert the path `path` to an `AbsoluteFsPath`, throwing an error if it's not an absolute path.
     */
    function absoluteFrom(path) {
        if (!fs.isRooted(path)) {
            throw new Error("Internal Error: absoluteFrom(" + path + "): path is not absolute");
        }
        return fs.resolve(path);
    }
    exports.absoluteFrom = absoluteFrom;
    /**
     * Extract an `AbsoluteFsPath` from a `ts.SourceFile`.
     */
    function absoluteFromSourceFile(sf) {
        return fs.resolve(sf.fileName);
    }
    exports.absoluteFromSourceFile = absoluteFromSourceFile;
    /**
     * Convert the path `path` to a `PathSegment`, throwing an error if it's not a relative path.
     */
    function relativeFrom(path) {
        var normalized = util_1.normalizeSeparators(path);
        if (fs.isRooted(normalized)) {
            throw new Error("Internal Error: relativeFrom(" + path + "): path is not relative");
        }
        return normalized;
    }
    exports.relativeFrom = relativeFrom;
    /**
     * Static access to `dirname`.
     */
    function dirname(file) {
        return fs.dirname(file);
    }
    exports.dirname = dirname;
    /**
     * Static access to `join`.
     */
    function join(basePath) {
        var paths = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            paths[_i - 1] = arguments[_i];
        }
        return fs.join.apply(fs, tslib_1.__spreadArray([basePath], tslib_1.__read(paths)));
    }
    exports.join = join;
    /**
     * Static access to `resolve`s.
     */
    function resolve(basePath) {
        var paths = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            paths[_i - 1] = arguments[_i];
        }
        return fs.resolve.apply(fs, tslib_1.__spreadArray([basePath], tslib_1.__read(paths)));
    }
    exports.resolve = resolve;
    /** Returns true when the path provided is the root path. */
    function isRoot(path) {
        return fs.isRoot(path);
    }
    exports.isRoot = isRoot;
    /**
     * Static access to `isRooted`.
     */
    function isRooted(path) {
        return fs.isRooted(path);
    }
    exports.isRooted = isRooted;
    /**
     * Static access to `relative`.
     */
    function relative(from, to) {
        return fs.relative(from, to);
    }
    exports.relative = relative;
    /**
     * Static access to `basename`.
     */
    function basename(filePath, extension) {
        return fs.basename(filePath, extension);
    }
    exports.basename = basename;
    /**
     * Returns true if the given path is locally relative.
     *
     * This is used to work out if the given path is relative (i.e. not absolute) but also is not
     * escaping the current directory.
     */
    function isLocalRelativePath(relativePath) {
        return !isRooted(relativePath) && !relativePath.startsWith('..');
    }
    exports.isLocalRelativePath = isLocalRelativePath;
    /**
     * Converts a path to a form suitable for use as a relative module import specifier.
     *
     * In other words it adds the `./` to the path if it is locally relative.
     */
    function toRelativeImport(relativePath) {
        return isLocalRelativePath(relativePath) ? "./" + relativePath : relativePath;
    }
    exports.toRelativeImport = toRelativeImport;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVNBLDJHQUF3RDtJQUV4RCw2RUFBMkM7SUFFM0MsSUFBSSxFQUFFLEdBQWUsSUFBSSx1Q0FBaUIsRUFBRSxDQUFDO0lBQzdDLFNBQWdCLGFBQWE7UUFDM0IsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRkQsc0NBRUM7SUFDRCxTQUFnQixhQUFhLENBQUMsVUFBc0I7UUFDbEQsRUFBRSxHQUFHLFVBQVUsQ0FBQztJQUNsQixDQUFDO0lBRkQsc0NBRUM7SUFFRDs7T0FFRztJQUNILFNBQWdCLFlBQVksQ0FBQyxJQUFZO1FBQ3ZDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWdDLElBQUksNEJBQXlCLENBQUMsQ0FBQztTQUNoRjtRQUNELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBTEQsb0NBS0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLHNCQUFzQixDQUFDLEVBQWlCO1FBQ3RELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUZELHdEQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixZQUFZLENBQUMsSUFBWTtRQUN2QyxJQUFNLFVBQVUsR0FBRywwQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBZ0MsSUFBSSw0QkFBeUIsQ0FBQyxDQUFDO1NBQ2hGO1FBQ0QsT0FBTyxVQUF5QixDQUFDO0lBQ25DLENBQUM7SUFORCxvQ0FNQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsT0FBTyxDQUF1QixJQUFPO1FBQ25ELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRkQsMEJBRUM7SUFFRDs7T0FFRztJQUNILFNBQWdCLElBQUksQ0FBdUIsUUFBVztRQUFFLGVBQWtCO2FBQWxCLFVBQWtCLEVBQWxCLHFCQUFrQixFQUFsQixJQUFrQjtZQUFsQiw4QkFBa0I7O1FBQ3hFLE9BQU8sRUFBRSxDQUFDLElBQUksT0FBUCxFQUFFLHlCQUFNLFFBQVEsa0JBQUssS0FBSyxJQUFFO0lBQ3JDLENBQUM7SUFGRCxvQkFFQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsT0FBTyxDQUFDLFFBQWdCO1FBQUUsZUFBa0I7YUFBbEIsVUFBa0IsRUFBbEIscUJBQWtCLEVBQWxCLElBQWtCO1lBQWxCLDhCQUFrQjs7UUFDMUQsT0FBTyxFQUFFLENBQUMsT0FBTyxPQUFWLEVBQUUseUJBQVMsUUFBUSxrQkFBSyxLQUFLLElBQUU7SUFDeEMsQ0FBQztJQUZELDBCQUVDO0lBRUQsNERBQTREO0lBQzVELFNBQWdCLE1BQU0sQ0FBQyxJQUFvQjtRQUN6QyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUZELHdCQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixRQUFRLENBQUMsSUFBWTtRQUNuQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUZELDRCQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixRQUFRLENBQXVCLElBQU8sRUFBRSxFQUFLO1FBQzNELE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUZELDRCQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixRQUFRLENBQUMsUUFBb0IsRUFBRSxTQUFrQjtRQUMvRCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBZ0IsQ0FBQztJQUN6RCxDQUFDO0lBRkQsNEJBRUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLFlBQW9CO1FBQ3RELE9BQU8sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFGRCxrREFFQztJQUVEOzs7O09BSUc7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxZQUF3QztRQUV2RSxPQUFPLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFLLFlBQTZCLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztJQUMvRixDQUFDO0lBSEQsNENBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0ludmFsaWRGaWxlU3lzdGVtfSBmcm9tICcuL2ludmFsaWRfZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnQsIFBhdGhTdHJpbmd9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtub3JtYWxpemVTZXBhcmF0b3JzfSBmcm9tICcuL3V0aWwnO1xuXG5sZXQgZnM6IEZpbGVTeXN0ZW0gPSBuZXcgSW52YWxpZEZpbGVTeXN0ZW0oKTtcbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU3lzdGVtKCk6IEZpbGVTeXN0ZW0ge1xuICByZXR1cm4gZnM7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0RmlsZVN5c3RlbShmaWxlU3lzdGVtOiBGaWxlU3lzdGVtKSB7XG4gIGZzID0gZmlsZVN5c3RlbTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IHRoZSBwYXRoIGBwYXRoYCB0byBhbiBgQWJzb2x1dGVGc1BhdGhgLCB0aHJvd2luZyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhbiBhYnNvbHV0ZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWJzb2x1dGVGcm9tKHBhdGg6IHN0cmluZyk6IEFic29sdXRlRnNQYXRoIHtcbiAgaWYgKCFmcy5pc1Jvb3RlZChwYXRoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IGFic29sdXRlRnJvbSgke3BhdGh9KTogcGF0aCBpcyBub3QgYWJzb2x1dGVgKTtcbiAgfVxuICByZXR1cm4gZnMucmVzb2x2ZShwYXRoKTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGFuIGBBYnNvbHV0ZUZzUGF0aGAgZnJvbSBhIGB0cy5Tb3VyY2VGaWxlYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gIHJldHVybiBmcy5yZXNvbHZlKHNmLmZpbGVOYW1lKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IHRoZSBwYXRoIGBwYXRoYCB0byBhIGBQYXRoU2VnbWVudGAsIHRocm93aW5nIGFuIGVycm9yIGlmIGl0J3Mgbm90IGEgcmVsYXRpdmUgcGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbGF0aXZlRnJvbShwYXRoOiBzdHJpbmcpOiBQYXRoU2VnbWVudCB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVTZXBhcmF0b3JzKHBhdGgpO1xuICBpZiAoZnMuaXNSb290ZWQobm9ybWFsaXplZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIEVycm9yOiByZWxhdGl2ZUZyb20oJHtwYXRofSk6IHBhdGggaXMgbm90IHJlbGF0aXZlYCk7XG4gIH1cbiAgcmV0dXJuIG5vcm1hbGl6ZWQgYXMgUGF0aFNlZ21lbnQ7XG59XG5cbi8qKlxuICogU3RhdGljIGFjY2VzcyB0byBgZGlybmFtZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXJuYW1lPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihmaWxlOiBUKTogVCB7XG4gIHJldHVybiBmcy5kaXJuYW1lKGZpbGUpO1xufVxuXG4vKipcbiAqIFN0YXRpYyBhY2Nlc3MgdG8gYGpvaW5gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gam9pbjxUIGV4dGVuZHMgUGF0aFN0cmluZz4oYmFzZVBhdGg6IFQsIC4uLnBhdGhzOiBzdHJpbmdbXSk6IFQge1xuICByZXR1cm4gZnMuam9pbihiYXNlUGF0aCwgLi4ucGF0aHMpO1xufVxuXG4vKipcbiAqIFN0YXRpYyBhY2Nlc3MgdG8gYHJlc29sdmVgcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmUoYmFzZVBhdGg6IHN0cmluZywgLi4ucGF0aHM6IHN0cmluZ1tdKTogQWJzb2x1dGVGc1BhdGgge1xuICByZXR1cm4gZnMucmVzb2x2ZShiYXNlUGF0aCwgLi4ucGF0aHMpO1xufVxuXG4vKiogUmV0dXJucyB0cnVlIHdoZW4gdGhlIHBhdGggcHJvdmlkZWQgaXMgdGhlIHJvb3QgcGF0aC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Jvb3QocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZzLmlzUm9vdChwYXRoKTtcbn1cblxuLyoqXG4gKiBTdGF0aWMgYWNjZXNzIHRvIGBpc1Jvb3RlZGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Jvb3RlZChwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZzLmlzUm9vdGVkKHBhdGgpO1xufVxuXG4vKipcbiAqIFN0YXRpYyBhY2Nlc3MgdG8gYHJlbGF0aXZlYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbGF0aXZlPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihmcm9tOiBULCB0bzogVCk6IFBhdGhTZWdtZW50fEFic29sdXRlRnNQYXRoIHtcbiAgcmV0dXJuIGZzLnJlbGF0aXZlKGZyb20sIHRvKTtcbn1cblxuLyoqXG4gKiBTdGF0aWMgYWNjZXNzIHRvIGBiYXNlbmFtZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlbmFtZShmaWxlUGF0aDogUGF0aFN0cmluZywgZXh0ZW5zaW9uPzogc3RyaW5nKTogUGF0aFNlZ21lbnQge1xuICByZXR1cm4gZnMuYmFzZW5hbWUoZmlsZVBhdGgsIGV4dGVuc2lvbikgYXMgUGF0aFNlZ21lbnQ7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBwYXRoIGlzIGxvY2FsbHkgcmVsYXRpdmUuXG4gKlxuICogVGhpcyBpcyB1c2VkIHRvIHdvcmsgb3V0IGlmIHRoZSBnaXZlbiBwYXRoIGlzIHJlbGF0aXZlIChpLmUuIG5vdCBhYnNvbHV0ZSkgYnV0IGFsc28gaXMgbm90XG4gKiBlc2NhcGluZyB0aGUgY3VycmVudCBkaXJlY3RvcnkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0xvY2FsUmVsYXRpdmVQYXRoKHJlbGF0aXZlUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAhaXNSb290ZWQocmVsYXRpdmVQYXRoKSAmJiAhcmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoJy4uJyk7XG59XG5cbi8qKlxuICogQ29udmVydHMgYSBwYXRoIHRvIGEgZm9ybSBzdWl0YWJsZSBmb3IgdXNlIGFzIGEgcmVsYXRpdmUgbW9kdWxlIGltcG9ydCBzcGVjaWZpZXIuXG4gKlxuICogSW4gb3RoZXIgd29yZHMgaXQgYWRkcyB0aGUgYC4vYCB0byB0aGUgcGF0aCBpZiBpdCBpcyBsb2NhbGx5IHJlbGF0aXZlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9SZWxhdGl2ZUltcG9ydChyZWxhdGl2ZVBhdGg6IFBhdGhTZWdtZW50fEFic29sdXRlRnNQYXRoKTogUGF0aFNlZ21lbnR8XG4gICAgQWJzb2x1dGVGc1BhdGgge1xuICByZXR1cm4gaXNMb2NhbFJlbGF0aXZlUGF0aChyZWxhdGl2ZVBhdGgpID8gYC4vJHtyZWxhdGl2ZVBhdGh9YCBhcyBQYXRoU2VnbWVudCA6IHJlbGF0aXZlUGF0aDtcbn1cbiJdfQ==