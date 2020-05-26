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
    exports.DirectoryWalkerEntryPointFinder = void 0;
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
                entryPoints.push(this.resolver.getEntryPointWithDependencies(primaryEntryPoint));
                this.collectSecondaryEntryPoints(entryPoints, sourceDirectory, sourceDirectory, this.fs.readdir(sourceDirectory));
                // Also check for any nested node_modules in this package but only if at least one of the
                // entry-points was compiled by Angular.
                if (entryPoints.some(function (e) { return e.entryPoint.compiledByAngular; })) {
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
                    entryPoints.push(this_1.resolver.getEntryPointWithDependencies(subEntryPoint));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5X3dhbGtlcl9lbnRyeV9wb2ludF9maW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFZQSxtRkFBb0c7SUFHcEcsa0hBQXNFO0lBR3RFLGlGQUFvRDtJQUVwRDs7O09BR0c7SUFDSDtRQUVFLHlDQUNZLEVBQWMsRUFBVSxNQUF5QixFQUFVLE1BQWMsRUFDekUsUUFBNEIsRUFBVSxrQkFBc0MsRUFDNUUsZUFBK0IsRUFBVSxZQUFvQztZQUY3RSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ3pFLGFBQVEsR0FBUixRQUFRLENBQW9CO1lBQVUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtZQUM1RSxvQkFBZSxHQUFmLGVBQWUsQ0FBZ0I7WUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBd0I7WUFKakYsY0FBUyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUlLLENBQUM7UUFDN0Y7OztXQUdHO1FBQ0gseURBQWUsR0FBZjs7WUFDRSxJQUFNLG1CQUFtQixHQUFpQyxFQUFFLENBQUM7O2dCQUM3RCxLQUF1QixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBbEMsSUFBTSxRQUFRLFdBQUE7b0JBQ2pCLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUM7d0JBQzlFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDM0MsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBM0IsQ0FBMkIsQ0FBQyxDQUFDO2lCQUN2RDs7Ozs7Ozs7O1lBQ0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLDJCQUEyQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVEOzs7OztXQUtHO1FBQ0gsaUVBQXVCLEdBQXZCLFVBQXdCLFFBQXdCO1lBQWhELGlCQVFDO1lBUEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2IsMkJBQXlCLFFBQVEsa0RBQStDLENBQUMsQ0FBQztZQUN0RixJQUFNLFdBQVcsR0FBRyxxQkFBYSxDQUM3QixjQUFNLE9BQUEsS0FBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxFQUF2QyxDQUF1QyxFQUM3QyxVQUFBLFFBQVEsSUFBSSxPQUFBLEtBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQVcsUUFBUSwrQkFBMEIsUUFBUSxPQUFJLENBQUMsRUFBNUUsQ0FBNEUsQ0FBQyxDQUFDO1lBQzlGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDdkUsT0FBTyxXQUFXLENBQUM7UUFDckIsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNILGtFQUF3QixHQUF4QixVQUF5QixlQUErQjs7WUFDdEQsdURBQXVEO1lBQ3ZELElBQU0saUJBQWlCLEdBQ25CLCtCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUUzRiw4RkFBOEY7WUFDOUYsNkZBQTZGO1lBQzdGLG1CQUFtQjtZQUNuQixJQUFJLGlCQUFpQixLQUFLLHNDQUF3QixFQUFFO2dCQUNsRCxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBRUQsSUFBTSxXQUFXLEdBQWlDLEVBQUUsQ0FBQztZQUNyRCxJQUFJLGlCQUFpQixLQUFLLDRCQUFjLEVBQUU7Z0JBQ3hDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pGLElBQUksQ0FBQywyQkFBMkIsQ0FDNUIsV0FBVyxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQkFFckYseUZBQXlGO2dCQUN6Rix3Q0FBd0M7Z0JBQ3hDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQTlCLENBQThCLENBQUMsRUFBRTtvQkFDekQsSUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7b0JBQzVFLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsRUFBRTt3QkFDekMsV0FBVyxDQUFDLElBQUksT0FBaEIsV0FBVyxtQkFBUyxJQUFJLENBQUMsd0JBQXdCLENBQUMscUJBQXFCLENBQUMsR0FBRTtxQkFDM0U7aUJBQ0Y7Z0JBRUQsT0FBTyxXQUFXLENBQUM7YUFDcEI7O2dCQUVELDJFQUEyRTtnQkFDM0Usc0VBQXNFO2dCQUN0RSxLQUFtQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUEsZ0JBQUEsNEJBQUU7b0JBQWhELElBQU0sSUFBSSxXQUFBO29CQUNiLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN6Qix1REFBdUQ7d0JBQ3ZELFNBQVM7cUJBQ1Y7b0JBRUQsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUM1RCxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDekMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7d0JBQ2hELDRDQUE0Qzt3QkFDNUMsU0FBUztxQkFDVjtvQkFFRCxXQUFXLENBQUMsSUFBSSxPQUFoQixXQUFXLG1CQUFTLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRTtpQkFDekY7Ozs7Ozs7OztZQUVELE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFFRDs7Ozs7Ozs7V0FRRztRQUNLLHFFQUEyQixHQUFuQyxVQUNJLFdBQXlDLEVBQUUsV0FBMkIsRUFDdEUsU0FBeUIsRUFBRSxLQUFvQjs7WUFGbkQsaUJBa0RDO29DQS9DWSxJQUFJO2dCQUNiLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFOztpQkFHMUI7Z0JBRUQsSUFBTSxZQUFZLEdBQUcsT0FBSyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdEQsSUFBTSxJQUFJLEdBQUcsT0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRTs7aUJBRzFCO2dCQUVELElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUU7O2lCQUcxQztnQkFFRCwrRUFBK0U7Z0JBQy9FLGVBQWU7Z0JBQ2YsSUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQzNGLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQztnQkFDekIsSUFBTSxhQUFhLEdBQ2YsK0JBQWlCLENBQUMsT0FBSyxFQUFFLEVBQUUsT0FBSyxNQUFNLEVBQUUsT0FBSyxNQUFNLEVBQUUsV0FBVyxFQUFFLHNCQUFzQixDQUFDLENBQUM7Z0JBQzlGLElBQUksYUFBYSxLQUFLLDRCQUFjLElBQUksYUFBYSxLQUFLLHNDQUF3QixFQUFFO29CQUNsRixXQUFXLENBQUMsSUFBSSxDQUFDLE9BQUssUUFBUSxDQUFDLDZCQUE2QixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7b0JBQzdFLFlBQVksR0FBRyxJQUFJLENBQUM7aUJBQ3JCO2dCQUVELElBQUksQ0FBQyxXQUFXLEVBQUU7O2lCQUdqQjtnQkFFRCxzREFBc0Q7Z0JBQ3RELElBQU0sVUFBVSxHQUFHLE9BQUssRUFBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFDakQsSUFBSSxDQUFDLFlBQVk7b0JBQ2IsVUFBVSxDQUFDLElBQUksQ0FDWCxVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO3dCQUNsQyxLQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFEdEQsQ0FDc0QsQ0FBQyxFQUFFOztpQkFJN0U7Z0JBQ0QsT0FBSywyQkFBMkIsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQzs7OztnQkE3Q3ZGLEtBQW1CLElBQUEsVUFBQSxpQkFBQSxLQUFLLENBQUEsNEJBQUE7b0JBQW5CLElBQU0sSUFBSSxrQkFBQTs0QkFBSixJQUFJO2lCQThDZDs7Ozs7Ozs7O1FBQ0gsQ0FBQztRQUNILHNDQUFDO0lBQUQsQ0FBQyxBQTFKRCxJQTBKQztJQTFKWSwwRUFBK0I7SUE0SjVDLFNBQVMsZ0JBQWdCLENBQW1CLFFBQVc7UUFDckQsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQU0sQ0FBQztJQUM1QyxDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsSUFBaUI7UUFDeEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksS0FBSyxjQUFjLElBQUksSUFBSSxLQUFLLDRDQUFjLENBQUM7SUFDcEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgUGF0aFNlZ21lbnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0VudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzfSBmcm9tICcuLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9ufSBmcm9tICcuLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7Z2V0RW50cnlQb2ludEluZm8sIElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCwgTk9fRU5UUllfUE9JTlR9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7RW50cnlQb2ludE1hbmlmZXN0fSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9tYW5pZmVzdCc7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi4vcGF0aF9tYXBwaW5ncyc7XG5pbXBvcnQge05HQ0NfRElSRUNUT1JZfSBmcm9tICcuLi93cml0aW5nL25ld19lbnRyeV9wb2ludF9maWxlX3dyaXRlcic7XG5cbmltcG9ydCB7RW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHtnZXRCYXNlUGF0aHMsIHRyYWNrRHVyYXRpb259IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEFuIEVudHJ5UG9pbnRGaW5kZXIgdGhhdCBzZWFyY2hlcyBmb3IgYWxsIGVudHJ5LXBvaW50cyB0aGF0IGNhbiBiZSBmb3VuZCBnaXZlbiBhIGBiYXNlUGF0aGAgYW5kXG4gKiBgcGF0aE1hcHBpbmdzYC5cbiAqL1xuZXhwb3J0IGNsYXNzIERpcmVjdG9yeVdhbGtlckVudHJ5UG9pbnRGaW5kZXIgaW1wbGVtZW50cyBFbnRyeVBvaW50RmluZGVyIHtcbiAgcHJpdmF0ZSBiYXNlUGF0aHMgPSBnZXRCYXNlUGF0aHModGhpcy5sb2dnZXIsIHRoaXMuc291cmNlRGlyZWN0b3J5LCB0aGlzLnBhdGhNYXBwaW5ncyk7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBwcml2YXRlIGVudHJ5UG9pbnRNYW5pZmVzdDogRW50cnlQb2ludE1hbmlmZXN0LFxuICAgICAgcHJpdmF0ZSBzb3VyY2VEaXJlY3Rvcnk6IEFic29sdXRlRnNQYXRoLCBwcml2YXRlIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCkge31cbiAgLyoqXG4gICAqIFNlYXJjaCB0aGUgYHNvdXJjZURpcmVjdG9yeWAsIGFuZCBzdWItZGlyZWN0b3JpZXMsIHVzaW5nIGBwYXRoTWFwcGluZ3NgIGFzIG5lY2Vzc2FyeSwgdG8gZmluZFxuICAgKiBhbGwgcGFja2FnZSBlbnRyeS1wb2ludHMuXG4gICAqL1xuICBmaW5kRW50cnlQb2ludHMoKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgICBjb25zdCB1bnNvcnRlZEVudHJ5UG9pbnRzOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdID0gW107XG4gICAgZm9yIChjb25zdCBiYXNlUGF0aCBvZiB0aGlzLmJhc2VQYXRocykge1xuICAgICAgY29uc3QgZW50cnlQb2ludHMgPSB0aGlzLmVudHJ5UG9pbnRNYW5pZmVzdC5yZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KGJhc2VQYXRoKSB8fFxuICAgICAgICAgIHRoaXMud2Fsa0Jhc2VQYXRoRm9yUGFja2FnZXMoYmFzZVBhdGgpO1xuICAgICAgZW50cnlQb2ludHMuZm9yRWFjaChlID0+IHVuc29ydGVkRW50cnlQb2ludHMucHVzaChlKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlc29sdmVyLnNvcnRFbnRyeVBvaW50c0J5RGVwZW5kZW5jeSh1bnNvcnRlZEVudHJ5UG9pbnRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGBiYXNlUGF0aGAgZm9yIHBvc3NpYmxlIEFuZ3VsYXIgcGFja2FnZXMgYW5kIGVudHJ5LXBvaW50cy5cbiAgICpcbiAgICogQHBhcmFtIGJhc2VQYXRoIFRoZSBwYXRoIGF0IHdoaWNoIHRvIHN0YXJ0IHRoZSBzZWFyY2hcbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgYEVudHJ5UG9pbnRgcyB0aGF0IHdlcmUgZm91bmQgd2l0aGluIGBiYXNlUGF0aGAuXG4gICAqL1xuICB3YWxrQmFzZVBhdGhGb3JQYWNrYWdlcyhiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgYE5vIG1hbmlmZXN0IGZvdW5kIGZvciAke2Jhc2VQYXRofSBzbyB3YWxraW5nIHRoZSBkaXJlY3RvcmllcyBmb3IgZW50cnktcG9pbnRzLmApO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gdHJhY2tEdXJhdGlvbihcbiAgICAgICAgKCkgPT4gdGhpcy53YWxrRGlyZWN0b3J5Rm9yUGFja2FnZXMoYmFzZVBhdGgpLFxuICAgICAgICBkdXJhdGlvbiA9PiB0aGlzLmxvZ2dlci5kZWJ1ZyhgV2Fsa2luZyAke2Jhc2VQYXRofSBmb3IgZW50cnktcG9pbnRzIHRvb2sgJHtkdXJhdGlvbn1zLmApKTtcbiAgICB0aGlzLmVudHJ5UG9pbnRNYW5pZmVzdC53cml0ZUVudHJ5UG9pbnRNYW5pZmVzdChiYXNlUGF0aCwgZW50cnlQb2ludHMpO1xuICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rIGZvciBBbmd1bGFyIHBhY2thZ2VzIHRoYXQgbmVlZCB0byBiZSBjb21waWxlZCwgc3RhcnRpbmcgYXQgdGhlIHNvdXJjZSBkaXJlY3RvcnkuXG4gICAqIFRoZSBmdW5jdGlvbiB3aWxsIHJlY3Vyc2UgaW50byBkaXJlY3RvcmllcyB0aGF0IHN0YXJ0IHdpdGggYEAuLi5gLCBlLmcuIGBAYW5ndWxhci8uLi5gLlxuICAgKlxuICAgKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IEFuIGFic29sdXRlIHBhdGggdG8gdGhlIHJvb3QgZGlyZWN0b3J5IHdoZXJlIHNlYXJjaGluZyBiZWdpbnMuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBFbnRyeVBvaW50YHMgdGhhdCB3ZXJlIGZvdW5kIHdpdGhpbiBgc291cmNlRGlyZWN0b3J5YC5cbiAgICovXG4gIHdhbGtEaXJlY3RvcnlGb3JQYWNrYWdlcyhzb3VyY2VEaXJlY3Rvcnk6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXNbXSB7XG4gICAgLy8gVHJ5IHRvIGdldCBhIHByaW1hcnkgZW50cnkgcG9pbnQgZnJvbSB0aGlzIGRpcmVjdG9yeVxuICAgIGNvbnN0IHByaW1hcnlFbnRyeVBvaW50ID1cbiAgICAgICAgZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5jb25maWcsIHRoaXMubG9nZ2VyLCBzb3VyY2VEaXJlY3RvcnksIHNvdXJjZURpcmVjdG9yeSk7XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBhbiBlbnRyeS1wb2ludCBidXQgaXQgaXMgbm90IGNvbXBhdGlibGUgd2l0aCBuZ2NjIChpdCBoYXMgYSBiYWQgcGFja2FnZS5qc29uIG9yXG4gICAgLy8gaW52YWxpZCB0eXBpbmdzKSB0aGVuIGV4aXQuIEl0IGlzIHVubGlrZWx5IHRoYXQgc3VjaCBhbiBlbnRyeSBwb2ludCBoYXMgYSBkZXBlbmRlbmN5IG9uIGFuXG4gICAgLy8gQW5ndWxhciBsaWJyYXJ5LlxuICAgIGlmIChwcmltYXJ5RW50cnlQb2ludCA9PT0gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgZW50cnlQb2ludHM6IEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzW10gPSBbXTtcbiAgICBpZiAocHJpbWFyeUVudHJ5UG9pbnQgIT09IE5PX0VOVFJZX1BPSU5UKSB7XG4gICAgICBlbnRyeVBvaW50cy5wdXNoKHRoaXMucmVzb2x2ZXIuZ2V0RW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXMocHJpbWFyeUVudHJ5UG9pbnQpKTtcbiAgICAgIHRoaXMuY29sbGVjdFNlY29uZGFyeUVudHJ5UG9pbnRzKFxuICAgICAgICAgIGVudHJ5UG9pbnRzLCBzb3VyY2VEaXJlY3RvcnksIHNvdXJjZURpcmVjdG9yeSwgdGhpcy5mcy5yZWFkZGlyKHNvdXJjZURpcmVjdG9yeSkpO1xuXG4gICAgICAvLyBBbHNvIGNoZWNrIGZvciBhbnkgbmVzdGVkIG5vZGVfbW9kdWxlcyBpbiB0aGlzIHBhY2thZ2UgYnV0IG9ubHkgaWYgYXQgbGVhc3Qgb25lIG9mIHRoZVxuICAgICAgLy8gZW50cnktcG9pbnRzIHdhcyBjb21waWxlZCBieSBBbmd1bGFyLlxuICAgICAgaWYgKGVudHJ5UG9pbnRzLnNvbWUoZSA9PiBlLmVudHJ5UG9pbnQuY29tcGlsZWRCeUFuZ3VsYXIpKSB7XG4gICAgICAgIGNvbnN0IG5lc3RlZE5vZGVNb2R1bGVzUGF0aCA9IHRoaXMuZnMuam9pbihzb3VyY2VEaXJlY3RvcnksICdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKG5lc3RlZE5vZGVNb2R1bGVzUGF0aCkpIHtcbiAgICAgICAgICBlbnRyeVBvaW50cy5wdXNoKC4uLnRoaXMud2Fsa0RpcmVjdG9yeUZvclBhY2thZ2VzKG5lc3RlZE5vZGVNb2R1bGVzUGF0aCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgICB9XG5cbiAgICAvLyBUaGUgYHNvdXJjZURpcmVjdG9yeWAgd2FzIG5vdCBhIHBhY2thZ2UgKGkuZS4gdGhlcmUgd2FzIG5vIHBhY2thZ2UuanNvbilcbiAgICAvLyBTbyBzZWFyY2ggaXRzIHN1Yi1kaXJlY3RvcmllcyBmb3IgQW5ndWxhciBwYWNrYWdlcyBhbmQgZW50cnktcG9pbnRzXG4gICAgZm9yIChjb25zdCBwYXRoIG9mIHRoaXMuZnMucmVhZGRpcihzb3VyY2VEaXJlY3RvcnkpKSB7XG4gICAgICBpZiAoaXNJZ25vcmFibGVQYXRoKHBhdGgpKSB7XG4gICAgICAgIC8vIElnbm9yZSBoaWRkZW4gZmlsZXMsIG5vZGVfbW9kdWxlcyBhbmQgbmdjYyBkaXJlY3RvcnlcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFic29sdXRlUGF0aCA9IHRoaXMuZnMucmVzb2x2ZShzb3VyY2VEaXJlY3RvcnksIHBhdGgpO1xuICAgICAgY29uc3Qgc3RhdCA9IHRoaXMuZnMubHN0YXQoYWJzb2x1dGVQYXRoKTtcbiAgICAgIGlmIChzdGF0LmlzU3ltYm9saWNMaW5rKCkgfHwgIXN0YXQuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAvLyBJZ25vcmUgc3ltYm9saWMgbGlua3MgYW5kIG5vbi1kaXJlY3Rvcmllc1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZW50cnlQb2ludHMucHVzaCguLi50aGlzLndhbGtEaXJlY3RvcnlGb3JQYWNrYWdlcyh0aGlzLmZzLmpvaW4oc291cmNlRGlyZWN0b3J5LCBwYXRoKSkpO1xuICAgIH1cblxuICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGBkaXJlY3RvcnlgIGxvb2tpbmcgZm9yIGFueSBzZWNvbmRhcnkgZW50cnktcG9pbnRzIGZvciBhIHBhY2thZ2UsIGFkZGluZyBhbnkgdGhhdFxuICAgKiBhcmUgZm91bmQgdG8gdGhlIGBlbnRyeVBvaW50c2AgYXJyYXkuXG4gICAqXG4gICAqIEBwYXJhbSBlbnRyeVBvaW50cyBBbiBhcnJheSB3aGVyZSB3ZSB3aWxsIGFkZCBhbnkgZW50cnktcG9pbnRzIGZvdW5kIGluIHRoaXMgZGlyZWN0b3J5XG4gICAqIEBwYXJhbSBwYWNrYWdlUGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcGFja2FnZSB0aGF0IG1heSBjb250YWluIGVudHJ5LXBvaW50c1xuICAgKiBAcGFyYW0gZGlyZWN0b3J5IFRoZSBjdXJyZW50IGRpcmVjdG9yeSBiZWluZyBzZWFyY2hlZFxuICAgKiBAcGFyYW0gcGF0aHMgVGhlIHBhdGhzIGNvbnRhaW5lZCBpbiB0aGUgY3VycmVudCBgZGlyZWN0b3J5YC5cbiAgICovXG4gIHByaXZhdGUgY29sbGVjdFNlY29uZGFyeUVudHJ5UG9pbnRzKFxuICAgICAgZW50cnlQb2ludHM6IEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzW10sIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIGRpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsIHBhdGhzOiBQYXRoU2VnbWVudFtdKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICBpZiAoaXNJZ25vcmFibGVQYXRoKHBhdGgpKSB7XG4gICAgICAgIC8vIElnbm9yZSBoaWRkZW4gZmlsZXMsIG5vZGVfbW9kdWxlcyBhbmQgbmdjYyBkaXJlY3RvcnlcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFic29sdXRlUGF0aCA9IHRoaXMuZnMucmVzb2x2ZShkaXJlY3RvcnksIHBhdGgpO1xuICAgICAgY29uc3Qgc3RhdCA9IHRoaXMuZnMubHN0YXQoYWJzb2x1dGVQYXRoKTtcbiAgICAgIGlmIChzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgLy8gSWdub3JlIHN5bWJvbGljIGxpbmtzXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpc0RpcmVjdG9yeSA9IHN0YXQuaXNEaXJlY3RvcnkoKTtcbiAgICAgIGlmICghcGF0aC5lbmRzV2l0aCgnLmpzJykgJiYgIWlzRGlyZWN0b3J5KSB7XG4gICAgICAgIC8vIElnbm9yZSBmaWxlcyB0aGF0IGRvIG5vdCBlbmQgaW4gYC5qc2BcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBwYXRoIGlzIGEgSlMgZmlsZSB0aGVuIHN0cmlwIGl0cyBleHRlbnNpb24gYW5kIHNlZSBpZiB3ZSBjYW4gbWF0Y2ggYW5cbiAgICAgIC8vIGVudHJ5LXBvaW50LlxuICAgICAgY29uc3QgcG9zc2libGVFbnRyeVBvaW50UGF0aCA9IGlzRGlyZWN0b3J5ID8gYWJzb2x1dGVQYXRoIDogc3RyaXBKc0V4dGVuc2lvbihhYnNvbHV0ZVBhdGgpO1xuICAgICAgbGV0IGlzRW50cnlQb2ludCA9IGZhbHNlO1xuICAgICAgY29uc3Qgc3ViRW50cnlQb2ludCA9XG4gICAgICAgICAgZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5jb25maWcsIHRoaXMubG9nZ2VyLCBwYWNrYWdlUGF0aCwgcG9zc2libGVFbnRyeVBvaW50UGF0aCk7XG4gICAgICBpZiAoc3ViRW50cnlQb2ludCAhPT0gTk9fRU5UUllfUE9JTlQgJiYgc3ViRW50cnlQb2ludCAhPT0gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UKSB7XG4gICAgICAgIGVudHJ5UG9pbnRzLnB1c2godGhpcy5yZXNvbHZlci5nZXRFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcyhzdWJFbnRyeVBvaW50KSk7XG4gICAgICAgIGlzRW50cnlQb2ludCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICghaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgLy8gVGhpcyBwYXRoIGlzIG5vdCBhIGRpcmVjdG9yeSBzbyB3ZSBhcmUgZG9uZS5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoaXMgZGlyZWN0b3J5IG1heSBjb250YWluIGVudHJ5LXBvaW50cyBvZiBpdHMgb3duLlxuICAgICAgY29uc3QgY2hpbGRQYXRocyA9IHRoaXMuZnMucmVhZGRpcihhYnNvbHV0ZVBhdGgpO1xuICAgICAgaWYgKCFpc0VudHJ5UG9pbnQgJiZcbiAgICAgICAgICBjaGlsZFBhdGhzLnNvbWUoXG4gICAgICAgICAgICAgIGNoaWxkUGF0aCA9PiBjaGlsZFBhdGguZW5kc1dpdGgoJy5qcycpICYmXG4gICAgICAgICAgICAgICAgICB0aGlzLmZzLnN0YXQodGhpcy5mcy5yZXNvbHZlKGFic29sdXRlUGF0aCwgY2hpbGRQYXRoKSkuaXNGaWxlKCkpKSB7XG4gICAgICAgIC8vIFdlIGRvIG5vdCBjb25zaWRlciBub24tZW50cnktcG9pbnQgZGlyZWN0b3JpZXMgdGhhdCBjb250YWluIEpTIGZpbGVzIGFzIHRoZXkgYXJlIHZlcnlcbiAgICAgICAgLy8gdW5saWtlbHkgdG8gYmUgY29udGFpbmVycyBmb3Igc3ViLWVudHJ5LXBvaW50cy5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB0aGlzLmNvbGxlY3RTZWNvbmRhcnlFbnRyeVBvaW50cyhlbnRyeVBvaW50cywgcGFja2FnZVBhdGgsIGFic29sdXRlUGF0aCwgY2hpbGRQYXRocyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHN0cmlwSnNFeHRlbnNpb248VCBleHRlbmRzIHN0cmluZz4oZmlsZVBhdGg6IFQpOiBUIHtcbiAgcmV0dXJuIGZpbGVQYXRoLnJlcGxhY2UoL1xcLmpzJC8sICcnKSBhcyBUO1xufVxuXG5mdW5jdGlvbiBpc0lnbm9yYWJsZVBhdGgocGF0aDogUGF0aFNlZ21lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuIHBhdGguc3RhcnRzV2l0aCgnLicpIHx8IHBhdGggPT09ICdub2RlX21vZHVsZXMnIHx8IHBhdGggPT09IE5HQ0NfRElSRUNUT1JZO1xufVxuIl19