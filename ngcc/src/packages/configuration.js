(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/configuration", ["require", "exports", "tslib", "crypto", "semver", "vm", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgccConfiguration = exports.DEFAULT_NGCC_CONFIG = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var crypto_1 = require("crypto");
    var semver_1 = require("semver");
    var vm = require("vm");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
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
    exports.DEFAULT_NGCC_CONFIG = {
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
    var NGCC_CONFIG_FILENAME = 'ngcc.config.js';
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
    var NgccConfiguration = /** @class */ (function () {
        function NgccConfiguration(fs, baseDir) {
            this.fs = fs;
            this.cache = new Map();
            this.defaultConfig = this.processProjectConfig(baseDir, exports.DEFAULT_NGCC_CONFIG);
            this.projectConfig = this.processProjectConfig(baseDir, this.loadProjectConfig(baseDir));
            this.hash = this.computeHash();
        }
        /**
         * Get the configuration options for locking the ngcc process.
         */
        NgccConfiguration.prototype.getLockingConfig = function () {
            var _a = this.projectConfig.locking, retryAttempts = _a.retryAttempts, retryDelay = _a.retryDelay;
            if (retryAttempts === undefined) {
                retryAttempts = this.defaultConfig.locking.retryAttempts;
            }
            if (retryDelay === undefined) {
                retryDelay = this.defaultConfig.locking.retryDelay;
            }
            return { retryAttempts: retryAttempts, retryDelay: retryDelay };
        };
        /**
         * Get a configuration for the given `version` of a package at `packagePath`.
         *
         * @param packagePath The path to the package whose config we want.
         * @param version The version of the package whose config we want, or `null` if the package's
         * package.json did not exist or was invalid.
         */
        NgccConfiguration.prototype.getPackageConfig = function (packagePath, version) {
            var cacheKey = packagePath + (version !== null ? "@" + version : '');
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            var projectLevelConfig = this.projectConfig.packages ?
                findSatisfactoryVersion(this.projectConfig.packages[packagePath], version) :
                null;
            if (projectLevelConfig !== null) {
                this.cache.set(cacheKey, projectLevelConfig);
                return projectLevelConfig;
            }
            var packageLevelConfig = this.loadPackageConfig(packagePath, version);
            if (packageLevelConfig !== null) {
                this.cache.set(cacheKey, packageLevelConfig);
                return packageLevelConfig;
            }
            var defaultLevelConfig = this.defaultConfig.packages ?
                findSatisfactoryVersion(this.defaultConfig.packages[packagePath], version) :
                null;
            if (defaultLevelConfig !== null) {
                this.cache.set(cacheKey, defaultLevelConfig);
                return defaultLevelConfig;
            }
            return { versionRange: '*', entryPoints: {} };
        };
        NgccConfiguration.prototype.processProjectConfig = function (baseDir, projectConfig) {
            var processedConfig = { packages: {}, locking: {} };
            // locking configuration
            if (projectConfig.locking !== undefined) {
                processedConfig.locking = projectConfig.locking;
            }
            // packages configuration
            for (var packagePathAndVersion in projectConfig.packages) {
                var packageConfig = projectConfig.packages[packagePathAndVersion];
                if (packageConfig) {
                    var _a = tslib_1.__read(this.splitPathAndVersion(packagePathAndVersion), 2), packagePath = _a[0], _b = _a[1], versionRange = _b === void 0 ? '*' : _b;
                    var absPackagePath = file_system_1.resolve(baseDir, 'node_modules', packagePath);
                    var entryPoints = this.processEntryPoints(absPackagePath, packageConfig);
                    processedConfig.packages[absPackagePath] = processedConfig.packages[absPackagePath] || [];
                    processedConfig.packages[absPackagePath].push(tslib_1.__assign(tslib_1.__assign({}, packageConfig), { versionRange: versionRange, entryPoints: entryPoints }));
                }
            }
            return processedConfig;
        };
        NgccConfiguration.prototype.loadProjectConfig = function (baseDir) {
            var configFilePath = file_system_1.join(baseDir, NGCC_CONFIG_FILENAME);
            if (this.fs.exists(configFilePath)) {
                try {
                    return this.evalSrcFile(configFilePath);
                }
                catch (e) {
                    throw new Error("Invalid project configuration file at \"" + configFilePath + "\": " + e.message);
                }
            }
            else {
                return { packages: {} };
            }
        };
        NgccConfiguration.prototype.loadPackageConfig = function (packagePath, version) {
            var configFilePath = file_system_1.join(packagePath, NGCC_CONFIG_FILENAME);
            if (this.fs.exists(configFilePath)) {
                try {
                    var packageConfig = this.evalSrcFile(configFilePath);
                    return tslib_1.__assign(tslib_1.__assign({}, packageConfig), { versionRange: version || '*', entryPoints: this.processEntryPoints(packagePath, packageConfig) });
                }
                catch (e) {
                    throw new Error("Invalid package configuration file at \"" + configFilePath + "\": " + e.message);
                }
            }
            else {
                return null;
            }
        };
        NgccConfiguration.prototype.evalSrcFile = function (srcPath) {
            var src = this.fs.readFile(srcPath);
            var theExports = {};
            var sandbox = {
                module: { exports: theExports },
                exports: theExports,
                require: require,
                __dirname: file_system_1.dirname(srcPath),
                __filename: srcPath
            };
            vm.runInNewContext(src, sandbox, { filename: srcPath });
            return sandbox.module.exports;
        };
        NgccConfiguration.prototype.processEntryPoints = function (packagePath, packageConfig) {
            var processedEntryPoints = {};
            for (var entryPointPath in packageConfig.entryPoints) {
                // Change the keys to be absolute paths
                processedEntryPoints[file_system_1.resolve(packagePath, entryPointPath)] =
                    packageConfig.entryPoints[entryPointPath];
            }
            return processedEntryPoints;
        };
        NgccConfiguration.prototype.splitPathAndVersion = function (packagePathAndVersion) {
            var versionIndex = packagePathAndVersion.lastIndexOf('@');
            // Note that > 0 is because we don't want to match @ at the start of the line
            // which is what you would have with a namespaced package, e.g. `@angular/common`.
            return versionIndex > 0 ?
                [
                    packagePathAndVersion.substring(0, versionIndex),
                    packagePathAndVersion.substring(versionIndex + 1)
                ] :
                [packagePathAndVersion, undefined];
        };
        NgccConfiguration.prototype.computeHash = function () {
            return crypto_1.createHash('md5').update(JSON.stringify(this.projectConfig)).digest('hex');
        };
        return NgccConfiguration;
    }());
    exports.NgccConfiguration = NgccConfiguration;
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
        return configs.find(function (config) { return semver_1.satisfies(version, config.versionRange, { includePrerelease: true }); }) ||
            null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCxpQ0FBa0M7SUFDbEMsaUNBQWlDO0lBQ2pDLHVCQUF5QjtJQUV6QiwyRUFBa0c7SUFtRmxHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bc0JHO0lBQ1UsUUFBQSxtQkFBbUIsR0FBc0I7UUFDcEQsUUFBUSxFQUFFO1lBQ1IsdURBQXVEO1lBQ3ZELDRCQUE0QjtZQUM1QixtQkFBbUI7WUFDbkIsK0NBQStDO1lBQy9DLE9BQU87WUFDUCxLQUFLO1lBRUwsZ0dBQWdHO1lBQ2hHLHlGQUF5RjtZQUN6Riw0Q0FBNEM7WUFDNUMscUJBQXFCLEVBQUU7Z0JBQ3JCLFdBQVcsRUFBRTtvQkFDWCxHQUFHLEVBQUU7d0JBQ0gsUUFBUSxFQUFFOzRCQUNSLElBQUksRUFBRSxZQUFZO3lCQUNuQjtxQkFDRjtpQkFDRjthQUNGO1lBRUQsZ0dBQWdHO1lBQ2hHLHNGQUFzRjtZQUN0RixrQ0FBa0M7WUFDbEMsYUFBYSxFQUFFO2dCQUNiLFdBQVcsRUFBRTtvQkFDWCxRQUFRLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxFQUFDO2lCQUN6QjthQUNGO1NBQ0Y7UUFDRCxPQUFPLEVBQUU7WUFDUCxVQUFVLEVBQUUsR0FBRztZQUNmLGFBQWEsRUFBRSxHQUFHO1NBQ25CO0tBQ0YsQ0FBQztJQVFGLElBQU0sb0JBQW9CLEdBQUcsZ0JBQWdCLENBQUM7SUFFOUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BdUJHO0lBQ0g7UUFNRSwyQkFBb0IsRUFBYyxFQUFFLE9BQXVCO1lBQXZDLE9BQUUsR0FBRixFQUFFLENBQVk7WUFIMUIsVUFBSyxHQUFHLElBQUksR0FBRyxF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SyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BGLENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUFqS0QsSUFpS0M7SUFqS1ksOENBQWlCO0lBbUs5QixTQUFTLHVCQUF1QixDQUFDLE9BQTJDLEVBQUUsT0FBb0I7UUFFaEcsSUFBSSxPQUFPLEtBQUssU0FBUyxFQUFFO1lBQ3pCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7WUFDcEIsOEZBQThGO1lBQzlGLDBDQUEwQztZQUMxQyxpRUFBaUU7WUFDakUsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkI7UUFDRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQ1IsVUFBQSxNQUFNLElBQUksT0FBQSxrQkFBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFBbEUsQ0FBa0UsQ0FBQztZQUNwRixJQUFJLENBQUM7SUFDWCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtjcmVhdGVIYXNofSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHtzYXRpc2ZpZXN9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgKiBhcyB2bSBmcm9tICd2bSc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGRpcm5hbWUsIEZpbGVTeXN0ZW0sIGpvaW4sIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7UGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzTWFwfSBmcm9tICcuL2VudHJ5X3BvaW50JztcblxuLyoqXG4gKiBUaGUgZm9ybWF0IG9mIGEgcHJvamVjdCBsZXZlbCBjb25maWd1cmF0aW9uIGZpbGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY1Byb2plY3RDb25maWc8VCA9IE5nY2NQYWNrYWdlQ29uZmlnPiB7XG4gIC8qKlxuICAgKiBUaGUgcGFja2FnZXMgdGhhdCBhcmUgY29uZmlndXJlZCBieSB0aGlzIHByb2plY3QgY29uZmlnLlxuICAgKi9cbiAgcGFja2FnZXM/OiB7W3BhY2thZ2VQYXRoOiBzdHJpbmddOiBUfTtcbiAgLyoqXG4gICAqIE9wdGlvbnMgdGhhdCBjb250cm9sIGhvdyBsb2NraW5nIHRoZSBwcm9jZXNzIGlzIGhhbmRsZWQuXG4gICAqL1xuICBsb2NraW5nPzogUHJvY2Vzc0xvY2tpbmdDb25maWd1cmF0aW9uO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgdGhhdCBjb250cm9sIGhvdyBsb2NraW5nIHRoZSBwcm9jZXNzIGlzIGhhbmRsZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJvY2Vzc0xvY2tpbmdDb25maWd1cmF0aW9uIHtcbiAgLyoqXG4gICAqIFRoZSBudW1iZXIgb2YgdGltZXMgdGhlIEFzeW5jTG9ja2VyIHdpbGwgYXR0ZW1wdCB0byBsb2NrIHRoZSBwcm9jZXNzIGJlZm9yZSBmYWlsaW5nLlxuICAgKiBEZWZhdWx0cyB0byA1MDAuXG4gICAqL1xuICByZXRyeUF0dGVtcHRzPzogbnVtYmVyO1xuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgYmV0d2VlbiBhdHRlbXB0cyB0byBsb2NrIHRoZSBwcm9jZXNzLlxuICAgKiBEZWZhdWx0cyB0byA1MDBtcy5cbiAgICogKi9cbiAgcmV0cnlEZWxheT86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBUaGUgZm9ybWF0IG9mIGEgcGFja2FnZSBsZXZlbCBjb25maWd1cmF0aW9uIGZpbGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY1BhY2thZ2VDb25maWcge1xuICAvKipcbiAgICogVGhlIGVudHJ5LXBvaW50cyB0byBjb25maWd1cmUgZm9yIHRoaXMgcGFja2FnZS5cbiAgICpcbiAgICogSW4gdGhlIGNvbmZpZyBmaWxlIHRoZSBrZXlzIGNhbiBiZSBwYXRocyByZWxhdGl2ZSB0byB0aGUgcGFja2FnZSBwYXRoO1xuICAgKiBidXQgd2hlbiBiZWluZyByZWFkIGJhY2sgZnJvbSB0aGUgYE5nY2NDb25maWd1cmF0aW9uYCBzZXJ2aWNlLCB0aGVzZSBwYXRoc1xuICAgKiB3aWxsIGJlIGFic29sdXRlLlxuICAgKi9cbiAgZW50cnlQb2ludHM6IHtbZW50cnlQb2ludFBhdGg6IHN0cmluZ106IE5nY2NFbnRyeVBvaW50Q29uZmlnO307XG4gIC8qKlxuICAgKiBBIGNvbGxlY3Rpb24gb2YgcmVnZXhlcyB0aGF0IG1hdGNoIGRlZXAgaW1wb3J0cyB0byBpZ25vcmUsIGZvciB0aGlzIHBhY2thZ2UsIHJhdGhlciB0aGFuXG4gICAqIGRpc3BsYXlpbmcgYSB3YXJuaW5nLlxuICAgKi9cbiAgaWdub3JhYmxlRGVlcEltcG9ydE1hdGNoZXJzPzogUmVnRXhwW107XG59XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBhbiBlbnRyeS1wb2ludC5cbiAqXG4gKiBUaGUgZXhpc3RlbmNlIG9mIGEgY29uZmlndXJhdGlvbiBmb3IgYSBwYXRoIHRlbGxzIG5nY2MgdGhhdCB0aGlzIHNob3VsZCBiZSBjb25zaWRlcmVkIGZvclxuICogcHJvY2Vzc2luZyBhcyBhbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjRW50cnlQb2ludENvbmZpZyB7XG4gIC8qKiBEbyBub3QgcHJvY2VzcyAob3IgZXZlbiBhY2tub3dsZWRnZSB0aGUgZXhpc3RlbmNlIG9mKSB0aGlzIGVudHJ5LXBvaW50LCBpZiB0cnVlLiAqL1xuICBpZ25vcmU/OiBib29sZWFuO1xuICAvKipcbiAgICogVGhpcyBwcm9wZXJ0eSwgaWYgcHJvdmlkZWQsIGhvbGRzIHZhbHVlcyB0aGF0IHdpbGwgb3ZlcnJpZGUgZXF1aXZhbGVudCBwcm9wZXJ0aWVzIGluIGFuXG4gICAqIGVudHJ5LXBvaW50J3MgcGFja2FnZS5qc29uIGZpbGUuXG4gICAqL1xuICBvdmVycmlkZT86IFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcDtcblxuICAvKipcbiAgICogTm9ybWFsbHksIG5nY2Mgd2lsbCBza2lwIGNvbXBpbGF0aW9uIG9mIGVudHJ5cG9pbnRzIHRoYXQgY29udGFpbiBpbXBvcnRzIHRoYXQgY2FuJ3QgYmUgcmVzb2x2ZWRcbiAgICogb3IgdW5kZXJzdG9vZC4gSWYgdGhpcyBvcHRpb24gaXMgc3BlY2lmaWVkLCBuZ2NjIHdpbGwgcHJvY2VlZCB3aXRoIGNvbXBpbGluZyB0aGUgZW50cnlwb2ludFxuICAgKiBldmVuIGluIHRoZSBmYWNlIG9mIHN1Y2ggbWlzc2luZyBkZXBlbmRlbmNpZXMuXG4gICAqL1xuICBpZ25vcmVNaXNzaW5nRGVwZW5kZW5jaWVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRW5hYmxpbmcgdGhpcyBvcHRpb24gZm9yIGFuIGVudHJ5cG9pbnQgdGVsbHMgbmdjYyB0aGF0IGRlZXAgaW1wb3J0cyBtaWdodCBiZSB1c2VkIGZvciB0aGUgZmlsZXNcbiAgICogaXQgY29udGFpbnMsIGFuZCB0aGF0IGl0IHNob3VsZCBnZW5lcmF0ZSBwcml2YXRlIHJlLWV4cG9ydHMgYWxvbmdzaWRlIHRoZSBOZ01vZHVsZSBvZiBhbGwgdGhlXG4gICAqIGRpcmVjdGl2ZXMvcGlwZXMgaXQgbWFrZXMgYXZhaWxhYmxlIGluIHN1cHBvcnQgb2YgdGhvc2UgaW1wb3J0cy5cbiAgICovXG4gIGdlbmVyYXRlRGVlcFJlZXhwb3J0cz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiBmb3IgbmdjYy5cbiAqXG4gKiBUaGlzIGlzIHRoZSB1bHRpbWF0ZSBmYWxsYmFjayBjb25maWd1cmF0aW9uIHRoYXQgbmdjYyB3aWxsIHVzZSBpZiB0aGVyZSBpcyBubyBjb25maWd1cmF0aW9uXG4gKiBmb3IgYSBwYWNrYWdlIGF0IHRoZSBwYWNrYWdlIGxldmVsIG9yIHByb2plY3QgbGV2ZWwuXG4gKlxuICogVGhpcyBjb25maWd1cmF0aW9uIGlzIGZvciBwYWNrYWdlcyB0aGF0IGFyZSBcImRlYWRcIiAtIGkuZS4gbm8gbG9uZ2VyIG1haW50YWluZWQgYW5kIHNvIGFyZVxuICogdW5saWtlbHkgdG8gYmUgZml4ZWQgdG8gd29yayB3aXRoIG5nY2MsIG5vciBwcm92aWRlIGEgcGFja2FnZSBsZXZlbCBjb25maWcgb2YgdGhlaXIgb3duLlxuICpcbiAqIFRoZSBmYWxsYmFjayBwcm9jZXNzIGZvciBsb29raW5nIHVwIGNvbmZpZ3VyYXRpb24gaXM6XG4gKlxuICogUHJvamVjdCAtPiBQYWNrYWdlIC0+IERlZmF1bHRcbiAqXG4gKiBJZiBhIHBhY2thZ2UgcHJvdmlkZXMgaXRzIG93biBjb25maWd1cmF0aW9uIHRoZW4gdGhhdCB3b3VsZCBvdmVycmlkZSB0aGlzIGRlZmF1bHQgb25lLlxuICpcbiAqIEFsc28gYXBwbGljYXRpb24gZGV2ZWxvcGVycyBjYW4gYWx3YXlzIHByb3ZpZGUgY29uZmlndXJhdGlvbiBhdCB0aGVpciBwcm9qZWN0IGxldmVsIHdoaWNoXG4gKiB3aWxsIG92ZXJyaWRlIGV2ZXJ5dGhpbmcgZWxzZS5cbiAqXG4gKiBOb3RlIHRoYXQgdGhlIGZhbGxiYWNrIGlzIHBhY2thZ2UgYmFzZWQgbm90IGVudHJ5LXBvaW50IGJhc2VkLlxuICogRm9yIGV4YW1wbGUsIGlmIGEgdGhlcmUgaXMgY29uZmlndXJhdGlvbiBmb3IgYSBwYWNrYWdlIGF0IHRoZSBwcm9qZWN0IGxldmVsIHRoaXMgd2lsbCByZXBsYWNlIGFsbFxuICogZW50cnktcG9pbnQgY29uZmlndXJhdGlvbnMgdGhhdCBtYXkgaGF2ZSBiZWVuIHByb3ZpZGVkIGluIHRoZSBwYWNrYWdlIGxldmVsIG9yIGRlZmF1bHQgbGV2ZWxcbiAqIGNvbmZpZ3VyYXRpb25zLCBldmVuIGlmIHRoZSBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gZG9lcyBub3QgcHJvdmlkZSBmb3IgYSBnaXZlbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfTkdDQ19DT05GSUc6IE5nY2NQcm9qZWN0Q29uZmlnID0ge1xuICBwYWNrYWdlczoge1xuICAgIC8vIEFkZCBkZWZhdWx0IHBhY2thZ2UgY29uZmlndXJhdGlvbiBoZXJlLiBGb3IgZXhhbXBsZTpcbiAgICAvLyAnQGFuZ3VsYXIvZmlyZUBeNS4yLjAnOiB7XG4gICAgLy8gICBlbnRyeVBvaW50czoge1xuICAgIC8vICAgICAnLi9kYXRhYmFzZS1kZXByZWNhdGVkJzoge2lnbm9yZTogdHJ1ZX0sXG4gICAgLy8gICB9LFxuICAgIC8vIH0sXG5cbiAgICAvLyBUaGUgcGFja2FnZSBkb2VzIG5vdCBjb250YWluIGFueSBgLm1ldGFkYXRhLmpzb25gIGZpbGVzIGluIHRoZSByb290IGRpcmVjdG9yeSBidXQgb25seSBpbnNpZGVcbiAgICAvLyBgZGlzdC9gLiBXaXRob3V0IHRoaXMgY29uZmlnLCBuZ2NjIGRvZXMgbm90IHJlYWxpemUgdGhpcyBpcyBhIFZpZXdFbmdpbmUtYnVpbHQgQW5ndWxhclxuICAgIC8vIHBhY2thZ2UgdGhhdCBuZWVkcyB0byBiZSBjb21waWxlZCB0byBJdnkuXG4gICAgJ2FuZ3VsYXIyLWhpZ2hjaGFydHMnOiB7XG4gICAgICBlbnRyeVBvaW50czoge1xuICAgICAgICAnLic6IHtcbiAgICAgICAgICBvdmVycmlkZToge1xuICAgICAgICAgICAgbWFpbjogJy4vaW5kZXguanMnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBUaGUgYGRpc3QvYCBkaXJlY3RvcnkgaGFzIGEgZHVwbGljYXRlIGBwYWNrYWdlLmpzb25gIHBvaW50aW5nIHRvIHRoZSBzYW1lIGZpbGVzLCB3aGljaCAodW5kZXJcbiAgICAvLyBjZXJ0YWluIGNvbmZpZ3VyYXRpb25zKSBjYW4gY2F1c2VzIG5nY2MgdG8gdHJ5IHRvIHByb2Nlc3MgdGhlIGZpbGVzIHR3aWNlIGFuZCBmYWlsLlxuICAgIC8vIElnbm9yZSB0aGUgYGRpc3QvYCBlbnRyeS1wb2ludC5cbiAgICAnbmcyLWRyYWd1bGEnOiB7XG4gICAgICBlbnRyeVBvaW50czoge1xuICAgICAgICAnLi9kaXN0Jzoge2lnbm9yZTogdHJ1ZX0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIGxvY2tpbmc6IHtcbiAgICByZXRyeURlbGF5OiA1MDAsXG4gICAgcmV0cnlBdHRlbXB0czogNTAwLFxuICB9XG59O1xuXG5pbnRlcmZhY2UgVmVyc2lvbmVkUGFja2FnZUNvbmZpZyBleHRlbmRzIE5nY2NQYWNrYWdlQ29uZmlnIHtcbiAgdmVyc2lvblJhbmdlOiBzdHJpbmc7XG59XG5cbnR5cGUgUHJvY2Vzc2VkQ29uZmlnID0gUmVxdWlyZWQ8TmdjY1Byb2plY3RDb25maWc8VmVyc2lvbmVkUGFja2FnZUNvbmZpZ1tdPj47XG5cbmNvbnN0IE5HQ0NfQ09ORklHX0ZJTEVOQU1FID0gJ25nY2MuY29uZmlnLmpzJztcblxuLyoqXG4gKiBOZ2NjIGhhcyBhIGhpZXJhcmNoaWNhbCBjb25maWd1cmF0aW9uIHN5c3RlbSB0aGF0IGxldHMgdXMgXCJmaXggdXBcIiBwYWNrYWdlcyB0aGF0IGRvIG5vdFxuICogd29yayB3aXRoIG5nY2Mgb3V0IG9mIHRoZSBib3guXG4gKlxuICogVGhlcmUgYXJlIHRocmVlIGxldmVscyBhdCB3aGljaCBjb25maWd1cmF0aW9uIGNhbiBiZSBkZWNsYXJlZDpcbiAqXG4gKiAqIERlZmF1bHQgbGV2ZWwgLSBuZ2NjIGNvbWVzIHdpdGggYnVpbHQtaW4gY29uZmlndXJhdGlvbiBmb3Igd2VsbCBrbm93biBjYXNlcy5cbiAqICogUGFja2FnZSBsZXZlbCAtIGEgbGlicmFyeSBhdXRob3IgcHVibGlzaGVzIGEgY29uZmlndXJhdGlvbiB3aXRoIHRoZWlyIHBhY2thZ2UgdG8gZml4IGtub3duXG4gKiAgIGlzc3Vlcy5cbiAqICogUHJvamVjdCBsZXZlbCAtIHRoZSBhcHBsaWNhdGlvbiBkZXZlbG9wZXIgcHJvdmlkZXMgYSBjb25maWd1cmF0aW9uIHRoYXQgZml4ZXMgaXNzdWVzIHNwZWNpZmljXG4gKiAgIHRvIHRoZSBsaWJyYXJpZXMgdXNlZCBpbiB0aGVpciBhcHBsaWNhdGlvbi5cbiAqXG4gKiBOZ2NjIHdpbGwgbWF0Y2ggY29uZmlndXJhdGlvbiBiYXNlZCBvbiB0aGUgcGFja2FnZSBuYW1lIGJ1dCBhbHNvIG9uIGl0cyB2ZXJzaW9uLiBUaGlzIGFsbG93c1xuICogY29uZmlndXJhdGlvbiB0byBwcm92aWRlIGRpZmZlcmVudCBmaXhlcyB0byBkaWZmZXJlbnQgdmVyc2lvbiByYW5nZXMgb2YgYSBwYWNrYWdlLlxuICpcbiAqICogUGFja2FnZSBsZXZlbCBjb25maWd1cmF0aW9uIGlzIHNwZWNpZmljIHRvIHRoZSBwYWNrYWdlIHZlcnNpb24gd2hlcmUgdGhlIGNvbmZpZ3VyYXRpb24gaXNcbiAqICAgZm91bmQuXG4gKiAqIERlZmF1bHQgYW5kIHByb2plY3QgbGV2ZWwgY29uZmlndXJhdGlvbiBzaG91bGQgcHJvdmlkZSB2ZXJzaW9uIHJhbmdlcyB0byBlbnN1cmUgdGhhdCB0aGVcbiAqICAgY29uZmlndXJhdGlvbiBpcyBvbmx5IGFwcGxpZWQgdG8gdGhlIGFwcHJvcHJpYXRlIHZlcnNpb25zIG9mIGEgcGFja2FnZS5cbiAqXG4gKiBXaGVuIGdldHRpbmcgYSBjb25maWd1cmF0aW9uIGZvciBhIHBhY2thZ2UgKHZpYSBgZ2V0Q29uZmlnKClgKSB0aGUgY2FsbGVyIHNob3VsZCBwcm92aWRlIHRoZVxuICogdmVyc2lvbiBvZiB0aGUgcGFja2FnZSBpbiBxdWVzdGlvbiwgaWYgYXZhaWxhYmxlLiBJZiBpdCBpcyBub3QgcHJvdmlkZWQgdGhlbiB0aGUgZmlyc3QgYXZhaWxhYmxlXG4gKiBjb25maWd1cmF0aW9uIGZvciBhIHBhY2thZ2UgaXMgcmV0dXJuZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ2NjQ29uZmlndXJhdGlvbiB7XG4gIHByaXZhdGUgZGVmYXVsdENvbmZpZzogUHJvY2Vzc2VkQ29uZmlnO1xuICBwcml2YXRlIHByb2plY3RDb25maWc6IFByb2Nlc3NlZENvbmZpZztcbiAgcHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnPigpO1xuICByZWFkb25seSBoYXNoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgYmFzZURpcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICB0aGlzLmRlZmF1bHRDb25maWcgPSB0aGlzLnByb2Nlc3NQcm9qZWN0Q29uZmlnKGJhc2VEaXIsIERFRkFVTFRfTkdDQ19DT05GSUcpO1xuICAgIHRoaXMucHJvamVjdENvbmZpZyA9IHRoaXMucHJvY2Vzc1Byb2plY3RDb25maWcoYmFzZURpciwgdGhpcy5sb2FkUHJvamVjdENvbmZpZyhiYXNlRGlyKSk7XG4gICAgdGhpcy5oYXNoID0gdGhpcy5jb21wdXRlSGFzaCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBsb2NraW5nIHRoZSBuZ2NjIHByb2Nlc3MuXG4gICAqL1xuICBnZXRMb2NraW5nQ29uZmlnKCk6IFJlcXVpcmVkPFByb2Nlc3NMb2NraW5nQ29uZmlndXJhdGlvbj4ge1xuICAgIGxldCB7cmV0cnlBdHRlbXB0cywgcmV0cnlEZWxheX0gPSB0aGlzLnByb2plY3RDb25maWcubG9ja2luZztcbiAgICBpZiAocmV0cnlBdHRlbXB0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXRyeUF0dGVtcHRzID0gdGhpcy5kZWZhdWx0Q29uZmlnLmxvY2tpbmcucmV0cnlBdHRlbXB0cyE7XG4gICAgfVxuICAgIGlmIChyZXRyeURlbGF5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHJ5RGVsYXkgPSB0aGlzLmRlZmF1bHRDb25maWcubG9ja2luZy5yZXRyeURlbGF5ITtcbiAgICB9XG4gICAgcmV0dXJuIHtyZXRyeUF0dGVtcHRzLCByZXRyeURlbGF5fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBjb25maWd1cmF0aW9uIGZvciB0aGUgZ2l2ZW4gYHZlcnNpb25gIG9mIGEgcGFja2FnZSBhdCBgcGFja2FnZVBhdGhgLlxuICAgKlxuICAgKiBAcGFyYW0gcGFja2FnZVBhdGggVGhlIHBhdGggdG8gdGhlIHBhY2thZ2Ugd2hvc2UgY29uZmlnIHdlIHdhbnQuXG4gICAqIEBwYXJhbSB2ZXJzaW9uIFRoZSB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIHdob3NlIGNvbmZpZyB3ZSB3YW50LCBvciBgbnVsbGAgaWYgdGhlIHBhY2thZ2Unc1xuICAgKiBwYWNrYWdlLmpzb24gZGlkIG5vdCBleGlzdCBvciB3YXMgaW52YWxpZC5cbiAgICovXG4gIGdldFBhY2thZ2VDb25maWcocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6IFZlcnNpb25lZFBhY2thZ2VDb25maWcge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gcGFja2FnZVBhdGggKyAodmVyc2lvbiAhPT0gbnVsbCA/IGBAJHt2ZXJzaW9ufWAgOiAnJyk7XG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKGNhY2hlS2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KGNhY2hlS2V5KSE7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdExldmVsQ29uZmlnID0gdGhpcy5wcm9qZWN0Q29uZmlnLnBhY2thZ2VzID9cbiAgICAgICAgZmluZFNhdGlzZmFjdG9yeVZlcnNpb24odGhpcy5wcm9qZWN0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VQYXRoXSwgdmVyc2lvbikgOlxuICAgICAgICBudWxsO1xuICAgIGlmIChwcm9qZWN0TGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBwcm9qZWN0TGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIHByb2plY3RMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlTGV2ZWxDb25maWcgPSB0aGlzLmxvYWRQYWNrYWdlQ29uZmlnKHBhY2thZ2VQYXRoLCB2ZXJzaW9uKTtcbiAgICBpZiAocGFja2FnZUxldmVsQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChjYWNoZUtleSwgcGFja2FnZUxldmVsQ29uZmlnKTtcbiAgICAgIHJldHVybiBwYWNrYWdlTGV2ZWxDb25maWc7XG4gICAgfVxuXG4gICAgY29uc3QgZGVmYXVsdExldmVsQ29uZmlnID0gdGhpcy5kZWZhdWx0Q29uZmlnLnBhY2thZ2VzID9cbiAgICAgICAgZmluZFNhdGlzZmFjdG9yeVZlcnNpb24odGhpcy5kZWZhdWx0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VQYXRoXSwgdmVyc2lvbikgOlxuICAgICAgICBudWxsO1xuICAgIGlmIChkZWZhdWx0TGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBkZWZhdWx0TGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIGRlZmF1bHRMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICByZXR1cm4ge3ZlcnNpb25SYW5nZTogJyonLCBlbnRyeVBvaW50czoge319O1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzUHJvamVjdENvbmZpZyhiYXNlRGlyOiBBYnNvbHV0ZUZzUGF0aCwgcHJvamVjdENvbmZpZzogTmdjY1Byb2plY3RDb25maWcpOlxuICAgICAgUHJvY2Vzc2VkQ29uZmlnIHtcbiAgICBjb25zdCBwcm9jZXNzZWRDb25maWc6IFByb2Nlc3NlZENvbmZpZyA9IHtwYWNrYWdlczoge30sIGxvY2tpbmc6IHt9fTtcblxuICAgIC8vIGxvY2tpbmcgY29uZmlndXJhdGlvblxuICAgIGlmIChwcm9qZWN0Q29uZmlnLmxvY2tpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcHJvY2Vzc2VkQ29uZmlnLmxvY2tpbmcgPSBwcm9qZWN0Q29uZmlnLmxvY2tpbmc7XG4gICAgfVxuXG4gICAgLy8gcGFja2FnZXMgY29uZmlndXJhdGlvblxuICAgIGZvciAoY29uc3QgcGFja2FnZVBhdGhBbmRWZXJzaW9uIGluIHByb2plY3RDb25maWcucGFja2FnZXMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VDb25maWcgPSBwcm9qZWN0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VQYXRoQW5kVmVyc2lvbl07XG4gICAgICBpZiAocGFja2FnZUNvbmZpZykge1xuICAgICAgICBjb25zdCBbcGFja2FnZVBhdGgsIHZlcnNpb25SYW5nZSA9ICcqJ10gPSB0aGlzLnNwbGl0UGF0aEFuZFZlcnNpb24ocGFja2FnZVBhdGhBbmRWZXJzaW9uKTtcbiAgICAgICAgY29uc3QgYWJzUGFja2FnZVBhdGggPSByZXNvbHZlKGJhc2VEaXIsICdub2RlX21vZHVsZXMnLCBwYWNrYWdlUGF0aCk7XG4gICAgICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gdGhpcy5wcm9jZXNzRW50cnlQb2ludHMoYWJzUGFja2FnZVBhdGgsIHBhY2thZ2VDb25maWcpO1xuICAgICAgICBwcm9jZXNzZWRDb25maWcucGFja2FnZXNbYWJzUGFja2FnZVBhdGhdID0gcHJvY2Vzc2VkQ29uZmlnLnBhY2thZ2VzW2Fic1BhY2thZ2VQYXRoXSB8fCBbXTtcbiAgICAgICAgcHJvY2Vzc2VkQ29uZmlnLnBhY2thZ2VzW2Fic1BhY2thZ2VQYXRoXS5wdXNoKFxuICAgICAgICAgICAgey4uLnBhY2thZ2VDb25maWcsIHZlcnNpb25SYW5nZSwgZW50cnlQb2ludHN9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcHJvY2Vzc2VkQ29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkUHJvamVjdENvbmZpZyhiYXNlRGlyOiBBYnNvbHV0ZUZzUGF0aCk6IE5nY2NQcm9qZWN0Q29uZmlnIHtcbiAgICBjb25zdCBjb25maWdGaWxlUGF0aCA9IGpvaW4oYmFzZURpciwgTkdDQ19DT05GSUdfRklMRU5BTUUpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhjb25maWdGaWxlUGF0aCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0aGlzLmV2YWxTcmNGaWxlKGNvbmZpZ0ZpbGVQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHByb2plY3QgY29uZmlndXJhdGlvbiBmaWxlIGF0IFwiJHtjb25maWdGaWxlUGF0aH1cIjogYCArIGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7cGFja2FnZXM6IHt9fTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGxvYWRQYWNrYWdlQ29uZmlnKHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgdmVyc2lvbjogc3RyaW5nfG51bGwpOlxuICAgICAgVmVyc2lvbmVkUGFja2FnZUNvbmZpZ3xudWxsIHtcbiAgICBjb25zdCBjb25maWdGaWxlUGF0aCA9IGpvaW4ocGFja2FnZVBhdGgsIE5HQ0NfQ09ORklHX0ZJTEVOQU1FKTtcbiAgICBpZiAodGhpcy5mcy5leGlzdHMoY29uZmlnRmlsZVBhdGgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYWNrYWdlQ29uZmlnID0gdGhpcy5ldmFsU3JjRmlsZShjb25maWdGaWxlUGF0aCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4ucGFja2FnZUNvbmZpZyxcbiAgICAgICAgICB2ZXJzaW9uUmFuZ2U6IHZlcnNpb24gfHwgJyonLFxuICAgICAgICAgIGVudHJ5UG9pbnRzOiB0aGlzLnByb2Nlc3NFbnRyeVBvaW50cyhwYWNrYWdlUGF0aCwgcGFja2FnZUNvbmZpZyksXG4gICAgICAgIH07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwYWNrYWdlIGNvbmZpZ3VyYXRpb24gZmlsZSBhdCBcIiR7Y29uZmlnRmlsZVBhdGh9XCI6IGAgKyBlLm1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV2YWxTcmNGaWxlKHNyY1BhdGg6IEFic29sdXRlRnNQYXRoKTogYW55IHtcbiAgICBjb25zdCBzcmMgPSB0aGlzLmZzLnJlYWRGaWxlKHNyY1BhdGgpO1xuICAgIGNvbnN0IHRoZUV4cG9ydHMgPSB7fTtcbiAgICBjb25zdCBzYW5kYm94ID0ge1xuICAgICAgbW9kdWxlOiB7ZXhwb3J0czogdGhlRXhwb3J0c30sXG4gICAgICBleHBvcnRzOiB0aGVFeHBvcnRzLFxuICAgICAgcmVxdWlyZSxcbiAgICAgIF9fZGlybmFtZTogZGlybmFtZShzcmNQYXRoKSxcbiAgICAgIF9fZmlsZW5hbWU6IHNyY1BhdGhcbiAgICB9O1xuICAgIHZtLnJ1bkluTmV3Q29udGV4dChzcmMsIHNhbmRib3gsIHtmaWxlbmFtZTogc3JjUGF0aH0pO1xuICAgIHJldHVybiBzYW5kYm94Lm1vZHVsZS5leHBvcnRzO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzRW50cnlQb2ludHMocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCBwYWNrYWdlQ29uZmlnOiBOZ2NjUGFja2FnZUNvbmZpZyk6XG4gICAgICB7W2VudHJ5UG9pbnRQYXRoOiBzdHJpbmddOiBOZ2NjRW50cnlQb2ludENvbmZpZzt9IHtcbiAgICBjb25zdCBwcm9jZXNzZWRFbnRyeVBvaW50czoge1tlbnRyeVBvaW50UGF0aDogc3RyaW5nXTogTmdjY0VudHJ5UG9pbnRDb25maWc7fSA9IHt9O1xuICAgIGZvciAoY29uc3QgZW50cnlQb2ludFBhdGggaW4gcGFja2FnZUNvbmZpZy5lbnRyeVBvaW50cykge1xuICAgICAgLy8gQ2hhbmdlIHRoZSBrZXlzIHRvIGJlIGFic29sdXRlIHBhdGhzXG4gICAgICBwcm9jZXNzZWRFbnRyeVBvaW50c1tyZXNvbHZlKHBhY2thZ2VQYXRoLCBlbnRyeVBvaW50UGF0aCldID1cbiAgICAgICAgICBwYWNrYWdlQ29uZmlnLmVudHJ5UG9pbnRzW2VudHJ5UG9pbnRQYXRoXTtcbiAgICB9XG4gICAgcmV0dXJuIHByb2Nlc3NlZEVudHJ5UG9pbnRzO1xuICB9XG5cbiAgcHJpdmF0ZSBzcGxpdFBhdGhBbmRWZXJzaW9uKHBhY2thZ2VQYXRoQW5kVmVyc2lvbjogc3RyaW5nKTogW3N0cmluZywgc3RyaW5nfHVuZGVmaW5lZF0ge1xuICAgIGNvbnN0IHZlcnNpb25JbmRleCA9IHBhY2thZ2VQYXRoQW5kVmVyc2lvbi5sYXN0SW5kZXhPZignQCcpO1xuICAgIC8vIE5vdGUgdGhhdCA+IDAgaXMgYmVjYXVzZSB3ZSBkb24ndCB3YW50IHRvIG1hdGNoIEAgYXQgdGhlIHN0YXJ0IG9mIHRoZSBsaW5lXG4gICAgLy8gd2hpY2ggaXMgd2hhdCB5b3Ugd291bGQgaGF2ZSB3aXRoIGEgbmFtZXNwYWNlZCBwYWNrYWdlLCBlLmcuIGBAYW5ndWxhci9jb21tb25gLlxuICAgIHJldHVybiB2ZXJzaW9uSW5kZXggPiAwID9cbiAgICAgICAgW1xuICAgICAgICAgIHBhY2thZ2VQYXRoQW5kVmVyc2lvbi5zdWJzdHJpbmcoMCwgdmVyc2lvbkluZGV4KSxcbiAgICAgICAgICBwYWNrYWdlUGF0aEFuZFZlcnNpb24uc3Vic3RyaW5nKHZlcnNpb25JbmRleCArIDEpXG4gICAgICAgIF0gOlxuICAgICAgICBbcGFja2FnZVBhdGhBbmRWZXJzaW9uLCB1bmRlZmluZWRdO1xuICB9XG5cbiAgcHJpdmF0ZSBjb21wdXRlSGFzaCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBjcmVhdGVIYXNoKCdtZDUnKS51cGRhdGUoSlNPTi5zdHJpbmdpZnkodGhpcy5wcm9qZWN0Q29uZmlnKSkuZGlnZXN0KCdoZXgnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU2F0aXNmYWN0b3J5VmVyc2lvbihjb25maWdzOiBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW118dW5kZWZpbmVkLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6XG4gICAgVmVyc2lvbmVkUGFja2FnZUNvbmZpZ3xudWxsIHtcbiAgaWYgKGNvbmZpZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmICh2ZXJzaW9uID09PSBudWxsKSB7XG4gICAgLy8gVGhlIHBhY2thZ2UgaGFzIG5vIHZlcnNpb24gKCEpIC0gcGVyaGFwcyB0aGUgZW50cnktcG9pbnQgd2FzIGZyb20gYSBkZWVwIGltcG9ydCwgd2hpY2ggbWFkZVxuICAgIC8vIGl0IGltcG9zc2libGUgdG8gZmluZCB0aGUgcGFja2FnZS5qc29uLlxuICAgIC8vIFNvIGp1c3QgcmV0dXJuIHRoZSBmaXJzdCBjb25maWcgdGhhdCBtYXRjaGVzIHRoZSBwYWNrYWdlIG5hbWUuXG4gICAgcmV0dXJuIGNvbmZpZ3NbMF07XG4gIH1cbiAgcmV0dXJuIGNvbmZpZ3MuZmluZChcbiAgICAgICAgICAgICBjb25maWcgPT4gc2F0aXNmaWVzKHZlcnNpb24sIGNvbmZpZy52ZXJzaW9uUmFuZ2UsIHtpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZX0pKSB8fFxuICAgICAgbnVsbDtcbn1cbiJdfQ==