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
            this.basePaths = utils_1.getBasePaths(this.basePath, this.pathMappings);
        }
        TargetedEntryPointFinder.prototype.findEntryPoints = function () {
            var _this = this;
            this.unprocessedPaths = [this.targetPath];
            while (this.unprocessedPaths.length > 0) {
                this.processNextPath();
            }
            var targetEntryPoint = this.unsortedEntryPoints.get(this.targetPath);
            var entryPoints = this.resolver.sortEntryPointsByDependency(Array.from(this.unsortedEntryPoints.values()), targetEntryPoint);
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
            this.unsortedEntryPoints.set(entryPoint.path, entryPoint);
            var deps = this.resolver.getEntryPointDependencies(entryPoint);
            deps.dependencies.forEach(function (dep) {
                if (!_this.unsortedEntryPoints.has(dep)) {
                    _this.unprocessedPaths.push(dep);
                }
            });
        };
        TargetedEntryPointFinder.prototype.getEntryPoint = function (entryPointPath) {
            var packagePath = this.computePackagePath(entryPointPath);
            var entryPoint = entry_point_1.getEntryPointInfo(this.fs, this.config, this.logger, packagePath, entryPointPath);
            if (entryPoint === entry_point_1.NO_ENTRY_POINT || entryPoint === entry_point_1.INVALID_ENTRY_POINT) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFyZ2V0ZWRfZW50cnlfcG9pbnRfZmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2VudHJ5X3BvaW50X2ZpbmRlci90YXJnZXRlZF9lbnRyeV9wb2ludF9maW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXFIO0lBR3JILHFGQUEwRDtJQUUxRCxtRkFBbUk7SUFHbkksaUZBQXFDO0lBRXJDOzs7Ozs7T0FNRztJQUNIO1FBS0Usa0NBQ1ksRUFBYyxFQUFVLE1BQXlCLEVBQVUsTUFBYyxFQUN6RSxRQUE0QixFQUFVLFFBQXdCLEVBQzlELFVBQTBCLEVBQVUsWUFBb0M7WUFGeEUsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW1CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUN6RSxhQUFRLEdBQVIsUUFBUSxDQUFvQjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQWdCO1lBQzlELGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQXdCO1lBUDVFLHFCQUFnQixHQUFxQixFQUFFLENBQUM7WUFDeEMsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7WUFDNUQsY0FBUyxHQUFHLG9CQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFLb0IsQ0FBQztRQUV4RixrREFBZSxHQUFmO1lBQUEsaUJBaUJDO1lBaEJDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMxQyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7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RUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUNyRCxvRUFBb0U7Z0JBQ3BFLE9BQU8sV0FBVyxDQUFDO2FBQ3BCO2lCQUFNLElBQ0gsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztnQkFDN0MsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0JBQUksQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO2dCQUMzRCx3RkFBd0Y7Z0JBQ3hGLDBDQUEwQztnQkFDMUMsT0FBTyxpQkFBaUIsQ0FBQzthQUMxQjtpQkFBTTtnQkFDTCxxRkFBcUY7Z0JBQ3JGLGtGQUFrRjtnQkFDbEYsdUZBQXVGO2dCQUN2RixXQUFXO2dCQUNYLE9BQU8sY0FBYyxDQUFDO2FBQ3ZCO1FBQ0gsQ0FBQztRQUVEOzs7V0FHRztRQUNLLDRDQUFTLEdBQWpCLFVBQWtCLElBQWlCO1lBQ2pDLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNwQixPQUFPLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQ25CLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDekMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQTFLRCxJQTBLQztJQTFLWSw0REFBd0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudCwgam9pbiwgcmVsYXRpdmUsIHJlbGF0aXZlRnJvbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RGVwZW5kZW5jeVJlc29sdmVyLCBTb3J0ZWRFbnRyeVBvaW50c0luZm99IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge2hhc0JlZW5Qcm9jZXNzZWR9IGZyb20gJy4uL3BhY2thZ2VzL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9ufSBmcm9tICcuLi9wYWNrYWdlcy9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgSU5WQUxJRF9FTlRSWV9QT0lOVCwgTk9fRU5UUllfUE9JTlQsIGdldEVudHJ5UG9pbnRJbmZvfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludCc7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtFbnRyeVBvaW50RmluZGVyfSBmcm9tICcuL2ludGVyZmFjZSc7XG5pbXBvcnQge2dldEJhc2VQYXRoc30gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQW4gRW50cnlQb2ludEZpbmRlciB0aGF0IHN0YXJ0cyBmcm9tIGEgdGFyZ2V0IGVudHJ5LXBvaW50IGFuZCBvbmx5IGZpbmRzXG4gKiBlbnRyeS1wb2ludHMgdGhhdCBhcmUgZGVwZW5kZW5jaWVzIG9mIHRoZSB0YXJnZXQuXG4gKlxuICogVGhpcyBpcyBmYXN0ZXIgdGhhbiBzZWFyY2hpbmcgdGhlIGVudGlyZSBmaWxlLXN5c3RlbSBmb3IgYWxsIHRoZSBlbnRyeS1wb2ludHMsXG4gKiBhbmQgaXMgdXNlZCBwcmltYXJpbHkgYnkgdGhlIENMSSBpbnRlZ3JhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIFRhcmdldGVkRW50cnlQb2ludEZpbmRlciBpbXBsZW1lbnRzIEVudHJ5UG9pbnRGaW5kZXIge1xuICBwcml2YXRlIHVucHJvY2Vzc2VkUGF0aHM6IEFic29sdXRlRnNQYXRoW10gPSBbXTtcbiAgcHJpdmF0ZSB1bnNvcnRlZEVudHJ5UG9pbnRzID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRW50cnlQb2ludD4oKTtcbiAgcHJpdmF0ZSBiYXNlUGF0aHMgPSBnZXRCYXNlUGF0aHModGhpcy5iYXNlUGF0aCwgdGhpcy5wYXRoTWFwcGluZ3MpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyLCBwcml2YXRlIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIHByaXZhdGUgdGFyZ2V0UGF0aDogQWJzb2x1dGVGc1BhdGgsIHByaXZhdGUgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3N8dW5kZWZpbmVkKSB7fVxuXG4gIGZpbmRFbnRyeVBvaW50cygpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICAgIHRoaXMudW5wcm9jZXNzZWRQYXRocyA9IFt0aGlzLnRhcmdldFBhdGhdO1xuICAgIHdoaWxlICh0aGlzLnVucHJvY2Vzc2VkUGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5wcm9jZXNzTmV4dFBhdGgoKTtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0RW50cnlQb2ludCA9IHRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy5nZXQodGhpcy50YXJnZXRQYXRoKTtcbiAgICBjb25zdCBlbnRyeVBvaW50cyA9IHRoaXMucmVzb2x2ZXIuc29ydEVudHJ5UG9pbnRzQnlEZXBlbmRlbmN5KFxuICAgICAgICBBcnJheS5mcm9tKHRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy52YWx1ZXMoKSksIHRhcmdldEVudHJ5UG9pbnQpO1xuXG4gICAgY29uc3QgaW52YWxpZFRhcmdldCA9XG4gICAgICAgIGVudHJ5UG9pbnRzLmludmFsaWRFbnRyeVBvaW50cy5maW5kKGkgPT4gaS5lbnRyeVBvaW50LnBhdGggPT09IHRoaXMudGFyZ2V0UGF0aCk7XG4gICAgaWYgKGludmFsaWRUYXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBUaGUgdGFyZ2V0IGVudHJ5LXBvaW50IFwiJHtpbnZhbGlkVGFyZ2V0LmVudHJ5UG9pbnQubmFtZX1cIiBoYXMgbWlzc2luZyBkZXBlbmRlbmNpZXM6XFxuYCArXG4gICAgICAgICAgaW52YWxpZFRhcmdldC5taXNzaW5nRGVwZW5kZW5jaWVzLm1hcChkZXAgPT4gYCAtICR7ZGVwfVxcbmApLmpvaW4oJycpKTtcbiAgICB9XG4gICAgcmV0dXJuIGVudHJ5UG9pbnRzO1xuICB9XG5cbiAgdGFyZ2V0TmVlZHNQcm9jZXNzaW5nT3JDbGVhbmluZyhcbiAgICAgIHByb3BlcnRpZXNUb0NvbnNpZGVyOiBFbnRyeVBvaW50SnNvblByb3BlcnR5W10sIGNvbXBpbGVBbGxGb3JtYXRzOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgY29uc3QgZW50cnlQb2ludCA9IHRoaXMuZ2V0RW50cnlQb2ludCh0aGlzLnRhcmdldFBhdGgpO1xuICAgIGlmIChlbnRyeVBvaW50ID09PSBudWxsIHx8ICFlbnRyeVBvaW50LmNvbXBpbGVkQnlBbmd1bGFyKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBwcm9wZXJ0eSBvZiBwcm9wZXJ0aWVzVG9Db25zaWRlcikge1xuICAgICAgaWYgKGVudHJ5UG9pbnQucGFja2FnZUpzb25bcHJvcGVydHldKSB7XG4gICAgICAgIC8vIEhlcmUgaXMgYSBwcm9wZXJ0eSB0aGF0IHNob3VsZCBiZSBwcm9jZXNzZWQuXG4gICAgICAgIGlmICghaGFzQmVlblByb2Nlc3NlZChlbnRyeVBvaW50LnBhY2thZ2VKc29uLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbXBpbGVBbGxGb3JtYXRzKSB7XG4gICAgICAgICAgLy8gVGhpcyBwcm9wZXJ0eSBoYXMgYmVlbiBwcm9jZXNzZWQsIGFuZCB3ZSBvbmx5IG5lZWQgb25lLlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBBbGwgYHByb3BlcnRpZXNUb0NvbnNpZGVyYCB0aGF0IGFwcGVhciBpbiB0aGlzIGVudHJ5LXBvaW50IGhhdmUgYmVlbiBwcm9jZXNzZWQuXG4gICAgLy8gSW4gb3RoZXIgd29yZHMsIHRoZXJlIHdlcmUgbm8gcHJvcGVydGllcyB0aGF0IG5lZWQgcHJvY2Vzc2luZy5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NOZXh0UGF0aCgpOiB2b2lkIHtcbiAgICBjb25zdCBwYXRoID0gdGhpcy51bnByb2Nlc3NlZFBhdGhzLnNoaWZ0KCkgITtcbiAgICBjb25zdCBlbnRyeVBvaW50ID0gdGhpcy5nZXRFbnRyeVBvaW50KHBhdGgpO1xuICAgIGlmIChlbnRyeVBvaW50ID09PSBudWxsIHx8ICFlbnRyeVBvaW50LmNvbXBpbGVkQnlBbmd1bGFyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudW5zb3J0ZWRFbnRyeVBvaW50cy5zZXQoZW50cnlQb2ludC5wYXRoLCBlbnRyeVBvaW50KTtcbiAgICBjb25zdCBkZXBzID0gdGhpcy5yZXNvbHZlci5nZXRFbnRyeVBvaW50RGVwZW5kZW5jaWVzKGVudHJ5UG9pbnQpO1xuICAgIGRlcHMuZGVwZW5kZW5jaWVzLmZvckVhY2goZGVwID0+IHtcbiAgICAgIGlmICghdGhpcy51bnNvcnRlZEVudHJ5UG9pbnRzLmhhcyhkZXApKSB7XG4gICAgICAgIHRoaXMudW5wcm9jZXNzZWRQYXRocy5wdXNoKGRlcCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGdldEVudHJ5UG9pbnQoZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludHxudWxsIHtcbiAgICBjb25zdCBwYWNrYWdlUGF0aCA9IHRoaXMuY29tcHV0ZVBhY2thZ2VQYXRoKGVudHJ5UG9pbnRQYXRoKTtcbiAgICBjb25zdCBlbnRyeVBvaW50ID1cbiAgICAgICAgZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5jb25maWcsIHRoaXMubG9nZ2VyLCBwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpO1xuICAgIGlmIChlbnRyeVBvaW50ID09PSBOT19FTlRSWV9QT0lOVCB8fCBlbnRyeVBvaW50ID09PSBJTlZBTElEX0VOVFJZX1BPSU5UKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIGVudHJ5UG9pbnQ7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIGRvd24gdG8gdGhlIGBlbnRyeVBvaW50UGF0aGAgZnJvbSBlYWNoIGBiYXNlUGF0aGAgZm9yIHRoZSBmaXJzdCBgcGFja2FnZS5qc29uYCB0aGF0IHdlXG4gICAqIGNvbWUgdG8uIFRoaXMgaXMgdGhlIHBhdGggdG8gdGhlIGVudHJ5LXBvaW50J3MgY29udGFpbmluZyBwYWNrYWdlLiBGb3IgZXhhbXBsZSBpZiBgYmFzZVBhdGhgIGlzXG4gICAqIGAvYS9iL2NgIGFuZCBgZW50cnlQb2ludFBhdGhgIGlzIGAvYS9iL2MvZC9lYCBhbmQgdGhlcmUgZXhpc3RzIGAvYS9iL2MvZC9wYWNrYWdlLmpzb25gIGFuZFxuICAgKiBgL2EvYi9jL2QvZS9wYWNrYWdlLmpzb25gLCB0aGVuIHdlIHdpbGwgcmV0dXJuIGAvYS9iL2MvZGAuXG4gICAqXG4gICAqIFRvIGFjY291bnQgZm9yIG5lc3RlZCBgbm9kZV9tb2R1bGVzYCB3ZSBhY3R1YWxseSBzdGFydCB0aGUgc2VhcmNoIGF0IHRoZSBsYXN0IGBub2RlX21vZHVsZXNgIGluXG4gICAqIHRoZSBgZW50cnlQb2ludFBhdGhgIHRoYXQgaXMgYmVsb3cgdGhlIGBiYXNlUGF0aGAuIEUuZy4gaWYgYGJhc2VQYXRoYCBpcyBgL2EvYi9jYCBhbmRcbiAgICogYGVudHJ5UG9pbnRQYXRoYCBpcyBgL2EvYi9jL2Qvbm9kZV9tb2R1bGVzL3gveS96YCwgd2Ugc3RhcnQgdGhlIHNlYXJjaCBhdFxuICAgKiBgL2EvYi9jL2Qvbm9kZV9tb2R1bGVzYC5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZVBhY2thZ2VQYXRoKGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRoIHtcbiAgICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIHRoaXMuYmFzZVBhdGhzKSB7XG4gICAgICBpZiAoZW50cnlQb2ludFBhdGguc3RhcnRzV2l0aChiYXNlUGF0aCkpIHtcbiAgICAgICAgbGV0IHBhY2thZ2VQYXRoID0gYmFzZVBhdGg7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5zcGxpdFBhdGgocmVsYXRpdmUoYmFzZVBhdGgsIGVudHJ5UG9pbnRQYXRoKSk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0luZGV4ID0gc2VnbWVudHMubGFzdEluZGV4T2YocmVsYXRpdmVGcm9tKCdub2RlX21vZHVsZXMnKSk7XG5cbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGBub2RlX21vZHVsZXNgIGluIHRoZSByZWxhdGl2ZSBwYXRoIGJldHdlZW4gdGhlIGBiYXNlUGF0aGAgYW5kIHRoZVxuICAgICAgICAvLyBgZW50cnlQb2ludFBhdGhgIHRoZW4ganVzdCB0cnkgdGhlIGBiYXNlUGF0aGAgYXMgdGhlIGBwYWNrYWdlUGF0aGAuXG4gICAgICAgIC8vIChUaGlzIGNhbiBiZSB0aGUgY2FzZSB3aXRoIHBhdGgtbWFwcGVkIGVudHJ5LXBvaW50cy4pXG4gICAgICAgIGlmIChub2RlTW9kdWxlc0luZGV4ID09PSAtMSkge1xuICAgICAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKHBhY2thZ2VQYXRoLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFja2FnZVBhdGg7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RhcnQgdGhlIHNlYXJjaCBhdCB0aGUgZGVlcGVzdCBuZXN0ZWQgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIHRoYXQgaXMgYmVsb3cgdGhlIGBiYXNlUGF0aGBcbiAgICAgICAgLy8gYnV0IGFib3ZlIHRoZSBgZW50cnlQb2ludFBhdGhgLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgICAgICB3aGlsZSAobm9kZU1vZHVsZXNJbmRleCA+PSAwKSB7XG4gICAgICAgICAgcGFja2FnZVBhdGggPSBqb2luKHBhY2thZ2VQYXRoLCBzZWdtZW50cy5zaGlmdCgpICEpO1xuICAgICAgICAgIG5vZGVNb2R1bGVzSW5kZXgtLTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vdGUgdGhhdCB3ZSBzdGFydCBhdCB0aGUgZm9sZGVyIGJlbG93IHRoZSBjdXJyZW50IGNhbmRpZGF0ZSBgcGFja2FnZVBhdGhgIGJlY2F1c2UgdGhlXG4gICAgICAgIC8vIGluaXRpYWwgY2FuZGlkYXRlIGBwYWNrYWdlUGF0aGAgaXMgZWl0aGVyIGEgYG5vZGVfbW9kdWxlc2AgZm9sZGVyIG9yIHRoZSBgYmFzZVBhdGhgIHdpdGhcbiAgICAgICAgLy8gbm8gYHBhY2thZ2UuanNvbmAuXG4gICAgICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzZWdtZW50cykge1xuICAgICAgICAgIHBhY2thZ2VQYXRoID0gam9pbihwYWNrYWdlUGF0aCwgc2VnbWVudCk7XG4gICAgICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKGpvaW4ocGFja2FnZVBhdGgsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB3ZSBnb3QgaGVyZSB0aGVuIHdlIGNvdWxkbid0IGZpbmQgYSBgcGFja2FnZVBhdGhgIGZvciB0aGUgY3VycmVudCBgYmFzZVBhdGhgLlxuICAgICAgICAvLyBTaW5jZSBgYmFzZVBhdGhgcyBhcmUgZ3VhcmFudGVlZCBub3QgdG8gYmUgYSBzdWItZGlyZWN0b3J5IG9mIGVhY2ggb3RoZXIgdGhlbiBubyBvdGhlclxuICAgICAgICAvLyBgYmFzZVBhdGhgIHdpbGwgbWF0Y2ggZWl0aGVyLlxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXZSBjb3VsZG4ndCBmaW5kIGEgYHBhY2thZ2VQYXRoYCB1c2luZyBgYmFzZVBhdGhzYCBzbyB0cnkgdG8gZmluZCB0aGUgbmVhcmVzdCBgbm9kZV9tb2R1bGVzYFxuICAgIC8vIHRoYXQgY29udGFpbnMgdGhlIGBlbnRyeVBvaW50UGF0aGAsIGlmIHRoZXJlIGlzIG9uZSwgYW5kIHVzZSBpdCBhcyBhIGBiYXNlUGF0aGAuXG4gICAgbGV0IHBhY2thZ2VQYXRoID0gZW50cnlQb2ludFBhdGg7XG4gICAgbGV0IHNjb3BlZFBhY2thZ2VQYXRoID0gcGFja2FnZVBhdGg7XG4gICAgbGV0IGNvbnRhaW5lclBhdGggPSB0aGlzLmZzLmRpcm5hbWUocGFja2FnZVBhdGgpO1xuICAgIHdoaWxlICghdGhpcy5mcy5pc1Jvb3QoY29udGFpbmVyUGF0aCkgJiYgIWNvbnRhaW5lclBhdGguZW5kc1dpdGgoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICBzY29wZWRQYWNrYWdlUGF0aCA9IHBhY2thZ2VQYXRoO1xuICAgICAgcGFja2FnZVBhdGggPSBjb250YWluZXJQYXRoO1xuICAgICAgY29udGFpbmVyUGF0aCA9IHRoaXMuZnMuZGlybmFtZShjb250YWluZXJQYXRoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5mcy5leGlzdHMoam9pbihwYWNrYWdlUGF0aCwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgLy8gVGhlIGRpcmVjdG9yeSBkaXJlY3RseSBiZWxvdyBgbm9kZV9tb2R1bGVzYCBpcyBhIHBhY2thZ2UgLSB1c2UgaXRcbiAgICAgIHJldHVybiBwYWNrYWdlUGF0aDtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICB0aGlzLmZzLmJhc2VuYW1lKHBhY2thZ2VQYXRoKS5zdGFydHNXaXRoKCdAJykgJiZcbiAgICAgICAgdGhpcy5mcy5leGlzdHMoam9pbihzY29wZWRQYWNrYWdlUGF0aCwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgLy8gVGhlIGRpcmVjdG9yeSBkaXJlY3RseSBiZWxvdyB0aGUgYG5vZGVfbW9kdWxlc2AgaXMgYSBzY29wZSBhbmQgdGhlIGRpcmVjdG9yeSBkaXJlY3RseVxuICAgICAgLy8gYmVsb3cgdGhhdCBpcyBhIHNjb3BlZCBwYWNrYWdlIC0gdXNlIGl0XG4gICAgICByZXR1cm4gc2NvcGVkUGFja2FnZVBhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHdlIGdldCBoZXJlIHRoZW4gbm9uZSBvZiB0aGUgYGJhc2VQYXRoc2AgY29udGFpbmVkIHRoZSBgZW50cnlQb2ludFBhdGhgIGFuZCB0aGVcbiAgICAgIC8vIGBlbnRyeVBvaW50UGF0aGAgY29udGFpbnMgbm8gYG5vZGVfbW9kdWxlc2AgdGhhdCBjb250YWlucyBhIHBhY2thZ2Ugb3IgYSBzY29wZWRcbiAgICAgIC8vIHBhY2thZ2UuIEFsbCB3ZSBjYW4gZG8gaXMgYXNzdW1lIHRoYXQgdGhpcyBlbnRyeS1wb2ludCBpcyBhIHByaW1hcnkgZW50cnktcG9pbnQgdG8gYVxuICAgICAgLy8gcGFja2FnZS5cbiAgICAgIHJldHVybiBlbnRyeVBvaW50UGF0aDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3BsaXQgdGhlIGdpdmVuIGBwYXRoYCBpbnRvIHBhdGggc2VnbWVudHMgdXNpbmcgYW4gRlMgaW5kZXBlbmRlbnQgYWxnb3JpdGhtLlxuICAgKiBAcGFyYW0gcGF0aCBUaGUgcGF0aCB0byBzcGxpdC5cbiAgICovXG4gIHByaXZhdGUgc3BsaXRQYXRoKHBhdGg6IFBhdGhTZWdtZW50KSB7XG4gICAgY29uc3Qgc2VnbWVudHMgPSBbXTtcbiAgICB3aGlsZSAocGF0aCAhPT0gJy4nKSB7XG4gICAgICBzZWdtZW50cy51bnNoaWZ0KHRoaXMuZnMuYmFzZW5hbWUocGF0aCkpO1xuICAgICAgcGF0aCA9IHRoaXMuZnMuZGlybmFtZShwYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlZ21lbnRzO1xuICB9XG59XG4iXX0=