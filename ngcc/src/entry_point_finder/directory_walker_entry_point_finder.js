(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", "@angular/compiler-cli/ngcc/src/entry_point_finder/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/utils");
    /**
     * An EntryPointFinder that searches for all entry-points that can be found given a `basePath` and
     * `pathMappings`.
     */
    var DirectoryWalkerEntryPointFinder = /** @class */ (function () {
        function DirectoryWalkerEntryPointFinder(fs, config, logger, resolver, entryPointManifest, sourceDirectory, pathMappings) {
            this.fs = fs;
            this.config = config;
            this.logger = logger;
            this.resolver = resolver;
            this.entryPointManifest = entryPointManifest;
            this.sourceDirectory = sourceDirectory;
            this.pathMappings = pathMappings;
            this.basePaths = utils_1.getBasePaths(this.logger, this.sourceDirectory, this.pathMappings);
        }
        /**
         * Search the `sourceDirectory`, and sub-directories, using `pathMappings` as necessary, to find
         * all package entry-points.
         */
        DirectoryWalkerEntryPointFinder.prototype.findEntryPoints = function () {
            var e_1, _a;
            var unsortedEntryPoints = [];
            try {
                for (var _b = tslib_1.__values(this.basePaths), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var basePath = _c.value;
                    var entryPoints = this.entryPointManifest.readEntryPointsUsingManifest(basePath) ||
                        this.walkBasePathForPackages(basePath);
                    unsortedEntryPoints.push.apply(unsortedEntryPoints, tslib_1.__spread(entryPoints));
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
         * @param basePath The path at which to start the search
         * @returns an array of `EntryPoint`s that were found within `basePath`.
         */
        DirectoryWalkerEntryPointFinder.prototype.walkBasePathForPackages = function (basePath) {
            var _this = this;
            this.logger.debug("No manifest found for " + basePath + " so walking the directories for entry-points.");
            var entryPoints = utils_1.trackDuration(function () { return _this.walkDirectoryForPackages(basePath); }, function (duration) { return _this.logger.debug("Walking " + basePath + " for entry-points took " + duration + "s."); });
            this.entryPointManifest.writeEntryPointManifest(basePath, entryPoints);
            return entryPoints;
        };
        /**
         * Look for Angular packages that need to be compiled, starting at the source directory.
         * The function will recurse into directories that start with `@...`, e.g. `@angular/...`.
         *
         * @param sourceDirectory An absolute path to the root directory where searching begins.
         * @returns an array of `EntryPoint`s that were found within `sourceDirectory`.
         */
        DirectoryWalkerEntryPointFinder.prototype.walkDirectoryForPackages = function (sourceDirectory) {
            var e_2, _a;
            // Try to get a primary entry point from this directory
            var primaryEntryPoint = entry_point_1.getEntryPointInfo(this.fs, this.config, this.logger, sourceDirectory, sourceDirectory);
            // If there is an entry-point but it is not compatible with ngcc (it has a bad package.json or
            // invalid typings) then exit. It is unlikely that such an entry point has a dependency on an
            // Angular library.
            if (primaryEntryPoint === entry_point_1.INCOMPATIBLE_ENTRY_POINT) {
                return [];
            }
            var entryPoints = [];
            if (primaryEntryPoint !== entry_point_1.NO_ENTRY_POINT) {
                entryPoints.push(primaryEntryPoint);
                this.collectSecondaryEntryPoints(entryPoints, sourceDirectory, sourceDirectory, this.fs.readdir(sourceDirectory));
                // Also check for any nested node_modules in this package but only if at least one of the
                // entry-points was compiled by Angular.
                if (entryPoints.some(function (e) { return e.compiledByAngular; })) {
                    var nestedNodeModulesPath = this.fs.join(sourceDirectory, 'node_modules');
                    if (this.fs.exists(nestedNodeModulesPath)) {
                        entryPoints.push.apply(entryPoints, tslib_1.__spread(this.walkDirectoryForPackages(nestedNodeModulesPath)));
                    }
                }
                return entryPoints;
            }
            try {
                // The `sourceDirectory` was not a package (i.e. there was no package.json)
                // So search its sub-directories for Angular packages and entry-points
                for (var _b = tslib_1.__values(this.fs.readdir(sourceDirectory)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var path = _c.value;
                    if (isIgnorablePath(path)) {
                        // Ignore hidden files, node_modules and ngcc directory
                        continue;
                    }
                    var absolutePath = this.fs.resolve(sourceDirectory, path);
                    var stat = this.fs.lstat(absolutePath);
                    if (stat.isSymbolicLink() || !stat.isDirectory()) {
                        // Ignore symbolic links and non-directories
                        continue;
                    }
                    entryPoints.push.apply(entryPoints, tslib_1.__spread(this.walkDirectoryForPackages(this.fs.join(sourceDirectory, path))));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return entryPoints;
        };
        /**
         * Search the `directory` looking for any secondary entry-points for a package, adding any that
         * are found to the `entryPoints` array.
         *
         * @param entryPoints An array where we will add any entry-points found in this directory
         * @param packagePath The absolute path to the package that may contain entry-points
         * @param directory The current directory being searched
         * @param paths The paths contained in the current `directory`.
         */
        DirectoryWalkerEntryPointFinder.prototype.collectSecondaryEntryPoints = function (entryPoints, packagePath, directory, paths) {
            var e_3, _a;
            var _this = this;
            var _loop_1 = function (path) {
                if (isIgnorablePath(path)) {
                    return "continue";
                }
                var absolutePath = this_1.fs.resolve(directory, path);
                var stat = this_1.fs.lstat(absolutePath);
                if (stat.isSymbolicLink()) {
                    return "continue";
                }
                var isDirectory = stat.isDirectory();
                if (!path.endsWith('.js') && !isDirectory) {
                    return "continue";
                }
                // If the path is a JS file then strip its extension and see if we can match an
                // entry-point.
                var possibleEntryPointPath = isDirectory ? absolutePath : stripJsExtension(absolutePath);
                var isEntryPoint = false;
                var subEntryPoint = entry_point_1.getEntryPointInfo(this_1.fs, this_1.config, this_1.logger, packagePath, possibleEntryPointPath);
                if (subEntryPoint !== entry_point_1.NO_ENTRY_POINT && subEntryPoint !== entry_point_1.INCOMPATIBLE_ENTRY_POINT) {
                    entryPoints.push(subEntryPoint);
                    isEntryPoint = true;
                }
                if (!isDirectory) {
                    return "continue";
                }
                // This directory may contain entry-points of its own.
                var childPaths = this_1.fs.readdir(absolutePath);
                if (!isEntryPoint &&
                    childPaths.some(function (childPath) { return childPath.endsWith('.js') &&
                        _this.fs.stat(_this.fs.resolve(absolutePath, childPath)).isFile(); })) {
                    return "continue";
                }
                this_1.collectSecondaryEntryPoints(entryPoints, packagePath, absolutePath, childPaths);
            };
            var this_1 = this;
            try {
                for (var paths_1 = tslib_1.__values(paths), paths_1_1 = paths_1.next(); !paths_1_1.done; paths_1_1 = paths_1.next()) {
                    var path = paths_1_1.value;
                    _loop_1(path);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (paths_1_1 && !paths_1_1.done && (_a = paths_1.return)) _a.call(paths_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        };
        return DirectoryWalkerEntryPointFinder;
    }());
    exports.DirectoryWalkerEntryPointFinder = DirectoryWalkerEntryPointFinder;
    function stripJsExtension(filePath) {
        return filePath.replace(/\.js$/, '');
    }
    function isIgnorablePath(path) {
        return path.startsWith('.') || path === 'node_modules' || path === new_entry_point_file_writer_1.NGCC_DIRECTORY;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5X3dhbGtlcl9lbnRyeV9wb2ludF9maW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQVdBLG1GQUFnSDtJQUdoSCxrSEFBc0U7SUFFdEUsaUZBQW9EO0lBRXBEOzs7T0FHRztJQUNIO1FBRUUseUNBQ1ksRUFBYyxFQUFVLE1BQXlCLEVBQVUsTUFBYyxFQUN6RSxRQUE0QixFQUFVLGtCQUFzQyxFQUM1RSxlQUErQixFQUFVLFlBQW9DO1lBRjdFLE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFtQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDekUsYUFBUSxHQUFSLFFBQVEsQ0FBb0I7WUFBVSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1lBQzVFLG9CQUFlLEdBQWYsZUFBZSxDQUFnQjtZQUFVLGlCQUFZLEdBQVosWUFBWSxDQUF3QjtZQUpqRixjQUFTLEdBQUcsb0JBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBSUssQ0FBQztRQUM3Rjs7O1dBR0c7UUFDSCx5REFBZSxHQUFmOztZQUNFLElBQU0sbUJBQW1CLEdBQWlCLEVBQUUsQ0FBQzs7Z0JBQzdDLEtBQXVCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsU0FBUyxDQUFBLGdCQUFBLDRCQUFFO29CQUFsQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQzt3QkFDOUUsSUFBSSxDQUFD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LElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxLQUFLLGNBQWMsSUFBSSxJQUFJLEtBQUssNENBQWMsQ0FBQztJQUNwRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlciwgU29ydGVkRW50cnlQb2ludHNJbmZvfSBmcm9tICcuLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCwgTk9fRU5UUllfUE9JTlQsIGdldEVudHJ5UG9pbnRJbmZvfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge0VudHJ5UG9pbnRNYW5pZmVzdH0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfbWFuaWZlc3QnO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7TkdDQ19ESVJFQ1RPUll9IGZyb20gJy4uL3dyaXRpbmcvbmV3X2VudHJ5X3BvaW50X2ZpbGVfd3JpdGVyJztcbmltcG9ydCB7RW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHtnZXRCYXNlUGF0aHMsIHRyYWNrRHVyYXRpb259IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEFuIEVudHJ5UG9pbnRGaW5kZXIgdGhhdCBzZWFyY2hlcyBmb3IgYWxsIGVudHJ5LXBvaW50cyB0aGF0IGNhbiBiZSBmb3VuZCBnaXZlbiBhIGBiYXNlUGF0aGAgYW5kXG4gKiBgcGF0aE1hcHBpbmdzYC5cbiAqL1xuZXhwb3J0IGNsYXNzIERpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXIgaW1wbGVtZW50cyBFbnRyeVBvaW50RmluZGVyIHtcbiAgcHJpdmF0ZSBiYXNlUGF0aHMgPSBnZXRCYXNlUGF0aHModGhpcy5sb2dnZXIsIHRoaXMuc291cmNlRGlyZWN0b3J5LCB0aGlzLnBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBwcml2YXRlIGVudHJ5UG9pbnRNYW5pZmVzdDogRW50cnlQb2ludE1hbmlmZXN0LFxuICAgICAgcHJpdmF0ZSBzb3VyY2VEaXJlY3Rvcnk6IEFic29sdXRlRnNQYXRoLCBwcml2YXRlIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCkge31cbiAgLyoqXG4gICAqIFNlYXJjaCB0aGUgYHNvdXJjZURpcmVjdG9yeWAsIGFuZCBzdWItZGlyZWN0b3JpZXMsIHVzaW5nIGBwYXRoTWFwcGluZ3NgIGFzIG5lY2Vzc2FyeSwgdG8gZmluZFxuICAgKiBhbGwgcGFja2FnZSBlbnRyeS1wb2ludHMuXG4gICAqL1xuICBmaW5kRW50cnlQb2ludHMoKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgICBjb25zdCB1bnNvcnRlZEVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIHRoaXMuYmFzZVBhdGhzKSB7XG4gICAgICBjb25zdCBlbnRyeVBvaW50cyA9IHRoaXMuZW50cnlQb2ludE1hbmlmZXN0LnJlYWRFbnRyeVBvaW50c1VzaW5nTWFuaWZlc3QoYmFzZVBhdGgpIHx8XG4gICAgICAgICAgdGhpcy53YWxrQmFzZVBhdGhGb3JQYWNrYWdlcyhiYXNlUGF0aCk7XG4gICAgICB1bnNvcnRlZEVudHJ5UG9pbnRzLnB1c2goLi4uZW50cnlQb2ludHMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5zb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3kodW5zb3J0ZWRFbnRyeVBvaW50cyk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBgYmFzZVBhdGhgIGZvciBwb3NzaWJsZSBBbmd1bGFyIHBhY2thZ2VzIGFuZCBlbnRyeS1wb2ludHMuXG4gICAqXG4gICAqIEBwYXJhbSBiYXNlUGF0aCBUaGUgcGF0aCBhdCB3aGljaCB0byBzdGFydCB0aGUgc2VhcmNoXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBFbnRyeVBvaW50YHMgdGhhdCB3ZXJlIGZvdW5kIHdpdGhpbiBgYmFzZVBhdGhgLlxuICAgKi9cbiAgd2Fsa0Jhc2VQYXRoRm9yUGFja2FnZXMoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFtdIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYE5vIG1hbmlmZXN0IGZvdW5kIGZvciAke2Jhc2VQYXRofSBzbyB3YWxraW5nIHRoZSBkaXJlY3RvcmllcyBmb3IgZW50cnktcG9pbnRzLmApO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10gPSB0cmFja0R1cmF0aW9uKFxuICAgICAgICAoKSA9PiB0aGlzLndhbGtEaXJlY3RvcnlGb3JQYWNrYWdlcyhiYXNlUGF0aCksXG4gICAgICAgIGR1cmF0aW9uID0+IHRoaXMubG9nZ2VyLmRlYnVnKGBXYWxraW5nICR7YmFzZVBhdGh9IGZvciBlbnRyeS1wb2ludHMgdG9vayAke2R1cmF0aW9ufXMuYCkpO1xuICAgIHRoaXMuZW50cnlQb2ludE1hbmlmZXN0LndyaXRlRW50cnlQb2ludE1hbmlmZXN0KGJhc2VQYXRoLCBlbnRyeVBvaW50cyk7XG4gICAgcmV0dXJuIGVudHJ5UG9pbnRzO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgZm9yIEFuZ3VsYXIgcGFja2FnZXMgdGhhdCBuZWVkIHRvIGJlIGNvbXBpbGVkLCBzdGFydGluZyBhdCB0aGUgc291cmNlIGRpcmVjdG9yeS5cbiAgICogVGhlIGZ1bmN0aW9uIHdpbGwgcmVjdXJzZSBpbnRvIGRpcmVjdG9yaWVzIHRoYXQgc3RhcnQgd2l0aCBgQC4uLmAsIGUuZy4gYEBhbmd1bGFyLy4uLmAuXG4gICAqXG4gICAqIEBwYXJhbSBzb3VyY2VEaXJlY3RvcnkgQW4gYWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgc2VhcmNoaW5nIGJlZ2lucy5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYEVudHJ5UG9pbnRgcyB0aGF0IHdlcmUgZm91bmQgd2l0aGluIGBzb3VyY2VEaXJlY3RvcnlgLlxuICAgKi9cbiAgd2Fsa0RpcmVjdG9yeUZvclBhY2thZ2VzKHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50W10ge1xuICAgIC8vIFRyeSB0byBnZXQgYSBwcmltYXJ5IGVudHJ5IHBvaW50IGZyb20gdGhpcyBkaXJlY3RvcnlcbiAgICBjb25zdCBwcmltYXJ5RW50cnlQb2ludCA9XG4gICAgICAgIGdldEVudHJ5UG9pbnRJbmZvKHRoaXMuZnMsIHRoaXMuY29uZmlnLCB0aGlzLmxvZ2dlciwgc291cmNlRGlyZWN0b3J5LCBzb3VyY2VEaXJlY3RvcnkpO1xuXG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gZW50cnktcG9pbnQgYnV0IGl0IGlzIG5vdCBjb21wYXRpYmxlIHdpdGggbmdjYyAoaXQgaGFzIGEgYmFkIHBhY2thZ2UuanNvbiBvclxuICAgIC8vIGludmFsaWQgdHlwaW5ncykgdGhlbiBleGl0LiBJdCBpcyB1bmxpa2VseSB0aGF0IHN1Y2ggYW4gZW50cnkgcG9pbnQgaGFzIGEgZGVwZW5kZW5jeSBvbiBhblxuICAgIC8vIEFuZ3VsYXIgbGlicmFyeS5cbiAgICBpZiAocHJpbWFyeUVudHJ5UG9pbnQgPT09IElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10gPSBbXTtcbiAgICBpZiAocHJpbWFyeUVudHJ5UG9pbnQgIT09IE5PX0VOVFJZX1BPSU5UKSB7XG4gICAgICBlbnRyeVBvaW50cy5wdXNoKHByaW1hcnlFbnRyeVBvaW50KTtcbiAgICAgIHRoaXMuY29sbGVjdFNlY29uZGFyeUVudHJ5UG9pbnRzKFxuICAgICAgICAgIGVudHJ5UG9pbnRzLCBzb3VyY2VEaXJlY3RvcnksIHNvdXJjZURpcmVjdG9yeSwgdGhpcy5mcy5yZWFkZGlyKHNvdXJjZURpcmVjdG9yeSkpO1xuXG4gICAgICAvLyBBbHNvIGNoZWNrIGZvciBhbnkgbmVzdGVkIG5vZGVfbW9kdWxlcyBpbiB0aGlzIHBhY2thZ2UgYnV0IG9ubHkgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZVxuICAgICAgLy8gZW50cnktcG9pbnRzIHdhcyBjb21waWxlZCBieSBBbmd1bGFyLlxuICAgICAgaWYgKGVudHJ5UG9pbnRzLnNvbWUoZSA9PiBlLmNvbXBpbGVkQnlBbmd1bGFyKSkge1xuICAgICAgICBjb25zdCBuZXN0ZWROb2RlTW9kdWxlc1BhdGggPSB0aGlzLmZzLmpvaW4oc291cmNlRGlyZWN0b3J5LCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKSB7XG4gICAgICAgICAgZW50cnlQb2ludHMucHVzaCguLi50aGlzLndhbGtEaXJlY3RvcnlGb3JQYWNrYWdlcyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gICAgfVxuXG4gICAgLy8gVGhlIGBzb3VyY2VEaXJlY3RvcnlgIHdhcyBub3QgYSBwYWNrYWdlIChpLmUuIHRoZXJlIHdhcyBubyBwYWNrYWdlLmpzb24pXG4gICAgLy8gU28gc2VhcmNoIGl0cyBzdWItZGlyZWN0b3JpZXMgZm9yIEFuZ3VsYXIgcGFja2FnZXMgYW5kIGVudHJ5LXBvaW50c1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiB0aGlzLmZzLnJlYWRkaXIoc291cmNlRGlyZWN0b3J5KSkge1xuICAgICAgaWYgKGlzSWdub3JhYmxlUGF0aChwYXRoKSkge1xuICAgICAgICAvLyBJZ25vcmUgaGlkZGVuIGZpbGVzLCBub2RlX21vZHVsZXMgYW5kIG5nY2MgZGlyZWN0b3J5XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhYnNvbHV0ZVBhdGggPSB0aGlzLmZzLnJlc29sdmUoc291cmNlRGlyZWN0b3J5LCBwYXRoKTtcbiAgICAgIGNvbnN0IHN0YXQgPSB0aGlzLmZzLmxzdGF0KGFic29sdXRlUGF0aCk7XG4gICAgICBpZiAoc3RhdC5pc1N5bWJvbGljTGluaygpIHx8ICFzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgLy8gSWdub3JlIHN5bWJvbGljIGxpbmtzIGFuZCBub24tZGlyZWN0b3JpZXNcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGVudHJ5UG9pbnRzLnB1c2goLi4udGhpcy53YWxrRGlyZWN0b3J5Rm9yUGFja2FnZXModGhpcy5mcy5qb2luKHNvdXJjZURpcmVjdG9yeSwgcGF0aCkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBgZGlyZWN0b3J5YCBsb29raW5nIGZvciBhbnkgc2Vjb25kYXJ5IGVudHJ5LXBvaW50cyBmb3IgYSBwYWNrYWdlLCBhZGRpbmcgYW55IHRoYXRcbiAgICogYXJlIGZvdW5kIHRvIHRoZSBgZW50cnlQb2ludHNgIGFycmF5LlxuICAgKlxuICAgKiBAcGFyYW0gZW50cnlQb2ludHMgQW4gYXJyYXkgd2hlcmUgd2Ugd2lsbCBhZGQgYW55IGVudHJ5LXBvaW50cyBmb3VuZCBpbiB0aGlzIGRpcmVjdG9yeVxuICAgKiBAcGFyYW0gcGFja2FnZVBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2UgdGhhdCBtYXkgY29udGFpbiBlbnRyeS1wb2ludHNcbiAgICogQHBhcmFtIGRpcmVjdG9yeSBUaGUgY3VycmVudCBkaXJlY3RvcnkgYmVpbmcgc2VhcmNoZWRcbiAgICogQHBhcmFtIHBhdGhzIFRoZSBwYXRocyBjb250YWluZWQgaW4gdGhlIGN1cnJlbnQgYGRpcmVjdG9yeWAuXG4gICAqL1xuICBwcml2YXRlIGNvbGxlY3RTZWNvbmRhcnlFbnRyeVBvaW50cyhcbiAgICAgIGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10sIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGlyZWN0b3J5OiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIHBhdGhzOiBQYXRoU2VnbWVudFtdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICBpZiAoaXNJZ25vcmFibGVQYXRoKHBhdGgpKSB7XG4gICAgICAgIC8vIElnbm9yZSBoaWRkZW4gZmlsZXMsIG5vZGVfbW9kdWxlcyBhbmQgbmdjYyBkaXJlY3RvcnlcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFic29sdXRlUGF0aCA9IHRoaXMuZnMucmVzb2x2ZShkaXJlY3RvcnksIHBhdGgpO1xuICAgICAgY29uc3Qgc3RhdCA9IHRoaXMuZnMubHN0YXQoYWJzb2x1dGVQYXRoKTtcbiAgICAgIGlmIChzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgLy8gSWdub3JlIHN5bWJvbGljIGxpbmtzXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpc0RpcmVjdG9yeSA9IHN0YXQuaXNEaXJlY3RvcnkoKTtcbiAgICAgIGlmICghcGF0aC5lbmRzV2l0aCgnLmpzJykgJiYgIWlzRGlyZWN0b3J5KSB7XG4gICAgICAgIC8vIElnbm9yZSBmaWxlcyB0aGF0IGRvIG5vdCBlbmQgaW4gYC5qc2BcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBwYXRoIGlzIGEgSlMgZmlsZSB0aGVuIHN0cmlwIGl0cyBleHRlbnNpb24gYW5kIHNlZSBpZiB3ZSBjYW4gbWF0Y2ggYW5cbiAgICAgIC8vIGVudHJ5LXBvaW50LlxuICAgICAgY29uc3QgcG9zc2libGVFbnRyeVBvaW50UGF0aCA9IGlzRGlyZWN0b3J5ID8gYWJzb2x1dGVQYXRoIDogc3RyaXBKc0V4dGVuc2lvbihhYnNvbHV0ZVBhdGgpO1xuICAgICAgbGV0IGlzRW50cnlQb2ludCA9IGZhbHNlO1xuICAgICAgY29uc3Qgc3ViRW50cnlQb2ludCA9XG4gICAgICAgICAgZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5jb25maWcsIHRoaXMubG9nZ2VyLCBwYWNrYWdlUGF0aCwgcG9zc2libGVFbnRyeVBvaW50UGF0aCk7XG4gICAgICBpZiAoc3ViRW50cnlQb2ludCAhPT0gTk9fRU5UUllfUE9JTlQgJiYgc3ViRW50cnlQb2ludCAhPT0gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UKSB7XG4gICAgICAgIGVudHJ5UG9pbnRzLnB1c2goc3ViRW50cnlQb2ludCk7XG4gICAgICAgIGlzRW50cnlQb2ludCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICghaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gVGhpcyBwYXRoIGlzIG5vdCBhIGRpcmVjdG9yeSBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoaXMgZGlyZWN0b3J5IG1heSBjb250YWluIGVudHJ5LXBvaW50cyBvZiBpdHMgb3duLlxuICAgICAgY29uc3QgY2hpbGRQYXRocyA9IHRoaXMuZnMucmVhZGRpcihhYnNvbHV0ZVBhdGgpO1xuICAgICAgaWYgKCFpc0VudHJ5UG9pbnQgJiZcbiAgICAgICAgICBjaGlsZFBhdGhzLnNvbWUoXG4gICAgICAgICAgICAgIGNoaWxkUGF0aCA9PiBjaGlsZFBhdGguZW5kc1dpdGgoJy5qcycpICYmXG4gICAgICAgICAgICAgICAgICB0aGlzLmZzLnN0YXQodGhpcy5mcy5yZXNvbHZlKGFic29sdXRlUGF0aCwgY2hpbGRQYXRoKSkuaXNGaWxlKCkpKSB7XG4gICAgICAgIC8vIFdlIGRvIG5vdCBjb25zaWRlciBub24tZW50cnktcG9pbnQgZGlyZWN0b3JpZXMgdGhhdCBjb250YWluIEpTIGZpbGVzIGFzIHRoZXkgYXJlIHZlcnlcbiAgICAgICAgLy8gdW5saWtlbHkgdG8gYmUgY29udGFpbmVycyBmb3Igc3ViLWVudHJ5LXBvaW50cy5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB0aGlzLmNvbGxlY3RTZWNvbmRhcnlFbnRyeVBvaW50cyhlbnRyeVBvaW50cywgcGFja2FnZVBhdGgsIGFic29sdXRlUGF0aCwgY2hpbGRQYXRocyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHN0cmlwSnNFeHRlbnNpb248VCBleHRlbmRzIHN0cmluZz4oZmlsZVBhdGg6IFQpOiBUIHtcbiAgcmV0dXJuIGZpbGVQYXRoLnJlcGxhY2UoL1xcLmpzJC8sICcnKSBhcyBUO1xufVxuXG5mdW5jdGlvbiBpc0lnbm9yYWJsZVBhdGgocGF0aDogUGF0aFNlZ21lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuIHBhdGguc3RhcnRzV2l0aCgnLicpIHx8IHBhdGggPT09ICdub2RlX21vZHVsZXMnIHx8IHBhdGggPT09IE5HQ0NfRElSRUNUT1JZO1xufVxuIl19