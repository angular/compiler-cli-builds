(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/entry_point_finder/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DirectoryWalkerEntryPointFinder = void 0;
    var tslib_1 = require("tslib");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/utils");
    /**
     * An EntryPointFinder that searches for all entry-points that can be found given a `basePath` and
     * `pathMappings`.
     */
    var DirectoryWalkerEntryPointFinder = /** @class */ (function () {
        function DirectoryWalkerEntryPointFinder(logger, resolver, entryPointCollector, entryPointManifest, sourceDirectory, pathMappings) {
            this.logger = logger;
            this.resolver = resolver;
            this.entryPointCollector = entryPointCollector;
            this.entryPointManifest = entryPointManifest;
            this.sourceDirectory = sourceDirectory;
            this.pathMappings = pathMappings;
            this.basePaths = (0, utils_1.getBasePaths)(this.logger, this.sourceDirectory, this.pathMappings);
        }
        /**
         * Search the `sourceDirectory`, and sub-directories, using `pathMappings` as necessary, to find
         * all package entry-points.
         */
        DirectoryWalkerEntryPointFinder.prototype.findEntryPoints = function () {
            var e_1, _a;
            var unsortedEntryPoints = [];
            try {
                for (var _b = (0, tslib_1.__values)(this.basePaths), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var basePath = _c.value;
                    var entryPoints = this.entryPointManifest.readEntryPointsUsingManifest(basePath) ||
                        this.walkBasePathForPackages(basePath);
                    entryPoints.forEach(function (e) { return unsortedEntryPoints.push(e); });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return this.resolver.sortEntryPointsByDependency(unsortedEntryPoints);
        };
        /**
         * Search the `basePath` for possible Angular packages and entry-points.
         *
         * @param basePath The path at which to start the search.
         * @returns an array of `EntryPoint`s that were found within `basePath`.
         */
        DirectoryWalkerEntryPointFinder.prototype.walkBasePathForPackages = function (basePath) {
            var _this = this;
            this.logger.debug("No manifest found for " + basePath + " so walking the directories for entry-points.");
            var entryPoints = (0, utils_1.trackDuration)(function () { return _this.entryPointCollector.walkDirectoryForPackages(basePath); }, function (duration) { return _this.logger.debug("Walking " + basePath + " for entry-points took " + duration + "s."); });
            this.entryPointManifest.writeEntryPointManifest(basePath, entryPoints);
            return entryPoints;
        };
        return DirectoryWalkerEntryPointFinder;
    }());
    exports.DirectoryWalkerEntryPointFinder = DirectoryWalkerEntryPointFinder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5X3dhbGtlcl9lbnRyeV9wb2ludF9maW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFnQkEsaUZBQW9EO0lBRXBEOzs7T0FHRztJQUNIO1FBRUUseUNBQ1ksTUFBYyxFQUFVLFFBQTRCLEVBQ3BELG1CQUF3QyxFQUN4QyxrQkFBc0MsRUFBVSxlQUErQixFQUMvRSxZQUFvQztZQUhwQyxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBb0I7WUFDcEQsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtZQUN4Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1lBQVUsb0JBQWUsR0FBZixlQUFlLENBQWdCO1lBQy9FLGlCQUFZLEdBQVosWUFBWSxDQUF3QjtZQUx4QyxjQUFTLEdBQUcsSUFBQSxvQkFBWSxFQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFLcEMsQ0FBQztRQUVwRDs7O1dBR0c7UUFDSCx5REFBZSxHQUFmOztZQUNFLElBQU0sbUJBQW1CLEdBQWlDLEVBQUUsQ0FBQzs7Z0JBQzdELEtBQXVCLElBQUEsS0FBQSxzQkFBQSxJQUFJLENBQUMsU0FBUyxDQUFBLGdCQUFBLDRCQUFFO29CQUFsQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQzt3QkFDOUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUMzQyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUEzQixDQUEyQixDQUFDLENBQUM7aUJBQ3ZEOzs7Ozs7Ozs7WUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDSCxpRUFBdUIsR0FBdkIsVUFBd0IsUUFBd0I7WUFBaEQsaUJBUUM7WUFQQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDYiwyQkFBeUIsUUFBUSxrREFBK0MsQ0FBQyxDQUFDO1lBQ3RGLElBQU0sV0FBVyxHQUFHLElBQUEscUJBQWEsRUFDN0IsY0FBTSxPQUFBLEtBQUksQ0FBQyxtQkFBbUIsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsRUFBM0QsQ0FBMkQsRUFDakUsVUFBQSxRQUFRLElBQUksT0FBQSxLQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFXLFFBQVEsK0JBQTBCLFFBQVEsT0FBSSxDQUFDLEVBQTVFLENBQTRFLENBQUMsQ0FBQztZQUM5RixJQUFJLENBQUMsa0JBQWtCLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZFLE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFDSCxzQ0FBQztJQUFELENBQUMsQUFyQ0QsSUFxQ0M7SUFyQ1ksMEVBQStCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7RW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXN9IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIFNvcnRlZEVudHJ5UG9pbnRzSW5mb30gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50TWFuaWZlc3R9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X21hbmlmZXN0JztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuLi9wYXRoX21hcHBpbmdzJztcblxuaW1wb3J0IHtFbnRyeVBvaW50Q29sbGVjdG9yfSBmcm9tICcuL2VudHJ5X3BvaW50X2NvbGxlY3Rvcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7Z2V0QmFzZVBhdGhzLCB0cmFja0R1cmF0aW9ufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBBbiBFbnRyeVBvaW50RmluZGVyIHRoYXQgc2VhcmNoZXMgZm9yIGFsbCBlbnRyeS1wb2ludHMgdGhhdCBjYW4gYmUgZm91bmQgZ2l2ZW4gYSBgYmFzZVBhdGhgIGFuZFxuICogYHBhdGhNYXBwaW5nc2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyIGltcGxlbWVudHMgRW50cnlQb2ludEZpbmRlciB7XG4gIHByaXZhdGUgYmFzZVBhdGhzID0gZ2V0QmFzZVBhdGhzKHRoaXMubG9nZ2VyLCB0aGlzLnNvdXJjZURpcmVjdG9yeSwgdGhpcy5wYXRoTWFwcGluZ3MpO1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlcixcbiAgICAgIHByaXZhdGUgZW50cnlQb2ludENvbGxlY3RvcjogRW50cnlQb2ludENvbGxlY3RvcixcbiAgICAgIHByaXZhdGUgZW50cnlQb2ludE1hbmlmZXN0OiBFbnRyeVBvaW50TWFuaWZlc3QsIHByaXZhdGUgc291cmNlRGlyZWN0b3J5OiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIHByaXZhdGUgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3N8dW5kZWZpbmVkKSB7fVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGBzb3VyY2VEaXJlY3RvcnlgLCBhbmQgc3ViLWRpcmVjdG9yaWVzLCB1c2luZyBgcGF0aE1hcHBpbmdzYCBhcyBuZWNlc3NhcnksIHRvIGZpbmRcbiAgICogYWxsIHBhY2thZ2UgZW50cnktcG9pbnRzLlxuICAgKi9cbiAgZmluZEVudHJ5UG9pbnRzKCk6IFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gICAgY29uc3QgdW5zb3J0ZWRFbnRyeVBvaW50czogRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXNbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgYmFzZVBhdGggb2YgdGhpcy5iYXNlUGF0aHMpIHtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gdGhpcy5lbnRyeVBvaW50TWFuaWZlc3QucmVhZEVudHJ5UG9pbnRzVXNpbmdNYW5pZmVzdChiYXNlUGF0aCkgfHxcbiAgICAgICAgICB0aGlzLndhbGtCYXNlUGF0aEZvclBhY2thZ2VzKGJhc2VQYXRoKTtcbiAgICAgIGVudHJ5UG9pbnRzLmZvckVhY2goZSA9PiB1bnNvcnRlZEVudHJ5UG9pbnRzLnB1c2goZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5zb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3kodW5zb3J0ZWRFbnRyeVBvaW50cyk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBgYmFzZVBhdGhgIGZvciBwb3NzaWJsZSBBbmd1bGFyIHBhY2thZ2VzIGFuZCBlbnRyeS1wb2ludHMuXG4gICAqXG4gICAqIEBwYXJhbSBiYXNlUGF0aCBUaGUgcGF0aCBhdCB3aGljaCB0byBzdGFydCB0aGUgc2VhcmNoLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgRW50cnlQb2ludGBzIHRoYXQgd2VyZSBmb3VuZCB3aXRoaW4gYGJhc2VQYXRoYC5cbiAgICovXG4gIHdhbGtCYXNlUGF0aEZvclBhY2thZ2VzKGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzW10ge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICBgTm8gbWFuaWZlc3QgZm91bmQgZm9yICR7YmFzZVBhdGh9IHNvIHdhbGtpbmcgdGhlIGRpcmVjdG9yaWVzIGZvciBlbnRyeS1wb2ludHMuYCk7XG4gICAgY29uc3QgZW50cnlQb2ludHMgPSB0cmFja0R1cmF0aW9uKFxuICAgICAgICAoKSA9PiB0aGlzLmVudHJ5UG9pbnRDb2xsZWN0b3Iud2Fsa0RpcmVjdG9yeUZvclBhY2thZ2VzKGJhc2VQYXRoKSxcbiAgICAgICAgZHVyYXRpb24gPT4gdGhpcy5sb2dnZXIuZGVidWcoYFdhbGtpbmcgJHtiYXNlUGF0aH0gZm9yIGVudHJ5LXBvaW50cyB0b29rICR7ZHVyYXRpb259cy5gKSk7XG4gICAgdGhpcy5lbnRyeVBvaW50TWFuaWZlc3Qud3JpdGVFbnRyeVBvaW50TWFuaWZlc3QoYmFzZVBhdGgsIGVudHJ5UG9pbnRzKTtcbiAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gIH1cbn1cbiJdfQ==