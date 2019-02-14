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
        define("@angular/compiler-cli/src/ngtsc/path/src/types", ["require", "exports", "@angular/compiler-cli/src/ngtsc/path/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
            if (!normalized.startsWith('/')) {
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
            if (normalized.startsWith('/')) {
                throw new Error("Internal Error: PathSegment.from(" + str + "): path is not relative");
            }
            return normalized;
        },
        /**
         * Convert the path `str` to a `PathSegment`, while assuming that `str` is already normalized.
         */
        fromUnchecked: function (str) { return str; },
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3BhdGgvc3JjL3R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBSUgsc0VBQTJDO0lBd0IzQzs7T0FFRztJQUNVLFFBQUEsY0FBYyxHQUFHO1FBQzVCOztXQUVHO1FBQ0gsSUFBSSxFQUFFLFVBQVMsR0FBVztZQUN4QixJQUFNLFVBQVUsR0FBRywwQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBdUMsR0FBRyw0QkFBeUIsQ0FBQyxDQUFDO2FBQ3RGO1lBQ0QsT0FBTyxVQUE0QixDQUFDO1FBQ3RDLENBQUM7UUFFRDs7V0FFRztRQUNILGFBQWEsRUFBRSxVQUFTLEdBQVcsSUFBb0IsT0FBTyxHQUFxQixDQUFDLENBQUEsQ0FBQztRQUVyRjs7Ozs7V0FLRztRQUNILGNBQWMsRUFBRSxVQUFTLEVBQWlCO1lBQ3hDLDJDQUEyQztZQUMzQyxPQUFPLEVBQUUsQ0FBQyxRQUEwQixDQUFDO1FBQ3ZDLENBQUM7S0FDRixDQUFDO0lBRUY7O09BRUc7SUFDVSxRQUFBLFdBQVcsR0FBRztRQUN6Qjs7V0FFRztRQUNILFVBQVUsRUFBRSxVQUFTLEdBQVc7WUFDOUIsSUFBTSxVQUFVLEdBQUcsMEJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUMsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFvQyxHQUFHLDRCQUF5QixDQUFDLENBQUM7YUFDbkY7WUFDRCxPQUFPLFVBQXlCLENBQUM7UUFDbkMsQ0FBQztRQUVEOztXQUVHO1FBQ0gsYUFBYSxFQUFFLFVBQVMsR0FBVyxJQUFpQixPQUFPLEdBQWtCLENBQUMsQ0FBQSxDQUFDO0tBQ2hGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge25vcm1hbGl6ZVNlcGFyYXRvcnN9IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogQSBgc3RyaW5nYCByZXByZXNlbnRpbmcgYSBzcGVjaWZpYyB0eXBlIG9mIHBhdGgsIHdpdGggYSBwYXJ0aWN1bGFyIGJyYW5kIGBCYC5cbiAqXG4gKiBBIGBzdHJpbmdgIGlzIG5vdCBhc3NpZ25hYmxlIHRvIGEgYEJyYW5kZWRQYXRoYCwgYnV0IGEgYEJyYW5kZWRQYXRoYCBpcyBhc3NpZ25hYmxlIHRvIGEgYHN0cmluZ2AuXG4gKiBUd28gYEJyYW5kZWRQYXRoYHMgd2l0aCBkaWZmZXJlbnQgYnJhbmRzIGFyZSBub3QgbXV0dWFsbHkgYXNzaWduYWJsZS5cbiAqL1xuZXhwb3J0IHR5cGUgQnJhbmRlZFBhdGg8QiBleHRlbmRzIHN0cmluZz4gPSBzdHJpbmcgJiB7XG4gIF9icmFuZDogQjtcbn07XG5cbi8qKlxuICogQSBmdWxseSBxdWFsaWZpZWQgcGF0aCBpbiB0aGUgZmlsZSBzeXN0ZW0sIGluIFBPU0lYIGZvcm0uXG4gKi9cbmV4cG9ydCB0eXBlIEFic29sdXRlRnNQYXRoID0gQnJhbmRlZFBhdGg8J0Fic29sdXRlRnNQYXRoJz47XG5cbi8qKlxuICogQSBwYXRoIHRoYXQncyByZWxhdGl2ZSB0byBhbm90aGVyICh1bnNwZWNpZmllZCkgcm9vdC5cbiAqXG4gKiBUaGlzIGRvZXMgbm90IG5lY2Vzc2FyaWx5IGhhdmUgdG8gcmVmZXIgdG8gYSBwaHlzaWNhbCBmaWxlLlxuICovXG5leHBvcnQgdHlwZSBQYXRoU2VnbWVudCA9IEJyYW5kZWRQYXRoPCdQYXRoU2VnbWVudCc+O1xuXG4vKipcbiAqIENvbnRhaW5zIHV0aWxpdHkgZnVuY3Rpb25zIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIGBBYnNvbHV0ZUZzUGF0aGBzLlxuICovXG5leHBvcnQgY29uc3QgQWJzb2x1dGVGc1BhdGggPSB7XG4gIC8qKlxuICAgKiBDb252ZXJ0IHRoZSBwYXRoIGBzdHJgIHRvIGFuIGBBYnNvbHV0ZUZzUGF0aGAsIHRocm93aW5nIGFuIGVycm9yIGlmIGl0J3Mgbm90IGFuIGFic29sdXRlIHBhdGguXG4gICAqL1xuICBmcm9tOiBmdW5jdGlvbihzdHI6IHN0cmluZyk6IEFic29sdXRlRnNQYXRoIHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplU2VwYXJhdG9ycyhzdHIpO1xuICAgIGlmICghbm9ybWFsaXplZC5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgRXJyb3I6IEFic29sdXRlRnNQYXRoLmZyb20oJHtzdHJ9KTogcGF0aCBpcyBub3QgYWJzb2x1dGVgKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vcm1hbGl6ZWQgYXMgQWJzb2x1dGVGc1BhdGg7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFzc3VtZSB0aGF0IHRoZSBwYXRoIGBzdHJgIGlzIGFuIGBBYnNvbHV0ZUZzUGF0aGAgaW4gdGhlIGNvcnJlY3QgZm9ybWF0IGFscmVhZHkuXG4gICAqL1xuICBmcm9tVW5jaGVja2VkOiBmdW5jdGlvbihzdHI6IHN0cmluZyk6IEFic29sdXRlRnNQYXRoIHsgcmV0dXJuIHN0ciBhcyBBYnNvbHV0ZUZzUGF0aDt9LFxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGFuIGBBYnNvbHV0ZUZzUGF0aGAgZnJvbSBhIGB0cy5Tb3VyY2VGaWxlYC5cbiAgICpcbiAgICogVGhpcyBpcyBjaGVhcGVyIHRoYW4gY2FsbGluZyBgQWJzb2x1dGVGc1BhdGguZnJvbShzZi5maWxlTmFtZSlgLCBhcyBzb3VyY2UgZmlsZXMgYWxyZWFkeSBoYXZlXG4gICAqIHRoZWlyIGZpbGUgcGF0aCBpbiBhYnNvbHV0ZSBQT1NJWCBmb3JtYXQuXG4gICAqL1xuICBmcm9tU291cmNlRmlsZTogZnVuY3Rpb24oc2Y6IHRzLlNvdXJjZUZpbGUpOiBBYnNvbHV0ZUZzUGF0aCB7XG4gICAgLy8gdHMuU291cmNlRmlsZSBwYXRocyBhcmUgYWx3YXlzIGFic29sdXRlLlxuICAgIHJldHVybiBzZi5maWxlTmFtZSBhcyBBYnNvbHV0ZUZzUGF0aDtcbiAgfSxcbn07XG5cbi8qKlxuICogQ29udGFpbnMgdXRpbGl0eSBmdW5jdGlvbnMgZm9yIGNyZWF0aW5nIGFuZCBtYW5pcHVsYXRpbmcgYFBhdGhTZWdtZW50YHMuXG4gKi9cbmV4cG9ydCBjb25zdCBQYXRoU2VnbWVudCA9IHtcbiAgLyoqXG4gICAqIENvbnZlcnQgdGhlIHBhdGggYHN0cmAgdG8gYSBgUGF0aFNlZ21lbnRgLCB0aHJvd2luZyBhbiBlcnJvciBpZiBpdCdzIG5vdCBhIHJlbGF0aXZlIHBhdGguXG4gICAqL1xuICBmcm9tRnNQYXRoOiBmdW5jdGlvbihzdHI6IHN0cmluZyk6IFBhdGhTZWdtZW50IHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplU2VwYXJhdG9ycyhzdHIpO1xuICAgIGlmIChub3JtYWxpemVkLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnRlcm5hbCBFcnJvcjogUGF0aFNlZ21lbnQuZnJvbSgke3N0cn0pOiBwYXRoIGlzIG5vdCByZWxhdGl2ZWApO1xuICAgIH1cbiAgICByZXR1cm4gbm9ybWFsaXplZCBhcyBQYXRoU2VnbWVudDtcbiAgfSxcblxuICAvKipcbiAgICogQ29udmVydCB0aGUgcGF0aCBgc3RyYCB0byBhIGBQYXRoU2VnbWVudGAsIHdoaWxlIGFzc3VtaW5nIHRoYXQgYHN0cmAgaXMgYWxyZWFkeSBub3JtYWxpemVkLlxuICAgKi9cbiAgZnJvbVVuY2hlY2tlZDogZnVuY3Rpb24oc3RyOiBzdHJpbmcpOiBQYXRoU2VnbWVudCB7IHJldHVybiBzdHIgYXMgUGF0aFNlZ21lbnQ7fSxcbn07XG4iXX0=