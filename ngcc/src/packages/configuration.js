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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9wYWNrYWdlcy9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILGlDQUFpQztJQUNqQyx1QkFBeUI7SUFDekIsMkVBQWtHO0lBc0NsRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQXNCRztJQUNVLFFBQUEsbUJBQW1CLEdBQXNCO1FBQ3BELFFBQVEsRUFBRTtRQUNOLHVEQUF1RDtRQUN2RCw0QkFBNEI7UUFDNUIsbUJBQW1CO1FBQ25CLGlDQUFpQztRQUNqQyxzQkFBc0I7UUFDdEIsU0FBUztRQUNULE9BQU87UUFDUCxLQUFLO1NBQ1I7S0FDRixDQUFDO0lBTUYsSUFBTSxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQztJQUU5Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0F1Qkc7SUFDSDtRQUtFLDJCQUFvQixFQUFjLEVBQUUsT0FBdUI7WUFBdkMsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUYxQixVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWtDLENBQUM7WUFHeEQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLDJCQUFtQixDQUFDLENBQUM7WUFDN0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzNGLENBQUM7UUFFRDs7Ozs7O1dBTUc7UUFDSCxxQ0FBUyxHQUFULFVBQVUsV0FBMkIsRUFBRSxPQUFvQjtZQUN6RCxJQUFNLFFBQVEsR0FBRyxXQUFXLEdBQUcsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFJLE9BQVMs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QUFDLENBQUMsQ0FBQztTQUNuQjtRQUNELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFBLE1BQU0sSUFBSSxPQUFBLGtCQUFTLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBdkMsQ0FBdUMsQ0FBQyxJQUFJLElBQUksQ0FBQztJQUNqRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtzYXRpc2ZpZXN9IGZyb20gJ3NlbXZlcic7XG5pbXBvcnQgKiBhcyB2bSBmcm9tICd2bSc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBkaXJuYW1lLCBqb2luLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXB9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG4vKipcbiAqIFRoZSBmb3JtYXQgb2YgYSBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBOZ2NjUHJvamVjdENvbmZpZzxUID0gTmdjY1BhY2thZ2VDb25maWc+IHsgcGFja2FnZXM6IHtbcGFja2FnZVBhdGg6IHN0cmluZ106IFR9OyB9XG5cbi8qKlxuICogVGhlIGZvcm1hdCBvZiBhIHBhY2thZ2UgbGV2ZWwgY29uZmlndXJhdGlvbiBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE5nY2NQYWNrYWdlQ29uZmlnIHtcbiAgLyoqXG4gICAqIFRoZSBlbnRyeS1wb2ludHMgdG8gY29uZmlndXJlIGZvciB0aGlzIHBhY2thZ2UuXG4gICAqXG4gICAqIEluIHRoZSBjb25maWcgZmlsZSB0aGUga2V5cyBjYW4gYmUgcGF0aHMgcmVsYXRpdmUgdG8gdGhlIHBhY2thZ2UgcGF0aDtcbiAgICogYnV0IHdoZW4gYmVpbmcgcmVhZCBiYWNrIGZyb20gdGhlIGBOZ2NjQ29uZmlndXJhdGlvbmAgc2VydmljZSwgdGhlc2UgcGF0aHNcbiAgICogd2lsbCBiZSBhYnNvbHV0ZS5cbiAgICovXG4gIGVudHJ5UG9pbnRzOiB7W2VudHJ5UG9pbnRQYXRoOiBzdHJpbmddOiBOZ2NjRW50cnlQb2ludENvbmZpZzt9O1xufVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgYW4gZW50cnktcG9pbnQuXG4gKlxuICogVGhlIGV4aXN0ZW5jZSBvZiBhIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGF0aCB0ZWxscyBuZ2NjIHRoYXQgdGhpcyBzaG91bGQgYmUgY29uc2lkZXJlZCBmb3JcbiAqIHByb2Nlc3NpbmcgYXMgYW4gZW50cnktcG9pbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTmdjY0VudHJ5UG9pbnRDb25maWcge1xuICAvKiogRG8gbm90IHByb2Nlc3MgKG9yIGV2ZW4gYWNrbm93bGVkZ2UgdGhlIGV4aXN0ZW5jZSBvZikgdGhpcyBlbnRyeS1wb2ludCwgaWYgdHJ1ZS4gKi9cbiAgaWdub3JlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoaXMgcHJvcGVydHksIGlmIHByb3ZpZGVkLCBob2xkcyB2YWx1ZXMgdGhhdCB3aWxsIG92ZXJyaWRlIGVxdWl2YWxlbnQgcHJvcGVydGllcyBpbiBhblxuICAgKiBlbnRyeS1wb2ludCdzIHBhY2thZ2UuanNvbiBmaWxlLlxuICAgKi9cbiAgb3ZlcnJpZGU/OiBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNNYXA7XG59XG5cbi8qKlxuICogVGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiBmb3IgbmdjYy5cbiAqXG4gKiBUaGlzIGlzIHRoZSB1bHRpbWF0ZSBmYWxsYmFjayBjb25maWd1cmF0aW9uIHRoYXQgbmdjYyB3aWxsIHVzZSBpZiB0aGVyZSBpcyBubyBjb25maWd1cmF0aW9uXG4gKiBmb3IgYSBwYWNrYWdlIGF0IHRoZSBwYWNrYWdlIGxldmVsIG9yIHByb2plY3QgbGV2ZWwuXG4gKlxuICogVGhpcyBjb25maWd1cmF0aW9uIGlzIGZvciBwYWNrYWdlcyB0aGF0IGFyZSBcImRlYWRcIiAtIGkuZS4gbm8gbG9uZ2VyIG1haW50YWluZWQgYW5kIHNvIGFyZVxuICogdW5saWtlbHkgdG8gYmUgZml4ZWQgdG8gd29yayB3aXRoIG5nY2MsIG5vciBwcm92aWRlIGEgcGFja2FnZSBsZXZlbCBjb25maWcgb2YgdGhlaXIgb3duLlxuICpcbiAqIFRoZSBmYWxsYmFjayBwcm9jZXNzIGZvciBsb29raW5nIHVwIGNvbmZpZ3VyYXRpb24gaXM6XG4gKlxuICogUHJvamVjdCAtPiBQYWNrYWdlIC0+IERlZmF1bHRcbiAqXG4gKiBJZiBhIHBhY2thZ2UgcHJvdmlkZXMgaXRzIG93biBjb25maWd1cmF0aW9uIHRoZW4gdGhhdCB3b3VsZCBvdmVycmlkZSB0aGlzIGRlZmF1bHQgb25lLlxuICpcbiAqIEFsc28gYXBwbGljYXRpb24gZGV2ZWxvcGVycyBjYW4gYWx3YXlzIHByb3ZpZGUgY29uZmlndXJhdGlvbiBhdCB0aGVpciBwcm9qZWN0IGxldmVsIHdoaWNoXG4gKiB3aWxsIG92ZXJyaWRlIGV2ZXJ5dGhpbmcgZWxzZS5cbiAqXG4gKiBOb3RlIHRoYXQgdGhlIGZhbGxiYWNrIGlzIHBhY2thZ2UgYmFzZWQgbm90IGVudHJ5LXBvaW50IGJhc2VkLlxuICogRm9yIGV4YW1wbGUsIGlmIGEgdGhlcmUgaXMgY29uZmlndXJhdGlvbiBmb3IgYSBwYWNrYWdlIGF0IHRoZSBwcm9qZWN0IGxldmVsIHRoaXMgd2lsbCByZXBsYWNlIGFsbFxuICogZW50cnktcG9pbnQgY29uZmlndXJhdGlvbnMgdGhhdCBtYXkgaGF2ZSBiZWVuIHByb3ZpZGVkIGluIHRoZSBwYWNrYWdlIGxldmVsIG9yIGRlZmF1bHQgbGV2ZWxcbiAqIGNvbmZpZ3VyYXRpb25zLCBldmVuIGlmIHRoZSBwcm9qZWN0IGxldmVsIGNvbmZpZ3VyYXRpb24gZG9lcyBub3QgcHJvdmlkZSBmb3IgYSBnaXZlbiBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfTkdDQ19DT05GSUc6IE5nY2NQcm9qZWN0Q29uZmlnID0ge1xuICBwYWNrYWdlczoge1xuICAgICAgLy8gQWRkIGRlZmF1bHQgcGFja2FnZSBjb25maWd1cmF0aW9uIGhlcmUuIEZvciBleGFtcGxlOlxuICAgICAgLy8gJ0Bhbmd1bGFyL2ZpcmVAXjUuMi4wJzoge1xuICAgICAgLy8gICBlbnRyeVBvaW50czoge1xuICAgICAgLy8gICAgICcuL2RhdGFiYXNlLWRlcHJlY2F0ZWQnOiB7XG4gICAgICAvLyAgICAgICBpZ25vcmU6IHRydWUsXG4gICAgICAvLyAgICAgfSxcbiAgICAgIC8vICAgfSxcbiAgICAgIC8vIH0sXG4gIH1cbn07XG5cbmludGVyZmFjZSBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnIGV4dGVuZHMgTmdjY1BhY2thZ2VDb25maWcge1xuICB2ZXJzaW9uUmFuZ2U6IHN0cmluZztcbn1cblxuY29uc3QgTkdDQ19DT05GSUdfRklMRU5BTUUgPSAnbmdjYy5jb25maWcuanMnO1xuXG4vKipcbiAqIE5nY2MgaGFzIGEgaGllcmFyY2hpY2FsIGNvbmZpZ3VyYXRpb24gc3lzdGVtIHRoYXQgbGV0cyB1cyBcImZpeCB1cFwiIHBhY2thZ2VzIHRoYXQgZG8gbm90XG4gKiB3b3JrIHdpdGggbmdjYyBvdXQgb2YgdGhlIGJveC5cbiAqXG4gKiBUaGVyZSBhcmUgdGhyZWUgbGV2ZWxzIGF0IHdoaWNoIGNvbmZpZ3VyYXRpb24gY2FuIGJlIGRlY2xhcmVkOlxuICpcbiAqICogRGVmYXVsdCBsZXZlbCAtIG5nY2MgY29tZXMgd2l0aCBidWlsdC1pbiBjb25maWd1cmF0aW9uIGZvciB3ZWxsIGtub3duIGNhc2VzLlxuICogKiBQYWNrYWdlIGxldmVsIC0gYSBsaWJyYXJ5IGF1dGhvciBwdWJsaXNoZXMgYSBjb25maWd1cmF0aW9uIHdpdGggdGhlaXIgcGFja2FnZSB0byBmaXgga25vd25cbiAqICAgaXNzdWVzLlxuICogKiBQcm9qZWN0IGxldmVsIC0gdGhlIGFwcGxpY2F0aW9uIGRldmVsb3BlciBwcm92aWRlcyBhIGNvbmZpZ3VyYXRpb24gdGhhdCBmaXhlcyBpc3N1ZXMgc3BlY2lmaWNcbiAqICAgdG8gdGhlIGxpYnJhcmllcyB1c2VkIGluIHRoZWlyIGFwcGxpY2F0aW9uLlxuICpcbiAqIE5nY2Mgd2lsbCBtYXRjaCBjb25maWd1cmF0aW9uIGJhc2VkIG9uIHRoZSBwYWNrYWdlIG5hbWUgYnV0IGFsc28gb24gaXRzIHZlcnNpb24uIFRoaXMgYWxsb3dzXG4gKiBjb25maWd1cmF0aW9uIHRvIHByb3ZpZGUgZGlmZmVyZW50IGZpeGVzIHRvIGRpZmZlcmVudCB2ZXJzaW9uIHJhbmdlcyBvZiBhIHBhY2thZ2UuXG4gKlxuICogKiBQYWNrYWdlIGxldmVsIGNvbmZpZ3VyYXRpb24gaXMgc3BlY2lmaWMgdG8gdGhlIHBhY2thZ2UgdmVyc2lvbiB3aGVyZSB0aGUgY29uZmlndXJhdGlvbiBpc1xuICogICBmb3VuZC5cbiAqICogRGVmYXVsdCBhbmQgcHJvamVjdCBsZXZlbCBjb25maWd1cmF0aW9uIHNob3VsZCBwcm92aWRlIHZlcnNpb24gcmFuZ2VzIHRvIGVuc3VyZSB0aGF0IHRoZVxuICogICBjb25maWd1cmF0aW9uIGlzIG9ubHkgYXBwbGllZCB0byB0aGUgYXBwcm9wcmlhdGUgdmVyc2lvbnMgb2YgYSBwYWNrYWdlLlxuICpcbiAqIFdoZW4gZ2V0dGluZyBhIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSAodmlhIGBnZXRDb25maWcoKWApIHRoZSBjYWxsZXIgc2hvdWxkIHByb3ZpZGUgdGhlXG4gKiB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIGluIHF1ZXN0aW9uLCBpZiBhdmFpbGFibGUuIElmIGl0IGlzIG5vdCBwcm92aWRlZCB0aGVuIHRoZSBmaXJzdCBhdmFpbGFibGVcbiAqIGNvbmZpZ3VyYXRpb24gZm9yIGEgcGFja2FnZSBpcyByZXR1cm5lZC5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nY2NDb25maWd1cmF0aW9uIHtcbiAgcHJpdmF0ZSBkZWZhdWx0Q29uZmlnOiBOZ2NjUHJvamVjdENvbmZpZzxWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW10+O1xuICBwcml2YXRlIHByb2plY3RDb25maWc6IE5nY2NQcm9qZWN0Q29uZmlnPFZlcnNpb25lZFBhY2thZ2VDb25maWdbXT47XG4gIHByaXZhdGUgY2FjaGUgPSBuZXcgTWFwPHN0cmluZywgVmVyc2lvbmVkUGFja2FnZUNvbmZpZz4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBiYXNlRGlyOiBBYnNvbHV0ZUZzUGF0aCkge1xuICAgIHRoaXMuZGVmYXVsdENvbmZpZyA9IHRoaXMucHJvY2Vzc1Byb2plY3RDb25maWcoYmFzZURpciwgREVGQVVMVF9OR0NDX0NPTkZJRyk7XG4gICAgdGhpcy5wcm9qZWN0Q29uZmlnID0gdGhpcy5wcm9jZXNzUHJvamVjdENvbmZpZyhiYXNlRGlyLCB0aGlzLmxvYWRQcm9qZWN0Q29uZmlnKGJhc2VEaXIpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBjb25maWd1cmF0aW9uIGZvciB0aGUgZ2l2ZW4gYHZlcnNpb25gIG9mIGEgcGFja2FnZSBhdCBgcGFja2FnZVBhdGhgLlxuICAgKlxuICAgKiBAcGFyYW0gcGFja2FnZVBhdGggVGhlIHBhdGggdG8gdGhlIHBhY2thZ2Ugd2hvc2UgY29uZmlnIHdlIHdhbnQuXG4gICAqIEBwYXJhbSB2ZXJzaW9uIFRoZSB2ZXJzaW9uIG9mIHRoZSBwYWNrYWdlIHdob3NlIGNvbmZpZyB3ZSB3YW50LCBvciBgbnVsbGAgaWYgdGhlIHBhY2thZ2Unc1xuICAgKiBwYWNrYWdlLmpzb24gZGlkIG5vdCBleGlzdCBvciB3YXMgaW52YWxpZC5cbiAgICovXG4gIGdldENvbmZpZyhwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHZlcnNpb246IHN0cmluZ3xudWxsKTogVmVyc2lvbmVkUGFja2FnZUNvbmZpZyB7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBwYWNrYWdlUGF0aCArICh2ZXJzaW9uICE9PSBudWxsID8gYEAke3ZlcnNpb259YCA6ICcnKTtcbiAgICBpZiAodGhpcy5jYWNoZS5oYXMoY2FjaGVLZXkpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQoY2FjaGVLZXkpICE7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvamVjdExldmVsQ29uZmlnID1cbiAgICAgICAgZmluZFNhdGlzZmFjdG9yeVZlcnNpb24odGhpcy5wcm9qZWN0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VQYXRoXSwgdmVyc2lvbik7XG4gICAgaWYgKHByb2plY3RMZXZlbENvbmZpZyAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQoY2FjaGVLZXksIHByb2plY3RMZXZlbENvbmZpZyk7XG4gICAgICByZXR1cm4gcHJvamVjdExldmVsQ29uZmlnO1xuICAgIH1cblxuICAgIGNvbnN0IHBhY2thZ2VMZXZlbENvbmZpZyA9IHRoaXMubG9hZFBhY2thZ2VDb25maWcocGFja2FnZVBhdGgsIHZlcnNpb24pO1xuICAgIGlmIChwYWNrYWdlTGV2ZWxDb25maWcgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KGNhY2hlS2V5LCBwYWNrYWdlTGV2ZWxDb25maWcpO1xuICAgICAgcmV0dXJuIHBhY2thZ2VMZXZlbENvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBkZWZhdWx0TGV2ZWxDb25maWcgPVxuICAgICAgICBmaW5kU2F0aXNmYWN0b3J5VmVyc2lvbih0aGlzLmRlZmF1bHRDb25maWcucGFja2FnZXNbcGFja2FnZVBhdGhdLCB2ZXJzaW9uKTtcbiAgICBpZiAoZGVmYXVsdExldmVsQ29uZmlnICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChjYWNoZUtleSwgZGVmYXVsdExldmVsQ29uZmlnKTtcbiAgICAgIHJldHVybiBkZWZhdWx0TGV2ZWxDb25maWc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHt2ZXJzaW9uUmFuZ2U6ICcqJywgZW50cnlQb2ludHM6IHt9fTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc1Byb2plY3RDb25maWcoYmFzZURpcjogQWJzb2x1dGVGc1BhdGgsIHByb2plY3RDb25maWc6IE5nY2NQcm9qZWN0Q29uZmlnKTpcbiAgICAgIE5nY2NQcm9qZWN0Q29uZmlnPFZlcnNpb25lZFBhY2thZ2VDb25maWdbXT4ge1xuICAgIGNvbnN0IHByb2Nlc3NlZENvbmZpZzogTmdjY1Byb2plY3RDb25maWc8VmVyc2lvbmVkUGFja2FnZUNvbmZpZ1tdPiA9IHtwYWNrYWdlczoge319O1xuICAgIGZvciAoY29uc3QgcGFja2FnZVBhdGhBbmRWZXJzaW9uIGluIHByb2plY3RDb25maWcucGFja2FnZXMpIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VDb25maWcgPSBwcm9qZWN0Q29uZmlnLnBhY2thZ2VzW3BhY2thZ2VQYXRoQW5kVmVyc2lvbl07XG4gICAgICBpZiAocGFja2FnZUNvbmZpZykge1xuICAgICAgICBjb25zdCBbcGFja2FnZVBhdGgsIHZlcnNpb25SYW5nZSA9ICcqJ10gPSB0aGlzLnNwbGl0UGF0aEFuZFZlcnNpb24ocGFja2FnZVBhdGhBbmRWZXJzaW9uKTtcbiAgICAgICAgY29uc3QgYWJzUGFja2FnZVBhdGggPSByZXNvbHZlKGJhc2VEaXIsICdub2RlX21vZHVsZXMnLCBwYWNrYWdlUGF0aCk7XG4gICAgICAgIGNvbnN0IGVudHJ5UG9pbnRzID0gdGhpcy5wcm9jZXNzRW50cnlQb2ludHMoYWJzUGFja2FnZVBhdGgsIHBhY2thZ2VDb25maWcpO1xuICAgICAgICBwcm9jZXNzZWRDb25maWcucGFja2FnZXNbYWJzUGFja2FnZVBhdGhdID0gcHJvY2Vzc2VkQ29uZmlnLnBhY2thZ2VzW2Fic1BhY2thZ2VQYXRoXSB8fCBbXTtcbiAgICAgICAgcHJvY2Vzc2VkQ29uZmlnLnBhY2thZ2VzW2Fic1BhY2thZ2VQYXRoXS5wdXNoKHt2ZXJzaW9uUmFuZ2UsIGVudHJ5UG9pbnRzfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9jZXNzZWRDb25maWc7XG4gIH1cblxuICBwcml2YXRlIGxvYWRQcm9qZWN0Q29uZmlnKGJhc2VEaXI6IEFic29sdXRlRnNQYXRoKTogTmdjY1Byb2plY3RDb25maWcge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gam9pbihiYXNlRGlyLCBOR0NDX0NPTkZJR19GSUxFTkFNRSk7XG4gICAgaWYgKHRoaXMuZnMuZXhpc3RzKGNvbmZpZ0ZpbGVQYXRoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcHJvamVjdCBjb25maWd1cmF0aW9uIGZpbGUgYXQgXCIke2NvbmZpZ0ZpbGVQYXRofVwiOiBgICsgZS5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtwYWNrYWdlczoge319O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbG9hZFBhY2thZ2VDb25maWcocGFja2FnZVBhdGg6IEFic29sdXRlRnNQYXRoLCB2ZXJzaW9uOiBzdHJpbmd8bnVsbCk6XG4gICAgICBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnfG51bGwge1xuICAgIGNvbnN0IGNvbmZpZ0ZpbGVQYXRoID0gam9pbihwYWNrYWdlUGF0aCwgTkdDQ19DT05GSUdfRklMRU5BTUUpO1xuICAgIGlmICh0aGlzLmZzLmV4aXN0cyhjb25maWdGaWxlUGF0aCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdmVyc2lvblJhbmdlOiB2ZXJzaW9uIHx8ICcqJyxcbiAgICAgICAgICBlbnRyeVBvaW50czogdGhpcy5wcm9jZXNzRW50cnlQb2ludHMocGFja2FnZVBhdGgsIHRoaXMuZXZhbFNyY0ZpbGUoY29uZmlnRmlsZVBhdGgpKSxcbiAgICAgICAgfTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHBhY2thZ2UgY29uZmlndXJhdGlvbiBmaWxlIGF0IFwiJHtjb25maWdGaWxlUGF0aH1cIjogYCArIGUubWVzc2FnZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXZhbFNyY0ZpbGUoc3JjUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBhbnkge1xuICAgIGNvbnN0IHNyYyA9IHRoaXMuZnMucmVhZEZpbGUoc3JjUGF0aCk7XG4gICAgY29uc3QgdGhlRXhwb3J0cyA9IHt9O1xuICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICBtb2R1bGU6IHtleHBvcnRzOiB0aGVFeHBvcnRzfSxcbiAgICAgIGV4cG9ydHM6IHRoZUV4cG9ydHMsIHJlcXVpcmUsXG4gICAgICBfX2Rpcm5hbWU6IGRpcm5hbWUoc3JjUGF0aCksXG4gICAgICBfX2ZpbGVuYW1lOiBzcmNQYXRoXG4gICAgfTtcbiAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc3JjLCBzYW5kYm94LCB7ZmlsZW5hbWU6IHNyY1BhdGh9KTtcbiAgICByZXR1cm4gc2FuZGJveC5tb2R1bGUuZXhwb3J0cztcbiAgfVxuXG4gIHByaXZhdGUgcHJvY2Vzc0VudHJ5UG9pbnRzKHBhY2thZ2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcGFja2FnZUNvbmZpZzogTmdjY1BhY2thZ2VDb25maWcpOlxuICAgICAge1tlbnRyeVBvaW50UGF0aDogc3RyaW5nXTogTmdjY0VudHJ5UG9pbnRDb25maWc7fSB7XG4gICAgY29uc3QgcHJvY2Vzc2VkRW50cnlQb2ludHM6IHtbZW50cnlQb2ludFBhdGg6IHN0cmluZ106IE5nY2NFbnRyeVBvaW50Q29uZmlnO30gPSB7fTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5UG9pbnRQYXRoIGluIHBhY2thZ2VDb25maWcuZW50cnlQb2ludHMpIHtcbiAgICAgIC8vIENoYW5nZSB0aGUga2V5cyB0byBiZSBhYnNvbHV0ZSBwYXRoc1xuICAgICAgcHJvY2Vzc2VkRW50cnlQb2ludHNbcmVzb2x2ZShwYWNrYWdlUGF0aCwgZW50cnlQb2ludFBhdGgpXSA9XG4gICAgICAgICAgcGFja2FnZUNvbmZpZy5lbnRyeVBvaW50c1tlbnRyeVBvaW50UGF0aF07XG4gICAgfVxuICAgIHJldHVybiBwcm9jZXNzZWRFbnRyeVBvaW50cztcbiAgfVxuXG4gIHByaXZhdGUgc3BsaXRQYXRoQW5kVmVyc2lvbihwYWNrYWdlUGF0aEFuZFZlcnNpb246IHN0cmluZyk6IFtzdHJpbmcsIHN0cmluZ3x1bmRlZmluZWRdIHtcbiAgICBjb25zdCB2ZXJzaW9uSW5kZXggPSBwYWNrYWdlUGF0aEFuZFZlcnNpb24ubGFzdEluZGV4T2YoJ0AnKTtcbiAgICAvLyBOb3RlIHRoYXQgPiAwIGlzIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudCB0byBtYXRjaCBAIGF0IHRoZSBzdGFydCBvZiB0aGUgbGluZVxuICAgIC8vIHdoaWNoIGlzIHdoYXQgeW91IHdvdWxkIGhhdmUgd2l0aCBhIG5hbWVzcGFjZWQgcGFja2FnZSwgZS5nLiBgQGFuZ3VsYXIvY29tbW9uYC5cbiAgICByZXR1cm4gdmVyc2lvbkluZGV4ID4gMCA/XG4gICAgICAgIFtcbiAgICAgICAgICBwYWNrYWdlUGF0aEFuZFZlcnNpb24uc3Vic3RyaW5nKDAsIHZlcnNpb25JbmRleCksXG4gICAgICAgICAgcGFja2FnZVBhdGhBbmRWZXJzaW9uLnN1YnN0cmluZyh2ZXJzaW9uSW5kZXggKyAxKVxuICAgICAgICBdIDpcbiAgICAgICAgW3BhY2thZ2VQYXRoQW5kVmVyc2lvbiwgdW5kZWZpbmVkXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kU2F0aXNmYWN0b3J5VmVyc2lvbihcbiAgICBjb25maWdzOiBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnW10gfCB1bmRlZmluZWQsIHZlcnNpb246IHN0cmluZyB8IG51bGwpOiBWZXJzaW9uZWRQYWNrYWdlQ29uZmlnfFxuICAgIG51bGwge1xuICBpZiAoY29uZmlncyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKHZlcnNpb24gPT09IG51bGwpIHtcbiAgICAvLyBUaGUgcGFja2FnZSBoYXMgbm8gdmVyc2lvbiAoISkgLSBwZXJoYXBzIHRoZSBlbnRyeS1wb2ludCB3YXMgZnJvbSBhIGRlZXAgaW1wb3J0LCB3aGljaCBtYWRlXG4gICAgLy8gaXQgaW1wb3NzaWJsZSB0byBmaW5kIHRoZSBwYWNrYWdlLmpzb24uXG4gICAgLy8gU28ganVzdCByZXR1cm4gdGhlIGZpcnN0IGNvbmZpZyB0aGF0IG1hdGNoZXMgdGhlIHBhY2thZ2UgbmFtZS5cbiAgICByZXR1cm4gY29uZmlnc1swXTtcbiAgfVxuICByZXR1cm4gY29uZmlncy5maW5kKGNvbmZpZyA9PiBzYXRpc2ZpZXModmVyc2lvbiwgY29uZmlnLnZlcnNpb25SYW5nZSkpIHx8IG51bGw7XG59XG4iXX0=