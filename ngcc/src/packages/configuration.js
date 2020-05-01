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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFrQztJQUNsQyxpQ0FBaUM7SUFDakMsdUJBQXlCO0lBRXpCLDJFQUFrRztJQW1GbEc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDVSxRQUFBLG1CQUFtQixHQUFzQjtRQUNwRCxRQUFRLEVBQUU7WUFDUix1REFBdUQ7WUFDdkQsNEJBQTRCO1lBQzVCLG1CQUFtQjtZQUNuQiwrQ0FBK0M7WUFDL0MsT0FBTztZQUNQLEtBQUs7WUFFTCxnR0FBZ0c7WUFDaEcseUZBQXlGO1lBQ3pGLDRDQUE0QztZQUM1QyxxQkFBcUIsRUFBRTtnQkFDckIsV0FBVyxFQUFFO29CQUNYLEdBQUcsRUFBRTt3QkFDSCxRQUFRLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFlBQVk7eUJBQ25CO3FCQUNGO2lCQUNGO2FBQ0Y7WUFFRCxnR0FBZ0c7WUFDaEcsc0ZBQXNGO1lBQ3RGLGtDQUFrQztZQUNsQyxhQUFhLEVBQUU7Z0JBQ2IsV0FBVyxFQUFFO29CQUNYLFFBQVEsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUM7aUJBQ3pCO2FBQ0Y7U0FDRjtRQUNELE9BQU8sRUFBRTtZQUNQLFVBQVUsRUFBRSxHQUFHO1lBQ2YsYUFBYSxFQUFFLEdBQUc7U0FDbkI7S0FDRixDQUFDO0lBUUYsSUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQztJQUU5Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0F1Qkc7SUFDSDtRQU1FLDJCQUFvQixFQUFjLEVBQUUsT0FBdUI7WUFBdkMsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUgxQixVQUFLLEdBQUcsSUFBSSxHQUFHLEVB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UUFDcEYsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQWpLRCxJQWlLQztJQWpLWSw4Q0FBaUI7SUFtSzlCLFNBQVMsdUJBQXVCLENBQUMsT0FBMkMsRUFBRSxPQUFvQjtRQUVoRyxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7WUFDekIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtZQUNwQiw4RkFBOEY7WUFDOUYsMENBQTBDO1lBQzFDLGlFQUFpRTtZQUNqRSxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQjtRQUNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FDUixVQUFBLE1BQU0sSUFBSSxPQUFBLGtCQUFTLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUFsRSxDQUFrRSxDQUFDO1lBQ3BGLElBQUksQ0FBQztJQUNYLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NyZWF0ZUhhc2h9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQge3NhdGlzZmllc30gZnJvbSAnc2VtdmVyJztcbmltcG9ydCAqIGFzIHZtIGZyb20gJ3ZtJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgZGlybmFtZSwgRmlsZVN5c3RlbSwgam9pbiwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXB9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG4vKipcbiAqIFRoZSBmb3JtYXQgb2YgYSBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjUHJvamVjdENvbmZpZzxUID0gTmdjY1BhY2thZ2VDb25maWc+IHtcbiAgLyoqXG4gICAqIFRoZSBwYWNrYWdlcyB0aGF0IGFyZSBjb25maWd1cmVkIGJ5IHRoaXMgcHJvamVjdCBjb25maWcuXG4gICAqL1xuICBwYWNrYWdlcz86IHtbcGFja2FnZVBhdGg6IHN0cmluZ106IFR9O1xuICAvKipcbiAgICogT3B0aW9ucyB0aGF0IGNvbnRyb2wgaG93IGxvY2tpbmcgdGhlIHByb2Nlc3MgaXMgaGFuZGxlZC5cbiAgICovXG4gIGxvY2tpbmc/OiBQcm9jZXNzTG9ja2luZ0NvbmZpZ3VyYXRpb247XG59XG5cbi8qKlxuICogT3B0aW9ucyB0aGF0IGNvbnRyb2wgaG93IGxvY2tpbmcgdGhlIHByb2Nlc3MgaXMgaGFuZGxlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQcm9jZXNzTG9ja2luZ0NvbmZpZ3VyYXRpb24ge1xuICAvKipcbiAgICogVGhlIG51bWJlciBvZiB0aW1lcyB0aGUgQXN5bmNMb2NrZXIgd2lsbCBhdHRlbXB0IHRvIGxvY2sgdGhlIHByb2Nlc3MgYmVmb3JlIGZhaWxpbmcuXG4gICAqIERlZmF1bHRzIHRvIDUwMC5cbiAgICovXG4gIHJldHJ5QXR0ZW1wdHM/OiBudW1iZXI7XG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZXR3ZWVuIGF0dGVtcHRzIHRvIGxvY2sgdGhlIHByb2Nlc3MuXG4gICAqIERlZmF1bHRzIHRvIDUwMG1zLlxuICAgKiAqL1xuICByZXRyeURlbGF5PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFRoZSBmb3JtYXQgb2YgYSBwYWNrYWdlIGxldmVsIGNvbmZpZ3VyYXRpb24gZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjUGFja2FnZUNvbmZpZyB7XG4gIC8qKlxuICAgKiBUaGUgZW50cnktcG9pbnRzIHRvIGNvbmZpZ3VyZSBmb3IgdGhpcyBwYWNrYWdlLlxuICAgKlxuICAgKiBJbiB0aGUgY29uZmlnIGZpbGUgdGhlIGtleXMgY2FuIGJlIHBhdGhzIHJlbGF0aXZlIHRvIHRoZSBwYWNrYWdlIHBhdGg7XG4gICAqIGJ1dCB3aGVuIGJlaW5nIHJlYWQgYmFjayBmcm9tIHRoZSBgTmdjY0NvbmZpZ3VyYXRpb25gIHNlcnZpY2UsIHRoZXNlIHBhdGhzXG4gICAqIHdpbGwgYmUgYWJzb2x1dGUuXG4gICAqL1xuICBlbnRyeVBvaW50czoge1tlbnRyeVBvaW50UGF0aDogc3RyaW5nXTogTmdjY0VudHJ5UG9pbnRDb25maWc7fTtcbiAgLyoqXG4gICAqIEEgY29sbGVjdGlvbiBvZiByZWdleGVzIHRoYXQgbWF0Y2ggZGVlcCBpbXBvcnRzIHRvIGlnbm9yZSwgZm9yIHRoaXMgcGFja2FnZSwgcmF0aGVyIHRoYW5cbiAgICogZGlzcGxheWluZyBhIHdhcm5pbmcuXG4gICAqL1xuICBpZ25vcmFibGVEZWVwSW1wb3J0TWF0Y2hlcnM/OiBSZWdFeHBbXTtcbn1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIGFuIGVudHJ5LXBvaW50LlxuICpcbiAqIFRoZSBleGlzdGVuY2Ugb2YgYSBjb25maWd1cmF0aW9uIGZvciBhIHBhdGggdGVsbHMgbmdjYyB0aGF0IHRoaXMgc2hvdWxkIGJlIGNvbnNpZGVyZWQgZm9yXG4gKiBwcm9jZXNzaW5nIGFzIGFuIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NFbnRyeVBvaW50Q29uZmlnIHtcbiAgLyoqIERvIG5vdCBwcm9jZXNzIChvciBldmVuIGFja25vd2xlZGdlIHRoZSBleGlzdGVuY2Ugb2YpIHRoaXMgZW50cnktcG9pbnQsIGlmIHRydWUuICovXG4gIGlnbm9yZT86IGJvb2xlYW47XG4gIC8qKlxuICAgKiBUaGlzIHByb3BlcnR5LCBpZiBwcm92aWRlZCwgaG9sZHMgdmFsdWVzIHRoYXQgd2lsbCBvdmVycmlkZSBlcXVpdmFsZW50IHByb3BlcnRpZXMgaW4gYW5cbiAgICogZW50cnktcG9pbnQncyBwYWNrYWdlLmpzb24gZmlsZS5cbiAgICovXG4gIG92ZXJyaWRlPzogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzTWFwO1xuXG4gIC8qKlxuICAgKiBOb3JtYWxseSwgbmdjYyB3aWxsIHNraXAgY29tcGlsYXRpb24gb2YgZW50cnlwb2ludHMgdGhhdCBjb250YWluIGltcG9ydHMgdGhhdCBjYW4ndCBiZSByZXNvbHZlZFxuICAgKiBvciB1bmRlcnN0b29kLiBJZiB0aGlzIG9wdGlvbiBpcyBzcGVjaWZpZWQsIG5nY2Mgd2lsbCBwcm9jZWVkIHdpdGggY29tcGlsaW5nIHRoZSBlbnRyeXBvaW50XG4gICAqIGV2ZW4gaW4gdGhlIGZhY2Ugb2Ygc3VjaCBtaXNzaW5nIGRlcGVuZGVuY2llcy5cbiAgICovXG4gIGlnbm9yZU1pc3NpbmdEZXBlbmRlbmNpZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBFbmFibGluZyB0aGlzIG9wdGlvbiBmb3IgYW4gZW50cnlwb2ludCB0ZWxscyBuZ2NjIHRoYXQgZGVlcCBpbXBvcnRzIG1pZ2h0IGJlIHVzZWQgZm9yIHRoZSBmaWxlc1xuICAgKiBpdCBjb250YWlucywgYW5kIHRoYXQgaXQgc2hvdWxkIGdlbmVyYXRlIHByaXZhdGUgcmUtZXhwb3J0cyBhbG9uZ3NpZGUgdGhlIE5nTW9kdWxlIG9mIGFsbCB0aGVcbiAgICogZGlyZWN0aXZlcy9waXBlcyBpdCBtYWtlcyBhdmFpbGFibGUgaW4gc3VwcG9ydCBvZiB0aG9zZSBpbXBvcnRzLlxuICAgKi9cbiAgZ2VuZXJhdGVEZWVwUmVleHBvcnRzPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBuZ2NjLlxuICpcbiAqIFRoaXMgaXMgdGhlIHVsdGltYXRlIGZhbGxiYWNrIGNvbmZpZ3VyYXRpb24gdGhhdCBuZ2NjIHdpbGwgdXNlIGlmIHRoZXJlIGlzIG5vIGNvbmZpZ3VyYXRpb25cbiAqIGZvciBhIHBhY2thZ2UgYXQgdGhlIHBhY2thZ2UgbGV2ZWwgb3IgcHJvamVjdCBsZXZlbC5cbiAqXG4gKiBUaGlzIGNvbmZpZ3VyYXRpb24gaXMgZm9yIHBhY2thZ2VzIHRoYXQgYXJlIFwiZGVhZFwiIC0gaS5lLiBubyBsb25nZXIgbWFpbnRhaW5lZCBhbmQgc28gYXJlXG4gKiB1bmxpa2VseSB0byBiZSBmaXhlZCB0byB3b3JrIHdpdGggbmdjYywgbm9yIHByb3ZpZGUgYSBwYWNrYWdlIGxldmVsIGNvbmZpZyBvZiB0aGVpciBvd24uXG4gKlxuICogVGhlIGZhbGxiYWNrIHByb2Nlc3MgZm9yIGxvb2tpbmcgdXAgY29uZmlndXJhdGlvbiBpczpcbiAqXG4gKiBQcm9qZWN0IC0+IFBhY2thZ2UgLT4gRGVmYXVsdFxuICpcbiAqIElmIGEgcGFja2FnZSBwcm92aWRlcyBpdHMgb3duIGNvbmZpZ3VyYXRpb24gdGhlbiB0aGF0IHdvdWxkIG92ZXJyaWRlIHRoaXMgZGVmYXVsdCBvbmUuXG4gKlxuICogQWxzbyBhcHBsaWNhdGlvbiBkZXZlbG9wZXJzIGNhbiBhbHdheXMgcHJvdmlkZSBjb25maWd1cmF0aW9uIGF0IHRoZWlyIHByb2plY3QgbGV2ZWwgd2hpY2hcbiAqIHdpbGwgb3ZlcnJpZGUgZXZlcnl0aGluZyBlbHNlLlxuICpcbiAqIE5vdGUgdGhhdCB0aGUgZmFsbGJhY2sgaXMgcGFja2FnZSBiYXNlZCBub3QgZW50cnktcG9pbnQgYmFzZWQuXG4gKiBGb3IgZXhhbXBsZSwgaWYgYSB0aGVyZSBpcyBjb25maWd1cmF0aW9uIGZvciBhIHBhY2thZ2UgYXQgdGhlIHByb2plY3QgbGV2ZWwgdGhpcyB3aWxsIHJlcGxhY2UgYWxsXG4gKiBlbnRyeS1wb2ludCBjb25maWd1cmF0aW9ucyB0aGF0IG1heSBoYXZlIGJlZW4gcHJvdmlkZWQgaW4gdGhlIHBhY2thZ2UgbGV2ZWwgb3IgZGVmYXVsdCBsZXZlbFxuICogY29uZmlndXJhdGlvbnMsIGV2ZW4gaWYgdGhlIHByb2plY3QgbGV2ZWwgY29uZmlndXJhdGlvbiBkb2VzIG5vdCBwcm92aWRlIGZvciBhIGdpdmVuIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9OR0NDX0NPTkZJRzogTmdjY1Byb2plY3RDb25maWcgPSB7XG4gIHBhY2thZ2VzOiB7XG4gICAgLy8gQWRkIGRlZmF1bHQgcGFja2FnZSBjb25maWd1cmF0aW9uIGhlcmUuIEZvciBleGFtcGxlOlxuICAgIC8vICdAYW5ndWxhci9maXJlQF41LjIuMCc6IHtcbiAgICAvLyAgIGVudHJ5UG9pbnRzOiB7XG4gICAgLy8gICAgICcuL2RhdGFiYXNlLWRlcHJlY2F0ZWQnOiB7aWdub3JlOiB0cnVlfSxcbiAgICAvLyAgIH0sXG4gICAgLy8gfSxcblxuICAgIC8vIFRoZSBwYWNrYWdlIGRvZXMgbm90IGNvbnRhaW4gYW55IGAubWV0YWRhdGEuanNvbmAgZmlsZXMgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IGJ1dCBvbmx5IGluc2lkZVxuICAgIC8vIGBkaXN0L2AuIFdpdGhvdXQgdGhpcyBjb25maWcsIG5nY2MgZG9lcyBub3QgcmVhbGl6ZSB0aGlzIGlzIGEgVmlld0VuZ2luZS1idWlsdCBBbmd1bGFyXG4gICAgLy8gcGFja2FnZSB0aGF0IG5lZWRzIHRvIGJlIGNvbXBpbGVkIHRvIEl2eS5cbiAgICAnYW5ndWxhcjItaGlnaGNoYXJ0cyc6IHtcbiAgICAgIGVudHJ5UG9pbnRzOiB7XG4gICAgICAgICcuJzoge1xuICAgICAgICAgIG92ZXJyaWRlOiB7XG4gICAgICAgICAgICBtYWluOiAnLi9pbmRleC5qcycsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFRoZSBgZGlzdC9gIGRpcmVjdG9yeSBoYXMgYSBkdXBsaWNhdGUgYHBhY2thZ2UuanNvbmAgcG9pbnRpbmcgdG8gdGhlIHNhbWUgZmlsZXMsIHdoaWNoICh1bmRlclxuICAgIC8vIGNlcnRhaW4gY29uZmlndXJhdGlvbnMpIGNhbiBjYXVzZXMgbmdjYyB0byB0cnkgdG8gcHJvY2VzcyB0aGUgZmlsZXMgdHdpY2UgYW5kIGZhaWwuXG4gICAgLy8gSWdub3JlIHRoZSBgZGlzdC9gIGVudHJ5LXBvaW50LlxuICAgICduZzItZHJhZ3VsYSc6IHtcbiAgICAgIGVudHJ5UG9pbnRzOiB7XG4gICAgICAgICcuL2Rpc3QnOiB7aWdub3JlOiB0cnVlfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgbG9ja2luZzoge1xuICAgIHJldHJ5RGVsYXk6IDUwMCxcbiAgICByZXRyeUF0dGVtcHRzOiA1MDAsXG4gIH1cbn07XG5cbmludGVyZmFjZSBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnIGV4dGVuZHMgTmdjY1BhY2thZ2VDb25maWcge1xuICB2ZXJzaW9uUmFuZ2U6IHN0cmluZztcbn1cblxudHlwZSBQcm9jZXNzZWRDb25maWcgPSBSZXF1aXJlZDxOZ2NjUHJvamVjdENvbmZpZzxWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW10+PjtcblxuY29uc3QgTkdDQ19DT05GSUdfRklMRU5BTUUgPSAnbmdjYy5jb25maWcuanMnO1xuXG4vKipcbiAqIE5nY2MgaGFzIGEgaGllcmFyY2hpY2FsIGNvbmZpZ3VyYXRpb24gc3lzdGVtIHRoYXQgbGV0cyB1cyBcImZpeCB1cFwiIHBhY2thZ2VzIHRoYXQgZG8gbm90XG4gKiB3b3JrIHdpdGggbmdjYyBvdXQgb2YgdGhlIGJveC5cbiAqXG4gKiBUaGVyZSBhcmUgdGhyZWUgbGV2ZWxzIGF0IHdoaWNoIGNvbmZpZ3VyYXRpb24gY2FuIGJlIGRlY2xhcmVkOlxuICpcbiAqICogRGVmYXVsdCBsZXZlbCAtIG5nY2MgY29tZXMgd2l0aCBidWlsdC1pbiBjb25maWd1cmF0aW9uIGZvciB3ZWxsIGtub3duIGNhc2VzLlxuICogKiBQYWNrYWdlIGxldmVsIC0gYSBsaWJyYXJ5IGF1dGhvciBwdWJsaXNoZXMgYSBjb25maWd1cmF0aW9uIHdpdGggdGhlaXIgcGFja2FnZSB0byBmaXgga25vd25cbiAqICAgaXNzdWVzLlxuICogKiBQcm9qZWN0IGxldmVsIC0gdGhlIGFwcGxpY2F0aW9uIGRldmVsb3BlciBwcm92aWRlcyBhIGNvbmZpZ3VyYXRpb24gdGhhdCBmaXhlcyBpc3N1ZXMgc3BlY2lmaWNcbiAqICAgdG8gdGhlIGxpYnJhcmllcyB1c2VkIGluIHRoZWlyIGFwcGxpY2F0aW9uLlxuICpcbiAqIE5nY2Mgd2lsbCBtYXRjaCBjb25maWd1cmF0aW9uIGJhc2VkIG9uIHRoZSBwYWNrYWdlIG5hbWUgYnV0IGFsc28gb24gaXRzIHZlcnNpb24uIFRoaXMgYWxsb3dzXG4gKiBjb25maWd1cmF0aW9uIHRvIHByb3ZpZGUgZGlmZmVyZW50IGZpeGVzIHRvIGRpZmZlcmVudCB2ZXJzaW9uIHJhbmdlcyBvZiBhIHBhY2thZ2UuXG4gKlxuICogKiBQYWNrYWdlIGxldmVsIGNvbmZpZ3VyYXRpb24gaXMgc3BlY2lmaWMgdG8gdGhlIHBhY2thZ2UgdmVyc2lvbiB3aGVyZSB0aGUgY29uZmlndXJhdGlvbiBpc1xuICogICBmb3VuZC5cbiAqICogRGVmYXVsdCBhbmQgcHJvamVjdCBsZXZlbCBjb25maWd1cmF0aW9uIHNob3VsZCBwcm92aWRlIHZlcnNpb24gcmFuZ2VzIHRvIGVuc3VyZSB0aGF0IHRoZVxuICogICBjb25maWd1cmF0aW9uIGlzIG9ubHkgYXBwbGllZCB0byB0aGUgYXBwcm9wcmlhdGUgdmVyc2lvbnMgb2YgYSBwYWNrYWdlLlxuICpcbiAqIFdoZW4gZ2V0dGluZyBhIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSAodmlhIGBnZXRDb25maWcoKWApIHRoZSBjYWxsZXIgc2hvdWxkIHByb3ZpZGUgdGhlXG4gKiB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIGluIHF1ZXN0aW9uLCBpZiBhdmFpbGFibGUuIElmIGl0IGlzIG5vdCBwcm92aWRlZCB0aGVuIHRoZSBmaXJzdCBhdmFpbGFibGVcbiAqIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSBpcyByZXR1cm5lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nY2NDb25maWd1cmF0aW9uIHtcbiAgcHJpdmF0ZSBkZWZhdWx0Q29uZmlnOiBQcm9jZXNzZWRDb25maWc7XG4gIHByaXZhdGUgcHJvamVjdENvbmZpZzogUHJvY2Vzc2VkQ29uZmlnO1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFZlcnNpb25lZFBhY2thZ2VDb25maWc+KCk7XG4gIHJlYWRvbmx5IGhhc2g6IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBiYXNlRGlyOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHRoaXMuZGVmYXVsdENvbmZpZyA9IHRoaXMucHJvY2Vzc1Byb2plY3RDb25maWcoYmFzZURpciwgREVGQVVMVF9OR0NDX0NPTkZJRyk7XG4gICAgdGhpcy5wcm9qZWN0Q29uZmlnID0gdGhpcy5wcm9jZXNzUHJvamVjdENvbmZpZyhiYXNlRGlyLCB0aGlzLmxvYWRQcm9qZWN0Q29uZmlnKGJhc2VEaXIpKTtcbiAgICB0aGlzLmhhc2ggPSB0aGlzLmNvbXB1dGVIYXNoKCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIGxvY2tpbmcgdGhlIG5nY2MgcHJvY2Vzcy5cbiAgICovXG4gIGdldExvY2tpbmdDb25maWcoKTogUmVxdWlyZWQ8UHJvY2Vzc0xvY2tpbmdDb25maWd1cmF0aW9uPiB7XG4gICAgbGV0IHtyZXRyeUF0dGVtcHRzLCByZXRyeURlbGF5fSA9IHRoaXMucHJvamVjdENvbmZpZy5sb2NraW5nO1xuICAgIGlmIChyZXRyeUF0dGVtcHRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHJ5QXR0ZW1wdHMgPSB0aGlzLmRlZmF1bHRDb25maWcubG9ja2luZy5yZXRyeUF0dGVtcHRzITtcbiAgICB9XG4gICAgaWYgKHJldHJ5RGVsYXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0cnlEZWxheSA9IHRoaXMuZGVmYXVsdENvbmZpZy5sb2NraW5nLnJldHJ5RGVsYXkhO1xuICAgIH1cbiAgICByZXR1cm4ge3JldHJ5QXR0ZW1wdHMsIHJldHJ5RGVsYXl9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBnaXZlbiBgdmVyc2lvbmAgb2YgYSBwYWNrYWdlIGF0IGBwYWNrYWdlUGF0aGAuXG4gICAqXG4gICAqIEBwYXJhbSBwYWNrYWdlUGF0aCBUaGUgcGF0aCB0byB0aGUgcGFja2FnZSB3aG9zZSBjb25maWcgd2Ugd2FudC5cbiAgICogQHBhcmFtIHZlcnNpb24gVGhlIHZlcnNpb24gb2YgdGhlIHBhY2thZ2Ugd2hvc2UgY29uZmlnIHdlIHdhbnQsIG9yIGBudWxsYCBpZiB0aGUgcGFja2FnZSdzXG4gICAqIHBhY2thZ2UuanNvbiBkaWQgbm90IGV4aXN0IG9yIHdhcyBpbnZhbGlkLlxuICAgKi9cbiAgZ2V0UGFja2FnZUNvbmZpZyhwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHZlcnNpb246IHN0cmluZ3xudWxsKTogVmVyc2lvbmVkUGFja2FnZUNvbmZpZyB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBwYWNrYWdlUGF0aCArICh2ZXJzaW9uICE9PSBudWxsID8gYEAke3ZlcnNpb259YCA6ICcnKTtcbiAgICBpZiAodGhpcy5jYWNoZS5oYXMoY2FjaGVLZXkpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQoY2FjaGVLZXkpITtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9qZWN0TGV2ZWxDb25maWcgPSB0aGlzLnByb2plY3RDb25maWcucGFja2FnZXMgP1xuICAgICAgICBmaW5kU2F0aXNmYWN0b3J5VmVyc2lvbih0aGlzLnByb2plY3RDb25maWcucGFja2FnZXNbcGFja2FnZVBhdGhdLCB2ZXJzaW9uKSA6XG4gICAgICAgIG51bGw7XG4gICAgaWYgKHByb2plY3RMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIHByb2plY3RMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gcHJvamVjdExldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VMZXZlbENvbmZpZyA9IHRoaXMubG9hZFBhY2thZ2VDb25maWcocGFja2FnZVBhdGgsIHZlcnNpb24pO1xuICAgIGlmIChwYWNrYWdlTGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBwYWNrYWdlTGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIHBhY2thZ2VMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBkZWZhdWx0TGV2ZWxDb25maWcgPSB0aGlzLmRlZmF1bHRDb25maWcucGFja2FnZXMgP1xuICAgICAgICBmaW5kU2F0aXNmYWN0b3J5VmVyc2lvbih0aGlzLmRlZmF1bHRDb25maWcucGFja2FnZXNbcGFja2FnZVBhdGhdLCB2ZXJzaW9uKSA6XG4gICAgICAgIG51bGw7XG4gICAgaWYgKGRlZmF1bHRMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIGRlZmF1bHRMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gZGVmYXVsdExldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIHJldHVybiB7dmVyc2lvblJhbmdlOiAnKicsIGVudHJ5UG9pbnRzOiB7fX07XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NQcm9qZWN0Q29uZmlnKGJhc2VEaXI6IEFic29sdXRlRnNQYXRoLCBwcm9qZWN0Q29uZmlnOiBOZ2NjUHJvamVjdENvbmZpZyk6XG4gICAgICBQcm9jZXNzZWRDb25maWcge1xuICAgIGNvbnN0IHByb2Nlc3NlZENvbmZpZzogUHJvY2Vzc2VkQ29uZmlnID0ge3BhY2thZ2VzOiB7fSwgbG9ja2luZzoge319O1xuXG4gICAgLy8gbG9ja2luZyBjb25maWd1cmF0aW9uXG4gICAgaWYgKHByb2plY3RDb25maWcubG9ja2luZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwcm9jZXNzZWRDb25maWcubG9ja2luZyA9IHByb2plY3RDb25maWcubG9ja2luZztcbiAgICB9XG5cbiAgICAvLyBwYWNrYWdlcyBjb25maWd1cmF0aW9uXG4gICAgZm9yIChjb25zdCBwYWNrYWdlUGF0aEFuZFZlcnNpb24gaW4gcHJvamVjdENvbmZpZy5wYWNrYWdlcykge1xuICAgICAgY29uc3QgcGFja2FnZUNvbmZpZyA9IHByb2plY3RDb25maWcucGFja2FnZXNbcGFja2FnZVBhdGhBbmRWZXJzaW9uXTtcbiAgICAgIGlmIChwYWNrYWdlQ29uZmlnKSB7XG4gICAgICAgIGNvbnN0IFtwYWNrYWdlUGF0aCwgdmVyc2lvblJhbmdlID0gJyonXSA9IHRoaXMuc3BsaXRQYXRoQW5kVmVyc2lvbihwYWNrYWdlUGF0aEFuZFZlcnNpb24pO1xuICAgICAgICBjb25zdCBhYnNQYWNrYWdlUGF0aCA9IHJlc29sdmUoYmFzZURpciwgJ25vZGVfbW9kdWxlcycsIHBhY2thZ2VQYXRoKTtcbiAgICAgICAgY29uc3QgZW50cnlQb2ludHMgPSB0aGlzLnByb2Nlc3NFbnRyeVBvaW50cyhhYnNQYWNrYWdlUGF0aCwgcGFja2FnZUNvbmZpZyk7XG4gICAgICAgIHByb2Nlc3NlZENvbmZpZy5wYWNrYWdlc1thYnNQYWNrYWdlUGF0aF0gPSBwcm9jZXNzZWRDb25maWcucGFja2FnZXNbYWJzUGFja2FnZVBhdGhdIHx8IFtdO1xuICAgICAgICBwcm9jZXNzZWRDb25maWcucGFja2FnZXNbYWJzUGFja2FnZVBhdGhdLnB1c2goXG4gICAgICAgICAgICB7Li4ucGFja2FnZUNvbmZpZywgdmVyc2lvblJhbmdlLCBlbnRyeVBvaW50c30pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwcm9jZXNzZWRDb25maWc7XG4gIH1cblxuICBwcml2YXRlIGxvYWRQcm9qZWN0Q29uZmlnKGJhc2VEaXI6IEFic29sdXRlRnNQYXRoKTogTmdjY1Byb2plY3RDb25maWcge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gam9pbihiYXNlRGlyLCBOR0NDX0NPTkZJR19GSUxFTkFNRSk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGNvbmZpZ0ZpbGVQYXRoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUgYXQgXCIke2NvbmZpZ0ZpbGVQYXRofVwiOiBgICsgZS5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtwYWNrYWdlczoge319O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9hZFBhY2thZ2VDb25maWcocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6XG4gICAgICBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnfG51bGwge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gam9pbihwYWNrYWdlUGF0aCwgTkdDQ19DT05GSUdfRklMRU5BTUUpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhjb25maWdGaWxlUGF0aCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VDb25maWcgPSB0aGlzLmV2YWxTcmNGaWxlKGNvbmZpZ0ZpbGVQYXRoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5wYWNrYWdlQ29uZmlnLFxuICAgICAgICAgIHZlcnNpb25SYW5nZTogdmVyc2lvbiB8fCAnKicsXG4gICAgICAgICAgZW50cnlQb2ludHM6IHRoaXMucHJvY2Vzc0VudHJ5UG9pbnRzKHBhY2thZ2VQYXRoLCBwYWNrYWdlQ29uZmlnKSxcbiAgICAgICAgfTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBhY2thZ2UgY29uZmlndXJhdGlvbiBmaWxlIGF0IFwiJHtjb25maWdGaWxlUGF0aH1cIjogYCArIGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXZhbFNyY0ZpbGUoc3JjUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBhbnkge1xuICAgIGNvbnN0IHNyYyA9IHRoaXMuZnMucmVhZEZpbGUoc3JjUGF0aCk7XG4gICAgY29uc3QgdGhlRXhwb3J0cyA9IHt9O1xuICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICBtb2R1bGU6IHtleHBvcnRzOiB0aGVFeHBvcnRzfSxcbiAgICAgIGV4cG9ydHM6IHRoZUV4cG9ydHMsXG4gICAgICByZXF1aXJlLFxuICAgICAgX19kaXJuYW1lOiBkaXJuYW1lKHNyY1BhdGgpLFxuICAgICAgX19maWxlbmFtZTogc3JjUGF0aFxuICAgIH07XG4gICAgdm0ucnVuSW5OZXdDb250ZXh0KHNyYywgc2FuZGJveCwge2ZpbGVuYW1lOiBzcmNQYXRofSk7XG4gICAgcmV0dXJuIHNhbmRib3gubW9kdWxlLmV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NFbnRyeVBvaW50cyhwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhY2thZ2VDb25maWc6IE5nY2NQYWNrYWdlQ29uZmlnKTpcbiAgICAgIHtbZW50cnlQb2ludFBhdGg6IHN0cmluZ106IE5nY2NFbnRyeVBvaW50Q29uZmlnO30ge1xuICAgIGNvbnN0IHByb2Nlc3NlZEVudHJ5UG9pbnRzOiB7W2VudHJ5UG9pbnRQYXRoOiBzdHJpbmddOiBOZ2NjRW50cnlQb2ludENvbmZpZzt9ID0ge307XG4gICAgZm9yIChjb25zdCBlbnRyeVBvaW50UGF0aCBpbiBwYWNrYWdlQ29uZmlnLmVudHJ5UG9pbnRzKSB7XG4gICAgICAvLyBDaGFuZ2UgdGhlIGtleXMgdG8gYmUgYWJzb2x1dGUgcGF0aHNcbiAgICAgIHByb2Nlc3NlZEVudHJ5UG9pbnRzW3Jlc29sdmUocGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoKV0gPVxuICAgICAgICAgIHBhY2thZ2VDb25maWcuZW50cnlQb2ludHNbZW50cnlQb2ludFBhdGhdO1xuICAgIH1cbiAgICByZXR1cm4gcHJvY2Vzc2VkRW50cnlQb2ludHM7XG4gIH1cblxuICBwcml2YXRlIHNwbGl0UGF0aEFuZFZlcnNpb24ocGFja2FnZVBhdGhBbmRWZXJzaW9uOiBzdHJpbmcpOiBbc3RyaW5nLCBzdHJpbmd8dW5kZWZpbmVkXSB7XG4gICAgY29uc3QgdmVyc2lvbkluZGV4ID0gcGFja2FnZVBhdGhBbmRWZXJzaW9uLmxhc3RJbmRleE9mKCdAJyk7XG4gICAgLy8gTm90ZSB0aGF0ID4gMCBpcyBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG8gbWF0Y2ggQCBhdCB0aGUgc3RhcnQgb2YgdGhlIGxpbmVcbiAgICAvLyB3aGljaCBpcyB3aGF0IHlvdSB3b3VsZCBoYXZlIHdpdGggYSBuYW1lc3BhY2VkIHBhY2thZ2UsIGUuZy4gYEBhbmd1bGFyL2NvbW1vbmAuXG4gICAgcmV0dXJuIHZlcnNpb25JbmRleCA+IDAgP1xuICAgICAgICBbXG4gICAgICAgICAgcGFja2FnZVBhdGhBbmRWZXJzaW9uLnN1YnN0cmluZygwLCB2ZXJzaW9uSW5kZXgpLFxuICAgICAgICAgIHBhY2thZ2VQYXRoQW5kVmVyc2lvbi5zdWJzdHJpbmcodmVyc2lvbkluZGV4ICsgMSlcbiAgICAgICAgXSA6XG4gICAgICAgIFtwYWNrYWdlUGF0aEFuZFZlcnNpb24sIHVuZGVmaW5lZF07XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVIYXNoKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZShKU09OLnN0cmluZ2lmeSh0aGlzLnByb2plY3RDb25maWcpKS5kaWdlc3QoJ2hleCcpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRTYXRpc2ZhY3RvcnlWZXJzaW9uKGNvbmZpZ3M6IFZlcnNpb25lZFBhY2thZ2VDb25maWdbXXx1bmRlZmluZWQsIHZlcnNpb246IHN0cmluZ3xudWxsKTpcbiAgICBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnfG51bGwge1xuICBpZiAoY29uZmlncyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHZlcnNpb24gPT09IG51bGwpIHtcbiAgICAvLyBUaGUgcGFja2FnZSBoYXMgbm8gdmVyc2lvbiAoISkgLSBwZXJoYXBzIHRoZSBlbnRyeS1wb2ludCB3YXMgZnJvbSBhIGRlZXAgaW1wb3J0LCB3aGljaCBtYWRlXG4gICAgLy8gaXQgaW1wb3NzaWJsZSB0byBmaW5kIHRoZSBwYWNrYWdlLmpzb24uXG4gICAgLy8gU28ganVzdCByZXR1cm4gdGhlIGZpcnN0IGNvbmZpZyB0aGF0IG1hdGNoZXMgdGhlIHBhY2thZ2UgbmFtZS5cbiAgICByZXR1cm4gY29uZmlnc1swXTtcbiAgfVxuICByZXR1cm4gY29uZmlncy5maW5kKFxuICAgICAgICAgICAgIGNvbmZpZyA9PiBzYXRpc2ZpZXModmVyc2lvbiwgY29uZmlnLnZlcnNpb25SYW5nZSwge2luY2x1ZGVQcmVyZWxlYXNlOiB0cnVlfSkpIHx8XG4gICAgICBudWxsO1xufVxuIl19