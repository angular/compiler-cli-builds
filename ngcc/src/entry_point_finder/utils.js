(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/entry_point_finder/utils", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dedupePaths = exports.trackDuration = exports.getBasePaths = void 0;
    var tslib_1 = require("tslib");
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
        var dedupedBasePaths = dedupePaths(basePaths);
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
    /**
     * Remove paths that are contained by other paths.
     *
     * For example:
     * Given `['a/b/c', 'a/b/x', 'a/b', 'd/e', 'd/f']` we will end up with `['a/b', 'd/e', 'd/f]`.
     * (Note that we do not get `d` even though `d/e` and `d/f` share a base directory, since `d` is not
     * one of the base paths.)
     */
    function dedupePaths(paths) {
        var e_1, _a;
        var root = { children: new Map() };
        try {
            for (var paths_1 = tslib_1.__values(paths), paths_1_1 = paths_1.next(); !paths_1_1.done; paths_1_1 = paths_1.next()) {
                var path = paths_1_1.value;
                addPath(root, path);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (paths_1_1 && !paths_1_1.done && (_a = paths_1.return)) _a.call(paths_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return flattenTree(root);
    }
    exports.dedupePaths = dedupePaths;
    /**
     * Add a path (defined by the `segments`) to the current `node` in the tree.
     */
    function addPath(root, path) {
        var node = root;
        if (!file_system_1.isRoot(path)) {
            var segments = path.split('/');
            for (var index = 0; index < segments.length; index++) {
                if (isLeaf(node)) {
                    // We hit a leaf so don't bother processing any more of the path
                    return;
                }
                // This is not the end of the path continue to process the rest of this path.
                var next = segments[index];
                if (!node.children.has(next)) {
                    node.children.set(next, { children: new Map() });
                }
                node = node.children.get(next);
            }
        }
        // This path has finished so convert this node to a leaf
        convertToLeaf(node, path);
    }
    /**
     * Flatten the tree of nodes back into an array of absolute paths
     */
    function flattenTree(root) {
        var paths = [];
        var nodes = [root];
        for (var index = 0; index < nodes.length; index++) {
            var node = nodes[index];
            if (isLeaf(node)) {
                // We found a leaf so store the currentPath
                paths.push(node.path);
            }
            else {
                node.children.forEach(function (value) { return nodes.push(value); });
            }
        }
        return paths;
    }
    function isLeaf(node) {
        return node.path !== undefined;
    }
    function convertToLeaf(node, path) {
        node.path = path;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwyRUFBOEY7SUFJOUY7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQWtCRztJQUNILFNBQWdCLFlBQVksQ0FDeEIsTUFBYyxFQUFFLGVBQStCLEVBQy9DLFlBQW9DO1FBQ3RDLElBQU0sRUFBRSxHQUFHLDJCQUFhLEVBQUUsQ0FBQztRQUMzQixJQUFNLFNBQVMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3BDLElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQU0sU0FBTyxHQUFHLHFCQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzlDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFPLENBQUMsRUFBRTtnQkFDdEIsTUFBTSxDQUFDLElBQUksQ0FDUCx3REFBc0QsU0FBTyxRQUFLO29CQUNsRSxzRkFBc0Y7b0JBQ3RGLGtGQUFrRixDQUFDLENBQUM7YUFDekY7WUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSTtnQkFDbkUsdURBQXVEO2dCQUN2RCxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQU8sRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUM1RCxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDckQsUUFBUSxHQUFHLEVB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QUcsRUFBRSxFQUFDLENBQUMsQ0FBQztpQkFDaEQ7Z0JBQ0QsSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDO2FBQ2pDO1NBQ0Y7UUFDRCx3REFBd0Q7UUFDeEQsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLFdBQVcsQ0FBQyxJQUFVO1FBQzdCLElBQU0sS0FBSyxHQUFxQixFQUFFLENBQUM7UUFDbkMsSUFBTSxLQUFLLEdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNqRCxJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2hCLDJDQUEyQztnQkFDM0MsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDdkI7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFqQixDQUFpQixDQUFDLENBQUM7YUFDbkQ7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELFNBQVMsTUFBTSxDQUFDLElBQVU7UUFDeEIsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQztJQUNqQyxDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUMsSUFBVSxFQUFFLElBQW9CO1FBQ3JELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBnZXRGaWxlU3lzdGVtLCBpc1Jvb3QsIHJlc29sdmV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtQYXRoTWFwcGluZ3N9IGZyb20gJy4uL3BhdGhfbWFwcGluZ3MnO1xuXG4vKipcbiAqIEV4dHJhY3QgYWxsIHRoZSBiYXNlLXBhdGhzIHRoYXQgd2UgbmVlZCB0byBzZWFyY2ggZm9yIGVudHJ5LXBvaW50cy5cbiAqXG4gKiBUaGlzIGFsd2F5cyBjb250YWlucyB0aGUgc3RhbmRhcmQgYmFzZS1wYXRoIChgc291cmNlRGlyZWN0b3J5YCkuXG4gKiBCdXQgaXQgYWxzbyBwYXJzZXMgdGhlIGBwYXRoc2AgbWFwcGluZ3Mgb2JqZWN0IHRvIGd1ZXNzIGFkZGl0aW9uYWwgYmFzZS1wYXRocy5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBcbiAqIGdldEJhc2VQYXRocygnL25vZGVfbW9kdWxlcycsIHtiYXNlVXJsOiAnL2Rpc3QnLCBwYXRoczogeycqJzogWydsaWIvKicsICdsaWIvZ2VuZXJhdGVkLyonXX19KVxuICogPiBbJy9ub2RlX21vZHVsZXMnLCAnL2Rpc3QvbGliJ11cbiAqIGBgYFxuICpcbiAqIE5vdGljZSB0aGF0IGAnL2Rpc3QnYCBpcyBub3QgaW5jbHVkZWQgYXMgdGhlcmUgaXMgbm8gYCcqJ2AgcGF0aCxcbiAqIGFuZCBgJy9kaXN0L2xpYi9nZW5lcmF0ZWQnYCBpcyBub3QgaW5jbHVkZWQgYXMgaXQgaXMgY292ZXJlZCBieSBgJy9kaXN0L2xpYidgLlxuICpcbiAqIEBwYXJhbSBzb3VyY2VEaXJlY3RvcnkgVGhlIHN0YW5kYXJkIGJhc2UtcGF0aCAoZS5nLiBub2RlX21vZHVsZXMpLlxuICogQHBhcmFtIHBhdGhNYXBwaW5ncyBQYXRoIG1hcHBpbmcgY29uZmlndXJhdGlvbiwgZnJvbSB3aGljaCB0byBleHRyYWN0IGFkZGl0aW9uYWwgYmFzZS1wYXRocy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEJhc2VQYXRocyhcbiAgICBsb2dnZXI6IExvZ2dlciwgc291cmNlRGlyZWN0b3J5OiBBYnNvbHV0ZUZzUGF0aCxcbiAgICBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5nc3x1bmRlZmluZWQpOiBBYnNvbHV0ZUZzUGF0aFtdIHtcbiAgY29uc3QgZnMgPSBnZXRGaWxlU3lzdGVtKCk7XG4gIGNvbnN0IGJhc2VQYXRocyA9IFtzb3VyY2VEaXJlY3RvcnldO1xuICBpZiAocGF0aE1hcHBpbmdzKSB7XG4gICAgY29uc3QgYmFzZVVybCA9IHJlc29sdmUocGF0aE1hcHBpbmdzLmJhc2VVcmwpO1xuICAgIGlmIChmcy5pc1Jvb3QoYmFzZVVybCkpIHtcbiAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgIGBUaGUgcHJvdmlkZWQgcGF0aE1hcHBpbmdzIGJhc2VVcmwgaXMgdGhlIHJvb3QgcGF0aCAke2Jhc2VVcmx9LlxcbmAgK1xuICAgICAgICAgIGBUaGlzIGlzIGxpa2VseSB0byBtZXNzIHVwIGhvdyBuZ2NjIGZpbmRzIGVudHJ5LXBvaW50cyBhbmQgaXMgcHJvYmFibHkgbm90IGNvcnJlY3QuXFxuYCArXG4gICAgICAgICAgYFBsZWFzZSBjaGVjayB5b3VyIHBhdGggbWFwcGluZ3MgY29uZmlndXJhdGlvbiBzdWNoIGFzIGluIHRoZSB0c2NvbmZpZy5qc29uIGZpbGUuYCk7XG4gICAgfVxuICAgIE9iamVjdC52YWx1ZXMocGF0aE1hcHBpbmdzLnBhdGhzKS5mb3JFYWNoKHBhdGhzID0+IHBhdGhzLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAvLyBXZSBvbmx5IHdhbnQgYmFzZSBwYXRocyB0aGF0IGV4aXN0IGFuZCBhcmUgbm90IGZpbGVzXG4gICAgICBsZXQgYmFzZVBhdGggPSBmcy5yZXNvbHZlKGJhc2VVcmwsIGV4dHJhY3RQYXRoUHJlZml4KHBhdGgpKTtcbiAgICAgIGlmIChmcy5leGlzdHMoYmFzZVBhdGgpICYmIGZzLnN0YXQoYmFzZVBhdGgpLmlzRmlsZSgpKSB7XG4gICAgICAgIGJhc2VQYXRoID0gZnMuZGlybmFtZShiYXNlUGF0aCk7XG4gICAgICB9XG4gICAgICBpZiAoZnMuZXhpc3RzKGJhc2VQYXRoKSkge1xuICAgICAgICBiYXNlUGF0aHMucHVzaChiYXNlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIuZGVidWcoXG4gICAgICAgICAgICBgVGhlIGJhc2VQYXRoIFwiJHtiYXNlUGF0aH1cIiBjb21wdXRlZCBmcm9tIGJhc2VVcmwgXCIke2Jhc2VVcmx9XCIgYW5kIHBhdGggbWFwcGluZyBcIiR7XG4gICAgICAgICAgICAgICAgcGF0aH1cIiBkb2VzIG5vdCBleGlzdCBpbiB0aGUgZmlsZS1zeXN0ZW0uXFxuYCArXG4gICAgICAgICAgICBgSXQgd2lsbCBub3QgYmUgc2Nhbm5lZCBmb3IgZW50cnktcG9pbnRzLmApO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuXG4gIGNvbnN0IGRlZHVwZWRCYXNlUGF0aHMgPSBkZWR1cGVQYXRocyhiYXNlUGF0aHMpO1xuXG4gIC8vIFdlIHdhbnQgdG8gZW5zdXJlIHRoYXQgdGhlIGBzb3VyY2VEaXJlY3RvcnlgIGlzIGluY2x1ZGVkIHdoZW4gaXQgaXMgYSBub2RlX21vZHVsZXMgZm9sZGVyLlxuICAvLyBPdGhlcndpc2Ugb3VyIGVudHJ5LXBvaW50IGZpbmRpbmcgYWxnb3JpdGhtIHdvdWxkIGZhaWwgdG8gd2FsayB0aGF0IGZvbGRlci5cbiAgaWYgKGZzLmJhc2VuYW1lKHNvdXJjZURpcmVjdG9yeSkgPT09ICdub2RlX21vZHVsZXMnICYmXG4gICAgICAhZGVkdXBlZEJhc2VQYXRocy5pbmNsdWRlcyhzb3VyY2VEaXJlY3RvcnkpKSB7XG4gICAgZGVkdXBlZEJhc2VQYXRocy51bnNoaWZ0KHNvdXJjZURpcmVjdG9yeSk7XG4gIH1cblxuICByZXR1cm4gZGVkdXBlZEJhc2VQYXRocztcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGV2ZXJ5dGhpbmcgaW4gdGhlIGBwYXRoYCB1cCB0byB0aGUgZmlyc3QgYCpgLlxuICogQHBhcmFtIHBhdGggVGhlIHBhdGggdG8gcGFyc2UuXG4gKiBAcmV0dXJucyBUaGUgZXh0cmFjdGVkIHByZWZpeC5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdFBhdGhQcmVmaXgocGF0aDogc3RyaW5nKSB7XG4gIHJldHVybiBwYXRoLnNwbGl0KCcqJywgMSlbMF07XG59XG5cbi8qKlxuICogUnVuIGEgdGFzayBhbmQgdHJhY2sgaG93IGxvbmcgaXQgdGFrZXMuXG4gKlxuICogQHBhcmFtIHRhc2sgVGhlIHRhc2sgd2hvc2UgZHVyYXRpb24gd2UgYXJlIHRyYWNraW5nXG4gKiBAcGFyYW0gbG9nIFRoZSBmdW5jdGlvbiB0byBjYWxsIHdpdGggdGhlIGR1cmF0aW9uIG9mIHRoZSB0YXNrXG4gKiBAcmV0dXJucyBUaGUgcmVzdWx0IG9mIGNhbGxpbmcgYHRhc2tgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhY2tEdXJhdGlvbjxUID0gdm9pZD4odGFzazogKCkgPT4gVCBleHRlbmRzIFByb21pc2U8dW5rbm93bj4/IG5ldmVyIDogVCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nOiAoZHVyYXRpb246IG51bWJlcikgPT4gdm9pZCk6IFQge1xuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICBjb25zdCByZXN1bHQgPSB0YXNrKCk7XG4gIGNvbnN0IGR1cmF0aW9uID0gTWF0aC5yb3VuZCgoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDApIC8gMTA7XG4gIGxvZyhkdXJhdGlvbik7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogUmVtb3ZlIHBhdGhzIHRoYXQgYXJlIGNvbnRhaW5lZCBieSBvdGhlciBwYXRocy5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqIEdpdmVuIGBbJ2EvYi9jJywgJ2EvYi94JywgJ2EvYicsICdkL2UnLCAnZC9mJ11gIHdlIHdpbGwgZW5kIHVwIHdpdGggYFsnYS9iJywgJ2QvZScsICdkL2ZdYC5cbiAqIChOb3RlIHRoYXQgd2UgZG8gbm90IGdldCBgZGAgZXZlbiB0aG91Z2ggYGQvZWAgYW5kIGBkL2ZgIHNoYXJlIGEgYmFzZSBkaXJlY3RvcnksIHNpbmNlIGBkYCBpcyBub3RcbiAqIG9uZSBvZiB0aGUgYmFzZSBwYXRocy4pXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWR1cGVQYXRocyhwYXRoczogQWJzb2x1dGVGc1BhdGhbXSk6IEFic29sdXRlRnNQYXRoW10ge1xuICBjb25zdCByb290OiBOb2RlID0ge2NoaWxkcmVuOiBuZXcgTWFwKCl9O1xuICBmb3IgKGNvbnN0IHBhdGggb2YgcGF0aHMpIHtcbiAgICBhZGRQYXRoKHJvb3QsIHBhdGgpO1xuICB9XG4gIHJldHVybiBmbGF0dGVuVHJlZShyb290KTtcbn1cblxuLyoqXG4gKiBBZGQgYSBwYXRoIChkZWZpbmVkIGJ5IHRoZSBgc2VnbWVudHNgKSB0byB0aGUgY3VycmVudCBgbm9kZWAgaW4gdGhlIHRyZWUuXG4gKi9cbmZ1bmN0aW9uIGFkZFBhdGgocm9vdDogTm9kZSwgcGF0aDogQWJzb2x1dGVGc1BhdGgpOiB2b2lkIHtcbiAgbGV0IG5vZGUgPSByb290O1xuICBpZiAoIWlzUm9vdChwYXRoKSkge1xuICAgIGNvbnN0IHNlZ21lbnRzID0gcGF0aC5zcGxpdCgnLycpO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBzZWdtZW50cy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIGlmIChpc0xlYWYobm9kZSkpIHtcbiAgICAgICAgLy8gV2UgaGl0IGEgbGVhZiBzbyBkb24ndCBib3RoZXIgcHJvY2Vzc2luZyBhbnkgbW9yZSBvZiB0aGUgcGF0aFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBUaGlzIGlzIG5vdCB0aGUgZW5kIG9mIHRoZSBwYXRoIGNvbnRpbnVlIHRvIHByb2Nlc3MgdGhlIHJlc3Qgb2YgdGhpcyBwYXRoLlxuICAgICAgY29uc3QgbmV4dCA9IHNlZ21lbnRzW2luZGV4XTtcbiAgICAgIGlmICghbm9kZS5jaGlsZHJlbi5oYXMobmV4dCkpIHtcbiAgICAgICAgbm9kZS5jaGlsZHJlbi5zZXQobmV4dCwge2NoaWxkcmVuOiBuZXcgTWFwKCl9KTtcbiAgICAgIH1cbiAgICAgIG5vZGUgPSBub2RlLmNoaWxkcmVuLmdldChuZXh0KSE7XG4gICAgfVxuICB9XG4gIC8vIFRoaXMgcGF0aCBoYXMgZmluaXNoZWQgc28gY29udmVydCB0aGlzIG5vZGUgdG8gYSBsZWFmXG4gIGNvbnZlcnRUb0xlYWYobm9kZSwgcGF0aCk7XG59XG5cbi8qKlxuICogRmxhdHRlbiB0aGUgdHJlZSBvZiBub2RlcyBiYWNrIGludG8gYW4gYXJyYXkgb2YgYWJzb2x1dGUgcGF0aHNcbiAqL1xuZnVuY3Rpb24gZmxhdHRlblRyZWUocm9vdDogTm9kZSk6IEFic29sdXRlRnNQYXRoW10ge1xuICBjb25zdCBwYXRoczogQWJzb2x1dGVGc1BhdGhbXSA9IFtdO1xuICBjb25zdCBub2RlczogTm9kZVtdID0gW3Jvb3RdO1xuICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgbm9kZXMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgY29uc3Qgbm9kZSA9IG5vZGVzW2luZGV4XTtcbiAgICBpZiAoaXNMZWFmKG5vZGUpKSB7XG4gICAgICAvLyBXZSBmb3VuZCBhIGxlYWYgc28gc3RvcmUgdGhlIGN1cnJlbnRQYXRoXG4gICAgICBwYXRocy5wdXNoKG5vZGUucGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaCh2YWx1ZSA9PiBub2Rlcy5wdXNoKHZhbHVlKSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYXRocztcbn1cblxuZnVuY3Rpb24gaXNMZWFmKG5vZGU6IE5vZGUpOiBub2RlIGlzIExlYWYge1xuICByZXR1cm4gbm9kZS5wYXRoICE9PSB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRUb0xlYWYobm9kZTogTm9kZSwgcGF0aDogQWJzb2x1dGVGc1BhdGgpIHtcbiAgbm9kZS5wYXRoID0gcGF0aDtcbn1cblxuaW50ZXJmYWNlIE5vZGUge1xuICBjaGlsZHJlbjogTWFwPHN0cmluZywgTm9kZT47XG4gIHBhdGg/OiBBYnNvbHV0ZUZzUGF0aDtcbn1cblxudHlwZSBMZWFmID0gUmVxdWlyZWQ8Tm9kZT47XG4iXX0=