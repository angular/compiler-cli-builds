(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point_finder", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/entry_point"], factory);
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
    var EntryPointFinder = /** @class */ (function () {
        function EntryPointFinder(fs, logger, resolver) {
            this.fs = fs;
            this.logger = logger;
            this.resolver = resolver;
        }
        /**
         * Search the given directory, and sub-directories, for Angular package entry points.
         * @param sourceDirectory An absolute path to the directory to search for entry points.
         */
        EntryPointFinder.prototype.findEntryPoints = function (sourceDirectory, targetEntryPointPath, pathMappings) {
            var _this = this;
            var basePaths = this.getBasePaths(sourceDirectory, pathMappings);
            var unsortedEntryPoints = basePaths.reduce(function (entryPoints, basePath) { return entryPoints.concat(_this.walkDirectoryForEntryPoints(basePath)); }, []);
            var targetEntryPoint = targetEntryPointPath ?
                unsortedEntryPoints.find(function (entryPoint) { return entryPoint.path === targetEntryPointPath; }) :
                undefined;
            return this.resolver.sortEntryPointsByDependency(unsortedEntryPoints, targetEntryPoint);
        };
        /**
         * Extract all the base-paths that we need to search for entry-points.
         *
         * This always contains the standard base-path (`sourceDirectory`).
         * But it also parses the `paths` mappings object to guess additional base-paths.
         *
         * For example:
         *
         * ```
         * getBasePaths('/node_modules', {baseUrl: '/dist', paths: {'*': ['lib/*', 'lib/generated/*']}})
         * > ['/node_modules', '/dist/lib']
         * ```
         *
         * Notice that `'/dist'` is not included as there is no `'*'` path,
         * and `'/dist/lib/generated'` is not included as it is covered by `'/dist/lib'`.
         *
         * @param sourceDirectory The standard base-path (e.g. node_modules).
         * @param pathMappings Path mapping configuration, from which to extract additional base-paths.
         */
        EntryPointFinder.prototype.getBasePaths = function (sourceDirectory, pathMappings) {
            var basePaths = [sourceDirectory];
            if (pathMappings) {
                var baseUrl_1 = file_system_1.resolve(pathMappings.baseUrl);
                values(pathMappings.paths).forEach(function (paths) { return paths.forEach(function (path) {
                    basePaths.push(file_system_1.join(baseUrl_1, extractPathPrefix(path)));
                }); });
            }
            basePaths.sort(); // Get the paths in order with the shorter ones first.
            return basePaths.filter(removeDeeperPaths);
        };
        /**
         * Look for entry points that need to be compiled, starting at the source directory.
         * The function will recurse into directories that start with `@...`, e.g. `@angular/...`.
         * @param sourceDirectory An absolute path to the root directory where searching begins.
         */
        EntryPointFinder.prototype.walkDirectoryForEntryPoints = function (sourceDirectory) {
            var _this = this;
            var entryPoints = this.getEntryPointsForPackage(sourceDirectory);
            if (entryPoints.length > 0) {
                // The `sourceDirectory` is an entry-point itself so no need to search its sub-directories.
                return entryPoints;
            }
            this.fs
                .readdir(sourceDirectory)
                // Not interested in hidden files
                .filter(function (p) { return !p.startsWith('.'); })
                // Ignore node_modules
                .filter(function (p) { return p !== 'node_modules'; })
                // Only interested in directories (and only those that are not symlinks)
                .filter(function (p) {
                var stat = _this.fs.lstat(file_system_1.resolve(sourceDirectory, p));
                return stat.isDirectory() && !stat.isSymbolicLink();
            })
                .forEach(function (p) {
                // Either the directory is a potential package or a namespace containing packages (e.g
                // `@angular`).
                var packagePath = file_system_1.join(sourceDirectory, p);
                entryPoints.push.apply(entryPoints, tslib_1.__spread(_this.walkDirectoryForEntryPoints(packagePath)));
                // Also check for any nested node_modules in this package
                var nestedNodeModulesPath = file_system_1.join(packagePath, 'node_modules');
                if (_this.fs.exists(nestedNodeModulesPath)) {
                    entryPoints.push.apply(entryPoints, tslib_1.__spread(_this.walkDirectoryForEntryPoints(nestedNodeModulesPath)));
                }
            });
            return entryPoints;
        };
        /**
         * Recurse the folder structure looking for all the entry points
         * @param packagePath The absolute path to an npm package that may contain entry points
         * @returns An array of entry points that were discovered.
         */
        EntryPointFinder.prototype.getEntryPointsForPackage = function (packagePath) {
            var _this = this;
            var entryPoints = [];
            // Try to get an entry point from the top level package directory
            var topLevelEntryPoint = entry_point_1.getEntryPointInfo(this.fs, this.logger, packagePath, packagePath);
            // If there is no primary entry-point then exit
            if (topLevelEntryPoint === null) {
                return [];
            }
            // Otherwise store it and search for secondary entry-points
            entryPoints.push(topLevelEntryPoint);
            this.walkDirectory(packagePath, function (subdir) {
                var subEntryPoint = entry_point_1.getEntryPointInfo(_this.fs, _this.logger, packagePath, subdir);
                if (subEntryPoint !== null) {
                    entryPoints.push(subEntryPoint);
                }
            });
            return entryPoints;
        };
        /**
         * Recursively walk a directory and its sub-directories, applying a given
         * function to each directory.
         * @param dir the directory to recursively walk.
         * @param fn the function to apply to each directory.
         */
        EntryPointFinder.prototype.walkDirectory = function (dir, fn) {
            var _this = this;
            return this.fs
                .readdir(dir)
                // Not interested in hidden files
                .filter(function (p) { return !p.startsWith('.'); })
                // Ignore node_modules
                .filter(function (p) { return p !== 'node_modules'; })
                // Only interested in directories (and only those that are not symlinks)
                .filter(function (p) {
                var stat = _this.fs.lstat(file_system_1.resolve(dir, p));
                return stat.isDirectory() && !stat.isSymbolicLink();
            })
                .forEach(function (subDir) {
                var resolvedSubDir = file_system_1.resolve(dir, subDir);
                fn(resolvedSubDir);
                _this.walkDirectory(resolvedSubDir, fn);
            });
        };
        return EntryPointFinder;
    }());
    exports.EntryPointFinder = EntryPointFinder;
    /**
     * Extract everything in the `path` up to the first `*`.
     * @param path The path to parse.
     * @returns The extracted prefix.
     */
    function extractPathPrefix(path) {
        return path.split('*', 1)[0];
    }
    /**
     * A filter function that removes paths that are already covered by higher paths.
     *
     * @param value The current path.
     * @param index The index of the current path.
     * @param array The array of paths (sorted alphabetically).
     * @returns true if this path is not already covered by a previous path.
     */
    function removeDeeperPaths(value, index, array) {
        for (var i = 0; i < index; i++) {
            if (value.startsWith(array[i]))
                return false;
        }
        return true;
    }
    /**
     * Extract all the values (not keys) from an object.
     * @param obj The object to process.
     */
    function values(obj) {
        return Object.keys(obj).map(function (key) { return obj[key]; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfZmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50X2ZpbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBeUY7SUFLekYsbUZBQTREO0lBRTVEO1FBQ0UsMEJBQ1ksRUFBYyxFQUFVLE1BQWMsRUFBVSxRQUE0QjtZQUE1RSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFVLGFBQVEsR0FBUixRQUFRLENBQW9CO1FBQUcsQ0FBQztRQUM1Rjs7O1dBR0c7UUFDSCwwQ0FBZSxHQUFmLFVBQ0ksZUFBK0IsRUFBRSxvQkFBcUMsRUFDdEUsWUFBMkI7WUFGL0IsaUJBV0M7WUFSQyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNuRSxJQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQ3hDLFVBQUMsV0FBVyxFQUFFLFFBQVEsSUFBSyxPQUFBLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQTlELENBQThELEVBQ3pGLEVBQUUsQ0FBQyxDQUFDO1lBQ1IsSUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUMzQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsVUFBQSxVQUFVLElBQUksT0FBQSxVQUFVLENBQUMsSUFBSSxLQUFLLG9CQUFvQixFQUF4QyxDQUF3QyxDQUFDLENBQUMsQ0FBQztnQkFDbEYsU0FBUyxDQUFDO1lBQ2QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLDJCQUEyQixDQUFDLG1CQUFtQixFQUFFLGdCQUFnQixDQUFDLENBQUM7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QWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBqb2luLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIFNvcnRlZEVudHJ5UG9pbnRzSW5mb30gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuLi91dGlscyc7XG5cbmltcG9ydCB7RW50cnlQb2ludCwgZ2V0RW50cnlQb2ludEluZm99IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG5leHBvcnQgY2xhc3MgRW50cnlQb2ludEZpbmRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlciwgcHJpdmF0ZSByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyKSB7fVxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBkaXJlY3RvcnksIGFuZCBzdWItZGlyZWN0b3JpZXMsIGZvciBBbmd1bGFyIHBhY2thZ2UgZW50cnkgcG9pbnRzLlxuICAgKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IEFuIGFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSB0byBzZWFyY2ggZm9yIGVudHJ5IHBvaW50cy5cbiAgICovXG4gIGZpbmRFbnRyeVBvaW50cyhcbiAgICAgIHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3MpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICAgIGNvbnN0IGJhc2VQYXRocyA9IHRoaXMuZ2V0QmFzZVBhdGhzKHNvdXJjZURpcmVjdG9yeSwgcGF0aE1hcHBpbmdzKTtcbiAgICBjb25zdCB1bnNvcnRlZEVudHJ5UG9pbnRzID0gYmFzZVBhdGhzLnJlZHVjZTxFbnRyeVBvaW50W10+KFxuICAgICAgICAoZW50cnlQb2ludHMsIGJhc2VQYXRoKSA9PiBlbnRyeVBvaW50cy5jb25jYXQodGhpcy53YWxrRGlyZWN0b3J5Rm9yRW50cnlQb2ludHMoYmFzZVBhdGgpKSxcbiAgICAgICAgW10pO1xuICAgIGNvbnN0IHRhcmdldEVudHJ5UG9pbnQgPSB0YXJnZXRFbnRyeVBvaW50UGF0aCA/XG4gICAgICAgIHVuc29ydGVkRW50cnlQb2ludHMuZmluZChlbnRyeVBvaW50ID0+IGVudHJ5UG9pbnQucGF0aCA9PT0gdGFyZ2V0RW50cnlQb2ludFBhdGgpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzLnJlc29sdmVyLnNvcnRFbnRyeVBvaW50c0J5RGVwZW5kZW5jeSh1bnNvcnRlZEVudHJ5UG9pbnRzLCB0YXJnZXRFbnRyeVBvaW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGFsbCB0aGUgYmFzZS1wYXRocyB0aGF0IHdlIG5lZWQgdG8gc2VhcmNoIGZvciBlbnRyeS1wb2ludHMuXG4gICAqXG4gICAqIFRoaXMgYWx3YXlzIGNvbnRhaW5zIHRoZSBzdGFuZGFyZCBiYXNlLXBhdGggKGBzb3VyY2VEaXJlY3RvcnlgKS5cbiAgICogQnV0IGl0IGFsc28gcGFyc2VzIHRoZSBgcGF0aHNgIG1hcHBpbmdzIG9iamVjdCB0byBndWVzcyBhZGRpdGlvbmFsIGJhc2UtcGF0aHMuXG4gICAqXG4gICAqIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogZ2V0QmFzZVBhdGhzKCcvbm9kZV9tb2R1bGVzJywge2Jhc2VVcmw6ICcvZGlzdCcsIHBhdGhzOiB7JyonOiBbJ2xpYi8qJywgJ2xpYi9nZW5lcmF0ZWQvKiddfX0pXG4gICAqID4gWycvbm9kZV9tb2R1bGVzJywgJy9kaXN0L2xpYiddXG4gICAqIGBgYFxuICAgKlxuICAgKiBOb3RpY2UgdGhhdCBgJy9kaXN0J2AgaXMgbm90IGluY2x1ZGVkIGFzIHRoZXJlIGlzIG5vIGAnKidgIHBhdGgsXG4gICAqIGFuZCBgJy9kaXN0L2xpYi9nZW5lcmF0ZWQnYCBpcyBub3QgaW5jbHVkZWQgYXMgaXQgaXMgY292ZXJlZCBieSBgJy9kaXN0L2xpYidgLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IFRoZSBzdGFuZGFyZCBiYXNlLXBhdGggKGUuZy4gbm9kZV9tb2R1bGVzKS5cbiAgICogQHBhcmFtIHBhdGhNYXBwaW5ncyBQYXRoIG1hcHBpbmcgY29uZmlndXJhdGlvbiwgZnJvbSB3aGljaCB0byBleHRyYWN0IGFkZGl0aW9uYWwgYmFzZS1wYXRocy5cbiAgICovXG4gIHByaXZhdGUgZ2V0QmFzZVBhdGhzKHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncyk6XG4gICAgICBBYnNvbHV0ZUZzUGF0aFtdIHtcbiAgICBjb25zdCBiYXNlUGF0aHMgPSBbc291cmNlRGlyZWN0b3J5XTtcbiAgICBpZiAocGF0aE1hcHBpbmdzKSB7XG4gICAgICBjb25zdCBiYXNlVXJsID0gcmVzb2x2ZShwYXRoTWFwcGluZ3MuYmFzZVVybCk7XG4gICAgICB2YWx1ZXMocGF0aE1hcHBpbmdzLnBhdGhzKS5mb3JFYWNoKHBhdGhzID0+IHBhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAgIGJhc2VQYXRocy5wdXNoKGpvaW4oYmFzZVVybCwgZXh0cmFjdFBhdGhQcmVmaXgocGF0aCkpKTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgYmFzZVBhdGhzLnNvcnQoKTsgIC8vIEdldCB0aGUgcGF0aHMgaW4gb3JkZXIgd2l0aCB0aGUgc2hvcnRlciBvbmVzIGZpcnN0LlxuICAgIHJldHVybiBiYXNlUGF0aHMuZmlsdGVyKHJlbW92ZURlZXBlclBhdGhzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rIGZvciBlbnRyeSBwb2ludHMgdGhhdCBuZWVkIHRvIGJlIGNvbXBpbGVkLCBzdGFydGluZyBhdCB0aGUgc291cmNlIGRpcmVjdG9yeS5cbiAgICogVGhlIGZ1bmN0aW9uIHdpbGwgcmVjdXJzZSBpbnRvIGRpcmVjdG9yaWVzIHRoYXQgc3RhcnQgd2l0aCBgQC4uLmAsIGUuZy4gYEBhbmd1bGFyLy4uLmAuXG4gICAqIEBwYXJhbSBzb3VyY2VEaXJlY3RvcnkgQW4gYWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgc2VhcmNoaW5nIGJlZ2lucy5cbiAgICovXG4gIHByaXZhdGUgd2Fsa0RpcmVjdG9yeUZvckVudHJ5UG9pbnRzKHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50W10ge1xuICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gdGhpcy5nZXRFbnRyeVBvaW50c0ZvclBhY2thZ2Uoc291cmNlRGlyZWN0b3J5KTtcbiAgICBpZiAoZW50cnlQb2ludHMubGVuZ3RoID4gMCkge1xuICAgICAgLy8gVGhlIGBzb3VyY2VEaXJlY3RvcnlgIGlzIGFuIGVudHJ5LXBvaW50IGl0c2VsZiBzbyBubyBuZWVkIHRvIHNlYXJjaCBpdHMgc3ViLWRpcmVjdG9yaWVzLlxuICAgICAgcmV0dXJuIGVudHJ5UG9pbnRzO1xuICAgIH1cblxuICAgIHRoaXMuZnNcbiAgICAgICAgLnJlYWRkaXIoc291cmNlRGlyZWN0b3J5KVxuICAgICAgICAvLyBOb3QgaW50ZXJlc3RlZCBpbiBoaWRkZW4gZmlsZXNcbiAgICAgICAgLmZpbHRlcihwID0+ICFwLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgLy8gSWdub3JlIG5vZGVfbW9kdWxlc1xuICAgICAgICAuZmlsdGVyKHAgPT4gcCAhPT0gJ25vZGVfbW9kdWxlcycpXG4gICAgICAgIC8vIE9ubHkgaW50ZXJlc3RlZCBpbiBkaXJlY3RvcmllcyAoYW5kIG9ubHkgdGhvc2UgdGhhdCBhcmUgbm90IHN5bWxpbmtzKVxuICAgICAgICAuZmlsdGVyKHAgPT4ge1xuICAgICAgICAgIGNvbnN0IHN0YXQgPSB0aGlzLmZzLmxzdGF0KHJlc29sdmUoc291cmNlRGlyZWN0b3J5LCBwKSk7XG4gICAgICAgICAgcmV0dXJuIHN0YXQuaXNEaXJlY3RvcnkoKSAmJiAhc3RhdC5pc1N5bWJvbGljTGluaygpO1xuICAgICAgICB9KVxuICAgICAgICAuZm9yRWFjaChwID0+IHtcbiAgICAgICAgICAvLyBFaXRoZXIgdGhlIGRpcmVjdG9yeSBpcyBhIHBvdGVudGlhbCBwYWNrYWdlIG9yIGEgbmFtZXNwYWNlIGNvbnRhaW5pbmcgcGFja2FnZXMgKGUuZ1xuICAgICAgICAgIC8vIGBAYW5ndWxhcmApLlxuICAgICAgICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gam9pbihzb3VyY2VEaXJlY3RvcnksIHApO1xuICAgICAgICAgIGVudHJ5UG9pbnRzLnB1c2goLi4udGhpcy53YWxrRGlyZWN0b3J5Rm9yRW50cnlQb2ludHMocGFja2FnZVBhdGgpKTtcblxuICAgICAgICAgIC8vIEFsc28gY2hlY2sgZm9yIGFueSBuZXN0ZWQgbm9kZV9tb2R1bGVzIGluIHRoaXMgcGFja2FnZVxuICAgICAgICAgIGNvbnN0IG5lc3RlZE5vZGVNb2R1bGVzUGF0aCA9IGpvaW4ocGFja2FnZVBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgICBpZiAodGhpcy5mcy5leGlzdHMobmVzdGVkTm9kZU1vZHVsZXNQYXRoKSkge1xuICAgICAgICAgICAgZW50cnlQb2ludHMucHVzaCguLi50aGlzLndhbGtEaXJlY3RvcnlGb3JFbnRyeVBvaW50cyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWN1cnNlIHRoZSBmb2xkZXIgc3RydWN0dXJlIGxvb2tpbmcgZm9yIGFsbCB0aGUgZW50cnkgcG9pbnRzXG4gICAqIEBwYXJhbSBwYWNrYWdlUGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB0byBhbiBucG0gcGFja2FnZSB0aGF0IG1heSBjb250YWluIGVudHJ5IHBvaW50c1xuICAgKiBAcmV0dXJucyBBbiBhcnJheSBvZiBlbnRyeSBwb2ludHMgdGhhdCB3ZXJlIGRpc2NvdmVyZWQuXG4gICAqL1xuICBwcml2YXRlIGdldEVudHJ5UG9pbnRzRm9yUGFja2FnZShwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50W10ge1xuICAgIGNvbnN0IGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10gPSBbXTtcblxuICAgIC8vIFRyeSB0byBnZXQgYW4gZW50cnkgcG9pbnQgZnJvbSB0aGUgdG9wIGxldmVsIHBhY2thZ2UgZGlyZWN0b3J5XG4gICAgY29uc3QgdG9wTGV2ZWxFbnRyeVBvaW50ID0gZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5sb2dnZXIsIHBhY2thZ2VQYXRoLCBwYWNrYWdlUGF0aCk7XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyBwcmltYXJ5IGVudHJ5LXBvaW50IHRoZW4gZXhpdFxuICAgIGlmICh0b3BMZXZlbEVudHJ5UG9pbnQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2Ugc3RvcmUgaXQgYW5kIHNlYXJjaCBmb3Igc2Vjb25kYXJ5IGVudHJ5LXBvaW50c1xuICAgIGVudHJ5UG9pbnRzLnB1c2godG9wTGV2ZWxFbnRyeVBvaW50KTtcbiAgICB0aGlzLndhbGtEaXJlY3RvcnkocGFja2FnZVBhdGgsIHN1YmRpciA9PiB7XG4gICAgICBjb25zdCBzdWJFbnRyeVBvaW50ID0gZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5sb2dnZXIsIHBhY2thZ2VQYXRoLCBzdWJkaXIpO1xuICAgICAgaWYgKHN1YkVudHJ5UG9pbnQgIT09IG51bGwpIHtcbiAgICAgICAgZW50cnlQb2ludHMucHVzaChzdWJFbnRyeVBvaW50KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmVseSB3YWxrIGEgZGlyZWN0b3J5IGFuZCBpdHMgc3ViLWRpcmVjdG9yaWVzLCBhcHBseWluZyBhIGdpdmVuXG4gICAqIGZ1bmN0aW9uIHRvIGVhY2ggZGlyZWN0b3J5LlxuICAgKiBAcGFyYW0gZGlyIHRoZSBkaXJlY3RvcnkgdG8gcmVjdXJzaXZlbHkgd2Fsay5cbiAgICogQHBhcmFtIGZuIHRoZSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGRpcmVjdG9yeS5cbiAgICovXG4gIHByaXZhdGUgd2Fsa0RpcmVjdG9yeShkaXI6IEFic29sdXRlRnNQYXRoLCBmbjogKGRpcjogQWJzb2x1dGVGc1BhdGgpID0+IHZvaWQpIHtcbiAgICByZXR1cm4gdGhpcy5mc1xuICAgICAgICAucmVhZGRpcihkaXIpXG4gICAgICAgIC8vIE5vdCBpbnRlcmVzdGVkIGluIGhpZGRlbiBmaWxlc1xuICAgICAgICAuZmlsdGVyKHAgPT4gIXAuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICAvLyBJZ25vcmUgbm9kZV9tb2R1bGVzXG4gICAgICAgIC5maWx0ZXIocCA9PiBwICE9PSAnbm9kZV9tb2R1bGVzJylcbiAgICAgICAgLy8gT25seSBpbnRlcmVzdGVkIGluIGRpcmVjdG9yaWVzIChhbmQgb25seSB0aG9zZSB0aGF0IGFyZSBub3Qgc3ltbGlua3MpXG4gICAgICAgIC5maWx0ZXIocCA9PiB7XG4gICAgICAgICAgY29uc3Qgc3RhdCA9IHRoaXMuZnMubHN0YXQocmVzb2x2ZShkaXIsIHApKTtcbiAgICAgICAgICByZXR1cm4gc3RhdC5pc0RpcmVjdG9yeSgpICYmICFzdGF0LmlzU3ltYm9saWNMaW5rKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mb3JFYWNoKHN1YkRpciA9PiB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWRTdWJEaXIgPSByZXNvbHZlKGRpciwgc3ViRGlyKTtcbiAgICAgICAgICBmbihyZXNvbHZlZFN1YkRpcik7XG4gICAgICAgICAgdGhpcy53YWxrRGlyZWN0b3J5KHJlc29sdmVkU3ViRGlyLCBmbik7XG4gICAgICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogRXh0cmFjdCBldmVyeXRoaW5nIGluIHRoZSBgcGF0aGAgdXAgdG8gdGhlIGZpcnN0IGAqYC5cbiAqIEBwYXJhbSBwYXRoIFRoZSBwYXRoIHRvIHBhcnNlLlxuICogQHJldHVybnMgVGhlIGV4dHJhY3RlZCBwcmVmaXguXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RQYXRoUHJlZml4KHBhdGg6IHN0cmluZykge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnKicsIDEpWzBdO1xufVxuXG4vKipcbiAqIEEgZmlsdGVyIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyBwYXRocyB0aGF0IGFyZSBhbHJlYWR5IGNvdmVyZWQgYnkgaGlnaGVyIHBhdGhzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBUaGUgY3VycmVudCBwYXRoLlxuICogQHBhcmFtIGluZGV4IFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBwYXRoLlxuICogQHBhcmFtIGFycmF5IFRoZSBhcnJheSBvZiBwYXRocyAoc29ydGVkIGFscGhhYmV0aWNhbGx5KS5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhpcyBwYXRoIGlzIG5vdCBhbHJlYWR5IGNvdmVyZWQgYnkgYSBwcmV2aW91cyBwYXRoLlxuICovXG5mdW5jdGlvbiByZW1vdmVEZWVwZXJQYXRocyh2YWx1ZTogQWJzb2x1dGVGc1BhdGgsIGluZGV4OiBudW1iZXIsIGFycmF5OiBBYnNvbHV0ZUZzUGF0aFtdKSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kZXg7IGkrKykge1xuICAgIGlmICh2YWx1ZS5zdGFydHNXaXRoKGFycmF5W2ldKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgYWxsIHRoZSB2YWx1ZXMgKG5vdCBrZXlzKSBmcm9tIGFuIG9iamVjdC5cbiAqIEBwYXJhbSBvYmogVGhlIG9iamVjdCB0byBwcm9jZXNzLlxuICovXG5mdW5jdGlvbiB2YWx1ZXM8VD4ob2JqOiB7W2tleTogc3RyaW5nXTogVH0pOiBUW10ge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5tYXAoa2V5ID0+IG9ialtrZXldKTtcbn1cbiJdfQ==