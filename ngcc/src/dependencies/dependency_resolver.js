/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", ["require", "exports", "tslib", "dependency-graph", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/packages/entry_point"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var dependency_graph_1 = require("dependency-graph");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    /**
     * A class that resolves dependencies between entry-points.
     */
    var DependencyResolver = /** @class */ (function () {
        function DependencyResolver(fs, logger, hosts) {
            this.fs = fs;
            this.logger = logger;
            this.hosts = hosts;
        }
        /**
         * Sort the array of entry points so that the dependant entry points always come later than
         * their dependencies in the array.
         * @param entryPoints An array entry points to sort.
         * @param target If provided, only return entry-points depended on by this entry-point.
         * @returns the result of sorting the entry points by dependency.
         */
        DependencyResolver.prototype.sortEntryPointsByDependency = function (entryPoints, target) {
            var _a = this.computeDependencyGraph(entryPoints), invalidEntryPoints = _a.invalidEntryPoints, ignoredDependencies = _a.ignoredDependencies, graph = _a.graph;
            var sortedEntryPointNodes;
            if (target) {
                if (target.compiledByAngular) {
                    sortedEntryPointNodes = graph.dependenciesOf(target.path);
                    sortedEntryPointNodes.push(target.path);
                }
                else {
                    sortedEntryPointNodes = [];
                }
            }
            else {
                sortedEntryPointNodes = graph.overallOrder();
            }
            return {
                entryPoints: sortedEntryPointNodes.map(function (path) { return graph.getNodeData(path); }),
                invalidEntryPoints: invalidEntryPoints,
                ignoredDependencies: ignoredDependencies,
            };
        };
        /**
         * Computes a dependency graph of the given entry-points.
         *
         * The graph only holds entry-points that ngcc cares about and whose dependencies
         * (direct and transitive) all exist.
         */
        DependencyResolver.prototype.computeDependencyGraph = function (entryPoints) {
            var _this = this;
            var invalidEntryPoints = [];
            var ignoredDependencies = [];
            var graph = new dependency_graph_1.DepGraph();
            var angularEntryPoints = entryPoints.filter(function (entryPoint) { return entryPoint.compiledByAngular; });
            // Add the Angular compiled entry points to the graph as nodes
            angularEntryPoints.forEach(function (entryPoint) { return graph.addNode(entryPoint.path, entryPoint); });
            // Now add the dependencies between them
            angularEntryPoints.forEach(function (entryPoint) {
                var formatInfo = _this.getEntryPointFormatInfo(entryPoint);
                var host = _this.hosts[formatInfo.format];
                if (!host) {
                    throw new Error("Could not find a suitable format for computing dependencies of entry-point: '" + entryPoint.path + "'.");
                }
                var _a = host.findDependencies(formatInfo.path), dependencies = _a.dependencies, missing = _a.missing, deepImports = _a.deepImports;
                if (missing.size > 0) {
                    // This entry point has dependencies that are missing
                    // so remove it from the graph.
                    removeNodes(entryPoint, Array.from(missing));
                }
                else {
                    dependencies.forEach(function (dependencyPath) {
                        if (graph.hasNode(dependencyPath)) {
                            if (graph.hasNode(entryPoint.path)) {
                                // The entry-point is still valid (i.e. has no missing dependencies) and
                                // the dependency maps to an entry point that exists in the graph so add it
                                graph.addDependency(entryPoint.path, dependencyPath);
                            }
                        }
                        else if (invalidEntryPoints.some(function (i) { return i.entryPoint.path === dependencyPath; })) {
                            // The dependency path maps to an entry-point that was previously removed
                            // from the graph, so remove this entry-point as well.
                            removeNodes(entryPoint, [dependencyPath]);
                        }
                        else {
                            // The dependency path points to a package that ngcc does not care about.
                            ignoredDependencies.push({ entryPoint: entryPoint, dependencyPath: dependencyPath });
                        }
                    });
                }
                if (deepImports.size) {
                    var imports = Array.from(deepImports).map(function (i) { return "'" + i + "'"; }).join(', ');
                    _this.logger.warn("Entry point '" + entryPoint.name + "' contains deep imports into " + imports + ". " +
                        "This is probably not a problem, but may cause the compilation of entry points to be out of order.");
                }
            });
            return { invalidEntryPoints: invalidEntryPoints, ignoredDependencies: ignoredDependencies, graph: graph };
            function removeNodes(entryPoint, missingDependencies) {
                var nodesToRemove = tslib_1.__spread([entryPoint.path], graph.dependantsOf(entryPoint.path));
                nodesToRemove.forEach(function (node) {
                    invalidEntryPoints.push({ entryPoint: graph.getNodeData(node), missingDependencies: missingDependencies });
                    graph.removeNode(node);
                });
            }
        };
        DependencyResolver.prototype.getEntryPointFormatInfo = function (entryPoint) {
            var properties = Object.keys(entryPoint.packageJson);
            for (var i = 0; i < properties.length; i++) {
                var property = properties[i];
                var format = entry_point_1.getEntryPointFormat(this.fs, entryPoint, property);
                if (format === 'esm2015' || format === 'esm5' || format === 'umd' || format === 'commonjs') {
                    var formatPath = entryPoint.packageJson[property];
                    return { format: format, path: file_system_1.resolve(entryPoint.path, formatPath) };
                }
            }
            throw new Error("There is no appropriate source code format in '" + entryPoint.path + "' entry-point.");
        };
        return DependencyResolver;
    }());
    exports.DependencyResolver = DependencyResolver;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxxREFBMEM7SUFDMUMsMkVBQW1GO0lBRW5GLG1GQUFrSDtJQW1EbEg7O09BRUc7SUFDSDtRQUNFLDRCQUNZLEVBQWMsRUFBVSxNQUFjLEVBQ3RDLEtBQXdEO1lBRHhELE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ3RDLFVBQUssR0FBTCxLQUFLLENBQW1EO1FBQUcsQ0FBQztRQUN4RTs7Ozs7O1dBTUc7UUFDSCx3REFBMkIsR0FBM0IsVUFBNEIsV0FBeUIsRUFBRSxNQUFtQjtZQUVsRSxJQUFBLDZDQUNzQyxFQURyQywwQ0FBa0IsRUFBRSw0Q0FBbUIsRUFBRSxnQkFDSixDQUFDO1lBRTdDLElBQUkscUJBQStCLENBQUM7WUFDcEMsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsSUFBSSxNQUFNLENBQUMsaUJBQWlCLEVBQUU7b0JBQzVCLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMxRCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN6QztxQkFBTTtvQkFDTCxxQkFBcUIsR0FBRyxFQUFFLENBQUM7aUJBQzVCO2FBQ0Y7aUJBQU07Z0JBQ0wscUJBQXFCLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO2FBQzlDO1lBRUQsT0FBTztnQkFDTCxXQUFXLEVBQUUscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSyxDQUFDLFdBQVcs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QUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBRyxDQUFDO29CQUN0RCxPQUFPLEVBQUMsTUFBTSxRQUFBLEVBQUUsSUFBSSxFQUFFLHFCQUFPLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsRUFBQyxDQUFDO2lCQUM3RDthQUNGO1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FDWCxvREFBa0QsVUFBVSxDQUFDLElBQUksbUJBQWdCLENBQUMsQ0FBQztRQUN6RixDQUFDO1FBQ0gseUJBQUM7SUFBRCxDQUFDLEFBdEhELElBc0hDO0lBdEhZLGdEQUFrQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtEZXBHcmFwaH0gZnJvbSAnZGVwZW5kZW5jeS1ncmFwaCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCByZXNvbHZlfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7RW50cnlQb2ludCwgRW50cnlQb2ludEZvcm1hdCwgRW50cnlQb2ludEpzb25Qcm9wZXJ0eSwgZ2V0RW50cnlQb2ludEZvcm1hdH0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnQnO1xuaW1wb3J0IHtEZXBlbmRlbmN5SG9zdH0gZnJvbSAnLi9kZXBlbmRlbmN5X2hvc3QnO1xuXG4vKipcbiAqIEhvbGRzIGluZm9ybWF0aW9uIGFib3V0IGVudHJ5IHBvaW50cyB0aGF0IGFyZSByZW1vdmVkIGJlY2F1c2VcbiAqIHRoZXkgaGF2ZSBkZXBlbmRlbmNpZXMgdGhhdCBhcmUgbWlzc2luZyAoZGlyZWN0bHkgb3IgdHJhbnNpdGl2ZWx5KS5cbiAqXG4gKiBUaGlzIG1pZ2h0IG5vdCBiZSBhbiBlcnJvciwgYmVjYXVzZSBzdWNoIGFuIGVudHJ5IHBvaW50IG1pZ2h0IG5vdCBhY3R1YWxseSBiZSB1c2VkXG4gKiBpbiB0aGUgYXBwbGljYXRpb24uIElmIGl0IGlzIHVzZWQgdGhlbiB0aGUgYG5nY2AgYXBwbGljYXRpb24gY29tcGlsYXRpb24gd291bGRcbiAqIGZhaWwgYWxzbywgc28gd2UgZG9uJ3QgbmVlZCBuZ2NjIHRvIGNhdGNoIHRoaXMuXG4gKlxuICogRm9yIGV4YW1wbGUsIGNvbnNpZGVyIGFuIGFwcGxpY2F0aW9uIHRoYXQgdXNlcyB0aGUgYEBhbmd1bGFyL3JvdXRlcmAgcGFja2FnZS5cbiAqIFRoaXMgcGFja2FnZSBpbmNsdWRlcyBhbiBlbnRyeS1wb2ludCBjYWxsZWQgYEBhbmd1bGFyL3JvdXRlci91cGdyYWRlYCwgd2hpY2ggaGFzIGEgZGVwZW5kZW5jeVxuICogb24gdGhlIGBAYW5ndWxhci91cGdyYWRlYCBwYWNrYWdlLlxuICogSWYgdGhlIGFwcGxpY2F0aW9uIG5ldmVyIHVzZXMgY29kZSBmcm9tIGBAYW5ndWxhci9yb3V0ZXIvdXBncmFkZWAgdGhlbiB0aGVyZSBpcyBubyBuZWVkIGZvclxuICogYEBhbmd1bGFyL3VwZ3JhZGVgIHRvIGJlIGluc3RhbGxlZC5cbiAqIEluIHRoaXMgY2FzZSB0aGUgbmdjYyB0b29sIHNob3VsZCBqdXN0IGlnbm9yZSB0aGUgYEBhbmd1bGFyL3JvdXRlci91cGdyYWRlYCBlbmQtcG9pbnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW52YWxpZEVudHJ5UG9pbnQge1xuICBlbnRyeVBvaW50OiBFbnRyeVBvaW50O1xuICBtaXNzaW5nRGVwZW5kZW5jaWVzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBIb2xkcyBpbmZvcm1hdGlvbiBhYm91dCBkZXBlbmRlbmNpZXMgb2YgYW4gZW50cnktcG9pbnQgdGhhdCBkbyBub3QgbmVlZCB0byBiZSBwcm9jZXNzZWRcbiAqIGJ5IHRoZSBuZ2NjIHRvb2wuXG4gKlxuICogRm9yIGV4YW1wbGUsIHRoZSBgcnhqc2AgcGFja2FnZSBkb2VzIG5vdCBjb250YWluIGFueSBBbmd1bGFyIGRlY29yYXRvcnMgdGhhdCBuZWVkIHRvIGJlXG4gKiBjb21waWxlZCBhbmQgc28gdGhpcyBjYW4gYmUgc2FmZWx5IGlnbm9yZWQgYnkgbmdjYy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJZ25vcmVkRGVwZW5kZW5jeSB7XG4gIGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQ7XG4gIGRlcGVuZGVuY3lQYXRoOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVwZW5kZW5jeURpYWdub3N0aWNzIHtcbiAgaW52YWxpZEVudHJ5UG9pbnRzOiBJbnZhbGlkRW50cnlQb2ludFtdO1xuICBpZ25vcmVkRGVwZW5kZW5jaWVzOiBJZ25vcmVkRGVwZW5kZW5jeVtdO1xufVxuXG4vKipcbiAqIEEgbGlzdCBvZiBlbnRyeS1wb2ludHMsIHNvcnRlZCBieSB0aGVpciBkZXBlbmRlbmNpZXMuXG4gKlxuICogVGhlIGBlbnRyeVBvaW50c2AgYXJyYXkgd2lsbCBiZSBvcmRlcmVkIHNvIHRoYXQgbm8gZW50cnkgcG9pbnQgZGVwZW5kcyB1cG9uIGFuIGVudHJ5IHBvaW50IHRoYXRcbiAqIGFwcGVhcnMgbGF0ZXIgaW4gdGhlIGFycmF5LlxuICpcbiAqIFNvbWUgZW50cnkgcG9pbnRzIG9yIHRoZWlyIGRlcGVuZGVuY2llcyBtYXkgYmUgaGF2ZSBiZWVuIGlnbm9yZWQuIFRoZXNlIGFyZSBjYXB0dXJlZCBmb3JcbiAqIGRpYWdub3N0aWMgcHVycG9zZXMgaW4gYGludmFsaWRFbnRyeVBvaW50c2AgYW5kIGBpZ25vcmVkRGVwZW5kZW5jaWVzYCByZXNwZWN0aXZlbHkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU29ydGVkRW50cnlQb2ludHNJbmZvIGV4dGVuZHMgRGVwZW5kZW5jeURpYWdub3N0aWNzIHsgZW50cnlQb2ludHM6IEVudHJ5UG9pbnRbXTsgfVxuXG4vKipcbiAqIEEgY2xhc3MgdGhhdCByZXNvbHZlcyBkZXBlbmRlbmNpZXMgYmV0d2VlbiBlbnRyeS1wb2ludHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBEZXBlbmRlbmN5UmVzb2x2ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIGhvc3RzOiBQYXJ0aWFsPFJlY29yZDxFbnRyeVBvaW50Rm9ybWF0LCBEZXBlbmRlbmN5SG9zdD4+KSB7fVxuICAvKipcbiAgICogU29ydCB0aGUgYXJyYXkgb2YgZW50cnkgcG9pbnRzIHNvIHRoYXQgdGhlIGRlcGVuZGFudCBlbnRyeSBwb2ludHMgYWx3YXlzIGNvbWUgbGF0ZXIgdGhhblxuICAgKiB0aGVpciBkZXBlbmRlbmNpZXMgaW4gdGhlIGFycmF5LlxuICAgKiBAcGFyYW0gZW50cnlQb2ludHMgQW4gYXJyYXkgZW50cnkgcG9pbnRzIHRvIHNvcnQuXG4gICAqIEBwYXJhbSB0YXJnZXQgSWYgcHJvdmlkZWQsIG9ubHkgcmV0dXJuIGVudHJ5LXBvaW50cyBkZXBlbmRlZCBvbiBieSB0aGlzIGVudHJ5LXBvaW50LlxuICAgKiBAcmV0dXJucyB0aGUgcmVzdWx0IG9mIHNvcnRpbmcgdGhlIGVudHJ5IHBvaW50cyBieSBkZXBlbmRlbmN5LlxuICAgKi9cbiAgc29ydEVudHJ5UG9pbnRzQnlEZXBlbmRlbmN5KGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10sIHRhcmdldD86IEVudHJ5UG9pbnQpOlxuICAgICAgU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgICBjb25zdCB7aW52YWxpZEVudHJ5UG9pbnRzLCBpZ25vcmVkRGVwZW5kZW5jaWVzLCBncmFwaH0gPVxuICAgICAgICB0aGlzLmNvbXB1dGVEZXBlbmRlbmN5R3JhcGgoZW50cnlQb2ludHMpO1xuXG4gICAgbGV0IHNvcnRlZEVudHJ5UG9pbnROb2Rlczogc3RyaW5nW107XG4gICAgaWYgKHRhcmdldCkge1xuICAgICAgaWYgKHRhcmdldC5jb21waWxlZEJ5QW5ndWxhcikge1xuICAgICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMgPSBncmFwaC5kZXBlbmRlbmNpZXNPZih0YXJnZXQucGF0aCk7XG4gICAgICAgIHNvcnRlZEVudHJ5UG9pbnROb2Rlcy5wdXNoKHRhcmdldC5wYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNvcnRlZEVudHJ5UG9pbnROb2RlcyA9IFtdO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMgPSBncmFwaC5vdmVyYWxsT3JkZXIoKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZW50cnlQb2ludHM6IHNvcnRlZEVudHJ5UG9pbnROb2Rlcy5tYXAocGF0aCA9PiBncmFwaC5nZXROb2RlRGF0YShwYXRoKSksXG4gICAgICBpbnZhbGlkRW50cnlQb2ludHMsXG4gICAgICBpZ25vcmVkRGVwZW5kZW5jaWVzLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZXMgYSBkZXBlbmRlbmN5IGdyYXBoIG9mIHRoZSBnaXZlbiBlbnRyeS1wb2ludHMuXG4gICAqXG4gICAqIFRoZSBncmFwaCBvbmx5IGhvbGRzIGVudHJ5LXBvaW50cyB0aGF0IG5nY2MgY2FyZXMgYWJvdXQgYW5kIHdob3NlIGRlcGVuZGVuY2llc1xuICAgKiAoZGlyZWN0IGFuZCB0cmFuc2l0aXZlKSBhbGwgZXhpc3QuXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVEZXBlbmRlbmN5R3JhcGgoZW50cnlQb2ludHM6IEVudHJ5UG9pbnRbXSk6IERlcGVuZGVuY3lHcmFwaCB7XG4gICAgY29uc3QgaW52YWxpZEVudHJ5UG9pbnRzOiBJbnZhbGlkRW50cnlQb2ludFtdID0gW107XG4gICAgY29uc3QgaWdub3JlZERlcGVuZGVuY2llczogSWdub3JlZERlcGVuZGVuY3lbXSA9IFtdO1xuICAgIGNvbnN0IGdyYXBoID0gbmV3IERlcEdyYXBoPEVudHJ5UG9pbnQ+KCk7XG5cbiAgICBjb25zdCBhbmd1bGFyRW50cnlQb2ludHMgPSBlbnRyeVBvaW50cy5maWx0ZXIoZW50cnlQb2ludCA9PiBlbnRyeVBvaW50LmNvbXBpbGVkQnlBbmd1bGFyKTtcblxuICAgIC8vIEFkZCB0aGUgQW5ndWxhciBjb21waWxlZCBlbnRyeSBwb2ludHMgdG8gdGhlIGdyYXBoIGFzIG5vZGVzXG4gICAgYW5ndWxhckVudHJ5UG9pbnRzLmZvckVhY2goZW50cnlQb2ludCA9PiBncmFwaC5hZGROb2RlKGVudHJ5UG9pbnQucGF0aCwgZW50cnlQb2ludCkpO1xuXG4gICAgLy8gTm93IGFkZCB0aGUgZGVwZW5kZW5jaWVzIGJldHdlZW4gdGhlbVxuICAgIGFuZ3VsYXJFbnRyeVBvaW50cy5mb3JFYWNoKGVudHJ5UG9pbnQgPT4ge1xuICAgICAgY29uc3QgZm9ybWF0SW5mbyA9IHRoaXMuZ2V0RW50cnlQb2ludEZvcm1hdEluZm8oZW50cnlQb2ludCk7XG4gICAgICBjb25zdCBob3N0ID0gdGhpcy5ob3N0c1tmb3JtYXRJbmZvLmZvcm1hdF07XG4gICAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYENvdWxkIG5vdCBmaW5kIGEgc3VpdGFibGUgZm9ybWF0IGZvciBjb21wdXRpbmcgZGVwZW5kZW5jaWVzIG9mIGVudHJ5LXBvaW50OiAnJHtlbnRyeVBvaW50LnBhdGh9Jy5gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHtkZXBlbmRlbmNpZXMsIG1pc3NpbmcsIGRlZXBJbXBvcnRzfSA9IGhvc3QuZmluZERlcGVuZGVuY2llcyhmb3JtYXRJbmZvLnBhdGgpO1xuXG4gICAgICBpZiAobWlzc2luZy5zaXplID4gMCkge1xuICAgICAgICAvLyBUaGlzIGVudHJ5IHBvaW50IGhhcyBkZXBlbmRlbmNpZXMgdGhhdCBhcmUgbWlzc2luZ1xuICAgICAgICAvLyBzbyByZW1vdmUgaXQgZnJvbSB0aGUgZ3JhcGguXG4gICAgICAgIHJlbW92ZU5vZGVzKGVudHJ5UG9pbnQsIEFycmF5LmZyb20obWlzc2luZykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVwZW5kZW5jaWVzLmZvckVhY2goZGVwZW5kZW5jeVBhdGggPT4ge1xuICAgICAgICAgIGlmIChncmFwaC5oYXNOb2RlKGRlcGVuZGVuY3lQYXRoKSkge1xuICAgICAgICAgICAgaWYgKGdyYXBoLmhhc05vZGUoZW50cnlQb2ludC5wYXRoKSkge1xuICAgICAgICAgICAgICAvLyBUaGUgZW50cnktcG9pbnQgaXMgc3RpbGwgdmFsaWQgKGkuZS4gaGFzIG5vIG1pc3NpbmcgZGVwZW5kZW5jaWVzKSBhbmRcbiAgICAgICAgICAgICAgLy8gdGhlIGRlcGVuZGVuY3kgbWFwcyB0byBhbiBlbnRyeSBwb2ludCB0aGF0IGV4aXN0cyBpbiB0aGUgZ3JhcGggc28gYWRkIGl0XG4gICAgICAgICAgICAgIGdyYXBoLmFkZERlcGVuZGVuY3koZW50cnlQb2ludC5wYXRoLCBkZXBlbmRlbmN5UGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChpbnZhbGlkRW50cnlQb2ludHMuc29tZShpID0+IGkuZW50cnlQb2ludC5wYXRoID09PSBkZXBlbmRlbmN5UGF0aCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXBlbmRlbmN5IHBhdGggbWFwcyB0byBhbiBlbnRyeS1wb2ludCB0aGF0IHdhcyBwcmV2aW91c2x5IHJlbW92ZWRcbiAgICAgICAgICAgIC8vIGZyb20gdGhlIGdyYXBoLCBzbyByZW1vdmUgdGhpcyBlbnRyeS1wb2ludCBhcyB3ZWxsLlxuICAgICAgICAgICAgcmVtb3ZlTm9kZXMoZW50cnlQb2ludCwgW2RlcGVuZGVuY3lQYXRoXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXBlbmRlbmN5IHBhdGggcG9pbnRzIHRvIGEgcGFja2FnZSB0aGF0IG5nY2MgZG9lcyBub3QgY2FyZSBhYm91dC5cbiAgICAgICAgICAgIGlnbm9yZWREZXBlbmRlbmNpZXMucHVzaCh7ZW50cnlQb2ludCwgZGVwZW5kZW5jeVBhdGh9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVlcEltcG9ydHMuc2l6ZSkge1xuICAgICAgICBjb25zdCBpbXBvcnRzID0gQXJyYXkuZnJvbShkZWVwSW1wb3J0cykubWFwKGkgPT4gYCcke2l9J2ApLmpvaW4oJywgJyk7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBgRW50cnkgcG9pbnQgJyR7ZW50cnlQb2ludC5uYW1lfScgY29udGFpbnMgZGVlcCBpbXBvcnRzIGludG8gJHtpbXBvcnRzfS4gYCArXG4gICAgICAgICAgICBgVGhpcyBpcyBwcm9iYWJseSBub3QgYSBwcm9ibGVtLCBidXQgbWF5IGNhdXNlIHRoZSBjb21waWxhdGlvbiBvZiBlbnRyeSBwb2ludHMgdG8gYmUgb3V0IG9mIG9yZGVyLmApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtpbnZhbGlkRW50cnlQb2ludHMsIGlnbm9yZWREZXBlbmRlbmNpZXMsIGdyYXBofTtcblxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGVzKGVudHJ5UG9pbnQ6IEVudHJ5UG9pbnQsIG1pc3NpbmdEZXBlbmRlbmNpZXM6IHN0cmluZ1tdKSB7XG4gICAgICBjb25zdCBub2Rlc1RvUmVtb3ZlID0gW2VudHJ5UG9pbnQucGF0aCwgLi4uZ3JhcGguZGVwZW5kYW50c09mKGVudHJ5UG9pbnQucGF0aCldO1xuICAgICAgbm9kZXNUb1JlbW92ZS5mb3JFYWNoKG5vZGUgPT4ge1xuICAgICAgICBpbnZhbGlkRW50cnlQb2ludHMucHVzaCh7ZW50cnlQb2ludDogZ3JhcGguZ2V0Tm9kZURhdGEobm9kZSksIG1pc3NpbmdEZXBlbmRlbmNpZXN9KTtcbiAgICAgICAgZ3JhcGgucmVtb3ZlTm9kZShub2RlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RW50cnlQb2ludEZvcm1hdEluZm8oZW50cnlQb2ludDogRW50cnlQb2ludCk6XG4gICAgICB7Zm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0LCBwYXRoOiBBYnNvbHV0ZUZzUGF0aH0ge1xuICAgIGNvbnN0IHByb3BlcnRpZXMgPSBPYmplY3Qua2V5cyhlbnRyeVBvaW50LnBhY2thZ2VKc29uKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHByb3BlcnRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gcHJvcGVydGllc1tpXSBhcyBFbnRyeVBvaW50SnNvblByb3BlcnR5O1xuICAgICAgY29uc3QgZm9ybWF0ID0gZ2V0RW50cnlQb2ludEZvcm1hdCh0aGlzLmZzLCBlbnRyeVBvaW50LCBwcm9wZXJ0eSk7XG5cbiAgICAgIGlmIChmb3JtYXQgPT09ICdlc20yMDE1JyB8fCBmb3JtYXQgPT09ICdlc201JyB8fCBmb3JtYXQgPT09ICd1bWQnIHx8IGZvcm1hdCA9PT0gJ2NvbW1vbmpzJykge1xuICAgICAgICBjb25zdCBmb3JtYXRQYXRoID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbltwcm9wZXJ0eV0gITtcbiAgICAgICAgcmV0dXJuIHtmb3JtYXQsIHBhdGg6IHJlc29sdmUoZW50cnlQb2ludC5wYXRoLCBmb3JtYXRQYXRoKX07XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFRoZXJlIGlzIG5vIGFwcHJvcHJpYXRlIHNvdXJjZSBjb2RlIGZvcm1hdCBpbiAnJHtlbnRyeVBvaW50LnBhdGh9JyBlbnRyeS1wb2ludC5gKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgRGVwZW5kZW5jeUdyYXBoIGV4dGVuZHMgRGVwZW5kZW5jeURpYWdub3N0aWNzIHtcbiAgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+O1xufVxuIl19