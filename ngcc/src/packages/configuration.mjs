/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createHash } from 'crypto';
import { satisfies } from 'semver';
import * as vm from 'vm';
/**
 * The default configuration for ngcc.
 *
 * This is the ultimate fallback configuration that ngcc will use if there is no configuration
 * for a package at the package level or project level.
 *
 * This configuration is for packages that are "dead" - i.e. no longer maintained and so are
 * unlikely to be fixed to work with ngcc, nor provide a package level config of their own.
 *
 * The fallback process for looking up configuration is:
 *
 * Project -> Package -> Default
 *
 * If a package provides its own configuration then that would override this default one.
 *
 * Also application developers can always provide configuration at their project level which
 * will override everything else.
 *
 * Note that the fallback is package based not entry-point based.
 * For example, if a there is configuration for a package at the project level this will replace all
 * entry-point configurations that may have been provided in the package level or default level
 * configurations, even if the project level configuration does not provide for a given entry-point.
 */
export const DEFAULT_NGCC_CONFIG = {
    packages: {
        // Add default package configuration here. For example:
        // '@angular/fire@^5.2.0': {
        //   entryPoints: {
        //     './database-deprecated': {ignore: true},
        //   },
        // },
        // The package does not contain any `.metadata.json` files in the root directory but only inside
        // `dist/`. Without this config, ngcc does not realize this is a ViewEngine-built Angular
        // package that needs to be compiled to Ivy.
        'angular2-highcharts': {
            entryPoints: {
                '.': {
                    override: {
                        main: './index.js',
                    },
                },
            },
        },
        // The `dist/` directory has a duplicate `package.json` pointing to the same files, which (under
        // certain configurations) can causes ngcc to try to process the files twice and fail.
        // Ignore the `dist/` entry-point.
        'ng2-dragula': {
            entryPoints: {
                './dist': { ignore: true },
            },
        },
    },
    locking: {
        retryDelay: 500,
        retryAttempts: 500,
    }
};
const NGCC_CONFIG_FILENAME = 'ngcc.config.js';
/**
 * The processed package level configuration as a result of processing a raw package level config.
 */
export class ProcessedNgccPackageConfig {
    constructor(fs, packagePath, { entryPoints = {}, ignorableDeepImportMatchers = [], }) {
        const absolutePathEntries = Object.entries(entryPoints).map(([relativePath, config]) => [fs.resolve(packagePath, relativePath), config]);
        this.packagePath = packagePath;
        this.entryPoints = new Map(absolutePathEntries);
        this.ignorableDeepImportMatchers = ignorableDeepImportMatchers;
    }
}
/**
 * Ngcc has a hierarchical configuration system that lets us "fix up" packages that do not
 * work with ngcc out of the box.
 *
 * There are three levels at which configuration can be declared:
 *
 * * Default level - ngcc comes with built-in configuration for well known cases.
 * * Package level - a library author publishes a configuration with their package to fix known
 *   issues.
 * * Project level - the application developer provides a configuration that fixes issues specific
 *   to the libraries used in their application.
 *
 * Ngcc will match configuration based on the package name but also on its version. This allows
 * configuration to provide different fixes to different version ranges of a package.
 *
 * * Package level configuration is specific to the package version where the configuration is
 *   found.
 * * Default and project level configuration should provide version ranges to ensure that the
 *   configuration is only applied to the appropriate versions of a package.
 *
 * When getting a configuration for a package (via `getConfig()`) the caller should provide the
 * version of the package in question, if available. If it is not provided then the first available
 * configuration for a package is returned.
 */
export class NgccConfiguration {
    constructor(fs, baseDir) {
        this.fs = fs;
        this.cache = new Map();
        this.defaultConfig = this.processProjectConfig(DEFAULT_NGCC_CONFIG);
        this.projectConfig = this.processProjectConfig(this.loadProjectConfig(baseDir));
        this.hashAlgorithm = this.projectConfig.hashAlgorithm;
        this.hash = this.computeHash();
    }
    /**
     * Get the configuration options for locking the ngcc process.
     */
    getLockingConfig() {
        let { retryAttempts, retryDelay } = this.projectConfig.locking;
        if (retryAttempts === undefined) {
            retryAttempts = this.defaultConfig.locking.retryAttempts;
        }
        if (retryDelay === undefined) {
            retryDelay = this.defaultConfig.locking.retryDelay;
        }
        return { retryAttempts, retryDelay };
    }
    /**
     * Get a configuration for the given `version` of a package at `packagePath`.
     *
     * @param packageName The name of the package whose config we want.
     * @param packagePath The path to the package whose config we want.
     * @param version The version of the package whose config we want, or `null` if the package's
     * package.json did not exist or was invalid.
     */
    getPackageConfig(packageName, packagePath, version) {
        const rawPackageConfig = this.getRawPackageConfig(packageName, packagePath, version);
        return new ProcessedNgccPackageConfig(this.fs, packagePath, rawPackageConfig);
    }
    getRawPackageConfig(packageName, packagePath, version) {
        const cacheKey = packageName + (version !== null ? `@${version}` : '');
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        const projectLevelConfig = this.projectConfig.packages ?
            findSatisfactoryVersion(this.projectConfig.packages[packageName], version) :
            null;
        if (projectLevelConfig !== null) {
            this.cache.set(cacheKey, projectLevelConfig);
            return projectLevelConfig;
        }
        const packageLevelConfig = this.loadPackageConfig(packagePath, version);
        if (packageLevelConfig !== null) {
            this.cache.set(cacheKey, packageLevelConfig);
            return packageLevelConfig;
        }
        const defaultLevelConfig = this.defaultConfig.packages ?
            findSatisfactoryVersion(this.defaultConfig.packages[packageName], version) :
            null;
        if (defaultLevelConfig !== null) {
            this.cache.set(cacheKey, defaultLevelConfig);
            return defaultLevelConfig;
        }
        return { versionRange: '*' };
    }
    processProjectConfig(projectConfig) {
        const processedConfig = { packages: {}, locking: {}, hashAlgorithm: 'sha256' };
        // locking configuration
        if (projectConfig.locking !== undefined) {
            processedConfig.locking = projectConfig.locking;
        }
        // packages configuration
        for (const packageNameAndVersion in projectConfig.packages) {
            const packageConfig = projectConfig.packages[packageNameAndVersion];
            if (packageConfig) {
                const [packageName, versionRange = '*'] = this.splitNameAndVersion(packageNameAndVersion);
                const packageConfigs = processedConfig.packages[packageName] || (processedConfig.packages[packageName] = []);
                packageConfigs.push(Object.assign(Object.assign({}, packageConfig), { versionRange }));
            }
        }
        // hash algorithm config
        if (projectConfig.hashAlgorithm !== undefined) {
            processedConfig.hashAlgorithm = projectConfig.hashAlgorithm;
        }
        return processedConfig;
    }
    loadProjectConfig(baseDir) {
        const configFilePath = this.fs.join(baseDir, NGCC_CONFIG_FILENAME);
        if (this.fs.exists(configFilePath)) {
            try {
                return this.evalSrcFile(configFilePath);
            }
            catch (e) {
                throw new Error(`Invalid project configuration file at "${configFilePath}": ` + e.message);
            }
        }
        else {
            return { packages: {} };
        }
    }
    loadPackageConfig(packagePath, version) {
        const configFilePath = this.fs.join(packagePath, NGCC_CONFIG_FILENAME);
        if (this.fs.exists(configFilePath)) {
            try {
                const packageConfig = this.evalSrcFile(configFilePath);
                return Object.assign(Object.assign({}, packageConfig), { versionRange: version || '*' });
            }
            catch (e) {
                throw new Error(`Invalid package configuration file at "${configFilePath}": ` + e.message);
            }
        }
        else {
            return null;
        }
    }
    evalSrcFile(srcPath) {
        const src = this.fs.readFile(srcPath);
        const theExports = {};
        const sandbox = {
            module: { exports: theExports },
            exports: theExports,
            require,
            __dirname: this.fs.dirname(srcPath),
            __filename: srcPath
        };
        vm.runInNewContext(src, sandbox, { filename: srcPath });
        return sandbox.module.exports;
    }
    splitNameAndVersion(packageNameAndVersion) {
        const versionIndex = packageNameAndVersion.lastIndexOf('@');
        // Note that > 0 is because we don't want to match @ at the start of the line
        // which is what you would have with a namespaced package, e.g. `@angular/common`.
        return versionIndex > 0 ?
            [
                packageNameAndVersion.substring(0, versionIndex),
                packageNameAndVersion.substring(versionIndex + 1),
            ] :
            [packageNameAndVersion, undefined];
    }
    computeHash() {
        return createHash(this.hashAlgorithm).update(JSON.stringify(this.projectConfig)).digest('hex');
    }
}
function findSatisfactoryVersion(configs, version) {
    if (configs === undefined) {
        return null;
    }
    if (version === null) {
        // The package has no version (!) - perhaps the entry-point was from a deep import, which made
        // it impossible to find the package.json.
        // So just return the first config that matches the package name.
        return configs[0];
    }
    return configs.find(config => satisfies(version, config.versionRange, { includePrerelease: true })) ||
        null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUNILE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxRQUFRLENBQUM7QUFDbEMsT0FBTyxFQUFDLFNBQVMsRUFBQyxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQWlHekI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQkc7QUFDSCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBc0I7SUFDcEQsUUFBUSxFQUFFO1FBQ1IsdURBQXVEO1FBQ3ZELDRCQUE0QjtRQUM1QixtQkFBbUI7UUFDbkIsK0NBQStDO1FBQy9DLE9BQU87UUFDUCxLQUFLO1FBRUwsZ0dBQWdHO1FBQ2hHLHlGQUF5RjtRQUN6Riw0Q0FBNEM7UUFDNUMscUJBQXFCLEVBQUU7WUFDckIsV0FBVyxFQUFFO2dCQUNYLEdBQUcsRUFBRTtvQkFDSCxRQUFRLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLFlBQVk7cUJBQ25CO2lCQUNGO2FBQ0Y7U0FDRjtRQUVELGdHQUFnRztRQUNoRyxzRkFBc0Y7UUFDdEYsa0NBQWtDO1FBQ2xDLGFBQWEsRUFBRTtZQUNiLFdBQVcsRUFBRTtnQkFDWCxRQUFRLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDO2FBQ3pCO1NBQ0Y7S0FDRjtJQUNELE9BQU8sRUFBRTtRQUNQLFVBQVUsRUFBRSxHQUFHO1FBQ2YsYUFBYSxFQUFFLEdBQUc7S0FDbkI7Q0FDRixDQUFDO0FBRUYsTUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQztBQUU5Qzs7R0FFRztBQUNILE1BQU0sT0FBTywwQkFBMEI7SUF1QnJDLFlBQVksRUFBb0IsRUFBRSxXQUEy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LFlBQVksR0FBRyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUQsNkVBQTZFO1FBQzdFLGtGQUFrRjtRQUNsRixPQUFPLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyQjtnQkFDRSxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQztnQkFDaEQscUJBQXFCLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7YUFDbEQsQ0FBQyxDQUFDO1lBQ0gsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRU8sV0FBVztRQUNqQixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pHLENBQUM7Q0FDRjtBQUVELFNBQVMsdUJBQXVCLENBQUMsT0FBMkMsRUFBRSxPQUFvQjtJQUVoRyxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7UUFDekIsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUNELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtRQUNwQiw4RkFBOEY7UUFDOUYsMENBQTBDO1FBQzFDLGlFQUFpRTtRQUNqRSxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNuQjtJQUNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FDUixNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFDLGlCQUFpQixFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDcEYsSUFBSSxDQUFDO0FBQ1gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjcmVhdGVIYXNofSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHtzYXRpc2ZpZXN9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgKiBhcyB2bSBmcm9tICd2bSc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIFBhdGhNYW5pcHVsYXRpb24sIFJlYWRvbmx5RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXB9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG4vKipcbiAqIFRoZSBmb3JtYXQgb2YgYSBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjUHJvamVjdENvbmZpZzxUID0gUmF3TmdjY1BhY2thZ2VDb25maWc+IHtcbiAgLyoqXG4gICAqIFRoZSBwYWNrYWdlcyB0aGF0IGFyZSBjb25maWd1cmVkIGJ5IHRoaXMgcHJvamVjdCBjb25maWcuXG4gICAqL1xuICBwYWNrYWdlcz86IHtbcGFja2FnZVBhdGg6IHN0cmluZ106IFR8dW5kZWZpbmVkfTtcbiAgLyoqXG4gICAqIE9wdGlvbnMgdGhhdCBjb250cm9sIGhvdyBsb2NraW5nIHRoZSBwcm9jZXNzIGlzIGhhbmRsZWQuXG4gICAqL1xuICBsb2NraW5nPzogUHJvY2Vzc0xvY2tpbmdDb25maWd1cmF0aW9uO1xuICAvKipcbiAgICogTmFtZSBvZiBoYXNoIGFsZ29yaXRobSB1c2VkIHRvIGdlbmVyYXRlIGhhc2hlcyBvZiB0aGUgY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYHNoYTI1NmAuXG4gICAqL1xuICBoYXNoQWxnb3JpdGhtPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgdGhhdCBjb250cm9sIGhvdyBsb2NraW5nIHRoZSBwcm9jZXNzIGlzIGhhbmRsZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJvY2Vzc0xvY2tpbmdDb25maWd1cmF0aW9uIHtcbiAgLyoqXG4gICAqIFRoZSBudW1iZXIgb2YgdGltZXMgdGhlIEFzeW5jTG9ja2VyIHdpbGwgYXR0ZW1wdCB0byBsb2NrIHRoZSBwcm9jZXNzIGJlZm9yZSBmYWlsaW5nLlxuICAgKiBEZWZhdWx0cyB0byA1MDAuXG4gICAqL1xuICByZXRyeUF0dGVtcHRzPzogbnVtYmVyO1xuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgYmV0d2VlbiBhdHRlbXB0cyB0byBsb2NrIHRoZSBwcm9jZXNzLlxuICAgKiBEZWZhdWx0cyB0byA1MDBtcy5cbiAgICogKi9cbiAgcmV0cnlEZWxheT86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBUaGUgcmF3IGZvcm1hdCBvZiBhIHBhY2thZ2UgbGV2ZWwgY29uZmlndXJhdGlvbiAoYXMgaXQgYXBwZWFycyBpbiBjb25maWd1cmF0aW9uIGZpbGVzKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSYXdOZ2NjUGFja2FnZUNvbmZpZyB7XG4gIC8qKlxuICAgKiBUaGUgZW50cnktcG9pbnRzIHRvIGNvbmZpZ3VyZSBmb3IgdGhpcyBwYWNrYWdlLlxuICAgKlxuICAgKiBJbiB0aGUgY29uZmlnIGZpbGUgdGhlIGtleXMgYXJlIHBhdGhzIHJlbGF0aXZlIHRvIHRoZSBwYWNrYWdlIHBhdGguXG4gICAqL1xuICBlbnRyeVBvaW50cz86IHtbZW50cnlQb2ludFBhdGg6IHN0cmluZ106IE5nY2NFbnRyeVBvaW50Q29uZmlnfTtcblxuICAvKipcbiAgICogQSBjb2xsZWN0aW9uIG9mIHJlZ2V4ZXMgdGhhdCBtYXRjaCBkZWVwIGltcG9ydHMgdG8gaWdub3JlLCBmb3IgdGhpcyBwYWNrYWdlLCByYXRoZXIgdGhhblxuICAgKiBkaXNwbGF5aW5nIGEgd2FybmluZy5cbiAgICovXG4gIGlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVycz86IFJlZ0V4cFtdO1xufVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgYW4gZW50cnktcG9pbnQuXG4gKlxuICogVGhlIGV4aXN0ZW5jZSBvZiBhIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGF0aCB0ZWxscyBuZ2NjIHRoYXQgdGhpcyBzaG91bGQgYmUgY29uc2lkZXJlZCBmb3JcbiAqIHByb2Nlc3NpbmcgYXMgYW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY0VudHJ5UG9pbnRDb25maWcge1xuICAvKiogRG8gbm90IHByb2Nlc3MgKG9yIGV2ZW4gYWNrbm93bGVkZ2UgdGhlIGV4aXN0ZW5jZSBvZikgdGhpcyBlbnRyeS1wb2ludCwgaWYgdHJ1ZS4gKi9cbiAgaWdub3JlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhpcyBwcm9wZXJ0eSwgaWYgcHJvdmlkZWQsIGhvbGRzIHZhbHVlcyB0aGF0IHdpbGwgb3ZlcnJpZGUgZXF1aXZhbGVudCBwcm9wZXJ0aWVzIGluIGFuXG4gICAqIGVudHJ5LXBvaW50J3MgcGFja2FnZS5qc29uIGZpbGUuXG4gICAqL1xuICBvdmVycmlkZT86IFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcDtcblxuICAvKipcbiAgICogTm9ybWFsbHksIG5nY2Mgd2lsbCBza2lwIGNvbXBpbGF0aW9uIG9mIGVudHJ5cG9pbnRzIHRoYXQgY29udGFpbiBpbXBvcnRzIHRoYXQgY2FuJ3QgYmUgcmVzb2x2ZWRcbiAgICogb3IgdW5kZXJzdG9vZC4gSWYgdGhpcyBvcHRpb24gaXMgc3BlY2lmaWVkLCBuZ2NjIHdpbGwgcHJvY2VlZCB3aXRoIGNvbXBpbGluZyB0aGUgZW50cnlwb2ludFxuICAgKiBldmVuIGluIHRoZSBmYWNlIG9mIHN1Y2ggbWlzc2luZyBkZXBlbmRlbmNpZXMuXG4gICAqL1xuICBpZ25vcmVNaXNzaW5nRGVwZW5kZW5jaWVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRW5hYmxpbmcgdGhpcyBvcHRpb24gZm9yIGFuIGVudHJ5cG9pbnQgdGVsbHMgbmdjYyB0aGF0IGRlZXAgaW1wb3J0cyBtaWdodCBiZSB1c2VkIGZvciB0aGUgZmlsZXNcbiAgICogaXQgY29udGFpbnMsIGFuZCB0aGF0IGl0IHNob3VsZCBnZW5lcmF0ZSBwcml2YXRlIHJlLWV4cG9ydHMgYWxvbmdzaWRlIHRoZSBOZ01vZHVsZSBvZiBhbGwgdGhlXG4gICAqIGRpcmVjdGl2ZXMvcGlwZXMgaXQgbWFrZXMgYXZhaWxhYmxlIGluIHN1cHBvcnQgb2YgdGhvc2UgaW1wb3J0cy5cbiAgICovXG4gIGdlbmVyYXRlRGVlcFJlZXhwb3J0cz86IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnIGV4dGVuZHMgUmF3TmdjY1BhY2thZ2VDb25maWcge1xuICB2ZXJzaW9uUmFuZ2U6IHN0cmluZztcbn1cblxudHlwZSBQYXJ0aWFsbHlQcm9jZXNzZWRDb25maWcgPSBSZXF1aXJlZDxOZ2NjUHJvamVjdENvbmZpZzxWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW10+PjtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBuZ2NjLlxuICpcbiAqIFRoaXMgaXMgdGhlIHVsdGltYXRlIGZhbGxiYWNrIGNvbmZpZ3VyYXRpb24gdGhhdCBuZ2NjIHdpbGwgdXNlIGlmIHRoZXJlIGlzIG5vIGNvbmZpZ3VyYXRpb25cbiAqIGZvciBhIHBhY2thZ2UgYXQgdGhlIHBhY2thZ2UgbGV2ZWwgb3IgcHJvamVjdCBsZXZlbC5cbiAqXG4gKiBUaGlzIGNvbmZpZ3VyYXRpb24gaXMgZm9yIHBhY2thZ2VzIHRoYXQgYXJlIFwiZGVhZFwiIC0gaS5lLiBubyBsb25nZXIgbWFpbnRhaW5lZCBhbmQgc28gYXJlXG4gKiB1bmxpa2VseSB0byBiZSBmaXhlZCB0byB3b3JrIHdpdGggbmdjYywgbm9yIHByb3ZpZGUgYSBwYWNrYWdlIGxldmVsIGNvbmZpZyBvZiB0aGVpciBvd24uXG4gKlxuICogVGhlIGZhbGxiYWNrIHByb2Nlc3MgZm9yIGxvb2tpbmcgdXAgY29uZmlndXJhdGlvbiBpczpcbiAqXG4gKiBQcm9qZWN0IC0+IFBhY2thZ2UgLT4gRGVmYXVsdFxuICpcbiAqIElmIGEgcGFja2FnZSBwcm92aWRlcyBpdHMgb3duIGNvbmZpZ3VyYXRpb24gdGhlbiB0aGF0IHdvdWxkIG92ZXJyaWRlIHRoaXMgZGVmYXVsdCBvbmUuXG4gKlxuICogQWxzbyBhcHBsaWNhdGlvbiBkZXZlbG9wZXJzIGNhbiBhbHdheXMgcHJvdmlkZSBjb25maWd1cmF0aW9uIGF0IHRoZWlyIHByb2plY3QgbGV2ZWwgd2hpY2hcbiAqIHdpbGwgb3ZlcnJpZGUgZXZlcnl0aGluZyBlbHNlLlxuICpcbiAqIE5vdGUgdGhhdCB0aGUgZmFsbGJhY2sgaXMgcGFja2FnZSBiYXNlZCBub3QgZW50cnktcG9pbnQgYmFzZWQuXG4gKiBGb3IgZXhhbXBsZSwgaWYgYSB0aGVyZSBpcyBjb25maWd1cmF0aW9uIGZvciBhIHBhY2thZ2UgYXQgdGhlIHByb2plY3QgbGV2ZWwgdGhpcyB3aWxsIHJlcGxhY2UgYWxsXG4gKiBlbnRyeS1wb2ludCBjb25maWd1cmF0aW9ucyB0aGF0IG1heSBoYXZlIGJlZW4gcHJvdmlkZWQgaW4gdGhlIHBhY2thZ2UgbGV2ZWwgb3IgZGVmYXVsdCBsZXZlbFxuICogY29uZmlndXJhdGlvbnMsIGV2ZW4gaWYgdGhlIHByb2plY3QgbGV2ZWwgY29uZmlndXJhdGlvbiBkb2VzIG5vdCBwcm92aWRlIGZvciBhIGdpdmVuIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9OR0NDX0NPTkZJRzogTmdjY1Byb2plY3RDb25maWcgPSB7XG4gIHBhY2thZ2VzOiB7XG4gICAgLy8gQWRkIGRlZmF1bHQgcGFja2FnZSBjb25maWd1cmF0aW9uIGhlcmUuIEZvciBleGFtcGxlOlxuICAgIC8vICdAYW5ndWxhci9maXJlQF41LjIuMCc6IHtcbiAgICAvLyAgIGVudHJ5UG9pbnRzOiB7XG4gICAgLy8gICAgICcuL2RhdGFiYXNlLWRlcHJlY2F0ZWQnOiB7aWdub3JlOiB0cnVlfSxcbiAgICAvLyAgIH0sXG4gICAgLy8gfSxcblxuICAgIC8vIFRoZSBwYWNrYWdlIGRvZXMgbm90IGNvbnRhaW4gYW55IGAubWV0YWRhdGEuanNvbmAgZmlsZXMgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IGJ1dCBvbmx5IGluc2lkZVxuICAgIC8vIGBkaXN0L2AuIFdpdGhvdXQgdGhpcyBjb25maWcsIG5nY2MgZG9lcyBub3QgcmVhbGl6ZSB0aGlzIGlzIGEgVmlld0VuZ2luZS1idWlsdCBBbmd1bGFyXG4gICAgLy8gcGFja2FnZSB0aGF0IG5lZWRzIHRvIGJlIGNvbXBpbGVkIHRvIEl2eS5cbiAgICAnYW5ndWxhcjItaGlnaGNoYXJ0cyc6IHtcbiAgICAgIGVudHJ5UG9pbnRzOiB7XG4gICAgICAgICcuJzoge1xuICAgICAgICAgIG92ZXJyaWRlOiB7XG4gICAgICAgICAgICBtYWluOiAnLi9pbmRleC5qcycsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFRoZSBgZGlzdC9gIGRpcmVjdG9yeSBoYXMgYSBkdXBsaWNhdGUgYHBhY2thZ2UuanNvbmAgcG9pbnRpbmcgdG8gdGhlIHNhbWUgZmlsZXMsIHdoaWNoICh1bmRlclxuICAgIC8vIGNlcnRhaW4gY29uZmlndXJhdGlvbnMpIGNhbiBjYXVzZXMgbmdjYyB0byB0cnkgdG8gcHJvY2VzcyB0aGUgZmlsZXMgdHdpY2UgYW5kIGZhaWwuXG4gICAgLy8gSWdub3JlIHRoZSBgZGlzdC9gIGVudHJ5LXBvaW50LlxuICAgICduZzItZHJhZ3VsYSc6IHtcbiAgICAgIGVudHJ5UG9pbnRzOiB7XG4gICAgICAgICcuL2Rpc3QnOiB7aWdub3JlOiB0cnVlfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgbG9ja2luZzoge1xuICAgIHJldHJ5RGVsYXk6IDUwMCxcbiAgICByZXRyeUF0dGVtcHRzOiA1MDAsXG4gIH1cbn07XG5cbmNvbnN0IE5HQ0NfQ09ORklHX0ZJTEVOQU1FID0gJ25nY2MuY29uZmlnLmpzJztcblxuLyoqXG4gKiBUaGUgcHJvY2Vzc2VkIHBhY2thZ2UgbGV2ZWwgY29uZmlndXJhdGlvbiBhcyBhIHJlc3VsdCBvZiBwcm9jZXNzaW5nIGEgcmF3IHBhY2thZ2UgbGV2ZWwgY29uZmlnLlxuICovXG5leHBvcnQgY2xhc3MgUHJvY2Vzc2VkTmdjY1BhY2thZ2VDb25maWcgaW1wbGVtZW50cyBPbWl0PFJhd05nY2NQYWNrYWdlQ29uZmlnLCAnZW50cnlQb2ludHMnPiB7XG4gIC8qKlxuICAgKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGlzIGluc3RhbmNlIG9mIHRoZSBwYWNrYWdlLlxuICAgKiBOb3RlIHRoYXQgdGhlcmUgbWF5IGJlIG11bHRpcGxlIGluc3RhbmNlcyBvZiBhIHBhY2thZ2UgaW5zaWRlIGEgcHJvamVjdCBpbiBuZXN0ZWRcbiAgICogYG5vZGVfbW9kdWxlcy9gLiBGb3IgZXhhbXBsZSwgb25lIGF0IGA8cHJvamVjdC1yb290Pi9ub2RlX21vZHVsZXMvc29tZS1wYWNrYWdlL2AgYW5kIG9uZSBhdFxuICAgKiBgPHByb2plY3Qtcm9vdD4vbm9kZV9tb2R1bGVzL290aGVyLXBhY2thZ2Uvbm9kZV9tb2R1bGVzL3NvbWUtcGFja2FnZS9gLlxuICAgKi9cbiAgcGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoO1xuXG4gIC8qKlxuICAgKiBUaGUgZW50cnktcG9pbnRzIHRvIGNvbmZpZ3VyZSBmb3IgdGhpcyBwYWNrYWdlLlxuICAgKlxuICAgKiBJbiBjb250cmFzdCB0byBgUmF3TmdjY1BhY2thZ2VDb25maWdgLCB0aGUgcGF0aHMgYXJlIGFic29sdXRlIGFuZCB0YWtlIHRoZSBwYXRoIG9mIHRoZSBzcGVjaWZpY1xuICAgKiBpbnN0YW5jZSBvZiB0aGUgcGFja2FnZSBpbnRvIGFjY291bnQuXG4gICAqL1xuICBlbnRyeVBvaW50czogTWFwPEFic29sdXRlRnNQYXRoLCBOZ2NjRW50cnlQb2ludENvbmZpZz47XG5cbiAgLyoqXG4gICAqIEEgY29sbGVjdGlvbiBvZiByZWdleGVzIHRoYXQgbWF0Y2ggZGVlcCBpbXBvcnRzIHRvIGlnbm9yZSwgZm9yIHRoaXMgcGFja2FnZSwgcmF0aGVyIHRoYW5cbiAgICogZGlzcGxheWluZyBhIHdhcm5pbmcuXG4gICAqL1xuICBpZ25vcmFibGVEZWVwSW1wb3J0TWF0Y2hlcnM6IFJlZ0V4cFtdO1xuXG4gIGNvbnN0cnVjdG9yKGZzOiBQYXRoTWFuaXB1bGF0aW9uLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHtcbiAgICBlbnRyeVBvaW50cyA9IHt9LFxuICAgIGlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVycyA9IFtdLFxuICB9OiBSYXdOZ2NjUGFja2FnZUNvbmZpZykge1xuICAgIGNvbnN0IGFic29sdXRlUGF0aEVudHJpZXM6IFtBYnNvbHV0ZUZzUGF0aCwgTmdjY0VudHJ5UG9pbnRDb25maWddW10gPVxuICAgICAgICBPYmplY3QuZW50cmllcyhlbnRyeVBvaW50cykubWFwKChbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZVBhdGgsIGNvbmZpZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pID0+IFtmcy5yZXNvbHZlKHBhY2thZ2VQYXRoLCByZWxhdGl2ZVBhdGgpLCBjb25maWddKTtcblxuICAgIHRoaXMucGFja2FnZVBhdGggPSBwYWNrYWdlUGF0aDtcbiAgICB0aGlzLmVudHJ5UG9pbnRzID0gbmV3IE1hcChhYnNvbHV0ZVBhdGhFbnRyaWVzKTtcbiAgICB0aGlzLmlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVycyA9IGlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVycztcbiAgfVxufVxuXG4vKipcbiAqIE5nY2MgaGFzIGEgaGllcmFyY2hpY2FsIGNvbmZpZ3VyYXRpb24gc3lzdGVtIHRoYXQgbGV0cyB1cyBcImZpeCB1cFwiIHBhY2thZ2VzIHRoYXQgZG8gbm90XG4gKiB3b3JrIHdpdGggbmdjYyBvdXQgb2YgdGhlIGJveC5cbiAqXG4gKiBUaGVyZSBhcmUgdGhyZWUgbGV2ZWxzIGF0IHdoaWNoIGNvbmZpZ3VyYXRpb24gY2FuIGJlIGRlY2xhcmVkOlxuICpcbiAqICogRGVmYXVsdCBsZXZlbCAtIG5nY2MgY29tZXMgd2l0aCBidWlsdC1pbiBjb25maWd1cmF0aW9uIGZvciB3ZWxsIGtub3duIGNhc2VzLlxuICogKiBQYWNrYWdlIGxldmVsIC0gYSBsaWJyYXJ5IGF1dGhvciBwdWJsaXNoZXMgYSBjb25maWd1cmF0aW9uIHdpdGggdGhlaXIgcGFja2FnZSB0byBmaXgga25vd25cbiAqICAgaXNzdWVzLlxuICogKiBQcm9qZWN0IGxldmVsIC0gdGhlIGFwcGxpY2F0aW9uIGRldmVsb3BlciBwcm92aWRlcyBhIGNvbmZpZ3VyYXRpb24gdGhhdCBmaXhlcyBpc3N1ZXMgc3BlY2lmaWNcbiAqICAgdG8gdGhlIGxpYnJhcmllcyB1c2VkIGluIHRoZWlyIGFwcGxpY2F0aW9uLlxuICpcbiAqIE5nY2Mgd2lsbCBtYXRjaCBjb25maWd1cmF0aW9uIGJhc2VkIG9uIHRoZSBwYWNrYWdlIG5hbWUgYnV0IGFsc28gb24gaXRzIHZlcnNpb24uIFRoaXMgYWxsb3dzXG4gKiBjb25maWd1cmF0aW9uIHRvIHByb3ZpZGUgZGlmZmVyZW50IGZpeGVzIHRvIGRpZmZlcmVudCB2ZXJzaW9uIHJhbmdlcyBvZiBhIHBhY2thZ2UuXG4gKlxuICogKiBQYWNrYWdlIGxldmVsIGNvbmZpZ3VyYXRpb24gaXMgc3BlY2lmaWMgdG8gdGhlIHBhY2thZ2UgdmVyc2lvbiB3aGVyZSB0aGUgY29uZmlndXJhdGlvbiBpc1xuICogICBmb3VuZC5cbiAqICogRGVmYXVsdCBhbmQgcHJvamVjdCBsZXZlbCBjb25maWd1cmF0aW9uIHNob3VsZCBwcm92aWRlIHZlcnNpb24gcmFuZ2VzIHRvIGVuc3VyZSB0aGF0IHRoZVxuICogICBjb25maWd1cmF0aW9uIGlzIG9ubHkgYXBwbGllZCB0byB0aGUgYXBwcm9wcmlhdGUgdmVyc2lvbnMgb2YgYSBwYWNrYWdlLlxuICpcbiAqIFdoZW4gZ2V0dGluZyBhIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSAodmlhIGBnZXRDb25maWcoKWApIHRoZSBjYWxsZXIgc2hvdWxkIHByb3ZpZGUgdGhlXG4gKiB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIGluIHF1ZXN0aW9uLCBpZiBhdmFpbGFibGUuIElmIGl0IGlzIG5vdCBwcm92aWRlZCB0aGVuIHRoZSBmaXJzdCBhdmFpbGFibGVcbiAqIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSBpcyByZXR1cm5lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nY2NDb25maWd1cmF0aW9uIHtcbiAgcHJpdmF0ZSBkZWZhdWx0Q29uZmlnOiBQYXJ0aWFsbHlQcm9jZXNzZWRDb25maWc7XG4gIHByaXZhdGUgcHJvamVjdENvbmZpZzogUGFydGlhbGx5UHJvY2Vzc2VkQ29uZmlnO1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFZlcnNpb25lZFBhY2thZ2VDb25maWc+KCk7XG4gIHJlYWRvbmx5IGhhc2g6IHN0cmluZztcbiAgcmVhZG9ubHkgaGFzaEFsZ29yaXRobTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IFJlYWRvbmx5RmlsZVN5c3RlbSwgYmFzZURpcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICB0aGlzLmRlZmF1bHRDb25maWcgPSB0aGlzLnByb2Nlc3NQcm9qZWN0Q29uZmlnKERFRkFVTFRfTkdDQ19DT05GSUcpO1xuICAgIHRoaXMucHJvamVjdENvbmZpZyA9IHRoaXMucHJvY2Vzc1Byb2plY3RDb25maWcodGhpcy5sb2FkUHJvamVjdENvbmZpZyhiYXNlRGlyKSk7XG4gICAgdGhpcy5oYXNoQWxnb3JpdGhtID0gdGhpcy5wcm9qZWN0Q29uZmlnLmhhc2hBbGdvcml0aG07XG4gICAgdGhpcy5oYXNoID0gdGhpcy5jb21wdXRlSGFzaCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBsb2NraW5nIHRoZSBuZ2NjIHByb2Nlc3MuXG4gICAqL1xuICBnZXRMb2NraW5nQ29uZmlnKCk6IFJlcXVpcmVkPFByb2Nlc3NMb2NraW5nQ29uZmlndXJhdGlvbj4ge1xuICAgIGxldCB7cmV0cnlBdHRlbXB0cywgcmV0cnlEZWxheX0gPSB0aGlzLnByb2plY3RDb25maWcubG9ja2luZztcbiAgICBpZiAocmV0cnlBdHRlbXB0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXRyeUF0dGVtcHRzID0gdGhpcy5kZWZhdWx0Q29uZmlnLmxvY2tpbmcucmV0cnlBdHRlbXB0cyE7XG4gICAgfVxuICAgIGlmIChyZXRyeURlbGF5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHJ5RGVsYXkgPSB0aGlzLmRlZmF1bHRDb25maWcubG9ja2luZy5yZXRyeURlbGF5ITtcbiAgICB9XG4gICAgcmV0dXJuIHtyZXRyeUF0dGVtcHRzLCByZXRyeURlbGF5fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBjb25maWd1cmF0aW9uIGZvciB0aGUgZ2l2ZW4gYHZlcnNpb25gIG9mIGEgcGFja2FnZSBhdCBgcGFja2FnZVBhdGhgLlxuICAgKlxuICAgKiBAcGFyYW0gcGFja2FnZU5hbWUgVGhlIG5hbWUgb2YgdGhlIHBhY2thZ2Ugd2hvc2UgY29uZmlnIHdlIHdhbnQuXG4gICAqIEBwYXJhbSBwYWNrYWdlUGF0aCBUaGUgcGF0aCB0byB0aGUgcGFja2FnZSB3aG9zZSBjb25maWcgd2Ugd2FudC5cbiAgICogQHBhcmFtIHZlcnNpb24gVGhlIHZlcnNpb24gb2YgdGhlIHBhY2thZ2Ugd2hvc2UgY29uZmlnIHdlIHdhbnQsIG9yIGBudWxsYCBpZiB0aGUgcGFja2FnZSdzXG4gICAqIHBhY2thZ2UuanNvbiBkaWQgbm90IGV4aXN0IG9yIHdhcyBpbnZhbGlkLlxuICAgKi9cbiAgZ2V0UGFja2FnZUNvbmZpZyhwYWNrYWdlTmFtZTogc3RyaW5nLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHZlcnNpb246IHN0cmluZ3xudWxsKTpcbiAgICAgIFByb2Nlc3NlZE5nY2NQYWNrYWdlQ29uZmlnIHtcbiAgICBjb25zdCByYXdQYWNrYWdlQ29uZmlnID0gdGhpcy5nZXRSYXdQYWNrYWdlQ29uZmlnKHBhY2thZ2VOYW1lLCBwYWNrYWdlUGF0aCwgdmVyc2lvbik7XG4gICAgcmV0dXJuIG5ldyBQcm9jZXNzZWROZ2NjUGFja2FnZUNvbmZpZyh0aGlzLmZzLCBwYWNrYWdlUGF0aCwgcmF3UGFja2FnZUNvbmZpZyk7XG4gIH1cblxuICBwcml2YXRlIGdldFJhd1BhY2thZ2VDb25maWcoXG4gICAgICBwYWNrYWdlTmFtZTogc3RyaW5nLCBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6IFZlcnNpb25lZFBhY2thZ2VDb25maWcge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gcGFja2FnZU5hbWUgKyAodmVyc2lvbiAhPT0gbnVsbCA/IGBAJHt2ZXJzaW9ufWAgOiAnJyk7XG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKGNhY2hlS2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KGNhY2hlS2V5KSE7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdExldmVsQ29uZmlnID0gdGhpcy5wcm9qZWN0Q29uZmlnLnBhY2thZ2VzID9cbiAgICAgICAgZmluZFNhdGlzZmFjdG9yeVZlcnNpb24odGhpcy5wcm9qZWN0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VOYW1lXSwgdmVyc2lvbikgOlxuICAgICAgICBudWxsO1xuICAgIGlmIChwcm9qZWN0TGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBwcm9qZWN0TGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIHByb2plY3RMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlTGV2ZWxDb25maWcgPSB0aGlzLmxvYWRQYWNrYWdlQ29uZmlnKHBhY2thZ2VQYXRoLCB2ZXJzaW9uKTtcbiAgICBpZiAocGFja2FnZUxldmVsQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChjYWNoZUtleSwgcGFja2FnZUxldmVsQ29uZmlnKTtcbiAgICAgIHJldHVybiBwYWNrYWdlTGV2ZWxDb25maWc7XG4gICAgfVxuXG4gICAgY29uc3QgZGVmYXVsdExldmVsQ29uZmlnID0gdGhpcy5kZWZhdWx0Q29uZmlnLnBhY2thZ2VzID9cbiAgICAgICAgZmluZFNhdGlzZmFjdG9yeVZlcnNpb24odGhpcy5kZWZhdWx0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VOYW1lXSwgdmVyc2lvbikgOlxuICAgICAgICBudWxsO1xuICAgIGlmIChkZWZhdWx0TGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBkZWZhdWx0TGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIGRlZmF1bHRMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICByZXR1cm4ge3ZlcnNpb25SYW5nZTogJyonfTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc1Byb2plY3RDb25maWcocHJvamVjdENvbmZpZzogTmdjY1Byb2plY3RDb25maWcpOiBQYXJ0aWFsbHlQcm9jZXNzZWRDb25maWcge1xuICAgIGNvbnN0IHByb2Nlc3NlZENvbmZpZzpcbiAgICAgICAgUGFydGlhbGx5UHJvY2Vzc2VkQ29uZmlnID0ge3BhY2thZ2VzOiB7fSwgbG9ja2luZzoge30sIGhhc2hBbGdvcml0aG06ICdzaGEyNTYnfTtcblxuICAgIC8vIGxvY2tpbmcgY29uZmlndXJhdGlvblxuICAgIGlmIChwcm9qZWN0Q29uZmlnLmxvY2tpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcHJvY2Vzc2VkQ29uZmlnLmxvY2tpbmcgPSBwcm9qZWN0Q29uZmlnLmxvY2tpbmc7XG4gICAgfVxuXG4gICAgLy8gcGFja2FnZXMgY29uZmlndXJhdGlvblxuICAgIGZvciAoY29uc3QgcGFja2FnZU5hbWVBbmRWZXJzaW9uIGluIHByb2plY3RDb25maWcucGFja2FnZXMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VDb25maWcgPSBwcm9qZWN0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VOYW1lQW5kVmVyc2lvbl07XG4gICAgICBpZiAocGFja2FnZUNvbmZpZykge1xuICAgICAgICBjb25zdCBbcGFja2FnZU5hbWUsIHZlcnNpb25SYW5nZSA9ICcqJ10gPSB0aGlzLnNwbGl0TmFtZUFuZFZlcnNpb24ocGFja2FnZU5hbWVBbmRWZXJzaW9uKTtcbiAgICAgICAgY29uc3QgcGFja2FnZUNvbmZpZ3MgPVxuICAgICAgICAgICAgcHJvY2Vzc2VkQ29uZmlnLnBhY2thZ2VzW3BhY2thZ2VOYW1lXSB8fCAocHJvY2Vzc2VkQ29uZmlnLnBhY2thZ2VzW3BhY2thZ2VOYW1lXSA9IFtdKTtcbiAgICAgICAgcGFja2FnZUNvbmZpZ3MhLnB1c2goey4uLnBhY2thZ2VDb25maWcsIHZlcnNpb25SYW5nZX0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGhhc2ggYWxnb3JpdGhtIGNvbmZpZ1xuICAgIGlmIChwcm9qZWN0Q29uZmlnLmhhc2hBbGdvcml0aG0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgcHJvY2Vzc2VkQ29uZmlnLmhhc2hBbGdvcml0aG0gPSBwcm9qZWN0Q29uZmlnLmhhc2hBbGdvcml0aG07XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2Nlc3NlZENvbmZpZztcbiAgfVxuXG4gIHByaXZhdGUgbG9hZFByb2plY3RDb25maWcoYmFzZURpcjogQWJzb2x1dGVGc1BhdGgpOiBOZ2NjUHJvamVjdENvbmZpZyB7XG4gICAgY29uc3QgY29uZmlnRmlsZVBhdGggPSB0aGlzLmZzLmpvaW4oYmFzZURpciwgTkdDQ19DT05GSUdfRklMRU5BTUUpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhjb25maWdGaWxlUGF0aCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0aGlzLmV2YWxTcmNGaWxlKGNvbmZpZ0ZpbGVQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHByb2plY3QgY29uZmlndXJhdGlvbiBmaWxlIGF0IFwiJHtjb25maWdGaWxlUGF0aH1cIjogYCArIGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7cGFja2FnZXM6IHt9fTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGxvYWRQYWNrYWdlQ29uZmlnKHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgdmVyc2lvbjogc3RyaW5nfG51bGwpOlxuICAgICAgVmVyc2lvbmVkUGFja2FnZUNvbmZpZ3xudWxsIHtcbiAgICBjb25zdCBjb25maWdGaWxlUGF0aCA9IHRoaXMuZnMuam9pbihwYWNrYWdlUGF0aCwgTkdDQ19DT05GSUdfRklMRU5BTUUpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhjb25maWdGaWxlUGF0aCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VDb25maWcgPSB0aGlzLmV2YWxTcmNGaWxlKGNvbmZpZ0ZpbGVQYXRoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5wYWNrYWdlQ29uZmlnLFxuICAgICAgICAgIHZlcnNpb25SYW5nZTogdmVyc2lvbiB8fCAnKicsXG4gICAgICAgIH07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwYWNrYWdlIGNvbmZpZ3VyYXRpb24gZmlsZSBhdCBcIiR7Y29uZmlnRmlsZVBhdGh9XCI6IGAgKyBlLm1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV2YWxTcmNGaWxlKHNyY1BhdGg6IEFic29sdXRlRnNQYXRoKTogYW55IHtcbiAgICBjb25zdCBzcmMgPSB0aGlzLmZzLnJlYWRGaWxlKHNyY1BhdGgpO1xuICAgIGNvbnN0IHRoZUV4cG9ydHMgPSB7fTtcbiAgICBjb25zdCBzYW5kYm94ID0ge1xuICAgICAgbW9kdWxlOiB7ZXhwb3J0czogdGhlRXhwb3J0c30sXG4gICAgICBleHBvcnRzOiB0aGVFeHBvcnRzLFxuICAgICAgcmVxdWlyZSxcbiAgICAgIF9fZGlybmFtZTogdGhpcy5mcy5kaXJuYW1lKHNyY1BhdGgpLFxuICAgICAgX19maWxlbmFtZTogc3JjUGF0aFxuICAgIH07XG4gICAgdm0ucnVuSW5OZXdDb250ZXh0KHNyYywgc2FuZGJveCwge2ZpbGVuYW1lOiBzcmNQYXRofSk7XG4gICAgcmV0dXJuIHNhbmRib3gubW9kdWxlLmV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIHNwbGl0TmFtZUFuZFZlcnNpb24ocGFja2FnZU5hbWVBbmRWZXJzaW9uOiBzdHJpbmcpOiBbc3RyaW5nLCBzdHJpbmd8dW5kZWZpbmVkXSB7XG4gICAgY29uc3QgdmVyc2lvbkluZGV4ID0gcGFja2FnZU5hbWVBbmRWZXJzaW9uLmxhc3RJbmRleE9mKCdAJyk7XG4gICAgLy8gTm90ZSB0aGF0ID4gMCBpcyBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG8gbWF0Y2ggQCBhdCB0aGUgc3RhcnQgb2YgdGhlIGxpbmVcbiAgICAvLyB3aGljaCBpcyB3aGF0IHlvdSB3b3VsZCBoYXZlIHdpdGggYSBuYW1lc3BhY2VkIHBhY2thZ2UsIGUuZy4gYEBhbmd1bGFyL2NvbW1vbmAuXG4gICAgcmV0dXJuIHZlcnNpb25JbmRleCA+IDAgP1xuICAgICAgICBbXG4gICAgICAgICAgcGFja2FnZU5hbWVBbmRWZXJzaW9uLnN1YnN0cmluZygwLCB2ZXJzaW9uSW5kZXgpLFxuICAgICAgICAgIHBhY2thZ2VOYW1lQW5kVmVyc2lvbi5zdWJzdHJpbmcodmVyc2lvbkluZGV4ICsgMSksXG4gICAgICAgIF0gOlxuICAgICAgICBbcGFja2FnZU5hbWVBbmRWZXJzaW9uLCB1bmRlZmluZWRdO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlSGFzaCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBjcmVhdGVIYXNoKHRoaXMuaGFzaEFsZ29yaXRobSkudXBkYXRlKEpTT04uc3RyaW5naWZ5KHRoaXMucHJvamVjdENvbmZpZykpLmRpZ2VzdCgnaGV4Jyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFNhdGlzZmFjdG9yeVZlcnNpb24oY29uZmlnczogVmVyc2lvbmVkUGFja2FnZUNvbmZpZ1tdfHVuZGVmaW5lZCwgdmVyc2lvbjogc3RyaW5nfG51bGwpOlxuICAgIFZlcnNpb25lZFBhY2thZ2VDb25maWd8bnVsbCB7XG4gIGlmIChjb25maWdzID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAodmVyc2lvbiA9PT0gbnVsbCkge1xuICAgIC8vIFRoZSBwYWNrYWdlIGhhcyBubyB2ZXJzaW9uICghKSAtIHBlcmhhcHMgdGhlIGVudHJ5LXBvaW50IHdhcyBmcm9tIGEgZGVlcCBpbXBvcnQsIHdoaWNoIG1hZGVcbiAgICAvLyBpdCBpbXBvc3NpYmxlIHRvIGZpbmQgdGhlIHBhY2thZ2UuanNvbi5cbiAgICAvLyBTbyBqdXN0IHJldHVybiB0aGUgZmlyc3QgY29uZmlnIHRoYXQgbWF0Y2hlcyB0aGUgcGFja2FnZSBuYW1lLlxuICAgIHJldHVybiBjb25maWdzWzBdO1xuICB9XG4gIHJldHVybiBjb25maWdzLmZpbmQoXG4gICAgICAgICAgICAgY29uZmlnID0+IHNhdGlzZmllcyh2ZXJzaW9uLCBjb25maWcudmVyc2lvblJhbmdlLCB7aW5jbHVkZVByZXJlbGVhc2U6IHRydWV9KSkgfHxcbiAgICAgIG51bGw7XG59XG4iXX0=