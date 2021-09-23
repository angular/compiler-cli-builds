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
    var ABSOLUTE_PATH = Symbol('AbsolutePath');
    /**
     * Extract an `AbsoluteFsPath` from a `ts.SourceFile`-like object.
     */
    function absoluteFromSourceFile(sf) {
        var sfWithPatch = sf;
        if (sfWithPatch[ABSOLUTE_PATH] === undefined) {
            sfWithPatch[ABSOLUTE_PATH] = fs.resolve(sfWithPatch.fileName);
        }
        // Non-null assertion needed since TS doesn't narrow the type of fields that use a symbol as a key
        // apparently.
        return sfWithPatch[ABSOLUTE_PATH];
    }
    exports.absoluteFromSourceFile = absoluteFromSourceFile;
    /**
     * Convert the path `path` to a `PathSegment`, throwing an error if it's not a relative path.
     */
    function relativeFrom(path) {
        var normalized = (0, util_1.normalizeSeparators)(path);
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
        return fs.join.apply(fs, (0, tslib_1.__spreadArray)([basePath], (0, tslib_1.__read)(paths), false));
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
        return fs.resolve.apply(fs, (0, tslib_1.__spreadArray)([basePath], (0, tslib_1.__read)(paths), false));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVNBLDJHQUF3RDtJQUV4RCw2RUFBMkM7SUFFM0MsSUFBSSxFQUFFLEdBQWUsSUFBSSx1Q0FBaUIsRUFBRSxDQUFDO0lBQzdDLFNBQWdCLGFBQWE7UUFDM0IsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRkQsc0NBRUM7SUFDRCxTQUFnQixhQUFhLENBQUMsVUFBc0I7UUFDbEQsRUFBRSxHQUFHLFVBQVUsQ0FBQztJQUNsQixDQUFDO0lBRkQsc0NBRUM7SUFFRDs7T0FFRztJQUNILFNBQWdCLFlBQVksQ0FBQyxJQUFZO1FBQ3ZDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWdDLElBQUksNEJBQXlCLENBQUMsQ0FBQztTQUNoRjtRQUNELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBTEQsb0NBS0M7SUFFRCxJQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFN0M7O09BRUc7SUFDSCxTQUFnQixzQkFBc0IsQ0FBQyxFQUFzQjtRQUMzRCxJQUFNLFdBQVcsR0FBRyxFQUEwRCxDQUFDO1FBRS9FLElBQUksV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLFNBQVMsRUFBRTtZQUM1QyxXQUFXLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDL0Q7UUFFRCxrR0FBa0c7UUFDbEcsY0FBYztRQUNkLE9BQU8sV0FBVyxDQUFDLGFBQWEsQ0FBRSxDQUFDO0lBQ3JDLENBQUM7SUFWRCx3REFVQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQVk7UUFDdkMsSUFBTSxVQUFVLEdBQUcsSUFBQSwwQkFBbUIsRUFBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBZ0MsSUFBSSw0QkFBeUIsQ0FBQyxDQUFDO1NBQ2hGO1FBQ0QsT0FBTyxVQUF5QixDQUFDO0lBQ25DLENBQUM7SUFORCxvQ0FNQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsT0FBTyxDQUF1QixJQUFPO1FBQ25ELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRkQsMEJBRUM7SUFFRDs7T0FFRztJQUNILFNBQWdCLElBQUksQ0FBdUIsUUFBVztRQUFFLGVBQWtCO2FBQWxCLFVBQWtCLEVBQWxCLHFCQUFrQixFQUFsQixJQUFrQjtZQUFsQiw4QkFBa0I7O1FBQ3hFLE9BQU8sRUFBRSxDQUFDLElBQUksT0FBUCxFQUFFLDhCQUFNLFFBQVEsdUJBQUssS0FBSyxXQUFFO0lBQ3JDLENBQUM7SUFGRCxvQkFFQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsT0FBTyxDQUFDLFFBQWdCO1FBQUUsZUFBa0I7YUFBbEIsVUFBa0IsRUFBbEIscUJBQWtCLEVBQWxCLElBQWtCO1lBQWxCLDhCQUFrQjs7UUFDMUQsT0FBTyxFQUFFLENBQUMsT0FBTyxPQUFWLEVBQUUsOEJBQVMsUUFBUSx1QkFBSyxLQUFLLFdBQUU7SUFDeEMsQ0FBQztJQUZELDBCQUVDO0lBRUQsNERBQTREO0lBQzVELFNBQWdCLE1BQU0sQ0FBQyxJQUFvQjtRQUN6QyxPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUZELHdCQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixRQUFRLENBQUMsSUFBWTtRQUNuQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztJQUZELDRCQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixRQUFRLENBQXVCLElBQU8sRUFBRSxFQUFLO1FBQzNELE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUZELDRCQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixRQUFRLENBQUMsUUFBb0IsRUFBRSxTQUFrQjtRQUMvRCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBZ0IsQ0FBQztJQUN6RCxDQUFDO0lBRkQsNEJBRUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLG1CQUFtQixDQUFDLFlBQW9CO1FBQ3RELE9BQU8sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFGRCxrREFFQztJQUVEOzs7O09BSUc7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxZQUF3QztRQUV2RSxPQUFPLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFLLFlBQTZCLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztJQUMvRixDQUFDO0lBSEQsNENBR0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0ludmFsaWRGaWxlU3lzdGVtfSBmcm9tICcuL2ludmFsaWRfZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnQsIFBhdGhTdHJpbmd9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtub3JtYWxpemVTZXBhcmF0b3JzfSBmcm9tICcuL3V0aWwnO1xuXG5sZXQgZnM6IEZpbGVTeXN0ZW0gPSBuZXcgSW52YWxpZEZpbGVTeXN0ZW0oKTtcbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU3lzdGVtKCk6IEZpbGVTeXN0ZW0ge1xuICByZXR1cm4gZnM7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0RmlsZVN5c3RlbShmaWxlU3lzdGVtOiBGaWxlU3lzdGVtKSB7XG4gIGZzID0gZmlsZVN5c3RlbTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IHRoZSBwYXRoIGBwYXRoYCB0byBhbiBgQWJzb2x1dGVGc1BhdGhgLCB0aHJvd2luZyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhbiBhYnNvbHV0ZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWJzb2x1dGVGcm9tKHBhdGg6IHN0cmluZyk6IEFic29sdXRlRnNQYXRoIHtcbiAgaWYgKCFmcy5pc1Jvb3RlZChwYXRoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IGFic29sdXRlRnJvbSgke3BhdGh9KTogcGF0aCBpcyBub3QgYWJzb2x1dGVgKTtcbiAgfVxuICByZXR1cm4gZnMucmVzb2x2ZShwYXRoKTtcbn1cblxuY29uc3QgQUJTT0xVVEVfUEFUSCA9IFN5bWJvbCgnQWJzb2x1dGVQYXRoJyk7XG5cbi8qKlxuICogRXh0cmFjdCBhbiBgQWJzb2x1dGVGc1BhdGhgIGZyb20gYSBgdHMuU291cmNlRmlsZWAtbGlrZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmOiB7ZmlsZU5hbWU6IHN0cmluZ30pOiBBYnNvbHV0ZUZzUGF0aCB7XG4gIGNvbnN0IHNmV2l0aFBhdGNoID0gc2YgYXMge2ZpbGVOYW1lOiBzdHJpbmcsIFtBQlNPTFVURV9QQVRIXT86IEFic29sdXRlRnNQYXRofTtcblxuICBpZiAoc2ZXaXRoUGF0Y2hbQUJTT0xVVEVfUEFUSF0gPT09IHVuZGVmaW5lZCkge1xuICAgIHNmV2l0aFBhdGNoW0FCU09MVVRFX1BBVEhdID0gZnMucmVzb2x2ZShzZldpdGhQYXRjaC5maWxlTmFtZSk7XG4gIH1cblxuICAvLyBOb24tbnVsbCBhc3NlcnRpb24gbmVlZGVkIHNpbmNlIFRTIGRvZXNuJ3QgbmFycm93IHRoZSB0eXBlIG9mIGZpZWxkcyB0aGF0IHVzZSBhIHN5bWJvbCBhcyBhIGtleVxuICAvLyBhcHBhcmVudGx5LlxuICByZXR1cm4gc2ZXaXRoUGF0Y2hbQUJTT0xVVEVfUEFUSF0hO1xufVxuXG4vKipcbiAqIENvbnZlcnQgdGhlIHBhdGggYHBhdGhgIHRvIGEgYFBhdGhTZWdtZW50YCwgdGhyb3dpbmcgYW4gZXJyb3IgaWYgaXQncyBub3QgYSByZWxhdGl2ZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmVGcm9tKHBhdGg6IHN0cmluZyk6IFBhdGhTZWdtZW50IHtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMocGF0aCk7XG4gIGlmIChmcy5pc1Jvb3RlZChub3JtYWxpemVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IHJlbGF0aXZlRnJvbSgke3BhdGh9KTogcGF0aCBpcyBub3QgcmVsYXRpdmVgKTtcbiAgfVxuICByZXR1cm4gbm9ybWFsaXplZCBhcyBQYXRoU2VnbWVudDtcbn1cblxuLyoqXG4gKiBTdGF0aWMgYWNjZXNzIHRvIGBkaXJuYW1lYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpcm5hbWU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KGZpbGU6IFQpOiBUIHtcbiAgcmV0dXJuIGZzLmRpcm5hbWUoZmlsZSk7XG59XG5cbi8qKlxuICogU3RhdGljIGFjY2VzcyB0byBgam9pbmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihiYXNlUGF0aDogVCwgLi4ucGF0aHM6IHN0cmluZ1tdKTogVCB7XG4gIHJldHVybiBmcy5qb2luKGJhc2VQYXRoLCAuLi5wYXRocyk7XG59XG5cbi8qKlxuICogU3RhdGljIGFjY2VzcyB0byBgcmVzb2x2ZWBzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZShiYXNlUGF0aDogc3RyaW5nLCAuLi5wYXRoczogc3RyaW5nW10pOiBBYnNvbHV0ZUZzUGF0aCB7XG4gIHJldHVybiBmcy5yZXNvbHZlKGJhc2VQYXRoLCAuLi5wYXRocyk7XG59XG5cbi8qKiBSZXR1cm5zIHRydWUgd2hlbiB0aGUgcGF0aCBwcm92aWRlZCBpcyB0aGUgcm9vdCBwYXRoLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUm9vdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICByZXR1cm4gZnMuaXNSb290KHBhdGgpO1xufVxuXG4vKipcbiAqIFN0YXRpYyBhY2Nlc3MgdG8gYGlzUm9vdGVkYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUm9vdGVkKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZnMuaXNSb290ZWQocGF0aCk7XG59XG5cbi8qKlxuICogU3RhdGljIGFjY2VzcyB0byBgcmVsYXRpdmVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KGZyb206IFQsIHRvOiBUKTogUGF0aFNlZ21lbnR8QWJzb2x1dGVGc1BhdGgge1xuICByZXR1cm4gZnMucmVsYXRpdmUoZnJvbSwgdG8pO1xufVxuXG4vKipcbiAqIFN0YXRpYyBhY2Nlc3MgdG8gYGJhc2VuYW1lYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2VuYW1lKGZpbGVQYXRoOiBQYXRoU3RyaW5nLCBleHRlbnNpb24/OiBzdHJpbmcpOiBQYXRoU2VnbWVudCB7XG4gIHJldHVybiBmcy5iYXNlbmFtZShmaWxlUGF0aCwgZXh0ZW5zaW9uKSBhcyBQYXRoU2VnbWVudDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIHBhdGggaXMgbG9jYWxseSByZWxhdGl2ZS5cbiAqXG4gKiBUaGlzIGlzIHVzZWQgdG8gd29yayBvdXQgaWYgdGhlIGdpdmVuIHBhdGggaXMgcmVsYXRpdmUgKGkuZS4gbm90IGFic29sdXRlKSBidXQgYWxzbyBpcyBub3RcbiAqIGVzY2FwaW5nIHRoZSBjdXJyZW50IGRpcmVjdG9yeS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTG9jYWxSZWxhdGl2ZVBhdGgocmVsYXRpdmVQYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuICFpc1Jvb3RlZChyZWxhdGl2ZVBhdGgpICYmICFyZWxhdGl2ZVBhdGguc3RhcnRzV2l0aCgnLi4nKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHBhdGggdG8gYSBmb3JtIHN1aXRhYmxlIGZvciB1c2UgYXMgYSByZWxhdGl2ZSBtb2R1bGUgaW1wb3J0IHNwZWNpZmllci5cbiAqXG4gKiBJbiBvdGhlciB3b3JkcyBpdCBhZGRzIHRoZSBgLi9gIHRvIHRoZSBwYXRoIGlmIGl0IGlzIGxvY2FsbHkgcmVsYXRpdmUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1JlbGF0aXZlSW1wb3J0KHJlbGF0aXZlUGF0aDogUGF0aFNlZ21lbnR8QWJzb2x1dGVGc1BhdGgpOiBQYXRoU2VnbWVudHxcbiAgICBBYnNvbHV0ZUZzUGF0aCB7XG4gIHJldHVybiBpc0xvY2FsUmVsYXRpdmVQYXRoKHJlbGF0aXZlUGF0aCkgPyBgLi8ke3JlbGF0aXZlUGF0aH1gIGFzIFBhdGhTZWdtZW50IDogcmVsYXRpdmVQYXRoO1xufVxuIl19