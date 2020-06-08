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
     * There are two concrete implementation of this class.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2luZ19lbnRyeV9wb2ludF9maW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL3RyYWNpbmdfZW50cnlfcG9pbnRfZmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBcUg7SUFNckgsbUZBQWdIO0lBSWhILGlGQUFxQztJQUVyQzs7Ozs7Ozs7Ozs7O09BWUc7SUFDSDtRQUtFLGlDQUNjLEVBQWMsRUFBWSxNQUF5QixFQUFZLE1BQWMsRUFDN0UsUUFBNEIsRUFBWSxRQUF3QixFQUNoRSxZQUFvQztZQUZwQyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVksV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFBWSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQzdFLGFBQVEsR0FBUixRQUFRLENBQW9CO1lBQVksYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7WUFDaEUsaUJBQVksR0FBWixZQUFZLENBQXdCO1lBUHhDLHFCQUFnQixHQUFxQixFQUFFLENBQUM7WUFDeEMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQThDLENBQUM7WUFDOUUsY0FBUyxHQUEwQixJQUFJLENBQUM7UUFLSyxDQUFDO1FBRTVDLDhDQUFZLEdBQXRCO1lBQ0UsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtnQkFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxvQkFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDOUU7WUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDeEIsQ0FBQztRQUVELGlEQUFlLEdBQWY7WUFDRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHlC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Q0ssMkNBQVMsR0FBakIsVUFBa0IsSUFBaUI7WUFDakMsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxLQUFLLEdBQUcsRUFBRTtnQkFDbkIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDOUI7WUFDRCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBN0tELElBNktDO0lBN0txQiwwREFBdUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGpvaW4sIFBhdGhTZWdtZW50LCByZWxhdGl2ZSwgcmVsYXRpdmVGcm9tfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge0VudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzfSBmcm9tICcuLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9ufSBmcm9tICcuLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludCwgZ2V0RW50cnlQb2ludEluZm8sIElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCwgTk9fRU5UUllfUE9JTlR9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuLi9wYXRoX21hcHBpbmdzJztcblxuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQge2dldEJhc2VQYXRoc30gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQW4gRW50cnlQb2ludEZpbmRlciB0aGF0IHN0YXJ0cyBmcm9tIGEgc2V0IG9mIGluaXRpYWwgZmlsZXMgYW5kIG9ubHkgcmV0dXJucyBlbnRyeS1wb2ludHMgdGhhdFxuICogYXJlIGRlcGVuZGVuY2llcyBvZiB0aGVzZSBmaWxlcy5cbiAqXG4gKiBUaGlzIGlzIGZhc3RlciB0aGFuIHNlYXJjaGluZyB0aGUgZW50aXJlIGZpbGUtc3lzdGVtIGZvciBhbGwgdGhlIGVudHJ5LXBvaW50cyxcbiAqIGFuZCBpcyB1c2VkIHByaW1hcmlseSBieSB0aGUgQ0xJIGludGVncmF0aW9uLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gY29uY3JldGUgaW1wbGVtZW50YXRpb24gb2YgdGhpcyBjbGFzcy5cbiAqXG4gKiAqIGBUYXJnZXRFbnRyeVBvaW50RmluZGVyYCAtIGlzIGdpdmVuIGEgc2luZ2xlIGVudHJ5LXBvaW50IGFzIHRoZSBpbml0aWFsIGVudHJ5LXBvaW50XG4gKiAqIGBQcm9ncmFtQmFzZWRFbnRyeVBvaW50RmluZGVyYCAtIGNvbXB1dGVzIHRoZSBpbml0aWFsIGVudHJ5LXBvaW50cyBmcm9tIHByb2dyYW0gZmlsZXMgZ2l2ZW4gYnlcbiAqIGEgYHRzY29uZmlnLmpzb25gIGZpbGUuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBUcmFjaW5nRW50cnlQb2ludEZpbmRlciBpbXBsZW1lbnRzIEVudHJ5UG9pbnRGaW5kZXIge1xuICBwcm90ZWN0ZWQgdW5wcm9jZXNzZWRQYXRoczogQWJzb2x1dGVGc1BhdGhbXSA9IFtdO1xuICBwcm90ZWN0ZWQgdW5zb3J0ZWRFbnRyeVBvaW50cyA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzPigpO1xuICBwcml2YXRlIGJhc2VQYXRoczogQWJzb2x1dGVGc1BhdGhbXXxudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBmczogRmlsZVN5c3RlbSwgcHJvdGVjdGVkIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIHByb3RlY3RlZCBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByb3RlY3RlZCByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBwcm90ZWN0ZWQgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJvdGVjdGVkIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCkge31cblxuICBwcm90ZWN0ZWQgZ2V0QmFzZVBhdGhzKCkge1xuICAgIGlmICh0aGlzLmJhc2VQYXRocyA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5iYXNlUGF0aHMgPSBnZXRCYXNlUGF0aHModGhpcy5sb2dnZXIsIHRoaXMuYmFzZVBhdGgsIHRoaXMucGF0aE1hcHBpbmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYmFzZVBhdGhzO1xuICB9XG5cbiAgZmluZEVudHJ5UG9pbnRzKCk6IFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gICAgdGhpcy51bnByb2Nlc3NlZFBhdGhzID0gdGhpcy5nZXRJbml0aWFsRW50cnlQb2ludFBhdGhzKCk7XG4gICAgd2hpbGUgKHRoaXMudW5wcm9jZXNzZWRQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnByb2Nlc3NOZXh0UGF0aCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5zb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3koQXJyYXkuZnJvbSh0aGlzLnVuc29ydGVkRW50cnlQb2ludHMudmFsdWVzKCkpKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhYnN0cmFjdCBnZXRJbml0aWFsRW50cnlQb2ludFBhdGhzKCk6IEFic29sdXRlRnNQYXRoW107XG5cbiAgcHJvdGVjdGVkIGdldEVudHJ5UG9pbnQoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludHxudWxsIHtcbiAgICBjb25zdCBwYWNrYWdlUGF0aCA9IHRoaXMuY29tcHV0ZVBhY2thZ2VQYXRoKGVudHJ5UG9pbnRQYXRoKTtcbiAgICBjb25zdCBlbnRyeVBvaW50ID1cbiAgICAgICAgZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5jb25maWcsIHRoaXMubG9nZ2VyLCBwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpO1xuICAgIGlmIChlbnRyeVBvaW50ID09PSBOT19FTlRSWV9QT0lOVCB8fCBlbnRyeVBvaW50ID09PSBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZW50cnlQb2ludDtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc05leHRQYXRoKCk6IHZvaWQge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnVucHJvY2Vzc2VkUGF0aHMuc2hpZnQoKSE7XG4gICAgY29uc3QgZW50cnlQb2ludCA9IHRoaXMuZ2V0RW50cnlQb2ludChwYXRoKTtcbiAgICBpZiAoZW50cnlQb2ludCA9PT0gbnVsbCB8fCAhZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBlbnRyeVBvaW50V2l0aERlcHMgPSB0aGlzLnJlc29sdmVyLmdldEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzKGVudHJ5UG9pbnQpO1xuICAgIHRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy5zZXQoZW50cnlQb2ludC5wYXRoLCBlbnRyeVBvaW50V2l0aERlcHMpO1xuICAgIGVudHJ5UG9pbnRXaXRoRGVwcy5kZXBJbmZvLmRlcGVuZGVuY2llcy5mb3JFYWNoKGRlcCA9PiB7XG4gICAgICBpZiAoIXRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy5oYXMoZGVwKSkge1xuICAgICAgICB0aGlzLnVucHJvY2Vzc2VkUGF0aHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlUGFja2FnZVBhdGgoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIC8vIEZpcnN0IHRyeSB0aGUgbWFpbiBiYXNlUGF0aCwgdG8gYXZvaWQgaGF2aW5nIHRvIGNvbXB1dGUgdGhlIG90aGVyIGJhc2VQYXRocyBmcm9tIHRoZSBwYXRoc1xuICAgIC8vIG1hcHBpbmdzLCB3aGljaCBjYW4gYmUgY29tcHV0YXRpb25hbGx5IGludGVuc2l2ZS5cbiAgICBpZiAoZW50cnlQb2ludFBhdGguc3RhcnRzV2l0aCh0aGlzLmJhc2VQYXRoKSkge1xuICAgICAgY29uc3QgcGFja2FnZVBhdGggPSB0aGlzLmNvbXB1dGVQYWNrYWdlUGF0aEZyb21Db250YWluaW5nUGF0aChlbnRyeVBvaW50UGF0aCwgdGhpcy5iYXNlUGF0aCk7XG4gICAgICBpZiAocGFja2FnZVBhdGggIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHBhY2thZ2VQYXRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBtYWluIGBiYXNlUGF0aGAgZGlkbid0IHdvcmsgb3V0IHNvIG5vdyB3ZSB0cnkgdGhlIGBiYXNlUGF0aHNgIGNvbXB1dGVkIGZyb20gdGhlIHBhdGhzXG4gICAgLy8gbWFwcGluZ3MgaW4gYHRzY29uZmlnLmpzb25gLlxuICAgIGZvciAoY29uc3QgYmFzZVBhdGggb2YgdGhpcy5nZXRCYXNlUGF0aHMoKSkge1xuICAgICAgaWYgKGVudHJ5UG9pbnRQYXRoLnN0YXJ0c1dpdGgoYmFzZVBhdGgpKSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gdGhpcy5jb21wdXRlUGFja2FnZVBhdGhGcm9tQ29udGFpbmluZ1BhdGgoZW50cnlQb2ludFBhdGgsIGJhc2VQYXRoKTtcbiAgICAgICAgaWYgKHBhY2thZ2VQYXRoICE9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHBhY2thZ2VQYXRoO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHdlIGdvdCBoZXJlIHRoZW4gd2UgY291bGRuJ3QgZmluZCBhIGBwYWNrYWdlUGF0aGAgZm9yIHRoZSBjdXJyZW50IGBiYXNlUGF0aGAuXG4gICAgICAgIC8vIFNpbmNlIGBiYXNlUGF0aGBzIGFyZSBndWFyYW50ZWVkIG5vdCB0byBiZSBhIHN1Yi1kaXJlY3Rvcnkgb2YgZWFjaCBvdGhlciB0aGVuIG5vIG90aGVyXG4gICAgICAgIC8vIGBiYXNlUGF0aGAgd2lsbCBtYXRjaCBlaXRoZXIuXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpbmFsbHksIGlmIHdlIGNvdWxkbid0IGZpbmQgYSBgcGFja2FnZVBhdGhgIHVzaW5nIGBiYXNlUGF0aHNgIHRoZW4gdHJ5IHRvIGZpbmQgdGhlIG5lYXJlc3RcbiAgICAvLyBgbm9kZV9tb2R1bGVzYCB0aGF0IGNvbnRhaW5zIHRoZSBgZW50cnlQb2ludFBhdGhgLCBpZiB0aGVyZSBpcyBvbmUsIGFuZCB1c2UgaXQgYXMgYVxuICAgIC8vIGBiYXNlUGF0aGAuXG4gICAgcmV0dXJuIHRoaXMuY29tcHV0ZVBhY2thZ2VQYXRoRnJvbU5lYXJlc3ROb2RlTW9kdWxlcyhlbnRyeVBvaW50UGF0aCk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBTZWFyY2ggZG93biB0byB0aGUgYGVudHJ5UG9pbnRQYXRoYCBmcm9tIHRoZSBgY29udGFpbmluZ1BhdGhgIGZvciB0aGUgZmlyc3QgYHBhY2thZ2UuanNvbmAgdGhhdFxuICAgKiB3ZSBjb21lIHRvLiBUaGlzIGlzIHRoZSBwYXRoIHRvIHRoZSBlbnRyeS1wb2ludCdzIGNvbnRhaW5pbmcgcGFja2FnZS4gRm9yIGV4YW1wbGUgaWZcbiAgICogYGNvbnRhaW5pbmdQYXRoYCBpcyBgL2EvYi9jYCBhbmQgYGVudHJ5UG9pbnRQYXRoYCBpcyBgL2EvYi9jL2QvZWAgYW5kIHRoZXJlIGV4aXN0c1xuICAgKiBgL2EvYi9jL2QvcGFja2FnZS5qc29uYCBhbmQgYC9hL2IvYy9kL2UvcGFja2FnZS5qc29uYCwgdGhlbiB3ZSB3aWxsIHJldHVybiBgL2EvYi9jL2RgLlxuICAgKlxuICAgKiBUbyBhY2NvdW50IGZvciBuZXN0ZWQgYG5vZGVfbW9kdWxlc2Agd2UgYWN0dWFsbHkgc3RhcnQgdGhlIHNlYXJjaCBhdCB0aGUgbGFzdCBgbm9kZV9tb2R1bGVzYCBpblxuICAgKiB0aGUgYGVudHJ5UG9pbnRQYXRoYCB0aGF0IGlzIGJlbG93IHRoZSBgY29udGFpbmluZ1BhdGhgLiBFLmcuIGlmIGBjb250YWluaW5nUGF0aGAgaXMgYC9hL2IvY2BcbiAgICogYW5kIGBlbnRyeVBvaW50UGF0aGAgaXMgYC9hL2IvYy9kL25vZGVfbW9kdWxlcy94L3kvemAsIHdlIHN0YXJ0IHRoZSBzZWFyY2ggYXRcbiAgICogYC9hL2IvYy9kL25vZGVfbW9kdWxlc2AuXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVQYWNrYWdlUGF0aEZyb21Db250YWluaW5nUGF0aChcbiAgICAgIGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgY29udGFpbmluZ1BhdGg6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGh8bnVsbCB7XG4gICAgbGV0IHBhY2thZ2VQYXRoID0gY29udGFpbmluZ1BhdGg7XG4gICAgY29uc3Qgc2VnbWVudHMgPSB0aGlzLnNwbGl0UGF0aChyZWxhdGl2ZShjb250YWluaW5nUGF0aCwgZW50cnlQb2ludFBhdGgpKTtcbiAgICBsZXQgbm9kZU1vZHVsZXNJbmRleCA9IHNlZ21lbnRzLmxhc3RJbmRleE9mKHJlbGF0aXZlRnJvbSgnbm9kZV9tb2R1bGVzJykpO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIGBub2RlX21vZHVsZXNgIGluIHRoZSByZWxhdGl2ZSBwYXRoIGJldHdlZW4gdGhlIGBiYXNlUGF0aGAgYW5kIHRoZVxuICAgIC8vIGBlbnRyeVBvaW50UGF0aGAgdGhlbiBqdXN0IHRyeSB0aGUgYGJhc2VQYXRoYCBhcyB0aGUgYHBhY2thZ2VQYXRoYC5cbiAgICAvLyAoVGhpcyBjYW4gYmUgdGhlIGNhc2Ugd2l0aCBwYXRoLW1hcHBlZCBlbnRyeS1wb2ludHMuKVxuICAgIGlmIChub2RlTW9kdWxlc0luZGV4ID09PSAtMSkge1xuICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKGpvaW4ocGFja2FnZVBhdGgsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgcmV0dXJuIHBhY2thZ2VQYXRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFN0YXJ0IHRoZSBzZWFyY2ggYXQgdGhlIGRlZXBlc3QgbmVzdGVkIGBub2RlX21vZHVsZXNgIGZvbGRlciB0aGF0IGlzIGJlbG93IHRoZSBgYmFzZVBhdGhgXG4gICAgLy8gYnV0IGFib3ZlIHRoZSBgZW50cnlQb2ludFBhdGhgLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgIHdoaWxlIChub2RlTW9kdWxlc0luZGV4ID49IDApIHtcbiAgICAgIHBhY2thZ2VQYXRoID0gam9pbihwYWNrYWdlUGF0aCwgc2VnbWVudHMuc2hpZnQoKSEpO1xuICAgICAgbm9kZU1vZHVsZXNJbmRleC0tO1xuICAgIH1cblxuICAgIC8vIE5vdGUgdGhhdCB3ZSBzdGFydCBhdCB0aGUgZm9sZGVyIGJlbG93IHRoZSBjdXJyZW50IGNhbmRpZGF0ZSBgcGFja2FnZVBhdGhgIGJlY2F1c2UgdGhlXG4gICAgLy8gaW5pdGlhbCBjYW5kaWRhdGUgYHBhY2thZ2VQYXRoYCBpcyBlaXRoZXIgYSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgb3IgdGhlIGBiYXNlUGF0aGAgd2l0aFxuICAgIC8vIG5vIGBwYWNrYWdlLmpzb25gLlxuICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzZWdtZW50cykge1xuICAgICAgcGFja2FnZVBhdGggPSBqb2luKHBhY2thZ2VQYXRoLCBzZWdtZW50KTtcbiAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHVwIHRoZSBkaXJlY3RvcnkgdHJlZSBmcm9tIHRoZSBgZW50cnlQb2ludFBhdGhgIGxvb2tpbmcgZm9yIGEgYG5vZGVfbW9kdWxlc2AgZGlyZWN0b3J5XG4gICAqIHRoYXQgd2UgY2FuIHVzZSBhcyBhIHBvdGVudGlhbCBzdGFydGluZyBwb2ludCBmb3IgY29tcHV0aW5nIHRoZSBwYWNrYWdlIHBhdGguXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVQYWNrYWdlUGF0aEZyb21OZWFyZXN0Tm9kZU1vZHVsZXMoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIGxldCBwYWNrYWdlUGF0aCA9IGVudHJ5UG9pbnRQYXRoO1xuICAgIGxldCBzY29wZWRQYWNrYWdlUGF0aCA9IHBhY2thZ2VQYXRoO1xuICAgIGxldCBjb250YWluZXJQYXRoID0gdGhpcy5mcy5kaXJuYW1lKHBhY2thZ2VQYXRoKTtcbiAgICB3aGlsZSAoIXRoaXMuZnMuaXNSb290KGNvbnRhaW5lclBhdGgpICYmICFjb250YWluZXJQYXRoLmVuZHNXaXRoKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgc2NvcGVkUGFja2FnZVBhdGggPSBwYWNrYWdlUGF0aDtcbiAgICAgIHBhY2thZ2VQYXRoID0gY29udGFpbmVyUGF0aDtcbiAgICAgIGNvbnRhaW5lclBhdGggPSB0aGlzLmZzLmRpcm5hbWUoY29udGFpbmVyUGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGpvaW4ocGFja2FnZVBhdGgsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgIC8vIFRoZSBkaXJlY3RvcnkgZGlyZWN0bHkgYmVsb3cgYG5vZGVfbW9kdWxlc2AgaXMgYSBwYWNrYWdlIC0gdXNlIGl0XG4gICAgICByZXR1cm4gcGFja2FnZVBhdGg7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdGhpcy5mcy5iYXNlbmFtZShwYWNrYWdlUGF0aCkuc3RhcnRzV2l0aCgnQCcpICYmXG4gICAgICAgIHRoaXMuZnMuZXhpc3RzKGpvaW4oc2NvcGVkUGFja2FnZVBhdGgsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgIC8vIFRoZSBkaXJlY3RvcnkgZGlyZWN0bHkgYmVsb3cgdGhlIGBub2RlX21vZHVsZXNgIGlzIGEgc2NvcGUgYW5kIHRoZSBkaXJlY3RvcnkgZGlyZWN0bHlcbiAgICAgIC8vIGJlbG93IHRoYXQgaXMgYSBzY29wZWQgcGFja2FnZSAtIHVzZSBpdFxuICAgICAgcmV0dXJuIHNjb3BlZFBhY2thZ2VQYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB3ZSBnZXQgaGVyZSB0aGVuIG5vbmUgb2YgdGhlIGBiYXNlUGF0aHNgIGNvbnRhaW5lZCB0aGUgYGVudHJ5UG9pbnRQYXRoYCBhbmQgdGhlXG4gICAgICAvLyBgZW50cnlQb2ludFBhdGhgIGNvbnRhaW5zIG5vIGBub2RlX21vZHVsZXNgIHRoYXQgY29udGFpbnMgYSBwYWNrYWdlIG9yIGEgc2NvcGVkXG4gICAgICAvLyBwYWNrYWdlLiBBbGwgd2UgY2FuIGRvIGlzIGFzc3VtZSB0aGF0IHRoaXMgZW50cnktcG9pbnQgaXMgYSBwcmltYXJ5IGVudHJ5LXBvaW50IHRvIGFcbiAgICAgIC8vIHBhY2thZ2UuXG4gICAgICByZXR1cm4gZW50cnlQb2ludFBhdGg7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNwbGl0IHRoZSBnaXZlbiBgcGF0aGAgaW50byBwYXRoIHNlZ21lbnRzIHVzaW5nIGFuIEZTIGluZGVwZW5kZW50IGFsZ29yaXRobS5cbiAgICogQHBhcmFtIHBhdGggVGhlIHBhdGggdG8gc3BsaXQuXG4gICAqL1xuICBwcml2YXRlIHNwbGl0UGF0aChwYXRoOiBQYXRoU2VnbWVudCkge1xuICAgIGNvbnN0IHNlZ21lbnRzID0gW107XG4gICAgd2hpbGUgKHBhdGggIT09ICcuJykge1xuICAgICAgc2VnbWVudHMudW5zaGlmdCh0aGlzLmZzLmJhc2VuYW1lKHBhdGgpKTtcbiAgICAgIHBhdGggPSB0aGlzLmZzLmRpcm5hbWUocGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBzZWdtZW50cztcbiAgfVxufVxuIl19