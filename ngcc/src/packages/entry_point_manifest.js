(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point_manifest", ["require", "exports", "tslib", "crypto", "@angular/compiler-cli/ngcc/src/packages/build_marker", "@angular/compiler-cli/ngcc/src/packages/entry_point"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InvalidatingEntryPointManifest = exports.EntryPointManifest = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var crypto_1 = require("crypto");
    var build_marker_1 = require("@angular/compiler-cli/ngcc/src/packages/build_marker");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    /**
     * Manages reading and writing a manifest file that contains a list of all the entry-points that
     * were found below a given basePath.
     *
     * This is a super-set of the entry-points that are actually processed for a given run of ngcc,
     * since some may already be processed, or excluded if they do not have the required format.
     */
    var EntryPointManifest = /** @class */ (function () {
        function EntryPointManifest(fs, config, logger) {
            this.fs = fs;
            this.config = config;
            this.logger = logger;
        }
        /**
         * Try to get the entry-point info from a manifest file for the given `basePath` if it exists and
         * is not out of date.
         *
         * Reasons for the manifest to be out of date are:
         *
         * * the file does not exist
         * * the ngcc version has changed
         * * the package lock-file (i.e. yarn.lock or package-lock.json) has changed
         * * the project configuration has changed
         * * one or more entry-points in the manifest are not valid
         *
         * @param basePath The path that would contain the entry-points and the manifest file.
         * @returns an array of entry-point information for all entry-points found below the given
         * `basePath` or `null` if the manifest was out of date.
         */
        EntryPointManifest.prototype.readEntryPointsUsingManifest = function (basePath) {
            var e_1, _a;
            try {
                if (this.fs.basename(basePath) !== 'node_modules') {
                    return null;
                }
                var manifestPath = this.getEntryPointManifestPath(basePath);
                if (!this.fs.exists(manifestPath)) {
                    return null;
                }
                var computedLockFileHash = this.computeLockFileHash(basePath);
                if (computedLockFileHash === null) {
                    return null;
                }
                var _b = JSON.parse(this.fs.readFile(manifestPath)), ngccVersion = _b.ngccVersion, configFileHash = _b.configFileHash, lockFileHash = _b.lockFileHash, entryPointPaths = _b.entryPointPaths;
                if (ngccVersion !== build_marker_1.NGCC_VERSION || configFileHash !== this.config.hash ||
                    lockFileHash !== computedLockFileHash) {
                    return null;
                }
                this.logger.debug("Entry-point manifest found for " + basePath + " so loading entry-point information directly.");
                var startTime = Date.now();
                var entryPoints = [];
                try {
                    for (var entryPointPaths_1 = tslib_1.__values(entryPointPaths), entryPointPaths_1_1 = entryPointPaths_1.next(); !entryPointPaths_1_1.done; entryPointPaths_1_1 = entryPointPaths_1.next()) {
                        var _c = tslib_1.__read(entryPointPaths_1_1.value, 5), packagePath = _c[0], entryPointPath = _c[1], _d = _c[2], dependencyPaths = _d === void 0 ? [] : _d, _e = _c[3], missingPaths = _e === void 0 ? [] : _e, _f = _c[4], deepImportPaths = _f === void 0 ? [] : _f;
                        var result = entry_point_1.getEntryPointInfo(this.fs, this.config, this.logger, this.fs.resolve(basePath, packagePath), this.fs.resolve(basePath, entryPointPath));
                        if (result === entry_point_1.NO_ENTRY_POINT || result === entry_point_1.INCOMPATIBLE_ENTRY_POINT) {
                            throw new Error("The entry-point manifest at " + manifestPath + " contained an invalid pair of package paths: [" + packagePath + ", " + entryPointPath + "]");
                        }
                        else {
                            entryPoints.push({
                                entryPoint: result,
                                depInfo: {
                                    dependencies: new Set(dependencyPaths),
                                    missing: new Set(missingPaths),
                                    deepImports: new Set(deepImportPaths),
                                }
                            });
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (entryPointPaths_1_1 && !entryPointPaths_1_1.done && (_a = entryPointPaths_1.return)) _a.call(entryPointPaths_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                var duration = Math.round((Date.now() - startTime) / 100) / 10;
                this.logger.debug("Reading entry-points using the manifest entries took " + duration + "s.");
                return entryPoints;
            }
            catch (e) {
                this.logger.warn("Unable to read the entry-point manifest for " + basePath + ":\n", e.stack || e.toString());
                return null;
            }
        };
        /**
         * Write a manifest file at the given `basePath`.
         *
         * The manifest includes the current ngcc version and hashes of the package lock-file and current
         * project config. These will be used to check whether the manifest file is out of date. See
         * `readEntryPointsUsingManifest()`.
         *
         * @param basePath The path where the manifest file is to be written.
         * @param entryPoints A collection of entry-points to record in the manifest.
         */
        EntryPointManifest.prototype.writeEntryPointManifest = function (basePath, entryPoints) {
            var _this = this;
            if (this.fs.basename(basePath) !== 'node_modules') {
                return;
            }
            var lockFileHash = this.computeLockFileHash(basePath);
            if (lockFileHash === null) {
                return;
            }
            var manifest = {
                ngccVersion: build_marker_1.NGCC_VERSION,
                configFileHash: this.config.hash,
                lockFileHash: lockFileHash,
                entryPointPaths: entryPoints.map(function (e) {
                    var entryPointPaths = [
                        _this.fs.relative(basePath, e.entryPoint.package),
                        _this.fs.relative(basePath, e.entryPoint.path),
                    ];
                    // Only add depInfo arrays if needed.
                    if (e.depInfo.dependencies.size > 0) {
                        entryPointPaths[2] = Array.from(e.depInfo.dependencies);
                    }
                    else if (e.depInfo.missing.size > 0 || e.depInfo.deepImports.size > 0) {
                        entryPointPaths[2] = [];
                    }
                    if (e.depInfo.missing.size > 0) {
                        entryPointPaths[3] = Array.from(e.depInfo.missing);
                    }
                    else if (e.depInfo.deepImports.size > 0) {
                        entryPointPaths[3] = [];
                    }
                    if (e.depInfo.deepImports.size > 0) {
                        entryPointPaths[4] = Array.from(e.depInfo.deepImports);
                    }
                    return entryPointPaths;
                }),
            };
            this.fs.writeFile(this.getEntryPointManifestPath(basePath), JSON.stringify(manifest));
        };
        EntryPointManifest.prototype.getEntryPointManifestPath = function (basePath) {
            return this.fs.resolve(basePath, '__ngcc_entry_points__.json');
        };
        EntryPointManifest.prototype.computeLockFileHash = function (basePath) {
            var e_2, _a;
            var directory = this.fs.dirname(basePath);
            try {
                for (var _b = tslib_1.__values(['yarn.lock', 'package-lock.json']), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var lockFileName = _c.value;
                    var lockFilePath = this.fs.resolve(directory, lockFileName);
                    if (this.fs.exists(lockFilePath)) {
                        var lockFileContents = this.fs.readFile(lockFilePath);
                        return crypto_1.createHash('md5').update(lockFileContents).digest('hex');
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
            return null;
        };
        return EntryPointManifest;
    }());
    exports.EntryPointManifest = EntryPointManifest;
    /**
     * A specialized implementation of the `EntryPointManifest` that can be used to invalidate the
     * current manifest file.
     *
     * It always returns `null` from the `readEntryPointsUsingManifest()` method, which forces a new
     * manifest to be created, which will overwrite the current file when `writeEntryPointManifest()`
     * is called.
     */
    var InvalidatingEntryPointManifest = /** @class */ (function (_super) {
        tslib_1.__extends(InvalidatingEntryPointManifest, _super);
        function InvalidatingEntryPointManifest() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        InvalidatingEntryPointManifest.prototype.readEntryPointsUsingManifest = function (_basePath) {
            return null;
        };
        return InvalidatingEntryPointManifest;
    }(EntryPointManifest));
    exports.InvalidatingEntryPointManifest = InvalidatingEntryPointManifest;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfbWFuaWZlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnRfbWFuaWZlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFrQztJQU1sQyxxRkFBNEM7SUFFNUMsbUZBQTBGO0lBRTFGOzs7Ozs7T0FNRztJQUNIO1FBQ0UsNEJBQW9CLEVBQWMsRUFBVSxNQUF5QixFQUFVLE1BQWM7WUFBekUsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQW1CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFHLENBQUM7UUFFakc7Ozs7Ozs7Ozs7Ozs7OztXQWVHO1FBQ0gseURBQTRCLEdBQTVCLFVBQTZCLFFBQXdCOztZQUNuRCxJQUFJO2dCQUNGLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssY0FBYyxFQUFFO29CQUNqRCxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFFRCxJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzlELElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRTtvQkFDakMsT0FBTyxJQUFJLENBQUM7aUJBQ2I7Z0JBRUQsSUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2hFLElBQUksb0JBQW9CLEtBQUssSUFBSSxFQUFFO29CQUNqQyxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFFSyxJQUFBLEtBQ0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxZQUFZ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LENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7cUJBQ2pFO2lCQUNGOzs7Ozs7Ozs7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUE5SUQsSUE4SUM7SUE5SVksZ0RBQWtCO0lBZ0ovQjs7Ozs7OztPQU9HO0lBQ0g7UUFBb0QsMERBQWtCO1FBQXRFOztRQUlBLENBQUM7UUFIQyxxRUFBNEIsR0FBNUIsVUFBNkIsU0FBeUI7WUFDcEQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gscUNBQUM7SUFBRCxDQUFDLEFBSkQsQ0FBb0Qsa0JBQWtCLEdBSXJFO0lBSlksd0VBQThCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjcmVhdGVIYXNofSBmcm9tICdjcnlwdG8nO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXN9IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcblxuaW1wb3J0IHtOR0NDX1ZFUlNJT059IGZyb20gJy4vYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4vY29uZmlndXJhdGlvbic7XG5pbXBvcnQge2dldEVudHJ5UG9pbnRJbmZvLCBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQsIE5PX0VOVFJZX1BPSU5UfSBmcm9tICcuL2VudHJ5X3BvaW50JztcblxuLyoqXG4gKiBNYW5hZ2VzIHJlYWRpbmcgYW5kIHdyaXRpbmcgYSBtYW5pZmVzdCBmaWxlIHRoYXQgY29udGFpbnMgYSBsaXN0IG9mIGFsbCB0aGUgZW50cnktcG9pbnRzIHRoYXRcbiAqIHdlcmUgZm91bmQgYmVsb3cgYSBnaXZlbiBiYXNlUGF0aC5cbiAqXG4gKiBUaGlzIGlzIGEgc3VwZXItc2V0IG9mIHRoZSBlbnRyeS1wb2ludHMgdGhhdCBhcmUgYWN0dWFsbHkgcHJvY2Vzc2VkIGZvciBhIGdpdmVuIHJ1biBvZiBuZ2NjLFxuICogc2luY2Ugc29tZSBtYXkgYWxyZWFkeSBiZSBwcm9jZXNzZWQsIG9yIGV4Y2x1ZGVkIGlmIHRoZXkgZG8gbm90IGhhdmUgdGhlIHJlcXVpcmVkIGZvcm1hdC5cbiAqL1xuZXhwb3J0IGNsYXNzIEVudHJ5UG9pbnRNYW5pZmVzdCB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgY29uZmlnOiBOZ2NjQ29uZmlndXJhdGlvbiwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcikge31cblxuICAvKipcbiAgICogVHJ5IHRvIGdldCB0aGUgZW50cnktcG9pbnQgaW5mbyBmcm9tIGEgbWFuaWZlc3QgZmlsZSBmb3IgdGhlIGdpdmVuIGBiYXNlUGF0aGAgaWYgaXQgZXhpc3RzIGFuZFxuICAgKiBpcyBub3Qgb3V0IG9mIGRhdGUuXG4gICAqXG4gICAqIFJlYXNvbnMgZm9yIHRoZSBtYW5pZmVzdCB0byBiZSBvdXQgb2YgZGF0ZSBhcmU6XG4gICAqXG4gICAqICogdGhlIGZpbGUgZG9lcyBub3QgZXhpc3RcbiAgICogKiB0aGUgbmdjYyB2ZXJzaW9uIGhhcyBjaGFuZ2VkXG4gICAqICogdGhlIHBhY2thZ2UgbG9jay1maWxlIChpLmUuIHlhcm4ubG9jayBvciBwYWNrYWdlLWxvY2suanNvbikgaGFzIGNoYW5nZWRcbiAgICogKiB0aGUgcHJvamVjdCBjb25maWd1cmF0aW9uIGhhcyBjaGFuZ2VkXG4gICAqICogb25lIG9yIG1vcmUgZW50cnktcG9pbnRzIGluIHRoZSBtYW5pZmVzdCBhcmUgbm90IHZhbGlkXG4gICAqXG4gICAqIEBwYXJhbSBiYXNlUGF0aCBUaGUgcGF0aCB0aGF0IHdvdWxkIGNvbnRhaW4gdGhlIGVudHJ5LXBvaW50cyBhbmQgdGhlIG1hbmlmZXN0IGZpbGUuXG4gICAqIEByZXR1cm5zIGFuIGFycmF5IG9mIGVudHJ5LXBvaW50IGluZm9ybWF0aW9uIGZvciBhbGwgZW50cnktcG9pbnRzIGZvdW5kIGJlbG93IHRoZSBnaXZlblxuICAgKiBgYmFzZVBhdGhgIG9yIGBudWxsYCBpZiB0aGUgbWFuaWZlc3Qgd2FzIG91dCBvZiBkYXRlLlxuICAgKi9cbiAgcmVhZEVudHJ5UG9pbnRzVXNpbmdNYW5pZmVzdChiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdfG51bGwge1xuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy5mcy5iYXNlbmFtZShiYXNlUGF0aCkgIT09ICdub2RlX21vZHVsZXMnKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYW5pZmVzdFBhdGggPSB0aGlzLmdldEVudHJ5UG9pbnRNYW5pZmVzdFBhdGgoYmFzZVBhdGgpO1xuICAgICAgaWYgKCF0aGlzLmZzLmV4aXN0cyhtYW5pZmVzdFBhdGgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb21wdXRlZExvY2tGaWxlSGFzaCA9IHRoaXMuY29tcHV0ZUxvY2tGaWxlSGFzaChiYXNlUGF0aCk7XG4gICAgICBpZiAoY29tcHV0ZWRMb2NrRmlsZUhhc2ggPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtuZ2NjVmVyc2lvbiwgY29uZmlnRmlsZUhhc2gsIGxvY2tGaWxlSGFzaCwgZW50cnlQb2ludFBhdGhzfSA9XG4gICAgICAgICAgSlNPTi5wYXJzZSh0aGlzLmZzLnJlYWRGaWxlKG1hbmlmZXN0UGF0aCkpIGFzIEVudHJ5UG9pbnRNYW5pZmVzdEZpbGU7XG4gICAgICBpZiAobmdjY1ZlcnNpb24gIT09IE5HQ0NfVkVSU0lPTiB8fCBjb25maWdGaWxlSGFzaCAhPT0gdGhpcy5jb25maWcuaGFzaCB8fFxuICAgICAgICAgIGxvY2tGaWxlSGFzaCAhPT0gY29tcHV0ZWRMb2NrRmlsZUhhc2gpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBFbnRyeS1wb2ludCBtYW5pZmVzdCBmb3VuZCBmb3IgJHtcbiAgICAgICAgICBiYXNlUGF0aH0gc28gbG9hZGluZyBlbnRyeS1wb2ludCBpbmZvcm1hdGlvbiBkaXJlY3RseS5gKTtcbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0XG4gICAgICAgICAgICAgICBbcGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoLCBkZXBlbmRlbmN5UGF0aHMgPSBbXSwgbWlzc2luZ1BhdGhzID0gW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWVwSW1wb3J0UGF0aHMgPSBbXV0gb2YgZW50cnlQb2ludFBhdGhzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGdldEVudHJ5UG9pbnRJbmZvKFxuICAgICAgICAgICAgdGhpcy5mcywgdGhpcy5jb25maWcsIHRoaXMubG9nZ2VyLCB0aGlzLmZzLnJlc29sdmUoYmFzZVBhdGgsIHBhY2thZ2VQYXRoKSxcbiAgICAgICAgICAgIHRoaXMuZnMucmVzb2x2ZShiYXNlUGF0aCwgZW50cnlQb2ludFBhdGgpKTtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gTk9fRU5UUllfUE9JTlQgfHwgcmVzdWx0ID09PSBJTkNPTVBBVElCTEVfRU5UUllfUE9JTlQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBlbnRyeS1wb2ludCBtYW5pZmVzdCBhdCAke1xuICAgICAgICAgICAgICBtYW5pZmVzdFBhdGh9IGNvbnRhaW5lZCBhbiBpbnZhbGlkIHBhaXIgb2YgcGFja2FnZSBwYXRoczogWyR7cGFja2FnZVBhdGh9LCAke1xuICAgICAgICAgICAgICBlbnRyeVBvaW50UGF0aH1dYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZW50cnlQb2ludHMucHVzaCh7XG4gICAgICAgICAgICBlbnRyeVBvaW50OiByZXN1bHQsXG4gICAgICAgICAgICBkZXBJbmZvOiB7XG4gICAgICAgICAgICAgIGRlcGVuZGVuY2llczogbmV3IFNldChkZXBlbmRlbmN5UGF0aHMpLFxuICAgICAgICAgICAgICBtaXNzaW5nOiBuZXcgU2V0KG1pc3NpbmdQYXRocyksXG4gICAgICAgICAgICAgIGRlZXBJbXBvcnRzOiBuZXcgU2V0KGRlZXBJbXBvcnRQYXRocyksXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDApIC8gMTA7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUmVhZGluZyBlbnRyeS1wb2ludHMgdXNpbmcgdGhlIG1hbmlmZXN0IGVudHJpZXMgdG9vayAke2R1cmF0aW9ufXMuYCk7XG4gICAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICBgVW5hYmxlIHRvIHJlYWQgdGhlIGVudHJ5LXBvaW50IG1hbmlmZXN0IGZvciAke2Jhc2VQYXRofTpcXG5gLCBlLnN0YWNrIHx8IGUudG9TdHJpbmcoKSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogV3JpdGUgYSBtYW5pZmVzdCBmaWxlIGF0IHRoZSBnaXZlbiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBUaGUgbWFuaWZlc3QgaW5jbHVkZXMgdGhlIGN1cnJlbnQgbmdjYyB2ZXJzaW9uIGFuZCBoYXNoZXMgb2YgdGhlIHBhY2thZ2UgbG9jay1maWxlIGFuZCBjdXJyZW50XG4gICAqIHByb2plY3QgY29uZmlnLiBUaGVzZSB3aWxsIGJlIHVzZWQgdG8gY2hlY2sgd2hldGhlciB0aGUgbWFuaWZlc3QgZmlsZSBpcyBvdXQgb2YgZGF0ZS4gU2VlXG4gICAqIGByZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KClgLlxuICAgKlxuICAgKiBAcGFyYW0gYmFzZVBhdGggVGhlIHBhdGggd2hlcmUgdGhlIG1hbmlmZXN0IGZpbGUgaXMgdG8gYmUgd3JpdHRlbi5cbiAgICogQHBhcmFtIGVudHJ5UG9pbnRzIEEgY29sbGVjdGlvbiBvZiBlbnRyeS1wb2ludHMgdG8gcmVjb3JkIGluIHRoZSBtYW5pZmVzdC5cbiAgICovXG4gIHdyaXRlRW50cnlQb2ludE1hbmlmZXN0KGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZW50cnlQb2ludHM6IEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzW10pOlxuICAgICAgdm9pZCB7XG4gICAgaWYgKHRoaXMuZnMuYmFzZW5hbWUoYmFzZVBhdGgpICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxvY2tGaWxlSGFzaCA9IHRoaXMuY29tcHV0ZUxvY2tGaWxlSGFzaChiYXNlUGF0aCk7XG4gICAgaWYgKGxvY2tGaWxlSGFzaCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBtYW5pZmVzdDogRW50cnlQb2ludE1hbmlmZXN0RmlsZSA9IHtcbiAgICAgIG5nY2NWZXJzaW9uOiBOR0NDX1ZFUlNJT04sXG4gICAgICBjb25maWdGaWxlSGFzaDogdGhpcy5jb25maWcuaGFzaCxcbiAgICAgIGxvY2tGaWxlSGFzaDogbG9ja0ZpbGVIYXNoLFxuICAgICAgZW50cnlQb2ludFBhdGhzOiBlbnRyeVBvaW50cy5tYXAoZSA9PiB7XG4gICAgICAgIGNvbnN0IGVudHJ5UG9pbnRQYXRoczogRW50cnlQb2ludFBhdGhzID0gW1xuICAgICAgICAgIHRoaXMuZnMucmVsYXRpdmUoYmFzZVBhdGgsIGUuZW50cnlQb2ludC5wYWNrYWdlKSxcbiAgICAgICAgICB0aGlzLmZzLnJlbGF0aXZlKGJhc2VQYXRoLCBlLmVudHJ5UG9pbnQucGF0aCksXG4gICAgICAgIF07XG4gICAgICAgIC8vIE9ubHkgYWRkIGRlcEluZm8gYXJyYXlzIGlmIG5lZWRlZC5cbiAgICAgICAgaWYgKGUuZGVwSW5mby5kZXBlbmRlbmNpZXMuc2l6ZSA+IDApIHtcbiAgICAgICAgICBlbnRyeVBvaW50UGF0aHNbMl0gPSBBcnJheS5mcm9tKGUuZGVwSW5mby5kZXBlbmRlbmNpZXMpO1xuICAgICAgICB9IGVsc2UgaWYgKGUuZGVwSW5mby5taXNzaW5nLnNpemUgPiAwIHx8IGUuZGVwSW5mby5kZWVwSW1wb3J0cy5zaXplID4gMCkge1xuICAgICAgICAgIGVudHJ5UG9pbnRQYXRoc1syXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlLmRlcEluZm8ubWlzc2luZy5zaXplID4gMCkge1xuICAgICAgICAgIGVudHJ5UG9pbnRQYXRoc1szXSA9IEFycmF5LmZyb20oZS5kZXBJbmZvLm1pc3NpbmcpO1xuICAgICAgICB9IGVsc2UgaWYgKGUuZGVwSW5mby5kZWVwSW1wb3J0cy5zaXplID4gMCkge1xuICAgICAgICAgIGVudHJ5UG9pbnRQYXRoc1szXSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlLmRlcEluZm8uZGVlcEltcG9ydHMuc2l6ZSA+IDApIHtcbiAgICAgICAgICBlbnRyeVBvaW50UGF0aHNbNF0gPSBBcnJheS5mcm9tKGUuZGVwSW5mby5kZWVwSW1wb3J0cyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVudHJ5UG9pbnRQYXRocztcbiAgICAgIH0pLFxuICAgIH07XG4gICAgdGhpcy5mcy53cml0ZUZpbGUodGhpcy5nZXRFbnRyeVBvaW50TWFuaWZlc3RQYXRoKGJhc2VQYXRoKSwgSlNPTi5zdHJpbmdpZnkobWFuaWZlc3QpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RW50cnlQb2ludE1hbmlmZXN0UGF0aChiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5mcy5yZXNvbHZlKGJhc2VQYXRoLCAnX19uZ2NjX2VudHJ5X3BvaW50c19fLmpzb24nKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUxvY2tGaWxlSGFzaChiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgZGlyZWN0b3J5ID0gdGhpcy5mcy5kaXJuYW1lKGJhc2VQYXRoKTtcbiAgICBmb3IgKGNvbnN0IGxvY2tGaWxlTmFtZSBvZiBbJ3lhcm4ubG9jaycsICdwYWNrYWdlLWxvY2suanNvbiddKSB7XG4gICAgICBjb25zdCBsb2NrRmlsZVBhdGggPSB0aGlzLmZzLnJlc29sdmUoZGlyZWN0b3J5LCBsb2NrRmlsZU5hbWUpO1xuICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKGxvY2tGaWxlUGF0aCkpIHtcbiAgICAgICAgY29uc3QgbG9ja0ZpbGVDb250ZW50cyA9IHRoaXMuZnMucmVhZEZpbGUobG9ja0ZpbGVQYXRoKTtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZShsb2NrRmlsZUNvbnRlbnRzKS5kaWdlc3QoJ2hleCcpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgaW1wbGVtZW50YXRpb24gb2YgdGhlIGBFbnRyeVBvaW50TWFuaWZlc3RgIHRoYXQgY2FuIGJlIHVzZWQgdG8gaW52YWxpZGF0ZSB0aGVcbiAqIGN1cnJlbnQgbWFuaWZlc3QgZmlsZS5cbiAqXG4gKiBJdCBhbHdheXMgcmV0dXJucyBgbnVsbGAgZnJvbSB0aGUgYHJlYWRFbnRyeVBvaW50c1VzaW5nTWFuaWZlc3QoKWAgbWV0aG9kLCB3aGljaCBmb3JjZXMgYSBuZXdcbiAqIG1hbmlmZXN0IHRvIGJlIGNyZWF0ZWQsIHdoaWNoIHdpbGwgb3ZlcndyaXRlIHRoZSBjdXJyZW50IGZpbGUgd2hlbiBgd3JpdGVFbnRyeVBvaW50TWFuaWZlc3QoKWBcbiAqIGlzIGNhbGxlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEludmFsaWRhdGluZ0VudHJ5UG9pbnRNYW5pZmVzdCBleHRlbmRzIEVudHJ5UG9pbnRNYW5pZmVzdCB7XG4gIHJlYWRFbnRyeVBvaW50c1VzaW5nTWFuaWZlc3QoX2Jhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzW118bnVsbCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgRW50cnlQb2ludFBhdGhzID0gW1xuICBzdHJpbmcsXG4gIHN0cmluZyxcbiAgQXJyYXk8QWJzb2x1dGVGc1BhdGg+PyxcbiAgQXJyYXk8QWJzb2x1dGVGc1BhdGh8UGF0aFNlZ21lbnQ+PyxcbiAgQXJyYXk8QWJzb2x1dGVGc1BhdGg+Pyxcbl07XG5cbi8qKlxuICogVGhlIEpTT04gZm9ybWF0IG9mIHRoZSBtYW5pZmVzdCBmaWxlIHRoYXQgaXMgd3JpdHRlbiB0byBkaXNrLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnRNYW5pZmVzdEZpbGUge1xuICBuZ2NjVmVyc2lvbjogc3RyaW5nO1xuICBjb25maWdGaWxlSGFzaDogc3RyaW5nO1xuICBsb2NrRmlsZUhhc2g6IHN0cmluZztcbiAgZW50cnlQb2ludFBhdGhzOiBFbnRyeVBvaW50UGF0aHNbXTtcbn1cbiJdfQ==