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
                    logger.debug("The basePath \"" + basePath + "\" computed from baseUrl \"" + baseUrl_1 + "\" and path mapping \"" + path + "\" does not exist in the file-system.\n" +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsMkVBQWdHO0lBSWhHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSCxTQUFnQixZQUFZLENBQ3hCLE1BQWMsRUFBRSxlQUErQixFQUMvQyxZQUFvQztRQUN0QyxJQUFNLEVBQUUsR0FBRywyQkFBYSxFQUFFLENBQUM7UUFDM0IsSUFBTSxTQUFTLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwQyxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFNLFNBQU8sR0FBRyxxQkFBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5QyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBTyxDQUFDLEVBQUU7Z0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQ1Asd0RBQXNELFNBQU8sUUFBSztvQkFDbEUsc0ZBQXNGO29CQUN0RixrRkFBa0YsQ0FBQyxDQUFDO2FBQ3pGO1lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFBLElBQUk7Z0JBQ25FLHVEQUF1RDtnQkFDdkQsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7b0JBQ3JELFFBQVEsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUNqQztnQkFDRCxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ3ZCLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQzFCO3FCQUFNO29CQUNMLE1BQU0sQ0FBQyxLQUFLLENBQ1Isb0JBQWlCLFFBQVEsbUNBQTRCLFNBQU8sOEJBQ3hELElBQUksNENBQXdDO3dCQUNoRCwwQ0FBMEMsQ0FBQyxDQUFDO2lCQUNqRDtZQUNILENBQUMsQ0FBQyxFQWRpRCxDQWNqRCxDQUFDLENBQUM7U0FDTDtRQUNELFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFFLHFEQUFxRDtRQUNsRixJQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUVoRSw2RkFBNkY7UUFDN0YsOEVBQThFO1FBQzlFLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxjQUFjO1lBQy9DLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFO1lBQy9DLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztTQUMzQztRQUVELE9BQU8sZ0JBQWdCLENBQUM7SUFDMUIsQ0FBQztJQXhDRCxvQ0F3Q0M7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxJQUFZO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7T0FZRztJQUNILFNBQVMsb0JBQW9CLENBQUMsS0FBcUIsRUFBRSxLQUFhLEVBQUUsS0FBdUI7UUFDekYsOEZBQThGO1FBQzlGLFNBQVM7UUFDVCxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDN0MsNEZBQTRGO1lBQzVGLDRDQUE0QztZQUM1QyxJQUFJLENBQUMsc0JBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztnQkFBRSxPQUFPLEtBQUssQ0FBQztTQUMvRDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQWdCLGFBQWEsQ0FBVyxJQUFpRCxFQUMzQixHQUErQjtRQUMzRixJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsSUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDdEIsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDakUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2QsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQVBELHNDQU9DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgZ2V0RmlsZVN5c3RlbSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBFeHRyYWN0IGFsbCB0aGUgYmFzZS1wYXRocyB0aGF0IHdlIG5lZWQgdG8gc2VhcmNoIGZvciBlbnRyeS1wb2ludHMuXG4gKlxuICogVGhpcyBhbHdheXMgY29udGFpbnMgdGhlIHN0YW5kYXJkIGJhc2UtcGF0aCAoYHNvdXJjZURpcmVjdG9yeWApLlxuICogQnV0IGl0IGFsc28gcGFyc2VzIHRoZSBgcGF0aHNgIG1hcHBpbmdzIG9iamVjdCB0byBndWVzcyBhZGRpdGlvbmFsIGJhc2UtcGF0aHMuXG4gKlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogYGBgXG4gKiBnZXRCYXNlUGF0aHMoJy9ub2RlX21vZHVsZXMnLCB7YmFzZVVybDogJy9kaXN0JywgcGF0aHM6IHsnKic6IFsnbGliLyonLCAnbGliL2dlbmVyYXRlZC8qJ119fSlcbiAqID4gWycvbm9kZV9tb2R1bGVzJywgJy9kaXN0L2xpYiddXG4gKiBgYGBcbiAqXG4gKiBOb3RpY2UgdGhhdCBgJy9kaXN0J2AgaXMgbm90IGluY2x1ZGVkIGFzIHRoZXJlIGlzIG5vIGAnKidgIHBhdGgsXG4gKiBhbmQgYCcvZGlzdC9saWIvZ2VuZXJhdGVkJ2AgaXMgbm90IGluY2x1ZGVkIGFzIGl0IGlzIGNvdmVyZWQgYnkgYCcvZGlzdC9saWInYC5cbiAqXG4gKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IFRoZSBzdGFuZGFyZCBiYXNlLXBhdGggKGUuZy4gbm9kZV9tb2R1bGVzKS5cbiAqIEBwYXJhbSBwYXRoTWFwcGluZ3MgUGF0aCBtYXBwaW5nIGNvbmZpZ3VyYXRpb24sIGZyb20gd2hpY2ggdG8gZXh0cmFjdCBhZGRpdGlvbmFsIGJhc2UtcGF0aHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRCYXNlUGF0aHMoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIHNvdXJjZURpcmVjdG9yeTogQWJzb2x1dGVGc1BhdGgsXG4gICAgcGF0aE1hcHBpbmdzOiBQYXRoTWFwcGluZ3N8dW5kZWZpbmVkKTogQWJzb2x1dGVGc1BhdGhbXSB7XG4gIGNvbnN0IGZzID0gZ2V0RmlsZVN5c3RlbSgpO1xuICBjb25zdCBiYXNlUGF0aHMgPSBbc291cmNlRGlyZWN0b3J5XTtcbiAgaWYgKHBhdGhNYXBwaW5ncykge1xuICAgIGNvbnN0IGJhc2VVcmwgPSByZXNvbHZlKHBhdGhNYXBwaW5ncy5iYXNlVXJsKTtcbiAgICBpZiAoZnMuaXNSb290KGJhc2VVcmwpKSB7XG4gICAgICBsb2dnZXIud2FybihcbiAgICAgICAgICBgVGhlIHByb3ZpZGVkIHBhdGhNYXBwaW5ncyBiYXNlVXJsIGlzIHRoZSByb290IHBhdGggJHtiYXNlVXJsfS5cXG5gICtcbiAgICAgICAgICBgVGhpcyBpcyBsaWtlbHkgdG8gbWVzcyB1cCBob3cgbmdjYyBmaW5kcyBlbnRyeS1wb2ludHMgYW5kIGlzIHByb2JhYmx5IG5vdCBjb3JyZWN0LlxcbmAgK1xuICAgICAgICAgIGBQbGVhc2UgY2hlY2sgeW91ciBwYXRoIG1hcHBpbmdzIGNvbmZpZ3VyYXRpb24gc3VjaCBhcyBpbiB0aGUgdHNjb25maWcuanNvbiBmaWxlLmApO1xuICAgIH1cbiAgICBPYmplY3QudmFsdWVzKHBhdGhNYXBwaW5ncy5wYXRocykuZm9yRWFjaChwYXRocyA9PiBwYXRocy5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgLy8gV2Ugb25seSB3YW50IGJhc2UgcGF0aHMgdGhhdCBleGlzdCBhbmQgYXJlIG5vdCBmaWxlc1xuICAgICAgbGV0IGJhc2VQYXRoID0gZnMucmVzb2x2ZShiYXNlVXJsLCBleHRyYWN0UGF0aFByZWZpeChwYXRoKSk7XG4gICAgICBpZiAoZnMuZXhpc3RzKGJhc2VQYXRoKSAmJiBmcy5zdGF0KGJhc2VQYXRoKS5pc0ZpbGUoKSkge1xuICAgICAgICBiYXNlUGF0aCA9IGZzLmRpcm5hbWUoYmFzZVBhdGgpO1xuICAgICAgfVxuICAgICAgaWYgKGZzLmV4aXN0cyhiYXNlUGF0aCkpIHtcbiAgICAgICAgYmFzZVBhdGhzLnB1c2goYmFzZVBhdGgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgICAgICAgYFRoZSBiYXNlUGF0aCBcIiR7YmFzZVBhdGh9XCIgY29tcHV0ZWQgZnJvbSBiYXNlVXJsIFwiJHtiYXNlVXJsfVwiIGFuZCBwYXRoIG1hcHBpbmcgXCIke1xuICAgICAgICAgICAgICAgIHBhdGh9XCIgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGZpbGUtc3lzdGVtLlxcbmAgK1xuICAgICAgICAgICAgYEl0IHdpbGwgbm90IGJlIHNjYW5uZWQgZm9yIGVudHJ5LXBvaW50cy5gKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbiAgYmFzZVBhdGhzLnNvcnQoKS5yZXZlcnNlKCk7ICAvLyBHZXQgdGhlIHBhdGhzIGluIG9yZGVyIHdpdGggdGhlIGxvbmdlciBvbmVzIGZpcnN0LlxuICBjb25zdCBkZWR1cGVkQmFzZVBhdGhzID0gYmFzZVBhdGhzLmZpbHRlcihyZW1vdmVDb250YWluZWRQYXRocyk7XG5cbiAgLy8gV2Ugd2FudCB0byBlbnN1cmUgdGhhdCB0aGUgYHNvdXJjZURpcmVjdG9yeWAgaXMgaW5jbHVkZWQgd2hlbiBpdCBpcyBhIG5vZGVfbW9kdWxlcyBmb2xkZXIuXG4gIC8vIE90aGVyd2lzZSBvdXIgZW50cnktcG9pbnQgZmluZGluZyBhbGdvcml0aG0gd291bGQgZmFpbCB0byB3YWxrIHRoYXQgZm9sZGVyLlxuICBpZiAoZnMuYmFzZW5hbWUoc291cmNlRGlyZWN0b3J5KSA9PT0gJ25vZGVfbW9kdWxlcycgJiZcbiAgICAgICFkZWR1cGVkQmFzZVBhdGhzLmluY2x1ZGVzKHNvdXJjZURpcmVjdG9yeSkpIHtcbiAgICBkZWR1cGVkQmFzZVBhdGhzLnVuc2hpZnQoc291cmNlRGlyZWN0b3J5KTtcbiAgfVxuXG4gIHJldHVybiBkZWR1cGVkQmFzZVBhdGhzO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgZXZlcnl0aGluZyBpbiB0aGUgYHBhdGhgIHVwIHRvIHRoZSBmaXJzdCBgKmAuXG4gKiBAcGFyYW0gcGF0aCBUaGUgcGF0aCB0byBwYXJzZS5cbiAqIEByZXR1cm5zIFRoZSBleHRyYWN0ZWQgcHJlZml4LlxuICovXG5mdW5jdGlvbiBleHRyYWN0UGF0aFByZWZpeChwYXRoOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJyonLCAxKVswXTtcbn1cblxuLyoqXG4gKiBBIGZpbHRlciBmdW5jdGlvbiB0aGF0IHJlbW92ZXMgcGF0aHMgdGhhdCBhcmUgY29udGFpbmVkIGJ5IG90aGVyIHBhdGhzLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICogR2l2ZW4gYFsnYS9iL2MnLCAnYS9iL3gnLCAnYS9iJywgJ2QvZScsICdkL2YnXWAgd2Ugd2lsbCBlbmQgdXAgd2l0aCBgWydhL2InLCAnZC9lJywgJ2QvZl1gLlxuICogKE5vdGUgdGhhdCB3ZSBkbyBub3QgZ2V0IGBkYCBldmVuIHRob3VnaCBgZC9lYCBhbmQgYGQvZmAgc2hhcmUgYSBiYXNlIGRpcmVjdG9yeSwgc2luY2UgYGRgIGlzIG5vdFxuICogb25lIG9mIHRoZSBiYXNlIHBhdGhzLilcbiAqXG4gKiBAcGFyYW0gdmFsdWUgVGhlIGN1cnJlbnQgcGF0aC5cbiAqIEBwYXJhbSBpbmRleCBUaGUgaW5kZXggb2YgdGhlIGN1cnJlbnQgcGF0aC5cbiAqIEBwYXJhbSBhcnJheSBUaGUgYXJyYXkgb2YgcGF0aHMgKHNvcnRlZCBpbiByZXZlcnNlIGFscGhhYmV0aWNhbCBvcmRlcikuXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoaXMgcGF0aCBpcyBub3QgY29udGFpbmVkIGJ5IGFub3RoZXIgcGF0aC5cbiAqL1xuZnVuY3Rpb24gcmVtb3ZlQ29udGFpbmVkUGF0aHModmFsdWU6IEFic29sdXRlRnNQYXRoLCBpbmRleDogbnVtYmVyLCBhcnJheTogQWJzb2x1dGVGc1BhdGhbXSkge1xuICAvLyBXZSBvbmx5IG5lZWQgdG8gY2hlY2sgdGhlIGZvbGxvd2luZyBwYXRocyBzaW5jZSB0aGUgYGFycmF5YCBpcyBzb3J0ZWQgaW4gcmV2ZXJzZSBhbHBoYWJldGljXG4gIC8vIG9yZGVyLlxuICBmb3IgKGxldCBpID0gaW5kZXggKyAxOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBXZSBuZWVkIHRvIHVzZSBgcmVsYXRpdmUoKS5zdGFydHNXaXRoKClgIHJhdGhlciB0aGFuIGEgc2ltcGxlIGBzdGFydHNXaXRoKClgIHRvIGVuc3VyZSB3ZVxuICAgIC8vIGRvbid0IGFzc3VtZSB0aGF0IGBhL2JgIGNvbnRhaW5zIGBhL2ItMmAuXG4gICAgaWYgKCFyZWxhdGl2ZShhcnJheVtpXSwgdmFsdWUpLnN0YXJ0c1dpdGgoJy4uJykpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBSdW4gYSB0YXNrIGFuZCB0cmFjayBob3cgbG9uZyBpdCB0YWtlcy5cbiAqXG4gKiBAcGFyYW0gdGFzayBUaGUgdGFzayB3aG9zZSBkdXJhdGlvbiB3ZSBhcmUgdHJhY2tpbmdcbiAqIEBwYXJhbSBsb2cgVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2l0aCB0aGUgZHVyYXRpb24gb2YgdGhlIHRhc2tcbiAqIEByZXR1cm5zIFRoZSByZXN1bHQgb2YgY2FsbGluZyBgdGFza2AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFja0R1cmF0aW9uPFQgPSB2b2lkPih0YXNrOiAoKSA9PiBUIGV4dGVuZHMgUHJvbWlzZTx1bmtub3duPj8gbmV2ZXIgOiBULFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2c6IChkdXJhdGlvbjogbnVtYmVyKSA9PiB2b2lkKTogVCB7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gIGNvbnN0IHJlc3VsdCA9IHRhc2soKTtcbiAgY29uc3QgZHVyYXRpb24gPSBNYXRoLnJvdW5kKChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMCkgLyAxMDtcbiAgbG9nKGR1cmF0aW9uKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==