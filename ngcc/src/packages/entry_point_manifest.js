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
                        var _c = tslib_1.__read(entryPointPaths_1_1.value, 2), packagePath = _c[0], entryPointPath = _c[1];
                        var result = entry_point_1.getEntryPointInfo(this.fs, this.config, this.logger, packagePath, entryPointPath);
                        if (result === entry_point_1.NO_ENTRY_POINT || result === entry_point_1.INVALID_ENTRY_POINT) {
                            throw new Error("The entry-point manifest at " + manifestPath + " contained an invalid pair of package paths: [" + packagePath + ", " + entryPointPath + "]");
                        }
                        else {
                            entryPoints.push(result);
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
                entryPointPaths: entryPoints.map(function (entryPoint) { return [entryPoint.package, entryPoint.path]; }),
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
     * manifest to be created, which will overwrite the current file when `writeEntryPointManifest()` is
     * called.
     */
    var InvalidatingEntryPointManifest = /** @class */ (function (_super) {
        tslib_1.__extends(InvalidatingEntryPointManifest, _super);
        function InvalidatingEntryPointManifest() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        InvalidatingEntryPointManifest.prototype.readEntryPointsUsingManifest = function (basePath) { return null; };
        return InvalidatingEntryPointManifest;
    }(EntryPointManifest));
    exports.InvalidatingEntryPointManifest = InvalidatingEntryPointManifest;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfbWFuaWZlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnRfbWFuaWZlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaUNBQWtDO0lBS2xDLHFGQUE0QztJQUU1QyxtRkFBaUc7SUFFakc7Ozs7OztPQU1HO0lBQ0g7UUFDRSw0QkFBb0IsRUFBYyxFQUFVLE1BQXlCLEVBQVUsTUFBYztZQUF6RSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQUcsQ0FBQztRQUVqRzs7Ozs7Ozs7Ozs7Ozs7O1dBZUc7UUFDSCx5REFBNEIsR0FBNUIsVUFBNkIsUUFBd0I7O1lBQ25ELElBQUk7Z0JBQ0YsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxjQUFjLEVBQUU7b0JBQ2pELE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUVELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO29CQUNqQyxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFFRCxJQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxvQkFBb0IsS0FBSyxJQUFJLEVBQUU7b0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUVLLElBQUEsK0NBQ2tFLEVBRGpFLDRCQUFXLEVBQUUsa0NBQWMsRUFBRSw4QkFBWSxFQUFFLG9DQUNzQixDQUFDO2dC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d0I7O1lBQ2xELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDOztnQkFDNUMsS0FBMkIsSUFBQSxLQUFBLGlCQUFBLENBQUMsV0FBVyxFQUFFLG1CQUFtQixDQUFDLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTFELElBQU0sWUFBWSxXQUFBO29CQUNyQixJQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7b0JBQzlELElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7d0JBQ2hDLElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7d0JBQ3hELE9BQU8sbUJBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7cUJBQ2pFO2lCQUNGOzs7Ozs7Ozs7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFDSCx5QkFBQztJQUFELENBQUMsQUE5R0QsSUE4R0M7SUE5R1ksZ0RBQWtCO0lBZ0gvQjs7Ozs7OztPQU9HO0lBQ0g7UUFBb0QsMERBQWtCO1FBQXRFOztRQUVBLENBQUM7UUFEQyxxRUFBNEIsR0FBNUIsVUFBNkIsUUFBd0IsSUFBdUIsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzVGLHFDQUFDO0lBQUQsQ0FBQyxBQUZELENBQW9ELGtCQUFrQixHQUVyRTtJQUZZLHdFQUE4QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Y3JlYXRlSGFzaH0gZnJvbSAnY3J5cHRvJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5cbmltcG9ydCB7TkdDQ19WRVJTSU9OfSBmcm9tICcuL2J1aWxkX21hcmtlcic7XG5pbXBvcnQge05nY2NDb25maWd1cmF0aW9ufSBmcm9tICcuL2NvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHtFbnRyeVBvaW50LCBJTlZBTElEX0VOVFJZX1BPSU5ULCBOT19FTlRSWV9QT0lOVCwgZ2V0RW50cnlQb2ludEluZm99IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG4vKipcbiAqIE1hbmFnZXMgcmVhZGluZyBhbmQgd3JpdGluZyBhIG1hbmlmZXN0IGZpbGUgdGhhdCBjb250YWlucyBhIGxpc3Qgb2YgYWxsIHRoZSBlbnRyeS1wb2ludHMgdGhhdFxuICogd2VyZSBmb3VuZCBiZWxvdyBhIGdpdmVuIGJhc2VQYXRoLlxuICpcbiAqIFRoaXMgaXMgYSBzdXBlci1zZXQgb2YgdGhlIGVudHJ5LXBvaW50cyB0aGF0IGFyZSBhY3R1YWxseSBwcm9jZXNzZWQgZm9yIGEgZ2l2ZW4gcnVuIG9mIG5nY2MsXG4gKiBzaW5jZSBzb21lIG1heSBhbHJlYWR5IGJlIHByb2Nlc3NlZCwgb3IgZXhjbHVkZWQgaWYgdGhleSBkbyBub3QgaGF2ZSB0aGUgcmVxdWlyZWQgZm9ybWF0LlxuICovXG5leHBvcnQgY2xhc3MgRW50cnlQb2ludE1hbmlmZXN0IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyKSB7fVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gZ2V0IHRoZSBlbnRyeS1wb2ludCBpbmZvIGZyb20gYSBtYW5pZmVzdCBmaWxlIGZvciB0aGUgZ2l2ZW4gYGJhc2VQYXRoYCBpZiBpdCBleGlzdHMgYW5kXG4gICAqIGlzIG5vdCBvdXQgb2YgZGF0ZS5cbiAgICpcbiAgICogUmVhc29ucyBmb3IgdGhlIG1hbmlmZXN0IHRvIGJlIG91dCBvZiBkYXRlIGFyZTpcbiAgICpcbiAgICogKiB0aGUgZmlsZSBkb2VzIG5vdCBleGlzdFxuICAgKiAqIHRoZSBuZ2NjIHZlcnNpb24gaGFzIGNoYW5nZWRcbiAgICogKiB0aGUgcGFja2FnZSBsb2NrLWZpbGUgKGkuZS4geWFybi5sb2NrIG9yIHBhY2thZ2UtbG9jay5qc29uKSBoYXMgY2hhbmdlZFxuICAgKiAqIHRoZSBwcm9qZWN0IGNvbmZpZ3VyYXRpb24gaGFzIGNoYW5nZWRcbiAgICogKiBvbmUgb3IgbW9yZSBlbnRyeS1wb2ludHMgaW4gdGhlIG1hbmlmZXN0IGFyZSBub3QgdmFsaWRcbiAgICpcbiAgICogQHBhcmFtIGJhc2VQYXRoIFRoZSBwYXRoIHRoYXQgd291bGQgY29udGFpbiB0aGUgZW50cnktcG9pbnRzIGFuZCB0aGUgbWFuaWZlc3QgZmlsZS5cbiAgICogQHJldHVybnMgYW4gYXJyYXkgb2YgZW50cnktcG9pbnQgaW5mb3JtYXRpb24gZm9yIGFsbCBlbnRyeS1wb2ludHMgZm91bmQgYmVsb3cgdGhlIGdpdmVuXG4gICAqIGBiYXNlUGF0aGAgb3IgYG51bGxgIGlmIHRoZSBtYW5pZmVzdCB3YXMgb3V0IG9mIGRhdGUuXG4gICAqL1xuICByZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEVudHJ5UG9pbnRbXXxudWxsIHtcbiAgICB0cnkge1xuICAgICAgaWYgKHRoaXMuZnMuYmFzZW5hbWUoYmFzZVBhdGgpICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWFuaWZlc3RQYXRoID0gdGhpcy5nZXRFbnRyeVBvaW50TWFuaWZlc3RQYXRoKGJhc2VQYXRoKTtcbiAgICAgIGlmICghdGhpcy5mcy5leGlzdHMobWFuaWZlc3RQYXRoKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29tcHV0ZWRMb2NrRmlsZUhhc2ggPSB0aGlzLmNvbXB1dGVMb2NrRmlsZUhhc2goYmFzZVBhdGgpO1xuICAgICAgaWYgKGNvbXB1dGVkTG9ja0ZpbGVIYXNoID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7bmdjY1ZlcnNpb24sIGNvbmZpZ0ZpbGVIYXNoLCBsb2NrRmlsZUhhc2gsIGVudHJ5UG9pbnRQYXRoc30gPVxuICAgICAgICAgIEpTT04ucGFyc2UodGhpcy5mcy5yZWFkRmlsZShtYW5pZmVzdFBhdGgpKSBhcyBFbnRyeVBvaW50TWFuaWZlc3RGaWxlO1xuICAgICAgaWYgKG5nY2NWZXJzaW9uICE9PSBOR0NDX1ZFUlNJT04gfHwgY29uZmlnRmlsZUhhc2ggIT09IHRoaXMuY29uZmlnLmhhc2ggfHxcbiAgICAgICAgICBsb2NrRmlsZUhhc2ggIT09IGNvbXB1dGVkTG9ja0ZpbGVIYXNoKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgICBgRW50cnktcG9pbnQgbWFuaWZlc3QgZm91bmQgZm9yICR7YmFzZVBhdGh9IHNvIGxvYWRpbmcgZW50cnktcG9pbnQgaW5mb3JtYXRpb24gZGlyZWN0bHkuYCk7XG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgICBjb25zdCBlbnRyeVBvaW50czogRW50cnlQb2ludFtdID0gW107XG4gICAgICBmb3IgKGNvbnN0IFtwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGhdIG9mIGVudHJ5UG9pbnRQYXRocykge1xuICAgICAgICBjb25zdCByZXN1bHQgPVxuICAgICAgICAgICAgZ2V0RW50cnlQb2ludEluZm8odGhpcy5mcywgdGhpcy5jb25maWcsIHRoaXMubG9nZ2VyLCBwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSBOT19FTlRSWV9QT0lOVCB8fCByZXN1bHQgPT09IElOVkFMSURfRU5UUllfUE9JTlQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIGBUaGUgZW50cnktcG9pbnQgbWFuaWZlc3QgYXQgJHttYW5pZmVzdFBhdGh9IGNvbnRhaW5lZCBhbiBpbnZhbGlkIHBhaXIgb2YgcGFja2FnZSBwYXRoczogWyR7cGFja2FnZVBhdGh9LCAke2VudHJ5UG9pbnRQYXRofV1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbnRyeVBvaW50cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDApIC8gMTA7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUmVhZGluZyBlbnRyeS1wb2ludHMgdXNpbmcgdGhlIG1hbmlmZXN0IGVudHJpZXMgdG9vayAke2R1cmF0aW9ufXMuYCk7XG4gICAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICBgVW5hYmxlIHRvIHJlYWQgdGhlIGVudHJ5LXBvaW50IG1hbmlmZXN0IGZvciAke2Jhc2VQYXRofTpcXG5gLCBlLnN0YWNrIHx8IGUudG9TdHJpbmcoKSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogV3JpdGUgYSBtYW5pZmVzdCBmaWxlIGF0IHRoZSBnaXZlbiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBUaGUgbWFuaWZlc3QgaW5jbHVkZXMgdGhlIGN1cnJlbnQgbmdjYyB2ZXJzaW9uIGFuZCBoYXNoZXMgb2YgdGhlIHBhY2thZ2UgbG9jay1maWxlIGFuZCBjdXJyZW50XG4gICAqIHByb2plY3QgY29uZmlnLiBUaGVzZSB3aWxsIGJlIHVzZWQgdG8gY2hlY2sgd2hldGhlciB0aGUgbWFuaWZlc3QgZmlsZSBpcyBvdXQgb2YgZGF0ZS4gU2VlXG4gICAqIGByZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KClgLlxuICAgKlxuICAgKiBAcGFyYW0gYmFzZVBhdGggVGhlIHBhdGggd2hlcmUgdGhlIG1hbmlmZXN0IGZpbGUgaXMgdG8gYmUgd3JpdHRlbi5cbiAgICogQHBhcmFtIGVudHJ5UG9pbnRzIEEgY29sbGVjdGlvbiBvZiBlbnRyeS1wb2ludHMgdG8gcmVjb3JkIGluIHRoZSBtYW5pZmVzdC5cbiAgICovXG4gIHdyaXRlRW50cnlQb2ludE1hbmlmZXN0KGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZW50cnlQb2ludHM6IEVudHJ5UG9pbnRbXSk6IHZvaWQge1xuICAgIGlmICh0aGlzLmZzLmJhc2VuYW1lKGJhc2VQYXRoKSAhPT0gJ25vZGVfbW9kdWxlcycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBsb2NrRmlsZUhhc2ggPSB0aGlzLmNvbXB1dGVMb2NrRmlsZUhhc2goYmFzZVBhdGgpO1xuICAgIGlmIChsb2NrRmlsZUhhc2ggPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbWFuaWZlc3Q6IEVudHJ5UG9pbnRNYW5pZmVzdEZpbGUgPSB7XG4gICAgICBuZ2NjVmVyc2lvbjogTkdDQ19WRVJTSU9OLFxuICAgICAgY29uZmlnRmlsZUhhc2g6IHRoaXMuY29uZmlnLmhhc2gsXG4gICAgICBsb2NrRmlsZUhhc2g6IGxvY2tGaWxlSGFzaCxcbiAgICAgIGVudHJ5UG9pbnRQYXRoczogZW50cnlQb2ludHMubWFwKGVudHJ5UG9pbnQgPT4gW2VudHJ5UG9pbnQucGFja2FnZSwgZW50cnlQb2ludC5wYXRoXSksXG4gICAgfTtcbiAgICB0aGlzLmZzLndyaXRlRmlsZSh0aGlzLmdldEVudHJ5UG9pbnRNYW5pZmVzdFBhdGgoYmFzZVBhdGgpLCBKU09OLnN0cmluZ2lmeShtYW5pZmVzdCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRFbnRyeVBvaW50TWFuaWZlc3RQYXRoKGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHJldHVybiB0aGlzLmZzLnJlc29sdmUoYmFzZVBhdGgsICdfX25nY2NfZW50cnlfcG9pbnRzX18uanNvbicpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlTG9ja0ZpbGVIYXNoKGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCBkaXJlY3RvcnkgPSB0aGlzLmZzLmRpcm5hbWUoYmFzZVBhdGgpO1xuICAgIGZvciAoY29uc3QgbG9ja0ZpbGVOYW1lIG9mIFsneWFybi5sb2NrJywgJ3BhY2thZ2UtbG9jay5qc29uJ10pIHtcbiAgICAgIGNvbnN0IGxvY2tGaWxlUGF0aCA9IHRoaXMuZnMucmVzb2x2ZShkaXJlY3RvcnksIGxvY2tGaWxlTmFtZSk7XG4gICAgICBpZiAodGhpcy5mcy5leGlzdHMobG9ja0ZpbGVQYXRoKSkge1xuICAgICAgICBjb25zdCBsb2NrRmlsZUNvbnRlbnRzID0gdGhpcy5mcy5yZWFkRmlsZShsb2NrRmlsZVBhdGgpO1xuICAgICAgICByZXR1cm4gY3JlYXRlSGFzaCgnbWQ1JykudXBkYXRlKGxvY2tGaWxlQ29udGVudHMpLmRpZ2VzdCgnaGV4Jyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQSBzcGVjaWFsaXplZCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgYEVudHJ5UG9pbnRNYW5pZmVzdGAgdGhhdCBjYW4gYmUgdXNlZCB0byBpbnZhbGlkYXRlIHRoZVxuICogY3VycmVudCBtYW5pZmVzdCBmaWxlLlxuICpcbiAqIEl0IGFsd2F5cyByZXR1cm5zIGBudWxsYCBmcm9tIHRoZSBgcmVhZEVudHJ5UG9pbnRzVXNpbmdNYW5pZmVzdCgpYCBtZXRob2QsIHdoaWNoIGZvcmNlcyBhIG5ld1xuICogbWFuaWZlc3QgdG8gYmUgY3JlYXRlZCwgd2hpY2ggd2lsbCBvdmVyd3JpdGUgdGhlIGN1cnJlbnQgZmlsZSB3aGVuIGB3cml0ZUVudHJ5UG9pbnRNYW5pZmVzdCgpYCBpc1xuICogY2FsbGVkLlxuICovXG5leHBvcnQgY2xhc3MgSW52YWxpZGF0aW5nRW50cnlQb2ludE1hbmlmZXN0IGV4dGVuZHMgRW50cnlQb2ludE1hbmlmZXN0IHtcbiAgcmVhZEVudHJ5UG9pbnRzVXNpbmdNYW5pZmVzdChiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50W118bnVsbCB7IHJldHVybiBudWxsOyB9XG59XG5cbi8qKlxuICogVGhlIEpTT04gZm9ybWF0IG9mIHRoZSBtYW5pZmVzdCBmaWxlIHRoYXQgaXMgd3JpdHRlbiB0byBkaXNrLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVudHJ5UG9pbnRNYW5pZmVzdEZpbGUge1xuICBuZ2NjVmVyc2lvbjogc3RyaW5nO1xuICBjb25maWdGaWxlSGFzaDogc3RyaW5nO1xuICBsb2NrRmlsZUhhc2g6IHN0cmluZztcbiAgZW50cnlQb2ludFBhdGhzOiBBcnJheTxbQWJzb2x1dGVGc1BhdGgsIEFic29sdXRlRnNQYXRoXT47XG59XG4iXX0=