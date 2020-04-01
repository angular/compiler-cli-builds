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
                exports: theExports, require: require,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFrQztJQUNsQyxpQ0FBaUM7SUFDakMsdUJBQXlCO0lBQ3pCLDJFQUFrRztJQThEbEc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FzQkc7SUFDVSxRQUFBLG1CQUFtQixHQUFzQjtRQUNwRCxRQUFRLEVBQUU7WUFDUix1REFBdUQ7WUFDdkQsNEJBQTRCO1lBQzVCLG1CQUFtQjtZQUNuQiwrQ0FBK0M7WUFDL0MsT0FBTztZQUNQLEtBQUs7WUFFTCxnR0FBZ0c7WUFDaEcseUZBQXlGO1lBQ3pGLDRDQUE0QztZQUM1QyxxQkFBcUIsRUFBRTtnQkFDckIsV0FBVyxFQUFFO29CQUNYLEdBQUcsRUFBRTt3QkFDSCxRQUFRLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFlBQVk7eUJBQ25CO3FCQUNGO2lCQUNGO2FBQ0Y7WUFFRCxnR0FBZ0c7WUFDaEcsc0ZBQXNGO1lBQ3RGLGtDQUFrQztZQUNsQyxhQUFhLEVBQUU7Z0JBQ2IsV0FBVyxFQUFFO29CQUNYLFFBQVEsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUM7aUJBQ3pCO2FBQ0Y7U0FDRjtLQUNGLENBQUM7SUFNRixJQUFNLG9CQUFvQixHQUFHLGdCQUFnQixDQUFDO0lBRTlDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXVCRztJQUNIO1FBTUUsMkJBQW9CLEVBQWMsRUFBRSxPQUF1QjtZQUF2QyxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBSDFCLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztZQUl4RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFP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QUFHLENBQUMsQ0FBQztpQkFDbEQsQ0FBQyxDQUFDO2dCQUNILENBQUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVPLHVDQUFXLEdBQW5CO1lBQ0UsT0FBTyxtQkFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwRixDQUFDO1FBQ0gsd0JBQUM7SUFBRCxDQUFDLEFBdElELElBc0lDO0lBdElZLDhDQUFpQjtJQXdJOUIsU0FBUyx1QkFBdUIsQ0FDNUIsT0FBNkMsRUFBRSxPQUFzQjtRQUV2RSxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUU7WUFDekIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELElBQUksT0FBTyxLQUFLLElBQUksRUFBRTtZQUNwQiw4RkFBOEY7WUFDOUYsMENBQTBDO1lBQzFDLGlFQUFpRTtZQUNqRSxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuQjtRQUNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FDUixVQUFBLE1BQU0sSUFBSSxPQUFBLGtCQUFTLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBQyxpQkFBaUIsRUFBRSxJQUFJLEVBQUMsQ0FBQyxFQUFsRSxDQUFrRSxDQUFDO1lBQ3BGLElBQUksQ0FBQztJQUNYLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2NyZWF0ZUhhc2h9IGZyb20gJ2NyeXB0byc7XG5pbXBvcnQge3NhdGlzZmllc30gZnJvbSAnc2VtdmVyJztcbmltcG9ydCAqIGFzIHZtIGZyb20gJ3ZtJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGRpcm5hbWUsIGpvaW4sIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1BhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcH0gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cbi8qKlxuICogVGhlIGZvcm1hdCBvZiBhIHByb2plY3QgbGV2ZWwgY29uZmlndXJhdGlvbiBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NQcm9qZWN0Q29uZmlnPFQgPSBOZ2NjUGFja2FnZUNvbmZpZz4ge1xuICAvKipcbiAgICogVGhlIHBhY2thZ2VzIHRoYXQgYXJlIGNvbmZpZ3VyZWQgYnkgdGhpcyBwcm9qZWN0IGNvbmZpZy5cbiAgICovXG4gIHBhY2thZ2VzOiB7W3BhY2thZ2VQYXRoOiBzdHJpbmddOiBUfTtcbn1cblxuLyoqXG4gKiBUaGUgZm9ybWF0IG9mIGEgcGFja2FnZSBsZXZlbCBjb25maWd1cmF0aW9uIGZpbGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY1BhY2thZ2VDb25maWcge1xuICAvKipcbiAgICogVGhlIGVudHJ5LXBvaW50cyB0byBjb25maWd1cmUgZm9yIHRoaXMgcGFja2FnZS5cbiAgICpcbiAgICogSW4gdGhlIGNvbmZpZyBmaWxlIHRoZSBrZXlzIGNhbiBiZSBwYXRocyByZWxhdGl2ZSB0byB0aGUgcGFja2FnZSBwYXRoO1xuICAgKiBidXQgd2hlbiBiZWluZyByZWFkIGJhY2sgZnJvbSB0aGUgYE5nY2NDb25maWd1cmF0aW9uYCBzZXJ2aWNlLCB0aGVzZSBwYXRoc1xuICAgKiB3aWxsIGJlIGFic29sdXRlLlxuICAgKi9cbiAgZW50cnlQb2ludHM6IHtbZW50cnlQb2ludFBhdGg6IHN0cmluZ106IE5nY2NFbnRyeVBvaW50Q29uZmlnO307XG4gIC8qKlxuICAgKiBBIGNvbGxlY3Rpb24gb2YgcmVnZXhlcyB0aGF0IG1hdGNoIGRlZXAgaW1wb3J0cyB0byBpZ25vcmUsIGZvciB0aGlzIHBhY2thZ2UsIHJhdGhlciB0aGFuXG4gICAqIGRpc3BsYXlpbmcgYSB3YXJuaW5nLlxuICAgKi9cbiAgaWdub3JhYmxlRGVlcEltcG9ydE1hdGNoZXJzPzogUmVnRXhwW107XG59XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBhbiBlbnRyeS1wb2ludC5cbiAqXG4gKiBUaGUgZXhpc3RlbmNlIG9mIGEgY29uZmlndXJhdGlvbiBmb3IgYSBwYXRoIHRlbGxzIG5nY2MgdGhhdCB0aGlzIHNob3VsZCBiZSBjb25zaWRlcmVkIGZvclxuICogcHJvY2Vzc2luZyBhcyBhbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjRW50cnlQb2ludENvbmZpZyB7XG4gIC8qKiBEbyBub3QgcHJvY2VzcyAob3IgZXZlbiBhY2tub3dsZWRnZSB0aGUgZXhpc3RlbmNlIG9mKSB0aGlzIGVudHJ5LXBvaW50LCBpZiB0cnVlLiAqL1xuICBpZ25vcmU/OiBib29sZWFuO1xuICAvKipcbiAgICogVGhpcyBwcm9wZXJ0eSwgaWYgcHJvdmlkZWQsIGhvbGRzIHZhbHVlcyB0aGF0IHdpbGwgb3ZlcnJpZGUgZXF1aXZhbGVudCBwcm9wZXJ0aWVzIGluIGFuXG4gICAqIGVudHJ5LXBvaW50J3MgcGFja2FnZS5qc29uIGZpbGUuXG4gICAqL1xuICBvdmVycmlkZT86IFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc01hcDtcblxuICAvKipcbiAgICogTm9ybWFsbHksIG5nY2Mgd2lsbCBza2lwIGNvbXBpbGF0aW9uIG9mIGVudHJ5cG9pbnRzIHRoYXQgY29udGFpbiBpbXBvcnRzIHRoYXQgY2FuJ3QgYmUgcmVzb2x2ZWRcbiAgICogb3IgdW5kZXJzdG9vZC4gSWYgdGhpcyBvcHRpb24gaXMgc3BlY2lmaWVkLCBuZ2NjIHdpbGwgcHJvY2VlZCB3aXRoIGNvbXBpbGluZyB0aGUgZW50cnlwb2ludFxuICAgKiBldmVuIGluIHRoZSBmYWNlIG9mIHN1Y2ggbWlzc2luZyBkZXBlbmRlbmNpZXMuXG4gICAqL1xuICBpZ25vcmVNaXNzaW5nRGVwZW5kZW5jaWVzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogRW5hYmxpbmcgdGhpcyBvcHRpb24gZm9yIGFuIGVudHJ5cG9pbnQgdGVsbHMgbmdjYyB0aGF0IGRlZXAgaW1wb3J0cyBtaWdodCBiZSB1c2VkIGZvciB0aGUgZmlsZXNcbiAgICogaXQgY29udGFpbnMsIGFuZCB0aGF0IGl0IHNob3VsZCBnZW5lcmF0ZSBwcml2YXRlIHJlLWV4cG9ydHMgYWxvbmdzaWRlIHRoZSBOZ01vZHVsZSBvZiBhbGwgdGhlXG4gICAqIGRpcmVjdGl2ZXMvcGlwZXMgaXQgbWFrZXMgYXZhaWxhYmxlIGluIHN1cHBvcnQgb2YgdGhvc2UgaW1wb3J0cy5cbiAgICovXG4gIGdlbmVyYXRlRGVlcFJlZXhwb3J0cz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiBmb3IgbmdjYy5cbiAqXG4gKiBUaGlzIGlzIHRoZSB1bHRpbWF0ZSBmYWxsYmFjayBjb25maWd1cmF0aW9uIHRoYXQgbmdjYyB3aWxsIHVzZSBpZiB0aGVyZSBpcyBubyBjb25maWd1cmF0aW9uXG4gKiBmb3IgYSBwYWNrYWdlIGF0IHRoZSBwYWNrYWdlIGxldmVsIG9yIHByb2plY3QgbGV2ZWwuXG4gKlxuICogVGhpcyBjb25maWd1cmF0aW9uIGlzIGZvciBwYWNrYWdlcyB0aGF0IGFyZSBcImRlYWRcIiAtIGkuZS4gbm8gbG9uZ2VyIG1haW50YWluZWQgYW5kIHNvIGFyZVxuICogdW5saWtlbHkgdG8gYmUgZml4ZWQgdG8gd29yayB3aXRoIG5nY2MsIG5vciBwcm92aWRlIGEgcGFja2FnZSBsZXZlbCBjb25maWcgb2YgdGhlaXIgb3duLlxuICpcbiAqIFRoZSBmYWxsYmFjayBwcm9jZXNzIGZvciBsb29raW5nIHVwIGNvbmZpZ3VyYXRpb24gaXM6XG4gKlxuICogUHJvamVjdCAtPiBQYWNrYWdlIC0+IERlZmF1bHRcbiAqXG4gKiBJZiBhIHBhY2thZ2UgcHJvdmlkZXMgaXRzIG93biBjb25maWd1cmF0aW9uIHRoZW4gdGhhdCB3b3VsZCBvdmVycmlkZSB0aGlzIGRlZmF1bHQgb25lLlxuICpcbiAqIEFsc28gYXBwbGljYXRpb24gZGV2ZWxvcGVycyBjYW4gYWx3YXlzIHByb3ZpZGUgY29uZmlndXJhdGlvbiBhdCB0aGVpciBwcm9qZWN0IGxldmVsIHdoaWNoXG4gKiB3aWxsIG92ZXJyaWRlIGV2ZXJ5dGhpbmcgZWxzZS5cbiAqXG4gKiBOb3RlIHRoYXQgdGhlIGZhbGxiYWNrIGlzIHBhY2thZ2UgYmFzZWQgbm90IGVudHJ5LXBvaW50IGJhc2VkLlxuICogRm9yIGV4YW1wbGUsIGlmIGEgdGhlcmUgaXMgY29uZmlndXJhdGlvbiBmb3IgYSBwYWNrYWdlIGF0IHRoZSBwcm9qZWN0IGxldmVsIHRoaXMgd2lsbCByZXBsYWNlIGFsbFxuICogZW50cnktcG9pbnQgY29uZmlndXJhdGlvbnMgdGhhdCBtYXkgaGF2ZSBiZWVuIHByb3ZpZGVkIGluIHRoZSBwYWNrYWdlIGxldmVsIG9yIGRlZmF1bHQgbGV2ZWxcbiAqIGNvbmZpZ3VyYXRpb25zLCBldmVuIGlmIHRoZSBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gZG9lcyBub3QgcHJvdmlkZSBmb3IgYSBnaXZlbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfTkdDQ19DT05GSUc6IE5nY2NQcm9qZWN0Q29uZmlnID0ge1xuICBwYWNrYWdlczoge1xuICAgIC8vIEFkZCBkZWZhdWx0IHBhY2thZ2UgY29uZmlndXJhdGlvbiBoZXJlLiBGb3IgZXhhbXBsZTpcbiAgICAvLyAnQGFuZ3VsYXIvZmlyZUBeNS4yLjAnOiB7XG4gICAgLy8gICBlbnRyeVBvaW50czoge1xuICAgIC8vICAgICAnLi9kYXRhYmFzZS1kZXByZWNhdGVkJzoge2lnbm9yZTogdHJ1ZX0sXG4gICAgLy8gICB9LFxuICAgIC8vIH0sXG5cbiAgICAvLyBUaGUgcGFja2FnZSBkb2VzIG5vdCBjb250YWluIGFueSBgLm1ldGFkYXRhLmpzb25gIGZpbGVzIGluIHRoZSByb290IGRpcmVjdG9yeSBidXQgb25seSBpbnNpZGVcbiAgICAvLyBgZGlzdC9gLiBXaXRob3V0IHRoaXMgY29uZmlnLCBuZ2NjIGRvZXMgbm90IHJlYWxpemUgdGhpcyBpcyBhIFZpZXdFbmdpbmUtYnVpbHQgQW5ndWxhclxuICAgIC8vIHBhY2thZ2UgdGhhdCBuZWVkcyB0byBiZSBjb21waWxlZCB0byBJdnkuXG4gICAgJ2FuZ3VsYXIyLWhpZ2hjaGFydHMnOiB7XG4gICAgICBlbnRyeVBvaW50czoge1xuICAgICAgICAnLic6IHtcbiAgICAgICAgICBvdmVycmlkZToge1xuICAgICAgICAgICAgbWFpbjogJy4vaW5kZXguanMnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBUaGUgYGRpc3QvYCBkaXJlY3RvcnkgaGFzIGEgZHVwbGljYXRlIGBwYWNrYWdlLmpzb25gIHBvaW50aW5nIHRvIHRoZSBzYW1lIGZpbGVzLCB3aGljaCAodW5kZXJcbiAgICAvLyBjZXJ0YWluIGNvbmZpZ3VyYXRpb25zKSBjYW4gY2F1c2VzIG5nY2MgdG8gdHJ5IHRvIHByb2Nlc3MgdGhlIGZpbGVzIHR3aWNlIGFuZCBmYWlsLlxuICAgIC8vIElnbm9yZSB0aGUgYGRpc3QvYCBlbnRyeS1wb2ludC5cbiAgICAnbmcyLWRyYWd1bGEnOiB7XG4gICAgICBlbnRyeVBvaW50czoge1xuICAgICAgICAnLi9kaXN0Jzoge2lnbm9yZTogdHJ1ZX0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59O1xuXG5pbnRlcmZhY2UgVmVyc2lvbmVkUGFja2FnZUNvbmZpZyBleHRlbmRzIE5nY2NQYWNrYWdlQ29uZmlnIHtcbiAgdmVyc2lvblJhbmdlOiBzdHJpbmc7XG59XG5cbmNvbnN0IE5HQ0NfQ09ORklHX0ZJTEVOQU1FID0gJ25nY2MuY29uZmlnLmpzJztcblxuLyoqXG4gKiBOZ2NjIGhhcyBhIGhpZXJhcmNoaWNhbCBjb25maWd1cmF0aW9uIHN5c3RlbSB0aGF0IGxldHMgdXMgXCJmaXggdXBcIiBwYWNrYWdlcyB0aGF0IGRvIG5vdFxuICogd29yayB3aXRoIG5nY2Mgb3V0IG9mIHRoZSBib3guXG4gKlxuICogVGhlcmUgYXJlIHRocmVlIGxldmVscyBhdCB3aGljaCBjb25maWd1cmF0aW9uIGNhbiBiZSBkZWNsYXJlZDpcbiAqXG4gKiAqIERlZmF1bHQgbGV2ZWwgLSBuZ2NjIGNvbWVzIHdpdGggYnVpbHQtaW4gY29uZmlndXJhdGlvbiBmb3Igd2VsbCBrbm93biBjYXNlcy5cbiAqICogUGFja2FnZSBsZXZlbCAtIGEgbGlicmFyeSBhdXRob3IgcHVibGlzaGVzIGEgY29uZmlndXJhdGlvbiB3aXRoIHRoZWlyIHBhY2thZ2UgdG8gZml4IGtub3duXG4gKiAgIGlzc3Vlcy5cbiAqICogUHJvamVjdCBsZXZlbCAtIHRoZSBhcHBsaWNhdGlvbiBkZXZlbG9wZXIgcHJvdmlkZXMgYSBjb25maWd1cmF0aW9uIHRoYXQgZml4ZXMgaXNzdWVzIHNwZWNpZmljXG4gKiAgIHRvIHRoZSBsaWJyYXJpZXMgdXNlZCBpbiB0aGVpciBhcHBsaWNhdGlvbi5cbiAqXG4gKiBOZ2NjIHdpbGwgbWF0Y2ggY29uZmlndXJhdGlvbiBiYXNlZCBvbiB0aGUgcGFja2FnZSBuYW1lIGJ1dCBhbHNvIG9uIGl0cyB2ZXJzaW9uLiBUaGlzIGFsbG93c1xuICogY29uZmlndXJhdGlvbiB0byBwcm92aWRlIGRpZmZlcmVudCBmaXhlcyB0byBkaWZmZXJlbnQgdmVyc2lvbiByYW5nZXMgb2YgYSBwYWNrYWdlLlxuICpcbiAqICogUGFja2FnZSBsZXZlbCBjb25maWd1cmF0aW9uIGlzIHNwZWNpZmljIHRvIHRoZSBwYWNrYWdlIHZlcnNpb24gd2hlcmUgdGhlIGNvbmZpZ3VyYXRpb24gaXNcbiAqICAgZm91bmQuXG4gKiAqIERlZmF1bHQgYW5kIHByb2plY3QgbGV2ZWwgY29uZmlndXJhdGlvbiBzaG91bGQgcHJvdmlkZSB2ZXJzaW9uIHJhbmdlcyB0byBlbnN1cmUgdGhhdCB0aGVcbiAqICAgY29uZmlndXJhdGlvbiBpcyBvbmx5IGFwcGxpZWQgdG8gdGhlIGFwcHJvcHJpYXRlIHZlcnNpb25zIG9mIGEgcGFja2FnZS5cbiAqXG4gKiBXaGVuIGdldHRpbmcgYSBjb25maWd1cmF0aW9uIGZvciBhIHBhY2thZ2UgKHZpYSBgZ2V0Q29uZmlnKClgKSB0aGUgY2FsbGVyIHNob3VsZCBwcm92aWRlIHRoZVxuICogdmVyc2lvbiBvZiB0aGUgcGFja2FnZSBpbiBxdWVzdGlvbiwgaWYgYXZhaWxhYmxlLiBJZiBpdCBpcyBub3QgcHJvdmlkZWQgdGhlbiB0aGUgZmlyc3QgYXZhaWxhYmxlXG4gKiBjb25maWd1cmF0aW9uIGZvciBhIHBhY2thZ2UgaXMgcmV0dXJuZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ2NjQ29uZmlndXJhdGlvbiB7XG4gIHByaXZhdGUgZGVmYXVsdENvbmZpZzogTmdjY1Byb2plY3RDb25maWc8VmVyc2lvbmVkUGFja2FnZUNvbmZpZ1tdPjtcbiAgcHJpdmF0ZSBwcm9qZWN0Q29uZmlnOiBOZ2NjUHJvamVjdENvbmZpZzxWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW10+O1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFZlcnNpb25lZFBhY2thZ2VDb25maWc+KCk7XG4gIHJlYWRvbmx5IGhhc2g6IHN0cmluZztcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBiYXNlRGlyOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHRoaXMuZGVmYXVsdENvbmZpZyA9IHRoaXMucHJvY2Vzc1Byb2plY3RDb25maWcoYmFzZURpciwgREVGQVVMVF9OR0NDX0NPTkZJRyk7XG4gICAgdGhpcy5wcm9qZWN0Q29uZmlnID0gdGhpcy5wcm9jZXNzUHJvamVjdENvbmZpZyhiYXNlRGlyLCB0aGlzLmxvYWRQcm9qZWN0Q29uZmlnKGJhc2VEaXIpKTtcbiAgICB0aGlzLmhhc2ggPSB0aGlzLmNvbXB1dGVIYXNoKCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgY29uZmlndXJhdGlvbiBmb3IgdGhlIGdpdmVuIGB2ZXJzaW9uYCBvZiBhIHBhY2thZ2UgYXQgYHBhY2thZ2VQYXRoYC5cbiAgICpcbiAgICogQHBhcmFtIHBhY2thZ2VQYXRoIFRoZSBwYXRoIHRvIHRoZSBwYWNrYWdlIHdob3NlIGNvbmZpZyB3ZSB3YW50LlxuICAgKiBAcGFyYW0gdmVyc2lvbiBUaGUgdmVyc2lvbiBvZiB0aGUgcGFja2FnZSB3aG9zZSBjb25maWcgd2Ugd2FudCwgb3IgYG51bGxgIGlmIHRoZSBwYWNrYWdlJ3NcbiAgICogcGFja2FnZS5qc29uIGRpZCBub3QgZXhpc3Qgb3Igd2FzIGludmFsaWQuXG4gICAqL1xuICBnZXRDb25maWcocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6IFZlcnNpb25lZFBhY2thZ2VDb25maWcge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gcGFja2FnZVBhdGggKyAodmVyc2lvbiAhPT0gbnVsbCA/IGBAJHt2ZXJzaW9ufWAgOiAnJyk7XG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKGNhY2hlS2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KGNhY2hlS2V5KSAhO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2plY3RMZXZlbENvbmZpZyA9XG4gICAgICAgIGZpbmRTYXRpc2ZhY3RvcnlWZXJzaW9uKHRoaXMucHJvamVjdENvbmZpZy5wYWNrYWdlc1twYWNrYWdlUGF0aF0sIHZlcnNpb24pO1xuICAgIGlmIChwcm9qZWN0TGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBwcm9qZWN0TGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIHByb2plY3RMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlTGV2ZWxDb25maWcgPSB0aGlzLmxvYWRQYWNrYWdlQ29uZmlnKHBhY2thZ2VQYXRoLCB2ZXJzaW9uKTtcbiAgICBpZiAocGFja2FnZUxldmVsQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChjYWNoZUtleSwgcGFja2FnZUxldmVsQ29uZmlnKTtcbiAgICAgIHJldHVybiBwYWNrYWdlTGV2ZWxDb25maWc7XG4gICAgfVxuXG4gICAgY29uc3QgZGVmYXVsdExldmVsQ29uZmlnID1cbiAgICAgICAgZmluZFNhdGlzZmFjdG9yeVZlcnNpb24odGhpcy5kZWZhdWx0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VQYXRoXSwgdmVyc2lvbik7XG4gICAgaWYgKGRlZmF1bHRMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIGRlZmF1bHRMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gZGVmYXVsdExldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIHJldHVybiB7dmVyc2lvblJhbmdlOiAnKicsIGVudHJ5UG9pbnRzOiB7fX07XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NQcm9qZWN0Q29uZmlnKGJhc2VEaXI6IEFic29sdXRlRnNQYXRoLCBwcm9qZWN0Q29uZmlnOiBOZ2NjUHJvamVjdENvbmZpZyk6XG4gICAgICBOZ2NjUHJvamVjdENvbmZpZzxWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW10+IHtcbiAgICBjb25zdCBwcm9jZXNzZWRDb25maWc6IE5nY2NQcm9qZWN0Q29uZmlnPFZlcnNpb25lZFBhY2thZ2VDb25maWdbXT4gPSB7cGFja2FnZXM6IHt9fTtcbiAgICBmb3IgKGNvbnN0IHBhY2thZ2VQYXRoQW5kVmVyc2lvbiBpbiBwcm9qZWN0Q29uZmlnLnBhY2thZ2VzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlQ29uZmlnID0gcHJvamVjdENvbmZpZy5wYWNrYWdlc1twYWNrYWdlUGF0aEFuZFZlcnNpb25dO1xuICAgICAgaWYgKHBhY2thZ2VDb25maWcpIHtcbiAgICAgICAgY29uc3QgW3BhY2thZ2VQYXRoLCB2ZXJzaW9uUmFuZ2UgPSAnKiddID0gdGhpcy5zcGxpdFBhdGhBbmRWZXJzaW9uKHBhY2thZ2VQYXRoQW5kVmVyc2lvbik7XG4gICAgICAgIGNvbnN0IGFic1BhY2thZ2VQYXRoID0gcmVzb2x2ZShiYXNlRGlyLCAnbm9kZV9tb2R1bGVzJywgcGFja2FnZVBhdGgpO1xuICAgICAgICBjb25zdCBlbnRyeVBvaW50cyA9IHRoaXMucHJvY2Vzc0VudHJ5UG9pbnRzKGFic1BhY2thZ2VQYXRoLCBwYWNrYWdlQ29uZmlnKTtcbiAgICAgICAgcHJvY2Vzc2VkQ29uZmlnLnBhY2thZ2VzW2Fic1BhY2thZ2VQYXRoXSA9IHByb2Nlc3NlZENvbmZpZy5wYWNrYWdlc1thYnNQYWNrYWdlUGF0aF0gfHwgW107XG4gICAgICAgIHByb2Nlc3NlZENvbmZpZy5wYWNrYWdlc1thYnNQYWNrYWdlUGF0aF0ucHVzaChcbiAgICAgICAgICAgIHsuLi5wYWNrYWdlQ29uZmlnLCB2ZXJzaW9uUmFuZ2UsIGVudHJ5UG9pbnRzfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9jZXNzZWRDb25maWc7XG4gIH1cblxuICBwcml2YXRlIGxvYWRQcm9qZWN0Q29uZmlnKGJhc2VEaXI6IEFic29sdXRlRnNQYXRoKTogTmdjY1Byb2plY3RDb25maWcge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gam9pbihiYXNlRGlyLCBOR0NDX0NPTkZJR19GSUxFTkFNRSk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGNvbmZpZ0ZpbGVQYXRoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUgYXQgXCIke2NvbmZpZ0ZpbGVQYXRofVwiOiBgICsgZS5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtwYWNrYWdlczoge319O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9hZFBhY2thZ2VDb25maWcocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6XG4gICAgICBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnfG51bGwge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gam9pbihwYWNrYWdlUGF0aCwgTkdDQ19DT05GSUdfRklMRU5BTUUpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhjb25maWdGaWxlUGF0aCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdmVyc2lvblJhbmdlOiB2ZXJzaW9uIHx8ICcqJyxcbiAgICAgICAgICBlbnRyeVBvaW50czogdGhpcy5wcm9jZXNzRW50cnlQb2ludHMocGFja2FnZVBhdGgsIHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpKSxcbiAgICAgICAgfTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBhY2thZ2UgY29uZmlndXJhdGlvbiBmaWxlIGF0IFwiJHtjb25maWdGaWxlUGF0aH1cIjogYCArIGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXZhbFNyY0ZpbGUoc3JjUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBhbnkge1xuICAgIGNvbnN0IHNyYyA9IHRoaXMuZnMucmVhZEZpbGUoc3JjUGF0aCk7XG4gICAgY29uc3QgdGhlRXhwb3J0cyA9IHt9O1xuICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICBtb2R1bGU6IHtleHBvcnRzOiB0aGVFeHBvcnRzfSxcbiAgICAgIGV4cG9ydHM6IHRoZUV4cG9ydHMsIHJlcXVpcmUsXG4gICAgICBfX2Rpcm5hbWU6IGRpcm5hbWUoc3JjUGF0aCksXG4gICAgICBfX2ZpbGVuYW1lOiBzcmNQYXRoXG4gICAgfTtcbiAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc3JjLCBzYW5kYm94LCB7ZmlsZW5hbWU6IHNyY1BhdGh9KTtcbiAgICByZXR1cm4gc2FuZGJveC5tb2R1bGUuZXhwb3J0cztcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc0VudHJ5UG9pbnRzKHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcGFja2FnZUNvbmZpZzogTmdjY1BhY2thZ2VDb25maWcpOlxuICAgICAge1tlbnRyeVBvaW50UGF0aDogc3RyaW5nXTogTmdjY0VudHJ5UG9pbnRDb25maWc7fSB7XG4gICAgY29uc3QgcHJvY2Vzc2VkRW50cnlQb2ludHM6IHtbZW50cnlQb2ludFBhdGg6IHN0cmluZ106IE5nY2NFbnRyeVBvaW50Q29uZmlnO30gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5UG9pbnRQYXRoIGluIHBhY2thZ2VDb25maWcuZW50cnlQb2ludHMpIHtcbiAgICAgIC8vIENoYW5nZSB0aGUga2V5cyB0byBiZSBhYnNvbHV0ZSBwYXRoc1xuICAgICAgcHJvY2Vzc2VkRW50cnlQb2ludHNbcmVzb2x2ZShwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpXSA9XG4gICAgICAgICAgcGFja2FnZUNvbmZpZy5lbnRyeVBvaW50c1tlbnRyeVBvaW50UGF0aF07XG4gICAgfVxuICAgIHJldHVybiBwcm9jZXNzZWRFbnRyeVBvaW50cztcbiAgfVxuXG4gIHByaXZhdGUgc3BsaXRQYXRoQW5kVmVyc2lvbihwYWNrYWdlUGF0aEFuZFZlcnNpb246IHN0cmluZyk6IFtzdHJpbmcsIHN0cmluZ3x1bmRlZmluZWRdIHtcbiAgICBjb25zdCB2ZXJzaW9uSW5kZXggPSBwYWNrYWdlUGF0aEFuZFZlcnNpb24ubGFzdEluZGV4T2YoJ0AnKTtcbiAgICAvLyBOb3RlIHRoYXQgPiAwIGlzIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudCB0byBtYXRjaCBAIGF0IHRoZSBzdGFydCBvZiB0aGUgbGluZVxuICAgIC8vIHdoaWNoIGlzIHdoYXQgeW91IHdvdWxkIGhhdmUgd2l0aCBhIG5hbWVzcGFjZWQgcGFja2FnZSwgZS5nLiBgQGFuZ3VsYXIvY29tbW9uYC5cbiAgICByZXR1cm4gdmVyc2lvbkluZGV4ID4gMCA/XG4gICAgICAgIFtcbiAgICAgICAgICBwYWNrYWdlUGF0aEFuZFZlcnNpb24uc3Vic3RyaW5nKDAsIHZlcnNpb25JbmRleCksXG4gICAgICAgICAgcGFja2FnZVBhdGhBbmRWZXJzaW9uLnN1YnN0cmluZyh2ZXJzaW9uSW5kZXggKyAxKVxuICAgICAgICBdIDpcbiAgICAgICAgW3BhY2thZ2VQYXRoQW5kVmVyc2lvbiwgdW5kZWZpbmVkXTtcbiAgfVxuXG4gIHByaXZhdGUgY29tcHV0ZUhhc2goKTogc3RyaW5nIHtcbiAgICByZXR1cm4gY3JlYXRlSGFzaCgnbWQ1JykudXBkYXRlKEpTT04uc3RyaW5naWZ5KHRoaXMucHJvamVjdENvbmZpZykpLmRpZ2VzdCgnaGV4Jyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFNhdGlzZmFjdG9yeVZlcnNpb24oXG4gICAgY29uZmlnczogVmVyc2lvbmVkUGFja2FnZUNvbmZpZ1tdIHwgdW5kZWZpbmVkLCB2ZXJzaW9uOiBzdHJpbmcgfCBudWxsKTogVmVyc2lvbmVkUGFja2FnZUNvbmZpZ3xcbiAgICBudWxsIHtcbiAgaWYgKGNvbmZpZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmICh2ZXJzaW9uID09PSBudWxsKSB7XG4gICAgLy8gVGhlIHBhY2thZ2UgaGFzIG5vIHZlcnNpb24gKCEpIC0gcGVyaGFwcyB0aGUgZW50cnktcG9pbnQgd2FzIGZyb20gYSBkZWVwIGltcG9ydCwgd2hpY2ggbWFkZVxuICAgIC8vIGl0IGltcG9zc2libGUgdG8gZmluZCB0aGUgcGFja2FnZS5qc29uLlxuICAgIC8vIFNvIGp1c3QgcmV0dXJuIHRoZSBmaXJzdCBjb25maWcgdGhhdCBtYXRjaGVzIHRoZSBwYWNrYWdlIG5hbWUuXG4gICAgcmV0dXJuIGNvbmZpZ3NbMF07XG4gIH1cbiAgcmV0dXJuIGNvbmZpZ3MuZmluZChcbiAgICAgICAgICAgICBjb25maWcgPT4gc2F0aXNmaWVzKHZlcnNpb24sIGNvbmZpZy52ZXJzaW9uUmFuZ2UsIHtpbmNsdWRlUHJlcmVsZWFzZTogdHJ1ZX0pKSB8fFxuICAgICAgbnVsbDtcbn1cbiJdfQ==