(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point_finder", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/packages/entry_point"], factory);
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
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
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
                var baseUrl_1 = path_1.AbsoluteFsPath.resolve(pathMappings.baseUrl);
                values(pathMappings.paths).forEach(function (paths) { return paths.forEach(function (path) {
                    basePaths.push(path_1.AbsoluteFsPath.join(baseUrl_1, extractPathPrefix(path)));
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
            var entryPoints = [];
            this.fs
                .readdir(sourceDirectory)
                // Not interested in hidden files
                .filter(function (p) { return !p.startsWith('.'); })
                // Ignore node_modules
                .filter(function (p) { return p !== 'node_modules'; })
                // Only interested in directories (and only those that are not symlinks)
                .filter(function (p) {
                var stat = _this.fs.lstat(path_1.AbsoluteFsPath.resolve(sourceDirectory, p));
                return stat.isDirectory() && !stat.isSymbolicLink();
            })
                .forEach(function (p) {
                // Either the directory is a potential package or a namespace containing packages (e.g
                // `@angular`).
                var packagePath = path_1.AbsoluteFsPath.join(sourceDirectory, p);
                if (p.startsWith('@')) {
                    entryPoints.push.apply(entryPoints, tslib_1.__spread(_this.walkDirectoryForEntryPoints(packagePath)));
                }
                else {
                    entryPoints.push.apply(entryPoints, tslib_1.__spread(_this.getEntryPointsForPackage(packagePath)));
                    // Also check for any nested node_modules in this package
                    var nestedNodeModulesPath = path_1.AbsoluteFsPath.resolve(packagePath, 'node_modules');
                    if (_this.fs.exists(nestedNodeModulesPath)) {
                        entryPoints.push.apply(entryPoints, tslib_1.__spread(_this.walkDirectoryForEntryPoints(nestedNodeModulesPath)));
                    }
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
            if (topLevelEntryPoint !== null) {
                entryPoints.push(topLevelEntryPoint);
            }
            // Now search all the directories of this package for possible entry points
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
                var stat = _this.fs.lstat(path_1.AbsoluteFsPath.resolve(dir, p));
                return stat.isDirectory() && !stat.isSymbolicLink();
            })
                .forEach(function (subDir) {
                var resolvedSubDir = path_1.AbsoluteFsPath.resolve(dir, subDir);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfZmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50X2ZpbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw2REFBdUQ7SUFLdkQsbUZBQTREO0lBRTVEO1FBQ0UsMEJBQ1ksRUFBYyxFQUFVLE1BQWMsRUFBVSxRQUE0QjtZQUE1RSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFVLGFBQVEsR0FBUixRQUFRLENBQW9CO1FBQUcsQ0FBQztRQUM1Rjs7O1dBR0c7UUFDSCwwQ0FBZSxHQUFmLFVBQ0ksZUFBK0IsRUFBRSxvQkFBcUMsRUFDdEUsWUFBMkI7WUFGL0IsaUJBV0M7WUFSQyxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNuRSxJQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQ3hDLFVBQUMsV0FBVyxFQUFFLFFBQVEsSUFBSyxPQUFBLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQTlELENBQThELEVBQ3pGLEVBQUUsQ0FBQyxDQUFDO1lBQ1IsSUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO2dCQUMzQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsVUFBQSxVQUFVLElBQUksT0FBQSxVQUFVLENBQUMsSUFBSSxLQUFLLG9CQUFvQixFQUF4QyxDQUF3QyxDQUFDLENBQUMsQ0FBQztnQkFDbEYsU0FBUyxDQUFDO1lBQ2QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLDJCQUEyQixDQUFDLG1CQUFtQixFQUFFLGdCQUFnQixDQUFDLENBQUM7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QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIFNvcnRlZEVudHJ5UG9pbnRzSW5mb30gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi9maWxlX3N5c3RlbS9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7RW50cnlQb2ludCwgZ2V0RW50cnlQb2ludEluZm99IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG5leHBvcnQgY2xhc3MgRW50cnlQb2ludEZpbmRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlciwgcHJpdmF0ZSByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyKSB7fVxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBkaXJlY3RvcnksIGFuZCBzdWItZGlyZWN0b3JpZXMsIGZvciBBbmd1bGFyIHBhY2thZ2UgZW50cnkgcG9pbnRzLlxuICAgKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IEFuIGFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSB0byBzZWFyY2ggZm9yIGVudHJ5IHBvaW50cy5cbiAgICovXG4gIGZpbmRFbnRyeVBvaW50cyhcbiAgICAgIHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsIHRhcmdldEVudHJ5UG9pbnRQYXRoPzogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwYXRoTWFwcGluZ3M/OiBQYXRoTWFwcGluZ3MpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICAgIGNvbnN0IGJhc2VQYXRocyA9IHRoaXMuZ2V0QmFzZVBhdGhzKHNvdXJjZURpcmVjdG9yeSwgcGF0aE1hcHBpbmdzKTtcbiAgICBjb25zdCB1bnNvcnRlZEVudHJ5UG9pbnRzID0gYmFzZVBhdGhzLnJlZHVjZTxFbnRyeVBvaW50W10+KFxuICAgICAgICAoZW50cnlQb2ludHMsIGJhc2VQYXRoKSA9PiBlbnRyeVBvaW50cy5jb25jYXQodGhpcy53YWxrRGlyZWN0b3J5Rm9yRW50cnlQb2ludHMoYmFzZVBhdGgpKSxcbiAgICAgICAgW10pO1xuICAgIGNvbnN0IHRhcmdldEVudHJ5UG9pbnQgPSB0YXJnZXRFbnRyeVBvaW50UGF0aCA/XG4gICAgICAgIHVuc29ydGVkRW50cnlQb2ludHMuZmluZChlbnRyeVBvaW50ID0+IGVudHJ5UG9pbnQucGF0aCA9PT0gdGFyZ2V0RW50cnlQb2ludFBhdGgpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzLnJlc29sdmVyLnNvcnRFbnRyeVBvaW50c0J5RGVwZW5kZW5jeSh1bnNvcnRlZEVudHJ5UG9pbnRzLCB0YXJnZXRFbnRyeVBvaW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGFsbCB0aGUgYmFzZS1wYXRocyB0aGF0IHdlIG5lZWQgdG8gc2VhcmNoIGZvciBlbnRyeS1wb2ludHMuXG4gICAqXG4gICAqIFRoaXMgYWx3YXlzIGNvbnRhaW5zIHRoZSBzdGFuZGFyZCBiYXNlLXBhdGggKGBzb3VyY2VEaXJlY3RvcnlgKS5cbiAgICogQnV0IGl0IGFsc28gcGFyc2VzIHRoZSBgcGF0aHNgIG1hcHBpbmdzIG9iamVjdCB0byBndWVzcyBhZGRpdGlvbmFsIGJhc2UtcGF0aHMuXG4gICAqXG4gICAqIEZvciBleGFtcGxlOlxuICAgKlxuICAgKiBgYGBcbiAgICogZ2V0QmFzZVBhdGhzKCcvbm9kZV9tb2R1bGVzJywge2Jhc2VVcmw6ICcvZGlzdCcsIHBhdGhzOiB7JyonOiBbJ2xpYi8qJywgJ2xpYi9nZW5lcmF0ZWQvKiddfX0pXG4gICAqID4gWycvbm9kZV9tb2R1bGVzJywgJy9kaXN0L2xpYiddXG4gICAqIGBgYFxuICAgKlxuICAgKiBOb3RpY2UgdGhhdCBgJy9kaXN0J2AgaXMgbm90IGluY2x1ZGVkIGFzIHRoZXJlIGlzIG5vIGAnKidgIHBhdGgsXG4gICAqIGFuZCBgJy9kaXN0L2xpYi9nZW5lcmF0ZWQnYCBpcyBub3QgaW5jbHVkZWQgYXMgaXQgaXMgY292ZXJlZCBieSBgJy9kaXN0L2xpYidgLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IFRoZSBzdGFuZGFyZCBiYXNlLXBhdGggKGUuZy4gbm9kZV9tb2R1bGVzKS5cbiAgICogQHBhcmFtIHBhdGhNYXBwaW5ncyBQYXRoIG1hcHBpbmcgY29uZmlndXJhdGlvbiwgZnJvbSB3aGljaCB0byBleHRyYWN0IGFkZGl0aW9uYWwgYmFzZS1wYXRocy5cbiAgICovXG4gIHByaXZhdGUgZ2V0QmFzZVBhdGhzKHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncyk6XG4gICAgICBBYnNvbHV0ZUZzUGF0aFtdIHtcbiAgICBjb25zdCBiYXNlUGF0aHMgPSBbc291cmNlRGlyZWN0b3J5XTtcbiAgICBpZiAocGF0aE1hcHBpbmdzKSB7XG4gICAgICBjb25zdCBiYXNlVXJsID0gQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShwYXRoTWFwcGluZ3MuYmFzZVVybCk7XG4gICAgICB2YWx1ZXMocGF0aE1hcHBpbmdzLnBhdGhzKS5mb3JFYWNoKHBhdGhzID0+IHBhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAgIGJhc2VQYXRocy5wdXNoKEFic29sdXRlRnNQYXRoLmpvaW4oYmFzZVVybCwgZXh0cmFjdFBhdGhQcmVmaXgocGF0aCkpKTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgYmFzZVBhdGhzLnNvcnQoKTsgIC8vIEdldCB0aGUgcGF0aHMgaW4gb3JkZXIgd2l0aCB0aGUgc2hvcnRlciBvbmVzIGZpcnN0LlxuICAgIHJldHVybiBiYXNlUGF0aHMuZmlsdGVyKHJlbW92ZURlZXBlclBhdGhzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rIGZvciBlbnRyeSBwb2ludHMgdGhhdCBuZWVkIHRvIGJlIGNvbXBpbGVkLCBzdGFydGluZyBhdCB0aGUgc291cmNlIGRpcmVjdG9yeS5cbiAgICogVGhlIGZ1bmN0aW9uIHdpbGwgcmVjdXJzZSBpbnRvIGRpcmVjdG9yaWVzIHRoYXQgc3RhcnQgd2l0aCBgQC4uLmAsIGUuZy4gYEBhbmd1bGFyLy4uLmAuXG4gICAqIEBwYXJhbSBzb3VyY2VEaXJlY3RvcnkgQW4gYWJzb2x1dGUgcGF0aCB0byB0aGUgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgc2VhcmNoaW5nIGJlZ2lucy5cbiAgICovXG4gIHByaXZhdGUgd2Fsa0RpcmVjdG9yeUZvckVudHJ5UG9pbnRzKHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50W10ge1xuICAgIGNvbnN0IGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10gPSBbXTtcbiAgICB0aGlzLmZzXG4gICAgICAgIC5yZWFkZGlyKHNvdXJjZURpcmVjdG9yeSlcbiAgICAgICAgLy8gTm90IGludGVyZXN0ZWQgaW4gaGlkZGVuIGZpbGVzXG4gICAgICAgIC5maWx0ZXIocCA9PiAhcC5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgIC8vIElnbm9yZSBub2RlX21vZHVsZXNcbiAgICAgICAgLmZpbHRlcihwID0+IHAgIT09ICdub2RlX21vZHVsZXMnKVxuICAgICAgICAvLyBPbmx5IGludGVyZXN0ZWQgaW4gZGlyZWN0b3JpZXMgKGFuZCBvbmx5IHRob3NlIHRoYXQgYXJlIG5vdCBzeW1saW5rcylcbiAgICAgICAgLmZpbHRlcihwID0+IHtcbiAgICAgICAgICBjb25zdCBzdGF0ID0gdGhpcy5mcy5sc3RhdChBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKHNvdXJjZURpcmVjdG9yeSwgcCkpO1xuICAgICAgICAgIHJldHVybiBzdGF0LmlzRGlyZWN0b3J5KCkgJiYgIXN0YXQuaXNTeW1ib2xpY0xpbmsoKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmZvckVhY2gocCA9PiB7XG4gICAgICAgICAgLy8gRWl0aGVyIHRoZSBkaXJlY3RvcnkgaXMgYSBwb3RlbnRpYWwgcGFja2FnZSBvciBhIG5hbWVzcGFjZSBjb250YWluaW5nIHBhY2thZ2VzIChlLmdcbiAgICAgICAgICAvLyBgQGFuZ3VsYXJgKS5cbiAgICAgICAgICBjb25zdCBwYWNrYWdlUGF0aCA9IEFic29sdXRlRnNQYXRoLmpvaW4oc291cmNlRGlyZWN0b3J5LCBwKTtcbiAgICAgICAgICBpZiAocC5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgICAgIGVudHJ5UG9pbnRzLnB1c2goLi4udGhpcy53YWxrRGlyZWN0b3J5Rm9yRW50cnlQb2ludHMocGFja2FnZVBhdGgpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZW50cnlQb2ludHMucHVzaCguLi50aGlzLmdldEVudHJ5UG9pbnRzRm9yUGFja2FnZShwYWNrYWdlUGF0aCkpO1xuXG4gICAgICAgICAgICAvLyBBbHNvIGNoZWNrIGZvciBhbnkgbmVzdGVkIG5vZGVfbW9kdWxlcyBpbiB0aGlzIHBhY2thZ2VcbiAgICAgICAgICAgIGNvbnN0IG5lc3RlZE5vZGVNb2R1bGVzUGF0aCA9IEFic29sdXRlRnNQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsICdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKSB7XG4gICAgICAgICAgICAgIGVudHJ5UG9pbnRzLnB1c2goLi4udGhpcy53YWxrRGlyZWN0b3J5Rm9yRW50cnlQb2ludHMobmVzdGVkTm9kZU1vZHVsZXNQYXRoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gIH1cblxuICAvKipcbiAgICogUmVjdXJzZSB0aGUgZm9sZGVyIHN0cnVjdHVyZSBsb29raW5nIGZvciBhbGwgdGhlIGVudHJ5IHBvaW50c1xuICAgKiBAcGFyYW0gcGFja2FnZVBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gYW4gbnBtIHBhY2thZ2UgdGhhdCBtYXkgY29udGFpbiBlbnRyeSBwb2ludHNcbiAgICogQHJldHVybnMgQW4gYXJyYXkgb2YgZW50cnkgcG9pbnRzIHRoYXQgd2VyZSBkaXNjb3ZlcmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFbnRyeVBvaW50c0ZvclBhY2thZ2UocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFtdIHtcbiAgICBjb25zdCBlbnRyeVBvaW50czogRW50cnlQb2ludFtdID0gW107XG5cbiAgICAvLyBUcnkgdG8gZ2V0IGFuIGVudHJ5IHBvaW50IGZyb20gdGhlIHRvcCBsZXZlbCBwYWNrYWdlIGRpcmVjdG9yeVxuICAgIGNvbnN0IHRvcExldmVsRW50cnlQb2ludCA9IGdldEVudHJ5UG9pbnRJbmZvKHRoaXMuZnMsIHRoaXMubG9nZ2VyLCBwYWNrYWdlUGF0aCwgcGFja2FnZVBhdGgpO1xuICAgIGlmICh0b3BMZXZlbEVudHJ5UG9pbnQgIT09IG51bGwpIHtcbiAgICAgIGVudHJ5UG9pbnRzLnB1c2godG9wTGV2ZWxFbnRyeVBvaW50KTtcbiAgICB9XG5cbiAgICAvLyBOb3cgc2VhcmNoIGFsbCB0aGUgZGlyZWN0b3JpZXMgb2YgdGhpcyBwYWNrYWdlIGZvciBwb3NzaWJsZSBlbnRyeSBwb2ludHNcbiAgICB0aGlzLndhbGtEaXJlY3RvcnkocGFja2FnZVBhdGgsIHN1YmRpciA9PiB7XG4gICAgICBjb25zdCBzdWJFbnRyeVBvaW50ID0gZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5sb2dnZXIsIHBhY2thZ2VQYXRoLCBzdWJkaXIpO1xuICAgICAgaWYgKHN1YkVudHJ5UG9pbnQgIT09IG51bGwpIHtcbiAgICAgICAgZW50cnlQb2ludHMucHVzaChzdWJFbnRyeVBvaW50KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWN1cnNpdmVseSB3YWxrIGEgZGlyZWN0b3J5IGFuZCBpdHMgc3ViLWRpcmVjdG9yaWVzLCBhcHBseWluZyBhIGdpdmVuXG4gICAqIGZ1bmN0aW9uIHRvIGVhY2ggZGlyZWN0b3J5LlxuICAgKiBAcGFyYW0gZGlyIHRoZSBkaXJlY3RvcnkgdG8gcmVjdXJzaXZlbHkgd2Fsay5cbiAgICogQHBhcmFtIGZuIHRoZSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGRpcmVjdG9yeS5cbiAgICovXG4gIHByaXZhdGUgd2Fsa0RpcmVjdG9yeShkaXI6IEFic29sdXRlRnNQYXRoLCBmbjogKGRpcjogQWJzb2x1dGVGc1BhdGgpID0+IHZvaWQpIHtcbiAgICByZXR1cm4gdGhpcy5mc1xuICAgICAgICAucmVhZGRpcihkaXIpXG4gICAgICAgIC8vIE5vdCBpbnRlcmVzdGVkIGluIGhpZGRlbiBmaWxlc1xuICAgICAgICAuZmlsdGVyKHAgPT4gIXAuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICAvLyBJZ25vcmUgbm9kZV9tb2R1bGVzXG4gICAgICAgIC5maWx0ZXIocCA9PiBwICE9PSAnbm9kZV9tb2R1bGVzJylcbiAgICAgICAgLy8gT25seSBpbnRlcmVzdGVkIGluIGRpcmVjdG9yaWVzIChhbmQgb25seSB0aG9zZSB0aGF0IGFyZSBub3Qgc3ltbGlua3MpXG4gICAgICAgIC5maWx0ZXIocCA9PiB7XG4gICAgICAgICAgY29uc3Qgc3RhdCA9IHRoaXMuZnMubHN0YXQoQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShkaXIsIHApKTtcbiAgICAgICAgICByZXR1cm4gc3RhdC5pc0RpcmVjdG9yeSgpICYmICFzdGF0LmlzU3ltYm9saWNMaW5rKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5mb3JFYWNoKHN1YkRpciA9PiB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWRTdWJEaXIgPSBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKGRpciwgc3ViRGlyKTtcbiAgICAgICAgICBmbihyZXNvbHZlZFN1YkRpcik7XG4gICAgICAgICAgdGhpcy53YWxrRGlyZWN0b3J5KHJlc29sdmVkU3ViRGlyLCBmbik7XG4gICAgICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogRXh0cmFjdCBldmVyeXRoaW5nIGluIHRoZSBgcGF0aGAgdXAgdG8gdGhlIGZpcnN0IGAqYC5cbiAqIEBwYXJhbSBwYXRoIFRoZSBwYXRoIHRvIHBhcnNlLlxuICogQHJldHVybnMgVGhlIGV4dHJhY3RlZCBwcmVmaXguXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RQYXRoUHJlZml4KHBhdGg6IHN0cmluZykge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnKicsIDEpWzBdO1xufVxuXG4vKipcbiAqIEEgZmlsdGVyIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyBwYXRocyB0aGF0IGFyZSBhbHJlYWR5IGNvdmVyZWQgYnkgaGlnaGVyIHBhdGhzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBUaGUgY3VycmVudCBwYXRoLlxuICogQHBhcmFtIGluZGV4IFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBwYXRoLlxuICogQHBhcmFtIGFycmF5IFRoZSBhcnJheSBvZiBwYXRocyAoc29ydGVkIGFscGhhYmV0aWNhbGx5KS5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhpcyBwYXRoIGlzIG5vdCBhbHJlYWR5IGNvdmVyZWQgYnkgYSBwcmV2aW91cyBwYXRoLlxuICovXG5mdW5jdGlvbiByZW1vdmVEZWVwZXJQYXRocyh2YWx1ZTogQWJzb2x1dGVGc1BhdGgsIGluZGV4OiBudW1iZXIsIGFycmF5OiBBYnNvbHV0ZUZzUGF0aFtdKSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kZXg7IGkrKykge1xuICAgIGlmICh2YWx1ZS5zdGFydHNXaXRoKGFycmF5W2ldKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgYWxsIHRoZSB2YWx1ZXMgKG5vdCBrZXlzKSBmcm9tIGFuIG9iamVjdC5cbiAqIEBwYXJhbSBvYmogVGhlIG9iamVjdCB0byBwcm9jZXNzLlxuICovXG5mdW5jdGlvbiB2YWx1ZXM8VD4ob2JqOiB7W2tleTogc3RyaW5nXTogVH0pOiBUW10ge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5tYXAoa2V5ID0+IG9ialtrZXldKTtcbn1cbiJdfQ==