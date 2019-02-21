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
        define("@angular/compiler-cli/src/ngtsc/resource_loader", ["require", "exports", "tslib", "fs", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var fs = require("fs");
    var ts = require("typescript");
    var CSS_PREPROCESSOR_EXT = /(\.scss|\.less|\.styl)$/;
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
                fs.readFileSync(resolvedUrl, 'utf8');
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
            // Strip a leading '/' if one is present.
            if (url.startsWith('/')) {
                url = url.substr(1);
            }
            // Turn absolute paths into relative paths.
            if (!url.startsWith('.')) {
                url = "./" + url;
            }
            var candidateLocations = this.getCandidateLocations(url, fromFile);
            try {
                for (var candidateLocations_1 = tslib_1.__values(candidateLocations), candidateLocations_1_1 = candidateLocations_1.next(); !candidateLocations_1_1.done; candidateLocations_1_1 = candidateLocations_1.next()) {
                    var candidate = candidateLocations_1_1.value;
                    if (fs.existsSync(candidate)) {
                        return candidate;
                    }
                    else if (CSS_PREPROCESSOR_EXT.test(candidate)) {
                        /**
                         * If the user specified styleUrl points to *.scss, but the Sass compiler was run before
                         * Angular, then the resource may have been generated as *.css. Simply try the resolution
                         * again.
                         */
                        var cssFallbackUrl = candidate.replace(CSS_PREPROCESSOR_EXT, '.css');
                        if (fs.existsSync(cssFallbackUrl)) {
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
        /**
         * TypeScript provides utilities to resolve module names, but not resource files (which aren't
         * a part of the ts.Program). However, TypeScript's module resolution can be used creatively
         * to locate where resource files should be expected to exist. Since module resolution returns
         * a list of file names that were considered, the loader can enumerate the possible locations
         * for the file by setting up a module resolution for it that will fail.
         */
        HostResourceLoader.prototype.getCandidateLocations = function (url, fromFile) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VfbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9yZXNvdXJjZV9sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsdUJBQXlCO0lBQ3pCLCtCQUFpQztJQUlqQyxJQUFNLG9CQUFvQixHQUFHLHlCQUF5QixDQUFDO0lBRXZEOztPQUVHO0lBQ0g7UUFNRSw0QkFBb0IsSUFBa0IsRUFBVSxPQUEyQjtZQUF2RCxTQUFJLEdBQUosSUFBSSxDQUFjO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBb0I7WUFMbkUsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQ2xDLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBeUIsQ0FBQztZQUVwRCxlQUFVLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBRXdDLENBQUM7UUFFL0U7Ozs7Ozs7Ozs7O1dBV0c7UUFDSCxvQ0FBTyxHQUFQLFVBQVEsR0FBVyxFQUFFLFFBQWdCO1lBQ25DLElBQUksV0FBVyxHQUFnQixJQUFJLENBQUM7WUFDcEMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFO2dCQUNwQyxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDL0Q7aUJBQU07Z0JBQ0wsV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ25EO1lBQ0QsSUFBSSxXQUFXLEtBQUssSUFBSSxFQUFFO2dCQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLDZDQUEyQyxHQUFHLHVCQUFrQixRQUFRLE1BQUcsQ0FBQyxDQUFDO2FBQzlGO1lBQ0QsT0FBTyxXQUFXLENBQUM7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b3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtDb21waWxlckhvc3R9IGZyb20gJy4uL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0IHtSZXNvdXJjZUxvYWRlcn0gZnJvbSAnLi9hbm5vdGF0aW9ucy9zcmMvYXBpJztcblxuY29uc3QgQ1NTX1BSRVBST0NFU1NPUl9FWFQgPSAvKFxcLnNjc3N8XFwubGVzc3xcXC5zdHlsKSQvO1xuXG4vKipcbiAqIGBSZXNvdXJjZUxvYWRlcmAgd2hpY2ggZGVsZWdhdGVzIHRvIGEgYENvbXBpbGVySG9zdGAgcmVzb3VyY2UgbG9hZGluZyBtZXRob2QuXG4gKi9cbmV4cG9ydCBjbGFzcyBIb3N0UmVzb3VyY2VMb2FkZXIgaW1wbGVtZW50cyBSZXNvdXJjZUxvYWRlciB7XG4gIHByaXZhdGUgY2FjaGUgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIGZldGNoaW5nID0gbmV3IE1hcDxzdHJpbmcsIFByb21pc2U8dm9pZD4+KCk7XG5cbiAgY2FuUHJlbG9hZCA9ICEhdGhpcy5ob3N0LnJlYWRSZXNvdXJjZTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGhvc3Q6IENvbXBpbGVySG9zdCwgcHJpdmF0ZSBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMpIHt9XG5cbiAgLyoqXG4gICAqIFJlc29sdmUgdGhlIHVybCBvZiBhIHJlc291cmNlIHJlbGF0aXZlIHRvIHRoZSBmaWxlIHRoYXQgY29udGFpbnMgdGhlIHJlZmVyZW5jZSB0byBpdC5cbiAgICogVGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIG1ldGhvZCBjYW4gYmUgdXNlZCBpbiB0aGUgYGxvYWQoKWAgYW5kIGBwcmVsb2FkKClgIG1ldGhvZHMuXG4gICAqXG4gICAqIFVzZXMgdGhlIHByb3ZpZGVkIENvbXBpbGVySG9zdCBpZiBpdCBzdXBwb3J0cyBtYXBwaW5nIHJlc291cmNlcyB0byBmaWxlbmFtZXMuXG4gICAqIE90aGVyd2lzZSwgdXNlcyBhIGZhbGxiYWNrIG1lY2hhbmlzbSB0aGF0IHNlYXJjaGVzIHRoZSBtb2R1bGUgcmVzb2x1dGlvbiBjYW5kaWRhdGVzLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsIFRoZSwgcG9zc2libHkgcmVsYXRpdmUsIHVybCBvZiB0aGUgcmVzb3VyY2UuXG4gICAqIEBwYXJhbSBmcm9tRmlsZSBUaGUgcGF0aCB0byB0aGUgZmlsZSB0aGF0IGNvbnRhaW5zIHRoZSBVUkwgb2YgdGhlIHJlc291cmNlLlxuICAgKiBAcmV0dXJucyBBIHJlc29sdmVkIHVybCBvZiByZXNvdXJjZS5cbiAgICogQHRocm93cyBBbiBlcnJvciBpZiB0aGUgcmVzb3VyY2UgY2Fubm90IGJlIHJlc29sdmVkLlxuICAgKi9cbiAgcmVzb2x2ZSh1cmw6IHN0cmluZywgZnJvbUZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgbGV0IHJlc29sdmVkVXJsOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMuaG9zdC5yZXNvdXJjZU5hbWVUb0ZpbGVOYW1lKSB7XG4gICAgICByZXNvbHZlZFVybCA9IHRoaXMuaG9zdC5yZXNvdXJjZU5hbWVUb0ZpbGVOYW1lKHVybCwgZnJvbUZpbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlZFVybCA9IHRoaXMuZmFsbGJhY2tSZXNvbHZlKHVybCwgZnJvbUZpbGUpO1xuICAgIH1cbiAgICBpZiAocmVzb2x2ZWRVcmwgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSG9zdFJlc291cmNlUmVzb2x2ZXI6IGNvdWxkIG5vdCByZXNvbHZlICR7dXJsfSBpbiBjb250ZXh0IG9mICR7ZnJvbUZpbGV9KWApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZWRVcmw7XG4gIH1cblxuICAvKipcbiAgICogUHJlbG9hZCB0aGUgc3BlY2lmaWVkIHJlc291cmNlLCBhc3luY2hyb25vdXNseS5cbiAgICpcbiAgICogT25jZSB0aGUgcmVzb3VyY2UgaXMgbG9hZGVkLCBpdHMgdmFsdWUgaXMgY2FjaGVkIHNvIGl0IGNhbiBiZSBhY2Nlc3NlZCBzeW5jaHJvbm91c2x5IHZpYSB0aGVcbiAgICogYGxvYWQoKWAgbWV0aG9kLlxuICAgKlxuICAgKiBAcGFyYW0gcmVzb2x2ZWRVcmwgVGhlIHVybCAocmVzb2x2ZWQgYnkgYSBjYWxsIHRvIGByZXNvbHZlKClgKSBvZiB0aGUgcmVzb3VyY2UgdG8gcHJlbG9hZC5cbiAgICogQHJldHVybnMgQSBQcm9taXNlIHRoYXQgaXMgcmVzb2x2ZWQgb25jZSB0aGUgcmVzb3VyY2UgaGFzIGJlZW4gbG9hZGVkIG9yIGB1bmRlZmluZWRgIGlmIHRoZVxuICAgKiBmaWxlIGhhcyBhbHJlYWR5IGJlZW4gbG9hZGVkLlxuICAgKiBAdGhyb3dzIEFuIEVycm9yIGlmIHByZS1sb2FkaW5nIGlzIG5vdCBhdmFpbGFibGUuXG4gICAqL1xuICBwcmVsb2FkKHJlc29sdmVkVXJsOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLmhvc3QucmVhZFJlc291cmNlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ0hvc3RSZXNvdXJjZUxvYWRlcjogdGhlIENvbXBpbGVySG9zdCBwcm92aWRlZCBkb2VzIG5vdCBzdXBwb3J0IHByZS1sb2FkaW5nIHJlc291cmNlcy4nKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKHJlc29sdmVkVXJsKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZmV0Y2hpbmcuaGFzKHJlc29sdmVkVXJsKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hpbmcuZ2V0KHJlc29sdmVkVXJsKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmhvc3QucmVhZFJlc291cmNlKHJlc29sdmVkVXJsKTtcbiAgICBpZiAodHlwZW9mIHJlc3VsdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KHJlc29sdmVkVXJsLCByZXN1bHQpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZmV0Y2hDb21wbGV0aW9uID0gcmVzdWx0LnRoZW4oc3RyID0+IHtcbiAgICAgICAgdGhpcy5mZXRjaGluZy5kZWxldGUocmVzb2x2ZWRVcmwpO1xuICAgICAgICB0aGlzLmNhY2hlLnNldChyZXNvbHZlZFVybCwgc3RyKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5mZXRjaGluZy5zZXQocmVzb2x2ZWRVcmwsIGZldGNoQ29tcGxldGlvbik7XG4gICAgICByZXR1cm4gZmV0Y2hDb21wbGV0aW9uO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBMb2FkIHRoZSByZXNvdXJjZSBhdCB0aGUgZ2l2ZW4gdXJsLCBzeW5jaHJvbm91c2x5LlxuICAgKlxuICAgKiBUaGUgY29udGVudHMgb2YgdGhlIHJlc291cmNlIG1heSBoYXZlIGJlZW4gY2FjaGVkIGJ5IGEgcHJldmlvdXMgY2FsbCB0byBgcHJlbG9hZCgpYC5cbiAgICpcbiAgICogQHBhcmFtIHJlc29sdmVkVXJsIFRoZSB1cmwgKHJlc29sdmVkIGJ5IGEgY2FsbCB0byBgcmVzb2x2ZSgpYCkgb2YgdGhlIHJlc291cmNlIHRvIGxvYWQuXG4gICAqIEByZXR1cm5zIFRoZSBjb250ZW50cyBvZiB0aGUgcmVzb3VyY2UuXG4gICAqL1xuICBsb2FkKHJlc29sdmVkVXJsOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLmNhY2hlLmhhcyhyZXNvbHZlZFVybCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlLmdldChyZXNvbHZlZFVybCkgITtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmhvc3QucmVhZFJlc291cmNlID8gdGhpcy5ob3N0LnJlYWRSZXNvdXJjZShyZXNvbHZlZFVybCkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcy5yZWFkRmlsZVN5bmMocmVzb2x2ZWRVcmwsICd1dGY4Jyk7XG4gICAgaWYgKHR5cGVvZiByZXN1bHQgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEhvc3RSZXNvdXJjZUxvYWRlcjogbG9hZGVyKCR7cmVzb2x2ZWRVcmx9KSByZXR1cm5lZCBhIFByb21pc2VgKTtcbiAgICB9XG4gICAgdGhpcy5jYWNoZS5zZXQocmVzb2x2ZWRVcmwsIHJlc3VsdCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHRvIHJlc29sdmUgYHVybGAgaW4gdGhlIGNvbnRleHQgb2YgYGZyb21GaWxlYCwgd2hpbGUgcmVzcGVjdGluZyB0aGUgcm9vdERpcnNcbiAgICogb3B0aW9uIGZyb20gdGhlIHRzY29uZmlnLiBGaXJzdCwgbm9ybWFsaXplIHRoZSBmaWxlIG5hbWUuXG4gICAqL1xuICBwcml2YXRlIGZhbGxiYWNrUmVzb2x2ZSh1cmw6IHN0cmluZywgZnJvbUZpbGU6IHN0cmluZyk6IHN0cmluZ3xudWxsIHtcbiAgICAvLyBTdHJpcCBhIGxlYWRpbmcgJy8nIGlmIG9uZSBpcyBwcmVzZW50LlxuICAgIGlmICh1cmwuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICB1cmwgPSB1cmwuc3Vic3RyKDEpO1xuICAgIH1cbiAgICAvLyBUdXJuIGFic29sdXRlIHBhdGhzIGludG8gcmVsYXRpdmUgcGF0aHMuXG4gICAgaWYgKCF1cmwuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICB1cmwgPSBgLi8ke3VybH1gO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbmRpZGF0ZUxvY2F0aW9ucyA9IHRoaXMuZ2V0Q2FuZGlkYXRlTG9jYXRpb25zKHVybCwgZnJvbUZpbGUpO1xuICAgIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZUxvY2F0aW9ucykge1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoY2FuZGlkYXRlKSkge1xuICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgfSBlbHNlIGlmIChDU1NfUFJFUFJPQ0VTU09SX0VYVC50ZXN0KGNhbmRpZGF0ZSkpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIHRoZSB1c2VyIHNwZWNpZmllZCBzdHlsZVVybCBwb2ludHMgdG8gKi5zY3NzLCBidXQgdGhlIFNhc3MgY29tcGlsZXIgd2FzIHJ1biBiZWZvcmVcbiAgICAgICAgICogQW5ndWxhciwgdGhlbiB0aGUgcmVzb3VyY2UgbWF5IGhhdmUgYmVlbiBnZW5lcmF0ZWQgYXMgKi5jc3MuIFNpbXBseSB0cnkgdGhlIHJlc29sdXRpb25cbiAgICAgICAgICogYWdhaW4uXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBjc3NGYWxsYmFja1VybCA9IGNhbmRpZGF0ZS5yZXBsYWNlKENTU19QUkVQUk9DRVNTT1JfRVhULCAnLmNzcycpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhjc3NGYWxsYmFja1VybCkpIHtcbiAgICAgICAgICByZXR1cm4gY3NzRmFsbGJhY2tVcmw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBUeXBlU2NyaXB0IHByb3ZpZGVzIHV0aWxpdGllcyB0byByZXNvbHZlIG1vZHVsZSBuYW1lcywgYnV0IG5vdCByZXNvdXJjZSBmaWxlcyAod2hpY2ggYXJlbid0XG4gICAqIGEgcGFydCBvZiB0aGUgdHMuUHJvZ3JhbSkuIEhvd2V2ZXIsIFR5cGVTY3JpcHQncyBtb2R1bGUgcmVzb2x1dGlvbiBjYW4gYmUgdXNlZCBjcmVhdGl2ZWx5XG4gICAqIHRvIGxvY2F0ZSB3aGVyZSByZXNvdXJjZSBmaWxlcyBzaG91bGQgYmUgZXhwZWN0ZWQgdG8gZXhpc3QuIFNpbmNlIG1vZHVsZSByZXNvbHV0aW9uIHJldHVybnNcbiAgICogYSBsaXN0IG9mIGZpbGUgbmFtZXMgdGhhdCB3ZXJlIGNvbnNpZGVyZWQsIHRoZSBsb2FkZXIgY2FuIGVudW1lcmF0ZSB0aGUgcG9zc2libGUgbG9jYXRpb25zXG4gICAqIGZvciB0aGUgZmlsZSBieSBzZXR0aW5nIHVwIGEgbW9kdWxlIHJlc29sdXRpb24gZm9yIGl0IHRoYXQgd2lsbCBmYWlsLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRDYW5kaWRhdGVMb2NhdGlvbnModXJsOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgLy8gYGZhaWxlZExvb2t1cExvY2F0aW9uc2AgaXMgaW4gdGhlIG5hbWUgb2YgdGhlIHR5cGUgdHMuUmVzb2x2ZWRNb2R1bGVXaXRoRmFpbGVkTG9va3VwTG9jYXRpb25zXG4gICAgLy8gYnV0IGlzIG1hcmtlZCBAaW50ZXJuYWwgaW4gVHlwZVNjcmlwdC4gU2VlXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8yODc3MC5cbiAgICB0eXBlIFJlc29sdmVkTW9kdWxlV2l0aEZhaWxlZExvb2t1cExvY2F0aW9ucyA9XG4gICAgICAgIHRzLlJlc29sdmVkTW9kdWxlV2l0aEZhaWxlZExvb2t1cExvY2F0aW9ucyAmIHtmYWlsZWRMb29rdXBMb2NhdGlvbnM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPn07XG5cbiAgICAvLyBjbGFuZy1mb3JtYXQgb2ZmXG4gICAgY29uc3QgZmFpbGVkTG9va3VwID0gdHMucmVzb2x2ZU1vZHVsZU5hbWUodXJsICsgJy4kbmdyZXNvdXJjZSQnLCBmcm9tRmlsZSwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpIGFzIFJlc29sdmVkTW9kdWxlV2l0aEZhaWxlZExvb2t1cExvY2F0aW9ucztcbiAgICAvLyBjbGFuZy1mb3JtYXQgb25cbiAgICBpZiAoZmFpbGVkTG9va3VwLmZhaWxlZExvb2t1cExvY2F0aW9ucyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEludGVybmFsIGVycm9yOiBleHBlY3RlZCB0byBmaW5kIGZhaWxlZExvb2t1cExvY2F0aW9ucyBkdXJpbmcgcmVzb2x1dGlvbiBvZiByZXNvdXJjZSAnJHt1cmx9JyBpbiBjb250ZXh0IG9mICR7ZnJvbUZpbGV9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhaWxlZExvb2t1cC5mYWlsZWRMb29rdXBMb2NhdGlvbnNcbiAgICAgICAgLmZpbHRlcihjYW5kaWRhdGUgPT4gY2FuZGlkYXRlLmVuZHNXaXRoKCcuJG5ncmVzb3VyY2UkLnRzJykpXG4gICAgICAgIC5tYXAoY2FuZGlkYXRlID0+IGNhbmRpZGF0ZS5yZXBsYWNlKC9cXC5cXCRuZ3Jlc291cmNlXFwkXFwudHMkLywgJycpKTtcbiAgfVxufVxuIl19