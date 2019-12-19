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
    exports.NGCC_VERSION = '9.0.0-rc.7';
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
            var nodeModulesFolderPath = entryPointPath;
            while (!file_system_1.isRoot(nodeModulesFolderPath) && file_system_1.basename(nodeModulesFolderPath) !== 'node_modules') {
                nodeModulesFolderPath = file_system_1.dirname(nodeModulesFolderPath);
            }
            throw new Error("The ngcc compiler has changed since the last ngcc build.\n" +
                ("Please remove \"" + (file_system_1.isRoot(nodeModulesFolderPath) ? entryPointPath : nodeModulesFolderPath) + "\" and try again."));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRfbWFya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2J1aWxkX21hcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBeUY7SUFJNUUsUUFBQSxZQUFZLEdBQUcsbUJBQW1CLENBQUM7SUFFaEQ7Ozs7Ozs7Ozs7O09BV0c7SUFDSCxTQUFnQixnQkFBZ0IsQ0FDNUIsV0FBa0MsRUFBRSxNQUFtQyxFQUN2RSxjQUE4QjtRQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLHlCQUF5QixFQUFFO1lBQzFDLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLHlCQUF5QixDQUFDO2FBQzdDLElBQUksQ0FBQyxVQUFBLFFBQVEsSUFBSSxPQUFBLFdBQVcsQ0FBQyx5QkFBMkIsQ0FBQyxRQUFRLENBQUMsS0FBSyxvQkFBWSxFQUFsRSxDQUFrRSxDQUFDLEVBQUU7WUFDN0YsSUFBSSxxQkFBcUIsR0FBRyxjQUFjLENBQUM7WUFDM0MsT0FBTyxDQUFDLG9CQUFNLENBQUMscUJBQXFCLENBQUMsSUFBSSxzQkFBUSxDQUFDLHFCQUFxQixDQUFDLEtBQUssY0FBYyxFQUFFO2dCQUMzRixxQkFBcUIsR0FBRyxxQkFBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7YUFDeEQ7WUFDRCxNQUFNLElBQUksS0FBSyxDQUNYLDREQUE0RDtpQkFDNUQsc0JBQWtCLG9CQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsdUJBQWtCLENBQUEsQ0FBQyxDQUFDO1NBQ2pIO1FBRUQsT0FBTyxXQUFXLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLEtBQUssb0JBQVksQ0FBQztJQUN4RSxDQUFDO0lBbEJELDRDQWtCQztJQUVEOzs7Ozs7Ozs7T0FTRztJQUNILFNBQWdCLGVBQWUsQ0FDM0IsY0FBa0MsRUFBRSxXQUFrQyxFQUN0RSxlQUErQixFQUFFLGdCQUErQzs7UUFDbEYsSUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDOztZQUU3QywwREFBMEQ7WUFDMUQsS0FBbUIsSUFBQSxxQkFBQSxpQkFBQSxnQkFBZ0IsQ0FBQSxrREFBQSxnRkFBRTtnQkFBaEMsSUFBTSxJQUFJLDZCQUFBO2dCQUNiLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsRUFBRSxvQkFBWSxDQUFDLENBQUM7YUFDckU7Ozs7Ozs7OztRQUVELDBGQUEwRjtRQUMxRixnREFBZ0Q7UUFDaEQsSUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsT0FBTyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO1FBQ3BGLElBQU0saUJBQWlCLEdBQUcsZ0NBQWdDO1lBQ3RELDRGQUE0RjtZQUM1RixzR0FBc0c7WUFDdEcsMEhBQTBIO1lBQzFILFFBQVE7WUFDUixXQUFXLENBQUM7UUFFaEIsSUFBSSxpQkFBaUIsSUFBSSxDQUFDLGlCQUFpQixLQUFLLGlCQUFpQixDQUFDLEVBQUU7WUFDbEUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsRUFBRSw4QkFBOEIsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7U0FDbEY7UUFFRCxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUVuRSxNQUFNLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBM0JELDBDQTJCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGJhc2VuYW1lLCBkaXJuYW1lLCBpc1Jvb3R9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1BhY2thZ2VKc29uVXBkYXRlcn0gZnJvbSAnLi4vd3JpdGluZy9wYWNrYWdlX2pzb25fdXBkYXRlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRQYWNrYWdlSnNvbiwgUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzfSBmcm9tICcuL2VudHJ5X3BvaW50JztcblxuZXhwb3J0IGNvbnN0IE5HQ0NfVkVSU0lPTiA9ICcwLjAuMC1QTEFDRUhPTERFUic7XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBuZ2NjIGhhcyBhbHJlYWR5IHByb2Nlc3NlZCBhIGdpdmVuIGVudHJ5LXBvaW50IGZvcm1hdC5cbiAqXG4gKiBUaGUgZW50cnktcG9pbnQgaXMgZGVmaW5lZCBieSB0aGUgcGFja2FnZS5qc29uIGNvbnRlbnRzIHByb3ZpZGVkLlxuICogVGhlIGZvcm1hdCBpcyBkZWZpbmVkIGJ5IHRoZSBwcm92aWRlZCBwcm9wZXJ0eSBuYW1lIG9mIHRoZSBwYXRoIHRvIHRoZSBidW5kbGUgaW4gdGhlIHBhY2thZ2UuanNvblxuICpcbiAqIEBwYXJhbSBwYWNrYWdlSnNvbiBUaGUgcGFyc2VkIGNvbnRlbnRzIG9mIHRoZSBwYWNrYWdlLmpzb24gZmlsZSBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICogQHBhcmFtIGZvcm1hdCBUaGUgZW50cnktcG9pbnQgZm9ybWF0IHByb3BlcnR5IGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY2hlY2suXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBlbnRyeS1wb2ludCBhbmQgZm9ybWF0IGhhdmUgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCB3aXRoIHRoaXMgbmdjYyB2ZXJzaW9uLlxuICogQHRocm93cyBFcnJvciBpZiB0aGUgYHBhY2thZ2VKc29uYCBwcm9wZXJ0eSBpcyBub3QgYW4gb2JqZWN0LlxuICogQHRocm93cyBFcnJvciBpZiB0aGUgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQgd2l0aCBhIGRpZmZlcmVudCBuZ2NjIHZlcnNpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNCZWVuUHJvY2Vzc2VkKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIGZvcm1hdDogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzLFxuICAgIGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6IGJvb2xlYW4ge1xuICBpZiAoIXBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKE9iamVjdC5rZXlzKHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18pXG4gICAgICAgICAgLnNvbWUocHJvcGVydHkgPT4gcGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfXyAhW3Byb3BlcnR5XSAhPT0gTkdDQ19WRVJTSU9OKSkge1xuICAgIGxldCBub2RlTW9kdWxlc0ZvbGRlclBhdGggPSBlbnRyeVBvaW50UGF0aDtcbiAgICB3aGlsZSAoIWlzUm9vdChub2RlTW9kdWxlc0ZvbGRlclBhdGgpICYmIGJhc2VuYW1lKG5vZGVNb2R1bGVzRm9sZGVyUGF0aCkgIT09ICdub2RlX21vZHVsZXMnKSB7XG4gICAgICBub2RlTW9kdWxlc0ZvbGRlclBhdGggPSBkaXJuYW1lKG5vZGVNb2R1bGVzRm9sZGVyUGF0aCk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRoZSBuZ2NjIGNvbXBpbGVyIGhhcyBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IG5nY2MgYnVpbGQuXFxuYCArXG4gICAgICAgIGBQbGVhc2UgcmVtb3ZlIFwiJHtpc1Jvb3Qobm9kZU1vZHVsZXNGb2xkZXJQYXRoKSA/IGVudHJ5UG9pbnRQYXRoIDogbm9kZU1vZHVsZXNGb2xkZXJQYXRofVwiIGFuZCB0cnkgYWdhaW4uYCk7XG4gIH1cblxuICByZXR1cm4gcGFja2FnZUpzb24uX19wcm9jZXNzZWRfYnlfaXZ5X25nY2NfX1tmb3JtYXRdID09PSBOR0NDX1ZFUlNJT047XG59XG5cbi8qKlxuICogV3JpdGUgYSBidWlsZCBtYXJrZXIgZm9yIHRoZSBnaXZlbiBlbnRyeS1wb2ludCBhbmQgZm9ybWF0IHByb3BlcnRpZXMsIHRvIGluZGljYXRlIHRoYXQgdGhleSBoYXZlXG4gKiBiZWVuIGNvbXBpbGVkIGJ5IHRoaXMgdmVyc2lvbiBvZiBuZ2NjLlxuICpcbiAqIEBwYXJhbSBwa2dKc29uVXBkYXRlciBUaGUgd3JpdGVyIHRvIHVzZSBmb3IgdXBkYXRpbmcgYHBhY2thZ2UuanNvbmAuXG4gKiBAcGFyYW0gcGFja2FnZUpzb24gVGhlIHBhcnNlZCBjb250ZW50cyBvZiB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZSBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICogQHBhcmFtIHBhY2thZ2VKc29uUGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgYHBhY2thZ2UuanNvbmAgZmlsZS5cbiAqIEBwYXJhbSBwcm9wZXJ0aWVzIFRoZSBwcm9wZXJ0aWVzIGluIHRoZSBgcGFja2FnZS5qc29uYCBvZiB0aGUgZm9ybWF0cyBmb3Igd2hpY2ggd2UgYXJlIHdyaXRpbmdcbiAqICAgICAgICAgICAgICAgICAgIHRoZSBtYXJrZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrQXNQcm9jZXNzZWQoXG4gICAgcGtnSnNvblVwZGF0ZXI6IFBhY2thZ2VKc29uVXBkYXRlciwgcGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbixcbiAgICBwYWNrYWdlSnNvblBhdGg6IEFic29sdXRlRnNQYXRoLCBmb3JtYXRQcm9wZXJ0aWVzOiBQYWNrYWdlSnNvbkZvcm1hdFByb3BlcnRpZXNbXSk6IHZvaWQge1xuICBjb25zdCB1cGRhdGUgPSBwa2dKc29uVXBkYXRlci5jcmVhdGVVcGRhdGUoKTtcblxuICAvLyBVcGRhdGUgdGhlIGZvcm1hdCBwcm9wZXJ0aWVzIHRvIG1hcmsgdGhlbSBhcyBwcm9jZXNzZWQuXG4gIGZvciAoY29uc3QgcHJvcCBvZiBmb3JtYXRQcm9wZXJ0aWVzKSB7XG4gICAgdXBkYXRlLmFkZENoYW5nZShbJ19fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18nLCBwcm9wXSwgTkdDQ19WRVJTSU9OKTtcbiAgfVxuXG4gIC8vIFVwZGF0ZSB0aGUgYHByZXB1Ymxpc2hPbmx5YCBzY3JpcHQgKGtlZXBpbmcgYSBiYWNrdXAsIGlmIG5lY2Vzc2FyeSkgdG8gcHJldmVudCBgbmdjY2AnZFxuICAvLyBwYWNrYWdlcyBmcm9tIGdldHRpbmcgYWNjaWRlbnRhbGx5IHB1Ymxpc2hlZC5cbiAgY29uc3Qgb2xkUHJlcHVibGlzaE9ubHkgPSBwYWNrYWdlSnNvbi5zY3JpcHRzICYmIHBhY2thZ2VKc29uLnNjcmlwdHMucHJlcHVibGlzaE9ubHk7XG4gIGNvbnN0IG5ld1ByZXB1Ymxpc2hPbmx5ID0gJ25vZGUgLS1ldmFsIFxcXCJjb25zb2xlLmVycm9yKFxcJycgK1xuICAgICAgJ0VSUk9SOiBUcnlpbmcgdG8gcHVibGlzaCBhIHBhY2thZ2UgdGhhdCBoYXMgYmVlbiBjb21waWxlZCBieSBOR0NDLiBUaGlzIGlzIG5vdCBhbGxvd2VkLlxcXFxuJyArXG4gICAgICAnUGxlYXNlIGRlbGV0ZSBhbmQgcmVidWlsZCB0aGUgcGFja2FnZSwgd2l0aG91dCBjb21waWxpbmcgd2l0aCBOR0NDLCBiZWZvcmUgYXR0ZW1wdGluZyB0byBwdWJsaXNoLlxcXFxuJyArXG4gICAgICAnTm90ZSB0aGF0IE5HQ0MgbWF5IGhhdmUgYmVlbiBydW4gYnkgaW1wb3J0aW5nIHRoaXMgcGFja2FnZSBpbnRvIGFub3RoZXIgcHJvamVjdCB0aGF0IGlzIGJlaW5nIGJ1aWx0IHdpdGggSXZ5IGVuYWJsZWQuXFxcXG4nICtcbiAgICAgICdcXCcpXFxcIiAnICtcbiAgICAgICcmJiBleGl0IDEnO1xuXG4gIGlmIChvbGRQcmVwdWJsaXNoT25seSAmJiAob2xkUHJlcHVibGlzaE9ubHkgIT09IG5ld1ByZXB1Ymxpc2hPbmx5KSkge1xuICAgIHVwZGF0ZS5hZGRDaGFuZ2UoWydzY3JpcHRzJywgJ3ByZXB1Ymxpc2hPbmx5X19pdnlfbmdjY19iYWsnXSwgb2xkUHJlcHVibGlzaE9ubHkpO1xuICB9XG5cbiAgdXBkYXRlLmFkZENoYW5nZShbJ3NjcmlwdHMnLCAncHJlcHVibGlzaE9ubHknXSwgbmV3UHJlcHVibGlzaE9ubHkpO1xuXG4gIHVwZGF0ZS53cml0ZUNoYW5nZXMocGFja2FnZUpzb25QYXRoLCBwYWNrYWdlSnNvbik7XG59XG4iXX0=