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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfbWFuaWZlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnRfbWFuaWZlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsaUNBQWtDO0lBS2xDLHFGQUE0QztJQUU1QyxtRkFBaUc7SUFFakc7Ozs7OztPQU1HO0lBQ0g7UUFDRSw0QkFBb0IsRUFBYyxFQUFVLE1BQXlCLEVBQVUsTUFBYztZQUF6RSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQUcsQ0FBQztRQUVqRzs7Ozs7Ozs7Ozs7Ozs7O1dBZUc7UUFDSCx5REFBNEIsR0FBNUIsVUFBNkIsUUFBd0I7O1lBQ25ELElBQUk7Z0JBQ0YsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxjQUFjLEVBQUU7b0JBQ2pELE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUVELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFO29CQUNqQyxPQUFPLElBQUksQ0FBQztpQkFDYjtnQkFFRCxJQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxvQkFBb0IsS0FBSyxJQUFJLEVBQUU7b0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2lCQUNiO2dCQUVLLElBQUEsK0NBQ2tFLEVBRGpFLDRCQUFXLEVBQUUsa0NBQWMsRUFBRSw4QkFBWSxFQUFFLG9DQUNzQixDQUFDO2dC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QixJQUFBLEtBQUEsaUJBQUEsQ0FBQyxXQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBMUQsSUFBTSxZQUFZLFdBQUE7b0JBQ3JCLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDOUQsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRTt3QkFDaEMsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQzt3QkFDeEQsT0FBTyxtQkFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztxQkFDakU7aUJBQ0Y7Ozs7Ozs7OztZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQTFHRCxJQTBHQztJQTFHWSxnREFBa0I7SUE0Ry9COzs7Ozs7O09BT0c7SUFDSDtRQUFvRCwwREFBa0I7UUFBdEU7O1FBRUEsQ0FBQztRQURDLHFFQUE0QixHQUE1QixVQUE2QixRQUF3QixJQUF1QixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDNUYscUNBQUM7SUFBRCxDQUFDLEFBRkQsQ0FBb0Qsa0JBQWtCLEdBRXJFO0lBRlksd0VBQThCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjcmVhdGVIYXNofSBmcm9tICdjcnlwdG8nO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcblxuaW1wb3J0IHtOR0NDX1ZFUlNJT059IGZyb20gJy4vYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4vY29uZmlndXJhdGlvbic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIElOVkFMSURfRU5UUllfUE9JTlQsIE5PX0VOVFJZX1BPSU5ULCBnZXRFbnRyeVBvaW50SW5mb30gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cbi8qKlxuICogTWFuYWdlcyByZWFkaW5nIGFuZCB3cml0aW5nIGEgbWFuaWZlc3QgZmlsZSB0aGF0IGNvbnRhaW5zIGEgbGlzdCBvZiBhbGwgdGhlIGVudHJ5LXBvaW50cyB0aGF0XG4gKiB3ZXJlIGZvdW5kIGJlbG93IGEgZ2l2ZW4gYmFzZVBhdGguXG4gKlxuICogVGhpcyBpcyBhIHN1cGVyLXNldCBvZiB0aGUgZW50cnktcG9pbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHByb2Nlc3NlZCBmb3IgYSBnaXZlbiBydW4gb2YgbmdjYyxcbiAqIHNpbmNlIHNvbWUgbWF5IGFscmVhZHkgYmUgcHJvY2Vzc2VkLCBvciBleGNsdWRlZCBpZiB0aGV5IGRvIG5vdCBoYXZlIHRoZSByZXF1aXJlZCBmb3JtYXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbnRyeVBvaW50TWFuaWZlc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIpIHt9XG5cbiAgLyoqXG4gICAqIFRyeSB0byBnZXQgdGhlIGVudHJ5LXBvaW50IGluZm8gZnJvbSBhIG1hbmlmZXN0IGZpbGUgZm9yIHRoZSBnaXZlbiBgYmFzZVBhdGhgIGlmIGl0IGV4aXN0cyBhbmRcbiAgICogaXMgbm90IG91dCBvZiBkYXRlLlxuICAgKlxuICAgKiBSZWFzb25zIGZvciB0aGUgbWFuaWZlc3QgdG8gYmUgb3V0IG9mIGRhdGUgYXJlOlxuICAgKlxuICAgKiAqIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0XG4gICAqICogdGhlIG5nY2MgdmVyc2lvbiBoYXMgY2hhbmdlZFxuICAgKiAqIHRoZSBwYWNrYWdlIGxvY2stZmlsZSAoaS5lLiB5YXJuLmxvY2sgb3IgcGFja2FnZS1sb2NrLmpzb24pIGhhcyBjaGFuZ2VkXG4gICAqICogdGhlIHByb2plY3QgY29uZmlndXJhdGlvbiBoYXMgY2hhbmdlZFxuICAgKiAqIG9uZSBvciBtb3JlIGVudHJ5LXBvaW50cyBpbiB0aGUgbWFuaWZlc3QgYXJlIG5vdCB2YWxpZFxuICAgKlxuICAgKiBAcGFyYW0gYmFzZVBhdGggVGhlIHBhdGggdGhhdCB3b3VsZCBjb250YWluIHRoZSBlbnRyeS1wb2ludHMgYW5kIHRoZSBtYW5pZmVzdCBmaWxlLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBlbnRyeS1wb2ludCBpbmZvcm1hdGlvbiBmb3IgYWxsIGVudHJ5LXBvaW50cyBmb3VuZCBiZWxvdyB0aGUgZ2l2ZW5cbiAgICogYGJhc2VQYXRoYCBvciBgbnVsbGAgaWYgdGhlIG1hbmlmZXN0IHdhcyBvdXQgb2YgZGF0ZS5cbiAgICovXG4gIHJlYWRFbnRyeVBvaW50c1VzaW5nTWFuaWZlc3QoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFtdfG51bGwge1xuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy5mcy5iYXNlbmFtZShiYXNlUGF0aCkgIT09ICdub2RlX21vZHVsZXMnKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYW5pZmVzdFBhdGggPSB0aGlzLmdldEVudHJ5UG9pbnRNYW5pZmVzdFBhdGgoYmFzZVBhdGgpO1xuICAgICAgaWYgKCF0aGlzLmZzLmV4aXN0cyhtYW5pZmVzdFBhdGgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb21wdXRlZExvY2tGaWxlSGFzaCA9IHRoaXMuY29tcHV0ZUxvY2tGaWxlSGFzaChiYXNlUGF0aCk7XG4gICAgICBpZiAoY29tcHV0ZWRMb2NrRmlsZUhhc2ggPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtuZ2NjVmVyc2lvbiwgY29uZmlnRmlsZUhhc2gsIGxvY2tGaWxlSGFzaCwgZW50cnlQb2ludFBhdGhzfSA9XG4gICAgICAgICAgSlNPTi5wYXJzZSh0aGlzLmZzLnJlYWRGaWxlKG1hbmlmZXN0UGF0aCkpIGFzIEVudHJ5UG9pbnRNYW5pZmVzdEZpbGU7XG4gICAgICBpZiAobmdjY1ZlcnNpb24gIT09IE5HQ0NfVkVSU0lPTiB8fCBjb25maWdGaWxlSGFzaCAhPT0gdGhpcy5jb25maWcuaGFzaCB8fFxuICAgICAgICAgIGxvY2tGaWxlSGFzaCAhPT0gY29tcHV0ZWRMb2NrRmlsZUhhc2gpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAgIGBFbnRyeS1wb2ludCBtYW5pZmVzdCBmb3VuZCBmb3IgJHtiYXNlUGF0aH0gc28gbG9hZGluZyBlbnRyeS1wb2ludCBpbmZvcm1hdGlvbiBkaXJlY3RseS5gKTtcbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgW3BhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aF0gb2YgZW50cnlQb2ludFBhdGhzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9XG4gICAgICAgICAgICBnZXRFbnRyeVBvaW50SW5mbyh0aGlzLmZzLCB0aGlzLmNvbmZpZywgdGhpcy5sb2dnZXIsIHBhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCk7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IE5PX0VOVFJZX1BPSU5UIHx8IHJlc3VsdCA9PT0gSU5WQUxJRF9FTlRSWV9QT0lOVCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFRoZSBlbnRyeS1wb2ludCBtYW5pZmVzdCBhdCAke21hbmlmZXN0UGF0aH0gY29udGFpbmVkIGFuIGludmFsaWQgcGFpciBvZiBwYWNrYWdlIHBhdGhzOiBbJHtwYWNrYWdlUGF0aH0sICR7ZW50cnlQb2ludFBhdGh9XWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudHJ5UG9pbnRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMCkgLyAxMDtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBSZWFkaW5nIGVudHJ5LXBvaW50cyB1c2luZyB0aGUgbWFuaWZlc3QgZW50cmllcyB0b29rICR7ZHVyYXRpb259cy5gKTtcbiAgICAgIHJldHVybiBlbnRyeVBvaW50cztcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgIGBVbmFibGUgdG8gcmVhZCB0aGUgZW50cnktcG9pbnQgbWFuaWZlc3QgZm9yICR7YmFzZVBhdGh9OlxcbmAsIGUuc3RhY2sgfHwgZS50b1N0cmluZygpKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZSBhIG1hbmlmZXN0IGZpbGUgYXQgdGhlIGdpdmVuIGBiYXNlUGF0aGAuXG4gICAqXG4gICAqIFRoZSBtYW5pZmVzdCBpbmNsdWRlcyB0aGUgY3VycmVudCBuZ2NjIHZlcnNpb24gYW5kIGhhc2hlcyBvZiB0aGUgcGFja2FnZSBsb2NrLWZpbGUgYW5kIGN1cnJlbnRcbiAgICogcHJvamVjdCBjb25maWcuIFRoZXNlIHdpbGwgYmUgdXNlZCB0byBjaGVjayB3aGV0aGVyIHRoZSBtYW5pZmVzdCBmaWxlIGlzIG91dCBvZiBkYXRlLiBTZWVcbiAgICogYHJlYWRFbnRyeVBvaW50c1VzaW5nTWFuaWZlc3QoKWAuXG4gICAqXG4gICAqIEBwYXJhbSBiYXNlUGF0aCBUaGUgcGF0aCB3aGVyZSB0aGUgbWFuaWZlc3QgZmlsZSBpcyB0byBiZSB3cml0dGVuLlxuICAgKiBAcGFyYW0gZW50cnlQb2ludHMgQSBjb2xsZWN0aW9uIG9mIGVudHJ5LXBvaW50cyB0byByZWNvcmQgaW4gdGhlIG1hbmlmZXN0LlxuICAgKi9cbiAgd3JpdGVFbnRyeVBvaW50TWFuaWZlc3QoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoLCBlbnRyeVBvaW50czogRW50cnlQb2ludFtdKTogdm9pZCB7XG4gICAgY29uc3QgbG9ja0ZpbGVIYXNoID0gdGhpcy5jb21wdXRlTG9ja0ZpbGVIYXNoKGJhc2VQYXRoKTtcbiAgICBpZiAobG9ja0ZpbGVIYXNoID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG1hbmlmZXN0OiBFbnRyeVBvaW50TWFuaWZlc3RGaWxlID0ge1xuICAgICAgbmdjY1ZlcnNpb246IE5HQ0NfVkVSU0lPTixcbiAgICAgIGNvbmZpZ0ZpbGVIYXNoOiB0aGlzLmNvbmZpZy5oYXNoLFxuICAgICAgbG9ja0ZpbGVIYXNoOiBsb2NrRmlsZUhhc2gsXG4gICAgICBlbnRyeVBvaW50UGF0aHM6IGVudHJ5UG9pbnRzLm1hcChlbnRyeVBvaW50ID0+IFtlbnRyeVBvaW50LnBhY2thZ2UsIGVudHJ5UG9pbnQucGF0aF0pLFxuICAgIH07XG4gICAgdGhpcy5mcy53cml0ZUZpbGUodGhpcy5nZXRFbnRyeVBvaW50TWFuaWZlc3RQYXRoKGJhc2VQYXRoKSwgSlNPTi5zdHJpbmdpZnkobWFuaWZlc3QpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RW50cnlQb2ludE1hbmlmZXN0UGF0aChiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICByZXR1cm4gdGhpcy5mcy5yZXNvbHZlKGJhc2VQYXRoLCAnX19uZ2NjX2VudHJ5X3BvaW50c19fLmpzb24nKTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUxvY2tGaWxlSGFzaChiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3QgZGlyZWN0b3J5ID0gdGhpcy5mcy5kaXJuYW1lKGJhc2VQYXRoKTtcbiAgICBmb3IgKGNvbnN0IGxvY2tGaWxlTmFtZSBvZiBbJ3lhcm4ubG9jaycsICdwYWNrYWdlLWxvY2suanNvbiddKSB7XG4gICAgICBjb25zdCBsb2NrRmlsZVBhdGggPSB0aGlzLmZzLnJlc29sdmUoZGlyZWN0b3J5LCBsb2NrRmlsZU5hbWUpO1xuICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKGxvY2tGaWxlUGF0aCkpIHtcbiAgICAgICAgY29uc3QgbG9ja0ZpbGVDb250ZW50cyA9IHRoaXMuZnMucmVhZEZpbGUobG9ja0ZpbGVQYXRoKTtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZShsb2NrRmlsZUNvbnRlbnRzKS5kaWdlc3QoJ2hleCcpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEEgc3BlY2lhbGl6ZWQgaW1wbGVtZW50YXRpb24gb2YgdGhlIGBFbnRyeVBvaW50TWFuaWZlc3RgIHRoYXQgY2FuIGJlIHVzZWQgdG8gaW52YWxpZGF0ZSB0aGVcbiAqIGN1cnJlbnQgbWFuaWZlc3QgZmlsZS5cbiAqXG4gKiBJdCBhbHdheXMgcmV0dXJucyBgbnVsbGAgZnJvbSB0aGUgYHJlYWRFbnRyeVBvaW50c1VzaW5nTWFuaWZlc3QoKWAgbWV0aG9kLCB3aGljaCBmb3JjZXMgYSBuZXdcbiAqIG1hbmlmZXN0IHRvIGJlIGNyZWF0ZWQsIHdoaWNoIHdpbGwgb3ZlcndyaXRlIHRoZSBjdXJyZW50IGZpbGUgd2hlbiBgd3JpdGVFbnRyeVBvaW50TWFuaWZlc3QoKWAgaXNcbiAqIGNhbGxlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEludmFsaWRhdGluZ0VudHJ5UG9pbnRNYW5pZmVzdCBleHRlbmRzIEVudHJ5UG9pbnRNYW5pZmVzdCB7XG4gIHJlYWRFbnRyeVBvaW50c1VzaW5nTWFuaWZlc3QoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFtdfG51bGwgeyByZXR1cm4gbnVsbDsgfVxufVxuXG4vKipcbiAqIFRoZSBKU09OIGZvcm1hdCBvZiB0aGUgbWFuaWZlc3QgZmlsZSB0aGF0IGlzIHdyaXR0ZW4gdG8gZGlzay5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50TWFuaWZlc3RGaWxlIHtcbiAgbmdjY1ZlcnNpb246IHN0cmluZztcbiAgY29uZmlnRmlsZUhhc2g6IHN0cmluZztcbiAgbG9ja0ZpbGVIYXNoOiBzdHJpbmc7XG4gIGVudHJ5UG9pbnRQYXRoczogQXJyYXk8W0Fic29sdXRlRnNQYXRoLCBBYnNvbHV0ZUZzUGF0aF0+O1xufVxuIl19