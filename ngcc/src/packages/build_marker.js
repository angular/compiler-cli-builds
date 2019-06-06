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
        define("@angular/compiler-cli/ngcc/src/packages/build_marker", ["require", "exports", "fs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs_1 = require("fs");
    exports.NGCC_VERSION = '8.0.0+39.sha-65f2010.with-local-changes';
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
    function markAsProcessed(packageJson, packageJsonPath, format) {
        if (!packageJson.__processed_by_ivy_ngcc__)
            packageJson.__processed_by_ivy_ngcc__ = {};
        packageJson.__processed_by_ivy_ngcc__[format] = exports.NGCC_VERSION;
        fs_1.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    }
    exports.markAsProcessed = markAsProcessed;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRfbWFya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2J1aWxkX21hcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7OztJQUVILHlCQUE0QztJQU0vQixRQUFBLFlBQVksR0FBRyxtQkFBbUIsQ0FBQztJQUVoRDs7Ozs7Ozs7Ozs7T0FXRztJQUNILFNBQWdCLGdCQUFnQixDQUM1QixXQUFrQyxFQUFFLE1BQThCO1FBQ3BFLElBQUksQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUU7WUFDMUMsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUM7YUFDN0MsSUFBSSxDQUFDLFVBQUEsUUFBUSxJQUFJLE9BQUEsV0FBVyxDQUFDLHlCQUEyQixDQUFDLFFBQVEsQ0FBQyxLQUFLLG9CQUFZLEVBQWxFLENBQWtFLENBQUMsRUFBRTtZQUM3RixNQUFNLElBQUksS0FBSyxDQUNYLDREQUE0RDtnQkFDNUQsd0RBQXdELENBQUMsQ0FBQztTQUMvRDtRQUVELE9BQU8sV0FBVyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxLQUFLLG9CQUFZLENBQUM7SUFDeEUsQ0FBQztJQWJELDRDQWFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsU0FBZ0IsZUFBZSxDQUMzQixXQUFrQyxFQUFFLGVBQStCLEVBQ25FLE1BQThCO1FBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMseUJBQXlCO1lBQUUsV0FBVyxDQUFDLHlCQUF5QixHQUFHLEVBQUUsQ0FBQztRQUN2RixXQUFXLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLEdBQUcsb0JBQVksQ0FBQztRQUM3RCxrQkFBYSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQU5ELDBDQU1DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge3dyaXRlRmlsZVN5bmMsIHdyaXRlRmlsZX0gZnJvbSAnZnMnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvcGF0aCc7XG5cbmltcG9ydCB7RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludFBhY2thZ2VKc29ufSBmcm9tICcuL2VudHJ5X3BvaW50JztcblxuZXhwb3J0IGNvbnN0IE5HQ0NfVkVSU0lPTiA9ICcwLjAuMC1QTEFDRUhPTERFUic7XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBuZ2NjIGhhcyBhbHJlYWR5IHByb2Nlc3NlZCBhIGdpdmVuIGVudHJ5LXBvaW50IGZvcm1hdC5cbiAqXG4gKiBUaGUgZW50cnktcG9pbnQgaXMgZGVmaW5lZCBieSB0aGUgcGFja2FnZS5qc29uIGNvbnRlbnRzIHByb3ZpZGVkLlxuICogVGhlIGZvcm1hdCBpcyBkZWZpbmVkIGJ5IHRoZSBwcm92aWRlZCBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBwYXRoIHRvIHRoZSBidW5kbGUgaW4gdGhlIHBhY2thZ2UuanNvblxuICpcbiAqIEBwYXJhbSBwYWNrYWdlSnNvbiBUaGUgcGFyc2VkIGNvbnRlbnRzIG9mIHRoZSBwYWNrYWdlLmpzb24gZmlsZSBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICogQHBhcmFtIGZvcm1hdCBUaGUgZW50cnktcG9pbnQgZm9ybWF0IHByb3BlcnR5IGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY2hlY2suXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBlbnRyeS1wb2ludCBhbmQgZm9ybWF0IGhhdmUgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCB3aXRoIHRoaXMgbmdjYyB2ZXJzaW9uLlxuICogQHRocm93cyBFcnJvciBpZiB0aGUgYHBhY2thZ2VKc29uYCBwcm9wZXJ0eSBpcyBub3QgYW4gb2JqZWN0LlxuICogQHRocm93cyBFcnJvciBpZiB0aGUgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQgd2l0aCBhIGRpZmZlcmVudCBuZ2NjIHZlcnNpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNCZWVuUHJvY2Vzc2VkKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIGZvcm1hdDogRW50cnlQb2ludEpzb25Qcm9wZXJ0eSk6IGJvb2xlYW4ge1xuICBpZiAoIXBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKE9iamVjdC5rZXlzKHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18pXG4gICAgICAgICAgLnNvbWUocHJvcGVydHkgPT4gcGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfXyAhW3Byb3BlcnR5XSAhPT0gTkdDQ19WRVJTSU9OKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RoZSBuZ2NjIGNvbXBpbGVyIGhhcyBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IG5nY2MgYnVpbGQuXFxuJyArXG4gICAgICAgICdQbGVhc2UgY29tcGxldGVseSByZW1vdmUgYG5vZGVfbW9kdWxlc2AgYW5kIHRyeSBhZ2Fpbi4nKTtcbiAgfVxuXG4gIHJldHVybiBwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fW2Zvcm1hdF0gPT09IE5HQ0NfVkVSU0lPTjtcbn1cblxuLyoqXG4gKiBXcml0ZSBhIGJ1aWxkIG1hcmtlciBmb3IgdGhlIGdpdmVuIGVudHJ5LXBvaW50IGFuZCBmb3JtYXQgcHJvcGVydHksIHRvIGluZGljYXRlIHRoYXQgaXQgaGFzXG4gKiBiZWVuIGNvbXBpbGVkIGJ5IHRoaXMgdmVyc2lvbiBvZiBuZ2NjLlxuICpcbiAqIEBwYXJhbSBlbnRyeVBvaW50IHRoZSBlbnRyeS1wb2ludCB0byB3cml0ZSBhIG1hcmtlci5cbiAqIEBwYXJhbSBmb3JtYXQgdGhlIHByb3BlcnR5IGluIHRoZSBwYWNrYWdlLmpzb24gb2YgdGhlIGZvcm1hdCBmb3Igd2hpY2ggd2UgYXJlIHdyaXRpbmcgdGhlIG1hcmtlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtBc1Byb2Nlc3NlZChcbiAgICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIGZvcm1hdDogRW50cnlQb2ludEpzb25Qcm9wZXJ0eSkge1xuICBpZiAoIXBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18pIHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18gPSB7fTtcbiAgcGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfX1tmb3JtYXRdID0gTkdDQ19WRVJTSU9OO1xuICB3cml0ZUZpbGVTeW5jKHBhY2thZ2VKc29uUGF0aCwgSlNPTi5zdHJpbmdpZnkocGFja2FnZUpzb24sIG51bGwsIDIpLCAndXRmOCcpO1xufVxuIl19