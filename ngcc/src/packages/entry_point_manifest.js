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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfbWFuaWZlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnRfbWFuaWZlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaUNBQWtDO0lBTWxDLHFGQUE0QztJQUU1QyxtRkFBMEY7SUFHMUY7Ozs7OztPQU1HO0lBQ0g7UUFDRSw0QkFBb0IsRUFBYyxFQUFVLE1BQXlCLEVBQVUsTUFBYztZQUF6RSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQUcsQ0FBQztRQUVqRzs7Ozs7Ozs7Ozs7Ozs7O1dBZUc7UUFDSCx5REFBNEIsR0FBNUIsVUFBNkIsUUFBd0I7O1lBQ25ELElBQUk7Z0JBQ0YsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxjQUFjLEVBQUU7b0JBQ2pELE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUVELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO29CQUNqQyxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFFRCxJQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxvQkFBb0IsS0FBSyxJQUFJLEVBQUU7b0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUVLLElBQUEsK0NBQ2tFLEVBRGpFLDRCQUFXLEVBQUUsa0NBQWMsRUFBRSw4QkFBWSxFQUFFLG9DQUNzQixDQUFDO2dC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REFBa0I7SUFnSi9COzs7Ozs7O09BT0c7SUFDSDtRQUFvRCwwREFBa0I7UUFBdEU7O1FBSUEsQ0FBQztRQUhDLHFFQUE0QixHQUE1QixVQUE2QixTQUF5QjtZQUNwRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCxxQ0FBQztJQUFELENBQUMsQUFKRCxDQUFvRCxrQkFBa0IsR0FJckU7SUFKWSx3RUFBOEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NyZWF0ZUhhc2h9IGZyb20gJ2NyeXB0byc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIFBhdGhTZWdtZW50fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc30gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfaG9zdCc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuXG5pbXBvcnQge05HQ0NfVkVSU0lPTn0gZnJvbSAnLi9idWlsZF9tYXJrZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7SU5DT01QQVRJQkxFX0VOVFJZX1BPSU5ULCBOT19FTlRSWV9QT0lOVCwgZ2V0RW50cnlQb2ludEluZm99IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG5cbi8qKlxuICogTWFuYWdlcyByZWFkaW5nIGFuZCB3cml0aW5nIGEgbWFuaWZlc3QgZmlsZSB0aGF0IGNvbnRhaW5zIGEgbGlzdCBvZiBhbGwgdGhlIGVudHJ5LXBvaW50cyB0aGF0XG4gKiB3ZXJlIGZvdW5kIGJlbG93IGEgZ2l2ZW4gYmFzZVBhdGguXG4gKlxuICogVGhpcyBpcyBhIHN1cGVyLXNldCBvZiB0aGUgZW50cnktcG9pbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHByb2Nlc3NlZCBmb3IgYSBnaXZlbiBydW4gb2YgbmdjYyxcbiAqIHNpbmNlIHNvbWUgbWF5IGFscmVhZHkgYmUgcHJvY2Vzc2VkLCBvciBleGNsdWRlZCBpZiB0aGV5IGRvIG5vdCBoYXZlIHRoZSByZXF1aXJlZCBmb3JtYXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbnRyeVBvaW50TWFuaWZlc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIpIHt9XG5cbiAgLyoqXG4gICAqIFRyeSB0byBnZXQgdGhlIGVudHJ5LXBvaW50IGluZm8gZnJvbSBhIG1hbmlmZXN0IGZpbGUgZm9yIHRoZSBnaXZlbiBgYmFzZVBhdGhgIGlmIGl0IGV4aXN0cyBhbmRcbiAgICogaXMgbm90IG91dCBvZiBkYXRlLlxuICAgKlxuICAgKiBSZWFzb25zIGZvciB0aGUgbWFuaWZlc3QgdG8gYmUgb3V0IG9mIGRhdGUgYXJlOlxuICAgKlxuICAgKiAqIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0XG4gICAqICogdGhlIG5nY2MgdmVyc2lvbiBoYXMgY2hhbmdlZFxuICAgKiAqIHRoZSBwYWNrYWdlIGxvY2stZmlsZSAoaS5lLiB5YXJuLmxvY2sgb3IgcGFja2FnZS1sb2NrLmpzb24pIGhhcyBjaGFuZ2VkXG4gICAqICogdGhlIHByb2plY3QgY29uZmlndXJhdGlvbiBoYXMgY2hhbmdlZFxuICAgKiAqIG9uZSBvciBtb3JlIGVudHJ5LXBvaW50cyBpbiB0aGUgbWFuaWZlc3QgYXJlIG5vdCB2YWxpZFxuICAgKlxuICAgKiBAcGFyYW0gYmFzZVBhdGggVGhlIHBhdGggdGhhdCB3b3VsZCBjb250YWluIHRoZSBlbnRyeS1wb2ludHMgYW5kIHRoZSBtYW5pZmVzdCBmaWxlLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBlbnRyeS1wb2ludCBpbmZvcm1hdGlvbiBmb3IgYWxsIGVudHJ5LXBvaW50cyBmb3VuZCBiZWxvdyB0aGUgZ2l2ZW5cbiAgICogYGJhc2VQYXRoYCBvciBgbnVsbGAgaWYgdGhlIG1hbmlmZXN0IHdhcyBvdXQgb2YgZGF0ZS5cbiAgICovXG4gIHJlYWRFbnRyeVBvaW50c1VzaW5nTWFuaWZlc3QoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXNbXXxudWxsIHtcbiAgICB0cnkge1xuICAgICAgaWYgKHRoaXMuZnMuYmFzZW5hbWUoYmFzZVBhdGgpICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWFuaWZlc3RQYXRoID0gdGhpcy5nZXRFbnRyeVBvaW50TWFuaWZlc3RQYXRoKGJhc2VQYXRoKTtcbiAgICAgIGlmICghdGhpcy5mcy5leGlzdHMobWFuaWZlc3RQYXRoKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29tcHV0ZWRMb2NrRmlsZUhhc2ggPSB0aGlzLmNvbXB1dGVMb2NrRmlsZUhhc2goYmFzZVBhdGgpO1xuICAgICAgaWYgKGNvbXB1dGVkTG9ja0ZpbGVIYXNoID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7bmdjY1ZlcnNpb24sIGNvbmZpZ0ZpbGVIYXNoLCBsb2NrRmlsZUhhc2gsIGVudHJ5UG9pbnRQYXRoc30gPVxuICAgICAgICAgIEpTT04ucGFyc2UodGhpcy5mcy5yZWFkRmlsZShtYW5pZmVzdFBhdGgpKSBhcyBFbnRyeVBvaW50TWFuaWZlc3RGaWxlO1xuICAgICAgaWYgKG5nY2NWZXJzaW9uICE9PSBOR0NDX1ZFUlNJT04gfHwgY29uZmlnRmlsZUhhc2ggIT09IHRoaXMuY29uZmlnLmhhc2ggfHxcbiAgICAgICAgICBsb2NrRmlsZUhhc2ggIT09IGNvbXB1dGVkTG9ja0ZpbGVIYXNoKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgRW50cnktcG9pbnQgbWFuaWZlc3QgZm91bmQgZm9yICR7XG4gICAgICAgICAgYmFzZVBhdGh9IHNvIGxvYWRpbmcgZW50cnktcG9pbnQgaW5mb3JtYXRpb24gZGlyZWN0bHkuYCk7XG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgICBjb25zdCBlbnRyeVBvaW50czogRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXNbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdFxuICAgICAgICAgICAgICAgW3BhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCwgZGVwZW5kZW5jeVBhdGhzID0gW10sIG1pc3NpbmdQYXRocyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVlcEltcG9ydFBhdGhzID0gW11dIG9mIGVudHJ5UG9pbnRQYXRocykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBnZXRFbnRyeVBvaW50SW5mbyhcbiAgICAgICAgICAgIHRoaXMuZnMsIHRoaXMuY29uZmlnLCB0aGlzLmxvZ2dlciwgdGhpcy5mcy5yZXNvbHZlKGJhc2VQYXRoLCBwYWNrYWdlUGF0aCksXG4gICAgICAgICAgICB0aGlzLmZzLnJlc29sdmUoYmFzZVBhdGgsIGVudHJ5UG9pbnRQYXRoKSk7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IE5PX0VOVFJZX1BPSU5UIHx8IHJlc3VsdCA9PT0gSU5DT01QQVRJQkxFX0VOVFJZX1BPSU5UKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZW50cnktcG9pbnQgbWFuaWZlc3QgYXQgJHtcbiAgICAgICAgICAgICAgbWFuaWZlc3RQYXRofSBjb250YWluZWQgYW4gaW52YWxpZCBwYWlyIG9mIHBhY2thZ2UgcGF0aHM6IFske3BhY2thZ2VQYXRofSwgJHtcbiAgICAgICAgICAgICAgZW50cnlQb2ludFBhdGh9XWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudHJ5UG9pbnRzLnB1c2goe1xuICAgICAgICAgICAgZW50cnlQb2ludDogcmVzdWx0LFxuICAgICAgICAgICAgZGVwSW5mbzoge1xuICAgICAgICAgICAgICBkZXBlbmRlbmNpZXM6IG5ldyBTZXQoZGVwZW5kZW5jeVBhdGhzKSxcbiAgICAgICAgICAgICAgbWlzc2luZzogbmV3IFNldChtaXNzaW5nUGF0aHMpLFxuICAgICAgICAgICAgICBkZWVwSW1wb3J0czogbmV3IFNldChkZWVwSW1wb3J0UGF0aHMpLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwKSAvIDEwO1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoYFJlYWRpbmcgZW50cnktcG9pbnRzIHVzaW5nIHRoZSBtYW5pZmVzdCBlbnRyaWVzIHRvb2sgJHtkdXJhdGlvbn1zLmApO1xuICAgICAgcmV0dXJuIGVudHJ5UG9pbnRzO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgYFVuYWJsZSB0byByZWFkIHRoZSBlbnRyeS1wb2ludCBtYW5pZmVzdCBmb3IgJHtiYXNlUGF0aH06XFxuYCwgZS5zdGFjayB8fCBlLnRvU3RyaW5nKCkpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlIGEgbWFuaWZlc3QgZmlsZSBhdCB0aGUgZ2l2ZW4gYGJhc2VQYXRoYC5cbiAgICpcbiAgICogVGhlIG1hbmlmZXN0IGluY2x1ZGVzIHRoZSBjdXJyZW50IG5nY2MgdmVyc2lvbiBhbmQgaGFzaGVzIG9mIHRoZSBwYWNrYWdlIGxvY2stZmlsZSBhbmQgY3VycmVudFxuICAgKiBwcm9qZWN0IGNvbmZpZy4gVGhlc2Ugd2lsbCBiZSB1c2VkIHRvIGNoZWNrIHdoZXRoZXIgdGhlIG1hbmlmZXN0IGZpbGUgaXMgb3V0IG9mIGRhdGUuIFNlZVxuICAgKiBgcmVhZEVudHJ5UG9pbnRzVXNpbmdNYW5pZmVzdCgpYC5cbiAgICpcbiAgICogQHBhcmFtIGJhc2VQYXRoIFRoZSBwYXRoIHdoZXJlIHRoZSBtYW5pZmVzdCBmaWxlIGlzIHRvIGJlIHdyaXR0ZW4uXG4gICAqIEBwYXJhbSBlbnRyeVBvaW50cyBBIGNvbGxlY3Rpb24gb2YgZW50cnktcG9pbnRzIHRvIHJlY29yZCBpbiB0aGUgbWFuaWZlc3QuXG4gICAqL1xuICB3cml0ZUVudHJ5UG9pbnRNYW5pZmVzdChiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdKTpcbiAgICAgIHZvaWQge1xuICAgIGlmICh0aGlzLmZzLmJhc2VuYW1lKGJhc2VQYXRoKSAhPT0gJ25vZGVfbW9kdWxlcycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBsb2NrRmlsZUhhc2ggPSB0aGlzLmNvbXB1dGVMb2NrRmlsZUhhc2goYmFzZVBhdGgpO1xuICAgIGlmIChsb2NrRmlsZUhhc2ggPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbWFuaWZlc3Q6IEVudHJ5UG9pbnRNYW5pZmVzdEZpbGUgPSB7XG4gICAgICBuZ2NjVmVyc2lvbjogTkdDQ19WRVJTSU9OLFxuICAgICAgY29uZmlnRmlsZUhhc2g6IHRoaXMuY29uZmlnLmhhc2gsXG4gICAgICBsb2NrRmlsZUhhc2g6IGxvY2tGaWxlSGFzaCxcbiAgICAgIGVudHJ5UG9pbnRQYXRoczogZW50cnlQb2ludHMubWFwKGUgPT4ge1xuICAgICAgICBjb25zdCBlbnRyeVBvaW50UGF0aHM6IEVudHJ5UG9pbnRQYXRocyA9IFtcbiAgICAgICAgICB0aGlzLmZzLnJlbGF0aXZlKGJhc2VQYXRoLCBlLmVudHJ5UG9pbnQucGFja2FnZSksXG4gICAgICAgICAgdGhpcy5mcy5yZWxhdGl2ZShiYXNlUGF0aCwgZS5lbnRyeVBvaW50LnBhdGgpLFxuICAgICAgICBdO1xuICAgICAgICAvLyBPbmx5IGFkZCBkZXBJbmZvIGFycmF5cyBpZiBuZWVkZWQuXG4gICAgICAgIGlmIChlLmRlcEluZm8uZGVwZW5kZW5jaWVzLnNpemUgPiAwKSB7XG4gICAgICAgICAgZW50cnlQb2ludFBhdGhzWzJdID0gQXJyYXkuZnJvbShlLmRlcEluZm8uZGVwZW5kZW5jaWVzKTtcbiAgICAgICAgfSBlbHNlIGlmIChlLmRlcEluZm8ubWlzc2luZy5zaXplID4gMCB8fCBlLmRlcEluZm8uZGVlcEltcG9ydHMuc2l6ZSA+IDApIHtcbiAgICAgICAgICBlbnRyeVBvaW50UGF0aHNbMl0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZS5kZXBJbmZvLm1pc3Npbmcuc2l6ZSA+IDApIHtcbiAgICAgICAgICBlbnRyeVBvaW50UGF0aHNbM10gPSBBcnJheS5mcm9tKGUuZGVwSW5mby5taXNzaW5nKTtcbiAgICAgICAgfSBlbHNlIGlmIChlLmRlcEluZm8uZGVlcEltcG9ydHMuc2l6ZSA+IDApIHtcbiAgICAgICAgICBlbnRyeVBvaW50UGF0aHNbM10gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZS5kZXBJbmZvLmRlZXBJbXBvcnRzLnNpemUgPiAwKSB7XG4gICAgICAgICAgZW50cnlQb2ludFBhdGhzWzRdID0gQXJyYXkuZnJvbShlLmRlcEluZm8uZGVlcEltcG9ydHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbnRyeVBvaW50UGF0aHM7XG4gICAgICB9KSxcbiAgICB9O1xuICAgIHRoaXMuZnMud3JpdGVGaWxlKHRoaXMuZ2V0RW50cnlQb2ludE1hbmlmZXN0UGF0aChiYXNlUGF0aCksIEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0KSk7XG4gIH1cblxuICBwcml2YXRlIGdldEVudHJ5UG9pbnRNYW5pZmVzdFBhdGgoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gICAgcmV0dXJuIHRoaXMuZnMucmVzb2x2ZShiYXNlUGF0aCwgJ19fbmdjY19lbnRyeV9wb2ludHNfXy5qc29uJyk7XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVMb2NrRmlsZUhhc2goYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IGRpcmVjdG9yeSA9IHRoaXMuZnMuZGlybmFtZShiYXNlUGF0aCk7XG4gICAgZm9yIChjb25zdCBsb2NrRmlsZU5hbWUgb2YgWyd5YXJuLmxvY2snLCAncGFja2FnZS1sb2NrLmpzb24nXSkge1xuICAgICAgY29uc3QgbG9ja0ZpbGVQYXRoID0gdGhpcy5mcy5yZXNvbHZlKGRpcmVjdG9yeSwgbG9ja0ZpbGVOYW1lKTtcbiAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhsb2NrRmlsZVBhdGgpKSB7XG4gICAgICAgIGNvbnN0IGxvY2tGaWxlQ29udGVudHMgPSB0aGlzLmZzLnJlYWRGaWxlKGxvY2tGaWxlUGF0aCk7XG4gICAgICAgIHJldHVybiBjcmVhdGVIYXNoKCdtZDUnKS51cGRhdGUobG9ja0ZpbGVDb250ZW50cykuZGlnZXN0KCdoZXgnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHNwZWNpYWxpemVkIGltcGxlbWVudGF0aW9uIG9mIHRoZSBgRW50cnlQb2ludE1hbmlmZXN0YCB0aGF0IGNhbiBiZSB1c2VkIHRvIGludmFsaWRhdGUgdGhlXG4gKiBjdXJyZW50IG1hbmlmZXN0IGZpbGUuXG4gKlxuICogSXQgYWx3YXlzIHJldHVybnMgYG51bGxgIGZyb20gdGhlIGByZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KClgIG1ldGhvZCwgd2hpY2ggZm9yY2VzIGEgbmV3XG4gKiBtYW5pZmVzdCB0byBiZSBjcmVhdGVkLCB3aGljaCB3aWxsIG92ZXJ3cml0ZSB0aGUgY3VycmVudCBmaWxlIHdoZW4gYHdyaXRlRW50cnlQb2ludE1hbmlmZXN0KClgXG4gKiBpcyBjYWxsZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnZhbGlkYXRpbmdFbnRyeVBvaW50TWFuaWZlc3QgZXh0ZW5kcyBFbnRyeVBvaW50TWFuaWZlc3Qge1xuICByZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KF9iYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdfG51bGwge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIEVudHJ5UG9pbnRQYXRocyA9IFtcbiAgc3RyaW5nLFxuICBzdHJpbmcsXG4gIEFycmF5PEFic29sdXRlRnNQYXRoPj8sXG4gIEFycmF5PEFic29sdXRlRnNQYXRofFBhdGhTZWdtZW50Pj8sXG4gIEFycmF5PEFic29sdXRlRnNQYXRoPj8sXG5dO1xuXG4vKipcbiAqIFRoZSBKU09OIGZvcm1hdCBvZiB0aGUgbWFuaWZlc3QgZmlsZSB0aGF0IGlzIHdyaXR0ZW4gdG8gZGlzay5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50TWFuaWZlc3RGaWxlIHtcbiAgbmdjY1ZlcnNpb246IHN0cmluZztcbiAgY29uZmlnRmlsZUhhc2g6IHN0cmluZztcbiAgbG9ja0ZpbGVIYXNoOiBzdHJpbmc7XG4gIGVudHJ5UG9pbnRQYXRoczogRW50cnlQb2ludFBhdGhzW107XG59XG4iXX0=