(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/entry_point_finder/targeted_entry_point_finder", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/entry_point", "@angular/compiler-cli/ngcc/src/entry_point_finder/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TargetedEntryPointFinder = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/utils");
    /**
     * An EntryPointFinder that starts from a target entry-point and only finds
     * entry-points that are dependencies of the target.
     *
     * This is faster than searching the entire file-system for all the entry-points,
     * and is used primarily by the CLI integration.
     */
    var TargetedEntryPointFinder = /** @class */ (function () {
        function TargetedEntryPointFinder(fs, config, logger, resolver, basePath, targetPath, pathMappings) {
            this.fs = fs;
            this.config = config;
            this.logger = logger;
            this.resolver = resolver;
            this.basePath = basePath;
            this.targetPath = targetPath;
            this.pathMappings = pathMappings;
            this.unprocessedPaths = [];
            this.unsortedEntryPoints = new Map();
            this.basePaths = null;
        }
        TargetedEntryPointFinder.prototype.getBasePaths = function () {
            if (this.basePaths === null) {
                this.basePaths = utils_1.getBasePaths(this.logger, this.basePath, this.pathMappings);
            }
            return this.basePaths;
        };
        TargetedEntryPointFinder.prototype.findEntryPoints = function () {
            var _this = this;
            this.unprocessedPaths = [this.targetPath];
            while (this.unprocessedPaths.length > 0) {
                this.processNextPath();
            }
            var targetEntryPoint = this.unsortedEntryPoints.get(this.targetPath);
            var entryPoints = this.resolver.sortEntryPointsByDependency(Array.from(this.unsortedEntryPoints.values()), targetEntryPoint === null || targetEntryPoint === void 0 ? void 0 : targetEntryPoint.entryPoint);
            var invalidTarget = entryPoints.invalidEntryPoints.find(function (i) { return i.entryPoint.path === _this.targetPath; });
            if (invalidTarget !== undefined) {
                throw new Error("The target entry-point \"" + invalidTarget.entryPoint.name + "\" has missing dependencies:\n" +
                    invalidTarget.missingDependencies.map(function (dep) { return " - " + dep + "\n"; }).join(''));
            }
            return entryPoints;
        };
        TargetedEntryPointFinder.prototype.targetNeedsProcessingOrCleaning = function (propertiesToConsider, compileAllFormats) {
            var e_1, _a;
            var entryPoint = this.getEntryPoint(this.targetPath);
            if (entryPoint === null || !entryPoint.compiledByAngular) {
                return false;
            }
            try {
                for (var propertiesToConsider_1 = tslib_1.__values(propertiesToConsider), propertiesToConsider_1_1 = propertiesToConsider_1.next(); !propertiesToConsider_1_1.done; propertiesToConsider_1_1 = propertiesToConsider_1.next()) {
                    var property = propertiesToConsider_1_1.value;
                    if (entryPoint.packageJson[property]) {
                        // Here is a property that should be processed.
                        if (!build_marker_1.hasBeenProcessed(entryPoint.packageJson, property)) {
                            return true;
                        }
                        if (!compileAllFormats) {
                            // This property has been processed, and we only need one.
                            return false;
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (propertiesToConsider_1_1 && !propertiesToConsider_1_1.done && (_a = propertiesToConsider_1.return)) _a.call(propertiesToConsider_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // All `propertiesToConsider` that appear in this entry-point have been processed.
            // In other words, there were no properties that need processing.
            return false;
        };
        TargetedEntryPointFinder.prototype.processNextPath = function () {
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
        TargetedEntryPointFinder.prototype.getEntryPoint = function (entryPointPath) {
            var packagePath = this.computePackagePath(entryPointPath);
            var entryPoint = entry_point_1.getEntryPointInfo(this.fs, this.config, this.logger, packagePath, entryPointPath);
            if (entryPoint === entry_point_1.NO_ENTRY_POINT || entryPoint === entry_point_1.INCOMPATIBLE_ENTRY_POINT) {
                return null;
            }
            return entryPoint;
        };
        TargetedEntryPointFinder.prototype.computePackagePath = function (entryPointPath) {
            var e_2, _a;
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
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
        TargetedEntryPointFinder.prototype.computePackagePathFromContainingPath = function (entryPointPath, containingPath) {
            var e_3, _a;
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
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (segments_1_1 && !segments_1_1.done && (_a = segments_1.return)) _a.call(segments_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return null;
        };
        /**
         * Search up the directory tree from the `entryPointPath` looking for a `node_modules` directory
         * that we can use as a potential starting point for computing the package path.
         */
        TargetedEntryPointFinder.prototype.computePackagePathFromNearestNodeModules = function (entryPointPath) {
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
        TargetedEntryPointFinder.prototype.splitPath = function (path) {
            var segments = [];
            while (path !== '.') {
                segments.unshift(this.fs.basename(path));
                path = this.fs.dirname(path);
            }
            return segments;
        };
        return TargetedEntryPointFinder;
    }());
    exports.TargetedEntryPointFinder = TargetedEntryPointFinder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFyZ2V0ZWRfZW50cnlfcG9pbnRfZmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDJFQUFxSDtJQUlySCxxRkFBMEQ7SUFFMUQsbUZBQXdJO0lBSXhJLGlGQUFxQztJQUVyQzs7Ozs7O09BTUc7SUFDSDtRQVdFLGtDQUNZLEVBQWMsRUFBVSxNQUF5QixFQUFVLE1BQWMsRUFDekUsUUFBNEIsRUFBVSxRQUF3QixFQUM5RCxVQUEwQixFQUFVLFlBQW9DO1lBRnhFLE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFtQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDekUsYUFBUSxHQUFSLFFBQVEsQ0FBb0I7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFnQjtZQUM5RCxlQUFVLEdBQVYsVUFBVSxDQUFnQjtZQUFVLGlCQUFZLEdBQVosWUFBWSxDQUF3QjtZQWI1RSxxQkFBZ0IsR0FBcUIsRUFBRSxDQUFDO1lBQ3hDLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUE4QyxDQUFDO1lBQzVFLGNBQVMsR0FBMEIsSUFBSSxDQUFDO1FBV3VDLENBQUM7UUFWaEYsK0NBQVksR0FBcEI7WUFDRSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO2dCQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUM5RTtZQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN4QixDQUFDO1FBT0Qsa0RB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QyxHQUFHLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGtCQUFJLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLENBQUMsRUFBRTtnQkFDM0Qsd0ZBQXdGO2dCQUN4RiwwQ0FBMEM7Z0JBQzFDLE9BQU8saUJBQWlCLENBQUM7YUFDMUI7aUJBQU07Z0JBQ0wscUZBQXFGO2dCQUNyRixrRkFBa0Y7Z0JBQ2xGLHVGQUF1RjtnQkFDdkYsV0FBVztnQkFDWCxPQUFPLGNBQWMsQ0FBQzthQUN2QjtRQUNILENBQUM7UUFFRDs7O1dBR0c7UUFDSyw0Q0FBUyxHQUFqQixVQUFrQixJQUFpQjtZQUNqQyxJQUFNLFFBQVEsR0FBRyxFQUFFLENBQUM7WUFDcEIsT0FBTyxJQUFJLEtBQUssR0FBRyxFQUFFO2dCQUNuQixRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3pDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QjtZQUNELE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7UUFDSCwrQkFBQztJQUFELENBQUMsQUE1TUQsSUE0TUM7SUE1TVksNERBQXdCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgam9pbiwgUGF0aFNlZ21lbnQsIHJlbGF0aXZlLCByZWxhdGl2ZUZyb219IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0VudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzfSBmcm9tICcuLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9ob3N0JztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge2hhc0JlZW5Qcm9jZXNzZWR9IGZyb20gJy4uL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9ufSBmcm9tICcuLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgZ2V0RW50cnlQb2ludEluZm8sIElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCwgTk9fRU5UUllfUE9JTlR9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuLi9wYXRoX21hcHBpbmdzJztcblxuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQge2dldEJhc2VQYXRoc30gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQW4gRW50cnlQb2ludEZpbmRlciB0aGF0IHN0YXJ0cyBmcm9tIGEgdGFyZ2V0IGVudHJ5LXBvaW50IGFuZCBvbmx5IGZpbmRzXG4gKiBlbnRyeS1wb2ludHMgdGhhdCBhcmUgZGVwZW5kZW5jaWVzIG9mIHRoZSB0YXJnZXQuXG4gKlxuICogVGhpcyBpcyBmYXN0ZXIgdGhhbiBzZWFyY2hpbmcgdGhlIGVudGlyZSBmaWxlLXN5c3RlbSBmb3IgYWxsIHRoZSBlbnRyeS1wb2ludHMsXG4gKiBhbmQgaXMgdXNlZCBwcmltYXJpbHkgYnkgdGhlIENMSSBpbnRlZ3JhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIFRhcmdldGVkRW50cnlQb2ludEZpbmRlciBpbXBsZW1lbnRzIEVudHJ5UG9pbnRGaW5kZXIge1xuICBwcml2YXRlIHVucHJvY2Vzc2VkUGF0aHM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgcHJpdmF0ZSB1bnNvcnRlZEVudHJ5UG9pbnRzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXM+KCk7XG4gIHByaXZhdGUgYmFzZVBhdGhzOiBBYnNvbHV0ZUZzUGF0aFtdfG51bGwgPSBudWxsO1xuICBwcml2YXRlIGdldEJhc2VQYXRocygpIHtcbiAgICBpZiAodGhpcy5iYXNlUGF0aHMgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuYmFzZVBhdGhzID0gZ2V0QmFzZVBhdGhzKHRoaXMubG9nZ2VyLCB0aGlzLmJhc2VQYXRoLCB0aGlzLnBhdGhNYXBwaW5ncyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmJhc2VQYXRocztcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBwcml2YXRlIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIHByaXZhdGUgdGFyZ2V0UGF0aDogQWJzb2x1dGVGc1BhdGgsIHByaXZhdGUgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3N8dW5kZWZpbmVkKSB7fVxuXG4gIGZpbmRFbnRyeVBvaW50cygpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICAgIHRoaXMudW5wcm9jZXNzZWRQYXRocyA9IFt0aGlzLnRhcmdldFBhdGhdO1xuICAgIHdoaWxlICh0aGlzLnVucHJvY2Vzc2VkUGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5wcm9jZXNzTmV4dFBhdGgoKTtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0RW50cnlQb2ludCA9IHRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy5nZXQodGhpcy50YXJnZXRQYXRoKTtcbiAgICBjb25zdCBlbnRyeVBvaW50cyA9IHRoaXMucmVzb2x2ZXIuc29ydEVudHJ5UG9pbnRzQnlEZXBlbmRlbmN5KFxuICAgICAgICBBcnJheS5mcm9tKHRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy52YWx1ZXMoKSksIHRhcmdldEVudHJ5UG9pbnQ/LmVudHJ5UG9pbnQpO1xuXG4gICAgY29uc3QgaW52YWxpZFRhcmdldCA9XG4gICAgICAgIGVudHJ5UG9pbnRzLmludmFsaWRFbnRyeVBvaW50cy5maW5kKGkgPT4gaS5lbnRyeVBvaW50LnBhdGggPT09IHRoaXMudGFyZ2V0UGF0aCk7XG4gICAgaWYgKGludmFsaWRUYXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IFwiJHtpbnZhbGlkVGFyZ2V0LmVudHJ5UG9pbnQubmFtZX1cIiBoYXMgbWlzc2luZyBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgICAgaW52YWxpZFRhcmdldC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfVxcbmApLmpvaW4oJycpKTtcbiAgICB9XG4gICAgcmV0dXJuIGVudHJ5UG9pbnRzO1xuICB9XG5cbiAgdGFyZ2V0TmVlZHNQcm9jZXNzaW5nT3JDbGVhbmluZyhcbiAgICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10sIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZW50cnlQb2ludCA9IHRoaXMuZ2V0RW50cnlQb2ludCh0aGlzLnRhcmdldFBhdGgpO1xuICAgIGlmIChlbnRyeVBvaW50ID09PSBudWxsIHx8ICFlbnRyeVBvaW50LmNvbXBpbGVkQnlBbmd1bGFyKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgICAgaWYgKGVudHJ5UG9pbnQucGFja2FnZUpzb25bcHJvcGVydHldKSB7XG4gICAgICAgIC8vIEhlcmUgaXMgYSBwcm9wZXJ0eSB0aGF0IHNob3VsZCBiZSBwcm9jZXNzZWQuXG4gICAgICAgIGlmICghaGFzQmVlblByb2Nlc3NlZChlbnRyeVBvaW50LnBhY2thZ2VKc29uLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBoYXMgYmVlbiBwcm9jZXNzZWQsIGFuZCB3ZSBvbmx5IG5lZWQgb25lLlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBBbGwgYHByb3BlcnRpZXNUb0NvbnNpZGVyYCB0aGF0IGFwcGVhciBpbiB0aGlzIGVudHJ5LXBvaW50IGhhdmUgYmVlbiBwcm9jZXNzZWQuXG4gICAgLy8gSW4gb3RoZXIgd29yZHMsIHRoZXJlIHdlcmUgbm8gcHJvcGVydGllcyB0aGF0IG5lZWQgcHJvY2Vzc2luZy5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NOZXh0UGF0aCgpOiB2b2lkIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51bnByb2Nlc3NlZFBhdGhzLnNoaWZ0KCkhO1xuICAgIGNvbnN0IGVudHJ5UG9pbnQgPSB0aGlzLmdldEVudHJ5UG9pbnQocGF0aCk7XG4gICAgaWYgKGVudHJ5UG9pbnQgPT09IG51bGwgfHwgIWVudHJ5UG9pbnQuY29tcGlsZWRCeUFuZ3VsYXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgZW50cnlQb2ludFdpdGhEZXBzID0gdGhpcy5yZXNvbHZlci5nZXRFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcyhlbnRyeVBvaW50KTtcbiAgICB0aGlzLnVuc29ydGVkRW50cnlQb2ludHMuc2V0KGVudHJ5UG9pbnQucGF0aCwgZW50cnlQb2ludFdpdGhEZXBzKTtcbiAgICBlbnRyeVBvaW50V2l0aERlcHMuZGVwSW5mby5kZXBlbmRlbmNpZXMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgaWYgKCF0aGlzLnVuc29ydGVkRW50cnlQb2ludHMuaGFzKGRlcCkpIHtcbiAgICAgICAgdGhpcy51bnByb2Nlc3NlZFBhdGhzLnB1c2goZGVwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RW50cnlQb2ludChlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50fG51bGwge1xuICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gdGhpcy5jb21wdXRlUGFja2FnZVBhdGgoZW50cnlQb2ludFBhdGgpO1xuICAgIGNvbnN0IGVudHJ5UG9pbnQgPVxuICAgICAgICBnZXRFbnRyeVBvaW50SW5mbyh0aGlzLmZzLCB0aGlzLmNvbmZpZywgdGhpcy5sb2dnZXIsIHBhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCk7XG4gICAgaWYgKGVudHJ5UG9pbnQgPT09IE5PX0VOVFJZX1BPSU5UIHx8IGVudHJ5UG9pbnQgPT09IElOQ09NUEFUSUJMRV9FTlRSWV9QT0lOVCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBlbnRyeVBvaW50O1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlUGFja2FnZVBhdGgoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIC8vIEZpcnN0IHRyeSB0aGUgbWFpbiBiYXNlUGF0aCwgdG8gYXZvaWQgaGF2aW5nIHRvIGNvbXB1dGUgdGhlIG90aGVyIGJhc2VQYXRocyBmcm9tIHRoZSBwYXRoc1xuICAgIC8vIG1hcHBpbmdzLCB3aGljaCBjYW4gYmUgY29tcHV0YXRpb25hbGx5IGludGVuc2l2ZS5cbiAgICBpZiAoZW50cnlQb2ludFBhdGguc3RhcnRzV2l0aCh0aGlzLmJhc2VQYXRoKSkge1xuICAgICAgY29uc3QgcGFja2FnZVBhdGggPSB0aGlzLmNvbXB1dGVQYWNrYWdlUGF0aEZyb21Db250YWluaW5nUGF0aChlbnRyeVBvaW50UGF0aCwgdGhpcy5iYXNlUGF0aCk7XG4gICAgICBpZiAocGFja2FnZVBhdGggIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHBhY2thZ2VQYXRoO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBtYWluIGBiYXNlUGF0aGAgZGlkbid0IHdvcmsgb3V0IHNvIG5vdyB3ZSB0cnkgdGhlIGBiYXNlUGF0aHNgIGNvbXB1dGVkIGZyb20gdGhlIHBhdGhzXG4gICAgLy8gbWFwcGluZ3MgaW4gYHRzY29uZmlnLmpzb25gLlxuICAgIGZvciAoY29uc3QgYmFzZVBhdGggb2YgdGhpcy5nZXRCYXNlUGF0aHMoKSkge1xuICAgICAgaWYgKGVudHJ5UG9pbnRQYXRoLnN0YXJ0c1dpdGgoYmFzZVBhdGgpKSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gdGhpcy5jb21wdXRlUGFja2FnZVBhdGhGcm9tQ29udGFpbmluZ1BhdGgoZW50cnlQb2ludFBhdGgsIGJhc2VQYXRoKTtcbiAgICAgICAgaWYgKHBhY2thZ2VQYXRoICE9PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHBhY2thZ2VQYXRoO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHdlIGdvdCBoZXJlIHRoZW4gd2UgY291bGRuJ3QgZmluZCBhIGBwYWNrYWdlUGF0aGAgZm9yIHRoZSBjdXJyZW50IGBiYXNlUGF0aGAuXG4gICAgICAgIC8vIFNpbmNlIGBiYXNlUGF0aGBzIGFyZSBndWFyYW50ZWVkIG5vdCB0byBiZSBhIHN1Yi1kaXJlY3Rvcnkgb2YgZWFjaCBvdGhlciB0aGVuIG5vIG90aGVyXG4gICAgICAgIC8vIGBiYXNlUGF0aGAgd2lsbCBtYXRjaCBlaXRoZXIuXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpbmFsbHksIGlmIHdlIGNvdWxkbid0IGZpbmQgYSBgcGFja2FnZVBhdGhgIHVzaW5nIGBiYXNlUGF0aHNgIHRoZW4gdHJ5IHRvIGZpbmQgdGhlIG5lYXJlc3RcbiAgICAvLyBgbm9kZV9tb2R1bGVzYCB0aGF0IGNvbnRhaW5zIHRoZSBgZW50cnlQb2ludFBhdGhgLCBpZiB0aGVyZSBpcyBvbmUsIGFuZCB1c2UgaXQgYXMgYVxuICAgIC8vIGBiYXNlUGF0aGAuXG4gICAgcmV0dXJuIHRoaXMuY29tcHV0ZVBhY2thZ2VQYXRoRnJvbU5lYXJlc3ROb2RlTW9kdWxlcyhlbnRyeVBvaW50UGF0aCk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIGRvd24gdG8gdGhlIGBlbnRyeVBvaW50UGF0aGAgZnJvbSB0aGUgYGNvbnRhaW5pbmdQYXRoYCBmb3IgdGhlIGZpcnN0IGBwYWNrYWdlLmpzb25gIHRoYXRcbiAgICogd2UgY29tZSB0by4gVGhpcyBpcyB0aGUgcGF0aCB0byB0aGUgZW50cnktcG9pbnQncyBjb250YWluaW5nIHBhY2thZ2UuIEZvciBleGFtcGxlIGlmXG4gICAqIGBjb250YWluaW5nUGF0aGAgaXMgYC9hL2IvY2AgYW5kIGBlbnRyeVBvaW50UGF0aGAgaXMgYC9hL2IvYy9kL2VgIGFuZCB0aGVyZSBleGlzdHNcbiAgICogYC9hL2IvYy9kL3BhY2thZ2UuanNvbmAgYW5kIGAvYS9iL2MvZC9lL3BhY2thZ2UuanNvbmAsIHRoZW4gd2Ugd2lsbCByZXR1cm4gYC9hL2IvYy9kYC5cbiAgICpcbiAgICogVG8gYWNjb3VudCBmb3IgbmVzdGVkIGBub2RlX21vZHVsZXNgIHdlIGFjdHVhbGx5IHN0YXJ0IHRoZSBzZWFyY2ggYXQgdGhlIGxhc3QgYG5vZGVfbW9kdWxlc2AgaW5cbiAgICogdGhlIGBlbnRyeVBvaW50UGF0aGAgdGhhdCBpcyBiZWxvdyB0aGUgYGNvbnRhaW5pbmdQYXRoYC4gRS5nLiBpZiBgY29udGFpbmluZ1BhdGhgIGlzIGAvYS9iL2NgXG4gICAqIGFuZCBgZW50cnlQb2ludFBhdGhgIGlzIGAvYS9iL2MvZC9ub2RlX21vZHVsZXMveC95L3pgLCB3ZSBzdGFydCB0aGUgc2VhcmNoIGF0XG4gICAqIGAvYS9iL2MvZC9ub2RlX21vZHVsZXNgLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlUGFja2FnZVBhdGhGcm9tQ29udGFpbmluZ1BhdGgoXG4gICAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgsIGNvbnRhaW5pbmdQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRofG51bGwge1xuICAgIGxldCBwYWNrYWdlUGF0aCA9IGNvbnRhaW5pbmdQYXRoO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5zcGxpdFBhdGgocmVsYXRpdmUoY29udGFpbmluZ1BhdGgsIGVudHJ5UG9pbnRQYXRoKSk7XG4gICAgbGV0IG5vZGVNb2R1bGVzSW5kZXggPSBzZWdtZW50cy5sYXN0SW5kZXhPZihyZWxhdGl2ZUZyb20oJ25vZGVfbW9kdWxlcycpKTtcblxuICAgIC8vIElmIHRoZXJlIGFyZSBubyBgbm9kZV9tb2R1bGVzYCBpbiB0aGUgcmVsYXRpdmUgcGF0aCBiZXR3ZWVuIHRoZSBgYmFzZVBhdGhgIGFuZCB0aGVcbiAgICAvLyBgZW50cnlQb2ludFBhdGhgIHRoZW4ganVzdCB0cnkgdGhlIGBiYXNlUGF0aGAgYXMgdGhlIGBwYWNrYWdlUGF0aGAuXG4gICAgLy8gKFRoaXMgY2FuIGJlIHRoZSBjYXNlIHdpdGggcGF0aC1tYXBwZWQgZW50cnktcG9pbnRzLilcbiAgICBpZiAobm9kZU1vZHVsZXNJbmRleCA9PT0gLTEpIHtcbiAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTdGFydCB0aGUgc2VhcmNoIGF0IHRoZSBkZWVwZXN0IG5lc3RlZCBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdGhhdCBpcyBiZWxvdyB0aGUgYGJhc2VQYXRoYFxuICAgIC8vIGJ1dCBhYm92ZSB0aGUgYGVudHJ5UG9pbnRQYXRoYCwgaWYgdGhlcmUgYXJlIGFueS5cbiAgICB3aGlsZSAobm9kZU1vZHVsZXNJbmRleCA+PSAwKSB7XG4gICAgICBwYWNrYWdlUGF0aCA9IGpvaW4ocGFja2FnZVBhdGgsIHNlZ21lbnRzLnNoaWZ0KCkhKTtcbiAgICAgIG5vZGVNb2R1bGVzSW5kZXgtLTtcbiAgICB9XG5cbiAgICAvLyBOb3RlIHRoYXQgd2Ugc3RhcnQgYXQgdGhlIGZvbGRlciBiZWxvdyB0aGUgY3VycmVudCBjYW5kaWRhdGUgYHBhY2thZ2VQYXRoYCBiZWNhdXNlIHRoZVxuICAgIC8vIGluaXRpYWwgY2FuZGlkYXRlIGBwYWNrYWdlUGF0aGAgaXMgZWl0aGVyIGEgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIG9yIHRoZSBgYmFzZVBhdGhgIHdpdGhcbiAgICAvLyBubyBgcGFja2FnZS5qc29uYC5cbiAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2VnbWVudHMpIHtcbiAgICAgIHBhY2thZ2VQYXRoID0gam9pbihwYWNrYWdlUGF0aCwgc2VnbWVudCk7XG4gICAgICBpZiAodGhpcy5mcy5leGlzdHMoam9pbihwYWNrYWdlUGF0aCwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgICByZXR1cm4gcGFja2FnZVBhdGg7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCB1cCB0aGUgZGlyZWN0b3J5IHRyZWUgZnJvbSB0aGUgYGVudHJ5UG9pbnRQYXRoYCBsb29raW5nIGZvciBhIGBub2RlX21vZHVsZXNgIGRpcmVjdG9yeVxuICAgKiB0aGF0IHdlIGNhbiB1c2UgYXMgYSBwb3RlbnRpYWwgc3RhcnRpbmcgcG9pbnQgZm9yIGNvbXB1dGluZyB0aGUgcGFja2FnZSBwYXRoLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlUGFja2FnZVBhdGhGcm9tTmVhcmVzdE5vZGVNb2R1bGVzKGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICBsZXQgcGFja2FnZVBhdGggPSBlbnRyeVBvaW50UGF0aDtcbiAgICBsZXQgc2NvcGVkUGFja2FnZVBhdGggPSBwYWNrYWdlUGF0aDtcbiAgICBsZXQgY29udGFpbmVyUGF0aCA9IHRoaXMuZnMuZGlybmFtZShwYWNrYWdlUGF0aCk7XG4gICAgd2hpbGUgKCF0aGlzLmZzLmlzUm9vdChjb250YWluZXJQYXRoKSAmJiAhY29udGFpbmVyUGF0aC5lbmRzV2l0aCgnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgIHNjb3BlZFBhY2thZ2VQYXRoID0gcGFja2FnZVBhdGg7XG4gICAgICBwYWNrYWdlUGF0aCA9IGNvbnRhaW5lclBhdGg7XG4gICAgICBjb250YWluZXJQYXRoID0gdGhpcy5mcy5kaXJuYW1lKGNvbnRhaW5lclBhdGgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAvLyBUaGUgZGlyZWN0b3J5IGRpcmVjdGx5IGJlbG93IGBub2RlX21vZHVsZXNgIGlzIGEgcGFja2FnZSAtIHVzZSBpdFxuICAgICAgcmV0dXJuIHBhY2thZ2VQYXRoO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRoaXMuZnMuYmFzZW5hbWUocGFja2FnZVBhdGgpLnN0YXJ0c1dpdGgoJ0AnKSAmJlxuICAgICAgICB0aGlzLmZzLmV4aXN0cyhqb2luKHNjb3BlZFBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAvLyBUaGUgZGlyZWN0b3J5IGRpcmVjdGx5IGJlbG93IHRoZSBgbm9kZV9tb2R1bGVzYCBpcyBhIHNjb3BlIGFuZCB0aGUgZGlyZWN0b3J5IGRpcmVjdGx5XG4gICAgICAvLyBiZWxvdyB0aGF0IGlzIGEgc2NvcGVkIHBhY2thZ2UgLSB1c2UgaXRcbiAgICAgIHJldHVybiBzY29wZWRQYWNrYWdlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgd2UgZ2V0IGhlcmUgdGhlbiBub25lIG9mIHRoZSBgYmFzZVBhdGhzYCBjb250YWluZWQgdGhlIGBlbnRyeVBvaW50UGF0aGAgYW5kIHRoZVxuICAgICAgLy8gYGVudHJ5UG9pbnRQYXRoYCBjb250YWlucyBubyBgbm9kZV9tb2R1bGVzYCB0aGF0IGNvbnRhaW5zIGEgcGFja2FnZSBvciBhIHNjb3BlZFxuICAgICAgLy8gcGFja2FnZS4gQWxsIHdlIGNhbiBkbyBpcyBhc3N1bWUgdGhhdCB0aGlzIGVudHJ5LXBvaW50IGlzIGEgcHJpbWFyeSBlbnRyeS1wb2ludCB0byBhXG4gICAgICAvLyBwYWNrYWdlLlxuICAgICAgcmV0dXJuIGVudHJ5UG9pbnRQYXRoO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTcGxpdCB0aGUgZ2l2ZW4gYHBhdGhgIGludG8gcGF0aCBzZWdtZW50cyB1c2luZyBhbiBGUyBpbmRlcGVuZGVudCBhbGdvcml0aG0uXG4gICAqIEBwYXJhbSBwYXRoIFRoZSBwYXRoIHRvIHNwbGl0LlxuICAgKi9cbiAgcHJpdmF0ZSBzcGxpdFBhdGgocGF0aDogUGF0aFNlZ21lbnQpIHtcbiAgICBjb25zdCBzZWdtZW50cyA9IFtdO1xuICAgIHdoaWxlIChwYXRoICE9PSAnLicpIHtcbiAgICAgIHNlZ21lbnRzLnVuc2hpZnQodGhpcy5mcy5iYXNlbmFtZShwYXRoKSk7XG4gICAgICBwYXRoID0gdGhpcy5mcy5kaXJuYW1lKHBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gc2VnbWVudHM7XG4gIH1cbn1cbiJdfQ==