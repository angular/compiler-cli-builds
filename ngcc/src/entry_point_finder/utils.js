(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/entry_point_finder/utils", ["require", "exports", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    /**
     * Extract all the base-paths that we need to search for entry-points.
     *
     * This always contains the standard base-path (`sourceDirectory`).
     * But it also parses the `paths` mappings object to guess additional base-paths.
     *
     * For example:
     *
     * ```
     * getBasePaths('/node_modules', {baseUrl: '/dist', paths: {'*': ['lib/*', 'lib/generated/*']}})
     * > ['/node_modules', '/dist/lib']
     * ```
     *
     * Notice that `'/dist'` is not included as there is no `'*'` path,
     * and `'/dist/lib/generated'` is not included as it is covered by `'/dist/lib'`.
     *
     * @param sourceDirectory The standard base-path (e.g. node_modules).
     * @param pathMappings Path mapping configuration, from which to extract additional base-paths.
     */
    function getBasePaths(sourceDirectory, pathMappings) {
        var fs = file_system_1.getFileSystem();
        var basePaths = [sourceDirectory];
        if (pathMappings) {
            var baseUrl_1 = file_system_1.resolve(pathMappings.baseUrl);
            Object.values(pathMappings.paths).forEach(function (paths) { return paths.forEach(function (path) {
                // We only want base paths that exist and are not files
                var basePath = file_system_1.join(baseUrl_1, extractPathPrefix(path));
                while (basePath !== baseUrl_1 && (!fs.exists(basePath) || fs.stat(basePath).isFile())) {
                    basePath = fs.dirname(basePath);
                }
                basePaths.push(basePath);
            }); });
        }
        basePaths.sort().reverse(); // Get the paths in order with the longer ones first.
        return basePaths.filter(removeContainedPaths);
    }
    exports.getBasePaths = getBasePaths;
    /**
     * Extract everything in the `path` up to the first `*`.
     * @param path The path to parse.
     * @returns The extracted prefix.
     */
    function extractPathPrefix(path) {
        return path.split('*', 1)[0];
    }
    /**
     * A filter function that removes paths that are contained by other paths.
     *
     * For example:
     * Given `['a/b/c', 'a/b/x', 'a/b', 'd/e', 'd/f']` we will end up with `['a/b', 'd/e', 'd/f]`.
     * (Note that we do not get `d` even though `d/e` and `d/f` share a base directory, since `d` is not
     * one of the base paths.)
     *
     * @param value The current path.
     * @param index The index of the current path.
     * @param array The array of paths (sorted in reverse alphabetical order).
     * @returns true if this path is not contained by another path.
     */
    function removeContainedPaths(value, index, array) {
        // We only need to check the following paths since the `array` is sorted in reverse alphabetic
        // order.
        for (var i = index + 1; i < array.length; i++) {
            // We need to use `relative().startsWith()` rather than a simple `startsWith()` to ensure we
            // don't assume that `a/b` contains `a/b-2`.
            if (!file_system_1.relative(array[i], value).startsWith('..'))
                return false;
        }
        return true;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQXNHO0lBR3RHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSCxTQUFnQixZQUFZLENBQ3hCLGVBQStCLEVBQUUsWUFBc0M7UUFDekUsSUFBTSxFQUFFLEdBQUcsMkJBQWEsRUFBRSxDQUFDO1FBQzNCLElBQU0sU0FBUyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEMsSUFBSSxZQUFZLEVBQUU7WUFDaEIsSUFBTSxTQUFPLEdBQUcscUJBQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDOUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUk7Z0JBQ25FLHVEQUF1RDtnQkFDdkQsSUFBSSxRQUFRLEdBQUcsa0JBQUksQ0FBQyxTQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsT0FBTyxRQUFRLEtBQUssU0FBTyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRTtvQkFDbkYsUUFBUSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ2pDO2dCQUNELFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDLEVBUGlELENBT2pELENBQUMsQ0FBQztTQUNMO1FBQ0QsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUUscURBQXFEO1FBQ2xGLE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFqQkQsb0NBaUJDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsaUJBQWlCLENBQUMsSUFBWTtRQUNyQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7O09BWUc7SUFDSCxTQUFTLG9CQUFvQixDQUFDLEtBQXFCLEVBQUUsS0FBYSxFQUFFLEtBQXVCO1FBQ3pGLDhGQUE4RjtRQUM5RixTQUFTO1FBQ1QsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdDLDRGQUE0RjtZQUM1Riw0Q0FBNEM7WUFDNUMsSUFBSSxDQUFDLHNCQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsT0FBTyxLQUFLLENBQUM7U0FDL0Q7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBnZXRGaWxlU3lzdGVtLCBqb2luLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UGF0aE1hcHBpbmdzfSBmcm9tICcuLi91dGlscyc7XG5cbi8qKlxuICogRXh0cmFjdCBhbGwgdGhlIGJhc2UtcGF0aHMgdGhhdCB3ZSBuZWVkIHRvIHNlYXJjaCBmb3IgZW50cnktcG9pbnRzLlxuICpcbiAqIFRoaXMgYWx3YXlzIGNvbnRhaW5zIHRoZSBzdGFuZGFyZCBiYXNlLXBhdGggKGBzb3VyY2VEaXJlY3RvcnlgKS5cbiAqIEJ1dCBpdCBhbHNvIHBhcnNlcyB0aGUgYHBhdGhzYCBtYXBwaW5ncyBvYmplY3QgdG8gZ3Vlc3MgYWRkaXRpb25hbCBiYXNlLXBhdGhzLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYFxuICogZ2V0QmFzZVBhdGhzKCcvbm9kZV9tb2R1bGVzJywge2Jhc2VVcmw6ICcvZGlzdCcsIHBhdGhzOiB7JyonOiBbJ2xpYi8qJywgJ2xpYi9nZW5lcmF0ZWQvKiddfX0pXG4gKiA+IFsnL25vZGVfbW9kdWxlcycsICcvZGlzdC9saWInXVxuICogYGBgXG4gKlxuICogTm90aWNlIHRoYXQgYCcvZGlzdCdgIGlzIG5vdCBpbmNsdWRlZCBhcyB0aGVyZSBpcyBubyBgJyonYCBwYXRoLFxuICogYW5kIGAnL2Rpc3QvbGliL2dlbmVyYXRlZCdgIGlzIG5vdCBpbmNsdWRlZCBhcyBpdCBpcyBjb3ZlcmVkIGJ5IGAnL2Rpc3QvbGliJ2AuXG4gKlxuICogQHBhcmFtIHNvdXJjZURpcmVjdG9yeSBUaGUgc3RhbmRhcmQgYmFzZS1wYXRoIChlLmcuIG5vZGVfbW9kdWxlcykuXG4gKiBAcGFyYW0gcGF0aE1hcHBpbmdzIFBhdGggbWFwcGluZyBjb25maWd1cmF0aW9uLCBmcm9tIHdoaWNoIHRvIGV4dHJhY3QgYWRkaXRpb25hbCBiYXNlLXBhdGhzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QmFzZVBhdGhzKFxuICAgIHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsIHBhdGhNYXBwaW5nczogUGF0aE1hcHBpbmdzIHwgdW5kZWZpbmVkKTogQWJzb2x1dGVGc1BhdGhbXSB7XG4gIGNvbnN0IGZzID0gZ2V0RmlsZVN5c3RlbSgpO1xuICBjb25zdCBiYXNlUGF0aHMgPSBbc291cmNlRGlyZWN0b3J5XTtcbiAgaWYgKHBhdGhNYXBwaW5ncykge1xuICAgIGNvbnN0IGJhc2VVcmwgPSByZXNvbHZlKHBhdGhNYXBwaW5ncy5iYXNlVXJsKTtcbiAgICBPYmplY3QudmFsdWVzKHBhdGhNYXBwaW5ncy5wYXRocykuZm9yRWFjaChwYXRocyA9PiBwYXRocy5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgLy8gV2Ugb25seSB3YW50IGJhc2UgcGF0aHMgdGhhdCBleGlzdCBhbmQgYXJlIG5vdCBmaWxlc1xuICAgICAgbGV0IGJhc2VQYXRoID0gam9pbihiYXNlVXJsLCBleHRyYWN0UGF0aFByZWZpeChwYXRoKSk7XG4gICAgICB3aGlsZSAoYmFzZVBhdGggIT09IGJhc2VVcmwgJiYgKCFmcy5leGlzdHMoYmFzZVBhdGgpIHx8IGZzLnN0YXQoYmFzZVBhdGgpLmlzRmlsZSgpKSkge1xuICAgICAgICBiYXNlUGF0aCA9IGZzLmRpcm5hbWUoYmFzZVBhdGgpO1xuICAgICAgfVxuICAgICAgYmFzZVBhdGhzLnB1c2goYmFzZVBhdGgpO1xuICAgIH0pKTtcbiAgfVxuICBiYXNlUGF0aHMuc29ydCgpLnJldmVyc2UoKTsgIC8vIEdldCB0aGUgcGF0aHMgaW4gb3JkZXIgd2l0aCB0aGUgbG9uZ2VyIG9uZXMgZmlyc3QuXG4gIHJldHVybiBiYXNlUGF0aHMuZmlsdGVyKHJlbW92ZUNvbnRhaW5lZFBhdGhzKTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGV2ZXJ5dGhpbmcgaW4gdGhlIGBwYXRoYCB1cCB0byB0aGUgZmlyc3QgYCpgLlxuICogQHBhcmFtIHBhdGggVGhlIHBhdGggdG8gcGFyc2UuXG4gKiBAcmV0dXJucyBUaGUgZXh0cmFjdGVkIHByZWZpeC5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFBhdGhQcmVmaXgocGF0aDogc3RyaW5nKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KCcqJywgMSlbMF07XG59XG5cbi8qKlxuICogQSBmaWx0ZXIgZnVuY3Rpb24gdGhhdCByZW1vdmVzIHBhdGhzIHRoYXQgYXJlIGNvbnRhaW5lZCBieSBvdGhlciBwYXRocy5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqIEdpdmVuIGBbJ2EvYi9jJywgJ2EvYi94JywgJ2EvYicsICdkL2UnLCAnZC9mJ11gIHdlIHdpbGwgZW5kIHVwIHdpdGggYFsnYS9iJywgJ2QvZScsICdkL2ZdYC5cbiAqIChOb3RlIHRoYXQgd2UgZG8gbm90IGdldCBgZGAgZXZlbiB0aG91Z2ggYGQvZWAgYW5kIGBkL2ZgIHNoYXJlIGEgYmFzZSBkaXJlY3RvcnksIHNpbmNlIGBkYCBpcyBub3RcbiAqIG9uZSBvZiB0aGUgYmFzZSBwYXRocy4pXG4gKlxuICogQHBhcmFtIHZhbHVlIFRoZSBjdXJyZW50IHBhdGguXG4gKiBAcGFyYW0gaW5kZXggVGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHBhdGguXG4gKiBAcGFyYW0gYXJyYXkgVGhlIGFycmF5IG9mIHBhdGhzIChzb3J0ZWQgaW4gcmV2ZXJzZSBhbHBoYWJldGljYWwgb3JkZXIpLlxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGlzIHBhdGggaXMgbm90IGNvbnRhaW5lZCBieSBhbm90aGVyIHBhdGguXG4gKi9cbmZ1bmN0aW9uIHJlbW92ZUNvbnRhaW5lZFBhdGhzKHZhbHVlOiBBYnNvbHV0ZUZzUGF0aCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IEFic29sdXRlRnNQYXRoW10pIHtcbiAgLy8gV2Ugb25seSBuZWVkIHRvIGNoZWNrIHRoZSBmb2xsb3dpbmcgcGF0aHMgc2luY2UgdGhlIGBhcnJheWAgaXMgc29ydGVkIGluIHJldmVyc2UgYWxwaGFiZXRpY1xuICAvLyBvcmRlci5cbiAgZm9yIChsZXQgaSA9IGluZGV4ICsgMTsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gV2UgbmVlZCB0byB1c2UgYHJlbGF0aXZlKCkuc3RhcnRzV2l0aCgpYCByYXRoZXIgdGhhbiBhIHNpbXBsZSBgc3RhcnRzV2l0aCgpYCB0byBlbnN1cmUgd2VcbiAgICAvLyBkb24ndCBhc3N1bWUgdGhhdCBgYS9iYCBjb250YWlucyBgYS9iLTJgLlxuICAgIGlmICghcmVsYXRpdmUoYXJyYXlbaV0sIHZhbHVlKS5zdGFydHNXaXRoKCcuLicpKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG4iXX0=