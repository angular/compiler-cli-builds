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
    exports.NGCC_VERSION = '9.0.0-next.0+53.sha-e5a89e0.with-local-changes';
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
        // Just in case this package.json was synthesized due to a custom configuration
        // we will ensure that the path to the containing folder exists before we write the file.
        fs.ensureDir(file_system_1.dirname(packageJsonPath));
        fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
    exports.markAsProcessed = markAsProcessed;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRfbWFya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2J1aWxkX21hcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBbUY7SUFHdEUsUUFBQSxZQUFZLEdBQUcsbUJBQW1CLENBQUM7SUFFaEQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxTQUFnQixnQkFBZ0IsQ0FDNUIsV0FBa0MsRUFBRSxNQUEwQztRQUNoRixJQUFJLENBQUMsV0FBVyxDQUFDLHlCQUF5QixFQUFFO1lBQzFDLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDO2FBQzdDLElBQUksQ0FBQyxVQUFBLFFBQVEsSUFBSSxPQUFBLFdBQVcsQ0FBQyx5QkFBMkIsQ0FBQyxRQUFRLENBQUMsS0FBSyxvQkFBWSxFQUFsRSxDQUFrRSxDQUFDLEVBQUU7WUFDN0YsTUFBTSxJQUFJLEtBQUssQ0FDWCw0REFBNEQ7Z0JBQzVELHdEQUF3RCxDQUFDLENBQUM7U0FDL0Q7UUFFRCxPQUFPLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxvQkFBWSxDQUFDO0lBQ3hFLENBQUM7SUFiRCw0Q0FhQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLGVBQWUsQ0FDM0IsRUFBYyxFQUFFLFdBQWtDLEVBQUUsZUFBK0IsRUFDbkYsVUFBa0Q7O1FBQ3BELElBQU0sU0FBUyxHQUNYLFdBQVcsQ0FBQyx5QkFBeUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsR0FBRyxFQUFFLENBQUMsQ0FBQzs7WUFFMUYsS0FBbUIsSUFBQSxlQUFBLGlCQUFBLFVBQVUsQ0FBQSxzQ0FBQSw4REFBRTtnQkFBMUIsSUFBTSxJQUFJLHVCQUFBO2dCQUNiLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxvQkFBWSxDQUFDO2FBQ2hDOzs7Ozs7Ozs7UUFFRCwrRUFBK0U7UUFDL0UseUZBQXlGO1FBQ3pGLEVBQUUsQ0FBQyxTQUFTLENBQUMscUJBQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFkRCwwQ0FjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIEZpbGVTeXN0ZW0sIGRpcm5hbWV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0VudHJ5UG9pbnRKc29uUHJvcGVydHksIEVudHJ5UG9pbnRQYWNrYWdlSnNvbn0gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cbmV4cG9ydCBjb25zdCBOR0NDX1ZFUlNJT04gPSAnMC4wLjAtUExBQ0VIT0xERVInO1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgbmdjYyBoYXMgYWxyZWFkeSBwcm9jZXNzZWQgYSBnaXZlbiBlbnRyeS1wb2ludCBmb3JtYXQuXG4gKlxuICogVGhlIGVudHJ5LXBvaW50IGlzIGRlZmluZWQgYnkgdGhlIHBhY2thZ2UuanNvbiBjb250ZW50cyBwcm92aWRlZC5cbiAqIFRoZSBmb3JtYXQgaXMgZGVmaW5lZCBieSB0aGUgcHJvdmlkZWQgcHJvcGVydHkgbmFtZSBvZiB0aGUgcGF0aCB0byB0aGUgYnVuZGxlIGluIHRoZSBwYWNrYWdlLmpzb25cbiAqXG4gKiBAcGFyYW0gcGFja2FnZUpzb24gVGhlIHBhcnNlZCBjb250ZW50cyBvZiB0aGUgcGFja2FnZS5qc29uIGZpbGUgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBmb3JtYXQgVGhlIGVudHJ5LXBvaW50IGZvcm1hdCBwcm9wZXJ0eSBpbiB0aGUgcGFja2FnZS5qc29uIHRvIGNoZWNrLlxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZW50cnktcG9pbnQgYW5kIGZvcm1hdCBoYXZlIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQgd2l0aCB0aGlzIG5nY2MgdmVyc2lvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGBwYWNrYWdlSnNvbmAgcHJvcGVydHkgaXMgbm90IGFuIG9iamVjdC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkIHdpdGggYSBkaWZmZXJlbnQgbmdjYyB2ZXJzaW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzQmVlblByb2Nlc3NlZChcbiAgICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uLCBmb3JtYXQ6IEVudHJ5UG9pbnRKc29uUHJvcGVydHkgfCAndHlwaW5ncycpOiBib29sZWFuIHtcbiAgaWYgKCFwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChPYmplY3Qua2V5cyhwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fKVxuICAgICAgICAgIC5zb21lKHByb3BlcnR5ID0+IHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18gIVtwcm9wZXJ0eV0gIT09IE5HQ0NfVkVSU0lPTikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgbmdjYyBjb21waWxlciBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBuZ2NjIGJ1aWxkLlxcbicgK1xuICAgICAgICAnUGxlYXNlIGNvbXBsZXRlbHkgcmVtb3ZlIGBub2RlX21vZHVsZXNgIGFuZCB0cnkgYWdhaW4uJyk7XG4gIH1cblxuICByZXR1cm4gcGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfX1tmb3JtYXRdID09PSBOR0NDX1ZFUlNJT047XG59XG5cbi8qKlxuICogV3JpdGUgYSBidWlsZCBtYXJrZXIgZm9yIHRoZSBnaXZlbiBlbnRyeS1wb2ludCBhbmQgZm9ybWF0IHByb3BlcnRpZXMsIHRvIGluZGljYXRlIHRoYXQgdGhleSBoYXZlXG4gKiBiZWVuIGNvbXBpbGVkIGJ5IHRoaXMgdmVyc2lvbiBvZiBuZ2NjLlxuICpcbiAqIEBwYXJhbSBmcyBUaGUgY3VycmVudCBmaWxlLXN5c3RlbSBiZWluZyB1c2VkLlxuICogQHBhcmFtIHBhY2thZ2VKc29uIFRoZSBwYXJzZWQgY29udGVudHMgb2YgdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBwYWNrYWdlSnNvblBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUuXG4gKiBAcGFyYW0gcHJvcGVydGllcyBUaGUgcHJvcGVydGllcyBpbiB0aGUgYHBhY2thZ2UuanNvbmAgb2YgdGhlIGZvcm1hdHMgZm9yIHdoaWNoIHdlIGFyZSB3cml0aW5nXG4gKiAgICAgICAgICAgICAgICAgICB0aGUgbWFya2VyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFya0FzUHJvY2Vzc2VkKFxuICAgIGZzOiBGaWxlU3lzdGVtLCBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uLCBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgIHByb3BlcnRpZXM6IChFbnRyeVBvaW50SnNvblByb3BlcnR5IHwgJ3R5cGluZ3MnKVtdKSB7XG4gIGNvbnN0IHByb2Nlc3NlZCA9XG4gICAgICBwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fIHx8IChwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fID0ge30pO1xuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgcHJvY2Vzc2VkW3Byb3BdID0gTkdDQ19WRVJTSU9OO1xuICB9XG5cbiAgLy8gSnVzdCBpbiBjYXNlIHRoaXMgcGFja2FnZS5qc29uIHdhcyBzeW50aGVzaXplZCBkdWUgdG8gYSBjdXN0b20gY29uZmlndXJhdGlvblxuICAvLyB3ZSB3aWxsIGVuc3VyZSB0aGF0IHRoZSBwYXRoIHRvIHRoZSBjb250YWluaW5nIGZvbGRlciBleGlzdHMgYmVmb3JlIHdlIHdyaXRlIHRoZSBmaWxlLlxuICBmcy5lbnN1cmVEaXIoZGlybmFtZShwYWNrYWdlSnNvblBhdGgpKTtcbiAgZnMud3JpdGVGaWxlKHBhY2thZ2VKc29uUGF0aCwgSlNPTi5zdHJpbmdpZnkocGFja2FnZUpzb24sIG51bGwsIDIpKTtcbn1cbiJdfQ==