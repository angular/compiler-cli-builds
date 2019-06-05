/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/module_resolver", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
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
                '.js', '/index.js'
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
            var baseUrl = path_1.AbsoluteFsPath.from(pathMappings.baseUrl);
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
            var resolvedPath = this.resolvePath(path_1.AbsoluteFsPath.resolve(path_1.AbsoluteFsPath.dirname(fromPath), moduleName), this.relativeExtensions);
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
                            var isRelative = mappedPath.startsWith(packagePath) && !mappedPath.includes('node_modules');
                            if (isRelative) {
                                return this.resolveAsRelativePath(mappedPath, fromPath);
                            }
                            else if (this.isEntryPoint(mappedPath)) {
                                return new ResolvedExternalModule(mappedPath);
                            }
                            else if (this.resolveAsRelativePath(mappedPath, fromPath)) {
                                return new ResolvedDeepImport(mappedPath);
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
            while (!path_1.AbsoluteFsPath.isRoot(folder)) {
                folder = path_1.AbsoluteFsPath.dirname(folder);
                if (folder.endsWith('node_modules')) {
                    // Skip up if the folder already ends in node_modules
                    folder = path_1.AbsoluteFsPath.dirname(folder);
                }
                var modulePath = path_1.AbsoluteFsPath.resolve(folder, 'node_modules', moduleName);
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
         * Attempt to resolve a `path` to a file by appending the provided `postFixes`
         * to the `path` and checking if the file exists on disk.
         * @returns An absolute path to the first matching existing file, or `null` if none exist.
         */
        ModuleResolver.prototype.resolvePath = function (path, postFixes) {
            var e_2, _a;
            try {
                for (var postFixes_1 = tslib_1.__values(postFixes), postFixes_1_1 = postFixes_1.next(); !postFixes_1_1.done; postFixes_1_1 = postFixes_1.next()) {
                    var postFix = postFixes_1_1.value;
                    var testPath = path_1.AbsoluteFsPath.fromUnchecked(path + postFix);
                    if (this.fs.exists(testPath)) {
                        return testPath;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (postFixes_1_1 && !postFixes_1_1.done && (_a = postFixes_1.return)) _a.call(postFixes_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return null;
        };
        /**
         * Can we consider the given path as an entry-point to a package?
         *
         * This is achieved by checking for the existence of `${modulePath}/package.json`.
         */
        ModuleResolver.prototype.isEntryPoint = function (modulePath) {
            return this.fs.exists(path_1.AbsoluteFsPath.join(modulePath, 'package.json'));
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
            return (bestMapping && bestMatch) ? this.computeMappedTemplates(bestMapping, bestMatch) : [];
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
            if (path.startsWith(prefix) && path.endsWith(postfix)) {
                return hasWildcard ? path.substring(prefix.length, path.length - postfix.length) : '';
            }
            return null;
        };
        /**
         * Compute the candidate paths from the given mapping's templates using the matched
         * string.
         */
        ModuleResolver.prototype.computeMappedTemplates = function (mapping, match) {
            return mapping.templates.map(function (template) {
                return path_1.AbsoluteFsPath.resolve(mapping.baseUrl, template.prefix + match + template.postfix);
            });
        };
        /**
         * Search up the folder tree for the first folder that contains `package.json`
         * or `null` if none is found.
         */
        ModuleResolver.prototype.findPackagePath = function (path) {
            var folder = path;
            while (!path_1.AbsoluteFsPath.isRoot(folder)) {
                folder = path_1.AbsoluteFsPath.dirname(folder);
                if (this.fs.exists(path_1.AbsoluteFsPath.join(folder, 'package.json'))) {
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3Jlc29sdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsNkRBQXVEO0lBRXZELDhEQUFzRDtJQUV0RDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSDtRQUdFLHdCQUFvQixFQUFjLEVBQUUsWUFBMkIsRUFBVSxrQkFFeEU7WUFGd0UsbUNBQUEsRUFBQTtnQkFDdkUsS0FBSyxFQUFFLFdBQVc7YUFDbkI7WUFGbUIsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUF1Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBRTFGO1lBQ0MsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2pGLENBQUM7UUFFRDs7Ozs7Ozs7O1dBU0c7UUFDSCw0Q0FBbUIsR0FBbkIsVUFBb0IsVUFBa0IsRUFBRSxRQUF3QjtZQUM5RCxJQUFJLHNCQUFjLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQzlCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN6RDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDO29CQUMvRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3BEO1FBQ0gsQ0FBQztRQUVEOztXQUVHO1FBQ0ssNENBQW1CLEdBQTNCLFVBQTRCLFlBQTBCO1lBQ3BELElBQU0sT0FBTyxHQUFHLHFC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RSxnQ0FBbUIsVUFBMEI7WUFBMUIsZUFBVSxHQUFWLFVBQVUsQ0FBZ0I7UUFBRyxDQUFDO1FBQ25ELDZCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSx3REFBc0I7SUFJbkM7OztPQUdHO0lBQ0g7UUFDRSw0QkFBbUIsVUFBMEI7WUFBMUIsZUFBVSxHQUFWLFVBQVUsQ0FBZ0I7UUFBRyxDQUFDO1FBQ25ELHlCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxnREFBa0I7SUFJL0IsU0FBUyxXQUFXLENBQUMsR0FBVztRQUN4QixJQUFBLHlDQUFxQyxFQUFwQyxjQUFNLEVBQUUsZUFBNEIsQ0FBQztRQUM1QyxPQUFPLEVBQUMsTUFBTSxRQUFBLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFFLEVBQUUsV0FBVyxFQUFFLE9BQU8sS0FBSyxTQUFTLEVBQUMsQ0FBQztJQUM5RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzLCBpc1JlbGF0aXZlUGF0aH0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFRoaXMgaXMgYSB2ZXJ5IGN1dC1kb3duIGltcGxlbWVudGF0aW9uIG9mIHRoZSBUeXBlU2NyaXB0IG1vZHVsZSByZXNvbHV0aW9uIHN0cmF0ZWd5LlxuICpcbiAqIEl0IGlzIHNwZWNpZmljIHRvIHRoZSBuZWVkcyBvZiBuZ2NjIGFuZCBpcyBub3QgaW50ZW5kZWQgdG8gYmUgYSBkcm9wLWluIHJlcGxhY2VtZW50XG4gKiBmb3IgdGhlIFRTIG1vZHVsZSByZXNvbHZlci4gSXQgaXMgdXNlZCB0byBjb21wdXRlIHRoZSBkZXBlbmRlbmNpZXMgYmV0d2VlbiBlbnRyeS1wb2ludHNcbiAqIHRoYXQgbWF5IGJlIGNvbXBpbGVkIGJ5IG5nY2MuXG4gKlxuICogVGhlIGFsZ29yaXRobSBvbmx5IGZpbmRzIGAuanNgIGZpbGVzIGZvciBpbnRlcm5hbC9yZWxhdGl2ZSBpbXBvcnRzIGFuZCBwYXRocyB0b1xuICogdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBgcGFja2FnZS5qc29uYCBvZiB0aGUgZW50cnktcG9pbnQgZm9yIGV4dGVybmFsIGltcG9ydHMuXG4gKlxuICogSXQgY2FuIGNvcGUgd2l0aCBuZXN0ZWQgYG5vZGVfbW9kdWxlc2AgZm9sZGVycyBhbmQgYWxzbyBzdXBwb3J0cyBgcGF0aHNgL2BiYXNlVXJsYFxuICogY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBhcyBwcm92aWRlZCBpbiBhIGB0cy5Db21waWxlck9wdGlvbnNgIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNsYXNzIE1vZHVsZVJlc29sdmVyIHtcbiAgcHJpdmF0ZSBwYXRoTWFwcGluZ3M6IFByb2Nlc3NlZFBhdGhNYXBwaW5nW107XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzLCBwcml2YXRlIHJlbGF0aXZlRXh0ZW5zaW9ucyA9IFtcbiAgICAnLmpzJywgJy9pbmRleC5qcydcbiAgXSkge1xuICAgIHRoaXMucGF0aE1hcHBpbmdzID0gcGF0aE1hcHBpbmdzID8gdGhpcy5wcm9jZXNzUGF0aE1hcHBpbmdzKHBhdGhNYXBwaW5ncykgOiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGFuIGFic29sdXRlIHBhdGggZm9yIHRoZSBgbW9kdWxlTmFtZWAgaW1wb3J0ZWQgaW50byBhIGZpbGUgYXQgYGZyb21QYXRoYC5cbiAgICogQHBhcmFtIG1vZHVsZU5hbWUgVGhlIG5hbWUgb2YgdGhlIGltcG9ydCB0byByZXNvbHZlLlxuICAgKiBAcGFyYW0gZnJvbVBhdGggVGhlIHBhdGggdG8gdGhlIGZpbGUgY29udGFpbmluZyB0aGUgaW1wb3J0LlxuICAgKiBAcmV0dXJucyBBIHBhdGggdG8gdGhlIHJlc29sdmVkIG1vZHVsZSBvciBudWxsIGlmIG1pc3NpbmcuXG4gICAqIFNwZWNpZmljYWxseTpcbiAgICogICogdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2UuanNvbiBvZiBhbiBleHRlcm5hbCBtb2R1bGVcbiAgICogICogYSBKYXZhU2NyaXB0IGZpbGUgb2YgYW4gaW50ZXJuYWwgbW9kdWxlXG4gICAqICAqIG51bGwgaWYgbm9uZSBleGlzdHMuXG4gICAqL1xuICByZXNvbHZlTW9kdWxlSW1wb3J0KG1vZHVsZU5hbWU6IHN0cmluZywgZnJvbVBhdGg6IEFic29sdXRlRnNQYXRoKTogUmVzb2x2ZWRNb2R1bGV8bnVsbCB7XG4gICAgaWYgKGlzUmVsYXRpdmVQYXRoKG1vZHVsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlQXNSZWxhdGl2ZVBhdGgobW9kdWxlTmFtZSwgZnJvbVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5wYXRoTWFwcGluZ3MubGVuZ3RoICYmIHRoaXMucmVzb2x2ZUJ5UGF0aE1hcHBpbmdzKG1vZHVsZU5hbWUsIGZyb21QYXRoKSB8fFxuICAgICAgICAgIHRoaXMucmVzb2x2ZUFzRW50cnlQb2ludChtb2R1bGVOYW1lLCBmcm9tUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgdGhlIGBwYXRoTWFwcGluZ3NgIGludG8gYSBjb2xsZWN0aW9uIG9mIGBQYXRoTWFwcGVyYCBmdW5jdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIHByb2Nlc3NQYXRoTWFwcGluZ3MocGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MpOiBQcm9jZXNzZWRQYXRoTWFwcGluZ1tdIHtcbiAgICBjb25zdCBiYXNlVXJsID0gQWJzb2x1dGVGc1BhdGguZnJvbShwYXRoTWFwcGluZ3MuYmFzZVVybCk7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhdGhNYXBwaW5ncy5wYXRocykubWFwKHBhdGhQYXR0ZXJuID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBzcGxpdE9uU3RhcihwYXRoUGF0dGVybik7XG4gICAgICBjb25zdCB0ZW1wbGF0ZXMgPSBwYXRoTWFwcGluZ3MucGF0aHNbcGF0aFBhdHRlcm5dLm1hcChzcGxpdE9uU3Rhcik7XG4gICAgICByZXR1cm4ge21hdGNoZXIsIHRlbXBsYXRlcywgYmFzZVVybH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJlc29sdmUgYSBtb2R1bGUgbmFtZSwgYXMgYSByZWxhdGl2ZSBwYXRoLCBmcm9tIHRoZSBgZnJvbVBhdGhgLlxuICAgKlxuICAgKiBBcyBpdCBpcyByZWxhdGl2ZSwgaXQgb25seSBsb29rcyBmb3IgZmlsZXMgdGhhdCBlbmQgaW4gb25lIG9mIHRoZSBgcmVsYXRpdmVFeHRlbnNpb25zYC5cbiAgICogRm9yIGV4YW1wbGU6IGAke21vZHVsZU5hbWV9LmpzYCBvciBgJHttb2R1bGVOYW1lfS9pbmRleC5qc2AuXG4gICAqIElmIG5laXRoZXIgb2YgdGhlc2UgZmlsZXMgZXhpc3QgdGhlbiB0aGUgbWV0aG9kIHJldHVybnMgYG51bGxgLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlQXNSZWxhdGl2ZVBhdGgobW9kdWxlTmFtZTogc3RyaW5nLCBmcm9tUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBSZXNvbHZlZE1vZHVsZXxudWxsIHtcbiAgICBjb25zdCByZXNvbHZlZFBhdGggPSB0aGlzLnJlc29sdmVQYXRoKFxuICAgICAgICBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKEFic29sdXRlRnNQYXRoLmRpcm5hbWUoZnJvbVBhdGgpLCBtb2R1bGVOYW1lKSxcbiAgICAgICAgdGhpcy5yZWxhdGl2ZUV4dGVuc2lvbnMpO1xuICAgIHJldHVybiByZXNvbHZlZFBhdGggJiYgbmV3IFJlc29sdmVkUmVsYXRpdmVNb2R1bGUocmVzb2x2ZWRQYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gcmVzb2x2ZSB0aGUgYG1vZHVsZU5hbWVgLCBieSBhcHBseWluZyB0aGUgY29tcHV0ZWQgYHBhdGhNYXBwaW5nc2AgYW5kXG4gICAqIHRoZW4gdHJ5aW5nIHRvIHJlc29sdmUgdGhlIG1hcHBlZCBwYXRoIGFzIGEgcmVsYXRpdmUgb3IgZXh0ZXJuYWwgaW1wb3J0LlxuICAgKlxuICAgKiBXaGV0aGVyIHRoZSBtYXBwZWQgcGF0aCBpcyByZWxhdGl2ZSBpcyBkZWZpbmVkIGFzIGl0IGJlaW5nIFwiYmVsb3cgdGhlIGBmcm9tUGF0aGBcIiBhbmQgbm90XG4gICAqIGNvbnRhaW5pbmcgYG5vZGVfbW9kdWxlc2AuXG4gICAqXG4gICAqIElmIHRoZSBtYXBwZWQgcGF0aCBpcyBub3QgcmVsYXRpdmUgYnV0IGRvZXMgbm90IHJlc29sdmUgdG8gYW4gZXh0ZXJuYWwgZW50cnktcG9pbnQsIHRoZW4gd2VcbiAgICogY2hlY2sgd2hldGhlciBpdCB3b3VsZCBoYXZlIHJlc29sdmVkIHRvIGEgcmVsYXRpdmUgcGF0aCwgaW4gd2hpY2ggY2FzZSBpdCBpcyBtYXJrZWQgYXMgYVxuICAgKiBcImRlZXAtaW1wb3J0XCIuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVCeVBhdGhNYXBwaW5ncyhtb2R1bGVOYW1lOiBzdHJpbmcsIGZyb21QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFJlc29sdmVkTW9kdWxlfG51bGwge1xuICAgIGNvbnN0IG1hcHBlZFBhdGhzID0gdGhpcy5maW5kTWFwcGVkUGF0aHMobW9kdWxlTmFtZSk7XG4gICAgaWYgKG1hcHBlZFBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gdGhpcy5maW5kUGFja2FnZVBhdGgoZnJvbVBhdGgpO1xuICAgICAgaWYgKHBhY2thZ2VQYXRoICE9PSBudWxsKSB7XG4gICAgICAgIGZvciAoY29uc3QgbWFwcGVkUGF0aCBvZiBtYXBwZWRQYXRocykge1xuICAgICAgICAgIGNvbnN0IGlzUmVsYXRpdmUgPVxuICAgICAgICAgICAgICBtYXBwZWRQYXRoLnN0YXJ0c1dpdGgocGFja2FnZVBhdGgpICYmICFtYXBwZWRQYXRoLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgICBpZiAoaXNSZWxhdGl2ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUFzUmVsYXRpdmVQYXRoKG1hcHBlZFBhdGgsIGZyb21QYXRoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbnRyeVBvaW50KG1hcHBlZFBhdGgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkRXh0ZXJuYWxNb2R1bGUobWFwcGVkUGF0aCk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnJlc29sdmVBc1JlbGF0aXZlUGF0aChtYXBwZWRQYXRoLCBmcm9tUGF0aCkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmVzb2x2ZWREZWVwSW1wb3J0KG1hcHBlZFBhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gcmVzb2x2ZSB0aGUgYG1vZHVsZU5hbWVgIGFzIGFuIGV4dGVybmFsIGVudHJ5LXBvaW50IGJ5IHNlYXJjaGluZyB0aGUgYG5vZGVfbW9kdWxlc2BcbiAgICogZm9sZGVycyB1cCB0aGUgdHJlZSBmb3IgYSBtYXRjaGluZyBgLi4uL25vZGVfbW9kdWxlcy8ke21vZHVsZU5hbWV9YC5cbiAgICpcbiAgICogSWYgYSBmb2xkZXIgaXMgZm91bmQgYnV0IHRoZSBwYXRoIGRvZXMgbm90IGNvbnRhaW4gYSBgcGFja2FnZS5qc29uYCB0aGVuIGl0IGlzIG1hcmtlZCBhcyBhXG4gICAqIFwiZGVlcC1pbXBvcnRcIi5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZUFzRW50cnlQb2ludChtb2R1bGVOYW1lOiBzdHJpbmcsIGZyb21QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFJlc29sdmVkTW9kdWxlfG51bGwge1xuICAgIGxldCBmb2xkZXIgPSBmcm9tUGF0aDtcbiAgICB3aGlsZSAoIUFic29sdXRlRnNQYXRoLmlzUm9vdChmb2xkZXIpKSB7XG4gICAgICBmb2xkZXIgPSBBYnNvbHV0ZUZzUGF0aC5kaXJuYW1lKGZvbGRlcik7XG4gICAgICBpZiAoZm9sZGVyLmVuZHNXaXRoKCdub2RlX21vZHVsZXMnKSkge1xuICAgICAgICAvLyBTa2lwIHVwIGlmIHRoZSBmb2xkZXIgYWxyZWFkeSBlbmRzIGluIG5vZGVfbW9kdWxlc1xuICAgICAgICBmb2xkZXIgPSBBYnNvbHV0ZUZzUGF0aC5kaXJuYW1lKGZvbGRlcik7XG4gICAgICB9XG4gICAgICBjb25zdCBtb2R1bGVQYXRoID0gQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShmb2xkZXIsICdub2RlX21vZHVsZXMnLCBtb2R1bGVOYW1lKTtcbiAgICAgIGlmICh0aGlzLmlzRW50cnlQb2ludChtb2R1bGVQYXRoKSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkRXh0ZXJuYWxNb2R1bGUobW9kdWxlUGF0aCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMucmVzb2x2ZUFzUmVsYXRpdmVQYXRoKG1vZHVsZVBhdGgsIGZyb21QYXRoKSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkRGVlcEltcG9ydChtb2R1bGVQYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCB0byByZXNvbHZlIGEgYHBhdGhgIHRvIGEgZmlsZSBieSBhcHBlbmRpbmcgdGhlIHByb3ZpZGVkIGBwb3N0Rml4ZXNgXG4gICAqIHRvIHRoZSBgcGF0aGAgYW5kIGNoZWNraW5nIGlmIHRoZSBmaWxlIGV4aXN0cyBvbiBkaXNrLlxuICAgKiBAcmV0dXJucyBBbiBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBmaXJzdCBtYXRjaGluZyBleGlzdGluZyBmaWxlLCBvciBgbnVsbGAgaWYgbm9uZSBleGlzdC5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZVBhdGgocGF0aDogQWJzb2x1dGVGc1BhdGgsIHBvc3RGaXhlczogc3RyaW5nW10pOiBBYnNvbHV0ZUZzUGF0aHxudWxsIHtcbiAgICBmb3IgKGNvbnN0IHBvc3RGaXggb2YgcG9zdEZpeGVzKSB7XG4gICAgICBjb25zdCB0ZXN0UGF0aCA9IEFic29sdXRlRnNQYXRoLmZyb21VbmNoZWNrZWQocGF0aCArIHBvc3RGaXgpO1xuICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKHRlc3RQYXRoKSkge1xuICAgICAgICByZXR1cm4gdGVzdFBhdGg7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbiB3ZSBjb25zaWRlciB0aGUgZ2l2ZW4gcGF0aCBhcyBhbiBlbnRyeS1wb2ludCB0byBhIHBhY2thZ2U/XG4gICAqXG4gICAqIFRoaXMgaXMgYWNoaWV2ZWQgYnkgY2hlY2tpbmcgZm9yIHRoZSBleGlzdGVuY2Ugb2YgYCR7bW9kdWxlUGF0aH0vcGFja2FnZS5qc29uYC5cbiAgICovXG4gIHByaXZhdGUgaXNFbnRyeVBvaW50KG1vZHVsZVBhdGg6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZnMuZXhpc3RzKEFic29sdXRlRnNQYXRoLmpvaW4obW9kdWxlUGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSB0aGUgYHBhdGhNYXBwZXJzYCB0byB0aGUgYG1vZHVsZU5hbWVgIGFuZCByZXR1cm4gYWxsIHRoZSBwb3NzaWJsZVxuICAgKiBwYXRocyB0aGF0IG1hdGNoLlxuICAgKlxuICAgKiBUaGUgbWFwcGVkIHBhdGggaXMgY29tcHV0ZWQgZm9yIGVhY2ggdGVtcGxhdGUgaW4gYG1hcHBpbmcudGVtcGxhdGVzYCBieVxuICAgKiByZXBsYWNpbmcgdGhlIGBtYXRjaGVyLnByZWZpeGAgYW5kIGBtYXRjaGVyLnBvc3RmaXhgIHN0cmluZ3MgaW4gYHBhdGggd2l0aCB0aGVcbiAgICogYHRlbXBsYXRlLnByZWZpeGAgYW5kIGB0ZW1wbGF0ZS5wb3N0Zml4YCBzdHJpbmdzLlxuICAgKi9cbiAgcHJpdmF0ZSBmaW5kTWFwcGVkUGF0aHMobW9kdWxlTmFtZTogc3RyaW5nKTogQWJzb2x1dGVGc1BhdGhbXSB7XG4gICAgY29uc3QgbWF0Y2hlcyA9IHRoaXMucGF0aE1hcHBpbmdzLm1hcChtYXBwaW5nID0+IHRoaXMubWF0Y2hNYXBwaW5nKG1vZHVsZU5hbWUsIG1hcHBpbmcpKTtcblxuICAgIGxldCBiZXN0TWFwcGluZzogUHJvY2Vzc2VkUGF0aE1hcHBpbmd8dW5kZWZpbmVkO1xuICAgIGxldCBiZXN0TWF0Y2g6IHN0cmluZ3x1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgdGhpcy5wYXRoTWFwcGluZ3MubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICBjb25zdCBtYXBwaW5nID0gdGhpcy5wYXRoTWFwcGluZ3NbaW5kZXhdO1xuICAgICAgY29uc3QgbWF0Y2ggPSBtYXRjaGVzW2luZGV4XTtcbiAgICAgIGlmIChtYXRjaCAhPT0gbnVsbCkge1xuICAgICAgICAvLyBJZiB0aGlzIG1hcHBpbmcgaGFkIG5vIHdpbGRjYXJkIHRoZW4gdGhpcyBtdXN0IGJlIGEgY29tcGxldGUgbWF0Y2guXG4gICAgICAgIGlmICghbWFwcGluZy5tYXRjaGVyLmhhc1dpbGRjYXJkKSB7XG4gICAgICAgICAgYmVzdE1hdGNoID0gbWF0Y2g7XG4gICAgICAgICAgYmVzdE1hcHBpbmcgPSBtYXBwaW5nO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoZSBiZXN0IG1hdGNoZWQgbWFwcGluZyBpcyB0aGUgb25lIHdpdGggdGhlIGxvbmdlc3QgcHJlZml4LlxuICAgICAgICBpZiAoIWJlc3RNYXBwaW5nIHx8IG1hcHBpbmcubWF0Y2hlci5wcmVmaXggPiBiZXN0TWFwcGluZy5tYXRjaGVyLnByZWZpeCkge1xuICAgICAgICAgIGJlc3RNYXRjaCA9IG1hdGNoO1xuICAgICAgICAgIGJlc3RNYXBwaW5nID0gbWFwcGluZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAoYmVzdE1hcHBpbmcgJiYgYmVzdE1hdGNoKSA/IHRoaXMuY29tcHV0ZU1hcHBlZFRlbXBsYXRlcyhiZXN0TWFwcGluZywgYmVzdE1hdGNoKSA6IFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gZmluZCBhIG1hcHBlZCBwYXRoIGZvciB0aGUgZ2l2ZW4gYHBhdGhgIGFuZCBhIGBtYXBwaW5nYC5cbiAgICpcbiAgICogVGhlIGBwYXRoYCBtYXRjaGVzIHRoZSBgbWFwcGluZ2AgaWYgaWYgaXQgc3RhcnRzIHdpdGggYG1hdGNoZXIucHJlZml4YCBhbmQgZW5kcyB3aXRoXG4gICAqIGBtYXRjaGVyLnBvc3RmaXhgLlxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgd2lsZGNhcmQgc2VnbWVudCBvZiBhIG1hdGNoZWQgYHBhdGhgLCBvciBgbnVsbGAgaWYgbm8gbWF0Y2guXG4gICAqL1xuICBwcml2YXRlIG1hdGNoTWFwcGluZyhwYXRoOiBzdHJpbmcsIG1hcHBpbmc6IFByb2Nlc3NlZFBhdGhNYXBwaW5nKTogc3RyaW5nfG51bGwge1xuICAgIGNvbnN0IHtwcmVmaXgsIHBvc3RmaXgsIGhhc1dpbGRjYXJkfSA9IG1hcHBpbmcubWF0Y2hlcjtcbiAgICBpZiAocGF0aC5zdGFydHNXaXRoKHByZWZpeCkgJiYgcGF0aC5lbmRzV2l0aChwb3N0Zml4KSkge1xuICAgICAgcmV0dXJuIGhhc1dpbGRjYXJkID8gcGF0aC5zdWJzdHJpbmcocHJlZml4Lmxlbmd0aCwgcGF0aC5sZW5ndGggLSBwb3N0Zml4Lmxlbmd0aCkgOiAnJztcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSB0aGUgY2FuZGlkYXRlIHBhdGhzIGZyb20gdGhlIGdpdmVuIG1hcHBpbmcncyB0ZW1wbGF0ZXMgdXNpbmcgdGhlIG1hdGNoZWRcbiAgICogc3RyaW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlTWFwcGVkVGVtcGxhdGVzKG1hcHBpbmc6IFByb2Nlc3NlZFBhdGhNYXBwaW5nLCBtYXRjaDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIG1hcHBpbmcudGVtcGxhdGVzLm1hcChcbiAgICAgICAgdGVtcGxhdGUgPT5cbiAgICAgICAgICAgIEFic29sdXRlRnNQYXRoLnJlc29sdmUobWFwcGluZy5iYXNlVXJsLCB0ZW1wbGF0ZS5wcmVmaXggKyBtYXRjaCArIHRlbXBsYXRlLnBvc3RmaXgpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWFyY2ggdXAgdGhlIGZvbGRlciB0cmVlIGZvciB0aGUgZmlyc3QgZm9sZGVyIHRoYXQgY29udGFpbnMgYHBhY2thZ2UuanNvbmBcbiAgICogb3IgYG51bGxgIGlmIG5vbmUgaXMgZm91bmQuXG4gICAqL1xuICBwcml2YXRlIGZpbmRQYWNrYWdlUGF0aChwYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IEFic29sdXRlRnNQYXRofG51bGwge1xuICAgIGxldCBmb2xkZXIgPSBwYXRoO1xuICAgIHdoaWxlICghQWJzb2x1dGVGc1BhdGguaXNSb290KGZvbGRlcikpIHtcbiAgICAgIGZvbGRlciA9IEFic29sdXRlRnNQYXRoLmRpcm5hbWUoZm9sZGVyKTtcbiAgICAgIGlmICh0aGlzLmZzLmV4aXN0cyhBYnNvbHV0ZUZzUGF0aC5qb2luKGZvbGRlciwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgICByZXR1cm4gZm9sZGVyO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKiogVGhlIHJlc3VsdCBvZiByZXNvbHZpbmcgYW4gaW1wb3J0IHRvIGEgbW9kdWxlLiAqL1xuZXhwb3J0IHR5cGUgUmVzb2x2ZWRNb2R1bGUgPSBSZXNvbHZlZEV4dGVybmFsTW9kdWxlIHwgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZSB8IFJlc29sdmVkRGVlcEltcG9ydDtcblxuLyoqXG4gKiBBIG1vZHVsZSB0aGF0IGlzIGV4dGVybmFsIHRvIHRoZSBwYWNrYWdlIGRvaW5nIHRoZSBpbXBvcnRpbmcuXG4gKiBJbiB0aGlzIGNhc2Ugd2UgY2FwdHVyZSB0aGUgZm9sZGVyIGNvbnRhaW5pbmcgdGhlIGVudHJ5LXBvaW50LlxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZWRFeHRlcm5hbE1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpIHt9XG59XG5cbi8qKlxuICogQSBtb2R1bGUgdGhhdCBpcyByZWxhdGl2ZSB0byB0aGUgbW9kdWxlIGRvaW5nIHRoZSBpbXBvcnRpbmcsIGFuZCBzbyBpbnRlcm5hbCB0byB0aGVcbiAqIHNvdXJjZSBtb2R1bGUncyBwYWNrYWdlLlxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBtb2R1bGVQYXRoOiBBYnNvbHV0ZUZzUGF0aCkge31cbn1cblxuLyoqXG4gKiBBIG1vZHVsZSB0aGF0IGlzIGV4dGVybmFsIHRvIHRoZSBwYWNrYWdlIGRvaW5nIHRoZSBpbXBvcnRpbmcgYnV0IHBvaW50aW5nIHRvIGFcbiAqIG1vZHVsZSB0aGF0IGlzIGRlZXAgaW5zaWRlIGEgcGFja2FnZSwgcmF0aGVyIHRoYW4gdG8gYW4gZW50cnktcG9pbnQgb2YgdGhlIHBhY2thZ2UuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXNvbHZlZERlZXBJbXBvcnQge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgaW1wb3J0UGF0aDogQWJzb2x1dGVGc1BhdGgpIHt9XG59XG5cbmZ1bmN0aW9uIHNwbGl0T25TdGFyKHN0cjogc3RyaW5nKTogUGF0aE1hcHBpbmdQYXR0ZXJuIHtcbiAgY29uc3QgW3ByZWZpeCwgcG9zdGZpeF0gPSBzdHIuc3BsaXQoJyonLCAyKTtcbiAgcmV0dXJuIHtwcmVmaXgsIHBvc3RmaXg6IHBvc3RmaXggfHwgJycsIGhhc1dpbGRjYXJkOiBwb3N0Zml4ICE9PSB1bmRlZmluZWR9O1xufVxuXG5pbnRlcmZhY2UgUHJvY2Vzc2VkUGF0aE1hcHBpbmcge1xuICBiYXNlVXJsOiBBYnNvbHV0ZUZzUGF0aDtcbiAgbWF0Y2hlcjogUGF0aE1hcHBpbmdQYXR0ZXJuO1xuICB0ZW1wbGF0ZXM6IFBhdGhNYXBwaW5nUGF0dGVybltdO1xufVxuXG5pbnRlcmZhY2UgUGF0aE1hcHBpbmdQYXR0ZXJuIHtcbiAgcHJlZml4OiBzdHJpbmc7XG4gIHBvc3RmaXg6IHN0cmluZztcbiAgaGFzV2lsZGNhcmQ6IGJvb2xlYW47XG59XG4iXX0=