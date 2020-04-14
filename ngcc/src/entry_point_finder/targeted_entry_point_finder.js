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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFyZ2V0ZWRfZW50cnlfcG9pbnRfZmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXFIO0lBSXJILHFGQUEwRDtJQUUxRCxtRkFBd0k7SUFJeEksaUZBQXFDO0lBRXJDOzs7Ozs7T0FNRztJQUNIO1FBS0Usa0NBQ1ksRUFBYyxFQUFVLE1BQXlCLEVBQVUsTUFBYyxFQUN6RSxRQUE0QixFQUFVLFFBQXdCLEVBQzlELFVBQTBCLEVBQVUsWUFBb0M7WUFGeEUsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW1CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUN6RSxhQUFRLEdBQVIsUUFBUSxDQUFvQjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQWdCO1lBQzlELGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQXdCO1lBUDVFLHFCQUFnQixHQUFxQixFQUFFLENBQUM7WUFDeEMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQThDLENBQUM7WUFDNUUsY0FBUyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUtPLENBQUM7UUFFeEYsa0RBQWUsR0FBZjtZQUFBLGlCQWlCQztZQWhCQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDdkMsSUFBSSxD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Q0FBQyxDQUFDO2FBQ2hEO1lBRUQsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxrQkFBSSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUNyRCxvRUFBb0U7Z0JBQ3BFLE9BQU8sV0FBVyxDQUFDO2FBQ3BCO2lCQUFNLElBQ0gsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0JBQUksQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUMzRCx3RkFBd0Y7Z0JBQ3hGLDBDQUEwQztnQkFDMUMsT0FBTyxpQkFBaUIsQ0FBQzthQUMxQjtpQkFBTTtnQkFDTCxxRkFBcUY7Z0JBQ3JGLGtGQUFrRjtnQkFDbEYsdUZBQXVGO2dCQUN2RixXQUFXO2dCQUNYLE9BQU8sY0FBYyxDQUFDO2FBQ3ZCO1FBQ0gsQ0FBQztRQUVEOzs7V0FHRztRQUNLLDRDQUFTLEdBQWpCLFVBQWtCLElBQWlCO1lBQ2pDLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNwQixPQUFPLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQ25CLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQTFLRCxJQTBLQztJQTFLWSw0REFBd0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBqb2luLCBQYXRoU2VnbWVudCwgcmVsYXRpdmUsIHJlbGF0aXZlRnJvbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXN9IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIFNvcnRlZEVudHJ5UG9pbnRzSW5mb30gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7aGFzQmVlblByb2Nlc3NlZH0gZnJvbSAnLi4vcGFja2FnZXMvYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4uL3BhY2thZ2VzL2NvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBFbnRyeVBvaW50SnNvblByb3BlcnR5LCBnZXRFbnRyeVBvaW50SW5mbywgSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5ULCBOT19FTlRSWV9QT0lOVH0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3V0aWxzJztcblxuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQge2dldEJhc2VQYXRoc30gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQW4gRW50cnlQb2ludEZpbmRlciB0aGF0IHN0YXJ0cyBmcm9tIGEgdGFyZ2V0IGVudHJ5LXBvaW50IGFuZCBvbmx5IGZpbmRzXG4gKiBlbnRyeS1wb2ludHMgdGhhdCBhcmUgZGVwZW5kZW5jaWVzIG9mIHRoZSB0YXJnZXQuXG4gKlxuICogVGhpcyBpcyBmYXN0ZXIgdGhhbiBzZWFyY2hpbmcgdGhlIGVudGlyZSBmaWxlLXN5c3RlbSBmb3IgYWxsIHRoZSBlbnRyeS1wb2ludHMsXG4gKiBhbmQgaXMgdXNlZCBwcmltYXJpbHkgYnkgdGhlIENMSSBpbnRlZ3JhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIFRhcmdldGVkRW50cnlQb2ludEZpbmRlciBpbXBsZW1lbnRzIEVudHJ5UG9pbnRGaW5kZXIge1xuICBwcml2YXRlIHVucHJvY2Vzc2VkUGF0aHM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgcHJpdmF0ZSB1bnNvcnRlZEVudHJ5UG9pbnRzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXM+KCk7XG4gIHByaXZhdGUgYmFzZVBhdGhzID0gZ2V0QmFzZVBhdGhzKHRoaXMubG9nZ2VyLCB0aGlzLmJhc2VQYXRoLCB0aGlzLnBhdGhNYXBwaW5ncyk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIHJlc29sdmVyOiBEZXBlbmRlbmN5UmVzb2x2ZXIsIHByaXZhdGUgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgcHJpdmF0ZSB0YXJnZXRQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcHJpdmF0ZSBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5nc3x1bmRlZmluZWQpIHt9XG5cbiAgZmluZEVudHJ5UG9pbnRzKCk6IFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gICAgdGhpcy51bnByb2Nlc3NlZFBhdGhzID0gW3RoaXMudGFyZ2V0UGF0aF07XG4gICAgd2hpbGUgKHRoaXMudW5wcm9jZXNzZWRQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnByb2Nlc3NOZXh0UGF0aCgpO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRFbnRyeVBvaW50ID0gdGhpcy51bnNvcnRlZEVudHJ5UG9pbnRzLmdldCh0aGlzLnRhcmdldFBhdGgpO1xuICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gdGhpcy5yZXNvbHZlci5zb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3koXG4gICAgICAgIEFycmF5LmZyb20odGhpcy51bnNvcnRlZEVudHJ5UG9pbnRzLnZhbHVlcygpKSwgdGFyZ2V0RW50cnlQb2ludD8uZW50cnlQb2ludCk7XG5cbiAgICBjb25zdCBpbnZhbGlkVGFyZ2V0ID1cbiAgICAgICAgZW50cnlQb2ludHMuaW52YWxpZEVudHJ5UG9pbnRzLmZpbmQoaSA9PiBpLmVudHJ5UG9pbnQucGF0aCA9PT0gdGhpcy50YXJnZXRQYXRoKTtcbiAgICBpZiAoaW52YWxpZFRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFRoZSB0YXJnZXQgZW50cnktcG9pbnQgXCIke2ludmFsaWRUYXJnZXQuZW50cnlQb2ludC5uYW1lfVwiIGhhcyBtaXNzaW5nIGRlcGVuZGVuY2llczpcXG5gICtcbiAgICAgICAgICBpbnZhbGlkVGFyZ2V0Lm1pc3NpbmdEZXBlbmRlbmNpZXMubWFwKGRlcCA9PiBgIC0gJHtkZXB9XFxuYCkuam9pbignJykpO1xuICAgIH1cbiAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gIH1cblxuICB0YXJnZXROZWVkc1Byb2Nlc3NpbmdPckNsZWFuaW5nKFxuICAgICAgcHJvcGVydGllc1RvQ29uc2lkZXI6IEVudHJ5UG9pbnRKc29uUHJvcGVydHlbXSwgY29tcGlsZUFsbEZvcm1hdHM6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBjb25zdCBlbnRyeVBvaW50ID0gdGhpcy5nZXRFbnRyeVBvaW50KHRoaXMudGFyZ2V0UGF0aCk7XG4gICAgaWYgKGVudHJ5UG9pbnQgPT09IG51bGwgfHwgIWVudHJ5UG9pbnQuY29tcGlsZWRCeUFuZ3VsYXIpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHByb3BlcnR5IG9mIHByb3BlcnRpZXNUb0NvbnNpZGVyKSB7XG4gICAgICBpZiAoZW50cnlQb2ludC5wYWNrYWdlSnNvbltwcm9wZXJ0eV0pIHtcbiAgICAgICAgLy8gSGVyZSBpcyBhIHByb3BlcnR5IHRoYXQgc2hvdWxkIGJlIHByb2Nlc3NlZC5cbiAgICAgICAgaWYgKCFoYXNCZWVuUHJvY2Vzc2VkKGVudHJ5UG9pbnQucGFja2FnZUpzb24sIHByb3BlcnR5KSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29tcGlsZUFsbEZvcm1hdHMpIHtcbiAgICAgICAgICAvLyBUaGlzIHByb3BlcnR5IGhhcyBiZWVuIHByb2Nlc3NlZCwgYW5kIHdlIG9ubHkgbmVlZCBvbmUuXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEFsbCBgcHJvcGVydGllc1RvQ29uc2lkZXJgIHRoYXQgYXBwZWFyIGluIHRoaXMgZW50cnktcG9pbnQgaGF2ZSBiZWVuIHByb2Nlc3NlZC5cbiAgICAvLyBJbiBvdGhlciB3b3JkcywgdGhlcmUgd2VyZSBubyBwcm9wZXJ0aWVzIHRoYXQgbmVlZCBwcm9jZXNzaW5nLlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc05leHRQYXRoKCk6IHZvaWQge1xuICAgIGNvbnN0IHBhdGggPSB0aGlzLnVucHJvY2Vzc2VkUGF0aHMuc2hpZnQoKSE7XG4gICAgY29uc3QgZW50cnlQb2ludCA9IHRoaXMuZ2V0RW50cnlQb2ludChwYXRoKTtcbiAgICBpZiAoZW50cnlQb2ludCA9PT0gbnVsbCB8fCAhZW50cnlQb2ludC5jb21waWxlZEJ5QW5ndWxhcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBlbnRyeVBvaW50V2l0aERlcHMgPSB0aGlzLnJlc29sdmVyLmdldEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzKGVudHJ5UG9pbnQpO1xuICAgIHRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy5zZXQoZW50cnlQb2ludC5wYXRoLCBlbnRyeVBvaW50V2l0aERlcHMpO1xuICAgIGVudHJ5UG9pbnRXaXRoRGVwcy5kZXBJbmZvLmRlcGVuZGVuY2llcy5mb3JFYWNoKGRlcCA9PiB7XG4gICAgICBpZiAoIXRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy5oYXMoZGVwKSkge1xuICAgICAgICB0aGlzLnVucHJvY2Vzc2VkUGF0aHMucHVzaChkZXApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbnRyeVBvaW50KGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnR8bnVsbCB7XG4gICAgY29uc3QgcGFja2FnZVBhdGggPSB0aGlzLmNvbXB1dGVQYWNrYWdlUGF0aChlbnRyeVBvaW50UGF0aCk7XG4gICAgY29uc3QgZW50cnlQb2ludCA9XG4gICAgICAgIGdldEVudHJ5UG9pbnRJbmZvKHRoaXMuZnMsIHRoaXMuY29uZmlnLCB0aGlzLmxvZ2dlciwgcGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoKTtcbiAgICBpZiAoZW50cnlQb2ludCA9PT0gTk9fRU5UUllfUE9JTlQgfHwgZW50cnlQb2ludCA9PT0gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGVudHJ5UG9pbnQ7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIGRvd24gdG8gdGhlIGBlbnRyeVBvaW50UGF0aGAgZnJvbSBlYWNoIGBiYXNlUGF0aGAgZm9yIHRoZSBmaXJzdCBgcGFja2FnZS5qc29uYCB0aGF0IHdlXG4gICAqIGNvbWUgdG8uIFRoaXMgaXMgdGhlIHBhdGggdG8gdGhlIGVudHJ5LXBvaW50J3MgY29udGFpbmluZyBwYWNrYWdlLiBGb3IgZXhhbXBsZSBpZiBgYmFzZVBhdGhgIGlzXG4gICAqIGAvYS9iL2NgIGFuZCBgZW50cnlQb2ludFBhdGhgIGlzIGAvYS9iL2MvZC9lYCBhbmQgdGhlcmUgZXhpc3RzIGAvYS9iL2MvZC9wYWNrYWdlLmpzb25gIGFuZFxuICAgKiBgL2EvYi9jL2QvZS9wYWNrYWdlLmpzb25gLCB0aGVuIHdlIHdpbGwgcmV0dXJuIGAvYS9iL2MvZGAuXG4gICAqXG4gICAqIFRvIGFjY291bnQgZm9yIG5lc3RlZCBgbm9kZV9tb2R1bGVzYCB3ZSBhY3R1YWxseSBzdGFydCB0aGUgc2VhcmNoIGF0IHRoZSBsYXN0IGBub2RlX21vZHVsZXNgIGluXG4gICAqIHRoZSBgZW50cnlQb2ludFBhdGhgIHRoYXQgaXMgYmVsb3cgdGhlIGBiYXNlUGF0aGAuIEUuZy4gaWYgYGJhc2VQYXRoYCBpcyBgL2EvYi9jYCBhbmRcbiAgICogYGVudHJ5UG9pbnRQYXRoYCBpcyBgL2EvYi9jL2Qvbm9kZV9tb2R1bGVzL3gveS96YCwgd2Ugc3RhcnQgdGhlIHNlYXJjaCBhdFxuICAgKiBgL2EvYi9jL2Qvbm9kZV9tb2R1bGVzYC5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZVBhY2thZ2VQYXRoKGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIHRoaXMuYmFzZVBhdGhzKSB7XG4gICAgICBpZiAoZW50cnlQb2ludFBhdGguc3RhcnRzV2l0aChiYXNlUGF0aCkpIHtcbiAgICAgICAgbGV0IHBhY2thZ2VQYXRoID0gYmFzZVBhdGg7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5zcGxpdFBhdGgocmVsYXRpdmUoYmFzZVBhdGgsIGVudHJ5UG9pbnRQYXRoKSk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0luZGV4ID0gc2VnbWVudHMubGFzdEluZGV4T2YocmVsYXRpdmVGcm9tKCdub2RlX21vZHVsZXMnKSk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGBub2RlX21vZHVsZXNgIGluIHRoZSByZWxhdGl2ZSBwYXRoIGJldHdlZW4gdGhlIGBiYXNlUGF0aGAgYW5kIHRoZVxuICAgICAgICAvLyBgZW50cnlQb2ludFBhdGhgIHRoZW4ganVzdCB0cnkgdGhlIGBiYXNlUGF0aGAgYXMgdGhlIGBwYWNrYWdlUGF0aGAuXG4gICAgICAgIC8vIChUaGlzIGNhbiBiZSB0aGUgY2FzZSB3aXRoIHBhdGgtbWFwcGVkIGVudHJ5LXBvaW50cy4pXG4gICAgICAgIGlmIChub2RlTW9kdWxlc0luZGV4ID09PSAtMSkge1xuICAgICAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFja2FnZVBhdGg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCBhdCB0aGUgZGVlcGVzdCBuZXN0ZWQgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgaXMgYmVsb3cgdGhlIGBiYXNlUGF0aGBcbiAgICAgICAgLy8gYnV0IGFib3ZlIHRoZSBgZW50cnlQb2ludFBhdGhgLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgICAgICB3aGlsZSAobm9kZU1vZHVsZXNJbmRleCA+PSAwKSB7XG4gICAgICAgICAgcGFja2FnZVBhdGggPSBqb2luKHBhY2thZ2VQYXRoLCBzZWdtZW50cy5zaGlmdCgpISk7XG4gICAgICAgICAgbm9kZU1vZHVsZXNJbmRleC0tO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm90ZSB0aGF0IHdlIHN0YXJ0IGF0IHRoZSBmb2xkZXIgYmVsb3cgdGhlIGN1cnJlbnQgY2FuZGlkYXRlIGBwYWNrYWdlUGF0aGAgYmVjYXVzZSB0aGVcbiAgICAgICAgLy8gaW5pdGlhbCBjYW5kaWRhdGUgYHBhY2thZ2VQYXRoYCBpcyBlaXRoZXIgYSBgbm9kZV9tb2R1bGVzYCBmb2xkZXIgb3IgdGhlIGBiYXNlUGF0aGAgd2l0aFxuICAgICAgICAvLyBubyBgcGFja2FnZS5qc29uYC5cbiAgICAgICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNlZ21lbnRzKSB7XG4gICAgICAgICAgcGFja2FnZVBhdGggPSBqb2luKHBhY2thZ2VQYXRoLCBzZWdtZW50KTtcbiAgICAgICAgICBpZiAodGhpcy5mcy5leGlzdHMoam9pbihwYWNrYWdlUGF0aCwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhY2thZ2VQYXRoO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHdlIGdvdCBoZXJlIHRoZW4gd2UgY291bGRuJ3QgZmluZCBhIGBwYWNrYWdlUGF0aGAgZm9yIHRoZSBjdXJyZW50IGBiYXNlUGF0aGAuXG4gICAgICAgIC8vIFNpbmNlIGBiYXNlUGF0aGBzIGFyZSBndWFyYW50ZWVkIG5vdCB0byBiZSBhIHN1Yi1kaXJlY3Rvcnkgb2YgZWFjaCBvdGhlciB0aGVuIG5vIG90aGVyXG4gICAgICAgIC8vIGBiYXNlUGF0aGAgd2lsbCBtYXRjaCBlaXRoZXIuXG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdlIGNvdWxkbid0IGZpbmQgYSBgcGFja2FnZVBhdGhgIHVzaW5nIGBiYXNlUGF0aHNgIHNvIHRyeSB0byBmaW5kIHRoZSBuZWFyZXN0IGBub2RlX21vZHVsZXNgXG4gICAgLy8gdGhhdCBjb250YWlucyB0aGUgYGVudHJ5UG9pbnRQYXRoYCwgaWYgdGhlcmUgaXMgb25lLCBhbmQgdXNlIGl0IGFzIGEgYGJhc2VQYXRoYC5cbiAgICBsZXQgcGFja2FnZVBhdGggPSBlbnRyeVBvaW50UGF0aDtcbiAgICBsZXQgc2NvcGVkUGFja2FnZVBhdGggPSBwYWNrYWdlUGF0aDtcbiAgICBsZXQgY29udGFpbmVyUGF0aCA9IHRoaXMuZnMuZGlybmFtZShwYWNrYWdlUGF0aCk7XG4gICAgd2hpbGUgKCF0aGlzLmZzLmlzUm9vdChjb250YWluZXJQYXRoKSAmJiAhY29udGFpbmVyUGF0aC5lbmRzV2l0aCgnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgIHNjb3BlZFBhY2thZ2VQYXRoID0gcGFja2FnZVBhdGg7XG4gICAgICBwYWNrYWdlUGF0aCA9IGNvbnRhaW5lclBhdGg7XG4gICAgICBjb250YWluZXJQYXRoID0gdGhpcy5mcy5kaXJuYW1lKGNvbnRhaW5lclBhdGgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAvLyBUaGUgZGlyZWN0b3J5IGRpcmVjdGx5IGJlbG93IGBub2RlX21vZHVsZXNgIGlzIGEgcGFja2FnZSAtIHVzZSBpdFxuICAgICAgcmV0dXJuIHBhY2thZ2VQYXRoO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRoaXMuZnMuYmFzZW5hbWUocGFja2FnZVBhdGgpLnN0YXJ0c1dpdGgoJ0AnKSAmJlxuICAgICAgICB0aGlzLmZzLmV4aXN0cyhqb2luKHNjb3BlZFBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAvLyBUaGUgZGlyZWN0b3J5IGRpcmVjdGx5IGJlbG93IHRoZSBgbm9kZV9tb2R1bGVzYCBpcyBhIHNjb3BlIGFuZCB0aGUgZGlyZWN0b3J5IGRpcmVjdGx5XG4gICAgICAvLyBiZWxvdyB0aGF0IGlzIGEgc2NvcGVkIHBhY2thZ2UgLSB1c2UgaXRcbiAgICAgIHJldHVybiBzY29wZWRQYWNrYWdlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgd2UgZ2V0IGhlcmUgdGhlbiBub25lIG9mIHRoZSBgYmFzZVBhdGhzYCBjb250YWluZWQgdGhlIGBlbnRyeVBvaW50UGF0aGAgYW5kIHRoZVxuICAgICAgLy8gYGVudHJ5UG9pbnRQYXRoYCBjb250YWlucyBubyBgbm9kZV9tb2R1bGVzYCB0aGF0IGNvbnRhaW5zIGEgcGFja2FnZSBvciBhIHNjb3BlZFxuICAgICAgLy8gcGFja2FnZS4gQWxsIHdlIGNhbiBkbyBpcyBhc3N1bWUgdGhhdCB0aGlzIGVudHJ5LXBvaW50IGlzIGEgcHJpbWFyeSBlbnRyeS1wb2ludCB0byBhXG4gICAgICAvLyBwYWNrYWdlLlxuICAgICAgcmV0dXJuIGVudHJ5UG9pbnRQYXRoO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTcGxpdCB0aGUgZ2l2ZW4gYHBhdGhgIGludG8gcGF0aCBzZWdtZW50cyB1c2luZyBhbiBGUyBpbmRlcGVuZGVudCBhbGdvcml0aG0uXG4gICAqIEBwYXJhbSBwYXRoIFRoZSBwYXRoIHRvIHNwbGl0LlxuICAgKi9cbiAgcHJpdmF0ZSBzcGxpdFBhdGgocGF0aDogUGF0aFNlZ21lbnQpIHtcbiAgICBjb25zdCBzZWdtZW50cyA9IFtdO1xuICAgIHdoaWxlIChwYXRoICE9PSAnLicpIHtcbiAgICAgIHNlZ21lbnRzLnVuc2hpZnQodGhpcy5mcy5iYXNlbmFtZShwYXRoKSk7XG4gICAgICBwYXRoID0gdGhpcy5mcy5kaXJuYW1lKHBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gc2VnbWVudHM7XG4gIH1cbn1cbiJdfQ==