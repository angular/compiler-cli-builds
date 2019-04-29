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
            while (folder !== '/') {
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
            while (folder !== '/') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3Jlc29sdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsNkRBQXVEO0lBRXZELDhEQUFzRDtJQUV0RDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSDtRQUdFLHdCQUFvQixFQUFjLEVBQUUsWUFBMkIsRUFBVSxrQkFFeEU7WUFGd0UsbUNBQUEsRUFBQTtnQkFDdkUsS0FBSyxFQUFFLFdBQVc7YUFDbkI7WUFGbUIsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUF1Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBRTFGO1lBQ0MsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2pGLENBQUM7UUFFRDs7Ozs7Ozs7O1dBU0c7UUFDSCw0Q0FBbUIsR0FBbkIsVUFBb0IsVUFBa0IsRUFBRSxRQUF3QjtZQUM5RCxJQUFJLHNCQUFjLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQzlCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN6RDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDO29CQUMvRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3BEO1FBQ0gsQ0FBQztRQUVEOztXQUVHO1FBQ0ssNENBQW1CLEdBQTNCLFVBQTRCLFlBQTBCO1lBQ3BELElBQU0sT0FBTyxHQUFHLHFC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UUFBRyxDQUFDO1FBQ25ELDZCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSx3REFBc0I7SUFJbkM7OztPQUdHO0lBQ0g7UUFDRSw0QkFBbUIsVUFBMEI7WUFBMUIsZUFBVSxHQUFWLFVBQVUsQ0FBZ0I7UUFBRyxDQUFDO1FBQ25ELHlCQUFDO0lBQUQsQ0FBQyxBQUZELElBRUM7SUFGWSxnREFBa0I7SUFJL0IsU0FBUyxXQUFXLENBQUMsR0FBVztRQUN4QixJQUFBLHlDQUFxQyxFQUFwQyxjQUFNLEVBQUUsZUFBNEIsQ0FBQztRQUM1QyxPQUFPLEVBQUMsTUFBTSxRQUFBLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFFLEVBQUUsV0FBVyxFQUFFLE9BQU8sS0FBSyxTQUFTLEVBQUMsQ0FBQztJQUM5RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzLCBpc1JlbGF0aXZlUGF0aH0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFRoaXMgaXMgYSB2ZXJ5IGN1dC1kb3duIGltcGxlbWVudGF0aW9uIG9mIHRoZSBUeXBlU2NyaXB0IG1vZHVsZSByZXNvbHV0aW9uIHN0cmF0ZWd5LlxuICpcbiAqIEl0IGlzIHNwZWNpZmljIHRvIHRoZSBuZWVkcyBvZiBuZ2NjIGFuZCBpcyBub3QgaW50ZW5kZWQgdG8gYmUgYSBkcm9wLWluIHJlcGxhY2VtZW50XG4gKiBmb3IgdGhlIFRTIG1vZHVsZSByZXNvbHZlci4gSXQgaXMgdXNlZCB0byBjb21wdXRlIHRoZSBkZXBlbmRlbmNpZXMgYmV0d2VlbiBlbnRyeS1wb2ludHNcbiAqIHRoYXQgbWF5IGJlIGNvbXBpbGVkIGJ5IG5nY2MuXG4gKlxuICogVGhlIGFsZ29yaXRobSBvbmx5IGZpbmRzIGAuanNgIGZpbGVzIGZvciBpbnRlcm5hbC9yZWxhdGl2ZSBpbXBvcnRzIGFuZCBwYXRocyB0b1xuICogdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBgcGFja2FnZS5qc29uYCBvZiB0aGUgZW50cnktcG9pbnQgZm9yIGV4dGVybmFsIGltcG9ydHMuXG4gKlxuICogSXQgY2FuIGNvcGUgd2l0aCBuZXN0ZWQgYG5vZGVfbW9kdWxlc2AgZm9sZGVycyBhbmQgYWxzbyBzdXBwb3J0cyBgcGF0aHNgL2BiYXNlVXJsYFxuICogY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzLCBhcyBwcm92aWRlZCBpbiBhIGB0cy5Db21waWxlck9wdGlvbnNgIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNsYXNzIE1vZHVsZVJlc29sdmVyIHtcbiAgcHJpdmF0ZSBwYXRoTWFwcGluZ3M6IFByb2Nlc3NlZFBhdGhNYXBwaW5nW107XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcGF0aE1hcHBpbmdzPzogUGF0aE1hcHBpbmdzLCBwcml2YXRlIHJlbGF0aXZlRXh0ZW5zaW9ucyA9IFtcbiAgICAnLmpzJywgJy9pbmRleC5qcydcbiAgXSkge1xuICAgIHRoaXMucGF0aE1hcHBpbmdzID0gcGF0aE1hcHBpbmdzID8gdGhpcy5wcm9jZXNzUGF0aE1hcHBpbmdzKHBhdGhNYXBwaW5ncykgOiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIGFuIGFic29sdXRlIHBhdGggZm9yIHRoZSBgbW9kdWxlTmFtZWAgaW1wb3J0ZWQgaW50byBhIGZpbGUgYXQgYGZyb21QYXRoYC5cbiAgICogQHBhcmFtIG1vZHVsZU5hbWUgVGhlIG5hbWUgb2YgdGhlIGltcG9ydCB0byByZXNvbHZlLlxuICAgKiBAcGFyYW0gZnJvbVBhdGggVGhlIHBhdGggdG8gdGhlIGZpbGUgY29udGFpbmluZyB0aGUgaW1wb3J0LlxuICAgKiBAcmV0dXJucyBBIHBhdGggdG8gdGhlIHJlc29sdmVkIG1vZHVsZSBvciBudWxsIGlmIG1pc3NpbmcuXG4gICAqIFNwZWNpZmljYWxseTpcbiAgICogICogdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2UuanNvbiBvZiBhbiBleHRlcm5hbCBtb2R1bGVcbiAgICogICogYSBKYXZhU2NyaXB0IGZpbGUgb2YgYW4gaW50ZXJuYWwgbW9kdWxlXG4gICAqICAqIG51bGwgaWYgbm9uZSBleGlzdHMuXG4gICAqL1xuICByZXNvbHZlTW9kdWxlSW1wb3J0KG1vZHVsZU5hbWU6IHN0cmluZywgZnJvbVBhdGg6IEFic29sdXRlRnNQYXRoKTogUmVzb2x2ZWRNb2R1bGV8bnVsbCB7XG4gICAgaWYgKGlzUmVsYXRpdmVQYXRoKG1vZHVsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZXNvbHZlQXNSZWxhdGl2ZVBhdGgobW9kdWxlTmFtZSwgZnJvbVBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5wYXRoTWFwcGluZ3MubGVuZ3RoICYmIHRoaXMucmVzb2x2ZUJ5UGF0aE1hcHBpbmdzKG1vZHVsZU5hbWUsIGZyb21QYXRoKSB8fFxuICAgICAgICAgIHRoaXMucmVzb2x2ZUFzRW50cnlQb2ludChtb2R1bGVOYW1lLCBmcm9tUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnQgdGhlIGBwYXRoTWFwcGluZ3NgIGludG8gYSBjb2xsZWN0aW9uIG9mIGBQYXRoTWFwcGVyYCBmdW5jdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIHByb2Nlc3NQYXRoTWFwcGluZ3MocGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MpOiBQcm9jZXNzZWRQYXRoTWFwcGluZ1tdIHtcbiAgICBjb25zdCBiYXNlVXJsID0gQWJzb2x1dGVGc1BhdGguZnJvbShwYXRoTWFwcGluZ3MuYmFzZVVybCk7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhdGhNYXBwaW5ncy5wYXRocykubWFwKHBhdGhQYXR0ZXJuID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBzcGxpdE9uU3RhcihwYXRoUGF0dGVybik7XG4gICAgICBjb25zdCB0ZW1wbGF0ZXMgPSBwYXRoTWFwcGluZ3MucGF0aHNbcGF0aFBhdHRlcm5dLm1hcChzcGxpdE9uU3Rhcik7XG4gICAgICByZXR1cm4ge21hdGNoZXIsIHRlbXBsYXRlcywgYmFzZVVybH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJlc29sdmUgYSBtb2R1bGUgbmFtZSwgYXMgYSByZWxhdGl2ZSBwYXRoLCBmcm9tIHRoZSBgZnJvbVBhdGhgLlxuICAgKlxuICAgKiBBcyBpdCBpcyByZWxhdGl2ZSwgaXQgb25seSBsb29rcyBmb3IgZmlsZXMgdGhhdCBlbmQgaW4gb25lIG9mIHRoZSBgcmVsYXRpdmVFeHRlbnNpb25zYC5cbiAgICogRm9yIGV4YW1wbGU6IGAke21vZHVsZU5hbWV9LmpzYCBvciBgJHttb2R1bGVOYW1lfS9pbmRleC5qc2AuXG4gICAqIElmIG5laXRoZXIgb2YgdGhlc2UgZmlsZXMgZXhpc3QgdGhlbiB0aGUgbWV0aG9kIHJldHVybnMgYG51bGxgLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlQXNSZWxhdGl2ZVBhdGgobW9kdWxlTmFtZTogc3RyaW5nLCBmcm9tUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBSZXNvbHZlZE1vZHVsZXxudWxsIHtcbiAgICBjb25zdCByZXNvbHZlZFBhdGggPSB0aGlzLnJlc29sdmVQYXRoKFxuICAgICAgICBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKEFic29sdXRlRnNQYXRoLmRpcm5hbWUoZnJvbVBhdGgpLCBtb2R1bGVOYW1lKSxcbiAgICAgICAgdGhpcy5yZWxhdGl2ZUV4dGVuc2lvbnMpO1xuICAgIHJldHVybiByZXNvbHZlZFBhdGggJiYgbmV3IFJlc29sdmVkUmVsYXRpdmVNb2R1bGUocmVzb2x2ZWRQYXRoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gcmVzb2x2ZSB0aGUgYG1vZHVsZU5hbWVgLCBieSBhcHBseWluZyB0aGUgY29tcHV0ZWQgYHBhdGhNYXBwaW5nc2AgYW5kXG4gICAqIHRoZW4gdHJ5aW5nIHRvIHJlc29sdmUgdGhlIG1hcHBlZCBwYXRoIGFzIGEgcmVsYXRpdmUgb3IgZXh0ZXJuYWwgaW1wb3J0LlxuICAgKlxuICAgKiBXaGV0aGVyIHRoZSBtYXBwZWQgcGF0aCBpcyByZWxhdGl2ZSBpcyBkZWZpbmVkIGFzIGl0IGJlaW5nIFwiYmVsb3cgdGhlIGBmcm9tUGF0aGBcIiBhbmQgbm90XG4gICAqIGNvbnRhaW5pbmcgYG5vZGVfbW9kdWxlc2AuXG4gICAqXG4gICAqIElmIHRoZSBtYXBwZWQgcGF0aCBpcyBub3QgcmVsYXRpdmUgYnV0IGRvZXMgbm90IHJlc29sdmUgdG8gYW4gZXh0ZXJuYWwgZW50cnktcG9pbnQsIHRoZW4gd2VcbiAgICogY2hlY2sgd2hldGhlciBpdCB3b3VsZCBoYXZlIHJlc29sdmVkIHRvIGEgcmVsYXRpdmUgcGF0aCwgaW4gd2hpY2ggY2FzZSBpdCBpcyBtYXJrZWQgYXMgYVxuICAgKiBcImRlZXAtaW1wb3J0XCIuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVCeVBhdGhNYXBwaW5ncyhtb2R1bGVOYW1lOiBzdHJpbmcsIGZyb21QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFJlc29sdmVkTW9kdWxlfG51bGwge1xuICAgIGNvbnN0IG1hcHBlZFBhdGhzID0gdGhpcy5maW5kTWFwcGVkUGF0aHMobW9kdWxlTmFtZSk7XG4gICAgaWYgKG1hcHBlZFBhdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gdGhpcy5maW5kUGFja2FnZVBhdGgoZnJvbVBhdGgpO1xuICAgICAgaWYgKHBhY2thZ2VQYXRoICE9PSBudWxsKSB7XG4gICAgICAgIGZvciAoY29uc3QgbWFwcGVkUGF0aCBvZiBtYXBwZWRQYXRocykge1xuICAgICAgICAgIGNvbnN0IGlzUmVsYXRpdmUgPVxuICAgICAgICAgICAgICBtYXBwZWRQYXRoLnN0YXJ0c1dpdGgocGFja2FnZVBhdGgpICYmICFtYXBwZWRQYXRoLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgICBpZiAoaXNSZWxhdGl2ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUFzUmVsYXRpdmVQYXRoKG1hcHBlZFBhdGgsIGZyb21QYXRoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNFbnRyeVBvaW50KG1hcHBlZFBhdGgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkRXh0ZXJuYWxNb2R1bGUobWFwcGVkUGF0aCk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLnJlc29sdmVBc1JlbGF0aXZlUGF0aChtYXBwZWRQYXRoLCBmcm9tUGF0aCkpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmVzb2x2ZWREZWVwSW1wb3J0KG1hcHBlZFBhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcnkgdG8gcmVzb2x2ZSB0aGUgYG1vZHVsZU5hbWVgIGFzIGFuIGV4dGVybmFsIGVudHJ5LXBvaW50IGJ5IHNlYXJjaGluZyB0aGUgYG5vZGVfbW9kdWxlc2BcbiAgICogZm9sZGVycyB1cCB0aGUgdHJlZSBmb3IgYSBtYXRjaGluZyBgLi4uL25vZGVfbW9kdWxlcy8ke21vZHVsZU5hbWV9YC5cbiAgICpcbiAgICogSWYgYSBmb2xkZXIgaXMgZm91bmQgYnV0IHRoZSBwYXRoIGRvZXMgbm90IGNvbnRhaW4gYSBgcGFja2FnZS5qc29uYCB0aGVuIGl0IGlzIG1hcmtlZCBhcyBhXG4gICAqIFwiZGVlcC1pbXBvcnRcIi5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZUFzRW50cnlQb2ludChtb2R1bGVOYW1lOiBzdHJpbmcsIGZyb21QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFJlc29sdmVkTW9kdWxlfG51bGwge1xuICAgIGxldCBmb2xkZXIgPSBmcm9tUGF0aDtcbiAgICB3aGlsZSAoZm9sZGVyICE9PSAnLycpIHtcbiAgICAgIGZvbGRlciA9IEFic29sdXRlRnNQYXRoLmRpcm5hbWUoZm9sZGVyKTtcbiAgICAgIGlmIChmb2xkZXIuZW5kc1dpdGgoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgIC8vIFNraXAgdXAgaWYgdGhlIGZvbGRlciBhbHJlYWR5IGVuZHMgaW4gbm9kZV9tb2R1bGVzXG4gICAgICAgIGZvbGRlciA9IEFic29sdXRlRnNQYXRoLmRpcm5hbWUoZm9sZGVyKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1vZHVsZVBhdGggPSBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKGZvbGRlciwgJ25vZGVfbW9kdWxlcycsIG1vZHVsZU5hbWUpO1xuICAgICAgaWYgKHRoaXMuaXNFbnRyeVBvaW50KG1vZHVsZVBhdGgpKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzb2x2ZWRFeHRlcm5hbE1vZHVsZShtb2R1bGVQYXRoKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5yZXNvbHZlQXNSZWxhdGl2ZVBhdGgobW9kdWxlUGF0aCwgZnJvbVBhdGgpKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmVzb2x2ZWREZWVwSW1wb3J0KG1vZHVsZVBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHRvIHJlc29sdmUgYSBgcGF0aGAgdG8gYSBmaWxlIGJ5IGFwcGVuZGluZyB0aGUgcHJvdmlkZWQgYHBvc3RGaXhlc2BcbiAgICogdG8gdGhlIGBwYXRoYCBhbmQgY2hlY2tpbmcgaWYgdGhlIGZpbGUgZXhpc3RzIG9uIGRpc2suXG4gICAqIEByZXR1cm5zIEFuIGFic29sdXRlIHBhdGggdG8gdGhlIGZpcnN0IG1hdGNoaW5nIGV4aXN0aW5nIGZpbGUsIG9yIGBudWxsYCBpZiBub25lIGV4aXN0LlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlUGF0aChwYXRoOiBBYnNvbHV0ZUZzUGF0aCwgcG9zdEZpeGVzOiBzdHJpbmdbXSk6IEFic29sdXRlRnNQYXRofG51bGwge1xuICAgIGZvciAoY29uc3QgcG9zdEZpeCBvZiBwb3N0Rml4ZXMpIHtcbiAgICAgIGNvbnN0IHRlc3RQYXRoID0gQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChwYXRoICsgcG9zdEZpeCk7XG4gICAgICBpZiAodGhpcy5mcy5leGlzdHModGVzdFBhdGgpKSB7XG4gICAgICAgIHJldHVybiB0ZXN0UGF0aDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQ2FuIHdlIGNvbnNpZGVyIHRoZSBnaXZlbiBwYXRoIGFzIGFuIGVudHJ5LXBvaW50IHRvIGEgcGFja2FnZT9cbiAgICpcbiAgICogVGhpcyBpcyBhY2hpZXZlZCBieSBjaGVja2luZyBmb3IgdGhlIGV4aXN0ZW5jZSBvZiBgJHttb2R1bGVQYXRofS9wYWNrYWdlLmpzb25gLlxuICAgKi9cbiAgcHJpdmF0ZSBpc0VudHJ5UG9pbnQobW9kdWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5mcy5leGlzdHMoQWJzb2x1dGVGc1BhdGguam9pbihtb2R1bGVQYXRoLCAncGFja2FnZS5qc29uJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGx5IHRoZSBgcGF0aE1hcHBlcnNgIHRvIHRoZSBgbW9kdWxlTmFtZWAgYW5kIHJldHVybiBhbGwgdGhlIHBvc3NpYmxlXG4gICAqIHBhdGhzIHRoYXQgbWF0Y2guXG4gICAqXG4gICAqIFRoZSBtYXBwZWQgcGF0aCBpcyBjb21wdXRlZCBmb3IgZWFjaCB0ZW1wbGF0ZSBpbiBgbWFwcGluZy50ZW1wbGF0ZXNgIGJ5XG4gICAqIHJlcGxhY2luZyB0aGUgYG1hdGNoZXIucHJlZml4YCBhbmQgYG1hdGNoZXIucG9zdGZpeGAgc3RyaW5ncyBpbiBgcGF0aCB3aXRoIHRoZVxuICAgKiBgdGVtcGxhdGUucHJlZml4YCBhbmQgYHRlbXBsYXRlLnBvc3RmaXhgIHN0cmluZ3MuXG4gICAqL1xuICBwcml2YXRlIGZpbmRNYXBwZWRQYXRocyhtb2R1bGVOYW1lOiBzdHJpbmcpOiBBYnNvbHV0ZUZzUGF0aFtdIHtcbiAgICBjb25zdCBtYXRjaGVzID0gdGhpcy5wYXRoTWFwcGluZ3MubWFwKG1hcHBpbmcgPT4gdGhpcy5tYXRjaE1hcHBpbmcobW9kdWxlTmFtZSwgbWFwcGluZykpO1xuXG4gICAgbGV0IGJlc3RNYXBwaW5nOiBQcm9jZXNzZWRQYXRoTWFwcGluZ3x1bmRlZmluZWQ7XG4gICAgbGV0IGJlc3RNYXRjaDogc3RyaW5nfHVuZGVmaW5lZDtcblxuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCB0aGlzLnBhdGhNYXBwaW5ncy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIGNvbnN0IG1hcHBpbmcgPSB0aGlzLnBhdGhNYXBwaW5nc1tpbmRleF07XG4gICAgICBjb25zdCBtYXRjaCA9IG1hdGNoZXNbaW5kZXhdO1xuICAgICAgaWYgKG1hdGNoICE9PSBudWxsKSB7XG4gICAgICAgIC8vIElmIHRoaXMgbWFwcGluZyBoYWQgbm8gd2lsZGNhcmQgdGhlbiB0aGlzIG11c3QgYmUgYSBjb21wbGV0ZSBtYXRjaC5cbiAgICAgICAgaWYgKCFtYXBwaW5nLm1hdGNoZXIuaGFzV2lsZGNhcmQpIHtcbiAgICAgICAgICBiZXN0TWF0Y2ggPSBtYXRjaDtcbiAgICAgICAgICBiZXN0TWFwcGluZyA9IG1hcHBpbmc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlIGJlc3QgbWF0Y2hlZCBtYXBwaW5nIGlzIHRoZSBvbmUgd2l0aCB0aGUgbG9uZ2VzdCBwcmVmaXguXG4gICAgICAgIGlmICghYmVzdE1hcHBpbmcgfHwgbWFwcGluZy5tYXRjaGVyLnByZWZpeCA+IGJlc3RNYXBwaW5nLm1hdGNoZXIucHJlZml4KSB7XG4gICAgICAgICAgYmVzdE1hdGNoID0gbWF0Y2g7XG4gICAgICAgICAgYmVzdE1hcHBpbmcgPSBtYXBwaW5nO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIChiZXN0TWFwcGluZyAmJiBiZXN0TWF0Y2gpID8gdGhpcy5jb21wdXRlTWFwcGVkVGVtcGxhdGVzKGJlc3RNYXBwaW5nLCBiZXN0TWF0Y2gpIDogW107XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCB0byBmaW5kIGEgbWFwcGVkIHBhdGggZm9yIHRoZSBnaXZlbiBgcGF0aGAgYW5kIGEgYG1hcHBpbmdgLlxuICAgKlxuICAgKiBUaGUgYHBhdGhgIG1hdGNoZXMgdGhlIGBtYXBwaW5nYCBpZiBpZiBpdCBzdGFydHMgd2l0aCBgbWF0Y2hlci5wcmVmaXhgIGFuZCBlbmRzIHdpdGhcbiAgICogYG1hdGNoZXIucG9zdGZpeGAuXG4gICAqXG4gICAqIEByZXR1cm5zIHRoZSB3aWxkY2FyZCBzZWdtZW50IG9mIGEgbWF0Y2hlZCBgcGF0aGAsIG9yIGBudWxsYCBpZiBubyBtYXRjaC5cbiAgICovXG4gIHByaXZhdGUgbWF0Y2hNYXBwaW5nKHBhdGg6IHN0cmluZywgbWFwcGluZzogUHJvY2Vzc2VkUGF0aE1hcHBpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgY29uc3Qge3ByZWZpeCwgcG9zdGZpeCwgaGFzV2lsZGNhcmR9ID0gbWFwcGluZy5tYXRjaGVyO1xuICAgIGlmIChwYXRoLnN0YXJ0c1dpdGgocHJlZml4KSAmJiBwYXRoLmVuZHNXaXRoKHBvc3RmaXgpKSB7XG4gICAgICByZXR1cm4gaGFzV2lsZGNhcmQgPyBwYXRoLnN1YnN0cmluZyhwcmVmaXgubGVuZ3RoLCBwYXRoLmxlbmd0aCAtIHBvc3RmaXgubGVuZ3RoKSA6ICcnO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIHRoZSBjYW5kaWRhdGUgcGF0aHMgZnJvbSB0aGUgZ2l2ZW4gbWFwcGluZydzIHRlbXBsYXRlcyB1c2luZyB0aGUgbWF0Y2hlZFxuICAgKiBzdHJpbmcuXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVNYXBwZWRUZW1wbGF0ZXMobWFwcGluZzogUHJvY2Vzc2VkUGF0aE1hcHBpbmcsIG1hdGNoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gbWFwcGluZy50ZW1wbGF0ZXMubWFwKFxuICAgICAgICB0ZW1wbGF0ZSA9PlxuICAgICAgICAgICAgQWJzb2x1dGVGc1BhdGgucmVzb2x2ZShtYXBwaW5nLmJhc2VVcmwsIHRlbXBsYXRlLnByZWZpeCArIG1hdGNoICsgdGVtcGxhdGUucG9zdGZpeCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCB1cCB0aGUgZm9sZGVyIHRyZWUgZm9yIHRoZSBmaXJzdCBmb2xkZXIgdGhhdCBjb250YWlucyBgcGFja2FnZS5qc29uYFxuICAgKiBvciBgbnVsbGAgaWYgbm9uZSBpcyBmb3VuZC5cbiAgICovXG4gIHByaXZhdGUgZmluZFBhY2thZ2VQYXRoKHBhdGg6IEFic29sdXRlRnNQYXRoKTogQWJzb2x1dGVGc1BhdGh8bnVsbCB7XG4gICAgbGV0IGZvbGRlciA9IHBhdGg7XG4gICAgd2hpbGUgKGZvbGRlciAhPT0gJy8nKSB7XG4gICAgICBmb2xkZXIgPSBBYnNvbHV0ZUZzUGF0aC5kaXJuYW1lKGZvbGRlcik7XG4gICAgICBpZiAodGhpcy5mcy5leGlzdHMoQWJzb2x1dGVGc1BhdGguam9pbihmb2xkZXIsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgcmV0dXJuIGZvbGRlcjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqIFRoZSByZXN1bHQgb2YgcmVzb2x2aW5nIGFuIGltcG9ydCB0byBhIG1vZHVsZS4gKi9cbmV4cG9ydCB0eXBlIFJlc29sdmVkTW9kdWxlID0gUmVzb2x2ZWRFeHRlcm5hbE1vZHVsZSB8IFJlc29sdmVkUmVsYXRpdmVNb2R1bGUgfCBSZXNvbHZlZERlZXBJbXBvcnQ7XG5cbi8qKlxuICogQSBtb2R1bGUgdGhhdCBpcyBleHRlcm5hbCB0byB0aGUgcGFja2FnZSBkb2luZyB0aGUgaW1wb3J0aW5nLlxuICogSW4gdGhpcyBjYXNlIHdlIGNhcHR1cmUgdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc29sdmVkRXh0ZXJuYWxNb2R1bGUge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKSB7fVxufVxuXG4vKipcbiAqIEEgbW9kdWxlIHRoYXQgaXMgcmVsYXRpdmUgdG8gdGhlIG1vZHVsZSBkb2luZyB0aGUgaW1wb3J0aW5nLCBhbmQgc28gaW50ZXJuYWwgdG8gdGhlXG4gKiBzb3VyY2UgbW9kdWxlJ3MgcGFja2FnZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc29sdmVkUmVsYXRpdmVNb2R1bGUge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgbW9kdWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpIHt9XG59XG5cbi8qKlxuICogQSBtb2R1bGUgdGhhdCBpcyBleHRlcm5hbCB0byB0aGUgcGFja2FnZSBkb2luZyB0aGUgaW1wb3J0aW5nIGJ1dCBwb2ludGluZyB0byBhXG4gKiBtb2R1bGUgdGhhdCBpcyBkZWVwIGluc2lkZSBhIHBhY2thZ2UsIHJhdGhlciB0aGFuIHRvIGFuIGVudHJ5LXBvaW50IG9mIHRoZSBwYWNrYWdlLlxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZWREZWVwSW1wb3J0IHtcbiAgY29uc3RydWN0b3IocHVibGljIGltcG9ydFBhdGg6IEFic29sdXRlRnNQYXRoKSB7fVxufVxuXG5mdW5jdGlvbiBzcGxpdE9uU3RhcihzdHI6IHN0cmluZyk6IFBhdGhNYXBwaW5nUGF0dGVybiB7XG4gIGNvbnN0IFtwcmVmaXgsIHBvc3RmaXhdID0gc3RyLnNwbGl0KCcqJywgMik7XG4gIHJldHVybiB7cHJlZml4LCBwb3N0Zml4OiBwb3N0Zml4IHx8ICcnLCBoYXNXaWxkY2FyZDogcG9zdGZpeCAhPT0gdW5kZWZpbmVkfTtcbn1cblxuaW50ZXJmYWNlIFByb2Nlc3NlZFBhdGhNYXBwaW5nIHtcbiAgYmFzZVVybDogQWJzb2x1dGVGc1BhdGg7XG4gIG1hdGNoZXI6IFBhdGhNYXBwaW5nUGF0dGVybjtcbiAgdGVtcGxhdGVzOiBQYXRoTWFwcGluZ1BhdHRlcm5bXTtcbn1cblxuaW50ZXJmYWNlIFBhdGhNYXBwaW5nUGF0dGVybiB7XG4gIHByZWZpeDogc3RyaW5nO1xuICBwb3N0Zml4OiBzdHJpbmc7XG4gIGhhc1dpbGRjYXJkOiBib29sZWFuO1xufVxuIl19