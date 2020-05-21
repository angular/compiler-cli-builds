(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/file_system/src/logical", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system/src/helpers", "@angular/compiler-cli/src/ngtsc/file_system/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LogicalFileSystem = exports.LogicalProjectPath = void 0;
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
            this.rootDirs = rootDirs.concat([]).sort(function (a, b) { return b.length - a.length; });
            this.canonicalRootDirs =
                this.rootDirs.map(function (dir) { return _this.compilerHost.getCanonicalFileName(dir); });
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
            var canonicalFilePath = this.compilerHost.getCanonicalFileName(physicalFile);
            if (!this.cache.has(canonicalFilePath)) {
                var logicalFile = null;
                for (var i = 0; i < this.rootDirs.length; i++) {
                    var rootDir = this.rootDirs[i];
                    var canonicalRootDir = this.canonicalRootDirs[i];
                    if (isWithinBasePath(canonicalRootDir, canonicalFilePath)) {
                        // Note that we match against canonical paths but then create the logical path from
                        // original paths.
                        logicalFile = this.createLogicalProjectPath(physicalFile, rootDir);
                        // The logical project does not include any special "node_modules" nested directories.
                        if (logicalFile.indexOf('/node_modules/') !== -1) {
                            logicalFile = null;
                        }
                        else {
                            break;
                        }
                    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naWNhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2xvZ2ljYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBU0EsbUZBQW1FO0lBRW5FLDZFQUFzQztJQVl6QixRQUFBLGtCQUFrQixHQUFHO1FBQ2hDOzs7OztXQUtHO1FBQ0gsbUJBQW1CLEVBQUUsVUFBUyxJQUF3QixFQUFFLEVBQXNCO1lBQzVFLElBQUksWUFBWSxHQUFHLGtCQUFRLENBQUMsaUJBQU8sQ0FBQyxpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsaUJBQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNuQyxZQUFZLEdBQUcsQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFnQixDQUFDO2FBQ3JEO1lBQ0QsT0FBTyxZQUEyQixDQUFDO1FBQ3JDLENBQUM7S0FDRixDQUFDO0lBRUY7OztPQUdHO0lBQ0g7UUFrQkUsMkJBQVksUUFBMEIsRUFBVSxZQUE2QjtZQUE3RSxpQkFNQztZQU4rQyxpQkFBWSxHQUFaLFlBQVksQ0FBaUI7WUFON0U7OztlQUdHO1lBQ0ssVUFBSyxHQUFpRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBR3RFLDhGQUE4RjtZQUM5RiwrRUFBK0U7WUFDL0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQW5CLENBQW1CLENBQUMsQ0FBQztZQUN4RSxJQUFJLENBQUMsaUJBQWlCO2dCQUNsQixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEtBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFtQixFQUE3RCxDQUE2RCxDQUFDLENBQUM7UUFDOUYsQ0FBQztRQUVEOzs7OztXQUtHO1FBQ0gsMkNBQWUsR0FBZixVQUFnQixFQUFpQjtZQUMvQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBWSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUM7UUFFRDs7Ozs7V0FLRztRQUNILDZDQUFpQixHQUFqQixVQUFrQixZQUE0QjtZQUM1QyxJQUFNLGlCQUFpQixHQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLFlBQVksQ0FBbUIsQ0FBQztZQUMzRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRTtnQkFDdEMsSUFBSSxXQUFXLEdBQTRCLElBQUksQ0FBQztnQkFDaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUM3QyxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNqQyxJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbkQsSUFBSSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFO3dCQUN6RCxtRkFBbUY7d0JBQ25GLGtCQUFrQjt3QkFDbEIsV0FBVyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7d0JBQ25FLHNGQUFzRjt3QkFDdEYsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7NEJBQ2hELFdBQVcsR0FBRyxJQUFJLENBQUM7eUJBQ3BCOzZCQUFNOzRCQUNMLE1BQU07eUJBQ1A7cUJBQ0Y7aUJBQ0Y7Z0JBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDaEQ7WUFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFFLENBQUM7UUFDNUMsQ0FBQztRQUVPLG9EQUF3QixHQUFoQyxVQUFpQyxJQUFvQixFQUFFLE9BQXVCO1lBRTVFLElBQU0sV0FBVyxHQUFHLHFCQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoRSxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsV0FBVyxDQUF1QixDQUFDO1FBQy9GLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUF4RUQsSUF3RUM7SUF4RVksOENBQWlCO0lBMEU5Qjs7O09BR0c7SUFDSCxTQUFTLGdCQUFnQixDQUFDLElBQW9CLEVBQUUsSUFBb0I7UUFDbEUsT0FBTyxDQUFDLGtCQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBkaXJuYW1lLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEJyYW5kZWRQYXRoLCBQYXRoU2VnbWVudH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge3N0cmlwRXh0ZW5zaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5cblxuLyoqXG4gKiBBIHBhdGggdGhhdCdzIHJlbGF0aXZlIHRvIHRoZSBsb2dpY2FsIHJvb3Qgb2YgYSBUeXBlU2NyaXB0IHByb2plY3QgKG9uZSBvZiB0aGUgcHJvamVjdCdzXG4gKiByb290RGlycykuXG4gKlxuICogUGF0aHMgaW4gdGhlIHR5cGUgc3lzdGVtIHVzZSBQT1NJWCBmb3JtYXQuXG4gKi9cbmV4cG9ydCB0eXBlIExvZ2ljYWxQcm9qZWN0UGF0aCA9IEJyYW5kZWRQYXRoPCdMb2dpY2FsUHJvamVjdFBhdGgnPjtcblxuZXhwb3J0IGNvbnN0IExvZ2ljYWxQcm9qZWN0UGF0aCA9IHtcbiAgLyoqXG4gICAqIEdldCB0aGUgcmVsYXRpdmUgcGF0aCBiZXR3ZWVuIHR3byBgTG9naWNhbFByb2plY3RQYXRoYHMuXG4gICAqXG4gICAqIFRoaXMgd2lsbCByZXR1cm4gYSBgUGF0aFNlZ21lbnRgIHdoaWNoIHdvdWxkIGJlIGEgdmFsaWQgbW9kdWxlIHNwZWNpZmllciB0byB1c2UgaW4gYGZyb21gIHdoZW5cbiAgICogaW1wb3J0aW5nIGZyb20gYHRvYC5cbiAgICovXG4gIHJlbGF0aXZlUGF0aEJldHdlZW46IGZ1bmN0aW9uKGZyb206IExvZ2ljYWxQcm9qZWN0UGF0aCwgdG86IExvZ2ljYWxQcm9qZWN0UGF0aCk6IFBhdGhTZWdtZW50IHtcbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gcmVsYXRpdmUoZGlybmFtZShyZXNvbHZlKGZyb20pKSwgcmVzb2x2ZSh0bykpO1xuICAgIGlmICghcmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoJy4uLycpKSB7XG4gICAgICByZWxhdGl2ZVBhdGggPSAoJy4vJyArIHJlbGF0aXZlUGF0aCkgYXMgUGF0aFNlZ21lbnQ7XG4gICAgfVxuICAgIHJldHVybiByZWxhdGl2ZVBhdGggYXMgUGF0aFNlZ21lbnQ7XG4gIH0sXG59O1xuXG4vKipcbiAqIEEgdXRpbGl0eSBjbGFzcyB3aGljaCBjYW4gdHJhbnNsYXRlIGFic29sdXRlIHBhdGhzIHRvIHNvdXJjZSBmaWxlcyBpbnRvIGxvZ2ljYWwgcGF0aHMgaW5cbiAqIFR5cGVTY3JpcHQncyBsb2dpY2FsIGZpbGUgc3lzdGVtLCBiYXNlZCBvbiB0aGUgcm9vdCBkaXJlY3RvcmllcyBvZiB0aGUgcHJvamVjdC5cbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2ljYWxGaWxlU3lzdGVtIHtcbiAgLyoqXG4gICAqIFRoZSByb290IGRpcmVjdG9yaWVzIG9mIHRoZSBwcm9qZWN0LCBzb3J0ZWQgd2l0aCB0aGUgbG9uZ2VzdCBwYXRoIGZpcnN0LlxuICAgKi9cbiAgcHJpdmF0ZSByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXTtcblxuICAvKipcbiAgICogVGhlIHNhbWUgcm9vdCBkaXJlY3RvcmllcyBhcyBgcm9vdERpcnNgIGJ1dCB3aXRoIGVhY2ggb25lIGNvbnZlcnRlZCB0byBpdHNcbiAgICogY2Fub25pY2FsIGZvcm0gZm9yIG1hdGNoaW5nIGluIGNhc2UtaW5zZW5zaXRpdmUgZmlsZS1zeXN0ZW1zLlxuICAgKi9cbiAgcHJpdmF0ZSBjYW5vbmljYWxSb290RGlyczogQWJzb2x1dGVGc1BhdGhbXTtcblxuICAvKipcbiAgICogQSBjYWNoZSBvZiBmaWxlIHBhdGhzIHRvIHByb2plY3QgcGF0aHMsIGJlY2F1c2UgY29tcHV0YXRpb24gb2YgdGhlc2UgcGF0aHMgaXMgc2xpZ2h0bHlcbiAgICogZXhwZW5zaXZlLlxuICAgKi9cbiAgcHJpdmF0ZSBjYWNoZTogTWFwPEFic29sdXRlRnNQYXRoLCBMb2dpY2FsUHJvamVjdFBhdGh8bnVsbD4gPSBuZXcgTWFwKCk7XG5cbiAgY29uc3RydWN0b3Iocm9vdERpcnM6IEFic29sdXRlRnNQYXRoW10sIHByaXZhdGUgY29tcGlsZXJIb3N0OiB0cy5Db21waWxlckhvc3QpIHtcbiAgICAvLyBNYWtlIGEgY29weSBhbmQgc29ydCBpdCBieSBsZW5ndGggaW4gcmV2ZXJzZSBvcmRlciAobG9uZ2VzdCBmaXJzdCkuIFRoaXMgc3BlZWRzIHVwIGxvb2t1cHMsXG4gICAgLy8gc2luY2UgdGhlcmUncyBubyBuZWVkIHRvIGtlZXAgZ29pbmcgdGhyb3VnaCB0aGUgYXJyYXkgb25jZSBhIG1hdGNoIGlzIGZvdW5kLlxuICAgIHRoaXMucm9vdERpcnMgPSByb290RGlycy5jb25jYXQoW10pLnNvcnQoKGEsIGIpID0+IGIubGVuZ3RoIC0gYS5sZW5ndGgpO1xuICAgIHRoaXMuY2Fub25pY2FsUm9vdERpcnMgPVxuICAgICAgICB0aGlzLnJvb3REaXJzLm1hcChkaXIgPT4gdGhpcy5jb21waWxlckhvc3QuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZGlyKSBhcyBBYnNvbHV0ZUZzUGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBsb2dpY2FsIHBhdGggaW4gdGhlIHByb2plY3Qgb2YgYSBgdHMuU291cmNlRmlsZWAuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHByb3ZpZGVkIGFzIGEgY29udmVuaWVudCBhbHRlcm5hdGl2ZSB0byBjYWxsaW5nXG4gICAqIGBsb2dpY2FsUGF0aE9mRmlsZShhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKSlgLlxuICAgKi9cbiAgbG9naWNhbFBhdGhPZlNmKHNmOiB0cy5Tb3VyY2VGaWxlKTogTG9naWNhbFByb2plY3RQYXRofG51bGwge1xuICAgIHJldHVybiB0aGlzLmxvZ2ljYWxQYXRoT2ZGaWxlKGFic29sdXRlRnJvbShzZi5maWxlTmFtZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbG9naWNhbCBwYXRoIGluIHRoZSBwcm9qZWN0IG9mIGEgc291cmNlIGZpbGUuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgYExvZ2ljYWxQcm9qZWN0UGF0aGAgdG8gdGhlIHNvdXJjZSBmaWxlLCBvciBgbnVsbGAgaWYgdGhlIHNvdXJjZSBmaWxlIGlzIG5vdCBpbiBhbnlcbiAgICogb2YgdGhlIFRTIHByb2plY3QncyByb290IGRpcmVjdG9yaWVzLlxuICAgKi9cbiAgbG9naWNhbFBhdGhPZkZpbGUocGh5c2ljYWxGaWxlOiBBYnNvbHV0ZUZzUGF0aCk6IExvZ2ljYWxQcm9qZWN0UGF0aHxudWxsIHtcbiAgICBjb25zdCBjYW5vbmljYWxGaWxlUGF0aCA9XG4gICAgICAgIHRoaXMuY29tcGlsZXJIb3N0LmdldENhbm9uaWNhbEZpbGVOYW1lKHBoeXNpY2FsRmlsZSkgYXMgQWJzb2x1dGVGc1BhdGg7XG4gICAgaWYgKCF0aGlzLmNhY2hlLmhhcyhjYW5vbmljYWxGaWxlUGF0aCkpIHtcbiAgICAgIGxldCBsb2dpY2FsRmlsZTogTG9naWNhbFByb2plY3RQYXRofG51bGwgPSBudWxsO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnJvb3REaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHJvb3REaXIgPSB0aGlzLnJvb3REaXJzW2ldO1xuICAgICAgICBjb25zdCBjYW5vbmljYWxSb290RGlyID0gdGhpcy5jYW5vbmljYWxSb290RGlyc1tpXTtcbiAgICAgICAgaWYgKGlzV2l0aGluQmFzZVBhdGgoY2Fub25pY2FsUm9vdERpciwgY2Fub25pY2FsRmlsZVBhdGgpKSB7XG4gICAgICAgICAgLy8gTm90ZSB0aGF0IHdlIG1hdGNoIGFnYWluc3QgY2Fub25pY2FsIHBhdGhzIGJ1dCB0aGVuIGNyZWF0ZSB0aGUgbG9naWNhbCBwYXRoIGZyb21cbiAgICAgICAgICAvLyBvcmlnaW5hbCBwYXRocy5cbiAgICAgICAgICBsb2dpY2FsRmlsZSA9IHRoaXMuY3JlYXRlTG9naWNhbFByb2plY3RQYXRoKHBoeXNpY2FsRmlsZSwgcm9vdERpcik7XG4gICAgICAgICAgLy8gVGhlIGxvZ2ljYWwgcHJvamVjdCBkb2VzIG5vdCBpbmNsdWRlIGFueSBzcGVjaWFsIFwibm9kZV9tb2R1bGVzXCIgbmVzdGVkIGRpcmVjdG9yaWVzLlxuICAgICAgICAgIGlmIChsb2dpY2FsRmlsZS5pbmRleE9mKCcvbm9kZV9tb2R1bGVzLycpICE9PSAtMSkge1xuICAgICAgICAgICAgbG9naWNhbEZpbGUgPSBudWxsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhbm9uaWNhbEZpbGVQYXRoLCBsb2dpY2FsRmlsZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNhY2hlLmdldChjYW5vbmljYWxGaWxlUGF0aCkhO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVMb2dpY2FsUHJvamVjdFBhdGgoZmlsZTogQWJzb2x1dGVGc1BhdGgsIHJvb3REaXI6IEFic29sdXRlRnNQYXRoKTpcbiAgICAgIExvZ2ljYWxQcm9qZWN0UGF0aCB7XG4gICAgY29uc3QgbG9naWNhbFBhdGggPSBzdHJpcEV4dGVuc2lvbihmaWxlLnN1YnN0cihyb290RGlyLmxlbmd0aCkpO1xuICAgIHJldHVybiAobG9naWNhbFBhdGguc3RhcnRzV2l0aCgnLycpID8gbG9naWNhbFBhdGggOiAnLycgKyBsb2dpY2FsUGF0aCkgYXMgTG9naWNhbFByb2plY3RQYXRoO1xuICB9XG59XG5cbi8qKlxuICogSXMgdGhlIGBwYXRoYCBhIGRlc2NlbmRhbnQgb2YgdGhlIGBiYXNlYD9cbiAqIEUuZy4gYGZvby9iYXIvemVlYCBpcyB3aXRoaW4gYGZvby9iYXJgIGJ1dCBub3Qgd2l0aGluIGBmb28vY2FyYC5cbiAqL1xuZnVuY3Rpb24gaXNXaXRoaW5CYXNlUGF0aChiYXNlOiBBYnNvbHV0ZUZzUGF0aCwgcGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgcmV0dXJuICFyZWxhdGl2ZShiYXNlLCBwYXRoKS5zdGFydHNXaXRoKCcuLicpO1xufVxuIl19