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
        define("@angular/compiler-cli/ngcc/src/dependencies/dependency_resolver", ["require", "exports", "tslib", "dependency-graph", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/ngcc/src/packages/entry_point"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var dependency_graph_1 = require("dependency-graph");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var entry_point_1 = require("@angular/compiler-cli/ngcc/src/packages/entry_point");
    /**
     * A class that resolves dependencies between entry-points.
     */
    var DependencyResolver = /** @class */ (function () {
        function DependencyResolver(logger, hosts) {
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
                var formatInfo = getEntryPointFormatInfo(entryPoint);
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
        return DependencyResolver;
    }());
    exports.DependencyResolver = DependencyResolver;
    function getEntryPointFormatInfo(entryPoint) {
        var properties = Object.keys(entryPoint.packageJson);
        for (var i = 0; i < properties.length; i++) {
            var property = properties[i];
            var format = entry_point_1.getEntryPointFormat(property);
            if (format === 'esm2015' || format === 'esm5' || format === 'umd') {
                var formatPath = entryPoint.packageJson[property];
                return { format: format, path: path_1.AbsoluteFsPath.resolve(entryPoint.path, formatPath) };
            }
        }
        throw new Error("There is no appropriate source code format in '" + entryPoint.path + "' entry-point.");
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwZW5kZW5jeV9yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9uZ2NjL3NyYy9kZXBlbmRlbmNpZXMvZGVwZW5kZW5jeV9yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCxxREFBMEM7SUFDMUMsNkRBQXVEO0lBRXZELG1GQUFrSDtJQW1EbEg7O09BRUc7SUFDSDtRQUNFLDRCQUNZLE1BQWMsRUFBVSxLQUF3RDtZQUFoRixXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVUsVUFBSyxHQUFMLEtBQUssQ0FBbUQ7UUFBRyxDQUFDO1FBQ2hHOzs7Ozs7V0FNRztRQUNILHdEQUEyQixHQUEzQixVQUE0QixXQUF5QixFQUFFLE1BQW1CO1lBRWxFLElBQUEsNkNBQ3NDLEVBRHJDLDBDQUFrQixFQUFFLDRDQUFtQixFQUFFLGdCQUNKLENBQUM7WUFFN0MsSUFBSSxxQkFBK0IsQ0FBQztZQUNwQyxJQUFJLE1BQU0sRUFBRTtnQkFDVixJQUFJLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRTtvQkFDNUIscUJBQXFCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzFELHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3pDO3FCQUFNO29CQUNMLHFCQUFxQixHQUFHLEVBQUUsQ0FBQztpQkFDNUI7YUFDRjtpQkFBTTtnQkFDTCxxQkFBcUIsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7YUFDOUM7WUFFRCxPQUFPO2dCQUNMLFdBQVcsRUFBRSxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUF2QixDQUF1QixDQUFDO2dCQUN2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TSxRQUFBLEVBQUUsSUFBSSxFQUFFLHFCQUFjLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQUMsQ0FBQzthQUM1RTtTQUNGO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FDWCxvREFBa0QsVUFBVSxDQUFDLElBQUksbUJBQWdCLENBQUMsQ0FBQztJQUN6RixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0RlcEdyYXBofSBmcm9tICdkZXBlbmRlbmN5LWdyYXBoJztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXRoJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRGb3JtYXQsIEVudHJ5UG9pbnRKc29uUHJvcGVydHksIGdldEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50JztcbmltcG9ydCB7RGVwZW5kZW5jeUhvc3R9IGZyb20gJy4vZGVwZW5kZW5jeV9ob3N0JztcblxuLyoqXG4gKiBIb2xkcyBpbmZvcm1hdGlvbiBhYm91dCBlbnRyeSBwb2ludHMgdGhhdCBhcmUgcmVtb3ZlZCBiZWNhdXNlXG4gKiB0aGV5IGhhdmUgZGVwZW5kZW5jaWVzIHRoYXQgYXJlIG1pc3NpbmcgKGRpcmVjdGx5IG9yIHRyYW5zaXRpdmVseSkuXG4gKlxuICogVGhpcyBtaWdodCBub3QgYmUgYW4gZXJyb3IsIGJlY2F1c2Ugc3VjaCBhbiBlbnRyeSBwb2ludCBtaWdodCBub3QgYWN0dWFsbHkgYmUgdXNlZFxuICogaW4gdGhlIGFwcGxpY2F0aW9uLiBJZiBpdCBpcyB1c2VkIHRoZW4gdGhlIGBuZ2NgIGFwcGxpY2F0aW9uIGNvbXBpbGF0aW9uIHdvdWxkXG4gKiBmYWlsIGFsc28sIHNvIHdlIGRvbid0IG5lZWQgbmdjYyB0byBjYXRjaCB0aGlzLlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciBhbiBhcHBsaWNhdGlvbiB0aGF0IHVzZXMgdGhlIGBAYW5ndWxhci9yb3V0ZXJgIHBhY2thZ2UuXG4gKiBUaGlzIHBhY2thZ2UgaW5jbHVkZXMgYW4gZW50cnktcG9pbnQgY2FsbGVkIGBAYW5ndWxhci9yb3V0ZXIvdXBncmFkZWAsIHdoaWNoIGhhcyBhIGRlcGVuZGVuY3lcbiAqIG9uIHRoZSBgQGFuZ3VsYXIvdXBncmFkZWAgcGFja2FnZS5cbiAqIElmIHRoZSBhcHBsaWNhdGlvbiBuZXZlciB1c2VzIGNvZGUgZnJvbSBgQGFuZ3VsYXIvcm91dGVyL3VwZ3JhZGVgIHRoZW4gdGhlcmUgaXMgbm8gbmVlZCBmb3JcbiAqIGBAYW5ndWxhci91cGdyYWRlYCB0byBiZSBpbnN0YWxsZWQuXG4gKiBJbiB0aGlzIGNhc2UgdGhlIG5nY2MgdG9vbCBzaG91bGQganVzdCBpZ25vcmUgdGhlIGBAYW5ndWxhci9yb3V0ZXIvdXBncmFkZWAgZW5kLXBvaW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEludmFsaWRFbnRyeVBvaW50IHtcbiAgZW50cnlQb2ludDogRW50cnlQb2ludDtcbiAgbWlzc2luZ0RlcGVuZGVuY2llczogc3RyaW5nW107XG59XG5cbi8qKlxuICogSG9sZHMgaW5mb3JtYXRpb24gYWJvdXQgZGVwZW5kZW5jaWVzIG9mIGFuIGVudHJ5LXBvaW50IHRoYXQgZG8gbm90IG5lZWQgdG8gYmUgcHJvY2Vzc2VkXG4gKiBieSB0aGUgbmdjYyB0b29sLlxuICpcbiAqIEZvciBleGFtcGxlLCB0aGUgYHJ4anNgIHBhY2thZ2UgZG9lcyBub3QgY29udGFpbiBhbnkgQW5ndWxhciBkZWNvcmF0b3JzIHRoYXQgbmVlZCB0byBiZVxuICogY29tcGlsZWQgYW5kIHNvIHRoaXMgY2FuIGJlIHNhZmVseSBpZ25vcmVkIGJ5IG5nY2MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSWdub3JlZERlcGVuZGVuY3kge1xuICBlbnRyeVBvaW50OiBFbnRyeVBvaW50O1xuICBkZXBlbmRlbmN5UGF0aDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlcGVuZGVuY3lEaWFnbm9zdGljcyB7XG4gIGludmFsaWRFbnRyeVBvaW50czogSW52YWxpZEVudHJ5UG9pbnRbXTtcbiAgaWdub3JlZERlcGVuZGVuY2llczogSWdub3JlZERlcGVuZGVuY3lbXTtcbn1cblxuLyoqXG4gKiBBIGxpc3Qgb2YgZW50cnktcG9pbnRzLCBzb3J0ZWQgYnkgdGhlaXIgZGVwZW5kZW5jaWVzLlxuICpcbiAqIFRoZSBgZW50cnlQb2ludHNgIGFycmF5IHdpbGwgYmUgb3JkZXJlZCBzbyB0aGF0IG5vIGVudHJ5IHBvaW50IGRlcGVuZHMgdXBvbiBhbiBlbnRyeSBwb2ludCB0aGF0XG4gKiBhcHBlYXJzIGxhdGVyIGluIHRoZSBhcnJheS5cbiAqXG4gKiBTb21lIGVudHJ5IHBvaW50cyBvciB0aGVpciBkZXBlbmRlbmNpZXMgbWF5IGJlIGhhdmUgYmVlbiBpZ25vcmVkLiBUaGVzZSBhcmUgY2FwdHVyZWQgZm9yXG4gKiBkaWFnbm9zdGljIHB1cnBvc2VzIGluIGBpbnZhbGlkRW50cnlQb2ludHNgIGFuZCBgaWdub3JlZERlcGVuZGVuY2llc2AgcmVzcGVjdGl2ZWx5LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNvcnRlZEVudHJ5UG9pbnRzSW5mbyBleHRlbmRzIERlcGVuZGVuY3lEaWFnbm9zdGljcyB7IGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W107IH1cblxuLyoqXG4gKiBBIGNsYXNzIHRoYXQgcmVzb2x2ZXMgZGVwZW5kZW5jaWVzIGJldHdlZW4gZW50cnktcG9pbnRzLlxuICovXG5leHBvcnQgY2xhc3MgRGVwZW5kZW5jeVJlc29sdmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLCBwcml2YXRlIGhvc3RzOiBQYXJ0aWFsPFJlY29yZDxFbnRyeVBvaW50Rm9ybWF0LCBEZXBlbmRlbmN5SG9zdD4+KSB7fVxuICAvKipcbiAgICogU29ydCB0aGUgYXJyYXkgb2YgZW50cnkgcG9pbnRzIHNvIHRoYXQgdGhlIGRlcGVuZGFudCBlbnRyeSBwb2ludHMgYWx3YXlzIGNvbWUgbGF0ZXIgdGhhblxuICAgKiB0aGVpciBkZXBlbmRlbmNpZXMgaW4gdGhlIGFycmF5LlxuICAgKiBAcGFyYW0gZW50cnlQb2ludHMgQW4gYXJyYXkgZW50cnkgcG9pbnRzIHRvIHNvcnQuXG4gICAqIEBwYXJhbSB0YXJnZXQgSWYgcHJvdmlkZWQsIG9ubHkgcmV0dXJuIGVudHJ5LXBvaW50cyBkZXBlbmRlZCBvbiBieSB0aGlzIGVudHJ5LXBvaW50LlxuICAgKiBAcmV0dXJucyB0aGUgcmVzdWx0IG9mIHNvcnRpbmcgdGhlIGVudHJ5IHBvaW50cyBieSBkZXBlbmRlbmN5LlxuICAgKi9cbiAgc29ydEVudHJ5UG9pbnRzQnlEZXBlbmRlbmN5KGVudHJ5UG9pbnRzOiBFbnRyeVBvaW50W10sIHRhcmdldD86IEVudHJ5UG9pbnQpOlxuICAgICAgU29ydGVkRW50cnlQb2ludHNJbmZvIHtcbiAgICBjb25zdCB7aW52YWxpZEVudHJ5UG9pbnRzLCBpZ25vcmVkRGVwZW5kZW5jaWVzLCBncmFwaH0gPVxuICAgICAgICB0aGlzLmNvbXB1dGVEZXBlbmRlbmN5R3JhcGgoZW50cnlQb2ludHMpO1xuXG4gICAgbGV0IHNvcnRlZEVudHJ5UG9pbnROb2Rlczogc3RyaW5nW107XG4gICAgaWYgKHRhcmdldCkge1xuICAgICAgaWYgKHRhcmdldC5jb21waWxlZEJ5QW5ndWxhcikge1xuICAgICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMgPSBncmFwaC5kZXBlbmRlbmNpZXNPZih0YXJnZXQucGF0aCk7XG4gICAgICAgIHNvcnRlZEVudHJ5UG9pbnROb2Rlcy5wdXNoKHRhcmdldC5wYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNvcnRlZEVudHJ5UG9pbnROb2RlcyA9IFtdO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzb3J0ZWRFbnRyeVBvaW50Tm9kZXMgPSBncmFwaC5vdmVyYWxsT3JkZXIoKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZW50cnlQb2ludHM6IHNvcnRlZEVudHJ5UG9pbnROb2Rlcy5tYXAocGF0aCA9PiBncmFwaC5nZXROb2RlRGF0YShwYXRoKSksXG4gICAgICBpbnZhbGlkRW50cnlQb2ludHMsXG4gICAgICBpZ25vcmVkRGVwZW5kZW5jaWVzLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZXMgYSBkZXBlbmRlbmN5IGdyYXBoIG9mIHRoZSBnaXZlbiBlbnRyeS1wb2ludHMuXG4gICAqXG4gICAqIFRoZSBncmFwaCBvbmx5IGhvbGRzIGVudHJ5LXBvaW50cyB0aGF0IG5nY2MgY2FyZXMgYWJvdXQgYW5kIHdob3NlIGRlcGVuZGVuY2llc1xuICAgKiAoZGlyZWN0IGFuZCB0cmFuc2l0aXZlKSBhbGwgZXhpc3QuXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVEZXBlbmRlbmN5R3JhcGgoZW50cnlQb2ludHM6IEVudHJ5UG9pbnRbXSk6IERlcGVuZGVuY3lHcmFwaCB7XG4gICAgY29uc3QgaW52YWxpZEVudHJ5UG9pbnRzOiBJbnZhbGlkRW50cnlQb2ludFtdID0gW107XG4gICAgY29uc3QgaWdub3JlZERlcGVuZGVuY2llczogSWdub3JlZERlcGVuZGVuY3lbXSA9IFtdO1xuICAgIGNvbnN0IGdyYXBoID0gbmV3IERlcEdyYXBoPEVudHJ5UG9pbnQ+KCk7XG5cbiAgICBjb25zdCBhbmd1bGFyRW50cnlQb2ludHMgPSBlbnRyeVBvaW50cy5maWx0ZXIoZW50cnlQb2ludCA9PiBlbnRyeVBvaW50LmNvbXBpbGVkQnlBbmd1bGFyKTtcblxuICAgIC8vIEFkZCB0aGUgQW5ndWxhciBjb21waWxlZCBlbnRyeSBwb2ludHMgdG8gdGhlIGdyYXBoIGFzIG5vZGVzXG4gICAgYW5ndWxhckVudHJ5UG9pbnRzLmZvckVhY2goZW50cnlQb2ludCA9PiBncmFwaC5hZGROb2RlKGVudHJ5UG9pbnQucGF0aCwgZW50cnlQb2ludCkpO1xuXG4gICAgLy8gTm93IGFkZCB0aGUgZGVwZW5kZW5jaWVzIGJldHdlZW4gdGhlbVxuICAgIGFuZ3VsYXJFbnRyeVBvaW50cy5mb3JFYWNoKGVudHJ5UG9pbnQgPT4ge1xuICAgICAgY29uc3QgZm9ybWF0SW5mbyA9IGdldEVudHJ5UG9pbnRGb3JtYXRJbmZvKGVudHJ5UG9pbnQpO1xuICAgICAgY29uc3QgaG9zdCA9IHRoaXMuaG9zdHNbZm9ybWF0SW5mby5mb3JtYXRdO1xuICAgICAgaWYgKCFob3N0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBDb3VsZCBub3QgZmluZCBhIHN1aXRhYmxlIGZvcm1hdCBmb3IgY29tcHV0aW5nIGRlcGVuZGVuY2llcyBvZiBlbnRyeS1wb2ludDogJyR7ZW50cnlQb2ludC5wYXRofScuYCk7XG4gICAgICB9XG4gICAgICBjb25zdCB7ZGVwZW5kZW5jaWVzLCBtaXNzaW5nLCBkZWVwSW1wb3J0c30gPSBob3N0LmZpbmREZXBlbmRlbmNpZXMoZm9ybWF0SW5mby5wYXRoKTtcblxuICAgICAgaWYgKG1pc3Npbmcuc2l6ZSA+IDApIHtcbiAgICAgICAgLy8gVGhpcyBlbnRyeSBwb2ludCBoYXMgZGVwZW5kZW5jaWVzIHRoYXQgYXJlIG1pc3NpbmdcbiAgICAgICAgLy8gc28gcmVtb3ZlIGl0IGZyb20gdGhlIGdyYXBoLlxuICAgICAgICByZW1vdmVOb2RlcyhlbnRyeVBvaW50LCBBcnJheS5mcm9tKG1pc3NpbmcpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlcGVuZGVuY2llcy5mb3JFYWNoKGRlcGVuZGVuY3lQYXRoID0+IHtcbiAgICAgICAgICBpZiAoZ3JhcGguaGFzTm9kZShkZXBlbmRlbmN5UGF0aCkpIHtcbiAgICAgICAgICAgIGlmIChncmFwaC5oYXNOb2RlKGVudHJ5UG9pbnQucGF0aCkpIHtcbiAgICAgICAgICAgICAgLy8gVGhlIGVudHJ5LXBvaW50IGlzIHN0aWxsIHZhbGlkIChpLmUuIGhhcyBubyBtaXNzaW5nIGRlcGVuZGVuY2llcykgYW5kXG4gICAgICAgICAgICAgIC8vIHRoZSBkZXBlbmRlbmN5IG1hcHMgdG8gYW4gZW50cnkgcG9pbnQgdGhhdCBleGlzdHMgaW4gdGhlIGdyYXBoIHNvIGFkZCBpdFxuICAgICAgICAgICAgICBncmFwaC5hZGREZXBlbmRlbmN5KGVudHJ5UG9pbnQucGF0aCwgZGVwZW5kZW5jeVBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoaW52YWxpZEVudHJ5UG9pbnRzLnNvbWUoaSA9PiBpLmVudHJ5UG9pbnQucGF0aCA9PT0gZGVwZW5kZW5jeVBhdGgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVwZW5kZW5jeSBwYXRoIG1hcHMgdG8gYW4gZW50cnktcG9pbnQgdGhhdCB3YXMgcHJldmlvdXNseSByZW1vdmVkXG4gICAgICAgICAgICAvLyBmcm9tIHRoZSBncmFwaCwgc28gcmVtb3ZlIHRoaXMgZW50cnktcG9pbnQgYXMgd2VsbC5cbiAgICAgICAgICAgIHJlbW92ZU5vZGVzKGVudHJ5UG9pbnQsIFtkZXBlbmRlbmN5UGF0aF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVwZW5kZW5jeSBwYXRoIHBvaW50cyB0byBhIHBhY2thZ2UgdGhhdCBuZ2NjIGRvZXMgbm90IGNhcmUgYWJvdXQuXG4gICAgICAgICAgICBpZ25vcmVkRGVwZW5kZW5jaWVzLnB1c2goe2VudHJ5UG9pbnQsIGRlcGVuZGVuY3lQYXRofSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlZXBJbXBvcnRzLnNpemUpIHtcbiAgICAgICAgY29uc3QgaW1wb3J0cyA9IEFycmF5LmZyb20oZGVlcEltcG9ydHMpLm1hcChpID0+IGAnJHtpfSdgKS5qb2luKCcsICcpO1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYEVudHJ5IHBvaW50ICcke2VudHJ5UG9pbnQubmFtZX0nIGNvbnRhaW5zIGRlZXAgaW1wb3J0cyBpbnRvICR7aW1wb3J0c30uIGAgK1xuICAgICAgICAgICAgYFRoaXMgaXMgcHJvYmFibHkgbm90IGEgcHJvYmxlbSwgYnV0IG1heSBjYXVzZSB0aGUgY29tcGlsYXRpb24gb2YgZW50cnkgcG9pbnRzIHRvIGJlIG91dCBvZiBvcmRlci5gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7aW52YWxpZEVudHJ5UG9pbnRzLCBpZ25vcmVkRGVwZW5kZW5jaWVzLCBncmFwaH07XG5cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlcyhlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBtaXNzaW5nRGVwZW5kZW5jaWVzOiBzdHJpbmdbXSkge1xuICAgICAgY29uc3Qgbm9kZXNUb1JlbW92ZSA9IFtlbnRyeVBvaW50LnBhdGgsIC4uLmdyYXBoLmRlcGVuZGFudHNPZihlbnRyeVBvaW50LnBhdGgpXTtcbiAgICAgIG5vZGVzVG9SZW1vdmUuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgaW52YWxpZEVudHJ5UG9pbnRzLnB1c2goe2VudHJ5UG9pbnQ6IGdyYXBoLmdldE5vZGVEYXRhKG5vZGUpLCBtaXNzaW5nRGVwZW5kZW5jaWVzfSk7XG4gICAgICAgIGdyYXBoLnJlbW92ZU5vZGUobm9kZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RW50cnlQb2ludEZvcm1hdEluZm8oZW50cnlQb2ludDogRW50cnlQb2ludCk6XG4gICAge2Zvcm1hdDogRW50cnlQb2ludEZvcm1hdCwgcGF0aDogQWJzb2x1dGVGc1BhdGh9IHtcbiAgY29uc3QgcHJvcGVydGllcyA9IE9iamVjdC5rZXlzKGVudHJ5UG9pbnQucGFja2FnZUpzb24pO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHByb3BlcnRpZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbaV0gYXMgRW50cnlQb2ludEpzb25Qcm9wZXJ0eTtcbiAgICBjb25zdCBmb3JtYXQgPSBnZXRFbnRyeVBvaW50Rm9ybWF0KHByb3BlcnR5KTtcblxuICAgIGlmIChmb3JtYXQgPT09ICdlc20yMDE1JyB8fCBmb3JtYXQgPT09ICdlc201JyB8fCBmb3JtYXQgPT09ICd1bWQnKSB7XG4gICAgICBjb25zdCBmb3JtYXRQYXRoID0gZW50cnlQb2ludC5wYWNrYWdlSnNvbltwcm9wZXJ0eV0gITtcbiAgICAgIHJldHVybiB7Zm9ybWF0LCBwYXRoOiBBYnNvbHV0ZUZzUGF0aC5yZXNvbHZlKGVudHJ5UG9pbnQucGF0aCwgZm9ybWF0UGF0aCl9O1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVGhlcmUgaXMgbm8gYXBwcm9wcmlhdGUgc291cmNlIGNvZGUgZm9ybWF0IGluICcke2VudHJ5UG9pbnQucGF0aH0nIGVudHJ5LXBvaW50LmApO1xufVxuXG5pbnRlcmZhY2UgRGVwZW5kZW5jeUdyYXBoIGV4dGVuZHMgRGVwZW5kZW5jeURpYWdub3N0aWNzIHtcbiAgZ3JhcGg6IERlcEdyYXBoPEVudHJ5UG9pbnQ+O1xufVxuIl19