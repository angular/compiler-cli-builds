(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/build_marker", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
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
    exports.NGCC_VERSION = '9.0.0-next.5+19.sha-62d92f8.with-local-changes';
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
    function hasBeenProcessed(packageJson, format, entryPointPath) {
        if (!packageJson.__processed_by_ivy_ngcc__) {
            return false;
        }
        if (Object.keys(packageJson.__processed_by_ivy_ngcc__)
            .some(function (property) { return packageJson.__processed_by_ivy_ngcc__[property] !== exports.NGCC_VERSION; })) {
            throw new Error('The ngcc compiler has changed since the last ngcc build.\n' +
                ("Please completely remove the \"node_modules\" folder containing \"" + entryPointPath + "\" and try again."));
        }
        return packageJson.__processed_by_ivy_ngcc__[format] === exports.NGCC_VERSION;
    }
    exports.hasBeenProcessed = hasBeenProcessed;
    /**
     * Write a build marker for the given entry-point and format properties, to indicate that they have
     * been compiled by this version of ngcc.
     *
     * @param fs The current file-system being used.
     * @param packageJson The parsed contents of the `package.json` file for the entry-point.
     * @param packageJsonPath The absolute path to the `package.json` file.
     * @param properties The properties in the `package.json` of the formats for which we are writing
     *                   the marker.
     */
    function markAsProcessed(fs, packageJson, packageJsonPath, properties) {
        var e_1, _a;
        var processed = packageJson.__processed_by_ivy_ngcc__ || (packageJson.__processed_by_ivy_ngcc__ = {});
        try {
            for (var properties_1 = tslib_1.__values(properties), properties_1_1 = properties_1.next(); !properties_1_1.done; properties_1_1 = properties_1.next()) {
                var prop = properties_1_1.value;
                processed[prop] = exports.NGCC_VERSION;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (properties_1_1 && !properties_1_1.done && (_a = properties_1.return)) _a.call(properties_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var scripts = packageJson.scripts || (packageJson.scripts = {});
        scripts.prepublishOnly__ivy_ngcc_bak =
            scripts.prepublishOnly__ivy_ngcc_bak || scripts.prepublishOnly;
        scripts.prepublishOnly = 'node --eval \"console.error(\'' +
            'ERROR: Trying to publish a package that has been compiled by NGCC. This is not allowed.\\n' +
            'Please delete and rebuild the package, without compiling with NGCC, before attempting to publish.\\n' +
            'Note that NGCC may have been run by importing this package into another project that is being built with Ivy enabled.\\n' +
            '\')\" ' +
            '&& exit 1';
        // Just in case this package.json was synthesized due to a custom configuration
        // we will ensure that the path to the containing folder exists before we write the file.
        fs.ensureDir(file_system_1.dirname(packageJsonPath));
        fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
    exports.markAsProcessed = markAsProcessed;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRfbWFya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2J1aWxkX21hcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBbUY7SUFHdEUsUUFBQSxZQUFZLEdBQUcsbUJBQW1CLENBQUM7SUFFaEQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxTQUFnQixnQkFBZ0IsQ0FDNUIsV0FBa0MsRUFBRSxNQUEwQyxFQUM5RSxjQUE4QjtRQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLHlCQUF5QixFQUFFO1lBQzFDLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDO2FBQzdDLElBQUksQ0FBQyxVQUFBLFFBQVEsSUFBSSxPQUFBLFdBQVcsQ0FBQyx5QkFBMkIsQ0FBQyxRQUFRLENBQUMsS0FBSyxvQkFBWSxFQUFsRSxDQUFrRSxDQUFDLEVBQUU7WUFDN0YsTUFBTSxJQUFJLEtBQUssQ0FDWCw0REFBNEQ7aUJBQzVELHVFQUFrRSxjQUFjLHNCQUFrQixDQUFBLENBQUMsQ0FBQztTQUN6RztRQUVELE9BQU8sV0FBVyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxLQUFLLG9CQUFZLENBQUM7SUFDeEUsQ0FBQztJQWRELDRDQWNDO0lBRUQ7Ozs7Ozs7OztPQVNHO0lBQ0gsU0FBZ0IsZUFBZSxDQUMzQixFQUFjLEVBQUUsV0FBa0MsRUFBRSxlQUErQixFQUNuRixVQUFrRDs7UUFDcEQsSUFBTSxTQUFTLEdBQ1gsV0FBVyxDQUFDLHlCQUF5QixJQUFJLENBQUMsV0FBVyxDQUFDLHlCQUF5QixHQUFHLEVBQUUsQ0FBQyxDQUFDOztZQUUxRixLQUFtQixJQUFBLGVBQUEsaUJBQUEsVUFBVSxDQUFBLHNDQUFBLDhEQUFFO2dCQUExQixJQUFNLElBQUksdUJBQUE7Z0JBQ2IsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLG9CQUFZLENBQUM7YUFDaEM7Ozs7Ozs7OztRQUVELElBQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sQ0FBQyw0QkFBNEI7WUFDaEMsT0FBTyxDQUFDLDRCQUE0QixJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUM7UUFFbkUsT0FBTyxDQUFDLGNBQWMsR0FBRyxnQ0FBZ0M7WUFDckQsNEZBQTRGO1lBQzVGLHNHQUFzRztZQUN0RywwSEFBMEg7WUFDMUgsUUFBUTtZQUNSLFdBQVcsQ0FBQztRQUVoQiwrRUFBK0U7UUFDL0UseUZBQXlGO1FBQ3pGLEVBQUUsQ0FBQyxTQUFTLENBQUMscUJBQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUF6QkQsMENBeUJDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN5c3RlbSwgZGlybmFtZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgRW50cnlQb2ludFBhY2thZ2VKc29ufSBmcm9tICcuL2VudHJ5X3BvaW50JztcblxuZXhwb3J0IGNvbnN0IE5HQ0NfVkVSU0lPTiA9ICcwLjAuMC1QTEFDRUhPTERFUic7XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBuZ2NjIGhhcyBhbHJlYWR5IHByb2Nlc3NlZCBhIGdpdmVuIGVudHJ5LXBvaW50IGZvcm1hdC5cbiAqXG4gKiBUaGUgZW50cnktcG9pbnQgaXMgZGVmaW5lZCBieSB0aGUgcGFja2FnZS5qc29uIGNvbnRlbnRzIHByb3ZpZGVkLlxuICogVGhlIGZvcm1hdCBpcyBkZWZpbmVkIGJ5IHRoZSBwcm92aWRlZCBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBwYXRoIHRvIHRoZSBidW5kbGUgaW4gdGhlIHBhY2thZ2UuanNvblxuICpcbiAqIEBwYXJhbSBwYWNrYWdlSnNvbiBUaGUgcGFyc2VkIGNvbnRlbnRzIG9mIHRoZSBwYWNrYWdlLmpzb24gZmlsZSBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICogQHBhcmFtIGZvcm1hdCBUaGUgZW50cnktcG9pbnQgZm9ybWF0IHByb3BlcnR5IGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY2hlY2suXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBlbnRyeS1wb2ludCBhbmQgZm9ybWF0IGhhdmUgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCB3aXRoIHRoaXMgbmdjYyB2ZXJzaW9uLlxuICogQHRocm93cyBFcnJvciBpZiB0aGUgYHBhY2thZ2VKc29uYCBwcm9wZXJ0eSBpcyBub3QgYW4gb2JqZWN0LlxuICogQHRocm93cyBFcnJvciBpZiB0aGUgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQgd2l0aCBhIGRpZmZlcmVudCBuZ2NjIHZlcnNpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNCZWVuUHJvY2Vzc2VkKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIGZvcm1hdDogRW50cnlQb2ludEpzb25Qcm9wZXJ0eSB8ICd0eXBpbmdzJyxcbiAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgaWYgKCFwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChPYmplY3Qua2V5cyhwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fKVxuICAgICAgICAgIC5zb21lKHByb3BlcnR5ID0+IHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18gIVtwcm9wZXJ0eV0gIT09IE5HQ0NfVkVSU0lPTikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgbmdjYyBjb21waWxlciBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBuZ2NjIGJ1aWxkLlxcbicgK1xuICAgICAgICBgUGxlYXNlIGNvbXBsZXRlbHkgcmVtb3ZlIHRoZSBcIm5vZGVfbW9kdWxlc1wiIGZvbGRlciBjb250YWluaW5nIFwiJHtlbnRyeVBvaW50UGF0aH1cIiBhbmQgdHJ5IGFnYWluLmApO1xuICB9XG5cbiAgcmV0dXJuIHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX19bZm9ybWF0XSA9PT0gTkdDQ19WRVJTSU9OO1xufVxuXG4vKipcbiAqIFdyaXRlIGEgYnVpbGQgbWFya2VyIGZvciB0aGUgZ2l2ZW4gZW50cnktcG9pbnQgYW5kIGZvcm1hdCBwcm9wZXJ0aWVzLCB0byBpbmRpY2F0ZSB0aGF0IHRoZXkgaGF2ZVxuICogYmVlbiBjb21waWxlZCBieSB0aGlzIHZlcnNpb24gb2YgbmdjYy5cbiAqXG4gKiBAcGFyYW0gZnMgVGhlIGN1cnJlbnQgZmlsZS1zeXN0ZW0gYmVpbmcgdXNlZC5cbiAqIEBwYXJhbSBwYWNrYWdlSnNvbiBUaGUgcGFyc2VkIGNvbnRlbnRzIG9mIHRoZSBgcGFja2FnZS5qc29uYCBmaWxlIGZvciB0aGUgZW50cnktcG9pbnQuXG4gKiBAcGFyYW0gcGFja2FnZUpzb25QYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBgcGFja2FnZS5qc29uYCBmaWxlLlxuICogQHBhcmFtIHByb3BlcnRpZXMgVGhlIHByb3BlcnRpZXMgaW4gdGhlIGBwYWNrYWdlLmpzb25gIG9mIHRoZSBmb3JtYXRzIGZvciB3aGljaCB3ZSBhcmUgd3JpdGluZ1xuICogICAgICAgICAgICAgICAgICAgdGhlIG1hcmtlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtBc1Byb2Nlc3NlZChcbiAgICBmczogRmlsZVN5c3RlbSwgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbiwgcGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBwcm9wZXJ0aWVzOiAoRW50cnlQb2ludEpzb25Qcm9wZXJ0eSB8ICd0eXBpbmdzJylbXSkge1xuICBjb25zdCBwcm9jZXNzZWQgPVxuICAgICAgcGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfXyB8fCAocGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfXyA9IHt9KTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgcHJvcGVydGllcykge1xuICAgIHByb2Nlc3NlZFtwcm9wXSA9IE5HQ0NfVkVSU0lPTjtcbiAgfVxuXG4gIGNvbnN0IHNjcmlwdHMgPSBwYWNrYWdlSnNvbi5zY3JpcHRzIHx8IChwYWNrYWdlSnNvbi5zY3JpcHRzID0ge30pO1xuICBzY3JpcHRzLnByZXB1Ymxpc2hPbmx5X19pdnlfbmdjY19iYWsgPVxuICAgICAgc2NyaXB0cy5wcmVwdWJsaXNoT25seV9faXZ5X25nY2NfYmFrIHx8IHNjcmlwdHMucHJlcHVibGlzaE9ubHk7XG5cbiAgc2NyaXB0cy5wcmVwdWJsaXNoT25seSA9ICdub2RlIC0tZXZhbCBcXFwiY29uc29sZS5lcnJvcihcXCcnICtcbiAgICAgICdFUlJPUjogVHJ5aW5nIHRvIHB1Ymxpc2ggYSBwYWNrYWdlIHRoYXQgaGFzIGJlZW4gY29tcGlsZWQgYnkgTkdDQy4gVGhpcyBpcyBub3QgYWxsb3dlZC5cXFxcbicgK1xuICAgICAgJ1BsZWFzZSBkZWxldGUgYW5kIHJlYnVpbGQgdGhlIHBhY2thZ2UsIHdpdGhvdXQgY29tcGlsaW5nIHdpdGggTkdDQywgYmVmb3JlIGF0dGVtcHRpbmcgdG8gcHVibGlzaC5cXFxcbicgK1xuICAgICAgJ05vdGUgdGhhdCBOR0NDIG1heSBoYXZlIGJlZW4gcnVuIGJ5IGltcG9ydGluZyB0aGlzIHBhY2thZ2UgaW50byBhbm90aGVyIHByb2plY3QgdGhhdCBpcyBiZWluZyBidWlsdCB3aXRoIEl2eSBlbmFibGVkLlxcXFxuJyArXG4gICAgICAnXFwnKVxcXCIgJyArXG4gICAgICAnJiYgZXhpdCAxJztcblxuICAvLyBKdXN0IGluIGNhc2UgdGhpcyBwYWNrYWdlLmpzb24gd2FzIHN5bnRoZXNpemVkIGR1ZSB0byBhIGN1c3RvbSBjb25maWd1cmF0aW9uXG4gIC8vIHdlIHdpbGwgZW5zdXJlIHRoYXQgdGhlIHBhdGggdG8gdGhlIGNvbnRhaW5pbmcgZm9sZGVyIGV4aXN0cyBiZWZvcmUgd2Ugd3JpdGUgdGhlIGZpbGUuXG4gIGZzLmVuc3VyZURpcihkaXJuYW1lKHBhY2thZ2VKc29uUGF0aCkpO1xuICBmcy53cml0ZUZpbGUocGFja2FnZUpzb25QYXRoLCBKU09OLnN0cmluZ2lmeShwYWNrYWdlSnNvbiwgbnVsbCwgMikpO1xufVxuIl19