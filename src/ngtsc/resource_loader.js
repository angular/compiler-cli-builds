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
        define("@angular/compiler-cli/src/ngtsc/resource_loader", ["require", "exports", "fs", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs = require("fs");
    const ts = require("typescript");
    const CSS_PREPROCESSOR_EXT = /(\.scss|\.less|\.styl)$/;
    /**
     * `ResourceLoader` which delegates to a `CompilerHost` resource loading method.
     */
    class HostResourceLoader {
        constructor(host, options) {
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
        resolve(url, fromFile) {
            let resolvedUrl = null;
            if (this.host.resourceNameToFileName) {
                resolvedUrl = this.host.resourceNameToFileName(url, fromFile);
            }
            else {
                resolvedUrl = this.fallbackResolve(url, fromFile);
            }
            if (resolvedUrl === null) {
                throw new Error(`HostResourceResolver: could not resolve ${url} in context of ${fromFile})`);
            }
            return resolvedUrl;
        }
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
        preload(resolvedUrl) {
            if (!this.host.readResource) {
                throw new Error('HostResourceLoader: the CompilerHost provided does not support pre-loading resources.');
            }
            if (this.cache.has(resolvedUrl)) {
                return undefined;
            }
            else if (this.fetching.has(resolvedUrl)) {
                return this.fetching.get(resolvedUrl);
            }
            const result = this.host.readResource(resolvedUrl);
            if (typeof result === 'string') {
                this.cache.set(resolvedUrl, result);
                return undefined;
            }
            else {
                const fetchCompletion = result.then(str => {
                    this.fetching.delete(resolvedUrl);
                    this.cache.set(resolvedUrl, str);
                });
                this.fetching.set(resolvedUrl, fetchCompletion);
                return fetchCompletion;
            }
        }
        /**
         * Load the resource at the given url, synchronously.
         *
         * The contents of the resource may have been cached by a previous call to `preload()`.
         *
         * @param resolvedUrl The url (resolved by a call to `resolve()`) of the resource to load.
         * @returns The contents of the resource.
         */
        load(resolvedUrl) {
            if (this.cache.has(resolvedUrl)) {
                return this.cache.get(resolvedUrl);
            }
            const result = this.host.readResource ? this.host.readResource(resolvedUrl) :
                fs.readFileSync(resolvedUrl, 'utf8');
            if (typeof result !== 'string') {
                throw new Error(`HostResourceLoader: loader(${resolvedUrl}) returned a Promise`);
            }
            this.cache.set(resolvedUrl, result);
            return result;
        }
        /**
         * Attempt to resolve `url` in the context of `fromFile`, while respecting the rootDirs
         * option from the tsconfig. First, normalize the file name.
         */
        fallbackResolve(url, fromFile) {
            // Strip a leading '/' if one is present.
            if (url.startsWith('/')) {
                url = url.substr(1);
                // Do not take current file location into account if we process absolute path.
                fromFile = '';
            }
            // Turn absolute paths into relative paths.
            if (!url.startsWith('.')) {
                url = `./${url}`;
            }
            const candidateLocations = this.getCandidateLocations(url, fromFile);
            for (const candidate of candidateLocations) {
                if (fs.existsSync(candidate)) {
                    return candidate;
                }
                else if (CSS_PREPROCESSOR_EXT.test(candidate)) {
                    /**
                     * If the user specified styleUrl points to *.scss, but the Sass compiler was run before
                     * Angular, then the resource may have been generated as *.css. Simply try the resolution
                     * again.
                     */
                    const cssFallbackUrl = candidate.replace(CSS_PREPROCESSOR_EXT, '.css');
                    if (fs.existsSync(cssFallbackUrl)) {
                        return cssFallbackUrl;
                    }
                }
            }
            return null;
        }
        /**
         * TypeScript provides utilities to resolve module names, but not resource files (which aren't
         * a part of the ts.Program). However, TypeScript's module resolution can be used creatively
         * to locate where resource files should be expected to exist. Since module resolution returns
         * a list of file names that were considered, the loader can enumerate the possible locations
         * for the file by setting up a module resolution for it that will fail.
         */
        getCandidateLocations(url, fromFile) {
            // clang-format off
            const failedLookup = ts.resolveModuleName(url + '.$ngresource$', fromFile, this.options, this.host);
            // clang-format on
            if (failedLookup.failedLookupLocations === undefined) {
                throw new Error(`Internal error: expected to find failedLookupLocations during resolution of resource '${url}' in context of ${fromFile}`);
            }
            return failedLookup.failedLookupLocations
                .filter(candidate => candidate.endsWith('.$ngresource$.ts'))
                .map(candidate => candidate.replace(/\.\$ngresource\$\.ts$/, ''));
        }
    }
    exports.HostResourceLoader = HostResourceLoader;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VfbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9yZXNvdXJjZV9sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCx5QkFBeUI7SUFDekIsaUNBQWlDO0lBSWpDLE1BQU0sb0JBQW9CLEdBQUcseUJBQXlCLENBQUM7SUFFdkQ7O09BRUc7SUFDSCxNQUFhLGtCQUFrQjtRQU03QixZQUFvQixJQUFrQixFQUFVLE9BQTJCO1lBQXZELFNBQUksR0FBSixJQUFJLENBQWM7WUFBVSxZQUFPLEdBQVAsT0FBTyxDQUFvQjtZQUxuRSxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7WUFDbEMsYUFBUSxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO1lBRXBELGVBQVUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7UUFFd0MsQ0FBQztRQUUvRTs7Ozs7Ozs7Ozs7V0FXRztRQUNILE9BQU8sQ0FBQyxHQUFXLEVBQUUsUUFBZ0I7WUFDbkMsSUFBSSxXQUFXLEdBQWdCLElBQUksQ0FBQztZQUNwQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUU7Z0JBQ3BDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQzthQUMvRDtpQkFBTTtnQkFDTCxXQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDbkQ7WUFDRCxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLEdBQUcsa0JBQWtCLFFBQVEsR0FBRyxDQUFDLENBQUM7YUFDOUY7WUFDRCxPQUFPLFdBQVcs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Q0FBQyxFQUFFO29CQUM1QixPQUFPLFNBQVMsQ0FBQztpQkFDbEI7cUJBQU0sSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7b0JBQy9DOzs7O3VCQUlHO29CQUNILE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQ3ZFLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsRUFBRTt3QkFDakMsT0FBTyxjQUFjLENBQUM7cUJBQ3ZCO2lCQUNGO2FBQ0Y7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFHRDs7Ozs7O1dBTUc7UUFDSyxxQkFBcUIsQ0FBQyxHQUFXLEVBQUUsUUFBZ0I7WUFPekQsbUJBQW1CO1lBQ25CLE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEdBQUcsZUFBZSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQTRDLENBQUM7WUFDL0ksa0JBQWtCO1lBQ2xCLElBQUksWUFBWSxDQUFDLHFCQUFxQixLQUFLLFNBQVMsRUFBRTtnQkFDcEQsTUFBTSxJQUFJLEtBQUssQ0FDWCx5RkFBeUYsR0FBRyxtQkFBbUIsUUFBUSxFQUFFLENBQUMsQ0FBQzthQUNoSTtZQUVELE9BQU8sWUFBWSxDQUFDLHFCQUFxQjtpQkFDcEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2lCQUMzRCxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEUsQ0FBQztLQUNGO0lBMUpELGdEQTBKQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0NvbXBpbGVySG9zdH0gZnJvbSAnLi4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge1Jlc291cmNlTG9hZGVyfSBmcm9tICcuL2Fubm90YXRpb25zL3NyYy9hcGknO1xuXG5jb25zdCBDU1NfUFJFUFJPQ0VTU09SX0VYVCA9IC8oXFwuc2Nzc3xcXC5sZXNzfFxcLnN0eWwpJC87XG5cbi8qKlxuICogYFJlc291cmNlTG9hZGVyYCB3aGljaCBkZWxlZ2F0ZXMgdG8gYSBgQ29tcGlsZXJIb3N0YCByZXNvdXJjZSBsb2FkaW5nIG1ldGhvZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEhvc3RSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgcHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgZmV0Y2hpbmcgPSBuZXcgTWFwPHN0cmluZywgUHJvbWlzZTx2b2lkPj4oKTtcblxuICBjYW5QcmVsb2FkID0gISF0aGlzLmhvc3QucmVhZFJlc291cmNlO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgaG9zdDogQ29tcGlsZXJIb3N0LCBwcml2YXRlIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucykge31cblxuICAvKipcbiAgICogUmVzb2x2ZSB0aGUgdXJsIG9mIGEgcmVzb3VyY2UgcmVsYXRpdmUgdG8gdGhlIGZpbGUgdGhhdCBjb250YWlucyB0aGUgcmVmZXJlbmNlIHRvIGl0LlxuICAgKiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgbWV0aG9kIGNhbiBiZSB1c2VkIGluIHRoZSBgbG9hZCgpYCBhbmQgYHByZWxvYWQoKWAgbWV0aG9kcy5cbiAgICpcbiAgICogVXNlcyB0aGUgcHJvdmlkZWQgQ29tcGlsZXJIb3N0IGlmIGl0IHN1cHBvcnRzIG1hcHBpbmcgcmVzb3VyY2VzIHRvIGZpbGVuYW1lcy5cbiAgICogT3RoZXJ3aXNlLCB1c2VzIGEgZmFsbGJhY2sgbWVjaGFuaXNtIHRoYXQgc2VhcmNoZXMgdGhlIG1vZHVsZSByZXNvbHV0aW9uIGNhbmRpZGF0ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB1cmwgVGhlLCBwb3NzaWJseSByZWxhdGl2ZSwgdXJsIG9mIHRoZSByZXNvdXJjZS5cbiAgICogQHBhcmFtIGZyb21GaWxlIFRoZSBwYXRoIHRvIHRoZSBmaWxlIHRoYXQgY29udGFpbnMgdGhlIFVSTCBvZiB0aGUgcmVzb3VyY2UuXG4gICAqIEByZXR1cm5zIEEgcmVzb2x2ZWQgdXJsIG9mIHJlc291cmNlLlxuICAgKiBAdGhyb3dzIEFuIGVycm9yIGlmIHRoZSByZXNvdXJjZSBjYW5ub3QgYmUgcmVzb2x2ZWQuXG4gICAqL1xuICByZXNvbHZlKHVybDogc3RyaW5nLCBmcm9tRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBsZXQgcmVzb2x2ZWRVcmw6IHN0cmluZ3xudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5ob3N0LnJlc291cmNlTmFtZVRvRmlsZU5hbWUpIHtcbiAgICAgIHJlc29sdmVkVXJsID0gdGhpcy5ob3N0LnJlc291cmNlTmFtZVRvRmlsZU5hbWUodXJsLCBmcm9tRmlsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmVkVXJsID0gdGhpcy5mYWxsYmFja1Jlc29sdmUodXJsLCBmcm9tRmlsZSk7XG4gICAgfVxuICAgIGlmIChyZXNvbHZlZFVybCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBIb3N0UmVzb3VyY2VSZXNvbHZlcjogY291bGQgbm90IHJlc29sdmUgJHt1cmx9IGluIGNvbnRleHQgb2YgJHtmcm9tRmlsZX0pYCk7XG4gICAgfVxuICAgIHJldHVybiByZXNvbHZlZFVybDtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmVsb2FkIHRoZSBzcGVjaWZpZWQgcmVzb3VyY2UsIGFzeW5jaHJvbm91c2x5LlxuICAgKlxuICAgKiBPbmNlIHRoZSByZXNvdXJjZSBpcyBsb2FkZWQsIGl0cyB2YWx1ZSBpcyBjYWNoZWQgc28gaXQgY2FuIGJlIGFjY2Vzc2VkIHN5bmNocm9ub3VzbHkgdmlhIHRoZVxuICAgKiBgbG9hZCgpYCBtZXRob2QuXG4gICAqXG4gICAqIEBwYXJhbSByZXNvbHZlZFVybCBUaGUgdXJsIChyZXNvbHZlZCBieSBhIGNhbGwgdG8gYHJlc29sdmUoKWApIG9mIHRoZSByZXNvdXJjZSB0byBwcmVsb2FkLlxuICAgKiBAcmV0dXJucyBBIFByb21pc2UgdGhhdCBpcyByZXNvbHZlZCBvbmNlIHRoZSByZXNvdXJjZSBoYXMgYmVlbiBsb2FkZWQgb3IgYHVuZGVmaW5lZGAgaWYgdGhlXG4gICAqIGZpbGUgaGFzIGFscmVhZHkgYmVlbiBsb2FkZWQuXG4gICAqIEB0aHJvd3MgQW4gRXJyb3IgaWYgcHJlLWxvYWRpbmcgaXMgbm90IGF2YWlsYWJsZS5cbiAgICovXG4gIHByZWxvYWQocmVzb2x2ZWRVcmw6IHN0cmluZyk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuaG9zdC5yZWFkUmVzb3VyY2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnSG9zdFJlc291cmNlTG9hZGVyOiB0aGUgQ29tcGlsZXJIb3N0IHByb3ZpZGVkIGRvZXMgbm90IHN1cHBvcnQgcHJlLWxvYWRpbmcgcmVzb3VyY2VzLicpO1xuICAgIH1cbiAgICBpZiAodGhpcy5jYWNoZS5oYXMocmVzb2x2ZWRVcmwpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSBpZiAodGhpcy5mZXRjaGluZy5oYXMocmVzb2x2ZWRVcmwpKSB7XG4gICAgICByZXR1cm4gdGhpcy5mZXRjaGluZy5nZXQocmVzb2x2ZWRVcmwpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuaG9zdC5yZWFkUmVzb3VyY2UocmVzb2x2ZWRVcmwpO1xuICAgIGlmICh0eXBlb2YgcmVzdWx0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5jYWNoZS5zZXQocmVzb2x2ZWRVcmwsIHJlc3VsdCk7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBmZXRjaENvbXBsZXRpb24gPSByZXN1bHQudGhlbihzdHIgPT4ge1xuICAgICAgICB0aGlzLmZldGNoaW5nLmRlbGV0ZShyZXNvbHZlZFVybCk7XG4gICAgICAgIHRoaXMuY2FjaGUuc2V0KHJlc29sdmVkVXJsLCBzdHIpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmZldGNoaW5nLnNldChyZXNvbHZlZFVybCwgZmV0Y2hDb21wbGV0aW9uKTtcbiAgICAgIHJldHVybiBmZXRjaENvbXBsZXRpb247XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIExvYWQgdGhlIHJlc291cmNlIGF0IHRoZSBnaXZlbiB1cmwsIHN5bmNocm9ub3VzbHkuXG4gICAqXG4gICAqIFRoZSBjb250ZW50cyBvZiB0aGUgcmVzb3VyY2UgbWF5IGhhdmUgYmVlbiBjYWNoZWQgYnkgYSBwcmV2aW91cyBjYWxsIHRvIGBwcmVsb2FkKClgLlxuICAgKlxuICAgKiBAcGFyYW0gcmVzb2x2ZWRVcmwgVGhlIHVybCAocmVzb2x2ZWQgYnkgYSBjYWxsIHRvIGByZXNvbHZlKClgKSBvZiB0aGUgcmVzb3VyY2UgdG8gbG9hZC5cbiAgICogQHJldHVybnMgVGhlIGNvbnRlbnRzIG9mIHRoZSByZXNvdXJjZS5cbiAgICovXG4gIGxvYWQocmVzb2x2ZWRVcmw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKHJlc29sdmVkVXJsKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KHJlc29sdmVkVXJsKSAhO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuaG9zdC5yZWFkUmVzb3VyY2UgPyB0aGlzLmhvc3QucmVhZFJlc291cmNlKHJlc29sdmVkVXJsKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLnJlYWRGaWxlU3luYyhyZXNvbHZlZFVybCwgJ3V0ZjgnKTtcbiAgICBpZiAodHlwZW9mIHJlc3VsdCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSG9zdFJlc291cmNlTG9hZGVyOiBsb2FkZXIoJHtyZXNvbHZlZFVybH0pIHJldHVybmVkIGEgUHJvbWlzZWApO1xuICAgIH1cbiAgICB0aGlzLmNhY2hlLnNldChyZXNvbHZlZFVybCwgcmVzdWx0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIEF0dGVtcHQgdG8gcmVzb2x2ZSBgdXJsYCBpbiB0aGUgY29udGV4dCBvZiBgZnJvbUZpbGVgLCB3aGlsZSByZXNwZWN0aW5nIHRoZSByb290RGlyc1xuICAgKiBvcHRpb24gZnJvbSB0aGUgdHNjb25maWcuIEZpcnN0LCBub3JtYWxpemUgdGhlIGZpbGUgbmFtZS5cbiAgICovXG4gIHByaXZhdGUgZmFsbGJhY2tSZXNvbHZlKHVybDogc3RyaW5nLCBmcm9tRmlsZTogc3RyaW5nKTogc3RyaW5nfG51bGwge1xuICAgIC8vIFN0cmlwIGEgbGVhZGluZyAnLycgaWYgb25lIGlzIHByZXNlbnQuXG4gICAgaWYgKHVybC5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgIHVybCA9IHVybC5zdWJzdHIoMSk7XG5cbiAgICAgIC8vIERvIG5vdCB0YWtlIGN1cnJlbnQgZmlsZSBsb2NhdGlvbiBpbnRvIGFjY291bnQgaWYgd2UgcHJvY2VzcyBhYnNvbHV0ZSBwYXRoLlxuICAgICAgZnJvbUZpbGUgPSAnJztcbiAgICB9XG4gICAgLy8gVHVybiBhYnNvbHV0ZSBwYXRocyBpbnRvIHJlbGF0aXZlIHBhdGhzLlxuICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgdXJsID0gYC4vJHt1cmx9YDtcbiAgICB9XG5cbiAgICBjb25zdCBjYW5kaWRhdGVMb2NhdGlvbnMgPSB0aGlzLmdldENhbmRpZGF0ZUxvY2F0aW9ucyh1cmwsIGZyb21GaWxlKTtcbiAgICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVMb2NhdGlvbnMpIHtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkpIHtcbiAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICAgIH0gZWxzZSBpZiAoQ1NTX1BSRVBST0NFU1NPUl9FWFQudGVzdChjYW5kaWRhdGUpKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiB0aGUgdXNlciBzcGVjaWZpZWQgc3R5bGVVcmwgcG9pbnRzIHRvICouc2NzcywgYnV0IHRoZSBTYXNzIGNvbXBpbGVyIHdhcyBydW4gYmVmb3JlXG4gICAgICAgICAqIEFuZ3VsYXIsIHRoZW4gdGhlIHJlc291cmNlIG1heSBoYXZlIGJlZW4gZ2VuZXJhdGVkIGFzICouY3NzLiBTaW1wbHkgdHJ5IHRoZSByZXNvbHV0aW9uXG4gICAgICAgICAqIGFnYWluLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3QgY3NzRmFsbGJhY2tVcmwgPSBjYW5kaWRhdGUucmVwbGFjZShDU1NfUFJFUFJPQ0VTU09SX0VYVCwgJy5jc3MnKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoY3NzRmFsbGJhY2tVcmwpKSB7XG4gICAgICAgICAgcmV0dXJuIGNzc0ZhbGxiYWNrVXJsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cblxuICAvKipcbiAgICogVHlwZVNjcmlwdCBwcm92aWRlcyB1dGlsaXRpZXMgdG8gcmVzb2x2ZSBtb2R1bGUgbmFtZXMsIGJ1dCBub3QgcmVzb3VyY2UgZmlsZXMgKHdoaWNoIGFyZW4ndFxuICAgKiBhIHBhcnQgb2YgdGhlIHRzLlByb2dyYW0pLiBIb3dldmVyLCBUeXBlU2NyaXB0J3MgbW9kdWxlIHJlc29sdXRpb24gY2FuIGJlIHVzZWQgY3JlYXRpdmVseVxuICAgKiB0byBsb2NhdGUgd2hlcmUgcmVzb3VyY2UgZmlsZXMgc2hvdWxkIGJlIGV4cGVjdGVkIHRvIGV4aXN0LiBTaW5jZSBtb2R1bGUgcmVzb2x1dGlvbiByZXR1cm5zXG4gICAqIGEgbGlzdCBvZiBmaWxlIG5hbWVzIHRoYXQgd2VyZSBjb25zaWRlcmVkLCB0aGUgbG9hZGVyIGNhbiBlbnVtZXJhdGUgdGhlIHBvc3NpYmxlIGxvY2F0aW9uc1xuICAgKiBmb3IgdGhlIGZpbGUgYnkgc2V0dGluZyB1cCBhIG1vZHVsZSByZXNvbHV0aW9uIGZvciBpdCB0aGF0IHdpbGwgZmFpbC5cbiAgICovXG4gIHByaXZhdGUgZ2V0Q2FuZGlkYXRlTG9jYXRpb25zKHVybDogc3RyaW5nLCBmcm9tRmlsZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIC8vIGBmYWlsZWRMb29rdXBMb2NhdGlvbnNgIGlzIGluIHRoZSBuYW1lIG9mIHRoZSB0eXBlIHRzLlJlc29sdmVkTW9kdWxlV2l0aEZhaWxlZExvb2t1cExvY2F0aW9uc1xuICAgIC8vIGJ1dCBpcyBtYXJrZWQgQGludGVybmFsIGluIFR5cGVTY3JpcHQuIFNlZVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjg3NzAuXG4gICAgdHlwZSBSZXNvbHZlZE1vZHVsZVdpdGhGYWlsZWRMb29rdXBMb2NhdGlvbnMgPVxuICAgICAgICB0cy5SZXNvbHZlZE1vZHVsZVdpdGhGYWlsZWRMb29rdXBMb2NhdGlvbnMgJiB7ZmFpbGVkTG9va3VwTG9jYXRpb25zOiBSZWFkb25seUFycmF5PHN0cmluZz59O1xuXG4gICAgLy8gY2xhbmctZm9ybWF0IG9mZlxuICAgIGNvbnN0IGZhaWxlZExvb2t1cCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHVybCArICcuJG5ncmVzb3VyY2UkJywgZnJvbUZpbGUsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KSBhcyBSZXNvbHZlZE1vZHVsZVdpdGhGYWlsZWRMb29rdXBMb2NhdGlvbnM7XG4gICAgLy8gY2xhbmctZm9ybWF0IG9uXG4gICAgaWYgKGZhaWxlZExvb2t1cC5mYWlsZWRMb29rdXBMb2NhdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbnRlcm5hbCBlcnJvcjogZXhwZWN0ZWQgdG8gZmluZCBmYWlsZWRMb29rdXBMb2NhdGlvbnMgZHVyaW5nIHJlc29sdXRpb24gb2YgcmVzb3VyY2UgJyR7dXJsfScgaW4gY29udGV4dCBvZiAke2Zyb21GaWxlfWApO1xuICAgIH1cblxuICAgIHJldHVybiBmYWlsZWRMb29rdXAuZmFpbGVkTG9va3VwTG9jYXRpb25zXG4gICAgICAgIC5maWx0ZXIoY2FuZGlkYXRlID0+IGNhbmRpZGF0ZS5lbmRzV2l0aCgnLiRuZ3Jlc291cmNlJC50cycpKVxuICAgICAgICAubWFwKGNhbmRpZGF0ZSA9PiBjYW5kaWRhdGUucmVwbGFjZSgvXFwuXFwkbmdyZXNvdXJjZVxcJFxcLnRzJC8sICcnKSk7XG4gIH1cbn1cbiJdfQ==