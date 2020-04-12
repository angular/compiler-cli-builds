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
            this.basePaths = utils_1.getBasePaths(this.logger, this.basePath, this.pathMappings);
        }
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
        /**
         * Search down to the `entryPointPath` from each `basePath` for the first `package.json` that we
         * come to. This is the path to the entry-point's containing package. For example if `basePath` is
         * `/a/b/c` and `entryPointPath` is `/a/b/c/d/e` and there exists `/a/b/c/d/package.json` and
         * `/a/b/c/d/e/package.json`, then we will return `/a/b/c/d`.
         *
         * To account for nested `node_modules` we actually start the search at the last `node_modules` in
         * the `entryPointPath` that is below the `basePath`. E.g. if `basePath` is `/a/b/c` and
         * `entryPointPath` is `/a/b/c/d/node_modules/x/y/z`, we start the search at
         * `/a/b/c/d/node_modules`.
         */
        TargetedEntryPointFinder.prototype.computePackagePath = function (entryPointPath) {
            var e_2, _a, e_3, _b;
            try {
                for (var _c = tslib_1.__values(this.basePaths), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var basePath = _d.value;
                    if (entryPointPath.startsWith(basePath)) {
                        var packagePath_1 = basePath;
                        var segments = this.splitPath(file_system_1.relative(basePath, entryPointPath));
                        var nodeModulesIndex = segments.lastIndexOf(file_system_1.relativeFrom('node_modules'));
                        // If there are no `node_modules` in the relative path between the `basePath` and the
                        // `entryPointPath` then just try the `basePath` as the `packagePath`.
                        // (This can be the case with path-mapped entry-points.)
                        if (nodeModulesIndex === -1) {
                            if (this.fs.exists(file_system_1.join(packagePath_1, 'package.json'))) {
                                return packagePath_1;
                            }
                        }
                        // Start the search at the deepest nested `node_modules` folder that is below the `basePath`
                        // but above the `entryPointPath`, if there are any.
                        while (nodeModulesIndex >= 0) {
                            packagePath_1 = file_system_1.join(packagePath_1, segments.shift());
                            nodeModulesIndex--;
                        }
                        try {
                            // Note that we start at the folder below the current candidate `packagePath` because the
                            // initial candidate `packagePath` is either a `node_modules` folder or the `basePath` with
                            // no `package.json`.
                            for (var segments_1 = (e_3 = void 0, tslib_1.__values(segments)), segments_1_1 = segments_1.next(); !segments_1_1.done; segments_1_1 = segments_1.next()) {
                                var segment = segments_1_1.value;
                                packagePath_1 = file_system_1.join(packagePath_1, segment);
                                if (this.fs.exists(file_system_1.join(packagePath_1, 'package.json'))) {
                                    return packagePath_1;
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (segments_1_1 && !segments_1_1.done && (_b = segments_1.return)) _b.call(segments_1);
                            }
                            finally { if (e_3) throw e_3.error; }
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
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
            // We couldn't find a `packagePath` using `basePaths` so try to find the nearest `node_modules`
            // that contains the `entryPointPath`, if there is one, and use it as a `basePath`.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFyZ2V0ZWRfZW50cnlfcG9pbnRfZmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXFIO0lBSXJILHFGQUEwRDtJQUUxRCxtRkFBd0k7SUFJeEksaUZBQXFDO0lBR3JDOzs7Ozs7T0FNRztJQUNIO1FBS0Usa0NBQ1ksRUFBYyxFQUFVLE1BQXlCLEVBQVUsTUFBYyxFQUN6RSxRQUE0QixFQUFVLFFBQXdCLEVBQzlELFVBQTBCLEVBQVUsWUFBb0M7WUFGeEUsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW1CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUN6RSxhQUFRLEdBQVIsUUFBUSxDQUFvQjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQWdCO1lBQzlELGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQXdCO1lBUDVFLHFCQUFnQixHQUFxQixFQUFFLENBQUM7WUFDeEMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQThDLENBQUM7WUFDNUUsY0FBUyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUtPLENBQUM7UUFFeEYsa0RBQWUsR0FBZjtZQUFBLGlCQWlCQztZQWhCQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDdkMsSUFBSSxD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Q0FBQyxDQUFDO2FBQ2hEO1lBRUQsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxrQkFBSSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUNyRCxvRUFBb0U7Z0JBQ3BFLE9BQU8sV0FBVyxDQUFDO2FBQ3BCO2lCQUFNLElBQ0gsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0JBQUksQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUMzRCx3RkFBd0Y7Z0JBQ3hGLDBDQUEwQztnQkFDMUMsT0FBTyxpQkFBaUIsQ0FBQzthQUMxQjtpQkFBTTtnQkFDTCxxRkFBcUY7Z0JBQ3JGLGtGQUFrRjtnQkFDbEYsdUZBQXVGO2dCQUN2RixXQUFXO2dCQUNYLE9BQU8sY0FBYyxDQUFDO2FBQ3ZCO1FBQ0gsQ0FBQztRQUVEOzs7V0FHRztRQUNLLDRDQUFTLEdBQWpCLFVBQWtCLElBQWlCO1lBQ2pDLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNwQixPQUFPLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQ25CLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQTFLRCxJQTBLQztJQTFLWSw0REFBd0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudCwgam9pbiwgcmVsYXRpdmUsIHJlbGF0aXZlRnJvbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXN9IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIFNvcnRlZEVudHJ5UG9pbnRzSW5mb30gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZH0gZnJvbSAnLi4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4uL3BhY2thZ2VzL2NvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQsIE5PX0VOVFJZX1BPSU5ULCBnZXRFbnRyeVBvaW50SW5mb30gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQge2dldEJhc2VQYXRoc30gZnJvbSAnLi91dGlscyc7XG5cblxuLyoqXG4gKiBBbiBFbnRyeVBvaW50RmluZGVyIHRoYXQgc3RhcnRzIGZyb20gYSB0YXJnZXQgZW50cnktcG9pbnQgYW5kIG9ubHkgZmluZHNcbiAqIGVudHJ5LXBvaW50cyB0aGF0IGFyZSBkZXBlbmRlbmNpZXMgb2YgdGhlIHRhcmdldC5cbiAqXG4gKiBUaGlzIGlzIGZhc3RlciB0aGFuIHNlYXJjaGluZyB0aGUgZW50aXJlIGZpbGUtc3lzdGVtIGZvciBhbGwgdGhlIGVudHJ5LXBvaW50cyxcbiAqIGFuZCBpcyB1c2VkIHByaW1hcmlseSBieSB0aGUgQ0xJIGludGVncmF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyIGltcGxlbWVudHMgRW50cnlQb2ludEZpbmRlciB7XG4gIHByaXZhdGUgdW5wcm9jZXNzZWRQYXRoczogQWJzb2x1dGVGc1BhdGhbXSA9IFtdO1xuICBwcml2YXRlIHVuc29ydGVkRW50cnlQb2ludHMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcz4oKTtcbiAgcHJpdmF0ZSBiYXNlUGF0aHMgPSBnZXRCYXNlUGF0aHModGhpcy5sb2dnZXIsIHRoaXMuYmFzZVBhdGgsIHRoaXMucGF0aE1hcHBpbmdzKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlciwgcHJpdmF0ZSBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcml2YXRlIHRhcmdldFBhdGg6IEFic29sdXRlRnNQYXRoLCBwcml2YXRlIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCkge31cblxuICBmaW5kRW50cnlQb2ludHMoKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgICB0aGlzLnVucHJvY2Vzc2VkUGF0aHMgPSBbdGhpcy50YXJnZXRQYXRoXTtcbiAgICB3aGlsZSAodGhpcy51bnByb2Nlc3NlZFBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMucHJvY2Vzc05leHRQYXRoKCk7XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldEVudHJ5UG9pbnQgPSB0aGlzLnVuc29ydGVkRW50cnlQb2ludHMuZ2V0KHRoaXMudGFyZ2V0UGF0aCk7XG4gICAgY29uc3QgZW50cnlQb2ludHMgPSB0aGlzLnJlc29sdmVyLnNvcnRFbnRyeVBvaW50c0J5RGVwZW5kZW5jeShcbiAgICAgICAgQXJyYXkuZnJvbSh0aGlzLnVuc29ydGVkRW50cnlQb2ludHMudmFsdWVzKCkpLCB0YXJnZXRFbnRyeVBvaW50Py5lbnRyeVBvaW50KTtcblxuICAgIGNvbnN0IGludmFsaWRUYXJnZXQgPVxuICAgICAgICBlbnRyeVBvaW50cy5pbnZhbGlkRW50cnlQb2ludHMuZmluZChpID0+IGkuZW50cnlQb2ludC5wYXRoID09PSB0aGlzLnRhcmdldFBhdGgpO1xuICAgIGlmIChpbnZhbGlkVGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVGhlIHRhcmdldCBlbnRyeS1wb2ludCBcIiR7aW52YWxpZFRhcmdldC5lbnRyeVBvaW50Lm5hbWV9XCIgaGFzIG1pc3NpbmcgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICAgIGludmFsaWRUYXJnZXQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1cXG5gKS5qb2luKCcnKSk7XG4gICAgfVxuICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgfVxuXG4gIHRhcmdldE5lZWRzUHJvY2Vzc2luZ09yQ2xlYW5pbmcoXG4gICAgICBwcm9wZXJ0aWVzVG9Db25zaWRlcjogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdLCBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGVudHJ5UG9pbnQgPSB0aGlzLmdldEVudHJ5UG9pbnQodGhpcy50YXJnZXRQYXRoKTtcbiAgICBpZiAoZW50cnlQb2ludCA9PT0gbnVsbCB8fCAhZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcHJvcGVydHkgb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICAgIGlmIChlbnRyeVBvaW50LnBhY2thZ2VKc29uW3Byb3BlcnR5XSkge1xuICAgICAgICAvLyBIZXJlIGlzIGEgcHJvcGVydHkgdGhhdCBzaG91bGQgYmUgcHJvY2Vzc2VkLlxuICAgICAgICBpZiAoIWhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludC5wYWNrYWdlSnNvbiwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb21waWxlQWxsRm9ybWF0cykge1xuICAgICAgICAgIC8vIFRoaXMgcHJvcGVydHkgaGFzIGJlZW4gcHJvY2Vzc2VkLCBhbmQgd2Ugb25seSBuZWVkIG9uZS5cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQWxsIGBwcm9wZXJ0aWVzVG9Db25zaWRlcmAgdGhhdCBhcHBlYXIgaW4gdGhpcyBlbnRyeS1wb2ludCBoYXZlIGJlZW4gcHJvY2Vzc2VkLlxuICAgIC8vIEluIG90aGVyIHdvcmRzLCB0aGVyZSB3ZXJlIG5vIHByb3BlcnRpZXMgdGhhdCBuZWVkIHByb2Nlc3NpbmcuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTmV4dFBhdGgoKTogdm9pZCB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMudW5wcm9jZXNzZWRQYXRocy5zaGlmdCgpICE7XG4gICAgY29uc3QgZW50cnlQb2ludCA9IHRoaXMuZ2V0RW50cnlQb2ludChwYXRoKTtcbiAgICBpZiAoZW50cnlQb2ludCA9PT0gbnVsbCB8fCAhZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBlbnRyeVBvaW50V2l0aERlcHMgPSB0aGlzLnJlc29sdmVyLmdldEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzKGVudHJ5UG9pbnQpO1xuICAgIHRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy5zZXQoZW50cnlQb2ludC5wYXRoLCBlbnRyeVBvaW50V2l0aERlcHMpO1xuICAgIGVudHJ5UG9pbnRXaXRoRGVwcy5kZXBJbmZvLmRlcGVuZGVuY2llcy5mb3JFYWNoKGRlcCA9PiB7XG4gICAgICBpZiAoIXRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy5oYXMoZGVwKSkge1xuICAgICAgICB0aGlzLnVucHJvY2Vzc2VkUGF0aHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbnRyeVBvaW50KGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnR8bnVsbCB7XG4gICAgY29uc3QgcGFja2FnZVBhdGggPSB0aGlzLmNvbXB1dGVQYWNrYWdlUGF0aChlbnRyeVBvaW50UGF0aCk7XG4gICAgY29uc3QgZW50cnlQb2ludCA9XG4gICAgICAgIGdldEVudHJ5UG9pbnRJbmZvKHRoaXMuZnMsIHRoaXMuY29uZmlnLCB0aGlzLmxvZ2dlciwgcGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoKTtcbiAgICBpZiAoZW50cnlQb2ludCA9PT0gTk9fRU5UUllfUE9JTlQgfHwgZW50cnlQb2ludCA9PT0gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGVudHJ5UG9pbnQ7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIGRvd24gdG8gdGhlIGBlbnRyeVBvaW50UGF0aGAgZnJvbSBlYWNoIGBiYXNlUGF0aGAgZm9yIHRoZSBmaXJzdCBgcGFja2FnZS5qc29uYCB0aGF0IHdlXG4gICAqIGNvbWUgdG8uIFRoaXMgaXMgdGhlIHBhdGggdG8gdGhlIGVudHJ5LXBvaW50J3MgY29udGFpbmluZyBwYWNrYWdlLiBGb3IgZXhhbXBsZSBpZiBgYmFzZVBhdGhgIGlzXG4gICAqIGAvYS9iL2NgIGFuZCBgZW50cnlQb2ludFBhdGhgIGlzIGAvYS9iL2MvZC9lYCBhbmQgdGhlcmUgZXhpc3RzIGAvYS9iL2MvZC9wYWNrYWdlLmpzb25gIGFuZFxuICAgKiBgL2EvYi9jL2QvZS9wYWNrYWdlLmpzb25gLCB0aGVuIHdlIHdpbGwgcmV0dXJuIGAvYS9iL2MvZGAuXG4gICAqXG4gICAqIFRvIGFjY291bnQgZm9yIG5lc3RlZCBgbm9kZV9tb2R1bGVzYCB3ZSBhY3R1YWxseSBzdGFydCB0aGUgc2VhcmNoIGF0IHRoZSBsYXN0IGBub2RlX21vZHVsZXNgIGluXG4gICAqIHRoZSBgZW50cnlQb2ludFBhdGhgIHRoYXQgaXMgYmVsb3cgdGhlIGBiYXNlUGF0aGAuIEUuZy4gaWYgYGJhc2VQYXRoYCBpcyBgL2EvYi9jYCBhbmRcbiAgICogYGVudHJ5UG9pbnRQYXRoYCBpcyBgL2EvYi9jL2Qvbm9kZV9tb2R1bGVzL3gveS96YCwgd2Ugc3RhcnQgdGhlIHNlYXJjaCBhdFxuICAgKiBgL2EvYi9jL2Qvbm9kZV9tb2R1bGVzYC5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZVBhY2thZ2VQYXRoKGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIHRoaXMuYmFzZVBhdGhzKSB7XG4gICAgICBpZiAoZW50cnlQb2ludFBhdGguc3RhcnRzV2l0aChiYXNlUGF0aCkpIHtcbiAgICAgICAgbGV0IHBhY2thZ2VQYXRoID0gYmFzZVBhdGg7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5zcGxpdFBhdGgocmVsYXRpdmUoYmFzZVBhdGgsIGVudHJ5UG9pbnRQYXRoKSk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0luZGV4ID0gc2VnbWVudHMubGFzdEluZGV4T2YocmVsYXRpdmVGcm9tKCdub2RlX21vZHVsZXMnKSk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGBub2RlX21vZHVsZXNgIGluIHRoZSByZWxhdGl2ZSBwYXRoIGJldHdlZW4gdGhlIGBiYXNlUGF0aGAgYW5kIHRoZVxuICAgICAgICAvLyBgZW50cnlQb2ludFBhdGhgIHRoZW4ganVzdCB0cnkgdGhlIGBiYXNlUGF0aGAgYXMgdGhlIGBwYWNrYWdlUGF0aGAuXG4gICAgICAgIC8vIChUaGlzIGNhbiBiZSB0aGUgY2FzZSB3aXRoIHBhdGgtbWFwcGVkIGVudHJ5LXBvaW50cy4pXG4gICAgICAgIGlmIChub2RlTW9kdWxlc0luZGV4ID09PSAtMSkge1xuICAgICAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFja2FnZVBhdGg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCBhdCB0aGUgZGVlcGVzdCBuZXN0ZWQgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgaXMgYmVsb3cgdGhlIGBiYXNlUGF0aGBcbiAgICAgICAgLy8gYnV0IGFib3ZlIHRoZSBgZW50cnlQb2ludFBhdGhgLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgICAgICB3aGlsZSAobm9kZU1vZHVsZXNJbmRleCA+PSAwKSB7XG4gICAgICAgICAgcGFja2FnZVBhdGggPSBqb2luKHBhY2thZ2VQYXRoLCBzZWdtZW50cy5zaGlmdCgpICEpO1xuICAgICAgICAgIG5vZGVNb2R1bGVzSW5kZXgtLTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vdGUgdGhhdCB3ZSBzdGFydCBhdCB0aGUgZm9sZGVyIGJlbG93IHRoZSBjdXJyZW50IGNhbmRpZGF0ZSBgcGFja2FnZVBhdGhgIGJlY2F1c2UgdGhlXG4gICAgICAgIC8vIGluaXRpYWwgY2FuZGlkYXRlIGBwYWNrYWdlUGF0aGAgaXMgZWl0aGVyIGEgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIG9yIHRoZSBgYmFzZVBhdGhgIHdpdGhcbiAgICAgICAgLy8gbm8gYHBhY2thZ2UuanNvbmAuXG4gICAgICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzZWdtZW50cykge1xuICAgICAgICAgIHBhY2thZ2VQYXRoID0gam9pbihwYWNrYWdlUGF0aCwgc2VnbWVudCk7XG4gICAgICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKGpvaW4ocGFja2FnZVBhdGgsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB3ZSBnb3QgaGVyZSB0aGVuIHdlIGNvdWxkbid0IGZpbmQgYSBgcGFja2FnZVBhdGhgIGZvciB0aGUgY3VycmVudCBgYmFzZVBhdGhgLlxuICAgICAgICAvLyBTaW5jZSBgYmFzZVBhdGhgcyBhcmUgZ3VhcmFudGVlZCBub3QgdG8gYmUgYSBzdWItZGlyZWN0b3J5IG9mIGVhY2ggb3RoZXIgdGhlbiBubyBvdGhlclxuICAgICAgICAvLyBgYmFzZVBhdGhgIHdpbGwgbWF0Y2ggZWl0aGVyLlxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXZSBjb3VsZG4ndCBmaW5kIGEgYHBhY2thZ2VQYXRoYCB1c2luZyBgYmFzZVBhdGhzYCBzbyB0cnkgdG8gZmluZCB0aGUgbmVhcmVzdCBgbm9kZV9tb2R1bGVzYFxuICAgIC8vIHRoYXQgY29udGFpbnMgdGhlIGBlbnRyeVBvaW50UGF0aGAsIGlmIHRoZXJlIGlzIG9uZSwgYW5kIHVzZSBpdCBhcyBhIGBiYXNlUGF0aGAuXG4gICAgbGV0IHBhY2thZ2VQYXRoID0gZW50cnlQb2ludFBhdGg7XG4gICAgbGV0IHNjb3BlZFBhY2thZ2VQYXRoID0gcGFja2FnZVBhdGg7XG4gICAgbGV0IGNvbnRhaW5lclBhdGggPSB0aGlzLmZzLmRpcm5hbWUocGFja2FnZVBhdGgpO1xuICAgIHdoaWxlICghdGhpcy5mcy5pc1Jvb3QoY29udGFpbmVyUGF0aCkgJiYgIWNvbnRhaW5lclBhdGguZW5kc1dpdGgoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICBzY29wZWRQYWNrYWdlUGF0aCA9IHBhY2thZ2VQYXRoO1xuICAgICAgcGFja2FnZVBhdGggPSBjb250YWluZXJQYXRoO1xuICAgICAgY29udGFpbmVyUGF0aCA9IHRoaXMuZnMuZGlybmFtZShjb250YWluZXJQYXRoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5mcy5leGlzdHMoam9pbihwYWNrYWdlUGF0aCwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgLy8gVGhlIGRpcmVjdG9yeSBkaXJlY3RseSBiZWxvdyBgbm9kZV9tb2R1bGVzYCBpcyBhIHBhY2thZ2UgLSB1c2UgaXRcbiAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB0aGlzLmZzLmJhc2VuYW1lKHBhY2thZ2VQYXRoKS5zdGFydHNXaXRoKCdAJykgJiZcbiAgICAgICAgdGhpcy5mcy5leGlzdHMoam9pbihzY29wZWRQYWNrYWdlUGF0aCwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgLy8gVGhlIGRpcmVjdG9yeSBkaXJlY3RseSBiZWxvdyB0aGUgYG5vZGVfbW9kdWxlc2AgaXMgYSBzY29wZSBhbmQgdGhlIGRpcmVjdG9yeSBkaXJlY3RseVxuICAgICAgLy8gYmVsb3cgdGhhdCBpcyBhIHNjb3BlZCBwYWNrYWdlIC0gdXNlIGl0XG4gICAgICByZXR1cm4gc2NvcGVkUGFja2FnZVBhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHdlIGdldCBoZXJlIHRoZW4gbm9uZSBvZiB0aGUgYGJhc2VQYXRoc2AgY29udGFpbmVkIHRoZSBgZW50cnlQb2ludFBhdGhgIGFuZCB0aGVcbiAgICAgIC8vIGBlbnRyeVBvaW50UGF0aGAgY29udGFpbnMgbm8gYG5vZGVfbW9kdWxlc2AgdGhhdCBjb250YWlucyBhIHBhY2thZ2Ugb3IgYSBzY29wZWRcbiAgICAgIC8vIHBhY2thZ2UuIEFsbCB3ZSBjYW4gZG8gaXMgYXNzdW1lIHRoYXQgdGhpcyBlbnRyeS1wb2ludCBpcyBhIHByaW1hcnkgZW50cnktcG9pbnQgdG8gYVxuICAgICAgLy8gcGFja2FnZS5cbiAgICAgIHJldHVybiBlbnRyeVBvaW50UGF0aDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3BsaXQgdGhlIGdpdmVuIGBwYXRoYCBpbnRvIHBhdGggc2VnbWVudHMgdXNpbmcgYW4gRlMgaW5kZXBlbmRlbnQgYWxnb3JpdGhtLlxuICAgKiBAcGFyYW0gcGF0aCBUaGUgcGF0aCB0byBzcGxpdC5cbiAgICovXG4gIHByaXZhdGUgc3BsaXRQYXRoKHBhdGg6IFBhdGhTZWdtZW50KSB7XG4gICAgY29uc3Qgc2VnbWVudHMgPSBbXTtcbiAgICB3aGlsZSAocGF0aCAhPT0gJy4nKSB7XG4gICAgICBzZWdtZW50cy51bnNoaWZ0KHRoaXMuZnMuYmFzZW5hbWUocGF0aCkpO1xuICAgICAgcGF0aCA9IHRoaXMuZnMuZGlybmFtZShwYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlZ21lbnRzO1xuICB9XG59XG4iXX0=