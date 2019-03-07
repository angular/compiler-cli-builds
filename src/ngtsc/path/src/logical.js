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
        define("@angular/compiler-cli/src/ngtsc/path/src/logical", ["require", "exports", "tslib", "path", "@angular/compiler-cli/src/ngtsc/path/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /// <reference types="node" />
    var path = require("path");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/path/src/util");
    exports.LogicalProjectPath = {
        /**
         * Get the relative path between two `LogicalProjectPath`s.
         *
         * This will return a `PathSegment` which would be a valid module specifier to use in `from` when
         * importing from `to`.
         */
        relativePathBetween: function (from, to) {
            var relativePath = path.posix.relative(path.posix.dirname(from), to);
            if (!relativePath.startsWith('../')) {
                relativePath = ('./' + relativePath);
            }
            return relativePath;
        },
    };
    /**
     * A utility class which can translate absolute paths to source files into logical paths in
     * TypeScript's logical file system, based on the root directories of the project.
     */
    var LogicalFileSystem = /** @class */ (function () {
        function LogicalFileSystem(rootDirs) {
            /**
             * A cache of file paths to project paths, because computation of these paths is slightly
             * expensive.
             */
            this.cache = new Map();
            // Make a copy and sort it by length in reverse order (longest first). This speeds up lookups,
            // since there's no need to keep going through the array once a match is found.
            this.rootDirs = rootDirs.concat([]).sort(function (a, b) { return b.length - a.length; });
        }
        /**
         * Get the logical path in the project of a `ts.SourceFile`.
         *
         * This method is provided as a convenient alternative to calling
         * `logicalPathOfFile(AbsoluteFsPath.fromSourceFile(sf))`.
         */
        LogicalFileSystem.prototype.logicalPathOfSf = function (sf) {
            return this.logicalPathOfFile(sf.fileName);
        };
        /**
         * Get the logical path in the project of a source file.
         *
         * @returns A `LogicalProjectPath` to the source file, or `null` if the source file is not in any
         * of the TS project's root directories.
         */
        LogicalFileSystem.prototype.logicalPathOfFile = function (physicalFile) {
            var e_1, _a;
            if (!this.cache.has(physicalFile)) {
                var logicalFile = null;
                try {
                    for (var _b = tslib_1.__values(this.rootDirs), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var rootDir = _c.value;
                        if (physicalFile.startsWith(rootDir)) {
                            logicalFile = util_1.stripExtension(physicalFile.substr(rootDir.length));
                            // The logical project does not include any special "node_modules" nested directories.
                            if (logicalFile.indexOf('/node_modules/') !== -1) {
                                logicalFile = null;
                            }
                            else {
                                break;
                            }
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                this.cache.set(physicalFile, logicalFile);
            }
            return this.cache.get(physicalFile);
        };
        return LogicalFileSystem;
    }());
    exports.LogicalFileSystem = LogicalFileSystem;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naWNhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcGF0aC9zcmMvbG9naWNhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4QkFBOEI7SUFDOUIsMkJBQTZCO0lBSzdCLHNFQUFzQztJQVV6QixRQUFBLGtCQUFrQixHQUFHO1FBQ2hDOzs7OztXQUtHO1FBQ0gsbUJBQW1CLEVBQUUsVUFBUyxJQUF3QixFQUFFLEVBQXNCO1lBQzVFLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3JFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNuQyxZQUFZLEdBQUcsQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLENBQUM7YUFDdEM7WUFDRCxPQUFPLFlBQTJCLENBQUM7UUFDckMsQ0FBQztLQUNGLENBQUM7SUFFRjs7O09BR0c7SUFDSDtRQVlFLDJCQUFZLFFBQTBCO1lBTnRDOzs7ZUFHRztZQUNLLFVBQUssR0FBaUQsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUd0RSw4RkFBOEY7WUFDOUYsK0VBQStFO1lBQy9FLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQUEsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFuQixDQUFtQixDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUVEOzs7OztXQUtHO1FBQ0gsMkNBQWUsR0FBZixVQUFnQixFQUFpQjtZQUMvQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsUUFBMEIsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRDs7Ozs7V0FLRztRQUNILDZDQUFpQixHQUFqQixVQUFrQixZQUE0Qjs7WUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNqQyxJQUFJLFdBQVcsR0FBNEIsSUFBSSxDQUFDOztvQkFDaEQsS0FBc0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxRQUFRLENBQUEsZ0JBQUEsNEJBQUU7d0JBQWhDLElBQU0sT0FBTyxXQUFBO3dCQUNoQixJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7NEJBQ3BDLFdBQVcsR0FBRyxxQkFBYyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUF1QixDQUFDOzRCQUN4RixzRkFBc0Y7NEJBQ3RGLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dDQUNoRCxXQUFXLEdBQUcsSUFBSSxDQUFDOzZCQUNwQjtpQ0FBTTtnQ0FDTCxNQUFNOzZCQUNQO3lCQUNGO3FCQUNGOzs7Ozs7Ozs7Z0JBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2FBQzNDO1lBQ0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUcsQ0FBQztRQUN4QyxDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBcERELElBb0RDO0lBcERZLDhDQUFpQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJub2RlXCIgLz5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBCcmFuZGVkUGF0aCwgUGF0aFNlZ21lbnR9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtzdHJpcEV4dGVuc2lvbn0gZnJvbSAnLi91dGlsJztcblxuLyoqXG4gKiBBIHBhdGggdGhhdCdzIHJlbGF0aXZlIHRvIHRoZSBsb2dpY2FsIHJvb3Qgb2YgYSBUeXBlU2NyaXB0IHByb2plY3QgKG9uZSBvZiB0aGUgcHJvamVjdCdzXG4gKiByb290RGlycykuXG4gKlxuICogUGF0aHMgaW4gdGhlIHR5cGUgc3lzdGVtIHVzZSBQT1NJWCBmb3JtYXQuXG4gKi9cbmV4cG9ydCB0eXBlIExvZ2ljYWxQcm9qZWN0UGF0aCA9IEJyYW5kZWRQYXRoPCdMb2dpY2FsUHJvamVjdFBhdGgnPjtcblxuZXhwb3J0IGNvbnN0IExvZ2ljYWxQcm9qZWN0UGF0aCA9IHtcbiAgLyoqXG4gICAqIEdldCB0aGUgcmVsYXRpdmUgcGF0aCBiZXR3ZWVuIHR3byBgTG9naWNhbFByb2plY3RQYXRoYHMuXG4gICAqXG4gICAqIFRoaXMgd2lsbCByZXR1cm4gYSBgUGF0aFNlZ21lbnRgIHdoaWNoIHdvdWxkIGJlIGEgdmFsaWQgbW9kdWxlIHNwZWNpZmllciB0byB1c2UgaW4gYGZyb21gIHdoZW5cbiAgICogaW1wb3J0aW5nIGZyb20gYHRvYC5cbiAgICovXG4gIHJlbGF0aXZlUGF0aEJldHdlZW46IGZ1bmN0aW9uKGZyb206IExvZ2ljYWxQcm9qZWN0UGF0aCwgdG86IExvZ2ljYWxQcm9qZWN0UGF0aCk6IFBhdGhTZWdtZW50IHtcbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gcGF0aC5wb3NpeC5yZWxhdGl2ZShwYXRoLnBvc2l4LmRpcm5hbWUoZnJvbSksIHRvKTtcbiAgICBpZiAoIXJlbGF0aXZlUGF0aC5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgcmVsYXRpdmVQYXRoID0gKCcuLycgKyByZWxhdGl2ZVBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVsYXRpdmVQYXRoIGFzIFBhdGhTZWdtZW50O1xuICB9LFxufTtcblxuLyoqXG4gKiBBIHV0aWxpdHkgY2xhc3Mgd2hpY2ggY2FuIHRyYW5zbGF0ZSBhYnNvbHV0ZSBwYXRocyB0byBzb3VyY2UgZmlsZXMgaW50byBsb2dpY2FsIHBhdGhzIGluXG4gKiBUeXBlU2NyaXB0J3MgbG9naWNhbCBmaWxlIHN5c3RlbSwgYmFzZWQgb24gdGhlIHJvb3QgZGlyZWN0b3JpZXMgb2YgdGhlIHByb2plY3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dpY2FsRmlsZVN5c3RlbSB7XG4gIC8qKlxuICAgKiBUaGUgcm9vdCBkaXJlY3RvcmllcyBvZiB0aGUgcHJvamVjdCwgc29ydGVkIHdpdGggdGhlIGxvbmdlc3QgcGF0aCBmaXJzdC5cbiAgICovXG4gIHByaXZhdGUgcm9vdERpcnM6IEFic29sdXRlRnNQYXRoW107XG5cbiAgLyoqXG4gICAqIEEgY2FjaGUgb2YgZmlsZSBwYXRocyB0byBwcm9qZWN0IHBhdGhzLCBiZWNhdXNlIGNvbXB1dGF0aW9uIG9mIHRoZXNlIHBhdGhzIGlzIHNsaWdodGx5XG4gICAqIGV4cGVuc2l2ZS5cbiAgICovXG4gIHByaXZhdGUgY2FjaGU6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgTG9naWNhbFByb2plY3RQYXRofG51bGw+ID0gbmV3IE1hcCgpO1xuXG4gIGNvbnN0cnVjdG9yKHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdKSB7XG4gICAgLy8gTWFrZSBhIGNvcHkgYW5kIHNvcnQgaXQgYnkgbGVuZ3RoIGluIHJldmVyc2Ugb3JkZXIgKGxvbmdlc3QgZmlyc3QpLiBUaGlzIHNwZWVkcyB1cCBsb29rdXBzLFxuICAgIC8vIHNpbmNlIHRoZXJlJ3Mgbm8gbmVlZCB0byBrZWVwIGdvaW5nIHRocm91Z2ggdGhlIGFycmF5IG9uY2UgYSBtYXRjaCBpcyBmb3VuZC5cbiAgICB0aGlzLnJvb3REaXJzID0gcm9vdERpcnMuY29uY2F0KFtdKS5zb3J0KChhLCBiKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxvZ2ljYWwgcGF0aCBpbiB0aGUgcHJvamVjdCBvZiBhIGB0cy5Tb3VyY2VGaWxlYC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgaXMgcHJvdmlkZWQgYXMgYSBjb252ZW5pZW50IGFsdGVybmF0aXZlIHRvIGNhbGxpbmdcbiAgICogYGxvZ2ljYWxQYXRoT2ZGaWxlKEFic29sdXRlRnNQYXRoLmZyb21Tb3VyY2VGaWxlKHNmKSlgLlxuICAgKi9cbiAgbG9naWNhbFBhdGhPZlNmKHNmOiB0cy5Tb3VyY2VGaWxlKTogTG9naWNhbFByb2plY3RQYXRofG51bGwge1xuICAgIHJldHVybiB0aGlzLmxvZ2ljYWxQYXRoT2ZGaWxlKHNmLmZpbGVOYW1lIGFzIEFic29sdXRlRnNQYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxvZ2ljYWwgcGF0aCBpbiB0aGUgcHJvamVjdCBvZiBhIHNvdXJjZSBmaWxlLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIGBMb2dpY2FsUHJvamVjdFBhdGhgIHRvIHRoZSBzb3VyY2UgZmlsZSwgb3IgYG51bGxgIGlmIHRoZSBzb3VyY2UgZmlsZSBpcyBub3QgaW4gYW55XG4gICAqIG9mIHRoZSBUUyBwcm9qZWN0J3Mgcm9vdCBkaXJlY3Rvcmllcy5cbiAgICovXG4gIGxvZ2ljYWxQYXRoT2ZGaWxlKHBoeXNpY2FsRmlsZTogQWJzb2x1dGVGc1BhdGgpOiBMb2dpY2FsUHJvamVjdFBhdGh8bnVsbCB7XG4gICAgaWYgKCF0aGlzLmNhY2hlLmhhcyhwaHlzaWNhbEZpbGUpKSB7XG4gICAgICBsZXQgbG9naWNhbEZpbGU6IExvZ2ljYWxQcm9qZWN0UGF0aHxudWxsID0gbnVsbDtcbiAgICAgIGZvciAoY29uc3Qgcm9vdERpciBvZiB0aGlzLnJvb3REaXJzKSB7XG4gICAgICAgIGlmIChwaHlzaWNhbEZpbGUuc3RhcnRzV2l0aChyb290RGlyKSkge1xuICAgICAgICAgIGxvZ2ljYWxGaWxlID0gc3RyaXBFeHRlbnNpb24ocGh5c2ljYWxGaWxlLnN1YnN0cihyb290RGlyLmxlbmd0aCkpIGFzIExvZ2ljYWxQcm9qZWN0UGF0aDtcbiAgICAgICAgICAvLyBUaGUgbG9naWNhbCBwcm9qZWN0IGRvZXMgbm90IGluY2x1ZGUgYW55IHNwZWNpYWwgXCJub2RlX21vZHVsZXNcIiBuZXN0ZWQgZGlyZWN0b3JpZXMuXG4gICAgICAgICAgaWYgKGxvZ2ljYWxGaWxlLmluZGV4T2YoJy9ub2RlX21vZHVsZXMvJykgIT09IC0xKSB7XG4gICAgICAgICAgICBsb2dpY2FsRmlsZSA9IG51bGw7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5jYWNoZS5zZXQocGh5c2ljYWxGaWxlLCBsb2dpY2FsRmlsZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNhY2hlLmdldChwaHlzaWNhbEZpbGUpICE7XG4gIH1cbn1cbiJdfQ==