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
         * Get a configuration for the given `version` of a package at `packagePath`.
         *
         * @param packagePath The path to the package whose config we want.
         * @param version The version of the package whose config we want, or `null` if the package's
         * package.json did not exist or was invalid.
         */
        NgccConfiguration.prototype.getConfig = function (packagePath, version) {
            var cacheKey = packagePath + (version !== null ? "@" + version : '');
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            var projectLevelConfig = findSatisfactoryVersion(this.projectConfig.packages[packagePath], version);
            if (projectLevelConfig !== null) {
                this.cache.set(cacheKey, projectLevelConfig);
                return projectLevelConfig;
            }
            var packageLevelConfig = this.loadPackageConfig(packagePath, version);
            if (packageLevelConfig !== null) {
                this.cache.set(cacheKey, packageLevelConfig);
                return packageLevelConfig;
            }
            var defaultLevelConfig = findSatisfactoryVersion(this.defaultConfig.packages[packagePath], version);
            if (defaultLevelConfig !== null) {
                this.cache.set(cacheKey, defaultLevelConfig);
                return defaultLevelConfig;
            }
            return { versionRange: '*', entryPoints: {} };
        };
        NgccConfiguration.prototype.processProjectConfig = function (baseDir, projectConfig) {
            var processedConfig = { packages: {} };
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
                    return {
                        versionRange: version || '*',
                        entryPoints: this.processEntryPoints(packagePath, this.evalSrcFile(configFilePath)),
                    };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFrQztJQUNsQyxpQ0FBaUM7SUFDakMsdUJBQXlCO0lBRXpCLDJFQUFrRztJQStEbEc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDVSxRQUFBLG1CQUFtQixHQUFzQjtRQUNwRCxRQUFRLEVBQUU7WUFDUix1REFBdUQ7WUFDdkQsNEJBQTRCO1lBQzVCLG1CQUFtQjtZQUNuQiwrQ0FBK0M7WUFDL0MsT0FBTztZQUNQLEtBQUs7WUFFTCxnR0FBZ0c7WUFDaEcseUZBQXlGO1lBQ3pGLDRDQUE0QztZQUM1QyxxQkFBcUIsRUFBRTtnQkFDckIsV0FBVyxFQUFFO29CQUNYLEdBQUcsRUFBRTt3QkFDSCxRQUFRLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFlBQVk7eUJBQ25CO3FCQUNGO2lCQUNGO2FBQ0Y7WUFFRCxnR0FBZ0c7WUFDaEcsc0ZBQXNGO1lBQ3RGLGtDQUFrQztZQUNsQyxhQUFhLEVBQUU7Z0JBQ2IsV0FBVyxFQUFFO29CQUNYLFFBQVEsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUM7aUJBQ3pCO2FBQ0Y7U0FDRjtLQUNGLENBQUM7SUFNRixJQUFNLG9CQUFvQixHQUFHLGdCQUFnQixDQUFDO0lBRTlDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXVCRztJQUNIO1FBTUUsMkJBQW9CLEVBQWMsRUFBRSxPQUF1QjtZQUF2QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBSDFCLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztZQUl4RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFP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R0FBRyxDQUFDLENBQUM7aUJBQ2xELENBQUMsQ0FBQztnQkFDSCxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFFTyx1Q0FBVyxHQUFuQjtZQUNFLE9BQU8sbUJBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEYsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQXZJRCxJQXVJQztJQXZJWSw4Q0FBaUI7SUF5STlCLFNBQVMsdUJBQXVCLENBQUMsT0FBMkMsRUFBRSxPQUFvQjtRQUVoRyxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7WUFDekIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtZQUNwQiw4RkFBOEY7WUFDOUYsMENBQTBDO1lBQzFDLGlFQUFpRTtZQUNqRSxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQjtRQUNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FDUixVQUFBLE1BQU0sSUFBSSxPQUFBLGtCQUFTLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUFsRSxDQUFrRSxDQUFDO1lBQ3BGLElBQUksQ0FBQztJQUNYLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NyZWF0ZUhhc2h9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQge3NhdGlzZmllc30gZnJvbSAnc2VtdmVyJztcbmltcG9ydCAqIGFzIHZtIGZyb20gJ3ZtJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgZGlybmFtZSwgRmlsZVN5c3RlbSwgam9pbiwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXB9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG4vKipcbiAqIFRoZSBmb3JtYXQgb2YgYSBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjUHJvamVjdENvbmZpZzxUID0gTmdjY1BhY2thZ2VDb25maWc+IHtcbiAgLyoqXG4gICAqIFRoZSBwYWNrYWdlcyB0aGF0IGFyZSBjb25maWd1cmVkIGJ5IHRoaXMgcHJvamVjdCBjb25maWcuXG4gICAqL1xuICBwYWNrYWdlczoge1twYWNrYWdlUGF0aDogc3RyaW5nXTogVH07XG59XG5cbi8qKlxuICogVGhlIGZvcm1hdCBvZiBhIHBhY2thZ2UgbGV2ZWwgY29uZmlndXJhdGlvbiBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NQYWNrYWdlQ29uZmlnIHtcbiAgLyoqXG4gICAqIFRoZSBlbnRyeS1wb2ludHMgdG8gY29uZmlndXJlIGZvciB0aGlzIHBhY2thZ2UuXG4gICAqXG4gICAqIEluIHRoZSBjb25maWcgZmlsZSB0aGUga2V5cyBjYW4gYmUgcGF0aHMgcmVsYXRpdmUgdG8gdGhlIHBhY2thZ2UgcGF0aDtcbiAgICogYnV0IHdoZW4gYmVpbmcgcmVhZCBiYWNrIGZyb20gdGhlIGBOZ2NjQ29uZmlndXJhdGlvbmAgc2VydmljZSwgdGhlc2UgcGF0aHNcbiAgICogd2lsbCBiZSBhYnNvbHV0ZS5cbiAgICovXG4gIGVudHJ5UG9pbnRzOiB7W2VudHJ5UG9pbnRQYXRoOiBzdHJpbmddOiBOZ2NjRW50cnlQb2ludENvbmZpZzt9O1xuICAvKipcbiAgICogQSBjb2xsZWN0aW9uIG9mIHJlZ2V4ZXMgdGhhdCBtYXRjaCBkZWVwIGltcG9ydHMgdG8gaWdub3JlLCBmb3IgdGhpcyBwYWNrYWdlLCByYXRoZXIgdGhhblxuICAgKiBkaXNwbGF5aW5nIGEgd2FybmluZy5cbiAgICovXG4gIGlnbm9yYWJsZURlZXBJbXBvcnRNYXRjaGVycz86IFJlZ0V4cFtdO1xufVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgYW4gZW50cnktcG9pbnQuXG4gKlxuICogVGhlIGV4aXN0ZW5jZSBvZiBhIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGF0aCB0ZWxscyBuZ2NjIHRoYXQgdGhpcyBzaG91bGQgYmUgY29uc2lkZXJlZCBmb3JcbiAqIHByb2Nlc3NpbmcgYXMgYW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY0VudHJ5UG9pbnRDb25maWcge1xuICAvKiogRG8gbm90IHByb2Nlc3MgKG9yIGV2ZW4gYWNrbm93bGVkZ2UgdGhlIGV4aXN0ZW5jZSBvZikgdGhpcyBlbnRyeS1wb2ludCwgaWYgdHJ1ZS4gKi9cbiAgaWdub3JlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoaXMgcHJvcGVydHksIGlmIHByb3ZpZGVkLCBob2xkcyB2YWx1ZXMgdGhhdCB3aWxsIG92ZXJyaWRlIGVxdWl2YWxlbnQgcHJvcGVydGllcyBpbiBhblxuICAgKiBlbnRyeS1wb2ludCdzIHBhY2thZ2UuanNvbiBmaWxlLlxuICAgKi9cbiAgb3ZlcnJpZGU/OiBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXA7XG5cbiAgLyoqXG4gICAqIE5vcm1hbGx5LCBuZ2NjIHdpbGwgc2tpcCBjb21waWxhdGlvbiBvZiBlbnRyeXBvaW50cyB0aGF0IGNvbnRhaW4gaW1wb3J0cyB0aGF0IGNhbid0IGJlIHJlc29sdmVkXG4gICAqIG9yIHVuZGVyc3Rvb2QuIElmIHRoaXMgb3B0aW9uIGlzIHNwZWNpZmllZCwgbmdjYyB3aWxsIHByb2NlZWQgd2l0aCBjb21waWxpbmcgdGhlIGVudHJ5cG9pbnRcbiAgICogZXZlbiBpbiB0aGUgZmFjZSBvZiBzdWNoIG1pc3NpbmcgZGVwZW5kZW5jaWVzLlxuICAgKi9cbiAgaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEVuYWJsaW5nIHRoaXMgb3B0aW9uIGZvciBhbiBlbnRyeXBvaW50IHRlbGxzIG5nY2MgdGhhdCBkZWVwIGltcG9ydHMgbWlnaHQgYmUgdXNlZCBmb3IgdGhlIGZpbGVzXG4gICAqIGl0IGNvbnRhaW5zLCBhbmQgdGhhdCBpdCBzaG91bGQgZ2VuZXJhdGUgcHJpdmF0ZSByZS1leHBvcnRzIGFsb25nc2lkZSB0aGUgTmdNb2R1bGUgb2YgYWxsIHRoZVxuICAgKiBkaXJlY3RpdmVzL3BpcGVzIGl0IG1ha2VzIGF2YWlsYWJsZSBpbiBzdXBwb3J0IG9mIHRob3NlIGltcG9ydHMuXG4gICAqL1xuICBnZW5lcmF0ZURlZXBSZWV4cG9ydHM/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIG5nY2MuXG4gKlxuICogVGhpcyBpcyB0aGUgdWx0aW1hdGUgZmFsbGJhY2sgY29uZmlndXJhdGlvbiB0aGF0IG5nY2Mgd2lsbCB1c2UgaWYgdGhlcmUgaXMgbm8gY29uZmlndXJhdGlvblxuICogZm9yIGEgcGFja2FnZSBhdCB0aGUgcGFja2FnZSBsZXZlbCBvciBwcm9qZWN0IGxldmVsLlxuICpcbiAqIFRoaXMgY29uZmlndXJhdGlvbiBpcyBmb3IgcGFja2FnZXMgdGhhdCBhcmUgXCJkZWFkXCIgLSBpLmUuIG5vIGxvbmdlciBtYWludGFpbmVkIGFuZCBzbyBhcmVcbiAqIHVubGlrZWx5IHRvIGJlIGZpeGVkIHRvIHdvcmsgd2l0aCBuZ2NjLCBub3IgcHJvdmlkZSBhIHBhY2thZ2UgbGV2ZWwgY29uZmlnIG9mIHRoZWlyIG93bi5cbiAqXG4gKiBUaGUgZmFsbGJhY2sgcHJvY2VzcyBmb3IgbG9va2luZyB1cCBjb25maWd1cmF0aW9uIGlzOlxuICpcbiAqIFByb2plY3QgLT4gUGFja2FnZSAtPiBEZWZhdWx0XG4gKlxuICogSWYgYSBwYWNrYWdlIHByb3ZpZGVzIGl0cyBvd24gY29uZmlndXJhdGlvbiB0aGVuIHRoYXQgd291bGQgb3ZlcnJpZGUgdGhpcyBkZWZhdWx0IG9uZS5cbiAqXG4gKiBBbHNvIGFwcGxpY2F0aW9uIGRldmVsb3BlcnMgY2FuIGFsd2F5cyBwcm92aWRlIGNvbmZpZ3VyYXRpb24gYXQgdGhlaXIgcHJvamVjdCBsZXZlbCB3aGljaFxuICogd2lsbCBvdmVycmlkZSBldmVyeXRoaW5nIGVsc2UuXG4gKlxuICogTm90ZSB0aGF0IHRoZSBmYWxsYmFjayBpcyBwYWNrYWdlIGJhc2VkIG5vdCBlbnRyeS1wb2ludCBiYXNlZC5cbiAqIEZvciBleGFtcGxlLCBpZiBhIHRoZXJlIGlzIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSBhdCB0aGUgcHJvamVjdCBsZXZlbCB0aGlzIHdpbGwgcmVwbGFjZSBhbGxcbiAqIGVudHJ5LXBvaW50IGNvbmZpZ3VyYXRpb25zIHRoYXQgbWF5IGhhdmUgYmVlbiBwcm92aWRlZCBpbiB0aGUgcGFja2FnZSBsZXZlbCBvciBkZWZhdWx0IGxldmVsXG4gKiBjb25maWd1cmF0aW9ucywgZXZlbiBpZiB0aGUgcHJvamVjdCBsZXZlbCBjb25maWd1cmF0aW9uIGRvZXMgbm90IHByb3ZpZGUgZm9yIGEgZ2l2ZW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX05HQ0NfQ09ORklHOiBOZ2NjUHJvamVjdENvbmZpZyA9IHtcbiAgcGFja2FnZXM6IHtcbiAgICAvLyBBZGQgZGVmYXVsdCBwYWNrYWdlIGNvbmZpZ3VyYXRpb24gaGVyZS4gRm9yIGV4YW1wbGU6XG4gICAgLy8gJ0Bhbmd1bGFyL2ZpcmVAXjUuMi4wJzoge1xuICAgIC8vICAgZW50cnlQb2ludHM6IHtcbiAgICAvLyAgICAgJy4vZGF0YWJhc2UtZGVwcmVjYXRlZCc6IHtpZ25vcmU6IHRydWV9LFxuICAgIC8vICAgfSxcbiAgICAvLyB9LFxuXG4gICAgLy8gVGhlIHBhY2thZ2UgZG9lcyBub3QgY29udGFpbiBhbnkgYC5tZXRhZGF0YS5qc29uYCBmaWxlcyBpbiB0aGUgcm9vdCBkaXJlY3RvcnkgYnV0IG9ubHkgaW5zaWRlXG4gICAgLy8gYGRpc3QvYC4gV2l0aG91dCB0aGlzIGNvbmZpZywgbmdjYyBkb2VzIG5vdCByZWFsaXplIHRoaXMgaXMgYSBWaWV3RW5naW5lLWJ1aWx0IEFuZ3VsYXJcbiAgICAvLyBwYWNrYWdlIHRoYXQgbmVlZHMgdG8gYmUgY29tcGlsZWQgdG8gSXZ5LlxuICAgICdhbmd1bGFyMi1oaWdoY2hhcnRzJzoge1xuICAgICAgZW50cnlQb2ludHM6IHtcbiAgICAgICAgJy4nOiB7XG4gICAgICAgICAgb3ZlcnJpZGU6IHtcbiAgICAgICAgICAgIG1haW46ICcuL2luZGV4LmpzJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gVGhlIGBkaXN0L2AgZGlyZWN0b3J5IGhhcyBhIGR1cGxpY2F0ZSBgcGFja2FnZS5qc29uYCBwb2ludGluZyB0byB0aGUgc2FtZSBmaWxlcywgd2hpY2ggKHVuZGVyXG4gICAgLy8gY2VydGFpbiBjb25maWd1cmF0aW9ucykgY2FuIGNhdXNlcyBuZ2NjIHRvIHRyeSB0byBwcm9jZXNzIHRoZSBmaWxlcyB0d2ljZSBhbmQgZmFpbC5cbiAgICAvLyBJZ25vcmUgdGhlIGBkaXN0L2AgZW50cnktcG9pbnQuXG4gICAgJ25nMi1kcmFndWxhJzoge1xuICAgICAgZW50cnlQb2ludHM6IHtcbiAgICAgICAgJy4vZGlzdCc6IHtpZ25vcmU6IHRydWV9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufTtcblxuaW50ZXJmYWNlIFZlcnNpb25lZFBhY2thZ2VDb25maWcgZXh0ZW5kcyBOZ2NjUGFja2FnZUNvbmZpZyB7XG4gIHZlcnNpb25SYW5nZTogc3RyaW5nO1xufVxuXG5jb25zdCBOR0NDX0NPTkZJR19GSUxFTkFNRSA9ICduZ2NjLmNvbmZpZy5qcyc7XG5cbi8qKlxuICogTmdjYyBoYXMgYSBoaWVyYXJjaGljYWwgY29uZmlndXJhdGlvbiBzeXN0ZW0gdGhhdCBsZXRzIHVzIFwiZml4IHVwXCIgcGFja2FnZXMgdGhhdCBkbyBub3RcbiAqIHdvcmsgd2l0aCBuZ2NjIG91dCBvZiB0aGUgYm94LlxuICpcbiAqIFRoZXJlIGFyZSB0aHJlZSBsZXZlbHMgYXQgd2hpY2ggY29uZmlndXJhdGlvbiBjYW4gYmUgZGVjbGFyZWQ6XG4gKlxuICogKiBEZWZhdWx0IGxldmVsIC0gbmdjYyBjb21lcyB3aXRoIGJ1aWx0LWluIGNvbmZpZ3VyYXRpb24gZm9yIHdlbGwga25vd24gY2FzZXMuXG4gKiAqIFBhY2thZ2UgbGV2ZWwgLSBhIGxpYnJhcnkgYXV0aG9yIHB1Ymxpc2hlcyBhIGNvbmZpZ3VyYXRpb24gd2l0aCB0aGVpciBwYWNrYWdlIHRvIGZpeCBrbm93blxuICogICBpc3N1ZXMuXG4gKiAqIFByb2plY3QgbGV2ZWwgLSB0aGUgYXBwbGljYXRpb24gZGV2ZWxvcGVyIHByb3ZpZGVzIGEgY29uZmlndXJhdGlvbiB0aGF0IGZpeGVzIGlzc3VlcyBzcGVjaWZpY1xuICogICB0byB0aGUgbGlicmFyaWVzIHVzZWQgaW4gdGhlaXIgYXBwbGljYXRpb24uXG4gKlxuICogTmdjYyB3aWxsIG1hdGNoIGNvbmZpZ3VyYXRpb24gYmFzZWQgb24gdGhlIHBhY2thZ2UgbmFtZSBidXQgYWxzbyBvbiBpdHMgdmVyc2lvbi4gVGhpcyBhbGxvd3NcbiAqIGNvbmZpZ3VyYXRpb24gdG8gcHJvdmlkZSBkaWZmZXJlbnQgZml4ZXMgdG8gZGlmZmVyZW50IHZlcnNpb24gcmFuZ2VzIG9mIGEgcGFja2FnZS5cbiAqXG4gKiAqIFBhY2thZ2UgbGV2ZWwgY29uZmlndXJhdGlvbiBpcyBzcGVjaWZpYyB0byB0aGUgcGFja2FnZSB2ZXJzaW9uIHdoZXJlIHRoZSBjb25maWd1cmF0aW9uIGlzXG4gKiAgIGZvdW5kLlxuICogKiBEZWZhdWx0IGFuZCBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gc2hvdWxkIHByb3ZpZGUgdmVyc2lvbiByYW5nZXMgdG8gZW5zdXJlIHRoYXQgdGhlXG4gKiAgIGNvbmZpZ3VyYXRpb24gaXMgb25seSBhcHBsaWVkIHRvIHRoZSBhcHByb3ByaWF0ZSB2ZXJzaW9ucyBvZiBhIHBhY2thZ2UuXG4gKlxuICogV2hlbiBnZXR0aW5nIGEgY29uZmlndXJhdGlvbiBmb3IgYSBwYWNrYWdlICh2aWEgYGdldENvbmZpZygpYCkgdGhlIGNhbGxlciBzaG91bGQgcHJvdmlkZSB0aGVcbiAqIHZlcnNpb24gb2YgdGhlIHBhY2thZ2UgaW4gcXVlc3Rpb24sIGlmIGF2YWlsYWJsZS4gSWYgaXQgaXMgbm90IHByb3ZpZGVkIHRoZW4gdGhlIGZpcnN0IGF2YWlsYWJsZVxuICogY29uZmlndXJhdGlvbiBmb3IgYSBwYWNrYWdlIGlzIHJldHVybmVkLlxuICovXG5leHBvcnQgY2xhc3MgTmdjY0NvbmZpZ3VyYXRpb24ge1xuICBwcml2YXRlIGRlZmF1bHRDb25maWc6IE5nY2NQcm9qZWN0Q29uZmlnPFZlcnNpb25lZFBhY2thZ2VDb25maWdbXT47XG4gIHByaXZhdGUgcHJvamVjdENvbmZpZzogTmdjY1Byb2plY3RDb25maWc8VmVyc2lvbmVkUGFja2FnZUNvbmZpZ1tdPjtcbiAgcHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnPigpO1xuICByZWFkb25seSBoYXNoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgYmFzZURpcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICB0aGlzLmRlZmF1bHRDb25maWcgPSB0aGlzLnByb2Nlc3NQcm9qZWN0Q29uZmlnKGJhc2VEaXIsIERFRkFVTFRfTkdDQ19DT05GSUcpO1xuICAgIHRoaXMucHJvamVjdENvbmZpZyA9IHRoaXMucHJvY2Vzc1Byb2plY3RDb25maWcoYmFzZURpciwgdGhpcy5sb2FkUHJvamVjdENvbmZpZyhiYXNlRGlyKSk7XG4gICAgdGhpcy5oYXNoID0gdGhpcy5jb21wdXRlSGFzaCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBnaXZlbiBgdmVyc2lvbmAgb2YgYSBwYWNrYWdlIGF0IGBwYWNrYWdlUGF0aGAuXG4gICAqXG4gICAqIEBwYXJhbSBwYWNrYWdlUGF0aCBUaGUgcGF0aCB0byB0aGUgcGFja2FnZSB3aG9zZSBjb25maWcgd2Ugd2FudC5cbiAgICogQHBhcmFtIHZlcnNpb24gVGhlIHZlcnNpb24gb2YgdGhlIHBhY2thZ2Ugd2hvc2UgY29uZmlnIHdlIHdhbnQsIG9yIGBudWxsYCBpZiB0aGUgcGFja2FnZSdzXG4gICAqIHBhY2thZ2UuanNvbiBkaWQgbm90IGV4aXN0IG9yIHdhcyBpbnZhbGlkLlxuICAgKi9cbiAgZ2V0Q29uZmlnKHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgdmVyc2lvbjogc3RyaW5nfG51bGwpOiBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnIHtcbiAgICBjb25zdCBjYWNoZUtleSA9IHBhY2thZ2VQYXRoICsgKHZlcnNpb24gIT09IG51bGwgPyBgQCR7dmVyc2lvbn1gIDogJycpO1xuICAgIGlmICh0aGlzLmNhY2hlLmhhcyhjYWNoZUtleSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlLmdldChjYWNoZUtleSkhO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2plY3RMZXZlbENvbmZpZyA9XG4gICAgICAgIGZpbmRTYXRpc2ZhY3RvcnlWZXJzaW9uKHRoaXMucHJvamVjdENvbmZpZy5wYWNrYWdlc1twYWNrYWdlUGF0aF0sIHZlcnNpb24pO1xuICAgIGlmIChwcm9qZWN0TGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBwcm9qZWN0TGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIHByb2plY3RMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlTGV2ZWxDb25maWcgPSB0aGlzLmxvYWRQYWNrYWdlQ29uZmlnKHBhY2thZ2VQYXRoLCB2ZXJzaW9uKTtcbiAgICBpZiAocGFja2FnZUxldmVsQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChjYWNoZUtleSwgcGFja2FnZUxldmVsQ29uZmlnKTtcbiAgICAgIHJldHVybiBwYWNrYWdlTGV2ZWxDb25maWc7XG4gICAgfVxuXG4gICAgY29uc3QgZGVmYXVsdExldmVsQ29uZmlnID1cbiAgICAgICAgZmluZFNhdGlzZmFjdG9yeVZlcnNpb24odGhpcy5kZWZhdWx0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VQYXRoXSwgdmVyc2lvbik7XG4gICAgaWYgKGRlZmF1bHRMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIGRlZmF1bHRMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gZGVmYXVsdExldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIHJldHVybiB7dmVyc2lvblJhbmdlOiAnKicsIGVudHJ5UG9pbnRzOiB7fX07XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NQcm9qZWN0Q29uZmlnKGJhc2VEaXI6IEFic29sdXRlRnNQYXRoLCBwcm9qZWN0Q29uZmlnOiBOZ2NjUHJvamVjdENvbmZpZyk6XG4gICAgICBOZ2NjUHJvamVjdENvbmZpZzxWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW10+IHtcbiAgICBjb25zdCBwcm9jZXNzZWRDb25maWc6IE5nY2NQcm9qZWN0Q29uZmlnPFZlcnNpb25lZFBhY2thZ2VDb25maWdbXT4gPSB7cGFja2FnZXM6IHt9fTtcbiAgICBmb3IgKGNvbnN0IHBhY2thZ2VQYXRoQW5kVmVyc2lvbiBpbiBwcm9qZWN0Q29uZmlnLnBhY2thZ2VzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlQ29uZmlnID0gcHJvamVjdENvbmZpZy5wYWNrYWdlc1twYWNrYWdlUGF0aEFuZFZlcnNpb25dO1xuICAgICAgaWYgKHBhY2thZ2VDb25maWcpIHtcbiAgICAgICAgY29uc3QgW3BhY2thZ2VQYXRoLCB2ZXJzaW9uUmFuZ2UgPSAnKiddID0gdGhpcy5zcGxpdFBhdGhBbmRWZXJzaW9uKHBhY2thZ2VQYXRoQW5kVmVyc2lvbik7XG4gICAgICAgIGNvbnN0IGFic1BhY2thZ2VQYXRoID0gcmVzb2x2ZShiYXNlRGlyLCAnbm9kZV9tb2R1bGVzJywgcGFja2FnZVBhdGgpO1xuICAgICAgICBjb25zdCBlbnRyeVBvaW50cyA9IHRoaXMucHJvY2Vzc0VudHJ5UG9pbnRzKGFic1BhY2thZ2VQYXRoLCBwYWNrYWdlQ29uZmlnKTtcbiAgICAgICAgcHJvY2Vzc2VkQ29uZmlnLnBhY2thZ2VzW2Fic1BhY2thZ2VQYXRoXSA9IHByb2Nlc3NlZENvbmZpZy5wYWNrYWdlc1thYnNQYWNrYWdlUGF0aF0gfHwgW107XG4gICAgICAgIHByb2Nlc3NlZENvbmZpZy5wYWNrYWdlc1thYnNQYWNrYWdlUGF0aF0ucHVzaChcbiAgICAgICAgICAgIHsuLi5wYWNrYWdlQ29uZmlnLCB2ZXJzaW9uUmFuZ2UsIGVudHJ5UG9pbnRzfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9jZXNzZWRDb25maWc7XG4gIH1cblxuICBwcml2YXRlIGxvYWRQcm9qZWN0Q29uZmlnKGJhc2VEaXI6IEFic29sdXRlRnNQYXRoKTogTmdjY1Byb2plY3RDb25maWcge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gam9pbihiYXNlRGlyLCBOR0NDX0NPTkZJR19GSUxFTkFNRSk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGNvbmZpZ0ZpbGVQYXRoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUgYXQgXCIke2NvbmZpZ0ZpbGVQYXRofVwiOiBgICsgZS5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtwYWNrYWdlczoge319O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9hZFBhY2thZ2VDb25maWcocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6XG4gICAgICBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnfG51bGwge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gam9pbihwYWNrYWdlUGF0aCwgTkdDQ19DT05GSUdfRklMRU5BTUUpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhjb25maWdGaWxlUGF0aCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdmVyc2lvblJhbmdlOiB2ZXJzaW9uIHx8ICcqJyxcbiAgICAgICAgICBlbnRyeVBvaW50czogdGhpcy5wcm9jZXNzRW50cnlQb2ludHMocGFja2FnZVBhdGgsIHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpKSxcbiAgICAgICAgfTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBhY2thZ2UgY29uZmlndXJhdGlvbiBmaWxlIGF0IFwiJHtjb25maWdGaWxlUGF0aH1cIjogYCArIGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXZhbFNyY0ZpbGUoc3JjUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBhbnkge1xuICAgIGNvbnN0IHNyYyA9IHRoaXMuZnMucmVhZEZpbGUoc3JjUGF0aCk7XG4gICAgY29uc3QgdGhlRXhwb3J0cyA9IHt9O1xuICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICBtb2R1bGU6IHtleHBvcnRzOiB0aGVFeHBvcnRzfSxcbiAgICAgIGV4cG9ydHM6IHRoZUV4cG9ydHMsXG4gICAgICByZXF1aXJlLFxuICAgICAgX19kaXJuYW1lOiBkaXJuYW1lKHNyY1BhdGgpLFxuICAgICAgX19maWxlbmFtZTogc3JjUGF0aFxuICAgIH07XG4gICAgdm0ucnVuSW5OZXdDb250ZXh0KHNyYywgc2FuZGJveCwge2ZpbGVuYW1lOiBzcmNQYXRofSk7XG4gICAgcmV0dXJuIHNhbmRib3gubW9kdWxlLmV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NFbnRyeVBvaW50cyhwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhY2thZ2VDb25maWc6IE5nY2NQYWNrYWdlQ29uZmlnKTpcbiAgICAgIHtbZW50cnlQb2ludFBhdGg6IHN0cmluZ106IE5nY2NFbnRyeVBvaW50Q29uZmlnO30ge1xuICAgIGNvbnN0IHByb2Nlc3NlZEVudHJ5UG9pbnRzOiB7W2VudHJ5UG9pbnRQYXRoOiBzdHJpbmddOiBOZ2NjRW50cnlQb2ludENvbmZpZzt9ID0ge307XG4gICAgZm9yIChjb25zdCBlbnRyeVBvaW50UGF0aCBpbiBwYWNrYWdlQ29uZmlnLmVudHJ5UG9pbnRzKSB7XG4gICAgICAvLyBDaGFuZ2UgdGhlIGtleXMgdG8gYmUgYWJzb2x1dGUgcGF0aHNcbiAgICAgIHByb2Nlc3NlZEVudHJ5UG9pbnRzW3Jlc29sdmUocGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoKV0gPVxuICAgICAgICAgIHBhY2thZ2VDb25maWcuZW50cnlQb2ludHNbZW50cnlQb2ludFBhdGhdO1xuICAgIH1cbiAgICByZXR1cm4gcHJvY2Vzc2VkRW50cnlQb2ludHM7XG4gIH1cblxuICBwcml2YXRlIHNwbGl0UGF0aEFuZFZlcnNpb24ocGFja2FnZVBhdGhBbmRWZXJzaW9uOiBzdHJpbmcpOiBbc3RyaW5nLCBzdHJpbmd8dW5kZWZpbmVkXSB7XG4gICAgY29uc3QgdmVyc2lvbkluZGV4ID0gcGFja2FnZVBhdGhBbmRWZXJzaW9uLmxhc3RJbmRleE9mKCdAJyk7XG4gICAgLy8gTm90ZSB0aGF0ID4gMCBpcyBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG8gbWF0Y2ggQCBhdCB0aGUgc3RhcnQgb2YgdGhlIGxpbmVcbiAgICAvLyB3aGljaCBpcyB3aGF0IHlvdSB3b3VsZCBoYXZlIHdpdGggYSBuYW1lc3BhY2VkIHBhY2thZ2UsIGUuZy4gYEBhbmd1bGFyL2NvbW1vbmAuXG4gICAgcmV0dXJuIHZlcnNpb25JbmRleCA+IDAgP1xuICAgICAgICBbXG4gICAgICAgICAgcGFja2FnZVBhdGhBbmRWZXJzaW9uLnN1YnN0cmluZygwLCB2ZXJzaW9uSW5kZXgpLFxuICAgICAgICAgIHBhY2thZ2VQYXRoQW5kVmVyc2lvbi5zdWJzdHJpbmcodmVyc2lvbkluZGV4ICsgMSlcbiAgICAgICAgXSA6XG4gICAgICAgIFtwYWNrYWdlUGF0aEFuZFZlcnNpb24sIHVuZGVmaW5lZF07XG4gIH1cblxuICBwcml2YXRlIGNvbXB1dGVIYXNoKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNyZWF0ZUhhc2goJ21kNScpLnVwZGF0ZShKU09OLnN0cmluZ2lmeSh0aGlzLnByb2plY3RDb25maWcpKS5kaWdlc3QoJ2hleCcpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRTYXRpc2ZhY3RvcnlWZXJzaW9uKGNvbmZpZ3M6IFZlcnNpb25lZFBhY2thZ2VDb25maWdbXXx1bmRlZmluZWQsIHZlcnNpb246IHN0cmluZ3xudWxsKTpcbiAgICBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnfG51bGwge1xuICBpZiAoY29uZmlncyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHZlcnNpb24gPT09IG51bGwpIHtcbiAgICAvLyBUaGUgcGFja2FnZSBoYXMgbm8gdmVyc2lvbiAoISkgLSBwZXJoYXBzIHRoZSBlbnRyeS1wb2ludCB3YXMgZnJvbSBhIGRlZXAgaW1wb3J0LCB3aGljaCBtYWRlXG4gICAgLy8gaXQgaW1wb3NzaWJsZSB0byBmaW5kIHRoZSBwYWNrYWdlLmpzb24uXG4gICAgLy8gU28ganVzdCByZXR1cm4gdGhlIGZpcnN0IGNvbmZpZyB0aGF0IG1hdGNoZXMgdGhlIHBhY2thZ2UgbmFtZS5cbiAgICByZXR1cm4gY29uZmlnc1swXTtcbiAgfVxuICByZXR1cm4gY29uZmlncy5maW5kKFxuICAgICAgICAgICAgIGNvbmZpZyA9PiBzYXRpc2ZpZXModmVyc2lvbiwgY29uZmlnLnZlcnNpb25SYW5nZSwge2luY2x1ZGVQcmVyZWxlYXNlOiB0cnVlfSkpIHx8XG4gICAgICBudWxsO1xufVxuIl19