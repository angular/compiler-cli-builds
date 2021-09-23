(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/entry_point_finder/tracing_entry_point_finder", ["require", "exports", "@angular/compiler-cli/ngcc/src/entry_point_finder/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TracingEntryPointFinder = void 0;
    var utils_1 = require("@angular/compiler-cli/ngcc/src/entry_point_finder/utils");
    /**
     * An EntryPointFinder that starts from a set of initial files and only returns entry-points that
     * are dependencies of these files.
     *
     * This is faster than processing all entry-points in the entire file-system, and is used primarily
     * by the CLI integration.
     *
     * There are two concrete implementations of this class.
     *
     * * `TargetEntryPointFinder` - is given a single entry-point as the initial entry-point. This can
     *   be used in the synchronous CLI integration where the build tool has identified an external
     *   import to one of the source files being built.
     * * `ProgramBasedEntryPointFinder` - computes the initial entry-points from the source files
     *   computed from a `tsconfig.json` file. This can be used in the asynchronous CLI integration
     *   where the `tsconfig.json` to be used to do the build is known.
     */
    var TracingEntryPointFinder = /** @class */ (function () {
        function TracingEntryPointFinder(fs, config, logger, resolver, basePath, pathMappings) {
            this.fs = fs;
            this.config = config;
            this.logger = logger;
            this.resolver = resolver;
            this.basePath = basePath;
            this.pathMappings = pathMappings;
            this.basePaths = null;
        }
        /**
         * Search for Angular package entry-points.
         */
        TracingEntryPointFinder.prototype.findEntryPoints = function () {
            var unsortedEntryPoints = new Map();
            var unprocessedPaths = this.getInitialEntryPointPaths();
            while (unprocessedPaths.length > 0) {
                var path = unprocessedPaths.shift();
                var entryPointWithDeps = this.getEntryPointWithDeps(path);
                if (entryPointWithDeps === null) {
                    continue;
                }
                unsortedEntryPoints.set(entryPointWithDeps.entryPoint.path, entryPointWithDeps);
                entryPointWithDeps.depInfo.dependencies.forEach(function (dep) {
                    if (!unsortedEntryPoints.has(dep)) {
                        unprocessedPaths.push(dep);
                    }
                });
            }
            return this.resolver.sortEntryPointsByDependency(Array.from(unsortedEntryPoints.values()));
        };
        /**
         * Parse the path-mappings to compute the base-paths that need to be considered when finding
         * entry-points.
         *
         * This processing can be time-consuming if the path-mappings are complex or extensive.
         * So the result is cached locally once computed.
         */
        TracingEntryPointFinder.prototype.getBasePaths = function () {
            if (this.basePaths === null) {
                this.basePaths = (0, utils_1.getBasePaths)(this.logger, this.basePath, this.pathMappings);
            }
            return this.basePaths;
        };
        return TracingEntryPointFinder;
    }());
    exports.TracingEntryPointFinder = TracingEntryPointFinder;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhY2luZ19lbnRyeV9wb2ludF9maW5kZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvZW50cnlfcG9pbnRfZmluZGVyL3RyYWNpbmdfZW50cnlfcG9pbnRfZmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQWVBLGlGQUFxQztJQUVyQzs7Ozs7Ozs7Ozs7Ozs7O09BZUc7SUFDSDtRQUdFLGlDQUNjLEVBQXNCLEVBQVksTUFBeUIsRUFDM0QsTUFBYyxFQUFZLFFBQTRCLEVBQ3RELFFBQXdCLEVBQVksWUFBb0M7WUFGeEUsT0FBRSxHQUFGLEVBQUUsQ0FBb0I7WUFBWSxXQUFNLEdBQU4sTUFBTSxDQUFtQjtZQUMzRCxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVksYUFBUSxHQUFSLFFBQVEsQ0FBb0I7WUFDdEQsYUFBUSxHQUFSLFFBQVEsQ0FBZ0I7WUFBWSxpQkFBWSxHQUFaLFlBQVksQ0FBd0I7WUFMOUUsY0FBUyxHQUEwQixJQUFJLENBQUM7UUFLeUMsQ0FBQztRQUUxRjs7V0FFRztRQUNILGlEQUFlLEdBQWY7WUFDRSxJQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUE4QyxDQUFDO1lBQ2xGLElBQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDMUQsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNsQyxJQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUcsQ0FBQztnQkFDdkMsSUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVELElBQUksa0JBQWtCLEtBQUssSUFBSSxFQUFFO29CQUMvQixTQUFTO2lCQUNWO2dCQUNELG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQ2hGLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztvQkFDakQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTt3QkFDakMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUM1QjtnQkFDSCxDQUFDLENBQUMsQ0FBQzthQUNKO1lBQ0QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdGLENBQUM7UUFzQkQ7Ozs7OztXQU1HO1FBQ08sOENBQVksR0FBdEI7WUFDRSxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO2dCQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUEsb0JBQVksRUFBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQzlFO1lBQ0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQ3hCLENBQUM7UUFDSCw4QkFBQztJQUFELENBQUMsQUEvREQsSUErREM7SUEvRHFCLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgUGF0aE1hbmlwdWxhdGlvbiwgUmVhZG9ubHlGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9sb2dnaW5nJztcbmltcG9ydCB7RW50cnlQb2ludFdpdGhEZXBlbmRlbmNpZXN9IGZyb20gJy4uL2RlcGVuZGVuY2llcy9kZXBlbmRlbmN5X2hvc3QnO1xuaW1wb3J0IHtEZXBlbmRlbmN5UmVzb2x2ZXIsIFNvcnRlZEVudHJ5UG9pbnRzSW5mb30gZnJvbSAnLi4vZGVwZW5kZW5jaWVzL2RlcGVuZGVuY3lfcmVzb2x2ZXInO1xuaW1wb3J0IHtOZ2NjQ29uZmlndXJhdGlvbn0gZnJvbSAnLi4vcGFja2FnZXMvY29uZmlndXJhdGlvbic7XG5pbXBvcnQge1BhdGhNYXBwaW5nc30gZnJvbSAnLi4vcGF0aF9tYXBwaW5ncyc7XG5cbmltcG9ydCB7RW50cnlQb2ludEZpbmRlcn0gZnJvbSAnLi9pbnRlcmZhY2UnO1xuaW1wb3J0IHtnZXRCYXNlUGF0aHN9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEFuIEVudHJ5UG9pbnRGaW5kZXIgdGhhdCBzdGFydHMgZnJvbSBhIHNldCBvZiBpbml0aWFsIGZpbGVzIGFuZCBvbmx5IHJldHVybnMgZW50cnktcG9pbnRzIHRoYXRcbiAqIGFyZSBkZXBlbmRlbmNpZXMgb2YgdGhlc2UgZmlsZXMuXG4gKlxuICogVGhpcyBpcyBmYXN0ZXIgdGhhbiBwcm9jZXNzaW5nIGFsbCBlbnRyeS1wb2ludHMgaW4gdGhlIGVudGlyZSBmaWxlLXN5c3RlbSwgYW5kIGlzIHVzZWQgcHJpbWFyaWx5XG4gKiBieSB0aGUgQ0xJIGludGVncmF0aW9uLlxuICpcbiAqIFRoZXJlIGFyZSB0d28gY29uY3JldGUgaW1wbGVtZW50YXRpb25zIG9mIHRoaXMgY2xhc3MuXG4gKlxuICogKiBgVGFyZ2V0RW50cnlQb2ludEZpbmRlcmAgLSBpcyBnaXZlbiBhIHNpbmdsZSBlbnRyeS1wb2ludCBhcyB0aGUgaW5pdGlhbCBlbnRyeS1wb2ludC4gVGhpcyBjYW5cbiAqICAgYmUgdXNlZCBpbiB0aGUgc3luY2hyb25vdXMgQ0xJIGludGVncmF0aW9uIHdoZXJlIHRoZSBidWlsZCB0b29sIGhhcyBpZGVudGlmaWVkIGFuIGV4dGVybmFsXG4gKiAgIGltcG9ydCB0byBvbmUgb2YgdGhlIHNvdXJjZSBmaWxlcyBiZWluZyBidWlsdC5cbiAqICogYFByb2dyYW1CYXNlZEVudHJ5UG9pbnRGaW5kZXJgIC0gY29tcHV0ZXMgdGhlIGluaXRpYWwgZW50cnktcG9pbnRzIGZyb20gdGhlIHNvdXJjZSBmaWxlc1xuICogICBjb21wdXRlZCBmcm9tIGEgYHRzY29uZmlnLmpzb25gIGZpbGUuIFRoaXMgY2FuIGJlIHVzZWQgaW4gdGhlIGFzeW5jaHJvbm91cyBDTEkgaW50ZWdyYXRpb25cbiAqICAgd2hlcmUgdGhlIGB0c2NvbmZpZy5qc29uYCB0byBiZSB1c2VkIHRvIGRvIHRoZSBidWlsZCBpcyBrbm93bi5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFRyYWNpbmdFbnRyeVBvaW50RmluZGVyIGltcGxlbWVudHMgRW50cnlQb2ludEZpbmRlciB7XG4gIHByaXZhdGUgYmFzZVBhdGhzOiBBYnNvbHV0ZUZzUGF0aFtdfG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIGZzOiBSZWFkb25seUZpbGVTeXN0ZW0sIHByb3RlY3RlZCBjb25maWc6IE5nY2NDb25maWd1cmF0aW9uLFxuICAgICAgcHJvdGVjdGVkIGxvZ2dlcjogTG9nZ2VyLCBwcm90ZWN0ZWQgcmVzb2x2ZXI6IERlcGVuZGVuY3lSZXNvbHZlcixcbiAgICAgIHByb3RlY3RlZCBiYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIHByb3RlY3RlZCBwYXRoTWFwcGluZ3M6IFBhdGhNYXBwaW5nc3x1bmRlZmluZWQpIHt9XG5cbiAgLyoqXG4gICAqIFNlYXJjaCBmb3IgQW5ndWxhciBwYWNrYWdlIGVudHJ5LXBvaW50cy5cbiAgICovXG4gIGZpbmRFbnRyeVBvaW50cygpOiBTb3J0ZWRFbnRyeVBvaW50c0luZm8ge1xuICAgIGNvbnN0IHVuc29ydGVkRW50cnlQb2ludHMgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llcz4oKTtcbiAgICBjb25zdCB1bnByb2Nlc3NlZFBhdGhzID0gdGhpcy5nZXRJbml0aWFsRW50cnlQb2ludFBhdGhzKCk7XG4gICAgd2hpbGUgKHVucHJvY2Vzc2VkUGF0aHMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgcGF0aCA9IHVucHJvY2Vzc2VkUGF0aHMuc2hpZnQoKSE7XG4gICAgICBjb25zdCBlbnRyeVBvaW50V2l0aERlcHMgPSB0aGlzLmdldEVudHJ5UG9pbnRXaXRoRGVwcyhwYXRoKTtcbiAgICAgIGlmIChlbnRyeVBvaW50V2l0aERlcHMgPT09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB1bnNvcnRlZEVudHJ5UG9pbnRzLnNldChlbnRyeVBvaW50V2l0aERlcHMuZW50cnlQb2ludC5wYXRoLCBlbnRyeVBvaW50V2l0aERlcHMpO1xuICAgICAgZW50cnlQb2ludFdpdGhEZXBzLmRlcEluZm8uZGVwZW5kZW5jaWVzLmZvckVhY2goZGVwID0+IHtcbiAgICAgICAgaWYgKCF1bnNvcnRlZEVudHJ5UG9pbnRzLmhhcyhkZXApKSB7XG4gICAgICAgICAgdW5wcm9jZXNzZWRQYXRocy5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5zb3J0RW50cnlQb2ludHNCeURlcGVuZGVuY3koQXJyYXkuZnJvbSh1bnNvcnRlZEVudHJ5UG9pbnRzLnZhbHVlcygpKSk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYW4gYXJyYXkgb2YgZW50cnktcG9pbnQgcGF0aHMgZnJvbSB3aGljaCB0byBzdGFydCB0aGUgdHJhY2UuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgZ2V0SW5pdGlhbEVudHJ5UG9pbnRQYXRocygpOiBBYnNvbHV0ZUZzUGF0aFtdO1xuXG4gIC8qKlxuICAgKiBGb3IgdGhlIGdpdmVuIGBlbnRyeVBvaW50UGF0aGAsIGNvbXB1dGUsIG9yIHJldHJpZXZlLCB0aGUgZW50cnktcG9pbnQgaW5mb3JtYXRpb24sIGluY2x1ZGluZ1xuICAgKiBwYXRocyB0byBvdGhlciBlbnRyeS1wb2ludHMgdGhhdCB0aGlzIGVudHJ5LXBvaW50IGRlcGVuZHMgdXBvbi5cbiAgICpcbiAgICogQHBhcmFtIGVudHJ5UG9pbnRQYXRoIHRoZSBwYXRoIHRvIHRoZSBlbnRyeS1wb2ludCB3aG9zZSBpbmZvcm1hdGlvbiBhbmQgZGVwZW5kZW5jaWVzIGFyZSB0byBiZVxuICAgKiAgICAgcmV0cmlldmVkIG9yIGNvbXB1dGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyB0aGUgZW50cnktcG9pbnQgYW5kIGl0cyBkZXBlbmRlbmNpZXMgb3IgYG51bGxgIGlmIHRoZSBlbnRyeS1wb2ludCBpcyBub3QgY29tcGlsZWQgYnlcbiAgICogICAgIEFuZ3VsYXIgb3IgY2Fubm90IGJlIGRldGVybWluZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgZ2V0RW50cnlQb2ludFdpdGhEZXBzKGVudHJ5UG9pbnRQYXRoOiBBYnNvbHV0ZUZzUGF0aCk6XG4gICAgICBFbnRyeVBvaW50V2l0aERlcGVuZGVuY2llc3xudWxsO1xuXG5cbiAgLyoqXG4gICAqIFBhcnNlIHRoZSBwYXRoLW1hcHBpbmdzIHRvIGNvbXB1dGUgdGhlIGJhc2UtcGF0aHMgdGhhdCBuZWVkIHRvIGJlIGNvbnNpZGVyZWQgd2hlbiBmaW5kaW5nXG4gICAqIGVudHJ5LXBvaW50cy5cbiAgICpcbiAgICogVGhpcyBwcm9jZXNzaW5nIGNhbiBiZSB0aW1lLWNvbnN1bWluZyBpZiB0aGUgcGF0aC1tYXBwaW5ncyBhcmUgY29tcGxleCBvciBleHRlbnNpdmUuXG4gICAqIFNvIHRoZSByZXN1bHQgaXMgY2FjaGVkIGxvY2FsbHkgb25jZSBjb21wdXRlZC5cbiAgICovXG4gIHByb3RlY3RlZCBnZXRCYXNlUGF0aHMoKSB7XG4gICAgaWYgKHRoaXMuYmFzZVBhdGhzID09PSBudWxsKSB7XG4gICAgICB0aGlzLmJhc2VQYXRocyA9IGdldEJhc2VQYXRocyh0aGlzLmxvZ2dlciwgdGhpcy5iYXNlUGF0aCwgdGhpcy5wYXRoTWFwcGluZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5iYXNlUGF0aHM7XG4gIH1cbn1cbiJdfQ==