(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/packages/entry_point_finder", ["require", "exports", "tslib", "canonical-path", "fs", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/packages/entry_point"], factory);
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
    var path = require("canonical-path");
    var fs = require("fs");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    var EntryPointFinder = /** @class */ (function () {
        function EntryPointFinder(resolver) {
            this.resolver = resolver;
        }
        /**
         * Search the given directory, and sub-directories, for Angular package entry points.
         * @param sourceDirectory An absolute path to the directory to search for entry points.
         */
        EntryPointFinder.prototype.findEntryPoints = function (sourceDirectory, targetEntryPointPath) {
            var unsortedEntryPoints = walkDirectoryForEntryPoints(sourceDirectory);
            var targetEntryPoint = targetEntryPointPath ?
                unsortedEntryPoints.find(function (entryPoint) { return entryPoint.path === targetEntryPointPath; }) :
                undefined;
            return this.resolver.sortEntryPointsByDependency(unsortedEntryPoints, targetEntryPoint);
        };
        return EntryPointFinder;
    }());
    exports.EntryPointFinder = EntryPointFinder;
    /**
     * Look for entry points that need to be compiled, starting at the source directory.
     * The function will recurse into directories that start with `@...`, e.g. `@angular/...`.
     * @param sourceDirectory An absolute path to the root directory where searching begins.
     */
    function walkDirectoryForEntryPoints(sourceDirectory) {
        var entryPoints = [];
        fs.readdirSync(sourceDirectory)
            // Not interested in hidden files
            .filter(function (p) { return !p.startsWith('.'); })
            // Ignore node_modules
            .filter(function (p) { return p !== 'node_modules'; })
            // Only interested in directories (and only those that are not symlinks)
            .filter(function (p) {
            var stat = fs.lstatSync(path.resolve(sourceDirectory, p));
            return stat.isDirectory() && !stat.isSymbolicLink();
        })
            .forEach(function (p) {
            // Either the directory is a potential package or a namespace containing packages (e.g
            // `@angular`).
            var packagePath = path_1.AbsoluteFsPath.from(path.join(sourceDirectory, p));
            if (p.startsWith('@')) {
                entryPoints.push.apply(entryPoints, tslib_1.__spread(walkDirectoryForEntryPoints(packagePath)));
            }
            else {
                entryPoints.push.apply(entryPoints, tslib_1.__spread(getEntryPointsForPackage(packagePath)));
                // Also check for any nested node_modules in this package
                var nestedNodeModulesPath = path_1.AbsoluteFsPath.from(path.resolve(packagePath, 'node_modules'));
                if (fs.existsSync(nestedNodeModulesPath)) {
                    entryPoints.push.apply(entryPoints, tslib_1.__spread(walkDirectoryForEntryPoints(nestedNodeModulesPath)));
                }
            }
        });
        return entryPoints;
    }
    /**
     * Recurse the folder structure looking for all the entry points
     * @param packagePath The absolute path to an npm package that may contain entry points
     * @returns An array of entry points that were discovered.
     */
    function getEntryPointsForPackage(packagePath) {
        var entryPoints = [];
        // Try to get an entry point from the top level package directory
        var topLevelEntryPoint = entry_point_1.getEntryPointInfo(packagePath, packagePath);
        if (topLevelEntryPoint !== null) {
            entryPoints.push(topLevelEntryPoint);
        }
        // Now search all the directories of this package for possible entry points
        walkDirectory(packagePath, function (subdir) {
            var subEntryPoint = entry_point_1.getEntryPointInfo(packagePath, subdir);
            if (subEntryPoint !== null) {
                entryPoints.push(subEntryPoint);
            }
        });
        return entryPoints;
    }
    /**
     * Recursively walk a directory and its sub-directories, applying a given
     * function to each directory.
     * @param dir the directory to recursively walk.
     * @param fn the function to apply to each directory.
     */
    function walkDirectory(dir, fn) {
        return fs
            .readdirSync(dir)
            // Not interested in hidden files
            .filter(function (p) { return !p.startsWith('.'); })
            // Ignore node_modules
            .filter(function (p) { return p !== 'node_modules'; })
            // Only interested in directories (and only those that are not symlinks)
            .filter(function (p) {
            var stat = fs.lstatSync(path.resolve(dir, p));
            return stat.isDirectory() && !stat.isSymbolicLink();
        })
            .forEach(function (subDir) {
            var resolvedSubDir = path_1.AbsoluteFsPath.from(path.resolve(dir, subDir));
            fn(resolvedSubDir);
            walkDirectory(resolvedSubDir, fn);
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfZmluZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3BhY2thZ2VzL2VudHJ5X3BvaW50X2ZpbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCxxQ0FBdUM7SUFDdkMsdUJBQXlCO0lBRXpCLDZEQUF1RDtJQUV2RCxtRkFBNEQ7SUFHNUQ7UUFDRSwwQkFBb0IsUUFBNEI7WUFBNUIsYUFBUSxHQUFSLFFBQVEsQ0FBb0I7UUFBRyxDQUFDO1FBQ3BEOzs7V0FHRztRQUNILDBDQUFlLEdBQWYsVUFBZ0IsZUFBK0IsRUFBRSxvQkFBcUM7WUFFcEYsSUFBTSxtQkFBbUIsR0FBRywyQkFBMkIsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN6RSxJQUFNLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLENBQUM7Z0JBQzNDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxVQUFBLFVBQVUsSUFBSSxPQUFBLFVBQVUsQ0FBQyxJQUFJLEtBQUssb0JBQW9CLEVBQXhDLENBQXdDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRixTQUFTLENBQUM7WUFDZCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsbUJBQW1CLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUMxRixDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBZEQsSUFjQztJQWRZLDRDQUFnQjtJQWdCN0I7Ozs7T0FJRztJQUNILFNBQVMsMkJBQTJCLENBQUMsZUFBK0I7UUFDbEUsSUFBTSxXQUFXLEdBQWlCLEVBQUUsQ0FBQztRQUNyQyxFQUFFLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQztZQUMzQixpQ0FBaUM7YUFDaEMsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcs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QUNoRCxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN0RCxDQUFDLENBQUM7YUFDRCxPQUFPLENBQUMsVUFBQSxNQUFNO1lBQ2IsSUFBTSxjQUFjLEdBQUcscUJBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN0RSxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDbkIsYUFBYSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztJQUNULENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ2Nhbm9uaWNhbC1wYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIFNvcnRlZEVudHJ5UG9pbnRzSW5mb30gZnJvbSAnLi9kZXBlbmRlbmN5X3Jlc29sdmVyJztcbmltcG9ydCB7RW50cnlQb2ludCwgZ2V0RW50cnlQb2ludEluZm99IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG5cbmV4cG9ydCBjbGFzcyBFbnRyeVBvaW50RmluZGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZXNvbHZlcjogRGVwZW5kZW5jeVJlc29sdmVyKSB7fVxuICAvKipcbiAgICogU2VhcmNoIHRoZSBnaXZlbiBkaXJlY3RvcnksIGFuZCBzdWItZGlyZWN0b3JpZXMsIGZvciBBbmd1bGFyIHBhY2thZ2UgZW50cnkgcG9pbnRzLlxuICAgKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IEFuIGFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSB0byBzZWFyY2ggZm9yIGVudHJ5IHBvaW50cy5cbiAgICovXG4gIGZpbmRFbnRyeVBvaW50cyhzb3VyY2VEaXJlY3Rvcnk6IEFic29sdXRlRnNQYXRoLCB0YXJnZXRFbnRyeVBvaW50UGF0aD86IEFic29sdXRlRnNQYXRoKTpcbiAgICAgIFNvcnRlZEVudHJ5UG9pbnRzSW5mbyB7XG4gICAgY29uc3QgdW5zb3J0ZWRFbnRyeVBvaW50cyA9IHdhbGtEaXJlY3RvcnlGb3JFbnRyeVBvaW50cyhzb3VyY2VEaXJlY3RvcnkpO1xuICAgIGNvbnN0IHRhcmdldEVudHJ5UG9pbnQgPSB0YXJnZXRFbnRyeVBvaW50UGF0aCA/XG4gICAgICAgIHVuc29ydGVkRW50cnlQb2ludHMuZmluZChlbnRyeVBvaW50ID0+IGVudHJ5UG9pbnQucGF0aCA9PT0gdGFyZ2V0RW50cnlQb2ludFBhdGgpIDpcbiAgICAgICAgdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzLnJlc29sdmVyLnNvcnRFbnRyeVBvaW50c0J5RGVwZW5kZW5jeSh1bnNvcnRlZEVudHJ5UG9pbnRzLCB0YXJnZXRFbnRyeVBvaW50KTtcbiAgfVxufVxuXG4vKipcbiAqIExvb2sgZm9yIGVudHJ5IHBvaW50cyB0aGF0IG5lZWQgdG8gYmUgY29tcGlsZWQsIHN0YXJ0aW5nIGF0IHRoZSBzb3VyY2UgZGlyZWN0b3J5LlxuICogVGhlIGZ1bmN0aW9uIHdpbGwgcmVjdXJzZSBpbnRvIGRpcmVjdG9yaWVzIHRoYXQgc3RhcnQgd2l0aCBgQC4uLmAsIGUuZy4gYEBhbmd1bGFyLy4uLmAuXG4gKiBAcGFyYW0gc291cmNlRGlyZWN0b3J5IEFuIGFic29sdXRlIHBhdGggdG8gdGhlIHJvb3QgZGlyZWN0b3J5IHdoZXJlIHNlYXJjaGluZyBiZWdpbnMuXG4gKi9cbmZ1bmN0aW9uIHdhbGtEaXJlY3RvcnlGb3JFbnRyeVBvaW50cyhzb3VyY2VEaXJlY3Rvcnk6IEFic29sdXRlRnNQYXRoKTogRW50cnlQb2ludFtdIHtcbiAgY29uc3QgZW50cnlQb2ludHM6IEVudHJ5UG9pbnRbXSA9IFtdO1xuICBmcy5yZWFkZGlyU3luYyhzb3VyY2VEaXJlY3RvcnkpXG4gICAgICAvLyBOb3QgaW50ZXJlc3RlZCBpbiBoaWRkZW4gZmlsZXNcbiAgICAgIC5maWx0ZXIocCA9PiAhcC5zdGFydHNXaXRoKCcuJykpXG4gICAgICAvLyBJZ25vcmUgbm9kZV9tb2R1bGVzXG4gICAgICAuZmlsdGVyKHAgPT4gcCAhPT0gJ25vZGVfbW9kdWxlcycpXG4gICAgICAvLyBPbmx5IGludGVyZXN0ZWQgaW4gZGlyZWN0b3JpZXMgKGFuZCBvbmx5IHRob3NlIHRoYXQgYXJlIG5vdCBzeW1saW5rcylcbiAgICAgIC5maWx0ZXIocCA9PiB7XG4gICAgICAgIGNvbnN0IHN0YXQgPSBmcy5sc3RhdFN5bmMocGF0aC5yZXNvbHZlKHNvdXJjZURpcmVjdG9yeSwgcCkpO1xuICAgICAgICByZXR1cm4gc3RhdC5pc0RpcmVjdG9yeSgpICYmICFzdGF0LmlzU3ltYm9saWNMaW5rKCk7XG4gICAgICB9KVxuICAgICAgLmZvckVhY2gocCA9PiB7XG4gICAgICAgIC8vIEVpdGhlciB0aGUgZGlyZWN0b3J5IGlzIGEgcG90ZW50aWFsIHBhY2thZ2Ugb3IgYSBuYW1lc3BhY2UgY29udGFpbmluZyBwYWNrYWdlcyAoZS5nXG4gICAgICAgIC8vIGBAYW5ndWxhcmApLlxuICAgICAgICBjb25zdCBwYWNrYWdlUGF0aCA9IEFic29sdXRlRnNQYXRoLmZyb20ocGF0aC5qb2luKHNvdXJjZURpcmVjdG9yeSwgcCkpO1xuICAgICAgICBpZiAocC5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgICBlbnRyeVBvaW50cy5wdXNoKC4uLndhbGtEaXJlY3RvcnlGb3JFbnRyeVBvaW50cyhwYWNrYWdlUGF0aCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVudHJ5UG9pbnRzLnB1c2goLi4uZ2V0RW50cnlQb2ludHNGb3JQYWNrYWdlKHBhY2thZ2VQYXRoKSk7XG5cbiAgICAgICAgICAvLyBBbHNvIGNoZWNrIGZvciBhbnkgbmVzdGVkIG5vZGVfbW9kdWxlcyBpbiB0aGlzIHBhY2thZ2VcbiAgICAgICAgICBjb25zdCBuZXN0ZWROb2RlTW9kdWxlc1BhdGggPVxuICAgICAgICAgICAgICBBYnNvbHV0ZUZzUGF0aC5mcm9tKHBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgJ25vZGVfbW9kdWxlcycpKTtcbiAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKSB7XG4gICAgICAgICAgICBlbnRyeVBvaW50cy5wdXNoKC4uLndhbGtEaXJlY3RvcnlGb3JFbnRyeVBvaW50cyhuZXN0ZWROb2RlTW9kdWxlc1BhdGgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICByZXR1cm4gZW50cnlQb2ludHM7XG59XG5cbi8qKlxuICogUmVjdXJzZSB0aGUgZm9sZGVyIHN0cnVjdHVyZSBsb29raW5nIGZvciBhbGwgdGhlIGVudHJ5IHBvaW50c1xuICogQHBhcmFtIHBhY2thZ2VQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHRvIGFuIG5wbSBwYWNrYWdlIHRoYXQgbWF5IGNvbnRhaW4gZW50cnkgcG9pbnRzXG4gKiBAcmV0dXJucyBBbiBhcnJheSBvZiBlbnRyeSBwb2ludHMgdGhhdCB3ZXJlIGRpc2NvdmVyZWQuXG4gKi9cbmZ1bmN0aW9uIGdldEVudHJ5UG9pbnRzRm9yUGFja2FnZShwYWNrYWdlUGF0aDogQWJzb2x1dGVGc1BhdGgpOiBFbnRyeVBvaW50W10ge1xuICBjb25zdCBlbnRyeVBvaW50czogRW50cnlQb2ludFtdID0gW107XG5cbiAgLy8gVHJ5IHRvIGdldCBhbiBlbnRyeSBwb2ludCBmcm9tIHRoZSB0b3AgbGV2ZWwgcGFja2FnZSBkaXJlY3RvcnlcbiAgY29uc3QgdG9wTGV2ZWxFbnRyeVBvaW50ID0gZ2V0RW50cnlQb2ludEluZm8ocGFja2FnZVBhdGgsIHBhY2thZ2VQYXRoKTtcbiAgaWYgKHRvcExldmVsRW50cnlQb2ludCAhPT0gbnVsbCkge1xuICAgIGVudHJ5UG9pbnRzLnB1c2godG9wTGV2ZWxFbnRyeVBvaW50KTtcbiAgfVxuXG4gIC8vIE5vdyBzZWFyY2ggYWxsIHRoZSBkaXJlY3RvcmllcyBvZiB0aGlzIHBhY2thZ2UgZm9yIHBvc3NpYmxlIGVudHJ5IHBvaW50c1xuICB3YWxrRGlyZWN0b3J5KHBhY2thZ2VQYXRoLCBzdWJkaXIgPT4ge1xuICAgIGNvbnN0IHN1YkVudHJ5UG9pbnQgPSBnZXRFbnRyeVBvaW50SW5mbyhwYWNrYWdlUGF0aCwgc3ViZGlyKTtcbiAgICBpZiAoc3ViRW50cnlQb2ludCAhPT0gbnVsbCkge1xuICAgICAgZW50cnlQb2ludHMucHVzaChzdWJFbnRyeVBvaW50KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBlbnRyeVBvaW50cztcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmVseSB3YWxrIGEgZGlyZWN0b3J5IGFuZCBpdHMgc3ViLWRpcmVjdG9yaWVzLCBhcHBseWluZyBhIGdpdmVuXG4gKiBmdW5jdGlvbiB0byBlYWNoIGRpcmVjdG9yeS5cbiAqIEBwYXJhbSBkaXIgdGhlIGRpcmVjdG9yeSB0byByZWN1cnNpdmVseSB3YWxrLlxuICogQHBhcmFtIGZuIHRoZSBmdW5jdGlvbiB0byBhcHBseSB0byBlYWNoIGRpcmVjdG9yeS5cbiAqL1xuZnVuY3Rpb24gd2Fsa0RpcmVjdG9yeShkaXI6IEFic29sdXRlRnNQYXRoLCBmbjogKGRpcjogQWJzb2x1dGVGc1BhdGgpID0+IHZvaWQpIHtcbiAgcmV0dXJuIGZzXG4gICAgICAucmVhZGRpclN5bmMoZGlyKVxuICAgICAgLy8gTm90IGludGVyZXN0ZWQgaW4gaGlkZGVuIGZpbGVzXG4gICAgICAuZmlsdGVyKHAgPT4gIXAuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgLy8gSWdub3JlIG5vZGVfbW9kdWxlc1xuICAgICAgLmZpbHRlcihwID0+IHAgIT09ICdub2RlX21vZHVsZXMnKVxuICAgICAgLy8gT25seSBpbnRlcmVzdGVkIGluIGRpcmVjdG9yaWVzIChhbmQgb25seSB0aG9zZSB0aGF0IGFyZSBub3Qgc3ltbGlua3MpXG4gICAgICAuZmlsdGVyKHAgPT4ge1xuICAgICAgICBjb25zdCBzdGF0ID0gZnMubHN0YXRTeW5jKHBhdGgucmVzb2x2ZShkaXIsIHApKTtcbiAgICAgICAgcmV0dXJuIHN0YXQuaXNEaXJlY3RvcnkoKSAmJiAhc3RhdC5pc1N5bWJvbGljTGluaygpO1xuICAgICAgfSlcbiAgICAgIC5mb3JFYWNoKHN1YkRpciA9PiB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkU3ViRGlyID0gQWJzb2x1dGVGc1BhdGguZnJvbShwYXRoLnJlc29sdmUoZGlyLCBzdWJEaXIpKTtcbiAgICAgICAgZm4ocmVzb2x2ZWRTdWJEaXIpO1xuICAgICAgICB3YWxrRGlyZWN0b3J5KHJlc29sdmVkU3ViRGlyLCBmbik7XG4gICAgICB9KTtcbn1cbiJdfQ==