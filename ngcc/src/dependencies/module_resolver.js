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
        define("@angular/compiler-cli/ngcc/src/dependencies/module_resolver", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
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
            var resolvedPath = this.resolvePath(file_system_1.resolve(file_system_1.dirname(fromPath), moduleName), this.relativeExtensions);
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
         * Attempt to resolve a `path` to a file by appending the provided `postFixes`
         * to the `path` and checking if the file exists on disk.
         * @returns An absolute path to the first matching existing file, or `null` if none exist.
         */
        ModuleResolver.prototype.resolvePath = function (path, postFixes) {
            var e_2, _a;
            try {
                for (var postFixes_1 = tslib_1.__values(postFixes), postFixes_1_1 = postFixes_1.next(); !postFixes_1_1.done; postFixes_1_1 = postFixes_1.next()) {
                    var postFix = postFixes_1_1.value;
                    var testPath = file_system_1.absoluteFrom(path + postFix);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlX3Jlc29sdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL2RlcGVuZGVuY2llcy9tb2R1bGVfcmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsMkVBQXdIO0lBQ3hILDhEQUFzRDtJQUl0RDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSDtRQUdFLHdCQUFvQixFQUFjLEVBQUUsWUFBMkIsRUFBVSxrQkFFeEU7WUFGd0UsbUNBQUEsRUFBQTtnQkFDdkUsS0FBSyxFQUFFLFdBQVc7YUFDbkI7WUFGbUIsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUF1Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBRTFGO1lBQ0MsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2pGLENBQUM7UUFFRDs7Ozs7Ozs7O1dBU0c7UUFDSCw0Q0FBbUIsR0FBbkIsVUFBb0IsVUFBa0IsRUFBRSxRQUF3QjtZQUM5RCxJQUFJLHNCQUFjLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQzlCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUN6RDtpQkFBTTtnQkFDTCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDO29CQUMvRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3BEO1FBQ0gsQ0FBQztRQUVEOztXQUVHO1FBQ0ssNENBQW1CLEdBQTNCLFVBQTRCLFlBQTBCO1lBQ3BELElBQU0sT0FBTyxHQUFHLDBC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QUFzQjtJQUluQzs7O09BR0c7SUFDSDtRQUNFLDRCQUFtQixVQUEwQjtZQUExQixlQUFVLEdBQVYsVUFBVSxDQUFnQjtRQUFHLENBQUM7UUFDbkQseUJBQUM7SUFBRCxDQUFDLEFBRkQsSUFFQztJQUZZLGdEQUFrQjtJQUkvQixTQUFTLFdBQVcsQ0FBQyxHQUFXO1FBQ3hCLElBQUEseUNBQXFDLEVBQXBDLGNBQU0sRUFBRSxlQUE0QixDQUFDO1FBQzVDLE9BQU8sRUFBQyxNQUFNLFFBQUEsRUFBRSxPQUFPLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxXQUFXLEVBQUUsT0FBTyxLQUFLLFNBQVMsRUFBQyxDQUFDO0lBQzlFLENBQUM7SUFjRCxTQUFTLGdCQUFnQixDQUFDLElBQW9CLEVBQUUsRUFBa0I7UUFDaEUsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUM3RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBhYnNvbHV0ZUZyb20sIGRpcm5hbWUsIGlzUm9vdCwgam9pbiwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzLCBpc1JlbGF0aXZlUGF0aH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5cblxuLyoqXG4gKiBUaGlzIGlzIGEgdmVyeSBjdXQtZG93biBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgVHlwZVNjcmlwdCBtb2R1bGUgcmVzb2x1dGlvbiBzdHJhdGVneS5cbiAqXG4gKiBJdCBpcyBzcGVjaWZpYyB0byB0aGUgbmVlZHMgb2YgbmdjYyBhbmQgaXMgbm90IGludGVuZGVkIHRvIGJlIGEgZHJvcC1pbiByZXBsYWNlbWVudFxuICogZm9yIHRoZSBUUyBtb2R1bGUgcmVzb2x2ZXIuIEl0IGlzIHVzZWQgdG8gY29tcHV0ZSB0aGUgZGVwZW5kZW5jaWVzIGJldHdlZW4gZW50cnktcG9pbnRzXG4gKiB0aGF0IG1heSBiZSBjb21waWxlZCBieSBuZ2NjLlxuICpcbiAqIFRoZSBhbGdvcml0aG0gb25seSBmaW5kcyBgLmpzYCBmaWxlcyBmb3IgaW50ZXJuYWwvcmVsYXRpdmUgaW1wb3J0cyBhbmQgcGF0aHMgdG9cbiAqIHRoZSBmb2xkZXIgY29udGFpbmluZyB0aGUgYHBhY2thZ2UuanNvbmAgb2YgdGhlIGVudHJ5LXBvaW50IGZvciBleHRlcm5hbCBpbXBvcnRzLlxuICpcbiAqIEl0IGNhbiBjb3BlIHdpdGggbmVzdGVkIGBub2RlX21vZHVsZXNgIGZvbGRlcnMgYW5kIGFsc28gc3VwcG9ydHMgYHBhdGhzYC9gYmFzZVVybGBcbiAqIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcywgYXMgcHJvdmlkZWQgaW4gYSBgdHMuQ29tcGlsZXJPcHRpb25zYCBvYmplY3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBNb2R1bGVSZXNvbHZlciB7XG4gIHByaXZhdGUgcGF0aE1hcHBpbmdzOiBQcm9jZXNzZWRQYXRoTWFwcGluZ1tdO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHBhdGhNYXBwaW5ncz86IFBhdGhNYXBwaW5ncywgcHJpdmF0ZSByZWxhdGl2ZUV4dGVuc2lvbnMgPSBbXG4gICAgJy5qcycsICcvaW5kZXguanMnXG4gIF0pIHtcbiAgICB0aGlzLnBhdGhNYXBwaW5ncyA9IHBhdGhNYXBwaW5ncyA/IHRoaXMucHJvY2Vzc1BhdGhNYXBwaW5ncyhwYXRoTWFwcGluZ3MpIDogW107XG4gIH1cblxuICAvKipcbiAgICogUmVzb2x2ZSBhbiBhYnNvbHV0ZSBwYXRoIGZvciB0aGUgYG1vZHVsZU5hbWVgIGltcG9ydGVkIGludG8gYSBmaWxlIGF0IGBmcm9tUGF0aGAuXG4gICAqIEBwYXJhbSBtb2R1bGVOYW1lIFRoZSBuYW1lIG9mIHRoZSBpbXBvcnQgdG8gcmVzb2x2ZS5cbiAgICogQHBhcmFtIGZyb21QYXRoIFRoZSBwYXRoIHRvIHRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGltcG9ydC5cbiAgICogQHJldHVybnMgQSBwYXRoIHRvIHRoZSByZXNvbHZlZCBtb2R1bGUgb3IgbnVsbCBpZiBtaXNzaW5nLlxuICAgKiBTcGVjaWZpY2FsbHk6XG4gICAqICAqIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlLmpzb24gb2YgYW4gZXh0ZXJuYWwgbW9kdWxlXG4gICAqICAqIGEgSmF2YVNjcmlwdCBmaWxlIG9mIGFuIGludGVybmFsIG1vZHVsZVxuICAgKiAgKiBudWxsIGlmIG5vbmUgZXhpc3RzLlxuICAgKi9cbiAgcmVzb2x2ZU1vZHVsZUltcG9ydChtb2R1bGVOYW1lOiBzdHJpbmcsIGZyb21QYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IFJlc29sdmVkTW9kdWxlfG51bGwge1xuICAgIGlmIChpc1JlbGF0aXZlUGF0aChtb2R1bGVOYW1lKSkge1xuICAgICAgcmV0dXJuIHRoaXMucmVzb2x2ZUFzUmVsYXRpdmVQYXRoKG1vZHVsZU5hbWUsIGZyb21QYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMucGF0aE1hcHBpbmdzLmxlbmd0aCAmJiB0aGlzLnJlc29sdmVCeVBhdGhNYXBwaW5ncyhtb2R1bGVOYW1lLCBmcm9tUGF0aCkgfHxcbiAgICAgICAgICB0aGlzLnJlc29sdmVBc0VudHJ5UG9pbnQobW9kdWxlTmFtZSwgZnJvbVBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IHRoZSBgcGF0aE1hcHBpbmdzYCBpbnRvIGEgY29sbGVjdGlvbiBvZiBgUGF0aE1hcHBlcmAgZnVuY3Rpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBwcm9jZXNzUGF0aE1hcHBpbmdzKHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzKTogUHJvY2Vzc2VkUGF0aE1hcHBpbmdbXSB7XG4gICAgY29uc3QgYmFzZVVybCA9IGFic29sdXRlRnJvbShwYXRoTWFwcGluZ3MuYmFzZVVybCk7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHBhdGhNYXBwaW5ncy5wYXRocykubWFwKHBhdGhQYXR0ZXJuID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBzcGxpdE9uU3RhcihwYXRoUGF0dGVybik7XG4gICAgICBjb25zdCB0ZW1wbGF0ZXMgPSBwYXRoTWFwcGluZ3MucGF0aHNbcGF0aFBhdHRlcm5dLm1hcChzcGxpdE9uU3Rhcik7XG4gICAgICByZXR1cm4ge21hdGNoZXIsIHRlbXBsYXRlcywgYmFzZVVybH07XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJlc29sdmUgYSBtb2R1bGUgbmFtZSwgYXMgYSByZWxhdGl2ZSBwYXRoLCBmcm9tIHRoZSBgZnJvbVBhdGhgLlxuICAgKlxuICAgKiBBcyBpdCBpcyByZWxhdGl2ZSwgaXQgb25seSBsb29rcyBmb3IgZmlsZXMgdGhhdCBlbmQgaW4gb25lIG9mIHRoZSBgcmVsYXRpdmVFeHRlbnNpb25zYC5cbiAgICogRm9yIGV4YW1wbGU6IGAke21vZHVsZU5hbWV9LmpzYCBvciBgJHttb2R1bGVOYW1lfS9pbmRleC5qc2AuXG4gICAqIElmIG5laXRoZXIgb2YgdGhlc2UgZmlsZXMgZXhpc3QgdGhlbiB0aGUgbWV0aG9kIHJldHVybnMgYG51bGxgLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlQXNSZWxhdGl2ZVBhdGgobW9kdWxlTmFtZTogc3RyaW5nLCBmcm9tUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBSZXNvbHZlZE1vZHVsZXxudWxsIHtcbiAgICBjb25zdCByZXNvbHZlZFBhdGggPVxuICAgICAgICB0aGlzLnJlc29sdmVQYXRoKHJlc29sdmUoZGlybmFtZShmcm9tUGF0aCksIG1vZHVsZU5hbWUpLCB0aGlzLnJlbGF0aXZlRXh0ZW5zaW9ucyk7XG4gICAgcmV0dXJuIHJlc29sdmVkUGF0aCAmJiBuZXcgUmVzb2x2ZWRSZWxhdGl2ZU1vZHVsZShyZXNvbHZlZFBhdGgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byByZXNvbHZlIHRoZSBgbW9kdWxlTmFtZWAsIGJ5IGFwcGx5aW5nIHRoZSBjb21wdXRlZCBgcGF0aE1hcHBpbmdzYCBhbmRcbiAgICogdGhlbiB0cnlpbmcgdG8gcmVzb2x2ZSB0aGUgbWFwcGVkIHBhdGggYXMgYSByZWxhdGl2ZSBvciBleHRlcm5hbCBpbXBvcnQuXG4gICAqXG4gICAqIFdoZXRoZXIgdGhlIG1hcHBlZCBwYXRoIGlzIHJlbGF0aXZlIGlzIGRlZmluZWQgYXMgaXQgYmVpbmcgXCJiZWxvdyB0aGUgYGZyb21QYXRoYFwiIGFuZCBub3RcbiAgICogY29udGFpbmluZyBgbm9kZV9tb2R1bGVzYC5cbiAgICpcbiAgICogSWYgdGhlIG1hcHBlZCBwYXRoIGlzIG5vdCByZWxhdGl2ZSBidXQgZG9lcyBub3QgcmVzb2x2ZSB0byBhbiBleHRlcm5hbCBlbnRyeS1wb2ludCwgdGhlbiB3ZVxuICAgKiBjaGVjayB3aGV0aGVyIGl0IHdvdWxkIGhhdmUgcmVzb2x2ZWQgdG8gYSByZWxhdGl2ZSBwYXRoLCBpbiB3aGljaCBjYXNlIGl0IGlzIG1hcmtlZCBhcyBhXG4gICAqIFwiZGVlcC1pbXBvcnRcIi5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZUJ5UGF0aE1hcHBpbmdzKG1vZHVsZU5hbWU6IHN0cmluZywgZnJvbVBhdGg6IEFic29sdXRlRnNQYXRoKTogUmVzb2x2ZWRNb2R1bGV8bnVsbCB7XG4gICAgY29uc3QgbWFwcGVkUGF0aHMgPSB0aGlzLmZpbmRNYXBwZWRQYXRocyhtb2R1bGVOYW1lKTtcbiAgICBpZiAobWFwcGVkUGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgcGFja2FnZVBhdGggPSB0aGlzLmZpbmRQYWNrYWdlUGF0aChmcm9tUGF0aCk7XG4gICAgICBpZiAocGFja2FnZVBhdGggIT09IG51bGwpIHtcbiAgICAgICAgZm9yIChjb25zdCBtYXBwZWRQYXRoIG9mIG1hcHBlZFBhdGhzKSB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNFbnRyeVBvaW50KG1hcHBlZFBhdGgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkRXh0ZXJuYWxNb2R1bGUobWFwcGVkUGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG5vbkVudHJ5UG9pbnRJbXBvcnQgPSB0aGlzLnJlc29sdmVBc1JlbGF0aXZlUGF0aChtYXBwZWRQYXRoLCBmcm9tUGF0aCk7XG4gICAgICAgICAgaWYgKG5vbkVudHJ5UG9pbnRJbXBvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBpc1JlbGF0aXZlSW1wb3J0KHBhY2thZ2VQYXRoLCBtYXBwZWRQYXRoKSA/IG5vbkVudHJ5UG9pbnRJbXBvcnQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFJlc29sdmVkRGVlcEltcG9ydChtYXBwZWRQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIHJlc29sdmUgdGhlIGBtb2R1bGVOYW1lYCBhcyBhbiBleHRlcm5hbCBlbnRyeS1wb2ludCBieSBzZWFyY2hpbmcgdGhlIGBub2RlX21vZHVsZXNgXG4gICAqIGZvbGRlcnMgdXAgdGhlIHRyZWUgZm9yIGEgbWF0Y2hpbmcgYC4uLi9ub2RlX21vZHVsZXMvJHttb2R1bGVOYW1lfWAuXG4gICAqXG4gICAqIElmIGEgZm9sZGVyIGlzIGZvdW5kIGJ1dCB0aGUgcGF0aCBkb2VzIG5vdCBjb250YWluIGEgYHBhY2thZ2UuanNvbmAgdGhlbiBpdCBpcyBtYXJrZWQgYXMgYVxuICAgKiBcImRlZXAtaW1wb3J0XCIuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVBc0VudHJ5UG9pbnQobW9kdWxlTmFtZTogc3RyaW5nLCBmcm9tUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBSZXNvbHZlZE1vZHVsZXxudWxsIHtcbiAgICBsZXQgZm9sZGVyID0gZnJvbVBhdGg7XG4gICAgd2hpbGUgKCFpc1Jvb3QoZm9sZGVyKSkge1xuICAgICAgZm9sZGVyID0gZGlybmFtZShmb2xkZXIpO1xuICAgICAgaWYgKGZvbGRlci5lbmRzV2l0aCgnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgLy8gU2tpcCB1cCBpZiB0aGUgZm9sZGVyIGFscmVhZHkgZW5kcyBpbiBub2RlX21vZHVsZXNcbiAgICAgICAgZm9sZGVyID0gZGlybmFtZShmb2xkZXIpO1xuICAgICAgfVxuICAgICAgY29uc3QgbW9kdWxlUGF0aCA9IHJlc29sdmUoZm9sZGVyLCAnbm9kZV9tb2R1bGVzJywgbW9kdWxlTmFtZSk7XG4gICAgICBpZiAodGhpcy5pc0VudHJ5UG9pbnQobW9kdWxlUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNvbHZlZEV4dGVybmFsTW9kdWxlKG1vZHVsZVBhdGgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnJlc29sdmVBc1JlbGF0aXZlUGF0aChtb2R1bGVQYXRoLCBmcm9tUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNvbHZlZERlZXBJbXBvcnQobW9kdWxlUGF0aCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gcmVzb2x2ZSBhIGBwYXRoYCB0byBhIGZpbGUgYnkgYXBwZW5kaW5nIHRoZSBwcm92aWRlZCBgcG9zdEZpeGVzYFxuICAgKiB0byB0aGUgYHBhdGhgIGFuZCBjaGVja2luZyBpZiB0aGUgZmlsZSBleGlzdHMgb24gZGlzay5cbiAgICogQHJldHVybnMgQW4gYWJzb2x1dGUgcGF0aCB0byB0aGUgZmlyc3QgbWF0Y2hpbmcgZXhpc3RpbmcgZmlsZSwgb3IgYG51bGxgIGlmIG5vbmUgZXhpc3QuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVQYXRoKHBhdGg6IEFic29sdXRlRnNQYXRoLCBwb3N0Rml4ZXM6IHN0cmluZ1tdKTogQWJzb2x1dGVGc1BhdGh8bnVsbCB7XG4gICAgZm9yIChjb25zdCBwb3N0Rml4IG9mIHBvc3RGaXhlcykge1xuICAgICAgY29uc3QgdGVzdFBhdGggPSBhYnNvbHV0ZUZyb20ocGF0aCArIHBvc3RGaXgpO1xuICAgICAgaWYgKHRoaXMuZnMuZXhpc3RzKHRlc3RQYXRoKSkge1xuICAgICAgICByZXR1cm4gdGVzdFBhdGg7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbiB3ZSBjb25zaWRlciB0aGUgZ2l2ZW4gcGF0aCBhcyBhbiBlbnRyeS1wb2ludCB0byBhIHBhY2thZ2U/XG4gICAqXG4gICAqIFRoaXMgaXMgYWNoaWV2ZWQgYnkgY2hlY2tpbmcgZm9yIHRoZSBleGlzdGVuY2Ugb2YgYCR7bW9kdWxlUGF0aH0vcGFja2FnZS5qc29uYC5cbiAgICovXG4gIHByaXZhdGUgaXNFbnRyeVBvaW50KG1vZHVsZVBhdGg6IEFic29sdXRlRnNQYXRoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZnMuZXhpc3RzKGpvaW4obW9kdWxlUGF0aCwgJ3BhY2thZ2UuanNvbicpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSB0aGUgYHBhdGhNYXBwZXJzYCB0byB0aGUgYG1vZHVsZU5hbWVgIGFuZCByZXR1cm4gYWxsIHRoZSBwb3NzaWJsZVxuICAgKiBwYXRocyB0aGF0IG1hdGNoLlxuICAgKlxuICAgKiBUaGUgbWFwcGVkIHBhdGggaXMgY29tcHV0ZWQgZm9yIGVhY2ggdGVtcGxhdGUgaW4gYG1hcHBpbmcudGVtcGxhdGVzYCBieVxuICAgKiByZXBsYWNpbmcgdGhlIGBtYXRjaGVyLnByZWZpeGAgYW5kIGBtYXRjaGVyLnBvc3RmaXhgIHN0cmluZ3MgaW4gYHBhdGggd2l0aCB0aGVcbiAgICogYHRlbXBsYXRlLnByZWZpeGAgYW5kIGB0ZW1wbGF0ZS5wb3N0Zml4YCBzdHJpbmdzLlxuICAgKi9cbiAgcHJpdmF0ZSBmaW5kTWFwcGVkUGF0aHMobW9kdWxlTmFtZTogc3RyaW5nKTogQWJzb2x1dGVGc1BhdGhbXSB7XG4gICAgY29uc3QgbWF0Y2hlcyA9IHRoaXMucGF0aE1hcHBpbmdzLm1hcChtYXBwaW5nID0+IHRoaXMubWF0Y2hNYXBwaW5nKG1vZHVsZU5hbWUsIG1hcHBpbmcpKTtcblxuICAgIGxldCBiZXN0TWFwcGluZzogUHJvY2Vzc2VkUGF0aE1hcHBpbmd8dW5kZWZpbmVkO1xuICAgIGxldCBiZXN0TWF0Y2g6IHN0cmluZ3x1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgdGhpcy5wYXRoTWFwcGluZ3MubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICBjb25zdCBtYXBwaW5nID0gdGhpcy5wYXRoTWFwcGluZ3NbaW5kZXhdO1xuICAgICAgY29uc3QgbWF0Y2ggPSBtYXRjaGVzW2luZGV4XTtcbiAgICAgIGlmIChtYXRjaCAhPT0gbnVsbCkge1xuICAgICAgICAvLyBJZiB0aGlzIG1hcHBpbmcgaGFkIG5vIHdpbGRjYXJkIHRoZW4gdGhpcyBtdXN0IGJlIGEgY29tcGxldGUgbWF0Y2guXG4gICAgICAgIGlmICghbWFwcGluZy5tYXRjaGVyLmhhc1dpbGRjYXJkKSB7XG4gICAgICAgICAgYmVzdE1hdGNoID0gbWF0Y2g7XG4gICAgICAgICAgYmVzdE1hcHBpbmcgPSBtYXBwaW5nO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoZSBiZXN0IG1hdGNoZWQgbWFwcGluZyBpcyB0aGUgb25lIHdpdGggdGhlIGxvbmdlc3QgcHJlZml4LlxuICAgICAgICBpZiAoIWJlc3RNYXBwaW5nIHx8IG1hcHBpbmcubWF0Y2hlci5wcmVmaXggPiBiZXN0TWFwcGluZy5tYXRjaGVyLnByZWZpeCkge1xuICAgICAgICAgIGJlc3RNYXRjaCA9IG1hdGNoO1xuICAgICAgICAgIGJlc3RNYXBwaW5nID0gbWFwcGluZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAoYmVzdE1hcHBpbmcgIT09IHVuZGVmaW5lZCAmJiBiZXN0TWF0Y2ggIT09IHVuZGVmaW5lZCkgP1xuICAgICAgICB0aGlzLmNvbXB1dGVNYXBwZWRUZW1wbGF0ZXMoYmVzdE1hcHBpbmcsIGJlc3RNYXRjaCkgOlxuICAgICAgICBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHRvIGZpbmQgYSBtYXBwZWQgcGF0aCBmb3IgdGhlIGdpdmVuIGBwYXRoYCBhbmQgYSBgbWFwcGluZ2AuXG4gICAqXG4gICAqIFRoZSBgcGF0aGAgbWF0Y2hlcyB0aGUgYG1hcHBpbmdgIGlmIGlmIGl0IHN0YXJ0cyB3aXRoIGBtYXRjaGVyLnByZWZpeGAgYW5kIGVuZHMgd2l0aFxuICAgKiBgbWF0Y2hlci5wb3N0Zml4YC5cbiAgICpcbiAgICogQHJldHVybnMgdGhlIHdpbGRjYXJkIHNlZ21lbnQgb2YgYSBtYXRjaGVkIGBwYXRoYCwgb3IgYG51bGxgIGlmIG5vIG1hdGNoLlxuICAgKi9cbiAgcHJpdmF0ZSBtYXRjaE1hcHBpbmcocGF0aDogc3RyaW5nLCBtYXBwaW5nOiBQcm9jZXNzZWRQYXRoTWFwcGluZyk6IHN0cmluZ3xudWxsIHtcbiAgICBjb25zdCB7cHJlZml4LCBwb3N0Zml4LCBoYXNXaWxkY2FyZH0gPSBtYXBwaW5nLm1hdGNoZXI7XG4gICAgaWYgKGhhc1dpbGRjYXJkKSB7XG4gICAgICByZXR1cm4gKHBhdGguc3RhcnRzV2l0aChwcmVmaXgpICYmIHBhdGguZW5kc1dpdGgocG9zdGZpeCkpID9cbiAgICAgICAgICBwYXRoLnN1YnN0cmluZyhwcmVmaXgubGVuZ3RoLCBwYXRoLmxlbmd0aCAtIHBvc3RmaXgubGVuZ3RoKSA6XG4gICAgICAgICAgbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIChwYXRoID09PSBwcmVmaXgpID8gJycgOiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIHRoZSBjYW5kaWRhdGUgcGF0aHMgZnJvbSB0aGUgZ2l2ZW4gbWFwcGluZydzIHRlbXBsYXRlcyB1c2luZyB0aGUgbWF0Y2hlZFxuICAgKiBzdHJpbmcuXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVNYXBwZWRUZW1wbGF0ZXMobWFwcGluZzogUHJvY2Vzc2VkUGF0aE1hcHBpbmcsIG1hdGNoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gbWFwcGluZy50ZW1wbGF0ZXMubWFwKFxuICAgICAgICB0ZW1wbGF0ZSA9PiByZXNvbHZlKG1hcHBpbmcuYmFzZVVybCwgdGVtcGxhdGUucHJlZml4ICsgbWF0Y2ggKyB0ZW1wbGF0ZS5wb3N0Zml4KSk7XG4gIH1cblxuICAvKipcbiAgICogU2VhcmNoIHVwIHRoZSBmb2xkZXIgdHJlZSBmb3IgdGhlIGZpcnN0IGZvbGRlciB0aGF0IGNvbnRhaW5zIGBwYWNrYWdlLmpzb25gXG4gICAqIG9yIGBudWxsYCBpZiBub25lIGlzIGZvdW5kLlxuICAgKi9cbiAgcHJpdmF0ZSBmaW5kUGFja2FnZVBhdGgocGF0aDogQWJzb2x1dGVGc1BhdGgpOiBBYnNvbHV0ZUZzUGF0aHxudWxsIHtcbiAgICBsZXQgZm9sZGVyID0gcGF0aDtcbiAgICB3aGlsZSAoIWlzUm9vdChmb2xkZXIpKSB7XG4gICAgICBmb2xkZXIgPSBkaXJuYW1lKGZvbGRlcik7XG4gICAgICBpZiAodGhpcy5mcy5leGlzdHMoam9pbihmb2xkZXIsICdwYWNrYWdlLmpzb24nKSkpIHtcbiAgICAgICAgcmV0dXJuIGZvbGRlcjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqIFRoZSByZXN1bHQgb2YgcmVzb2x2aW5nIGFuIGltcG9ydCB0byBhIG1vZHVsZS4gKi9cbmV4cG9ydCB0eXBlIFJlc29sdmVkTW9kdWxlID0gUmVzb2x2ZWRFeHRlcm5hbE1vZHVsZSB8IFJlc29sdmVkUmVsYXRpdmVNb2R1bGUgfCBSZXNvbHZlZERlZXBJbXBvcnQ7XG5cbi8qKlxuICogQSBtb2R1bGUgdGhhdCBpcyBleHRlcm5hbCB0byB0aGUgcGFja2FnZSBkb2luZyB0aGUgaW1wb3J0aW5nLlxuICogSW4gdGhpcyBjYXNlIHdlIGNhcHR1cmUgdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc29sdmVkRXh0ZXJuYWxNb2R1bGUge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgZW50cnlQb2ludFBhdGg6IEFic29sdXRlRnNQYXRoKSB7fVxufVxuXG4vKipcbiAqIEEgbW9kdWxlIHRoYXQgaXMgcmVsYXRpdmUgdG8gdGhlIG1vZHVsZSBkb2luZyB0aGUgaW1wb3J0aW5nLCBhbmQgc28gaW50ZXJuYWwgdG8gdGhlXG4gKiBzb3VyY2UgbW9kdWxlJ3MgcGFja2FnZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc29sdmVkUmVsYXRpdmVNb2R1bGUge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgbW9kdWxlUGF0aDogQWJzb2x1dGVGc1BhdGgpIHt9XG59XG5cbi8qKlxuICogQSBtb2R1bGUgdGhhdCBpcyBleHRlcm5hbCB0byB0aGUgcGFja2FnZSBkb2luZyB0aGUgaW1wb3J0aW5nIGJ1dCBwb2ludGluZyB0byBhXG4gKiBtb2R1bGUgdGhhdCBpcyBkZWVwIGluc2lkZSBhIHBhY2thZ2UsIHJhdGhlciB0aGFuIHRvIGFuIGVudHJ5LXBvaW50IG9mIHRoZSBwYWNrYWdlLlxuICovXG5leHBvcnQgY2xhc3MgUmVzb2x2ZWREZWVwSW1wb3J0IHtcbiAgY29uc3RydWN0b3IocHVibGljIGltcG9ydFBhdGg6IEFic29sdXRlRnNQYXRoKSB7fVxufVxuXG5mdW5jdGlvbiBzcGxpdE9uU3RhcihzdHI6IHN0cmluZyk6IFBhdGhNYXBwaW5nUGF0dGVybiB7XG4gIGNvbnN0IFtwcmVmaXgsIHBvc3RmaXhdID0gc3RyLnNwbGl0KCcqJywgMik7XG4gIHJldHVybiB7cHJlZml4LCBwb3N0Zml4OiBwb3N0Zml4IHx8ICcnLCBoYXNXaWxkY2FyZDogcG9zdGZpeCAhPT0gdW5kZWZpbmVkfTtcbn1cblxuaW50ZXJmYWNlIFByb2Nlc3NlZFBhdGhNYXBwaW5nIHtcbiAgYmFzZVVybDogQWJzb2x1dGVGc1BhdGg7XG4gIG1hdGNoZXI6IFBhdGhNYXBwaW5nUGF0dGVybjtcbiAgdGVtcGxhdGVzOiBQYXRoTWFwcGluZ1BhdHRlcm5bXTtcbn1cblxuaW50ZXJmYWNlIFBhdGhNYXBwaW5nUGF0dGVybiB7XG4gIHByZWZpeDogc3RyaW5nO1xuICBwb3N0Zml4OiBzdHJpbmc7XG4gIGhhc1dpbGRjYXJkOiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiBpc1JlbGF0aXZlSW1wb3J0KGZyb206IEFic29sdXRlRnNQYXRoLCB0bzogQWJzb2x1dGVGc1BhdGgpIHtcbiAgcmV0dXJuIHRvLnN0YXJ0c1dpdGgoZnJvbSkgJiYgIXRvLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKTtcbn1cbiJdfQ==