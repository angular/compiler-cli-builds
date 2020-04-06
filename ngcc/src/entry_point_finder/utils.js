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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQWdHO0lBSWhHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSCxTQUFnQixZQUFZLENBQ3hCLE1BQWMsRUFBRSxlQUErQixFQUMvQyxZQUFvQztRQUN0QyxJQUFNLEVBQUUsR0FBRywyQkFBYSxFQUFFLENBQUM7UUFDM0IsSUFBTSxTQUFTLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwQyxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFNLFNBQU8sR0FBRyxxQkFBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5QyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBTyxDQUFDLEVBQUU7Z0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQ1Asd0RBQXNELFNBQU8sUUFBSztvQkFDbEUsc0ZBQXNGO29CQUN0RixrRkFBa0YsQ0FBQyxDQUFDO2FBQ3pGO1lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUk7Z0JBQ25FLHVEQUF1RDtnQkFDdkQsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7b0JBQ3JELFFBQVEsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUNqQztnQkFDRCxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ3ZCLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQzFCO3FCQUFNO29CQUNMLE1BQU0sQ0FBQyxJQUFJLENBQ1Asb0JBQWlCLFFBQVEsbUNBQTRCLFNBQU8sOEJBQ3hELElBQUksNENBQXdDO3dCQUNoRCwwQ0FBMEMsQ0FBQyxDQUFDO2lCQUNqRDtZQUNILENBQUMsQ0FBQyxFQWRpRCxDQWNqRCxDQUFDLENBQUM7U0FDTDtRQUNELFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFFLHFEQUFxRDtRQUNsRixJQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUVoRSw2RkFBNkY7UUFDN0YsOEVBQThFO1FBQzlFLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxjQUFjO1lBQy9DLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQy9DLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUMzQztRQUVELE9BQU8sZ0JBQWdCLENBQUM7SUFDMUIsQ0FBQztJQXhDRCxvQ0F3Q0M7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxJQUFZO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7T0FZRztJQUNILFNBQVMsb0JBQW9CLENBQUMsS0FBcUIsRUFBRSxLQUFhLEVBQUUsS0FBdUI7UUFDekYsOEZBQThGO1FBQzlGLFNBQVM7UUFDVCxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0MsNEZBQTRGO1lBQzVGLDRDQUE0QztZQUM1QyxJQUFJLENBQUMsc0JBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFBRSxPQUFPLEtBQUssQ0FBQztTQUMvRDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQWdCLGFBQWEsQ0FBVyxJQUFpRCxFQUMzQixHQUErQjtRQUMzRixJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsSUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDdEIsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDakUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQVBELHNDQU9DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgZ2V0RmlsZVN5c3RlbSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBFeHRyYWN0IGFsbCB0aGUgYmFzZS1wYXRocyB0aGF0IHdlIG5lZWQgdG8gc2VhcmNoIGZvciBlbnRyeS1wb2ludHMuXG4gKlxuICogVGhpcyBhbHdheXMgY29udGFpbnMgdGhlIHN0YW5kYXJkIGJhc2UtcGF0aCAoYHNvdXJjZURpcmVjdG9yeWApLlxuICogQnV0IGl0IGFsc28gcGFyc2VzIHRoZSBgcGF0aHNgIG1hcHBpbmdzIG9iamVjdCB0byBndWVzcyBhZGRpdGlvbmFsIGJhc2UtcGF0aHMuXG4gKlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBnZXRCYXNlUGF0aHMoJy9ub2RlX21vZHVsZXMnLCB7YmFzZVVybDogJy9kaXN0JywgcGF0aHM6IHsnKic6IFsnbGliLyonLCAnbGliL2dlbmVyYXRlZC8qJ119fSlcbiAqID4gWycvbm9kZV9tb2R1bGVzJywgJy9kaXN0L2xpYiddXG4gKiBgYGBcbiAqXG4gKiBOb3RpY2UgdGhhdCBgJy9kaXN0J2AgaXMgbm90IGluY2x1ZGVkIGFzIHRoZXJlIGlzIG5vIGAnKidgIHBhdGgsXG4gKiBhbmQgYCcvZGlzdC9saWIvZ2VuZXJhdGVkJ2AgaXMgbm90IGluY2x1ZGVkIGFzIGl0IGlzIGNvdmVyZWQgYnkgYCcvZGlzdC9saWInYC5cbiAqXG4gKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IFRoZSBzdGFuZGFyZCBiYXNlLXBhdGggKGUuZy4gbm9kZV9tb2R1bGVzKS5cbiAqIEBwYXJhbSBwYXRoTWFwcGluZ3MgUGF0aCBtYXBwaW5nIGNvbmZpZ3VyYXRpb24sIGZyb20gd2hpY2ggdG8gZXh0cmFjdCBhZGRpdGlvbmFsIGJhc2UtcGF0aHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRCYXNlUGF0aHMoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3N8dW5kZWZpbmVkKTogQWJzb2x1dGVGc1BhdGhbXSB7XG4gIGNvbnN0IGZzID0gZ2V0RmlsZVN5c3RlbSgpO1xuICBjb25zdCBiYXNlUGF0aHMgPSBbc291cmNlRGlyZWN0b3J5XTtcbiAgaWYgKHBhdGhNYXBwaW5ncykge1xuICAgIGNvbnN0IGJhc2VVcmwgPSByZXNvbHZlKHBhdGhNYXBwaW5ncy5iYXNlVXJsKTtcbiAgICBpZiAoZnMuaXNSb290KGJhc2VVcmwpKSB7XG4gICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICBgVGhlIHByb3ZpZGVkIHBhdGhNYXBwaW5ncyBiYXNlVXJsIGlzIHRoZSByb290IHBhdGggJHtiYXNlVXJsfS5cXG5gICtcbiAgICAgICAgICBgVGhpcyBpcyBsaWtlbHkgdG8gbWVzcyB1cCBob3cgbmdjYyBmaW5kcyBlbnRyeS1wb2ludHMgYW5kIGlzIHByb2JhYmx5IG5vdCBjb3JyZWN0LlxcbmAgK1xuICAgICAgICAgIGBQbGVhc2UgY2hlY2sgeW91ciBwYXRoIG1hcHBpbmdzIGNvbmZpZ3VyYXRpb24gc3VjaCBhcyBpbiB0aGUgdHNjb25maWcuanNvbiBmaWxlLmApO1xuICAgIH1cbiAgICBPYmplY3QudmFsdWVzKHBhdGhNYXBwaW5ncy5wYXRocykuZm9yRWFjaChwYXRocyA9PiBwYXRocy5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgLy8gV2Ugb25seSB3YW50IGJhc2UgcGF0aHMgdGhhdCBleGlzdCBhbmQgYXJlIG5vdCBmaWxlc1xuICAgICAgbGV0IGJhc2VQYXRoID0gZnMucmVzb2x2ZShiYXNlVXJsLCBleHRyYWN0UGF0aFByZWZpeChwYXRoKSk7XG4gICAgICBpZiAoZnMuZXhpc3RzKGJhc2VQYXRoKSAmJiBmcy5zdGF0KGJhc2VQYXRoKS5pc0ZpbGUoKSkge1xuICAgICAgICBiYXNlUGF0aCA9IGZzLmRpcm5hbWUoYmFzZVBhdGgpO1xuICAgICAgfVxuICAgICAgaWYgKGZzLmV4aXN0cyhiYXNlUGF0aCkpIHtcbiAgICAgICAgYmFzZVBhdGhzLnB1c2goYmFzZVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBgVGhlIGJhc2VQYXRoIFwiJHtiYXNlUGF0aH1cIiBjb21wdXRlZCBmcm9tIGJhc2VVcmwgXCIke2Jhc2VVcmx9XCIgYW5kIHBhdGggbWFwcGluZyBcIiR7XG4gICAgICAgICAgICAgICAgcGF0aH1cIiBkb2VzIG5vdCBleGlzdCBpbiB0aGUgZmlsZS1zeXN0ZW0uXFxuYCArXG4gICAgICAgICAgICBgSXQgd2lsbCBub3QgYmUgc2Nhbm5lZCBmb3IgZW50cnktcG9pbnRzLmApO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuICBiYXNlUGF0aHMuc29ydCgpLnJldmVyc2UoKTsgIC8vIEdldCB0aGUgcGF0aHMgaW4gb3JkZXIgd2l0aCB0aGUgbG9uZ2VyIG9uZXMgZmlyc3QuXG4gIGNvbnN0IGRlZHVwZWRCYXNlUGF0aHMgPSBiYXNlUGF0aHMuZmlsdGVyKHJlbW92ZUNvbnRhaW5lZFBhdGhzKTtcblxuICAvLyBXZSB3YW50IHRvIGVuc3VyZSB0aGF0IHRoZSBgc291cmNlRGlyZWN0b3J5YCBpcyBpbmNsdWRlZCB3aGVuIGl0IGlzIGEgbm9kZV9tb2R1bGVzIGZvbGRlci5cbiAgLy8gT3RoZXJ3aXNlIG91ciBlbnRyeS1wb2ludCBmaW5kaW5nIGFsZ29yaXRobSB3b3VsZCBmYWlsIHRvIHdhbGsgdGhhdCBmb2xkZXIuXG4gIGlmIChmcy5iYXNlbmFtZShzb3VyY2VEaXJlY3RvcnkpID09PSAnbm9kZV9tb2R1bGVzJyAmJlxuICAgICAgIWRlZHVwZWRCYXNlUGF0aHMuaW5jbHVkZXMoc291cmNlRGlyZWN0b3J5KSkge1xuICAgIGRlZHVwZWRCYXNlUGF0aHMudW5zaGlmdChzb3VyY2VEaXJlY3RvcnkpO1xuICB9XG5cbiAgcmV0dXJuIGRlZHVwZWRCYXNlUGF0aHM7XG59XG5cbi8qKlxuICogRXh0cmFjdCBldmVyeXRoaW5nIGluIHRoZSBgcGF0aGAgdXAgdG8gdGhlIGZpcnN0IGAqYC5cbiAqIEBwYXJhbSBwYXRoIFRoZSBwYXRoIHRvIHBhcnNlLlxuICogQHJldHVybnMgVGhlIGV4dHJhY3RlZCBwcmVmaXguXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RQYXRoUHJlZml4KHBhdGg6IHN0cmluZykge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnKicsIDEpWzBdO1xufVxuXG4vKipcbiAqIEEgZmlsdGVyIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyBwYXRocyB0aGF0IGFyZSBjb250YWluZWQgYnkgb3RoZXIgcGF0aHMuXG4gKlxuICogRm9yIGV4YW1wbGU6XG4gKiBHaXZlbiBgWydhL2IvYycsICdhL2IveCcsICdhL2InLCAnZC9lJywgJ2QvZiddYCB3ZSB3aWxsIGVuZCB1cCB3aXRoIGBbJ2EvYicsICdkL2UnLCAnZC9mXWAuXG4gKiAoTm90ZSB0aGF0IHdlIGRvIG5vdCBnZXQgYGRgIGV2ZW4gdGhvdWdoIGBkL2VgIGFuZCBgZC9mYCBzaGFyZSBhIGJhc2UgZGlyZWN0b3J5LCBzaW5jZSBgZGAgaXMgbm90XG4gKiBvbmUgb2YgdGhlIGJhc2UgcGF0aHMuKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSBUaGUgY3VycmVudCBwYXRoLlxuICogQHBhcmFtIGluZGV4IFRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBwYXRoLlxuICogQHBhcmFtIGFycmF5IFRoZSBhcnJheSBvZiBwYXRocyAoc29ydGVkIGluIHJldmVyc2UgYWxwaGFiZXRpY2FsIG9yZGVyKS5cbiAqIEByZXR1cm5zIHRydWUgaWYgdGhpcyBwYXRoIGlzIG5vdCBjb250YWluZWQgYnkgYW5vdGhlciBwYXRoLlxuICovXG5mdW5jdGlvbiByZW1vdmVDb250YWluZWRQYXRocyh2YWx1ZTogQWJzb2x1dGVGc1BhdGgsIGluZGV4OiBudW1iZXIsIGFycmF5OiBBYnNvbHV0ZUZzUGF0aFtdKSB7XG4gIC8vIFdlIG9ubHkgbmVlZCB0byBjaGVjayB0aGUgZm9sbG93aW5nIHBhdGhzIHNpbmNlIHRoZSBgYXJyYXlgIGlzIHNvcnRlZCBpbiByZXZlcnNlIGFscGhhYmV0aWNcbiAgLy8gb3JkZXIuXG4gIGZvciAobGV0IGkgPSBpbmRleCArIDE7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIC8vIFdlIG5lZWQgdG8gdXNlIGByZWxhdGl2ZSgpLnN0YXJ0c1dpdGgoKWAgcmF0aGVyIHRoYW4gYSBzaW1wbGUgYHN0YXJ0c1dpdGgoKWAgdG8gZW5zdXJlIHdlXG4gICAgLy8gZG9uJ3QgYXNzdW1lIHRoYXQgYGEvYmAgY29udGFpbnMgYGEvYi0yYC5cbiAgICBpZiAoIXJlbGF0aXZlKGFycmF5W2ldLCB2YWx1ZSkuc3RhcnRzV2l0aCgnLi4nKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIFJ1biBhIHRhc2sgYW5kIHRyYWNrIGhvdyBsb25nIGl0IHRha2VzLlxuICpcbiAqIEBwYXJhbSB0YXNrIFRoZSB0YXNrIHdob3NlIGR1cmF0aW9uIHdlIGFyZSB0cmFja2luZ1xuICogQHBhcmFtIGxvZyBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aXRoIHRoZSBkdXJhdGlvbiBvZiB0aGUgdGFza1xuICogQHJldHVybnMgVGhlIHJlc3VsdCBvZiBjYWxsaW5nIGB0YXNrYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYWNrRHVyYXRpb248VCA9IHZvaWQ+KHRhc2s6ICgpID0+IFQgZXh0ZW5kcyBQcm9taXNlPHVua25vd24+PyBuZXZlciA6IFQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZzogKGR1cmF0aW9uOiBudW1iZXIpID0+IHZvaWQpOiBUIHtcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgY29uc3QgcmVzdWx0ID0gdGFzaygpO1xuICBjb25zdCBkdXJhdGlvbiA9IE1hdGgucm91bmQoKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwKSAvIDEwO1xuICBsb2coZHVyYXRpb24pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuIl19