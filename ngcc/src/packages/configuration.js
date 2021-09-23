(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/configuration", ["require", "exports", "tslib", "crypto", "semver", "vm"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgccConfiguration = exports.ProcessedNgccPackageConfig = exports.DEFAULT_NGCC_CONFIG = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var crypto_1 = require("crypto");
    var semver_1 = require("semver");
    var vm = require("vm");
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
     * The processed package level configuration as a result of processing a raw package level config.
     */
    var ProcessedNgccPackageConfig = /** @class */ (function () {
        function ProcessedNgccPackageConfig(fs, packagePath, _a) {
            var _b = _a.entryPoints, entryPoints = _b === void 0 ? {} : _b, _c = _a.ignorableDeepImportMatchers, ignorableDeepImportMatchers = _c === void 0 ? [] : _c;
            var absolutePathEntries = Object.entries(entryPoints).map(function (_a) {
                var _b = (0, tslib_1.__read)(_a, 2), relativePath = _b[0], config = _b[1];
                return [fs.resolve(packagePath, relativePath), config];
            });
            this.packagePath = packagePath;
            this.entryPoints = new Map(absolutePathEntries);
            this.ignorableDeepImportMatchers = ignorableDeepImportMatchers;
        }
        return ProcessedNgccPackageConfig;
    }());
    exports.ProcessedNgccPackageConfig = ProcessedNgccPackageConfig;
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
            this.defaultConfig = this.processProjectConfig(exports.DEFAULT_NGCC_CONFIG);
            this.projectConfig = this.processProjectConfig(this.loadProjectConfig(baseDir));
            this.hashAlgorithm = this.projectConfig.hashAlgorithm;
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
         * @param packageName The name of the package whose config we want.
         * @param packagePath The path to the package whose config we want.
         * @param version The version of the package whose config we want, or `null` if the package's
         * package.json did not exist or was invalid.
         */
        NgccConfiguration.prototype.getPackageConfig = function (packageName, packagePath, version) {
            var rawPackageConfig = this.getRawPackageConfig(packageName, packagePath, version);
            return new ProcessedNgccPackageConfig(this.fs, packagePath, rawPackageConfig);
        };
        NgccConfiguration.prototype.getRawPackageConfig = function (packageName, packagePath, version) {
            var cacheKey = packageName + (version !== null ? "@" + version : '');
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            var projectLevelConfig = this.projectConfig.packages ?
                findSatisfactoryVersion(this.projectConfig.packages[packageName], version) :
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
                findSatisfactoryVersion(this.defaultConfig.packages[packageName], version) :
                null;
            if (defaultLevelConfig !== null) {
                this.cache.set(cacheKey, defaultLevelConfig);
                return defaultLevelConfig;
            }
            return { versionRange: '*' };
        };
        NgccConfiguration.prototype.processProjectConfig = function (projectConfig) {
            var processedConfig = { packages: {}, locking: {}, hashAlgorithm: 'sha256' };
            // locking configuration
            if (projectConfig.locking !== undefined) {
                processedConfig.locking = projectConfig.locking;
            }
            // packages configuration
            for (var packageNameAndVersion in projectConfig.packages) {
                var packageConfig = projectConfig.packages[packageNameAndVersion];
                if (packageConfig) {
                    var _a = (0, tslib_1.__read)(this.splitNameAndVersion(packageNameAndVersion), 2), packageName = _a[0], _b = _a[1], versionRange = _b === void 0 ? '*' : _b;
                    var packageConfigs = processedConfig.packages[packageName] || (processedConfig.packages[packageName] = []);
                    packageConfigs.push((0, tslib_1.__assign)((0, tslib_1.__assign)({}, packageConfig), { versionRange: versionRange }));
                }
            }
            // hash algorithm config
            if (projectConfig.hashAlgorithm !== undefined) {
                processedConfig.hashAlgorithm = projectConfig.hashAlgorithm;
            }
            return processedConfig;
        };
        NgccConfiguration.prototype.loadProjectConfig = function (baseDir) {
            var configFilePath = this.fs.join(baseDir, NGCC_CONFIG_FILENAME);
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
            var configFilePath = this.fs.join(packagePath, NGCC_CONFIG_FILENAME);
            if (this.fs.exists(configFilePath)) {
                try {
                    var packageConfig = this.evalSrcFile(configFilePath);
                    return (0, tslib_1.__assign)((0, tslib_1.__assign)({}, packageConfig), { versionRange: version || '*' });
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
                __dirname: this.fs.dirname(srcPath),
                __filename: srcPath
            };
            vm.runInNewContext(src, sandbox, { filename: srcPath });
            return sandbox.module.exports;
        };
        NgccConfiguration.prototype.splitNameAndVersion = function (packageNameAndVersion) {
            var versionIndex = packageNameAndVersion.lastIndexOf('@');
            // Note that > 0 is because we don't want to match @ at the start of the line
            // which is what you would have with a namespaced package, e.g. `@angular/common`.
            return versionIndex > 0 ?
                [
                    packageNameAndVersion.substring(0, versionIndex),
                    packageNameAndVersion.substring(versionIndex + 1),
                ] :
                [packageNameAndVersion, undefined];
        };
        NgccConfiguration.prototype.computeHash = function () {
            return (0, crypto_1.createHash)(this.hashAlgorithm).update(JSON.stringify(this.projectConfig)).digest('hex');
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
        return configs.find(function (config) { return (0, semver_1.satisfies)(version, config.versionRange, { includePrerelease: true }); }) ||
            null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCxpQ0FBa0M7SUFDbEMsaUNBQWlDO0lBQ2pDLHVCQUF5QjtJQWlHekI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDVSxRQUFBLG1CQUFtQixHQUFzQjtRQUNwRCxRQUFRLEVBQUU7WUFDUix1REFBdUQ7WUFDdkQsNEJBQTRCO1lBQzVCLG1CQUFtQjtZQUNuQiwrQ0FBK0M7WUFDL0MsT0FBTztZQUNQLEtBQUs7WUFFTCxnR0FBZ0c7WUFDaEcseUZBQXlGO1lBQ3pGLDRDQUE0QztZQUM1QyxxQkFBcUIsRUFBRTtnQkFDckIsV0FBVyxFQUFFO29CQUNYLEdBQUcsRUFBRTt3QkFDSCxRQUFRLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFlBQVk7eUJBQ25CO3FCQUNGO2lCQUNGO2FBQ0Y7WUFFRCxnR0FBZ0c7WUFDaEcsc0ZBQXNGO1lBQ3RGLGtDQUFrQztZQUNsQyxhQUFhLEVBQUU7Z0JBQ2IsV0FBVyxFQUFFO29CQUNYLFFBQVEsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUM7aUJBQ3pCO2FBQ0Y7U0FDRjtRQUNELE9BQU8sRUFBRTtZQUNQLFVBQVUsRUFBRSxHQUFHO1lBQ2YsYUFBYSxFQUFFLEdBQUc7U0FDbkI7S0FDRixDQUFDO0lBRUYsSUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQztJQUU5Qzs7T0FFRztJQUNIO1FBdUJFLG9DQUFZLEVBQW9CLEVBQUUsV0FBMkIsRUFBRSxFQUd4QztnQkFGckIsbUJBQWdCLEVBQWhCLFdBQVcsbUJBQUcsRUFBRSxLQUFBLEVBQ2hCLG1DQUFnQyxFQUFoQywyQkFBMkIsbUJBQUcsRUFB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LE9BQUEsSUFBQSxrQkFBUyxFQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFBbEUsQ0FBa0UsQ0FBQztZQUNwRixJQUFJLENBQUM7SUFDWCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NyZWF0ZUhhc2h9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQge3NhdGlzZmllc30gZnJvbSAnc2VtdmVyJztcbmltcG9ydCAqIGFzIHZtIGZyb20gJ3ZtJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgUGF0aE1hbmlwdWxhdGlvbiwgUmVhZG9ubHlGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge1BhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcH0gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cbi8qKlxuICogVGhlIGZvcm1hdCBvZiBhIHByb2plY3QgbGV2ZWwgY29uZmlndXJhdGlvbiBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NQcm9qZWN0Q29uZmlnPFQgPSBSYXdOZ2NjUGFja2FnZUNvbmZpZz4ge1xuICAvKipcbiAgICogVGhlIHBhY2thZ2VzIHRoYXQgYXJlIGNvbmZpZ3VyZWQgYnkgdGhpcyBwcm9qZWN0IGNvbmZpZy5cbiAgICovXG4gIHBhY2thZ2VzPzoge1twYWNrYWdlUGF0aDogc3RyaW5nXTogVHx1bmRlZmluZWR9O1xuICAvKipcbiAgICogT3B0aW9ucyB0aGF0IGNvbnRyb2wgaG93IGxvY2tpbmcgdGhlIHByb2Nlc3MgaXMgaGFuZGxlZC5cbiAgICovXG4gIGxvY2tpbmc/OiBQcm9jZXNzTG9ja2luZ0NvbmZpZ3VyYXRpb247XG4gIC8qKlxuICAgKiBOYW1lIG9mIGhhc2ggYWxnb3JpdGhtIHVzZWQgdG8gZ2VuZXJhdGUgaGFzaGVzIG9mIHRoZSBjb25maWd1cmF0aW9uLlxuICAgKlxuICAgKiBEZWZhdWx0cyB0byBgc2hhMjU2YC5cbiAgICovXG4gIGhhc2hBbGdvcml0aG0/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogT3B0aW9ucyB0aGF0IGNvbnRyb2wgaG93IGxvY2tpbmcgdGhlIHByb2Nlc3MgaXMgaGFuZGxlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQcm9jZXNzTG9ja2luZ0NvbmZpZ3VyYXRpb24ge1xuICAvKipcbiAgICogVGhlIG51bWJlciBvZiB0aW1lcyB0aGUgQXN5bmNMb2NrZXIgd2lsbCBhdHRlbXB0IHRvIGxvY2sgdGhlIHByb2Nlc3MgYmVmb3JlIGZhaWxpbmcuXG4gICAqIERlZmF1bHRzIHRvIDUwMC5cbiAgICovXG4gIHJldHJ5QXR0ZW1wdHM/OiBudW1iZXI7XG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZXR3ZWVuIGF0dGVtcHRzIHRvIGxvY2sgdGhlIHByb2Nlc3MuXG4gICAqIERlZmF1bHRzIHRvIDUwMG1zLlxuICAgKiAqL1xuICByZXRyeURlbGF5PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFRoZSByYXcgZm9ybWF0IG9mIGEgcGFja2FnZSBsZXZlbCBjb25maWd1cmF0aW9uIChhcyBpdCBhcHBlYXJzIGluIGNvbmZpZ3VyYXRpb24gZmlsZXMpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJhd05nY2NQYWNrYWdlQ29uZmlnIHtcbiAgLyoqXG4gICAqIFRoZSBlbnRyeS1wb2ludHMgdG8gY29uZmlndXJlIGZvciB0aGlzIHBhY2thZ2UuXG4gICAqXG4gICAqIEluIHRoZSBjb25maWcgZmlsZSB0aGUga2V5cyBhcmUgcGF0aHMgcmVsYXRpdmUgdG8gdGhlIHBhY2thZ2UgcGF0aC5cbiAgICovXG4gIGVudHJ5UG9pbnRzPzoge1tlbnRyeVBvaW50UGF0aDogc3RyaW5nXTogTmdjY0VudHJ5UG9pbnRDb25maWd9O1xuXG4gIC8qKlxuICAgKiBBIGNvbGxlY3Rpb24gb2YgcmVnZXhlcyB0aGF0IG1hdGNoIGRlZXAgaW1wb3J0cyB0byBpZ25vcmUsIGZvciB0aGlzIHBhY2thZ2UsIHJhdGhlciB0aGFuXG4gICAqIGRpc3BsYXlpbmcgYSB3YXJuaW5nLlxuICAgKi9cbiAgaWdub3JhYmxlRGVlcEltcG9ydE1hdGNoZXJzPzogUmVnRXhwW107XG59XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBhbiBlbnRyeS1wb2ludC5cbiAqXG4gKiBUaGUgZXhpc3RlbmNlIG9mIGEgY29uZmlndXJhdGlvbiBmb3IgYSBwYXRoIHRlbGxzIG5nY2MgdGhhdCB0aGlzIHNob3VsZCBiZSBjb25zaWRlcmVkIGZvclxuICogcHJvY2Vzc2luZyBhcyBhbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjRW50cnlQb2ludENvbmZpZyB7XG4gIC8qKiBEbyBub3QgcHJvY2VzcyAob3IgZXZlbiBhY2tub3dsZWRnZSB0aGUgZXhpc3RlbmNlIG9mKSB0aGlzIGVudHJ5LXBvaW50LCBpZiB0cnVlLiAqL1xuICBpZ25vcmU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGlzIHByb3BlcnR5LCBpZiBwcm92aWRlZCwgaG9sZHMgdmFsdWVzIHRoYXQgd2lsbCBvdmVycmlkZSBlcXVpdmFsZW50IHByb3BlcnRpZXMgaW4gYW5cbiAgICogZW50cnktcG9pbnQncyBwYWNrYWdlLmpzb24gZmlsZS5cbiAgICovXG4gIG92ZXJyaWRlPzogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzTWFwO1xuXG4gIC8qKlxuICAgKiBOb3JtYWxseSwgbmdjYyB3aWxsIHNraXAgY29tcGlsYXRpb24gb2YgZW50cnlwb2ludHMgdGhhdCBjb250YWluIGltcG9ydHMgdGhhdCBjYW4ndCBiZSByZXNvbHZlZFxuICAgKiBvciB1bmRlcnN0b29kLiBJZiB0aGlzIG9wdGlvbiBpcyBzcGVjaWZpZWQsIG5nY2Mgd2lsbCBwcm9jZWVkIHdpdGggY29tcGlsaW5nIHRoZSBlbnRyeXBvaW50XG4gICAqIGV2ZW4gaW4gdGhlIGZhY2Ugb2Ygc3VjaCBtaXNzaW5nIGRlcGVuZGVuY2llcy5cbiAgICovXG4gIGlnbm9yZU1pc3NpbmdEZXBlbmRlbmNpZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBFbmFibGluZyB0aGlzIG9wdGlvbiBmb3IgYW4gZW50cnlwb2ludCB0ZWxscyBuZ2NjIHRoYXQgZGVlcCBpbXBvcnRzIG1pZ2h0IGJlIHVzZWQgZm9yIHRoZSBmaWxlc1xuICAgKiBpdCBjb250YWlucywgYW5kIHRoYXQgaXQgc2hvdWxkIGdlbmVyYXRlIHByaXZhdGUgcmUtZXhwb3J0cyBhbG9uZ3NpZGUgdGhlIE5nTW9kdWxlIG9mIGFsbCB0aGVcbiAgICogZGlyZWN0aXZlcy9waXBlcyBpdCBtYWtlcyBhdmFpbGFibGUgaW4gc3VwcG9ydCBvZiB0aG9zZSBpbXBvcnRzLlxuICAgKi9cbiAgZ2VuZXJhdGVEZWVwUmVleHBvcnRzPzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIFZlcnNpb25lZFBhY2thZ2VDb25maWcgZXh0ZW5kcyBSYXdOZ2NjUGFja2FnZUNvbmZpZyB7XG4gIHZlcnNpb25SYW5nZTogc3RyaW5nO1xufVxuXG50eXBlIFBhcnRpYWxseVByb2Nlc3NlZENvbmZpZyA9IFJlcXVpcmVkPE5nY2NQcm9qZWN0Q29uZmlnPFZlcnNpb25lZFBhY2thZ2VDb25maWdbXT4+O1xuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIG5nY2MuXG4gKlxuICogVGhpcyBpcyB0aGUgdWx0aW1hdGUgZmFsbGJhY2sgY29uZmlndXJhdGlvbiB0aGF0IG5nY2Mgd2lsbCB1c2UgaWYgdGhlcmUgaXMgbm8gY29uZmlndXJhdGlvblxuICogZm9yIGEgcGFja2FnZSBhdCB0aGUgcGFja2FnZSBsZXZlbCBvciBwcm9qZWN0IGxldmVsLlxuICpcbiAqIFRoaXMgY29uZmlndXJhdGlvbiBpcyBmb3IgcGFja2FnZXMgdGhhdCBhcmUgXCJkZWFkXCIgLSBpLmUuIG5vIGxvbmdlciBtYWludGFpbmVkIGFuZCBzbyBhcmVcbiAqIHVubGlrZWx5IHRvIGJlIGZpeGVkIHRvIHdvcmsgd2l0aCBuZ2NjLCBub3IgcHJvdmlkZSBhIHBhY2thZ2UgbGV2ZWwgY29uZmlnIG9mIHRoZWlyIG93bi5cbiAqXG4gKiBUaGUgZmFsbGJhY2sgcHJvY2VzcyBmb3IgbG9va2luZyB1cCBjb25maWd1cmF0aW9uIGlzOlxuICpcbiAqIFByb2plY3QgLT4gUGFja2FnZSAtPiBEZWZhdWx0XG4gKlxuICogSWYgYSBwYWNrYWdlIHByb3ZpZGVzIGl0cyBvd24gY29uZmlndXJhdGlvbiB0aGVuIHRoYXQgd291bGQgb3ZlcnJpZGUgdGhpcyBkZWZhdWx0IG9uZS5cbiAqXG4gKiBBbHNvIGFwcGxpY2F0aW9uIGRldmVsb3BlcnMgY2FuIGFsd2F5cyBwcm92aWRlIGNvbmZpZ3VyYXRpb24gYXQgdGhlaXIgcHJvamVjdCBsZXZlbCB3aGljaFxuICogd2lsbCBvdmVycmlkZSBldmVyeXRoaW5nIGVsc2UuXG4gKlxuICogTm90ZSB0aGF0IHRoZSBmYWxsYmFjayBpcyBwYWNrYWdlIGJhc2VkIG5vdCBlbnRyeS1wb2ludCBiYXNlZC5cbiAqIEZvciBleGFtcGxlLCBpZiBhIHRoZXJlIGlzIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSBhdCB0aGUgcHJvamVjdCBsZXZlbCB0aGlzIHdpbGwgcmVwbGFjZSBhbGxcbiAqIGVudHJ5LXBvaW50IGNvbmZpZ3VyYXRpb25zIHRoYXQgbWF5IGhhdmUgYmVlbiBwcm92aWRlZCBpbiB0aGUgcGFja2FnZSBsZXZlbCBvciBkZWZhdWx0IGxldmVsXG4gKiBjb25maWd1cmF0aW9ucywgZXZlbiBpZiB0aGUgcHJvamVjdCBsZXZlbCBjb25maWd1cmF0aW9uIGRvZXMgbm90IHByb3ZpZGUgZm9yIGEgZ2l2ZW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX05HQ0NfQ09ORklHOiBOZ2NjUHJvamVjdENvbmZpZyA9IHtcbiAgcGFja2FnZXM6IHtcbiAgICAvLyBBZGQgZGVmYXVsdCBwYWNrYWdlIGNvbmZpZ3VyYXRpb24gaGVyZS4gRm9yIGV4YW1wbGU6XG4gICAgLy8gJ0Bhbmd1bGFyL2ZpcmVAXjUuMi4wJzoge1xuICAgIC8vICAgZW50cnlQb2ludHM6IHtcbiAgICAvLyAgICAgJy4vZGF0YWJhc2UtZGVwcmVjYXRlZCc6IHtpZ25vcmU6IHRydWV9LFxuICAgIC8vICAgfSxcbiAgICAvLyB9LFxuXG4gICAgLy8gVGhlIHBhY2thZ2UgZG9lcyBub3QgY29udGFpbiBhbnkgYC5tZXRhZGF0YS5qc29uYCBmaWxlcyBpbiB0aGUgcm9vdCBkaXJlY3RvcnkgYnV0IG9ubHkgaW5zaWRlXG4gICAgLy8gYGRpc3QvYC4gV2l0aG91dCB0aGlzIGNvbmZpZywgbmdjYyBkb2VzIG5vdCByZWFsaXplIHRoaXMgaXMgYSBWaWV3RW5naW5lLWJ1aWx0IEFuZ3VsYXJcbiAgICAvLyBwYWNrYWdlIHRoYXQgbmVlZHMgdG8gYmUgY29tcGlsZWQgdG8gSXZ5LlxuICAgICdhbmd1bGFyMi1oaWdoY2hhcnRzJzoge1xuICAgICAgZW50cnlQb2ludHM6IHtcbiAgICAgICAgJy4nOiB7XG4gICAgICAgICAgb3ZlcnJpZGU6IHtcbiAgICAgICAgICAgIG1haW46ICcuL2luZGV4LmpzJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gVGhlIGBkaXN0L2AgZGlyZWN0b3J5IGhhcyBhIGR1cGxpY2F0ZSBgcGFja2FnZS5qc29uYCBwb2ludGluZyB0byB0aGUgc2FtZSBmaWxlcywgd2hpY2ggKHVuZGVyXG4gICAgLy8gY2VydGFpbiBjb25maWd1cmF0aW9ucykgY2FuIGNhdXNlcyBuZ2NjIHRvIHRyeSB0byBwcm9jZXNzIHRoZSBmaWxlcyB0d2ljZSBhbmQgZmFpbC5cbiAgICAvLyBJZ25vcmUgdGhlIGBkaXN0L2AgZW50cnktcG9pbnQuXG4gICAgJ25nMi1kcmFndWxhJzoge1xuICAgICAgZW50cnlQb2ludHM6IHtcbiAgICAgICAgJy4vZGlzdCc6IHtpZ25vcmU6IHRydWV9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBsb2NraW5nOiB7XG4gICAgcmV0cnlEZWxheTogNTAwLFxuICAgIHJldHJ5QXR0ZW1wdHM6IDUwMCxcbiAgfVxufTtcblxuY29uc3QgTkdDQ19DT05GSUdfRklMRU5BTUUgPSAnbmdjYy5jb25maWcuanMnO1xuXG4vKipcbiAqIFRoZSBwcm9jZXNzZWQgcGFja2FnZSBsZXZlbCBjb25maWd1cmF0aW9uIGFzIGEgcmVzdWx0IG9mIHByb2Nlc3NpbmcgYSByYXcgcGFja2FnZSBsZXZlbCBjb25maWcuXG4gKi9cbmV4cG9ydCBjbGFzcyBQcm9jZXNzZWROZ2NjUGFja2FnZUNvbmZpZyBpbXBsZW1lbnRzIE9taXQ8UmF3TmdjY1BhY2thZ2VDb25maWcsICdlbnRyeVBvaW50cyc+IHtcbiAgLyoqXG4gICAqIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoaXMgaW5zdGFuY2Ugb2YgdGhlIHBhY2thZ2UuXG4gICAqIE5vdGUgdGhhdCB0aGVyZSBtYXkgYmUgbXVsdGlwbGUgaW5zdGFuY2VzIG9mIGEgcGFja2FnZSBpbnNpZGUgYSBwcm9qZWN0IGluIG5lc3RlZFxuICAgKiBgbm9kZV9tb2R1bGVzL2AuIEZvciBleGFtcGxlLCBvbmUgYXQgYDxwcm9qZWN0LXJvb3Q+L25vZGVfbW9kdWxlcy9zb21lLXBhY2thZ2UvYCBhbmQgb25lIGF0XG4gICAqIGA8cHJvamVjdC1yb290Pi9ub2RlX21vZHVsZXMvb3RoZXItcGFja2FnZS9ub2RlX21vZHVsZXMvc29tZS1wYWNrYWdlL2AuXG4gICAqL1xuICBwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGg7XG5cbiAgLyoqXG4gICAqIFRoZSBlbnRyeS1wb2ludHMgdG8gY29uZmlndXJlIGZvciB0aGlzIHBhY2thZ2UuXG4gICAqXG4gICAqIEluIGNvbnRyYXN0IHRvIGBSYXdOZ2NjUGFja2FnZUNvbmZpZ2AsIHRoZSBwYXRocyBhcmUgYWJzb2x1dGUgYW5kIHRha2UgdGhlIHBhdGggb2YgdGhlIHNwZWNpZmljXG4gICAqIGluc3RhbmNlIG9mIHRoZSBwYWNrYWdlIGludG8gYWNjb3VudC5cbiAgICovXG4gIGVudHJ5UG9pbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIE5nY2NFbnRyeVBvaW50Q29uZmlnPjtcblxuICAvKipcbiAgICogQSBjb2xsZWN0aW9uIG9mIHJlZ2V4ZXMgdGhhdCBtYXRjaCBkZWVwIGltcG9ydHMgdG8gaWdub3JlLCBmb3IgdGhpcyBwYWNrYWdlLCByYXRoZXIgdGhhblxuICAgKiBkaXNwbGF5aW5nIGEgd2FybmluZy5cbiAgICovXG4gIGlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVyczogUmVnRXhwW107XG5cbiAgY29uc3RydWN0b3IoZnM6IFBhdGhNYW5pcHVsYXRpb24sIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwge1xuICAgIGVudHJ5UG9pbnRzID0ge30sXG4gICAgaWdub3JhYmxlRGVlcEltcG9ydE1hdGNoZXJzID0gW10sXG4gIH06IFJhd05nY2NQYWNrYWdlQ29uZmlnKSB7XG4gICAgY29uc3QgYWJzb2x1dGVQYXRoRW50cmllczogW0Fic29sdXRlRnNQYXRoLCBOZ2NjRW50cnlQb2ludENvbmZpZ11bXSA9XG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGVudHJ5UG9pbnRzKS5tYXAoKFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbGF0aXZlUGF0aCwgY29uZmlnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSkgPT4gW2ZzLnJlc29sdmUocGFja2FnZVBhdGgsIHJlbGF0aXZlUGF0aCksIGNvbmZpZ10pO1xuXG4gICAgdGhpcy5wYWNrYWdlUGF0aCA9IHBhY2thZ2VQYXRoO1xuICAgIHRoaXMuZW50cnlQb2ludHMgPSBuZXcgTWFwKGFic29sdXRlUGF0aEVudHJpZXMpO1xuICAgIHRoaXMuaWdub3JhYmxlRGVlcEltcG9ydE1hdGNoZXJzID0gaWdub3JhYmxlRGVlcEltcG9ydE1hdGNoZXJzO1xuICB9XG59XG5cbi8qKlxuICogTmdjYyBoYXMgYSBoaWVyYXJjaGljYWwgY29uZmlndXJhdGlvbiBzeXN0ZW0gdGhhdCBsZXRzIHVzIFwiZml4IHVwXCIgcGFja2FnZXMgdGhhdCBkbyBub3RcbiAqIHdvcmsgd2l0aCBuZ2NjIG91dCBvZiB0aGUgYm94LlxuICpcbiAqIFRoZXJlIGFyZSB0aHJlZSBsZXZlbHMgYXQgd2hpY2ggY29uZmlndXJhdGlvbiBjYW4gYmUgZGVjbGFyZWQ6XG4gKlxuICogKiBEZWZhdWx0IGxldmVsIC0gbmdjYyBjb21lcyB3aXRoIGJ1aWx0LWluIGNvbmZpZ3VyYXRpb24gZm9yIHdlbGwga25vd24gY2FzZXMuXG4gKiAqIFBhY2thZ2UgbGV2ZWwgLSBhIGxpYnJhcnkgYXV0aG9yIHB1Ymxpc2hlcyBhIGNvbmZpZ3VyYXRpb24gd2l0aCB0aGVpciBwYWNrYWdlIHRvIGZpeCBrbm93blxuICogICBpc3N1ZXMuXG4gKiAqIFByb2plY3QgbGV2ZWwgLSB0aGUgYXBwbGljYXRpb24gZGV2ZWxvcGVyIHByb3ZpZGVzIGEgY29uZmlndXJhdGlvbiB0aGF0IGZpeGVzIGlzc3VlcyBzcGVjaWZpY1xuICogICB0byB0aGUgbGlicmFyaWVzIHVzZWQgaW4gdGhlaXIgYXBwbGljYXRpb24uXG4gKlxuICogTmdjYyB3aWxsIG1hdGNoIGNvbmZpZ3VyYXRpb24gYmFzZWQgb24gdGhlIHBhY2thZ2UgbmFtZSBidXQgYWxzbyBvbiBpdHMgdmVyc2lvbi4gVGhpcyBhbGxvd3NcbiAqIGNvbmZpZ3VyYXRpb24gdG8gcHJvdmlkZSBkaWZmZXJlbnQgZml4ZXMgdG8gZGlmZmVyZW50IHZlcnNpb24gcmFuZ2VzIG9mIGEgcGFja2FnZS5cbiAqXG4gKiAqIFBhY2thZ2UgbGV2ZWwgY29uZmlndXJhdGlvbiBpcyBzcGVjaWZpYyB0byB0aGUgcGFja2FnZSB2ZXJzaW9uIHdoZXJlIHRoZSBjb25maWd1cmF0aW9uIGlzXG4gKiAgIGZvdW5kLlxuICogKiBEZWZhdWx0IGFuZCBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gc2hvdWxkIHByb3ZpZGUgdmVyc2lvbiByYW5nZXMgdG8gZW5zdXJlIHRoYXQgdGhlXG4gKiAgIGNvbmZpZ3VyYXRpb24gaXMgb25seSBhcHBsaWVkIHRvIHRoZSBhcHByb3ByaWF0ZSB2ZXJzaW9ucyBvZiBhIHBhY2thZ2UuXG4gKlxuICogV2hlbiBnZXR0aW5nIGEgY29uZmlndXJhdGlvbiBmb3IgYSBwYWNrYWdlICh2aWEgYGdldENvbmZpZygpYCkgdGhlIGNhbGxlciBzaG91bGQgcHJvdmlkZSB0aGVcbiAqIHZlcnNpb24gb2YgdGhlIHBhY2thZ2UgaW4gcXVlc3Rpb24sIGlmIGF2YWlsYWJsZS4gSWYgaXQgaXMgbm90IHByb3ZpZGVkIHRoZW4gdGhlIGZpcnN0IGF2YWlsYWJsZVxuICogY29uZmlndXJhdGlvbiBmb3IgYSBwYWNrYWdlIGlzIHJldHVybmVkLlxuICovXG5leHBvcnQgY2xhc3MgTmdjY0NvbmZpZ3VyYXRpb24ge1xuICBwcml2YXRlIGRlZmF1bHRDb25maWc6IFBhcnRpYWxseVByb2Nlc3NlZENvbmZpZztcbiAgcHJpdmF0ZSBwcm9qZWN0Q29uZmlnOiBQYXJ0aWFsbHlQcm9jZXNzZWRDb25maWc7XG4gIHByaXZhdGUgY2FjaGUgPSBuZXcgTWFwPHN0cmluZywgVmVyc2lvbmVkUGFja2FnZUNvbmZpZz4oKTtcbiAgcmVhZG9ubHkgaGFzaDogc3RyaW5nO1xuICByZWFkb25seSBoYXNoQWxnb3JpdGhtOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogUmVhZG9ubHlGaWxlU3lzdGVtLCBiYXNlRGlyOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHRoaXMuZGVmYXVsdENvbmZpZyA9IHRoaXMucHJvY2Vzc1Byb2plY3RDb25maWcoREVGQVVMVF9OR0NDX0NPTkZJRyk7XG4gICAgdGhpcy5wcm9qZWN0Q29uZmlnID0gdGhpcy5wcm9jZXNzUHJvamVjdENvbmZpZyh0aGlzLmxvYWRQcm9qZWN0Q29uZmlnKGJhc2VEaXIpKTtcbiAgICB0aGlzLmhhc2hBbGdvcml0aG0gPSB0aGlzLnByb2plY3RDb25maWcuaGFzaEFsZ29yaXRobTtcbiAgICB0aGlzLmhhc2ggPSB0aGlzLmNvbXB1dGVIYXNoKCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIGxvY2tpbmcgdGhlIG5nY2MgcHJvY2Vzcy5cbiAgICovXG4gIGdldExvY2tpbmdDb25maWcoKTogUmVxdWlyZWQ8UHJvY2Vzc0xvY2tpbmdDb25maWd1cmF0aW9uPiB7XG4gICAgbGV0IHtyZXRyeUF0dGVtcHRzLCByZXRyeURlbGF5fSA9IHRoaXMucHJvamVjdENvbmZpZy5sb2NraW5nO1xuICAgIGlmIChyZXRyeUF0dGVtcHRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHJ5QXR0ZW1wdHMgPSB0aGlzLmRlZmF1bHRDb25maWcubG9ja2luZy5yZXRyeUF0dGVtcHRzITtcbiAgICB9XG4gICAgaWYgKHJldHJ5RGVsYXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0cnlEZWxheSA9IHRoaXMuZGVmYXVsdENvbmZpZy5sb2NraW5nLnJldHJ5RGVsYXkhO1xuICAgIH1cbiAgICByZXR1cm4ge3JldHJ5QXR0ZW1wdHMsIHJldHJ5RGVsYXl9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBnaXZlbiBgdmVyc2lvbmAgb2YgYSBwYWNrYWdlIGF0IGBwYWNrYWdlUGF0aGAuXG4gICAqXG4gICAqIEBwYXJhbSBwYWNrYWdlTmFtZSBUaGUgbmFtZSBvZiB0aGUgcGFja2FnZSB3aG9zZSBjb25maWcgd2Ugd2FudC5cbiAgICogQHBhcmFtIHBhY2thZ2VQYXRoIFRoZSBwYXRoIHRvIHRoZSBwYWNrYWdlIHdob3NlIGNvbmZpZyB3ZSB3YW50LlxuICAgKiBAcGFyYW0gdmVyc2lvbiBUaGUgdmVyc2lvbiBvZiB0aGUgcGFja2FnZSB3aG9zZSBjb25maWcgd2Ugd2FudCwgb3IgYG51bGxgIGlmIHRoZSBwYWNrYWdlJ3NcbiAgICogcGFja2FnZS5qc29uIGRpZCBub3QgZXhpc3Qgb3Igd2FzIGludmFsaWQuXG4gICAqL1xuICBnZXRQYWNrYWdlQ29uZmlnKHBhY2thZ2VOYW1lOiBzdHJpbmcsIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgdmVyc2lvbjogc3RyaW5nfG51bGwpOlxuICAgICAgUHJvY2Vzc2VkTmdjY1BhY2thZ2VDb25maWcge1xuICAgIGNvbnN0IHJhd1BhY2thZ2VDb25maWcgPSB0aGlzLmdldFJhd1BhY2thZ2VDb25maWcocGFja2FnZU5hbWUsIHBhY2thZ2VQYXRoLCB2ZXJzaW9uKTtcbiAgICByZXR1cm4gbmV3IFByb2Nlc3NlZE5nY2NQYWNrYWdlQ29uZmlnKHRoaXMuZnMsIHBhY2thZ2VQYXRoLCByYXdQYWNrYWdlQ29uZmlnKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmF3UGFja2FnZUNvbmZpZyhcbiAgICAgIHBhY2thZ2VOYW1lOiBzdHJpbmcsIHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIHZlcnNpb246IHN0cmluZ3xudWxsKTogVmVyc2lvbmVkUGFja2FnZUNvbmZpZyB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBwYWNrYWdlTmFtZSArICh2ZXJzaW9uICE9PSBudWxsID8gYEAke3ZlcnNpb259YCA6ICcnKTtcbiAgICBpZiAodGhpcy5jYWNoZS5oYXMoY2FjaGVLZXkpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQoY2FjaGVLZXkpITtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0TGV2ZWxDb25maWcgPSB0aGlzLnByb2plY3RDb25maWcucGFja2FnZXMgP1xuICAgICAgICBmaW5kU2F0aXNmYWN0b3J5VmVyc2lvbih0aGlzLnByb2plY3RDb25maWcucGFja2FnZXNbcGFja2FnZU5hbWVdLCB2ZXJzaW9uKSA6XG4gICAgICAgIG51bGw7XG4gICAgaWYgKHByb2plY3RMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIHByb2plY3RMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gcHJvamVjdExldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VMZXZlbENvbmZpZyA9IHRoaXMubG9hZFBhY2thZ2VDb25maWcocGFja2FnZVBhdGgsIHZlcnNpb24pO1xuICAgIGlmIChwYWNrYWdlTGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBwYWNrYWdlTGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIHBhY2thZ2VMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBkZWZhdWx0TGV2ZWxDb25maWcgPSB0aGlzLmRlZmF1bHRDb25maWcucGFja2FnZXMgP1xuICAgICAgICBmaW5kU2F0aXNmYWN0b3J5VmVyc2lvbih0aGlzLmRlZmF1bHRDb25maWcucGFja2FnZXNbcGFja2FnZU5hbWVdLCB2ZXJzaW9uKSA6XG4gICAgICAgIG51bGw7XG4gICAgaWYgKGRlZmF1bHRMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIGRlZmF1bHRMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gZGVmYXVsdExldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIHJldHVybiB7dmVyc2lvblJhbmdlOiAnKid9O1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzUHJvamVjdENvbmZpZyhwcm9qZWN0Q29uZmlnOiBOZ2NjUHJvamVjdENvbmZpZyk6IFBhcnRpYWxseVByb2Nlc3NlZENvbmZpZyB7XG4gICAgY29uc3QgcHJvY2Vzc2VkQ29uZmlnOlxuICAgICAgICBQYXJ0aWFsbHlQcm9jZXNzZWRDb25maWcgPSB7cGFja2FnZXM6IHt9LCBsb2NraW5nOiB7fSwgaGFzaEFsZ29yaXRobTogJ3NoYTI1Nid9O1xuXG4gICAgLy8gbG9ja2luZyBjb25maWd1cmF0aW9uXG4gICAgaWYgKHByb2plY3RDb25maWcubG9ja2luZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwcm9jZXNzZWRDb25maWcubG9ja2luZyA9IHByb2plY3RDb25maWcubG9ja2luZztcbiAgICB9XG5cbiAgICAvLyBwYWNrYWdlcyBjb25maWd1cmF0aW9uXG4gICAgZm9yIChjb25zdCBwYWNrYWdlTmFtZUFuZFZlcnNpb24gaW4gcHJvamVjdENvbmZpZy5wYWNrYWdlcykge1xuICAgICAgY29uc3QgcGFja2FnZUNvbmZpZyA9IHByb2plY3RDb25maWcucGFja2FnZXNbcGFja2FnZU5hbWVBbmRWZXJzaW9uXTtcbiAgICAgIGlmIChwYWNrYWdlQ29uZmlnKSB7XG4gICAgICAgIGNvbnN0IFtwYWNrYWdlTmFtZSwgdmVyc2lvblJhbmdlID0gJyonXSA9IHRoaXMuc3BsaXROYW1lQW5kVmVyc2lvbihwYWNrYWdlTmFtZUFuZFZlcnNpb24pO1xuICAgICAgICBjb25zdCBwYWNrYWdlQ29uZmlncyA9XG4gICAgICAgICAgICBwcm9jZXNzZWRDb25maWcucGFja2FnZXNbcGFja2FnZU5hbWVdIHx8IChwcm9jZXNzZWRDb25maWcucGFja2FnZXNbcGFja2FnZU5hbWVdID0gW10pO1xuICAgICAgICBwYWNrYWdlQ29uZmlncyEucHVzaCh7Li4ucGFja2FnZUNvbmZpZywgdmVyc2lvblJhbmdlfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gaGFzaCBhbGdvcml0aG0gY29uZmlnXG4gICAgaWYgKHByb2plY3RDb25maWcuaGFzaEFsZ29yaXRobSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwcm9jZXNzZWRDb25maWcuaGFzaEFsZ29yaXRobSA9IHByb2plY3RDb25maWcuaGFzaEFsZ29yaXRobTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvY2Vzc2VkQ29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkUHJvamVjdENvbmZpZyhiYXNlRGlyOiBBYnNvbHV0ZUZzUGF0aCk6IE5nY2NQcm9qZWN0Q29uZmlnIHtcbiAgICBjb25zdCBjb25maWdGaWxlUGF0aCA9IHRoaXMuZnMuam9pbihiYXNlRGlyLCBOR0NDX0NPTkZJR19GSUxFTkFNRSk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGNvbmZpZ0ZpbGVQYXRoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUgYXQgXCIke2NvbmZpZ0ZpbGVQYXRofVwiOiBgICsgZS5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtwYWNrYWdlczoge319O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9hZFBhY2thZ2VDb25maWcocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6XG4gICAgICBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnfG51bGwge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gdGhpcy5mcy5qb2luKHBhY2thZ2VQYXRoLCBOR0NDX0NPTkZJR19GSUxFTkFNRSk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGNvbmZpZ0ZpbGVQYXRoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFja2FnZUNvbmZpZyA9IHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLnBhY2thZ2VDb25maWcsXG4gICAgICAgICAgdmVyc2lvblJhbmdlOiB2ZXJzaW9uIHx8ICcqJyxcbiAgICAgICAgfTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBhY2thZ2UgY29uZmlndXJhdGlvbiBmaWxlIGF0IFwiJHtjb25maWdGaWxlUGF0aH1cIjogYCArIGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXZhbFNyY0ZpbGUoc3JjUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBhbnkge1xuICAgIGNvbnN0IHNyYyA9IHRoaXMuZnMucmVhZEZpbGUoc3JjUGF0aCk7XG4gICAgY29uc3QgdGhlRXhwb3J0cyA9IHt9O1xuICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICBtb2R1bGU6IHtleHBvcnRzOiB0aGVFeHBvcnRzfSxcbiAgICAgIGV4cG9ydHM6IHRoZUV4cG9ydHMsXG4gICAgICByZXF1aXJlLFxuICAgICAgX19kaXJuYW1lOiB0aGlzLmZzLmRpcm5hbWUoc3JjUGF0aCksXG4gICAgICBfX2ZpbGVuYW1lOiBzcmNQYXRoXG4gICAgfTtcbiAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc3JjLCBzYW5kYm94LCB7ZmlsZW5hbWU6IHNyY1BhdGh9KTtcbiAgICByZXR1cm4gc2FuZGJveC5tb2R1bGUuZXhwb3J0cztcbiAgfVxuXG4gIHByaXZhdGUgc3BsaXROYW1lQW5kVmVyc2lvbihwYWNrYWdlTmFtZUFuZFZlcnNpb246IHN0cmluZyk6IFtzdHJpbmcsIHN0cmluZ3x1bmRlZmluZWRdIHtcbiAgICBjb25zdCB2ZXJzaW9uSW5kZXggPSBwYWNrYWdlTmFtZUFuZFZlcnNpb24ubGFzdEluZGV4T2YoJ0AnKTtcbiAgICAvLyBOb3RlIHRoYXQgPiAwIGlzIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudCB0byBtYXRjaCBAIGF0IHRoZSBzdGFydCBvZiB0aGUgbGluZVxuICAgIC8vIHdoaWNoIGlzIHdoYXQgeW91IHdvdWxkIGhhdmUgd2l0aCBhIG5hbWVzcGFjZWQgcGFja2FnZSwgZS5nLiBgQGFuZ3VsYXIvY29tbW9uYC5cbiAgICByZXR1cm4gdmVyc2lvbkluZGV4ID4gMCA/XG4gICAgICAgIFtcbiAgICAgICAgICBwYWNrYWdlTmFtZUFuZFZlcnNpb24uc3Vic3RyaW5nKDAsIHZlcnNpb25JbmRleCksXG4gICAgICAgICAgcGFja2FnZU5hbWVBbmRWZXJzaW9uLnN1YnN0cmluZyh2ZXJzaW9uSW5kZXggKyAxKSxcbiAgICAgICAgXSA6XG4gICAgICAgIFtwYWNrYWdlTmFtZUFuZFZlcnNpb24sIHVuZGVmaW5lZF07XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVIYXNoKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNyZWF0ZUhhc2godGhpcy5oYXNoQWxnb3JpdGhtKS51cGRhdGUoSlNPTi5zdHJpbmdpZnkodGhpcy5wcm9qZWN0Q29uZmlnKSkuZGlnZXN0KCdoZXgnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU2F0aXNmYWN0b3J5VmVyc2lvbihjb25maWdzOiBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW118dW5kZWZpbmVkLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6XG4gICAgVmVyc2lvbmVkUGFja2FnZUNvbmZpZ3xudWxsIHtcbiAgaWYgKGNvbmZpZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmICh2ZXJzaW9uID09PSBudWxsKSB7XG4gICAgLy8gVGhlIHBhY2thZ2UgaGFzIG5vIHZlcnNpb24gKCEpIC0gcGVyaGFwcyB0aGUgZW50cnktcG9pbnQgd2FzIGZyb20gYSBkZWVwIGltcG9ydCwgd2hpY2ggbWFkZVxuICAgIC8vIGl0IGltcG9zc2libGUgdG8gZmluZCB0aGUgcGFja2FnZS5qc29uLlxuICAgIC8vIFNvIGp1c3QgcmV0dXJuIHRoZSBmaXJzdCBjb25maWcgdGhhdCBtYXRjaGVzIHRoZSBwYWNrYWdlIG5hbWUuXG4gICAgcmV0dXJuIGNvbmZpZ3NbMF07XG4gIH1cbiAgcmV0dXJuIGNvbmZpZ3MuZmluZChcbiAgICAgICAgICAgICBjb25maWcgPT4gc2F0aXNmaWVzKHZlcnNpb24sIGNvbmZpZy52ZXJzaW9uUmFuZ2UsIHtpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZX0pKSB8fFxuICAgICAgbnVsbDtcbn1cbiJdfQ==