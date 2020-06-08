(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/entry_point_finder/tracing_entry_point_finder", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/entry_point_finder/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TracingEntryPointFinder = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/utils");
    /**
     * An EntryPointFinder that starts from a set of initial files and only returns entry-points that
     * are dependencies of these files.
     *
     * This is faster than searching the entire file-system for all the entry-points,
     * and is used primarily by the CLI integration.
     *
     * There are two concrete implementations of this class.
     *
     * * `TargetEntryPointFinder` - is given a single entry-point as the initial entry-point
     * * `ProgramBasedEntryPointFinder` - computes the initial entry-points from program files given by
     * a `tsconfig.json` file.
     */
    var TracingEntryPointFinder = /** @class */ (function () {
        function TracingEntryPointFinder(fs, config, logger, resolver, basePath, pathMappings) {
            this.fs = fs;
            this.config = config;
            this.logger = logger;
            this.resolver = resolver;
            this.basePath = basePath;
            this.pathMappings = pathMappings;
            this.unprocessedPaths = [];
            this.unsortedEntryPoints = new Map();
            this.basePaths = null;
        }
        TracingEntryPointFinder.prototype.getBasePaths = function () {
            if (this.basePaths === null) {
                this.basePaths = utils_1.getBasePaths(this.logger, this.basePath, this.pathMappings);
            }
            return this.basePaths;
        };
        TracingEntryPointFinder.prototype.findEntryPoints = function () {
            this.unprocessedPaths = this.getInitialEntryPointPaths();
            while (this.unprocessedPaths.length > 0) {
                this.processNextPath();
            }
            return this.resolver.sortEntryPointsByDependency(Array.from(this.unsortedEntryPoints.values()));
        };
        TracingEntryPointFinder.prototype.getEntryPoint = function (entryPointPath) {
            var packagePath = this.computePackagePath(entryPointPath);
            var entryPoint = entry_point_1.getEntryPointInfo(this.fs, this.config, this.logger, packagePath, entryPointPath);
            if (entryPoint === entry_point_1.NO_ENTRY_POINT || entryPoint === entry_point_1.INCOMPATIBLE_ENTRY_POINT) {
                return null;
            }
            return entryPoint;
        };
        TracingEntryPointFinder.prototype.processNextPath = function () {
            var _this = this;
            var path = this.unprocessedPaths.shift();
            var entryPoint = this.getEntryPoint(path);
            if (entryPoint === null || !entryPoint.compiledByAngular) {
                return;
            }
            var entryPointWithDeps = this.resolver.getEntryPointWithDependencies(entryPoint);
            this.unsortedEntryPoints.set(entryPoint.path, entryPointWithDeps);
            entryPointWithDeps.depInfo.dependencies.forEach(function (dep) {
                if (!_this.unsortedEntryPoints.has(dep)) {
                    _this.unprocessedPaths.push(dep);
                }
            });
        };
        TracingEntryPointFinder.prototype.computePackagePath = function (entryPointPath) {
            var e_1, _a;
            // First try the main basePath, to avoid having to compute the other basePaths from the paths
            // mappings, which can be computationally intensive.
            if (entryPointPath.startsWith(this.basePath)) {
                var packagePath = this.computePackagePathFromContainingPath(entryPointPath, this.basePath);
                if (packagePath !== null) {
                    return packagePath;
                }
            }
            try {
                // The main `basePath` didn't work out so now we try the `basePaths` computed from the paths
                // mappings in `tsconfig.json`.
                for (var _b = tslib_1.__values(this.getBasePaths()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var basePath = _c.value;
                    if (entryPointPath.startsWith(basePath)) {
                        var packagePath = this.computePackagePathFromContainingPath(entryPointPath, basePath);
                        if (packagePath !== null) {
                            return packagePath;
                        }
                        // If we got here then we couldn't find a `packagePath` for the current `basePath`.
                        // Since `basePath`s are guaranteed not to be a sub-directory of each other then no other
                        // `basePath` will match either.
                        break;
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
            // Finally, if we couldn't find a `packagePath` using `basePaths` then try to find the nearest
            // `node_modules` that contains the `entryPointPath`, if there is one, and use it as a
            // `basePath`.
            return this.computePackagePathFromNearestNodeModules(entryPointPath);
        };
        /**
         * Search down to the `entryPointPath` from the `containingPath` for the first `package.json` that
         * we come to. This is the path to the entry-point's containing package. For example if
         * `containingPath` is `/a/b/c` and `entryPointPath` is `/a/b/c/d/e` and there exists
         * `/a/b/c/d/package.json` and `/a/b/c/d/e/package.json`, then we will return `/a/b/c/d`.
         *
         * To account for nested `node_modules` we actually start the search at the last `node_modules` in
         * the `entryPointPath` that is below the `containingPath`. E.g. if `containingPath` is `/a/b/c`
         * and `entryPointPath` is `/a/b/c/d/node_modules/x/y/z`, we start the search at
         * `/a/b/c/d/node_modules`.
         */
        TracingEntryPointFinder.prototype.computePackagePathFromContainingPath = function (entryPointPath, containingPath) {
            var e_2, _a;
            var packagePath = containingPath;
            var segments = this.splitPath(file_system_1.relative(containingPath, entryPointPath));
            var nodeModulesIndex = segments.lastIndexOf(file_system_1.relativeFrom('node_modules'));
            // If there are no `node_modules` in the relative path between the `basePath` and the
            // `entryPointPath` then just try the `basePath` as the `packagePath`.
            // (This can be the case with path-mapped entry-points.)
            if (nodeModulesIndex === -1) {
                if (this.fs.exists(file_system_1.join(packagePath, 'package.json'))) {
                    return packagePath;
                }
            }
            // Start the search at the deepest nested `node_modules` folder that is below the `basePath`
            // but above the `entryPointPath`, if there are any.
            while (nodeModulesIndex >= 0) {
                packagePath = file_system_1.join(packagePath, segments.shift());
                nodeModulesIndex--;
            }
            try {
                // Note that we start at the folder below the current candidate `packagePath` because the
                // initial candidate `packagePath` is either a `node_modules` folder or the `basePath` with
                // no `package.json`.
                for (var segments_1 = tslib_1.__values(segments), segments_1_1 = segments_1.next(); !segments_1_1.done; segments_1_1 = segments_1.next()) {
                    var segment = segments_1_1.value;
                    packagePath = file_system_1.join(packagePath, segment);
                    if (this.fs.exists(file_system_1.join(packagePath, 'package.json'))) {
                        return packagePath;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (segments_1_1 && !segments_1_1.done && (_a = segments_1.return)) _a.call(segments_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return null;
        };
        /**
         * Search up the directory tree from the `entryPointPath` looking for a `node_modules` directory
         * that we can use as a potential starting point for computing the package path.
         */
        TracingEntryPointFinder.prototype.computePackagePathFromNearestNodeModules = function (entryPointPath) {
            var packagePath = entryPointPath;
            var scopedPackagePath = packagePath;
            var containerPath = this.fs.dirname(packagePath);
            while (!this.fs.isRoot(containerPath) && !containerPath.endsWith('node_modules')) {
                scopedPackagePath = packagePath;
                packagePath = containerPath;
                containerPath = this.fs.dirname(containerPath);
            }
            if (this.fs.exists(file_system_1.join(packagePath, 'package.json'))) {
                // The directory directly below `node_modules` is a package - use it
                return packagePath;
            }
            else if (this.fs.basename(packagePath).startsWith('@') &&
                this.fs.exists(file_system_1.join(scopedPackagePath, 'package.json'))) {
                // The directory directly below the `node_modules` is a scope and the directory directly
                // below that is a scoped package - use it
                return scopedPackagePath;
            }
            else {
                // If we get here then none of the `basePaths` contained the `entryPointPath` and the
                // `entryPointPath` contains no `node_modules` that contains a package or a scoped
                // package. All we can do is assume that this entry-point is a primary entry-point to a
                // package.
                return entryPointPath;
            }
        };
        /**
         * Split the given `path` into path segments using an FS independent algorithm.
         * @param path The path to split.
         */
        TracingEntryPointFinder.prototype.splitPath = function (path) {
            var segments = [];
            while (path !== '.') {
                segments.unshift(this.fs.basename(path));
                path = this.fs.dirname(path);
            }
            return segments;
        };
        return TracingEntryPointFinder;
    }());
    exports.TracingEntryPointFinder = TracingEntryPointFinder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2luZ19lbnRyeV9wb2ludF9maW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL3RyYWNpbmdfZW50cnlfcG9pbnRfZmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBcUg7SUFNckgsbUZBQWdIO0lBSWhILGlGQUFxQztJQUVyQzs7Ozs7Ozs7Ozs7O09BWUc7SUFDSDtRQUtFLGlDQUNjLEVBQWMsRUFBWSxNQUF5QixFQUFZLE1BQWMsRUFDN0UsUUFBNEIsRUFBWSxRQUF3QixFQUNoRSxZQUFvQztZQUZwQyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVksV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFBWSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQzdFLGFBQVEsR0FBUixRQUFRLENBQW9CO1lBQVksYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7WUFDaEUsaUJBQVksR0FBWixZQUFZLENBQXdCO1lBUHhDLHFCQUFnQixHQUFxQixFQUFFLENBQUM7WUFDeEMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQThDLENBQUM7WUFDOUUsY0FBUyxHQUEwQixJQUFJLENBQUM7UUFLSyxDQUFDO1FBRTVDLDhDQUFZLEdBQXRCO1lBQ0UsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtnQkFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxvQkFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDOUU7WUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDeEIsQ0FBQztRQUVELGlEQUFlLEdBQWY7WUFDRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHlC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Q0ssMkNBQVMsR0FBakIsVUFBa0IsSUFBaUI7WUFDakMsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxLQUFLLEdBQUcsRUFBRTtnQkFDbkIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDOUI7WUFDRCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBN0tELElBNktDO0lBN0txQiwwREFBdUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGpvaW4sIFBhdGhTZWdtZW50LCByZWxhdGl2ZSwgcmVsYXRpdmVGcm9tfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge0VudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzfSBmcm9tICcuLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9ufSBmcm9tICcuLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludCwgZ2V0RW50cnlQb2ludEluZm8sIElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCwgTk9fRU5UUllfUE9JTlR9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuLi9wYXRoX21hcHBpbmdzJztcblxuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQge2dldEJhc2VQYXRoc30gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQW4gRW50cnlQb2ludEZpbmRlciB0aGF0IHN0YXJ0cyBmcm9tIGEgc2V0IG9mIGluaXRpYWwgZmlsZXMgYW5kIG9ubHkgcmV0dXJucyBlbnRyeS1wb2ludHMgdGhhdFxuICogYXJlIGRlcGVuZGVuY2llcyBvZiB0aGVzZSBmaWxlcy5cbiAqXG4gKiBUaGlzIGlzIGZhc3RlciB0aGFuIHNlYXJjaGluZyB0aGUgZW50aXJlIGZpbGUtc3lzdGVtIGZvciBhbGwgdGhlIGVudHJ5LXBvaW50cyxcbiAqIGFuZCBpcyB1c2VkIHByaW1hcmlseSBieSB0aGUgQ0xJIGludGVncmF0aW9uLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gY29uY3JldGUgaW1wbGVtZW50YXRpb25zIG9mIHRoaXMgY2xhc3MuXG4gKlxuICogKiBgVGFyZ2V0RW50cnlQb2ludEZpbmRlcmAgLSBpcyBnaXZlbiBhIHNpbmdsZSBlbnRyeS1wb2ludCBhcyB0aGUgaW5pdGlhbCBlbnRyeS1wb2ludFxuICogKiBgUHJvZ3JhbUJhc2VkRW50cnlQb2ludEZpbmRlcmAgLSBjb21wdXRlcyB0aGUgaW5pdGlhbCBlbnRyeS1wb2ludHMgZnJvbSBwcm9ncmFtIGZpbGVzIGdpdmVuIGJ5XG4gKiBhIGB0c2NvbmZpZy5qc29uYCBmaWxlLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgVHJhY2luZ0VudHJ5UG9pbnRGaW5kZXIgaW1wbGVtZW50cyBFbnRyeVBvaW50RmluZGVyIHtcbiAgcHJvdGVjdGVkIHVucHJvY2Vzc2VkUGF0aHM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgcHJvdGVjdGVkIHVuc29ydGVkRW50cnlQb2ludHMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcz4oKTtcbiAgcHJpdmF0ZSBiYXNlUGF0aHM6IEFic29sdXRlRnNQYXRoW118bnVsbCA9IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgZnM6IEZpbGVTeXN0ZW0sIHByb3RlY3RlZCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBwcm90ZWN0ZWQgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcm90ZWN0ZWQgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlciwgcHJvdGVjdGVkIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIHByb3RlY3RlZCBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5nc3x1bmRlZmluZWQpIHt9XG5cbiAgcHJvdGVjdGVkIGdldEJhc2VQYXRocygpIHtcbiAgICBpZiAodGhpcy5iYXNlUGF0aHMgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuYmFzZVBhdGhzID0gZ2V0QmFzZVBhdGhzKHRoaXMubG9nZ2VyLCB0aGlzLmJhc2VQYXRoLCB0aGlzLnBhdGhNYXBwaW5ncyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmJhc2VQYXRocztcbiAgfVxuXG4gIGZpbmRFbnRyeVBvaW50cygpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICAgIHRoaXMudW5wcm9jZXNzZWRQYXRocyA9IHRoaXMuZ2V0SW5pdGlhbEVudHJ5UG9pbnRQYXRocygpO1xuICAgIHdoaWxlICh0aGlzLnVucHJvY2Vzc2VkUGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5wcm9jZXNzTmV4dFBhdGgoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZXIuc29ydEVudHJ5UG9pbnRzQnlEZXBlbmRlbmN5KEFycmF5LmZyb20odGhpcy51bnNvcnRlZEVudHJ5UG9pbnRzLnZhbHVlcygpKSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYWJzdHJhY3QgZ2V0SW5pdGlhbEVudHJ5UG9pbnRQYXRocygpOiBBYnNvbHV0ZUZzUGF0aFtdO1xuXG4gIHByb3RlY3RlZCBnZXRFbnRyeVBvaW50KGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnR8bnVsbCB7XG4gICAgY29uc3QgcGFja2FnZVBhdGggPSB0aGlzLmNvbXB1dGVQYWNrYWdlUGF0aChlbnRyeVBvaW50UGF0aCk7XG4gICAgY29uc3QgZW50cnlQb2ludCA9XG4gICAgICAgIGdldEVudHJ5UG9pbnRJbmZvKHRoaXMuZnMsIHRoaXMuY29uZmlnLCB0aGlzLmxvZ2dlciwgcGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoKTtcbiAgICBpZiAoZW50cnlQb2ludCA9PT0gTk9fRU5UUllfUE9JTlQgfHwgZW50cnlQb2ludCA9PT0gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGVudHJ5UG9pbnQ7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NOZXh0UGF0aCgpOiB2b2lkIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51bnByb2Nlc3NlZFBhdGhzLnNoaWZ0KCkhO1xuICAgIGNvbnN0IGVudHJ5UG9pbnQgPSB0aGlzLmdldEVudHJ5UG9pbnQocGF0aCk7XG4gICAgaWYgKGVudHJ5UG9pbnQgPT09IG51bGwgfHwgIWVudHJ5UG9pbnQuY29tcGlsZWRCeUFuZ3VsYXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZW50cnlQb2ludFdpdGhEZXBzID0gdGhpcy5yZXNvbHZlci5nZXRFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcyhlbnRyeVBvaW50KTtcbiAgICB0aGlzLnVuc29ydGVkRW50cnlQb2ludHMuc2V0KGVudHJ5UG9pbnQucGF0aCwgZW50cnlQb2ludFdpdGhEZXBzKTtcbiAgICBlbnRyeVBvaW50V2l0aERlcHMuZGVwSW5mby5kZXBlbmRlbmNpZXMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgaWYgKCF0aGlzLnVuc29ydGVkRW50cnlQb2ludHMuaGFzKGRlcCkpIHtcbiAgICAgICAgdGhpcy51bnByb2Nlc3NlZFBhdGhzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZVBhY2thZ2VQYXRoKGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICAvLyBGaXJzdCB0cnkgdGhlIG1haW4gYmFzZVBhdGgsIHRvIGF2b2lkIGhhdmluZyB0byBjb21wdXRlIHRoZSBvdGhlciBiYXNlUGF0aHMgZnJvbSB0aGUgcGF0aHNcbiAgICAvLyBtYXBwaW5ncywgd2hpY2ggY2FuIGJlIGNvbXB1dGF0aW9uYWxseSBpbnRlbnNpdmUuXG4gICAgaWYgKGVudHJ5UG9pbnRQYXRoLnN0YXJ0c1dpdGgodGhpcy5iYXNlUGF0aCkpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gdGhpcy5jb21wdXRlUGFja2FnZVBhdGhGcm9tQ29udGFpbmluZ1BhdGgoZW50cnlQb2ludFBhdGgsIHRoaXMuYmFzZVBhdGgpO1xuICAgICAgaWYgKHBhY2thZ2VQYXRoICE9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGUgbWFpbiBgYmFzZVBhdGhgIGRpZG4ndCB3b3JrIG91dCBzbyBub3cgd2UgdHJ5IHRoZSBgYmFzZVBhdGhzYCBjb21wdXRlZCBmcm9tIHRoZSBwYXRoc1xuICAgIC8vIG1hcHBpbmdzIGluIGB0c2NvbmZpZy5qc29uYC5cbiAgICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIHRoaXMuZ2V0QmFzZVBhdGhzKCkpIHtcbiAgICAgIGlmIChlbnRyeVBvaW50UGF0aC5zdGFydHNXaXRoKGJhc2VQYXRoKSkge1xuICAgICAgICBjb25zdCBwYWNrYWdlUGF0aCA9IHRoaXMuY29tcHV0ZVBhY2thZ2VQYXRoRnJvbUNvbnRhaW5pbmdQYXRoKGVudHJ5UG9pbnRQYXRoLCBiYXNlUGF0aCk7XG4gICAgICAgIGlmIChwYWNrYWdlUGF0aCAhPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiB3ZSBnb3QgaGVyZSB0aGVuIHdlIGNvdWxkbid0IGZpbmQgYSBgcGFja2FnZVBhdGhgIGZvciB0aGUgY3VycmVudCBgYmFzZVBhdGhgLlxuICAgICAgICAvLyBTaW5jZSBgYmFzZVBhdGhgcyBhcmUgZ3VhcmFudGVlZCBub3QgdG8gYmUgYSBzdWItZGlyZWN0b3J5IG9mIGVhY2ggb3RoZXIgdGhlbiBubyBvdGhlclxuICAgICAgICAvLyBgYmFzZVBhdGhgIHdpbGwgbWF0Y2ggZWl0aGVyLlxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGaW5hbGx5LCBpZiB3ZSBjb3VsZG4ndCBmaW5kIGEgYHBhY2thZ2VQYXRoYCB1c2luZyBgYmFzZVBhdGhzYCB0aGVuIHRyeSB0byBmaW5kIHRoZSBuZWFyZXN0XG4gICAgLy8gYG5vZGVfbW9kdWxlc2AgdGhhdCBjb250YWlucyB0aGUgYGVudHJ5UG9pbnRQYXRoYCwgaWYgdGhlcmUgaXMgb25lLCBhbmQgdXNlIGl0IGFzIGFcbiAgICAvLyBgYmFzZVBhdGhgLlxuICAgIHJldHVybiB0aGlzLmNvbXB1dGVQYWNrYWdlUGF0aEZyb21OZWFyZXN0Tm9kZU1vZHVsZXMoZW50cnlQb2ludFBhdGgpO1xuICB9XG5cblxuICAvKipcbiAgICogU2VhcmNoIGRvd24gdG8gdGhlIGBlbnRyeVBvaW50UGF0aGAgZnJvbSB0aGUgYGNvbnRhaW5pbmdQYXRoYCBmb3IgdGhlIGZpcnN0IGBwYWNrYWdlLmpzb25gIHRoYXRcbiAgICogd2UgY29tZSB0by4gVGhpcyBpcyB0aGUgcGF0aCB0byB0aGUgZW50cnktcG9pbnQncyBjb250YWluaW5nIHBhY2thZ2UuIEZvciBleGFtcGxlIGlmXG4gICAqIGBjb250YWluaW5nUGF0aGAgaXMgYC9hL2IvY2AgYW5kIGBlbnRyeVBvaW50UGF0aGAgaXMgYC9hL2IvYy9kL2VgIGFuZCB0aGVyZSBleGlzdHNcbiAgICogYC9hL2IvYy9kL3BhY2thZ2UuanNvbmAgYW5kIGAvYS9iL2MvZC9lL3BhY2thZ2UuanNvbmAsIHRoZW4gd2Ugd2lsbCByZXR1cm4gYC9hL2IvYy9kYC5cbiAgICpcbiAgICogVG8gYWNjb3VudCBmb3IgbmVzdGVkIGBub2RlX21vZHVsZXNgIHdlIGFjdHVhbGx5IHN0YXJ0IHRoZSBzZWFyY2ggYXQgdGhlIGxhc3QgYG5vZGVfbW9kdWxlc2AgaW5cbiAgICogdGhlIGBlbnRyeVBvaW50UGF0aGAgdGhhdCBpcyBiZWxvdyB0aGUgYGNvbnRhaW5pbmdQYXRoYC4gRS5nLiBpZiBgY29udGFpbmluZ1BhdGhgIGlzIGAvYS9iL2NgXG4gICAqIGFuZCBgZW50cnlQb2ludFBhdGhgIGlzIGAvYS9iL2MvZC9ub2RlX21vZHVsZXMveC95L3pgLCB3ZSBzdGFydCB0aGUgc2VhcmNoIGF0XG4gICAqIGAvYS9iL2MvZC9ub2RlX21vZHVsZXNgLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlUGFja2FnZVBhdGhGcm9tQ29udGFpbmluZ1BhdGgoXG4gICAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRhaW5pbmdQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRofG51bGwge1xuICAgIGxldCBwYWNrYWdlUGF0aCA9IGNvbnRhaW5pbmdQYXRoO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5zcGxpdFBhdGgocmVsYXRpdmUoY29udGFpbmluZ1BhdGgsIGVudHJ5UG9pbnRQYXRoKSk7XG4gICAgbGV0IG5vZGVNb2R1bGVzSW5kZXggPSBzZWdtZW50cy5sYXN0SW5kZXhPZihyZWxhdGl2ZUZyb20oJ25vZGVfbW9kdWxlcycpKTtcblxuICAgIC8vIElmIHRoZXJlIGFyZSBubyBgbm9kZV9tb2R1bGVzYCBpbiB0aGUgcmVsYXRpdmUgcGF0aCBiZXR3ZWVuIHRoZSBgYmFzZVBhdGhgIGFuZCB0aGVcbiAgICAvLyBgZW50cnlQb2ludFBhdGhgIHRoZW4ganVzdCB0cnkgdGhlIGBiYXNlUGF0aGAgYXMgdGhlIGBwYWNrYWdlUGF0aGAuXG4gICAgLy8gKFRoaXMgY2FuIGJlIHRoZSBjYXNlIHdpdGggcGF0aC1tYXBwZWQgZW50cnktcG9pbnRzLilcbiAgICBpZiAobm9kZU1vZHVsZXNJbmRleCA9PT0gLTEpIHtcbiAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTdGFydCB0aGUgc2VhcmNoIGF0IHRoZSBkZWVwZXN0IG5lc3RlZCBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdGhhdCBpcyBiZWxvdyB0aGUgYGJhc2VQYXRoYFxuICAgIC8vIGJ1dCBhYm92ZSB0aGUgYGVudHJ5UG9pbnRQYXRoYCwgaWYgdGhlcmUgYXJlIGFueS5cbiAgICB3aGlsZSAobm9kZU1vZHVsZXNJbmRleCA+PSAwKSB7XG4gICAgICBwYWNrYWdlUGF0aCA9IGpvaW4ocGFja2FnZVBhdGgsIHNlZ21lbnRzLnNoaWZ0KCkhKTtcbiAgICAgIG5vZGVNb2R1bGVzSW5kZXgtLTtcbiAgICB9XG5cbiAgICAvLyBOb3RlIHRoYXQgd2Ugc3RhcnQgYXQgdGhlIGZvbGRlciBiZWxvdyB0aGUgY3VycmVudCBjYW5kaWRhdGUgYHBhY2thZ2VQYXRoYCBiZWNhdXNlIHRoZVxuICAgIC8vIGluaXRpYWwgY2FuZGlkYXRlIGBwYWNrYWdlUGF0aGAgaXMgZWl0aGVyIGEgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIG9yIHRoZSBgYmFzZVBhdGhgIHdpdGhcbiAgICAvLyBubyBgcGFja2FnZS5qc29uYC5cbiAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2VnbWVudHMpIHtcbiAgICAgIHBhY2thZ2VQYXRoID0gam9pbihwYWNrYWdlUGF0aCwgc2VnbWVudCk7XG4gICAgICBpZiAodGhpcy5mcy5leGlzdHMoam9pbihwYWNrYWdlUGF0aCwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgICByZXR1cm4gcGFja2FnZVBhdGg7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCB1cCB0aGUgZGlyZWN0b3J5IHRyZWUgZnJvbSB0aGUgYGVudHJ5UG9pbnRQYXRoYCBsb29raW5nIGZvciBhIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yeVxuICAgKiB0aGF0IHdlIGNhbiB1c2UgYXMgYSBwb3RlbnRpYWwgc3RhcnRpbmcgcG9pbnQgZm9yIGNvbXB1dGluZyB0aGUgcGFja2FnZSBwYXRoLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlUGFja2FnZVBhdGhGcm9tTmVhcmVzdE5vZGVNb2R1bGVzKGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICBsZXQgcGFja2FnZVBhdGggPSBlbnRyeVBvaW50UGF0aDtcbiAgICBsZXQgc2NvcGVkUGFja2FnZVBhdGggPSBwYWNrYWdlUGF0aDtcbiAgICBsZXQgY29udGFpbmVyUGF0aCA9IHRoaXMuZnMuZGlybmFtZShwYWNrYWdlUGF0aCk7XG4gICAgd2hpbGUgKCF0aGlzLmZzLmlzUm9vdChjb250YWluZXJQYXRoKSAmJiAhY29udGFpbmVyUGF0aC5lbmRzV2l0aCgnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgIHNjb3BlZFBhY2thZ2VQYXRoID0gcGFja2FnZVBhdGg7XG4gICAgICBwYWNrYWdlUGF0aCA9IGNvbnRhaW5lclBhdGg7XG4gICAgICBjb250YWluZXJQYXRoID0gdGhpcy5mcy5kaXJuYW1lKGNvbnRhaW5lclBhdGgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAvLyBUaGUgZGlyZWN0b3J5IGRpcmVjdGx5IGJlbG93IGBub2RlX21vZHVsZXNgIGlzIGEgcGFja2FnZSAtIHVzZSBpdFxuICAgICAgcmV0dXJuIHBhY2thZ2VQYXRoO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRoaXMuZnMuYmFzZW5hbWUocGFja2FnZVBhdGgpLnN0YXJ0c1dpdGgoJ0AnKSAmJlxuICAgICAgICB0aGlzLmZzLmV4aXN0cyhqb2luKHNjb3BlZFBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAvLyBUaGUgZGlyZWN0b3J5IGRpcmVjdGx5IGJlbG93IHRoZSBgbm9kZV9tb2R1bGVzYCBpcyBhIHNjb3BlIGFuZCB0aGUgZGlyZWN0b3J5IGRpcmVjdGx5XG4gICAgICAvLyBiZWxvdyB0aGF0IGlzIGEgc2NvcGVkIHBhY2thZ2UgLSB1c2UgaXRcbiAgICAgIHJldHVybiBzY29wZWRQYWNrYWdlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgd2UgZ2V0IGhlcmUgdGhlbiBub25lIG9mIHRoZSBgYmFzZVBhdGhzYCBjb250YWluZWQgdGhlIGBlbnRyeVBvaW50UGF0aGAgYW5kIHRoZVxuICAgICAgLy8gYGVudHJ5UG9pbnRQYXRoYCBjb250YWlucyBubyBgbm9kZV9tb2R1bGVzYCB0aGF0IGNvbnRhaW5zIGEgcGFja2FnZSBvciBhIHNjb3BlZFxuICAgICAgLy8gcGFja2FnZS4gQWxsIHdlIGNhbiBkbyBpcyBhc3N1bWUgdGhhdCB0aGlzIGVudHJ5LXBvaW50IGlzIGEgcHJpbWFyeSBlbnRyeS1wb2ludCB0byBhXG4gICAgICAvLyBwYWNrYWdlLlxuICAgICAgcmV0dXJuIGVudHJ5UG9pbnRQYXRoO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTcGxpdCB0aGUgZ2l2ZW4gYHBhdGhgIGludG8gcGF0aCBzZWdtZW50cyB1c2luZyBhbiBGUyBpbmRlcGVuZGVudCBhbGdvcml0aG0uXG4gICAqIEBwYXJhbSBwYXRoIFRoZSBwYXRoIHRvIHNwbGl0LlxuICAgKi9cbiAgcHJpdmF0ZSBzcGxpdFBhdGgocGF0aDogUGF0aFNlZ21lbnQpIHtcbiAgICBjb25zdCBzZWdtZW50cyA9IFtdO1xuICAgIHdoaWxlIChwYXRoICE9PSAnLicpIHtcbiAgICAgIHNlZ21lbnRzLnVuc2hpZnQodGhpcy5mcy5iYXNlbmFtZShwYXRoKSk7XG4gICAgICBwYXRoID0gdGhpcy5mcy5kaXJuYW1lKHBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gc2VnbWVudHM7XG4gIH1cbn1cbiJdfQ==