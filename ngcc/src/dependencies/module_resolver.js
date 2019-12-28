(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/module_resolver", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/utils"], factory);
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
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/utils");
    /**
     * This is a very cut-down implementation of the TypeScript module resolution strategy.
     *
     * It is specific to the needs of ngcc and is not intended to be a drop-in replacement
     * for the TS module resolver. It is used to compute the dependencies between entry-points
     * that may be compiled by ngcc.
     *
     * The algorithm only finds `.js` files for internal/relative imports and paths to
     * the folder containing the `package.json` of the entry-point for external imports.
     *
     * It can cope with nested `node_modules` folders and also supports `paths`/`baseUrl`
     * configuration properties, as provided in a `ts.CompilerOptions` object.
     */
    var ModuleResolver = /** @class */ (function () {
        function ModuleResolver(fs, pathMappings, relativeExtensions) {
            if (relativeExtensions === void 0) { relativeExtensions = [
                '', '.js', '/index.js'
            ]; }
            this.fs = fs;
            this.relativeExtensions = relativeExtensions;
            this.pathMappings = pathMappings ? this.processPathMappings(pathMappings) : [];
        }
        /**
         * Resolve an absolute path for the `moduleName` imported into a file at `fromPath`.
         * @param moduleName The name of the import to resolve.
         * @param fromPath The path to the file containing the import.
         * @returns A path to the resolved module or null if missing.
         * Specifically:
         *  * the absolute path to the package.json of an external module
         *  * a JavaScript file of an internal module
         *  * null if none exists.
         */
        ModuleResolver.prototype.resolveModuleImport = function (moduleName, fromPath) {
            if (utils_1.isRelativePath(moduleName)) {
                return this.resolveAsRelativePath(moduleName, fromPath);
            }
            else {
                return this.pathMappings.length && this.resolveByPathMappings(moduleName, fromPath) ||
                    this.resolveAsEntryPoint(moduleName, fromPath);
            }
        };
        /**
         * Convert the `pathMappings` into a collection of `PathMapper` functions.
         */
        ModuleResolver.prototype.processPathMappings = function (pathMappings) {
            var baseUrl = file_system_1.absoluteFrom(pathMappings.baseUrl);
            return Object.keys(pathMappings.paths).map(function (pathPattern) {
                var matcher = splitOnStar(pathPattern);
                var templates = pathMappings.paths[pathPattern].map(splitOnStar);
                return { matcher: matcher, templates: templates, baseUrl: baseUrl };
            });
        };
        /**
         * Try to resolve a module name, as a relative path, from the `fromPath`.
         *
         * As it is relative, it only looks for files that end in one of the `relativeExtensions`.
         * For example: `${moduleName}.js` or `${moduleName}/index.js`.
         * If neither of these files exist then the method returns `null`.
         */
        ModuleResolver.prototype.resolveAsRelativePath = function (moduleName, fromPath) {
            var resolvedPath = utils_1.resolveFileWithPostfixes(this.fs, file_system_1.resolve(file_system_1.dirname(fromPath), moduleName), this.relativeExtensions);
            return resolvedPath && new ResolvedRelativeModule(resolvedPath);
        };
        /**
         * Try to resolve the `moduleName`, by applying the computed `pathMappings` and
         * then trying to resolve the mapped path as a relative or external import.
         *
         * Whether the mapped path is relative is defined as it being "below the `fromPath`" and not
         * containing `node_modules`.
         *
         * If the mapped path is not relative but does not resolve to an external entry-point, then we
         * check whether it would have resolved to a relative path, in which case it is marked as a
         * "deep-import".
         */
        ModuleResolver.prototype.resolveByPathMappings = function (moduleName, fromPath) {
            var e_1, _a;
            var mappedPaths = this.findMappedPaths(moduleName);
            if (mappedPaths.length > 0) {
                var packagePath = this.findPackagePath(fromPath);
                if (packagePath !== null) {
                    try {
                        for (var mappedPaths_1 = tslib_1.__values(mappedPaths), mappedPaths_1_1 = mappedPaths_1.next(); !mappedPaths_1_1.done; mappedPaths_1_1 = mappedPaths_1.next()) {
                            var mappedPath = mappedPaths_1_1.value;
                            if (this.isEntryPoint(mappedPath)) {
                                return new ResolvedExternalModule(mappedPath);
                            }
                            var nonEntryPointImport = this.resolveAsRelativePath(mappedPath, fromPath);
                            if (nonEntryPointImport !== null) {
                                return isRelativeImport(packagePath, mappedPath) ? nonEntryPointImport :
                                    new ResolvedDeepImport(mappedPath);
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (mappedPaths_1_1 && !mappedPaths_1_1.done && (_a = mappedPaths_1.return)) _a.call(mappedPaths_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            }
            return null;
        };
        /**
         * Try to resolve the `moduleName` as an external entry-point by searching the `node_modules`
         * folders up the tree for a matching `.../node_modules/${moduleName}`.
         *
         * If a folder is found but the path does not contain a `package.json` then it is marked as a
         * "deep-import".
         */
        ModuleResolver.prototype.resolveAsEntryPoint = function (moduleName, fromPath) {
            var folder = fromPath;
            while (!file_system_1.isRoot(folder)) {
                folder = file_system_1.dirname(folder);
                if (folder.endsWith('node_modules')) {
                    // Skip up if the folder already ends in node_modules
                    folder = file_system_1.dirname(folder);
                }
                var modulePath = file_system_1.resolve(folder, 'node_modules', moduleName);
                if (this.isEntryPoint(modulePath)) {
                    return new ResolvedExternalModule(modulePath);
                }
                else if (this.resolveAsRelativePath(modulePath, fromPath)) {
                    return new ResolvedDeepImport(modulePath);
                }
            }
            return null;
        };
        /**
         * Can we consider the given path as an entry-point to a package?
         *
         * This is achieved by checking for the existence of `${modulePath}/package.json`.
         */
        ModuleResolver.prototype.isEntryPoint = function (modulePath) {
            return this.fs.exists(file_system_1.join(modulePath, 'package.json'));
        };
        /**
         * Apply the `pathMappers` to the `moduleName` and return all the possible
         * paths that match.
         *
         * The mapped path is computed for each template in `mapping.templates` by
         * replacing the `matcher.prefix` and `matcher.postfix` strings in `path with the
         * `template.prefix` and `template.postfix` strings.
         */
        ModuleResolver.prototype.findMappedPaths = function (moduleName) {
            var _this = this;
            var matches = this.pathMappings.map(function (mapping) { return _this.matchMapping(moduleName, mapping); });
            var bestMapping;
            var bestMatch;
            for (var index = 0; index < this.pathMappings.length; index++) {
                var mapping = this.pathMappings[index];
                var match = matches[index];
                if (match !== null) {
                    // If this mapping had no wildcard then this must be a complete match.
                    if (!mapping.matcher.hasWildcard) {
                        bestMatch = match;
                        bestMapping = mapping;
                        break;
                    }
                    // The best matched mapping is the one with the longest prefix.
                    if (!bestMapping || mapping.matcher.prefix > bestMapping.matcher.prefix) {
                        bestMatch = match;
                        bestMapping = mapping;
                    }
                }
            }
            return (bestMapping !== undefined && bestMatch !== undefined) ?
                this.computeMappedTemplates(bestMapping, bestMatch) :
                [];
        };
        /**
         * Attempt to find a mapped path for the given `path` and a `mapping`.
         *
         * The `path` matches the `mapping` if if it starts with `matcher.prefix` and ends with
         * `matcher.postfix`.
         *
         * @returns the wildcard segment of a matched `path`, or `null` if no match.
         */
        ModuleResolver.prototype.matchMapping = function (path, mapping) {
            var _a = mapping.matcher, prefix = _a.prefix, postfix = _a.postfix, hasWildcard = _a.hasWildcard;
            if (hasWildcard) {
                return (path.startsWith(prefix) && path.endsWith(postfix)) ?
                    path.substring(prefix.length, path.length - postfix.length) :
                    null;
            }
            else {
                return (path === prefix) ? '' : null;
            }
        };
        /**
         * Compute the candidate paths from the given mapping's templates using the matched
         * string.
         */
        ModuleResolver.prototype.computeMappedTemplates = function (mapping, match) {
            return mapping.templates.map(function (template) { return file_system_1.resolve(mapping.baseUrl, template.prefix + match + template.postfix); });
        };
        /**
         * Search up the folder tree for the first folder that contains `package.json`
         * or `null` if none is found.
         */
        ModuleResolver.prototype.findPackagePath = function (path) {
            var folder = path;
            while (!file_system_1.isRoot(folder)) {
                folder = file_system_1.dirname(folder);
                if (this.fs.exists(file_system_1.join(folder, 'package.json'))) {
                    return folder;
                }
            }
            return null;
        };
        return ModuleResolver;
    }());
    exports.ModuleResolver = ModuleResolver;
    /**
     * A module that is external to the package doing the importing.
     * In this case we capture the folder containing the entry-point.
     */
    var ResolvedExternalModule = /** @class */ (function () {
        function ResolvedExternalModule(entryPointPath) {
            this.entryPointPath = entryPointPath;
        }
        return ResolvedExternalModule;
    }());
    exports.ResolvedExternalModule = ResolvedExternalModule;
    /**
     * A module that is relative to the module doing the importing, and so internal to the
     * source module's package.
     */
    var ResolvedRelativeModule = /** @class */ (function () {
        function ResolvedRelativeModule(modulePath) {
            this.modulePath = modulePath;
        }
        return ResolvedRelativeModule;
    }());
    exports.ResolvedRelativeModule = ResolvedRelativeModule;
    /**
     * A module that is external to the package doing the importing but pointing to a
     * module that is deep inside a package, rather than to an entry-point of the package.
     */
    var ResolvedDeepImport = /** @class */ (function () {
        function ResolvedDeepImport(importPath) {
            this.importPath = importPath;
        }
        return ResolvedDeepImport;
    }());
    exports.ResolvedDeepImport = ResolvedDeepImport;
    function splitOnStar(str) {
        var _a = tslib_1.__read(str.split('*', 2), 2), prefix = _a[0], postfix = _a[1];
        return { prefix: prefix, postfix: postfix || '', hasWildcard: postfix !== undefined };
    }
    function isRelativeImport(from, to) {
        return to.startsWith(from) && !to.includes('node_modules');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3Jlc29sdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXdIO0lBQ3hILDhEQUFnRjtJQUVoRjs7Ozs7Ozs7Ozs7O09BWUc7SUFDSDtRQUdFLHdCQUFvQixFQUFjLEVBQUUsWUFBMkIsRUFBVSxrQkFFeEU7WUFGd0UsbUNBQUEsRUFBQTtnQkFDdkUsRUFBRSxFQUFFLEtBQUssRUFBRSxXQUFXO2FBQ3ZCO1lBRm1CLE9BQUUsR0FBRixFQUFFLENBQVk7WUFBdUMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUUxRjtZQUNDLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNqRixDQUFDO1FBRUQ7Ozs7Ozs7OztXQVNHO1FBQ0gsNENBQW1CLEdBQW5CLFVBQW9CLFVBQWtCLEVBQUUsUUFBd0I7WUFDOUQsSUFBSSxzQkFBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUM5QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDekQ7aUJBQU07Z0JBQ0wsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQztvQkFDL0UsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUNwRDtRQUNILENBQUM7UUFFRDs7V0FFRztRQUNLLDRDQUFtQixHQUEzQixVQUE0QixZQUEwQjtZQUNwRCxJQUFNLE9B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LENBQUM7SUFjRCxTQUFTLGdCQUFnQixDQUFDLElBQW9CLEVBQUUsRUFBa0I7UUFDaEUsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUM3RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgYWJzb2x1dGVGcm9tLCBkaXJuYW1lLCBpc1Jvb3QsIGpvaW4sIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1BhdGhNYXBwaW5ncywgaXNSZWxhdGl2ZVBhdGgsIHJlc29sdmVGaWxlV2l0aFBvc3RmaXhlc30gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFRoaXMgaXMgYSB2ZXJ5IGN1dC1kb3duIGltcGxlbWVudGF0aW9uIG9mIHRoZSBUeXBlU2NyaXB0IG1vZHVsZSByZXNvbHV0aW9uIHN0cmF0ZWd5LlxuICpcbiAqIEl0IGlzIHNwZWNpZmljIHRvIHRoZSBuZWVkcyBvZiBuZ2NjIGFuZCBpcyBub3QgaW50ZW5kZWQgdG8gYmUgYSBkcm9wLWluIHJlcGxhY2VtZW50XG4gKiBmb3IgdGhlIFRTIG1vZHVsZSByZXNvbHZlci4gSXQgaXMgdXNlZCB0byBjb21wdXRlIHRoZSBkZXBlbmRlbmNpZXMgYmV0d2VlbiBlbnRyeS1wb2ludHNcbiAqIHRoYXQgbWF5IGJlIGNvbXBpbGVkIGJ5IG5nY2MuXG4gKlxuICogVGhlIGFsZ29yaXRobSBvbmx5IGZpbmRzIGAuanNgIGZpbGVzIGZvciBpbnRlcm5hbC9yZWxhdGl2ZSBpbXBvcnRzIGFuZCBwYXRocyB0b1xuICogdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBgcGFja2FnZS5qc29uYCBvZiB0aGUgZW50cnktcG9pbnQgZm9yIGV4dGVybmFsIGltcG9ydHMuXG4gKlxuICogSXQgY2FuIGNvcGUgd2l0aCBuZXN0ZWQgYG5vZGVfbW9kdWxlc2AgZm9sZGVycyBhbmQgYWxzbyBzdXBwb3J0cyBgcGF0aHNgL2BiYXNlVXJsYFxuICogY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBhcyBwcm92aWRlZCBpbiBhIGB0cy5Db21waWxlck9wdGlvbnNgIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNsYXNzIE1vZHVsZVJlc29sdmVyIHtcbiAgcHJpdmF0ZSBwYXRoTWFwcGluZ3M6IFByb2Nlc3NlZFBhdGhNYXBwaW5nW107XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzLCBwcml2YXRlIHJlbGF0aXZlRXh0ZW5zaW9ucyA9IFtcbiAgICAnJywgJy5qcycsICcvaW5kZXguanMnXG4gIF0pIHtcbiAgICB0aGlzLnBhdGhNYXBwaW5ncyA9IHBhdGhNYXBwaW5ncyA/IHRoaXMucHJvY2Vzc1BhdGhNYXBwaW5ncyhwYXRoTWFwcGluZ3MpIDogW107XG4gIH1cblxuICAvKipcbiAgICogUmVzb2x2ZSBhbiBhYnNvbHV0ZSBwYXRoIGZvciB0aGUgYG1vZHVsZU5hbWVgIGltcG9ydGVkIGludG8gYSBmaWxlIGF0IGBmcm9tUGF0aGAuXG4gICAqIEBwYXJhbSBtb2R1bGVOYW1lIFRoZSBuYW1lIG9mIHRoZSBpbXBvcnQgdG8gcmVzb2x2ZS5cbiAgICogQHBhcmFtIGZyb21QYXRoIFRoZSBwYXRoIHRvIHRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGltcG9ydC5cbiAgICogQHJldHVybnMgQSBwYXRoIHRvIHRoZSByZXNvbHZlZCBtb2R1bGUgb3IgbnVsbCBpZiBtaXNzaW5nLlxuICAgKiBTcGVjaWZpY2FsbHk6XG4gICAqICAqIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlLmpzb24gb2YgYW4gZXh0ZXJuYWwgbW9kdWxlXG4gICAqICAqIGEgSmF2YVNjcmlwdCBmaWxlIG9mIGFuIGludGVybmFsIG1vZHVsZVxuICAgKiAgKiBudWxsIGlmIG5vbmUgZXhpc3RzLlxuICAgKi9cbiAgcmVzb2x2ZU1vZHVsZUltcG9ydChtb2R1bGVOYW1lOiBzdHJpbmcsIGZyb21QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFJlc29sdmVkTW9kdWxlfG51bGwge1xuICAgIGlmIChpc1JlbGF0aXZlUGF0aChtb2R1bGVOYW1lKSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUFzUmVsYXRpdmVQYXRoKG1vZHVsZU5hbWUsIGZyb21QYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMucGF0aE1hcHBpbmdzLmxlbmd0aCAmJiB0aGlzLnJlc29sdmVCeVBhdGhNYXBwaW5ncyhtb2R1bGVOYW1lLCBmcm9tUGF0aCkgfHxcbiAgICAgICAgICB0aGlzLnJlc29sdmVBc0VudHJ5UG9pbnQobW9kdWxlTmFtZSwgZnJvbVBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IHRoZSBgcGF0aE1hcHBpbmdzYCBpbnRvIGEgY29sbGVjdGlvbiBvZiBgUGF0aE1hcHBlcmAgZnVuY3Rpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBwcm9jZXNzUGF0aE1hcHBpbmdzKHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzKTogUHJvY2Vzc2VkUGF0aE1hcHBpbmdbXSB7XG4gICAgY29uc3QgYmFzZVVybCA9IGFic29sdXRlRnJvbShwYXRoTWFwcGluZ3MuYmFzZVVybCk7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhdGhNYXBwaW5ncy5wYXRocykubWFwKHBhdGhQYXR0ZXJuID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBzcGxpdE9uU3RhcihwYXRoUGF0dGVybik7XG4gICAgICBjb25zdCB0ZW1wbGF0ZXMgPSBwYXRoTWFwcGluZ3MucGF0aHNbcGF0aFBhdHRlcm5dLm1hcChzcGxpdE9uU3Rhcik7XG4gICAgICByZXR1cm4ge21hdGNoZXIsIHRlbXBsYXRlcywgYmFzZVVybH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJlc29sdmUgYSBtb2R1bGUgbmFtZSwgYXMgYSByZWxhdGl2ZSBwYXRoLCBmcm9tIHRoZSBgZnJvbVBhdGhgLlxuICAgKlxuICAgKiBBcyBpdCBpcyByZWxhdGl2ZSwgaXQgb25seSBsb29rcyBmb3IgZmlsZXMgdGhhdCBlbmQgaW4gb25lIG9mIHRoZSBgcmVsYXRpdmVFeHRlbnNpb25zYC5cbiAgICogRm9yIGV4YW1wbGU6IGAke21vZHVsZU5hbWV9LmpzYCBvciBgJHttb2R1bGVOYW1lfS9pbmRleC5qc2AuXG4gICAqIElmIG5laXRoZXIgb2YgdGhlc2UgZmlsZXMgZXhpc3QgdGhlbiB0aGUgbWV0aG9kIHJldHVybnMgYG51bGxgLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlQXNSZWxhdGl2ZVBhdGgobW9kdWxlTmFtZTogc3RyaW5nLCBmcm9tUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBSZXNvbHZlZE1vZHVsZXxudWxsIHtcbiAgICBjb25zdCByZXNvbHZlZFBhdGggPSByZXNvbHZlRmlsZVdpdGhQb3N0Zml4ZXMoXG4gICAgICAgIHRoaXMuZnMsIHJlc29sdmUoZGlybmFtZShmcm9tUGF0aCksIG1vZHVsZU5hbWUpLCB0aGlzLnJlbGF0aXZlRXh0ZW5zaW9ucyk7XG4gICAgcmV0dXJuIHJlc29sdmVkUGF0aCAmJiBuZXcgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZShyZXNvbHZlZFBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byByZXNvbHZlIHRoZSBgbW9kdWxlTmFtZWAsIGJ5IGFwcGx5aW5nIHRoZSBjb21wdXRlZCBgcGF0aE1hcHBpbmdzYCBhbmRcbiAgICogdGhlbiB0cnlpbmcgdG8gcmVzb2x2ZSB0aGUgbWFwcGVkIHBhdGggYXMgYSByZWxhdGl2ZSBvciBleHRlcm5hbCBpbXBvcnQuXG4gICAqXG4gICAqIFdoZXRoZXIgdGhlIG1hcHBlZCBwYXRoIGlzIHJlbGF0aXZlIGlzIGRlZmluZWQgYXMgaXQgYmVpbmcgXCJiZWxvdyB0aGUgYGZyb21QYXRoYFwiIGFuZCBub3RcbiAgICogY29udGFpbmluZyBgbm9kZV9tb2R1bGVzYC5cbiAgICpcbiAgICogSWYgdGhlIG1hcHBlZCBwYXRoIGlzIG5vdCByZWxhdGl2ZSBidXQgZG9lcyBub3QgcmVzb2x2ZSB0byBhbiBleHRlcm5hbCBlbnRyeS1wb2ludCwgdGhlbiB3ZVxuICAgKiBjaGVjayB3aGV0aGVyIGl0IHdvdWxkIGhhdmUgcmVzb2x2ZWQgdG8gYSByZWxhdGl2ZSBwYXRoLCBpbiB3aGljaCBjYXNlIGl0IGlzIG1hcmtlZCBhcyBhXG4gICAqIFwiZGVlcC1pbXBvcnRcIi5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZUJ5UGF0aE1hcHBpbmdzKG1vZHVsZU5hbWU6IHN0cmluZywgZnJvbVBhdGg6IEFic29sdXRlRnNQYXRoKTogUmVzb2x2ZWRNb2R1bGV8bnVsbCB7XG4gICAgY29uc3QgbWFwcGVkUGF0aHMgPSB0aGlzLmZpbmRNYXBwZWRQYXRocyhtb2R1bGVOYW1lKTtcbiAgICBpZiAobWFwcGVkUGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgcGFja2FnZVBhdGggPSB0aGlzLmZpbmRQYWNrYWdlUGF0aChmcm9tUGF0aCk7XG4gICAgICBpZiAocGFja2FnZVBhdGggIT09IG51bGwpIHtcbiAgICAgICAgZm9yIChjb25zdCBtYXBwZWRQYXRoIG9mIG1hcHBlZFBhdGhzKSB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNFbnRyeVBvaW50KG1hcHBlZFBhdGgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkRXh0ZXJuYWxNb2R1bGUobWFwcGVkUGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG5vbkVudHJ5UG9pbnRJbXBvcnQgPSB0aGlzLnJlc29sdmVBc1JlbGF0aXZlUGF0aChtYXBwZWRQYXRoLCBmcm9tUGF0aCk7XG4gICAgICAgICAgaWYgKG5vbkVudHJ5UG9pbnRJbXBvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBpc1JlbGF0aXZlSW1wb3J0KHBhY2thZ2VQYXRoLCBtYXBwZWRQYXRoKSA/IG5vbkVudHJ5UG9pbnRJbXBvcnQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFJlc29sdmVkRGVlcEltcG9ydChtYXBwZWRQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJlc29sdmUgdGhlIGBtb2R1bGVOYW1lYCBhcyBhbiBleHRlcm5hbCBlbnRyeS1wb2ludCBieSBzZWFyY2hpbmcgdGhlIGBub2RlX21vZHVsZXNgXG4gICAqIGZvbGRlcnMgdXAgdGhlIHRyZWUgZm9yIGEgbWF0Y2hpbmcgYC4uLi9ub2RlX21vZHVsZXMvJHttb2R1bGVOYW1lfWAuXG4gICAqXG4gICAqIElmIGEgZm9sZGVyIGlzIGZvdW5kIGJ1dCB0aGUgcGF0aCBkb2VzIG5vdCBjb250YWluIGEgYHBhY2thZ2UuanNvbmAgdGhlbiBpdCBpcyBtYXJrZWQgYXMgYVxuICAgKiBcImRlZXAtaW1wb3J0XCIuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVBc0VudHJ5UG9pbnQobW9kdWxlTmFtZTogc3RyaW5nLCBmcm9tUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBSZXNvbHZlZE1vZHVsZXxudWxsIHtcbiAgICBsZXQgZm9sZGVyID0gZnJvbVBhdGg7XG4gICAgd2hpbGUgKCFpc1Jvb3QoZm9sZGVyKSkge1xuICAgICAgZm9sZGVyID0gZGlybmFtZShmb2xkZXIpO1xuICAgICAgaWYgKGZvbGRlci5lbmRzV2l0aCgnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgLy8gU2tpcCB1cCBpZiB0aGUgZm9sZGVyIGFscmVhZHkgZW5kcyBpbiBub2RlX21vZHVsZXNcbiAgICAgICAgZm9sZGVyID0gZGlybmFtZShmb2xkZXIpO1xuICAgICAgfVxuICAgICAgY29uc3QgbW9kdWxlUGF0aCA9IHJlc29sdmUoZm9sZGVyLCAnbm9kZV9tb2R1bGVzJywgbW9kdWxlTmFtZSk7XG4gICAgICBpZiAodGhpcy5pc0VudHJ5UG9pbnQobW9kdWxlUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNvbHZlZEV4dGVybmFsTW9kdWxlKG1vZHVsZVBhdGgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnJlc29sdmVBc1JlbGF0aXZlUGF0aChtb2R1bGVQYXRoLCBmcm9tUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNvbHZlZERlZXBJbXBvcnQobW9kdWxlUGF0aCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuICAvKipcbiAgICogQ2FuIHdlIGNvbnNpZGVyIHRoZSBnaXZlbiBwYXRoIGFzIGFuIGVudHJ5LXBvaW50IHRvIGEgcGFja2FnZT9cbiAgICpcbiAgICogVGhpcyBpcyBhY2hpZXZlZCBieSBjaGVja2luZyBmb3IgdGhlIGV4aXN0ZW5jZSBvZiBgJHttb2R1bGVQYXRofS9wYWNrYWdlLmpzb25gLlxuICAgKi9cbiAgcHJpdmF0ZSBpc0VudHJ5UG9pbnQobW9kdWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5mcy5leGlzdHMoam9pbihtb2R1bGVQYXRoLCAncGFja2FnZS5qc29uJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGx5IHRoZSBgcGF0aE1hcHBlcnNgIHRvIHRoZSBgbW9kdWxlTmFtZWAgYW5kIHJldHVybiBhbGwgdGhlIHBvc3NpYmxlXG4gICAqIHBhdGhzIHRoYXQgbWF0Y2guXG4gICAqXG4gICAqIFRoZSBtYXBwZWQgcGF0aCBpcyBjb21wdXRlZCBmb3IgZWFjaCB0ZW1wbGF0ZSBpbiBgbWFwcGluZy50ZW1wbGF0ZXNgIGJ5XG4gICAqIHJlcGxhY2luZyB0aGUgYG1hdGNoZXIucHJlZml4YCBhbmQgYG1hdGNoZXIucG9zdGZpeGAgc3RyaW5ncyBpbiBgcGF0aCB3aXRoIHRoZVxuICAgKiBgdGVtcGxhdGUucHJlZml4YCBhbmQgYHRlbXBsYXRlLnBvc3RmaXhgIHN0cmluZ3MuXG4gICAqL1xuICBwcml2YXRlIGZpbmRNYXBwZWRQYXRocyhtb2R1bGVOYW1lOiBzdHJpbmcpOiBBYnNvbHV0ZUZzUGF0aFtdIHtcbiAgICBjb25zdCBtYXRjaGVzID0gdGhpcy5wYXRoTWFwcGluZ3MubWFwKG1hcHBpbmcgPT4gdGhpcy5tYXRjaE1hcHBpbmcobW9kdWxlTmFtZSwgbWFwcGluZykpO1xuXG4gICAgbGV0IGJlc3RNYXBwaW5nOiBQcm9jZXNzZWRQYXRoTWFwcGluZ3x1bmRlZmluZWQ7XG4gICAgbGV0IGJlc3RNYXRjaDogc3RyaW5nfHVuZGVmaW5lZDtcblxuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCB0aGlzLnBhdGhNYXBwaW5ncy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnBhdGhNYXBwaW5nc1tpbmRleF07XG4gICAgICBjb25zdCBtYXRjaCA9IG1hdGNoZXNbaW5kZXhdO1xuICAgICAgaWYgKG1hdGNoICE9PSBudWxsKSB7XG4gICAgICAgIC8vIElmIHRoaXMgbWFwcGluZyBoYWQgbm8gd2lsZGNhcmQgdGhlbiB0aGlzIG11c3QgYmUgYSBjb21wbGV0ZSBtYXRjaC5cbiAgICAgICAgaWYgKCFtYXBwaW5nLm1hdGNoZXIuaGFzV2lsZGNhcmQpIHtcbiAgICAgICAgICBiZXN0TWF0Y2ggPSBtYXRjaDtcbiAgICAgICAgICBiZXN0TWFwcGluZyA9IG1hcHBpbmc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlIGJlc3QgbWF0Y2hlZCBtYXBwaW5nIGlzIHRoZSBvbmUgd2l0aCB0aGUgbG9uZ2VzdCBwcmVmaXguXG4gICAgICAgIGlmICghYmVzdE1hcHBpbmcgfHwgbWFwcGluZy5tYXRjaGVyLnByZWZpeCA+IGJlc3RNYXBwaW5nLm1hdGNoZXIucHJlZml4KSB7XG4gICAgICAgICAgYmVzdE1hdGNoID0gbWF0Y2g7XG4gICAgICAgICAgYmVzdE1hcHBpbmcgPSBtYXBwaW5nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIChiZXN0TWFwcGluZyAhPT0gdW5kZWZpbmVkICYmIGJlc3RNYXRjaCAhPT0gdW5kZWZpbmVkKSA/XG4gICAgICAgIHRoaXMuY29tcHV0ZU1hcHBlZFRlbXBsYXRlcyhiZXN0TWFwcGluZywgYmVzdE1hdGNoKSA6XG4gICAgICAgIFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gZmluZCBhIG1hcHBlZCBwYXRoIGZvciB0aGUgZ2l2ZW4gYHBhdGhgIGFuZCBhIGBtYXBwaW5nYC5cbiAgICpcbiAgICogVGhlIGBwYXRoYCBtYXRjaGVzIHRoZSBgbWFwcGluZ2AgaWYgaWYgaXQgc3RhcnRzIHdpdGggYG1hdGNoZXIucHJlZml4YCBhbmQgZW5kcyB3aXRoXG4gICAqIGBtYXRjaGVyLnBvc3RmaXhgLlxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgd2lsZGNhcmQgc2VnbWVudCBvZiBhIG1hdGNoZWQgYHBhdGhgLCBvciBgbnVsbGAgaWYgbm8gbWF0Y2guXG4gICAqL1xuICBwcml2YXRlIG1hdGNoTWFwcGluZyhwYXRoOiBzdHJpbmcsIG1hcHBpbmc6IFByb2Nlc3NlZFBhdGhNYXBwaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHtwcmVmaXgsIHBvc3RmaXgsIGhhc1dpbGRjYXJkfSA9IG1hcHBpbmcubWF0Y2hlcjtcbiAgICBpZiAoaGFzV2lsZGNhcmQpIHtcbiAgICAgIHJldHVybiAocGF0aC5zdGFydHNXaXRoKHByZWZpeCkgJiYgcGF0aC5lbmRzV2l0aChwb3N0Zml4KSkgP1xuICAgICAgICAgIHBhdGguc3Vic3RyaW5nKHByZWZpeC5sZW5ndGgsIHBhdGgubGVuZ3RoIC0gcG9zdGZpeC5sZW5ndGgpIDpcbiAgICAgICAgICBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKHBhdGggPT09IHByZWZpeCkgPyAnJyA6IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGUgdGhlIGNhbmRpZGF0ZSBwYXRocyBmcm9tIHRoZSBnaXZlbiBtYXBwaW5nJ3MgdGVtcGxhdGVzIHVzaW5nIHRoZSBtYXRjaGVkXG4gICAqIHN0cmluZy5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZU1hcHBlZFRlbXBsYXRlcyhtYXBwaW5nOiBQcm9jZXNzZWRQYXRoTWFwcGluZywgbWF0Y2g6IHN0cmluZykge1xuICAgIHJldHVybiBtYXBwaW5nLnRlbXBsYXRlcy5tYXAoXG4gICAgICAgIHRlbXBsYXRlID0+IHJlc29sdmUobWFwcGluZy5iYXNlVXJsLCB0ZW1wbGF0ZS5wcmVmaXggKyBtYXRjaCArIHRlbXBsYXRlLnBvc3RmaXgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdXAgdGhlIGZvbGRlciB0cmVlIGZvciB0aGUgZmlyc3QgZm9sZGVyIHRoYXQgY29udGFpbnMgYHBhY2thZ2UuanNvbmBcbiAgICogb3IgYG51bGxgIGlmIG5vbmUgaXMgZm91bmQuXG4gICAqL1xuICBwcml2YXRlIGZpbmRQYWNrYWdlUGF0aChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRofG51bGwge1xuICAgIGxldCBmb2xkZXIgPSBwYXRoO1xuICAgIHdoaWxlICghaXNSb290KGZvbGRlcikpIHtcbiAgICAgIGZvbGRlciA9IGRpcm5hbWUoZm9sZGVyKTtcbiAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhqb2luKGZvbGRlciwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgICByZXR1cm4gZm9sZGVyO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKiogVGhlIHJlc3VsdCBvZiByZXNvbHZpbmcgYW4gaW1wb3J0IHRvIGEgbW9kdWxlLiAqL1xuZXhwb3J0IHR5cGUgUmVzb2x2ZWRNb2R1bGUgPSBSZXNvbHZlZEV4dGVybmFsTW9kdWxlIHwgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZSB8IFJlc29sdmVkRGVlcEltcG9ydDtcblxuLyoqXG4gKiBBIG1vZHVsZSB0aGF0IGlzIGV4dGVybmFsIHRvIHRoZSBwYWNrYWdlIGRvaW5nIHRoZSBpbXBvcnRpbmcuXG4gKiBJbiB0aGlzIGNhc2Ugd2UgY2FwdHVyZSB0aGUgZm9sZGVyIGNvbnRhaW5pbmcgdGhlIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZWRFeHRlcm5hbE1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpIHt9XG59XG5cbi8qKlxuICogQSBtb2R1bGUgdGhhdCBpcyByZWxhdGl2ZSB0byB0aGUgbW9kdWxlIGRvaW5nIHRoZSBpbXBvcnRpbmcsIGFuZCBzbyBpbnRlcm5hbCB0byB0aGVcbiAqIHNvdXJjZSBtb2R1bGUncyBwYWNrYWdlLlxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBtb2R1bGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCkge31cbn1cblxuLyoqXG4gKiBBIG1vZHVsZSB0aGF0IGlzIGV4dGVybmFsIHRvIHRoZSBwYWNrYWdlIGRvaW5nIHRoZSBpbXBvcnRpbmcgYnV0IHBvaW50aW5nIHRvIGFcbiAqIG1vZHVsZSB0aGF0IGlzIGRlZXAgaW5zaWRlIGEgcGFja2FnZSwgcmF0aGVyIHRoYW4gdG8gYW4gZW50cnktcG9pbnQgb2YgdGhlIHBhY2thZ2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNvbHZlZERlZXBJbXBvcnQge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgaW1wb3J0UGF0aDogQWJzb2x1dGVGc1BhdGgpIHt9XG59XG5cbmZ1bmN0aW9uIHNwbGl0T25TdGFyKHN0cjogc3RyaW5nKTogUGF0aE1hcHBpbmdQYXR0ZXJuIHtcbiAgY29uc3QgW3ByZWZpeCwgcG9zdGZpeF0gPSBzdHIuc3BsaXQoJyonLCAyKTtcbiAgcmV0dXJuIHtwcmVmaXgsIHBvc3RmaXg6IHBvc3RmaXggfHwgJycsIGhhc1dpbGRjYXJkOiBwb3N0Zml4ICE9PSB1bmRlZmluZWR9O1xufVxuXG5pbnRlcmZhY2UgUHJvY2Vzc2VkUGF0aE1hcHBpbmcge1xuICBiYXNlVXJsOiBBYnNvbHV0ZUZzUGF0aDtcbiAgbWF0Y2hlcjogUGF0aE1hcHBpbmdQYXR0ZXJuO1xuICB0ZW1wbGF0ZXM6IFBhdGhNYXBwaW5nUGF0dGVybltdO1xufVxuXG5pbnRlcmZhY2UgUGF0aE1hcHBpbmdQYXR0ZXJuIHtcbiAgcHJlZml4OiBzdHJpbmc7XG4gIHBvc3RmaXg6IHN0cmluZztcbiAgaGFzV2lsZGNhcmQ6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIGlzUmVsYXRpdmVJbXBvcnQoZnJvbTogQWJzb2x1dGVGc1BhdGgsIHRvOiBBYnNvbHV0ZUZzUGF0aCkge1xuICByZXR1cm4gdG8uc3RhcnRzV2l0aChmcm9tKSAmJiAhdG8uaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpO1xufVxuIl19