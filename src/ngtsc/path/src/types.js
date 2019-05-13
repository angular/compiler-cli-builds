(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/path/src/types", ["require", "exports", "tslib", "path", "@angular/compiler-cli/src/ngtsc/path/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var path = require("path");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/path/src/util");
    /**
     * Contains utility functions for creating and manipulating `AbsoluteFsPath`s.
     */
    exports.AbsoluteFsPath = {
        /**
         * Convert the path `str` to an `AbsoluteFsPath`, throwing an error if it's not an absolute path.
         */
        from: function (str) {
            if (str.startsWith('/') && process.platform === 'win32') {
                // in Windows if it's absolute path and starts with `/` we shall
                // resolve it and return it including the drive.
                str = path.resolve(str);
            }
            var normalized = util_1.normalizeSeparators(str);
            if (!util_1.isAbsolutePath(normalized)) {
                throw new Error("Internal Error: AbsoluteFsPath.from(" + str + "): path is not absolute");
            }
            return normalized;
        },
        /**
         * Assume that the path `str` is an `AbsoluteFsPath` in the correct format already.
         */
        fromUnchecked: function (str) { return str; },
        /**
         * Extract an `AbsoluteFsPath` from a `ts.SourceFile`.
         *
         * This is cheaper than calling `AbsoluteFsPath.from(sf.fileName)`, as source files already have
         * their file path in absolute POSIX format.
         */
        fromSourceFile: function (sf) {
            // ts.SourceFile paths are always absolute.
            return sf.fileName;
        },
        /**
         * Wrapper around `path.dirname` that returns an absolute path.
         */
        dirname: function (file) { return exports.AbsoluteFsPath.fromUnchecked(path.dirname(file)); },
        /**
         * Wrapper around `path.join` that returns an absolute path.
         */
        join: function (basePath) {
            var _a;
            var paths = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                paths[_i - 1] = arguments[_i];
            }
            return exports.AbsoluteFsPath.fromUnchecked((_a = path.posix).join.apply(_a, tslib_1.__spread([basePath], paths)));
        },
        /**
         * Wrapper around `path.resolve` that returns an absolute paths.
         */
        resolve: function (basePath) {
            var paths = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                paths[_i - 1] = arguments[_i];
            }
            return exports.AbsoluteFsPath.from(path.resolve.apply(path, tslib_1.__spread([basePath], paths)));
        },
        /** Returns true when the path provided is the root path. */
        isRoot: function (path) { return exports.AbsoluteFsPath.dirname(path) === path; },
    };
    /**
     * Contains utility functions for creating and manipulating `PathSegment`s.
     */
    exports.PathSegment = {
        /**
         * Convert the path `str` to a `PathSegment`, throwing an error if it's not a relative path.
         */
        fromFsPath: function (str) {
            var normalized = util_1.normalizeSeparators(str);
            if (util_1.isAbsolutePath(normalized)) {
                throw new Error("Internal Error: PathSegment.fromFsPath(" + str + "): path is not relative");
            }
            return normalized;
        },
        /**
         * Convert the path `str` to a `PathSegment`, while assuming that `str` is already normalized.
         */
        fromUnchecked: function (str) { return str; },
        /**
         * Wrapper around `path.relative` that returns a `PathSegment`.
         */
        relative: function (from, to) { return exports.PathSegment.fromFsPath(path.relative(from, to)); },
        basename: function (filePath, extension) { return path.basename(filePath, extension); }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhdGgvc3JjL3R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJCQUE2QjtJQUc3QixzRUFBMkQ7SUF3QjNEOztPQUVHO0lBQ1UsUUFBQSxjQUFjLEdBQUc7UUFDNUI7O1dBRUc7UUFDSCxJQUFJLEVBQUUsVUFBUyxHQUFXO1lBQ3hCLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRTtnQkFDdkQsZ0VBQWdFO2dCQUNoRSxnREFBZ0Q7Z0JBQ2hELEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3pCO1lBRUQsSUFBTSxVQUFVLEdBQUcsMEJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLHFCQUFjLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXVDLEdBQUcsNEJBQXlCLENBQUMsQ0FBQzthQUN0RjtZQUNELE9BQU8sVUFBNEIsQ0FBQztRQUN0QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxhQUFhLEVBQUUsVUFBUyxHQUFXLElBQW9CLE9BQU8sR0FBcUIsQ0FBQyxDQUFBLENBQUM7UUFFckY7Ozs7O1dBS0c7UUFDSCxjQUFjLEVBQUUsVUFBUyxFQUFpQjtZQUN4QywyQ0FBMkM7WUFDM0MsT0FBTyxFQUFFLENBQUMsUUFBMEIsQ0FBQztRQUN2QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxPQUFPLEVBQUUsVUFBUyxJQUFvQixJQUNqQixPQUFPLHNCQUFjLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUM7UUFFOUU7O1dBRUc7UUFDSCxJQUFJLEVBQUUsVUFBUyxRQUF3Qjs7WUFBRSxlQUFrQjtpQkFBbEIsVUFBa0IsRUFBbEIscUJBQWtCLEVBQWxCLElBQWtCO2dCQUFsQiw4QkFBa0I7O1lBQ3RDLE9BQU8sc0JBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQSxLQUFBLElBQUksQ0FBQyxLQUFLLENBQUEsQ0FBQyxJQUFJLDZCQUFDLFFBQVEsR0FBSyxLQUFLLEdBQUUsQ0FBQztRQUFBLENBQUM7UUFFL0Y7O1dBRUc7UUFDSCxPQUFPLEVBQUUsVUFBUyxRQUFnQjtZQUFFLGVBQWtCO2lCQUFsQixVQUFrQixFQUFsQixxQkFBa0IsRUFBbEIsSUFBa0I7Z0JBQWxCLDhCQUFrQjs7WUFDakMsT0FBTyxzQkFBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxPQUFaLElBQUksb0JBQVMsUUFBUSxHQUFLLEtBQUssR0FBRSxDQUFDO1FBQUEsQ0FBQztRQUVuRiw0REFBNEQ7UUFDNUQsTUFBTSxFQUFFLFVBQVMsSUFBb0IsSUFBYSxPQUFPLHNCQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFBLENBQUM7S0FDakcsQ0FBQztJQUVGOztPQUVHO0lBQ1UsUUFBQSxXQUFXLEdBQUc7UUFDekI7O1dBRUc7UUFDSCxVQUFVLEVBQUUsVUFBUyxHQUFXO1lBQzlCLElBQU0sVUFBVSxHQUFHLDBCQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVDLElBQUkscUJBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBMEMsR0FBRyw0QkFBeUIsQ0FBQyxDQUFDO2FBQ3pGO1lBQ0QsT0FBTyxVQUF5QixDQUFDO1FBQ25DLENBQUM7UUFFRDs7V0FFRztRQUNILGFBQWEsRUFBRSxVQUFTLEdBQVcsSUFBaUIsT0FBTyxHQUFrQixDQUFDLENBQUEsQ0FBQztRQUUvRTs7V0FFRztRQUNILFFBQVEsRUFBRSxVQUFTLElBQW9CLEVBQUUsRUFBa0IsSUFDekMsT0FBTyxtQkFBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQztRQUUxRSxRQUFRLEVBQUUsVUFBUyxRQUFnQixFQUFFLFNBQWtCLElBQ3JDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFnQixDQUFDLENBQUEsQ0FBQztLQUM3RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lzQWJzb2x1dGVQYXRoLCBub3JtYWxpemVTZXBhcmF0b3JzfSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIEEgYHN0cmluZ2AgcmVwcmVzZW50aW5nIGEgc3BlY2lmaWMgdHlwZSBvZiBwYXRoLCB3aXRoIGEgcGFydGljdWxhciBicmFuZCBgQmAuXG4gKlxuICogQSBgc3RyaW5nYCBpcyBub3QgYXNzaWduYWJsZSB0byBhIGBCcmFuZGVkUGF0aGAsIGJ1dCBhIGBCcmFuZGVkUGF0aGAgaXMgYXNzaWduYWJsZSB0byBhIGBzdHJpbmdgLlxuICogVHdvIGBCcmFuZGVkUGF0aGBzIHdpdGggZGlmZmVyZW50IGJyYW5kcyBhcmUgbm90IG11dHVhbGx5IGFzc2lnbmFibGUuXG4gKi9cbmV4cG9ydCB0eXBlIEJyYW5kZWRQYXRoPEIgZXh0ZW5kcyBzdHJpbmc+ID0gc3RyaW5nICYge1xuICBfYnJhbmQ6IEI7XG59O1xuXG4vKipcbiAqIEEgZnVsbHkgcXVhbGlmaWVkIHBhdGggaW4gdGhlIGZpbGUgc3lzdGVtLCBpbiBQT1NJWCBmb3JtLlxuICovXG5leHBvcnQgdHlwZSBBYnNvbHV0ZUZzUGF0aCA9IEJyYW5kZWRQYXRoPCdBYnNvbHV0ZUZzUGF0aCc+O1xuXG4vKipcbiAqIEEgcGF0aCB0aGF0J3MgcmVsYXRpdmUgdG8gYW5vdGhlciAodW5zcGVjaWZpZWQpIHJvb3QuXG4gKlxuICogVGhpcyBkb2VzIG5vdCBuZWNlc3NhcmlseSBoYXZlIHRvIHJlZmVyIHRvIGEgcGh5c2ljYWwgZmlsZS5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aFNlZ21lbnQgPSBCcmFuZGVkUGF0aDwnUGF0aFNlZ21lbnQnPjtcblxuLyoqXG4gKiBDb250YWlucyB1dGlsaXR5IGZ1bmN0aW9ucyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBgQWJzb2x1dGVGc1BhdGhgcy5cbiAqL1xuZXhwb3J0IGNvbnN0IEFic29sdXRlRnNQYXRoID0ge1xuICAvKipcbiAgICogQ29udmVydCB0aGUgcGF0aCBgc3RyYCB0byBhbiBgQWJzb2x1dGVGc1BhdGhgLCB0aHJvd2luZyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgKi9cbiAgZnJvbTogZnVuY3Rpb24oc3RyOiBzdHJpbmcpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgaWYgKHN0ci5zdGFydHNXaXRoKCcvJykgJiYgcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgICAgLy8gaW4gV2luZG93cyBpZiBpdCdzIGFic29sdXRlIHBhdGggYW5kIHN0YXJ0cyB3aXRoIGAvYCB3ZSBzaGFsbFxuICAgICAgLy8gcmVzb2x2ZSBpdCBhbmQgcmV0dXJuIGl0IGluY2x1ZGluZyB0aGUgZHJpdmUuXG4gICAgICBzdHIgPSBwYXRoLnJlc29sdmUoc3RyKTtcbiAgICB9XG5cbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplU2VwYXJhdG9ycyhzdHIpO1xuICAgIGlmICghaXNBYnNvbHV0ZVBhdGgobm9ybWFsaXplZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IEFic29sdXRlRnNQYXRoLmZyb20oJHtzdHJ9KTogcGF0aCBpcyBub3QgYWJzb2x1dGVgKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vcm1hbGl6ZWQgYXMgQWJzb2x1dGVGc1BhdGg7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFzc3VtZSB0aGF0IHRoZSBwYXRoIGBzdHJgIGlzIGFuIGBBYnNvbHV0ZUZzUGF0aGAgaW4gdGhlIGNvcnJlY3QgZm9ybWF0IGFscmVhZHkuXG4gICAqL1xuICBmcm9tVW5jaGVja2VkOiBmdW5jdGlvbihzdHI6IHN0cmluZyk6IEFic29sdXRlRnNQYXRoIHsgcmV0dXJuIHN0ciBhcyBBYnNvbHV0ZUZzUGF0aDt9LFxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGFuIGBBYnNvbHV0ZUZzUGF0aGAgZnJvbSBhIGB0cy5Tb3VyY2VGaWxlYC5cbiAgICpcbiAgICogVGhpcyBpcyBjaGVhcGVyIHRoYW4gY2FsbGluZyBgQWJzb2x1dGVGc1BhdGguZnJvbShzZi5maWxlTmFtZSlgLCBhcyBzb3VyY2UgZmlsZXMgYWxyZWFkeSBoYXZlXG4gICAqIHRoZWlyIGZpbGUgcGF0aCBpbiBhYnNvbHV0ZSBQT1NJWCBmb3JtYXQuXG4gICAqL1xuICBmcm9tU291cmNlRmlsZTogZnVuY3Rpb24oc2Y6IHRzLlNvdXJjZUZpbGUpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgLy8gdHMuU291cmNlRmlsZSBwYXRocyBhcmUgYWx3YXlzIGFic29sdXRlLlxuICAgIHJldHVybiBzZi5maWxlTmFtZSBhcyBBYnNvbHV0ZUZzUGF0aDtcbiAgfSxcblxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHBhdGguZGlybmFtZWAgdGhhdCByZXR1cm5zIGFuIGFic29sdXRlIHBhdGguXG4gICAqL1xuICBkaXJuYW1lOiBmdW5jdGlvbihmaWxlOiBBYnNvbHV0ZUZzUGF0aCk6XG4gICAgICBBYnNvbHV0ZUZzUGF0aCB7IHJldHVybiBBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKHBhdGguZGlybmFtZShmaWxlKSk7fSxcblxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHBhdGguam9pbmAgdGhhdCByZXR1cm5zIGFuIGFic29sdXRlIHBhdGguXG4gICAqL1xuICBqb2luOiBmdW5jdGlvbihiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIC4uLnBhdGhzOiBzdHJpbmdbXSk6XG4gICAgICBBYnNvbHV0ZUZzUGF0aCB7IHJldHVybiBBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKHBhdGgucG9zaXguam9pbihiYXNlUGF0aCwgLi4ucGF0aHMpKTt9LFxuXG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgcGF0aC5yZXNvbHZlYCB0aGF0IHJldHVybnMgYW4gYWJzb2x1dGUgcGF0aHMuXG4gICAqL1xuICByZXNvbHZlOiBmdW5jdGlvbihiYXNlUGF0aDogc3RyaW5nLCAuLi5wYXRoczogc3RyaW5nW10pOlxuICAgICAgQWJzb2x1dGVGc1BhdGggeyByZXR1cm4gQWJzb2x1dGVGc1BhdGguZnJvbShwYXRoLnJlc29sdmUoYmFzZVBhdGgsIC4uLnBhdGhzKSk7fSxcblxuICAvKiogUmV0dXJucyB0cnVlIHdoZW4gdGhlIHBhdGggcHJvdmlkZWQgaXMgdGhlIHJvb3QgcGF0aC4gKi9cbiAgaXNSb290OiBmdW5jdGlvbihwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4geyByZXR1cm4gQWJzb2x1dGVGc1BhdGguZGlybmFtZShwYXRoKSA9PT0gcGF0aDt9LFxufTtcblxuLyoqXG4gKiBDb250YWlucyB1dGlsaXR5IGZ1bmN0aW9ucyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBgUGF0aFNlZ21lbnRgcy5cbiAqL1xuZXhwb3J0IGNvbnN0IFBhdGhTZWdtZW50ID0ge1xuICAvKipcbiAgICogQ29udmVydCB0aGUgcGF0aCBgc3RyYCB0byBhIGBQYXRoU2VnbWVudGAsIHRocm93aW5nIGFuIGVycm9yIGlmIGl0J3Mgbm90IGEgcmVsYXRpdmUgcGF0aC5cbiAgICovXG4gIGZyb21Gc1BhdGg6IGZ1bmN0aW9uKHN0cjogc3RyaW5nKTogUGF0aFNlZ21lbnQge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVTZXBhcmF0b3JzKHN0cik7XG4gICAgaWYgKGlzQWJzb2x1dGVQYXRoKG5vcm1hbGl6ZWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIEVycm9yOiBQYXRoU2VnbWVudC5mcm9tRnNQYXRoKCR7c3RyfSk6IHBhdGggaXMgbm90IHJlbGF0aXZlYCk7XG4gICAgfVxuICAgIHJldHVybiBub3JtYWxpemVkIGFzIFBhdGhTZWdtZW50O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IHRoZSBwYXRoIGBzdHJgIHRvIGEgYFBhdGhTZWdtZW50YCwgd2hpbGUgYXNzdW1pbmcgdGhhdCBgc3RyYCBpcyBhbHJlYWR5IG5vcm1hbGl6ZWQuXG4gICAqL1xuICBmcm9tVW5jaGVja2VkOiBmdW5jdGlvbihzdHI6IHN0cmluZyk6IFBhdGhTZWdtZW50IHsgcmV0dXJuIHN0ciBhcyBQYXRoU2VnbWVudDt9LFxuXG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgcGF0aC5yZWxhdGl2ZWAgdGhhdCByZXR1cm5zIGEgYFBhdGhTZWdtZW50YC5cbiAgICovXG4gIHJlbGF0aXZlOiBmdW5jdGlvbihmcm9tOiBBYnNvbHV0ZUZzUGF0aCwgdG86IEFic29sdXRlRnNQYXRoKTpcbiAgICAgIFBhdGhTZWdtZW50IHsgcmV0dXJuIFBhdGhTZWdtZW50LmZyb21Gc1BhdGgocGF0aC5yZWxhdGl2ZShmcm9tLCB0bykpO30sXG5cbiAgYmFzZW5hbWU6IGZ1bmN0aW9uKGZpbGVQYXRoOiBzdHJpbmcsIGV4dGVuc2lvbj86IHN0cmluZyk6XG4gICAgICBQYXRoU2VnbWVudCB7IHJldHVybiBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoLCBleHRlbnNpb24pIGFzIFBhdGhTZWdtZW50O31cbn07XG4iXX0=