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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFyZ2V0ZWRfZW50cnlfcG9pbnRfZmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXFIO0lBSXJILHFGQUEwRDtJQUUxRCxtRkFBd0k7SUFJeEksaUZBQXFDO0lBRXJDOzs7Ozs7T0FNRztJQUNIO1FBS0Usa0NBQ1ksRUFBYyxFQUFVLE1BQXlCLEVBQVUsTUFBYyxFQUN6RSxRQUE0QixFQUFVLFFBQXdCLEVBQzlELFVBQTBCLEVBQVUsWUFBb0M7WUFGeEUsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW1CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUN6RSxhQUFRLEdBQVIsUUFBUSxDQUFvQjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQWdCO1lBQzlELGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQXdCO1lBUDVFLHFCQUFnQixHQUFxQixFQUFFLENBQUM7WUFDeEMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQThDLENBQUM7WUFDNUUsY0FBUyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUtPLENBQUM7UUFFeEYsa0RBQWUsR0FBZjtZQUFBLGlCQWlCQztZQWhCQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDdkMsSUFBSSxD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Q0FBQyxDQUFDO2FBQ2hEO1lBRUQsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxrQkFBSSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUNyRCxvRUFBb0U7Z0JBQ3BFLE9BQU8sV0FBVyxDQUFDO2FBQ3BCO2lCQUFNLElBQ0gsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0JBQUksQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUMzRCx3RkFBd0Y7Z0JBQ3hGLDBDQUEwQztnQkFDMUMsT0FBTyxpQkFBaUIsQ0FBQzthQUMxQjtpQkFBTTtnQkFDTCxxRkFBcUY7Z0JBQ3JGLGtGQUFrRjtnQkFDbEYsdUZBQXVGO2dCQUN2RixXQUFXO2dCQUNYLE9BQU8sY0FBYyxDQUFDO2FBQ3ZCO1FBQ0gsQ0FBQztRQUVEOzs7V0FHRztRQUNLLDRDQUFTLEdBQWpCLFVBQWtCLElBQWlCO1lBQ2pDLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNwQixPQUFPLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQ25CLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQTFLRCxJQTBLQztJQTFLWSw0REFBd0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBqb2luLCBQYXRoU2VnbWVudCwgcmVsYXRpdmUsIHJlbGF0aXZlRnJvbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXN9IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIFNvcnRlZEVudHJ5UG9pbnRzSW5mb30gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZH0gZnJvbSAnLi4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4uL3BhY2thZ2VzL2NvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBnZXRFbnRyeVBvaW50SW5mbywgSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5ULCBOT19FTlRSWV9QT0lOVH0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3BhdGhfbWFwcGluZ3MnO1xuXG5pbXBvcnQge0VudHJ5UG9pbnRGaW5kZXJ9IGZyb20gJy4vaW50ZXJmYWNlJztcbmltcG9ydCB7Z2V0QmFzZVBhdGhzfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBBbiBFbnRyeVBvaW50RmluZGVyIHRoYXQgc3RhcnRzIGZyb20gYSB0YXJnZXQgZW50cnktcG9pbnQgYW5kIG9ubHkgZmluZHNcbiAqIGVudHJ5LXBvaW50cyB0aGF0IGFyZSBkZXBlbmRlbmNpZXMgb2YgdGhlIHRhcmdldC5cbiAqXG4gKiBUaGlzIGlzIGZhc3RlciB0aGFuIHNlYXJjaGluZyB0aGUgZW50aXJlIGZpbGUtc3lzdGVtIGZvciBhbGwgdGhlIGVudHJ5LXBvaW50cyxcbiAqIGFuZCBpcyB1c2VkIHByaW1hcmlseSBieSB0aGUgQ0xJIGludGVncmF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgVGFyZ2V0ZWRFbnRyeVBvaW50RmluZGVyIGltcGxlbWVudHMgRW50cnlQb2ludEZpbmRlciB7XG4gIHByaXZhdGUgdW5wcm9jZXNzZWRQYXRoczogQWJzb2x1dGVGc1BhdGhbXSA9IFtdO1xuICBwcml2YXRlIHVuc29ydGVkRW50cnlQb2ludHMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcz4oKTtcbiAgcHJpdmF0ZSBiYXNlUGF0aHMgPSBnZXRCYXNlUGF0aHModGhpcy5sb2dnZXIsIHRoaXMuYmFzZVBhdGgsIHRoaXMucGF0aE1hcHBpbmdzKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlciwgcHJpdmF0ZSBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICBwcml2YXRlIHRhcmdldFBhdGg6IEFic29sdXRlRnNQYXRoLCBwcml2YXRlIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzfHVuZGVmaW5lZCkge31cblxuICBmaW5kRW50cnlQb2ludHMoKTogU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgICB0aGlzLnVucHJvY2Vzc2VkUGF0aHMgPSBbdGhpcy50YXJnZXRQYXRoXTtcbiAgICB3aGlsZSAodGhpcy51bnByb2Nlc3NlZFBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMucHJvY2Vzc05leHRQYXRoKCk7XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldEVudHJ5UG9pbnQgPSB0aGlzLnVuc29ydGVkRW50cnlQb2ludHMuZ2V0KHRoaXMudGFyZ2V0UGF0aCk7XG4gICAgY29uc3QgZW50cnlQb2ludHMgPSB0aGlzLnJlc29sdmVyLnNvcnRFbnRyeVBvaW50c0J5RGVwZW5kZW5jeShcbiAgICAgICAgQXJyYXkuZnJvbSh0aGlzLnVuc29ydGVkRW50cnlQb2ludHMudmFsdWVzKCkpLCB0YXJnZXRFbnRyeVBvaW50Py5lbnRyeVBvaW50KTtcblxuICAgIGNvbnN0IGludmFsaWRUYXJnZXQgPVxuICAgICAgICBlbnRyeVBvaW50cy5pbnZhbGlkRW50cnlQb2ludHMuZmluZChpID0+IGkuZW50cnlQb2ludC5wYXRoID09PSB0aGlzLnRhcmdldFBhdGgpO1xuICAgIGlmIChpbnZhbGlkVGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgVGhlIHRhcmdldCBlbnRyeS1wb2ludCBcIiR7aW52YWxpZFRhcmdldC5lbnRyeVBvaW50Lm5hbWV9XCIgaGFzIG1pc3NpbmcgZGVwZW5kZW5jaWVzOlxcbmAgK1xuICAgICAgICAgIGludmFsaWRUYXJnZXQubWlzc2luZ0RlcGVuZGVuY2llcy5tYXAoZGVwID0+IGAgLSAke2RlcH1cXG5gKS5qb2luKCcnKSk7XG4gICAgfVxuICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgfVxuXG4gIHRhcmdldE5lZWRzUHJvY2Vzc2luZ09yQ2xlYW5pbmcoXG4gICAgICBwcm9wZXJ0aWVzVG9Db25zaWRlcjogRW50cnlQb2ludEpzb25Qcm9wZXJ0eVtdLCBjb21waWxlQWxsRm9ybWF0czogYm9vbGVhbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGVudHJ5UG9pbnQgPSB0aGlzLmdldEVudHJ5UG9pbnQodGhpcy50YXJnZXRQYXRoKTtcbiAgICBpZiAoZW50cnlQb2ludCA9PT0gbnVsbCB8fCAhZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcHJvcGVydHkgb2YgcHJvcGVydGllc1RvQ29uc2lkZXIpIHtcbiAgICAgIGlmIChlbnRyeVBvaW50LnBhY2thZ2VKc29uW3Byb3BlcnR5XSkge1xuICAgICAgICAvLyBIZXJlIGlzIGEgcHJvcGVydHkgdGhhdCBzaG91bGQgYmUgcHJvY2Vzc2VkLlxuICAgICAgICBpZiAoIWhhc0JlZW5Qcm9jZXNzZWQoZW50cnlQb2ludC5wYWNrYWdlSnNvbiwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFjb21waWxlQWxsRm9ybWF0cykge1xuICAgICAgICAgIC8vIFRoaXMgcHJvcGVydHkgaGFzIGJlZW4gcHJvY2Vzc2VkLCBhbmQgd2Ugb25seSBuZWVkIG9uZS5cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQWxsIGBwcm9wZXJ0aWVzVG9Db25zaWRlcmAgdGhhdCBhcHBlYXIgaW4gdGhpcyBlbnRyeS1wb2ludCBoYXZlIGJlZW4gcHJvY2Vzc2VkLlxuICAgIC8vIEluIG90aGVyIHdvcmRzLCB0aGVyZSB3ZXJlIG5vIHByb3BlcnRpZXMgdGhhdCBuZWVkIHByb2Nlc3NpbmcuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzTmV4dFBhdGgoKTogdm9pZCB7XG4gICAgY29uc3QgcGF0aCA9IHRoaXMudW5wcm9jZXNzZWRQYXRocy5zaGlmdCgpITtcbiAgICBjb25zdCBlbnRyeVBvaW50ID0gdGhpcy5nZXRFbnRyeVBvaW50KHBhdGgpO1xuICAgIGlmIChlbnRyeVBvaW50ID09PSBudWxsIHx8ICFlbnRyeVBvaW50LmNvbXBpbGVkQnlBbmd1bGFyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGVudHJ5UG9pbnRXaXRoRGVwcyA9IHRoaXMucmVzb2x2ZXIuZ2V0RW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXMoZW50cnlQb2ludCk7XG4gICAgdGhpcy51bnNvcnRlZEVudHJ5UG9pbnRzLnNldChlbnRyeVBvaW50LnBhdGgsIGVudHJ5UG9pbnRXaXRoRGVwcyk7XG4gICAgZW50cnlQb2ludFdpdGhEZXBzLmRlcEluZm8uZGVwZW5kZW5jaWVzLmZvckVhY2goZGVwID0+IHtcbiAgICAgIGlmICghdGhpcy51bnNvcnRlZEVudHJ5UG9pbnRzLmhhcyhkZXApKSB7XG4gICAgICAgIHRoaXMudW5wcm9jZXNzZWRQYXRocy5wdXNoKGRlcCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldEVudHJ5UG9pbnQoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludHxudWxsIHtcbiAgICBjb25zdCBwYWNrYWdlUGF0aCA9IHRoaXMuY29tcHV0ZVBhY2thZ2VQYXRoKGVudHJ5UG9pbnRQYXRoKTtcbiAgICBjb25zdCBlbnRyeVBvaW50ID1cbiAgICAgICAgZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5jb25maWcsIHRoaXMubG9nZ2VyLCBwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpO1xuICAgIGlmIChlbnRyeVBvaW50ID09PSBOT19FTlRSWV9QT0lOVCB8fCBlbnRyeVBvaW50ID09PSBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZW50cnlQb2ludDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggZG93biB0byB0aGUgYGVudHJ5UG9pbnRQYXRoYCBmcm9tIGVhY2ggYGJhc2VQYXRoYCBmb3IgdGhlIGZpcnN0IGBwYWNrYWdlLmpzb25gIHRoYXQgd2VcbiAgICogY29tZSB0by4gVGhpcyBpcyB0aGUgcGF0aCB0byB0aGUgZW50cnktcG9pbnQncyBjb250YWluaW5nIHBhY2thZ2UuIEZvciBleGFtcGxlIGlmIGBiYXNlUGF0aGAgaXNcbiAgICogYC9hL2IvY2AgYW5kIGBlbnRyeVBvaW50UGF0aGAgaXMgYC9hL2IvYy9kL2VgIGFuZCB0aGVyZSBleGlzdHMgYC9hL2IvYy9kL3BhY2thZ2UuanNvbmAgYW5kXG4gICAqIGAvYS9iL2MvZC9lL3BhY2thZ2UuanNvbmAsIHRoZW4gd2Ugd2lsbCByZXR1cm4gYC9hL2IvYy9kYC5cbiAgICpcbiAgICogVG8gYWNjb3VudCBmb3IgbmVzdGVkIGBub2RlX21vZHVsZXNgIHdlIGFjdHVhbGx5IHN0YXJ0IHRoZSBzZWFyY2ggYXQgdGhlIGxhc3QgYG5vZGVfbW9kdWxlc2AgaW5cbiAgICogdGhlIGBlbnRyeVBvaW50UGF0aGAgdGhhdCBpcyBiZWxvdyB0aGUgYGJhc2VQYXRoYC4gRS5nLiBpZiBgYmFzZVBhdGhgIGlzIGAvYS9iL2NgIGFuZFxuICAgKiBgZW50cnlQb2ludFBhdGhgIGlzIGAvYS9iL2MvZC9ub2RlX21vZHVsZXMveC95L3pgLCB3ZSBzdGFydCB0aGUgc2VhcmNoIGF0XG4gICAqIGAvYS9iL2MvZC9ub2RlX21vZHVsZXNgLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlUGFja2FnZVBhdGgoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGgge1xuICAgIGZvciAoY29uc3QgYmFzZVBhdGggb2YgdGhpcy5iYXNlUGF0aHMpIHtcbiAgICAgIGlmIChlbnRyeVBvaW50UGF0aC5zdGFydHNXaXRoKGJhc2VQYXRoKSkge1xuICAgICAgICBsZXQgcGFja2FnZVBhdGggPSBiYXNlUGF0aDtcbiAgICAgICAgY29uc3Qgc2VnbWVudHMgPSB0aGlzLnNwbGl0UGF0aChyZWxhdGl2ZShiYXNlUGF0aCwgZW50cnlQb2ludFBhdGgpKTtcbiAgICAgICAgbGV0IG5vZGVNb2R1bGVzSW5kZXggPSBzZWdtZW50cy5sYXN0SW5kZXhPZihyZWxhdGl2ZUZyb20oJ25vZGVfbW9kdWxlcycpKTtcblxuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gYG5vZGVfbW9kdWxlc2AgaW4gdGhlIHJlbGF0aXZlIHBhdGggYmV0d2VlbiB0aGUgYGJhc2VQYXRoYCBhbmQgdGhlXG4gICAgICAgIC8vIGBlbnRyeVBvaW50UGF0aGAgdGhlbiBqdXN0IHRyeSB0aGUgYGJhc2VQYXRoYCBhcyB0aGUgYHBhY2thZ2VQYXRoYC5cbiAgICAgICAgLy8gKFRoaXMgY2FuIGJlIHRoZSBjYXNlIHdpdGggcGF0aC1tYXBwZWQgZW50cnktcG9pbnRzLilcbiAgICAgICAgaWYgKG5vZGVNb2R1bGVzSW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKGpvaW4ocGFja2FnZVBhdGgsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdGFydCB0aGUgc2VhcmNoIGF0IHRoZSBkZWVwZXN0IG5lc3RlZCBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgdGhhdCBpcyBiZWxvdyB0aGUgYGJhc2VQYXRoYFxuICAgICAgICAvLyBidXQgYWJvdmUgdGhlIGBlbnRyeVBvaW50UGF0aGAsIGlmIHRoZXJlIGFyZSBhbnkuXG4gICAgICAgIHdoaWxlIChub2RlTW9kdWxlc0luZGV4ID49IDApIHtcbiAgICAgICAgICBwYWNrYWdlUGF0aCA9IGpvaW4ocGFja2FnZVBhdGgsIHNlZ21lbnRzLnNoaWZ0KCkhKTtcbiAgICAgICAgICBub2RlTW9kdWxlc0luZGV4LS07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb3RlIHRoYXQgd2Ugc3RhcnQgYXQgdGhlIGZvbGRlciBiZWxvdyB0aGUgY3VycmVudCBjYW5kaWRhdGUgYHBhY2thZ2VQYXRoYCBiZWNhdXNlIHRoZVxuICAgICAgICAvLyBpbml0aWFsIGNhbmRpZGF0ZSBgcGFja2FnZVBhdGhgIGlzIGVpdGhlciBhIGBub2RlX21vZHVsZXNgIGZvbGRlciBvciB0aGUgYGJhc2VQYXRoYCB3aXRoXG4gICAgICAgIC8vIG5vIGBwYWNrYWdlLmpzb25gLlxuICAgICAgICBmb3IgKGNvbnN0IHNlZ21lbnQgb2Ygc2VnbWVudHMpIHtcbiAgICAgICAgICBwYWNrYWdlUGF0aCA9IGpvaW4ocGFja2FnZVBhdGgsIHNlZ21lbnQpO1xuICAgICAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFja2FnZVBhdGg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUgdGhlbiB3ZSBjb3VsZG4ndCBmaW5kIGEgYHBhY2thZ2VQYXRoYCBmb3IgdGhlIGN1cnJlbnQgYGJhc2VQYXRoYC5cbiAgICAgICAgLy8gU2luY2UgYGJhc2VQYXRoYHMgYXJlIGd1YXJhbnRlZWQgbm90IHRvIGJlIGEgc3ViLWRpcmVjdG9yeSBvZiBlYWNoIG90aGVyIHRoZW4gbm8gb3RoZXJcbiAgICAgICAgLy8gYGJhc2VQYXRoYCB3aWxsIG1hdGNoIGVpdGhlci5cbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV2UgY291bGRuJ3QgZmluZCBhIGBwYWNrYWdlUGF0aGAgdXNpbmcgYGJhc2VQYXRoc2Agc28gdHJ5IHRvIGZpbmQgdGhlIG5lYXJlc3QgYG5vZGVfbW9kdWxlc2BcbiAgICAvLyB0aGF0IGNvbnRhaW5zIHRoZSBgZW50cnlQb2ludFBhdGhgLCBpZiB0aGVyZSBpcyBvbmUsIGFuZCB1c2UgaXQgYXMgYSBgYmFzZVBhdGhgLlxuICAgIGxldCBwYWNrYWdlUGF0aCA9IGVudHJ5UG9pbnRQYXRoO1xuICAgIGxldCBzY29wZWRQYWNrYWdlUGF0aCA9IHBhY2thZ2VQYXRoO1xuICAgIGxldCBjb250YWluZXJQYXRoID0gdGhpcy5mcy5kaXJuYW1lKHBhY2thZ2VQYXRoKTtcbiAgICB3aGlsZSAoIXRoaXMuZnMuaXNSb290KGNvbnRhaW5lclBhdGgpICYmICFjb250YWluZXJQYXRoLmVuZHNXaXRoKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgc2NvcGVkUGFja2FnZVBhdGggPSBwYWNrYWdlUGF0aDtcbiAgICAgIHBhY2thZ2VQYXRoID0gY29udGFpbmVyUGF0aDtcbiAgICAgIGNvbnRhaW5lclBhdGggPSB0aGlzLmZzLmRpcm5hbWUoY29udGFpbmVyUGF0aCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGpvaW4ocGFja2FnZVBhdGgsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgIC8vIFRoZSBkaXJlY3RvcnkgZGlyZWN0bHkgYmVsb3cgYG5vZGVfbW9kdWxlc2AgaXMgYSBwYWNrYWdlIC0gdXNlIGl0XG4gICAgICByZXR1cm4gcGFja2FnZVBhdGg7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdGhpcy5mcy5iYXNlbmFtZShwYWNrYWdlUGF0aCkuc3RhcnRzV2l0aCgnQCcpICYmXG4gICAgICAgIHRoaXMuZnMuZXhpc3RzKGpvaW4oc2NvcGVkUGFja2FnZVBhdGgsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgIC8vIFRoZSBkaXJlY3RvcnkgZGlyZWN0bHkgYmVsb3cgdGhlIGBub2RlX21vZHVsZXNgIGlzIGEgc2NvcGUgYW5kIHRoZSBkaXJlY3RvcnkgZGlyZWN0bHlcbiAgICAgIC8vIGJlbG93IHRoYXQgaXMgYSBzY29wZWQgcGFja2FnZSAtIHVzZSBpdFxuICAgICAgcmV0dXJuIHNjb3BlZFBhY2thZ2VQYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB3ZSBnZXQgaGVyZSB0aGVuIG5vbmUgb2YgdGhlIGBiYXNlUGF0aHNgIGNvbnRhaW5lZCB0aGUgYGVudHJ5UG9pbnRQYXRoYCBhbmQgdGhlXG4gICAgICAvLyBgZW50cnlQb2ludFBhdGhgIGNvbnRhaW5zIG5vIGBub2RlX21vZHVsZXNgIHRoYXQgY29udGFpbnMgYSBwYWNrYWdlIG9yIGEgc2NvcGVkXG4gICAgICAvLyBwYWNrYWdlLiBBbGwgd2UgY2FuIGRvIGlzIGFzc3VtZSB0aGF0IHRoaXMgZW50cnktcG9pbnQgaXMgYSBwcmltYXJ5IGVudHJ5LXBvaW50IHRvIGFcbiAgICAgIC8vIHBhY2thZ2UuXG4gICAgICByZXR1cm4gZW50cnlQb2ludFBhdGg7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNwbGl0IHRoZSBnaXZlbiBgcGF0aGAgaW50byBwYXRoIHNlZ21lbnRzIHVzaW5nIGFuIEZTIGluZGVwZW5kZW50IGFsZ29yaXRobS5cbiAgICogQHBhcmFtIHBhdGggVGhlIHBhdGggdG8gc3BsaXQuXG4gICAqL1xuICBwcml2YXRlIHNwbGl0UGF0aChwYXRoOiBQYXRoU2VnbWVudCkge1xuICAgIGNvbnN0IHNlZ21lbnRzID0gW107XG4gICAgd2hpbGUgKHBhdGggIT09ICcuJykge1xuICAgICAgc2VnbWVudHMudW5zaGlmdCh0aGlzLmZzLmJhc2VuYW1lKHBhdGgpKTtcbiAgICAgIHBhdGggPSB0aGlzLmZzLmRpcm5hbWUocGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBzZWdtZW50cztcbiAgfVxufVxuIl19