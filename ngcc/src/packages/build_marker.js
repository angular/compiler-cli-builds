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
        define("@angular/compiler-cli/ngcc/src/packages/build_marker", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NGCC_VERSION = '8.1.0-next.1+50.sha-aa9eb55.with-local-changes';
    /**
     * Check whether ngcc has already processed a given entry-point format.
     *
     * The entry-point is defined by the package.json contents provided.
     * The format is defined by the provided property name of the path to the bundle in the package.json
     *
     * @param packageJson The parsed contents of the package.json file for the entry-point.
     * @param format The entry-point format property in the package.json to check.
     * @returns true if the entry-point and format have already been processed with this ngcc version.
     * @throws Error if the `packageJson` property is not an object.
     * @throws Error if the entry-point has already been processed with a different ngcc version.
     */
    function hasBeenProcessed(packageJson, format) {
        if (!packageJson.__processed_by_ivy_ngcc__) {
            return false;
        }
        if (Object.keys(packageJson.__processed_by_ivy_ngcc__)
            .some(function (property) { return packageJson.__processed_by_ivy_ngcc__[property] !== exports.NGCC_VERSION; })) {
            throw new Error('The ngcc compiler has changed since the last ngcc build.\n' +
                'Please completely remove `node_modules` and try again.');
        }
        return packageJson.__processed_by_ivy_ngcc__[format] === exports.NGCC_VERSION;
    }
    exports.hasBeenProcessed = hasBeenProcessed;
    /**
     * Write a build marker for the given entry-point and format property, to indicate that it has
     * been compiled by this version of ngcc.
     *
     * @param entryPoint the entry-point to write a marker.
     * @param format the property in the package.json of the format for which we are writing the marker.
     */
    function markAsProcessed(fs, packageJson, packageJsonPath, format) {
        if (!packageJson.__processed_by_ivy_ngcc__)
            packageJson.__processed_by_ivy_ngcc__ = {};
        packageJson.__processed_by_ivy_ngcc__[format] = exports.NGCC_VERSION;
        fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
    exports.markAsProcessed = markAsProcessed;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRfbWFya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2J1aWxkX21hcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQU1VLFFBQUEsWUFBWSxHQUFHLG1CQUFtQixDQUFDO0lBRWhEOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsU0FBZ0IsZ0JBQWdCLENBQzVCLFdBQWtDLEVBQUUsTUFBOEI7UUFDcEUsSUFBSSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRTtZQUMxQyxPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQzthQUM3QyxJQUFJLENBQUMsVUFBQSxRQUFRLElBQUksT0FBQSxXQUFXLENBQUMseUJBQTJCLENBQUMsUUFBUSxDQUFDLEtBQUssb0JBQVksRUFBbEUsQ0FBa0UsQ0FBQyxFQUFFO1lBQzdGLE1BQU0sSUFBSSxLQUFLLENBQ1gsNERBQTREO2dCQUM1RCx3REFBd0QsQ0FBQyxDQUFDO1NBQy9EO1FBRUQsT0FBTyxXQUFXLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLEtBQUssb0JBQVksQ0FBQztJQUN4RSxDQUFDO0lBYkQsNENBYUM7SUFFRDs7Ozs7O09BTUc7SUFDSCxTQUFnQixlQUFlLENBQzNCLEVBQWMsRUFBRSxXQUFrQyxFQUFFLGVBQStCLEVBQ25GLE1BQThCO1FBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMseUJBQXlCO1lBQUUsV0FBVyxDQUFDLHlCQUF5QixHQUFHLEVBQUUsQ0FBQztRQUN2RixXQUFXLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLEdBQUcsb0JBQVksQ0FBQztRQUM3RCxFQUFFLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBTkQsMENBTUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXRoJztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vZmlsZV9zeXN0ZW0vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtFbnRyeVBvaW50SnNvblByb3BlcnR5LCBFbnRyeVBvaW50UGFja2FnZUpzb259IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG5leHBvcnQgY29uc3QgTkdDQ19WRVJTSU9OID0gJzAuMC4wLVBMQUNFSE9MREVSJztcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIG5nY2MgaGFzIGFscmVhZHkgcHJvY2Vzc2VkIGEgZ2l2ZW4gZW50cnktcG9pbnQgZm9ybWF0LlxuICpcbiAqIFRoZSBlbnRyeS1wb2ludCBpcyBkZWZpbmVkIGJ5IHRoZSBwYWNrYWdlLmpzb24gY29udGVudHMgcHJvdmlkZWQuXG4gKiBUaGUgZm9ybWF0IGlzIGRlZmluZWQgYnkgdGhlIHByb3ZpZGVkIHByb3BlcnR5IG5hbWUgb2YgdGhlIHBhdGggdG8gdGhlIGJ1bmRsZSBpbiB0aGUgcGFja2FnZS5qc29uXG4gKlxuICogQHBhcmFtIHBhY2thZ2VKc29uIFRoZSBwYXJzZWQgY29udGVudHMgb2YgdGhlIHBhY2thZ2UuanNvbiBmaWxlIGZvciB0aGUgZW50cnktcG9pbnQuXG4gKiBAcGFyYW0gZm9ybWF0IFRoZSBlbnRyeS1wb2ludCBmb3JtYXQgcHJvcGVydHkgaW4gdGhlIHBhY2thZ2UuanNvbiB0byBjaGVjay5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlIGVudHJ5LXBvaW50IGFuZCBmb3JtYXQgaGF2ZSBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkIHdpdGggdGhpcyBuZ2NjIHZlcnNpb24uXG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBgcGFja2FnZUpzb25gIHByb3BlcnR5IGlzIG5vdCBhbiBvYmplY3QuXG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBlbnRyeS1wb2ludCBoYXMgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCB3aXRoIGEgZGlmZmVyZW50IG5nY2MgdmVyc2lvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc0JlZW5Qcm9jZXNzZWQoXG4gICAgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgZm9ybWF0OiBFbnRyeVBvaW50SnNvblByb3BlcnR5KTogYm9vbGVhbiB7XG4gIGlmICghcGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfXykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoT2JqZWN0LmtleXMocGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfXylcbiAgICAgICAgICAuc29tZShwcm9wZXJ0eSA9PiBwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fICFbcHJvcGVydHldICE9PSBOR0NDX1ZFUlNJT04pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnVGhlIG5nY2MgY29tcGlsZXIgaGFzIGNoYW5nZWQgc2luY2UgdGhlIGxhc3QgbmdjYyBidWlsZC5cXG4nICtcbiAgICAgICAgJ1BsZWFzZSBjb21wbGV0ZWx5IHJlbW92ZSBgbm9kZV9tb2R1bGVzYCBhbmQgdHJ5IGFnYWluLicpO1xuICB9XG5cbiAgcmV0dXJuIHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX19bZm9ybWF0XSA9PT0gTkdDQ19WRVJTSU9OO1xufVxuXG4vKipcbiAqIFdyaXRlIGEgYnVpbGQgbWFya2VyIGZvciB0aGUgZ2l2ZW4gZW50cnktcG9pbnQgYW5kIGZvcm1hdCBwcm9wZXJ0eSwgdG8gaW5kaWNhdGUgdGhhdCBpdCBoYXNcbiAqIGJlZW4gY29tcGlsZWQgYnkgdGhpcyB2ZXJzaW9uIG9mIG5nY2MuXG4gKlxuICogQHBhcmFtIGVudHJ5UG9pbnQgdGhlIGVudHJ5LXBvaW50IHRvIHdyaXRlIGEgbWFya2VyLlxuICogQHBhcmFtIGZvcm1hdCB0aGUgcHJvcGVydHkgaW4gdGhlIHBhY2thZ2UuanNvbiBvZiB0aGUgZm9ybWF0IGZvciB3aGljaCB3ZSBhcmUgd3JpdGluZyB0aGUgbWFya2VyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFya0FzUHJvY2Vzc2VkKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIGZvcm1hdDogRW50cnlQb2ludEpzb25Qcm9wZXJ0eSkge1xuICBpZiAoIXBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18pIHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18gPSB7fTtcbiAgcGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfX1tmb3JtYXRdID0gTkdDQ19WRVJTSU9OO1xuICBmcy53cml0ZUZpbGUocGFja2FnZUpzb25QYXRoLCBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbiwgbnVsbCwgMikpO1xufVxuIl19