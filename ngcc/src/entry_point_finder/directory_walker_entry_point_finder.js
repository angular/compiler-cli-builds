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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlyZWN0b3J5X3dhbGtlcl9lbnRyeV9wb2ludF9maW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL2RpcmVjdG9yeV93YWxrZXJfZW50cnlfcG9pbnRfZmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFZQSxtRkFBb0c7SUFHcEcsa0hBQXNFO0lBR3RFLGlGQUFvRDtJQUVwRDs7O09BR0c7SUFDSDtRQUVFLHlDQUNZLEVBQWMsRUFBVSxNQUF5QixFQUFVLE1BQWMsRUFDekUsUUFBNEIsRUFBVSxrQkFBc0MsRUFDNUUsZUFBK0IsRUFBVSxZQUFvQztZQUY3RSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ3pFLGFBQVEsR0FBUixRQUFRLENBQW9CO1lBQVUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtZQUM1RSxvQkFBZSxHQUFmLGVBQWUsQ0FBZ0I7WUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBd0I7WUFKakYsY0FBUyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUlLLENBQUM7UUFDN0Y7OztXQUdHO1FBQ0gseURBQWUsR0FBZjs7WUFDRSxJQUFNLG1CQUFtQixHQUFpQyxFQUFFLENBQUM7O2dCQUM3RCxLQUF1QixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBbEMsSUFBTSxRQUFRLFdBQUE7b0JBQ2pCLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUM7d0JBQzlFLElBQUksQ0FB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LFNBQVMsZ0JBQWdCLENBQW1CLFFBQVc7UUFDckQsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQU0sQ0FBQztJQUM1QyxDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsSUFBaUI7UUFDeEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksS0FBSyxjQUFjLElBQUksSUFBSSxLQUFLLDRDQUFjLENBQUM7SUFDcEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIFBhdGhTZWdtZW50fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc30gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0RlcGVuZGVuY3lSZXNvbHZlciwgU29ydGVkRW50cnlQb2ludHNJbmZvfSBmcm9tICcuLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlcic7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge2dldEVudHJ5UG9pbnRJbmZvLCBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQsIE5PX0VOVFJZX1BPSU5UfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge0VudHJ5UG9pbnRNYW5pZmVzdH0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfbWFuaWZlc3QnO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3BhdGhfbWFwcGluZ3MnO1xuaW1wb3J0IHtOR0NDX0RJUkVDVE9SWX0gZnJvbSAnLi4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuXG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7Z2V0QmFzZVBhdGhzLCB0cmFja0R1cmF0aW9ufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBBbiBFbnRyeVBvaW50RmluZGVyIHRoYXQgc2VhcmNoZXMgZm9yIGFsbCBlbnRyeS1wb2ludHMgdGhhdCBjYW4gYmUgZm91bmQgZ2l2ZW4gYSBgYmFzZVBhdGhgIGFuZFxuICogYHBhdGhNYXBwaW5nc2AuXG4gKi9cbmV4cG9ydCBjbGFzcyBEaXJlY3RvcnlXYWxrZXJFbnRyeVBvaW50RmluZGVyIGltcGxlbWVudHMgRW50cnlQb2ludEZpbmRlciB7XG4gIHByaXZhdGUgYmFzZVBhdGhzID0gZ2V0QmFzZVBhdGhzKHRoaXMubG9nZ2VyLCB0aGlzLnNvdXJjZURpcmVjdG9yeSwgdGhpcy5wYXRoTWFwcGluZ3MpO1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlciwgcHJpdmF0ZSBlbnRyeVBvaW50TWFuaWZlc3Q6IEVudHJ5UG9pbnRNYW5pZmVzdCxcbiAgICAgIHByaXZhdGUgc291cmNlRGlyZWN0b3J5OiBBYnNvbHV0ZUZzUGF0aCwgcHJpdmF0ZSBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5nc3x1bmRlZmluZWQpIHt9XG4gIC8qKlxuICAgKiBTZWFyY2ggdGhlIGBzb3VyY2VEaXJlY3RvcnlgLCBhbmQgc3ViLWRpcmVjdG9yaWVzLCB1c2luZyBgcGF0aE1hcHBpbmdzYCBhcyBuZWNlc3NhcnksIHRvIGZpbmRcbiAgICogYWxsIHBhY2thZ2UgZW50cnktcG9pbnRzLlxuICAgKi9cbiAgZmluZEVudHJ5UG9pbnRzKCk6IFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gICAgY29uc3QgdW5zb3J0ZWRFbnRyeVBvaW50czogRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXNbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgYmFzZVBhdGggb2YgdGhpcy5iYXNlUGF0aHMpIHtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gdGhpcy5lbnRyeVBvaW50TWFuaWZlc3QucmVhZEVudHJ5UG9pbnRzVXNpbmdNYW5pZmVzdChiYXNlUGF0aCkgfHxcbiAgICAgICAgICB0aGlzLndhbGtCYXNlUGF0aEZvclBhY2thZ2VzKGJhc2VQYXRoKTtcbiAgICAgIGVudHJ5UG9pbnRzLmZvckVhY2goZSA9PiB1bnNvcnRlZEVudHJ5UG9pbnRzLnB1c2goZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5zb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3kodW5zb3J0ZWRFbnRyeVBvaW50cyk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBgYmFzZVBhdGhgIGZvciBwb3NzaWJsZSBBbmd1bGFyIHBhY2thZ2VzIGFuZCBlbnRyeS1wb2ludHMuXG4gICAqXG4gICAqIEBwYXJhbSBiYXNlUGF0aCBUaGUgcGF0aCBhdCB3aGljaCB0byBzdGFydCB0aGUgc2VhcmNoXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGBFbnRyeVBvaW50YHMgdGhhdCB3ZXJlIGZvdW5kIHdpdGhpbiBgYmFzZVBhdGhgLlxuICAgKi9cbiAgd2Fsa0Jhc2VQYXRoRm9yUGFja2FnZXMoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXNbXSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgIGBObyBtYW5pZmVzdCBmb3VuZCBmb3IgJHtiYXNlUGF0aH0gc28gd2Fsa2luZyB0aGUgZGlyZWN0b3JpZXMgZm9yIGVudHJ5LXBvaW50cy5gKTtcbiAgICBjb25zdCBlbnRyeVBvaW50cyA9IHRyYWNrRHVyYXRpb24oXG4gICAgICAgICgpID0+IHRoaXMud2Fsa0RpcmVjdG9yeUZvclBhY2thZ2VzKGJhc2VQYXRoKSxcbiAgICAgICAgZHVyYXRpb24gPT4gdGhpcy5sb2dnZXIuZGVidWcoYFdhbGtpbmcgJHtiYXNlUGF0aH0gZm9yIGVudHJ5LXBvaW50cyB0b29rICR7ZHVyYXRpb259cy5gKSk7XG4gICAgdGhpcy5lbnRyeVBvaW50TWFuaWZlc3Qud3JpdGVFbnRyeVBvaW50TWFuaWZlc3QoYmFzZVBhdGgsIGVudHJ5UG9pbnRzKTtcbiAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gIH1cblxuICAvKipcbiAgICogTG9vayBmb3IgQW5ndWxhciBwYWNrYWdlcyB0aGF0IG5lZWQgdG8gYmUgY29tcGlsZWQsIHN0YXJ0aW5nIGF0IHRoZSBzb3VyY2UgZGlyZWN0b3J5LlxuICAgKiBUaGUgZnVuY3Rpb24gd2lsbCByZWN1cnNlIGludG8gZGlyZWN0b3JpZXMgdGhhdCBzdGFydCB3aXRoIGBALi4uYCwgZS5nLiBgQGFuZ3VsYXIvLi4uYC5cbiAgICpcbiAgICogQHBhcmFtIHNvdXJjZURpcmVjdG9yeSBBbiBhYnNvbHV0ZSBwYXRoIHRvIHRoZSByb290IGRpcmVjdG9yeSB3aGVyZSBzZWFyY2hpbmcgYmVnaW5zLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBgRW50cnlQb2ludGBzIHRoYXQgd2VyZSBmb3VuZCB3aXRoaW4gYHNvdXJjZURpcmVjdG9yeWAuXG4gICAqL1xuICB3YWxrRGlyZWN0b3J5Rm9yUGFja2FnZXMoc291cmNlRGlyZWN0b3J5OiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzW10ge1xuICAgIC8vIFRyeSB0byBnZXQgYSBwcmltYXJ5IGVudHJ5IHBvaW50IGZyb20gdGhpcyBkaXJlY3RvcnlcbiAgICBjb25zdCBwcmltYXJ5RW50cnlQb2ludCA9XG4gICAgICAgIGdldEVudHJ5UG9pbnRJbmZvKHRoaXMuZnMsIHRoaXMuY29uZmlnLCB0aGlzLmxvZ2dlciwgc291cmNlRGlyZWN0b3J5LCBzb3VyY2VEaXJlY3RvcnkpO1xuXG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gZW50cnktcG9pbnQgYnV0IGl0IGlzIG5vdCBjb21wYXRpYmxlIHdpdGggbmdjYyAoaXQgaGFzIGEgYmFkIHBhY2thZ2UuanNvbiBvclxuICAgIC8vIGludmFsaWQgdHlwaW5ncykgdGhlbiBleGl0LiBJdCBpcyB1bmxpa2VseSB0aGF0IHN1Y2ggYW4gZW50cnkgcG9pbnQgaGFzIGEgZGVwZW5kZW5jeSBvbiBhblxuICAgIC8vIEFuZ3VsYXIgbGlicmFyeS5cbiAgICBpZiAocHJpbWFyeUVudHJ5UG9pbnQgPT09IElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdID0gW107XG4gICAgaWYgKHByaW1hcnlFbnRyeVBvaW50ICE9PSBOT19FTlRSWV9QT0lOVCkge1xuICAgICAgZW50cnlQb2ludHMucHVzaCh0aGlzLnJlc29sdmVyLmdldEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzKHByaW1hcnlFbnRyeVBvaW50KSk7XG4gICAgICB0aGlzLmNvbGxlY3RTZWNvbmRhcnlFbnRyeVBvaW50cyhcbiAgICAgICAgICBlbnRyeVBvaW50cywgc291cmNlRGlyZWN0b3J5LCBzb3VyY2VEaXJlY3RvcnksIHRoaXMuZnMucmVhZGRpcihzb3VyY2VEaXJlY3RvcnkpKTtcblxuICAgICAgLy8gQWxzbyBjaGVjayBmb3IgYW55IG5lc3RlZCBub2RlX21vZHVsZXMgaW4gdGhpcyBwYWNrYWdlIGJ1dCBvbmx5IGlmIGF0IGxlYXN0IG9uZSBvZiB0aGVcbiAgICAgIC8vIGVudHJ5LXBvaW50cyB3YXMgY29tcGlsZWQgYnkgQW5ndWxhci5cbiAgICAgIGlmIChlbnRyeVBvaW50cy5zb21lKGUgPT4gZS5lbnRyeVBvaW50LmNvbXBpbGVkQnlBbmd1bGFyKSkge1xuICAgICAgICBjb25zdCBuZXN0ZWROb2RlTW9kdWxlc1BhdGggPSB0aGlzLmZzLmpvaW4oc291cmNlRGlyZWN0b3J5LCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKSB7XG4gICAgICAgICAgZW50cnlQb2ludHMucHVzaCguLi50aGlzLndhbGtEaXJlY3RvcnlGb3JQYWNrYWdlcyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gICAgfVxuXG4gICAgLy8gVGhlIGBzb3VyY2VEaXJlY3RvcnlgIHdhcyBub3QgYSBwYWNrYWdlIChpLmUuIHRoZXJlIHdhcyBubyBwYWNrYWdlLmpzb24pXG4gICAgLy8gU28gc2VhcmNoIGl0cyBzdWItZGlyZWN0b3JpZXMgZm9yIEFuZ3VsYXIgcGFja2FnZXMgYW5kIGVudHJ5LXBvaW50c1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiB0aGlzLmZzLnJlYWRkaXIoc291cmNlRGlyZWN0b3J5KSkge1xuICAgICAgaWYgKGlzSWdub3JhYmxlUGF0aChwYXRoKSkge1xuICAgICAgICAvLyBJZ25vcmUgaGlkZGVuIGZpbGVzLCBub2RlX21vZHVsZXMgYW5kIG5nY2MgZGlyZWN0b3J5XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhYnNvbHV0ZVBhdGggPSB0aGlzLmZzLnJlc29sdmUoc291cmNlRGlyZWN0b3J5LCBwYXRoKTtcbiAgICAgIGNvbnN0IHN0YXQgPSB0aGlzLmZzLmxzdGF0KGFic29sdXRlUGF0aCk7XG4gICAgICBpZiAoc3RhdC5pc1N5bWJvbGljTGluaygpIHx8ICFzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgLy8gSWdub3JlIHN5bWJvbGljIGxpbmtzIGFuZCBub24tZGlyZWN0b3JpZXNcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGVudHJ5UG9pbnRzLnB1c2goLi4udGhpcy53YWxrRGlyZWN0b3J5Rm9yUGFja2FnZXModGhpcy5mcy5qb2luKHNvdXJjZURpcmVjdG9yeSwgcGF0aCkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHRoZSBgZGlyZWN0b3J5YCBsb29raW5nIGZvciBhbnkgc2Vjb25kYXJ5IGVudHJ5LXBvaW50cyBmb3IgYSBwYWNrYWdlLCBhZGRpbmcgYW55IHRoYXRcbiAgICogYXJlIGZvdW5kIHRvIHRoZSBgZW50cnlQb2ludHNgIGFycmF5LlxuICAgKlxuICAgKiBAcGFyYW0gZW50cnlQb2ludHMgQW4gYXJyYXkgd2hlcmUgd2Ugd2lsbCBhZGQgYW55IGVudHJ5LXBvaW50cyBmb3VuZCBpbiB0aGlzIGRpcmVjdG9yeVxuICAgKiBAcGFyYW0gcGFja2FnZVBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2UgdGhhdCBtYXkgY29udGFpbiBlbnRyeS1wb2ludHNcbiAgICogQHBhcmFtIGRpcmVjdG9yeSBUaGUgY3VycmVudCBkaXJlY3RvcnkgYmVpbmcgc2VhcmNoZWRcbiAgICogQHBhcmFtIHBhdGhzIFRoZSBwYXRocyBjb250YWluZWQgaW4gdGhlIGN1cnJlbnQgYGRpcmVjdG9yeWAuXG4gICAqL1xuICBwcml2YXRlIGNvbGxlY3RTZWNvbmRhcnlFbnRyeVBvaW50cyhcbiAgICAgIGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBkaXJlY3Rvcnk6IEFic29sdXRlRnNQYXRoLCBwYXRoczogUGF0aFNlZ21lbnRbXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBwYXRocykge1xuICAgICAgaWYgKGlzSWdub3JhYmxlUGF0aChwYXRoKSkge1xuICAgICAgICAvLyBJZ25vcmUgaGlkZGVuIGZpbGVzLCBub2RlX21vZHVsZXMgYW5kIG5nY2MgZGlyZWN0b3J5XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhYnNvbHV0ZVBhdGggPSB0aGlzLmZzLnJlc29sdmUoZGlyZWN0b3J5LCBwYXRoKTtcbiAgICAgIGNvbnN0IHN0YXQgPSB0aGlzLmZzLmxzdGF0KGFic29sdXRlUGF0aCk7XG4gICAgICBpZiAoc3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIC8vIElnbm9yZSBzeW1ib2xpYyBsaW5rc1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNEaXJlY3RvcnkgPSBzdGF0LmlzRGlyZWN0b3J5KCk7XG4gICAgICBpZiAoIXBhdGguZW5kc1dpdGgoJy5qcycpICYmICFpc0RpcmVjdG9yeSkge1xuICAgICAgICAvLyBJZ25vcmUgZmlsZXMgdGhhdCBkbyBub3QgZW5kIGluIGAuanNgXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgcGF0aCBpcyBhIEpTIGZpbGUgdGhlbiBzdHJpcCBpdHMgZXh0ZW5zaW9uIGFuZCBzZWUgaWYgd2UgY2FuIG1hdGNoIGFuXG4gICAgICAvLyBlbnRyeS1wb2ludC5cbiAgICAgIGNvbnN0IHBvc3NpYmxlRW50cnlQb2ludFBhdGggPSBpc0RpcmVjdG9yeSA/IGFic29sdXRlUGF0aCA6IHN0cmlwSnNFeHRlbnNpb24oYWJzb2x1dGVQYXRoKTtcbiAgICAgIGxldCBpc0VudHJ5UG9pbnQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IHN1YkVudHJ5UG9pbnQgPVxuICAgICAgICAgIGdldEVudHJ5UG9pbnRJbmZvKHRoaXMuZnMsIHRoaXMuY29uZmlnLCB0aGlzLmxvZ2dlciwgcGFja2FnZVBhdGgsIHBvc3NpYmxlRW50cnlQb2ludFBhdGgpO1xuICAgICAgaWYgKHN1YkVudHJ5UG9pbnQgIT09IE5PX0VOVFJZX1BPSU5UICYmIHN1YkVudHJ5UG9pbnQgIT09IElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCkge1xuICAgICAgICBlbnRyeVBvaW50cy5wdXNoKHRoaXMucmVzb2x2ZXIuZ2V0RW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXMoc3ViRW50cnlQb2ludCkpO1xuICAgICAgICBpc0VudHJ5UG9pbnQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWlzRGlyZWN0b3J5KSB7XG4gICAgICAgIC8vIFRoaXMgcGF0aCBpcyBub3QgYSBkaXJlY3Rvcnkgc28gd2UgYXJlIGRvbmUuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGlzIGRpcmVjdG9yeSBtYXkgY29udGFpbiBlbnRyeS1wb2ludHMgb2YgaXRzIG93bi5cbiAgICAgIGNvbnN0IGNoaWxkUGF0aHMgPSB0aGlzLmZzLnJlYWRkaXIoYWJzb2x1dGVQYXRoKTtcbiAgICAgIGlmICghaXNFbnRyeVBvaW50ICYmXG4gICAgICAgICAgY2hpbGRQYXRocy5zb21lKFxuICAgICAgICAgICAgICBjaGlsZFBhdGggPT4gY2hpbGRQYXRoLmVuZHNXaXRoKCcuanMnKSAmJlxuICAgICAgICAgICAgICAgICAgdGhpcy5mcy5zdGF0KHRoaXMuZnMucmVzb2x2ZShhYnNvbHV0ZVBhdGgsIGNoaWxkUGF0aCkpLmlzRmlsZSgpKSkge1xuICAgICAgICAvLyBXZSBkbyBub3QgY29uc2lkZXIgbm9uLWVudHJ5LXBvaW50IGRpcmVjdG9yaWVzIHRoYXQgY29udGFpbiBKUyBmaWxlcyBhcyB0aGV5IGFyZSB2ZXJ5XG4gICAgICAgIC8vIHVubGlrZWx5IHRvIGJlIGNvbnRhaW5lcnMgZm9yIHN1Yi1lbnRyeS1wb2ludHMuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy5jb2xsZWN0U2Vjb25kYXJ5RW50cnlQb2ludHMoZW50cnlQb2ludHMsIHBhY2thZ2VQYXRoLCBhYnNvbHV0ZVBhdGgsIGNoaWxkUGF0aHMpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzdHJpcEpzRXh0ZW5zaW9uPFQgZXh0ZW5kcyBzdHJpbmc+KGZpbGVQYXRoOiBUKTogVCB7XG4gIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC9cXC5qcyQvLCAnJykgYXMgVDtcbn1cblxuZnVuY3Rpb24gaXNJZ25vcmFibGVQYXRoKHBhdGg6IFBhdGhTZWdtZW50KTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoLnN0YXJ0c1dpdGgoJy4nKSB8fCBwYXRoID09PSAnbm9kZV9tb2R1bGVzJyB8fCBwYXRoID09PSBOR0NDX0RJUkVDVE9SWTtcbn1cbiJdfQ==