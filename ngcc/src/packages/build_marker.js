(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/build_marker", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    exports.NGCC_VERSION = '9.0.0-next.5+49.sha-ea6a2e9.with-local-changes';
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
     * @param pkgJsonUpdater The writer to use for updating `package.json`.
     * @param packageJson The parsed contents of the `package.json` file for the entry-point.
     * @param packageJsonPath The absolute path to the `package.json` file.
     * @param properties The properties in the `package.json` of the formats for which we are writing
     *                   the marker.
     */
    function markAsProcessed(pkgJsonUpdater, packageJson, packageJsonPath, formatProperties) {
        var e_1, _a;
        var update = pkgJsonUpdater.createUpdate();
        try {
            // Update the format properties to mark them as processed.
            for (var formatProperties_1 = tslib_1.__values(formatProperties), formatProperties_1_1 = formatProperties_1.next(); !formatProperties_1_1.done; formatProperties_1_1 = formatProperties_1.next()) {
                var prop = formatProperties_1_1.value;
                update.addChange(['__processed_by_ivy_ngcc__', prop], exports.NGCC_VERSION);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (formatProperties_1_1 && !formatProperties_1_1.done && (_a = formatProperties_1.return)) _a.call(formatProperties_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Update the `prepublishOnly` script (keeping a backup, if necessary) to prevent `ngcc`'d
        // packages from getting accidentally published.
        var oldPrepublishOnly = packageJson.scripts && packageJson.scripts.prepublishOnly;
        var newPrepublishOnly = 'node --eval \"console.error(\'' +
            'ERROR: Trying to publish a package that has been compiled by NGCC. This is not allowed.\\n' +
            'Please delete and rebuild the package, without compiling with NGCC, before attempting to publish.\\n' +
            'Note that NGCC may have been run by importing this package into another project that is being built with Ivy enabled.\\n' +
            '\')\" ' +
            '&& exit 1';
        if (oldPrepublishOnly && (oldPrepublishOnly !== newPrepublishOnly)) {
            update.addChange(['scripts', 'prepublishOnly__ivy_ngcc_bak'], oldPrepublishOnly);
        }
        update.addChange(['scripts', 'prepublishOnly'], newPrepublishOnly);
        update.writeChanges(packageJsonPath, packageJson);
    }
    exports.markAsProcessed = markAsProcessed;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRfbWFya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2J1aWxkX21hcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFXYSxRQUFBLFlBQVksR0FBRyxtQkFBbUIsQ0FBQztJQUVoRDs7Ozs7Ozs7Ozs7T0FXRztJQUNILFNBQWdCLGdCQUFnQixDQUM1QixXQUFrQyxFQUFFLE1BQW1DLEVBQ3ZFLGNBQThCO1FBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUU7WUFDMUMsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUM7YUFDN0MsSUFBSSxDQUFDLFVBQUEsUUFBUSxJQUFJLE9BQUEsV0FBVyxDQUFDLHlCQUEyQixDQUFDLFFBQVEsQ0FBQyxLQUFLLG9CQUFZLEVBQWxFLENBQWtFLENBQUMsRUFBRTtZQUM3RixNQUFNLElBQUksS0FBSyxDQUNYLDREQUE0RDtpQkFDNUQsdUVBQWtFLGNBQWMsc0JBQWtCLENBQUEsQ0FBQyxDQUFDO1NBQ3pHO1FBRUQsT0FBTyxXQUFXLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLEtBQUssb0JBQVksQ0FBQztJQUN4RSxDQUFDO0lBZEQsNENBY0M7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSCxTQUFnQixlQUFlLENBQzNCLGNBQWtDLEVBQUUsV0FBa0MsRUFDdEUsZUFBK0IsRUFBRSxnQkFBK0M7O1FBQ2xGLElBQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQzs7WUFFN0MsMERBQTBEO1lBQzFELEtBQW1CLElBQUEscUJBQUEsaUJBQUEsZ0JBQWdCLENBQUEsa0RBQUEsZ0ZBQUU7Z0JBQWhDLElBQU0sSUFBSSw2QkFBQTtnQkFDYixNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLEVBQUUsb0JBQVksQ0FBQyxDQUFDO2FBQ3JFOzs7Ozs7Ozs7UUFFRCwwRkFBMEY7UUFDMUYsZ0RBQWdEO1FBQ2hELElBQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLE9BQU8sSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUNwRixJQUFNLGlCQUFpQixHQUFHLGdDQUFnQztZQUN0RCw0RkFBNEY7WUFDNUYsc0dBQXNHO1lBQ3RHLDBIQUEwSDtZQUMxSCxRQUFRO1lBQ1IsV0FBVyxDQUFDO1FBRWhCLElBQUksaUJBQWlCLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxpQkFBaUIsQ0FBQyxFQUFFO1lBQ2xFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLEVBQUUsOEJBQThCLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1NBQ2xGO1FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFbkUsTUFBTSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQTNCRCwwQ0EyQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBkaXJuYW1lfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4uL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50UGFja2FnZUpzb24sIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc30gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cbmV4cG9ydCBjb25zdCBOR0NDX1ZFUlNJT04gPSAnMC4wLjAtUExBQ0VIT0xERVInO1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgbmdjYyBoYXMgYWxyZWFkeSBwcm9jZXNzZWQgYSBnaXZlbiBlbnRyeS1wb2ludCBmb3JtYXQuXG4gKlxuICogVGhlIGVudHJ5LXBvaW50IGlzIGRlZmluZWQgYnkgdGhlIHBhY2thZ2UuanNvbiBjb250ZW50cyBwcm92aWRlZC5cbiAqIFRoZSBmb3JtYXQgaXMgZGVmaW5lZCBieSB0aGUgcHJvdmlkZWQgcHJvcGVydHkgbmFtZSBvZiB0aGUgcGF0aCB0byB0aGUgYnVuZGxlIGluIHRoZSBwYWNrYWdlLmpzb25cbiAqXG4gKiBAcGFyYW0gcGFja2FnZUpzb24gVGhlIHBhcnNlZCBjb250ZW50cyBvZiB0aGUgcGFja2FnZS5qc29uIGZpbGUgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBmb3JtYXQgVGhlIGVudHJ5LXBvaW50IGZvcm1hdCBwcm9wZXJ0eSBpbiB0aGUgcGFja2FnZS5qc29uIHRvIGNoZWNrLlxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgZW50cnktcG9pbnQgYW5kIGZvcm1hdCBoYXZlIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQgd2l0aCB0aGlzIG5nY2MgdmVyc2lvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGBwYWNrYWdlSnNvbmAgcHJvcGVydHkgaXMgbm90IGFuIG9iamVjdC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGVudHJ5LXBvaW50IGhhcyBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkIHdpdGggYSBkaWZmZXJlbnQgbmdjYyB2ZXJzaW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzQmVlblByb2Nlc3NlZChcbiAgICBwYWNrYWdlSnNvbjogRW50cnlQb2ludFBhY2thZ2VKc29uLCBmb3JtYXQ6IFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllcyxcbiAgICBlbnRyeVBvaW50UGF0aDogQWJzb2x1dGVGc1BhdGgpOiBib29sZWFuIHtcbiAgaWYgKCFwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChPYmplY3Qua2V5cyhwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fKVxuICAgICAgICAgIC5zb21lKHByb3BlcnR5ID0+IHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18gIVtwcm9wZXJ0eV0gIT09IE5HQ0NfVkVSU0lPTikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdUaGUgbmdjYyBjb21waWxlciBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBuZ2NjIGJ1aWxkLlxcbicgK1xuICAgICAgICBgUGxlYXNlIGNvbXBsZXRlbHkgcmVtb3ZlIHRoZSBcIm5vZGVfbW9kdWxlc1wiIGZvbGRlciBjb250YWluaW5nIFwiJHtlbnRyeVBvaW50UGF0aH1cIiBhbmQgdHJ5IGFnYWluLmApO1xuICB9XG5cbiAgcmV0dXJuIHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX19bZm9ybWF0XSA9PT0gTkdDQ19WRVJTSU9OO1xufVxuXG4vKipcbiAqIFdyaXRlIGEgYnVpbGQgbWFya2VyIGZvciB0aGUgZ2l2ZW4gZW50cnktcG9pbnQgYW5kIGZvcm1hdCBwcm9wZXJ0aWVzLCB0byBpbmRpY2F0ZSB0aGF0IHRoZXkgaGF2ZVxuICogYmVlbiBjb21waWxlZCBieSB0aGlzIHZlcnNpb24gb2YgbmdjYy5cbiAqXG4gKiBAcGFyYW0gcGtnSnNvblVwZGF0ZXIgVGhlIHdyaXRlciB0byB1c2UgZm9yIHVwZGF0aW5nIGBwYWNrYWdlLmpzb25gLlxuICogQHBhcmFtIHBhY2thZ2VKc29uIFRoZSBwYXJzZWQgY29udGVudHMgb2YgdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBwYWNrYWdlSnNvblBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUuXG4gKiBAcGFyYW0gcHJvcGVydGllcyBUaGUgcHJvcGVydGllcyBpbiB0aGUgYHBhY2thZ2UuanNvbmAgb2YgdGhlIGZvcm1hdHMgZm9yIHdoaWNoIHdlIGFyZSB3cml0aW5nXG4gKiAgICAgICAgICAgICAgICAgICB0aGUgbWFya2VyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFya0FzUHJvY2Vzc2VkKFxuICAgIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sXG4gICAgcGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZm9ybWF0UHJvcGVydGllczogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzW10pOiB2b2lkIHtcbiAgY29uc3QgdXBkYXRlID0gcGtnSnNvblVwZGF0ZXIuY3JlYXRlVXBkYXRlKCk7XG5cbiAgLy8gVXBkYXRlIHRoZSBmb3JtYXQgcHJvcGVydGllcyB0byBtYXJrIHRoZW0gYXMgcHJvY2Vzc2VkLlxuICBmb3IgKGNvbnN0IHByb3Agb2YgZm9ybWF0UHJvcGVydGllcykge1xuICAgIHVwZGF0ZS5hZGRDaGFuZ2UoWydfX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fJywgcHJvcF0sIE5HQ0NfVkVSU0lPTik7XG4gIH1cblxuICAvLyBVcGRhdGUgdGhlIGBwcmVwdWJsaXNoT25seWAgc2NyaXB0IChrZWVwaW5nIGEgYmFja3VwLCBpZiBuZWNlc3NhcnkpIHRvIHByZXZlbnQgYG5nY2NgJ2RcbiAgLy8gcGFja2FnZXMgZnJvbSBnZXR0aW5nIGFjY2lkZW50YWxseSBwdWJsaXNoZWQuXG4gIGNvbnN0IG9sZFByZXB1Ymxpc2hPbmx5ID0gcGFja2FnZUpzb24uc2NyaXB0cyAmJiBwYWNrYWdlSnNvbi5zY3JpcHRzLnByZXB1Ymxpc2hPbmx5O1xuICBjb25zdCBuZXdQcmVwdWJsaXNoT25seSA9ICdub2RlIC0tZXZhbCBcXFwiY29uc29sZS5lcnJvcihcXCcnICtcbiAgICAgICdFUlJPUjogVHJ5aW5nIHRvIHB1Ymxpc2ggYSBwYWNrYWdlIHRoYXQgaGFzIGJlZW4gY29tcGlsZWQgYnkgTkdDQy4gVGhpcyBpcyBub3QgYWxsb3dlZC5cXFxcbicgK1xuICAgICAgJ1BsZWFzZSBkZWxldGUgYW5kIHJlYnVpbGQgdGhlIHBhY2thZ2UsIHdpdGhvdXQgY29tcGlsaW5nIHdpdGggTkdDQywgYmVmb3JlIGF0dGVtcHRpbmcgdG8gcHVibGlzaC5cXFxcbicgK1xuICAgICAgJ05vdGUgdGhhdCBOR0NDIG1heSBoYXZlIGJlZW4gcnVuIGJ5IGltcG9ydGluZyB0aGlzIHBhY2thZ2UgaW50byBhbm90aGVyIHByb2plY3QgdGhhdCBpcyBiZWluZyBidWlsdCB3aXRoIEl2eSBlbmFibGVkLlxcXFxuJyArXG4gICAgICAnXFwnKVxcXCIgJyArXG4gICAgICAnJiYgZXhpdCAxJztcblxuICBpZiAob2xkUHJlcHVibGlzaE9ubHkgJiYgKG9sZFByZXB1Ymxpc2hPbmx5ICE9PSBuZXdQcmVwdWJsaXNoT25seSkpIHtcbiAgICB1cGRhdGUuYWRkQ2hhbmdlKFsnc2NyaXB0cycsICdwcmVwdWJsaXNoT25seV9faXZ5X25nY2NfYmFrJ10sIG9sZFByZXB1Ymxpc2hPbmx5KTtcbiAgfVxuXG4gIHVwZGF0ZS5hZGRDaGFuZ2UoWydzY3JpcHRzJywgJ3ByZXB1Ymxpc2hPbmx5J10sIG5ld1ByZXB1Ymxpc2hPbmx5KTtcblxuICB1cGRhdGUud3JpdGVDaGFuZ2VzKHBhY2thZ2VKc29uUGF0aCwgcGFja2FnZUpzb24pO1xufVxuIl19