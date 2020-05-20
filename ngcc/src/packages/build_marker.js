(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/build_marker", ["require", "exports", "tslib", "@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.markAsProcessed = exports.hasBeenProcessed = exports.cleanPackageJson = exports.needsCleaning = exports.NGCC_VERSION = void 0;
    var tslib_1 = require("tslib");
    var new_entry_point_file_writer_1 = require("@angular/compiler-cli/ngcc/src/writing/new_entry_point_file_writer");
    exports.NGCC_VERSION = '10.0.0-next.9+4.sha-4c30aa8';
    /**
     * Returns true if there is a format in this entry-point that was compiled with an outdated version
     * of ngcc.
     *
     * @param packageJson The parsed contents of the package.json for the entry-point
     */
    function needsCleaning(packageJson) {
        return Object.values(packageJson.__processed_by_ivy_ngcc__ || {})
            .some(function (value) { return value !== exports.NGCC_VERSION; });
    }
    exports.needsCleaning = needsCleaning;
    /**
     * Clean any build marker artifacts from the given `packageJson` object.
     * @param packageJson The parsed contents of the package.json to modify
     * @returns true if the package was modified during cleaning
     */
    function cleanPackageJson(packageJson) {
        var e_1, _a;
        if (packageJson.__processed_by_ivy_ngcc__ !== undefined) {
            // Remove the actual marker
            delete packageJson.__processed_by_ivy_ngcc__;
            try {
                // Remove new format properties that have been added by ngcc
                for (var _b = tslib_1.__values(Object.keys(packageJson)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var prop = _c.value;
                    if (prop.endsWith(new_entry_point_file_writer_1.NGCC_PROPERTY_EXTENSION)) {
                        delete packageJson[prop];
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Also remove the prebulish script if we modified it
            var scripts = packageJson.scripts;
            if (scripts !== undefined && scripts.prepublishOnly) {
                delete scripts.prepublishOnly;
                if (scripts.prepublishOnly__ivy_ngcc_bak !== undefined) {
                    scripts.prepublishOnly = scripts.prepublishOnly__ivy_ngcc_bak;
                    delete scripts.prepublishOnly__ivy_ngcc_bak;
                }
            }
            return true;
        }
        return false;
    }
    exports.cleanPackageJson = cleanPackageJson;
    /**
     * Check whether ngcc has already processed a given entry-point format.
     *
     * @param packageJson The parsed contents of the package.json file for the entry-point.
     * @param format The entry-point format property in the package.json to check.
     * @returns true if the `format` in the entry-point has already been processed by this ngcc version,
     * false otherwise.
     */
    function hasBeenProcessed(packageJson, format) {
        return packageJson.__processed_by_ivy_ngcc__ !== undefined &&
            packageJson.__processed_by_ivy_ngcc__[format] === exports.NGCC_VERSION;
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
        var e_2, _a;
        var update = pkgJsonUpdater.createUpdate();
        try {
            // Update the format properties to mark them as processed.
            for (var formatProperties_1 = tslib_1.__values(formatProperties), formatProperties_1_1 = formatProperties_1.next(); !formatProperties_1_1.done; formatProperties_1_1 = formatProperties_1.next()) {
                var prop = formatProperties_1_1.value;
                update.addChange(['__processed_by_ivy_ngcc__', prop], exports.NGCC_VERSION, 'alphabetic');
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (formatProperties_1_1 && !formatProperties_1_1.done && (_a = formatProperties_1.return)) _a.call(formatProperties_1);
            }
            finally { if (e_2) throw e_2.error; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRfbWFya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2J1aWxkX21hcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBUUEsa0hBQStFO0lBSWxFLFFBQUEsWUFBWSxHQUFHLG1CQUFtQixDQUFDO0lBRWhEOzs7OztPQUtHO0lBQ0gsU0FBZ0IsYUFBYSxDQUFDLFdBQWtDO1FBQzlELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLElBQUksRUFBRSxDQUFDO2FBQzVELElBQUksQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLEtBQUssS0FBSyxvQkFBWSxFQUF0QixDQUFzQixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUhELHNDQUdDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLFdBQWtDOztRQUNqRSxJQUFJLFdBQVcsQ0FBQyx5QkFBeUIsS0FBSyxTQUFTLEVBQUU7WUFDdkQsMkJBQTJCO1lBQzNCLE9BQU8sV0FBVyxDQUFDLHlCQUF5QixDQUFDOztnQkFDN0MsNERBQTREO2dCQUM1RCxLQUFtQixJQUFBLEtBQUEsaUJBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBeEMsSUFBTSxJQUFJLFdBQUE7b0JBQ2IsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLHFEQUF1QixDQUFDLEVBQUU7d0JBQzFDLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUMxQjtpQkFDRjs7Ozs7Ozs7O1lBRUQscURBQXFEO1lBQ3JELElBQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7WUFDcEMsSUFBSSxPQUFPLEtBQUssU0FBUyxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUU7Z0JBQ25ELE9BQU8sT0FBTyxDQUFDLGNBQWMsQ0FBQztnQkFDOUIsSUFBSSxPQUFPLENBQUMsNEJBQTRCLEtBQUssU0FBUyxFQUFFO29CQUN0RCxPQUFPLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQztvQkFDOUQsT0FBTyxPQUFPLENBQUMsNEJBQTRCLENBQUM7aUJBQzdDO2FBQ0Y7WUFDRCxPQUFPLElBQUksQ0FBQztTQUNiO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBdkJELDRDQXVCQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixnQkFBZ0IsQ0FDNUIsV0FBa0MsRUFBRSxNQUFtQztRQUN6RSxPQUFPLFdBQVcsQ0FBQyx5QkFBeUIsS0FBSyxTQUFTO1lBQ3RELFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxvQkFBWSxDQUFDO0lBQ3JFLENBQUM7SUFKRCw0Q0FJQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLGVBQWUsQ0FDM0IsY0FBa0MsRUFBRSxXQUFrQyxFQUN0RSxlQUErQixFQUFFLGdCQUErQzs7UUFDbEYsSUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDOztZQUU3QywwREFBMEQ7WUFDMUQsS0FBbUIsSUFBQSxxQkFBQSxpQkFBQSxnQkFBZ0IsQ0FBQSxrREFBQSxnRkFBRTtnQkFBaEMsSUFBTSxJQUFJLDZCQUFBO2dCQUNiLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsRUFBRSxvQkFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQ25GOzs7Ozs7Ozs7UUFFRCwwRkFBMEY7UUFDMUYsZ0RBQWdEO1FBQ2hELElBQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLE9BQU8sSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztRQUNwRixJQUFNLGlCQUFpQixHQUFHLGdDQUFnQztZQUN0RCw0RkFBNEY7WUFDNUYsc0dBQXNHO1lBQ3RHLDBIQUEwSDtZQUMxSCxRQUFRO1lBQ1IsV0FBVyxDQUFDO1FBRWhCLElBQUksaUJBQWlCLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxpQkFBaUIsQ0FBQyxFQUFFO1lBQ2xFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLEVBQUUsOEJBQThCLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1NBQ2xGO1FBRUQsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFbkUsTUFBTSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQTNCRCwwQ0EyQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOR0NDX1BST1BFUlRZX0VYVEVOU0lPTn0gZnJvbSAnLi4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4uL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50UGFja2FnZUpzb24sIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc30gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cbmV4cG9ydCBjb25zdCBOR0NDX1ZFUlNJT04gPSAnMC4wLjAtUExBQ0VIT0xERVInO1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGVyZSBpcyBhIGZvcm1hdCBpbiB0aGlzIGVudHJ5LXBvaW50IHRoYXQgd2FzIGNvbXBpbGVkIHdpdGggYW4gb3V0ZGF0ZWQgdmVyc2lvblxuICogb2YgbmdjYy5cbiAqXG4gKiBAcGFyYW0gcGFja2FnZUpzb24gVGhlIHBhcnNlZCBjb250ZW50cyBvZiB0aGUgcGFja2FnZS5qc29uIGZvciB0aGUgZW50cnktcG9pbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5lZWRzQ2xlYW5pbmcocGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbik6IGJvb2xlYW4ge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fIHx8IHt9KVxuICAgICAgLnNvbWUodmFsdWUgPT4gdmFsdWUgIT09IE5HQ0NfVkVSU0lPTik7XG59XG5cbi8qKlxuICogQ2xlYW4gYW55IGJ1aWxkIG1hcmtlciBhcnRpZmFjdHMgZnJvbSB0aGUgZ2l2ZW4gYHBhY2thZ2VKc29uYCBvYmplY3QuXG4gKiBAcGFyYW0gcGFja2FnZUpzb24gVGhlIHBhcnNlZCBjb250ZW50cyBvZiB0aGUgcGFja2FnZS5qc29uIHRvIG1vZGlmeVxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgcGFja2FnZSB3YXMgbW9kaWZpZWQgZHVyaW5nIGNsZWFuaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhblBhY2thZ2VKc29uKHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24pOiBib29sZWFuIHtcbiAgaWYgKHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18gIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIFJlbW92ZSB0aGUgYWN0dWFsIG1hcmtlclxuICAgIGRlbGV0ZSBwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fO1xuICAgIC8vIFJlbW92ZSBuZXcgZm9ybWF0IHByb3BlcnRpZXMgdGhhdCBoYXZlIGJlZW4gYWRkZWQgYnkgbmdjY1xuICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhwYWNrYWdlSnNvbikpIHtcbiAgICAgIGlmIChwcm9wLmVuZHNXaXRoKE5HQ0NfUFJPUEVSVFlfRVhURU5TSU9OKSkge1xuICAgICAgICBkZWxldGUgcGFja2FnZUpzb25bcHJvcF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxzbyByZW1vdmUgdGhlIHByZWJ1bGlzaCBzY3JpcHQgaWYgd2UgbW9kaWZpZWQgaXRcbiAgICBjb25zdCBzY3JpcHRzID0gcGFja2FnZUpzb24uc2NyaXB0cztcbiAgICBpZiAoc2NyaXB0cyAhPT0gdW5kZWZpbmVkICYmIHNjcmlwdHMucHJlcHVibGlzaE9ubHkpIHtcbiAgICAgIGRlbGV0ZSBzY3JpcHRzLnByZXB1Ymxpc2hPbmx5O1xuICAgICAgaWYgKHNjcmlwdHMucHJlcHVibGlzaE9ubHlfX2l2eV9uZ2NjX2JhayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNjcmlwdHMucHJlcHVibGlzaE9ubHkgPSBzY3JpcHRzLnByZXB1Ymxpc2hPbmx5X19pdnlfbmdjY19iYWs7XG4gICAgICAgIGRlbGV0ZSBzY3JpcHRzLnByZXB1Ymxpc2hPbmx5X19pdnlfbmdjY19iYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIG5nY2MgaGFzIGFscmVhZHkgcHJvY2Vzc2VkIGEgZ2l2ZW4gZW50cnktcG9pbnQgZm9ybWF0LlxuICpcbiAqIEBwYXJhbSBwYWNrYWdlSnNvbiBUaGUgcGFyc2VkIGNvbnRlbnRzIG9mIHRoZSBwYWNrYWdlLmpzb24gZmlsZSBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICogQHBhcmFtIGZvcm1hdCBUaGUgZW50cnktcG9pbnQgZm9ybWF0IHByb3BlcnR5IGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY2hlY2suXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBgZm9ybWF0YCBpbiB0aGUgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQgYnkgdGhpcyBuZ2NjIHZlcnNpb24sXG4gKiBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNCZWVuUHJvY2Vzc2VkKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIGZvcm1hdDogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzKTogYm9vbGVhbiB7XG4gIHJldHVybiBwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX19bZm9ybWF0XSA9PT0gTkdDQ19WRVJTSU9OO1xufVxuXG4vKipcbiAqIFdyaXRlIGEgYnVpbGQgbWFya2VyIGZvciB0aGUgZ2l2ZW4gZW50cnktcG9pbnQgYW5kIGZvcm1hdCBwcm9wZXJ0aWVzLCB0byBpbmRpY2F0ZSB0aGF0IHRoZXkgaGF2ZVxuICogYmVlbiBjb21waWxlZCBieSB0aGlzIHZlcnNpb24gb2YgbmdjYy5cbiAqXG4gKiBAcGFyYW0gcGtnSnNvblVwZGF0ZXIgVGhlIHdyaXRlciB0byB1c2UgZm9yIHVwZGF0aW5nIGBwYWNrYWdlLmpzb25gLlxuICogQHBhcmFtIHBhY2thZ2VKc29uIFRoZSBwYXJzZWQgY29udGVudHMgb2YgdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBwYWNrYWdlSnNvblBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUuXG4gKiBAcGFyYW0gcHJvcGVydGllcyBUaGUgcHJvcGVydGllcyBpbiB0aGUgYHBhY2thZ2UuanNvbmAgb2YgdGhlIGZvcm1hdHMgZm9yIHdoaWNoIHdlIGFyZSB3cml0aW5nXG4gKiAgICAgICAgICAgICAgICAgICB0aGUgbWFya2VyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFya0FzUHJvY2Vzc2VkKFxuICAgIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sXG4gICAgcGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZm9ybWF0UHJvcGVydGllczogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzW10pOiB2b2lkIHtcbiAgY29uc3QgdXBkYXRlID0gcGtnSnNvblVwZGF0ZXIuY3JlYXRlVXBkYXRlKCk7XG5cbiAgLy8gVXBkYXRlIHRoZSBmb3JtYXQgcHJvcGVydGllcyB0byBtYXJrIHRoZW0gYXMgcHJvY2Vzc2VkLlxuICBmb3IgKGNvbnN0IHByb3Agb2YgZm9ybWF0UHJvcGVydGllcykge1xuICAgIHVwZGF0ZS5hZGRDaGFuZ2UoWydfX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fJywgcHJvcF0sIE5HQ0NfVkVSU0lPTiwgJ2FscGhhYmV0aWMnKTtcbiAgfVxuXG4gIC8vIFVwZGF0ZSB0aGUgYHByZXB1Ymxpc2hPbmx5YCBzY3JpcHQgKGtlZXBpbmcgYSBiYWNrdXAsIGlmIG5lY2Vzc2FyeSkgdG8gcHJldmVudCBgbmdjY2AnZFxuICAvLyBwYWNrYWdlcyBmcm9tIGdldHRpbmcgYWNjaWRlbnRhbGx5IHB1Ymxpc2hlZC5cbiAgY29uc3Qgb2xkUHJlcHVibGlzaE9ubHkgPSBwYWNrYWdlSnNvbi5zY3JpcHRzICYmIHBhY2thZ2VKc29uLnNjcmlwdHMucHJlcHVibGlzaE9ubHk7XG4gIGNvbnN0IG5ld1ByZXB1Ymxpc2hPbmx5ID0gJ25vZGUgLS1ldmFsIFxcXCJjb25zb2xlLmVycm9yKFxcJycgK1xuICAgICAgJ0VSUk9SOiBUcnlpbmcgdG8gcHVibGlzaCBhIHBhY2thZ2UgdGhhdCBoYXMgYmVlbiBjb21waWxlZCBieSBOR0NDLiBUaGlzIGlzIG5vdCBhbGxvd2VkLlxcXFxuJyArXG4gICAgICAnUGxlYXNlIGRlbGV0ZSBhbmQgcmVidWlsZCB0aGUgcGFja2FnZSwgd2l0aG91dCBjb21waWxpbmcgd2l0aCBOR0NDLCBiZWZvcmUgYXR0ZW1wdGluZyB0byBwdWJsaXNoLlxcXFxuJyArXG4gICAgICAnTm90ZSB0aGF0IE5HQ0MgbWF5IGhhdmUgYmVlbiBydW4gYnkgaW1wb3J0aW5nIHRoaXMgcGFja2FnZSBpbnRvIGFub3RoZXIgcHJvamVjdCB0aGF0IGlzIGJlaW5nIGJ1aWx0IHdpdGggSXZ5IGVuYWJsZWQuXFxcXG4nICtcbiAgICAgICdcXCcpXFxcIiAnICtcbiAgICAgICcmJiBleGl0IDEnO1xuXG4gIGlmIChvbGRQcmVwdWJsaXNoT25seSAmJiAob2xkUHJlcHVibGlzaE9ubHkgIT09IG5ld1ByZXB1Ymxpc2hPbmx5KSkge1xuICAgIHVwZGF0ZS5hZGRDaGFuZ2UoWydzY3JpcHRzJywgJ3ByZXB1Ymxpc2hPbmx5X19pdnlfbmdjY19iYWsnXSwgb2xkUHJlcHVibGlzaE9ubHkpO1xuICB9XG5cbiAgdXBkYXRlLmFkZENoYW5nZShbJ3NjcmlwdHMnLCAncHJlcHVibGlzaE9ubHknXSwgbmV3UHJlcHVibGlzaE9ubHkpO1xuXG4gIHVwZGF0ZS53cml0ZUNoYW5nZXMocGFja2FnZUpzb25QYXRoLCBwYWNrYWdlSnNvbik7XG59XG4iXX0=