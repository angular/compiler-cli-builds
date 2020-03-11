(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/entry_point_finder/directory_walker_entry_point_finder", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer", "@angular/compiler-cli/ngcc/src/entry_point_finder/utils"], factory);
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
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
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
            this.basePaths = utils_1.getBasePaths(this.sourceDirectory, this.pathMappings);
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
                    var entryPoints = this.entryPointManifest.readEntryPointsUsingManifest(basePath);
                    if (entryPoints === null) {
                        this.logger.debug("No manifest found for " + basePath + " so walking the directories for entry-points.");
                        var startTime = Date.now();
                        entryPoints = this.walkDirectoryForEntryPoints(basePath);
                        var duration = Math.round((Date.now() - startTime) / 100) / 10;
                        this.logger.debug("Walking directories took " + duration + "s.");
                        this.entryPointManifest.writeEntryPointManifest(basePath, entryPoints);
                    }
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
         * Look for entry points that need to be compiled, starting at the source directory.
         * The function will recurse into directories that start with `@...`, e.g. `@angular/...`.
         * @param sourceDirectory An absolute path to the root directory where searching begins.
         */
        DirectoryWalkerEntryPointFinder.prototype.walkDirectoryForEntryPoints = function (sourceDirectory) {
            var _this = this;
            var entryPoints = this.getEntryPointsForPackage(sourceDirectory);
            if (entryPoints === null) {
                return [];
            }
            if (entryPoints.length > 0) {
                // The `sourceDirectory` is an entry point itself so no need to search its sub-directories.
                // Also check for any nested node_modules in this package but only if it was compiled by
                // Angular.
                // It is unlikely that a non Angular entry point has a dependency on an Angular library.
                if (entryPoints.some(function (e) { return e.compiledByAngular; })) {
                    var nestedNodeModulesPath = this.fs.join(sourceDirectory, 'node_modules');
                    if (this.fs.exists(nestedNodeModulesPath)) {
                        entryPoints.push.apply(entryPoints, tslib_1.__spread(this.walkDirectoryForEntryPoints(nestedNodeModulesPath)));
                    }
                }
                return entryPoints;
            }
            this.fs
                .readdir(sourceDirectory)
                // Not interested in hidden files
                .filter(function (p) { return !p.startsWith('.'); })
                // Ignore node_modules
                .filter(function (p) { return p !== 'node_modules' && p !== new_entry_point_file_writer_1.NGCC_DIRECTORY; })
                // Only interested in directories (and only those that are not symlinks)
                .filter(function (p) {
                var stat = _this.fs.lstat(file_system_1.resolve(sourceDirectory, p));
                return stat.isDirectory() && !stat.isSymbolicLink();
            })
                .forEach(function (p) {
                // Package is a potential namespace containing packages (e.g `@angular`).
                var packagePath = file_system_1.join(sourceDirectory, p);
                entryPoints.push.apply(entryPoints, tslib_1.__spread(_this.walkDirectoryForEntryPoints(packagePath)));
            });
            return entryPoints;
        };
        /**
         * Recurse the folder structure looking for all the entry points
         * @param packagePath The absolute path to an npm package that may contain entry points
         * @returns An array of entry points that were discovered or null when it's not a valid entrypoint
         */
        DirectoryWalkerEntryPointFinder.prototype.getEntryPointsForPackage = function (packagePath) {
            var _this = this;
            var entryPoints = [];
            // Try to get an entry point from the top level package directory
            var topLevelEntryPoint = entry_point_1.getEntryPointInfo(this.fs, this.config, this.logger, packagePath, packagePath);
            // If there is no primary entry-point then exit
            if (topLevelEntryPoint === entry_point_1.NO_ENTRY_POINT) {
                return [];
            }
            if (topLevelEntryPoint === entry_point_1.INVALID_ENTRY_POINT) {
                return null;
            }
            // Otherwise store it and search for secondary entry-points
            entryPoints.push(topLevelEntryPoint);
            this.walkDirectory(packagePath, packagePath, function (path, isDirectory) {
                if (!path.endsWith('.js') && !isDirectory) {
                    return false;
                }
                // If the path is a JS file then strip its extension and see if we can match an entry-point.
                var possibleEntryPointPath = isDirectory ? path : stripJsExtension(path);
                var subEntryPoint = entry_point_1.getEntryPointInfo(_this.fs, _this.config, _this.logger, packagePath, possibleEntryPointPath);
                if (subEntryPoint === entry_point_1.NO_ENTRY_POINT || subEntryPoint === entry_point_1.INVALID_ENTRY_POINT) {
                    return false;
                }
                entryPoints.push(subEntryPoint);
                return true;
            });
            return entryPoints;
        };
        /**
         * Recursively walk a directory and its sub-directories, applying a given
         * function to each directory.
         * @param dir the directory to recursively walk.
         * @param fn the function to apply to each directory.
         */
        DirectoryWalkerEntryPointFinder.prototype.walkDirectory = function (packagePath, dir, fn) {
            var _this = this;
            return this.fs
                .readdir(dir)
                // Not interested in hidden files
                .filter(function (path) { return !path.startsWith('.'); })
                // Ignore node_modules
                .filter(function (path) { return path !== 'node_modules' && path !== new_entry_point_file_writer_1.NGCC_DIRECTORY; })
                .forEach(function (path) {
                var absolutePath = file_system_1.resolve(dir, path);
                var stat = _this.fs.lstat(absolutePath);
                if (stat.isSymbolicLink()) {
                    // We are not interested in symbolic links
                    return;
                }
                var containsEntryPoint = fn(absolutePath, stat.isDirectory());
                if (containsEntryPoint) {
                    _this.walkDirectory(packagePath, absolutePath, fn);
                }
            });
        };
        return DirectoryWalkerEntryPointFinder;
    }());
    exports.DirectoryWalkerEntryPointFinder = DirectoryWalkerEntryPointFinder;
    function stripJsExtension(filePath) {
        return filePath.replace(/\.js$/, '');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5X3dhbGtlcl9lbnRyeV9wb2ludF9maW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUF5RjtJQUl6RixtRkFBMkc7SUFHM0csa0hBQXNFO0lBRXRFLGlGQUFxQztJQUVyQzs7O09BR0c7SUFDSDtRQUVFLHlDQUNZLEVBQWMsRUFBVSxNQUF5QixFQUFVLE1BQWMsRUFDekUsUUFBNEIsRUFBVSxrQkFBc0MsRUFDNUUsZUFBK0IsRUFBVSxZQUFvQztZQUY3RSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ3pFLGFBQVEsR0FBUixRQUFRLENBQW9CO1lBQVUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtZQUM1RSxvQkFBZSxHQUFmLGVBQWUsQ0FBZ0I7WUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBd0I7WUFKakYsY0FBUyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFJa0IsQ0FBQztRQUM3Rjs7O1dBR0c7UUFDSCx5REFBZSxHQUFmOztZQUNFLElBQU0sbUJBQW1CLEdBQWlCLEVBQUUsQ0FBQzs7Z0JBQzdDLEtBQXVCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsU0FBUyxDQUFBLGdCQUFBLDRCQUFFO29CQUFsQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxDQUFDO29C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QkFDbkQ7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNULENBQUM7UUFDSCxzQ0FBQztJQUFELENBQUMsQUFsSkQsSUFrSkM7SUFsSlksMEVBQStCO0lBb0o1QyxTQUFTLGdCQUFnQixDQUFtQixRQUFXO1FBQ3JELE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFNLENBQUM7SUFDNUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGpvaW4sIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlciwgU29ydGVkRW50cnlQb2ludHNJbmZvfSBmcm9tICcuLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIElOVkFMSURfRU5UUllfUE9JTlQsIE5PX0VOVFJZX1BPSU5ULCBnZXRFbnRyeVBvaW50SW5mb30gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtFbnRyeVBvaW50TWFuaWZlc3R9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X21hbmlmZXN0JztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge05HQ0NfRElSRUNUT1JZfSBmcm9tICcuLi93cml0aW5nL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7Z2V0QmFzZVBhdGhzfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBBbiBFbnRyeVBvaW50RmluZGVyIHRoYXQgc2VhcmNoZXMgZm9yIGFsbCBlbnRyeS1wb2ludHMgdGhhdCBjYW4gYmUgZm91bmQgZ2l2ZW4gYSBgYmFzZVBhdGhgIGFuZFxuICogYHBhdGhNYXBwaW5nc2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyIGltcGxlbWVudHMgRW50cnlQb2ludEZpbmRlciB7XG4gIHByaXZhdGUgYmFzZVBhdGhzID0gZ2V0QmFzZVBhdGhzKHRoaXMuc291cmNlRGlyZWN0b3J5LCB0aGlzLnBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBwcml2YXRlIGVudHJ5UG9pbnRNYW5pZmVzdDogRW50cnlQb2ludE1hbmlmZXN0LFxuICAgICAgcHJpdmF0ZSBzb3VyY2VEaXJlY3Rvcnk6IEFic29sdXRlRnNQYXRoLCBwcml2YXRlIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCkge31cbiAgLyoqXG4gICAqIFNlYXJjaCB0aGUgYHNvdXJjZURpcmVjdG9yeWAsIGFuZCBzdWItZGlyZWN0b3JpZXMsIHVzaW5nIGBwYXRoTWFwcGluZ3NgIGFzIG5lY2Vzc2FyeSwgdG8gZmluZFxuICAgKiBhbGwgcGFja2FnZSBlbnRyeS1wb2ludHMuXG4gICAqL1xuICBmaW5kRW50cnlQb2ludHMoKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgICBjb25zdCB1bnNvcnRlZEVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIHRoaXMuYmFzZVBhdGhzKSB7XG4gICAgICBsZXQgZW50cnlQb2ludHMgPSB0aGlzLmVudHJ5UG9pbnRNYW5pZmVzdC5yZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KGJhc2VQYXRoKTtcbiAgICAgIGlmIChlbnRyeVBvaW50cyA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgICAgIGBObyBtYW5pZmVzdCBmb3VuZCBmb3IgJHtiYXNlUGF0aH0gc28gd2Fsa2luZyB0aGUgZGlyZWN0b3JpZXMgZm9yIGVudHJ5LXBvaW50cy5gKTtcbiAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICAgICAgZW50cnlQb2ludHMgPSB0aGlzLndhbGtEaXJlY3RvcnlGb3JFbnRyeVBvaW50cyhiYXNlUGF0aCk7XG4gICAgICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDApIC8gMTA7XG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBXYWxraW5nIGRpcmVjdG9yaWVzIHRvb2sgJHtkdXJhdGlvbn1zLmApO1xuXG4gICAgICAgIHRoaXMuZW50cnlQb2ludE1hbmlmZXN0LndyaXRlRW50cnlQb2ludE1hbmlmZXN0KGJhc2VQYXRoLCBlbnRyeVBvaW50cyk7XG4gICAgICB9XG4gICAgICB1bnNvcnRlZEVudHJ5UG9pbnRzLnB1c2goLi4uZW50cnlQb2ludHMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5zb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3kodW5zb3J0ZWRFbnRyeVBvaW50cyk7XG4gIH1cblxuICAvKipcbiAgICogTG9vayBmb3IgZW50cnkgcG9pbnRzIHRoYXQgbmVlZCB0byBiZSBjb21waWxlZCwgc3RhcnRpbmcgYXQgdGhlIHNvdXJjZSBkaXJlY3RvcnkuXG4gICAqIFRoZSBmdW5jdGlvbiB3aWxsIHJlY3Vyc2UgaW50byBkaXJlY3RvcmllcyB0aGF0IHN0YXJ0IHdpdGggYEAuLi5gLCBlLmcuIGBAYW5ndWxhci8uLi5gLlxuICAgKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IEFuIGFic29sdXRlIHBhdGggdG8gdGhlIHJvb3QgZGlyZWN0b3J5IHdoZXJlIHNlYXJjaGluZyBiZWdpbnMuXG4gICAqL1xuICB3YWxrRGlyZWN0b3J5Rm9yRW50cnlQb2ludHMoc291cmNlRGlyZWN0b3J5OiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnRbXSB7XG4gICAgY29uc3QgZW50cnlQb2ludHMgPSB0aGlzLmdldEVudHJ5UG9pbnRzRm9yUGFja2FnZShzb3VyY2VEaXJlY3RvcnkpO1xuICAgIGlmIChlbnRyeVBvaW50cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGlmIChlbnRyeVBvaW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBUaGUgYHNvdXJjZURpcmVjdG9yeWAgaXMgYW4gZW50cnkgcG9pbnQgaXRzZWxmIHNvIG5vIG5lZWQgdG8gc2VhcmNoIGl0cyBzdWItZGlyZWN0b3JpZXMuXG4gICAgICAvLyBBbHNvIGNoZWNrIGZvciBhbnkgbmVzdGVkIG5vZGVfbW9kdWxlcyBpbiB0aGlzIHBhY2thZ2UgYnV0IG9ubHkgaWYgaXQgd2FzIGNvbXBpbGVkIGJ5XG4gICAgICAvLyBBbmd1bGFyLlxuICAgICAgLy8gSXQgaXMgdW5saWtlbHkgdGhhdCBhIG5vbiBBbmd1bGFyIGVudHJ5IHBvaW50IGhhcyBhIGRlcGVuZGVuY3kgb24gYW4gQW5ndWxhciBsaWJyYXJ5LlxuICAgICAgaWYgKGVudHJ5UG9pbnRzLnNvbWUoZSA9PiBlLmNvbXBpbGVkQnlBbmd1bGFyKSkge1xuICAgICAgICBjb25zdCBuZXN0ZWROb2RlTW9kdWxlc1BhdGggPSB0aGlzLmZzLmpvaW4oc291cmNlRGlyZWN0b3J5LCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKSB7XG4gICAgICAgICAgZW50cnlQb2ludHMucHVzaCguLi50aGlzLndhbGtEaXJlY3RvcnlGb3JFbnRyeVBvaW50cyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gICAgfVxuXG4gICAgdGhpcy5mc1xuICAgICAgICAucmVhZGRpcihzb3VyY2VEaXJlY3RvcnkpXG4gICAgICAgIC8vIE5vdCBpbnRlcmVzdGVkIGluIGhpZGRlbiBmaWxlc1xuICAgICAgICAuZmlsdGVyKHAgPT4gIXAuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICAvLyBJZ25vcmUgbm9kZV9tb2R1bGVzXG4gICAgICAgIC5maWx0ZXIocCA9PiBwICE9PSAnbm9kZV9tb2R1bGVzJyAmJiBwICE9PSBOR0NDX0RJUkVDVE9SWSlcbiAgICAgICAgLy8gT25seSBpbnRlcmVzdGVkIGluIGRpcmVjdG9yaWVzIChhbmQgb25seSB0aG9zZSB0aGF0IGFyZSBub3Qgc3ltbGlua3MpXG4gICAgICAgIC5maWx0ZXIocCA9PiB7XG4gICAgICAgICAgY29uc3Qgc3RhdCA9IHRoaXMuZnMubHN0YXQocmVzb2x2ZShzb3VyY2VEaXJlY3RvcnksIHApKTtcbiAgICAgICAgICByZXR1cm4gc3RhdC5pc0RpcmVjdG9yeSgpICYmICFzdGF0LmlzU3ltYm9saWNMaW5rKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mb3JFYWNoKHAgPT4ge1xuICAgICAgICAgIC8vIFBhY2thZ2UgaXMgYSBwb3RlbnRpYWwgbmFtZXNwYWNlIGNvbnRhaW5pbmcgcGFja2FnZXMgKGUuZyBgQGFuZ3VsYXJgKS5cbiAgICAgICAgICBjb25zdCBwYWNrYWdlUGF0aCA9IGpvaW4oc291cmNlRGlyZWN0b3J5LCBwKTtcbiAgICAgICAgICBlbnRyeVBvaW50cy5wdXNoKC4uLnRoaXMud2Fsa0RpcmVjdG9yeUZvckVudHJ5UG9pbnRzKHBhY2thZ2VQYXRoKSk7XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWN1cnNlIHRoZSBmb2xkZXIgc3RydWN0dXJlIGxvb2tpbmcgZm9yIGFsbCB0aGUgZW50cnkgcG9pbnRzXG4gICAqIEBwYXJhbSBwYWNrYWdlUGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB0byBhbiBucG0gcGFja2FnZSB0aGF0IG1heSBjb250YWluIGVudHJ5IHBvaW50c1xuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBlbnRyeSBwb2ludHMgdGhhdCB3ZXJlIGRpc2NvdmVyZWQgb3IgbnVsbCB3aGVuIGl0J3Mgbm90IGEgdmFsaWQgZW50cnlwb2ludFxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFbnRyeVBvaW50c0ZvclBhY2thZ2UocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFtdfG51bGwge1xuICAgIGNvbnN0IGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10gPSBbXTtcblxuICAgIC8vIFRyeSB0byBnZXQgYW4gZW50cnkgcG9pbnQgZnJvbSB0aGUgdG9wIGxldmVsIHBhY2thZ2UgZGlyZWN0b3J5XG4gICAgY29uc3QgdG9wTGV2ZWxFbnRyeVBvaW50ID1cbiAgICAgICAgZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5jb25maWcsIHRoaXMubG9nZ2VyLCBwYWNrYWdlUGF0aCwgcGFja2FnZVBhdGgpO1xuXG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gcHJpbWFyeSBlbnRyeS1wb2ludCB0aGVuIGV4aXRcbiAgICBpZiAodG9wTGV2ZWxFbnRyeVBvaW50ID09PSBOT19FTlRSWV9QT0lOVCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGlmICh0b3BMZXZlbEVudHJ5UG9pbnQgPT09IElOVkFMSURfRU5UUllfUE9JTlQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSBzdG9yZSBpdCBhbmQgc2VhcmNoIGZvciBzZWNvbmRhcnkgZW50cnktcG9pbnRzXG4gICAgZW50cnlQb2ludHMucHVzaCh0b3BMZXZlbEVudHJ5UG9pbnQpO1xuICAgIHRoaXMud2Fsa0RpcmVjdG9yeShwYWNrYWdlUGF0aCwgcGFja2FnZVBhdGgsIChwYXRoLCBpc0RpcmVjdG9yeSkgPT4ge1xuICAgICAgaWYgKCFwYXRoLmVuZHNXaXRoKCcuanMnKSAmJiAhaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgcGF0aCBpcyBhIEpTIGZpbGUgdGhlbiBzdHJpcCBpdHMgZXh0ZW5zaW9uIGFuZCBzZWUgaWYgd2UgY2FuIG1hdGNoIGFuIGVudHJ5LXBvaW50LlxuICAgICAgY29uc3QgcG9zc2libGVFbnRyeVBvaW50UGF0aCA9IGlzRGlyZWN0b3J5ID8gcGF0aCA6IHN0cmlwSnNFeHRlbnNpb24ocGF0aCk7XG4gICAgICBjb25zdCBzdWJFbnRyeVBvaW50ID1cbiAgICAgICAgICBnZXRFbnRyeVBvaW50SW5mbyh0aGlzLmZzLCB0aGlzLmNvbmZpZywgdGhpcy5sb2dnZXIsIHBhY2thZ2VQYXRoLCBwb3NzaWJsZUVudHJ5UG9pbnRQYXRoKTtcbiAgICAgIGlmIChzdWJFbnRyeVBvaW50ID09PSBOT19FTlRSWV9QT0lOVCB8fCBzdWJFbnRyeVBvaW50ID09PSBJTlZBTElEX0VOVFJZX1BPSU5UKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGVudHJ5UG9pbnRzLnB1c2goc3ViRW50cnlQb2ludCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmVseSB3YWxrIGEgZGlyZWN0b3J5IGFuZCBpdHMgc3ViLWRpcmVjdG9yaWVzLCBhcHBseWluZyBhIGdpdmVuXG4gICAqIGZ1bmN0aW9uIHRvIGVhY2ggZGlyZWN0b3J5LlxuICAgKiBAcGFyYW0gZGlyIHRoZSBkaXJlY3RvcnkgdG8gcmVjdXJzaXZlbHkgd2Fsay5cbiAgICogQHBhcmFtIGZuIHRoZSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGRpcmVjdG9yeS5cbiAgICovXG4gIHByaXZhdGUgd2Fsa0RpcmVjdG9yeShcbiAgICAgIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZGlyOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIGZuOiAocGF0aDogQWJzb2x1dGVGc1BhdGgsIGlzRGlyZWN0b3J5OiBib29sZWFuKSA9PiBib29sZWFuKSB7XG4gICAgcmV0dXJuIHRoaXMuZnNcbiAgICAgICAgLnJlYWRkaXIoZGlyKVxuICAgICAgICAvLyBOb3QgaW50ZXJlc3RlZCBpbiBoaWRkZW4gZmlsZXNcbiAgICAgICAgLmZpbHRlcihwYXRoID0+ICFwYXRoLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgLy8gSWdub3JlIG5vZGVfbW9kdWxlc1xuICAgICAgICAuZmlsdGVyKHBhdGggPT4gcGF0aCAhPT0gJ25vZGVfbW9kdWxlcycgJiYgcGF0aCAhPT0gTkdDQ19ESVJFQ1RPUlkpXG4gICAgICAgIC5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgICAgIGNvbnN0IGFic29sdXRlUGF0aCA9IHJlc29sdmUoZGlyLCBwYXRoKTtcbiAgICAgICAgICBjb25zdCBzdGF0ID0gdGhpcy5mcy5sc3RhdChhYnNvbHV0ZVBhdGgpO1xuXG4gICAgICAgICAgaWYgKHN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgLy8gV2UgYXJlIG5vdCBpbnRlcmVzdGVkIGluIHN5bWJvbGljIGxpbmtzXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY29udGFpbnNFbnRyeVBvaW50ID0gZm4oYWJzb2x1dGVQYXRoLCBzdGF0LmlzRGlyZWN0b3J5KCkpO1xuICAgICAgICAgIGlmIChjb250YWluc0VudHJ5UG9pbnQpIHtcbiAgICAgICAgICAgIHRoaXMud2Fsa0RpcmVjdG9yeShwYWNrYWdlUGF0aCwgYWJzb2x1dGVQYXRoLCBmbik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdHJpcEpzRXh0ZW5zaW9uPFQgZXh0ZW5kcyBzdHJpbmc+KGZpbGVQYXRoOiBUKTogVCB7XG4gIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC9cXC5qcyQvLCAnJykgYXMgVDtcbn1cbiJdfQ==