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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhdGgvc3JjL3R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJCQUE2QjtJQUc3QixzRUFBMkQ7SUF3QjNEOztPQUVHO0lBQ1UsUUFBQSxjQUFjLEdBQUc7UUFDNUI7O1dBRUc7UUFDSCxJQUFJLEVBQUUsVUFBUyxHQUFXO1lBQ3hCLElBQU0sVUFBVSxHQUFHLDBCQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxxQkFBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHlDQUF1QyxHQUFHLDRCQUF5QixDQUFDLENBQUM7YUFDdEY7WUFDRCxPQUFPLFVBQTRCLENBQUM7UUFDdEMsQ0FBQztRQUVEOztXQUVHO1FBQ0gsYUFBYSxFQUFFLFVBQVMsR0FBVyxJQUFvQixPQUFPLEdBQXFCLENBQUMsQ0FBQSxDQUFDO1FBRXJGOzs7OztXQUtHO1FBQ0gsY0FBYyxFQUFFLFVBQVMsRUFBaUI7WUFDeEMsMkNBQTJDO1lBQzNDLE9BQU8sRUFBRSxDQUFDLFFBQTBCLENBQUM7UUFDdkMsQ0FBQztRQUVEOztXQUVHO1FBQ0gsT0FBTyxFQUFFLFVBQVMsSUFBb0IsSUFDakIsT0FBTyxzQkFBYyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDO1FBRTlFOztXQUVHO1FBQ0gsSUFBSSxFQUFFLFVBQVMsUUFBd0I7O1lBQUUsZUFBa0I7aUJBQWxCLFVBQWtCLEVBQWxCLHFCQUFrQixFQUFsQixJQUFrQjtnQkFBbEIsOEJBQWtCOztZQUN0QyxPQUFPLHNCQUFjLENBQUMsYUFBYSxDQUFDLENBQUEsS0FBQSxJQUFJLENBQUMsS0FBSyxDQUFBLENBQUMsSUFBSSw2QkFBQyxRQUFRLEdBQUssS0FBSyxHQUFFLENBQUM7UUFBQSxDQUFDO1FBRS9GOztXQUVHO1FBQ0gsT0FBTyxFQUFFLFVBQVMsUUFBZ0I7WUFBRSxlQUFrQjtpQkFBbEIsVUFBa0IsRUFBbEIscUJBQWtCLEVBQWxCLElBQWtCO2dCQUFsQiw4QkFBa0I7O1lBQ2pDLE9BQU8sc0JBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sT0FBWixJQUFJLG9CQUFTLFFBQVEsR0FBSyxLQUFLLEdBQUUsQ0FBQztRQUFBLENBQUM7S0FDcEYsQ0FBQztJQUVGOztPQUVHO0lBQ1UsUUFBQSxXQUFXLEdBQUc7UUFDekI7O1dBRUc7UUFDSCxVQUFVLEVBQUUsVUFBUyxHQUFXO1lBQzlCLElBQU0sVUFBVSxHQUFHLDBCQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVDLElBQUkscUJBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBMEMsR0FBRyw0QkFBeUIsQ0FBQyxDQUFDO2FBQ3pGO1lBQ0QsT0FBTyxVQUF5QixDQUFDO1FBQ25DLENBQUM7UUFFRDs7V0FFRztRQUNILGFBQWEsRUFBRSxVQUFTLEdBQVcsSUFBaUIsT0FBTyxHQUFrQixDQUFDLENBQUEsQ0FBQztRQUUvRTs7V0FFRztRQUNILFFBQVEsRUFBRSxVQUFTLElBQW9CLEVBQUUsRUFBa0IsSUFDekMsT0FBTyxtQkFBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQztRQUUxRSxRQUFRLEVBQUUsVUFBUyxRQUFnQixFQUFFLFNBQWtCLElBQ3JDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFnQixDQUFDLENBQUEsQ0FBQztLQUM3RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2lzQWJzb2x1dGVQYXRoLCBub3JtYWxpemVTZXBhcmF0b3JzfSBmcm9tICcuL3V0aWwnO1xuXG4vKipcbiAqIEEgYHN0cmluZ2AgcmVwcmVzZW50aW5nIGEgc3BlY2lmaWMgdHlwZSBvZiBwYXRoLCB3aXRoIGEgcGFydGljdWxhciBicmFuZCBgQmAuXG4gKlxuICogQSBgc3RyaW5nYCBpcyBub3QgYXNzaWduYWJsZSB0byBhIGBCcmFuZGVkUGF0aGAsIGJ1dCBhIGBCcmFuZGVkUGF0aGAgaXMgYXNzaWduYWJsZSB0byBhIGBzdHJpbmdgLlxuICogVHdvIGBCcmFuZGVkUGF0aGBzIHdpdGggZGlmZmVyZW50IGJyYW5kcyBhcmUgbm90IG11dHVhbGx5IGFzc2lnbmFibGUuXG4gKi9cbmV4cG9ydCB0eXBlIEJyYW5kZWRQYXRoPEIgZXh0ZW5kcyBzdHJpbmc+ID0gc3RyaW5nICYge1xuICBfYnJhbmQ6IEI7XG59O1xuXG4vKipcbiAqIEEgZnVsbHkgcXVhbGlmaWVkIHBhdGggaW4gdGhlIGZpbGUgc3lzdGVtLCBpbiBQT1NJWCBmb3JtLlxuICovXG5leHBvcnQgdHlwZSBBYnNvbHV0ZUZzUGF0aCA9IEJyYW5kZWRQYXRoPCdBYnNvbHV0ZUZzUGF0aCc+O1xuXG4vKipcbiAqIEEgcGF0aCB0aGF0J3MgcmVsYXRpdmUgdG8gYW5vdGhlciAodW5zcGVjaWZpZWQpIHJvb3QuXG4gKlxuICogVGhpcyBkb2VzIG5vdCBuZWNlc3NhcmlseSBoYXZlIHRvIHJlZmVyIHRvIGEgcGh5c2ljYWwgZmlsZS5cbiAqL1xuZXhwb3J0IHR5cGUgUGF0aFNlZ21lbnQgPSBCcmFuZGVkUGF0aDwnUGF0aFNlZ21lbnQnPjtcblxuLyoqXG4gKiBDb250YWlucyB1dGlsaXR5IGZ1bmN0aW9ucyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBgQWJzb2x1dGVGc1BhdGhgcy5cbiAqL1xuZXhwb3J0IGNvbnN0IEFic29sdXRlRnNQYXRoID0ge1xuICAvKipcbiAgICogQ29udmVydCB0aGUgcGF0aCBgc3RyYCB0byBhbiBgQWJzb2x1dGVGc1BhdGhgLCB0aHJvd2luZyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgKi9cbiAgZnJvbTogZnVuY3Rpb24oc3RyOiBzdHJpbmcpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoc3RyKTtcbiAgICBpZiAoIWlzQWJzb2x1dGVQYXRoKG5vcm1hbGl6ZWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludGVybmFsIEVycm9yOiBBYnNvbHV0ZUZzUGF0aC5mcm9tKCR7c3RyfSk6IHBhdGggaXMgbm90IGFic29sdXRlYCk7XG4gICAgfVxuICAgIHJldHVybiBub3JtYWxpemVkIGFzIEFic29sdXRlRnNQYXRoO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBc3N1bWUgdGhhdCB0aGUgcGF0aCBgc3RyYCBpcyBhbiBgQWJzb2x1dGVGc1BhdGhgIGluIHRoZSBjb3JyZWN0IGZvcm1hdCBhbHJlYWR5LlxuICAgKi9cbiAgZnJvbVVuY2hlY2tlZDogZnVuY3Rpb24oc3RyOiBzdHJpbmcpOiBBYnNvbHV0ZUZzUGF0aCB7IHJldHVybiBzdHIgYXMgQWJzb2x1dGVGc1BhdGg7fSxcblxuICAvKipcbiAgICogRXh0cmFjdCBhbiBgQWJzb2x1dGVGc1BhdGhgIGZyb20gYSBgdHMuU291cmNlRmlsZWAuXG4gICAqXG4gICAqIFRoaXMgaXMgY2hlYXBlciB0aGFuIGNhbGxpbmcgYEFic29sdXRlRnNQYXRoLmZyb20oc2YuZmlsZU5hbWUpYCwgYXMgc291cmNlIGZpbGVzIGFscmVhZHkgaGF2ZVxuICAgKiB0aGVpciBmaWxlIHBhdGggaW4gYWJzb2x1dGUgUE9TSVggZm9ybWF0LlxuICAgKi9cbiAgZnJvbVNvdXJjZUZpbGU6IGZ1bmN0aW9uKHNmOiB0cy5Tb3VyY2VGaWxlKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIC8vIHRzLlNvdXJjZUZpbGUgcGF0aHMgYXJlIGFsd2F5cyBhYnNvbHV0ZS5cbiAgICByZXR1cm4gc2YuZmlsZU5hbWUgYXMgQWJzb2x1dGVGc1BhdGg7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGBwYXRoLmRpcm5hbWVgIHRoYXQgcmV0dXJucyBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgKi9cbiAgZGlybmFtZTogZnVuY3Rpb24oZmlsZTogQWJzb2x1dGVGc1BhdGgpOlxuICAgICAgQWJzb2x1dGVGc1BhdGggeyByZXR1cm4gQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChwYXRoLmRpcm5hbWUoZmlsZSkpO30sXG5cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGBwYXRoLmpvaW5gIHRoYXQgcmV0dXJucyBhbiBhYnNvbHV0ZSBwYXRoLlxuICAgKi9cbiAgam9pbjogZnVuY3Rpb24oYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLCAuLi5wYXRoczogc3RyaW5nW10pOlxuICAgICAgQWJzb2x1dGVGc1BhdGggeyByZXR1cm4gQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChwYXRoLnBvc2l4LmpvaW4oYmFzZVBhdGgsIC4uLnBhdGhzKSk7fSxcblxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHBhdGgucmVzb2x2ZWAgdGhhdCByZXR1cm5zIGFuIGFic29sdXRlIHBhdGhzLlxuICAgKi9cbiAgcmVzb2x2ZTogZnVuY3Rpb24oYmFzZVBhdGg6IHN0cmluZywgLi4ucGF0aHM6IHN0cmluZ1tdKTpcbiAgICAgIEFic29sdXRlRnNQYXRoIHsgcmV0dXJuIEFic29sdXRlRnNQYXRoLmZyb20ocGF0aC5yZXNvbHZlKGJhc2VQYXRoLCAuLi5wYXRocykpO30sXG59O1xuXG4vKipcbiAqIENvbnRhaW5zIHV0aWxpdHkgZnVuY3Rpb25zIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIGBQYXRoU2VnbWVudGBzLlxuICovXG5leHBvcnQgY29uc3QgUGF0aFNlZ21lbnQgPSB7XG4gIC8qKlxuICAgKiBDb252ZXJ0IHRoZSBwYXRoIGBzdHJgIHRvIGEgYFBhdGhTZWdtZW50YCwgdGhyb3dpbmcgYW4gZXJyb3IgaWYgaXQncyBub3QgYSByZWxhdGl2ZSBwYXRoLlxuICAgKi9cbiAgZnJvbUZzUGF0aDogZnVuY3Rpb24oc3RyOiBzdHJpbmcpOiBQYXRoU2VnbWVudCB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVNlcGFyYXRvcnMoc3RyKTtcbiAgICBpZiAoaXNBYnNvbHV0ZVBhdGgobm9ybWFsaXplZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IFBhdGhTZWdtZW50LmZyb21Gc1BhdGgoJHtzdHJ9KTogcGF0aCBpcyBub3QgcmVsYXRpdmVgKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vcm1hbGl6ZWQgYXMgUGF0aFNlZ21lbnQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENvbnZlcnQgdGhlIHBhdGggYHN0cmAgdG8gYSBgUGF0aFNlZ21lbnRgLCB3aGlsZSBhc3N1bWluZyB0aGF0IGBzdHJgIGlzIGFscmVhZHkgbm9ybWFsaXplZC5cbiAgICovXG4gIGZyb21VbmNoZWNrZWQ6IGZ1bmN0aW9uKHN0cjogc3RyaW5nKTogUGF0aFNlZ21lbnQgeyByZXR1cm4gc3RyIGFzIFBhdGhTZWdtZW50O30sXG5cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGBwYXRoLnJlbGF0aXZlYCB0aGF0IHJldHVybnMgYSBgUGF0aFNlZ21lbnRgLlxuICAgKi9cbiAgcmVsYXRpdmU6IGZ1bmN0aW9uKGZyb206IEFic29sdXRlRnNQYXRoLCB0bzogQWJzb2x1dGVGc1BhdGgpOlxuICAgICAgUGF0aFNlZ21lbnQgeyByZXR1cm4gUGF0aFNlZ21lbnQuZnJvbUZzUGF0aChwYXRoLnJlbGF0aXZlKGZyb20sIHRvKSk7fSxcblxuICBiYXNlbmFtZTogZnVuY3Rpb24oZmlsZVBhdGg6IHN0cmluZywgZXh0ZW5zaW9uPzogc3RyaW5nKTpcbiAgICAgIFBhdGhTZWdtZW50IHsgcmV0dXJuIHBhdGguYmFzZW5hbWUoZmlsZVBhdGgsIGV4dGVuc2lvbikgYXMgUGF0aFNlZ21lbnQ7fVxufTtcbiJdfQ==