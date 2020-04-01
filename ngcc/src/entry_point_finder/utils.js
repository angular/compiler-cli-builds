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
    function getBasePaths(logger, sourceDirectory, pathMappings) {
        var fs = file_system_1.getFileSystem();
        var basePaths = [sourceDirectory];
        if (pathMappings) {
            var baseUrl_1 = file_system_1.resolve(pathMappings.baseUrl);
            if (fs.isRoot(baseUrl_1)) {
                logger.warn("The provided pathMappings baseUrl is the root path " + baseUrl_1 + ".\n" +
                    "This is likely to mess up how ngcc finds entry-points and is probably not correct.\n" +
                    "Please check your path mappings configuration such as in the tsconfig.json file.");
            }
            Object.values(pathMappings.paths).forEach(function (paths) { return paths.forEach(function (path) {
                // We only want base paths that exist and are not files
                var basePath = fs.resolve(baseUrl_1, extractPathPrefix(path));
                if (fs.exists(basePath) && fs.stat(basePath).isFile()) {
                    basePath = fs.dirname(basePath);
                }
                if (fs.exists(basePath)) {
                    basePaths.push(basePath);
                }
                else {
                    logger.warn("The basePath \"" + basePath + "\" computed from baseUrl \"" + baseUrl_1 + "\" and path mapping \"" + path + "\" does not exist in the file-system.\n" +
                        "It will not be scanned for entry-points.");
                }
            }); });
        }
        basePaths.sort().reverse(); // Get the paths in order with the longer ones first.
        var dedupedBasePaths = basePaths.filter(removeContainedPaths);
        // We want to ensure that the `sourceDirectory` is included when it is a node_modules folder.
        // Otherwise our entry-point finding algorithm would fail to walk that folder.
        if (fs.basename(sourceDirectory) === 'node_modules' &&
            !dedupedBasePaths.includes(sourceDirectory)) {
            dedupedBasePaths.unshift(sourceDirectory);
        }
        return dedupedBasePaths;
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
    /**
     * Run a task and track how long it takes.
     *
     * @param task The task whose duration we are tracking
     * @param log The function to call with the duration of the task
     * @returns The result of calling `task`.
     */
    function trackDuration(task, log) {
        var startTime = Date.now();
        var result = task();
        var duration = Math.round((Date.now() - startTime) / 100) / 10;
        log(duration);
        return result;
    }
    exports.trackDuration = trackDuration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQWdHO0lBSWhHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSCxTQUFnQixZQUFZLENBQ3hCLE1BQWMsRUFBRSxlQUErQixFQUMvQyxZQUFzQztRQUN4QyxJQUFNLEVBQUUsR0FBRywyQkFBYSxFQUFFLENBQUM7UUFDM0IsSUFBTSxTQUFTLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwQyxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFNLFNBQU8sR0FBRyxxQkFBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5QyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBTyxDQUFDLEVBQUU7Z0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQ1Asd0RBQXNELFNBQU8sUUFBSztvQkFDbEUsc0ZBQXNGO29CQUN0RixrRkFBa0YsQ0FBQyxDQUFDO2FBQ3pGO1lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUk7Z0JBQ25FLHVEQUF1RDtnQkFDdkQsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7b0JBQ3JELFFBQVEsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUNqQztnQkFDRCxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ3ZCLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQzFCO3FCQUFNO29CQUNMLE1BQU0sQ0FBQyxJQUFJLENBQ1Asb0JBQWlCLFFBQVEsbUNBQTRCLFNBQU8sOEJBQXVCLElBQUksNENBQXdDO3dCQUMvSCwwQ0FBMEMsQ0FBQyxDQUFDO2lCQUNqRDtZQUNILENBQUMsQ0FBQyxFQWJpRCxDQWFqRCxDQUFDLENBQUM7U0FDTDtRQUNELFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFFLHFEQUFxRDtRQUNsRixJQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUVoRSw2RkFBNkY7UUFDN0YsOEVBQThFO1FBQzlFLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxjQUFjO1lBQy9DLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQy9DLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUMzQztRQUVELE9BQU8sZ0JBQWdCLENBQUM7SUFDMUIsQ0FBQztJQXZDRCxvQ0F1Q0M7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxJQUFZO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7T0FZRztJQUNILFNBQVMsb0JBQW9CLENBQUMsS0FBcUIsRUFBRSxLQUFhLEVBQUUsS0FBdUI7UUFDekYsOEZBQThGO1FBQzlGLFNBQVM7UUFDVCxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0MsNEZBQTRGO1lBQzVGLDRDQUE0QztZQUM1QyxJQUFJLENBQUMsc0JBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFBRSxPQUFPLEtBQUssQ0FBQztTQUMvRDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQWdCLGFBQWEsQ0FDekIsSUFBaUQsRUFBRSxHQUErQjtRQUNwRixJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsSUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDdEIsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDakUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQVBELHNDQU9DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgZ2V0RmlsZVN5c3RlbSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBFeHRyYWN0IGFsbCB0aGUgYmFzZS1wYXRocyB0aGF0IHdlIG5lZWQgdG8gc2VhcmNoIGZvciBlbnRyeS1wb2ludHMuXG4gKlxuICogVGhpcyBhbHdheXMgY29udGFpbnMgdGhlIHN0YW5kYXJkIGJhc2UtcGF0aCAoYHNvdXJjZURpcmVjdG9yeWApLlxuICogQnV0IGl0IGFsc28gcGFyc2VzIHRoZSBgcGF0aHNgIG1hcHBpbmdzIG9iamVjdCB0byBndWVzcyBhZGRpdGlvbmFsIGJhc2UtcGF0aHMuXG4gKlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBnZXRCYXNlUGF0aHMoJy9ub2RlX21vZHVsZXMnLCB7YmFzZVVybDogJy9kaXN0JywgcGF0aHM6IHsnKic6IFsnbGliLyonLCAnbGliL2dlbmVyYXRlZC8qJ119fSlcbiAqID4gWycvbm9kZV9tb2R1bGVzJywgJy9kaXN0L2xpYiddXG4gKiBgYGBcbiAqXG4gKiBOb3RpY2UgdGhhdCBgJy9kaXN0J2AgaXMgbm90IGluY2x1ZGVkIGFzIHRoZXJlIGlzIG5vIGAnKidgIHBhdGgsXG4gKiBhbmQgYCcvZGlzdC9saWIvZ2VuZXJhdGVkJ2AgaXMgbm90IGluY2x1ZGVkIGFzIGl0IGlzIGNvdmVyZWQgYnkgYCcvZGlzdC9saWInYC5cbiAqXG4gKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IFRoZSBzdGFuZGFyZCBiYXNlLXBhdGggKGUuZy4gbm9kZV9tb2R1bGVzKS5cbiAqIEBwYXJhbSBwYXRoTWFwcGluZ3MgUGF0aCBtYXBwaW5nIGNvbmZpZ3VyYXRpb24sIGZyb20gd2hpY2ggdG8gZXh0cmFjdCBhZGRpdGlvbmFsIGJhc2UtcGF0aHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRCYXNlUGF0aHMoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3MgfCB1bmRlZmluZWQpOiBBYnNvbHV0ZUZzUGF0aFtdIHtcbiAgY29uc3QgZnMgPSBnZXRGaWxlU3lzdGVtKCk7XG4gIGNvbnN0IGJhc2VQYXRocyA9IFtzb3VyY2VEaXJlY3RvcnldO1xuICBpZiAocGF0aE1hcHBpbmdzKSB7XG4gICAgY29uc3QgYmFzZVVybCA9IHJlc29sdmUocGF0aE1hcHBpbmdzLmJhc2VVcmwpO1xuICAgIGlmIChmcy5pc1Jvb3QoYmFzZVVybCkpIHtcbiAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgIGBUaGUgcHJvdmlkZWQgcGF0aE1hcHBpbmdzIGJhc2VVcmwgaXMgdGhlIHJvb3QgcGF0aCAke2Jhc2VVcmx9LlxcbmAgK1xuICAgICAgICAgIGBUaGlzIGlzIGxpa2VseSB0byBtZXNzIHVwIGhvdyBuZ2NjIGZpbmRzIGVudHJ5LXBvaW50cyBhbmQgaXMgcHJvYmFibHkgbm90IGNvcnJlY3QuXFxuYCArXG4gICAgICAgICAgYFBsZWFzZSBjaGVjayB5b3VyIHBhdGggbWFwcGluZ3MgY29uZmlndXJhdGlvbiBzdWNoIGFzIGluIHRoZSB0c2NvbmZpZy5qc29uIGZpbGUuYCk7XG4gICAgfVxuICAgIE9iamVjdC52YWx1ZXMocGF0aE1hcHBpbmdzLnBhdGhzKS5mb3JFYWNoKHBhdGhzID0+IHBhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAvLyBXZSBvbmx5IHdhbnQgYmFzZSBwYXRocyB0aGF0IGV4aXN0IGFuZCBhcmUgbm90IGZpbGVzXG4gICAgICBsZXQgYmFzZVBhdGggPSBmcy5yZXNvbHZlKGJhc2VVcmwsIGV4dHJhY3RQYXRoUHJlZml4KHBhdGgpKTtcbiAgICAgIGlmIChmcy5leGlzdHMoYmFzZVBhdGgpICYmIGZzLnN0YXQoYmFzZVBhdGgpLmlzRmlsZSgpKSB7XG4gICAgICAgIGJhc2VQYXRoID0gZnMuZGlybmFtZShiYXNlUGF0aCk7XG4gICAgICB9XG4gICAgICBpZiAoZnMuZXhpc3RzKGJhc2VQYXRoKSkge1xuICAgICAgICBiYXNlUGF0aHMucHVzaChiYXNlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICAgIGBUaGUgYmFzZVBhdGggXCIke2Jhc2VQYXRofVwiIGNvbXB1dGVkIGZyb20gYmFzZVVybCBcIiR7YmFzZVVybH1cIiBhbmQgcGF0aCBtYXBwaW5nIFwiJHtwYXRofVwiIGRvZXMgbm90IGV4aXN0IGluIHRoZSBmaWxlLXN5c3RlbS5cXG5gICtcbiAgICAgICAgICAgIGBJdCB3aWxsIG5vdCBiZSBzY2FubmVkIGZvciBlbnRyeS1wb2ludHMuYCk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG4gIGJhc2VQYXRocy5zb3J0KCkucmV2ZXJzZSgpOyAgLy8gR2V0IHRoZSBwYXRocyBpbiBvcmRlciB3aXRoIHRoZSBsb25nZXIgb25lcyBmaXJzdC5cbiAgY29uc3QgZGVkdXBlZEJhc2VQYXRocyA9IGJhc2VQYXRocy5maWx0ZXIocmVtb3ZlQ29udGFpbmVkUGF0aHMpO1xuXG4gIC8vIFdlIHdhbnQgdG8gZW5zdXJlIHRoYXQgdGhlIGBzb3VyY2VEaXJlY3RvcnlgIGlzIGluY2x1ZGVkIHdoZW4gaXQgaXMgYSBub2RlX21vZHVsZXMgZm9sZGVyLlxuICAvLyBPdGhlcndpc2Ugb3VyIGVudHJ5LXBvaW50IGZpbmRpbmcgYWxnb3JpdGhtIHdvdWxkIGZhaWwgdG8gd2FsayB0aGF0IGZvbGRlci5cbiAgaWYgKGZzLmJhc2VuYW1lKHNvdXJjZURpcmVjdG9yeSkgPT09ICdub2RlX21vZHVsZXMnICYmXG4gICAgICAhZGVkdXBlZEJhc2VQYXRocy5pbmNsdWRlcyhzb3VyY2VEaXJlY3RvcnkpKSB7XG4gICAgZGVkdXBlZEJhc2VQYXRocy51bnNoaWZ0KHNvdXJjZURpcmVjdG9yeSk7XG4gIH1cblxuICByZXR1cm4gZGVkdXBlZEJhc2VQYXRocztcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGV2ZXJ5dGhpbmcgaW4gdGhlIGBwYXRoYCB1cCB0byB0aGUgZmlyc3QgYCpgLlxuICogQHBhcmFtIHBhdGggVGhlIHBhdGggdG8gcGFyc2UuXG4gKiBAcmV0dXJucyBUaGUgZXh0cmFjdGVkIHByZWZpeC5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFBhdGhQcmVmaXgocGF0aDogc3RyaW5nKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KCcqJywgMSlbMF07XG59XG5cbi8qKlxuICogQSBmaWx0ZXIgZnVuY3Rpb24gdGhhdCByZW1vdmVzIHBhdGhzIHRoYXQgYXJlIGNvbnRhaW5lZCBieSBvdGhlciBwYXRocy5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqIEdpdmVuIGBbJ2EvYi9jJywgJ2EvYi94JywgJ2EvYicsICdkL2UnLCAnZC9mJ11gIHdlIHdpbGwgZW5kIHVwIHdpdGggYFsnYS9iJywgJ2QvZScsICdkL2ZdYC5cbiAqIChOb3RlIHRoYXQgd2UgZG8gbm90IGdldCBgZGAgZXZlbiB0aG91Z2ggYGQvZWAgYW5kIGBkL2ZgIHNoYXJlIGEgYmFzZSBkaXJlY3RvcnksIHNpbmNlIGBkYCBpcyBub3RcbiAqIG9uZSBvZiB0aGUgYmFzZSBwYXRocy4pXG4gKlxuICogQHBhcmFtIHZhbHVlIFRoZSBjdXJyZW50IHBhdGguXG4gKiBAcGFyYW0gaW5kZXggVGhlIGluZGV4IG9mIHRoZSBjdXJyZW50IHBhdGguXG4gKiBAcGFyYW0gYXJyYXkgVGhlIGFycmF5IG9mIHBhdGhzIChzb3J0ZWQgaW4gcmV2ZXJzZSBhbHBoYWJldGljYWwgb3JkZXIpLlxuICogQHJldHVybnMgdHJ1ZSBpZiB0aGlzIHBhdGggaXMgbm90IGNvbnRhaW5lZCBieSBhbm90aGVyIHBhdGguXG4gKi9cbmZ1bmN0aW9uIHJlbW92ZUNvbnRhaW5lZFBhdGhzKHZhbHVlOiBBYnNvbHV0ZUZzUGF0aCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IEFic29sdXRlRnNQYXRoW10pIHtcbiAgLy8gV2Ugb25seSBuZWVkIHRvIGNoZWNrIHRoZSBmb2xsb3dpbmcgcGF0aHMgc2luY2UgdGhlIGBhcnJheWAgaXMgc29ydGVkIGluIHJldmVyc2UgYWxwaGFiZXRpY1xuICAvLyBvcmRlci5cbiAgZm9yIChsZXQgaSA9IGluZGV4ICsgMTsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gV2UgbmVlZCB0byB1c2UgYHJlbGF0aXZlKCkuc3RhcnRzV2l0aCgpYCByYXRoZXIgdGhhbiBhIHNpbXBsZSBgc3RhcnRzV2l0aCgpYCB0byBlbnN1cmUgd2VcbiAgICAvLyBkb24ndCBhc3N1bWUgdGhhdCBgYS9iYCBjb250YWlucyBgYS9iLTJgLlxuICAgIGlmICghcmVsYXRpdmUoYXJyYXlbaV0sIHZhbHVlKS5zdGFydHNXaXRoKCcuLicpKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogUnVuIGEgdGFzayBhbmQgdHJhY2sgaG93IGxvbmcgaXQgdGFrZXMuXG4gKlxuICogQHBhcmFtIHRhc2sgVGhlIHRhc2sgd2hvc2UgZHVyYXRpb24gd2UgYXJlIHRyYWNraW5nXG4gKiBAcGFyYW0gbG9nIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdpdGggdGhlIGR1cmF0aW9uIG9mIHRoZSB0YXNrXG4gKiBAcmV0dXJucyBUaGUgcmVzdWx0IG9mIGNhbGxpbmcgYHRhc2tgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhY2tEdXJhdGlvbjxUID0gdm9pZD4oXG4gICAgdGFzazogKCkgPT4gVCBleHRlbmRzIFByb21pc2U8dW5rbm93bj4/IG5ldmVyIDogVCwgbG9nOiAoZHVyYXRpb246IG51bWJlcikgPT4gdm9pZCk6IFQge1xuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICBjb25zdCByZXN1bHQgPSB0YXNrKCk7XG4gIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDApIC8gMTA7XG4gIGxvZyhkdXJhdGlvbik7XG4gIHJldHVybiByZXN1bHQ7XG59XG4iXX0=