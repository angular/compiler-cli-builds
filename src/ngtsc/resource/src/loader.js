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
        define("@angular/compiler-cli/src/ngtsc/resource/src/loader", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HostResourceLoader = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var CSS_PREPROCESSOR_EXT = /(\.scss|\.sass|\.less|\.styl)$/;
    /**
     * `ResourceLoader` which delegates to a `CompilerHost` resource loading method.
     */
    var HostResourceLoader = /** @class */ (function () {
        function HostResourceLoader(host, options) {
            this.host = host;
            this.options = options;
            this.cache = new Map();
            this.fetching = new Map();
            this.canPreload = !!this.host.readResource;
            this.rootDirs = typescript_1.getRootDirs(host, options);
        }
        /**
         * Resolve the url of a resource relative to the file that contains the reference to it.
         * The return value of this method can be used in the `load()` and `preload()` methods.
         *
         * Uses the provided CompilerHost if it supports mapping resources to filenames.
         * Otherwise, uses a fallback mechanism that searches the module resolution candidates.
         *
         * @param url The, possibly relative, url of the resource.
         * @param fromFile The path to the file that contains the URL of the resource.
         * @returns A resolved url of resource.
         * @throws An error if the resource cannot be resolved.
         */
        HostResourceLoader.prototype.resolve = function (url, fromFile) {
            var resolvedUrl = null;
            if (this.host.resourceNameToFileName) {
                resolvedUrl = this.host.resourceNameToFileName(url, fromFile);
            }
            else {
                resolvedUrl = this.fallbackResolve(url, fromFile);
            }
            if (resolvedUrl === null) {
                throw new Error("HostResourceResolver: could not resolve " + url + " in context of " + fromFile + ")");
            }
            return resolvedUrl;
        };
        /**
         * Preload the specified resource, asynchronously.
         *
         * Once the resource is loaded, its value is cached so it can be accessed synchronously via the
         * `load()` method.
         *
         * @param resolvedUrl The url (resolved by a call to `resolve()`) of the resource to preload.
         * @returns A Promise that is resolved once the resource has been loaded or `undefined` if the
         * file has already been loaded.
         * @throws An Error if pre-loading is not available.
         */
        HostResourceLoader.prototype.preload = function (resolvedUrl) {
            var _this = this;
            if (!this.host.readResource) {
                throw new Error('HostResourceLoader: the CompilerHost provided does not support pre-loading resources.');
            }
            if (this.cache.has(resolvedUrl)) {
                return undefined;
            }
            else if (this.fetching.has(resolvedUrl)) {
                return this.fetching.get(resolvedUrl);
            }
            var result = this.host.readResource(resolvedUrl);
            if (typeof result === 'string') {
                this.cache.set(resolvedUrl, result);
                return undefined;
            }
            else {
                var fetchCompletion = result.then(function (str) {
                    _this.fetching.delete(resolvedUrl);
                    _this.cache.set(resolvedUrl, str);
                });
                this.fetching.set(resolvedUrl, fetchCompletion);
                return fetchCompletion;
            }
        };
        /**
         * Load the resource at the given url, synchronously.
         *
         * The contents of the resource may have been cached by a previous call to `preload()`.
         *
         * @param resolvedUrl The url (resolved by a call to `resolve()`) of the resource to load.
         * @returns The contents of the resource.
         */
        HostResourceLoader.prototype.load = function (resolvedUrl) {
            if (this.cache.has(resolvedUrl)) {
                return this.cache.get(resolvedUrl);
            }
            var result = this.host.readResource ? this.host.readResource(resolvedUrl) :
                this.host.readFile(resolvedUrl);
            if (typeof result !== 'string') {
                throw new Error("HostResourceLoader: loader(" + resolvedUrl + ") returned a Promise");
            }
            this.cache.set(resolvedUrl, result);
            return result;
        };
        /**
         * Attempt to resolve `url` in the context of `fromFile`, while respecting the rootDirs
         * option from the tsconfig. First, normalize the file name.
         */
        HostResourceLoader.prototype.fallbackResolve = function (url, fromFile) {
            var e_1, _a;
            var candidateLocations;
            if (url.startsWith('/')) {
                // This path is not really an absolute path, but instead the leading '/' means that it's
                // rooted in the project rootDirs. So look for it according to the rootDirs.
                candidateLocations = this.getRootedCandidateLocations(url);
            }
            else {
                // This path is a "relative" path and can be resolved as such. To make this easier on the
                // downstream resolver, the './' prefix is added if missing to distinguish these paths from
                // absolute node_modules paths.
                if (!url.startsWith('.')) {
                    url = "./" + url;
                }
                candidateLocations = this.getResolvedCandidateLocations(url, fromFile);
            }
            try {
                for (var candidateLocations_1 = tslib_1.__values(candidateLocations), candidateLocations_1_1 = candidateLocations_1.next(); !candidateLocations_1_1.done; candidateLocations_1_1 = candidateLocations_1.next()) {
                    var candidate = candidateLocations_1_1.value;
                    if (this.host.fileExists(candidate)) {
                        return candidate;
                    }
                    else if (CSS_PREPROCESSOR_EXT.test(candidate)) {
                        /**
                         * If the user specified styleUrl points to *.scss, but the Sass compiler was run before
                         * Angular, then the resource may have been generated as *.css. Simply try the resolution
                         * again.
                         */
                        var cssFallbackUrl = candidate.replace(CSS_PREPROCESSOR_EXT, '.css');
                        if (this.host.fileExists(cssFallbackUrl)) {
                            return cssFallbackUrl;
                        }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (candidateLocations_1_1 && !candidateLocations_1_1.done && (_a = candidateLocations_1.return)) _a.call(candidateLocations_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return null;
        };
        HostResourceLoader.prototype.getRootedCandidateLocations = function (url) {
            // The path already starts with '/', so add a '.' to make it relative.
            var segment = ('.' + url);
            return this.rootDirs.map(function (rootDir) { return file_system_1.join(rootDir, segment); });
        };
        /**
         * TypeScript provides utilities to resolve module names, but not resource files (which aren't
         * a part of the ts.Program). However, TypeScript's module resolution can be used creatively
         * to locate where resource files should be expected to exist. Since module resolution returns
         * a list of file names that were considered, the loader can enumerate the possible locations
         * for the file by setting up a module resolution for it that will fail.
         */
        HostResourceLoader.prototype.getResolvedCandidateLocations = function (url, fromFile) {
            // clang-format off
            var failedLookup = ts.resolveModuleName(url + '.$ngresource$', fromFile, this.options, this.host);
            // clang-format on
            if (failedLookup.failedLookupLocations === undefined) {
                throw new Error("Internal error: expected to find failedLookupLocations during resolution of resource '" + url + "' in context of " + fromFile);
            }
            return failedLookup.failedLookupLocations
                .filter(function (candidate) { return candidate.endsWith('.$ngresource$.ts'); })
                .map(function (candidate) { return candidate.replace(/\.\$ngresource\$\.ts$/, ''); });
        };
        return HostResourceLoader;
    }());
    exports.HostResourceLoader = HostResourceLoader;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9yZXNvdXJjZS9zcmMvbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFJakMsMkVBQW9FO0lBQ3BFLGtGQUFzRDtJQUV0RCxJQUFNLG9CQUFvQixHQUFHLGdDQUFnQyxDQUFDO0lBRTlEOztPQUVHO0lBQ0g7UUFRRSw0QkFBb0IsSUFBNEIsRUFBVSxPQUEyQjtZQUFqRSxTQUFJLEdBQUosSUFBSSxDQUF3QjtZQUFVLFlBQU8sR0FBUCxPQUFPLENBQW9CO1lBUDdFLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztZQUNsQyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7WUFJcEQsZUFBVSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUdwQyxJQUFJLENBQUMsUUFBUSxHQUFHLHdCQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRDs7Ozs7Ozs7Ozs7V0FXRztRQUNILG9DQUFPLEdBQVAsVUFBUSxHQUFXLEVBQUUsUUFBZ0I7WUFDbkMsSUFBSSxXQUFXLEdBQWdCLElBQUksQ0FBQztZQUNwQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUU7Z0JBQ3BDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUMvRDtpQkFBTTtnQkFDTCxXQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDbkQ7WUFDRCxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLE1BQU0sSUFB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WUFDL0ksa0JBQWtCO1lBQ2xCLElBQUksWUFBWSxDQUFDLHFCQUFxQixLQUFLLFNBQVMsRUFBRTtnQkFDcEQsTUFBTSxJQUFJLEtBQUssQ0FDWCwyRkFDSSxHQUFHLHdCQUFtQixRQUFVLENBQUMsQ0FBQzthQUMzQztZQUVELE9BQU8sWUFBWSxDQUFDLHFCQUFxQjtpQkFDcEMsTUFBTSxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUF0QyxDQUFzQyxDQUFDO2lCQUMzRCxHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQyxFQUE5QyxDQUE4QyxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQXRLRCxJQXNLQztJQXRLWSxnREFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1Jlc291cmNlTG9hZGVyfSBmcm9tICcuLi8uLi9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge0V4dGVuZGVkVHNDb21waWxlckhvc3R9IGZyb20gJy4uLy4uL2NvcmUvYXBpJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGpvaW4sIFBhdGhTZWdtZW50fSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge2dldFJvb3REaXJzfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuY29uc3QgQ1NTX1BSRVBST0NFU1NPUl9FWFQgPSAvKFxcLnNjc3N8XFwuc2Fzc3xcXC5sZXNzfFxcLnN0eWwpJC87XG5cbi8qKlxuICogYFJlc291cmNlTG9hZGVyYCB3aGljaCBkZWxlZ2F0ZXMgdG8gYSBgQ29tcGlsZXJIb3N0YCByZXNvdXJjZSBsb2FkaW5nIG1ldGhvZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEhvc3RSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgcHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgZmV0Y2hpbmcgPSBuZXcgTWFwPHN0cmluZywgUHJvbWlzZTx2b2lkPj4oKTtcblxuICBwcml2YXRlIHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuXG4gIGNhblByZWxvYWQgPSAhIXRoaXMuaG9zdC5yZWFkUmVzb3VyY2U7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBob3N0OiBFeHRlbmRlZFRzQ29tcGlsZXJIb3N0LCBwcml2YXRlIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucykge1xuICAgIHRoaXMucm9vdERpcnMgPSBnZXRSb290RGlycyhob3N0LCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIHRoZSB1cmwgb2YgYSByZXNvdXJjZSByZWxhdGl2ZSB0byB0aGUgZmlsZSB0aGF0IGNvbnRhaW5zIHRoZSByZWZlcmVuY2UgdG8gaXQuXG4gICAqIFRoZSByZXR1cm4gdmFsdWUgb2YgdGhpcyBtZXRob2QgY2FuIGJlIHVzZWQgaW4gdGhlIGBsb2FkKClgIGFuZCBgcHJlbG9hZCgpYCBtZXRob2RzLlxuICAgKlxuICAgKiBVc2VzIHRoZSBwcm92aWRlZCBDb21waWxlckhvc3QgaWYgaXQgc3VwcG9ydHMgbWFwcGluZyByZXNvdXJjZXMgdG8gZmlsZW5hbWVzLlxuICAgKiBPdGhlcndpc2UsIHVzZXMgYSBmYWxsYmFjayBtZWNoYW5pc20gdGhhdCBzZWFyY2hlcyB0aGUgbW9kdWxlIHJlc29sdXRpb24gY2FuZGlkYXRlcy5cbiAgICpcbiAgICogQHBhcmFtIHVybCBUaGUsIHBvc3NpYmx5IHJlbGF0aXZlLCB1cmwgb2YgdGhlIHJlc291cmNlLlxuICAgKiBAcGFyYW0gZnJvbUZpbGUgVGhlIHBhdGggdG8gdGhlIGZpbGUgdGhhdCBjb250YWlucyB0aGUgVVJMIG9mIHRoZSByZXNvdXJjZS5cbiAgICogQHJldHVybnMgQSByZXNvbHZlZCB1cmwgb2YgcmVzb3VyY2UuXG4gICAqIEB0aHJvd3MgQW4gZXJyb3IgaWYgdGhlIHJlc291cmNlIGNhbm5vdCBiZSByZXNvbHZlZC5cbiAgICovXG4gIHJlc29sdmUodXJsOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGxldCByZXNvbHZlZFVybDogc3RyaW5nfG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmhvc3QucmVzb3VyY2VOYW1lVG9GaWxlTmFtZSkge1xuICAgICAgcmVzb2x2ZWRVcmwgPSB0aGlzLmhvc3QucmVzb3VyY2VOYW1lVG9GaWxlTmFtZSh1cmwsIGZyb21GaWxlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZWRVcmwgPSB0aGlzLmZhbGxiYWNrUmVzb2x2ZSh1cmwsIGZyb21GaWxlKTtcbiAgICB9XG4gICAgaWYgKHJlc29sdmVkVXJsID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEhvc3RSZXNvdXJjZVJlc29sdmVyOiBjb3VsZCBub3QgcmVzb2x2ZSAke3VybH0gaW4gY29udGV4dCBvZiAke2Zyb21GaWxlfSlgKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc29sdmVkVXJsO1xuICB9XG5cbiAgLyoqXG4gICAqIFByZWxvYWQgdGhlIHNwZWNpZmllZCByZXNvdXJjZSwgYXN5bmNocm9ub3VzbHkuXG4gICAqXG4gICAqIE9uY2UgdGhlIHJlc291cmNlIGlzIGxvYWRlZCwgaXRzIHZhbHVlIGlzIGNhY2hlZCBzbyBpdCBjYW4gYmUgYWNjZXNzZWQgc3luY2hyb25vdXNseSB2aWEgdGhlXG4gICAqIGBsb2FkKClgIG1ldGhvZC5cbiAgICpcbiAgICogQHBhcmFtIHJlc29sdmVkVXJsIFRoZSB1cmwgKHJlc29sdmVkIGJ5IGEgY2FsbCB0byBgcmVzb2x2ZSgpYCkgb2YgdGhlIHJlc291cmNlIHRvIHByZWxvYWQuXG4gICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0aGF0IGlzIHJlc29sdmVkIG9uY2UgdGhlIHJlc291cmNlIGhhcyBiZWVuIGxvYWRlZCBvciBgdW5kZWZpbmVkYCBpZiB0aGVcbiAgICogZmlsZSBoYXMgYWxyZWFkeSBiZWVuIGxvYWRlZC5cbiAgICogQHRocm93cyBBbiBFcnJvciBpZiBwcmUtbG9hZGluZyBpcyBub3QgYXZhaWxhYmxlLlxuICAgKi9cbiAgcHJlbG9hZChyZXNvbHZlZFVybDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIGlmICghdGhpcy5ob3N0LnJlYWRSZXNvdXJjZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdIb3N0UmVzb3VyY2VMb2FkZXI6IHRoZSBDb21waWxlckhvc3QgcHJvdmlkZWQgZG9lcyBub3Qgc3VwcG9ydCBwcmUtbG9hZGluZyByZXNvdXJjZXMuJyk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNhY2hlLmhhcyhyZXNvbHZlZFVybCkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIGlmICh0aGlzLmZldGNoaW5nLmhhcyhyZXNvbHZlZFVybCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmZldGNoaW5nLmdldChyZXNvbHZlZFVybCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ob3N0LnJlYWRSZXNvdXJjZShyZXNvbHZlZFVybCk7XG4gICAgaWYgKHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChyZXNvbHZlZFVybCwgcmVzdWx0KTtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGZldGNoQ29tcGxldGlvbiA9IHJlc3VsdC50aGVuKHN0ciA9PiB7XG4gICAgICAgIHRoaXMuZmV0Y2hpbmcuZGVsZXRlKHJlc29sdmVkVXJsKTtcbiAgICAgICAgdGhpcy5jYWNoZS5zZXQocmVzb2x2ZWRVcmwsIHN0cik7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuZmV0Y2hpbmcuc2V0KHJlc29sdmVkVXJsLCBmZXRjaENvbXBsZXRpb24pO1xuICAgICAgcmV0dXJuIGZldGNoQ29tcGxldGlvbjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTG9hZCB0aGUgcmVzb3VyY2UgYXQgdGhlIGdpdmVuIHVybCwgc3luY2hyb25vdXNseS5cbiAgICpcbiAgICogVGhlIGNvbnRlbnRzIG9mIHRoZSByZXNvdXJjZSBtYXkgaGF2ZSBiZWVuIGNhY2hlZCBieSBhIHByZXZpb3VzIGNhbGwgdG8gYHByZWxvYWQoKWAuXG4gICAqXG4gICAqIEBwYXJhbSByZXNvbHZlZFVybCBUaGUgdXJsIChyZXNvbHZlZCBieSBhIGNhbGwgdG8gYHJlc29sdmUoKWApIG9mIHRoZSByZXNvdXJjZSB0byBsb2FkLlxuICAgKiBAcmV0dXJucyBUaGUgY29udGVudHMgb2YgdGhlIHJlc291cmNlLlxuICAgKi9cbiAgbG9hZChyZXNvbHZlZFVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBpZiAodGhpcy5jYWNoZS5oYXMocmVzb2x2ZWRVcmwpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQocmVzb2x2ZWRVcmwpITtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmhvc3QucmVhZFJlc291cmNlID8gdGhpcy5ob3N0LnJlYWRSZXNvdXJjZShyZXNvbHZlZFVybCkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhvc3QucmVhZEZpbGUocmVzb2x2ZWRVcmwpO1xuICAgIGlmICh0eXBlb2YgcmVzdWx0ICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBIb3N0UmVzb3VyY2VMb2FkZXI6IGxvYWRlcigke3Jlc29sdmVkVXJsfSkgcmV0dXJuZWQgYSBQcm9taXNlYCk7XG4gICAgfVxuICAgIHRoaXMuY2FjaGUuc2V0KHJlc29sdmVkVXJsLCByZXN1bHQpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCB0byByZXNvbHZlIGB1cmxgIGluIHRoZSBjb250ZXh0IG9mIGBmcm9tRmlsZWAsIHdoaWxlIHJlc3BlY3RpbmcgdGhlIHJvb3REaXJzXG4gICAqIG9wdGlvbiBmcm9tIHRoZSB0c2NvbmZpZy4gRmlyc3QsIG5vcm1hbGl6ZSB0aGUgZmlsZSBuYW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBmYWxsYmFja1Jlc29sdmUodXJsOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpOiBzdHJpbmd8bnVsbCB7XG4gICAgbGV0IGNhbmRpZGF0ZUxvY2F0aW9uczogc3RyaW5nW107XG4gICAgaWYgKHVybC5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIC8vIFRoaXMgcGF0aCBpcyBub3QgcmVhbGx5IGFuIGFic29sdXRlIHBhdGgsIGJ1dCBpbnN0ZWFkIHRoZSBsZWFkaW5nICcvJyBtZWFucyB0aGF0IGl0J3NcbiAgICAgIC8vIHJvb3RlZCBpbiB0aGUgcHJvamVjdCByb290RGlycy4gU28gbG9vayBmb3IgaXQgYWNjb3JkaW5nIHRvIHRoZSByb290RGlycy5cbiAgICAgIGNhbmRpZGF0ZUxvY2F0aW9ucyA9IHRoaXMuZ2V0Um9vdGVkQ2FuZGlkYXRlTG9jYXRpb25zKHVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoaXMgcGF0aCBpcyBhIFwicmVsYXRpdmVcIiBwYXRoIGFuZCBjYW4gYmUgcmVzb2x2ZWQgYXMgc3VjaC4gVG8gbWFrZSB0aGlzIGVhc2llciBvbiB0aGVcbiAgICAgIC8vIGRvd25zdHJlYW0gcmVzb2x2ZXIsIHRoZSAnLi8nIHByZWZpeCBpcyBhZGRlZCBpZiBtaXNzaW5nIHRvIGRpc3Rpbmd1aXNoIHRoZXNlIHBhdGhzIGZyb21cbiAgICAgIC8vIGFic29sdXRlIG5vZGVfbW9kdWxlcyBwYXRocy5cbiAgICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgICB1cmwgPSBgLi8ke3VybH1gO1xuICAgICAgfVxuICAgICAgY2FuZGlkYXRlTG9jYXRpb25zID0gdGhpcy5nZXRSZXNvbHZlZENhbmRpZGF0ZUxvY2F0aW9ucyh1cmwsIGZyb21GaWxlKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVMb2NhdGlvbnMpIHtcbiAgICAgIGlmICh0aGlzLmhvc3QuZmlsZUV4aXN0cyhjYW5kaWRhdGUpKSB7XG4gICAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgICB9IGVsc2UgaWYgKENTU19QUkVQUk9DRVNTT1JfRVhULnRlc3QoY2FuZGlkYXRlKSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogSWYgdGhlIHVzZXIgc3BlY2lmaWVkIHN0eWxlVXJsIHBvaW50cyB0byAqLnNjc3MsIGJ1dCB0aGUgU2FzcyBjb21waWxlciB3YXMgcnVuIGJlZm9yZVxuICAgICAgICAgKiBBbmd1bGFyLCB0aGVuIHRoZSByZXNvdXJjZSBtYXkgaGF2ZSBiZWVuIGdlbmVyYXRlZCBhcyAqLmNzcy4gU2ltcGx5IHRyeSB0aGUgcmVzb2x1dGlvblxuICAgICAgICAgKiBhZ2Fpbi5cbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0IGNzc0ZhbGxiYWNrVXJsID0gY2FuZGlkYXRlLnJlcGxhY2UoQ1NTX1BSRVBST0NFU1NPUl9FWFQsICcuY3NzJyk7XG4gICAgICAgIGlmICh0aGlzLmhvc3QuZmlsZUV4aXN0cyhjc3NGYWxsYmFja1VybCkpIHtcbiAgICAgICAgICByZXR1cm4gY3NzRmFsbGJhY2tVcmw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGdldFJvb3RlZENhbmRpZGF0ZUxvY2F0aW9ucyh1cmw6IHN0cmluZyk6IEFic29sdXRlRnNQYXRoW10ge1xuICAgIC8vIFRoZSBwYXRoIGFscmVhZHkgc3RhcnRzIHdpdGggJy8nLCBzbyBhZGQgYSAnLicgdG8gbWFrZSBpdCByZWxhdGl2ZS5cbiAgICBjb25zdCBzZWdtZW50OiBQYXRoU2VnbWVudCA9ICgnLicgKyB1cmwpIGFzIFBhdGhTZWdtZW50O1xuICAgIHJldHVybiB0aGlzLnJvb3REaXJzLm1hcChyb290RGlyID0+IGpvaW4ocm9vdERpciwgc2VnbWVudCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFR5cGVTY3JpcHQgcHJvdmlkZXMgdXRpbGl0aWVzIHRvIHJlc29sdmUgbW9kdWxlIG5hbWVzLCBidXQgbm90IHJlc291cmNlIGZpbGVzICh3aGljaCBhcmVuJ3RcbiAgICogYSBwYXJ0IG9mIHRoZSB0cy5Qcm9ncmFtKS4gSG93ZXZlciwgVHlwZVNjcmlwdCdzIG1vZHVsZSByZXNvbHV0aW9uIGNhbiBiZSB1c2VkIGNyZWF0aXZlbHlcbiAgICogdG8gbG9jYXRlIHdoZXJlIHJlc291cmNlIGZpbGVzIHNob3VsZCBiZSBleHBlY3RlZCB0byBleGlzdC4gU2luY2UgbW9kdWxlIHJlc29sdXRpb24gcmV0dXJuc1xuICAgKiBhIGxpc3Qgb2YgZmlsZSBuYW1lcyB0aGF0IHdlcmUgY29uc2lkZXJlZCwgdGhlIGxvYWRlciBjYW4gZW51bWVyYXRlIHRoZSBwb3NzaWJsZSBsb2NhdGlvbnNcbiAgICogZm9yIHRoZSBmaWxlIGJ5IHNldHRpbmcgdXAgYSBtb2R1bGUgcmVzb2x1dGlvbiBmb3IgaXQgdGhhdCB3aWxsIGZhaWwuXG4gICAqL1xuICBwcml2YXRlIGdldFJlc29sdmVkQ2FuZGlkYXRlTG9jYXRpb25zKHVybDogc3RyaW5nLCBmcm9tRmlsZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIC8vIGBmYWlsZWRMb29rdXBMb2NhdGlvbnNgIGlzIGluIHRoZSBuYW1lIG9mIHRoZSB0eXBlIHRzLlJlc29sdmVkTW9kdWxlV2l0aEZhaWxlZExvb2t1cExvY2F0aW9uc1xuICAgIC8vIGJ1dCBpcyBtYXJrZWQgQGludGVybmFsIGluIFR5cGVTY3JpcHQuIFNlZVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjg3NzAuXG4gICAgdHlwZSBSZXNvbHZlZE1vZHVsZVdpdGhGYWlsZWRMb29rdXBMb2NhdGlvbnMgPVxuICAgICAgICB0cy5SZXNvbHZlZE1vZHVsZVdpdGhGYWlsZWRMb29rdXBMb2NhdGlvbnMme2ZhaWxlZExvb2t1cExvY2F0aW9uczogUmVhZG9ubHlBcnJheTxzdHJpbmc+fTtcblxuICAgIC8vIGNsYW5nLWZvcm1hdCBvZmZcbiAgICBjb25zdCBmYWlsZWRMb29rdXAgPSB0cy5yZXNvbHZlTW9kdWxlTmFtZSh1cmwgKyAnLiRuZ3Jlc291cmNlJCcsIGZyb21GaWxlLCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdCkgYXMgUmVzb2x2ZWRNb2R1bGVXaXRoRmFpbGVkTG9va3VwTG9jYXRpb25zO1xuICAgIC8vIGNsYW5nLWZvcm1hdCBvblxuICAgIGlmIChmYWlsZWRMb29rdXAuZmFpbGVkTG9va3VwTG9jYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgSW50ZXJuYWwgZXJyb3I6IGV4cGVjdGVkIHRvIGZpbmQgZmFpbGVkTG9va3VwTG9jYXRpb25zIGR1cmluZyByZXNvbHV0aW9uIG9mIHJlc291cmNlICcke1xuICAgICAgICAgICAgICB1cmx9JyBpbiBjb250ZXh0IG9mICR7ZnJvbUZpbGV9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhaWxlZExvb2t1cC5mYWlsZWRMb29rdXBMb2NhdGlvbnNcbiAgICAgICAgLmZpbHRlcihjYW5kaWRhdGUgPT4gY2FuZGlkYXRlLmVuZHNXaXRoKCcuJG5ncmVzb3VyY2UkLnRzJykpXG4gICAgICAgIC5tYXAoY2FuZGlkYXRlID0+IGNhbmRpZGF0ZS5yZXBsYWNlKC9cXC5cXCRuZ3Jlc291cmNlXFwkXFwudHMkLywgJycpKTtcbiAgfVxufVxuIl19