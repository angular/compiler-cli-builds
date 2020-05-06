(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/src/logical", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system/src/helpers", "@angular/compiler-cli/src/ngtsc/file_system/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var helpers_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/helpers");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/util");
    exports.LogicalProjectPath = {
        /**
         * Get the relative path between two `LogicalProjectPath`s.
         *
         * This will return a `PathSegment` which would be a valid module specifier to use in `from` when
         * importing from `to`.
         */
        relativePathBetween: function (from, to) {
            var relativePath = helpers_1.relative(helpers_1.dirname(helpers_1.resolve(from)), helpers_1.resolve(to));
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
        function LogicalFileSystem(rootDirs, compilerHost) {
            var _this = this;
            this.compilerHost = compilerHost;
            /**
             * A cache of file paths to project paths, because computation of these paths is slightly
             * expensive.
             */
            this.cache = new Map();
            // Make a copy and sort it by length in reverse order (longest first). This speeds up lookups,
            // since there's no need to keep going through the array once a match is found.
            this.rootDirs =
                rootDirs.map(function (dir) { return _this.compilerHost.getCanonicalFileName(dir); })
                    .concat([])
                    .sort(function (a, b) { return b.length - a.length; });
        }
        /**
         * Get the logical path in the project of a `ts.SourceFile`.
         *
         * This method is provided as a convenient alternative to calling
         * `logicalPathOfFile(absoluteFromSourceFile(sf))`.
         */
        LogicalFileSystem.prototype.logicalPathOfSf = function (sf) {
            return this.logicalPathOfFile(helpers_1.absoluteFrom(sf.fileName));
        };
        /**
         * Get the logical path in the project of a source file.
         *
         * @returns A `LogicalProjectPath` to the source file, or `null` if the source file is not in any
         * of the TS project's root directories.
         */
        LogicalFileSystem.prototype.logicalPathOfFile = function (physicalFile) {
            var e_1, _a;
            var canonicalFilePath = this.compilerHost.getCanonicalFileName(physicalFile);
            if (!this.cache.has(canonicalFilePath)) {
                var logicalFile = null;
                try {
                    for (var _b = tslib_1.__values(this.rootDirs), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var rootDir = _c.value;
                        if (isWithinBasePath(rootDir, canonicalFilePath)) {
                            logicalFile = this.createLogicalProjectPath(canonicalFilePath, rootDir);
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
                this.cache.set(canonicalFilePath, logicalFile);
            }
            return this.cache.get(canonicalFilePath);
        };
        LogicalFileSystem.prototype.createLogicalProjectPath = function (file, rootDir) {
            var logicalPath = util_1.stripExtension(file.substr(rootDir.length));
            return (logicalPath.startsWith('/') ? logicalPath : '/' + logicalPath);
        };
        return LogicalFileSystem;
    }());
    exports.LogicalFileSystem = LogicalFileSystem;
    /**
     * Is the `path` a descendant of the `base`?
     * E.g. `foo/bar/zee` is within `foo/bar` but not within `foo/car`.
     */
    function isWithinBasePath(base, path) {
        return !helpers_1.relative(base, path).startsWith('..');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naWNhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2xvZ2ljYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBU0EsbUZBQW1FO0lBRW5FLDZFQUFzQztJQVl6QixRQUFBLGtCQUFrQixHQUFHO1FBQ2hDOzs7OztXQUtHO1FBQ0gsbUJBQW1CLEVBQUUsVUFBUyxJQUF3QixFQUFFLEVBQXNCO1lBQzVFLElBQUksWUFBWSxHQUFHLGtCQUFRLENBQUMsaUJBQU8sQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsaUJBQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNuQyxZQUFZLEdBQUcsQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFnQixDQUFDO2FBQ3JEO1lBQ0QsT0FBTyxZQUEyQixDQUFDO1FBQ3JDLENBQUM7S0FDRixDQUFDO0lBRUY7OztPQUdHO0lBQ0g7UUFZRSwyQkFBWSxRQUEwQixFQUFVLFlBQTZCO1lBQTdFLGlCQU9DO1lBUCtDLGlCQUFZLEdBQVosWUFBWSxDQUFpQjtZQU43RTs7O2VBR0c7WUFDSyxVQUFLLEdBQWlELElBQUksR0FBRyxFQUFFLENBQUM7WUFHdEUsOEZBQThGO1lBQzlGLCtFQUErRTtZQUMvRSxJQUFJLENBQUMsUUFBUTtnQkFDVCxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsS0FBSSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQW1CLEVBQTdELENBQTZELENBQUM7cUJBQzdFLE1BQU0sQ0FBQyxFQUFFLENBQUM7cUJBQ1YsSUFBSSxDQUFDLFVBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSyxPQUFBLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBbkIsQ0FBbUIsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRDs7Ozs7V0FLRztRQUNILDJDQUFlLEdBQWYsVUFBZ0IsRUFBaUI7WUFDL0IsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsc0JBQVksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDSCw2Q0FBaUIsR0FBakIsVUFBa0IsWUFBNEI7O1lBQzVDLElBQU0saUJBQWlCLEdBQ25CLElBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFtQixDQUFDO1lBQzNFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO2dCQUN0QyxJQUFJLFdBQVcsR0FBNEIsSUFBSSxDQUFDOztvQkFDaEQsS0FBc0IsSUFBQSxLQUFBLGlCQUFBLElBQUksQ0FBQyxRQUFRLENBQUEsZ0JBQUEsNEJBQUU7d0JBQWhDLElBQU0sT0FBTyxXQUFBO3dCQUNoQixJQUFJLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxFQUFFOzRCQUNoRCxXQUFXLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxDQUFDOzRCQUN4RSxzRkFBc0Y7NEJBQ3RGLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dDQUNoRCxXQUFXLEdBQUcsSUFBSSxDQUFDOzZCQUNwQjtpQ0FBTTtnQ0FDTCxNQUFNOzZCQUNQO3lCQUNGO3FCQUNGOzs7Ozs7Ozs7Z0JBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDaEQ7WUFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFFLENBQUM7UUFDNUMsQ0FBQztRQUVPLG9EQUF3QixHQUFoQyxVQUFpQyxJQUFvQixFQUFFLE9BQXVCO1lBRTVFLElBQU0sV0FBVyxHQUFHLHFCQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoRSxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsV0FBVyxDQUF1QixDQUFDO1FBQy9GLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUEvREQsSUErREM7SUEvRFksOENBQWlCO0lBaUU5Qjs7O09BR0c7SUFDSCxTQUFTLGdCQUFnQixDQUFDLElBQW9CLEVBQUUsSUFBb0I7UUFDbEUsT0FBTyxDQUFDLGtCQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBkaXJuYW1lLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEJyYW5kZWRQYXRoLCBQYXRoU2VnbWVudH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge3N0cmlwRXh0ZW5zaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5cblxuLyoqXG4gKiBBIHBhdGggdGhhdCdzIHJlbGF0aXZlIHRvIHRoZSBsb2dpY2FsIHJvb3Qgb2YgYSBUeXBlU2NyaXB0IHByb2plY3QgKG9uZSBvZiB0aGUgcHJvamVjdCdzXG4gKiByb290RGlycykuXG4gKlxuICogUGF0aHMgaW4gdGhlIHR5cGUgc3lzdGVtIHVzZSBQT1NJWCBmb3JtYXQuXG4gKi9cbmV4cG9ydCB0eXBlIExvZ2ljYWxQcm9qZWN0UGF0aCA9IEJyYW5kZWRQYXRoPCdMb2dpY2FsUHJvamVjdFBhdGgnPjtcblxuZXhwb3J0IGNvbnN0IExvZ2ljYWxQcm9qZWN0UGF0aCA9IHtcbiAgLyoqXG4gICAqIEdldCB0aGUgcmVsYXRpdmUgcGF0aCBiZXR3ZWVuIHR3byBgTG9naWNhbFByb2plY3RQYXRoYHMuXG4gICAqXG4gICAqIFRoaXMgd2lsbCByZXR1cm4gYSBgUGF0aFNlZ21lbnRgIHdoaWNoIHdvdWxkIGJlIGEgdmFsaWQgbW9kdWxlIHNwZWNpZmllciB0byB1c2UgaW4gYGZyb21gIHdoZW5cbiAgICogaW1wb3J0aW5nIGZyb20gYHRvYC5cbiAgICovXG4gIHJlbGF0aXZlUGF0aEJldHdlZW46IGZ1bmN0aW9uKGZyb206IExvZ2ljYWxQcm9qZWN0UGF0aCwgdG86IExvZ2ljYWxQcm9qZWN0UGF0aCk6IFBhdGhTZWdtZW50IHtcbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gcmVsYXRpdmUoZGlybmFtZShyZXNvbHZlKGZyb20pKSwgcmVzb2x2ZSh0bykpO1xuICAgIGlmICghcmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoJy4uLycpKSB7XG4gICAgICByZWxhdGl2ZVBhdGggPSAoJy4vJyArIHJlbGF0aXZlUGF0aCkgYXMgUGF0aFNlZ21lbnQ7XG4gICAgfVxuICAgIHJldHVybiByZWxhdGl2ZVBhdGggYXMgUGF0aFNlZ21lbnQ7XG4gIH0sXG59O1xuXG4vKipcbiAqIEEgdXRpbGl0eSBjbGFzcyB3aGljaCBjYW4gdHJhbnNsYXRlIGFic29sdXRlIHBhdGhzIHRvIHNvdXJjZSBmaWxlcyBpbnRvIGxvZ2ljYWwgcGF0aHMgaW5cbiAqIFR5cGVTY3JpcHQncyBsb2dpY2FsIGZpbGUgc3lzdGVtLCBiYXNlZCBvbiB0aGUgcm9vdCBkaXJlY3RvcmllcyBvZiB0aGUgcHJvamVjdC5cbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2ljYWxGaWxlU3lzdGVtIHtcbiAgLyoqXG4gICAqIFRoZSByb290IGRpcmVjdG9yaWVzIG9mIHRoZSBwcm9qZWN0LCBzb3J0ZWQgd2l0aCB0aGUgbG9uZ2VzdCBwYXRoIGZpcnN0LlxuICAgKi9cbiAgcHJpdmF0ZSByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXTtcblxuICAvKipcbiAgICogQSBjYWNoZSBvZiBmaWxlIHBhdGhzIHRvIHByb2plY3QgcGF0aHMsIGJlY2F1c2UgY29tcHV0YXRpb24gb2YgdGhlc2UgcGF0aHMgaXMgc2xpZ2h0bHlcbiAgICogZXhwZW5zaXZlLlxuICAgKi9cbiAgcHJpdmF0ZSBjYWNoZTogTWFwPEFic29sdXRlRnNQYXRoLCBMb2dpY2FsUHJvamVjdFBhdGh8bnVsbD4gPSBuZXcgTWFwKCk7XG5cbiAgY29uc3RydWN0b3Iocm9vdERpcnM6IEFic29sdXRlRnNQYXRoW10sIHByaXZhdGUgY29tcGlsZXJIb3N0OiB0cy5Db21waWxlckhvc3QpIHtcbiAgICAvLyBNYWtlIGEgY29weSBhbmQgc29ydCBpdCBieSBsZW5ndGggaW4gcmV2ZXJzZSBvcmRlciAobG9uZ2VzdCBmaXJzdCkuIFRoaXMgc3BlZWRzIHVwIGxvb2t1cHMsXG4gICAgLy8gc2luY2UgdGhlcmUncyBubyBuZWVkIHRvIGtlZXAgZ29pbmcgdGhyb3VnaCB0aGUgYXJyYXkgb25jZSBhIG1hdGNoIGlzIGZvdW5kLlxuICAgIHRoaXMucm9vdERpcnMgPVxuICAgICAgICByb290RGlycy5tYXAoZGlyID0+IHRoaXMuY29tcGlsZXJIb3N0LmdldENhbm9uaWNhbEZpbGVOYW1lKGRpcikgYXMgQWJzb2x1dGVGc1BhdGgpXG4gICAgICAgICAgICAuY29uY2F0KFtdKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGIubGVuZ3RoIC0gYS5sZW5ndGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbG9naWNhbCBwYXRoIGluIHRoZSBwcm9qZWN0IG9mIGEgYHRzLlNvdXJjZUZpbGVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpcyBwcm92aWRlZCBhcyBhIGNvbnZlbmllbnQgYWx0ZXJuYXRpdmUgdG8gY2FsbGluZ1xuICAgKiBgbG9naWNhbFBhdGhPZkZpbGUoYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZikpYC5cbiAgICovXG4gIGxvZ2ljYWxQYXRoT2ZTZihzZjogdHMuU291cmNlRmlsZSk6IExvZ2ljYWxQcm9qZWN0UGF0aHxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5sb2dpY2FsUGF0aE9mRmlsZShhYnNvbHV0ZUZyb20oc2YuZmlsZU5hbWUpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxvZ2ljYWwgcGF0aCBpbiB0aGUgcHJvamVjdCBvZiBhIHNvdXJjZSBmaWxlLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIGBMb2dpY2FsUHJvamVjdFBhdGhgIHRvIHRoZSBzb3VyY2UgZmlsZSwgb3IgYG51bGxgIGlmIHRoZSBzb3VyY2UgZmlsZSBpcyBub3QgaW4gYW55XG4gICAqIG9mIHRoZSBUUyBwcm9qZWN0J3Mgcm9vdCBkaXJlY3Rvcmllcy5cbiAgICovXG4gIGxvZ2ljYWxQYXRoT2ZGaWxlKHBoeXNpY2FsRmlsZTogQWJzb2x1dGVGc1BhdGgpOiBMb2dpY2FsUHJvamVjdFBhdGh8bnVsbCB7XG4gICAgY29uc3QgY2Fub25pY2FsRmlsZVBhdGggPVxuICAgICAgICB0aGlzLmNvbXBpbGVySG9zdC5nZXRDYW5vbmljYWxGaWxlTmFtZShwaHlzaWNhbEZpbGUpIGFzIEFic29sdXRlRnNQYXRoO1xuICAgIGlmICghdGhpcy5jYWNoZS5oYXMoY2Fub25pY2FsRmlsZVBhdGgpKSB7XG4gICAgICBsZXQgbG9naWNhbEZpbGU6IExvZ2ljYWxQcm9qZWN0UGF0aHxudWxsID0gbnVsbDtcbiAgICAgIGZvciAoY29uc3Qgcm9vdERpciBvZiB0aGlzLnJvb3REaXJzKSB7XG4gICAgICAgIGlmIChpc1dpdGhpbkJhc2VQYXRoKHJvb3REaXIsIGNhbm9uaWNhbEZpbGVQYXRoKSkge1xuICAgICAgICAgIGxvZ2ljYWxGaWxlID0gdGhpcy5jcmVhdGVMb2dpY2FsUHJvamVjdFBhdGgoY2Fub25pY2FsRmlsZVBhdGgsIHJvb3REaXIpO1xuICAgICAgICAgIC8vIFRoZSBsb2dpY2FsIHByb2plY3QgZG9lcyBub3QgaW5jbHVkZSBhbnkgc3BlY2lhbCBcIm5vZGVfbW9kdWxlc1wiIG5lc3RlZCBkaXJlY3Rvcmllcy5cbiAgICAgICAgICBpZiAobG9naWNhbEZpbGUuaW5kZXhPZignL25vZGVfbW9kdWxlcy8nKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIGxvZ2ljYWxGaWxlID0gbnVsbDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLmNhY2hlLnNldChjYW5vbmljYWxGaWxlUGF0aCwgbG9naWNhbEZpbGUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQoY2Fub25pY2FsRmlsZVBhdGgpITtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlTG9naWNhbFByb2plY3RQYXRoKGZpbGU6IEFic29sdXRlRnNQYXRoLCByb290RGlyOiBBYnNvbHV0ZUZzUGF0aCk6XG4gICAgICBMb2dpY2FsUHJvamVjdFBhdGgge1xuICAgIGNvbnN0IGxvZ2ljYWxQYXRoID0gc3RyaXBFeHRlbnNpb24oZmlsZS5zdWJzdHIocm9vdERpci5sZW5ndGgpKTtcbiAgICByZXR1cm4gKGxvZ2ljYWxQYXRoLnN0YXJ0c1dpdGgoJy8nKSA/IGxvZ2ljYWxQYXRoIDogJy8nICsgbG9naWNhbFBhdGgpIGFzIExvZ2ljYWxQcm9qZWN0UGF0aDtcbiAgfVxufVxuXG4vKipcbiAqIElzIHRoZSBgcGF0aGAgYSBkZXNjZW5kYW50IG9mIHRoZSBgYmFzZWA/XG4gKiBFLmcuIGBmb28vYmFyL3plZWAgaXMgd2l0aGluIGBmb28vYmFyYCBidXQgbm90IHdpdGhpbiBgZm9vL2NhcmAuXG4gKi9cbmZ1bmN0aW9uIGlzV2l0aGluQmFzZVBhdGgoYmFzZTogQWJzb2x1dGVGc1BhdGgsIHBhdGg6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7XG4gIHJldHVybiAhcmVsYXRpdmUoYmFzZSwgcGF0aCkuc3RhcnRzV2l0aCgnLi4nKTtcbn1cbiJdfQ==