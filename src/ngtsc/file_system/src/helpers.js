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
    exports.basename = exports.relative = exports.isRooted = exports.isRoot = exports.resolve = exports.join = exports.dirname = exports.relativeFrom = exports.absoluteFromSourceFile = exports.absoluteFrom = exports.setFileSystem = exports.getFileSystem = void 0;
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
        return fs.join.apply(fs, tslib_1.__spread([basePath], paths));
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
        return fs.resolve.apply(fs, tslib_1.__spread([basePath], paths));
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVNBLDJHQUF3RDtJQUV4RCw2RUFBMkM7SUFFM0MsSUFBSSxFQUFFLEdBQWUsSUFBSSx1Q0FBaUIsRUFBRSxDQUFDO0lBQzdDLFNBQWdCLGFBQWE7UUFDM0IsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRkQsc0NBRUM7SUFDRCxTQUFnQixhQUFhLENBQUMsVUFBc0I7UUFDbEQsRUFBRSxHQUFHLFVBQVUsQ0FBQztJQUNsQixDQUFDO0lBRkQsc0NBRUM7SUFFRDs7T0FFRztJQUNILFNBQWdCLFlBQVksQ0FBQyxJQUFZO1FBQ3ZDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWdDLElBQUksNEJBQXlCLENBQUMsQ0FBQztTQUNoRjtRQUNELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBTEQsb0NBS0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLHNCQUFzQixDQUFDLEVBQWlCO1FBQ3RELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUZELHdEQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixZQUFZLENBQUMsSUFBWTtRQUN2QyxJQUFNLFVBQVUsR0FBRywwQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBZ0MsSUFBSSw0QkFBeUIsQ0FBQyxDQUFDO1NBQ2hGO1FBQ0QsT0FBTyxVQUF5QixDQUFDO0lBQ25DLENBQUM7SUFORCxvQ0FNQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsT0FBTyxDQUF1QixJQUFPO1FBQ25ELE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRkQsMEJBRUM7SUFFRDs7T0FFRztJQUNILFNBQWdCLElBQUksQ0FBdUIsUUFBVztRQUFFLGVBQWtCO2FBQWxCLFVBQWtCLEVBQWxCLHFCQUFrQixFQUFsQixJQUFrQjtZQUFsQiw4QkFBa0I7O1FBQ3hFLE9BQU8sRUFBRSxDQUFDLElBQUksT0FBUCxFQUFFLG9CQUFNLFFBQVEsR0FBSyxLQUFLLEdBQUU7SUFDckMsQ0FBQztJQUZELG9CQUVDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixPQUFPLENBQUMsUUFBZ0I7UUFBRSxlQUFrQjthQUFsQixVQUFrQixFQUFsQixxQkFBa0IsRUFBbEIsSUFBa0I7WUFBbEIsOEJBQWtCOztRQUMxRCxPQUFPLEVBQUUsQ0FBQyxPQUFPLE9BQVYsRUFBRSxvQkFBUyxRQUFRLEdBQUssS0FBSyxHQUFFO0lBQ3hDLENBQUM7SUFGRCwwQkFFQztJQUVELDREQUE0RDtJQUM1RCxTQUFnQixNQUFNLENBQUMsSUFBb0I7UUFDekMsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFGRCx3QkFFQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsUUFBUSxDQUFDLElBQVk7UUFDbkMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFGRCw0QkFFQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsUUFBUSxDQUF1QixJQUFPLEVBQUUsRUFBSztRQUMzRCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFGRCw0QkFFQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsUUFBUSxDQUFDLFFBQW9CLEVBQUUsU0FBa0I7UUFDL0QsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQWdCLENBQUM7SUFDekQsQ0FBQztJQUZELDRCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7SW52YWxpZEZpbGVTeXN0ZW19IGZyb20gJy4vaW52YWxpZF9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudCwgUGF0aFN0cmluZ30gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge25vcm1hbGl6ZVNlcGFyYXRvcnN9IGZyb20gJy4vdXRpbCc7XG5cbmxldCBmczogRmlsZVN5c3RlbSA9IG5ldyBJbnZhbGlkRmlsZVN5c3RlbSgpO1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTeXN0ZW0oKTogRmlsZVN5c3RlbSB7XG4gIHJldHVybiBmcztcbn1cbmV4cG9ydCBmdW5jdGlvbiBzZXRGaWxlU3lzdGVtKGZpbGVTeXN0ZW06IEZpbGVTeXN0ZW0pIHtcbiAgZnMgPSBmaWxlU3lzdGVtO1xufVxuXG4vKipcbiAqIENvbnZlcnQgdGhlIHBhdGggYHBhdGhgIHRvIGFuIGBBYnNvbHV0ZUZzUGF0aGAsIHRocm93aW5nIGFuIGVycm9yIGlmIGl0J3Mgbm90IGFuIGFic29sdXRlIHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhYnNvbHV0ZUZyb20ocGF0aDogc3RyaW5nKTogQWJzb2x1dGVGc1BhdGgge1xuICBpZiAoIWZzLmlzUm9vdGVkKHBhdGgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBFcnJvcjogYWJzb2x1dGVGcm9tKCR7cGF0aH0pOiBwYXRoIGlzIG5vdCBhYnNvbHV0ZWApO1xuICB9XG4gIHJldHVybiBmcy5yZXNvbHZlKHBhdGgpO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgYW4gYEFic29sdXRlRnNQYXRoYCBmcm9tIGEgYHRzLlNvdXJjZUZpbGVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZjogdHMuU291cmNlRmlsZSk6IEFic29sdXRlRnNQYXRoIHtcbiAgcmV0dXJuIGZzLnJlc29sdmUoc2YuZmlsZU5hbWUpO1xufVxuXG4vKipcbiAqIENvbnZlcnQgdGhlIHBhdGggYHBhdGhgIHRvIGEgYFBhdGhTZWdtZW50YCwgdGhyb3dpbmcgYW4gZXJyb3IgaWYgaXQncyBub3QgYSByZWxhdGl2ZSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmVGcm9tKHBhdGg6IHN0cmluZyk6IFBhdGhTZWdtZW50IHtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMocGF0aCk7XG4gIGlmIChmcy5pc1Jvb3RlZChub3JtYWxpemVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IHJlbGF0aXZlRnJvbSgke3BhdGh9KTogcGF0aCBpcyBub3QgcmVsYXRpdmVgKTtcbiAgfVxuICByZXR1cm4gbm9ybWFsaXplZCBhcyBQYXRoU2VnbWVudDtcbn1cblxuLyoqXG4gKiBTdGF0aWMgYWNjZXNzIHRvIGBkaXJuYW1lYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpcm5hbWU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KGZpbGU6IFQpOiBUIHtcbiAgcmV0dXJuIGZzLmRpcm5hbWUoZmlsZSk7XG59XG5cbi8qKlxuICogU3RhdGljIGFjY2VzcyB0byBgam9pbmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luPFQgZXh0ZW5kcyBQYXRoU3RyaW5nPihiYXNlUGF0aDogVCwgLi4ucGF0aHM6IHN0cmluZ1tdKTogVCB7XG4gIHJldHVybiBmcy5qb2luKGJhc2VQYXRoLCAuLi5wYXRocyk7XG59XG5cbi8qKlxuICogU3RhdGljIGFjY2VzcyB0byBgcmVzb2x2ZWBzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZShiYXNlUGF0aDogc3RyaW5nLCAuLi5wYXRoczogc3RyaW5nW10pOiBBYnNvbHV0ZUZzUGF0aCB7XG4gIHJldHVybiBmcy5yZXNvbHZlKGJhc2VQYXRoLCAuLi5wYXRocyk7XG59XG5cbi8qKiBSZXR1cm5zIHRydWUgd2hlbiB0aGUgcGF0aCBwcm92aWRlZCBpcyB0aGUgcm9vdCBwYXRoLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUm9vdChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICByZXR1cm4gZnMuaXNSb290KHBhdGgpO1xufVxuXG4vKipcbiAqIFN0YXRpYyBhY2Nlc3MgdG8gYGlzUm9vdGVkYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUm9vdGVkKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZnMuaXNSb290ZWQocGF0aCk7XG59XG5cbi8qKlxuICogU3RhdGljIGFjY2VzcyB0byBgcmVsYXRpdmVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmU8VCBleHRlbmRzIFBhdGhTdHJpbmc+KGZyb206IFQsIHRvOiBUKTogUGF0aFNlZ21lbnQge1xuICByZXR1cm4gZnMucmVsYXRpdmUoZnJvbSwgdG8pO1xufVxuXG4vKipcbiAqIFN0YXRpYyBhY2Nlc3MgdG8gYGJhc2VuYW1lYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2VuYW1lKGZpbGVQYXRoOiBQYXRoU3RyaW5nLCBleHRlbnNpb24/OiBzdHJpbmcpOiBQYXRoU2VnbWVudCB7XG4gIHJldHVybiBmcy5iYXNlbmFtZShmaWxlUGF0aCwgZXh0ZW5zaW9uKSBhcyBQYXRoU2VnbWVudDtcbn1cbiJdfQ==