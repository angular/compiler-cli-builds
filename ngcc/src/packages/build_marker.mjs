import { NGCC_PROPERTY_EXTENSION } from '../writing/new_entry_point_file_writer';
export const NGCC_VERSION = '12.1.0-next.4+8.sha-c0b2eeb';
/**
 * Returns true if there is a format in this entry-point that was compiled with an outdated version
 * of ngcc.
 *
 * @param packageJson The parsed contents of the package.json for the entry-point
 */
export function needsCleaning(packageJson) {
    return Object.values(packageJson.__processed_by_ivy_ngcc__ || {})
        .some(value => value !== NGCC_VERSION);
}
/**
 * Clean any build marker artifacts from the given `packageJson` object.
 * @param packageJson The parsed contents of the package.json to modify
 * @returns true if the package was modified during cleaning
 */
export function cleanPackageJson(packageJson) {
    if (packageJson.__processed_by_ivy_ngcc__ !== undefined) {
        // Remove the actual marker
        delete packageJson.__processed_by_ivy_ngcc__;
        // Remove new format properties that have been added by ngcc
        for (const prop of Object.keys(packageJson)) {
            if (prop.endsWith(NGCC_PROPERTY_EXTENSION)) {
                delete packageJson[prop];
            }
        }
        // Also remove the prebulish script if we modified it
        const scripts = packageJson.scripts;
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
/**
 * Check whether ngcc has already processed a given entry-point format.
 *
 * @param packageJson The parsed contents of the package.json file for the entry-point.
 * @param format The entry-point format property in the package.json to check.
 * @returns true if the `format` in the entry-point has already been processed by this ngcc version,
 * false otherwise.
 */
export function hasBeenProcessed(packageJson, format) {
    return packageJson.__processed_by_ivy_ngcc__ !== undefined &&
        packageJson.__processed_by_ivy_ngcc__[format] === NGCC_VERSION;
}
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
export function markAsProcessed(pkgJsonUpdater, packageJson, packageJsonPath, formatProperties) {
    const update = pkgJsonUpdater.createUpdate();
    // Update the format properties to mark them as processed.
    for (const prop of formatProperties) {
        update.addChange(['__processed_by_ivy_ngcc__', prop], NGCC_VERSION, 'alphabetic');
    }
    // Update the `prepublishOnly` script (keeping a backup, if necessary) to prevent `ngcc`'d
    // packages from getting accidentally published.
    const oldPrepublishOnly = packageJson.scripts && packageJson.scripts.prepublishOnly;
    const newPrepublishOnly = 'node --eval \"console.error(\'' +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRfbWFya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2J1aWxkX21hcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFRQSxPQUFPLEVBQUMsdUJBQXVCLEVBQUMsTUFBTSx3Q0FBd0MsQ0FBQztBQUkvRSxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsbUJBQW1CLENBQUM7QUFFaEQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUFDLFdBQWtDO0lBQzlELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMseUJBQXlCLElBQUksRUFBRSxDQUFDO1NBQzVELElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxZQUFZLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxXQUFrQztJQUNqRSxJQUFJLFdBQVcsQ0FBQyx5QkFBeUIsS0FBSyxTQUFTLEVBQUU7UUFDdkQsMkJBQTJCO1FBQzNCLE9BQU8sV0FBVyxDQUFDLHlCQUF5QixDQUFDO1FBQzdDLDREQUE0RDtRQUM1RCxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUU7WUFDM0MsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLEVBQUU7Z0JBQzFDLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzFCO1NBQ0Y7UUFFRCxxREFBcUQ7UUFDckQsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUNwQyxJQUFJLE9BQU8sS0FBSyxTQUFTLElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRTtZQUNuRCxPQUFPLE9BQU8sQ0FBQyxjQUFjLENBQUM7WUFDOUIsSUFBSSxPQUFPLENBQUMsNEJBQTRCLEtBQUssU0FBUyxFQUFFO2dCQUN0RCxPQUFPLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQztnQkFDOUQsT0FBTyxPQUFPLENBQUMsNEJBQTRCLENBQUM7YUFDN0M7U0FDRjtRQUNELE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUM1QixXQUFrQyxFQUFFLE1BQW1DO0lBQ3pFLE9BQU8sV0FBVyxDQUFDLHlCQUF5QixLQUFLLFNBQVM7UUFDdEQsV0FBVyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxLQUFLLFlBQVksQ0FBQztBQUNyRSxDQUFDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FDM0IsY0FBa0MsRUFBRSxXQUFrQyxFQUN0RSxlQUErQixFQUFFLGdCQUErQztJQUNsRixNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUM7SUFFN0MsMERBQTBEO0lBQzFELEtBQUssTUFBTSxJQUFJLElBQUksZ0JBQWdCLEVBQUU7UUFDbkMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztLQUNuRjtJQUVELDBGQUEwRjtJQUMxRixnREFBZ0Q7SUFDaEQsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsT0FBTyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO0lBQ3BGLE1BQU0saUJBQWlCLEdBQUcsZ0NBQWdDO1FBQ3RELDRGQUE0RjtRQUM1RixzR0FBc0c7UUFDdEcsMEhBQTBIO1FBQzFILFFBQVE7UUFDUixXQUFXLENBQUM7SUFFaEIsSUFBSSxpQkFBaUIsSUFBSSxDQUFDLGlCQUFpQixLQUFLLGlCQUFpQixDQUFDLEVBQUU7UUFDbEUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsRUFBRSw4QkFBOEIsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7S0FDbEY7SUFFRCxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUVuRSxNQUFNLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNwRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOR0NDX1BST1BFUlRZX0VYVEVOU0lPTn0gZnJvbSAnLi4vd3JpdGluZy9uZXdfZW50cnlfcG9pbnRfZmlsZV93cml0ZXInO1xuaW1wb3J0IHtQYWNrYWdlSnNvblVwZGF0ZXJ9IGZyb20gJy4uL3dyaXRpbmcvcGFja2FnZV9qc29uX3VwZGF0ZXInO1xuaW1wb3J0IHtFbnRyeVBvaW50UGFja2FnZUpzb24sIFBhY2thZ2VKc29uRm9ybWF0UHJvcGVydGllc30gZnJvbSAnLi9lbnRyeV9wb2ludCc7XG5cbmV4cG9ydCBjb25zdCBOR0NDX1ZFUlNJT04gPSAnMC4wLjAtUExBQ0VIT0xERVInO1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGVyZSBpcyBhIGZvcm1hdCBpbiB0aGlzIGVudHJ5LXBvaW50IHRoYXQgd2FzIGNvbXBpbGVkIHdpdGggYW4gb3V0ZGF0ZWQgdmVyc2lvblxuICogb2YgbmdjYy5cbiAqXG4gKiBAcGFyYW0gcGFja2FnZUpzb24gVGhlIHBhcnNlZCBjb250ZW50cyBvZiB0aGUgcGFja2FnZS5qc29uIGZvciB0aGUgZW50cnktcG9pbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5lZWRzQ2xlYW5pbmcocGFja2FnZUpzb246IEVudHJ5UG9pbnRQYWNrYWdlSnNvbik6IGJvb2xlYW4ge1xuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fIHx8IHt9KVxuICAgICAgLnNvbWUodmFsdWUgPT4gdmFsdWUgIT09IE5HQ0NfVkVSU0lPTik7XG59XG5cbi8qKlxuICogQ2xlYW4gYW55IGJ1aWxkIG1hcmtlciBhcnRpZmFjdHMgZnJvbSB0aGUgZ2l2ZW4gYHBhY2thZ2VKc29uYCBvYmplY3QuXG4gKiBAcGFyYW0gcGFja2FnZUpzb24gVGhlIHBhcnNlZCBjb250ZW50cyBvZiB0aGUgcGFja2FnZS5qc29uIHRvIG1vZGlmeVxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgcGFja2FnZSB3YXMgbW9kaWZpZWQgZHVyaW5nIGNsZWFuaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhblBhY2thZ2VKc29uKHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24pOiBib29sZWFuIHtcbiAgaWYgKHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX18gIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIFJlbW92ZSB0aGUgYWN0dWFsIG1hcmtlclxuICAgIGRlbGV0ZSBwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fO1xuICAgIC8vIFJlbW92ZSBuZXcgZm9ybWF0IHByb3BlcnRpZXMgdGhhdCBoYXZlIGJlZW4gYWRkZWQgYnkgbmdjY1xuICAgIGZvciAoY29uc3QgcHJvcCBvZiBPYmplY3Qua2V5cyhwYWNrYWdlSnNvbikpIHtcbiAgICAgIGlmIChwcm9wLmVuZHNXaXRoKE5HQ0NfUFJPUEVSVFlfRVhURU5TSU9OKSkge1xuICAgICAgICBkZWxldGUgcGFja2FnZUpzb25bcHJvcF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxzbyByZW1vdmUgdGhlIHByZWJ1bGlzaCBzY3JpcHQgaWYgd2UgbW9kaWZpZWQgaXRcbiAgICBjb25zdCBzY3JpcHRzID0gcGFja2FnZUpzb24uc2NyaXB0cztcbiAgICBpZiAoc2NyaXB0cyAhPT0gdW5kZWZpbmVkICYmIHNjcmlwdHMucHJlcHVibGlzaE9ubHkpIHtcbiAgICAgIGRlbGV0ZSBzY3JpcHRzLnByZXB1Ymxpc2hPbmx5O1xuICAgICAgaWYgKHNjcmlwdHMucHJlcHVibGlzaE9ubHlfX2l2eV9uZ2NjX2JhayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNjcmlwdHMucHJlcHVibGlzaE9ubHkgPSBzY3JpcHRzLnByZXB1Ymxpc2hPbmx5X19pdnlfbmdjY19iYWs7XG4gICAgICAgIGRlbGV0ZSBzY3JpcHRzLnByZXB1Ymxpc2hPbmx5X19pdnlfbmdjY19iYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIG5nY2MgaGFzIGFscmVhZHkgcHJvY2Vzc2VkIGEgZ2l2ZW4gZW50cnktcG9pbnQgZm9ybWF0LlxuICpcbiAqIEBwYXJhbSBwYWNrYWdlSnNvbiBUaGUgcGFyc2VkIGNvbnRlbnRzIG9mIHRoZSBwYWNrYWdlLmpzb24gZmlsZSBmb3IgdGhlIGVudHJ5LXBvaW50LlxuICogQHBhcmFtIGZvcm1hdCBUaGUgZW50cnktcG9pbnQgZm9ybWF0IHByb3BlcnR5IGluIHRoZSBwYWNrYWdlLmpzb24gdG8gY2hlY2suXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBgZm9ybWF0YCBpbiB0aGUgZW50cnktcG9pbnQgaGFzIGFscmVhZHkgYmVlbiBwcm9jZXNzZWQgYnkgdGhpcyBuZ2NjIHZlcnNpb24sXG4gKiBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNCZWVuUHJvY2Vzc2VkKFxuICAgIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sIGZvcm1hdDogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzKTogYm9vbGVhbiB7XG4gIHJldHVybiBwYWNrYWdlSnNvbi5fX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHBhY2thZ2VKc29uLl9fcHJvY2Vzc2VkX2J5X2l2eV9uZ2NjX19bZm9ybWF0XSA9PT0gTkdDQ19WRVJTSU9OO1xufVxuXG4vKipcbiAqIFdyaXRlIGEgYnVpbGQgbWFya2VyIGZvciB0aGUgZ2l2ZW4gZW50cnktcG9pbnQgYW5kIGZvcm1hdCBwcm9wZXJ0aWVzLCB0byBpbmRpY2F0ZSB0aGF0IHRoZXkgaGF2ZVxuICogYmVlbiBjb21waWxlZCBieSB0aGlzIHZlcnNpb24gb2YgbmdjYy5cbiAqXG4gKiBAcGFyYW0gcGtnSnNvblVwZGF0ZXIgVGhlIHdyaXRlciB0byB1c2UgZm9yIHVwZGF0aW5nIGBwYWNrYWdlLmpzb25gLlxuICogQHBhcmFtIHBhY2thZ2VKc29uIFRoZSBwYXJzZWQgY29udGVudHMgb2YgdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUgZm9yIHRoZSBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBwYWNrYWdlSnNvblBhdGggVGhlIGFic29sdXRlIHBhdGggdG8gdGhlIGBwYWNrYWdlLmpzb25gIGZpbGUuXG4gKiBAcGFyYW0gcHJvcGVydGllcyBUaGUgcHJvcGVydGllcyBpbiB0aGUgYHBhY2thZ2UuanNvbmAgb2YgdGhlIGZvcm1hdHMgZm9yIHdoaWNoIHdlIGFyZSB3cml0aW5nXG4gKiAgICAgICAgICAgICAgICAgICB0aGUgbWFya2VyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFya0FzUHJvY2Vzc2VkKFxuICAgIHBrZ0pzb25VcGRhdGVyOiBQYWNrYWdlSnNvblVwZGF0ZXIsIHBhY2thZ2VKc29uOiBFbnRyeVBvaW50UGFja2FnZUpzb24sXG4gICAgcGFja2FnZUpzb25QYXRoOiBBYnNvbHV0ZUZzUGF0aCwgZm9ybWF0UHJvcGVydGllczogUGFja2FnZUpzb25Gb3JtYXRQcm9wZXJ0aWVzW10pOiB2b2lkIHtcbiAgY29uc3QgdXBkYXRlID0gcGtnSnNvblVwZGF0ZXIuY3JlYXRlVXBkYXRlKCk7XG5cbiAgLy8gVXBkYXRlIHRoZSBmb3JtYXQgcHJvcGVydGllcyB0byBtYXJrIHRoZW0gYXMgcHJvY2Vzc2VkLlxuICBmb3IgKGNvbnN0IHByb3Agb2YgZm9ybWF0UHJvcGVydGllcykge1xuICAgIHVwZGF0ZS5hZGRDaGFuZ2UoWydfX3Byb2Nlc3NlZF9ieV9pdnlfbmdjY19fJywgcHJvcF0sIE5HQ0NfVkVSU0lPTiwgJ2FscGhhYmV0aWMnKTtcbiAgfVxuXG4gIC8vIFVwZGF0ZSB0aGUgYHByZXB1Ymxpc2hPbmx5YCBzY3JpcHQgKGtlZXBpbmcgYSBiYWNrdXAsIGlmIG5lY2Vzc2FyeSkgdG8gcHJldmVudCBgbmdjY2AnZFxuICAvLyBwYWNrYWdlcyBmcm9tIGdldHRpbmcgYWNjaWRlbnRhbGx5IHB1Ymxpc2hlZC5cbiAgY29uc3Qgb2xkUHJlcHVibGlzaE9ubHkgPSBwYWNrYWdlSnNvbi5zY3JpcHRzICYmIHBhY2thZ2VKc29uLnNjcmlwdHMucHJlcHVibGlzaE9ubHk7XG4gIGNvbnN0IG5ld1ByZXB1Ymxpc2hPbmx5ID0gJ25vZGUgLS1ldmFsIFxcXCJjb25zb2xlLmVycm9yKFxcJycgK1xuICAgICAgJ0VSUk9SOiBUcnlpbmcgdG8gcHVibGlzaCBhIHBhY2thZ2UgdGhhdCBoYXMgYmVlbiBjb21waWxlZCBieSBOR0NDLiBUaGlzIGlzIG5vdCBhbGxvd2VkLlxcXFxuJyArXG4gICAgICAnUGxlYXNlIGRlbGV0ZSBhbmQgcmVidWlsZCB0aGUgcGFja2FnZSwgd2l0aG91dCBjb21waWxpbmcgd2l0aCBOR0NDLCBiZWZvcmUgYXR0ZW1wdGluZyB0byBwdWJsaXNoLlxcXFxuJyArXG4gICAgICAnTm90ZSB0aGF0IE5HQ0MgbWF5IGhhdmUgYmVlbiBydW4gYnkgaW1wb3J0aW5nIHRoaXMgcGFja2FnZSBpbnRvIGFub3RoZXIgcHJvamVjdCB0aGF0IGlzIGJlaW5nIGJ1aWx0IHdpdGggSXZ5IGVuYWJsZWQuXFxcXG4nICtcbiAgICAgICdcXCcpXFxcIiAnICtcbiAgICAgICcmJiBleGl0IDEnO1xuXG4gIGlmIChvbGRQcmVwdWJsaXNoT25seSAmJiAob2xkUHJlcHVibGlzaE9ubHkgIT09IG5ld1ByZXB1Ymxpc2hPbmx5KSkge1xuICAgIHVwZGF0ZS5hZGRDaGFuZ2UoWydzY3JpcHRzJywgJ3ByZXB1Ymxpc2hPbmx5X19pdnlfbmdjY19iYWsnXSwgb2xkUHJlcHVibGlzaE9ubHkpO1xuICB9XG5cbiAgdXBkYXRlLmFkZENoYW5nZShbJ3NjcmlwdHMnLCAncHJlcHVibGlzaE9ubHknXSwgbmV3UHJlcHVibGlzaE9ubHkpO1xuXG4gIHVwZGF0ZS53cml0ZUNoYW5nZXMocGFja2FnZUpzb25QYXRoLCBwYWNrYWdlSnNvbik7XG59XG4iXX0=