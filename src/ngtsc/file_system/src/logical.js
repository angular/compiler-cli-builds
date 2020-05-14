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
    exports.LogicalFileSystem = exports.LogicalProjectPath = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naWNhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0vc3JjL2xvZ2ljYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQVNBLG1GQUFtRTtJQUVuRSw2RUFBc0M7SUFZekIsUUFBQSxrQkFBa0IsR0FBRztRQUNoQzs7Ozs7V0FLRztRQUNILG1CQUFtQixFQUFFLFVBQVMsSUFBd0IsRUFBRSxFQUFzQjtZQUM1RSxJQUFJLFlBQVksR0FBRyxrQkFBUSxDQUFDLGlCQUFPLENBQUMsaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLGlCQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDbkMsWUFBWSxHQUFHLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBZ0IsQ0FBQzthQUNyRDtZQUNELE9BQU8sWUFBMkIsQ0FBQztRQUNyQyxDQUFDO0tBQ0YsQ0FBQztJQUVGOzs7T0FHRztJQUNIO1FBWUUsMkJBQVksUUFBMEIsRUFBVSxZQUE2QjtZQUE3RSxpQkFPQztZQVArQyxpQkFBWSxHQUFaLFlBQVksQ0FBaUI7WUFON0U7OztlQUdHO1lBQ0ssVUFBSyxHQUFpRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBR3RFLDhGQUE4RjtZQUM5RiwrRUFBK0U7WUFDL0UsSUFBSSxDQUFDLFFBQVE7Z0JBQ1QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEtBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFtQixFQUE3RCxDQUE2RCxDQUFDO3FCQUM3RSxNQUFNLENBQUMsRUFBRSxDQUFDO3FCQUNWLElBQUksQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLElBQUssT0FBQSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQW5CLENBQW1CLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDSCwyQ0FBZSxHQUFmLFVBQWdCLEVBQWlCO1lBQy9CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLHNCQUFZLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUVEOzs7OztXQUtHO1FBQ0gsNkNBQWlCLEdBQWpCLFVBQWtCLFlBQTRCOztZQUM1QyxJQUFNLGlCQUFpQixHQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLFlBQVksQ0FBbUIsQ0FBQztZQUMzRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsRUFBRTtnQkFDdEMsSUFBSSxXQUFXLEdBQTRCLElBQUksQ0FBQzs7b0JBQ2hELEtBQXNCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFBLGdCQUFBLDRCQUFFO3dCQUFoQyxJQUFNLE9BQU8sV0FBQTt3QkFDaEIsSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsRUFBRTs0QkFDaEQsV0FBVyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQzs0QkFDeEUsc0ZBQXNGOzRCQUN0RixJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtnQ0FDaEQsV0FBVyxHQUFHLElBQUksQ0FBQzs2QkFDcEI7aUNBQU07Z0NBQ0wsTUFBTTs2QkFDUDt5QkFDRjtxQkFDRjs7Ozs7Ozs7O2dCQUNELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxDQUFDO2FBQ2hEO1lBQ0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBRSxDQUFDO1FBQzVDLENBQUM7UUFFTyxvREFBd0IsR0FBaEMsVUFBaUMsSUFBb0IsRUFBRSxPQUF1QjtZQUU1RSxJQUFNLFdBQVcsR0FBRyxxQkFBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBdUIsQ0FBQztRQUMvRixDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBL0RELElBK0RDO0lBL0RZLDhDQUFpQjtJQWlFOUI7OztPQUdHO0lBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFvQixFQUFFLElBQW9CO1FBQ2xFLE9BQU8sQ0FBQyxrQkFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbSwgZGlybmFtZSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJy4vaGVscGVycyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBCcmFuZGVkUGF0aCwgUGF0aFNlZ21lbnR9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtzdHJpcEV4dGVuc2lvbn0gZnJvbSAnLi91dGlsJztcblxuXG5cbi8qKlxuICogQSBwYXRoIHRoYXQncyByZWxhdGl2ZSB0byB0aGUgbG9naWNhbCByb290IG9mIGEgVHlwZVNjcmlwdCBwcm9qZWN0IChvbmUgb2YgdGhlIHByb2plY3Qnc1xuICogcm9vdERpcnMpLlxuICpcbiAqIFBhdGhzIGluIHRoZSB0eXBlIHN5c3RlbSB1c2UgUE9TSVggZm9ybWF0LlxuICovXG5leHBvcnQgdHlwZSBMb2dpY2FsUHJvamVjdFBhdGggPSBCcmFuZGVkUGF0aDwnTG9naWNhbFByb2plY3RQYXRoJz47XG5cbmV4cG9ydCBjb25zdCBMb2dpY2FsUHJvamVjdFBhdGggPSB7XG4gIC8qKlxuICAgKiBHZXQgdGhlIHJlbGF0aXZlIHBhdGggYmV0d2VlbiB0d28gYExvZ2ljYWxQcm9qZWN0UGF0aGBzLlxuICAgKlxuICAgKiBUaGlzIHdpbGwgcmV0dXJuIGEgYFBhdGhTZWdtZW50YCB3aGljaCB3b3VsZCBiZSBhIHZhbGlkIG1vZHVsZSBzcGVjaWZpZXIgdG8gdXNlIGluIGBmcm9tYCB3aGVuXG4gICAqIGltcG9ydGluZyBmcm9tIGB0b2AuXG4gICAqL1xuICByZWxhdGl2ZVBhdGhCZXR3ZWVuOiBmdW5jdGlvbihmcm9tOiBMb2dpY2FsUHJvamVjdFBhdGgsIHRvOiBMb2dpY2FsUHJvamVjdFBhdGgpOiBQYXRoU2VnbWVudCB7XG4gICAgbGV0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKGRpcm5hbWUocmVzb2x2ZShmcm9tKSksIHJlc29sdmUodG8pKTtcbiAgICBpZiAoIXJlbGF0aXZlUGF0aC5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgcmVsYXRpdmVQYXRoID0gKCcuLycgKyByZWxhdGl2ZVBhdGgpIGFzIFBhdGhTZWdtZW50O1xuICAgIH1cbiAgICByZXR1cm4gcmVsYXRpdmVQYXRoIGFzIFBhdGhTZWdtZW50O1xuICB9LFxufTtcblxuLyoqXG4gKiBBIHV0aWxpdHkgY2xhc3Mgd2hpY2ggY2FuIHRyYW5zbGF0ZSBhYnNvbHV0ZSBwYXRocyB0byBzb3VyY2UgZmlsZXMgaW50byBsb2dpY2FsIHBhdGhzIGluXG4gKiBUeXBlU2NyaXB0J3MgbG9naWNhbCBmaWxlIHN5c3RlbSwgYmFzZWQgb24gdGhlIHJvb3QgZGlyZWN0b3JpZXMgb2YgdGhlIHByb2plY3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dpY2FsRmlsZVN5c3RlbSB7XG4gIC8qKlxuICAgKiBUaGUgcm9vdCBkaXJlY3RvcmllcyBvZiB0aGUgcHJvamVjdCwgc29ydGVkIHdpdGggdGhlIGxvbmdlc3QgcGF0aCBmaXJzdC5cbiAgICovXG4gIHByaXZhdGUgcm9vdERpcnM6IEFic29sdXRlRnNQYXRoW107XG5cbiAgLyoqXG4gICAqIEEgY2FjaGUgb2YgZmlsZSBwYXRocyB0byBwcm9qZWN0IHBhdGhzLCBiZWNhdXNlIGNvbXB1dGF0aW9uIG9mIHRoZXNlIHBhdGhzIGlzIHNsaWdodGx5XG4gICAqIGV4cGVuc2l2ZS5cbiAgICovXG4gIHByaXZhdGUgY2FjaGU6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgTG9naWNhbFByb2plY3RQYXRofG51bGw+ID0gbmV3IE1hcCgpO1xuXG4gIGNvbnN0cnVjdG9yKHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdLCBwcml2YXRlIGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0KSB7XG4gICAgLy8gTWFrZSBhIGNvcHkgYW5kIHNvcnQgaXQgYnkgbGVuZ3RoIGluIHJldmVyc2Ugb3JkZXIgKGxvbmdlc3QgZmlyc3QpLiBUaGlzIHNwZWVkcyB1cCBsb29rdXBzLFxuICAgIC8vIHNpbmNlIHRoZXJlJ3Mgbm8gbmVlZCB0byBrZWVwIGdvaW5nIHRocm91Z2ggdGhlIGFycmF5IG9uY2UgYSBtYXRjaCBpcyBmb3VuZC5cbiAgICB0aGlzLnJvb3REaXJzID1cbiAgICAgICAgcm9vdERpcnMubWFwKGRpciA9PiB0aGlzLmNvbXBpbGVySG9zdC5nZXRDYW5vbmljYWxGaWxlTmFtZShkaXIpIGFzIEFic29sdXRlRnNQYXRoKVxuICAgICAgICAgICAgLmNvbmNhdChbXSlcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxvZ2ljYWwgcGF0aCBpbiB0aGUgcHJvamVjdCBvZiBhIGB0cy5Tb3VyY2VGaWxlYC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgaXMgcHJvdmlkZWQgYXMgYSBjb252ZW5pZW50IGFsdGVybmF0aXZlIHRvIGNhbGxpbmdcbiAgICogYGxvZ2ljYWxQYXRoT2ZGaWxlKGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpKWAuXG4gICAqL1xuICBsb2dpY2FsUGF0aE9mU2Yoc2Y6IHRzLlNvdXJjZUZpbGUpOiBMb2dpY2FsUHJvamVjdFBhdGh8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubG9naWNhbFBhdGhPZkZpbGUoYWJzb2x1dGVGcm9tKHNmLmZpbGVOYW1lKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBsb2dpY2FsIHBhdGggaW4gdGhlIHByb2plY3Qgb2YgYSBzb3VyY2UgZmlsZS5cbiAgICpcbiAgICogQHJldHVybnMgQSBgTG9naWNhbFByb2plY3RQYXRoYCB0byB0aGUgc291cmNlIGZpbGUsIG9yIGBudWxsYCBpZiB0aGUgc291cmNlIGZpbGUgaXMgbm90IGluIGFueVxuICAgKiBvZiB0aGUgVFMgcHJvamVjdCdzIHJvb3QgZGlyZWN0b3JpZXMuXG4gICAqL1xuICBsb2dpY2FsUGF0aE9mRmlsZShwaHlzaWNhbEZpbGU6IEFic29sdXRlRnNQYXRoKTogTG9naWNhbFByb2plY3RQYXRofG51bGwge1xuICAgIGNvbnN0IGNhbm9uaWNhbEZpbGVQYXRoID1cbiAgICAgICAgdGhpcy5jb21waWxlckhvc3QuZ2V0Q2Fub25pY2FsRmlsZU5hbWUocGh5c2ljYWxGaWxlKSBhcyBBYnNvbHV0ZUZzUGF0aDtcbiAgICBpZiAoIXRoaXMuY2FjaGUuaGFzKGNhbm9uaWNhbEZpbGVQYXRoKSkge1xuICAgICAgbGV0IGxvZ2ljYWxGaWxlOiBMb2dpY2FsUHJvamVjdFBhdGh8bnVsbCA9IG51bGw7XG4gICAgICBmb3IgKGNvbnN0IHJvb3REaXIgb2YgdGhpcy5yb290RGlycykge1xuICAgICAgICBpZiAoaXNXaXRoaW5CYXNlUGF0aChyb290RGlyLCBjYW5vbmljYWxGaWxlUGF0aCkpIHtcbiAgICAgICAgICBsb2dpY2FsRmlsZSA9IHRoaXMuY3JlYXRlTG9naWNhbFByb2plY3RQYXRoKGNhbm9uaWNhbEZpbGVQYXRoLCByb290RGlyKTtcbiAgICAgICAgICAvLyBUaGUgbG9naWNhbCBwcm9qZWN0IGRvZXMgbm90IGluY2x1ZGUgYW55IHNwZWNpYWwgXCJub2RlX21vZHVsZXNcIiBuZXN0ZWQgZGlyZWN0b3JpZXMuXG4gICAgICAgICAgaWYgKGxvZ2ljYWxGaWxlLmluZGV4T2YoJy9ub2RlX21vZHVsZXMvJykgIT09IC0xKSB7XG4gICAgICAgICAgICBsb2dpY2FsRmlsZSA9IG51bGw7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5jYWNoZS5zZXQoY2Fub25pY2FsRmlsZVBhdGgsIGxvZ2ljYWxGaWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KGNhbm9uaWNhbEZpbGVQYXRoKSE7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUxvZ2ljYWxQcm9qZWN0UGF0aChmaWxlOiBBYnNvbHV0ZUZzUGF0aCwgcm9vdERpcjogQWJzb2x1dGVGc1BhdGgpOlxuICAgICAgTG9naWNhbFByb2plY3RQYXRoIHtcbiAgICBjb25zdCBsb2dpY2FsUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKGZpbGUuc3Vic3RyKHJvb3REaXIubGVuZ3RoKSk7XG4gICAgcmV0dXJuIChsb2dpY2FsUGF0aC5zdGFydHNXaXRoKCcvJykgPyBsb2dpY2FsUGF0aCA6ICcvJyArIGxvZ2ljYWxQYXRoKSBhcyBMb2dpY2FsUHJvamVjdFBhdGg7XG4gIH1cbn1cblxuLyoqXG4gKiBJcyB0aGUgYHBhdGhgIGEgZGVzY2VuZGFudCBvZiB0aGUgYGJhc2VgP1xuICogRS5nLiBgZm9vL2Jhci96ZWVgIGlzIHdpdGhpbiBgZm9vL2JhcmAgYnV0IG5vdCB3aXRoaW4gYGZvby9jYXJgLlxuICovXG5mdW5jdGlvbiBpc1dpdGhpbkJhc2VQYXRoKGJhc2U6IEFic29sdXRlRnNQYXRoLCBwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICByZXR1cm4gIXJlbGF0aXZlKGJhc2UsIHBhdGgpLnN0YXJ0c1dpdGgoJy4uJyk7XG59XG4iXX0=