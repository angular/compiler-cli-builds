/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createHash } from 'crypto';
import { NGCC_VERSION } from './build_marker';
import { getEntryPointInfo, isEntryPoint } from './entry_point';
/**
 * Manages reading and writing a manifest file that contains a list of all the entry-points that
 * were found below a given basePath.
 *
 * This is a super-set of the entry-points that are actually processed for a given run of ngcc,
 * since some may already be processed, or excluded if they do not have the required format.
 */
export class EntryPointManifest {
    constructor(fs, config, logger) {
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
    readEntryPointsUsingManifest(basePath) {
        try {
            if (this.fs.basename(basePath) !== 'node_modules') {
                return null;
            }
            const manifestPath = this.getEntryPointManifestPath(basePath);
            if (!this.fs.exists(manifestPath)) {
                return null;
            }
            const computedLockFileHash = this.computeLockFileHash(basePath);
            if (computedLockFileHash === null) {
                return null;
            }
            const { ngccVersion, configFileHash, lockFileHash, entryPointPaths } = JSON.parse(this.fs.readFile(manifestPath));
            if (ngccVersion !== NGCC_VERSION || configFileHash !== this.config.hash ||
                lockFileHash !== computedLockFileHash) {
                return null;
            }
            this.logger.debug(`Entry-point manifest found for ${basePath} so loading entry-point information directly.`);
            const startTime = Date.now();
            const entryPoints = [];
            for (const [packagePath, entryPointPath, dependencyPaths = [], missingPaths = [], deepImportPaths = []] of entryPointPaths) {
                const result = getEntryPointInfo(this.fs, this.config, this.logger, this.fs.resolve(basePath, packagePath), this.fs.resolve(basePath, entryPointPath));
                if (!isEntryPoint(result)) {
                    throw new Error(`The entry-point manifest at ${manifestPath} contained an invalid pair of package paths: [${packagePath}, ${entryPointPath}]`);
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
            const duration = Math.round((Date.now() - startTime) / 100) / 10;
            this.logger.debug(`Reading entry-points using the manifest entries took ${duration}s.`);
            return entryPoints;
        }
        catch (e) {
            this.logger.warn(`Unable to read the entry-point manifest for ${basePath}:\n`, e.stack || e.toString());
            return null;
        }
    }
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
    writeEntryPointManifest(basePath, entryPoints) {
        if (this.fs.basename(basePath) !== 'node_modules') {
            return;
        }
        const lockFileHash = this.computeLockFileHash(basePath);
        if (lockFileHash === null) {
            return;
        }
        const manifest = {
            ngccVersion: NGCC_VERSION,
            configFileHash: this.config.hash,
            lockFileHash: lockFileHash,
            entryPointPaths: entryPoints.map(e => {
                const entryPointPaths = [
                    this.fs.relative(basePath, e.entryPoint.packagePath),
                    this.fs.relative(basePath, e.entryPoint.path),
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
    }
    getEntryPointManifestPath(basePath) {
        return this.fs.resolve(basePath, '__ngcc_entry_points__.json');
    }
    computeLockFileHash(basePath) {
        const directory = this.fs.dirname(basePath);
        for (const lockFileName of ['yarn.lock', 'package-lock.json']) {
            const lockFilePath = this.fs.resolve(directory, lockFileName);
            if (this.fs.exists(lockFilePath)) {
                const lockFileContents = this.fs.readFile(lockFilePath);
                return createHash('md5').update(lockFileContents).digest('hex');
            }
        }
        return null;
    }
}
/**
 * A specialized implementation of the `EntryPointManifest` that can be used to invalidate the
 * current manifest file.
 *
 * It always returns `null` from the `readEntryPointsUsingManifest()` method, which forces a new
 * manifest to be created, which will overwrite the current file when `writeEntryPointManifest()`
 * is called.
 */
export class InvalidatingEntryPointManifest extends EntryPointManifest {
    readEntryPointsUsingManifest(_basePath) {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfbWFuaWZlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcGFja2FnZXMvZW50cnlfcG9pbnRfbWFuaWZlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBQ0gsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLFFBQVEsQ0FBQztBQU1sQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFNUMsT0FBTyxFQUFDLGlCQUFpQixFQUFFLFlBQVksRUFBOEIsTUFBTSxlQUFlLENBQUM7QUFFM0Y7Ozs7OztHQU1HO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUM3QixZQUFvQixFQUFjLEVBQVUsTUFBeUIsRUFBVSxNQUFjO1FBQXpFLE9BQUUsR0FBRixFQUFFLENBQVk7UUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7SUFBRyxDQUFDO0lBRWpHOzs7Ozs7Ozs7Ozs7Ozs7T0FlRztJQUNILDRCQUE0QixDQUFDLFFBQXdCO1FBQ25ELElBQUk7WUFDRixJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLGNBQWMsRUFBRTtnQkFDakQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5RCxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNoRSxJQUFJLG9CQUFvQixLQUFLLElBQUksRUFBRTtnQkFDakMsT0FB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QkFBNEIsQ0FBQyxTQUF5QjtRQUNwRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjcmVhdGVIYXNofSBmcm9tICdjcnlwdG8nO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBQYXRoU2VnbWVudH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvbG9nZ2luZyc7XG5pbXBvcnQge0VudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzfSBmcm9tICcuLi9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9ob3N0JztcblxuaW1wb3J0IHtOR0NDX1ZFUlNJT059IGZyb20gJy4vYnVpbGRfbWFya2VyJztcbmltcG9ydCB7TmdjY0NvbmZpZ3VyYXRpb259IGZyb20gJy4vY29uZmlndXJhdGlvbic7XG5pbXBvcnQge2dldEVudHJ5UG9pbnRJbmZvLCBpc0VudHJ5UG9pbnQsIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc30gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cbi8qKlxuICogTWFuYWdlcyByZWFkaW5nIGFuZCB3cml0aW5nIGEgbWFuaWZlc3QgZmlsZSB0aGF0IGNvbnRhaW5zIGEgbGlzdCBvZiBhbGwgdGhlIGVudHJ5LXBvaW50cyB0aGF0XG4gKiB3ZXJlIGZvdW5kIGJlbG93IGEgZ2l2ZW4gYmFzZVBhdGguXG4gKlxuICogVGhpcyBpcyBhIHN1cGVyLXNldCBvZiB0aGUgZW50cnktcG9pbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHByb2Nlc3NlZCBmb3IgYSBnaXZlbiBydW4gb2YgbmdjYyxcbiAqIHNpbmNlIHNvbWUgbWF5IGFscmVhZHkgYmUgcHJvY2Vzc2VkLCBvciBleGNsdWRlZCBpZiB0aGV5IGRvIG5vdCBoYXZlIHRoZSByZXF1aXJlZCBmb3JtYXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbnRyeVBvaW50TWFuaWZlc3Qge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGNvbmZpZzogTmdjY0NvbmZpZ3VyYXRpb24sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIpIHt9XG5cbiAgLyoqXG4gICAqIFRyeSB0byBnZXQgdGhlIGVudHJ5LXBvaW50IGluZm8gZnJvbSBhIG1hbmlmZXN0IGZpbGUgZm9yIHRoZSBnaXZlbiBgYmFzZVBhdGhgIGlmIGl0IGV4aXN0cyBhbmRcbiAgICogaXMgbm90IG91dCBvZiBkYXRlLlxuICAgKlxuICAgKiBSZWFzb25zIGZvciB0aGUgbWFuaWZlc3QgdG8gYmUgb3V0IG9mIGRhdGUgYXJlOlxuICAgKlxuICAgKiAqIHRoZSBmaWxlIGRvZXMgbm90IGV4aXN0XG4gICAqICogdGhlIG5nY2MgdmVyc2lvbiBoYXMgY2hhbmdlZFxuICAgKiAqIHRoZSBwYWNrYWdlIGxvY2stZmlsZSAoaS5lLiB5YXJuLmxvY2sgb3IgcGFja2FnZS1sb2NrLmpzb24pIGhhcyBjaGFuZ2VkXG4gICAqICogdGhlIHByb2plY3QgY29uZmlndXJhdGlvbiBoYXMgY2hhbmdlZFxuICAgKiAqIG9uZSBvciBtb3JlIGVudHJ5LXBvaW50cyBpbiB0aGUgbWFuaWZlc3QgYXJlIG5vdCB2YWxpZFxuICAgKlxuICAgKiBAcGFyYW0gYmFzZVBhdGggVGhlIHBhdGggdGhhdCB3b3VsZCBjb250YWluIHRoZSBlbnRyeS1wb2ludHMgYW5kIHRoZSBtYW5pZmVzdCBmaWxlLlxuICAgKiBAcmV0dXJucyBhbiBhcnJheSBvZiBlbnRyeS1wb2ludCBpbmZvcm1hdGlvbiBmb3IgYWxsIGVudHJ5LXBvaW50cyBmb3VuZCBiZWxvdyB0aGUgZ2l2ZW5cbiAgICogYGJhc2VQYXRoYCBvciBgbnVsbGAgaWYgdGhlIG1hbmlmZXN0IHdhcyBvdXQgb2YgZGF0ZS5cbiAgICovXG4gIHJlYWRFbnRyeVBvaW50c1VzaW5nTWFuaWZlc3QoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXNbXXxudWxsIHtcbiAgICB0cnkge1xuICAgICAgaWYgKHRoaXMuZnMuYmFzZW5hbWUoYmFzZVBhdGgpICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWFuaWZlc3RQYXRoID0gdGhpcy5nZXRFbnRyeVBvaW50TWFuaWZlc3RQYXRoKGJhc2VQYXRoKTtcbiAgICAgIGlmICghdGhpcy5mcy5leGlzdHMobWFuaWZlc3RQYXRoKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29tcHV0ZWRMb2NrRmlsZUhhc2ggPSB0aGlzLmNvbXB1dGVMb2NrRmlsZUhhc2goYmFzZVBhdGgpO1xuICAgICAgaWYgKGNvbXB1dGVkTG9ja0ZpbGVIYXNoID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7bmdjY1ZlcnNpb24sIGNvbmZpZ0ZpbGVIYXNoLCBsb2NrRmlsZUhhc2gsIGVudHJ5UG9pbnRQYXRoc30gPVxuICAgICAgICAgIEpTT04ucGFyc2UodGhpcy5mcy5yZWFkRmlsZShtYW5pZmVzdFBhdGgpKSBhcyBFbnRyeVBvaW50TWFuaWZlc3RGaWxlO1xuICAgICAgaWYgKG5nY2NWZXJzaW9uICE9PSBOR0NDX1ZFUlNJT04gfHwgY29uZmlnRmlsZUhhc2ggIT09IHRoaXMuY29uZmlnLmhhc2ggfHxcbiAgICAgICAgICBsb2NrRmlsZUhhc2ggIT09IGNvbXB1dGVkTG9ja0ZpbGVIYXNoKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgRW50cnktcG9pbnQgbWFuaWZlc3QgZm91bmQgZm9yICR7XG4gICAgICAgICAgYmFzZVBhdGh9IHNvIGxvYWRpbmcgZW50cnktcG9pbnQgaW5mb3JtYXRpb24gZGlyZWN0bHkuYCk7XG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgICBjb25zdCBlbnRyeVBvaW50czogRW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXNbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdFxuICAgICAgICAgICAgICAgW3BhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCwgZGVwZW5kZW5jeVBhdGhzID0gW10sIG1pc3NpbmdQYXRocyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVlcEltcG9ydFBhdGhzID0gW11dIG9mIGVudHJ5UG9pbnRQYXRocykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBnZXRFbnRyeVBvaW50SW5mbyhcbiAgICAgICAgICAgIHRoaXMuZnMsIHRoaXMuY29uZmlnLCB0aGlzLmxvZ2dlciwgdGhpcy5mcy5yZXNvbHZlKGJhc2VQYXRoLCBwYWNrYWdlUGF0aCksXG4gICAgICAgICAgICB0aGlzLmZzLnJlc29sdmUoYmFzZVBhdGgsIGVudHJ5UG9pbnRQYXRoKSk7XG4gICAgICAgIGlmICghaXNFbnRyeVBvaW50KHJlc3VsdCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBlbnRyeS1wb2ludCBtYW5pZmVzdCBhdCAke1xuICAgICAgICAgICAgICBtYW5pZmVzdFBhdGh9IGNvbnRhaW5lZCBhbiBpbnZhbGlkIHBhaXIgb2YgcGFja2FnZSBwYXRoczogWyR7cGFja2FnZVBhdGh9LCAke1xuICAgICAgICAgICAgICBlbnRyeVBvaW50UGF0aH1dYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZW50cnlQb2ludHMucHVzaCh7XG4gICAgICAgICAgICBlbnRyeVBvaW50OiByZXN1bHQsXG4gICAgICAgICAgICBkZXBJbmZvOiB7XG4gICAgICAgICAgICAgIGRlcGVuZGVuY2llczogbmV3IFNldChkZXBlbmRlbmN5UGF0aHMpLFxuICAgICAgICAgICAgICBtaXNzaW5nOiBuZXcgU2V0KG1pc3NpbmdQYXRocyksXG4gICAgICAgICAgICAgIGRlZXBJbXBvcnRzOiBuZXcgU2V0KGRlZXBJbXBvcnRQYXRocyksXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDApIC8gMTA7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgUmVhZGluZyBlbnRyeS1wb2ludHMgdXNpbmcgdGhlIG1hbmlmZXN0IGVudHJpZXMgdG9vayAke2R1cmF0aW9ufXMuYCk7XG4gICAgICByZXR1cm4gZW50cnlQb2ludHM7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICBgVW5hYmxlIHRvIHJlYWQgdGhlIGVudHJ5LXBvaW50IG1hbmlmZXN0IGZvciAke2Jhc2VQYXRofTpcXG5gLCBlLnN0YWNrIHx8IGUudG9TdHJpbmcoKSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogV3JpdGUgYSBtYW5pZmVzdCBmaWxlIGF0IHRoZSBnaXZlbiBgYmFzZVBhdGhgLlxuICAgKlxuICAgKiBUaGUgbWFuaWZlc3QgaW5jbHVkZXMgdGhlIGN1cnJlbnQgbmdjYyB2ZXJzaW9uIGFuZCBoYXNoZXMgb2YgdGhlIHBhY2thZ2UgbG9jay1maWxlIGFuZCBjdXJyZW50XG4gICAqIHByb2plY3QgY29uZmlnLiBUaGVzZSB3aWxsIGJlIHVzZWQgdG8gY2hlY2sgd2hldGhlciB0aGUgbWFuaWZlc3QgZmlsZSBpcyBvdXQgb2YgZGF0ZS4gU2VlXG4gICAqIGByZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KClgLlxuICAgKlxuICAgKiBAcGFyYW0gYmFzZVBhdGggVGhlIHBhdGggd2hlcmUgdGhlIG1hbmlmZXN0IGZpbGUgaXMgdG8gYmUgd3JpdHRlbi5cbiAgICogQHBhcmFtIGVudHJ5UG9pbnRzIEEgY29sbGVjdGlvbiBvZiBlbnRyeS1wb2ludHMgdG8gcmVjb3JkIGluIHRoZSBtYW5pZmVzdC5cbiAgICovXG4gIHdyaXRlRW50cnlQb2ludE1hbmlmZXN0KGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZW50cnlQb2ludHM6IEVudHJ5UG9pbnRXaXRoRGVwZW5kZW5jaWVzW10pOlxuICAgICAgdm9pZCB7XG4gICAgaWYgKHRoaXMuZnMuYmFzZW5hbWUoYmFzZVBhdGgpICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxvY2tGaWxlSGFzaCA9IHRoaXMuY29tcHV0ZUxvY2tGaWxlSGFzaChiYXNlUGF0aCk7XG4gICAgaWYgKGxvY2tGaWxlSGFzaCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBtYW5pZmVzdDogRW50cnlQb2ludE1hbmlmZXN0RmlsZSA9IHtcbiAgICAgIG5nY2NWZXJzaW9uOiBOR0NDX1ZFUlNJT04sXG4gICAgICBjb25maWdGaWxlSGFzaDogdGhpcy5jb25maWcuaGFzaCxcbiAgICAgIGxvY2tGaWxlSGFzaDogbG9ja0ZpbGVIYXNoLFxuICAgICAgZW50cnlQb2ludFBhdGhzOiBlbnRyeVBvaW50cy5tYXAoZSA9PiB7XG4gICAgICAgIGNvbnN0IGVudHJ5UG9pbnRQYXRoczogRW50cnlQb2ludFBhdGhzID0gW1xuICAgICAgICAgIHRoaXMuZnMucmVsYXRpdmUoYmFzZVBhdGgsIGUuZW50cnlQb2ludC5wYWNrYWdlUGF0aCksXG4gICAgICAgICAgdGhpcy5mcy5yZWxhdGl2ZShiYXNlUGF0aCwgZS5lbnRyeVBvaW50LnBhdGgpLFxuICAgICAgICBdO1xuICAgICAgICAvLyBPbmx5IGFkZCBkZXBJbmZvIGFycmF5cyBpZiBuZWVkZWQuXG4gICAgICAgIGlmIChlLmRlcEluZm8uZGVwZW5kZW5jaWVzLnNpemUgPiAwKSB7XG4gICAgICAgICAgZW50cnlQb2ludFBhdGhzWzJdID0gQXJyYXkuZnJvbShlLmRlcEluZm8uZGVwZW5kZW5jaWVzKTtcbiAgICAgICAgfSBlbHNlIGlmIChlLmRlcEluZm8ubWlzc2luZy5zaXplID4gMCB8fCBlLmRlcEluZm8uZGVlcEltcG9ydHMuc2l6ZSA+IDApIHtcbiAgICAgICAgICBlbnRyeVBvaW50UGF0aHNbMl0gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZS5kZXBJbmZvLm1pc3Npbmcuc2l6ZSA+IDApIHtcbiAgICAgICAgICBlbnRyeVBvaW50UGF0aHNbM10gPSBBcnJheS5mcm9tKGUuZGVwSW5mby5taXNzaW5nKTtcbiAgICAgICAgfSBlbHNlIGlmIChlLmRlcEluZm8uZGVlcEltcG9ydHMuc2l6ZSA+IDApIHtcbiAgICAgICAgICBlbnRyeVBvaW50UGF0aHNbM10gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZS5kZXBJbmZvLmRlZXBJbXBvcnRzLnNpemUgPiAwKSB7XG4gICAgICAgICAgZW50cnlQb2ludFBhdGhzWzRdID0gQXJyYXkuZnJvbShlLmRlcEluZm8uZGVlcEltcG9ydHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbnRyeVBvaW50UGF0aHM7XG4gICAgICB9KSxcbiAgICB9O1xuICAgIHRoaXMuZnMud3JpdGVGaWxlKHRoaXMuZ2V0RW50cnlQb2ludE1hbmlmZXN0UGF0aChiYXNlUGF0aCksIEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0KSk7XG4gIH1cblxuICBwcml2YXRlIGdldEVudHJ5UG9pbnRNYW5pZmVzdFBhdGgoYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKSB7XG4gICAgcmV0dXJuIHRoaXMuZnMucmVzb2x2ZShiYXNlUGF0aCwgJ19fbmdjY19lbnRyeV9wb2ludHNfXy5qc29uJyk7XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVMb2NrRmlsZUhhc2goYmFzZVBhdGg6IEFic29sdXRlRnNQYXRoKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IGRpcmVjdG9yeSA9IHRoaXMuZnMuZGlybmFtZShiYXNlUGF0aCk7XG4gICAgZm9yIChjb25zdCBsb2NrRmlsZU5hbWUgb2YgWyd5YXJuLmxvY2snLCAncGFja2FnZS1sb2NrLmpzb24nXSkge1xuICAgICAgY29uc3QgbG9ja0ZpbGVQYXRoID0gdGhpcy5mcy5yZXNvbHZlKGRpcmVjdG9yeSwgbG9ja0ZpbGVOYW1lKTtcbiAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhsb2NrRmlsZVBhdGgpKSB7XG4gICAgICAgIGNvbnN0IGxvY2tGaWxlQ29udGVudHMgPSB0aGlzLmZzLnJlYWRGaWxlKGxvY2tGaWxlUGF0aCk7XG4gICAgICAgIHJldHVybiBjcmVhdGVIYXNoKCdtZDUnKS51cGRhdGUobG9ja0ZpbGVDb250ZW50cykuZGlnZXN0KCdoZXgnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHNwZWNpYWxpemVkIGltcGxlbWVudGF0aW9uIG9mIHRoZSBgRW50cnlQb2ludE1hbmlmZXN0YCB0aGF0IGNhbiBiZSB1c2VkIHRvIGludmFsaWRhdGUgdGhlXG4gKiBjdXJyZW50IG1hbmlmZXN0IGZpbGUuXG4gKlxuICogSXQgYWx3YXlzIHJldHVybnMgYG51bGxgIGZyb20gdGhlIGByZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KClgIG1ldGhvZCwgd2hpY2ggZm9yY2VzIGEgbmV3XG4gKiBtYW5pZmVzdCB0byBiZSBjcmVhdGVkLCB3aGljaCB3aWxsIG92ZXJ3cml0ZSB0aGUgY3VycmVudCBmaWxlIHdoZW4gYHdyaXRlRW50cnlQb2ludE1hbmlmZXN0KClgXG4gKiBpcyBjYWxsZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbnZhbGlkYXRpbmdFbnRyeVBvaW50TWFuaWZlc3QgZXh0ZW5kcyBFbnRyeVBvaW50TWFuaWZlc3Qge1xuICByZWFkRW50cnlQb2ludHNVc2luZ01hbmlmZXN0KF9iYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc1tdfG51bGwge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIEVudHJ5UG9pbnRQYXRocyA9IFtcbiAgc3RyaW5nLFxuICBzdHJpbmcsXG4gIEFycmF5PEFic29sdXRlRnNQYXRoPj8sXG4gIEFycmF5PEFic29sdXRlRnNQYXRofFBhdGhTZWdtZW50Pj8sXG4gIEFycmF5PEFic29sdXRlRnNQYXRoPj8sXG5dO1xuXG4vKipcbiAqIFRoZSBKU09OIGZvcm1hdCBvZiB0aGUgbWFuaWZlc3QgZmlsZSB0aGF0IGlzIHdyaXR0ZW4gdG8gZGlzay5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50TWFuaWZlc3RGaWxlIHtcbiAgbmdjY1ZlcnNpb246IHN0cmluZztcbiAgY29uZmlnRmlsZUhhc2g6IHN0cmluZztcbiAgbG9ja0ZpbGVIYXNoOiBzdHJpbmc7XG4gIGVudHJ5UG9pbnRQYXRoczogRW50cnlQb2ludFBhdGhzW107XG59XG5cblxuLyoqIFRoZSBKU09OIGZvcm1hdCBvZiB0aGUgZW50cnlwb2ludCBwcm9wZXJ0aWVzLiAqL1xuZXhwb3J0IHR5cGUgTmV3RW50cnlQb2ludFByb3BlcnRpZXNNYXAgPSB7XG4gIFtQcm9wZXJ0eSBpbiBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXMgYXMgYCR7UHJvcGVydHl9X2l2eV9uZ2NjYF0/OiBzdHJpbmc7XG59O1xuIl19