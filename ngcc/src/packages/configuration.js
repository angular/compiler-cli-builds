(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/configuration", ["require", "exports", "tslib", "semver", "vm", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
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
        //     './database-deprecated': {
        //       ignore: true,
        //     },
        //   },
        // },
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
                    processedConfig.packages[absPackagePath].push({ versionRange: versionRange, entryPoints: entryPoints });
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
        return configs.find(function (config) { return semver_1.satisfies(version, config.versionRange); }) || null;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFpQztJQUNqQyx1QkFBeUI7SUFDekIsMkVBQWtHO0lBb0RsRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXNCRztJQUNVLFFBQUEsbUJBQW1CLEdBQXNCO1FBQ3BELFFBQVEsRUFBRTtRQUNOLHVEQUF1RDtRQUN2RCw0QkFBNEI7UUFDNUIsbUJBQW1CO1FBQ25CLGlDQUFpQztRQUNqQyxzQkFBc0I7UUFDdEIsU0FBUztRQUNULE9BQU87UUFDUCxLQUFLO1NBQ1I7S0FDRixDQUFDO0lBTUYsSUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQztJQUU5Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0F1Qkc7SUFDSDtRQUtFLDJCQUFvQixFQUFjLEVBQUUsT0FBdUI7WUFBdkMsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUYxQixVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWtDLENBQUM7WUFHeEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLDJCQUFtQixDQUFDLENBQUM7WUFDN0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRDs7Ozs7O1dBTUc7UUFDSCxxQ0FBUyxHQUFULFVBQVUsV0FBMkIsRUFBRSxPQUFvQjtZQUN6RCxJQUFNLFFBQVEsR0FBRyxXQUFXLEdBQUcsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFJLE9BQVMs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QUFDLENBQUMsQ0FBQztTQUNuQjtRQUNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLGtCQUFTLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBdkMsQ0FBdUMsQ0FBQyxJQUFJLElBQUksQ0FBQztJQUNqRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtzYXRpc2ZpZXN9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgKiBhcyB2bSBmcm9tICd2bSc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBkaXJuYW1lLCBqb2luLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXB9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG4vKipcbiAqIFRoZSBmb3JtYXQgb2YgYSBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjUHJvamVjdENvbmZpZzxUID0gTmdjY1BhY2thZ2VDb25maWc+IHsgcGFja2FnZXM6IHtbcGFja2FnZVBhdGg6IHN0cmluZ106IFR9OyB9XG5cbi8qKlxuICogVGhlIGZvcm1hdCBvZiBhIHBhY2thZ2UgbGV2ZWwgY29uZmlndXJhdGlvbiBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NQYWNrYWdlQ29uZmlnIHtcbiAgLyoqXG4gICAqIFRoZSBlbnRyeS1wb2ludHMgdG8gY29uZmlndXJlIGZvciB0aGlzIHBhY2thZ2UuXG4gICAqXG4gICAqIEluIHRoZSBjb25maWcgZmlsZSB0aGUga2V5cyBjYW4gYmUgcGF0aHMgcmVsYXRpdmUgdG8gdGhlIHBhY2thZ2UgcGF0aDtcbiAgICogYnV0IHdoZW4gYmVpbmcgcmVhZCBiYWNrIGZyb20gdGhlIGBOZ2NjQ29uZmlndXJhdGlvbmAgc2VydmljZSwgdGhlc2UgcGF0aHNcbiAgICogd2lsbCBiZSBhYnNvbHV0ZS5cbiAgICovXG4gIGVudHJ5UG9pbnRzOiB7W2VudHJ5UG9pbnRQYXRoOiBzdHJpbmddOiBOZ2NjRW50cnlQb2ludENvbmZpZzt9O1xufVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgYW4gZW50cnktcG9pbnQuXG4gKlxuICogVGhlIGV4aXN0ZW5jZSBvZiBhIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGF0aCB0ZWxscyBuZ2NjIHRoYXQgdGhpcyBzaG91bGQgYmUgY29uc2lkZXJlZCBmb3JcbiAqIHByb2Nlc3NpbmcgYXMgYW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY0VudHJ5UG9pbnRDb25maWcge1xuICAvKiogRG8gbm90IHByb2Nlc3MgKG9yIGV2ZW4gYWNrbm93bGVkZ2UgdGhlIGV4aXN0ZW5jZSBvZikgdGhpcyBlbnRyeS1wb2ludCwgaWYgdHJ1ZS4gKi9cbiAgaWdub3JlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoaXMgcHJvcGVydHksIGlmIHByb3ZpZGVkLCBob2xkcyB2YWx1ZXMgdGhhdCB3aWxsIG92ZXJyaWRlIGVxdWl2YWxlbnQgcHJvcGVydGllcyBpbiBhblxuICAgKiBlbnRyeS1wb2ludCdzIHBhY2thZ2UuanNvbiBmaWxlLlxuICAgKi9cbiAgb3ZlcnJpZGU/OiBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXA7XG5cbiAgLyoqXG4gICAqIE5vcm1hbGx5LCBuZ2NjIHdpbGwgc2tpcCBjb21waWxhdGlvbiBvZiBlbnRyeXBvaW50cyB0aGF0IGNvbnRhaW4gaW1wb3J0cyB0aGF0IGNhbid0IGJlIHJlc29sdmVkXG4gICAqIG9yIHVuZGVyc3Rvb2QuIElmIHRoaXMgb3B0aW9uIGlzIHNwZWNpZmllZCwgbmdjYyB3aWxsIHByb2NlZWQgd2l0aCBjb21waWxpbmcgdGhlIGVudHJ5cG9pbnRcbiAgICogZXZlbiBpbiB0aGUgZmFjZSBvZiBzdWNoIG1pc3NpbmcgZGVwZW5kZW5jaWVzLlxuICAgKi9cbiAgaWdub3JlTWlzc2luZ0RlcGVuZGVuY2llcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEVuYWJsaW5nIHRoaXMgb3B0aW9uIGZvciBhbiBlbnRyeXBvaW50IHRlbGxzIG5nY2MgdGhhdCBkZWVwIGltcG9ydHMgbWlnaHQgYmUgdXNlZCBmb3IgdGhlIGZpbGVzXG4gICAqIGl0IGNvbnRhaW5zLCBhbmQgdGhhdCBpdCBzaG91bGQgZ2VuZXJhdGUgcHJpdmF0ZSByZS1leHBvcnRzIGFsb25nc2lkZSB0aGUgTmdNb2R1bGUgb2YgYWxsIHRoZVxuICAgKiBkaXJlY3RpdmVzL3BpcGVzIGl0IG1ha2VzIGF2YWlsYWJsZSBpbiBzdXBwb3J0IG9mIHRob3NlIGltcG9ydHMuXG4gICAqL1xuICBnZW5lcmF0ZURlZXBSZWV4cG9ydHM/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIG5nY2MuXG4gKlxuICogVGhpcyBpcyB0aGUgdWx0aW1hdGUgZmFsbGJhY2sgY29uZmlndXJhdGlvbiB0aGF0IG5nY2Mgd2lsbCB1c2UgaWYgdGhlcmUgaXMgbm8gY29uZmlndXJhdGlvblxuICogZm9yIGEgcGFja2FnZSBhdCB0aGUgcGFja2FnZSBsZXZlbCBvciBwcm9qZWN0IGxldmVsLlxuICpcbiAqIFRoaXMgY29uZmlndXJhdGlvbiBpcyBmb3IgcGFja2FnZXMgdGhhdCBhcmUgXCJkZWFkXCIgLSBpLmUuIG5vIGxvbmdlciBtYWludGFpbmVkIGFuZCBzbyBhcmVcbiAqIHVubGlrZWx5IHRvIGJlIGZpeGVkIHRvIHdvcmsgd2l0aCBuZ2NjLCBub3IgcHJvdmlkZSBhIHBhY2thZ2UgbGV2ZWwgY29uZmlnIG9mIHRoZWlyIG93bi5cbiAqXG4gKiBUaGUgZmFsbGJhY2sgcHJvY2VzcyBmb3IgbG9va2luZyB1cCBjb25maWd1cmF0aW9uIGlzOlxuICpcbiAqIFByb2plY3QgLT4gUGFja2FnZSAtPiBEZWZhdWx0XG4gKlxuICogSWYgYSBwYWNrYWdlIHByb3ZpZGVzIGl0cyBvd24gY29uZmlndXJhdGlvbiB0aGVuIHRoYXQgd291bGQgb3ZlcnJpZGUgdGhpcyBkZWZhdWx0IG9uZS5cbiAqXG4gKiBBbHNvIGFwcGxpY2F0aW9uIGRldmVsb3BlcnMgY2FuIGFsd2F5cyBwcm92aWRlIGNvbmZpZ3VyYXRpb24gYXQgdGhlaXIgcHJvamVjdCBsZXZlbCB3aGljaFxuICogd2lsbCBvdmVycmlkZSBldmVyeXRoaW5nIGVsc2UuXG4gKlxuICogTm90ZSB0aGF0IHRoZSBmYWxsYmFjayBpcyBwYWNrYWdlIGJhc2VkIG5vdCBlbnRyeS1wb2ludCBiYXNlZC5cbiAqIEZvciBleGFtcGxlLCBpZiBhIHRoZXJlIGlzIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSBhdCB0aGUgcHJvamVjdCBsZXZlbCB0aGlzIHdpbGwgcmVwbGFjZSBhbGxcbiAqIGVudHJ5LXBvaW50IGNvbmZpZ3VyYXRpb25zIHRoYXQgbWF5IGhhdmUgYmVlbiBwcm92aWRlZCBpbiB0aGUgcGFja2FnZSBsZXZlbCBvciBkZWZhdWx0IGxldmVsXG4gKiBjb25maWd1cmF0aW9ucywgZXZlbiBpZiB0aGUgcHJvamVjdCBsZXZlbCBjb25maWd1cmF0aW9uIGRvZXMgbm90IHByb3ZpZGUgZm9yIGEgZ2l2ZW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX05HQ0NfQ09ORklHOiBOZ2NjUHJvamVjdENvbmZpZyA9IHtcbiAgcGFja2FnZXM6IHtcbiAgICAgIC8vIEFkZCBkZWZhdWx0IHBhY2thZ2UgY29uZmlndXJhdGlvbiBoZXJlLiBGb3IgZXhhbXBsZTpcbiAgICAgIC8vICdAYW5ndWxhci9maXJlQF41LjIuMCc6IHtcbiAgICAgIC8vICAgZW50cnlQb2ludHM6IHtcbiAgICAgIC8vICAgICAnLi9kYXRhYmFzZS1kZXByZWNhdGVkJzoge1xuICAgICAgLy8gICAgICAgaWdub3JlOiB0cnVlLFxuICAgICAgLy8gICAgIH0sXG4gICAgICAvLyAgIH0sXG4gICAgICAvLyB9LFxuICB9XG59O1xuXG5pbnRlcmZhY2UgVmVyc2lvbmVkUGFja2FnZUNvbmZpZyBleHRlbmRzIE5nY2NQYWNrYWdlQ29uZmlnIHtcbiAgdmVyc2lvblJhbmdlOiBzdHJpbmc7XG59XG5cbmNvbnN0IE5HQ0NfQ09ORklHX0ZJTEVOQU1FID0gJ25nY2MuY29uZmlnLmpzJztcblxuLyoqXG4gKiBOZ2NjIGhhcyBhIGhpZXJhcmNoaWNhbCBjb25maWd1cmF0aW9uIHN5c3RlbSB0aGF0IGxldHMgdXMgXCJmaXggdXBcIiBwYWNrYWdlcyB0aGF0IGRvIG5vdFxuICogd29yayB3aXRoIG5nY2Mgb3V0IG9mIHRoZSBib3guXG4gKlxuICogVGhlcmUgYXJlIHRocmVlIGxldmVscyBhdCB3aGljaCBjb25maWd1cmF0aW9uIGNhbiBiZSBkZWNsYXJlZDpcbiAqXG4gKiAqIERlZmF1bHQgbGV2ZWwgLSBuZ2NjIGNvbWVzIHdpdGggYnVpbHQtaW4gY29uZmlndXJhdGlvbiBmb3Igd2VsbCBrbm93biBjYXNlcy5cbiAqICogUGFja2FnZSBsZXZlbCAtIGEgbGlicmFyeSBhdXRob3IgcHVibGlzaGVzIGEgY29uZmlndXJhdGlvbiB3aXRoIHRoZWlyIHBhY2thZ2UgdG8gZml4IGtub3duXG4gKiAgIGlzc3Vlcy5cbiAqICogUHJvamVjdCBsZXZlbCAtIHRoZSBhcHBsaWNhdGlvbiBkZXZlbG9wZXIgcHJvdmlkZXMgYSBjb25maWd1cmF0aW9uIHRoYXQgZml4ZXMgaXNzdWVzIHNwZWNpZmljXG4gKiAgIHRvIHRoZSBsaWJyYXJpZXMgdXNlZCBpbiB0aGVpciBhcHBsaWNhdGlvbi5cbiAqXG4gKiBOZ2NjIHdpbGwgbWF0Y2ggY29uZmlndXJhdGlvbiBiYXNlZCBvbiB0aGUgcGFja2FnZSBuYW1lIGJ1dCBhbHNvIG9uIGl0cyB2ZXJzaW9uLiBUaGlzIGFsbG93c1xuICogY29uZmlndXJhdGlvbiB0byBwcm92aWRlIGRpZmZlcmVudCBmaXhlcyB0byBkaWZmZXJlbnQgdmVyc2lvbiByYW5nZXMgb2YgYSBwYWNrYWdlLlxuICpcbiAqICogUGFja2FnZSBsZXZlbCBjb25maWd1cmF0aW9uIGlzIHNwZWNpZmljIHRvIHRoZSBwYWNrYWdlIHZlcnNpb24gd2hlcmUgdGhlIGNvbmZpZ3VyYXRpb24gaXNcbiAqICAgZm91bmQuXG4gKiAqIERlZmF1bHQgYW5kIHByb2plY3QgbGV2ZWwgY29uZmlndXJhdGlvbiBzaG91bGQgcHJvdmlkZSB2ZXJzaW9uIHJhbmdlcyB0byBlbnN1cmUgdGhhdCB0aGVcbiAqICAgY29uZmlndXJhdGlvbiBpcyBvbmx5IGFwcGxpZWQgdG8gdGhlIGFwcHJvcHJpYXRlIHZlcnNpb25zIG9mIGEgcGFja2FnZS5cbiAqXG4gKiBXaGVuIGdldHRpbmcgYSBjb25maWd1cmF0aW9uIGZvciBhIHBhY2thZ2UgKHZpYSBgZ2V0Q29uZmlnKClgKSB0aGUgY2FsbGVyIHNob3VsZCBwcm92aWRlIHRoZVxuICogdmVyc2lvbiBvZiB0aGUgcGFja2FnZSBpbiBxdWVzdGlvbiwgaWYgYXZhaWxhYmxlLiBJZiBpdCBpcyBub3QgcHJvdmlkZWQgdGhlbiB0aGUgZmlyc3QgYXZhaWxhYmxlXG4gKiBjb25maWd1cmF0aW9uIGZvciBhIHBhY2thZ2UgaXMgcmV0dXJuZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ2NjQ29uZmlndXJhdGlvbiB7XG4gIHByaXZhdGUgZGVmYXVsdENvbmZpZzogTmdjY1Byb2plY3RDb25maWc8VmVyc2lvbmVkUGFja2FnZUNvbmZpZ1tdPjtcbiAgcHJpdmF0ZSBwcm9qZWN0Q29uZmlnOiBOZ2NjUHJvamVjdENvbmZpZzxWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW10+O1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFZlcnNpb25lZFBhY2thZ2VDb25maWc+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgYmFzZURpcjogQWJzb2x1dGVGc1BhdGgpIHtcbiAgICB0aGlzLmRlZmF1bHRDb25maWcgPSB0aGlzLnByb2Nlc3NQcm9qZWN0Q29uZmlnKGJhc2VEaXIsIERFRkFVTFRfTkdDQ19DT05GSUcpO1xuICAgIHRoaXMucHJvamVjdENvbmZpZyA9IHRoaXMucHJvY2Vzc1Byb2plY3RDb25maWcoYmFzZURpciwgdGhpcy5sb2FkUHJvamVjdENvbmZpZyhiYXNlRGlyKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgY29uZmlndXJhdGlvbiBmb3IgdGhlIGdpdmVuIGB2ZXJzaW9uYCBvZiBhIHBhY2thZ2UgYXQgYHBhY2thZ2VQYXRoYC5cbiAgICpcbiAgICogQHBhcmFtIHBhY2thZ2VQYXRoIFRoZSBwYXRoIHRvIHRoZSBwYWNrYWdlIHdob3NlIGNvbmZpZyB3ZSB3YW50LlxuICAgKiBAcGFyYW0gdmVyc2lvbiBUaGUgdmVyc2lvbiBvZiB0aGUgcGFja2FnZSB3aG9zZSBjb25maWcgd2Ugd2FudCwgb3IgYG51bGxgIGlmIHRoZSBwYWNrYWdlJ3NcbiAgICogcGFja2FnZS5qc29uIGRpZCBub3QgZXhpc3Qgb3Igd2FzIGludmFsaWQuXG4gICAqL1xuICBnZXRDb25maWcocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6IFZlcnNpb25lZFBhY2thZ2VDb25maWcge1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gcGFja2FnZVBhdGggKyAodmVyc2lvbiAhPT0gbnVsbCA/IGBAJHt2ZXJzaW9ufWAgOiAnJyk7XG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKGNhY2hlS2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KGNhY2hlS2V5KSAhO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2plY3RMZXZlbENvbmZpZyA9XG4gICAgICAgIGZpbmRTYXRpc2ZhY3RvcnlWZXJzaW9uKHRoaXMucHJvamVjdENvbmZpZy5wYWNrYWdlc1twYWNrYWdlUGF0aF0sIHZlcnNpb24pO1xuICAgIGlmIChwcm9qZWN0TGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBwcm9qZWN0TGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIHByb2plY3RMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBwYWNrYWdlTGV2ZWxDb25maWcgPSB0aGlzLmxvYWRQYWNrYWdlQ29uZmlnKHBhY2thZ2VQYXRoLCB2ZXJzaW9uKTtcbiAgICBpZiAocGFja2FnZUxldmVsQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChjYWNoZUtleSwgcGFja2FnZUxldmVsQ29uZmlnKTtcbiAgICAgIHJldHVybiBwYWNrYWdlTGV2ZWxDb25maWc7XG4gICAgfVxuXG4gICAgY29uc3QgZGVmYXVsdExldmVsQ29uZmlnID1cbiAgICAgICAgZmluZFNhdGlzZmFjdG9yeVZlcnNpb24odGhpcy5kZWZhdWx0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VQYXRoXSwgdmVyc2lvbik7XG4gICAgaWYgKGRlZmF1bHRMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIGRlZmF1bHRMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gZGVmYXVsdExldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIHJldHVybiB7dmVyc2lvblJhbmdlOiAnKicsIGVudHJ5UG9pbnRzOiB7fX07XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NQcm9qZWN0Q29uZmlnKGJhc2VEaXI6IEFic29sdXRlRnNQYXRoLCBwcm9qZWN0Q29uZmlnOiBOZ2NjUHJvamVjdENvbmZpZyk6XG4gICAgICBOZ2NjUHJvamVjdENvbmZpZzxWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW10+IHtcbiAgICBjb25zdCBwcm9jZXNzZWRDb25maWc6IE5nY2NQcm9qZWN0Q29uZmlnPFZlcnNpb25lZFBhY2thZ2VDb25maWdbXT4gPSB7cGFja2FnZXM6IHt9fTtcbiAgICBmb3IgKGNvbnN0IHBhY2thZ2VQYXRoQW5kVmVyc2lvbiBpbiBwcm9qZWN0Q29uZmlnLnBhY2thZ2VzKSB7XG4gICAgICBjb25zdCBwYWNrYWdlQ29uZmlnID0gcHJvamVjdENvbmZpZy5wYWNrYWdlc1twYWNrYWdlUGF0aEFuZFZlcnNpb25dO1xuICAgICAgaWYgKHBhY2thZ2VDb25maWcpIHtcbiAgICAgICAgY29uc3QgW3BhY2thZ2VQYXRoLCB2ZXJzaW9uUmFuZ2UgPSAnKiddID0gdGhpcy5zcGxpdFBhdGhBbmRWZXJzaW9uKHBhY2thZ2VQYXRoQW5kVmVyc2lvbik7XG4gICAgICAgIGNvbnN0IGFic1BhY2thZ2VQYXRoID0gcmVzb2x2ZShiYXNlRGlyLCAnbm9kZV9tb2R1bGVzJywgcGFja2FnZVBhdGgpO1xuICAgICAgICBjb25zdCBlbnRyeVBvaW50cyA9IHRoaXMucHJvY2Vzc0VudHJ5UG9pbnRzKGFic1BhY2thZ2VQYXRoLCBwYWNrYWdlQ29uZmlnKTtcbiAgICAgICAgcHJvY2Vzc2VkQ29uZmlnLnBhY2thZ2VzW2Fic1BhY2thZ2VQYXRoXSA9IHByb2Nlc3NlZENvbmZpZy5wYWNrYWdlc1thYnNQYWNrYWdlUGF0aF0gfHwgW107XG4gICAgICAgIHByb2Nlc3NlZENvbmZpZy5wYWNrYWdlc1thYnNQYWNrYWdlUGF0aF0ucHVzaCh7dmVyc2lvblJhbmdlLCBlbnRyeVBvaW50c30pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcHJvY2Vzc2VkQ29uZmlnO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkUHJvamVjdENvbmZpZyhiYXNlRGlyOiBBYnNvbHV0ZUZzUGF0aCk6IE5nY2NQcm9qZWN0Q29uZmlnIHtcbiAgICBjb25zdCBjb25maWdGaWxlUGF0aCA9IGpvaW4oYmFzZURpciwgTkdDQ19DT05GSUdfRklMRU5BTUUpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhjb25maWdGaWxlUGF0aCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0aGlzLmV2YWxTcmNGaWxlKGNvbmZpZ0ZpbGVQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHByb2plY3QgY29uZmlndXJhdGlvbiBmaWxlIGF0IFwiJHtjb25maWdGaWxlUGF0aH1cIjogYCArIGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7cGFja2FnZXM6IHt9fTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGxvYWRQYWNrYWdlQ29uZmlnKHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgdmVyc2lvbjogc3RyaW5nfG51bGwpOlxuICAgICAgVmVyc2lvbmVkUGFja2FnZUNvbmZpZ3xudWxsIHtcbiAgICBjb25zdCBjb25maWdGaWxlUGF0aCA9IGpvaW4ocGFja2FnZVBhdGgsIE5HQ0NfQ09ORklHX0ZJTEVOQU1FKTtcbiAgICBpZiAodGhpcy5mcy5leGlzdHMoY29uZmlnRmlsZVBhdGgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHZlcnNpb25SYW5nZTogdmVyc2lvbiB8fCAnKicsXG4gICAgICAgICAgZW50cnlQb2ludHM6IHRoaXMucHJvY2Vzc0VudHJ5UG9pbnRzKHBhY2thZ2VQYXRoLCB0aGlzLmV2YWxTcmNGaWxlKGNvbmZpZ0ZpbGVQYXRoKSksXG4gICAgICAgIH07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwYWNrYWdlIGNvbmZpZ3VyYXRpb24gZmlsZSBhdCBcIiR7Y29uZmlnRmlsZVBhdGh9XCI6IGAgKyBlLm1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV2YWxTcmNGaWxlKHNyY1BhdGg6IEFic29sdXRlRnNQYXRoKTogYW55IHtcbiAgICBjb25zdCBzcmMgPSB0aGlzLmZzLnJlYWRGaWxlKHNyY1BhdGgpO1xuICAgIGNvbnN0IHRoZUV4cG9ydHMgPSB7fTtcbiAgICBjb25zdCBzYW5kYm94ID0ge1xuICAgICAgbW9kdWxlOiB7ZXhwb3J0czogdGhlRXhwb3J0c30sXG4gICAgICBleHBvcnRzOiB0aGVFeHBvcnRzLCByZXF1aXJlLFxuICAgICAgX19kaXJuYW1lOiBkaXJuYW1lKHNyY1BhdGgpLFxuICAgICAgX19maWxlbmFtZTogc3JjUGF0aFxuICAgIH07XG4gICAgdm0ucnVuSW5OZXdDb250ZXh0KHNyYywgc2FuZGJveCwge2ZpbGVuYW1lOiBzcmNQYXRofSk7XG4gICAgcmV0dXJuIHNhbmRib3gubW9kdWxlLmV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NFbnRyeVBvaW50cyhwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHBhY2thZ2VDb25maWc6IE5nY2NQYWNrYWdlQ29uZmlnKTpcbiAgICAgIHtbZW50cnlQb2ludFBhdGg6IHN0cmluZ106IE5nY2NFbnRyeVBvaW50Q29uZmlnO30ge1xuICAgIGNvbnN0IHByb2Nlc3NlZEVudHJ5UG9pbnRzOiB7W2VudHJ5UG9pbnRQYXRoOiBzdHJpbmddOiBOZ2NjRW50cnlQb2ludENvbmZpZzt9ID0ge307XG4gICAgZm9yIChjb25zdCBlbnRyeVBvaW50UGF0aCBpbiBwYWNrYWdlQ29uZmlnLmVudHJ5UG9pbnRzKSB7XG4gICAgICAvLyBDaGFuZ2UgdGhlIGtleXMgdG8gYmUgYWJzb2x1dGUgcGF0aHNcbiAgICAgIHByb2Nlc3NlZEVudHJ5UG9pbnRzW3Jlc29sdmUocGFja2FnZVBhdGgsIGVudHJ5UG9pbnRQYXRoKV0gPVxuICAgICAgICAgIHBhY2thZ2VDb25maWcuZW50cnlQb2ludHNbZW50cnlQb2ludFBhdGhdO1xuICAgIH1cbiAgICByZXR1cm4gcHJvY2Vzc2VkRW50cnlQb2ludHM7XG4gIH1cblxuICBwcml2YXRlIHNwbGl0UGF0aEFuZFZlcnNpb24ocGFja2FnZVBhdGhBbmRWZXJzaW9uOiBzdHJpbmcpOiBbc3RyaW5nLCBzdHJpbmd8dW5kZWZpbmVkXSB7XG4gICAgY29uc3QgdmVyc2lvbkluZGV4ID0gcGFja2FnZVBhdGhBbmRWZXJzaW9uLmxhc3RJbmRleE9mKCdAJyk7XG4gICAgLy8gTm90ZSB0aGF0ID4gMCBpcyBiZWNhdXNlIHdlIGRvbid0IHdhbnQgdG8gbWF0Y2ggQCBhdCB0aGUgc3RhcnQgb2YgdGhlIGxpbmVcbiAgICAvLyB3aGljaCBpcyB3aGF0IHlvdSB3b3VsZCBoYXZlIHdpdGggYSBuYW1lc3BhY2VkIHBhY2thZ2UsIGUuZy4gYEBhbmd1bGFyL2NvbW1vbmAuXG4gICAgcmV0dXJuIHZlcnNpb25JbmRleCA+IDAgP1xuICAgICAgICBbXG4gICAgICAgICAgcGFja2FnZVBhdGhBbmRWZXJzaW9uLnN1YnN0cmluZygwLCB2ZXJzaW9uSW5kZXgpLFxuICAgICAgICAgIHBhY2thZ2VQYXRoQW5kVmVyc2lvbi5zdWJzdHJpbmcodmVyc2lvbkluZGV4ICsgMSlcbiAgICAgICAgXSA6XG4gICAgICAgIFtwYWNrYWdlUGF0aEFuZFZlcnNpb24sIHVuZGVmaW5lZF07XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFNhdGlzZmFjdG9yeVZlcnNpb24oXG4gICAgY29uZmlnczogVmVyc2lvbmVkUGFja2FnZUNvbmZpZ1tdIHwgdW5kZWZpbmVkLCB2ZXJzaW9uOiBzdHJpbmcgfCBudWxsKTogVmVyc2lvbmVkUGFja2FnZUNvbmZpZ3xcbiAgICBudWxsIHtcbiAgaWYgKGNvbmZpZ3MgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmICh2ZXJzaW9uID09PSBudWxsKSB7XG4gICAgLy8gVGhlIHBhY2thZ2UgaGFzIG5vIHZlcnNpb24gKCEpIC0gcGVyaGFwcyB0aGUgZW50cnktcG9pbnQgd2FzIGZyb20gYSBkZWVwIGltcG9ydCwgd2hpY2ggbWFkZVxuICAgIC8vIGl0IGltcG9zc2libGUgdG8gZmluZCB0aGUgcGFja2FnZS5qc29uLlxuICAgIC8vIFNvIGp1c3QgcmV0dXJuIHRoZSBmaXJzdCBjb25maWcgdGhhdCBtYXRjaGVzIHRoZSBwYWNrYWdlIG5hbWUuXG4gICAgcmV0dXJuIGNvbmZpZ3NbMF07XG4gIH1cbiAgcmV0dXJuIGNvbmZpZ3MuZmluZChjb25maWcgPT4gc2F0aXNmaWVzKHZlcnNpb24sIGNvbmZpZy52ZXJzaW9uUmFuZ2UpKSB8fCBudWxsO1xufVxuIl19